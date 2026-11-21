// Saves settings and game progress on this device.
// Everything lives in one localStorage entry.

const KEY = 'haven.v1';
const HINTS_PER_HOUR = 5;

const defaults = () => ({
  settings: { mode: 'system', palette: 'ivory', sound: true },
  games: {},
});

let data = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw);
    const base = defaults();
    return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) }, games: d.games || {} };
  } catch {
    return defaults();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked: keep playing from memory */
  }
  listeners.forEach((fn) => fn(data));
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSettings() {
  return data.settings;
}

export function setSetting(key, value) {
  data.settings[key] = value;
  save();
}

export function game(id) {
  if (!data.games[id]) data.games[id] = { unlocked: 1, stars: {}, current: null, hints: null };
  return data.games[id];
}

export function updateGame(id, fn) {
  fn(game(id));
  save();
}

export function resetGame(id) {
  delete data.games[id];
  save();
}

// Hints refill to 5 at the start of every hour on the clock.
function hourKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
}

export function hints(id) {
  const g = game(id);
  const key = hourKey();
  if (!g.hints || g.hints.hour !== key) {
    g.hints = { count: HINTS_PER_HOUR, hour: key };
    save();
  }
  return g.hints.count;
}

export function useHint(id) {
  const left = hints(id);
  if (left <= 0) return false;
  updateGame(id, (g) => (g.hints.count = left - 1));
  return true;
}

export function msToRefill() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return next - now;
}

export const MAX_HINTS = HINTS_PER_HOUR;
