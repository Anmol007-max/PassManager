import React, { useState, useEffect } from 'react';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import { evaluatePasswordStrength } from '../lib/passwordStrength';
import { checkPwnedPassword } from '../lib/haveIBeenPwned';
import { EntryPlaintext } from '../crypto/entryCrypto';

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<EntryPlaintext, 'v' | 'updatedAtClient'>) => Promise<void>;
  initialData?: Partial<EntryPlaintext>;
  title: string;
}

export const EntryFormModal: React.FC<EntryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
}) => {
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [category, setCategory] = useState<'login' | 'note'>('login');

  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpField, setShowTotpField] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breachCount, setBreachCount] = useState<number | null>(null);
  const [checkingBreach, setCheckingBreach] = useState(false);

  useEffect(() => {
    if (initialData) {
      setSite(initialData.site || '');
      setUsername(initialData.username || '');
      setPassword(initialData.password || '');
      setNotes(initialData.notes || '');
      setTotpSecret(initialData.totpSecret || '');
      setFavorite(!!initialData.favorite);
      setCategory(initialData.category || 'login');
      setShowTotpField(!!initialData.totpSecret);
    } else {
      setSite('');
      setUsername('');
      setPassword('');
      setNotes('');
      setTotpSecret('');
      setFavorite(false);
      setCategory('login');
      setShowTotpField(false);
    }
    setError(null);
    setBreachCount(null);
  }, [initialData, isOpen]);

  const strength = evaluatePasswordStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['var(--error)', 'var(--error)', 'var(--warning)', 'var(--success)', 'var(--success)'];

  const handleBreachCheck = async () => {
    if (!password) return;
    setCheckingBreach(true);
    try {
      const count = await checkPwnedPassword(password);
      setBreachCount(count);
    } finally {
      setCheckingBreach(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!site.trim()) {
      setError('Please enter a title or website');
      return;
    }
    if (category === 'login' && !password) {
      setError('Please enter a password');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        site: site.trim(),
        username: username.trim(),
        password: password || '—',
        notes: notes.trim(),
        totpSecret: totpSecret.trim() || undefined,
        favorite,
        category,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ padding: '0 24px 24px 24px' }}
        >
          {/* Mobile Drag Handle */}
          <div className="m3-drag-handle" />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 20px 0' }}>
            <span className="title-screen">{title}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                color: 'var(--on-surface-variant)',
                padding: '6px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
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

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                type="button"
                className={`m3-chip ${category === 'login' ? 'active' : ''}`}
                onClick={() => setCategory('login')}
              >
                {category === 'login' && <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span>}
                <span>Login</span>
              </button>
              <button
                type="button"
                className={`m3-chip ${category === 'note' ? 'active' : ''}`}
                onClick={() => setCategory('note')}
              >
                {category === 'note' && <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span>}
                <span>Secure Note</span>
              </button>
            </div>

            {/* Site / Title Field */}
            <div className="field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="field-label">{category === 'login' ? 'Website or Service' : 'Title'}</label>
                <button
                  type="button"
                  onClick={() => setFavorite(!favorite)}
                  style={{
                    color: favorite ? 'var(--warning)' : 'var(--on-surface-variant)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    padding: '2px 6px',
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    {favorite ? 'star' : 'star_outline'}
                  </span>
                  <span>{favorite ? 'Starred' : 'Star'}</span>
                </button>
              </div>
              <input
                type="text"
                className="input-field"
                placeholder={category === 'login' ? 'google.com' : 'Tax PIN / Wi-Fi'}
                value={site}
                onChange={(e) => setSite(e.target.value)}
                autoFocus
                required
              />
            </div>

            {category === 'login' && (
              <>
                {/* Username */}
                <div className="field-group">
                  <label className="field-label">Username or Email</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="user@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                {/* Password with trailing actions */}
                <div className="field-group">
                  <label className="field-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field mono"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setBreachCount(null);
                      }}
                      autoComplete="off"
                      required={category === 'login'}
                      style={{ paddingRight: '88px' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{ padding: '6px', color: 'var(--on-surface-variant)', display: 'flex' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsGeneratorOpen(true)}
                        title="Generate strong password"
                        aria-label="Generate strong password"
                        style={{ padding: '6px', color: 'var(--primary)', display: 'flex' }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                          autorenew
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 4-Segment Strength Bar with Text Label */}
                  {password && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
                        {[0, 1, 2, 3].map((step) => (
                          <div
                            key={step}
                            style={{
                              flex: 1,
                              borderRadius: '2px',
                              backgroundColor:
                                step <= strength.score
                                  ? strengthColors[strength.score] || 'var(--primary)'
                                  : 'var(--outline-variant)',
                              transition: 'background-color 200ms ease',
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: strengthColors[strength.score] || 'var(--on-surface-variant)' }}>
                          Strength: {strengthLabels[strength.score]}
                        </span>
                        {breachCount === null && !checkingBreach && (
                          <button
                            type="button"
                            onClick={handleBreachCheck}
                            style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}
                          >
                            Check breach database
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Breach result feedback */}
                  {password && breachCount !== null && (
                    <div style={{ marginTop: '4px' }}>
                      {breachCount > 0 ? (
                        <span style={{ color: 'var(--error)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>warning</span>
                          <span>Found in {breachCount.toLocaleString()} known data breaches</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>check_circle</span>
                          <span>No known breaches found in database</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Optional TOTP 2FA Secret Key */}
                {!showTotpField ? (
                  <div style={{ marginBottom: '16px' }}>
                    <button
                      type="button"
                      className="btn-text"
                      onClick={() => setShowTotpField(true)}
                      style={{ padding: 0 }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
                      <span>Add 2FA Verification Code (TOTP)</span>
                    </button>
                  </div>
                ) : (
                  <div className="field-group">
                    <label className="field-label">2FA Secret Key (Base32)</label>
                    <input
                      type="text"
                      className="input-field mono"
                      placeholder="JBSWY3DPEHPK3PXP"
                      value={totpSecret}
                      onChange={(e) => setTotpSecret(e.target.value)}
                      autoComplete="off"
                    />
                    <span className="text-caption">Auto-generates 6-digit one-time codes on your device</span>
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <div className="field-group">
              <label className="field-label">Notes</label>
              <textarea
                className="input-field"
                placeholder="Optional notes or recovery codes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ minHeight: '84px', paddingTop: '12px', resize: 'vertical' }}
              />
            </div>

            {/* Actions: Tonal Cancel & Filled Primary Save */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                className="btn-tonal"
                onClick={onClose}
                disabled={saving}
                style={{ flex: 1, maxWidth: '140px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ flex: 1, maxWidth: '160px' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>save</span>
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onUsePassword={(pw) => {
          setPassword(pw);
          setShowPassword(true);
        }}
      />
    </>
  );
};
