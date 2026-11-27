// Builds a word search board from a level.
// Seeded, so level 12 is the same board on every device.
// Every target word appears exactly once, and the filler
// never spells a target by accident.

import { mulberry32, hashSeed, shuffle } from '../arrows/rng.js';

const DIRS = {
  A: [[0, 1], [1, 0]],
  B: [[0, 1], [1, 0], [1, 1]],
  C: [[0, 1], [1, 0], [1, 1], [-1, 1]],
  D: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]],
};
export const ALL_DIRS = DIRS.D;

// Filler leans on the letters of the level's own words,
// so the board looks full of near-misses.
const COMMON = 'EEEAAAOOIINNRRSSTTLLUDHMGCKYPBWF';

function letters(s) {
  return s.replace(/[^A-Z]/g, '');
}

function tryBuild(def, rng) {
  const N = def.size;
  const cells = Array.from({ length: N }, () => Array(N).fill(''));
  const dirs = DIRS[def.dirs];
  const places = {};

  const secret = def.secret ? letters(def.secret) : '';
  const total = def.targets.reduce((s, w) => s + w.length, 0);
  // Secret levels need exactly this many shared letters,
  // so the empty cells match the length of the message.
  let overlapsLeft = secret ? total - (N * N - secret.length) : Infinity;
  if (overlapsLeft < 0) return null;

  const fits = (w, r, c, [dr, dc]) => {
    let shared = 0;
    for (let i = 0; i < w.length; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      if (rr < 0 || cc < 0 || rr >= N || cc >= N) return -1;
      const ch = cells[rr][cc];
      if (ch && ch !== w[i]) return -1;
      if (ch) shared++;
    }
    return shared;
  };

  const put = (w, allowShare = Infinity) => {
    const opts = [];
    for (const d of dirs)
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          const s = fits(w, r, c, d);
          if (s < 0 || s > allowShare || s === w.length) continue;
          opts.push({ r, c, dr: d[0], dc: d[1], s });
        }
    if (!opts.length) return null;
    // Some crossings make a board feel woven, not stacked.
    const pick = secret
      ? opts[Math.floor(rng() * opts.length)]
      : (() => {
          const crossing = opts.filter((o) => o.s > 0);
          const pool = crossing.length && rng() < 0.45 ? crossing : opts;
          return pool[Math.floor(rng() * pool.length)];
        })();
    for (let i = 0; i < w.length; i++) cells[pick.r + pick.dr * i][pick.c + pick.dc * i] = w[i];
    return { r: pick.r, c: pick.c, dr: pick.dr, dc: pick.dc, len: w.length, shared: pick.s };
  };

  const order = shuffle(rng, def.targets.slice()).sort((a, b) => b.length - a.length);
  for (const w of order) {
    const p = put(w, overlapsLeft);
    if (!p) return null;
    overlapsLeft -= p.shared;
    places[w] = p;
  }
  if (secret && overlapsLeft !== 0) return null;

  const extra = {};
  if (!secret) {
    for (const w of [...def.decoys, ...def.bonus]) {
      const p = put(w);
      if (!p) return null;
      extra[w] = p;
    }
  }

  // Fill the gaps.
  const secretCells = [];
  if (secret) {
    let k = 0;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (!cells[r][c]) {
          cells[r][c] = secret[k++];
          secretCells.push([r, c]);
        }
    if (k !== secret.length) return null;
  } else {
    const pool = COMMON + def.targets.join('').repeat(2);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) if (!cells[r][c]) cells[r][c] = pool[Math.floor(rng() * pool.length)];
  }

  const grid = cells.map((row) => row.join(''));
  // Each word must appear exactly once (bonus and decoys too),
  // and a decoy must not accidentally contain a real word.
  for (const w of [...def.targets, ...def.bonus, ...def.decoys]) {
    if (countWord(grid, w) !== 1) return null;
  }
  return { size: N, grid, places, extra, secretCells };
}

// How many distinct places a word sits on the board (either direction).
export function countWord(grid, w) {
  const N = grid.length;
  const seen = new Set();
  for (const [dr, dc] of ALL_DIRS)
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        let ok = true;
        for (let i = 0; i < w.length && ok; i++) {
          const rr = r + dr * i, cc = c + dc * i;
          if (rr < 0 || cc < 0 || rr >= N || cc >= N || grid[rr][cc] !== w[i]) ok = false;
        }
        if (!ok) continue;
        const end = [r + dr * (w.length - 1), c + dc * (w.length - 1)];
        const key = [[r, c].join(','), end.join(',')].sort().join('|');
        seen.add(key);
      }
  return seen.size;
}

const cache = new Map();

// Mixed directions make a fairer puzzle than stacked rows,
// so we build a few valid boards and keep the most varied one.
function variety(b) {
  const ps = Object.values(b.places);
  const dirs = new Set(ps.map((p) => `${p.dr},${p.dc}`));
  const slanted = ps.filter((p) => p.dr && p.dc).length;
  const upOrBack = ps.filter((p) => p.dr < 0 || p.dc < 0).length;
  return dirs.size * 10 + slanted * 3 + upOrBack * 2;
}

export function buildBoard(def) {
  if (cache.has(def.n)) return cache.get(def.n);
  const keep = def.secret ? 40 : 12;
  let best = null, found = 0;
  for (let attempt = 0; attempt < 40000 && found < keep; attempt++) {
    const b = tryBuild(def, mulberry32(hashSeed('lost-words', def.n, attempt)));
    if (!b) continue;
    found++;
    b.attempt = attempt;
    b.score = variety(b);
    if (!best || b.score > best.score) best = b;
  }
  if (!best) throw new Error(`Could not build board for level ${def.n}`);
  cache.set(def.n, best);
  return best;
}

// The cells a placement covers.
export function cellsOf(p) {
  return Array.from({ length: p.len }, (_, i) => [p.r + p.dr * i, p.c + p.dc * i]);
}
