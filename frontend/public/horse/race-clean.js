// Horse Racing Simulator - Clean Race Class
// Uses TrackGeometry for all boundaries, TrackGizmos for rendering

class Race {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Ensure geometry is initialized
    if (!TrackGeometry.initialized) {
      TrackGeometry.init();
    }

    // Track dimensions from geometry
    this.trackWidth = TrackGeometry.TRACK_WIDTH;
    this.trackHeight = TrackGeometry.TRACK_HEIGHT;

    // Load horse sprite
    this.horseImage = new Image();
    this.horseImage.src = "/horse/src/assets/horse.png";
    this.horseLoaded = false;
    this.horseImage.onload = () => {
      console.log("Horse sprite loaded");
      this.horseLoaded = true;
      this.spawnHorses();
    };
    this.horseImage.onerror = () => {
      console.warn("Horse sprite not found, using fallback shapes");
      this.horseLoaded = true;
      this.spawnHorses();
    };

    this.horses = [];
    this.race_time = 0.0;
    this.raceStarted = false;

    // Goal tracking
    this.finishOrder = [];
    this.horsesFinished = new Set();
    this.raceComplete = false;
  }

  spawnHorses() {
    const externalHorses = window.HORSE_DATA || [];
    const numHorses =
      externalHorses.length > 0 ? Math.min(externalHorses.length, 40) : 8;

    // Get spawn positions from geometry
    const spawns = TrackGeometry.getSpawnPositions(numHorses);

    for (let i = 0; i < numHorses; i++) {
      const spawn = spawns[i];
      const initPosition = new Vector2(spawn.x, spawn.y);

      // Color index
      const colorIndex = externalHorses[i]?.colorIndex ?? i % 8;
      const horseNumber = externalHorses[i]?.seed || i + 1;

      const horse = new Horse(
        initPosition,
        colorIndex,
        horseNumber,
        this.horseImage,
      );

      // Set initial direction (facing right for bottom straight)
      horse.steer_angle = spawn.angle;

      // Player data
      if (externalHorses[i]?.name) {
        horse.playerName = externalHorses[i].name;
        horse.playerId = externalHorses[i].id;
      }

      // Create avatar element
      if (externalHorses[i]?.avatarUrl) {
        horse.avatarUrl = externalHorses[i].avatarUrl;
        horse.avatarElement = document.createElement("img");
        horse.avatarElement.src = externalHorses[i].avatarUrl;
        horse.avatarElement.className = "horse-avatar";
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

    console.log(`Spawned ${this.horses.length} horses`);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }

  startRace() {
    for (const horse of this.horses) {
      horse.startRunning();
    }
    this.race_time = 0.0;
    this.raceStarted = true;
    console.log("Race started!");
  }

  update(dt) {
    if (!this.horseLoaded) return;

    if (this.horses.some((h) => h.is_running)) {
      this.race_time += dt;
    }

    // Update awareness for all horses
    for (const horse of this.horses) {
      horse.updateAwareness(this.horses);
    }

    // Update each horse
    for (const horse of this.horses) {
      horse.update(dt, this.horses);
    }

    // Check finish line crossings
    this.checkFinishLine();
  }

  checkFinishLine() {
    if (!this.raceStarted) return;

    const finishX = TrackGeometry.FINISH_LINE_X;
    const tolerance = 30;

    for (const horse of this.horses) {
      if (this.horsesFinished.has(horse.number)) continue;

      // Check if horse is near finish line and moving left (crossing it)
      const nearFinish = Math.abs(horse.position.x - finishX) < tolerance;
      const movingLeft = horse.getVecRotated().x < 0;
      const inBottomStraight = horse.position.y > TrackGeometry.CENTER_Y;

      // Must have completed at least most of a lap
      const distance = TrackGeometry.getTrackDistance(
        horse.position.x,
        horse.position.y,
      );
      const lapProgress = distance / TrackGeometry.getTotalTrackLength();

      if (nearFinish && !inBottomStraight && lapProgress > 0.8) {
        this.horsesFinished.add(horse.number);
        const position = this.finishOrder.length + 1;
        this.finishOrder.push({
          horse: horse,
          time: this.race_time,
          position: position,
        });
        console.log(
          `🏁 #${position}: Horse ${horse.number} (${horse.playerName || "CPU"}) - ${this.formatTime(this.race_time)}`,
        );

        if (this.finishOrder.length >= this.horses.length) {
          this.raceComplete = true;
          console.log("Race complete!");
        }
      }
    }
  }

  render(cameraOffset = new Vector2(0, 0), zoom = 1.0) {
    if (!this.horseLoaded) {
      this.ctx.fillStyle = "#4a7c4e";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = "white";
      this.ctx.font = "24px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "Loading...",
        this.canvas.width / 2,
        this.canvas.height / 2,
      );
      return;
    }

    // Clear canvas
    this.ctx.fillStyle = "#4a7c4e";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transform
    this.ctx.save();
    this.ctx.translate(cameraOffset.x, cameraOffset.y);
    this.ctx.scale(zoom, zoom);

    // Draw track using gizmos
    TrackGizmos.render(this.ctx, true, true, true);

    // Draw horses
    this.renderHorses(cameraOffset, zoom);

    this.ctx.restore();
  }

  renderHorses(cameraOffset, zoom) {
    for (const horse of this.horses) {
      // Draw horse sprite
      this.ctx.save();
      this.ctx.translate(horse.position.x, horse.position.y);
      // Sprite faces UP by default, add 90° to face RIGHT when steer_angle=0
      this.ctx.rotate(((horse.steer_angle - 90) * Math.PI) / 180);

      if (horse.tintedImage) {
        const scale = 0.02 * HORSE_SPRITE_SCALE;
        const w = horse.tintedImage.width * scale;
        const h = horse.tintedImage.height * scale;
        this.ctx.drawImage(horse.tintedImage, -w / 2, -h / 2, w, h);
      } else {
        // Fallback shape
        const color = `rgb(${horse.color[0]}, ${horse.color[1]}, ${horse.color[2]})`;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();

      // Draw number badge above horse
      const badgeX = horse.position.x;
      const badgeY = horse.position.y - 25;

      // Badge background
      this.ctx.fillStyle = `rgb(${horse.color[0]}, ${horse.color[1]}, ${horse.color[2]})`;
      this.ctx.beginPath();
      this.ctx.arc(badgeX, badgeY, 14, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Badge number
      this.ctx.fillStyle = "black";
      this.ctx.font = "bold 14px monospace";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(horse.number.toString(), badgeX, badgeY);

      // Update avatar HTML element position (only show after race starts)
      if (horse.avatarElement) {
        if (this.raceStarted) {
          const screenX = badgeX * zoom + cameraOffset.x + 22;
          const screenY = badgeY * zoom + cameraOffset.y;

          horse.avatarElement.style.left = `${screenX - 16}px`;
          horse.avatarElement.style.top = `${screenY - 16}px`;
          horse.avatarElement.style.display = "block";

          const avatarScale = Math.max(0.5, Math.min(zoom, 1.5));
          horse.avatarElement.style.transform = `scale(${avatarScale})`;
          horse.avatarElement.style.transformOrigin = "center center";
        } else {
          horse.avatarElement.style.display = "none";
        }
      }
    }
  }

  // Get horses sorted by race position (for leaderboard)
  getHorsesByPosition() {
    return [...this.horses].sort((a, b) => {
      const distA = TrackGeometry.getTrackDistance(
        a.position.x,
        a.position.y,
        a.lap || 0,
      );
      const distB = TrackGeometry.getTrackDistance(
        b.position.x,
        b.position.y,
        b.lap || 0,
      );
      return distB - distA; // Higher distance = further ahead
    });
  }
}

// Expose globally
window.Race = Race;
