/**
 * URLs officielles KELPAY (Keccel).
 * Requêtes et réponses au format JSON, en-têtes : Authorization Bearer + Content-Type application/json.
 */
export const KELPAY_PAYMENT_URL = 'https://pay.keccel.com/kelpay/v1/payment.asp';
export const KELPAY_CHECK_TRANSACTION_URL = 'https://pay.keccel.com/kelpay/v1/checktransaction.asp';

/** Solde marchand (GET) — doc Keccel ; non branché sur un service Nest pour l’instant. */
export const KELPAY_GET_BALANCE_URL = 'https://pay.keccel.com/kelpay/v1/getbalance.asp';

export const KELPAY_HTTP_TIMEOUT_MS = 30_000;

/** Nombre de tentatives HTTP en cas d’erreur réseau. */
export const KELPAY_HTTP_RETRY = 3;

export const KELPAY_CURRENCY_DEFAULT = 'CDF';
