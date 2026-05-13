# Documentation des API — Club Internet Access (backend)

Toutes les routes sont servies sous le **préfixe global** `/api` (ex. `http://localhost:4000/api/...` selon `PORT` dans `.env`).

## Swagger (OpenAPI interactif)

- **URL** : `{origin}/api` (même chemin que la doc Swagger UI ; les endpoints REST sont sous `/api/...`).
- **Authentification** : bouton **Authorize** → schéma **JWT** (Bearer) → coller le token reçu après `POST /api/auth/login`.

## Authentification

| Méthode | En-tête |
|--------|---------|
| JWT | `Authorization: Bearer <access_token>` |

Les routes marquées « JWT » exigent un token valide. Les rôles `admin` / `agent` / `student` restreignent certaines actions (guards Nest).

## Règles métier importantes

### Prix des tickets

- Il **n’y a pas** de colonne `price` sur la table **`tickets`**.
- Le prix catalogue (CDF) est sur **`ticket_types.price`** (types durée **24h / 7j / 30j**).
- Côté client, utiliser **`ticket.ticketType.price`** pour afficher le montant et pour **`POST /api/payments/initiate`** (`amount` doit être strictement égal à ce prix).
- Pour modifier un prix, mettre à jour l’enregistrement correspondant dans **`ticket_types`** (pas d’endpoint dédié « prix par ticket »).

### Import CSV

- Colonnes attendues : **Username, Password, Profile, Time Limit, Data Limit, Comment**.
- Les tickets sont rattachés à un type selon **Time Limit** (24h / 7j / 30j) ; le prix appliqué est celui du type (variables `TICKET_PRICE_*` à l’import / seed des types).

---

## Référence des routes

### App

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api` | Non | Message d’accueil |
| GET | `/api/health` | Non | Health check |

### Auth

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| POST | `/api/auth/register/request` | Non | Inscription étape 1 : email + mot de passe + identité → envoi d’un **code 6 chiffres** (SMTP requis) |
| POST | `/api/auth/register/verify` | Non | Inscription étape 2 : email + code → création du compte **étudiant** + `access_token` + `user` |
| POST | `/api/auth/register/resend` | Non | Renvoyer un code (demande non expirée) |
| POST | `/api/auth/login` | Non | Connexion → `access_token` + `user` |
| GET | `/api/auth/profile` | JWT | Profil utilisateur connecté |
| POST | `/api/auth/forgot-password` | Non | Demande réinitialisation (si configuré) |
| POST | `/api/auth/reset-password` | Non | Réinitialisation mot de passe |

### Users (admin / selon politique)

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/users` | JWT | Liste utilisateurs |
| GET | `/api/users/:id` | JWT | Détail utilisateur |
| POST | `/api/users` | JWT | Création utilisateur |
| PUT | `/api/users/:id` | JWT | Mise à jour |
| DELETE | `/api/users/:id` | JWT | Suppression |

