# ⚙️ CONFIGURATION POST-INSTALLATION

Guide complet pour configurer l'application backend **après** l'installation physique et la configuration réseau MikroTik.

---

## 🎯 Vue d'ensemble

Après avoir :
- ✅ Installé Starlink
- ✅ Configuré le réseau MikroTik (voir [DEPLOIEMENT_TERRAIN.md](./DEPLOIEMENT_TERRAIN.md))
- ✅ Configuré les AP Cisco

Il faut maintenant configurer le **backend** pour qu'il communique correctement avec MikroTik.

---

## 📋 CHECKLIST PRÉ-CONFIGURATION

### 1. Vérifier la connexion réseau

Le serveur backend doit pouvoir accéder au MikroTik :

```bash
# Depuis le serveur backend, tester la connexion
ping 192.168.10.1

# Tester le port API MikroTik
telnet 192.168.10.1 8728
```

✅ Si ça fonctionne → réseau OK

---

## 🔧 ÉTAPE 1 : CONFIGURATION DES VARIABLES D'ENVIRONNEMENT

### Fichier `.env` (production)

```env
# ============================================
# BASE
# ============================================
NODE_ENV=production
PORT=4000

# ============================================
# BASE DE DONNÉES
# ============================================
# Utiliser les variables PG* si sur Railway
PGHOST=votre-host-postgres
PGPORT=5432
PGUSER=postgres
PGPASSWORD=votre-mot-de-passe
PGDATABASE=internet_access

# OU utiliser DB_* pour local/Docker
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=votre-mot-de-passe
DB_DATABASE=internet_access

# ============================================
# MIKROTIK (CRITIQUE)
# ============================================
MIKROTIK_HOST=192.168.10.1
MIKROTIK_PORT=8728
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=VOTRE_MOT_DE_PASSE_MIKROTIK

# ============================================
# JWT
# ============================================
JWT_SECRET=votre-secret-jwt-super-securise-changez-moi

# ============================================
# FRONTEND
# ============================================
FRONTEND_URL=https://votre-frontend.railway.app

# ============================================
# EMAIL (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM=noreply@unikin.cd
APP_NAME=Club Internet Access UNIKIN
```

⚠️ **IMPORTANT** : 
- `MIKROTIK_HOST` doit être l'IP du routeur MikroTik (généralement `192.168.10.1`)
- `MIKROTIK_PASSWORD` doit correspondre au mot de passe configuré dans MikroTik

---

## 🔧 ÉTAPE 2 : CRÉER LES PROFILS MIKROTIK (OBLIGATOIRE)

### ⚠️ PROBLÈME IDENTIFIÉ

Le backend utilise des **profils de bande passante** (`1mbps`, `2mbps`, `5mbps`) mais le script MikroTik crée des **profils de durée** (`1h`, `1j`, `7j`, `30j`).

**Solution** : Créer des profils qui combinent **bande passante + durée** dans MikroTik.

### Script MikroTik pour créer les profils

Exécutez ces commandes dans Winbox ou via SSH :

```mikrotik
# Profils de bande passante (sans limite de temps)
/ip/hotspot/user/profile add name=1mbps rate-limit=1M/1M
/ip/hotspot/user/profile add name=2mbps rate-limit=2M/2M
/ip/hotspot/user/profile add name=5mbps rate-limit=5M/5M

# Vérifier les profils créés
/ip/hotspot/user/profile print
```

✅ **Ces profils doivent exister dans MikroTik** pour que le backend fonctionne.

---

## 🔧 ÉTAPE 3 : CORRIGER LE MAPPING DURÉE → MIKROTIK

### Problème actuel

Le backend convertit les durées (`24h`, `48h`, `7d`, `30d`) en format MikroTik (`1h`, `1d`, `7d`, `30d`), mais utilise `limit-uptime` au lieu de profils de durée.

### Solution recommandée

Le backend utilise déjà `limit-uptime` correctement. Vérifiez que la conversion est correcte :

**Mapping actuel dans le code :**
- `24h` → `1h` (1 heure)
- `48h` → `1d` (1 jour) 
- `7d` → `7d` (7 jours)
- `30d` → `30d` (30 jours)
- `unlimited` → pas de limite

⚠️ **À vérifier** : Le mapping `24h → 1h` semble incorrect. Il devrait être `24h → 1d`.

---

## 🔧 ÉTAPE 4 : TESTER LA CONNEXION MIKROTIK

### Via l'API

```bash
# Tester le statut de connexion
curl -X GET http://localhost:4000/api/mikrotik/status \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

**Réponse attendue :**
```json
{
  "connected": true
}
```

### Via Swagger

1. Accéder à `http://localhost:4000/api`
2. Se connecter (`POST /auth/login`)
3. Tester `GET /mikrotik/status`

---

## 🔧 ÉTAPE 5 : CRÉER UN COMPTE DE TEST

### Via l'API

```bash
curl -X POST http://localhost:4000/api/wifi-accounts \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": "24h",
    "bandwidthProfile": "2mbps",
    "maxDevices": 1,
    "comment": "Compte de test"
  }'
```

### Vérifier dans MikroTik

```mikrotik
/ip/hotspot/user print
```

