# Script PowerShell pour insérer les données initiales dans la base de données
# Usage: .\scripts\seed.ps1

Write-Host "🌱 Insertion des données initiales dans la base de données..." -ForegroundColor Cyan

# Vérifier que Docker est en cours d'exécution
$postgresRunning = docker ps --filter "name=internet-access-postgres" --format "{{.Names}}"
if (-not $postgresRunning) {
    Write-Host "❌ Le conteneur PostgreSQL n'est pas en cours d'exécution" -ForegroundColor Red
    Write-Host "   Lancez d'abord: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Chemin vers le script SQL
$scriptPath = Join-Path $PSScriptRoot "seed-data.sql"

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Fichier SQL non trouvé: $scriptPath" -ForegroundColor Red
    exit 1
}

# Copier le fichier SQL dans le container
Write-Host "📋 Copie du fichier SQL dans le container..." -ForegroundColor Yellow
docker cp $scriptPath internet-access-postgres:/seed-data.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la copie du fichier" -ForegroundColor Red
    exit 1
}

# Exécuter le script SQL
Write-Host "📝 Exécution du script SQL..." -ForegroundColor Yellow
docker exec -i internet-access-postgres psql -U unikin_user -d internet_access -f /seed-data.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Données initiales insérées avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔑 Identifiants de connexion (mot de passe : password123) :" -ForegroundColor Cyan
    Write-Host "   - Admin: admin@unikin.cd"
    Write-Host "   - Agent 1: agent1@unikin.cd"
    Write-Host "   - Agent 2: agent2@unikin.cd"
    Write-Host "   - Étudiant 1: student1@student.unikin.cd"
    Write-Host "   - Étudiant 2: student2@student.unikin.cd"
    Write-Host ""
    Write-Host "📊 Vérifiez les données dans Adminer: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "   ou PgAdmin: http://localhost:5050" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erreur lors de l'insertion des données" -ForegroundColor Red
    exit 1
}

