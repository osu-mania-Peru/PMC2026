// Horse Racing Simulator - Horse Class
class Horse {
    constructor(initPosition, colorIndex = 0, horseNumber = 1, horseImage = null) {
        this.number = horseNumber;
        this.power = 0.6 + Math.random() * 0.4; // 0.6 to 1.0 (reduced variance for fairness)
        this.color = HORSE_COLORS[colorIndex % HORSE_COLORS.length];
        this.horseImage = horseImage;
        this.tintedImage = null;

        this.position = new Vector2(initPosition.x, initPosition.y);
        this.width = 30;
        this.height = 30;

        // Assign random running style
        const styles = Object.values(RUNNING_STYLES);
        this.running_style = styles[Math.floor(Math.random() * styles.length)];

        // Base stats influenced by running style - with RNG variance!
        const speedVariance = 0.9 + Math.random() * 0.2;  // 90% to 110% multiplier
        this.base_velocity = 180 * speedVariance;  // Boosted from 140, now 162-198
        this.velocity = 0;
        this.max_velocity = 260 * speedVariance;  // Boosted from 200, now 234-286
        this.acceleration = (80 + Math.random() * 20) * speedVariance;  // 72-110
        this.deceleration = 30;

        // Core specialized stats (0.8 to 1.2 range, 1.0 is average)
        this.corner_skill = 0.8 + Math.random() * 0.4;  // How well they handle curves
        this.acceleration_skill = 0.8 + Math.random() * 0.4;  // Acceleration rate multiplier
        this.top_speed_skill = 0.8 + Math.random() * 0.4;  // Max speed multiplier
        this.stamina_efficiency = 0.8 + Math.random() * 0.4;  // Stamina drain multiplier (lower = better)
        this.gate_skill = 0.8 + Math.random() * 0.4;  // Start reaction time
        this.last_spurt_skill = 0.7 + Math.random() * 0.6;  // Final push strength (0.7-1.3)

        // Energy Management (Uma Musume inspired)
        this.guts_reserve = 0.7 + Math.random() * 0.6;  // Extra stamina pool for emergencies (0.7-1.3)
        this.stamina_recovery_rate = 0.8 + Math.random() * 0.4;  // Stamina regeneration in low-stress moments

        // Positioning & Navigation
        this.lane_change_skill = 0.8 + Math.random() * 0.4;  // Maneuvering through pack
        this.gap_sense = 0.8 + Math.random() * 0.4;  // Finding openings
        this.positioning_iq = 0.8 + Math.random() * 0.4;  // Strategic positioning

        // Specialized Acceleration
        this.start_dash_power = 0.8 + Math.random() * 0.4;  // Gate break acceleration
        this.corner_exit_acceleration = 0.8 + Math.random() * 0.4;  // Speed recovery after corners
        this.mid_race_kick = 0.7 + Math.random() * 0.6;  // Burst speed capability

        // Mental & Consistency
        this.focus_level = 0.8 + Math.random() * 0.4;  // Performance consistency
        this.pressure_resistance = 0.7 + Math.random() * 0.6;  // Performance in close races

        // Adaptability
        this.pack_racing_skill = 0.8 + Math.random() * 0.4;  // Performance when surrounded

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
        this.vision_length = 200;
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

        this.power_level = 70 + Math.floor(Math.random() * 31); // 70-100 (reduced variance)
        this.aggression = 0.4 + Math.random() * 0.5;  // 0.4-0.9 (reduced variance)
        this.awareness_360 = true;

        // Stamina system for running styles
        this.stamina = 100;  // Start at 100%
        this.max_stamina = 100;
        this.stamina_drain_rate = 1.0;  // Modified by running style
        this.late_surge_activated = false;

        // Repositioning system - horses sometimes try to improve position
        this.repositioning_active = false;
        this.repositioning_timer = 0.0;  // How long current repositioning lasts
        this.repositioning_cooldown = 3.0 + Math.random() * 5.0;  // Time until next repositioning (3-8 seconds)

        // Grass particles (using global pool)
        this.particleSpawnTimer = 0;
        this.previous_velocity = 0;
    }

