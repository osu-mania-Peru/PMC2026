import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import './Players.css';

// Icon components
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="players-header-icon">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Change back to getRegisteredPlayers for production
    api.getAllUsers()
      .then(data => setPlayers(data.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="large" text="Cargando jugadores..." />;

  const registeredCount = players.filter(p => p.is_registered).length;
  const sortedPlayers = players.sort((a, b) => {
    // Registered players first, then by seed
    if (a.is_registered !== b.is_registered) return b.is_registered - a.is_registered;
    return (a.seed_number || 999) - (b.seed_number || 999);
  });

  return (
    <div className="players-page">
      <div className="players-header">
        <div className="players-header-left">
          <h1 className="players-title">Jugadores</h1>
          <span className="players-count">{registeredCount} registrados</span>
          <span className="players-count players-count-total">{players.length} total</span>
        </div>
        <div className="players-header-right">
          <UsersIcon />
        </div>
      </div>

      <p className="players-subtitle">Lista de jugadores registrados en el torneo</p>

      {players.length === 0 ? (
        <div className="players-empty">
          <p>Aun no hay jugadores registrados.</p>
        </div>
      ) : (
        <div className="players-grid">
          {sortedPlayers.map(player => (
            <a
              key={player.id}
              href={`https://osu.ppy.sh/users/${player.osu_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`player-card ${!player.is_registered ? 'not-registered' : ''}`}
            >
              <div className={`player-seed-container ${!player.is_registered ? 'not-registered' : ''}`}>
                <span className={`player-seed ${!player.seed_number ? 'unranked' : ''}`}>
                  {player.seed_number || '—'}
                </span>
              </div>
              <img
                src={`https://a.ppy.sh/${player.osu_id}`}
                alt={player.username}
                className="player-avatar"
              />
              <div className="player-info">
                <span className="player-name">{player.username}</span>
                <div className="player-meta">
                  <span className="player-flag">{player.flag_code}</span>
                  {!player.is_registered && <span className="player-status not-registered">No inscrito</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
