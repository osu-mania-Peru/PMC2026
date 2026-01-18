import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './ManiaPreview.css';
import StoryboardRenderer from './StoryboardRenderer';

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

// Calculate timing windows based on OD (Overall Difficulty)
// Formula from osu!mania wiki: https://osu.ppy.sh/wiki/en/Gameplay/Judgement/osu!mania
// MAX (PERFECT): 16ms fixed
// 300 (GREAT): 64 - 3 × OD
// 200 (GOOD): 97 - 3 × OD
// 100 (OK): 127 - 3 × OD
// 50 (MEH): 151 - 3 × OD
// MISS: 188 - 3 × OD
function getTimingWindows(od = 8) {
  return {
    MAX: 16,
    300: Math.floor(64 - 3 * od),
    200: Math.floor(97 - 3 * od),
    100: Math.floor(127 - 3 * od),
    50: Math.floor(151 - 3 * od),
    MISS: Math.floor(188 - 3 * od),
  };
}

// osu!mania ScoreV1 values for each judgement
// Score = BaseScore + BonusScore
// BaseScore = (MaxScore * 0.5 / TotalNotes) * (HitValue / 320)
// BonusScore = (MaxScore * 0.5 / TotalNotes) * (HitBonusValue * sqrt(Bonus) / 320)
const SCORE_VALUES = {
  MAX: { hitValue: 320, bonusValue: 32, hitBonus: 2, hitPunishment: 0 },
  300: { hitValue: 300, bonusValue: 32, hitBonus: 1, hitPunishment: 0 },
  200: { hitValue: 200, bonusValue: 16, hitBonus: 0, hitPunishment: 8 },
  100: { hitValue: 100, bonusValue: 8, hitBonus: 0, hitPunishment: 24 },
  50:  { hitValue: 50,  bonusValue: 4, hitBonus: 0, hitPunishment: 44 },
  MISS: { hitValue: 0, bonusValue: 0, hitBonus: 0, hitPunishment: Infinity },
};

const MAX_SCORE = 1000000;

// Colors for judgement display
const JUDGEMENT_COLORS = {
  MAX: '#00ffff',
  300: '#ffff00',
  200: '#00ff00',
  100: '#0088ff',
  50: '#888888',
  MISS: '#ff0000',
};

