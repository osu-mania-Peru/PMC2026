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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h2>Matches</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label>Filter: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '0.5rem', background: '#2a2a2a', color: '#e0e0e0', border: '1px solid #555' }}>
          <option value="all">All Matches</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Match #</th>
            <th>Player 1</th>
            <th>Player 2</th>
            <th>Score</th>
            <th>Status</th>
            <th>Scheduled</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(match => (
            <tr key={match.id}>
              <td>#{match.id}</td>
              <td>Player {match.player1_id}</td>
              <td>Player {match.player2_id}</td>
              <td>
                {match.player1_score !== null && match.player2_score !== null
                  ? `${match.player1_score} - ${match.player2_score}`
                  : '-'
                }
              </td>
              <td>
                <span className={`status ${match.match_status}`}>
                  {match.match_status}
                </span>
              </td>
              <td>{match.scheduled_time ? new Date(match.scheduled_time).toLocaleDateString() : 'TBD'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {matches.length === 0 && (
        <p>No matches found.</p>
      )}
    </div>
  );
}
