// Shared bits: icons, small DOM helper, sheets, toasts and theme.

import { getSettings, setSetting } from './store.js';
import { sfx } from './sound.js';

const P = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.54 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.54-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.54V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.54 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.6.85 1 1.54 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.54 1z"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="M8 11h6M20 20l-4-4"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  bird: '<path d="M3.5 15.5c2.5 3 6.5 4 9.5 2.8 3-1.2 4.8-4.2 4.8-7.3l3.2-1-3.2-1.2c-.9-2-3-3-5-2.2-2 .8-3 2.9-2.8 5-2.5-.2-4.6.9-6.5 3.9z"/><circle cx="15" cy="8.4" r=".7" fill="currentColor" stroke="none"/>',
  skip: '<path d="M6 6l7 6-7 6z" fill="currentColor" stroke="none"/><path d="M14 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
};

export function icon(name, cls = 'i') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;
}

export const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.4C.9 8.2 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.2.4.8.4 1 0 .7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.7 4.3 7.1C19.5 16.4 12 21 12 21z"/></svg>';
export const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8 6.6 19.7l1-6.1-4.4-4.3 6.1-.9z"/></svg>';

// The Haven mark: three loose lines, each ending in an arrowhead.
export const MARK = `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
  <rect x="1" y="1" width="46" height="46" rx="14" fill="var(--ink)"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
    <path d="M12 34V22h10" stroke="var(--a2)"/>
    <path d="M36 14v12H26v8" stroke="var(--a1)"/>
  </g>
  <path d="M22 17.5l5 4.5-5 4.5z" fill="var(--a2)"/>
  <path d="M21.5 34l4.5 5 4.5-5z" fill="var(--a1)"/>
</svg>`;

// Runs fn on the next frame, or soon after if frames are paused (hidden tab).
export function nextFrame(fn) {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  requestAnimationFrame(run);
  setTimeout(run, 60);
}

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* ---------- Theme ---------- */

const dark = matchMedia('(prefers-color-scheme: dark)');
const themeListeners = new Set();

export function applyTheme() {
  const s = getSettings();
  const mode = s.mode === 'system' ? (dark.matches ? 'dark' : 'light') : s.mode;
  const root = document.documentElement;
  root.dataset.mode = mode;
  root.dataset.palette = s.palette;
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  themeListeners.forEach((fn) => fn());
}
dark.addEventListener('change', applyTheme);

export function onTheme(fn) {
  themeListeners.add(fn);
  return () => themeListeners.delete(fn);
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ---------- Sheets ---------- */

let openSheet = null;

export function sheet(html, { onClose, dismissable = true } = {}) {
  closeSheet(true);
  const back = h(`<div class="sheet-back" role="dialog" aria-modal="true"><div class="sheet">${html}</div></div>`);
  const close = () => {
    if (openSheet !== entry) return;
    openSheet = null;
    back.classList.add('closing');
    setTimeout(() => back.remove(), 200);
    onClose && onClose();
  };
  const entry = { back, close };
  back.addEventListener('pointerdown', (e) => {
    if (dismissable && e.target === back) close();
  });
  document.getElementById('sheet-root').append(back);
  openSheet = entry;
  const first = back.querySelector('.btn-primary, button');
  first && setTimeout(() => first.focus({ preventScroll: true }), 50);
  return { el: back.querySelector('.sheet'), close };
}

export function closeSheet(instant = false) {
  if (!openSheet) return;
  const s = openSheet;
  openSheet = null;
  if (instant) s.back.remove();
  else {
    s.back.classList.add('closing');
    setTimeout(() => s.back.remove(), 200);
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openSheet) openSheet.close();
});

/* ---------- Toast ---------- */

export function toast(text) {
  const root = document.getElementById('toast-root');
  root.innerHTML = '';
  const t = h(`<div class="toast">${esc(text)}</div>`);
  root.append(t);
  setTimeout(() => t.remove(), 2700);
}

/* ---------- Settings sheet ---------- */

const PALETTES = [
  ['ivory', 'Ivory'],
  ['ocean', 'Ocean'],
  ['garden', 'Garden'],
  ['blossom', 'Blossom'],
  ['graphite', 'Graphite'],
];

export function openSettings({ extra = '', onExtra } = {}) {
  const s = getSettings();
  const modes = [
    ['system', 'Auto', 'auto'],
    ['light', 'Light', 'sun'],
    ['dark', 'Dark', 'moon'],
  ];
  const sw = PALETTES.map(
    ([id, name]) => `<button class="swatch" data-palette-pick="${id}" aria-pressed="${s.palette === id}">
      <span class="dots" data-palette="${id}" data-mode="${document.documentElement.dataset.mode}" style="background:var(--bg)">
        <i style="background:var(--a1)"></i><i style="background:var(--a2)"></i><i style="background:var(--a3)"></i><i style="background:var(--a4)"></i>
      </span>${name}</button>`
  ).join('');

  const { el } = sheet(`<div class="settings">
    <h2>Settings</h2>
    <div class="set-group">
      <div class="set-label">Appearance</div>
      <div class="seg" role="group" aria-label="Appearance">
        ${modes.map(([id, n, ic]) => `<button data-mode-pick="${id}" aria-pressed="${s.mode === id}">${icon(ic)}${n}</button>`).join('')}
      </div>
    </div>
    <div class="set-group">
      <div class="set-label">Theme</div>
      <div class="swatches">${sw}</div>
    </div>
    <div class="set-group">
      <div class="row">
        <div><div class="t">Sound</div><div class="d">Soft tones when arrows slide</div></div>
        <label class="switch"><input type="checkbox" data-sound ${s.sound ? 'checked' : ''} aria-label="Sound"><span></span></label>
      </div>
    </div>
    ${extra}
    <div class="stack"><button class="btn btn-primary" data-close>Done</button></div>
  </div>`);

  el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode-pick]');
    const p = e.target.closest('[data-palette-pick]');
    if (m) {
      setSetting('mode', m.dataset.modePick);
      el.querySelectorAll('[data-mode-pick]').forEach((b) => b.setAttribute('aria-pressed', b === m));
      applyTheme();
      el.querySelectorAll('.swatch .dots').forEach((d) => (d.dataset.mode = document.documentElement.dataset.mode));
      sfx.tap();
    }
    if (p) {
      setSetting('palette', p.dataset.palettePick);
      el.querySelectorAll('[data-palette-pick]').forEach((b) => b.setAttribute('aria-pressed', b === p));
      applyTheme();
      sfx.tap();
    }
    if (e.target.closest('[data-close]')) closeSheet();
    onExtra && onExtra(e);
  });
  el.querySelector('[data-sound]').addEventListener('change', (e) => {
    setSetting('sound', e.target.checked);
    sfx.tap();
  });
}
