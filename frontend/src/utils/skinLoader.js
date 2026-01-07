import JSZip from 'jszip';

/**
 * Storage key for custom skins in localStorage.
 */
const SKINS_STORAGE_KEY = 'pmc_custom_skins';

/**
 * Create empty mania config for a given key count.
 *
 * @param {number} keyCount - Number of keys
 * @returns {object} Empty mania config
 */
function createEmptyManiaConfig(keyCount) {
  return {
    keys: keyCount,
    notes: new Array(keyCount).fill(null),
    noteHeads: new Array(keyCount).fill(null),
    noteBodies: new Array(keyCount).fill(null),
    noteTails: new Array(keyCount).fill(null),
    keyImages: new Array(keyCount).fill(null),
  };
}

/**
 * Parse skin.ini to extract skin name and mania image paths for all key counts.
 * osu! skins can have multiple [Mania] sections, one per key count.
 *
 * @param {string} content - The content of skin.ini
 * @returns {object} Parsed skin info with mania configs per key count
 */
function parseSkinIni(content) {
  const lines = content.split('\n');
  let skinName = 'Custom Skin';
  let currentSection = '';
  let currentKeyCount = 4;

  // Store mania configs per key count (4K through 10K)
  const maniaConfigs = {};

  for (const line of lines) {
    let trimmed = line.trim();

    // Remove comments
    if (trimmed.startsWith('//')) continue;
    const commentIdx = trimmed.indexOf('//');
    if (commentIdx > 0) {
      trimmed = trimmed.substring(0, commentIdx).trim();
    }

    // Section header
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).toLowerCase();
      // Reset key count when entering a new [Mania] section
      if (currentSection === 'mania') {
        currentKeyCount = 4; // Default, will be overwritten by Keys: line
      }
      continue;
    }

    // Key-value pair
    if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIdx).trim();
      const value = trimmed.substring(colonIdx + 1).trim();

      if (currentSection === 'general' && key.toLowerCase() === 'name') {
        skinName = value;
      }

      if (currentSection === 'mania') {
        const keyLower = key.toLowerCase();

        // Keys: line specifies which key count this section is for
        if (keyLower === 'keys') {
          currentKeyCount = parseInt(value, 10) || 4;
          // Initialize config for this key count if not exists
          if (!maniaConfigs[currentKeyCount]) {
            maniaConfigs[currentKeyCount] = createEmptyManiaConfig(currentKeyCount);
          }
        }

        // Ensure we have a config for current key count
        if (!maniaConfigs[currentKeyCount]) {
          maniaConfigs[currentKeyCount] = createEmptyManiaConfig(currentKeyCount);
        }

        const config = maniaConfigs[currentKeyCount];

        // Parse note images for all possible columns (0-9 for up to 10K)
        for (let i = 0; i < currentKeyCount; i++) {
          if (keyLower === `noteimage${i}`) {
            config.notes[i] = value;
          } else if (keyLower === `noteimage${i}h`) {
            config.noteHeads[i] = value;
          } else if (keyLower === `noteimage${i}l`) {
            config.noteBodies[i] = value;
          } else if (keyLower === `noteimage${i}t`) {
            config.noteTails[i] = value;
          } else if (keyLower === `keyimage${i}`) {
            config.keyImages[i] = value;
          }
        }
      }
    }
  }

  return { skinName, maniaConfigs };
}

/**
 * Normalize a path from skin.ini to match zip file structure.
 * Handles backslashes, adds .png extension, supports @2x.
 *
 * @param {string} path - Path from skin.ini (e.g., "Mania/mania-note1")
 * @returns {string[]} Array of possible file paths to try
 */
function normalizePath(path) {
  if (!path) return [];

  // Normalize slashes
  let normalized = path.replace(/\\/g, '/');

  // Generate variations to try
  const variations = [];

  // Try with @2x first (higher quality)
  variations.push(normalized + '@2x.png');
  variations.push(normalized + '.png');

  // Also try lowercase versions
  const lowerNormalized = normalized.toLowerCase();
  if (lowerNormalized !== normalized) {
    variations.push(lowerNormalized + '@2x.png');
    variations.push(lowerNormalized + '.png');
  }

  return variations;
}

/**
 * Find a file in the zip matching any of the given path variations.
 *
 * @param {string[]} filePaths - All file paths in the zip
 * @param {string[]} variations - Path variations to try
 * @returns {string|null} Matching file path or null
 */
