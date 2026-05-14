# Frontend — alignement sur les changements de sécurité (API)

Ce document liste ce que l’application **frontend** doit adapter après durcissement du backend (rôles, webhooks, rate limiting, Swagger, etc.).  
Préfixe API : **`/api`**. Types de référence dans le dépôt : **`frontend-types.ts`**, client : **`frontend-api-client.ts`**.

---

## 1. Gestion des utilisateurs (`/api/users/*`)

**Changement** : toutes les routes **`GET/POST/PUT/DELETE /api/users`** sont réservées au rôle **`admin`** (JWT avec `role: "admin"`). Un étudiant ou un agent ne doit plus appeler ces endpoints.

**À faire côté front**

- Masquer ou désactiver les écrans « liste utilisateurs », « création / édition compte » si `user.role !== 'admin'`.
- Si le front appelait `/users` pour un **agent**, il faut soit retirer cette fonctionnalité, soit demander une évolution API (non prévue aujourd’hui).
- Les réponses **utilisateur** ne contiennent plus le champ **`password`** (même hashé). Ne pas s’y fier dans les types ou l’UI.

**Erreurs HTTP** : **`403 Forbidden`** si un non-admin appelle encore ces routes.

---

## 2. Webhook interne ticket / paiement (`POST /api/tickets/webhook/payment`)

**Changement** : l’endpoint n’est plus anonyme. Il exige :

- En-tête **`X-Payment-Webhook-Secret`** : valeur identique à la variable d’environnement **`TICKETS_PAYMENT_WEBHOOK_SECRET`** côté backend (et côté appelant).

**À faire côté front**

- **Cas normal (SPA navigateur)** : ce webhook est pensé pour un **serveur** ou un worker (BFF, cron, outil interne), pas pour le navigateur — **ne pas y exposer le secret** dans le bundle client.
- Si une intégration **serveur** (Next.js API Route, Edge, etc.) appelle ce POST : ajouter l’en-tête `X-Payment-Webhook-Secret` avec la valeur secrète (variable d’env **côté serveur uniquement**).

**Erreurs HTTP** : **`503`** si le secret n’est pas configuré sur le backend ; **`401`** si l’en-tête est absent ou incorrect.

---

## 3. Limitation de débit (throttling) sur l’auth

**Changement** : des limites par IP s’appliquent sur :

- `POST /api/auth/register/request`, `register/verify`, `register/resend`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`, `reset-password`

Les routes **`GET /api/auth/profile`**, **`GET /api/health`**, etc. ne sont pas concernées de la même façon.

**À faire côté front**

- Gérer explicitement **`429 Too Many Requests`** sur ces appels : message utilisateur du type « Trop de tentatives, réessayez dans quelques minutes ».
- Éviter les boucles de retry agressives sur login / envoi de code.
- Prévoir un léger **délai** ou **désactivation du bouton** après plusieurs échecs pour limiter les rafales.

Les quotas exacts peuvent évoluer ; le comportement attendu est surtout : **ne pas traiter 429 comme une erreur « credentials invalides »**.

---

## 4. Swagger / OpenAPI en production

**Changement** : avec **`NODE_ENV=production`**, la doc Swagger **n’est plus montée** sur `/api` (plus d’UI interactive en prod).

**À faire côté front**

- Ne pas dépendre de l’URL **`…/api`** (Swagger UI) en production pour la découverte des routes.
- Conserver la doc dans le dépôt (**`docs/README.md`**, ce fichier) ou un export OpenAPI en **dev** pour générer le client.

---

## 5. CORS et en-têtes

**Changement** : l’en-tête **`X-Payment-Webhook-Secret`** est autorisé par CORS (utile surtout pour des appels cross-origin très spécifiques).

**À faire côté front**

- Aucun changement pour les appels classiques **`Authorization`** + **`Content-Type`**.
- Si vous appelez le webhook depuis un autre **origine** (peu recommandé avec un secret), vérifier que le navigateur envoie bien l’en-tête personnalisé ; en pratique, préférer l’appel **same-origin** via votre BFF.

---

## 6. Callback Kelpay (`POST /api/payments/callback`)

**Changement** : optionnel côté infra — si **`KELPAY_CALLBACK_ALLOWED_IPS`** est défini sur le backend, seules ces IPs peuvent déclencher le traitement (les autres reçoivent quand même `OK` pour Keccel).

**À faire côté front**

- Aucun changement pour le flux **initiate → verify → confirm** depuis le navigateur.
- Si vous testez le callback en local avec un tunnel, coordonner avec l’équipe backend (IP ou variable vide = pas de filtre).

---

## 7. Récap des erreurs à gérer dans l’UI

| Code | Contexte typique | Action UI suggérée |
|------|-------------------|---------------------|
| **403** | Accès `/users` sans rôle admin | Rediriger ou message « réservé aux administrateurs » |
| **401** | Webhook ticket sans bon secret | Corriger l’intégration serveur uniquement |
| **503** | Webhook ticket alors que le secret n’est pas configuré sur l’API | Avertir l’équipe / désactiver la fonctionnalité |
| **429** | Trop de requêtes auth | Message + cooldown, pas « mot de passe incorrect » |

---

## 8. Fichiers à synchroniser dans le repo frontend

- Recopier / fusionner **`frontend-types.ts`** (ex. `PaymentMethod` sans `cash`, types utilisateur sans `password` exposé, etc.).
- Adapter le client HTTP si des appels à **`/users`** ou au **webhook payment** existent.

Pour le flux inscription / mot de passe oublié inchangé fonctionnellement, voir toujours **[FRONTEND_AUTH_FLUX.md](./FRONTEND_AUTH_FLUX.md)**.
