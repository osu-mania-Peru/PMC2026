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
        this.setupPreraceScreen();

        // Hide instructions initially (prerace screen has the button)
        document.getElementById('instructions').style.display = 'none';

        // Start loop
        this.gameLoop();

        // Expose globally
        window.game = this;

        console.log('Game initialized');
    }

    setupPreraceScreen() {
        const container = document.getElementById('preraceParticipants');
        const button = document.getElementById('preraceButton');

        if (!container || !button) return;

        // Enable horizontal scrolling with mouse wheel
        container.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        // Setup pre-race music
        this.preraceMusic = new Audio('assets/entry-table.mp3');
        this.preraceMusic.loop = true;
        this.preraceMusic.volume = 0.7;

        // Wait for horses to be loaded first, then wait for click to start
        const checkHorses = () => {
            if (this.race.horses.length > 0) {
                this.populatePreraceCards();
                // Wait for user click to start everything
                const loadingScreen = document.getElementById('loading');
                const startExperience = () => {
                    loadingScreen.style.opacity = '0';
                    loadingScreen.style.pointerEvents = 'none';
                    setTimeout(() => {
                        loadingScreen.classList.add('hidden');
                    }, 500);
                    this.preraceMusic.play().catch(e => console.log('Audio error:', e));
                    this.animatePreraceCards();
                    this.startBgSlideshow();
                    loadingScreen.removeEventListener('click', startExperience);
                };
                loadingScreen.addEventListener('click', startExperience);
            } else {
                setTimeout(checkHorses, 100);
            }
        };
        checkHorses();

        // Button click disabled for now
        // button.addEventListener('click', () => {
        //     // Stop pre-race music and slideshow
        //     this.preraceMusic.pause();
        //     this.preraceMusic.currentTime = 0;
        //     this.stopBgSlideshow();

        //     document.getElementById('preraceScreen').classList.add('hidden');
        //     this.startCountdown();
        // });
    }

    populatePreraceCards() {
        const container = document.getElementById('preraceParticipants');
        if (!container) return;

        // Horse colors for the card backgrounds
        const cardColors = [
            '#ffd700', // gold/yellow
            '#ffeb3b', // yellow
            '#2196f3', // blue
            '#4caf50', // green
            '#f44336', // red
            '#9c27b0', // purple
            '#ff9800', // orange
            '#795548', // brown
            '#607d8b', // blue-grey
            '#e91e63', // pink
            '#00bcd4', // cyan
            '#8bc34a', // light green
        ];

        container.innerHTML = this.race.horses.map((horse, i) => {
            const color = `rgb(${horse.color[0]}, ${horse.color[1]}, ${horse.color[2]})`;
            const cardColor = cardColors[i % cardColors.length];
            const name = horse.playerName || `Caballo ${horse.number}`;
            const hasAvatar = horse.avatarUrl;
            const avatarContent = hasAvatar
                ? `<img src="${horse.avatarUrl}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="fallback" style="display:none">${horse.number}</div>`
                : `<div class="fallback">${horse.number}</div>`;

            // Running styles
            const styles = ['Late', 'Pace', 'Front', 'End'];
            const style = styles[Math.floor(Math.random() * styles.length)];

            return `
                <div class="prerace-card">
                    <div class="prerace-card-color" style="background-color: ${cardColor}"></div>
                    <div class="prerace-card-content">
                        <div class="prerace-card-number" style="background: ${cardColor}">${horse.number}</div>
                        <div class="prerace-card-name">${name}</div>
                        <div class="prerace-card-info">
                            <div class="prerace-card-info-symbols">
                                <div class="symbol-triangle"></div>
                                <div class="symbol-circle"></div>
                                <div class="symbol-triangle"></div>
                            </div>
                            <div class="prerace-card-info-fav">No. ${horse.number} Fav</div>
                            <div class="prerace-card-info-style">${style}</div>
                        </div>
                        <div class="prerace-card-avatar">
                            ${avatarContent}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    startBgSlideshow() {
        const images = document.querySelectorAll('#preraceBgSlideshow img');
        if (images.length === 0) return;

        // Use CSS transition for smooth movement
        const angle = Math.random() * Math.PI * 2;
        const distance = 8;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;

        images.forEach(img => {
            img.style.transition = 'transform 60s linear, opacity 1.5s ease-in-out';
            img.style.transform = `translate(${targetX}%, ${targetY}%) scale(1.15)`;
        });

        // Cycle images
        let currentIndex = 0;
        this.bgSlideshowInterval = setInterval(() => {
            images[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % images.length;
            images[currentIndex].classList.add('active');
        }, 3000);
    }

    stopBgSlideshow() {
        if (this.bgSlideshowInterval) {
            clearInterval(this.bgSlideshowInterval);
            this.bgSlideshowInterval = null;
        }
    }

    animatePreraceCards() {
        const container = document.getElementById('preraceParticipants');
        const cards = container.querySelectorAll('.prerace-card');

        if (cards.length === 0) return;

        // Start scrolled to the right
        container.scrollLeft = container.scrollWidth;

        // Start card fade-ins
        setTimeout(() => {
            const reversedCards = Array.from(cards).reverse();
            const cardDelay = 120; // ms between each card

            // Show first 4 cards before scrolling
            for (let i = 0; i < Math.min(4, reversedCards.length); i++) {
                setTimeout(() => {
                    reversedCards[i]?.classList.add('animate-in');
                }, i * cardDelay);
            }

            // After 4 cards start appearing, begin scroll synced with remaining cards
            setTimeout(() => {
                const remainingCards = reversedCards.slice(4);
                const scrollDuration = remainingCards.length * cardDelay + 500;

                // First scroll to left
                this.smoothScrollTo(container, 0, scrollDuration);

                // Continue with remaining cards - fade dictates scroll pace
                remainingCards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('animate-in');
                    }, index * cardDelay);
                });

                // After scrolling to left, scroll to center card
                setTimeout(() => {
                    const centerIndex = Math.floor(cards.length / 2);
                    const centerCard = cards[centerIndex];
                    if (centerCard) {
                        const cardLeft = centerCard.offsetLeft;
                        const cardWidth = centerCard.offsetWidth;
                        const containerWidth = container.clientWidth;
                        const centerScroll = cardLeft - (containerWidth / 2) + (cardWidth / 2);
                        this.smoothScrollTo(container, centerScroll, 800);
                    }
                }, scrollDuration + 200);
            }, 4 * cardDelay);
        }, 600);
    }

    smoothScrollTo(element, target, duration) {
        const start = element.scrollLeft;
        const change = target - start;
        const startTime = performance.now();

        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const animateScroll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            element.scrollLeft = start + (change * easeOutCubic(progress));

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };

        requestAnimationFrame(animateScroll);
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

        // Show race UI elements
        document.getElementById('gameCanvas')?.classList.add('show');
        document.querySelector('.timer')?.classList.add('show');
        document.querySelector('.leaderboard')?.classList.add('show');
        document.querySelector('.speed-control')?.classList.add('show');
        document.querySelector('.race-banner')?.classList.add('show');

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
