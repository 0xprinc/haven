// Painted backdrops in an ink-wash style, as SVG.
// Colours come from CSS classes, so day and night both work.
// The play screen uses `backdrop()`; story pages use `scene()`.

const torii = (x, y, s, cls = 'torii') => `
  <g class="${cls}" transform="translate(${x} ${y}) scale(${s})">
    <path d="M-120 -150Q0 -170 120 -150L128 -138Q0 -156 -128 -138Z"/>
    <rect x="-112" y="-128" width="224" height="14" rx="3"/>
    <rect x="-86" y="-140" width="18" height="160" rx="4"/>
    <rect x="68" y="-140" width="18" height="160" rx="4"/>
    <rect x="-8" y="-128" width="16" height="22"/>
  </g>`;

const lantern = (x, y, s, lit = true) => `
  <g class="stone-lantern" transform="translate(${x} ${y}) scale(${s})">
    <rect x="-22" y="-8" width="44" height="10" rx="2"/>
    <rect x="-8" y="-60" width="16" height="54"/>
    <rect x="-26" y="-74" width="52" height="14" rx="3"/>
    <rect x="-18" y="-104" width="36" height="30" class="${lit ? 'lit' : 'unlit'}"/>
    <path d="M-34 -104L0 -128L34 -104Z"/>
    <circle cx="0" cy="-132" r="5"/>
  </g>`;

