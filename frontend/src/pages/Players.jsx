import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import './Players.css';

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

  const sortedPlayers = players.sort((a, b) => (a.seed_number || 999) - (b.seed_number || 999));

  return (
    <div className="players-page">
      <div className="players-header">
        <h2>Jugadores</h2>
        <div className="players-count">{players.length}/32</div>
      </div>

      {players.length === 0 ? (
        <p className="players-empty">Aún no hay jugadores registrados.</p>
      ) : (
        <div className="players-grid">
          {sortedPlayers.map(player => (
            <div key={player.id} className="player-card">
              <img
                src={`https://a.ppy.sh/${player.osu_id}`}
                alt={player.username}
                className="player-avatar"
              />
              <div className={`player-seed ${!player.seed_number ? 'unranked' : ''}`}>
                {player.seed_number || '—'}
              </div>
              <div className="player-info">
                <a
                  href={`https://osu.ppy.sh/users/${player.osu_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="player-name"
                >
                  {player.username}
                </a>
                <div className="player-meta">
                  <span className="player-flag">{player.flag_code}</span>
                  <span className="player-osu-id">#{player.osu_id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
