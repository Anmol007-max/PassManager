import React, { useState, useEffect } from 'react';
import { type DecryptedEntry } from '../store/session';
import { copyToClipboard } from '../lib/clipboard';
import { generateTotp, type TotpResult } from '../lib/totp';
import { evaluatePasswordStrength } from '../lib/passwordStrength';

interface EntryDetailScreenProps {
  entry: DecryptedEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onShowToast: (msg: string, sub?: string) => void;
}

export const EntryDetailScreen: React.FC<EntryDetailScreenProps> = ({
  entry,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onShowToast,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [totp, setTotp] = useState<TotpResult | null>(null);

  // Live TOTP ticker if secret exists
  useEffect(() => {
    if (!entry.data.totpSecret) {
      setTotp(null);
      return;
    }

    const updateCode = async () => {
      if (entry.data.totpSecret) {
        const res = await generateTotp(entry.data.totpSecret);
        setTotp(res);
      }
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [entry.data.totpSecret]);

  const handleCopyPassword = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(entry.data.password, () => {
      onShowToast('Password copied', 'Auto-clears in 15s');
    });
  };

  const handleCopyUsername = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(entry.data.username, () => {
      onShowToast('Username copied');
    });
  };

  const handleCopyTotp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totp) {
      copyToClipboard(totp.code, () => {
        onShowToast('Verification code copied');
      });
    }
  };

  const strength = evaluatePasswordStrength(entry.data.password);
  const isNote = entry.data.category === 'note';

  // Strength label & color
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['var(--error)', 'var(--error)', 'var(--warning)', 'var(--success)', 'var(--success)'];

  return (
    <div style={{ width: '100%', animation: 'fadeIn 200ms ease' }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          className="detail-back-button"
          onClick={onBack}
          aria-label="Back to passwords"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--primary)',
            fontSize: '15px',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <span className="material-symbols-rounded">arrow_back</span>
          <span>Passwords</span>
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={onToggleFavorite}
            aria-label={entry.data.favorite ? 'Remove from favorites' : 'Add to favorites'}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-full)',
              color: entry.data.favorite ? 'var(--warning)' : 'var(--on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
              {entry.data.favorite ? 'star' : 'star_outline'}
            </span>
          </button>
          <button
            onClick={onEdit}
            className="btn-tonal"
            style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
            <span>Edit</span>
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete entry"
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--error)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>delete</span>
          </button>
        </div>
      </div>

      {/* Header: Title + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div
          className="avatar"
          style={{
            width: '56px',
            height: '56px',
            fontSize: '24px',
            backgroundColor: 'var(--primary-container)',
            color: 'var(--on-primary-container)',
          }}
        >
          {isNote ? (
            <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>description</span>
          ) : (
            entry.data.site.charAt(0)
          )}
        </div>
        <div>
          <h1 className="title-large" style={{ wordBreak: 'break-word' }}>
            {entry.data.site}
          </h1>
          <span className="text-caption">
            {isNote ? 'Secure Note' : 'Login Credentials'}
          </span>
        </div>
      </div>

      {/* Outlined Detail Card */}
      <div className="card-grouped" style={{ marginBottom: '20px' }}>
        {/* Username */}
        {!isNote && (
          <div className="row-item" style={{ minHeight: '68px', cursor: 'default' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <span className="text-caption">Username or Email</span>
              <span className="text-body" style={{ fontWeight: 500, wordBreak: 'break-all' }}>
                {entry.data.username || '—'}
              </span>
            </div>
            {entry.data.username && (
              <button
                type="button"
                onClick={handleCopyUsername}
                title="Copy username"
                aria-label="Copy username"
                style={{ padding: '8px', color: 'var(--primary)', borderRadius: 'var(--radius-full)' }}
              >
                <span className="material-symbols-rounded">content_copy</span>
              </button>
            )}
          </div>
        )}

        {/* Password */}
        {!isNote && (
          <div className="row-item" style={{ minHeight: '84px', cursor: 'default', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <span className="text-caption">Password</span>
                <span
                  className="text-body text-mono"
                  style={{
                    fontWeight: 500,
                    wordBreak: 'break-all',
                    letterSpacing: revealed ? '0.02em' : '0.15em',
                  }}
                >
                  {revealed ? entry.data.password : '••••••••••••'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setRevealed(!revealed)}
                  aria-label={revealed ? 'Hide password' : 'Show password'}
                  style={{ padding: '8px', color: 'var(--on-surface-variant)', borderRadius: 'var(--radius-full)' }}
                >
                  <span className="material-symbols-rounded">
                    {revealed ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  title="Copy password"
                  aria-label="Copy password"
                  style={{ padding: '8px', color: 'var(--primary)', borderRadius: 'var(--radius-full)' }}
                >
                  <span className="material-symbols-rounded">content_copy</span>
                </button>
              </div>
            </div>

            {/* M3 4-Segment Strength Meter */}
            <div style={{ marginTop: '8px', width: '100%' }}>
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
              <span style={{ fontSize: '12px', color: strengthColors[strength.score] || 'var(--on-surface-variant)' }}>
                Strength: {strengthLabels[strength.score]}
              </span>
            </div>
          </div>
        )}

        {/* TOTP 2FA Authenticator */}
        {totp && (
          <div className="row-item" style={{ minHeight: '68px', cursor: 'default' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-caption">2FA Authenticator Code</span>
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                  ({totp.secondsRemaining}s)
                </span>
              </div>
              <span className="text-large text-mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)' }}>
                {totp.code.slice(0, 3)} {totp.code.slice(3)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyTotp}
              title="Copy 2FA code"
              aria-label="Copy 2FA code"
              style={{ padding: '8px', color: 'var(--primary)', borderRadius: 'var(--radius-full)' }}
            >
              <span className="material-symbols-rounded">content_copy</span>
            </button>
          </div>
        )}

        {/* Secure Notes */}
        {entry.data.notes && (
          <div className="row-item" style={{ minHeight: '68px', cursor: 'default', alignItems: 'flex-start', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span className="text-caption" style={{ marginBottom: '4px' }}>Notes</span>
              <p className="text-body" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '15px' }}>
                {entry.data.notes}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
