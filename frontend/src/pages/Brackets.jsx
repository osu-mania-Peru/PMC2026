import { useEffect, useState } from 'react';
import { api } from '../api';

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
              <p style={{ marginTop: '1rem' }}>
                <a href={`/matches?bracket_id=${bracket.id}`}>Ver Partidas →</a>
              </p>
            )}
          </div>
        ))}
      </div>

      {brackets.length === 0 && (
        <p>Aún no se han creado brackets.</p>
      )}
    </div>
  );
}
