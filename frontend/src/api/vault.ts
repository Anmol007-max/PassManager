import { apiClient } from './client';

export interface VaultEntryResponse {
  id: string;
  data: string;
  keyVersion: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface VaultListResponse {
  entries: VaultEntryResponse[];
}

export interface VaultEntryCreateRequest {
  id: string;
  data: string;
  keyVersion: number;
}

export interface VaultEntryUpdateRequest {
  data: string;
  revision: number;
}

export async function listVaultApi(): Promise<VaultListResponse> {
  return apiClient<VaultListResponse>('/api/vault', {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function createVaultEntryApi(request: VaultEntryCreateRequest): Promise<VaultEntryResponse> {
  return apiClient<VaultEntryResponse>('/api/vault', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(request),
  });
}

export async function updateVaultEntryApi(
  id: string,
  request: VaultEntryUpdateRequest
): Promise<VaultEntryResponse> {
  return apiClient<VaultEntryResponse>(`/api/vault/${id}`, {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(request),
  });
}

export async function deleteVaultEntryApi(id: string): Promise<void> {
  return apiClient<void>(`/api/vault/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}
