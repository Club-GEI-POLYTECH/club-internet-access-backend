# Collection Postman – Club Internet Access API

## Import

1. Ouvrir Postman.
2. **Import** → **Upload Files** → choisir `Club-Internet-Access-API.postman_collection.json`.

## Variables de collection

| Variable   | Valeur par défaut        | Description                    |
|-----------|---------------------------|--------------------------------|
| `baseUrl` | `http://localhost:4000`   | URL de base de l’API           |
| `token`   | *(vide)*                 | JWT, renseigné après **Auth → Login** |

Pour un autre environnement (ex. production), modifier `baseUrl` dans les variables de la collection.

## Authentification

1. Exécuter **Auth → Login** (email/mot de passe selon ton `.env`).
2. Le script de test enregistre automatiquement le JWT dans la variable `token`.
3. Les requêtes protégées utilisent `Authorization: Bearer {{token}}`.

## Variables optionnelles pour les requêtes

Tu peux définir dans la collection (ou dans un environnement) :

- `userId` – UUID utilisateur (Get User, Update User, Delete User)
- `wifiAccountId` – UUID compte Wi-Fi
- `paymentId` – UUID paiement
- `sessionId` – ID session MikroTik (Disconnect User)
- `ticketId` – UUID ticket
- `typeId` – UUID type de ticket

## Dossiers

- **App** – Racine, health
- **Auth** – Register, Login, Profile, Forgot/Reset password
- **Users** – CRUD utilisateurs (JWT)
- **WiFi Accounts** – Comptes Wi-Fi (JWT)
- **Payments** – Paiements (JWT)
- **Sessions** – Sessions (JWT, Admin/Agent)
- **Dashboard** – Stats et graphiques (JWT)
- **MikroTik** – Statut et utilisateurs RouterOS (JWT)
- **Bandwidth** – Bande passante (JWT)
- **Tickets** – Liste, types, achat, réservation, admin, webhook
- **Admin Tickets (alt path)** – Mêmes actions via `/api/admin/tickets/...`

## Enums utiles

- **duration** (WiFi) : `24h`, `48h`, `7d`, `30d`, `unlimited`
- **bandwidthProfile** (WiFi) : `1mbps`, `2mbps`, `5mbps`
- **method** (Payment/Ticket) : `mobile_money`, `cash`
- **status** (Payment) : `pending`, `completed`
- **role** (User) : `admin`, `agent`
