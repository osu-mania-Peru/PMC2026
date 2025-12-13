// Horse Racing Simulator - Core Horse Class (Clean Slate)
// Minimal implementation - just position, velocity, basic steering

class Horse {
    constructor(initPosition, colorIndex = 0, horseNumber = 1, horseImage = null) {
        // Basic identity
        this.number = horseNumber;
        this.color = HORSE_COLORS[colorIndex % HORSE_COLORS.length];
        this.horseImage = horseImage;
        this.tintedImage = null;

        // Position & dimensions
        this.position = new Vector2(initPosition.x, initPosition.y);
        this.previous_position = new Vector2(initPosition.x, initPosition.y);
        this.width = 30;
        this.height = 30;

        // Movement - simple random variance
        const speedVariance = 0.9 + Math.random() * 0.2;
        this.base_velocity = 180 * speedVariance;
        this.velocity = 0;
        this.max_velocity = 260 * speedVariance;
        this.acceleration = (80 + Math.random() * 20) * speedVariance;

        // Steering
        this.steer_angle = 0;
        this.vector = new Vector2(-1, 0);
        this.target_angle = 0;
        this.steering_smoothness = 0.1;

        // State
        this.is_running = false;
        this.race_time = 0.0;

        // Track progress
        this.lap = 0;
        this.total_progress = 0;

        // For collision avoidance
        this.nearby_horses = [];
        this.proximity_radius = 80; // Increased for better awareness

        // Lane preference (0 = inner rail, 1 = outer)
        // Spread horses across lanes
        this.lanePreference = Math.random();
        this.laneWidth = 120; // How far from inner to outer edge

        // Running style (display only)
        const styles = Object.values(RUNNING_STYLES);
        this.running_style = styles[Math.floor(Math.random() * styles.length)];

        // Player data (set externally)
        this.playerName = null;
        this.playerId = null;
        this.avatarUrl = null;
        this.avatarElement = null;

        // Compatibility properties (for race.js rendering)
        this.power = 0.6 + Math.random() * 0.4;
        this.repositioning_active = false;
        this.centrifugal_force = 0;

        // Debug display (unused in core but race.js reads them)
        this.acceleration_skill = 1.0;
        this.top_speed_skill = 1.0;
        this.corner_skill = 1.0;
        this.gate_skill = 1.0;
        this.stamina_efficiency = 1.0;

        // Compatibility with umasim.js
        this.enable_inner_fence_hugging = false;
        this.late_surge_activated = false;

        // Apply layered features (if available)
        if (typeof HorseLayers !== 'undefined') {
            HorseLayers.applyAll(this);
        }
    }

    // Stub for compatibility with race.js
    detectHorsesAhead(allHorses) {
        // No-op in core version
    }

