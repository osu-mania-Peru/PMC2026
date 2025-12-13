import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import BracketTree from '../components/BracketTree';
import Spinner from '../components/Spinner';
import './Brackets.css'

export default function Brackets() {
  const { bracketType } = useParams();
  const navigate = useNavigate();
  const [brackets, setBrackets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBrackets()
      .then(data => setBrackets(data.brackets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
    { id: 'winner', label: 'WINNERS' },
    { id: 'loser', label: 'LOSERS' },
    { id: 'grandfinals', label: 'GRAND FINALS' }
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
      ) : (
        <div className='bracket-container' data-bracket-type={bracketType || 'winner'}>
          <BracketTree
            bracketId={currentBracket.bracket?.id || null}
            api={api}
            defaultBracket={currentBracket.default}
            hideTitle
          />
        </div>
      )}
    </div>
  );
}
