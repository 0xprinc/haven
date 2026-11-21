// Loose Ends — "Olympus" theme, drawn in code.
// Day: sunlit marble temple above the clouds.
// Night: starry sky with constellations over a quiet temple.

// One colour per god, chosen to stay easy to tell apart on marble.
export const PALETTE = {
  light: ['#1f4e8c', '#b5462a', '#2f7d5d', '#7a3f9a', '#3d4a5c', '#1e7f8c', '#a63a64'],
  dark: ['#8ab4ff', '#ff9a6e', '#7fd6a5', '#d0a2ff', '#c9d2de', '#6fd3e0', '#ff8fb5'],
};

export function theme(dark) {
  return dark
    ? {
        dot: 'rgba(240,215,150,0.22)',
        gold: '#f0cd6a',
        goldDeep: '#a77c25',
        glow: '#f6d77a',
        danger: '#ff6b5f',
        tablet: ['#22243c', '#191a2e'],
        vein: 'rgba(255,255,255,0.045)',
        border: '#d8b25e',
        shadow: 'rgba(0,0,0,0.45)',
      }
    : {
        dot: 'rgba(120,95,40,0.22)',
        gold: '#d9a93c',
        goldDeep: '#8a6417',
        glow: '#e8b94a',
        danger: '#d2423a',
        tablet: ['#fbf8f1', '#efe7d6'],
        vein: 'rgba(120,100,70,0.07)',
        border: '#c39a45',
        shadow: 'rgba(60,40,10,0.22)',
      };
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function column(ctx, x, base, h, w, light, shade) {
  // a fluted Greek column with a simple capital and base
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, shade);
  g.addColorStop(0.35, light);
  g.addColorStop(0.7, light);
  g.addColorStop(1, shade);
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, base - h, w, h);
  ctx.strokeStyle = shade;
  ctx.globalAlpha *= 0.5;
  ctx.lineWidth = Math.max(1, w * 0.06);
  for (let k = 1; k < 4; k++) {
    const fx = x - w / 2 + (w * k) / 4;
    ctx.beginPath();
    ctx.moveTo(fx, base - h + w * 0.4);
    ctx.lineTo(fx, base - w * 0.3);
    ctx.stroke();
  }
  ctx.globalAlpha /= 0.5;
  ctx.fillStyle = light;
  ctx.fillRect(x - w * 0.75, base - h - w * 0.35, w * 1.5, w * 0.38);
  ctx.fillRect(x - w * 0.7, base - w * 0.3, w * 1.4, w * 0.3);
}

function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [dx, dy, r] of [[0, 0, 1], [1.1, 0.25, 0.8], [-1.1, 0.3, 0.75], [0.4, -0.45, 0.75], [-0.5, -0.3, 0.6], [1.9, 0.5, 0.5], [-1.9, 0.55, 0.45]]) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
}

