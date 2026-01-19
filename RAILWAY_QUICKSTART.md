# 🚀 Déploiement Rapide sur Railway

Guide rapide pour déployer votre application en 5 minutes.

## 📝 Étapes Rapides

### 1. Préparer le Repository

Assurez-vous que votre code est sur GitHub/GitLab/Bitbucket.

### 2. Créer un Projet Railway

1. Allez sur https://railway.app
2. Cliquez sur "New Project"
3. Sélectionnez "Deploy from GitHub repo"
4. Choisissez votre repository

### 3. Ajouter PostgreSQL

1. Dans votre projet Railway, cliquez sur "New"
2. Sélectionnez "Database" → "PostgreSQL"
3. Railway créera automatiquement une base de données

### 4. Ajouter le Backend

1. Cliquez sur "New" → "GitHub Repo" (même repo)
2. **IMPORTANT**: Configurez manuellement dans Settings:
   - **Root Directory**: `backend` ⚠️ **OBLIGATOIRE**
   - **Builder**: `DOCKERFILE`
   - **Dockerfile Path**: `Dockerfile.prod`
   - **Start Command**: (laissé vide)

### 5. Configurer les Variables d'Environnement du Backend

Dans Railway Dashboard → Backend Service → Variables, ajoutez:

```env
# Database (Railway génère automatiquement ces variables)
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_DATABASE=${{Postgres.PGDATABASE}}

# JWT (changez ce secret!)
JWT_SECRET=votre-secret-jwt-super-securise-changez-moi

# MikroTik
MIKROTIK_HOST=192.168.88.1
MIKROTIK_PORT=8728
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=votre-mot-de-passe

# Application
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://votre-frontend.railway.app
```

**Important**: Remplacez `votre-frontend.railway.app` par l'URL réelle après avoir déployé le frontend.

### 6. Ajouter le Frontend

1. Cliquez sur "New" → "GitHub Repo" (même repo)
2. **IMPORTANT**: Configurez manuellement dans Settings:
   - **Root Directory**: `frontend` ⚠️ **OBLIGATOIRE**
   - **Builder**: `DOCKERFILE` (recommandé)
   - **Dockerfile Path**: `Dockerfile.prod`
   - **Start Command**: (laissé vide)

### 7. Configurer les Variables d'Environnement du Frontend

Dans Railway Dashboard → Frontend Service → Variables, ajoutez:

```env
VITE_API_URL=https://votre-backend.railway.app/api
```

**Important**: Remplacez `votre-backend.railway.app` par l'URL réelle du backend (visible dans Railway Dashboard).

### 8. Générer les Domaines

1. **Backend**: Settings → Generate Domain
2. **Frontend**: Settings → Generate Domain
3. Copiez les URLs et mettez à jour les variables d'environnement

### 9. Initialiser la Base de Données

Une fois le backend déployé, exécutez le seed pour créer l'utilisateur admin:

```bash
# Via Railway CLI
railway run --service backend npm run seed:admin

# Ou via Railway Dashboard
# Backend Service → Deployments → Latest → Shell
# Puis: npm run seed:admin
```

### 10. Tester

1. Accédez à l'URL du frontend
2. Connectez-vous avec:
   - Email: `admin@unikin.cd`
   - Password: `password123`

## ✅ Vérification

- ✅ Backend accessible: `https://votre-backend.railway.app/api`
- ✅ Frontend accessible: `https://votre-frontend.railway.app`
- ✅ Base de données connectée (vérifiez les logs du backend)
- ✅ CORS configuré correctement

## 🔧 Dépannage Rapide

### Backend ne démarre pas
- Vérifiez les logs: Railway Dashboard → Backend → Deployments → View Logs
- Vérifiez que toutes les variables d'environnement sont configurées

### Frontend ne peut pas accéder à l'API
- Vérifiez que `VITE_API_URL` est correct
- Vérifiez que le backend est accessible publiquement
- Vérifiez les CORS dans les logs du backend

### Base de données non connectée
- Vérifiez que vous utilisez les variables Railway: `${{Postgres.PGHOST}}`
- Vérifiez que le service PostgreSQL est démarré

## 📚 Documentation Complète

Pour plus de détails, consultez [RAILWAY.md](./RAILWAY.md)
