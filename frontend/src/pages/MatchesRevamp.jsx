import { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import './MatchesRevamp.css';

export default function MatchesRevamp() {
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const handleFilterChange = (newFilter) => {
    if (newFilter === filter) return;
    setLoading(true);
    setFilter(newFilter);
  };

  const getPlayer = (playerId) => users[playerId] || null;

  const formatDate = (time) => {
    if (!time) return null;
    const date = new Date(time);
    return {
      day: date.toLocaleDateString('es-PE', { day: '2-digit' }),
      month: date.toLocaleDateString('es-PE', { month: 'short' }).toUpperCase(),
      time: date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
  };

  const stats = useMemo(() => {
    const live = matches.filter(m => m.match_status === 'in_progress').length;
    const completed = matches.filter(m => m.match_status === 'completed').length;
    const scheduled = matches.filter(m => m.match_status === 'scheduled').length;
    return { total: matches.length, live, completed, scheduled };
  }, [matches]);

  const liveMatch = useMemo(() => {
    return matches.find(m => m.match_status === 'in_progress');
  }, [matches]);

  const groupedMatches = useMemo(() => {
    const groups = {
      live: [],
      upcoming: [],
      completed: []
    };

    matches.forEach(match => {
      if (match.match_status === 'in_progress') {
        groups.live.push(match);
      } else if (match.match_status === 'scheduled') {
        groups.upcoming.push(match);
      } else {
        groups.completed.push(match);
      }
    });

    // Sort upcoming by date
    groups.upcoming.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    // Sort completed by date descending
    groups.completed.sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time));

    return groups;
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (filter === 'all') {
      return [...groupedMatches.live, ...groupedMatches.upcoming, ...groupedMatches.completed];
    }
    if (filter === 'in_progress') return groupedMatches.live;
    if (filter === 'scheduled') return groupedMatches.upcoming;
    if (filter === 'completed') return groupedMatches.completed;
    return [];
  }, [filter, groupedMatches]);

  if (loading) return <Spinner size="large" text="Cargando partidas..." />;

  return (
    <div className="mr">
      {/* Live Match Hero */}
      {liveMatch && filter === 'all' && (
        <section className="mr-live-hero">
          <div className="mr-live-pulse" />
          <div className="mr-live-content">
            <div className="mr-live-badge">
              <span className="mr-live-dot" />
              EN VIVO
            </div>

            <div className="mr-live-match">
              <div className="mr-live-player mr-live-player-1">
                <img
                  src={`https://a.ppy.sh/${getPlayer(liveMatch.player1_id)?.osu_id}`}
                  alt=""
                  className="mr-live-avatar"
                />
                <span className="mr-live-name">
                  {getPlayer(liveMatch.player1_id)?.username || 'TBD'}
                </span>
                {liveMatch.player1_score !== null && (
                  <span className="mr-live-score">{liveMatch.player1_score}</span>
                )}
              </div>

              <div className="mr-live-vs">
                <span>VS</span>
                <div className="mr-live-round">{liveMatch.round_name || 'MATCH'}</div>
              </div>

              <div className="mr-live-player mr-live-player-2">
                <img
                  src={`https://a.ppy.sh/${getPlayer(liveMatch.player2_id)?.osu_id}`}
                  alt=""
                  className="mr-live-avatar"
                />
                <span className="mr-live-name">
                  {getPlayer(liveMatch.player2_id)?.username || 'TBD'}
                </span>
                {liveMatch.player2_score !== null && (
                  <span className="mr-live-score">{liveMatch.player2_score}</span>
                )}
              </div>
            </div>

            {liveMatch.mp_link && (
              <a href={liveMatch.mp_link} target="_blank" rel="noopener noreferrer" className="mr-live-link">
                VER PARTIDA EN VIVO
              </a>
            )}
          </div>
        </section>
      )}

      {/* Stats Strip */}
      <div className="mr-stats">
        <div className="mr-stat">
          <span className="mr-stat-num">{stats.total}</span>
          <span className="mr-stat-label">TOTAL</span>
        </div>
        <div className="mr-stat mr-stat-live">
          <span className="mr-stat-num">{stats.live}</span>
          <span className="mr-stat-label">EN VIVO</span>
        </div>
        <div className="mr-stat">
          <span className="mr-stat-num">{stats.scheduled}</span>
          <span className="mr-stat-label">PROGRAMADAS</span>
        </div>
        <div className="mr-stat">
          <span className="mr-stat-num">{stats.completed}</span>
          <span className="mr-stat-label">FINALIZADAS</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mr-filters">
        {[
          { key: 'all', label: 'TODAS' },
          { key: 'in_progress', label: 'EN VIVO', dot: true },
          { key: 'scheduled', label: 'PROXIMAS' },
          { key: 'completed', label: 'FINALIZADAS' },
        ].map(f => (
          <button
            key={f.key}
            className={`mr-filter ${filter === f.key ? 'active' : ''}`}
            onClick={() => handleFilterChange(f.key)}
          >
            {f.dot && <span className="mr-filter-dot" />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Matches List */}
      {filteredMatches.length === 0 ? (
        <div className="mr-empty">
          <div className="mr-empty-icon">0</div>
          <p>No hay partidas en esta categoria</p>
        </div>
      ) : (
        <div className="mr-list">
          {filteredMatches.map((match, idx) => {
            const player1 = getPlayer(match.player1_id);
            const player2 = getPlayer(match.player2_id);
            const date = formatDate(match.scheduled_time);
            const isLive = match.match_status === 'in_progress';
            const isCompleted = match.match_status === 'completed';
            const hasScore = match.player1_score !== null && match.player2_score !== null;

            // Determine winner
            let winner = null;
            if (isCompleted && hasScore) {
              if (match.player1_score > match.player2_score) winner = 1;
              else if (match.player2_score > match.player1_score) winner = 2;
            }

            return (
              <div
                key={match.id}
                className={`mr-match ${isLive ? 'live' : ''} ${isCompleted ? 'completed' : ''}`}
                style={{ '--i': idx }}
              >
                {/* Date Column */}
                <div className="mr-match-date">
                  {date ? (
                    <>
                      <span className="mr-match-day">{date.day}</span>
                      <span className="mr-match-month">{date.month}</span>
                    </>
                  ) : (
                    <span className="mr-match-tbd">TBD</span>
                  )}
                </div>

                {/* Status Indicator */}
                <div className={`mr-match-status ${match.match_status}`}>
                  {isLive && <span className="mr-match-live-dot" />}
                </div>

                {/* Player 1 */}
                <div className={`mr-match-player ${winner === 1 ? 'winner' : ''} ${winner === 2 ? 'loser' : ''}`}>
                  <img
                    src={player1?.osu_id ? `https://a.ppy.sh/${player1.osu_id}` : ''}
                    alt=""
                    className="mr-match-avatar"
                  />
                  <span className="mr-match-name">{player1?.username || 'TBD'}</span>
                  {player1?.seed_number && (
                    <span className="mr-match-seed">#{player1.seed_number}</span>
                  )}
                </div>

                {/* Score */}
                <div className="mr-match-score-wrap">
                  {hasScore ? (
                    <div className="mr-match-score">
                      <span className={winner === 1 ? 'winner' : ''}>{match.player1_score}</span>
                      <span className="mr-match-score-sep">:</span>
                      <span className={winner === 2 ? 'winner' : ''}>{match.player2_score}</span>
                    </div>
                  ) : (
                    <div className="mr-match-vs">VS</div>
                  )}
                  {match.round_name && (
                    <span className="mr-match-round">{match.round_name}</span>
                  )}
                </div>

                {/* Player 2 */}
                <div className={`mr-match-player mr-match-player-right ${winner === 2 ? 'winner' : ''} ${winner === 1 ? 'loser' : ''}`}>
                  <span className="mr-match-name">{player2?.username || 'TBD'}</span>
                  {player2?.seed_number && (
                    <span className="mr-match-seed">#{player2.seed_number}</span>
                  )}
                  <img
                    src={player2?.osu_id ? `https://a.ppy.sh/${player2.osu_id}` : ''}
                    alt=""
                    className="mr-match-avatar"
                  />
                </div>

                {/* Link */}
                {match.mp_link && (
                  <a
                    href={match.mp_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-match-link"
                  >
                    MP
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
