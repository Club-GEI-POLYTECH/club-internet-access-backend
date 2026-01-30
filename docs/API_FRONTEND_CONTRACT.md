# Contrat API Backend ↔ Frontend

Ce document décrit les endpoints utilisés par le frontend Next.js (home, buy-ticket, dashboard par rôle, admin/tickets) et les formats de réponse attendus.

---

## 1. Public (sans authentification)

### Page `/home` – Types de tickets

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/api/tickets/types` | Liste des types de tickets avec `availableCount` |

**Réponse :** tableau d’objets  
`{ id, name, profile, description, timeLimit, dataLimit, price, isActive, availableCount, createdAt, updatedAt }`

**Détail d’un type (optionnel) :**

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/api/tickets/types/:id` | Un type de ticket avec `availableCount` |

---

### Page `/buy-ticket` – Achat de ticket

**Étape 1 – Liste des tickets disponibles (optionnel par type) :**

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/api/tickets/available` | Tous les tickets disponibles |
| GET | `/api/tickets/type/:typeId` | Tickets disponibles d’un type donné |

**Réponse :** tableau de tickets (sans mot de passe, `password: '***'`).

**Étape 2 – Achat :**

| Méthode | URL | Description |
|--------|-----|-------------|
| POST | `/api/tickets/purchase` | Achète un ticket (publique) |

**Body :**  
`{ ticketId: string, phoneNumber: string, method: 'mobile_money' }`

**Réponse :**  
```json
{
  "ticket": { "id", "username", "password": "***", "profile", "status": "reserved", "price" },
  "payment": { "id", "amount", "method", "status": "pending", "phoneNumber", "createdAt" },
  "credentials": {
    "username": "xxx",
    "password": "yyy",
    "profile": "TEST",
    "instructions": "Connectez-vous au Wi-Fi 'Club Internet Access'..."
  }
}
```

Le frontend affiche `credentials` (username, password, instructions) après achat.

---

## 2. Authentification

| Méthode | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/register` | Inscription (rôle student) |
| GET | `/api/auth/profile` | Profil utilisateur connecté (JWT requis) |
| POST | `/api/auth/forgot-password` | Mot de passe oublié |
| POST | `/api/auth/reset-password` | Réinitialisation mot de passe |

**Login body :** `{ email, password }`  
**Login response :** `{ access_token, user: { id, email, firstName, lastName, role } }`

**Profile response :**  
`{ id, email, firstName, lastName, phone, role, isActive, createdAt, updatedAt }`

---

## 3. Dashboard par rôle

### Tous les utilisateurs connectés (Admin, Agent, Étudiant)

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/api/dashboard/my-stats` | Mes statistiques (JWT requis) |

**Réponse :**  
`{ wifiAccountsCount: number, paymentsCount: number }`  
Utilisable pour afficher « X connexions, Y paiements » sur le dashboard étudiant/agent.

### Admin / Agent uniquement

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/api/dashboard/stats` | Statistiques globales (comptes, paiements, sessions, users, tickets) |
| GET | `/api/dashboard/charts?days=7` | Données pour graphiques (accounts, payments, sessions) |

**Stats response :**  
`accounts: { total, active, expired }`,  
`payments: { total, completed, pending, failed, revenue }`,  
`sessions: { total, active, mikrotikActive, totalBytesTransferred }`,  
`users: { total, active }`,  
`tickets: { total, available, sold, revenue }`,  
`recent: { accounts, payments }`

---

## 4. Comptes Wi‑Fi et paiements (filtrés par rôle)

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/api/wifi-accounts` | Liste des comptes (étudiant = les siens, agent/admin = tous) |
| GET | `/api/wifi-accounts/active` | Comptes actifs (même filtrage) |
| GET | `/api/payments` | Liste des paiements (étudiant = les siens, agent/admin = tous) |

Tous ces endpoints nécessitent un JWT. Le backend filtre selon `role` et `userId`.

---

## 5. Admin – Import tickets (page `/admin/tickets`)

| Méthode | URL | Description |
|--------|-----|-------------|
| POST | `/api/tickets/admin/import` | Import CSV (Admin, JWT + Bearer) |

**Content-Type :** `multipart/form-data`  
**Body :** champ `file` = fichier CSV (Mikhmon), optionnel `defaultPrice` (number).

**Format CSV attendu :**  
`Username,Password,Profile,Time Limit,Data Limit,Comment`

**Réponse :**  
`{ imported: number, failed: number, errors: string[] }`

**Autres endpoints admin tickets :**

| Méthode | URL | Description |
|--------|-----|-------------|
| GET | `/api/tickets/admin/stats` | Stats tickets (total, available, sold, reserved, revenue) |
| PUT | `/api/tickets/admin/:id/price` | Modifier le prix (body: `{ price }`) |
| DELETE | `/api/tickets/admin/:id` | Supprimer un ticket |

---

## 6. Webhook paiement (backend / passerelle)

| Méthode | URL | Description |
|--------|-----|-------------|
| POST | `/api/tickets/webhook/payment` | Mise à jour statut paiement (marquer ticket vendu / libéré) |

**Body :** `{ paymentId: string, status: 'completed' | 'failed', transactionId?: string }`

---

## 7. Résumé des URLs par page frontend

| Page frontend | Endpoints backend |
|---------------|-------------------|
| `/home` | GET `/api/tickets/types` |
| `/buy-ticket` | GET `/api/tickets/available` ou GET `/api/tickets/type/:typeId`, puis POST `/api/tickets/purchase` |
| `/login` | POST `/api/auth/login` |
| `/dashboard` (étudiant) | GET `/api/auth/profile`, GET `/api/dashboard/my-stats`, GET `/api/wifi-accounts`, GET `/api/payments` |
| `/dashboard` (agent/admin) | Idem + GET `/api/dashboard/stats`, GET `/api/dashboard/charts` |
| `/admin/tickets` | GET `/api/tickets/admin/stats`, POST `/api/tickets/admin/import`, GET `/api/tickets` (liste), etc. |

---

## 8. CORS

Le backend autorise en production notamment :  
- `https://wifi.clubgei-polytech.org`  
- `http://localhost:3000`  
- En production sur Railway : origines `*.railway.app` / `*.up.railway.app`

Variable d’environnement : `FRONTEND_URL` (liste séparée par des virgules si plusieurs origines).
