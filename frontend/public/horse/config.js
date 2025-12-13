// Horse Racing Simulator - Configuration

// Configuration
const HORSE_SPRITE_SCALE = 5;  // Adjust this to change horse size (1.0 = default, 1.8 = 1.8x larger)

// Natural horse colors (R, G, B)
const HORSE_COLORS = [
    [139, 69, 19],   // Brown
    [101, 67, 33],   // Dark brown
    [210, 180, 140], // Tan
    [139, 115, 85],  // Light brown
    [70, 50, 40],    // Dark chestnut
    [180, 140, 100], // Palomino
    [255, 255, 255], // White
    [50, 50, 50],    // Black
    [255, 0, 255]  // Pink (Haru Urara - the legendary 113-loss horse!)
];

// Running styles from Uma Musume
const RUNNING_STYLES = {
    NIGE: 'nige',           // Runner - leads from front
    SENKOU: 'senkou',       // Leader - runs near front
    SASHI: 'sashi',         // Stalker/Chaser - middle pack, late surge
    OIKOMI: 'oikomi'        // Closer - stays back, explosive finish
};
