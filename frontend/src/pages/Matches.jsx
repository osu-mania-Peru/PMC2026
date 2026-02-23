import { useEffect, useState } from 'react';
import { api } from '../api';
import PageTransition from '../components/PageTransition';
import MatchCard from '../components/MatchCard';
import './Matches.css';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 5;

  useEffect(() => {
    Promise.all([
      api.getMatches(filter !== 'all' ? { status: filter } : {}),
      api.getAllUsers()
    ])
      .then(([matchesData, usersData]) => {
        // Filter out placeholder matches where both players are TBD
        setMatches(matchesData.matches.filter(m => m.player1_id || m.player2_id));
        const userMap = {};
        usersData.users.forEach(user => {
          userMap[user.id] = user;
        });
        setUsers(userMap);
      })
      .catch(err => setLoadError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleFilterChange = (newFilter) => {
    if (newFilter === filter) return; // Don't reload if already on this filter
    setLoading(true);
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const getPlayer = (playerId) => users[playerId] || null;

  const formatDate = (time) => {
    if (!time) return 'DD/MM/YYYY';
    return new Date(time).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusInfo = (match) => {
    switch (match.match_status) {
      case 'scheduled':
        return {
          text: `Programado para el ${formatDate(match.scheduled_time)}`,
          type: 'scheduled'
        };
      case 'in_progress':
        return {
          text: 'Jugando Ahora',
          type: 'live'
        };
      case 'completed':
        return {
          text: `Jugado el ${formatDate(match.scheduled_time)}`,
          type: 'completed'
        };
      default:
        return { text: '', type: '' };
    }
  };

  const filterOptions = [
    { value: 'all', label: 'TODAS' },
    { value: 'scheduled', label: 'PROGRAMADAS' },
    { value: 'in_progress', label: 'EN VIVO' },
    { value: 'completed', label: 'FINALIZADAS' },
  ];

  // Pagination
  const totalPages = Math.ceil(matches.length / matchesPerPage);
  const startIndex = (currentPage - 1) * matchesPerPage;
  const paginatedMatches = matches.slice(startIndex, startIndex + matchesPerPage);

  return (
    <PageTransition loading={loading} error={loadError} text="Cargando partidas...">
      <div className="matches-page">
      <div className="matches-header">
        <div className="matches-header-left">
          <h1 className="matches-title">PARTIDAS // MATCHS</h1>
          <p className="matches-subtitle">Historial de las partidas jugadas en el torneo actual.</p>
        </div>
        <div className="matches-header-right">
          <img src="/trophy.svg" alt="Trophy" className="trophy-icon" />
        </div>
      </div>

      <div className="matches-filter">
        <span className="filter-label">FILTRAR POR:</span>
        <div className="filter-tags">
          {filterOptions.map(option => (
            <button
              key={option.value}
              className={`filter-tag ${filter === option.value ? 'active' : ''}`}
              onClick={() => handleFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="matches-empty">No se encontraron partidas.</p>
      ) : (
        <>
          <div className="matches-list">
            {paginatedMatches.map(match => {
              const player1 = getPlayer(match.player1_id);
              const player2 = getPlayer(match.player2_id);
              const statusInfo = getStatusInfo(match);
              const hasScore = match.player1_score !== null && match.player2_score !== null;

              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  player1={player1}
                  player2={player2}
                  statusInfo={statusInfo}
                  hasScore={hasScore}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      </div>
    </PageTransition>
  );
}
