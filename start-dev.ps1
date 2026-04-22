# ================================================================
# start-dev.ps1 — Inicia o ambiente local AgenteIA SaaS
# MongoDB na VPS via IP Direto (porta 27017 publicada no Easypanel)
# ================================================================
$ErrorActionPreference = "SilentlyContinue"
$projectRoot = $PSScriptRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AgenteIA SaaS - Ambiente Local Dev (Conectado a VPS)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/3] Banco de dados: Local (localhost:27017)" -ForegroundColor Green

# Ler variaveis do .env raiz
$envVars = ""
$envFile = Join-Path $projectRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#=\s]+)=(.*)$') {
            $envVars += "`$env:$($matches[1]) = '$($matches[2])'`n"
        }
    }
}

# 2. Backend Go
Write-Host "[2/3] Iniciando Backend Go (porta 4290)..." -ForegroundColor Yellow
$backendDir = Join-Path $projectRoot "backend"
$ps1Backend = Join-Path $env:TEMP "start-agenteia-backend.ps1"

$backendScript = @"
cd `"$backendDir`"
$envVars
`$env:LASTSAAS_ENV = 'dev'
Write-Host `"Backend conectando na VPS... Iniciando em http://localhost:4290...`" -ForegroundColor Green
go run ./cmd/server
PAUSE
"@
Set-Content -Path $ps1Backend -Value $backendScript
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$ps1Backend`"" -WindowStyle Normal

# 3. Frontend Vite
Write-Host "[3/3] Iniciando Frontend Vite (porta 4280)..." -ForegroundColor Yellow
$frontendDir = Join-Path $projectRoot "frontend"
$ps1Frontend = Join-Path $env:TEMP "start-agenteia-frontend.ps1"

@"
cd `"$frontendDir`"
Write-Host `"Frontend iniciando em http://localhost:4280...`" -ForegroundColor Green
npm run dev
PAUSE
"@ | Set-Content $ps1Frontend
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$ps1Frontend`"" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Aguarde ~10 seg e acesse:" -ForegroundColor Green
Write-Host "  http://localhost:4280" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
