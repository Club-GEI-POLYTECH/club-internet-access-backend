# 🎫 Système de Vente de Tickets Pré-générés

Ce document explique comment utiliser le système de vente de tickets pré-générés depuis Mikhmon.

## 🎯 Vue d'ensemble

Le système permet de :
- Importer des tickets pré-générés depuis Mikhmon (via CSV)
- Vendre des tickets aux clients
- Gérer les paiements et marquer automatiquement les tickets comme vendus
- Suivre les statistiques de vente

## 📋 Structure des Données

### Ticket

Un ticket représente un accès Wi-Fi pré-généré avec :
- **Username** : Nom d'utilisateur unique
- **Password** : Mot de passe (chiffré dans la DB)
- **Profile** : Profil MikroTik (TEST, BASIC, PREMIUM)
- **Time Limit** : Limite de temps (optionnel)
- **Data Limit** : Limite de données (optionnel)
- **Status** : `available`, `reserved`, `sold`, `expired`
- **Price** : Prix de vente en CDF

### TicketType

Un type de ticket définit les caractéristiques d'un forfait :
- **Name** : Nom du forfait (ex: "Forfait Basique")
- **Profile** : Profil MikroTik correspondant
- **Price** : Prix par défaut
- **Time Limit** / **Data Limit** : Limites du forfait

## 🚀 Endpoints API

### Endpoints Publics

#### GET `/api/tickets`
Liste tous les tickets (avec filtres optionnels).

**Query Parameters :**
- `status` (optionnel) : Filtrer par statut (`available`, `sold`, etc.)

**Réponse :**
```json
[
  {
    "id": "uuid",
    "username": "dzpv",
    "password": "***",
    "profile": "TEST",
    "status": "available",
    "price": 5000,
    "createdAt": "2026-01-27T22:52:37Z"
  }
]
```

#### GET `/api/tickets/available`
Liste uniquement les tickets disponibles à la vente.

#### GET `/api/tickets/types`
Liste tous les types de tickets avec leur nombre disponible.

**Réponse :**
```json
[
  {
    "id": "uuid",
    "name": "Forfait Basique",
    "profile": "BASIC",
    "price": 10000,
    "availableCount": 15
  }
]
```

#### GET `/api/tickets/type/:typeId`
Liste tous les tickets disponibles d'un type spécifique.

#### GET `/api/tickets/:id`
Récupère un ticket spécifique (mot de passe masqué).

