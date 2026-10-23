/**
 * API client with automatic token attachment and single-flight refresh on 401.
 */
import { API_BASE } from '../config';
import { isNative, platformStorage } from '../platform';

let refreshPromise: Promise<string | null> | null = null;

export interface ApiClientOptions extends RequestInit {
  requiresAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token accessor callbacks configured by session store
let getAccessTokenFn: () => string | null = () => null;
let onTokenRefreshedFn: (token: string) => void = () => {};
let onAuthFailedFn: () => void = () => {};

export function configureAuthCallbacks(
  getAccessToken: () => string | null,
  onTokenRefreshed: (token: string) => void,
  onAuthFailed: () => void
) {
  getAccessTokenFn = getAccessToken;
  onTokenRefreshedFn = onTokenRefreshed;
  onAuthFailedFn = onAuthFailed;
}

async function doRefreshToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        'X-PM-Client': isNative ? 'mobile' : 'web',
        'Content-Type': 'application/json',
      };

      if (isNative) {
        const storedToken = await platformStorage.get('refreshToken');
        if (storedToken) {
          headers['X-PM-Refresh-Token'] = storedToken;
        }
      }

      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        if (isNative) {
          await platformStorage.remove('refreshToken');
        }
        onAuthFailedFn();
        return null;
      }

      const data = await res.json();
      if (isNative && data.refreshToken) {
        await platformStorage.set('refreshToken', data.refreshToken);
      }

      if (data.accessToken) {
        onTokenRefreshedFn(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      if (isNative) {
        await platformStorage.remove('refreshToken');
      }
      onAuthFailedFn();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, ...rest } = options;
  const headers = new Headers(customHeaders);

  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('X-PM-Client')) {
    headers.set('X-PM-Client', isNative ? 'mobile' : 'web');
  }

  if (requiresAuth) {
    const token = getAccessTokenFn();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  let response = await fetch(url, {
    ...rest,
    headers,
    credentials: 'include',
  });

  // If 401 and authenticated request, attempt single silent refresh
  if (response.status === 401 && requiresAuth && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    const newToken = await doRefreshToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, {
        ...rest,
        headers,
        credentials: 'include',
      });
    }
  }

  if (!response.ok) {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = `Request failed with status ${response.status}`;
    let details: any = null;

    try {
      const errJson = await response.json();
      if (errJson.code) errorCode = errJson.code;
      if (errJson.detail) errorMessage = errJson.detail;
      else if (errJson.title) errorMessage = errJson.title;
      details = errJson.errors || null;
    } catch {
      // Non-JSON response
    }

    throw new ApiError(response.status, errorCode, errorMessage, details);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}
