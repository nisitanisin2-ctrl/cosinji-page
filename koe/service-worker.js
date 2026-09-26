// このアプリ（koe/）専用のキャッシュ。同じサイトにある別アプリの分を消さないよう、
// 名前の頭で自分の分だけを見分ける。
// index.html の APP_VERSION を上げたら、ここの CACHE も必ずそろえること。
const CACHE = 'koe-v15';
const CACHE_PREFIX = 'koe-';
const ASSETS = ['./', './index.html', './phrase.js', './manifest.json', './icon-192.png', './icon-512.png'];

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

// GitHub Pages はブラウザに10分ほど控えを持たせるので、そのまま取ると古い版が返ることがある。
// 自分のサイトの分は、毎回サーバーに新しくなっていないかたしかめて取る（no-cache）。
function netFetch(req){
  if (new URL(req.url).origin === self.location.origin)
    return fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
  return fetch(req);
}

// ネットワーク優先：つながるときは最新を取り、つながらないときだけ控えを返す。
// 控えにない部品の代わりに index.html を返すのは、画面を開くとき（navigate）だけ。
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    netFetch(e.request).then(res => {
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
