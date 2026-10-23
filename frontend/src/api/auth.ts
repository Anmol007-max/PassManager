import { apiClient } from './client';
import { KdfParams } from '../crypto/kdf';

import { isNative, platformStorage } from '../platform';

export interface PreloginResponse {
  kdf: KdfParams;
}

export interface UserSummary {
  id: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  authKey: string;
  kdf: KdfParams;
  wrappedVaultKey: string;
}

export interface LoginRequest {
  email: string;
  authKey: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: UserSummary;
  wrappedVaultKey: string;
  refreshToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}

export interface ChangePasswordRequest {
  currentAuthKey: string;
  newAuthKey: string;
  newKdf: KdfParams;
  newWrappedVaultKey: string;
}

export async function preloginApi(email: string): Promise<PreloginResponse> {
  return apiClient<PreloginResponse>('/api/auth/prelogin', {
    method: 'POST',
    requiresAuth: false,
    headers: {
      'X-PM-Client': isNative ? 'mobile' : 'web',
    },
    body: JSON.stringify({ email }),
  });
}

export async function registerApi(request: RegisterRequest): Promise<UserSummary> {
  return apiClient<UserSummary>('/api/auth/register', {
    method: 'POST',
    requiresAuth: false,
    headers: {
      'X-PM-Client': isNative ? 'mobile' : 'web',
    },
    body: JSON.stringify(request),
  });
}

export async function loginApi(request: LoginRequest): Promise<LoginResponse> {
  const resp = await apiClient<LoginResponse>('/api/auth/login', {
    method: 'POST',
    requiresAuth: false,
    headers: {
      'X-PM-Client': isNative ? 'mobile' : 'web',
    },
    body: JSON.stringify(request),
  });

  if (isNative && resp.refreshToken) {
    await platformStorage.set('refreshToken', resp.refreshToken);
  }

  return resp;
}

export async function refreshApi(): Promise<RefreshResponse> {
  const headers: Record<string, string> = {
    'X-PM-Client': isNative ? 'mobile' : 'web',
  };

  if (isNative) {
    const stored = await platformStorage.get('refreshToken');
    if (stored) {
      headers['X-PM-Refresh-Token'] = stored;
    }
  }

  const resp = await apiClient<RefreshResponse>('/api/auth/refresh', {
    method: 'POST',
    requiresAuth: false,
    headers,
  });

  if (isNative && resp.refreshToken) {
    await platformStorage.set('refreshToken', resp.refreshToken);
  }

  return resp;
}

export async function logoutApi(): Promise<void> {
  const headers: Record<string, string> = {
    'X-PM-Client': isNative ? 'mobile' : 'web',
  };

  if (isNative) {
    const stored = await platformStorage.get('refreshToken');
    if (stored) {
      headers['X-PM-Refresh-Token'] = stored;
    }
  }

  try {
    await apiClient<void>('/api/auth/logout', {
      method: 'POST',
      requiresAuth: false,
      headers,
    });
  } finally {
    if (isNative) {
      await platformStorage.remove('refreshToken');
    }
  }
}

export async function changePasswordApi(request: ChangePasswordRequest): Promise<void> {
  return apiClient<void>('/api/auth/change-password', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(request),
  });
}
