# 🔧 Dépannage Railway

## Erreur: "Nixpacks was unable to generate a build plan"

### Problème

Railway essaie de builder à la racine du projet, mais les services (backend/frontend) sont dans des sous-dossiers.

### Solutions

#### Solution 1: Utiliser Dockerfile (Recommandé) ✅

Les fichiers `railway.json` sont déjà configurés pour utiliser Dockerfile au lieu de Nixpacks :

- **Backend**: Utilise `backend/Dockerfile.prod`
- **Frontend**: Utilise `frontend/Dockerfile.prod`

**Configuration dans Railway Dashboard:**

1. **Service Backend:**
   - Settings → Build → Builder: **DOCKERFILE**
   - Root Directory: `backend`
   - Dockerfile Path: `Dockerfile.prod`

2. **Service Frontend:**
   - Settings → Build → Builder: **DOCKERFILE**
   - Root Directory: `frontend`
   - Dockerfile Path: `Dockerfile.prod`

#### Solution 2: Utiliser Nixpacks avec Root Directory

Si vous préférez utiliser Nixpacks :

1. **Service Backend:**
   - Settings → Build → Builder: **NIXPACKS**
   - Root Directory: `backend`
   - Le fichier `backend/nixpacks.toml` sera utilisé automatiquement

2. **Service Frontend:**
   - Settings → Build → Builder: **NIXPACKS**
   - Root Directory: `frontend`
   - Le fichier `frontend/nixpacks.toml` sera utilisé automatiquement

#### Solution 3: Configuration via Railway CLI

```bash
# Backend
cd backend
railway service
railway variables set RAILWAY_BUILDER=DOCKERFILE
railway variables set RAILWAY_DOCKERFILE_PATH=Dockerfile.prod

# Frontend
cd frontend
railway service
railway variables set RAILWAY_BUILDER=DOCKERFILE
railway variables set RAILWAY_DOCKERFILE_PATH=Dockerfile.prod
```

## Configuration Correcte dans Railway

### Backend Service

```
Root Directory: backend
Builder: DOCKERFILE
Dockerfile Path: Dockerfile.prod
Start Command: (laissé vide, défini dans Dockerfile)
```

### Frontend Service

```
Root Directory: frontend
Builder: DOCKERFILE
Dockerfile Path: Dockerfile.prod
Start Command: (laissé vide, défini dans Dockerfile)
```

## Vérification

Après configuration, vérifiez que :

1. ✅ Le Root Directory est défini (backend ou frontend)
2. ✅ Le Builder est DOCKERFILE (ou NIXPACKS avec nixpacks.toml)
3. ✅ Le Dockerfile Path pointe vers le bon fichier
4. ✅ Les variables d'environnement sont configurées

## Erreurs Communes

### "No package.json found"

**Cause**: Root Directory non défini ou incorrect.

**Solution**: Définir Root Directory à `backend` ou `frontend` dans Railway Dashboard.

### "Dockerfile not found"

**Cause**: Dockerfile Path incorrect ou Root Directory mal configuré.

**Solution**: 
- Vérifier que Root Directory = `backend` ou `frontend`
- Vérifier que Dockerfile Path = `Dockerfile.prod` (relatif au Root Directory)

### "Build failed"

**Cause**: Variables d'environnement manquantes ou erreur dans le Dockerfile.

**Solution**:
- Vérifier les logs de build dans Railway Dashboard
- Vérifier que toutes les variables d'environnement sont définies
- Tester le build localement: `docker build -f backend/Dockerfile.prod ./backend`

## Test Local

Avant de déployer sur Railway, testez localement :

```bash
# Backend
cd backend
docker build -f Dockerfile.prod -t backend-test .
docker run -p 4000:4000 backend-test

# Frontend
cd frontend
docker build -f Dockerfile.prod -t frontend-test .
docker run -p 80:80 frontend-test
```
