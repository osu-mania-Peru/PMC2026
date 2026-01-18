import { useRef, useEffect, useState, useCallback } from 'react';

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
const EASINGS = {
  0: t => t,                                              // Linear
  1: t => t * t,                                          // EasingOut (Quad)
  2: t => t * (2 - t),                                    // EasingIn (Quad)
  3: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,    // QuadInOut
  4: t => t * t * t,                                      // CubicIn
  5: t => 1 - Math.pow(1 - t, 3),                         // CubicOut
  6: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, // CubicInOut
  7: t => t * t * t * t,                                  // QuartIn
  8: t => 1 - Math.pow(1 - t, 4),                         // QuartOut
  9: t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2, // QuartInOut
  10: t => t * t * t * t * t,                             // QuintIn
  11: t => 1 - Math.pow(1 - t, 5),                        // QuintOut
  12: t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2, // QuintInOut
  13: t => 1 - Math.cos(t * Math.PI / 2),                 // SineIn
  14: t => Math.sin(t * Math.PI / 2),                     // SineOut
  15: t => -(Math.cos(Math.PI * t) - 1) / 2,              // SineInOut
  16: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),       // ExpoIn
  17: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),        // ExpoOut
  18: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2, // ExpoInOut
  19: t => 1 - Math.sqrt(1 - t * t),                      // CircIn
  20: t => Math.sqrt(1 - Math.pow(t - 1, 2)),             // CircOut
  21: t => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2, // CircInOut
};

function getEasing(easingType) {
  return EASINGS[easingType] || EASINGS[0];
}

function interpolate(start, end, progress, easing = 0) {
  const t = getEasing(easing)(Math.max(0, Math.min(1, progress)));
  return start + (end - start) * t;
}

/**
 * Calculate the current state of a sprite based on commands at a given time.
 */
function calculateSpriteState(sprite, commands, currentTime) {
  // Default state
  const state = {
    visible: false,
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
    // Animation frame
    frameIndex: 0,
  };

  // Filter commands for this sprite
  const spriteCommands = commands.filter(cmd => cmd.sprite_id === sprite.id);

  // Process each command
  for (const cmd of spriteCommands) {
    // Handle loops
    if (cmd.type === 'L' && cmd.sub_commands && cmd.loop_count) {
      const loopDuration = calculateLoopDuration(cmd.sub_commands);
      const loopCount = cmd.loop_count;

      // Calculate which iteration we're in
      const timeSinceStart = currentTime - cmd.start_time;
      if (timeSinceStart >= 0) {
        const totalLoopTime = loopDuration * loopCount;
        const loopIteration = Math.floor(timeSinceStart / loopDuration);

        if (loopIteration < loopCount || timeSinceStart <= totalLoopTime) {
          // Apply sub-commands with adjusted time
          for (const subCmd of cmd.sub_commands) {
            applyCommand(state, {
              ...subCmd,
              start_time: cmd.start_time + subCmd.start_time + (loopIteration * loopDuration),
              end_time: cmd.start_time + subCmd.end_time + (loopIteration * loopDuration),
            }, currentTime + (loopIteration * loopDuration));
          }
        }
      }
    } else {
      applyCommand(state, cmd, currentTime);
    }
  }

  // Calculate animation frame for animated sprites
  if (sprite.type === 'animation' && sprite.frame_count && sprite.frame_delay) {
    const frameIndex = Math.floor(currentTime / sprite.frame_delay) % sprite.frame_count;
    state.frameIndex = sprite.loop_type === 'LoopOnce'
      ? Math.min(frameIndex, sprite.frame_count - 1)
      : frameIndex;
  }

  // Sprite is visible if it has any opacity
  state.visible = state.alpha > 0;

  return state;
}

function calculateLoopDuration(subCommands) {
  let maxEnd = 0;
  for (const cmd of subCommands) {
    maxEnd = Math.max(maxEnd, cmd.end_time);
  }
  return maxEnd;
}

