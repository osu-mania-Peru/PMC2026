// Horse Racing Simulator - Horse Class
// Refactored for clarity and easy feature toggling

class Horse {
    // ========================================
    // INITIALIZATION
    // ========================================

    constructor(initPosition, colorIndex = 0, horseNumber = 1, horseImage = null) {
        this.initBasicProperties(horseNumber, colorIndex, horseImage);
        this.initPosition(initPosition);
        this.initRunningStyle();
        this.initBaseStats();
        this.initAdvancedStats();
        this.initSteeringState();
        this.initAwarenessState();
        this.initVisionState();
        this.initWitState();
        this.initTrackingState();
        this.initStaminaState();
        this.initRepositioningState();
        this.initParticleState();

        this.applyRunningStyleModifiers();
    }

    initBasicProperties(horseNumber, colorIndex, horseImage) {
        this.number = horseNumber;
        this.power = 0.6 + Math.random() * 0.4;
        this.color = HORSE_COLORS[colorIndex % HORSE_COLORS.length];
        this.horseImage = horseImage;
        this.tintedImage = null;
        this.width = 30;
        this.height = 30;
    }

    initPosition(initPosition) {
        this.position = new Vector2(initPosition.x, initPosition.y);
        this.previous_position = new Vector2(initPosition.x, initPosition.y);
    }

    initRunningStyle() {
        const styles = Object.values(RUNNING_STYLES);
        this.running_style = styles[Math.floor(Math.random() * styles.length)];
    }

    initBaseStats() {
        const speedVariance = 0.9 + Math.random() * 0.2;
        this.base_velocity = 180 * speedVariance;
        this.velocity = 0;
        this.max_velocity = 260 * speedVariance;
        this.acceleration = (80 + Math.random() * 20) * speedVariance;
        this.deceleration = 30;
    }

    initAdvancedStats() {
        // Core stats (0.8 to 1.2 range)
        this.corner_skill = 0.8 + Math.random() * 0.4;
        this.acceleration_skill = 0.8 + Math.random() * 0.4;
        this.top_speed_skill = 0.8 + Math.random() * 0.4;
        this.stamina_efficiency = 0.8 + Math.random() * 0.4;
        this.gate_skill = 0.8 + Math.random() * 0.4;
        this.last_spurt_skill = 0.7 + Math.random() * 0.6;

        // Energy Management
        this.guts_reserve = 0.7 + Math.random() * 0.6;
        this.stamina_recovery_rate = 0.8 + Math.random() * 0.4;

        // Positioning & Navigation
        this.lane_change_skill = 0.8 + Math.random() * 0.4;
        this.gap_sense = 0.8 + Math.random() * 0.4;
        this.positioning_iq = 0.8 + Math.random() * 0.4;

        // Specialized Acceleration
        this.start_dash_power = 0.8 + Math.random() * 0.4;
        this.corner_exit_acceleration = 0.8 + Math.random() * 0.4;
        this.mid_race_kick = 0.7 + Math.random() * 0.6;

        // Mental & Consistency
        this.focus_level = 0.8 + Math.random() * 0.4;
        this.pressure_resistance = 0.7 + Math.random() * 0.6;

        // Adaptability
        this.pack_racing_skill = 0.8 + Math.random() * 0.4;

        // Other
        this.power_level = 70 + Math.floor(Math.random() * 31);
        this.aggression = 0.4 + Math.random() * 0.5;
    }

    initSteeringState() {
        this.steer_angle = 0;
        this.previous_steer_angle = 0;
        this.vector = new Vector2(-1, 0);
        this.target_angle = 0;
        this.steering_smoothness = 0.1;
        this.is_running = false;
        this.race_time = 0.0;
    }

    initAwarenessState() {
        this.proximity_radius = 45;
        this.nearby_horses = [];
        this.awareness_360 = true;
        this.in_fence_collision = false;
        this.in_sprint_zone = false;
        this.danger_level = 0.0;
    }

    initVisionState() {
        this.vision_rays = [];
        this.vision_length = 200;
        this.vision_angles = [-30, -15, 0, 15, 30];
        this.distance_to_inner_fence = null;
        this.preferred_inner_distance = 40;
        this.enable_inner_fence_hugging = false;
    }

    initWitState() {
        this.wit_level = 100;
        this.wit_radius = 40;
        this.horses_ahead = [];
        this.wit_activated = false;
        this.wit_activation_timer = 0.0;
        this.wit_action = "";
        this.centrifugal_force = 0.0;
    }

    initTrackingState() {
        this.current_checkpoint = 0;
        this.lap = 0;
        this.total_progress = 0;
        this.cumulative_distance_traveled = 0;
    }

