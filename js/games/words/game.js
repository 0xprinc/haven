// The Lost Words — a word search story.
// Screens: the chapter map and the play screen.
// Story scenes play before levels 1 and 13, and after level 25.

import { CHAPTERS, TOTAL, READY, chapterFor, levelDef, SCENES_AT } from './chapters.js';
import { buildBoard, cellsOf } from './grid.js';
import { WordBoard } from './board.js';
import { Fx } from './fx.js';
import { kikoSVG, portrait, NAMES, Actor } from './cast.js';
import { backdrop } from './art.js';
import { wsfx } from './audio.js';
import { playScene } from './story.js';
import * as store from '../../store.js';
import { refillText } from '../common/map.js';
import { h, icon, STAR, sheet, closeSheet, toast, openSettings, esc } from '../../ui.js';

export const ID = 'words';
const SAVE_V = 1;
const GOOD_BONUS = 4;   // seconds a found word adds to the lantern
const BAD_COST = 6;     // seconds a wrong pick takes away
const RELIGHT = 30;     // seconds one hint buys when the lantern goes out

export const meta = { id: ID, name: 'The Lost Words', kind: 'Word search story', total: TOTAL };
export const mapCfg = { id: ID, name: 'The Lost Words', kind: 'Word search story', route: 'words', help: 'hint', helpIcon: 'bulb' };

export function progress() {
  const g = store.game(ID);
  const cleared = Object.keys(g.stars).length;
  const next = Math.min(g.unlocked, READY);
  const stars = Object.values(g.stars).reduce((s, v) => s + v, 0);
  return { cleared, next, stars, hints: store.hints(ID), tier: chapterFor(next).name };
}

function seen(id) {
  const g = store.game(ID);
  return !!(g.seen && g.seen[id]);
}
function markSeen(id) {
  store.updateGame(ID, (g) => ((g.seen = g.seen || {})[id] = 1));
}

// Our own look: set while a Lost Words screen is up.
function themeOn() {
  document.documentElement.dataset.game = 'words';
}
function themeOff() {
  // The next screen may be ours too (map to level): keep the look then.
  if (!location.hash.startsWith('#/words')) delete document.documentElement.dataset.game;
}

/* ---------- Chapter map ---------- */

export function mapScreen(go) {
  themeOn();
  const g = store.game(ID);
  const unlocked = Math.min(g.unlocked, READY);
  const chapters = CHAPTERS.map((ch) => {
    if (!ch.ready) {
      return `<section class="ch-card soon">
        <div class="ch-num">${ch.id}</div>
        <div class="ch-body"><div class="ch-k">Chapter ${ch.id}</div><h2>${ch.name}</h2><p>Coming soon</p></div>
      </section>`;
    }
    let tiles = '', stars = 0;
    for (let n = ch.from; n <= ch.to; n++) {
      const st = g.stars[n] || 0;
      stars += st;
      const locked = n > unlocked;
      const cur = n === unlocked && !g.stars[n];
      const boss = levelDef(n).boss;
      tiles += locked
        ? `<button class="ch-lvl locked ${boss ? 'boss' : ''}" data-locked aria-label="Level ${n}, locked">${n}</button>`
        : `<button class="ch-lvl ${cur ? 'current' : st ? 'done' : ''} ${boss ? 'boss' : ''}" data-level="${n}" aria-label="Level ${n}">${n}${st ? `<span class="s">${'●'.repeat(st)}</span>` : ''}</button>`;
    }
    const scenes = Object.entries({ ...SCENES_AT.before, ...SCENES_AT.after })
      .filter(([n]) => +n >= ch.from && +n <= ch.to)
      .map(([, id]) => id)
      .filter(seen);
    return `<section class="ch-card">
      <div class="ch-num">${ch.id}</div>
      <div class="ch-body">
        <div class="ch-k">Chapter ${ch.id} · ${STAR}${stars} / ${(ch.to - ch.from + 1) * 3}</div>
        <h2>${ch.name}</h2>
        <div class="ch-grid">${tiles}</div>
        ${scenes.length ? `<div class="ch-stories">${scenes.map((id, i) => `<button class="ws-btn ghost" data-scene="${id}">${icon('play')}Story ${i + 1}</button>`).join('')}</div>` : ''}
      </div>
    </section>`;
  }).join('');

  const el = h(`<section class="screen words-screen">
    <div class="ws-bg">${backdrop('shrine')}</div>
    <div class="wrap bar">
      <button class="icon-btn" data-back aria-label="Back to games">${icon('back')}</button>
      <div class="title"><div class="k">Kiko's journey</div><h1>The Lost Words</h1></div>
      <div class="actions"><button class="icon-btn" data-settings aria-label="Settings">${icon('gear')}</button></div>
    </div>
    <div class="scroll"><div class="wrap ws-map">
      <div class="ws-hero">${kikoSVG('hero-kiko')}<div><div class="big">${Object.keys(g.stars).length}<small> / ${TOTAL}</small></div><div class="lbl">scroll pieces found</div></div></div>
      ${chapters}
      <div class="map-cta"><button class="ws-btn" data-play>${icon('play')}Play level ${unlocked}</button></div>
    </div></div>
  </section>`);
  const kiko = new Actor(el.querySelector('.hero-kiko'));

  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-back]')) return go('#/');
    if (e.target.closest('[data-settings]')) return openSettings();
    const l = e.target.closest('[data-level]');
    if (l) return go(`#/words/${l.dataset.level}`);
    if (e.target.closest('[data-locked]')) return toast('Finish the level before it first');
    if (e.target.closest('[data-play]')) return go(`#/words/${unlocked}`);
    const s = e.target.closest('[data-scene]');
    if (s) await playScene(s.dataset.scene);
  });

  return { el, destroy() { kiko.destroy(); themeOff(); } };
}