✅ Le compte doit apparaître avec le profil `2mbps` et `limit-uptime=1d` (ou `1h` selon le mapping).

---

## 🔧 ÉTAPE 6 : CONFIGURER LE PORTAIL EXTERNE

### 1. Walled Garden dans MikroTik

Autoriser l'accès au portail avant authentification :

```mikrotik
# Remplacer IP_DU_VPS par l'IP réelle de votre serveur
/ip hotspot walled-garden add dst-address=IP_DU_VPS protocol=tcp dst-port=443 action=allow
/ip hotspot walled-garden add dst-address=IP_DU_VPS protocol=tcp dst-port=80 action=allow
```

### 2. Redirection dans login.html

Modifier le fichier `Files → hotspot → login.html` dans MikroTik :

```html
<meta http-equiv="refresh" content="0; url=https://wifi.clubgei.org/captive?mac=$(mac)&ip=$(ip)&orig=$(link-orig-esc)">
```

Voir [scripts/mikrotik-login-redirect.html](./scripts/mikrotik-login-redirect.html) pour le fichier complet.

---

## 🔧 ÉTAPE 7 : CONFIGURER LE FLUX DE PAIEMENT

### Flux complet

1. **Client paie** (Mobile Money, cash, etc.)
2. **Backend reçoit** la confirmation de paiement
3. **Backend crée** automatiquement un compte Wi-Fi
4. **Backend crée** l'utilisateur dans MikroTik
5. **Client se connecte** au Wi-Fi
6. **Portail s'affiche** (redirection)
7. **Client entre** username/password
8. **Internet activé**

### Test du flux

```bash
# 1. Créer un paiement
curl -X POST http://localhost:4000/api/payments \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "method": "mobile_money",
    "phoneNumber": "+243900000000"
  }'

# 2. Compléter le paiement (crée automatiquement le compte Wi-Fi)
curl -X POST http://localhost:4000/api/payments/PAYMENT_ID/complete \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "MTN123456"
  }'
```

✅ Un compte Wi-Fi doit être créé automatiquement dans la base de données ET dans MikroTik.

---

## 🔧 ÉTAPE 8 : CONFIGURER LES TÂCHES PLANIFIÉES

### Expiration automatique des comptes

Le backend a un scheduler qui expire automatiquement les comptes. Vérifiez qu'il est actif :

```typescript
// Dans le code, il y a un @Cron qui expire les comptes
// Vérifier les logs pour confirmer qu'il s'exécute
```

### Synchronisation des sessions

Le backend synchronise les sessions actives avec MikroTik. Tester :

```bash
curl -X POST http://localhost:4000/api/sessions/sync \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

---

## 🚨 PROBLÈMES COURANTS & SOLUTIONS

### Problème 1 : "Not connected to MikroTik"

**Cause** : Connexion API MikroTik échouée

**Solutions** :
1. Vérifier `MIKROTIK_HOST` et `MIKROTIK_PASSWORD` dans `.env`
2. Vérifier que l'API est activée dans MikroTik : `/ip service print`
3. Vérifier le firewall : `/ip firewall filter print`
4. Tester la connexion depuis le serveur : `telnet MIKROTIK_HOST 8728`

### Problème 2 : "Profile not found"

**Cause** : Profil MikroTik inexistant

**Solution** : Créer les profils `1mbps`, `2mbps`, `5mbps` dans MikroTik (voir Étape 2)

### Problème 3 : Compte créé mais pas dans MikroTik

**Cause** : Erreur lors de la création dans MikroTik

**Solutions** :
1. Vérifier les logs du backend
2. Vérifier la connexion MikroTik
3. Vérifier que les profils existent
4. Vérifier les permissions de l'utilisateur API

### Problème 4 : Mapping durée incorrect

**Cause** : Le mapping `24h → 1h` est incorrect

**Solution** : Modifier `durationToMikrotikFormat()` dans `wifi-accounts.service.ts` :

```typescript
private durationToMikrotikFormat(duration: DurationType): string {
  switch (duration) {
    case DurationType.HOURS_24:
      return '1d'; // Corriger : 24h = 1 jour, pas 1 heure
    case DurationType.HOURS_48:
      return '2d'; // Corriger : 48h = 2 jours
    // ...
  }
}
```

---

## ✅ CHECKLIST FINALE

Avant de mettre en production :

- [ ] Variables d'environnement configurées
- [ ] Profils MikroTik créés (`1mbps`, `2mbps`, `5mbps`)
- [ ] Connexion MikroTik testée (`GET /mikrotik/status`)
- [ ] Création de compte testée (`POST /wifi-accounts`)
- [ ] Compte apparaît dans MikroTik (`/ip/hotspot/user print`)
- [ ] Walled Garden configuré (portail externe)
- [ ] Redirection login.html configurée
- [ ] Flux de paiement testé
- [ ] Synchronisation sessions testée
- [ ] Expiration automatique vérifiée

---

## 📚 DOCUMENTATION ASSOCIÉE

- [Guide de déploiement terrain](./DEPLOIEMENT_TERRAIN.md)
- [Scripts MikroTik](./scripts/README.md)
- [Documentation API](./API.md)
- [Guide d'installation](./INSTALLATION.md)

---

**Dernière mise à jour :** 2024-01-19
