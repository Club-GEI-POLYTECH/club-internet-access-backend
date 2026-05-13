# Seed TypeScript (admin + comptes dev si SEED_DEV_PASSWORD). PostgreSQL doit être joignable (voir .env).
# Usage : .\scripts\seed.ps1

$ErrorActionPreference = "Stop"
Push-Location (Split-Path $PSScriptRoot -Parent)

try {
    Write-Host "Exécution npm run seed:admin..." -ForegroundColor Cyan
    npm run seed:admin
    Write-Host ""
    Write-Host "Seed terminé." -ForegroundColor Green
    Write-Host "  Admin : ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD"
    Write-Host "  Dev : SEED_DEV_PASSWORD -> agent@unikin.cd, student@student.unikin.cd"
}
finally {
    Pop-Location
}
