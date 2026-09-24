/* 見た目のテスト（v401）。
   主な画面をいつも同じ条件で撮り、tests/visual/base/ の見本と1画素ずつ見比べる。
   数で押さえるテスト（run.js のほかの組）は「中身が正しいか」は見られても、
   「✕ が時計の帯に隠れた」「ボタンが重なった」のような崩れには気づけない。それを拾うためのもの。

     node tests/run.js visual            見本と見比べる（run.js のいちばん最後にも入っている）
     node tests/visual.js                同じ（これだけを動かす）
     node tests/visual.js --update       見本を撮り直す（わざと見た目を変えたときだけ）
     node tests/visual.js --update 名前   1画面だけ撮り直す

   違っていたら tests/visual/out/ に「いまの画面」と「違うところを赤くした画像」を置く。
   見比べは Chromium の中の canvas でするので、ほかの道具は要らない。
   見本は、このリポジトリのテストを動かしている環境（同じ Chromium・同じ書体）で撮ったもの。
   別の環境で動かすと書体の違いで外れることがあるので、そのときはその環境で --update してから使う。 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = 'file://' + path.join(ROOT, 'index.html');
const BASE = path.join(__dirname, 'visual', 'base');
const OUT = path.join(__dirname, 'visual', 'out');

/* 1画素の色の差がこれ以下なら同じとみなす（文字の縁のにじみを拾わないため） */
const PIX_TOL = 40;
/* 画面のうち、これより多く変わっていたら「崩れた」とする */
const MAX_RATIO = 0.004;

/* 当番表は年と名簿を決めておく（今日の日づけで中身が変わらないように） */
const TOUBAN_FIX = JSON.stringify({
  title: 'ごみ庫そうじ当番', sub: '◯◯自治会', year: 2026, half: 'H1',
  cfg: { days: [2, 5], holiday: 'shift', skipNY: true },
  roster: [{ name: '佐藤' }, { name: '鈴木' }, { name: '高橋' }], assign: {}, start: 1,
});

const PHONE = { width: 390, height: 844 };
const SCREENS = [
  { name: 'phone-sheet', vp: PHONE },
  { name: 'phone-data', vp: PHONE, act: async p => {
      for (const [r, v] of [[0, '1200'], [1, '350'], [2, '4800']]) {
        await p.click('#c' + r + '_0'); await p.keyboard.type(v); await p.keyboard.press('Enter');
      }
      await p.click('#c3_0'); await p.evaluate(() => { hideEditBar(); autoSum(); });   // 選んでいるセルを押すと出る帯（v418）は見本に入れない
    } },
  { name: 'phone-more', vp: PHONE, act: p => p.evaluate(() => openMoreMenu()) },
  { name: 'phone-set0', vp: PHONE, act: p => p.evaluate(() => { toggleSettings(); setSettingsTab(0); }) },
  { name: 'phone-set1', vp: PHONE, act: p => p.evaluate(() => { toggleSettings(); setSettingsTab(1); }) },
  { name: 'phone-set2', vp: PHONE, act: p => p.evaluate(() => { toggleSettings(); setSettingsTab(2); }) },
  { name: 'phone-dentaku', vp: PHONE, act: p => p.evaluate(() => switchMode('dentaku')) },
  { name: 'phone-dark', vp: PHONE, act: p => p.evaluate(() => toggleDark()) },
  { name: 'se-sheet', vp: { width: 375, height: 667 } },
  { name: 'phone-land', vp: { width: 844, height: 390 } },
  { name: 'pc-side', vp: { width: 1280, height: 800 } },
  /* iPhone の時計・電池の帯（47px）がある画面で、全画面の道具の ✕ が隠れないか（v386 の不具合） */
  { name: 'touban-notch', vp: PHONE, pre: { excalc_touban: TOUBAN_FIX }, act: p => p.evaluate(() => {
      document.documentElement.style.setProperty('--safe-top', '47px');
      document.documentElement.style.setProperty('--safe-bottom', '34px');
      openTouban();
    }) },
  { name: 'print-panel', vp: PHONE, act: p => p.evaluate(() => { openTansui(); openPrn('tsx'); }) },
  /* 当番表の色をえらんだところ（v403） */
  { name: 'touban-color', vp: PHONE, pre: { excalc_touban: JSON.stringify(Object.assign(JSON.parse(TOUBAN_FIX), {
      assign: { '2026-04-07': 1, '2026-04-10': 2 },
      col: { bg: '#fff8e1', duty: '#c8e6c9', sat: '#e3f2fd', sun: '#fce4ec', hol: '#ffe0b2' } })) },
    act: p => p.evaluate(() => openTouban()) },
  /* テンキーの左の書式・枠線のページ（v407 で Excel の形に） */
  { name: 'fmt-page', vp: PHONE, act: p => p.evaluate(() => numpadPager.go('fmt')) },
];