    initStaminaState() {
        this.stamina = 100;
        this.max_stamina = 100;
        this.stamina_drain_rate = 1.0;
        this.late_surge_activated = false;
    }

    initRepositioningState() {
        this.repositioning_active = false;
        this.repositioning_timer = 0.0;
        this.repositioning_cooldown = 3.0 + Math.random() * 5.0;
    }

    initParticleState() {
        this.particleSpawnTimer = 0;
        this.previous_velocity = 0;
    }

    // ========================================
    // RUNNING STYLE MODIFIERS
    // ========================================

    applyRunningStyleModifiers() {
        switch (this.running_style) {
            case RUNNING_STYLES.NIGE:
                this.applyNigeModifiers();
                break;
            case RUNNING_STYLES.SENKOU:
                this.applySenkouModifiers();
                break;
            case RUNNING_STYLES.SASHI:
                this.applySashiModifiers();
                break;
            case RUNNING_STYLES.OIKOMI:
                this.applyOikomiModifiers();
                break;
        }
        this.clampAllStats();
    }

    applyNigeModifiers() {
        // Runner - fast early, drains stamina
        this.base_velocity *= 1.03;
        this.max_velocity *= 1.03;
        this.acceleration *= 1.1;
        this.stamina_drain_rate = 1.4;
        this.aggression = 0.7 + Math.random() * 0.3;
        this.acceleration_skill *= 1.1;
        this.gate_skill *= 1.15;
        this.last_spurt_skill *= 0.85;
        this.guts_reserve *= 0.8;
        this.stamina_recovery_rate *= 0.85;
        this.lane_change_skill *= 1.15;
        this.pack_racing_skill *= 0.9;
        this.start_dash_power *= 1.25;
        this.corner_exit_acceleration *= 1.1;
        this.mid_race_kick *= 0.9;
        this.focus_level *= 1.1;
        this.pressure_resistance *= 0.85;
    }

    applySenkouModifiers() {
        // Leader - balanced front runner
        this.base_velocity *= 1.015;
        this.max_velocity *= 1.015;
        this.acceleration *= 1.06;
        this.stamina_drain_rate = 1.15;
        this.aggression = 0.5 + Math.random() * 0.3;
        this.stamina_efficiency *= 0.95;
        this.last_spurt_skill *= 0.95;
        this.guts_reserve *= 1.0;
        this.stamina_recovery_rate *= 1.05;
        this.positioning_iq *= 1.2;
        this.gap_sense *= 1.1;
        this.start_dash_power *= 1.1;
        this.corner_exit_acceleration *= 1.05;
        this.focus_level *= 1.15;
        this.pressure_resistance *= 1.05;
    }

    applySashiModifiers() {
        // Stalker - saves energy, good late game
        this.base_velocity *= 1.0;
        this.max_velocity *= 1.05;
        this.acceleration *= 1.025;
        this.stamina_drain_rate = 0.85;
        this.aggression = 0.4 + Math.random() * 0.3;
        this.corner_skill *= 1.15;
        this.stamina_efficiency *= 0.9;
        this.last_spurt_skill *= 1.1;
        this.guts_reserve *= 1.15;
        this.stamina_recovery_rate *= 1.15;
        this.pack_racing_skill *= 1.2;
        this.gap_sense *= 1.25;
        this.positioning_iq *= 1.15;
        this.corner_exit_acceleration *= 1.2;
        this.mid_race_kick *= 1.15;
        this.start_dash_power *= 0.95;
        this.pressure_resistance *= 1.15;
    }

    applyOikomiModifiers() {
        // Closer - slow start, explosive finish
        this.base_velocity *= 0.985;
        this.max_velocity *= 1.08;
        this.acceleration *= 0.975;
        this.stamina_drain_rate = 0.7;
        this.aggression = 0.3 + Math.random() * 0.3;
        this.top_speed_skill *= 1.2;
        this.stamina_efficiency *= 0.85;
        this.gate_skill *= 0.9;
        this.last_spurt_skill *= 1.25;
        this.guts_reserve *= 1.3;
        this.stamina_recovery_rate *= 1.25;
        this.pack_racing_skill *= 1.3;
        this.gap_sense *= 1.15;
        this.lane_change_skill *= 1.2;
        this.start_dash_power *= 0.75;
        this.mid_race_kick *= 1.35;
        this.corner_exit_acceleration *= 1.15;
        this.pressure_resistance *= 1.3;
        this.focus_level *= 1.1;
    }

