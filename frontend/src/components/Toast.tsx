import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  subtext?: string;
  onDismiss: () => void;
  onUndo?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, subtext, onDismiss, onUndo }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="m3-snackbar" role="status" aria-live="polite">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        <span>{message}</span>
        {subtext && (
          <span style={{ fontSize: '12px', opacity: 0.85, fontWeight: 400 }}>
            {subtext}
          </span>
        )}
      </div>

      {onUndo && (
        <button
          onClick={onUndo}
          style={{
            color: 'var(--primary-container)',
            background: 'none',
            border: 'none',
            fontWeight: 600,
            fontSize: '13px',
            padding: '4px 8px',
            cursor: 'pointer',
            borderRadius: 'var(--radius-full)',
          }}
        >
          Undo
        </button>
      )}

      <button
        onClick={onDismiss}
        aria-label="Close"
        style={{
          color: 'var(--surface)',
          opacity: 0.7,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
      </button>
    </div>
  );
};
