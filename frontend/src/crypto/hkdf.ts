import { bytesToBase64 } from './random';

const AUTH_INFO = new TextEncoder().encode('pm/auth/v1');
const ENC_INFO = new TextEncoder().encode('pm/enc/v1');

/**
 * Derives a subkey from masterKey using HKDF-SHA256 with specific context info.
 */
export async function deriveHkdfKey(
  masterKey: Uint8Array,
  info: Uint8Array,
  lengthBytes: number = 32
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    masterKey as any,
    'HKDF',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0) as any, // empty salt per HKDF extract-and-expand with cryptographically strong masterKey
      info: info as any,
    },
    baseKey,
    lengthBytes * 8
  );

  return new Uint8Array(derivedBits);
}

/**
 * Derives authKey (32 bytes) sent to server for authentication.
 * Returned as Base64 string.
 */
export async function deriveAuthKey(masterKey: Uint8Array): Promise<string> {
  const authKeyBytes = await deriveHkdfKey(masterKey, AUTH_INFO, 32);
  return bytesToBase64(authKeyBytes);
}

/**
 * Derives encKey (32 bytes) used only to wrap/unwrap vaultKey.
 * Kept in memory only as Uint8Array.
 */
export async function deriveEncKey(masterKey: Uint8Array): Promise<Uint8Array> {
  return deriveHkdfKey(masterKey, ENC_INFO, 32);
}
