// Haven: the games hub. Home screen and a tiny hash router.

import { applyTheme, nextFrame, h, icon, MARK, openSettings, closeSheet, onTheme } from './ui.js';
import * as arrows from './games/arrows/game.js';
import { generateLevel } from './games/arrows/generator.js';
import { Board } from './games/arrows/board.js';
import * as bubbles from './games/bubbles/game.js';
import { buildLevel } from './games/bubbles/levels.js';
import { Canopy } from './games/bubbles/view.js';
import { sfx } from './sound.js';
import { isStandalone, isAppleTouch } from './native.js';
import { toast } from './ui.js';

applyTheme();

// Opened in a Safari tab on iPad/iPhone: show once how to install it.
function installTip() {
  if (isStandalone() || !isAppleTouch()) return;
  try {
    if (sessionStorage.getItem('haven.tip')) return;
    sessionStorage.setItem('haven.tip', '1');
  } catch {}
  setTimeout(() => toast('For the full app: tap Share, then “Add to Home Screen”'), 1200);
}
installTip();

const app = document.getElementById('app');
let current = null;

function greeting() {
  const hr = new Date().getHours();
  if (hr < 5) return 'Good night';
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

function gameCard(g, p, hint) {
  const pct = Math.max(0.015, p.cleared / g.meta.total);
  return `<button class="game-card ${g.meta.id}" data-open="${g.mapCfg.route}" aria-label="Play ${g.meta.name}">
    <div class="preview"></div>
    <div class="meta">
      <div>
        <div class="kicker">${g.meta.kind} · ${g.meta.total} levels</div>
        <h2>${g.meta.name}</h2>
        <div class="sub">${p.cleared ? `Level ${p.next} · ${p.tier}` : hint}</div>
        <div class="meter"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
      </div>
      <span class="play-pill">${icon('play')}${p.cleared ? 'Continue' : 'Play'}</span>
    </div>
  </button>`;
}

function homeScreen(go) {
  const pa = arrows.progress();
  const pb = bubbles.progress();
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const el = h(`<section class="screen">
    <div class="wrap home-top">
      <div class="brand">${MARK}<span class="brand-name">Haven</span></div>
      <button class="icon-btn" data-settings aria-label="Settings">${icon('gear')}</button>
    </div>
    <div class="scroll">
      <div class="wrap">
        <div class="hello">
          <div class="date">${date}</div>
          <h1>${greeting()}.<br><em>Time for a game?</em></h1>
          <p>Calm games with no ads and no rush. Your progress is saved as you play.</p>
        </div>
        <div class="games">
          ${gameCard(bubbles, pb, 'Free the birds, pop the bubbles')}
          ${gameCard(arrows, pa, 'Slide every arrow off the board')}
          <div class="soon-card">
            <div class="tiles"><span></span><span></span><span></span></div>
            <div><h3>More games soon</h3>
            <div>New games will appear here, all in one place.</div></div>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><b>${pa.cleared + pb.cleared}</b><span>levels cleared</span></div>
          <div class="stat"><b>${pa.stars + pb.stars}</b><span>stars earned</span></div>
          <div class="stat"><b>2</b><span>games · more coming</span></div>
        </div>
        <div class="footnote">No ads. No sign-in. Just games.</div>
      </div>
    </div>
  </section>`);

  // Live previews: each game quietly plays itself.
  const demos = [];
  nextFrame(() => {
    const pa = el.querySelector('.game-card.arrows .preview');
    const pb = el.querySelector('.game-card.bubbles .preview');
    if (pa) demos.push(new Board(pa, generateLevel(24), { demo: true }));
    if (pb) demos.push(new Canopy(pb, buildLevel(14), { demo: true, noIntro: true }));
  });
  const offTheme = onTheme(() => demos.forEach((d) => (d.readColors ? d.readColors() : d.themeChanged())));

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-settings]')) return openSettings();
    const card = e.target.closest('[data-open]');
    if (card) {
      sfx.tap();
      go(`#/${card.dataset.open}`);
    }
  });

  return {
    el,
    destroy() {
      offTheme();
      demos.forEach((d) => d.destroy());
    },
  };
}

function route() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'arrows' && parts[1]) return arrows.playScreen(go, parseInt(parts[1], 10));
  if (parts[0] === 'arrows') return arrows.mapScreen(go);
  if (parts[0] === 'bubbles' && parts[1]) return bubbles.playScreen(go, parseInt(parts[1], 10));
  if (parts[0] === 'bubbles') return bubbles.mapScreen(go);
  return homeScreen(go);
}

function show() {
  closeSheet(true);
  const next = route();
  const prev = current;
  current = next;
  if (prev) {
    prev.el.classList.add('leaving');
    setTimeout(() => {
      prev.destroy && prev.destroy();
      prev.el.remove();
    }, 220);
  }
  app.append(next.el);
}

function go(hash, force = false) {
  if (location.hash === hash) {
    if (force) show();
    return;
  }
  location.hash = hash;
}

window.addEventListener('hashchange', show);
show();

// Offline support once it's hosted.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
