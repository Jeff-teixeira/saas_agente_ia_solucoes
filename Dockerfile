# ─────────────────────────────────────────────────────────────
# Stage 1: Build Go backend
# ─────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS backend-builder
RUN apk add --no-cache git
WORKDIR /build
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY VERSION ./VERSION
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags "-X lastsaas/internal/version.buildVersion=$(cat VERSION)" \
    -o lastsaas ./cmd/server

# ─────────────────────────────────────────────────────────────
# Stage 2: Build frontend (Vite/React)
# VITE_* vars são resolvidas em BUILD time pelo Vite,
# por isso precisam ser passadas como ARG aqui.
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /build

# Build-time args (passados via Easypanel ou --build-arg)
ARG VITE_API_URL=http://localhost/api
ARG VITE_CHATWOOT_URL=
ARG VITE_CHATWOOT_STATUS=active

# Exportar como variáveis de ambiente para o npm run build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CHATWOOT_URL=$VITE_CHATWOOT_URL
ENV VITE_CHATWOOT_STATUS=$VITE_CHATWOOT_STATUS

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 3: Runtime (imagem mínima)
# ─────────────────────────────────────────────────────────────
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

# Backend binary
COPY --from=backend-builder /build/lastsaas ./lastsaas

# Config de produção
COPY backend/config/prod.example.yaml ./config/prod.yaml

# Frontend estático compilado
COPY --from=frontend-builder /build/dist ./static

ENV LASTSAAS_ENV=prod
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080

EXPOSE 8080

CMD ["./lastsaas"]