    applyColorTint() {
        if (!this.horseImage || this.tintedImage) return;

        const canvas = document.createElement('canvas');
        canvas.width = this.horseImage.height;
        canvas.height = this.horseImage.width;
        const ctx = canvas.getContext('2d');

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-90 * Math.PI / 180);
        ctx.translate(-this.horseImage.width / 2, -this.horseImage.height / 2);
        ctx.drawImage(this.horseImage, 0, 0);

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${this.color[0]}, ${this.color[1]}, ${this.color[2]})`;
        ctx.fillRect(-this.horseImage.width, -this.horseImage.height, this.horseImage.width * 3, this.horseImage.height * 3);

        ctx.globalCompositeOperation = 'destination-in';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-90 * Math.PI / 180);
        ctx.translate(-this.horseImage.width / 2, -this.horseImage.height / 2);
        ctx.drawImage(this.horseImage, 0, 0);

        this.tintedImage = canvas;
    }

    getVecRotated() {
        return this.vector.rotate(this.steer_angle);
    }

    // Simple awareness - just track nearby horses
    updateAwareness(allHorses) {
        this.nearby_horses = [];
        for (const other of allHorses) {
            if (other === this) continue;
            const distance = this.position.distance(other.position);
            if (distance <= this.proximity_radius) {
                const toOther = other.position.subtract(this.position).normalize();
                this.nearby_horses.push({ horse: other, distance, direction: toOther });
            }
        }
    }

    // Check if point is in fence (for steering)
    isPointInFence(point, cornerData, trackBounds) {
        if (point.x < trackBounds.x || point.x > trackBounds.x + trackBounds.width ||
            point.y < trackBounds.y || point.y > trackBounds.y + trackBounds.height) {
            return true;
        }

        // Check sprint fences (rectangular barriers in straights)
        const race = window.game?.race;
        if (race) {
            const fences = [
                race.top_sprint_top_fence,
                race.top_sprint_bottom_fence,
                race.bottom_sprint_top_fence,
                race.bottom_sprint_bottom_fence
            ];
            for (const fence of fences) {
                if (fence &&
                    point.x >= fence.x && point.x <= fence.x + fence.width &&
                    point.y >= fence.y && point.y <= fence.y + fence.height) {
                    return true;
                }
            }
        }

        for (const corner of cornerData) {
            const [cornerRect, outerCenter, outerRadius, innerCenter, innerRadius] = corner;

            if (point.x >= cornerRect.x && point.x <= cornerRect.x + cornerRect.width &&
                point.y >= cornerRect.y && point.y <= cornerRect.y + cornerRect.height) {
                if (point.distance(outerCenter) > outerRadius) return true;
            }

            if (point.distance(innerCenter) < innerRadius) return true;
        }

        return false;
    }

    // Track geometry navigation - follow the oval
    think(cornerData, trackBounds) {
        if (!this.is_running || this.race_time < 0.3) return;
        if (!trackBounds) return;

        const currentDir = this.getVecRotated();
        const x = this.position.x;
        const y = this.position.y;

        // Get actual track geometry
        const race = window.game?.race;
        if (!race) return;

        const trackW = trackBounds.width;
        const trackH = trackBounds.height;

        // Use actual corner positions
        const leftCornerRight = race.topleft_corner ? race.topleft_corner.x + race.topleft_corner.width : trackH / 2;
        const rightCornerLeft = race.topright_corner ? race.topright_corner.x : trackW - trackH / 2;

        // Use actual sprint fence positions for center line
        const topSprintBottom = race.top_sprint_bottom_fence ? race.top_sprint_bottom_fence.y : trackH * 0.4;
        const botSprintTop = race.bottom_sprint_top_fence ? race.bottom_sprint_top_fence.y + race.bottom_sprint_top_fence.height : trackH * 0.6;
        const centerY = (topSprintBottom + botSprintTop) / 2;

        // === DETERMINE TRACK SECTION & TARGET DIRECTION ===
        let targetAngle = 0; // degrees, 0 = right, 90 = down, 180 = left, -90 = up

        // Right side (corners) - curving
        if (x > rightCornerLeft) {
            const cornerCenterX = rightCornerLeft;
            const cornerCenterY = centerY;
            const toCenter = new Vector2(cornerCenterX - x, cornerCenterY - y);
            // Tangent to circle (perpendicular to radius, clockwise)
            targetAngle = Math.atan2(toCenter.x, -toCenter.y) * (180 / Math.PI);
        }
        // Left side (corners) - curving
        else if (x < leftCornerRight) {
            const cornerCenterX = leftCornerRight;
            const cornerCenterY = centerY;
            const toCenter = new Vector2(cornerCenterX - x, cornerCenterY - y);
            // Tangent to circle (perpendicular to radius, clockwise)
            targetAngle = Math.atan2(toCenter.x, -toCenter.y) * (180 / Math.PI);
        }
        // Top straight - go left
        else if (y < centerY) {
            targetAngle = 180;
        }
        // Bottom straight - go right
        else {
            targetAngle = 0;
        }

        // Current heading
        const currentAngle = Math.atan2(currentDir.y, currentDir.x) * (180 / Math.PI);

        // Calculate angle difference
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        // Steer toward target direction
        const steerStrength = Math.min(Math.abs(angleDiff) * 0.12, 6);
        this.target_angle = this.steer_angle + Math.sign(angleDiff) * steerStrength;

        // === WALL AVOIDANCE ===
        const lookDistances = [50, 100, 150];
        let wallAvoidance = 0;

        for (const lookAhead of lookDistances) {
            const aheadPoint = this.position.add(currentDir.multiply(lookAhead));

            if (cornerData && this.isPointInFence(aheadPoint, cornerData, trackBounds)) {
                const leftDir = this.vector.rotate(this.steer_angle + 35).normalize();
                const rightDir = this.vector.rotate(this.steer_angle - 35).normalize();
                const leftClear = !this.isPointInFence(this.position.add(leftDir.multiply(lookAhead)), cornerData, trackBounds);
                const rightClear = !this.isPointInFence(this.position.add(rightDir.multiply(lookAhead)), cornerData, trackBounds);

                const urgency = (180 - lookAhead) / 40;

                if (leftClear && !rightClear) {
                    wallAvoidance += 5 * urgency;
                } else if (rightClear && !leftClear) {
                    wallAvoidance -= 5 * urgency;
                } else if (!leftClear && !rightClear) {
                    // Emergency - turn hard
                    wallAvoidance += 10 * urgency;
                }
                break;
            }
        }

        this.target_angle += wallAvoidance;

        // === LANE SEEKING ===
        // Calculate ideal lane position and steer toward it
        const laneOffset = (this.lanePreference - 0.5) * this.laneWidth;

        // Perpendicular to current direction (positive = left of travel)
        const perpLeft = new Vector2(-currentDir.y, currentDir.x);

        // In corners, "inner" means toward corner center
        // In straights, we use perpendicular offset
        let laneSteer = 0;

        if (x > rightCornerLeft || x < leftCornerRight) {
            // In corner - inner = toward center of oval
            const ovalCenterY = centerY;
            const toCenter = ovalCenterY - y;
            const desiredOffset = laneOffset;

            // If we're not at our preferred lane, steer toward it
            const currentOffset = -toCenter;
            const laneDiff = (desiredOffset - currentOffset) * 0.01;
            laneSteer = Math.max(-2, Math.min(2, laneDiff));
        } else {
            // In straight - calculate perpendicular offset from racing line
            // Use actual fence positions for racing line center
            let racingLineY;
            if (y < centerY) {
                // Top sprint - center between fences
                const topFenceBottom = race.top_sprint_top_fence ?
                    race.top_sprint_top_fence.y + race.top_sprint_top_fence.height : trackH * 0.1;
                const botFenceTop = race.top_sprint_bottom_fence ?
                    race.top_sprint_bottom_fence.y : trackH * 0.4;
                racingLineY = (topFenceBottom + botFenceTop) / 2;
            } else {
                // Bottom sprint - center between fences
                const topFenceBottom = race.bottom_sprint_top_fence ?
                    race.bottom_sprint_top_fence.y + race.bottom_sprint_top_fence.height : trackH * 0.6;
                const botFenceTop = race.bottom_sprint_bottom_fence ?
                    race.bottom_sprint_bottom_fence.y : trackH * 0.9;
                racingLineY = (topFenceBottom + botFenceTop) / 2;
            }

            const currentOffset = y - racingLineY;
            const desiredOffset = laneOffset;
            const laneDiff = (desiredOffset - currentOffset) * 0.02;
            laneSteer = Math.max(-1.5, Math.min(1.5, laneDiff));
        }

        this.target_angle += laneSteer;

        // === COLLISION AVOIDANCE ===
        for (const { horse: other, distance, direction } of this.nearby_horses) {
            if (distance < this.proximity_radius * 1.2) {
                const dot = currentDir.dot(direction);

                // Lateral separation - horses beside us
                if (Math.abs(dot) < 0.5 && distance < this.proximity_radius) {
                    // Side by side - spread out
                    const cross = currentDir.x * direction.y - currentDir.y * direction.x;
                    const spreadStrength = (1 - distance / this.proximity_radius) * 3;
                    this.target_angle += cross > 0 ? -spreadStrength : spreadStrength;
                }
                // Forward collision - horses ahead
                else if (dot > 0.2) {
                    const cross = currentDir.x * direction.y - currentDir.y * direction.x;
                    const avoidStrength = (1 - distance / this.proximity_radius) * 4;
                    // Move to preferred lane side when overtaking
                    const preferredSide = this.lanePreference > 0.5 ? 1 : -1;
                    this.target_angle += (cross > 0 ? -avoidStrength : avoidStrength) + preferredSide * 0.5;
                }
            }
        }

        // === SMOOTH STEERING ===
        const steerDiff = this.target_angle - this.steer_angle;
        this.steer_angle += steerDiff * this.steering_smoothness;
    }

    getRelativeRacePosition(trackCenter, startGatePosition = null) {
        const toHorse = this.position.subtract(trackCenter);
        let angle = Math.atan2(toHorse.y, toHorse.x);
        if (angle < 0) angle += Math.PI * 2;

        let startAngle = Math.PI * 1.5;
        if (startGatePosition) {
            const toGate = startGatePosition.subtract(trackCenter);
            startAngle = Math.atan2(toGate.y, toGate.x);
            if (startAngle < 0) startAngle += Math.PI * 2;
        }

        let raceAngle = angle - startAngle;
        if (raceAngle < 0) raceAngle += Math.PI * 2;

        return raceAngle + (this.lap * Math.PI * 2);
    }

    update(dt, cornerData, trackBounds, sprintFences, sprintZones, allHorses = [], raceProgress = 0) {
        if (this.is_running) {
            this.race_time += dt;
        }

        this.think(cornerData, trackBounds);

        // Update layered features (if available)
        if (typeof HorseLayers !== 'undefined') {
            HorseLayers.updateAll(this, dt, allHorses, trackBounds, raceProgress);
        }

        // Simple velocity - accelerate to target velocity
        if (this.is_running) {
            // Calculate target speed with layer modifiers
            let targetSpeed = this.base_velocity;
            if (typeof HorseLayers !== 'undefined') {
                targetSpeed = HorseLayers.calculateSpeed(this, this.base_velocity, raceProgress);
            }

            // Accelerate towards target
            if (this.velocity < targetSpeed) {
                this.velocity += this.acceleration * dt;
                this.velocity = Math.min(this.velocity, targetSpeed);
            } else if (this.velocity > targetSpeed) {
                // Slow down if target is lower (stamina depleted, etc.)
                this.velocity -= this.acceleration * 0.5 * dt;
                this.velocity = Math.max(this.velocity, targetSpeed * 0.7);
            }

            // Move
            const moveVec = this.getVecRotated();
            const velocityVec = moveVec.multiply(this.velocity * dt);
            this.position = this.position.add(velocityVec);
        }
    }

    startRunning() {
        this.is_running = true;
    }

    // Get status indicators for UI
    getLayerStatus() {
        if (typeof HorseLayers !== 'undefined') {
            return HorseLayers.getStatusText(this);
        }
        return '';
    }
}
