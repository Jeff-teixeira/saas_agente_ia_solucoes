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
		fmt.Println(err)
		return
	}
	database, err := db.NewMongoDB(cfg.Database.URI, cfg.Database.Name)
	if err != nil {
		fmt.Println(err)
		return
	}

	ctx := context.Background()

	// Checar se já existe
	var sys models.SystemConfig
	if err := database.SystemConfig().FindOne(ctx, bson.M{}).Decode(&sys); err == nil && sys.Initialized {
		fmt.Println("Já inicializado")
		return
	}

	passwordService := auth.NewPasswordService()
	passwordHash, _ := passwordService.HashPassword("AgenteIA@2026")
	now := time.Now()

	tenant := models.Tenant{
		ID:        primitive.NewObjectID(),
		Name:      "Agente IA",
		Slug:      "root",
		IsRoot:    true,
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}
	database.Tenants().InsertOne(ctx, tenant)

	user := models.User{
		ID:            primitive.NewObjectID(),
		Email:         "admin@agente.ia",
		DisplayName:   "Admin",
		PasswordHash:  passwordHash,
		AuthMethods:   []models.AuthMethod{models.AuthMethodPassword},
		EmailVerified: true,
		IsActive:      true,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	database.Users().InsertOne(ctx, user)

	membership := models.TenantMembership{
		ID:        primitive.NewObjectID(),
		UserID:    user.ID,
		TenantID:  tenant.ID,
		Role:      models.RoleOwner,
		JoinedAt:  now,
		UpdatedAt: now,
	}
	database.TenantMemberships().InsertOne(ctx, membership)

	sysConfig := models.SystemConfig{
		ID:            primitive.NewObjectID(),
		Initialized:   true,
		InitializedAt: &now,
		InitializedBy: &user.ID,
		Version:       "1.0.0",
	}
	database.SystemConfig().InsertOne(ctx, sysConfig)

	fmt.Println("Setup automático concluído.")
}
