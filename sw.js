// Offline support: keep the app files on the device.
// Bump VERSION on every release so devices pick up new files.
const VERSION = 'haven-v11';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/words.css',
  'js/app.js',
  'js/ui.js',
  'js/store.js',
  'js/sound.js',
  'js/native.js',
  'js/games/arrows/game.js',
  'js/games/arrows/board.js',
  'js/games/arrows/generator.js',
  'js/games/arrows/levels.js',
  'js/games/arrows/rng.js',
  'js/games/arrows/olympus.js',
  'js/games/arrows/tuned.js',
  'js/games/common/tiers.js',
  'js/games/common/map.js',
  'js/games/bubbles/game.js',
  'js/games/bubbles/view.js',
  'js/games/bubbles/art.js',
  'js/games/bubbles/engine.js',
  'js/games/bubbles/levels.js',
  'js/games/bubbles/shots.js',
  'js/games/bubbles/bot.js',
  'js/games/words/game.js',
  'js/games/words/chapters.js',
  'js/games/words/grid.js',
  'js/games/words/board.js',
  'js/games/words/fx.js',
  'js/games/words/cast.js',
  'js/games/words/art.js',
  'js/games/words/audio.js',
  'js/games/words/story.js',
  'js/games/words/scenes.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/favicon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// App files: network first so updates arrive, cache when offline.
// If the host answers with an error (for example a paused deployment),
// the saved copy is used too, so the games keep working.
// Fonts: cache first, they never change.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  if (isFont) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        c.put(req, res.clone());
        return res;
      })
    );
    return;
  }
  if (url.origin !== location.origin) return;
  const saved = () => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'));
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (!res.ok) return caches.match(req, { ignoreSearch: true }).then((r) => r || res);
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      })
      .catch(saved)
  );
});
