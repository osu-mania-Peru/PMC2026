import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import DiscordModal from '../components/DiscordModal';
import './Register.css';

export default function Register({ user, setUser }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDiscordModal, setShowDiscordModal] = useState(false);

  useEffect(() => {
    api.getTournamentStatus().then(setStatus).catch(console.error);
  }, []);

  const handleRegister = async (discordUsername) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.register(discordUsername);
      setUser(result.user);
      setShowDiscordModal(false);
      alert('¡Te has registrado exitosamente al torneo!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!confirm('¿Estás seguro de que quieres cancelar tu registro?')) return;

    setLoading(true);
    setError(null);
    try {
      await api.unregister();
      const updatedUser = await api.getMe();
      setUser(updatedUser);
      alert('Has cancelado tu registro del torneo exitosamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!status) return <Spinner size="large" text="Cargando estado del torneo..." />;

  return (
    <div className="page">
      <h2>Registro al Torneo</h2>

      {error && <div className="error">{error}</div>}

      {user.is_registered ? (
        <div>
          <div className="stat-box" style={{ borderLeftColor: '#90ee90' }}>
            <h4>¡Estás registrado!</h4>
            <p>Usuario: <strong>{user.username}</strong></p>
            <p>País: <strong>{user.flag_code}</strong></p>
            <p>Discord: <strong>@{user.discord_username || 'N/A'}</strong></p>
            <p>Número de Seed: <strong>{user.seed_number || 'Por Determinar'}</strong></p>
            <p>Registrado: <strong>{user.registered_at ? new Date(user.registered_at).toLocaleDateString('es-PE') : 'N/A'}</strong></p>
          </div>

          <button
            onClick={handleUnregister}
            disabled={loading}
            style={{ marginTop: '1rem', background: '#d44', border: 'none' }}
          >
            {loading ? 'Procesando...' : 'Cancelar Registro'}
          </button>
        </div>
      ) : status.registration_open ? (
        <div>
          <div className="stat-box">
            <h4>El Registro está Abierto</h4>
            <p>Cupos Restantes: <strong>{32 - status.total_registered_players}/32</strong></p>
            <p>Tu Usuario: <strong>{user.username}</strong></p>
            <p>Tu País: <strong>{user.flag_code}</strong></p>
          </div>

          <button onClick={() => setShowDiscordModal(true)} disabled={loading} style={{ marginTop: '1rem' }}>
            Registrarse al Torneo
          </button>

          <DiscordModal
            isOpen={showDiscordModal}
            onClose={() => setShowDiscordModal(false)}
            onSubmit={handleRegister}
            loading={loading}
          />
        </div>
      ) : (
        <div className="error">
          El registro está actualmente cerrado.
        </div>
      )}
    </div>
  );
}
