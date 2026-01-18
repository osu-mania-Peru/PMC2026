import { useRef, useEffect, useState, useMemo } from 'react';

// osu! storyboard coordinate system: 640x480, origin at top-left
const OSU_WIDTH = 640;
const OSU_HEIGHT = 480;

// Origin anchor points for sprites
const ORIGINS = {
  0: { x: 0, y: 0 },       // TopLeft
  1: { x: 0.5, y: 0.5 },   // Centre
  2: { x: 0, y: 0.5 },     // CentreLeft
  3: { x: 1, y: 0 },       // TopRight
  4: { x: 0.5, y: 1 },     // BottomCentre
  5: { x: 0.5, y: 0 },     // TopCentre
  6: { x: 0.5, y: 0.5 },   // Custom (default to centre)
  7: { x: 1, y: 0.5 },     // CentreRight
  8: { x: 0, y: 1 },       // BottomLeft
  9: { x: 1, y: 1 },       // BottomRight
};

// Easing functions based on osu! storyboard spec
const EASINGS = [
  t => t,                                              // 0: Linear
  t => t * t,                                          // 1: EasingOut (Quad)
  t => t * (2 - t),                                    // 2: EasingIn (Quad)
  t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,    // 3: QuadInOut
  t => t * t * t,                                      // 4: CubicIn
  t => 1 - Math.pow(1 - t, 3),                         // 5: CubicOut
  t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, // 6: CubicInOut
  t => t * t * t * t,                                  // 7: QuartIn
  t => 1 - Math.pow(1 - t, 4),                         // 8: QuartOut
  t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2, // 9: QuartInOut
  t => t * t * t * t * t,                             // 10: QuintIn
  t => 1 - Math.pow(1 - t, 5),                        // 11: QuintOut
  t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2, // 12: QuintInOut
  t => 1 - Math.cos(t * Math.PI / 2),                 // 13: SineIn
  t => Math.sin(t * Math.PI / 2),                     // 14: SineOut
  t => -(Math.cos(Math.PI * t) - 1) / 2,              // 15: SineInOut
  t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),       // 16: ExpoIn
  t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),        // 17: ExpoOut
  t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2, // 18: ExpoInOut
  t => 1 - Math.sqrt(1 - t * t),                      // 19: CircIn
  t => Math.sqrt(1 - Math.pow(t - 1, 2)),             // 20: CircOut
  t => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2, // 21: CircInOut
];

function interpolate(start, end, progress, easing = 0) {
  const easingFn = EASINGS[easing] || EASINGS[0];
  const t = easingFn(progress < 0 ? 0 : progress > 1 ? 1 : progress);
  return start + (end - start) * t;
}

function applyCommand(state, cmd, currentTime) {
  const { type, easing, start_time, end_time, params } = cmd;

  if (currentTime < start_time) return;

  const duration = end_time - start_time;
  const progress = duration > 0 ? (currentTime - start_time) / duration : 1;
  const clampedProgress = progress > 1 ? 1 : progress;

  switch (type) {
    case 'F': { // Fade
      const startAlpha = params[0];
      const endAlpha = params[1] ?? startAlpha;
      state.alpha = interpolate(startAlpha, endAlpha, clampedProgress, easing);
      break;
    }
    case 'M': { // Move
      const startX = params[0], startY = params[1];
      const endX = params[2] ?? startX, endY = params[3] ?? startY;
      state.x = interpolate(startX, endX, clampedProgress, easing);
      state.y = interpolate(startY, endY, clampedProgress, easing);
      break;
    }
    case 'MX': { // Move X
      const startX = params[0], endX = params[1] ?? startX;
      state.x = interpolate(startX, endX, clampedProgress, easing);
      break;
    }
    case 'MY': { // Move Y
      const startY = params[0], endY = params[1] ?? startY;
      state.y = interpolate(startY, endY, clampedProgress, easing);
      break;
    }
    case 'S': { // Scale
      const startScale = params[0], endScale = params[1] ?? startScale;
      const scale = interpolate(startScale, endScale, clampedProgress, easing);
      state.scaleX = scale;
      state.scaleY = scale;
      break;
    }
    case 'V': { // Vector scale
      const startScaleX = params[0], startScaleY = params[1];
      const endScaleX = params[2] ?? startScaleX, endScaleY = params[3] ?? startScaleY;
      state.scaleX = interpolate(startScaleX, endScaleX, clampedProgress, easing);
      state.scaleY = interpolate(startScaleY, endScaleY, clampedProgress, easing);
      break;
    }
    case 'R': { // Rotate
      const startRotation = params[0], endRotation = params[1] ?? startRotation;
      state.rotation = interpolate(startRotation, endRotation, clampedProgress, easing);
      break;
    }
    case 'C': { // Color
      const startR = params[0], startG = params[1], startB = params[2];
      const endR = params[3] ?? startR, endG = params[4] ?? startG, endB = params[5] ?? startB;
      state.r = interpolate(startR, endR, clampedProgress, easing);
      state.g = interpolate(startG, endG, clampedProgress, easing);
      state.b = interpolate(startB, endB, clampedProgress, easing);
      break;
    }
    case 'P': { // Parameter
      if (currentTime <= end_time) {
        const param = params[0];
        if (param === 'H') state.flipH = true;
        else if (param === 'V') state.flipV = true;
        else if (param === 'A') state.additive = true;
      }
      break;
    }
  }
}

