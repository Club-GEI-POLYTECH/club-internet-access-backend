#!/bin/bash

# Script pour insérer les données initiales dans la base de données
# Usage: ./scripts/seed.sh

echo "🌱 Insertion des données initiales dans la base de données..."

# Vérifier que Docker est en cours d'exécution
if ! docker ps | grep -q internet-access-postgres; then
    echo "❌ Le conteneur PostgreSQL n'est pas en cours d'exécution"
    echo "   Lancez d'abord: docker-compose up -d"
    exit 1
fi

# Exécuter le seed TypeScript
echo "📝 Exécution du seed TypeScript..."
cd "$(dirname "$0")/.." || exit 1

# Vérifier si on est dans Docker ou localement
if [ -f "/.dockerenv" ]; then
    # Dans Docker
    npm run seed:admin
else
    # Localement, exécuter dans le container
    docker-compose exec backend npm run seed:admin
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Données initiales insérées avec succès !"
    echo ""
    echo "🔑 Identifiants de connexion (mot de passe : password123) :"
    echo "   - Admin: admin@unikin.cd"
    echo "   - Agent 1: agent1@unikin.cd"
    echo "   - Agent 2: agent2@unikin.cd"
    echo "   - Étudiant 1: student1@student.unikin.cd"
    echo "   - Étudiant 2: student2@student.unikin.cd"
    echo ""
    echo "📊 Vérifiez les données dans Adminer: http://localhost:8080"
    echo "   ou PgAdmin: http://localhost:5050"
else
    echo "❌ Erreur lors de l'insertion des données"
    exit 1
fi

