import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content card-glass">
        <div className="modal-header flex-between">
          <div className="flex-center" style={{ gap: '8px', color: 'var(--warning)' }}>
            <AlertTriangle size={24} />
            <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{title || "Atenção"}</h3>
          </div>
          <button onClick={onCancel} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary">
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn btn-primary">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
