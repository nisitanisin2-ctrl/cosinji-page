// このアプリ（koe/）専用のキャッシュ。同じサイトにある別アプリの分を消さないよう、
// 名前の頭で自分の分だけを見分ける。
// index.html の APP_VERSION を上げたら、ここの CACHE も必ずそろえること。
const CACHE = 'koe-v2';
const CACHE_PREFIX = 'koe-';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k.startsWith(CACHE_PREFIX)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ネットワーク優先：つながるときは最新を取り、つながらないときだけ控えを返す。
// 控えにない部品の代わりに index.html を返すのは、画面を開くとき（navigate）だけ。
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached => cached || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});
