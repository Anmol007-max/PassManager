import {
  deriveMasterKey,
  DEFAULT_ARGON2_PARAMS,
  generateKdfSalt,
  type KdfParams,
} from '../crypto/kdf';
import { deriveAuthKey, deriveEncKey } from '../crypto/hkdf';
import {
  generateVaultKey,
  wrapVaultKey,
  unwrapVaultKey,
  unwrapRawVaultKey,
  importVaultKey,
  VAULT_KEY_AAD,
} from '../crypto/vaultKey';
import { encryptEntry, decryptEntry, type EntryPlaintext } from '../crypto/entryCrypto';
import { decryptAesGcm } from '../crypto/aead';
import { wipeBytes } from '../crypto/random';
import {
  preloginApi,
  registerApi,
  loginApi,
  refreshApi,
  logoutApi,
  changePasswordApi,
  type UserSummary,
} from '../api/auth';
import { isNative, platformBiometric, platformStorage } from '../platform';
import {
  listVaultApi,
  createVaultEntryApi,
  updateVaultEntryApi,
  deleteVaultEntryApi,
} from '../api/vault';
import { useSessionStore, type DecryptedEntry } from '../store/session';

class VaultService {
  // Retain wrappedVaultKey in memory for change-password flow
  private currentWrappedVaultKey: string | null = null;

  async register(email: string, masterPassword: string): Promise<UserSummary> {
    if (masterPassword.length < 12) {
      throw new Error('Master password must be at least 12 characters');
    }

    const salt = generateKdfSalt();
    const kdf: KdfParams = {
      ...DEFAULT_ARGON2_PARAMS,
      salt,
    };

    const masterKey = await deriveMasterKey(masterPassword, kdf);
    const authKey = await deriveAuthKey(masterKey);
    const encKey = await deriveEncKey(masterKey);

    const rawVaultKey = generateVaultKey();
    const wrappedVaultKey = await wrapVaultKey(encKey, rawVaultKey);

    wipeBytes(masterKey);
    wipeBytes(encKey);
    wipeBytes(rawVaultKey);

    return registerApi({
      email,
      authKey,
      kdf,
      wrappedVaultKey,
    });
  }

  async login(email: string, masterPassword: string): Promise<void> {
    const prelogin = await preloginApi(email);
    const masterKey = await deriveMasterKey(masterPassword, prelogin.kdf);
    const authKey = await deriveAuthKey(masterKey);
    const encKey = await deriveEncKey(masterKey);

    try {
      const loginRes = await loginApi({ email, authKey });
      this.currentWrappedVaultKey = loginRes.wrappedVaultKey;

      const rawVaultKey = await unwrapRawVaultKey(encKey, loginRes.wrappedVaultKey);

      // Enroll in hardware-backed biometric storage on native if available
      if (isNative) {
        try {
          const bioStatus = await platformBiometric.checkAvailability();
          if (bioStatus.available) {
            await platformBiometric.encryptVaultKey(rawVaultKey);
            await platformStorage.set('lastUserEmail', email);
            await platformStorage.set('lastUserId', loginRes.user.id);
          }
        } catch (e) {
          console.warn('Biometric auto-enrollment skipped:', e);
        }
      }

      const vaultKey = await importVaultKey(rawVaultKey);
      useSessionStore.getState().setSession(loginRes.accessToken, loginRes.user, vaultKey);

      await this.loadVault();
    } finally {
      wipeBytes(masterKey);
      wipeBytes(encKey);
    }
  }

  async unlockWithBiometrics(): Promise<boolean> {
    if (!isNative) return false;

    const rawVaultKey = await platformBiometric.decryptVaultKey();
    if (!rawVaultKey) return false;

    try {
      const email = await platformStorage.get('lastUserEmail');
      const userId = await platformStorage.get('lastUserId');

      // Refresh to acquire fresh access token
      const refreshRes = await refreshApi();
      const vaultKey = await importVaultKey(rawVaultKey);

      const user: UserSummary = {
        id: userId || 'user',
        email: email || '',
      };

      useSessionStore.getState().setSession(refreshRes.accessToken, user, vaultKey);
      await this.loadVault();
      return true;
    } catch (e) {
      console.error('Biometric vault unlock failed:', e);
      return false;
    }
  }

  async loadVault(): Promise<void> {
    const { user, vaultKey } = useSessionStore.getState();
    if (!user || !vaultKey) {
      throw new Error('Vault is locked');
    }

    const listRes = await listVaultApi();
    const decryptedEntries: DecryptedEntry[] = [];

    for (const entry of listRes.entries) {
      try {
        const plaintext = await decryptEntry(vaultKey, user.id, entry.id, entry.data);
        decryptedEntries.push({
          id: entry.id,
          revision: entry.revision,
          keyVersion: entry.keyVersion,
          data: plaintext,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        });
      } catch (err) {
        console.error(`Failed to decrypt entry ${entry.id} (possible tampering)`, err);
        decryptedEntries.push({
          id: entry.id,
          revision: entry.revision,
          keyVersion: entry.keyVersion,
          data: {
            v: 1,
            site: 'Tampered / Corrupted Entry',
            username: '',
            password: '',
            notes: 'Decryption failed for this entry. Authentication tag mismatch.',
            updatedAtClient: entry.updatedAt,
          },
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          corrupted: true,
        });
      }
    }

    useSessionStore.getState().setEntries(decryptedEntries);
  }

