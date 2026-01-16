import { useState } from 'react';
import { Check, LogOut, UserX } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import catGif from '../assets/cat.gif';
import './DiscordModal.css';

const DISCORD_INVITE = 'https://discord.gg/CbbNwxpr';

export default function DiscordModal({ isOpen, onClose, onSubmit, onUnregister, onLogout, loading, user }) {
  const [discordUsername, setDiscordUsername] = useState('');
  const [nationalityConfirmed, setNationalityConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const bypassUsers = ['Shaamii', 'guden'];
  const isWhitelisted = bypassUsers.includes(user?.username);
  const isPeruvian = user?.flag_code === 'PE' || isWhitelisted;
  const isRegistered = user?.is_registered;

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

  const handleSubmit = async (e) => {
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
    try {
      await onSubmit(discordUsername.trim().toLowerCase());
      setShowSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al registrar');
    }
  };

  const handleClose = () => {
    setDiscordUsername('');
    setNationalityConfirmed(false);
    setError('');
    setActionLoading(null);
    setShowSuccess(false);
    onClose();
  };

  const handleUnregister = async () => {
    setActionLoading('unregister');
    try {
      await onUnregister();
      handleClose();
    } catch (err) {
      setError(err.message || 'Error al cancelar registro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    onLogout();
    handleClose();
  };

  // Success state - show Discord invite
  if (showSuccess) {
    return (
      <div className="discord-modal-overlay" onClick={handleClose}>
        <div className="discord-modal" onClick={(e) => e.stopPropagation()}>
          <div className="discord-modal-header">
            <h3>¡Registro Exitoso!</h3>
            <p className="discord-modal-description">
              Te has registrado correctamente al torneo.
            </p>
          </div>

          <div className="discord-modal-content">
            <div className="discord-invite-section">
              <FaDiscord className="discord-invite-icon" />
              <p className="discord-invite-text">Únete a nuestro Discord</p>
              <p className="discord-invite-subtext">
                Mantente al día con las novedades del torneo y conoce a otros jugadores.
              </p>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="discord-btn discord-invite-btn"
              >
                <FaDiscord size={20} /> Unirse al Discord
              </a>
            </div>

            <div className="discord-modal-buttons">
              <button
                type="button"
                className="discord-btn tertiary"
                onClick={handleClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registered user - show account actions
  if (isRegistered) {
    return (
      <div className="discord-modal-overlay" onClick={handleClose}>
        <div className="discord-modal" onClick={(e) => e.stopPropagation()}>
          <div className="discord-modal-header">
            <h3>Mi Cuenta</h3>
            <p className="discord-modal-description">
              Gestiona tu registro en el torneo.
            </p>
          </div>

          <div className="discord-modal-content">
            <div className="discord-account-info">
              <div className="discord-account-row">
                <span className="discord-account-label">Usuario osu!</span>
                <span className="discord-account-value">{user?.username}</span>
              </div>
              <div className="discord-account-row">
                <span className="discord-account-label">Discord</span>
                <span className="discord-account-value">{user?.discord_username || 'No registrado'}</span>
              </div>
              <div className="discord-account-row">
                <span className="discord-account-label">Estado</span>
                <span className="discord-account-value discord-registered">
                  <Check size={14} /> Registrado
                </span>
              </div>
            </div>

            {error && <div className="discord-error">{error}</div>}

            <div className="discord-modal-buttons discord-action-buttons">
              <button
                type="button"
                className="discord-btn danger"
                onClick={handleUnregister}
                disabled={actionLoading}
              >
                {actionLoading === 'unregister' ? (
                  <><img src={catGif} alt="" className="btn-loading-cat" /> Cancelando...</>
                ) : (
                  <><UserX size={16} /> Cancelar Registro</>
                )}
              </button>
              <button
                type="button"
                className="discord-btn secondary"
                onClick={handleLogout}
                disabled={actionLoading}
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>

            <div className="discord-modal-buttons">
              <button
                type="button"
                className="discord-btn tertiary"
                onClick={handleClose}
                disabled={actionLoading}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="discord-modal-overlay" onClick={handleClose}>
      <div className="discord-modal" onClick={(e) => e.stopPropagation()}>
        <div className="discord-modal-header">
          <h3>Registrar Discord</h3>
          <p className="discord-modal-description">
            Ingresa tu usuario de Discord para contactarte durante el torneo.
          </p>
          {isWhitelisted && (
            <span className="discord-whitelisted">
              <Check size={14} /> Whitelisted
            </span>
          )}
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
