const CACHE = 'excalc-v408';
const CACHE_PREFIX = 'excalc-';   // このアプリのキャッシュだけを見分けるための名前
const ASSETS = ['./', './index.html', './help.js', './manifest.json',
  './icon-192.png', './icon-512.png',
  './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png'];

// 新しい版が用意できても、すぐには入れ替わらない（作業中に画面が飛ばないように）。
// アプリ側が「いま更新」を押したときだけ SKIP_WAITING が届いて入れ替わる。
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      // 自分の古いキャッシュだけを消す。キャッシュは「サイト（オリジン）ごと」に
      // 共通なので、名前で絞らないと同じサイトにある別のアプリの分まで消してしまう。
      Promise.all(keys.filter(k => k !== CACHE && k.startsWith(CACHE_PREFIX)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ネットワーク優先：オンライン時は常に最新版を取得してキャッシュも更新する。
// オフライン時のみキャッシュから返す（更新が確実に反映されるようにするため）。
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
      // 電波がないときは持っている分を返す。持っていないときに index.html で代わりを
      // するのは画面を開くとき（navigate）だけ。説明書（help.js）などに HTML を返すと壊れるため
      caches.match(e.request).then(cached => cached ||
        (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
    )
  );
});
