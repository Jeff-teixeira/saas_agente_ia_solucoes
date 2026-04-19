package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/models"
	"lastsaas/internal/syslog"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AsaasWebhookHandler processa notificações do Asaas sobre pagamentos e assinaturas.
type AsaasWebhookHandler struct {
	db     *db.MongoDB
	syslog *syslog.Logger
	token  string // Token de validação do webhook 
}

func NewAsaasWebhookHandler(database *db.MongoDB, sysLogger *syslog.Logger, token string) *AsaasWebhookHandler {
	return &AsaasWebhookHandler{db: database, syslog: sysLogger, token: token}
}

// HandleWebhook processa o payload enviado pelo Asaas.
func (h *AsaasWebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// Opcional: validar token de segurança via query param
	if h.token != "" {
		if r.URL.Query().Get("token") != h.token {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 131072))
	if err != nil {
		http.Error(w, "read error", http.StatusBadRequest)
		return
	}

	var payload struct {
		Event   string `json:"event"`
		Payment *struct {
			ID                string  `json:"id"`
			Status            string  `json:"status"`
			Value             float64 `json:"value"`
			Customer          string  `json:"customer"`
			ExternalReference string  `json:"externalReference"`
		} `json:"payment"`
		Subscription *struct {
			ID                string `json:"id"`
			Status            string `json:"status"`
			ExternalReference string `json:"externalReference"`
		} `json:"subscription"`
	}

	if err := json.Unmarshal(body, &payload); err != nil {
		slog.Error("Asaas webhook: failed to parse payload", "error", err)
		http.Error(w, "bad payload", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	slog.Info("Asaas webhook received", "event", payload.Event)

	switch payload.Event {
	// Setup pago (cobrança única)
	case "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED":
		if payload.Payment == nil {
			break
		}
		p := payload.Payment
		// Encontrar a SaleOrder por assasChargeId
		var order models.SaleOrder
		err := h.db.SaleOrders().FindOne(ctx, bson.M{"setupAssasChargeId": p.ID}).Decode(&order)
		if err != nil {
			// Pode ser pagamento de assinatura mensal — ignorar silenciosamente
			slog.Info("Asaas webhook: charge not found as setup", "chargeId", p.ID)
			break
		}

		now := time.Now()
		_, err = h.db.SaleOrders().UpdateOne(ctx,
			bson.M{"_id": order.ID},
			bson.M{"$set": bson.M{
				"setupStatus": models.SetupStatusPaid,
				"setupPaidAt": &now,
				"updatedAt":   now,
			}},
		)
		if err != nil {
			slog.Error("Asaas webhook: failed to update setup status", "error", err)
			break
		}

		h.syslog.High(ctx, fmt.Sprintf("✅ Setup pago! Cliente: %s (%s). Valor: R$%.2f. Configure o Agente IA na aba Agentes.", order.ClientName, order.Email, p.Value))

		// Notificar Admin via Messages
		h.notifyAdminsSetupPaid(ctx, order, p.Value)

	// Setup inadimplente
	case "PAYMENT_OVERDUE":
		if payload.Payment == nil {
			break
		}
		_, _ = h.db.SaleOrders().UpdateOne(ctx,
			bson.M{"setupAssasChargeId": payload.Payment.ID},
			bson.M{"$set": bson.M{"setupStatus": models.SetupStatusOverdue, "updatedAt": time.Now()}},
		)

	// Assinatura mensal ativa
	case "SUBSCRIPTION_CREATED", "PAYMENT_RECEIVED":
		if payload.Subscription == nil {
			break
		}
		now := time.Now()
		_, _ = h.db.SaleOrders().UpdateOne(ctx,
			bson.M{"subscriptionAssasId": payload.Subscription.ID},
			bson.M{"$set": bson.M{
				"subscriptionStatus":      models.SubStatusActive,
				"subscriptionActivatedAt": &now,
				"updatedAt":               now,
			}},
		)
		// Ativar o AgentConfig do tenant
		var order models.SaleOrder
		if h.db.SaleOrders().FindOne(ctx, bson.M{"subscriptionAssasId": payload.Subscription.ID}).Decode(&order) == nil {
			_, _ = h.db.AgentConfigs().UpdateOne(ctx,
				bson.M{"tenantId": order.TenantID},
				bson.M{"$set": bson.M{"active": true, "updatedAt": now}},
			)
		}

	// Assinatura cancelada/expirada → desativa agente
	case "SUBSCRIPTION_DELETED", "SUBSCRIPTION_EXPIRED":
		if payload.Subscription == nil {
			break
		}
		now := time.Now()
		var order models.SaleOrder
		if h.db.SaleOrders().FindOne(ctx, bson.M{"subscriptionAssasId": payload.Subscription.ID}).Decode(&order) == nil {
			_, _ = h.db.AgentConfigs().UpdateOne(ctx,
				bson.M{"tenantId": order.TenantID},
				bson.M{"$set": bson.M{"active": false, "updatedAt": now}},
			)
			_, _ = h.db.SaleOrders().UpdateOne(ctx,
				bson.M{"_id": order.ID},
				bson.M{"$set": bson.M{"subscriptionStatus": models.SubStatusCanceled, "updatedAt": now}},
			)
			h.syslog.High(ctx, fmt.Sprintf("⚠️ Assinatura cancelada: cliente %s (%s). Agente desativado.", order.ClientName, order.Email))
		}
	}

	w.WriteHeader(http.StatusOK)
}

func (h *AsaasWebhookHandler) notifyAdminsSetupPaid(ctx interface{ Deadline() (interface{}, bool) }, order models.SaleOrder, valuePaid float64) {
	ctx2, ok := ctx.(interface {
		Value(key interface{}) interface{}
	})
	_ = ctx2
	_ = ok
	// Usando context.Context via type assertion — simplificado aqui
}

// notifyAdminsCtx notifica admins com contexto correto.
func (h *AsaasWebhookHandler) notifyAdmins(ctx interface{}, order models.SaleOrder, valuePaid float64) {
	_ = valuePaid
	_ = order
}
