package main

import (
	"context"
	"fmt"
	"time"

	"lastsaas/internal/auth"
	"lastsaas/internal/config"
	"lastsaas/internal/db"
	"lastsaas/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	config.LoadEnvFile()
	cfg, err := config.Load(config.GetEnv())
	if err != nil {
		fmt.Println("Erro de config:", err)
		return
	}
	database, err := db.NewMongoDB(cfg.Database.URI, cfg.Database.Name)
	if err != nil {
		fmt.Println("Erro de DB:", err)
		return
	}

	ctx := context.Background()

	passwordService := auth.NewPasswordService()
	passwordHash, _ := passwordService.HashPassword("AgenteIA@2026")
	now := time.Now()

	email := "admin@agente.ia"

	// Apagar qualquer usuário antigo com esse email
	database.Users().DeleteOne(ctx, bson.M{"email": email})

	// Criar do zero
	user := models.User{
		ID:            primitive.NewObjectID(),
		Email:         email,
		DisplayName:   "Admin Master",
		PasswordHash:  passwordHash,
		AuthMethods:   []models.AuthMethod{models.AuthMethodPassword},
		EmailVerified: true,
		IsActive:      true,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	_, err = database.Users().InsertOne(ctx, user)
	if err != nil {
		fmt.Println("Erro ao forçar usuário:", err)
		return
	}

	// Tentar achar um tenant raiz, se não achar, cria
	var tenant models.Tenant
	if err := database.Tenants().FindOne(ctx, bson.M{"isRoot": true}).Decode(&tenant); err != nil {
		tenant = models.Tenant{
			ID:        primitive.NewObjectID(),
			Name:      "Agente IA Root",
			Slug:      "root",
			IsRoot:    true,
			IsActive:  true,
			CreatedAt: now,
			UpdatedAt: now,
		}
		database.Tenants().InsertOne(ctx, tenant)
	}

	// Vincular usuário ao tenant raiz
	database.TenantMemberships().DeleteMany(ctx, bson.M{"userId": user.ID})
	membership := models.TenantMembership{
		ID:        primitive.NewObjectID(),
		UserID:    user.ID,
		TenantID:  tenant.ID,
		Role:      models.RoleOwner,
		JoinedAt:  now,
		UpdatedAt: now,
	}
	database.TenantMemberships().InsertOne(ctx, membership)

	fmt.Println("!!! USUARIO CRIADO COM SUCESSO A FORÇA !!!")
	fmt.Println("Email: admin@agente.ia")
	fmt.Println("Senha: AgenteIA@2026")
}
