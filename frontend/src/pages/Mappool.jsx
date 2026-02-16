import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Eye, Play, Pause, Upload, ChevronDown, Trash2, Gamepad2, Keyboard, X } from 'lucide-react';
import { api } from '../api';
import { loadSkinFromZip, saveSkinToStorage, getSavedSkins, deleteSkinFromStorage } from '../utils/skinLoader';

// Speed options
const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

// Scroll speed options
const SCROLL_OPTIONS = [
  { value: 15, label: '15' },
  { value: 20, label: '20' },
  { value: 25, label: '25' },
  { value: 30, label: '30' },
  { value: 35, label: '35' },
  { value: 40, label: '40' },
];

// Default key bindings per key count
const DEFAULT_KEY_BINDINGS = {
  1: ['Space'],
  2: ['KeyF', 'KeyJ'],
  3: ['KeyF', 'Space', 'KeyJ'],
  4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
  5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
  6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'],
  7: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'],
  8: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
  9: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
  10: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyV', 'KeyN', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
};

// Display names for keys
const KEY_DISPLAY_NAMES = {
  KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyF: 'F', KeyG: 'G', KeyH: 'H',
  KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyZ: 'Z', KeyX: 'X', KeyC: 'C',
  KeyV: 'V', KeyB: 'B', KeyN: 'N', KeyM: 'M', KeyQ: 'Q', KeyW: 'W',
  KeyE: 'E', KeyR: 'R', KeyT: 'T', KeyY: 'Y', KeyU: 'U', KeyI: 'I',
  KeyO: 'O', KeyP: 'P', Space: 'SPACE', Semicolon: ';', Quote: "'",
  Comma: ',', Period: '.', Slash: '/', BracketLeft: '[', BracketRight: ']',
};

const KEYBINDINGS_STORAGE_KEY = 'pmc_keybindings';

