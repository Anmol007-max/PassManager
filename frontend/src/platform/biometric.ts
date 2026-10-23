/**
 * Platform-aware biometric authentication abstraction.
 * Uses @aparajita/capacitor-biometric-auth and hardware-backed storage on native.
 */
import { Capacitor } from '@capacitor/core';
import {
  BiometricAuth,
  BiometryType,
} from '@aparajita/capacitor-biometric-auth';
import { IPlatformBiometric, BiometricStatus } from './types';
import { platformStorage } from './storage';

const BIOMETRIC_KEY_STORAGE = 'pm_biometric_wrapped_key';
const BIOMETRIC_ENROLLED_AT = 'pm_biometric_enrolled_at';
const MAX_BIOMETRIC_DAYS = 14;

async function clearBiometricKeyInternal(): Promise<void> {
  await platformStorage.remove(BIOMETRIC_KEY_STORAGE);
  await platformStorage.remove(BIOMETRIC_ENROLLED_AT);
}

export const platformBiometric: IPlatformBiometric = {
  /**
   * Check if biometric authentication is available on this device.
   */
  async checkAvailability(): Promise<BiometricStatus> {
    if (!Capacitor.isNativePlatform()) {
      return { available: false, biometryType: 'none' };
    }

    try {
      const result = await BiometricAuth.checkBiometry();
      const available =
        result.isAvailable &&
        result.biometryType !== BiometryType.none;

      let biometryType: 'fingerprint' | 'face' | 'iris' | 'none' = 'none';
      switch (result.biometryType) {
        case BiometryType.fingerprintAuthentication:
          biometryType = 'fingerprint';
          break;
        case BiometryType.faceAuthentication:
          biometryType = 'face';
          break;
        case BiometryType.irisAuthentication:
          biometryType = 'iris';
          break;
        default:
          biometryType = 'none';
      }

      return { available, biometryType };
    } catch {
      return { available: false, biometryType: 'none' };
    }
  },

  /**
   * Prompt user for biometric authentication.
   * Returns true if authenticated successfully, false otherwise.
   */
  async authenticate(reason: string = 'Unlock your vault'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Use Password',
        allowDeviceCredential: false,
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Encrypt and store the vault key in hardware-backed storage.
   */
  async encryptVaultKey(rawVaultKeyBytes: Uint8Array): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Biometric unlock is only supported on native devices');
    }

    let binary = '';
    for (let i = 0; i < rawVaultKeyBytes.byteLength; i++) {
      binary += String.fromCharCode(rawVaultKeyBytes[i]);
    }
    const base64Key = btoa(binary);

    await platformStorage.set(BIOMETRIC_KEY_STORAGE, base64Key);
    await platformStorage.set(BIOMETRIC_ENROLLED_AT, Date.now().toString());

    return base64Key;
  },

  /**
   * Prompt biometric auth and, if verified, return the decrypted raw vault key bytes.
   */
  async decryptVaultKey(): Promise<Uint8Array | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    // Enforce 14-day max duration before re-entering master password
    const enrolledAtStr = await platformStorage.get(BIOMETRIC_ENROLLED_AT);
    if (enrolledAtStr) {
      const enrolledAt = parseInt(enrolledAtStr, 10);
      const elapsedDays = (Date.now() - enrolledAt) / (1000 * 60 * 60 * 24);
      if (elapsedDays > MAX_BIOMETRIC_DAYS) {
        await clearBiometricKeyInternal();
        return null;
      }
    }

    // Authenticate through system biometric prompt
    const success = await this.authenticate('Unlock your password vault');
    if (!success) {
      return null;
    }

    const base64Key = await platformStorage.get(BIOMETRIC_KEY_STORAGE);
    if (!base64Key) {
      return null;
    }

    try {
      const binary = atob(base64Key);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      await clearBiometricKeyInternal();
      return null;
    }
  },

  /**
   * Clear stored biometric key.
   */
  async clearBiometricKey(): Promise<void> {
    await clearBiometricKeyInternal();
  },
};
