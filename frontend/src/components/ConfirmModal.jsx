import './ConfirmModal.css';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading, error }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>{title}</h3>
        </div>

        <div className="confirm-modal-content">
          <p>{message}</p>
          {error && <div className="confirm-error">{error}</div>}
        </div>

        <div className="confirm-modal-buttons">
          <button
            type="button"
            className="confirm-btn secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="confirm-btn danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
