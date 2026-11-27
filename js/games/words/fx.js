// Screen effects on one canvas over the play screen:
// the ink trail under the finger, cherry petals for a good word,
// gold sparks, and ink drips for a bad move.
// The loop only runs while something is moving.

export class Fx {
  constructor(host) {
    this.host = host;
    this.cv = document.createElement('canvas');
    this.cv.className = 'ws-fx';
    host.append(this.cv);
    this.ctx = this.cv.getContext('2d');
    this.parts = [];
    this.raf = 0;
    this.resize = this.resize.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(host);
    this.resize();
  }
  resize() {
    const r = this.host.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.ox = r.left;
    this.oy = r.top;
    this.cv.width = Math.round(r.width * this.dpr);
    this.cv.height = Math.round(r.height * this.dpr);
  }
  // Page coordinates in, canvas coordinates out.
  at(x, y) {
    const r = this.host.getBoundingClientRect();
    return [x - r.left, y - r.top];
  }
  add(p) {
    this.parts.push(p);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    }
  }
  trail(px, py, size, color) {
    const [x, y] = this.at(px, py);
    for (let i = 0; i < 1; i++)
      this.add({ k: 'dot', x: x + (Math.random() - 0.5) * size * 0.5, y: y + (Math.random() - 0.5) * size * 0.5, vx: 0, vy: 0, r: size * (0.28 + Math.random() * 0.2), life: 0.45, t: 0, color });
  }
  petals(px, py, n = 18, spread = 1) {
    const [x, y] = this.at(px, py);
    const cols = ['#f7b8c8', '#f4a3b8', '#fbd3dc', '#ffffff', '#f2c14e'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (120 + Math.random() * 260) * spread;
      this.add({
        k: 'petal', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160 * spread,
        r: 5 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 9,
        life: 1.4 + Math.random() * 0.8, t: 0, color: cols[i % cols.length], g: 260,
      });
    }
  }
  sparks(px, py, n = 10, color = '#f2c14e') {
    const [x, y] = this.at(px, py);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 180;
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1.5 + Math.random() * 2.5, life: 0.5 + Math.random() * 0.4, t: 0, color, g: 120 });
    }
  }
  ink(px, py, n = 6, color = '#2a1e17') {
    const [x, y] = this.at(px, py);
    for (let i = 0; i < n; i++)
      this.add({ k: 'drip', x: x + (Math.random() - 0.5) * 24, y, vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 60, r: 2 + Math.random() * 3.5, life: 0.9 + Math.random() * 0.5, t: 0, color, g: 700 });
  }
  tick(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    this.parts = this.parts.filter((p) => (p.t += dt) < p.life);
    for (const p of this.parts) {
      const k = 1 - p.t / p.life;
      if (p.g) p.vy += p.g * dt;
      if (p.k === 'petal') { p.vx *= 0.97; p.vy *= 0.97; p.rot += p.vr * dt; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      c.globalAlpha = Math.min(1, k * 1.6);
      c.fillStyle = p.color;
      if (p.k === 'petal') {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.beginPath();
        c.moveTo(0, -p.r);
        c.bezierCurveTo(p.r, -p.r, p.r * 0.9, p.r * 0.6, 0, p.r);
        c.bezierCurveTo(-p.r * 0.9, p.r * 0.6, -p.r, -p.r, 0, -p.r * 0.55);
        c.fill();
        c.restore();
      } else if (p.k === 'drip') {
        c.beginPath();
        c.ellipse(p.x, p.y, p.r, p.r * (1 + p.t * 2.5), 0, 0, Math.PI * 2);
        c.fill();
      } else {
        c.beginPath();
        c.arc(p.x, p.y, p.r * (p.k === 'dot' ? 0.6 + k * 0.4 : k), 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
    this.raf = this.parts.length ? requestAnimationFrame((t) => this.tick(t)) : 0;
    if (!this.raf) c.clearRect(0, 0, this.w, this.h);
  }
  // Floating text like "+4s" or "Streak ×3".
  float(px, py, text, cls = '') {
    const [x, y] = this.at(px, py);
    const d = document.createElement('div');
    d.className = `ws-float ${cls}`;
    d.textContent = text;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    this.host.append(d);
    setTimeout(() => d.remove(), 1400);
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.cv.remove();
  }
}
