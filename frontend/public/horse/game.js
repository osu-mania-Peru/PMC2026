// Horse Racing Simulator - JavaScript Port

// Configuration
const HORSE_SPRITE_SCALE =4;  // Adjust this to change horse size (1.0 = default, 1.8 = 1.8x larger)

// Natural horse colors (R, G, B)
const HORSE_COLORS = [
    [139, 69, 19],   // Brown
    [101, 67, 33],   // Dark brown
    [210, 180, 140], // Tan
    [139, 115, 85],  // Light brown
    [70, 50, 40],    // Dark chestnut
    [180, 140, 100], // Palomino
    [255, 255, 255], // White
    [50, 50, 50]     // Black
];

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vector2(0, 0);
        return new Vector2(this.x / len, this.y / len);
    }

    distance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    rotate(angle) {
        const rad = angle * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
}

// Running styles from Uma Musume
const RUNNING_STYLES = {
    NIGE: 'nige',           // Runner - leads from front
    SENKOU: 'senkou',       // Leader - runs near front
    SASHI: 'sashi',         // Stalker/Chaser - middle pack, late surge
    OIKOMI: 'oikomi'        // Closer - stays back, explosive finish
};

// Particle pool for memory efficiency
class ParticlePool {
    constructor(maxSize = 500) {
        this.pool = [];
        this.maxSize = maxSize;
        // Pre-allocate particles
        for (let i = 0; i < maxSize; i++) {
            this.pool.push({
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                life: 0,
                maxLife: 0,
                size: 0,
                color: 'rgb(139, 90, 43)',
                active: false
            });
        }
        this.nextIndex = 0;
    }

    acquire() {
        // Find an inactive particle
        for (let i = 0; i < this.maxSize; i++) {
            const idx = (this.nextIndex + i) % this.maxSize;
            if (!this.pool[idx].active) {
                this.nextIndex = (idx + 1) % this.maxSize;
                this.pool[idx].active = true;
                return this.pool[idx];
            }
        }
        // Pool is full, reuse oldest (first in array)
        this.nextIndex = (this.nextIndex + 1) % this.maxSize;
        const particle = this.pool[this.nextIndex];
        particle.active = true;
        return particle;
    }

    release(particle) {
        particle.active = false;
    }

    getActiveParticles() {
        return this.pool.filter(p => p.active);
    }
}

// Global particle pool shared by all horses
const globalParticlePool = new ParticlePool(500);

class Horse {
    constructor(initPosition, colorIndex = 0, horseNumber = 1, horseImage = null) {
        this.number = horseNumber;
        this.power = 0.3 + Math.random() * 0.7; // 0.3 to 1.0
        this.color = HORSE_COLORS[colorIndex % HORSE_COLORS.length];
        this.horseImage = horseImage;
        this.tintedImage = null;

        this.position = new Vector2(initPosition.x, initPosition.y);
        this.width = 30;
        this.height = 30;

        // Assign random running style
        const styles = Object.values(RUNNING_STYLES);
        this.running_style = styles[Math.floor(Math.random() * styles.length)];

        // Base stats influenced by running style
        this.base_velocity = 140;
        this.velocity = 0;
        this.max_velocity = 200;
        this.acceleration = 80;
        this.deceleration = 30;

        // New specialized stats (0.5 to 1.5 range, 1.0 is average)
        this.corner_skill = 0.5 + Math.random() * 1.0;  // How well they handle curves
        this.acceleration_skill = 0.5 + Math.random() * 1.0;  // Acceleration rate multiplier
        this.top_speed_skill = 0.5 + Math.random() * 1.0;  // Max speed multiplier
        this.stamina_efficiency = 0.7 + Math.random() * 0.6;  // Stamina drain multiplier (lower = better)
        this.gate_skill = 0.5 + Math.random() * 1.0;  // Start reaction time

        // Apply running style modifiers
        this.applyRunningStyleModifiers();

        this.steer_angle = 0;
        this.previous_steer_angle = 0;
        this.vector = new Vector2(-1, 0);

        this.proximity_radius = 45;
        this.nearby_horses = [];

        this.is_running = false;
        this.target_angle = 0;
        this.steering_smoothness = 0.1;
        this.in_fence_collision = false;
        this.in_sprint_zone = false;
        this.danger_level = 0.0;
        this.race_time = 0.0;

        this.vision_rays = [];
        this.vision_length = 100;
        this.vision_angles = [-30, -15, 0, 15, 30];

        this.distance_to_inner_fence = null;
        this.preferred_inner_distance = 40;
        this.enable_inner_fence_hugging = false;

        this.wit_level = 100;
        this.wit_radius = 40;
        this.horses_ahead = [];

        this.wit_activated = false;
        this.wit_activation_timer = 0.0;
        this.wit_action = "";

        this.centrifugal_force = 0.0;

        // Track position tracking
        this.current_checkpoint = 0;
        this.lap = 0;
        this.total_progress = 0; // Total checkpoints passed across all laps
        this.cumulative_distance_traveled = 0; // Actual distance traveled in pixels
        this.previous_position = new Vector2(initPosition.x, initPosition.y);

        this.power_level = 50 + Math.floor(Math.random() * 51); // 50-100
        this.aggression = 0.3 + Math.random() * 0.7;
        this.awareness_360 = true;

        // Stamina system for running styles
        this.stamina = 100;  // Start at 100%
        this.max_stamina = 100;
        this.stamina_drain_rate = 1.0;  // Modified by running style
        this.late_surge_activated = false;

        // Grass particles (using global pool)
        this.particleSpawnTimer = 0;
        this.previous_velocity = 0;
    }

    applyRunningStyleModifiers() {
        switch (this.running_style) {
            case RUNNING_STYLES.NIGE:  // Runner - fast early, drains stamina
                this.base_velocity = 150;  // +10 base speed
                this.max_velocity = 210;   // +10 max speed
                this.acceleration = 100;    // +20 acceleration
                this.stamina_drain_rate = 1.5;  // Drains stamina faster
                this.aggression = 0.7 + Math.random() * 0.3;  // More aggressive
                // Tend to be better at acceleration and gate
                this.acceleration_skill *= 1.2;
                this.gate_skill *= 1.3;
                break;

            case RUNNING_STYLES.SENKOU:  // Leader - balanced front runner
                this.base_velocity = 145;  // +5 base speed
                this.max_velocity = 205;   // +5 max speed
                this.acceleration = 90;     // +10 acceleration
                this.stamina_drain_rate = 1.2;
                this.aggression = 0.5 + Math.random() * 0.3;
                // Well-rounded, slight stamina bonus
                this.stamina_efficiency *= 0.9;
                break;

            case RUNNING_STYLES.SASHI:  // Stalker - saves energy, good late game
                this.base_velocity = 140;  // Normal base speed
                this.max_velocity = 215;   // +15 max speed for late surge
                this.acceleration = 85;     // +5 acceleration
                this.stamina_drain_rate = 0.8;  // Conserves stamina
                this.aggression = 0.4 + Math.random() * 0.3;
                // Good at corners and stamina management
                this.corner_skill *= 1.2;
                this.stamina_efficiency *= 0.85;
                break;

            case RUNNING_STYLES.OIKOMI:  // Closer - slow start, explosive finish
                this.base_velocity = 135;  // -5 base speed
                this.max_velocity = 220;   // +20 max speed for surge
                this.acceleration = 75;     // -5 acceleration
                this.stamina_drain_rate = 0.6;  // Conserves lots of stamina
                this.aggression = 0.3 + Math.random() * 0.3;
                // Best stamina and top speed, worst gate
                this.top_speed_skill *= 1.25;
                this.stamina_efficiency *= 0.8;
                this.gate_skill *= 0.7;
                break;
        }

        // Clamp skills to reasonable ranges
        this.corner_skill = Math.min(1.8, this.corner_skill);
        this.acceleration_skill = Math.min(1.8, this.acceleration_skill);
        this.top_speed_skill = Math.min(1.8, this.top_speed_skill);
        this.stamina_efficiency = Math.max(0.5, Math.min(1.3, this.stamina_efficiency));
        this.gate_skill = Math.min(1.8, this.gate_skill);
    }

    applyColorTint() {
        if (!this.horseImage || this.tintedImage) return;

        // Create a canvas to apply color tint and rotate 90 degrees
        // After rotation, width and height are swapped
        const canvas = document.createElement('canvas');
        canvas.width = this.horseImage.height;  // Swapped because of 90° rotation
        canvas.height = this.horseImage.width;
        const ctx = canvas.getContext('2d');

        // Rotate -90 degrees (counter-clockwise to face left)
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-90 * Math.PI / 180);
        ctx.translate(-this.horseImage.width / 2, -this.horseImage.height / 2);

        // Draw the base image
        ctx.drawImage(this.horseImage, 0, 0);

