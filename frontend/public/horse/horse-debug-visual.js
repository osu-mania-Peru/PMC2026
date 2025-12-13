// Horse Racing Simulator - Visual Debug Overlay
// Draws debug info directly on canvas

const VisualDebug = {
    enabled: false,

    // What to show
    show: {
        directions: true,      // Target vs actual heading arrows
        lanes: true,           // Lane preference indicator
        sections: true,        // Track section boundaries
        proximity: true,       // Awareness radius
        collisionRays: true,   // Wall detection rays
        stats: true,           // Per-horse stats overlay
    },

    toggle() {
        this.enabled = !this.enabled;
        console.log(`Visual debug: ${this.enabled ? 'ON' : 'OFF'}`);
    },

    render(ctx, horses, trackBounds, cameraOffset, cameraZoom) {
        if (!this.enabled || !horses || !trackBounds) return;

        // Don't save/restore - we're already inside the camera transform from race.js

        const trackW = trackBounds.width;
        const trackH = trackBounds.height;
        const cornerSize = trackH / 2;
        const centerY = trackH / 2;

        // Draw track sections
        if (this.show.sections) {
            this.drawSections(ctx, trackW, trackH, cornerSize, centerY);
        }

        // Draw per-horse debug
        for (const horse of horses) {
            const x = horse.position.x;
            const y = horse.position.y;

            // Direction arrows
            if (this.show.directions) {
                this.drawDirections(ctx, horse);
            }

            // Proximity radius
            if (this.show.proximity) {
                this.drawProximity(ctx, horse);
            }

            // Collision rays
            if (this.show.collisionRays) {
                this.drawCollisionRays(ctx, horse, trackBounds, cornerSize);
            }

            // Lane indicator
            if (this.show.lanes) {
                this.drawLaneIndicator(ctx, horse);
            }

            // Stats overlay
            if (this.show.stats) {
                this.drawStats(ctx, horse, trackW, cornerSize, centerY);
            }
        }
    },

    drawSections(ctx, trackW, trackH, cornerSize, centerY) {
        // Use Track API if available
        if (typeof Track === 'undefined' || !Track.initialized) return;

        const sections = Track.sections;
        ctx.globalAlpha = 0.2;

        // Top straight (racing lane)
        if (sections.TOP_STRAIGHT) {
            const s = sections.TOP_STRAIGHT;
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(s.xMin, s.laneOuterY, s.xMax - s.xMin, s.laneInnerY - s.laneOuterY);
        }

        // Bottom straight (racing lane)
        if (sections.BOTTOM_STRAIGHT) {
            const s = sections.BOTTOM_STRAIGHT;
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(s.xMin, s.laneInnerY, s.xMax - s.xMin, s.laneOuterY - s.laneInnerY);
        }

        // Right curve zone
        if (sections.RIGHT_CURVE) {
            const s = sections.RIGHT_CURVE;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(s.xMin, s.yMin, s.xMax - s.xMin, s.yMax - s.yMin);
        }

        // Left curve zone
        if (sections.LEFT_CURVE) {
            const s = sections.LEFT_CURVE;
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(s.xMin, s.yMin, s.xMax - s.xMin, s.yMax - s.yMin);
        }

        ctx.globalAlpha = 1.0;

        // Labels
        ctx.font = '24px monospace';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labels = [
            { text: 'RIGHT', x: (sections.RIGHT_CURVE.xMin + sections.RIGHT_CURVE.xMax) / 2, y: centerY },
            { text: 'LEFT', x: (sections.LEFT_CURVE.xMin + sections.LEFT_CURVE.xMax) / 2, y: centerY },
            { text: 'TOP', x: trackW / 2, y: sections.TOP_STRAIGHT?.racingLineY || 200 },
            { text: 'BOTTOM', x: trackW / 2, y: sections.BOTTOM_STRAIGHT?.racingLineY || trackH - 200 },
        ];

        for (const label of labels) {
            ctx.strokeText(label.text, label.x, label.y);
            ctx.fillText(label.text, label.x, label.y);
        }
    },

    drawDirections(ctx, horse) {
        const x = horse.position.x;
        const y = horse.position.y;
        const currentDir = horse.getVecRotated();

        // Current heading (green)
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + currentDir.x * 60, y + currentDir.y * 60);
        ctx.stroke();

        // Arrow head
        const arrowSize = 10;
        const angle = Math.atan2(currentDir.y, currentDir.x);
        ctx.beginPath();
        ctx.moveTo(x + currentDir.x * 60, y + currentDir.y * 60);
        ctx.lineTo(
            x + currentDir.x * 60 - arrowSize * Math.cos(angle - 0.5),
            y + currentDir.y * 60 - arrowSize * Math.sin(angle - 0.5)
        );
        ctx.moveTo(x + currentDir.x * 60, y + currentDir.y * 60);
        ctx.lineTo(
            x + currentDir.x * 60 - arrowSize * Math.cos(angle + 0.5),
            y + currentDir.y * 60 - arrowSize * Math.sin(angle + 0.5)
        );
        ctx.stroke();

        // Target heading (yellow dashed)
        if (horse.target_angle !== undefined) {
            const targetRad = (horse.target_angle) * Math.PI / 180;
            const baseRad = Math.atan2(horse.vector.y, horse.vector.x);
            const targetDir = {
                x: Math.cos(baseRad + targetRad * Math.PI / 180),
                y: Math.sin(baseRad + targetRad * Math.PI / 180)
            };

            ctx.strokeStyle = '#ffff00';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + targetDir.x * 50, y + targetDir.y * 50);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },

    drawProximity(ctx, horse) {
        const x = horse.position.x;
        const y = horse.position.y;

        // Awareness radius
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, horse.proximity_radius, 0, Math.PI * 2);
        ctx.stroke();

        // Highlight nearby horses
        for (const { horse: other, distance } of horse.nearby_horses || []) {
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(other.position.x, other.position.y);
            ctx.stroke();
        }
    },

    drawCollisionRays(ctx, horse, trackBounds, cornerSize) {
        const x = horse.position.x;
        const y = horse.position.y;
        const currentDir = horse.getVecRotated();

        const lookDistances = [50, 100, 150];
        const colors = ['#00ff00', '#ffff00', '#ff0000'];

        for (let i = 0; i < lookDistances.length; i++) {
            const dist = lookDistances[i];
            const endX = x + currentDir.x * dist;
            const endY = y + currentDir.y * dist;

            // Check if this ray hits a wall (simplified check)
            const hitsWall = endX < 0 || endX > trackBounds.width ||
                             endY < 0 || endY > trackBounds.height;

            ctx.strokeStyle = hitsWall ? '#ff0000' : colors[i];
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Dot at end
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(endX, endY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    },

    drawLaneIndicator(ctx, horse) {
        const x = horse.position.x;
        const y = horse.position.y;

        // Lane preference bar
        const barWidth = 30;
        const barHeight = 6;
        const barX = x - barWidth / 2;
        const barY = y - 35;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        // Gradient from inner (blue) to outer (red)
        const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        gradient.addColorStop(0, '#0088ff');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, '#ff8800');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Current preference marker
        const markerX = barX + horse.lanePreference * barWidth;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(markerX, barY - 3);
        ctx.lineTo(markerX - 4, barY + barHeight + 3);
        ctx.lineTo(markerX + 4, barY + barHeight + 3);
        ctx.closePath();
        ctx.fill();
    },

    drawStats(ctx, horse, trackW, cornerSize, centerY) {
        const x = horse.position.x;
        const y = horse.position.y;

        // Determine section using Track API
        let section = '?';
        if (typeof Track !== 'undefined' && Track.initialized) {
            const sectionName = Track.getSectionName(x, y);
            section = sectionName.charAt(0); // T, B, L, R
        } else {
            if (x > trackW - cornerSize) section = 'R';
            else if (x < cornerSize) section = 'L';
            else if (y < centerY) section = 'T';
            else section = 'B';
        }

        // Build stats text
        const vel = horse.velocity?.toFixed(0) || '?';
        const angle = horse.steer_angle?.toFixed(0) || '?';
        const stamina = horse.stamina?.toFixed(0) || '-';

        const text = `#${horse.number} ${section} v${vel} a${angle}° s${stamina}`;

        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Background
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - textWidth / 2 - 4, y - 55, textWidth + 8, 16);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y - 42);

        // Drafting indicator
        if (horse.isDrafting) {
            ctx.fillStyle = '#00ffff';
            ctx.fillText('DRAFT', x, y - 68);
        }

        // Final kick indicator
        if (horse.finalKickActivated) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillText('KICK!', x, y - 68);
        }
    }
};

// Expose to window
window.vdebug = VisualDebug;

// Add keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && !e.ctrlKey) {
        VisualDebug.toggle();
    }
});

console.log('Visual debug loaded. Press V to toggle, or use vdebug.show.X = true/false');
