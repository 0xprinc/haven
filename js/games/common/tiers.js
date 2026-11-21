// Difficulty steps shared by every game with 1000 levels.

export const LEVEL_COUNT = 1000;

export const TIERS = [
  { id: 'beginner', name: 'Beginner', from: 1, to: 30 },
  { id: 'easy', name: 'Easy', from: 31, to: 150 },
  { id: 'medium', name: 'Medium', from: 151, to: 350 },
  { id: 'hard', name: 'Hard', from: 351, to: 600 },
  { id: 'expert', name: 'Expert', from: 601, to: 850 },
  { id: 'master', name: 'Master', from: 851, to: 1000 },
];

export function tierFor(n) {
  return TIERS.find((t) => n >= t.from && n <= t.to) || TIERS[TIERS.length - 1];
}

// 0 at the start of a tier, 1 at its end.
export function tierProgress(n) {
  const t = tierFor(n);
  return t.to === t.from ? 1 : (n - t.from) / (t.to - t.from);
}

// Beginner and Easy levels can be skipped: they are all open from the start,
// and the first Medium level is open too.
// A game can open more levels than that by passing its own `open`.
export const SKIP_UNTIL = TIERS.find((t) => t.id === 'easy').to; // 150
export const OPEN_FROM_START = SKIP_UNTIL + 1;

// The highest level she may play.
export function openUpTo(unlocked, open = OPEN_FROM_START) {
  return Math.max(unlocked, open);
}

// A level can be skipped if the level after it is open from the start.
export function canSkip(n, open = OPEN_FROM_START) {
  return n < open;
}