function applyCommand(state, cmd, currentTime) {
  const { type, easing, start_time, end_time, params } = cmd;

  // Before command starts, use start value
  // During command, interpolate
  // After command ends, use end value

  let progress;
  if (currentTime < start_time) {
    progress = 0;
  } else if (currentTime >= end_time) {
    progress = 1;
  } else {
    progress = (currentTime - start_time) / (end_time - start_time);
  }

  switch (type) {
    case 'F': // Fade
      if (params.length >= 1) {
        const startAlpha = params[0];
        const endAlpha = params.length >= 2 ? params[1] : startAlpha;
        if (currentTime >= start_time) {
          state.alpha = interpolate(startAlpha, endAlpha, progress, easing);
        }
      }
      break;

    case 'M': // Move
      if (params.length >= 2) {
        const startX = params[0];
        const startY = params[1];
        const endX = params.length >= 4 ? params[2] : startX;
        const endY = params.length >= 4 ? params[3] : startY;
        if (currentTime >= start_time) {
          state.x = interpolate(startX, endX, progress, easing);
          state.y = interpolate(startY, endY, progress, easing);
        }
      }
      break;

    case 'MX': // Move X
      if (params.length >= 1) {
        const startX = params[0];
        const endX = params.length >= 2 ? params[1] : startX;
        if (currentTime >= start_time) {
          state.x = interpolate(startX, endX, progress, easing);
        }
      }
      break;

    case 'MY': // Move Y
      if (params.length >= 1) {
        const startY = params[0];
        const endY = params.length >= 2 ? params[1] : startY;
        if (currentTime >= start_time) {
          state.y = interpolate(startY, endY, progress, easing);
        }
      }
      break;

    case 'S': // Scale
      if (params.length >= 1) {
        const startScale = params[0];
        const endScale = params.length >= 2 ? params[1] : startScale;
        if (currentTime >= start_time) {
          const scale = interpolate(startScale, endScale, progress, easing);
          state.scaleX = scale;
          state.scaleY = scale;
        }
      }
      break;

    case 'V': // Vector scale
      if (params.length >= 2) {
        const startScaleX = params[0];
        const startScaleY = params[1];
        const endScaleX = params.length >= 4 ? params[2] : startScaleX;
        const endScaleY = params.length >= 4 ? params[3] : startScaleY;
        if (currentTime >= start_time) {
          state.scaleX = interpolate(startScaleX, endScaleX, progress, easing);
          state.scaleY = interpolate(startScaleY, endScaleY, progress, easing);
        }
      }
      break;

    case 'R': // Rotate
      if (params.length >= 1) {
        const startRotation = params[0];
        const endRotation = params.length >= 2 ? params[1] : startRotation;
        if (currentTime >= start_time) {
          state.rotation = interpolate(startRotation, endRotation, progress, easing);
        }
      }
      break;

    case 'C': // Color
      if (params.length >= 3) {
        const startR = params[0];
        const startG = params[1];
        const startB = params[2];
        const endR = params.length >= 6 ? params[3] : startR;
        const endG = params.length >= 6 ? params[4] : startG;
        const endB = params.length >= 6 ? params[5] : startB;
        if (currentTime >= start_time) {
          state.r = interpolate(startR, endR, progress, easing);
          state.g = interpolate(startG, endG, progress, easing);
          state.b = interpolate(startB, endB, progress, easing);
        }
      }
      break;

    case 'P': // Parameter
      if (params.length >= 1) {
        const param = params[0];
        if (currentTime >= start_time && currentTime <= end_time) {
          if (param === 'H') state.flipH = true;
          if (param === 'V') state.flipV = true;
          if (param === 'A') state.additive = true;
        }
      }
      break;
  }
}

/**
 * StoryboardRenderer component
 * Renders osu! storyboard elements on a canvas
 */
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

  // Preload all storyboard images
  useEffect(() => {
    if (!storyboard || !storyboard.images || storyboard.images.length === 0) {
      setImagesLoaded(true);
      return;
    }

    const loadedImages = {};
    let loadedCount = 0;
    const totalImages = storyboard.images.length;

    storyboard.images.forEach(imagePath => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImages[imagePath] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          setImages(loadedImages);
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load storyboard image:', imagePath);
        loadedCount++;
        if (loadedCount === totalImages) {
          setImages(loadedImages);
          setImagesLoaded(true);
        }
      };
      img.src = `${storyboardBaseUrl}${imagePath}`;
    });

    return () => {
      // Cleanup
      setImages({});
      setImagesLoaded(false);
    };
  }, [storyboard, storyboardBaseUrl]);

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !storyboard || !imagesLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale factor from osu! coordinates to canvas
    const scaleX = canvas.width / OSU_WIDTH;
    const scaleY = canvas.height / OSU_HEIGHT;

    // Sort sprites by layer (Background=0, Fail=1, Pass=2, Foreground=3)
    // We only render Background and Foreground layers (skip Fail/Pass for now)
    const sortedSprites = [...storyboard.sprites]
      .filter(sprite => sprite.layer === 0 || sprite.layer === 3)
      .sort((a, b) => a.layer - b.layer || a.id - b.id);

    // Render each sprite
    for (const sprite of sortedSprites) {
      const state = calculateSpriteState(sprite, storyboard.commands, currentTime);

      if (!state.visible) continue;

      // Get image
      let img;
      if (sprite.type === 'animation' && sprite.frame_count) {
        // For animations, construct frame filename
        const basePath = sprite.filepath.replace(/\d*\.\w+$/, '');
        const ext = sprite.filepath.split('.').pop();
        const framePath = `${basePath}${state.frameIndex}.${ext}`;
        img = images[framePath] || images[sprite.filepath];
      } else {
        img = images[sprite.filepath];
      }

      if (!img) continue;

      // Calculate origin offset
      const origin = ORIGINS[sprite.origin] || ORIGINS[1];
      const originX = img.width * origin.x;
      const originY = img.height * origin.y;

      // Apply transformations
      ctx.save();

      // Move to sprite position (in osu! coordinates, scaled to canvas)
      ctx.translate(state.x * scaleX, state.y * scaleY);

      // Apply rotation
      if (state.rotation !== 0) {
        ctx.rotate(state.rotation);
      }

      // Apply scale
      ctx.scale(state.scaleX * scaleX, state.scaleY * scaleY);

      // Apply flip
      if (state.flipH) ctx.scale(-1, 1);
      if (state.flipV) ctx.scale(1, -1);

      // Set alpha
      ctx.globalAlpha = state.alpha;

      // Set blend mode for additive
      if (state.additive) {
        ctx.globalCompositeOperation = 'lighter';
      }

      // Apply color tint if not white
      // (This is a simplified approach - full color tinting would need a temporary canvas)

      // Draw image centered on origin
      ctx.drawImage(img, -originX, -originY);

      ctx.restore();
    }
  }, [storyboard, currentTime, images, imagesLoaded]);

  // Render on currentTime change
  useEffect(() => {
    render();
  }, [render]);

  if (!storyboard || !storyboard.sprites || storyboard.sprites.length === 0) {
    return null;
  }

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
