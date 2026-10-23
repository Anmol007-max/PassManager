/**
 * Platform-aware clipboard abstraction.
 * Uses Capacitor Clipboard plugin on native, navigator.clipboard on web.
 */
import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

import { IPlatformClipboard } from './types';

let clearTimeout_: ReturnType<typeof setTimeout> | null = null;

async function writeNative(text: string): Promise<void> {
  await Clipboard.write({ string: text });
}

async function readNative(): Promise<string> {
  const { value } = await Clipboard.read();
  return value ?? '';
}

async function writeWeb(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

async function readWeb(): Promise<string> {
  return navigator.clipboard.readText();
}

export const platformClipboard: IPlatformClipboard = {
  /**
   * Copy text to clipboard with auto-clear after 30 seconds.
   */
  async copy(text: string, onCopied?: () => void): Promise<void> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      await writeNative(text);
    } else {
      await writeWeb(text);
    }

    onCopied?.();

    // Clear previous timer
    if (clearTimeout_) {
      clearTimeout(clearTimeout_);
    }

    // Auto-clear clipboard after 30 seconds (standard for password managers)
    clearTimeout_ = setTimeout(async () => {
      try {
        const current = isNative ? await readNative() : await readWeb();
        if (current === text) {
          if (isNative) {
            await writeNative('');
          } else {
            await writeWeb('');
          }
        }
      } catch {
        try {
          if (isNative) {
            await writeNative('');
          } else {
            await writeWeb('');
          }
        } catch {
          // Best-effort
        }
      }
    }, 30000);
  },
};