function findFileInZip(filePaths, variations) {
  for (const variation of variations) {
    // Try exact match
    const exactMatch = filePaths.find((f) => f === variation);
    if (exactMatch) return exactMatch;

    // Try case-insensitive match
    const lowerVariation = variation.toLowerCase();
    const caseMatch = filePaths.find((f) => f.toLowerCase() === lowerVariation);
    if (caseMatch) return caseMatch;

    // Try matching just the filename (for files in subdirectories)
    const fileName = variation.split('/').pop().toLowerCase();
    const fileNameMatch = filePaths.find((f) => f.toLowerCase().endsWith('/' + fileName) || f.toLowerCase() === fileName);
    if (fileNameMatch) return fileNameMatch;
  }
  return null;
}

/**
 * Find a file by common naming patterns when skin.ini doesn't specify paths.
 *
 * @param {string[]} filePaths - All file paths in the zip
 * @param {string[]} patterns - Patterns to match
 * @returns {string|null} Matching file path or null
 */
function findByPattern(filePaths, patterns) {
  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase();
    for (const file of filePaths) {
      const fileName = file.split('/').pop().toLowerCase();
      if (fileName === lowerPattern) {
        return file;
      }
    }
  }
  return null;
}

/**
 * Convert a file from zip to base64 data URL.
 *
 * @param {JSZip} zip - The JSZip instance
 * @param {string} filePath - Path to the file in the zip
 * @returns {Promise<string|null>} Base64 data URL or null if not found
 */
