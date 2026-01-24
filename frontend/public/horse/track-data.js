// Horse Racing Simulator - Track Data & Navigation
// Clean interface for track geometry, collision, and navigation

const Track = {
    // Will be initialized from race.js
    initialized: false,

    // Core dimensions
    width: 0,
    height: 0,

    // Section definitions
    sections: {
        TOP_STRAIGHT: null,
        BOTTOM_STRAIGHT: null,
        LEFT_CURVE: null,
        RIGHT_CURVE: null,
    },

    // Initialize from race object
    init(race) {
        if (!race) return false;

        this.width = race.trackWidth;
        this.height = race.trackHeight;

        // Get fence positions
        const topOuter = race.top_sprint_top_fence;
        const topInner = race.top_sprint_bottom_fence;
        const botOuter = race.bottom_sprint_bottom_fence;
        const botInner = race.bottom_sprint_top_fence;

        // Get corner rectangles
        const cornerTL = race.topleft_corner;
        const cornerTR = race.topright_corner;
        const cornerBL = race.bottomleft_corner;
        const cornerBR = race.bottomright_corner;

        // Calculate curve centers and radii
        const cornerWidth = cornerTL.width;
        const centerY = this.height / 2;

        // Racing lane boundaries in straights (between fences)
        const topLaneOuterY = topOuter.y + topOuter.height;  // Bottom of outer fence
        const topLaneInnerY = topInner.y;                     // Top of inner fence
        const botLaneInnerY = botInner.y + botInner.height;  // Bottom of inner fence
        const botLaneOuterY = botOuter.y;                     // Top of outer fence

        // Define sections
        this.sections.TOP_STRAIGHT = {
            name: 'TOP_STRAIGHT',
            // Bounds for detection
            xMin: cornerTL.x + cornerTL.width,
            xMax: cornerTR.x,
            yMin: 0,
            yMax: centerY,
            // Racing lane (where horses should be)
            laneOuterY: topLaneOuterY,
            laneInnerY: topLaneInnerY,
            racingLineY: (topLaneOuterY + topLaneInnerY) / 2,
            laneWidth: topLaneInnerY - topLaneOuterY,
            // Navigation
            direction: 180,  // Go left
        };

        this.sections.BOTTOM_STRAIGHT = {
            name: 'BOTTOM_STRAIGHT',
            xMin: cornerBL.x + cornerBL.width,
            xMax: cornerBR.x,
            yMin: centerY,
            yMax: this.height,
            laneOuterY: botLaneOuterY,
            laneInnerY: botLaneInnerY,
            racingLineY: (botLaneInnerY + botLaneOuterY) / 2,
            laneWidth: botLaneOuterY - botLaneInnerY,
            direction: 0,  // Go right
        };

        this.sections.RIGHT_CURVE = {
            name: 'RIGHT_CURVE',
            xMin: cornerTR.x,
            xMax: this.width,
            yMin: 0,
            yMax: this.height,
            // Arc geometry - center is at inner corner of the rectangle
            center: { x: cornerTR.x, y: centerY },
            // Radii calculated from fence positions
            outerRadius: cornerWidth - 120,  // From race.js
            innerRadius: 240,                 // From race.js
            direction: 'curve',  // Use tangent calculation
        };

        this.sections.LEFT_CURVE = {
            name: 'LEFT_CURVE',
            xMin: 0,
            xMax: cornerTL.x + cornerTL.width,
            yMin: 0,
            yMax: this.height,
            center: { x: cornerTL.x + cornerTL.width, y: centerY },
            outerRadius: cornerWidth - 120,
            innerRadius: 240,
            direction: 'curve',  // Use tangent calculation
        };

        this.initialized = true;
        console.log('Track data initialized', {
            width: this.width,
            height: this.height,
            topLane: { outer: topLaneOuterY, inner: topLaneInnerY },
            botLane: { outer: botLaneOuterY, inner: botLaneInnerY },
        });

        return true;
    },

    // Get which section a point is in
    getSection(x, y) {
        if (!this.initialized) return null;

        const { TOP_STRAIGHT, BOTTOM_STRAIGHT, LEFT_CURVE, RIGHT_CURVE } = this.sections;

        // Check curves first (by X position)
        if (x >= RIGHT_CURVE.xMin) return RIGHT_CURVE;
        if (x <= LEFT_CURVE.xMax) return LEFT_CURVE;

        // Then straights (by Y position)
        if (y < TOP_STRAIGHT.yMax) return TOP_STRAIGHT;
        return BOTTOM_STRAIGHT;
    },

    // Get section name string
    getSectionName(x, y) {
        const section = this.getSection(x, y);
        return section ? section.name : 'UNKNOWN';
    },

    // Get target direction for a position
    getTargetAngle(x, y) {
        const section = this.getSection(x, y);
        if (!section) return 0;

        // Straights have fixed direction (number), curves need tangent calculation
        if (section.direction !== 'curve') {
            return section.direction;
        }

        // Curves - calculate tangent direction
        // Vector FROM center TO horse (radius direction)
        const fromCenter = {
            x: x - section.center.x,
            y: y - section.center.y
        };

        // In SCREEN coordinates (Y increases downward), the rotation directions are:
        // - LEFT curve: horses move CCW around inner center (top → left-side → bottom)
        // - RIGHT curve: horses move CW around inner center (bottom → right-side → top)
        let tangentAngle;

        if (section.name === 'LEFT_CURVE') {
            // CCW in screen coords: tangent = (-fromCenter.y, fromCenter.x)
            // Angle = atan2(fromCenter.x, -fromCenter.y)
            tangentAngle = Math.atan2(fromCenter.x, -fromCenter.y) * (180 / Math.PI);
        } else {
            // RIGHT_CURVE - CW in screen coords: tangent = (fromCenter.y, -fromCenter.x)
            // Angle = atan2(-fromCenter.x, fromCenter.y)
            tangentAngle = Math.atan2(-fromCenter.x, fromCenter.y) * (180 / Math.PI);
        }

        return tangentAngle;
    },

    // Get ideal racing line position for current location
    getRacingLineY(x, y) {
        const section = this.getSection(x, y);
        if (!section) return y;

        // Straights have a fixed racing line Y
        if (section.racingLineY !== undefined) {
            return section.racingLineY;
        }

        // Curves - racing line is at middle radius
        const middleRadius = (section.outerRadius + section.innerRadius) / 2;
        const dx = x - section.center.x;
        const dy = y - section.center.y;
        const currentRadius = Math.sqrt(dx * dx + dy * dy);

        // Return the Y on the racing line at same angle
        if (currentRadius === 0) return section.center.y;
        const scale = middleRadius / currentRadius;
        return section.center.y + dy * scale;
    },

    // Check if a point is in a wall/fence
    isColliding(x, y) {
        if (!this.initialized) return false;

        // Track bounds
        if (x < 0 || x > this.width || y < 0 || y > this.height) {
            return true;
        }

        const section = this.getSection(x, y);
        if (!section) return false;

        // Straights - check fence rectangles
        if (section.name === 'TOP_STRAIGHT' || section.name === 'BOTTOM_STRAIGHT') {
            if (section.name === 'TOP_STRAIGHT') {
                // Above outer fence or below inner fence
                if (y < section.laneOuterY || y > section.laneInnerY) {
                    return true;
                }
            } else {
                // Above inner fence or below outer fence
                if (y < section.laneInnerY || y > section.laneOuterY) {
                    return true;
                }
            }
        }

        // Curves - check radii
        if (section.name === 'RIGHT_CURVE' || section.name === 'LEFT_CURVE') {
            const dx = x - section.center.x;
            const dy = y - section.center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > section.outerRadius || dist < section.innerRadius) {
                return true;
            }
        }

        return false;
    },

    // Get distance to nearest edge (positive = safe, negative = in wall)
    getEdgeDistances(x, y) {
        const section = this.getSection(x, y);
        if (!section) return { inner: 0, outer: 0 };

        if (section.name === 'TOP_STRAIGHT') {
            return {
                outer: y - section.laneOuterY,  // Distance from outer (top) fence
                inner: section.laneInnerY - y,  // Distance from inner (bottom) fence
            };
        }

        if (section.name === 'BOTTOM_STRAIGHT') {
            return {
                inner: y - section.laneInnerY,  // Distance from inner (top) fence
                outer: section.laneOuterY - y,  // Distance from outer (bottom) fence
            };
        }

        // Curves
        const dx = x - section.center.x;
        const dy = y - section.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return {
            outer: section.outerRadius - dist,  // Distance from outer arc
            inner: dist - section.innerRadius,  // Distance from inner arc
        };
    },

    // Get lane offset for a position (-1 = inner edge, 0 = center, 1 = outer edge)
    getLaneOffset(x, y) {
        const section = this.getSection(x, y);
        if (!section) return 0;

        if (section.racingLineY !== undefined) {
            // Straights
            const distFromCenter = y - section.racingLineY;
            const halfLane = section.laneWidth / 2;
            return halfLane > 0 ? distFromCenter / halfLane : 0;
        }

        // Curves
        const dx = x - section.center.x;
        const dy = y - section.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const middleRadius = (section.outerRadius + section.innerRadius) / 2;
        const halfLane = (section.outerRadius - section.innerRadius) / 2;

        return halfLane > 0 ? (dist - middleRadius) / halfLane : 0;
    },
};

// Auto-initialize when race is ready
const initTrackWhenReady = () => {
    if (window.game?.race && !Track.initialized) {
        Track.init(window.game.race);
    }
};

// Try to init periodically until successful
const trackInitInterval = setInterval(() => {
    if (Track.initialized) {
        clearInterval(trackInitInterval);
    } else {
        initTrackWhenReady();
    }
}, 100);

// Expose globally
window.Track = Track;
