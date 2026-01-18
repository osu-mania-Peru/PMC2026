import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { X, Play, Pause, Upload, ChevronDown, Trash2, Gamepad2, Keyboard, MoveVertical, EyeOff, Eye } from 'lucide-react';
import ManiaPreview from '../components/ManiaPreview';
import { loadSkinFromZip, saveSkinToStorage, getSavedSkins, deleteSkinFromStorage } from '../utils/skinLoader';
import catGif from '../assets/cat.gif';
import './Preview.css';
import './Mappool.css'; // For overlay styles

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

export default function Preview({ user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const beatmapId = searchParams.get('id');

  const [error, setError] = useState(null);
  const [notesData, setNotesData] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // Loading states
  const [loadingStatus, setLoadingStatus] = useState({
    api: { loading: true, text: 'Cargando datos del mapa...' },
    audio: { loading: true, text: 'Cargando audio...' },
    skin: { loading: true, text: 'Cargando skin...' },
    storyboard: { loading: false, text: '' },
  });
  const [allAssetsReady, setAllAssetsReady] = useState(false);

  // Audio progress state
  const [audioProgress, setAudioProgress] = useState({ currentTime: 0, duration: 0, isPlaying: false, notes: null });
  const [densityPath, setDensityPath] = useState('');

  // Settings (same as Mappool)
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
  const [hitPosition, setHitPosition] = useState(() => {
    const stored = localStorage.getItem('pmc_hit_position');
    return stored ? parseInt(stored) : 100;
  });
  const [hitPositionEditMode, setHitPositionEditMode] = useState(false);
  const [hidePlayfield, setHidePlayfield] = useState(false);
  const seekToRef = useRef(null);
  const playRef = useRef(null);
  const resetRef = useRef(null);
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
  const [listeningForKey, setListeningForKey] = useState(null);

  const apiBaseUrl = import.meta.env.VITE_API_URL || '';

  // Fetch preview data
  useEffect(() => {
    if (!beatmapId) {
      setError('No beatmap ID provided');
      return;
    }

    const fetchPreviewData = async () => {
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/mappools/preview/${beatmapId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Beatmap not found');
          }
          throw new Error(`Failed to fetch preview: ${response.status}`);
        }

        const data = await response.json();
        // Add full URLs for audio and background
        data.audio_url_full = `${apiBaseUrl}${data.audio_url}`;
        data.background_url_full = data.background_url ? `${apiBaseUrl}${data.background_url}` : null;

        // Update storyboard loading status if there's a storyboard
        if (data.storyboard?.images?.length > 0) {
          setLoadingStatus(prev => ({
            ...prev,
            api: { loading: false, text: 'Datos del mapa cargados' },
            storyboard: { loading: true, text: `Cargando storyboard (0/${data.storyboard.images.length})...` },
          }));
        } else {
          setLoadingStatus(prev => ({
            ...prev,
            api: { loading: false, text: 'Datos del mapa cargados' },
            storyboard: { loading: false, text: 'Sin storyboard' },
          }));
        }

        setNotesData(data);
        setAudioUrl(data.audio_url_full);
      } catch (err) {
        console.error('Error fetching preview data:', err);
        setError(err.message);
      }
    };

    fetchPreviewData();
  }, [beatmapId, apiBaseUrl]);

  // Check if all assets are ready
  useEffect(() => {
    const { api, audio, skin, storyboard } = loadingStatus;
    const ready = !api.loading && !audio.loading && !skin.loading && !storyboard.loading;
    setAllAssetsReady(ready);
  }, [loadingStatus]);

  // Callbacks for asset loading
  const onAudioLoaded = useCallback(() => {
    setLoadingStatus(prev => ({ ...prev, audio: { loading: false, text: 'Audio cargado' } }));
  }, []);

  const onSkinLoaded = useCallback(() => {
    setLoadingStatus(prev => ({ ...prev, skin: { loading: false, text: 'Skin cargado' } }));
  }, []);

  const onStoryboardProgress = useCallback((loaded, total) => {
    if (loaded === total) {
      setLoadingStatus(prev => ({ ...prev, storyboard: { loading: false, text: 'Storyboard cargado' } }));
    } else {
      setLoadingStatus(prev => ({ ...prev, storyboard: { loading: true, text: `Cargando storyboard (${loaded}/${total})...` } }));
    }
  }, []);

  // Calculate note density curve
  useEffect(() => {
    if (!audioProgress.notes || !audioProgress.duration) {
      setDensityPath('');
      return;
    }

    const NUM_POINTS = 150;
    const segmentDuration = audioProgress.duration / NUM_POINTS;
    const counts = new Array(NUM_POINTS).fill(0);

    for (const note of audioProgress.notes) {
      const segmentIndex = Math.floor(note.time / segmentDuration);
      if (segmentIndex >= 0 && segmentIndex < NUM_POINTS) {
        counts[segmentIndex]++;
      }
    }

    const maxCount = Math.max(...counts, 1);
    const points = counts.map((count, i) => ({
      x: (i / (NUM_POINTS - 1)) * 100,
      y: 100 - (count / maxCount) * 100,
    }));

    let path = `M 0,100 L 0,${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    path += ' L 100,100 Z';
    setDensityPath(path);
  }, [audioProgress.notes, audioProgress.duration]);

  // Load saved custom skins
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
    const customSkin = customSkins.find((s) => s.id === skin);
    return customSkin?.name || 'Custom';
  };

  // Get current skin data for ManiaPreview
  const getCurrentSkinData = () => {
    if (skin === 'arrow' || skin === 'circle' || skin === 'pmc') return null;
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
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      handleKeyBindingChange(listeningForKey.keyCount, listeningForKey.colIndex, e.code);
      setListeningForKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningForKey, customKeyBindings]);

  const handleProgressBarClick = (e) => {
    if (!seekToRef.current || !audioProgress.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * audioProgress.duration;
    seekToRef.current(newTime);
  };

  const handleClose = useCallback(() => {
    if (resetRef.current) {
      resetRef.current();
    }
    navigate(-1);
  }, [navigate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Pause if playing
        if (audioProgress.isPlaying) {
          playRef.current?.toggle();
        }
        // Exit play mode to show controls
        if (playMode) {
          setPlayMode(false);
        }
      } else if (e.code === 'Space' && !playMode) {
        e.preventDefault();
        playRef.current?.toggle(); // Play/pause
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioProgress.isPlaying, playMode]);

  if (error) {
    return (
      <div className="preview-page">
        <div className="preview-page-error">
          <p>{error}</p>
          <button onClick={handleClose} className="preview-back-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-page">
      {/* Loading overlay */}
      {!allAssetsReady && (
        <div className="preview-page-loading">
          <img src={catGif} alt="Loading..." className="preview-loading-cat" />
          <div className="preview-loading-status">
            {Object.entries(loadingStatus).map(([key, status]) => (
              status.text && (
                <div key={key} className={`loading-status-item ${status.loading ? 'loading' : 'done'}`}>
                  {status.loading ? '⏳' : '✓'} {status.text}
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Close button - hidden in play mode or while loading */}
      <button className={`preview-page-close ${playMode || !allAssetsReady ? 'hidden' : ''}`} onClick={handleClose}>
        Salir de la preview
      </button>

      {/* Main playfield - centered, hidden while loading */}
      <div className="preview-page-content" style={{ visibility: allAssetsReady ? 'visible' : 'hidden' }}>
        {notesData && audioUrl && (
          <ManiaPreview
            notesData={notesData}
            audioUrl={audioUrl}
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
            resetRef={resetRef}
            onBackToMappools={handleClose}
            username={user?.username}
            hitPosition={hitPosition}
            onHitPositionChange={(pos) => {
              setHitPosition(pos);
              localStorage.setItem('pmc_hit_position', pos.toString());
            }}
            hitPositionEditMode={hitPositionEditMode}
            storyboard={notesData?.storyboard}
            storyboardBaseUrl={notesData?.storyboard_base_url ? `${apiBaseUrl}${notesData.storyboard_base_url}` : null}
            hidePlayfield={hidePlayfield}
            onAudioLoaded={onAudioLoaded}
            onSkinLoaded={onSkinLoaded}
            onStoryboardProgress={onStoryboardProgress}
          />
        )}
      </div>

      {/* Exit hit position edit mode button */}
      {hitPositionEditMode && (
        <button
          className="hit-position-exit-btn"
          onClick={() => setHitPositionEditMode(false)}
        >
          Salir del modo de edición
        </button>
      )}

      {/* Bottom controls - hidden in play mode or hit position edit mode */}
      {createPortal(
        <div className={`audio-progress-overlay preview-fullwidth ${playMode || hitPositionEditMode ? 'hidden' : ''}`}>
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
              onClick={() => {
                if (!playMode) {
                  // Entering game mode - start playing if not already
                  setPlayMode(true);
                  if (!audioProgress.isPlaying) {
                    playRef.current?.toggle();
                  }
                } else {
                  setPlayMode(false);
                }
              }}
              title={playMode ? 'Disable game mode' : 'Enable game mode'}
            >
              <Gamepad2 size={16} />
              <span>{playMode ? 'GAME ON' : 'GAME'}</span>
            </button>

            {/* Keybindings button */}
            <button
              className="overlay-keybindings-btn"
              onClick={() => setKeybindingsModalOpen(true)}
              title="Configure keybindings"
            >
              <Keyboard size={16} />
            </button>

            {/* Hit Position edit button */}
            <button
              className="overlay-keybindings-btn"
              onClick={() => setHitPositionEditMode(true)}
              title="Editar posición de hit"
            >
              <MoveVertical size={16} />
            </button>

            {/* Hide playfield button */}
            <button
              className={`overlay-keybindings-btn ${hidePlayfield ? 'active' : ''}`}
              onClick={() => setHidePlayfield(!hidePlayfield)}
              title={hidePlayfield ? 'Mostrar playfield' : 'Ocultar playfield'}
            >
              {hidePlayfield ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>

            {/* Skin dropdown */}
            <div className="skin-dropdown-container" ref={skinDropdownRef}>
              <button
                className="overlay-skin-btn"
                onClick={() => setSkinDropdownOpen(!skinDropdownOpen)}
                title="Select skin"
              >
                <img
                  src={skin === 'arrow' ? '/mania-assets/left.png' : skin === 'circle' ? '/mania-assets/circle/Note1.png' : skin === 'pmc' ? '/mania-assets/pmc/Note1.png' : (customSkins.find((s) => s.id === skin)?.notes[0] || '/mania-assets/left.png')}
                  alt=""
                  className="overlay-skin-icon"
                />
                <span>{getCurrentSkinName()}</span>
                <ChevronDown size={14} className={`skin-dropdown-chevron ${skinDropdownOpen ? 'open' : ''}`} />
              </button>

              {skinDropdownOpen && (
                <div className="skin-dropdown-menu">
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
            {densityPath && (
              <svg className="density-curve" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d={densityPath} />
              </svg>
            )}
            <div
              className="audio-progress-marker"
              style={{ left: `${audioProgress.duration ? (audioProgress.currentTime / audioProgress.duration) * 100 : 0}%` }}
            />
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
