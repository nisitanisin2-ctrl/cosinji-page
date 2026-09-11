#!/usr/bin/env node
/* テストの実行係。Chromium で index.html を直接開いて確かめる。
     node tests/run.js           全部
     node tests/run.js formula   数式だけ
     node tests/run.js xlsx      Excelだけ
     node tests/run.js digit     数字の桁の読みだけ
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
          TMPL_MODE_ROUNDTRIP, TMPL_MODE_THEN_PLAIN, HISTORY_PER_MODE } = require('./mode.test.js');
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
                    TMPL_MODE_ROUNDTRIP, TMPL_MODE_THEN_PLAIN, HISTORY_PER_MODE]) {
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
    if (!only || only === 'cellmenu') await runCellMenu(browser);
  } finally { await browser.close(); }
  console.log('\n' + '─'.repeat(50));
  if (fails.length) { console.log('通らなかったもの:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log(`合計 ${pass + fail} 件 : 通った ${pass} / 通らなかった ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('実行に失敗:', e.message, e.stack); process.exit(2); });