// Format time as mm:ss:mmm
const formatTime = (ms) => {
  const totalMs = Math.floor(ms || 0);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${millis.toString().padStart(3, '0')}`;
};
import Spinner from '../components/Spinner';
import MappoolEditModal from '../components/MappoolEditModal';
import MapEditModal from '../components/MapEditModal';
import SlotEditModal from '../components/SlotEditModal';
import PreviewPanel from '../components/PreviewPanel';
import catGif from '../assets/cat.gif';
import packShareLogo from '../assets/packshare-logo.svg';
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
      <div className="mappool-accordion-header">
        <button
          className="accordion-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="accordion-title">{formatStageName(pool.stage_name)}</span>
          <ChevronIcon isOpen={isOpen} />
        </button>
        {pool.download_url && (
          <a
            href={pool.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="packshare-link"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={packShareLogo} alt="PackShare" className="packshare-logo" />
            <span>Descargar Pool</span>
          </a>
        )}
      </div>

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
                  <th className="col-stats">OD | HP</th>
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
                        </>
                      ) : `${map.od} | ${map.hp}`}
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

        </div>
      )}
    </div>
  );
}

export default function Mappool({ user }) {
  const navigate = useNavigate();
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
  const [skin, setSkin] = useState('pmc');
  const [customSkins, setCustomSkins] = useState([]);
  const [skinDropdownOpen, setSkinDropdownOpen] = useState(false);
  const [loadingSkin, setLoadingSkin] = useState(false);
  const skinFileInputRef = useRef(null);
  const skinDropdownRef = useRef(null);
  const [volume, setVolume] = useState(() => {
    const stored = localStorage.getItem('pmc_preview_volume');
    return stored ? parseFloat(stored) : 0.1;
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [scrollSpeed, setScrollSpeed] = useState(25);
  const seekToRef = useRef(null);
  const playRef = useRef(null);
  const [playMode, setPlayMode] = useState(false);
  const [keybindingsModalOpen, setKeybindingsModalOpen] = useState(false);
  const [customKeyBindings, setCustomKeyBindings] = useState(() => {
    try {
      const stored = localStorage.getItem(KEYBINDINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : { ...DEFAULT_KEY_BINDINGS };
    } catch {
      return { ...DEFAULT_KEY_BINDINGS };
    }
  });
  const [editingKeyCount, setEditingKeyCount] = useState(4);
  const [listeningForKey, setListeningForKey] = useState(null); // {keyCount, colIndex}

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

  // Load saved custom skins from localStorage
  useEffect(() => {
    const savedSkins = getSavedSkins();
    setCustomSkins(savedSkins);
  }, []);

  // Close skin dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (skinDropdownRef.current && !skinDropdownRef.current.contains(e.target)) {
        setSkinDropdownOpen(false);
      }
    };
    if (skinDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [skinDropdownOpen]);

  // Handle skin file upload
  const handleSkinUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingSkin(true);
    try {
      const skinData = await loadSkinFromZip(file);
      saveSkinToStorage(skinData);
      setCustomSkins(getSavedSkins());
      setSkin(skinData.id);
      setSkinDropdownOpen(false);
    } catch (err) {
      console.error('Failed to load skin:', err);
      alert('Failed to load skin. Make sure it\'s a valid osu! skin zip file.');
    } finally {
      setLoadingSkin(false);
      if (skinFileInputRef.current) {
        skinFileInputRef.current.value = '';
      }
    }
  };

  // Delete a custom skin
  const handleDeleteSkin = (skinId, e) => {
    e.stopPropagation();
    deleteSkinFromStorage(skinId);
    setCustomSkins(getSavedSkins());
    if (skin === skinId) {
      setSkin('pmc');
    }
  };

  // Get current skin display name
  const getCurrentSkinName = () => {
    if (skin === 'arrow') return 'Arrow';
    if (skin === 'circle') return 'Circle';
    if (skin === 'pmc') return 'PMC';
    if (skin === 'bars') return 'Bars';
    const customSkin = customSkins.find((s) => s.id === skin);
    return customSkin?.name || 'Custom';
  };

  // Get current skin data for ManiaPreview
  const getCurrentSkinData = () => {
    if (skin === 'arrow' || skin === 'circle' || skin === 'pmc' || skin === 'bars') return null;
    return customSkins.find((s) => s.id === skin) || null;
  };

  // Keybindings functions
  const saveKeyBindings = (bindings) => {
    setCustomKeyBindings(bindings);
    localStorage.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify(bindings));
  };

  const handleKeyBindingChange = (keyCount, colIndex, newKey) => {
    const newBindings = { ...customKeyBindings };
    newBindings[keyCount] = [...newBindings[keyCount]];
    newBindings[keyCount][colIndex] = newKey;
    saveKeyBindings(newBindings);
  };

  const resetKeyBindings = (keyCount) => {
    const newBindings = { ...customKeyBindings };
    newBindings[keyCount] = [...DEFAULT_KEY_BINDINGS[keyCount]];
    saveKeyBindings(newBindings);
  };

  const resetAllKeyBindings = () => {
    saveKeyBindings({ ...DEFAULT_KEY_BINDINGS });
  };

  // Listen for key press when rebinding
  useEffect(() => {
    if (!listeningForKey) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

      handleKeyBindingChange(listeningForKey.keyCount, listeningForKey.colIndex, e.code);
      setListeningForKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningForKey, customKeyBindings]);

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
    navigate(`/preview?id=${map.beatmap_id}`);
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
        skin={skin}
        customSkinData={getCurrentSkinData()}
        volume={volume}
        playbackSpeed={playbackSpeed}
        scrollSpeed={scrollSpeed}
        playRef={playRef}
        playMode={playMode}
        onPlayModeChange={setPlayMode}
        customKeyBindings={customKeyBindings}
      />

      {/* Audio Progress Overlay */}
      {previewOpen && createPortal(
        <div className="audio-progress-overlay">
          {/* Controls toolbar */}
          <div className="overlay-toolbar">
            {/* Play/Pause */}
            <button
              className="overlay-play-btn"
              onClick={() => playRef.current?.toggle()}
              title={audioProgress.isPlaying ? 'Pause' : 'Play'}
            >
              {audioProgress.isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Playback speed */}
            <div className="overlay-control-group">
              <span className="overlay-label">Speed</span>
              <div className="overlay-btn-group">
                {SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`overlay-speed-btn ${playbackSpeed === opt.value ? 'active' : ''}`}
                    onClick={() => setPlaybackSpeed(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scroll speed */}
            <div className="overlay-control-group">
              <span className="overlay-label">Scroll</span>
              <div className="overlay-btn-group">
                {SCROLL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`overlay-scroll-btn ${scrollSpeed === opt.value ? 'active' : ''}`}
                    onClick={() => setScrollSpeed(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="40"
                value={scrollSpeed}
                onChange={(e) => {
                  const val = Math.min(40, Math.max(1, parseInt(e.target.value) || 1));
                  setScrollSpeed(val);
                }}
                className="overlay-scroll-input"
              />
            </div>

            {/* Volume control */}
            <div className="overlay-control-group">
              <span className="overlay-label">Vol</span>
              <div className="volume-slider-container">
                <div className="volume-slider-track" />
                <div
                  className="volume-slider-fill"
                  style={{ clipPath: `polygon(0 50%, ${volume * 100}% ${50 - volume * 50}%, ${volume * 100}% ${50 + volume * 50}%)` }}
                />
                <div
                  className="volume-slider-thumb"
                  style={{ left: `${volume * 100}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); localStorage.setItem('pmc_preview_volume', v); }}
                  className="volume-slider-input"
                />
              </div>
            </div>

            {/* Play Mode toggle */}
            <button
              className={`overlay-play-mode-btn ${playMode ? 'active' : ''}`}
              onClick={() => setPlayMode(!playMode)}
              title={playMode ? 'Disable play mode' : 'Enable play mode'}
            >
              <Gamepad2 size={16} />
              <span>{playMode ? 'PLAYING' : 'PLAY'}</span>
            </button>

            {/* Keybindings button */}
            <button
              className="overlay-keybindings-btn"
              onClick={() => setKeybindingsModalOpen(true)}
              title="Configure keybindings"
            >
              <Keyboard size={16} />
            </button>

            {/* Skin dropdown */}
            <div className="skin-dropdown-container" ref={skinDropdownRef}>
              <button
                className="overlay-skin-btn"
                onClick={() => setSkinDropdownOpen(!skinDropdownOpen)}
                title="Select skin"
              >
                <img
                  src={skin === 'arrow' ? '/mania-assets/left.png' : skin === 'circle' ? '/mania-assets/circle/Note1.png' : skin === 'pmc' ? '/mania-assets/pmc/Note1.png' : skin === 'bars' ? '/mania-assets/bars/Note1.png' : (customSkins.find((s) => s.id === skin)?.notes[0] || '/mania-assets/left.png')}
                  alt=""
                  className="overlay-skin-icon"
                />
                <span>{getCurrentSkinName()}</span>
                <ChevronDown size={14} className={`skin-dropdown-chevron ${skinDropdownOpen ? 'open' : ''}`} />
              </button>

              {skinDropdownOpen && (
                <div className="skin-dropdown-menu">
                  {/* Built-in skins */}
                  <button
                    className={`skin-dropdown-item ${skin === 'arrow' ? 'active' : ''}`}
                    onClick={() => { setSkin('arrow'); setSkinDropdownOpen(false); }}
                  >
                    <img src="/mania-assets/left.png" alt="" className="skin-dropdown-icon" />
                    <span>Arrow</span>
                  </button>
                  <button
                    className={`skin-dropdown-item ${skin === 'circle' ? 'active' : ''}`}
                    onClick={() => { setSkin('circle'); setSkinDropdownOpen(false); }}
                  >
                    <img src="/mania-assets/circle/Note1.png" alt="" className="skin-dropdown-icon" />
                    <span>Circle</span>
                  </button>
                  <button
                    className={`skin-dropdown-item ${skin === 'pmc' ? 'active' : ''}`}
                    onClick={() => { setSkin('pmc'); setSkinDropdownOpen(false); }}
                  >
                    <img src="/mania-assets/pmc/Note1.png" alt="" className="skin-dropdown-icon" />
                    <span>PMC</span>
                  </button>
                  <button
                    className={`skin-dropdown-item ${skin === 'bars' ? 'active' : ''}`}
                    onClick={() => { setSkin('bars'); setSkinDropdownOpen(false); }}
                  >
                    <img src="/mania-assets/bars/Note1.png" alt="" className="skin-dropdown-icon" />
                    <span>Bars</span>
                  </button>

                  {/* Custom skins */}
                  {customSkins.length > 0 && (
                    <>
                      <div className="skin-dropdown-divider" />
                      {customSkins.map((customSkin) => (
                        <button
                          key={customSkin.id}
                          className={`skin-dropdown-item ${skin === customSkin.id ? 'active' : ''}`}
                          onClick={() => { setSkin(customSkin.id); setSkinDropdownOpen(false); }}
                        >
                          {customSkin.notes[0] ? (
                            <img src={customSkin.notes[0]} alt="" className="skin-dropdown-icon" />
                          ) : (
                            <div className="skin-dropdown-icon-placeholder" />
                          )}
                          <span className="skin-dropdown-name">{customSkin.name}</span>
                          <button
                            className="skin-delete-btn"
                            onClick={(e) => handleDeleteSkin(customSkin.id, e)}
                            title="Delete skin"
                          >
                            <Trash2 size={12} />
                          </button>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Upload button */}
                  <div className="skin-dropdown-divider" />
                  <button
                    className="skin-dropdown-item skin-upload-btn"
                    onClick={() => skinFileInputRef.current?.click()}
                    disabled={loadingSkin}
                  >
                    {loadingSkin ? (
                      <img src={catGif} alt="" className="skin-dropdown-icon skin-loading" />
                    ) : (
                      <Upload size={16} className="skin-dropdown-upload-icon" />
                    )}
                    <span>{loadingSkin ? 'Loading...' : 'Upload Skin (.osk/.zip)'}</span>
                  </button>
                </div>
              )}

              <input
                ref={skinFileInputRef}
                type="file"
                accept=".osk,.zip"
                onChange={handleSkinUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="audio-progress-bar" onClick={handleProgressBarClick}>
            {/* Density curve */}
            {densityPath && (
              <svg className="density-curve" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="densityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.7)" />
                    <stop offset="50%" stopColor="rgba(99, 102, 241, 0.5)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
                  </linearGradient>
                </defs>
                <path d={densityPath} />
              </svg>
            )}
            {/* Progress marker */}
            <div
              className="audio-progress-marker"
              style={{ left: `${audioProgress.duration ? (audioProgress.currentTime / audioProgress.duration) * 100 : 0}%` }}
            />
            {/* Time display */}
            <div className="audio-time-display">
              {formatTime(audioProgress.currentTime)} / {formatTime(audioProgress.duration)}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Keybindings Modal */}
      {keybindingsModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => { setKeybindingsModalOpen(false); setListeningForKey(null); }}>
          <div style={{ background: '#222', padding: 20, borderRadius: 8, minWidth: 300 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <b style={{ color: '#fff' }}>Keybindings</b>
              <button onClick={() => { setKeybindingsModalOpen(false); setListeningForKey(null); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', clipPath: 'none' }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => (
                <button key={k} onClick={() => setEditingKeyCount(k)} style={{ margin: 2, padding: '4px 8px', background: editingKeyCount === k ? '#ff0844' : '#444', color: '#fff', border: 'none', cursor: 'pointer', clipPath: 'none' }}>{k}K</button>
              ))}
            </div>

            <table style={{ color: '#fff', width: '100%' }}>
              <tbody>
                {customKeyBindings[editingKeyCount]?.map((keyCode, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: 4 }}>Key {idx + 1}</td>
                    <td style={{ padding: 4 }}>
                      <button onClick={() => setListeningForKey({ keyCount: editingKeyCount, colIndex: idx })} style={{ padding: '6px 12px', minWidth: 80, background: listeningForKey?.keyCount === editingKeyCount && listeningForKey?.colIndex === idx ? '#ff0844' : '#555', color: '#fff', border: 'none', cursor: 'pointer', clipPath: 'none' }}>
                        {listeningForKey?.keyCount === editingKeyCount && listeningForKey?.colIndex === idx ? '...' : KEY_DISPLAY_NAMES[keyCode] || keyCode.replace('Key', '')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button onClick={() => resetKeyBindings(editingKeyCount)} style={{ flex: 1, padding: 8, background: '#444', color: '#fff', border: 'none', cursor: 'pointer', clipPath: 'none' }}>Reset {editingKeyCount}K</button>
              <button onClick={resetAllKeyBindings} style={{ flex: 1, padding: 8, background: '#600', color: '#fff', border: 'none', cursor: 'pointer', clipPath: 'none' }}>Reset All</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
