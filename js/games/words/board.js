// The word search board: letters on washi paper.
// Drag across letters (or tap the first and the last letter).
// The board only draws and reports; the play screen decides
// whether a pick was good, bad, or almost.

import { cellsOf } from './grid.js';
import { wsfx } from './audio.js';

const DIRS8 = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
export const INKS = ['#e9897c', '#f2b75e', '#8fbf86', '#7fb3d4', '#b896d6', '#ef8fb5', '#6fc2b0', '#d9a25f'];

export class WordBoard {
  // opts: { fx, judge(word, cells) -> verdict, onTouch() }
  constructor(host, board, opts) {
    this.host = host;
    this.b = board;
    this.N = board.size;
    this.opts = opts;
    this.locked = false;
    this.inkIndex = 0;

    const N = this.N;
    const cells = [];
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        cells.push(`<span class="ws-cell" style="grid-row:${r + 1};grid-column:${c + 1}" data-r="${r}" data-c="${c}"><b>${board.grid[r][c]}</b></span>`);

    this.el = document.createElement('div');
    this.el.className = 'ws-board';
    this.el.style.setProperty('--n', N);
    this.el.innerHTML = `
      <svg class="ws-marks" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none">
        <g class="found"></g><g class="live"></g>
      </svg>
      <div class="ws-grid">${cells.join('')}</div>`;
    host.append(this.el);
    this.found = this.el.querySelector('.found');
    this.live = this.el.querySelector('.live');
    this.grid = this.el.querySelector('.ws-grid');
    this.cellEls = [...this.grid.children];

    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(host);
    this.fit();
    this.bind();
  }

  cell(r, c) {
    return this.cellEls[r * this.N + c];
  }

  fit() {
    const r = this.host.getBoundingClientRect();
    const s = Math.floor(Math.max(120, Math.min(r.width, r.height)));
    this.el.style.width = this.el.style.height = `${s}px`;
    this.el.style.setProperty('--cs', `${s / this.N}px`);
  }

  /* ---------- Input ---------- */

  bind() {
    const g = this.grid;
    this.drag = null;
    this.anchor = null;

    const cellAt = (e, loose = false) => {
      const r = this.el.getBoundingClientRect();
      const cs = r.width / this.N;
      let c = Math.floor((e.clientX - r.left) / cs);
      let rr = Math.floor((e.clientY - r.top) / cs);
      if (!loose && (c < 0 || rr < 0 || c >= this.N || rr >= this.N)) return null;
      c = Math.max(0, Math.min(this.N - 1, c));
      rr = Math.max(0, Math.min(this.N - 1, rr));
      return { r: rr, c, x: e.clientX, y: e.clientY, cs };
    };

    this.onDown = (e) => {
      if (this.locked || this.drag) return;
      const at = cellAt(e);
      if (!at) return;
      e.preventDefault();
      try { g.setPointerCapture(e.pointerId); } catch {}
      this.opts.onTouch && this.opts.onTouch();
      this.drag = { id: e.pointerId, start: at, path: [[at.r, at.c]], moved: false };
      this.paintSel();
      wsfx.letter(0);
    };
    this.onMove = (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const at = cellAt(e, true);
      this.opts.fx && this.opts.fx.trail(e.clientX, e.clientY, at.cs * 0.16, 'rgba(200, 60, 39, 0.35)');
      const path = this.line(d.start, at);
      if (path.length !== d.path.length || path[path.length - 1].join() !== d.path[d.path.length - 1].join()) {
        const grew = path.length > d.path.length;
        d.path = path;
        if (path.length > 1) d.moved = true;
        this.paintSel();
        if (grew) wsfx.letter(path.length - 1);
      }
    };
    this.onUp = (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      if (!d.moved) {
        // Tap mode: tap the first letter, then the last.
        const [r, c] = d.path[0];
        if (this.anchor && (this.anchor.r !== r || this.anchor.c !== c)) {
          const path = this.line(this.anchor, { r, c }, true);
          this.setAnchor(null);
          if (path) return this.commit(path);
          this.setAnchor({ r, c });
          return this.clearSel();
        }
        if (this.anchor) { this.setAnchor(null); return this.clearSel(); }
        this.setAnchor({ r, c });
        return this.clearSel();
      }
      this.setAnchor(null);
      this.commit(d.path);
    };
    this.onCancel = () => {
      this.drag = null;
      this.clearSel();
    };
    g.addEventListener('pointerdown', this.onDown);
    g.addEventListener('pointermove', this.onMove);
    g.addEventListener('pointerup', this.onUp);
    g.addEventListener('pointercancel', this.onCancel);
  }

