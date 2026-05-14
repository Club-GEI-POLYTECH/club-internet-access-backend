# Backend — vente de tickets Wi‑Fi (UNIKIN)

API **NestJS** centrée sur l’**import CSV** (Mikhmon) et la **vente** de tickets : catalogue par durée (**24h / 7j / 30j**), paiements, dashboard, authentification admin/agent.

## Prérequis

- **Node.js** 20 ou plus récent  
- **PostgreSQL** 15+ accessible localement (ou distant) : créez une base (ex. `internet_access`) et renseignez `DATABASE_URL` dans `.env`.

## Démarrage

```bash
npm install
cp .env.local.example .env
npm run seed:admin
npm run start:dev
```

En production, partir de **`.env.production.example`** (mêmes clés), renseigner secrets et URLs, puis déployer avec ce contenu dans les variables d’environnement de la plateforme ou dans un fichier **`.env`** non versionné.

Le fichier **`.env`** n’est pas versionné (voir `.gitignore`). Modèles : **`.env.local.example`** (développement), **`.env.production.example`** (production).

- API : selon `PORT` dans `.env` (souvent `http://localhost:4000/api`)
- **Documentation unifiée** : [docs/README.md](docs/README.md) (démarrage, métier, routes, KELPAY, déploiement)
- **Swagger (OpenAPI)** : même origine que l’API, chemin `/api` → bouton *Authorize* pour le JWT (`JWT-auth`)

## Prix des tickets (durée)

À l’import CSV, le prix est calculé à partir de la colonne **Time Limit** (ex. `24h`, `7d`, `30d`) et des variables :

| Variable | Rôle |
|----------|------|
| `TICKET_PRICE_24H` | Forfait ~24h / 48h / 1j (tout ce qui n’est pas 7 ou 30 jours) |
| `TICKET_PRICE_7D` | Limite contenant `7` (ex. `7d`, `7j`) |
| `TICKET_PRICE_30D` | Limite contenant `30` |

Les variables **`TICKET_PRICE_*`** du fichier d’environnement servent notamment à l’import CSV et aux types par défaut.

## Modules supprimés (non utilisés ici)

Comptes Wi‑Fi, sessions, bande passante, MikroTik : **retirés** du code et des routes. Les tables historiques peuvent rester en base ; l’ORM ne mappe plus que `users`, `payments`, `tickets`, `ticket_types`, `password_reset_tokens`.

## Endpoints utiles

| Zone | Exemples |
|------|----------|
| Public | `GET /tickets/types`, `GET /tickets/available`, `POST /tickets/purchase` |
| Auth | `POST /auth/login`, `GET /auth/profile` |
| Admin tickets | `POST /tickets/admin/import`, `POST /tickets/admin/import/recommendations`, `GET /tickets/admin/stats` — détail dans [docs/README.md](docs/README.md) |
| Paiements | `GET /payments`, `POST /payments/initiate` (KELPAY, JWT), `kelpay/verify`, `kelpay/confirm`, `kelpay/cancel`, `POST /payments/:id/complete`, `PUT /payments/:id/status` — idem [docs/README.md](docs/README.md) |
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/charts?days=7`, `GET /dashboard/my-stats` |

## Déploiement (Railway / Render)

Le dépôt est prévu pour un build **Node** classique (`npm ci`, `npm run build`, `node dist/main.js`). Voir `railway.json` / `railway.toml` (Nixpacks) et `render.yaml` (runtime Node). La variable `DATABASE_URL` doit pointer vers votre base PostgreSQL.

## Fichiers frontend

- `frontend-types.ts` — types alignés sur cette API
- `frontend-api-client.ts` — client minimal (auth, tickets, paiements, dashboard)

## CSV Mikhmon

Colonnes attendues : **Username, Password, Profile, Time Limit, Data Limit, Comment** (comme avant). Le **prix** ne vient plus d’un `defaultPrice` multipart : uniquement des variables `TICKET_PRICE_*` + **Time Limit**.

## Scripts terrain MikroTik

Les fichiers sous `scripts/` (`mikrotik-setup.rsc`, etc.) restent des **références** pour le routeur ; cette API ne les appelle pas.