  async addEntry(entry: Omit<EntryPlaintext, 'v' | 'updatedAtClient'>): Promise<void> {
    const { user, vaultKey } = useSessionStore.getState();
    if (!user || !vaultKey) throw new Error('Vault is locked');

    const entryId = crypto.randomUUID();
    const encString = await encryptEntry(vaultKey, user.id, entryId, entry);

    const res = await createVaultEntryApi({
      id: entryId,
      data: encString,
      keyVersion: 1,
    });

    const newDecrypted: DecryptedEntry = {
      id: res.id,
      revision: res.revision,
      keyVersion: res.keyVersion,
      data: {
        v: 1,
        site: entry.site,
        username: entry.username,
        password: entry.password,
        notes: entry.notes ?? '',
        totpSecret: entry.totpSecret,
        favorite: entry.favorite,
        category: entry.category,
        updatedAtClient: res.updatedAt,
      },
      createdAt: res.createdAt,
      updatedAt: res.updatedAt,
    };

    useSessionStore.getState().upsertEntry(newDecrypted);
    useSessionStore.getState().setSelectedEntryId(newDecrypted.id);
  }

  async updateEntry(
    id: string,
    revision: number,
    entry: Omit<EntryPlaintext, 'v' | 'updatedAtClient'>
  ): Promise<void> {
    const { user, vaultKey } = useSessionStore.getState();
    if (!user || !vaultKey) throw new Error('Vault is locked');

    // Fresh random IV generated for every update
    const encString = await encryptEntry(vaultKey, user.id, id, entry);

    const res = await updateVaultEntryApi(id, {
      data: encString,
      revision,
    });

    const updated: DecryptedEntry = {
      id: res.id,
      revision: res.revision,
      keyVersion: res.keyVersion,
      data: {
        v: 1,
        site: entry.site,
        username: entry.username,
        password: entry.password,
        notes: entry.notes ?? '',
        totpSecret: entry.totpSecret,
        favorite: entry.favorite,
        category: entry.category,
        updatedAtClient: res.updatedAt,
      },
      createdAt: res.createdAt,
      updatedAt: res.updatedAt,
    };

    useSessionStore.getState().upsertEntry(updated);
  }

  async deleteEntry(id: string): Promise<void> {
    await deleteVaultEntryApi(id);
    useSessionStore.getState().removeEntry(id);
  }

  async changeMasterPassword(currentPw: string, newPw: string): Promise<void> {
    const { user } = useSessionStore.getState();
    if (!user) throw new Error('Not logged in');
    if (!this.currentWrappedVaultKey) throw new Error('Wrapped vault key not available in memory');

    if (newPw.length < 12) {
      throw new Error('New master password must be at least 12 characters');
    }

    // 1. Derive current keys to unwrap raw vaultKey bytes
    const currentPrelogin = await preloginApi(user.email);
    const currentMasterKey = await deriveMasterKey(currentPw, currentPrelogin.kdf);
    const currentAuthKey = await deriveAuthKey(currentMasterKey);
    const currentEncKey = await deriveEncKey(currentMasterKey);

    let rawVaultKey: Uint8Array;
    try {
      rawVaultKey = await decryptAesGcm(currentEncKey, this.currentWrappedVaultKey, VAULT_KEY_AAD);
    } catch {
      wipeBytes(currentMasterKey);
      wipeBytes(currentEncKey);
      throw new Error("That password didn't work. Try again.");
    }

    // 2. Derive new keys and wrap the SAME raw vaultKey
    const newSalt = generateKdfSalt();
    const newKdf: KdfParams = {
      ...DEFAULT_ARGON2_PARAMS,
      salt: newSalt,
    };

    const newMasterKey = await deriveMasterKey(newPw, newKdf);
    const newAuthKey = await deriveAuthKey(newMasterKey);
    const newEncKey = await deriveEncKey(newMasterKey);

    const newWrappedVaultKey = await wrapVaultKey(newEncKey, rawVaultKey);

    wipeBytes(currentMasterKey);
    wipeBytes(currentEncKey);
    wipeBytes(rawVaultKey);
    wipeBytes(newMasterKey);
    wipeBytes(newEncKey);

    await changePasswordApi({
      currentAuthKey,
      newAuthKey,
      newKdf,
      newWrappedVaultKey,
    });

    // Per ARCHITECTURE.md Section 3.8: force logout; user logs in with new password
    await this.logout();
  }

  lock(): void {
    this.currentWrappedVaultKey = null;
    useSessionStore.getState().lock();
  }

  async logout(): Promise<void> {
    this.currentWrappedVaultKey = null;
    try {
      await logoutApi();
    } catch {
      // Ignore network failure on logout
    }
    useSessionStore.getState().clearSession();
  }
}

export const vaultService = new VaultService();