async function shoot(browser, sc) {
  const ctx = await browser.newContext({ viewport: sc.vp, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(INDEX);
  await page.evaluate(pre => {
    localStorage.clear();
    localStorage.setItem('excalc_tour_done', '1');
    for (const k in (pre || {})) localStorage.setItem(k, pre[k]);
  }, sc.pre || {});
  await page.reload(); await page.waitForTimeout(900);
  // 起動したときに出る「新しくなったこと」の知らせは、版ごとに文が変わるので見本には入れない
  await page.evaluate(() => { try { markSeenVer(); } catch (_) {} document.querySelectorAll('.notice-bar').forEach(e => e.remove()); });
  if (sc.act) { await sc.act(page); }
  await page.waitForTimeout(700);
  // 動くもの（入力の棒・消えかけの知らせ）は止めて消す
  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important;caret-color:transparent!important}#toast,.toast{display:none!important}' });
  await page.waitForTimeout(100);
  const buf = await page.screenshot({ animations: 'disabled', caret: 'hide' });
  await ctx.close();
  return buf;
}

/* 2枚の PNG を Chromium の canvas で見比べる。違う画素の割合と、違うところを赤くした画像を返す */
async function compare(browser, a, b) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const r = await page.evaluate(async ({ a, b, tol }) => {
    const load = src => new Promise((ok, ng) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ng; im.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height)
      return { size: [ia.width, ia.height, ib.width, ib.height], ratio: 1, diff: null };
    const w = ia.width, h = ia.height;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    cx.drawImage(ia, 0, 0); const da = cx.getImageData(0, 0, w, h).data;
    cx.clearRect(0, 0, w, h);
    cx.drawImage(ib, 0, 0); const dbi = cx.getImageData(0, 0, w, h);
    const db = dbi.data;
    let n = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > tol) { n++; db[i] = 255; db[i + 1] = 0; db[i + 2] = 0; db[i + 3] = 255; }
      else { const g = (db[i] + db[i + 1] + db[i + 2]) / 3; db[i] = db[i + 1] = db[i + 2] = 200 + g * 0.2; }
    }
    cx.putImageData(dbi, 0, 0);
    return { ratio: n / (w * h), diff: n ? cv.toDataURL('image/png') : null };
  }, { a: 'data:image/png;base64,' + a.toString('base64'), b: 'data:image/png;base64,' + b.toString('base64'), tol: PIX_TOL });
  await ctx.close();
  return r;
}

/* run.js からも、ひとりでも使えるようにする。check(name, got, want) は run.js の記録係 */
async function runVisual(browser, check, opt = {}) {
  console.log('\n── 見た目（見本と見比べる） ──');
  fs.mkdirSync(BASE, { recursive: true });
  const list = opt.name ? SCREENS.filter(s => s.name === opt.name) : SCREENS;
  if (!list.length) { console.log('  そんな名前の画面はありません: ' + opt.name); return; }
  for (const sc of list) {
    const now = await shoot(browser, sc);
    const bp = path.join(BASE, sc.name + '.png');
    if (opt.update || !fs.existsSync(bp)) {
      fs.writeFileSync(bp, now);
      console.log('  📷 見本を' + (opt.update ? '撮り直しました' : '作りました') + ': ' + sc.name);
      continue;
    }
    const r = await compare(browser, fs.readFileSync(bp), now);
    const ok = r.ratio <= MAX_RATIO;
    if (!ok) {
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, sc.name + '.png'), now);
      if (r.diff) fs.writeFileSync(path.join(OUT, sc.name + '-diff.png'), Buffer.from(r.diff.split(',')[1], 'base64'));
      console.log('    ' + sc.name + ': ' + (r.size ? '大きさが違う ' + r.size.join('×') : (r.ratio * 100).toFixed(2) + '% ちがう') +
        ' → tests/visual/out/ を見てください');
    }
    check('  ' + sc.name + ' が見本と同じ', ok, true);
  }
}

module.exports = { runVisual, SCREENS, shoot, compare };

if (require.main === module) {
  const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
  const args = process.argv.slice(2);
  const update = args.includes('--update');
  const name = args.find(a => !a.startsWith('--')) || '';
  let pass = 0, fail = 0;
  const check = (n, got, want) => { if (String(got) === String(want)) pass++; else { fail++; console.log('  ✗' + n); } };
  (async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
    try { await runVisual(browser, check, { update, name }); } finally { await browser.close(); }
    console.log(`合計 ${pass + fail} 件 : 通った ${pass} / 通らなかった ${fail}`);
    process.exit(fail ? 1 : 0);
  })().catch(e => { console.error('実行に失敗:', e.message); process.exit(2); });
}