    applyRunningStyleModifiers() {
        switch (this.running_style) {
            case RUNNING_STYLES.NIGE:  // Runner - fast early, drains stamina
                this.base_velocity *= 1.03;  // +3% base speed
                this.max_velocity *= 1.03;   // +3% max speed
                this.acceleration *= 1.1;    // +10% acceleration
                this.stamina_drain_rate = 1.4;  // Drains stamina faster
                this.aggression = 0.7 + Math.random() * 0.3;  // More aggressive
                // Core skills
                this.acceleration_skill *= 1.1;
                this.gate_skill *= 1.15;
                this.last_spurt_skill *= 0.85;  // Weaker last push
                // Energy - poor reserves, bad recovery
                this.guts_reserve *= 0.8;
                this.stamina_recovery_rate *= 0.85;
                // Positioning - good lane changing, poor pack racing
                this.lane_change_skill *= 1.15;
                this.pack_racing_skill *= 0.9;
                // Acceleration - excellent start dash
                this.start_dash_power *= 1.25;
                this.corner_exit_acceleration *= 1.1;
                this.mid_race_kick *= 0.9;
                // Mental - high focus but poor under pressure
                this.focus_level *= 1.1;
                this.pressure_resistance *= 0.85;
                break;

            case RUNNING_STYLES.SENKOU:  // Leader - balanced front runner
                this.base_velocity *= 1.015;  // +1.5% base speed
                this.max_velocity *= 1.015;   // +1.5% max speed
                this.acceleration *= 1.06;    // +6% acceleration
                this.stamina_drain_rate = 1.15;
                this.aggression = 0.5 + Math.random() * 0.3;
                // Core skills - well-rounded
                this.stamina_efficiency *= 0.95;
                this.last_spurt_skill *= 0.95;
                // Energy - balanced
                this.guts_reserve *= 1.0;
                this.stamina_recovery_rate *= 1.05;
                // Positioning - excellent positioning IQ
                this.positioning_iq *= 1.2;
                this.gap_sense *= 1.1;
                // Acceleration - good all-around
                this.start_dash_power *= 1.1;
                this.corner_exit_acceleration *= 1.05;
                // Mental - very consistent
                this.focus_level *= 1.15;
                this.pressure_resistance *= 1.05;
                break;

            case RUNNING_STYLES.SASHI:  // Stalker - saves energy, good late game
                this.base_velocity *= 1.0;   // Normal base speed
                this.max_velocity *= 1.05;   // +5% max speed for late surge
                this.acceleration *= 1.025;  // +2.5% acceleration
                this.stamina_drain_rate = 0.85;  // Conserves stamina
                this.aggression = 0.4 + Math.random() * 0.3;
                // Core skills
                this.corner_skill *= 1.15;
                this.stamina_efficiency *= 0.9;
                this.last_spurt_skill *= 1.1;
                // Energy - good reserves and recovery
                this.guts_reserve *= 1.15;
                this.stamina_recovery_rate *= 1.15;
                // Positioning - excellent pack racing and gap sense
                this.pack_racing_skill *= 1.2;
                this.gap_sense *= 1.25;
                this.positioning_iq *= 1.15;
                // Acceleration - great mid-race kick and corner exit
                this.corner_exit_acceleration *= 1.2;
                this.mid_race_kick *= 1.15;
                this.start_dash_power *= 0.95;
                // Mental - good pressure resistance
                this.pressure_resistance *= 1.15;
                break;

            case RUNNING_STYLES.OIKOMI:  // Closer - slow start, explosive finish
                this.base_velocity *= 0.985; // -1.5% base speed
                this.max_velocity *= 1.08;   // +8% max speed for surge
                this.acceleration *= 0.975;  // -2.5% acceleration
                this.stamina_drain_rate = 0.7;  // Conserves lots of stamina
                this.aggression = 0.3 + Math.random() * 0.3;
                // Core skills
                this.top_speed_skill *= 1.2;
                this.stamina_efficiency *= 0.85;
                this.gate_skill *= 0.9;
                this.last_spurt_skill *= 1.25;  // Best last push
                // Energy - excellent reserves and recovery
                this.guts_reserve *= 1.3;
                this.stamina_recovery_rate *= 1.25;
                // Positioning - best pack racing
                this.pack_racing_skill *= 1.3;
                this.gap_sense *= 1.15;
                this.lane_change_skill *= 1.2;
                // Acceleration - poor start, amazing kick
                this.start_dash_power *= 0.75;
                this.mid_race_kick *= 1.35;
                this.corner_exit_acceleration *= 1.15;
                // Mental - exceptional pressure resistance
                this.pressure_resistance *= 1.3;
                this.focus_level *= 1.1;
                break;
        }

        // Clamp all skills to reasonable ranges
        this.corner_skill = Math.min(1.5, this.corner_skill);
        this.acceleration_skill = Math.min(1.5, this.acceleration_skill);
        this.top_speed_skill = Math.min(1.5, this.top_speed_skill);
        this.stamina_efficiency = Math.max(0.7, Math.min(1.2, this.stamina_efficiency));
        this.gate_skill = Math.min(1.5, this.gate_skill);
        this.last_spurt_skill = Math.max(0.6, Math.min(1.6, this.last_spurt_skill));

        // Energy management
        this.guts_reserve = Math.max(0.5, Math.min(1.7, this.guts_reserve));
        this.stamina_recovery_rate = Math.max(0.7, Math.min(1.5, this.stamina_recovery_rate));

        // Positioning & Navigation
        this.lane_change_skill = Math.max(0.7, Math.min(1.5, this.lane_change_skill));
        this.gap_sense = Math.max(0.7, Math.min(1.6, this.gap_sense));
        this.positioning_iq = Math.max(0.7, Math.min(1.6, this.positioning_iq));

        // Specialized Acceleration
        this.start_dash_power = Math.max(0.6, Math.min(1.6, this.start_dash_power));
        this.corner_exit_acceleration = Math.max(0.7, Math.min(1.6, this.corner_exit_acceleration));
        this.mid_race_kick = Math.max(0.6, Math.min(1.8, this.mid_race_kick));

        // Mental & Consistency
        this.focus_level = Math.max(0.7, Math.min(1.5, this.focus_level));
        this.pressure_resistance = Math.max(0.6, Math.min(1.7, this.pressure_resistance));

        // Adaptability
        this.pack_racing_skill = Math.max(0.7, Math.min(1.6, this.pack_racing_skill));
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

        // Don't steer for the first second - let horses get moving straight first
        if (this.race_time < 1.0) return;

        this.danger_level = 0.0;
        this.target_angle = this.steer_angle;  // Reset target to current angle each frame

        // Gate cooldown - reduce steering strength for first 4 seconds
        let gateCooldownFactor = 1.0;
        if (this.race_time < 4.0) {
            gateCooldownFactor = 0.1 + (this.race_time / 4.0) * 0.9;
        }

        // Check if in corner and apply centripetal force
        let cornerInfo = { inCorner: false, center: null, radius: null };
        let wasInCorner = false;
        if (cornerData) {
            this.distance_to_inner_fence = this.calculateDistanceToInnerFence(cornerData);
            cornerInfo = this.checkIfInCorner(cornerData);

            if (cornerInfo.inCorner) {
                wasInCorner = true;
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

        // Store corner state for corner exit acceleration
        this.wasInCorner = wasInCorner;

        // Repositioning boost - more aggressive when trying to reposition
        const repositioningBoost = this.repositioning_active ? 1.5 : 1.0;

        // Repositioning lane selection - wave motion (steer away and back)
        if (this.repositioning_active) {
            // Store initial angle and pick direction when repositioning starts
            if (this.repositioning_base_angle === undefined) {
                this.repositioning_base_angle = this.steer_angle;
                this.repositioning_max_duration = this.repositioning_timer;  // Store total duration

                // Generate 5 random angle candidates (between -15 and +15 degrees)
                const candidates = [];
                for (let i = 0; i < 5; i++) {
                    const randomAngle = (Math.random() - 0.5) * 30;  // -15 to +15 degrees
                    candidates.push(randomAngle);
                }

                // Raycast through each candidate to check for obstacles
                // Smarter horses (higher positioning_iq) raycast farther, max 1500px
                const baseRaycastDistance = 300;  // Base 300px lookahead
                const raycastDistance = Math.min(
                    baseRaycastDistance + (this.positioning_iq * 800),  // Scale with positioning IQ (300-1100px)
                    1500  // Hard cap at 1500px
                );
                const validCandidates = [];

                for (const angleOffset of candidates) {
                    const testAngle = this.steer_angle + angleOffset;
                    const testDir = this.vector.rotate(testAngle).normalize();

                    const raycastOrigin = this.position;

                    // Raycast in steps to detect obstacles
                    let isValid = true;
                    for (let distance = 10; distance < raycastDistance; distance += 10) {
                        const testPoint = raycastOrigin.add(testDir.multiply(distance));

                        // Check if this point hits a fence (reuse existing collision detection)
                        if (cornerData && this.isPointInFence(testPoint, cornerData, trackBounds, sprintFences)) {
                            isValid = false;
                            break;
                        }
                    }

                    // If raycast didn't hit anything, this is a valid candidate
                    if (isValid) {
                        validCandidates.push(angleOffset);
                    }
                }

                // Pick a random valid candidate, or stay straight if none are valid
                if (validCandidates.length > 0) {
                    const chosenAngle = validCandidates[Math.floor(Math.random() * validCandidates.length)];
                    // Store as direction multiplier for wave motion (-1 for left, +1 for right, or fractional)
                    this.repositioning_direction = chosenAngle / 15;  // Normalize to roughly -1 to +1
                } else {
                    // No valid candidates - don't reposition (stay straight)
                    this.repositioning_direction = 0;
                }

                // Store debug info for visualization
                this.repositioning_debug = {
                    candidates: candidates,
                    validCandidates: validCandidates,
                    chosenAngle: this.repositioning_direction * 15,
                    raycastDistance: raycastDistance,
                    startTime: performance.now() / 1000  // Store start time for animation
                };
            }

            // Calculate wave progress (0 to 1)
            const progress = 1.0 - (this.repositioning_timer / this.repositioning_max_duration);

            // Use smoothstep for very smooth wave motion instead of sine
            // Smoothstep: 3t² - 2t³ creates smoother acceleration/deceleration
            const smoothProgress = progress * progress * (3 - 2 * progress);

            // Double smoothstep for even smoother motion (ease in and out)
            const t = smoothProgress;
            const superSmooth = t * t * (3 - 2 * t);

            // Create 0 -> 1 -> 0 curve using the smooth progress
            let waveIntensity = Math.sin(superSmooth * Math.PI);

            // Apply damping near the end to prevent spring-back snap
            // When progress > 0.7, start heavily damping toward zero
            if (progress > 0.7) {
                const dampingProgress = (progress - 0.7) / 0.3;  // 0 to 1 over last 30%
                const dampingFactor = 1.0 - (dampingProgress * dampingProgress);  // Quadratic falloff
                waveIntensity *= dampingFactor;
            }

            // Check vision for obstacles - reduce wave if obstacles detected
            let visionSafety = 1.0;
            if (this.vision_rays.length > 0) {
                const centerRays = this.vision_rays.filter(r => Math.abs(r.angle) <= 15);
                const centerDistance = centerRays.length > 0
                    ? Math.min(...centerRays.map(r => r.distance))
                    : this.vision_length;

                // If obstacle is close, reduce wave motion
                if (centerDistance < 60) {
                    visionSafety = centerDistance / 60;  // 0 to 1 based on distance
                }
            }

            // Maximum angle deviation (how far to wave) - reduced by vision safety
            const maxWaveAngle = 6 * this.positioning_iq * visionSafety;  // 0-9 degrees (reduced from 8)

            // Calculate target offset from base angle
            const angleOffset = maxWaveAngle * waveIntensity * this.repositioning_direction;

            // Set target angle to base + offset (not adding, but setting!)
            this.target_angle = this.repositioning_base_angle + angleOffset;
        } else {
            // Clear repositioning state when not active
            this.repositioning_direction = null;
            this.repositioning_base_angle = undefined;
            this.repositioning_max_duration = null;
        }

        // Horse wit: Strategic positioning
        // Gap sense improves ability to find openings, positioning IQ improves decision making
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

            // Gap sense makes horses better at finding openings (more aggressive gap detection)
            const gapThreshold = Math.max(0, 2 - this.gap_sense);  // Higher gap sense = lower threshold
            if (leftCount > rightCount + gapThreshold) {
                const steerAmount = 5 * this.positioning_iq * repositioningBoost;  // Positioning IQ affects decision quality
                this.target_angle -= steerAmount;
                this.wit_action = `Gap R (L:${leftCount} R:${rightCount})${this.repositioning_active ? ' [REPOSITION]' : ''}`;
            } else if (rightCount > leftCount + gapThreshold) {
                const steerAmount = 5 * this.positioning_iq * repositioningBoost;
                this.target_angle += steerAmount;
                this.wit_action = `Gap L (L:${leftCount} R:${rightCount})${this.repositioning_active ? ' [REPOSITION]' : ''}`;
            }

            const closest = this.horses_ahead.reduce((min, h) =>
                h.distance < min.distance ? h : min
            );
            // Gap sense extends detection range
            const passDistance = 80 * this.gap_sense * repositioningBoost;  // Better gap sense = earlier detection, boosted during repositioning
            if (closest.distance < passDistance) {
                const steerAmount = 3 * this.positioning_iq * repositioningBoost;
                if (closest.side === "left") {
                    this.target_angle -= steerAmount;
                    this.wit_action = `Pass R (#${closest.horse.number} @${Math.floor(closest.distance)}px)${this.repositioning_active ? ' [REPOSITION]' : ''}`;
                } else {
                    this.target_angle += steerAmount;
                    this.wit_action = `Pass L (#${closest.horse.number} @${Math.floor(closest.distance)}px)${this.repositioning_active ? ' [REPOSITION]' : ''}`;
                }
            }
        } else {
            this.wit_activated = false;
            this.wit_action = "";
        }

        // Collision avoidance with nearby horses
        if (this.nearby_horses.length > 0) {
            const myDirection = this.getVecRotated();

            // Pack racing skill reduces danger when surrounded by horses
            const packDangerReduction = 1.0 / this.pack_racing_skill;  // Higher skill = less danger

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
                    // Apply pack racing skill to reduce danger
                    const baseDanger = proximityDanger * 0.7 * (1.0 - this.power * 0.4);
                    this.danger_level = Math.max(
                        this.danger_level,
                        baseDanger * packDangerReduction
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

                    // Lane change skill makes steering more effective when avoiding horses
                    if (steerAmount > 0) {
                        steerAmount *= this.lane_change_skill * repositioningBoost;  // Better lane changing = more effective maneuvering, boosted when repositioning
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

            const dangerThreshold = 100;
            const reactionThreshold = 80;

            if (centerDistance < dangerThreshold) {
                const obstacleDanger = Math.max(0, 1.0 - (centerDistance / dangerThreshold));
                this.danger_level = Math.max(
                    this.danger_level,
                    obstacleDanger * 0.8 * (1.0 - this.power * 0.3)
                );
            }

            if (centerDistance < reactionThreshold) {
                const rightDistance = this.simulateSteeringOption(-20, cornerData, trackBounds, sprintFences);
                const leftDistance = this.simulateSteeringOption(20, cornerData, trackBounds, sprintFences);

                const urgency = Math.max(0, 1.0 - (centerDistance / reactionThreshold));  // 0 to 1

                if (rightDistance > leftDistance + 10) {
                    this.target_angle -= (3 + urgency * 5) * gateCooldownFactor;
                } else if (leftDistance > rightDistance + 10) {
                    this.target_angle += (3 + urgency * 5) * gateCooldownFactor;
                } else if (leftDistance > rightDistance) {
                    this.target_angle += (2 + urgency * 3) * gateCooldownFactor;
                } else {
                    this.target_angle -= (2 + urgency * 3) * gateCooldownFactor;
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

        // Smooth steering - extra smooth during repositioning
        const angleDiff = this.target_angle - this.steer_angle;
        let smoothness = this.steering_smoothness;  // Default 0.1

        if (this.repositioning_active) {
            const progress = 1.0 - (this.repositioning_timer / this.repositioning_max_duration);

            // Extra damping when returning to base angle (last 30% of wave)
            if (progress > 0.7) {
                smoothness = 0.03;  // Very slow return to base angle
            } else {
                smoothness = 0.05;  // Normal repositioning smoothness
            }
        }

        this.steer_angle += angleDiff * smoothness;
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
    getRelativeRacePosition(trackCenter, startGatePosition = null) {
        // Get vector from track center to horse
        const toHorse = this.position.subtract(trackCenter);

        // Calculate angle from center (atan2 gives us -π to π)
        let angle = Math.atan2(toHorse.y, toHorse.x);

        // Normalize to 0 to 2π
        if (angle < 0) angle += Math.PI * 2;

        // Calculate start angle based on start gate position
        // If no start gate position provided, default to top center (270°)
        let startAngle = Math.PI * 1.5; // Default: 270° - top of track
        if (startGatePosition) {
            const toGate = startGatePosition.subtract(trackCenter);
            startAngle = Math.atan2(toGate.y, toGate.x);
            if (startAngle < 0) startAngle += Math.PI * 2;
        }

        // Calculate race angle relative to start gate
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

        // Handle repositioning system
        if (this.is_running) {
            if (this.repositioning_active) {
                // Countdown repositioning timer
                this.repositioning_timer -= dt;
                if (this.repositioning_timer <= 0) {
                    this.repositioning_active = false;
                    this.repositioning_cooldown = 3.0 + Math.random() * 5.0;  // Reset cooldown (3-8 seconds)
                }
            } else {
                // Countdown cooldown timer
                this.repositioning_cooldown -= dt;
                if (this.repositioning_cooldown <= 0) {
                    // 60% chance to trigger repositioning when cooldown expires
                    // Horses with higher positioning_iq reposition more often
                    const triggerChance = 0.5 + (this.positioning_iq * 0.1);  // 50-66% chance
                    if (Math.random() < triggerChance) {
                        this.repositioning_active = true;
                        this.repositioning_timer = 1.5 + Math.random() * 1.5;  // 1.5-3 seconds
                    } else {
                        // Didn't trigger, reset cooldown for shorter period
                        this.repositioning_cooldown = 2.0 + Math.random() * 3.0;  // 2-5 seconds
                    }
                }
            }
        }

        // Handle stamina drain and running style behavior
        if (this.is_running) {
            // Drain stamina based on velocity, running style, and stamina efficiency
            const velocityFactor = this.velocity / this.base_velocity;

            // RNG CHAOS - random stamina drain spikes (sometimes pace bites you in the ass!)
            const rngSpike = 0.85 + Math.random() * 0.3;  // 0.85x to 1.15x multiplier each frame

            // Early race aggression penalty - front runners burn MORE stamina if racing hard early
            let earlyPacePenalty = 1.0;
            if (this.race_time < 30) {  // First 30 seconds
                if (this.running_style === RUNNING_STYLES.NIGE) {
                    // NIGE horses gambling HARD - can randomly burn out
                    earlyPacePenalty = 1.3 + Math.random() * 0.4;  // 1.3x to 1.7x drain!
                } else if (this.running_style === RUNNING_STYLES.SENKOU) {
                    earlyPacePenalty = 1.15 + Math.random() * 0.25;  // 1.15x to 1.4x drain
                }
            }

            const staminaDrain = this.stamina_drain_rate * velocityFactor * this.stamina_efficiency * dt * 3 * rngSpike * earlyPacePenalty;
            this.stamina = Math.max(0, this.stamina - staminaDrain);

            // Stamina recovery in low-stress moments (low danger + not sprinting)
            if (this.danger_level < 0.2 && !this.in_sprint_zone && this.stamina < this.max_stamina) {
                const recoveryAmount = this.stamina_recovery_rate * dt * 5;  // Slow recovery
                this.stamina = Math.min(this.max_stamina, this.stamina + recoveryAmount);
            }

            // Check for late surge activation (earlier for closers)
            const raceProgress = this.total_progress / 8.0;  // 8 checkpoints per lap

            // Different surge timing based on running style
            let surgeThreshold = 0.75;  // Default: last 25%
            if (this.running_style === RUNNING_STYLES.OIKOMI) {
                surgeThreshold = 0.65;  // Closers surge at 65% (earlier)
            } else if (this.running_style === RUNNING_STYLES.SASHI) {
                surgeThreshold = 0.70;  // Stalkers surge at 70%
            }

            const isLastStretch = raceProgress > surgeThreshold;

            // Apply running style behaviors
            let styleModifier = 1.0;
            if (this.running_style === RUNNING_STYLES.OIKOMI || this.running_style === RUNNING_STYLES.SASHI) {
                // Late surgers activate in final stretch with remaining stamina
                if (isLastStretch && this.stamina > 30 && !this.late_surge_activated) {
                    this.late_surge_activated = true;
                }

                if (this.late_surge_activated) {
                    // More powerful speed boost for closers
                    if (this.running_style === RUNNING_STYLES.OIKOMI) {
                        styleModifier = 1.4 + (this.stamina / 100) * 0.3;  // Up to 1.7x boost for closers
                    } else {
                        styleModifier = 1.35 + (this.stamina / 100) * 0.25;  // Up to 1.6x boost for stalkers
                    }
                }
            }

            // Stamina affects speed - low stamina = slower
            // Guts reserve provides emergency stamina when depleted
            let effectiveStamina = this.stamina;
            if (this.stamina <= 0 && this.guts_reserve > 0) {
                // Use guts as emergency reserve (drains faster)
                effectiveStamina = this.guts_reserve * 50;  // Guts reserve = 50% as effective as normal stamina
            }

            // HITTING THE WALL - low stamina REALLY hurts now!
            let staminaFactor;
            if (effectiveStamina < 20) {
                // Below 20% stamina - SEVERE penalties
                staminaFactor = 0.45 + (effectiveStamina / 100) * 1.0;  // 45-65% speed

                // Front-runners hit the wall HARDER (they bet big, they crash big)
                if (this.running_style === RUNNING_STYLES.NIGE) {
                    staminaFactor *= 0.75;  // BRUTAL penalty for burned-out front runners
                } else if (this.running_style === RUNNING_STYLES.SENKOU) {
                    staminaFactor *= 0.85;  // Heavy penalty
                }
            } else if (effectiveStamina < 40) {
                // 20-40% stamina - moderate penalties
                staminaFactor = 0.65 + (effectiveStamina / 100) * 0.7;  // 65-85% speed
            } else {
                // Above 40% stamina - normal scaling
                staminaFactor = 0.75 + (effectiveStamina / 100) * 0.25;  // 75-100% speed
            }

            // Last spurt - all horses get a speed boost near the finish line
            // Strength varies by horse's last_spurt_skill
            let lastSpurtBoost = 1.0;
            if (raceProgress > 0.90) {  // Last 10% of race
                // Scales from 1.0 at 90% to 1.25 at 100%
                const spurtProgress = (raceProgress - 0.90) / 0.10;  // 0 to 1
                const baseBoost = 0.25 * this.last_spurt_skill;  // Varies by skill (0.15-0.375)
                lastSpurtBoost = 1.0 + (spurtProgress * baseBoost);
            }

            // Handle acceleration/deceleration
            // Apply gate skill and start dash power at race start
            let gateDelayFactor = 1.0;
            if (this.race_time < 2.0) {
                const gateDelay = (2.0 - this.race_time) * (2.0 - this.gate_skill);
                gateDelayFactor = Math.max(0.3, 1.0 - (gateDelay * 0.3));
                gateDelayFactor *= this.start_dash_power;  // Start dash power affects early acceleration
            }

            // Track if just exited a corner for corner exit acceleration boost
            const currentInCorner = this.wasInCorner || false;
            const justExitedCorner = this.previousInCorner && !currentInCorner;
            const cornerExitTimer = this.cornerExitTimer || 0;

            if (this.velocity < this.base_velocity) {
                let accelMultiplier = this.acceleration * this.acceleration_skill * gateDelayFactor;

                // Corner exit acceleration boost (lasts 0.5 seconds after exiting)
                if (justExitedCorner || cornerExitTimer > 0) {
                    accelMultiplier *= (1.0 + this.corner_exit_acceleration * 0.5);
                }

                this.velocity += accelMultiplier * dt;
                this.velocity = Math.min(this.velocity, this.base_velocity);
            } else {
                let targetVelocity;

                // Pressure resistance reduces speed loss from danger
                const effectiveDangerLevel = this.danger_level / this.pressure_resistance;

                if (effectiveDangerLevel > 0.5) {
                    targetVelocity = this.base_velocity * (1.0 - effectiveDangerLevel * 0.4);
                } else if (this.in_sprint_zone && effectiveDangerLevel < 0.3) {
                    // Mid-race kick provides burst speed in sprint zones
                    const kickBonus = this.mid_race_kick * 0.15;  // Up to 15% bonus
                    targetVelocity = this.max_velocity * styleModifier * this.top_speed_skill * (1.0 + kickBonus);
                } else if (effectiveDangerLevel > 0.2) {
                    targetVelocity = this.base_velocity * (1.0 - effectiveDangerLevel * 0.2);
                } else {
                    targetVelocity = this.base_velocity;
                }

                // Repositioning boost - slight speed increase when actively repositioning
                if (this.repositioning_active) {
                    targetVelocity *= 1.08;  // 8% speed boost
                }

                // Apply stamina factor and last spurt boost
                targetVelocity *= staminaFactor * lastSpurtBoost;

                // Focus level reduces random variations (makes performance more consistent)
                const consistencyFactor = 0.95 + (this.focus_level * 0.05);  // 95-100% consistency
                targetVelocity *= consistencyFactor;

                if (this.velocity < targetVelocity) {
                    let accelRate = this.acceleration * this.acceleration_skill * 0.4;

                    // Corner exit acceleration boost
                    if (justExitedCorner || cornerExitTimer > 0) {
                        accelRate *= (1.0 + this.corner_exit_acceleration * 0.5);
                    }

                    this.velocity += accelRate * dt;
                    this.velocity = Math.min(this.velocity, targetVelocity);
                } else if (this.velocity > targetVelocity) {
                    const decelRate = this.deceleration * (1.0 + effectiveDangerLevel * 2.0);
                    this.velocity -= decelRate * dt;
                    this.velocity = Math.max(this.velocity, targetVelocity);
                }
            }

            // Update corner exit timer
            if (justExitedCorner) {
                this.cornerExitTimer = 0.5;  // 0.5 second boost
            } else if (cornerExitTimer > 0) {
                this.cornerExitTimer = Math.max(0, cornerExitTimer - dt);
            }

            this.previousInCorner = currentInCorner;
        }

        // Movement
        if (this.is_running) {
            const moveVec = this.getVecRotated();
            const velocityVec = moveVec.multiply(this.velocity * dt);
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

            // Update position
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

                // Spawn particles from behind the horse
                const bodyVec = this.getVecRotated();
                const perpendicular = new Vector2(-bodyVec.y, bodyVec.x); // Side vector
                const behindPos = this.position.subtract(bodyVec.multiply(this.width / 2)); // Behind the horse

                const halfWidth = this.width / 2;

                // Two corner positions (left and right hooves)
                const cornerLeft = behindPos.add(perpendicular.multiply(-halfWidth * 0.7));
                const cornerRight = behindPos.add(perpendicular.multiply(halfWidth * 0.7));

                // More particles with pooling - spawn from both corners
                const particleCount = Math.floor(3 + accelFactor * 5); // 3-8 particles total

                for (let i = 0; i < particleCount; i++) {
                    // Randomly choose which corner to spawn from
                    const spawnCorner = Math.random() > 0.5 ? cornerLeft : cornerRight;

                    // Random spread for dirt spray effect
                    const spreadAngle = (Math.random() - 0.5) * 90; // ±45 degrees
                    const spreadDistance = Math.random() * 15; // 0-15 pixels from corner
                    const spreadDir = bodyVec.rotate(spreadAngle).normalize();
                    const spreadOffset = spreadDir.multiply(spreadDistance);

                    // Particle velocity - spray backwards and to sides (from back legs)
                    const baseVelocity = 20 + accelFactor * 40; // Faster when accelerating
                    const velocityAngle = 180 + (Math.random() - 0.5) * 120; // Spray 180° ± 60°
                    const velocityDir = bodyVec.rotate(velocityAngle);
                    const velocityMagnitude = baseVelocity * (0.5 + Math.random() * 0.5); // Vary speed

                    // Bigger particles when accelerating (increased size)
                    const baseSize = 4 + accelFactor * 5;

                    // Acquire particle from pool
                    const particle = globalParticlePool.acquire();
                    particle.x = spawnCorner.x + spreadOffset.x;
                    particle.y = spawnCorner.y + spreadOffset.y;
                    particle.vx = velocityDir.x * velocityMagnitude;
                    particle.vy = velocityDir.y * velocityMagnitude;
                    particle.life = 0.4 + Math.random() * 0.4;
                    particle.maxLife = 0.8;
                    particle.size = baseSize + Math.random() * 3;
                    // Vary dirt and grass colors
                    const colorVariation = Math.random();
                    if (colorVariation < 0.15) {
                        particle.color = 'rgb(139, 90, 43)';   // Brown dirt
                    } else if (colorVariation < 0.3) {
                        particle.color = 'rgb(120, 75, 35)';   // Dark brown dirt
                    } else if (colorVariation < 0.45) {
                        particle.color = 'rgb(160, 110, 60)';  // Light brown dirt
                    } else if (colorVariation < 0.55) {
                        particle.color = 'rgb(100, 65, 30)';   // Very dark brown dirt
                    } else if (colorVariation < 0.7) {
                        particle.color = 'rgb(85, 140, 70)';   // Grass green
                    } else if (colorVariation < 0.85) {
                        particle.color = 'rgb(100, 160, 80)';  // Light grass green
                    } else {
                        particle.color = 'rgb(65, 110, 55)';   // Dark grass green
                    }
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
