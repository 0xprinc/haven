// The Lost Words: the story, chapter by chapter.
// Susanoo's storm tore the sacred scroll, and its words scattered.
// Kiko, a little fox cub from Inari's shrine, sets out to find them.
//
// Each level is one torn piece of the scroll. Level types take turns:
//   classic  - a list of words to find
//   riddle   - clues only; work out each word, then find it
//   sentence - a line of the story with gaps to fill
//   secret   - after every word, the leftover letters spell a message
//   scroll   - story lines that must be found in order
//   count    - "find 5 animals": no list at all
//   odd      - find them all, then pick the one that doesn't belong
// A boss level ends each chapter.
//
// dirs: 'A' right/down, 'B' + down-right, 'C' + up-right,
//       'D' + every direction, backwards too.

export const CHAPTERS = [
  { id: 1, name: "Inari's Shrine", place: 'shrine', from: 1, to: 25, ready: true },
  { id: 2, name: 'The Whispering River', place: 'river', from: 26, to: 50 },
  { id: 3, name: 'The Bamboo Forest', place: 'bamboo', from: 51, to: 75 },
  { id: 4, name: "Tengu's Mountain", place: 'mountain', from: 76, to: 100 },
  { id: 5, name: 'The Thunder Sky', place: 'sky', from: 101, to: 125 },
  { id: 6, name: 'The Moon Palace', place: 'moon', from: 126, to: 150 },
  { id: 7, name: 'The Storm Sea', place: 'sea', from: 151, to: 175 },
  { id: 8, name: 'The Sun Cave', place: 'cave', from: 176, to: 200 },
];

export const TOTAL = 200;
export const READY = CHAPTERS.filter((c) => c.ready).reduce((m, c) => Math.max(m, c.to), 0);

export function chapterFor(n) {
  return CHAPTERS.find((c) => n >= c.from && n <= c.to) || CHAPTERS[CHAPTERS.length - 1];
}

// Story scenes: which plays before or after which level.
export const SCENES_AT = {
  before: { 1: 'prologue', 13: 'pon' },
  after: { 25: 'chapter1' },
};

// who: inari | kiko | pon. Shown in a speech bubble when the level opens.
const L = [];

