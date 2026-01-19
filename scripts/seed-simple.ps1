# Script PowerShell simplifié - Exécute le SQL directement
# Usage: .\scripts\seed-simple.ps1

Write-Host "🌱 Insertion des données initiales..." -ForegroundColor Cyan

# Vérifier que Docker est en cours d'exécution
$postgresRunning = docker ps --filter "name=internet-access-postgres" --format "{{.Names}}"
if (-not $postgresRunning) {
    Write-Host "❌ Le conteneur PostgreSQL n'est pas en cours d'exécution" -ForegroundColor Red
    exit 1
}

# Chemin vers le script SQL
$scriptPath = Join-Path $PSScriptRoot "seed-data.sql"

# Exécuter directement via stdin
Get-Content $scriptPath | docker exec -i internet-access-postgres psql -U unikin_user -d internet_access

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Données insérées avec succès !" -ForegroundColor Green
    Write-Host "🔑 Mot de passe pour tous: password123" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erreur lors de l'insertion" -ForegroundColor Red
}

