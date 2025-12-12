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
    <div className="maps-page">
      <div className="maps-header">
        <h2>Mappool</h2>
        <div className="maps-count">{maps.length} MAPS</div>
      </div>

      {maps.length === 0 ? (
        <p className="maps-empty">Aún no hay mapas en el pool.</p>
      ) : (
        <div className="maps-grid">
          {maps.map((map, index) => (
            <div key={map.id} className="map-card">
              <div className="map-index">#{index + 1}</div>
              <div className="map-info">
                <div className="map-name">{map.map_name}</div>
                <div className="map-difficulty">[{map.difficulty_name}]</div>
                <div className="map-mapper">mapped by {map.mapper_name}</div>
              </div>
              <a
                href={map.map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="map-link"
              >
                osu!
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
