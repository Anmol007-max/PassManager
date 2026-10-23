import { create } from 'zustand';
import { UserSummary } from '../api/auth';
import { EntryPlaintext } from '../crypto/entryCrypto';
import { configureAuthCallbacks } from '../api/client';

export interface DecryptedEntry {
  id: string;
  revision: number;
  keyVersion: number;
  data: EntryPlaintext;
  createdAt: string;
  updatedAt: string;
  corrupted?: boolean;
}

interface SessionState {
  accessToken: string | null;
  user: UserSummary | null;
  vaultKey: CryptoKey | null;
  entries: DecryptedEntry[];
  locked: boolean;
  selectedEntryId: string | null;
  searchQuery: string;
  displayName: string;

  setDisplayName: (name: string) => void;
  setSession: (accessToken: string, user: UserSummary, vaultKey: CryptoKey) => void;
  setAccessToken: (accessToken: string) => void;
  setEntries: (entries: DecryptedEntry[]) => void;
  upsertEntry: (entry: DecryptedEntry) => void;
  removeEntry: (id: string) => void;
  setSelectedEntryId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  lock: () => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  accessToken: null,
  user: null,
  vaultKey: null,
  entries: [],
  locked: true,
  selectedEntryId: null,
  searchQuery: '',
  displayName: localStorage.getItem('pm_display_name') || 'Anmol Mishra',

  setDisplayName: (name: string) => {
    localStorage.setItem('pm_display_name', name);
    set({ displayName: name });
  },

  setSession: (accessToken, user, vaultKey) =>
    set({
      accessToken,
      user,
      vaultKey,
      locked: false,
    }),

  setAccessToken: (accessToken) =>
    set({ accessToken }),

  setEntries: (entries) =>
    set({ entries }),

  upsertEntry: (entry) =>
    set((state) => {
      const existingIdx = state.entries.findIndex((e) => e.id === entry.id);
      if (existingIdx >= 0) {
        const next = [...state.entries];
        next[existingIdx] = entry;
        return { entries: next };
      }
      return { entries: [...state.entries, entry] };
    }),

  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId,
    })),

  setSelectedEntryId: (id) =>
    set({ selectedEntryId: id }),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  lock: () =>
    set({
      accessToken: null,
      vaultKey: null,
      entries: [],
      locked: true,
      selectedEntryId: null,
      searchQuery: '',
    }),

  clearSession: () =>
    set({
      accessToken: null,
      user: null,
      vaultKey: null,
      entries: [],
      locked: true,
      selectedEntryId: null,
      searchQuery: '',
    }),
}));

// Configure API client callbacks with session store
configureAuthCallbacks(
  () => useSessionStore.getState().accessToken,
  (newToken) => useSessionStore.getState().setAccessToken(newToken),
  () => useSessionStore.getState().lock()
);
