# Instructions frontend — paiements (Mobile Money KELPAY)

Ce document décrit comment intégrer l’achat avec **KELPAY** côté frontend (Next.js ou autre). Le backend appelle `pay.keccel.com` ; le frontend **n’appelle jamais** Kelpay directement. Après **`POST /payments/initiate`**, il **n’y a pas** de boucle `checktransaction` automatique côté serveur : le client enchaîne **`kelpay/verify`** puis **`kelpay/confirm`**, et peut appeler **`kelpay/cancel`** pour abandonner tant que le paiement est ouvert ; le **callback** Kelpay peut finaliser le paiement si l’URL est joignable.

## Prérequis

- **JWT** valide (`Authorization: Bearer …`) pour toutes les routes ci-dessous sauf indication.
- URL API : préfixe global **`/api`** (ex. `https://votre-api.com/api`).

## Parcours possibles

| Parcours | Routes principales | Usage |
|----------|---------------------|--------|
| **KELPAY — 3 actions** | `POST /payments/initiate` → `verify` → `confirm` | Le **front** déclenche chaque étape. Entre initiate et confirm, **`POST /payments/:paymentId/kelpay/cancel`** abandonne un paiement encore `pending` / `processing` et libère la ligne pour un autre achat. |
| **Espèces / autre** (sans push MM) | `POST /tickets/purchase` avec `method: "cash"` | Paiement `pending`, complétion admin possible. |

Pour KELPAY, **ne pas** appeler `POST /tickets/purchase` avec `mobile_money` si vous utilisez `initiate` : le ticket reste **`available`** mais est **exclu du catalogue** tant qu’un paiement Kelpay **`pending`/`processing`** existe sur cette ligne. Au **succès** (réponse Keccel **code 0** / statut transaction OK sur **`kelpay/verify`**, ou **`kelpay/confirm`**, ou **callback** Kelpay), le ticket passe en **`sold`**. Pour abandonner avant la finalisation : **`kelpay/cancel`** (paiement → `cancelled`).

---

## 1. Les étapes KELPAY — à expliquer côté UI

Quatre **actions** possibles côté API (souvent trois boutons principaux + **Annuler**), **sans obligation d’enchaînement immédiat** :

1. **Initier** — `POST /api/payments/initiate`  
   - Envoie la demande Kelpay (push sur le téléphone).  
   - Corps : `ticketId`, `phoneNumber`, `amount`, `userId` (aucun autre champ requis).  
   - Réponse : `paymentId`, `merchantReference`, `transactionId`, `status: "pending"`.  
   - **Persister** `paymentId` (state client, stockage local, ou retrouver via `GET /api/payments`).

2. **Vérifier** — `POST /api/payments/{paymentId}/kelpay/verify`  
   - Un seul `checktransaction` côté serveur (doc Keccel : **`code` 0** = transaction réussie, **`code` 1** = échec ; `transactionstatus` ex. SUCCESS / FAILED / Delivered).  
   - Si **succès** : le backend enregistre déjà le paiement en **`success`** et active le ticket (`readyToConfirm: false`).  
   - Si **échec** : paiement **`failed`**, ticket libéré.  
   - Si **encore en attente** : `paymentStatus` reste ouvert, `kelpayTransactionStatus` peut être `unknown` — réessayer plus tard.

3. **Confirmer (optionnel / idempotent)** — `POST /api/payments/{paymentId}/kelpay/confirm`  
   - Refait un `checktransaction` puis finalise si besoin. Utile si **verify** n’a pas été appelé ou en course avec le **callback**.  
   - **Idempotent** : si `verify` (ou callback) a déjà tout finalisé, la réponse le signale (`alreadyFinalized: true`).  
   - **409** si Kelpay n’a pas encore confirmé : inviter à réessayer Verify plus tard.

