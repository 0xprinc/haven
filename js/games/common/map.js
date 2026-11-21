// The level map shared by every game: six tiers, 1000 tiles, stars.

import { LEVEL_COUNT, TIERS, openUpTo, canSkip } from './tiers.js';
import * as store from '../../store.js';
import { sfx } from '../../sound.js';
import { nextFrame, h, icon, STAR, sheet, closeSheet, toast, openSettings } from '../../ui.js';

// cfg: { id, name, kind, route, help: 'hint' | 'lifeline', helpIcon, open? }
// open: levels 1..open are playable from the start (default 151).
export function refillText(cfg) {
  const m = Math.max(1, Math.ceil(store.msToRefill() / 60000));
  return `${cfg.help === 'lifeline' ? 'Lifelines' : 'Hints'} refill in ${m} min`;
}

export function levelMap(go, cfg) {
  const ID = cfg.id;
  const g = store.game(ID);
  const unlocked = Math.min(g.unlocked, LEVEL_COUNT);
  const cleared = Object.keys(g.stars).length;
  const allDone = g.unlocked > LEVEL_COUNT;
  const open = openUpTo(unlocked, cfg.open);

  const tiers = TIERS.map((t) => {
    let stars = 0, max = 0, tiles = '';
    for (let n = t.from; n <= t.to; n++) {
      const st = g.stars[n] || 0;
      stars += st;
      max += 3;
      const isCur = n === unlocked && !allDone;
      const locked = n > open;
      const cls = locked ? 'locked' : isCur ? 'current' : st ? 'done' : '';
      const dots = st ? `<span class="s">${[1, 2, 3].map((k) => `<i class="${k <= st ? 'on' : ''}"></i>`).join('')}</span>` : '';
      tiles += locked
        ? `<button class="lvl locked" tabindex="-1" aria-label="Level ${n}, locked" data-locked>${n}</button>`
        : `<button class="lvl ${cls}" data-level="${n}" aria-label="Level ${n}${st ? `, ${st} stars` : ''}">${n}${dots}</button>`;
    }
    const locked = t.from > open;
    const tname = (cfg.tierNames && cfg.tierNames[t.id]) || t.name;
    return `<section class="tier ${locked ? 'locked' : ''}" aria-label="${tname}">
      <div class="tier-head">
        <div><h2>${tname}</h2><div class="range">Levels ${t.from}–${t.to}${canSkip(t.to, cfg.open) ? ' · open to skip' : ''}</div></div>
        <div class="stars">${STAR}${stars} / ${max}</div>
      </div>
      <div class="level-grid">${tiles}</div>
    </section>`;
  }).join('');

  const el = h(`<section class="screen">
    <div class="wrap bar">
      <button class="icon-btn" data-back aria-label="Back to games">${icon('back')}</button>
      <div class="title"><div class="k">${cfg.kind}</div><h1>${cfg.name}</h1></div>
      <div class="actions">
        <span class="chip" data-hints>${icon(cfg.helpIcon || 'bulb')}<span></span></span>
        <button class="icon-btn" data-settings aria-label="Settings">${icon('gear')}</button>
      </div>
    </div>
    <div class="scroll">
      <div class="wrap">
        <div class="map-hero">
          <div><div class="big">${cleared}<small> / ${LEVEL_COUNT}</small></div><div class="lbl">levels cleared</div></div>
        </div>
        ${tiers}
        <div class="map-cta">
          <button class="btn btn-primary" data-play>${icon('play')}${allDone ? 'All 1000 done — play again' : `Play level ${unlocked}`}</button>
        </div>
      </div>
    </div>
  </section>`);

  const hintChip = el.querySelector('[data-hints] span');
  const paintHints = () => {
    const n = store.hints(ID);
    hintChip.textContent = n > 0 ? `${n} ${cfg.help}${n === 1 ? '' : 's'}` : refillText(cfg).replace(/^\w+ refill/, 'Refill');
  };
  paintHints();
  const timer = setInterval(paintHints, 20000);

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return go('#/');
    if (e.target.closest('[data-settings]')) return openResetSettings(go, cfg);
    const l = e.target.closest('[data-level]');
    if (l) { sfx.tap(); return go(`#/${cfg.route}/${l.dataset.level}`); }
    if (e.target.closest('[data-locked]')) return toast('Clear the levels before this one to unlock it');
    if (e.target.closest('[data-play]')) { sfx.tap(); return go(`#/${cfg.route}/${allDone ? 1 : unlocked}`); }
  });

  // Bring the current level into view.
  nextFrame(() => {
    const cur = el.querySelector('.lvl.current');
    const scroller = el.querySelector('.scroll');
    if (cur && scroller) {
      const r = cur.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
      scroller.scrollTop += r.top - sr.top - sr.height * 0.4;
    }
  });

  return { el, destroy: () => clearInterval(timer) };
}

function openResetSettings(go, cfg) {
  openSettings({
    extra: `<div class="set-group"><div class="row">
      <div><div class="t">${cfg.name} progress</div><div class="d">Start again from level 1</div></div>
      <button class="btn btn-ghost btn-danger" data-reset style="min-height:44px;padding:0 18px">Reset</button>
    </div></div>`,
    onExtra: (e) => {
      if (!e.target.closest('[data-reset]')) return;
      const { el } = sheet(`<h2>Start over?</h2>
        <p class="lede">This clears all ${LEVEL_COUNT} levels of ${cfg.name} on this device. It can't be undone.</p>
        <div class="stack">
          <button class="btn" data-keep>Keep my progress</button>
          <button class="btn btn-ghost btn-danger" data-yes>Yes, start over</button>
        </div>`);
      el.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-keep]')) closeSheet();
        if (ev.target.closest('[data-yes]')) {
          store.resetGame(ID);
          closeSheet();
          go(`#/${cfg.route}`, true);
        }
      });
    },
  });
}


// A small "Skip" pill for Beginner and Easy levels.
// Skipping opens the next level without giving stars.
export function addSkip(wrap, n, cfg, go) {
  if (!canSkip(n, cfg.open)) return;
  const b = h(`<button class="skip-btn" aria-label="Skip level ${n}">Skip level${icon('skip')}</button>`);
  b.addEventListener('click', () => {
    store.updateGame(cfg.id, (g) => {
      g.unlocked = Math.max(g.unlocked, n + 1);
      g.current = null;
    });
    sfx.tap();
    toast(`Skipped level ${n}`);
    go(`#/${cfg.route}/${n + 1}`, true);
  });
  wrap.append(b);
}
