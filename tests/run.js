#!/usr/bin/env node
/* テストの実行係。Chromium で index.html を直接開いて確かめる。
     node tests/run.js           全部
     node tests/run.js formula   数式だけ
     node tests/run.js xlsx      Excelだけ
     node tests/run.js digit     数字の桁の読みだけ
     node tests/run.js speech    しゃべった式の読み取りだけ
   Playwright は /opt/node22 に入っているものを使う（このリポジトリには入れない）。 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const INDEX = 'file://' + path.join(ROOT, 'index.html');
const KAIKEI = 'file://' + path.join(ROOT, 'kaikei', 'index.html');
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
let chromium;
try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
catch (_) { try { ({ chromium } = require('playwright')); }
            catch (__) { console.error('Playwright が見つかりません。'); process.exit(2); } }

const only = process.argv[2] || '';
let pass = 0, fail = 0;
const fails = [];
function check(name, got, want) {
  if (String(got) === String(want)) { pass++; return true; }
  fail++; fails.push(`${name}\n      出た : ${JSON.stringify(String(got))}\n      期待 : ${JSON.stringify(String(want))}`);
  return false;
}

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  const dialogs = [];   // 出た確認窓の1行目（出したくない場面の確認に使う）
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  page.on('dialog', d => { dialogs.push(d.message().split('\n')[0]); d.accept(); });
  await page.goto(INDEX); await page.waitForTimeout(300);
  // はじめての案内（v384）は初回だけ全画面で出る。ふつうの組では
  // 「もう見た人」として開き、画面をふさがないようにする
  // （案内そのものは onboard の組で、まっさらな端末から確かめている）。
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  return { ctx, page, errs, dialogs };
}

async function runFormula(browser) {
  const { SETUP, CASES, SCENARIOS } = require('./formula.test.js');
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 数式 ──');

  const results = await page.evaluate(({ setup, cases }) => {
    setup.forEach(([r, c, v]) => setCellVal(r, c, v));
    return cases.map(([f]) => { setCellVal(20, 4, f); const d = getCellDisplay(20, 4); setCellVal(20, 4, ''); return d; });
  }, { setup: SETUP, cases: CASES });
  CASES.forEach(([f, want], i) => check('  ' + f, results[i], want));

  for (const sc of SCENARIOS) {
    const got = await page.evaluate(s => {
      s.setup.forEach(([r, c, v]) => setCellVal(r, c, v));
      recalcAll();
      const out = { cells: (s.expect || []).map(([r, c]) => getCellDisplay(r, c)) };
      if (s.stats) { sel(0, s.stats.col); out.sum = document.getElementById('sSum').textContent; }
      return out;
    }, sc);
    if (sc.expect) sc.expect.forEach(([r, c, want], i) => check(`  ${sc.name} [${r},${c}]`, got.cells[i], want));
    if (sc.stats) check(`  ${sc.name}`, got.sum, sc.stats.sum);
  }
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

async function runXlsx(browser) {
  const { IMPORT_SHEET, IMPORT_EXPECT, EXPORT_CASES } = require('./xlsx.test.js');
  const { writeXlsx, readZipEntry } = require('./zip.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'excalc-test-'));
  const xlsx = path.join(tmp, 'test.xlsx');
  writeXlsx(IMPORT_SHEET, xlsx);
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── Excel 読み書き ──');

  await page.setInputFiles('#importXLSXInput', xlsx);
  await page.waitForTimeout(1800);
  const got = await page.evaluate(cells => ({
    cells: cells.map(([r, c]) => [data[r][c], getCellDisplay(r, c)]),
    report: {
      kept: xlImportReport.kept.map(x => x.where),
      toValue: xlImportReport.toValue.map(x => x.where),
      unsupported: xlImportReport.unsupported.map(x => x.where),
      funcs: Object.keys(xlImportReport.funcs).sort(),
    },
    dialogOpen: document.getElementById('xlReportOverlay').classList.contains('open'),
  }), IMPORT_EXPECT.cells.map(x => [x[0], x[1]]));

  IMPORT_EXPECT.cells.forEach(([r, c, raw, disp], i) => {
    check(`  読込 [${r},${c}] 中身`, got.cells[i][0], raw);
    check(`  読込 [${r},${c}] 表示`, got.cells[i][1], disp);
  });
  const R = IMPORT_EXPECT.report;
  check('  読込結果 そのまま読めた', got.report.kept.join(','), R.kept.join(','));
  check('  読込結果 値に変換した', got.report.toValue.join(','), R.toValue.join(','));
  check('  読込結果 未対応', got.report.unsupported.join(','), R.unsupported.join(','));
  check('  読込結果 扱えなかった関数', got.report.funcs.join(','), [...R.funcs].sort().join(','));
  check('  結果ダイアログが開く', got.dialogOpen, true);

  // 書き出しは、実際に作られた .xlsx を受け取って中の sheet1.xml を読む
  for (const ec of EXPORT_CASES) {
    await page.evaluate(cells => {
      resetAll();
      cells.forEach(([r, c, v]) => setCellVal(r, c, v));
      recalcAll();
    }, ec.cells);
    const dl = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.evaluate(() => exportXLSX()),
    ]).then(a => a[0]).catch(() => null);
    if (!dl) { check(`  書出「${ec.name}」ファイルができる`, 'ダウンロードされず', 'できる'); continue; }
    const saved = path.join(tmp, 'out.xlsx');
    await dl.saveAs(saved);
    const xml = readZipEntry(saved, 'xl/worksheets/sheet1.xml');
    ec.contains.forEach(sub => check(`  書出「${ec.name}」に ${sub}`, String(xml).includes(sub), true));
    (ec.notContains || []).forEach(sub => check(`  書出「${ec.name}」に ${sub} が無い`, !String(xml).includes(sub), true));
  }
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function runA11y(browser) {
  const { DIALOGS } = require('./a11y.test.js');
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 読み上げ・キーボード ──');

  const noName = () => page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button,[role="button"]').forEach(b => {
      if (!b.getClientRects().length) return;
      const t = (b.textContent || '').trim();
      if (t || b.getAttribute('aria-label')) return;
      out.push((b.id ? '#' + b.id : '') + '.' + String(b.className).split(' ')[0]);
    });
    return out;
  });
  check('  名前の取れないボタン（メイン画面）', (await noName()).length, 0);
  check('  記号だけで読み方の無いボタン', await page.evaluate(() => {
    const sym = /^[\s\p{P}\p{S}]+$/u;
    return [...document.querySelectorAll('button')].filter(b => b.getClientRects().length
      && sym.test((b.textContent || '').trim()) && (b.textContent || '').trim()
      && !b.getAttribute('aria-label')).length;
  }), 0);

  const dl = await page.evaluate(() => {
    const a = [...document.querySelectorAll('.modal-overlay')];
    return { n: a.length, role: a.filter(x => x.getAttribute('role') === 'dialog').length,
      modal: a.filter(x => x.getAttribute('aria-modal') === 'true').length,
      label: a.filter(x => x.getAttribute('aria-labelledby')).length };
  });
  check('  ダイアログに role="dialog"', dl.role, dl.n);
  check('  ダイアログに aria-modal', dl.modal, dl.n);
  check('  ダイアログに見出しの結びつき', dl.label, dl.n);

  await page.evaluate(() => openHelp()); await page.waitForTimeout(400);
  check('  開いたらダイアログの中へ入る', await page.evaluate(() => {
    const ov = document.getElementById('helpOverlay');
    return !!(ov && ov.contains(document.activeElement)); }), true);
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  check('  Escで閉じる', await page.evaluate(() =>
    !document.getElementById('helpOverlay').classList.contains('open')), true);

  await page.evaluate(() => openMoreMenu()); await page.waitForTimeout(350);
  let out = 0;
  for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab');
    if (!await page.evaluate(() => document.getElementById('moreMenuOverlay').contains(document.activeElement))) out++; }
  check('  Tabがダイアログの外へ出た回数', out, 0);
  await page.evaluate(() => closeMoreMenu()); await page.waitForTimeout(300);

  let inDialogs = 0;
  for (const f of DIALOGS) {
    try { await page.evaluate(f => eval(f), f); } catch (_) { continue; }
    await page.waitForTimeout(260);
    inDialogs += (await noName()).length;
    await page.evaluate(() => document.querySelectorAll('.modal-overlay.open,.pm-overlay.open').forEach(x => x.classList.remove('open')));
    await page.waitForTimeout(120);
  }
  check('  ダイアログの中の名前なし', inDialogs, 0);

  await page.evaluate(() => sel(0, 0)); await page.waitForTimeout(250);
  const grid = await page.evaluate(() => {
    const t = document.getElementById('sheet'), c = document.getElementById('c0_0');
    const live = document.getElementById('a11yLive');
    return { table: (t && t.getAttribute('role')) || '(なし)', cell: (c && c.getAttribute('role')) || '(なし)',
      selected: (c && c.getAttribute('aria-selected')) || '(なし)', tab: c ? c.tabIndex : '(なし)',
      label: (c && c.getAttribute('aria-label')) || '(なし)', live: live ? live.textContent : '(読み上げ欄が無い)' };
  });
  check('  表が grid', grid.table, 'grid');
  check('  セルが gridcell', grid.cell, 'gridcell');
  check('  選んだセルに aria-selected', grid.selected, 'true');
  check('  選んだセルは tabIndex 0', grid.tab, 0);
  check('  セルの名前', grid.label, 'A1 空');
  check('  読み上げ欄', grid.live, 'A1 空');
  await page.evaluate(() => setCellVal(0, 0, '123')); await page.waitForTimeout(250);
  check('  値を入れたら読み上げ欄も変わる', await page.evaluate(() => {
    const live = document.getElementById('a11yLive');
    return live ? live.textContent : '(読み上げ欄が無い)'; }), 'A1 123');

  check('  トーストが読み上げに乗る', await page.evaluate(() => { toast('x');
    const t = document.getElementById('appToast');
    return t ? (t.getAttribute('role') + '/' + t.getAttribute('aria-live')) : '(トーストが無い)'; }), 'status/polite');
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

async function runMode(browser) {
  const { ROUNDTRIP, STUCK_SCENARIO, HISTORY_CLEARED, UNDO_WITHIN_MODE,
          TMPL_BACK_TO_PLAIN, TMPL_KEEPS_PLAIN, TMPL_FROM_OTHER_MODE,
          TMPL_MODE_ROUNDTRIP, TMPL_MODE_THEN_PLAIN, HISTORY_PER_MODE,
          TMPL_TO_DEFAULT_SIZE, TMPL_RESET_THEN_PLAIN, SMALL_TABLE_KEPT } = require('./mode.test.js');
  const { ctx, page, errs, dialogs } = await newPage(browser);
  console.log('\n── モードの行き来 ──');
  const st = () => page.evaluate(() => ({ ws: workspaceMode, tm: tableMode }));

  // 往復して必ず元に戻れる
  for (const m of ROUNDTRIP.modes) {
    await page.evaluate(m => switchMode(m), m); await page.waitForTimeout(420);
    const a = await st();
    check(`  ${m} へ`, a.ws + '/' + a.tm, m + '/' + m);
    await page.evaluate(b => switchMode(b), ROUNDTRIP.back); await page.waitForTimeout(420);
    const c = await st();
    check(`  ${m} → ${ROUNDTRIP.back} へ戻る`, c.ws + '/' + c.tm, ROUNDTRIP.back + '/' + ROUNDTRIP.back);
  }

  for (const sc of [STUCK_SCENARIO, HISTORY_CLEARED, UNDO_WITHIN_MODE,
                    TMPL_BACK_TO_PLAIN, TMPL_KEEPS_PLAIN, TMPL_FROM_OTHER_MODE,
                    TMPL_MODE_ROUNDTRIP, TMPL_MODE_THEN_PLAIN, HISTORY_PER_MODE,
                    TMPL_TO_DEFAULT_SIZE, TMPL_RESET_THEN_PLAIN, SMALL_TABLE_KEPT]) {
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
    await page.reload(); await page.waitForTimeout(900);
    for (const step of sc.steps) {
      if (step.do) { await page.evaluate(src => eval(src), step.do); await page.waitForTimeout(700); }
      if (step.expect) {
        const a = await st();
        check(`  ${sc.name}／${step.do.slice(0, 24)}`, a.ws + '/' + a.tm, step.expect.ws + '/' + step.expect.tm);
      }
      if (step.check) {
        const v = await page.evaluate(src => eval(src), step.check);
        if (step.is !== undefined) check(`  ${sc.name}／${step.check}`, v, step.is);
        if (step.min !== undefined) check(`  ${sc.name}／${step.check} が ${step.min} 以上`, v >= step.min, true);
      }
    }
  }
  // ひな形の表で「通常」を押したとき、確認窓を出さない
  // （モードを選ぶ流れに確認窓が割り込むと、モードが選べなくなるため）
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  dialogs.length = 0;
  await page.evaluate(() => applyTemplateObj(CALC_TEMPLATES[0], () => {}));
  await page.waitForTimeout(700);
  check('  ひな形を読み込むとき確認窓を出さない', dialogs.length, 0);
  dialogs.length = 0;
  await page.evaluate(() => switchMode('normal'));
  await page.waitForTimeout(700);
  check('  通常でひな形を消すとき確認窓を出さない', dialogs.length, 0);
  check('  そのあとまっさらな表になっている', await page.evaluate(() => data[0][0] + '/' + COLS), '/3');

  // 一覧は「モード」キーの指の真下に出る。実機では、キーを離した指の分の入力が
  // 開いたばかりの一覧に届き、真下にあった項目が押されたことになっていた。
  // 状態が読める新しいページで確かめる。
  {
    const g = await newPage(browser);
    // キーの位置は一度の評価で取る（読み込み直後にテンキーが組み直され、
    //   要素ハンドルが外れてしまうことがあるため）
    const mb = await g.page.evaluate(() => {
      const el = document.querySelector('[data-key="mode"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
    });
    if (!mb) { check('  モードキーが見つかる', 'なし', 'ある'); await g.ctx.close(); return; }
    await g.page.touchscreen.tap(mb.x + mb.width / 2, mb.y + mb.height / 2);
    await g.page.waitForTimeout(120);
    const under = await g.page.evaluate(() => {          // 指の真下の項目へ直接送る
      const it = [...document.querySelectorAll('#modeMenuBody .mode-item')].find(x => x.dataset.key !== workspaceMode);
      if (!it) return null;
      const r = it.getBoundingClientRect();
      const at = { clientX: r.left + r.width * 0.6, clientY: r.top + r.height / 2, bubbles: true,
                   cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true };
      it.dispatchEvent(new PointerEvent('pointerdown', at));
      document.dispatchEvent(new PointerEvent('pointerup', at));
      return it.dataset.key;
    });
    await g.page.waitForTimeout(700);
    check('  一覧を開いた直後の指では項目が反応しない',
          await g.page.evaluate(() => workspaceMode + '/' + document.getElementById('modeMenuOverlay').classList.contains('open')),
          'normal/true');
    if (!under) console.log('     モード項目が見つからなかった');
    await g.page.waitForTimeout(500);                     // 少し待てば選べる
    // 一覧が閉じてしまっていたら開き直す（直っていないと、上の指で閉じられている）
    if (!await g.page.evaluate(() => document.getElementById('modeMenuOverlay').classList.contains('open'))) {
      await g.page.evaluate(() => openModeMenu()); await g.page.waitForTimeout(600);
    }
    let picked = null;
    const sb = await g.page.evaluate(() => {
      const it = [...document.querySelectorAll('#modeMenuBody .mode-item')].find(x => x.dataset.key === 'shopping');
      if (!it) return null;
      it.scrollIntoView({ block: 'center' });
      const r = it.getBoundingClientRect();
      return r.width ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
    });
    if (sb) { await g.page.touchscreen.tap(sb.x + sb.width * 0.6, sb.y + sb.height / 2); picked = true; }
    await g.page.waitForTimeout(800);
    check('  少し待てばモードを選べる', picked && await g.page.evaluate(() => workspaceMode), 'shopping');
    check('  一覧のJSエラーが出ていない', g.errs.length, 0);
    if (g.errs.length) console.log('     ', g.errs);
    await g.ctx.close();
  }

  // ── 面積・容積モード（長方形と円。単位つきで出す） ──
  {
    const y = await newPage(browser);
    const cell = (r, c) => y.page.evaluate(([r, c]) => {
      const e = document.getElementById('c' + r + '_' + c); return e ? e.textContent : '?'; }, [r, c]);
    const rowOf = async r => (await Promise.all([0, 1, 2, 3, 4, 5].map(c => cell(r, c)))).join('|');
    const fill = async rows => { await y.page.evaluate(async rows => {
        for (let r = 1; r < ROWS; r++) for (let c = 0; c < 4; c++) data[r][c] = '';
        rows.forEach((v, i) => { [0, 1, 2, 3].forEach(c => { data[i + 1][c] = v[c]; }); });
        recalcMode(); buildSheet(); recalcMode(); }, rows);
      await y.page.waitForTimeout(200); };
    await y.page.evaluate(() => switchMode('youseki')); await y.page.waitForTimeout(600);
    check('  見出しに単位が入っている', await rowOf(0), '形|たて・直径m|よこm|高さm|面積㎡・容積㎥|まわりm');
    await fill([['', '3', '4', ''], ['', '3', '4', '2'],
                ['円', '2', '', ''], ['丸', '2', '', '5'], ['', '2', '', '']]);
    check('  長方形の面積は㎡', await rowOf(1), '|3|4||12 ㎡|14 m');
    check('  高さを入れると容積は㎥', await rowOf(2), '|3|4|2|24 ㎥|14 m');
    check('  円の面積は直径から', await rowOf(3), '円|2|||3.142 ㎡|6.283 m');
    check('  円柱の容積', await rowOf(4), '丸|2||5|15.708 ㎥|6.283 m');
    check('  よこが空の長方形は出さない', await rowOf(5), '|2||||');
    check('  合計も単位つきで出す', await y.page.evaluate(() =>
      ['ysArea', 'ysTotal', 'ysLiter', 'ysPeri'].map(id => document.getElementById(id).textContent).join('|')),
      '30.283|39.708|39,707.963|40.566');
    check('  セルの中身は数値のまま（Σ合計に使える）', await y.page.evaluate(() =>
      [1, 2, 3].map(r => Math.round(parseFloat(data[r][4]) * 1000) / 1000).join(',')), '12,24,3.142');
    check('  円の言い方はどれでもよい', await y.page.evaluate(() =>
      ['円', '丸', 'まる', '○', '◯', 'circle'].every(isCircleShape)
      && !['', '長方形', '四角', '2'].some(isCircleShape)), true);
    check('  答えとまわりは書き換えられない', await y.page.evaluate(() =>
      isLockedCell(1, 4) && isLockedCell(1, 5) && !isLockedCell(1, 0)), true);
    // 形の列が無かったころの表は、右へ1つずらして引っ越す
    await y.page.evaluate(() => {
      data[0][0] = '縦m'; data[0][1] = '横m'; data[0][2] = '高さm'; data[0][3] = '容積㎥';
      data[1][0] = '3'; data[1][1] = '4'; data[1][2] = '2'; data[1][3] = '24';
      for (let c = 4; c < COLS; c++) data[1][c] = '';
      normalizeStructLayout(); recalcMode(); buildSheet(); recalcMode(); });
    await y.page.waitForTimeout(300);
    check('  古い並びは右へずらして引っ越す', await rowOf(1), '|3|4|2|24 ㎥|14 m');
    check('  形の列はせまく出す', await y.page.evaluate(() => {
      const a = document.getElementById('ch0').getBoundingClientRect().width;
      const b = document.getElementById('ch1').getBoundingClientRect().width;
      return a < b; }), true);
    check('  面積・容積モードのJSエラーが出ていない', y.errs.length, 0);
    if (y.errs.length) console.log('     ', y.errs);
    await y.ctx.close();
  }

  // ↶戻るの長押しで出る一覧が、指を離した分のクリックで閉じないこと
  {
    const u = await newPage(browser);
    await u.page.evaluate(() => { setCellVal(0, 0, 'あ'); setCellVal(1, 0, 'い'); });
    await u.page.waitForTimeout(300);
    const stayed = await u.page.evaluate(() => {
      openUndoList();
      const ov = document.getElementById('undoListOverlay');
      const bb = document.getElementById('undoBtn').getBoundingClientRect();
      // 長押しの指を離した分のクリックは、↶の位置＝一覧の背景に届く
      ov.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true,
        clientX: bb.left + bb.width / 2, clientY: bb.top + bb.height / 2 }));
      return ov.classList.contains('open');
    });
    check('  一覧が出た瞬間に指を離しても閉じない', stayed, true);
    // 背景をきちんと押せば、今までどおり閉じる
    const closed = await u.page.evaluate(async () => {
      const ov = document.getElementById('undoListOverlay');
      const at = { bubbles: true, cancelable: true, clientX: 5, clientY: 5 };
      await new Promise(r => setTimeout(r, 500));           // 開いた直後の見張りが切れるまで待つ
      ov.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerId: 1 }, at)));
      ov.dispatchEvent(new MouseEvent('click', at));
      return !ov.classList.contains('open');
    });
    check('  背景を押せば一覧は閉じる', closed, true);
    check('  一覧のJSエラーが出ていない', u.errs.length, 0);
    if (u.errs.length) console.log('     ', u.errs);
    await u.ctx.close();
  }

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* セルの長押し＝メニュー（スマホのふつうの長押しと同じ）。貼り付けが一番上。 */
async function runCellMenu(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, hasTouch: true,
                                         permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  page.on('dialog', d => d.accept());
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── セルの長押しメニュー ──');
  await page.evaluate(() => setCellGesture('old'));   // 長押しのメニューは「以前の表電卓」の操作（v414 から Excel と同じ操作ではダブルタップで出す）

  // 1秒の長押しでメニューが出る（保護にはならない）
  const bx = await page.evaluate(() => {
    const b = document.getElementById('c1_1').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(bx.x, bx.y); await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up(); await page.waitForTimeout(400);
  check('  長押しでメニューが出る',
        await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show')), true);
  check('  長押しでは保護にならない', await page.evaluate(() => isLockedCell(1, 1)), false);
  check('  並びは コピー→貼り付け→消去→書式→保護',
        await page.evaluate(() => [...document.querySelectorAll('#cellMenu button')].filter(b => b.offsetParent)
          .map(b => b.textContent.trim().split(' ').pop()).join('/')),
        'コピー/貼り付け/消去/書式/保護');

  // 端末でコピーした文字を貼れる
  await page.evaluate(() => navigator.clipboard.writeText('こんにちは'));
  await page.evaluate(() => cellMenuAct('paste')); await page.waitForTimeout(700);
  check('  端末のコピー内容を貼れる', await page.evaluate(() => data[1][1]), 'こんにちは');

  // タブ・改行で区切られていれば表の形のまま広がり、戻るは1回で済む
  await page.evaluate(() => navigator.clipboard.writeText('10\t20\n30\t40'));
  await page.evaluate(() => sel(3, 0)); await page.waitForTimeout(200);
  await page.evaluate(() => cellMenuAct('paste')); await page.waitForTimeout(800);
  check('  表の形のまま広がる',
        await page.evaluate(() => [data[3][0], data[3][1], data[4][0], data[4][1]].join(',')), '10,20,30,40');
  await page.evaluate(() => undoLast()); await page.waitForTimeout(600);
  check('  ↶戻る1回でまとめて戻せる',
        await page.evaluate(() => [data[3][0], data[3][1], data[4][0], data[4][1]].join(',')), ',,,');

  // 保護はメニューから
  await page.evaluate(() => { sel(1, 1); cellMenuAct('lock'); }); await page.waitForTimeout(400);
  check('  メニューから保護にできる', await page.evaluate(() => isLockedCell(1, 1)), true);

  // 登録（ボタンの機能）に 🔒保護 がある
  check('  登録の機能に🔒保護がある',
        await page.evaluate(() => KEY_FUNCS.t_lock ? KEY_FUNCS.t_lock.g + '/' + KEY_FUNCS.t_lock.label : 'なし'),
        '表の操作/🔒保護');

  // 長押しで出たメニューは、指を離しただけでは効かない（押し直しが要る）
  await page.evaluate(() => { sel(1, 1); showCellMenu(1, 1); }); await page.waitForTimeout(400);
  const cmBtn = await page.evaluate(() => {
    const b = document.querySelector('#cellMenu button').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.evaluate(a => document.querySelector('#cellMenu button').dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, clientX: a.x, clientY: a.y })), cmBtn);
  await page.waitForTimeout(400);
  check('  指を離した分ではメニューの項目が効かない',
        await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show')), true);
  await page.mouse.move(cmBtn.x, cmBtn.y); await page.mouse.down();
  await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(400);
  check('  押し直せば効く',
        await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show')), false);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 保存データ一覧の見せ方（アイコン＝エクスプローラー風／リスト） */
async function runSaveList(browser) {
  const { ctx, page, errs, dialogs } = await newPage(browser);
  console.log('\n── 保存データ一覧の見せ方 ──');
  await page.evaluate(() => {
    const names = ['4月の売上', '材料費まとめ', '配合計算', '家計簿'];
    localStorage.setItem('excalc_saves', JSON.stringify(names.map((n, i) => ({
      id: 1000 + i, name: n, timestamp: Date.now() - i * 86400000, rows: 15, cols: 3,
      data: [['a']], tab: 0, mode: i === 0 ? 'shopping' : null, locked: i === 1
    }))));
  });
  await page.reload(); await page.waitForTimeout(900);
  await page.evaluate(() => showSaveList()); await page.waitForTimeout(500);

  check('  既定はアイコン表示', await page.evaluate(() => saveView), 'icon');
  check('  記録がファイルのように並ぶ', await page.evaluate(() => document.querySelectorAll('.save-file').length), 4);
  check('  モードのある記録はその絵',
        await page.evaluate(() => document.querySelectorAll('.sf-ico')[0].textContent.trim()), '🛒');
  check('  ロック中の記録は印が付く',
        await page.evaluate(() => document.querySelectorAll('.save-file')[1].classList.contains('locked')), true);

  // ⋯ でメニューが出る
  await page.evaluate(() => showSaveFileMenu(1000, document.querySelector('.sf-more')));
  await page.waitForTimeout(300);
  check('  ⋯でメニューが出る',
        await page.evaluate(() => document.getElementById('saveFileMenu').classList.contains('show')), true);
  // 保存リストの下に隠れない（リストは z-index 1000）
  check('  メニューはリストの上に出る', await page.evaluate(() => {
    const m = +getComputedStyle(document.getElementById('saveFileMenu')).zIndex;
    const o = +getComputedStyle(document.getElementById('saveListOverlay')).zIndex;
    return m > o; }), true);
  check('  メニューが画面からはみ出さない', await page.evaluate(() => {
    const b = document.getElementById('saveFileMenu').getBoundingClientRect();
    return b.top >= 0 && b.bottom <= window.innerHeight + 0.5 && b.left >= 0; }), true);
  check('  メニューの中身',
        await page.evaluate(() => [...document.querySelectorAll('#saveFileMenu button')]
          .map(b => b.textContent.trim().split(' ').pop()).join('/')),
        '開く/名前の変更/コピーを作る/書き出し/ロック/用途の一覧に登録/タブ1へ移す/タブ2へ移す/削除');
  check('  ロック中は名前の変更と削除ができない',
        await page.evaluate(() => { hideSaveFileMenu();
          showSaveFileMenu(1001, document.querySelector('.sf-more'));
          return [...document.querySelectorAll('#saveFileMenu button')].filter(b => b.disabled).length; }), 4);
  check('  ロック中でもコピーは作れる',
        await page.evaluate(() => [...document.querySelectorAll('#saveFileMenu button')]
          .find(b => b.textContent.includes('コピー')).disabled), false);
  await page.evaluate(() => hideSaveFileMenu());

  // コピーを作る：名前は「のコピー」、中身ごと複製、元とはつながらない
  await page.evaluate(() => { saveFileMenuAct(1000, 'dup'); }); await page.waitForTimeout(400);
  await page.evaluate(() => { duplicateSave(1000); }); await page.waitForTimeout(400);
  check('  コピーの名前が増えていく',
        await page.evaluate(() => getSaves().map(s => s.name).slice(-2).join('/')),
        '4月の売上 のコピー/4月の売上 のコピー 2');
  check('  中身ごと複製される',
        await page.evaluate(() => { const c = getSaves().find(s => s.name === '4月の売上 のコピー');
          return JSON.stringify(c.data) + '|' + c.mode; }), '[["a"]]|shopping');
  check('  コピーは元とつながっていない',
        await page.evaluate(() => { const c = getSaves().find(s => s.name === '4月の売上 のコピー');
          c.data[0][0] = 'かえた';
          return getSaves().find(s => s.id === 1000).data[0][0]; }), 'a');
  check('  コピーにロックは引き継がない',
        await page.evaluate(() => { duplicateSave(1001);
          return !!getSaves().find(s => s.name === '材料費まとめ のコピー').locked; }), false);

  // 他のタブへ移せる
  await page.evaluate(() => saveFileMenuAct(1000, 'tab', 1)); await page.waitForTimeout(400);
  check('  他のタブへ移せる', await page.evaluate(() => getSaves().find(s => s.id === 1000).tab), 1);
  check('  移した記録はこのタブから消える',
        await page.evaluate(() => [...document.querySelectorAll('.sf-name')].some(e => e.textContent === '4月の売上')), false);
  await page.evaluate(() => hideSaveFileMenu()); await page.waitForTimeout(200);

  // 長押しでも同じメニュー（指を離しても開いてしまわない）
  const tileAt = n => page.evaluate(i => {
    const b = document.querySelectorAll('.save-file')[i].getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, n);
  dialogs.length = 0;
  let tb = await tileAt(2);
  await page.mouse.move(tb.x, tb.y); await page.mouse.down();
  await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(500);
  check('  長押しでもメニューが出る',
        await page.evaluate(() => document.getElementById('saveFileMenu').classList.contains('show')), true);
  check('  長押しで指を離しても開かない', await page.evaluate(() => currentSaveId), 'null');
  check('  長押しでリストは開いたまま',
        await page.evaluate(() => document.getElementById('saveListOverlay').classList.contains('open')), true);
  // 短いタップなら開く。開くときの確認窓は出さず、↶戻る で前の表に戻せる
  await page.evaluate(() => { history.length = 0; redoHistory.length = 0;
    sel(0, 0); setCellVal(0, 0, 'ひらく前の表'); showSaveList(); });
  await page.waitForTimeout(500);
  dialogs.length = 0;
  tb = await tileAt(2);
  await page.mouse.move(tb.x, tb.y); await page.mouse.down();
  await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(800);
  check('  短いタップなら開く', await page.evaluate(() => currentSaveId !== null), true);
  check('  開くときに確認窓を出さない', dialogs.length, 0);
  check('  開いたらリストは閉じる',
        await page.evaluate(() => document.getElementById('saveListOverlay').classList.contains('open')), false);
  await page.evaluate(() => undoLast()); await page.waitForTimeout(600);
  check('  ↶戻る で前の表に戻せる', await page.evaluate(() => data[0][0]), 'ひらく前の表');
  await page.evaluate(() => { currentSaveId = null; showSaveList(); }); await page.waitForTimeout(500);

  // 長押しで出たメニューは、指を離しただけでは効かない（押し直しが要る）
  {
    const t = await tileAt(2);
    await page.mouse.move(t.x, t.y); await page.mouse.down();
    await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(400);
    const openBtn = await page.evaluate(() => {
      const b = document.querySelector('#saveFileMenu button').getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    });
    await page.evaluate(a => document.querySelector('#saveFileMenu button').dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, clientX: a.x, clientY: a.y })), openBtn);
    await page.waitForTimeout(400);
    check('  指を離した分では「開く」が効かない', await page.evaluate(() => currentSaveId), 'null');
    check('  そのときメニューは出たまま',
          await page.evaluate(() => document.getElementById('saveFileMenu').classList.contains('show')), true);
    await page.mouse.move(openBtn.x, openBtn.y); await page.mouse.down();
    await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(700);
    check('  押し直せば開く', await page.evaluate(() => currentSaveId !== null), true);
  }

  // 並べ替え（新しい順・古い順・名前順）。名前は日本語の並びで、数字は 2→10 の順。
  const names = () => page.evaluate(() => [...document.querySelectorAll('.sf-name')].map(e => e.textContent).join('/'));
  await page.evaluate(() => {
    const list = ['見積もり10', '見積もり2', 'あさひ工区', '4月の売上'];
    localStorage.setItem('excalc_saves', JSON.stringify(list.map((n, i) => ({
      id: 2000 + i, name: n, timestamp: Date.now() - i * 86400000, rows: 15, cols: 3, data: [['a']], tab: 0
    }))));
    setSaveView('icon'); renderSaveList();
  });
  await page.evaluate(() => setSaveSort('new'));  await page.waitForTimeout(300);
  check('  新しい順', await names(), '見積もり10/見積もり2/あさひ工区/4月の売上');
  await page.evaluate(() => setSaveSort('old'));  await page.waitForTimeout(300);
  check('  古い順', await names(), '4月の売上/あさひ工区/見積もり2/見積もり10');
  await page.evaluate(() => setSaveSort('name')); await page.waitForTimeout(300);
  check('  名前順（数字は2→10の順）', await names(), '4月の売上/あさひ工区/見積もり2/見積もり10');
  await page.evaluate(() => setSaveSort('namez')); await page.waitForTimeout(300);
  check('  名前の逆順', await names(), '見積もり10/見積もり2/あさひ工区/4月の売上');

  // アイコンの大きさは「小」で固定（v350で大きさの切り替えはやめた）
  const colw = () => page.evaluate(() => getComputedStyle(document.querySelector('.save-grid'))
    .getPropertyValue('--sf-col').trim());
  check('  アイコンは小さいまま', await colw(), '66px');
  check('  大きさを変えるボタンは無い', await page.evaluate(() =>
    !document.getElementById('saveSizeBar') && typeof setSaveSize === 'undefined'), true);

  // リスト表示にも戻せて、その選択は覚えている
  await page.evaluate(() => setSaveView('list')); await page.waitForTimeout(400);
  check('  リスト表示に戻せる', await page.evaluate(() => document.querySelectorAll('.save-item').length), 4);
  check('  リストでも並べ替えは効く',
        await page.evaluate(() => [...document.querySelectorAll('.save-name')].map(e => e.textContent.trim()).join('/')),
        '見積もり10/見積もり2/あさひ工区/4月の売上');
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても表示を覚えている', await page.evaluate(() => saveView), 'list');
  check('  並べ替えも覚えている', await page.evaluate(() => saveSort), 'namez');

  // 保存するときの最初の名前は Book1・Book2…（日付ではない）
  const nn = arr => page.evaluate(a => nextBookName(a), arr);
  check('  記録が無ければ Book1', await nn([]), 'Book1');
  check('  Book1 があれば Book2', await nn([{ name: 'Book1' }]), 'Book2');
  check('  Book1,2 があれば Book3', await nn([{ name: 'Book1' }, { name: 'Book2' }]), 'Book3');
  check('  空いている番号を使う', await nn([{ name: 'Book2' }]), 'Book1');
  check('  別の名前だけなら Book1', await nn([{ name: '4月の売上' }]), 'Book1');
  check('  前後に空白があっても同じ名前とみなす', await nn([{ name: ' Book1 ' }]), 'Book2');
  check('  保存画面の最初の名前', await page.evaluate(async () => {
    localStorage.removeItem('excalc_saves');
    let seen = null;
    const org = window.appPrompt;
    window.appPrompt = (m, d) => { seen = d; return Promise.resolve(null); };
    await saveAsData();
    window.appPrompt = org;
    return seen;
  }), 'Book1');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 上のバーに出すボタン（設定→🎨見た目→くわしい設定） */
async function runTopBar(browser) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 820 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  page.on('dialog', d => d.accept());
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── 上のバーに出すボタン ──');

  const shown = () => page.evaluate(() => ['tbRedo', 'tbList', 'tbSheet', 'tbSet', 'tbDefsize', 'tbReset']
    .filter(id => { const el = document.getElementById(id);
                    return el && getComputedStyle(el).display !== 'none'; }).join(','));
  check('  はじめは何も出さない', await shown(), '');
  check('  設定に選ぶところがある',
        await page.evaluate(() => document.querySelectorAll('#topBtnToggles .topbtn-toggle').length), 7);   // v399 で ⌨テンキー を足した

  await page.evaluate(() => { if (typeof toggleTopBtn !== 'function') return;
    toggleTopBtn('list'); toggleTopBtn('redo'); toggleTopBtn('reset'); });
  await page.waitForTimeout(300);
  check('  選んだものが上のバーに出る', await shown(), 'tbRedo,tbList,tbReset');
  check('  設定の印も付く',
        await page.evaluate(() => [...document.querySelectorAll('#topBtnToggles .topbtn-toggle')]
          .filter(b => b.classList.contains('on')).map(b => b.dataset.btn).sort().join(',')), 'list,redo,reset');
  check('  375pxでも横にはみ出さない', await page.evaluate(() => {
    const t = document.getElementById('mainToolbar'); return t.scrollWidth <= t.clientWidth + 1; }), true);

  const tbRedoDisabled = () => page.evaluate(() => {
    const el = document.getElementById('tbRedo'); return el ? el.disabled : '(↷が無い)'; });
  check('  ↷は戻す操作が無いうちは押せない', await tbRedoDisabled(), true);
  await page.evaluate(() => { setCellVal(0, 0, 'あ'); undoLast(); }); await page.waitForTimeout(400);
  check('  戻したあとは↷が押せる', await tbRedoDisabled(), false);

  await page.evaluate(() => { if (typeof toggleTopBtn === 'function') toggleTopBtn('list'); });
  await page.waitForTimeout(300);
  check('  もう一度押すとしまえる', await shown(), 'tbRedo,tbReset');
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても覚えている', await shown(), 'tbRedo,tbReset');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* テンキー登録の画面 */
async function runRegPick(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── テンキー登録の画面 ──');
  const delBtn = () => page.evaluate(() => { const b = document.getElementById('regPickDelBtn');
    return b ? (getComputedStyle(b).display === 'none' ? 'なし' : 'あり') : '無い'; });
  const focused = () => page.evaluate(() =>
    !!(document.activeElement && document.activeElement.id === 'regPickInput'));

  // 開いただけではキーボードを出さない（入力欄にカーソルを入れない）
  await page.evaluate(() => { userKeys = []; saveUserKeys(); registerUserKey(0); });
  await page.waitForTimeout(400);
  check('  開いても入力欄にカーソルが入らない', await focused(), false);
  check('  登録が無いときは削除を出さない', await delBtn(), 'なし');
  // 入力欄をタップすればカーソルが入る
  await page.evaluate(() => document.getElementById('regPickInput').focus());
  await page.waitForTimeout(200);
  check('  入力欄をタップすればカーソルが入る', await focused(), true);

  // 登録すると、開き直したときに削除が出る
  await page.evaluate(() => { document.getElementById('regPickInput').value = '円'; regPickTextSave(); });
  await page.waitForTimeout(300);
  check('  文字を登録できる', await page.evaluate(() => JSON.stringify(userKeys[0])), '{"type":"text","value":"円"}');
  await page.evaluate(() => registerUserKey(0)); await page.waitForTimeout(300);
  check('  登録があると削除が出る', await delBtn(), 'あり');
  check('  開き直してもカーソルは入らない', await focused(), false);
  await page.evaluate(() => regPickDelete()); await page.waitForTimeout(300);
  check('  削除で空になる', await page.evaluate(() => JSON.stringify(userKeys[0])), '{"type":"text","value":""}');
  check('  削除したら画面が閉じる',
        await page.evaluate(() => document.getElementById('regPickOverlay').classList.contains('open')), false);

  // 機能を登録した場合も消せる
  await page.evaluate(() => { registerUserKey(1); regPickAction('a_save'); }); await page.waitForTimeout(300);
  await page.evaluate(() => registerUserKey(1)); await page.waitForTimeout(300);
  check('  機能の登録でも削除が出る', await delBtn(), 'あり');
  await page.evaluate(() => regPickDelete()); await page.waitForTimeout(300);
  check('  機能の登録も消せる', await page.evaluate(() => JSON.stringify(userKeys[1])), '{"type":"text","value":""}');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 共通のしくみ（ダイアログの開け閉め・セルに入れる・一覧の保存） */
async function runShared(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 共通のしくみ ──');
  const open = async fn => { await page.evaluate(f => window[f](), fn); await page.waitForTimeout(350); };
  const isOpen = id => page.evaluate(i => isDlgOpen(i), id);
  const back = async () => { await page.goBack().catch(() => {}); await page.waitForTimeout(400); };
  const alive = () => page.evaluate(() => typeof data).catch(() => 'DEAD');

  // どのダイアログも端末の「戻る」で閉じる（v348で全部そろえた）
  for (const [fn, id] of [['openHelp', 'helpOverlay'], ['openCalcTmpl', 'calcTmplOverlay'],
                          ['showSaveList', 'saveListOverlay'], ['openCellFmt', 'cellFmtOverlay'],
                          ['openFindDlg', 'findOverlay'], ['openLookupDlg', 'lookupOverlay'],
                          ['openVeggie', 'veggieOverlay'], ['openVolume', 'volumeOverlay'],
                          ['openLinkList', 'linkListOverlay'], ['openModeVis', 'modeVisOverlay'],
                          ['insertDatePick', 'datePickOverlay'], ['openSumFuncMenu', 'sumFuncOverlay']]) {
    await open(fn);
    const wasOpen = await isOpen(id);
    await back();
    check(`  ${fn} は戻るで閉じる`, (wasOpen ? '開' : '×') + (await isOpen(id) ? '×' : '閉'), '開閉');
  }
  check('  戻るで閉じてもアプリは生きている', await alive(), 'object');

  // 重ねて開いたときは、上の1つだけ閉じる
  await open('openTansui'); await open('openTsSettings');
  check('  2つ重ねて開ける', await page.evaluate(() =>
    isDlgOpen('tansuiOverlay') && isDlgOpen('tsSettingsOverlay')), true);
  await back();
  check('  戻る1回で上だけ閉じる', await page.evaluate(() =>
    isDlgOpen('tansuiOverlay') && !isDlgOpen('tsSettingsOverlay')), true);
  await back();
  check('  戻る2回で下も閉じる', await page.evaluate(() => !isDlgOpen('tansuiOverlay')), true);
  check('  見張りが残らない', await page.evaluate(() => backGuardStack.length), 0);

  // 閉じてすぐ開き直しても、アプリごと戻らない（声の窓）
  await page.evaluate(() => { window.SpeechRecognition = function () {
    this.start = () => {}; this.stop = () => {}; this.abort = () => {}; }; });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { voiceStop(); voiceStart(); }); await page.waitForTimeout(250);
  }
  check('  閉じてすぐ開き直しても大丈夫', await alive(), 'object');
  await page.evaluate(() => voiceCancel()); await page.waitForTimeout(300);
  check('  そのあと見張りも残らない', await page.evaluate(() => backGuardStack.length), 0);

  // 道具の答えを「セルに入れる」は1つのしくみに（putToCell）
  await page.evaluate(() => { sel(2, 1); setCellVal(2, 1, ''); cellStyles = {}; buildSheet(); });
  check('  セルに入れられる', await page.evaluate(() => {
    const ok = putToCell(123, '入れました'); return ok + '/' + getCellDisplay(2, 1); }), 'true/123');
  check('  保護されたセルには入れない', await page.evaluate(() => {
    cellStyles['2,1'] = { locked: true };
    const ok = putToCell(999, '入れました'); return ok + '/' + getCellDisplay(2, 1); }), 'false/123');
  await page.evaluate(() => { cellStyles = {}; buildSheet(); });

  // 一覧の読み書きも1つに（loadList / saveList）
  check('  一覧を保存して読み直せる', await page.evaluate(() => {
    saveList('excalc_test_list', [{ a: 1 }, { a: 2 }]);
    return JSON.stringify(loadList('excalc_test_list')); }), '[{"a":1},{"a":2}]');
  check('  こわれていても空で返す', await page.evaluate(() => {
    localStorage.setItem('excalc_test_list', 'こわれた'); return loadList('excalc_test_list').length; }), 0);
  check('  無いキーは空で返す', await page.evaluate(() => loadList('excalc_nothing_here').length), 0);
  await page.evaluate(() => localStorage.removeItem('excalc_test_list'));

  // 全角→半角も1つに（toHalfAscii）
  check('  全角を半角にする', await page.evaluate(() => toHalfAscii('１２３（Ａ）　＋')), '123(A) +');
  check('  日本語はそのまま', await page.evaluate(() => toHalfAscii('かける　ルート')), 'かける ルート');

  // ここから先は履歴を使わない確かめ。上で「戻る」を何度も押しているので、
  // 開き直して素の履歴からにする
  await page.goto(INDEX); await page.waitForTimeout(900);

  // ── 消費税の計算は1か所に（v349）──
  check('  税抜→税込の倍率', await page.evaluate(() => taxMul(10) + '/' + taxMul(8)), '1.1/1.08');
  check('  税率は設定のものを使う', await page.evaluate(() => {
    const keep = taxPct; taxPct = 8; const r = taxMul(); taxPct = keep; return r; }), 1.08);
  check('  税抜1000円の消費税（切り捨て）', await page.evaluate(() => taxOfEx(1000)), 100);
  check('  税込2200円の税抜（切り捨て）', await page.evaluate(() => taxExOfInc(2200)), 2000);
  check('  端数のある税抜', await page.evaluate(() => taxOfEx(199) + '/' + taxExOfInc(199)), '19/180');
  check('  消費税モードも同じ答え', await page.evaluate(async () => {
    switchMode('zei'); await new Promise(z => setTimeout(z, 300));
    setCellVal(1, 0, '1000'); setCellVal(2, 2, '2200'); recalcMode();
    const r = getCellDisplay(1, 1) + '/' + document.getElementById('c2_0').textContent;   // 税抜は画面に出るだけ（カンマ付き）
    switchMode('normal'); await new Promise(z => setTimeout(z, 300)); return r; }), '100/2,000');
  check('  電卓も同じ倍率を使う', await page.evaluate(async () => {
    switchMode('dentaku'); await new Promise(z => setTimeout(z, 400));
    dtStyle = 'simple'; dtAllClear(); disp_val = '1000'; dtTax(1);
    const r = document.getElementById('dtMain').textContent;
    dtAllClear(); switchMode('normal'); await new Promise(z => setTimeout(z, 400)); return r; }), '1100');

  // ── 面積とまわりの長さも1か所に（v349）──
  check('  長方形の面積', await page.evaluate(() => shapeArea(false, 3, 4)), 12);
  check('  長方形のまわり', await page.evaluate(() => shapePeri(false, 3, 4)), 14);
  check('  円の面積（直径2）', await page.evaluate(() => Math.round(shapeArea(true, 2) * 1000) / 1000), 3.142);
  check('  円のまわり（直径2）', await page.evaluate(() => Math.round(shapePeri(true, 2) * 1000) / 1000), 6.283);
  check('  📷容積の道具も同じ計算', await page.evaluate(() => {
    const box = VOL_SHAPES.find(x => x.id === 'box').calc({ w: 2, d: 3, h: 4 });
    const cyl = VOL_SHAPES.find(x => x.id === 'cyl').calc({ dia: 2, h: 5 });
    const cone = VOL_SHAPES.find(x => x.id === 'cone').calc({ dia: 2, h: 3 });
    return box + '/' + Math.round(cyl * 1000) / 1000 + '/' + Math.round(cone * 1000) / 1000;
  }), '24/15.708/3.142');

  // ── カレンダーのマス目も1か所に（v349）──
  check('  日付を選ぶカレンダーは押せる', await page.evaluate(() => {
    sel(0, 0); insertDatePick();
    const g = document.getElementById('datePickGrid');
    return (g.querySelector('[onclick]') ? '押せる' : '×')
      + (g.querySelector('.today') ? '/今日' : '/×')
      + (g.querySelector('.sel') ? '/選択' : '/×'); }), '押せる/今日/選択');
  check('  押すとセルに日付が入る', await page.evaluate(() => {
    datePickChoose(2026, 3, 15); return getCellDisplay(0, 0); }), '2026/3/15');
  await page.waitForTimeout(250);   // 閉じたあとの履歴の始末を待つ
  // 育成計画のカレンダーは v362 から押せる（その日の写真をつける・大きく見る）
  check('  育成計画のカレンダーも同じ作り', await page.evaluate(async () => {
    openVeggie(); await new Promise(z => setTimeout(z, 250));
    const i = vegAll().findIndex(v => v.n === 'トマト'); vegPick(i);
    document.getElementById('vegY').value = 2026; document.getElementById('vegM').value = 3;
    document.getElementById('vegD').value = 1; vegDateChange();
    const g = document.getElementById('vegGrid');
    const r = (/vegCalTap/.test(g.innerHTML) ? '押せる' : '押せない') + '/' + g.querySelectorAll('.veg-on').length;
    closeVeggie(); return r; }), '押せる/11');
  await page.waitForTimeout(250);
  check('  曜日の見出しも同じもの', await page.evaluate(() =>
    wdayHeadHtml() === document.getElementById('datePickWdays').innerHTML), true);
  await page.evaluate(() => { setCellVal(0, 0, ''); cellStyles = {}; buildSheet(); });
  await page.waitForTimeout(200);

  // ── 割合の計算も1か所に（v350）──
  check('  1割は10％', await page.evaluate(() => wariToPct(1) + '/' + pctToWari(10)), '10/1');
  check('  1000の20％', await page.evaluate(() => pctOf(1000, 20)), 200);
  check('  20％足す・引く', await page.evaluate(() => pctAdd(1000, 20) + '/' + pctSub(1000, 20)), '1200/800');
  check('  割合モードも同じ答え', await page.evaluate(async () => {
    switchMode('wariai'); await new Promise(z => setTimeout(z, 300));
    setCellVal(1, 0, '1000'); setCellVal(1, 1, '2'); recalcMode();
    const r = [2, 3, 4, 5].map(c => document.getElementById('c1_' + c).textContent).join('/');
    switchMode('normal'); await new Promise(z => setTimeout(z, 300)); return r; }), '20/200/1,200/800');

  // ── 数と日付の見せ方も1か所に（v350）──
  check('  3桁ごとのカンマ', await page.evaluate(() =>
    withCommas('1234567') + '/' + withCommas('1234.5678') + '/' + withCommas('12')), '1,234,567/1,234.5678/12');
  check('  単位水量の桁区切りも同じもの', await page.evaluate(() => tsFmt(1234.5, 1)), '1,234.5');
  check('  日付の書き方はセルと同じもの', await page.evaluate(() => {
    const s = dateToSerial(2026, 3, 1); return vegDateText(s) + '/' + formatDate(s, 'ymd'); }), '2026/3/1/2026/3/1');

  // ── 表の大きさを変えるところも1か所に（v350）──
  check('  大きさを変えると表示も保存も追いつく', await page.evaluate(() => {
    setSheetSize(8, 4);
    return ROWS + 'x' + COLS + '/' + document.getElementById('rowCount').textContent
      + 'x' + document.getElementById('colCount').textContent
      + '/' + localStorage.getItem('excalc_rows') + 'x' + localStorage.getItem('excalc_cols'); }), '8x4/8x4/8x4');
  check('  行や列が0や大きすぎるときは直す', await page.evaluate(() => {
    setSheetSize(0, 9999); const r = ROWS + 'x' + COLS; setSheetSize(15, 3); return r; }),
    '1x' + 50);   // MAXCOLS まででとまる
  check('  ▦既定も同じしくみを使う', await page.evaluate(() => {
    setSheetSize(5, 2); applyDefaultSize(); return ROWS + 'x' + COLS; }), '15x3');

  // ── 指の誤作動よけも1か所に（v350）──
  check('  開いた直後は反応しない', await page.evaluate(() => {
    openMoreMenu(); guardAfterOpen('moreMenuOverlay'); return dlgJustOpened('moreMenuOverlay'); }), true);
  await page.waitForTimeout(500);
  check('  少し待てば反応する', await page.evaluate(() => dlgJustOpened('moreMenuOverlay')), false);
  await page.evaluate(() => closeMoreMenu()); await page.waitForTimeout(300);
  check('  モード一覧も同じものさしを使う', await page.evaluate(async () => {
    openModeMenu(); await new Promise(z => setTimeout(z, 50));
    const a = mmGuardActive(); closeModeMenu(); return a; }), true);
  await page.waitForTimeout(300);
  // 背景タップで閉じる（押し始めも背景のときだけ）
  await page.evaluate(() => { pushSnapshot('ため'); setCellVal(0, 0, 'あ'); openUndoList(); });
  await page.waitForTimeout(600);
  const bg = await page.evaluate(() => {
    const r = document.getElementById('undoListOverlay').getBoundingClientRect();
    return { x: r.left + 8, y: r.top + 8 }; });
  await page.mouse.move(bg.x, bg.y); await page.mouse.down();
  await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(400);
  check('  背景を押して離すと閉じる', await page.evaluate(() => isDlgOpen('undoListOverlay')), false);
  await page.evaluate(() => { undoLast(); setCellVal(0, 0, ''); }); await page.waitForTimeout(200);

  // ── 声の入れ方も1か所に（v350）──
  check('  声の下ごしらえは式にする', await page.evaluate(() => {
    setSpeechLayout('one'); const p = speechPrepare('251かける68', 0, 0);
    return p.v + '/' + p.f + '/' + p.answerAt; }), '=251*68/=251*68/null');
  check('  式でなければそのまま', await page.evaluate(() => {
    const p = speechPrepare('こんにちは', 0, 0); return p.v + '/' + p.f; }), 'こんにちは/null');
  check('  左に式・右に答えも同じところで決める', await page.evaluate(() => {
    setSpeechLayout('split'); cellStyles = {};
    for (let c = 0; c < COLS; c++) setCellVal(3, c, '');
    const p = speechPrepare('12ひく5', 3, 0);
    const r = p.v + '/' + (p.answerAt ? p.answerAt.join(',') : '×');
    setSpeechLayout('one'); return r; }), '12−5/3,1');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 1ページの書き出し（育成計画・単位水量試験のPDFと画像） */
async function runReport(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 1ページの書き出し ──');
  // 画像は保存名をたずねるので、ここでは組み立てとPNG化だけを確かめる
  const toPng = async build => page.evaluate(async src => {
    const built = opBuild(eval(src));
    const box = built.box; const k = built.k;
    box.style.zoom = '';
    const w = Math.ceil(parseFloat(box.style.width)), h = Math.ceil(box.getBoundingClientRect().height);
    const blob = await opNodeToPng(box, w, h, 2);
    const txt = box.innerText.replace(/\s+/g, ' ');   // 画面の外に出しているうちに読む（隠すと行の区切りが消える）
    built.meas.remove();
    return { k, w, h, ok: !!blob, size: blob ? blob.size : 0,
             type: blob ? blob.type : '', txt };
  }, build);

  // ── 育成計画 ──
  await page.evaluate(() => { openVeggie();
    const i = vegAll().findIndex(v => v.n === 'トマト'); vegPick(i);
    document.getElementById('vegY').value = 2026;
    document.getElementById('vegM').value = 3;
    document.getElementById('vegD').value = 1; vegDateChange(); });
  await page.waitForTimeout(300);
  let r = await toPng('vegPdfHtml()');
  check('  育成計画が画像になる', r.ok && r.type === 'image/png', true);
  check('  画像は中身のある大きさ', r.w > 700 && r.h > 700 && r.size > 20000, true);
  check('  画像はPDFと同じ幅で作る', r.w, Math.round(718 / r.k));
  check('  画像にもぜんぶ入っている', /予定表 .*🧪 肥料と配合.*⚠ 育てるときの注意 .*🦠 出やすい病気・害虫と農薬 .*必ずラベルで確かめてください/
        .test(r.txt), true);
  check('  画像で保存・共有のボタンがある', await page.evaluate(() =>
    ['vegPdfBtn', 'vegImgBtn', 'vegShareBtn'].map(id =>
      (document.getElementById(id) || {}).textContent || '×').join('/')),
    '🖨 ぜんぶを1ページのPDFに/🖼 画像で保存/📤 画像を共有');
  await page.evaluate(() => closeVeggie()); await page.waitForTimeout(300);

  // ── 単位水量試験 ──
  await page.evaluate(() => { openTansui();
    const v = { C: 320, W1: 175, S: 800, G: 950, P: 0, A1: 4.5, m2: 11500, A2: 4.8, V: 7000, m1: 4000 };
    Object.keys(v).forEach(k => { tsxVals[k] = String(v[k]); });
    tsxRenderInputs(); tsxCalc(); });
  await page.waitForTimeout(300);
  r = await toPng('tsxReportHtml()');
  check('  試験の報告書が画像になる', r.ok && r.type === 'image/png', true);
  check('  A4の1ページに収まる', r.h * r.k <= 1046, true);
  check('  見出しと式', /💧 単位水量試験 報告書 土研法エアメータ法 W＝W1＋0.7×\(γ1−γ2\)/.test(r.txt), true);
  check('  推定単位水量と差と判定を大きく出す',
        /推定単位水量 W ＝ [\d,.]+ kg\/m³ ／ 配合W1との差 [+−±][\d,.]+ kg\/m³ ／ 判定 /.test(r.txt), true);
  check('  配合・試験値・判定のめやす・途中経過が入る',
        /配合 .*試験値 .*判定のめやす .*計算の途中経過 /.test(r.txt), true);
  check('  途中経過は12こ', await page.evaluate(() => TS_CALC.length), 12);
  check('  入れた値がそのまま出る', /セメント C 320 kg\/m³/.test(r.txt), true);
  check('  結果が出ていないときは、そのことを書く', await page.evaluate(async () => {
    const keep = tsxVals.m2; tsxVals.m2 = ''; tsxCalc();
    const built = opBuild(tsxReportHtml());
    const t = built.box.innerText.replace(/\s+/g, ' ');
    built.meas.remove(); tsxVals.m2 = keep; tsxCalc();
    return /配合と試験の値が足りないため、結果は出ていません/.test(t); }), true);
  await page.evaluate(() => closeTansui()); await page.waitForTimeout(300);
  await page.evaluate(() => { const pa = document.getElementById('printArea'); if (pa) pa.innerHTML = ''; });

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 数字キーのフリックで記号を入れる／記号ページの表示・非表示 */
async function runFlickSym(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 数字キーのフリック記号 ──');
  const box = k => page.evaluate(x => {
    const b = document.querySelector('#numpadPage1 [data-key="' + x + '"]');
    const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, k);
  const shown = () => page.evaluate(() =>
    document.getElementById('formulaInput').value || String(disp_val || ''));
  const reset = async () => { await page.evaluate(() => { ac(); sel(0, 0); setCellVal(0, 0, ''); });
    await page.waitForTimeout(150); };
  /* hold ミリ秒押してから (dx,dy) だけ動かして離す */
  const press = async (k, dx = 0, dy = 0, hold = 320) => {
    const c = await box(k);
    await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.waitForTimeout(hold);
    if (dx || dy) { await page.mouse.move(c.x + dx, c.y + dy); await page.waitForTimeout(90); }
    await page.mouse.up(); await page.waitForTimeout(250);
  };

  check('  10個の数字キーぶんある', await page.evaluate(() =>
    Object.keys(npFlick).length + '/' + Object.values(npFlick).every(a => a.length === 4)), '10/true');
  check('  1のまわりはカッコ', await page.evaluate(() => npFlick.n1.join('|')), '|(|)|[');
  check('  2のまわりは大小', await page.evaluate(() => npFlick.n2.join('|')), '<|<=|>|>=');
  // 左はしの列（7・4・1・0）は左へフリックしにくいので、上・右・下だけ（v355）
  check('  左はしの列に「左」は無い', await page.evaluate(() =>
    NP_FLICK_LEFTCOL.every(k => npFlick[k][0] === '')), true);
  check('  まん中と右の列には「左」がある', await page.evaluate(() =>
    ['n2','n3','n5','n6','n8','n9'].every(k => npFlick[k][0] !== '')), true);

  // ふつうのタップは今までどおり数字
  await reset(); await press('n1', 0, 0, 60);
  check('  タップは数字のまま', await shown(), '1');
  // 少しだけ長押しすると候補が出る
  await reset();
  let c = await box('n1');
  await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.waitForTimeout(320);
  check('  少し長押しで候補が出る', await page.evaluate(() => {
    const e = document.getElementById('npFlickPop');
    return e && e.classList.contains('open') ? [...e.children].map(x => x.textContent).join('/') : 'なし';
  }), '(//1/)/[');   // 上/左/まん中/右/下（左は空）
  check('  画面からはみ出さない', await page.evaluate(() => {
    const r = document.getElementById('npFlickPop').getBoundingClientRect();
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }), true);
  await page.mouse.move(c.x, c.y - 45); await page.waitForTimeout(90);
  check('  動かした向きが選ばれる', await page.evaluate(() => npFlickDir), 'up');
  await page.mouse.up(); await page.waitForTimeout(250);
  check('  上フリックで (', await shown(), '(');
  check('  離すと候補は消える', await page.evaluate(() =>
    document.getElementById('npFlickPop').classList.contains('open')), false);

  await reset(); await press('n1', 45, 0);  check('  右フリックで )', await shown(), ')');
  await reset(); await press('n1', -45, 0); check('  空いている左は数字のまま', await shown(), '1');
  await reset(); await press('n2', 0, -45); check('  上フリックで <=', await shown(), '<=');
  await reset(); await press('n2', 0, 45);  check('  下フリックで >=', await shown(), '>=');
  await reset(); await press('n4', 0, -45); check('  4の上は ,', await shown(), ',');
  await reset(); await press('n7', 0, -45); check('  7の上は 「', await shown(), '「');
  await reset(); await press('n9', 0, -45); check('  9の上は ℃', await shown(), '℃');
  await reset(); await press('n7', 0, 0);   check('  まん中で離すと数字', await shown(), '7');

  // 記号は「記号だけ」入る。= は付けない（v358）
  await reset(); await page.evaluate(() => fkey('('));
  check('  記号は = を付けずに入る', await shown(), '(');
  check('  記号だけなら数式モードにしない', await page.evaluate(() => formulaEditMode), false);
  await reset(); await page.evaluate(() => { fkey('('); fkey(')'); });
  check('  記号は続けて入る', await shown(), '()');
  await reset(); await page.evaluate(() => { num('3'); fkey(':'); num('0'); num('0'); });
  check('  数字のあとにも記号だけ足せる', await shown(), '3:00');
  await reset(); await page.evaluate(() => fkey('SUM('));
  check('  関数は今までどおり = で始まる', await shown(), '=SUM(');
  await reset(); await page.evaluate(() => fkey('='));
  check('  = キーは数式を始める', await shown() + '/' + await page.evaluate(() => formulaEditMode), '=/true');
  await reset(); await page.evaluate(() => { fkey('='); fkey('('); });
  check('  数式の途中では今までどおり', await shown(), '=(');

  // 数字キーの長押しでボタンの機能は割り当てない（v353でやめた）
  await reset();
  c = await box('n3');
  await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.waitForTimeout(750);
  check('  数字キーの長押しで割り当ては開かない', await page.evaluate(() =>
    isDlgOpen('keyAssignOverlay')), false);
  await page.mouse.up(); await page.waitForTimeout(250);
  // 数字以外のキーは今までどおり長押しで割り当て
  const op = await page.evaluate(() => {
    const b = document.querySelector('#numpadPage1 [data-key="mul"]') ||
              document.querySelector('#numpadPage1 [data-key="plus"]');
    const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(op.x, op.y); await page.mouse.down(); await page.waitForTimeout(750);
  await page.mouse.up(); await page.waitForTimeout(300);
  check('  数字以外は長押しで割り当てが開く', await page.evaluate(() =>
    isDlgOpen('keyAssignOverlay')), true);
  await page.evaluate(() => closeKeyAssign()); await page.waitForTimeout(300);

  // 早くなぞればページのフリックは今までどおり
  await reset();
  c = await box('n5');
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(c.x - 120 * i / 6, c.y); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(700);
  check('  早いフリックはページ移動のまま', await page.evaluate(() => String(numpadPager.current())), 'func');
  await page.evaluate(() => numpadPager.go(null)); await page.waitForTimeout(500);

  // ── 記号ページの表示・非表示 ──
  const bar = () => page.evaluate(() =>
    [...document.querySelectorAll('#numpadPageBar .np-page')].map(b => b.textContent.trim()).join('|'));
  check('  はじめは記号ページを出す', await bar(), '書式・枠線|数字|記号|電卓|▲ マイキー');
  await page.evaluate(() => toggleFuncPage()); await page.waitForTimeout(300);
  check('  隠すと並びから消える', await bar(), '書式・枠線|数字|電卓|▲ マイキー');
  const vp = await page.evaluate(() => {
    const r = document.getElementById('numpadViewport').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(vp.x, vp.y); await page.mouse.wheel(0, 120); await page.waitForTimeout(600);
  check('  数字の次は電卓になる', await page.evaluate(() => String(numpadPager.current())), 'sci');
  await page.mouse.wheel(0, -120); await page.waitForTimeout(600);
  check('  戻ると数字へ', await page.evaluate(() => String(numpadPager.current())), 'null');
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても隠れたまま', await page.evaluate(() => showFuncPage), false);
  await page.evaluate(() => toggleFuncPage()); await page.waitForTimeout(300);
  check('  戻すと並びに出る', await bar(), '書式・枠線|数字|記号|電卓|▲ マイキー');
  await page.mouse.move(vp.x, vp.y); await page.mouse.wheel(0, 120); await page.waitForTimeout(600);
  check('  数字の次は記号に戻る', await page.evaluate(() => String(numpadPager.current())), 'func');
  await page.evaluate(() => numpadPager.go(null)); await page.waitForTimeout(400);

  // ── 記号の割り当てを設定で変えられる（v355） ──
  await page.evaluate(() => openFlickSym()); await page.waitForTimeout(400);
  check('  設定の画面が開く', await page.evaluate(() => isDlgOpen('flickSymOverlay')), true);
  check('  10行ならぶ', await page.evaluate(() =>
    document.querySelectorAll('#flickSymBody .fs-row').length), 10);
  check('  並びはテンキーと同じ', await page.evaluate(() =>
    [...document.querySelectorAll('#flickSymBody .fs-num')].map(e => e.textContent).join('')), '7894561230');
  check('  左はしの列の「左」は使えない', await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#flickSymBody .fs-row')];
    const left = k => rows.find(r => r.querySelector('.fs-num').textContent === k)
      .querySelectorAll('.fs-in')[0].disabled;
    return ['7','4','1','0'].every(left) && !['8','9','5'].some(left); }), true);
  await page.evaluate(() => setNpFlick('n2', 1, '≦')); await page.waitForTimeout(150);
  check('  変えると覚える', await page.evaluate(() =>
    npFlick.n2[1] + '/' + JSON.parse(localStorage.getItem('excalc_flicksym')).n2[1]), '≦/≦');
  await page.evaluate(() => closeFlickSym()); await page.waitForTimeout(300);
  await reset(); await press('n2', 0, -45);
  check('  変えた記号が入る', await shown(), '≦');
  check('  左はしの列は変えられない', await page.evaluate(() => {
    setNpFlick('n1', 0, 'X'); return npFlick.n1[0]; }), '');
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても覚えている', await page.evaluate(() => npFlick.n2[1]), '≦');
  await page.evaluate(() => { openFlickSym(); resetNpFlick(); }); await page.waitForTimeout(400);
  check('  元にもどせる', await page.evaluate(() => npFlick.n2[1]), '<=');
  check('  もどすと保存も消える', await page.evaluate(() =>
    localStorage.getItem('excalc_flicksym')), 'null');
  // ── キーまるごとの入れかえ（v356） ──
  await page.evaluate(() => openFlickSym()); await page.waitForTimeout(350);
  check('  入れかえのボタンが各行にある', await page.evaluate(() =>
    document.querySelectorAll('#flickSymBody .fs-swap').length), 10);
  const before = await page.evaluate(() => npFlick.n2.join('|') + ' / ' + npFlick.n3.join('|'));
  await page.evaluate(() => npFlickSwap('n2')); await page.waitForTimeout(200);
  check('  1つめを選ぶと印が付く', await page.evaluate(() =>
    npFlickSwapFrom + '/' + document.querySelectorAll('#flickSymBody .fs-row.fs-picked').length), 'n2/1');
  await page.evaluate(() => npFlickSwap('n3')); await page.waitForTimeout(200);
  check('  2つめで入れかわる', await page.evaluate(() => npFlick.n2.join('|') + ' / ' + npFlick.n3.join('|')),
        before.split(' / ').reverse().join(' / '));
  check('  印は外れる', await page.evaluate(() => String(npFlickSwapFrom)), 'null');
  check('  入れかえも覚える', await page.evaluate(() =>
    JSON.parse(localStorage.getItem('excalc_flicksym')).n2.join('|')), '=|<>|:|;');
  // 同じキーをもう一度押すとやめる
  await page.evaluate(() => { npFlickSwap('n5'); npFlickSwap('n5'); }); await page.waitForTimeout(200);
  check('  同じキーでやめられる', await page.evaluate(() => String(npFlickSwapFrom)), 'null');
  // 左はしの列と入れかえると「左」は外れる
  await page.evaluate(() => { npFlickSwap('n9'); npFlickSwap('n1'); }); await page.waitForTimeout(250);
  check('  左はしの列に移ると「左」は外れる', await page.evaluate(() => npFlick.n1[0]), '');
  check('  中身は入れかわっている', await page.evaluate(() => npFlick.n1.slice(1).join('|')), '℃|％|㎡');
  check('  相手には元の中身が入る', await page.evaluate(() => npFlick.n9.slice(1).join('|')), '(|)|[');
  await page.evaluate(() => { resetNpFlick(); closeFlickSym(); }); await page.waitForTimeout(300);
  check('  元にもどすと入れかえも消える', await page.evaluate(() => npFlick.n1.join('|')), '|(|)|[');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* テンキーの上に出す道具（設定で選んでページ名の並びに足す） */
async function runNpTools(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── テンキーの上に出す道具 ──');
  const bar = () => page.evaluate(() =>
    [...document.querySelectorAll('#numpadPageBar .np-page')].map(b => b.textContent.trim()).join('|'));

  check('  はじめは道具のタブを出さない', await bar(), '書式・枠線|数字|記号|電卓|▲ マイキー');
  check('  設定に選べる道具が並ぶ', await page.evaluate(() =>
    document.querySelectorAll('#npToolList .nptool-row').length), 12);   // v422 で 🎙声の計算帳 を足した
  check('  中身は全画面で開く道具', await page.evaluate(() =>
    NP_TOOLS.map(t => t.id).join(',')),
    'tansui,kantab,veggie,volume,photomemo,linklist,touban,memo,calctmpl,fintmpl,kaikei,koe');

  // 会計アプリは、メモと同じく別のタブで開く別アプリ（全画面・フリックの対象外）
  check('  会計アプリはタブのタイトルつきで並ぶ', await page.evaluate(() =>
    (NP_TOOLS.find(t => t.id === 'kaikei') || {}).label), '🧾会計アプリ');
  check('  会計アプリは全画面の画面を持たない', await page.evaluate(() =>
    !(NP_TOOLS.find(t => t.id === 'kaikei') || {}).ov), true);
  check('  はじめに開くページには出さない', await page.evaluate(() =>
    startPageOptions().some(o => o[0] === 'kaikei')), false);
  check('  ▲登録の一覧にある', await page.evaluate(() =>
    !!(KEY_FUNCS.a_kaikei && KEY_FUNCS.a_kaikei.label === '🧾会計アプリ')), true);
  check('  登録したらその場で開く（別のアプリなので）', await page.evaluate(() =>
    REG_GESTURE_ACTIONS.has('a_kaikei')), true);
  check('  開く先は kaikei/ ', await page.evaluate(() => {
    let got = ''; const real = window.openSameWindow;
    window.openSameWindow = u => { got = u; };   // v402 から同じウィンドウで開く
    try { openKaikeiApp(); } finally { window.openSameWindow = real; }
    return /\/kaikei\/(index\.html)?#from=hyo$/.test(got);   // 表電卓から来たしるし付き（v402）
  }), true);

  // チェックすると並びに足される
  await page.evaluate(() => { npToolToggle('tansui'); npToolToggle('veggie'); }); await page.waitForTimeout(250);
  check('  チェックした道具が電卓の右に並ぶ', await bar(), '書式・枠線|数字|記号|電卓|💧単位水量|🌱野菜|▲ マイキー');
  check('  会計アプリもタブに足せる', await page.evaluate(async () => {
    npToolToggle('kaikei'); await new Promise(r => setTimeout(r, 200));
    const on = [...document.querySelectorAll('#numpadPageBar .np-page')].some(b => /会計アプリ/.test(b.textContent));
    npToolToggle('kaikei'); await new Promise(r => setTimeout(r, 200));
    return on;
  }), true);
  check('  もう一度押すと外れる', await page.evaluate(() => {
    npToolToggle('tansui'); return npTools.join(','); }), 'veggie');
  await page.evaluate(() => { npToolToggle('tansui'); npToolToggle('kantab'); }); await page.waitForTimeout(250);
  check('  足した順に並ぶ', await page.evaluate(() => npTools.join(',')), 'veggie,tansui,kantab');

  // 並び順を変えられる
  await page.evaluate(() => npToolMove('kantab', -1)); await page.waitForTimeout(250);
  check('  ↑で上げられる', await page.evaluate(() => npTools.join(',')), 'veggie,kantab,tansui');
  await page.evaluate(() => npToolMove('veggie', 1)); await page.waitForTimeout(250);
  check('  ↓で下げられる', await page.evaluate(() => npTools.join(',')), 'kantab,veggie,tansui');
  check('  並びはタブにも出る', await bar(), '書式・枠線|数字|記号|電卓|🧪カンタブ|🌱野菜|💧単位水量|▲ マイキー');
  check('  端では動かない', await page.evaluate(() => {
    npToolMove('kantab', -1); npToolMove('tansui', 1); return npTools.join(','); }), 'kantab,veggie,tansui');

  // タブをタップすると道具が開く（ページは動かない）
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('#numpadPageBar .np-page')].find(b => /野菜/.test(b.textContent));
    t.click(); }); await page.waitForTimeout(400);
  check('  タブで道具が開く', await page.evaluate(() => isDlgOpen('veggieOverlay')), true);
  check('  ページは動かない', await page.evaluate(() => String(numpadPager.current())), 'null');
  await page.evaluate(() => closeVeggie()); await page.waitForTimeout(350);

  // 電卓ページからさらに左へフリックすると、いちばん上の道具が開く
  await page.evaluate(() => numpadPager.go('sci')); await page.waitForTimeout(500);
  await page.evaluate(() => npToolFlick()); await page.waitForTimeout(400);
  check('  電卓の先は並びの先頭の道具', await page.evaluate(() =>
    isDlgOpen('kantabOverlay') + '/' + isDlgOpen('veggieOverlay')), 'true/false');
  await page.evaluate(() => closeKantab()); await page.waitForTimeout(350);
  await page.evaluate(() => numpadPager.go(null)); await page.waitForTimeout(400);
  check('  1つも選んでいなければ何も開かない', await page.evaluate(() => {
    const keep = npTools.slice(); npTools = [];
    const r = npToolFlick(); npTools = keep; return r; }), false);

  // 開き直しても覚えている
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても覚えている', await page.evaluate(() => npTools.join(',')), 'kantab,veggie,tansui');
  check('  タブも出たまま', await bar(), '書式・枠線|数字|記号|電卓|🧪カンタブ|🌱野菜|💧単位水量|▲ マイキー');
  check('  横に流して見られる', await page.evaluate(() =>
    getComputedStyle(document.getElementById('numpadPageBar')).overflowX), 'auto');
  check('  本体は横にずれない', await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth), true);

  // ── 指（タッチ）でも横フリックで行き来できる（v356で直した） ──
  await page.evaluate(() => { npTools = ['tansui', 'veggie']; saveNpTools();
    applyNpToolFull(); renderNumpadPageBar(); }); await page.waitForTimeout(250);
  check('  全画面は縦だけブラウザに任せる', await page.evaluate(() => {
    const m = document.getElementById('tansuiOverlay').querySelector('.modal');
    return getComputedStyle(m).touchAction; }), 'pan-y');
  // スクロールする箱の中では、その外の決まりが効かないので、中身にも付ける（v357）
  check('  中身にも同じ決まりが付く', await page.evaluate(() => {
    openVeggie();
    const el = document.querySelector('#veggieOverlay .veg-line') ||
               document.querySelector('#veggieOverlay .modal-body > *');
    const r = [];
    for (let e = el; e && !e.classList.contains('modal-overlay'); e = e.parentElement)
      r.push(getComputedStyle(e).touchAction);
    closeVeggie();
    return r.every(x => x === 'pan-y'); }), true);
  await page.waitForTimeout(250);   // 閉じたあとの「戻る」が済むのを待つ
  check('  ボタンの上からでもフリックできる（見送らない）', await page.evaluate(() => {
    openVeggie();
    const btn = document.querySelector('#vegChips .veg-chip');
    const ok = getComputedStyle(btn).touchAction === 'pan-y';
    closeVeggie(); return ok; }), true);
  await page.waitForTimeout(250);
  check('  写真などの中身はそのまま任せる', await page.evaluate(() => {
    const m = document.getElementById('volumeOverlay').querySelector('.modal');
    m.classList.add('modal-full');
    const c = m.querySelector('canvas');
    const r = c ? getComputedStyle(c).touchAction : 'none';
    m.classList.remove('modal-full'); return r; }), 'none');

  // ── 登録した道具は全画面で開き、横フリックで行き来できる（v354） ──
  await page.evaluate(() => { npTools = ['tansui', 'veggie', 'kantab']; saveNpTools();
    applyNpToolFull(); renderNumpadPageBar(); }); await page.waitForTimeout(250);
  const full = id => page.evaluate(x => {
    const m = document.getElementById(x).querySelector('.modal');
    return m.classList.contains('modal-full'); }, id);
  const openedTool = () => page.evaluate(() =>
    ['tansuiOverlay', 'veggieOverlay', 'kantabOverlay'].filter(isDlgOpen).join(',') || 'なし');
  check('  登録した道具は全画面になる', await page.evaluate(() =>
    ['tansuiOverlay', 'veggieOverlay', 'kantabOverlay', 'linkListOverlay']
      .map(i => document.getElementById(i).querySelector('.modal').classList.contains('modal-full')).join('/')),
    'true/true/true/false');

  /* 開いている道具の上を、はっきり横になぞる */
  const toolSwipe = async dx => {
    const c = await page.evaluate(() => {
      const ov = document.querySelector('.modal-overlay.open');
      const h = ov.querySelector('.modal-header'); const r = h.getBoundingClientRect();
      return { x: r.left + r.width * 0.4, y: r.top + r.height / 2 }; });
    await page.mouse.move(c.x, c.y); await page.mouse.down();
    for (let i = 1; i <= 6; i++) { await page.mouse.move(c.x + dx * i / 6, c.y); await page.waitForTimeout(20); }
    await page.mouse.up(); await page.waitForTimeout(500);
  };
  await page.evaluate(() => openTansui()); await page.waitForTimeout(450);
  check('  1つめが開く', await openedTool(), 'tansuiOverlay');
  await toolSwipe(-130);
  check('  左フリックで次の道具へ', await openedTool(), 'veggieOverlay');
  await toolSwipe(-130);
  check('  もう一度左で3つめへ', await openedTool(), 'kantabOverlay');
  await toolSwipe(130);
  check('  右フリックで前の道具へ', await openedTool(), 'veggieOverlay');
  await toolSwipe(130);
  check('  1つめまで戻る', await openedTool(), 'tansuiOverlay');
  await toolSwipe(130);
  check('  端でさらに右なら閉じる', await openedTool(), 'なし');
  check('  アプリは生きている', await page.evaluate(() => typeof data).catch(() => 'DEAD'), 'object');
  check('  見張りも残らない', await page.evaluate(() => backGuardStack.length), 0);

  // 入力欄や縦のスクロールはじゃましない
  await page.evaluate(() => openTansui()); await page.waitForTimeout(450);
  const inp = await page.evaluate(() => {
    const e = document.querySelector('#tansuiOverlay input'); const r = e.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height / 2 }; });
  await page.mouse.move(inp.x, inp.y); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(inp.x - 130 * i / 6, inp.y); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(450);
  check('  入力欄の上ではフリックしない', await openedTool(), 'tansuiOverlay');
  const bd = await page.evaluate(() => {
    const e = document.querySelector('#tansuiOverlay .modal-body'); const r = e.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 }; });
  await page.mouse.move(bd.x, bd.y); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(bd.x, bd.y - 120 * i / 6); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(450);
  check('  縦になぞっても移らない', await openedTool(), 'tansuiOverlay');
  await page.evaluate(() => closeTansui()); await page.waitForTimeout(400);

  // 登録を外すと全画面でなくなる
  await page.evaluate(() => { npToolToggle('linklist'); }); await page.waitForTimeout(250);
  check('  登録すると全画面になる', await full('linkListOverlay'), true);
  await page.evaluate(() => { npToolToggle('linklist'); }); await page.waitForTimeout(250);
  check('  外すと元の大きさに戻る', await full('linkListOverlay'), false);
  await page.evaluate(() => { npTools = []; saveNpTools(); applyNpToolFull(); renderNumpadPageBar(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { npTools = ['kantab', 'veggie', 'tansui']; saveNpTools(); renderNumpadPageBar(); });
  await page.waitForTimeout(200);

  // 登録ページでは道具のタブを出さない（並びが別のため）
  await page.evaluate(() => numpadPager.go('reg')); await page.waitForTimeout(500);
  check('  登録の並びには出さない', await page.evaluate(() =>
    !/単位水量/.test(document.getElementById('numpadPageBar').textContent)), true);
  await page.evaluate(() => numpadPager.go(null)); await page.waitForTimeout(400);
  await page.evaluate(() => { npTools = []; saveNpTools(); renderNumpadPageBar(); });

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 野菜の育成計画（種まきの日から予定日とカレンダーを出す道具） */
async function runVeggie(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 野菜の育成計画 ──');
  const open = async () => { await page.evaluate(() => openVeggie()); await page.waitForTimeout(300); };
  // 野菜を選んで、まく日を決める
  const plant = async (name, y, m, d) => { await page.evaluate(([n, y, m, d]) => {
      const i = vegAll().findIndex(v => v.n === n); vegPick(i);
      document.getElementById('vegY').value = y;
      document.getElementById('vegM').value = m;
      document.getElementById('vegD').value = d;
      vegDateChange(); }, [name, y, m, d]); await page.waitForTimeout(200); };
  const plan = () => page.evaluate(() => [...document.querySelectorAll('.veg-line')]
    .map(x => [...x.children].slice(1).map(y => y.textContent).join(' ')).join(' / '));

  await open();
  check('  キーに登録して開ける', await page.evaluate(() => KEY_FUNCS.a_veggie.label), '🌱野菜');
  check('  はじめから入っている野菜の数', await page.evaluate(() => VEG_PLANS.length), 33);
  check('  ビーツが入っている', await page.evaluate(() =>
    (VEG_PLANS.find(v => v.n === 'ビーツ') || {}).s.map(x => x[0]).join('/')),
    '発芽/1回目の間引き/2回目の間引き/追肥/収穫');
  check('  日数は はじめ≦おわり で、順に並んでいる', await page.evaluate(() =>
    VEG_PLANS.every(v => v.s.every(([, a, b]) => a <= b) &&
      v.s.every((st, i) => i === 0 || st[1] >= v.s[i - 1][1]))), true);
  check('  どの野菜にも収穫がある', await page.evaluate(() =>
    VEG_PLANS.filter(v => !v.s.some(st => /収穫|掘り/.test(st[0]))).map(v => v.n).join(',')), '');

  await plant('コマツナ', 2026, 4, 1);
  check('  コマツナの予定', await plan(),
        '種まき 4/1(水) 0日 / 発芽 4/4(土)〜4/5(日) 3〜4日 / 間引き 4/11(土)〜4/15(水) 10〜14日 / 収穫 5/1(金)〜5/11(月) 30〜40日');
  check('  何日後に収穫できるかを上に出す', await page.evaluate(() =>
    document.querySelector('.veg-head').textContent.replace(/\s+/g, ' ').split('種まき 4/1')[0].trim()),
        '🥬 コマツナ：収穫は 30〜40日後（5/1(金)〜5/11(月)）');
  check('  まく日はカレンダーの月に合わせる', await page.evaluate(() =>
    document.getElementById('vegCalTitle').textContent), '2026年 4月');
  check('  4月の予定の日に色が付く', await page.evaluate(() =>
    document.querySelectorAll('#vegGrid .veg-on').length), 8);   // 1 + 4,5 + 11〜15
  await page.evaluate(() => vegMonthMove(1)); await page.waitForTimeout(200);
  check('  次の月へ動かせる', await page.evaluate(() =>
    document.getElementById('vegCalTitle').textContent), '2026年 5月');
  check('  5月は収穫の日に色が付く', await page.evaluate(() =>
    document.querySelectorAll('#vegGrid .veg-on').length), 11);  // 5/1〜5/11
  await page.evaluate(() => vegCalHome()); await page.waitForTimeout(200);
  check('  「種まきの月」で戻る', await page.evaluate(() =>
    document.getElementById('vegCalTitle').textContent), '2026年 4月');
  check('  無い日付は入れられない', await page.evaluate(() => {
    document.getElementById('vegM').value = 2; document.getElementById('vegD').value = 30;
    vegDateChange(); return document.getElementById('vegD').value; }), '1');

  // いもや苗から育てるものは「植えつけ」から数える
  await plant('ジャガイモ', 2026, 3, 1);
  check('  ジャガイモは植えつけから数える', await page.evaluate(() =>
    document.getElementById('vegDateLb').textContent), '植えつけ日');

  // 名前でさがす
  await page.fill('#vegFind', 'ナス'); await page.waitForTimeout(200);
  check('  名前でさがせる', await page.evaluate(() =>
    [...document.querySelectorAll('#vegChips .veg-chip')].map(x => x.textContent.trim()).join(',')), '🍆 ナス');
  await page.fill('#vegFind', 'ぶどう'); await page.waitForTimeout(200);
  check('  見つからないときは案内を出す', await page.evaluate(() =>
    /その名前の野菜はありません/.test(document.getElementById('vegChips').textContent)), true);
  await page.fill('#vegFind', ''); await page.waitForTimeout(200);

  // ── 育てている野菜の記録（上の一覧）と、種から／苗から ──
  check('  一覧はいちばん上に出す', await page.evaluate(() => {
    const body = document.querySelector('#veggieOverlay .modal-body');
    return body.firstElementChild.querySelector('#vegPlotBody') ? 'top' : 'other'; }), 'top');
  check('  はじめは案内だけ', await page.evaluate(() =>
    /まだありません/.test(document.getElementById('vegPlotBody').textContent)), true);
  await plant('トマト', 2026, 3, 1);
  check('  種から育てる野菜は「苗から」も選べる', await page.evaluate(() =>
    document.getElementById('vegAsRow').style.display !== 'none'), true);
  check('  はじめは種から', await page.evaluate(() =>
    vegAs + '/' + document.getElementById('vegDateLb').textContent), 'seed/種まき日');
  await page.evaluate(() => vegSetAs('nae')); await page.waitForTimeout(200);
  check('  苗からにすると数える起点が変わる', await page.evaluate(() =>
    document.getElementById('vegDateLb').textContent), '苗を植えた日');
  check('  苗からは植えるまでの作業を出さない', await plan(),
        '苗を植える 3/1(日) 0日 / 花が咲く 3/16(月)〜3/31(火) 15〜30日 / 追肥 3/31(火)〜4/10(金) 30〜40日 / '
        + '収穫はじめ 4/15(水)〜4/30(木) 45〜60日 / 収穫おわり 6/4(木)〜6/29(月) 95〜120日');
  await page.evaluate(() => vegPlotAdd()); await page.waitForTimeout(200);
  check('  登録すると一覧に並ぶ', await page.evaluate(() => vegPlots.length), 1);
  check('  一覧の中身', await page.evaluate(() =>
    document.getElementById('vegPlotBody').innerText.replace(/\s+/g, ' ').includes('トマト苗 2026/3/1 に植えた')), true);
  check('  件数を見出しに出す', await page.evaluate(() =>
    document.getElementById('vegPlotCount').textContent), '（1）');
  await page.evaluate(() => vegSetAs('seed')); await page.waitForTimeout(150);
  await plant('ダイコン', 2026, 9, 10);
  check('  植えつけから数える野菜は「苗から」を出さない', await page.evaluate(() =>
    (plant => document.getElementById('vegAsRow').style.display)()), 'none');
  await page.evaluate(() => vegPlotAdd()); await page.waitForTimeout(200);
  check('  2つめも登録できる', await page.evaluate(() => vegPlots.length), 2);
  check('  同じものは二重に登録しない', await page.evaluate(() => {
    vegPlotAdd(); return vegPlots.length; }), 2);
  check('  つぎの作業と残り日数を出す', await page.evaluate(() =>
    /(つぎ|いま|きょう) .+|予定はおわりました/.test(document.getElementById('vegPlotBody').innerText)), true);
  // 選ぶと、その野菜と日付に戻る
  await plant('キュウリ', 2026, 5, 1);
  check('  選ぶ前はちがう野菜', await page.evaluate(() => vegSel.n), 'キュウリ');
  await page.evaluate(() => vegPlotPick(vegPlots.find(x => x.n === 'トマト').id));
  await page.waitForTimeout(300);
  check('  一覧から選ぶと元の予定に戻る', await page.evaluate(() =>
    vegSel.n + '/' + vegDateText(vegSowSerial) + '/' + vegAs), 'トマト/2026/3/1/nae');
  check('  選んだものに印が付く', await page.evaluate(() =>
    document.querySelectorAll('#vegPlotBody .veg-plot.on').length), 1);
  await page.evaluate(() => vegPick(vegAll().findIndex(v => v.n === 'ナス'))); await page.waitForTimeout(200);
  check('  自分で変えたら印は外れる', await page.evaluate(() =>
    document.querySelectorAll('#vegPlotBody .veg-plot.on').length), 0);
  // 開き直しても残る／消せる
  await page.reload(); await page.waitForTimeout(900);
  await open();
  check('  開き直しても残る', await page.evaluate(() =>
    vegPlots.map(x => x.n).sort().join(',')), 'ダイコン,トマト');
  check('  地域の設定は記録によらず共通', await page.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('excalc_veg_area') || '{}');
    return typeof a === 'object' && !('plots' in a) && !localStorage.getItem('excalc_veg_plots').includes('alt'); }), true);
  await page.evaluate(() => vegPlotDel(vegPlots[0].id)); await page.waitForTimeout(200);
  check('  消せる', await page.evaluate(() => vegPlots.length), 1);
  await page.evaluate(() => { vegPlots = []; saveVegPlots(); vegRenderPlots(); vegSetAs('seed'); });
  await page.waitForTimeout(150);

  // ── 地域・標高・寒冷地で日数を補正する ──
  const area = async (id, alt, cold) => { await page.evaluate(([id, alt, cold]) => {
      document.getElementById('vegAreaSel').value = id;
      document.getElementById('vegAlt').value = alt;
      document.getElementById('vegCold').checked = cold;
      vegAreaChange(); }, [id, alt, cold]); await page.waitForTimeout(200); };
  await plant('コマツナ', 2026, 4, 1);
  check('  はじめは補正なし', await page.evaluate(() => vegFactor()), 1);
  check('  補正なしの案内', await page.evaluate(() =>
    document.getElementById('vegFix').textContent.trim()), '補正 なし（そのままの日数）');
  await area('hokkaido', 0, false);
  check('  北海道は1.2倍', await page.evaluate(() => vegFactor()), 1.2);
  await area('hokkaido', 300, true);
  check('  標高300m・寒冷地でさらにおそく', await page.evaluate(() => vegFactor()), 1.34);
  check('  補正の案内', await page.evaluate(() =>
    document.getElementById('vegFix').textContent.replace(/\s+/g, ' ').trim()),
    '補正 ＋34%（日数を1.34倍） ／ 種まきの時期は標準の地域より 4週間おそめ');
  check('  日数も予定日もおそくなる', await plan(),
        '種まき 4/1(水) 0日 / 発芽 4/5(日)〜4/6(月) 4〜5日 / 間引き 4/14(火)〜4/20(月) 13〜19日 / 収穫 5/11(月)〜5/25(月) 40〜54日');
  check('  地域は短い言い方で出す', await page.evaluate(() => vegAreaText()), '北海道・標高300m・寒冷地');
  await area('okinawa', 0, false);
  check('  沖縄は0.88倍', await page.evaluate(() => vegFactor()), 0.88);
  check('  あたたかい地域は早くとれる', await plan(),
        '種まき 4/1(水) 0日 / 発芽 4/4(土)〜4/5(日) 3〜4日 / 間引き 4/10(金)〜4/13(月) 9〜12日 / 収穫 4/27(月)〜5/6(水) 26〜35日');
  check('  標高は0〜2000mにおさめる', await page.evaluate(() => {
    document.getElementById('vegAlt').value = -50; vegAreaChange(); const a = vegArea.alt;
    document.getElementById('vegAlt').value = 9999; vegAreaChange(); return a + '/' + vegArea.alt; }), '0/2000');
  await page.reload(); await page.waitForTimeout(900);
  await open();
  check('  地域の設定は開き直しても残る', await page.evaluate(() =>
    vegArea.id + '/' + vegArea.alt + '/' + vegArea.cold), 'okinawa/2000/false');
  await area('kanto', 0, false);

  // 年をまたぐときは年も出す
  await plant('タマネギ', 2026, 10, 1);
  check('  年をまたいだ日は年も出す', await page.evaluate(() =>
    document.querySelector('.veg-line:last-child .veg-when').textContent), '2027年5/9(日)〜2027年6/8(火)');

  // 予定表を表に入れる
  await plant('コマツナ', 2026, 4, 1);
  await page.evaluate(() => sel(3, 1)); await page.waitForTimeout(200);   // 選んでいるセルが左上になる
  await page.evaluate(() => vegInsertToSheet()); await page.waitForTimeout(500);
  check('  入れたら閉じる', await page.evaluate(() =>
    !document.getElementById('veggieOverlay').classList.contains('open')), true);
  check('  足りない列は増やす', await page.evaluate(() => COLS), 5);
  check('  表に入った中身', await page.evaluate(() => {
    const o = []; for (let r = 3; r < 9; r++) o.push([1, 2, 3, 4].map(c => getCellDisplay(r, c)).join('|'));
    return o.join(' / '); }),
    '🥬 コマツナ の育成計画（関東・東海・近畿）||| / 作業|予定日|おわり|日数 / 種まき|2026/4/1||0日 / '
    + '発芽|2026/4/4|2026/4/5|3〜4日 / 間引き|2026/4/11|2026/4/15|10〜14日 / 収穫|2026/5/1|2026/5/11|30〜40日');
  check('  日付は日付として入る（計算に使える）', await page.evaluate(() =>
    String(data[5][2]) === String(dateToSerial(2026, 4, 1))), true);
  check('  見出しは太字', await page.evaluate(() => !!(cellStyles['4,1'] && cellStyles['4,1'].bold)), true);
  await page.evaluate(() => undoLast()); await page.waitForTimeout(400);
  check('  ↶戻る で元どおり', await page.evaluate(() => getCellDisplay(3, 1) + '/' + COLS), '/3');

  // ── 肥料と、病気・害虫 ──
  await open();
  await plant('トマト', 2026, 3, 1);
  await page.evaluate(() => { document.getElementById('vegPlot').value = 3; vegPlotChange(); });
  await page.waitForTimeout(200);
  const fert = () => page.evaluate(() => document.getElementById('vegFertBody').innerText.replace(/\s+/g, ' '));
  check('  果菜の肥料が出る', /果菜（実をとるもの）／土のpH 6.0〜6.5/.test(await fert()), true);
  check('  畑の広さをかけた量も出す', /苦土石灰 100〜150g\/㎡（3㎡で 300〜450g）/.test(await fert()), true);
  check('  元肥の配合', /化成肥料 8-8-8 を 120〜150g\/㎡（3㎡で 360〜450g）/.test(await fert()), true);
  check('  追肥の日は予定表から出す', /この計画では 追肥 5\/25\(月\)〜6\/4\(木\)/.test(await fert()), true);
  check('  広さは開き直しても残る', await page.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('excalc_veg_area') || '{}'); return a.plot; }), 3);
  check('  広さは0や大きすぎる数を直す', await page.evaluate(() => {
    document.getElementById('vegPlot').value = 0; vegPlotChange(); const a = vegArea.plot;
    document.getElementById('vegPlot').value = 50000; vegPlotChange(); return a + '/' + vegArea.plot; }), '1/10000');
  await page.evaluate(() => { document.getElementById('vegPlot').value = 1; vegPlotChange(); });
  await page.waitForTimeout(150);
  const sick = () => page.evaluate(() => document.getElementById('vegSickBody').innerText.replace(/\s+/g, ' '));
  check('  トマトの病気・害虫', await page.evaluate(() =>
    [...document.querySelectorAll('.veg-sick-n')].map(x => x.textContent).join(',')),
    '疫病,灰色かび病,青枯病,尻ぐされ症（病気ではない）,アブラムシ,コナジラミ');
  check('  見分け方・手当て・薬の例を出す', /見分け方 .+ 手当て .+ 薬の例 /.test(await sick()), true);
  check('  農薬の注意を必ず出す', /必ずラベルで確かめてください/.test(await sick()), true);
  await plant('ジャガイモ', 2026, 3, 1);
  check('  ジャガイモは石灰をまかない', /苦土石灰 まきません/.test(await fert()), true);
  await plant('サツマイモ', 2026, 5, 1);
  check('  サツマイモは追肥をしない', /追肥 やりません/.test(await fert()), true);
  check('  すべての野菜に肥料と病気の目安がある', await page.evaluate(() =>
    VEG_PLANS.filter(v => !VEG_CARE[v.n] || !VEG_FERT[VEG_CARE[v.n].f] || !VEG_CARE[v.n].k.length)
      .map(v => v.n).join(',')), '');
  check('  病気の名前はすべて辞書にある', await page.evaluate(() =>
    Object.keys(VEG_CARE).flatMap(n => VEG_CARE[n].k).filter(k => !VEG_SICK[k]).join(',')), '');

  // ── 育てるときの注意 ──
  await plant('キュウリ', 2026, 4, 1);
  check('  育てるときの注意の項目', await page.evaluate(() =>
    [...document.querySelectorAll('#vegTipBody .veg-fwhat')].map(x => x.textContent).join(',')),
    '株間・畝,水やり,手入れ,連作,とりごろ');
  check('  キュウリの連作', await page.evaluate(() => VEG_TIPS['キュウリ'].c), 'ウリ科は2〜3年あける');
  check('  すべての野菜に注意がある', await page.evaluate(() =>
    VEG_PLANS.filter(v => { const t = VEG_TIPS[v.n];
      return !t || VEG_TIP_LABELS.some(([k]) => !t[k]); }).map(v => v.n).join(',')), '');

  // ── ぜんぶを1ページのPDFに ──
  // 印刷そのものは出せないので、組み立てと「1ページに収まる倍率」までを確かめる
  const pdfFit = async name => { await plant(name, 2026, 3, 1); return page.evaluate(() => {
      const built = opBuild(vegPdfHtml());
      const box = built.box;
      const r = { k: built.k, h: box.scrollHeight, txt: box.innerText.replace(/\s+/g, ' '),
                  months: box.querySelectorAll('.vp-cal').length };
      built.meas.remove();
      return r; }); };
  let pd = await pdfFit('トマト');
  check('  1ページに収まる', pd.h * pd.k <= 1046, true);
  check('  倍率は小さくしすぎない', pd.k > 0.35, true);
  check('  見出しと収穫のまとめが入る', /🍅 トマト の育成計画 .* 収穫はじめは 100〜115日後/.test(pd.txt), true);
  check('  予定表が入る', /予定表 .*種まき 3\/1\(日\) 0日/.test(pd.txt), true);
  check('  カレンダーは計画の月ぶん入る', pd.months, 6);
  check('  肥料が入る', /🧪 肥料と配合（果菜（実をとるもの）／土のpH 6\.0〜6\.5／畑 [\d,.]+㎡/.test(pd.txt), true);
  check('  育てるときの注意が入る', /⚠ 育てるときの注意 .* 株間45〜50cm/.test(pd.txt), true);
  check('  病気・害虫が入る', /🦠 出やすい病気・害虫と農薬 .*疫病/.test(pd.txt), true);
  check('  農薬の注意が最後に入る', /必ずラベルで確かめてください/.test(pd.txt), true);
  pd = await pdfFit('タマネギ');
  check('  長い計画でも1ページに収まる', pd.h * pd.k <= 1046, true);
  check('  長い計画のカレンダー', pd.months, 9);
  pd = await pdfFit('コマツナ');
  check('  短い計画は縮めない', pd.k, 1);
  check('  夜モードでも紙は白', await page.evaluate(() => {
    toggleDark(); const c = getComputedStyle(document.querySelector('.op-doc')).backgroundColor;
    toggleDark(); return c; }), 'rgb(255, 255, 255)');
  await page.evaluate(() => { const pa = document.getElementById('printArea'); if (pa) pa.innerHTML = ''; });

  // 肥料と病気も表に書き出す
  await plant('トマト', 2026, 3, 1);
  await page.evaluate(() => sel(0, 0)); await page.waitForTimeout(200);
  await page.evaluate(() => vegInsertToSheet()); await page.waitForTimeout(500);
  check('  表に肥料の段が入る', await page.evaluate(() => {
    for (let r = 0; r < ROWS; r++) if (/^🧪 肥料/.test(getCellDisplay(r, 0)))
      return [1, 2, 3].map(c => getCellDisplay(r + 2, c)).join('|');
    return 'なし'; }), '化成肥料 8-8-8|120〜150g/㎡|種まきの1週間前までに');
  check('  表に病気の段と注意が入る', await page.evaluate(() => {
    const t = []; for (let r = 0; r < ROWS; r++) t.push(getCellDisplay(r, 0));
    return t.some(x => /^🦠 出やすい病気・害虫/.test(x)) && t.some(x => /必ずラベルで確かめてください/.test(x)); }), true);
  check('  表に育てるときの注意も入る', await page.evaluate(() => {
    for (let r = 0; r < ROWS; r++) if (/^⚠ 育てるときの注意/.test(getCellDisplay(r, 0)))
      return getCellDisplay(r + 1, 0) + '|' + getCellDisplay(r + 1, 1);
    return 'なし'; }), '株間・畝|株間45〜50cm・畝幅120cm');
  await page.evaluate(() => undoLast()); await page.waitForTimeout(400);
  check('  ↶戻る で肥料の段も消える', await page.evaluate(() => getCellDisplay(0, 0) + '/' + ROWS), '/15');

  // 自分の野菜を登録する
  await open();
  await page.evaluate(() => { vegNew = { n: 'ゴーヤ', s: [['発芽', 6, 10], ['畑に植える', 30, 35], ['収穫', 70, 90]] };
    vegMySave(); }); await page.waitForTimeout(300);
  check('  登録した野菜が選ばれる', await page.evaluate(() => vegSel.n), 'ゴーヤ');
  check('  登録した野菜も一覧に出る', await page.evaluate(() =>
    document.querySelectorAll('#vegChips .veg-chip').length), 34);
  await plant('ゴーヤ', 2026, 5, 1);
  check('  登録した野菜の予定', await plan(),
        '種まき 5/1(金) 0日 / 発芽 5/7(木)〜5/11(月) 6〜10日 / 畑に植える 5/31(日)〜6/5(金) 30〜35日 / 収穫 7/10(金)〜7/30(木) 70〜90日');
  check('  名前がないと登録しない', await page.evaluate(() => {
    const n = vegMy.length; vegNew = { n: '  ', s: [['収穫', 60, 80]] }; vegMySave(); return vegMy.length === n; }), true);
  check('  作業がないと登録しない', await page.evaluate(() => {
    const n = vegMy.length; vegNew = { n: 'テスト', s: [['', 60, 80]] }; vegMySave(); return vegMy.length === n; }), true);
  await page.reload(); await page.waitForTimeout(900);
  await open();
  check('  開き直しても残っている', await page.evaluate(() => vegMy.map(v => v.n).join(',')), 'ゴーヤ');
  await page.evaluate(() => vegMyDel(0)); await page.waitForTimeout(200);
  check('  消せる', await page.evaluate(() => vegMy.length + '/' + vegSel.n), '0/トマト');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 電卓ページ（いちばん右。v335で関数電卓ページから置き換え） */
async function runCalcPage(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 電卓ページ ──');
  const tap = async k => { await page.evaluate(x => {
    const b = document.querySelector('[data-key="' + x + '"]'); if (b) b.click(); }, k);
    await page.waitForTimeout(110); };
  const seq = async ks => { for (const k of ks) await tap(k); };
  const tapK = tap;
  const main = () => page.evaluate(() => document.getElementById('dtMain').textContent);

  check('  ページの名前が「電卓」', await page.evaluate(() => NP_ROW_MAIN.map(x => x[1]).join('/')),
        '書式・枠線/数字/記号/電卓');
  check('  ふつうのスマホの電卓と同じ4列', await page.evaluate(() =>
    getComputedStyle(document.getElementById('numpadPageSci')).gridTemplateColumns.split(' ').length), 4);
  check('  段数は6段', await page.evaluate(() =>
    getComputedStyle(document.getElementById('numpadPageSci')).gridTemplateRows.split(' ').length), 6);
  check('  キーの並び', await page.evaluate(() => {
    const g = document.getElementById('numpadPageSci'), rows = {};
    [...g.querySelectorAll('.btn')].forEach(b => { const r = Math.round(b.getBoundingClientRect().top);
      (rows[r] = rows[r] || []).push(b.textContent.trim()); });
    return Object.keys(rows).sort((a, b) => a - b).map(r => rows[r].join(' ')).join(' / ')
      .replace('🧮電卓', '表／電卓').replace('▦表へ', '表／電卓');
  }), '表／電卓 桁 自 🎤 声 / AC （ ） ％ ÷ / 7 8 9 × / 4 5 6 − / 1 2 3 ＋ / 0 . ⌫ ＝');
  check('  数字キーが標準テンキーより大きい', await page.evaluate(() => {
    const a = document.querySelector('#numpadPageSci [data-key="dk_7"]').getBoundingClientRect();
    const b = document.querySelector('#numpadPage1 [data-key="n7"]').getBoundingClientRect();
    return a.width > b.width; }), true);
  check('  メモリー・消費税はキーに割り当てて使える', await page.evaluate(() =>
    ['a_memplus','a_memminus','a_memrecall','a_memclear','a_taxin','a_taxout']
      .map(k => KEY_FUNCS[k].label).join(' ')), 'M＋ M− MR MC 税込 税抜');

  // 電卓モードに入ると自動で開き、表に戻ると数字ページへ
  check('  はじめは数字ページ', await page.evaluate(() => numpadPager.current()), 'null');
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(600);
  check('  電卓モードで電卓ページが開く', await page.evaluate(() => numpadPager.current()), 'sci');
  check('  ▦表へ の表示', await page.evaluate(() =>
    document.querySelector('[data-key="dk_tosheet"]').textContent.trim()), '▦表へ');
  await page.evaluate(() => switchMode('normal')); await page.waitForTimeout(600);
  check('  表に戻ると数字ページへ', await page.evaluate(() => numpadPager.current()), 'null');
  check('  表では 🧮電卓 の表示', await page.evaluate(() =>
    document.querySelector('[data-key="dk_tosheet"]').textContent.trim()), '🧮電卓');

  // ── 電卓ページとモードの連動（スライドでもページ名タップでも） ──
  const tab = async name => { await page.evaluate(n => { const b=[...document.querySelectorAll('.np-page')]
    .find(x => x.textContent.trim() === n); if (b) b.click(); }, name); await page.waitForTimeout(700); };
  const now = () => page.evaluate(() => tableMode + '/' + String(numpadPager.current()));
  await page.evaluate(() => switchMode('normal')); await page.waitForTimeout(600);
  await tab('電卓');
  check('  ページ名「電卓」で電卓モードになる', await now(), 'dentaku/sci');
  await tab('数字');
  check('  ページ名「数字」で表に戻る', await now(), 'normal/null');
  await tab('記号');
  check('  「記号」ではモードは変わらない', await now(), 'normal/func');
  await tab('数字');
  // スライドでも同じ
  const flick = async dx => {
    // フリックはボタンの上から始める（ボタンの隙間からは始まらない作りのため）
    const vp = await page.evaluate(() => {
      const b = document.querySelector('#numpadViewport .numpad-grid:not(.numpad-overlay) .btn')
             || document.querySelector('#numpadViewport .btn');
      const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(vp.x, vp.y); await page.mouse.down();
    for (let i = 1; i <= 6; i++) { await page.mouse.move(vp.x + dx * i / 6, vp.y); await page.waitForTimeout(25); }
    await page.mouse.up(); await page.waitForTimeout(700);
  };
  await flick(-150); await flick(-150);
  check('  スライドで電卓ページへ行くと電卓モード', await now(), 'dentaku/sci');
  await flick(150);
  check('  スライドで出ると表に戻る', await now(), 'normal/func');
  await tab('数字');
  // 元のモードへ戻る（通常以外から行ったとき）
  await page.evaluate(() => switchMode('shopping')); await page.waitForTimeout(600);
  await tab('電卓');
  check('  買物からでも電卓へ行ける', await now(), 'dentaku/sci');
  await tab('数字');
  check('  戻ると元の買物モードへ', await now(), 'shopping/null');
  await page.evaluate(() => switchMode('normal')); await page.waitForTimeout(600);
  // 行ったり来たりしても止まらない
  for (let i = 0; i < 3; i++) { await tab('電卓'); await tab('数字'); }
  check('  行き来をくり返しても崩れない', await now(), 'normal/null');

  // ▦表へ で表に戻り、答えがセルに入る
  await page.evaluate(() => { sel(0, 0); setCellVal(0, 0, ''); }); await page.waitForTimeout(200);
  await tab('電卓');
  await page.evaluate(() => { dtAllClear();
    ['dk_1','dk_2','dk_mul','dk_3','dk_eq'].forEach(k => document.querySelector('[data-key="' + k + '"]').click()); });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('[data-key="dk_tosheet"]').click());
  await page.waitForTimeout(800);
  check('  ▦表へ で表に戻る', await now(), 'normal/null');
  check('  答えがセルに入る', await page.evaluate(() => data[0][0]), '36');

  // 計算（ふつうの電卓）
  await page.evaluate(() => { switchMode('dentaku'); dtStyle = 'simple'; dtTape = []; dtMem = 0; dtAllClear(); });
  await page.waitForTimeout(500);
  await seq(['dk_1','dk_2','dk_mul','dk_3','dk_eq']);
  check('  12×3＝', await main(), '36');
  await seq(['dk_1','dk_0']);
  check('  ＝のあとの数字は新しく打ち始める', await main(), '10');
  await seq(['dk_plus','dk_5','dk_eq']);
  check('  ＋5＝', await main(), '15');
  await page.evaluate(() => dtAllClear());
  await seq(['dk_5','dk_dot','dk_5','dk_mul','dk_2','dk_eq']);
  check('  5.5×2＝', await main(), '11');
  await page.evaluate(() => dtAllClear());
  await seq(['dk_1','dk_0','dk_0','dk_plus','dk_1','dk_0','dk_pct','dk_eq']);
  check('  100＋10％＝', await main(), '110');
  await page.evaluate(() => { dtAllClear(); });
  await seq(['dk_1','dk_0','dk_0']);
  await page.evaluate(() => dtTax(1));
  check('  100 税込（キーに割り当てた税込）', await main(), '110');

  // ⌫ と （ ）
  await page.evaluate(() => dtAllClear());
  await seq(['dk_1','dk_2','dk_3','dk_bs']);
  check('  ⌫ で1文字消える', await main(), '12');
  await page.evaluate(() => { dtStyle = 'simple'; dtAllClear(); document.getElementById('appToast').textContent = ''; });
  await tapK('dk_par');
  check('  ふつうの電卓では かっこ の使い方を知らせる', await page.evaluate(() =>
    /式の優先順位どおり/.test(document.getElementById('appToast').textContent)), true);
  await page.evaluate(() => { dtStyle = 'expr'; dtAllClear(); });
  await seq(['dk_par','dk_1','dk_0','dk_0','dk_plus','dk_2','dk_0','dk_par','dk_mul','dk_3','dk_eq']);
  check('  （100＋20）×3＝', await main(), '360');
  await page.evaluate(() => { dtStyle = 'simple'; dtAllClear(); });

  // メモリー（キーには出さないが、割り当てて使える）
  await page.evaluate(() => { dtMem = 0; dtAllClear(); });
  await seq(['dk_1','dk_2','dk_mul','dk_3','dk_eq']);
  await page.evaluate(() => dtMemAdd(1));
  check('  M＋', await page.evaluate(() => fmtNum(dtMem)), '36');
  await seq(['dk_1','dk_0']);
  await page.evaluate(() => dtMemAdd(1));
  check('  続けてM＋', await page.evaluate(() => fmtNum(dtMem)), '46');
  await seq(['dk_6']);
  await page.evaluate(() => dtMemAdd(-1));
  check('  M−', await page.evaluate(() => fmtNum(dtMem)), '40');
  await seq(['dk_ac']);
  await page.evaluate(() => dtMemRecall());
  check('  AC のあと MR で呼び出せる', await main(), '40');
  await page.evaluate(() => dtMemClear());
  check('  MC で消える', await page.evaluate(() => fmtNum(dtMem)), '0');

  // ── 声で言った計算式の行（v339。もとは％・税込・AC などのボタンがあった場所） ──
  // 「式 ｜ 聞こえた言葉 ｜ 色」の1行にまとめて見くらべる
  const vline = () => page.evaluate(() => {
    const b = document.getElementById('dtVoice');
    return [document.getElementById('dtVoiceF').textContent,
            document.getElementById('dtVoiceRaw').textContent,
            b.classList.contains('dt-voice-on') ? '緑' : b.classList.contains('dt-voice-ng') ? '赤' : '−'
           ].join(' ｜ ');
  });
  check('  ％・税込・AC・セルに入れる の行は無くなった', await page.evaluate(() =>
    document.querySelectorAll('#dentakuPane .dt-key').length + ':' +
    (document.getElementById('dtVoice') ? 1 : 0)), '0:1');
  await page.evaluate(() => { dtAllClear(); dtTape = []; });
  check('  はじめは案内だけ', await vline(), '🎤を押すと、声で計算できます ｜  ｜ −');
  await page.evaluate(() => voiceAcceptDentaku('251かける68'));
  await page.waitForTimeout(200);
  check('  声で言った式が出る', await vline(), '251×68 ＝ 17068 ｜ 「251かける68」と聞こえました ｜ 緑');
  check('  答えは大きい表示にも出る', await main(), '17068');
  await page.evaluate(() => voiceAcceptDentaku('こんにちは'));
  await page.waitForTimeout(200);
  check('  式にできないときは聞こえた言葉を残す', await vline(),
        '計算の形になりませんでした ｜ 「こんにちは」と聞こえました ｜ 赤');
  await page.evaluate(() => dtAllClear());
  check('  AC で消える', await vline(), '🎤を押すと、声で計算できます ｜  ｜ −');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* しゃべった式の読み取り */
async function runSpeech(browser) {
  const { CASES, CASES3, MOVE } = require('./speech.test.js');
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── しゃべった式の読み取り ──');

  const got = await page.evaluate(cases => cases.map(([t]) => speechToFormula(t) || ''), CASES);
  CASES.forEach(([t, want], i) => check(`  ${t === '' ? '(空)' : t}`, got[i], want));
  const got3 = await page.evaluate(cases => cases.map(([t]) => speechToFormula(t) || ''), CASES3);
  CASES3.forEach(([t, want], i) => check(`  ${t}`, got3[i], want));
  const gotMove = await page.evaluate(list => list.map(([t]) => speechMoveWord(t) || ''), MOVE);
  MOVE.forEach(([t, want], i) => check(`  「${t}」は動く言葉か`, gotMove[i], want || ''));

  // 実際にセルへ入れたときも式になる／ならない
  const commit = t => page.evaluate(x => {
    sel(0, 0);
    const fi = document.getElementById('formulaInput');
    fi.focus(); fi.value = x; fi.dispatchEvent(new Event('input'));
    fi.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return data[0][0];
  }, t);
  check('  セルに式として入る', await commit('251かける68'), '=251*68');
  check('  計算される', await page.evaluate(() => getCellDisplay(0, 0)), '17068');
  check('  文字はそのまま入る', await commit('みかん3個'), 'みかん3個');

  // 言ったとおりの文字に戻せる
  await commit('251かける68');
  await page.evaluate(() => speechKeepPlain()); await page.waitForTimeout(300);
  check('  言ったとおりの文字に戻せる', await page.evaluate(() => data[0][0]), '251かける68');

  // 設定で切れる
  await page.evaluate(() => toggleSpeechAuto());
  check('  設定で切ると文字のまま', await commit('251かける68'), '251かける68');
  await page.evaluate(() => toggleSpeechAuto());
  check('  設定で戻せる', await commit('251かける68'), '=251*68');

  // ── アプリの中の🎤 ──
  check('  🎤が使えるか調べられる', await page.evaluate(() => typeof voiceAvailable()), 'boolean');
  check('  使えるときは⋯に🎤が出る', await page.evaluate(() =>
    voiceAvailable() === (getComputedStyle(document.getElementById('voiceMoreBtn')).display !== 'none')), true);
  check('  キーに割り当てられる', await page.evaluate(() =>
    KEY_FUNCS.a_voice ? KEY_FUNCS.a_voice.label : 'なし'), '🎤声');

  // 聞き取りの部分は偽物に差し替えて、聞き取れたあとの動きだけ確かめる
  await page.evaluate(() => {
    window.__spoken = null;
    window.SpeechRecognition = class {
      start() { setTimeout(() => { if (this.onresult) this.onresult({ resultIndex: 0,
        results: [Object.assign([{ transcript: window.__spoken }], { isFinal: true })] }); }, 20); }
      abort() {}
    };
  });
  const say = async t => { await page.evaluate(x => { window.__spoken = x; sel(0, 0); voiceStart(); }, t);
    await page.waitForTimeout(300); return page.evaluate(() => data[0][0]); };
  check('  しゃべった式がセルに入る', await say('251かける68'), '=251*68');
  check('  計算される', await page.evaluate(() => getCellDisplay(0, 0)), '17068');
  await page.evaluate(() => setCellVal(0, 0, ''));
  check('  式でない言葉は文字のまま入る', await say('みかん3個'), 'みかん3個');
  check('  入れ終わったら窓が閉じる', await page.evaluate(() =>
    document.getElementById('voiceOverlay').classList.contains('open')), false);
  // 入れ終わったあとに端末のキーボードが出ないこと（v351）
  const focused = () => page.evaluate(() => {
    const a = document.activeElement; return a ? a.tagName : 'null'; });
  await page.evaluate(() => { setCellVal(0, 0, ''); document.getElementById('formulaInput').focus(); });
  await page.waitForTimeout(150);
  check('  入力欄にフォーカスがある状態から', await focused(), 'INPUT');
  await say('251かける68');
  await page.waitForTimeout(250);
  check('  入れ終わったら入力欄から手を離す', await focused() === 'INPUT', false);
  check('  それでもセルには入っている', await page.evaluate(() => getCellDisplay(0, 0)), '17068');
  await page.evaluate(() => setCellVal(0, 0, ''));

  // 聞き取り中の窓が出て、タップで閉じられる
  await page.evaluate(() => { window.SpeechRecognition = class { start() {} abort() {} };
    sel(0, 0); voiceStart(); }); await page.waitForTimeout(300);
  check('  聞き取り中は窓が出る', await page.evaluate(() =>
    document.getElementById('voiceOverlay').classList.contains('open')), true);
  await page.evaluate(() => voiceStop()); await page.waitForTimeout(200);
  check('  タップでやめられる', await page.evaluate(() =>
    document.getElementById('voiceOverlay').classList.contains('open')), false);

  // 使えない端末では、キーボードのマイクを案内する
  await page.evaluate(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; voiceStart(); });
  await page.waitForTimeout(300);
  check('  使えない端末では案内を出す', await page.evaluate(() =>
    /キーボードのマイク/.test(document.getElementById('appToast').textContent)), true);

  // ── 第3期：続けて入れる・移る・読み上げ ──
  await page.evaluate(() => {
    window.__q = [];
    window.SpeechRecognition = class {
      start() { setTimeout(() => { const t = window.__q.shift();
        if (t === undefined) { if (this.onend) this.onend(); return; }
        if (this.onresult) this.onresult({ resultIndex: 0,
          results: [Object.assign([{ transcript: t }], { isFinal: true })] }); }, 20); }
      abort() {}
    };
  });
  await page.evaluate(() => { setCellVal(0, 0, ''); sel(0, 0); window.__q = ['次']; voiceStart(); });
  await page.waitForTimeout(300);
  check('  「次」で下のセルへ移るだけ',
        await page.evaluate(() => xlColLetter(selC) + (selR + 1) + '/' + data[0][0]), 'A2/');

  await page.evaluate(() => { sel(0, 0); window.__q = ['100たす50', '200かける3', 'ルート16'];
    voiceStartContinuous(); });
  await page.waitForTimeout(2500);
  check('  続けて3つ入る',
        await page.evaluate(() => [data[0][0], data[1][0], data[2][0]].join('|')),
        '=100+50|=200*3|=SQRT(16)');
  check('  それぞれ計算される',
        await page.evaluate(() => [0, 1, 2].map(r => getCellDisplay(r, 0)).join('|')), '150|600|4');
  check('  1つ入れるたびに下のセルへ移る',
        await page.evaluate(() => xlColLetter(selC) + (selR + 1)), 'A4');
  await page.evaluate(() => voiceCancel()); await page.waitForTimeout(200);
  check('  画面タップで続けモードも終わる', await page.evaluate(() => voiceKeepGoing), false);

  // 「左に式・右に答え」でも、ちゃんと下へ進む（同じセルに上書きしない）
  await page.evaluate(() => { setSpeechLayout('split');
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) setCellVal(r, c, '');
    sel(0, 0); window.__q = ['100たす50', '200かける3', '300ひく100']; voiceStartContinuous(); });
  await page.waitForTimeout(2600);
  check('  左に式・右に答えでも下へ進む',
        await page.evaluate(() => [0, 1, 2].map(r => data[r][0]).join('|')), '100＋50|200×3|300−100');
  check('  答えも1行ずつ入る',
        await page.evaluate(() => [0, 1, 2].map(r => getCellDisplay(r, 1)).join('|')), '150|600|200');
  check('  そのあとの場所',
        await page.evaluate(() => xlColLetter(selC) + (selR + 1)), 'A4');
  await page.evaluate(() => voiceCancel()); await page.waitForTimeout(200);

  // いちばん下の行まで来たら、行を足して進む（上書きしない）
  const rowsBefore = await page.evaluate(() => ROWS);
  await page.evaluate(() => { sel(ROWS - 1, 0);
    window.__q = ['2かける3', '4かける5']; voiceStartContinuous(); });
  await page.waitForTimeout(1900);
  check('  最終行では行を足して進む',
        await page.evaluate(() => ROWS) > rowsBefore, true);
  await page.evaluate(() => voiceCancel()); await page.waitForTimeout(200);
  // ── 左に式・右に答え：式が消えてしまっていた不具合 ──
  await page.evaluate(() => { cellStyles = {};
    for (let r = 0; r < 8; r++) for (let c = 0; c < COLS; c++) setCellVal(r, c, ''); buildSheet(); });
  const sayTo = async (t, r, c) => { await page.evaluate(async ([t, r, c]) => {
      sel(r, c); voiceAccept(t); await new Promise(z => setTimeout(z, 80)); }, [t, r, c]);
    await page.waitForTimeout(120); };
  await sayTo('12ひく5', 0, 0);
  check('  引き算の式が日付にならない',
        await page.evaluate(() => getCellDisplay(0, 0) + '|' + getCellDisplay(0, 1)), '12−5|7');
  await sayTo('5ひく3', 1, 0);
  check('  小さい数の引き算も式のまま',
        await page.evaluate(() => getCellDisplay(1, 0) + '|' + getCellDisplay(1, 1)), '5−3|2');
  await sayTo('8たす9', 2, 0);
  check('  足し算は＋で見せる',
        await page.evaluate(() => getCellDisplay(2, 0) + '|' + getCellDisplay(2, 1)), '8＋9|17');
  // 右のセルが保護されていたら、その先の使えるセルに答えを入れる
  await page.evaluate(() => { cellStyles['3,1'] = { locked: true }; buildSheet(); });
  await sayTo('9かける9', 3, 0);
  check('  右が保護なら、その先のセルに答えを入れる',
        await page.evaluate(() => [0, 1, 2].map(c => getCellDisplay(3, c)).join('|')), '9×9||81');
  check('  どこに入れたか知らせる', await page.evaluate(() =>
    /をC4に入れました/.test(document.getElementById('appToast').textContent)), true);
  await page.evaluate(() => { cellStyles = {}; buildSheet(); });
  // 右に入れる場所がまったく無いときは、そのセルに式を入れて理由を知らせる
  await page.evaluate(() => switchMode('shopping')); await page.waitForTimeout(500);
  await sayTo('120かける3', 1, 2);   // 右は自動計算の「合計」列
  check('  入れる場所が無いときは、そのセルに式を入れる',
        await page.evaluate(() => String(data[1][2]) + '|' + getCellDisplay(1, 2)), '=120*3|360');
  check('  そのわけを知らせる', await page.evaluate(() =>
    /右に答えを入れられるセルが無いので/.test(document.getElementById('appToast').textContent)), true);
  await page.evaluate(() => switchMode('normal')); await page.waitForTimeout(500);
  await page.evaluate(() => setSpeechLayout('one'));

  // 1回だけのときは、そのセルに留まる
  await page.evaluate(() => { setCellVal(1, 0, ''); sel(1, 0); window.__q = ['251かける68']; voiceStart(); });
  await page.waitForTimeout(400);
  check('  1回だけならそのセルに留まる',
        await page.evaluate(() => xlColLetter(selC) + (selR + 1)), 'A2');

  check('  読み上げは既定で切ってある', await page.evaluate(() => speechSpeakOn), false);
  check('  設定で読み上げを入れられる',
        await page.evaluate(() => { toggleSpeechSpeak(); return speechSpeakOn; }), true);
  await page.evaluate(() => toggleSpeechSpeak());
  check('  🎤続けもキーに割り当てられる',
        await page.evaluate(() => KEY_FUNCS.a_voiceseq ? KEY_FUNCS.a_voiceseq.label : 'なし'), '🎤続け');

  // ── 電卓モードでも声で計算できること ──
  await page.evaluate(() => { window.__q = [];
    window.SpeechRecognition = class {
      start() { this._on = true; setTimeout(() => { if (!this._on) return;
        const t = window.__q.shift(); if (t === undefined) return;
        if (this.onresult) this.onresult({ resultIndex: 0,
          results: [Object.assign([{ transcript: t }], { isFinal: true })] }); }, 30); }
      abort() { this._on = false; } };
  });
  const sayDt = async t => { await page.evaluate(x => { window.__q = [x]; voiceStop(); voiceStart(); }, t);
    await page.waitForTimeout(450); };
  for (const style of ['simple', 'expr']) {
    await page.evaluate(x => { voiceKeepGoing = false; switchMode('dentaku');
      dtStyle = x; dtTape = []; dtExpr = ''; disp_val = '0'; dtRender(); }, style);
    await page.waitForTimeout(400);
    await sayDt('251かける68');
    check(`  電卓(${style}) 声で計算できる`,
          await page.evaluate(() => document.getElementById('dtMain').textContent), '17068');
    check(`  電卓(${style}) 履歴に読みやすい形で残る`,
          await page.evaluate(() => dtTape[dtTape.length - 1].e + '=' + dtTape[dtTape.length - 1].v), '251×68=17068');
    await sayDt('かっこ100たす20かっことじかける3');
    check(`  電卓(${style}) かっこも計算できる`,
          await page.evaluate(() => document.getElementById('dtMain').textContent), '360');
    await sayDt('みかん3個');
    check(`  電卓(${style}) 式でないときは知らせる`,
          await page.evaluate(() => /計算の形で言って/.test(document.getElementById('appToast').textContent)), true);
  }
  // 続けて入れる（電卓ではセルが無いので、聞き直すだけ）
  await page.evaluate(() => { dtTape = []; dtRender();
    window.__q = ['2かける3', '4かける5', '10わる4']; voiceStop(); voiceKeepGoing = true; voiceStart(); });
  await page.waitForTimeout(2600);
  check('  電卓でも続けて入れられる',
        await page.evaluate(() => dtTape.map(x => x.e + '=' + x.v).join('/')), '2×3=6/4×5=20/10÷4=2.5');
  await page.evaluate(() => voiceCancel()); await page.waitForTimeout(200);
  // 表に戻れば、今までどおりセルへ入る
  await page.evaluate(() => { switchMode('normal'); setCellVal(0, 0, ''); sel(0, 0); });
  await page.waitForTimeout(500);
  await sayDt('7かける8');
  check('  表に戻ればセルに入る', await page.evaluate(() => data[0][0]), '=7*8');

  // ── 聞いている窓の中で「続けて入れる」を切り替えられること ──
  // テンキーの🎤声キーは長押しが「別の機能に変更」なので、長押しでは切り替えられない。
  await page.evaluate(() => { window.__q = [];
    window.SpeechRecognition = class {
      start() { this._on = true; setTimeout(() => { if (!this._on) return;
        const t = window.__q.shift(); if (t === undefined) return;   // 何も無ければ聞いたまま
        if (this.onresult) this.onresult({ resultIndex: 0,
          results: [Object.assign([{ transcript: t }], { isFinal: true })] }); }, 30); }
      abort() { this._on = false; } };
  });
  await page.evaluate(() => { voiceStop(); voiceKeepGoing = false; sel(0, 0); voiceStart(); });
  await page.waitForTimeout(300);
  check('  窓に「続けて入れる」がある',
        await page.evaluate(() => !!document.getElementById('voiceSeqBtn')), true);
  const seqBox = await page.evaluate(() => {
    const r = document.getElementById('voiceSeqBtn').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(seqBox.x, seqBox.y); await page.mouse.down();
  await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(300);
  check('  押すと続けて入れるになる', await page.evaluate(() => voiceKeepGoing), true);
  check('  押しても窓は閉じない',
        await page.evaluate(() => document.getElementById('voiceOverlay').classList.contains('open')), true);
  check('  ボタンの見た目も変わる',
        await page.evaluate(() => document.getElementById('voiceSeqBtn').classList.contains('on')), true);
  // そのまま続けて入る
  await page.evaluate(() => { for (let r = 0; r < 5; r++) setCellVal(r, 0, ''); sel(0, 0);
    window.__q = ['100たす50', '200かける3', '300ひく100']; voiceStop(); voiceStart(); });
  await page.waitForTimeout(2600);
  check('  窓から入れても続けて入る',
        await page.evaluate(() => [0, 1, 2].map(r => data[r][0]).join('|')), '=100+50|=200*3|=300-100');
  await page.evaluate(() => { voiceStop(); voiceStart(); }); await page.waitForTimeout(300);
  await page.evaluate(() => voiceToggleKeepGoing()); await page.waitForTimeout(200);
  check('  もう一度押すとやめる', await page.evaluate(() => voiceKeepGoing), false);
  await page.evaluate(() => voiceCancel()); await page.waitForTimeout(200);

  // ── テンキーの🎤声キーで、押した瞬間に閉じないこと ──
  // 窓は画面いっぱいに出るので、キーを押した指がそのまま窓の上にある。
  // 指を離した分のクリックで開いた瞬間に閉じていた（登録ボタンは160ms遅れて動くので無事だった）。
  await page.evaluate(() => { window.SpeechRecognition = class { start() {} abort() {} }; });
  const vOpen = () => page.evaluate(() => document.getElementById('voiceOverlay').classList.contains('open'));
  const keyBox = await page.evaluate(() => {
    const e = document.querySelector('[data-key="u_voice"]');
    if (!e) return null;
    const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  check('  テンキーに🎤声キーがある', !!keyBox, true);
  await page.evaluate(() => voiceStop()); await page.waitForTimeout(150);
  await page.evaluate(a => { voiceStart();
    document.getElementById('voiceOverlay').dispatchEvent(new MouseEvent('click',
      { bubbles: true, cancelable: true, clientX: a.x, clientY: a.y })); }, keyBox);
  await page.waitForTimeout(300);
  check('  押した指を離した分では閉じない', await vOpen(), true);
  // 押し直せばちゃんと閉じられる
  const boxTop = await page.evaluate(() => {
    const r = document.querySelector('.voice-box').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: Math.max(4, r.top - 30) }; });
  await page.mouse.move(boxTop.x, boxTop.y); await page.mouse.down();
  await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(300);
  check('  押し直せば閉じられる', await vOpen(), false);

  // ── 失敗したときの知らせ方（自分で止めた分は失敗にしない） ──
  const toastNow = () => page.evaluate(() => (document.getElementById('appToast') || {}).textContent || '');
  const clearToast = () => page.evaluate(() => { const t = document.getElementById('appToast'); if (t) t.textContent = ''; });
  // 実機と同じく abort() が「aborted」のエラーを起こす偽物にする
  await page.evaluate(() => {
    window.SpeechRecognition = class {
      start() { this._on = true;
        setTimeout(() => { if (!this._on) return;
          if (window.__err) { if (this.onerror) this.onerror({ error: window.__err });
                              if (this.onend) this.onend(); return; }
          if (this.onresult) this.onresult({ resultIndex: 0,
            results: [Object.assign([{ transcript: '251かける68' }], { isFinal: true })] }); }, 20); }
      abort() { this._on = false; if (this.onerror) this.onerror({ error: 'aborted' }); if (this.onend) this.onend(); }
    };
  });
  await clearToast();
  await page.evaluate(() => { window.__err = null; setCellVal(0, 0, ''); sel(0, 0); voiceStart(); });
  await page.waitForTimeout(400);
  check('  うまく入ったのに失敗と言わない',
        /聞き取れません/.test(await toastNow()), false);
  check('  ちゃんと入っている', await page.evaluate(() => data[0][0]), '=251*68');
  await clearToast();
  await page.evaluate(() => { window.SpeechRecognition = class { start() {}
    abort() { if (this.onerror) this.onerror({ error: 'aborted' }); } }; voiceStart(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => voiceCancel()); await page.waitForTimeout(300);
  check('  やめたときも失敗と言わない', await toastNow(), '');

  // 理由ごとに言い方を変える
  await page.evaluate(() => { window.SpeechRecognition = class {
    start() { setTimeout(() => { if (this.onerror) this.onerror({ error: window.__err }); }, 20); }
    abort() {} }; });
  for (const [k, word] of [['not-allowed', 'マイクが使えません'], ['audio-capture', 'マイクが見つかりません'],
                           ['network', 'ネットにつながって'], ['no-speech', '声を拾えませんでした'],
                           ['language-not-supported', 'language-not-supported']]) {
    await clearToast();
    await page.evaluate(x => { window.__err = x; voiceStart(); }, k);
    await page.waitForTimeout(250);
    check(`  ${k} の知らせ方`, (await toastNow()).includes(word), true);
  }
  await clearToast();
  await page.evaluate(() => { window.SpeechRecognition = class {
    start() { setTimeout(() => { if (this.onend) this.onend(); }, 20); } abort() {} }; voiceStart(); });
  await page.waitForTimeout(250);
  check('  すぐ終わったときも理由を出す', (await toastNow()).includes('すぐに終わって'), true);

  // ── テンキーの道具の段の既定の並び ──
  const toolRow = () => page.evaluate(() => [...document.querySelectorAll('#numpadPage1 .btn.util')]
    .map(b => ({ k: b.dataset.key, c: +getComputedStyle(b).gridColumnStart }))
    .sort((a, b) => a.c - b.c).map(x => x.k).join(','));
  check('  道具の段は 🎤声・進む・戻る・リセット・▦通常',
        await toolRow(), 'u_voice,u_redo,u_undo,u_reset,u_normal');
  check('  電卓キーは道具の段に無い',
        await page.evaluate(() => !!document.querySelector('#numpadPage1 [data-key="u_dentaku"]')), false);
  check('  電卓は⋯から出せる', await page.evaluate(() =>
    !!document.querySelector('#moreMenuOverlay button[onclick*="dentaku"]')), true);
  check('  電卓はキーにも割り当てられる',
        await page.evaluate(() => KEY_FUNCS.a_modedentaku ? KEY_FUNCS.a_modedentaku.label : 'なし'), '🧮電卓');
  // 自分で並べ替えていた人は、電卓のあった場所に🎤声が入る（重ならない）
  await page.evaluate(() => localStorage.setItem('excalc_keypad_pos_v2', JSON.stringify({
    u_dentaku: { r: 1, c: 1 }, u_redo: { r: 1, c: 2 }, u_undo: { r: 1, c: 3 },
    u_reset: { r: 1, c: 4 }, u_normal: { r: 1, c: 5 } })));
  await page.reload(); await page.waitForTimeout(900);
  check('  並べ替えていた人は電卓の場所に🎤声',
        await toolRow(), 'u_voice,u_redo,u_undo,u_reset,u_normal');
  await page.evaluate(() => { localStorage.removeItem('excalc_keypad_pos_v2'); });
  await page.reload(); await page.waitForTimeout(900);
  // 読み込み直したので、偽の音声認識を入れ直す
  await page.evaluate(() => {
    window.__q = [];
    window.SpeechRecognition = class {
      start() { setTimeout(() => { const t = window.__q.shift();
        if (t === undefined) { if (this.onend) this.onend(); return; }
        if (this.onresult) this.onresult({ resultIndex: 0,
          results: [Object.assign([{ transcript: t }], { isFinal: true })] }); }, 20); }
      abort() {}
    };
  });

  // ── 声の入れかた（1つのセル／左に式・右に答え） ──
  const pair = (r, c) => page.evaluate(([r, c]) =>
    data[r][c] + '|' + data[r][c + 1] + '|' + getCellDisplay(r, c + 1), [r, c]);
  const sayAt = async (r, c, t) => { await page.evaluate(([r, c, x]) => {
    setCellVal(r, c, ''); setCellVal(r, c + 1, ''); sel(r, c);
    window.__q = [x]; voiceStart(); }, [r, c, t]); await page.waitForTimeout(400); };

  await page.evaluate(() => setSpeechLayout('one'));
  await sayAt(0, 0, '251かける68');
  check('  「式を入れる」は選んだセルだけ', await pair(0, 0), '=251*68||');

  await page.evaluate(() => setSpeechLayout('split'));
  await sayAt(2, 0, '251かける68');
  check('  「左に式・右に答え」', await pair(2, 0), '251×68|=251*68|17068');
  await sayAt(3, 0, '500わる4');
  check('  ÷も読みやすい形で入る', await pair(3, 0), '500÷4|=500/4|125');

  // 右は式なので、直せば答えも変わる
  await page.evaluate(() => { setCellVal(3, 1, '=500/2'); recalcAll(); });
  check('  右のセルは直せる（式のまま）', await page.evaluate(() => getCellDisplay(3, 1)), '250');

  // ↶戻る 1回で両方戻る
  await sayAt(5, 0, '3かける4');
  await page.evaluate(() => undoLast()); await page.waitForTimeout(500);
  check('  ↶戻る1回で両方戻る', await pair(5, 0), '||');

  // いちばん右の列で言ったら、列を1つ増やす
  const before = await page.evaluate(() => COLS);
  await page.evaluate(() => { sel(7, COLS - 1); window.__q = ['7かける8']; voiceStart(); });
  await page.waitForTimeout(400);
  check('  右が無いときは列を増やす', await page.evaluate(() => COLS), before + 1);
  check('  増やした列に答えが入る',
        await page.evaluate(() => getCellDisplay(7, COLS - 1)), '56');

  // キーボードのマイク（文字入力）でも同じ入れかたになる
  await page.evaluate(() => { setCellVal(9, 0, ''); setCellVal(9, 1, ''); sel(9, 0);
    const fi = document.getElementById('formulaInput'); fi.focus(); fi.value = '1200たす350';
    fi.dispatchEvent(new Event('input'));
    fi.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  await page.waitForTimeout(500);
  check('  文字入力でも左に式・右に答え', await pair(9, 0), '1200＋350|=1200+350|1550');
  await page.evaluate(() => setSpeechLayout('one'));

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

async function runDigit(browser) {
  const { CASES, BIG, TYPING, FORMULA } = require('./digit.test.js');
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 数字の桁の読み ──');

  const ev = cases => cases.map(([v]) => { const p = digitHintParts(v); return p ? p.kanji : ''; });
  const got = await page.evaluate(ev, CASES);
  CASES.forEach(([v, want], i) => check(`  ${v || '(空)'}`, got[i], want));
  const bigGot = await page.evaluate(ev, BIG);
  BIG.forEach(([v, want], i) => check(`  ${v}`, bigGot[i], want));

  // テンキーで打っている途中の見え方
  const typed = await page.evaluate(async keys => {
    const out = [];
    sel(0, 0);
    for (const k of keys) {
      document.querySelector(`[data-key="${k}"]`).click();
      await new Promise(r => setTimeout(r, 30));
      const el = document.getElementById('digitHint');
      out.push(el.hidden ? '' : el.textContent);
    }
    return out;
  }, TYPING.keys);
  TYPING.expect.forEach((want, i) => check(`  打っている途中 ${i + 1}桁目`, typed[i], want));

  // 数式のセルは計算結果の桁を出す
  const fv = await page.evaluate(f => {
    f.setup.forEach(([r, c, v]) => setCellVal(r, c, v));
    recalcAll(); sel(f.at[0], f.at[1]);
    const el = document.getElementById('digitHint');
    return el.hidden ? '' : el.textContent;
  }, FORMULA);
  check('  数式セルは計算結果の桁を出す', fv, FORMULA.want);

  // 設定で切れる／戻せる
  check('  設定で切ると出ない', await page.evaluate(() => {
    toggleDigitHint(); const el = document.getElementById('digitHint'); return el.hidden; }), true);
  check('  設定で戻すと出る', await page.evaluate(() => {
    toggleDigitHint(); const el = document.getElementById('digitHint'); return !el.hidden; }), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 設定のボタンの重複を減らした（v359） */
async function runSetDedup(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 設定の重複を減らす ──');

  check('  設定は3つのタブ', await page.evaluate(() =>
    [...document.querySelectorAll('.settings-tab')].map(b => b.textContent.trim()).join('/')),
    '📐 表/🎨 見た目/🧮 計算');
  check('  ページも3枚', await page.evaluate(() =>
    document.querySelectorAll('.set-page').length), 3);
  check('  ⋯と同じボタンは設定から消えた', await page.evaluate(() =>
    ['setPage3', 'darkBtn', 'sheetTabsBtn', 'defaultSizeBtn']
      .filter(i => document.getElementById(i)).join(',') || 'なし'), 'なし');
  check('  行・列の追加/削除のボタンも消えた', await page.evaluate(() =>
    document.querySelectorAll('#setPage0 .btn-ins, #setPage0 .btn-del').length), 0);

  // タブの記憶が「データ」のままでも落ちない
  await page.evaluate(() => localStorage.setItem('excalc_settings_tab', '3'));
  await page.reload(); await page.waitForTimeout(900);
  check('  前の「データ」タブを覚えていても開ける', await page.evaluate(() =>
    settingsTab + '/' + [...document.querySelectorAll('.set-page.open')].map(e => e.id).join(',')),
    '2/setPage2');
  check('  端をこえて選んでも収まる', await page.evaluate(() => {
    setSettingsTab(9); const a = settingsTab; setSettingsTab(-3); return a + '/' + settingsTab; }), '2/0');

  // 消した分は ⋯ にそろっている
  const more = () => page.evaluate(() =>
    [...document.querySelectorAll('#moreMenuOverlay .more-item')].map(b => b.textContent.trim()).join('/'));
  check('  書き出し・読み込みは⋯にそろっている', await page.evaluate(() =>
    ['PDF', 'CSV出力', 'Excel出力', '説明書', 'CSV読込', 'Excel読込']
      .every(t => [...document.querySelectorAll('#moreMenuOverlay .more-item')]
        .some(b => b.textContent.trim().includes(t)))), true);
  check('  読み込む欄も残っている', await page.evaluate(() =>
    ['importCSVInput', 'importXLSXInput'].every(i => document.getElementById(i))), true);

  // ナイトモードの今の状態は ⋯ のボタンに出る
  const darkBtn = () => page.evaluate(() => {
    const b = document.getElementById('darkMoreBtn');
    return b.textContent.trim() + '/' + b.classList.contains('on') + '/' + document.body.classList.contains('dark'); });
  check('  はじめは昼', await darkBtn(), '🌙ナイトモード/false/false');
  await page.evaluate(() => toggleDark());
  check('  押すと夜になって表示も変わる', await darkBtn(), '☀ライトに戻す/true/true');
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても夜のまま', await darkBtn(), '☀ライトに戻す/true/true');
  await page.evaluate(() => toggleDark());
  check('  もう一度押すと昼に戻る', await darkBtn(), '🌙ナイトモード/false/false');

  // シートのタブの印も ⋯ のボタンに出る
  await page.evaluate(() => toggleSheetTabs()); await page.waitForTimeout(200);
  check('  シートのタブの印が⋯に付く', await page.evaluate(() =>
    document.getElementById('sheetToggleBtn').classList.contains('on')), true);
  await page.evaluate(() => toggleSheetTabs()); await page.waitForTimeout(200);
  check('  もう一度押すと印が消える', await page.evaluate(() =>
    document.getElementById('sheetToggleBtn').classList.contains('on')), false);

  // 既定の大きさは⋯と上のバーに残っている
  check('  既定の大きさは⋯と上のバーにある', await page.evaluate(() =>
    ['defsizeTopBtn', 'tbDefsize'].every(i => document.getElementById(i))), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ひな形の単位表示と、単位の変換（v360） */
async function runTmplUnit(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── ひな形の単位 ──');

  const load = id => page.evaluate(x => applyCalcTemplate(x), id);
  const put = (r, v) => page.evaluate(a => setCellVal(a[0], 1, String(a[1])), [r, v]);
  const labels = () => page.evaluate(() => {
    const o = []; for (let r = 0; r < ROWS; r++) if (data[r][0]) o.push(data[r][0]); return o.join('/'); });
  const val = r => page.evaluate(x => parseFloat(document.getElementById('c' + x + '_1').textContent), r);
  const near = (a, b) => Math.abs(a - b) < Math.max(0.002, Math.abs(b) * 0.0005);

  // ── かたちのひな形に単位が付いた ──
  await load('rect'); await put(1, 2); await put(2, 3); await page.waitForTimeout(200);
  check('  長方形は m と ㎡ が付く', await labels(),
    '〔面積・周を求める／長さはm〕/縦(m)/横(m)/面積(㎡)/周の長さ(m)/坪/反(たん)/' +
    '〔面積から辺を逆算〕/面積(㎡)/片方の辺(m)/もう片方の辺(m)');
  check('  2m×3m は 6㎡', await val(3), 6);
  check('  6㎡ は 1.815坪', near(await val(5), 1.815), true);
  await put(8, 12); await put(9, 4); await page.waitForTimeout(200);
  check('  逆算もずれていない（12㎡÷4m＝3m）', await val(10), 3);

  await load('circle'); await put(2, 2); await page.waitForTimeout(200);
  check('  円は m と ㎡', await labels(),
    '〔半径か直径どちらかを入力／長さはm〕/半径(m)/直径(m)/面積(㎡)/円周(m)/' +
    '〔円周から逆算〕/円周(m)/半径(m)/直径(m)');
  check('  直径2mの円は 3.142㎡', near(await val(3), Math.PI), true);

  await load('cylinder'); await put(2, 2); await put(3, 1); await page.waitForTimeout(200);
  check('  円柱は ㎥ と L の両方', await labels(),
    '〔半径か直径どちらかを入力／長さはm〕/半径(m)/直径(m)/高さ(m)/体積(㎥)/体積(L)/表面積(㎡)(側面含む)');
  check('  直径2m高さ1mは 3.142㎥', near(await val(4), Math.PI), true);
  check('  それは 3141.6L', near(await val(5), Math.PI * 1000), true);

  await load('sphere'); await put(2, 2); await page.waitForTimeout(200);
  check('  球も ㎥ と L', near(await val(3), 4 / 3 * Math.PI), true);
  check('  球の表面積は ㎡', near(await val(5), 4 * Math.PI), true);

  await load('tri'); await put(1, 4); await put(2, 3); await page.waitForTimeout(200);
  check('  三角形は m と ㎡', await val(3), 6);
  await load('pytha'); await put(1, 3); await put(2, 4); await page.waitForTimeout(200);
  check('  三平方も m（3,4→5）', await val(3), 5);

  // ── 面積の単位（㎡⇄坪・反） ──
  await load('uarea'); await put(1, 1000); await put(10, 1); await put(14, 100);
  await page.waitForTimeout(250);
  check('  1000㎡ は 302.5坪', near(await val(2), 302.5), true);
  check('  1000㎡ は 605畳', near(await val(3), 605), true);
  check('  1000㎡ は 10.083畝', near(await val(4), 10.0833), true);
  check('  1000㎡ は 1.008反', near(await val(5), 1.00833), true);
  check('  1000㎡ は 0.101町', near(await val(6), 0.100833), true);
  check('  1000㎡ は 10アール', await val(7), 10);
  check('  1000㎡ は 0.1ヘクタール', await val(8), 0.1);
  check('  1反 は 991.736㎡', near(await val(11), 991.7355), true);
  check('  1反 は ちょうど300坪', near(await val(12), 300), true);
  check('  100坪 は 330.579㎡', near(await val(15), 330.5785), true);
  check('  100坪 は 0.333反', near(await val(16), 1 / 3), true);

  // ── 長さの単位（m⇄尺・間） ──
  await load('ulen'); await put(1, 1); await put(12, 1); await put(14, 1);
  await page.waitForTimeout(250);
  check('  1m は 100cm', await val(2), 100);
  check('  1m は 33寸', near(await val(4), 33), true);
  check('  1m は 3.3尺', near(await val(5), 3.3), true);
  check('  1m は 0.55間', near(await val(6), 0.55), true);
  check('  1m は 39.37インチ', near(await val(8), 39.3701), true);
  check('  1m は 3.281フィート', near(await val(9), 3.28084), true);
  check('  1尺 は 0.303m', near(await val(13), 10 / 33), true);
  check('  1間 は 1.818m', near(await val(15), 60 / 33), true);

  // ── 体積・重さの単位 ──
  await load('uvol'); await put(1, 1); await put(7, 10); await page.waitForTimeout(250);
  check('  1㎥ は 1000L', await val(2), 1000);
  check('  1㎥ は 554.354升', near(await val(3), 1000 / 1.8039), true);
  check('  1㎥ は 5.544石', near(await val(5), 1000 / 180.39), true);
  check('  10kg は 10000g', await val(8), 10000);
  check('  10kg は 2666.667匁', near(await val(10), 10000 / 3.75), true);
  check('  10kg は 2.667貫', near(await val(12), 10 / 3.75), true);
  check('  10kg は 22.046ポンド', near(await val(13), 10 / 0.45359237), true);

  // ── 目的から選ぶ画面に「単位」が出る ──
  await page.evaluate(() => openModeMenu()); await page.waitForTimeout(500);
  check('  用途の一覧に「単位」がある', await page.evaluate(() =>
    [...document.querySelectorAll('#tmplPickBody .tmpl-group-name')].map(e => e.textContent).join('/')),
    'くらし/おかね/からだ・くるま/かたち/単位/帳票');
  check('  単位のまとまりは4つ', await page.evaluate(() => {
    const g = [...document.querySelectorAll('#tmplPickBody .tmpl-group')]
      .find(x => x.querySelector('.tmpl-group-name').textContent === '単位');
    return [...g.querySelectorAll('.tmpl-name')].map(e => e.textContent).join('/'); }),
    '面積の単位（㎡⇄坪・反）/長さの単位（m⇄尺・間）/体積・重さの単位/温度換算（℃⇄℉）');
  check('  計算式のひな形は25種類', await page.evaluate(() => CALC_TEMPLATES.length), 25);
  check('  用途の一覧に全部出ている', await page.evaluate(() =>
    TMPL_GROUPS.reduce((n, g) => n + (g.calc || []).length + (g.fin || []).length, 0)),
    28);
  await page.evaluate(() => closeModeMenu()); await page.waitForTimeout(300);

  // ひな形だと見分けられる（ラベルを変えたので念のため）
  await load('uarea'); await page.waitForTimeout(250);
  check('  入れたあとひな形だと分かる', await page.evaluate(() =>
    (currentTemplate() || {}).id), 'uarea');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 育成日記と、苗から始められる野菜（v361） */
async function runVegDiary(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 育成日記 ──');
  await page.evaluate(() => openVeggie()); await page.waitForTimeout(300);

  // ── 苗から始められる野菜が増えた ──
  const nae = () => page.evaluate(() => {
    const keep = vegSel, out = [];
    for (const v of VEG_PLANS) { vegSel = v; if (vegCanNae()) out.push(v.n); }
    vegSel = keep; return out;
  });
  const list = await nae();
  check('  苗から始められるのは19種類', list.length, 19);
  check('  白菜が苗から始められる', list.includes('ハクサイ'), true);
  check('  v361で足したものが入っている',
    ['ハクサイ', 'オクラ', 'トウモロコシ', 'エダマメ', 'ミズナ', 'シュンギク', 'シソ'].every(n => list.includes(n)), true);
  check('  前からのものも残っている',
    ['トマト', 'キュウリ', 'ナス', 'ピーマン', 'キャベツ', 'ブロッコリー', 'レタス', 'タマネギ', 'ネギ'].every(n => list.includes(n)), true);
  check('  直まきの根菜は苗から始められない',
    ['ダイコン', 'ニンジン', 'カブ', 'ラディッシュ', 'ビーツ', 'ホウレンソウ', 'コマツナ', 'エンドウ', 'ソラマメ']
      .some(n => list.includes(n)), false);

  // 白菜を苗から数え直すと、定植の日が0日目になる
  check('  白菜は苗を植えてから収穫まで60〜90日', await page.evaluate(() => {
    vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ'); vegAs = 'nae';
    const r = vegRows().find(x => x.what === '収穫');
    const s = vegRows()[0];
    return s.what + '/' + s.d1 + '/' + r.d1 + '〜' + r.d2; }), '苗を植える/0/60〜90');
  check('  種からのときは種まきが0日目', await page.evaluate(() => {
    vegAs = 'seed';
    const r = vegRows().find(x => x.what === '収穫');
    return vegRows()[0].what + '/' + r.d1 + '〜' + r.d2; }), '種まき/80〜110');
  check('  足した段は日数の順に並んでいる', await page.evaluate(() =>
    VEG_PLANS.every(v => v.s.every((x, i) => i === 0 || x[1] >= v.s[i - 1][1]))), true);

  // ── 日記 ──
  const pid = await page.evaluate(() => {
    vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ');
    vegSowSerial = todaySerial() - 20; vegSetAs('nae'); vegPlotAdd();
    return vegPlots[0].id; });
  await page.evaluate(x => openVegDiary(x), pid); await page.waitForTimeout(350);
  check('  📓で日記が開く', await page.evaluate(() => isDlgOpen('vegDiaryOverlay')), true);
  check('  見出しに植えた日と何日目かが出る', await page.evaluate(() =>
    /苗を植えた/.test(document.getElementById('vegDiaryHead').textContent) &&
    /21日目/.test(document.getElementById('vegDiaryHead').textContent)), true);
  check('  はじめは空', await page.evaluate(() =>
    /まだありません/.test(document.getElementById('vegDiaryBody').textContent)), true);

  // 文だけ足す
  const answer = async (text) => {
    await page.waitForTimeout(200);
    await page.evaluate(t => { const el = document.querySelector('div[style*="99999"] textarea, div[style*="99999"] input');
      if (el) el.value = t; }, text);
    await page.evaluate(() => { const b = [...document.querySelectorAll('div[style*="99999"] button')]
      .find(x => x.textContent === 'OK'); if (b) b.click(); });
    await page.waitForTimeout(300);
  };
  await page.evaluate(() => { vegDiaryAddText(); });
  check('  本文は何行も書ける入れ物', await page.evaluate(() =>
    !!document.querySelector('div[style*="99999"] textarea')), true);
  await answer('本葉がそろった。\n虫はまだいない。');
  check('  1件入った', await page.evaluate(() => vegDiaryCount(vegPlots[0].id)), 1);
  check('  改行がそのまま出る', await page.evaluate(() =>
    document.querySelector('.vd-text').innerHTML.includes('<br>')), true);
  check('  日づけは今日・何日目も出る', await page.evaluate(() =>
    /21日目/.test(document.querySelector('.vd-when').textContent)), true);

  // 写真を足す（小さな画像を作って、縮める処理に通す）
  const shrunk = await page.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200;
    const c = cv.getContext('2d'); c.fillStyle = '#6ab04c'; c.fillRect(0, 0, 1600, 1200);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const p = await vegDiaryShrink(new File([blob], 'a.png', { type: 'image/png' }));
    const im = new Image(); im.src = p;
    await new Promise(r => { im.onload = r; im.onerror = r; });
    return { head: p.slice(0, 15), w: im.naturalWidth, h: im.naturalHeight };
  });
  check('  写真はJPEGにして小さくする', shrunk.head, 'data:image/jpeg');
  check('  長いほうは900pxまで', shrunk.w + 'x' + shrunk.h, '900x675');

  await page.evaluate(async () => {
    const id = vegPlots[0].id;
    vegDiary[id] = vegDiaryOf(id).concat([{ id: 'dz', d: todaySerial() - 10, t: '追肥した', p: 'data:image/jpeg;base64,x' }]);
    saveVegDiary(); vegDiaryRender(); });
  await page.waitForTimeout(250);
  check('  2件になった', await page.evaluate(() => vegDiaryCount(vegPlots[0].id)), 2);
  check('  新しい日づけが上', await page.evaluate(() =>
    [...document.querySelectorAll('.vd-when')].map(e => e.textContent.match(/(\d+)日目/)[1]).join(',')), '21,11');
  check('  写真がある行には画像が出る', await page.evaluate(() =>
    document.querySelectorAll('#vegDiaryBody .vd-img').length), 1);

  // 日づけを直す
  await page.evaluate(() => { vegDiaryWhen('dz'); });
  await answer('2020/1/2');
  check('  日づけを直せる', await page.evaluate(() => {
    const e = vegDiaryOf(vegPlots[0].id).find(x => x.id === 'dz');
    const o = serialToYMD(e.d); return o.y + '/' + o.m + '/' + o.d; }), '2020/1/2');
  check('  植える前は「植える◯日前」', await page.evaluate(() => {
    const pl = vegPlots[0]; return vegDiaryNth(pl, pl.s - 3); }), '植える3日前');

  // 文を直す・消す
  await page.evaluate(() => { vegDiaryEdit('dz'); });
  await answer('追肥した（化成8-8-8）');
  check('  文を直せる', await page.evaluate(() =>
    vegDiaryOf(vegPlots[0].id).find(x => x.id === 'dz').t), '追肥した（化成8-8-8）');
  await page.evaluate(() => vegDiaryDel('dz')); await page.waitForTimeout(250);
  check('  1件消せる', await page.evaluate(() => vegDiaryCount(vegPlots[0].id)), 1);

  // 覚えている
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても残っている', await page.evaluate(() => {
    loadVegPlots(); loadVegDiary(); return vegDiaryCount(vegPlots[0].id); }), 1);
  await page.evaluate(() => openVeggie()); await page.waitForTimeout(350);
  check('  一覧の📓に件数が付く', await page.evaluate(() => {
    const b = document.querySelector('#vegPlotBody .vd-badge'); return b ? b.textContent : 'なし'; }), '1');

  // 書き出し（写真つきなので1ページに押し込めない）
  await page.evaluate(() => openVegDiary(vegPlots[0].id)); await page.waitForTimeout(300);
  check('  日記の書き出しは縮めない', await page.evaluate(() => {
    const built = opBuild(vegDiaryHtml(), true);
    const w = built.box.style.width, z = built.box.style.zoom;
    if (built.meas) built.meas.remove();
    return w + '/' + (z || 'なし') + '/' + built.k; }), '718px/なし/1');
  check('  日記の中身が入っている', await page.evaluate(() => {
    const h = vegDiaryHtml();
    return /育成日記/.test(h) && /本葉がそろった/.test(h) && /日目/.test(h); }), true);

  // 野菜を消すと日記も消える
  await page.evaluate(() => { openVeggie(); vegPlotDel(vegPlots[0].id); }); await page.waitForTimeout(350);
  check('  野菜を消すと日記も消える', await page.evaluate(() =>
    JSON.stringify(vegDiary) + '/' + localStorage.getItem('excalc_veg_diary')), '{}/{}');


  // ── カレンダーから写真をつける・大きく見る（v362） ──
  await page.evaluate(() => { openVeggie();
    vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ');
    vegSowSerial = todaySerial() - 20; vegSetAs('nae'); vegRenderAll(); });
  await page.waitForTimeout(300);
  check('  登録前は案内が出る', await page.evaluate(() =>
    /登録すると/.test(document.getElementById('vegCalHint').textContent)), true);
  check('  登録前にタップしても開かない', await page.evaluate(() => {
    const t = serialToYMD(todaySerial()); vegCalTap(t.y, t.m, t.d);
    return isDlgOpen('vegDayOverlay'); }), false);

  await page.evaluate(() => { vegPlotAdd(); vegRenderAll(); }); await page.waitForTimeout(300);
  check('  登録すると案内が変わる', await page.evaluate(() =>
    /日をタップすると/.test(document.getElementById('vegCalHint').textContent)), true);
  check('  いまの計画にあたる登録が分かる', await page.evaluate(() =>
    (vegCurPlot() || {}).id === vegPlots[0].id), true);
  check('  日をずらすと当てはまらなくなる', await page.evaluate(() => {
    const keep = vegSowSerial; vegSowSerial = keep - 3;
    const r = vegCurPlot(); vegSowSerial = keep; return r; }), null);

  // その日の画面が開く
  await page.evaluate(() => { const t = serialToYMD(todaySerial()); vegCalTap(t.y, t.m, t.d); });
  await page.waitForTimeout(350);
  check('  日をタップするとその日の画面', await page.evaluate(() => isDlgOpen('vegDayOverlay')), true);
  check('  見出しに何日目と作業が出る', await page.evaluate(() => {
    const t = document.getElementById('vegDayHead').textContent;
    return /21日目/.test(t) && /今日/.test(t); }), true);
  check('  はじめは空', await page.evaluate(() =>
    /まだありません/.test(document.getElementById('vegDayBody').textContent)), true);

  // その日づけのまま入る
  await page.evaluate(() => { vegDiaryAddText(); });
  await answer('結球がはじまった');
  check('  その日づけで入る', await page.evaluate(() => {
    const e = vegDiaryOf(vegPlots[0].id)[0]; return e.d === todaySerial() && e.t === '結球がはじまった'; }), true);
  await page.evaluate(() => closeVegDay()); await page.waitForTimeout(350);

  // 5日前の日にも、その日づけのまま入る
  await page.evaluate(() => { const t = serialToYMD(todaySerial() - 5); vegCalTap(t.y, t.m, t.d); });
  await page.waitForTimeout(350);
  await page.evaluate(() => { vegDiaryAddText(); });
  await answer('追肥した');
  check('  5日前の日にはその日づけで入る', await page.evaluate(() =>
    vegDiaryOf(vegPlots[0].id).some(e => e.d === todaySerial() - 5 && e.t === '追肥した')), true);
  await page.evaluate(() => closeVegDay()); await page.waitForTimeout(350);

  // 写真をつけるとカレンダーのマス目が写真になる
  const cell = await page.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300;
    const x = cv.getContext('2d'); x.fillStyle = '#6ab04c'; x.fillRect(0, 0, 400, 300);
    const p = cv.toDataURL('image/jpeg', 0.8);
    const th = await vegDiaryThumb(p);
    const id = vegPlots[0].id;
    vegDiary[id] = vegDiaryOf(id).concat([{ id: 'ph1', d: todaySerial() - 2, t: '外葉', p, th }]);
    saveVegDiary(); vegRenderCal();
    const c = [...document.querySelectorAll('#vegGrid .dp-photo')];
    const cs = c.length ? getComputedStyle(c[0]) : null;
    return { n: c.length, inner: c.length ? c[0].innerHTML : '',
             day: String(serialToYMD(todaySerial() - 2).d),
             img: cs ? (cs.backgroundImage !== 'none') : false,
             border: cs ? cs.borderTopColor : '' };
  });
  check('  写真の日はマス目が写真になる', cell.n, 1);
  check('  日づけは小さくのり、書いた文も付く', cell.inner,
    `<span class="dp-n">${cell.day}</span><span class="dp-note">外葉</span>`);
  check('  写真がちゃんと入っている', cell.img, true);
  check('  作業の色は枠に残る', cell.border, 'rgb(239, 108, 0)');
  check('  見本は写真より小さい', await page.evaluate(() => {
    const e = vegDiaryOf(vegPlots[0].id).find(x => x.id === 'ph1');
    return e.th.length < e.p.length; }), true);
  check('  見本は150pxの正方形', await page.evaluate(async () => {
    const e = vegDiaryOf(vegPlots[0].id).find(x => x.id === 'ph1');
    const im = new Image(); im.src = e.th;
    await new Promise(r => { im.onload = r; im.onerror = r; });
    return im.naturalWidth + 'x' + im.naturalHeight; }), '150x150');

  // マス目をタップすると大きく見られる
  await page.evaluate(() => document.querySelector('#vegGrid .dp-photo').click());
  await page.waitForTimeout(350);
  check('  マス目をタップで大きく見られる', await page.evaluate(() =>
    isDlgOpen('vegDayOverlay') && document.querySelectorAll('#vegDayBody .vd-img').length === 1), true);
  check('  その日のぶんだけ出る', await page.evaluate(() =>
    document.querySelectorAll('#vegDayBody .vd-item').length), 1);
  check('  大きく出す決まりが付いている', await page.evaluate(() =>
    document.querySelector('#vegDayOverlay .modal-body').classList.contains('vd-big')), true);
  check('  日記ぜんぶへ移れる', await page.evaluate(() => {
    openVegDiaryFromDay();
    return isDlgOpen('vegDiaryOverlay') + '/' + isDlgOpen('vegDayOverlay'); }), 'true/false');
  check('  日記には3件ぜんぶ出る', await page.evaluate(() =>
    document.querySelectorAll('#vegDiaryBody .vd-item').length), 3);
  await page.evaluate(() => closeVegDiary()); await page.waitForTimeout(350);
  check('  書き出したカレンダーにも写真が出る', await page.evaluate(() =>
    (vegPdfHtml().match(/dp-photo/g) || []).length), 1);

  // 片づけ
  await page.evaluate(() => { openVeggie(); vegPlots.slice().forEach(p => vegPlotDel(p.id)); });
  await page.waitForTimeout(350);


  // ── 気候の設定は閉じられる／カレンダーは横フリックで月送り（v363） ──
  await page.evaluate(() => openVeggie()); await page.waitForTimeout(350);
  check('  気候の設定ははじめ閉じている', await page.evaluate(() =>
    document.getElementById('vegAreaAcc').open), false);
  check('  閉じていても見出しに今の設定が出る', await page.evaluate(() =>
    document.getElementById('vegAreaSum').textContent.replace(/\s+/g, '')), '🌡気候の設定関東・東海・近畿');
  check('  変えると見出しも変わる', await page.evaluate(() => {
    vegArea.id = 'hokkaido'; vegArea.alt = 300; vegArea.cold = true; saveVegArea(); vegRenderArea();
    return document.getElementById('vegAreaSum').textContent.replace(/\s+/g, ''); }),
    '🌡気候の設定北海道・標高300m・寒冷地');
  await page.evaluate(() => { vegArea = { id: 'kanto', alt: 0, cold: false, plot: 1 }; saveVegArea(); vegRenderAll(); });
  check('  開け閉めを覚える', await page.evaluate(async () => {
    const el = document.getElementById('vegAreaAcc');
    el.open = true; el.dispatchEvent(new Event('toggle'));
    const saved = localStorage.getItem('excalc_veg_areaacc');
    el.open = false; el.dispatchEvent(new Event('toggle'));
    return saved + '/' + localStorage.getItem('excalc_veg_areaacc'); }), '1/0');
  check('  開き直すと覚えた形で出る', await page.evaluate(() => {
    localStorage.setItem('excalc_veg_areaacc', '1'); applyVegAreaAcc();
    const a = document.getElementById('vegAreaAcc').open;
    localStorage.setItem('excalc_veg_areaacc', '0'); applyVegAreaAcc();
    return a + '/' + document.getElementById('vegAreaAcc').open; }), 'true/false');

  // カレンダーは「横フリックに別の意味がある」印が付いていて、道具の行き来は手を出さない
  check('  カレンダーに月送りの印が付く', await page.evaluate(() =>
    document.getElementById('vegCalBox').dataset.hswipe), '1');
  check('  日もカレンダーの中にある', await page.evaluate(() =>
    !!document.getElementById('vegCalBox').querySelector('#vegGrid')), true);

  // 指でのフリック（本物のタッチ）で月が変わる
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (sel, dx) => {
    const r = await page.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x + dx * i / 6, y: r.y }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(350);
  };
  await page.evaluate(() => {
    npTools = ['tansui', 'veggie', 'kantab']; saveNpTools(); applyNpToolFull(); renderNumpadPageBar();
    vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ'); vegSowSerial = todaySerial() - 20;
    vegSetAs('nae'); vegPlotAdd(); vegRenderAll();
    const g = document.getElementById('vegCalBox');
    document.querySelector('#veggieOverlay .modal-body').scrollTop = g.offsetTop - 150; });
  await page.waitForTimeout(400);
  const month = () => page.evaluate(() => document.getElementById('vegCalTitle').textContent);
  const m0 = await month();
  await swipe('#vegGrid', -140);
  const m1 = await month();
  check('  左へ払うと次の月', m1 !== m0, true);
  check('  月送りでは道具は変わらない', await page.evaluate(() => isDlgOpen('veggieOverlay')), true);
  await swipe('#vegGrid', 140);
  check('  右へ払うと前の月にもどる', await month(), m0);
  await swipe('.veg-cal-nav', -140);
  check('  上のバーの上でも月送り', (await month()) !== m0, true);
  await page.evaluate(() => vegCalHome()); await page.waitForTimeout(250);

  // フリックしたあとは、指を離した先の日が開かない
  await swipe('#vegGrid', -140);
  check('  月送りのあと日は開かない', await page.evaluate(() => isDlgOpen('vegDayOverlay')), false);
  await page.evaluate(() => vegCalHome()); await page.waitForTimeout(250);

  // カレンダー以外の本文は、今までどおり道具のあいだを移る
  await page.evaluate(() => { document.querySelector('#veggieOverlay .modal-body').scrollTop = 0; });
  await page.waitForTimeout(250);
  await swipe('#vegChips', -140);
  check('  本文を払うととなりの道具へ', await page.evaluate(() =>
    ['tansuiOverlay', 'veggieOverlay', 'kantabOverlay'].filter(isDlgOpen).join(',') || 'なし'), 'kantabOverlay');
  await page.evaluate(() => { const t = npToolDef('kantab'); if (t && t.close) t.close(); });
  await page.waitForTimeout(350);
  await page.evaluate(() => { npTools = []; saveNpTools(); applyNpToolFull(); });


  // ── 書いた文がカレンダーのマス目に出る（v364） ──
  await page.evaluate(() => { vegDiary = {}; saveVegDiary(); vegPlots = []; saveVegPlots();
    openVeggie();
    vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ'); vegSowSerial = todaySerial() - 20;
    vegSetAs('nae'); vegPlotAdd(); vegRenderAll();
    const t = serialToYMD(todaySerial()); vegCalY = t.y; vegCalM = t.m; vegRenderCal(); });
  await page.waitForTimeout(400);
  check('  はじめは文のマスは無い', await page.evaluate(() =>
    document.querySelectorAll('#vegGrid .dp-note').length), 0);

  // カレンダーの日をタップして文を書くと、その日のマスに出る
  await page.evaluate(() => { const t = serialToYMD(todaySerial()); vegCalTap(t.y, t.m, t.d); });
  await page.waitForTimeout(350);
  await page.evaluate(() => { vegDiaryAddText(); });
  await answer('結球がはじまった\n明日みてみる');
  await page.evaluate(() => closeVegDay()); await page.waitForTimeout(400);
  check('  書いた文がマスに出る', await page.evaluate(() => {
    const n = document.querySelectorAll('#vegGrid .dp-note');
    return n.length + '/' + (n[0] ? n[0].textContent : ''); }), '1/結球がはじまった');
  check('  日づけは小さく上にのる', await page.evaluate(() => {
    const c = document.querySelector('#vegGrid .dp-log');
    return c ? c.querySelector('.dp-n').textContent : 'マスなし'; }), String(new Date().getDate()));
  check('  マスの説明にも全部入る', await page.evaluate(() => {
    const c = document.querySelector('#vegGrid .dp-log');
    return !!c && /結球がはじまった/.test(c.title); }), true);
  check('  文がある月はマスを縦長にする', await page.evaluate(() =>
    document.getElementById('vegGrid').classList.contains('has-note')), true);

  // 1日に2件、長い文、写真と両方
  await page.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300;
    const x = cv.getContext('2d'); x.fillStyle = '#6ab04c'; x.fillRect(0, 0, 400, 300);
    const p = cv.toDataURL('image/jpeg', 0.8); const th = await vegDiaryThumb(p);
    const id = vegPlots[0].id;
    vegDiary[id] = vegDiaryOf(id).concat([
      { id: 'n1', d: todaySerial() - 3, t: '追肥した', p: '', th: '' },
      { id: 'n2', d: todaySerial() - 3, t: '土寄せもした', p: '', th: '' },
      { id: 'n3', d: todaySerial() - 5, t: 'とても長い文章をここに入れてみてマス目でどうなるかを確かめます', p: '', th: '' },
      { id: 'n4', d: todaySerial() - 7, t: 'アオムシを2匹とった', p, th }]);
    saveVegDiary(); vegRenderCal(); });
  await page.waitForTimeout(350);
  const noteOf = off => page.evaluate(o => {
    const d = String(serialToYMD(todaySerial() + o).d);
    const c = [...document.querySelectorAll('#vegGrid .dp-log')]
      .find(x => x.querySelector('.dp-n').textContent === d);
    return c && c.querySelector('.dp-note') ? c.querySelector('.dp-note').textContent : 'なし'; }, off);
  check('  1日に2件は「／」でつなぐ', await noteOf(-3), '追肥した／土寄せもした');
  check('  長い文は24字までにする', (await noteOf(-5)).length, 24);
  check('  1行目だけを出す', await noteOf(0), '結球がはじまった');
  check('  写真の日にも文をのせる', await page.evaluate(() => {
    const c = document.querySelector('#vegGrid .dp-photo');
    return (c.querySelector('.dp-note') ? c.querySelector('.dp-note').textContent : 'なし')
      + '/' + (getComputedStyle(c).backgroundImage !== 'none'); }), 'アオムシを2匹とった/true');
  check('  マスからはみ出さない', await page.evaluate(() =>
    [...document.querySelectorAll('#vegGrid .dp-cell')].every(c => c.scrollHeight <= c.clientHeight + 1)), true);
  check('  書き出したカレンダーにも文が出る', await page.evaluate(() =>
    (vegPdfHtml().match(/dp-note/g) || []).length), 4);

  // 文を消すとマスからも消える
  await page.evaluate(() => { vegDiaryId = vegPlots[0].id;
    ['n1', 'n2'].forEach(i => vegDiaryDel(i)); vegRenderCal(); });
  await page.waitForTimeout(300);
  check('  消すとマスからも消える', await noteOf(-3), 'なし');
  await page.evaluate(() => { openVeggie(); vegPlots.slice().forEach(p => vegPlotDel(p.id)); });
  await page.waitForTimeout(350);


  // ── 畑の広さを 縦×横 から出す（v365） ──
  await page.evaluate(() => { openVeggie(); vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ');
    vegArea = { id: 'kanto', alt: 0, cold: false, plot: 1, w: 0, d: 0 }; saveVegArea(); vegRenderAll(); });
  await page.waitForTimeout(350);
  const setWD = (w, d) => page.evaluate(a => {
    document.getElementById('vegPlotW').value = a[0];
    document.getElementById('vegPlotD').value = a[1]; vegPlotWDChange(); }, [w, d]);
  const eq = () => page.evaluate(() => document.querySelector('.veg-plot-eq').textContent.replace(/\s+/g, ''));
  const fert = () => page.evaluate(() =>
    [...document.querySelectorAll('#vegFertBody .veg-fval')].map(e => e.textContent).join(' '));

  check('  はじめは1㎡', await eq(), '＝1㎡（0.3坪）');
  await setWD(4, 3);
  check('  縦4m×横3mで12㎡', await eq(), '＝12㎡（3.6坪）');
  check('  広さも覚える', await page.evaluate(() => vegArea.plot + '/' + vegArea.w + '/' + vegArea.d), '12/4/3');
  check('  肥料の量が広さぶんになる', /12㎡で 1\.2〜1\.8kg/.test(await fert()), true);
  check('  ㎡の欄も同じ広さになる', await page.evaluate(() =>
    document.getElementById('vegPlot').value), '12');

  await setWD(20, 50);
  check('  1反ぐらいでも出る', await eq(), '＝1,000㎡（302.5坪）');
  check('  大きい量は kg に繰り上がる', /1,000㎡で 100〜150kg/.test(await fert()), true);
  check('  もっと大きいと t に繰り上がる', /1,000㎡で 2〜3t/.test(await fert()), true);

  check('  片方が空なら広さはそのまま', await (async () => { await setWD(4, ''); return eq(); })(),
    '＝1,000㎡（302.5坪）');
  check('  ㎡で直に入れると縦・横は消える', await page.evaluate(() => {
    document.getElementById('vegPlot').value = 200; vegPlotChange();
    return vegPlotSize() + '/' + vegArea.w + '/' + vegArea.d; }), '200/0/0');

  await setWD(6, 2.5);
  check('  小数の辺も使える', await eq(), '＝15㎡（4.5坪）');
  await page.reload(); await page.waitForTimeout(900);
  await page.evaluate(() => { openVeggie(); vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ'); vegRenderAll(); });
  await page.waitForTimeout(350);
  check('  開き直しても覚えている', await page.evaluate(() =>
    document.getElementById('vegPlotW').value + '×' + document.getElementById('vegPlotD').value), '6×2.5');
  check('  地域を変えても縦・横は残る', await page.evaluate(() => {
    document.getElementById('vegAreaSel').value = 'tohoku'; vegAreaChange();
    return vegArea.w + '/' + vegArea.d + '/' + vegPlotSize(); }), '6/2.5/15');
  check('  1辺は300mまで', await (async () => { await setWD(999, 1); return eq(); })(), '＝300㎡（90.8坪）');
  check('  広さは1haまで', await (async () => { await setWD(300, 300); return eq(); })(), '＝10,000㎡（3,025坪）');

  await setWD(4, 3);
  check('  書き出しにも広さが出る', await page.evaluate(() =>
    /畑 12㎡（3\.6坪）/.test(vegPdfHtml())), true);
  check('  表への書き出しにも縦×横が出る', await page.evaluate(() => {
    sel(0, 0); vegInsertToSheet();
    for (let r = 0; r < ROWS; r++) if (String(data[r][0]).indexOf('🧪') === 0) return data[r][0];
    return 'なし'; }), '🧪 肥料（葉菜（葉をとるもの）／土のpH 6.0〜6.5／畑の広さ 12㎡（3.6坪）　縦4m×横3m）');
  await page.evaluate(() => { vegArea = { id: 'kanto', alt: 0, cold: false, plot: 1, w: 0, d: 0 }; saveVegArea(); });


  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* はじめに開くページ（v366） */
async function runStartPage(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── はじめに開くページ ──');

  check('  はじめは前回のつづき', await page.evaluate(() =>
    startPage + '/' + document.getElementById('startPageSel').value), 'last/last');
  check('  表・電卓・道具から選べる', await page.evaluate(() =>
    startPageOptions().map(o => o[0]).join(',')),
    'last,normal,dentaku,tansui,kantab,veggie,volume,photomemo,linklist,touban,calctmpl,fintmpl');
  check('  別のタブで開くメモは出さない', await page.evaluate(() =>
    startPageOptions().some(o => o[0] === 'memo')), false);
  check('  設定の欄にも同じ数だけ並ぶ', await page.evaluate(() =>
    document.getElementById('startPageSel').options.length), 12);

  const opened = () => page.evaluate(() => {
    const ovs = ['tansuiOverlay', 'kantabOverlay', 'veggieOverlay', 'volumeOverlay',
                 'photoMemoOverlay', 'linkListOverlay'].filter(isDlgOpen);
    return (ovs.join(',') || 'なし') + '/' + (isDentaku() ? '電卓' : tableMode); });
  const pick = async v => { await page.evaluate(x => setStartPage(x), v);
    await page.reload(); await page.waitForTimeout(1200); };

  await pick('dentaku');
  check('  電卓を選ぶと電卓で開く', await opened(), 'なし/電卓');
  await pick('normal');
  check('  通常の表を選ぶと表で開く', await opened(), 'なし/normal');
  await pick('veggie');
  check('  野菜を選ぶと野菜が開く', await opened(), 'veggieOverlay/normal');
  check('  ✕で閉じれば下の表が使える', await page.evaluate(async () => {
    closeVeggie(); await new Promise(r => setTimeout(r, 300));
    return isDlgOpen('veggieOverlay') + '/' + tableMode; }), 'false/normal');
  await pick('tansui');
  check('  単位水量を選ぶと単位水量が開く', await opened(), 'tansuiOverlay/normal');
  await pick('photomemo');
  check('  写真メモを選ぶと写真メモが開く', await opened(), 'photoMemoOverlay/normal');
  await pick('last');
  check('  前回のつづきなら何も開かない', await opened(), 'なし/normal');

  // 覚える／おかしな値でも落ちない
  check('  選んだものを覚える', await page.evaluate(() => {
    setStartPage('kantab'); return localStorage.getItem('excalc_startpage'); }), 'kantab');
  check('  選び直すと欄の表示も合う', await page.evaluate(() =>
    document.getElementById('startPageSel').value), 'kantab');
  await page.evaluate(() => localStorage.setItem('excalc_startpage', 'なにこれ'));
  await page.reload(); await page.waitForTimeout(1200);
  check('  知らない値は前回のつづきに戻す', await page.evaluate(() => startPage), 'last');
  check('  そのとき何も開かない', await opened(), 'なし/normal');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 電卓の答えの桁と、はしたの数の処理（v367） */
async function runDtDec(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 電卓の答えの桁 ──');
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(350);

  check('  ▦表へは半分・桁が増えた・声はそのまま', await page.evaluate(() =>
    [...document.querySelectorAll('#numpadPageSci .btn.util')]
      .map(b => b.dataset.key + ':' + getComputedStyle(b).gridColumn).join(' ')),
    'dk_tosheet:span 1 dk_dec:span 1 dk_voice:span 2');
  check('  はじめは自動・四捨五入', await page.evaluate(() => dtDec + '/' + dtRound), '-1/round');
  check('  はじめは札を出さない', await page.evaluate(() =>
    document.getElementById('dtDecTag').hidden), true);
  check('  キーに今の桁が出る', await page.evaluate(() =>
    document.querySelector('[data-key="dk_dec"]').textContent), '桁 自');

  const set = (d, r) => page.evaluate(a => { setDtDec(a[0]); setDtRound(a[1]); }, [d, r]);
  const calc = async seq => { await page.evaluate(s => { dtAllClear();
      for (const t of s) { if (t === '=') eq(); else if (t.length === 1 && '+-*/'.indexOf(t) >= 0) op(t);
                           else if (t === '.') dot(); else num(t); } }, seq);
    await page.waitForTimeout(120);
    return page.evaluate(() => document.getElementById('dtMain').textContent); };

  // 10 ÷ 3
  await set(-1, 'round'); check('  自動は今までどおり', await calc(['1','0','/','3','=']), '3.3333333333');
  await set(2, 'round');  check('  2桁・四捨五入', await calc(['1','0','/','3','=']), '3.33');
  await set(2, 'up');     check('  2桁・切り上げ', await calc(['1','0','/','3','=']), '3.34');
  await set(2, 'down');   check('  2桁・切り下げ', await calc(['1','0','/','3','=']), '3.33');
  await set(0, 'round');  check('  0桁・四捨五入', await calc(['1','0','/','3','=']), '3');
  await set(0, 'up');     check('  0桁・切り上げ', await calc(['1','0','/','3','=']), '4');
  await set(0, 'down');   check('  0桁・切り下げ', await calc(['1','0','/','3','=']), '3');
  await set(2, 'round');  check('  桁を決めると0もそろえる', await calc(['6','/','2','=']), '3.00');

  // マイナスは0から遠い方・近い方
  await set(0, 'up');
  check('  −1.5は切り上げで−2', await page.evaluate(() => dtFmtNum(-1.5)), '-2');
  await set(0, 'down');
  check('  −1.5は切り下げで−1', await page.evaluate(() => dtFmtNum(-1.5)), '-1');

  // 途中の答えも決めた桁のまま続く（実務電卓と同じ）
  await set(2, 'down');
  check('  途中の答えも桁どおりに続く', await calc(['1','0','/','3','*','3','=']), '9.99');
  await set(-1, 'round');
  check('  自動なら途中で丸めない', await calc(['1','0','/','3','*','3','=']), '9.9999999999');

  // 表へ入れる値も同じ
  await set(2, 'down');
  await calc(['1','0','/','3','=']);
  await page.evaluate(() => { dtPrevSel = { r: 0, c: 0 }; dtToCell(); }); await page.waitForTimeout(350);
  check('  ▦表へで入る値も同じ', await page.evaluate(() =>
    getCellValue(0, 0) + '/' + getCellDisplay(0, 0)), '3.33/3.33');

  // 札・キー・覚える
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(300);
  check('  札に今の決まりが出る', await page.evaluate(() => {
    const t = document.getElementById('dtDecTag'); return t.hidden ? 'なし' : t.textContent; }),
    '小数2桁・切り下げ');
  check('  キーにも桁が出る', await page.evaluate(() =>
    document.querySelector('[data-key="dk_dec"]').textContent), '桁 2');
  await page.reload(); await page.waitForTimeout(1100);
  check('  開き直しても覚えている', await page.evaluate(() =>
    dtDec + '/' + dtRound + '/' + document.querySelector('[data-key="dk_dec"]').textContent), '2/down/桁 2');

  // 画面
  await page.evaluate(() => { switchMode('dentaku'); openDtDec(); }); await page.waitForTimeout(400);
  check('  桁のキーで画面が開く', await page.evaluate(() => isDlgOpen('dtDecOverlay')), true);
  check('  選んでいるものに印が付く', await page.evaluate(() =>
    document.querySelector('#dtDecSeg .enterdir-btn.on').dataset.v + '/' +
    document.querySelector('#dtRoundSeg .enterdir-btn.on').dataset.v), '2/down');
  check('  例が出る', await page.evaluate(() =>
    /3\.333333 → .*3\.33/.test(document.getElementById('dtDecEx').textContent)), true);
  await page.evaluate(() => closeDtDec()); await page.waitForTimeout(300);

  // 表のときは今までどおり丸めない
  await page.evaluate(() => { switchMode('normal'); sel(0, 0); dtAllClear(); });
  await page.waitForTimeout(300);
  check('  表の計算には効かない', await page.evaluate(() => {
    num('1'); num('0'); op('/'); num('3'); op('*'); return disp_val; }), '3.3333333333');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 単位水量：呼び出し中は直せない／重さと空気量の下に結果（v368） */
async function runTsxLock(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 単位水量の呼び出しと並び ──');

  await page.evaluate(() => {
    tsRegs = { mix: [{ no: '1', name: '21-5-40BB', C: 280, W1: 165, S: 800, G: 1000, P: 0, A1: 4.5 }],
               air: [{ no: '1', name: '1号機', V: 7060, m1: 5500 }] };
    tsRegsSave(); tsxVals = {}; tsxSaveVals(); openTansui(); });
  await page.waitForTimeout(450);

  const locked = () => page.evaluate(() => ['C', 'W1', 'S', 'G', 'P', 'A1', 'V', 'm1', 'm2', 'A2']
    .filter(k => { const e = document.getElementById('tsxIn_' + k); return e && e.readOnly; }).join(','));
  check('  呼び出す前はどれも直せる', await locked(), '');

  await page.evaluate(() => tsxInput('mixNo', '1')); await page.waitForTimeout(250);
  check('  配合を呼び出すと配合が鍵', await locked(), 'C,W1,S,G,P,A1');
  await page.evaluate(() => tsxInput('airNo', '1')); await page.waitForTimeout(250);
  check('  エアメータも呼び出すと鍵', await locked(), 'C,W1,S,G,P,A1,V,m1');
  check('  毎回はかる欄は鍵をかけない', await page.evaluate(() =>
    document.getElementById('tsxIn_m2').readOnly + '/' + document.getElementById('tsxIn_A2').readOnly),
    'false/false');
  check('  登録の値が入る', await page.evaluate(() => ['C', 'W1', 'S', 'G', 'A1', 'V', 'm1']
    .map(k => document.getElementById('tsxIn_' + k).value).join(',')), '280,165,800,1000,4.5,7060,5500');
  check('  鍵の印が付く', await page.evaluate(() =>
    document.querySelectorAll('#tsxMixRows .tsx-lock, #tsxAirRows .tsx-lock').length), 8);
  check('  どこで直すかの案内が出る', await page.evaluate(() => {
    const m = document.getElementById('tsxMixNote'), a = document.getElementById('tsxAirNote');
    return (!m.hidden && /配合の登録/.test(m.textContent)) + '/' + (!a.hidden && /エアメータの登録/.test(a.textContent)); }),
    'true/true');

  check('  呼び出し中は直そうとしても変わらない', await page.evaluate(() => {
    tsxInput('W1', '999'); tsxInput('V', '1'); return tsxVals.W1 + '/' + tsxVals.V; }), '165/7060');

  // 番号を消せばその場で入れられる
  await page.evaluate(() => tsxInput('mixNo', '')); await page.waitForTimeout(250);
  check('  番号を消すと配合の鍵が外れる', await locked(), 'V,m1');
  check('  外れたら直せる', await page.evaluate(() => { tsxInput('W1', '170'); return tsxVals.W1; }), '170');
  await page.evaluate(() => tsxInput('mixNo', '1')); await page.waitForTimeout(250);
  check('  呼び直すと登録の値に戻って鍵もかかる', await page.evaluate(() =>
    tsxVals.W1 + '/' + document.getElementById('tsxIn_W1').readOnly), '165/true');

  // 登録の画面では直せる
  check('  登録の画面の欄は直せる', await page.evaluate(async () => {
    openTsMixReg(); await new Promise(r => setTimeout(r, 300));
    const n = [...document.querySelectorAll('#tsMixOverlay input')].filter(i => !i.readOnly).length;
    closeTsMixReg(); return n > 0; }), true);
  await page.waitForTimeout(400);
  check('  登録を直すと呼び出し先にも届く', await page.evaluate(async () => {
    tsRegs.mix[0].W1 = 168; tsRegsSave(); tsxAfterReg();
    await new Promise(r => setTimeout(r, 200));
    return tsxVals.W1 + '/' + document.getElementById('tsxIn_W1').value; }), '168/168');

  // 並び：重さ・測定空気量のすぐ下に結果
  check('  重さと空気量の下に結果が出る', await page.evaluate(() => {
    const body = document.querySelector('#tansuiOverlay .modal-body');
    return [...body.children].map(e => {
      if (e.id === 'tsxTestRows') return '試験値';
      if (e.id === 'tsxAirRows') return 'エアメータ';
      if (e.id === 'tsxMixRows') return '配合';
      if (e.classList.contains('vol-result')) return '結果';
      if (e.classList.contains('kt-judge-row')) return '合否';
      return null; }).filter(Boolean).join('→'); }), '試験値→結果→合否→エアメータ→配合');
  check('  毎回はかるのは重さと空気量だけ', await page.evaluate(() =>
    [...document.querySelectorAll('#tsxTestRows .kt-in-lb')].map(e => e.textContent).join(',')),
    '容器+試料 m2,測定空気量 A2');
  check('  エアメータはV・m1', await page.evaluate(() =>
    [...document.querySelectorAll('#tsxAirRows .kt-in-lb')].map(e => e.textContent).join(',')),
    '容器の容積 V,容器質量 m1');

  // 2つ入れると結果が出る
  await page.evaluate(() => { tsRegs.mix[0].W1 = 165; tsRegsSave(); tsxAfterReg();
    tsxInput('m2', '21300'); tsxInput('A2', '4.6'); });
  await page.waitForTimeout(300);
  check('  2つ入れると結果が出る', await page.evaluate(() =>
    document.getElementById('tsxW').textContent + '/' + document.getElementById('tsxJudge').textContent),
    '173.6kg/m³/合格');
  check('  書き出しにも全部の欄が入る', await page.evaluate(() => {
    const h = tsxReportHtml();
    return ['容器+試料 m2', '測定空気量 A2', '容器の容積 V', '容器質量 m1'].every(k => h.indexOf(k) >= 0); }), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 声で分数・方程式（v369） */
async function runVoiceMath(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 声で分数・方程式 ──');

  const f = t => page.evaluate(x => String(speechToFormula(x)), t);
  const val = t => page.evaluate(x => { const g = speechToFormula(x);
    try { return g ? evalFormula(g) : null; } catch (_) { return null; } }, t);

  // ── 分数 ──
  check('  3分の2は 2/3', await f('3分の2'), '=(2/3)');
  check('  ひらがなでも読む', await f('3ぶんの2'), '=(2/3)');
  check('  漢数字でも読む', await f('三分の二'), '=(2/3)');
  check('  足し算もできる', await f('3分の2たす4分の1'), '=(2/3)+(1/4)');
  check('  答えは 0.9166…', Math.abs(await val('3分の2たす4分の1') - 11 / 12) < 1e-12, true);
  check('  帯分数も読む', await f('2と3分の1'), '=(2+1/3)');
  check('  帯分数の計算', await val('2と3分の1かける3'), 7);
  check('  かけ算・わり算もできる', await f('3分の2かける4分の3'), '=(2/3)*(3/4)');
  check('  「30分の作業」は式にしない', await f('30分の作業'), 'null');

  // 約分した分数に直す
  const fr = v => page.evaluate(x => String(fracText(x)), v);
  check('  11/12 に約分する', await fr(11 / 12), '11/12');
  check('  2/4 は 1/2 になる', await fr(0.5), '1/2');
  check('  1より大きいと帯分数も出す', await fr(7 / 4), '7/4（1と3/4）');
  check('  マイナスも出す', await fr(-2 / 3), '-2/3');
  check('  整数は分数にしない', await fr(7), 'null');
  check('  割り切れない数は分数にしない', await fr(Math.PI), 'null');
  check('  分数で言ったことを覚えている', await page.evaluate(() => {
    speechToFormula('3分の2'); const a = speechLastFrac;
    speechToFormula('2たす3'); return a + '/' + speechLastFrac; }), 'true/false');

  // ── 方程式 ──
  const eq = t => page.evaluate(x => { const e = speechToEquation(x);
    return e ? (eqReadable(e) + ' / ' + (e.none ? 'なし' : e.roots.join(','))) : 'null'; }, t);
  check('  1次方程式', await eq('2エックスたす3は7'), '2×X＋3 ＝ 7 / 2');
  check('  両辺にエックス', await eq('3エックスたす2はエックスたす8'), '3×X＋2 ＝ X＋8 / 3');
  check('  わり算のエックス', await eq('エックスわる4は5'), 'X÷4 ＝ 5 / 20');
  check('  分数とまぜてもよい', await eq('3分の2エックスは4'), '(2÷3)×X ＝ 4 / 6');
  check('  2次方程式は2つとも出す', await eq('エックスの2乗は9'), 'X^2 ＝ 9 / -3,3');
  check('  2次のふつうの形', await eq('エックス2乗ひく5エックスたす6は0'), 'X^2−5×X＋6 ＝ 0 / 2,3');
  check('  重なる解は1つ', await eq('エックスの2乗ひく2エックスたす1は0'), 'X^2−2×X＋1 ＝ 0 / 1');
  check('  実数の解が無いとき', await eq('エックスの2乗たす1は0'), 'X^2＋1 ＝ 0 / なし');
  check('  3次は受け取らない', await eq('エックスの3乗は8'), 'null');
  check('  エックスが消える式は受け取らない', await eq('エックスたす1はエックスたす1'), 'null');
  check('  ふつうの計算は方程式にしない', await eq('251かける68'), 'null');
  check('  エックスが無ければ方程式にしない', await eq('2たす3は5'), 'null');

  // うしろの問いかけを落とす
  for (const [t, want] of [['2エックスたす3は7エックスはいくつ', '2'], ['2エックスたす3は7、エックスは？', '2'],
                           ['2エックスたす3は7エックスを求めて', '2'], ['2エックスたす3は7エックスの値は', '2'],
                           ['2エックスたす3は7ですか', '2']]) {
    check('  うしろの問いかけを落とす（' + t.slice(9) + '）', (await eq(t)).split(' / ')[1], want);
  }
  check('  うしろのエックスは落とさない', await eq('3は2たすエックス'), '3 ＝ 2＋X / 1');

  // ── 電卓で受け取る ──
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(350);
  const say = async t => { await page.evaluate(x => { dtAllClear(); voiceAcceptDentaku(x); }, t);
    await page.waitForTimeout(150);
    return page.evaluate(() => document.getElementById('dtVoiceF').textContent
      + '｜' + document.getElementById('dtMain').textContent); };
  check('  分数は約分した形でも出す', await say('3分の2たす4分の1'),
    '(2÷3)＋(1÷4) ＝ 11/12　＝ 0.9166666667｜0.9166666667');
  check('  1次方程式を解く', await say('2エックスたす3は7'), '2×X＋3 ＝ 7 → x＝2｜2');
  check('  2次は2つとも出して小さい方を表示', await say('エックス2乗ひく5エックスたす6は0'),
    'X^2−5×X＋6 ＝ 0 → x＝2　x＝3｜2');
  check('  実数の解が無いときは知らせる', await say('エックスの2乗たす1は0'),
    'X^2＋1 ＝ 0 → 実数の解なし｜0');
  check('  ふつうの計算は今までどおり', await say('251かける68'), '251×68 ＝ 17068｜17068');
  check('  式にならないときは知らせる', await say('ねこ'), '計算の形になりませんでした｜0');
  check('  履歴にも残る', await page.evaluate(() => dtTape.map(x => x.e + '＝' + x.v).join(' / ')),
    '(2÷3)＋(1÷4)＝11/12　＝ 0.9166666667 / 2×X＋3 ＝ 7　x＝2 / X^2−5×X＋6 ＝ 0　x＝2、3 / 251×68＝17068');

  // 表モードでは方程式にしない（X列のセルと見分けが付かないため）
  await page.evaluate(() => switchMode('normal')); await page.waitForTimeout(300);
  check('  表では分数は使える', await f('3分の2たす4分の1'), '=(2/3)+(1/4)');
  check('  表では方程式の道は通らない', await page.evaluate(() =>
    typeof voiceAcceptDentaku === 'function' && !isDentaku()), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 声でふだんの言い方のまま計算（v370） */
async function runVoiceSay(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 声でふだんの言い方 ──');
  const r = t => page.evaluate(x => { const o = speechRecipe(x);
    return o ? (o.id + '|' + o.e + '|' + srNum(o.v, o.dp) + (o.u || '') + '|' + o.sub) : 'null'; }, t);
  const v = async t => (await r(t)).split('|')[2];
  const id = async t => (await r(t)).split('|')[0];

  // ── ご要望の15通り ──
  check('  基本計算は式のまま', await r('1250かける18'), 'null');
  check('  それを式にすると 22500', await page.evaluate(() => evalFormula(speechToFormula('1250かける18'))), 22500);
  check('  連続計算も式のまま', await page.evaluate(() => evalFormula(speechToFormula('500足す300引く120'))), 680);
  check('  割合', await v('5000円の18パーセント'), '900円');
  check('  値引き', await v('12800円を15パーセント引き'), '10,880円');
  check('  消費税', await v('5000円に消費税10パーセント'), '5,500円');
  check('  割り勘', await v('12800円を4人で割って'), '3,200円');
  check('  単価', await v('10個398円、1個いくら'), '39.8円');
  check('  くらべる', (await r('5個600円と8個880円、どっちが安い')).split('|')[3],
    '1個あたり 120円 と 110円 → 8個880円 のほうが安い（1個 10円 おとく）');
  check('  単位変換', await v('25キロをトンに'), '0.025t');
  check('  面積', await v('幅3.5メートル、長さ12メートル'), '42㎡');
  check('  時間', (await r('8時15分から17時30分、休憩1時間')).split('|')[3], '8時間15分（495分）');
  check('  燃費', await v('ガソリン170円、燃費18キロ、200キロ走る'), '1,889円');
  check('  ローン', await v('300万円、金利2.5パーセント、5年'), '53,242円/月');
  check('  増減率', await v('120から150は何パーセント増'), '25%');
  check('  逆算', await v('20パーセント増で600、元はいくら'), '500');

  // ── おまけの数 ──
  check('  消費税の額も出す', (await r('5000円に消費税10パーセント')).split('|')[3], '消費税 500円');
  check('  税率を言わなければ設定の税率', await v('5000円に消費税'), '5,500円');
  check('  税抜きの逆算もできる', await v('5000円の税抜'), '4,545.45円');
  check('  面積は坪とまわりも出す', (await r('幅3.5メートル、長さ12メートル')).split('|')[3],
    '12.71坪／まわり 31m');
  check('  燃費は使う量も出す', (await r('ガソリン170円、燃費18キロ、200キロ走る')).split('|')[3], '使う量 11.11L');
  check('  ローンは総返済と利息も出す', /総返済 3,194,525.09円／利息 194,525.09円（60回）/
    .test((await r('300万円、金利2.5パーセント、5年')).split('|')[3]), true);
  check('  割り勘は集める額も出す', (await r('1000円を3人で割って')).split('|')[3],
    '1人 334円ずつ集めると 2円 多い');

  // ── 「割」の言い方 ──
  check('  2割引き', await v('12800円を2割引き'), '10,240円');
  check('  2割5分引き', await v('12800円を2割5分引き'), '9,600円');
  check('  〜の2割', await v('5000円の2割'), '1,000円');
  check('  「3割る5」はわり算のまま', await r('3割る5'), 'null');
  check('  それは 0.6', await page.evaluate(() => evalFormula(speechToFormula('3割る5'))), 0.6);

  // ── 単位の表 ──
  check('  キロは行き先で決まる（重さ）', await v('25キロをグラムに'), '25,000g');
  check('  キロは行き先で決まる（長さ）', await v('5キロをメートルに'), '5,000m');
  check('  坪から㎡', await v('100坪を平米に'), '330.58㎡');
  check('  反から㎡', await v('1反を平米に'), '991.74㎡');
  check('  升からリットル', await v('1升をリットルに'), '1.8039L');
  check('  知らない単位は受け取らない', await r('25ぴょんをトンに'), 'null');

  // ── 電卓で受け取る ──
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(350);
  const say = async t => { await page.evaluate(x => { dtAllClear(); voiceAcceptDentaku(x); }, t);
    await page.waitForTimeout(140);
    return page.evaluate(() => document.getElementById('dtVoiceF').textContent
      + '｜' + document.getElementById('dtMain').textContent); };
  check('  電卓に答えが入る', await say('5000円の18パーセント'),
    '5,000円 の 18% ＝ 900円　／　残りの 82% は 4,100円｜900');
  check('  くらべるも受け取る', (await say('5個600円と8個880円、どっちが安い')).split('｜')[1], '110');
  check('  ふつうの計算は今までどおり', await say('1250かける18'), '1250×18 ＝ 22500｜22500');
  check('  方程式も今までどおり', (await say('2エックスたす3は7')).split('｜')[1], '2');
  check('  分数も今までどおり', (await say('3分の2たす4分の1')).split('｜')[1], '0.9166666667');
  check('  履歴にも残る', await page.evaluate(() => dtTape.length >= 5), true);

  // ── 現場でよく使う計算（v371） ──
  check('  体積・生コン量', await v('縦5メートル、横3メートル、厚さ15センチ'), '2.25㎥');
  check('  ロス込みと面積も出す', (await r('縦5メートル、横3メートル、厚さ15センチ')).split('|')[3],
    'ロス5%込みで 2.363㎥／面積 15㎡');
  check('  厚さがミリでもよい', await v('縦10メートル、横2メートル、厚さ100ミリ'), '2㎥');
  check('  幅と長さだけなら面積のまま', await id('幅3.5メートル、長さ12メートル'), 'area');

  check('  生コン車の台数', await v('12立米を4.5立米車で'), '3台');
  check('  最後の車の量も出す', (await r('12立米を4.5立米車で')).split('|')[3], '最後の車は 3㎥（満載 2台）');
  check('  水セメント比', await v('水175、セメント320の水セメント比'), '54.7%');
  check('  勾配', await v('10メートルで20センチ下がる勾配'), '2%');
  check('  勾配は1/◯と寸も出す', (await r('10メートルで20センチ下がる勾配')).split('|')[3],
    '1/50（0.2寸勾配）');
  check('  斜辺・法長', await v('底辺3メートル、高さ4メートルの斜辺'), '5m');
  check('  斜辺は勾配も出す', (await r('底辺3メートル、高さ4メートルの斜辺')).split('|')[3],
    '勾配 1:0.75（高さ1に対して底辺 0.75）');

  check('  希釈', await v('1000倍で20リットル'), '20mL');
  check('  希釈は水の量も出す', (await r('1000倍で20リットル')).split('|')[3], '薬 20mL＋水 19,980mL');
  check('  ㎡あたりの必要量', await v('100平米に1平米あたり3キロ'), '300kg');
  check('  リットルでも出せる', await v('200平米に1平米あたり0.25リットル'), '50L');
  check('  反あたりも使える', await v('3反に1反あたり10キロ'), '30kg');
  check('  ピッチの本数', await v('5メートルに200ミリピッチ'), '26本');
  check('  ピッチは余りも出す', (await r('5メートルに200ミリピッチ')).split('|')[3], '間隔 25／端の余り 0mm');
  check('  枚数', await v('10平米、1枚0.09平米'), '112枚');
  check('  枚数は予備も出す', (await r('10平米、1枚0.09平米')).split('|')[3],
    'ぴったりなら 111.11枚／5%の予備を入れて 118枚');

  check('  人工の手間賃', await v('3人で5日、1人1日18000円'), '270,000円');
  check('  のべ人工も出す', (await r('3人で5日、1人1日18000円')).split('|')[3], 'のべ 15人工（にんく）');
  check('  かかる日数', await v('100平米を1日30平米で'), '3.33日');
  check('  切り上げた日数も出す', (await r('100平米を1日30平米で')).split('|')[3], '4日かかります（3.33日ぶん）');
  check('  袋数', await v('セメント300キロ、25キロ袋で'), '12袋');
  check('  比重から重さ', await v('2.5立米、比重2.3'), '5.75t');
  check('  比重はkgも出す', (await r('2.5立米、比重2.3')).split('|')[3], '5,750kg');
  check('  ㎡単価', await v('60平米で900万円、1平米いくら'), '150,000円');
  check('  ㎡単価は坪単価も出す', (await r('60平米で900万円、1平米いくら')).split('|')[3], '1坪 495,867.77円');
  check('  坪単価から㎡単価', (await r('30坪で1500万円')).split('|')[3], '1㎡ 151,250円');
  check('  ロス込み', await v('100本、ロス5パーセント'), '105本');
  check('  温度（摂氏→華氏）', await v('25度を華氏に'), '77℉');
  check('  温度（華氏→摂氏）', await v('77度を摂氏に'), '25℃');

  // ── 値段×数・単位×数（v376） ──
  check('  180円を4個', await v('180円を4個'), '720円');
  check('  1個あたりも出す', (await r('180円を4個')).split('|')[3], '1個あたり 180円');
  check('  1個180円を4個', await v('1個180円を4個'), '720円');
  check('  180円が4本', await v('180円が4本'), '720円');
  check('  180円の4枚', await v('180円の4枚'), '720円');
  check('  180円×4個', await v('180円×4個'), '720円');
  check('  180円のもの4個', await v('180円のもの4個'), '720円');
  check('  4個で180円ずつ', await v('4個で180円ずつ'), '720円');
  check('  数えかたが無くても かける なら計算する', await v('180円かける4'), '720円');
  check('  180円×4', await v('180円×4'), '720円');
  check('  単価と数量', await v('単価180円、数量4'), '720円');
  check('  単価と個数', await v('単価180円で個数4'), '720円');
  check('  いろいろな数えかた', await page.evaluate(() =>
    ['1500円を3人', '1200円を2箱', '980円を12パック', '250円を6玉', '180円を4つ']
      .map(x => { const o = speechRecipe(x); return o ? srNum(o.v, o.dp) : 'null'; }).join('/')),
    '4,500/2,400/11,760/1,500/720');

  check('  3メートルを4本', await v('3メートルを4本'), '12m');
  check('  25キロを8袋', await v('25キロを8袋'), '200kg');
  check('  2.5立米を3台', await v('2.5立米を3台'), '7.5㎥');
  check('  1平米1200円を60平米', await v('1平米1200円を60平米'), '72,000円');

  // 前からの言い方を取らないこと
  check('  割り勘は今までどおり', await id('12800円を4人で割って'), 'split');
  check('  単価は今までどおり', await id('10個398円、1個いくら'), 'unitprice');
  check('  くらべるは今までどおり', await id('5個600円と8個880円、どっちが安い'), 'compare');
  check('  ㎡単価は今までどおり', await id('60平米で900万円、1平米いくら'), 'sqmprice');
  check('  パーセント引きは今までどおり', await id('12800円を15パーセント引き'), 'offon');
  check('  〜の何パーセントは今までどおり', await id('5000円の18パーセント'), 'pctof');
  check('  生コン車は今までどおり', await id('12立米を4.5立米車で'), 'mixer');
  check('  比重は今までどおり', await id('2.5立米、比重2.3'), 'density');
  check('  袋数は今までどおり', await id('セメント300キロ、25キロ袋で'), 'bags');
  check('  立米もふつうの単位変換に使える', await v('1立米をリットルに'), '1,000L');

  // ── 時間と重さの計算（v377） ──
  check('  時間の足し算', (await r('2時間30分たす1時間45分')).split('|')[3], '4時間15分（255分）');
  check('  「と」でも足せる', (await r('1時間30分と45分')).split('|')[3], '2時間15分（135分）');
  check('  時間の引き算', (await r('8時間ひく1時間30分')).split('|')[3], '6時間30分（390分）');
  check('  「から〜ひく」でも引ける', (await r('8時間から1時間30分ひく')).split('|')[3], '6時間30分（390分）');
  check('  時間×数', (await r('2時間30分を3日')).split('|')[3], '7時間30分（450分）');
  check('  「かける」でも同じ', (await r('1時間45分かける4')).split('|')[3], '7時間（420分）');
  check('  時間→分', await v('2時間30分は何分'), '150分');
  check('  分→時間', (await r('90分は何時間')).split('|')[3], '1時間30分（90分）');
  check('  時給×働いた時間', await v('時給1200円で7時間30分'), '9,000円');
  check('  時給は読点でもよい', await v('時給1500円、8時間'), '12,000円');
  check('  ◯時の◯時間後', (await r('8時15分の8時間後')).split('|')[3], '16時15分');
  check('  ◯時の◯分前', (await r('17時の45分前')).split('|')[3], '16時15分');
  check('  日をまたぐと知らせる', (await r('23時30分の2時間後')).split('|')[3], '1時30分（次の日）');

  check('  重さの足し算（単位がまざってもよい）', await v('25キロたす500グラム'), '25.5kg');
  check('  長さの足し算', await v('3メートルたす50センチ'), '3.5m');
  check('  重さの引き算', await v('25キロひく500グラム'), '24.5kg');
  check('  分けるとひとつ分が出る', await v('200キロを8袋に分ける'), '25kg');
  check('  1キロいくらで何キロ', await v('1キロ380円で2.5キロ'), '950円');
  check('  1平米いくらで何平米', await v('1平米1200円で60平米'), '72,000円');

  // 分数とまぎれないこと
  check('  分数は今までどおり式になる', await page.evaluate(() =>
    ['3分の2たす4分の1', '2と3分の1', '3分の2'].map(x =>
      speechRecipe(x) ? 'レシピ' : (speechToFormula(x) || 'null')).join('/')),
    '=(2/3)+(1/4)/=(2+1/3)/=(2/3)');
  check('  「15分の8時間後」は分数あつかいしない', await id('8時15分の8時間後'), 'timeshift');
  check('  休憩つきの時間は今までどおり', await id('8時15分から17時30分、休憩1時間'), 'time');
  check('  1日◯平米は今までどおり', await id('100平米を1日30平米で'), 'days');
  check('  人工は今までどおり', await id('3人で5日、1人1日18000円'), 'ninku');
  check('  袋数は今までどおり', await id('セメント300キロ、25キロ袋で'), 'bags');
  check('  単位変換は今までどおり', await id('25キロをトンに'), 'unit');
  check('  ㎡あたりは今までどおり', await id('100平米に1平米あたり3キロ'), 'perarea');

  // ── 面積・体積の言い方（v378） ──
  check('  円柱・タンク', await v('直径2メートル、高さ3メートルの円柱'), '9.425㎥');
  check('  円柱はリットルと底の面積も', (await r('直径2メートル、高さ3メートルの円柱')).split('|')[3],
    '9,425L／そこの面積 3.142㎡');
  check('  ますや深さでも同じ', await v('直径1.2メートル、深さ2メートルのます'), '2.262㎥');
  check('  円の面積', await v('直径3メートルの円の面積'), '7.069㎡');
  check('  半径でも言える', await v('半径1.5メートルの円'), '7.069㎡');
  check('  円周は面積と取りちがえない', await id('直径3メートルの円周'), 'circum');
  check('  円周の長さ', await v('直径3メートルの円周'), '9.425m');
  check('  「まわり」でも同じ', await id('直径3メートルのまわり'), 'circum');
  check('  三角形', await v('底辺4メートル、高さ3メートルの三角形'), '6㎡');
  check('  台形（水路・法面の断面）', await v('上辺3メートル、下辺5メートル、高さ2メートルの台形'), '8㎡');
  check('  台形は1mあたりの体積も', (await r('上辺3メートル、下辺5メートル、高さ2メートルの台形')).split('|')[3],
    '1mあたりの体積 8㎥／2.42坪');
  check('  面積×厚さ', await v('20平米に厚さ10センチ'), '2㎥');
  check('  ロス込みとLも出す', (await r('20平米に厚さ10センチ')).split('|')[3],
    'ロス5%込みで 2.1㎥／2,000L');
  check('  坪でも言える', await v('30坪に厚さ15センチ'), '14.876㎥');
  check('  ほぐし率', await v('50立米をほぐし率1.2で'), '60㎥');
  check('  ほぐしたら何台ぶんかも', (await r('50立米をほぐし率1.2で')).split('|')[3],
    'ふえる分 10㎥／4t車(約3㎥)で 20台');
  check('  「は何坪」で聞ける', await v('1000平米は何坪'), '302.5坪');
  check('  「は何リットル」でも', await v('2.5立米は何リットル'), '2,500L');
  check('  「は何平米」でも', await v('1反は何平米'), '991.74㎡');
  check('  面積どうしの足し算', await v('10平米たす5平米'), '15㎡');

  // 前からの言い方を取らないこと
  check('  幅と長さだけは今までどおり面積', await id('幅3.5メートル、長さ12メートル'), 'area');
  check('  3つの長さは今までどおり体積', await id('縦5メートル、横3メートル、厚さ15センチ'), 'volume');
  check('  斜辺は今までどおり', await id('底辺3メートル、高さ4メートルの斜辺'), 'hyp');
  check('  生コン車は今までどおり', await id('12立米を4.5立米車で'), 'mixer');
  check('  比重は今までどおり', await id('2.5立米、比重2.3'), 'density');
  check('  「を〜に」の単位変換も今までどおり', await id('25キロをトンに'), 'unit');
  check('  1枚あたりの枚数は今までどおり', await id('10平米、1枚0.09平米'), 'sheets');

  // ── 📖 言い方の早見表と「もしかして」（v372） ──
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(300);
  check('  早見表は言い方ぜんぶを出す', await page.evaluate(() => sayList().length),
    await page.evaluate(() => SPEECH_RECIPES.filter(x => x.ex).length + SAY_EXTRA.length));
  check('  どのお手本も自分の言い方に当たる', await page.evaluate(() =>
    SPEECH_RECIPES.filter(x => x.ex).every(x => { const o = speechRecipe(x.ex); return o && o.id === x.id; })), true);
  await page.evaluate(() => openSayHelp()); await page.waitForTimeout(350);
  check('  📖言い方で開く', await page.evaluate(() => isDlgOpen('sayHelpOverlay')), true);
  check('  まとまりごとに並ぶ', await page.evaluate(() =>
    [...document.querySelectorAll('#sayHelpBody .say-g')].length), 9);   // v424 で「いろいろな言い方」を足した
  check('  どの行にも答えが出る', await page.evaluate(() =>
    [...document.querySelectorAll('#sayHelpBody .say-row')].filter(r => !r.querySelector('.say-ans')).length), 0);
  check('  さがすでしぼれる', await page.evaluate(() => { sayHelpFind('立米');
    return [...document.querySelectorAll('#sayHelpBody .say-ex')].map(e => e.textContent).join('/'); }),
    '「12立米を4.5立米車で」/「2.5立米、比重2.3」/「50立米をほぐし率1.2で」');
  check('  見つからないときは知らせる', await page.evaluate(() => { sayHelpFind('ねこねこ');
    return /見つかりません/.test(document.getElementById('sayHelpBody').textContent); }), true);
  await page.evaluate(() => sayHelpFind(''));
  check('  行を押すとその場で計算される', await page.evaluate(async () => {
    [...document.querySelectorAll('#sayHelpBody .say-row')].find(r => /5000円の18/.test(r.textContent)).click();
    await new Promise(z => setTimeout(z, 300));
    return isDlgOpen('sayHelpOverlay') + '/' + document.getElementById('dtMain').textContent; }), 'false/900');
  await page.waitForTimeout(250);

  // 数が足りないときは、見本を「言い方」として見せるだけ（押せない）。v390
  // 押せてしまうと、言っていない数（見本の燃費18）で計算した答えが出てしまうため。
  check('  数が足りないときは言い方を見せる', await page.evaluate(() => {
    dtAllClear(); voiceAcceptDentaku('ガソリン代170円で200キロ');
    return document.getElementById('dtVoiceF').textContent; }),
    'こう言うと計算できます：「ガソリン170円、燃費18キロ、200キロ走る」');
  check('  そのときは押せないままにする', await page.evaluate(() =>
    document.getElementById('dtVoice').classList.contains('dt-voice-guess')), false);
  check('  押しても見本の数で計算しない', await page.evaluate(async () => {
    const before = document.getElementById('dtMain').textContent;
    document.getElementById('dtVoice').click();
    await new Promise(z => setTimeout(z, 250));
    return document.getElementById('dtMain').textContent === before; }), true);
  // 言った数がそのまま当てはまるときは、これまでどおり押して試せる
  check('  数がそろえば押して試せる', await page.evaluate(() => {
    dtAllClear(); voiceAcceptDentaku('1000ばいで20リットル');
    return document.getElementById('dtVoiceF').textContent + '/' +
      document.getElementById('dtVoice').classList.contains('dt-voice-guess'); }),
    'もしかして「1000倍で20リットル」？/true');
  check('  押すと自分の数で計算される', await page.evaluate(async () => {
    document.getElementById('dtVoice').click();
    await new Promise(z => setTimeout(z, 250));
    return document.getElementById('dtMain').textContent; }), '20');
  // 聞き取りが大文字で返ってきても計算できる（v390）
  for (const [say, want] of [['1000倍で20 L', 20], ['100倍で4 L', 40], ['200倍で4 L', 20],
                             ['50倍で4 L', 80], ['1000倍で20リットル', 20]])
    check('  「' + say + '」が計算できる', await page.evaluate(x => {
      const r = speechRecipe(x); return r ? r.v : null; }, say), want);
  check('  大文字でも小文字でも同じ答え', await page.evaluate(() =>
    [speechRecipe('100倍で4L').v, speechRecipe('100倍で4l').v,
     speechRecipe('100倍で4リットル').v].join('/')), '40/40/40');
  check('  もしかしては自分の数で出す', await page.evaluate(() => {
    const g = speechGuess('100倍で4エル'); return g ? g.fit : null; }), '100倍で4リットル');
  check('  数が合わなければ押せる形にしない', await page.evaluate(() => {
    const g = speechGuess('ガソリン代170円で200キロ');
    return g ? String(g.fit) + '/' + !!g.ex : null; }), 'null/true');

  check('  近いものが無ければすすめない', await page.evaluate(() => {
    dtAllClear(); voiceAcceptDentaku('ねこ');
    return document.getElementById('dtVoiceF').textContent + '/' +
      document.getElementById('dtVoice').classList.contains('dt-voice-guess'); }),
    '計算の形になりませんでした/false');
  check('  ちゃんと通る言い方はすすめない', await page.evaluate(() => {
    dtAllClear(); voiceAcceptDentaku('12800円を4人でわけたい');
    return document.getElementById('dtVoice').classList.contains('dt-voice-guess'); }), false);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 📦 端末の空き具合と片づけ（v373） */
async function runStorage(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 端末の空き具合 ──');
  const ok = async () => { await page.waitForTimeout(250);
    await page.evaluate(() => { const b = [...document.querySelectorAll('div[style*="99999"] button')]
      .find(x => x.textContent === 'OK'); if (b) b.click(); });
    await page.waitForTimeout(350); };

  // 写真つきの日記を2件分つくる
  await page.evaluate(async () => {
    openVeggie();
    vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ'); vegSowSerial = todaySerial() - 20; vegSetAs('nae'); vegPlotAdd();
    vegSel = VEG_PLANS.find(v => v.n === 'トマト'); vegSowSerial = todaySerial() - 40; vegSetAs('nae'); vegPlotAdd();
    const mk = async () => { const cv = document.createElement('canvas'); cv.width = 600; cv.height = 450;
      const x = cv.getContext('2d'); x.fillStyle = '#6ab04c'; x.fillRect(0, 0, 600, 450);
      for (let i = 0; i < 200; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * .3 + ')';
        x.fillRect(Math.random() * 600, Math.random() * 450, 8, 8); }
      const p = cv.toDataURL('image/jpeg', .72); return { p, th: await vegDiaryThumb(p) }; };
    for (const pl of vegPlots) { const arr = [];
      for (let i = 0; i < 3; i++) { const q = await mk();
        arr.push({ id: 'x' + pl.id + i, d: todaySerial() - i * 3, t: 'ようす' + i, p: q.p, th: q.th }); }
      vegDiary[pl.id] = arr; }
    saveVegDiary(); closeVeggie(); });
  await page.waitForTimeout(600);

  check('  大きさの言い方', await page.evaluate(() =>
    [stFmt(500), stFmt(2048), stFmt(3 * 1024 * 1024)].join('/')), '500B/2KB/3MB');
  check('  1文字2バイトで数える', await page.evaluate(() => {
    localStorage.setItem('excalc_zz_test', 'abcde');
    const b = stSize('excalc_zz_test'); localStorage.removeItem('excalc_zz_test');
    return b; }), ('excalc_zz_test'.length + 5) * 2);

  await page.evaluate(() => openStorage()); await page.waitForTimeout(400);
  check('  📦空き具合が開く', await page.evaluate(() => isDlgOpen('storageOverlay')), true);
  check('  日記がいちばん大きい', await page.evaluate(() =>
    document.querySelector('#storageBody .st-n').textContent.trim()), '育成日記（写真）');
  check('  大きい順に並ぶ', await page.evaluate(() => {
    const r = stScan().rows; return r.every((x, i) => i === 0 || r[i - 1].b >= x.b); }), true);
  check('  合計と割合が出る', await page.evaluate(() =>
    /ぜんぶで .+（目安の上限 5MB の .+%）/.test(document.querySelector('.st-total-t').textContent)), true);
  check('  知らないキーは「設定など」にまとめる', await page.evaluate(() =>
    stScan().rows.some(r => r.n === '設定など（細かいもの）')), true);
  check('  片づけのボタンが付く', await page.evaluate(() =>
    !!document.querySelector('#storageBody .veg-mini')), true);

  // 日記の片づけ
  await page.evaluate(() => stOpenDiary()); await page.waitForTimeout(400);
  check('  野菜ごとに出る', await page.evaluate(() =>
    document.querySelectorAll('#stDiaryBody .st-row').length), 2);
  check('  件数と写真の数が出る', await page.evaluate(() =>
    /3件（写真 3枚）/.test(document.querySelector('#stDiaryBody .st-sub').textContent)), true);
  const before = await page.evaluate(() => stSize('excalc_veg_diary'));
  await page.evaluate(() => { stDropPics(Object.keys(vegDiary)[0]); });
  await ok();
  const after = await page.evaluate(() => stSize('excalc_veg_diary'));
  check('  写真だけ消すと軽くなる', after < before * 0.7, true);
  check('  書いた文は残る', await page.evaluate(() => { const a = vegDiaryOf(Object.keys(vegDiary)[0]);
    return a.length + '/' + a.filter(e => e.p).length + '/' + a.filter(e => e.t).length; }), '3/0/3');
  check('  開き直しても消えたまま', await page.evaluate(() => {
    loadVegDiary(); return vegDiaryOf(Object.keys(vegDiary)[0]).filter(e => e.p).length; }), 0);
  await page.evaluate(() => closeStDiary()); await page.waitForTimeout(400);

  // 個別に消す
  await page.evaluate(() => { localStorage.setItem('excalc_calc_tape',
    JSON.stringify(Array(50).fill({ e: '1+1', v: '2' }))); renderStorage(); });
  await page.waitForTimeout(200);
  check('  電卓の履歴も出る', await page.evaluate(() =>
    /電卓の履歴/.test(document.getElementById('storageBody').textContent)), true);
  await page.evaluate(() => { stClear('excalc_calc_tape', '電卓の履歴'); });
  await ok();
  check('  🧹で消せる', await page.evaluate(() =>
    localStorage.getItem('excalc_calc_tape') + '/' +
    /電卓の履歴/.test(document.getElementById('storageBody').textContent)), 'null/false');

  // 空いているとき・混んできたとき・いっぱいのときの見せ方
  check('  空いていれば緑', await page.evaluate(() =>
    !!document.querySelector('.st-bar .st-ok')), true);
  check('  混み具合の色の決め方', await page.evaluate(() =>
    [0, 59.9, 60, 84.9, 85, 100].map(stLevel).join('/')),
    'st-ok/st-ok/st-warn/st-warn/st-ng/st-ng');
  check('  ほんとうに入れると色が変わる', await page.evaluate(() => {
    let r = '—';
    try {
      localStorage.setItem('excalc_zz_big', 'x'.repeat(1800 * 1024));   // 約3.6MB（1文字2バイト）
      renderStorage();
      r = document.querySelector('.st-bar span').className;
    } catch (_) { r = '入れられなかった'; }
    try { localStorage.removeItem('excalc_zz_big'); } catch (_) {}
    renderStorage();
    return r; }), 'st-warn');
  check('  いっぱいなら注意を出す', await page.evaluate(() => {
    // 上限に対する割合だけを見るので、見せ方は stLevel と合わせて確かめる
    return stLevel(90) === 'st-ng'; }), true);
  check('  片づけたら緑に戻る', await page.evaluate(() =>
    !!document.querySelector('.st-bar .st-ok')), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 記録を1件だけ書き出す／日記の写真も持っていく（v374） */
async function runExport(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  page.on('dialog', d => d.accept());
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── 書き出し ──');
  const ans = async w => { await page.waitForTimeout(250);
    await page.evaluate(x => { const b = [...document.querySelectorAll('div[style*="99999"] button')]
      .find(y => y.textContent.indexOf(x) >= 0); if (b) b.click(); }); 
    await page.waitForTimeout(400); };
  const ansBtn = async w => { await page.waitForTimeout(250);
    await page.evaluate(x => { const b = [...document.querySelectorAll('div[style*="99999"] button')]
      .find(y => y.textContent.indexOf(x) >= 0); if (b) b.click(); }, w);
    await page.waitForTimeout(400); };
  const grab = async fn => { const d = page.waitForEvent('download', { timeout: 9000 }).catch(() => null);
    await page.evaluate(fn); return d; };

  await page.evaluate(async () => {
    setCellVal(0, 0, '項目'); setCellVal(0, 1, '金額');
    setCellVal(1, 0, 'あ,い'); setCellVal(1, 1, '100');
    setCellVal(2, 0, '合計'); setCellVal(2, 1, '=SUM(B2:B2)');
    const saves = getSaves();
    saves.unshift({ id: 111, name: '見積もり', timestamp: Date.now(), rows: 3, cols: 2, decPlaces: -1,
      mode: 'normal', data: data.map(r => [...r]), styles: { ...cellStyles }, tab: 0,
      modeSheets: makeAllModesSnap(), curMode: 'normal' });
    persistSaves(saves);
    openVeggie(); vegSel = VEG_PLANS.find(v => v.n === 'ハクサイ');
    vegSowSerial = todaySerial() - 20; vegSetAs('nae'); vegPlotAdd();
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300;
    const x = cv.getContext('2d'); x.fillStyle = '#6ab04c'; x.fillRect(0, 0, 400, 300);
    const p = cv.toDataURL('image/jpeg', .72); const th = await vegDiaryThumb(p);
    vegDiary[vegPlots[0].id] = [{ id: 'a', d: todaySerial(), t: 'ようす', p, th }];
    saveVegDiary(); closeVeggie(); });
  await page.waitForTimeout(500);

  // ── 1件だけ書き出す ──
  check('  ⋯に書き出しがある', await page.evaluate(() => {
    showSaveFileMenu(111, document.body);
    const t = document.getElementById('saveFileMenu').textContent;
    hideSaveFileMenu(); return /⬇ 書き出し/.test(t); }), true);
  await page.evaluate(() => openSaveExp(111)); await page.waitForTimeout(350);
  check('  4つから選べる', await page.evaluate(() =>
    document.querySelectorAll('#saveExpOverlay .set-act').length), 4);
  check('  記録の名前が出る', await page.evaluate(() =>
    document.getElementById('saveExpTitle').textContent), '⬇ 「見積もり」を書き出す');

  const d1 = await grab(() => saveExpJson());
  await page.waitForTimeout(350);          // 閉じたあとの「戻る」が済むのを待つ
  check('  1件だけJSONに出せる', !!d1, true);
  if (d1) { const f = '/tmp/claude-0/one-test.json'; await d1.saveAs(f);
    const j = JSON.parse(require('fs').readFileSync(f, 'utf8'));
    check('  その1件だけが入る', j.saves.length + '/' + j.saves[0].name, '1/見積もり');
    check('  読み込みで戻せる形', j.app + '/' + j.type, 'hyodenki/saves'); }

  await page.evaluate(() => openSaveExp(111)); await page.waitForTimeout(300);
  const d2 = await grab(() => saveExpCsv());
  await page.waitForTimeout(350);
  check('  CSVにも出せる', !!d2, true);
  if (d2) { const f = '/tmp/claude-0/one-test.csv'; await d2.saveAs(f);
    check('  カンマは引用符でくるむ', require('fs').readFileSync(f, 'utf8'),
      '﻿項目,金額\r\n"あ,い",100\r\n合計,=SUM(B2:B2)'); }
  check('  開かずに出すので今の表はそのまま', await page.evaluate(() => getCellDisplay(0, 0)), '項目');

  // ── ぜんぶ書き出し：写真ごと／写真ぬき ──
  check('  日記の写真の重さが分かる', await page.evaluate(() => vegPicBytes() > 1000), true);
  await page.evaluate(() => { localStorage.setItem('excalc_taxrate', '8'); localStorage.setItem('excalc_userkeys', '[{"label":"テスト"}]'); });
  const d3 = await (async () => { const d = page.waitForEvent('download', { timeout: 9000 }).catch(() => null);
    await page.evaluate(() => { exportSaves(); }); await ansBtn('はい'); return d; })();
  check('  写真ごと書き出せる', !!d3, true);
  let withFile = null;
  if (d3) { withFile = '/tmp/claude-0/all-pics-test.json'; await d3.saveAs(withFile);
    const j = JSON.parse(require('fs').readFileSync(withFile, 'utf8'));
    const pid = Object.keys(j.veg.diary)[0];
    check('  写真が入っている', j.vegPics + '/' + !!j.veg.diary[pid][0].p, 'true/true');
    check('  育てている野菜も入る', j.veg.plots.length, 1);
    check('  設定も入る（v419）', (j.settings || {}).excalc_taxrate + '/' + (j.settings || {}).excalc_userkeys, '8/[{"label":"テスト"}]');
    check('  背景の写真・表の中身は設定に入れない', ['excalc_skin_photo', 'excalc_saves', 'excalc_sheets', 'excalc_touban'].some(k => k in (j.settings || {})), false); }

  const d4 = await (async () => { const d = page.waitForEvent('download', { timeout: 9000 }).catch(() => null);
    await page.evaluate(() => { exportSaves(); }); await ansBtn('いいえ'); return d; })();
  if (d4) { const f = '/tmp/claude-0/all-nopics-test.json'; await d4.saveAs(f);
    const j = JSON.parse(require('fs').readFileSync(f, 'utf8'));
    const pid = Object.keys(j.veg.diary)[0];
    check('  写真ぬきなら写真は入らない', j.vegPics + '/' + !!(j.veg.diary[pid][0] || {}).p, 'false/false');
    check('  文は残る', (j.veg.diary[pid][0] || {}).t, 'ようす'); }

  // ── 読み込みで戻る ──
  await page.evaluate(() => { localStorage.removeItem('excalc_veg_diary');
    localStorage.removeItem('excalc_veg_plots'); loadVegDiary(); loadVegPlots(); });
  check('  いったん消した', await page.evaluate(() =>
    vegPlots.length + '/' + Object.keys(vegDiary).length), '0/0');
  if (withFile) {
    await page.setInputFiles('#importSavesInput', withFile);
    await page.waitForTimeout(700);
    await ansBtn('はい');
    check('  読み込むと写真ごと戻る', await page.evaluate(() => {
      loadVegPlots(); loadVegDiary();
      const id = vegPlots[0] && vegPlots[0].id;
      return vegPlots.length + '/' + (id ? vegDiaryOf(id).length : 0) + '/' +
             (id ? vegDiaryOf(id).filter(e => e.p).length : 0); }), '1/1/1');
    await page.waitForTimeout(300);
    check('  設定も入っていれば、読み込むか聞く（v419）', await page.evaluate(() => {
      const ov = document.querySelector('div[style*="99999"]'); return !!ov && ov.textContent.includes('設定'); }), true);
    await ansBtn('いいえ');
    check('  いいえなら設定はそのまま', await page.evaluate(() => localStorage.getItem('excalc_taxrate')), '8');
  }
  check('  設定を戻せる（決めた名前だけ）', await page.evaluate(() => {
    const n = restoreSettingsBundle({ excalc_taxrate: '10', excalc_saves: 'こわす', other_key: 'x', excalc_dark: 1 });
    return n + '/' + localStorage.getItem('excalc_taxrate') + '/' + (localStorage.getItem('excalc_saves') !== 'こわす') + '/' + localStorage.getItem('other_key'); }), '1/10/true/null');

  // ── ⋯メニューの整理（v375） ──
  await page.evaluate(() => openMoreMenu()); await page.waitForTimeout(400);
  check('  項目の数は変わっていない（道具の一覧を除く）', await page.evaluate(() =>
    document.querySelectorAll('#moreMenuOverlay .more-item:not(#moreToolsGrid .more-item)').length), 18);   // v408 で 📱QRで共有 を足した
  check('  はじめは畳んである', await page.evaluate(() =>
    document.getElementById('moreAccOut').open + '/' + document.getElementById('moreAccMisc').open),
    'false/false');
  check('  すぐ見えるのはよく使うものだけ', await page.evaluate(() =>
    [...document.querySelectorAll('#moreMenuOverlay .more-item')]
      .filter(x => !x.closest('.more-acc')).map(x => x.textContent.trim()).join('/')),
    '↷進む/📋リスト/⚙設定/🌙ナイトモード/🎤声で入れる/🎯用途から始める/▦通常の表/🧮電卓/🧹リセット（戻るで元に戻せます）');
  check('  書き出しは畳んだ中', await page.evaluate(() =>
    [...document.querySelectorAll('#moreAccOut .more-item')].map(x => x.textContent.trim()).join('/')),
    '🖨PDF/📄CSV出力/📊Excel出力/📥CSV読込/📥Excel読込');
  check('  そのほかも畳んだ中', await page.evaluate(() =>
    [...document.querySelectorAll('#moreAccMisc .more-item')].map(x => x.textContent.trim()).join('/')),
    '🗂シート/▦既定の大きさ/📖説明書/📱QRで共有');
  check('  スクロールしなくても収まる', await page.evaluate(() => {
    const b = document.querySelector('#moreMenuOverlay .modal-body');
    return b.scrollHeight <= b.clientHeight + 1; }), true);
  check('  開け閉めを覚える', await page.evaluate(async () => {
    const e = document.getElementById('moreAccOut');
    e.open = true; e.dispatchEvent(new Event('toggle'));
    closeMoreMenu(); await new Promise(z => setTimeout(z, 350));
    openMoreMenu();
    const a = document.getElementById('moreAccOut').open;
    const e2 = document.getElementById('moreAccOut');
    e2.open = false; e2.dispatchEvent(new Event('toggle'));
    return a; }), true);
  await page.waitForTimeout(300);
  // 畳んだ中のボタンもこれまでどおり効く
  check('  畳んでも既定の大きさは登録されたまま', await page.evaluate(() =>
    !!document.getElementById('defsizeTopBtn')), true);
  check('  畳んでもシートの印は付く', await page.evaluate(() => { toggleSheetTabs();
    const r = document.getElementById('sheetToggleBtn').classList.contains('on');
    toggleSheetTabs(); return r; }), true);
  check('  ナイトモードの表示は変わる', await page.evaluate(() => { toggleDark();
    const r = document.getElementById('darkMoreBtn').textContent.trim(); toggleDark(); return r; }),
    '☀ライトに戻す');
  check('  上のバーへの登録もこれまでどおり', await page.evaluate(() => { toggleTopBtn('defsize');
    const r = getComputedStyle(document.getElementById('tbDefsize')).display !== 'none';
    toggleTopBtn('defsize'); return r; }), true);
  await page.evaluate(() => closeMoreMenu()); await page.waitForTimeout(350);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── 着せかえ（配色・背景）v379 ── */
async function runSkin(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 着せかえ（配色・背景） ──');
  const cssVar = k => page.evaluate(x => getComputedStyle(document.body).getPropertyValue(x).trim(), k);
  const bgOf = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
  const settle = () => page.waitForTimeout(260);   // 色の移り変わり（.14s）が終わるのを待つ

  check('  色は10種ある', await page.evaluate(() => SKIN_THEMES.length), 10);
  check('  はじめは緑', await cssVar('--acc'), '#217346');
  check('  はじめはもようなし', await page.evaluate(() => document.body.classList.contains('skin-bg')), false);
  check('  設定にチップが10個出る', await page.evaluate(() =>
    document.querySelectorAll('#skinSw .skin-chip').length), 10);
  check('  えらんだ色に印が付く', await page.evaluate(() =>
    document.querySelector('#skinSw .skin-chip.on').dataset.skin), 'green');

  // 色を変える
  await page.evaluate(() => setSkinTheme('blue')); await settle();
  check('  あおにできる', await cssVar('--acc'), '#1565c0');
  check('  濃い色・明るい色もそろう', [await cssVar('--acc-dark'), await cssVar('--acc-light')].join('/'), '#0d47a1/#1e88e5');
  check('  上のバーの色も変わる', await page.evaluate(() =>
    getComputedStyle(document.querySelector('.numpad-section')).borderTopColor), 'rgb(21, 101, 192)');
  check('  スマホの上の帯の色も変わる', await page.evaluate(() =>
    document.querySelector('meta[name="theme-color"]').content), '#1565c0');
  check('  印が移る', await page.evaluate(() =>
    document.querySelector('#skinSw .skin-chip.on').dataset.skin), 'blue');

  // キーの色
  check('  はじめのキーは黒', await bgOf('.btn[data-key="n1"]'), 'rgb(74, 74, 74)');
  await page.evaluate(() => setSkinKeyTone('tint')); await settle();
  check('  テーマ色のキーになる', await bgOf('.btn[data-key="n1"]'), 'rgb(11, 51, 96)');
  check('  テンキーの地も濃くなる', await bgOf('.numpad-section'), 'rgb(5, 26, 50)');
  await page.evaluate(() => setSkinKeyTone('light')); await settle();
  check('  あかるいキーになる', await bgOf('.btn[data-key="n1"]'), 'rgb(110, 120, 133)');
  check('  あかるいときは文字が黒系', await cssVar('--kp-sub'), '#3c444f');
  await page.evaluate(() => setSkinKeyTone('dark')); await settle();
  check('  黒に戻せる', await cssVar('--kp-sub'), '#b9b9b9');

  // 背景のもよう
  check('  背景は7とおり', await page.evaluate(() => SKIN_BGS.length), 7);
  for (const [id, want] of [['tint', 'linear-gradient'], ['grad', 'linear-gradient'], ['grid', 'linear-gradient'],
                            ['dot', 'radial-gradient'], ['stripe', 'repeating-linear-gradient']]) {
    await page.evaluate(x => setSkinBg(x), id);
    check('  背景「' + id + '」が敷かれる', await page.evaluate(() =>
      getComputedStyle(document.body).backgroundImage.slice(0, 40)).then(v => v.startsWith(want)), true);
  }
  check('  もよう中は skin-bg が付く', await page.evaluate(() => document.body.classList.contains('skin-bg')), true);

  // もようの色は、えらんだ色に自動で合う（v381）
  await page.evaluate(() => { setSkinTheme('blue'); setSkinBg('dot'); });
  check('  水玉はえらんだ色になる', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage.includes('rgba(21, 101, 192')), true);
  await page.evaluate(() => setSkinTheme('orange'));
  check('  色を変えると水玉も変わる', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage.includes('rgba(217, 119, 6')), true);
  // 水玉は大きさがまばら（v381）
  check('  水玉は5とおりの大きさ', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage.split('radial-gradient').length - 1), 5);
  check('  玉の間隔がそれぞれ違う', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundSize), '71px 71px, 53px 53px, 37px 37px, 97px 97px, 43px 43px');
  check('  置き始めもずらしてある', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundPosition), '0px 0px, 19px 31px, 44px 11px, 33px 62px, 8px 47px');
  check('  玉の大きさは重ならない', await page.evaluate(() =>
    new Set(SKIN_DOTS.map(d => d.r)).size), 5);
  // 「色に合わせる」は、色を変えると背景の色もそのまま変わる（v381）
  await page.evaluate(() => { setSkinBg('tint'); setSkinTheme('purple'); });
  check('  色に合わせるはテーマ色で染める', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage.startsWith('linear-gradient(rgba(106, 63, 158')), true);
  check('  テンキーもテーマ色で染まる', await page.evaluate(() =>
    getComputedStyle(document.querySelector('.numpad-section')).backgroundImage.includes('rgba(106, 63, 158')), true);
  await page.evaluate(() => setSkinTheme('teal'));
  check('  色を変えると背景も変わる', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage.startsWith('linear-gradient(rgba(0, 121, 107')), true);
  await page.evaluate(() => { setSkinTheme('blue'); setSkinBg('dot'); });
  check('  表の下地は透ける', await bgOf('.sheet-wrap'), 'rgba(0, 0, 0, 0)');
  check('  マス目も少し透ける', await cssVar('--sheet-cell-bg'), 'rgba(255,255,255,0.84)');
  check('  テンキーにも同じもよう', await page.evaluate(() =>
    getComputedStyle(document.querySelector('.numpad-section')).backgroundImage !== 'none'), true);

  // 背景を出す場所（両方／表だけ／テンキーだけ）v380
  const where = async () => page.evaluate(() => [
    getComputedStyle(document.body).backgroundImage === 'none' ? '-' : '表',
    getComputedStyle(document.querySelector('.numpad-section')).backgroundImage === 'none' ? '-' : 'キー',
  ].join('/'));
  check('  場所の選びは3つ', await page.evaluate(() =>
    document.querySelectorAll('#skinWhereSeg .skin-seg-btn').length), 3);
  check('  はじめは両方', await page.evaluate(() => skinWhere), 'both');
  check('  両方に出る', await where(), '表/キー');
  await page.evaluate(() => setSkinWhere('sheet'));
  check('  表だけにできる', await where(), '表/-');
  check('  表だけのときは skin-keys が付かない', await page.evaluate(() =>
    document.body.classList.contains('skin-keys')), false);
  await page.evaluate(() => setSkinWhere('keys'));
  check('  テンキーだけにできる', await where(), '-/キー');
  check('  テンキーだけならマス目は透かさない', await cssVar('--sheet-cell-bg'), '');
  check('  テンキーだけのときは skin-bg が付かない', await page.evaluate(() =>
    document.body.classList.contains('skin-bg')), false);
  await page.evaluate(() => setSkinWhere('both'));
  check('  両方に戻せる', await where(), '表/キー');

  // 濃さ
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  await page.evaluate(() => changeSkinStr(1));
  check('  濃さを上げると変わる', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage) !== before, true);
  check('  濃さの名前が出る', await page.evaluate(() => document.getElementById('skinStrVal').textContent), 'こい');
  check('  マス目はもっと透ける', await cssVar('--sheet-cell-bg'), 'rgba(255,255,255,0.7)');
  await page.evaluate(() => changeSkinStr(1));
  check('  濃さはこれ以上上がらない', await page.evaluate(() => skinStr), 2);
  await page.evaluate(() => { changeSkinStr(-1); changeSkinStr(-1); changeSkinStr(-1); });
  check('  濃さはこれ以下に下がらない', await page.evaluate(() => skinStr), 0);
  await page.evaluate(() => changeSkinStr(1));

  // 写真がないうちは写真背景にならない
  await page.evaluate(() => setSkinBg('photo'));
  check('  写真がなければもようなし', await page.evaluate(() => document.body.classList.contains('skin-photo')), false);
  check('  消すボタンは隠れている', await page.evaluate(() =>
    document.getElementById('skinPhotoDel').style.display), 'none');

  // 写真を入れる（カメラの代わりに絵を作って入れる）
  await page.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 700;
    const x = cv.getContext('2d'); x.fillStyle = '#3a7bd5'; x.fillRect(0, 0, 400, 700);
    x.fillStyle = '#f6c343'; x.beginPath(); x.arc(280, 160, 80, 0, 7); x.fill();
    skinPhoto = cv.toDataURL('image/jpeg', .7);
    localStorage.setItem(SKIN_PHOTO_KEY, skinPhoto); setSkinBg('photo');
  });
  await settle();
  check('  写真を背景にできる', await page.evaluate(() => document.body.classList.contains('skin-photo')), true);
  check('  写真は透かして敷く', await page.evaluate(() =>
    /^linear-gradient\(rgba\(255, 255, 255, 0\.\d+\).*url\(/.test(getComputedStyle(document.body).backgroundImage)), true);
  check('  テンキーにも写真', await page.evaluate(() =>
    getComputedStyle(document.querySelector('.numpad-section')).backgroundImage.includes('url(')), true);
  check('  キーが半透明になる', await page.evaluate(() =>
    getComputedStyle(document.querySelector('.btn[data-key="n1"]')).backgroundColor), 'rgba(74, 74, 74, 0.74)');
  check('  消すボタンが出る', await page.evaluate(() =>
    document.getElementById('skinPhotoDel').style.display), '');
  check('  ボタンの字が「選びなおす」になる', await page.evaluate(() =>
    document.getElementById('skinPhotoBtn').textContent.includes('選びなおす')), true);
  await page.evaluate(() => setSkinWhere('sheet')); await settle();
  check('  写真も表だけにできる', await page.evaluate(() =>
    getComputedStyle(document.querySelector('.numpad-section')).backgroundImage), 'none');
  check('  表だけならキーは透けない', await bgOf('.btn[data-key="n1"]'), 'rgb(74, 74, 74)');
  await page.evaluate(() => setSkinWhere('keys')); await settle();
  check('  写真もテンキーだけにできる', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage), 'none');
  check('  テンキーだけでもキーは透ける', await bgOf('.btn[data-key="n1"]'), 'rgba(74, 74, 74, 0.74)');
  await page.evaluate(() => setSkinWhere('both')); await settle();

  // 濃さで透かし具合が変わる
  const sa = () => page.evaluate(() =>
    (getComputedStyle(document.body).backgroundImage.match(/rgba\(255, 255, 255, ([\d.]+)\)/) || [])[1]);
  const m1 = await sa(); await page.evaluate(() => changeSkinStr(1)); await settle();
  const m2 = await sa();
  check('  濃くすると写真がはっきりする', parseFloat(m2) < parseFloat(m1), true);
  await page.evaluate(() => changeSkinStr(-1));

  // ナイトモードと両立する
  await page.evaluate(() => toggleDark()); await settle();
  check('  夜でも色はそのまま', await cssVar('--acc'), '#1565c0');
  check('  夜は薄い塗りが濃くなる', await cssVar('--acc-weak'), 'rgba(21,101,192,0.3)');
  check('  夜は写真を黒で透かす', await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage.startsWith('linear-gradient(rgba(0, 0, 0,')), true);
  check('  夜はマス目も夜の色', await cssVar('--sheet-cell-bg'), 'rgba(30,42,69,0.84)');
  await page.evaluate(() => toggleDark()); await settle();

  // 覚えている
  await page.reload(); await page.waitForTimeout(700);
  check('  開き直しても覚えている', await page.evaluate(() =>
    [skinTheme, skinKeyTone, skinBg, skinStr, skinWhere, skinPhoto.length > 100].join('/')), 'blue/dark/photo/1/both/true');
  check('  開き直しても色が出ている', await cssVar('--acc'), '#1565c0');

  // 写真を消す
  await page.evaluate(() => skinDropPhoto()); await settle();
  check('  写真を消せる', await page.evaluate(() => [skinPhoto, skinBg].join('/')), '/none');
  check('  消したら地の色に戻る', await page.evaluate(() => document.body.classList.contains('skin-bg')), false);
  check('  端末からも消えている', await page.evaluate(() => localStorage.getItem(SKIN_PHOTO_KEY)), null);

  // もとに戻す
  await page.evaluate(() => { setSkinTheme('pink'); setSkinKeyTone('light'); setSkinBg('dot'); changeSkinStr(1); setSkinWhere('keys'); });
  await page.evaluate(() => resetSkin()); await settle();
  check('  もとの色に戻せる', await page.evaluate(() =>
    [skinTheme, skinKeyTone, skinBg, skinStr, skinWhere].join('/')), 'green/dark/none/1/both');
  check('  戻すと緑になる', await cssVar('--acc'), '#217346');
  check('  戻すとキーも黒に', await bgOf('.btn[data-key="n1"]'), 'rgb(74, 74, 74)');

  // 端末の空き具合にも出る
  check('  空き具合に背景の写真が並ぶ', await page.evaluate(() =>
    ST_GROUPS.some(g => g.k === 'excalc_skin_photo')), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── データの守り・更新の出し方・プライバシー v382 ── */
async function runSafety(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── データの守りと更新 ──');
  const shown = () => page.evaluate(() => {
    const el = document.getElementById('noticeBar');
    return !!(el && el.classList.contains('show'));
  });
  const title = () => page.evaluate(() => {
    const el = document.querySelector('#noticeBar .nb-t'); return el ? el.textContent : '';
  });

  // お知らせバー
  check('  はじめは出ていない', await shown(), false);
  await page.evaluate(() => { window.__y = 0; window.__n = 0;
    showNotice({ title: 'ためし', sub: 'そえ書き', yes: 'する', no: 'しない',
      onYes: () => window.__y = 1, onNo: () => window.__n = 1 }); });
  await page.waitForTimeout(300);
  check('  お知らせバーが出る', await shown(), true);
  check('  見出しが出る', await title(), 'ためし');
  check('  そえ書きも出る', await page.evaluate(() =>
    document.querySelector('#noticeBar .nb-s').textContent), 'そえ書き');
  check('  ボタンは2つ（あとで・する）', await page.evaluate(() =>
    [...document.querySelectorAll('#noticeBar button')].map(x => x.textContent).join('/')), 'しない/する');
  await page.click('#noticeBar .nb-no'); await page.waitForTimeout(300);
  check('  「しない」で閉じる', await shown(), false);
  check('  「しない」が呼ばれる', await page.evaluate(() => window.__n), 1);
  await page.evaluate(() => showNotice({ title: 'ためし2', onYes: () => window.__y = 2 }));
  await page.waitForTimeout(300);
  await page.click('#noticeBar .nb-yes'); await page.waitForTimeout(300);
  check('  「する」が呼ばれる', await page.evaluate(() => window.__y), 2);
  check('  押したら閉じる', await shown(), false);

  // データが消えないようにする
  check('  端末に聞くしくみがある', await page.evaluate(() =>
    typeof stCheckPersist === 'function' && typeof stAskPersist === 'function'), true);
  check('  いまの状態を読める', await page.evaluate(() =>
    stCheckPersist().then(v => v === true || v === false || v === null)), true);
  await page.evaluate(() => { stPersisted = false; openStorage(); });
  await page.waitForTimeout(400);
  check('  ⚠のときは注意が出る', await page.evaluate(() =>
    !!document.querySelector('.st-persist.warn')), true);
  check('  消えないようにするボタンがある', await page.evaluate(() => {
    const b = document.querySelector('.st-persist .stp-btn'); return b ? b.textContent.trim() : ''; }), '🔒 消えないようにする');
  check('  7日で消えることに触れている', await page.evaluate(() =>
    document.querySelector('.st-persist.warn').textContent.includes('7日')), true);
  await page.evaluate(() => { stPersisted = true; renderStorage(); });
  await page.waitForTimeout(250);
  check('  🔒のときは注意を出さない', await page.evaluate(() =>
    !!document.querySelector('.st-persist') && !document.querySelector('.st-persist.warn')), true);
  await page.evaluate(() => { stPersisted = null; renderStorage(); });
  await page.waitForTimeout(250);
  check('  分からないときは何も出さない', await page.evaluate(() =>
    !document.querySelector('.st-persist')), true);
  await page.evaluate(() => closeStorage()); await page.waitForTimeout(350);

  // バックアップのおすすめ
  await page.evaluate(() => { localStorage.removeItem('excalc_saves');
    localStorage.removeItem(BK_SNOOZE_KEY); });
  check('  記録がなければ出さない', await page.evaluate(() => maybeAskBackup()), false);
  await page.evaluate(() => localStorage.setItem('excalc_saves',
    JSON.stringify([{ id: 1, name: '見積り', at: Date.now() }])));
  check('  書き出していなければ出す', await page.evaluate(() => maybeAskBackup()), true);
  await page.waitForTimeout(300);
  check('  バックアップのおすすめ', await title(), '大事な記録をファイルに残しておきませんか');
  check('  理由を添える', await page.evaluate(() =>
    document.querySelector('#noticeBar .nb-s').textContent.includes('まだ一度も')), true);
  await page.click('#noticeBar .nb-no'); await page.waitForTimeout(300);
  check('  「あとで」で寝かせる', await page.evaluate(() => bkSnoozed()), true);
  check('  寝かせたら出さない', await page.evaluate(() => maybeAskBackup()), false);
  check('  7日たてばまた出す', await page.evaluate(() => {
    localStorage.setItem(BK_SNOOZE_KEY, String(Date.now() - 8 * 86400000));
    return bkSnoozed(); }), false);

  // 更新のおすすめ
  await page.evaluate(() => { swUpdateDeclined = false; window.__msg = null;
    swOfferUpdate({ postMessage: m => window.__msg = m }); });
  await page.waitForTimeout(300);
  check('  更新のおすすめが出る', await title(), '新しい版が用意できました');
  check('  書きかけに触れている', await page.evaluate(() =>
    document.querySelector('#noticeBar .nb-s').textContent.includes('書きかけ')), true);
  check('  ボタンは あとで／いま更新', await page.evaluate(() =>
    [...document.querySelectorAll('#noticeBar button')].map(x => x.textContent).join('/')), 'あとで/いま更新');
  await page.click('#noticeBar .nb-yes'); await page.waitForTimeout(300);
  check('  いま更新で入れ替えを頼む', await page.evaluate(() => window.__msg), 'SKIP_WAITING');
  await page.evaluate(() => { swUpdateDeclined = false; swOfferUpdate({ postMessage: () => {} }); });
  await page.waitForTimeout(300);
  await page.click('#noticeBar .nb-no'); await page.waitForTimeout(300);
  check('  あとでを押したら断ったことを覚える', await page.evaluate(() => swUpdateDeclined), true);
  await page.evaluate(() => swOfferUpdate({ postMessage: () => {} }));
  await page.waitForTimeout(300);
  check('  断ったらもう出さない', await shown(), false);

  // 説明書のプライバシー
  await page.evaluate(() => openHelp()); await page.waitForTimeout(400);
  check('  データとプライバシーの節がある', await page.evaluate(() =>
    document.querySelector('#h-privacy summary').textContent.trim()), '🔒 データとプライバシー');
  check('  目次からも行ける', await page.evaluate(() =>
    [...document.querySelectorAll('.help-nav a')].some(a => a.textContent.includes('データ'))), true);
  const pv = await page.evaluate(() => document.getElementById('h-privacy').textContent);
  for (const w of ['端末の中だけ', 'カメラ', 'マイク', 'アカウントもログインもありません', '広告', '7日', '書き出し'])
    check('  「' + w + '」に触れている', pv.includes(w), true);
  check('  項目は7つ', await page.evaluate(() =>
    document.querySelectorAll('#h-privacy .help-li').length), 7);
  await page.evaluate(() => closeHelp()); await page.waitForTimeout(350);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── 見え方・アイコン・manifest v383 ── */
async function runPackaging(browser) {
  const fs = require('fs'), pathmod = require('path');
  const root = pathmod.join(__dirname, '..');
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── アイコンと manifest ──');

  const mf = JSON.parse(fs.readFileSync(pathmod.join(root, 'manifest.json'), 'utf8'));
  check('  名前が中身を表している', mf.name.includes('電卓'), true);
  check('  説明が十分に書いてある', mf.description.length > 60, true);
  check('  ことばは日本語', mf.lang, 'ja');
  check('  分類が入っている', Array.isArray(mf.categories) && mf.categories.length > 0, true);
  check('  display_override がある', Array.isArray(mf.display_override), true);

  const any = mf.icons.filter(i => i.purpose === 'any');
  const msk = mf.icons.filter(i => i.purpose === 'maskable');
  check('  ふつうのアイコンが2つ', any.length, 2);
  check('  丸く切られる用が2つ', msk.length, 2);
  check('  両者は別のファイル', any.every(a => msk.every(m => m.src !== a.src)), true);
  for (const i of mf.icons)
    check('  ' + i.src + ' がある', fs.existsSync(pathmod.join(root, i.src)), true);
  check('  apple-touch-icon がある', fs.existsSync(pathmod.join(root, 'apple-touch-icon.png')), true);
  // 大きい画像は軽くしておく（読み込みが遅くならないように）
  for (const f of ['icon-192.png', 'icon-maskable-192.png', 'apple-touch-icon.png'])
    check('  ' + f + 'は50KB未満', fs.statSync(pathmod.join(root, f)).size < 50 * 1024, true);

  check('  ショートカットが4つ', mf.shortcuts.length, 4);
  check('  ショートカットに ?p= が付く', mf.shortcuts.every(s2 => /\?p=[a-z]+$/.test(s2.url)), true);
  check('  スクリーンショットが4枚', mf.screenshots.length, 4);
  check('  縦向きが3枚', mf.screenshots.filter(s2 => s2.form_factor === 'narrow').length, 3);
  check('  横向きが1枚', mf.screenshots.filter(s2 => s2.form_factor === 'wide').length, 1);
  for (const s2 of mf.screenshots) {
    check('  ' + s2.src + ' がある', fs.existsSync(pathmod.join(root, s2.src)), true);
    check('  ' + s2.src + ' に説明が付く', !!s2.label, true);
  }

  await page.goto(INDEX);
  await page.waitForTimeout(500);
  const meta = n => page.evaluate(x => {
    const el = document.querySelector('meta[name="' + x + '"],meta[property="' + x + '"]');
    return el ? el.getAttribute('content') : null; }, n);
  check('  ページの説明がある', await meta('description').then(v => (v || '').length > 40), true);
  check('  リンクを送ったときの題', await meta('og:title').then(v => (v || '').includes('表電卓')), true);
  check('  リンクを送ったときの説明', await meta('og:description').then(v => (v || '').length > 20), true);
  check('  カード画像', await meta('og:image'), 'ogp.png');
  check('  カード画像のファイルがある', fs.existsSync(pathmod.join(root, 'ogp.png')), true);
  check('  Twitter用の指定もある', await meta('twitter:card'), 'summary_large_image');
  check('  日本語のページとして出す', await meta('og:locale'), 'ja_JP');
  check('  夜と昼どちらも対応と伝える', await meta('color-scheme'), 'light dark');
  check('  題に中身が分かる言葉がある', await page.title(), '表電卓 — 表計算のできる電卓');
  check('  apple-touch-icon を指している', await page.evaluate(() =>
    document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href')), 'apple-touch-icon.png');

  // ショートカットで開く画面が変わる
  check('  ?p= を読み取るしくみ', await page.evaluate(() => typeof startPageFromUrl === 'function'), true);
  await page.goto(INDEX + '?p=dentaku');
  await page.waitForTimeout(700);
  check('  ?p=dentaku で電卓から始まる', await page.evaluate(() =>
    document.body.classList.contains('dentaku-mode')), true);
  check('  設定そのものは書き換えない', await page.evaluate(() =>
    localStorage.getItem('excalc_startpage')), null);
  await page.goto(INDEX + '?p=あやしい');
  await page.waitForTimeout(600);
  check('  知らない指定は無視する', await page.evaluate(() => startPageFromUrl()), '');

  // service-worker は勝手に入れ替わらない
  const sw = fs.readFileSync(pathmod.join(root, 'service-worker.js'), 'utf8');
  const inst = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('message'"));
  check('  入れる時点では入れ替えない', inst.includes('skipWaiting'), false);
  check('  頼まれたときだけ入れ替える', sw.includes("e.data === 'SKIP_WAITING'"), true);
  check('  アイコンもオフラインで持つ', sw.includes('icon-maskable-512.png'), true);
  check('  版の名前が合っている', sw.includes("'excalc-" + (await page.evaluate(() => APP_VERSION)) + "'"), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── はじめての案内・見本の表・電波 v384 ── */
async function runOnboard(browser) {
  // この組だけは「まっさらな端末で初めて開く」ところを見たいので、自前で開く
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  console.log('\n── はじめての案内 ──');
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForTimeout(1400);

  const open = () => page.evaluate(() => isDlgOpen('tourOverlay'));
  const head = () => page.evaluate(() => document.querySelector('.tour-h').textContent);
  check('  はじめて開いたら案内が出る', await open(), true);
  check('  5枚ある', await page.evaluate(() => TOUR_PAGES.length), 5);
  check('  1枚目は表と電卓', await head(), '表と電卓、どちらも使えます');
  check('  いまどこか分かる丸', await page.evaluate(() =>
    [...document.querySelectorAll('.tour-dots i')].findIndex(x => x.classList.contains('on'))), 0);
  check('  とばすボタンが出ている', await page.evaluate(() =>
    document.querySelector('.tour-skip').textContent.trim()), 'とばす ✕');
  check('  1枚目に戻るボタンはない', await page.evaluate(() =>
    !document.querySelector('.tour-row .t-back')), true);

  await page.evaluate(() => tourGo(1)); await page.waitForTimeout(200);
  check('  つぎへで進む（2枚目は操作）', await head(), '表の操作は Excel と同じです');
  check('  ダブルタップ・右下の ● などの操作が書いてある', await page.evaluate(() => {
    const t = document.querySelector('.tour-ex').textContent; return ['ダブルタップ', '右下の ■', 'なぞる', '長押し', '＝数式', 'あ文字'].every(w => t.includes(w)); }), true);
  await page.evaluate(() => tourGo(1)); await page.waitForTimeout(200);
  check('  3枚目は声', await head(), '口で言うだけでも計算できます');
  check('  言い方の見本が出る', await page.evaluate(() =>
    document.querySelector('.tour-ex').textContent.includes('180円を4個')), true);
  await page.evaluate(() => { tourGo(-1); tourGo(-1); }); await page.waitForTimeout(200);
  check('  戻るで戻れる', await head(), '表と電卓、どちらも使えます');
  await page.evaluate(() => { tourGo(1); tourGo(1); tourGo(1); tourGo(1); }); await page.waitForTimeout(250);
  check('  5枚目は電波とデータ', await head(), '電波がなくても、そのまま使えます');
  check('  さいごは 見本／はじめる', await page.evaluate(() =>
    [...document.querySelectorAll('.tour-row button')].map(x => x.textContent).join('/')), '戻る/見本を入れる/はじめる');
  check('  行き過ぎない', await page.evaluate(() => { for (let i = 0; i < 6; i++) tourGo(-1); return tourIdx; }), 0);

  // とばせる／一度きり
  await page.evaluate(() => tourSkip()); await page.waitForTimeout(400);
  check('  とばすと閉じる', await open(), false);
  check('  とばしたことを覚える', await page.evaluate(() => tourSeen()), true);
  await page.reload(); await page.waitForTimeout(1400);
  check('  二度目は出さない', await open(), false);
  check('  版が上がっても出し直さない', await page.evaluate(() => {
    // 覚えているのは「見た」だけで、版の番号は持たない
    return localStorage.getItem(TOUR_KEY) === '1' && !/v\d/.test(localStorage.getItem(TOUR_KEY)); }), true);

  // あとから見直せる
  await page.evaluate(() => openTour()); await page.waitForTimeout(300);
  check('  あとから見直せる', await open(), true);
  check('  見直すと1枚目から', await page.evaluate(() => tourIdx), 0);
  await page.evaluate(() => tourSkip()); await page.waitForTimeout(350);
  await page.evaluate(() => openHelp()); await page.waitForTimeout(400);
  check('  説明書に Excel とのちがいの早見表（v415）', await page.evaluate(() => {
    const d = document.getElementById('h-excel'); return !!d && d.querySelectorAll('tr').length >= 12 && d.textContent.includes('右下の ■'); }), true);
  check('  説明書に入口がある', await page.evaluate(() =>
    [...document.querySelectorAll('#helpOverlay button')].some(b => b.textContent.includes('はじめての案内'))), true);
  await page.evaluate(() => closeHelp()); await page.waitForTimeout(350);

  // 見本の表
  await page.evaluate(() => { openTour(); tourGo(1); tourGo(1); tourGo(1); tourGo(1); }); await page.waitForTimeout(300);
  await page.evaluate(() => tourSample()); await page.waitForTimeout(800);
  check('  見本を入れると閉じる', await open(), false);
  check('  見出しが入る', await page.evaluate(() => [data[0][0], data[0][3]].join('/')), '品名/金額');
  check('  品物が入る', await page.evaluate(() => data[1][0]), '生コン 21-8-20');
  check('  かけ算の式が入る', await page.evaluate(() => data[1][3]), '=B2*C2');
  check('  合計の式が入る', await page.evaluate(() => data[5][3]), '=SUM(D2:D5)');
  check('  ちゃんと計算される', await page.evaluate(() => getCellValue(5, 3)), 548450);
  check('  列は4つ以上ある', await page.evaluate(() => COLS >= 4), true);
  check('  ↶戻る で消せる', await page.evaluate(() => { undoLast(); return data[1][0]; }), '');
  check('  見本を入れたら案内はもう出ない', await page.evaluate(() => tourSeen()), true);

  // 電波
  check('  電波の見張りがある', await page.evaluate(() => typeof netInit === 'function'), true);
  await ctx.setOffline(true); await page.waitForTimeout(500);
  check('  切れたら伝える', await page.evaluate(() => document.getElementById('appToast').textContent),
    '電波が切れました。このまま使えます');
  check('  そのまま使えると伝える', await page.evaluate(() =>
    document.getElementById('appToast').textContent.includes('このまま使えます')), true);
  await ctx.setOffline(false); await page.waitForTimeout(700);
  check('  戻ったら伝える', await page.evaluate(() => document.getElementById('appToast').textContent), '電波が戻りました');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── 磨き込み（新しくなったこと・拡大・読み込み表示・失敗の知らせ）v385 ── */
async function runPolish(browser) {
  const fs = require('fs'), pathmod = require('path');
  const root = pathmod.join(__dirname, '..');
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 磨き込み ──');

  // 指で拡大できる
  const vp = await page.evaluate(() => document.querySelector('meta[name=viewport]').content);
  check('  指で拡大できる', /user-scalable=yes/.test(vp), true);
  check('  5倍まで拡げられる', /maximum-scale=5/.test(vp), true);
  check('  切りかけを防ぐ指定は残す', /viewport-fit=cover/.test(vp), true);
  check('  触れた入力欄は16pxにする', await page.evaluate(() => {
    // iPhone が勝手に拡大しないための手当て
    return [...document.styleSheets[0].cssRules].some(r =>
      r.conditionText && r.conditionText.includes('coarse') &&
      [...(r.cssRules || [])].some(x => x.selectorText && x.selectorText.includes('input:focus')));
  }), true);

  // 読み込み表示
  const raw = fs.readFileSync(pathmod.join(root, 'index.html'), 'utf8');
  check('  読み込み表示が書いてある', raw.includes('id="appSplash"'), true);
  check('  消すしくみがある', await page.evaluate(() => typeof splashDone === 'function'), true);
  check('  組み上がったら消えている', await page.evaluate(() =>
    !document.getElementById('appSplash')), true);

  // 新しくなったこと
  check('  いまの版の分が書いてある', await page.evaluate(() =>
    WHATSNEW.some(w => w.v === APP_VERSION)), true);
  check('  新しい順に並ぶ', await page.evaluate(() => WHATSNEW[0].v), await page.evaluate(() => APP_VERSION));
  check('  どの版にも中身がある', await page.evaluate(() =>
    WHATSNEW.every(w => w.t && w.li.length > 0)), true);
  await page.evaluate(() => localStorage.removeItem(SEEN_VER_KEY));
  check('  はじめての人には出さない', await page.evaluate(() => maybeTellWhatsNew()), false);
  check('  でも版は覚えておく', await page.evaluate(() => seenVer()), await page.evaluate(() => APP_VERSION));
  check('  同じ版なら出さない', await page.evaluate(() => maybeTellWhatsNew()), false);
  check('  版が上がったら知らせる', await page.evaluate(() => {
    localStorage.setItem(SEEN_VER_KEY, 'v380'); return maybeTellWhatsNew(); }), true);
  await page.waitForTimeout(300);
  check('  見出しに版が入る', await page.evaluate(() =>
    document.querySelector('#noticeBar .nb-t').textContent), await page.evaluate(() => APP_VERSION + ' に新しくなりました'));
  await page.click('#noticeBar .nb-yes'); await page.waitForTimeout(450);
  check('  「見る」で開く', await page.evaluate(() => isDlgOpen('whatsNewOverlay')), true);
  check('  版ごとに畳んである', await page.evaluate(() =>
    document.querySelectorAll('#whatsNewBody details').length), await page.evaluate(() => WHATSNEW.length));
  check('  いちばん新しいのは開いている', await page.evaluate(() =>
    document.querySelector('#whatsNewBody details').open), true);
  check('  見たら覚える', await page.evaluate(() => seenVer()), await page.evaluate(() => APP_VERSION));
  await page.evaluate(() => closeWhatsNew()); await page.waitForTimeout(400);
  await page.evaluate(() => { localStorage.setItem(SEEN_VER_KEY, 'v380'); maybeTellWhatsNew(); });
  await page.waitForTimeout(300);
  await page.click('#noticeBar .nb-no'); await page.waitForTimeout(300);
  check('  「あとで」でも覚える', await page.evaluate(() => seenVer()), await page.evaluate(() => APP_VERSION));
  check('  しつこく出さない', await page.evaluate(() => maybeTellWhatsNew()), false);
  await page.evaluate(() => openHelp()); await page.waitForTimeout(400);
  check('  説明書から見られる', await page.evaluate(() =>
    [...document.querySelectorAll('#helpOverlay button')].some(b => b.textContent.includes('新しくなったこと'))), true);
  await page.evaluate(() => closeHelp()); await page.waitForTimeout(350);

  // 保存に失敗したときに黙らない
  check('  失敗を伝えるしくみ', await page.evaluate(() =>
    typeof saveFailed === 'function' && typeof saveOk === 'function'), true);
  check('  何ができなかったか言う', await page.evaluate(() => {
    saveOk(); saveFailed('ためし'); return document.getElementById('appToast').textContent; }),
    'ためしができませんでした。⋯→🧹端末の空き具合 で片づけてください');
  check('  同じことを何度も言わない', await page.evaluate(() => {
    const t = document.getElementById('appToast'); t.textContent = 'x'; saveFailed('ためし'); return t.textContent; }), 'x');
  check('  直ったらまた言える', await page.evaluate(() => {
    saveOk(); saveFailed('ためし2'); return document.getElementById('appToast').textContent.includes('ためし2'); }), true);
  check('  自動保存の失敗につないである', raw.includes("saveFailed('いまの表の自動保存')"), true);
  check('  色の設定の失敗も伝える', raw.includes('色の設定を覚えられませんでした'), true);

  // README
  const rd = fs.readFileSync(pathmod.join(root, 'README.md'), 'utf8');
  check('  READMEが何のアプリか言う', rd.includes('表計算のできる電卓'), true);
  check('  READMEが誰向けか言う', rd.includes('現場'), true);
  check('  READMEに使いはじめがある', rd.includes('## 使いはじめ'), true);
  check('  READMEに配り方がある', rd.includes('## 配る'), true);
  check('  版をそろえる注意がある', rd.includes('APP_VERSION') && rd.includes('CACHE'), true);
  check('  READMEにテストの通し方がある', rd.includes('node tests/run.js'), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── iPhone の時計・電池の帯を避ける v386 ── */
async function runSafeArea(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 画面のふちを避ける ──');
  const BAND = 47;                       // ホーム画面から開いた iPhone の上の帯くらい
  const band = v => page.evaluate(x => {
    document.documentElement.style.setProperty('--safe-top', x);
    document.documentElement.style.setProperty('--safe-bottom', x === '0px' ? '0px' : '34px');
  }, v);
  // ✕ の当たり判定（まん中を押したとき、本当に✕に当たるか）
  const xInfo = id => page.evaluate(i => {
    const ov = document.getElementById(i);
    const b = ov.querySelector('.modal-close');
    const r = b.getBoundingClientRect();
    const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { top: Math.round(r.top), pad: getComputedStyle(ov.querySelector('.modal-header')).paddingTop,
             onX: mid === b || b.contains(mid) };
  }, id);

  check('  帯の大きさを1か所で持つ', await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--safe-top').trim() !== ''), true);

  // 帯があるとき：全画面の見出しは帯のぶん下がる
  await band(BAND + 'px'); await page.waitForTimeout(200);
  await page.evaluate(() => openSayHelp()); await page.waitForTimeout(600);
  let x = await xInfo('sayHelpOverlay');
  check('  早見表の見出しが帯のぶん下がる', x.pad, (12 + BAND) + 'px');
  check('  早見表の✕が帯より下にある', x.top >= BAND, true);
  check('  早見表の✕が押せる', x.onX, true);
  await page.evaluate(() => closeSayHelp()); await page.waitForTimeout(400);

  // ほかの全画面の道具でも同じ
  // 全画面で開くほかの画面（道具・写真メモ・容積）でも同じ
  const topBtn = (id, sel) => page.evaluate(([i, s2]) => {
    const ov = document.getElementById(i);
    const b = ov.querySelector(s2);
    const r = b.getBoundingClientRect();
    const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { top: Math.round(r.top), onIt: mid === b || b.contains(mid) };
  }, [id, sel]);
  for (const [name, openFn, id, sel] of [
        ['野菜',     'openVeggie',    'veggieOverlay',    '.modal-close'],
        ['写真メモ', 'openPhotoMemo', 'photoMemoOverlay', '.hdr-back'],
        ['容積',     'openVolume',    'volumeOverlay',    '.modal-close']]) {
    const ok = await page.evaluate(f => typeof window[f] === 'function', openFn);
    if (!ok) { check('  ' + name + 'を開ける', ok, true); continue; }
    await page.evaluate(f => window[f](), openFn); await page.waitForTimeout(600);
    const r = await topBtn(id, sel);
    check('  ' + name + 'の閉じるボタンが帯より下', r.top >= BAND, true);
    check('  ' + name + 'の閉じるボタンが押せる', r.onIt, true);
    await page.evaluate(([i, s2]) => { const b = document.getElementById(i).querySelector(s2); if (b) b.click(); }, [id, sel]);
    await page.waitForTimeout(500);
  }

  // 帯がないとき（パソコンやふつうのブラウザ）は今までどおり
  await band('0px'); await page.waitForTimeout(200);
  await page.evaluate(() => openSayHelp()); await page.waitForTimeout(500);
  x = await xInfo('sayHelpOverlay');
  check('  帯がなければ余白は増やさない', x.pad, '12px');
  check('  帯がなくても✕は押せる', x.onX, true);

  // ✕ は見た目そのままで、指の当たりだけ広い
  check('  ✕の見た目は28px', await page.evaluate(() => {
    const r = document.querySelector('#sayHelpOverlay .modal-close').getBoundingClientRect();
    return Math.round(r.width) + 'x' + Math.round(r.height); }), '28x28');
  check('  少し外しても✕に当たる', await page.evaluate(() => {
    const b = document.querySelector('#sayHelpOverlay .modal-close');
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.left - 5, r.top + r.height / 2);
    return el === b || b.contains(el); }), true);
  // 本当に閉じられる
  await page.click('#sayHelpOverlay .modal-close'); await page.waitForTimeout(450);
  check('  ✕を押すと閉じる', await page.evaluate(() => isDlgOpen('sayHelpOverlay')), false);

  // 下のホームバーも避ける
  await band(BAND + 'px'); await page.waitForTimeout(200);
  await page.evaluate(() => openSayHelp()); await page.waitForTimeout(500);
  check('  中身の下もホームバーを避ける', await page.evaluate(() =>
    getComputedStyle(document.querySelector('#sayHelpOverlay .modal-body')).paddingBottom), '50px');
  await page.evaluate(() => closeSayHelp()); await page.waitForTimeout(400);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── せまい画面で詰める・声の行のマイク v387 ── */
async function runCompact(browser) {
  // iPhone SE と同じ大きさで開く
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  console.log('\n── せまい画面と声のマイク ──');
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(1000);
  const on = () => page.evaluate(() => document.body.classList.contains('compact'));

  // 自動で詰まる
  check('  はじめは自動', await page.evaluate(() => compactMode), 'auto');
  check('  SEの大きさなら詰める', await on(), true);
  await page.setViewportSize({ width: 900, height: 1000 }); await page.waitForTimeout(400);
  check('  広い画面なら詰めない', await on(), false);
  await page.setViewportSize({ width: 375, height: 667 }); await page.waitForTimeout(400);
  check('  せまくなったらまた詰める', await on(), true);

  // 自分で選べる
  await page.evaluate(() => setCompact('off')); await page.waitForTimeout(250);
  check('  ふつうにできる', await on(), false);
  await page.evaluate(() => setCompact('on')); await page.waitForTimeout(250);
  check('  いつでも詰められる', await on(), true);
  await page.setViewportSize({ width: 900, height: 1000 }); await page.waitForTimeout(400);
  check('  「詰める」は広い画面でも効く', await on(), true);
  await page.setViewportSize({ width: 375, height: 667 }); await page.waitForTimeout(400);
  await page.reload(); await page.waitForTimeout(1000);
  check('  開き直しても覚えている', await page.evaluate(() => compactMode), 'on');
  await page.evaluate(() => setCompact('auto')); await page.waitForTimeout(250);

  // 詰めると1画面に入る量が増える
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(500);
  const sz = () => page.evaluate(() => ({
    main: parseFloat(getComputedStyle(document.getElementById('dtMain')).fontSize),
    vf: parseFloat(getComputedStyle(document.getElementById('dtVoiceF')).fontSize),
    tape: Math.round(document.getElementById('dtTape').getBoundingClientRect().height),
  }));
  const tight = await sz();
  await page.evaluate(() => setCompact('off')); await page.waitForTimeout(400);
  const loose = await sz();
  check('  詰めると答えの字が小さくなる', tight.main < loose.main, true);
  check('  詰めると声の行も小さくなる', tight.vf < loose.vf, true);
  check('  詰めると履歴が広くなる', tight.tape > loose.tape, true);
  check('  でも答えは読める大きさ', tight.main >= 26, true);
  await page.evaluate(() => setCompact('auto')); await page.waitForTimeout(400);

  // 設定の3つ並び
  await page.evaluate(() => { toggleSettings(); setSettingsTab(1); }); await page.waitForTimeout(500);
  check('  設定に3つ並ぶ', await page.evaluate(() =>
    [...document.querySelectorAll('#compactSeg button')].map(x => x.textContent).join('/')), '自動/ふつう/詰める');
  check('  いま選んでいるものに印', await page.evaluate(() =>
    document.querySelector('#compactSeg .on').dataset.cmp), 'auto');
  check('  いまどちらで出ているか言う', await page.evaluate(() =>
    document.getElementById('compactNow').textContent), 'いまは「詰める」で出ています');
  await page.evaluate(() => toggleSettings()); await page.waitForTimeout(400);

  // 声の行のマイク
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(400);
  check('  マイクのボタンがある', await page.evaluate(() => !!document.querySelector('.dt-voice-mic')), true);
  check('  指で押せる大きさ', await page.evaluate(() => {
    const r = document.querySelector('.dt-voice-mic').getBoundingClientRect();
    return Math.min(r.width, r.height) >= 30; }), true);
  check('  はじめの案内が押すよう促す', await page.evaluate(() =>
    document.getElementById('dtVoiceF').textContent), '🎤を押すと、声で計算できます');
  await page.evaluate(() => { window.__vs = 0; window.__realVoice = window.voiceStart;
    window.voiceStart = () => { window.__vs++; }; });
  await page.click('.dt-voice-mic'); await page.waitForTimeout(250);
  check('  マイクで声入力が始まる', await page.evaluate(() => window.__vs), 1);
  await page.evaluate(() => { dtVoiceGuessEx = null; document.getElementById('dtVoice').click(); });
  await page.waitForTimeout(250);
  check('  行を押しても始まる', await page.evaluate(() => window.__vs), 2);
  // 「もしかして」が出ているときは、そちらを先に試す
  await page.evaluate(() => { window.__try = 0; dtVoiceGuessEx = '1+1';
    window.__realTry = window.dtVoiceGuessTry; window.dtVoiceGuessTry = () => { window.__try++; };
    document.getElementById('dtVoice').click(); });
  await page.waitForTimeout(250);
  check('  もしかしてが出ていればそれを試す', await page.evaluate(() =>
    [window.__try, window.__vs].join('/')), '1/2');
  await page.evaluate(() => { window.voiceStart = window.__realVoice;
    window.dtVoiceGuessTry = window.__realTry; dtVoiceGuessEx = null; });

  // 長い式が数字のまん中で折れない
  check('  数字のまん中で折らない', await page.evaluate(() =>
    getComputedStyle(document.getElementById('dtVoiceF')).wordBreak), 'normal');
  await page.evaluate(() => { try { voiceAcceptDentaku('700かける34'); } catch (_) {} });
  await page.waitForTimeout(600);
  check('  式は1行におさまる', await page.evaluate(() => {
    const el = document.getElementById('dtVoiceF');
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 18;
    return Math.round(el.getBoundingClientRect().height / lh); }), 1);
  check('  聞こえた言葉も見えている', await page.evaluate(() => {
    const raw = document.getElementById('dtVoiceRaw'), box = document.getElementById('dtVoice');
    return raw.textContent !== '' && raw.getBoundingClientRect().bottom <= box.getBoundingClientRect().bottom + 1; }), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── 電卓だけにする v388 ── */
async function runCalcOnly(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 電卓だけにする ──');
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (dx, dy) => {
    const r = await page.evaluate(() => { const b = document.getElementById('numpadViewport').getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove',
        touchPoints: [{ x: r.x + (dx || 0) * i / 6, y: r.y + (dy || 0) * i / 6 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
  };
  const cur = () => page.evaluate(() => numpadPager.current());
  const tabs = () => page.evaluate(() =>
    [...document.querySelectorAll('#numpadPageBar .np-page')].map(x => x.textContent).join('/'));
  const closeTools = async () => { await page.evaluate(() => {
    if (isDlgOpen('veggieOverlay')) closeVeggie();
    if (isDlgOpen('tansuiOverlay')) closeTansui(); }); await page.waitForTimeout(500); };

  // 道具を2つ登録しておく
  await page.evaluate(() => { npTools = ['veggie', 'tansui']; saveNpTools(); applyNpToolFull(); renderNumpadPageBar(); });
  await page.waitForTimeout(300);
  check('  はじめはオフ', await page.evaluate(() => calcOnly), false);
  check('  はじめは全部のタブ', await tabs(), '書式・枠線/数字/記号/電卓/🌱野菜/💧単位水量/▲ マイキー');

  // オンにする
  await page.evaluate(() => toggleCalcOnly()); await page.waitForTimeout(700);
  check('  オンにできる', await page.evaluate(() => calcOnly), true);
  check('  電卓ページへ移る', await cur(), 'sci');
  check('  電卓モードになる', await page.evaluate(() => document.body.classList.contains('dentaku-mode')), true);
  check('  タブは電卓と道具だけ', await tabs(), '電卓/🌱野菜/💧単位水量');
  check('  ▲登録のタブも出さない', await page.evaluate(() =>
    !document.querySelector('#numpadPageBar .np-axis')), true);
  check('  ▦表へのキーは隠す', await page.evaluate(() =>
    getComputedStyle(document.querySelector('#numpadPageSci [data-key="dk_tosheet"]')).display), 'none');
  check('  空いた分は「桁」で埋める', await page.evaluate(() =>
    getComputedStyle(document.querySelector('#numpadPageSci [data-key="dk_dec"]')).gridColumn), 'span 2');

  // どこからも動かない
  for (const t of ['fmt', null, 'func', 'reg', 'regL', 'regR']) {
    await page.evaluate(x => numpadPager.go(x), t); await page.waitForTimeout(120);
  }
  check('  タブや go() で動かない', await cur(), 'sci');
  await page.evaluate(() => { const vp = document.getElementById('numpadViewport');
    vp.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })); });
  await page.waitForTimeout(350);
  check('  ホイールでも動かない', await cur(), 'sci');
  // 指を動かしているあいだも、下の数字ページがちらっとも見えない（v389）
  const dragPeek = async (dx) => {
    const r = await page.evaluate(() => { const b = document.getElementById('numpadViewport').getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
    let worst = 0;
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x + dx * i / 6, y: r.y }] });
      await page.waitForTimeout(30);
      const d = await page.evaluate(() => {
        const sci = document.getElementById('numpadPageSci').getBoundingClientRect();
        const vp = document.getElementById('numpadViewport').getBoundingClientRect();
        return Math.round(Math.abs(sci.left - vp.left)); });
      if (d > worst) worst = d;
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
    return worst;
  };
  check('  右へ指を動かしても1pxも動かない', await dragPeek(220), 0);
  check('  左へ指を動かしても1pxも動かない', await dragPeek(-220), 0);
  await closeTools();

  await swipe(220, 0);
  check('  右フリックでも動かない', await cur(), 'sci');
  await swipe(0, -320);
  check('  上フリック（登録）でも動かない', await cur(), 'sci');
  check('  表モードにもならない', await page.evaluate(() => document.body.classList.contains('dentaku-mode')), true);

  // 道具はそのまま開ける
  await swipe(-220, 0);
  check('  左フリックで道具が開く', await page.evaluate(() => isDlgOpen('veggieOverlay')), true);
  check('  道具を開いてもページは電卓', await cur(), 'sci');
  await closeTools();
  await page.evaluate(() => { const b = [...document.querySelectorAll('#numpadPageBar .np-tool')]
    .find(x => x.dataset.nptool === 'tansui'); if (b) b.click(); });
  await page.waitForTimeout(700);
  check('  タブからも道具が開く', await page.evaluate(() => isDlgOpen('tansuiOverlay')), true);
  await closeTools();

  // 覚えている
  await page.reload(); await page.waitForTimeout(1200);
  check('  開き直しても覚えている', await page.evaluate(() => calcOnly), true);
  check('  開き直しても電卓ページ', await cur(), 'sci');
  check('  開き直してもタブは2種', await tabs(), '電卓/🌱野菜/💧単位水量');

  // 戻せる
  await page.evaluate(() => toggleCalcOnly()); await page.waitForTimeout(600);
  check('  戻せる', await page.evaluate(() => calcOnly), false);
  check('  タブがぜんぶ戻る', await tabs(), '書式・枠線/数字/記号/電卓/🌱野菜/💧単位水量/▲ マイキー');
  check('  ▦表へも戻る', await page.evaluate(() =>
    getComputedStyle(document.querySelector('#numpadPageSci [data-key="dk_tosheet"]')).display !== 'none'), true);
  await page.evaluate(() => numpadPager.go('sci')); await page.waitForTimeout(400);
  check('  戻せばフリックで動くようになる', await dragPeek(220) > 0, true);
  await page.evaluate(() => numpadPager.go('fmt')); await page.waitForTimeout(400);
  check('  ほかのページへ行ける', await cur(), 'fmt');
  await swipe(-220, 0);
  check('  フリックも効く', await cur(), null);

  // 設定のボタン
  await page.evaluate(() => { toggleSettings(); setSettingsTab(1); }); await page.waitForTimeout(500);
  check('  設定にボタンがある', await page.evaluate(() =>
    document.getElementById('calcOnlyBtn').textContent.trim()), '🧮 電卓だけにする');
  check('  オフのときは印なし', await page.evaluate(() =>
    document.getElementById('calcOnlyBtn').classList.contains('on')), false);
  await page.evaluate(() => toggleCalcOnly()); await page.waitForTimeout(500);
  check('  オンにすると字が変わる', await page.evaluate(() =>
    document.getElementById('calcOnlyBtn').textContent.trim()), '🧮 電卓だけにしている（押すと戻す）');
  check('  オンのときは印が付く', await page.evaluate(() =>
    document.getElementById('calcOnlyBtn').classList.contains('on')), true);
  await page.evaluate(() => { toggleCalcOnly(); toggleSettings(); }); await page.waitForTimeout(450);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── 聞いている窓の置き場所 v390 ── */
async function runVoicePlace(browser) {
  console.log('\n── 聞いている窓の置き場所 ──');
  for (const [w, h, name] of [[412, 900, 'ふつうの画面'], [375, 667, 'iPhone SE']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
    await page.goto(INDEX); await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
    await page.reload(); await page.waitForTimeout(1000);
    await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(400);
    await page.evaluate(() => { try { voiceAcceptDentaku('100倍で4 L'); } catch (_) {} });
    await page.waitForTimeout(400);
    await page.evaluate(() => { openDlg('voiceOverlay'); voicePlace(); });
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const box = document.querySelector('#voiceOverlay .voice-box').getBoundingClientRect();
      const row = document.getElementById('dtVoice').getBoundingClientRect();
      return { over: box.bottom > row.top && box.top < row.bottom,
               above: box.bottom <= row.top, inScreen: box.top >= 0,
               tight: document.querySelector('#voiceOverlay .voice-box').classList.contains('voice-tight') };
    });
    check('  ' + name + '：聞こえました の行にかぶらない', r.over, false);
    check('  ' + name + '：行より上に置く', r.above, true);
    check('  ' + name + '：画面からはみ出さない', r.inScreen, true);
    check('  ' + name + '：聞こえた言葉が読める', await page.evaluate(() =>
      document.getElementById('dtVoiceRaw').textContent), '「100倍で4 L」と聞こえました');
    if (name === 'iPhone SE') check('  せまい画面では窓を小さくする', r.tight, true);
    if (name === 'ふつうの画面') check('  広い画面ではそのままの大きさ', r.tight, false);
    // 表モードのときは、行が無いのでまん中のまま
    await page.evaluate(() => { closeDlg('voiceOverlay'); }); await page.waitForTimeout(400);
    await page.evaluate(() => switchMode('normal')); await page.waitForTimeout(400);
    await page.evaluate(() => { openDlg('voiceOverlay'); voicePlace(); }); await page.waitForTimeout(300);
    check('  ' + name + '：表のときはまん中のまま', await page.evaluate(() => {
      const ov = document.getElementById('voiceOverlay');
      return ov.style.paddingBottom === '' && ov.style.alignItems === ''; }), true);
    await page.evaluate(() => { closeDlg('voiceOverlay'); }); await page.waitForTimeout(400);
    check('  ' + name + '：JSエラーが出ていない', errs.length, 0);
    if (errs.length) console.log('    ', errs);
    await ctx.close();
  }
}

/* ── 長い式・長い聞き取りを全部見る v391 ── */
async function runVoiceFull(browser) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  console.log('\n── 長い声の結果を全部見る ──');
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => switchMode('dentaku')); await page.waitForTimeout(400);

  const LONG_F = '上辺3メートル、下辺5メートル、高さ2メートルの台形 ＝ 8㎡　／　1mあたり 8㎥（水路や法面の断面に使えます）';
  const LONG_R = 'うわへん3メートル、したへん5メートル、たかさ2メートルのだいけい、みずろのだんめんをけいさんして';
  const st = () => page.evaluate(() => {
    const f = document.getElementById('dtVoiceF'), box = document.getElementById('dtVoice'),
          btn = document.getElementById('dtVoiceMore'), raw = document.getElementById('dtVoiceRaw');
    return { full: box.classList.contains('dt-voice-full'),
             btn: btn.hidden ? 'なし' : btn.textContent,
             fClip: f.scrollHeight > f.clientHeight + 1,
             rClip: raw.scrollHeight > raw.clientHeight + 1,
             h: Math.round(box.getBoundingClientRect().height) };
  });
  const show = (f, r) => page.evaluate(([a, b2]) => dtVoiceShow(a, b2, 'on'), [f, r]);

  let a = await st();
  check('  はじめはボタンを出さない', a.btn, 'なし');
  await show('251×68 ＝ 17068', '251かける68'); await page.waitForTimeout(300);
  a = await st();
  check('  短い結果でもボタンは出ない', a.btn, 'なし');
  check('  短い結果は切れていない', a.fClip, false);

  await show(LONG_F, LONG_R); await page.waitForTimeout(400);
  const short = await st();
  check('  長いと途中で切れる', short.fClip, true);
  check('  切れたら⌄が出る', short.btn, '⌄');

  await page.click('#dtVoiceMore'); await page.waitForTimeout(400);
  const full = await st();
  check('  ⌄を押すと開く', full.full, true);
  check('  開くと式が全部見える', full.fClip, false);
  check('  開くと聞こえた言葉も全部見える', full.rClip, false);
  check('  開くと箱が高くなる', full.h > short.h, true);
  check('  開いたら⌃に変わる', full.btn, '⌃');
  check('  読み上げの名前も変わる', await page.evaluate(() =>
    document.getElementById('dtVoiceMore').getAttribute('aria-label')), '短くする');

  await page.click('#dtVoiceMore'); await page.waitForTimeout(350);
  check('  ⌃で元に戻る', await st().then(x => [x.full, x.btn].join('/')), 'false/⌄');

  // 行そのものを押しても開け閉めできる
  await page.evaluate(() => document.getElementById('dtVoice').click()); await page.waitForTimeout(350);
  check('  行を押しても開く', await st().then(x => x.full), true);
  await page.evaluate(() => document.getElementById('dtVoice').click()); await page.waitForTimeout(350);
  check('  もう一度押すと閉じる', await st().then(x => x.full), false);

  // 新しい結果は短い形から
  await page.evaluate(() => document.getElementById('dtVoice').click()); await page.waitForTimeout(300);
  await show('251×68 ＝ 17068', '251かける68'); await page.waitForTimeout(350);
  check('  新しい結果は短い形に戻る', await st().then(x => [x.full, x.btn].join('/')), 'false/なし');

  // 🎤 と 📖 は今までどおり
  await page.evaluate(() => { window.__vs = 0; window.__rv = window.voiceStart; window.voiceStart = () => window.__vs++; });
  await page.click('.dt-voice-mic'); await page.waitForTimeout(250);
  check('  🎤は声入力のまま', await page.evaluate(() => window.__vs), 1);
  await show(LONG_F, LONG_R); await page.waitForTimeout(350);
  await page.click('.dt-voice-mic'); await page.waitForTimeout(250);
  check('  長くても🎤は声入力', await page.evaluate(() => window.__vs), 2);
  check('  🎤では開かない', await st().then(x => x.full), false);
  await page.evaluate(() => { window.voiceStart = window.__rv; });

  // 「もしかして」が出ているときは、そちらが先
  await page.evaluate(() => { dtAllClear(); voiceAcceptDentaku('1000ばいで20リットル'); });
  await page.waitForTimeout(400);
  check('  もしかしてのときは試すほうが先', await page.evaluate(async () => {
    document.getElementById('dtVoice').click();
    await new Promise(z => setTimeout(z, 250));
    return document.getElementById('dtMain').textContent; }), '20');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── ▦既定の大きさ のボタン v392 ── */
async function runDefSize(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 既定の大きさのボタン ──');
  const size = () => page.evaluate(() => ROWS + 'x' + COLS);
  const openMenu = async () => { await page.evaluate(() => {
    openMoreMenu(); const d = document.getElementById('moreAccMisc'); if (d) d.open = true; });
    await page.waitForTimeout(500); };
  const tapDef = async (id) => {
    await openMenu();
    const b = await page.evaluate(i => { const r = document.getElementById(i).getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }, id);
    await page.mouse.click(b.x, b.y); await page.waitForTimeout(600);
  };

  check('  はじめの大きさ', await size(), '15x3');
  // タップしたら設定が開く（表はまだ変わらない）
  await tapDef('defsizeTopBtn');
  check('  タップで設定が開く', await page.evaluate(() => isDlgOpen('defaultSizeOverlay')), true);
  check('  押しただけでは表を変えない', await size(), '15x3');
  check('  いまの既定が入っている', await page.evaluate(() =>
    document.getElementById('defRowsInput').value + '/' + document.getElementById('defColsInput').value), '15/3');
  check('  中に「いまの表を…」のボタンがある', await page.evaluate(() =>
    [...document.querySelectorAll('#defaultSizeOverlay button')].map(x => x.textContent.trim()).join('|')),
    '✕|この内容で保存|▦ いまの表をこの大きさにする');

  // 保存しても、いまの表は変わらない
  await page.evaluate(() => { document.getElementById('defRowsInput').value = '20';
    document.getElementById('defColsInput').value = '5'; saveDefaultSize(); });
  await page.waitForTimeout(500);
  check('  既定だけが変わる', await page.evaluate(() => getDefaultRows() + 'x' + getDefaultCols()), '20x5');
  check('  いまの表はそのまま', await size(), '15x3');
  check('  保存したら閉じる', await page.evaluate(() => isDlgOpen('defaultSizeOverlay')), false);

  // 中のボタンで、いまの表だけを変える（中身は残る）
  await page.evaluate(() => { data[0][0] = 'のこす'; buildSheet(); });
  await tapDef('defsizeTopBtn');
  await page.evaluate(() => applyDefaultSizeNow()); await page.waitForTimeout(600);
  check('  いまの表を変えられる', await size(), '20x5');
  check('  中身は消えない', await page.evaluate(() => data[0][0]), 'のこす');
  check('  終わったら閉じる', await page.evaluate(() => isDlgOpen('defaultSizeOverlay')), false);

  // 長押ししても同じ（設定が開くだけ）
  await openMenu();
  const bx = await page.evaluate(() => { const r = document.getElementById('defsizeTopBtn').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
  await page.mouse.move(bx.x, bx.y); await page.mouse.down(); await page.waitForTimeout(900);
  await page.mouse.up(); await page.waitForTimeout(700);
  check('  長押しでも設定が開く', await page.evaluate(() => isDlgOpen('defaultSizeOverlay')), true);
  check('  長押しでも表は変わらない', await size(), '20x5');
  await page.evaluate(() => closeDefaultSizeDlg()); await page.waitForTimeout(500);

  // 上のバーに出した ▦ でも同じ（⋯の窓は閉じてから押す）
  await page.evaluate(() => { if (isDlgOpen('moreMenuOverlay')) closeMoreMenu(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => toggleTopBtn('defsize')); await page.waitForTimeout(400);
  const tb = await page.evaluate(() => { const r = document.getElementById('tbDefsize').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
  await page.mouse.click(tb.x, tb.y); await page.waitForTimeout(600);
  check('  上のバーの▦でも設定が開く', await page.evaluate(() => isDlgOpen('defaultSizeOverlay')), true);
  await page.evaluate(() => { closeDefaultSizeDlg(); toggleTopBtn('defsize'); }); await page.waitForTimeout(500);

  // ▦通常 とのちがい（中身があれば大きさは変えない／空なら既定に戻す）
  await page.evaluate(() => { setSheetSize(5, 2); data[0][0] = 'のこす'; buildSheet(); switchMode('normal'); });
  await page.waitForTimeout(500);
  check('  ▦通常は中身があれば大きさを変えない', await size(), '5x2');
  await page.evaluate(() => { data[0][0] = ''; buildSheet(); switchMode('normal'); });
  await page.waitForTimeout(500);
  check('  ▦通常は空なら既定に戻す', await size(), '20x5');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── パソコン：セルのフォーカス居残り v393 ── */
async function runCellFocus(browser) {
  // パソコンの使い方を見たいので、指ではなくマウスとキーボードで操作する
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  console.log('\n── セルのフォーカス居残り ──');
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(1000);

  const at = () => page.evaluate(() => (document.activeElement && document.activeElement.id) || '');
  const selAt = () => page.evaluate(() => selR + ',' + selC);
  // ブラウザが黒い枠を描いているセル（:focus-visible かつ outline が消されていないもの）
  const ringed = () => page.evaluate(() => [...document.querySelectorAll('.cell')]
    .filter(e => e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none')
    .map(e => e.id).join(',') || 'なし');

  await page.click('#c2_2'); await page.waitForTimeout(300);
  check('  クリックでそのセルが選ばれる', await selAt(), '2,2');
  check('  クリックでそのセルにフォーカスが行く', await at(), 'c2_2');
  check('  クリックだけでは黒枠は出ない', await ringed(), 'なし');

  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(250);
  check('  ↓で選んだセルが動く', await selAt(), '3,2');
  check('  フォーカスも一緒に動く', await at(), 'c3_2');
  check('  元のセルに黒枠が残らない', await ringed(), 'なし');

  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  check('  続けて動かしても残らない', await ringed(), 'なし');
  check('  そのときもフォーカスは選んだセル', [await selAt(), await at()].join(' / '), '4,1 / c4_1');

  // 選んだセルには緑の枠が付く（見分けが付かなくならない）
  check('  選んだセルは緑の枠で分かる', await page.evaluate(() => {
    const e = document.getElementById('c4_1');
    return e.classList.contains('active') && getComputedStyle(e).borderTopWidth === '2px'; }), true);

  // 表の外にフォーカスがあるときは横取りしない
  await page.evaluate(() => { document.getElementById('formulaInput').focus(); sel(1, 1); });
  await page.waitForTimeout(250);
  check('  入力欄のフォーカスは横取りしない', await at(), 'formulaInput');
  check('  それでも選んだセルは動く', await selAt(), '1,1');

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}


/* ── 会計アプリ（kaikei/）──
   スマホ版とパソコン版の Excel のやりとりで、伝票が二重にならない・消えない・
   金額が別の列に入らないことを見る。見本は実物のパソコン版の出し方に合わせてある。 */
async function runKaikei(browser) {
  const T = require('./kaikei.test.js');
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  page.on('dialog', d => d.accept());
  await page.goto(KAIKEI);
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForTimeout(400);
  console.log('\n── 会計アプリ ──');

  // 日付と金額の読み取り
  const parsed = await page.evaluate(({ d, m }) => ({
    dates: d.map(([v]) => parseAnyDate(v, false)),
    moneys: m.map(([v]) => parseMoney(v)),
  }), { d: T.PARSE_DATE, m: T.PARSE_MONEY });
  T.PARSE_DATE.forEach(([v, want], i) => check(`  日付 ${JSON.stringify(v)}`, parsed.dates[i], want));
  T.PARSE_MONEY.forEach(([v, want], i) => check(`  金額 ${JSON.stringify(v)}`, parsed.moneys[i], want));

  // 年度は4月はじまり
  const fy = await page.evaluate(() => [fyOfStr('2026-03-31'), fyOfStr('2026-04-01')].join(','));
  check('  年度は4月はじまり', fy, '2025,2026');

  // ── パソコン版が出す Excel の見本を、そのまま読む ──
  const pc = await page.evaluate(async ({ tx, tr, sum }) => {
    const book = await buildXlsx([
      { name: '概要・残高', xml: sum }, { name: '取引一覧', xml: tx },
      { name: '振替', xml: tr }, { name: '科目別集計', rows: [['科目', '収入', '支出']] },
    ]);
    const sheets = await readWorkbook(await book.arrayBuffer());
    const t = sheets.find(s => s.name === '取引一覧');
    const det = detectHeader(t.grid, TX_FIELDS_ALLOW, needTx);
    const got = gridToItems(t.grid, det.row, det.map);
    const trS = sheets.find(s => s.name === '振替');
    const dt = detectHeader(trS.grid, TR_FIELDS_ALLOW, needTr);
    const gotTr = gridToTransfers(trS.grid, dt.row, dt.map);
    const accs = gridToAccounts(sheets.find(s => s.name === '概要・残高').grid);
    return {
      headerRow: det.row,
      fields: Object.keys(det.map).join(','),
      items: got.items.map(i => [i.date, i.kind, i.acc, i.cat, i.note, i.amt, i.event, i.memo]),
      skipped: got.skipped.length,
      transfers: gotTr.items.map(t2 => [t2.date, t2.from, t2.to, t2.amt, t2.note]),
      accs: accs.map(a => [a.acc, a.begin]),
    };
  }, { tx: T.PC_TX_XML, tr: T.PC_TR_XML, sum: T.PC_SUM_XML });
  check('  見出しの行を当てる', pc.headerRow, T.PC_EXPECT.headerRow);
  check('  どの列が何かを当てる', pc.fields, T.PC_EXPECT.fields.join(','));
  check('  読み取れた件数', pc.items.length, T.PC_EXPECT.items.length);
  T.PC_EXPECT.items.forEach((want, i) => check(`  ${i + 1}件目`, JSON.stringify(pc.items[i]), JSON.stringify(want)));
  check('  合計行は読み飛ばす', pc.skipped, T.PC_EXPECT.skipped);
  check('  振替も読める', JSON.stringify(pc.transfers), JSON.stringify(T.PC_EXPECT.transfers));
  check('  口座と期首残高も読める', JSON.stringify(pc.accs), JSON.stringify(T.PC_EXPECT.accounts));

  // 取り込んだあとの口座ごとの残高が、パソコン版の「現在残高」と合う
  const bal = await page.evaluate(async ({ tx, tr, sum }) => {
    const book = await buildXlsx([{ name: '概要・残高', xml: sum }, { name: '取引一覧', xml: tx }, { name: '振替', xml: tr }]);
    const sheets = await readWorkbook(await book.arrayBuffer());
    const t = sheets[1], d = detectHeader(t.grid, TX_FIELDS_ALLOW, needTx);
    const items = gridToItems(t.grid, d.row, d.map).items;
    const d2 = detectHeader(sheets[2].grid, TR_FIELDS_ALLOW, needTr);
    const trs = gridToTransfers(sheets[2].grid, d2.row, d2.map).items;
    S.year = 2026; S.items = []; S.transfers = []; S.accounts = []; S.begins = {};
    const bg = {};
    gridToAccounts(sheets[0].grid).forEach(a => { S.accounts.push(a.acc); bg[a.acc] = a.begin; });
    setBeginOf(2026, bg);
    S.items = mergeItems([], items, 'newer').items;
    S.transfers = mergeTransfers([], trs, 'newer').items;
    const a = accountSummary();
    return { rows: a.list.map(r => [r.acc, r.now]), total: a.sum.now, inSum: a.sum.in, outSum: a.sum.out };
  }, { tx: T.PC_TX_XML, tr: T.PC_TR_XML, sum: T.PC_SUM_XML });
  T.PC_EXPECT.balances.forEach(([acc, want], i) => check(`  ${acc}の残高`, JSON.stringify(bal.rows[i]), JSON.stringify([acc, want])));
  check('  残高の合計', bal.total, T.PC_EXPECT.balances.reduce((a, b) => a + b[1], 0));
  check('  収入合計（振替は入れない）', bal.inSum, 3250);
  check('  支出合計（振替は入れない）', bal.outSum, 30308);

  // 二度読みしても増えない。まったく同じ内容の2件は、2件のまま
  const twice = await page.evaluate(async ({ tx }) => {
    const sheets = await readWorkbook(await (await buildXlsx([{ name: '取引一覧', xml: tx }])).arrayBuffer());
    const d = detectHeader(sheets[0].grid, TX_FIELDS_ALLOW, needTx);
    const items = gridToItems(sheets[0].grid, d.row, d.map).items;
    const first = mergeItems([], items, 'newer');
    const second = mergeItems(first.items, items, 'newer');
    const third = mergeItems(second.items, items, 'newer');
    return {
      first: `${first.added}/${first.same}`,
      second: `${second.added}/${second.updated}/${second.same}`,
      third: third.items.length,
      dup: third.items.filter(i => i.note === '上水道 3月分').length,
    };
  }, { tx: T.PC_TX_XML });
  check('  はじめは5件入る（足/同）', twice.first, '5/0');
  check('  二度読みしても増えない（足/直/同）', twice.second, '0/0/5');
  check('  三度読んでも5件のまま', twice.third, 5);
  check('  同じ内容の2件は、1件に丸めない', twice.dup, 2);

  // すでに手で入れてある2件は重ならず、残りだけ入る
  const onMine = await page.evaluate(async ({ tx, mine }) => {
    const sheets = await readWorkbook(await (await buildXlsx([{ name: '取引一覧', xml: tx }])).arrayBuffer());
    const d = detectHeader(sheets[0].grid, TX_FIELDS_ALLOW, needTx);
    const items = gridToItems(sheets[0].grid, d.row, d.map).items;
    const r = mergeItems(mine, items, 'newer');
    return `${r.added}/${r.updated}/${r.same}/${r.items.length}`;
  }, { tx: T.PC_TX_XML, mine: T.MINE });
  check('  手で入れた2件は重ならない（足/直/同/残り）', onMine, '3/0/2/5');

  // 食い違ったときの決めごと
  const pol = await page.evaluate(({ mine, cases }) => cases.map(c => {
    const incoming = mine.map(i => Object.assign({}, i, i.note === 'コンパネ' ? { amt: 4000, ts: c.incomingTs } : { ts: c.incomingTs }));
    const r = mergeItems(mine, incoming, c.policy);
    const hit = r.items.find(i => i.note === 'コンパネ');
    return { tally: `${r.added}/${r.updated}/${r.same}`, amt: hit ? hit.amt : 0 };
  }), { mine: T.MINE, cases: T.POLICY_CASES });
  T.POLICY_CASES.forEach((c, i) => {
    check(`  ${c.policy}（更新 ${c.incomingTs}）の件数`, pol[i].tally, `${c.want.added}/${c.want.updated}/${c.want.same}`);
    check(`  ${c.policy}（更新 ${c.incomingTs}）の金額`, pol[i].amt, c.wantAmt);
  });

  // まるごと入れ替える（パソコン側で消した分を、こちらにも反映する）
  const prune = await page.evaluate(() => {
    const mk = (id, date, amt) => ({ id, date, kind: 'out', cat: '雑費', note: id, amt, acc: '現金', event: '', memo: '', ts: 1 });
    const mine = [mk('a-1', '2026-04-05', 100), mk('a-2', '2026-05-05', 200), mk('a-3', '2027-05-05', 300)];
    const excel = [mk('a-1', '2026-04-05', 100)];
    const off = mergeItems(mine, excel, 'newer');
    const on = mergeItems(mine, excel, 'newer', { prune: true });
    return {
      off: `${off.added}/${off.same}/${off.removed || 0}/${off.items.length}`,
      on: `${on.added}/${on.same}/${on.removed}/${on.items.length}`,
      left: on.items.map(i => i.id).join(','),
    };
  });
  check('  ふだんは消さない（足/同/消/残り）', prune.off, '0/1/0/3');
  check('  入れ替えなら消す（足/同/消/残り）', prune.on, '0/1/1/2');
  check('  別の年度の伝票は消さない', prune.left, 'a-1,a-3');

  // 書き出し → 読み戻し が、どの形でもぴったり合う
  for (const [form, label] of [['pcstd', 'パソコン版と同じ形'], ['full', '控え用のくわしい形']]) {
    const rt = await page.evaluate(async ({ tx, tr, sum, form }) => {
      const book = await buildXlsx([{ name: '概要・残高', xml: sum }, { name: '取引一覧', xml: tx }, { name: '振替', xml: tr }]);
      const sheets = await readWorkbook(await book.arrayBuffer());
      const d = detectHeader(sheets[1].grid, TX_FIELDS_ALLOW, needTx);
      const items = mergeItems([], gridToItems(sheets[1].grid, d.row, d.map).items, 'newer').items;
      const d2 = detectHeader(sheets[2].grid, TR_FIELDS_ALLOW, needTr);
      const trs = mergeTransfers([], gridToTransfers(sheets[2].grid, d2.row, d2.map).items, 'newer').items;
      const accs = {}; gridToAccounts(sheets[0].grid).forEach(a => accs[a.acc] = a.begin);
      const opt = { name: '○○区', year: 2026, accounts: Object.keys(accs), begin: accs, budget: {}, dev: 'aa1' };
      const out = (form === 'full') ? buildFullSheets(items, trs, opt) : buildPcStandard(items, trs, opt);
      const back = await readWorkbook(await (await buildXlsx(out)).arrayBuffer());
      const names = back.map(s => s.name);
      const bi = back.findIndex(s => /取引一覧|出納帳/.test(s.name));
      const dd = detectHeader(back[bi].grid, TX_FIELDS_ALLOW, needTx);
      const again = gridToItems(back[bi].grid, dd.row, dd.map);
      const m = mergeItems(items, again.items, 'newer');
      const ti = back.findIndex(s => s.name === '振替');
      const dt = detectHeader(back[ti].grid, TR_FIELDS_ALLOW, needTr);
      const mt = mergeTransfers(trs, gridToTransfers(back[ti].grid, dt.row, dt.map).items, 'newer');
      return {
        names: names.join(','),
        merge: `${m.added}/${m.updated}/${m.same}`,
        tr: `${mt.added}/${mt.updated}/${mt.same}`,
        dup: again.items.filter(i => i.note === '上水道 3月分').length,
        kinds: again.items.map(i => i.kind).join(','),
        accs: again.items.map(i => i.acc).join(','),
      };
    }, { tx: T.PC_TX_XML, tr: T.PC_TR_XML, sum: T.PC_SUM_XML, form });
    check(`  ${label}：シートの名前`, rt.names, form === 'full' ? '出納帳,振替,決算報告,やりとり' : '概要・残高,取引一覧,振替,科目別集計');
    check(`  ${label}：読み戻しても増えない（足/直/同）`, rt.merge, '0/0/5');
    check(`  ${label}：振替も増えない（足/直/同）`, rt.tr, '0/0/2');
    check(`  ${label}：同じ内容の2件も2件のまま`, rt.dup, 2);
    check(`  ${label}：収入と支出が入れかわらない`, rt.kinds, 'in,out,out,out,out');
    check(`  ${label}：口座も残る`, rt.accs, '信用金庫,現金,農協,農協,現金');
  }

  // パソコン版の「CSVを取り込み」用の CSV。見出しの並びと、取引・振替の入り方を固定する
  const csv = await page.evaluate(() => {
    const items = [
      { id: 'a-1', date: '2026-04-06', kind: 'in',  cat: '雑収入', note: '自販機', amt: 3250, acc: '信用金庫', event: '', memo: '', ts: 1 },
      { id: 'a-2', date: '2026-05-18', kind: 'out', cat: '行事費', note: 'お茶, お菓子', amt: 24800, acc: '現金', event: '秋祭り', memo: '3', ts: 2 },
    ];
    const trs = [{ id: 't-1', date: '2026-05-11', from: '農協', to: '現金', amt: 100000, note: '繰入', memo: '', ts: 3 }];
    const text = buildCsv(items, trs);
    const lines = text.replace(/^\ufeff/, '').split('\r\n').filter(Boolean);
    // 先頭に期首残高の行が入る。そのあとが日付の順で 04-06(取引) → 05-11(振替) → 05-18(取引)
    const rest = lines.slice(1).filter(l => !l.startsWith('期首残高'));
    return { bom: text.charCodeAt(0) === 0xFEFF, head: lines[0],
             ob: lines.filter(l => l.startsWith('期首残高')).length,
             tx: rest[0], tr: rest[1], ev: rest[2], n: rest.length + 1 };
  });
  check('  CSVはBOMつき（パソコン版が文字化けしない）', csv.bom, true);
  check('  CSVの見出しはパソコン版と同じ並び', csv.head, '種別,日付,口座,科目,摘要,収入,支出,振替元,振替先,振替額,備考,行事');
  check('  取引の行', csv.tx, '取引,2026-04-06,信用金庫,雑収入,自販機,3250,,,,,,');
  check('  カンマのある摘要は "" でくくる', csv.ev, '取引,2026-05-18,現金,行事費,"お茶, お菓子",,24800,,,,3,秋祭り');
  check('  振替の行（摘要はそのまま持つ）', csv.tr, '振替,2026-05-11,,,繰入,,,農協,現金,100000,,');
  check('  見出し＋3行', csv.n, 4);
  check('  期首残高の行も入る', csv.ob > 0, true);

  // その CSV を読み戻せる（パソコン版の「CSVに出力」も同じ形）
  const csvBack = await page.evaluate(() => {
    const items = [
      { id: 'a-1', date: '2026-04-06', kind: 'in',  cat: '雑収入', note: '自販機', amt: 3250, acc: '信用金庫', event: '', memo: '', ts: 1 },
      { id: 'a-2', date: '2026-05-18', kind: 'out', cat: '行事費', note: 'お茶, お菓子', amt: 24800, acc: '現金', event: '秋祭り', memo: '3', ts: 2 },
    ];
    const trs = [{ id: 't-1', date: '2026-05-11', from: '農協', to: '現金', amt: 100000, note: '繰入', memo: '', ts: 3 }];
    const sheets = [{ name: 'CSV', grid: csvToGrid(buildCsv(items, trs)) }];
    const d = detectHeader(sheets[0].grid, TX_FIELDS_ALLOW, needTx);
    const got = gridToItems(sheets[0].grid, d.row, d.map);
    const d2 = detectHeader(sheets[0].grid, TR_FIELDS_ALLOW, needTr);
    const gotTr = gridToTransfers(sheets[0].grid, d2.row, d2.map);
    const m = mergeItems(items, got.items, 'newer');
    const mt = mergeTransfers(trs, gotTr.items, 'newer');
    return {
      items: got.items.map(i => [i.date, i.kind, i.acc, i.cat, i.note, i.amt, i.event, i.memo]),
      trs: gotTr.items.map(t => [t.date, t.from, t.to, t.amt, t.note]),
      merge: `${m.added}/${m.updated}/${m.same}`,
      mergeTr: `${mt.added}/${mt.updated}/${mt.same}`,
    };
  });
  check('  CSVから取引を読み戻す', JSON.stringify(csvBack.items),
    JSON.stringify([['2026-04-06','in','信用金庫','雑収入','自販機',3250,'',''],
                    ['2026-05-18','out','現金','行事費','お茶, お菓子',24800,'秋祭り','3']]));
  check('  CSVから振替を読み戻す（振替の行は取引に混ざらない）', JSON.stringify(csvBack.trs),
    JSON.stringify([['2026-05-11','農協','現金',100000,'繰入']]));
  check('  CSVを読み戻しても増えない（足/直/同）', csvBack.merge, '0/0/2');
  check('  振替も増えない（足/直/同）', csvBack.mergeTr, '0/0/1');

  // 空のセルの書き方で、金額が別の列に入らないこと（v1 で踏んだところ）
  const tight = await page.evaluate(async () => {
    const mk = sp => `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>` +
      `<row r="1"><c r="A1" t="inlineStr"><is><t>日付</t></is></c><c r="B1" t="inlineStr"><is><t>収入</t></is></c><c r="C1" t="inlineStr"><is><t>支出</t></is></c><c r="D1" t="inlineStr"><is><t>科目</t></is></c></row>` +
      `<row r="2"><c r="A2" t="inlineStr"><is><t>2026-04-05</t></is></c><c r="B2" t="n"${sp}/><c r="C2" t="n"><v>500</v></c><c r="D2" t="inlineStr"><is><t>雑費</t></is></c></row>` +
      `</sheetData></worksheet>`;
    const out = [];
    for (const sp of ['', ' ']) {
      const sheets = await readWorkbook(await (await buildXlsx([{ name: 'x', xml: mk(sp) }])).arrayBuffer());
      const d = detectHeader(sheets[0].grid, TX_FIELDS_ALLOW, needTx);
      const it = gridToItems(sheets[0].grid, d.row, d.map).items[0];
      out.push(it ? `${it.kind}:${it.amt}` : 'なし');
    }
    return out.join(' / ');
  });
  check('  空のセルの閉じ方が違っても、支出は支出のまま', tight, 'out:500 / out:500');

  // v1（現金・口座しか持てなかった版）の控えを開ける
  const mig = await page.evaluate(() => {
    const old = { v: 1, name: '旧', year: 2026, beginCash: 1000, beginBank: 2000,
      items: [{ id: 'a', date: '2026-04-05', kind: 'in', cat: '会費', note: '', amt: 500, pay: 'bank', memo: '', ts: 1 }],
      cats: { in: ['会費'], out: ['雑費'] }, budget: {}, dev: 'zzz', seq: 1 };
    const m = migrate(JSON.parse(JSON.stringify(old)));
    return { accounts: m.accounts.join(','), begins: JSON.stringify(m.begins['2026']),
             acc: m.items[0].acc, pay: m.items[0].pay, v: m.v };
  });
  check('  v1の口座は現金と口座になる', mig.accounts, '現金,口座');
  check('  v1の繰越はその年度の期首残高になる', mig.begins, '{"現金":1000,"口座":2000}');
  check('  v1の記帳の口座が移る', mig.acc, '口座');
  check('  古い持ちかたは消える', mig.pay, undefined);

  // 読めない形のファイルは、どうすればよいかを言う
  const kinds = await page.evaluate(() => {
    const mk = bytes => new Uint8Array(bytes).buffer;
    return {
      xls: (fileKindProblem(mk([0xD0, 0xCF, 0x11, 0xE0, 0, 0, 0, 0]), 'kaikei.xls') || '').split('\n')[0],
      zip: fileKindProblem(mk([0x50, 0x4B, 3, 4, 0, 0, 0, 0]), 'kaikei.xlsm'),
      csv: fileKindProblem(mk([0x31, 0x2C, 0x32, 0x0A, 0, 0, 0, 0]), 'kaikei.csv'),
      other: (fileKindProblem(mk([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0]), 'a.pdf') || '').split('\n')[0],
    };
  });
  check('  古い .xls は、そう言って直し方を出す', kinds.xls, 'これは古い .xls 形式のファイルです。');
  check('  マクロつき(.xlsm)はそのまま読む', kinds.zip, null);
  check('  CSV はそのまま読む', kinds.csv, null);
  check('  ぜんぜん違う形は、読めないと言う', kinds.other, 'この形のファイルは読めません。');

  // 指で入れる：ふつうの記帳と、口座から口座への振替
  await page.evaluate(() => {
    localStorage.clear();
    S = blank(); S.year = 2026; S.accounts = ['現金', '農協'];
    setBeginOf(2026, { 現金: 10000, 農協: 50000 });
    saveNow(); renderAccChips(); renderTrSelects(); renderHead(); renderCatChips(); renderRecent(); go('entry');
  });
  await page.click('.kindsel button[data-kind="out"]');     // 先に「出した」にしてから科目を選ぶ
  await page.fill('#inAmount', '3000');
  await page.fill('#inDate', '2026-04-05');
  await page.click('#accChips button:has-text("農協")');
  await page.click('#catChips button:has-text("会議費")');
  await page.fill('#inNote', '役員会');
  await page.click('#saveBtn');
  await page.click('.kindsel button[data-kind="tr"]');
  await page.fill('#inAmount', '20000');
  await page.selectOption('#inFrom', '農協');
  await page.selectOption('#inTo', '現金');
  await page.click('#saveBtn');
  await page.waitForTimeout(200);
  const ui = await page.evaluate(() => {
    const a = accountSummary();
    return {
      items: S.items.length, trs: S.transfers.length,
      cash: a.list.find(r => r.acc === '現金').now,
      ja: a.list.find(r => r.acc === '農協').now,
      total: a.sum.now,
      head: document.getElementById('hdTotal').textContent,
    };
  });
  check('  記帳が1件入る', ui.items, 1);
  check('  振替が1件入る', ui.trs, 1);
  check('  現金は振替でふえる', ui.cash, 30000);
  check('  農協は支出と振替でへる', ui.ja, 27000);
  check('  合わせた残高は支出のぶんだけへる', ui.total, 57000);
  check('  上の帯の合計', ui.head, '57,000');
  check('  上の帯は口座ごとの残高を主役にする', await page.evaluate(() =>
    [...document.querySelectorAll('#hdAccs .hd-acc')].map(d =>
      d.querySelector('.n').textContent + '=' + d.querySelector('.v').textContent).join(' ')),
    '現金=30,000 農協=27,000');
  check('  合計の字は口座の字より小さい', await page.evaluate(() => {
    const t = parseFloat(getComputedStyle(document.querySelector('.hd-total b')).fontSize);
    const v = parseFloat(getComputedStyle(document.querySelector('.hd-acc .v')).fontSize);
    return t < v;
  }), true);

  // ── 出納帳の残高は、その取引をした口座の残高 ──
  const bookBal = await page.evaluate(() => {
    localStorage.clear(); S = blank(); S.year = 2026; S.accounts = ['現金', '農協'];
    setBeginOf(2026, { 現金: 100000, 農協: 500000 });
    const mk = (id, d, k, c, a, acc) => ({ id, date: d, kind: k, cat: c, note: c, amt: a, acc, event: '', memo: '', ts: 1 });
    S.items = [mk('a', '2026-04-05', 'in', '会費', 30000, '現金'),
               mk('b', '2026-04-10', 'out', '会議費', 5000, '現金'),
               mk('c', '2026-04-20', 'out', '水道光熱費', 8000, '農協')];
    S.transfers = [{ id: 't', date: '2026-05-01', from: '農協', to: '現金', amt: 50000, note: '', memo: '', ts: 1 }];
    saveNow(); renderAll(); go('book');
    const read = () => [...document.querySelectorAll('#bookList li')].map(li => {
      const b = li.querySelector('.li-bal');
      return li.querySelector('.li-date').textContent + ' ' + (b ? b.textContent.trim().replace(/\s+/g, ' ') : '-');
    }).join(' | ');
    const all = read();
    document.getElementById('fAcc').value = '農協'; renderBook();
    const ja = read();
    document.getElementById('fAcc').value = '現金'; renderBook();
    const cash = read();
    document.getElementById('fAcc').value = ''; renderBook();
    return { all, ja, cash, total: accountSummary().sum.now };
  });
  check('  その口座の残高を出す（合計ではない）', bookBal.all,
    '05/01 現金 175,000 | 04/20 農協 492,000 | 04/10 現金 125,000 | 04/05 現金 130,000');
  check('  振替は入った側の残高を出す', bookBal.all.indexOf('05/01 現金 175,000'), 0);
  check('  農協でしぼると農協の残高', bookBal.ja, '05/01 農協 442,000 | 04/20 農協 492,000');
  check('  現金でしぼると現金の残高', bookBal.cash,
    '05/01 現金 175,000 | 04/10 現金 125,000 | 04/05 現金 130,000');
  check('  合計は上の帯のまま', bookBal.total, 617000);

  // 残高のところに口座名が出るので、科目の横には出さない（振替と、残高の無い一覧は残す）
  const tags = await page.evaluate(() => {
    go('book'); document.getElementById('fAcc').value = ''; renderBook();
    const book = [...document.querySelectorAll('#bookList li')].map(li => {
      const t = li.querySelector('.pay-tag');
      return (li.querySelector('.li-cat').textContent) + ':' + (t ? t.textContent : 'なし');
    }).join(' | ');
    go('entry');
    const recent = [...document.querySelectorAll('#recentList li')].map(li => {
      const t = li.querySelector('.pay-tag');
      return (li.querySelector('.li-cat').textContent) + ':' + (t ? t.textContent : 'なし');
    }).join(' | ');
    return { book, recent };
  });
  check('  出納帳では科目の横に口座を出さない', tags.book,
    'ふりかえ:農協 → 現金 | 水道光熱費:なし | 会議費:なし | 会費:なし');
  check('  記帳の一覧は残高が無いので口座を残す', tags.recent,
    'ふりかえ:農協 → 現金 | 水道光熱費:農協 | 会議費:現金 | 会費:現金');

  // CSVの期首残高の行は、出納帳に出ない
  const obBook = await page.evaluate(({ csv }) => {
    localStorage.clear(); S = blank(); S.year = 2026; saveNow();
    const g = csvToGrid('\ufeff' + csv);
    const d = detectHeader(g, TX_FIELDS_ALLOW, needTx);
    const got = gridToItems(g, d.row, d.map);
    const rows = gridToOpeningRows(g, d.row, d.map);
    S.items = mergeItems([], got.items, 'newer').items;
    const d2 = detectHeader(g, TR_FIELDS_ALLOW, needTr);
    S.transfers = mergeTransfers([], gridToTransfers(g, d2.row, d2.map).items, 'newer').items;
    S.accounts = ['現金', '農協', '信用金庫'];
    const m = {}; rows.forEach(r => { m[r.acc] = r.begin; }); setBeginOf(2026, m);
    renderAll(); go('book');
    return {
      rows: [...document.querySelectorAll('#bookList li')].length,
      hasOpening: [...document.querySelectorAll('#bookList li')]
        .some(li => /期首残高/.test(li.textContent)),
      begin: accountSummary().sum.begin,
    };
  }, { csv: T.PC_CSV });
  check('  期首残高の行は出納帳に出ない', obBook.hasOpening, false);
  check('  取引と振替だけが出る', obBook.rows, 4);
  check('  期首残高は期首残高として入る', obBook.begin, 120698 + 915473);

  // ── 一般的な科目を入れる（分野べつ・チェックしたものだけ）──
  const std = await page.evaluate(() => {
    localStorage.clear(); S = blank(); S.year = 2026;
    S.cats.out.push('街路灯電気代');
    S.items = [{ id: 'x', date: '2026-04-05', kind: 'out', cat: '街路灯電気代', note: '', amt: 100, acc: '現金', event: '', memo: '', ts: 1 }];
    saveNow(); renderAll(); go('set');
    const before = S.cats.in.length + S.cats.out.length;
    openStdCats();                                  // 開いただけでは変わらない
    return {
      before,
      open: document.getElementById('dlgStdCat').open,
      cats: S.cats.in.length + S.cats.out.length,
      groups: STD_CAT_GROUPS.length,
      items: document.querySelectorAll('.std-item').length,
      had: document.querySelectorAll('.std-item.had').length,
      selected: stdSelected().in.length + stdSelected().out.length,
      btnOff: document.getElementById('stdAddBtn').disabled,
      kind: stdKind,
      mixedIn: [...document.querySelectorAll('.std-item .nm')].some(e =>
        ['消耗品費', '種苗費', '仕入高'].includes(e.textContent)),
    };
  });
  check('  窓が開く', std.open, true);
  check('  開いただけでは科目は変わらない', std.cats, std.before);
  check('  分野の数', std.groups, 12);
  check('  入るお金の一覧に出る数', std.items, 40);
  check('  もう入っているものは印がつく', std.had > 0, true);
  check('  はじめは「入るお金」の一覧', std.kind, 'in');
  check('  入るお金の一覧に支出の科目は出ない', std.mixedIn, false);
  check('  はじめは何も選ばれていない', std.selected, 0);
  check('  選ぶまで入れられない', std.btnOff, true);

  // 出るお金の一覧に切り替えられる
  const outTab = await page.evaluate(() => {
    stdSetKind('out');
    return { kind: stdKind,
             items: document.querySelectorAll('.std-item').length,
             mixed: [...document.querySelectorAll('.std-item .nm')].some(e =>
               ['売上高', '会費', '部費'].includes(e.textContent)) };
  });
  check('  出るお金に切り替わる', outTab.kind, 'out');
  check('  出るお金の一覧に出る数', outTab.items, 86);
  check('  出るお金の一覧に収入の科目は出ない', outTab.mixed, false);

  // 分野ごとに選べる（農業だけ）。入るお金・出るお金それぞれで選ぶ
  const pick = await page.evaluate(() => {
    const gi = STD_CAT_GROUPS.findIndex(g => g.g === '農業');
    stdSetKind('in'); stdGroupAll(gi, true);
    stdSetKind('out'); stdGroupAll(gi, true);
    const sel = stdSelected();
    return { n: sel.in.length + sel.out.length, btn: document.getElementById('stdAddBtn').textContent,
             inCats: sel.in.join(','), only農業: sel.out.includes('種苗費') && !sel.out.includes('食材仕入高'),
             tabs: [...document.querySelectorAll('#dlgStdCatBody .kindsel button')].map(b => b.textContent.trim()).join(' / ') };
  });
  check('  分野をまとめて選べる', pick.n, 12);
  check('  切り替えのところに件数が出る', pick.tabs, '＋ 入るお金（3） / − 出るお金（9）');
  check('  ボタンに内わけが出る', pick.btn, 'チェックした 12件（入3・出9） を入れる');
  check('  その分野のものだけ', pick.only農業, true);
  check('  収入の科目も選ばれる', pick.inCats, '農産物売上高,共済金収入,交付金収入');

  const stdAdd = await page.evaluate(() => {
    applyStdCats('add');                            // 確認は自動で「はい」
    return { in: S.cats.in.length, out: S.cats.out.length,
             keptOld: S.cats.out.includes('街路灯電気代'),
             keptDefault: S.cats.in.includes('会費'),
             got: S.cats.out.includes('種苗費') && S.cats.in.includes('農産物売上高'),
             notPicked: !S.cats.out.includes('食材仕入高'),
             closed: !document.getElementById('dlgStdCat').open };
  });
  check('  チェックした分だけ入る（収入）', stdAdd.in, 6 + 3);
  check('  チェックした分だけ入る（支出）', stdAdd.out, 9 + 1 + 9);
  check('  もとからの科目は残る', stdAdd.keptOld, true);
  check('  既定の科目も残る', stdAdd.keptDefault, true);
  check('  選んだ科目が入る', stdAdd.got, true);
  check('  選んでいない分野は入らない', stdAdd.notPicked, true);
  check('  入れたら窓は閉じる', stdAdd.closed, true);

  // もう一度開くと、入れたものは「もう入っている」印
  const again = await page.evaluate(() => {
    openStdCats(); stdSetKind('out');
    const had = [...document.querySelectorAll('.std-item.had .nm')].map(e => e.textContent);
    return { hasSeed: had.includes('種苗費'), sel: stdSelected().in.length + stdSelected().out.length };
  });
  check('  入れた科目には印がつく', again.hasSeed, true);
  check('  チェックは外れている', again.sel, 0);

  // 「チェックしたものだけにする」は入れ替え
  const stdRep = await page.evaluate(() => {
    stdSetKind('in'); stdAllGroups(false);
    stdSetKind('out'); stdAllGroups(false);
    const gi = STD_CAT_GROUPS.findIndex(g => g.g === 'どの帳面でも使う');
    stdSetKind('in'); stdGroupAll(gi, true);
    stdSetKind('out'); stdGroupAll(gi, true);
    // すでに入っているものは選べないので、入れ替え後はチェックしたものだけになる
    const want = stdSelected();
    applyStdCats('replace');
    return { in: S.cats.in.length, out: S.cats.out.length,
             wanted: want.in.length + want.out.length,
             oldGone: !S.cats.out.includes('街路灯電気代'),
             itemKept: S.items[0].cat };
  });
  check('  入れ替えるとチェックしたものだけ', `${stdRep.in}/${stdRep.out}`, `${stdRep.wanted - stdRep.out}/${stdRep.out}`);
  check('  もとの科目は一覧から消える', stdRep.oldGone, true);
  check('  記帳した中身は消えない', stdRep.itemKept, '街路灯電気代');

  // 名前は「会計アプリ」
  const naming = await page.evaluate(() => {
    localStorage.clear(); S = blank(); saveNow(); renderAll();
    return { title: document.title, head: document.getElementById('hdName').textContent };
  });
  check('  タイトルは会計アプリ', naming.title, '会計アプリ');
  check('  上の帯も会計アプリ', naming.head, '会計アプリ');

  // ── 年度の切り替え ──
  const yr = await page.evaluate(() => {
    localStorage.clear();
    S = blank(); S.name = '○○区'; S.year = 2026; S.accounts = ['現金', '農協'];
    S.begins = { '2025': { 現金: 10000, 農協: 50000 }, '2026': { 現金: 120698, 農協: 915473 } };
    const mk = (id, d, k, c, a, acc) => ({ id, date: d, kind: k, cat: c, note: c, amt: a, acc, event: '', memo: '', ts: 1 });
    S.items = [mk('a', '2025-05-01', 'in', '会費', 50000, '現金'),
               mk('b', '2025-06-01', 'out', '会議費', 3000, '現金'),
               mk('c', '2026-04-05', 'in', '会費', 96000, '現金'),
               mk('d', '2026-05-10', 'out', '会議費', 3240, '農協')];
    S.transfers = [{ id: 't', date: '2026-06-01', from: '農協', to: '現金', amt: 20000, note: '', memo: '', ts: 1 }];
    saveNow(); renderAll();
    const out = { years: knownYears().join(','), head2026: document.getElementById('hdTotal').textContent };
    const a26 = accountSummary();
    out.begin2026 = a26.sum.begin; out.now2026 = a26.sum.now; out.n2026 = yearItems().length;
    setYear(2025);
    const a25 = accountSummary();
    out.head2025 = document.getElementById('hdTotal').textContent;
    out.begin2025 = a25.sum.begin; out.now2025 = a25.sum.now; out.n2025 = yearItems().length;
    out.yearLabel = document.getElementById('hdYear').textContent;
    out.bookRows = document.querySelectorAll('#bookList li').length;
    setYear(2026);
    out.backTotal = document.getElementById('hdTotal').textContent;
    return out;
  });
  check('  帳面に出てくる年度を並べる', yr.years, '2026,2025');
  check('  2026年度の期首（年度ごと）', yr.begin2026, 1036171);
  check('  2026年度の残高', yr.now2026, 1036171 + 96000 - 3240);
  check('  2026年度の件数', yr.n2026, 2);
  check('  2025年度に切り替わる', yr.yearLabel.indexOf('2025年度'), 0);
  check('  2025年度の期首は別に持つ', yr.begin2025, 60000);
  check('  2025年度の残高', yr.now2025, 60000 + 50000 - 3000);
  check('  2025年度の件数', yr.n2025, 2);
  check('  出納帳も切り替わる', yr.bookRows, 2);
  check('  上の帯も切り替わる', yr.head2025, '107,000');
  check('  戻せる', yr.backTotal, '1,128,931');

  // 年度を押したら窓が出て、その年度の残高が見える
  await page.evaluate(() => openYearPick());
  await page.waitForTimeout(250);
  const ypick = await page.evaluate(() => ({
    open: document.getElementById('dlgYear').open,
    rows: [...document.querySelectorAll('#dlgYearBody .yr-row')].map(r => r.querySelector('.y').textContent).join(','),
    cur: (document.querySelector('#dlgYearBody .yr-row[aria-current="true"] .y') || {}).textContent,
  }));
  check('  年度えらびの窓が開く', ypick.open, true);
  check('  年度が並ぶ', ypick.rows, '2026年度,2025年度');
  check('  いまの年度に印が付く', ypick.cur, '2026年度');
  await page.evaluate(() => dlgYear.close());

  // 期首残高を年度ごとに持つ（v2の控えからの引き上げ）
  const mig3 = await page.evaluate(() => {
    const old = { v: 2, name: '旧', year: 2026, accounts: ['現金', '農協'],
      begin: { 現金: 1000, 農協: 2000 }, items: [], transfers: [],
      cats: { in: [], out: [] }, budget: {}, dev: 'zzz', seq: 1 };
    const m = migrate(JSON.parse(JSON.stringify(old)));
    return { v: m.v, has2026: JSON.stringify(m.begins['2026']), oldGone: m.begin === undefined };
  });
  check('  v2は v3 に上がる', mig3.v, 3);
  check('  繰越はその年度のものになる', mig3.has2026, '{"現金":1000,"農協":2000}');
  check('  古い持ちかたは消える', mig3.oldGone, true);

  // ── 読み込んだファイルの年度に切り替える ──
  // 出している年度と違う年度のファイルを読むと、入ったのに画面が空のままに見えていた
  const impYr = await page.evaluate(async ({ tx, tr, sum }) => {
    localStorage.clear(); S = blank(); S.year = 2025; saveNow(); renderAll();
    const book = await buildXlsx([{ name: '概要・残高', xml: sum }, { name: '取引一覧', xml: tx },
                                  { name: '振替', xml: tr }]);
    const sheets = await readWorkbook(await book.arrayBuffer());
    // onImportFile と同じ組み立て
    IMP = { file: 't.xlsx', sheets, si: 1, policy: 'newer', prune: false,
            trI: 2, trOn: true, accRows: gridToAccounts(sheets[0].grid), accOn: true };
    applyDetect();
    const { got, tr: trRead } = impPreview();
    const before = { year: S.year, years: impYears(got, trRead).join(',') };
    doImport();
    const a = accountSummary();
    return { before, year: S.year, begin: a.sum.begin, now: a.sum.now,
             items: yearItems().length, head: document.getElementById('hdTotal').textContent,
             begins: Object.keys(S.begins).join(',') };
  }, { tx: T.PC_TX_XML, tr: T.PC_TR_XML, sum: T.PC_SUM_XML });
  check('  ファイルの年度を読み取る', impYr.before.years, '2026');
  check('  読み込む前は2025年度を出していた', impYr.before.year, 2025);
  check('  読み込んだ年度に切り替わる', impYr.year, 2026);
  check('  期首残高はその年度に入る', impYr.begins, '2026');
  // 見本の「概要・残高」は 現金・農協・信用金庫・定期預金 の4口座
  check('  期首残高が出る', impYr.begin, 120698 + 915473 + 1243299 + 2100779);
  check('  記帳もその年度に出る', impYr.items, 5);
  check('  上の帯にも出る', impYr.head !== '0', true);

  // ── パソコン版のCSVの「期首残高」の行 ──
  const ob = await page.evaluate(({ csv }) => {
    localStorage.clear(); S = blank(); S.year = 2026; saveNow();
    const sheets = [{ name: 'CSV', grid: csvToGrid('\ufeff' + csv) }];
    const d = detectHeader(sheets[0].grid, TX_FIELDS_ALLOW, needTx);
    const got = gridToItems(sheets[0].grid, d.row, d.map);
    const rows = gridToOpeningRows(sheets[0].grid, d.row, d.map);
    const d2 = detectHeader(sheets[0].grid, TR_FIELDS_ALLOW, needTr);
    const tr = gridToTransfers(sheets[0].grid, d2.row, d2.map);
    return {
      items: got.items.length,
      kinds: got.items.map(i => i.kind).join(','),
      inSum: got.items.filter(i => i.kind === 'in').reduce((a, i) => a + i.amt, 0),
      outSum: got.items.filter(i => i.kind === 'out').reduce((a, i) => a + i.amt, 0),
      skipped: got.skipped.length,
      openings: rows.map(r => `${r.year}:${r.acc}=${r.begin}`).join(' '),
      trs: tr.items.length,
    };
  }, { csv: T.PC_CSV });
  check('  期首残高の行は取引にしない', ob.items, 3);
  check('  収入に足されない', ob.inSum, 3250);
  check('  支出はそのまま', ob.outSum, 2068 + 24800);
  check('  形式不正にもしない（振替の行もふくめて）', ob.skipped, 0);
  check('  期首残高として読む', ob.openings, '2026:現金=120698 2026:農協=915473');
  check('  振替も読める', ob.trs, 1);

  // 書き出した CSV にも、同じ形で期首残高の行が入る
  const obOut = await page.evaluate(() => {
    S = blank(); S.year = 2026; S.accounts = ['現金', '農協'];
    setBeginOf(2026, { 現金: 120698, 農協: 915473 });
    const items = [{ id: 'a', date: '2026-04-06', kind: 'in', cat: '雑収入', note: '自販機',
                     amt: 3250, acc: '現金', event: '', memo: '', ts: 1 }];
    const lines = buildCsv(items, [], [2026]).replace(/^\ufeff/, '').split('\r\n');
    return { head: lines[0], ob1: lines[1], ob2: lines[2], tx: lines[3] };
  });
  check('  書き出しも同じ見出し', obOut.head, '種別,日付,口座,科目,摘要,収入,支出,振替元,振替先,振替額,備考,行事');
  check('  期首残高の行を先頭に置く', obOut.ob1, '期首残高,2026-04-01,現金,,期首残高,120698,,,,,,');
  check('  口座ごとに1行', obOut.ob2, '期首残高,2026-04-01,農協,,期首残高,915473,,,,,,');
  check('  そのあとに取引', obOut.tx, '取引,2026-04-06,現金,雑収入,自販機,3250,,,,,,');

  // 読み戻すと、期首残高まで同じになる
  const obRound = await page.evaluate(() => {
    S = blank(); S.year = 2026; S.accounts = ['現金', '農協'];
    setBeginOf(2026, { 現金: 120698, 農協: 915473 });
    const items = [{ id: 'a', date: '2026-04-06', kind: 'in', cat: '雑収入', note: '自販機',
                     amt: 3250, acc: '現金', event: '', memo: '', ts: 1 }];
    const csv = buildCsv(items, [], [2026]);
    const g = csvToGrid(csv.replace(/^\ufeff/, ''));
    const d = detectHeader(g, TX_FIELDS_ALLOW, needTx);
    const got = gridToItems(g, d.row, d.map);
    const rows = gridToOpeningRows(g, d.row, d.map);
    const m = mergeItems(items, got.items, 'newer');
    return { merge: `${m.added}/${m.updated}/${m.same}`,
             openings: rows.map(r => `${r.acc}=${r.begin}`).join(' ') };
  });
  check('  読み戻しても増えない（足/直/同）', obRound.merge, '0/0/1');
  check('  期首残高も戻る', obRound.openings, '現金=120698 農協=915473');

  // ── CSVを読み込むと、科目・口座・行事が登録される ──
  const reg = await page.evaluate(async () => {
    localStorage.clear(); S = blank(); S.year = 2026; saveNow();
    const csv = '\ufeff' + [
      '種別,日付,口座,科目,摘要,収入,支出,振替元,振替先,振替額,備考,行事',
      '取引,2026-04-06,信用金庫,〇仮受金,自販機,3250,,,,,,',
      '取引,2026-04-08,現金,●立替金,コンパネ,,2068,,,,,',
      '取引,2026-05-18,現金,街路灯電気代,6月分,,8351,,,,,秋祭り',
      '振替,2026-05-11,,,,,,農協,現金,100000,,',
    ].join('\r\n') + '\r\n';
    const sheets = [{ name: 'CSV', grid: csvToGrid(csv) }];
    const d = detectHeader(sheets[0].grid, TX_FIELDS_ALLOW, needTx);
    const got = gridToItems(sheets[0].grid, d.row, d.map);
    const d2 = detectHeader(sheets[0].grid, TR_FIELDS_ALLOW, needTr);
    const tr = gridToTransfers(sheets[0].grid, d2.row, d2.map);
    // doImport と同じ後始末をする
    S.items = mergeItems([], got.items, 'newer').items;
    S.transfers = mergeTransfers([], tr.items, 'newer').items;
    const newCats = [];
    got.items.forEach(i => {
      if (i.cat && !S.cats[i.kind].includes(i.cat)) { S.cats[i.kind].push(i.cat); newCats.push(i.cat); }
      if (i.event && !S.events.includes(i.event)) S.events.push(i.event);
    });
    const before = S.accounts.slice();
    syncAccounts();
    return {
      newCats: newCats.join(','),
      inCats: S.cats.in.includes('〇仮受金'),
      outCats: S.cats.out.filter(c => ['●立替金', '街路灯電気代'].includes(c)).join(','),
      newAccs: S.accounts.filter(a => !before.includes(a)).join(','),
      events: S.events.join(','),
    };
  });
  check('  CSVの科目を登録する', reg.newCats, '〇仮受金,●立替金,街路灯電気代');
  check('  収入の科目は収入側へ', reg.inCats, true);
  check('  支出の科目は支出側へ', reg.outCats, '●立替金,街路灯電気代');
  check('  口座も登録する（振替の口座もふくむ）', reg.newAccs, '信用金庫,農協');
  check('  行事も登録する', reg.events, '秋祭り');

  // ── 決算書類 ──────────────────────────────────────────
  // 入れた中身から、そのまま総会に出せる紙が作れること。
  // 数えかたは集計の画面と同じ（振替は収入・支出に入れない）。
  const fin = await page.evaluate(({ st }) => {
    localStorage.clear(); S = blank();
    S.year = st.year; S.name = st.name; S.accounts = st.accounts.slice();
    setBeginOf(st.year, Object.assign({}, st.begins));
    S.cats = { in: st.cats.in.slice(), out: st.cats.out.slice() };
    S.budget = Object.assign({}, st.budget);
    S.items = st.items.map(i => Object.assign({}, i));
    S.transfers = st.transfers.map(t => Object.assign({}, t));
    finOpt().docs = { settle: true, budget: true, assets: true, detail: true, audit: true };
    renderAll(); go('fin');
    const d = finData();
    const rowOf = nm => {
      const tr = Array.from(document.querySelectorAll('#finPaper .fin-doc:first-of-type tr'))
        .find(r => r.cells[0] && r.cells[0].textContent.trim() === nm);
      return tr ? Array.from(tr.cells).map(c => c.textContent.trim()) : null;
    };
    return {
      begin: d.begin, tIn: d.tIn, tOut: d.tOut, end: d.end, gap: d.gap, now: d.sum.now,
      inRows: d.inRows.map(r => `${r.cat}:${r.amt}:${r.n}`).join(','),
      outRows: d.outRows.map(r => `${r.cat}:${r.amt}:${r.n}`).join(','),
      accs: d.accs.map(r => `${r.acc}:${r.now}`).join(','),
      heads: Array.from(document.querySelectorAll('#finPaper .fin-doc:first-of-type thead th')).map(t => t.textContent.trim()).join(','),
      carry: rowOf('前年度からの繰越金'),
      kaihi: rowOf('会費'),
      titles: Array.from(document.querySelectorAll('#finPaper .fin-doc h3')).map(h => h.textContent).join('|'),
      sheets: buildFinSheets().map(s => s.name).join(','),
      text: finTextOut(),
    };
  }, { st: T.FIN_STATE });
  check('  期首残高', fin.begin, T.FIN_EXPECT.begin);
  check('  収入合計（振替は入れない）', fin.tIn, T.FIN_EXPECT.tIn);
  check('  支出合計（振替は入れない）', fin.tOut, T.FIN_EXPECT.tOut);
  check('  次年度への繰越金', fin.end, T.FIN_EXPECT.end);
  check('  財産目録の合計と合う', fin.now, T.FIN_EXPECT.now);
  check('  食い違いは0', fin.gap, 0);
  check('  収入の科目（設定の順）', fin.inRows, T.FIN_EXPECT.inRows);
  check('  支出の科目（設定に無いものは後ろ）', fin.outRows, T.FIN_EXPECT.outRows);
  check('  口座ごとの残高', fin.accs, T.FIN_EXPECT.accs);
  check('  4つの書類が出る', fin.titles, '収支決算書|財産目録|科目べつの明細|監査報告書');
  check('  Excelも4枚', fin.sheets, '収支決算書,財産目録,明細,監査報告書');
  // 予算の列を出したとき、金額がとなりの列にずれないこと（作っている途中に踏んだ）
  check('  見出しの並び', fin.heads, '科目,予算,決算額,差引,件数');
  check('  繰越の金額は決算額の列', JSON.stringify(fin.carry), JSON.stringify(['前年度からの繰越金', '', '1,036,171', '', '']));
  check('  科目の行は予算・決算額・差引', JSON.stringify(fin.kaihi), JSON.stringify(['会費', '900,000', '850,000', '50,000', '1件']));
  check('  文字でも出せる', /次年度への繰越金\s+1,885,133 円/.test(fin.text), true);
  check('  文字にも財産目録が入る', fin.text.includes('【財産目録（2027年3月31日 現在）】'), true);

  // チェックを外した書類は出ない
  const finPick = await page.evaluate(() => {
    finOpt().docs = { settle: false, budget: false, assets: true, detail: false, audit: false };
    renderFin();
    return {
      titles: Array.from(document.querySelectorAll('#finPaper .fin-doc h3')).map(h => h.textContent).join('|'),
      sheets: buildFinSheets().map(s => s.name).join(','),
      empty: (finOpt().docs = { settle: false, budget: false, assets: false, detail: false, audit: false },
              renderFin(), document.getElementById('finPaper').textContent.trim()),
    };
  });
  check('  チェックしたものだけ出る', finPick.titles, '財産目録');
  check('  Excelもチェックしたものだけ', finPick.sheets, '財産目録');
  check('  ぜんぶ外したら、そう言う', finPick.empty, '出す書類にチェックを入れてください');

  // 書類の名前と日づけは、次に開いたときも残る
  const finKeep = await page.evaluate(() => {
    finOpt().docs = { settle: true, budget: false, assets: true, detail: false, audit: true };
    finField('maker', '会計 太郎'); finField('aud1', '監査 一郎'); finField('date', '2027-04-20');
    saveNow();
    const before = JSON.stringify(S.fin);
    S = blank(); load();
    renderFin();
    return { same: JSON.stringify(S.fin) === before,
             onPaper: document.getElementById('finPaper').textContent.includes('2027年4月20日'),
             maker: document.getElementById('finPaper').textContent.includes('会計 太郎') };
  });
  check('  名前と日づけが残る', finKeep.same, true);
  check('  書類に日づけが出る', finKeep.onPaper, true);
  check('  書類に会計担当者が出る', finKeep.maker, true);

  // 作成日をえらべること（きょう／年度末）
  const finDate = await page.evaluate(() => {
    const out = {};
    finSetDate('end');
    out.end = S.fin.date;
    out.onPaperEnd = document.getElementById('finPaper').textContent.includes('2027年3月31日');
    finSetDate('today');
    out.today = S.fin.date === todayStr();
    out.fieldIsToday = document.getElementById('finDate').value === todayStr();
    finField('date', '2027-05-01');
    out.picked = document.getElementById('finPaper').textContent.includes('2027年5月1日');
    finField('date', '');
    out.emptyIsToday = document.getElementById('finPaper').textContent.includes(jpDate(todayStr()));
    return out;
  });
  check('  年度末をえらべる', finDate.end, '2027-03-31');
  check('  年度末が紙に出る', finDate.onPaperEnd, true);
  check('  きょうをえらべる', finDate.today, true);
  check('  えらんだ日が欄にも入る', finDate.fieldIsToday, true);
  check('  えらんだ日が紙に出る', finDate.picked, true);
  check('  空ならきょうの日づけ', finDate.emptyIsToday, true);

  // 1つの書類は、署名欄まで紙1枚に収める（科目が多いときは印刷で縮める）
  const finFit = await page.evaluate(({ st }) => {
    const mk = n => {
      S = blank(); S.year = st.year; S.name = st.name; S.accounts = ['現金'];
      setBeginOf(st.year, { 現金: 120698 });
      S.cats = { in: [], out: [] }; S.items = []; S.budget = {};
      for (let i = 0; i < n; i++) {
        S.cats.in.push('収入科目' + i); S.cats.out.push('支出科目' + i);
        S.budget['収入科目' + i] = 10000 * (i + 1);
        S.items.push({ id: 'i' + i, date: '2026-05-11', kind: 'in', cat: '収入科目' + i, note: 'あ', amt: 1000 + i, acc: '現金', event: '', memo: '', ts: i });
        S.items.push({ id: 'o' + i, date: '2026-06-11', kind: 'out', cat: '支出科目' + i, note: 'い', amt: 500 + i, acc: '現金', event: '', memo: '', ts: i });
      }
      finOpt().maker = '会計 太郎';
    };
    const zoomOf = () => Array.from(document.querySelectorAll('#finPaper .fin-doc[data-fit]'))
      .map(d => Number(d.style.getPropertyValue('--fin-zoom')));
    mk(4); finOpt().docs = { settle: true, budget: true, twocol: false, assets: true, detail: false, audit: true };
    renderAll(); go('fin');
    const few = { zoom: zoomOf(), note: document.getElementById('finFitNote').style.display };
    mk(30); finOpt().docs = { settle: true, budget: true, twocol: false, assets: true, detail: false, audit: true };
    renderAll(); go('fin');
    const many = { zoom: zoomOf(), note: document.getElementById('finFitNote').textContent };
    finToggle('twocol', true);
    const two = { zoom: zoomOf(), sums: null };
    // 左右2段では、左の合計と右の合計がかならず同じ額になる
    const d = finData();
    two.sums = [d.begin + d.tIn, d.tOut + d.end];
    two.cols = Array.from(document.querySelectorAll('#finPaper .fin-doc:first-of-type .fin-two > table')).length;
    // 明細は何ページになってもよいので、縮めない
    finOpt().docs = { settle: false, budget: false, twocol: false, assets: false, detail: true, audit: false };
    renderFin();
    const detail = document.querySelectorAll('#finPaper .fin-doc[data-fit]').length;
    return { few, many, two, detail };
  }, { st: T.FIN_STATE });
  check('  科目が少なければ、そのままの大きさ', JSON.stringify(finFit.few.zoom), JSON.stringify([1, 1, 1]));
  check('  そのときはお知らせを出さない', finFit.few.note, 'none');
  check('  科目が多いと、印刷で縮める', finFit.many.zoom[0] < 1, true);
  check('  短い書類は縮めない', JSON.stringify(finFit.many.zoom.slice(1)), JSON.stringify([1, 1]));
  check('  縮めることをお知らせする', /1ページに収まる/.test(finFit.many.note), true);
  check('  左右2段をすすめる', /左右にならべる/.test(finFit.many.note), true);
  check('  左右2段のほうが大きい字で収まる', finFit.two.zoom[0] > finFit.many.zoom[0], true);
  check('  左右2段は表が2つ', finFit.two.cols, 2);
  check('  左右の合計は同じ額', finFit.two.sums[0], finFit.two.sums[1]);
  check('  明細は1ページに押しこめない', finFit.detail, 0);

  // 紙1枚に収まっているか、PDF のページ数で確かめる（書類3つ＝3ページ）
  const finPdf = await page.evaluate(() => {
    finOpt().docs = { settle: true, budget: true, twocol: false, assets: true, detail: false, audit: true };
    renderFin();
    return document.querySelectorAll('#finPaper .fin-doc').length;
  });
  check('  書類は3つ', finPdf, 3);
  const pdfBuf = await page.pdf({ format: 'A4', margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } });
  const pdfTxt = pdfBuf.toString('latin1');
  const pages = pdfTxt.split('/Type /Page').length - 1 - (pdfTxt.split('/Type /Pages').length - 1);
  check('  印刷すると3ページ（1つの書類＝1ページ）', pages, 3);

  // 差引がマイナスのときは △ で出す（会計の紙の書きかた）
  const finMinus = await page.evaluate(() => {
    S = blank(); S.year = 2026; S.accounts = ['現金']; S.cats = { in: ['会費'], out: [] };
    S.budget = { 会費: 100000 };
    S.items = [{ id: 'x', date: '2026-05-01', kind: 'in', cat: '会費', note: 'a', amt: 130000, acc: '現金', event: '', memo: '', ts: 1 }];
    finOpt().docs = { settle: true, budget: true, twocol: false, assets: false, detail: false, audit: false };
    renderAll(); go('fin');
    const tr = Array.from(document.querySelectorAll('#finPaper tr')).find(r => r.cells[0] && r.cells[0].textContent === '会費');
    return { cells: Array.from(tr.cells).map(c => c.textContent.trim()), yenD: [yenD(-1234), yenD(0), yenD(1234)].join('/') };
  });
  check('  予算を超えたら△で出す', JSON.stringify(finMinus.cells), JSON.stringify(['会費', '100,000', '130,000', '△30,000', '1件']));
  check('  △のつけかた', finMinus.yenD, '△1,234/0/1,234');

  // 印刷のときは、帯もタブもえらぶところも消えて、紙だけが白く出る
  await page.emulateMedia({ media: 'print' });
  const finPrint = await page.evaluate(() => ({
    header: getComputedStyle(document.querySelector('header')).display,
    tabs: getComputedStyle(document.querySelector('nav.tabs')).display,
    card: getComputedStyle(document.querySelector('#pg-fin .no-print')).display,
    fin: getComputedStyle(document.getElementById('pg-fin')).display,
    other: getComputedStyle(document.getElementById('pg-book')).display,
    paper: getComputedStyle(document.getElementById('finPaper')).backgroundColor,
  }));
  await page.emulateMedia({ media: 'screen' });
  check('  印刷では帯を出さない', finPrint.header, 'none');
  check('  印刷ではタブを出さない', finPrint.tabs, 'none');
  check('  印刷では操作の欄を出さない', finPrint.card, 'none');
  check('  印刷でも決算の画面は出る', finPrint.fin, 'block');
  check('  ほかの画面は出さない', finPrint.other, 'none');
  check('  紙は白いまま', finPrint.paper, 'rgb(255, 255, 255)');

  // 決算書類の Excel（ファイルの名前は英数字だけ）
  const [finDl] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => { go('fin'); finOpt().docs.settle = true; renderFin(); }).then(() =>
      page.click('button:has-text("決算書類をExcelにする")')),
  ]);
  check('  決算の名前は英数字だけ', /^[0-9A-Za-z_.-]+\.xlsx$/.test(finDl.suggestedFilename()), true);
  check('  決算とわかる名前', /^kessan_2026_/.test(finDl.suggestedFilename()), true);

  // 画面まわり：ボタンの名前が取れること・タブが動くこと
  const a11y = await page.evaluate(() => {
    const noName = Array.from(document.querySelectorAll('button')).filter(b => {
      if (b.closest('dialog') && !b.closest('dialog').open) return false;
      return !(b.getAttribute('aria-label') || b.textContent.trim());
    }).length;
    go('xls');
    const shown = document.getElementById('pg-xls').classList.contains('on');
    const sel = document.querySelector('nav.tabs button[data-pg="xls"]').getAttribute('aria-selected');
    return { noName, shown, sel };
  });
  check('  名前の取れないボタンは0件', a11y.noName, 0);
  check('  タブで画面が変わる', a11y.shown, true);
  check('  えらんだタブが分かる', a11y.sel, 'true');

  // 書き出すファイルの名前。日本語が混じると、ブラウザによっては名前ごと捨てられて
  // 拡張子の無い「download」になり、パソコンで開けなくなる（作っている途中に踏んだ）。
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Excelに書き出す")'),
  ]);
  const fname = dl.suggestedFilename();
  check('  書き出す名前は英数字だけ', /^[0-9A-Za-z_.-]+$/.test(fname), true);
  check('  書き出す名前は .xlsx で終わる', /\.xlsx$/.test(fname), true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* ── 📅当番表 v396 ── */
async function runTouban(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 当番表 ──');
  const ok = async () => { await page.waitForTimeout(220);
    await page.evaluate(() => { const b = [...document.querySelectorAll('div[style*="99999"] button')]
      .find(x => x.textContent === 'OK'); if (b) b.click(); });
    await page.waitForTimeout(350); };

  // 道具として登録されている
  check('  道具に入っている', await page.evaluate(() =>
    NP_TOOLS.some(t => t.id === 'touban' && t.ov === 'toubanOverlay')), true);
  check('  はじめに開くページにも出る', await page.evaluate(() =>
    startPageOptions().some(o => o[0] === 'touban')), true);
  check('  端末の空き具合にも並ぶ', await page.evaluate(() =>
    ST_GROUPS.some(g => g.k === 'excalc_touban')), true);

  // 空から始まる
  await page.evaluate(() => openTouban()); await page.waitForTimeout(600);
  check('  開ける', await page.evaluate(() => isDlgOpen('toubanOverlay')), true);
  check('  名簿は空', await page.evaluate(() => touban.roster.length), 0);
  check('  割り当ても空', await page.evaluate(() => Object.keys(touban.assign).length), 0);
  check('  名前ははじめ「当番表」', await page.evaluate(() =>
    document.getElementById('tbTitle').value), '当番表');
  check('  半年ぶん6か月出る', await page.evaluate(() =>
    document.querySelectorAll('#tbMonths .tb-month').length), 6);
  check('  まず名簿からと案内する', await page.evaluate(() =>
    document.getElementById('tbNext').textContent.includes('名簿')), true);

  // 名前を書き換えられる
  await page.evaluate(() => tbSetTitle('ごみ庫そうじ当番')); await page.waitForTimeout(250);
  check('  名前を書き換えられる', await page.evaluate(() => touban.title), 'ごみ庫そうじ当番');
  check('  見出しにも出る', await page.evaluate(() =>
    document.getElementById('toubanHdr').textContent), '📅 ごみ庫そうじ当番');
  await page.evaluate(() => tbSetSub('◯◯自治会'));
  check('  そえ書きも入れられる', await page.evaluate(() => touban.sub), '◯◯自治会');

  // 名簿
  await page.evaluate(() => openTbSet()); await page.waitForTimeout(500);
  check('  名簿が空なら案内を出す', await page.evaluate(() =>
    !!document.querySelector('#tbRoster .tb-empty')), true);
  await page.evaluate(() => { ['田中', '鈴木', '佐藤', '高橋', '伊藤'].forEach(n => {
    tbAddMember(); tbRename(touban.roster.length - 1, n); }); renderTbSet(); });
  await page.waitForTimeout(400);
  check('  人を足せる', await page.evaluate(() => touban.roster.map(m => m.name).join('/')), '田中/鈴木/佐藤/高橋/伊藤');
  check('  番号は並び順', await page.evaluate(() => tbNameOf(3)), '佐藤');
  await page.evaluate(() => tbMove(0, 1)); await page.waitForTimeout(250);
  check('  入れ替えると番号も動く', await page.evaluate(() => tbNameOf(1) + '/' + tbNameOf(2)), '鈴木/田中');
  await page.evaluate(() => tbMove(1, -1)); await page.waitForTimeout(250);

  // 当番の日（曜日・祝日）
  check('  はじめは火と金', await page.evaluate(() =>
    touban.cfg.days.map(i => TB_WD[i]).join('')), '火金');
  const n0 = await page.evaluate(() => tbDutyDates().length);
  check('  1年ぶんの当番日が出る', n0 > 90 && n0 < 110, true);
  await page.evaluate(() => tbToggleDow(2)); await page.waitForTimeout(250);
  check('  曜日を減らすと日も減る', await page.evaluate(() => tbDutyDates().length) < n0, true);
  await page.evaluate(() => tbToggleDow(2)); await page.waitForTimeout(250);
  check('  祝日が分かる', await page.evaluate(() => tbHolName(tbMk(2026, 5, 5))), 'こどもの日');
  check('  振替休日も出る', await page.evaluate(() => tbHolName(tbMk(2026, 5, 6))), '振替休日');
  check('  春分・秋分も計算する', await page.evaluate(() =>
    [tbHolName(tbMk(2026, 3, 20)), tbHolName(tbMk(2026, 9, 23))].join('/')), '春分の日/秋分の日');
  check('  祝日そのものは当番にしない', await page.evaluate(() =>
    tbDutyDates().includes(tbIso(tbMk(2026, 5, 5)))), false);
  check('  翌日にずらす', await page.evaluate(() =>
    tbDutyDates().includes(tbIso(tbMk(2026, 5, 6)))), true);
  await page.evaluate(() => tbSetHol('skip')); await page.waitForTimeout(250);
  check('  「当番なし」ならずらさない', await page.evaluate(() =>
    tbDutyDates().includes(tbIso(tbMk(2026, 5, 6)))), false);
  await page.evaluate(() => tbSetHol('shift')); await page.waitForTimeout(250);
  check('  年末年始はとばす', await page.evaluate(() =>
    tbDutyDates().some(k => /-(12-31|01-0[123])$/.test(k))), false);

  // 割り当て
  await page.evaluate(() => { touban.year = 2026; saveTouban(); renderTbSet(); });
  // tbAssign は中で確認窓を待つので、返り値の約束は受け取らない（受け取ると噛み合って止まる）
  await page.evaluate(() => { tbAssign('year'); }); await ok();
  const cnt = await page.evaluate(() => Object.keys(touban.assign).length);
  check('  1年ぶんに割り当てられる', cnt, await page.evaluate(() => tbDutyDates().length));
  check('  名簿の順に回る', await page.evaluate(() =>
    Object.keys(touban.assign).sort().slice(0, 7).map(k => touban.assign[k]).join(',')), '1,2,3,4,5,1,2');
  await page.evaluate(() => closeTbSet()); await page.waitForTimeout(500);
  check('  カレンダーに名前が入る', await page.evaluate(() =>
    [...document.querySelectorAll('#tbMonths .tb-nm')].filter(e => e.textContent).length > 30), true);

  // 手で直す
  await page.evaluate(() => {
    const k = Object.keys(touban.assign).sort()[0];
    const inp = document.querySelector('#tbMonths .tb-cell[data-d="' + k + '"] .tb-no');
    inp.value = '3'; inp.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(400);
  check('  番号を手で直せる', await page.evaluate(() => {
    const k = Object.keys(touban.assign).sort()[0];
    return touban.assign[k] + '/' + document.querySelector('#tbMonths .tb-cell[data-d="' + k + '"] .tb-nm').textContent;
  }), '3/佐藤');
  check('  名簿にない番号は赤で知らせる', await page.evaluate(() => {
    const k = Object.keys(touban.assign).sort()[1];
    const inp = document.querySelector('#tbMonths .tb-cell[data-d="' + k + '"] .tb-no');
    inp.value = '99'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    const nm = document.querySelector('#tbMonths .tb-cell[data-d="' + k + '"] .tb-nm');
    return nm.classList.contains('bad') + '/' + nm.textContent; }), 'true/名簿にありません');

  // 上期と下期
  await page.evaluate(() => tbSetHalf('H2')); await page.waitForTimeout(400);
  check('  下期に移れる', await page.evaluate(() =>
    [...document.querySelectorAll('#tbMonths .tb-mhead')].map(e => parseInt(e.textContent)).join(',')), '10,11,12,1,2,3');
  await page.evaluate(() => tbSetHalf('H1')); await page.waitForTimeout(400);
  check('  上期に戻れる', await page.evaluate(() =>
    [...document.querySelectorAll('#tbMonths .tb-mhead')].map(e => parseInt(e.textContent)).join(',')), '4,5,6,7,8,9');

  // 覚えている
  await page.reload(); await page.waitForTimeout(1100);
  await page.evaluate(() => openTouban()); await page.waitForTimeout(500);
  check('  開き直しても覚えている', await page.evaluate(() =>
    [touban.title, touban.roster.length, Object.keys(touban.assign).length > 0].join('/')), 'ごみ庫そうじ当番/5/true');

  // 印刷の中身
  const pr = await page.evaluate(() => {
    const d = document.createElement('div'); d.innerHTML = tbPrintHtml();
    return { m: d.querySelectorAll('.tp-m').length,
             names: [...d.querySelectorAll('.tp-nm')].filter(e => e.textContent).length,
             title: d.querySelector('.tp-title').textContent,
             sub: d.querySelector('.tp-sub') ? d.querySelector('.tp-sub').textContent : '',
             hol: [...d.querySelectorAll('.tp-hn')].map(e => e.textContent).includes('こどもの日'),
             cells: d.querySelectorAll('.tp-c').length % 7 };
  });
  check('  印刷は6か月ぶん', pr.m, 6);
  check('  印刷に名前が入る', pr.names > 30, true);
  check('  印刷に題とそえ書き', [pr.title, pr.sub].join('/'), 'ごみ庫そうじ当番/◯◯自治会');
  check('  印刷にも祝日', pr.hol, true);
  check('  週の形が崩れない', pr.cells, 0);

  // 登録キーからも開ける（v397）
  check('  登録キーに当番表がある', await page.evaluate(() =>
    !!(KEY_FUNCS.a_touban && KEY_FUNCS.a_touban.label.includes('当番表'))), true);
  check('  登録キーは設定・機能の仲間', await page.evaluate(() =>
    KEY_FUNCS.a_touban.g), '設定・機能');
  check('  なぞって即実行にはしない', await page.evaluate(() =>
    REG_GESTURE_ACTIONS.has('a_touban')), false);
  await page.evaluate(() => closeTouban()); await page.waitForTimeout(400);
  await page.evaluate(() => KEY_FUNCS.a_touban.run()); await page.waitForTimeout(600);
  check('  登録キーから開く', await page.evaluate(() => isDlgOpen('toubanOverlay')), true);

  // 印刷のしかた（v397。v400 から共通の「🖨 印刷のしかた」の窓で選ぶ）
  await page.evaluate(() => { openTbSet(); }); await page.waitForTimeout(500);
  check('  設定に印刷のしかたの入口がある', await page.evaluate(() =>
    !!document.getElementById('tbPrOpen')), true);
  await page.evaluate(() => document.getElementById('tbPrOpen').click()); await page.waitForTimeout(400);
  check('  共通の窓が開く', await page.evaluate(() => isDlgOpen('prnOverlay') && prnTool), 'touban');
  const prOn = () => page.evaluate(() => [...document.querySelectorAll('#prnToggles .set-act')]
    .map(b => b.dataset.prn + (b.classList.contains('on') ? '+' : '-')).join(' '));
  check('  印刷のしかたの項目が出る', await prOn(), 'fit+ foot+ sub+ hol+');
  check('  はじめは「ふつう」', await page.evaluate(() =>
    document.getElementById('prnSizeVal').textContent), 'ふつう');
  await page.evaluate(() => { tbChangePSize(1); }); await page.waitForTimeout(200);
  check('  大きくできる', await page.evaluate(() =>
    document.getElementById('prnSizeVal').textContent), '大');
  await page.evaluate(() => { tbChangePSize(1); tbChangePSize(1); }); await page.waitForTimeout(200);
  check('  特大より上には行かない', await page.evaluate(() =>
    touban.pr.k + '/' + document.getElementById('prnSizeVal').textContent), '3/特大');
  await page.evaluate(() => { for (let i = 0; i < 5; i++) tbChangePSize(-1); }); await page.waitForTimeout(200);
  check('  小より下には行かない', await page.evaluate(() =>
    touban.pr.k + '/' + document.getElementById('prnSizeVal').textContent), '0/小');
  check('  設定の入口にも今の決めごとが出る', await page.evaluate(() =>
    document.getElementById('tbPrSum').textContent.includes('小')), true);

  // 文字の大きさが紙に効く
  const psz = await page.evaluate(() => {
    const meas = () => {
      const built = opBuild(tbPrintHtml(), !touban.pr.fit);
      const nm = document.querySelector('#printArea .tp-nm');
      const c = document.querySelector('#printArea .tp-c');
      const r = [parseFloat(getComputedStyle(nm).fontSize), parseFloat(getComputedStyle(c).height),
                 built.box.scrollHeight];
      built.meas.remove(); document.getElementById('printArea').innerHTML = '';
      return r;
    };
    touban.pr.k = 0; const small = meas();
    touban.pr.k = 3; const big = meas();
    touban.pr.k = 1;
    return { small, big };
  });
  check('  小さくすると字も小さい', psz.small[0] < 9, true);
  check('  特大にすると字が大きい', psz.big[0] > 11, true);
  check('  マスの高さも変わる', psz.big[1] > psz.small[1] + 10, true);
  check('  紙の中身の高さも変わる', psz.big[2] > psz.small[2] + 100, true);

  // 出し分け
  const off = await page.evaluate(() => {
    const has = () => { const h = tbPrintHtml();
      return { sub: /tp-sub/.test(h), foot: /tp-foot/.test(h), hol: /tp-hn/.test(h) }; };
    const on = has();
    tbTogglePr('sub'); tbTogglePr('foot'); tbTogglePr('hol');
    return { on, off: has() };
  });
  await page.waitForTimeout(200);
  check('  はじめは全部出る', [off.on.sub, off.on.foot, off.on.hol].join('/'), 'true/true/true');
  check('  そえ書きを消せる', off.off.sub, false);
  check('  下の日づけを消せる', off.off.foot, false);
  check('  祝日の名前を消せる', off.off.hol, false);
  check('  消すとボタンも切になる', await prOn(), 'fit+ foot- sub- hol-');
  await page.evaluate(() => closePrn()); await page.waitForTimeout(400);

  // 1枚に収める
  const fit = await page.evaluate(() => {
    const w = () => { const built = opBuild(tbPrintHtml(), !touban.pr.fit);
      const r = { w: built.box.style.width, z: built.box.style.zoom,
                  h: built.box.scrollHeight * (parseFloat(built.box.style.zoom || '1') || 1) };
      built.meas.remove(); document.getElementById('printArea').innerHTML = ''; return r; };
    touban.pr.fit = true; const on = w();
    touban.pr.fit = false; const offw = w();
    return { on, off: offw };
  });
  check('  収めないときは紙の幅のまま', fit.off.w + '/' + fit.off.z, '718px/');
  check('  収めるときは縮め率が付く', parseFloat(fit.on.z) > 0, true);
  check('  収めるとき1枚に入る', fit.on.h <= 1046 + 1, true);

  // 覚えている
  await page.evaluate(() => { touban.pr.k = 2; touban.pr.fit = true; saveTouban(); });
  await page.reload(); await page.waitForTimeout(1100);
  await page.evaluate(() => openTouban()); await page.waitForTimeout(600);
  check('  印刷のしかたも覚えている', await page.evaluate(() =>
    [touban.pr.k, touban.pr.fit, touban.pr.foot, touban.pr.sub, touban.pr.hol].join('/')),
    '2/true/false/false/false');
  check('  名簿はそのまま', await page.evaluate(() => touban.roster.length), 5);
  await page.evaluate(() => { touban.pr = { k: 1, fit: true, foot: true, sub: true, hol: true }; saveTouban(); });

  // 人をはずす
  await page.evaluate(() => { openTbSet(); }); await page.waitForTimeout(500);
  await page.evaluate(() => { tbDelMember(0); }); await ok();
  check('  人をはずせる', await page.evaluate(() => touban.roster.map(m => m.name).join('/')), '鈴木/佐藤/高橋/伊藤');
  check('  はずすと番号が繰り上がる', await page.evaluate(() => tbNameOf(1)), '鈴木');
  await page.evaluate(() => closeTbSet()); await page.waitForTimeout(500);
  await page.evaluate(() => closeTouban()); await page.waitForTimeout(400);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

async function runBrush1(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── ブラッシュアップ第1弾 ──');

  // 空の表の手がかり（v398 で足したが、v403 でやめた）
  check('  空の表に手がかりは出さない', await page.evaluate(() =>
    !document.getElementById('emptyHint') && typeof updateEmptyHint), 'undefined');

  // 自動保存の表示
  check('  記録を開いていないときは「自動保存」', await page.evaluate(() =>
    document.getElementById('recordTitle').textContent.startsWith('📄 自動保存')), true);
  check('  「未保存」とは出さない', await page.evaluate(() =>
    document.getElementById('recordTitle').textContent.includes('未保存')), false);

  // ⋯の道具の一覧
  await page.evaluate(() => openMoreMenu()); await page.waitForTimeout(400);
  check('  道具が全部並ぶ', await page.evaluate(() =>
    document.querySelectorAll('#moreToolsGrid .more-item').length === NP_TOOLS.length), true);
  check('  はじめは畳んである', await page.evaluate(() =>
    document.getElementById('moreAccTools').open), false);
  check('  別のタブで開くものには印', await page.evaluate(() =>
    document.querySelector('#moreToolsGrid [data-tool=kaikei]').textContent.includes('↗')), true);
  check('  ナイトモードは畳まずに出ている', await page.evaluate(() =>
    !document.getElementById('darkMoreBtn').closest('.more-acc')), true);
  await page.evaluate(() => document.querySelector('#moreToolsGrid [data-tool=touban]').click());
  await page.waitForTimeout(700);
  check('  一覧から道具が開く', await page.evaluate(() => isDlgOpen('toubanOverlay')), true);
  check('  開くと⋯は閉じる', await page.evaluate(() => isDlgOpen('moreMenuOverlay')), false);
  await page.evaluate(() => closeTouban()); await page.waitForTimeout(400);

  check('  道具を閉じてもアプリの外に出ない', await page.evaluate(() =>
    location.href.endsWith('index.html') && typeof toggleSettings === 'function'), true);
  // ⋯ → リスト → 閉じる で、前のページへ戻ってしまっていた（v398で修正）
  await page.evaluate(() => openMoreMenu()); await page.waitForTimeout(400);
  await page.click('#listBtn'); await page.waitForTimeout(600);
  check('  ⋯からリストが開く', await page.evaluate(() => isDlgOpen('saveListOverlay')), true);
  await page.evaluate(() => closeSaveList()); await page.waitForTimeout(600);
  check('  リストを閉じてもアプリの外に出ない', await page.evaluate(() =>
    location.href.endsWith('index.html') && typeof toggleSettings === 'function'), true);

  // 設定からも案内をもう一度
  await page.evaluate(() => toggleSettings()); await page.waitForTimeout(400);
  check('  設定に案内のボタンがある', await page.evaluate(() =>
    !!document.getElementById('setTourBtn')), true);
  await page.evaluate(() => document.getElementById('setTourBtn').click()); await page.waitForTimeout(800);
  check('  押すと案内が開く', await page.evaluate(() => isDlgOpen('tourOverlay')), true);
  check('  設定は閉じる', await page.evaluate(() => isDlgOpen('settingsPanel')), false);
  await page.evaluate(() => { const b = [...document.querySelectorAll('#tourOverlay button')]
    .find(x => /とばす|スキップ|閉じる|✕/.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(500);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();

  // 広い画面で列が間延びしない
  const wide = await browser.newContext({ viewport: { width: 1400, height: 800 } });
  const wp = await wide.newPage();
  await wp.goto(INDEX); await wp.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await wp.reload(); await wp.waitForTimeout(1000);
  const cw = await wp.evaluate(() => ({ w: document.getElementById('ch0').getBoundingClientRect().width,
    cap: COL_WIDE_CAP * (cellScale || 1) }));
  check('  パソコンでは1列が上限まで', cw.w <= cw.cap + 1, true);
  check('  それでも狭すぎない', cw.w >= 150, true);
  await wide.close();
  const narrow = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const np = await narrow.newPage();
  await np.goto(INDEX); await np.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await np.reload(); await np.waitForTimeout(1000);
  check('  スマホでは今までどおり画面いっぱい', await np.evaluate(() => {
    const t = document.getElementById('sheet');
    return Math.abs(t.getBoundingClientRect().width - t.parentElement.clientWidth) <= 2; }), true);
  await narrow.close();
}

async function runBrush2(browser) {
  console.log('\n── ブラッシュアップ第2弾 ──');
  const open = async (w, h, pre) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(INDEX);
    await page.evaluate((pre) => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1');
      for (const k in (pre || {})) localStorage.setItem(k, pre[k]); }, pre);
    await page.reload(); await page.waitForTimeout(1000);
    return { ctx, page, errs };
  };
  const side = page => page.evaluate(() => document.body.classList.contains('np-side'));

  // パソコン：テンキーは右
  let { ctx, page, errs } = await open(1280, 800);
  check('  パソコンではテンキーが右', await side(page), true);
  const g = await page.evaluate(() => {
    const ns = document.getElementById('numpadSection').getBoundingClientRect();
    const sw = document.querySelector('.sheet-wrap').getBoundingClientRect();
    const rows = [...document.querySelectorAll('#sheet tr')].filter(tr => tr.getBoundingClientRect().bottom <= innerHeight).length - 1;
    return { right: ns.left >= sw.right - 1, full: sw.bottom >= innerHeight - 2, rows };
  });
  check('  表の右どなりに並ぶ', g.right, true);
  check('  表が画面の下まで使える', g.full, true);
  check('  15行ぜんぶ見える', g.rows >= 15, true);
  check('  収納の矢印は右向き', await page.evaluate(() => document.getElementById('numpadEdgeBtn').textContent), '▶');
  check('  上のバーに⌨が出る', await page.evaluate(() =>
    getComputedStyle(document.getElementById('tbNumpad')).display !== 'none'), true);
  await page.click('#tbNumpad'); await page.waitForTimeout(400);
  check('  ⌨でテンキーをしまえる', await page.evaluate(() =>
    numpadHidden && document.getElementById('numpadSection').getBoundingClientRect().width <= 20), true);
  check('  しまった帯にキーが覗かない', await page.evaluate(() =>
    getComputedStyle(document.getElementById('numpadViewport')).visibility), 'hidden');
  await page.click('#tbNumpad'); await page.waitForTimeout(400);
  check('  ⌨でまた出せる', await page.evaluate(() => !numpadHidden), true);
  await page.click('#c0_0'); await page.click('#numpadPage1 .btn[data-key="n5"]'); await page.click('#numpadPage1 .btn[data-key="enter"]'); await page.waitForTimeout(300);
  check('  右に置いてもキーで入る', await page.evaluate(() => String(data[0][0])), '5');
  // 置き場所を「下」に
  await page.evaluate(() => setNpPlace('bottom')); await page.waitForTimeout(400);
  check('  「下」にすると下へ戻る', await side(page), false);
  check('  ⌨は既定では消える', await page.evaluate(() =>
    getComputedStyle(document.getElementById('tbNumpad')).display), 'none');
  await page.reload(); await page.waitForTimeout(1000);
  check('  置き場所を覚えている', await side(page), false);
  await page.evaluate(() => { toggleSettings(); setSettingsTab(1); }); await page.waitForTimeout(400);
  check('  設定に置き場所の選択がある', await page.evaluate(() =>
    [...document.querySelectorAll('#npPlaceSeg .skin-seg-btn')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join('/')),
    '自動/下*/右');
  check('  JSエラーが出ていない（パソコン）', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();

  // スマホ縦・タブレット縦は下のまま、スマホ横は今までどおり
  ({ ctx, page, errs } = await open(390, 844));
  check('  スマホ縦は下のまま', await side(page), false);
  check('  スマホ縦は矢印が下向き', await page.evaluate(() => document.getElementById('numpadEdgeBtn').textContent), '▼');
  await ctx.close();
  ({ ctx, page, errs } = await open(768, 1024));
  check('  タブレット縦は下のまま', await side(page), false);
  await ctx.close();
  ({ ctx, page, errs } = await open(844, 390));
  check('  スマホ横は今までの横並び（np-side は使わない）', await side(page), false);
  check('  スマホ横もテンキーは右', await page.evaluate(() =>
    document.getElementById('numpadSection').getBoundingClientRect().left > 300), true);
  await ctx.close();
  ({ ctx, page, errs } = await open(1024, 768, { excalc_np_place: 'bottom' }));
  check('  「下」を選んだ人はタブレット横でも下', await side(page), false);
  await ctx.close();
  ({ ctx, page, errs } = await open(800, 600, { excalc_np_place: 'side' }));
  check('  「右」を選べば小さめの横長でも右', await side(page), true);
  await ctx.close();

  // 夜のバーと色の見やすさ
  ({ ctx, page, errs } = await open(390, 844));
  const bar = await page.evaluate(() => {
    const a = getComputedStyle(document.querySelector('.toolbar')).backgroundColor;
    toggleDark(); const b = getComputedStyle(document.querySelector('.toolbar')).backgroundColor;
    const h = getComputedStyle(document.querySelector('#settingsPanel .modal-header')).backgroundColor;
    toggleDark(); const c = getComputedStyle(document.querySelector('.toolbar')).backgroundColor;
    return { a, b, h, c };
  });
  check('  夜は上のバーを沈める', bar.a !== bar.b, true);
  check('  窓の見出しも同じ色', bar.h, bar.b);
  check('  昼に戻すと元の色', bar.c, bar.a);
  const cr = await page.evaluate(() => SKIN_THEMES.map(t => {
    skinTheme = t.id; applySkin();
    const cs = getComputedStyle(document.body);
    return [t.id, skinContrastWhite(cs.getPropertyValue('--acc').trim()), skinContrastWhite(cs.getPropertyValue('--acc-light').trim())];
  }));
  check('  どの色でも白い字が読める（4.5以上）', cr.filter(x => x[1] < 4.5).map(x => x[0]).join(','), '');
  check('  明るいボタン色も3以上', cr.filter(x => x[2] < 3).map(x => x[0]).join(','), '');
  check('  みどりは元の色のまま', await page.evaluate(() => { skinTheme = 'green'; applySkin();
    return getComputedStyle(document.body).getPropertyValue('--acc').trim(); }), '#217346');
  check('  JSエラーが出ていない（色）', errs.length, 0);
  await ctx.close();
}

async function runBrush3(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── ブラッシュアップ第3弾 ──');
  await page.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });

  // 設定をさがす
  await page.evaluate(() => toggleSettings()); await page.waitForTimeout(400);
  check('  設定にさがす欄がある', await page.evaluate(() => !!document.getElementById('setFindIn')), true);
  const find = async q => { await page.fill('#setFindIn', q); await page.waitForTimeout(150);
    return page.evaluate(() => setFindHits.map(x => x.label)); };
  check('  カタカナでもひらがなでも見つかる', (await find('てんきー')).includes('テンキーの置き場所'), true);
  check('  言いかえで見つかる（夜→ナイトモード）', (await find('夜'))[0], '🌙 ナイトモード');
  check('  ひらがなで漢字の見出しに届く', (await find('はいけい')).some(x => x.includes('背景')), true);
  check('  道具も見つかる', (await find('当番')).includes('📅当番表'), true);
  await find('zzzz');
  check('  見つからないときは知らせる', await page.evaluate(() =>
    !!document.querySelector('#setFindRes .set-find-none')), true);
  await find('置き場所');
  await page.evaluate(() => setFindGo(0)); await page.waitForTimeout(600);
  check('  押すとそのタブへ移る', await page.evaluate(() => settingsTab), 1);
  check('  その項目が光る', await page.evaluate(() => !!document.querySelector('#settingsPanel .set-flash')), true);
  check('  さがす欄は空に戻る', await page.evaluate(() =>
    document.getElementById('setFindIn').value + '|' + document.getElementById('setFindRes').hidden), '|true');
  await find('くわしい');
  await find('上下の余白');
  await page.evaluate(() => setFindGo(0)); await page.waitForTimeout(500);
  check('  畳んだ中の項目なら開いて見せる', await page.evaluate(() => {
    const el = document.querySelector('#settingsPanel .set-flash');
    let d = el; while (d && d.tagName !== 'DETAILS') d = d.parentElement;
    return !!el && (!d || d.open); }), true);
  await find('説明書');
  const hi = await page.evaluate(() => setFindHits.findIndex(x => x.where === '⋯'));
  await page.evaluate(i => setFindGo(i), hi); await page.waitForTimeout(600);
  check('  設定の外のものは、そこを開く', await page.evaluate(() =>
    isDlgOpen('helpOverlay') && !isDlgOpen('settingsPanel')), true);
  await page.evaluate(() => closeHelp()); await page.waitForTimeout(500);
  check('  閉じてもアプリの外に出ない', await page.evaluate(() => location.href.endsWith('index.html')), true);

  // 登録キーの機能をさがす
  await page.evaluate(() => openKeyAssign('n5')); await page.waitForTimeout(500);
  check('  長押しの割り当てにさがす欄', await page.evaluate(() =>
    !!document.querySelector('#keyAssignBody .ka-find')), true);
  await page.fill('#keyAssignBody .ka-find', '当番'); await page.waitForTimeout(150);
  const vis = () => page.evaluate(() => [...document.querySelectorAll('#keyAssignBody .ka-item')]
    .filter(b => b.style.display !== 'none').map(b => b.textContent).join('/'));
  check('  しぼり込める', await vis(), '📅当番表');
  check('  当たらない見出しは隠れる', await page.evaluate(() =>
    [...document.querySelectorAll('#keyAssignBody .ka-sec')].filter(e => e.style.display !== 'none').map(e => e.textContent).join('/')), '設定・機能');
  await page.fill('#keyAssignBody .ka-find', 'ぜい'); await page.waitForTimeout(150);
  check('  ひらがなでも当たる', (await vis()).includes('税込'), true);
  await page.fill('#keyAssignBody .ka-find', ''); await page.waitForTimeout(150);
  check('  空にすると全部に戻る', await page.evaluate(() =>
    [...document.querySelectorAll('#keyAssignBody .ka-item')].every(b => b.style.display !== 'none')), true);
  await page.evaluate(() => closeKeyAssign()); await page.waitForTimeout(400);

  // 共通の印刷のしかた（単位水量）
  await page.evaluate(() => openTansui()); await page.waitForTimeout(500);
  check('  道具に印刷のしかたの入口', await page.evaluate(() =>
    !!document.querySelector('#tansuiOverlay .prn-open')), true);
  await page.evaluate(() => document.querySelector('#tansuiOverlay .prn-open').click()); await page.waitForTimeout(400);
  check('  窓の名前に道具の名前', await page.evaluate(() =>
    document.getElementById('prnTitle').textContent.includes('単位水量')), true);
  check('  画像で保存も選べる', await page.evaluate(() =>
    getComputedStyle(document.getElementById('prnImageBtn')).display !== 'none'), true);
  await page.evaluate(() => { prnSize(2); prnToggle('foot'); }); await page.waitForTimeout(200);
  const doc = await page.evaluate(() => { const b = prnBuild('tsx', tsxReportHtml());
    const r = { z: getComputedStyle(b.box.firstElementChild).zoom,
      foot: b.box.querySelector('.vp-foot') ? getComputedStyle(b.box.querySelector('.vp-foot')).display : 'なし' };
    b.meas.remove(); document.getElementById('printArea').innerHTML = ''; return r; });
  check('  特大で中身が大きくなる', doc.z, '1.3');
  check('  下の注記を消せる', doc.foot, 'none');
  await page.evaluate(() => document.getElementById('prnPrintBtn').click()); await page.waitForTimeout(700);
  check('  窓から印刷できる', await page.evaluate(() => window.__printed), 1);
  check('  印刷すると道具も閉じる', await page.evaluate(() =>
    isDlgOpen('prnOverlay') + '/' + isDlgOpen('tansuiOverlay')), 'false/false');
  await page.reload(); await page.waitForTimeout(1000);
  check('  道具ごとに覚えている', await page.evaluate(() =>
    [prnOpts('tsx').k, prnOpts('tsx').foot, prnOpts('veg').k, prnOpts('vegdiary').fit].join('/')), '3/false/1/false');

  // 設定の入口の名前をそろえた
  check('  道具の設定の入口は「⚙ 設定」にそろう', await page.evaluate(() =>
    [...document.querySelectorAll('.hdr-btn')].filter(b => /設定/.test(b.textContent))
      .every(b => b.textContent.trim() === '⚙ 設定' && !!b.title)), true);

  // 押せる所の大きさ
  const hit = await page.evaluate(() => {
    const at = (id, y) => { const e = document.getElementById(id), r = e.getBoundingClientRect();
      const h = document.elementFromPoint(r.left + r.width / 2, y(r)); return !!h && (h === e || e.contains(h)); };
    const tb = document.querySelector('.toolbar').getBoundingClientRect();
    return { save: at('saveBtn', () => tb.bottom - 1), more: at('moreBtn', () => tb.bottom - 1),
      moreH: Math.round(document.getElementById('moreBtn').getBoundingClientRect().height) };
  });
  check('  上のバーのボタンは帯の下の端でも押せる', hit.save && hit.more, true);
  check('  ⋯は他のボタンと同じ高さ', hit.moreH >= 30, true);

  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

async function runHelpSplit(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 説明書を別のファイルに（v401） ──');
  const raw = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check('  index.html に説明書の中身を持たない', raw.includes('id="h-privacy"'), false);
  check('  help.js に中身がある', fs.readFileSync(path.join(ROOT, 'help.js'), 'utf8').includes('id=\\"h-privacy\\"'), true);
  const sw = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
  check('  電波がなくても読めるよう先に持つ', sw.includes("'./help.js'"), true);
  check('  写真メモも先に持つ（v420）', sw.includes("'./photomemo.js'"), true);
  check('  写真メモははじめは読まない（v420）', await page.evaluate(() => typeof pmRedraw + '/' + !!window.PM_PART_LOADED), 'undefined/false');
  await page.evaluate(() => openPhotoMemo()); await page.waitForTimeout(800);
  check('  開くと読み込んで開く', await page.evaluate(() => typeof pmRedraw + '/' + isDlgOpen('photoMemoOverlay')), 'function/true');
  await page.evaluate(() => closePhotoMemo()); await page.waitForTimeout(400);
  check('  閉じられる', await page.evaluate(() => isDlgOpen('photoMemoOverlay')), false);
  await page.evaluate(() => openPhotoMemo()); await page.waitForTimeout(400);
  check('  2回目も開く（読み込みは1回だけ）', await page.evaluate(() => isDlgOpen('photoMemoOverlay') + '/' + document.querySelectorAll('script[src="photomemo.js"]').length), 'true/1');
  await page.evaluate(() => closePhotoMemo()); await page.waitForTimeout(400);
  check('  画面を開くとき以外は index.html で代わりをしない', sw.includes("e.request.mode === 'navigate'"), true);
  check('  開くまでは読まない', await page.evaluate(() =>
    !document.getElementById('h-privacy') && typeof window.EXCALC_HELP_HTML), 'undefined');
  check('  開けば読み込まれる', await page.evaluate(async () => { await openHelp();
    return !!document.getElementById('h-privacy') && document.getElementById('helpVer').textContent; }), 'バージョン ' + await page.evaluate(() => APP_VERSION));
  check('  使いかたの表も入る', await page.evaluate(() =>
    document.querySelectorAll('#helpBody .help-li').length > 50), true);
  await page.evaluate(() => closeHelp()); await page.waitForTimeout(400);
  check('  2回目は読み込み直さない', await page.evaluate(async () => { await openHelp();
    return document.querySelectorAll('script[src="help.js"]').length; }), 1);
  await page.evaluate(() => closeHelp()); await page.waitForTimeout(400);
  // 読めなかったときは、そう知らせて、次に開いたときにもう一度読みにいく
  check('  読めないときは知らせる', await page.evaluate(async () => {
    const body = document.getElementById('helpBody'); const keep = body.innerHTML;
    const saved = window.EXCALC_HELP_HTML; delete window.EXCALC_HELP_HTML;
    body.innerHTML = ''; const orig = document.head.appendChild.bind(document.head);
    document.head.appendChild = el => { if (el.tagName === 'SCRIPT') { setTimeout(() => el.onerror && el.onerror(), 0); return el; } return orig(el); };
    const ok = await loadHelp();
    const msg = body.textContent.includes('読み込めませんでした');
    document.head.appendChild = orig; window.EXCALC_HELP_HTML = saved; body.innerHTML = keep;
    return !ok && msg; }), true);
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

async function runBackKey(browser) {
  console.log('\n── スマホの「戻る」（v402） ──');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('about:blank');
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  const alive = () => page.evaluate(() => typeof data).catch(() => 'DEAD');
  const back = async () => { await page.goBack({ waitUntil: 'commit' }).catch(() => {}); await page.waitForTimeout(450); };
  const len = () => page.evaluate(() => window.history.length);

  // 3. 画面に一度も触れていないときは積まない（起動と同時に道具を開いたとき）
  await page.evaluate(() => { window._acted = backGuardActed; window.backGuardActed = () => false; });
  const l0 = await len();
  await page.evaluate(() => openTouban()); await page.waitForTimeout(300);
  check('  触れる前に開いた分は積まずに覚えておく', await page.evaluate(() => backGuardDeferred), true);
  check('  履歴は増えない', await len(), l0);
  await page.evaluate(() => closeTouban()); await page.waitForTimeout(400);
  check('  触れる前に閉じても戻りすぎない', await alive(), 'object');
  check('  覚えていた分も消える', await page.evaluate(() => backGuardDeferred), false);
  await page.evaluate(() => openTouban()); await page.waitForTimeout(300);
  await page.evaluate(() => { window.backGuardActed = window._acted; });
  await page.tap('#toubanHdr'); await page.waitForTimeout(300);
  check('  触れたときに、いちばん下の分と道具の分を積む', await page.evaluate(() =>
    backGuardBase + '/' + backGuardDeferred), 'true/false');
  check('  履歴が2つ増える', await len(), l0 + 2);
  await back();
  check('  戻る1回で道具だけ閉じる', await page.evaluate(() => isDlgOpen('toubanOverlay')), false);
  check('  アプリは生きている', await alive(), 'object');
  // 4. いちばん上で「戻る」
  await back();
  check('  もう一度押すと閉じますと知らせる', await page.evaluate(() =>
    [...document.querySelectorAll('div')].some(d => d.textContent === 'もう一度「戻る」を押すと閉じます')), true);
  check('  知らせたときはまだ閉じない', await alive(), 'object');
  await page.tap('#c0_0'); await page.waitForTimeout(200);
  check('  また触れると、いちばん下の分を積み直す', await page.evaluate(() => backGuardBase), true);
  // 重ねて開いたときは上から1つずつ
  await page.tap('#moreBtn'); await page.waitForTimeout(300);
  await page.evaluate(() => { toggleSettings(); }); await page.waitForTimeout(300);
  await back();
  check('  重ねたときは戻るで上だけ閉じる', await page.evaluate(() =>
    !isDlgOpen('settingsPanel') && isDlgOpen('moreMenuOverlay')), true);
  await back();
  check('  もう一度で下も閉じる', await page.evaluate(() => isDlgOpen('moreMenuOverlay')), false);
  check('  まだアプリの中', await alive(), 'object');

  // 1. 会計アプリは同じウィンドウで開き、戻るで帰ってくる
  check('  ファイルで開いているときは index.html まで付ける', await page.evaluate(() =>
    sideAppUrl('kaikei', '#from=hyo').endsWith('/kaikei/index.html#from=hyo')), true);
  await page.evaluate(() => openKaikeiApp()); await page.waitForTimeout(1300);
  check('  会計アプリが同じウィンドウで開く', /\/kaikei\/index\.html$/.test(page.url()), true);
  check('  表電卓から来たしるしは消える', await page.evaluate(() => location.hash), '');
  check('  表電卓から来たときは、いちばん下の分を積まない', await page.evaluate(() => KB.wantBase), false);
  // 2. 会計アプリの中の「戻る」
  await page.tap('nav.tabs button[data-pg=sum]'); await page.waitForTimeout(300);
  await back();
  check('  集計から戻ると記帳へ', await page.evaluate(() => curPg + '|' + location.pathname.endsWith('/kaikei/index.html')), 'entry|true');
  await page.tap('nav.tabs button[data-pg=set]'); await page.waitForTimeout(300);
  await page.tap('#hdYear'); await page.waitForTimeout(300);
  check('  窓が開く', await page.evaluate(() => dlgYear.open), true);
  await back();
  check('  戻るで窓だけ閉じる', await page.evaluate(() => !dlgYear.open && curPg), 'set');
  await back();
  check('  もう一度で記帳へ', await page.evaluate(() => curPg), 'entry');
  await page.tap('#hdYear'); await page.waitForTimeout(300);
  await page.evaluate(() => dlgYear.close()); await page.waitForTimeout(300);
  check('  ✕で閉じても履歴が残らない', await page.evaluate(() => KB.stack.length), 0);
  await page.tap('nav.tabs button[data-pg=book]'); await page.waitForTimeout(200);
  await page.tap('nav.tabs button[data-pg=entry]'); await page.waitForTimeout(400);
  check('  タブで記帳に戻っても履歴が残らない', await page.evaluate(() => KB.stack.length), 0);
  await back();
  check('  記帳で戻ると表電卓へ帰る', /\/index\.html$/.test(page.url()) && !/kaikei/.test(page.url()), true);
  await page.waitForTimeout(600);
  check('  表電卓は動いている', await alive(), 'object');
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();

  // 会計アプリだけを開いたとき
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p2 = await c2.newPage();
  await p2.goto(KAIKEI); await p2.waitForTimeout(900);
  check('  会計アプリだけのときは、いちばん下の分を使う', await p2.evaluate(() => KB.wantBase), true);
  await p2.tap('nav.tabs button[data-pg=book]'); await p2.waitForTimeout(300);
  await p2.goBack({ waitUntil: 'commit' }).catch(() => {}); await p2.waitForTimeout(400);
  await p2.goBack({ waitUntil: 'commit' }).catch(() => {}); await p2.waitForTimeout(400);
  check('  記帳で戻ると一度知らせる', await p2.evaluate(() => document.getElementById('toast').textContent).catch(() => 'DEAD'),
    'もう一度「戻る」を押すと閉じます');
  await c2.close();
}

async function runTbColor(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 当番表の色（v403） ──');
  await page.evaluate(() => { localStorage.setItem('excalc_touban', JSON.stringify({ title: '当番', sub: '', year: 2026, half: 'H1',
    cfg: { days: [2, 5], holiday: 'shift', skipNY: true }, roster: [{ name: '佐藤' }], assign: { '2026-04-07': 1 }, start: 1 })); });
  await page.reload(); await page.waitForTimeout(900);
  await page.evaluate(() => openTouban()); await page.waitForTimeout(400);
  const bg = k => page.evaluate(k => { const e = document.querySelector('#tbMonths .tb-cell[data-d="' + k + '"]');
    return e ? getComputedStyle(e).backgroundColor : '-'; }, k);
  const def = { wd: await bg('2026-04-08'), sat: await bg('2026-04-11') };
  check('  はじめはもとの色', await page.evaluate(() => Object.values(touban.col).join('')), '');
  await page.evaluate(() => openTbSet()); await page.waitForTimeout(400);
  check('  設定に色の節がある', await page.evaluate(() =>
    document.querySelectorAll('#tbColBox .tbc-row').length), 5);
  check('  はじめは畳んである', await page.evaluate(() => document.getElementById('tbColAcc').open), false);
  check('  見本の色と、ほかの色をえらぶ所がある', await page.evaluate(() => {
    const r = document.querySelector('#tbColBox .tbc-row');
    return r.querySelectorAll('.tbc-sw button').length + '/' + !!r.querySelector('input[type=color]'); }), (1 + 13) + '/true');
  await page.evaluate(() => { tbSetCol('bg', '#fff8e1'); tbSetCol('duty', '#c8e6c9'); tbSetCol('sat', '#e3f2fd');
    tbSetCol('sun', '#fce4ec'); tbSetCol('hol', '#ffe0b2'); });
  await page.waitForTimeout(200);
  check('  えらんだ色が印になる', await page.evaluate(() =>
    document.querySelector('#tbColBox [data-col=bg] .tbc-sw button.on').style.background.replace(/\s/g, '')), 'rgb(255,248,225)');
  check('  畳んだ見出しにも、変えた色が出る', await page.evaluate(() =>
    document.getElementById('tbColSum').textContent.includes('当番の日')), true);
  await page.evaluate(() => closeTbSet()); await page.waitForTimeout(400);
  check('  平日のマス', await bg('2026-04-08'), 'rgb(255, 248, 225)');
  check('  当番の日', await bg('2026-04-07'), 'rgb(200, 230, 201)');
  check('  土曜', await bg('2026-04-11'), 'rgb(227, 242, 253)');
  check('  日曜', await bg('2026-04-12'), 'rgb(252, 228, 236)');
  check('  祝日（平日）', await bg('2026-04-29'), 'rgb(255, 224, 178)');
  check('  日曜の祝日も祝日の色', await bg('2026-05-03'), 'rgb(255, 224, 178)');
  check('  空きマスは塗らない', await page.evaluate(() =>
    getComputedStyle(document.querySelector('#tbMonths .tb-cell.blank')).backgroundColor), 'rgba(0, 0, 0, 0)');
  const pr = await page.evaluate(() => { const b = opBuild(tbPrintHtml());
    const g = sel => { const e = document.querySelector('#printArea ' + sel); return e ? getComputedStyle(e).backgroundColor : '-'; };
    const r = { duty: g('.tp-duty'), sat: g('.tp-sat'), sun: g('.tp-sun'), hol: g('.tp-hol'), x: g('.tp-x'),
      wd: g('.tp-c:not(.tp-x):not(.tp-sun):not(.tp-sat):not(.tp-hol):not(.tp-duty)') };
    b.meas.remove(); document.getElementById('printArea').innerHTML = ''; return r; });
  check('  紙にも同じ色（当番の日）', pr.duty, 'rgb(200, 230, 201)');
  check('  紙にも同じ色（土・日・祝）', [pr.sat, pr.sun, pr.hol].join('|'), 'rgb(227, 242, 253)|rgb(252, 228, 236)|rgb(255, 224, 178)');
  check('  紙にも同じ色（平日）', pr.wd, 'rgb(255, 248, 225)');
  check('  紙の空きマスは白のまま', pr.x, 'rgba(0, 0, 0, 0)');
  // 番号を別の日へ移すと、当番の日の色もついてくる（v404。以前は曜日で決めた日に残っていた）
  await page.fill('#tbMonths .tb-cell[data-d="2026-04-07"] .tb-no', ''); await page.waitForTimeout(150);
  await page.fill('#tbMonths .tb-cell[data-d="2026-04-08"] .tb-no', '1'); await page.waitForTimeout(150);
  check('  番号を消した日は当番の色が消える', await bg('2026-04-07'), 'rgb(255, 248, 225)');
  check('  番号を入れた日に当番の色が付く', await bg('2026-04-08'), 'rgb(200, 230, 201)');
  const mv = await page.evaluate(() => { const b = opBuild(tbPrintHtml());
    const c = [...document.querySelectorAll('#printArea .tp-m')][0].querySelectorAll('.tp-c:not(.tp-x)');
    const r = [c[6].classList.contains('tp-duty'), c[7].classList.contains('tp-duty')].join('/');
    b.meas.remove(); document.getElementById('printArea').innerHTML = ''; return r; });
  check('  紙でも色が移る', mv, 'false/true');
  await page.evaluate(() => tbSetCol('duty', '#1a237e')); await page.waitForTimeout(200);
  check('  暗い色では名前を白い字に', await page.evaluate(() =>
    getComputedStyle(document.querySelector('#tbMonths .tb-cell.has .tb-nm')).color), 'rgb(255, 255, 255)');
  await page.evaluate(() => tbSetCol('duty', 'red; background:url(x)')); await page.waitForTimeout(100);
  check('  色でないものは受け付けない', await page.evaluate(() => touban.col.duty), '');
  await page.reload(); await page.waitForTimeout(900);
  await page.evaluate(() => openTouban()); await page.waitForTimeout(400);
  check('  開き直しても覚えている', await page.evaluate(() => touban.col.bg + '/' + touban.col.sat), '#fff8e1/#e3f2fd');
  await page.evaluate(() => { openTbSet(); tbColReset(); }); await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('div[style*="99999"] button')].find(x => x.textContent === 'OK'); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => closeTbSet()); await page.waitForTimeout(400);
  check('  もとに戻すと全部もとの色', await page.evaluate(() => Object.values(touban.col).join('')), '');
  check('  画面ももとの色', [await bg('2026-04-08'), await bg('2026-04-11')].join('|'), [def.wd, def.sat].join('|'));
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

async function runTbRoster(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 当番表の名簿を入れやすく（v405） ──');
  await page.evaluate(() => openTouban()); await page.waitForTimeout(400);
  check('  名簿が空なら、当番表の画面から押して開ける', await page.evaluate(() =>
    !!document.querySelector('#tbNext .tb-next-go')), true);
  await page.click('#tbNext .tb-next-go'); await page.waitForTimeout(500);
  check('  押すと設定が開いて名前の欄に入る', await page.evaluate(() =>
    isDlgOpen('tbSetOverlay') + '/' + (document.activeElement && document.activeElement.id)), 'true/tbNewName');
  check('  名簿は設定のいちばん上', await page.evaluate(() =>
    document.querySelector('#tbSetOverlay .modal-body .set-sec').textContent.startsWith('名簿')), true);
  await page.keyboard.type('佐藤'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  await page.keyboard.type('鈴木'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  check('  Enter で続けて足せる', await page.evaluate(() => touban.roster.map(m => m.name).join('/')), '佐藤/鈴木');
  check('  足したあとも欄にとどまり、空になる', await page.evaluate(() =>
    document.activeElement.id + '|' + document.getElementById('tbNewName').value), 'tbNewName|');
  check('  足した人は名簿の後ろに並ぶ', await page.evaluate(() =>
    [...document.querySelectorAll('#tbRoster li input')].map(i => i.value).join('/')), '佐藤/鈴木');
  await page.evaluate(() => { const inp = document.getElementById('tbNewName'); const dt = new DataTransfer();
    dt.setData('text', '高橋\n田中、伊藤\n\n'); inp.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
  await page.waitForTimeout(200);
  check('  まとめて貼り付けると1人ずつに分けて足す', await page.evaluate(() => touban.roster.map(m => m.name).join('/')), '佐藤/鈴木/高橋/田中/伊藤');
  await page.fill('#tbNewName', '  木村   一郎  '); await page.click('.tb-addbtn'); await page.waitForTimeout(150);
  check('  ＋足す でも足せる（前後の空白は取る）', await page.evaluate(() => touban.roster[5].name), '木村 一郎');
  await page.fill('#tbNewName', '   '); await page.click('.tb-addbtn'); await page.waitForTimeout(150);
  check('  空のときは足さない', await page.evaluate(() => touban.roster.length), 6);
  await page.reload(); await page.waitForTimeout(900);
  await page.evaluate(() => openTouban()); await page.waitForTimeout(300);
  check('  覚えている', await page.evaluate(() => touban.roster.length), 6);
  check('  名簿があれば、画面の案内はふつうに戻る', await page.evaluate(() =>
    !document.querySelector('#tbNext .tb-next-go')), true);
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

async function runTbSave(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── 当番表の保存（v406） ──');
  // appPrompt / appConfirm に答える
  const ans = async (val, btn) => { await page.waitForTimeout(250);
    await page.evaluate(({ val, btn }) => { const ov = document.querySelector('div[style*="99999"]'); if (!ov) return;
      const inp = ov.querySelector('input,textarea'); if (inp && val != null) inp.value = val;
      const b = [...ov.querySelectorAll('button')].find(x => x.textContent === btn); if (b) b.click(); }, { val, btn });
    await page.waitForTimeout(350); };
  const saves = () => page.evaluate(() => tbGetSaves().map(x => x.name).join('/'));

  await page.evaluate(() => openTouban()); await page.waitForTimeout(300);
  check('  上の帯に 💾保存 がある', await page.evaluate(() => !!document.getElementById('tbSaveBtn')), true);
  check('  空のときは印なし', await page.evaluate(() => document.getElementById('tbSaveBtn').classList.contains('dirty')), false);
  await page.evaluate(() => tbAddNames(['佐藤', '鈴木'])); await page.waitForTimeout(150);
  check('  書きかえると ● が付く', await page.evaluate(() => document.getElementById('tbSaveBtn').classList.contains('dirty')), true);
  await page.click('#tbSaveBtn'); await page.waitForTimeout(400);
  check('  押すと保存の窓が開く', await page.evaluate(() => isDlgOpen('tbSaveOverlay')), true);
  check('  まだ保存していないと言う', await page.evaluate(() =>
    document.getElementById('tbSaveState').textContent.includes('まだ名前を付けて保存していません')), true);
  check('  上書き保存はまだ押せない', await page.evaluate(() => document.getElementById('tbSaveOver').disabled), true);
  await page.evaluate(() => { tbSaveAs(); }); await ans('ごみ当番', 'OK');
  check('  名前を付けて保存できる', await saves(), 'ごみ当番');
  check('  保存すると ● が消える', await page.evaluate(() =>
    document.getElementById('tbSaveBtn').classList.contains('dirty') + '/' + tbDirty()), 'false/false');
  check('  いま開いているものとして出る', await page.evaluate(() =>
    document.getElementById('tbSaveState').textContent.includes('ごみ当番')), true);
  await page.evaluate(() => { touban.title = '掃除当番'; saveTouban(); });
  check('  保存したあとに変えると ● ', await page.evaluate(() => tbDirty()), true);
  await page.evaluate(() => { tbSaveAs(); }); await ans('掃除当番', 'OK');
  check('  いくつも持てる（新しい順）', await saves(), '掃除当番/ごみ当番');
  const gid = await page.evaluate(() => tbGetSaves().find(x => x.name === 'ごみ当番').id);
  await page.evaluate(id => { tbOpenSave(id); }, gid); await page.waitForTimeout(400);
  check('  押すと開き直せる', await page.evaluate(() => touban.title + '/' + tbCurSave().name + '/' + isDlgOpen('tbSaveOverlay')), '当番表/ごみ当番/false');
  // 保存していない変更があるときは聞く
  await page.evaluate(() => tbAddNames(['高橋'])); await page.waitForTimeout(150);
  const sid = await page.evaluate(() => tbGetSaves().find(x => x.name === '掃除当番').id);
  await page.evaluate(() => openTbSaves()); await page.waitForTimeout(300);
  await page.evaluate(id => { tbOpenSave(id); }, sid);
  await ans(null, 'やめる');
  check('  変更があれば切りかえる前に聞く（やめたらそのまま）', await page.evaluate(() => touban.title + '/' + touban.roster.length), '当番表/3');
  await page.evaluate(() => tbSaveOver()); await page.waitForTimeout(200);
  check('  上書き保存', await page.evaluate(() => tbGetSaves().find(x => x.name === 'ごみ当番').data.roster.length + '/' + tbDirty()), '3/false');
  // 名前の変更・コピー・消す
  await page.evaluate(id => { tbRenameSave(id); }, sid); await ans('掃除当番（2026）', 'OK');
  check('  名前を変えられる', await saves(), '掃除当番（2026）/ごみ当番');
  await page.evaluate(id => tbCopySave(id), gid); await page.waitForTimeout(200);
  check('  コピーを作れる', await saves(), '掃除当番（2026）/ごみ当番/ごみ当番 のコピー');
  const cid = await page.evaluate(() => tbGetSaves().find(x => x.name === 'ごみ当番 のコピー').id);
  await page.evaluate(id => { tbDeleteSave(id); }, cid); await ans(null, '消す');
  check('  消せる', await saves(), '掃除当番（2026）/ごみ当番');
  check('  消しても画面の当番表はそのまま', await page.evaluate(() => touban.roster.length), 3);
  // ファイルに書き出す・読み込む
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => tbExportFile())]);
  const txt = fs.readFileSync(await dl.path(), 'utf8');
  const j = JSON.parse(txt);
  check('  ファイルに書き出せる', j.type + '/' + j.name + '/' + j.data.roster.length, 'touban/ごみ当番/3');
  await page.setInputFiles('#tbImportIn', { name: 't.json', mimeType: 'application/json', buffer: Buffer.from(txt) });
  await page.waitForTimeout(500);
  check('  読み込むと一覧に足される', await saves(), 'ごみ当番/掃除当番（2026）/ごみ当番');
  check('  読み込んでもいまの当番表は変わらない', await page.evaluate(() => tbCurSave().name + '/' + touban.roster.length), 'ごみ当番/3');
  await page.setInputFiles('#tbImportIn', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
  await page.waitForTimeout(400);
  // 新しい当番表
  await page.evaluate(() => { tbNewTouban(); }); await page.waitForTimeout(400);
  check('  新しい当番表をつくれる', await page.evaluate(() => touban.title + '/' + touban.roster.length + '/' + (tbCurId() || '無し')), '当番表/0/無し');
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても保存は残る', await saves(), 'ごみ当番/掃除当番（2026）/ごみ当番');
  // 全体のバックアップにも入る
  check('  全体のバックアップに当番表が入る', await page.evaluate(() => { const b = tbBundle(); return b.saves.length; }), 3);
  const n = await page.evaluate(() => { localStorage.removeItem('excalc_touban_saves');
    return tbRestoreBundle({ saves: [{ id: 'x1', name: '戻した分', at: 1, data: { title: 'A', roster: [{ name: 'a' }] } }], cur: null }); });
  check('  バックアップから戻すと保存の一覧に足す', n + '/' + await saves(), '1/戻した分');
  check('  端末の空き具合にも並ぶ', await page.evaluate(() => ST_GROUPS.some(g => g.k === 'excalc_touban_saves')), true);
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* 🎙声の計算帳（koe/。v422 の別アプリ）：話し言葉の計算・会話・足し上げ・予算・くらしの計算・練習・画面 */
async function runKoe(browser) {
  const KOE = 'file://' + path.join(ROOT, 'koe', 'index.html');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(KOE + '#from=hyo'); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); try { sessionStorage.clear(); } catch (_) {} });
  await page.addInitScript(() => { window.KOE_TODAY = '2026-09-25T10:00:00'; });
  await page.reload(); await page.waitForTimeout(500);
  console.log('\n── 🎙声の計算帳（koe/） ──');
  const run = t => page.evaluate(t => { const r = koeRun(t); return r ? r.a : null; }, t);
  const say = t => page.evaluate(t => { const r = koeRun(t); return r ? r.say : null; }, t);
  // A 会話
  check('  「1280円を3つ」', await run('1280円を3つ'), '3,840円');
  check('  「それに消費税」で前の答えに続ける', await run('それに消費税'), '4,224円');
  check('  「4人で割って」は1人あたり', await run('4人で割って'), '1人あたり 1,056円');
  check('  言い直すと最後まで計算し直す', await run('1280じゃなくて1300'), '1,280 → 1,300　1人あたり 1,072.5円');
  check('  いまいくら（お金は1円に丸めて読む）', await say('いまいくら'), 'いまの答えは ひとり 約1073円 です');
  check('  取り消し', await say('取り消し'), '取り消しました。いまの答えは 4290円 です');
  const logQ = () => page.evaluate(() => state.log.map(m => m.q).join('|'));
  check('  取り消した吹き出しは画面から消える（v4）', await logQ(), '1280円を3つ|それに消費税|1280じゃなくて1300|いまいくら');
  check('  左から順に計算する', await page.evaluate(() => koeRun('1200足す350かける2').f), '(1,200 ＋ 350) × 2 ＝ 3,100');
  check('  漢数字も読む', await run('二百五十一かける六十八'), '17,068');
  check('  割引・割合', (await run('1500円の2割引き')) + '/' + (await run('2000円の3割')) + '/' + (await run('1500円を2割5分引き')), '1,200円/600円/1,125円');
  check('  四捨五入（「四」「五」を数字にしない）', await run('1234を100円単位で四捨五入'), '1,200');
  check('  だいたい', await say('だいたい12800を3で割って'), '約4300 です');
  check('  名前を付けて覚える', await run('単価は2800'), '単価 ＝ 2,800');
  check('  名前で計算', await run('単価かける45'), '126,000');
  check('  逆算：売値', await run('原価800円で利益3割の売値'), '売値 1,143円');
  check('  逆算：何パーセント', await run('3000円は12000円の何パーセント'), '25%');
  check('  逆算：元の値段', await run('2割引きで1600円の元の値段'), '元の値段 2,000円');
  check('  逆算：税抜き', await run('税込み3300円の税抜き'), '税抜き 3,000円');
  check('  逆算：何個買える', await run('5000円で380円のものは何個'), '13個（余り 60円）');
  check('  計算できない言葉は、そう言う', await page.evaluate(() => koeRun('こんにちは').cls), 'err');
  // B 足し上げ・読み合わせ
  await run('足し上げ開始');
  check('  足し上げ：単価×数', await run('セメント12袋単価850円'), 'セメント　12袋 × 850円　10,200円');
  check('  足し上げ：数と金額', await say('砂3立米12000円'), '砂 3立米 12000円。合計 22200円');
  check('  足し上げの中で言い直す', await say('12000じゃなくて12500'), '12,000 を 12,500 に直しました。合計は 22700円、2件です');
  check('  何件', await say('何件'), '2件です。合計は 22700円、2件です');
  check('  読み合わせ：合っている', await run('伝票の合計は22700円'), '✅ 合っています（22,700円）');
  check('  読み合わせ：合わない', await page.evaluate(() => koeRun('伝票の合計は23000円').say), '合いません。伝票は 23000円、読み上げの合計は 22700円、差は 300円 です');
  check('  おしまい', await run('おしまい'), '合計 22,700円（2件）');
  check('  締めた合計に続けて計算できる', await run('それに消費税'), '24,970円');
  // D くらし
  await run('予算5000円');
  check('  予算：残りを言う', await say('498円'), '498円。残り 4502円');
  check('  予算：数も言える', await say('牛乳238円を2本'), '牛乳 476円。残り 4026円');
  check('  予算：こえたら知らせる', await page.evaluate(() => koeRun('5000円').cls), 'err');
  await run('おしまい');
  check('  どっちが得', await run('300グラム498円と500グラム798円どっちが得'), '👍 500グラム 798円 のほうが得');
  check('  割り勘（条件つき）', await say('12800円を4人で割り勘、1人は2割引き、100円単位'), 'ふつうの人は ひとり 3400円、幹事は 3300円、2割引きの人は 2700円 です');
  check('  割り勘（割り切れないと幹事が端数）', await run('10000円を3人で割り勘'), '3,334円 × 2人　幹事 3,332円');
  check('  お釣り', await run('3280円を1万円で払ったらお釣り'), 'お釣り 6,720円');
  check('  家計簿に付ける', await run('スーパー 3280円 食費'), '📒 食費 3,280円（スーパー）');
  await run('ガソリン 5000円');
  check('  家計簿の合計', await say('今月いくら使った'), '今月使ったのは 8280円。多いのは 車 5000円、食費 3280円');
  check('  家計簿は取り消しで消える', await page.evaluate(() => { koeRun('取り消し'); return book.length; }), 1);
  check('  働いた時間と日給', await run('8時半から17時15分 休憩1時間 時給1200円'), '実働 7時間45分（7.75時間）　日給 9,300円');
  check('  夜をまたぐ', await run('22時から翌6時 休憩1時間'), '実働 7時間');
  check('  時間の足し算', await run('2時間45分と1時間30分'), '4時間15分（4.25時間）');
  check('  何日後', await run('今日から90日後'), '2026年12月24日（木）');
  check('  あと何日', await run('12月25日まであと何日'), 'あと 91日');
  check('  何曜日', await run('3月3日は何曜日'), '2026年3月3日（火）');
  // F 練習
  const q = await page.evaluate(() => { koeRun('九九の練習'); return state.drill.q; });
  check('  練習：九九を出す', q.op + '/' + (q.a >= 1 && q.a <= 9), '*/true');
  check('  練習：正しい答えは せいかい', await page.evaluate(a => koeRun(String(a)).say.slice(0, 5), q.ans), 'せいかい！');
  check('  練習：おしまいで数を言う', await say('おしまい'), '練習おしまい。1問中 1問 せいかいでした');
  // 画面
  await page.evaluate(() => { runText('1280円を3つ'); });
  check('  答えの欄に出る', await page.evaluate(() => document.getElementById('ansBig').textContent), '3,840円');
  check('  会話の記録に出る', await page.evaluate(() => { const m = [...document.querySelectorAll('#log .msg')]; return m[m.length - 2].textContent + '|' + m[m.length - 1].querySelector('.a').textContent; }), '1280円を3つ|3,840円');
  await page.fill('#typeIn', '足し上げ開始'); await page.press('#typeIn', 'Enter'); await page.waitForTimeout(100);
  check('  打っても計算できる／足し上げのチップが光る', await page.evaluate(() => document.querySelector('#modes .chip.on').dataset.m + '|' + document.getElementById('ansLabel').textContent), 'sum|📦 足し上げ中');
  await page.evaluate(() => runText('おしまい'));
  check('  表電卓から来たら戻るボタン', await page.evaluate(() => !document.getElementById('backHyo').hidden), true);
  await page.evaluate(() => openPanel('help')); await page.waitForTimeout(150);
  check('  使い方の例が並ぶ', await page.evaluate(() => document.querySelectorAll('#helpBody .ex').length > 40), true);
  await page.goBack(); await page.waitForTimeout(300);
  check('  「戻る」で窓だけ閉じる', await page.evaluate(() => document.getElementById('p-help').classList.contains('open') + '|' + location.pathname.endsWith('/koe/index.html')), 'false|true');
  await page.evaluate(() => openPanel('book')); await page.waitForTimeout(150);
  check('  家計簿の窓に今月の分', await page.evaluate(() => document.getElementById('bkTotal').textContent + '|' + document.querySelectorAll('#bkList .bk-item').length), '3,280円|1');
  await page.evaluate(() => closePanel()); await page.waitForTimeout(300);
  await page.evaluate(() => openVoiceOnly()); await page.waitForTimeout(150);
  check('  声だけの画面に大きな答え', await page.evaluate(() => document.getElementById('voice-only').classList.contains('open') + '|' + document.getElementById('voBig').textContent), 'true|3,840円');
  await page.evaluate(() => closeVoiceOnly()); await page.waitForTimeout(300);
  check('  声だけの画面を閉じる', await page.evaluate(() => document.getElementById('voice-only').classList.contains('open')), false);
  check('  声だけ：聞き取った言葉と式も出す', await page.evaluate(() => { openVoiceOnly(); const r = [document.getElementById('voHeard').textContent, document.getElementById('voF').textContent]; closeVoiceOnly(); return r.join('|'); }),
    '「おしまい」|1,280円 × 3つ ＝ 3,840円');   // いちばん新しく聞いた言葉と、いまの答えの式
  await page.waitForTimeout(300);
  // 開き直しても残る
  await page.reload(); await page.waitForTimeout(500);
  check('  開き直しても答え・記録・家計簿・名前が残る', await page.evaluate(() =>
    document.getElementById('ansBig').textContent + '|' + (state.log.length > 50) + '|' + book.length + '|' + (vars['単価'] || {}).v), '3,840円|true|1|2800');
  check('  続きから計算できる', await run('それを2倍'), '7,680円');
  // 🧹リセット（v2）
  await page.evaluate(() => resetScreen()); await page.waitForTimeout(100);
  check('  リセットで画面の会話と答えが消える', await page.evaluate(() => state.log.length + '|' + document.getElementById('ansBig').textContent + '|' + !!document.querySelector('#log .log-empty')), '0|—|true');
  check('  リセットしても家計簿と名前は残る', await page.evaluate(() => book.length + '|' + (vars['単価'] || {}).v), '1|2800');
  check('  すぐあとの取り消しで元に戻る', await say('取り消し'), 'リセットの前に戻しました。いまの答えは 7680円 です');
  check('  声の「リセット」でも消える', await page.evaluate(() => { koeRun('リセット'); return state.entries.length + '|' + state.lastV; }), '0|null');
  check('  リセットのあと計算したら、取り消しは計算のほう', await page.evaluate(() => { koeRun('100円を2つ'); return koeRun('取り消し').say; }), '取り消しました。まだ計算していません');
  await run('7680円');
  check('  消費税の率を変えられる', (await run('消費税は8%')) + '/' + (await run('1000円に消費税')), '消費税 8%/1,080円');
  // 取り消しで、その計算の吹き出しと言い直しも消える（v4）
  await page.evaluate(() => { resetAll(); state.resetSnap = null; });
  await run('500円を2つ'); await run('それに300円足して'); await run('500じゃなくて600');
  check('  言い直しは元の計算に付く', await logQ(), '500円を2つ|それに300円足して|500じゃなくて600');
  await run('取り消し');
  check('  1つ目の取り消し：足した分だけ消える', await logQ(), '500円を2つ|500じゃなくて600');
  await run('取り消し');
  check('  2つ目の取り消し：言い直しも一緒に消える', await logQ(), '');
  check('  もう取り消せないときは、そう言う', (await say('取り消し')) + '/' + await logQ(), '取り消せるものはありません/取り消し');
  await page.evaluate(() => { koeRun('100円を3つ'); render(); koeRun('取り消し'); runText('200円を2つ'); runText('取り消し'); });
  check('  画面の吹き出しからも消え、知らせを出す', await page.evaluate(() => document.querySelectorAll('#log .msg.me').length + '/' + /取り消しました/.test(document.body.innerText)), '1/true');
  check('  もう一回で取り消しの答えを読む', await say('もう一回'), '取り消しました。まだ計算していません');
  // いろいろな言い方（v5）：tests/koe-phrases.js の文例を、1つずつまっさらな状態で確かめる
  const PHR = require('./koe-phrases.js');
  await page.evaluate(() => { settings.tax = 10; saveSettings(); });   // 文例は消費税 10% で書いてある
  let phrN = 0;
  for (const [cat, list] of Object.entries(PHR)) {
    const bad = [];
    for (const [q, want] of list) {
      const r = await page.evaluate(q => { state.entries = []; state.log = []; state.drill = null; state.ask = null; recomputeAll();
        const r = koeRun(q); return { a: r && r.a, cls: r && r.cls, v: state.lastV }; }, q);
      const ok = typeof want === 'number' ? (r.v != null && Math.abs(r.v - want) <= Math.max(0.005, 1e-4 * Math.abs(want))) : String(r.a || '').includes(want);
      if (!ok) bad.push(q + ' → ' + (r.a || '—') + '（' + want + ' のはず）');
      phrN++;
    }
    check('  言い方：' + cat + '（' + list.length + '件）', bad.join(' / '), '');
  }
  check('  文例の数', phrN >= 300, true);
  check('  型の数と言い回しの数を数えられる', await page.evaluate(() => { const s = phraseStats(); return s.types >= 140 && s.forms > 1e6; }), true);
  check('  型の答えも「それに…」で続けられる', await page.evaluate(() => { state.entries = []; recomputeAll(); koeRun('8と3の差'); return koeRun('それに2をかけて').a; }), '10');   // 「2をかけて」のように、数のあとに言った「かける」も前の答えにかける
  check('  型の答えも言い直せる', await page.evaluate(() => koeRun('8じゃなくて9').a), '8 → 9　12');
  check('  換算の答えも取り消せる', await page.evaluate(() => { state.entries = []; state.log = []; recomputeAll(); koeRun('5キロは何メートル'); koeRun('取り消し'); return state.lastV + '/' + state.log.length; }), 'null/0');
  const helpBad = await page.evaluate(() => { const bad = [];
    for (const g of HELP) for (const x of g.ex) { if (/それに|人で割って|じゃなくて|練習|おしまい|取り消し|もう一回|リセット|ゆっくり|はやく|何件|いまいくら|足し上げ開始|予算5000円|伝票/.test(x)) continue;
      state.entries = []; state.log = []; state.mode = 'normal'; state.drill = null; recomputeAll(); const r = koeRun(x); if (!r || r.cls === 'err') bad.push(x); }
    state.entries = []; state.log = []; recomputeAll(); return bad.join(' / '); });
  check('  使い方の例はどれも計算できる', helpBad, '');
  // 家計簿（v8）：お店から分類を決める・言い方の切れはしをメモに残さない・予算の品物は取らない
  const bk = q => page.evaluate(q => { state.entries = []; state.log = []; state.mode = 'normal'; recomputeAll(); const r = koeRun(q); return r ? r.a : ''; }, q);
  check('  家計簿：お店から分類', await bk('スーパーで3280円使いました'), '📒 食費 3,280円（スーパー）');
  check('  家計簿：行き先から分類', await bk('タクシーで1800円'), '📒 交通費 1,800円（タクシー）');
  check('  家計簿：「家計簿」と言えば分類なしでも付ける', await bk('家計簿に1500円'), '📒 雑費 1,500円');
  check('  家計簿：語尾をメモに残さない', (await bk('食費3280円です')) + '/' + (await bk('食費として3280円')) + '/' + (await bk('電気代は8000円でした')), '📒 食費 3,280円/📒 食費 3,280円/📒 光熱費 8,000円');
  check('  家計簿：円の付いた数を金額に', await bk('食費 2点で 500円'), '📒 食費 500円（2点）');
  check('  家計簿：計算の言い方は取らない', await bk('スーパーで300円を3つ'), '900円');
  check('  家計簿：予算の品物は取らない', await page.evaluate(() => { state.entries = []; state.log = []; recomputeAll(); koeRun('予算5000円'); const r = koeRun('コンビニで498円'); const a = r.a + '/' + state.mode; koeRun('おしまい'); return a; }), 'コンビニで　498円/budget');
  // 計算できないとき（v10）：たとえばの式は読まない・近い言い方を「もしかして」で出す
  const one = q => page.evaluate(q => { state.entries = []; state.log = []; state.mode = 'normal'; recomputeAll(); const r = koeRun(q); return { say: r.say, a: r.a, f: r.f || '', sug: r.sug || '' }; }, q);
  const ng = await one('こんにちは');
  check('  計算できないときは、たとえばの式を読まない', ng.say + '/' + /たとえば/.test(ng.say + ng.a), '計算できませんでした/false');
  const mk = await one('2割引きになった1600円の最初の値段');
  check('  近い言い方があれば、言った数で「もしかして」', mk.sug + '/' + mk.say, '2割引きで1600円の元の値段/計算できませんでした');
  const sk = await one('底辺6と高さ4の三角の面積');
  check('  計算の言葉を読み飛ばしたときも「もしかして」を出す', sk.sug, '底辺6高さ4の3角形の面積');
  check('  品名つきの計算には出さない', (await one('牛乳238円を2本')).sug + '|' + (await one('りんご120円を3つ')).sug + '|' + (await one('卵248円と牛乳198円')).sug, '||');
  check('  「もしかして」を押すと、その言い方で計算する', await page.evaluate(() => { state.entries = []; state.log = []; recomputeAll(); koeRun('底辺6と高さ4の三角の面積'); render();
    const b = document.querySelector('#log .sug'); if (!b) return 'no button'; b.click(); return state.log[state.log.length - 1].q + ' → ' + state.log[state.log.length - 1].a; }), '底辺6高さ4の3角形の面積 → 面積 12');
  check('  試しても家計簿や記録は変わらない', await page.evaluate(() => { const n = book.length, l = localStorage.getItem('koe_book'); suggestFor('スーパーで3280円くらい使った気がする'); return book.length === n && localStorage.getItem('koe_book') === l && !DRY; }), true);
  check('  前の答えがないときも、たとえばの式は読まない', (await one('それに消費税')).say, '前の答えがありません');
  // 家計簿：分類ごとの予算・直す・CSV（v14）
  const bk2 = q => page.evaluate(q => { state.mode = 'normal'; const r = koeRun(q); return r ? r.say : ''; }, q);
  await page.evaluate(() => { book = []; saveBook(); catBudget = {}; saveCatBudget(); state.entries = []; state.log = []; recomputeAll(); });
  check('  分類ごとの予算を決める', await bk2('食費の予算は3万円'), '食費の予算を 月30000円 にしました。今月は 0円 使いました。食費の残りは 30000円 です');
  check('  付けるたびに残りを言う', await bk2('スーパーで3280円'), '食費 3280円 を家計簿に付けました。今月の食費は 3280円 です。食費の残りは 26720円 です');
  check('  「食費はあといくら」', await bk2('食費はあといくら'), '食費の残りは 26720円 です');
  check('  こえたら、こえた分を言う', (await bk2('外食の予算は5000円')) && await bk2('ラーメン 5800円'), '外食 5800円 を家計簿に付けました。今月の外食は 5800円 です。外食は予算を 800円 こえています');
  check('  予算をやめる', (await bk2('外食の予算をやめて')) + '/' + (await bk2('外食はあといくら')), '外食の予算をやめました/外食の予算はまだ決めていません');
  check('  家計簿の画面に「使った分／予算」を出す', await page.evaluate(() => { openPanel('book'); const t = $('bkCats').textContent; return /3,280円 \/ 30,000円/.test(t); }), true);
  check('  押すと直す窓が開き、直せる', await page.evaluate(() => { const it = document.querySelector('#bkList .bk-item'); it.click(); const open = !$('bkEdit').hidden;
    $('bkEAmt').value = '3,300'; $('bkECat').value = '日用品'; $('bkEMemo').value = 'ドラッグストア'; saveBookEdit();
    const b = book.find(x => x.memo === 'ドラッグストア'); return open + '/' + (b && b.amt + ' ' + b.cat) + '/' + $('bkEdit').hidden; }), 'true/3300 日用品/true');
  const csvDl = await Promise.all([page.waitForEvent('download', { timeout: 9000 }), page.evaluate(() => bookCsv())]).then(a => a[0]).catch(() => null);
  const csvTxt = csvDl ? fs.readFileSync(await csvDl.path(), 'utf8') : '';
  check('  この月を CSV で書き出す', csvDl ? csvTxt.split('\r\n')[0] + '|' + csvTxt.includes('"2026-09-25","日用品","3300","ドラッグストア"') + '|' + csvTxt.split('\r\n').length : 'なし', '\ufeff"日付","分類","金額","メモ"|true|4');   // 名前は file:// の試験では付かないので中身で見る
  await page.evaluate(() => { closeTop(); book = []; saveBook(); catBudget = {}; saveCatBudget(); });
  // 読み飛ばした計算の言葉があるときは、答えを決めずに確かめる（v12）
  const sk2 = await page.evaluate(() => { state.entries = []; state.log = []; recomputeAll(); const r = koeRun('原価800円に3割のせて'); return { say: r.say, sug: r.sug, lit: r.lit, litA: r.litA, n: state.entries.length }; });
  check('  分からない言葉を言い、答えは決めない', sk2.say + '/' + sk2.n, '「原価」が分かりませんでした/0');
  check('  「もしかして」と「このまま計算」を出す', sk2.sug + ' | ' + sk2.litA, '原価800円で利益3割の売値 | 1,040円（800円 × 1.3（3割増し））');
  check('  「このまま計算」を押すと、そのままの式で計算する', await page.evaluate(() => { render(); const b = document.querySelector('#log .sug.lit'); if (!b) return 'no button'; b.click(); return state.lastV + '/' + state.entries.length; }), '1040/1');
  check('  近い言い方がなくても、読み飛ばして答えない', await page.evaluate(() => { state.entries = []; state.log = []; recomputeAll(); const r = koeRun('縦3メートルと横4メートルの広さ'); return r.say + '/' + state.lastV; }), '「広さ」が分かりませんでした/null');
  check('  品名だけを答えの前に読む', await page.evaluate(() => { state.entries = []; recomputeAll(); return koeRun('ナントカ1280円を3つだよね').say; }), 'ナントカ 3840円 です');
  check('  「3個で300円」は1個あたりも言う', await page.evaluate(() => { state.entries = []; recomputeAll(); const r = koeRun('みかん3個で300円'); return r.a + '/' + state.lastV; }), 'みかん 3個で 300円（1個 100円）/300');
  check('  足し上げのときは品物として受け取る', await page.evaluate(() => { state.entries = []; recomputeAll(); koeRun('足し上げ開始'); const r = koeRun('みかん3個で300円'); const a = r.a + '/' + state.sum; koeRun('おしまい'); return a; }), 'みかん　3個　300円/300');
  // うまくいかなかった言葉を残す（v12）
  check('  うまくいかなかった言葉を残す', await page.evaluate(() => { localStorage.removeItem('koe_misses'); koeRun('こんにちは'); koeRun('縦3メートルと横4メートルの広さ'); koeRun('こんにちは'); dryRun('ぴよぴよ'); return loadMisses().map(x => x.q + ':' + x.k).join(','); }), 'こんにちは:ng,縦3メートルと横4メートルの広さ:skip');
  check('  設定に一覧が出て、コピー用の文にできる', await page.evaluate(() => { openPanel('set'); const t = $('missList').textContent + '|' + $('missCount').textContent; closeTop(); return t.includes('縦3メートル') + '/' + missText().split('\n').length; }), 'true/2');
  // 声だけの画面で式も読む（v11）。設定で切れる
  check('  式を読みやすい言葉に', await page.evaluate(() => [formulaSpeech('1,280円 × 3つ ＝ 3,840円'), formulaSpeech('(1,200 ＋ 350) × 2 ＝ 3,100'), formulaSpeech('1,500円 × 0.8（2割引き） ＝ 1,200円'),
    formulaSpeech('2 ^ 10 ＝ 1,024'), formulaSpeech('2/3 × 9 ＝ 6'), formulaSpeech('今月の食費 3,280円'), formulaSpeech('もしかして「8と3の差」？')].join('|')),
    '1280円 かける 3つ|かっこ 1200 たす 350 かっことじ かける 2|1500円 の2割引き|2 の10乗|3ぶんの2 かける 9||');
  const saidVo = await page.evaluate(() => { const sp = window.speak; let said = ''; window.speak = t => { said = t; };
    state.entries = []; state.log = []; recomputeAll(); openPanel('vo'); settings.voF = true; runText('1280円を3つ', false); const on = said + '|' + state.lastSay;
    settings.voF = false; runText('4人で割って', false); const off = said; settings.voF = true; closeTop(); runText('それに2をかけて', false); const normal = said;
    window.speak = sp; return [on, off, normal].join(' / '); });
  check('  声だけの画面で、式も読む（もう一回でも）', saidVo.split(' / ')[0], '1280円 かける 3つ。3840円 です|1280円 かける 3つ。3840円 です');
  check('  設定を切ると、答えだけ読む', saidVo.split(' / ')[1], 'ひとり 960円 です');
  check('  ふつうの画面では、答えだけ読む', saidVo.split(' / ')[2], '1920円 です');
  check('  設定に「式も読み上げる」がある', await page.evaluate(() => !!document.querySelector('.sw[data-set="voF"]') && SET_DEF.voF === true), true);
  // 新しい版がすぐ届くように（koe v3・表電卓 v423・会計アプリ v14）
  for (const [nm, p] of [['表電卓', 'service-worker.js'], ['声の計算帳', 'koe/service-worker.js'], ['会計アプリ', 'kaikei/service-worker.js']]) {
    const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
    check('  ' + nm + '：毎回サーバーにたしかめて取る', s.includes("cache: 'no-cache'") && s.includes('netFetch(e.request)'), true);
    check('  ' + nm + '：入れるときも新しく取る', s.includes("cache: 'reload'"), true);
  }
  const koeRaw = fs.readFileSync(path.join(ROOT, 'koe/index.html'), 'utf8');
  check('  声の計算帳：入れ替わったら読み込み直す', koeRaw.includes("addEventListener('controllerchange'") && koeRaw.includes('reloadWhenIdle'), true);
  check('  声の計算帳：版の名前が合っている', fs.readFileSync(path.join(ROOT, 'koe/service-worker.js'), 'utf8').includes("'koe-" + await page.evaluate(() => APP_VERSION) + "'"), true);
  check('  エラーが出ない', errs.join(' | '), '');
  await ctx.close();
  // 表電卓からの入口
  const h = await newPage(browser);
  check('  表電卓：道具の一覧にある', await h.page.evaluate(() => !!NP_TOOLS.find(t => t.id === 'koe') && !!(KEY_FUNCS.a_koe && REG_GESTURE_ACTIONS.has('a_koe'))), true);
  check('  表電卓：開く先は koe/（戻れるしるし付き）', await h.page.evaluate(() => {
    let got = ''; const real = window.openSameWindow;
    window.openSameWindow = u => { got = u; };
    try { openKoeApp(); } finally { window.openSameWindow = real; }
    return /\/koe\/(index\.html)?#from=hyo$/.test(got); }), true);
  check('  表電卓：QR で共有できる', await h.page.evaluate(() => { qrSetWhich('koe'); return /\/koe\/$/.test(qrAppUrl('koe')) && QR_NAMES.koe; }), '声の計算帳');
  await h.ctx.close();
}
/* 声の計算帳 v7：話している途中で聞き取りが切れても、つなげて、話し終わってから計算する。
   端末の聞き取りのかわりに、途中で切れる「にせの聞き取り」を入れて確かめる */
async function runKoeListen(browser, ua) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, ua ? { userAgent: ua } : {}));
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => {
    window.__recs = [];
    class FakeRec {
      constructor() { this.on = false; this.list = []; window.__recs.push(this); }
      start() { this.on = true; setTimeout(() => this.onstart && this.onstart(), 5); }
      stop() { if (!this.on) return; this.on = false; if (this.pending) { this.say(this.pending, true); this.pending = null; } setTimeout(() => this.onend && this.onend(), 10); }
      abort() { this.on = false; setTimeout(() => this.onend && this.onend(), 5); }
      // 本物と同じく、この回で聞いた言葉の一覧をまるごと渡す（確定前のものは最後の1つ）
      say(t, fin) { const r = [{ transcript: t }]; r.isFinal = !!fin; const lastOpen = this.list.length && !this.list[this.list.length - 1].isFinal;
        const idx = lastOpen ? this.list.length - 1 : this.list.length; this.list[idx] = r; this.pending = fin ? null : t;
        this.onresult && this.onresult({ resultIndex: idx, results: this.list }); }
      resend() { this.onresult && this.onresult({ resultIndex: 0, results: this.list }); }   // Android：同じ一覧をもう一度送ってくる
      cut() { this.on = false; this.onend && this.onend(); }   // 端末が勝手に切る
    }
    window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec;
    try { localStorage.setItem('koe_settings', JSON.stringify({ speak: false, beep: false, vib: false, wait: 'short' })); } catch (_) {}
  });
  await page.goto('file://' + path.join(ROOT, 'koe', 'index.html')); await page.waitForTimeout(400);
  console.log('\n── 🎙声の計算帳：話し終わるまで待つ（v7）' + (ua ? '・Android' : '') + ' ──');
  const cur = () => page.evaluate(() => window.__recs[window.__recs.length - 1]);
  const last = () => page.evaluate(() => { const m = state.log[state.log.length - 1]; return m ? m.q + ' → ' + m.a : ''; });
  const W = 1000;   // 短め
  // 途中で切れても聞き直して、つなげて計算する
  await page.evaluate(() => { state.entries = []; state.log = []; recomputeAll(); micTap(); }); await page.waitForTimeout(60);
  await page.evaluate(() => { const r = window.__recs.at(-1); r.say('1280円を', true); r.cut(); }); await page.waitForTimeout(250);
  check('  途中で切れたら聞き直す', await page.evaluate(() => window.__recs.length + '/' + state.log.length + '/' + recOn), '2/0/true');
  check('  聞こえたところまでを出す', await page.evaluate(() => $('heard').textContent), '🎙 1280円を …');
  await page.evaluate(() => window.__recs.at(-1).say('3つ', true)); await page.waitForTimeout(W + 400);
  check('  つなげて、話し終わってから計算する', await last(), '1280円を3つ → 3,840円');
  check('  計算したら聞くのをやめる', await page.evaluate(() => recOn + '/' + wantListen), 'false/false');
  // 言いかけ（「1280円を」）で止まったら倍待つ
  await page.evaluate(() => { micTap(); }); await page.waitForTimeout(60);
  await page.evaluate(() => window.__recs.at(-1).say('それに', true)); await page.waitForTimeout(W + 300);
  check('  言いかけのときは、まだ計算しない', await page.evaluate(() => state.log.length), 1);
  await page.evaluate(() => window.__recs.at(-1).say('消費税', true)); await page.waitForTimeout(W + 400);
  check('  続きを言えば、つなげて計算する', await last(), 'それに消費税 → 4,224円');
  // まだ確定していない言葉も、待ったあとで受け取る
  await page.evaluate(() => { micTap(); }); await page.waitForTimeout(60);
  await page.evaluate(() => window.__recs.at(-1).say('4人で割って', false)); await page.waitForTimeout(W + 400);
  check('  確定前の言葉も受け取って計算する', await last(), '4人で割って → 1人あたり 1,056円');
  // 🎙 をもう一度押すと、待たずにすぐ計算する
  await page.evaluate(() => { micTap(); }); await page.waitForTimeout(60);
  await page.evaluate(() => { window.__recs.at(-1).say('100円を2つ', true); micTap(); }); await page.waitForTimeout(150);
  check('  もう一度押すとすぐ計算する', await last(), '100円を2つ → 200円');
  // 何も言わずに押し直すと、やめる
  const n0 = await page.evaluate(() => state.log.length);
  await page.evaluate(() => { micTap(); }); await page.waitForTimeout(60);
  await page.evaluate(() => { micTap(); }); await page.waitForTimeout(150);
  check('  何も言わずに押し直すとやめる', await page.evaluate(n0 => state.log.length === n0 && !recOn && !wantListen, n0), true);
  // 待つ時間を選べる
  check('  待つ時間を選べる', await page.evaluate(() => { setWait('long'); const a = settings.wait; setWait('short'); return a + '/' + JSON.parse(localStorage.getItem('koe_settings')).wait; }), 'long/short');
  // Android の Chrome のように、同じ言葉を何度も返しても1回だけ数える（v9）
  await page.evaluate(() => { state.entries = []; state.log = []; recomputeAll(); book = []; saveBook(); micTap(); }); await page.waitForTimeout(60);
  await page.evaluate(() => { const r = window.__recs.at(-1); r.say('ガソリン代', true); r.resend(); r.resend(); r.say('ガソリン代ガソリン代 2480円', true); r.resend(); });
  check('  同じ言葉が何度届いても1回だけ', await page.evaluate(() => utterText()), 'ガソリン代 2480円');
  await page.waitForTimeout(W + 400);
  check('  家計簿にも1回だけ付く', await page.evaluate(() => book.length + '/' + (book[0] && book[0].amt) + '/' + (book[0] && book[0].memo)), '1/2480/');
  check('  続けて繰り返された言葉は1つにまとめる', await page.evaluate(() => collapseRepeats('ガソリン代ガソリン代ガソリン代 1280円') + '/' + collapseRepeats('1212円')), 'ガソリン代 1280円/1212円');
  check('  スマホでは続けて聞く方式を使わない', await page.evaluate(ua => MOBILE === !!ua && window.__recs.at(-1).continuous === !ua, ua), true);
  // 家計簿の画面からも声で付けられる（v8）
  await page.evaluate(() => { book = []; saveBook(); openPanel('book'); }); await page.waitForTimeout(200);
  check('  家計簿の画面に 🎙 がある', await page.evaluate(() => { const b = document.getElementById('bkMic'); return !!b && b.offsetParent !== null; }), true);
  await page.evaluate(() => document.getElementById('bkMic').click()); await page.waitForTimeout(60);
  check('  押すと聞いて、画面に聞こえた言葉を出す', await page.evaluate(() => { window.__recs.at(-1).say('スーパーで3280円', true); return $('bkMic').textContent + '/' + $('bkHeard').textContent; }), '✔ すぐ付ける/🎙 スーパーで3280円 …');
  await page.waitForTimeout(W + 400);
  check('  家計簿の画面で付けたものが、すぐ一覧に出る', await page.evaluate(() => book.length + '/' + /3,280円/.test($('bkList').textContent)), '1/true');
  await page.evaluate(() => closePanel()); await page.waitForTimeout(200);
  // 聞きっぱなし：間をあけて2回に分かれても、1つの言葉として計算する
  await page.evaluate(() => { state.entries = []; state.log = []; recomputeAll(); toggleHandsFree(); }); await page.waitForTimeout(700);
  await page.evaluate(() => { const r = window.__recs.at(-1); r.say('500円を', true); r.cut(); }); await page.waitForTimeout(250);
  await page.evaluate(() => window.__recs.at(-1).say('4つ', true)); await page.waitForTimeout(W + 400);
  check('  聞きっぱなしでも、つなげて計算する', await last(), '500円を4つ → 2,000円');
  check('  聞きっぱなしは、計算のあとまた聞く', await page.evaluate(async () => { await new Promise(r => setTimeout(r, 400)); return recOn; }), true);
  await page.evaluate(() => { toggleHandsFree(); }); await page.waitForTimeout(200);
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}
/* v425 / 声の計算帳 v13：声の計算帳のデータもバックアップに入れる */
async function runKoeBackup(browser) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  console.log('\n── 🎙声の計算帳のバックアップ（v425・koe v13） ──');
  await page.goto('file://' + path.join(ROOT, 'index.html')); await page.waitForTimeout(800);
  const BOOK = JSON.stringify([{ id: 1, d: '2026-09-25', amt: 3280, cat: '食費', memo: 'スーパー' }, { id: 2, d: '2026-09-25', amt: 1800, cat: '交通費', memo: 'タクシー' }]);
  await page.evaluate(BOOK => { localStorage.setItem('koe_book', BOOK); localStorage.setItem('koe_vars', JSON.stringify({ 単価: { v: 2800, u: '' } }));
    localStorage.setItem('koe_settings', JSON.stringify({ wait: 'long' })); localStorage.setItem('koe_misses', JSON.stringify([{ q: 'こんにちは', k: 'ng', t: 1 }])); }, BOOK);
  // 表電卓の書き出しに入る
  const dl = await Promise.all([page.waitForEvent('download', { timeout: 9000 }), page.evaluate(() => { window.appConfirm = async () => true; return exportSaves(); })]).then(a => a[0]).catch(() => null);
  let payload = null;
  if (dl) { const fp = await dl.path(); payload = JSON.parse(fs.readFileSync(fp, 'utf8')); }
  check('  表電卓の書き出しに声の計算帳が入る', payload && payload.koe ? Object.keys(payload.koe).sort().join(',') : 'なし', 'koe_book,koe_misses,koe_settings,koe_vars');   // 決めたものだけ（koe_catbudget なども入る）
  // 消してから読み込むと戻る（聞かれて「はい」）
  const back = await page.evaluate(async p => {
    ['koe_book', 'koe_vars', 'koe_settings', 'koe_misses'].forEach(k => localStorage.removeItem(k));
    let asked = ''; window.appConfirm = async m => { asked += m.slice(0, 12) + '|'; return /声の計算帳/.test(m); }; window.alert = () => {};
    importSaves({ target: { files: [new File([JSON.stringify(p)], 'b.json')], value: '' } });
    await new Promise(r => setTimeout(r, 800));
    return (JSON.parse(localStorage.getItem('koe_book') || '[]').length) + '/' + JSON.parse(localStorage.getItem('koe_settings') || '{}').wait + '/' + /声の計算帳/.test(asked); }, payload);
  check('  読み込むと聞いてから戻す', back, '2/long/true');
  // 声の計算帳だけの書き出しファイルも、表電卓で読める
  const only = await page.evaluate(async () => {
    localStorage.removeItem('koe_book'); window.appConfirm = async () => true; window.alert = () => {};
    const f = { app: 'koe', type: 'koe', version: 1, data: { koe_book: JSON.stringify([{ id: 9, d: '2026-09-01', amt: 500, cat: '雑費', memo: '' }]) } };
    importSaves({ target: { files: [new File([JSON.stringify(f)], 'k.json')], value: '' } });
    await new Promise(r => setTimeout(r, 600)); return JSON.parse(localStorage.getItem('koe_book') || '[]').length; });
  check('  声の計算帳だけのファイルも表電卓で読める', only, 1);
  check('  変な中身は受け取らない', await page.evaluate(() => restoreKoeBundle({ koe_book: 'こわれた', koe_other: '[]' })), 0);
  // 声の計算帳の中でも書き出し・読み込み
  const kp = await ctx.newPage(); kp.on('pageerror', e => errs.push(e.message)); kp.on('dialog', d => d.accept());
  await kp.goto('file://' + path.join(ROOT, 'koe', 'index.html')); await kp.waitForTimeout(500);
  const kd = await Promise.all([kp.waitForEvent('download', { timeout: 9000 }), kp.evaluate(() => koeExport())]).then(a => a[0]).catch(() => null);
  let kj = null; if (kd) kj = JSON.parse(fs.readFileSync(await kd.path(), 'utf8'));
  check('  声の計算帳の設定から書き出せる', kj ? kj.type + '/' + (JSON.parse(kj.data.koe_book).length) : 'なし', 'koe/1');
  check('  設定に書き出し・読み込みのボタン', await kp.evaluate(() => { openPanel('set'); const t = document.getElementById('p-set').textContent; return /⬇ 書き出す/.test(t) && /⬆ 読み込む/.test(t); }), true);
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}
/* v424：電卓モードの声も、声の計算帳と同じ言い方（koe/phrase.js）で計算する */
async function runDtPhrase(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── 電卓の声：いろいろな言い方（v424） ──');
  check('  はじめは読み込まない（起動を軽く）', await page.evaluate(() => !!window.KoePhrase), false);
  check('  声を使うときに読み込む', await page.evaluate(async () => { switchMode('dentaku'); return await loadKoePhrase(); }), true);
  await page.evaluate(() => { window.speechSay = () => {}; taxPct = 10; });
  const PHR = require('./koe-phrases.js');
  // 電卓はかけ算を先に計算する（声の計算帳は左から順）。この1件だけ答えがちがうのが決まり
  const DT_DIFF = { '1200足す350かける2': 1900 };
  let n = 0;
  for (const [cat, list] of Object.entries(PHR)) {
    const bad = [];
    for (const [q, want0] of list) {
      const want = q in DT_DIFF ? DT_DIFF[q] : want0;
      const r = await page.evaluate(q => { disp_val = '0'; voiceAcceptDentaku(q); return { d: disp_val, t: (document.getElementById('dtVoice') || {}).textContent || '' }; }, q);
      const v = parseFloat(String(r.d).replace(/,/g, ''));
      const ok = typeof want === 'number' ? Math.abs(v - want) <= Math.max(0.01, 1e-4 * Math.abs(want)) : r.t.includes(want);
      if (!ok) bad.push(q + ' → ' + r.d);
      n++;
    }
    check('  電卓の声：' + cat + '（' + list.length + '件）', bad.join(' / '), '');
  }
  check('  文例の数', n >= 300, true);
  // 前から言えた言い方（📖言い方 の見本）は、型を読み込む前と答えが変わらない
  const diff = await page.evaluate(() => { const bad = [];
    for (const x of sayList().filter(x => x.g !== 'いろいろな言い方')) {
      const K = window.KoePhrase; window.KoePhrase = undefined; disp_val = '0'; voiceAcceptDentaku(x.ex); const a = disp_val;
      window.KoePhrase = K; disp_val = '0'; voiceAcceptDentaku(x.ex); if (disp_val !== a) bad.push(x.ex + ' ' + a + '→' + disp_val); }
    return bad.join(' / '); });
  check('  前からの言い方の答えは変わらない', diff, '');
  check('  答えは表示に出て、続けてキーで計算できる', await page.evaluate(() => { voiceAcceptDentaku('8と3の差'); return disp_val; }), '5');
  check('  履歴に式と答えが残る', await page.evaluate(() => { voiceAcceptDentaku('5キロは何メートル'); return dtTape[dtTape.length - 1].e + ' ＝ ' + dtTape[dtTape.length - 1].v; }), '5キロ × 1,000 ＝ 5,000メートル');
  check('  文字の答え（余り）も出す', await page.evaluate(() => { voiceAcceptDentaku('17を5で割った商と余り'); return document.getElementById('dtVoice').textContent.includes('3 余り 2') + '/' + disp_val; }), 'true/3');
  check('  できないときは理由を出す', await page.evaluate(() => { voiceAcceptDentaku('5を0で割る'); return /割れません/.test(document.getElementById('dtVoice').textContent); }), true);
  check('  📖言い方 に「いろいろな言い方」が並び、答えも出る', await page.evaluate(() => { openSayHelp(); const t = document.getElementById('sayHelpBody').textContent; closeSayHelp(); return t.includes('いろいろな言い方') && t.includes('30坪は何平米') && t.includes('99.17'); }), true);
  check('  消費税の率は電卓の設定に合わせる', await page.evaluate(() => { taxPct = 8; voiceAcceptDentaku('1000円の消費税額'); const d = disp_val; taxPct = 10; return d; }), '80');
  check('  service-worker が先に持つ', fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8').includes("'./koe/phrase.js'") && fs.readFileSync(path.join(ROOT, 'koe', 'service-worker.js'), 'utf8').includes("'./phrase.js'"), true);
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}
/* v417：コピー・貼り付けで数式の番地をずらす・範囲のコピー／切り取り・絶対参照 $ */
async function runClip(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── コピー・貼り付け（番地をずらす・範囲・$）（v417） ──');
  const ev = f => page.evaluate(f);
  await ev(() => { setCellVal(0, 0, '5'); setCellVal(1, 0, '7'); setCellVal(2, 0, '9'); setCellVal(0, 1, '=A1*2'); setCellVal(0, 2, '=$A$1+A1'); recalcAll(); });
  check('  $A$1 を計算できる', await ev(() => getCellDisplay(0, 2)), '10');
  check('  A$1・$A1 も計算できる', await ev(() => { setCellVal(5, 2, '=A$1+$A2'); recalcAll(); return getCellDisplay(5, 2); }), '12');
  check('  "…" の中の $ はそのまま', await ev(() => { setCellVal(6, 2, '="$A$1"&A1'); recalcAll(); return getCellDisplay(6, 2); }), '$A$15');
  check('  ずらす：$ の付いたところはそのまま', await ev(() => adjustFormula('=$A$1+A1+A$1+$A1', 1, 1)), '=$A$1+B2+B$1+$A2');
  check('  ずらす：範囲・2文字の列も', await ev(() => adjustFormula('=SUM(A1:B2)+Z1', 0, 1)), '=SUM(B1:C2)+AA1');
  check('  ずらす：関数名や "…" の中は変えない', await ev(() => adjustFormula('=LOG(A1)+ATAN2(A1,1)+"A1"', 1, 0)), '=LOG(A2)+ATAN2(A2,1)+"A1"');
  check('  表の外へ出る番地は #REF!', await ev(() => adjustFormula('=A1', -1, 0)), '=#REF!');
  // 1つのセル：番地がずれる
  await ev(async () => { clearRangeSelection(); sel(0, 1); copyCell(); clearRangeSelection(); sel(1, 1); await pasteCellSmart(); });
  check('  数式をコピーして下に貼ると番地がずれる', await ev(() => data[1][1] + '=' + getCellDisplay(1, 1)), '=A2*2=14');
  // 範囲
  await ev(async () => { clearRangeSelection(); sel(0, 1); extendRange(0, 2); copyCell(); });
  check('  範囲をコピーすると形のまま覚える', await ev(() => clipData.rows.length + 'x' + clipData.rows[0].length), '1x2');
  check('  端末へは見えている値をタブで区切って渡す', await ev(() => clipData.text), '10\t10');
  check('  コピーした範囲に点線の印', await ev(() => document.querySelectorAll('.clip-src').length), 2);
  await ev(async () => { clearRangeSelection(); sel(2, 1); await pasteCellSmart(); });
  check('  範囲を貼ると形のまま入って番地がずれる', await ev(() => data[2][1] + '|' + data[2][2]), '=A3*2|=$A$1+A3');
  await ev(() => undoLast());
  check('  ↶戻る 1回で範囲の貼り付けを戻せる', await ev(() => data[2][1] + '|' + data[2][2]), '|');
  // 1つのセルを範囲に貼る
  await ev(async () => { setCellVal(5, 0, '=A1+1'); clearRangeSelection(); sel(5, 0); copyCell(); clearRangeSelection(); sel(6, 0); extendRange(8, 0); await pasteCellSmart(); });
  check('  1つのセルを範囲に貼ると、どのセルにもずらして入る', await ev(() => [data[6][0], data[7][0], data[8][0]].join(',')), '=A2+1,=A3+1,=A4+1');
  // 切り取り（範囲）
  await ev(async () => { clearRangeSelection(); sel(0, 0); extendRange(2, 0); cutCell(); clearRangeSelection(); sel(10, 1); await pasteCellSmart(); });
  check('  範囲を切り取って貼ると移る', await ev(() => [data[10][1], data[11][1], data[12][1]].join(',') + ' 元:' + [data[0][0], data[1][0], data[2][0]].join(',')), '5,7,9 元:,,');
  check('  切り取りの印は消える', await ev(() => document.querySelectorAll('.clip-src').length), 0);
  await ev(() => undoLast());
  check('  ↶戻る 1回で切り取りも戻せる', await ev(() => [data[0][0], data[1][0], data[2][0], data[10][1]].join(',')), '5,7,9,');
  // 端末のほかの中身は今までどおり
  await ev(async () => { await navigator.clipboard.writeText('りんご\t3'); clipData.written = true; clearRangeSelection(); sel(13, 0); await pasteCellSmart(); });
  check('  ほかのアプリでコピーした表はそのまま貼れる', await ev(() => data[13][0] + '|' + data[13][1]), 'りんご|3');
  check('  エラーが出ない', errs.join(' | '), '');
  await ctx.close();
}
/* v413：セルの操作を Excel と同じに（ダブルタップ＝編集・長押し＝メニュー・右下の ● でフィル）。以前の操作も選べる */
async function runCellXl(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── セルの操作を Excel と同じに（v413） ──');
  const ctr = (r, c, dx = 0.5, dy = 0.5) => page.evaluate(([r, c, dx, dy]) => {
    const b = document.getElementById('c' + r + '_' + c).getBoundingClientRect();
    return { x: b.left + b.width * dx, y: b.top + b.height * dy }; }, [r, c, dx, dy]);
  const tap = async (r, c) => { const p = await ctr(r, c); await page.mouse.click(p.x, p.y); };
  check('  既定は Excel と同じ', await page.evaluate(() => cellGesture + '/' + document.body.classList.contains('cg-excel')), 'excel/true');
  await page.evaluate(() => { setCellVal(0, 0, '1200'); setCellVal(1, 0, '=A1*2'); sel(2, 0); });
  // ダブルタップ＝中身を直す
  await tap(0, 0); await page.waitForTimeout(60); await tap(0, 0); await page.waitForTimeout(200);
  check('  ダブルタップで数式バーに中身が入る', await page.evaluate(() => document.getElementById('formulaInput').value), '1200');
  check('  そのまま打てる（数式バーが選ばれている）', await page.evaluate(() => document.activeElement.id), 'formulaInput');
  check('  コピーの印は付かない', await page.evaluate(() => document.querySelectorAll('.copy-src').length), 0);
  await page.keyboard.press('End'); await page.keyboard.type('5'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  check('  続きを打って Enter で直せる', await page.evaluate(() => data[0][0]), '12005');
  // 数式のセルは数式を直す。ほかのセルを押すと番地が入る
  await tap(1, 0); await page.waitForTimeout(60); await tap(1, 0); await page.waitForTimeout(200);
  check('  数式のセルは数式を直す', await page.evaluate(() => document.getElementById('formulaInput').value + '|' + formulaEditMode), '=A1*2|true');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  // 長押しではメニューを出さない（v414）。ダブルタップで直すときに、キーボード（テンキー）の上に帯で出す
  let p = await ctr(3, 1);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up(); await page.waitForTimeout(300);
  check('  長押しではメニューは出ない', await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show')), false);
  await page.waitForTimeout(500);   // 長押しの分のタップの数えが消えるまで待つ
  await tap(3, 1); await page.waitForTimeout(60); await tap(3, 1); await page.waitForTimeout(400);
  check('  ダブルタップでメニューが帯で出る', await page.evaluate(() => { const m = document.getElementById('cellMenu'); return m.classList.contains('show') + '/' + m.classList.contains('edit-bar'); }), 'true/true');
  check('  帯は横一列で画面の幅いっぱい', await page.evaluate(() => { const b = document.getElementById('cellMenu').getBoundingClientRect(); return getComputedStyle(document.getElementById('cellMenu')).display + '/' + (Math.round(b.width) === innerWidth); }), 'flex/true');
  check('  帯はテンキーのすぐ上', await page.evaluate(() => {
    const m = document.getElementById('cellMenu').getBoundingClientRect();
    if (document.body.classList.contains('kb-edit')) return 'kb';   // スマホ扱いの画面ではテンキーを隠している
    return Math.abs(m.bottom - document.getElementById('numpadSection').getBoundingClientRect().top) <= 2 ? 'kb' : 'ずれ ' + m.bottom; }), 'kb');
  check('  スマホではテンキーを隠す（キーボードがその場所に出る）', await page.evaluate(() => document.body.classList.contains('kb-edit') === isTouchUI()
    && (!isTouchUI() || getComputedStyle(document.getElementById('numpadSection')).display === 'none')), true);
  check('  帯には切り取り・コピー・貼り付け（編集は出さない）', await page.evaluate(() => [...document.querySelectorAll('#cellMenu button')].filter(b => b.offsetParent).map(b => b.textContent.trim().split(' ').pop()).join('/')),
    '切り取り/コピー/貼り付け/消去/書式/行を挿入/列を挿入/保護');
  await page.keyboard.type('たまご');
  await page.evaluate(() => cellMenuAct('copy')); await page.waitForTimeout(450);
  check('  帯のボタンを押すと、打ちかけの中身を確定してから働く', await page.evaluate(() => data[3][1] + '|' + clipData.val), 'たまご|たまご');
  check('  押したら帯は消えてテンキーが戻る', await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show') + '/' + document.body.classList.contains('kb-edit')), 'false/false');
  await tap(3, 1); await page.waitForTimeout(60); await tap(3, 1); await page.waitForTimeout(300);
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  check('  Enter で直し終えると帯は消える', await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show') + '/' + document.body.classList.contains('kb-edit')), 'false/false');
  // v418：選んでいるセルをもう一度タップ＝キーボードなしで帯だけ
  await page.evaluate(() => { document.activeElement.blur(); hideEditBar(); clearRangeSelection(); });
  await tap(9, 2); await page.waitForTimeout(600);
  check('  選んでいないセルのタップでは帯は出ない', await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show')), false);
  await tap(9, 2); await page.waitForTimeout(600);   // ダブルタップにならないよう間をあける
  check('  選んでいるセルをもう一度タップで帯が出る', await page.evaluate(() => { const m = document.getElementById('cellMenu'); return m.classList.contains('show') + '/' + m.classList.contains('bar-nokb'); }), 'true/true');
  check('  そのときキーボードは出さない', await page.evaluate(() => document.activeElement.id !== 'formulaInput' && !document.body.classList.contains('kb-edit')), true);
  check('  帯に ✏編集 も出る', await page.evaluate(() => !!document.querySelector('#cellMenu .cm-edit').offsetParent), true);
  check('  帯はテンキーのすぐ上', await page.evaluate(() => Math.abs(document.getElementById('cellMenu').getBoundingClientRect().bottom - document.getElementById('numpadSection').getBoundingClientRect().top) <= 2), true);
  check('  キーボードが出たら、見えている画面の下の端に置く（v420。iPhone のずれも見る）', await page.evaluate(() => {
    const real = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { offsetTop: 120, offsetLeft: 0, height: 380, width: innerWidth, addEventListener() {} } });
    document.body.classList.add('kb-edit'); placeEditBar();
    const m = document.getElementById('cellMenu'), b = m.getBoundingClientRect();
    const ok = Math.abs(b.bottom - 500) <= 1;
    document.body.classList.remove('kb-edit');
    if (real) Object.defineProperty(window, 'visualViewport', real); else delete window.visualViewport;
    placeEditBar(); return ok ? 'ok' : 'ずれ ' + b.bottom; }), 'ok');
  await page.evaluate(() => document.querySelector('#numpadSection [data-key=n1]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  check('  テンキーを押すと帯は消える', await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show')), false);
  await tap(5, 1); await page.waitForTimeout(100);
  check('  別のセルを押すと帯は出ない', await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show')), false);
  await page.waitForTimeout(500);
  // 長押しして動かしてもフィルにならない（右下の ● から引っぱる）
  p = await ctr(0, 0);
  await page.evaluate(() => sel(5, 1));
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(700);
  let q = await ctr(3, 0); await page.mouse.move(q.x, q.y, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(300);
  check('  長押しして動かしてもフィルにならない', await page.evaluate(() => data[3][0]), '');
  check('  選んだセルの枠の右下の角に小さな四角（v421）', await page.evaluate(() => {
    sel(0, 0); const h = document.getElementById('fillHandle'), hb = h.getBoundingClientRect(), tb = document.getElementById('c0_0').getBoundingClientRect();
    return getComputedStyle(h).display + '/' + Math.round(hb.width) + '/' + (Math.abs((hb.left + hb.width / 2) - (tb.right - 1)) <= 1.5 && Math.abs((hb.top + hb.height / 2) - (tb.bottom - 1)) <= 1.5); }), 'block/7/true');
  check('  別のセルを選ぶと四角も移る', await page.evaluate(() => {
    sel(2, 1); const hb = document.getElementById('fillHandle').getBoundingClientRect(), tb = document.getElementById('c2_1').getBoundingClientRect();
    const ok = Math.abs((hb.left + 3.5) - (tb.right - 1)) <= 1.5 && Math.abs((hb.top + 3.5) - (tb.bottom - 1)) <= 1.5; sel(0, 0); return ok; }), true);
  check('  セルの中の丸は出さない', await page.evaluate(() => getComputedStyle(document.getElementById('c0_0'), '::after').content), 'none');
  p = await ctr(0, 0, 0.93, 0.9);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  q = await ctr(3, 0); await page.mouse.move(q.x, q.y, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300);
  check('  ● を引っぱるとフィル', await page.evaluate(() => [data[1][0], data[2][0], data[3][0]].join('/')), '12005/12005/12005');
  await page.evaluate(() => hideSeqBtn());
  // 選んだセルの真ん中からなぞると範囲選択
  await page.evaluate(() => sel(0, 1));
  p = await ctr(0, 1); await page.mouse.move(p.x, p.y); await page.mouse.down();
  q = await ctr(2, 2); await page.mouse.move(q.x, q.y, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
  check('  選んだセルからなぞると範囲選択', await page.evaluate(() => [rangeR1, rangeC1, rangeR2, rangeC2].join(',')), '0,1,2,2');
  check('  範囲を選ぶと帯が出る（v418）', await page.evaluate(() => document.getElementById('cellMenu').classList.contains('show')), true);
  await page.waitForTimeout(500);
  await tap(1, 2); await page.waitForTimeout(200);
  check('  範囲の中をタップしても範囲は外れず帯が出る', await page.evaluate(() => [rangeR1, rangeC1, rangeR2, rangeC2].join(',') + '/' + document.getElementById('cellMenu').classList.contains('show')), '0,1,2,2/true');
  await page.evaluate(() => hideEditBar());
  await page.evaluate(() => clearRangeSelection());
  // 切り取り → 貼り付けで元が消える
  await page.evaluate(() => { setCellVal(6, 0, 'うつす'); sel(6, 0); cellMenuAct('cut'); });
  check('  切り取るとコピーの印', await page.evaluate(() => document.getElementById('c6_0').classList.contains('clip-src')), true);
  await page.evaluate(async () => { sel(6, 2); await pasteCellSmart(); }); await page.waitForTimeout(300);
  check('  貼り付けると移る', await page.evaluate(() => data[6][2] + '|' + data[6][0]), 'うつす|');
  check('  印は消える', await page.evaluate(() => document.querySelectorAll('.clip-src, .copy-src').length), 0);
  // 行を挿入
  await page.evaluate(() => { sel(0, 0); cellMenuAct('insrow'); }); await page.waitForTimeout(200);
  check('  行を挿入できる', await page.evaluate(() => data[0][0] + '|' + data[1][0]), '|12005');
  // 以前の表電卓
  await page.evaluate(() => setCellGesture('old')); await page.waitForTimeout(100);
  check('  以前の表電卓を選べる', await page.evaluate(() => cellGesture + '/' + localStorage.getItem('excalc_cellgesture')), 'old/old');
  check('  以前の操作では右下の四角を出さない', await page.evaluate(() => { sel(1, 0); return getComputedStyle(document.getElementById('fillHandle')).display; }), 'none');
  await tap(1, 0); await page.waitForTimeout(60); await tap(1, 0); await page.waitForTimeout(200);
  check('  以前の操作ではダブルタップ＝コピー', await page.evaluate(() => document.getElementById('c1_0').classList.contains('copy-src')), true);
  await page.evaluate(() => clearCopySrc());
  await page.evaluate(() => showCellMenu(2, 2)); await page.waitForTimeout(100);
  check('  以前の操作の長押しメニューは5つ', await page.evaluate(() => [...document.querySelectorAll('#cellMenu button')].filter(b => b.offsetParent).length), 5);
  await page.evaluate(() => hideCellMenu());
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても以前の操作のまま', await page.evaluate(() => cellGesture), 'old');
  await page.evaluate(() => setCellGesture('excel'));
  check('  Excel と同じに戻すと覚えた値は消える', await page.evaluate(() => localStorage.getItem('excalc_cellgesture')), null);
  check('  設定の📐表にセルの操作がある', await page.evaluate(() => !!document.querySelector('#setPage0 #cellGestureSeg [data-cg=excel].on')), true);
  check('  エラーが出ない', errs.join(' | '), '');
  await ctx.close();
}
/* v411：書式・枠線のテンキーの色／見た目の設定を4つの組に */
async function runFmtCol(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── 書式・枠線のテンキーの色／見た目の設定の組（v411） ──');
  const bg = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
  const KB = '#numpadPageFmt [data-key=kf_bold]';
  check('  はじめは すみ（v412）', await bg(KB), 'rgb(55, 71, 79)');
  await page.evaluate(() => { toggleSettings(); setSettingsTab(1); }); await page.waitForTimeout(300);
  check('  見た目は4つの組', await page.evaluate(() => [...document.querySelectorAll('#setPage1 .set-grp')].map(d => d.querySelector('.set-grp-t b').textContent).join('/')),
    '色と背景/文字と大きさ/テンキー/画面と上のバー');
  check('  組ははじめ閉じている', await page.evaluate(() => [...document.querySelectorAll('#setPage1 .set-grp')].every(d => !d.open)), true);
  check('  いままでの設定がどれかの組に入っている', await page.evaluate(() =>
    ['skinSw', 'skinKeySeg', 'skinBgSel', 'cellSize', 'appWidth', 'keySize', 'infoSize', 'formulaSize', 'numSize', 'npadSize', 'npPlaceSeg',
     'calcOnlyBtn', 'pageBarBtn', 'funcPageBtn', 'resizerBarBtn', 'barSize', 'keypadEditBtn', 'npToolList', 'topBtnToggles', 'startPageSel', 'compactSeg', 'fpcBox']
      .filter(id => { const e = document.getElementById(id); return !e || !e.closest('.set-grp'); }).join(',')), '');
  check('  書式・枠線のテンキーの色は「色と背景」の組', await page.evaluate(() => document.getElementById('fpcBox').closest('.set-grp').id), 'setGrpColor');
  check('  組み合わせは8つ（元＝すみ・白 …）', await page.evaluate(() => document.querySelectorAll('#fpcPresets .fpc-pre').length), 8);
  await page.evaluate(() => { const d = document.getElementById('setGrpColor'); d.open = true; }); await page.waitForTimeout(100);
  await page.click('#fpcPresets [data-pre=sky]'); await page.waitForTimeout(400);   // 地の色は少しかけて変わる
  check('  水色を選ぶとボタンの地が水色', await bg(KB), 'rgb(227, 242, 253)');
  check('  文字も水色の組の色', await page.evaluate(() => getComputedStyle(document.querySelector('#numpadPageFmt [data-key=kf_bold]')).color), 'rgb(13, 71, 161)');
  check('  区切り線（地）も変わる', await bg('#numpadPageFmt'), 'rgb(179, 205, 232)');
  check('  選んだ組み合わせに印', await page.evaluate(() => document.querySelector('#fpcPresets .on').dataset.pre), 'sky');
  check('  覚える', await page.evaluate(() => JSON.parse(localStorage.getItem('excalc_fmtcol')).key), '#e3f2fd');
  await page.click('#fpcPresets [data-pre=white]'); await page.waitForTimeout(400);
  check('  白を選ぶと白', await bg(KB), 'rgb(255, 255, 255)');
  await page.click('#fpcPresets [data-pre=sky]'); await page.waitForTimeout(400);
  // 1つずつ変える
  await page.evaluate(() => fpcSet('key', '#1f1f1f')); await page.waitForTimeout(400);
  check('  地だけ黒にすると、組み合わせの印は消える', await page.evaluate(() => document.querySelectorAll('#fpcPresets .on').length), 0);
  await page.evaluate(() => fpcSet('ink', '')); await page.waitForTimeout(50);
  check('  文字を元にすると、黒い地には白っぽい字', await page.evaluate(() => getComputedStyle(document.querySelector('#numpadPageFmt [data-key=kf_bold]')).color), 'rgb(236, 239, 241)');
  check('  #rrggbb 以外は受け付けない', await page.evaluate(() => { fpcSet('line', 'red;x'); return fmtCol.line; }), '');
  // 開き直しても残る・組の開閉も残る
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても色が残る', await bg(KB), 'rgb(31, 31, 31)');
  check('  開いた組は次も開いている', await page.evaluate(() => document.getElementById('setGrpColor').open), true);
  // 夜：選んだ色はそのまま、元に戻すと夜の灰色
  await page.evaluate(() => toggleDark()); await page.waitForTimeout(600);
  check('  夜でも選んだ色', await bg(KB), 'rgb(31, 31, 31)');
  await page.evaluate(() => fpcReset()); await page.waitForTimeout(600);
  check('  元に戻すと夜も すみ', await bg(KB), 'rgb(55, 71, 79)');
  check('  元に戻すと覚えた色は消える', await page.evaluate(() => localStorage.getItem('excalc_fmtcol')), null);
  await page.evaluate(() => toggleDark()); await page.waitForTimeout(600);
  check('  昼に戻しても すみ', await bg(KB), 'rgb(55, 71, 79)');
  // 設定をさがす
  await page.evaluate(() => { toggleSettings(); setFind('書式・枠線のテンキーの色'); }); await page.waitForTimeout(100);
  check('  さがす欄で見つかる', await page.evaluate(() => setFindHits.some(x => /書式・枠線のテンキーの色/.test(x.label))), true);
  await page.evaluate(() => { const d = document.getElementById('setGrpColor'); d.open = false; const i = setFindHits.findIndex(x => /書式・枠線のテンキーの色/.test(x.label)); setFindGo(i); });
  await page.waitForTimeout(200);
  check('  見つけたところへ飛ぶと組が開く', await page.evaluate(() => document.getElementById('setGrpColor').open), true);
  check('  エラーが出ない', errs.join(' | '), '');
  await ctx.close();
}
async function runFmtPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('excalc_tour_done', '1'); });
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── 書式・枠線のページ（v407） ──');
  await page.evaluate(() => numpadPager.go('fmt')); await page.waitForTimeout(500);
  const key = k => '#numpadPageFmt [data-key=' + k + ']';
  const on = k => page.evaluate(k => document.querySelector('#numpadPageFmt [data-key=' + k + ']').classList.contains('kf-on'), k);
  check('  6列にした', await page.evaluate(() =>
    getComputedStyle(document.getElementById('numpadPageFmt')).gridTemplateColumns.split(' ').length), 6);
  check('  ボタンの地は すみ（v412）', await page.evaluate(() =>
    getComputedStyle(document.querySelector('#numpadPageFmt [data-key=kf_bold]')).backgroundColor), 'rgb(55, 71, 79)');
  check('  Excel と同じ B・I・U・ab が並ぶ', await page.evaluate(() =>
    ['kf_bold', 'kf_italic', 'kf_under', 'kf_strike'].map(k => document.querySelector('#numpadPageFmt [data-key=' + k + ']').textContent.trim()).join(' ')), 'B I U ab');
  check('  揃え（左・中央・右／上・中・下）・結合・書式のコピーがある', await page.evaluate(() =>
    ['kf_left', 'kf_center', 'kf_right', 'kf_vtop', 'kf_vmid', 'kf_vbot', 'kf_merge', 'kf_paint']
      .every(k => { const b = document.querySelector('#numpadPageFmt [data-key=' + k + ']'); return b && b.title; })), true);
  // v409：2重線を選んだとき、場所ボタンの線のすき間がボタンの地色（白）になる（紺だと3本に見えた）
  await page.evaluate(() => bdSetType('double', document.querySelector('#numpadPageFmt [data-key=bd_double]')));
  check('  2重線のすき間はボタンの地色', await page.evaluate(() => {
    const b = document.querySelector('#numpadPageFmt [data-key=bd_top]');
    return getComputedStyle(b.querySelector('.s2')).stroke === getComputedStyle(b).backgroundColor; }), true);
  check('  2重線の上・下・左・右は端を閉じない（v410）', await page.evaluate(() =>
    ['bd_top', 'bd_bottom', 'bd_left', 'bd_right'].every(k => getComputedStyle(document.querySelector('#numpadPageFmt [data-key=' + k + '] .s')).strokeLinecap === 'butt')
    && getComputedStyle(document.querySelector('#numpadPageFmt [data-key=bd_box] .s')).strokeLinecap === 'square'), true);
  await page.evaluate(() => { toggleDark(); }); await page.waitForTimeout(600);   // 地色は少しかけて変わる
  check('  夜もすき間はボタンの地色', await page.evaluate(() => {
    const b = document.querySelector('#numpadPageFmt [data-key=bd_box]');
    return getComputedStyle(b.querySelector('.s2')).stroke === getComputedStyle(b).backgroundColor; }), true);
  await page.evaluate(() => { toggleDark(); bdSetType('normal', document.querySelector('#numpadPageFmt [data-key=bd_normal]')); });
  check('  ボタンが重ならずに並ぶ', await page.evaluate(() => {
    const r = [...document.querySelectorAll('#numpadPageFmt > .btn, #numpadPageFmt > .kf-vcol')].map(e => e.getBoundingClientRect());
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const a = r[i], b = r[j];
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) return false; }
    return true; }), true);
  // 結合して中央揃え
  await page.evaluate(() => { setCellVal(0, 0, '見出し'); sel(0, 0); rangeR1 = 0; rangeC1 = 0; rangeR2 = 0; rangeC2 = 2; });
  await page.click(key('kf_merge')); await page.waitForTimeout(400);
  check('  範囲を選んで結合できる', await page.evaluate(() =>
    JSON.stringify(mergeAt(0, 0)) + '/' + document.getElementById('c0_0').colSpan + '/' + cellStyles['0,0'].align), '{"rs":1,"cs":3}/3/center');
  check('  結合したセルでは結合ボタンが灰色', await on('kf_merge'), true);
  await page.click(key('kf_merge')); await page.waitForTimeout(400);
  check('  もう一度押すと解除', await page.evaluate(() => mergeAt(0, 0) + '/' + document.getElementById('c0_0').colSpan), 'null/1');
  await page.evaluate(() => undoLast()); await page.waitForTimeout(300);
  check('  戻るで結合した形に戻る', await page.evaluate(() => JSON.stringify(mergeAt(0, 0))), '{"rs":1,"cs":3}');
  await page.evaluate(() => undoLast()); await page.waitForTimeout(300);
  check('  もう一度戻ると結合前', await page.evaluate(() => mergeAt(0, 0)), null);
  await page.evaluate(() => { clearRangeSelection(); sel(5, 0); });
  await page.click(key('kf_merge')); await page.waitForTimeout(300);
  check('  1つだけ選んで押しても何も起きない', await page.evaluate(() => mergeAt(5, 0)), null);
  await page.evaluate(() => { setCellVal(1, 0, 'a'); setCellVal(1, 1, 'b'); sel(1, 0); rangeR1 = 1; rangeC1 = 0; rangeR2 = 1; rangeC2 = 1; });
  await page.click(key('kf_merge')); await page.waitForTimeout(300);
  check('  値が消えるときは先に聞く', await page.evaluate(() => {
    const ov = document.querySelector('div[style*="99999"]'); return !!ov && ov.textContent.includes('左上のセルの値だけ'); }), true);
  await page.evaluate(() => { const b = [...document.querySelectorAll('div[style*="99999"] button')].find(x => x.textContent === 'やめる'); if (b) b.click(); });
  await page.waitForTimeout(300);
  check('  やめたら結合しない', await page.evaluate(() => mergeAt(1, 0) + '/' + data[1][1]), 'null/b');
  // 取り消し線・今の状態の印
  await page.evaluate(() => { clearRangeSelection(); setCellVal(2, 0, 'x'); sel(2, 0); });
  await page.click(key('kf_strike')); await page.click(key('kf_bold')); await page.waitForTimeout(300);
  check('  取り消し線が付く', await page.evaluate(() => getComputedStyle(document.getElementById('c2_0')).textDecorationLine), 'line-through');
  check('  付いている書式のボタンが灰色（Excel と同じ）', [await on('kf_strike'), await on('kf_bold'), await on('kf_italic')].join(','), 'true,true,false');
  await page.evaluate(() => sel(3, 0)); await page.waitForTimeout(100);
  check('  別のセルに移ると印も変わる', await on('kf_bold'), false);
  // 上下の揃え
  await page.evaluate(() => sel(2, 0)); await page.click(key('kf_vmid')); await page.waitForTimeout(200);
  check('  上下中央揃え', await page.evaluate(() => getComputedStyle(document.getElementById('c2_0')).verticalAlign), 'middle');
  // 書式のコピー/貼り付け
  await page.click(key('kf_paint')); await page.waitForTimeout(100);
  check('  1回目で書式を写す', await on('kf_paint'), true);
  await page.evaluate(() => sel(4, 1)); await page.click(key('kf_paint')); await page.waitForTimeout(300);
  check('  2回目で貼る', await page.evaluate(() => JSON.stringify(cellStyles['4,1'])), '{"strike":true,"bold":true,"valign":"middle"}');
  // Excel の読み書き（取り消し線）
  check('  Excel の取り消し線を読める', await page.evaluate(() => {
    const st = parseXlsxStyles('<styleSheet><fonts count="2"><font><sz val="11"/></font><font><strike/><sz val="11"/></font></fonts>' +
      '<fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders>' +
      '<cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>');
    const s1 = st.styleForIdx(1); return !!(s1 && s1.strike); }), true);
  const dl = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportXLSX())]).then(a => a[0]).catch(() => null);
  if (dl) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fmt-'));
    const f = path.join(tmp, 'o.xlsx'); await dl.saveAs(f);
    const { readZipEntry } = require('./zip.js');
    check('  Excel に書き出すと取り消し線が付く', String(readZipEntry(f, 'xl/styles.xml')).includes('<strike/>'), true);
    fs.rmSync(tmp, { recursive: true, force: true });
  } else check('  Excel に書き出すと取り消し線が付く', 'ダウンロードされず', true);
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

/* QR コード（v408）。見本の並びは、実際の読み取り器（zxing-cpp）で読めることを確かめたもの */
const QR_GOLDEN = { text: 'https://example.com/hyo/', version: 2, mask: 1,
  rows: '1111111011100010001111111100000100011011010100000110111010111111001010111011011101001010110001011101101110100011001000101110110000010100000100010000011111111010101010101111111000000000011101110000000010100011010110101001001011110110001111101011101011101101101001100101001110110010101000110101001010001110001001110001101100001001111011000010110110001111000010101101111110011010010000110000000110111000111111100101100011111001000000000101011101000100011111111011001110101010001100000100111101110001000010111010010010011111100101011101001000100010010110101110101101000111011101110000010011110111111100001111111010101010101001001' };
async function runQrShare(browser) {
  const { ctx, page, errs } = await newPage(browser);
  console.log('\n── アプリを QR コードで共有（v408） ──');
  const g = await page.evaluate(t => { const q = qrEncode(t, 'M');
    return { v: q.version, m: q.mask, rows: q.modules.map(r => r.map(x => x ? 1 : 0).join('')).join('') }; }, QR_GOLDEN.text);
  check('  QR の型番', g.v, QR_GOLDEN.version);
  check('  QR のマスク', g.m, QR_GOLDEN.mask);
  check('  QR のマス目が、読み取れると確かめた見本と同じ', g.rows === QR_GOLDEN.rows, true);
  check('  長いアドレスでも大きな型番で作れる（segno と同じ型番）', await page.evaluate(() => qrEncode('https://example.com/' + 'x'.repeat(300), 'M').version), 13);
  check('  日本語のアドレスも作れる', await page.evaluate(() => !!qrEncode('https://例え.jp/表電卓/', 'M')), true);
  check('  入りきらないときは null', await page.evaluate(() => qrEncode('x'.repeat(3000), 'M')), null);
  // 画面
  await page.evaluate(() => { openMoreMenu(); document.getElementById('moreAccMisc').open = true; }); await page.waitForTimeout(300);
  await page.click('#moreAccMisc .more-item[onclick*=openQrShare]'); await page.waitForTimeout(500);
  check('  ⋯ のそのほかから開く', await page.evaluate(() => isDlgOpen('qrShareOverlay')), true);
  check('  表電卓のアドレスを出す（index.html は付けない）', await page.evaluate(() =>
    document.getElementById('qrUrl').textContent.endsWith('/') && !/index\.html/.test(document.getElementById('qrUrl').textContent)), true);
  check('  ファイルで開いているときは、ほかのスマホでは開けないと知らせる', await page.evaluate(() =>
    !document.getElementById('qrWarn').hidden), true);
  check('  QR が描かれる（白い地の上に黒いマス）', await page.evaluate(() => {
    const cv = document.getElementById('qrCanvas'), cx = cv.getContext('2d');
    const d = cx.getImageData(0, 0, cv.width, cv.height).data; let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 50) dark++;
    return cv.width > 200 && d[0] === 255 && dark > 1000; }), true);
  await page.evaluate(() => qrSetWhich('kaikei')); await page.waitForTimeout(200);
  check('  会計アプリにも切りかえられる', await page.evaluate(() => document.getElementById('qrUrl').textContent.endsWith('/kaikei/')), true);
  check('  アドレスのコピー・画像で保存がある', await page.evaluate(() =>
    typeof qrCopyUrl === 'function' && typeof qrSaveImage === 'function'), true);
  await page.evaluate(() => closeQrShare()); await page.waitForTimeout(400);
  check('  登録キーにもある', await page.evaluate(() => !!KEY_FUNCS.a_qrshare), true);
  await page.evaluate(() => toggleSettings()); await page.waitForTimeout(300);
  await page.fill('#setFindIn', 'QR'); await page.waitForTimeout(150);
  check('  設定のさがす欄で見つかる', await page.evaluate(() => setFindHits.some(x => x.label.includes('QR'))), true);
  check('  JSエラーが出ていない', errs.length, 0);
  if (errs.length) console.log('    ', errs);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    if (!only || only === 'formula') await runFormula(browser);
    if (!only || only === 'xlsx') await runXlsx(browser);
    if (!only || only === 'a11y') await runA11y(browser);
    if (!only || only === 'mode') await runMode(browser);
    if (!only || only === 'digit') await runDigit(browser);
    if (!only || only === 'speech') await runSpeech(browser);
    if (!only || only === 'calcpage') await runCalcPage(browser);
    if (!only || only === 'regpick') await runRegPick(browser);
    if (!only || only === 'cellmenu') await runCellMenu(browser);
    if (!only || only === 'savelist') await runSaveList(browser);
    if (!only || only === 'topbar') await runTopBar(browser);
    if (!only || only === 'flicksym') await runFlickSym(browser);
    if (!only || only === 'nptools') await runNpTools(browser);
    if (!only || only === 'veggie') await runVeggie(browser);
    if (!only || only === 'report') await runReport(browser);
    if (!only || only === 'shared') await runShared(browser);
    if (!only || only === 'setdedup') await runSetDedup(browser);
    if (!only || only === 'tmplunit') await runTmplUnit(browser);
    if (!only || only === 'vegdiary') await runVegDiary(browser);
    if (!only || only === 'startpage') await runStartPage(browser);
    if (!only || only === 'dtdec') await runDtDec(browser);
    if (!only || only === 'tsxlock') await runTsxLock(browser);
    if (!only || only === 'voicemath') await runVoiceMath(browser);
    if (!only || only === 'voicesay') await runVoiceSay(browser);
    if (!only || only === 'storage') await runStorage(browser);
    if (!only || only === 'export') await runExport(browser);
    if (!only || only === 'skin') await runSkin(browser);
    if (!only || only === 'safety') await runSafety(browser);
    if (!only || only === 'packaging') await runPackaging(browser);
    if (!only || only === 'onboard') await runOnboard(browser);
    if (!only || only === 'polish') await runPolish(browser);
    if (!only || only === 'safearea') await runSafeArea(browser);
    if (!only || only === 'compact') await runCompact(browser);
    if (!only || only === 'calconly') await runCalcOnly(browser);
    if (!only || only === 'voiceplace') await runVoicePlace(browser);
    if (!only || only === 'voicefull') await runVoiceFull(browser);
    if (!only || only === 'defsize') await runDefSize(browser);
    if (!only || only === 'cellfocus') await runCellFocus(browser);
    if (!only || only === 'kaikei') await runKaikei(browser);
    if (!only || only === 'touban') await runTouban(browser);
    if (!only || only === 'tbcolor') await runTbColor(browser);
    if (!only || only === 'tbroster') await runTbRoster(browser);
    if (!only || only === 'tbsave') await runTbSave(browser);
    if (!only || only === 'fmtpage') await runFmtPage(browser);
    if (!only || only === 'qrshare') await runQrShare(browser);
    if (!only || only === 'fmtcol') await runFmtCol(browser);
    if (!only || only === 'cellxl') await runCellXl(browser);
    if (!only || only === 'clip') await runClip(browser);
    if (!only || only === 'koe') await runKoe(browser);
    if (!only || only === 'koe' || only === 'koelisten') await runKoeListen(browser);
    if (!only || only === 'koe' || only === 'koelisten') await runKoeListen(browser, 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36');
    if (!only || only === 'dtphrase') await runDtPhrase(browser);
    if (!only || only === 'koebackup') await runKoeBackup(browser);
    if (!only || only === 'brush1') await runBrush1(browser);
    if (!only || only === 'brush2') await runBrush2(browser);
    if (!only || only === 'brush3') await runBrush3(browser);
    if (!only || only === 'help') await runHelpSplit(browser);
    if (!only || only === 'backkey') await runBackKey(browser);
    // 見た目の見比べは最後に（見本は tests/visual/base/。撮り直しは node tests/visual.js --update）
    if (!only || only === 'visual') await require('./visual').runVisual(browser, check);
  } finally { await browser.close(); }
  console.log('\n' + '─'.repeat(50));
  if (fails.length) { console.log('通らなかったもの:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log(`合計 ${pass + fail} 件 : 通った ${pass} / 通らなかった ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('実行に失敗:', e.message, e.stack); process.exit(2); });
