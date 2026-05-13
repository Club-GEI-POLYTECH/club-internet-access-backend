/** Contexte de parsing aligné sur la doc Keccel (réponse init vs check / callback). */
export enum KelpayResponseKind {
  /** Réponse immédiate de `payment.asp` : `code` 0/1 = acceptation de la requête, pas le paiement final. */
  PAYMENT_REQUEST = 'payment_request',
  /** Réponse de `checktransaction.asp` ou corps équivalent (callback Result). */
  CHECK_TRANSACTION = 'check_transaction',
}

/** Réponse normalisée après parsing (init ou check). */
export type KelpayTransactionState = 'pending' | 'success' | 'failed' | 'unknown';

export interface KelpayParsedResponse {
  raw: string;
  fields: Record<string, string>;
  transactionId?: string;
  reference?: string;
  transactionStatus?: KelpayTransactionState;
  /** Champ `code` Kelpay (souvent "0" / "1"), tel que reçu. */
  kelpayCode?: string;
  message?: string;
}
