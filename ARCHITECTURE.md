# 🏗️ Architecture et logique du projet – Club Internet Access UNIKIN

Ce document décrit la constitution du projet, ses fonctionnalités et sa logique métier.

---

## 1. Vue d’ensemble

**Backend NestJS** pour la gestion d’accès Wi‑Fi (UNIKIN) :  
authentification, comptes Wi‑Fi (créés par l’app ou pré‑générés Mikhmon), paiements, sessions, dashboard, intégration MikroTik.

---

## 2. Structure du projet

```
src/
├── main.ts                    # Point d'entrée, CORS, Swagger, ValidationPipe
├── app.module.ts              # Module racine, importe tous les modules
├── app.controller.ts          # Contrôleur racine (ex: health)
├── app.service.ts
│
├── config/                    # Configuration
│   ├── database.config.ts    # Connexion PostgreSQL (PG* / DB_*, SSL selon hébergeur)
│   └── entities.config.ts    # Liste des entités TypeORM
│
├── entities/                  # Modèles de données (TypeORM)
│   ├── user.entity.ts        # Utilisateur (admin, agent, student)
│   ├── wifi-account.entity.ts # Compte Wi-Fi (créé par l'app, lié à MikroTik)
│   ├── ticket.entity.ts      # Ticket pré-généré (Mikhmon)
│   ├── ticket-type.entity.ts # Type de ticket (forfait, prix)
│   ├── payment.entity.ts     # Paiement (lié à WiFi account ou ticket)
│   ├── session.entity.ts     # Session active (sync MikroTik)
│   └── password-reset-token.entity.ts
│
├── auth/                      # Authentification JWT + rôles
│   ├── auth.module.ts
│   ├── auth.controller.ts    # register, login, profile, forgot/reset password
│   ├── auth.service.ts
│   ├── dto/                   # register, login, forgot-password, reset-password
│   ├── guards/                # JwtAuthGuard, RolesGuard, LocalAuthGuard
│   ├── decorators/            # @Roles()
│   └── strategies/            # JWT, Local (email/password)
│
├── users/                      # Gestion des utilisateurs (CRUD)
│   ├── users.controller.ts   # CRUD users (admin/agent)
│   └── users.service.ts     # create, update, remove, hash password
│
├── wifi-accounts/             # Comptes Wi-Fi créés par l'app
│   ├── wifi-accounts.controller.ts  # CRUD, getActive, filtrage par rôle
│   ├── wifi-accounts.service.ts     # create (DB + MikroTik), expire
│   ├── wifi-accounts.scheduler.ts  # Cron: expiration des comptes (toutes les heures)
│   └── dto/
│
├── tickets/                   # Vente de tickets pré-générés (Mikhmon)
│   ├── tickets.controller.ts # Liste, available, purchase, reserve, release
│   ├── tickets.service.ts    # purchase, import CSV, chiffrement mot de passe
│   ├── ticket-types.service.ts
│   ├── tickets-webhook.service.ts   # Marquer ticket vendu / libéré après paiement
│   └── dto/                   # purchase, import, payment-webhook
│
├── payment/                   # Paiements
│   ├── payment.controller.ts # create, complete, updateStatus, liste
│   ├── payment.service.ts    # create, completePayment (création compte Wi-Fi si besoin)
│   └── dto/
│
├── sessions/                  # Sessions actives (sync avec MikroTik)
│   ├── sessions.controller.ts
│   ├── sessions.service.ts   # syncActiveSessions (MikroTik → DB)
│   └── sessions.scheduler.ts # Cron: sync toutes les 5 min
│
├── dashboard/                 # Statistiques (admin)
│   ├── dashboard.controller.ts # stats, charts
│   └── dashboard.service.ts   # comptes, paiements, sessions, users
│
├── mikrotik/                  # Intégration MikroTik RouterOS
│   ├── mikrotik.service.ts   # createHotspotUser, deleteHotspotUser, getActiveUsers
│   └── mikrotik.controller.ts
│
├── bandwidth/                 # Statistiques bande passante
├── notifications/             # Emails (reset password, etc.)
└── database/seeds/            # Seeds (admin, données de dev)
```

