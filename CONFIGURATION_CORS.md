# 🌐 Configuration CORS - URL du Frontend

Guide pour configurer l'URL du frontend pour CORS.

---

## 📍 Où configurer `FRONTEND_URL`

La variable `FRONTEND_URL` doit être configurée dans **les variables d'environnement** selon votre environnement de déploiement.

---

## 🔧 DÉVELOPPEMENT LOCAL

### Fichier `.env` à la racine du projet

Créez un fichier `.env` (ou modifiez-le) :

```env
FRONTEND_URL=http://localhost:3000
```

**Note :** Par défaut, si `FRONTEND_URL` n'est pas défini, le backend accepte `http://localhost:3000`.

---

## 🐳 DOCKER (docker-compose)

### Fichier `.env` ou variables dans `docker-compose.yml`

**Option 1 : Fichier `.env` (recommandé)**

Créez un fichier `.env` à la racine :

```env
FRONTEND_URL=http://localhost:3000
```

Le `docker-compose.yml` utilise automatiquement cette variable :

```yaml
environment:
  FRONTEND_URL: ${FRONTEND_URL}
```

**Option 2 : Directement dans docker-compose.yml**

```yaml
services:
  backend:
    environment:
      FRONTEND_URL: http://localhost:3000
```

---

## 🚂 RAILWAY

### Railway Dashboard → Variables d'environnement

1. Allez dans **Railway Dashboard**
2. Sélectionnez votre **service Backend**
3. Allez dans l'onglet **Variables**
4. Cliquez sur **New Variable**
5. Ajoutez :

```env
FRONTEND_URL=https://votre-frontend.railway.app
```

**Si vous avez plusieurs URLs** (dev + prod), séparez-les par des virgules :

```env
FRONTEND_URL=http://localhost:3000,https://votre-frontend.railway.app
```

---

## ☁️ RENDER.COM

### Render Dashboard → Environment Variables

1. Allez dans **Render Dashboard**
2. Sélectionnez votre **service Backend**
3. Allez dans **Environment**
4. Ajoutez la variable :

```env
FRONTEND_URL=https://votre-frontend.onrender.com
```

**Ou dans `render.yaml` :**

```yaml
services:
  - type: web
    name: internet-access-backend-prod
    envVars:
      - key: FRONTEND_URL
        sync: false  # Vous devez la définir manuellement dans Render Dashboard
```

---

## 🔍 VÉRIFICATION

### Comment vérifier que CORS fonctionne

**1. Tester depuis le frontend Next.js :**

```typescript
// Dans votre frontend Next.js
const response = await fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});
```

**Si CORS est mal configuré, vous verrez :**
```
Access to fetch at 'http://localhost:4000/api/auth/login' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**2. Vérifier les logs du backend :**

Au démarrage, le backend affiche les origines autorisées (en développement) :

```
🚀 Application is running on: http://localhost:4000
```

**3. Tester avec curl :**

```bash
# Tester une requête avec l'origine
curl -X GET http://localhost:4000/api/health \
  -H "Origin: http://localhost:3000" \
  -v
```

Vous devriez voir dans les headers de réponse :
```
Access-Control-Allow-Origin: http://localhost:3000
```

---

## 📝 EXEMPLES PAR ENVIRONNEMENT

### Développement local

```env
# .env
FRONTEND_URL=http://localhost:3000
```

### Production Railway

```env
# Railway Dashboard → Variables
FRONTEND_URL=https://votre-frontend.railway.app
```

### Production avec plusieurs URLs

```env
# Railway Dashboard → Variables
FRONTEND_URL=http://localhost:3000,https://votre-frontend.railway.app,https://www.votre-domaine.com
```

**Note :** Les URLs sont séparées par des **virgules** et peuvent inclure plusieurs environnements.

---

## 🚨 PROBLÈMES COURANTS

### Problème 1 : Erreur CORS en développement

**Symptôme :**
```
Access to fetch ... has been blocked by CORS policy
```

**Solution :**
1. Vérifier que `FRONTEND_URL=http://localhost:3000` est dans votre `.env`
2. Redémarrer le backend après modification du `.env`
3. Vérifier que le port du frontend correspond (3000 par défaut pour Next.js)

### Problème 2 : CORS fonctionne en local mais pas en production

**Cause :** URL différente en production

**Solution :**
1. Vérifier l'URL exacte du frontend en production
2. Ajouter cette URL dans `FRONTEND_URL` sur Railway/Render
3. S'assurer que c'est bien `https://` (pas `http://`)

### Problème 3 : Plusieurs frontends (dev, staging, prod)

**Solution :** Séparer les URLs par des virgules :

```env
FRONTEND_URL=http://localhost:3000,https://staging.votre-app.com,https://votre-app.com
```

---

## ✅ CHECKLIST

- [ ] Variable `FRONTEND_URL` définie dans `.env` (local)
- [ ] Variable `FRONTEND_URL` définie dans Railway/Render (production)
- [ ] URL correspond exactement à celle du frontend (avec `https://` en prod)
- [ ] Backend redémarré après modification
- [ ] Test de requête depuis le frontend réussi
- [ ] Pas d'erreur CORS dans la console du navigateur

---

## 📚 CODE SOURCE

La configuration CORS se trouve dans `src/main.ts` :

```typescript
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];
```

Le backend accepte automatiquement :
- Les URLs définies dans `FRONTEND_URL`
- `http://localhost:3000` par défaut si `FRONTEND_URL` n'est pas défini
- Les requêtes sans origine (mobile apps, Postman, etc.)

---

**Dernière mise à jour :** 2024-01-19