async function fileToBase64(zip, filePath) {
  if (!filePath) return null;
  const file = zip.file(filePath);
  if (!file) return null;

  const blob = await file.async('blob');
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/**
 * Get default fallback patterns for a column in a given key count.
 * Uses osu! standard pattern: alternating note1/note2 from edges to center.
 *
 * @param {number} keyCount - Number of keys
 * @param {number} col - Column index
 * @returns {object} Patterns for notes, keys, etc.
 */
function getDefaultPatterns(keyCount, col) {
  // For 4K arrow skin fallback
  const arrowNotes = ['left.png', 'down.png', 'up.png', 'right.png'];
  const arrowKeys = ['key_left.png', 'key_down.png', 'key_up.png', 'key_right.png'];

  // Determine if this column is "outer" (type 1) or "inner" (type 2)
  // osu! uses alternating pattern from edges: 1,2,1,2... or 1,2,2,1 for 4K
  const isOuter = col === 0 || col === keyCount - 1 ||
    (keyCount > 4 && (col === 1 || col === keyCount - 2));
  const noteType = isOuter ? '1' : '2';

  return {
    notes: [
      `mania-note${noteType}@2x.png`,
      `mania-note${noteType}.png`,
      `note${noteType}.png`,
      arrowNotes[col % 4],
    ],
    keys: [
      `mania-key${noteType}@2x.png`,
      `mania-key${noteType}.png`,
      `key${noteType}.png`,
      arrowKeys[col % 4],
    ],
    noteBodies: [
      `mania-note${noteType}l@2x.png`,
      `mania-note${noteType}l.png`,
      'holdbody.png',
    ],
    noteTails: [
      `mania-note${noteType}t@2x.png`,
      `mania-note${noteType}t.png`,
      'holdcap.png',
    ],
  };
}

/**
 * Load sprites for a specific key count configuration.
 *
 * @param {JSZip} zip - The JSZip instance
 * @param {string[]} filePaths - All file paths in the zip
 * @param {object|null} maniaConfig - Parsed mania config for this key count
 * @param {number} keyCount - Number of keys
 * @returns {Promise<object>} Loaded sprites for this key count
 */
async function loadSpritesForKeyCount(zip, filePaths, maniaConfig, keyCount) {
  const notes = [];
  const receptors = [];

  for (let i = 0; i < keyCount; i++) {
    const defaults = getDefaultPatterns(keyCount, i);

    // Load note image
    let notePath = null;
    if (maniaConfig?.notes[i]) {
      const variations = normalizePath(maniaConfig.notes[i]);
      notePath = findFileInZip(filePaths, variations);
    }
    if (!notePath) {
      notePath = findByPattern(filePaths, defaults.notes);
    }
    notes.push(await fileToBase64(zip, notePath));

    // Load receptor/key image
    let keyPath = null;
    if (maniaConfig?.keyImages[i]) {
      const variations = normalizePath(maniaConfig.keyImages[i]);
      keyPath = findFileInZip(filePaths, variations);
    }
    if (!keyPath) {
      keyPath = findByPattern(filePaths, defaults.keys);
    }
    receptors.push(await fileToBase64(zip, keyPath));
  }

  // Load hold body (use column 0's pattern)
  const defaults0 = getDefaultPatterns(keyCount, 0);
  let holdBodyPath = null;
  if (maniaConfig?.noteBodies[0]) {
    const variations = normalizePath(maniaConfig.noteBodies[0]);
    holdBodyPath = findFileInZip(filePaths, variations);
  }
  if (!holdBodyPath) {
    holdBodyPath = findByPattern(filePaths, defaults0.noteBodies);
  }
  const holdBody = await fileToBase64(zip, holdBodyPath);

  // Load hold tail/cap
  let holdCapPath = null;
  if (maniaConfig?.noteTails[0]) {
    const variations = normalizePath(maniaConfig.noteTails[0]);
    holdCapPath = findFileInZip(filePaths, variations);
  }
  if (!holdCapPath) {
    holdCapPath = findByPattern(filePaths, defaults0.noteTails);
  }
  const holdCap = await fileToBase64(zip, holdCapPath);

  return { notes, receptors, holdBody, holdCap };
}

/**
 * Load and parse an osu! skin from a zip file.
 * Supports multiple key counts (4K-10K) based on skin.ini sections.
 *
 * @param {File} zipFile - The uploaded zip file
 * @returns {Promise<object>} Parsed skin data with base64 images per key count
 */
export async function loadSkinFromZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);

  // Get all file paths in the zip (excluding directories)
  const filePaths = Object.keys(zip.files).filter((path) => !zip.files[path].dir);

  // Find and parse skin.ini
  const skinIniPath = filePaths.find((f) => f.toLowerCase().endsWith('skin.ini'));
  let skinName = zipFile.name.replace(/\.zip$/i, '').replace(/\.osk$/i, '');
  let maniaConfigs = {};

  if (skinIniPath) {
    const skinIniContent = await zip.file(skinIniPath).async('string');
    const parsed = parseSkinIni(skinIniContent);
    if (parsed.skinName) {
      skinName = parsed.skinName;
    }
    maniaConfigs = parsed.maniaConfigs || {};
  }

  // Load sprites for each key count that has a config
  // Always load 4K as default, plus any other key counts defined
  const keyCounts = new Set([4, ...Object.keys(maniaConfigs).map(Number)]);
  const spritesByKeyCount = {};

  for (const keyCount of keyCounts) {
    const config = maniaConfigs[keyCount] || null;
    spritesByKeyCount[keyCount] = await loadSpritesForKeyCount(zip, filePaths, config, keyCount);
  }

  // Create unique ID for this skin
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // For backwards compatibility, also include flat 4K sprites at top level
  const sprites4K = spritesByKeyCount[4] || { notes: [], receptors: [], holdBody: null, holdCap: null };

  return {
    id,
    name: skinName,
    // Flat 4K sprites for backwards compatibility
    notes: sprites4K.notes,
    receptors: sprites4K.receptors,
    holdBody: sprites4K.holdBody,
    holdCap: sprites4K.holdCap,
    // All key count sprites
    spritesByKeyCount,
    isCustom: true,
  };
}

/**
 * Save a custom skin to localStorage.
 *
 * @param {object} skin - The skin data to save
 */
export function saveSkinToStorage(skin) {
  const existing = getSavedSkins();
  // Replace if same name exists
  const filtered = existing.filter((s) => s.name !== skin.name);
  filtered.push(skin);
  localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get all saved custom skins from localStorage.
 *
 * @returns {object[]} Array of saved skin data
 */
export function getSavedSkins() {
  try {
    const stored = localStorage.getItem(SKINS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Delete a custom skin from localStorage.
 *
 * @param {string} skinId - The skin ID to delete
 */
export function deleteSkinFromStorage(skinId) {
  const existing = getSavedSkins();
  const filtered = existing.filter((s) => s.id !== skinId);
  localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get a specific skin by ID from storage.
 *
 * @param {string} skinId - The skin ID to retrieve
 * @returns {object|null} The skin data or null if not found
 */
export function getSkinById(skinId) {
  const skins = getSavedSkins();
  return skins.find((s) => s.id === skinId) || null;
}
