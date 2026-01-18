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

  const registeredPlayers = players.filter(p => p.is_registered);
  const sortedPlayers = registeredPlayers.sort((a, b) => (b.mania_pp || 0) - (a.mania_pp || 0));

  return (
    <div className="players-page">
      <div className="players-header">
        <div className="players-header-left">
          <h1 className="players-title">Jugadores</h1>
          <span className="players-count">{registeredPlayers.length} registrados</span>
        </div>
        <div className="players-header-right">
          <UsersIcon />
        </div>
      </div>

      <p className="players-subtitle">Lista de jugadores registrados en el torneo · Rangos nacionales (Perú)</p>

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
              className="player-card"
            >
              <div className="player-seed-container">
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
                <div className="player-stats">
                  {player.mania_country_rank && (
                    <span className="player-country-rank">#{player.mania_country_rank}</span>
                  )}
                  {player.mania_pp && (
                    <span className="player-pp">{Math.round(player.mania_pp).toLocaleString()}<span className="pp-label">pp</span></span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
