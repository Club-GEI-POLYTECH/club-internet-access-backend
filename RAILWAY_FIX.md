# 🔧 Solution Rapide: Erreur Nixpacks sur Railway

## ❌ Problème

```
Nixpacks was unable to generate a build plan for this app.
```

## ✅ Solution

Le problème vient du fait que Railway essaie de builder à la racine, mais vos services sont dans `backend/` et `frontend/`.

### Étape 1: Configurer le Backend

1. Dans Railway Dashboard, allez dans votre **service Backend**
2. Cliquez sur **Settings** → **Build**
3. Configurez :
   - **Root Directory**: `backend` ⚠️ **OBLIGATOIRE**
   - **Builder**: `DOCKERFILE`
   - **Dockerfile Path**: `Dockerfile.prod`
   - **Start Command**: (laissé vide)

### Étape 2: Configurer le Frontend

1. Dans Railway Dashboard, allez dans votre **service Frontend**
2. Cliquez sur **Settings** → **Build**
3. Configurez :
   - **Root Directory**: `frontend` ⚠️ **OBLIGATOIRE**
   - **Builder**: `DOCKERFILE`
   - **Dockerfile Path**: `Dockerfile.prod`
   - **Start Command**: (laissé vide)

### Étape 3: Redéployer

1. Cliquez sur **Deploy** ou faites un nouveau commit
2. Le build devrait maintenant fonctionner

## 📸 Capture d'écran de la Configuration

```
┌─────────────────────────────────────┐
│ Settings → Build                     │
├─────────────────────────────────────┤
│ Root Directory: backend              │
│ Builder: DOCKERFILE                  │
│ Dockerfile Path: Dockerfile.prod     │
│ Start Command: (vide)                │
└─────────────────────────────────────┘
```

## 🔍 Vérification

Après configuration, vérifiez que :

- ✅ Root Directory est défini (pas vide)
- ✅ Builder est DOCKERFILE
- ✅ Dockerfile Path pointe vers `Dockerfile.prod`
- ✅ Les deux services (backend et frontend) sont configurés

## 📚 Documentation Complète

Voir [RAILWAY_TROUBLESHOOTING.md](./RAILWAY_TROUBLESHOOTING.md) pour plus de détails.
