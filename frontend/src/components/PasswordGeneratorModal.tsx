import React, { useState, useEffect } from 'react';
import { generatePassword, GeneratorOptions } from '../lib/passwordGenerator';
import { generatePassphrase } from '../lib/passphrase';
import { evaluatePasswordStrength } from '../lib/passwordStrength';
import { copyToClipboard } from '../lib/clipboard';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsePassword: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onUsePassword,
}) => {
  const [mode, setMode] = useState<'chars' | 'passphrase'>('chars');
  const [wordCount, setWordCount] = useState<number>(4);
  const [copied, setCopied] = useState<boolean>(false);

  const [options, setOptions] = useState<GeneratorOptions>({
    length: 20,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  });

  const [generated, setGenerated] = useState<string>('');
  const strength = evaluatePasswordStrength(generated);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['var(--error)', 'var(--error)', 'var(--warning)', 'var(--success)', 'var(--success)'];

  const regenerate = () => {
    setCopied(false);
    if (mode === 'chars') {
      setGenerated(generatePassword(options));
    } else {
      setGenerated(generatePassphrase(wordCount));
    }
  };

  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, options, mode, wordCount]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(generated, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '0 24px 24px 24px' }}
      >
        <div className="m3-drag-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 20px 0' }}>
          <span className="title-screen">Password Generator</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ color: 'var(--on-surface-variant)', padding: '6px', display: 'flex' }}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Mode Chips */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`m3-chip ${mode === 'chars' ? 'active' : ''}`}
            onClick={() => setMode('chars')}
          >
            {mode === 'chars' && <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span>}
            <span>Random Characters</span>
          </button>
          <button
            type="button"
            className={`m3-chip ${mode === 'passphrase' ? 'active' : ''}`}
            onClick={() => setMode('passphrase')}
          >
            {mode === 'passphrase' && <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span>}
            <span>Memorable Passphrase</span>
          </button>
        </div>

        {/* Password Display Box with refresh and copy */}
        <div
          style={{
            backgroundColor: 'var(--surface-container-high)',
            borderRadius: 'var(--radius-card)',
            padding: '16px',
            marginBottom: '12px',
            wordBreak: 'break-all',
            textAlign: 'center',
            fontSize: mode === 'passphrase' ? '16px' : '17px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            border: '1px solid var(--outline-variant)',
          }}
        >
          <span className="text-mono" style={{ fontWeight: 600, color: 'var(--primary)', flex: 1, letterSpacing: '0.04em' }}>
            {generated}
          </span>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={regenerate}
              title="Regenerate password"
              aria-label="Regenerate password"
              style={{ padding: '8px', color: 'var(--on-surface-variant)', borderRadius: 'var(--radius-full)' }}
            >
              <span className="material-symbols-rounded">autorenew</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy to clipboard"
              aria-label="Copy to clipboard"
              style={{ padding: '8px', color: copied ? 'var(--success)' : 'var(--primary)', borderRadius: 'var(--radius-full)' }}
            >
              <span className="material-symbols-rounded">{copied ? 'check' : 'content_copy'}</span>
            </button>
          </div>
        </div>

        {/* 4-Segment Strength Meter */}
        <div style={{ marginBottom: '24px' }}>
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

        {/* Options */}
        {mode === 'chars' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-body" style={{ fontSize: '15px' }}>Length: {options.length}</span>
              <input
                type="range"
                min="8"
                max="64"
                value={options.length}
                onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value) })}
                style={{ width: '55%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div className="card-grouped" style={{ padding: '4px 16px' }}>
              {[
                { label: 'Uppercase (A-Z)', key: 'includeUppercase' as const },
                { label: 'Lowercase (a-z)', key: 'includeLowercase' as const },
                { label: 'Numbers (0-9)', key: 'includeNumbers' as const },
                { label: 'Special Symbols (!@#$)', key: 'includeSymbols' as const },
              ].map(({ label, key }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    cursor: 'pointer',
                    fontSize: '14px',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-body" style={{ fontSize: '15px' }}>Words: {wordCount}</span>
              <input
                type="range"
                min="3"
                max="8"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                style={{ width: '55%', accentColor: 'var(--primary)' }}
              />
            </div>
            <p className="text-caption">
              Generates high-entropy passphrases from EFF's wordlist that are easy to type and remember.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-tonal" onClick={onClose} style={{ flex: 1, maxWidth: '140px' }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onUsePassword(generated);
              onClose();
            }}
            style={{ flex: 1 }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span>
            <span>Use this password</span>
          </button>
        </div>
      </div>
    </div>
  );
};
