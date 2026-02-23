import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Download } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/PageTransition';
import MatchCard from '../components/MatchCard';
import './Matches.css';

export default function Matches({ user }) {
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

  const exportDecidedCSV = () => {
    const decided = matches.filter(m =>
      m.scheduled_time && m.player1_id && m.player2_id
    );
    if (decided.length === 0) return;

    const rows = [['Match ID', 'Jugador 1', 'Jugador 2', 'Fecha (Peru)', 'Hora (Peru)', 'Ronda', 'Estado']];
    for (const m of decided) {
      const p1 = getPlayer(m.player1_id);
      const p2 = getPlayer(m.player2_id);
      const dt = new Date(m.scheduled_time);
      const date = dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });
      const time = dt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
      rows.push([
        m.id,
        p1?.username || `ID ${m.player1_id}`,
        p2?.username || `ID ${m.player2_id}`,
        date,
        time,
        m.round_name || '',
        m.match_status,
      ]);
    }

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partidas_programadas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          {user?.is_staff && matches.some(m => m.scheduled_time && m.player1_id && m.player2_id) && (
            <button className="matches-export-btn" onClick={exportDecidedCSV}>
              <Download size={14} /> EXPORTAR CSV
            </button>
          )}
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

              const isParticipant = user && (user.id === match.player1_id || user.id === match.player2_id);
              const canSchedule = (isParticipant || user?.is_staff) && !match.is_completed;

              return (
                <div key={match.id} className="match-card-wrapper">
                  <MatchCard
                    match={match}
                    player1={player1}
                    player2={player2}
                    statusInfo={statusInfo}
                    hasScore={hasScore}
                  />
                  {canSchedule && (
                    <Link
                      to={`/matches/${match.id}/schedule`}
                      className="match-schedule-btn"
                    >
                      <Calendar size={14} /> Coordinar Horario
                    </Link>
                  )}
                </div>
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
