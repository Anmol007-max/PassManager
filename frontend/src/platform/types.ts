/**
 * Platform abstraction interface contracts.
 * Decouples the UI and business logic from native plugins and web fallbacks.
 */

export interface IPlatformStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface BiometricStatus {
  available: boolean;
  biometryType: 'fingerprint' | 'face' | 'iris' | 'none';
}

export interface IPlatformBiometric {
  checkAvailability(): Promise<BiometricStatus>;
  authenticate(reason?: string): Promise<boolean>;
  encryptVaultKey(rawVaultKeyBytes: Uint8Array): Promise<string>;
  decryptVaultKey(): Promise<Uint8Array | null>;
  clearBiometricKey(): Promise<void>;
}

export interface IPlatformClipboard {
  copy(text: string, onCopied?: () => void): Promise<void>;
}

export type StateChangeCallback = (isActive: boolean) => void;
export type BackButtonCallback = () => void;

export interface IPlatformLifecycle {
  onStateChange(callback: StateChangeCallback): () => void;
  onBackButton(callback: BackButtonCallback): () => void;
}
