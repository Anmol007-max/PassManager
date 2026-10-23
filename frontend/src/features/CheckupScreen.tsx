import React, { useMemo } from 'react';
import { useSessionStore, type DecryptedEntry } from '../store/session';
import { auditVault } from '../lib/securityAudit';

interface CheckupScreenProps {
  onSelectEntry: (id: string) => void;
  onAddClick: () => void;
}

export const CheckupScreen: React.FC<CheckupScreenProps> = ({ onSelectEntry, onAddClick: _onAddClick }) => {
  const entries = useSessionStore((state) => state.entries);
  const audit = useMemo(() => auditVault(entries), [entries]);

  // Identify weak entries and reused entries
  const { weakEntries, reusedEntries } = useMemo(() => {
    const passwordCounts = new Map<string, DecryptedEntry[]>();
    const weak: DecryptedEntry[] = [];

    for (const entry of entries) {
      const pw = entry.data.password;
      if (pw) {
        if (!passwordCounts.has(pw)) {
          passwordCounts.set(pw, []);
        }
        passwordCounts.get(pw)!.push(entry);
      }
    }

    const reused: DecryptedEntry[] = [];
    for (const [_, list] of passwordCounts) {
      if (list.length > 1) {
        reused.push(...list);
      }
    }

    return { weakEntries: weak, reusedEntries: reused };
  }, [entries]);

  const isHealthy = audit.weakCount === 0 && audit.reusedCount === 0;

  return (
    <div style={{ width: '100%', animation: 'fadeIn 200ms ease' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '24px 16px',
          backgroundColor: isHealthy ? 'var(--surface-container-low)' : 'var(--surface-container-high)',
          borderRadius: 'var(--radius-card)',
          marginBottom: '24px',
          border: '1px solid var(--outline-variant)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-avatar)',
            backgroundColor: isHealthy ? 'var(--success-container)' : 'var(--warning-container)',
            color: isHealthy ? 'var(--on-success-container)' : 'var(--on-warning-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '36px' }}>
            {isHealthy ? 'verified_user' : 'gpp_maybe'}
          </span>
        </div>

        <h2 className="title-large" style={{ fontSize: '24px', marginBottom: '8px' }}>
          {isHealthy ? 'All passwords look secure' : 'Security recommendations'}
        </h2>
        <p className="text-caption" style={{ maxWidth: '440px', lineHeight: 1.4 }}>
          {isHealthy
            ? 'None of your stored passwords appear weak or reused across accounts.'
            : 'Review compromised, weak, or reused passwords to protect your online accounts.'}
        </p>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        <div className="card-grouped" style={{ padding: '16px', textAlign: 'center' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '28px' }}>
            key
          </span>
          <div className="title-screen" style={{ margin: '8px 0 2px' }}>{audit.total}</div>
          <span className="text-caption">Total Passwords</span>
        </div>

        <div className="card-grouped" style={{ padding: '16px', textAlign: 'center' }}>
          <span
            className="material-symbols-rounded"
            style={{ color: audit.weakCount > 0 ? 'var(--error)' : 'var(--success)', fontSize: '28px' }}
          >
            {audit.weakCount > 0 ? 'report' : 'check_circle'}
          </span>
          <div className="title-screen" style={{ margin: '8px 0 2px' }}>{audit.weakCount}</div>
          <span className="text-caption">Weak Passwords</span>
        </div>

        <div className="card-grouped" style={{ padding: '16px', textAlign: 'center' }}>
          <span
            className="material-symbols-rounded"
            style={{ color: audit.reusedCount > 0 ? 'var(--warning)' : 'var(--success)', fontSize: '28px' }}
          >
            {audit.reusedCount > 0 ? 'sync_problem' : 'check_circle'}
          </span>
          <div className="title-screen" style={{ margin: '8px 0 2px' }}>{audit.reusedCount}</div>
          <span className="text-caption">Reused Passwords</span>
        </div>

        <div className="card-grouped" style={{ padding: '16px', textAlign: 'center' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '28px' }}>
            security
          </span>
          <div className="title-screen" style={{ margin: '8px 0 2px' }}>{audit.totpCount}</div>
          <span className="text-caption">Protected with 2FA</span>
        </div>
      </div>

      {/* Reused Passwords Section */}
      {reusedEntries.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 className="title-screen" style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--warning)' }}>warning</span>
            <span>Reused Passwords ({reusedEntries.length})</span>
          </h3>
          <div className="card-grouped">
            {reusedEntries.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="row-item"
                onClick={() => onSelectEntry(entry.id)}
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '15px' }}>
                    {entry.data.site.charAt(0)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="text-body" style={{ fontWeight: 500 }}>{entry.data.site}</span>
                    <span className="text-caption">{entry.data.username || 'No username'}</span>
                  </div>
                </div>
                <span className="material-symbols-rounded" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak Passwords Section */}
      {weakEntries.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 className="title-screen" style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--error)' }}>error</span>
            <span>Weak Passwords ({weakEntries.length})</span>
          </h3>
          <div className="card-grouped">
            {weakEntries.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="row-item"
                onClick={() => onSelectEntry(entry.id)}
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '15px' }}>
                    {entry.data.site.charAt(0)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="text-body" style={{ fontWeight: 500 }}>{entry.data.site}</span>
                    <span className="text-caption">{entry.data.username || 'No username'}</span>
                  </div>
                </div>
                <span className="material-symbols-rounded" style={{ color: 'var(--outline-variant)' }}>chevron_right</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
