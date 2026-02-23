import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api';
import catGif from '../assets/cat.gif';
import MatchSchedulingPanel from '../components/MatchSchedulingPanel';
import './MatchScheduling.css';

export default function MatchScheduling({ user }) {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getMatch(matchId),
      api.getAllUsers(),
    ])
      .then(([matchData, usersData]) => {
        setMatch(matchData);
        const userMap = {};
        usersData.users.forEach(u => { userMap[u.id] = u; });
        setUsers(userMap);
      })
      .catch(err => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, [matchId]);

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
        <div className="match-scheduling-players">
          <span className="match-scheduling-player">{player1?.username || 'TBD'}</span>
          <span className="match-scheduling-vs">vs</span>
          <span className="match-scheduling-player">{player2?.username || 'TBD'}</span>
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
