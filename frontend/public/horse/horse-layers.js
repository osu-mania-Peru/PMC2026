// Horse Racing Simulator - Layered Feature System
// Each layer adds realistic racing mechanics
// Layers can be enabled/disabled via HORSE_FEATURES config

// ============================================
// FEATURE FLAGS - Toggle layers on/off
// ============================================
const HORSE_FEATURES = {
    RUNNING_STYLES: true,    // Layer 1: Different pacing strategies
    STAMINA: true,           // Layer 2: Energy management
    DRAFTING: true,          // Layer 3: Energy savings when following
    POSITIONING: true,       // Layer 4: Rail advantage, avoid boxing
    FINAL_KICK: true,        // Layer 5: End-race surge
};

// ============================================
// LAYER 1: RUNNING STYLES
// Based on real racing: Front Runner, Stalker, Closer
// ============================================
const RunningStyleLayer = {
    // Running style definitions with pacing profiles
    STYLES: {
        FRONT_RUNNER: {
            name: 'Front Runner',
            abbrev: 'F',
            // Pace profile: percentage of max speed at each race phase
            earlyPace: 1.0,      // Goes all out early
            midPace: 0.95,       // Maintains high speed
            latePace: 0.85,      // Tires at end
            staminaDrain: 1.3,   // Burns energy fast
            preferredPosition: 'front',
        },
        STALKER: {
            name: 'Stalker',
            abbrev: 'S',
            earlyPace: 0.92,     // Sits behind leaders
            midPace: 0.95,       // Keeps close
            latePace: 0.98,      // Makes move late
            staminaDrain: 1.0,   // Balanced energy use
            preferredPosition: 'mid-front',
        },
        CLOSER: {
            name: 'Closer',
            abbrev: 'C',
            earlyPace: 0.85,     // Conserves early
            midPace: 0.88,       // Stays back
            latePace: 1.1,       // Explosive finish
            staminaDrain: 0.8,   // Saves energy
            preferredPosition: 'back',
        },
        PRESSER: {
            name: 'Presser',
            abbrev: 'P',
            earlyPace: 0.95,     // Pressures leader
            midPace: 0.93,       // Maintains pressure
            latePace: 0.95,      // Steady finish
            staminaDrain: 1.1,   // Slightly high drain
            preferredPosition: 'front',
        },
    },

    apply(horse) {
        if (!HORSE_FEATURES.RUNNING_STYLES) return;

        const styles = Object.values(this.STYLES);
        horse.runningStyle = styles[Math.floor(Math.random() * styles.length)];
    },

    getPaceMultiplier(horse, raceProgress) {
        if (!HORSE_FEATURES.RUNNING_STYLES || !horse.runningStyle) return 1.0;

        const style = horse.runningStyle;
        if (raceProgress < 0.33) {
            return style.earlyPace;
        } else if (raceProgress < 0.75) {
            return style.midPace;
        } else {
            return style.latePace;
        }
    },
};

// ============================================
// LAYER 2: STAMINA SYSTEM
// Energy depletes based on effort, affects speed
// ============================================
const StaminaLayer = {
    apply(horse) {
        if (!HORSE_FEATURES.STAMINA) return;

        horse.stamina = 100;
        horse.maxStamina = 100;
        // Random stamina capacity variation (some horses have more endurance)
        horse.staminaCapacity = 0.85 + Math.random() * 0.3; // 0.85-1.15
    },

    update(horse, dt, currentPace) {
        if (!HORSE_FEATURES.STAMINA) return;

        // Drain rate based on how hard they're running
        const effort = currentPace / horse.base_velocity;
        let drainRate = effort * 8; // Base drain

        // Running style affects drain
        if (HORSE_FEATURES.RUNNING_STYLES && horse.runningStyle) {
            drainRate *= horse.runningStyle.staminaDrain;
        }

        // Drafting reduces drain (Layer 3 integration)
        if (HORSE_FEATURES.DRAFTING && horse.isDrafting) {
            drainRate *= 0.83; // 17% savings from drafting
        }

        horse.stamina = Math.max(0, horse.stamina - drainRate * dt / horse.staminaCapacity);
    },

    getSpeedMultiplier(horse) {
        if (!HORSE_FEATURES.STAMINA) return 1.0;

        // Below 30% stamina, speed drops significantly
        if (horse.stamina < 30) {
            return 0.7 + (horse.stamina / 30) * 0.3; // 70-100%
        } else if (horse.stamina < 50) {
            return 0.9 + (horse.stamina - 30) / 20 * 0.1; // 90-100%
        }
        return 1.0;
    },
};

// ============================================
// LAYER 3: DRAFTING
// Following close behind another horse saves energy
// Real racing: ~17% energy savings from aerodynamic draft
// ============================================
const DraftingLayer = {
    DRAFT_DISTANCE: 60,      // Max distance to benefit from draft
    DRAFT_ANGLE: 30,         // Degrees - must be behind, not beside

    apply(horse) {
        if (!HORSE_FEATURES.DRAFTING) return;

        horse.isDrafting = false;
        horse.draftTarget = null;
    },

    update(horse, allHorses) {
        if (!HORSE_FEATURES.DRAFTING) return;

        horse.isDrafting = false;
        horse.draftTarget = null;

        const myDir = horse.getVecRotated();

        for (const other of allHorses) {
            if (other === horse) continue;

            const toOther = other.position.subtract(horse.position);
            const distance = toOther.length();

            if (distance > this.DRAFT_DISTANCE || distance < 10) continue;

            // Check if other horse is ahead of us (in our direction)
            const dirToOther = toOther.normalize();
            const dot = myDir.dot(dirToOther);

            // Must be ahead (dot > 0.7 = roughly within 45 degrees forward)
            if (dot > 0.7) {
                horse.isDrafting = true;
                horse.draftTarget = other;
                break; // Only draft off one horse
            }
        }
    },

    getSpeedBonus(horse) {
        if (!HORSE_FEATURES.DRAFTING || !horse.isDrafting) return 0;
        // Small speed boost from slipstream (in addition to stamina savings)
        return 0.02; // 2% speed boost when drafting
    },
};

