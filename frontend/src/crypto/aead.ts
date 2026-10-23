import { base64ToBytes, bytesToBase64, getRandomBytes } from './random';

export interface ParsedEncString {
  version: 'v1';
  iv: Uint8Array;
  ciphertextWithTag: Uint8Array;
}

/**
 * Parses an EncString formatted as: v1.<base64(iv)>.<base64(ciphertext||tag)>
 */
export function parseEncString(encString: string): ParsedEncString {
  if (!encString || typeof encString !== 'string') {
    throw new Error('EncString must be a non-empty string');
  }

  const parts = encString.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid EncString format: must have 3 parts separated by dots');
  }

  const [version, ivB64, ctB64] = parts;
  if (version !== 'v1') {
    throw new Error(`Unsupported EncString version: ${version}`);
  }

  const iv = base64ToBytes(ivB64);
  if (iv.length !== 12) {
    throw new Error(`Invalid IV length: expected 12 bytes, got ${iv.length}`);
  }

  const ct = base64ToBytes(ctB64);
  if (ct.length < 16) {
    throw new Error(`Invalid ciphertext length: expected at least 16 bytes (tag), got ${ct.length}`);
  }

  return {
    version: 'v1',
    iv,
    ciphertextWithTag: ct,
  };
}

/**
 * Formats components into an EncString.
 */
export function formatEncString(iv: Uint8Array, ciphertextWithTag: Uint8Array): string {
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(ciphertextWithTag)}`;
}

/**
 * Encrypts plaintext bytes using AES-256-GCM with fresh 12-byte IV and optional AAD.
 * Returns an EncString: v1.<iv>.<ct>
 */
export async function encryptAesGcm(
  key: CryptoKey | Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array | string
): Promise<string> {
  const cryptoKey = key instanceof Uint8Array
    ? await crypto.subtle.importKey('raw', key as any, { name: 'AES-GCM' }, false, ['encrypt'])
    : key;

  // Rule: Fresh random 12-byte IV for every encryption call
  const iv = getRandomBytes(12);

  const additionalData = aad
    ? typeof aad === 'string'
      ? new TextEncoder().encode(aad)
      : aad
    : undefined;

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
      additionalData: additionalData as any,
      tagLength: 128,
    },
    cryptoKey,
    plaintext as any
  );

  return formatEncString(iv, new Uint8Array(encryptedBuffer));
}

/**
 * Decrypts an EncString using AES-256-GCM and verifies AAD.
 * Throws error if key, IV, ciphertext, or AAD do not match.
 */
export async function decryptAesGcm(
  key: CryptoKey | Uint8Array,
  encString: string,
  aad?: Uint8Array | string
): Promise<Uint8Array> {
  const { iv, ciphertextWithTag } = parseEncString(encString);

  const cryptoKey = key instanceof Uint8Array
    ? await crypto.subtle.importKey('raw', key as any, { name: 'AES-GCM' }, false, ['decrypt'])
    : key;

  const additionalData = aad
    ? typeof aad === 'string'
      ? new TextEncoder().encode(aad)
      : aad
    : undefined;

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
      additionalData: additionalData as any,
      tagLength: 128,
    },
    cryptoKey,
    ciphertextWithTag as any
  );

  return new Uint8Array(decryptedBuffer);
}
