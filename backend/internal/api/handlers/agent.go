package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/middleware"
	"lastsaas/internal/models"
	"lastsaas/internal/syslog"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/gorilla/mux"
)

type AgentHandler struct {
	db     *db.MongoDB
	syslog *syslog.Logger
}

func NewAgentHandler(database *db.MongoDB, sysLogger *syslog.Logger) *AgentHandler {
	return &AgentHandler{db: database, syslog: sysLogger}
}

// GET /api/agent — retorna a config do agente para o tenant atual (cliente)
func (h *AgentHandler) GetAgentConfig(w http.ResponseWriter, r *http.Request) {
	tenant, ok := middleware.GetTenantFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Tenant context missing")
		return
	}
	var cfg models.AgentConfig
	err := h.db.AgentConfigs().FindOne(r.Context(), bson.M{"tenantId": tenant.ID}).Decode(&cfg)
	if err == mongo.ErrNoDocuments {
		// retorna config vazia (agente não configurado ainda)
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"tenantId":   tenant.ID.Hex(),
			"agentName":  "",
			"webhookUrl": "",
			"active":     false,
			"configured": false,
		})
		return
	}
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch agent config")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"tenantId":   cfg.TenantID.Hex(),
		"agentName":  cfg.AgentName,
		"webhookUrl": cfg.WebhookURL,
		"active":     cfg.Active,
		"configured": cfg.WebhookURL != "",
		"updatedAt":  cfg.UpdatedAt,
	})
}

