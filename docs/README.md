# Club Internet Access — documentation backend

API **NestJS** : import CSV (Mikhmon), catalogue par durée (**24h / 7j / 30j**), vente (espèces ou **KELPAY**), dashboard, authentification.

## Sommaire

1. [Démarrage](#démarrage)
2. [Configuration](#configuration)
3. [Logique métier : import → vente → dashboard](#logique-métier--import--vente--dashboard)
4. [Référence des routes](#référence-des-routes)
5. [Inscription (flux frontend)](#inscription-flux-frontend) — détail vues / formulaires : **[FRONTEND_AUTH_FLUX.md](./FRONTEND_AUTH_FLUX.md)**
6. [Paiements KELPAY (intégration frontend)](#paiements-kelpay-intégration-frontend)
7. [Swagger, client TypeScript, déploiement](#swagger-client-typescript-déploiement)

Toutes les routes HTTP sont sous le préfixe **`/api`** (ex. `http://localhost:4000/api/...` selon `PORT`).

---

## Démarrage

```bash
npm install
cp .env.local.example .env
npm run seed:admin
npm run start:dev
```

Pour la production, utiliser **`.env.production.example`** comme base (secrets et URLs à renseigner sur l’hébergeur ou dans `.env` local de déploiement). Le seed **`npm run seed:admin`** crée les types de tickets puis un **compte admin** (par défaut `president@clubgei-polytech.org` ; surcharge via `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`).

- **Swagger (OpenAPI)** : `{origin}/api` — bouton **Authorize** → schéma **JWT** (Bearer) avec le token de `POST /api/auth/login`.
- **Référence détaillée des chemins** : sections ci-dessous ; la source interactive reste Swagger.

---

## Configuration

Modèles à la racine : **`.env.local.example`** (développement), **`.env.production.example`** (production). Copier le bon vers **`.env`** (non versionné). Résumé des zones :

| Zone | Variables (résumé) |
|------|---------------------|
| Base | `DATABASE_URL` (PostgreSQL) |
| Sécurité | `JWT_SECRET`, `TICKET_ENCRYPTION_KEY` (min. 32 caractères recommandé pour les tickets) |
| App | `PORT`, `NODE_ENV`, `FRONTEND_URL`, `APP_NAME` |
| Prix catalogue à l’import | `TICKET_PRICE_24H`, `TICKET_PRICE_7D`, `TICKET_PRICE_30D` (CDF) — le prix affiché / payé vient de **`ticket_types.price`** |
| Emails | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (recommandé) ou `RESEND_FROM` (alias), `REGISTRATION_*` |
| Seed | `ADMIN_SEED_*` (optionnel ; sinon admin par défaut `president@clubgei-polytech.org` au `npm run seed:admin`) |
| KELPAY | `KELPAY_MERCHANT_CODE`, `KELPAY_TOKEN`, `KELPAY_CALLBACK_URL` ou `PUBLIC_API_URL` / `RAILWAY_PUBLIC_DOMAIN`, etc. |

Les endpoints Keccel sont définis dans le code (`src/kelpay/kelpay.constants.ts`), pas dans `.env`.

**Emails (Resend)** : le service **`EmailService`** (`src/common/services/email.service.ts`) est fourni par **`CommonModule`** (`@Global()`). **`AuthService`** l’injecte pour l’inscription (code) et la réinitialisation mot de passe. Même schéma que sur l’app de référence : `sendEmail` privé + méthodes métier (`html` + `text`).

---

## Logique métier : import → vente → dashboard

### Import CSV (admin)

- **Route** : `POST /api/tickets/admin/import` (multipart `file`).
- **Service** : `TicketsService.importFromCSV()` — parse **Username, Password, Profile, Time Limit, Data Limit, Comment** ; ignore lignes invalides et doublons `username`.
- **Typologie** : pas selon le profil commercial, mais selon **Time Limit** — contient `30` → type 30j ; contient `7` → type 7j ; sinon → 24h.
- **Prix** : `TICKET_PRICE_*` ; recherche ou **création** automatique d’un enregistrement **`ticket_types`** (`name`, `profile`, `timeLimit`, `price`).
- **Table `tickets`** : mot de passe chiffré (AES, `TICKET_ENCRYPTION_KEY`), `status = available`, `ticketTypeId` lié — **pas de colonne `price` sur `tickets`** ; le prix catalogue est sur le type.

### Prévisualisation avant import

- **Route** : `POST /api/tickets/admin/import/recommendations` (JWT admin, multipart `file`).
- Retour : types détectés, volumes, prix recommandé, `use_existing` / `create_new`.

### Catalogue public

- `GET /api/tickets/available` — tickets `available` uniquement.
- `GET /api/tickets/types` — types avec **`availableCount`** par durée.

**KELPAY** : un ticket peut rester **`available`** en base mais être **exclu du catalogue** tant qu’un paiement Kelpay **`pending`/`processing`** existe sur cette ligne ; annulation via **`kelpay/cancel`**.

### Achat

| Flux | Route principale |
|------|------------------|
| Mobile Money | `POST /api/payments/initiate` puis `kelpay/verify`, `kelpay/confirm` (voir section KELPAY) ; callback `POST /api/payments/callback` |
| Espèces / autre | `POST /api/tickets/purchase` (ex. `method: "cash"`) |

Enchaînement typique : ticket **`available`** → **`reserved`** → paiement créé (`amount` = `ticket_types.price`) → ticket lié (`paymentId`) → après confirmation **`sold`** (`soldAt`, `soldTo`). En cas d’échec : retour **`available`**, `paymentId` vidé si applicable.

### Dashboard et revenu

- **`ticket_types.price`** : chaque ticket vendu compte pour le revenu via son type (jointure ticket / type), cohérent avec l’absence de `price` sur `tickets`.
- Routes utiles : `GET /api/dashboard/stats`, `GET /api/dashboard/charts?days=7`, `GET /api/dashboard/my-stats` (JWT).

---

## Référence des routes

### Authentification

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| POST | `/api/auth/register/request` | Non | Inscription étape 1 — code 6 chiffres (email requis) |
| POST | `/api/auth/register/verify` | Non | Inscription étape 2 — compte **student** + token |
| POST | `/api/auth/register/resend` | Non | Renvoyer le code |
| POST | `/api/auth/login` | Non | Connexion → `access_token` + `user` |
| GET | `/api/auth/profile` | JWT | Profil |
| POST | `/api/auth/forgot-password` | Non | Demande reset |
| POST | `/api/auth/reset-password` | Non | Reset mot de passe |

En-tête JWT : `Authorization: Bearer <access_token>`. Rôles `admin` / `agent` / `student` selon routes.

### Inscription (flux frontend)

Évite le **404 « ressource non trouvée »** côté client : c’est en général une **mauvaise URL** (sans `/api`, ou URL du front au lieu du backend), pas l’échec de l’email.

**Guide complet (vues, formulaires, inscription + mot de passe oublié)** : **[FRONTEND_AUTH_FLUX.md](./FRONTEND_AUTH_FLUX.md)**.

1. **URL de base** : toutes les routes sont sous **`/api`**. Exemple : `https://ton-backend.com/api` ou `http://localhost:4000/api`.  
   - Si ton front utilise `NEXT_PUBLIC_API_URL`, mets soit **`http://localhost:4000`**, soit **`http://localhost:4000/api`** — le fichier **`frontend-api-client.ts`** ajoute automatiquement `/api` s’il manque.  
   - Si la variable pointe vers le **site Next** (`https://wifi...`) au lieu du **serveur Nest**, tu obtiens un **404** : l’URL doit être celle où tourne l’API (Railway, Render, etc.).

2. **Étape 1 — demande + envoi email**  
   - `POST /api/auth/register/request`  
   - `Content-Type: application/json`  
   - Corps : `{ "email", "password" (≥6), "firstName", "lastName", "phone?" }`  
   - Réponse **200** : `{ "message": "Si cette adresse est valide…" }` (toujours un message générique côté sécurité).  
   - **400** : validation ou **échec Resend** (clé / `RESEND_FROM_EMAIL` / domaine). Ce n’est **pas** un 404.

3. **Étape 2 — code reçu par email**  
   - `POST /api/auth/register/verify`  
   - Corps : `{ "email", "code" }` (code à 6 chiffres).  
   - Réponse **200** : même forme que le login (`access_token`, `user`).

4. **Renvoi du code** (optionnel)  
   - `POST /api/auth/register/resend`  
   - Corps : `{ "email" }`.

5. **CORS** : l’origine du front doit être autorisée (`FRONTEND_URL` côté backend, voir `main.ts`). Sinon le navigateur bloque la requête (souvent erreur réseau / CORS, pas toujours un JSON 404).

### App

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api` | Non | Accueil |
| GET | `/api/health` | Non | Health check |

### Users

| Méthode | Chemin | Auth |
|---------|--------|------|
| GET | `/api/users` | JWT |
| GET | `/api/users/:id` | JWT |
| POST | `/api/users` | JWT |
| PUT | `/api/users/:id` | JWT |
| DELETE | `/api/users/:id` | JWT |

### Tickets (public & authentifié)

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/tickets` | Non | Liste (`?status=` optionnel) |
| GET | `/api/tickets/available` | Non | Disponibles à la vente |
| GET | `/api/tickets/types` | Non | Types + `availableCount` |
| GET | `/api/tickets/types/:id` | Non | Détail type |
| GET | `/api/tickets/type/:typeId` | Non | Tickets dispo par type |
| GET | `/api/tickets/:id` | Non | Détail (`password` masqué) |
| POST | `/api/tickets/purchase` | JWT | Achat (ex. cash) |
| GET | `/api/tickets/me` | JWT | Tickets achetés |
| POST | `/api/tickets/:id/reserve` | Non | Réserver |
| POST | `/api/tickets/:id/release` | Non | Libérer |
| POST | `/api/tickets/webhook/payment` | Non | Webhook paiement (intégration) |

### Tickets (admin)

| Méthode | Chemin | Auth |
|---------|--------|------|
| POST | `/api/tickets/admin/import` | JWT **admin** |
| POST | `/api/tickets/admin/import/recommendations` | JWT **admin** |
| GET | `/api/tickets/admin/stats` | JWT **admin** |
| DELETE | `/api/tickets/admin/:id` | JWT **admin** |

Alias sous **`/api/admin/tickets`** : `POST .../import`, `GET .../stats`, `DELETE .../:id` (même logique).

### Payments

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/payments` | JWT | Liste (étudiant : ses paiements) |
| GET | `/api/payments/:id` | JWT | Détail |
| GET | `/api/payments/transaction/:transactionId` | JWT admin/agent | Par ID transaction |
| POST | `/api/payments/:id/complete` | JWT admin/agent | Compléter |
| PUT | `/api/payments/:id/status` | JWT admin/agent | Changer statut |

### Kelpay

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| POST | `/api/payments/initiate` | JWT | Push MM ; `amount` = `ticket.ticketType.price` |
| POST | `/api/payments/:paymentId/kelpay/verify` | JWT | `checktransaction` — succès → `success` + ticket vendu |
| POST | `/api/payments/:paymentId/kelpay/confirm` | JWT | Idempotent |
| POST | `/api/payments/:paymentId/kelpay/cancel` | JWT | Abandon `pending`/`processing` → libère le ticket |
| POST | `/api/payments/callback` | Non | Webhook Kelpay — réponse texte `OK` |

Configurer une URL **HTTPS** publique vers le callback (`KELPAY_CALLBACK_URL` recommandé, ou `PUBLIC_API_URL` / `RAILWAY_PUBLIC_DOMAIN` + chemin). Après `initiate`, `code: 0` Kelpay = demande reçue ; le statut final vient de **verify** / **confirm** ou du **callback**.

### Dashboard

| Méthode | Chemin | Auth |
|---------|--------|------|
| GET | `/api/dashboard/my-stats` | JWT |
| GET | `/api/dashboard/stats` | JWT |
| GET | `/api/dashboard/charts?days=` | JWT |

### Règles prix (rappel)

- Pas de `price` sur **`tickets`**.
- Côté client : **`ticket.ticketType.price`** pour l’affichage et pour **`POST /api/payments/initiate`** (`amount` strictement égal).

---

## Paiements KELPAY (intégration frontend)

Le frontend **n’appelle jamais** Kelpay directement ; uniquement cette API (JWT sauf callback).

### Parcours

| Parcours | Routes | Remarque |
|----------|--------|----------|
| KELPAY | `initiate` → `verify` → `confirm` (optionnel) | Entre-temps : **`kelpay/cancel`** si abandon |
| Espèces | `POST /api/tickets/purchase` avec `method: "cash"` | Ne pas mélanger avec `initiate` pour le même flux MM |

Ne pas utiliser `POST /api/tickets/purchase` avec `mobile_money` si vous utilisez **`initiate`** pour Kelpay.

### Corps `POST /api/payments/initiate`

```json
{
  "ticketId": "uuid-du-ticket",
  "phoneNumber": "+243900000000",
  "amount": 1000,
  "userId": "uuid-utilisateur"
}
```

- **`amount`** : strictement égal à `ticket.ticketType.price` (CDF).
- **`userId`** : pour un **student**, doit correspondre au JWT (sinon `403`).

Réponse typique (201) : `paymentId`, `merchantReference`, `transactionId`, `status: "pending"`, bloc `kelpay` — **persister `paymentId`**.

### Enchaînement côté UI

1. **Initier** — push sur le téléphone.
2. **Vérifier** — `POST /api/payments/{paymentId}/kelpay/verify` — Keccel : **code 0** = succès, **1** = échec ; `transactionstatus`.
3. **Confirmer** — `POST /api/payments/{paymentId}/kelpay/confirm` — idempotent (`alreadyFinalized` si déjà fait).
4. **Annuler** — `POST /api/payments/{paymentId}/kelpay/cancel` — tant que `pending`/`processing`.

L’utilisateur peut **fermer l’app** entre les étapes ; le backend n’impose pas une session unique. Le **callback** peut finaliser avant Confirm : utiliser **`GET /api/payments/:id`**.

### Statuts paiement (affichage)

| Statut | UI |
|--------|-----|
| `pending` | En attente — verify / confirm ou callback |
| `processing` | Poursuivre verify / confirm ou GET |
| `success` | Confirmé — ticket vendu |
| `failed` | Ticket libéré |
| `expired` | Selon métier |
| `completed` | Flux manuel (ex. espèces complétées par admin) |

### Erreurs utiles

`404` introuvable ; `403` accès ; `400` ticket / montant / annulation invalide ; `409` confirm trop tôt ou cancel en course avec succès.

### Après succès

- `GET /api/tickets/me` (JWT) — tickets achetés.
- Messages utilisateur : expliquer qu’il peut valider sur le téléphone puis revenir **vérifier** ; pas de polling serveur obligatoire après `initiate`.

### Fichiers de référence dans le dépôt

- `frontend-types.ts`, `frontend-api-client.ts` — `initiateKelpay`, `verifyKelpay`, `confirmKelpay`, `cancelKelpay`.

---

## Swagger, client TypeScript, déploiement

- **Swagger** : tag **Kelpay**, **Tickets**, **Auth**, etc. sur `/api`.
- **Déploiement** : `npm ci`, `npm run build`, `node dist/main.js` — `railway.json` / `railway.toml`, `render.yaml` si présents ; `DATABASE_URL` obligatoire.

### Production : variables et seeds

1. Reprenez **`.env.production.example`** : copiez chaque clé dans les variables d’environnement de l’hébergeur (ou dans un `.env` local de déploiement non versionné). **`ADMIN_SEED_EMAIL`** / **`ADMIN_SEED_PASSWORD`** sont optionnels : s’ils sont vides, le seed utilise l’admin par défaut (`president@clubgei-polytech.org`, mot de passe dans le code).
2. **Premier remplissage de la base** : depuis une machine avec le repo et `npm install`, un fichier **`.env`** contenant la **`DATABASE_URL` de production**, exécutez **`npm run seed:admin`** (voir aussi la section *Déploiement* du README racine). Réexécuter plus tard ne recrée pas un second admin si l’email existe déjà.

### Hors périmètre de cette API

Comptes Wi‑Fi avancés, sessions, bande passante, appels MikroTik : **non gérés** par ce backend. Les scripts sous `scripts/` (ex. MikroTik) restent des **références terrain** uniquement.

### CSV Mikhmon

Colonnes : **Username, Password, Profile, Time Limit, Data Limit, Comment**. Le prix catalogue ne vient pas d’un champ CSV multipart séparé : **`TICKET_PRICE_*`** + **Time Limit** → **`ticket_types`**.
