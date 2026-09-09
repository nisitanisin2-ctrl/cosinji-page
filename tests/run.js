#!/usr/bin/env node
/* テストの実行係。Chromium で index.html を直接開いて確かめる。
     node tests/run.js           全部
     node tests/run.js formula   数式だけ
     node tests/run.js xlsx      Excelだけ
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
  page.on('pageerror', e => { if (!(e.stack || e.message).includes('ServiceWorker')) errs.push(e.message); });
  page.on('dialog', d => d.accept());
  await page.goto(INDEX); await page.waitForTimeout(300);
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForTimeout(900);
  return { ctx, page, errs };
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

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    if (!only || only === 'formula') await runFormula(browser);
    if (!only || only === 'xlsx') await runXlsx(browser);
  } finally { await browser.close(); }
  console.log('\n' + '─'.repeat(50));
  if (fails.length) { console.log('通らなかったもの:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log(`合計 ${pass + fail} 件 : 通った ${pass} / 通らなかった ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('実行に失敗:', e.message, e.stack); process.exit(2); });
