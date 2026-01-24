// Horse Racing - Clean Horse Class
// Simple, understandable horse behavior using TrackGeometry

// Horse colors
const HORSE_COLORS = [
    [139, 69, 19],   // Brown
    [101, 67, 33],   // Dark brown
    [210, 180, 140], // Tan
    [139, 115, 85],  // Light brown
    [70, 50, 40],    // Dark chestnut
    [180, 140, 100], // Palomino
    [255, 255, 255], // White
    [50, 50, 50],    // Black
    [255, 182, 193]  // Pink
];

const HORSE_SPRITE_SCALE = 5;

class Horse {
    constructor(initPosition, colorIndex = 0, horseNumber = 1, horseImage = null) {
        // Identity
        this.number = horseNumber;
        this.color = HORSE_COLORS[colorIndex % HORSE_COLORS.length];
        this.horseImage = horseImage;
        this.tintedImage = null;

        // Position
        this.position = new Vector2(initPosition.x, initPosition.y);
        this.previousPosition = new Vector2(initPosition.x, initPosition.y);

        // Speed characteristics (randomized per horse)
        const variance = 0.85 + Math.random() * 0.3;  // 0.85 to 1.15
        this.baseSpeed = 200 * variance;              // Cruising speed
        this.maxSpeed = 280 * variance;               // Sprint speed
        this.acceleration = 100 * variance;           // How fast they speed up

        // Current movement state
        this.velocity = 0;
        this.steer_angle = 0;          // Current heading (degrees)
        this.targetAngle = 0;          // Where we want to point

        // Steering characteristics
        this.steeringSpeed = 3.0;       // How fast we turn (degrees per frame)
        this.steeringSmooth = 0.15;     // Smoothing factor

        // State
        this.is_running = false;
        this.race_time = 0;
        this.lap = 0;

        // Lane preference (0 = inner, 1 = outer)
        this.lanePreference = Math.random();

        // Collision avoidance
        this.nearby_horses = [];
        this.awarenessRadius = 100;

        // Player data
        this.playerName = null;
        this.playerId = null;
        this.avatarUrl = null;
        this.avatarElement = null;

        // Apply color tint when image is ready
        if (horseImage && horseImage.complete) {
            this.applyColorTint();
        }
    }

    applyColorTint() {
        if (!this.horseImage || this.tintedImage) return;

        const canvas = document.createElement('canvas');
        canvas.width = this.horseImage.width;
        canvas.height = this.horseImage.height;
        const ctx = canvas.getContext('2d');

        // Draw sprite as-is (assuming it faces RIGHT at 0°)
        ctx.drawImage(this.horseImage, 0, 0);

        // Apply color multiply
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${this.color[0]}, ${this.color[1]}, ${this.color[2]})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Restore alpha from original
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(this.horseImage, 0, 0);

        this.tintedImage = canvas;
    }

    getVecRotated() {
        const rad = this.steer_angle * Math.PI / 180;
        return new Vector2(Math.cos(rad), Math.sin(rad));
    }

    startRunning() {
        this.is_running = true;
    }

    updateAwareness(allHorses) {
        this.nearby_horses = [];
        for (const other of allHorses) {
            if (other === this) continue;
            const dist = this.position.distance(other.position);
            if (dist < this.awarenessRadius) {
                const dir = other.position.subtract(this.position).normalize();
                this.nearby_horses.push({ horse: other, distance: dist, direction: dir });
            }
        }
    }

    update(dt, allHorses = []) {
        if (!this.is_running) return;

        this.race_time += dt;
        this.previousPosition = new Vector2(this.position.x, this.position.y);

        // 1. Decide where to steer
        this.think();

        // 2. Apply steering smoothly
        this.applySteering(dt);

        // 3. Update velocity
        this.updateVelocity(dt);

        // 4. Move
        this.move(dt);

        // 5. Keep on track (emergency correction)
        this.enforceTrackBounds();
    }

    think() {
        const x = this.position.x;
        const y = this.position.y;

        // Get ideal direction from track geometry
        let targetAngle = TrackGeometry.getTargetAngle(x, y);

        // Add lane offset steering
        const currentLane = TrackGeometry.getLaneOffset(x, y);
        const desiredLane = (this.lanePreference - 0.5) * 2;  // -1 to +1
        const laneDiff = desiredLane - currentLane;

        // Steer toward preferred lane (subtle adjustment)
        // The sign depends on which direction moves us toward desired lane
        const section = TrackGeometry.getSection(x, y);
        if (section) {
            // In curves, + steer angle = tighter curve = toward inner
            // So if we want outer (positive laneDiff), we need negative adjustment
            if (section.type === 'curve') {
                targetAngle -= laneDiff * 2;
            } else {
                // In straights, it depends on direction
                // Bottom straight (going right): + angle = turn down = toward outer
                // Top straight (going left): + angle = turn up = toward outer (from top perspective)
                if (section.name === 'BOTTOM_STRAIGHT') {
                    targetAngle += laneDiff * 2;
                } else {
                    targetAngle -= laneDiff * 2;
                }
            }
        }

        // Collision avoidance
        for (const { horse: other, distance, direction } of this.nearby_horses) {
            if (distance < 60) {
                // Steer away from nearby horses
                const myDir = this.getVecRotated();
                const cross = myDir.x * direction.y - myDir.y * direction.x;
                const avoidStrength = (60 - distance) / 60 * 5;
                targetAngle += cross > 0 ? -avoidStrength : avoidStrength;
            }
        }

        this.targetAngle = targetAngle;
    }

    applySteering(dt) {
        // Calculate angle difference
        let angleDiff = this.targetAngle - this.steer_angle;

        // Normalize to -180 to +180
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        // Apply steering with smoothing
        const steerAmount = angleDiff * this.steeringSmooth;
        const maxSteer = this.steeringSpeed;
        this.steer_angle += Math.max(-maxSteer, Math.min(maxSteer, steerAmount));
    }

    updateVelocity(dt) {
        // Accelerate toward base speed
        const targetSpeed = this.baseSpeed;

        if (this.velocity < targetSpeed) {
            this.velocity += this.acceleration * dt;
            this.velocity = Math.min(this.velocity, targetSpeed);
        }
    }

    move(dt) {
        const direction = this.getVecRotated();
        const movement = direction.multiply(this.velocity * dt);
        this.position = this.position.add(movement);
    }

    enforceTrackBounds() {
        // If we've gone off track, push back
        if (TrackGeometry.isColliding(this.position.x, this.position.y)) {
            // Find the racing line point and move toward it
            const racingPoint = TrackGeometry.getRacingLinePoint(this.position.x, this.position.y);

            // Blend position toward racing line
            this.position.x = this.position.x * 0.9 + racingPoint.x * 0.1;
            this.position.y = this.position.y * 0.9 + racingPoint.y * 0.1;
        }
    }
}

// Expose globally
window.Horse = Horse;
window.HORSE_COLORS = HORSE_COLORS;
window.HORSE_SPRITE_SCALE = HORSE_SPRITE_SCALE;
