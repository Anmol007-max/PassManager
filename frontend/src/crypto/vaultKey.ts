import { getRandomBytes, wipeBytes } from './random';
import { encryptAesGcm, decryptAesGcm } from './aead';

export const VAULT_KEY_AAD = 'pm/vk/v1';

/**
 * Generates a fresh random 32-byte vaultKey.
 */
export function generateVaultKey(): Uint8Array {
  return getRandomBytes(32);
}

/**
 * Wraps vaultKey using encKey with AES-256-GCM and AAD "pm/vk/v1".
 * Returns an EncString.
 */
export async function wrapVaultKey(
  encKey: Uint8Array,
  vaultKey: Uint8Array
): Promise<string> {
  return encryptAesGcm(encKey, vaultKey, VAULT_KEY_AAD);
}

/**
 * Imports raw vaultKey bytes into a NON-extractable Web Crypto CryptoKey.
 * Wipes the raw byte array afterwards for memory defense-in-depth.
 */
export async function importVaultKey(rawVaultKey: Uint8Array): Promise<CryptoKey> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawVaultKey as any,
    { name: 'AES-GCM' },
    false, // NON-extractable: JavaScript cannot read back the raw key bytes
    ['encrypt', 'decrypt']
  );
  wipeBytes(rawVaultKey);
  return cryptoKey;
}

/**
 * Unwraps wrappedVaultKey using encKey with AAD "pm/vk/v1" and returns raw 32 bytes.
 * Caller MUST wipeBytes(rawKeyBytes) when finished.
 */
export async function unwrapRawVaultKey(
  encKey: Uint8Array,
  wrappedVaultKey: string
): Promise<Uint8Array> {
  const rawKeyBytes = await decryptAesGcm(encKey, wrappedVaultKey, VAULT_KEY_AAD);
  if (rawKeyBytes.length !== 32) {
    wipeBytes(rawKeyBytes);
    throw new Error(`Invalid vault key length: expected 32 bytes, got ${rawKeyBytes.length}`);
  }
  return rawKeyBytes;
}

/**
 * Unwraps wrappedVaultKey using encKey with AAD "pm/vk/v1",
 * and returns a NON-extractable CryptoKey.
 */
export async function unwrapVaultKey(
  encKey: Uint8Array,
  wrappedVaultKey: string
): Promise<CryptoKey> {
  const rawKeyBytes = await unwrapRawVaultKey(encKey, wrappedVaultKey);
  return await importVaultKey(rawKeyBytes);
}
