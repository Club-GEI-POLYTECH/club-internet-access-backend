# 🎯 Guide Étape par Étape - Configuration Railway

## ⚠️ PROBLÈME ACTUEL

Railway essaie de builder à la **racine** (`/`) au lieu de `backend/` ou `frontend/`.

## ✅ SOLUTION - Suivez ces étapes EXACTEMENT

### ÉTAPE 1: Accéder au Service Backend

1. Allez sur https://railway.app
2. Connectez-vous
3. Cliquez sur votre **projet**
4. Cliquez sur le **service "backend"** (ou créez-le si nécessaire)

### ÉTAPE 2: Ouvrir les Settings

1. En haut à droite, cliquez sur l'icône **⚙️ Settings**
2. Dans le menu de gauche, cliquez sur **"Build"**

### ÉTAPE 3: Configurer le Root Directory (LE PLUS IMPORTANT)

1. Faites défiler jusqu'à trouver **"Root Directory"**
2. Dans le champ texte, **ÉCRIVEZ EXACTEMENT**: `backend`
   - Pas de slash: `backend` ✅ (pas `/backend` ❌)
   - Pas de point: `backend` ✅ (pas `./backend` ❌)
   - Juste: `backend` ✅

### ÉTAPE 4: Changer le Builder

1. Trouvez **"Builder"** ou **"Build Method"**
2. Sélectionnez **"DOCKERFILE"** dans le menu déroulant
   - PAS "NIXPACKS"
   - PAS "AUTO"
   - Juste **"DOCKERFILE"**

### ÉTAPE 5: Configurer le Dockerfile Path

1. Si un champ **"Dockerfile Path"** apparaît, écrivez: `Dockerfile.prod`
2. Si ce champ n'existe pas, c'est OK (Railway le trouvera automatiquement)

### ÉTAPE 6: Sauvegarder

1. Cliquez sur le bouton **"Save"** ou **"Update"** en bas de la page
2. Attendez la confirmation

### ÉTAPE 7: Répéter pour le Frontend

Faites **EXACTEMENT** la même chose pour le service **Frontend**:
- Root Directory: `frontend`
- Builder: `DOCKERFILE`
- Dockerfile Path: `Dockerfile.prod`

### ÉTAPE 8: Redéployer

1. Retournez à la page principale du service
2. Cliquez sur **"Deploy"** ou faites un nouveau commit
3. Le build devrait maintenant fonctionner

## 📋 Checklist de Vérification

Avant de redéployer, vérifiez que:

- [ ] Root Directory = `backend` (pour le service backend)
- [ ] Root Directory = `frontend` (pour le service frontend)
- [ ] Builder = `DOCKERFILE` (pour les deux services)
- [ ] Dockerfile Path = `Dockerfile.prod` (si le champ existe)
- [ ] Les changements sont sauvegardés

## 🔍 Comment Vérifier que c'est Configuré

Après configuration, dans les logs de build, vous devriez voir:

```
✅ Building with Dockerfile
✅ Root directory: backend
✅ Dockerfile: Dockerfile.prod
```

Au lieu de:

```
❌ Nixpacks was unable to generate a build plan
```

## 🆘 Si ça ne fonctionne toujours pas

### Option A: Supprimer et Recréer le Service

1. Dans Railway Dashboard, supprimez le service
2. Créez un nouveau service
3. **IMMÉDIATEMENT** après création, configurez le Root Directory AVANT le premier build
4. Configurez Builder = DOCKERFILE
5. Redéployez

### Option B: Utiliser Railway CLI

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

# Pour le frontend
cd ../frontend
railway service
railway variables set RAILWAY_ROOT_DIRECTORY=frontend
railway variables set RAILWAY_BUILDER=DOCKERFILE
```

## 📸 Structure Attendue dans Railway

```
Votre Projet Railway
├── Service: backend
│   ├── Settings → Build
│   │   ├── Root Directory: backend ✅
│   │   ├── Builder: DOCKERFILE ✅
│   │   └── Dockerfile Path: Dockerfile.prod ✅
│   └── Variables (pour les env vars)
│
├── Service: frontend
│   ├── Settings → Build
│   │   ├── Root Directory: frontend ✅
│   │   ├── Builder: DOCKERFILE ✅
│   │   └── Dockerfile Path: Dockerfile.prod ✅
│   └── Variables (pour VITE_API_URL)
│
└── Service: postgres (base de données)
```

## 💡 Pourquoi c'est Important

Sans Root Directory configuré:
- Railway cherche `package.json` à la racine `/`
- Il ne trouve rien
- Nixpacks échoue
- Build échoue ❌

Avec Root Directory = `backend`:
- Railway cherche `package.json` dans `/backend`
- Il trouve le fichier ✅
- Dockerfile est utilisé ✅
- Build réussit ✅

## 📞 Support

Si après avoir suivi toutes ces étapes le problème persiste:
1. Vérifiez les logs de build dans Railway
2. Partagez les logs d'erreur
3. Vérifiez que les fichiers `Dockerfile.prod` existent dans `backend/` et `frontend/`
