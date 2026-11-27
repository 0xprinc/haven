// Sounds for The Lost Words, all made in code except the narration.
//   koto pluck  - each letter as the finger slides (notes climb)
//   temple bell - a good word
//   taiko drum  - a bad move
//   wood block  - "almost", and the last ten seconds
// Narration mp3s are decoded once and played on the same output.

import { audio, unlockAudio } from '../../sound.js';

// Miyako-bushi ("in") scale: the classic koto sound.
const IN = [0, 1, 5, 7, 8, 12, 13, 17, 19, 20, 24, 25, 29];
const BASE = 329.63; // E4

function env(ctx, out, t, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

function osc(ctx, type, freq, dest, t, dur, glide) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
  o.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function noiseHit(ctx, out, t, { dur = 0.3, gain = 0.2, type = 'lowpass', freq = 800, q = 1, attack = 0.005 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  s.connect(f);
  f.connect(env(ctx, out, t, gain, attack, dur));
  s.start(t);
  s.stop(t + dur + attack + 0.05);
  return f;
}

function koto(ctx, out, freq, t, gain = 0.16) {
  // A bright pluck that bends down a hair, like a koto string.
  const g = env(ctx, out, t, gain, 0.004, 0.9);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(freq * 8, t);
  lp.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.5);
  lp.connect(g);
  osc(ctx, 'sawtooth', freq * 1.004, lp, t, 0.9, 0.997);
  osc(ctx, 'triangle', freq, lp, t, 0.9);
  noiseHit(ctx, out, t, { dur: 0.03, gain: gain * 0.5, type: 'highpass', freq: 3000 });
}

function bell(ctx, out, freq, t, gain = 0.1) {
  // Temple bell ("rin"): a few out-of-tune partials ringing long.
  [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]].forEach(([m, k], i) => {
    const g = env(ctx, out, t, gain * k, 0.004, 2.4 - i * 0.4);
    osc(ctx, 'sine', freq * m, g, t, 2.6);
  });
}

export const wsfx = {
  letter(i) {
    const a = audio();
    if (!a) return;
    const k = Math.min(i, IN.length - 1);
    koto(a.ctx, a.out, BASE * Math.pow(2, IN[k] / 12), a.ctx.currentTime, 0.12);
  },
  good(streak = 0) {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    bell(a.ctx, a.out, 880 * Math.pow(2, IN[Math.min(streak, 4)] / 12), t, 0.09);
    [0, 5, 7, 12].forEach((s, i) => koto(a.ctx, a.out, BASE * 2 * Math.pow(2, s / 12), t + 0.05 + i * 0.06, 0.08));
  },
  bad() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    // Taiko "don": a deep thump with a skin slap on top.
    const g = env(a.ctx, a.out, t, 0.55, 0.003, 0.5);
    osc(a.ctx, 'sine', 120, g, t, 0.5, 0.45);
    noiseHit(a.ctx, a.out, t, { dur: 0.12, gain: 0.25, freq: 500 });
  },
  almost() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    // Wood block: tok-tok.
    [0, 0.11].forEach((d, i) => {
      const g = env(a.ctx, a.out, t + d, 0.18, 0.002, 0.08);
      osc(a.ctx, 'sine', i ? 700 : 940, g, t + d, 0.1);
    });
  },
  tick() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    const g = env(a.ctx, a.out, t, 0.08, 0.002, 0.06);
    osc(a.ctx, 'sine', 1200, g, t, 0.08);
  },
  bonus() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    [0, 2, 3, 4, 5, 6].forEach((k, i) => koto(a.ctx, a.out, BASE * 2 * Math.pow(2, IN[k] / 12), t + i * 0.05, 0.08));
  },
  hint() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    noiseHit(a.ctx, a.out, t, { dur: 0.6, gain: 0.08, type: 'bandpass', freq: 1800, q: 0.7, attack: 0.25 });
    bell(a.ctx, a.out, 1320, t + 0.2, 0.05);
  },
  relight() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    const f = noiseHit(a.ctx, a.out, t, { dur: 0.7, gain: 0.14, type: 'bandpass', freq: 400, q: 0.8, attack: 0.2 });
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.8);
  },
  out() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    const f = noiseHit(a.ctx, a.out, t, { dur: 0.5, gain: 0.12, type: 'bandpass', freq: 1600, q: 0.8, attack: 0.02 });
    f.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    [7, 5, 1, 0].forEach((s, i) => koto(a.ctx, a.out, BASE * Math.pow(2, s / 12), t + 0.2 + i * 0.18, 0.1));
  },
  win() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((k, i) => koto(a.ctx, a.out, BASE * Math.pow(2, IN[k] / 12), t + i * 0.08, 0.12));
    bell(a.ctx, a.out, 660, t + 0.7, 0.1);
  },
  thunder() {
    const a = audio();
    if (!a) return;
    const t = a.ctx.currentTime;
    noiseHit(a.ctx, a.out, t, { dur: 0.15, gain: 0.35, freq: 2500 });
    noiseHit(a.ctx, a.out, t + 0.08, { dur: 2.2, gain: 0.5, freq: 160, attack: 0.05 });
  },
};

