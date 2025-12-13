// Horse Racing Simulator - UmaSim Main Game Class
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

        // Game state management
        this.gameState = "RACING";  // RACING -> FINAL_STRETCH -> FINISH_LINE -> POSTGAME
        this.firstPlaceHorse = null;
        this.finishLineWatchTimer = 0;
        this.finishLineWatchDuration = 10;  // Watch finish line for 10 seconds

        // Final stretch tracking
        this.finalStretchActivated = false;
        this.leaderHorse = null;

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

        // Calculate start gate position (same Y as the racing area in top sprint)
        const gateX = this.race.trackWidth / 2 + 1500;
        const gateY = this.race.trackHeight / 2 - this.race.trackHeight / 4; // Approximate top sprint center
        const startGatePosition = new Vector2(gateX, gateY);

        return [...this.race.horses].sort((a, b) => {
            const positionA = a.getRelativeRacePosition(trackCenter, startGatePosition);
            const positionB = b.getRelativeRacePosition(trackCenter, startGatePosition);
            return positionA - positionB; // Lower angle = further along track (reversed!)
        });
    }

    updateCameraMode(dt) {
        if (!this.raceStarted) return;

        // Check for FINAL STRETCH activation - first horse re-enters top sprint on lap 2+
        if (!this.finalStretchActivated && this.gameState === "RACING") {
            // Find the leading horse
            const sortedHorses = this.getSortedHorsesByPosition();
            const currentLeader = sortedHorses[sortedHorses.length - 1];  // Last in sorted = first place

            // Check if leader has completed at least 1 lap AND is in top sprint zone
            if (currentLeader && currentLeader.lap >= 1) {
                const inTopSprint = currentLeader.position.x >= this.race.top_sprint.x &&
                                   currentLeader.position.x <= this.race.top_sprint.x + this.race.top_sprint.width &&
                                   currentLeader.position.y >= this.race.top_sprint.y &&
                                   currentLeader.position.y <= this.race.top_sprint.y + this.race.top_sprint.height;

                if (inTopSprint) {
                    // FINAL STRETCH ACTIVATED!
                    this.finalStretchActivated = true;
                    this.gameState = "FINAL_STRETCH";
                    this.leaderHorse = currentLeader;
                    this.cameraMode = "leader_lock";
                    this.targetZoom = 1.6;  // Cinematic zoom on leader

                    console.log(`🎬 FINAL STRETCH! Camera locked on Horse #${currentLeader.number}`);
                    return;
                }
            }
        }

        // Check if race finished - FIRST horse crossed finish line (only after goal is armed!)
        if ((this.gameState === "RACING" || this.gameState === "FINAL_STRETCH") && this.race.isGoalSet && this.race.horsesCrossedGoal.size >= 1) {
            this.gameState = "FINISH_LINE";
            this.finishLineWatchTimer = 0;

            // Get first place horse
            const sortedHorses = this.getSortedHorsesByPosition();
            this.firstPlaceHorse = sortedHorses[sortedHorses.length - 1];  // Last in sorted = first place

            console.log(`🏁 FINISH LINE! First horse crossed! Winner: Horse #${this.firstPlaceHorse.number}`);

            // Lock camera on finish line to watch others come in
            this.cameraMode = "finish_line";
            this.targetZoom = 1.2;  // Slight zoom on finish line
            return;
        }

        // Handle finish line watching
        if (this.gameState === "FINISH_LINE") {
            this.finishLineWatchTimer += dt;

            // Transition to POSTGAME when ALL horses have finished
            if (this.race.horsesCrossedGoal.size >= this.race.horses.length) {
                this.gameState = "POSTGAME";
                console.log("📊 All horses finished! Transitioning to POSTGAME...");
                // POSTGAME animations will be implemented later
            }
            return;  // Don't update camera modes during finish line watch
        }

        // Handle FINAL STRETCH - keep camera locked on leader
        if (this.gameState === "FINAL_STRETCH") {
            // Update leader if they change
            const sortedHorses = this.getSortedHorsesByPosition();
            this.leaderHorse = sortedHorses[sortedHorses.length - 1];
            return;  // Don't update camera modes during final stretch
        }

        // Normal camera cycling during race
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
                this.positionCycleIndex = 0; // Start from first place
                this.targetZoom = 1.8;
                this.cameraDuration = 1.8; // 1.8 seconds per horse
            } else if (this.cameraMode === "position_cycle") {
                const sortedHorses = this.getSortedHorsesByPosition();
                this.positionCycleIndex++;

                if (this.positionCycleIndex >= sortedHorses.length) {
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

        // FINISH LINE CAMERA MODE - Lock on finish line!
        if (this.cameraMode === "finish_line") {
            const finishX = this.race.trackWidth / 2 - 1500;
            const finishY = this.race.trackHeight / 2 - this.race.trackHeight / 8;  // Center vertically in top sprint

            const displayCenterX = this.canvas.width / 2;
            const displayCenterY = this.canvas.height / 2;

            this.cameraZoom += (this.targetZoom - this.cameraZoom) * this.zoomSmoothness;

            const targetOffset = new Vector2(
                displayCenterX - finishX * this.cameraZoom,
                displayCenterY - finishY * this.cameraZoom
            );

            // Smooth lock on finish line
            this.cameraOffset.x += (targetOffset.x - this.cameraOffset.x) * this.cameraSmoothness;
            this.cameraOffset.y += (targetOffset.y - this.cameraOffset.y) * this.cameraSmoothness;
            return;
        }

        // LEADER LOCK CAMERA MODE - Follow the leader!
        if (this.cameraMode === "leader_lock" && this.leaderHorse) {
            const displayCenterX = this.canvas.width / 2;
            const displayCenterY = this.canvas.height / 2;

            this.cameraZoom += (this.targetZoom - this.cameraZoom) * this.zoomSmoothness;

            const targetOffset = new Vector2(
                displayCenterX - this.leaderHorse.position.x * this.cameraZoom,
                displayCenterY - this.leaderHorse.position.y * this.cameraZoom
            );

            // Smooth follow on leader
            this.cameraOffset.x += (targetOffset.x - this.cameraOffset.x) * this.cameraSmoothness;
            this.cameraOffset.y += (targetOffset.y - this.cameraOffset.y) * this.cameraSmoothness;
            return;
        }

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

        // Show finish line status
        if (this.gameState === "FINISH_LINE" && this.firstPlaceHorse) {
            // Update instructions to show winner
            const instructionsDiv = document.getElementById('instructions');
            instructionsDiv.style.display = 'block';
            instructionsDiv.style.background = 'rgba(255, 215, 0, 0.9)';  // Gold background
            instructionsDiv.style.color = 'black';
            instructionsDiv.style.border = '3px solid gold';

            const crossedCount = this.race.horsesCrossedGoal.size;
            const totalHorses = this.race.horses.length;

            instructionsDiv.innerHTML = `
                🏆 WINNER: Horse #${this.firstPlaceHorse.number} 🏆<br>
                <small>Horses crossed: ${crossedCount}/${totalHorses}</small>
            `;
        }

        // Display finish order during finish line watch
        if (this.gameState === "FINISH_LINE" && this.race.finishOrder.length > 0) {
            // Create or update finish order display
            let finishDiv = document.getElementById('finishOrderDisplay');
            if (!finishDiv) {
                finishDiv = document.createElement('div');
                finishDiv.id = 'finishOrderDisplay';
                finishDiv.style.position = 'fixed';
                finishDiv.style.bottom = '100px';
                finishDiv.style.left = '50%';
                finishDiv.style.transform = 'translateX(-50%)';
                finishDiv.style.background = 'rgba(0, 0, 0, 0.85)';
                finishDiv.style.border = '3px solid gold';
                finishDiv.style.borderRadius = '8px';
                finishDiv.style.padding = '15px';
                finishDiv.style.color = 'white';
                finishDiv.style.fontFamily = 'monospace';
                finishDiv.style.fontSize = '14px';
                finishDiv.style.maxHeight = '300px';
                finishDiv.style.overflowY = 'auto';
                finishDiv.style.pointerEvents = 'none';
                document.getElementById('ui').appendChild(finishDiv);
            }

            // Build finish order HTML
            let html = '<div style="text-align: center; margin-bottom: 10px; font-size: 16px; color: gold;">📊 FINISH ORDER 📊</div>';
            this.race.finishOrder.forEach(entry => {
                const medal = entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : '🏁';
                const horseName = entry.horse.playerName || `Horse #${entry.horse.number}`;
                html += `<div style="margin: 5px 0;">${medal} ${entry.position}. ${horseName} - ${this.race.formatTime(entry.time)}</div>`;
            });
            finishDiv.innerHTML = html;

            // Notify parent window of race results (for betting)
            if (window.parent && window.parent.postMessage) {
                window.parent.postMessage({
                    type: 'RACE_FINISHED',
                    results: this.race.finishOrder.map(e => ({
                        position: e.position,
                        playerId: e.horse.playerId,
                        playerName: e.horse.playerName,
                        time: e.time
                    }))
                }, '*');
            }
        }

        // Update animated leaderboard
        const sortedHorses = this.getSortedHorsesByPosition();

        // Update keiba-style position display with circles moving horizontally
        const keibaDisplay = document.getElementById('keibaDisplay');
        keibaDisplay.innerHTML = '';

        // Calculate track center and start gate position for position calculations
        const trackCenter = new Vector2(this.race.trackWidth / 2, this.race.trackHeight / 2);
        const gateX = this.race.trackWidth / 2 + 1500;
        const gateY = this.race.trackHeight / 2 - this.race.trackHeight / 4;
        const startGatePosition = new Vector2(gateX, gateY);

        // Get race positions for all horses
        const horsePositions = this.race.horses.map(horse => ({
            horse: horse,
            position: horse.getRelativeRacePosition(trackCenter, startGatePosition)
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

            // Update entry content - show player name if available
            const displayName = horse.playerName || `#${horse.number}`;
            entry.style.backgroundColor = bgColor;
            entry.innerHTML = `
                <span class="position">${position}</span>
                <span class="number-badge" style="background-color: ${numberColor}; color: black;">${horse.playerName ? horse.number : '#' + horse.number}</span>
                <span class="info" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${horse.playerName || ''} [${styleAbbrev}${surgeIndicator}]</span>
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
