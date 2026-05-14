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

Le fichier **`.env`** n’est pas versionné (voir `.gitignore`). Modèles : **`.env.local.example`** (développement), **`.env.production.example`** (production). Le seed **`npm run seed:admin`** crée uniquement l’admin (par défaut `president@clubgei-polytech.org`, surcharge possible via `ADMIN_SEED_*`).

- API : selon `PORT` dans `.env` (souvent `http://localhost:4000/api`)
- **Documentation unifiée** : [docs/README.md](docs/README.md) (démarrage, métier, routes, KELPAY, déploiement)
- **Frontend — inscription & mot de passe oublié** : [docs/FRONTEND_AUTH_FLUX.md](docs/FRONTEND_AUTH_FLUX.md)
- **Swagger (OpenAPI)** : en développement uniquement (`NODE_ENV` ≠ `production`), chemin `/api` — bouton *Authorize* pour le JWT (`JWT-auth`). En production, Swagger est désactivé ; voir [docs/README.md](docs/README.md).

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

## Déploiement (Railway / Render / autre)

1. Créer une base **PostgreSQL** managée et récupérer l’URI (`DATABASE_URL`).
2. Copier **`.env.production.example`** : renseigner toutes les variables sur l’hébergeur (onglet *Variables* / *Environment*) ou dans un fichier **`.env`** utilisé uniquement au build / run, **sans le committer**.
3. Build : `npm ci` puis `npm run build`.
4. Démarrage : `node dist/main.js` (le `PORT` est souvent imposé par la plateforme ; adaptez la config si besoin).

### Seeds en production (à faire une fois par base vide, ou après reset)

Le script **`npm run seed:admin`** enchaîne :

- création / mise à jour des **types de tickets** (`ticket_types`, prix selon `TICKET_PRICE_*`) ;
- création du **compte admin** s’il n’existe pas encore : par défaut **`president@clubgei-polytech.org`** / mot de passe défini dans le code (surcharge possible avec **`ADMIN_SEED_EMAIL`** et **`ADMIN_SEED_PASSWORD`** dans l’environnement).

**Comment l’exécuter contre la base de prod** (le plus simple) :

1. Sur une machine de confiance, **clonez le dépôt** et faites `npm install` (le script utilise **`ts-node`**, présent en devDependencies).
2. Créez un **`.env`** (non versionné) avec au minimum **`DATABASE_URL`** = URI PostgreSQL de **production** (même valeur que sur Railway / Render). Les autres variables ne sont pas requises pour le seul seed, mais vous pouvez copier le reste depuis votre modèle prod.
3. Depuis la racine du projet :  
   `npm run seed:admin`  
4. Vérifiez les logs : connexion OK, types seedés, message de création admin ou « admin already exists ».

**Important** : ne lancez le seed **qu’une fois** sur une base déjà en service que si vous savez ce que vous faites (il ne supprime pas les données existantes, mais recrée les types si la logique du seed les met à jour). Si l’admin existe déjà (même email), aucun doublon n’est créé.

**Alternative** : si votre hébergeur propose une console shell sur le conteneur avec le repo et `node_modules` complets, vous pouvez y exécuter `npm run seed:admin` avec les variables d’environnement injectées (dont `DATABASE_URL`). Si seules les dépendances « production » sont installées (`omit=dev`), **`ts-node`** peut être absent : dans ce cas, préférez la méthode **poste local + `DATABASE_URL` prod** ci-dessus.

## Fichiers frontend

- `frontend-types.ts` — types alignés sur cette API
- `frontend-api-client.ts` — client minimal (auth, tickets, paiements, dashboard)

## CSV Mikhmon

Colonnes attendues : **Username, Password, Profile, Time Limit, Data Limit, Comment** (comme avant). Le **prix** ne vient plus d’un `defaultPrice` multipart : uniquement des variables `TICKET_PRICE_*` + **Time Limit**.

## Scripts terrain MikroTik

Les fichiers sous `scripts/` (`mikrotik-setup.rsc`, etc.) restent des **références** pour le routeur ; cette API ne les appelle pas.
