// The cast, drawn as SVG so they stay crisp at any size.
// Each part sits in its own group, so CSS can move it:
// ears droop, the tail wags, eyes blink, the mouth talks.
//
//   Kiko  - a white fox cub from Inari's shrine (the hero)
//   Pon   - a cheeky tanuki with a leaf on his head
//   Inari - the old fox god, glowing, with many tails

const LINE = '#3a2a22';

let uid = 0;

export function kikoSVG(cls = '') {
  const id = `k${++uid}`;
  return `<svg class="kiko ${cls}" viewBox="0 0 200 220" aria-hidden="true">
  <defs>
    <radialGradient id="${id}f" cx="50%" cy="35%" r="70%">
      <stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#efe4d2"/>
    </radialGradient>
    <linearGradient id="${id}t" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#fffaf1"/><stop offset=".62" stop-color="#f7e9d3"/><stop offset="1" stop-color="#f1b860"/>
    </linearGradient>
  </defs>
  <g class="k-all">
    <ellipse class="k-shadow" cx="102" cy="210" rx="56" ry="7" fill="#000" opacity=".12"/>
    <g class="k-tail">
      <path d="M124 200C160 208 188 184 182 148C178 122 158 108 146 120C162 136 162 166 124 176Z" fill="url(#${id}t)" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M152 140C160 150 162 162 158 172" fill="none" stroke="#e5d3b8" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <g class="k-body">
      <path d="M72 206C60 186 62 150 80 128Q100 120 120 128C138 150 140 186 128 206Q100 214 72 206Z" fill="url(#${id}f)" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M86 134Q100 152 114 134Q112 170 100 180Q88 170 86 134Z" fill="#fffdf9"/>
      <g class="k-paws">
        <ellipse cx="86" cy="205" rx="13" ry="8" fill="#fffaf2" stroke="${LINE}" stroke-width="3"/>
        <ellipse cx="114" cy="205" rx="13" ry="8" fill="#fffaf2" stroke="${LINE}" stroke-width="3"/>
        <path d="M82 207v-4M90 207v-4M110 207v-4M118 207v-4" stroke="${LINE}" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>
    <g class="k-scarf">
      <path class="k-flap" d="M116 128L134 156L123 160L110 134Z" fill="#c9362a" stroke="${LINE}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M68 116Q100 136 132 116L134 127Q100 148 66 127Z" fill="#dd4630" stroke="${LINE}" stroke-width="2.8" stroke-linejoin="round"/>
      <circle cx="100" cy="140" r="6.5" fill="#f2c14e" stroke="${LINE}" stroke-width="2.4"/>
      <path d="M96 141h8" stroke="${LINE}" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <g class="k-head">
      <g class="k-ear k-ear-l">
        <path d="M60 68L50 20Q52 10 60 15L94 48Z" fill="url(#${id}f)" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M64 60L58 30L84 50Z" fill="#f3b4ac"/>
        <path d="M51 24Q52 12 60 15L66 21Q58 22 51 24Z" fill="#e0573c"/>
      </g>
      <g class="k-ear k-ear-r">
        <path d="M140 68L150 20Q148 10 140 15L106 48Z" fill="url(#${id}f)" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M136 60L142 30L116 50Z" fill="#f3b4ac"/>
        <path d="M149 24Q148 12 140 15L134 21Q142 22 149 24Z" fill="#e0573c"/>
      </g>
      <path d="M100 40C126 40 146 56 150 80C152 90 160 96 166 100C150 108 136 118 100 121C64 118 50 108 34 100C40 96 48 90 50 80C54 56 74 40 100 40Z" fill="url(#${id}f)" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M77 97Q100 84 123 97Q119 115 100 119Q81 115 77 97Z" fill="#fffdf9"/>
      <path d="M100 48Q105 58 100 70Q95 58 100 48Z" fill="#e0573c"/>
      <circle cx="90" cy="58" r="2.4" fill="#e0573c"/><circle cx="110" cy="58" r="2.4" fill="#e0573c"/>
      <path d="M64 84Q56 82 50 88M136 84Q144 82 150 88" fill="none" stroke="#e0573c" stroke-width="3" stroke-linecap="round"/>
      <g class="k-eyes">
        <g class="k-open">
          <ellipse cx="78" cy="84" rx="8.5" ry="10.5" fill="#2b1d18"/>
          <ellipse cx="122" cy="84" rx="8.5" ry="10.5" fill="#2b1d18"/>
          <circle cx="81" cy="80" r="3.2" fill="#fff"/><circle cx="125" cy="80" r="3.2" fill="#fff"/>
          <circle cx="75.5" cy="88.5" r="1.5" fill="#fff"/><circle cx="119.5" cy="88.5" r="1.5" fill="#fff"/>
        </g>
        <g class="k-shut" fill="none" stroke="#2b1d18" stroke-width="3.6" stroke-linecap="round">
          <path d="M69 87Q78 76 87 87"/><path d="M113 87Q122 76 131 87"/>
        </g>
      </g>
      <ellipse cx="62" cy="101" rx="7.5" ry="4.2" fill="#f5a097" opacity=".7"/>
      <ellipse cx="138" cy="101" rx="7.5" ry="4.2" fill="#f5a097" opacity=".7"/>
      <path d="M95 98Q100 95 105 98Q103 103 100 104Q97 103 95 98Z" fill="#2b1d18"/>
      <path class="k-smile" d="M92 107Q96 111 100 107Q104 111 108 107" fill="none" stroke="#2b1d18" stroke-width="2.4" stroke-linecap="round"/>
      <path class="k-mouth" d="M92 106Q100 120 108 106Z" fill="#8a2c2c" stroke="#2b1d18" stroke-width="2" stroke-linejoin="round"/>
    </g>
  </g>
</svg>`;
}

