import { useState } from 'react';
import catGif from '../assets/cat.gif';
import './DiscordModal.css';

export default function DiscordModal({ isOpen, onClose, onSubmit, loading, user }) {
  const [discordUsername, setDiscordUsername] = useState('');
  const [nationalityConfirmed, setNationalityConfirmed] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const bypassUsers = ['Shaamii'];
  const isPeruvian = user?.flag_code === 'PE' || bypassUsers.includes(user?.username);

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
    if (!nationalityConfirmed) {
      setError('Debes confirmar tu nacionalidad peruana para participar');
      return;
    }
    setError('');
    onSubmit(discordUsername.trim().toLowerCase());
  };

  const handleClose = () => {
    setDiscordUsername('');
    setNationalityConfirmed(false);
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

        {!isPeruvian ? (
          <div className="discord-modal-content">
            <div className="discord-rejected">
              <div className="discord-rejected-icon">✕</div>
              <p>Tu cuenta de osu! está registrada en <strong>{user?.flag_code || 'N/A'}</strong>.</p>
              <p>Solo jugadores con nacionalidad peruana pueden participar en Peru Mania Cup.</p>
            </div>
            <div className="discord-modal-buttons">
              <button
                type="button"
                className="discord-btn primary"
                onClick={handleClose}
              >
                Entendido
              </button>
            </div>
          </div>
        ) : (
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

            <div className="discord-form-group">
              <label className="discord-checkbox-label">
                <input
                  type="checkbox"
                  checked={nationalityConfirmed}
                  onChange={(e) => {
                    setNationalityConfirmed(e.target.checked);
                    setError('');
                  }}
                  disabled={loading}
                  className="discord-checkbox"
                />
                <span className="discord-checkbox-text">
                  Bajo protesta de decir verdad, declaro que soy de nacionalidad peruana y acepto las sanciones correspondientes en caso de falsedad.
                </span>
              </label>
            </div>

            <div className="discord-modal-buttons">
              {nationalityConfirmed && (
                <button
                  type="submit"
                  className="discord-btn primary"
                  disabled={loading}
                >
                  {loading ? <><img src={catGif} alt="" className="btn-loading-cat" /> Registrando...</> : 'Confirmar'}
                </button>
              )}
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
        )}
      </div>
    </div>
  );
}
