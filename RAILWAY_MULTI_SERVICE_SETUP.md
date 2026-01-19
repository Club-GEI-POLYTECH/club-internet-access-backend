# 🚂 Configuration Railway Multi-Services (Backend + PostgreSQL)

Ce guide explique comment configurer Railway pour détecter et déployer automatiquement les services **backend** et **postgres** depuis votre projet, comme dans le projet `panga`.

## 🔍 Problème identifié

Railway ne détecte pas automatiquement plusieurs services depuis `docker-compose.yml` par défaut. Il faut configurer le projet correctement pour que Railway comprenne qu'il y a plusieurs services.

## ✅ Solution : Configuration manuelle dans Railway Dashboard

### Option 1 : Services séparés (Recommandé)

1. **Créer le projet sur Railway**
   - Allez sur https://railway.app
   - Créez un nouveau projet
   - Sélectionnez "Deploy from GitHub repo"
   - Choisissez votre repository `club-internet-access-backend`

2. **Ajouter le service PostgreSQL**
   - Dans votre projet Railway, cliquez sur **"+ New"** ou **"Add Service"**
   - Sélectionnez **"Database"** → **"PostgreSQL"**
   - Railway créera automatiquement une base de données PostgreSQL
   - Notez le nom du service (par exemple : `Postgres`)

3. **Configurer le service Backend**
   - Le service backend devrait déjà être créé depuis GitHub
   - Allez dans **Settings** du service backend
   - Configurez :
     - **Root Directory**: `/` (racine du repo)
     - **Builder**: `DOCKERFILE` ⚠️ **OBLIGATOIRE**
     - **Dockerfile Path**: `Dockerfile`
     - Railway utilisera automatiquement `railway.json` pour la configuration

4. **Lier les services avec des variables d'environnement**
   - Dans le service **Backend** → **Variables**
   - Railway fournit automatiquement les variables `PG*` pour les services PostgreSQL
   - Le backend détecte automatiquement ces variables (priorité 1)
   - **Vous n'avez PAS besoin de créer ces variables manuellement** - Railway les génère automatiquement
   
   **Note**: Le backend utilise automatiquement les variables `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` si elles sont disponibles (Railway), sinon il utilise les variables `DB_*` en fallback (local/Docker)

5. **Ajouter les autres variables d'environnement**
   - Ajoutez toutes les autres variables nécessaires :
     ```
     NODE_ENV=production
     PORT=4000
     JWT_SECRET=votre-secret-jwt-super-securise
     MIKROTIK_HOST=votre-adresse-mikrotik
     MIKROTIK_PORT=8728
     MIKROTIK_USER=votre-utilisateur
     MIKROTIK_PASSWORD=votre-mot-de-passe
     FRONTEND_URL=https://votre-frontend.railway.app
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=votre-email@gmail.com
     SMTP_PASS=votre-mot-de-passe-app
     SMTP_FROM=noreply@unikin.cd
     APP_NAME=Club Internet Access UNIKIN
     ```

6. **Vérifier la configuration**
   - Railway devrait maintenant afficher **2 services** dans votre projet :
     - ✅ Backend (service principal)
     - ✅ Postgres (base de données)
   - Les services devraient être liés via les variables d'environnement

### Option 2 : Utiliser Railway CLI avec docker-compose

Si vous préférez utiliser Railway CLI :

```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Initialiser le projet
railway init

# Lier le projet
railway link

# Déployer (Railway détectera docker-compose.yml si configuré correctement)
railway up
```

**Note**: Railway CLI peut détecter automatiquement `docker-compose.yml` dans certains cas, mais pour une configuration multi-services fiable, utilisez l'Option 1.

## 🔧 Différences avec le projet `panga`

Le projet `panga` fonctionne probablement parce que :

1. ✅ Les services ont été créés manuellement dans Railway Dashboard
2. ✅ Le service PostgreSQL a été ajouté comme service séparé
3. ✅ Les variables d'environnement utilisent les références Railway (`${{Postgres.PGHOST}}`, etc.)
4. ✅ Le `railway.json` est correctement configuré avec `startCommand`

## 📋 Checklist de vérification

Avant de déployer, vérifiez que :

- [ ] Le service **Backend** est configuré avec `Builder: DOCKERFILE`
- [ ] Le service **PostgreSQL** est créé et visible dans Railway Dashboard
- [ ] Les variables d'environnement du backend utilisent les références Railway (`${{Postgres.*}}`)
- [ ] Le fichier `railway.json` contient `startCommand: "node dist/main.js"`
- [ ] Le `Dockerfile` est à la racine du projet
- [ ] Le fichier `docker-compose.prod.yml` existe (pour référence, mais Railway utilisera directement le Dockerfile)

## 🐛 Dépannage

### Railway n'affiche qu'un seul service

- **Solution**: Ajoutez manuellement le service PostgreSQL via Railway Dashboard → "+ New" → "Database" → "PostgreSQL"

### Le backend ne peut pas se connecter à PostgreSQL

- **Vérifiez** que les variables d'environnement utilisent les références Railway :
  - ✅ `DB_HOST=${{Postgres.PGHOST}}`
  - ❌ `DB_HOST=postgres` (ne fonctionne pas dans Railway)
- **Vérifiez** le nom exact du service PostgreSQL dans Railway (sensible à la casse)

### Le build échoue

- **Vérifiez** que le `Dockerfile` est présent et correct
- **Vérifiez** que `railway.json` pointe vers le bon Dockerfile
- **Consultez** les logs de build dans Railway Dashboard

## 📚 Ressources

- [Documentation Railway - Multi-Service](https://docs.railway.app/guides/multi-service)
- [Documentation Railway - Variables d'environnement](https://docs.railway.app/develop/variables)
- [Documentation Railway - Docker](https://docs.railway.app/deploy/dockerfiles)
