#!/bin/bash
# Seed TypeScript (admin + comptes dev si SEED_DEV_PASSWORD). PostgreSQL doit être joignable (voir .env).
# Usage : ./scripts/seed.sh

set -e
cd "$(dirname "$0")/.." || exit 1

echo "🌱 Exécution npm run seed:admin..."
npm run seed:admin

echo ""
echo "✅ Seed terminé."
echo "   Admin : ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD"
echo "   Dev : SEED_DEV_PASSWORD → agent@unikin.cd, student@student.unikin.cd"