// Key bindings per key count
const KEY_BINDINGS = {
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
const KEY_DISPLAY = {
  KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyF: 'F', KeyV: 'V',
  KeyN: 'N', KeyJ: 'J', KeyK: 'K', KeyL: 'L',
  Space: '␣', Semicolon: ';',
};

export default function ManiaPreview({
  notesData,
  audioUrl,
  onAudioProgress,
  seekToRef,
  skin = 'pmc',
  customSkinData = null,
  volume = 0.5,
  playbackSpeed = 1,
  scrollSpeed = 25,
  playRef,
  playMode = false,
  onPlayModeChange,
  onGameEnd,
  customKeyBindings = null,
  resetRef = null,
  onBackToMappools = null,
  username = null,
  hitPosition = 100,
  onHitPositionChange = null,
  hitPositionEditMode = false,
  storyboard = null,
  storyboardBaseUrl = null,
  hidePlayfield = false,
  bgOpacity = 0.1,
  onAudioLoaded = null,
  onSkinLoaded = null,
  onStoryboardProgress = null,
  onAudioLoadProgress = null,
  autoMode = false,
  onAutoModeChange = null,
}) {
  // Refs
  const canvasRef = useRef(null);
  const kpsCanvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const imagesRef = useRef({});
  const renderRef = useRef(null);
  // Time interpolation refs for smooth animation at any playback speed
  const lastAudioTimeRef = useRef(0);
  const lastPerfTimeRef = useRef(0);
  // Shared time ref for storyboard (avoids React re-renders)
  const currentTimeRefForStoryboard = useRef(0);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);

  // Play mode state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hitNotes, setHitNotes] = useState(new Set());
  const [activeHolds, setActiveHolds] = useState(new Map());
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [judgements, setJudgements] = useState([]); // {type, time, col, displayUntil}
  const [hitCounts, setHitCounts] = useState({ MAX: 0, 300: 0, 200: 0, 100: 0, 50: 0, MISS: 0 });
  const [showResults, setShowResults] = useState(false);
  const [hitErrors, setHitErrors] = useState([]); // {timeDiff, displayUntil, judgement}
  const [bouncingJudgement, setBouncingJudgement] = useState(null); // Which judgement is currently bouncing

  // Refs for play mode (to avoid stale closures)
  const hitNotesRef = useRef(new Set());
  const activeHoldsRef = useRef(new Map());
  const pressedKeysRef = useRef(new Set());
  const keyPressTimesRef = useRef(new Map()); // Track when each key was pressed
  const keyPressHistoryRef = useRef([]); // History of key presses for visualization {col, startTime, endTime}
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const bonusRef = useRef(100); // osu!mania bonus multiplier, starts at 100, range [0, 100]
  const hitCountsRef = useRef({ MAX: 0, 300: 0, 200: 0, 100: 0, 50: 0, MISS: 0 });
  const hitErrorsRef = useRef([]);

  // Dragging state for hit position
  const [isDraggingHitLine, setIsDraggingHitLine] = useState(false);

  // Auto mode ref for tracking hold notes
  const autoHoldsRef = useRef(new Map());

  // Get key count from beatmap metadata (default to 4K)
  const keyCount = notesData?.metadata?.keys || 4;

  // Get OD from beatmap metadata and calculate timing windows
  const od = notesData?.metadata?.od ?? 8;
  const TIMING_WINDOWS = useMemo(() => getTimingWindows(od), [od]);

  // Canvas dimensions
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 800;
  const RECEPTOR_Y = CANVAS_HEIGHT - 100; // Fixed position for note calculations
  const RECEPTOR_VISUAL_Y = CANVAS_HEIGHT - hitPosition; // Visual receptor position (adjustable)

  // For 4K, use fixed 100px columns; for other key counts, divide canvas evenly
  const COLUMN_WIDTH = keyCount === 4 ? 100 : CANVAS_WIDTH / keyCount;
  const NOTE_SIZE = keyCount === 4 ? 100 : COLUMN_WIDTH;
  const NOTE_HEIGHT = NOTE_SIZE;
  const NOTE_WIDTH = NOTE_SIZE;

  // Scroll speed (pixels per millisecond) - based on scroll speed setting
  const scrollSpeedMultiplier = scrollSpeed / 25;

  // Reset play state when play mode changes or song restarts
  const resetPlayState = useCallback(() => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHitNotes(new Set());
    setActiveHolds(new Map());
    setJudgements([]);
    setHitCounts({ MAX: 0, 300: 0, 200: 0, 100: 0, 50: 0, MISS: 0 });
    setShowResults(false);
    setHitErrors([]);
    hitNotesRef.current = new Set();
    activeHoldsRef.current = new Map();
    autoHoldsRef.current = new Map();
    keyPressTimesRef.current = new Map();
    keyPressHistoryRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    bonusRef.current = 100;
    hitCountsRef.current = { MAX: 0, 300: 0, 200: 0, 100: 0, 50: 0, MISS: 0 };
    hitErrorsRef.current = [];
  }, []);

  // Reset when entering play mode
  useEffect(() => {
    if (playMode) {
      resetPlayState();
    }
  }, [playMode, resetPlayState]);

  // Get judgement for a timing difference
  const getJudgement = useCallback((timeDiff) => {
    const absDiff = Math.abs(timeDiff);
    if (absDiff <= TIMING_WINDOWS.MAX) return 'MAX';
    if (absDiff <= TIMING_WINDOWS[300]) return '300';
    if (absDiff <= TIMING_WINDOWS[200]) return '200';
    if (absDiff <= TIMING_WINDOWS[100]) return '100';
    if (absDiff <= TIMING_WINDOWS[50]) return '50';
    return 'MISS';
  }, [TIMING_WINDOWS]);

  // Record a hit using osu!mania ScoreV1 formula
  const recordHit = useCallback((noteIndex, judgement, col, timeDiff = 0) => {
    const now = performance.now();

    // Update hit notes
    hitNotesRef.current.add(noteIndex);
    setHitNotes(new Set(hitNotesRef.current));

    // Calculate score using osu!mania ScoreV1 formula
    // Score = BaseScore + BonusScore
    // BaseScore = (MaxScore * 0.5 / TotalNotes) * (HitValue / 320)
    // BonusScore = (MaxScore * 0.5 / TotalNotes) * (HitBonusValue * sqrt(Bonus) / 320)
    const totalNotes = notesData?.notes?.length || 1;
    const scoreData = SCORE_VALUES[judgement];

    // Update bonus multiplier first
    if (scoreData.hitBonus > 0) {
      bonusRef.current = Math.min(100, bonusRef.current + scoreData.hitBonus);
    } else if (scoreData.hitPunishment === Infinity) {
      bonusRef.current = 0; // MISS resets bonus to 0
    } else if (scoreData.hitPunishment > 0) {
      bonusRef.current = Math.max(0, bonusRef.current - scoreData.hitPunishment);
    }

    // Calculate this hit's score contribution
    const baseMultiplier = (MAX_SCORE * 0.5) / totalNotes;
    const baseScore = baseMultiplier * (scoreData.hitValue / 320);
    const bonusScore = baseMultiplier * (scoreData.bonusValue * Math.sqrt(bonusRef.current) / 320);
    const hitScore = Math.round(baseScore + bonusScore);

    scoreRef.current += hitScore;
    setScore(scoreRef.current);

    // Update combo
    if (judgement === 'MISS') {
      comboRef.current = 0;
    } else {
      comboRef.current += 1;
      if (comboRef.current > maxComboRef.current) {
        maxComboRef.current = comboRef.current;
        setMaxCombo(maxComboRef.current);
      }
    }
    setCombo(comboRef.current);

    // Update hit counts
    hitCountsRef.current[judgement] += 1;
    setHitCounts({ ...hitCountsRef.current });

    // Trigger bounce animation for this judgement
    setBouncingJudgement(judgement);
    setTimeout(() => setBouncingJudgement(null), 150);

    // Add judgement popup
    setJudgements((prev) => [
      ...prev.filter((j) => j.displayUntil > now),
      { type: judgement, col, displayUntil: now + 500 },
    ]);

    // Add hit error for timing bar (only for non-miss hits)
    if (judgement !== 'MISS') {
      const newError = { timeDiff, displayUntil: now + 2000, judgement };
      hitErrorsRef.current = [...hitErrorsRef.current.filter(e => e.displayUntil > now), newError].slice(-20);
      setHitErrors([...hitErrorsRef.current]);
    }
  }, [notesData]);

  // Handle key press in play mode
  const handleKeyDown = useCallback((col, currentTimeMs) => {
    if (!playMode || !notesData?.notes) return;

    const notes = notesData.notes;

    // Find the closest unhit note in this column within hit window
    let closestNote = null;
    let closestDiff = Infinity;
    let closestIndex = -1;

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note.col !== col) continue;
      if (hitNotesRef.current.has(i)) continue;

      const timeDiff = note.time - currentTimeMs;

      // Only consider notes that haven't passed too far
      if (timeDiff < -TIMING_WINDOWS.MISS) continue;
      // Don't hit notes too far in the future
      if (timeDiff > TIMING_WINDOWS.MISS) continue;

      if (Math.abs(timeDiff) < Math.abs(closestDiff)) {
        closestDiff = timeDiff;
        closestNote = note;
        closestIndex = i;
      }
    }

    if (closestNote && Math.abs(closestDiff) <= TIMING_WINDOWS.MISS) {
      const judgement = getJudgement(closestDiff);

      if (closestNote.type === 'hold') {
        // Start hold note
        activeHoldsRef.current.set(col, {
          noteIndex: closestIndex,
          note: closestNote,
          startJudgement: judgement,
          startTimeDiff: closestDiff,
        });
        setActiveHolds(new Map(activeHoldsRef.current));
      } else {
        // Tap note - record hit immediately
        recordHit(closestIndex, judgement, col, closestDiff);
      }
    }
  }, [playMode, notesData, getJudgement, recordHit, TIMING_WINDOWS]);

  // Handle key release in play mode
  const handleKeyUp = useCallback((col, currentTimeMs) => {
    if (!playMode) return;

    const holdInfo = activeHoldsRef.current.get(col);
    if (!holdInfo) return;

    const { noteIndex, note, startJudgement, startTimeDiff } = holdInfo;
    const endTimeDiff = note.end - currentTimeMs;

    // Remove from active holds
    activeHoldsRef.current.delete(col);
    setActiveHolds(new Map(activeHoldsRef.current));

    // Calculate release judgement
    let releaseJudgement;
    if (endTimeDiff > TIMING_WINDOWS.MISS) {
      // Released too early
      releaseJudgement = 'MISS';
    } else {
      releaseJudgement = getJudgement(endTimeDiff);
    }

    // Final judgement is the worse of start and release
    const judgementOrder = ['MAX', '300', '200', '100', '50', 'MISS'];
    const startIdx = judgementOrder.indexOf(startJudgement);
    const releaseIdx = judgementOrder.indexOf(releaseJudgement);
    const finalJudgement = judgementOrder[Math.max(startIdx, releaseIdx)];

    // Use the worse timing diff for the error bar
    const finalTimeDiff = Math.abs(startTimeDiff) > Math.abs(endTimeDiff) ? startTimeDiff : endTimeDiff;
    recordHit(noteIndex, finalJudgement, col, finalTimeDiff);
  }, [playMode, getJudgement, recordHit, TIMING_WINDOWS]);

  // Keyboard event handlers
  useEffect(() => {
    if (!playMode) return;

    // Use custom keybindings if provided, otherwise fall back to defaults
    const keyBindings = customKeyBindings?.[keyCount] || KEY_BINDINGS[keyCount] || KEY_BINDINGS[4];

    const onKeyDown = (e) => {
      if (e.repeat) return;

      const col = keyBindings.indexOf(e.code);
      if (col === -1) return;

      e.preventDefault();

      // Update pressed keys
      pressedKeysRef.current.add(col);
      setPressedKeys(new Set(pressedKeysRef.current));

      // Track key press start time for visualization
      const now = performance.now();
      keyPressTimesRef.current.set(col, now);

      // Get current time
      const currentTimeMs = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      handleKeyDown(col, currentTimeMs);
    };

    const onKeyUp = (e) => {
      const col = keyBindings.indexOf(e.code);
      if (col === -1) return;

      e.preventDefault();

      // Update pressed keys
      pressedKeysRef.current.delete(col);
      setPressedKeys(new Set(pressedKeysRef.current));

      // Record key press history for visualization
      const now = performance.now();
      const startTime = keyPressTimesRef.current.get(col);
      if (startTime) {
        keyPressHistoryRef.current.push({ col, startTime, endTime: now });
        // Keep only last 2 seconds of history
        const cutoff = now - 2000;
        keyPressHistoryRef.current = keyPressHistoryRef.current.filter(h => h.endTime > cutoff);
        keyPressTimesRef.current.delete(col);
      }

      // Get current time
      const currentTimeMs = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      handleKeyUp(col, currentTimeMs);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [playMode, keyCount, handleKeyDown, handleKeyUp, customKeyBindings]);

  // Check for missed notes (notes that passed without being hit)
  useEffect(() => {
    if (!playMode || !isPlaying || !notesData?.notes) return;

    const checkMissedNotes = () => {
      const currentTimeMs = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      const notes = notesData.notes;

      for (let i = 0; i < notes.length; i++) {
        if (hitNotesRef.current.has(i)) continue;

        const note = notes[i];

        // Skip hold notes that are currently being held
        if (note.type === 'hold') {
          const holdInfo = activeHoldsRef.current.get(note.col);
          if (holdInfo && holdInfo.noteIndex === i) continue;
        }

        // For hold notes, use end time (tail); for tap notes, use start time (head)
        const relevantTime = note.type === 'hold' && note.end !== undefined ? note.end : note.time;
        const timeDiff = currentTimeMs - relevantTime;

        // Note has passed the miss window
        if (timeDiff > TIMING_WINDOWS.MISS) {
          recordHit(i, 'MISS', note.col, timeDiff);
        }
      }
    };

    const interval = setInterval(checkMissedNotes, 16);
    return () => clearInterval(interval);
  }, [playMode, isPlaying, notesData, recordHit, TIMING_WINDOWS]);

  // Auto mode - automatically hit notes with perfect timing
  useEffect(() => {
    if (!autoMode || !playMode || !isPlaying || !notesData?.notes) return;

    const autoPlay = () => {
      const currentTimeMs = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      const now = performance.now();
      const notes = notesData.notes;

      for (let i = 0; i < notes.length; i++) {
        if (hitNotesRef.current.has(i)) continue;

        const note = notes[i];
        const col = note.col;

        if (note.type === 'hold') {
          // Hold note: press at start time, release at end time
          if (!autoHoldsRef.current.has(i) && currentTimeMs >= note.time && currentTimeMs < note.end) {
            // Start the hold
            autoHoldsRef.current.set(i, true);
            // Track key press for visualization
            pressedKeysRef.current.add(col);
            keyPressTimesRef.current.set(col, now);
            handleKeyDown(col, note.time); // Perfect timing
          } else if (autoHoldsRef.current.has(i) && currentTimeMs >= note.end) {
            // Release the hold
            autoHoldsRef.current.delete(i);
            // Track key release for visualization
            pressedKeysRef.current.delete(col);
            const startTime = keyPressTimesRef.current.get(col);
            if (startTime) {
              keyPressHistoryRef.current.push({ col, startTime, endTime: now });
              const cutoff = now - 2000;
              keyPressHistoryRef.current = keyPressHistoryRef.current.filter(h => h.endTime > cutoff);
              keyPressTimesRef.current.delete(col);
            }
            handleKeyUp(col, note.end); // Perfect timing
          }
        } else {
          // Tap note: hit at exact time (simulate quick press)
          if (currentTimeMs >= note.time && currentTimeMs < note.time + 50) {
            // Track key press for visualization (brief light up)
            keyPressTimesRef.current.set(col, now);
            // Schedule key release after 50ms
            setTimeout(() => {
              const startTime = keyPressTimesRef.current.get(col);
              if (startTime === now) {
                keyPressTimesRef.current.delete(col);
                keyPressHistoryRef.current.push({ col, startTime, endTime: performance.now() });
                const cutoff = performance.now() - 2000;
                keyPressHistoryRef.current = keyPressHistoryRef.current.filter(h => h.endTime > cutoff);
              }
            }, 50);
            handleKeyDown(col, note.time); // Perfect timing
          }
        }
      }
    };

    const interval = setInterval(autoPlay, 8); // Check every 8ms for precision
    return () => {
      clearInterval(interval);
      autoHoldsRef.current.clear();
    };
  }, [autoMode, playMode, isPlaying, notesData, handleKeyDown, handleKeyUp]);

  // Handle hit line dragging
  useEffect(() => {
    if (!hitPositionEditMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleY = CANVAS_HEIGHT / rect.height;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // Check if mouse is near the hit line (within 20px)
      if (Math.abs(mouseY - RECEPTOR_VISUAL_Y) < 20) {
        setIsDraggingHitLine(true);
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (!isDraggingHitLine) return;

      const rect = canvas.getBoundingClientRect();
      const scaleY = CANVAS_HEIGHT / rect.height;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // Calculate new hit position (distance from bottom)
      const newHitPosition = Math.max(50, Math.min(CANVAS_HEIGHT - 50, CANVAS_HEIGHT - mouseY));
      onHitPositionChange?.(Math.round(newHitPosition));
    };

    const handleMouseUp = () => {
      setIsDraggingHitLine(false);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hitPositionEditMode, isDraggingHitLine, RECEPTOR_VISUAL_Y, CANVAS_HEIGHT, onHitPositionChange]);

  // Expose seek function via ref
  useEffect(() => {
    if (seekToRef) {
      seekToRef.current = (timeMs) => {
        if (audioRef.current) {
          audioRef.current.currentTime = timeMs / 1000;
          setCurrentTime(timeMs);
          currentTimeRefForStoryboard.current = timeMs; // Update storyboard time
          // Reset interpolation refs on seek
          lastAudioTimeRef.current = timeMs;
          lastPerfTimeRef.current = performance.now();
        }
      };
    }
  }, [seekToRef]);

  // Expose full reset function via ref (for closing preview)
  useEffect(() => {
    if (resetRef) {
      resetRef.current = () => {
        // Stop audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        // Reset state
        setIsPlaying(false);
        setCurrentTime(0);
        // Reset play mode state
        resetPlayState();
        // Reset interpolation refs
        lastAudioTimeRef.current = 0;
        lastPerfTimeRef.current = performance.now();
      };
    }
  }, [resetRef, resetPlayState]);

  // Convert linear slider value to logarithmic volume for natural perception
  const toLogVolume = (linear) => {
    // Use exponential curve: quieter at low values, natural feel
    return Math.pow(linear, 3);
  };

  // Sync volume to audio element (including on mount)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = toLogVolume(volume);
    }
  }, [volume]);

  // Download audio with progress tracking
  useEffect(() => {
    if (!audioUrl) return;

    const controller = new AbortController();

    const downloadAudio = async () => {
      try {
        const response = await fetch(audioUrl, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body) {
          // Fallback: no streaming support, just use URL directly
          setAudioBlobUrl(audioUrl);
          return;
        }

        const reader = response.body.getReader();
        const chunks = [];
        let loaded = 0;

        // Report initial progress
        onAudioLoadProgress?.(0, total);

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          chunks.push(value);
          loaded += value.length;

          // Always report progress (total may be 0 if server doesn't send Content-Length)
          onAudioLoadProgress?.(loaded, total);
        }

        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);
        setAudioBlobUrl(blobUrl);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error downloading audio:', err);
          // Fallback to direct URL
          setAudioBlobUrl(audioUrl);
        }
      }
    };

    downloadAudio();

    return () => {
      controller.abort();
    };
  }, [audioUrl, onAudioLoadProgress]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioBlobUrl && audioBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);

  // Ensure volume is set when audio can play
  const handleCanPlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = toLogVolume(volume);
    }
    onAudioLoaded?.();
  }, [volume, onAudioLoaded]);

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
          // Use audio element's actual paused state to avoid stale closure
          if (!audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else {
            // Reset play state when starting in play mode
            if (playMode && audioRef.current.currentTime < 0.1) {
              resetPlayState();
            }
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
          }
        },
        isPlaying,
      };
    }
  }, [playRef, isPlaying, playMode, resetPlayState]);

  // Load all images on mount (both built-in skins)
  useEffect(() => {
    const arrowImages = [
      // Notes
      { name: 'arrow_note_0', src: '/mania-assets/left.png' },
      { name: 'arrow_note_1', src: '/mania-assets/down.png' },
      { name: 'arrow_note_2', src: '/mania-assets/up.png' },
      { name: 'arrow_note_3', src: '/mania-assets/right.png' },
      // Receptors (unpressed)
      { name: 'arrow_receptor_0', src: '/mania-assets/key_left.png' },
      { name: 'arrow_receptor_1', src: '/mania-assets/key_down.png' },
      { name: 'arrow_receptor_2', src: '/mania-assets/key_up.png' },
      { name: 'arrow_receptor_3', src: '/mania-assets/key_right.png' },
      // Receptors (pressed)
      { name: 'arrow_receptor_0_pressed', src: '/mania-assets/key_leftD.png' },
      { name: 'arrow_receptor_1_pressed', src: '/mania-assets/key_downD.png' },
      { name: 'arrow_receptor_2_pressed', src: '/mania-assets/key_upD.png' },
      { name: 'arrow_receptor_3_pressed', src: '/mania-assets/key_rightD.png' },
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
      // Receptors
      { name: 'circle_receptor', src: '/mania-assets/circle/receptor.png' },
      { name: 'circle_receptor_pressed', src: '/mania-assets/circle/receptorD.png' },
      // Holds
      { name: 'circle_holdbody', src: '/mania-assets/circle/holdbody.png' },
      { name: 'circle_holdcap', src: '/mania-assets/circle/holdcap.png' },
    ];

    const pmcImages = [
      // Notes
      { name: 'pmc_note_0', src: '/mania-assets/pmc/Note1.png' },
      { name: 'pmc_note_1', src: '/mania-assets/pmc/Note2.png' },
      { name: 'pmc_note_2', src: '/mania-assets/pmc/Note3.png' },
      { name: 'pmc_note_3', src: '/mania-assets/pmc/Note4.png' },
      // Receptors
      { name: 'pmc_receptor', src: '/mania-assets/pmc/receptor.png' },
      { name: 'pmc_receptor_pressed', src: '/mania-assets/pmc/receptorD.png' },
      // Hold bodies per column (Purple, Yellow, Yellow, Green)
      { name: 'pmc_holdbody_0', src: '/mania-assets/pmc/holdbody0.png' },
      { name: 'pmc_holdbody_1', src: '/mania-assets/pmc/holdbody1.png' },
      { name: 'pmc_holdbody_2', src: '/mania-assets/pmc/holdbody2.png' },
      { name: 'pmc_holdbody_3', src: '/mania-assets/pmc/holdbody3.png' },
      { name: 'pmc_holdcap', src: '/mania-assets/pmc/holdcap.png' },
    ];

    const barsImages = [
      // Notes
      { name: 'bars_note_0', src: '/mania-assets/bars/Note1.png' },
      { name: 'bars_note_1', src: '/mania-assets/bars/Note2.png' },
      { name: 'bars_note_2', src: '/mania-assets/bars/Note3.png' },
      { name: 'bars_note_3', src: '/mania-assets/bars/Note4.png' },
      // Receptors
      { name: 'bars_receptor', src: '/mania-assets/bars/receptor.png' },
      { name: 'bars_receptor_pressed', src: '/mania-assets/bars/receptorD.png' },
      // Hold bodies per column
      { name: 'bars_holdbody_0', src: '/mania-assets/bars/holdbody0.png' },
      { name: 'bars_holdbody_1', src: '/mania-assets/bars/holdbody1.png' },
      { name: 'bars_holdbody_2', src: '/mania-assets/bars/holdbody2.png' },
      { name: 'bars_holdbody_3', src: '/mania-assets/bars/holdbody3.png' },
      { name: 'bars_holdcap', src: '/mania-assets/bars/holdcap.png' },
    ];

    const allImages = [...arrowImages, ...circleImages, ...pmcImages, ...barsImages];

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
      .then(() => {
        setImagesLoaded(true);
        onSkinLoaded?.();
      })
      .catch((err) => console.error('Failed to load mania assets:', err));
  }, [onSkinLoaded]);

  // Load custom skin images when customSkinData or keyCount changes
  useEffect(() => {
    if (!customSkinData) return;

    const loadCustomSkinImages = async () => {
      const customImages = [];

      // Get sprites for current key count, fall back to 4K sprites
      const sprites = customSkinData.spritesByKeyCount?.[keyCount]
        || customSkinData.spritesByKeyCount?.[4]
        || { notes: customSkinData.notes, receptors: customSkinData.receptors, holdBody: customSkinData.holdBody, holdCap: customSkinData.holdCap };

      // Load notes for each column
      const numColumns = sprites.notes?.length || keyCount;
      for (let i = 0; i < numColumns; i++) {
        const src = sprites.notes?.[i];
        if (src) {
          customImages.push({ name: `custom_note_${i}`, src });
        }
      }

      // Load receptors for each column
      const numReceptors = sprites.receptors?.length || keyCount;
      for (let i = 0; i < numReceptors; i++) {
        const src = sprites.receptors?.[i] || sprites.receptors?.[0];
        if (src) {
          customImages.push({ name: `custom_receptor_${i}`, src });
        }
      }

      // Load hold body and cap
      if (sprites.holdBody) {
        customImages.push({ name: 'custom_holdbody', src: sprites.holdBody });
      }
      if (sprites.holdCap) {
        customImages.push({ name: 'custom_holdcap', src: sprites.holdCap });
      }

      const loadPromises = customImages.map(({ name, src }) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            imagesRef.current[name] = img;
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load custom skin image: ${name}`);
            resolve(); // Don't fail the whole load
          };
          img.src = src;
        });
      });

      await Promise.all(loadPromises);
    };

    loadCustomSkinImages();
  }, [customSkinData, keyCount]);

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
      currentTimeRefForStoryboard.current = time; // Update ref for storyboard (no re-render)
      onAudioProgress?.({ currentTime: time, duration, isPlaying, notes: notesData?.notes });
    }
  }, [duration, isPlaying, onAudioProgress, notesData]);

  // Handle audio ended
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onAudioProgress?.({ currentTime, duration, isPlaying: false });

    // Show results in play mode
    if (playMode) {
      setShowResults(true);
      onGameEnd?.({
        score: scoreRef.current,
        maxCombo: maxComboRef.current,
        hitCounts: { ...hitCountsRef.current },
        totalNotes: notesData?.notes?.length || 0,
      });
    }
  }, [currentTime, duration, onAudioProgress, playMode, onGameEnd, notesData]);

  // Calculate accuracy
  const calculateAccuracy = useCallback(() => {
    const counts = hitCountsRef.current;
    const total = counts.MAX + counts[300] + counts[200] + counts[100] + counts[50] + counts.MISS;
    if (total === 0) return 100;

    const weighted = (counts.MAX * 320 + counts[300] * 300 + counts[200] * 200 + counts[100] * 100 + counts[50] * 50) / (total * 320);
    return (weighted * 100).toFixed(2);
  }, []);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imagesLoaded) return;

    const images = imagesRef.current;
    const now = performance.now();

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
      // Update storyboard time ref at 60fps (not just on timeupdate events)
      currentTimeRefForStoryboard.current = currentTimeMs;
    }

    const timingPoints = notesData?.timing_points || [];

    // Calculate current scroll position for SV-aware rendering
    const currentScrollPos = calculateScrollPosition(currentTimeMs, timingPoints);

    // Clear canvas with black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Determine skin type for rendering
    const isCustomSkin = customSkinData && skin !== 'arrow' && skin !== 'circle' && skin !== 'pmc' && skin !== 'bars';
    const skinPrefix = isCustomSkin ? 'custom' : skin;

    // Draw receptors (use pressed image when key is pressed in play mode)
    for (let col = 0; col < keyCount; col++) {
      const isPressed = playMode && pressedKeysRef.current.has(col);
      let receptorImg;

      if (isCustomSkin) {
        const skinCol = col % 4;
        receptorImg = images[`custom_receptor_${skinCol}`] || images['custom_receptor_0'];
      } else if (skin === 'arrow') {
        const skinCol = col % 4;
        // Use pressed image if key is pressed
        if (isPressed) {
          receptorImg = images[`arrow_receptor_${skinCol}_pressed`] || images[`arrow_receptor_${skinCol}`];
        } else {
          receptorImg = images[`arrow_receptor_${skinCol}`];
        }
      } else if (skin === 'pmc') {
        // PWC skin uses same receptor for all columns
        if (isPressed) {
          receptorImg = images['pmc_receptor_pressed'] || images['pmc_receptor'];
        } else {
          receptorImg = images['pmc_receptor'];
        }
      } else if (skin === 'bars') {
        // Bars skin uses same receptor for all columns
        if (isPressed) {
          receptorImg = images['bars_receptor_pressed'] || images['bars_receptor'];
        } else {
          receptorImg = images['bars_receptor'];
        }
      } else {
        // Circle skin
        if (isPressed) {
          receptorImg = images['circle_receptor_pressed'] || images['circle_receptor'];
        } else {
          receptorImg = images['circle_receptor'];
        }
      }

      if (receptorImg) {
        const x = col * COLUMN_WIDTH + (COLUMN_WIDTH - NOTE_SIZE) / 2;

        if (skin === 'arrow' && keyCount === 4) {
          ctx.drawImage(receptorImg, x, RECEPTOR_VISUAL_Y - CANVAS_HEIGHT, NOTE_SIZE, CANVAS_HEIGHT);
        } else {
          const aspectRatio = receptorImg.height / receptorImg.width;
          const receptorHeight = NOTE_SIZE * Math.min(aspectRatio, 8);
          ctx.drawImage(receptorImg, x, RECEPTOR_VISUAL_Y - receptorHeight, NOTE_SIZE, receptorHeight);
        }
      }
    }

    // Visible Y range for culling (with buffer for note height)
    const minVisibleY = -NOTE_HEIGHT;
    const maxVisibleY = CANVAS_HEIGHT + NOTE_HEIGHT;

    // Get notes from data
    const notes = notesData?.notes || [];

    // Draw notes
    for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
      const note = notes[noteIndex];

      // Skip hit notes in play mode
      if (playMode && hitNotesRef.current.has(noteIndex)) continue;

      const { col, time, type, end } = note;

      const x = col * COLUMN_WIDTH + (COLUMN_WIDTH - NOTE_WIDTH) / 2;

      // Calculate SV-aware scroll position for the note
      const noteScrollPos = calculateScrollPosition(time, timingPoints);
      const noteY = RECEPTOR_Y - (noteScrollPos - currentScrollPos) * scrollSpeedMultiplier;

      // For hold notes, also calculate end position
      let endY = noteY;
      if (type === 'hold' && end !== undefined) {
        const endScrollPos = calculateScrollPosition(end, timingPoints);
        endY = RECEPTOR_Y - (endScrollPos - currentScrollPos) * scrollSpeedMultiplier;
      }

      // Skip notes outside visible Y range (SV-aware culling)
      if (type === 'hold') {
        if (noteY < minVisibleY && endY < minVisibleY) continue;
        if (noteY > maxVisibleY && endY > maxVisibleY) continue;
      } else {
        if (noteY < minVisibleY || noteY > maxVisibleY) continue;
      }

      // Get note image based on skin
      const skinCol = col % 4;
      const noteImg = images[`${skinPrefix}_note_${skinCol}`] || (isCustomSkin ? images['arrow_note_0'] : null);
      // PWC and Bars have per-column hold bodies (different colors)
      const holdBodyImg = (skin === 'pmc' || skin === 'bars')
        ? images[`${skinPrefix}_holdbody_${skinCol}`]
        : (images[`${skinPrefix}_holdbody`] || (isCustomSkin ? images['arrow_holdbody'] : null));
      const holdCapImg = images[`${skinPrefix}_holdcap`] || (isCustomSkin ? images['arrow_holdcap'] : null);

      // For custom skins, PWC, and bars, preserve aspect ratio (fit to column width)
      let noteDrawWidth = NOTE_WIDTH;
      let noteDrawHeight = NOTE_HEIGHT;
      if ((isCustomSkin || skin === 'pmc' || skin === 'bars') && noteImg) {
        const aspectRatio = noteImg.height / noteImg.width;
        noteDrawHeight = NOTE_WIDTH * aspectRatio;
      }

      let capDrawHeight = NOTE_HEIGHT / 2;
      if ((isCustomSkin || skin === 'pmc' || skin === 'bars') && holdCapImg) {
        const capAspect = holdCapImg.height / holdCapImg.width;
        capDrawHeight = NOTE_WIDTH * capAspect;
      } else if (skin === 'circle') {
        capDrawHeight = NOTE_WIDTH;
      }

      if (type === 'hold' && end !== undefined) {
        const holdHeight = noteY - endY;
        const capOverlap = (isCustomSkin || skin === 'pmc' || skin === 'bars') ? capDrawHeight * 0.4 : (skin === 'circle' ? 51 : 22);

        // Check if this hold is being held
        const isBeingHeld = playMode && activeHoldsRef.current.has(col) &&
          activeHoldsRef.current.get(col).noteIndex === noteIndex;

        // Draw hold body
        if (holdBodyImg) {
          if (isBeingHeld) {
            // When holding, draw from receptor line to the end cap
            const bodyTop = endY;
            const bodyBottom = RECEPTOR_Y;
            const bodyHeight = bodyBottom - bodyTop;
            if (bodyHeight > 0) {
              ctx.drawImage(holdBodyImg, x, bodyTop, NOTE_WIDTH, bodyHeight);
            }
          } else if (holdHeight > 0) {
            ctx.drawImage(holdBodyImg, x, endY, NOTE_WIDTH, holdHeight);
          }
        }

        // Draw hold cap at end
        if (holdCapImg) {
          ctx.save();
          ctx.translate(x + NOTE_WIDTH / 2, endY + capDrawHeight - capOverlap);
          ctx.scale(1, -1);
          ctx.drawImage(holdCapImg, -NOTE_WIDTH / 2, 0, NOTE_WIDTH, capDrawHeight);
          ctx.restore();
        }

        // Draw note head
        if (noteImg) {
          if (isBeingHeld) {
            // When holding, keep head at receptor
            ctx.drawImage(noteImg, x, RECEPTOR_Y - noteDrawHeight / 2, noteDrawWidth, noteDrawHeight);
          } else {
            ctx.drawImage(noteImg, x, noteY - noteDrawHeight / 2, noteDrawWidth, noteDrawHeight);
          }
        }
      } else {
        // Draw regular note
        if (noteImg) {
          ctx.drawImage(noteImg, x, noteY - noteDrawHeight / 2, noteDrawWidth, noteDrawHeight);
        }
      }
    }

    // Draw play mode UI overlay
    if (playMode) {
      // Calculate current accuracy and rank
      const totalHits = Object.values(hitCountsRef.current).reduce((a, b) => a + b, 0);
      let accuracy = 0;
      if (totalHits > 0) {
        const weighted = (hitCountsRef.current.MAX * 320 + hitCountsRef.current[300] * 300 +
          hitCountsRef.current[200] * 200 + hitCountsRef.current[100] * 100 +
          hitCountsRef.current[50] * 50) / (totalHits * 320);
        accuracy = weighted * 100;
      }
      const rank = accuracy >= 100 ? 'SS' : accuracy >= 95 ? 'S' : accuracy >= 90 ? 'A' :
        accuracy >= 80 ? 'B' : accuracy >= 70 ? 'C' : 'D';

      // Draw song progress pie chart
      const progressRadius = 14;
      const progressX = CANVAS_WIDTH - 200;
      const progressY = 24;
      const audioDuration = audioRef.current?.duration || 0;
      const progress = audioDuration > 0 ? Math.min(1, currentTimeMs / (audioDuration * 1000)) : 0;

      // Background circle (dark)
      ctx.beginPath();
      ctx.arc(progressX, progressY, progressRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Progress pie slice (circular sector)
      const drawProgress = Math.max(0.01, progress); // Always show at least a sliver
      ctx.beginPath();
      ctx.moveTo(progressX, progressY);
      ctx.arc(progressX, progressY, progressRadius - 1, -Math.PI / 2, -Math.PI / 2 + drawProgress * Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = '#0fc';
      ctx.fill();

      // Draw percentage and rank next to pie
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Poppins, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${accuracy.toFixed(1)}%`, progressX + progressRadius + 8, progressY + 5);

      // Draw rank
      ctx.font = 'bold 18px Poppins, sans-serif';
      ctx.fillStyle = rank === 'SS' || rank === 'S' ? '#ffd700' : rank === 'A' ? '#0f0' :
        rank === 'B' ? '#00bfff' : rank === 'C' ? '#ff69b4' : '#f44';
      ctx.fillText(rank, progressX + progressRadius + 60, progressY + 5);

      // Draw score
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Poppins, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(scoreRef.current.toLocaleString(), CANVAS_WIDTH - 10, 30);

      // Draw hit error bar (Etterna-style timing bar)
      const errorBarY = CANVAS_HEIGHT / 2 - 100;
      const errorBarWidth = 200;
      const errorBarHeight = 8;
      const errorBarX = (CANVAS_WIDTH - errorBarWidth) / 2;
      const maxError = TIMING_WINDOWS.MISS; // ±150ms range

      // Draw background bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(errorBarX, errorBarY, errorBarWidth, errorBarHeight);

      // Draw timing zone colors
      const zones = [
        { window: TIMING_WINDOWS.MAX, color: 'rgba(0, 255, 255, 0.3)' },
        { window: TIMING_WINDOWS[300], color: 'rgba(255, 255, 0, 0.2)' },
        { window: TIMING_WINDOWS[200], color: 'rgba(0, 255, 0, 0.15)' },
      ];
      for (const zone of zones) {
        const zoneWidth = (zone.window / maxError) * (errorBarWidth / 2);
        ctx.fillStyle = zone.color;
        ctx.fillRect(errorBarX + errorBarWidth / 2 - zoneWidth, errorBarY, zoneWidth * 2, errorBarHeight);
      }

      // Draw center line (perfect timing)
      ctx.fillStyle = '#fff';
      ctx.fillRect(errorBarX + errorBarWidth / 2 - 1, errorBarY - 2, 2, errorBarHeight + 4);

      // Draw hit error ticks
      for (const error of hitErrorsRef.current) {
        if (error.displayUntil > now) {
          const opacity = Math.min(1, (error.displayUntil - now) / 1000);
          const xPos = errorBarX + errorBarWidth / 2 - (error.timeDiff / maxError) * (errorBarWidth / 2);
          ctx.globalAlpha = opacity;
          ctx.fillStyle = JUDGEMENT_COLORS[error.judgement];
          ctx.fillRect(xPos - 1, errorBarY - 4, 2, errorBarHeight + 8);
        }
      }
      ctx.globalAlpha = 1;

      // Draw latest judgement (centered) with bounce effect
      const latestJudgement = judgements.filter(j => j.displayUntil > now).pop();
      if (latestJudgement) {
        const timeLeft = latestJudgement.displayUntil - now;
        const age = 500 - timeLeft; // How long since judgement appeared (500ms total duration)
        const opacity = Math.min(1, timeLeft / 300);

        // Bounce: scale up quickly then settle back to 1
        // Peak at ~50ms, then ease back down
        let scale = 1;
        if (age < 50) {
          scale = 1 + (age / 50) * 0.4; // Scale up to 1.4
        } else if (age < 150) {
          scale = 1.4 - ((age - 50) / 100) * 0.4; // Scale back to 1
        }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = JUDGEMENT_COLORS[latestJudgement.type];
        ctx.font = 'bold 24px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.scale(scale, scale);
        ctx.fillText(latestJudgement.type, 0, 0);
        ctx.restore();
      }

    }

    // Draw draggable hit position line when in edit mode
    if (hitPositionEditMode) {
      // Draw the hit line
      ctx.strokeStyle = isDraggingHitLine ? '#ff0844' : '#00ff00';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(0, RECEPTOR_VISUAL_Y);
      ctx.lineTo(CANVAS_WIDTH, RECEPTOR_VISUAL_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw handle indicator
      ctx.fillStyle = isDraggingHitLine ? '#ff0844' : '#00ff00';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, RECEPTOR_VISUAL_Y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#fff';
      ctx.font = '14px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Hit Position: ${hitPosition}px`, CANVAS_WIDTH / 2, RECEPTOR_VISUAL_Y - 20);
    }

    // Draw key press visualization on KPS canvas
    const kpsCanvas = kpsCanvasRef.current;
    if (kpsCanvas && playMode) {
      const kpsCtx = kpsCanvas.getContext('2d');
      const kpsWidth = kpsCanvas.width;
      const kpsHeight = kpsCanvas.height;
      const kpsBarWidth = 55;
      const kpsGap = 15;
      const kpsBaseY = kpsHeight - 60;
      const kpsMaxHeight = kpsHeight - 100;
      const msPerPixel = 1.2; // 1.2ms per pixel (same for height and scroll)

      // Clear canvas
      kpsCtx.clearRect(0, 0, kpsWidth, kpsHeight);

      // Draw background
      kpsCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      kpsCtx.fillRect(0, 0, kpsWidth, kpsHeight);

      // Draw key labels at bottom with highlight when pressed
      const keyLabels = keyCount === 4 ? ['D', 'F', 'J', 'K'] :
        keyCount === 7 ? ['S', 'D', 'F', '␣', 'J', 'K', 'L'] :
        Array.from({ length: keyCount }, (_, i) => (i + 1).toString());
      for (let col = 0; col < keyCount; col++) {
        const x = 20 + col * (kpsBarWidth + kpsGap);
        const centerX = x + kpsBarWidth / 2;
        const isPressed = keyPressTimesRef.current.has(col);

        // Draw key background (lights up when pressed)
        if (isPressed) {
          // Glowing background when pressed
          kpsCtx.fillStyle = '#0fc';
          kpsCtx.shadowColor = '#0fc';
          kpsCtx.shadowBlur = 15;
          kpsCtx.fillRect(x, kpsBaseY + 5, kpsBarWidth, 50);
          kpsCtx.shadowBlur = 0;
          kpsCtx.fillStyle = '#000';
        } else {
          // Dim background when not pressed
          kpsCtx.fillStyle = 'rgba(50, 50, 50, 0.8)';
          kpsCtx.fillRect(x, kpsBaseY + 5, kpsBarWidth, 50);
          kpsCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        }

        // Draw key label
        kpsCtx.font = 'bold 20px Poppins, sans-serif';
        kpsCtx.textAlign = 'center';
        kpsCtx.fillText(keyLabels[col] || (col + 1).toString(), centerX, kpsBaseY + 38);
      }

      // Clean up old history (2 seconds)
      const cutoff = now - 2000;
      keyPressHistoryRef.current = keyPressHistoryRef.current.filter(h => h.endTime > cutoff);

      // Draw historical key presses (bars that scroll up after release)
      for (const press of keyPressHistoryRef.current) {
        const col = press.col;
        const x = 20 + col * (kpsBarWidth + kpsGap);
        const duration = press.endTime - press.startTime;
        const isTap = duration < 100; // Taps are short presses
        // Taps get half the height (thinner bars)
        const barHeight = isTap
          ? Math.max(3, Math.min(kpsMaxHeight, duration / msPerPixel / 2))
          : Math.max(6, Math.min(kpsMaxHeight, duration / msPerPixel));
        const timeSinceEnd = now - press.endTime;
        const scrollY = timeSinceEnd / msPerPixel;

        // Bar position (bottom edge scrolls up from kpsBaseY)
        const barBottom = kpsBaseY - scrollY;
        const barTop = barBottom - barHeight;

        // Only draw if any part is visible
        if (barBottom > 0 && barTop < kpsBaseY) {
          const alpha = Math.max(0.1, 1 - timeSinceEnd / 2000);
          kpsCtx.fillStyle = `rgba(0, 200, 180, ${alpha * 0.8})`;
          const drawTop = Math.max(0, barTop);
          const drawHeight = barBottom - drawTop;
          if (drawHeight > 0) {
            kpsCtx.fillRect(x, drawTop, kpsBarWidth, drawHeight);
          }
        }
      }

      // Draw currently held keys (bars anchored at bottom, growing up)
      for (let col = 0; col < keyCount; col++) {
        const startTime = keyPressTimesRef.current.get(col);
        if (startTime) {
          const duration = now - startTime;
          const barHeight = Math.min(kpsMaxHeight, duration / msPerPixel);
          const x = 20 + col * (kpsBarWidth + kpsGap);

          // Bright bar anchored at bottom
          kpsCtx.fillStyle = '#0fc';
          kpsCtx.fillRect(x, kpsBaseY - barHeight, kpsBarWidth, barHeight);
        }
      }
    }

    // Continue animation loop using ref to avoid stale closure
    animationRef.current = requestAnimationFrame(() => renderRef.current?.());
  }, [imagesLoaded, notesData, scrollSpeedMultiplier, skin, customSkinData, keyCount, playMode, judgements, customKeyBindings, CANVAS_WIDTH, CANVAS_HEIGHT, COLUMN_WIDTH, RECEPTOR_Y, RECEPTOR_VISUAL_Y, NOTE_HEIGHT, NOTE_WIDTH, hitPositionEditMode, isDraggingHitLine, hitPosition]);

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

  // Close results screen (just dismiss)
  const closeResults = useCallback(() => {
    setShowResults(false);
    resetPlayState();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [resetPlayState]);

  // Retry - restart the song and enter play mode
  const retryPlay = useCallback(() => {
    setShowResults(false);
    resetPlayState();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
    onPlayModeChange?.(true);
  }, [resetPlayState, onPlayModeChange]);

  return (
    <div className="mania-preview">
      {/* Background image with configurable opacity */}
      {/* Hide background when storyboard is present */}
      {notesData?.background_url_full && !storyboard?.sprites?.length && (
        <div
          className="mania-preview-background"
          style={{
            backgroundImage: `url(${notesData.background_url_full})`,
            opacity: bgOpacity,
          }}
        />
      )}
      <div className="mania-preview-canvas-container">
        {/* Storyboard layer - behind playfield */}
        {storyboard && storyboardBaseUrl && (
          <StoryboardRenderer
            storyboard={storyboard}
            storyboardBaseUrl={storyboardBaseUrl}
            currentTimeRef={currentTimeRefForStoryboard}
            width={window.innerWidth}
            height={window.innerHeight}
            onProgress={onStoryboardProgress}
            hitTimes={notesData?.notes?.map(n => n.time) || []}
          />
        )}
        <div className="mania-playfield-wrapper" style={{ visibility: hidePlayfield ? 'hidden' : 'visible' }}>
          {/* Real-time stats panel - left side of playfield */}
          {playMode && (
            <div className="mania-stats-panel">
              <button
                className={`auto-toggle-btn ${autoMode ? 'active' : ''}`}
                onClick={() => onAutoModeChange?.(!autoMode)}
              >
                AUTO {autoMode ? 'ON' : 'OFF'}
              </button>
              <div className="stats-combo">
                <span className="stats-combo-value">{combo}x</span>
              </div>
              <div className="stats-judgements">
                <div className={`stats-row stats-300g ${bouncingJudgement === 'MAX' ? 'bounce' : ''}`}>
                  <span className="stats-label">MAX</span>
                  <span className="stats-value">{hitCounts.MAX}</span>
                </div>
                <div className={`stats-row stats-300 ${bouncingJudgement === '300' ? 'bounce' : ''}`}>
                  <span className="stats-label">300</span>
                  <span className="stats-value">{hitCounts[300]}</span>
                </div>
                <div className={`stats-row stats-200 ${bouncingJudgement === '200' ? 'bounce' : ''}`}>
                  <span className="stats-label">200</span>
                  <span className="stats-value">{hitCounts[200]}</span>
                </div>
                <div className={`stats-row stats-100 ${bouncingJudgement === '100' ? 'bounce' : ''}`}>
                  <span className="stats-label">100</span>
                  <span className="stats-value">{hitCounts[100]}</span>
                </div>
                <div className={`stats-row stats-50 ${bouncingJudgement === '50' ? 'bounce' : ''}`}>
                  <span className="stats-label">50</span>
                  <span className="stats-value">{hitCounts[50]}</span>
                </div>
                <div className={`stats-row stats-miss ${bouncingJudgement === 'MISS' ? 'bounce' : ''}`}>
                  <span className="stats-label">MISS</span>
                  <span className="stats-value">{hitCounts.MISS}</span>
                </div>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={`mania-preview-canvas ${isDraggingHitLine ? 'dragging-hit-line' : ''}`}
            style={{ cursor: hitPositionEditMode ? 'ns-resize' : 'default' }}
          />

          {/* Key press visualization panel - right side */}
          {playMode && (
            <canvas
              ref={kpsCanvasRef}
              width={keyCount * 70 + 40}
              height={1000}
              className="mania-kps-canvas"
            />
          )}
        </div>
        {!imagesLoaded && (
          <div className="mania-preview-loading">
            Loading assets...
          </div>
        )}

        {/* Results Screen Overlay - osu! style ranking */}
        {showResults && (
          <div
            className="mania-results-overlay"
            style={notesData?.background_url_full ? {
              backgroundImage: `url(${notesData.background_url_full})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : {}}
          >
            <div className="mania-results-header">
              <div className="results-header-left">
                <span className="results-map-title">
                  {notesData?.metadata?.artist} - {notesData?.metadata?.title} [{notesData?.metadata?.version}]
                </span>
                <span className="results-mapper">
                  Beatmap by {notesData?.metadata?.creator || 'Unknown'}
                </span>
                <span className="results-played-by">
                  Played by {username || 'Guest'} on {new Date().toLocaleString()}
                </span>
              </div>
              <span className="results-title">Ranking</span>
            </div>
            <div className="mania-results-main">
              <div className="mania-results-left">
                <div className="results-score-box">
                  <span className="results-score-label">Score</span>
                  <span className="results-score-value">{scoreRef.current.toString().padStart(8, '0')}</span>
                </div>
                <div className="results-judgements-box">
                  <div className="judgement-row">
                    <span className="judgement-label j-300">300</span>
                    <span className="judgement-count">{hitCountsRef.current.MAX + hitCountsRef.current[300]}x</span>
                    <span className="judgement-label j-300g">300</span>
                    <span className="judgement-count">{hitCountsRef.current.MAX}x</span>
                  </div>
                  <div className="judgement-row">
                    <span className="judgement-label j-200">200</span>
                    <span className="judgement-count">{hitCountsRef.current[200]}x</span>
                    <span className="judgement-label j-100">100</span>
                    <span className="judgement-count">{hitCountsRef.current[100]}x</span>
                  </div>
                  <div className="judgement-row">
                    <span className="judgement-label j-50">50</span>
                    <span className="judgement-count">{hitCountsRef.current[50]}x</span>
                    <span className="judgement-label j-miss">miss!</span>
                    <span className="judgement-count">{hitCountsRef.current.MISS}x</span>
                  </div>
                  <div className="results-stats-row">
                    <div className="results-stat">
                      <span className="stat-label">Combo</span>
                      <span className="stat-value">{maxComboRef.current}x</span>
                    </div>
                    <div className="results-stat">
                      <span className="stat-label">Accuracy</span>
                      <span className="stat-value">{calculateAccuracy()}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mania-results-right">
                <div className="results-grade">{(() => {
                  const acc = parseFloat(calculateAccuracy());
                  if (acc >= 100) return 'SS';
                  if (acc >= 95) return 'S';
                  if (acc >= 90) return 'A';
                  if (acc >= 80) return 'B';
                  if (acc >= 70) return 'C';
                  return 'D';
                })()}</div>
                <div className="results-buttons">
                  <button className="results-btn retry-btn" onClick={retryPlay}>
                    Reintentar
                  </button>
                  {onBackToMappools && (
                    <button className="results-btn back-btn" onClick={onBackToMappools}>
                      Volver a Mappools
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={audioBlobUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="auto"
      />

    </div>
  );
}