// The backdrop behind the board (does not move with zoom).
export function paintSky(ctx, w, h, dark) {
  const rnd = seeded(7);
  const L = Math.max(w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (dark) {
    sky.addColorStop(0, '#070a24');
    sky.addColorStop(0.55, '#15183f');
    sky.addColorStop(1, '#2a1f45');
  } else {
    sky.addColorStop(0, '#cfe0f0');
    sky.addColorStop(0.6, '#efe9dc');
    sky.addColorStop(1, '#f6eedd');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // sun or moon glow, top right
  const gx = w * 0.82, gy = h * 0.1;
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, L * 0.55);
  glow.addColorStop(0, dark ? 'rgba(190,200,255,0.18)' : 'rgba(255,226,150,0.55)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  if (dark) {
    // stars
    for (let k = 0; k < 160; k++) {
      const x = rnd() * w, y = rnd() * h * 0.85, r = rnd() * 1.3 + 0.3;
      ctx.fillStyle = `rgba(255,250,235,${0.25 + rnd() * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // two constellations: a bow and a lyre-like shape
    const cons = [
      [[0.1, 0.18], [0.16, 0.1], [0.24, 0.08], [0.31, 0.12], [0.36, 0.2]],
      [[0.62, 0.32], [0.68, 0.26], [0.75, 0.29], [0.73, 0.38], [0.65, 0.4], [0.62, 0.32]],
    ];
    ctx.strokeStyle = 'rgba(240,215,150,0.22)';
    ctx.lineWidth = 1;
    for (const c of cons) {
      ctx.beginPath();
      c.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,200,0.9)';
      for (const [x, y] of c) {
        ctx.beginPath();
        ctx.arc(x * w, y * h, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // crescent moon
    const mr = Math.min(w, h) * 0.035;
    ctx.fillStyle = 'rgba(250,245,225,0.95)';
    ctx.beginPath();
    ctx.arc(gx, gy, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0e2c';
    ctx.beginPath();
    ctx.arc(gx + mr * 0.4, gy - mr * 0.25, mr * 0.85, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // sun rays
    ctx.save();
    ctx.translate(gx, gy);
    for (let k = 0; k < 14; k++) {
      ctx.rotate((Math.PI * 2) / 14);
      ctx.fillStyle = 'rgba(255,240,200,0.12)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(L, -L * 0.05);
      ctx.lineTo(L, L * 0.05);
      ctx.fill();
    }
    ctx.restore();
  }

  // temple on the left and right edges, rising from the clouds
  const colW = Math.max(14, L * 0.028);
  const light = dark ? '#2c2f5c' : '#f4ede0';
  const shade = dark ? '#1b1d42' : '#cfc3ab';
  ctx.globalAlpha = dark ? 0.9 : 0.85;
  for (const [x, hh] of [[0.03, 0.55], [0.1, 0.5], [0.9, 0.5], [0.97, 0.55]]) {
    column(ctx, x * w, h * 0.92, h * hh, colW, light, shade);
  }
  // pediment (roof) pieces
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(-colW, h * 0.37 - colW * 0.4);
  ctx.lineTo(w * 0.14, h * 0.4 - colW * 0.4);
  ctx.lineTo(w * 0.14, h * 0.42 - colW * 0.4);
  ctx.lineTo(-colW, h * 0.42 - colW * 0.4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w + colW, h * 0.37 - colW * 0.4);
  ctx.lineTo(w * 0.86, h * 0.4 - colW * 0.4);
  ctx.lineTo(w * 0.86, h * 0.42 - colW * 0.4);
  ctx.lineTo(w + colW, h * 0.42 - colW * 0.4);
  ctx.fill();
  ctx.globalAlpha = 1;

  // clouds along the bottom
  const cc = dark ? 'rgba(70,70,120,0.55)' : 'rgba(255,255,255,0.9)';
  const cc2 = dark ? 'rgba(50,50,95,0.75)' : 'rgba(255,252,245,0.95)';
  for (let k = 0; k < 9; k++) cloud(ctx, (k / 8) * w + (rnd() - 0.5) * 40, h * (0.93 + rnd() * 0.04), L * (0.04 + rnd() * 0.03), cc);
  for (let k = 0; k < 7; k++) cloud(ctx, (k / 6) * w + (rnd() - 0.5) * 60, h * (0.99 + rnd() * 0.03), L * (0.05 + rnd() * 0.03), cc2);
  // a few high clouds
  for (let k = 0; k < 3; k++) cloud(ctx, w * (0.2 + 0.3 * k + rnd() * 0.1), h * (0.12 + rnd() * 0.12), L * 0.022, dark ? 'rgba(60,60,110,0.35)' : 'rgba(255,255,255,0.55)');
}

// Marble tablet under the board, in cell units (built once per board size).
export function tabletPaths(w, h) {
  const m = 0.75; // margin around the cells
  const x0 = -m, y0 = -m, x1 = w + m, y1 = h + m;
  const r = 0.5;
  const slab = new Path2D();
  slab.moveTo(x0 + r, y0);
  slab.arcTo(x1, y0, x1, y1, r);
  slab.arcTo(x1, y1, x0, y1, r);
  slab.arcTo(x0, y1, x0, y0, r);
  slab.arcTo(x0, y0, x1, y0, r);
  slab.closePath();

  // Greek key (meander) running round the edge
  const key = new Path2D();
  const band = 0.38; // pattern height
  const inset = 0.17;
  const side = (ax, ay, bx, by, nx, ny) => {
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const n = Math.max(1, Math.floor(len / 0.9));
    const step = len / n;
    const P = (t, d) => [ax + ux * t + nx * d, ay + uy * t + ny * d];
    for (let k = 0; k < n; k++) {
      const t = k * step, q = step;
      const pts = [
        P(t, 0), P(t, band), P(t + q * 0.75, band), P(t + q * 0.75, band * 0.33),
        P(t + q * 0.35, band * 0.33), P(t + q * 0.35, band * 0.66), P(t + q * 0.55, band * 0.66),
      ];
      key.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < pts.length; j++) key.lineTo(pts[j][0], pts[j][1]);
    }
  };
  const a = inset;
  side(x0 + 0.5, y0 + a, x1 - 0.5, y0 + a, 0, 1);
  side(x1 - 0.5, y1 - a, x0 + 0.5, y1 - a, 0, -1);
  side(x0 + a, y1 - 0.5, x0 + a, y0 + 0.5, 1, 0);
  side(x1 - a, y0 + 0.5, x1 - a, y1 - 0.5, -1, 0);

  const lines = new Path2D();
  const i1 = 0.08, i2 = inset + band + 0.08;
  for (const d of [i1, i2]) {
    lines.moveTo(x0 + d + r * 0.6, y0 + d);
    lines.lineTo(x1 - d - r * 0.6, y0 + d);
    lines.moveTo(x0 + d + r * 0.6, y1 - d);
    lines.lineTo(x1 - d - r * 0.6, y1 - d);
    lines.moveTo(x0 + d, y0 + d + r * 0.6);
    lines.lineTo(x0 + d, y1 - d - r * 0.6);
    lines.moveTo(x1 - d, y0 + d + r * 0.6);
    lines.lineTo(x1 - d, y1 - d - r * 0.6);
  }

  // faint marble veins
  const rnd = seeded(w * 31 + h);
  const veins = new Path2D();
  for (let k = 0; k < Math.max(4, (w + h) / 3); k++) {
    let x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    veins.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (rnd() - 0.3) * 2.2;
      y += (rnd() - 0.5) * 1.6;
      veins.lineTo(Math.min(x1, Math.max(x0, x)), Math.min(y1, Math.max(y0, y)));
    }
  }
  return { slab, key, lines, veins, box: [x0, y0, x1, y1], margin: m };
}