// ============================================
// LAYER 4: POSITIONING INTELLIGENCE
// Rail advantage, avoiding being boxed in
// ============================================
const PositioningLayer = {
    apply(horse) {
        if (!HORSE_FEATURES.POSITIONING) return;

        horse.isBoxedIn = false;
        horse.railDistance = null;
        // Some horses are smarter at finding gaps
        horse.positioningIQ = 0.7 + Math.random() * 0.6; // 0.7-1.3
    },

    update(horse, allHorses, trackBounds) {
        if (!HORSE_FEATURES.POSITIONING) return;

        // Check if boxed in (horses on both sides and ahead)
        let leftBlocked = false;
        let rightBlocked = false;
        let frontBlocked = false;

        const myDir = horse.getVecRotated();
        const leftDir = new Vector2(-myDir.y, myDir.x);

        for (const other of allHorses) {
            if (other === horse) continue;

            const toOther = other.position.subtract(horse.position);
            const distance = toOther.length();

            if (distance > 80) continue;

            const dirToOther = toOther.normalize();
            const forwardDot = myDir.dot(dirToOther);
            const sideDot = leftDir.dot(dirToOther);

            if (forwardDot > 0.5 && distance < 50) frontBlocked = true;
            if (sideDot > 0.3 && distance < 40) leftBlocked = true;
            if (sideDot < -0.3 && distance < 40) rightBlocked = true;
        }

        horse.isBoxedIn = frontBlocked && leftBlocked && rightBlocked;
    },

    getSteeringAdjustment(horse) {
        if (!HORSE_FEATURES.POSITIONING) return 0;

        // If boxed in, high IQ horses slow down to find gap
        if (horse.isBoxedIn && horse.positioningIQ > 1.0) {
            return -0.1; // Slight slowdown to reposition
        }
        return 0;
    },
};

// ============================================
// LAYER 5: FINAL KICK
// Burst of speed in last stretch using remaining stamina
// ============================================
const FinalKickLayer = {
    KICK_THRESHOLD: 0.85,    // Race progress to activate (last 15%)

    apply(horse) {
        if (!HORSE_FEATURES.FINAL_KICK) return;

        horse.finalKickActivated = false;
        // Random kick strength
        horse.kickStrength = 0.8 + Math.random() * 0.4; // 0.8-1.2
    },

    update(horse, raceProgress) {
        if (!HORSE_FEATURES.FINAL_KICK) return;

        // Activate final kick in last stretch if has stamina
        if (raceProgress >= this.KICK_THRESHOLD && !horse.finalKickActivated) {
            const hasEnoughStamina = !HORSE_FEATURES.STAMINA || horse.stamina > 20;
            if (hasEnoughStamina) {
                horse.finalKickActivated = true;
            }
        }
    },

    getSpeedMultiplier(horse) {
        if (!HORSE_FEATURES.FINAL_KICK || !horse.finalKickActivated) return 1.0;

        // Boost based on remaining stamina and kick strength
        let boost = 1.0 + (0.15 * horse.kickStrength); // Up to 18% boost

        if (HORSE_FEATURES.STAMINA) {
            // More stamina = stronger kick
            boost *= 0.7 + (horse.stamina / 100) * 0.3;
        }

        return boost;
    },
};

// ============================================
// LAYER MANAGER - Applies all layers to horse
// ============================================
const HorseLayers = {
    applyAll(horse) {
        RunningStyleLayer.apply(horse);
        StaminaLayer.apply(horse);
        DraftingLayer.apply(horse);
        PositioningLayer.apply(horse);
        FinalKickLayer.apply(horse);
    },

    updateAll(horse, dt, allHorses, trackBounds, raceProgress) {
        const basePace = horse.velocity;

        DraftingLayer.update(horse, allHorses);
        PositioningLayer.update(horse, allHorses, trackBounds);
        StaminaLayer.update(horse, dt, basePace);
        FinalKickLayer.update(horse, raceProgress);
    },

    calculateSpeed(horse, baseSpeed, raceProgress) {
        let speed = baseSpeed;

        // Layer 1: Running style pace
        speed *= RunningStyleLayer.getPaceMultiplier(horse, raceProgress);

        // Layer 2: Stamina affects speed
        speed *= StaminaLayer.getSpeedMultiplier(horse);

        // Layer 3: Drafting speed bonus
        speed *= (1 + DraftingLayer.getSpeedBonus(horse));

        // Layer 4: Positioning adjustment
        speed *= (1 + PositioningLayer.getSteeringAdjustment(horse));

        // Layer 5: Final kick boost
        speed *= FinalKickLayer.getSpeedMultiplier(horse);

        return speed;
    },

    // Get display info for UI
    getStatusText(horse) {
        const parts = [];

        if (HORSE_FEATURES.RUNNING_STYLES && horse.runningStyle) {
            parts.push(horse.runningStyle.abbrev);
        }

        if (HORSE_FEATURES.DRAFTING && horse.isDrafting) {
            parts.push('D');
        }

        if (HORSE_FEATURES.POSITIONING && horse.isBoxedIn) {
            parts.push('B');
        }

        if (HORSE_FEATURES.FINAL_KICK && horse.finalKickActivated) {
            parts.push('!');
        }

        return parts.join('');
    },
};
