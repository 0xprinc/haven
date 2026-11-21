// Soft synthesized sounds. No audio files to download.
// iPad only allows sound after the first touch, so we unlock on it.

import { getSettings } from './store.js';

let ctx = null;
let master = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}
window.addEventListener('pointerdown', unlockAudio, { passive: true });

function on() {
  return getSettings().sound && ensure() && ctx.state === 'running';
}

function tone({ freq, type = 'sine', dur = 0.25, gain = 0.2, attack = 0.005, glide = 0, delay = 0 }) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// A pentatonic scale, so any run of notes sounds pleasant.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const note = (i, base = 392) => base * Math.pow(2, SCALE[Math.min(i, SCALE.length - 1)] / 12);

export const sfx = {
  slide(streak = 0) {
    if (!on()) return;
    const f = note(streak % SCALE.length);
    tone({ freq: f, type: 'triangle', dur: 0.32, gain: 0.16 });
    tone({ freq: f * 2, type: 'sine', dur: 0.22, gain: 0.05, delay: 0.02 });
  },
  bump() {
    if (!on()) return;
    tone({ freq: 140, type: 'sine', dur: 0.22, gain: 0.3, glide: 0.6 });
    tone({ freq: 90, type: 'triangle', dur: 0.18, gain: 0.12, delay: 0.03 });
  },
  tap() {
    if (!on()) return;
    tone({ freq: 880, type: 'sine', dur: 0.06, gain: 0.05 });
  },
  hint() {
    if (!on()) return;
    [0, 4, 7].forEach((s, i) => tone({ freq: 660 * Math.pow(2, s / 12), dur: 0.5, gain: 0.06, delay: i * 0.07 }));
  },
  win() {
    if (!on()) return;
    [0, 4, 7, 12, 16].forEach((s, i) =>
      tone({ freq: 392 * Math.pow(2, s / 12), type: 'triangle', dur: 0.9, gain: 0.12, delay: i * 0.09 })
    );
  },
  shoot() {
    if (!on()) return;
    tone({ freq: 520, type: 'sine', dur: 0.14, gain: 0.07, glide: 1.8 });
  },
  stick() {
    if (!on()) return;
    tone({ freq: 300, type: 'triangle', dur: 0.09, gain: 0.12, glide: 0.7 });
  },
  pop(i = 0) {
    if (!on()) return;
    const f = note(i % SCALE.length, 523);
    tone({ freq: f * 1.6, type: 'sine', dur: 0.09, gain: 0.13, glide: 0.45 });
    tone({ freq: f, type: 'triangle', dur: 0.16, gain: 0.06, delay: 0.01 });
  },
  drop() {
    if (!on()) return;
    tone({ freq: 220 + Math.random() * 80, type: 'sine', dur: 0.12, gain: 0.06, glide: 0.6 });
  },
  chirp() {
    if (!on()) return;
    tone({ freq: 2200, type: 'sine', dur: 0.08, gain: 0.05, glide: 1.4 });
    tone({ freq: 2600, type: 'sine', dur: 0.09, gain: 0.05, glide: 1.3, delay: 0.1 });
  },
  lose() {
    if (!on()) return;
    [7, 4, 0].forEach((s, i) => tone({ freq: 330 * Math.pow(2, s / 12), dur: 0.5, gain: 0.1, delay: i * 0.12 }));
  },
};
