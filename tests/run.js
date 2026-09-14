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
  await page.evaluate(() => localStorage.clear());
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
    await page.evaluate(() => { localStorage.clear(); });
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
  await page.evaluate(() => { localStorage.clear(); });
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
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── セルの長押しメニュー ──');

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
  check('  並びは 貼り付け→コピー→保護→消去→書式',
        await page.evaluate(() => [...document.querySelectorAll('#cellMenu button')]
          .map(b => b.textContent.trim().split(' ').pop()).join('/')),
        '貼り付け/コピー/保護/消去/書式');

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
        '開く/名前の変更/コピーを作る/ロック/モードへ登録/タブ1へ移す/タブ2へ移す/削除');
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

  // 大きさ（小・中・大）
  const colw = () => page.evaluate(() => getComputedStyle(document.querySelector('.save-grid'))
    .getPropertyValue('--sf-col').trim());
  await page.evaluate(() => setSaveSize('s')); await page.waitForTimeout(300);
  check('  小さいアイコン', await colw(), '66px');
  await page.evaluate(() => setSaveSize('m')); await page.waitForTimeout(300);
  check('  ふつうのアイコン', await colw(), '88px');
  await page.evaluate(() => setSaveSize('l')); await page.waitForTimeout(300);
  check('  大きいアイコン', await colw(), '116px');

  // リスト表示にも戻せて、その選択は覚えている
  await page.evaluate(() => setSaveView('list')); await page.waitForTimeout(400);
  check('  リスト表示に戻せる', await page.evaluate(() => document.querySelectorAll('.save-item').length), 4);
  check('  リストでも並べ替えは効く',
        await page.evaluate(() => [...document.querySelectorAll('.save-name')].map(e => e.textContent.trim()).join('/')),
        '見積もり10/見積もり2/あさひ工区/4月の売上');
  check('  リストでは大きさのボタンを隠す',
        await page.evaluate(() => getComputedStyle(document.getElementById('saveSizeBar')).display), 'none');
  await page.reload(); await page.waitForTimeout(900);
  check('  開き直しても表示を覚えている', await page.evaluate(() => saveView), 'list');
  check('  大きさと並べ替えも覚えている',
        await page.evaluate(() => saveSize + '/' + saveSort), 'l/namez');

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
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForTimeout(900);
  console.log('\n── 上のバーに出すボタン ──');

  const shown = () => page.evaluate(() => ['tbRedo', 'tbList', 'tbSheet', 'tbSet', 'tbDefsize', 'tbReset']
    .filter(id => { const el = document.getElementById(id);
                    return el && getComputedStyle(el).display !== 'none'; }).join(','));
  check('  はじめは何も出さない', await shown(), '');
  check('  設定に選ぶところがある',
        await page.evaluate(() => document.querySelectorAll('#topBtnToggles .topbtn-toggle').length), 6);

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
    document.getElementById('vegPlot').value = 5000; vegPlotChange(); return a + '/' + vegArea.plot; }), '1/1000');
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
  check('  肥料が入る', /🧪 肥料と配合（果菜（実をとるもの）／土のpH 6.0〜6.5）/.test(pd.txt), true);
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
  }), '表／電卓 🎤 声 / AC （ ） ％ ÷ / 7 8 9 × / 4 5 6 − / 1 2 3 ＋ / 0 . ⌫ ＝');
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
  check('  はじめは案内だけ', await vline(), '声で言った計算式がここに出ます ｜  ｜ −');
  await page.evaluate(() => voiceAcceptDentaku('251かける68'));
  await page.waitForTimeout(200);
  check('  声で言った式が出る', await vline(), '251×68 ＝ 17068 ｜ 「251かける68」と聞こえました ｜ 緑');
  check('  答えは大きい表示にも出る', await main(), '17068');
  await page.evaluate(() => voiceAcceptDentaku('こんにちは'));
  await page.waitForTimeout(200);
  check('  式にできないときは聞こえた言葉を残す', await vline(),
        '計算の形になりませんでした ｜ 「こんにちは」と聞こえました ｜ 赤');
  await page.evaluate(() => dtAllClear());
  check('  AC で消える', await vline(), '声で言った計算式がここに出ます ｜  ｜ −');

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
    if (!only || only === 'veggie') await runVeggie(browser);
    if (!only || only === 'report') await runReport(browser);
  } finally { await browser.close(); }
  console.log('\n' + '─'.repeat(50));
  if (fails.length) { console.log('通らなかったもの:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log(`合計 ${pass + fail} 件 : 通った ${pass} / 通らなかった ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('実行に失敗:', e.message, e.stack); process.exit(2); });
