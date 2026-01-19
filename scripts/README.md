# 📜 Scripts de Seed

Ce dossier contient les scripts pour insérer des données de test dans la base de données.

## Fichiers

- **`seed.ps1`** - Script PowerShell pour Windows (avec vérifications)
- **`seed-simple.ps1`** - Script PowerShell simplifié pour Windows
- **`seed.sh`** - Script bash pour Linux/Mac
- **`seed-data.sql`** - Script SQL alternatif (moins sécurisé pour les mots de passe)

## Utilisation

### Via Docker (Recommandé)

```bash
docker-compose exec backend npm run seed:admin
```

### Localement

```bash
cd backend
npm run seed:admin
```

### Via script PowerShell (Windows)

```powershell
.\backend\scripts\seed.ps1
# Ou version simplifiée
.\backend\scripts\seed-simple.ps1
```

### Via script bash (Linux/Mac)

```bash
bash backend/scripts/seed.sh
```

### Via SQL (Adminer)

1. Ouvrir Adminer : http://localhost:8080
2. Se connecter à PostgreSQL
3. Exécuter le contenu de `seed-data.sql`

## Données créées

- 5 utilisateurs (1 admin, 2 agents, 2 étudiants)
- 5 comptes Wi-Fi (différents statuts et durées)
- 5 paiements (différents statuts et méthodes)

Voir [SEED_GUIDE.md](../SEED_GUIDE.md) pour plus de détails.

