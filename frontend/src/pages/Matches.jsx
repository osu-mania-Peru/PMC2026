import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const params = {};
    if (filter !== 'all') params.status = filter;

    api.getMatches(params)
      .then(data => setMatches(data.matches))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="page">
      <h2>Partidas</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label>Filtrar: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '0.5rem', background: '#2a2a2a', color: '#e0e0e0', border: '1px solid #555' }}>
          <option value="all">Todas las Partidas</option>
          <option value="scheduled">Programadas</option>
          <option value="in_progress">En Progreso</option>
          <option value="completed">Completadas</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Partida #</th>
            <th>Jugador 1</th>
            <th>Jugador 2</th>
            <th>Puntaje</th>
            <th>Estado</th>
            <th>Programada</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(match => (
            <tr key={match.id}>
              <td>#{match.id}</td>
              <td>Jugador {match.player1_id}</td>
              <td>Jugador {match.player2_id}</td>
              <td>
                {match.player1_score !== null && match.player2_score !== null
                  ? `${match.player1_score} - ${match.player2_score}`
                  : '-'
                }
              </td>
              <td>
                <span className={`status ${match.match_status}`}>
                  {match.match_status === 'scheduled' ? 'Programada' :
                   match.match_status === 'in_progress' ? 'En Progreso' :
                   match.match_status === 'completed' ? 'Completada' :
                   match.match_status}
                </span>
              </td>
              <td>{match.scheduled_time ? new Date(match.scheduled_time).toLocaleDateString('es-PE') : 'Por Determinar'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {matches.length === 0 && (
        <p>No se encontraron partidas.</p>
      )}
    </div>
  );
}
