import {
  KelpayKeccelCheckTransactionJson,
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

/** Comme {@link pickField}, mais conserve les chaînes vides (ex. `subscriberreference`). */
function pickFieldAllowEmpty(fields: Record<string, string>, ...keys: string[]): string | undefined {
  for (const want of keys) {
    const nk = normalizeKey(want);
    if (Object.prototype.hasOwnProperty.call(fields, nk)) {
      return fields[nk];
    }
  }
  const lowerWants = new Set(keys.map((k) => normalizeKey(k)));
  for (const [k, v] of Object.entries(fields)) {
    if (lowerWants.has(normalizeKey(k))) return v;
  }
  return undefined;
}

function getKelpayCode(fields: Record<string, string>): string | undefined {
  const c = pickField(fields, 'code');
  return c !== undefined ? c.trim() : undefined;
}

/**
 * Statut métier pour **checktransaction** / callback (doc Keccel).
 * - **`code` en premier** : `0` = transaction réussie, `1` = échouée (prioritaire sur `transactionstatus`).
 * - Sinon `transactionstatus` : SUCCESS / DELIVERED / … ; FAILED / … ; PENDING / … → inconnu si ambigu.
 * `payment.asp` (init) : le champ `code` de l’init n’indique pas le résultat final du paiement ; n’utiliser cette fonction que pour **check** / callback (mêmes `fields` que la réponse JSON).
 */
export function inferKelpayCheckOutcome(fields: Record<string, string>): KelpayTransactionState {
  const code = getKelpayCode(fields);
  if (code === '0') {
    return 'success';
  }
  if (code === '1') {
    return 'failed';
  }

  const ts = pickField(fields, 'transactionstatus', 'transaction_status');
  if (ts) {
    const u = ts.toUpperCase().replace(/\s+/g, '');
    if (
      u === 'FAILED' ||
      u.includes('FAIL') ||
      u === 'REJECTED' ||
      u === 'DECLINED' ||
      u === 'CANCELLED' ||
      u === 'CANCELED' ||
      u.includes('CANCEL')
    ) {
      return 'failed';
    }
    const pendingLike = new Set(['PENDING', 'PROCESSING', 'WAITING', 'INITIATED', 'SUBMITTED', 'UNKNOWN']);
    if (pendingLike.has(u)) {
      return 'unknown';
    }
    if (
      u === 'SUCCESS' ||
      u === 'DELIVERED' ||
      u === 'COMPLETED' ||
      u === 'COMPLETE' ||
      u === 'SETTLED' ||
      u === 'PAID' ||
      u === 'CONFIRMED' ||
      u === 'APPROVED' ||
      u === 'SUCCESSFUL'
    ) {
      return 'success';
    }
    if (u.includes('PENDING') || u.includes('PROCESS')) {
      return 'unknown';
    }
  }

  if (ts) {
    return 'unknown';
  }
  return 'unknown';
}

function buildKeccelFlat(fields: Record<string, string>): Partial<KelpayKeccelCheckTransactionJson> {
  const o: Partial<KelpayKeccelCheckTransactionJson> = {};
  const set = (dest: keyof KelpayKeccelCheckTransactionJson, ...lookups: string[]) => {
    const v = pickFieldAllowEmpty(fields, ...lookups);
    if (v !== undefined) (o as Record<string, string>)[dest as string] = v;
  };
  set('code', 'code');
  set('merchantcode', 'merchantcode');
  set('transactionid', 'transactionid', 'transaction_id', 'transid', 'trx_id');
  set('reference', 'reference', 'merchantreference', 'ref', 'orderid');
  set('transactionstatus', 'transactionstatus', 'transaction_status');
  set('transactiontype', 'transactiontype', 'transaction_type');
  set('timestamp', 'timestamp');
  set('account', 'account');
  set('accounttype', 'accounttype', 'account_type');
  set('provider', 'provider');
  set('amount', 'amount');
  set('currency', 'currency');
  set('subscriberreference', 'subscriberreference', 'subscriverreference');
  set('subscriverreference', 'subscriverreference', 'subscriberreference');
  set('description', 'description');
  set('requestid', 'requestid', 'request_id');
  set('callbackurl', 'callbackurl', 'callback_url');
  return o;
}

/**
 * Parse la réponse KELPAY (JSON selon doc, ou fallback form / paires clé=valeur).
 * Le paramètre `kind` est conservé pour l’API ; la forme exposée suit les champs Keccel (`code`, `transactionid`, …).
 */
export function parseKelpayResponse(
  raw: string,
  _kind: KelpayResponseKind = KelpayResponseKind.CHECK_TRANSACTION,
): KelpayParsedResponse {
  const trimmed = (raw || '').trim();
  const fields: Record<string, string> = {};

  if (!trimmed) {
    return { raw, fields };
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

  const message = pickField(fields, 'message', 'msg', 'description', 'error');
  const flat = buildKeccelFlat(fields);

  return {
    raw: trimmed,
    fields,
    ...flat,
    ...(message !== undefined ? { message } : {}),
  };
}
