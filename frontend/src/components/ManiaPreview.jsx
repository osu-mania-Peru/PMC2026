import { useState, useEffect, useRef, useCallback } from 'react';
import './ManiaPreview.css';

/**
 * Calculate scroll position at a given time considering SV changes.
 * Returns the cumulative scroll distance from time 0 to the given time.
 */
function calculateScrollPosition(time, timingPoints) {
  if (!timingPoints || timingPoints.length === 0) {
    return time; // No SV data, use linear time
  }

  let position = 0;
  let currentSv = 1.0;
  let lastTime = 0;

  for (const tp of timingPoints) {
    if (tp.time > time) {
      // Add remaining distance at current SV
      position += (time - lastTime) * currentSv;
      return position;
    }

    // Add distance from last point to this point at current SV
    position += (tp.time - lastTime) * currentSv;
    lastTime = tp.time;

    // Update SV (only if it's an inherited point with SV change)
    if (tp.sv !== undefined && tp.sv !== null) {
      currentSv = tp.sv;
    }
  }

  // Add remaining distance after last timing point
  position += (time - lastTime) * currentSv;
  return position;
}

export default function ManiaPreview({ notesData, audioUrl, onAudioProgress, seekToRef, skin = 'arrow', volume = 0.5, playbackSpeed = 1, scrollSpeed = 25, playRef }) {
  // Refs
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const imagesRef = useRef({});
  const renderRef = useRef(null);
  // Time interpolation refs for smooth animation at any playback speed
  const lastAudioTimeRef = useRef(0);
  const lastPerfTimeRef = useRef(0);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Expose seek function via ref
  useEffect(() => {
    if (seekToRef) {
      seekToRef.current = (timeMs) => {
        if (audioRef.current) {
          audioRef.current.currentTime = timeMs / 1000;
          setCurrentTime(timeMs);
          // Reset interpolation refs on seek
          lastAudioTimeRef.current = timeMs;
          lastPerfTimeRef.current = performance.now();
        }
      };
    }
  }, [seekToRef]);

  // Scroll speed (pixels per millisecond) - based on scroll speed setting
  const scrollSpeedMultiplier = scrollSpeed / 25;

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync playback speed to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Expose play/pause toggle via ref
  useEffect(() => {
    if (playRef) {
      playRef.current = {
        toggle: () => {
          if (!audioRef.current) return;
          // Reset interpolation refs on play/pause
          lastAudioTimeRef.current = audioRef.current.currentTime * 1000;
          lastPerfTimeRef.current = performance.now();
          if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else {
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
          }
        },
        isPlaying,
      };
    }
  }, [playRef, isPlaying]);

  // Canvas dimensions
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 800;
  const COLUMN_WIDTH = CANVAS_WIDTH / 4;
  const RECEPTOR_Y = CANVAS_HEIGHT - 100;
  const NOTE_SIZE = 100;  // Match receptor image width (100x800)
  const NOTE_HEIGHT = NOTE_SIZE;
  const NOTE_WIDTH = NOTE_SIZE;

  // Load all images on mount (both skins)
  useEffect(() => {
    const arrowImages = [
      // Notes
      { name: 'arrow_note_0', src: '/mania-assets/left.png' },
      { name: 'arrow_note_1', src: '/mania-assets/down.png' },
      { name: 'arrow_note_2', src: '/mania-assets/up.png' },
      { name: 'arrow_note_3', src: '/mania-assets/right.png' },
      // Receptors
      { name: 'arrow_receptor_0', src: '/mania-assets/key_left.png' },
      { name: 'arrow_receptor_1', src: '/mania-assets/key_down.png' },
      { name: 'arrow_receptor_2', src: '/mania-assets/key_up.png' },
      { name: 'arrow_receptor_3', src: '/mania-assets/key_right.png' },
      // Holds
      { name: 'arrow_holdbody', src: '/mania-assets/holdbody.png' },
      { name: 'arrow_holdcap', src: '/mania-assets/holdcap.png' },
    ];

    const circleImages = [
      // Notes (same image for all columns)
      { name: 'circle_note_0', src: '/mania-assets/circle/Note1.png' },
      { name: 'circle_note_1', src: '/mania-assets/circle/Note2.png' },
      { name: 'circle_note_2', src: '/mania-assets/circle/Note3.png' },
      { name: 'circle_note_3', src: '/mania-assets/circle/Note4.png' },
      // Receptors (same for all columns)
      { name: 'circle_receptor', src: '/mania-assets/circle/receptor.png' },
      // Holds
      { name: 'circle_holdbody', src: '/mania-assets/circle/holdbody.png' },
      { name: 'circle_holdcap', src: '/mania-assets/circle/holdcap.png' },
    ];

    const allImages = [...arrowImages, ...circleImages];

    const loadPromises = allImages.map(({ name, src }) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          imagesRef.current[name] = img;
          resolve();
        };
        img.onerror = reject;
        img.src = src;
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
      const time = audioRef.current.currentTime * 1000;
      setCurrentTime(time);
      onAudioProgress?.({ currentTime: time, duration, isPlaying, notes: notesData?.notes });
    }
  }, [duration, isPlaying, onAudioProgress, notesData]);

  // Handle audio ended
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onAudioProgress?.({ currentTime, duration, isPlaying: false });
  }, [currentTime, duration, onAudioProgress]);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imagesLoaded) return;

    const images = imagesRef.current;

    // Interpolate time for smooth animation at any playback speed
    let currentTimeMs = 0;
    if (audioRef.current) {
      const audioTime = audioRef.current.currentTime * 1000;
      const perfTime = performance.now();

      if (!audioRef.current.paused) {
        // If audio time changed significantly, update our reference
        if (Math.abs(audioTime - lastAudioTimeRef.current) > 50) {
          lastAudioTimeRef.current = audioTime;
          lastPerfTimeRef.current = perfTime;
        }
        // Interpolate: last known audio time + elapsed performance time * playback rate
        const elapsed = (perfTime - lastPerfTimeRef.current) * (audioRef.current.playbackRate || 1);
        currentTimeMs = lastAudioTimeRef.current + elapsed;
      } else {
        currentTimeMs = audioTime;
        lastAudioTimeRef.current = audioTime;
        lastPerfTimeRef.current = perfTime;
      }
    }

    const timingPoints = notesData?.timing_points || [];

    // Calculate current scroll position for SV-aware rendering
    const currentScrollPos = calculateScrollPosition(currentTimeMs, timingPoints);

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

    // Draw receptors
    for (let col = 0; col < 4; col++) {
      const receptorImg = skin === 'arrow'
        ? images[`arrow_receptor_${col}`]
        : images['circle_receptor'];
      if (receptorImg) {
        const x = col * COLUMN_WIDTH + (COLUMN_WIDTH - NOTE_SIZE) / 2;
        if (skin === 'arrow') {
          // Arrow receptors are 100x800
          ctx.drawImage(receptorImg, x, RECEPTOR_Y - CANVAS_HEIGHT, NOTE_SIZE, CANVAS_HEIGHT);
        } else {
          // Circle receptors are 100x284, preserve aspect ratio and stick to bottom
          const circleReceptorHeight = NOTE_SIZE * (284 / 100);
          ctx.drawImage(receptorImg, x, RECEPTOR_Y - circleReceptorHeight, NOTE_SIZE, circleReceptorHeight);
        }
      }
    }

    // Visible range for optimization (only render notes within view)
    // With SV, we need to be more generous with the range since SV can compress/expand time
    const visibleRangeMs = (RECEPTOR_Y + NOTE_HEIGHT) / scrollSpeedMultiplier * 2; // 2x buffer for SV
    const minTime = currentTimeMs - (NOTE_HEIGHT / scrollSpeedMultiplier) * 2;
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

      const x = col * COLUMN_WIDTH + (COLUMN_WIDTH - NOTE_WIDTH) / 2;

      // Calculate SV-aware scroll position for the note
      const noteScrollPos = calculateScrollPosition(time, timingPoints);
      const noteY = RECEPTOR_Y - (noteScrollPos - currentScrollPos) * scrollSpeedMultiplier;

      // Get note image based on skin
      const noteImg = images[`${skin}_note_${col}`];
      const holdBodyImg = images[`${skin}_holdbody`];
      const holdCapImg = images[`${skin}_holdcap`];

      if (type === 'hold' && end !== undefined) {
        // Draw hold note with SV-aware end position
        const endScrollPos = calculateScrollPosition(end, timingPoints);
        const endY = RECEPTOR_Y - (endScrollPos - currentScrollPos) * scrollSpeedMultiplier;
        const holdHeight = noteY - endY;
        // Circle skin has square holdcap (128x128), arrow skin has rectangular (128x122)
        const capHeight = skin === 'circle' ? NOTE_WIDTH : NOTE_HEIGHT / 2;
        const capOverlap = skin === 'circle' ? 51 : 22;

        // Draw hold body (stretched)
        if (holdBodyImg && holdHeight > 0) {
          ctx.drawImage(holdBodyImg, x, endY, NOTE_WIDTH, holdHeight);
        }

        // Draw hold cap at end (flipped vertically, slightly overlapping body)
        if (holdCapImg) {
          ctx.save();
          ctx.translate(x + NOTE_WIDTH / 2, endY + capHeight - capOverlap);
          ctx.scale(1, -1);
          ctx.drawImage(holdCapImg, -NOTE_WIDTH / 2, 0, NOTE_WIDTH, capHeight);
          ctx.restore();
        }

        // Draw note head at start
        if (noteImg) {
          ctx.drawImage(noteImg, x, noteY - NOTE_HEIGHT / 2, NOTE_WIDTH, NOTE_HEIGHT);
        }
      } else {
        // Draw regular note
        if (noteImg) {
          ctx.drawImage(noteImg, x, noteY - NOTE_HEIGHT / 2, NOTE_WIDTH, NOTE_HEIGHT);
        }
      }
    }


    // Continue animation loop using ref to avoid stale closure
    animationRef.current = requestAnimationFrame(() => renderRef.current?.());
  }, [imagesLoaded, notesData, scrollSpeedMultiplier, skin, CANVAS_WIDTH, CANVAS_HEIGHT, COLUMN_WIDTH, RECEPTOR_Y, NOTE_HEIGHT, NOTE_WIDTH]);

  // Store render function in ref and start/stop animation loop
  useEffect(() => {
    renderRef.current = render;
    if (imagesLoaded) {
      animationRef.current = requestAnimationFrame(() => renderRef.current?.());
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [imagesLoaded, render]);

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
