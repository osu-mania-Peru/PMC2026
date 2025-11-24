import { useEffect, useState } from 'react';
import { api } from '../api';
import BracketTree from '../components/BracketTree';
import './Brackets.css'
export default function Brackets() {
  const [brackets, setBrackets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBrackets()
      .then(data => setBrackets(data.brackets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando...</div>;

  // Find winner, loser, and grand finals brackets
  const winnerBracket = brackets.find(b => b.bracket_type === 'winner');
  const loserBracket = brackets.find(b => b.bracket_type === 'loser');
  const grandFinalsBracket = brackets.find(b => b.bracket_type === 'grandfinals');

  // Default brackets if none exist
  const defaultWinnerBracket = {
    id: 'default-winner',
    bracket_name: 'Winner Bracket',
    bracket_size: 16,
    type: 'winner'
  };

  const defaultLoserBracket = {
    id: 'default-loser',
    bracket_name: 'Loser Bracket',
    bracket_size: 16,
    type: 'loser'
  };

  const defaultGrandFinalsBracket = {
    id: 'default-grandfinals',
    bracket_name: 'Grand Finals',
    bracket_size: 2,
    type: 'grandfinals'
  };

  return (
    <div className='brackets-page'>
      <div className='bracket-container'>
        <BracketTree bracketId={winnerBracket?.id || null} api={api} defaultBracket={defaultWinnerBracket} />
      </div>
      <div className='bracket-container'>
        <BracketTree bracketId={loserBracket?.id || null} api={api} defaultBracket={defaultLoserBracket} />
      </div>
      <div className='bracket-container grandfinals'>
        <BracketTree bracketId={grandFinalsBracket?.id || null} api={api} defaultBracket={defaultGrandFinalsBracket} />
      </div>
    </div>
  );
}
