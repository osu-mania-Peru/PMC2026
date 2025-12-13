// Horse Racing Simulator - Race Class
class Race {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Load images with absolute paths
        this.trackImage = new Image();
        this.trackImage.src = '/horse/src/assets/racetrack.png';
        this.trackLoaded = false;
        this.trackImage.onload = () => {
            console.log('Track image loaded');
            this.trackLoaded = true;
            this.checkImagesLoaded();
        };
        this.trackImage.onerror = (e) => {
            console.error('Failed to load track image:', e);
        };

        this.horseImage = new Image();
        this.horseImage.src = '/horse/src/assets/horse.png';
        this.horseLoaded = false;
        this.horseImage.onload = () => {
            console.log('Horse image loaded');
            this.horseLoaded = true;
            this.checkImagesLoaded();
        };
        this.horseImage.onerror = (e) => {
            console.error('Failed to load horse image:', e);
        };

        this.horses = [];
        this.race_time = 0.0;
        this.raceStarted = false;
        this.imagesLoaded = false;

        // Goal tracking
        this.horsesInGoal = new Set();  // Horses currently in goal area
        this.horsesCrossedGoal = new Set();  // Horses that have crossed and left goal
        this.finishOrder = [];  // Array of {horse, time, position} in order they finished
        this.isGoalSet = false;
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

        // Spawn horses - use external data if available (PMC players)
        const gateX = this.trackWidth / 2 + 1500;  // Start gate 1500px to the right
        const externalHorses = window.HORSE_DATA || [];
        const numHorses = externalHorses.length > 0 ? Math.min(externalHorses.length, 16) : 10;
        const spacing = 60;  // Scaled 4x from 25
        const startY = 160;   // Scaled 4x from 50

        const horseNumbers = [];
        while (horseNumbers.length < numHorses) {
            const num = Math.floor(Math.random() * 99) + 1;
            if (!horseNumbers.includes(num)) {
                horseNumbers.push(num);
            }
        }

        // Pick one random horse to be Haru Urara (the pink one)
        const haruUraraIndex = Math.floor(Math.random() * numHorses);

