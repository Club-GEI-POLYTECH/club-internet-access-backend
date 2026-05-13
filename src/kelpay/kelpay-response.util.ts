import {
  KelpayParsedResponse,
  KelpayResponseKind,
  KelpayTransactionState,
} from './kelpay.types';

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, '');
}

function pickField(fields: Record<string, string>, ...keys: string[]): string | undefined {
  const lowerKeys = new Set(keys.map((k) => k.toLowerCase()));
  for (const [k, v] of Object.entries(fields)) {
    if (lowerKeys.has(k.toLowerCase()) && v) return v;
  }
  return undefined;
}

function getKelpayCode(fields: Record<string, string>): string | undefined {
  const c = pickField(fields, 'code');
  return c !== undefined ? c.trim() : undefined;
}

/**
 * Statut métier paiement pour checktransaction / callback Result.
 * Priorité : `transactionstatus` (SUCCESS | FAILED), sinon `code` (0 = succès, 1 = échec) selon la doc.
 */
function inferCheckTransactionStatus(fields: Record<string, string>): KelpayTransactionState {
  const ts = pickField(fields, 'transactionstatus', 'transaction_status');
  if (ts) {
    const u = ts.toUpperCase();
    if (u === 'SUCCESS' || u.includes('SUCCESS')) return 'success';
    if (u === 'FAILED' || u.includes('FAIL')) return 'failed';
  }
  const code = getKelpayCode(fields);
  if (code === '0') return 'success';
  if (code === '1') return 'failed';
  return 'unknown';
}

/**
 * Réponse init `payment.asp` : ne pas confondre `code` 0 (requête acceptée) avec un paiement réussi.
 */
function inferPaymentRequestStatus(_fields: Record<string, string>): KelpayTransactionState {
  return 'unknown';
}

function inferStatusForKind(
  fields: Record<string, string>,
  kind: KelpayResponseKind,
): KelpayTransactionState {
  if (kind === KelpayResponseKind.PAYMENT_REQUEST) {
    return inferPaymentRequestStatus(fields);
  }
  return inferCheckTransactionStatus(fields);
}

/**
 * Parse la réponse KELPAY (JSON selon doc, ou fallback form / paires clé=valeur).
 */
export function parseKelpayResponse(
  raw: string,
  kind: KelpayResponseKind = KelpayResponseKind.CHECK_TRANSACTION,
): KelpayParsedResponse {
  const trimmed = (raw || '').trim();
  const fields: Record<string, string> = {};

  if (!trimmed) {
    return { raw, fields, transactionStatus: 'unknown', kelpayCode: undefined };
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const j = JSON.parse(trimmed) as Record<string, unknown>;
      for (const [k, v] of Object.entries(j)) {
        if (v !== undefined && v !== null) fields[normalizeKey(k)] = String(v);
      }
    } catch {
      // fallback ci-dessous
    }
  }

  if (Object.keys(fields).length === 0) {
    const parts = trimmed.split(/[&\n]/);
    for (const p of parts) {
      const eq = p.indexOf('=');
      if (eq > 0) {
        const key = normalizeKey(p.slice(0, eq));
        const val = decodeURIComponent(p.slice(eq + 1).replace(/\+/g, ' ')).trim();
        if (key) fields[key] = val;
      }
    }
  }

  const transactionId = pickField(fields, 'transactionid', 'transaction_id', 'transid', 'trx_id');
  const reference = pickField(fields, 'reference', 'merchantreference', 'ref', 'orderid');
  const message = pickField(fields, 'message', 'msg', 'description', 'error');

  return {
    raw: trimmed,
    fields,
    transactionId,
    reference,
    transactionStatus: inferStatusForKind(fields, kind),
    kelpayCode: getKelpayCode(fields),
    message,
  };
}
