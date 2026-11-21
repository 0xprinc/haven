// Canopy Pop — the 1000 levels.
// Each level is built from its number, so every device gets the same board.
// Shot limits come from shots.js, made by a bot that plays every level
// (see tools/calibrate-bubbles.mjs).

import { LEVEL_COUNT, TIERS, tierFor, tierProgress } from '../common/tiers.js';
import { COLS, EMPTY, STONE, Rng, hashSeed, rowLen, idx, rowOf, colOf, neighbors, floating } from './engine.js';
import { SHOTS } from './shots.js';

export { LEVEL_COUNT, TIERS, tierFor };
export const GEN_VERSION = 1;

const lerp = (a, b, t) => a + (b - a) * t;

// [colours, rows, cluster min, cluster max, stones, birds] at tier start and end.
const CURVE = {
  beginner: [[3, 4, 4, 7, 0, 1], [4, 6, 3, 6, 0, 3]],
  easy: [[4, 6, 3, 6, 0, 2], [4, 8, 2, 5, 0.03, 4]],
  medium: [[5, 7, 2, 5, 0.02, 3], [5, 10, 2, 4, 0.06, 5]],
  hard: [[5, 9, 2, 4, 0.05, 4], [6, 12, 1, 4, 0.08, 6]],
  expert: [[6, 11, 1, 4, 0.07, 5], [6, 14, 1, 3, 0.1, 7]],
  master: [[6, 13, 1, 3, 0.09, 6], [6, 16, 1, 3, 0.12, 8]],
};

// Board shapes, in normalised coords: u is 0..1 across, v is 0..1 down.
const SHAPES = {
  full: () => true,
  pyramid: (u, v) => Math.abs(u - 0.5) <= 0.5 - v * 0.42,
  diamond: (u, v) => Math.abs(u - 0.5) * 1.15 + Math.abs(v - 0.5) * 0.9 <= 0.62 || v < 0.12,
  columns: (u, v) => v < 0.18 || Math.floor(u * 5.5) % 2 === 0,
  arch: (u, v) => v < 0.3 || Math.abs(u - 0.5) > 0.22,
  heart: (u, v) => {
    const x = (u - 0.5) * 2.4, y = -(v - 0.42) * 2.4;
    const q = x * x + y * y - 1;
    return q * q * q - x * x * y * y * y <= 0 || v < 0.1;
  },
  zigzag: (u, v) => v < 0.25 || Math.abs(((u * 4 + v * 2) % 2) - 1) < 0.62,
  wings: (u, v) => v < 0.2 || Math.abs(u - 0.5) > 0.12 + v * 0.15,
};
const SHAPE_CYCLE = ['full', 'pyramid', 'full', 'columns', 'diamond', 'full', 'arch', 'zigzag', 'full', 'wings'];

export function paramsFor(n) {
  const tier = tierFor(n);
  const t = tierProgress(n);
  const [a, b] = CURVE[tier.id];
  const k = n % 10;
  const breather = k === 5 ? -1 : 0;
  const big = k === 0 ? 1 : 0;
  let shape = n < 21 ? 'full' : SHAPE_CYCLE[n % SHAPE_CYCLE.length];
  if (n % 50 === 0) shape = 'heart';
  return {
    n,
    tier: tier.id,
    colors: Math.round(lerp(a[0], b[0], t)),
    rows: Math.max(3, Math.round(lerp(a[1], b[1], t)) + breather + big),
    clusterMin: Math.round(lerp(a[2], b[2], t)),
    clusterMax: Math.round(lerp(a[3], b[3], t)),
    stones: lerp(a[4], b[4], t),
    birds: Math.max(1, Math.round(lerp(a[5], b[5], t)) + big),
    symmetric: n > 20 && n % 3 === 0,
    shape,
    // Early levels: clear every bubble. Later: free the birds.
    goal: n <= 12 ? 'clear' : 'birds',
    // How generous the shot limit is compared with the bot.
    slack: lerp(1.9, 1.08, Math.min(1, (n - 1) / 900)) + (k === 5 ? 0.2 : 0),
  };
}

