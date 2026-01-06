import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Eye } from 'lucide-react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import MappoolEditModal from '../components/MappoolEditModal';
import MapEditModal from '../components/MapEditModal';
import SlotEditModal from '../components/SlotEditModal';
import PreviewPanel from '../components/PreviewPanel';
import catGif from '../assets/cat.gif';
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

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);

// Inline editable cell component
function InlineEditCell({ value, mapId, field, onSave, type = 'text', slots }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'select') {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const handleSave = async () => {
    if (editValue !== value) {
      setSaving(true);
      await onSave(mapId, { [field]: editValue });
      setSaving(false);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setEditing(false);
    }
  };

  if (saving) {
    return <img src={catGif} alt="" className="inline-edit-loading" />;
  }

  if (!editing) {
    return (
      <span className="inline-edit-value" onClick={() => setEditing(true)}>
        {value}
      </span>
    );
  }

  if (type === 'select' && slots) {
    return (
      <select
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="inline-edit-input inline-edit-select"
      >
        {slots.map((slot) => (
          <option key={slot.id} value={slot.name}>{slot.name}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type === 'number' ? 'number' : 'text'}
      step={type === 'number' ? '0.01' : undefined}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="inline-edit-input"
    />
  );
}

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
function MappoolAccordion({ pool, slots, defaultOpen = false, user, onEditMap, onInlineSave, onPreviewClick }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getSlotColor = (slotName) => {
    const slot = slots?.find(s => s.name === slotName);
    return slot?.color || '#3b82f6';
  };

  const getSlotOrder = (slotName) => {
    const idx = slots?.findIndex(s => s.name === slotName);
    return idx >= 0 ? idx : 999;
  };

  // Sort maps by slot order, then by artist+title
  const sortedMaps = [...(pool.maps || [])].sort((a, b) => {
    const slotDiff = getSlotOrder(a.slot) - getSlotOrder(b.slot);
    if (slotDiff !== 0) return slotDiff;
    const aName = `${a.artist} - ${a.title}`.toLowerCase();
    const bName = `${b.artist} - ${b.title}`.toLowerCase();
    return aName.localeCompare(bName);
  });

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
                  {user?.is_staff && <th className="col-actions"></th>}
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
                {sortedMaps.map((map) => (
                  <tr key={map.id} className="mappool-row">
                    {user?.is_staff && (
                      <td className="col-actions">
                        <button
                          className="map-edit-icon-btn"
                          onClick={() => onEditMap(map, pool.id)}
                          title="Editar mapa"
                        >
                          <PencilIcon /> Editar
                        </button>
                      </td>
                    )}
                    <td className="col-slot">
                      <span className="slot-badge" style={{ borderRightColor: getSlotColor(map.slot) }}>
                        {user?.is_staff ? (
                          <InlineEditCell
                            value={map.slot}
                            mapId={map.id}
                            field="slot"
                            onSave={onInlineSave}
                            type="select"
                            slots={slots}
                          />
                        ) : map.slot}
                      </span>
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
                      <a
                        href={`https://osu.ppy.sh/beatmaps/${map.beatmap_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-title"
                      >
                        {map.artist} - {map.title} [{map.difficulty_name}]
                      </a>
                      {onPreviewClick && (
                        <button
                          className="preview-btn"
                          onClick={() => onPreviewClick(map)}
                          title="Preview"
                        >
                          <Eye size={16} />
                          Preview
                        </button>
                      )}
                    </td>
                    <td className="col-custom">
                      <div className="custom-icons">
                        {map.is_custom_map && <StarIcon className="custom-icon star" />}
                        {map.is_custom_song && <CustomSongIcon className="custom-icon song" />}
                      </div>
                    </td>
                    <td className="col-sr">
                      {user?.is_staff ? (
                        <InlineEditCell value={map.star_rating} mapId={map.id} field="star_rating" onSave={onInlineSave} type="number" />
                      ) : map.star_rating.toFixed(2)}
                    </td>
                    <td className="col-bpm">
                      {user?.is_staff ? (
                        <InlineEditCell value={map.bpm} mapId={map.id} field="bpm" onSave={onInlineSave} type="number" />
                      ) : map.bpm}
                    </td>
                    <td className="col-length">
                      {user?.is_staff ? (
                        <InlineEditCell value={map.length_seconds} mapId={map.id} field="length_seconds" onSave={onInlineSave} type="number" />
                      ) : map.length}
                    </td>
                    <td className="col-stats">
                      {user?.is_staff ? (
                        <>
                          <InlineEditCell value={map.od} mapId={map.id} field="od" onSave={onInlineSave} type="number" />
                          {' | '}
                          <InlineEditCell value={map.hp} mapId={map.id} field="hp" onSave={onInlineSave} type="number" />
                          {' | '}
                          <InlineEditCell value={map.ln_percent} mapId={map.id} field="ln_percent" onSave={onInlineSave} />
                        </>
                      ) : `${map.od} | ${map.hp} | ${map.ln_percent}`}
                    </td>
                    <td className="col-mapper">
                      {user?.is_staff ? (
                        <InlineEditCell value={map.mapper} mapId={map.id} field="mapper" onSave={onInlineSave} />
                      ) : map.mapper}
                    </td>
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
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingMap, setEditingMap] = useState(null);
  const [editingPoolId, setEditingPoolId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMap, setSelectedMap] = useState(null);
  const [audioProgress, setAudioProgress] = useState({ currentTime: 0, duration: 0, isPlaying: false, notes: null });
  const [densityPath, setDensityPath] = useState('');
  const seekToRef = useRef(null);

  const apiBaseUrl = import.meta.env.VITE_API_URL || '';

  // Calculate note density and create bezier curve path
  useEffect(() => {
    if (!audioProgress.notes || !audioProgress.duration) {
      setDensityPath('');
      return;
    }

    const NUM_POINTS = 150;
    const segmentDuration = audioProgress.duration / NUM_POINTS;
    const counts = new Array(NUM_POINTS).fill(0);

    // Count notes in each segment
    for (const note of audioProgress.notes) {
      const segmentIndex = Math.floor(note.time / segmentDuration);
      if (segmentIndex >= 0 && segmentIndex < NUM_POINTS) {
        counts[segmentIndex]++;
      }
    }

    // Find max for normalization
    const maxCount = Math.max(...counts, 1);

    // Create points with normalized heights (0-100)
    const points = counts.map((count, i) => ({
      x: (i / (NUM_POINTS - 1)) * 100,
      y: 100 - (count / maxCount) * 100, // Invert for SVG coords
    }));

    // Smooth the curve with bezier - create SVG path
    let path = `M 0,100 L 0,${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Catmull-Rom to Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    path += ' L 100,100 Z'; // Close the path at bottom

    setDensityPath(path);
  }, [audioProgress.notes, audioProgress.duration]);

  const handleProgressBarClick = (e) => {
    if (!seekToRef.current || !audioProgress.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * audioProgress.duration;
    seekToRef.current(newTime);
  };

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

  const handleEditMap = (map, poolId) => {
    setEditingMap(map);
    setEditingPoolId(poolId);
  };

  const handleSaveMap = async (mapId, formData) => {
    await api.updatePoolMap(mapId, formData);
    setEditingMap(null);
    setEditingPoolId(null);
    fetchMappools();
  };

  const handleCloseMapEdit = () => {
    setEditingMap(null);
    setEditingPoolId(null);
  };

  const handleInlineSave = async (mapId, data) => {
    await api.updatePoolMap(mapId, data);
    fetchMappools();
  };

  const handlePreviewClick = (map) => {
    setSelectedMap(map);
    setPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setSelectedMap(null);
  };

  if (loading) {
    return (
      <div className="mappool-page">
        <Spinner size="large" text="Cargando mappools..." />
      </div>
    );
  }

  return (
    <div className={`mappool-page ${previewOpen ? 'panel-open' : ''}`}>
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
              user={user}
              onEditMap={handleEditMap}
              onInlineSave={handleInlineSave}
              onPreviewClick={handlePreviewClick}
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

      {/* Map Edit Modal */}
      <MapEditModal
        isOpen={!!editingMap}
        map={editingMap}
        onSave={handleSaveMap}
        onClose={handleCloseMapEdit}
        slots={slots}
        onEditSlots={() => setShowSlotModal(true)}
      />

      {/* Slot Edit Modal */}
      <SlotEditModal
        isOpen={showSlotModal}
        onClose={() => setShowSlotModal(false)}
        onSlotsChange={fetchSlots}
      />

      {/* Preview Panel */}
      <PreviewPanel
        isOpen={previewOpen}
        onClose={handlePreviewClose}
        map={selectedMap}
        apiBaseUrl={apiBaseUrl}
        onAudioProgress={setAudioProgress}
        seekToRef={seekToRef}
      />

      {/* Audio Progress Overlay */}
      {previewOpen && createPortal(
        <div className="audio-progress-overlay">
          <div className="audio-progress-bar" onClick={handleProgressBarClick}>
            {/* Density curve */}
            {densityPath && (
              <svg className="density-curve" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d={densityPath} />
              </svg>
            )}
            {/* Progress marker */}
            <div
              className="audio-progress-marker"
              style={{ left: `${audioProgress.duration ? (audioProgress.currentTime / audioProgress.duration) * 100 : 0}%` }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
