#!/bin/bash
# =============================================================
#  deploy-chatwoot.sh — Sobe o Chatwoot no VPS via Docker
#  Uso: bash scripts/deploy-chatwoot.sh
# =============================================================

set -e

CHATWOOT_DIR="$(cd "$(dirname "$0")/.." && pwd)/chatwoot-develop"
COMPOSE_FILE="docker-compose.production.yaml"

echo ""
echo "🚀 Iniciando deploy do Chatwoot..."
echo "   Diretório: $CHATWOOT_DIR"
echo ""

# Verifica se .env.production existe
if [ ! -f "$CHATWOOT_DIR/.env.production" ]; then
  echo "❌ Arquivo .env.production não encontrado em $CHATWOOT_DIR"
  echo "   Copie o .env.production e preencha as variáveis antes de continuar."
  exit 1
fi

# Verifica se SECRET_KEY_BASE foi preenchido
if grep -q "SUBSTITUA_COM_RAKE_SECRET" "$CHATWOOT_DIR/.env.production"; then
  echo "❌ Você precisa gerar o SECRET_KEY_BASE antes de continuar!"
  echo "   Execute primeiro: bash scripts/generate-chatwoot-secret.sh"
  exit 1
fi

# Verifica se o IP do VPS foi preenchido
if grep -q "SEU_IP_VPS" "$CHATWOOT_DIR/.env.production"; then
  echo "❌ FRONTEND_URL ainda contém placeholder 'SEU_IP_VPS'"
  echo "   Edite $CHATWOOT_DIR/.env.production e configure a URL correta."
  exit 1
fi

cd "$CHATWOOT_DIR"

echo "📦 Baixando imagem mais recente do Chatwoot..."
docker compose -f $COMPOSE_FILE pull

echo ""
echo "🔄 Subindo containers..."
docker compose -f $COMPOSE_FILE up -d

echo ""
echo "⏳ Aguardando postgres ficar pronto (15s)..."
sleep 15

echo ""
echo "📊 Rodando migrações do banco de dados..."
docker compose -f $COMPOSE_FILE exec rails bundle exec rails db:chatwoot_prepare

echo ""
echo "✅ Chatwoot está rodando!"
echo ""
docker compose -f $COMPOSE_FILE ps
echo ""
echo "🌐 Acesse: $(grep FRONTEND_URL $CHATWOOT_DIR/.env.production | cut -d= -f2)"
echo ""