const branch = (x, y, s, flip = false) => {
  const blossoms = [[60, 40], [120, 20], [150, 70], [210, 46], [260, 90], [96, 96], [190, 120], [300, 60], [40, 110]]
    .map(([bx, by], i) => `<g transform="translate(${bx} ${by}) rotate(${i * 37})" class="blossom">
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="7" ry="11" cy="-9" transform="rotate(${a})"/>`).join('')}
      <circle r="3.4" class="b-core"/></g>`)
    .join('');
  return `<g class="branch" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
    <path class="twig" d="M-20 0C60 20 120 30 180 70S300 110 340 80M120 34C140 70 170 100 200 124M60 18C70 60 90 90 100 104" fill="none" stroke-width="9" stroke-linecap="round"/>
    ${blossoms}</g>`;
};

const mountains = `
  <path class="m3" d="M0 640L140 520L260 590L420 430L560 560L700 470L860 590L1000 420L1160 560L1300 480L1460 600L1600 500V1000H0Z"/>
  <path class="m2" d="M0 720L180 600L320 680L520 560L700 700L880 600L1060 720L1240 610L1420 720L1600 640V1000H0Z"/>
  <rect class="mist" x="-50" y="660" width="1700" height="120"/>
  <path class="m1" d="M0 830Q300 760 600 820T1200 800T1600 790V1000H0Z"/>`;

export function backdrop(place = 'shrine') {
  return `<svg class="ws-backdrop place-${place}" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="wsSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="sky0"/><stop offset=".6" class="sky1"/><stop offset="1" class="sky2"/>
      </linearGradient>
      <radialGradient id="wsOrb"><stop offset="0" class="orb0"/><stop offset=".55" class="orb1"/><stop offset="1" class="orb2"/></radialGradient>
      <filter id="wsSoft"><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#wsSky)"/>
    <circle class="orb-glow" cx="1180" cy="250" r="260" fill="url(#wsOrb)"/>
    <circle class="orb" cx="1180" cy="250" r="92"/>
    <g class="clouds" filter="url(#wsSoft)">
      <ellipse cx="300" cy="260" rx="260" ry="40"/><ellipse cx="1300" cy="400" rx="300" ry="36"/><ellipse cx="800" cy="180" rx="200" ry="26"/>
    </g>
    ${mountains}
    ${torii(1260, 900, 1.15)}
    ${torii(1420, 860, 0.62, 'torii far')}
    ${lantern(1080, 905, 1.1)}
    ${lantern(1530, 920, 0.9)}
    ${branch(-160, 120, 1.2)}
    ${branch(1640, 30, 1.1, true)}
  </svg>`;
}

/* ---------- Story pages ---------- */

const stars = Array.from({ length: 70 }, (_, i) => {
  const x = (i * 467) % 1600, y = (i * 211) % 560, r = 1 + ((i * 7) % 3);
  return `<circle class="star" cx="${x}" cy="${y}" r="${r}" style="animation-delay:${(i % 9) * -0.4}s"/>`;
}).join('');

const rain = Array.from({ length: 60 }, (_, i) => `<line class="drop" x1="${(i * 137) % 1700}" y1="${(i * 83) % 1000 - 200}" x2="${(i * 137) % 1700 - 40}" y2="${(i * 83) % 1000 - 110}" style="animation-delay:${(i % 12) * -0.07}s"/>`).join('');

function pieces() {
  return Array.from({ length: 14 }, (_, i) => {
    const ch = 'KAMISUNWORDTALE'[i];
    const ang = -60 + i * 9;
    return `<g class="piece" style="--a:${ang}deg;--dx:${(i % 2 ? 1 : -1) * (300 + i * 40)}px;--dy:${-200 + (i % 5) * 90}px;animation-delay:${0.4 + i * 0.07}s">
      <rect x="-26" y="-32" width="52" height="64" rx="4"/><text y="13">${ch}</text></g>`;
  }).join('');
}

const scrollArt = (y = 380) => `
  <g class="sacred-scroll" transform="translate(800 ${y})">
    <rect x="-300" y="-110" width="600" height="220" rx="10" class="paper"/>
    <rect x="-330" y="-124" width="34" height="248" rx="14" class="rod"/>
    <rect x="296" y="-124" width="34" height="248" rx="14" class="rod"/>
    <g class="glyphs">${Array.from({ length: 5 }, (_, i) => `<rect x="${-230 + i * 100}" y="-70" width="20" height="${100 + (i % 3) * 20}" rx="10"/>`).join('')}</g>
  </g>`;

const SCENES = {
  sky: () => `
    <rect class="night" width="1600" height="1000"/>${stars}
    <g class="glow-orb"><circle cx="800" cy="380" r="330" class="halo"/></g>
    ${scrollArt()}
    <path class="m3 dark" d="M0 760L200 620L380 720L600 560L820 720L1040 600L1260 740L1440 640L1600 720V1000H0Z"/>
    <path class="m1 dark" d="M0 880Q400 800 800 860T1600 840V1000H0Z"/>`,
  storm: () => `
    <rect class="stormsky" width="1600" height="1000"/>
    <g class="stormclouds">
      <ellipse cx="300" cy="180" rx="420" ry="140"/><ellipse cx="900" cy="140" rx="520" ry="160"/><ellipse cx="1400" cy="200" rx="400" ry="150"/>
    </g>
    <g class="storm-face">
      <path d="M640 240Q700 200 760 240Q700 250 640 240Z"/><path d="M840 240Q900 200 960 240Q900 250 840 240Z"/>
      <path class="brow" d="M620 200L770 230M980 200L830 230" stroke-width="18" stroke-linecap="round"/>
    </g>
    <path class="bolt" d="M1080 260L1010 470L1070 470L990 700L1150 420L1080 420L1140 260Z"/>
    <g transform="translate(800 520)">${pieces()}</g>
    <g class="rain">${rain}</g>
    <path class="m1 dark" d="M0 880Q400 820 800 870T1600 850V1000H0Z"/>`,
  cave: () => `
    <rect class="dusk" width="1600" height="1000"/>
    <path class="m2 dark" d="M0 700L300 420L520 360L760 300L980 380L1240 330L1600 520V1000H0Z"/>
    <path class="cave-mouth" d="M640 690Q660 470 820 460Q980 470 990 690Z"/>
    <g class="sun-hide"><circle cx="0" cy="0" r="78" class="sun"/><circle cx="0" cy="0" r="140" class="sun-halo"/></g>
    <path class="boulder" d="M1000 700Q1010 560 1110 550Q1210 560 1220 700Z"/>
    <path class="m1 dark" d="M0 860Q400 800 800 850T1600 830V1000H0Z"/>
    <rect class="dim" width="1600" height="1000"/>`,
  shrine: () => `
    <rect class="night" width="1600" height="1000"/>${stars}
    <circle cx="1240" cy="200" r="70" class="moon"/>
    <path class="m3 dark" d="M0 640L220 520L420 600L640 480L860 600L1080 500L1300 620L1600 540V1000H0Z"/>
    <g class="shrine-hall">
      <path d="M520 520L800 400L1080 520Z" class="roof"/><rect x="570" y="520" width="460" height="200" class="hall"/>
      <rect x="760" y="580" width="80" height="140" class="door"/>
    </g>
    ${torii(800, 880, 2.2, 'torii big')}
    ${lantern(360, 900, 1.6)}${lantern(1240, 900, 1.6)}
    <path class="m1 dark" d="M0 920Q400 880 800 910T1600 900V1000H0Z"/>`,
  lanterns: () => `
    <rect class="night warm" width="1600" height="1000"/>${stars}
    <g class="shrine-hall">
      <path d="M420 560L800 400L1180 560Z" class="roof"/><rect x="480" y="560" width="640" height="220" class="hall"/>
      <rect x="760" y="620" width="80" height="160" class="door lit"/>
    </g>
    ${[200, 420, 640, 960, 1180, 1400].map((x, i) => `<g class="hang" style="animation-delay:${0.5 + i * 0.45}s" transform="translate(${x} 260)">
      <line y1="-260" y2="-40" class="string"/><ellipse rx="48" ry="62" class="chochin"/><rect x="-30" y="-70" width="60" height="12" rx="4" class="cap"/><rect x="-30" y="58" width="60" height="12" rx="4" class="cap"/></g>`).join('')}
    <path class="m1 dark" d="M0 900Q400 860 800 890T1600 880V1000H0Z"/>`,
  bamboo: () => `
    <rect class="dusk green" width="1600" height="1000"/>
    ${Array.from({ length: 16 }, (_, i) => `<g class="stalk" transform="translate(${i * 105 + 20} 0)"><rect x="-12" width="${18 + (i % 3) * 6}" height="1000"/>${[180, 400, 620, 840].map((y) => `<rect x="-14" y="${y + (i % 4) * 20}" width="${22 + (i % 3) * 6}" height="8" class="node"/>`).join('')}</g>`).join('')}
    <g class="bush"><ellipse cx="800" cy="900" rx="520" ry="160"/><ellipse cx="300" cy="940" rx="360" ry="130"/><ellipse cx="1340" cy="930" rx="380" ry="140"/></g>`,
  path: () => `
    <rect class="dusk" width="1600" height="1000"/>
    <circle cx="1240" cy="220" r="80" class="moon"/>
    <path class="m3" d="M0 600L240 480L440 560L700 440L900 560L1140 470L1360 580L1600 500V1000H0Z"/>
    <path class="river" d="M1600 640Q1200 700 1000 760T500 900T0 980V1000H1600Z"/>
    <path class="road" d="M200 1000Q420 860 700 800T1300 640L1340 660Q1000 760 760 840T300 1000Z"/>
    <g class="kappa-eyes"><circle cx="1180" cy="780" r="9"/><circle cx="1212" cy="780" r="9"/></g>`,
};

export function scene(kind) {
  return `<svg class="scene-art scene-${kind}" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${(SCENES[kind] || SCENES.sky)()}</svg>`;
}
