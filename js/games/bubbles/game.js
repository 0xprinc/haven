// Canopy Pop — the jungle bubble shooter.
// Two screens: the level map (shared) and the play screen.

import { buildLevel, LEVEL_COUNT, tierFor, GEN_VERSION } from './levels.js';
import { Canopy } from './view.js';
import { levelMap, refillText, addSkip } from '../common/map.js';
import { openUpTo } from '../common/tiers.js';
import * as store from '../../store.js';
import { sfx } from '../../sound.js';
import { nextFrame, h, icon, STAR, sheet, closeSheet, toast, openSettings, onTheme } from '../../ui.js';

export const ID = 'bubbles';
const EXTRA_SHOTS = 5;

export const meta = { id: ID, name: 'Canopy Pop', kind: 'Jungle bubble shooter', total: LEVEL_COUNT };
export const mapCfg = { id: ID, name: 'Canopy Pop', kind: 'Jungle bubbles', route: 'bubbles', help: 'lifeline', helpIcon: 'spark' };
const refill = () => refillText(mapCfg);

export function progress() {
  const g = store.game(ID);
  const cleared = Object.keys(g.stars).length;
  const next = Math.min(g.unlocked, LEVEL_COUNT);
  const stars = Object.values(g.stars).reduce((s, v) => s + v, 0);
  return { cleared, next, stars, hints: store.hints(ID), tier: tierFor(next).name };
}

export function mapScreen(go) {
  return levelMap(go, mapCfg);
}

const COACH = {
  1: 'Drag to aim, let go to shoot',
  2: 'Match 3 or more of the same colour',
  3: 'Tap the small bubble to swap it',
  4: 'Bubbles that lose their branch fall too',
  6: 'Stuck? The sparkle gives you a rainbow bubble',
  13: 'New: free the baby birds!',
  40: 'Stones never pop — drop them instead',
  151: 'Shaped boards from here on',
};

