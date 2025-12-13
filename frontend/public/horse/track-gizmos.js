// Horse Racing - Track Gizmo Renderer
// Draws debug visualization of track geometry
// This is what you'll use as reference to draw the final art

const TrackGizmos = {
    // Colors for different elements
    colors: {
        background: '#4a7c4e',       // Grass green (infield)
        trackSurface: '#8B7355',     // Dirt brown
        innerRail: '#ffffff',         // White rail
        outerRail: '#ffffff',         // White rail
        racingLine: '#ffff00',        // Yellow center line
        startLine: '#00ff00',         // Green start
        finishLine: '#ff0000',        // Red finish
        sectionLabel: '#ffffff',      // White text
        directionArrow: '#00ffff',    // Cyan arrows
    },

    // Line widths
    railWidth: 4,
    racingLineWidth: 2,

    // ============================================
    // MAIN RENDER FUNCTION
    // ============================================
    render(ctx, showLabels = true, showDirections = true, showRacingLine = true) {
        if (!TrackGeometry.initialized) return;

        const TG = TrackGeometry;

        // 1. Draw background (infield grass)
        this.drawBackground(ctx, TG);

        // 2. Draw track surface
        this.drawTrackSurface(ctx, TG);

        // 3. Draw rails (boundaries)
        this.drawRails(ctx, TG);

        // 4. Draw racing line (center of lane)
        if (showRacingLine) {
            this.drawRacingLine(ctx, TG);
        }

        // 5. Draw start/finish lines
        this.drawStartFinishLines(ctx, TG);

        // 6. Draw direction arrows
        if (showDirections) {
            this.drawDirectionArrows(ctx, TG);
        }

        // 7. Draw section labels
        if (showLabels) {
            this.drawSectionLabels(ctx, TG);
        }
    },

    // ============================================
    // BACKGROUND (Infield)
    // ============================================
    drawBackground(ctx, TG) {
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, TG.TRACK_WIDTH, TG.TRACK_HEIGHT);
    },

    // ============================================
    // TRACK SURFACE
    // ============================================
    drawTrackSurface(ctx, TG) {
        ctx.fillStyle = this.colors.trackSurface;

        // Draw the track as a shape: outer boundary minus inner boundary
        ctx.beginPath();

        // Outer boundary
        const outerLeft = TG.sections.LEFT_CURVE.centerX;
        const outerRight = TG.sections.RIGHT_CURVE.centerX;

        // Bottom straight
        ctx.moveTo(outerLeft, TG.CENTER_Y + TG.OUTER_RADIUS);
        ctx.lineTo(outerRight, TG.CENTER_Y + TG.OUTER_RADIUS);
        // Right curve (go through the RIGHT side)
        ctx.arc(outerRight, TG.CENTER_Y, TG.OUTER_RADIUS, Math.PI * 0.5, -Math.PI * 0.5, true);
        // Top straight
        ctx.lineTo(outerLeft, TG.CENTER_Y - TG.OUTER_RADIUS);
        // Left curve (go through the LEFT side)
        ctx.arc(outerLeft, TG.CENTER_Y, TG.OUTER_RADIUS, -Math.PI * 0.5, Math.PI * 0.5, true);
        ctx.closePath();

        // Inner boundary (cut out)
        const innerLeft = TG.sections.LEFT_CURVE.centerX;
        const innerRight = TG.sections.RIGHT_CURVE.centerX;

        ctx.moveTo(innerLeft, TG.CENTER_Y + TG.INNER_RADIUS);
        ctx.lineTo(innerRight, TG.CENTER_Y + TG.INNER_RADIUS);
        ctx.arc(innerRight, TG.CENTER_Y, TG.INNER_RADIUS, Math.PI * 0.5, -Math.PI * 0.5, true);
        ctx.lineTo(innerLeft, TG.CENTER_Y - TG.INNER_RADIUS);
        ctx.arc(innerLeft, TG.CENTER_Y, TG.INNER_RADIUS, -Math.PI * 0.5, Math.PI * 0.5, true);
        ctx.closePath();

        // Fill with even-odd rule to cut out inner
        ctx.fill('evenodd');
    },

    // ============================================
    // RAILS (Inner and Outer boundaries)
    // ============================================
    drawRails(ctx, TG) {
        ctx.strokeStyle = this.colors.innerRail;
        ctx.lineWidth = this.railWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Inner rail
        ctx.beginPath();
        const innerLeft = TG.sections.LEFT_CURVE.centerX;
        const innerRight = TG.sections.RIGHT_CURVE.centerX;

        // Bottom straight
        ctx.moveTo(innerLeft, TG.CENTER_Y + TG.INNER_RADIUS);
        ctx.lineTo(innerRight, TG.CENTER_Y + TG.INNER_RADIUS);
        // Right curve (CCW from bottom to top)
        ctx.arc(innerRight, TG.CENTER_Y, TG.INNER_RADIUS, Math.PI * 0.5, -Math.PI * 0.5, true);
        // Top straight
        ctx.lineTo(innerLeft, TG.CENTER_Y - TG.INNER_RADIUS);
        // Left curve (CW from top to bottom - through the LEFT side)
        ctx.arc(innerLeft, TG.CENTER_Y, TG.INNER_RADIUS, -Math.PI * 0.5, Math.PI * 0.5, true);
        ctx.closePath();
        ctx.stroke();

        // Outer rail
        ctx.strokeStyle = this.colors.outerRail;
        ctx.beginPath();
        const outerLeft = TG.sections.LEFT_CURVE.centerX;
        const outerRight = TG.sections.RIGHT_CURVE.centerX;

        ctx.moveTo(outerLeft, TG.CENTER_Y + TG.OUTER_RADIUS);
        ctx.lineTo(outerRight, TG.CENTER_Y + TG.OUTER_RADIUS);
        ctx.arc(outerRight, TG.CENTER_Y, TG.OUTER_RADIUS, Math.PI * 0.5, -Math.PI * 0.5, true);
        ctx.lineTo(outerLeft, TG.CENTER_Y - TG.OUTER_RADIUS);
        // Left curve (CW from top to bottom - through the LEFT side)
        ctx.arc(outerLeft, TG.CENTER_Y, TG.OUTER_RADIUS, -Math.PI * 0.5, Math.PI * 0.5, true);
        ctx.closePath();
        ctx.stroke();
    },

    // ============================================
    // RACING LINE (Center of lane)
    // ============================================
    drawRacingLine(ctx, TG) {
        ctx.strokeStyle = this.colors.racingLine;
        ctx.lineWidth = this.racingLineWidth;
        ctx.setLineDash([20, 20]);

        ctx.beginPath();
        const centerLeft = TG.sections.LEFT_CURVE.centerX;
        const centerRight = TG.sections.RIGHT_CURVE.centerX;

        // Bottom straight
        ctx.moveTo(centerLeft, TG.CENTER_Y + TG.CURVE_RADIUS);
        ctx.lineTo(centerRight, TG.CENTER_Y + TG.CURVE_RADIUS);
        // Right curve
        ctx.arc(centerRight, TG.CENTER_Y, TG.CURVE_RADIUS, Math.PI * 0.5, -Math.PI * 0.5, true);
        // Top straight
        ctx.lineTo(centerLeft, TG.CENTER_Y - TG.CURVE_RADIUS);
        // Left curve (through the LEFT side)
        ctx.arc(centerLeft, TG.CENTER_Y, TG.CURVE_RADIUS, -Math.PI * 0.5, Math.PI * 0.5, true);
        ctx.closePath();
        ctx.stroke();

        ctx.setLineDash([]);
    },

    // ============================================
    // START/FINISH LINES
    // ============================================
    drawStartFinishLines(ctx, TG) {
        const bottomY = TG.sections.BOTTOM_STRAIGHT;
        const lineTop = bottomY.innerY;
        const lineBottom = bottomY.outerY;

        // Start line (green)
        ctx.strokeStyle = this.colors.startLine;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(TG.START_LINE_X, lineTop);
        ctx.lineTo(TG.START_LINE_X, lineBottom);
        ctx.stroke();

        // Start label
        ctx.fillStyle = this.colors.startLine;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('START', TG.START_LINE_X, lineBottom + 25);

        // Finish line (checkered pattern)
        const finishX = TG.FINISH_LINE_X;
        const checkerSize = 15;
        const numCheckers = Math.ceil((lineBottom - lineTop) / checkerSize);

        for (let i = 0; i < numCheckers; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
            ctx.fillRect(finishX - 4, lineTop + i * checkerSize, 8, checkerSize);
        }

        // Finish label
        ctx.fillStyle = this.colors.finishLine;
        ctx.fillText('FINISH', finishX, lineBottom + 25);
    },

    // ============================================
    // DIRECTION ARROWS
    // ============================================
    drawDirectionArrows(ctx, TG) {
        ctx.fillStyle = this.colors.directionArrow;
        ctx.strokeStyle = this.colors.directionArrow;
        ctx.lineWidth = 3;

        const arrowSize = 20;

        // Use TrackGeometry.getTargetAngle() for ALL arrows - guarantees they match horse navigation

        // Bottom straight
        for (let x = TG.sections.BOTTOM_STRAIGHT.xMin + 100; x < TG.sections.BOTTOM_STRAIGHT.xMax - 100; x += 200) {
            const y = TG.sections.BOTTOM_STRAIGHT.centerY;
            this.drawArrow(ctx, x, y, TG.getTargetAngle(x, y), arrowSize);
        }

        // Top straight
        for (let x = TG.sections.TOP_STRAIGHT.xMax - 100; x > TG.sections.TOP_STRAIGHT.xMin + 100; x -= 200) {
            const y = TG.sections.TOP_STRAIGHT.centerY;
            this.drawArrow(ctx, x, y, TG.getTargetAngle(x, y), arrowSize);
        }

        // Right curve - sample points along the arc
        const rightCenter = TG.sections.RIGHT_CURVE;
        for (let a = -Math.PI * 0.4; a < Math.PI * 0.4; a += Math.PI / 5) {
            const x = rightCenter.centerX + Math.cos(a) * TG.CURVE_RADIUS;
            const y = rightCenter.centerY + Math.sin(a) * TG.CURVE_RADIUS;
            this.drawArrow(ctx, x, y, TG.getTargetAngle(x, y), arrowSize);
        }

        // Left curve - sample points along the arc
        const leftCenter = TG.sections.LEFT_CURVE;
        for (let a = Math.PI * 0.6; a < Math.PI * 1.4; a += Math.PI / 5) {
            const x = leftCenter.centerX + Math.cos(a) * TG.CURVE_RADIUS;
            const y = leftCenter.centerY + Math.sin(a) * TG.CURVE_RADIUS;
            this.drawArrow(ctx, x, y, TG.getTargetAngle(x, y), arrowSize);
        }
    },

    drawArrow(ctx, x, y, angleDeg, size) {
        const angle = angleDeg * Math.PI / 180;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.5, -size * 0.5);
        ctx.lineTo(-size * 0.3, 0);
        ctx.lineTo(-size * 0.5, size * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    },

    // ============================================
    // SECTION LABELS
    // ============================================
    drawSectionLabels(ctx, TG) {
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Background for readability
        const drawLabel = (text, x, y) => {
            const metrics = ctx.measureText(text);
            const padding = 8;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x - metrics.width / 2 - padding, y - 14, metrics.width + padding * 2, 28);
            ctx.fillStyle = this.colors.sectionLabel;
            ctx.fillText(text, x, y);
        };

        // Section labels
        drawLabel('BOTTOM STRAIGHT', TG.CENTER_X, TG.sections.BOTTOM_STRAIGHT.centerY);
        drawLabel('TOP STRAIGHT', TG.CENTER_X, TG.sections.TOP_STRAIGHT.centerY);
        drawLabel('RIGHT CURVE', TG.sections.RIGHT_CURVE.centerX, TG.CENTER_Y);
        drawLabel('LEFT CURVE', TG.sections.LEFT_CURVE.centerX, TG.CENTER_Y);

        // Dimension labels
        ctx.font = '14px monospace';
        drawLabel(`Track: ${TG.TRACK_WIDTH} x ${TG.TRACK_HEIGHT}`, TG.CENTER_X, 30);
        drawLabel(`Lane: ${TG.LANE_WIDTH}px | Curve R: ${TG.CURVE_RADIUS}px`, TG.CENTER_X, TG.TRACK_HEIGHT - 30);
    },

    // ============================================
    // DEBUG: Draw a specific point
    // ============================================
    drawPoint(ctx, x, y, color = '#ff00ff', size = 8) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    },

    // ============================================
    // DEBUG: Draw section boundaries
    // ============================================
    drawSectionBounds(ctx, TG) {
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        // Vertical lines at curve/straight boundaries
        ctx.beginPath();
        ctx.moveTo(TG.sections.LEFT_CURVE.xMax, 0);
        ctx.lineTo(TG.sections.LEFT_CURVE.xMax, TG.TRACK_HEIGHT);
        ctx.moveTo(TG.sections.RIGHT_CURVE.xMin, 0);
        ctx.lineTo(TG.sections.RIGHT_CURVE.xMin, TG.TRACK_HEIGHT);
        ctx.stroke();

        // Horizontal line at center
        ctx.beginPath();
        ctx.moveTo(TG.sections.LEFT_CURVE.xMax, TG.CENTER_Y);
        ctx.lineTo(TG.sections.RIGHT_CURVE.xMin, TG.CENTER_Y);
        ctx.stroke();

        ctx.setLineDash([]);
    }
};

// Expose globally
window.TrackGizmos = TrackGizmos;
