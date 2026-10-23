/**
 * Cryptographic randomness and byte conversion utilities.
 * Uses Web Crypto API exclusively. Never Math.random.
 */

export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Best-effort zeroing of sensitive buffers in memory.
 * Note: JavaScript runtime/GC cannot guarantee complete eradication,
 * but this is defense-in-depth best practice.
 */
export function wipeBytes(bytes: Uint8Array): void {
  bytes.fill(0);
}
