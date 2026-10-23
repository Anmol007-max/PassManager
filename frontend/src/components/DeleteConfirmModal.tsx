import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '24px', maxWidth: '420px', alignItems: 'center' }}
      >
        <div className="m3-drag-handle" />

        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-avatar)',
            backgroundColor: 'var(--error-container)',
            color: 'var(--on-error-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>delete_forever</span>
        </div>

        <h3 className="title-screen" style={{ marginBottom: '8px', textAlign: 'center' }}>
          Delete entry?
        </h3>
        <p className="text-body" style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--on-surface-variant)', fontSize: '14px', lineHeight: 1.4 }}>
          Are you sure you want to permanently delete "{itemName}"? This item cannot be recovered.
        </p>

        <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-tonal"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger-confirm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ flex: 1 }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
