package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AgentConfig armazena a configuração do Agente IA n8n para um tenant específico.
type AgentConfig struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId"`
	WebhookURL string             `json:"webhookUrl" bson:"webhookUrl"`
	AgentName  string             `json:"agentName" bson:"agentName"`
	Active     bool               `json:"active" bson:"active"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt"`
}