4. **Annuler (optionnel)** — `POST /api/payments/{paymentId}/kelpay/cancel`  
   - Tant que le paiement est **`pending`** ou **`processing`** (après initiate et/ou verify, sans confirm).  
   - Passe le paiement en **`cancelled`** et libère la ligne pour un nouvel **`initiate`** (pas d’appel Kelpay côté serveur).  
   - **400** si le paiement est déjà **`success`** / **`completed`**. **409** si un succès a été enregistré entre-temps (course avec callback / confirm).  
   - Réponse : `paymentId`, `status`, `alreadyTerminal` (répéter sur un paiement déjà `failed` / `cancelled` → `alreadyTerminal: true`, **200**).

### Les étapes ne sont pas « un seul bloc de temps »

- L’utilisateur peut **initier**, **fermer l’app**, valider plus tard sur le téléphone, **rouvrir** l’app, lancer **Verify**, puis **Confirmer** encore plus tard.  
- Le backend **n’exige pas** que les requêtes soient enchaînées dans la même session courte : tant que le paiement reste **ouvert** (`pending` / `processing`) et que Kelpay le permettent, Verify et Confirm restent pertinents ; **Cancel** peut interrompre dans cet état.  
- **JWT** : à chaque appel Verify / Confirm / Cancel, le token doit être valide (reconnexion si besoin).  
- **Callback** : Kelpay peut finaliser seul ; l’UI doit se baser sur `GET /payments/:id` ou la réponse de Confirm et ne pas supposer que seul Confirm provoque le `success`.  
- **Abandon** : bouton « Annuler l’achat » → `kelpay/cancel` tant que le statut n’est pas final ; puis retour au catalogue ou autre ticket.

### Textes suggérés pour l’utilisateur final (à adapter)

| Moment | Exemple de message |
|--------|---------------------|
| Après Initier | *« Une demande de paiement a été envoyée sur votre numéro. Validez avec votre code PIN quand vous voulez. Vous pouvez quitter cet écran : votre achat reste en attente. »* |
| Bouton Verify | *« Vérifier si le paiement a été accepté »* ou *« J’ai validé sur mon téléphone — vérifier »*. |
| Verify encore en attente | *« Le réseau peut prendre quelques instants. Réessayez dans un moment ou après avoir bien terminé sur le téléphone. »* |
| Verify succès (code 0 / statut OK) | *« Paiement confirmé, votre accès Wi‑Fi est activé. »* (`confirm` optionnel, idempotent.) |
| Après Confirm | *« Votre ticket est activé. »* (puis instructions / `GET /tickets/me`). |
| Annuler (optionnel) | *« Annuler cet achat et libérer le ticket »* — uniquement tant que le paiement n’est pas finalisé. |

Le frontend doit **expliquer clairement** qu’il y a **plusieurs moments** (demande → vérification → confirmation, et éventuellement **annulation**) et que **l’utilisateur peut prendre son temps** entre ces moments tant que le paiement n’est pas terminé ou annulé.

**Erreurs utiles** : `404` paiement introuvable ; `403` étudiant sur le paiement d’un autre utilisateur ; `400` paiement non éligible, Kelpay en échec, ou **cancel** sur un paiement déjà réussi ; `409` sur **confirm** lorsque Kelpay n’a pas encore confirmé (réessayer **verify** plus tard), ou **cancel** si un succès a été enregistré entre-temps.

---

## 2. Requête `POST /api/payments/initiate`

**Headers :** `Content-Type: application/json`, `Authorization: Bearer <access_token>`

**Corps :**

```json
{
  "ticketId": "uuid-du-ticket",
  "phoneNumber": "+243900000000",
  "amount": 1000,
  "userId": "uuid-de-l-utilisateur-connecte"
}
```

| Champ | Règle |
|--------|--------|
| `ticketId` | UUID du ticket encore **disponible** (`status === "available"`). |
| `phoneNumber` | Numéro du compte Mobile Money à débiter. |
| `amount` | **Strictement** égal à `ticket.ticketType.price` (CDF). |
| `userId` | UUID de l’acheteur. Pour un **student**, doit être **identique** à l’utilisateur du JWT (sinon `403`). Admin/agent peuvent initier pour un autre `userId`. |

### Réponse 201 (succès initiation)

Exemple de forme (champs utiles) :

