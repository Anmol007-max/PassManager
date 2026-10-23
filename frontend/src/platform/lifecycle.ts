/**
 * Platform-aware app lifecycle abstraction.
 * Uses @capacitor/app on native, visibilitychange on web.
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

import { IPlatformLifecycle, StateChangeCallback, BackButtonCallback } from './types';

export const platformLifecycle: IPlatformLifecycle = {
  /**
   * Listen for app state changes (foreground/background).
   * Returns a cleanup function.
   */
  onStateChange(callback: StateChangeCallback): () => void {
    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener('appStateChange', (state) => {
        callback(state.isActive);
      });
      return () => {
        listener.then((l) => l.remove());
      };
    } else {
      const handler = () => callback(!document.hidden);
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    }
  },

  /**
   * Listen for Android back button.
   * Returns a cleanup function. No-op on web.
   */
  onBackButton(callback: BackButtonCallback): () => void {
    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener('backButton', () => {
        callback();
      });
      return () => {
        listener.then((l) => l.remove());
      };
    }
    return () => {};
  },
};
