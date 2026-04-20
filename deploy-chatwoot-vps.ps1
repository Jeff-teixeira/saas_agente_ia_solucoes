# =============================================
# deploy-chatwoot-vps.ps1
# Execute com: powershell -ExecutionPolicy Bypass -File deploy-chatwoot-vps.ps1
# OU clique com botão direito -> "Executar com PowerShell"
# =============================================

$VPS = "root@2.24.199.198"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  DEPLOY CHATWOOT - VPS $VPS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sera pedida a senha do VPS. Digite e pressione Enter." -ForegroundColor Yellow
Write-Host ""

# Todos os comandos em um unico script enviado ao VPS
$REMOTE_SCRIPT = @'
set -e

echo ""
echo "[1/6] Criando pasta /root/chatwoot..."
mkdir -p /root/chatwoot && cd /root/chatwoot

echo ""
echo "[2/6] Criando docker-compose.production.yaml..."
cat > /root/chatwoot/docker-compose.production.yaml << 'COMPOSEEOF'
version: '3'
services:
  base: &base
    image: chatwoot/chatwoot:latest
    env_file: .env.production
    volumes:
      - storage_data:/app/storage
  rails:
    <<: *base
    depends_on:
      - postgres
      - redis
    ports:
      - '3100:3000'
    environment:
      - NODE_ENV=production
      - RAILS_ENV=production
      - INSTALLATION_ENV=docker
    entrypoint: docker/entrypoints/rails.sh
    command: ['bundle', 'exec', 'rails', 's', '-p', '3000', '-b', '0.0.0.0']
    restart: always
  sidekiq:
    <<: *base
    depends_on:
      - postgres
      - redis
    environment:
      - NODE_ENV=production
      - RAILS_ENV=production
      - INSTALLATION_ENV=docker
    command: ['bundle', 'exec', 'sidekiq', '-C', 'config/sidekiq.yml']
    restart: always
  postgres:
    image: pgvector/pgvector:pg16
    restart: always
    ports:
      - '127.0.0.1:5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=chatwoot_production
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=MaSerati88++
  redis:
    image: redis:alpine
    restart: always
    command: ["sh", "-c", "redis-server --requirepass \"$REDIS_PASSWORD\""]
    env_file: .env.production
    volumes:
      - redis_data:/data
    ports:
      - '127.0.0.1:6379:6379'
volumes:
  storage_data:
  postgres_data:
  redis_data:
COMPOSEEOF
echo "docker-compose criado com sucesso!"

echo ""
echo "[3/6] Gerando SECRET_KEY_BASE (aguarde ate 2 minutos)..."
SECRET=$(docker run --rm chatwoot/chatwoot:latest bundle exec rake secret 2>/dev/null)
if [ -z "$SECRET" ]; then
  echo "ERRO: Falha ao gerar SECRET_KEY_BASE!"
  exit 1
fi
echo "Chave gerada: ${SECRET:0:15}..."

echo ""
echo "[4/6] Criando .env.production..."
cat > /root/chatwoot/.env.production << ENVEOF
SECRET_KEY_BASE=${SECRET}
FRONTEND_URL=http://2.24.199.198:3100
POSTGRES_HOST=postgres
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=MaSerati88++
REDIS_URL=redis://:MaSerati88++@redis:6379
REDIS_PASSWORD=MaSerati88++
RAILS_ENV=production
NODE_ENV=production
RAILS_MAX_THREADS=5
RAILS_LOG_TO_STDOUT=true
LOG_LEVEL=info
ENABLE_ACCOUNT_SIGNUP=false
ACTIVE_STORAGE_SERVICE=local
ENABLE_PUSH_RELAY_SERVER=true
FORCE_SSL=false
ENVEOF
echo ".env.production criado!"

echo ""
echo "[5/6] Baixando imagens Docker (pode demorar alguns minutos)..."
cd /root/chatwoot
docker compose -f docker-compose.production.yaml pull

echo ""
echo "Subindo containers..."
docker compose -f docker-compose.production.yaml up -d

echo ""
echo "Aguardando banco inicializar (30 segundos)..."
sleep 30

echo ""
echo "[6/6] Rodando migrations do banco de dados..."
docker compose -f docker-compose.production.yaml exec -T rails bundle exec rails db:chatwoot_prepare

echo ""
echo "=== STATUS DOS CONTAINERS ==="
docker compose -f docker-compose.production.yaml ps

echo ""
echo "=============================================="
echo " SUCESSO! Chatwoot rodando em:"
echo " http://2.24.199.198:3100"
echo "=============================================="
'@

# Executa o script remotamente via SSH
Write-Host "Conectando ao VPS..." -ForegroundColor Green
$REMOTE_SCRIPT | ssh $VPS "bash -s"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host " Deploy concluido!" -ForegroundColor Green
Write-Host " Acesse: http://2.24.199.198:3100" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Pressione Enter para fechar"
