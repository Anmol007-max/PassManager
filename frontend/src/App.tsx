import React, { useState, useEffect, useRef } from 'react';
import { useSessionStore, type DecryptedEntry } from './store/session';
import { vaultService } from './services/vaultService';
import { type EntryPlaintext } from './crypto/entryCrypto';
import { UnlockScreen } from './features/UnlockScreen';
import { VaultScreen } from './features/VaultScreen';
import { CheckupScreen } from './features/CheckupScreen';
import { EntryDetailScreen } from './features/EntryDetailScreen';
import { EntryFormModal } from './components/EntryFormModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { isNative, platformLifecycle } from './platform';

export function App() {
  const locked = useSessionStore((state) => state.locked);
  const entries = useSessionStore((state) => state.entries);
  const selectedEntryId = useSessionStore((state) => state.selectedEntryId);
  const setSelectedEntryId = useSessionStore((state) => state.setSelectedEntryId);
  const displayName = useSessionStore((state) => state.displayName);

  // Active navigation tab: 'passwords' | 'checkup' | 'settings'
  const [activeTab, setActiveTab] = useState<'passwords' | 'checkup' | 'settings'>('passwords');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Snackbar state
  const [toast, setToast] = useState<{ message: string; subtext?: string; onUndo?: () => void } | null>(null);

  // Auto-lock settings (minutes; 0 = never; default 5 min)
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const lastActivityRef = useRef<number>(Date.now());

  const selectedEntry = entries.find((e) => e.id === selectedEntryId);

  const showToast = (message: string, subtext?: string, onUndo?: () => void) => {
    setToast({ message, subtext, onUndo });
  };

  // Activity tracking for auto-lock
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // Android back button handling
  useEffect(() => {
    if (!isNative || locked) return;

    return platformLifecycle.onBackButton(() => {
      if (isAddOpen) setIsAddOpen(false);
      else if (isEditOpen) setIsEditOpen(false);
      else if (isDeleteOpen) setIsDeleteOpen(false);
      else if (isSettingsOpen) setIsSettingsOpen(false);
      else if (selectedEntryId) setSelectedEntryId(null);
      else if (activeTab !== 'passwords') setActiveTab('passwords');
      else {
        vaultService.lock();
        showToast('Vault locked');
      }
    });
  }, [locked, isAddOpen, isEditOpen, isDeleteOpen, isSettingsOpen, selectedEntryId, activeTab]);

  // Keyboard shortcuts (Cmd/Ctrl+L = lock, Cmd/Ctrl+N = new, Esc = back/close)
  useEffect(() => {
    if (locked || isNative) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        vaultService.lock();
        showToast('Vault locked');
        return;
      }

      if (cmdKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAddOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        if (isAddOpen) setIsAddOpen(false);
        else if (isEditOpen) setIsEditOpen(false);
        else if (isDeleteOpen) setIsDeleteOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (selectedEntryId) setSelectedEntryId(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locked, isAddOpen, isEditOpen, isDeleteOpen, isSettingsOpen, selectedEntryId]);

  // Inactivity auto-lock and app background
  useEffect(() => {
    if (locked || autoLockMinutes <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= autoLockMinutes * 60 * 1000) {
        vaultService.lock();
        showToast('Vault auto-locked due to inactivity');
      }
    }, 10000);

    const cleanupLifecycle = platformLifecycle.onStateChange((isActive) => {
      if (!isActive && autoLockMinutes > 0) {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= autoLockMinutes * 60 * 1000) {
          vaultService.lock();
        }
      }
    });

    return () => {
      clearInterval(interval);
      cleanupLifecycle();
    };
  }, [locked, autoLockMinutes]);

  const handleSaveNewEntry = async (entry: Omit<EntryPlaintext, 'v' | 'updatedAtClient'>) => {
    await vaultService.addEntry(entry);
    showToast(entry.category === 'note' ? 'Secure note saved' : 'Password added');
  };

  const handleSaveEditEntry = async (entry: Omit<EntryPlaintext, 'v' | 'updatedAtClient'>) => {
    if (!selectedEntry) return;
    await vaultService.updateEntry(selectedEntry.id, selectedEntry.revision, entry);
    showToast(entry.category === 'note' ? 'Secure note updated' : 'Password updated');
  };

  const handleToggleFavorite = async (entry: DecryptedEntry) => {
    try {
      const updated: Omit<EntryPlaintext, 'v' | 'updatedAtClient'> = {
        site: entry.data.site,
        username: entry.data.username,
        password: entry.data.password,
        notes: entry.data.notes,
        totpSecret: entry.data.totpSecret,
        favorite: !entry.data.favorite,
        category: entry.data.category,
      };
      await vaultService.updateEntry(entry.id, entry.revision, updated);
      showToast(updated.favorite ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      showToast("Couldn't update favorite");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedEntry) return;
    try {
      await vaultService.deleteEntry(selectedEntry.id);
      setSelectedEntryId(null);
      showToast(selectedEntry.data.category === 'note' ? 'Note deleted' : 'Password deleted');
    } catch {
      showToast("Couldn't delete item");
    }
  };

  const navItems = [
    { id: 'passwords' as const, label: 'Passwords', icon: 'key' },
    { id: 'checkup' as const, label: 'Checkup', icon: 'security' },
    { id: 'settings' as const, label: 'Settings', icon: 'settings' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {locked ? (
        <UnlockScreen onUnlockSuccess={() => showToast('Vault unlocked')} />
      ) : (
        <>
          {/* Tablet Navigation Rail (600px - 1023px) */}
          <nav className="m3-nav-rail" aria-label="Navigation Rail">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsAddOpen(true)}
              aria-label="Add password"
              style={{
                width: '48px',
                height: '48px',
                minHeight: '48px',
                padding: 0,
                borderRadius: '16px',
                marginBottom: '16px',
              }}
            >
              <span className="material-symbols-rounded">add</span>
            </button>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`m3-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'settings') setIsSettingsOpen(true);
                  }}
                  style={{ width: '100%' }}
                >
                  <div className="m3-nav-pill">
                    <span className="material-symbols-rounded">{item.icon}</span>
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Navigation Drawer (≥ 1024px) */}
          <nav className="m3-nav-drawer" aria-label="Navigation Drawer">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px 24px 16px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setIsSettingsOpen(true)}
              title="Click to edit your name in Settings"
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-rounded">shield_lock</span>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '18px', lineHeight: 1.2 }}>
                  MyPassWords
                </div>
                <div
                  className="text-caption"
                  style={{
                    color: 'var(--primary)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </div>
              </div>
            </div>

            {/* Extended FAB in Drawer */}
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsAddOpen(true)}
              style={{
                borderRadius: '16px',
                height: '52px',
                marginBottom: '16px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-rounded">add</span>
              <span>Add password</span>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.id === 'settings') setIsSettingsOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isActive ? 'var(--secondary-container)' : 'transparent',
                      color: isActive ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-rounded">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main App Content Area */}
          <main className="app-container">
            {activeTab === 'passwords' && (
              <div className="vault-layout">
                {/* Master Column */}
                <div className={`vault-master ${selectedEntry ? 'has-selection' : ''}`}>
                  <VaultScreen
                    onAddClick={() => setIsAddOpen(true)}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                    onSelectEntry={(id) => setSelectedEntryId(id)}
                    onShowToast={showToast}
                  />
                </div>

                {/* Detail Column (Side-by-side on desktop, replacement view on mobile) */}
                {selectedEntry ? (
                  <div className="vault-detail">
                    <EntryDetailScreen
                      entry={selectedEntry}
                      onBack={() => setSelectedEntryId(null)}
                      onEdit={() => setIsEditOpen(true)}
                      onDelete={() => setIsDeleteOpen(true)}
                      onToggleFavorite={() => handleToggleFavorite(selectedEntry)}
                      onShowToast={showToast}
                    />
                  </div>
                ) : (
                  <div className="vault-detail-empty">
                    <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--outline-variant)' }}>
                      touch_app
                    </span>
                    <span className="title-screen" style={{ fontSize: '18px' }}>No password selected</span>
                    <span className="text-caption">Select an entry from the list to view or edit its details.</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'checkup' && (
              <CheckupScreen
                onSelectEntry={(id) => {
                  setSelectedEntryId(id);
                  setActiveTab('passwords');
                }}
                onAddClick={() => setIsAddOpen(true)}
              />
            )}

            {activeTab === 'settings' && (
              <div style={{ animation: 'fadeIn 200ms ease' }}>
                <h1 className="title-large" style={{ marginBottom: '20px' }}>Settings</h1>
                <SettingsModal
                  isOpen={true}
                  onClose={() => setActiveTab('passwords')}
                  onShowToast={showToast}
                  autoLockMinutes={autoLockMinutes}
                  setAutoLockMinutes={setAutoLockMinutes}
                />
              </div>
            )}
          </main>

          {/* Mobile Extended Floating Action Button (FAB) */}
          {activeTab === 'passwords' && (
            <button
              type="button"
              className="m3-fab"
              onClick={() => setIsAddOpen(true)}
              aria-label="Add password"
            >
              <span className="material-symbols-rounded">add</span>
              <span>Add password</span>
            </button>
          )}

          {/* Mobile Bottom Navigation Bar (< 600px) */}
          <nav className="m3-bottom-nav" aria-label="Bottom Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`m3-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'settings') setIsSettingsOpen(true);
                  }}
                >
                  <div className="m3-nav-pill">
                    <span className="material-symbols-rounded">{item.icon}</span>
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      {/* Add Entry Modal / Bottom Sheet */}
      <EntryFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveNewEntry}
        title="Add Password"
      />

      {/* Edit Entry Modal / Bottom Sheet */}
      {selectedEntry && (
        <EntryFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSave={handleSaveEditEntry}
          initialData={{
            site: selectedEntry.data.site,
            username: selectedEntry.data.username,
            password: selectedEntry.data.password,
            notes: selectedEntry.data.notes,
            totpSecret: selectedEntry.data.totpSecret,
            favorite: selectedEntry.data.favorite,
            category: selectedEntry.data.category,
          }}
          title={selectedEntry.data.category === 'note' ? 'Edit Note' : 'Edit Password'}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {selectedEntry && (
        <DeleteConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          itemName={selectedEntry.data.site}
        />
      )}

      {/* Standalone Settings Modal (when triggered via header avatar or shortcuts) */}
      <SettingsModal
        isOpen={isSettingsOpen && activeTab !== 'settings'}
        onClose={() => setIsSettingsOpen(false)}
        onShowToast={showToast}
        autoLockMinutes={autoLockMinutes}
        setAutoLockMinutes={setAutoLockMinutes}
      />

      {/* Material 3 Snackbar Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          subtext={toast.subtext}
          onUndo={toast.onUndo}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
