// このアプリ（notes/）専用のキャッシュ。同じサイトにある別アプリの分を消さないよう、
// 名前の頭で自分の分だけを見分ける。
const CACHE = 'memo-v1';
const CACHE_PREFIX = 'memo-';
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
      caches.match(e.request).then(cached => cached || caches.match('./index.html'))
    )
  );
});