        // Apply color tint using multiply blend mode
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${this.color[0]}, ${this.color[1]}, ${this.color[2]})`;
        ctx.fillRect(-this.horseImage.width, -this.horseImage.height, this.horseImage.width * 3, this.horseImage.height * 3);

        // Restore destination-in to preserve alpha
        ctx.globalCompositeOperation = 'destination-in';
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-90 * Math.PI / 180);
        ctx.translate(-this.horseImage.width / 2, -this.horseImage.height / 2);
        ctx.drawImage(this.horseImage, 0, 0);

        this.tintedImage = canvas;
    }

    getVecRotated() {
        return this.vector.rotate(this.steer_angle);
    }

    getRotatedRect() {
        return {
            x: this.position.x - this.width / 2,
            y: this.position.y - this.height / 2,
            width: this.width,
            height: this.height,
            centerX: this.position.x,
            centerY: this.position.y
        };
    }

    updateAwareness(allHorses) {
        this.nearby_horses = [];
        const myPos = this.position;
        const myDirection = this.getVecRotated();

        for (const other of allHorses) {
            if (other === this) continue;

            const otherPos = other.position;
            const distance = myPos.distance(otherPos);

            if (distance <= this.proximity_radius) {
                const toOther = otherPos.subtract(myPos).normalize();
                this.nearby_horses.push({
                    horse: other,
                    distance: distance,
                    direction: toOther
                });
            }
        }
    }

    detectHorsesAhead(allHorses) {
        this.horses_ahead = [];
        const myPos = this.position;
        const myDirection = this.getVecRotated();

        const lookaheadPos = myPos.add(myDirection.multiply(this.wit_level));

        for (const other of allHorses) {
            if (other === this || !other.is_running) continue;

            const otherPos = other.position;
            const distanceToLookahead = lookaheadPos.distance(otherPos);

            if (distanceToLookahead <= this.wit_radius) {
                const toOther = otherPos.subtract(myPos);
                const distanceFromMe = toOther.length();

                if (distanceFromMe > 0) {
                    const directionToOther = toOther.normalize();
                    const dot = myDirection.dot(directionToOther);

                    if (dot > 0.3) {
                        const cross = myDirection.x * directionToOther.y - myDirection.y * directionToOther.x;
                        const side = cross > 0 ? "left" : "right";

                        this.horses_ahead.push({
                            horse: other,
                            distance: distanceFromMe,
                            side: side,
                            dot: dot
                        });
                    }
                }
            }
        }
    }

    isPointInFence(point, cornerData, trackBounds, sprintFences = null) {
        // Check if point is outside track boundaries
        if (point.x < trackBounds.x || point.x > trackBounds.x + trackBounds.width ||
            point.y < trackBounds.y || point.y > trackBounds.y + trackBounds.height) {
            return true;
        }

        // Check sprint fence rectangles
        if (sprintFences) {
            for (const fence of sprintFences) {
                if (point.x >= fence.x && point.x <= fence.x + fence.width &&
                    point.y >= fence.y && point.y <= fence.y + fence.height) {
                    return true;
                }
            }
        }

        // Check outer and inner fences (quarter circles)
        for (const corner of cornerData) {
            const [cornerRect, outerCenter, outerRadius, innerCenter, innerRadius] = corner;

            // Check if in corner rectangle
            if (point.x >= cornerRect.x && point.x <= cornerRect.x + cornerRect.width &&
                point.y >= cornerRect.y && point.y <= cornerRect.y + cornerRect.height) {

                const distanceToOuter = point.distance(outerCenter);
                if (distanceToOuter > outerRadius) {
                    return true;
                }
            }

            // Check inner fence
            const distanceToInner = point.distance(innerCenter);
            if (distanceToInner < innerRadius) {
                return true;
            }
        }

        return false;
    }

    castVisionRays(cornerData, trackBounds, sprintFences = null) {
        this.vision_rays = [];
        const horsePos = this.position;

        for (const angleOffset of this.vision_angles) {
            const rayAngle = this.steer_angle + angleOffset;
            const rayDir = this.vector.rotate(rayAngle).normalize();

            let detectedDistance = this.vision_length;
            for (let distance = 10; distance < this.vision_length; distance += 5) {
                const testPoint = horsePos.add(rayDir.multiply(distance));
                if (this.isPointInFence(testPoint, cornerData, trackBounds, sprintFences)) {
                    detectedDistance = distance;
                    break;
                }
            }

            this.vision_rays.push({ angle: angleOffset, distance: detectedDistance });
        }
    }

    simulateSteeringOption(steeringDelta, cornerData, trackBounds, sprintFences = null) {
        const simulatedAngle = this.steer_angle + steeringDelta;
        const horsePos = this.position;
        const simulatedDir = this.vector.rotate(simulatedAngle).normalize();

        const lookaheadDistance = 150;
        for (let distance = 10; distance < lookaheadDistance; distance += 5) {
            const testPoint = horsePos.add(simulatedDir.multiply(distance));
            if (this.isPointInFence(testPoint, cornerData, trackBounds, sprintFences)) {
                return distance;
            }
        }

        return lookaheadDistance;
    }

    checkSprintZone(sprintZones) {
        this.in_sprint_zone = false;
        for (const zone of sprintZones) {
            if (this.position.x >= zone.x && this.position.x <= zone.x + zone.width &&
                this.position.y >= zone.y && this.position.y <= zone.y + zone.height) {
                this.in_sprint_zone = true;
                return;
            }
        }
    }

    calculateDistanceToInnerFence(cornerData) {
        const horsePos = this.position;
        let minDistance = Infinity;

        for (const corner of cornerData) {
            const [cornerRect, outerCenter, outerRadius, innerCenter, innerRadius] = corner;

            if (horsePos.x >= cornerRect.x && horsePos.x <= cornerRect.x + cornerRect.width &&
                horsePos.y >= cornerRect.y && horsePos.y <= cornerRect.y + cornerRect.height) {

                const distanceToCenter = horsePos.distance(innerCenter);
                const distanceToFenceEdge = distanceToCenter - innerRadius;

                if (distanceToFenceEdge > 0 && distanceToFenceEdge < minDistance) {
                    minDistance = distanceToFenceEdge;
                }
            }
        }

        return minDistance === Infinity ? null : minDistance;
    }

    checkIfInCorner(cornerData) {
        const horsePos = this.position;

        for (const corner of cornerData) {
            const [cornerRect, outerCenter, outerRadius, innerCenter, innerRadius] = corner;

            // Check if horse is in the corner rectangle
            if (horsePos.x >= cornerRect.x && horsePos.x <= cornerRect.x + cornerRect.width &&
                horsePos.y >= cornerRect.y && horsePos.y <= cornerRect.y + cornerRect.height) {
                return { inCorner: true, center: innerCenter, radius: innerRadius };
            }
        }

        return { inCorner: false, center: null, radius: null };
    }

    think(cornerData, trackBounds, sprintFences = null) {
        if (!this.is_running) return;

        this.danger_level = 0.0;

        // Check if in corner and apply centripetal force
        let cornerInfo = { inCorner: false, center: null, radius: null };
        if (cornerData) {
            this.distance_to_inner_fence = this.calculateDistanceToInnerFence(cornerData);
            cornerInfo = this.checkIfInCorner(cornerData);

            if (cornerInfo.inCorner) {
                // Horse is in a corner - calculate direction to follow the curve
                const toCenter = cornerInfo.center.subtract(this.position);
                const distanceToCenter = toCenter.length();

                // Calculate tangent direction (perpendicular to radius)
                // This is the direction the horse should be traveling to follow the curve
                const currentDirection = this.getVecRotated();
                const radialDirection = toCenter.normalize();

                // Calculate how much we need to turn to follow the curve
                // Tangent is perpendicular to radial
                const tangentDirection = new Vector2(-radialDirection.y, radialDirection.x);

                // Check which tangent direction is closer to our current direction
                const dot1 = currentDirection.dot(tangentDirection);
                const dot2 = currentDirection.dot(new Vector2(radialDirection.y, -radialDirection.x));
                const correctTangent = dot1 > dot2 ? tangentDirection : new Vector2(radialDirection.y, -radialDirection.x);

                // Calculate the angle we need to steer to follow the curve
                const desiredAngle = Math.atan2(correctTangent.y, correctTangent.x) * 180 / Math.PI;
                const currentAngle = Math.atan2(currentDirection.y, currentDirection.x) * 180 / Math.PI;
                let angleDiff = desiredAngle - currentAngle;

                // Normalize angle difference to -180 to 180
                while (angleDiff > 180) angleDiff -= 360;
                while (angleDiff < -180) angleDiff += 360;

                // Apply centripetal force to guide horse along curve
                const speedFactor = this.velocity / this.base_velocity;
                const cornerSkillBonus = this.corner_skill * 1.5;  // Corner skill helps with curves
                const forceMagnitude = speedFactor * 3 * cornerSkillBonus;  // Strength of suggestion
                this.centrifugal_force = Math.abs(angleDiff) * 0.1;  // For display

                // Gently nudge the target angle toward the curve
                // Better corner skill = smoother cornering
                this.target_angle += angleDiff * forceMagnitude * 0.05;
            } else {
                this.centrifugal_force = 0.0;
            }
        }

        // Horse wit: Strategic positioning
        if (this.horses_ahead.length > 0) {
            this.wit_activated = true;
            this.wit_activation_timer = 1.0;

            const closestWitHorse = this.horses_ahead.reduce((min, h) =>
                h.distance < min.distance ? h : min
            );
            const witDanger = Math.max(0, 1.0 - (closestWitHorse.distance / 100));
            this.danger_level = Math.max(
                this.danger_level,
                witDanger * 0.3 * (1.0 - this.power * 0.5)
            );

            const leftCount = this.horses_ahead.filter(h => h.side === "left").length;
            const rightCount = this.horses_ahead.filter(h => h.side === "right").length;

            if (leftCount > rightCount + 1) {
                this.target_angle -= 5;
                this.wit_action = `Gap R (L:${leftCount} R:${rightCount})`;
            } else if (rightCount > leftCount + 1) {
                this.target_angle += 5;
                this.wit_action = `Gap L (L:${leftCount} R:${rightCount})`;
            }

            const closest = this.horses_ahead.reduce((min, h) =>
                h.distance < min.distance ? h : min
            );
            if (closest.distance < 80) {
                if (closest.side === "left") {
                    this.target_angle -= 3;
                    this.wit_action = `Pass R (#${closest.horse.number} @${Math.floor(closest.distance)}px)`;
                } else {
                    this.target_angle += 3;
                    this.wit_action = `Pass L (#${closest.horse.number} @${Math.floor(closest.distance)}px)`;
                }
            }
        } else {
            this.wit_activated = false;
            this.wit_action = "";
        }

        // Collision avoidance with nearby horses
        if (this.nearby_horses.length > 0) {
            const myDirection = this.getVecRotated();

            let gateCooldownFactor = 1.0;
            if (this.race_time < 4.0) {
                gateCooldownFactor = 0.1 + (this.race_time / 4.0) * 0.9;
            }

            for (const horseData of this.nearby_horses) {
                const other = horseData.horse;
                const distance = horseData.distance;
                const toOther = horseData.direction;

                const dot = myDirection.dot(toOther);
                const cross = myDirection.x * toOther.y - myDirection.y * toOther.x;

                const speedDifference = this.velocity - other.velocity;
                const collisionThreshold = this.proximity_radius * 0.8;

                if (dot > 0.5 && distance < collisionThreshold) {
                    const proximityDanger = Math.max(0, 1.0 - (distance / collisionThreshold));
                    this.danger_level = Math.max(
                        this.danger_level,
                        proximityDanger * 0.7 * (1.0 - this.power * 0.4)
                    );
                }

                if (dot > 0.5) {
                    let steerAmount = 0;
                    if (distance < collisionThreshold * 0.5) {
                        steerAmount = (speedDifference > 5 ? 8 : 6) * (1.0 - this.power * 0.3) * gateCooldownFactor;
                    } else if (distance < collisionThreshold * 0.75) {
                        steerAmount = (speedDifference > 5 ? 5 : 3) * (1.0 - this.power * 0.4) * gateCooldownFactor;
                    } else if (distance < collisionThreshold) {
                        steerAmount = 2 * (1.0 - this.power * 0.6) * gateCooldownFactor;
                    }

                    if (steerAmount > 0) {
                        if (cross > 0) {
                            this.target_angle -= steerAmount;
                        } else {
                            this.target_angle += steerAmount;
                        }
                    }
                } else if (this.awareness_360 && dot < -0.3) {
                    if (speedDifference < -5 && distance < collisionThreshold * 0.9) {
                        const powerDiff = this.power_level - other.power_level;
                        const positionBonus = -15;
                        const dominance = (powerDiff * 0.4 + speedDifference * 1.5 + positionBonus) * this.aggression;

                        if (dominance < 0) {
                            const yieldAmount = 6 * (1.0 - this.aggression) * gateCooldownFactor;
                            if (cross > 0) {
                                this.target_angle -= yieldAmount;
                            } else {
                                this.target_angle += yieldAmount;
                            }
                        } else {
                            const blockAmount = 3 * this.aggression * gateCooldownFactor;
                            if (cross > 0) {
                                this.target_angle += blockAmount * 0.5;
                            } else {
                                this.target_angle -= blockAmount * 0.5;
                            }
                        }
                    }
                } else if (Math.abs(dot) < 0.3 && distance < collisionThreshold * 0.6) {
                    const powerDiff = this.power_level - other.power_level;
                    const sideDominance = (powerDiff * 0.5 + speedDifference * 1.0) * this.aggression;

                    let steerAmount;
                    if (sideDominance < -10) {
                        steerAmount = 6 * (1.0 - this.aggression) * gateCooldownFactor;
                    } else if (sideDominance > 10) {
                        steerAmount = 2 * this.aggression * gateCooldownFactor;
                    } else {
                        steerAmount = 4 * (1.0 - this.power * 0.3) * gateCooldownFactor;
                    }

                    if (cross > 0) {
                        this.target_angle -= steerAmount;
                    } else {
                        this.target_angle += steerAmount;
                    }
                }
            }
        }

        // Vision-based obstacle avoidance
        if (this.vision_rays.length > 0) {
            const centerRays = this.vision_rays.filter(r => Math.abs(r.angle) <= 15);
            const centerDistance = centerRays.length > 0
                ? Math.min(...centerRays.map(r => r.distance))
                : this.vision_length;

            if (centerDistance < 100) {
                const obstacleDanger = Math.max(0, 1.0 - (centerDistance / 100));
                this.danger_level = Math.max(
                    this.danger_level,
                    obstacleDanger * 0.8 * (1.0 - this.power * 0.3)
                );
            }

            if (centerDistance < 80) {
                const rightDistance = this.simulateSteeringOption(-20, cornerData, trackBounds, sprintFences);
                const leftDistance = this.simulateSteeringOption(20, cornerData, trackBounds, sprintFences);

                if (rightDistance > leftDistance + 10) {
                    this.target_angle -= 10;
                } else if (leftDistance > rightDistance + 10) {
                    this.target_angle += 10;
                } else if (leftDistance > rightDistance) {
                    this.target_angle += 5;
                } else {
                    this.target_angle -= 5;
                }
            }
        }

        // Inner fence hugging
        if (this.enable_inner_fence_hugging && this.distance_to_inner_fence !== null) {
            const distanceError = this.distance_to_inner_fence - this.preferred_inner_distance;

            if (Math.abs(distanceError) > 15) {
                if (distanceError > 0) {
                    this.target_angle += 2;
                } else {
                    this.target_angle -= 2;
                }
            }
        }

        // Smooth steering
        const angleDiff = this.target_angle - this.steer_angle;
        this.steer_angle += angleDiff * this.steering_smoothness;
    }

    checkCheckpoint(checkpoints) {
        // Check if we've passed the next checkpoint
        const nextCheckpoint = (this.current_checkpoint + 1) % checkpoints.length;
        const checkpoint = checkpoints[nextCheckpoint];

        const dist = this.position.distance(checkpoint);
        if (dist < checkpoint.radius) {
            this.current_checkpoint = nextCheckpoint;
            this.total_progress++;

            // Check if we completed a lap
            if (nextCheckpoint === 0) {
                this.lap++;
            }
        }
    }

    // Calculate continuous position along the track using projection geometry
    getContinuousProgress(checkpoints) {
        if (!checkpoints || checkpoints.length === 0) return 0;

        const currentCP = checkpoints[this.current_checkpoint];
        const nextCPIndex = (this.current_checkpoint + 1) % checkpoints.length;
        const nextCP = checkpoints[nextCPIndex];

        const currentPos = new Vector2(currentCP.x, currentCP.y);
        const nextPos = new Vector2(nextCP.x, nextCP.y);
        const horsePos = this.position;

        // Project horse position onto the line between current and next checkpoint
        const segmentVec = nextPos.subtract(currentPos);
        const segmentLength = segmentVec.length();

        if (segmentLength === 0) return this.total_progress;

        const toHorse = horsePos.subtract(currentPos);
        const segmentDir = segmentVec.normalize();

        // Dot product gives projection distance along segment
        const projectionDist = toHorse.dot(segmentDir);

        // Clamp to segment bounds (0 to segmentLength)
        const clampedDist = Math.max(0, Math.min(segmentLength, projectionDist));

        // Convert to 0-1 progress
        const progressBetweenCP = clampedDist / segmentLength;

        // Total continuous progress = checkpoints passed + progress to next checkpoint
        return this.total_progress + progressBetweenCP;
    }

    // EXPERIMENTAL: Calculate position using angular position relative to track center
    // This approach doesn't need to know actual track distances!
    getRelativeRacePosition(trackCenter) {
        // Get vector from track center to horse
        const toHorse = this.position.subtract(trackCenter);

        // Calculate angle from center (atan2 gives us -π to π)
        let angle = Math.atan2(toHorse.y, toHorse.x);

        // Normalize to 0 to 2π
        if (angle < 0) angle += Math.PI * 2;

        // The race starts at top center and goes counter-clockwise (left)
        // Top center is at angle = 3π/2 (270°), so adjust reference
        const startAngle = Math.PI * 1.5; // 270° - top of track
        let raceAngle = angle - startAngle;
        if (raceAngle < 0) raceAngle += Math.PI * 2;

        // Use movement direction to refine position
        // If horse is moving "forward" in race direction, give slight bonus
        const direction = this.getVecRotated();
        const tangent = new Vector2(-toHorse.y, toHorse.x).normalize(); // Perpendicular = tangent to circle
        const forwardness = direction.dot(tangent); // Positive = moving forward in race direction

        // Add lap count (each lap = 2π radians)
        const totalAngle = raceAngle + (this.lap * Math.PI * 2);

        // Add small adjustment based on movement direction (max ±0.1 radians)
        const adjustedAngle = totalAngle + (forwardness * 0.05);

        return adjustedAngle;
    }

    update(dt, cornerData, trackBounds, sprintFences, sprintZones, checkpoints = null) {
        if (this.is_running) {
            this.race_time += dt;
        }

        // Update checkpoint tracking
        if (checkpoints && this.is_running) {
            this.checkCheckpoint(checkpoints);
        }

        if (this.wit_activation_timer > 0) {
            this.wit_activation_timer = Math.max(0, this.wit_activation_timer - dt * 2);
        }

        if (cornerData && trackBounds) {
            this.castVisionRays(cornerData, trackBounds, sprintFences);
        }

        this.think(cornerData, trackBounds, sprintFences);

        if (sprintZones) {
            this.checkSprintZone(sprintZones);
        }

        // Handle stamina drain and running style behavior
        if (this.is_running) {
            // Drain stamina based on velocity, running style, and stamina efficiency
            const velocityFactor = this.velocity / this.base_velocity;
            const staminaDrain = this.stamina_drain_rate * velocityFactor * this.stamina_efficiency * dt * 3;
            this.stamina = Math.max(0, this.stamina - staminaDrain);

            // Check for late surge activation (last 25% of race)
            const raceProgress = this.total_progress / 8.0;  // 8 checkpoints per lap
            const isLastStretch = raceProgress > 0.75;

            // Apply running style behaviors
            let styleModifier = 1.0;
            if (this.running_style === RUNNING_STYLES.OIKOMI || this.running_style === RUNNING_STYLES.SASHI) {
                // Late surgers activate in final stretch with remaining stamina
                if (isLastStretch && this.stamina > 30 && !this.late_surge_activated) {
                    this.late_surge_activated = true;
                }

                if (this.late_surge_activated) {
                    // Explosive speed boost
                    styleModifier = 1.3 + (this.stamina / 100) * 0.2;  // Up to 1.5x boost
                }
            }

            // Stamina affects speed - low stamina = slower
            const staminaFactor = 0.7 + (this.stamina / 100) * 0.3;  // 70-100% speed based on stamina

            // Handle acceleration/deceleration
            // Apply gate skill at race start (slower reaction = slower acceleration)
            let gateDelayFactor = 1.0;
            if (this.race_time < 2.0) {
                const gateDelay = (2.0 - this.race_time) * (2.0 - this.gate_skill);
                gateDelayFactor = Math.max(0.3, 1.0 - (gateDelay * 0.3));
            }

            if (this.velocity < this.base_velocity) {
                this.velocity += this.acceleration * this.acceleration_skill * gateDelayFactor * dt;
                this.velocity = Math.min(this.velocity, this.base_velocity);
            } else {
                let targetVelocity;
                if (this.danger_level > 0.5) {
                    targetVelocity = this.base_velocity * (1.0 - this.danger_level * 0.4);
                } else if (this.in_sprint_zone && this.danger_level < 0.3) {
                    targetVelocity = this.max_velocity * styleModifier * this.top_speed_skill;  // Apply style bonus + top speed skill
                } else if (this.danger_level > 0.2) {
                    targetVelocity = this.base_velocity * (1.0 - this.danger_level * 0.2);
                } else {
                    targetVelocity = this.base_velocity;
                }

                // Apply stamina factor
                targetVelocity *= staminaFactor;

                if (this.velocity < targetVelocity) {
                    this.velocity += (this.acceleration * this.acceleration_skill * 0.4) * dt;
                    this.velocity = Math.min(this.velocity, targetVelocity);
                } else if (this.velocity > targetVelocity) {
                    const decelRate = this.deceleration * (1.0 + this.danger_level * 2.0);
                    this.velocity -= decelRate * dt;
                    this.velocity = Math.max(this.velocity, targetVelocity);
                }
            }
        }

        // Movement
        if (this.is_running) {
            const vec = this.getVecRotated();
            const velocityVec = vec.multiply(this.velocity * dt);

            let proposedPosition = this.position.add(velocityVec);

            // Physical collision prevention
            for (const horseData of this.nearby_horses) {
                const other = horseData.horse;
                const otherPos = other.position;
                const proposedDistance = proposedPosition.distance(otherPos);

                const minSeparation = (this.proximity_radius + other.proximity_radius) * 0.35;

                if (proposedDistance < minSeparation) {
                    const toOther = otherPos.subtract(this.position).normalize();

                    const myWeight = this.power_level / 100.0;
                    const otherWeight = other.power_level / 100.0;
                    const totalWeight = myWeight + otherWeight;

                    const pushbackRatio = totalWeight > 0 ? (1.0 - myWeight / totalWeight) : 0.5;

                    const overlap = minSeparation - proposedDistance;
                    const pushbackDistance = overlap * pushbackRatio * 1.5;

                    const pushbackVector = toOther.multiply(-pushbackDistance);
                    proposedPosition = proposedPosition.add(pushbackVector);
                    break;
                }
            }

            // Track cumulative distance traveled
            const distanceMoved = proposedPosition.distance(this.previous_position);
            this.cumulative_distance_traveled += distanceMoved;

            this.position = proposedPosition;
            this.previous_position = new Vector2(proposedPosition.x, proposedPosition.y);

            // Spawn grass particles based on acceleration and velocity
            const currentAccel = Math.abs(this.velocity - this.previous_velocity) / dt;
            const velocityFactor = this.velocity / this.max_velocity;
            const accelFactor = Math.min(1.0, currentAccel / 100); // Normalize acceleration

            this.particleSpawnTimer -= dt;

            // More particles when accelerating hard or moving fast
            const intensity = Math.max(velocityFactor * 0.5, accelFactor);
            const spawnRate = 0.08 / Math.max(0.3, intensity); // Faster spawn rate with pooling

            if (this.particleSpawnTimer <= 0 && intensity > 0.1) {
                this.particleSpawnTimer = spawnRate;

                // Spawn particles behind the horse
                const direction = this.getVecRotated();
                const behindOffset = direction.multiply(-15); // Behind the horse
                const sideSpread = 10; // Spread particles to the sides

                // More particles now that we have pooling!
                const particleCount = Math.floor(2 + accelFactor * 4); // 2-6 particles

                for (let i = 0; i < particleCount; i++) {
                    const spreadX = (Math.random() - 0.5) * sideSpread;
                    const spreadY = (Math.random() - 0.5) * sideSpread;

                    // Bigger particles when accelerating
                    const baseSize = 2.5 + accelFactor * 2;

                    // Acquire particle from pool
                    const particle = globalParticlePool.acquire();
                    particle.x = this.position.x + behindOffset.x + spreadX;
                    particle.y = this.position.y + behindOffset.y + spreadY;
                    particle.vx = -direction.x * (15 + accelFactor * 30) + (Math.random() - 0.5) * 40;
                    particle.vy = -direction.y * (15 + accelFactor * 30) + (Math.random() - 0.5) * 40;
                    particle.life = 0.3 + Math.random() * 0.3;
                    particle.maxLife = 0.6;
                    particle.size = baseSize + Math.random() * 1.5;
                    particle.color = Math.random() > 0.5 ? 'rgb(139, 90, 43)' : 'rgb(120, 75, 35)';
                }
            }

            this.previous_velocity = this.velocity;
        }

        // Update all active particles in the global pool
        // (This happens once per frame in the Race update, not per horse)
    }

    startRunning() {
        this.is_running = true;
    }
}

