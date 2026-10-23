import React, { useState, useMemo, useRef } from 'react';
import { vaultService } from '../services/vaultService';
import { useSessionStore } from '../store/session';
import { auditVault } from '../lib/securityAudit';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, sub?: string) => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (min: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  autoLockMinutes,
  setAutoLockMinutes,
}) => {
  const [view, setView] = useState<'main' | 'changePassword' | 'audit'>('main');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const entries = useSessionStore((state) => state.entries);
  const user = useSessionStore((state) => state.user);
  const displayName = useSessionStore((state) => state.displayName);
  const setDisplayName = useSessionStore((state) => state.setDisplayName);
  const [nameInput, setNameInput] = useState(displayName);

  const audit = useMemo(() => auditVault(entries), [entries]);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 12) {
      setError('New master password must be at least 12 characters');
      return;
    }
    if (newPw !== confirmPw) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await vaultService.changeMasterPassword(currentPw, newPw);
      onShowToast('Master password changed. Please log in.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change master password');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      vaultCount: entries.length,
      entries: entries.map((e) => ({
        site: e.data.site,
        username: e.data.username,
        password: e.data.password,
        notes: e.data.notes,
        totpSecret: e.data.totpSecret,
        favorite: e.data.favorite,
        category: e.data.category,
        updatedAt: e.data.updatedAtClient,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Vault backup exported');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const itemsToImport = Array.isArray(parsed) ? parsed : parsed.entries;

      if (!Array.isArray(itemsToImport) || itemsToImport.length === 0) {
        throw new Error('No valid entries found in file');
      }

      let importedCount = 0;
      for (const item of itemsToImport) {
        if (item.site && item.password) {
          await vaultService.addEntry({
            site: item.site,
            username: item.username || '',
            password: item.password,
            notes: item.notes || '',
            totpSecret: item.totpSecret,
            favorite: !!item.favorite,
            category: item.category || 'login',
          });
          importedCount++;
        }
      }

      onShowToast(`Imported ${importedCount} items`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import vault file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '0 24px 24px 24px' }}>
        <div className="m3-drag-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 20px 0' }}>
          <span className="title-screen">
            {view === 'main' ? 'Settings' : view === 'audit' ? 'Security Health' : 'Change Master Password'}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ color: 'var(--on-surface-variant)', padding: '6px', display: 'flex' }}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--error-container)',
              color: 'var(--on-error-container)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {view === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* User Profile Card */}
            <div className="card-grouped" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div
                  className="avatar"
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--on-primary)',
                    fontSize: '20px',
                    fontWeight: 600,
                  }}
                >
                  {nameInput ? nameInput.charAt(0).toUpperCase() : 'A'}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="text-body" style={{ fontWeight: 600 }}>{displayName}</div>
                  <div className="text-caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email || 'Local Vault Account'}
                  </div>
                </div>
              </div>

              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Your Name</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter your name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const finalName = nameInput.trim() || 'Anmol Mishra';
                        setDisplayName(finalName);
                        onShowToast(`Name saved as ${finalName}`);
                      }
                    }}
                    style={{ minHeight: '44px' }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      const finalName = nameInput.trim() || 'Anmol Mishra';
                      setDisplayName(finalName);
                      onShowToast(`Name saved as ${finalName}`);
                    }}
                    style={{ width: 'auto', minWidth: '80px', minHeight: '44px', padding: '0 16px' }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Security Audit Row */}
            <div className="card-grouped">
              <div className="row-item" onClick={() => setView('audit')} style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '24px' }}>
                    security
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="text-body" style={{ fontWeight: 500 }}>Password Checkup</span>
                    <span className="text-caption">
                      {audit.weakCount + audit.reusedCount === 0
                        ? 'All passwords look strong'
                        : `${audit.weakCount} weak, ${audit.reusedCount} reused`}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-rounded" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
              </div>
            </div>

            {/* General Preferences */}
            <div className="card-grouped">
              <div className="row-item" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)', fontSize: '22px' }}>
                    timer
                  </span>
                  <span className="text-body">Auto-Lock</span>
                </div>
                <select
                  value={autoLockMinutes}
                  onChange={(e) => {
                    const min = parseInt(e.target.value, 10);
                    setAutoLockMinutes(min);
                    onShowToast(`Auto-lock set to ${min === 0 ? 'Never' : `${min} min`}`);
                  }}
                  style={{
                    border: '1px solid var(--outline-variant)',
                    backgroundColor: 'var(--surface-container-high)',
                    borderRadius: 'var(--radius-chip)',
                    color: 'var(--primary)',
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '6px 12px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={0}>Never</option>
                </select>
              </div>

              <div className="row-item" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)', fontSize: '22px' }}>
                    content_paste_off
                  </span>
                  <span className="text-body">Clipboard Auto-Clear</span>
                </div>
                <span className="text-caption" style={{ fontWeight: 500 }}>15 seconds</span>
              </div>
            </div>

            {/* Data Management: Export & Import */}
            <div className="card-grouped">
              <div className="row-item" onClick={handleExport} style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)', fontSize: '22px' }}>
                    download
                  </span>
                  <span className="text-body">Export Vault</span>
                </div>
                <span className="text-caption">{entries.length} items</span>
              </div>

              <div
                className="row-item"
                onClick={() => fileInputRef.current?.click()}
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)', fontSize: '22px' }}>
                    upload
                  </span>
                  <span className="text-body">{importing ? 'Importing...' : 'Import Vault'}</span>
                </div>
                <span className="text-caption">JSON backup</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
              />

              <div
                className="row-item"
                onClick={() => setView('changePassword')}
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)', fontSize: '22px' }}>
                    password
                  </span>
                  <span className="text-body">Change Master Password</span>
                </div>
                <span className="material-symbols-rounded" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
              </div>
            </div>

            {/* Lock and Logout */}
            <div className="card-grouped">
              <div
                className="row-item"
                onClick={() => {
                  vaultService.lock();
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)' }}>
                  <span className="material-symbols-rounded">lock</span>
                  <span className="text-body" style={{ fontWeight: 500, color: 'var(--primary)' }}>Lock Vault Now</span>
                </div>
              </div>

              <div
                className="row-item"
                onClick={() => {
                  vaultService.logout();
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--error)' }}>
                  <span className="material-symbols-rounded">logout</span>
                  <span className="text-body" style={{ fontWeight: 500, color: 'var(--error)' }}>Log Out</span>
                </div>
              </div>
            </div>

            <p className="text-caption" style={{ textAlign: 'center', padding: '8px 0' }}>
              Protected by zero-knowledge client-side encryption.
            </p>
          </div>
        )}

        {view === 'audit' && (
          <div>
            <button
              type="button"
              className="btn-text"
              onClick={() => setView('main')}
              style={{ marginBottom: '16px', padding: 0 }}
            >
              <span className="material-symbols-rounded">arrow_back</span>
              <span>Back to Settings</span>
            </button>

            <div className="card-grouped" style={{ marginBottom: '20px' }}>
              <div className="row-item" style={{ justifyContent: 'space-between' }}>
                <span className="text-body">Total Passwords</span>
                <span className="text-body text-mono" style={{ fontWeight: 600 }}>{audit.total}</span>
              </div>
              <div className="row-item" style={{ justifyContent: 'space-between' }}>
                <span className="text-body">Weak Passwords</span>
                <span className="text-body text-mono" style={{ fontWeight: 600, color: audit.weakCount > 0 ? 'var(--error)' : 'var(--success)' }}>
                  {audit.weakCount}
                </span>
              </div>
              <div className="row-item" style={{ justifyContent: 'space-between' }}>
                <span className="text-body">Reused Passwords</span>
                <span className="text-body text-mono" style={{ fontWeight: 600, color: audit.reusedCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {audit.reusedCount}
                </span>
              </div>
              <div className="row-item" style={{ justifyContent: 'space-between' }}>
                <span className="text-body">Protected with 2FA</span>
                <span className="text-body text-mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{audit.totpCount}</span>
              </div>
            </div>

            <p className="text-caption" style={{ textAlign: 'center', lineHeight: 1.4 }}>
              Using unique, high-entropy passwords for every website stops credential stuffing and account takeovers.
            </p>
          </div>
        )}

        {view === 'changePassword' && (
          <form onSubmit={handleChangePassword}>
            <button
              type="button"
              className="btn-text"
              onClick={() => {
                setView('main');
                setError(null);
              }}
              style={{ marginBottom: '16px', padding: 0 }}
            >
              <span className="material-symbols-rounded">arrow_back</span>
              <span>Back to Settings</span>
            </button>

            <div className="field-group">
              <label className="field-label">Current Master Password</label>
              <input
                type="password"
                className="input-field"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="field-group">
              <label className="field-label">New Master Password (min 12 characters)</label>
              <input
                type="password"
                className="input-field"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                className="btn-tonal"
                onClick={() => setView('main')}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: 'auto', minWidth: '160px' }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
