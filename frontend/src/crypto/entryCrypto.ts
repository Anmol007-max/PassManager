import { encryptAesGcm, decryptAesGcm } from './aead';

export interface EntryPlaintext {
  v: 1;
  site: string;
  username: string;
  password: string;
  notes?: string;
  totpSecret?: string;
  favorite?: boolean;
  category?: 'login' | 'note';
  updatedAtClient: string;
}

export function buildEntryAad(userId: string, entryId: string): string {
  return `pm/entry/v1|${userId}|${entryId}`;
}

export async function encryptEntry(
  vaultKey: CryptoKey,
  userId: string,
  entryId: string,
  entry: Omit<EntryPlaintext, 'v' | 'updatedAtClient'> & Partial<Pick<EntryPlaintext, 'updatedAtClient'>>
): Promise<string> {
  const payload: EntryPlaintext = {
    v: 1,
    site: entry.site,
    username: entry.username,
    password: entry.password,
    notes: entry.notes ?? '',
    totpSecret: entry.totpSecret?.trim() || undefined,
    favorite: !!entry.favorite,
    category: entry.category || 'login',
    updatedAtClient: entry.updatedAtClient ?? new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(payload);
  const plaintextBytes = new TextEncoder().encode(jsonStr);
  const aad = buildEntryAad(userId, entryId);

  return encryptAesGcm(vaultKey, plaintextBytes, aad);
}

export async function decryptEntry(
  vaultKey: CryptoKey,
  userId: string,
  entryId: string,
  encString: string
): Promise<EntryPlaintext> {
  const aad = buildEntryAad(userId, entryId);
  const plaintextBytes = await decryptAesGcm(vaultKey, encString, aad);
  const jsonStr = new TextDecoder().decode(plaintextBytes);
  const parsed = JSON.parse(jsonStr);

  if (parsed.v !== 1 || typeof parsed.site !== 'string' || typeof parsed.username !== 'string' || typeof parsed.password !== 'string') {
    throw new Error('Invalid entry plaintext schema');
  }

  return parsed as EntryPlaintext;
}
