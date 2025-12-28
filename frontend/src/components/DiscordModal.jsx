import { useState } from 'react';
import './DiscordModal.css';

export default function DiscordModal({ isOpen, onClose, onSubmit, loading }) {
  const [discordUsername, setDiscordUsername] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const validateUsername = (username) => {
    const trimmed = username.trim();
    if (!trimmed) return 'Discord username is required';
    if (trimmed.length < 2 || trimmed.length > 32) {
      return 'Username must be 2-32 characters';
    }
    if (!/^[a-z0-9_.]+$/i.test(trimmed)) {
      return 'Username can only contain letters, numbers, underscores, and periods';
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateUsername(discordUsername);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSubmit(discordUsername.trim().toLowerCase());
  };

  const handleClose = () => {
    setDiscordUsername('');
    setError('');
    onClose();
  };

  return (
    <div className="discord-modal-overlay" onClick={handleClose}>
      <div className="discord-modal" onClick={(e) => e.stopPropagation()}>
        <div className="discord-modal-header">
          <h3>Registrar Discord</h3>
          <p className="discord-modal-description">
            Ingresa tu usuario de Discord para contactarte durante el torneo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="discord-modal-content">
          <div className="discord-form-group">
            <label className="discord-label">
              Usuario de Discord<span className="required">*</span>
            </label>
            <input
              type="text"
              value={discordUsername}
              onChange={(e) => {
                setDiscordUsername(e.target.value);
                setError('');
              }}
              placeholder="tu_usuario"
              className="discord-input"
              autoFocus
              disabled={loading}
            />
            {error && <div className="discord-error">{error}</div>}
          </div>

          <div className="discord-modal-buttons">
            <button
              type="submit"
              className="discord-btn primary"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Confirmar'}
            </button>
            <button
              type="button"
              className="discord-btn secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
