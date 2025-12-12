import { useState } from 'react';
import './AdminPanel.css';

export default function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const callAdminEndpoint = async (endpoint, method = 'POST') => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          'X-Admin-Password': password,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Request failed');
      }

      setMessage(JSON.stringify(data, null, 2));
      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE}/internal/admin/tournament-state`, {
        headers: {
          'X-Admin-Password': password
        }
      });

      if (response.ok) {
        setIsUnlocked(true);
        setError('');
      } else {
        setError('Contraseña inválida');
        setPassword('');
      }
    } catch {
      setError('Error al verificar contraseña');
    }
  };

  const handleSeedDatabase = () => {
    if (window.confirm('¿Poblar base de datos con datos de prueba?')) {
      callAdminEndpoint('/internal/admin/seed-database');
    }
  };

  const handleResetTournament = () => {
    if (window.confirm('¿ELIMINAR TODOS LOS DATOS DEL TORNEO? ¡Esto no se puede deshacer!')) {
      if (window.confirm('¿Estás ABSOLUTAMENTE seguro? Todos los brackets y partidas serán eliminados.')) {
        callAdminEndpoint('/internal/admin/reset-tournament', 'DELETE');
      }
    }
  };

  const handleGetState = () => {
    callAdminEndpoint('/internal/admin/tournament-state', 'GET');
  };

  const handleSimulateMatch = () => {
    const matchId = prompt('Ingresa el ID de la partida a simular:');
    if (matchId) {
      callAdminEndpoint(`/internal/admin/simulate-match/${matchId}`);
    }
  };

  if (!isOpen) {
    return (
      <button
        className="admin-panel-toggle"
        onClick={() => setIsOpen(true)}
        title="Debug"
      >
      </button>
    );
  }

  return (
    <div className="admin-panel-overlay" onClick={() => setIsOpen(false)}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        {!isUnlocked ? (
          <form onSubmit={handleUnlock} className="admin-login">
            <button type="button" onClick={() => setIsOpen(false)} className="close-btn">×</button>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              className="admin-input"
              autoFocus
            />
            {error && <div className="admin-error">{error}</div>}
            <button type="submit" className="admin-btn"></button>
          </form>
        ) : (
          <>
            <div className="admin-panel-header">
              <h2>Panel de Depuración</h2>
              <button onClick={() => setIsOpen(false)} className="close-btn">×</button>
            </div>
          <div className="admin-content">
            <div className="admin-actions">
              <h3>Acciones de Base de Datos</h3>
              <button onClick={handleSeedDatabase} className="admin-btn" disabled={loading}>
                Poblar Base de Datos
              </button>
              <button onClick={handleGetState} className="admin-btn" disabled={loading}>
                Obtener Estado del Torneo
              </button>
              <button onClick={handleSimulateMatch} className="admin-btn" disabled={loading}>
                Simular Partida
              </button>
              <button onClick={handleResetTournament} className="admin-btn danger" disabled={loading}>
                Resetear Torneo
              </button>
            </div>

            {loading && <div className="admin-loading">Cargando...</div>}
            {error && <div className="admin-error">{error}</div>}
            {message && (
              <div className="admin-response">
                <h4>Respuesta:</h4>
                <pre>{message}</pre>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
