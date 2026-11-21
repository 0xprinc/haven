// Loose Ends — the arrow puzzle.
// Two screens: the level map and the play screen.
//
// Every level has rules: a number of hearts (bumps allowed before failing),
// sometimes a timer, and boss levels where a single bump ends the run.

import { generateLevel } from './generator.js';
import { LEVEL_COUNT, GEN_VERSION, TIER_NAMES, tierName } from './levels.js';
import { levelMap, refillText, addSkip } from '../common/map.js';
import { openUpTo } from '../common/tiers.js';
import { Board } from './board.js';
import * as store from '../../store.js';
import { sfx } from '../../sound.js';
import { nextFrame, h, icon, HEART, STAR, sheet, closeSheet, toast, openSettings, onTheme } from '../../ui.js';

export const ID = 'arrows';
const EXTRA_SECONDS = 20;

// Bump to wipe everyone's Loose Ends progress once.
// 2 = hard redesign, 3 = level 1 now starts at the old level 150 and boards are tuned.
const PROGRESS_EPOCH = 3;

export const meta = {
  id: ID,
  name: 'Loose Ends',
  kind: 'Arrow puzzle',
  total: LEVEL_COUNT,
};

function ensureFresh() {
  const g = store.game(ID);
  if (g.epoch === PROGRESS_EPOCH) return;
  store.updateGame(ID, (gg) => {
    gg.unlocked = 1;
    gg.stars = {};
    gg.current = null;
    gg.epoch = PROGRESS_EPOCH;
  });
}

export function progress() {
  ensureFresh();
  const g = store.game(ID);
  const cleared = Object.keys(g.stars).length;
  const next = Math.min(g.unlocked, LEVEL_COUNT);
  const stars = Object.values(g.stars).reduce((s, v) => s + v, 0);
  return { cleared, next, stars, hints: store.hints(ID), tier: tierName(next) };
}

export const mapCfg = {
  id: ID,
  name: 'Loose Ends',
  kind: 'Arrow puzzle',
  route: 'arrows',
  help: 'hint',
  helpIcon: 'bulb',
  tierNames: TIER_NAMES,
  // Levels 1-300 are open from the start (she asked to choose freely).
  open: 300,
};
const refill = () => refillText(mapCfg);

export function mapScreen(go) {
  ensureFresh();
  return levelMap(go, mapCfg);
}

/* ---------- Play ---------- */