/* ---------- Play ---------- */

const LINES = {
  good: ['Got it!', 'Yes!', 'Another one!', 'Found you!', 'Back to the scroll!'],
  streak: ['I\'m on a roll!', 'Whoosh!', 'So fast!'],
  bad: ['Oops…', 'Not that one.', 'Hmm, no.', 'My lantern flickered!'],
  almost: ['So close!', 'Almost!', 'Nearly…'],
  low: ['My lantern is fading!', 'Hurry, hurry!'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function playScreen(go, n) {
  themeOn();
  n = Math.max(1, Math.min(READY, n | 0));
  const g = store.game(ID);
  if (n > g.unlocked) {
    n = Math.min(g.unlocked, READY);
    history.replaceState(null, '', `#/words/${n}`);
  }
  const def = levelDef(n);
  const board = buildBoard(def);
  const ch = chapterFor(n);
  const saved = g.current && g.current.level === n && g.current.v === SAVE_V ? g.current.state : null;

  const st = {
    found: new Set(saved ? saved.found : []),
    bonus: new Set(saved ? saved.bonus : []),
    time: saved ? saved.time : def.time,
    mistakes: saved ? saved.mistakes : 0,
    hints: saved ? saved.hints : {},
    oddWrong: saved ? saved.oddWrong || [] : [],
    phase: 'play', // play | odd | done | out
  };
  let running = false;
  let streak = 0, lastFind = 0, lowSaid = false, lastTouch = Date.now();

  const el = h(`<section class="screen play words-play">
    <div class="ws-bg">${backdrop(ch.place)}</div>
    <div class="wrap bar">
      <button class="icon-btn" data-back aria-label="All levels">${icon('grid')}</button>
      <div class="title"><div class="k">Chapter ${ch.id} · ${esc(ch.name)}</div><h1>Level ${n}${def.boss ? '<span class="boss-tag">Boss</span>' : ''}</h1></div>
      <div class="actions">
        <button class="icon-btn" data-restart aria-label="Restart level">${icon('restart')}</button>
        <button class="icon-btn" data-hint aria-label="Fox-fire hint">${icon('bulb')}<span class="badge"></span></button>
        <button class="icon-btn" data-settings aria-label="Settings">${icon('gear')}</button>
      </div>
    </div>
    <div class="ws-stage">
      <div class="ws-talk">
        <div class="ws-hero-box">${kikoSVG('play-kiko')}</div>
        <div class="ws-lantern" data-lantern>
          <svg viewBox="0 0 60 90" aria-hidden="true">
            <line x1="30" y1="0" x2="30" y2="10" class="l-str"/>
            <rect x="16" y="8" width="28" height="7" rx="2" class="l-cap"/>
            <ellipse cx="30" cy="46" rx="24" ry="31" class="l-body"/>
            <ellipse cx="30" cy="46" rx="24" ry="31" class="l-light"/>
            <path d="M8 34h44M7 46h46M8 58h44" class="l-rib"/>
            <path class="l-flame" d="M30 34C36 42 37 50 30 56C23 50 24 42 30 34Z"/>
            <rect x="16" y="76" width="28" height="7" rx="2" class="l-cap"/>
          </svg>
          <b data-time></b>
        </div>
        <div class="ws-bubble" data-bubble><div class="who"></div><p></p></div>
      </div>
      <div class="ws-boardbox"></div>
      <div class="ws-clues" data-clues></div>
    </div>
  </section>`);

  const fx = new Fx(el);
  const kikoEl = el.querySelector('.play-kiko');
  const kiko = new Actor(kikoEl);
  const badge = el.querySelector('.badge');
  const timeEl = el.querySelector('[data-time]');
  const lanternEl = el.querySelector('[data-lantern]');
  const bubble = el.querySelector('[data-bubble]');
  const cluesEl = el.querySelector('[data-clues]');

  /* --- speech bubble --- */
  let sayTimer = null;
  const say = (who, text, ms = 0) => {
    clearTimeout(sayTimer);
    bubble.querySelector('.who').innerHTML = `<span class="face">${portrait(who)}</span>${NAMES[who] || ''}`;
    const p = bubble.querySelector('p');
    p.textContent = text;
    bubble.dataset.who = who;
    bubble.classList.remove('in');
    void bubble.offsetWidth;
    bubble.classList.add('in');
    if (who === 'kiko') kiko.feel('talk', Math.min(2200, 300 + text.length * 40));
    if (ms) sayTimer = setTimeout(() => say(def.say[0], def.say[1]), ms);
  };

  /* --- clue panel --- */
  const slot = (w, filled) => {
    const k = filled ? w.length : st.hints[w] || 0;
    return `<span class="slot ${filled ? 'got' : ''}" data-w="${w}">${[...w].map((ch, i) => `<i>${i < k ? ch : ''}</i>`).join('')}</span>`;
  };
  const nextScroll = () => def.targets.find((w) => !st.found.has(w));

  const paintClues = () => {
    const f = (w) => st.found.has(w);
    let html = '';
    if (def.type === 'classic' || def.type === 'secret' || def.type === 'odd') {
      html = `<div class="ws-list">${def.targets.map((w) => `<button class="tag ${f(w) ? 'got' : ''} ${st.oddWrong.includes(w) ? 'wrong' : ''}" data-w="${w}" ${st.phase === 'odd' ? '' : 'tabindex="-1"'}>${w}</button>`).join('')}</div>`;
      if (def.type === 'odd') html = `<p class="ws-ask ${st.phase === 'odd' ? 'now' : ''}">${st.phase === 'odd' ? esc(def.question) : 'Find all six. One of them does not belong.'}</p>` + html;
      if (def.type === 'secret') {
        const words = def.secret.split(' ');
        html += `<div class="ws-secret"><div class="lbl">Secret message</div><div class="msg">${words.map((wd) => `<span class="sw">${[...wd].map(() => '<i></i>').join('')}</span>`).join('')}</div></div>`;
      }
    } else if (def.type === 'riddle') {
      html = def.clues.map(([w, clue]) => `<div class="ws-riddle ${f(w) ? 'got' : ''}"><p>${esc(clue)}</p>${slot(w, f(w))}</div>`).join('');
    } else if (def.type === 'sentence') {
      html = `<p class="ws-sentence">${esc(def.text).replace(/\{(\w+)\}/g, (_, w) => slot(w, f(w)))}</p>`;
    } else if (def.type === 'scroll') {
      const nx = nextScroll();
      html = `<div class="ws-scroll">${def.lines.map((line, i) => {
        const w = def.targets[i];
        const cls = f(w) ? 'done' : w === nx ? 'now' : 'later';
        return `<p class="${cls}"><span class="no">${i + 1}</span>${cls === 'later' ? '<span class="veil">· · ·</span>' : esc(line).replace(/\{(\w+)\}/, () => slot(w, f(w)))}</p>`;
      }).join('')}</div>`;
    } else if (def.type === 'count') {
      const got = def.targets.filter(f);
      html = `<div class="ws-count"><p>Find <b>${def.targets.length}</b> ${esc(def.label)}</p><div class="ws-list">${def.targets.map((_, i) => got[i] ? `<span class="tag got">${got[i]}</span>` : `<span class="tag open">?</span>`).join('')}</div></div>`;
    }
    if (def.bonus.length && st.bonus.size) html += `<div class="ws-bonus">Pon's bonus: ${[...st.bonus].join(', ')}</div>`;
    cluesEl.innerHTML = html;
  };

  // Where a found word flies to in the panel.
  const slotFor = (w) => cluesEl.querySelector(`[data-w="${w}"]`) || cluesEl.querySelector('.tag.open') || cluesEl;

  const flyWord = (w, from, to, done) => {
    const r = to.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'ws-fly';
    d.textContent = w;
    document.body.append(d);
    const dx = r.left + r.width / 2 - from[0], dy = r.top + r.height / 2 - from[1];
    d.style.left = `${from[0]}px`;
    d.style.top = `${from[1]}px`;
    const a = d.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 60}px)) scale(1.1)`, opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.7)`, opacity: 0.2 },
      ],
      { duration: 620, easing: 'cubic-bezier(.3,.7,.3,1)' }
    );
    a.onfinish = () => { d.remove(); done(); };
  };

  const stamp = (w) => {
    const s = slotFor(w);
    s.classList.add('stamp');
    setTimeout(() => s.classList.remove('stamp'), 500);
  };

  /* --- lantern timer --- */
  const paintTime = () => {
    const t = Math.max(0, st.time);
    const frac = Math.max(0, Math.min(1, t / def.time));
    const s = Math.ceil(t);
    timeEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    lanternEl.style.setProperty('--life', frac.toFixed(3));
    lanternEl.classList.toggle('low', t <= 10 && t > 0);
  };
  const addTime = (dt, at) => {
    st.time = Math.max(0, st.time + dt);
    paintTime();
    lanternEl.classList.remove('flare', 'flicker');
    void lanternEl.offsetWidth;
    lanternEl.classList.add(dt > 0 ? 'flare' : 'flicker');
    if (at) fx.float(at[0], at[1] - 30, `${dt > 0 ? '+' : '−'}${Math.abs(dt)}s`, dt > 0 ? 'plus' : 'minus');
  };

  let lastTick = performance.now();
  let lastSecond = Math.ceil(st.time);
  const clock = setInterval(() => {
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (!running || document.hidden || document.querySelector('.sheet-back')) return;
    st.time -= Math.min(dt, 0.25);
    const sec = Math.ceil(st.time);
    if (sec !== lastSecond) {
      lastSecond = sec;
      if (sec <= 10 && sec > 0) wsfx.tick();
      if (sec % 5 === 0) save();
    }
    if (st.time <= 10 && !lowSaid) { lowSaid = true; say('kiko', pick(LINES.low), 2500); }
    if (Date.now() - lastTouch > 14000 && !kiko.mood) { lastTouch = Date.now(); kiko.feel('yawn', 1600); }
    paintTime();
    if (st.time <= 0) lanternOut();
  }, 100);

  /* --- hints --- */
  const paintHints = (pop = false) => {
    const k = store.hints(ID);
    badge.textContent = k;
    badge.classList.toggle('empty', k === 0);
    if (pop) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
  };
  const hintCells = () => {
    const cells = [];
    for (const [w, k] of Object.entries(st.hints)) {
      if (st.found.has(w)) continue;
      cellsOf(board.places[w]).slice(0, k).forEach((c) => cells.push(c));
    }
    return cells;
  };

  /* --- saving --- */
  const save = () => {
    if (st.phase === 'done') return;
    store.updateGame(ID, (gg) => (gg.current = {
      level: n, v: SAVE_V,
      state: { found: [...st.found], bonus: [...st.bonus], time: Math.max(1, st.time), mistakes: st.mistakes, hints: st.hints, oddWrong: st.oddWrong },
    }));
  };

  /* --- judging a pick --- */
  const isNear = (word) => {
    const rev = [...word].reverse().join('');
    return def.targets.some((t) => {
      if (st.found.has(t)) return false;
      for (const s of [word, rev]) {
        if (s.length >= 3 && (t.startsWith(s) || s.startsWith(t) || s.endsWith(t) || t.endsWith(s))) return true;
        if (s.length === t.length && [...s].filter((ch, i) => ch !== t[i]).length === 1) return true;
      }
      return false;
    });
  };

  const judge = (word, path) => {
    if (st.phase !== 'play') return 'ignore';
    lastTouch = Date.now();
    const rev = [...word].reverse().join('');
    const hit = (w) => w === word || w === rev;
    const at = wb.pathCentre(path);

    const t = def.targets.find(hit);
    if (t) {
      if (st.found.has(t)) { wsfx.almost(); kiko.feel('think'); toast(`You already found ${t}`); return 'almost'; }
      if (def.type === 'scroll' && t !== nextScroll()) {
        wsfx.almost();
        kiko.feel('think');
        say('kiko', 'That word comes later in the story. Line by line!', 2600);
        return 'almost';
      }
      found(t, at);
      return 'good';
    }
    const b = def.bonus.find(hit);
    if (b) {
      if (st.bonus.has(b)) { wsfx.almost(); return 'almost'; }
      st.bonus.add(b);
      wb.markFound(board.extra[b], { bonus: true });
      wsfx.bonus();
      fx.sparks(at[0], at[1], 24);
      addTime(8, at);
      say('pon', `Hey! You found my word ${b}. Fine, have 8 seconds.`, 2600);
      paintClues();
      save();
      return 'bonus';
    }
    if (def.decoys.find(hit)) {
      bad(at, 'pon');
      say('pon', 'Hee hee! That one was a fake!', 2400);
      return 'bad';
    }
    if (word.length < 3) return 'ignore';
    if (isNear(word)) {
      wsfx.almost();
      kiko.feel('think');
      say('kiko', pick(LINES.almost), 1600);
      return 'almost';
    }
    bad(at);
    return 'bad';
  };

  const bad = (at, who = 'kiko') => {
    st.mistakes++;
    streak = 0;
    wsfx.bad();
    wb.shake();
    fx.ink(at[0], at[1], 8, getComputedStyle(el).getPropertyValue('--ws-ink').trim());
    kiko.feel('sad', 1400);
    addTime(-BAD_COST, at);
    if (who === 'kiko' && Math.random() < 0.6) say('kiko', pick(LINES.bad), 1600);
    save();
    if (st.time <= 0) lanternOut();
  };

  const found = (w, at) => {
    st.found.add(w);
    const now = Date.now();
    streak = now - lastFind < 7000 ? streak + 1 : 0;
    lastFind = now;
    wb.markFound(board.places[w]);
    wb.setHints(hintCells());
    wsfx.good(streak);
    fx.petals(at[0], at[1], 16 + streak * 6, 1 + streak * 0.15);
    fx.sparks(at[0], at[1], 12);
    addTime(GOOD_BONUS, at);
    kiko.feel(streak >= 2 ? 'cheer' : 'happy', streak >= 2 ? 1100 : 700);
    if (streak >= 1) fx.float(at[0], at[1] - 64, `Streak ×${streak + 1}`, 'streak');
    if (streak >= 2) say('kiko', pick(LINES.streak), 1500);
    else if (Math.random() < 0.3) say('kiko', pick(LINES.good), 1400);
    const target = def.type === 'count' ? cluesEl.querySelector('.tag.open') || cluesEl : slotFor(w);
    flyWord(w, at, target, () => { paintClues(); stamp(w); });
    save();
    if (def.targets.every((x) => st.found.has(x))) setTimeout(allFound, 700);
  };

  /* --- end of level --- */
  const allFound = async () => {
    if (def.type === 'odd') {
      st.phase = 'odd';
      paintClues();
      say('kiko', def.question);
      return;
    }
    if (def.type === 'secret') {
      st.phase = 'done';
      running = false;
      const boxes = [...cluesEl.querySelectorAll('.ws-secret i')];
      const letters = def.secret.replace(/[^A-Z]/g, '');
      await wb.revealSecret(board.secretCells, (i) => {
        if (boxes[i]) { boxes[i].textContent = letters[i]; boxes[i].classList.add('on'); }
        wsfx.letter(i % 12);
      });
      cluesEl.querySelector('.ws-secret').classList.add('done');
      say('inari', `“${def.secret.charAt(0)}${def.secret.slice(1).toLowerCase()}.”`);
      setTimeout(win, 1400);
      return;
    }
    win();
  };

  const oddPick = (w) => {
    if (st.phase !== 'odd' || st.oddWrong.includes(w)) return;
    const tagEl = cluesEl.querySelector(`[data-w="${w}"]`);
    const r = tagEl.getBoundingClientRect();
    const at = [r.left + r.width / 2, r.top + r.height / 2];
    if (w === def.odd) {
      tagEl.classList.add('right');
      fx.petals(at[0], at[1], 30, 1.2);
      say('kiko', `Yes! ${w} doesn't belong!`);
      setTimeout(win, 900);
    } else {
      st.oddWrong.push(w);
      bad(at);
      paintClues();
    }
  };

  const starsFor = () => {
    const frac = st.time / def.time;
    if (frac >= 0.4 && st.mistakes <= 1) return 3;
    if (frac >= 0.15) return 2;
    return 1;
  };

  const win = () => {
    st.phase = 'done';
    running = false;
    const stars = starsFor();
    store.updateGame(ID, (gg) => {
      gg.stars[n] = Math.max(gg.stars[n] || 0, stars);
      gg.unlocked = Math.max(gg.unlocked, n + 1);
      gg.current = null;
    });
    wb.wave();
    wsfx.win();
    kiko.feel('cheer', 2400);
    const r = wb.el.getBoundingClientRect();
    fx.petals(r.left + r.width / 2, r.top + r.height / 3, 60, 1.6);
    const after = SCENES_AT.after[n];
    setTimeout(() => {
      const last = n >= READY;
      const { el: s } = sheet(`
        <div class="ws-sheet-k">Chapter ${ch.id} · Level ${n}</div>
        <h2>${def.boss ? 'Pon is beaten!' : 'Scroll piece found!'}</h2>
        <div class="big-stars">${[1, 2, 3].map((k) => STAR.replace('<svg', `<svg class="${k <= stars ? 'on' : ''}"`)).join('')}</div>
        <p class="lede">${Math.ceil(st.time)}s of lantern left${st.mistakes ? ` · ${st.mistakes} slip${st.mistakes === 1 ? '' : 's'}` : ' · no slips'}.</p>
        <div class="stack">
          ${after ? `<button class="btn btn-primary" data-story>${icon('play')}Continue the story</button>` : last ? '' : `<button class="btn btn-primary" data-next>${icon('play')}Next level</button>`}
          <button class="btn" data-map>All levels</button>
        </div>`, { dismissable: false });
      s.addEventListener('click', async (e) => {
        if (e.target.closest('[data-next]')) { closeSheet(); go(`#/words/${n + 1}`, true); }
        if (e.target.closest('[data-map]')) { closeSheet(); go('#/words'); }
        if (e.target.closest('[data-story]')) {
          closeSheet();
          await playScene(after);
          markSeen(after);
          chapterDone();
        }
      });
    }, 1300);
  };

  const chapterDone = () => {
    const more = n < READY;
    const { el: s } = sheet(`
      <div class="ws-sheet-k">Chapter ${ch.id} complete</div>
      <h2>${esc(ch.name)} is safe</h2>
      <p class="lede">${more ? 'The journey goes on.' : 'Chapter 2, The Whispering River, is coming soon. Kiko and Pon will be waiting.'}</p>
      <div class="stack">
        ${more ? `<button class="btn btn-primary" data-next>${icon('play')}Next level</button>` : ''}
        <button class="btn ${more ? '' : 'btn-primary'}" data-map>All levels</button>
      </div>`, { dismissable: false });
    s.addEventListener('click', (e) => {
      if (e.target.closest('[data-next]')) { closeSheet(); go(`#/words/${n + 1}`, true); }
      if (e.target.closest('[data-map]')) { closeSheet(); go('#/words'); }
    });
  };

  const lanternOut = () => {
    if (st.phase !== 'play' && st.phase !== 'odd') return;
    const phase = st.phase;
    st.phase = 'out';
    running = false;
    st.time = 0;
    paintTime();
    lanternEl.classList.add('out');
    wsfx.out();
    kiko.feel('sad', 0);
    save();
    setTimeout(() => {
      const k = store.hints(ID);
      const { el: s } = sheet(`
        <h2>The lantern went out</h2>
        <p class="lede">${def.targets.length - [...st.found].filter((w) => def.targets.includes(w)).length || 'The last'} word${def.targets.length - st.found.size === 1 ? '' : 's'} still hiding in the dark.</p>
        <div class="stack">
          ${k > 0 ? `<button class="btn btn-primary" data-relight>${icon('bulb')}Relight with 1 hint (+${RELIGHT}s)</button>` : ''}
          <button class="btn ${k > 0 ? '' : 'btn-primary'}" data-retry>${icon('restart')}Try again</button>
          ${k > 0 ? '' : `<button class="btn" disabled style="opacity:.55">${icon('clock')}${refillText(mapCfg)}</button>`}
          <button class="btn btn-ghost" data-map>All levels</button>
        </div>`, { dismissable: false });
      s.addEventListener('click', (e) => {
        if (e.target.closest('[data-retry]')) { closeSheet(); restart(); }
        if (e.target.closest('[data-relight]') && store.useHint(ID)) {
          closeSheet();
          st.phase = phase;
          lanternEl.classList.remove('out');
          kiko.calm();
          addTime(RELIGHT);
          wsfx.relight();
          paintHints(true);
          lowSaid = false;
          running = true;
          save();
        }
        if (e.target.closest('[data-map]')) { closeSheet(); go('#/words'); }
      });
    }, 900);
  };

  const restart = () => {
    st.phase = 'done'; // so leaving does not save this board back
    running = false;
    store.updateGame(ID, (gg) => (gg.current = null));
    go(`#/words/${n}`, true);
  };

  const useHint = () => {
    if (st.phase === 'odd') {
      if (store.hints(ID) <= 0) return toast(refillText(mapCfg));
      store.useHint(ID);
      paintHints(true);
      wsfx.hint();
      const t = cluesEl.querySelector(`[data-w="${def.odd}"]`);
      t && t.classList.add('glow');
      return;
    }
    if (st.phase !== 'play') return;
    const w = def.type === 'scroll' ? nextScroll() : def.targets.find((x) => !st.found.has(x) && (st.hints[x] || 0) < x.length);
    if (!w) return;
    if (store.hints(ID) <= 0) return toast(refillText(mapCfg));
    store.useHint(ID);
    st.hints[w] = Math.min(w.length, (st.hints[w] || 0) + 1);
    wb.setHints(hintCells());
    paintClues();
    paintHints(true);
    wsfx.hint();
    say('inari', st.hints[w] === 1 ? 'Follow my fox-fire. It marks where a word begins.' : 'One more letter, little one.', 2600);
    save();
  };

  /* --- events --- */
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return go('#/words');
    if (e.target.closest('[data-settings]')) return openSettings();
    if (e.target.closest('[data-restart]')) return restart();
    if (e.target.closest('[data-hint]')) return useHint();
    const tg = e.target.closest('.ws-list .tag[data-w]');
    if (tg && st.phase === 'odd') return oddPick(tg.dataset.w);
    if (e.target.closest('.ws-hero-box')) { kiko.feel(Math.random() < 0.5 ? 'happy' : 'think', 900); wsfx.letter(4); }
  });

  /* --- start --- */
  let wb = null;
  const start = () => {
    wb = new WordBoard(el.querySelector('.ws-boardbox'), board, { fx, judge, onTouch: () => (lastTouch = Date.now()) });
    for (const w of st.found) wb.markFound(board.places[w], { animate: false });
    for (const b of st.bonus) wb.markFound(board.extra[b], { animate: false, bonus: true });
    wb.setHints(hintCells());
    paintClues();
    paintTime();
    paintHints();
    say(def.say[0], def.say[1]);
    if (def.coach && !saved) setTimeout(() => toast(def.coach), 900);
    if (def.targets.every((x) => st.found.has(x))) { setTimeout(allFound, 400); return; }
    lastTick = performance.now();
    running = true;
  };

  const sceneId = SCENES_AT.before[n];
  setTimeout(async () => {
    if (sceneId && !seen(sceneId)) {
      await playScene(sceneId);
      markSeen(sceneId);
    }
    if (el.isConnected) start();
  }, 60);

  const hintTimer = setInterval(() => paintHints(), 30000);

  return {
    el,
    destroy() {
      running = false;
      save();
      clearInterval(clock);
      clearInterval(hintTimer);
      clearTimeout(sayTimer);
      kiko.destroy();
      fx.destroy();
      wb && wb.destroy();
      themeOff();
    },
  };
}
