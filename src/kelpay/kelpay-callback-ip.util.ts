/**
 * Liste d’IPs autorisées pour `POST /api/payments/callback` (optionnel).
 * Variable : `KELPAY_CALLBACK_ALLOWED_IPS` — adresses séparées par des virgules (sans CIDR pour l’instant).
 */
export function parseKelpayCallbackAllowedIps(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isKelpayCallbackClientIpAllowed(clientIp: string | undefined, allowed: string[]): boolean {
  if (allowed.length === 0) {
    return true;
  }
  const ip = (clientIp ?? '').replace(/^::ffff:/, '').trim();
  if (!ip) {
    return false;
  }
  return allowed.includes(ip);
}