    clampAllStats() {
        this.corner_skill = Math.min(1.5, this.corner_skill);
        this.acceleration_skill = Math.min(1.5, this.acceleration_skill);
        this.top_speed_skill = Math.min(1.5, this.top_speed_skill);
        this.stamina_efficiency = Math.max(0.7, Math.min(1.2, this.stamina_efficiency));
        this.gate_skill = Math.min(1.5, this.gate_skill);
        this.last_spurt_skill = Math.max(0.6, Math.min(1.6, this.last_spurt_skill));
        this.guts_reserve = Math.max(0.5, Math.min(1.7, this.guts_reserve));
        this.stamina_recovery_rate = Math.max(0.7, Math.min(1.5, this.stamina_recovery_rate));
        this.lane_change_skill = Math.max(0.7, Math.min(1.5, this.lane_change_skill));
        this.gap_sense = Math.max(0.7, Math.min(1.6, this.gap_sense));
        this.positioning_iq = Math.max(0.7, Math.min(1.6, this.positioning_iq));
        this.start_dash_power = Math.max(0.6, Math.min(1.6, this.start_dash_power));
        this.corner_exit_acceleration = Math.max(0.7, Math.min(1.6, this.corner_exit_acceleration));
        this.mid_race_kick = Math.max(0.6, Math.min(1.8, this.mid_race_kick));
        this.focus_level = Math.max(0.7, Math.min(1.5, this.focus_level));
        this.pressure_resistance = Math.max(0.6, Math.min(1.7, this.pressure_resistance));
        this.pack_racing_skill = Math.max(0.7, Math.min(1.6, this.pack_racing_skill));
    }

    // ========================================
    // RENDERING
    // ========================================

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

    // ========================================
    // UTILITY METHODS
    // ========================================

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

    // ========================================
    // AWARENESS SYSTEM
    // ========================================

    updateAwareness(allHorses) {
        this.nearby_horses = [];
        const myPos = this.position;

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

    // ========================================
    // COLLISION DETECTION
    // ========================================

    isPointInFence(point, cornerData, trackBounds, sprintFences = null) {
        if (point.x < trackBounds.x || point.x > trackBounds.x + trackBounds.width ||
            point.y < trackBounds.y || point.y > trackBounds.y + trackBounds.height) {
            return true;
        }

        if (sprintFences) {
            for (const fence of sprintFences) {
                if (point.x >= fence.x && point.x <= fence.x + fence.width &&
                    point.y >= fence.y && point.y <= fence.y + fence.height) {
                    return true;
                }
            }
        }

        for (const corner of cornerData) {
            const [cornerRect, outerCenter, outerRadius, innerCenter, innerRadius] = corner;

            if (point.x >= cornerRect.x && point.x <= cornerRect.x + cornerRect.width &&
                point.y >= cornerRect.y && point.y <= cornerRect.y + cornerRect.height) {
                const distanceToOuter = point.distance(outerCenter);
                if (distanceToOuter > outerRadius) {
                    return true;
                }
            }

            const distanceToInner = point.distance(innerCenter);
            if (distanceToInner < innerRadius) {
                return true;
            }
        }

        return false;
    }

    // ========================================
    // VISION SYSTEM
    // ========================================

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

    // ========================================
    // TRACK ZONE DETECTION
    // ========================================

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

            if (horsePos.x >= cornerRect.x && horsePos.x <= cornerRect.x + cornerRect.width &&
                horsePos.y >= cornerRect.y && horsePos.y <= cornerRect.y + cornerRect.height) {
                return { inCorner: true, center: innerCenter, radius: innerRadius };
            }
        }

