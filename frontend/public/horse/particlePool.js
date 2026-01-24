// Horse Racing Simulator - Particle Pool for Dirt Effects

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
