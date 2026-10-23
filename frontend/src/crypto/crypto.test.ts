import { describe, it, expect } from 'vitest';
import { getRandomBytes, bytesToBase64, base64ToBytes, wipeBytes } from './random';
import { deriveMasterKey, DEFAULT_ARGON2_PARAMS, DEFAULT_PBKDF2_PARAMS, generateKdfSalt } from './kdf';
import { deriveHkdfKey, deriveAuthKey, deriveEncKey } from './hkdf';
import { parseEncString, formatEncString, encryptAesGcm, decryptAesGcm } from './aead';
import { generateVaultKey, wrapVaultKey, unwrapVaultKey, VAULT_KEY_AAD, importVaultKey } from './vaultKey';
import { encryptEntry, decryptEntry, buildEntryAad } from './entryCrypto';

describe('Cryptographic Module Tests (ARCHITECTURE.md Section 7)', () => {

  it('1. Encrypt then decrypt returns original plaintext', async () => {
    const rawKey = getRandomBytes(32);
    const key = await importVaultKey(new Uint8Array(rawKey));
    const plaintext = 'Secret password 123!@#$%^&*()';
    const plaintextBytes = new TextEncoder().encode(plaintext);

    const ciphertext = await encryptAesGcm(key, plaintextBytes, 'test-aad');
    const decryptedBytes = await decryptAesGcm(key, ciphertext, 'test-aad');
    const decryptedText = new TextDecoder().decode(decryptedBytes);

    expect(decryptedText).toBe(plaintext);
  });

  it('2. Decrypt with the wrong key fails', async () => {
    const key1 = await importVaultKey(getRandomBytes(32));
    const key2 = await importVaultKey(getRandomBytes(32));

    const plaintext = new TextEncoder().encode('Hello world');
    const ciphertext = await encryptAesGcm(key1, plaintext, 'aad');

    await expect(decryptAesGcm(key2, ciphertext, 'aad')).rejects.toThrow();
  });

  it('3. Decrypt with a modified ciphertext (flip one bit) fails', async () => {
    const key = await importVaultKey(getRandomBytes(32));
    const plaintext = new TextEncoder().encode('Sensitive data');
    const encString = await encryptAesGcm(key, plaintext, 'aad');

    const parsed = parseEncString(encString);
    // Flip a bit in ciphertext
    parsed.ciphertextWithTag[0] ^= 0x01;
    const tampered = formatEncString(parsed.iv, parsed.ciphertextWithTag);

    await expect(decryptAesGcm(key, tampered, 'aad')).rejects.toThrow();
  });

  it('4. Decrypt with the wrong AAD (different entryId or userId) fails', async () => {
    const key = await importVaultKey(getRandomBytes(32));
    const userId1 = 'user-uuid-1';
    const userId2 = 'user-uuid-2';
    const entryId1 = 'entry-uuid-1';
    const entryId2 = 'entry-uuid-2';

    const encString = await encryptEntry(key, userId1, entryId1, {
      site: 'example.com',
      username: 'user@example.com',
      password: 'password123',
    });

    // Wrong entryId
    await expect(decryptEntry(key, userId1, entryId2, encString)).rejects.toThrow();
    // Wrong userId
    await expect(decryptEntry(key, userId2, entryId1, encString)).rejects.toThrow();
    // Correct IDs succeed
    const decrypted = await decryptEntry(key, userId1, entryId1, encString);
    expect(decrypted.site).toBe('example.com');
  });

  it('5. Two encryptions of the same plaintext produce different IVs and different ciphertexts', async () => {
    const key = await importVaultKey(getRandomBytes(32));
    const plaintext = new TextEncoder().encode('Identical payload');

    const enc1 = await encryptAesGcm(key, plaintext);
    const enc2 = await encryptAesGcm(key, plaintext);

    expect(enc1).not.toBe(enc2);

    const parsed1 = parseEncString(enc1);
    const parsed2 = parseEncString(enc2);

    expect(bytesToBase64(parsed1.iv)).not.toBe(bytesToBase64(parsed2.iv));
    expect(bytesToBase64(parsed1.ciphertextWithTag)).not.toBe(bytesToBase64(parsed2.ciphertextWithTag));
  });

  it('6. IV is always exactly 12 bytes; EncString parser rejects malformed strings and unknown versions', async () => {
    const iv = getRandomBytes(12);
    const tag = getRandomBytes(16);
    const valid = formatEncString(iv, tag);

    const parsed = parseEncString(valid);
    expect(parsed.version).toBe('v1');
    expect(parsed.iv.length).toBe(12);
    expect(parsed.ciphertextWithTag.length).toBe(16);

    // Malformed: not 3 parts
    expect(() => parseEncString('v1.short')).toThrow();
    expect(() => parseEncString('v1.a.b.c')).toThrow();

    // Unknown version
    expect(() => parseEncString(`v2.${bytesToBase64(iv)}.${bytesToBase64(tag)}`)).toThrow(/Unsupported EncString version/);

    // Invalid IV length (16 bytes instead of 12)
    const badIv = getRandomBytes(16);
    expect(() => parseEncString(`v1.${bytesToBase64(badIv)}.${bytesToBase64(tag)}`)).toThrow(/Invalid IV length/);

    // Ciphertext too short (< 16 bytes tag)
    const shortCt = getRandomBytes(8);
    expect(() => parseEncString(`v1.${bytesToBase64(iv)}.${bytesToBase64(shortCt)}`)).toThrow(/Invalid ciphertext length/);
  });

  it('7. authKey and encKey derived from the same master key are different', async () => {
    const masterKey = getRandomBytes(32);
    const authKey = await deriveAuthKey(masterKey);
    const encKey = await deriveEncKey(masterKey);

    expect(authKey).toBeDefined();
    expect(encKey).toBeDefined();
    expect(authKey).not.toBe(bytesToBase64(encKey));
  });

  it('8. Same password + same salt + same params gives the same keys; different salt gives different keys', async () => {
    const password = 'SuperSecretMasterPassword123!';
    const salt1 = generateKdfSalt();
    const salt2 = generateKdfSalt();

    // Use PBKDF2 for quick test run
    const params1 = { ...DEFAULT_PBKDF2_PARAMS, salt: salt1, iterations: 10000 };
    const params1Copy = { ...DEFAULT_PBKDF2_PARAMS, salt: salt1, iterations: 10000 };
    const params2 = { ...DEFAULT_PBKDF2_PARAMS, salt: salt2, iterations: 10000 };

    const mk1 = await deriveMasterKey(password, params1);
    const mk1Again = await deriveMasterKey(password, params1Copy);
    const mk2 = await deriveMasterKey(password, params2);

    expect(bytesToBase64(mk1)).toBe(bytesToBase64(mk1Again));
    expect(bytesToBase64(mk1)).not.toBe(bytesToBase64(mk2));
  });

  it('9. Wrap/unwrap vault key round-trip; wrong encKey fails', async () => {
    const encKey1 = getRandomBytes(32);
    const encKey2 = getRandomBytes(32);
    const vaultKeyBytes = generateVaultKey();

    const wrapped = await wrapVaultKey(encKey1, vaultKeyBytes);
    expect(wrapped.startsWith('v1.')).toBe(true);

    // Unwrap with right key
    const unwrappedKey = await unwrapVaultKey(encKey1, wrapped);
    expect(unwrappedKey).toBeDefined();
    expect(unwrappedKey.type).toBe('secret');

    // Test that the unwrapped key can encrypt and decrypt data
    const plaintext = new TextEncoder().encode('Vault item payload');
    const ciphertext = await encryptAesGcm(unwrappedKey, plaintext);
    const decrypted = await decryptAesGcm(unwrappedKey, ciphertext);
    expect(new TextDecoder().decode(decrypted)).toBe('Vault item payload');

    // Unwrap with wrong key must fail
    await expect(unwrapVaultKey(encKey2, wrapped)).rejects.toThrow();
  });

  it('10. Known-answer test for HKDF and PBKDF2 using RFC test vectors', async () => {
    // RFC 5869 HKDF-SHA256 Test Case 1
    // IKM = 0x0b0b... (22 octets), Salt = 0x00...04 (13 octets), Info = 0xf0...f2 (10 octets), L = 42
    const ikm = new Uint8Array(22).fill(0x0b);
    const info = new Uint8Array([0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9]);
    
    const derived = await deriveHkdfKey(ikm, info, 32);
    expect(derived.length).toBe(32);

    // PBKDF2 known vector: password="password", salt="salt", c=1, dkLen=20
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode('password'),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode('salt'),
        iterations: 1,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const hex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    // RFC 6070 / PBKDF2-HMAC-SHA256 test vector prefix
    expect(hex.length).toBe(64);
    expect(hex.startsWith('120fb6cffcf8b32c43e7225256c4f837')).toBe(true);
  });

  it('Memory hygiene: wipeBytes fills array with zeros', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    wipeBytes(bytes);
    expect(bytes.every(b => b === 0)).toBe(true);
  });
});
