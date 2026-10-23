/**
 * Minimal RFC 6238 TOTP (Time-based One-Time Password) generator using Web Crypto API.
 * Supports standard Base32 secrets and 30-second step intervals.
 */

// Base32 character lookup
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBytes(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue; // Skip non-base32 chars
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

export interface TotpResult {
  code: string;
  secondsRemaining: number;
}

/**
 * Computes a 6-digit TOTP code and remaining seconds for a given Base32 secret.
 */
export async function generateTotp(secret: string): Promise<TotpResult | null> {
  if (!secret || secret.trim().length < 8) return null;

  try {
    const keyBytes = base32ToBytes(secret);
    if (keyBytes.length === 0) return null;

    const epochSeconds = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const counter = Math.floor(epochSeconds / timeStep);
    const secondsRemaining = timeStep - (epochSeconds % timeStep);

    // 8-byte big-endian counter buffer
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(4, counter, false);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as any,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
    const hmacResult = new Uint8Array(signature);

    // Dynamic truncation per RFC 4226 Section 5.4
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const binary =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const codeNumber = binary % 1000000;
    const code = codeNumber.toString().padStart(6, '0');

    return { code, secondsRemaining };
  } catch {
    return null;
  }
}