---

## 3. Rôles et accès

| Rôle      | Droits |
|-----------|--------|
| **Admin** | Tout : users, wifi-accounts, payments, dashboard, tickets (import, stats), MikroTik. |
| **Agent** | Création comptes Wi‑Fi et paiements ; liste comptes/paiements ; pas dashboard admin ni gestion users. |
| **Student** | Inscription (register) ; voir **uniquement** ses comptes Wi‑Fi et ses paiements ; acheter des tickets (endpoint public). |

Les guards `JwtAuthGuard` + `RolesGuard` et le décorateur `@Roles()` limitent l’accès aux endpoints. Les services filtrent les listes (ex. `findAll` wifi-accounts / payments) selon `userId` et `userRole`.

---

## 4. Modèle de données (relations)

```
User (admin, agent, student)
  ├── wifiAccounts[]   (comptes Wi-Fi qu'il a créés ou qui lui sont liés)
  └── payments[]      (paiements qu'il a initiés)

WiFiAccount
  ├── createdBy → User
  ├── payments[]
  └── sessions[]

Ticket (pré-généré Mikhmon)
  ├── ticketType → TicketType (optionnel)
  └── payment → Payment (1:1, après achat)

Payment
  ├── createdBy → User (optionnel, ex. achat public ticket)
  ├── wifiAccount → WiFiAccount (optionnel)
  └── ticket → Ticket (optionnel)

Session
  └── wifiAccount → WiFiAccount
```

- **Comptes Wi‑Fi** : créés par l’app (agent/admin) ou automatiquement après un paiement complété (sans ticket). Création côté **MikroTik** (hotspot user) + enregistrement en base.
- **Tickets** : importés (CSV Mikhmon) ou vendus via `POST /tickets/purchase`. Liés à un paiement ; après complétion du paiement, le ticket passe en `sold` (webhook ou `completePayment`).

---

## 5. Fonctionnalités par bloc

### 5.1 Authentification (`/api/auth`)

- **Register** : inscription publique → rôle `student` uniquement, mot de passe hashé (bcrypt).
- **Login** : email + mot de passe → JWT (access token).
- **Profile** : utilisateur connecté (id, email, role, isActive, etc.).
- **Forgot / Reset password** : envoi d’email (notifications) + token de réinitialisation.

Logique : `AuthService` + `UsersService` (création user, hash). Guards JWT sur les routes protégées.

### 5.2 Utilisateurs (`/api/users`)

- CRUD utilisateurs (admin/agent) : création, mise à jour, suppression.
- Mots de passe hashés dans `UsersService` à la création/mise à jour.

### 5.3 Comptes Wi‑Fi (`/api/wifi-accounts`)

- **Création** : par agent/admin ; génération username/mot de passe, durée, profil bande (1/2/5 Mbps) ; création **MikroTik** (hotspot user) + enregistrement en base.
- **Liste / détail** : selon rôle (étudiant = uniquement ses comptes).
- **Expiration** : scheduler (toutes les heures) ; comptes dont `expiresAt` dépassé → marqués expirés + désactivés sur MikroTik.

Logique : `WiFiAccountsService` + `MikroTikService`. Pas de création MikroTik pour les **tickets** (déjà gérés par Mikhmon).

### 5.4 Tickets (`/api/tickets`)

- **Liste** : tous ou filtrés par statut ; **available** : uniquement `available`.
- **Types** : liste des types de tickets + nombre disponible.
- **Achat public** : `POST /tickets/purchase` (ticketId, phoneNumber, method) → réservation du ticket, création d’un paiement `pending`, retour des identifiants (username/password).
- **Webhook paiement** : après complétion → ticket passé en `sold` ; après échec → ticket libéré (`available`).
- **Admin** : import CSV (Mikhmon), stats, modification prix, suppression.

Logique : mots de passe des tickets chiffrés (AES) en base ; exposés seulement après achat. Prix par défaut selon profil (TEST, BASIC, PREMIUM) ou selon `TicketType`.

### 5.5 Paiements (`/api/payments`)

