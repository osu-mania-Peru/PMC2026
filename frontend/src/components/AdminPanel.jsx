import { useState, useRef, useEffect } from 'react';
import './AdminPanel.css';

export default function AdminPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bracketSize, setBracketSize] = useState(32);
  const [matches, setMatches] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({ player1_score: 0, player2_score: 0 });

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Draggable handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.close-btn') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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

  const handleGenerateBrackets = () => {
    if (window.confirm(`¿Generar brackets para ${bracketSize} jugadores? Esto eliminará brackets existentes.`)) {
      callAdminEndpointWithBody('/internal/admin/generate-brackets', 'POST', { bracket_size: bracketSize });
    }
  };

  const callAdminEndpointWithBody = async (endpoint, method = 'POST', body = {}) => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          'X-Admin-Password': password,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
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

  const handleGetMatches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/internal/admin/matches`, {
        headers: { 'X-Admin-Password': password }
      });
      const data = await response.json();
      if (response.ok) {
        setMatches(data.matches);
        setShowMatches(true);
      } else {
        setError(data.detail || 'Failed to get matches');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateScore = async () => {
    if (!editingMatch) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/internal/admin/match/${editingMatch.id}/score?player1_score=${scoreForm.player1_score}&player2_score=${scoreForm.player2_score}`,
        {
          method: 'PATCH',
          headers: { 'X-Admin-Password': password }
        }
      );
      const data = await response.json();
      if (response.ok) {
        setMessage(JSON.stringify(data, null, 2));
        setEditingMatch(null);
        handleGetMatches(); // Refresh matches
      } else {
        setError(data.detail || 'Failed to update score');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressMatch = async (matchId, e) => {
    e.stopPropagation(); // Prevent opening the edit modal
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE}/internal/admin/match/${matchId}/progress`,
        {
          method: 'POST',
          headers: { 'X-Admin-Password': password }
        }
      );
      const data = await response.json();
      if (response.ok) {
        setMessage(JSON.stringify(data, null, 2));
        handleGetMatches(); // Refresh matches
      } else {
        setError(data.detail || 'Failed to progress match');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    <div className="admin-panel-overlay">
      <div
        className={`admin-panel ${isDragging ? 'dragging' : ''}`}
        ref={dragRef}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onMouseDown={handleMouseDown}
      >
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
              <h3>Gestión de Brackets</h3>
              <div className="admin-row">
                <select
                  value={bracketSize}
                  onChange={(e) => setBracketSize(Number(e.target.value))}
                  className="admin-select"
                >
                  <option value={4}>4 jugadores</option>
                  <option value={8}>8 jugadores</option>
                  <option value={16}>16 jugadores</option>
                  <option value={32}>32 jugadores</option>
                </select>
                <button onClick={handleGenerateBrackets} className="admin-btn" disabled={loading}>
                  Generar Brackets
                </button>
              </div>
              <button onClick={handleGetMatches} className="admin-btn" disabled={loading}>
                Ver Partidas
              </button>
              <button onClick={handleGetState} className="admin-btn" disabled={loading}>
                Estado del Torneo
              </button>

              <h3>Acciones Rápidas</h3>
              <button onClick={handleSimulateMatch} className="admin-btn" disabled={loading}>
                Simular Partida
              </button>
              <button onClick={handleSeedDatabase} className="admin-btn" disabled={loading}>
                Poblar BD (Test)
              </button>
              <button onClick={handleResetTournament} className="admin-btn danger" disabled={loading}>
                Resetear Torneo
              </button>
            </div>

            {loading && <div className="admin-loading">Cargando...</div>}
            {error && <div className="admin-error">{error}</div>}

            {/* Match editing modal */}
            {editingMatch && (
              <div className="admin-modal">
                <h4>Editar Partida #{editingMatch.id}</h4>
                <p>{editingMatch.player1?.username || 'TBD'} vs {editingMatch.player2?.username || 'TBD'}</p>
                <div className="score-inputs">
                  <input
                    type="number"
                    min="0"
                    value={scoreForm.player1_score}
                    onChange={(e) => setScoreForm({ ...scoreForm, player1_score: parseInt(e.target.value) || 0 })}
                    className="admin-input score"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    min="0"
                    value={scoreForm.player2_score}
                    onChange={(e) => setScoreForm({ ...scoreForm, player2_score: parseInt(e.target.value) || 0 })}
                    className="admin-input score"
                  />
                </div>
                <div className="modal-buttons">
                  <button onClick={handleUpdateScore} className="admin-btn" disabled={loading}>
                    Guardar
                  </button>
                  <button onClick={() => setEditingMatch(null)} className="admin-btn">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Matches list */}
            {showMatches && matches.length > 0 && (
              <div className="admin-matches">
                <h4>Partidas ({matches.length})</h4>
                <div className="matches-list">
                  {matches.map(match => (
                    <div
                      key={match.id}
                      className={`match-item ${match.is_completed ? 'completed' : ''}`}
                      onClick={() => {
                        setEditingMatch(match);
                        setScoreForm({
                          player1_score: match.player1_score || 0,
                          player2_score: match.player2_score || 0
                        });
                      }}
                    >
                      <span className="match-bracket">{match.bracket_type}</span>
                      <span className="match-round">{match.round_name}</span>
                      <span className="match-players">
                        {match.player1?.username || 'TBD'} vs {match.player2?.username || 'TBD'}
                      </span>
                      {match.is_completed && (
                        <span className="match-score">{match.player1_score}-{match.player2_score}</span>
                      )}
                      {match.is_completed && (
                        <button
                          className="admin-btn small"
                          onClick={(e) => handleProgressMatch(match.id, e)}
                          disabled={loading}
                          title="Progress winner/loser to next matches"
                        >
                          Progress
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowMatches(false)} className="admin-btn">
                  Cerrar
                </button>
              </div>
            )}

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