function mirror(i) {
  const r = rowOf(i), c = colOf(i);
  return idx(r, rowLen(r) - 1 - c);
}

export function buildLevel(n) {
  const p = paramsFor(n);
  const rng = new Rng(hashSeed('canopy', GEN_VERSION, n));
  const size = p.rows * COLS;
  const cells = new Int8Array(size + COLS * 30).fill(EMPTY);
  const inShape = new Uint8Array(cells.length);
  const fn = SHAPES[p.shape];
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < rowLen(r); c++) {
      const u = (c + (r % 2 ? 1 : 0.5)) / COLS;
      const v = p.rows === 1 ? 0 : r / (p.rows - 1);
      if (fn(u, v)) inShape[idx(r, c)] = 1;
    }
  }

  // Grow colour patches. Bigger patches are easier.
  const palette = [];
  const all = [0, 1, 2, 3, 4, 5];
  while (palette.length < p.colors) palette.push(all.splice(Math.floor(rng.next() * all.length), 1)[0]);
  const order = [];
  for (let i = 0; i < size; i++) if (inShape[i]) order.push(i);
  for (const start of order) {
    if (cells[start] !== EMPTY) continue;
    if (p.symmetric && colOf(start) > (rowLen(rowOf(start)) - 1) / 2) continue;
    const target = rng.int(p.clusterMin, p.clusterMax);
    const nb = neighbors(start).map((x) => cells[x]).filter((v) => v >= 0);
    let color = rng.pick(palette);
    // Small-patch levels avoid touching the same colour, so patches stay small.
    if (p.clusterMax <= 3 && nb.includes(color)) color = rng.pick(palette);
    const patch = [start];
    cells[start] = color;
    for (let k = 0; k < patch.length && patch.length < target; k++) {
      const opts = neighbors(patch[k]).filter((x) => inShape[x] && cells[x] === EMPTY && x < size);
      while (opts.length && patch.length < target) {
        const x = opts.splice(Math.floor(rng.next() * opts.length), 1)[0];
        if (p.symmetric && colOf(x) > (rowLen(rowOf(x)) - 1) / 2) continue;
        cells[x] = color;
        patch.push(x);
      }
    }
  }
  if (p.symmetric) {
    for (let i = 0; i < size; i++) {
      if (!inShape[i] || cells[i] !== EMPTY) continue;
      const m = mirror(i);
      cells[i] = cells[m] !== EMPTY ? cells[m] : rng.pick(palette);
    }
  }

  // Stones: only drop, never pop. Not in the top row.
  if (p.stones > 0) {
    for (let i = COLS; i < size; i++) {
      if (cells[i] >= 0 && rng.next() < p.stones) {
        cells[i] = STONE;
        if (p.symmetric) { const m = mirror(i); if (cells[m] >= 0) cells[m] = STONE; }
      }
    }
  }

  // Drop anything that isn't hanging from the top.
  for (const f of floating(cells)) cells[f] = EMPTY;

  // Birds sit in coloured bubbles in the upper part of the board.
  const birds = [];
  if (p.goal === 'birds') {
    const upper = [];
    const limit = Math.max(2, Math.ceil(p.rows * 0.55));
    for (let i = 0; i < limit * COLS; i++) if (cells[i] >= 0 && cells[i] < STONE) upper.push(i);
    while (birds.length < p.birds && upper.length) {
      const i = upper.splice(Math.floor(rng.next() * upper.length), 1)[0];
      if (birds.some((b) => neighbors(b).includes(i))) continue; // spread them out
      birds.push(i);
    }
  }

  let last = cells.length;
  while (last > 0 && cells[last - 1] === EMPTY) last--;
  return {
    n,
    tier: p.tier,
    goal: p.goal,
    shape: p.shape,
    colors: p.colors,
    cells: Array.from(cells.slice(0, Math.max(last, COLS))),
    birds,
    queueSeed: hashSeed('canopy-queue', GEN_VERSION, n),
    slack: p.slack,
    shots: SHOTS[n - 1] || 40,
  };
}
