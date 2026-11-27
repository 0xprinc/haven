// Plays a story scene full screen, like a short film:
// painted pages, a slow camera, film grain and letterbox bars,
// spoken lines with captions. There is no skip button.
// Resolves when the scene ends.

import { SCENES, lines, shown } from './scenes.js';
import { scene } from './art.js';
import { kikoSVG, ponSVG, inariSVG, NAMES, Actor } from './cast.js';
import { ambient, loadVoice, playVoice, wsfx } from './audio.js';
import { audioReady, unlockAudio } from '../../sound.js';
import { h } from '../../ui.js';

const DRAW = { kiko: kikoSVG, pon: ponSVG, inari: inariSVG };
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

let grainURL = null;
function grain() {
  if (grainURL) return grainURL;
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const x = c.getContext('2d');
  const img = x.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  x.putImageData(img, 0, 0);
  grainURL = c.toDataURL();
  return grainURL;
}

// Reading time when a voice file is missing.
const estimate = (text) => 900 + shown(text).length * 62;

let playing = null;

export function playScene(id) {
  if (playing) return playing;
  playing = run(id).finally(() => (playing = null));
  return playing;
}

async function run(id) {
  const sc = SCENES[id];
  if (!sc) return;
  const all = lines(id);

  const el = h(`<div class="story" role="dialog" aria-label="${sc.title}">
    <div class="st-pages"></div>
    <div class="st-grade"></div>
    <div class="st-vignette"></div>
    <div class="st-grain" style="background-image:url(${grain()})"></div>
    <div class="st-flash"></div>
    <div class="st-bar top"></div>
    <div class="st-bar bottom"><div class="st-cap"><div class="who"></div><p></p></div></div>
    <div class="st-title"><div class="k">${sc.kicker}</div><h2>${sc.title}</h2></div>
  </div>`);
  document.body.append(el);
  const pagesEl = el.querySelector('.st-pages');
  const cap = el.querySelector('.st-cap');
  const titleEl = el.querySelector('.st-title');

  // iPad plays sound only after a touch. If it isn't allowed yet,
  // a wax seal waits for one tap; that tap starts the scene.
  if (!audioReady()) {
    const seal = h(`<button class="st-seal" aria-label="Open the story"><span>物語</span><em>Tap to open the story</em></button>`);
    el.append(seal);
    await new Promise((ok) => seal.addEventListener('pointerup', () => { unlockAudio(); ok(); }, { once: true }));
    seal.classList.add('gone');
    await wait(450);
    seal.remove();
  }

  // Start loading every line now; the title card covers the wait.
  const voices = all.map((l) => loadVoice(`audio/words/${l.file}`));
  const bed = ambient(sc.pages[0].mood);
  el.classList.add('on');
  await wait(1600);
  titleEl.classList.add('gone');

  let li = 0;
  let prev = null;
  for (const page of sc.pages) {
    const pg = h(`<div class="st-page grade-${page.grade || 'none'}"><div class="st-cam">${scene(page.art)}<div class="st-actors"></div><div class="st-fx"></div></div></div>`);
    const actors = {};
    for (const [who, x, size] of page.actors || []) {
      const a = h(`<div class="st-actor who-${who}" style="left:${x}%;height:min(${size}vh, ${Math.round(size * 1.15)}vw)">${DRAW[who]('')}</div>`);
      pg.querySelector('.st-actors').append(a);
      actors[who] = new Actor(a.firstElementChild);
    }
    addFx(pg.querySelector('.st-fx'), page.fx || []);
    pagesEl.append(pg);
    bed.set(page.mood);

    // How long this page lasts: its lines plus small pauses.
    const bufs = await Promise.all(page.lines.map((_, k) => voices[li + k]));
    const durs = page.lines.map(([, text], k) => (bufs[k] ? bufs[k].duration * 1000 : estimate(text)));
    const total = durs.reduce((s, d) => s + d + 350, 900);

    const [[s0, x0, y0], [s1, x1, y1]] = page.cam;
    pg.querySelector('.st-cam').animate(
      [{ transform: `translate(${x0}%, ${y0}%) scale(${s0})` }, { transform: `translate(${x1}%, ${y1}%) scale(${s1})` }],
      { duration: total + 900, easing: 'ease-in-out', fill: 'forwards' }
    );
    requestAnimationFrame(() => pg.classList.add('in'));
    if (prev) {
      const old = prev;
      old.classList.add('out');
      setTimeout(() => old.remove(), 900);
    }
    prev = pg;
    if ((page.fx || []).includes('flash')) setTimeout(() => flash(el), 400);
    await wait(350);

    for (let k = 0; k < page.lines.length; k++, li++) {
      const [who, text] = page.lines[k];
      caption(cap, who, shown(text), durs[k]);
      Object.values(actors).forEach((a) => a.calm());
      if (actors[who]) actors[who].feel('talk', 0);
      await Promise.all([bufs[k] ? playVoice(bufs[k]) : null, wait(durs[k])]);
      if (actors[who]) actors[who].feel(who === 'kiko' ? 'happy' : 'calm', 800);
      await wait(350);
    }
    Object.values(actors).forEach((a) => a.destroy());
  }

  cap.classList.remove('in');
  bed.stop();
  el.classList.add('end');
  await wait(900);
  el.remove();
}

function caption(cap, who, text, dur) {
  cap.classList.remove('in');
  void cap.offsetWidth;
  cap.dataset.who = who;
  cap.querySelector('.who').textContent = NAMES[who] || '';
  const words = text.split(' ');
  const step = Math.min(220, (dur * 0.8) / words.length);
  cap.querySelector('p').innerHTML = words.map((w, i) => `<span style="animation-delay:${Math.round(i * step)}ms">${w}</span>`).join(' ');
  cap.classList.add('in');
}

function flash(el) {
  const f = el.querySelector('.st-flash');
  f.classList.remove('go');
  void f.offsetWidth;
  f.classList.add('go');
  wsfx.thunder();
}

function addFx(host, kinds) {
  let html = '';
  if (kinds.includes('motes'))
    for (let i = 0; i < 26; i++)
      html += `<i class="mote" style="left:${(i * 37) % 100}%;top:${30 + ((i * 53) % 70)}%;animation-delay:${(i % 10) * -0.6}s;animation-duration:${5 + (i % 4)}s"></i>`;
  if (kinds.includes('petals'))
    for (let i = 0; i < 22; i++)
      html += `<i class="petal" style="left:${(i * 41) % 100}%;animation-delay:${(i % 11) * -0.55}s;animation-duration:${4.5 + (i % 5) * 0.6}s"></i>`;
  host.innerHTML = html;
}
