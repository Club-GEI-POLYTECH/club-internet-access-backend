/**
 * URLs officielles KELPAY (Keccel).
 * Requêtes et réponses au format JSON, en-têtes : Authorization Bearer + Content-Type application/json.
 *
 * **Sécurité callback** : `POST /api/payments/callback` est public (exigence Keccel). La corrélation repose sur
 * `merchantReference` / `transactionId`. Optionnel : restreindre par IP avec `KELPAY_CALLBACK_ALLOWED_IPS` (voir doc).
 * La doc Keccel consultée dans ce dépôt ne fournit pas de signature HMAC du corps ; en cas d’évolution fournisseur,
 * valider la signature avant `handleKelpayCallback`.
 */
export const KELPAY_PAYMENT_URL = 'https://pay.keccel.com/kelpay/v1/payment.asp';
export const KELPAY_CHECK_TRANSACTION_URL = 'https://pay.keccel.com/kelpay/v1/checktransaction.asp';

/** Solde marchand (GET) — doc Keccel ; non branché sur un service Nest pour l’instant. */
export const KELPAY_GET_BALANCE_URL = 'https://pay.keccel.com/kelpay/v1/getbalance.asp';

export const KELPAY_HTTP_TIMEOUT_MS = 30_000;

/** Nombre de tentatives HTTP en cas d’erreur réseau. */
export const KELPAY_HTTP_RETRY = 3;

export const KELPAY_CURRENCY_DEFAULT = 'CDF';
