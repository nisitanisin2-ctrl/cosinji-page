// 📇 連絡帳だけのアプリ（v550）の控え。表電卓（../service-worker.js）とは別の名前で持つ。
// ネットワーク優先：つながっていれば いつも新しいものを取り、控えも新しくする。電波がないときだけ 控えを返す。
const CACHE = 'renraku-app-v554';
const PREFIX = 'renraku-app-';
// かならず要るもの（このフォルダの中）
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
// 連絡帳の本体・よみの辞書・アイコン。Netlify などに このフォルダだけ置くときは 同じ場所、
// 表電卓といっしょに置くときは ひとつ上（../）にある。ない方は とばす。
const MAYBE = ['./renraku.js', './renraku-yomi.js', './renraku-icons.js', '../renraku.js', '../renraku-yomi.js', '../renraku-icons.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })));
    await Promise.all(MAYBE.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => { if (r && r.ok) return c.put(u, r); }).catch(() => {})));
  }).then(() => self.skipWaiting()));   // ネットワーク優先なので すぐ入れかわってよい
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k.startsWith(PREFIX)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function netFetch(req) {
  if (new URL(req.url).origin === self.location.origin) return fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
  return fetch(req);
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    netFetch(e.request).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(e.request).then(cached => cached ||
      (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