        return { inCorner: false, center: null, radius: null };
    }

    // ========================================
    // AI - THINKING
    // ========================================

    think(cornerData, trackBounds, sprintFences = null) {
        if (!this.is_running) return;
        if (this.race_time < 1.0) return;

        this.danger_level = 0.0;
        this.target_angle = this.steer_angle;

        const gateCooldownFactor = this.calculateGateCooldown();
        const repositioningBoost = this.repositioning_active ? 1.5 : 1.0;

        this.handleCornerSteering(cornerData);
        this.handleRepositioning(cornerData, trackBounds, sprintFences);
        this.handleWitSteering(gateCooldownFactor, repositioningBoost);
        this.handleCollisionAvoidance(gateCooldownFactor, repositioningBoost);
        this.handleVisionAvoidance(cornerData, trackBounds, sprintFences, gateCooldownFactor);
        this.handleInnerFenceHugging();
        this.applySmoothSteering();
    }

    calculateGateCooldown() {
        if (this.race_time < 4.0) {
            return 0.1 + (this.race_time / 4.0) * 0.9;
        }
        return 1.0;
    }

    handleCornerSteering(cornerData) {
        if (!cornerData) return;

        this.distance_to_inner_fence = this.calculateDistanceToInnerFence(cornerData);
        const cornerInfo = this.checkIfInCorner(cornerData);
        this.wasInCorner = cornerInfo.inCorner;

        if (cornerInfo.inCorner) {
            const toCenter = cornerInfo.center.subtract(this.position);
            const currentDirection = this.getVecRotated();
            const radialDirection = toCenter.normalize();
            const tangentDirection = new Vector2(-radialDirection.y, radialDirection.x);

            const dot1 = currentDirection.dot(tangentDirection);
            const dot2 = currentDirection.dot(new Vector2(radialDirection.y, -radialDirection.x));
            const correctTangent = dot1 > dot2 ? tangentDirection : new Vector2(radialDirection.y, -radialDirection.x);

            const desiredAngle = Math.atan2(correctTangent.y, correctTangent.x) * 180 / Math.PI;
            const currentAngle = Math.atan2(currentDirection.y, currentDirection.x) * 180 / Math.PI;
            let angleDiff = desiredAngle - currentAngle;

            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;

            const speedFactor = this.velocity / this.base_velocity;
            const cornerSkillBonus = this.corner_skill * 1.5;
            const forceMagnitude = speedFactor * 3 * cornerSkillBonus;
            this.centrifugal_force = Math.abs(angleDiff) * 0.1;

            this.target_angle += angleDiff * forceMagnitude * 0.05;
        } else {
            this.centrifugal_force = 0.0;
        }
    }

    handleRepositioning(cornerData, trackBounds, sprintFences) {
        if (!this.repositioning_active) {
            this.repositioning_direction = null;
            this.repositioning_base_angle = undefined;
            this.repositioning_max_duration = null;
            return;
        }

        if (this.repositioning_base_angle === undefined) {
            this.initRepositioningWave(cornerData, trackBounds, sprintFences);
        }

        const progress = 1.0 - (this.repositioning_timer / this.repositioning_max_duration);
        const smoothProgress = progress * progress * (3 - 2 * progress);
        const superSmooth = smoothProgress * smoothProgress * (3 - 2 * smoothProgress);
        let waveIntensity = Math.sin(superSmooth * Math.PI);

        if (progress > 0.7) {
            const dampingProgress = (progress - 0.7) / 0.3;
            const dampingFactor = 1.0 - (dampingProgress * dampingProgress);
            waveIntensity *= dampingFactor;
        }

        let visionSafety = 1.0;
        if (this.vision_rays.length > 0) {
            const centerRays = this.vision_rays.filter(r => Math.abs(r.angle) <= 15);
            const centerDistance = centerRays.length > 0
                ? Math.min(...centerRays.map(r => r.distance))
                : this.vision_length;

            if (centerDistance < 60) {
                visionSafety = centerDistance / 60;
            }
        }

        const maxWaveAngle = 6 * this.positioning_iq * visionSafety;
        const angleOffset = maxWaveAngle * waveIntensity * this.repositioning_direction;
        this.target_angle = this.repositioning_base_angle + angleOffset;
    }

    initRepositioningWave(cornerData, trackBounds, sprintFences) {
        this.repositioning_base_angle = this.steer_angle;
        this.repositioning_max_duration = this.repositioning_timer;

        const candidates = [];
        for (let i = 0; i < 5; i++) {
            candidates.push((Math.random() - 0.5) * 30);
        }

        const baseRaycastDistance = 300;
        const raycastDistance = Math.min(baseRaycastDistance + (this.positioning_iq * 800), 1500);
        const validCandidates = [];

        for (const angleOffset of candidates) {
            const testAngle = this.steer_angle + angleOffset;
            const testDir = this.vector.rotate(testAngle).normalize();
            let isValid = true;

            for (let distance = 10; distance < raycastDistance; distance += 10) {
                const testPoint = this.position.add(testDir.multiply(distance));
                if (cornerData && this.isPointInFence(testPoint, cornerData, trackBounds, sprintFences)) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                validCandidates.push(angleOffset);
            }
        }

        if (validCandidates.length > 0) {
            const chosenAngle = validCandidates[Math.floor(Math.random() * validCandidates.length)];
            this.repositioning_direction = chosenAngle / 15;
        } else {
            this.repositioning_direction = 0;
        }
    }

    handleWitSteering(gateCooldownFactor, repositioningBoost) {
        if (this.horses_ahead.length === 0) {
            this.wit_activated = false;
            this.wit_action = "";
            return;
        }

        this.wit_activated = true;
        this.wit_activation_timer = 1.0;

        const closestWitHorse = this.horses_ahead.reduce((min, h) => h.distance < min.distance ? h : min);
        const witDanger = Math.max(0, 1.0 - (closestWitHorse.distance / 100));
        this.danger_level = Math.max(this.danger_level, witDanger * 0.3 * (1.0 - this.power * 0.5));

        const leftCount = this.horses_ahead.filter(h => h.side === "left").length;
        const rightCount = this.horses_ahead.filter(h => h.side === "right").length;
        const gapThreshold = Math.max(0, 2 - this.gap_sense);

        if (leftCount > rightCount + gapThreshold) {
            const steerAmount = 5 * this.positioning_iq * repositioningBoost;
            this.target_angle -= steerAmount;
            this.wit_action = `Gap R (L:${leftCount} R:${rightCount})`;
        } else if (rightCount > leftCount + gapThreshold) {
            const steerAmount = 5 * this.positioning_iq * repositioningBoost;
            this.target_angle += steerAmount;
            this.wit_action = `Gap L (L:${leftCount} R:${rightCount})`;
        }

        const closest = this.horses_ahead.reduce((min, h) => h.distance < min.distance ? h : min);
        const passDistance = 80 * this.gap_sense * repositioningBoost;

        if (closest.distance < passDistance) {
            const steerAmount = 3 * this.positioning_iq * repositioningBoost;
            if (closest.side === "left") {
                this.target_angle -= steerAmount;
                this.wit_action = `Pass R (#${closest.horse.number})`;
            } else {
                this.target_angle += steerAmount;
                this.wit_action = `Pass L (#${closest.horse.number})`;
            }
        }
    }

    handleCollisionAvoidance(gateCooldownFactor, repositioningBoost) {
        if (this.nearby_horses.length === 0) return;

        const myDirection = this.getVecRotated();
        const packDangerReduction = 1.0 / this.pack_racing_skill;

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
                const baseDanger = proximityDanger * 0.7 * (1.0 - this.power * 0.4);
                this.danger_level = Math.max(this.danger_level, baseDanger * packDangerReduction);
            }

            if (dot > 0.5) {
                let steerAmount = this.calculateSteerAmount(distance, collisionThreshold, speedDifference, gateCooldownFactor);
                if (steerAmount > 0) {
                    steerAmount *= this.lane_change_skill * repositioningBoost;
                    this.target_angle += cross > 0 ? -steerAmount : steerAmount;
                }
            }
        }
    }

    calculateSteerAmount(distance, collisionThreshold, speedDifference, gateCooldownFactor) {
        if (distance < collisionThreshold * 0.5) {
            return (speedDifference > 5 ? 8 : 6) * (1.0 - this.power * 0.3) * gateCooldownFactor;
        } else if (distance < collisionThreshold * 0.75) {
            return (speedDifference > 5 ? 5 : 3) * (1.0 - this.power * 0.4) * gateCooldownFactor;
        } else if (distance < collisionThreshold) {
            return 2 * (1.0 - this.power * 0.6) * gateCooldownFactor;
        }
        return 0;
    }

    handleVisionAvoidance(cornerData, trackBounds, sprintFences, gateCooldownFactor) {
        if (this.vision_rays.length === 0) return;

        const centerRays = this.vision_rays.filter(r => Math.abs(r.angle) <= 15);
        const centerDistance = centerRays.length > 0
            ? Math.min(...centerRays.map(r => r.distance))
            : this.vision_length;

        const dangerThreshold = 100;
        const reactionThreshold = 80;

        if (centerDistance < dangerThreshold) {
            const obstacleDanger = Math.max(0, 1.0 - (centerDistance / dangerThreshold));
            this.danger_level = Math.max(this.danger_level, obstacleDanger * 0.8 * (1.0 - this.power * 0.3));
        }

        if (centerDistance < reactionThreshold) {
            const rightDistance = this.simulateSteeringOption(-20, cornerData, trackBounds, sprintFences);
            const leftDistance = this.simulateSteeringOption(20, cornerData, trackBounds, sprintFences);
            const urgency = Math.max(0, 1.0 - (centerDistance / reactionThreshold));

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

    handleInnerFenceHugging() {
        if (!this.enable_inner_fence_hugging || this.distance_to_inner_fence === null) return;

        const distanceError = this.distance_to_inner_fence - this.preferred_inner_distance;
        if (Math.abs(distanceError) > 15) {
            this.target_angle += distanceError > 0 ? 2 : -2;
        }
    }

    applySmoothSteering() {
        const angleDiff = this.target_angle - this.steer_angle;
        let smoothness = this.steering_smoothness;

        if (this.repositioning_active && this.repositioning_max_duration) {
            const progress = 1.0 - (this.repositioning_timer / this.repositioning_max_duration);
            smoothness = progress > 0.7 ? 0.03 : 0.05;
        }

        this.steer_angle += angleDiff * smoothness;
    }

    // ========================================
    // CHECKPOINT TRACKING
    // ========================================

    checkCheckpoint(checkpoints) {
        const nextCheckpoint = (this.current_checkpoint + 1) % checkpoints.length;
        const checkpoint = checkpoints[nextCheckpoint];

        const dist = this.position.distance(checkpoint);
        if (dist < checkpoint.radius) {
            this.current_checkpoint = nextCheckpoint;
            this.total_progress++;

            if (nextCheckpoint === 0) {
                this.lap++;
            }
        }
    }

    getContinuousProgress(checkpoints) {
        if (!checkpoints || checkpoints.length === 0) return 0;

        const currentCP = checkpoints[this.current_checkpoint];
        const nextCPIndex = (this.current_checkpoint + 1) % checkpoints.length;
        const nextCP = checkpoints[nextCPIndex];

        const currentPos = new Vector2(currentCP.x, currentCP.y);
        const nextPos = new Vector2(nextCP.x, nextCP.y);
        const horsePos = this.position;

        const segmentVec = nextPos.subtract(currentPos);
        const segmentLength = segmentVec.length();

        if (segmentLength === 0) return this.total_progress;

        const toHorse = horsePos.subtract(currentPos);
        const segmentDir = segmentVec.normalize();
        const projectionDist = toHorse.dot(segmentDir);
        const clampedDist = Math.max(0, Math.min(segmentLength, projectionDist));
        const progressBetweenCP = clampedDist / segmentLength;

        return this.total_progress + progressBetweenCP;
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

        const direction = this.getVecRotated();
        const tangent = new Vector2(-toHorse.y, toHorse.x).normalize();
        const forwardness = direction.dot(tangent);

        const totalAngle = raceAngle + (this.lap * Math.PI * 2);
        return totalAngle + (forwardness * 0.05);
    }

    // ========================================
    // MAIN UPDATE LOOP
    // ========================================

    update(dt, cornerData, trackBounds, sprintFences, sprintZones, checkpoints = null) {
        if (this.is_running) {
            this.race_time += dt;
        }

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

        this.updateRepositioning(dt);
        this.updateStamina(dt);
        this.updateVelocity(dt);
        this.updateMovement(dt);
        this.updateParticles(dt);
    }

    updateRepositioning(dt) {
        if (!this.is_running) return;

        if (this.repositioning_active) {
            this.repositioning_timer -= dt;
            if (this.repositioning_timer <= 0) {
                this.repositioning_active = false;
                this.repositioning_cooldown = 3.0 + Math.random() * 5.0;
            }
        } else {
            this.repositioning_cooldown -= dt;
            if (this.repositioning_cooldown <= 0) {
                const triggerChance = 0.5 + (this.positioning_iq * 0.1);
                if (Math.random() < triggerChance) {
                    this.repositioning_active = true;
                    this.repositioning_timer = 1.5 + Math.random() * 1.5;
                } else {
                    this.repositioning_cooldown = 2.0 + Math.random() * 3.0;
                }
            }
        }
    }

    updateStamina(dt) {
        if (!this.is_running) return;

        const velocityFactor = this.velocity / this.base_velocity;
        const rngSpike = 0.85 + Math.random() * 0.3;

        let earlyPacePenalty = 1.0;
        if (this.race_time < 30) {
            if (this.running_style === RUNNING_STYLES.NIGE) {
                earlyPacePenalty = 1.3 + Math.random() * 0.4;
            } else if (this.running_style === RUNNING_STYLES.SENKOU) {
                earlyPacePenalty = 1.15 + Math.random() * 0.25;
            }
        }

        const staminaDrain = this.stamina_drain_rate * velocityFactor * this.stamina_efficiency * dt * 3 * rngSpike * earlyPacePenalty;
        this.stamina = Math.max(0, this.stamina - staminaDrain);

        if (this.danger_level < 0.2 && !this.in_sprint_zone && this.stamina < this.max_stamina) {
            const recoveryAmount = this.stamina_recovery_rate * dt * 5;
            this.stamina = Math.min(this.max_stamina, this.stamina + recoveryAmount);
        }

        this.checkLateSurge();
    }

    checkLateSurge() {
        const raceProgress = this.total_progress / 8.0;

        let surgeThreshold = 0.75;
        if (this.running_style === RUNNING_STYLES.OIKOMI) {
            surgeThreshold = 0.65;
        } else if (this.running_style === RUNNING_STYLES.SASHI) {
            surgeThreshold = 0.70;
        }

        const isLastStretch = raceProgress > surgeThreshold;

        if ((this.running_style === RUNNING_STYLES.OIKOMI || this.running_style === RUNNING_STYLES.SASHI) &&
            isLastStretch && this.stamina > 30 && !this.late_surge_activated) {
            this.late_surge_activated = true;
        }
    }

    updateVelocity(dt) {
        if (!this.is_running) return;

        const styleModifier = this.calculateStyleModifier();
        const staminaFactor = this.calculateStaminaFactor();
        const lastSpurtBoost = this.calculateLastSpurtBoost();
        const gateDelayFactor = this.calculateGateDelay();

        const currentInCorner = this.wasInCorner || false;
        const justExitedCorner = this.previousInCorner && !currentInCorner;
        const cornerExitTimer = this.cornerExitTimer || 0;

        if (this.velocity < this.base_velocity) {
            let accelMultiplier = this.acceleration * this.acceleration_skill * gateDelayFactor;
            if (justExitedCorner || cornerExitTimer > 0) {
                accelMultiplier *= (1.0 + this.corner_exit_acceleration * 0.5);
            }
            this.velocity += accelMultiplier * dt;
            this.velocity = Math.min(this.velocity, this.base_velocity);
        } else {
            const targetVelocity = this.calculateTargetVelocity(styleModifier, staminaFactor, lastSpurtBoost, justExitedCorner, cornerExitTimer, dt);

            if (this.velocity < targetVelocity) {
                let accelRate = this.acceleration * this.acceleration_skill * 0.4;
                if (justExitedCorner || cornerExitTimer > 0) {
                    accelRate *= (1.0 + this.corner_exit_acceleration * 0.5);
                }
                this.velocity += accelRate * dt;
                this.velocity = Math.min(this.velocity, targetVelocity);
            } else if (this.velocity > targetVelocity) {
                const effectiveDangerLevel = this.danger_level / this.pressure_resistance;
                const decelRate = this.deceleration * (1.0 + effectiveDangerLevel * 2.0);
                this.velocity -= decelRate * dt;
                this.velocity = Math.max(this.velocity, targetVelocity);
            }
        }

        if (justExitedCorner) {
            this.cornerExitTimer = 0.5;
        } else if (cornerExitTimer > 0) {
            this.cornerExitTimer = Math.max(0, cornerExitTimer - dt);
        }

        this.previousInCorner = currentInCorner;
    }

    calculateStyleModifier() {
        if (!this.late_surge_activated) return 1.0;

        if (this.running_style === RUNNING_STYLES.OIKOMI) {
            return 1.4 + (this.stamina / 100) * 0.3;
        } else if (this.running_style === RUNNING_STYLES.SASHI) {
            return 1.35 + (this.stamina / 100) * 0.25;
        }
        return 1.0;
    }

    calculateStaminaFactor() {
        let effectiveStamina = this.stamina;
        if (this.stamina <= 0 && this.guts_reserve > 0) {
            effectiveStamina = this.guts_reserve * 50;
        }

        if (effectiveStamina < 20) {
            let factor = 0.45 + (effectiveStamina / 100) * 1.0;
            if (this.running_style === RUNNING_STYLES.NIGE) {
                factor *= 0.75;
            } else if (this.running_style === RUNNING_STYLES.SENKOU) {
                factor *= 0.85;
            }
            return factor;
        } else if (effectiveStamina < 40) {
            return 0.65 + (effectiveStamina / 100) * 0.7;
        }
        return 0.75 + (effectiveStamina / 100) * 0.25;
    }

    calculateLastSpurtBoost() {
        const raceProgress = this.total_progress / 8.0;
        if (raceProgress > 0.90) {
            const spurtProgress = (raceProgress - 0.90) / 0.10;
            const baseBoost = 0.25 * this.last_spurt_skill;
            return 1.0 + (spurtProgress * baseBoost);
        }
        return 1.0;
    }

    calculateGateDelay() {
        if (this.race_time < 2.0) {
            const gateDelay = (2.0 - this.race_time) * (2.0 - this.gate_skill);
            let factor = Math.max(0.3, 1.0 - (gateDelay * 0.3));
            return factor * this.start_dash_power;
        }
        return 1.0;
    }

    calculateTargetVelocity(styleModifier, staminaFactor, lastSpurtBoost, justExitedCorner, cornerExitTimer, dt) {
        const effectiveDangerLevel = this.danger_level / this.pressure_resistance;
        let targetVelocity;

        if (effectiveDangerLevel > 0.5) {
            targetVelocity = this.base_velocity * (1.0 - effectiveDangerLevel * 0.4);
        } else if (this.in_sprint_zone && effectiveDangerLevel < 0.3) {
            const kickBonus = this.mid_race_kick * 0.15;
            targetVelocity = this.max_velocity * styleModifier * this.top_speed_skill * (1.0 + kickBonus);
        } else if (effectiveDangerLevel > 0.2) {
            targetVelocity = this.base_velocity * (1.0 - effectiveDangerLevel * 0.2);
        } else {
            targetVelocity = this.base_velocity;
        }

        if (this.repositioning_active) {
            targetVelocity *= 1.08;
        }

        targetVelocity *= staminaFactor * lastSpurtBoost;

        const consistencyFactor = 0.95 + (this.focus_level * 0.05);
        targetVelocity *= consistencyFactor;

        return targetVelocity;
    }

    updateMovement(dt) {
        if (!this.is_running) return;

        const moveVec = this.getVecRotated();
        const velocityVec = moveVec.multiply(this.velocity * dt);
        let proposedPosition = this.position.add(velocityVec);

        proposedPosition = this.handlePhysicalCollisions(proposedPosition);

        const distanceMoved = proposedPosition.distance(this.previous_position);
        this.cumulative_distance_traveled += distanceMoved;

        this.position = proposedPosition;
        this.previous_position = new Vector2(proposedPosition.x, proposedPosition.y);
    }

    handlePhysicalCollisions(proposedPosition) {
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
                return proposedPosition.add(pushbackVector);
            }
        }
        return proposedPosition;
    }

    updateParticles(dt) {
        if (!this.is_running) return;

        const currentAccel = Math.abs(this.velocity - this.previous_velocity) / dt;
        const velocityFactor = this.velocity / this.max_velocity;
        const accelFactor = Math.min(1.0, currentAccel / 100);

        this.particleSpawnTimer -= dt;

        const intensity = Math.max(velocityFactor * 0.5, accelFactor);
        const spawnRate = 0.08 / Math.max(0.3, intensity);

        if (this.particleSpawnTimer <= 0 && intensity > 0.1) {
            this.particleSpawnTimer = spawnRate;
            this.spawnParticles(accelFactor);
        }

        this.previous_velocity = this.velocity;
    }

    spawnParticles(accelFactor) {
        const bodyVec = this.getVecRotated();
        const perpendicular = new Vector2(-bodyVec.y, bodyVec.x);
        const behindPos = this.position.subtract(bodyVec.multiply(this.width / 2));
        const halfWidth = this.width / 2;

        const cornerLeft = behindPos.add(perpendicular.multiply(-halfWidth * 0.7));
        const cornerRight = behindPos.add(perpendicular.multiply(halfWidth * 0.7));

        const particleCount = Math.floor(3 + accelFactor * 5);

        for (let i = 0; i < particleCount; i++) {
            const spawnCorner = Math.random() > 0.5 ? cornerLeft : cornerRight;
            const spreadAngle = (Math.random() - 0.5) * 90;
            const spreadDistance = Math.random() * 15;
            const spreadDir = bodyVec.rotate(spreadAngle).normalize();
            const spreadOffset = spreadDir.multiply(spreadDistance);

            const baseVelocity = 20 + accelFactor * 40;
            const velocityAngle = 180 + (Math.random() - 0.5) * 120;
            const velocityDir = bodyVec.rotate(velocityAngle);
            const velocityMagnitude = baseVelocity * (0.5 + Math.random() * 0.5);

            const baseSize = 4 + accelFactor * 5;

            const particle = globalParticlePool.acquire();
            particle.x = spawnCorner.x + spreadOffset.x;
            particle.y = spawnCorner.y + spreadOffset.y;
            particle.vx = velocityDir.x * velocityMagnitude;
            particle.vy = velocityDir.y * velocityMagnitude;
            particle.life = 0.4 + Math.random() * 0.4;
            particle.maxLife = 0.8;
            particle.size = baseSize + Math.random() * 3;

            const colorVariation = Math.random();
            if (colorVariation < 0.15) {
                particle.color = 'rgb(139, 90, 43)';
            } else if (colorVariation < 0.3) {
                particle.color = 'rgb(120, 75, 35)';
            } else if (colorVariation < 0.45) {
                particle.color = 'rgb(160, 110, 60)';
            } else if (colorVariation < 0.55) {
                particle.color = 'rgb(100, 65, 30)';
            } else if (colorVariation < 0.7) {
                particle.color = 'rgb(85, 140, 70)';
            } else if (colorVariation < 0.85) {
                particle.color = 'rgb(100, 160, 80)';
            } else {
                particle.color = 'rgb(65, 110, 55)';
            }
        }
    }

    startRunning() {
        this.is_running = true;
    }
}
