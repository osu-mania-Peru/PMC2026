import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import './Matches.css';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.getMatches(filter !== 'all' ? { status: filter } : {}),
      api.getAllUsers()
    ])
      .then(([matchesData, usersData]) => {
        setMatches(matchesData.matches);
        const userMap = {};
        usersData.users.forEach(user => {
          userMap[user.id] = user;
        });
        setUsers(userMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return <Spinner size="large" text="Cargando partidas..." />;

  const filterOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'scheduled', label: 'Programadas' },
    { value: 'in_progress', label: 'En Vivo' },
    { value: 'completed', label: 'Finalizadas' },
  ];

  const getStatusClass = (status) => {
    switch (status) {
      case 'scheduled': return 'scheduled';
      case 'in_progress': return 'live';
      case 'completed': return 'completed';
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'in_progress': return 'En Vivo';
      case 'completed': return 'Finalizada';
      default: return status;
    }
  };

  const handleFilterSelect = (value) => {
    setLoading(true);
    setFilter(value);
    setDropdownOpen(false);
  };

  const getPlayer = (playerId) => users[playerId] || null;

  const getAvatarUrl = (player) => {
    if (!player?.osu_id) return null;
    return `https://a.ppy.sh/${player.osu_id}`;
  };

  const formatMatchTime = (time) => {
    if (!time) return 'TBD';
    return new Date(time).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="matches-page">
      <div className="matches-header">
        <h2>Partidas</h2>
        <div className="matches-filter" ref={dropdownRef}>
          <label>Filtrar:</label>
          <div className="custom-dropdown">
            <button
              className={`dropdown-trigger ${dropdownOpen ? 'open' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>{filterOptions.find(o => o.value === filter)?.label}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 8L1 3h10z"/>
              </svg>
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                {filterOptions.map(option => (
                  <button
                    key={option.value}
                    className={`dropdown-item ${filter === option.value ? 'active' : ''}`}
                    onClick={() => handleFilterSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="matches-empty">No se encontraron partidas.</p>
      ) : (
        <div className="matches-list">
          {matches.map(match => {
            const player1 = getPlayer(match.player1_id);
            const player2 = getPlayer(match.player2_id);
            const isPlayer1Winner = match.winner_id === match.player1_id;
            const isPlayer2Winner = match.winner_id === match.player2_id;
            const statusClass = getStatusClass(match.match_status);

            return (
              <div key={match.id} className={`match-card ${statusClass}`}>
                {/* Header */}
                <div className="match-card-header">
                  <span className="match-round">{match.round_name}</span>
                  <span className={`match-status ${statusClass}`}>
                    {getStatusText(match.match_status)}
                  </span>
                </div>

                {/* Body */}
                <div className="match-card-body">
                  {/* Player 1 */}
                  <div className={`player-row left ${isPlayer1Winner ? 'winner' : ''}`}>
                    {getAvatarUrl(player1) ? (
                      <img src={getAvatarUrl(player1)} alt="" className="player-avatar" />
                    ) : (
                      <div className="player-avatar placeholder" />
                    )}
                    <div className="player-info">
                      <span className="player-name">{player1?.username || 'TBD'}</span>
                      {player1?.seed_number && (
                        <span className="player-seed">#{player1.seed_number}</span>
                      )}
                    </div>
                    <span className="player-score">
                      {match.player1_score ?? '—'}
                    </span>
                  </div>

                  {/* Center */}
                  <div className="match-center">
                    <span className="match-time">{formatMatchTime(match.scheduled_time)}</span>
                    <span className="match-id">#{match.id}</span>
                  </div>

                  {/* Player 2 */}
                  <div className={`player-row right ${isPlayer2Winner ? 'winner' : ''}`}>
                    {getAvatarUrl(player2) ? (
                      <img src={getAvatarUrl(player2)} alt="" className="player-avatar" />
                    ) : (
                      <div className="player-avatar placeholder" />
                    )}
                    <div className="player-info">
                      <span className="player-name">{player2?.username || 'TBD'}</span>
                      {player2?.seed_number && (
                        <span className="player-seed">#{player2.seed_number}</span>
                      )}
                    </div>
                    <span className="player-score">
                      {match.player2_score ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                {(match.match_status === 'in_progress' || match.match_status === 'completed') && (
                  <div className="match-card-footer">
                    {match.match_status === 'in_progress' && (
                      <a href="#" className="match-link live">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M11.64 14.5h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M4.93 5.93h4.28v4.28H4.93m0 4.28h4.28v4.28H4.93M21 3H3v18h18V3z"/>
                        </svg>
                        En Vivo
                      </a>
                    )}
                    {match.match_status === 'completed' && (
                      <a href="#" className="match-link">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                        </svg>
                        VOD
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
