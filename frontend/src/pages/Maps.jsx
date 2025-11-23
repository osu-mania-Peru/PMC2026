import { useEffect, useState } from 'react';
import { api } from '../api';
import './Maps.css';

export default function Maps() {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMaps()
      .then(data => setMaps(data.maps))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="page">
      <h2>Pool de Mapas</h2>
      <p>Total de Mapas: {maps.length}</p>

      <table>
        <thead>
          <tr>
            <th>Mapa</th>
            <th>Dificultad</th>
            <th>Mapeador</th>
            <th>Enlace</th>
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
        <p>Aún no hay mapas en el pool.</p>
      )}
    </div>
  );
}