export function playScreen(go, n) {
  n = Math.max(1, Math.min(LEVEL_COUNT, n | 0));
  const g = store.game(ID);
  if (n > openUpTo(g.unlocked)) {
    n = Math.min(g.unlocked, LEVEL_COUNT);
    history.replaceState(null, '', `#/bubbles/${n}`);
  }
  const level = buildLevel(n);
  const tier = tierFor(n);
  const cur = g.current;
  const resume = cur && cur.level === n && cur.v === GEN_VERSION ? cur.state : null;
  let over = false;

  const el = h(`<section class="screen play bubbles-play">
    <div class="wrap bar">
      <button class="icon-btn" data-back aria-label="Back to levels">${icon('grid')}</button>
      <div class="title">
        <h1>Level ${n}</h1>
        <div class="k" style="display:flex;align-items:center;gap:10px;margin-top:2px">${tier.name}<span class="goal" data-goal></span></div>
      </div>
      <div class="actions">
        <button class="icon-btn" data-restart aria-label="Restart level">${icon('restart')}</button>
        <button class="icon-btn" data-life aria-label="Rainbow bubble lifeline">${icon('spark')}<span class="badge"></span></button>
        <button class="icon-btn" data-settings aria-label="Settings">${icon('gear')}</button>
      </div>
    </div>
    <div class="board-wrap jungle"></div>
  </section>`);

  const wrap = el.querySelector('.board-wrap');
  const goalEl = el.querySelector('[data-goal]');
  const badge = el.querySelector('.badge');
  addSkip(wrap, n, mapCfg, go);

  const paintGoal = (info) => {
    if (info.goal === 'birds') {
      const freed = info.birdsTotal - info.birdsLeft;
      goalEl.innerHTML = `${icon('bird')}<b>${freed}</b>&thinsp;/&thinsp;${info.birdsTotal}`;
    } else {
      goalEl.innerHTML = `<b>${info.bubblesLeft}</b>&nbsp;left`;
    }
  };
  const paintLife = (pop = false) => {
    const k = store.hints(ID);
    badge.textContent = k;
    badge.classList.toggle('empty', k === 0);
    if (pop) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
  };
  paintLife();

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

  let view = null;
  const make = (saved) => {
    view && view.destroy();
    over = false;
    view = new Canopy(wrap, level, {
      saved,
      onSave: (state) => store.updateGame(ID, (gg) => (gg.current = { level: n, v: GEN_VERSION, state })),
      onUpdate: (info) => { paintGoal(info); hideCoach(); },
      onWin: (info) => win(info),
      onLose: () => outOfShots(),
    });
    el.view = view;
    if (coach) wrap.append(coach);
    const sk = wrap.querySelector('.skip-btn');
    if (sk) wrap.append(sk);
    paintGoal(view.info());
  };

  const win = (info) => {
    over = true;
    const ratio = info.shots / level.shots;
    const stars = ratio >= 0.35 ? 3 : ratio >= 0.15 ? 2 : 1;
    store.updateGame(ID, (gg) => {
      gg.stars[n] = Math.max(gg.stars[n] || 0, stars);
      gg.unlocked = Math.max(gg.unlocked, n + 1);
      gg.current = null;
    });
    const last = n >= LEVEL_COUNT;
    const title = last ? 'All 1000 cleared!' : level.goal === 'birds' ? 'The birds are free!' : 'Canopy cleared!';
    const { el: s } = sheet(`
      <div class="k" style="color:var(--ink-3);font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:12px">${tier.name} · Level ${n}</div>
      <h2 style="margin-top:8px">${title}</h2>
      <div class="big-stars">${[1, 2, 3].map((k) => STAR.replace('<svg', `<svg class="${k <= stars ? 'on' : ''}"`)).join('')}</div>
      <p class="lede">${info.shots > 0 ? `${info.shots} shot${info.shots === 1 ? '' : 's'} to spare.` : 'Right on the last shot!'}</p>
      <div class="stack">
        ${last ? '' : `<button class="btn btn-primary" data-next>${icon('play')}Next level</button>`}
        <button class="btn" data-map>All levels</button>
      </div>`, { dismissable: false });
    s.addEventListener('click', (e) => {
      if (e.target.closest('[data-next]')) { closeSheet(); go(`#/bubbles/${n + 1}`, true); }
      if (e.target.closest('[data-map]')) { closeSheet(); go('#/bubbles'); }
    });
  };

  const restart = () => {
    store.updateGame(ID, (gg) => (gg.current = null));
    make(null);
  };

  const outOfShots = () => {
    over = true;
    sfx.lose();
    const k = store.hints(ID);
    const info = view.info();
    const left = info.goal === 'birds' ? `${info.birdsLeft} bird${info.birdsLeft === 1 ? '' : 's'} still waiting.` : `${info.bubblesLeft} bubbles left.`;
    const { el: s } = sheet(`
      <h2>Out of shots</h2>
      <p class="lede">So close — ${left}</p>
      <div class="stack">
        ${k > 0 ? `<button class="btn btn-primary" data-more>${icon('spark')}Use 1 lifeline for +${EXTRA_SHOTS} shots</button>` : ''}
        <button class="btn ${k > 0 ? '' : 'btn-primary'}" data-retry>${icon('restart')}Try again</button>
        ${k > 0 ? '' : `<button class="btn" disabled style="opacity:.55">${icon('clock')}${refill()}</button>`}
        <button class="btn btn-ghost" data-map>All levels</button>
      </div>`, { dismissable: false });
    s.addEventListener('click', (e) => {
      if (e.target.closest('[data-retry]')) { closeSheet(); restart(); }
      if (e.target.closest('[data-more]') && store.useHint(ID)) {
        closeSheet();
        over = false;
        view.addShots(EXTRA_SHOTS);
        paintLife(true);
        sfx.hint();
      }
      if (e.target.closest('[data-map]')) { closeSheet(); go('#/bubbles'); }
    });
  };

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return go('#/bubbles');
    if (e.target.closest('[data-settings]')) return openSettings();
    if (e.target.closest('[data-restart]')) { sfx.tap(); return restart(); }
    if (e.target.closest('[data-life]')) {
      if (over || !view) return;
      if (view.st.queue[0] === 7) return toast('A rainbow bubble is ready to shoot');
      if (store.hints(ID) <= 0) return toast(refill());
      if (view.loadRainbow() && store.useHint(ID)) {
        sfx.hint();
        paintLife(true);
        toast('Rainbow bubble: it matches any colour');
      }
    }
  });

  nextFrame(() => make(resume));
  const offTheme = onTheme(() => view && view.themeChanged());
  const timer = setInterval(() => paintLife(), 30000);

  return {
    el,
    destroy() {
      clearInterval(timer);
      offTheme();
      view && view.destroy();
    },
  };
}
