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
- **`GET /api/users`** renvoie désormais **`{ data: UserListItem[], meta: PaginationMeta }`** (plus un tableau brut). Voir §9 ci-dessous.

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

## 7. Tickets et dashboard

**Changements**

- **`GET /api/tickets`** (liste complète) : JWT **admin** ou **agent** uniquement. Le catalogue public reste sur `GET /api/tickets/available`, `/api/tickets/types`, `/api/tickets/type/:typeId`.
- **`POST /api/tickets/:id/reserve`** et **`POST /api/tickets/:id/release`** : **supprimés** (réservation gérée par Kelpay / `purchase` côté serveur).
- **`GET /api/payments/:id`** : **`403`** si un étudiant consulte le paiement d’un autre compte ; **`404`** si introuvable (plus de 500).
- **`GET /api/dashboard/stats`** : `payments.pending` = statut `pending` **seul** (plus `processing`) ; nouveaux champs **`processing`**, **`cancelled`** ; `recent.payments[].amount` est un **nombre**.

**À faire côté front**

- Back-office : envoyer le JWT sur `GET /tickets` ; retirer tout appel à `reserve` / `release`.
- Dashboard : cartes KPI pour `processing` et `cancelled` ; ne plus additionner `pending` + `processing` comme avant.
- Types : synchroniser **`DashboardStats`** depuis `frontend-types.ts`.

---

## 8. Récap des erreurs à gérer dans l’UI

| Code | Contexte typique | Action UI suggérée |
|------|-------------------|---------------------|
| **403** | Accès `/users` sans rôle admin ; étudiant sur paiement d’un autre ; `GET /tickets` sans rôle admin/agent | Message adapté ou redirection |
| **404** | Paiement introuvable (`GET /payments/:id`) | Message « introuvable » |
| **401** | Webhook ticket sans bon secret | Corriger l’intégration serveur uniquement |
| **503** | Webhook ticket alors que le secret n’est pas configuré sur l’API | Avertir l’équipe / désactiver la fonctionnalité |
| **429** | Trop de requêtes auth | Message + cooldown, pas « mot de passe incorrect » |

---

## 9. Pagination `GET /api/users` (admin)

**Changement** : la liste n’est plus un tableau JSON racine, mais :

```json
{
  "data": [
    {
      "id": "…",
      "email": "…",
      "payments": [ { "id": "…", "amount": 1500, "status": "success", … } ],
      "paymentsTotal": 7
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Query params**

| Param | Défaut | Max | Description |
|-------|--------|-----|-------------|
| `page` | 1 | — | Page (1-based) |
| `limit` | 20 | 100 | Utilisateurs par page |
| `paymentsLimit` | 10 | 50 | Paiements récents **par** utilisateur (`0` = pas de paiements dans la réponse) |
| `role` | — | — | `admin` \| `agent` \| `student` |
| `search` | — | — | Filtre email / prénom / nom |

**À faire côté front**

- Remplacer `const users = await res.json()` par `const { data, meta } = await res.json()`.
- Tableau paginé : lier `page` / `limit` à l’URL (`GET /api/users?page=2&limit=20`).
- Afficher `paymentsTotal` si l’utilisateur a plus de paiements que `payments.length` (ex. « 7 paiements, 3 affichés »).
- **`providerResponse`** n’est **pas** renvoyé dans la liste (alléger le payload) ; utiliser **`GET /api/users/:id`** ou **`GET /api/payments/:id`** pour le détail.
- **`amount`** est un **number** dans `data[].payments[]`.

**Exemple fetch**

```ts
const params = new URLSearchParams({
  page: String(page),
  limit: '20',
  paymentsLimit: '10',
});
if (roleFilter) params.set('role', roleFilter);
if (search) params.set('search', search);

const res = await fetch(`${API}/users?${params}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const body: PaginatedResponse<UserListItem> = await res.json();
setUsers(body.data);
setPagination(body.meta);
```

Types : `PaginatedResponse`, `UserListItem`, `ListUsersParams` dans **`frontend-types.ts`**.

---

## 10. Pagination `GET /api/payments`

**Changement** : même enveloppe `{ data, meta }` que les utilisateurs (plus un tableau racine).

**Query** : `page`, `limit` (déf. 20, max 100), `status`, `method`, `search`, `createdById` (admin/agent uniquement).

**Liste allégée** : pas de `providerResponse` ; `amount` en **number** ; résumés `ticket` / `createdBy`. **Étudiant / agent** : pas de `ticket.username` ni `notes` (évite de fuiter le login Wi‑Fi). **Admin** : `ticket.username` et `notes` présents.

**Détail** : `GET /api/payments/:id` renvoie toujours le paiement complet (y compris `providerResponse` si présent).

Types : `PaymentListItem`, `ListPaymentsParams`, `PaginatedResponse<PaymentListItem>`.

**Migration DB** : exécuter `npm run migration:run` (colonnes `payments.ticketId` / `createdById` en UUID) — corrige l’erreur `uuid = character varying` sur les jointures.

---

## 11. Pagination `GET /api/tickets/me` (mes tickets)

**Changement** : l’historique des tickets de l’utilisateur connecté est paginé (`{ data, meta }`), plus un tableau racine.

**Query** : `page` (déf. 1), `limit` (déf. 20, max 100), `status` optionnel (`sold`, `reserved`, etc.).

**Chaque entrée** (`MyTicketListItem`) :
- `password` : en **clair** si le ticket est `sold`, sinon `***`
- `ticketType` : résumé forfait (prix en **number**)
- `payment` : résumé sans `providerResponse` (`id`, `amount`, `status`, `method`, `createdAt`)

**Exemple (React)**

```ts
const [page, setPage] = useState(1);
const { data: tickets, meta } = await apiClient.tickets.mine({ page, limit: 10, status: TicketStatus.SOLD });

// Pagination UI
setPage(meta.hasNextPage ? page + 1 : page);
```

Types : `MyTicketListItem`, `ListMyTicketsParams`, `PaginatedResponse<MyTicketListItem>`.

---

## 12. Fichiers à synchroniser dans le repo frontend

- Recopier / fusionner **`frontend-types.ts`** (ex. `PaymentMethod` sans `cash`, types utilisateur sans `password` exposé, etc.).
- Adapter le client HTTP si des appels à **`/users`** ou au **webhook payment** existent.

Pour le flux inscription / mot de passe oublié inchangé fonctionnellement, voir toujours **[FRONTEND_AUTH_FLUX.md](./FRONTEND_AUTH_FLUX.md)**.