### Tickets (catalogue & achat)

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/tickets` | Non | Liste tickets (filtre `?status=` optionnel) |
| GET | `/api/tickets/available` | Non | Tickets disponibles à la vente |
| GET | `/api/tickets/types` | Non | Types avec `availableCount` |
| GET | `/api/tickets/types/:id` | Non | Détail type + `availableCount` |
| GET | `/api/tickets/type/:typeId` | Non | Tickets disponibles pour un type |
| GET | `/api/tickets/:id` | Non | Détail ticket (`password` masqué) |
| POST | `/api/tickets/purchase` | JWT | Achat (ex. cash) — montant = `ticketType.price` |
| GET | `/api/tickets/me` | JWT | Tickets achetés par l’utilisateur |
| POST | `/api/tickets/:id/reserve` | Non | Réserver |
| POST | `/api/tickets/:id/release` | Non | Libérer réservation |
| POST | `/api/tickets/admin/import` | JWT **admin** | Import CSV (multipart `file`) |
| POST | `/api/tickets/admin/import/recommendations` | JWT **admin** | Prévisualisation types 24h/7j/30j avant import |
| GET | `/api/tickets/admin/stats` | JWT **admin** | Stats tickets |
| DELETE | `/api/tickets/admin/:id` | JWT **admin** | Supprimer un ticket |
| POST | `/api/tickets/webhook/payment` | Non | Webhook paiement (usage interne / intégration) |

### Tickets — chemin alternatif admin (`/api/admin/tickets`)

Même logique que les routes admin sous `/api/tickets/admin/*` :

| Méthode | Chemin | Auth |
|---------|--------|------|
| POST | `/api/admin/tickets/import` | JWT admin |
| GET | `/api/admin/tickets/stats` | JWT admin |
| DELETE | `/api/admin/tickets/:id` | JWT admin |

### Payments

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/payments` | JWT | Liste (étudiant : ses paiements seulement) |
| GET | `/api/payments/:id` | JWT | Détail |
| GET | `/api/payments/transaction/:transactionId` | JWT admin/agent | Recherche par ID transaction |
| POST | `/api/payments/:id/complete` | JWT admin/agent | Compléter un paiement |
| PUT | `/api/payments/:id/status` | JWT admin/agent | Changer le statut |

### Kelpay (Mobile Money)

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| POST | `/api/payments/initiate` | JWT | Initie KELPAY ; `amount` = `ticket.ticketType.price` ; envoie `callbackurl` (voir `.env`). Pas de `checktransaction` automatique : le client appelle `kelpay/verify` (et éventuellement `kelpay/confirm`, idempotent). Le ticket reste **`available`** mais est **exclu du catalogue** tant qu’un paiement Kelpay `pending`/`processing` existe sur la ligne ; **`kelpay/cancel`** libère la ligne (`cancelled`). Au succès (`kelpay/verify`, `kelpay/confirm` ou **callback**), ticket **`sold`**. |
| POST | `/api/payments/:paymentId/kelpay/verify` | JWT | `checktransaction` (Keccel : **code 0** = succès, **1** = échec ; `transactionstatus`). Échec → `failed` + libération ticket. **Succès → `success` + ticket vendu** ; `confirm` reste idempotent. |
| POST | `/api/payments/:paymentId/kelpay/confirm` | JWT | `checktransaction` + finalisation `success` / activation ticket (idempotent si déjà finalisé). |
| POST | `/api/payments/:paymentId/kelpay/cancel` | JWT | Abandon côté app : `pending`/`processing` → `cancelled` ; libère le ticket pour un nouvel achat (pas d’appel Kelpay). |
| POST | `/api/payments/callback` | Non | Webhook appelé par Kelpay ; corps JSON ou formulaire ; réponse **texte brut** `OK` |

Configurer une URL **HTTPS publique** vers `POST /api/payments/callback` : **`KELPAY_CALLBACK_URL`** (recommandé), ou **`PUBLIC_API_URL`** / **`KELPAY_CALLBACK_BASE_URL`** + **`KELPAY_CALLBACK_PATH`** (défaut `/api/payments/callback`), ou **`RAILWAY_PUBLIC_DOMAIN`**. En développement sans base publique, une URL locale est utilisée pour satisfaire l’API Kelpay (tunnel ngrok si besoin de recevoir le POST).

Après **`POST /payments/initiate`**, la réponse Kelpay avec `code: 0` signifie seulement « demande reçue » ; le statut final vient des appels **`checktransaction`** via **`kelpay/verify`** (doc : code 0/1 + `transactionstatus`) / **`kelpay/confirm`** (ou du **callback** HTTP Kelpay si configuré).

### Dashboard

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/dashboard/my-stats` | JWT | Stats perso (ex. nombre de paiements) |
| GET | `/api/dashboard/stats` | JWT | Stats globales (paiements, tickets, utilisateurs) |
| GET | `/api/dashboard/charts?days=` | JWT | Séries temporelles (défaut `days` : 7) |

Le **revenu tickets** agrège les prix des **`ticket_types`** pour les tickets vendus (`SUM` sur le type lié), cohérent avec l’absence de `price` sur `tickets`.

---

## Fichiers utiles côté frontend (copie)

- [frontend-types.ts](../frontend-types.ts)
- [frontend-api-client.ts](../frontend-api-client.ts)

## Voir aussi

- [LOGIQUE_IMPORT_ACHAT_DASHBOARD.md](./LOGIQUE_IMPORT_ACHAT_DASHBOARD.md) — flux import → vente → dashboard
- [FRONTEND_PAIEMENTS_KELPAY.md](./FRONTEND_PAIEMENTS_KELPAY.md) — intégration KELPAY
