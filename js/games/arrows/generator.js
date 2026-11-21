// Builds one arrow board from a level number.
//
// Rules of the game:
// - Every arrow is a bent line across grid cells with a head at one end.
// - Tapping an arrow slides it forward, out of the board,
//   but only if nothing sits in a straight line in front of its head.
//
// How a board is made:
// 1. Fill the board with random bent lines (snakes).
// 2. Point each head inward or outward, leaning inward on harder levels.
// 3. Play the board with a simple solver. When it gets stuck,
//    flip one stuck arrow so it can leave. This makes every board winnable,
//    and keeps it as tight as the level asks for.

import { mulberry32, hashSeed, randInt, shuffle } from './rng.js';
import { paramsFor, timeLimit, GEN_VERSION } from './levels.js';
import { TUNED } from './tuned.js';

export const DIRS = [
  [0, -1], // 0 up
  [1, 0], // 1 right
  [0, 1], // 2 down
  [-1, 0], // 3 left
];

export function dirBetween(a, b, w) {
  const ax = a % w, ay = (a / w) | 0;
  const bx = b % w, by = (b / w) | 0;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === -1) return 0;
  if (dx === 1 && dy === 0) return 1;
  if (dx === 0 && dy === 1) return 2;
  return 3;
}

function makeMask(w, h, shape) {
  const mask = new Uint8Array(w * h);
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  const rx = w / 2, ry = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry; // about -1..1
      let on = true;
      switch (shape) {
        case 'circle':
          on = nx * nx + ny * ny <= 1.0;
          break;
        case 'diamond':
          on = Math.abs(nx) + Math.abs(ny) <= 1.12;
          break;
        case 'ring': {
          const r = nx * nx + ny * ny;
          on = r <= 1.0 && r >= 0.12;
          break;
        }
        case 'plus':
          on = Math.abs(nx) <= 0.42 || Math.abs(ny) <= 0.42;
          break;
        case 'hex':
          on = Math.abs(ny) <= 0.95 && Math.abs(nx) + Math.abs(ny) * 0.5 <= 1.0;
          break;
        case 'heart': {
          const px = nx * 1.2, py = -ny * 1.25 + 0.25;
          const v = px * px + py * py - 1;
          on = v * v * v - px * px * py * py * py <= 0;
          break;
        }
        default:
          on = true;
      }
      mask[y * w + x] = on ? 1 : 0;
    }
  }
  return mask;
}

// Cells in front of an arrow's head, up to the edge of the board.
export function rayCells(head, dir, w, h) {
  const out = [];
  let x = head % w, y = (head / w) | 0;
  const [dx, dy] = DIRS[dir];
  x += dx; y += dy;
  while (x >= 0 && y >= 0 && x < w && y < h) {
    out.push(y * w + x);
    x += dx; y += dy;
  }
  return out;
}

// Returns the first blocking cell in front of the head, or -1 if clear.
export function firstBlock(arrow, occ, w, h) {
  const head = arrow.cells[arrow.cells.length - 1];
  const [dx, dy] = DIRS[arrow.dir];
  let x = head % w + dx, y = ((head / w) | 0) + dy;
  while (x >= 0 && y >= 0 && x < w && y < h) {
    const c = y * w + x;
    if (occ[c] !== -1) return c;
    x += dx; y += dy;
  }
  return -1;
}

export function orient(cells, w) {
  // cells run tail -> head; direction is the last step.
  return { cells, dir: dirBetween(cells[cells.length - 2], cells[cells.length - 1], w) };
}

function growSnake(start, rng, p, occ, mask, w, h) {
  const target = randInt(rng, p.minLen, p.maxLen);
  const path = [start];
  const inPath = new Set(path);
  let dir = Math.floor(rng() * 4);
  while (path.length < target) {
    const cur = path[path.length - 1];
    const cx = cur % w, cy = (cur / w) | 0;
    const options = [];
    const turnL = (dir + 3) % 4, turnR = (dir + 1) % 4;
    const order = rng() < p.straight ? [dir, rng() < 0.5 ? turnL : turnR] : [rng() < 0.5 ? turnL : turnR, dir];
    order.push(turnL, turnR);
    for (const d of order) {
      const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const c = ny * w + nx;
      if (!mask[c] || occ[c] !== -1 || inPath.has(c)) continue;
      options.push([d, c]);
      break;
    }
    if (!options.length) break;
    const [d, c] = options[0];
    path.push(c);
    inPath.add(c);
    dir = d;
  }
  return path;
}

// A marble pillar cell. It blocks rays forever and never moves.
export const PILLAR = -2;