class Race {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Load images
        this.trackImage = new Image();
        this.trackImage.src = 'src/assets/racetrack.png';
        this.trackLoaded = false;
        this.trackImage.onload = () => {
            this.trackLoaded = true;
            this.checkImagesLoaded();
        };

        this.horseImage = new Image();
        this.horseImage.src = 'src/assets/horse.png';
        this.horseLoaded = false;
        this.horseImage.onload = () => {
            this.horseLoaded = true;
            this.checkImagesLoaded();
        };

        this.horses = [];
        this.race_time = 0.0;
        this.raceStarted = false;
        this.imagesLoaded = false;
    }

    checkImagesLoaded() {
        if (this.trackLoaded && this.horseLoaded && !this.imagesLoaded) {
            this.imagesLoaded = true;
            this.setupTrack();
        }
    }

    setupTrack() {
        // Scale track by 4x - MASSIVE TRACK BABY!
        const baseWidth = this.trackImage.width * 4;
        const baseHeight = this.trackImage.height * 4;

        this.trackWidth = baseWidth;
        this.trackHeight = baseHeight;

        // Create scaled canvas
        this.trackCanvas = document.createElement('canvas');
        this.trackCanvas.width = baseWidth;
        this.trackCanvas.height = baseHeight;
        const trackCtx = this.trackCanvas.getContext('2d');
        trackCtx.imageSmoothingEnabled = false;
        trackCtx.drawImage(this.trackImage, 0, 0, baseWidth, baseHeight);

        // Spawn horses
        const gateX = this.trackWidth / 2;
        const numHorses = 10;  // Increased to 10 horses!
        const spacing = 60;  // Scaled 4x from 25
        const startY = 160;   // Scaled 4x from 50

        const horseNumbers = [];
        while (horseNumbers.length < numHorses) {
            const num = Math.floor(Math.random() * 99) + 1;
            if (!horseNumbers.includes(num)) {
                horseNumbers.push(num);
            }
        }

        for (let i = 0; i < numHorses; i++) {
            const y = startY + (i * spacing);
            const initPosition = new Vector2(gateX, y);
            const horse = new Horse(initPosition, i, horseNumbers[i], this.horseImage);
            horse.applyColorTint();
            this.horses.push(horse);
        }

        // Setup corner data
        const cornerSize = Math.floor(this.trackHeight / 2);

        this.topleft_corner = { x: 0, y: 0, width: cornerSize, height: cornerSize };
        this.topright_corner = { x: this.trackWidth - cornerSize, y: 0, width: cornerSize, height: cornerSize };
        this.bottomleft_corner = { x: 0, y: this.trackHeight - cornerSize, width: cornerSize, height: cornerSize };
        this.bottomright_corner = { x: this.trackWidth - cornerSize, y: this.trackHeight - cornerSize, width: cornerSize, height: cornerSize };

        // Sprint zones
        const sprintHeight = 800;  // Scaled 4x from 200

        this.top_sprint = {
            x: this.topleft_corner.x + this.topleft_corner.width,
            y: 0,
            width: this.topright_corner.x - (this.topleft_corner.x + this.topleft_corner.width),
            height: sprintHeight
        };

        this.bottom_sprint = {
            x: this.bottomleft_corner.x + this.bottomleft_corner.width,
            y: this.trackHeight - sprintHeight,
            width: this.bottomright_corner.x - (this.bottomleft_corner.x + this.bottomleft_corner.width),
            height: sprintHeight
        };

        // Sprint fences
        const fenceThickness = 40;  // Scaled 4x from 10

        this.top_sprint_top_fence = {
            x: this.top_sprint.x,
            y: this.top_sprint.y + 80,  // Scaled 4x from 20
            width: this.top_sprint.width,
            height: fenceThickness
        };

        this.top_sprint_bottom_fence = {
            x: this.top_sprint.x,
            y: this.top_sprint.y + this.top_sprint.height - fenceThickness,
            width: this.top_sprint.width,
            height: fenceThickness
        };

        this.bottom_sprint_top_fence = {
            x: this.bottom_sprint.x,
            y: this.bottom_sprint.y,
            width: this.bottom_sprint.width,
            height: fenceThickness
        };

        this.bottom_sprint_bottom_fence = {
            x: this.bottom_sprint.x,
            y: this.bottom_sprint.y + this.bottom_sprint.height - fenceThickness - 80,  // Scaled 4x from 20
            width: this.bottom_sprint.width,
            height: fenceThickness
        };

        this.sprintFences = [
            this.top_sprint_top_fence,
            this.top_sprint_bottom_fence,
            this.bottom_sprint_top_fence,
            this.bottom_sprint_bottom_fence
        ];

        this.sprintZones = [this.top_sprint, this.bottom_sprint];

        // Setup checkpoints around the track (8 checkpoints)
        // Start line in the middle of top straight
        this.checkpoints = [
            { x: this.trackWidth / 2, y: sprintHeight / 2, radius: 100 }, // Start/finish (checkpoint 0)
            { x: this.trackWidth - cornerSize / 2, y: sprintHeight / 2, radius: 100 }, // Right side of top straight
            { x: this.trackWidth - cornerSize / 2, y: cornerSize / 2, radius: 100 }, // Top-right corner
            { x: this.trackWidth - cornerSize / 2, y: this.trackHeight / 2, radius: 100 }, // Right side mid
            { x: this.trackWidth - cornerSize / 2, y: this.trackHeight - cornerSize / 2, radius: 100 }, // Bottom-right corner
            { x: this.trackWidth / 2, y: this.trackHeight - sprintHeight / 2, radius: 100 }, // Middle of bottom straight
            { x: cornerSize / 2, y: this.trackHeight - cornerSize / 2, radius: 100 }, // Bottom-left corner
            { x: cornerSize / 2, y: cornerSize / 2, radius: 100 }, // Top-left corner
        ];

        // Calculate track distances and create distance markers
        this.calculateTrackDistances();
        this.createDistanceMarkers();
    }

    calculateTrackDistances() {
        // Calculate actual track distance using the real racing path
        // Standard horse length for distance calculations
        this.HORSE_LENGTH = 96;  // ~8 feet in pixels (scaled 4x from 24px)

        // Build the actual racing path using sprint zones and corner arcs
        this.racingPath = [];
        let cumulativeDistance = 0;

        // Start/Finish line is at center of top sprint
        const startX = this.trackWidth / 2;
        const startY = this.top_sprint.y + this.top_sprint.height / 2;

        // 1. Top sprint - from start to right edge (going RIGHT)
        const topSprintDistance = (this.top_sprint.x + this.top_sprint.width) - startX;
        this.racingPath.push({
            type: 'straight',
            startX: startX,
            startY: startY,
            endX: this.top_sprint.x + this.top_sprint.width,
            endY: startY,
            distance: topSprintDistance,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + topSprintDistance
        });
        cumulativeDistance += topSprintDistance;

        // 2. Top-right corner (quarter circle, going DOWN and LEFT)
        const cornerSize = this.topright_corner.width;
        // Calculate racing line radius - midpoint between inner and outer fence
        const outerRadius = cornerSize - 120;  // Scaled 4x from 30
        const innerRadius = outerRadius / 2 + 80;  // Scaled 4x from 20
        const cornerRadius = (outerRadius + innerRadius) / 2;  // Racing line in middle
        const cornerArcLength = (Math.PI / 2) * cornerRadius;  // 90 degree arc
        this.racingPath.push({
            type: 'corner',
            centerX: this.topright_corner.x,  // Bottom-left of corner rectangle
            centerY: this.topright_corner.y + cornerSize,
            radius: cornerRadius,
            startAngle: 0,  // 0 degrees (facing right)
            endAngle: Math.PI / 2,  // 90 degrees (facing down)
            distance: cornerArcLength,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + cornerArcLength
        });
        cumulativeDistance += cornerArcLength;

        // 3. Right side straight (going DOWN)
        const rightSideDistance = this.bottomright_corner.y - (this.topright_corner.y + cornerSize);
        this.racingPath.push({
            type: 'straight',
            startX: this.topright_corner.x + cornerSize / 2,
            startY: this.topright_corner.y + cornerSize,
            endX: this.topright_corner.x + cornerSize / 2,
            endY: this.bottomright_corner.y,
            distance: rightSideDistance,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + rightSideDistance
        });
        cumulativeDistance += rightSideDistance;

        // 4. Bottom-right corner (going LEFT and DOWN)
        this.racingPath.push({
            type: 'corner',
            centerX: this.bottomright_corner.x,  // Top-left of corner rectangle
            centerY: this.bottomright_corner.y,
            radius: cornerRadius,
            startAngle: Math.PI / 2,  // 90 degrees
            endAngle: Math.PI,  // 180 degrees
            distance: cornerArcLength,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + cornerArcLength
        });
        cumulativeDistance += cornerArcLength;

        // 5. Bottom sprint (going LEFT)
        const bottomSprintDistance = this.bottom_sprint.width;
        this.racingPath.push({
            type: 'straight',
            startX: this.bottom_sprint.x + this.bottom_sprint.width,
            startY: this.bottom_sprint.y + this.bottom_sprint.height / 2,
            endX: this.bottom_sprint.x,
            endY: this.bottom_sprint.y + this.bottom_sprint.height / 2,
            distance: bottomSprintDistance,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + bottomSprintDistance
        });
        cumulativeDistance += bottomSprintDistance;

        // 6. Bottom-left corner (going UP and LEFT)
        this.racingPath.push({
            type: 'corner',
            centerX: this.bottomleft_corner.x + cornerSize,  // Top-right of corner rectangle
            centerY: this.bottomleft_corner.y,
            radius: cornerRadius,
            startAngle: Math.PI,  // 180 degrees
            endAngle: Math.PI * 1.5,  // 270 degrees
            distance: cornerArcLength,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + cornerArcLength
        });
        cumulativeDistance += cornerArcLength;

        // 7. Left side straight (going UP)
        const leftSideDistance = (this.bottomleft_corner.y) - (this.topleft_corner.y + cornerSize);
        this.racingPath.push({
            type: 'straight',
            startX: this.bottomleft_corner.x + cornerSize / 2,
            startY: this.bottomleft_corner.y,
            endX: this.topleft_corner.x + cornerSize / 2,
            endY: this.topleft_corner.y + cornerSize,
            distance: leftSideDistance,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + leftSideDistance
        });
        cumulativeDistance += leftSideDistance;

        // 8. Top-left corner (going RIGHT and UP)
        this.racingPath.push({
            type: 'corner',
            centerX: this.topleft_corner.x + cornerSize,  // Bottom-right of corner rectangle
            centerY: this.topleft_corner.y + cornerSize,
            radius: cornerRadius,
            startAngle: Math.PI * 1.5,  // 270 degrees
            endAngle: Math.PI * 2,  // 360 degrees (0 degrees)
            distance: cornerArcLength,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + cornerArcLength
        });
        cumulativeDistance += cornerArcLength;

        // 9. Top sprint - from left edge to start/finish
        const topSprintFinalDistance = startX - this.top_sprint.x;
        this.racingPath.push({
            type: 'straight',
            startX: this.top_sprint.x,
            startY: startY,
            endX: startX,
            endY: startY,
            distance: topSprintFinalDistance,
            cumulativeStart: cumulativeDistance,
            cumulativeEnd: cumulativeDistance + topSprintFinalDistance
        });
        cumulativeDistance += topSprintFinalDistance;

        this.totalTrackDistance = cumulativeDistance;
        console.log(`Total track distance: ${Math.floor(this.totalTrackDistance)}px (~${Math.floor(this.totalTrackDistance / 201)}m)`);
        console.log(`Racing path segments: ${this.racingPath.length}`);
    }

    createDistanceMarkers() {
        // Create distance markers at specific distances BEFORE the finish line
        // Finish line = checkpoint 0 (start/finish)
        // Markers show distance REMAINING to finish, counting DOWN

        this.distanceMarkers = [];

        // Standard racing poles in pixels (scaled 4x)
        // 1 furlong ≈ 201 meters ≈ 800 pixels at our scale
        const FURLONG = 800;  // 1/8 mile

        // Define poles at specific distances before finish (in order from far to close)
        const poleDistances = [
            { distance: FURLONG * 4, name: '1/2 mile', color: 'white', thick: true },      // 3200px (4 furlongs)
            { distance: FURLONG * 2, name: '1/4 mile', color: 'red', thick: true },        // 1600px (2 furlongs) - Quarter Pole
            { distance: FURLONG * 1.5, name: '3/16 mile', color: 'black', thick: false },  // 1200px
            { distance: FURLONG, name: '1/8 mile', color: 'green', thick: true },          // 800px - Furlong Pole
            { distance: FURLONG / 2, name: '1/16 mile', color: 'black', thick: false }     // 400px
        ];

        // For each pole, calculate its position working BACKWARDS from finish line
        for (const pole of poleDistances) {
            // Distance from start where this pole should be
            // = (total track distance) - (distance before finish)
            const distanceFromStart = this.totalTrackDistance - pole.distance;

            // Skip if pole would be before the start
            if (distanceFromStart < 0) continue;

            // Find which racing path segment this falls into
            for (const segment of this.racingPath) {
                if (distanceFromStart >= segment.cumulativeStart && distanceFromStart < segment.cumulativeEnd) {
                    // Calculate exact position along this segment
                    const distanceIntoSegment = distanceFromStart - segment.cumulativeStart;
                    const segmentProgress = distanceIntoSegment / segment.distance;

                    let markerX, markerY;

                    if (segment.type === 'straight') {
                        // Linear interpolation for straight sections
                        markerX = segment.startX + (segment.endX - segment.startX) * segmentProgress;
                        markerY = segment.startY + (segment.endY - segment.startY) * segmentProgress;
                    } else if (segment.type === 'corner') {
                        // Arc interpolation for corner sections
                        const angleProgress = segment.startAngle + (segment.endAngle - segment.startAngle) * segmentProgress;
                        markerX = segment.centerX + Math.cos(angleProgress) * segment.radius;
                        markerY = segment.centerY + Math.sin(angleProgress) * segment.radius;
                    }

                    this.distanceMarkers.push({
                        x: markerX,
                        y: markerY,
                        distanceToFinish: pole.distance,
                        name: pole.name,
                        color: pole.color,
                        thick: pole.thick
                    });

                    break;
                }
            }
        }

        console.log(`Created ${this.distanceMarkers.length} distance poles (showing distance remaining to finish)`);
        this.distanceMarkers.forEach(m => {
            console.log(`  ${m.name} pole: ${Math.floor(m.distanceToFinish)}px to finish`);
        });
    }

    startRace() {
        for (const horse of this.horses) {
            horse.startRunning();
        }
        this.race_time = 0.0;
        this.raceStarted = true;
    }

    update(dt) {
        if (!this.trackLoaded) return;

        if (this.horses.some(h => h.is_running)) {
            this.race_time += dt;
        }

        // Update awareness
        for (const horse of this.horses) {
            horse.updateAwareness(this.horses);
            horse.detectHorsesAhead(this.horses);
        }

        // Calculate corner data
        const outerRadius = this.topleft_corner.width - 120;  // Scaled 4x from 30
        const innerRadius = outerRadius / 2 + 80;  // Scaled 4x from 20

        const cornerData = [
            [
                this.topleft_corner,
                new Vector2(this.topleft_corner.x + this.topleft_corner.width, this.topleft_corner.y + this.topleft_corner.height),
                outerRadius,
                new Vector2(this.topleft_corner.x + this.topleft_corner.width, this.topleft_corner.y + this.topleft_corner.height),
                innerRadius
            ],
            [
                this.topright_corner,
                new Vector2(this.topright_corner.x, this.topright_corner.y + this.topright_corner.height),
                outerRadius,
                new Vector2(this.topright_corner.x, this.topright_corner.y + this.topright_corner.height),
                innerRadius
            ],
            [
                this.bottomleft_corner,
                new Vector2(this.bottomleft_corner.x + this.bottomleft_corner.width, this.bottomleft_corner.y),
                outerRadius,
                new Vector2(this.bottomleft_corner.x + this.bottomleft_corner.width, this.bottomleft_corner.y),
                innerRadius
            ],
            [
                this.bottomright_corner,
                new Vector2(this.bottomright_corner.x, this.bottomright_corner.y),
                outerRadius,
                new Vector2(this.bottomright_corner.x, this.bottomright_corner.y),
                innerRadius
            ]
        ];

        const trackBounds = {
            x: 0,
            y: 0,
            width: this.trackWidth,
            height: this.trackHeight
        };

        // Update horses
        for (const horse of this.horses) {
            horse.update(dt, cornerData, trackBounds, this.sprintFences, this.sprintZones, this.checkpoints);
        }

        // Update all particles once per frame (shared pool)
        const activeParticles = globalParticlePool.getActiveParticles();
        for (const p of activeParticles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.92; // Friction
            p.vy *= 0.92;
            p.life -= dt;

            if (p.life <= 0) {
                globalParticlePool.release(p);
            }
        }
    }

    render(debugMode = true, cameraOffset = new Vector2(0, 0), zoom = 1.0) {
        if (!this.imagesLoaded) {
            this.ctx.fillStyle = '#808080';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#808080';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(cameraOffset.x, cameraOffset.y);
        this.ctx.scale(zoom, zoom);

        // Draw track
        this.ctx.drawImage(this.trackCanvas, 0, 0);

        // Draw debug overlays
        if (debugMode) {
            this.ctx.strokeStyle = 'yellow';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(this.topleft_corner.x, this.topleft_corner.y, this.topleft_corner.width, this.topleft_corner.height);
            this.ctx.strokeRect(this.topright_corner.x, this.topright_corner.y, this.topright_corner.width, this.topright_corner.height);
            this.ctx.strokeRect(this.bottomleft_corner.x, this.bottomleft_corner.y, this.bottomleft_corner.width, this.bottomleft_corner.height);
            this.ctx.strokeRect(this.bottomright_corner.x, this.bottomright_corner.y, this.bottomright_corner.width, this.bottomright_corner.height);

            this.ctx.strokeStyle = 'blue';
            this.ctx.strokeRect(this.top_sprint.x, this.top_sprint.y, this.top_sprint.width, this.top_sprint.height);
            this.ctx.strokeRect(this.bottom_sprint.x, this.bottom_sprint.y, this.bottom_sprint.width, this.bottom_sprint.height);

            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.fillRect(this.top_sprint_top_fence.x, this.top_sprint_top_fence.y, this.top_sprint_top_fence.width, this.top_sprint_top_fence.height);
            this.ctx.fillRect(this.top_sprint_bottom_fence.x, this.top_sprint_bottom_fence.y, this.top_sprint_bottom_fence.width, this.top_sprint_bottom_fence.height);
            this.ctx.fillRect(this.bottom_sprint_top_fence.x, this.bottom_sprint_top_fence.y, this.bottom_sprint_top_fence.width, this.bottom_sprint_top_fence.height);
            this.ctx.fillRect(this.bottom_sprint_bottom_fence.x, this.bottom_sprint_bottom_fence.y, this.bottom_sprint_bottom_fence.width, this.bottom_sprint_bottom_fence.height);

            // Draw checkpoints
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            this.ctx.strokeStyle = 'lime';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < this.checkpoints.length; i++) {
                const cp = this.checkpoints[i];
                this.ctx.beginPath();
                this.ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // Draw checkpoint number
                this.ctx.fillStyle = 'white';
                this.ctx.font = '20px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(i.toString(), cp.x, cp.y);
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            }

            // Draw distance poles (markers showing distance to finish)
            for (const pole of this.distanceMarkers) {
                this.ctx.fillStyle = pole.color;
                this.ctx.strokeStyle = pole.color;
                this.ctx.lineWidth = pole.thick ? 5 : 3;

                // Draw vertical pole
                this.ctx.beginPath();
                this.ctx.moveTo(pole.x, pole.y - 25);
                this.ctx.lineTo(pole.x, pole.y + 25);
                this.ctx.stroke();

                // Draw horizontal crossbar at top
                this.ctx.lineWidth = pole.thick ? 4 : 2;
                this.ctx.beginPath();
                this.ctx.moveTo(pole.x - 12, pole.y - 25);
                this.ctx.lineTo(pole.x + 12, pole.y - 25);
                this.ctx.stroke();

                // Draw label
                this.ctx.fillStyle = 'white';
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 3;
                this.ctx.font = 'bold 14px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'bottom';
                this.ctx.strokeText(pole.name, pole.x, pole.y - 30);
                this.ctx.fillText(pole.name, pole.x, pole.y - 30);
            }
        }

        // Draw all particles first (from global pool)
        const activeParticles = globalParticlePool.getActiveParticles();
        if (activeParticles.length > 0) {
            for (const particle of activeParticles) {
                const alpha = particle.life / particle.maxLife;
                this.ctx.globalAlpha = alpha * 0.6;
                this.ctx.fillStyle = particle.color;
                this.ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
            }
            this.ctx.globalAlpha = 1.0;
        }

        // Draw horses and particles
        for (const horse of this.horses) {

            // Draw horse sprite
            this.ctx.save();
            this.ctx.translate(horse.position.x, horse.position.y);
            this.ctx.rotate((horse.steer_angle + 180) * Math.PI / 180);

            if (horse.tintedImage) {
                // Draw the tinted horse image (rotated 90 degrees to face left originally)
                // Scale down to 2% of original size, then apply HORSE_SPRITE_SCALE multiplier
                const scale = 0.02 * HORSE_SPRITE_SCALE;
                const w = horse.tintedImage.width * scale;
                const h = horse.tintedImage.height * scale;
                this.ctx.drawImage(horse.tintedImage, -w / 2, -h / 2, w, h);
            } else {
                // Fallback: draw simple horse shape
                const color = `rgb(${horse.color[0]}, ${horse.color[1]}, ${horse.color[2]})`;

                // Body (oval)
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
                this.ctx.fill();

                // Head (small circle)
                this.ctx.beginPath();
                this.ctx.arc(-12, 0, 4, 0, Math.PI * 2);
                this.ctx.fill();

                // Legs (4 small lines)
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-4, 5);
                this.ctx.lineTo(-4, 10);
                this.ctx.moveTo(0, 5);
                this.ctx.lineTo(0, 10);
                this.ctx.moveTo(4, 5);
                this.ctx.lineTo(4, 10);
                this.ctx.moveTo(8, 5);
                this.ctx.lineTo(8, 10);
                this.ctx.stroke();

                // Tail
                this.ctx.beginPath();
                this.ctx.moveTo(10, 0);
                this.ctx.lineTo(14, 2);
                this.ctx.stroke();
            }

            this.ctx.restore();

            // Draw horse number marker
            const markerX = horse.position.x;
            const markerY = horse.position.y - 20;

            const powerColor = `rgb(${Math.floor(255 * horse.power)}, ${Math.floor(255 * (1.0 - Math.abs(horse.power - 0.5) * 2))}, ${Math.floor(255 * (1.0 - horse.power))})`;

            this.ctx.fillStyle = powerColor;
            this.ctx.beginPath();
            this.ctx.arc(markerX, markerY, 12, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(markerX, markerY, 12, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.fillStyle = 'black';
            this.ctx.font = '16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(horse.number.toString(), markerX, markerY);

            if (debugMode) {
                // Draw stats in compact format
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                this.ctx.fillRect(markerX - 50, markerY - 50, 100, 35);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '9px monospace';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`A${horse.acceleration_skill.toFixed(1)} S${horse.top_speed_skill.toFixed(1)}`, markerX - 48, markerY - 40);
                this.ctx.fillText(`C${horse.corner_skill.toFixed(1)} G${horse.gate_skill.toFixed(1)}`, markerX - 48, markerY - 30);
                this.ctx.fillText(`STA${horse.stamina_efficiency.toFixed(1)}`, markerX - 48, markerY - 20);
                this.ctx.textAlign = 'center';

                // Draw centrifugal force
                if (horse.centrifugal_force > 0.01) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.fillRect(markerX - 30, markerY - 45, 60, 16);
                    this.ctx.fillStyle = 'rgb(255, 150, 0)';
                    this.ctx.fillText(`CF:${horse.centrifugal_force.toFixed(2)}`, markerX, markerY - 37);
                }

                // Draw direction vector
                const dir = horse.getVecRotated().multiply(100);
                this.ctx.strokeStyle = 'green';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(horse.position.x, horse.position.y);
                this.ctx.lineTo(horse.position.x + dir.x, horse.position.y + dir.y);
                this.ctx.stroke();

                // Draw wit circle
                const lookaheadDir = horse.getVecRotated().multiply(horse.wit_level);
                const lookaheadCenter = horse.position.add(lookaheadDir);

                const intensity = Math.floor(horse.wit_activation_timer * 255);
                this.ctx.strokeStyle = `rgb(255, ${intensity}, 255)`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(lookaheadCenter.x, lookaheadCenter.y, horse.wit_radius, 0, Math.PI * 2);
                this.ctx.stroke();

                // Draw wit action text
                if (horse.wit_action) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.fillRect(markerX - 40, markerY - 65, 100, 16);
                    this.ctx.fillStyle = 'yellow';
                    this.ctx.font = '10px monospace';
                    this.ctx.textAlign = 'left';
                    this.ctx.fillText(horse.wit_action, markerX - 38, markerY - 57);
                }

                // Draw lines to detected horses
                for (const horseAhead of horse.horses_ahead) {
                    const otherPos = horseAhead.horse.position;
                    this.ctx.strokeStyle = horseAhead.distance < 80 ? 'rgb(255, 200, 0)' : 'rgb(150, 150, 0)';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(horse.position.x, horse.position.y);
                    this.ctx.lineTo(otherPos.x, otherPos.y);
                    this.ctx.stroke();
                }

                // Draw vision rays
                for (const ray of horse.vision_rays) {
                    const rayAngle = horse.steer_angle + ray.angle;
                    const rayDir = horse.vector.rotate(rayAngle).normalize().multiply(ray.distance);
                    const rayEnd = horse.position.add(rayDir);

                    let color;
                    if (ray.distance < 30) {
                        color = 'red';
                    } else if (ray.distance < 60) {
                        color = 'orange';
                    } else {
                        color = 'yellow';
                    }

                    this.ctx.strokeStyle = color;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(horse.position.x, horse.position.y);
                    this.ctx.lineTo(rayEnd.x, rayEnd.y);
                    this.ctx.stroke();

                    this.ctx.fillStyle = color;
                    this.ctx.beginPath();
                    this.ctx.arc(rayEnd.x, rayEnd.y, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // Draw proximity circle
                this.ctx.strokeStyle = 'cyan';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(horse.position.x, horse.position.y, horse.proximity_radius, 0, Math.PI * 2);
                this.ctx.stroke();

                // Draw collision box
                const rect = horse.getRotatedRect();
                this.ctx.strokeStyle = 'red';
                this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            }
        }

        this.ctx.restore();
    }
}

