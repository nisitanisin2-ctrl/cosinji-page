// 📚英単語マスター（eigo/）専用のキャッシュ。
// 同じサイトに表電卓・声の計算帳などがあるので、名前の頭（eigo-）で自分の分だけを見分けて消す。
// （もとは自分以外のキャッシュをぜんぶ消していたため、表電卓の控えまで消えていた）
const CACHE = 'eigo-v3';   // v533：🎤 発音チェック（speech.js）・💬 英会話（talk.js）、v534：続けてサクサク
const CACHE_PREFIX = 'eigo-';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './css/style.css', './js/app.js', './js/jhistory.js', './js/passages.js', './js/stories.js', './js/words.js',
  './js/speech.js', './js/talk.js'];

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
  if (new URL(req.url).origin === self.location.origin)
    return fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
  return fetch(req);
}

// ネットワーク優先：つながるときは最新を取り（直したものがすぐ届く）、つながらないときだけ控えを返す。
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
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
