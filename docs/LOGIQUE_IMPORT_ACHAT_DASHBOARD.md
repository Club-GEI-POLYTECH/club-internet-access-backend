# Logique Import CSV -> Achat -> Dashboard Admin

Ce document explique le flux complet que nous avons mis en place:

1. import des tickets depuis CSV,
2. enregistrement en base de donnees,
3. disponibilite pour achat,
4. achat et mise a jour des statuts,
5. comptabilisation dans le dashboard admin.

## 1) Import CSV: ce qui se passe

Route utilisee (admin): `POST /api/tickets/admin/import`

Service principal: `src/tickets/tickets.service.ts` -> `importFromCSV()`

Le backend:
- lit le fichier CSV envoye en multipart,
- parse les lignes (colonnes attendues: `Username`, `Password`, `Profile`, `Time Limit`, `Data Limit`, `Comment`),
- ignore les lignes invalides (ex: username/password/profile manquants),
- ignore les doublons si `username` existe deja.

## 2) Comment les types 24h / 7j / 30j sont geres

La logique ne se base pas sur le `Profile` pour le type commercial.
Elle classe chaque ticket par duree:
- contient `30` -> type `30j`,
- contient `7` -> type `7j`,
- sinon -> type `24h`.

Le prix est calcule via:
- `TICKET_PRICE_24H`
- `TICKET_PRICE_7D`
- `TICKET_PRICE_30D`

Puis le backend cherche un `ticket_type` correspondant a cette duree.
S'il n'existe pas, il le cree automatiquement (`ticket_types`), avec:
- `name`: libelle de duree (24 heures / 7 jours / 30 jours),
- `profile`: valeur technique (`DURATION_24H`, `DURATION_7J`, `DURATION_30J`),
- `timeLimit`: normalise (`24h`, `7d`, `30d`),
- `price`: prix recommande selon les variables d'environnement.

## 3) Enregistrement en base de donnees (tickets)

Pour chaque ligne importee valide, un enregistrement est cree dans `tickets` avec notamment:
- `username` (unique),
- `password` chiffre (AES, via `TICKET_ENCRYPTION_KEY`),
- `profile` (profil CSV original, utile pour l'usage reseau),
- `timeLimit`, `dataLimit`, `comment`,
- `status = available` au depart,
- `ticketTypeId` (lien vers type 24h/7j/30j — **le prix catalogue est sur `ticket_types.price`, pas sur la ligne ticket**),
- `paymentId = null` tant qu'il n'est pas reserve/achete.

Important:
- Le ticket est importable et visible en catalogue seulement s'il est `available`.

## 4) Comment il devient disponible pour achat

Route catalogue public: `GET /api/tickets/available`

Cette route renvoie les tickets avec statut:
- `available` uniquement.

Le frontend peut aussi lire les types avec compteurs via:
- `GET /api/tickets/types`

Le `availableCount` est calcule par type (`ticketTypeId`) et permet d'afficher combien il reste de tickets pour 24h/7j/30j.

## 5) Achat: comment le ticket passe en "achete"

Deux parcours:

- Flux Mobile Money KELPAY: `POST /api/payments/initiate`
- Flux classique: `POST /api/tickets/purchase` (ex: cash)

Au moment de l'achat:
1. le ticket doit etre `available`,
2. il passe d'abord a `reserved`,
3. un paiement est cree dans `payments` (avec `amount = ticket_types.price` du type lie au ticket),
4. le ticket reference ce paiement (`paymentId`).

Quand le paiement est confirme:
- le ticket passe a `sold`,
- `soldAt` est renseigne,
- `soldTo` est renseigne (telephone / utilisateur selon flux).

Si le paiement echoue/expire:
- le ticket est relache en `available`,
- `paymentId` est vide.

## 6) Comment le prix est comptabilise

Le prix unitaire est stocke dans `ticket_types.price` (une ligne par duree 24h/7j/30j).

Pour le dashboard:
- `TicketsService.getStats()` recupere les tickets `sold` avec leur `ticketType`,
- additionne `ticketType.price` pour chaque ticket vendu,
- `DashboardService` fait de meme via une jointure `ticket` / `ticketType` pour le bloc stats.

Donc, la recette tickets cote dashboard admin correspond a:
- somme des prix du **type** pour chaque ticket effectivement `sold`.

## 7) Ce que voit l'admin dans le dashboard

Route admin: `GET /api/dashboard/stats`

Le bloc tickets inclut:
- total tickets,
- disponibles,
- vendus,
- reserves,
- revenu cumule.

Ce revenu est alimente automatiquement par la transition des tickets vers `sold` apres paiement valide.

## 8) Previsualisation front avant import (recommandation)

Route admin: `POST /api/tickets/admin/import/recommendations`

Elle permet au frontend de charger un CSV et d'obtenir, avant import:
- les types detectes (`24h`, `7j`, `30j`),
- le nombre de lignes par type,
- le prix recommande,
- si le type existe deja (`use_existing`) ou sera cree (`create_new`).

Ensuite seulement, le front peut lancer l'import reel.
