import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import MappoolEditModal from '../components/MappoolEditModal';
import './Mappool.css';

// Icons as SVG components
const MusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="mappool-header-icon">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

const StarIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const CustomSongIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

const ChevronIcon = ({ isOpen }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`accordion-chevron ${isOpen ? 'open' : ''}`}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// Format stage name to title case
const formatStageName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Accordion component for each stage
function MappoolAccordion({ pool, slots, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getSlotColor = (slotName) => {
    const slot = slots?.find(s => s.name === slotName);
    return slot?.color || '#3b82f6';
  };

  return (
    <div className="mappool-accordion">
      <button
        className="mappool-accordion-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="accordion-title">{formatStageName(pool.stage_name)}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div className="mappool-accordion-content">
          <div className="mappool-table-wrapper">
            <table className="mappool-table">
              <thead>
                <tr>
                  <th className="col-slot">Slot#</th>
                  <th className="col-banner">Banner</th>
                  <th className="col-title">Artist - Title [Difficulty]</th>
                  <th className="col-custom">CUSTOM</th>
                  <th className="col-sr">SR</th>
                  <th className="col-bpm">BPM</th>
                  <th className="col-length">Length</th>
                  <th className="col-stats">OD | HP | LN%</th>
                  <th className="col-mapper">Mapper</th>
                  <th className="col-beatmap">Beatmap ID</th>
                </tr>
              </thead>
              <tbody>
                {pool.maps.map((map) => (
                  <tr key={map.id} className="mappool-row">
                    <td className="col-slot">
                      <span className="slot-badge" style={{ borderRightColor: getSlotColor(map.slot) }}>{map.slot}</span>
                    </td>
                    <td className="col-banner">
                      {map.banner_url ? (
                        <img
                          src={map.banner_url}
                          alt=""
                          className="map-banner"
                          loading="lazy"
                        />
                      ) : (
                        <div className="map-banner-placeholder" />
                      )}
                    </td>
                    <td className="col-title">
                      <span className="map-title">
                        {map.artist} - {map.title} [{map.difficulty_name}]
                      </span>
                    </td>
                    <td className="col-custom">
                      <div className="custom-icons">
                        {map.is_custom_map && <StarIcon className="custom-icon star" />}
                        {map.is_custom_song && <CustomSongIcon className="custom-icon song" />}
                      </div>
                    </td>
                    <td className="col-sr">{map.star_rating.toFixed(2)}</td>
                    <td className="col-bpm">{map.bpm}</td>
                    <td className="col-length">{map.length}</td>
                    <td className="col-stats">
                      {map.od} | {map.hp} | {map.ln_percent}
                    </td>
                    <td className="col-mapper">{map.mapper}</td>
                    <td className="col-beatmap">{map.beatmap_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pool.download_url && (
            <div className="mappool-download">
              <a
                href={pool.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="download-btn"
              >
                DESCARGAR POOL
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Mappool({ user }) {
  const [data, setData] = useState({ total_maps: 0, pools: [] });
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchMappools = () => {
    const fetchFn = user?.is_staff ? api.getMappoolsAdmin : api.getMappools;
    fetchFn()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchSlots = () => {
    api.getSlots()
      .then(setSlots)
      .catch(console.error);
  };

  useEffect(() => {
    fetchMappools();
    fetchSlots();
  }, [user]);

  if (loading) {
    return (
      <div className="mappool-page">
        <Spinner size="large" text="Cargando mappools..." />
      </div>
    );
  }

  return (
    <div className="mappool-page">
      {/* Header */}
      <div className="mappool-header">
        <div className="mappool-header-left">
          <h1 className="mappool-title">MAPPOOL</h1>
          <span className="mappool-count">{data.total_maps} MAPS</span>
          {user?.is_staff && (
            <button
              className="mappool-edit-btn"
              onClick={() => setShowEditModal(true)}
            >
              Editar
            </button>
          )}
        </div>
        <div className="mappool-header-right">
          <MusicIcon />
        </div>
      </div>

      {/* Subtitle */}
      <p className="mappool-subtitle">
        Aqui podras encontrar las Mappools del torneo actual
      </p>

      {/* Legend */}
      <div className="mappool-legend">
        <div className="legend-item">
          <StarIcon className="legend-icon star" />
          <span>: Custom Map</span>
        </div>
        <div className="legend-item">
          <CustomSongIcon className="legend-icon song" />
          <span>: Custom Song</span>
        </div>
      </div>

      {/* Mappool Accordions */}
      <div className="mappool-list">
        {data.pools.length === 0 ? (
          <p className="mappool-empty">No hay mappools disponibles todavía.</p>
        ) : (
          data.pools.map((pool, index) => (
            <MappoolAccordion
              key={pool.id}
              pool={pool}
              slots={slots}
              defaultOpen={index === 0}
            />
          ))
        )}
      </div>

      {/* Edit Modal */}
      <MappoolEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        pools={data.pools}
        onRefresh={fetchMappools}
      />
    </div>
  );
}
