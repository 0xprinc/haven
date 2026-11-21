// The arrow board: drawing, animation and touch.
//
// Everything is drawn on one canvas in "cell units",
// so a line width of 0.24 means a quarter of a cell at any zoom.

import { DIRS, firstBlock } from './generator.js';
import { PALETTE, theme, paintSky, tabletPaths } from './olympus.js';

const LINE = 0.25; // arrow thickness, in cells
const HEAD_LEN = 0.4;
const HEAD_HALF = 0.31;
const TIP = 0.36; // how far the tip sits past the head cell centre

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

// Turn the board a quarter turn so tall boards fit wide screens.
function rotateLevel(level) {
  const { w, h } = level;
  const map = (c) => {
    const x = c % w, y = (c / w) | 0;
    return x * h + (h - 1 - y); // new width is h
  };
  const mask = new Uint8Array(w * h);
  for (let c = 0; c < w * h; c++) mask[map(c)] = level.mask[c];
  return {
    ...level,
    w: h,
    h: w,
    mask,
    arrows: level.arrows.map((a) => ({ id: a.id, cells: a.cells.map(map), dir: (a.dir + 1) % 4 })),
    pillars: (level.pillars || []).map(map),
  };
}

function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

export class Board {
  constructor(wrap, level, opts = {}) {
    this.wrap = wrap;
    this.base = level;
    this.opts = opts;
    this.demo = !!opts.demo;
    this.removed = new Set(opts.removed || []);
    this.locked = false;
    this.pressed = -1;
    this.hint = null;
    this.particles = [];
    this.flash = new Map(); // arrow index -> time it was hit
    this.pointers = new Map();
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.rotated = null;
    this.running = false;
    this.dead = false;

    // backdrop (sky and temple) sits under the board canvas
    this.bg = document.createElement('canvas');
    this.bg.style.pointerEvents = 'none';
    wrap.append(this.bg);
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-label', 'Puzzle board');
    this.ctx = this.canvas.getContext('2d');
    wrap.append(this.canvas);

    this.readColors();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(wrap);
    this.resize(true);

    if (!this.demo) this.bindInput();
    this.onVis = () => document.visibilityState === 'visible' && this.kick();
    document.addEventListener('visibilitychange', this.onVis);
  }

  /* ---------- Setup ---------- */

  readColors() {
    const mode = document.documentElement.dataset.mode;
    this.dark = mode === 'dark';
    // Olympus theme: one colour per god, gold arrowheads, marble tablet
    this.colors = PALETTE[this.dark ? 'dark' : 'light'];
    this.feathers = this.colors.map((c) => mix(c, '#ffffff', this.dark ? 0.25 : 0.45));
    this.c = theme(this.dark);
    if (this.arrows) {
      this.paintBg();
      this.paint();
    }
  }

  build(level) {
    this.level = level;
    const { w, h } = level;
    this.occ = new Int16Array(w * h).fill(-1);
    // marble pillars block forever
    for (const c of level.pillars || []) this.occ[c] = -2;
    const now = performance.now();
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    const maxD = Math.hypot(cx, cy) || 1;
    this.arrows = level.arrows.map((a, i) => {
      const gone = this.removed.has(a.id);
      if (!gone) a.cells.forEach((c) => (this.occ[c] = i));
      const pts = a.cells.map((c) => [(c % w) + 0.5, ((c / w) | 0) + 0.5]);
      const [hx, hy] = pts[pts.length - 1];
      const [dx, dy] = DIRS[a.dir];
      const toEdge = dx > 0 ? w - hx : dx < 0 ? hx : dy > 0 ? h - hy : hy;
      const L = pts.length - 1;
      const far = toEdge + L + 3;
      const path = pts.concat([[hx + dx * far, hy + dy * far]]);
      const segs = [];
      for (let k = 0; k < path.length - 1; k++) segs.push(k < pts.length - 1 ? 1 : far);
      const mid = pts[Math.floor(pts.length / 2)];
      const d = Math.hypot(mid[0] - 0.5 - cx, mid[1] - 0.5 - cy) / maxD;
      return {
        id: a.id,
        cells: a.cells,
        dir: a.dir,
        pts,
        path,
        segs,
        L,
        toEdge,
        far,
        color: 0,
        state: gone ? 'gone' : 'idle',
        s: 0,
        reveal: this.opts.noIntro ? 1 : 0,
        revealAt: now + 120 + d * 520 + (i % 5) * 18,
      };
    });
    this.assignColors();
  }

