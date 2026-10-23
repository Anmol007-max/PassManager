/**
 * Platform detection and re-exports.
 * All platform-specific code goes through this module so the rest of the app
 * never needs to check Capacitor.isNativePlatform() directly.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';

export { platformClipboard } from './clipboard';
export { platformStorage } from './storage';
export { platformBiometric } from './biometric';
export { platformLifecycle } from './lifecycle';
