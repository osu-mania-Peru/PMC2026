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
        this.steering_smoothness = 0.15; // Higher = smoother, more gradual turns

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

        // Use Track API if available
        if (typeof Track !== 'undefined' && Track.initialized) {
            this.thinkWithTrack();
            return;
        }

        // Fallback to old logic if Track not ready
        const currentDir = this.getVecRotated();
        const x = this.position.x;
        const y = this.position.y;
        const trackW = trackBounds.width;
        const trackH = trackBounds.height;
        const cornerSize = trackH / 2;
        const centerY = trackH / 2;

        let targetAngle = 0;
        if (x > trackW - cornerSize) {
            const toCenter = new Vector2(trackW - cornerSize - x, centerY - y);
            targetAngle = Math.atan2(toCenter.x, -toCenter.y) * (180 / Math.PI);
        } else if (x < cornerSize) {
            const toCenter = new Vector2(cornerSize - x, centerY - y);
            targetAngle = Math.atan2(toCenter.x, -toCenter.y) * (180 / Math.PI);
        } else if (y < centerY) {
            targetAngle = 180;
        } else {
            targetAngle = 0;
        }

        const currentAngle = Math.atan2(currentDir.y, currentDir.x) * (180 / Math.PI);
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        const steerStrength = Math.min(Math.abs(angleDiff) * 0.12, 6);
        this.target_angle = this.steer_angle + Math.sign(angleDiff) * steerStrength;

        const steerDiff = this.target_angle - this.steer_angle;
        this.steer_angle += steerDiff * this.steering_smoothness;
    }

    // Navigation using Track API
    thinkWithTrack() {
        const x = this.position.x;
        const y = this.position.y;
        const currentDir = this.getVecRotated();
        const speed = this.velocity || 150;

        // === LOOK AHEAD FOR UPCOMING SECTION ===
        // Project where we'll be in ~0.5 seconds to anticipate curves
        const lookAheadTime = 0.5;
        const lookAheadDist = speed * lookAheadTime;
        const futureX = x + currentDir.x * lookAheadDist;
        const futureY = y + currentDir.y * lookAheadDist;

        // Get target angle based on where we're GOING, not where we ARE
        const currentSection = Track.getSection(x, y);
        const futureSection = Track.getSection(futureX, futureY);

        let targetAngle;

        // If approaching a different section, blend toward it
        if (futureSection && currentSection && futureSection.name !== currentSection.name) {
            // Approaching a curve - start turning early
            const currentTarget = Track.getTargetAngle(x, y);
            const futureTarget = Track.getTargetAngle(futureX, futureY);

            // Calculate how far into the transition we are
            let transitionProgress = 0;
            if (currentSection.name === 'TOP_STRAIGHT' || currentSection.name === 'BOTTOM_STRAIGHT') {
                // In straight, approaching curve
                const distToCurve = currentSection.name === 'TOP_STRAIGHT'
                    ? (currentDir.x < 0 ? x - Track.sections.LEFT_CURVE.xMax : Track.sections.RIGHT_CURVE.xMin - x)
                    : (currentDir.x > 0 ? Track.sections.RIGHT_CURVE.xMin - x : x - Track.sections.LEFT_CURVE.xMax);
                transitionProgress = Math.max(0, 1 - distToCurve / lookAheadDist);
            }

            // Blend between current and future target
            targetAngle = currentTarget + (futureTarget - currentTarget) * transitionProgress * 0.5;
        } else {
            targetAngle = Track.getTargetAngle(x, y);
        }

        const currentAngle = Math.atan2(currentDir.y, currentDir.x) * (180 / Math.PI);

        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        // Smoother steering - less aggressive
        const steerStrength = Math.min(Math.abs(angleDiff) * 0.1, 5);
        this.target_angle = this.steer_angle + Math.sign(angleDiff) * steerStrength;

        // === WALL AVOIDANCE (backup only) ===
        // Primary navigation should keep us on track - this is emergency correction
        const lookDistances = [40, 80, 120];
        let wallAvoidance = 0;

        for (const lookAhead of lookDistances) {
            const aheadX = x + currentDir.x * lookAhead;
            const aheadY = y + currentDir.y * lookAhead;

            if (Track.isColliding(aheadX, aheadY)) {
                const leftDir = this.vector.rotate(this.steer_angle + 40).normalize();
                const rightDir = this.vector.rotate(this.steer_angle - 40).normalize();
                const leftClear = !Track.isColliding(x + leftDir.x * lookAhead, y + leftDir.y * lookAhead);
                const rightClear = !Track.isColliding(x + rightDir.x * lookAhead, y + rightDir.y * lookAhead);

                // Gentler correction - trust the main navigation more
                const urgency = (150 - lookAhead) / 60;

                if (leftClear && !rightClear) {
                    wallAvoidance += 3 * urgency;
                } else if (rightClear && !leftClear) {
                    wallAvoidance -= 3 * urgency;
                } else if (!leftClear && !rightClear) {
                    // Emergency only
                    wallAvoidance += 6 * urgency;
                }
                break;
            }
        }

        this.target_angle += wallAvoidance;

        // === LANE SEEKING ===
        const section = Track.getSection(x, y);
        let laneSteer = 0;

        if (section) {
            // Get current lane position (-1 to 1, negative=inner, positive=outer)
            const currentLanePos = Track.getLaneOffset(x, y);
            const desiredLanePos = (this.lanePreference - 0.5) * 2; // Convert to -1 to 1

            const laneDiff = desiredLanePos - currentLanePos;

            // Direction-aware steering correction:
            // Positive steer_angle = tighter curve/turn = moves toward INNER edge
            // Negative steer_angle = wider curve/turn = moves toward OUTER edge
            //
            // So if horse wants outer (positive desiredLanePos) but is inner (negative currentLanePos):
            //   laneDiff = positive, we need NEGATIVE steer to go wider/outer
            // Therefore multiplier should be -1 for all sections
            //
            // Exception: In straights, the effect depends on travel direction
            // - Bottom straight (going right): positive steer = turn down = toward outer, so multiplier = 1
            // - Top straight (going left): positive steer = turn up = toward outer, so multiplier = 1
            // But wait, "outer" in straights is different Y directions...
            // Let's just use -1 for curves where it matters most

            const isCurve = section.name === 'LEFT_CURVE' || section.name === 'RIGHT_CURVE';
            const multiplier = isCurve ? -1 : 1;

            // Stronger lane seeking to prevent wall hugging
            laneSteer = Math.max(-2.5, Math.min(2.5, laneDiff * 0.8 * multiplier));
        }

        this.target_angle += laneSteer;

        // === COLLISION AVOIDANCE ===
        for (const { horse: other, distance, direction } of this.nearby_horses) {
            if (distance < this.proximity_radius * 1.2) {
                const dot = currentDir.dot(direction);

                if (Math.abs(dot) < 0.5 && distance < this.proximity_radius) {
                    const cross = currentDir.x * direction.y - currentDir.y * direction.x;
                    const spreadStrength = (1 - distance / this.proximity_radius) * 3;
                    this.target_angle += cross > 0 ? -spreadStrength : spreadStrength;
                } else if (dot > 0.2) {
                    const cross = currentDir.x * direction.y - currentDir.y * direction.x;
                    const avoidStrength = (1 - distance / this.proximity_radius) * 4;
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
        // Use Track API for more accurate distance-based positioning if available
        if (typeof Track !== 'undefined' && Track.initialized) {
            return this.getDistanceBasedPosition(trackCenter, startGatePosition);
        }

        // Fallback to angular position
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

    // More accurate position calculation using track distance
    getDistanceBasedPosition(trackCenter, startGatePosition) {
        const x = this.position.x;
        const y = this.position.y;
        const section = Track.getSection(x, y);
        if (!section) return this.lap * 1000;

        // Get the racing path from race object if available
        const race = window.game?.race;
        if (!race || !race.racingPath) {
            // Fallback: use angular method
            return this.getAngularPosition(trackCenter, startGatePosition);
        }

        // Find which segment we're in and calculate cumulative distance
        let distanceAlongTrack = 0;

        for (const segment of race.racingPath) {
            let inSegment = false;
            let progressInSegment = 0;

            if (segment.type === 'straight') {
                // Check if we're in this straight segment
                const segDx = segment.endX - segment.startX;
                const segDy = segment.endY - segment.startY;
                const segLength = Math.sqrt(segDx * segDx + segDy * segDy);

                if (segLength > 0) {
                    // Project horse position onto segment line
                    const toHorseX = x - segment.startX;
                    const toHorseY = y - segment.startY;
                    const projection = (toHorseX * segDx + toHorseY * segDy) / (segLength * segLength);

                    // Check if projection falls within segment (with some tolerance)
                    if (projection >= -0.1 && projection <= 1.1) {
                        // Check perpendicular distance to line
                        const projX = segment.startX + projection * segDx;
                        const projY = segment.startY + projection * segDy;
                        const perpDist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

                        // Lane tolerance (racing lane width)
                        if (perpDist < 400) {
                            inSegment = true;
                            progressInSegment = Math.max(0, Math.min(1, projection));
                        }
                    }
                }
            } else if (segment.type === 'corner') {
                // Check if we're in this corner arc
                const dx = x - segment.centerX;
                const dy = y - segment.centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Check if within arc radius range
                const innerRadius = segment.radius - 200;
                const outerRadius = segment.radius + 200;

                if (dist >= innerRadius && dist <= outerRadius) {
                    // Calculate angle from center
                    let angle = Math.atan2(dy, dx);
                    if (angle < 0) angle += Math.PI * 2;

                    // Normalize angles for comparison
                    let startAngle = segment.startAngle;
                    let endAngle = segment.endAngle;
                    if (startAngle < 0) startAngle += Math.PI * 2;
                    if (endAngle < 0) endAngle += Math.PI * 2;

                    // Handle angle wrapping
                    let normalizedAngle = angle;
                    if (endAngle < startAngle) {
                        // Arc crosses 0/2PI boundary
                        if (angle < startAngle) normalizedAngle += Math.PI * 2;
                        endAngle += Math.PI * 2;
                    }

                    if (normalizedAngle >= startAngle - 0.2 && normalizedAngle <= endAngle + 0.2) {
                        inSegment = true;
                        const arcSpan = endAngle - startAngle;
                        progressInSegment = Math.max(0, Math.min(1, (normalizedAngle - startAngle) / arcSpan));
                    }
                }
            }

            if (inSegment) {
                distanceAlongTrack = segment.cumulativeStart + progressInSegment * segment.distance;
                break;
            }
        }

        // Add lap distance
        const totalTrackDist = race.totalTrackDistance || 10000;
        return distanceAlongTrack + (this.lap * totalTrackDist);
    }

    // Helper for angular fallback
    getAngularPosition(trackCenter, startGatePosition) {
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
