// A simple bot that plays Canopy Pop.
// Used to set fair shot limits, and to play the home screen preview.

import { trace, place, makeState, refreshQueue, shooterPos, isWon, neighbors, STONE, RAINBOW, EMPTY } from './engine.js';

const ANGLES = [];
for (let d = 10; d <= 170; d += 1.25) ANGLES.push((d * Math.PI) / 180);

function clone(state) {
  return { ...state, cells: state.cells.slice(), birds: new Set(state.birds) };
}

// Score one possible shot. Bigger is better.
function evaluate(state, angle, color) {
  const sp = shooterPos(state.cells);
  const t = trace(state.cells, sp[0], sp[1], angle);
  if (t.cell < 0) return { score: -Infinity, angle };
  const s = clone(state);
  const res = place(s, t.cell, color);
  let score = res.popped.length + res.dropped.length * 1.6 + res.freed.length * 12;
  if (!res.popped.length) {
    // no pop: reward sitting next to the same colour, avoid burying birds
    const same = neighbors(t.cell).filter((n) => state.cells[n] === color).length;
    score = same * 0.45 - 0.6;
    if (neighbors(t.cell).some((n) => state.birds.has(n)) && !same) score -= 0.5;
  }
  // slight preference for higher shots (they tend to drop more later)
  score -= t.cell / 2000;
  return { score, angle, cell: t.cell };
}

export function bestShot(state) {
  const color = state.queue[0];
  let best = null;
  for (const a of ANGLES) {
    const e = evaluate(state, a, color);
    if (!best || e.score > best.score) best = e;
  }
  // try the swapped bubble too
  if (state.queue[1] !== undefined && state.queue[1] !== color) {
    const c2 = state.queue[1];
    for (const a of ANGLES) {
      const e = evaluate(state, a, c2);
      if (e.score > best.score + 0.5) best = { ...e, swap: true };
    }
  }
  return best;
}

// Plays a whole level. Returns shots used, or Infinity if stuck.
export function playLevel(level, cap = 250) {
  const st = makeState(level);
  st.shots = cap;
  refreshQueue(st);
  let used = 0;
  while (!isWon(st) && used < cap) {
    const b = bestShot(st);
    if (!b || b.score === -Infinity) return Infinity;
    if (b.swap) st.queue.reverse();
    const sp = shooterPos(st.cells);
    const t = trace(st.cells, sp[0], sp[1], b.angle);
    place(st, t.cell, st.queue[0]);
    st.queue.shift();
    refreshQueue(st);
    used++;
  }
  return isWon(st) ? used : Infinity;
}
