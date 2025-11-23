import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Maps() {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMaps()
      .then(data => setMaps(data.maps))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h2>Map Pool</h2>
      <p>Total Maps: {maps.length}</p>

      <table>
        <thead>
          <tr>
            <th>Map</th>
            <th>Difficulty</th>
            <th>Mapper</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {maps.map(map => (
            <tr key={map.id}>
              <td><strong>{map.map_name}</strong></td>
              <td>{map.difficulty_name}</td>
              <td>{map.mapper_name}</td>
              <td>
                <a href={map.map_url} target="_blank" rel="noopener noreferrer">
                  osu! →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {maps.length === 0 && (
        <p>No maps in pool yet.</p>
      )}
    </div>
  );
}