```json
{
  "paymentId": "uuid-paiement",
  "merchantReference": "KP-…",
  "transactionId": "id-transaction-kelpay",
  "status": "pending",
  "kelpay": {
    "raw": "…",
    "fields": { "code": "0", "description": "…", "reference": "…", "transactionid": "…" },
    "transactionId": "…",
    "reference": "…",
    "kelpayCode": "0",
    "message": "…"
  }
}
```

- Le backend a déjà demandé à KELPAY d’envoyer la **push** sur le téléphone.
- Conserver **`paymentId`** pour enchaîner verify / confirm.

### Erreurs fréquentes

| HTTP | Cause |
|------|--------|
| `400` | Ticket non disponible, montant ≠ prix, erreur KELPAY, `code` ≠ `0` sur la réponse init. |
| `403` | Étudiant : `userId` ≠ utilisateur du token. |
| `401` | Token absent ou expiré. |

---

## 3. Rafraîchir l’état (`GET /payments/:id`)

Le front **ne** attend **pas** un polling serveur après `initiate`. Il enchaîne **verify** puis **confirm**.

`GET /api/payments/{paymentId}` (ou `GET /api/payments`) reste utile pour :

- afficher l’historique / « paiement en attente » après réouverture de l’app ;
- détecter qu’un **callback** Kelpay a déjà passé le paiement en `success` avant que l’utilisateur appuie sur Confirm (Confirm reste idempotent).

### Statuts à afficher (`payment.status`)

| Statut | Signification côté UI |
|--------|-------------------------|
| `pending` | Push envoyée ou en attente ; enchaîner verify / confirm ou attendre callback. |
| `processing` | Transition possible selon le contexte ; continuer verify / confirm ou GET. |
| `success` | Paiement confirmé ; le ticket passe **vendu** côté serveur. |
| `failed` | Refus / erreur ; ticket **libéré** (re-disponible). |
| `expired` | Délai / annulation métier ; ticket libéré si applicable. |
| `completed` | Ancien flux manuel (ex. espèces complétées par admin) — peut coexister. |

Les champs `providerResponse` / `merchantReference` sont surtout pour le **support** ; pas besoin de les parser en production sur le front.

---

## 4. Après succès (`success`)

- Les tickets achetés par l’utilisateur connecté : **`GET /api/tickets/me`** (JWT).
- Le catalogue public : **`GET /api/tickets/available`** (le ticket vendu n’y figure plus).
- Afficher confirmation + instructions Wi‑Fi : les identifiants peuvent être obtenus via la ressource ticket associée au paiement selon votre politique d’exposition (éviter d’afficher le mot de passe en clair dans des logs).

---

## 5. Variables d’environnement (rappel)

Côté **backend** uniquement : `KELPAY_MERCHANT_CODE`, `KELPAY_TOKEN`, éventuellement `KELPAY_CALLBACK_*` si la passerelle impose une URL (sinon vide). Le frontend ne contient **aucun** secret KELPAY.

---

## 6. Référence code (copie dans le repo)

Types et appels : `frontend-types.ts` / `frontend-api-client.ts` — `initiateKelpay`, **`verifyKelpay`**, **`confirmKelpay`**, **`cancelKelpay`**, alignés sur le Swagger **Kelpay**.

Swagger : tag **Kelpay** sur `/api` (document interactif).

---

## Annexe admin — recommandation de type avant import CSV

Si votre backoffice importe des tickets depuis CSV Mikhmon, vous pouvez demander au backend une **prévisualisation des types** avant l’import effectif :

- **Route** : `POST /api/tickets/admin/import/recommendations`
- **Auth** : JWT admin
- **Body** : `multipart/form-data` avec `file`

Le backend regroupe les lignes par **durée** (`24h`, `7j`, `30j`) et renvoie :
- `action: "use_existing"` si un `ticket_type` existe déjà pour cette durée
- `action: "create_new"` sinon (il sera auto-créé lors de l’import réel)
- `recommendedPrice` selon `Time Limit` et vos variables `TICKET_PRICE_*`

Ensuite vous lancez l’import réel sur `POST /api/tickets/admin/import`.