class UmaSim {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.resizeCanvas();

        this.race = new Race(this.canvas);

        this.lastTime = performance.now();
        this.raceStarted = false;
        this.debugMode = false;

        this.cameraOffset = new Vector2(0, 0);
        this.cameraSmoothness = 0.05;
        this.cameraZoom = 1.0;
        this.targetZoom = 1.0;
        this.zoomSmoothness = 0.03;

        this.cameraMode = "all_horses";
        this.cameraTimer = 0;
        this.cameraDuration = 8 + Math.random() * 5;  // 8-13 seconds for all_horses view
        this.closestHorses = [];
        this.positionCycleIndex = 0; // Start from last place (index 0 after sorting)

        // Track previous positions for animated leaderboard
        this.previousPositions = new Map();

        this.setupEventListeners();
        this.gameLoop();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.raceStarted) {
                e.preventDefault();
                this.race.startRace();
                this.raceStarted = true;
                document.getElementById('instructions').style.display = 'none';
            } else if (e.code === 'Tab') {
                e.preventDefault();
                this.debugMode = !this.debugMode;
            } else if (e.code === 'KeyI') {
                e.preventDefault();
                for (const horse of this.race.horses) {
                    horse.enable_inner_fence_hugging = !horse.enable_inner_fence_hugging;
                }
                const status = this.race.horses[0].enable_inner_fence_hugging ? 'enabled' : 'disabled';
                console.log(`Inner fence hugging: ${status}`);
            }
        });

        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    findClosestHorsePair() {
        if (this.race.horses.length < 2) return [];

        let minDistance = Infinity;
        let closestPair = [];

        for (let i = 0; i < this.race.horses.length; i++) {
            for (let j = i + 1; j < this.race.horses.length; j++) {
                const horse1 = this.race.horses[i];
                const horse2 = this.race.horses[j];
                const distance = horse1.position.distance(horse2.position);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPair = [horse1, horse2];
                }
            }
        }

        return closestPair;
    }

    getSortedHorsesByPosition() {
        // EXPERIMENTAL: Sort horses using angular position relative to track center
        // This approach doesn't need checkpoints - just uses angle + direction!
        const trackCenter = new Vector2(this.race.trackWidth / 2, this.race.trackHeight / 2);
        return [...this.race.horses].sort((a, b) => {
            const positionA = a.getRelativeRacePosition(trackCenter);
            const positionB = b.getRelativeRacePosition(trackCenter);
            return positionA - positionB; // Lower angle = further along track (reversed!)
        });
    }

    updateCameraMode(dt) {
        if (!this.raceStarted) return;

        this.cameraTimer += dt;

        if (this.cameraTimer >= this.cameraDuration) {
            if (this.cameraMode === "all_horses") {
                this.cameraMode = "closest_pair";
                this.closestHorses = this.findClosestHorsePair();
                this.targetZoom = 1.5;
                this.cameraDuration = 2 + Math.random() * 1.5;  // 2-3.5 seconds for closest pair
            } else if (this.cameraMode === "closest_pair") {
                // Switch to position cycle mode
                this.cameraMode = "position_cycle";
                const sortedHorses = this.getSortedHorsesByPosition();
                this.positionCycleIndex = sortedHorses.length - 1; // Start from last place
                this.targetZoom = 1.8;
                this.cameraDuration = 1.8; // 1.8 seconds per horse
            } else if (this.cameraMode === "position_cycle") {
                const sortedHorses = this.getSortedHorsesByPosition();
                this.positionCycleIndex--;

                if (this.positionCycleIndex < 0) {
                    // Finished cycling through all horses, go back to all_horses view
                    this.cameraMode = "all_horses";
                    this.closestHorses = [];
                    this.targetZoom = 1.0;
                    this.cameraDuration = 8 + Math.random() * 5;  // 8-13 seconds for all_horses view
                } else {
                    // Continue cycling
                    this.cameraDuration = 1.8; // 1.8 seconds per horse
                }
            }

            this.cameraTimer = 0;
        }
    }

    updateCamera() {
        if (this.race.horses.length === 0) return;

        let focusHorses = [];

        if (this.cameraMode === "closest_pair" && this.closestHorses.length > 0) {
            focusHorses = this.closestHorses;
        } else if (this.cameraMode === "position_cycle") {
            // Focus on single horse based on position
            const sortedHorses = this.getSortedHorsesByPosition();
            if (this.positionCycleIndex >= 0 && this.positionCycleIndex < sortedHorses.length) {
                focusHorses = [sortedHorses[this.positionCycleIndex]];
            } else {
                focusHorses = this.race.horses;
            }
        } else {
            // all_horses mode
            focusHorses = this.race.horses;
        }

        // Calculate center point
        let totalX = 0;
        let totalY = 0;
        for (const horse of focusHorses) {
            totalX += horse.position.x;
            totalY += horse.position.y;
        }

        const centerX = totalX / focusHorses.length;
        const centerY = totalY / focusHorses.length;

        // For all_horses mode, calculate dynamic zoom to fit all horses
        if (this.cameraMode === "all_horses" && focusHorses.length > 0) {
            // Find bounding box of all horses
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const horse of focusHorses) {
                minX = Math.min(minX, horse.position.x);
                maxX = Math.max(maxX, horse.position.x);
                minY = Math.min(minY, horse.position.y);
                maxY = Math.max(maxY, horse.position.y);
            }

            // Add padding around horses
            const padding = 200;
            const horseSpreadX = (maxX - minX) + padding * 2;
            const horseSpreadY = (maxY - minY) + padding * 2;

            // Calculate zoom to fit all horses
            const zoomX = this.canvas.width / horseSpreadX;
            const zoomY = this.canvas.height / horseSpreadY;
            this.targetZoom = Math.min(zoomX, zoomY, 1.0); // Don't zoom in more than 1.0x
        }

        this.cameraZoom += (this.targetZoom - this.cameraZoom) * this.zoomSmoothness;

        const displayCenterX = this.canvas.width / 2;
        const displayCenterY = this.canvas.height / 2;

        const targetOffset = new Vector2(
            displayCenterX - centerX * this.cameraZoom,
            displayCenterY - centerY * this.cameraZoom
        );

        this.cameraOffset.x += (targetOffset.x - this.cameraOffset.x) * this.cameraSmoothness;
        this.cameraOffset.y += (targetOffset.y - this.cameraOffset.y) * this.cameraSmoothness;
    }

    updateUI() {
        // Update timer
        const minutes = Math.floor(this.race.race_time / 60);
        const seconds = Math.floor(this.race.race_time % 60);
        const milliseconds = Math.floor((this.race.race_time % 1) * 100);
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        document.getElementById('timer').textContent = timeText;

        // Update animated leaderboard
        const sortedHorses = this.getSortedHorsesByPosition();

        // Update keiba-style position display with circles moving horizontally
        const keibaDisplay = document.getElementById('keibaDisplay');
        keibaDisplay.innerHTML = '';

        // Calculate track center for position calculations
        const trackCenter = new Vector2(this.race.trackWidth / 2, this.race.trackHeight / 2);

        // Get race positions for all horses
        const horsePositions = this.race.horses.map(horse => ({
            horse: horse,
            position: horse.getRelativeRacePosition(trackCenter)
        }));

        // Find min and max positions to normalize
        const positions = horsePositions.map(hp => hp.position);
        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);
        const posRange = maxPos - minPos || 1; // Avoid division by zero

        // Sort by position to assign vertical lanes
        const sortedByPos = [...horsePositions].sort((a, b) => b.position - a.position);

        // Assign vertical position based on race position
        const verticalPositions = new Map();
        sortedByPos.forEach((hp, index) => {
            verticalPositions.set(hp.horse.number, index);
        });

        // Create circle markers positioned along the bar
        for (const horsePos of horsePositions) {
            const horse = horsePos.horse;

            // Use the same power color as the horse
            const r = Math.floor(255 * horse.power);
            const g = Math.floor(255 * (1.0 - Math.abs(horse.power - 0.5) * 2));
            const b = Math.floor(255 * (1.0 - horse.power));
            const horseColor = `rgb(${r}, ${g}, ${b})`;

            // Calculate horizontal position (0 to 100%)
            const normalizedPos = (horsePos.position - minPos) / posRange;
            const leftPercent = normalizedPos * 100;

            // Get vertical lane (each horse gets own row) - TIGHTER!
            const laneIndex = verticalPositions.get(horse.number);
            const vOffset = laneIndex * 7; // 7px per lane (was 32px)

            // Create container div for circle + number
            const markerContainer = document.createElement('div');
            markerContainer.className = 'keiba-marker';
            markerContainer.style.position = 'absolute';
            markerContainer.style.left = `${leftPercent}%`;
            markerContainer.style.top = `${vOffset}px`;
            markerContainer.style.transform = 'translateX(-50%)';
            markerContainer.style.width = '24px';
            markerContainer.style.height = '24px';
            markerContainer.style.transition = 'left 0.3s ease-out, top 0.3s ease-out';

            // Create SVG circle
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
            svg.style.display = 'block';

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '12');
            circle.setAttribute('r', '10');
            circle.setAttribute('fill', horseColor);
            circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.6)');
            circle.setAttribute('stroke-width', '2');

            svg.appendChild(circle);
            markerContainer.appendChild(svg);

            // Add horse number text inside circle
            const numberLabel = document.createElement('div');
            numberLabel.style.position = 'absolute';
            numberLabel.style.top = '50%';
            numberLabel.style.left = '50%';
            numberLabel.style.transform = 'translate(-50%, -50%)';
            numberLabel.style.color = 'white';
            numberLabel.style.fontSize = '10px';
            numberLabel.style.fontWeight = 'bold';
            numberLabel.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
            numberLabel.textContent = horse.number;

            markerContainer.appendChild(numberLabel);
            keibaDisplay.appendChild(markerContainer);
        }
        const leaderboardEntries = document.getElementById('leaderboardEntries');

        // Create or update entries
        for (let i = 0; i < sortedHorses.length; i++) {
            const horse = sortedHorses[i];
            const position = i + 1;
            const entryId = `horse-${horse.number}`;

            let entry = document.getElementById(entryId);

            // Create entry if it doesn't exist
            if (!entry) {
                entry = document.createElement('div');
                entry.id = entryId;
                entry.className = 'leaderboard-entry';
                leaderboardEntries.appendChild(entry);

                // Store initial position
                this.previousPositions.set(horse.number, position);
            }

            // Use the same power color as the horse circles on the track
            const r = Math.floor(255 * horse.power);
            const g = Math.floor(255 * (1.0 - Math.abs(horse.power - 0.5) * 2));
            const b = Math.floor(255 * (1.0 - horse.power));
            const bgColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
            const numberColor = `rgb(${r}, ${g}, ${b})`;

            // Running style info
            const styleAbbrev = horse.running_style.substring(0, 1).toUpperCase();
            const surgeIndicator = horse.late_surge_activated ? '!' : '';

            // Update entry content
            entry.style.backgroundColor = bgColor;
            entry.innerHTML = `
                <span class="position">${position}</span>
                <span class="number-badge" style="background-color: ${numberColor}; color: black;">#${horse.number}</span>
                <span class="info">[${styleAbbrev}${surgeIndicator}] L${horse.lap}</span>
            `;

            // Animate position change
            const targetTop = position * 40; // 40px per entry
            entry.style.top = `${targetTop}px`;

            // Update previous position
            this.previousPositions.set(horse.number, position);
        }
    }

    gameLoop() {
        const currentTime = performance.now();
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = currentTime;

        this.race.update(dt);
        this.updateCameraMode(dt);
        this.updateCamera();
        this.race.render(this.debugMode, this.cameraOffset, this.cameraZoom);
        this.updateUI();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new UmaSim();
});
