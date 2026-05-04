/**
 * Tokens HMAC para links de auto-cadastro de alunos.
 * Validação 100% server-side — nunca importe este arquivo em componentes cliente.
 *
 * Formato interno do token (antes do base64url):
 *   "<expiry_ms>:<nonce_hex>:<hmac_hex_24>"
 */

import { createHmac, randomBytes } from 'crypto';

const DEFAULT_EXPIRY_DAYS = 7;

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('SUPABASE_SERVICE_ROLE_KEY não definida');
  return s;
}

export function generateRegistrationToken(expiryDays = DEFAULT_EXPIRY_DAYS): string {
  const expiry = Date.now() + expiryDays * 24 * 60 * 60 * 1000;
  const nonce = randomBytes(16).toString('hex');
  const payload = `${expiry}:${nonce}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('hex').substring(0, 24);
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export type TokenStatus = 'valid' | 'expired' | 'invalid';

export function verifyRegistrationToken(token: string): TokenStatus {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    // Esperamos exatamente 3 segmentos separados por ":"
    // expiry pode conter apenas dígitos, nonce é hex de 32 chars, sig é hex de 24 chars
    const colonIdxFirst = decoded.indexOf(':');
    const colonIdxLast = decoded.lastIndexOf(':');
    if (colonIdxFirst === colonIdxLast || colonIdxFirst === -1) return 'invalid';

    const expiryStr = decoded.substring(0, colonIdxFirst);
    const nonce = decoded.substring(colonIdxFirst + 1, colonIdxLast);
    const sig = decoded.substring(colonIdxLast + 1);

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || nonce.length < 8 || sig.length < 16) return 'invalid';

    const payload = `${expiryStr}:${nonce}`;
    const expectedSig = createHmac('sha256', secret()).update(payload).digest('hex').substring(0, 24);

    if (sig !== expectedSig) return 'invalid';
    if (Date.now() > expiry) return 'expired';

    return 'valid';
  } catch {
    return 'invalid';
  }
}

/** Retorna o número de dias restantes até o vencimento (0 se expirado). */
export function tokenExpiryInfo(token: string): { daysLeft: number; expiresAt: Date } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const colonIdx = decoded.indexOf(':');
    if (colonIdx === -1) return null;
    const expiry = parseInt(decoded.substring(0, colonIdx), 10);
    if (isNaN(expiry)) return null;
    const daysLeft = Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)));
    return { daysLeft, expiresAt: new Date(expiry) };
  } catch {
    return null;
  }
}