/* ---------- Ambient bed for the story ---------- */

// A soft drone with slow koto notes. mood: calm | storm | dark | bright
export function ambient(mood = 'calm') {
  const a = audio();
  if (!a) return { stop() {}, set() {} };
  const { ctx, out } = a;
  const bus = ctx.createGain();
  bus.gain.value = 0.0001;
  bus.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.5);
  bus.connect(out);

  const pad = ctx.createGain();
  pad.gain.value = 0.05;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  pad.connect(lp);
  lp.connect(bus);
  const oscs = [BASE / 4, (BASE / 4) * 1.5, BASE / 2].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? 'sine' : 'triangle';
    o.frequency.value = f;
    o.detune.value = (i - 1) * 6;
    o.connect(pad);
    o.start();
    return o;
  });

  // Wind/rain bed for storms.
  const rain = ctx.createBufferSource();
  rain.buffer = noise(ctx);
  rain.loop = true;
  const rf = ctx.createBiquadFilter();
  rf.type = 'bandpass';
  rf.frequency.value = 900;
  rf.Q.value = 0.5;
  const rg = ctx.createGain();
  rg.gain.value = 0;
  rain.connect(rf);
  rf.connect(rg);
  rg.connect(bus);
  rain.start();

  let cur = mood;
  let timer = null;
  const pluck = () => {
    const steps = cur === 'storm' ? [0, 1, 0] : cur === 'dark' ? [0, 1, 5] : [5, 7, 8, 12, 13, 7, 8];
    const k = steps[Math.floor(Math.random() * steps.length)];
    koto(ctx, bus, BASE * Math.pow(2, IN[k] / 12) * (cur === 'bright' ? 2 : 1), ctx.currentTime, 0.07);
    timer = setTimeout(pluck, cur === 'storm' ? 1800 : 1100 + Math.random() * 900);
  };
  timer = setTimeout(pluck, 600);

  const set = (m) => {
    cur = m;
    const t = ctx.currentTime;
    rg.gain.cancelScheduledValues(t);
    rg.gain.linearRampToValueAtTime(m === 'storm' ? 0.22 : 0, t + 0.8);
    lp.frequency.linearRampToValueAtTime(m === 'storm' ? 380 : m === 'dark' ? 450 : m === 'bright' ? 1400 : 700, t + 1);
  };
  set(mood);

  return {
    set,
    stop() {
      clearTimeout(timer);
      const t = ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        rain.stop();
        bus.disconnect();
      }, 1400);
    },
  };
}

/* ---------- Narration ---------- */

const buffers = new Map();

export async function loadVoice(url) {
  if (buffers.has(url)) return buffers.get(url);
  const p = (async () => {
    const a = audio();
    if (!a) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      return await new Promise((ok) => a.ctx.decodeAudioData(data, ok, () => ok(null)));
    } catch {
      return null;
    }
  })();
  buffers.set(url, p);
  const b = await p;
  if (!b) buffers.delete(url);
  return b;
}

// Plays a decoded line. Returns a promise for when it ends.
export function playVoice(buf, gain = 1) {
  const a = audio();
  if (!a || !buf) return Promise.resolve();
  const s = a.ctx.createBufferSource();
  s.buffer = buf;
  const g = a.ctx.createGain();
  g.gain.value = gain * 1.6;
  s.connect(g);
  g.connect(a.out);
  s.start();
  return new Promise((ok) => (s.onended = ok));
}

export { unlockAudio };