#### POST `/api/tickets/purchase`
Achète un ticket (publique, pas besoin d'authentification).

**Body :**
```json
{
  "ticketId": "uuid",
  "phoneNumber": "+243900000000",
  "method": "mobile_money"
}
```

**Réponse :**
```json
{
  "ticket": {
    "id": "uuid",
    "username": "dzpv",
    "password": "***",
    "status": "reserved",
    "price": 5000
  },
  "payment": {
    "id": "payment-uuid",
    "amount": 5000,
    "status": "pending",
    "phoneNumber": "+243900000000"
  },
  "credentials": {
    "username": "dzpv",
    "password": "3552",
    "profile": "TEST",
    "instructions": "Connectez-vous au Wi-Fi 'Club Internet Access'..."
  }
}
```

#### POST `/api/tickets/:id/reserve`
Réserve un ticket temporairement.

#### POST `/api/tickets/:id/release`
Libère un ticket réservé.

### Endpoints Admin

#### POST `/api/tickets/admin/import`
Importe des tickets depuis un fichier CSV (authentification admin requise).

**Headers :**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body :**
- `file` : Fichier CSV
- `defaultPrice` (optionnel) : Prix par défaut

**Format CSV attendu :**
```csv
Username,Password,Profile,Time Limit,Data Limit,Comment
dzpv,3552,TEST,,,2026-01-27 22:52:37
user2,pass2,BASIC,24h,1GB,2026-01-27 22:52:37
```

**Réponse :**
```json
{
  "imported": 10,
  "failed": 0,
  "errors": []
}
```

#### GET `/api/tickets/admin/stats`
Statistiques sur les tickets (authentification admin requise).

**Réponse :**
```json
{
  "total": 100,
  "available": 50,
  "sold": 45,
  "reserved": 5,
  "revenue": 225000
}
```

#### PUT `/api/tickets/admin/:id/price`
Modifie le prix d'un ticket (authentification admin requise).

**Body :**
```json
{
  "price": 6000
}
```

#### DELETE `/api/tickets/admin/:id`
Supprime un ticket (authentification admin requise).

### Webhook

#### POST `/api/tickets/webhook/payment`
Webhook pour les mises à jour de paiement (appelé automatiquement par le système de paiement).

**Body :**
```json
{
  "paymentId": "uuid",
  "status": "completed",
  "transactionId": "MTN123456"
}
```

## 💰 Flow de Paiement

1. **Client achète un ticket** (`POST /api/tickets/purchase`)
   - Ticket passe de `available` à `reserved`
   - Un paiement est créé avec `status: 'pending'`
   - Les credentials sont retournés (mais le ticket reste réservé)

2. **Paiement complété** (via webhook Mobile Money)
   - Le webhook appelle `POST /api/tickets/webhook/payment`
   - Le paiement passe à `status: 'completed'`
   - Le ticket passe à `status: 'sold'`
   - `soldAt` et `soldTo` sont mis à jour

3. **Si le paiement échoue**
   - Le paiement passe à `status: 'failed'`
   - Le ticket redevient `available`
   - Le `paymentId` est retiré du ticket

## 📥 Import CSV depuis Mikhmon

### Format CSV

Le fichier CSV doit avoir les colonnes suivantes :
- `Username` : Nom d'utilisateur unique
- `Password` : Mot de passe
- `Profile` : Profil MikroTik (TEST, BASIC, PREMIUM)
- `Time Limit` : Limite de temps (vide = illimité, ou "1d", "24h")
- `Data Limit` : Limite de données (vide = illimité, ou "1GB", "500MB")
- `Comment` : Timestamp de création depuis Mikhmon (optionnel)

### Exemple

```csv
Username,Password,Profile,Time Limit,Data Limit,Comment
dzpv,3552,TEST,,,2026-01-27 22:52:37
user2,pass2,BASIC,24h,1GB,2026-01-27 22:52:37
user3,pass3,PREMIUM,7d,5GB,2026-01-27 22:52:37
```

### Prix par Défaut

Si aucun type de ticket ne correspond au profil, les prix par défaut sont :
- `TEST` : 5000 CDF
- `BASIC` : 10000 CDF
- `PREMIUM` : 20000 CDF

## 🔐 Sécurité

### Chiffrement des Mots de Passe

Les mots de passe des tickets sont chiffrés dans la base de données avec AES-256-CBC.

**Variable d'environnement :**
```env
TICKET_ENCRYPTION_KEY=your-secret-key-32-chars-minimum!!
```

⚠️ **Important** : Changez cette clé en production et gardez-la secrète !

### Masquage des Mots de Passe

- Les mots de passe sont masqués (`***`) dans toutes les réponses API sauf après achat réussi
- Le mot de passe n'est exposé que dans la réponse de `POST /api/tickets/purchase` après réservation

## 🧪 Tests

### Tester l'import CSV

```bash
curl -X POST http://localhost:4000/api/tickets/admin/import \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@tickets.csv" \
  -F "defaultPrice=5000"
```

### Tester l'achat d'un ticket

```bash
curl -X POST http://localhost:4000/api/tickets/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "uuid-du-ticket",
    "phoneNumber": "+243900000000",
    "method": "mobile_money"
  }'
```

### Tester le webhook de paiement

```bash
curl -X POST http://localhost:4000/api/tickets/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "uuid-du-paiement",
    "status": "completed",
    "transactionId": "MTN123456"
  }'
```

## 📝 Notes Importantes

1. **Pas de création MikroTik** : Les tickets sont déjà créés dans Mikhmon, donc pas besoin de créer des utilisateurs MikroTik depuis le backend.

2. **Réservation temporaire** : Les tickets sont réservés pendant le processus de paiement pour éviter les conflits.

3. **Expiration** : Si un ticket a une `timeLimit`, vérifiez périodiquement et marquez comme `expired` si nécessaire (à implémenter via scheduler).

4. **Logs** : Toutes les transactions de vente sont loggées pour audit.

## 🔗 Intégration avec le Frontend

Voir `INTEGRATION_FRONTEND.md` pour les détails d'intégration avec Next.js.

Les endpoints de tickets sont accessibles publiquement (sauf les endpoints admin), donc le frontend peut :
- Lister les tickets disponibles
- Afficher les types de tickets
- Permettre l'achat de tickets
- Afficher les credentials après achat
