// 🎓算数・数学チャレンジ（sansu/）専用のキャッシュ。
// 同じサイトに表電卓・英単語マスターなどがあるので、名前の頭（sansu-）で自分の分だけを見分けて消す。
const CACHE = 'sansu-v1';
const CACHE_PREFIX = 'sansu-';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './css/style.css', './js/core.js', './js/units-e.js', './js/units-j.js', './js/answer.js', './js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k.startsWith(CACHE_PREFIX)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// GitHub Pages はブラウザに10分ほど控えを持たせるので、自分のサイトの分は毎回たしかめて取る（no-cache）。
function netFetch(req){
  return fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
}

// ネットワーク優先：つながるときは最新を取り（直したものがすぐ届く）、つながらないときだけ控えを返す。
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    netFetch(e.request).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
      return res;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then(cached => cached ||
        (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
    )
  );
});
