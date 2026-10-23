/**
 * Platform-aware secure storage abstraction.
 * Uses @aparajita/capacitor-secure-storage on native, in-memory on web.
 */
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

import { IPlatformStorage } from './types';

// In-memory fallback for web (tokens already handled by httpOnly cookies on web)
const memoryStore = new Map<string, string>();

export const platformStorage: IPlatformStorage = {
  async set(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await SecureStorage.setItem(key, value);
    } else {
      memoryStore.set(key, value);
    }
  },

  async get(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      const result = await SecureStorage.getItem(key);
      return result ?? null;
    } else {
      return memoryStore.get(key) ?? null;
    }
  },

  async remove(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await SecureStorage.removeItem(key);
    } else {
      memoryStore.delete(key);
    }
  },

  async clear(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await SecureStorage.clear();
    } else {
      memoryStore.clear();
    }
  },
};
