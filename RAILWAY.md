# 🚂 Guide de Déploiement sur Railway

Ce guide explique comment déployer le backend et le frontend sur Railway comme services séparés, similaire à la façon dont Railway fonctionne nativement.

## 📋 Prérequis

- Compte Railway (https://railway.app)
- Git repository (GitHub, GitLab, etc.)
- PostgreSQL (peut être fourni par Railway ou externe)

## 🏗️ Architecture sur Railway

```
┌─────────────────┐
│   Frontend       │  (Service React - Nginx)
│   (Port 3000)    │
└────────┬─────────┘
         │
         │ HTTP
         ▼
┌─────────────────┐
│   Backend        │  (Service NestJS)
│   (Port 3000)    │
└────────┬─────────┘
         │
         │ TypeORM
         ▼
┌─────────────────┐
│   PostgreSQL     │  (Service Railway ou externe)
└─────────────────┘
```

## 🚀 Déploiement

### Option 1: Déploiement via Railway Dashboard (Recommandé)

1. **Créer un nouveau projet sur Railway**
   - Allez sur https://railway.app
   - Créez un nouveau projet
   - Sélectionnez "Deploy from GitHub repo"

2. **Ajouter le service Backend**
   - Cliquez sur "New" → "GitHub Repo"
   - Sélectionnez votre repository
   - **IMPORTANT**: Configurez manuellement:
     - **Root Directory**: `backend`
     - **Builder**: `DOCKERFILE` ⚠️ **OBLIGATOIRE** (pas NIXPACKS)
     - **Dockerfile Path**: `Dockerfile.prod`
     - **Start Command**: (laissé vide, défini dans Dockerfile)

3. **Ajouter le service Frontend**
   - Cliquez sur "New" → "GitHub Repo" (même repo)
   - **IMPORTANT**: Configurez manuellement:
     - **Root Directory**: `frontend` ⚠️ **OBLIGATOIRE**
     - **Builder**: `DOCKERFILE` ⚠️ **OBLIGATOIRE** (pas NIXPACKS)
     - **Dockerfile Path**: `Dockerfile.prod`
     - **Start Command**: (laissé vide, défini dans Dockerfile)
   
   **Note**: Les fichiers `railway.json` sont configurés pour utiliser Dockerfile automatiquement, mais vous devez définir le Root Directory dans Railway Dashboard.

4. **Ajouter PostgreSQL**
   - Cliquez sur "New" → "Database" → "PostgreSQL"
   - Railway créera automatiquement une base de données

### Option 2: Déploiement via Railway CLI

```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Initialiser le projet
railway init

# Lier le projet
railway link

# Déployer le backend
cd backend
railway up

# Déployer le frontend (dans un autre terminal)
cd frontend
railway up
```

## 🔧 Configuration des Variables d'Environnement

### Backend

Dans Railway Dashboard → Backend Service → Variables:

```env
# Database - Railway fournit automatiquement les variables PG* pour PostgreSQL
# Le backend détecte automatiquement: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# Vous n'avez PAS besoin de créer ces variables manuellement !
# Si vous utilisez un service PostgreSQL Railway, ces variables sont déjà disponibles

# JWT
JWT_SECRET=votre-secret-jwt-super-securise-changez-moi

# MikroTik
MIKROTIK_HOST=192.168.88.1
MIKROTIK_PORT=8728
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=votre-mot-de-passe-mikrotik

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://votre-frontend.railway.app

# Email (si vous utilisez un service SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM=noreply@unikin.cd
APP_NAME=Club Internet Access UNIKIN
```

### Frontend

Dans Railway Dashboard → Frontend Service → Variables:

```env
VITE_API_URL=https://votre-backend.railway.app/api
```

**Important**: Railway génère automatiquement des URLs pour chaque service. Utilisez ces URLs dans vos variables d'environnement.

## 🌐 Configuration des Domaines

1. **Backend**
   - Railway Dashboard → Backend Service → Settings → Generate Domain
   - Copiez l'URL (ex: `backend-production.up.railway.app`)

2. **Frontend**
   - Railway Dashboard → Frontend Service → Settings → Generate Domain
   - Copiez l'URL (ex: `frontend-production.up.railway.app`)

3. **Mettre à jour les variables d'environnement**
   - Backend: `FRONTEND_URL=https://frontend-production.up.railway.app`
   - Frontend: `VITE_API_URL=https://backend-production.up.railway.app/api`

## 🔄 Workflow de Déploiement

Railway déploie automatiquement à chaque push sur votre branche principale. Pour déployer manuellement:

```bash
# Backend
cd backend
railway up

# Frontend
cd frontend
railway up
```

## 📦 Utilisation de Dockerfiles

Si vous préférez utiliser Docker (recommandé pour plus de contrôle):

### Backend

Le fichier `backend/Dockerfile.prod` est déjà configuré. Railway l'utilisera automatiquement.

### Frontend

Le fichier `frontend/Dockerfile.prod` utilise Nginx pour servir les fichiers statiques avec des optimisations de production:
- Multi-stage build pour réduire la taille de l'image
- Utilisateur non-root pour la sécurité
- Healthcheck intégré
- Configuration Nginx optimisée

Pour utiliser le Dockerfile:
- Railway Dashboard → Frontend Service → Settings
- Activez "Use Dockerfile"
- Railway utilisera automatiquement `Dockerfile.prod` (configuré dans `frontend/railway.json`)

**Note**: Le fichier `frontend/Dockerfile` est pour le développement. Pour la production, utilisez toujours `Dockerfile.prod`.

## 🔐 Sécurité

1. **JWT Secret**: Utilisez un secret fort et unique
2. **Database**: Ne partagez jamais les credentials
3. **MikroTik**: Utilisez un utilisateur avec permissions limitées
4. **CORS**: Le backend doit autoriser le domaine du frontend

## 🐛 Dépannage

### Backend ne se connecte pas à la base de données

- Railway fournit automatiquement les variables `PG*` (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) pour les services PostgreSQL
- Le backend détecte automatiquement ces variables en priorité
- Vérifiez dans les logs que vous voyez: `✅ Using PG* variables (Railway nomenclature)`
- Si vous voyez `⚠️ PG* variables not found, falling back to DB_* variables`, vérifiez que le service PostgreSQL est bien lié au service backend
- Vérifiez les logs: Railway Dashboard → Backend Service → Deployments → View Logs

### Frontend ne peut pas accéder à l'API

- Vérifiez que `VITE_API_URL` est correctement configuré
- Vérifiez que le backend est accessible publiquement
- Vérifiez les CORS dans le backend

### Build échoue

- Vérifiez les logs de build dans Railway Dashboard
- Assurez-vous que tous les fichiers nécessaires sont dans le repository
- Vérifiez que les dépendances sont correctement installées

## 📊 Monitoring

Railway fournit:
- Logs en temps réel
- Métriques de performance
- Alertes en cas d'erreur

Accédez-y via Railway Dashboard → Service → Metrics/Logs

## 💰 Coûts

Railway offre:
- **Hobby Plan**: Gratuit avec limitations
- **Pro Plan**: Payant avec plus de ressources

Consultez https://railway.app/pricing pour plus d'informations.

## 🔗 Ressources

- [Documentation Railway](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Exemples Railway](https://github.com/railwayapp/starters)
