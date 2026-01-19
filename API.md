# 📚 Documentation API

## Base URL

```
http://localhost:4000/api
```

## Authentification

La plupart des endpoints nécessitent une authentification JWT. Incluez le token dans le header :

```
Authorization: Bearer <token>
```

---

## 🔐 Auth

### POST /auth/register

Créer un nouveau compte utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+243900000000",
  "role": "agent"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "agent"
}
```

### POST /auth/login

Se connecter et obtenir un token JWT.

**Body:**
```json
{
  "email": "admin@unikin.cd",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@unikin.cd",
    "firstName": "Admin",
    "lastName": "UNIKIN",
    "role": "admin"
  }
}
```

### GET /auth/profile

Obtenir le profil de l'utilisateur connecté.

**Headers:** `Authorization: Bearer <token>`

---

## 📶 WiFi Accounts

### POST /wifi-accounts

Créer un nouveau compte Wi-Fi.

**Body:**
```json
{
  "duration": "24h",
  "bandwidthProfile": "2mbps",
  "maxDevices": 1,
  "comment": "Compte étudiant"
}
```

**Durées disponibles:** `24h`, `48h`, `7d`, `30d`, `unlimited`

**Profils de débit:** `1mbps`, `2mbps`, `5mbps`

**Response:**
```json
{
  "id": "uuid",
  "username": "etu9832",
  "password": "X9fP2",
  "duration": "24h",
  "bandwidthProfile": "2mbps",
  "expiresAt": "2024-01-02T12:00:00Z",
  "isActive": true
}
```

### GET /wifi-accounts

Lister tous les comptes Wi-Fi.

### GET /wifi-accounts/active

Lister les comptes actifs.

### GET /wifi-accounts/:id

Obtenir un compte spécifique.

### DELETE /wifi-accounts/:id

Supprimer un compte Wi-Fi (supprime aussi dans MikroTik).

---

## 💳 Payments

### POST /payments

Créer un paiement.

**Body:**
```json
{
  "amount": 1000,
  "method": "mobile_money",
  "phoneNumber": "+243900000000",
  "wifiAccountId": "uuid-optional"
}
```

**Méthodes:** `mobile_money`, `cash`, `card`

### POST /payments/:id/complete

Compléter un paiement (crée automatiquement un compte Wi-Fi si nécessaire).

**Body:**
```json
{
  "transactionId": "MTN123456"
}
```

### GET /payments

Lister tous les paiements.

### GET /payments/:id

Obtenir un paiement spécifique.

---

## 📊 Sessions

### GET /sessions

Lister toutes les sessions (Admin/Agent).

### GET /sessions/active

Lister les sessions actives.

### GET /sessions/statistics

Obtenir les statistiques des sessions.

### POST /sessions/sync

Synchroniser les sessions avec MikroTik (Admin).

### GET /sessions/wifi-account/:wifiAccountId

Obtenir les sessions d'un compte Wi-Fi.

---

## 📈 Dashboard

### GET /dashboard/stats

Obtenir les statistiques globales du dashboard.

**Response:**
```json
{
  "accounts": {
    "total": 150,
    "active": 45,
    "expired": 105
  },
  "payments": {
    "total": 200,
    "completed": 180,
    "revenue": 150000
  },
  "sessions": {
    "total": 500,
    "active": 30,
    "mikrotikActive": 28,
    "totalBytesTransferred": 1073741824
  },
  "users": {
    "total": 10
  }
}
```

### GET /dashboard/charts?days=7

Obtenir les données pour les graphiques (par défaut 7 jours).

---

## 🔧 MikroTik

### GET /mikrotik/status

Vérifier le statut de connexion MikroTik.

### GET /mikrotik/users

Lister tous les utilisateurs hotspot dans MikroTik.

### GET /mikrotik/active

Obtenir les utilisateurs actifs (connectés) dans MikroTik.

### DELETE /mikrotik/active/:sessionId

Déconnecter un utilisateur actif.

### POST /mikrotik/users/:username/disable

Désactiver un utilisateur.

### POST /mikrotik/users/:username/enable

Activer un utilisateur.

---

## 👥 Users

### GET /users

Lister tous les utilisateurs (Admin).

### GET /users/:id

Obtenir un utilisateur spécifique.

### POST /users

Créer un utilisateur.

### PUT /users/:id

Mettre à jour un utilisateur.

### DELETE /users/:id

Supprimer un utilisateur.

---

## 🔒 Rôles et Permissions

- **ADMIN**: Accès complet à toutes les fonctionnalités
- **AGENT**: Peut créer des comptes, voir les sessions et le dashboard
- **STUDENT**: Accès limité (si implémenté)

Les endpoints protégés par rôle utilisent le décorateur `@Roles()`.

