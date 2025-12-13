// Horse Racing Simulator - Debug Tools
// Event-based logging for debugging navigation and layer issues

const HorseDebug = {
    // Event log (circular buffer)
    events: [],
    maxEvents: 200,
    enabled: true,

    // Track previous states to detect changes
    prevStates: new Map(),

    // Anomaly thresholds
    STUCK_THRESHOLD: 1.5,  // seconds without moving
    ANGLE_JUMP_THRESHOLD: 90,  // degrees per frame

    log(horseNum, category, message, data = null) {
        if (!this.enabled) return;

        const event = {
            t: window.game?.race?.race_time?.toFixed(2) || '0.00',
            h: horseNum,
            cat: category,
            msg: message,
            data: data
        };

        this.events.push(event);
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        // Also console log for immediate visibility
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        console.log(`[${event.t}] H${horseNum} ${category}: ${message}${dataStr}`);
    },

    // Called each frame to detect events
    update(horses, trackBounds) {
        if (!this.enabled || !horses) return;

        const trackW = trackBounds?.width || 1;
        const trackH = trackBounds?.height || 1;
        const cornerSize = trackH / 2;
        const centerY = trackH / 2;

        for (const horse of horses) {
            const num = horse.number;
            const prev = this.prevStates.get(num) || {};
            const x = horse.position.x;
            const y = horse.position.y;

            // Determine current track section
            let section = 'UNKNOWN';
            if (x > trackW - cornerSize) section = 'RIGHT_CORNER';
            else if (x < cornerSize) section = 'LEFT_CORNER';
            else if (y < centerY) section = 'TOP_STRAIGHT';
            else section = 'BOTTOM_STRAIGHT';

            // === EVENT: Section change ===
            if (prev.section && prev.section !== section) {
                this.log(num, 'NAV', `${prev.section} -> ${section}`);
            }

            // === EVENT: Wall collision (position correction would cause this) ===
            // Detect if horse is very close to boundary
            if (trackBounds) {
                const margin = 50;
                if (x < margin || x > trackW - margin || y < margin || y > trackH - margin) {
                    if (!prev.nearWall) {
                        this.log(num, 'WALL', `Near boundary`, {x: Math.round(x), y: Math.round(y)});
                    }
                    prev.nearWall = true;
                } else {
                    prev.nearWall = false;
                }
            }

            // === ANOMALY: Stuck detection ===
            const moved = prev.x !== undefined &&
                (Math.abs(x - prev.x) > 1 || Math.abs(y - prev.y) > 1);

            if (!moved && horse.is_running) {
                prev.stuckTime = (prev.stuckTime || 0) + (1/60);
                if (prev.stuckTime > this.STUCK_THRESHOLD && !prev.stuckLogged) {
                    this.log(num, 'STUCK', `Not moving for ${this.STUCK_THRESHOLD}s`, {
                        x: Math.round(x), y: Math.round(y), vel: horse.velocity?.toFixed(1)
                    });
                    prev.stuckLogged = true;
                }
            } else {
                prev.stuckTime = 0;
                prev.stuckLogged = false;
            }

            // === ANOMALY: Angle jump ===
            if (prev.steerAngle !== undefined) {
                let angleDiff = Math.abs(horse.steer_angle - prev.steerAngle);
                if (angleDiff > 180) angleDiff = 360 - angleDiff;
                if (angleDiff > this.ANGLE_JUMP_THRESHOLD) {
                    this.log(num, 'ANGLE', `Jumped ${angleDiff.toFixed(0)}°`, {
                        from: prev.steerAngle?.toFixed(0), to: horse.steer_angle?.toFixed(0)
                    });
                }
            }

            // === ANOMALY: NaN detection ===
            if (isNaN(x) || isNaN(y) || isNaN(horse.velocity) || isNaN(horse.steer_angle)) {
                if (!prev.nanLogged) {
                    this.log(num, 'NAN', `NaN detected!`, {
                        x, y, vel: horse.velocity, angle: horse.steer_angle
                    });
                    prev.nanLogged = true;
                }
            }

            // === EVENT: Layer activations ===
            if (typeof HorseLayers !== 'undefined') {
                // Drafting
                if (horse.isDrafting && !prev.isDrafting) {
                    this.log(num, 'DRAFT', `Started drafting behind H${horse.draftTarget?.number}`);
                } else if (!horse.isDrafting && prev.isDrafting) {
                    this.log(num, 'DRAFT', `Stopped drafting`);
                }

                // Final kick
                if (horse.finalKickActivated && !prev.finalKickActivated) {
                    this.log(num, 'KICK', `Final kick activated`, {stamina: horse.stamina?.toFixed(0)});
                }

                // Boxed in
                if (horse.isBoxedIn && !prev.isBoxedIn) {
                    this.log(num, 'BOX', `Boxed in`);
                } else if (!horse.isBoxedIn && prev.isBoxedIn) {
                    this.log(num, 'BOX', `Free`);
                }

                // Low stamina warning
                if (horse.stamina < 20 && (prev.stamina === undefined || prev.stamina >= 20)) {
                    this.log(num, 'STAM', `Low stamina`, {stamina: horse.stamina?.toFixed(0)});
                }
            }

            // Update previous state
            this.prevStates.set(num, {
                x, y,
                section,
                steerAngle: horse.steer_angle,
                isDrafting: horse.isDrafting,
                finalKickActivated: horse.finalKickActivated,
                isBoxedIn: horse.isBoxedIn,
                stamina: horse.stamina,
                stuckTime: prev.stuckTime,
                stuckLogged: prev.stuckLogged,
                nearWall: prev.nearWall,
                nanLogged: prev.nanLogged
            });
        }
    },

    // Snapshot current state of all horses
    snapshot() {
        const horses = window.game?.race?.horses;
        if (!horses) {
            console.log('No horses found');
            return;
        }

        const trackBounds = {
            width: window.game.race.trackWidth,
            height: window.game.race.trackHeight
        };
        const cornerSize = trackBounds.height / 2;
        const centerY = trackBounds.height / 2;

        console.log('\n=== HORSE SNAPSHOT ===');
        console.log(`Race time: ${window.game.race.race_time?.toFixed(2)}s`);
        console.log(`Time scale: ${window.game.timeScale}x`);
        console.log('');

        for (const horse of horses) {
            const x = horse.position.x;
            const y = horse.position.y;

            let section = 'UNKNOWN';
            if (x > trackBounds.width - cornerSize) section = 'RIGHT_CORNER';
            else if (x < cornerSize) section = 'LEFT_CORNER';
            else if (y < centerY) section = 'TOP_STRAIGHT';
            else section = 'BOTTOM_STRAIGHT';

            const layers = [];
            if (horse.runningStyle) layers.push(horse.runningStyle.abbrev);
            if (horse.isDrafting) layers.push('DRAFT');
            if (horse.isBoxedIn) layers.push('BOXED');
            if (horse.finalKickActivated) layers.push('KICK');

            const lane = horse.lanePreference < 0.33 ? 'IN' : horse.lanePreference > 0.66 ? 'OUT' : 'MID';
            console.log(`H${horse.number}: ${section} pos=(${Math.round(x)},${Math.round(y)}) vel=${horse.velocity?.toFixed(0)} angle=${horse.steer_angle?.toFixed(0)}° lane=${lane} stamina=${horse.stamina?.toFixed(0) || 'N/A'} [${layers.join(',')}]`);
        }
        console.log('======================\n');
    },

    // Dump recent events
    dump(count = 50) {
        console.log('\n=== RECENT EVENTS ===');
        const start = Math.max(0, this.events.length - count);
        for (let i = start; i < this.events.length; i++) {
            const e = this.events[i];
            const dataStr = e.data ? ` ${JSON.stringify(e.data)}` : '';
            console.log(`[${e.t}] H${e.h} ${e.cat}: ${e.msg}${dataStr}`);
        }
        console.log('=====================\n');
    },

    // Clear event log
    clear() {
        this.events = [];
        this.prevStates.clear();
        console.log('Debug log cleared');
    },

    // Filter events by horse or category
    filter(horseNum = null, category = null, count = 50) {
        let filtered = this.events;
        if (horseNum !== null) {
            filtered = filtered.filter(e => e.h === horseNum);
        }
        if (category !== null) {
            filtered = filtered.filter(e => e.cat === category);
        }

        console.log(`\n=== FILTERED EVENTS (H${horseNum || '*'} ${category || '*'}) ===`);
        const start = Math.max(0, filtered.length - count);
        for (let i = start; i < filtered.length; i++) {
            const e = filtered[i];
            const dataStr = e.data ? ` ${JSON.stringify(e.data)}` : '';
            console.log(`[${e.t}] H${e.h} ${e.cat}: ${e.msg}${dataStr}`);
        }
        console.log('=====================\n');
    }
};

// Expose to window
window.debug = HorseDebug;
window.snapshot = () => HorseDebug.snapshot();
window.dump = (n) => HorseDebug.dump(n);

console.log('Debug tools loaded. Commands: snapshot(), dump(n), debug.filter(horse, cat), debug.clear()');
