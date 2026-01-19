# 🚂 Déploiement Railway - LISEZ-MOI EN PREMIER

## ⚠️ IMPORTANT - Configuration Requise

Ce projet a **2 services séparés** dans des sous-dossiers:
- `backend/` - API NestJS
- `frontend/` - Application React

**Railway NE PEUT PAS builder automatiquement** car il n'y a pas de `package.json` à la racine.

## ✅ SOLUTION OBLIGATOIRE

Vous **DEVEZ** configurer le **Root Directory** dans Railway Dashboard pour chaque service.

### Pour le Service Backend:

1. Railway Dashboard → Service Backend → ⚙️ Settings → Build
2. **Root Directory**: `backend` ⚠️ **OBLIGATOIRE**
3. **Builder**: `DOCKERFILE`
4. **Dockerfile Path**: `Dockerfile.prod`

### Pour le Service Frontend:

1. Railway Dashboard → Service Frontend → ⚙️ Settings → Build
2. **Root Directory**: `frontend` ⚠️ **OBLIGATOIRE**
3. **Builder**: `DOCKERFILE`
4. **Dockerfile Path**: `Dockerfile.prod`

## 📚 Guides Détaillés

- **Guide rapide**: [RAILWAY_URGENT_FIX.md](./RAILWAY_URGENT_FIX.md)
- **Guide étape par étape**: [RAILWAY_STEP_BY_STEP.md](./RAILWAY_STEP_BY_STEP.md)
- **Guide complet**: [RAILWAY.md](./RAILWAY.md)
- **Dépannage**: [RAILWAY_TROUBLESHOOTING.md](./RAILWAY_TROUBLESHOOTING.md)

## 🚨 Erreur "Nixpacks was unable to generate a build plan"

Cette erreur signifie que:
- ❌ Le Root Directory n'est PAS configuré
- ❌ Railway essaie de builder à la racine `/`
- ❌ Il ne trouve pas de `package.json`

**Solution**: Configurez le Root Directory comme indiqué ci-dessus.

## ✅ Après Configuration

Une fois le Root Directory configuré, vous devriez voir dans les logs:

```
✅ Building with Dockerfile
✅ Root directory: backend
✅ Dockerfile: Dockerfile.prod
```

Au lieu de:

```
❌ Nixpacks was unable to generate a build plan
```

## 🔗 Liens Utiles

- [Documentation Railway](https://docs.railway.app)
- [Railway Dashboard](https://railway.app)
