import { argon2id } from 'hash-wasm';
import { base64ToBytes, bytesToBase64, getRandomBytes } from './random';

export interface KdfParams {
  type: 'ARGON2ID' | 'PBKDF2';
  salt: string; // Base64 16 bytes
  iterations: number;
  memoryKib?: number; // Argon2id only
  parallelism?: number; // Argon2id only
}

export const DEFAULT_ARGON2_PARAMS: Omit<KdfParams, 'salt'> = {
  type: 'ARGON2ID',
  iterations: 3,
  memoryKib: 65536, // 64 MiB
  parallelism: 1,
};

export const DEFAULT_PBKDF2_PARAMS: Omit<KdfParams, 'salt'> = {
  type: 'PBKDF2',
  iterations: 600000,
};

/**
 * Generates fresh random 16-byte salt for user KDF.
 */
export function generateKdfSalt(): string {
  return bytesToBase64(getRandomBytes(16));
}

/**
 * Derives a 32-byte masterKey from masterPassword and KdfParams.
 */
export async function deriveMasterKey(
  masterPassword: string,
  params: KdfParams
): Promise<Uint8Array> {
  const saltBytes = base64ToBytes(params.salt);

  if (params.type === 'ARGON2ID') {
    const memory = params.memoryKib ?? 65536;
    const iterations = params.iterations ?? 3;
    const parallelism = params.parallelism ?? 1;

    const rawHex = await argon2id({
      password: masterPassword,
      salt: saltBytes,
      iterations,
      memorySize: memory,
      parallelism,
      hashLength: 32,
      outputType: 'hex',
    });

    const masterKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      masterKey[i] = parseInt(rawHex.substr(i * 2, 2), 16);
    }
    return masterKey;
  } else if (params.type === 'PBKDF2') {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes as any,
        iterations: params.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    return new Uint8Array(bits);
  } else {
    throw new Error(`Unsupported KDF type: ${(params as any).type}`);
  }
}
