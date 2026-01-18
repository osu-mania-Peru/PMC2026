import { useRef, useEffect, useState, useMemo, memo } from 'react';

const OSU_WIDTH_4_3 = 640;
const OSU_WIDTH_16_9 = 854;
const OSU_HEIGHT = 480;

// Pre-computed origin values as flat arrays for faster access
const ORIGIN_X = [0, 0.5, 0, 1, 0.5, 0.5, 0.5, 1, 0, 1];
const ORIGIN_Y = [0, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, 1, 1];

// Vertex shader - transforms sprite vertices
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;

  uniform vec2 u_resolution;
  uniform vec2 u_translation;
  uniform vec2 u_scale;
  uniform vec2 u_origin;
  uniform float u_rotation;

  varying vec2 v_texCoord;

  void main() {
    // Offset by origin (so origin becomes the pivot point)
    vec2 pos = a_position - u_origin;

    // Apply scale
    pos = pos * u_scale;

    // Apply rotation around origin
    float c = cos(u_rotation);
    float s = sin(u_rotation);
    vec2 rotated = vec2(
      pos.x * c - pos.y * s,
      pos.x * s + pos.y * c
    );

    // Translate to final position
    vec2 position = rotated + u_translation;

    // Convert to clip space (-1 to 1)
    vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    v_texCoord = a_texCoord;
  }