function baseOcc(w, h, pillars) {
  const occ = new Int16Array(w * h).fill(-1);
  if (pillars) for (const c of pillars) occ[c] = PILLAR;
  return occ;
}

export function solveLayers(arrows, w, h, pillars) {
  // Greedy play: take every free arrow, again and again.
  // Removing an arrow never blocks anything, so greedy is exact.
  const occ = baseOcc(w, h, pillars);
  arrows.forEach((a, i) => a.cells.forEach((c) => (occ[c] = i)));
  let remaining = arrows.map((_, i) => i);
  const layers = [];
  while (remaining.length) {
    const free = remaining.filter((i) => firstBlock(arrows[i], occ, w, h) === -1);
    if (!free.length) return { solved: false, layers, remaining, occ };
    layers.push(free);
    for (const i of free) arrows[i].cells.forEach((c) => (occ[c] = -1));
    const fs = new Set(free);
    remaining = remaining.filter((i) => !fs.has(i));
  }
  return { solved: true, layers };
}

// How many safe moves there are on average while playing one arrow at a time.
// Fewer safe moves = more traps = harder.
function freeShare(arrows, w, h, pillars, rng) {
  const occ = baseOcc(w, h, pillars);
  arrows.forEach((a, i) => a.cells.forEach((c) => (occ[c] = i)));
  let remaining = arrows.map((_, i) => i);
  let sum = 0, steps = 0;
  while (remaining.length) {
    const free = remaining.filter((i) => firstBlock(arrows[i], occ, w, h) === -1);
    if (!free.length) return 1;
    sum += free.length / remaining.length;
    steps++;
    const pick = free[Math.floor(rng() * free.length)];
    arrows[pick].cells.forEach((c) => (occ[c] = -1));
    remaining = remaining.filter((i) => i !== pick);
  }
  return steps ? sum / steps : 1;
}

function placePillars(mask, w, h, density, rng) {
  const out = [];
  if (density <= 0) return out;
  const taken = new Set();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = y * w + x;
      if (!mask[c] || rng() >= density) continue;
      // keep pillars apart so the board stays playable
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (taken.has((y + dy) * w + x + dx)) near = true;
      if (near) continue;
      taken.add(c);
      out.push(c);
    }
  }
  return out;
}

export function buildOnce(n, attempt) {
  const p = paramsFor(n);
  const { w, h } = p;
  const rng = mulberry32(hashSeed('loose-ends', GEN_VERSION, n, attempt));
  const mask = makeMask(w, h, p.shape);
  const pillars = placePillars(mask, w, h, p.pillars, rng);
  const occ = baseOcc(w, h, pillars);
  const snakes = [];

  // 1. Fill with long winding snakes.
  const cells = [];
  for (let i = 0; i < w * h; i++) if (mask[i] && occ[i] === -1) cells.push(i);
  shuffle(rng, cells);
  for (const start of cells) {
    if (occ[start] !== -1) continue;
    const path = growSnake(start, rng, p, occ, mask, w, h);
    if (path.length < 2) continue;
    const id = snakes.length;
    path.forEach((c) => (occ[c] = id));
    snakes.push(path);
  }

  // Soak up single empty cells by stretching a neighbour's end.
  for (const c of cells) {
    if (occ[c] !== -1) continue;
    const cx = c % w, cy = (c / w) | 0;
    for (const [dx, dy] of shuffle(rng, DIRS.slice())) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nb = ny * w + nx;
      const id = occ[nb];
      if (id < 0) continue;
      const s = snakes[id];
      if (s.length >= p.maxLen + 3) continue;
      if (s[0] === nb) { s.unshift(c); occ[c] = id; break; }
      if (s[s.length - 1] === nb) { s.push(c); occ[c] = id; break; }
    }
  }

  // 2. Point heads inward wherever possible.
  const arrows = snakes.map((s) => orient(s, w));
  const occAll = baseOcc(w, h, pillars);
  arrows.forEach((a, i) => a.cells.forEach((c) => (occAll[c] = i)));
  for (let i = 0; i < arrows.length; i++) {
    const fwd = arrows[i];
    const rev = orient(fwd.cells.slice().reverse(), w);
    const fwdBlocked = firstBlock(fwd, occAll, w, h) !== -1;
    const revBlocked = firstBlock(rev, occAll, w, h) !== -1;
    const wantBlocked = rng() < p.inward;
    let pick = fwd;
    if (fwdBlocked !== revBlocked) pick = (fwdBlocked === wantBlocked) ? fwd : rev;
    else pick = rng() < 0.5 ? fwd : rev;
    arrows[i] = pick;
  }

  // 3. Repair until it can be solved, changing as little as possible.
  let guard = 0;
  let deleted = 0;
  let split = 0;
  while (guard++ < 3000) {
    const res = solveLayers(arrows, w, h, pillars);
    if (res.solved) break;
    const stuck = shuffle(rng, res.remaining.slice());
    let fixed = false;
    for (const i of stuck) {
      const rev = orient(arrows[i].cells.slice().reverse(), w);
      if (firstBlock(rev, res.occ, w, h) === -1) {
        arrows[i] = rev;
        fixed = true;
        break;
      }
    }
    if (!fixed) {
      // Nobody can leave even when flipped. Split the longest stuck arrow
      // in two (new ends, new directions); only tiny ones get dropped.
      stuck.sort((a, b) => arrows[b].cells.length - arrows[a].cells.length);
      const i = stuck[0];
      const c = arrows[i].cells;
      if (c.length >= 4) {
        const m = 2 + Math.floor(rng() * (c.length - 3));
        const A = c.slice(0, m), B = c.slice(m);
        arrows[i] = orient(rng() < 0.5 ? A : A.slice().reverse(), w);
        arrows.push(orient(rng() < 0.5 ? B : B.slice().reverse(), w));
        split++;
      } else {
        arrows.splice(i, 1);
        deleted++;
      }
    }
  }

  const res = solveLayers(arrows, w, h, pillars);
  const filled = arrows.reduce((s, a) => s + a.cells.length, 0);
  const share = res.solved ? freeShare(arrows, w, h, pillars, rng) : 1;
  return {
    n,
    w,
    h,
    shape: p.shape,
    tier: p.tier,
    mask,
    pillars,
    arrows: arrows.map((a, i) => ({ id: i, cells: a.cells, dir: a.dir })),
    stats: {
      solved: res.solved,
      arrows: arrows.length,
      depth: res.layers.length,
      firstFree: res.layers[0] ? res.layers[0].length : 0,
      freeShare: share,
      fill: filled / (cells.length || 1),
      deleted,
      split,
    },
  };
}