  assignColors() {
    const { w, h } = this.level;
    const owner = new Int16Array(w * h).fill(-1);
    this.arrows.forEach((a, i) => a.cells.forEach((c) => (owner[c] = i)));
    // high tiers use fewer colours, so long arrows are harder to follow
    const K = Math.min(this.colors.length, this.level.colors || this.colors.length);
    const used = new Array(K).fill(0);
    const seed = this.level.n || 0;
    this.arrows.forEach((a, i) => {
      const bad = new Set();
      for (const c of a.cells) {
        const x = c % w, y = (c / w) | 0;
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const o = owner[ny * w + nx];
          if (o !== -1 && o < i) bad.add(this.arrows[o].color);
        }
      }
      let best = -1;
      for (let k = 0; k < K; k++) {
        const col = (k + seed + i * 3) % K;
        if (bad.has(col)) continue;
        if (best === -1 || used[col] < used[best]) best = col;
      }
      if (best === -1) best = (i + seed) % K;
      a.color = best;
      used[best]++;
    });
  }

  resize(first = false) {
    const r = this.wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.cw = r.width;
    this.ch = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;

    // Turn tall boards sideways on wide screens (not hearts, they'd look odd).
    const b = this.base;
    const wide = r.width > r.height * 1.05;
    const canTurn = b.shape !== 'heart' && b.h !== b.w;
    const rot = canTurn && (wide ? b.h > b.w : b.w > b.h);
    const busy = this.arrows && this.arrows.some((a) => a.state === 'exit' || a.state === 'bump');
    if (this.rotated !== rot && !busy) {
      const keepIntro = !first;
      this.rotated = rot;
      this.build(rot ? rotateLevel(b) : b);
      if (keepIntro) this.arrows.forEach((a) => (a.reveal = 1));
      if (this.hint != null) this.hint = this.arrows.findIndex((a) => a.id === this.hintId);
    }

    const pad = this.demo ? 18 : Math.max(18, Math.min(r.width, r.height) * 0.04);
    const { w, h } = this.level;
    // Small beginner boards should not turn into giant arrows.
    const maxCell = this.demo ? 34 : 72;
    // leave room for the marble tablet's gold border
    this.fit = Math.min((r.width - pad * 2) / (w + 1.6), (r.height - pad * 2) / (h + 1.6), maxCell);
    this.tablet = tabletPaths(w, h);
    this.paintBg();
    this.zoom = 1;
    this.panX = this.panY = 0;
    this.updateView();
    this.kick();
  }

  paintBg() {
    if (!this.cw) return;
    const ctx = this.bg.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    paintSky(ctx, this.cw, this.ch, this.dark);
  }

  updateView() {
    const { w, h } = this.level;
    const s = this.fit * this.zoom;
    this.scale = s;
    const bw = w * s, bh = h * s;
    // keep the board on screen while panning
    const mx = Math.max(0, (bw - this.cw) / 2 + s * 1.5);
    const my = Math.max(0, (bh - this.ch) / 2 + s * 1.5);
    this.panX = clamp(this.panX, -mx, mx);
    this.panY = clamp(this.panY, -my, my);
    this.ox = (this.cw - bw) / 2 + this.panX;
    this.oy = (this.ch - bh) / 2 + this.panY;
    this.opts.onZoom && this.opts.onZoom(this.zoom > 1.02);
  }

  /* ---------- Game logic ---------- */

  remaining() {
    return this.arrows.filter((a) => a.state === 'idle' || a.state === 'bump').length;
  }

  freeArrows() {
    const { w, h } = this.level;
    const out = [];
    this.arrows.forEach((a, i) => {
      if (a.state !== 'idle') return;
      if (firstBlock(a, this.occ, w, h) === -1) out.push(i);
    });
    return out;
  }

  showHint() {
    const free = this.freeArrows();
    if (!free.length) return false;
    // Pick the free arrow closest to the middle; it's easiest to spot.
    const { w, h } = this.level;
    const cx = w / 2, cy = h / 2;
    free.sort((a, b) => {
      const pa = this.arrows[a].pts[this.arrows[a].L], pb = this.arrows[b].pts[this.arrows[b].L];
      return Math.hypot(pa[0] - cx, pa[1] - cy) - Math.hypot(pb[0] - cx, pb[1] - cy);
    });
    this.hint = free[0];
    this.hintId = this.arrows[free[0]].id;
    this.hintAt = performance.now();
    this.kick();
    return true;
  }

  tap(i) {
    const a = this.arrows[i];
    if (!a || a.state !== 'idle' || this.locked) return;
    const { w, h } = this.level;
    const block = firstBlock(a, this.occ, w, h);
    const now = performance.now();
    if (block === -1) {
      a.cells.forEach((c) => (this.occ[c] = -1));
      a.state = 'exit';
      a.v = 9;
      a.t = now;
      a.trail = 1;
      this.removed.add(a.id);
      if (this.hint === i) this.hint = null;
      const left = this.remaining();
      this.opts.onExit && this.opts.onExit(a.id, left);
    } else {
      const [hx, hy] = a.pts[a.L];
      const bx = (block % w) + 0.5, by = ((block / w) | 0) + 0.5;
      const k = Math.abs(bx - hx) + Math.abs(by - hy);
      a.state = 'bump';
      a.t = now;
      a.bumpDist = Math.max(0.12, k - 0.5 - TIP + 0.02);
      a.bumpOut = 90 + 28 * k;
      a.blocker = this.occ[block];
      if (a.blocker === -2) a.pillarHit = block;
      a.hitDone = false;
    }
    this.kick();
  }

  /* ---------- Input ---------- */

  bindInput() {
    const c = this.canvas;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    this.onDown = (e) => {
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      this.pointers.set(e.pointerId, { x, y, sx: x, sy: y });
      if (this.pointers.size === 1) {
        this.moved = false;
        this.pinched = false;
        this.pressed = this.hit(x, y);
        this.pressAt = performance.now();
      } else if (this.pointers.size === 2) {
        this.pinched = true;
        this.pressed = -1;
        const [p1, p2] = [...this.pointers.values()];
        this.pinch0 = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2, zoom: this.zoom, panX: this.panX, panY: this.panY };
      }
      this.kick();
    };
    this.onMove = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const [x, y] = pos(e);
      const dx = x - p.x, dy = y - p.y;
      p.x = x; p.y = y;
      if (this.pointers.size === 2 && this.pinch0) {
        const [p1, p2] = [...this.pointers.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        this.zoomAt(this.pinch0.zoom * (d / this.pinch0.d), this.pinch0.mx, this.pinch0.my, this.pinch0);
        this.panX += mx - this.pinch0.mx;
        this.panY += my - this.pinch0.my;
        this.updateView();
        this.kick();
        return;
      }
      if (Math.hypot(x - p.sx, y - p.sy) > 10) {
        this.moved = true;
        this.pressed = -1;
      }
      if (this.moved && this.zoom > 1.01) {
        this.panX += dx;
        this.panY += dy;
        this.updateView();
        this.kick();
      }
    };
    this.onUp = (e) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (!p) return;
      if (this.pointers.size === 0) {
        if (!this.moved && !this.pinched && e.type === 'pointerup') {
          const i = this.hit(p.x, p.y);
          if (i !== -1) this.tap(i);
        }
        this.pressed = -1;
        this.pinch0 = null;
      } else if (this.pointers.size === 1) {
        this.pinch0 = null;
      }
      this.kick();
    };
    this.onWheel = (e) => {
      e.preventDefault();
      const [x, y] = pos(e);
      if (e.ctrlKey || e.metaKey) {
        this.zoomAt(this.zoom * Math.exp(-e.deltaY * 0.01), x, y);
      } else if (this.zoom > 1.01) {
        this.panX -= e.deltaX;
        this.panY -= e.deltaY;
      }
      this.updateView();
      this.kick();
    };
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    // Stop Safari's own pinch-zoom of the page.
    this.noGesture = (e) => e.preventDefault();
    c.addEventListener('gesturestart', this.noGesture);
    c.addEventListener('gesturechange', this.noGesture);
  }

  zoomAt(z, x, y, from) {
    const maxZ = Math.max(3, 64 / this.fit);
    const nz = clamp(z, 1, maxZ);
    const base = from || { zoom: this.zoom, panX: this.panX, panY: this.panY };
    // keep the point under the fingers fixed
    const k = nz / base.zoom;
    const cx = this.cw / 2, cy = this.ch / 2;
    this.panX = (base.panX - (x - cx)) * k + (x - cx);
    this.panY = (base.panY - (y - cy)) * k + (y - cy);
    this.zoom = nz;
    if (nz <= 1.001) this.panX = this.panY = 0;
    this.updateView();
  }

  resetZoom() {
    this.zoomFrom = { zoom: this.zoom, panX: this.panX, panY: this.panY, t: performance.now() };
    this.kick();
  }

  hit(px, py) {
    const x = (px - this.ox) / this.scale, y = (py - this.oy) / this.scale;
    let best = -1, bestD = 0.62;
    this.arrows.forEach((a, i) => {
      if (a.state !== 'idle') return;
      const pts = a.pts;
      const [dx, dy] = DIRS[a.dir];
      const tip = [pts[a.L][0] + dx * TIP, pts[a.L][1] + dy * TIP];
      const all = pts.concat([tip]);
      for (let k = 0; k < all.length - 1; k++) {
        const d = segDist(x, y, all[k], all[k + 1]);
        if (d < bestD) { bestD = d; best = i; }
      }
    });
    return best;
  }

  /* ---------- Loop ---------- */

  kick() {
    if (this.running || this.dead) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  frame(now) {
    if (this.dead) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const busy = this.step(now, dt);
    this.paint(now);
    if (busy && document.visibilityState === 'visible') requestAnimationFrame((t) => this.frame(t));
    else this.running = false;
  }

  step(now, dt) {
    let busy = false;
    for (const a of this.arrows) {
      if (a.reveal < 1) {
        a.reveal = clamp((now - a.revealAt) / 420, 0, 1);
        busy = true;
      }
      if (a.state === 'exit') {
        a.v += 70 * dt;
        a.s += a.v * dt;
        a.trail = Math.max(0, a.trail - dt * 2.2);
        const edgeS = a.toEdge;
        if (!a.sparked && a.s > edgeS - 0.4) {
          a.sparked = true;
          this.spark(a);
        }
        if (a.s >= a.toEdge + a.L + 1.2) {
          a.state = 'gone';
          if (this.remaining() === 0 && !this.arrows.some((b) => b.state === 'exit')) this.cleared();
        }
        busy = true;
      } else if (a.state === 'bump') {
        const t = now - a.t;
        if (t < a.bumpOut) {
          a.s = a.bumpDist * easeOutCubic(t / a.bumpOut);
        } else {
          if (!a.hitDone) {
            a.hitDone = true;
            if (a.pillarHit != null) this.flash.set('p' + a.pillarHit, now);
            else this.flash.set(a.blocker, now);
            this.flash.set(this.arrows.indexOf(a), now);
            this.opts.onBump && this.opts.onBump(a.id);
          }
          const back = clamp((t - a.bumpOut) / 380, 0, 1);
          a.s = a.bumpDist * (1 - easeOutBack(back));
          if (back >= 1) {
            a.s = 0;
            a.state = 'idle';
          }
        }
        busy = true;
      }
    }
    for (const [k, t] of this.flash) {
      if (now - t > 600) this.flash.delete(k);
      else busy = true;
    }
    if (this.particles.length) {
      busy = true;
      for (const p of this.particles) {
        p.life -= dt;
        p.vy += p.g * dt;
        p.vx *= 1 - 1.6 * dt;
        p.vy *= 1 - 1.2 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
    }
    if (this.zoomFrom) {
      const t = clamp((now - this.zoomFrom.t) / 320, 0, 1);
      const e = easeOutCubic(t);
      this.zoom = this.zoomFrom.zoom + (1 - this.zoomFrom.zoom) * e;
      this.panX = this.zoomFrom.panX * (1 - e);
      this.panY = this.zoomFrom.panY * (1 - e);
      this.updateView();
      if (t >= 1) this.zoomFrom = null;
      busy = true;
    }
    if (this.hint != null || this.pressed >= 0) busy = true;
    if (this.demo) busy = this.demoStep(now) || busy;
    return busy;
  }

  cleared() {
    if (this.clearedOnce) return;
    this.clearedOnce = true;
    if (!this.demo) this.confetti();
    this.opts.onClear && this.opts.onClear();
  }

  spark(a) {
    const [hx, hy] = a.pts[a.L];
    const [dx, dy] = DIRS[a.dir];
    const ex = hx + dx * a.toEdge, ey = hy + dy * a.toEdge;
    const col = this.c.gold;
    for (let k = 0; k < 14; k++) {
      const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2.2;
      const sp = 2 + Math.random() * 5;
      this.particles.push({ x: ex, y: ey, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0, life: 0.5 + Math.random() * 0.3, max: 0.8, r: 0.06 + Math.random() * 0.07, col, kind: 'dot', rot: 0, vr: 0 });
    }
  }

  confetti() {
    const { w, h } = this.level;
    for (let k = 0; k < 140; k++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const sp = 8 + Math.random() * 16;
      this.particles.push({
        x: w / 2 + (Math.random() - 0.5) * 2,
        y: h * 0.62,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        g: 14,
        life: 1.6 + Math.random() * 1.2,
        max: 2.6,
        r: 0.14 + Math.random() * 0.12,
        col: k % 3 === 0 ? this.c.gold : k % 3 === 1 ? (this.dark ? '#9ccf7a' : '#6f8f3a') : this.colors[k % this.colors.length],
        kind: 'paper',
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 14,
      });
    }
    this.kick();
  }

  /* ---------- Demo (home screen preview) ---------- */

  demoStep(now) {
    if (!this.demoNext) this.demoNext = now + 1400;
    if (now < this.demoNext) return true;
    const free = this.freeArrows();
    if (free.length) {
      this.tap(free[Math.floor(Math.random() * free.length)]);
      this.demoNext = now + 520;
    } else if (!this.arrows.some((a) => a.state === 'exit')) {
      // start over with a fresh draw-in
      this.removed.clear();
      this.clearedOnce = false;
      this.build(this.level);
      this.demoNext = now + 1600;
    }
    return true;
  }

  /* ---------- Drawing ---------- */

  paint(now = performance.now()) {
    const ctx = this.ctx;
    const { w, h, mask } = this.level;
    const s = this.scale, dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * this.ox, dpr * this.oy);

    // marble tablet with a gold Greek-key border
    const T = this.tablet;
    if (T) {
      // soft drop shadow without blur (blur is slow on older iPads)
      ctx.save();
      ctx.fillStyle = this.c.shadow;
      for (const [o, k] of [[0.22, 0.35], [0.12, 0.6]]) {
        ctx.globalAlpha = k;
        ctx.translate(0, o);
        ctx.fill(T.slab);
        ctx.translate(0, -o);
      }
      ctx.restore();
      ctx.save();
      const g = ctx.createLinearGradient(0, T.box[1], 0, T.box[3]);
      g.addColorStop(0, this.c.tablet[0]);
      g.addColorStop(1, this.c.tablet[1]);
      ctx.fillStyle = g;
      ctx.fill(T.slab);
      ctx.restore();
      ctx.strokeStyle = this.c.vein;
      ctx.lineWidth = 0.05;
      ctx.stroke(T.veins);
      ctx.strokeStyle = this.c.border;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.lineWidth = 0.045;
      ctx.stroke(T.lines);
      ctx.lineWidth = 0.04;
      ctx.globalAlpha = 0.85;
      ctx.stroke(T.key);
      ctx.globalAlpha = 1;
    }

    // grid dots
    ctx.fillStyle = this.c.dot;
    ctx.beginPath();
    const r = 0.055;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        ctx.moveTo(x + 0.5 + r, y + 0.5);
        ctx.arc(x + 0.5, y + 0.5, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // marble pillars, seen from above: fluted drum with a gold ring
    for (const c of this.level.pillars || []) {
      const x = (c % w) + 0.5, y = ((c / w) | 0) + 0.5;
      const f = this.flash.get('p' + c);
      const hot = f != null ? Math.sin(Math.min(1, (now - f) / 600) * Math.PI) : 0;
      ctx.fillStyle = this.c.shadow;
      ctx.beginPath();
      ctx.arc(x + 0.04, y + 0.08, 0.42, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(x - 0.12, y - 0.14, 0.02, x, y, 0.42);
      g.addColorStop(0, this.dark ? '#5a5d82' : '#ffffff');
      g.addColorStop(0.7, this.dark ? '#3a3c5c' : '#e9e1d0');
      g.addColorStop(1, this.dark ? '#26283f' : '#cbbfa5');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.dark ? 'rgba(255,255,255,0.14)' : 'rgba(120,100,70,0.28)';
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const ang = (k / 10) * Math.PI * 2;
        ctx.moveTo(x + Math.cos(ang) * 0.17, y + Math.sin(ang) * 0.17);
        ctx.lineTo(x + Math.cos(ang) * 0.36, y + Math.sin(ang) * 0.36);
      }
      ctx.stroke();
      ctx.strokeStyle = hot > 0 ? mix(this.c.border, this.c.danger, hot) : this.c.border;
      ctx.lineWidth = 0.06 + hot * 0.05;
      ctx.beginPath();
      ctx.arc(x, y, 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = this.c.gold;
      ctx.beginPath();
      ctx.arc(x, y, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // hint: glow and the path out
    if (this.hint != null && this.arrows[this.hint] && this.arrows[this.hint].state === 'idle') {
      const a = this.arrows[this.hint];
      const pulse = (Math.sin((now - this.hintAt) / 260) + 1) / 2;
      const [hx, hy] = a.pts[a.L];
      const [dx, dy] = DIRS[a.dir];
      ctx.save();
      ctx.strokeStyle = this.c.glow;
      ctx.globalAlpha = 0.28 + 0.24 * pulse;
      ctx.lineWidth = LINE + 0.42 + 0.14 * pulse;
      this.strokeSpan(a, 0, a.L);
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([0.08, 0.22]);
      ctx.lineDashOffset = -((now - this.hintAt) / 400);
      ctx.lineWidth = 0.09;
      ctx.beginPath();
      ctx.moveTo(hx + dx * 0.6, hy + dy * 0.6);
      ctx.lineTo(hx + dx * (a.toEdge + 0.4), hy + dy * (a.toEdge + 0.4));
      ctx.stroke();
      ctx.restore();
    }

    // arrows
    for (let i = 0; i < this.arrows.length; i++) {
      const a = this.arrows[i];
      if (a.state === 'gone' || a.reveal <= 0) continue;
      this.drawArrow(a, i, now);
    }

    // particles
    for (const p of this.particles) {
      const alpha = clamp(p.life / (p.max * 0.5), 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.col;
      if (p.kind === 'paper') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 1.7));
        ctx.fillRect(-p.r, -p.r * 0.55, p.r * 2, p.r * 1.1);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawArrow(a, i, now) {
    const ctx = this.ctx;
    let col = this.colors[a.color];
    let width = LINE;

    const f = this.flash.get(i);
    if (f != null) {
      const t = (now - f) / 600;
      col = mix(col, this.c.danger, Math.sin(Math.min(1, t) * Math.PI) * 0.9);
    }
    if (this.pressed === i) width *= 1.16;

    let alpha = 1;
    let start = a.s, end = a.s + a.L * easeOutCubic(a.reveal);
    if (a.state === 'exit') {
      const out = a.s - (a.toEdge + 0.3);
      alpha = clamp(1 - out / (a.L + 1.2), 0, 1);
      // fading streak along the exit path
      if (a.trail > 0) {
        const [hx, hy] = a.pts[a.L];
        const [dx, dy] = DIRS[a.dir];
        const headS = a.s + a.L;
        ctx.save();
        ctx.globalAlpha = a.trail * 0.28;
        ctx.strokeStyle = col;
        ctx.lineWidth = width * 0.5;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        const tail = Math.min(headS - a.L, a.toEdge + 0.3);
        ctx.lineTo(hx + dx * Math.max(0, tail), hy + dy * Math.max(0, tail));
        ctx.stroke();
        ctx.restore();
      }
    }
    if (alpha <= 0) return;

    ctx.globalAlpha = alpha;

    // soft shadow (light) or glow (dark)
    ctx.strokeStyle = this.dark ? col : 'rgba(0,0,0,0.16)';
    ctx.globalAlpha = alpha * (this.dark ? 0.18 : 1);
    ctx.lineWidth = this.dark ? width * 2.4 : width + 0.03;
    ctx.save();
    if (!this.dark) ctx.translate(0, 0.06);
    this.strokeSpan(a, start, end, true);
    ctx.restore();

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = width;
    this.strokeSpan(a, start, end, true, { feather: f != null ? col : this.feathers[a.color] });

    // a fine highlight down the middle for a tactile feel
    ctx.globalAlpha = alpha * (this.dark ? 0.18 : 0.22);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = width * 0.28;
    ctx.save();
    ctx.translate(-0.02, -0.025);
    this.strokeSpan(a, start + 0.02, Math.max(start + 0.02, end - 0.25), false);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Strokes the part of the arrow's path between distances s0 and s1.
  // style (main pass only): gold head and feathers at the tail.
  strokeSpan(a, s0, s1, withHead = false, style = null) {
    const ctx = this.ctx;
    const pts = [];
    let acc = 0;
    let headDir = null;
    let tailDir = null;
    for (let k = 0; k < a.segs.length; k++) {
      const len = a.segs[k];
      const p = a.path[k], q = a.path[k + 1];
      const segA = acc, segB = acc + len;
      if (segB >= s0 && segA <= s1) {
        const t0 = clamp((s0 - segA) / len, 0, 1);
        const t1 = clamp((s1 - segA) / len, 0, 1);
        const P0 = [p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0];
        const P1 = [p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1];
        if (!pts.length) { pts.push(P0); tailDir = [(q[0] - p[0]) / len, (q[1] - p[1]) / len]; }
        pts.push(P1);
        headDir = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
      }
      acc = segB;
      if (acc > s1) break;
    }
    if (pts.length < 1) return;
    if (!headDir) headDir = DIRS[a.dir];
    const tip = pts[pts.length - 1];
    const [dx, dy] = headDir;
    if (withHead) {
      // pull the line back a touch so the head sits cleanly on top
      const back = [tip[0] - dx * 0.05, tip[1] - dy * 0.05];
      pts[pts.length - 1] = back;
    }
    // feathers (fletching) at the tail
    if (style && tailDir && s1 - s0 > 0.6) {
      const [tx0, ty0] = pts[0];
      const [ux, uy] = tailDir;
      const nx = -uy, ny = ux;
      ctx.save();
      ctx.fillStyle = style.feather;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(tx0 + ux * 0.5, ty0 + uy * 0.5);
        ctx.quadraticCurveTo(tx0 + ux * 0.3 + nx * sd * 0.3, ty0 + uy * 0.3 + ny * sd * 0.3, tx0 + ux * 0.02 + nx * sd * 0.34, ty0 + uy * 0.02 + ny * sd * 0.34);
        ctx.lineTo(tx0 - ux * 0.12 + nx * sd * 0.2, ty0 - uy * 0.12 + ny * sd * 0.2);
        ctx.lineTo(tx0 + ux * 0.08, ty0 + uy * 0.08);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.stroke();

    if (withHead) {
      const tx = tip[0] + dx * TIP, ty = tip[1] + dy * TIP;
      const bx = tx - dx * HEAD_LEN * 1.45, by = ty - dy * HEAD_LEN * 1.45;
      const nx = -dy, ny = dx;
      const lw = ctx.lineWidth;
      ctx.save();
      ctx.lineWidth = Math.min(lw, 0.12);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx + nx * HEAD_HALF, by + ny * HEAD_HALF);
      ctx.lineTo(bx + dx * 0.12, by + dy * 0.12);
      ctx.lineTo(bx - nx * HEAD_HALF, by - ny * HEAD_HALF);
      ctx.closePath();
      if (style) {
        // polished gold arrowhead
        const g = ctx.createLinearGradient(bx - nx * HEAD_HALF, by - ny * HEAD_HALF, bx + nx * HEAD_HALF, by + ny * HEAD_HALF);
        g.addColorStop(0, this.c.goldDeep);
        g.addColorStop(0.45, this.c.gold);
        g.addColorStop(0.6, '#fff3c4');
        g.addColorStop(1, this.c.goldDeep);
        ctx.fillStyle = g;
        ctx.strokeStyle = this.c.goldDeep;
        ctx.lineWidth = 0.035;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  destroy() {
    this.dead = true;
    this.resizeObs.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.canvas.remove();
    this.bg.remove();
  }
}

function segDist(x, y, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const l2 = vx * vx + vy * vy || 1;
  const t = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / l2, 0, 1);
  return Math.hypot(x - (a[0] + vx * t), y - (a[1] + vy * t));
}
