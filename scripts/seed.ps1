# Seed TypeScript (types tickets + admin). PostgreSQL : voir .env (DATABASE_URL).
# Usage : .\scripts\seed.ps1

$ErrorActionPreference = "Stop"
Push-Location (Split-Path $PSScriptRoot -Parent)

try {
    Write-Host "Exécution npm run seed:admin..." -ForegroundColor Cyan
    npm run seed:admin
    Write-Host ""
    Write-Host "Seed terminé." -ForegroundColor Green
    Write-Host "  Admin par défaut : president@clubgei-polytech.org (surcharge : ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)"
}
finally {
    Pop-Location
}
