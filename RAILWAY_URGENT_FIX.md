# 🚨 SOLUTION URGENTE - Erreur Nixpacks

## ⚠️ Le problème persiste car Railway n'a pas le Root Directory configuré

Railway essaie toujours de builder à la **racine** au lieu du dossier `backend/` ou `frontend/`.

## ✅ SOLUTION EN 3 ÉTAPES

### ÉTAPE 1: Aller dans Railway Dashboard

1. Ouvrez https://railway.app
2. Sélectionnez votre projet
3. Cliquez sur le **service Backend** (ou créez-le si nécessaire)

### ÉTAPE 2: Configurer le Root Directory (CRITIQUE)

1. Cliquez sur **Settings** (⚙️ en haut à droite)
2. Faites défiler jusqu'à **"Build"**
3. Trouvez **"Root Directory"**
4. **ÉCRIVEZ**: `backend` (sans slash, juste "backend")
5. **SAUVEZ** (bouton Save en bas)

### ÉTAPE 3: Changer le Builder

1. Dans la même section **Build**
2. Trouvez **"Builder"** ou **"Build Method"**
3. Sélectionnez **"DOCKERFILE"** (pas NIXPACKS)
4. Si demandé, **Dockerfile Path**: `Dockerfile.prod`
5. **SAUVEZ**

### RÉPÉTER POUR LE FRONTEND

Faites exactement la même chose pour le service **Frontend** :
- Root Directory: `frontend`
- Builder: `DOCKERFILE`
- Dockerfile Path: `Dockerfile.prod`

## 📸 Où trouver ces options

```
Railway Dashboard
  └── Votre Projet
      └── Service Backend
          └── Settings (⚙️)
              └── Build
                  ├── Root Directory: [backend] ← ICI
                  ├── Builder: [DOCKERFILE] ← ICI
                  └── Dockerfile Path: [Dockerfile.prod] ← ICI
```

## ⚡ Alternative: Via Railway CLI

Si vous préférez la ligne de commande :

```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Lier le projet
railway link

# Pour le backend
cd backend
railway service
railway variables set RAILWAY_ROOT_DIRECTORY=backend
railway variables set RAILWAY_BUILDER=DOCKERFILE
railway variables set RAILWAY_DOCKERFILE_PATH=Dockerfile.prod

# Pour le frontend (dans un autre terminal)
cd frontend
railway service
railway variables set RAILWAY_ROOT_DIRECTORY=frontend
railway variables set RAILWAY_BUILDER=DOCKERFILE
railway variables set RAILWAY_DOCKERFILE_PATH=Dockerfile.prod
```

## 🔍 Vérification

Après configuration, vous devriez voir dans les logs de build :

```
✅ Using Dockerfile: Dockerfile.prod
✅ Building from: backend/ (ou frontend/)
```

Au lieu de :

```
❌ Nixpacks was unable to generate a build plan
```

## 🆘 Si ça ne fonctionne toujours pas

1. **Supprimez le service** dans Railway
2. **Recréez-le** en spécifiant immédiatement :
   - Root Directory: `backend` (ou `frontend`)
   - Builder: `DOCKERFILE`
3. **Redéployez**

## 📝 Note importante

Le fichier `railway.json` à la racine ne suffit pas. Vous **DEVEZ** configurer le Root Directory dans Railway Dashboard pour chaque service.
