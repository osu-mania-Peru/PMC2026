import { useEffect, useState } from 'react';
import { api } from '../api';
import BracketTree from '../components/BracketTree';

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

  // Always show a 32-player bracket skeleton
  const defaultBracket = {
    id: 'default',
    bracket_name: 'PMC2026',
    bracket_size: 32
  };

  return (
    <BracketTree bracketId={brackets.length > 0 ? brackets[0].id : null} api={api} defaultBracket={defaultBracket} />
  );
}
