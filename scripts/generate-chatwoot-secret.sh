#!/bin/bash
# =============================================================
#  generate-chatwoot-secret.sh
#  Gera um SECRET_KEY_BASE para o Chatwoot e atualiza o .env.production
#  Uso: bash scripts/generate-chatwoot-secret.sh
# =============================================================

set -e

CHATWOOT_DIR="$(cd "$(dirname "$0")/.." && pwd)/chatwoot-develop"
ENV_FILE="$CHATWOOT_DIR/.env.production"

echo ""
echo "🔑 Gerando SECRET_KEY_BASE para o Chatwoot..."
echo ""

# Gera a chave usando a imagem Docker do Chatwoot
SECRET=$(docker run --rm chatwoot/chatwoot:latest bundle exec rake secret 2>/dev/null)

if [ -z "$SECRET" ]; then
  echo "❌ Falha ao gerar a chave. Verifique se o Docker está rodando."
  exit 1
fi

echo "✅ Chave gerada com sucesso!"
echo ""

# Substitui no .env.production
if [ -f "$ENV_FILE" ]; then
  # Linux/macOS
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "s|SECRET_KEY_BASE=.*|SECRET_KEY_BASE=$SECRET|" "$ENV_FILE"
  else
    sed -i "" "s|SECRET_KEY_BASE=.*|SECRET_KEY_BASE=$SECRET|" "$ENV_FILE"
  fi
  echo "📝 SECRET_KEY_BASE atualizado em $ENV_FILE"
else
  echo "⚠️  Arquivo $ENV_FILE não encontrado."
  echo "   Adicione manualmente:"
  echo "   SECRET_KEY_BASE=$SECRET"
fi

echo ""
echo "✅ Pronto! Agora edite o .env.production com seu IP/domínio e senhas,"
echo "   depois execute: bash scripts/deploy-chatwoot.sh"
echo ""