L[1] = {
  type: 'classic', size: 6, dirs: 'A',
  words: ['FOX', 'RICE', 'BELL', 'GATE'],
  say: ['inari', 'Little Kiko, the storm tore our scroll. Find its lost words.'],
  coach: 'Slide your finger across the letters of a word',
};
L[2] = {
  type: 'classic', size: 6, dirs: 'A',
  words: ['TORII', 'ROPE', 'MOSS', 'STEPS', 'INK'],
  say: ['kiko', 'The red shrine gate! I can see words hiding in it.'],
};
L[3] = {
  type: 'sentence', size: 7, dirs: 'A',
  text: 'The {STORM} tore the {SACRED} {SCROLL} into {PIECES}.',
  say: ['inari', 'Each word you find mends a line of the story.'],
  coach: 'Each word you find fills a gap',
};
L[4] = {
  type: 'riddle', size: 7, dirs: 'A',
  clues: [
    ['LANTERN', 'I glow on paper walls at night'],
    ['CEDAR', 'A tall old tree that guards the shrine'],
    ['MOCHI', 'A soft, sweet cake made of rice'],
    ['CRANE', 'A paper bird, folded for luck'],
  ],
  say: ['inari', 'These words are shy. Read my riddles to know them.'],
  coach: 'Solve the riddle, then find the word',
};
L[5] = {
  type: 'classic', size: 7, dirs: 'B',
  words: ['SHRINE', 'TAIL', 'EARS', 'PAW', 'SCARF', 'KIKO'],
  say: ['kiko', 'Ooh, some words lean sideways now!'],
  coach: 'Words can run on a slant now',
};
L[6] = {
  type: 'secret', size: 7, dirs: 'B',
  words: ['SUNRISE', 'SHADOW', 'CAVE', 'HIDDEN', 'GODDESS', 'DARK'],
  secret: 'WORDS HAVE SPIRIT',
  say: ['inari', 'When all words are found, the leftover letters speak.'],
  coach: 'The leftover letters hide a secret',
};
L[7] = {
  type: 'classic', size: 8, dirs: 'B',
  words: ['DRUM', 'FLUTE', 'KOTO', 'DANCE', 'SONG', 'BLOSSOM', 'PETAL'],
  say: ['kiko', 'Festival words! I can almost hear the drums.'],
};
L[8] = {
  type: 'count', size: 8, dirs: 'B',
  label: 'animals of the shrine',
  words: ['FOX', 'CRANE', 'KOI', 'TURTLE', 'DEER'],
  say: ['inari', 'Five creatures live near our shrine. No list this time.'],
  coach: 'No list! Find the 5 animals',
};
L[9] = {
  type: 'sentence', size: 8, dirs: 'B',
  text: 'Without its {WORDS}, the {SUN} goddess {FORGOT} her own {NAME}.',
  say: ['inari', 'Do you see why the words matter so much?'],
};
L[10] = {
  type: 'scroll', size: 8, dirs: 'B',
  lines: [
    'Kiko climbed a thousand red {GATES}.',
    'She passed the sleeping stone {FOXES}.',
    'At the top glowed a tiny {LANTERN}.',
    'Inside it, a word was {WAITING}.',
  ],
  say: ['kiko', 'A story scroll! I have to read it in order.'],
  coach: 'Find the words in story order',
};
L[11] = {
  type: 'riddle', size: 8, dirs: 'C',
  clues: [
    ['TOFU', "Fried, it's every fox's favourite treat"],
    ['OMAMORI', 'A lucky charm in a little silk bag'],
    ['KAMI', 'The spirits and gods of old Japan'],
    ['WATER', 'Rinse your hands with it before you pray'],
    ['EMA', 'A wooden plaque for writing wishes'],
  ],
  say: ['inari', 'Words may climb upward now. Look carefully.'],
  coach: 'Words can run upward on a slant too',
};
L[12] = {
  type: 'odd', size: 8, dirs: 'C',
  words: ['SUN', 'MOON', 'STAR', 'CLOUD', 'RAIN', 'MOCHI'],
  odd: 'MOCHI',
  question: 'Five are found in the sky. Which one is not?',
  say: ['kiko', 'One of these words is a trickster. I can tell!'],
  coach: 'Find them all, then pick the odd one out',
};
L[13] = {
  type: 'classic', size: 8, dirs: 'C',
  words: ['TANUKI', 'LEAF', 'HAT', 'BELLY', 'PRANK'],
  bonus: ['PON'],
  say: ['pon', 'Hee hee! I hid my own words too. Find them for a bonus!'],
  coach: "Pon hides bonus words. They're not on the list",
};
L[14] = {
  type: 'sentence', size: 9, dirs: 'C',
  text: 'Pon {LAUGHED} and {TUMBLED} down the {MOSSY} {STEPS}.',
  bonus: ['FUN'],
  say: ['kiko', 'Come back here, you silly tanuki!'],
};
L[15] = {
  type: 'secret', size: 7, dirs: 'C',
  words: ['COURAGE', 'JOURNEY', 'FRIEND', 'PATH', 'HEART', 'HOPE'],
  secret: 'BE BRAVE LITTLE FOX',
  say: ['inari', 'Another secret waits under these words.'],
};
L[16] = {
  type: 'riddle', size: 9, dirs: 'C',
  clues: [
    ['SUSANOO', 'The storm god who lost his temper'],
    ['AMATERASU', 'The goddess of the sun'],
    ['TSUKUYOMI', 'Their quiet brother, god of the moon'],
    ['INARI', 'The fox god of rice and of this shrine'],
  ],
  bonus: ['KIT'],
  say: ['inari', 'Learn the names of the great kami, Kiko.'],
};
L[17] = {
  type: 'count', size: 9, dirs: 'C',
  label: 'festival things',
  words: ['DRUM', 'MASK', 'FAN', 'KITE', 'CANDY', 'LANTERN'],
  bonus: ['YUM'],
  say: ['pon', 'Six festival things are hiding. Bet you miss one!'],
};
L[18] = {
  type: 'scroll', size: 9, dirs: 'C',
  lines: [
    'Suddenly the wind began to {HOWL}.',
    'Dark clouds {GATHERED} over the hill.',
    'Kiko held her lantern {TIGHT}.',
    'Its little flame would not go {OUT}.',
  ],
  bonus: ['WOW'],
  say: ['kiko', 'The storm is coming back. I must be quick!'],
};
L[19] = {
  type: 'classic', size: 9, dirs: 'D',
  words: ['MIRROR', 'JEWEL', 'SWORD', 'TREASURE', 'SACRED', 'THREE'],
  bonus: ['GEM'],
  say: ['inari', 'Some words now hide backwards. Read both ways.'],
  coach: 'Words can run backwards now',
};
L[20] = {
  type: 'odd', size: 9, dirs: 'D',
  words: ['INARI', 'RAIJIN', 'FUJIN', 'EBISU', 'HACHIMAN', 'TOFU'],
  odd: 'TOFU',
  question: 'Five are gods. Which one is not?',
  bonus: ['GOD'],
  say: ['pon', "One of these isn't a god at all. Ha!"],
};
L[21] = {
  type: 'riddle', size: 9, dirs: 'D',
  clues: [
    ['RAIJIN', 'God of thunder, who beats drums in the sky'],
    ['FUJIN', 'God of wind, who carries a bag of air'],
    ['TENGU', 'A long-nosed spirit of the mountains'],
    ['KAPPA', 'A river imp with a dish of water on its head'],
    ['TANUKI', 'A round trickster who can change shape'],
  ],
  bonus: ['IMP'],
  say: ['inari', 'You will meet these spirits on your journey.'],
};
L[22] = {
  type: 'sentence', size: 9, dirs: 'D',
  text: 'One by one, the {LANTERNS} of the {SHRINE} began to {GLOW} {AGAIN}.',
  bonus: ['LIT'],
  say: ['kiko', 'Look, Inari! The shrine is waking up!'],
};
L[23] = {
  type: 'secret', size: 8, dirs: 'D',
  words: ['DAWN', 'MORNING', 'GOLDEN', 'LIGHT', 'WARMTH', 'SHINE', 'BRIGHT', 'GLOW', 'RAYS'],
  secret: 'THE SUN WILL RISE AGAIN',
  say: ['inari', 'One last secret. Then Pon has a test for you.'],
};
L[24] = {
  type: 'scroll', size: 9, dirs: 'D',
  lines: [
    'Kiko gathered every lost {WORD}.',
    'She tied the scroll with her red {SCARF}.',
    'Inari smiled a {PROUD} smile.',
    'But the {JOURNEY} had only begun.',
  ],
  bonus: ['YAY'],
  say: ['kiko', 'Almost there. Just one more scroll!'],
};
L[25] = {
  type: 'classic', size: 9, dirs: 'D', boss: true,
  words: ['KITSUNE', 'INARI', 'SHRINE', 'LANTERN', 'BLOSSOM', 'FESTIVAL'],
  decoys: ['KITSUME', 'INAPI', 'SHRIME', 'LANTEPN'],
  bonus: ['PON'],
  say: ['pon', "Boss time! I hid fake words that look real. Don't fall for them!"],
  coach: 'Careful: some words are fakes with one wrong letter',
};

// Lantern time: generous at first, tighter as the chapter goes on.
function seconds(n, def, count) {
  const per = def.boss ? 7 : 14 - (n - 1) * 0.25; // 14s per word at level 1, ~8s by level 24
  const extra = def.type === 'riddle' ? 5 : def.type === 'secret' ? 3 : 0;
  return Math.round(15 + count * (per + extra));
}

// Normalize a level: every type gets a flat `targets` list.
export function levelDef(n) {
  const d = L[n];
  if (!d) return null;
  let targets;
  if (d.type === 'riddle') targets = d.clues.map(([w]) => w);
  else if (d.type === 'sentence') targets = [...d.text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  else if (d.type === 'scroll') targets = d.lines.map((l) => l.match(/\{(\w+)\}/)[1]);
  else targets = d.words.slice();
  return { n, ...d, targets, bonus: d.bonus || [], decoys: d.decoys || [], time: seconds(n, d, targets.length) };
}
