// Canopy Pop — rules of the bubble game. No drawing here.
//
// The board is a hex grid 11 bubbles wide (odd rows hold 10, shifted right).
// Everything is measured in "bubble radii": a bubble has radius 1.
//
// A shot flies, bounces off the side walls, and sticks where it touches.
// Three or more of the same colour pop. Anything no longer hanging
// from the top row falls. Free every trapped bird to win.

export const COLS = 11;
export const ROW_H = Math.sqrt(3);
export const FIELD_W = COLS * 2; // 22
export const VIS_ROWS = 11; // rows visible above the shooter
export const FIELD_H = VIS_ROWS * ROW_H + 7.2; // shooter sits at the bottom
export const STONE = 6;
export const RAINBOW = 7;
export const EMPTY = -1;
export const MAX_ROWS = 40;

/* ---------- Seeded randomness with saveable state ---------- */

export class Rng {
  constructor(seed) {
    this.s = seed >>> 0;
  }
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(lo, hi) {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export function hashSeed(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h = Math.imul(h ^ 0x9e3779b9, 16777619) >>> 0;
  }
  return h >>> 0;
}

/* ---------- Grid geometry ---------- */

export const rowLen = (r) => (r % 2 === 0 ? COLS : COLS - 1);
export const idx = (r, c) => r * COLS + c;
export const rowOf = (i) => (i / COLS) | 0;
export const colOf = (i) => i % COLS;

export function center(i) {
  const r = rowOf(i), c = colOf(i);
  return [(r % 2 === 0 ? 1 : 2) + 2 * c, 1 + r * ROW_H];
}

export function valid(r, c) {
  return r >= 0 && r < MAX_ROWS && c >= 0 && c < rowLen(r);
}

const N_EVEN = [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
const N_ODD = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];

export function neighbors(i) {
  const r = rowOf(i), c = colOf(i);
  const out = [];
  for (const [dr, dc] of r % 2 === 0 ? N_EVEN : N_ODD) {
    const nr = r + dr, nc = c + dc;
    if (valid(nr, nc)) out.push(idx(nr, nc));
  }
  return out;
}

/* ---------- Board state ---------- */

function fullGrid(src) {
  const cells = new Int8Array(MAX_ROWS * COLS).fill(EMPTY);
  cells.set(src.slice(0, cells.length));
  return cells;
}

export function makeState(level) {
  return {
    cells: fullGrid(level.cells),
    birds: new Set(level.birds),
    birdsTotal: level.birds.length,
    goal: level.goal,
    shots: level.shots,
    rng: new Rng(level.queueSeed),
    queue: [],
    popped: 0,
  };
}

export function colorsOnBoard(state) {
  const seen = new Set();
  for (const v of state.cells) if (v >= 0 && v < STONE) seen.add(v);
  return [...seen].sort((a, b) => a - b);
}

export function lowestRow(cells) {
  for (let i = cells.length - 1; i >= 0; i--) if (cells[i] !== EMPTY) return rowOf(i);
  return -1;
}

export function bubblesLeft(cells) {
  let n = 0;
  for (const v of cells) if (v !== EMPTY) n++;
  return n;
}

// Next bubble to load: a colour that is still on the board.
export function drawColor(state) {
  const cols = colorsOnBoard(state);
  if (!cols.length) return 0;
  return cols[Math.floor(state.rng.next() * cols.length)];
}

// Keep the loaded bubbles valid after colours vanish from the board.
export function refreshQueue(state) {
  const cols = new Set(colorsOnBoard(state));
  while (state.queue.length < 2) state.queue.push(drawColor(state));
  state.queue = state.queue.map((c) => (c === RAINBOW || cols.has(c) || !cols.size ? c : drawColor(state)));
}

export function isWon(state) {
  if (state.goal === 'birds') return state.birds.size === 0;
  return bubblesLeft(state.cells) === 0;
}

/* ---------- Shooting ---------- */

const HIT_DIST = 1.72; // a little under 2, so shots slip through tight gaps

// Follows a shot from (x, y) at angle a (radians, measured from +x, up is negative y).
// Returns the path (for the aim guide and animation) and where it sticks.
export function trace(cells, x, y, angle, maxLen = 400) {
  let dx = Math.cos(angle), dy = -Math.sin(angle);
  const path = [[x, y]];
  const step = 0.2;
  let travelled = 0;
  while (travelled < maxLen) {
    x += dx * step;
    y += dy * step;
    travelled += step;
    if (x < 1) { x = 2 - x; dx = -dx; path.push([1, y]); }
    else if (x > FIELD_W - 1) { x = 2 * (FIELD_W - 1) - x; dx = -dx; path.push([FIELD_W - 1, y]); }
    if (y <= 1) {
      path.push([x, 1]);
      return { path, cell: snap(cells, x, 1, -1), end: [x, 1] };
    }
    const r0 = Math.round((y - 1) / ROW_H);
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      if (r < 0 || r >= MAX_ROWS) continue;
      const len = rowLen(r);
      const off = r % 2 === 0 ? 1 : 2;
      const cGuess = Math.round((x - off) / 2);
      for (let c = cGuess - 1; c <= cGuess + 1; c++) {
        if (c < 0 || c >= len) continue;
        const i = idx(r, c);
        if (cells[i] === EMPTY) continue;
        const [cx, cy] = center(i);
        if ((cx - x) ** 2 + (cy - y) ** 2 < HIT_DIST * HIT_DIST) {
          path.push([x, y]);
          return { path, cell: snap(cells, x, y, i), end: [x, y], hit: i };
        }
      }
    }
  }
  path.push([x, y]);
  return { path, cell: -1, end: [x, y] };
}