`;

// Fragment shader - samples texture with alpha and color tint
const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform float u_alpha;
  uniform vec3 u_color; // RGB tint (1,1,1 = no tint)

  varying vec2 v_texCoord;

  void main() {
    vec4 texColor = texture2D(u_texture, v_texCoord);
    // Multiply texture color by tint color
    vec3 tinted = texColor.rgb * u_color;
    gl_FragColor = vec4(tinted, texColor.a * u_alpha);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// Easing functions based on osu! spec (0-34)
// Reference: https://osu.ppy.sh/wiki/en/Storyboard/Scripting/Commands
function getEasedValue(t, easing) {
  switch (easing) {
    case 0: return t; // Linear
    case 1: return t * (2 - t); // Easing Out (start fast, slow down)
    case 2: return t * t; // Easing In (start slow, speed up)
    case 3: return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Quad In/Out
    case 4: return t * t; // Quad In
    case 5: return 1 - (1 - t) * (1 - t); // Quad Out
    case 6: return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Quad In/Out
    case 7: return t * t * t; // Cubic In
    case 8: return 1 - Math.pow(1 - t, 3); // Cubic Out
    case 9: return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // Cubic In/Out
    case 10: return t * t * t * t; // Quart In
    case 11: return 1 - Math.pow(1 - t, 4); // Quart Out
    case 12: return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; // Quart In/Out
    case 13: return t * t * t * t * t; // Quint In
    case 14: return 1 - Math.pow(1 - t, 5); // Quint Out
    case 15: return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2; // Quint In/Out
    case 16: return 1 - Math.cos((t * Math.PI) / 2); // Sine In
    case 17: return Math.sin((t * Math.PI) / 2); // Sine Out
    case 18: return -(Math.cos(Math.PI * t) - 1) / 2; // Sine In/Out
    case 19: return t === 0 ? 0 : Math.pow(2, 10 * t - 10); // Expo In
    case 20: return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // Expo Out
    case 21: return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; // Expo In/Out
    case 22: return 1 - Math.sqrt(1 - t * t); // Circ In
    case 23: return Math.sqrt(1 - Math.pow(t - 1, 2)); // Circ Out
    case 24: return t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2; // Circ In/Out
    case 25: { // Elastic In
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    }
    case 26: { // Elastic Out
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    case 27: // Elastic Half Out
    case 28: // Elastic Quarter Out
      return getEasedValue(t, 26); // Fallback to elastic out
    case 29: { // Elastic In/Out
      const c5 = (2 * Math.PI) / 4.5;
      return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    }
    case 30: return 2.70158 * t * t * t - 1.70158 * t * t; // Back In
    case 31: return 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2); // Back Out
    case 32: { // Back In/Out
      const c2 = 1.70158 * 1.525;
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    }
    case 33: // Bounce In
      return 1 - getEasedValue(1 - t, 34);
    case 34: { // Bounce Out
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
    default: return t; // Unknown easing, use linear
  }
}

function lerp(a, b, t, easing) {
  const et = getEasedValue(t < 0 ? 0 : t > 1 ? 1 : t, easing);
  return a + (b - a) * et;
}

function StoryboardRenderer({
  storyboard,
  storyboardBaseUrl,
  currentTimeRef, // Ref from parent - no React re-renders!
  width = 640,
  height = 480,
  onProgress = null,
  hitTimes = [], // Note hit times for trigger activation
}) {
  // Determine storyboard width based on widescreen flag
  const isWidescreen = storyboard?.widescreen ?? false;
  const OSU_WIDTH = isWidescreen ? OSU_WIDTH_16_9 : OSU_WIDTH_4_3;
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const texturesRef = useRef({});
  const bufferRef = useRef(null);
  const whitePixelRef = useRef(null); // 1x1 white texture for solid color drawing
  const [ready, setReady] = useState(false);
  const rafRef = useRef(null);

  // Pre-process storyboard data with visibility time ranges
  const { sortedSprites, commandsBySprite, imageList } = useMemo(() => {
    if (!storyboard?.sprites?.length) {
      return { sortedSprites: [], commandsBySprite: {}, imageList: [] };
    }

    const cmdMap = {};
    const spriteTimeRanges = {};
    const cmds = storyboard.commands || [];

    // Helper to expand loop commands
    const expandLoopCommand = (loopCmd) => {
      const expanded = [];
      const loopStart = loopCmd.start_time;
      const loopCount = loopCmd.loop_count || 1;
      const subCmds = loopCmd.sub_commands || [];

      if (subCmds.length === 0) return expanded;

      // Find the duration of one loop iteration
      // Duration is the SPAN of sub-commands (max_end - min_start), not max_end
      let minStart = Infinity, maxEnd = 0;
      for (const sub of subCmds) {
        if (sub.start_time < minStart) minStart = sub.start_time;
        if (sub.end_time > maxEnd) maxEnd = sub.end_time;
      }
      const loopDuration = maxEnd - minStart;

      // Expand each iteration
      // First iteration uses original times offset by loopStart
      // Subsequent iterations add loopDuration offset
      let orderCounter = 0;
      for (let iter = 0; iter < loopCount; iter++) {
        const iterOffset = loopStart + iter * loopDuration;
        for (const sub of subCmds) {
          expanded.push({
            type: sub.type,
            start_time: iterOffset + sub.start_time,
            end_time: iterOffset + sub.end_time,
            easing: sub.easing || 0,
            params: sub.params,
            _order: orderCounter++,
          });
        }
      }
      return expanded;
    };

    // Helper to expand trigger commands based on hit times
    // Triggers activate when an event (like HitSound) occurs within [start_time, end_time]
    // Sub-commands have relative timing from the trigger activation moment
    const expandTriggerCommand = (triggerCmd, hitTimesArray) => {
      const expanded = [];
      const triggerStart = triggerCmd.start_time;
      const triggerEnd = triggerCmd.end_time;
      const subCmds = triggerCmd.sub_commands || [];
      const triggerName = triggerCmd.trigger_name || '';

      if (subCmds.length === 0) return expanded;

      // Only process HitSound triggers for now (most common for beat-sync effects)
      // Other triggers: Failing, Passing, HitSoundClap, HitSoundFinish, HitSoundWhistle
      if (!triggerName.startsWith('HitSound')) {
        return expanded;
      }

      // Find hit times within the trigger's active window
      let orderCounter = 0;
      for (const hitTime of hitTimesArray) {
        if (hitTime >= triggerStart && hitTime <= triggerEnd) {
          // This hit activates the trigger - expand sub_commands relative to hit time
          for (const sub of subCmds) {
            expanded.push({
              type: sub.type,
              start_time: hitTime + sub.start_time,
              end_time: hitTime + sub.end_time,
              easing: sub.easing || 0,
              params: sub.params,
              _order: orderCounter++,
            });
          }
        }
      }
      return expanded;
    };

    for (let i = 0; i < cmds.length; i++) {
      const cmd = cmds[i];
      const id = cmd.sprite_id;
      if (!cmdMap[id]) cmdMap[id] = [];

      // Handle loop commands by expanding them
      if (cmd.type === 'L' && cmd.sub_commands) {
        const expanded = expandLoopCommand(cmd);
        for (const expCmd of expanded) {
          cmdMap[id].push(expCmd);
          // Update time range
          if (!spriteTimeRanges[id]) {
            spriteTimeRanges[id] = { start: expCmd.start_time, end: expCmd.end_time };
          } else {
            if (expCmd.start_time < spriteTimeRanges[id].start) spriteTimeRanges[id].start = expCmd.start_time;
            if (expCmd.end_time > spriteTimeRanges[id].end) spriteTimeRanges[id].end = expCmd.end_time;
          }
        }
        continue;
      }

      // Handle trigger commands by expanding them based on hit times
      if (cmd.type === 'T' && cmd.sub_commands) {
        const expanded = expandTriggerCommand(cmd, hitTimes);
        for (const expCmd of expanded) {
          cmdMap[id].push(expCmd);
          // Update time range
          if (!spriteTimeRanges[id]) {
            spriteTimeRanges[id] = { start: expCmd.start_time, end: expCmd.end_time };
          } else {
            if (expCmd.start_time < spriteTimeRanges[id].start) spriteTimeRanges[id].start = expCmd.start_time;
            if (expCmd.end_time > spriteTimeRanges[id].end) spriteTimeRanges[id].end = expCmd.end_time;
          }
        }
        continue;
      }

      cmdMap[id].push({
        type: cmd.type,
        start_time: cmd.start_time,
        end_time: cmd.end_time,
        easing: cmd.easing || 0,
        params: cmd.params,
        _order: i, // Preserve original order for stable sort
      });

      if (!spriteTimeRanges[id]) {
        spriteTimeRanges[id] = { start: cmd.start_time, end: cmd.end_time };
      } else {
        if (cmd.start_time < spriteTimeRanges[id].start) {
          spriteTimeRanges[id].start = cmd.start_time;
        }
        if (cmd.end_time > spriteTimeRanges[id].end) {
          spriteTimeRanges[id].end = cmd.end_time;
        }
      }
    }

    const sorted = [];
    const sprites = storyboard.sprites;
    for (let i = 0; i < sprites.length; i++) {
      const s = sprites[i];
      // Only process Background (0) and Foreground (3) layers
      if (s.layer !== 0 && s.layer !== 3) continue;

      const range = spriteTimeRanges[s.id];
      if (!range) continue;

      // Pre-compute normalized filepath to avoid string ops in render loop
      const normalizedPath = s.filepath.replace(/\\/g, '/');

      // Pre-compute origin values for faster lookup
      const originIdx = s.origin || 0;
      const originX = ORIGIN_X[originIdx] ?? 0.5;
      const originY = ORIGIN_Y[originIdx] ?? 0.5;

      // Pre-compute animation data
      let framePaths = null;
      let frameDelay = 0;
      let frameCount = 0;
      const isLoopOnce = s.loop_type === 'LoopOnce';

      if (s.type === 'animation' && s.frame_count > 0) {
        frameCount = s.frame_count;
        frameDelay = s.frame_delay || 16.67; // Default ~60fps
        framePaths = new Array(frameCount);
        const dotIdx = normalizedPath.lastIndexOf('.');
        for (let f = 0; f < frameCount; f++) {
          if (dotIdx > 0) {
            framePaths[f] = normalizedPath.slice(0, dotIdx) + f + normalizedPath.slice(dotIdx);
          } else {
            framePaths[f] = normalizedPath + f;
          }
        }
      }

      sorted.push({
        id: s.id,
        x: s.x,
        y: s.y,
        startTime: range.start,
        endTime: range.end,
        normalizedPath,
        originX,
        originY,
        framePaths,
        frameDelay,
        frameCount,
        isLoopOnce,
      });
    }
    sorted.sort((a, b) => a.layer - b.layer || a.id - b.id);

    for (const id in cmdMap) {
      // Stable sort: by start_time, then by original order
      cmdMap[id].sort((a, b) => a.start_time - b.start_time || (a._order ?? 0) - (b._order ?? 0));
    }

    return {
      sortedSprites: sorted,
      commandsBySprite: cmdMap,
      imageList: storyboard.images || []
    };
  }, [storyboard, hitTimes]);

  // Detect Firefox for performance optimizations
  const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox');

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      desynchronized: isFirefox, // Only on Firefox - causes artifacts on Chrome
    });

    if (!gl) {
      console.error('WebGL not supported, falling back to 2D');
      return;
    }

    glRef.current = gl;

    // Create shaders and program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    programRef.current = program;

    // Create vertex buffer for a unit quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Position (x, y) and texCoord (u, v) interleaved
    const vertices = new Float32Array([
      // Triangle 1
      0, 0, 0, 0,
      1, 0, 1, 0,
      0, 1, 0, 1,
      // Triangle 2
      0, 1, 0, 1,
      1, 0, 1, 0,
      1, 1, 1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    bufferRef.current = buffer;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Create 1x1 white pixel texture for solid color drawing (black bars)
    const whitePixel = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, whitePixel);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]));
    whitePixelRef.current = whitePixel;

    return () => {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(whitePixel);
    };
  }, []);

  // Load images as WebGL textures
  useEffect(() => {
    const gl = glRef.current;
    if (!gl || !imageList.length) {
      setReady(true);
      onProgress?.(0, 0);
      return;
    }

    let loaded = 0;
    const total = imageList.length;
    const textures = {};

    onProgress?.(0, total);

    for (let i = 0; i < total; i++) {
      const path = imageList[i];
      // Normalize path for consistent key lookup
      const normalizedPath = path.replace(/\\/g, '/');
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Create texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        // Set texture parameters for non-power-of-2 images
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Store with normalized path as key
        textures[normalizedPath] = { texture, width: img.width, height: img.height };
        loaded++;
        onProgress?.(loaded, total);

        if (loaded === total) {
          texturesRef.current = textures;
          setReady(true);
        }
      };

      img.onerror = () => {
        loaded++;
        onProgress?.(loaded, total);
        if (loaded === total) {
          texturesRef.current = textures;
          setReady(true);
        }
      };

      // Normalize path separators and encode special characters
      img.src = `${storyboardBaseUrl}${encodeURI(normalizedPath)}`;
    }

    return () => {
      // Cleanup textures
      for (const path in textures) {
        gl.deleteTexture(textures[path].texture);
      }
      setReady(false);
    };
  }, [imageList, storyboardBaseUrl, onProgress]);

  // Animation loop with WebGL rendering
  useEffect(() => {
    if (!ready || !sortedSprites.length) return;

    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    const textures = texturesRef.current;
    // Use uniform scaling to maintain aspect ratio
    // Scale based on height, center horizontally (like osu! does on widescreen)
    const scale = height / OSU_HEIGHT;
    const offsetX = (width - OSU_WIDTH * scale) / 2; // Center horizontally

    // Get attribute and uniform locations (cache these)
    const aPosition = gl.getAttribLocation(program, 'a_position');
    const aTexCoord = gl.getAttribLocation(program, 'a_texCoord');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTranslation = gl.getUniformLocation(program, 'u_translation');
    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uOrigin = gl.getUniformLocation(program, 'u_origin');
    const uRotation = gl.getUniformLocation(program, 'u_rotation');
    const uAlpha = gl.getUniformLocation(program, 'u_alpha');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const uTexture = gl.getUniformLocation(program, 'u_texture');

    gl.useProgram(program);

    // Set up vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
    gl.enableVertexAttribArray(aPosition);
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);

    // Set resolution uniform
    gl.uniform2f(uResolution, width, height);
    gl.uniform1i(uTexture, 0);

    const missingTextures = new Set();

    // Pre-allocate render batch array to avoid GC
    const renderBatch = new Array(sortedSprites.length);
    let batchSize = 0;

    const render = () => {
      const time = currentTimeRef?.current || 0;
      batchSize = 0;

      // === PASS 1: Compute all visible sprite states ===
      for (let i = 0; i < sortedSprites.length; i++) {
        const sprite = sortedSprites[i];

        // Skip sprites outside their active time range
        if (time < sprite.startTime || time > sprite.endTime) continue;

        const cmds = commandsBySprite[sprite.id];
        if (!cmds) continue;

        // Calculate state - defaults per osu! spec
        let x = sprite.x, y = sprite.y;
        let uniformScale = 1, vectorScaleX = 1, vectorScaleY = 1;
        let rot = 0;
        let colorR = 1, colorG = 1, colorB = 1;
        let flipH = false, flipV = false, additive = false;
        let alpha = 1;
        let hasInitF = false, hasInitS = false, hasInitV = false;
        let hasInitM = false, hasInitMX = false, hasInitMY = false;
        let hasInitR = false, hasInitC = false;

        const cmdLen = cmds.length;
        let passedActiveWindow = false;

        for (let j = 0; j < cmdLen; j++) {
          const cmd = cmds[j];
          const type = cmd.type;
          const start_time = cmd.start_time;
          const params = cmd.params;

          if (time < start_time) {
            if (!passedActiveWindow) {
              passedActiveWindow = true;
              if (hasInitF && hasInitS && hasInitV && hasInitM && hasInitMX && hasInitMY && hasInitR && hasInitC) break;
            }
            if (type === 'F' && !hasInitF) { alpha = params[0]; hasInitF = true; }
            else if (type === 'S' && !hasInitS) { uniformScale = params[0]; hasInitS = true; }
            else if (type === 'V' && !hasInitV) { vectorScaleX = params[0]; vectorScaleY = params[1]; hasInitV = true; }
            else if (type === 'M' && !hasInitM) { x = params[0]; y = params[1]; hasInitM = true; }
            else if (type === 'MX' && !hasInitMX) { x = params[0]; hasInitMX = true; }
            else if (type === 'MY' && !hasInitMY) { y = params[0]; hasInitMY = true; }
            else if (type === 'R' && !hasInitR) { rot = params[0]; hasInitR = true; }
            else if (type === 'C' && !hasInitC) { colorR = params[0]/255; colorG = params[1]/255; colorB = params[2]/255; hasInitC = true; }
            if (hasInitF && hasInitS && hasInitV && hasInitM && hasInitMX && hasInitMY && hasInitR && hasInitC) break;
            continue;
          }

          const end_time = cmd.end_time;
          const easing = cmd.easing;
          const dur = end_time - start_time;
          const prog = dur > 0 ? Math.min(1, (time - start_time) / dur) : 1;

          switch (type) {
            case 'F': alpha = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitF = true; break;
            case 'M': x = lerp(params[0], params[2] ?? params[0], prog, easing); y = lerp(params[1], params[3] ?? params[1], prog, easing); hasInitM = true; break;
            case 'MX': x = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitMX = true; break;
            case 'MY': y = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitMY = true; break;
            case 'S': uniformScale = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitS = true; break;
            case 'V': vectorScaleX = lerp(params[0], params[2] ?? params[0], prog, easing); vectorScaleY = lerp(params[1], params[3] ?? params[1], prog, easing); hasInitV = true; break;
            case 'R': rot = lerp(params[0], params[1] ?? params[0], prog, easing); hasInitR = true; break;
            case 'C': colorR = lerp(params[0], params[3] ?? params[0], prog, easing) / 255; colorG = lerp(params[1], params[4] ?? params[1], prog, easing) / 255; colorB = lerp(params[2], params[5] ?? params[2], prog, easing) / 255; hasInitC = true; break;
            case 'P': if (time <= end_time) { if (params[0] === 'H') flipH = true; else if (params[0] === 'V') flipV = true; else if (params[0] === 'A') additive = true; } break;
          }
        }

        if (alpha <= 0) continue;

        // Handle animation sprites
        let texturePath = sprite.normalizedPath;
        const frameCount = sprite.frameCount;
        if (frameCount > 0) {
          const animTime = time - sprite.startTime;
          if (animTime >= 0) {
            let frameIndex = (animTime / sprite.frameDelay) | 0;
            frameIndex = sprite.isLoopOnce ? (frameIndex < frameCount ? frameIndex : frameCount - 1) : frameIndex % frameCount;
            texturePath = sprite.framePaths[frameIndex];
          }
        }

        const texInfo = textures[texturePath];
        if (!texInfo) {
          missingTextures.add(texturePath);
          continue;
        }

        // Store in batch (reuse object slots to avoid GC)
        const scX = uniformScale * vectorScaleX;
        const scY = uniformScale * vectorScaleY;
        const item = renderBatch[batchSize] || (renderBatch[batchSize] = {});
        item.texInfo = texInfo;
        item.texturePath = texturePath;
        item.additive = additive;
        // Widescreen storyboards use coordinates from -107 to 747 (center at 320)
        // Need to shift X by 107 to convert to 0-854 range
        item.x = (x + (isWidescreen ? 107 : 0)) * scale + offsetX;
        item.y = y * scale;
        item.scX = texInfo.width * scX * scale * (flipH ? -1 : 1);
        item.scY = texInfo.height * scY * scale * (flipV ? -1 : 1);
        item.rot = rot;
        item.alpha = alpha;
        item.colorR = colorR;
        item.colorG = colorG;
        item.colorB = colorB;
        item.originX = sprite.originX;
        item.originY = sprite.originY;
        batchSize++;
      }

      // === PASS 2: Draw with minimal state changes ===
      // Note: We can't sort by texture because z-order matters for storyboards
      // But we still cache texture/blend to avoid redundant binds
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      let lastBlendMode = false; // false = normal, true = additive
      let lastTexture = null;

      for (let i = 0; i < batchSize; i++) {
        const item = renderBatch[i];

        // Only switch blend mode when needed
        if (item.additive !== lastBlendMode) {
          gl.blendFunc(gl.SRC_ALPHA, item.additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
          lastBlendMode = item.additive;
        }

        // Only bind texture when it changes
        if (item.texInfo.texture !== lastTexture) {
          gl.bindTexture(gl.TEXTURE_2D, item.texInfo.texture);
          lastTexture = item.texInfo.texture;
        }

        // Set uniforms and draw
        gl.uniform2f(uOrigin, item.originX, item.originY);
        gl.uniform2f(uTranslation, item.x, item.y);
        gl.uniform2f(uScale, item.scX, item.scY);
        gl.uniform1f(uRotation, item.rot);
        gl.uniform1f(uAlpha, item.alpha);
        gl.uniform3f(uColor, item.colorR, item.colorG, item.colorB);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Draw black bars at the sides AFTER sprites
      // Both 4:3 (640x480) and 16:9 (854x480) storyboards need bars if display is wider
      // Left bar: from 0 to offsetX, Right bar: from offsetX + OSU_WIDTH*scale to width
      if (whitePixelRef.current && offsetX > 0) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, whitePixelRef.current);

        // Reset blend mode to normal for solid bars
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Black color, full opacity
        gl.uniform3f(uColor, 0, 0, 0);
        gl.uniform1f(uAlpha, 1);
        gl.uniform1f(uRotation, 0);
        gl.uniform2f(uOrigin, 0, 0);

        // Left bar
        gl.uniform2f(uTranslation, 0, 0);
        gl.uniform2f(uScale, offsetX, height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Right bar
        gl.uniform2f(uTranslation, offsetX + OSU_WIDTH * scale, 0);
        gl.uniform2f(uScale, offsetX + 1, height); // +1 to cover any rounding gaps
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Firefox: Use setTimeout to give GC breathing room
      // Chrome: Use requestAnimationFrame for smooth vsync
      if (isFirefox) {
        rafRef.current = setTimeout(render, 16); // ~60fps
      } else {
        rafRef.current = requestAnimationFrame(render);
      }
    };

    if (isFirefox) {
      rafRef.current = setTimeout(render, 16);
    } else {
      rafRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (isFirefox) {
        clearTimeout(rafRef.current);
      } else {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [ready, sortedSprites, commandsBySprite, width, height, isFirefox, isWidescreen, OSU_WIDTH]);

  if (!storyboard?.sprites?.length) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
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

// Memoize to prevent re-renders when parent updates
export default memo(StoryboardRenderer);
