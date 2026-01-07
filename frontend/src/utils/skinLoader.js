import JSZip from 'jszip';

/**
 * Storage key for custom skins in localStorage.
 */
const SKINS_STORAGE_KEY = 'pmc_custom_skins';

/**
 * Parse skin.ini to extract skin name and mania image paths.
 *
 * @param {string} content - The content of skin.ini
 * @returns {object} Parsed skin info with mania paths
 */
function parseSkinIni(content) {
  const lines = content.split('\n');
  let skinName = 'Custom Skin';
  let currentSection = '';
  const mania = {
    keys: 4,
    notes: [null, null, null, null],
    noteHeads: [null, null, null, null],
    noteBodies: [null, null, null, null],
    noteTails: [null, null, null, null],
    keyImages: [null, null, null, null],
  };

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

        if (keyLower === 'keys') {
          mania.keys = parseInt(value, 10) || 4;
        }

        // Parse note images for columns 0-3
        for (let i = 0; i < 4; i++) {
          if (keyLower === `noteimage${i}`) {
            mania.notes[i] = value;
          } else if (keyLower === `noteimage${i}h`) {
            mania.noteHeads[i] = value;
          } else if (keyLower === `noteimage${i}l`) {
            mania.noteBodies[i] = value;
          } else if (keyLower === `noteimage${i}t`) {
            mania.noteTails[i] = value;
          } else if (keyLower === `keyimage${i}`) {
            mania.keyImages[i] = value;
          }
        }
      }
    }
  }

  return { skinName, mania };
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
 * Default fallback patterns for 4K mania when skin.ini doesn't specify.
 * Column mapping: 0→type1, 1→type2, 2→type2, 3→type1 (outer-inner-inner-outer)
 */
const DEFAULT_PATTERNS = {
  notes: [
    ['mania-note1@2x.png', 'mania-note1.png', 'note1.png', 'left.png'],
    ['mania-note2@2x.png', 'mania-note2.png', 'note2.png', 'down.png'],
    ['mania-note2@2x.png', 'mania-note2.png', 'note2.png', 'up.png'],
    ['mania-note1@2x.png', 'mania-note1.png', 'note1.png', 'right.png'],
  ],
  noteHeads: [
    ['mania-note1h@2x.png', 'mania-note1h.png'],
    ['mania-note2h@2x.png', 'mania-note2h.png'],
    ['mania-note2h@2x.png', 'mania-note2h.png'],
    ['mania-note1h@2x.png', 'mania-note1h.png'],
  ],
  noteBodies: [
    ['mania-note1l@2x.png', 'mania-note1l.png', 'holdbody.png'],
    ['mania-note2l@2x.png', 'mania-note2l.png', 'holdbody.png'],
    ['mania-note2l@2x.png', 'mania-note2l.png', 'holdbody.png'],
    ['mania-note1l@2x.png', 'mania-note1l.png', 'holdbody.png'],
  ],
  noteTails: [
    ['mania-note1t@2x.png', 'mania-note1t.png', 'holdcap.png'],
    ['mania-note2t@2x.png', 'mania-note2t.png', 'holdcap.png'],
    ['mania-note2t@2x.png', 'mania-note2t.png', 'holdcap.png'],
    ['mania-note1t@2x.png', 'mania-note1t.png', 'holdcap.png'],
  ],
  keys: [
    ['mania-key1@2x.png', 'mania-key1.png', 'key1.png', 'key_left.png'],
    ['mania-key2@2x.png', 'mania-key2.png', 'key2.png', 'key_down.png'],
    ['mania-key2@2x.png', 'mania-key2.png', 'key2.png', 'key_up.png'],
    ['mania-key1@2x.png', 'mania-key1.png', 'key1.png', 'key_right.png'],
  ],
};

/**
 * Load and parse an osu! skin from a zip file.
 *
 * @param {File} zipFile - The uploaded zip file
 * @returns {Promise<object>} Parsed skin data with base64 images
 */
export async function loadSkinFromZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);

  // Get all file paths in the zip (excluding directories)
  const filePaths = Object.keys(zip.files).filter((path) => !zip.files[path].dir);

  // Find and parse skin.ini
  const skinIniPath = filePaths.find((f) => f.toLowerCase().endsWith('skin.ini'));
  let skinName = zipFile.name.replace(/\.zip$/i, '').replace(/\.osk$/i, '');
  let maniaConfig = null;

  if (skinIniPath) {
    const skinIniContent = await zip.file(skinIniPath).async('string');
    const parsed = parseSkinIni(skinIniContent);
    if (parsed.skinName) {
      skinName = parsed.skinName;
    }
    maniaConfig = parsed.mania;
  }

  // Load note images for each column
  const notes = [];
  for (let i = 0; i < 4; i++) {
    let filePath = null;

    // First try skin.ini specified path
    if (maniaConfig?.notes[i]) {
      const variations = normalizePath(maniaConfig.notes[i]);
      filePath = findFileInZip(filePaths, variations);
    }

    // Fall back to default patterns
    if (!filePath) {
      filePath = findByPattern(filePaths, DEFAULT_PATTERNS.notes[i]);
    }

    const base64 = await fileToBase64(zip, filePath);
    notes.push(base64);
  }

  // Load receptor/key images for each column
  const receptors = [];
  for (let i = 0; i < 4; i++) {
    let filePath = null;

    if (maniaConfig?.keyImages[i]) {
      const variations = normalizePath(maniaConfig.keyImages[i]);
      filePath = findFileInZip(filePaths, variations);
    }

    if (!filePath) {
      filePath = findByPattern(filePaths, DEFAULT_PATTERNS.keys[i]);
    }

    const base64 = await fileToBase64(zip, filePath);
    receptors.push(base64);
  }

  // Load hold body (use column 0's pattern, they're usually the same)
  let holdBodyPath = null;
  if (maniaConfig?.noteBodies[0]) {
    const variations = normalizePath(maniaConfig.noteBodies[0]);
    holdBodyPath = findFileInZip(filePaths, variations);
  }
  if (!holdBodyPath) {
    holdBodyPath = findByPattern(filePaths, DEFAULT_PATTERNS.noteBodies[0]);
  }
  const holdBody = await fileToBase64(zip, holdBodyPath);

  // Load hold tail/cap
  let holdCapPath = null;
  if (maniaConfig?.noteTails[0]) {
    const variations = normalizePath(maniaConfig.noteTails[0]);
    holdCapPath = findFileInZip(filePaths, variations);
  }
  if (!holdCapPath) {
    holdCapPath = findByPattern(filePaths, DEFAULT_PATTERNS.noteTails[0]);
  }
  const holdCap = await fileToBase64(zip, holdCapPath);

  // Create unique ID for this skin
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    name: skinName,
    notes,
    receptors,
    holdBody,
    holdCap,
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
