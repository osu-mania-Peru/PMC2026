import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { api } from '../api';
import catGif from '../assets/cat.gif';
import MatchSchedulingPanel from '../components/MatchSchedulingPanel';
import './MatchScheduling.css';

export default function MatchScheduling({ user }) {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [users, setUsers] = useState({});
  const [allMatches, setAllMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);

  useEffect(() => {
    const fetches = [
      api.getMatch(matchId),
      api.getAllUsers(),
    ];
    if (user?.is_staff) {
      fetches.push(api.getMatches({}));
    }
    Promise.all(fetches)
      .then(([matchData, usersData, matchesData]) => {
        setMatch(matchData);
        const userMap = {};
        usersData.users.forEach(u => { userMap[u.id] = u; });
        setUsers(userMap);
        if (matchesData) {
          setAllMatches(
            matchesData.matches.filter(m => m.player1_id && m.player2_id && !m.is_completed)
          );
        }
      })
      .catch(err => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, [matchId]);

  // Close switcher on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const player1 = match ? users[match.player1_id] : null;
  const player2 = match ? users[match.player2_id] : null;

  if (loading) {
    return (
      <div className="match-scheduling-page">
        <div className="match-scheduling-loading">
          <img src={catGif} alt="" className="btn-loading-cat" />
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="match-scheduling-page">
        <p className="match-scheduling-error">{error || 'Partida no encontrada.'}</p>
        <button className="match-scheduling-back" onClick={() => navigate('/matches')}>
          <ArrowLeft size={14} /> Volver a partidas
        </button>
      </div>
    );
  }

  return (
    <div className="match-scheduling-page">
      <div className="match-scheduling-top">
        <button className="match-scheduling-back" onClick={() => navigate('/matches')}>
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="match-scheduling-players-wrap" ref={switcherRef}>
          <div
            className={`match-scheduling-players ${user?.is_staff && allMatches.length > 1 ? 'match-scheduling-players--clickable' : ''}`}
            onClick={() => { if (user?.is_staff && allMatches.length > 1) setSwitcherOpen(v => !v); }}
          >
            <div className="match-scheduling-player">
              {player1?.osu_id && <img src={`https://a.ppy.sh/${player1.osu_id}`} alt="" className="match-scheduling-avatar" />}
              <span>{player1?.username || 'TBD'}</span>
            </div>
            <span className="match-scheduling-vs">vs</span>
            <div className="match-scheduling-player">
              {player2?.osu_id && <img src={`https://a.ppy.sh/${player2.osu_id}`} alt="" className="match-scheduling-avatar" />}
              <span>{player2?.username || 'TBD'}</span>
            </div>
            {user?.is_staff && allMatches.length > 1 && (
              <ChevronDown size={16} className={`match-scheduling-chevron ${switcherOpen ? 'match-scheduling-chevron--open' : ''}`} />
            )}
          </div>

          {switcherOpen && (
            <div className="match-scheduling-switcher">
              {allMatches
                .filter(m => m.id !== match.id)
                .map(m => {
                  const p1 = users[m.player1_id];
                  const p2 = users[m.player2_id];
                  return (
                    <div
                      key={m.id}
                      className="match-scheduling-switcher-item"
                      onClick={() => { setSwitcherOpen(false); navigate(`/matches/${m.id}/schedule`); }}
                    >
                      {p1?.osu_id && <img src={`https://a.ppy.sh/${p1.osu_id}`} alt="" className="match-scheduling-switcher-avatar" />}
                      <span>{p1?.username || 'TBD'}</span>
                      <span className="match-scheduling-switcher-vs">vs</span>
                      <span>{p2?.username || 'TBD'}</span>
                      {p2?.osu_id && <img src={`https://a.ppy.sh/${p2.osu_id}`} alt="" className="match-scheduling-switcher-avatar" />}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <MatchSchedulingPanel
        match={match}
        user={user}
        users={users}
        onClose={() => navigate('/matches')}
      />
    </div>
  );
}
