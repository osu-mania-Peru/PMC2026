import { useEffect, useState } from 'react';
import { api } from '../api';
import BracketTree from '../components/BracketTree';

export default function Brackets() {
  const [brackets, setBrackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBracket, setSelectedBracket] = useState(null);

  useEffect(() => {
    api.getBrackets()
      .then(data => setBrackets(data.brackets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="page">
      <h2>Brackets del Torneo</h2>

      <div className="bracket-grid">
        {brackets.map(bracket => (
          <div key={bracket.id} className="bracket-card">
            <h3>{bracket.bracket_name}</h3>
            <p>Tamaño: {bracket.bracket_size} jugadores</p>
            <p>Partidas: {bracket.completed_matches || 0}/{bracket.total_matches || 0}</p>

            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${bracket.total_matches > 0 ? (bracket.completed_matches / bracket.total_matches) * 100 : 0}%`
                }}
              />
            </div>

            <span className={`status ${bracket.is_completed ? 'completed' : 'in_progress'}`}>
              {bracket.is_completed ? 'Completado' : 'En Progreso'}
            </span>

            {bracket.total_matches > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                <button
                  onClick={() => setSelectedBracket(selectedBracket === bracket.id ? null : bracket.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: selectedBracket === bracket.id ? '#ff0000' : '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {selectedBracket === bracket.id ? 'Ocultar Bracket' : 'Ver Bracket'}
                </button>
                <a href={`/matches?bracket_id=${bracket.id}`} style={{ textAlign: 'center' }}>
                  Ver Partidas →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {brackets.length === 0 && (
        <p>Aún no se han creado brackets.</p>
      )}

      {selectedBracket && <BracketTree bracketId={selectedBracket} api={api} />}
    </div>
  );
}
