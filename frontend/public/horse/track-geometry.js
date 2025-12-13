// Horse Racing - Clean Track Geometry
// All track boundaries defined mathematically - no sprite dependencies
// Art will be drawn to match these values, not the other way around

const TrackGeometry = {
    // ============================================
    // CORE DIMENSIONS - Edit these to change track
    // ============================================

    // Overall track size
    TRACK_WIDTH: 2400,      // Total width of track area
    TRACK_HEIGHT: 1200,     // Total height of track area

    // Racing lane dimensions
    LANE_WIDTH: 180,        // Width of the racing surface (inner to outer rail)

    // Curve geometry (measured to CENTER of racing lane)
    CURVE_RADIUS: 300,      // Radius to center of lane in curves

    // Derived values (calculated in init)
    INNER_RADIUS: 0,        // Inner rail radius in curves
    OUTER_RADIUS: 0,        // Outer rail radius in curves
    STRAIGHT_LENGTH: 0,     // Length of straight sections

    // Track center point
    CENTER_X: 0,
    CENTER_Y: 0,

    // Section boundaries (calculated in init)
    sections: {
        TOP_STRAIGHT: null,
        BOTTOM_STRAIGHT: null,
        LEFT_CURVE: null,
        RIGHT_CURVE: null
    },

    // Start/finish line
    START_LINE_X: 0,        // X position of start line
    FINISH_LINE_X: 0,       // X position of finish line (same as start for oval)

    initialized: false,

    // ============================================
    // INITIALIZATION
    // ============================================
    init() {
        // Calculate derived values
        this.CENTER_X = this.TRACK_WIDTH / 2;
        this.CENTER_Y = this.TRACK_HEIGHT / 2;

        this.INNER_RADIUS = this.CURVE_RADIUS - this.LANE_WIDTH / 2;
        this.OUTER_RADIUS = this.CURVE_RADIUS + this.LANE_WIDTH / 2;

        // Straight length = total width minus the two curve diameters
        this.STRAIGHT_LENGTH = this.TRACK_WIDTH - (this.CURVE_RADIUS * 2) - this.LANE_WIDTH;

        // Define section boundaries
        // Curves are semicircles at left and right ends
        const curveLeftCenterX = this.OUTER_RADIUS;
        const curveRightCenterX = this.TRACK_WIDTH - this.OUTER_RADIUS;

        this.sections.LEFT_CURVE = {
            name: 'LEFT_CURVE',
            type: 'curve',
            centerX: curveLeftCenterX,
            centerY: this.CENTER_Y,
            innerRadius: this.INNER_RADIUS,
            outerRadius: this.OUTER_RADIUS,
            // Bounds for quick detection
            xMin: 0,
            xMax: curveLeftCenterX,
            yMin: this.CENTER_Y - this.OUTER_RADIUS,
            yMax: this.CENTER_Y + this.OUTER_RADIUS,
            // Direction: horses go from top (180°) around to bottom (0°/360°)
            // In screen coords, this is CW around center
            rotation: 'CW'
        };

        this.sections.RIGHT_CURVE = {
            name: 'RIGHT_CURVE',
            type: 'curve',
            centerX: curveRightCenterX,
            centerY: this.CENTER_Y,
            innerRadius: this.INNER_RADIUS,
            outerRadius: this.OUTER_RADIUS,
            xMin: curveRightCenterX,
            xMax: this.TRACK_WIDTH,
            yMin: this.CENTER_Y - this.OUTER_RADIUS,
            yMax: this.CENTER_Y + this.OUTER_RADIUS,
            // Direction: horses go from bottom (0°) around to top (180°)
            // In screen coords, this is CCW around center
            rotation: 'CCW'
        };

        // Straights connect the curves
        const straightTop = this.CENTER_Y - this.CURVE_RADIUS;
        const straightBottom = this.CENTER_Y + this.CURVE_RADIUS;

        this.sections.TOP_STRAIGHT = {
            name: 'TOP_STRAIGHT',
            type: 'straight',
            // Lane boundaries (Y positions)
            innerY: straightTop + this.LANE_WIDTH / 2,   // Bottom edge of lane
            outerY: straightTop - this.LANE_WIDTH / 2,   // Top edge of lane
            centerY: straightTop,                         // Center of lane
            // X boundaries
            xMin: curveLeftCenterX,
            xMax: curveRightCenterX,
            // Direction: horses go LEFT (negative X)
            direction: 180
        };

        this.sections.BOTTOM_STRAIGHT = {
            name: 'BOTTOM_STRAIGHT',
            type: 'straight',
            innerY: straightBottom - this.LANE_WIDTH / 2,  // Top edge of lane
            outerY: straightBottom + this.LANE_WIDTH / 2,  // Bottom edge of lane
            centerY: straightBottom,                        // Center of lane
            xMin: curveLeftCenterX,
            xMax: curveRightCenterX,
            // Direction: horses go RIGHT (positive X)
            direction: 0
        };

        // Start/finish line position (middle of bottom straight)
        this.START_LINE_X = this.CENTER_X + 200;   // Start slightly right of center
        this.FINISH_LINE_X = this.CENTER_X - 200;  // Finish slightly left of center

        this.initialized = true;

        console.log('TrackGeometry initialized:', {
            trackSize: `${this.TRACK_WIDTH} x ${this.TRACK_HEIGHT}`,
            laneWidth: this.LANE_WIDTH,
            curveRadius: this.CURVE_RADIUS,
            innerRadius: this.INNER_RADIUS,
            outerRadius: this.OUTER_RADIUS,
            straightLength: this.STRAIGHT_LENGTH
        });

        return this;
    },

    // ============================================
    // SECTION DETECTION
    // ============================================
    getSection(x, y) {
        if (!this.initialized) return null;

        const { LEFT_CURVE, RIGHT_CURVE, TOP_STRAIGHT, BOTTOM_STRAIGHT } = this.sections;

        // Check curves first (by X position)
        if (x <= LEFT_CURVE.xMax) return LEFT_CURVE;
        if (x >= RIGHT_CURVE.xMin) return RIGHT_CURVE;

        // Then straights (by Y position relative to center)
        if (y < this.CENTER_Y) return TOP_STRAIGHT;
        return BOTTOM_STRAIGHT;
    },

    // ============================================
    // NAVIGATION - Target angle for any position
    // ============================================
    getTargetAngle(x, y) {
        const section = this.getSection(x, y);
        if (!section) return 0;

        // Straights have fixed direction
        if (section.type === 'straight') {
            return section.direction;
        }

        // Curves - calculate tangent to circle
        const dx = x - section.centerX;
        const dy = y - section.centerY;

        // The tangent direction depends on which way horses travel around the curve.
        // Testing key points:
        // - Left of left curve (100, 600): should point DOWN (90°)
        //   dx=-290, dy=0 → need formula that gives 90°
        // - Top of right curve (2010, 300): should point LEFT (180°)
        //   dx=0, dy=-300 → need formula that gives 180°
        //
        // Formula: atan2(-dx, dy) works for both!
        // - Left curve (100,600): atan2(290, 0) = 90° ✓
        // - Right curve (2010,300): atan2(0, -300) = 180° ✓

        return Math.atan2(-dx, dy) * (180 / Math.PI);
    },

    // ============================================
    // COLLISION DETECTION
    // ============================================
    isOnTrack(x, y) {
        const section = this.getSection(x, y);
        if (!section) return false;

        if (section.type === 'straight') {
            // Check Y is within lane bounds
            const minY = Math.min(section.innerY, section.outerY);
            const maxY = Math.max(section.innerY, section.outerY);
            return y >= minY && y <= maxY;
        }

        // Curve - check radius
        const dx = x - section.centerX;
        const dy = y - section.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist >= section.innerRadius && dist <= section.outerRadius;
    },

    isColliding(x, y) {
        return !this.isOnTrack(x, y);
    },

    // ============================================
    // LANE POSITION (-1 = inner, 0 = center, +1 = outer)
    // ============================================
    getLaneOffset(x, y) {
        const section = this.getSection(x, y);
        if (!section) return 0;

        if (section.type === 'straight') {
            const distFromCenter = y - section.centerY;
            const halfLane = this.LANE_WIDTH / 2;
            // For top straight, outer is negative Y (up)
            // For bottom straight, outer is positive Y (down)
            if (section.name === 'TOP_STRAIGHT') {
                return -distFromCenter / halfLane;  // Flip sign for top
            }
            return distFromCenter / halfLane;
        }

        // Curve
        const dx = x - section.centerX;
        const dy = y - section.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const centerRadius = (section.innerRadius + section.outerRadius) / 2;
        const halfLane = this.LANE_WIDTH / 2;

        return (dist - centerRadius) / halfLane;
    },

    // ============================================
    // RACING LINE - ideal position at any point
    // ============================================
    getRacingLinePoint(x, y) {
        const section = this.getSection(x, y);
        if (!section) return { x, y };

        if (section.type === 'straight') {
            return { x, y: section.centerY };
        }

        // Curve - project to center radius
        const dx = x - section.centerX;
        const dy = y - section.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const centerRadius = (section.innerRadius + section.outerRadius) / 2;

        if (dist === 0) return { x: section.centerX + centerRadius, y: section.centerY };

        const scale = centerRadius / dist;
        return {
            x: section.centerX + dx * scale,
            y: section.centerY + dy * scale
        };
    },

    // ============================================
    // SPAWN POSITIONS - for starting gate
    // ============================================
    getSpawnPositions(numHorses, gateX = null) {
        if (!this.initialized) this.init();

        // Default gate position in bottom straight
        const x = gateX || this.START_LINE_X;
        const section = this.sections.BOTTOM_STRAIGHT;

        const positions = [];
        const laneStep = this.LANE_WIDTH / (numHorses + 1);

        for (let i = 0; i < numHorses; i++) {
            const laneOffset = section.innerY + laneStep * (i + 1);
            positions.push({
                x: x,
                y: laneOffset,
                angle: 0  // Facing right (direction of bottom straight)
            });
        }

        return positions;
    },

    // ============================================
    // DISTANCE CALCULATION (for race position)
    // ============================================
    getTrackDistance(x, y, lap = 0) {
        const section = this.getSection(x, y);
        if (!section) return lap * this.getTotalTrackLength();

        let distance = 0;

        // Calculate distance based on section
        // Track order: BOTTOM_STRAIGHT → RIGHT_CURVE → TOP_STRAIGHT → LEFT_CURVE → (repeat)

        if (section.name === 'BOTTOM_STRAIGHT') {
            // Distance from start of bottom straight (left side)
            const progress = (x - section.xMin) / (section.xMax - section.xMin);
            distance = progress * this.STRAIGHT_LENGTH;
        }
        else if (section.name === 'RIGHT_CURVE') {
            // Full bottom straight + arc progress
            distance = this.STRAIGHT_LENGTH;
            const dx = x - section.centerX;
            const dy = y - section.centerY;
            let angle = Math.atan2(dy, dx);
            // Normalize: 0 at bottom, PI at top
            if (angle < 0) angle += Math.PI * 2;
            // CCW from bottom (angle 1.5PI) to top (angle 0.5PI)
            let arcProgress = (Math.PI * 1.5 - angle) / Math.PI;
            if (arcProgress < 0) arcProgress += 2;
            if (arcProgress > 1) arcProgress -= 1;
            distance += arcProgress * Math.PI * this.CURVE_RADIUS;
        }
        else if (section.name === 'TOP_STRAIGHT') {
            // Full bottom straight + full right curve + straight progress
            distance = this.STRAIGHT_LENGTH + Math.PI * this.CURVE_RADIUS;
            const progress = (section.xMax - x) / (section.xMax - section.xMin);
            distance += progress * this.STRAIGHT_LENGTH;
        }
        else if (section.name === 'LEFT_CURVE') {
            // Full bottom + right curve + top straight + arc progress
            distance = 2 * this.STRAIGHT_LENGTH + Math.PI * this.CURVE_RADIUS;
            const dx = x - section.centerX;
            const dy = y - section.centerY;
            let angle = Math.atan2(dy, dx);
            // Normalize: PI/2 at top, -PI/2 at bottom
            // CW from top (0.5PI) to bottom (-0.5PI or 1.5PI)
            let arcProgress = (angle - Math.PI * 0.5) / Math.PI;
            if (arcProgress < 0) arcProgress += 2;
            if (arcProgress > 1) arcProgress = 1;
            distance += arcProgress * Math.PI * this.CURVE_RADIUS;
        }

        return distance + lap * this.getTotalTrackLength();
    },

    getTotalTrackLength() {
        // Two straights + two semicircles
        return 2 * this.STRAIGHT_LENGTH + 2 * Math.PI * this.CURVE_RADIUS;
    }
};

// Auto-initialize
TrackGeometry.init();

// Expose globally
window.TrackGeometry = TrackGeometry;