export function ponSVG(cls = '') {
  const id = `p${++uid}`;
  return `<svg class="pon ${cls}" viewBox="0 0 200 220" aria-hidden="true">
  <defs>
    <radialGradient id="${id}b" cx="45%" cy="35%" r="75%"><stop offset="0" stop-color="#a7774f"/><stop offset="1" stop-color="#7a5236"/></radialGradient>
  </defs>
  <g class="p-all">
    <ellipse cx="100" cy="210" rx="60" ry="7" fill="#000" opacity=".12"/>
    <g class="p-tail">
      <path d="M140 190C176 196 190 168 176 150C168 140 154 146 150 156C160 162 158 176 136 176Z" fill="url(#${id}b)" stroke="${LINE}" stroke-width="3"/>
      <path d="M170 152l-8 8M178 164l-10 6" stroke="#3b281c" stroke-width="5" stroke-linecap="round"/>
    </g>
    <path d="M58 200C44 168 56 126 100 124C144 126 156 168 142 200Q100 214 58 200Z" fill="url(#${id}b)" stroke="${LINE}" stroke-width="3"/>
    <ellipse cx="100" cy="172" rx="30" ry="28" fill="#e8cfa8"/>
    <ellipse cx="78" cy="204" rx="13" ry="8" fill="#4a3324" stroke="${LINE}" stroke-width="3"/>
    <ellipse cx="122" cy="204" rx="13" ry="8" fill="#4a3324" stroke="${LINE}" stroke-width="3"/>
    <g class="p-head">
      <circle cx="58" cy="52" r="15" fill="#4a3324" stroke="${LINE}" stroke-width="3"/>
      <circle cx="142" cy="52" r="15" fill="#4a3324" stroke="${LINE}" stroke-width="3"/>
      <path d="M100 38C140 38 158 64 156 90C154 112 132 126 100 126C68 126 46 112 44 90C42 64 60 38 100 38Z" fill="url(#${id}b)" stroke="${LINE}" stroke-width="3"/>
      <path d="M52 86C56 70 74 66 88 80C92 94 80 104 66 102C56 100 50 94 52 86Z" fill="#3b281c"/>
      <path d="M148 86C144 70 126 66 112 80C108 94 120 104 134 102C144 100 150 94 148 86Z" fill="#3b281c"/>
      <path d="M78 100Q100 88 122 100Q120 120 100 122Q80 120 78 100Z" fill="#f1e0c4"/>
      <g class="p-eyes">
        <g class="p-open"><circle cx="72" cy="86" r="7" fill="#fff"/><circle cx="128" cy="86" r="7" fill="#fff"/>
          <circle cx="73.5" cy="87" r="4.2" fill="#1f140e"/><circle cx="126.5" cy="87" r="4.2" fill="#1f140e"/>
          <circle cx="75" cy="85" r="1.4" fill="#fff"/><circle cx="128" cy="85" r="1.4" fill="#fff"/></g>
        <g class="p-shut" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path d="M65 89Q72 80 79 89"/><path d="M121 89Q128 80 135 89"/></g>
      </g>
      <ellipse cx="100" cy="101" rx="7" ry="5" fill="#1f140e"/>
      <path class="p-smile" d="M88 110Q100 120 112 110" fill="none" stroke="#1f140e" stroke-width="2.6" stroke-linecap="round"/>
      <path class="p-mouth" d="M88 109Q100 126 112 109Z" fill="#8a2c2c" stroke="#1f140e" stroke-width="2"/>
      <g class="p-leaf">
        <path d="M100 40C92 20 104 4 124 6C126 26 114 38 100 40Z" fill="#6fae4f" stroke="${LINE}" stroke-width="2.6"/>
        <path d="M101 38Q110 22 122 9" fill="none" stroke="#3f7a2c" stroke-width="2"/>
      </g>
    </g>
  </g>
</svg>`;
}

