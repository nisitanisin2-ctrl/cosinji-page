/* 説明書の写真を撮り直す道具（v452）。
   実際の画面を開いて、説明する場所に赤い番号の丸と枠を重ねて撮り、help/ に JPEG で置く。
   画面が変わったら撮り直す：  node tests/help-shots.js
   （ふつうのテスト run.js では流さない。写真は help.js の説明書から読む） */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'help');
const INDEX = 'file://' + path.join(ROOT, 'index.html');
const W = 390, H = 780;

/* 番号の丸と枠を重ねる。marks: [{sel|text|rect, n, pos}]  pos: 'c' 真ん中 / 'tl' 左上 / 'tr' 右上 / 'l' 左 / 'r' 右 */
async function mark(page, marks) {
  await page.evaluate((marks) => {
    document.querySelectorAll('.hs-mark').forEach(e => e.remove());
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const find = m => {
      if (m.rect) return m.rect;
      let el = null;
      if (m.sel) el = [...document.querySelectorAll(m.sel)].find(vis);
      if (!el && m.text) {
        const scope = m.in ? [...document.querySelectorAll(m.in)].find(vis) : document;
        el = [...(scope || document).querySelectorAll('button,span,div,b,a,label,summary,td,th')]
          .filter(e => vis(e) && e.textContent.replace(/\s+/g, '').trim() === m.text.replace(/\s+/g, ''))
          .sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
      }
      if (!el) { console.log('見つからない: ' + (m.sel || m.text)); return null; }
      const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    for (const m of marks) {
      const r = find(m); if (!r) continue;
      if (!m.noBox) {
        const box = document.createElement('div'); box.className = 'hs-mark';
        Object.assign(box.style, { position: 'fixed', left: (r.x - 2) + 'px', top: (r.y - 2) + 'px', width: (r.w + 4) + 'px', height: (r.h + 4) + 'px',
          border: '3px solid #e53935', borderRadius: '8px', boxSizing: 'border-box', zIndex: 2147483646, pointerEvents: 'none' });
        document.body.appendChild(box);
      }
      const d = 26, pos = m.pos || 'tl';
      let cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (pos === 'tl') { cx = r.x + 4; cy = r.y + 4; }
      if (pos === 'tr') { cx = r.x + r.w - 4; cy = r.y + 4; }
      if (pos === 'l') { cx = r.x + 4; }
      if (pos === 'r') { cx = r.x + r.w - 4; }
      if (pos === 'after') { cx = r.x + r.w + d / 2 + 4; }
      if (pos === 'before') { cx = r.x - d / 2 - 2; }
      cx = Math.max(d / 2 + 1, Math.min(innerWidth - d / 2 - 1, cx)); cy = Math.max(d / 2 + 1, Math.min(innerHeight - d / 2 - 1, cy));
      const b = document.createElement('div'); b.className = 'hs-mark'; b.textContent = m.n;
      Object.assign(b.style, { position: 'fixed', left: (cx - d / 2) + 'px', top: (cy - d / 2) + 'px', width: d + 'px', height: d + 'px', lineHeight: (d - 4) + 'px',
        borderRadius: '50%', background: '#e53935', color: '#fff', font: 'bold 15px sans-serif', textAlign: 'center', border: '2px solid #fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.45)', boxSizing: 'border-box', zIndex: 2147483647, pointerEvents: 'none' });
      document.body.appendChild(b);
    }
  }, marks);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5, hasTouch: true });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.text().startsWith('見つからない')) console.log('  ' + m.text()); });
  const fresh = async (pre) => {
    await page.goto(INDEX);
    await page.evaluate((pre) => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); localStorage.setItem('excalc_startpage', 'last'); localStorage.setItem('excalc_tool_hints', '0'); for (const k in pre || {}) localStorage.setItem(k, pre[k]); }, pre);
    await page.reload(); await page.waitForTimeout(1300);
    await page.evaluate(() => { try { markSeenVer(); hideNotice(); } catch (_) {} });
    await page.evaluate(() => { const v = [['品名', '金額'], ['りんご', '320'], ['パン', '250'], ['牛乳', '198'], ['合計', '=SUM(B2:B4)']]; v.forEach((r, i) => r.forEach((x, j) => setCellVal(i, j, x))); recalcAll(); sel(1, 1); });
    await page.waitForTimeout(300);
  };
  const shot = async (name, marks, clip) => {
    await page.waitForTimeout(450);
    await page.evaluate(() => { try { hideNotice(); } catch (_) {} document.querySelectorAll('.toast,#toast').forEach(t => t.style.display = 'none'); });
    await mark(page, marks || []);
    await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 72, clip: clip || { x: 0, y: 0, width: W, height: H } });
    await page.evaluate(() => document.querySelectorAll('.hs-mark').forEach(e => e.remove()));
    console.log('撮った: ' + name);
  };

  // 1. 表の画面
  await fresh();
  await shot('main', [
    { sel: '#fbMenu', n: 1, pos: 'c', noBox: true },
    { sel: '#cellRef', n: 2, pos: 'tl' },
    { sel: '#formulaInput', n: 3, pos: 'tl' },
    { sel: '#statsSection', n: 4, pos: 'tl' },
    { sel: '#c1_1', n: 5, pos: 'tr' },
    { sel: '#numpadPageBar', n: 6, pos: 'l' },
    { text: 'Σ合計', in: '#numpad, .numpad', n: 7, pos: 'tr' },
    { text: '＝数式', n: 8, pos: 'tr' },
    { text: '用途', n: 9, pos: 'tr' },
    { text: '🎤声', n: 10, pos: 'tr' },
  ]);

  // 2. セルをもう一度タップ（切り取り・コピーの帯）
  await page.evaluate(() => { sel(2, 1); showEditBar(true); });
  await shot('editbar', [
    { sel: '#c2_1', n: 1, pos: 'tr' },
    { sel: '#cellMenu', n: 2, pos: 'tl' },
  ], { x: 0, y: 0, width: W, height: 470 });
  await page.evaluate(() => { try { hideEditBar(); } catch (_) {} });

  // 3. ☰ メニュー
  await fresh();
  await page.evaluate(() => openMoreMenu());
  await shot('menu', [
    { text: '💾名前を付けて保存', n: 1, pos: 'tl' },
    { text: '↶戻す', n: 2, pos: 'tl' },
    { text: '📋リスト', n: 3, pos: 'tl' },
    { text: '⚙設定', n: 4, pos: 'tl' },
    { text: '🎤声で入れる', n: 5, pos: 'tl' },
    { text: '🎯用途から始める', n: 6, pos: 'tl' },
    { text: '🧮電卓', in: '#moreMenuOverlay', n: 7, pos: 'tl' },
  ], { x: 0, y: 0, width: W, height: 640 });

  // 4. 電卓
  await fresh();
  await page.evaluate(() => { switchMode('dentaku'); });
  await page.waitForTimeout(400);
  for (const k of ['1', '2', '8', '0', '×', '3', '＝']) {
    await page.evaluate((k) => { const el = [...document.querySelectorAll('.dt-pane button, .numpad button, button')].find(e => e.offsetParent && e.textContent.trim() === k); if (el) el.click(); }, k);
    await page.waitForTimeout(80);
  }
  await shot('dentaku', [
    { sel: '#dtFoldMenu', n: 1, pos: 'c', noBox: true },
    { sel: '.dt-tape', n: 2, pos: 'tr' },
    { sel: '.dt-disp', n: 3, pos: 'tl' },
    { sel: '#dtVoice', n: 4, pos: 'tr' },
    { text: '▦表へ', n: 5, pos: 'tl' },
    { text: '桁自', n: 6, pos: 'tr' },
  ]);

  // 5. 書式・枠線
  await fresh();
  await page.evaluate(() => { sel(0, 0); numpadPager.go('fmt'); });
  await shot('format', [
    { sel: '#numpadPageBar .np-page.on', n: 1, pos: 'tl' },
  ]);

  // 6. 用途から始める
  await fresh();
  await page.evaluate(() => onModeBtnClick());
  await shot('mode', [
    { text: '通常', n: 1, pos: 'after', noBox: true },
    { text: '買物', n: 2, pos: 'after', noBox: true },
    { text: '割り勘', n: 3, pos: 'after', noBox: true },
  ]);

  // 7. 道具
  await fresh();
  await page.evaluate(() => openToolsList());
  await shot('tools', [
    { text: '📔業務手帳', n: 1, pos: 'tl' },
    { sel: '.tools-pick-btn', n: 2, pos: 'tl' },
  ], { x: 0, y: 150, width: W, height: 470 });

  // 8. 保存リスト（記録を2つ入れて撮る）
  await fresh();
  await page.evaluate(() => showSaveList());
  await shot('list', [
    { text: '🆕新規', n: 1, pos: 'tl' },
    { text: '🗂記録', n: 2, pos: 'tl' },
    { text: '🎯用途', n: 3, pos: 'tr' },
  ], { x: 0, y: 80, width: W, height: 520 });

  // 9. 設定
  await fresh();
  await page.evaluate(() => toggleSettings());
  await shot('settings', [
    { sel: '#setFindIn', n: 1, pos: 'tl' },
    { text: '📐表', n: 2, pos: 'tl' },
    { text: '🎨見た目', n: 3, pos: 'tl' },
    { text: '🧮計算', n: 4, pos: 'tl' },
  ], { x: 0, y: 30, width: W, height: 600 });

  // 10. セルの書式（セル番地を押す）
  await fresh();
  await page.evaluate(() => { sel(1, 1); openCellFmt(); });
  await shot('cellfmt', [
    { text: '小数点', n: 1, pos: 'before', noBox: true },
    { text: '装飾', n: 2, pos: 'before', noBox: true },
    { text: 'セル結合', n: 3, pos: 'before', noBox: true },
    { text: '保護', n: 4, pos: 'before', noBox: true },
  ], { x: 0, y: 80, width: W, height: 560 });

  // 11. 業務手帳
  await fresh();
  await page.evaluate(async () => {
    openTecho(); await new Promise(r => setTimeout(r, 600));
    tc.ui.confirm = false;
    tcRegisterText('今日10時から11時 営業 A社訪問'); tcRegisterText('今日13時 工場 設備点検'); tcRegisterText('今日15時 品質管理 検査の打合せ'); tcRegisterText('今日 営業 見積を送る');
    tcHideSnack && tcHideSnack(); tcRender();
    const sc = document.getElementById('tcScroll'); if (sc) sc.scrollTop = 9 * 44;
  });
  await page.waitForTimeout(2600);   // 足したときの点滅が終わるまで待つ
  await page.evaluate(() => { document.querySelectorAll('.tc-flash').forEach(e => e.classList.remove('tc-flash')); document.activeElement && document.activeElement.blur(); });
  await shot('techo', [
    { sel: '#tcGrid', n: 1, pos: 'tl' },
    { sel: '#tcMenuBtn', n: 2, pos: 'c', noBox: true },
    { sel: '.tc-daybar .tc-seg, #tcModeSeg', n: 3, pos: 'tl' },
    { sel: '#tcDayModeSeg', n: 4, pos: 'tl' },
    { sel: '#tcAddIn', n: 5, pos: 'tl' },
  ]);

  await b.close();
})();