  // Cells from a to the nearest of 8 directions toward b.
  // strict: only if b lies exactly on a straight line.
  line(a, b, strict = false) {
    const dr = b.r - a.r, dc = b.c - a.c;
    if (!dr && !dc) return [[a.r, a.c]];
    if (strict) {
      if (dr && dc && Math.abs(dr) !== Math.abs(dc)) return null;
      const n = Math.max(Math.abs(dr), Math.abs(dc));
      return Array.from({ length: n + 1 }, (_, i) => [a.r + Math.sign(dr) * i, a.c + Math.sign(dc) * i]);
    }
    const ang = Math.atan2(dr, dc);
    const k = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
    const [sr, sc] = DIRS8[k];
    let len = sr && sc ? Math.round((Math.abs(dr) + Math.abs(dc)) / 2) : Math.abs(sr ? dr : dc);
    const out = [[a.r, a.c]];
    for (let i = 1; i <= len; i++) {
      const r = a.r + sr * i, c = a.c + sc * i;
      if (r < 0 || c < 0 || r >= this.N || c >= this.N) break;
      out.push([r, c]);
    }
    return out;
  }

  setAnchor(a) {
    if (this.anchor) this.cell(this.anchor.r, this.anchor.c).classList.remove('anchor');
    this.anchor = a;
    if (a) this.cell(a.r, a.c).classList.add('anchor');
  }

  /* ---------- Drawing ---------- */

  capsule(path, cls, color) {
    const [r0, c0] = path[0];
    const [r1, c1] = path[path.length - 1];
    const len = Math.hypot(r1 - r0, c1 - c0);
    const ang = (Math.atan2(r1 - r0, c1 - c0) * 180) / Math.PI;
    const w = 0.8;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${c0 + 0.5} ${r0 + 0.5}) rotate(${ang})`);
    g.setAttribute('class', cls);
    g.innerHTML = `<rect x="${-w / 2}" y="${-w / 2}" width="${len + w}" height="${w}" rx="${w / 2}" ${color ? `fill="${color}"` : ''}/>`;
    return g;
  }

  paintSel() {
    const d = this.drag;
    this.cellEls.forEach((e) => e.classList.remove('sel'));
    this.live.innerHTML = '';
    if (!d) return;
    d.path.forEach(([r, c]) => this.cell(r, c).classList.add('sel'));
    this.live.append(this.capsule(d.path, 'sel'));
  }

  clearSel() {
    this.cellEls.forEach((e) => e.classList.remove('sel'));
    this.live.innerHTML = '';
  }

  commit(path) {
    const word = path.map(([r, c]) => this.b.grid[r][c]).join('');
    if (path.length < 2) return this.clearSel();
    const verdict = this.opts.judge(word, path);
    if (verdict === 'ignore') return this.clearSel();
    if (verdict === 'good' || verdict === 'bonus') return this.clearSel();
    // Bad or almost: the live capsule reacts, then goes.
    const cap = this.live.firstElementChild;
    this.cellEls.forEach((e) => e.classList.remove('sel'));
    if (!cap) return;
    cap.classList.add(verdict === 'bad' ? 'smudge' : 'wiggle');
    path.forEach(([r, c]) => this.cell(r, c).classList.add(verdict === 'bad' ? 'shiver' : 'nudge'));
    setTimeout(() => {
      cap.remove();
      path.forEach(([r, c]) => this.cell(r, c).classList.remove('shiver', 'nudge'));
    }, 650);
  }

  // A found word: an ink stroke draws across it, letters hop.
  markFound(place, { animate = true, bonus = false } = {}) {
    const path = cellsOf(place);
    const color = bonus ? '#f2c14e' : INKS[this.inkIndex++ % INKS.length];
    const cap = this.capsule(path, `cap ${animate ? 'draw' : ''} ${bonus ? 'bonus' : ''}`, color);
    this.found.append(cap);
    path.forEach(([r, c], i) => {
      const e = this.cell(r, c);
      e.classList.add('got');
      if (bonus) e.classList.add('gold');
      if (animate) {
        e.style.setProperty('--d', `${i * 45}ms`);
        e.classList.remove('pop');
        void e.offsetWidth;
        e.classList.add('pop');
      }
    });
    return path;
  }

  // Page position of a cell's centre.
  centre(r, c) {
    const b = this.cell(r, c).getBoundingClientRect();
    return [b.left + b.width / 2, b.top + b.height / 2];
  }

  pathCentre(path) {
    const a = this.centre(...path[0]);
    const z = this.centre(...path[path.length - 1]);
    return [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2];
  }

  setHints(cells) {
    this.cellEls.forEach((e) => e.classList.remove('hint'));
    cells.forEach(([r, c]) => this.cell(r, c).classList.add('hint'));
  }

  shake() {
    this.el.classList.remove('shake');
    void this.el.offsetWidth;
    this.el.classList.add('shake');
  }

  // The secret: leftover letters glow one by one.
  async revealSecret(cells, onLetter) {
    this.locked = true;
    for (let i = 0; i < cells.length; i++) {
      const [r, c] = cells[i];
      this.cell(r, c).classList.add('secret');
      onLetter && onLetter(i, this.centre(r, c));
      await new Promise((ok) => setTimeout(ok, 110));
    }
  }

  wave() {
    this.locked = true;
    this.cellEls.forEach((e) => {
      const r = +e.dataset.r, c = +e.dataset.c;
      e.style.setProperty('--d', `${(r + c) * 40}ms`);
      e.classList.add('wave');
    });
  }

  destroy() {
    this.ro.disconnect();
    this.el.remove();
  }
}
