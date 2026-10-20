const CACHE = 'excalc-v562';
const CACHE_PREFIX = 'excalc-';   // このアプリのキャッシュだけを見分けるための名前
// 📷レシート読み取りの「文字を読む部品」（vendor/ocr。約8MB）は、使った人の分だけ 別の控えに入れて、版上げでは消さない。
// 部品を入れかえたときは 数字を上げる（古い控えは消す）。v561
const OCR_CACHE = 'hyo-ocr-v1';
const isOcr = u => u.origin === self.location.origin && u.pathname.includes('/vendor/ocr/');
const ASSETS = ['./', './index.html', './help.js', './photomemo.js', './techo.js', './subsc.js', './heya.js', './annai.js', './shimai.js', './meishi.js', './renraku.js', './renraku-yomi.js', './renraku-icons.js', './trim.js', './manner.js', './boki.js', './kurashi.js', './keisan.js', './ruler.js', './kakudo.js', './tatekae.js', './kuji.js', './dasetsu.js', './receipt.js', './regi.js', './kakeizu.js', './koe/phrase.js', './hyovoice.js', './manifest.json',
  './saien/index.html', './saien/css/style.css', './saien/js/version.js', './saien/js/veg-data.js', './saien/js/veg-more.js', './saien/js/util.js', './saien/js/plan.js', './saien/js/grow.js', './saien/js/sick.js', './saien/js/weather.js', './saien/js/qr.js', './saien/js/advice.js', './saien/js/myplan.js', './saien/js/export.js', './saien/js/fieldmap.js', './saien/js/records.js', './saien/js/share.js', './saien/js/voice.js', './saien/js/store.js', './saien/js/app.js', './saien/icon-192.png',
  './icon-192.png', './icon-512.png',
  './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './techo/index.html', './techo/manifest.json', './techo/icon-192.png', './techo/icon-512.png', './techo/apple-touch-icon.png'];

// 新しい版が用意できても、すぐには入れ替わらない（作業中に画面が飛ばないように）。
// アプリ側が「いま更新」を押したときだけ SKIP_WAITING が届いて入れ替わる。
// 同じ場所に前に置いてあった別のアプリ（英単語マスターの古い版 など）の控え。
// それらは「控えを先に返す」作りなので、残っていると新しく置いた表電卓が出てこない。
// 見つけたら待たずに入れ替わり、その控えを消す。次に開いたときから表電卓が出る（v451）。
const LEGACY_PREFIXES = ['tango-master-'];
const isLegacy = k => LEGACY_PREFIXES.some(p => k.startsWith(p));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => caches.keys()).then(keys => { if (keys.some(isLegacy)) return self.skipWaiting(); }));
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      // 自分の古いキャッシュだけを消す。キャッシュは「サイト（オリジン）ごと」に
      // 共通なので、名前で絞らないと同じサイトにある別のアプリの分まで消してしまう。
      Promise.all(keys.filter(k => (k !== CACHE && k.startsWith(CACHE_PREFIX)) || (k.startsWith('hyo-ocr-') && k !== OCR_CACHE) || isLegacy(k)).map(k => caches.delete(k)))
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

// ネットワーク優先：オンライン時は常に最新版を取得してキャッシュも更新する。
// オフライン時のみキャッシュから返す（更新が確実に反映されるようにするため）。
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 文字を読む部品は 変わらないので、控えにあれば それを返す（電波がなくても読める）
  if (isOcr(new URL(e.request.url))) {
    e.respondWith(caches.open(OCR_CACHE).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => hit ||
      fetch(e.request).then(res => { if (res && res.ok) c.put(e.request, res.clone()).catch(() => {}); return res; }))));
    return;
  }
  e.respondWith(
    netFetch(e.request).then(res => {
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