export function inariSVG(cls = '') {
  const id = `i${++uid}`;
  const tails = [-64, -34, -4, 26, 56]
    .map(
      (a) => `<path transform="rotate(${a} 150 300)" d="M150 300C116 250 112 170 150 96C188 170 184 250 150 300Z" fill="url(#${id}t)" stroke="#e3c47f" stroke-width="2.4"/>`
    )
    .join('');
  return `<svg class="inari ${cls}" viewBox="0 0 300 340" aria-hidden="true">
  <defs>
    <radialGradient id="${id}g" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#fff6d8" stop-opacity=".95"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}t" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset=".68" stop-color="#fbeccc"/><stop offset="1" stop-color="#f2bd5c"/></linearGradient>
    <radialGradient id="${id}f" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#efe2c9"/></radialGradient>
  </defs>
  <circle class="i-glow" cx="150" cy="180" r="165" fill="url(#${id}g)"/>
  <g class="i-tails">${tails}</g>
  <path d="M94 332C78 282 90 214 120 178L180 178C210 214 222 282 206 332Q150 344 94 332Z" fill="url(#${id}f)" stroke="#cdb17a" stroke-width="2.6"/>
  <path d="M128 190Q150 214 172 190Q170 250 150 266Q130 250 128 190Z" fill="#fffdf8"/>
  <ellipse cx="128" cy="330" rx="17" ry="9" fill="#fffaf2" stroke="#cdb17a" stroke-width="2.6"/>
  <ellipse cx="172" cy="330" rx="17" ry="9" fill="#fffaf2" stroke="#cdb17a" stroke-width="2.6"/>
  <path d="M108 172Q150 196 192 172L184 194Q150 252 116 194Z" fill="#d6402b" stroke="#9e2a1c" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M112 180Q150 202 188 180" fill="none" stroke="#f2c14e" stroke-width="3"/>
  <g class="i-head">
    <path d="M112 102L98 34Q100 24 110 30L148 76Z" fill="url(#${id}f)" stroke="#cdb17a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M188 102L202 34Q200 24 190 30L152 76Z" fill="url(#${id}f)" stroke="#cdb17a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M116 92L106 46L136 76Z" fill="#f4bfae"/><path d="M184 92L194 46L164 76Z" fill="#f4bfae"/>
    <path d="M150 70C182 70 204 92 208 120C210 132 218 140 228 146C208 158 186 172 150 180C114 172 92 158 72 146C82 140 90 132 92 120C96 92 118 70 150 70Z" fill="url(#${id}f)" stroke="#cdb17a" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M124 142Q150 128 176 142Q170 170 150 176Q130 170 124 142Z" fill="#fffdf8"/>
    <path d="M150 80Q157 94 150 110Q143 94 150 80Z" fill="#d6402b"/>
    <circle cx="136" cy="92" r="2.6" fill="#d6402b"/><circle cx="164" cy="92" r="2.6" fill="#d6402b"/>
    <g fill="none" stroke="#4a3020" stroke-width="3.6" stroke-linecap="round"><path d="M114 122Q127 131 140 122"/><path d="M160 122Q173 131 186 122"/></g>
    <path d="M108 120Q98 118 90 126M192 120Q202 118 210 126" fill="none" stroke="#d6402b" stroke-width="3" stroke-linecap="round"/>
    <path d="M143 148Q150 144 157 148Q155 155 150 156Q145 155 143 148Z" fill="#3a2a22"/>
    <path d="M140 162Q145 166 150 162Q155 166 160 162" fill="none" stroke="#3a2a22" stroke-width="2.2" stroke-linecap="round"/>
  </g>
</svg>`;
}

// Small face portraits for the speech bubble.
export function portrait(who) {
  if (who === 'pon') return ponSVG('portrait');
  if (who === 'inari') return inariSVG('portrait');
  return kikoSVG('portrait');
}

export const NAMES = { kiko: 'Kiko', pon: 'Pon', inari: 'Inari', narrator: '' };

// Drives a character: blinking, and short moods like happy or sad.
export class Actor {
  constructor(svg) {
    this.el = svg;
    this.mood = null;
    this.t = null;
    this.blinker = setInterval(() => this.blink(), 3200 + Math.random() * 1600);
  }
  blink() {
    if (!this.el.isConnected) return this.destroy();
    this.el.classList.add('blink');
    setTimeout(() => this.el.classList.remove('blink'), 150);
  }
  // happy | cheer | sad | think | talk | yawn
  feel(mood, ms = 1300) {
    clearTimeout(this.t);
    const c = this.el.classList;
    ['happy', 'cheer', 'sad', 'think', 'talk', 'yawn'].forEach((m) => c.remove(m));
    void this.el.getBoundingClientRect();
    c.add(mood);
    this.mood = mood;
    if (ms > 0) this.t = setTimeout(() => { c.remove(mood); this.mood = null; }, ms);
  }
  calm() {
    clearTimeout(this.t);
    ['happy', 'cheer', 'sad', 'think', 'talk', 'yawn'].forEach((m) => this.el.classList.remove(m));
  }
  destroy() {
    clearInterval(this.blinker);
    clearTimeout(this.t);
  }
}
