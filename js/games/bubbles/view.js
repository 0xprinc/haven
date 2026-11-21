// Canopy Pop — drawing, animation and touch for one level.

import * as E from './engine.js';
import { BUBBLES, makeSprites, paintJungle, drawBird, PAD, shade } from './art.js';
import { bestShot } from './bot.js';
import { sfx as realSfx } from '../../sound.js';

// The home screen preview plays silently.
const quiet = new Proxy({}, { get: () => () => {} });

const SPEED = 44; // shot speed, radii per second
const MIN_A = (9 * Math.PI) / 180;
const MAX_A = Math.PI - MIN_A;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export class Canopy {
  constructor(wrap, level, opts = {}) {
    this.wrap = wrap;
    this.level = level;
    this.opts = opts;
    this.demo = !!opts.demo;
    this.sfx = this.demo ? quiet : realSfx;
    this.st = opts.saved ? E.restore(level, opts.saved) : E.makeState(level);
    E.refreshQueue(this.st);
    this.scroll = E.scrollRows(this.st.cells);
    this.jiggle = new Map();
    this.pops = [];
    this.falls = [];
    this.birdsFlying = [];
    this.parts = [];
    this.texts = [];
    this.flight = null;
    this.aim = null;
    this.busy = false;
    this.locked = false;
    this.done = false;
    this.dead = false;
    this.swapAnim = 0;
    this.recoil = 0;
    this.combo = 0;
    this.motes = Array.from({ length: 16 }, (_, i) => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28, s: 0.6 + Math.random() * 0.8, i }));
    this.intro = opts.noIntro ? 1 : 0;
    this.t0 = performance.now();

    this.bg = document.createElement('canvas');
    this.canvas = document.createElement('canvas');
    for (const c of [this.bg, this.canvas]) {
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      wrap.append(c);
    }
    this.canvas.style.touchAction = 'none';
    this.ctx = this.canvas.getContext('2d');
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(wrap);
    this.resize();
    if (!this.demo) this.bindInput();
    this.onVis = () => document.visibilityState === 'visible' && this.loop();
    document.addEventListener('visibilitychange', this.onVis);
    this.loop();
  }

  /* ---------- Layout ---------- */

  resize() {
    const r = this.wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.cw = r.width;
    this.ch = r.height;
    for (const c of [this.bg, this.canvas]) {
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
    }
    const s = Math.min(r.width / (E.FIELD_W + 0.8), r.height / E.FIELD_H);
    this.s = s;
    this.fx = (r.width - E.FIELD_W * s) / 2;
    this.fy = (r.height - E.FIELD_H * s) / 2;
    this.sprites = makeSprites(s * dpr);
    this.paintBg();
    this.makeBranch();
  }

  paintBg() {
    const ctx = this.bg.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.dark = document.documentElement.dataset.mode === 'dark';
    paintJungle(ctx, this.cw, this.ch, this.dark, this.fx, E.FIELD_W * this.s);
  }

  themeChanged() {
    this.paintBg();
    this.makeBranch();
  }

  makeBranch() {
    // the branch all bubbles hang from
    const w = this.cw * this.dpr, h = this.s * 2.2 * this.dpr;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h);
    const ctx = c.getContext('2d');
    const y = h * 0.42;
    const g = ctx.createLinearGradient(0, y - h * 0.2, 0, y + h * 0.2);
    g.addColorStop(0, this.dark ? '#5a4128' : '#9a6b3c');
    g.addColorStop(0.5, this.dark ? '#3d2b1a' : '#6e4a28');
    g.addColorStop(1, this.dark ? '#24190e' : '#4a2f18');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, y - h * 0.16);
    for (let x = 0; x <= w; x += w / 12) ctx.lineTo(x, y - h * 0.16 + Math.sin(x * 0.01) * h * 0.04);
    for (let x = w; x >= 0; x -= w / 12) ctx.lineTo(x, y + h * 0.16 + Math.sin(x * 0.013) * h * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(1, h * 0.02);
    for (let x = 20; x < w; x += h * 1.7) {
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.08);
      ctx.quadraticCurveTo(x + h * 0.3, y, x + h * 0.6, y - h * 0.05);
      ctx.stroke();
    }
    // a few leaves on the branch
    for (let x = h * 0.6; x < w; x += h * 2.3) {
      ctx.save();
      ctx.translate(x, y - h * 0.12);
      ctx.rotate(-0.9 + (x % 3) * 0.5);
      ctx.fillStyle = this.dark ? '#1d5a3c' : '#3f9a4c';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.25, h * 0.1, h * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.branch = c;
  }

  // grid units -> screen px
  X(gx) { return this.fx + gx * this.s; }
  Y(gy) { return this.fy + (gy - this.scroll * E.ROW_H) * this.s; }
  shooterScreen() { return [this.X(E.FIELD_W / 2), this.fy + (E.FIELD_H - 2.2) * this.s]; }
  nextScreen() { const [x, y] = this.shooterScreen(); return [x - 3.6 * this.s, y + 0.7 * this.s]; }

  /* ---------- Input ---------- */

  bindInput() {
    const c = this.canvas;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const angleAt = (x, y) => {
      const [sx, sy] = this.shooterScreen();
      if (y > sy - this.s * 0.6) return null;
      return clamp(Math.atan2(sy - y, x - sx), MIN_A, MAX_A);
    };
    c.addEventListener('pointerdown', (e) => {
      if (this.locked || this.done) return;
      const [x, y] = pos(e);
      const [sx, sy] = this.shooterScreen();
      const [nx, ny] = this.nextScreen();
      if (Math.hypot(x - nx, y - ny) < this.s * 1.6 || Math.hypot(x - sx, y - sy) < this.s * 1.5) {
        this.swap();
        return;
      }
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
      const a = angleAt(x, y);
      this.aim = { id: e.pointerId, angle: a };
      this.updateGuide();
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.aim || this.aim.id !== e.pointerId) return;
      const [x, y] = pos(e);
      this.aim.angle = angleAt(x, y);
      this.updateGuide();
    });
    const up = (e) => {
      if (!this.aim || this.aim.id !== e.pointerId) return;
      const a = this.aim.angle;
      this.aim = null;
      this.guide = null;
      if (a != null && e.type === 'pointerup') this.fire(a);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  }

  updateGuide() {
    if (!this.aim || this.aim.angle == null || this.busy) { this.guide = null; return; }
    const sp = E.shooterPos(this.st.cells);
    const t = E.trace(this.st.cells, sp[0], sp[1], this.aim.angle);
    this.guide = t;
  }

  swap() {
    if (this.busy || this.st.queue.length < 2) return;
    const q = this.st.queue;
    [q[0], q[1]] = [q[1], q[0]];
    this.swapAnim = 1;
    this.sfx.tap();
    this.opts.onSave && this.opts.onSave(E.serialize(this.st));
  }

  /* ---------- Shooting ---------- */

  fire(angle) {
    if (this.busy || this.done || this.st.shots <= 0) return;
    const sp = E.shooterPos(this.st.cells);
    const t = E.trace(this.st.cells, sp[0], sp[1], angle);
    if (t.cell < 0) return;
    this.busy = true;
    const color = this.st.queue[0];
    // build the flight path with distances
    const pts = t.path.slice();
    pts[pts.length - 1] = E.center(t.cell);
    const segs = [];
    let total = 0;
    for (let k = 1; k < pts.length; k++) {
      const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      segs.push(d);
      total += d;
    }
    this.flight = { pts, segs, total, d: 0, color, cell: t.cell, angle, trail: [] };
    this.recoil = 1;
    this.sfx.shoot && this.sfx.shoot();
  }

  land() {
    const f = this.flight;
    this.flight = null;
    const st = this.st;
    const color = st.queue[0];
    const before = st.cells.slice();
    const res = E.place(st, f.cell, color);
    st.shots--;
    st.queue.shift();
    E.refreshQueue(st);
    const now = performance.now();
    const [cx, cy] = E.center(f.cell);

    // nudge nearby bubbles
    for (let i = 0; i < st.cells.length; i++) {
      if (st.cells[i] === E.EMPTY && i !== f.cell) continue;
      const [x, y] = E.center(i);
      const d = Math.hypot(x - cx, y - cy);
      if (d > 0.1 && d < 6.5) {
        const k = 0.32 * (1 - d / 6.5);
        this.jiggle.set(i, { x: ((x - cx) / d) * k, y: ((y - cy) / d) * k, vx: 0, vy: 0 });
      }
    }
    // the landing bubble squashes in
    this.jiggle.set(f.cell, { x: Math.cos(f.angle) * 0.25, y: -Math.sin(f.angle) * 0.25, vx: 0, vy: 0 });

    if (!res.popped.length) {
      this.sfx.stick && this.sfx.stick();
      this.combo = 0;
    }
    res.popped.forEach((i, k) => {
      const [x, y] = E.center(i);
      this.pops.push({ x, y, color: res.color, bird: res.freed.includes(i), t: now + k * 42, k });
    });
    const dropDelay = res.popped.length * 42 + 80;
    res.dropped.forEach((i) => {
      const [x, y] = E.center(i);
      this.falls.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: -2 - Math.random() * 3,
        rot: 0,
        vr: (Math.random() - 0.5) * 8,
        cell: i,
        v: before[i],
        bird: res.freed.includes(i),
        t: now + dropDelay + Math.random() * 120,
      });
    });
    const total = res.popped.length + res.dropped.length;
    if (total >= 6) {
      const words = total >= 18 ? 'Jungle fever!' : total >= 12 ? 'Amazing!' : total >= 8 ? 'Great!' : 'Nice!';
      this.texts.push({ x: cx, y: cy, text: words, t: now + 120, big: true });
    }
    this.lastResult = res;
    this.settleAt = now + dropDelay + (res.dropped.length ? 700 : 260) + res.freed.length * 60;
    this.opts.onSave && this.opts.onSave(E.serialize(st));
    this.opts.onUpdate && this.opts.onUpdate(this.info());
  }

  info() {
    return {
      shots: this.st.shots,
      birdsLeft: this.st.birds.size,
      birdsTotal: this.st.birdsTotal,
      bubblesLeft: E.bubblesLeft(this.st.cells),
      goal: this.st.goal,
    };
  }

  settle() {
    this.busy = false;
    this.updateGuide();
    if (E.isWon(this.st)) {
      this.done = true;
      this.celebrate();
      setTimeout(() => this.opts.onWin && this.opts.onWin(this.info()), 1100);
    } else if (this.st.shots <= 0) {
      this.done = true;
      setTimeout(() => this.opts.onLose && this.opts.onLose(this.info()), 400);
    }
  }

  /* ---------- Lifelines ---------- */

  loadRainbow() {
    if (this.busy || this.done) return false;
    this.st.queue.unshift(E.RAINBOW);
    this.swapAnim = 1;
    this.opts.onSave && this.opts.onSave(E.serialize(this.st));
    return true;
  }

  addShots(k) {
    this.st.shots += k;
    this.done = false;
    this.locked = false;
    this.opts.onSave && this.opts.onSave(E.serialize(this.st));
    this.opts.onUpdate && this.opts.onUpdate(this.info());
  }

  celebrate() {
    const now = performance.now();
    for (let k = 0; k < 90; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const sp = 10 + Math.random() * 18;
      this.parts.push({
        kind: 'leaf', x: E.FIELD_W / 2, y: this.scroll * E.ROW_H + E.FIELD_H - 4,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 16, life: 2 + Math.random(), max: 3,
        r: 0.35 + Math.random() * 0.3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
        col: k % 5 === 0 ? '#ffd765' : BUBBLES[k % BUBBLES.length].base, t: now,
      });
    }
    this.sfx.win();
  }

  /* ---------- Demo mode (home screen) ---------- */

  demoTick(now) {
    if (this.busy || this.flight) return;
    if (this.done || this.st.shots <= 0 || E.isWon(this.st)) {
      if (!this.resetAt) this.resetAt = now + 1800;
      if (now > this.resetAt) {
        this.resetAt = 0;
        this.st = E.makeState(this.level);
        this.st.shots = 99;
        E.refreshQueue(this.st);
        this.done = false;
        this.scroll = E.scrollRows(this.st.cells);
      }
      return;
    }
    if (!this.demoPlan) {
      const b = bestShot(this.st);
      if (!b || b.score === -Infinity) { this.done = true; return; }
      if (b.swap) this.st.queue.reverse();
      this.demoPlan = { angle: b.angle, at: now, from: this.demoAngle ?? Math.PI / 2 };
    }
    const t = clamp((now - this.demoPlan.at) / 700, 0, 1);
    this.demoAngle = this.demoPlan.from + (this.demoPlan.angle - this.demoPlan.from) * easeOut(t);
    this.aim = { angle: this.demoAngle };
    this.updateGuide();
    if (t >= 1 && now - this.demoPlan.at > 1000) {
      const a = this.demoPlan.angle;
      this.demoPlan = null;
      this.aim = null;
      this.guide = null;
      this.fire(a);
    }
  }

  /* ---------- Loop ---------- */

  loop() {
    if (this.running || this.dead) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now) => {
      if (this.dead) return;
      if (document.visibilityState !== 'visible') { this.running = false; return; }
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.step(now, dt);
      this.draw(now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  step(now, dt) {
    if (this.intro < 1) this.intro = clamp((now - this.t0) / 900, 0, 1);
    if (this.demo) this.demoTick(now);

    // flight
    const f = this.flight;
    if (f) {
      f.d += SPEED * dt;
      if (f.d >= f.total) this.land();
      else {
        const p = this.pointAt(f, f.d);
        f.trail.push({ x: p[0], y: p[1], t: now });
        if (f.trail.length > 10) f.trail.shift();
      }
    }

    // springs
    for (const [i, j] of this.jiggle) {
      j.vx += (-160 * j.x - 11 * j.vx) * dt;
      j.vy += (-160 * j.y - 11 * j.vy) * dt;
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      if (Math.abs(j.x) + Math.abs(j.y) + Math.abs(j.vx) + Math.abs(j.vy) < 0.004) this.jiggle.delete(i);
    }

    // pops become droplets
    for (const p of this.pops) {
      if (!p.burst && now >= p.t + 110) {
        p.burst = true;
        const col = p.color >= 0 && p.color < 6 ? BUBBLES[p.color].base : '#ffffff';
        for (let k = 0; k < 9; k++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 4 + Math.random() * 7;
          this.parts.push({ kind: 'drop', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 22, life: 0.5 + Math.random() * 0.3, max: 0.8, r: 0.12 + Math.random() * 0.14, col });
        }
        this.parts.push({ kind: 'ring', x: p.x, y: p.y, life: 0.35, max: 0.35, col });
        this.sfx.pop ? this.sfx.pop(p.k) : this.sfx.slide(p.k);
        if (p.bird) this.freeBird(p.x, p.y);
      }
    }
    this.pops = this.pops.filter((p) => now < p.t + 160);

    // falling bubbles
    const floor = this.scroll * E.ROW_H + E.FIELD_H + 2;
    for (const b of this.falls) {
      if (now < b.t) continue;
      if (b.bird && !b.freed) { b.freed = true; this.freeBird(b.x, b.y); }
      b.vy += 60 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      if (b.x < 1 || b.x > E.FIELD_W - 1) b.vx *= -0.6;
    }
    const before = this.falls.length;
    this.falls = this.falls.filter((b) => b.y < floor);
    if (this.falls.length < before) this.sfx.drop && this.sfx.drop();

    // birds fly away
    for (const b of this.birdsFlying) {
      b.age += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy -= 4 * dt;
      b.flap = Math.sin(b.age * 26);
    }
    this.birdsFlying = this.birdsFlying.filter((b) => b.age < 3);

    // particles
    for (const p of this.parts) {
      p.life -= dt;
      if (p.kind === 'ring') continue;
      p.vy += (p.g || 0) * dt;
      p.vx *= 1 - 1.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    this.texts = this.texts.filter((t) => now < t.t + 1100);

    // scroll the board as it shrinks or grows
    const target = E.scrollRows(this.st.cells);
    this.scroll += (target - this.scroll) * Math.min(1, dt * 6);
    if (Math.abs(target - this.scroll) < 0.002) this.scroll = target;

    this.swapAnim = Math.max(0, this.swapAnim - dt * 4);
    this.recoil = Math.max(0, this.recoil - dt * 5);

    if (this.busy && !this.flight && this.settleAt && now > this.settleAt && !this.pops.length && !this.falls.length) {
      this.settleAt = 0;
      this.settle();
    }
  }

  freeBird(x, y) {
    const dir = x < E.FIELD_W / 2 ? -1 : 1;
    this.birdsFlying.push({ x, y, vx: dir * (5 + Math.random() * 3), vy: -9 - Math.random() * 3, age: 0, flap: 0, dir });
    this.sfx.chirp && this.sfx.chirp();
    this.texts.push({ x, y: y - 1.2, text: 'Free!', t: performance.now() });
  }

  pointAt(f, d) {
    let acc = 0;
    for (let k = 0; k < f.segs.length; k++) {
      if (acc + f.segs[k] >= d) {
        const t = (d - acc) / f.segs[k];
        const a = f.pts[k], b = f.pts[k + 1];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
      acc += f.segs[k];
    }
    return f.pts[f.pts.length - 1];
  }

  /* ---------- Drawing ---------- */

  sprite(v) {
    const S = this.sprites;
    if (v === E.STONE) return S.stone;
    if (v === E.RAINBOW) return S.rainbow;
    return S.color[v] || S.color[0];
  }

  drawBubble(v, gx, gy, scale = 1, bird = false, alpha = 1) {
    const ctx = this.ctx;
    const S = this.sprites;
    const size = (S.size / this.dpr) * scale;
    const x = this.X(gx), y = this.Y(gy);
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.sprite(v), x - size / 2, y - size / 2, size, size);
    if (bird) {
      ctx.drawImage(S.bird, x - size / 2, y - size / 2, size, size);
      ctx.drawImage(S.sheen, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  draw(now) {
    const ctx = this.ctx;
    const dpr = this.dpr, s = this.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // light rays (day) drifting slowly
    if (!this.dark) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const a = 0.035 + 0.025 * Math.sin(now / 2400 + k * 1.7);
        const x0 = this.cw * (0.5 + k * 0.17);
        const g = ctx.createLinearGradient(x0, 0, x0 - this.cw * 0.4, this.ch);
        g.addColorStop(0, `rgba(255,250,220,${a})`);
        g.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + this.cw * 0.06, 0);
        ctx.lineTo(x0 - this.cw * 0.3, this.ch);
        ctx.lineTo(x0 - this.cw * 0.45, this.ch);
        ctx.fill();
      }
      ctx.restore();
    }

    // field tint so bubbles stand out from the leaves
    const fw = E.FIELD_W * s;
    const tint = ctx.createLinearGradient(0, this.fy, 0, this.fy + E.FIELD_H * s);
    tint.addColorStop(0, this.dark ? 'rgba(0,10,8,0.28)' : 'rgba(255,255,240,0.16)');
    tint.addColorStop(1, this.dark ? 'rgba(0,10,8,0.05)' : 'rgba(255,255,240,0.02)');
    ctx.fillStyle = tint;
    ctx.fillRect(this.fx, 0, fw, this.ch);

    // branch at the top of the grid
    const by = this.Y(0) - s * 1.1;
    if (by > -s * 3) ctx.drawImage(this.branch, 0, by - s * 0.2, this.cw, s * 2.2);

    // grid
    const intro = easeOut(this.intro);
    const cells = this.st.cells;
    const top = Math.max(0, Math.floor(this.scroll) - 1) * E.COLS;
    for (let i = top; i < cells.length; i++) {
      const v = cells[i];
      if (v === E.EMPTY) continue;
      let [x, y] = E.center(i);
      const j = this.jiggle.get(i);
      if (j) { x += j.x; y += j.y; }
      if (intro < 1) {
        const r = E.rowOf(i);
        const local = clamp(intro * 1.6 - r * 0.05, 0, 1);
        y -= (1 - easeOut(local)) * 6;
        if (local <= 0) continue;
      }
      const bird = this.st.birds.has(i);
      let scale = 1;
      if (bird) scale = 1 + Math.sin(now / 380 + i) * 0.025;
      this.drawBubble(v, x, y, scale, bird);
    }

    // pops: swell and fade
    for (const p of this.pops) {
      const t = clamp((now - p.t) / 110, 0, 1);
      if (now < p.t) { this.drawBubble(p.color, p.x, p.y, 1, p.bird); continue; }
      this.drawBubble(p.color, p.x, p.y, 1 + t * 0.35, false, 1 - t);
    }

    // aim guide
    if (this.guide && !this.busy) this.drawGuide(now);

    // falling bubbles
    for (const b of this.falls) {
      const size = (this.sprites.size / dpr) * 0.95;
      ctx.save();
      ctx.translate(this.X(b.x), this.Y(b.y));
      ctx.rotate(b.rot);
      ctx.drawImage(this.sprite(b.v), -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    // flying shot
    if (this.flight) {
      const f = this.flight;
      f.trail.forEach((p, k) => {
        ctx.globalAlpha = (k / f.trail.length) * 0.35;
        const size = (this.sprites.size / dpr) * (0.5 + (k / f.trail.length) * 0.4);
        ctx.drawImage(this.sprite(f.color), this.X(p.x) - size / 2, this.Y(p.y) - size / 2, size, size);
      });
      ctx.globalAlpha = 1;
      const p = this.pointAt(f, f.d);
      this.drawBubble(f.color, p[0], p[1]);
    }

    this.drawShooter(now);

    // particles
    for (const p of this.parts) {
      const a = clamp(p.life / (p.max * 0.6), 0, 1);
      ctx.globalAlpha = a;
      if (p.kind === 'ring') {
        const t = 1 - p.life / p.max;
        ctx.strokeStyle = p.col;
        ctx.lineWidth = s * 0.12 * (1 - t);
        ctx.beginPath();
        ctx.arc(this.X(p.x), this.Y(p.y), s * (0.9 + t * 1.2), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'leaf') {
        ctx.save();
        ctx.translate(this.X(p.x), this.Y(p.y));
        ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * s * 0.45, p.r * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(this.X(p.x), this.Y(p.y), p.r * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // freed birds
    for (const b of this.birdsFlying) {
      ctx.globalAlpha = clamp(3 - b.age, 0, 1);
      drawBird(ctx, this.X(b.x), this.Y(b.y), s * 0.62, b.flap, true, b.dir);
    }
    ctx.globalAlpha = 1;

    // words
    for (const t of this.texts) {
      if (now < t.t) continue;
      const k = (now - t.t) / 1100;
      const pop = k < 0.15 ? easeOut(k / 0.15) : 1;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      const px = Math.round(s * (t.big ? 1.5 : 0.9) * (0.7 + 0.3 * pop));
      ctx.font = `700 ${px}px Fraunces, Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const x = clamp(this.X(t.x), px * 3, this.cw - px * 3);
      const y = this.Y(t.y) - k * s * 2;
      ctx.lineWidth = px * 0.18;
      ctx.strokeStyle = 'rgba(20,40,20,0.55)';
      ctx.strokeText(t.text, x, y);
      ctx.fillStyle = t.big ? '#fff3c4' : '#ffffff';
      ctx.fillText(t.text, x, y);
    }
    ctx.globalAlpha = 1;

    // fireflies at night, pollen by day
    for (const m of this.motes) {
      const x = (m.x + Math.sin(now / 4000 + m.p) * 0.03) * this.cw;
      const y = ((m.y + now / 60000 * m.s) % 1) * this.ch;
      const tw = (Math.sin(now / 600 + m.p * 3) + 1) / 2;
      if (this.dark) {
        const r = s * (0.35 + tw * 0.25);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(230,255,150,${0.55 * tw + 0.15})`);
        g.addColorStop(1, 'rgba(230,255,150,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      } else {
        ctx.fillStyle = `rgba(255,255,240,${0.25 + tw * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawGuide(now) {
    const ctx = this.ctx;
    const g = this.guide;
    const pts = g.path;
    const color = this.st.queue[0];
    const col = color >= 0 && color < 6 ? BUBBLES[color].base : '#ffffff';
    // harder tiers show a shorter guide
    const tier = this.level.tier;
    const maxLen = tier === 'expert' || tier === 'master' ? 13 : tier === 'hard' ? 20 : 999;
    const spacing = 0.9;
    let acc = 0, budget = maxLen;
    const offset = (now / 1000 * 3) % spacing;
    for (let k = 1; k < pts.length && budget > 0; k++) {
      const a = pts[k - 1], b = pts[k];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let t = (spacing - ((acc - offset) % spacing + spacing) % spacing); t < d && budget > 0; t += spacing) {
        const x = a[0] + ((b[0] - a[0]) * t) / d, y = a[1] + ((b[1] - a[1]) * t) / d;
        const fade = Math.min(1, budget / 4);
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.X(x), this.Y(y), this.s * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8 * fade;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(this.X(x), this.Y(y), this.s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        budget -= spacing;
      }
      acc += d;
    }
    ctx.globalAlpha = 1;
    // ghost of where it will land
    if (maxLen > 100 && g.cell >= 0) {
      const [x, y] = E.center(g.cell);
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin(now / 200);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = this.s * 0.1;
      ctx.setLineDash([this.s * 0.3, this.s * 0.25]);
      ctx.beginPath();
      ctx.arc(this.X(x), this.Y(y), this.s * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  drawShooter(now) {
    const ctx = this.ctx;
    const s = this.s;
    const [sx, sy] = this.shooterScreen();
    const dark = this.dark;

    // stone pedestal
    ctx.save();
    ctx.translate(sx, sy);
    const pg = ctx.createLinearGradient(0, s * 0.4, 0, s * 3);
    pg.addColorStop(0, dark ? '#5b6458' : '#a3ab98');
    pg.addColorStop(1, dark ? '#283028' : '#5f685c');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(-s * 2.2, s * 3.2);
    ctx.quadraticCurveTo(-s * 2.0, s * 0.8, -s * 1.1, s * 0.6);
    ctx.lineTo(s * 1.1, s * 0.6);
    ctx.quadraticCurveTo(s * 2.0, s * 0.8, s * 2.2, s * 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark ? 'rgba(80,140,70,0.55)' : 'rgba(90,150,60,0.75)';
    for (const [x, y, r] of [[-1.5, 0.95, 0.45], [-0.9, 0.7, 0.3], [1.4, 0.9, 0.38], [0.6, 0.65, 0.25]]) {
      ctx.beginPath();
      ctx.arc(x * s, y * s, r * s, Math.PI, 0);
      ctx.fill();
    }
    // carved leaf on the pedestal
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, s * 2.6);
    ctx.quadraticCurveTo(s * 0.7, s * 1.9, 0, s * 1.4);
    ctx.quadraticCurveTo(-s * 0.7, s * 1.9, 0, s * 2.6);
    ctx.stroke();

    // aim pointer
    const ang = this.aim && this.aim.angle != null ? this.aim.angle : Math.PI / 2;
    ctx.save();
    ctx.rotate(-ang + Math.PI / 2);
    ctx.fillStyle = dark ? 'rgba(255,240,200,0.55)' : 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 2.1);
    ctx.lineTo(s * 0.32, -s * 1.55);
    ctx.lineTo(-s * 0.32, -s * 1.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // wooden ring
    const rg = ctx.createLinearGradient(-s, -s, s, s);
    rg.addColorStop(0, '#d39a55');
    rg.addColorStop(0.5, '#8b5a2b');
    rg.addColorStop(1, '#5c3a1a');
    ctx.strokeStyle = rg;
    ctx.lineWidth = s * 0.34;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,180,0.35)';
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.38, 3.5, 5.2);
    ctx.stroke();
    ctx.restore();

    // current bubble
    if (!this.flight && this.st.queue.length) {
      const bob = Math.sin(now / 500) * 0.05;
      const sc = 1 - this.recoil * 0.25 + (this.swapAnim > 0 ? -0.3 * Math.sin(this.swapAnim * Math.PI) : 0);
      const size = (this.sprites.size / this.dpr) * sc;
      ctx.drawImage(this.sprite(this.st.queue[0]), sx - size / 2, sy - size / 2 + bob * s, size, size);
    }

    // next bubble in a leaf cradle
    const [nx, ny] = this.nextScreen();
    ctx.fillStyle = dark ? '#1f5a3a' : '#3f9a4c';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(nx + side * s * 0.45, ny + s * 0.55);
      ctx.rotate(side * 1.1);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.3, s * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.st.queue.length > 1) {
      const size = (this.sprites.size / this.dpr) * 0.68;
      ctx.drawImage(this.sprite(this.st.queue[1]), nx - size / 2, ny - size / 2, size, size);
    }
    // swap arrows
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = s * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc((sx + nx) / 2, sy - s * 0.1, s * 0.75, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // shots left on a wooden plaque
    if (!this.demo) {
      const px = sx + s * 3.7, py = sy + s * 0.7;
      const low = this.st.shots <= 3;
      const pulse = low ? 1 + Math.sin(now / 160) * 0.06 : 1;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(pulse, pulse);
      const wg = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 0, 0, 0, s * 1.3);
      wg.addColorStop(0, low ? '#f07a5a' : '#c98d4f');
      wg.addColorStop(1, low ? '#9c2f1d' : '#6b4320');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = s * 0.08;
      ctx.stroke();
      ctx.fillStyle = '#fff8e6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(s * 0.95)}px Fraunces, Georgia, serif`;
      ctx.fillText(String(this.st.shots), 0, -s * 0.12);
      ctx.font = `800 ${Math.round(s * 0.32)}px Manrope, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,248,230,0.8)';
      ctx.fillText('SHOTS', 0, s * 0.55);
      ctx.restore();
    }
  }

  destroy() {
    this.dead = true;
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.bg.remove();
    this.canvas.remove();
  }
}
