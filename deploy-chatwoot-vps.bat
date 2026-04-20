@echo off
:: =============================================
:: deploy-chatwoot-vps.bat
:: Clique duplo para executar!
:: =============================================
echo.
echo ===================================================
echo   DEPLOY CHATWOOT NO VPS 2.24.199.198
echo ===================================================
echo.
echo Voce sera conectado ao VPS. Digite a senha quando pedir.
echo Todos os comandos serao executados automaticamente.
echo.
pause

:: Script completo que sera enviado ao VPS via SSH
ssh root@2.24.199.198 "bash -s" << 'SSHEOF'
set -e
echo ""
echo "=== [1/6] Criando pasta /root/chatwoot ==="
mkdir -p /root/chatwoot
cd /root/chatwoot

echo ""
echo "=== [2/6] Criando docker-compose.production.yaml ==="
cat > docker-compose.production.yaml << 'COMPOSEEOF'
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

echo ""
echo "=== [3/6] Gerando SECRET_KEY_BASE (aguarde ~60s) ==="
SECRET=$(docker run --rm chatwoot/chatwoot:latest bundle exec rake secret 2>/dev/null)
echo "Chave gerada: ${SECRET:0:20}..."

echo ""
echo "=== [4/6] Criando .env.production ==="
cat > .env.production << ENVEOF
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

echo ""
echo "=== [5/6] Baixando imagens e subindo containers ==="
cd /root/chatwoot
docker compose -f docker-compose.production.yaml pull
docker compose -f docker-compose.production.yaml up -d

echo ""
echo "=== Aguardando banco iniciar (25s) ==="
sleep 25

echo ""
echo "=== [6/6] Rodando migrations do banco ==="
docker compose -f docker-compose.production.yaml exec -T rails bundle exec rails db:chatwoot_prepare

echo ""
echo "=== STATUS FINAL ==="
docker compose -f docker-compose.production.yaml ps

echo ""
echo "=============================================="
echo " CHATWOOT RODANDO EM http://2.24.199.198:3100"
echo "=============================================="
SSHEOF

echo.
echo Deploy concluido! Acesse: http://2.24.199.198:3100
pause
