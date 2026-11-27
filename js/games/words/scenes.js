// The story scenes: pages, pictures and spoken lines.
// Pure data, so tools/narrate.mjs can read it too.
// Words in [brackets] tell the voice how to feel; they are not shown.
// Each scene stays under about 30 seconds.

export const VOICES = {
  narrator: 'JBFqnCBsd6RMkjVDRZzb', // George: warm storyteller
  inari: 'pFZP5JQG7iQjIQuC4Bku',    // Lily: calm and kind
  kiko: 'cgSgspJ2msm6clMCkdW9',     // Jessica: bright and young
  pon: 'N2lVS1w4EtoT3dr4eOWO',      // Callum: husky trickster
};

// cam: [scale, x%, y%] at the start and end of the page.
// actors: who stands in the picture, and where (x% from left, size in % of height).
export const SCENES = {
  prologue: {
    title: 'The Lost Words',
    kicker: 'Chapter 1 · Inari’s Shrine',
    pages: [
      {
        art: 'sky', mood: 'calm', fx: ['motes'], cam: [[1, 0, 0], [1.14, 0, -3]],
        lines: [['narrator', '[softly] Long ago, the gods kept every word of the world on one sacred scroll.']],
      },
      {
        art: 'storm', mood: 'storm', fx: ['flash'], grade: 'storm', cam: [[1.12, -2, 0], [1, 2, 0]],
        lines: [['narrator', '[dramatic] But Susanoo, the storm god, flew into a rage... and his storm tore the scroll apart!']],
      },
      {
        art: 'cave', mood: 'dark', grade: 'dusk', cam: [[1, 0, 0], [1.18, 0, 4]],
        lines: [['narrator', '[sadly] Without their words, the gods began to forget. Amaterasu hid in a cave, and the world went dark.']],
      },
      {
        art: 'shrine', mood: 'bright', fx: ['motes'], cam: [[1.1, 0, 3], [1, 0, 0]],
        actors: [['inari', 64, 62], ['kiko', 38, 30]],
        lines: [
          ['inari', '[gently] Little Kiko. Only you can find every lost word.'],
          ['kiko', '[excited] Leave it to me! I will bring them all back!'],
        ],
      },
    ],
  },
  pon: {
    title: 'A Thief in the Bamboo',
    kicker: 'Chapter 1 · Inari’s Shrine',
    pages: [
      {
        art: 'lanterns', mood: 'bright', fx: ['motes'], cam: [[1, 0, 0], [1.1, 0, -2]],
        actors: [['kiko', 50, 28]],
        lines: [['narrator', '[warmly] Word by word, Kiko mended the scroll, and one by one, the lanterns woke up.']],
      },
      {
        art: 'bamboo', mood: 'calm', fx: ['petals'], cam: [[1.08, 2, 0], [1, -2, 0]],
        actors: [['pon', 58, 34]],
        lines: [['pon', '[mischievously] Ooh, shiny words! Finders keepers!']],
      },
      {
        art: 'bamboo', mood: 'bright', fx: ['petals'], cam: [[1, 0, 0], [1.08, 0, 2]],
        actors: [['kiko', 30, 30], ['pon', 72, 32]],
        lines: [
          ['kiko', '[indignant] Hey! Give those back!'],
          ['pon', '[laughs] Catch me if you can! I will hide my own words for you!'],
        ],
      },
    ],
  },
  chapter1: {
    title: 'A New Friend',
    kicker: 'Chapter 1 · The end',
    pages: [
      {
        art: 'lanterns', mood: 'bright', fx: ['motes', 'petals'], cam: [[1, 0, 0], [1.1, 0, -2]],
        actors: [['kiko', 34, 30], ['pon', 66, 32]],
        lines: [
          ['pon', '[laughing] Okay, okay, you win! Can I come with you?'],
          ['kiko', '[happy] Of course, Pon!'],
        ],
      },
      {
        art: 'shrine', mood: 'calm', fx: ['motes'], cam: [[1.08, 0, 2], [1, 0, 0]],
        actors: [['inari', 50, 62]],
        lines: [['inari', '[warmly] The shrine is safe again. But more lost words wait by the river.']],
      },
      {
        art: 'path', mood: 'dark', grade: 'dusk', cam: [[1, 0, 0], [1.2, 6, 4]],
        actors: [['kiko', 22, 18], ['pon', 32, 19]],
        lines: [['narrator', '[mysteriously] So Kiko and her new friend set off for the river... where someone was already waiting.']],
      },
    ],
  },
};

// Every spoken line with its audio file name: scene-1.mp3, scene-2.mp3...
export function lines(id) {
  const out = [];
  SCENES[id].pages.forEach((p) => p.lines.forEach(([who, text]) => out.push({ who, text, file: `${id}-${out.length + 1}.mp3` })));
  return out;
}

export const shown = (text) => text.replace(/\[[^\]]*\]\s*/g, '');
