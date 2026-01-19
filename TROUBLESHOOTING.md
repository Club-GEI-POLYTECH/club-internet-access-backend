# 🔧 Guide de Dépannage

## ❌ Erreur: `getaddrinfo ENOTFOUND postgres`

Cette erreur signifie que l'application ne peut pas trouver le service PostgreSQL.

### Solutions selon votre environnement

#### 🔵 Solution 1: Développement local avec Docker (Recommandé)

```bash
# Démarrer PostgreSQL avec Docker Compose
docker-compose up -d postgres

# Vérifier que le conteneur est démarré
docker-compose ps

# Les logs devraient maintenant montrer la connexion réussie
```

#### 🔵 Solution 2: Développement local sans Docker

Si vous avez PostgreSQL installé localement :

1. **Créer un fichier `.env`** à la racine du projet :
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=votre_mot_de_passe
DB_DATABASE=internet_access
NODE_ENV=development
PORT=3000
```

2. **Démarrer PostgreSQL localement** (selon votre OS) :
   - **Windows**: Services → PostgreSQL
   - **Linux**: `sudo systemctl start postgresql`
   - **macOS**: `brew services start postgresql`

#### 🔵 Solution 3: Sur Railway (Production)

Sur Railway, les variables `PG*` doivent être automatiquement disponibles si vous avez un service PostgreSQL.

**Vérifiez dans Railway Dashboard :**

1. Allez dans votre projet Railway
2. Vérifiez que vous avez **2 services** :
   - ✅ Backend
   - ✅ PostgreSQL (ou Postgres)
3. Dans le service **Backend** → **Variables** :
   - Les variables `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` doivent être présentes
   - Si elles ne sont pas là, cliquez sur le service PostgreSQL → **Variables** → copiez les valeurs `PG*`
   - Ou utilisez les références Railway : `${{Postgres.PGHOST}}`, etc.

**Dans les logs Railway, vous devriez voir :**
```
✅ Using PG* variables (Railway nomenclature)
   Host: [votre-host-railway]
   ...
```

Si vous voyez :
```
⚠️ PG* variables not found, falling back to DB_* variables
```

Cela signifie que les variables `PG*` ne sont pas disponibles. Il faut les configurer manuellement ou vérifier que le service PostgreSQL est bien lié.

## ❌ Autres erreurs courantes

### Erreur: `connect ECONNREFUSED`

**Cause**: PostgreSQL n'est pas démarré ou n'écoute pas sur le port configuré.

**Solution**:
- Vérifiez que PostgreSQL est démarré : `docker-compose ps` ou `pg_isready`
- Vérifiez le port dans votre configuration

### Erreur: `password authentication failed`

**Cause**: Identifiants incorrects.

**Solution**:
- Vérifiez vos variables d'environnement `DB_USERNAME` et `DB_PASSWORD`
- En Docker : vérifiez `DB_USER` et `DB_PASSWORD` dans `docker-compose.yml`

### Erreur: `database "internet_access" does not exist`

**Cause**: La base de données n'existe pas.

**Solution**:
```bash
# Créer la base de données
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE internet_access;"

# Ou si PostgreSQL est local
createdb internet_access
```

## 📋 Checklist de vérification

Avant de démarrer l'application, vérifiez :

- [ ] PostgreSQL est démarré (Docker ou local)
- [ ] Le fichier `.env` existe et contient les bonnes variables (si développement local)
- [ ] Les variables `PG*` sont présentes sur Railway (si production)
- [ ] Le port PostgreSQL (5432 par défaut) est accessible
- [ ] La base de données existe
- [ ] Les identifiants sont corrects

## 🔍 Commandes utiles

```bash
# Vérifier si PostgreSQL est accessible (Docker)
docker-compose exec postgres pg_isready

# Se connecter à PostgreSQL (Docker)
docker-compose exec postgres psql -U unikin_user -d internet_access

# Vérifier les variables d'environnement
# Dans le conteneur backend
docker-compose exec backend env | grep DB_
docker-compose exec backend env | grep PG_

# Logs PostgreSQL
docker-compose logs postgres

# Logs Backend
docker-compose logs backend
```

## 🌐 Sur Railway

```bash
# Voir les variables d'environnement
railway variables

# Voir les logs
railway logs

# Se connecter au service
railway run --service backend bash
```