const COACH = {
  1: 'Tap an arrow to slide it off the board',
  2: 'An arrow leaves only if its path is clear',
  3: 'One bump and the level is over — look before you tap',
  4: 'Stuck? The bulb shows one safe arrow',
  10: 'Boss level: the biggest board in each ten',
  5: 'Marble pillars never move — nothing gets past them',
};

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function playScreen(go, n) {
  ensureFresh();
  n = Math.max(1, Math.min(LEVEL_COUNT, n | 0));
  const g = store.game(ID);
  if (n > openUpTo(g.unlocked, mapCfg.open)) {
    n = Math.min(g.unlocked, LEVEL_COUNT);
    history.replaceState(null, '', `#/arrows/${n}`);
  }
  const level = generateLevel(n);
  const maxLives = level.lives;
  const timeLimitMs = level.time ? level.time * 1000 : null;

  // Pick up where she left off, if this is the board in progress.
  const cur = g.current;
  const resume = cur && cur.level === n && cur.v === GEN_VERSION;
  let hearts = resume ? Math.min(cur.hearts, maxLives) : maxLives;
  let removed = resume ? cur.removed.slice() : [];
  let timeLeft = resume && cur.timeLeft != null ? cur.timeLeft : timeLimitMs;
  let mistakes = resume ? cur.mistakes || 0 : 0;
  let streak = 0;
  let over = false;
  let clockOn = false;

  const rulesText = [
    level.boss ? 'Boss level' : null,
    maxLives === 1 ? 'No mistakes allowed' : `${maxLives} hearts`,
    timeLimitMs ? `${fmt(timeLimitMs)} on the clock` : null,
  ].filter(Boolean).join(' · ');

  const el = h(`<section class="screen play">
    <div class="wrap bar">
      <button class="icon-btn" data-back aria-label="Back to levels">${icon('grid')}</button>
      <div class="title">
        <h1>Level ${n}${level.boss ? ' <span class="boss-tag">Boss</span>' : ''}</h1>
        <div class="k" style="display:flex;align-items:center;gap:10px;margin-top:2px">${tierName(n)}<span class="hearts" aria-label="Hearts"></span>${timeLimitMs ? `<span class="timer" data-timer>${icon('clock')}<b></b></span>` : ''}</div>
      </div>
      <div class="actions">
        <button class="icon-btn" data-restart aria-label="Restart level">${icon('restart')}</button>
        <button class="icon-btn" data-hint aria-label="Hint">${icon('bulb')}<span class="badge"></span></button>
        <button class="icon-btn" data-settings aria-label="Settings">${icon('gear')}</button>
      </div>
    </div>
    <div class="wrap"><div class="progress"><i></i></div></div>
    <div class="board-wrap">
      <button class="icon-btn zoom-reset" data-zoom aria-label="Fit board to screen">${icon('zoom')}</button>
    </div>
  </section>`);

  const heartsEl = el.querySelector('.hearts');
  const timerEl = el.querySelector('[data-timer]');
  const badge = el.querySelector('.badge');
  const bar = el.querySelector('.progress > i');
  const wrap = el.querySelector('.board-wrap');
  const zoomBtn = el.querySelector('[data-zoom]');
  const total = level.arrows.length;
  addSkip(wrap, n, mapCfg, go);

  const paintHearts = (breaking = -1) => {
    heartsEl.innerHTML = Array.from({ length: maxLives }, () => HEART).join('');
    [...heartsEl.children].forEach((s, i) => {
      if (i >= hearts) s.classList.add('lost');
      if (i === breaking) s.classList.add('breaking');
    });
  };
  const paintTimer = () => {
    if (!timerEl) return;
    timerEl.querySelector('b').textContent = fmt(timeLeft);
    timerEl.classList.toggle('low', timeLeft <= 10000);
  };
  const paintHints = (pop = false) => {
    const k = store.hints(ID);
    badge.textContent = k;
    badge.classList.toggle('empty', k === 0);
    if (pop) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
  };
  const paintProgress = (left) => {
    bar.style.transform = `scaleX(${(total - left) / total})`;
  };
  const save = () => {
    store.updateGame(ID, (gg) => (gg.current = { level: n, v: GEN_VERSION, removed, hearts, timeLeft, mistakes }));
  };

  paintHearts();
  paintTimer();
  paintHints();

  // Show this level's rules for a moment.
  const rules = h(`<div class="rules ${level.boss ? 'boss' : ''}">${rulesText}</div>`);
  wrap.append(rules);
  setTimeout(() => rules.classList.add('hide'), 2600);
  setTimeout(() => rules.remove(), 3000);

  let coach = null;
  if (COACH[n] && !resume) {
    coach = h(`<div class="coach">${COACH[n]}</div>`);
    wrap.append(coach);
  }
  const hideCoach = () => {
    if (!coach) return;
    const c = coach;
    coach = null;
    c.classList.add('hide');
    setTimeout(() => c.remove(), 300);
  };

  /* ---------- The clock ---------- */

  let lastTick = 0;
  let lastWhole = null;
  const tick = () => {
    const now = performance.now();
    const dt = lastTick ? now - lastTick : 0;
    lastTick = now;
    // pause while hidden, while a card is open, or before the clock starts
    if (!clockOn || over || document.hidden || document.querySelector('.sheet-back')) return;
    timeLeft -= dt;
    const whole = Math.ceil(timeLeft / 1000);
    if (whole !== lastWhole) {
      lastWhole = whole;
      paintTimer();
      if (whole <= 5 && whole > 0) sfx.tap();
    }
    if (timeLeft <= 0) {
      timeLeft = 0;
      paintTimer();
      timeUp();
    }
  };
  const clock = timeLimitMs ? setInterval(tick, 100) : null;
  let saveEvery = 0;
  const clockSaver = timeLimitMs ? setInterval(() => { if (clockOn && !over && saveEvery++ % 5 === 0) save(); }, 1000) : null;

  /* ---------- Board ---------- */

  let board = null;
  const makeBoard = () => {
    board && board.destroy();
    board = new Board(wrap, level, {
      removed,
      noIntro: resume,
      onZoom: (z) => zoomBtn.classList.toggle('show', z),
      onExit: (id, left) => {
        removed.push(id);
        sfx.slide(streak++);
        paintProgress(left);
        save();
        hideCoach();
      },
      onBump: () => {
        if (over) return;
        streak = 0;
        mistakes++;
        hearts = Math.max(0, hearts - 1);
        paintHearts(hearts);
        sfx.bump();
        wrap.classList.remove('shake');
        void wrap.offsetWidth;
        wrap.classList.add('shake');
        save();
        if (hearts === 0) outOfHearts();
      },
      onClear: () => win(),
    });
    wrap.prepend(board.canvas);
    wrap.prepend(board.bg);
    el.board = board; // handy for testing from the console
    paintProgress(board.remaining());
    // the clock starts once the board has drawn in
    clockOn = false;
    lastTick = 0;
    setTimeout(() => { clockOn = true; lastTick = performance.now(); }, resume ? 300 : 1200);
  };

  const win = () => {
    over = true;
    const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
    store.updateGame(ID, (gg) => {
      gg.stars[n] = Math.max(gg.stars[n] || 0, stars);
      gg.unlocked = Math.max(gg.unlocked, n + 1);
      gg.current = null;
    });
    sfx.win();
    const last = n >= LEVEL_COUNT;
    const words = level.boss ? ['Boss defeated.'] : ['Worthy of Olympus.', 'Brilliant.', 'Superb.', 'Masterful.', 'Well fought.', 'Divine.'];
    const lede = [
      stars === 3 ? 'Not a single bump.' : stars === 2 ? 'Just one bump.' : `${mistakes} bumps along the way.`,
      timeLimitMs ? `${fmt(timeLeft)} left on the clock.` : '',
    ].join(' ');
    setTimeout(() => {
      const { el: s } = sheet(`
        <div class="k" style="color:var(--ink-3);font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:12px">${tierName(n)} · Level ${n}</div>
        <h2 style="margin-top:8px">${last ? 'All 1000 cleared!' : words[n % words.length]}</h2>
        <div class="big-stars">${[1, 2, 3].map((k) => STAR.replace('<svg', `<svg class="${k <= stars ? 'on' : ''}"`)).join('')}</div>
        <p class="lede">${lede}</p>
        <div class="stack">
          ${last ? '' : `<button class="btn btn-primary" data-next>${icon('play')}Next level</button>`}
          <button class="btn" data-map>All levels</button>
        </div>`, { dismissable: false });
      s.addEventListener('click', (e) => {
        if (e.target.closest('[data-next]')) { closeSheet(); go(`#/arrows/${n + 1}`, true); }
        if (e.target.closest('[data-map]')) { closeSheet(); go('#/arrows'); }
      });
    }, 900);
  };

  const restart = () => {
    over = false;
    hearts = maxLives;
    removed = [];
    mistakes = 0;
    streak = 0;
    timeLeft = timeLimitMs;
    lastWhole = null;
    store.updateGame(ID, (gg) => (gg.current = null));
    paintHearts();
    paintTimer();
    makeBoard();
  };

  const failCard = ({ title, lede, medal, rescue, rescueLabel }) => {
    over = true;
    board.locked = true;
    sfx.lose();
    setTimeout(() => {
      const k = store.hints(ID);
      const { el: s } = sheet(`
        <div class="medal" style="display:grid;place-items:center">${medal}</div>
        <h2>${title}</h2>
        <p class="lede">${lede}</p>
        <div class="stack">
          <button class="btn btn-primary" data-retry>${icon('restart')}Try again</button>
          ${k > 0 ? `<button class="btn" data-continue>${icon('bulb')}${rescueLabel}</button>` : `<button class="btn" disabled style="opacity:.55">${icon('clock')}${refill()}</button>`}
          <button class="btn btn-ghost" data-map>All levels</button>
        </div>`, { dismissable: false });
      s.addEventListener('click', (e) => {
        if (e.target.closest('[data-retry]')) { closeSheet(); restart(); }
        if (e.target.closest('[data-continue]') && store.useHint(ID)) {
          closeSheet();
          rescue();
          over = false;
          board.locked = false;
          paintHints(true);
          save();
          sfx.hint();
        }
        if (e.target.closest('[data-map]')) { closeSheet(); go('#/arrows'); }
      });
    }, 650);
  };

  const outOfHearts = () =>
    failCard({
      title: level.boss ? 'The boss wins this round' : 'Out of hearts',
      lede: level.boss ? 'Boss levels allow no mistakes. Study the board and try again.' : 'Take a breath and try this board again.',
      medal: HEART.replace('<svg', '<svg style="width:72px;height:72px;opacity:.35"').replace('<path', '<path fill="var(--danger)"'),
      rescueLabel: 'Use 1 hint for a heart',
      rescue: () => { hearts = 1; paintHearts(); },
    });

  const timeUp = () =>
    failCard({
      title: 'Time’s up',
      lede: `${board.remaining()} arrow${board.remaining() === 1 ? '' : 's'} still on the board.`,
      medal: icon('clock').replace('class="i"', 'class="i" style="width:72px;height:72px;opacity:.4"'),
      rescueLabel: `Use 1 hint for +${EXTRA_SECONDS} seconds`,
      rescue: () => { timeLeft = EXTRA_SECONDS * 1000; lastWhole = null; paintTimer(); },
    });

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return go('#/arrows');
    if (e.target.closest('[data-settings]')) return openSettings();
    if (e.target.closest('[data-zoom]')) return board.resetZoom();
    if (e.target.closest('[data-restart]')) {
      if (!removed.length && hearts === maxLives && timeLeft === timeLimitMs) return;
      sfx.tap();
      return restart();
    }
    if (e.target.closest('[data-hint]')) {
      if (over) return;
      if (board.hint != null && board.arrows[board.hint] && board.arrows[board.hint].state === 'idle') {
        return toast('Your hint is glowing on the board');
      }
      if (store.hints(ID) <= 0) return toast(refill());
      if (board.showHint() && store.useHint(ID)) {
        sfx.hint();
        paintHints(true);
        hideCoach();
      }
    }
  });

  // Mount the board once the screen has its size.
  nextFrame(() => {
    makeBoard();
    if (n >= 151 && !store.game(ID).zoomTipShown && window.innerWidth < 700) {
      store.updateGame(ID, (gg) => (gg.zoomTipShown = true));
      toast('Tip: pinch the board to zoom in');
    }
  });

  const offTheme = onTheme(() => board && board.readColors());
  const hintTimer = setInterval(() => paintHints(), 30000);

  return {
    el,
    destroy() {
      if (timeLimitMs && !over && clockOn) save();
      clearInterval(hintTimer);
      clock && clearInterval(clock);
      clockSaver && clearInterval(clockSaver);
      offTheme();
      board && board.destroy();
    },
  };
}
