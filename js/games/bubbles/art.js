// Canopy Pop — all the jungle art, drawn in code.
// Bubbles are painted once into small images (sprites) and reused,
// which keeps drawing fast on an older iPad.

export const BUBBLES = [
  { name: 'berry', base: '#ef4a5c', sym: 'berry' },
  { name: 'mango', base: '#ff9f1c', sym: 'sun' },
  { name: 'leaf', base: '#5fbf3a', sym: 'leaf' },
  { name: 'lagoon', base: '#14b3ad', sym: 'drop' },
  { name: 'orchid', base: '#9b5de5', sym: 'flower' },
  { name: 'sky', base: '#3a8dff', sym: 'star' },
];

/* ---------- Colour helpers ---------- */

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(hex, t) {
  // t > 0 lightens towards white, t < 0 darkens towards black
  const [r, g, b] = rgb(hex);
  const f = (v) => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
export function alpha(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/* ---------- Symbols inside bubbles (also help colour-blind players) ---------- */

function symbol(ctx, kind, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = r * 0.36;
  ctx.beginPath();
  switch (kind) {
    case 'berry':
      for (const [x, y] of [[-0.5, 0.25], [0.5, 0.25], [0, -0.45]]) {
        ctx.moveTo(x * s + s * 0.48, y * s);
        ctx.arc(x * s, y * s, s * 0.48, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    case 'sun':
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        ctx.moveTo(Math.cos(a) * s * 0.72, Math.sin(a) * s * 0.72);
        ctx.lineTo(Math.cos(a) * s * 1.05, Math.sin(a) * s * 1.05);
      }
      ctx.stroke();
      break;
    case 'leaf':
      ctx.moveTo(-s, s * 0.9);
      ctx.quadraticCurveTo(-s, -s, s, -s);
      ctx.quadraticCurveTo(s, s * 0.9, -s, s * 0.9);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.moveTo(-s * 0.8, s * 0.7);
      ctx.lineTo(s * 0.6, -s * 0.6);
      ctx.stroke();
      break;
    case 'drop':
      ctx.moveTo(0, -s * 1.05);
      ctx.bezierCurveTo(s * 0.35, -s * 0.45, s * 0.85, 0, s * 0.85, s * 0.3);
      ctx.arc(0, s * 0.3, s * 0.85, 0, Math.PI);
      ctx.bezierCurveTo(-s * 0.85, 0, -s * 0.35, -s * 0.45, 0, -s * 1.05);
      ctx.fill();
      break;
    case 'flower':
      for (let k = 0; k < 5; k++) {
        const a = (k * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.moveTo(Math.cos(a) * s * 0.55 + s * 0.42, Math.sin(a) * s * 0.55);
        ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.42, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    case 'star':
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5 - Math.PI / 2;
        const rr = k % 2 ? s * 0.42 : s;
        k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

function gloss(ctx, r) {
  // big soft highlight top-left
  ctx.save();
  ctx.translate(-r * 0.32, -r * 0.42);
  ctx.rotate(-0.55);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.scale(1, 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // tiny sparkle
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(-r * 0.5, -r * 0.2, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // rim light bottom-right
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0.15, 1.45);
  ctx.stroke();
}

function body(ctx, r, base) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, shade(base, 0.55));
  g.addColorStop(0.38, base);
  g.addColorStop(0.82, shade(base, -0.28));
  g.addColorStop(1, shade(base, -0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
  ctx.fill();
}

function shadow(ctx, r) {
  const g = ctx.createRadialGradient(0, r * 0.12, r * 0.6, 0, r * 0.12, r * 1.12);
  g.addColorStop(0, 'rgba(0,0,0,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, r * 0.12, r * 1.12, 0, Math.PI * 2);
  ctx.fill();
}

// Sprites are square with a margin of 0.2r for the shadow.
export const PAD = 1.2;

export function makeSprites(px) {
  // px = bubble radius in device pixels
  const size = px * 2 * PAD;
  const make = (fn) => {
    const c = canvas(size, size);
    const ctx = c.getContext('2d');
    ctx.translate(size / 2, size / 2);
    fn(ctx, px);
    return c;
  };
  const color = BUBBLES.map((b) =>
    make((ctx, r) => {
      shadow(ctx, r);
      body(ctx, r, b.base);
      symbol(ctx, b.sym, r);
      gloss(ctx, r);
    })
  );
  const stone = make((ctx, r) => {
    shadow(ctx, r);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#b9bfb0');
    g.addColorStop(0.5, '#7d857a');
    g.addColorStop(1, '#3f4741');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    // moss
    ctx.fillStyle = 'rgba(96,150,60,0.75)';
    for (const [x, y, s] of [[-0.5, -0.65, 0.42], [0.1, -0.85, 0.35], [0.55, -0.55, 0.3], [-0.85, -0.1, 0.3]]) {
      ctx.beginPath();
      ctx.arc(x * r, y * r, s * r, 0, Math.PI * 2);
      ctx.fill();
    }
    // cracks
    ctx.strokeStyle = 'rgba(30,34,30,0.5)';
    ctx.lineWidth = r * 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.1, r * 0.1);
    ctx.lineTo(r * 0.35, r * 0.35);
    ctx.lineTo(r * 0.3, r * 0.65);
    ctx.moveTo(r * 0.35, r * 0.35);
    ctx.lineTo(r * 0.62, r * 0.4);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 3.6, 4.6);
    ctx.stroke();
  });
  const rainbow = make((ctx, r) => {
    shadow(ctx, r);
    let g;
    if (ctx.createConicGradient) {
      g = ctx.createConicGradient(0, 0, 0);
      BUBBLES.forEach((b, i) => g.addColorStop(i / BUBBLES.length, b.base));
      g.addColorStop(1, BUBBLES[0].base);
    } else {
      g = ctx.createLinearGradient(-r, -r, r, r);
      BUBBLES.forEach((b, i) => g.addColorStop(i / (BUBBLES.length - 1), b.base));
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
    ctx.fill();
    const w = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    w.addColorStop(0, 'rgba(255,255,255,0.85)');
    w.addColorStop(0.45, 'rgba(255,255,255,0.15)');
    w.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = w;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
    ctx.fill();
    gloss(ctx, r);
  });
  const bird = make((ctx, r) => drawBird(ctx, 0, r * 0.06, r * 0.62, 0, false));
  // glass sheen to lay over the bird so it looks inside the bubble
  const sheen = make((ctx, r) => gloss(ctx, r));
  return { color, stone, rainbow, bird, sheen, size };
}

/* ---------- The little bird ---------- */

// Draws a round baby bird. size ~ body radius. flap -1..1 moves the wings.
export function drawBird(ctx, x, y, size, flap = 0, flying = true, look = 1) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(look, 1);
  if (flying) {
    // wings behind
    ctx.fillStyle = '#e9b949';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * s * 0.45, -s * 0.05);
      ctx.rotate(side * (0.5 + flap * 0.9));
      ctx.beginPath();
      ctx.ellipse(side * s * 0.45, 0, s * 0.55, s * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // body
  const g = ctx.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s);
  g.addColorStop(0, '#fff6d8');
  g.addColorStop(0.6, '#ffd765');
  g.addColorStop(1, '#e8a92c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fill();
  // belly
  ctx.fillStyle = 'rgba(255,250,235,0.85)';
  ctx.beginPath();
  ctx.ellipse(s * 0.05, s * 0.35, s * 0.55, s * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // tuft
  ctx.strokeStyle = '#e8a92c';
  ctx.lineWidth = s * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, -s * 0.95);
  ctx.quadraticCurveTo(-s * 0.1, -s * 1.3, s * 0.15, -s * 1.3);
  ctx.moveTo(s * 0.1, -s * 0.95);
  ctx.quadraticCurveTo(s * 0.2, -s * 1.2, s * 0.4, -s * 1.12);
  ctx.stroke();
  if (!flying) {
    // folded wing
    ctx.fillStyle = '#eab544';
    ctx.beginPath();
    ctx.ellipse(-s * 0.55, s * 0.15, s * 0.32, s * 0.45, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // eyes
  ctx.fillStyle = '#2a1d10';
  for (const ex of [-0.28, 0.32]) {
    ctx.beginPath();
    ctx.arc(ex * s, -s * 0.2, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const ex of [-0.24, 0.36]) {
    ctx.beginPath();
    ctx.arc(ex * s, -s * 0.25, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  // cheeks
  ctx.fillStyle = 'rgba(255,120,110,0.45)';
  for (const ex of [-0.5, 0.58]) {
    ctx.beginPath();
    ctx.arc(ex * s, s * 0.05, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  // beak
  ctx.fillStyle = '#f2732a';
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, -s * 0.02);
  ctx.lineTo(s * 0.2, -s * 0.02);
  ctx.lineTo(s * 0.06, s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ---------- Jungle backdrop ---------- */

function leafShape(ctx, len, width) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(width, -len * 0.25, width * 0.8, -len * 0.75, 0, -len);
  ctx.bezierCurveTo(-width * 0.8, -len * 0.75, -width, -len * 0.25, 0, 0);
}

function leaf(ctx, x, y, len, width, angle, fill, vein) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  leafShape(ctx, len, width);
  ctx.fillStyle = fill;
  ctx.fill();
  if (vein) {
    ctx.strokeStyle = vein;
    ctx.lineWidth = Math.max(1, width * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(width * 0.08, -len * 0.5, 0, -len * 0.95);
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      ctx.moveTo(0, -len * t);
      ctx.lineTo(width * 0.55 * Math.sin(t * Math.PI), -len * t - len * 0.08);
      ctx.moveTo(0, -len * t);
      ctx.lineTo(-width * 0.55 * Math.sin(t * Math.PI), -len * t - len * 0.08);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function frond(ctx, x, y, len, angle, curl, fill, vein, rnd) {
  // a palm frond: a curved stem with leaflets both sides
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = fill;
  ctx.lineWidth = len * 0.018;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const pts = [];
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    const px = Math.sin(t * curl) * len * 0.25;
    const py = -t * len;
    pts.push([px, py, t]);
    k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
  for (let k = 2; k < pts.length; k++) {
    const [px, py, t] = pts[k];
    const l = len * 0.32 * Math.sin(t * Math.PI * 0.95 + 0.15) * (0.85 + rnd() * 0.3);
    for (const side of [-1, 1]) leaf(ctx, px, py, l, l * 0.16, side * (1.15 - t * 0.5) + curl * 0.1, fill, vein);
  }
  ctx.restore();
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Paints the whole backdrop. fx/fw = field left and width in px.
export function paintJungle(ctx, w, h, dark, fx, fw) {
  const rnd = seeded(42);
  const P = dark
    ? { sky: ['#06201f', '#0b2f2a', '#061612'], glow: 'rgba(170,230,210,0.16)', far: '#0f3b33', mid: '#0b2d27', near: '#071d18', leaf: '#0d3a2c', vein: 'rgba(120,200,160,0.10)', bamboo: ['#3f5a2c', '#5d7a3c', '#2a3d1e'], ground: '#0a231b' }
    : { sky: ['#eef6d6', '#a9d8a6', '#3f8a5f'], glow: 'rgba(255,248,214,0.55)', far: '#9fcf9a', mid: '#5ea66f', near: '#2f6f4b', leaf: '#2e7a45', vein: 'rgba(255,255,255,0.16)', bamboo: ['#a7b85a', '#d3dc8a', '#6f8133'], ground: '#2c5e3c' };

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, P.sky[0]);
  sky.addColorStop(0.5, P.sky[1]);
  sky.addColorStop(1, P.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // sun or moon glow
  const gx = w * 0.78, gy = h * 0.08;
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.6);
  glow.addColorStop(0, P.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  if (dark) {
    ctx.fillStyle = 'rgba(235,245,230,0.85)';
    ctx.beginPath();
    ctx.arc(gx, gy, Math.min(w, h) * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.sky[0];
    ctx.beginPath();
    ctx.arc(gx + Math.min(w, h) * 0.014, gy - Math.min(w, h) * 0.01, Math.min(w, h) * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }

  // far, mid canopy bands (rounded tree crowns)
  const band = (y0, amp, color, step) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = -step; x <= w + step; x += step) {
      const r = step * (0.7 + rnd() * 0.6);
      ctx.arc(x, y0 - rnd() * amp, r, Math.PI, 0);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  };
  band(h * 0.5, h * 0.08, P.far, Math.max(40, w * 0.07));
  band(h * 0.68, h * 0.06, P.mid, Math.max(50, w * 0.09));
  band(h * 0.86, h * 0.04, P.near, Math.max(60, w * 0.11));

  // mist
  const mist = ctx.createLinearGradient(0, h * 0.4, 0, h);
  mist.addColorStop(0, 'rgba(255,255,255,0)');
  mist.addColorStop(0.5, dark ? 'rgba(120,200,180,0.05)' : 'rgba(255,255,255,0.18)');
  mist.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, w, h);

  // big framing fronds on both sides
  const L = Math.max(w, h);
  const side = (x, dir) => {
    frond(ctx, x, h * 0.98, L * 0.42, dir * 0.55, dir * 1.4, P.leaf, P.vein, rnd);
    frond(ctx, x, h * 0.75, L * 0.3, dir * 0.95, dir * 1.1, shade(dark ? '#0d3a2c' : '#2e7a45', -0.15), P.vein, rnd);
    leaf(ctx, x + dir * L * 0.02, h * 1.02, L * 0.3, L * 0.09, dir * 0.35, shade(dark ? '#0d3a2c' : '#2e7a45', -0.25), P.vein);
  };
  side(-L * 0.02, 1);
  side(w + L * 0.02, -1);

  // top canopy: leaves hanging down across the top
  for (let k = 0; k < 14; k++) {
    const x = (k / 13) * w + (rnd() - 0.5) * 40;
    leaf(ctx, x, -L * 0.02, L * (0.08 + rnd() * 0.06), L * 0.03, Math.PI + (rnd() - 0.5) * 0.9, shade(P.leaf, (rnd() - 0.5) * 0.3), P.vein);
  }

  // hanging vines
  ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const x = w * (0.1 + 0.2 * k) + (rnd() - 0.5) * 30;
    const len = h * (0.12 + rnd() * 0.18);
    ctx.strokeStyle = dark ? '#123a2c' : '#3d7a40';
    ctx.lineWidth = Math.max(2, L * 0.004);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + (rnd() - 0.5) * 40, len * 0.6, x + (rnd() - 0.5) * 20, len);
    ctx.stroke();
    for (let j = 1; j < 6; j++) {
      const t = j / 6;
      leaf(ctx, x + (rnd() - 0.5) * 10, len * t, L * 0.018, L * 0.008, Math.PI + (j % 2 ? 0.7 : -0.7), dark ? '#1a4a34' : '#4f9a4a', null);
    }
  }

  // bamboo walls at the field edges
  const bw = Math.max(8, fw * 0.022);
  for (const x of [fx - bw * 0.7, fx + fw - bw * 0.3]) {
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, P.bamboo[2]);
    g.addColorStop(0.45, P.bamboo[1]);
    g.addColorStop(1, P.bamboo[2]);
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, bw, h);
    ctx.fillStyle = P.bamboo[2];
    for (let y = rnd() * 80; y < h; y += bw * 7 + rnd() * bw * 3) {
      ctx.fillRect(x - 1, y, bw + 2, Math.max(2, bw * 0.22));
    }
  }
}