// Higher = harder: long chains of dependencies and few safe moves.
function hardness(l) {
  const s = l.stats;
  return s.depth * 1.2 + (1 - s.freeShare) * 30 - (s.firstFree / Math.max(1, s.arrows)) * 10 + (s.fill < 0.85 ? -20 : 0);
}

// Rebuilds a board tuned offline: base board + joins/flips + removed pillars.
function applyTuned(base, arrowsStr, removedStr) {
  const { w, h } = base;
  const removed = new Set(removedStr ? removedStr.split('.').map((x) => parseInt(x, 36)) : []);
  const pillars = base.pillars.filter((c) => !removed.has(c));
  const seen = new Set();
  const arrows = [];
  for (const a of arrowsStr.split(',')) {
    let cells = [];
    for (const tok of a.split('.')) {
      const rev = tok[0] === '~';
      const i = parseInt(rev ? tok.slice(1) : tok, 36);
      const src = base.arrows[i];
      if (!src) return null;
      cells = cells.concat(rev ? src.cells.slice().reverse() : src.cells);
    }
    for (let k = 0; k < cells.length; k++) {
      const c = cells[k];
      if (seen.has(c)) return null;
      seen.add(c);
      if (k && Math.abs((c % w) - (cells[k - 1] % w)) + Math.abs(((c / w) | 0) - ((cells[k - 1] / w) | 0)) !== 1) return null;
    }
    arrows.push({ cells, dir: orient(cells, w).dir });
  }
  if (!solveLayers(arrows, w, h, pillars).solved) return null;
  return {
    ...base,
    pillars,
    arrows: arrows.map((x, i) => ({ id: i, cells: x.cells, dir: x.dir })),
    stats: { ...base.stats, arrows: arrows.length, tuned: true },
  };
}

const cache = new Map();

export function generateLevel(n) {
  if (cache.has(n)) return cache.get(n);
  const p = paramsFor(n);
  let best = null;
  const tuned = TUNED[n - 1];
  if (tuned) {
    const [att, arrowsStr, removedStr] = tuned.split('|');
    best = applyTuned(buildOnce(n, +att), arrowsStr, removedStr);
  }
  if (!best) {
    // not tuned (or tuning no longer matches): pick the hardest raw board
    for (let attempt = 0; attempt < p.attempts; attempt++) {
      const lvl = buildOnce(n, attempt);
      if (!lvl.stats.solved) continue;
      lvl.stats.hardness = hardness(lvl);
      if (!best || lvl.stats.hardness > best.stats.hardness) best = lvl;
    }
  }
  best.lives = p.lives;
  best.boss = p.boss;
  best.colors = p.colors;
  best.time = timeLimit(p, best);
  if (cache.size > 20) cache.clear();
  cache.set(n, best);
  return best;
}
