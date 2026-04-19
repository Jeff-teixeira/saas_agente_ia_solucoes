package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"lastsaas/internal/config"
	"lastsaas/internal/db"
	"lastsaas/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/crypto/bcrypt"
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
		log.Fatalf("Erro ao conectar no banco: %v", err)
	}
	defer database.Close(context.Background())

	ctx := context.Background()

	// Buscar todas as ordens de venda (SaleOrders)
	cursor, err := database.SaleOrders().Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Erro ao buscar ordens de venda: %v", err)
	}
	defer cursor.Close(ctx)

	var orders []models.SaleOrder
	if err = cursor.All(ctx, &orders); err != nil {
		log.Fatalf("Erro ao decodificar ordens: %v", err)
	}

	count := 0
	for _, order := range orders {
		// Se a senha padrao estiver vazia E nao for o admin raiz (embora o AdminCreateSale que crie admin)
		if order.DefaultPassword == "" {
			// Gerar nova senha de 6 digitos
			newPassword := fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)

			// Atualiza no SaleOrder
			_, err = database.SaleOrders().UpdateOne(ctx,
				bson.M{"_id": order.ID},
				bson.M{"$set": bson.M{"defaultPassword": newPassword}},
			)
			if err != nil {
				log.Printf("Erro ao atualizar SaleOrder %s: %v", order.ID.Hex(), err)
				continue
			}

			// Atualizar o User no banco (Forçar Nova Senha)
			// Mesmo que a senha fosse perdida antes, agora salvamos ela.
			hashed, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
			
			_, err = database.Users().UpdateOne(ctx,
				bson.M{"_id": order.UserID},
				bson.M{"$set": bson.M{"passwordHash": string(hashed), "updatedAt": time.Now()}},
			)
			if err != nil {
				log.Printf("Erro ao atualizar User %s: %v", order.UserID.Hex(), err)
				continue
			}

			log.Printf("Cliente %s (%s) corrigido! Senha gerada e salva: %s", order.ClientName, order.Email, newPassword)
			count++
		}
	}

	fmt.Printf("\nSucesso! %d vendas antigas foram atualizadas com senhas legiveis na tela do Admin e nos bancos.\n", count)
}
