import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { api } from '../api';
import BracketTree from '../components/BracketTree';
import MatchEditModal from '../components/MatchEditModal';
import Spinner from '../components/Spinner';
import catGif from '../assets/cat.gif';
import './Brackets.css'

export default function Brackets({ user }) {
  const { bracketType } = useParams();
  const navigate = useNavigate();
  const [brackets, setBrackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState(null);
  const [users, setUsers] = useState([]);
  const [maps, setMaps] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [bracketSize, setBracketSize] = useState(8);

  useEffect(() => {
    api.getBrackets()
      .then(data => setBrackets(data.brackets))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load users and maps for staff modal
    if (user?.is_staff) {
      api.getAllUsers()
        .then(data => setUsers(data.users || []))
        .catch(console.error);
      api.getMaps()
        .then(data => setMaps(data.maps || []))
        .catch(console.error);
    }
  }, [user?.is_staff]);

  const handleEditMatch = (match) => {
    setEditingMatch(match);
  };

  const handleCreateMatch = (matchTemplate) => {
    // matchTemplate has bracket_id, round_name, and _slotInfo
    setEditingMatch(matchTemplate);
  };

  const handleSaveMatch = async (matchId, data) => {
    await api.updateMatch(matchId, data);
    // Refresh brackets data
    const bracketsData = await api.getBrackets();
    setBrackets(bracketsData.brackets);
  };

  const handleCreateNewMatch = async (data) => {
    await api.createMatch(data);
    // Refresh brackets data
    const bracketsData = await api.getBrackets();
    setBrackets(bracketsData.brackets);
  };

  const handleCloseModal = () => {
    setEditingMatch(null);
  };

  const handleGenerateBrackets = async () => {
    if (!window.confirm(`¿Generar brackets de ${bracketSize} jugadores? Esto eliminará brackets existentes.`)) {
      return;
    }
    setGenerating(true);
    try {
      await api.generateBrackets(bracketSize);
      const data = await api.getBrackets();
      setBrackets(data.brackets);
    } catch (err) {
      alert(err.message || 'Error generando brackets');
    } finally {
      setGenerating(false);
    }
  };

  // Find brackets by type
  const winnerBracket = brackets.find(b => b.bracket_type === 'winner');
  const loserBracket = brackets.find(b => b.bracket_type === 'loser');
  const grandFinalsBracket = brackets.find(b => b.bracket_type === 'grandfinals');

  // Default brackets if none exist
  const defaultBrackets = {
    winner: {
      id: 'default-winner',
      bracket_name: 'Winner Bracket',
      bracket_size: 32,
      type: 'winner'
    },
    loser: {
      id: 'default-loser',
      bracket_name: 'Loser Bracket',
      bracket_size: 32,
      type: 'loser'
    },
    grandfinals: {
      id: 'default-grandfinals',
      bracket_name: 'Grand Finals',
      bracket_size: 2,
      type: 'grandfinals'
    }
  };

  // Get current bracket based on route
  const getCurrentBracket = () => {
    switch (bracketType) {
      case 'winner':
        return { bracket: winnerBracket, default: defaultBrackets.winner };
      case 'loser':
        return { bracket: loserBracket, default: defaultBrackets.loser };
      case 'grandfinals':
        return { bracket: grandFinalsBracket, default: defaultBrackets.grandfinals };
      default:
        return { bracket: winnerBracket, default: defaultBrackets.winner };
    }
  };

  const currentBracket = getCurrentBracket();

  const tabs = [
    { id: 'winner', label: 'WINNERS BRACKET' },
    { id: 'loser', label: 'LOSERS BRACKET' },
    { id: 'grandfinals', label: 'GRANDFINALS BRACKET' }
  ];

  return (
    <div className='brackets-page'>
      <div className='bracket-nav' data-active={bracketType || 'winner'}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`bracket-nav-item ${bracketType === tab.id ? 'active' : ''}`}
            data-type={tab.id}
            onClick={() => navigate(`/brackets/${tab.id}`)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size="large" text="Cargando brackets..." />
      ) : brackets.length === 0 && user?.is_staff ? (
        <div className="no-brackets-container">
          <div className="no-brackets-card">
            <Trophy size={48} className="no-brackets-icon" />
            <h2>No hay brackets</h2>
            <p>Genera brackets para comenzar el torneo</p>
            <div className="generate-brackets-form">
              <select
                value={bracketSize}
                onChange={(e) => setBracketSize(parseInt(e.target.value))}
                disabled={generating}
                className="bracket-size-select"
              >
                <option value={4}>4 jugadores</option>
                <option value={8}>8 jugadores</option>
                <option value={16}>16 jugadores</option>
                <option value={32}>32 jugadores</option>
              </select>
              <button
                onClick={handleGenerateBrackets}
                disabled={generating}
                className="generate-brackets-btn"
              >
                {generating ? (
                  <><img src={catGif} alt="" className="btn-loading-cat" /> Generando...</>
                ) : 'Generar Brackets'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className='bracket-container' data-bracket-type={bracketType || 'winner'}>
          <BracketTree
            bracketId={currentBracket.bracket?.id || null}
            api={api}
            defaultBracket={currentBracket.default}
            hideTitle
            user={user}
            onEditMatch={handleEditMatch}
            onCreateMatch={handleCreateMatch}
          />
        </div>
      )}

      {/* Match Edit Modal for Staff */}
      <MatchEditModal
        isOpen={!!editingMatch}
        match={editingMatch}
        users={users}
        maps={maps}
        onSave={handleSaveMatch}
        onCreate={handleCreateNewMatch}
        onClose={handleCloseModal}
      />
    </div>
  );
}
