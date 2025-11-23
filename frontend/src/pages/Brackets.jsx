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

  return (
    <div className="page">
      <h2>Brackets del Torneo</h2>

      {brackets.length === 0 && (
        <p>Aún no se han creado brackets.</p>
      )}

      {brackets.map(bracket => (
        <div key={bracket.id} style={{ marginBottom: '3rem' }}>
          <div className="bracket-card">
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
              <div style={{ marginTop: '1rem' }}>
                <a href={`/matches?bracket_id=${bracket.id}`}>Ver Partidas →</a>
              </div>
            )}
          </div>

          <BracketTree bracketId={bracket.id} api={api} />
        </div>
      ))}
    </div>
  );
}
