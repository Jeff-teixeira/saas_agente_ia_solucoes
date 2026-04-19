package asaas

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	sandboxBaseURL    = "https://sandbox.asaas.com/api/v3"
	productionBaseURL = "https://api.asaas.com/v3"
)

// Service representa o cliente de integração com o Asaas.
type Service struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

// New cria um novo serviço Asaas. Se env == "production", usa a URL de produção.
func New(apiKey, env string) *Service {
	base := sandboxBaseURL
	if env == "production" {
		base = productionBaseURL
	}
	return &Service{
		apiKey:  apiKey,
		baseURL: base,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *Service) do(ctx context.Context, method, path string, body interface{}) ([]byte, int, error) {
	var buf io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, fmt.Errorf("asaas marshal: %w", err)
		}
		buf = bytes.NewBuffer(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, s.baseURL+path, buf)
	if err != nil {
		return nil, 0, fmt.Errorf("asaas new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("access_token", s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("asaas request: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("asaas read response: %w", err)
	}
	return data, resp.StatusCode, nil
}

// --- Customer ---

type CreateCustomerRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Phone   string `json:"phone,omitempty"`
	MobilePhone string `json:"mobilePhone,omitempty"`
	NotificationDisabled bool `json:"notificationDisabled,omitempty"`
}

type CustomerResponse struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Object  string `json:"object"`
}

func (s *Service) CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*CustomerResponse, error) {
	data, status, err := s.do(ctx, http.MethodPost, "/customers", req)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("asaas create customer: status %d: %s", status, string(data))
	}
	var resp CustomerResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("asaas create customer decode: %w", err)
	}
	return &resp, nil
}

// --- Payment (Cobrança única) ---

type CreateChargeRequest struct {
	Customer         string  `json:"customer"`
	BillingType      string  `json:"billingType"`     // "UNDEFINED" = todos, "PIX", "CREDIT_CARD", "BOLETO"
	Value            float64 `json:"value"`
	DueDate          string  `json:"dueDate"`          // YYYY-MM-DD
	Description      string  `json:"description"`
	ExternalReference string `json:"externalReference,omitempty"`
}

type PaymentPixResponse struct {
	EncodedImage string `json:"encodedImage"`
	Payload      string `json:"payload"`
}

type ChargeResponse struct {
	ID              string  `json:"id"`
	Status          string  `json:"status"`          // PENDING, RECEIVED, CONFIRMED, OVERDUE
	Value           float64 `json:"value"`
	InvoiceURL      string  `json:"invoiceUrl"`
	BankSlipURL     string  `json:"bankSlipUrl"`
	PixTransaction  string  `json:"pixTransaction"`
	BillingType     string  `json:"billingType"`
	DueDate         string  `json:"dueDate"`
}

func (s *Service) CreateCharge(ctx context.Context, req CreateChargeRequest) (*ChargeResponse, error) {
	data, status, err := s.do(ctx, http.MethodPost, "/payments", req)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("asaas create charge: status %d: %s", status, string(data))
	}
	var resp ChargeResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("asaas create charge decode: %w", err)
	}
	return &resp, nil
}

func (s *Service) GetCharge(ctx context.Context, chargeID string) (*ChargeResponse, error) {
	data, status, err := s.do(ctx, http.MethodGet, "/payments/"+chargeID, nil)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("asaas get charge: status %d: %s", status, string(data))
	}
	var resp ChargeResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("asaas get charge decode: %w", err)
	}
	return &resp, nil
}

// --- Subscription (Assinatura mensal) ---

type CreateSubscriptionRequest struct {
	Customer         string  `json:"customer"`
	BillingType      string  `json:"billingType"`    // "CREDIT_CARD", "BOLETO", "PIX", "UNDEFINED"
	Value            float64 `json:"value"`
	NextDueDate      string  `json:"nextDueDate"`    // YYYY-MM-DD
	Cycle            string  `json:"cycle"`          // "MONTHLY"
	Description      string  `json:"description"`
	ExternalReference string `json:"externalReference,omitempty"`
}

type SubscriptionResponse struct {
	ID          string  `json:"id"`
	Status      string  `json:"status"`      // ACTIVE, INACTIVE, EXPIRED
	Value       float64 `json:"value"`
	Cycle       string  `json:"cycle"`
	Description string  `json:"description"`
	PaymentLink string  `json:"paymentLink,omitempty"`
}

func (s *Service) CreateSubscription(ctx context.Context, req CreateSubscriptionRequest) (*SubscriptionResponse, error) {
	data, status, err := s.do(ctx, http.MethodPost, "/subscriptions", req)
	if err != nil {
		return nil, err
	}
	if status >= 400 {
		return nil, fmt.Errorf("asaas create subscription: status %d: %s", status, string(data))
	}
	var resp SubscriptionResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("asaas create subscription decode: %w", err)
	}
	return &resp, nil
}

// --- Webhook Payload ---

type WebhookPayload struct {
	Event   string          `json:"event"`   // PAYMENT_RECEIVED, PAYMENT_OVERDUE, etc.
	Payment *WebhookPayment `json:"payment,omitempty"`
	Subscription *WebhookSubscription `json:"subscription,omitempty"`
}

type WebhookPayment struct {
	ID              string  `json:"id"`
	Status          string  `json:"status"`
	Value           float64 `json:"value"`
	ExternalReference string `json:"externalReference"`
	Customer        string  `json:"customer"`
}

type WebhookSubscription struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	ExternalReference string `json:"externalReference"`
}
