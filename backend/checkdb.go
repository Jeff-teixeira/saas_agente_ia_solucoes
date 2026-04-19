package main

import (
	"context"
	"fmt"

	"lastsaas/internal/config"
	"lastsaas/internal/db"
	"lastsaas/internal/models"
	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	config.LoadEnvFile()
	cfg, err := config.Load(config.GetEnv())
	if err != nil {
		fmt.Println("Config error:", err)
		return
	}
	database, err := db.NewMongoDB(cfg.Database.URI, cfg.Database.Name)
	if err != nil {
		fmt.Println("DB error:", err)
		return
	}

	ctx := context.Background()
	var sys models.SystemConfig
	if err := database.SystemConfig().FindOne(ctx, bson.M{}).Decode(&sys); err != nil {
		fmt.Println("System Not Initialized (No sys config).")
		return
	}
	
	fmt.Printf("System Initialized: %v\n", sys.Initialized)

	var user models.User
	if err := database.Users().FindOne(ctx, bson.M{"email": "admin@agente.ia"}).Decode(&user); err != nil {
		fmt.Println("Admin User NOT FOUND")
	} else {
		fmt.Println("Admin User FOUND:", user.Email)
		fmt.Println("Password hash exists:", user.PasswordHash != "")
	}
}