function calculateSpriteState(sprite, spriteCommands, currentTime) {
  const state = {
    x: sprite.x,
    y: sprite.y,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    alpha: 0,
    r: 255,
    g: 255,
    b: 255,
    flipH: false,
    flipV: false,
    additive: false,
    frameIndex: 0,
  };

  // Process commands (already filtered for this sprite)
  for (let i = 0; i < spriteCommands.length; i++) {
    const cmd = spriteCommands[i];

    if (cmd.type === 'L' && cmd.sub_commands && cmd.loop_count) {
      // Handle loops
      let maxEnd = 0;
      for (let j = 0; j < cmd.sub_commands.length; j++) {
        if (cmd.sub_commands[j].end_time > maxEnd) maxEnd = cmd.sub_commands[j].end_time;
      }
      const loopDuration = maxEnd;
      const timeSinceStart = currentTime - cmd.start_time;

      if (timeSinceStart >= 0 && loopDuration > 0) {
        const loopIteration = Math.floor(timeSinceStart / loopDuration);
        if (loopIteration < cmd.loop_count) {
          const timeInLoop = timeSinceStart % loopDuration;
          for (let j = 0; j < cmd.sub_commands.length; j++) {
            const subCmd = cmd.sub_commands[j];
            applyCommand(state, subCmd, timeInLoop);
          }
        }
      }
    } else {
      applyCommand(state, cmd, currentTime);
    }
  }

  // Animation frame
  if (sprite.type === 'animation' && sprite.frame_count && sprite.frame_delay) {
    const frameIndex = Math.floor(currentTime / sprite.frame_delay) % sprite.frame_count;
    state.frameIndex = sprite.loop_type === 'LoopOnce'
      ? Math.min(frameIndex, sprite.frame_count - 1)
      : frameIndex;
  }

  return state;
}

export default function StoryboardRenderer({
  storyboard,
  storyboardBaseUrl,
  currentTime = 0,
  width = 640,
  height = 480,
}) {
  const canvasRef = useRef(null);
  const [images, setImages] = useState({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Pre-process: group commands by sprite ID (only once when storyboard changes)
  const { sortedSprites, commandsBySprite } = useMemo(() => {
    if (!storyboard?.sprites || !storyboard?.commands) {
      return { sortedSprites: [], commandsBySprite: new Map() };
    }

    // Group commands by sprite_id
    const cmdMap = new Map();
    for (let i = 0; i < storyboard.commands.length; i++) {
      const cmd = storyboard.commands[i];
      if (!cmdMap.has(cmd.sprite_id)) {
        cmdMap.set(cmd.sprite_id, []);
      }
      cmdMap.get(cmd.sprite_id).push(cmd);
    }

    // Sort and filter sprites once
    const sorted = storyboard.sprites
      .filter(s => s.layer === 0 || s.layer === 3)
      .sort((a, b) => a.layer - b.layer || a.id - b.id);

    return { sortedSprites: sorted, commandsBySprite: cmdMap };
  }, [storyboard]);

  // Preload images
  useEffect(() => {
    if (!storyboard?.images || storyboard.images.length === 0) {
      setImagesLoaded(true);
      return;
    }

    const loadedImages = {};
    let loadedCount = 0;
    const total = storyboard.images.length;

    storyboard.images.forEach(path => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = img.onerror = () => {
        if (img.complete && img.naturalWidth) loadedImages[path] = img;
        if (++loadedCount === total) {
          setImages(loadedImages);
          setImagesLoaded(true);
        }
      };
      img.src = `${storyboardBaseUrl}${path}`;
    });

    return () => {
      setImages({});
      setImagesLoaded(false);
    };
  }, [storyboard, storyboardBaseUrl]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesLoaded || sortedSprites.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / OSU_WIDTH;
    const scaleY = canvas.height / OSU_HEIGHT;

    for (let i = 0; i < sortedSprites.length; i++) {
      const sprite = sortedSprites[i];
      const cmds = commandsBySprite.get(sprite.id) || [];
      const state = calculateSpriteState(sprite, cmds, currentTime);

      if (state.alpha <= 0) continue;

      let img;
      if (sprite.type === 'animation' && sprite.frame_count) {
        const basePath = sprite.filepath.replace(/\d*\.\w+$/, '');
        const ext = sprite.filepath.split('.').pop();
        img = images[`${basePath}${state.frameIndex}.${ext}`] || images[sprite.filepath];
      } else {
        img = images[sprite.filepath];
      }

      if (!img) continue;

      const origin = ORIGINS[sprite.origin] || ORIGINS[1];
      const originX = img.width * origin.x;
      const originY = img.height * origin.y;

      ctx.save();
      ctx.translate(state.x * scaleX, state.y * scaleY);
      if (state.rotation !== 0) ctx.rotate(state.rotation);
      ctx.scale(state.scaleX * scaleX, state.scaleY * scaleY);
      if (state.flipH) ctx.scale(-1, 1);
      if (state.flipV) ctx.scale(1, -1);
      ctx.globalAlpha = state.alpha;
      if (state.additive) ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(img, -originX, -originY);
      ctx.restore();
    }
  }, [currentTime, images, imagesLoaded, sortedSprites, commandsBySprite]);

  if (!storyboard?.sprites?.length) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="storyboard-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
