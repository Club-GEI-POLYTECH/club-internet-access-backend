/** Taille max d’une ligne de log (évite logs énormes en prod). */
const DEFAULT_MAX = 4000;

export function truncateForLog(s: string, maxLen = DEFAULT_MAX): string {
  const t = (s ?? '').trim();
  if (t.length <= maxLen) {
    return t;
  }
  return `${t.slice(0, maxLen)}…[tronqué +${t.length - maxLen} car.]`;
}

/** Corps JSON envoyé à Kelpay — masque partiellement le numéro MM. */
export function sanitizeKelpayRequestBody(body: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...body };
  if (out.mobilenumber) {
    const digits = out.mobilenumber.replace(/\D/g, '');
    const tail = digits.slice(-4) || '????';
    out.mobilenumber = `****${tail}`;
  }
  return out;
}
