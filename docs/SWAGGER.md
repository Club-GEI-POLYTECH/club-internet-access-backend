# Documentation Swagger (API)

## Accès

- **En local** : [http://localhost:3000/api](http://localhost:3000/api)
- **En production** : `https://<votre-domaine>/api` (ex. `https://internet-access-backend-prod-production.up.railway.app/api`)

## Contenu

La doc Swagger couvre tous les modules :

| Tag | Description |
|-----|-------------|
| **Auth** | Connexion, inscription, profil, mot de passe oublié / réinitialisation |
| **Tickets** | Liste des tickets, types, achat, réservation, webhook paiement |
| **Tickets (Admin)** | Import CSV, stats, modification prix, suppression (admin) |
| **WiFi Accounts** | Comptes Wi-Fi (création, liste, détail) |
| **Payments** | Paiements (création, liste, statut) |
| **Sessions** | Sessions actives (sync MikroTik) |
| **Dashboard** | Stats globales, mes stats, données graphiques |
| **MikroTik** | Contrôle RouterOS (hotspot) |
| **Users** | Utilisateurs (admin) |
| **Bandwidth** | Bande passante / usage |

## Authentification

1. Utiliser **POST /api/auth/login** avec `email` et `password`.
2. Copier le `access_token` de la réponse.
3. Cliquer sur **Authorize** en haut de la page Swagger.
4. Saisir : `Bearer <votre_access_token>` (avec le mot "Bearer" et un espace).
5. Valider : les requêtes protégées enverront automatiquement le header `Authorization`.

## Exemples de requêtes documentées

- **Tickets** : corps des requêtes (purchase, webhook) et réponses sont décrits avec exemples.
- **Import CSV** : endpoint **POST /api/admin/tickets/import** (ou **POST /api/tickets/admin/import**) avec `multipart/form-data` : champ `file` (fichier CSV), optionnel `defaultPrice`.

## Logs

Les actions (requêtes, création, mise à jour, etc.) sont loguées côté serveur. Consulter les logs du backend pour tracer les appels et erreurs.
