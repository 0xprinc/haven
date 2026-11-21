// How hard each of the 1000 levels is.
// Every level is built from a seed plus these settings,
// so nothing has to be downloaded and every device agrees.
//
// Version 2 was the "hard" redesign: bigger boards, long winding arrows,
// marble pillars that never move, timers and a strict heart limit.
// Version 3 starts level 1 where level 150 used to be, and every board is
// tuned offline (tools/tune-arrows.mjs) so very few arrows can leave at once.
// Version 4 ("100x"): stronger tuning (about one free arrow at a time),
// one heart on every level, a clock on every level, and only 2-4 colours.

import { LEVEL_COUNT, TIERS, tierFor, tierProgress } from '../common/tiers.js';

export { LEVEL_COUNT, TIERS, tierFor };

// Bump this whenever boards change. Saved in-progress boards are thrown away.
export const GEN_VERSION = 4;

// Olympus names for the six tiers.
export const TIER_NAMES = {
  beginner: 'Initiate',
  easy: 'Hero',
  medium: 'Demigod',
  hard: 'Titan',
  expert: 'Olympian',
  master: 'Immortal',
};
export const tierName = (n) => TIER_NAMES[tierFor(n).id];

// [size, maxLen, straightness, inward, pillars, secondsPerArrow] at tier start and end.
const CURVE = {
  beginner: [[8, 7, 0.5, 0.92, 0, 6], [11, 9, 0.46, 0.95, 0.02, 5.2]],
  easy: [[11, 9, 0.46, 0.95, 0.02, 5], [14, 11, 0.42, 0.96, 0.04, 4.4]],
  medium: [[14, 11, 0.42, 0.96, 0.04, 4.4], [17, 13, 0.38, 0.97, 0.05, 3.8]],
  hard: [[16, 12, 0.38, 0.97, 0.05, 3.8], [19, 15, 0.34, 0.98, 0.06, 3.2]],
  expert: [[18, 14, 0.34, 0.98, 0.06, 3.2], [21, 18, 0.31, 0.99, 0.07, 2.7]],
  master: [[20, 16, 0.31, 0.99, 0.07, 2.7], [23, 22, 0.28, 0.995, 0.08, 2.2]],
};

const lerp = (a, b, t) => a + (b - a) * t;

function shapeFor(n) {
  if (n < 31) return 'rect';
  if (n % 50 === 0) return 'heart';
  const cycle = ['rect', 'circle', 'rect', 'diamond', 'ring', 'rect', 'plus', 'hex', 'rect', 'ring'];
  return cycle[n % cycle.length];
}

// Level n uses the difficulty that old level `src` had: 1 -> 150, 1000 -> 1000.
export const sourceLevel = (n) => 150 + Math.round(((n - 1) * 850) / 999);

// Few arrow colours make long arrows hard to tell apart.
const COLORS = { beginner: 4, easy: 4, medium: 3, hard: 3, expert: 2, master: 2 };

export function paramsFor(n) {
  const src = sourceLevel(n);
  const tier = tierFor(src);
  const t = tierProgress(src);
  const [a, b] = CURVE[tier.id];

  // Inside every block of ten: a climb, a short breather on 5, a boss on 10.
  const k = n % 10;
  const boss = k === 0;
  const breather = k === 5;
  const bump = boss ? 1.5 : breather ? -1 : (k - 5) * 0.15;

  const shape = n < 6 ? 'rect' : shapeFor(src);
  let size = lerp(a[0], b[0], t) + bump + (shape !== 'rect' ? 1.5 : 0);
  size = Math.min(26, Math.max(6, Math.round(size + 2)));
  const tall = n % 3;
  const w = size;
  const h = shape === 'rect' ? Math.min(27, size + tall) : size;

  // One heart everywhere: a single bump fails the level.
  // The breather level in each block of ten allows one mistake.
  const lives = breather ? 2 : 1;

  return {
    n,
    w,
    h,
    shape,
    tier: tier.id,
    minLen: 3,
    maxLen: Math.round(lerp(a[1], b[1], t) + (boss ? 2 : 0)),
    straight: lerp(a[2], b[2], t),
    inward: Math.min(0.997, lerp(a[3], b[3], t) + (boss ? 0.01 : 0)),
    pillars: n < 4 ? 0 : lerp(a[4], b[4], t) + (boss ? 0.01 : 0),
    attempts: tier.id === 'beginner' ? 6 : tier.id === 'expert' || tier.id === 'master' ? 8 : 10,
    lives,
    timed: true,
    colors: COLORS[tierFor(n).id],
    secondsPerArrow: lerp(a[5], b[5], t) * (breather ? 1.25 : 1),
    boss,
  };
}

// Seconds on the clock for a built level (null = no timer).
export function timeLimit(p, level) {
  if (!p.timed) return null;
  const cells = level.arrows.reduce((s, x) => s + x.cells.length, 0);
  const secs = 10 + level.arrows.length * p.secondsPerArrow * 0.75 + cells * 0.06;
  return Math.round(secs / 5) * 5;
}
