import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import './ManiaPreview.css';

// Column mapping for 4K
const COLUMN_MAP = {
  0: 'left',
  1: 'down',
  2: 'up',
  3: 'right',
};

// Speed multiplier options
const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

export default function ManiaPreview({ notesData, audioUrl }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const imagesRef = useRef({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Base scroll speed (pixels per millisecond)
  const BASE_SCROLL_SPEED = 1.0;
  const scrollSpeed = BASE_SCROLL_SPEED * speedMultiplier;

  // Canvas dimensions
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 800;
  const COLUMN_WIDTH = CANVAS_WIDTH / 4;
  const RECEPTOR_Y = CANVAS_HEIGHT - 100;
  const NOTE_SIZE = 100;  // Match receptor image width (100x800)
  const NOTE_HEIGHT = NOTE_SIZE;
  const NOTE_WIDTH = NOTE_SIZE;

  // Load all images on mount
  useEffect(() => {
    const imageNames = [
      // Notes
      'left', 'down', 'up', 'right',
      // Receptors
      'key_left', 'key_down', 'key_up', 'key_right',
      // Pressed receptors
      'key_leftD', 'key_downD', 'key_upD', 'key_rightD',
      // Holds
      'holdbody', 'holdcap',
    ];

    const loadPromises = imageNames.map((name) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          imagesRef.current[name] = img;
          resolve();
        };
        img.onerror = reject;
        img.src = `/mania-assets/${name}.png`;
      });
    });

    Promise.all(loadPromises)
      .then(() => setImagesLoaded(true))
      .catch((err) => console.error('Failed to load mania assets:', err));
  }, []);

  // Handle audio metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration * 1000);
    }
  }, []);

  // Handle audio time update
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime * 1000);
    }
  }, []);

  // Handle audio ended
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Handle seek
  const handleSeek = useCallback((e) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value) / 1000;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime * 1000);
  }, []);

  // Handle speed change
  const handleSpeedChange = useCallback((e) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeedMultiplier(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }, []);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imagesLoaded) return;

    const images = imagesRef.current;
    const currentTimeMs = audioRef.current ? audioRef.current.currentTime * 1000 : 0;

    // Clear canvas with black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw column separators
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * COLUMN_WIDTH, 0);
      ctx.lineTo(i * COLUMN_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Draw receptor line
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, RECEPTOR_Y);
    ctx.lineTo(CANVAS_WIDTH, RECEPTOR_Y);
    ctx.stroke();

    // Draw receptors (images are 100x800)
    for (let col = 0; col < 4; col++) {
      const colName = COLUMN_MAP[col];
      const receptorImg = images[`key_${colName}`];
      if (receptorImg) {
        const x = col * COLUMN_WIDTH + (COLUMN_WIDTH - NOTE_SIZE) / 2;
        ctx.drawImage(receptorImg, x, RECEPTOR_Y - CANVAS_HEIGHT, NOTE_SIZE, CANVAS_HEIGHT);
      }
    }

    // Visible range for optimization (only render notes within view)
    const visibleRangeMs = (RECEPTOR_Y + NOTE_HEIGHT) / scrollSpeed;
    const minTime = currentTimeMs - (NOTE_HEIGHT / scrollSpeed);
    const maxTime = currentTimeMs + visibleRangeMs;

    // Get notes from data
    const notes = notesData?.notes || [];

    // Draw notes
    for (const note of notes) {
      const { col, time, type, end } = note;

      // Skip notes outside visible range
      if (time > maxTime) continue;
      if (type === 'hold' && end < minTime) continue;
      if (type !== 'hold' && time < minTime) continue;

      const colName = COLUMN_MAP[col];
      const x = col * COLUMN_WIDTH + (COLUMN_WIDTH - NOTE_WIDTH) / 2;
      const noteY = RECEPTOR_Y - (time - currentTimeMs) * scrollSpeed;

      if (type === 'hold' && end !== undefined) {
        // Draw hold note
        const endY = RECEPTOR_Y - (end - currentTimeMs) * scrollSpeed;
        const holdHeight = noteY - endY;
        const capHeight = NOTE_HEIGHT / 2;

        // Draw hold body (stretched)
        const holdBodyImg = images['holdbody'];
        if (holdBodyImg && holdHeight > 0) {
          ctx.drawImage(holdBodyImg, x, endY, NOTE_WIDTH, holdHeight);
        }

        // Draw hold cap at end (flipped vertically, slightly overlapping body)
        const holdCapImg = images['holdcap'];
        if (holdCapImg) {
          ctx.save();
          ctx.translate(x + NOTE_WIDTH / 2, endY + capHeight - 2);
          ctx.scale(1, -1);
          ctx.drawImage(holdCapImg, -NOTE_WIDTH / 2, 0, NOTE_WIDTH, capHeight);
          ctx.restore();
        }

        // Draw note head at start
        const noteImg = images[colName];
        if (noteImg) {
          ctx.drawImage(noteImg, x, noteY - NOTE_HEIGHT / 2, NOTE_WIDTH, NOTE_HEIGHT);
        }
      } else {
        // Draw regular note
        const noteImg = images[colName];
        if (noteImg) {
          ctx.drawImage(noteImg, x, noteY - NOTE_HEIGHT / 2, NOTE_WIDTH, NOTE_HEIGHT);
        }
      }
    }


    // Continue animation loop
    animationRef.current = requestAnimationFrame(render);
  }, [imagesLoaded, notesData, scrollSpeed, CANVAS_WIDTH, CANVAS_HEIGHT, COLUMN_WIDTH, RECEPTOR_Y, NOTE_HEIGHT, NOTE_WIDTH]);

  // Start/stop animation loop
  useEffect(() => {
    if (imagesLoaded) {
      animationRef.current = requestAnimationFrame(render);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [imagesLoaded, render]);

  // Format time as mm:ss
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mania-preview">
      <div className="mania-preview-canvas-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="mania-preview-canvas"
        />
        {!imagesLoaded && (
          <div className="mania-preview-loading">
            Loading assets...
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="auto"
      />

      <div className="mania-preview-controls">
        <button
          className="mania-preview-play-btn"
          onClick={togglePlay}
          disabled={!imagesLoaded}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <div className="mania-preview-time">
          {formatTime(currentTime)}
        </div>

        <input
          type="range"
          className="mania-preview-seek"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          disabled={!duration}
        />

        <div className="mania-preview-time">
          {formatTime(duration)}
        </div>

        <select
          className="mania-preview-speed"
          value={speedMultiplier}
          onChange={handleSpeedChange}
        >
          {SPEED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {notesData?.metadata && (
        <div className="mania-preview-metadata">
          <span className="mania-preview-title">
            {notesData.metadata.artist} - {notesData.metadata.title}
          </span>
          {notesData.metadata.version && (
            <span className="mania-preview-diff">
              [{notesData.metadata.version}]
            </span>
          )}
        </div>
      )}
    </div>
  );
}
