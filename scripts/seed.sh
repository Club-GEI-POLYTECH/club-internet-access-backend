#!/bin/bash
# Seed TypeScript (types tickets + admin). PostgreSQL : voir .env (DATABASE_URL).
# Usage : ./scripts/seed.sh

set -e
cd "$(dirname "$0")/.." || exit 1

echo "🌱 Exécution npm run seed:admin..."
npm run seed:admin

echo ""
echo "✅ Seed terminé."
echo "   Admin par défaut : president@clubgei-polytech.org (surcharge : ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)"
