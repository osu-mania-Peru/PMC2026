import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import './Matches.css';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const params = {};
    if (filter !== 'all') params.status = filter;

    api.getMatches(params)
      .then(data => setMatches(data.matches))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return <div className="loading">Cargando...</div>;

  const filterOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'scheduled', label: 'Programadas' },
    { value: 'in_progress', label: 'En Vivo' },
    { value: 'completed', label: 'Finalizadas' },
  ];

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'in_progress': return 'En Vivo';
      case 'completed': return 'Finalizada';
      default: return status;
    }
  };

  const handleFilterSelect = (value) => {
    setFilter(value);
    setDropdownOpen(false);
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
        <div className="matches-grid">
          {matches.map(match => (
            <div key={match.id} className="match-card">
              <div className="match-header">
                <span className="match-id">#{match.id}</span>
                <span className={`match-status ${match.match_status}`}>
                  {getStatusText(match.match_status)}
                </span>
              </div>
              <div className="match-players">
                <div className={`match-player ${match.winner_id === match.player1_id ? 'winner' : ''}`}>
                  <span className="player-name-match">Jugador {match.player1_id}</span>
                  <span className="player-score">
                    {match.player1_score !== null ? match.player1_score : '—'}
                  </span>
                </div>
                <div className={`match-player ${match.winner_id === match.player2_id ? 'winner' : ''}`}>
                  <span className="player-name-match">Jugador {match.player2_id}</span>
                  <span className="player-score">
                    {match.player2_score !== null ? match.player2_score : '—'}
                  </span>
                </div>
              </div>
              <div className="match-footer">
                <span className="match-date">
                  {match.scheduled_time
                    ? new Date(match.scheduled_time).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Por Definir'
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
