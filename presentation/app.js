/**
 * VanRakshak-X — Premium Presentation Engine
 * Particle canvas, smooth transitions, keyboard nav.
 */

// ── Particle System ──
class ParticleField {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.spawn();
        this.loop();
    }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    spawn() {
        const count = Math.floor((this.canvas.width * this.canvas.height) / 18000);
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                r: Math.random() * 1.5 + 0.3,
                dx: (Math.random() - 0.5) * 0.15,
                dy: (Math.random() - 0.5) * 0.15,
                o: Math.random() * 0.4 + 0.1,
            });
        }
    }
    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const p of this.particles) {
            p.x += p.dx; p.y += p.dy;
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(52, 211, 153, ${p.o})`;
            this.ctx.fill();
        }
        requestAnimationFrame(() => this.loop());
    }
}

// ── Presentation Engine ──
class Deck {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.total = this.slides.length;
        this.current = 0;
        this.counter = document.getElementById('counter');
        this.progress = document.getElementById('progress');

        document.getElementById('next-btn').addEventListener('click', () => this.next());
        document.getElementById('prev-btn').addEventListener('click', () => this.prev());

        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') { e.preventDefault(); this.next(); }
            else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this.prev(); }
        });

        this.update();
    }

    next() { if (this.current < this.total - 1) this.go(this.current + 1); }
    prev() { if (this.current > 0) this.go(this.current - 1); }

    go(i) {
        this.slides[this.current].classList.remove('active');
        this.current = i;
        this.slides[this.current].classList.add('active');
        this.update();
    }

    update() {
        const cur = String(this.current + 1).padStart(2, '0');
        const tot = String(this.total).padStart(2, '0');
        this.counter.textContent = `${cur} / ${tot}`;
        this.progress.style.width = `${((this.current + 1) / this.total) * 100}%`;
    }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    new ParticleField(document.getElementById('particle-canvas'));
    new Deck();
});
