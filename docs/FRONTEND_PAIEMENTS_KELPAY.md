# Instructions frontend — paiements (Mobile Money KELPAY)

Ce document décrit comment intégrer l’achat avec **KELPAY** côté frontend (Next.js ou autre). Le backend confirme le paiement par **polling** sur `checktransaction` (pas de notification HTTP Kelpay vers cette API). Le frontend n’appelle **pas** `pay.keccel.com`.

## Prérequis

- **JWT** valide (`Authorization: Bearer …`) pour toutes les routes ci-dessous sauf indication.
- URL API : préfixe global **`/api`** (ex. `https://votre-api.com/api`).

## Deux parcours possibles

| Parcours | Route | Usage |
|----------|--------|--------|
| **Mobile Money (KELPAY)** | `POST /payments/initiate` | Utilisateur paie sur son téléphone (Orange, M-Pesa, Airtel, AfriMoney…). |
| **Espèces / autre** (sans push MM) | `POST /tickets/purchase` avec `method: "cash"` | Flux classique : paiement créé en `pending`, complétion manuelle admin possible. |

Pour KELPAY, **ne pas** appeler `POST /tickets/purchase` avec `mobile_money` si vous utilisez `initiate` : le ticket doit être **`available`** ; `initiate` réserve le ticket et crée le paiement.

---

## 1. Flux KELPAY (recommandé)

### Étapes UX

1. L’utilisateur **connecté** choisit un ticket listé via `GET /tickets/available` (ou par type).
2. Afficher le **prix exact** du type (`ticket.ticketType.price` en CDF) — le backend refuse si `amount` ≠ ce prix.
3. Saisie du **numéro Mobile Money** (format local ou `+243…`).
4. Appeler **`POST /api/payments/initiate`** avec le corps JSON ci-dessous.
5. Afficher un message du type : *« Validez le paiement sur votre téléphone (PIN) »*.
6. **Rafraîchir le statut** du paiement côté API jusqu’à état terminal (voir plus bas).

### Requête `POST /api/payments/initiate`

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
- Conserver **`paymentId`** pour le suivi UI.

### Erreurs fréquentes

| HTTP | Cause |
|------|--------|
| `400` | Ticket non disponible, montant ≠ prix, erreur KELPAY, `code` ≠ `0` sur la réponse init. |
| `403` | Étudiant : `userId` ≠ utilisateur du token. |
| `401` | Token absent ou expiré. |

---

## 2. Suivi du paiement (polling côté frontend)

Le serveur enchaîne automatiquement des appels **`checktransaction`** après l’initiation ; le frontend doit **mettre à jour l’UI** en relisant le paiement (`GET /payments/:id`).

**Option A — Détail paiement**

`GET /api/payments/{paymentId}` (JWT ; un étudiant ne voit que ses paiements).

**Option B — Liste**

`GET /api/payments` puis filtrer par `paymentId`.

### Statuts à afficher (`payment.status`)

| Statut | Signification côté UI |
|--------|-------------------------|
| `pending` | Push envoyée ou en attente de confirmation. |
| `processing` | Vérification `checktransaction` en cours côté serveur. |
| `success` | Paiement confirmé ; le ticket passe **vendu** côté serveur. |
| `failed` | Refus / erreur ; ticket **libéré** (re-disponible). |
| `expired` | Délai / tentatives max atteints sans succès ; ticket libéré. |
| `completed` | Ancien flux manuel (ex. espèces complétées par admin) — peut coexister. |

**Suggestion d’intervalle** : requête `GET /payments/:id` toutes les **3 à 5 secondes** pendant au plus **~90 secondes**, puis message du type *« Délai dépassé, vérifiez votre opérateur ou l’historique des paiements »*.

Les champs `providerResponse` / `merchantReference` sont surtout pour le **support** ; pas besoin de les parser en production sur le front.

---

## 3. Après succès (`success`)

- Les tickets achetés par l’utilisateur connecté : **`GET /api/tickets/me`** (JWT).
- Le catalogue public : **`GET /api/tickets/available`** (le ticket vendu n’y figure plus).
- Afficher confirmation + instructions Wi‑Fi : les identifiants peuvent être obtenus via la ressource ticket associée au paiement selon votre politique d’exposition (éviter d’afficher le mot de passe en clair dans des logs).

---

## 4. Variables d’environnement (rappel)

Côté **backend** uniquement : `KELPAY_MERCHANT_CODE`, `KELPAY_TOKEN`, éventuellement `KELPAY_CALLBACK_*` si la passerelle impose une URL (sinon vide). Le frontend ne contient **aucun** secret KELPAY.

---

## 5. Référence code (copie dans le repo)

Types et appel d’exemple : `frontend-types.ts` (`InitiateKelpayPaymentRequest`, `InitiateKelpayPaymentResponse`) et `frontend-api-client.ts` (`apiClient.payments.initiateKelpay`).

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