// POST /api/agent/toggle — cliente ativa/desativa o seu agente
func (h *AgentHandler) ToggleAgent(w http.ResponseWriter, r *http.Request) {
	tenant, ok := middleware.GetTenantFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Tenant context missing")
		return
	}
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var req struct {
		Active bool `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Buscar config do agente
	var cfg models.AgentConfig
	err := h.db.AgentConfigs().FindOne(r.Context(), bson.M{"tenantId": tenant.ID}).Decode(&cfg)
	if err == mongo.ErrNoDocuments {
		respondWithError(w, http.StatusNotFound, "Agente não configurado. Contate o suporte.")
		return
	}
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Falha ao buscar configuração do agente")
		return
	}
	if cfg.WebhookURL == "" {
		respondWithError(w, http.StatusBadRequest, "Webhook do n8n não configurado. Contate o suporte.")
		return
	}

	// Chamar o webhook n8n
	action := "deactivate"
	if req.Active {
		action = "activate"
	}
	payload, _ := json.Marshal(map[string]interface{}{
		"action":    action,
		"tenantId":  tenant.ID.Hex(),
		"agentName": cfg.AgentName,
	})
	httpResp, err := http.Post(cfg.WebhookURL, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		respondWithError(w, http.StatusBadGateway, "Falha ao comunicar com o agente: "+err.Error())
		return
	}
	defer httpResp.Body.Close()
	io.Copy(io.Discard, httpResp.Body)

	if httpResp.StatusCode >= 400 {
		respondWithError(w, http.StatusBadGateway, "O agente retornou um erro. Tente novamente.")
		return
	}

	// Atualizar status no banco
	now := time.Now()
	h.db.AgentConfigs().UpdateOne(r.Context(),
		bson.M{"tenantId": tenant.ID},
		bson.M{"$set": bson.M{"active": req.Active, "updatedAt": now}},
	)

	h.syslog.LogTenantActivity(r.Context(), models.LogLow,
		"Agente IA "+action+"d por "+user.Email,
		user.ID, tenant.ID, "agent.toggled",
		map[string]interface{}{"active": req.Active},
	)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"active":    req.Active,
		"updatedAt": now,
	})
}

// --- Admin endpoints ---

// GET /api/admin/agents — lista todos os tenants com suas configs de agente
func (h *AgentHandler) AdminListAgents(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Buscar todos os tenants não-root
	cursor, err := h.db.Tenants().Find(ctx, bson.M{"isRoot": bson.M{"$ne": true}},
		options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to list tenants")
		return
	}
	defer cursor.Close(ctx)
	var tenants []models.Tenant
	cursor.All(ctx, &tenants)

	// Buscar todas as configs de agente
	cfgCursor, _ := h.db.AgentConfigs().Find(ctx, bson.M{})
	cfgMap := map[string]models.AgentConfig{}
	if cfgCursor != nil {
		defer cfgCursor.Close(ctx)
		var cfgs []models.AgentConfig
		cfgCursor.All(ctx, &cfgs)
		for _, c := range cfgs {
			cfgMap[c.TenantID.Hex()] = c
		}
	}

	type AgentListItem struct {
		TenantID   string    `json:"tenantId"`
		TenantName string    `json:"tenantName"`
		AgentName  string    `json:"agentName"`
		WebhookURL string    `json:"webhookUrl"`
		Active     bool      `json:"active"`
		Configured bool      `json:"configured"`
		UpdatedAt  time.Time `json:"updatedAt"`
	}

	items := make([]AgentListItem, 0, len(tenants))
	for _, t := range tenants {
		cfg := cfgMap[t.ID.Hex()]
		items = append(items, AgentListItem{
			TenantID:   t.ID.Hex(),
			TenantName: t.Name,
			AgentName:  cfg.AgentName,
			WebhookURL: cfg.WebhookURL,
			Active:     cfg.Active,
			Configured: cfg.WebhookURL != "",
			UpdatedAt:  cfg.UpdatedAt,
		})
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{"agents": items})
}

// GET /api/admin/agents/{tenantId} — config do agente de um tenant específico
func (h *AgentHandler) AdminGetAgentConfig(w http.ResponseWriter, r *http.Request) {
	tenantIDStr := mux.Vars(r)["tenantId"]
	tenantID, err := primitive.ObjectIDFromHex(tenantIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid tenant ID")
		return
	}

	var cfg models.AgentConfig
	err = h.db.AgentConfigs().FindOne(r.Context(), bson.M{"tenantId": tenantID}).Decode(&cfg)
	if err == mongo.ErrNoDocuments {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"tenantId":   tenantIDStr,
			"agentName":  "",
			"webhookUrl": "",
			"active":     false,
			"configured": false,
		})
		return
	}
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch agent config")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"tenantId":   cfg.TenantID.Hex(),
		"agentName":  cfg.AgentName,
		"webhookUrl": cfg.WebhookURL,
		"active":     cfg.Active,
		"configured": cfg.WebhookURL != "",
		"updatedAt":  cfg.UpdatedAt,
	})
}

// PUT /api/admin/agents/{tenantId} — criar/atualizar config do agente de um tenant
func (h *AgentHandler) AdminUpsertAgentConfig(w http.ResponseWriter, r *http.Request) {
	tenantIDStr := mux.Vars(r)["tenantId"]
	tenantID, err := primitive.ObjectIDFromHex(tenantIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid tenant ID")
		return
	}

	var req struct {
		AgentName  string `json:"agentName"`
		WebhookURL string `json:"webhookUrl"`
		Active     bool   `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	now := time.Now()
	filter := bson.M{"tenantId": tenantID}
	update := bson.M{
		"$set": bson.M{
			"tenantId":   tenantID,
			"agentName":  req.AgentName,
			"webhookUrl": req.WebhookURL,
			"active":     req.Active,
			"updatedAt":  now,
		},
		"$setOnInsert": bson.M{
			"_id":       primitive.NewObjectID(),
			"createdAt": now,
		},
	}
	opts := options.Update().SetUpsert(true)
	if _, err := h.db.AgentConfigs().UpdateOne(r.Context(), filter, update, opts); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to save agent config")
		return
	}

	if user, ok := middleware.GetUserFromContext(r.Context()); ok {
		h.syslog.High(r.Context(), "Admin atualizou config do agente para tenant "+tenantIDStr+": webhook="+req.WebhookURL, user.ID)
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Agent config saved"})
}

// DELETE /api/admin/agents/{tenantId} — remove a config do agente de um tenant
func (h *AgentHandler) AdminDeleteAgentConfig(w http.ResponseWriter, r *http.Request) {
	tenantIDStr := mux.Vars(r)["tenantId"]
	tenantID, err := primitive.ObjectIDFromHex(tenantIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid tenant ID")
		return
	}
	h.db.AgentConfigs().DeleteOne(r.Context(), bson.M{"tenantId": tenantID})
	respondWithJSON(w, http.StatusOK, map[string]string{"message": "Agent config removed"})
}