        for (let i = 0; i < numHorses; i++) {
            const y = startY + (i * spacing);
            const initPosition = new Vector2(gateX, y);

            // Assign pink color (index 8) to Haru Urara, others cycle through 0-7
            const colorIndex = externalHorses[i]?.colorIndex ?? ((i === haruUraraIndex) ? 8 : (i % 8));
            const horseNumber = externalHorses[i]?.seed || horseNumbers[i];

            const horse = new Horse(initPosition, colorIndex, horseNumber, this.horseImage);

            // Use player name and avatar if available
            if (externalHorses[i]?.name) {
                horse.playerName = externalHorses[i].name;
                horse.playerId = externalHorses[i].id;
            }

            // Create avatar HTML element (avoids CORS issues with canvas)
            if (externalHorses[i]?.avatarUrl) {
                horse.avatarUrl = externalHorses[i].avatarUrl;
                horse.avatarElement = document.createElement('img');
                horse.avatarElement.src = externalHorses[i].avatarUrl;
                horse.avatarElement.className = 'horse-avatar';
                horse.avatarElement.style.cssText = `
                    position: absolute;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid white;
                    pointer-events: none;
                    z-index: 100;
                    object-fit: cover;
                    display: none;
                `;
                document.body.appendChild(horse.avatarElement);
            }

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
        // These are used for lap counting, not positioning (we use angular positioning)
        this.checkpoints = [
            { x: this.trackWidth / 2, y: sprintHeight / 2, radius: 100 }, // Center checkpoint for lap counting
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

        // Setup goal collider (1500px to the left from center)
        const goalX = this.trackWidth / 2 - 1500;
        const goalTopY = this.top_sprint_top_fence.y + this.top_sprint_top_fence.height + 10;
        const goalBottomY = this.top_sprint_bottom_fence.y - 10;
        const goalWidth = 20;  // Width of the goal line collider

        this.goalCollider = {
            x: goalX - goalWidth / 2,
            y: goalTopY,
            width: goalWidth,
            height: goalBottomY - goalTopY
        };
    }

    calculateTrackDistances() {
        // Calculate actual track distance using the real racing path
        // Standard horse length for distance calculations
        this.HORSE_LENGTH = 96;  // ~8 feet in pixels (scaled 4x from 24px)

        // Build the actual racing path using sprint zones and corner arcs
        this.racingPath = [];
        let cumulativeDistance = 0;

        // Reference point at center of top sprint (for distance calculations)
        const startX = this.trackWidth / 2;
        const startY = this.top_sprint.y + this.top_sprint.height / 2;

        // 1. Top sprint - from center to right edge (going RIGHT)
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

        // 9. Top sprint - from left edge back to center
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

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 100);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    startRace() {
        for (const horse of this.horses) {
            horse.startRunning();
        }
        this.race_time = 0.0;
        this.raceStarted = true;
    }

    update(dt) {
        if (!this.imagesLoaded) return;

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

        // Check goal collisions
        for (const horse of this.horses) {
            const isInGoal = horse.position.x >= this.goalCollider.x &&
                             horse.position.x <= this.goalCollider.x + this.goalCollider.width &&
                             horse.position.y >= this.goalCollider.y &&
                             horse.position.y <= this.goalCollider.y + this.goalCollider.height;

            const wasInGoal = this.horsesInGoal.has(horse.number);

            if (isInGoal && !wasInGoal) {
                // Horse just entered goal area
                this.horsesInGoal.add(horse.number);
            } else if (!isInGoal && wasInGoal) {
                // Horse just left goal area
                this.horsesInGoal.delete(horse.number);

                if (!this.isGoalSet) {
                    // INITIAL START - just count crossings
                    this.horsesCrossedGoal.add(horse.number);

                    // Check if all 10 horses have crossed the start line
                    if (this.horsesCrossedGoal.size >= 10) {
                        this.isGoalSet = true;
                        console.log('🚦 Goal set! All horses have crossed the start line - race is ON!');
                        // Clear the set so we can track finish crossings
                        this.horsesCrossedGoal.clear();
                    }
                } else {
                    // FINISH LINE - record finish times (only if horse hasn't already finished)
                    if (!this.horsesCrossedGoal.has(horse.number)) {
                        this.horsesCrossedGoal.add(horse.number);

                        // Record finish time and position
                        const finishPosition = this.finishOrder.length + 1;
                        this.finishOrder.push({
                            horse: horse,
                            time: this.race_time,
                            position: finishPosition
                        });

                        console.log(`🏁 Position ${finishPosition}: Horse #${horse.number} - ${this.formatTime(this.race_time)}`);
                    }
                }
            }
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
            // Hide all avatars while loading
            for (const horse of this.horses) {
                if (horse.avatarElement) {
                    horse.avatarElement.style.display = 'none';
                }
            }
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

            // Draw starting gate (vertical line where horses start - 1500px right of center)
            const gateX = this.trackWidth / 2 + 1500;
            const gateTopY = this.top_sprint_top_fence.y + this.top_sprint_top_fence.height + 10;
            const gateBottomY = this.top_sprint_bottom_fence.y - 10;

            this.ctx.strokeStyle = 'lime';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([10, 10]);
            this.ctx.beginPath();
            this.ctx.moveTo(gateX, gateTopY);
            this.ctx.lineTo(gateX, gateBottomY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Draw label for starting gate
            this.ctx.fillStyle = 'lime';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.font = 'bold 18px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.strokeText('START', gateX, gateTopY - 10);
            this.ctx.fillText('START', gateX, gateTopY - 10);

            // Draw finish line (1500px left of center)
            const finishX = this.trackWidth / 2 - 1500;
            const finishTopY = this.top_sprint_top_fence.y + this.top_sprint_top_fence.height + 10;
            const finishBottomY = this.top_sprint_bottom_fence.y - 10;

            this.ctx.strokeStyle = 'red';
            this.ctx.lineWidth = 5;
            this.ctx.beginPath();
            this.ctx.moveTo(finishX, finishTopY);
            this.ctx.lineTo(finishX, finishBottomY);
            this.ctx.stroke();

            // Draw checkered pattern on finish line
            const checkerSize = 20;
            for (let y = finishTopY; y < finishBottomY; y += checkerSize) {
                const isEven = Math.floor((y - finishTopY) / checkerSize) % 2 === 0;
                this.ctx.fillStyle = isEven ? 'white' : 'black';
                this.ctx.fillRect(finishX - 3, y, 6, checkerSize);
            }

            // Draw label for finish line
            this.ctx.fillStyle = 'red';
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;
            this.ctx.font = 'bold 18px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.strokeText('FINISH', finishX, finishTopY - 10);
            this.ctx.fillText('FINISH', finishX, finishTopY - 10);

            // Draw goal collider rectangle
            this.ctx.fillStyle = this.isGoalSet ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 0, 0.3)';
            this.ctx.strokeStyle = this.isGoalSet ? 'lime' : 'yellow';
            this.ctx.lineWidth = 3;
            this.ctx.fillRect(this.goalCollider.x, this.goalCollider.y, this.goalCollider.width, this.goalCollider.height);
            this.ctx.strokeRect(this.goalCollider.x, this.goalCollider.y, this.goalCollider.width, this.goalCollider.height);

            // Draw goal status
            this.ctx.fillStyle = this.isGoalSet ? 'lime' : 'yellow';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            const statusText = `${this.horsesCrossedGoal.size}/10 crossed`;
            this.ctx.strokeText(statusText, finishX, finishBottomY + 25);
            this.ctx.fillText(statusText, finishX, finishBottomY + 25);

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
            // Draw repositioning aura (blue glow effect)
            if (horse.repositioning_active) {
                const auraX = horse.position.x;
                const auraY = horse.position.y;

                // Draw multiple circles with decreasing opacity for glow effect
                const time = performance.now() / 1000;
                const pulseSize = Math.sin(time * 3) * 5 + 30; // Pulsing between 25-35px

                // Outer glow (largest, faintest)
                this.ctx.beginPath();
                this.ctx.arc(auraX, auraY, pulseSize + 15, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0, 150, 255, 0.15)';
                this.ctx.fill();

                // Middle glow
                this.ctx.beginPath();
                this.ctx.arc(auraX, auraY, pulseSize + 8, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0, 180, 255, 0.25)';
                this.ctx.fill();

                // Inner glow (smallest, brightest)
                this.ctx.beginPath();
                this.ctx.arc(auraX, auraY, pulseSize, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0, 200, 255, 0.4)';
                this.ctx.fill();

                // Add sparkle ring effect
                this.ctx.strokeStyle = 'rgba(100, 220, 255, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(auraX, auraY, pulseSize + 3, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Draw horse sprite
            this.ctx.save();
            this.ctx.translate(horse.position.x, horse.position.y);

            // Use steer_angle for rotation (+ 180 to face forward)
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

            // Update avatar HTML element position
            if (horse.avatarElement) {
                // Convert world position to screen position
                const screenX = (markerX + 20) * zoom + cameraOffset.x;
                const screenY = markerY * zoom + cameraOffset.y;

                horse.avatarElement.style.left = `${screenX - 16}px`;
                horse.avatarElement.style.top = `${screenY - 16}px`;
                horse.avatarElement.style.display = 'block';
                horse.avatarElement.style.transform = `scale(${Math.min(zoom, 1.5)})`;
            }

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
                this.ctx.strokeStyle = 'lime';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([]);
                this.ctx.beginPath();
                this.ctx.moveTo(horse.position.x, horse.position.y);
                this.ctx.lineTo(horse.position.x + dir.x, horse.position.y + dir.y);
                this.ctx.stroke();

                // Arrowhead for direction
                this.ctx.fillStyle = 'lime';
                const arrowTip = new Vector2(
                    horse.position.x + dir.x,
                    horse.position.y + dir.y
                );
                this.ctx.beginPath();
                this.ctx.arc(arrowTip.x, arrowTip.y, 4, 0, Math.PI * 2);
                this.ctx.fill();

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

                // Draw vision rays - PURPLE THEME
                const visionOrigin = horse.position;
                for (const ray of horse.vision_rays) {
                    const rayAngle = horse.steer_angle + ray.angle;
                    const rayDir = horse.vector.rotate(rayAngle).normalize().multiply(ray.distance);
                    const rayEnd = visionOrigin.add(rayDir);

                    let color;
                    if (ray.distance < 30) {
                        color = 'rgba(255, 0, 255, 0.9)';  // Bright magenta - DANGER!
                    } else if (ray.distance < 60) {
                        color = 'rgba(200, 100, 255, 0.8)';  // Purple-pink - WARNING
                    } else {
                        color = 'rgba(150, 100, 255, 0.7)';  // Soft purple - CLEAR
                    }

                    this.ctx.strokeStyle = color;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(visionOrigin.x, visionOrigin.y);
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

                // Draw repositioning raycast candidates
                if (horse.repositioning_active && horse.repositioning_debug) {
                    const debug = horse.repositioning_debug;
                    const raycastDist = debug.raycastDistance;

                    const raycastOrigin = horse.position;

                    // Calculate animation progress (0 to 1) - animate over 0.3 seconds
                    const currentTime = performance.now() / 1000;
                    const elapsed = currentTime - debug.startTime;
                    const animDuration = 0.3;  // 300ms animation
                    let animProgress = Math.min(elapsed / animDuration, 1.0);

                    // Cubic ease-out: starts fast, ends slow
                    animProgress = 1 - Math.pow(1 - animProgress, 3);

                    // Draw all 5 candidate raycasts
                    for (const candidateAngle of debug.candidates) {
                        const testAngle = horse.steer_angle + candidateAngle;
                        const testDir = horse.vector.rotate(testAngle).normalize();
                        const fullEndPos = raycastOrigin.add(testDir.multiply(raycastDist));

                        // Animate the endpoint using easing
                        const animatedEndPos = new Vector2(
                            raycastOrigin.x + (fullEndPos.x - raycastOrigin.x) * animProgress,
                            raycastOrigin.y + (fullEndPos.y - raycastOrigin.y) * animProgress
                        );

                        // Check if this candidate is valid or invalid
                        const isValid = debug.validCandidates.includes(candidateAngle);
                        const isChosen = Math.abs(candidateAngle - debug.chosenAngle) < 0.1;

                        // Color coding: chosen = bright yellow, valid = green, invalid = red
                        let color;
                        let lineWidth;
                        if (isChosen) {
                            color = 'rgba(255, 255, 0, 0.8)';  // Bright yellow for chosen
                            lineWidth = 3;
                        } else if (isValid) {
                            color = 'rgba(0, 255, 100, 0.5)';  // Green for valid
                            lineWidth = 2;
                        } else {
                            color = 'rgba(255, 50, 50, 0.4)';  // Red for invalid
                            lineWidth = 1;
                        }

                        this.ctx.strokeStyle = color;
                        this.ctx.lineWidth = lineWidth;
                        this.ctx.setLineDash([5, 5]);
                        this.ctx.beginPath();
                        this.ctx.moveTo(raycastOrigin.x, raycastOrigin.y);
                        this.ctx.lineTo(animatedEndPos.x, animatedEndPos.y);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]);

                        // Draw endpoint circle (fade in with animation)
                        const circleAlpha = animProgress * 0.8;
                        this.ctx.globalAlpha = circleAlpha;
                        this.ctx.fillStyle = color;
                        this.ctx.beginPath();
                        this.ctx.arc(animatedEndPos.x, animatedEndPos.y, isChosen ? 8 : 5, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.globalAlpha = 1.0;
                    }

                    // Draw raycast distance info (fade in)
                    this.ctx.globalAlpha = animProgress;
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.fillRect(markerX - 60, markerY + 25, 120, 16);
                    this.ctx.fillStyle = 'yellow';
                    this.ctx.font = '10px monospace';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(`Raycast: ${Math.floor(raycastDist)}px`, markerX, markerY + 37);
                    this.ctx.globalAlpha = 1.0;
                }
            }
        }

        this.ctx.restore();
    }
}
