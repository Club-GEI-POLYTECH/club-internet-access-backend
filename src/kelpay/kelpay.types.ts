/** Contexte de parsing aligné sur la doc Keccel (réponse init vs check / callback). */
export enum KelpayResponseKind {
  /** Réponse immédiate de `payment.asp` : `code` 0/1 = acceptation de la requête, pas le paiement final. */
  PAYMENT_REQUEST = 'payment_request',
  /** Réponse de `checktransaction.asp` ou corps équivalent (callback Result). */
  CHECK_TRANSACTION = 'check_transaction',
}

/** Statut métier dérivé après interprétation (doc Keccel + règles locales). */
export type KelpayTransactionState = 'pending' | 'success' | 'failed' | 'unknown';

/**
 * Forme typique du **JSON** renvoyé par Keccel pour `POST …/checktransaction.asp`
 * (et souvent le corps du callback vers votre backend).
 *
 * Exemple réel :
 * ```json
 * {
 *   "code": "1",
 *   "merchantcode": "CLUBGEI",
 *   "transactionid": "26051304573900202458",
 *   "reference": "KP-9c4169c5-d2e4-4359-bec1-4e45d2df0ecd",
 *   "transactionstatus": "Failed",
 *   "transactiontype": "Payin",
 *   "timestamp": "5/13/2026 4:57:39 PM",
 *   "account": "0811755708",
 *   "accounttype": "mobile",
 *   "provider": "AIRTEL",
 *   "amount": "1500",
 *   "currency": "CDF",
 *   "subscriberreference": "",
 *   "description": "Ticket Wi‑Fi …",
 *   "requestid": "2aea3631-1d8a-466a-a802-82e68b63c65b",
 *   "callbackurl": "http://127.0.0.1:4000/api/payments/callback"
 * }
 * ```
 *
 * Dans {@link KelpayParsedResponse.fields}, le parseur remplit aussi les propriétés
 * ci-dessous (mêmes noms que le JSON) à partir de `fields`.
 */
export interface KelpayKeccelCheckTransactionJson {
  code?: string;
  merchantcode?: string;
  transactionid?: string;
  reference?: string;
  transactionstatus?: string;
  transactiontype?: string;
  timestamp?: string;
  account?: string;
  accounttype?: string;
  provider?: string;
  amount?: string;
  currency?: string;
  subscriberreference?: string;
  /** Variante orthographique parfois vue côté doc / fournisseur. */
  subscriverreference?: string;
  description?: string;
  requestid?: string;
  callbackurl?: string;
}

/**
 * Réponse après parsing : copie **fidèle** des champs utiles Keccel (mêmes noms que le JSON / la doc),
 * plus `raw`, le dictionnaire `fields` (clés normalisées) et `message` (confort : message / erreur / etc.).
 *
 * Pour décider succès / échec côté check / callback, utiliser en priorité **`code`** : `"0"` / `"1"`.
 */
export interface KelpayParsedResponse extends Partial<KelpayKeccelCheckTransactionJson> {
  raw: string;
  fields: Record<string, string>;
  message?: string;
}
