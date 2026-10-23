import React, { useMemo, useState } from 'react';
import { useSessionStore, type DecryptedEntry } from '../store/session';
import { auditVault } from '../lib/securityAudit';
import { copyToClipboard } from '../lib/clipboard';

interface VaultScreenProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
  onSelectEntry: (id: string) => void;
  onShowToast?: (msg: string, sub?: string) => void;
}

// Deterministic M3 tonal color palette for site monogram
function getSiteTonalColor(site: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < site.length; i++) {
    hash = site.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    { bg: 'var(--primary-container)', text: 'var(--on-primary-container)' },
    { bg: 'var(--secondary-container)', text: 'var(--on-secondary-container)' },
    { bg: 'var(--tertiary-container)', text: 'var(--on-tertiary-container)' },
    { bg: 'var(--surface-container-highest)', text: 'var(--primary)' },
  ];
  return palettes[Math.abs(hash) % palettes.length];
}

export const VaultScreen: React.FC<VaultScreenProps> = ({
  onAddClick,
  onSettingsClick,
  onSelectEntry,
  onShowToast,
}) => {
  const entries = useSessionStore((state) => state.entries);
  const selectedEntryId = useSessionStore((state) => state.selectedEntryId);
  const searchQuery = useSessionStore((state) => state.searchQuery);
  const setSearchQuery = useSessionStore((state) => state.setSearchQuery);
  const displayName = useSessionStore((state) => state.displayName);

  const [activeChip, setActiveChip] = useState<'all' | 'login' | 'card' | 'note' | 'favorites'>('all');

  const audit = useMemo(() => auditVault(entries), [entries]);

  // Filter and sort entries alphabetically by site
  const filteredAndGrouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = entries.filter((e) => {
      // Filter chip
      if (activeChip === 'favorites' && !e.data.favorite) return false;
      if (activeChip === 'login' && e.data.category !== 'login') return false;
      if (activeChip === 'note' && e.data.category !== 'note') return false;
      if (activeChip === 'card' && (e.data.category as string) !== 'card') return false;

      // Query filter
      if (!q) return true;
      return (
        e.data.site.toLowerCase().includes(q) ||
        e.data.username.toLowerCase().includes(q) ||
        (e.data.notes && e.data.notes.toLowerCase().includes(q))
      );
    });

    filtered.sort((a, b) => a.data.site.localeCompare(b.data.site));

    // Group by first letter for sticky headers
    const groups: { [key: string]: DecryptedEntry[] } = {};
    for (const item of filtered) {
      const letter = (item.data.site.charAt(0) || '#').toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    return groups;
  }, [entries, searchQuery, activeChip]);

  const groupKeys = Object.keys(filteredAndGrouped).sort();

  const handleQuickCopy = (e: React.MouseEvent, password: string) => {
    e.stopPropagation();
    copyToClipboard(password, () => {
      onShowToast?.('Password copied to clipboard', 'Auto-clears in 15s');
    });
  };

  const chips: Array<{ id: 'all' | 'login' | 'card' | 'note' | 'favorites'; label: string; count?: number }> = [
    { id: 'all', label: 'All', count: entries.length },
    { id: 'login', label: 'Logins' },
    { id: 'card', label: 'Cards' },
    { id: 'note', label: 'Notes' },
    { id: 'favorites', label: 'Favorites', count: audit.favoritesCount },
  ];

  return (
    <div style={{ width: '100%', animation: 'fadeIn 200ms ease' }}>
      {/* Top App Bar: Google Pill Search Bar with Avatar */}
      <div className="m3-search-bar" role="search">
        <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)', fontSize: '22px' }}>
          search
        </span>
        <input
          type="text"
          className="m3-search-input"
          placeholder="Search passwords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search passwords"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{ color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center' }}
            aria-label="Clear search"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
          </button>
        )}
        <button
          type="button"
          onClick={onSettingsClick}
          aria-label="Open settings"
          title={`Signed in as ${displayName}`}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-avatar)',
            backgroundColor: 'var(--primary)',
            color: 'var(--on-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {displayName ? displayName.charAt(0).toUpperCase() : <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>account_circle</span>}
        </button>
      </div>

      {/* M3 Horizontally Scrollable Filter Chips */}
      <div className="m3-chip-bar" role="tablist">
        {chips.map((chip) => {
          const isSelected = activeChip === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`m3-chip ${isSelected ? 'active' : ''}`}
              onClick={() => setActiveChip(chip.id)}
            >
              {isSelected && (
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  check
                </span>
              )}
              <span>{chip.label}</span>
              {typeof chip.count === 'number' && chip.count > 0 && (
                <span style={{ opacity: 0.8, fontSize: '12px' }}>({chip.count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {entries.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '72px 16px',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-avatar)',
              backgroundColor: 'var(--surface-container-high)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '40px' }}>password</span>
          </div>
          <div>
            <h2 className="title-screen" style={{ marginBottom: '6px' }}>No passwords saved yet</h2>
            <p className="text-caption">Add your credentials securely to access them anywhere.</p>
          </div>
          <button className="btn-primary" onClick={onAddClick} style={{ width: 'auto', padding: '0 28px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>add</span>
            <span>Add password</span>
          </button>
        </div>
      ) : groupKeys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--on-surface-variant)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.6 }}>
            search_off
          </span>
          <p className="text-body">No matching passwords found</p>
        </div>
      ) : (
        /* Vault Group List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupKeys.map((letter) => (
            <div key={letter}>
              <div
                style={{
                  padding: '4px 12px 6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  letterSpacing: '0.05em',
                }}
              >
                {letter}
              </div>
              <div className="card-grouped">
                {filteredAndGrouped[letter].map((entry) => {
                  const tonal = getSiteTonalColor(entry.data.site);
                  const isSelected = selectedEntryId === entry.id;
                  const isNote = entry.data.category === 'note';

                  return (
                    <div
                      key={entry.id}
                      className={`row-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectEntry(entry.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onSelectEntry(entry.id);
                        }
                      }}
                    >
                      {/* 40px Monogram Circle with Deterministic Tonal Color */}
                      <div
                        className="avatar"
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: tonal.bg,
                          color: tonal.text,
                        }}
                      >
                        {isNote ? (
                          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>description</span>
                        ) : (
                          entry.data.site.charAt(0)
                        )}
                      </div>

                      {/* Content: Title (title-medium) & Username (body-medium muted) */}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="text-body"
                            style={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {entry.data.site}
                          </span>
                          {entry.data.favorite && (
                            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--warning)' }}>
                              star
                            </span>
                          )}
                          {entry.data.totpSecret && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--surface-container-high)',
                                color: 'var(--on-surface-variant)',
                              }}
                            >
                              2FA
                            </span>
                          )}
                        </div>
                        <span
                          className="text-caption"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isNote ? 'Secure Note' : entry.data.username || 'No username'}
                        </span>
                      </div>

                      {/* Trailing action: Quick copy password or chevron */}
                      {!isNote && entry.data.password && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickCopy(e, entry.data.password)}
                          aria-label={`Copy password for ${entry.data.site}`}
                          title="Copy password"
                          style={{
                            padding: '8px',
                            color: 'var(--on-surface-variant)',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            marginRight: '4px',
                          }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                            content_copy
                          </span>
                        </button>
                      )}

                      <span
                        className="material-symbols-rounded"
                        style={{ color: 'var(--outline-variant)', fontSize: '20px' }}
                      >
                        chevron_right
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