// The empty cell nearest to the point where the shot stopped.
function snap(cells, x, y, hit) {
  const cand = new Set();
  const r0 = Math.max(0, Math.round((y - 1) / ROW_H));
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    if (r < 0 || r >= MAX_ROWS) continue;
    for (let c = 0; c < rowLen(r); c++) cand.add(idx(r, c));
  }
  if (hit >= 0) neighbors(hit).forEach((n) => cand.add(n));
  let best = -1, bestD = Infinity;
  for (const i of cand) {
    if (cells[i] !== EMPTY) continue;
    const r = rowOf(i);
    // must hang from something: the ceiling or a neighbour
    if (r > 0 && !neighbors(i).some((n) => cells[n] !== EMPTY)) continue;
    const [cx, cy] = center(i);
    const d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Same-colour group touching cell i.
export function cluster(cells, i) {
  const color = cells[i];
  const out = [i];
  const seen = new Set(out);
  for (let k = 0; k < out.length; k++) {
    for (const n of neighbors(out[k])) {
      if (!seen.has(n) && cells[n] === color) { seen.add(n); out.push(n); }
    }
  }
  return out;
}

// Bubbles no longer connected to the top row.
export function floating(cells) {
  const seen = new Uint8Array(cells.length);
  const stack = [];
  for (let c = 0; c < COLS; c++) if (cells[c] !== EMPTY) { seen[c] = 1; stack.push(c); }
  while (stack.length) {
    const i = stack.pop();
    for (const n of neighbors(i)) if (!seen[n] && cells[n] !== EMPTY) { seen[n] = 1; stack.push(n); }
  }
  const out = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] !== EMPTY && !seen[i]) out.push(i);
  return out;
}

// Rainbow takes the colour that pops the most.
function rainbowColor(cells, i) {
  let best = -1, bestN = 0;
  const tried = new Set();
  for (const n of neighbors(i)) {
    const v = cells[n];
    if (v < 0 || v >= STONE || tried.has(v)) continue;
    tried.add(v);
    cells[i] = v;
    const k = cluster(cells, i).length;
    if (k > bestN) { bestN = k; best = v; }
  }
  cells[i] = EMPTY;
  return best;
}

// Puts a bubble of `color` in cell i and resolves pops and falls.
// Mutates state. Returns what happened, for animation and scoring.
export function place(state, i, color) {
  const cells = state.cells;
  let c = color;
  if (c === RAINBOW) {
    c = rainbowColor(cells, i);
    if (c < 0) c = drawColor(state);
  }
  cells[i] = c;
  let popped = [];
  const group = cluster(cells, i);
  if (group.length >= 3 || (color === RAINBOW && group.length >= 2)) {
    popped = group;
    for (const p of popped) cells[p] = EMPTY;
  }
  const dropped = popped.length ? floating(cells) : [];
  for (const d of dropped) cells[d] = EMPTY;
  const freed = [];
  for (const k of popped.concat(dropped)) {
    if (state.birds.has(k)) { state.birds.delete(k); freed.push(k); }
  }
  state.popped += popped.length + dropped.length;
  return { cell: i, color: c, popped, dropped, freed };
}

// Fires the loaded bubble. Returns null if the shot finds no place.
export function shoot(state, angle, shooter) {
  const color = state.queue[0];
  const t = trace(state.cells, shooter[0], shooter[1], angle);
  if (t.cell < 0) return null;
  const res = place(state, t.cell, color);
  state.shots--;
  state.queue.shift();
  refreshQueue(state);
  return { ...res, path: t.path, shotColor: color };
}

export function shooterPos(cells) {
  return [FIELD_W / 2, scrollRows(cells) * ROW_H + FIELD_H - 2.2];
}

// How many rows are scrolled off the top so the lowest row stays in view.
export function scrollRows(cells) {
  return Math.max(0, lowestRow(cells) - (VIS_ROWS - 1));
}

/* ---------- Saving ---------- */

export function serialize(state) {
  return {
    cells: Array.from(state.cells),
    birds: [...state.birds],
    shots: state.shots,
    rng: state.rng.s,
    queue: state.queue.slice(),
    popped: state.popped,
  };
}

export function restore(level, saved) {
  const st = makeState(level);
  st.cells = fullGrid(saved.cells);
  st.birds = new Set(saved.birds);
  st.shots = saved.shots;
  st.rng.s = saved.rng >>> 0;
  st.queue = saved.queue.slice();
  st.popped = saved.popped || 0;
  return st;
}
