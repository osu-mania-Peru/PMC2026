import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X, Play, Pause, Volume2, Gauge, Clock, Gamepad2, Settings } from 'lucide-react';
import { api } from '../api';
import ManiaPreview from '../components/ManiaPreview';
import catGif from '../assets/cat.gif';
import './Preview.css';

export default function Preview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const beatmapId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notesData, setNotesData] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);

  // Player controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Settings
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('pmc_preview_volume');
    return saved ? parseFloat(saved) : 0.5;
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const saved = localStorage.getItem('pmc_preview_speed');
    return saved ? parseFloat(saved) : 1;
  });
  const [scrollSpeed, setScrollSpeed] = useState(() => {
    const saved = localStorage.getItem('pmc_preview_scroll');
    return saved ? parseInt(saved) : 25;
  });
  const [playMode, setPlayMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const seekToRef = useRef(null);
  const playRef = useRef(null);
  const resetRef = useRef(null);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('pmc_preview_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('pmc_preview_speed', playbackSpeed.toString());
  }, [playbackSpeed]);

  useEffect(() => {
    localStorage.setItem('pmc_preview_scroll', scrollSpeed.toString());
  }, [scrollSpeed]);

  // Fetch preview data
  useEffect(() => {
    if (!beatmapId) {
      setError('No beatmap ID provided');
      setLoading(false);
      return;
    }

    const fetchPreviewData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/mappools/preview/${beatmapId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Beatmap not found');
          }
          throw new Error(`Failed to fetch preview: ${response.status}`);
        }

        const data = await response.json();
        setNotesData(data);
        setAudioUrl(`${import.meta.env.VITE_API_URL}${data.audio_url}`);
        setMapInfo({
          artist: data.metadata?.artist,
          title: data.metadata?.title,
          version: data.metadata?.version,
          keys: data.metadata?.keys || 4,
        });
      } catch (err) {
        console.error('Error fetching preview data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewData();
  }, [beatmapId]);

  // Handle audio progress
  const handleAudioProgress = useCallback(({ currentTime: ct, duration: dur, isPlaying: playing }) => {
    setCurrentTime(ct);
    setDuration(dur);
    setIsPlaying(playing);
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    playRef.current?.toggle();
  }, []);

  // Seek
  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * duration;
    seekToRef.current?.(newTime);
  }, [duration]);

  // Format time
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Close and go back
  const handleClose = useCallback(() => {
    resetRef.current?.();
    navigate(-1);
  }, [navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.code === 'Space' && !playMode) {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, togglePlay, playMode]);

  if (loading) {
    return (
      <div className="preview-page">
        <div className="preview-loading">
          <img src={catGif} alt="Loading..." className="preview-loading-cat" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preview-page">
        <div className="preview-error">
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
      {/* Header */}
      <div className="preview-header">
        <button className="preview-close-btn" onClick={handleClose}>
          <X size={24} />
        </button>
        <div className="preview-title">
          {mapInfo && (
            <>
              <span className="preview-artist">{mapInfo.artist}</span>
              <span className="preview-song">{mapInfo.title}</span>
              {mapInfo.version && (
                <span className="preview-diff">[{mapInfo.version}]</span>
              )}
            </>
          )}
        </div>
        <button
          className={`preview-settings-btn ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Main content */}
      <div className="preview-content">
        {/* Settings panel */}
        {showSettings && (
          <div className="preview-settings">
            <div className="setting-group">
              <label><Volume2 size={16} /> Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <div className="setting-group">
              <label><Gauge size={16} /> Speed</label>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              />
              <span>{playbackSpeed}x</span>
            </div>
            <div className="setting-group">
              <label><Clock size={16} /> Scroll</label>
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(parseInt(e.target.value))}
              />
              <span>{scrollSpeed}</span>
            </div>
            <div className="setting-group">
              <label><Gamepad2 size={16} /> Play Mode</label>
              <button
                className={`play-mode-btn ${playMode ? 'active' : ''}`}
                onClick={() => setPlayMode(!playMode)}
              >
                {playMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}

        {/* Playfield container */}
        <div className="preview-playfield">
          {notesData && audioUrl && (
            <ManiaPreview
              notesData={notesData}
              audioUrl={audioUrl}
              onAudioProgress={handleAudioProgress}
              seekToRef={seekToRef}
              volume={volume}
              playbackSpeed={playbackSpeed}
              scrollSpeed={scrollSpeed}
              playRef={playRef}
              playMode={playMode}
              onPlayModeChange={setPlayMode}
              resetRef={resetRef}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="preview-controls">
        <button className="preview-play-btn" onClick={togglePlay}>
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <div className="preview-progress" onClick={handleSeek}>
          <div
            className="preview-progress-fill"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <span className="preview-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
