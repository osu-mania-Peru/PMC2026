// Horse Racing - Game Loop
// Clean, simple game management with Umamusume-style UI

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Sizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Create race
        this.race = new Race(this.canvas);

        // Camera
        this.cameraOffset = new Vector2(0, 0);
        this.cameraZoom = 0.5;
        this.targetZoom = 0.5;

        // Time control
        this.timeScale = 1.0;
        this.paused = false;
        this.lastTime = performance.now();

        // UI state
        this.countdownActive = false;
        this.raceFinishShown = false;

        // Setup controls
        this.setupControls();
        this.setupSpeedButtons();

        // Start loop
        this.gameLoop();

        // Expose globally
        window.game = this;

        console.log('Game initialized');
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupSpeedButtons() {
        const speedControl = document.getElementById('speedControl');
        if (!speedControl) return;

        const buttons = speedControl.querySelectorAll('.speed-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);
                this.timeScale = speed;
                this.updateSpeedButtons();
            });
        });
    }

    updateSpeedButtons() {
        const buttons = document.querySelectorAll('.speed-btn');
        buttons.forEach(btn => {
            const speed = parseFloat(btn.dataset.speed);
            btn.classList.toggle('active', speed === this.timeScale);
        });
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (!this.race.raceStarted && !this.countdownActive) {
                        this.startCountdown();
                    }
                    break;

                case 'Digit1': this.timeScale = 0.25; this.updateSpeedButtons(); break;
                case 'Digit2': this.timeScale = 0.5; this.updateSpeedButtons(); break;
                case 'Digit3': this.timeScale = 1.0; this.updateSpeedButtons(); break;
                case 'Digit4': this.timeScale = 2.0; this.updateSpeedButtons(); break;
                case 'Digit5': this.timeScale = 4.0; this.updateSpeedButtons(); break;

                case 'KeyP':
                    this.paused = !this.paused;
                    console.log(this.paused ? 'Paused' : 'Resumed');
                    break;

                case 'Equal':
                case 'NumpadAdd':
                    this.targetZoom = Math.min(2.0, this.targetZoom + 0.1);
                    break;

                case 'Minus':
                case 'NumpadSubtract':
                    this.targetZoom = Math.max(0.2, this.targetZoom - 0.1);
                    break;
            }
        });
    }

    startCountdown() {
        this.countdownActive = true;
        document.getElementById('instructions').style.display = 'none';

        const countdownEl = document.getElementById('raceCountdown');
        const startTextEl = document.getElementById('raceStartText');

        let count = 3;

        const showCount = () => {
            if (count > 0) {
                countdownEl.textContent = count;
                countdownEl.classList.add('show');
                countdownEl.style.animation = 'none';
                countdownEl.offsetHeight; // Trigger reflow
                countdownEl.style.animation = 'countdown-pop 0.5s ease-out';

                count--;
                setTimeout(showCount, 1000);
            } else {
                countdownEl.classList.remove('show');
                startTextEl.classList.add('show');

                // Start the race
                this.race.startRace();

                // Show progress bar
                const progressBar = document.getElementById('raceProgress');
                if (progressBar) progressBar.classList.add('show');

                // Hide start text after animation
                setTimeout(() => {
                    startTextEl.classList.remove('show');
                    this.countdownActive = false;
                }, 1000);
            }
        };

        showCount();
    }

    updateCamera() {
        // Smooth zoom
        this.cameraZoom += (this.targetZoom - this.cameraZoom) * 0.05;

        // Center camera on horses
        if (this.race.horses.length > 0) {
            let sumX = 0, sumY = 0;
            for (const horse of this.race.horses) {
                sumX += horse.position.x;
                sumY += horse.position.y;
            }
            const centerX = sumX / this.race.horses.length;
            const centerY = sumY / this.race.horses.length;

            const targetOffsetX = this.canvas.width / 2 - centerX * this.cameraZoom;
            const targetOffsetY = this.canvas.height / 2 - centerY * this.cameraZoom;

            this.cameraOffset.x += (targetOffsetX - this.cameraOffset.x) * 0.05;
            this.cameraOffset.y += (targetOffsetY - this.cameraOffset.y) * 0.05;
        }
    }

    updateUI() {
        // Timer
        const time = this.race.race_time;
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 100);
        document.getElementById('timer').textContent =
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

        // Leaderboard
        const entries = document.getElementById('leaderboardEntries');
        const sorted = this.race.getHorsesByPosition();

        entries.innerHTML = sorted.map((horse, i) => {
            const color = `rgb(${horse.color[0]}, ${horse.color[1]}, ${horse.color[2]})`;
            const name = horse.playerName || `Caballo ${horse.number}`;
            const topClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
            return `
                <div class="leaderboard-entry ${topClass}">
                    <span class="pos">${i + 1}</span>
                    <span class="badge" style="background: ${color}">${horse.number}</span>
                    <span class="name">${name}</span>
                </div>
            `;
        }).join('');

        // Progress Bar
        this.updateProgressBar(sorted);

        // Check for race finish
        if (this.race.raceComplete && !this.raceFinishShown) {
            this.showFinishOverlay();
        }
    }

    updateProgressBar(sorted) {
        const markers = document.getElementById('raceProgressMarkers');
        if (!markers) return;

        const totalLength = TrackGeometry.getTotalTrackLength();

        // Reverse so leaders render on top (last in DOM = highest z-index)
        const reversed = [...sorted].reverse();

        markers.innerHTML = reversed.map((horse, i) => {
            const color = `rgb(${horse.color[0]}, ${horse.color[1]}, ${horse.color[2]})`;
            const distance = TrackGeometry.getTrackDistance(horse.position.x, horse.position.y);
            // Progress goes from right (START/0%) to left (FINISH/100%)
            const progress = Math.min(1, Math.max(0, distance / totalLength));
            // Convert to percentage: 100% = at finish (left), 0% = at start (right)
            const leftPercent = (1 - progress) * 100;

            const hasAvatar = horse.avatarUrl;
            const avatarContent = hasAvatar
                ? `<img src="${horse.avatarUrl}" alt="${horse.number}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="fallback" style="display:none">${horse.number}</span>`
                : `<span class="fallback">${horse.number}</span>`;

            return `
                <div class="race-progress-horse" style="left: ${leftPercent}%; z-index: ${i + 1};">
                    <div class="bubble" style="background: ${color}; color: ${color};">
                        ${avatarContent}
                    </div>
                    <div class="number">${horse.number}</div>
                </div>
            `;
        }).join('');
    }

    showFinishOverlay() {
        this.raceFinishShown = true;

        const overlay = document.getElementById('finishOverlay');
        const results = document.getElementById('finishResults');

        // Build results HTML
        const finishData = this.race.finishOrder.slice(0, 5); // Top 5

        results.innerHTML = finishData.map((entry, i) => {
            const placeClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const name = entry.horse.playerName || `Horse ${entry.horse.number}`;
            const time = this.formatTime(entry.time);

            return `
                <div class="finish-result-row">
                    <div class="finish-place ${placeClass}">${entry.position}</div>
                    <div class="finish-name">${name}</div>
                    <div class="finish-time">${time}</div>
                </div>
            `;
        }).join('');

        // Show overlay with slight delay for dramatic effect
        setTimeout(() => {
            overlay.classList.add('show');
        }, 500);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    gameLoop() {
        const now = performance.now();
        const rawDt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        if (!this.paused) {
            const dt = rawDt * this.timeScale;
            this.race.update(dt);
        }

        this.updateCamera();
        this.race.render(this.cameraOffset, this.cameraZoom);
        this.updateUI();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start game when script loads
console.log('Starting game...');
new Game();
