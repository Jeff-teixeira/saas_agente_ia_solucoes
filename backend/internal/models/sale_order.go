package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SetupPaymentStatus representa o status do pagamento do setup (único).
type SetupPaymentStatus string

const (
	SetupStatusPending  SetupPaymentStatus = "pending"
	SetupStatusPaid     SetupPaymentStatus = "paid"
	SetupStatusOverdue  SetupPaymentStatus = "overdue"
	SetupStatusCanceled SetupPaymentStatus = "canceled"
)

// SubscriptionPaymentStatus representa o status da assinatura mensal.
type SubscriptionPaymentStatus string

const (
	SubStatusPending  SubscriptionPaymentStatus = "pending"
	SubStatusActive   SubscriptionPaymentStatus = "active"
	SubStatusPastDue  SubscriptionPaymentStatus = "past_due"
	SubStatusCanceled SubscriptionPaymentStatus = "canceled"
)

// SetupPlan representa um dos 3 planos de setup.
type SetupPlan struct {
	ID              string `json:"id"`  // "starter" | "pro" | "elite"
	Name            string `json:"name"`
	SetupPriceCents int64  `json:"setupPriceCents"`
	MonthlyPriceCents int64 `json:"monthlyPriceCents"`
}

// SaleOrder representa uma venda completa com setup + assinatura.
type SaleOrder struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId"`
	UserID     primitive.ObjectID `json:"userId" bson:"userId"`

	// Dados do cliente
	ClientName string `json:"clientName" bson:"clientName"`
	Email      string `json:"email" bson:"email"`
	Phone      string `json:"phone" bson:"phone"`

	// Plano
	SetupPlanID         string `json:"setupPlanId" bson:"setupPlanId"`     // "starter" | "pro" | "elite"
	SetupPlanName       string `json:"setupPlanName" bson:"setupPlanName"`
	SetupPriceCents     int64  `json:"setupPriceCents" bson:"setupPriceCents"`
	MonthlyPriceCents   int64  `json:"monthlyPriceCents" bson:"monthlyPriceCents"`

	// Pagamento do Setup (único)
	SetupStatus       SetupPaymentStatus `json:"setupStatus" bson:"setupStatus"`
	SetupPaymentLink  string             `json:"setupPaymentLink" bson:"setupPaymentLink"`
	SetupAssasChargeID string            `json:"setupAssasChargeId" bson:"setupAssasChargeId"`
	SetupPaidAt       *time.Time         `json:"setupPaidAt,omitempty" bson:"setupPaidAt,omitempty"`

	// Assinatura Mensal
	SubscriptionStatus    SubscriptionPaymentStatus `json:"subscriptionStatus" bson:"subscriptionStatus"`
	SubscriptionLink      string                    `json:"subscriptionLink" bson:"subscriptionLink"`
	SubscriptionAssasID   string                    `json:"subscriptionAssasId" bson:"subscriptionAssasId"`
	SubscriptionActivatedAt *time.Time              `json:"subscriptionActivatedAt,omitempty" bson:"subscriptionActivatedAt,omitempty"`
	SubscriptionNextDueDate string                  `json:"subscriptionNextDueDate,omitempty" bson:"subscriptionNextDueDate,omitempty"`

	// Acesso
	DefaultPassword string `json:"defaultPassword,omitempty" bson:"defaultPassword,omitempty"`

	// Asaas
	AssasCustomerID string `json:"assasCustomerId" bson:"assasCustomerId"`

	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt"`
}

// AvailableSetupPlans retorna os 3 planos disponíveis com preços.
var AvailableSetupPlans = []SetupPlan{
	{ID: "starter", Name: "Starter", SetupPriceCents: 150000, MonthlyPriceCents: 29700},
	{ID: "pro",     Name: "Pro",     SetupPriceCents: 250000, MonthlyPriceCents: 49700},
	{ID: "elite",   Name: "Elite",   SetupPriceCents: 350000, MonthlyPriceCents: 99700},
}

func GetSetupPlan(id string) *SetupPlan {
	for _, p := range AvailableSetupPlans {
		if p.ID == id {
			copy := p
			return &copy
		}
	}
	return nil
}
