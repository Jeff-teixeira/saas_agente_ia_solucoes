//go:build windows

package main

import (
	"fmt"
	"os"
)

func cmdStart() {
	fmt.Println("O comando start do lastsaas daemon não é suportado nativamente no Windows.")
	fmt.Println("Por favor, rode o Go diretamente: go run ./cmd/server")
	os.Exit(1)
}

func cmdStop() {
	fmt.Println("Comando não suportado no Windows.")
}

func cmdRestart() {
	fmt.Println("Comando não suportado no Windows.")
}