- **Création** : manuelle (agent/admin) ou via achat de ticket (sans user connecté).
- **Complétion** : `POST /payments/:id/complete` (optionnel `transactionId`) → statut `completed` ; si paiement lié à un **ticket**, le webhook tickets marque le ticket vendu ; si pas de ticket ni de compte Wi‑Fi, création automatique d’un compte Wi‑Fi (durée/bande selon montant).
- Filtrage des listes par rôle (étudiant = ses paiements uniquement).

Logique : `PaymentService` + lien optional vers `WiFiAccount` ou `Ticket`. Pas d’appel direct MikroTik pour les tickets.

### 5.6 Sessions (`/api/sessions`)

- **Sync** : récupération des utilisateurs actifs depuis **MikroTik** → création/mise à jour des `Session` en base (wifiAccountId, bytes in/out, etc.).
- Scheduler : toutes les 5 minutes.
- Endpoints : liste sessions, actives, par compte Wi‑Fi.

Logique : `SessionsService` appelle `MikroTikService.getActiveUsers()`, fait le lien avec les `WiFiAccount` par username.

### 5.7 Dashboard (`/api/dashboard`)

- **Stats** : agrégats (comptes, paiements, revenus, sessions, utilisateurs) pour l’admin.
- **Charts** : données pour graphiques (comptes créés/expirés, paiements, sessions par jour).

Logique : `DashboardService` lit les entités (WiFiAccount, Payment, Session, User) et agrège.

### 5.8 MikroTik (`/api/mikrotik`)

- Appels au routeur MikroTik (RouterOS API) : création/suppression d’utilisateurs hotspot, liste des actifs, etc.
- Utilisé par **wifi-accounts** (création/expiration) et **sessions** (sync).

---

## 6. Flux métier principaux

### 6.1 Compte Wi‑Fi créé par un agent

1. Agent authentifié appelle `POST /api/wifi-accounts` (durée, profil bande, etc.).
2. Backend génère username/mot de passe, calcule `expiresAt`.
3. Backend crée l’utilisateur hotspot sur **MikroTik**.
4. Backend enregistre le `WiFiAccount` en base (lié à l’agent si besoin).
5. Plus tard : scheduler expire les comptes (MikroTik + DB).

### 6.2 Paiement étudiant → compte Wi‑Fi automatique

1. Étudiant (ou agent) crée un paiement `POST /api/payments` (montant, méthode, etc.) sans ticket.
2. Paiement en `pending` ; après validation (Mobile Money, manuel, etc.) : `POST /payments/:id/complete`.
3. `PaymentService.completePayment` : si pas de `wifiAccountId` ni `ticketId`, crée un **WiFiAccount** (durée/bande selon montant) et le lie au paiement et à l’utilisateur.

### 6.3 Vente de ticket (Mikhmon)

1. Admin importe des tickets (CSV Mikhmon) via `POST /api/tickets/admin/import`.
2. Client appelle `POST /api/tickets/purchase` (ticketId, téléphone, méthode) → ticket en `reserved`, paiement `pending`, identifiants retournés.
3. Après réception du paiement (webhook ou manuel) : `POST /payments/:id/complete` ou `POST /api/tickets/webhook/payment` → paiement `completed`, ticket passé en `sold`.
4. Si paiement échoue : ticket libéré (`available`).

---

## 7. Technique

- **API** : préfixe `/api`, validation globale (ValidationPipe), CORS configuré (ex. `https://wifi.clubgei-polytech.org`, `http://localhost:3000`).
- **Documentation** : Swagger sous `/api`.
- **Base de données** : PostgreSQL (TypeORM), config via `PG*` (Railway/production) ou `DB_*` (local/Docker), SSL uniquement pour les hébergeurs cloud.
- **Tâches planifiées** : `@nestjs/schedule` (expiration comptes Wi‑Fi, sync sessions MikroTik).

En résumé : le projet gère **utilisateurs**, **comptes Wi‑Fi** (créés par l’app + MikroTik), **tickets** (Mikhmon, vente et webhook), **paiements** (liés à compte Wi‑Fi ou ticket), **sessions** (sync MikroTik), et **dashboard** pour l’admin, avec une logique d’accès basée sur les rôles et des traitements automatiques (schedulers).
