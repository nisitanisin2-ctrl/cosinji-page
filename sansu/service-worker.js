// 🎓算数・数学チャレンジ（sansu/）専用のキャッシュ。
// 同じサイトに表電卓・英単語マスターなどがあるので、名前の頭（sansu-）で自分の分だけを見分けて消す。
// 版を上げたら、ここも js/version.js の VERSION と同じにする（テストでたしかめている）
const CACHE = 'sansu-v9';
const CACHE_PREFIX = 'sansu-';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './css/style.css', './js/core.js', './js/version.js', './js/units-e.js', './js/units-j.js', './js/units-e2.js', './js/units-e3.js', './js/units-j2.js', './js/units-w.js', './js/units-order.js', './js/answer.js', './js/mistakes.js', './js/cards.js', './js/medals.js', './js/furi.js', './js/voice.js', './js/store.js', './js/app.js'];
// v1 の 画面には「いま更新」の ボタンが ない（新しい 版が 来ると すぐ 入れかわる 作り）。その 版から 来た ときだけは 待たずに 入れかわる
const NO_ASK = k => /^sansu-v1$/.test(k);

// 新しい 版が 用意 できても、すぐには 入れかわらない（問題の とちゅうで 画面が かわらないように）。
// 画面の「いま更新」を 押した ときだけ SKIP_WAITING が 届いて 入れかわる（表電卓と 同じ）。
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => caches.keys()).then(keys => { if (keys.some(NO_ASK)) return self.skipWaiting(); }));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

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
