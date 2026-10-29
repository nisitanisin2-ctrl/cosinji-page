#!/usr/bin/env node
/* テストを組ごとに並べて流す（v427。v603 で速くした）
   node tests/run.js は全部の組を1つずつ順に流すので長くかかる。
   ここでは組ごとに別の node（別のブラウザ）で同時に流して、最後に合計を出す。
   中身の確かめ方は run.js と同じ。
     node tests/run-par.js              … 全部。同時に流す数は CPU の数に合わせる
     JOBS=2 node tests/run-par.js       … 同時に流す数を決める
     node tests/run-par.js hade,bingo   … その名前の組だけ（名前は run.js と同じ）
     RETRY=0 node tests/run-par.js      … 通らなかった組をやり直さない
   v603 で速くしたところ：
   ・同じ組を2度流さない（前は hade・poyo・v589 のように名前がいくつもある組を、名前の数だけ流していた）
   ・時間のかかる組から先に流す（前回かかった時間を tests/.par-times.json に覚える。
     はじめてのときは、組のプログラムの長さで見当をつける）
   ・通らなかった組は、最後に1つずつもう一度流す（同時に流すと忙しくて、たまに時間切れで落ちるものがある。
     2回とも通らなければ本当に通らない。やり直しで通ったものは「不安定」として名前を出す）
   組どうしは別々のブラウザで動くので、ひとつの組が落ちてもほかの組は最後まで流れる。 */
'use strict';
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RUN = path.join(__dirname, 'run.js');
const TIMES = path.join(__dirname, '.par-times.json');

// 組の一覧（run.js の SUITES）。{ i, names, fn, len }
const ls = spawnSync(process.execPath, [RUN, '--list'], { encoding: 'utf8', maxBuffer: 16 << 20 });
let all;
try { all = JSON.parse(ls.stdout); } catch (_) { console.error('組の一覧を読めませんでした\n' + ls.stdout + ls.stderr); process.exit(2); }

// 名前を渡されたら、その組だけ
const sel = (process.argv[2] || '').split(',').map(x => x.trim()).filter(Boolean);
const suites = sel.length ? all.filter(s => sel.some(n => s.names.includes(n) || n === '@' + s.i)) : all;
const unknown = sel.filter(n => !all.some(s => s.names.includes(n) || n === '@' + s.i));
if (unknown.length) console.log('その名前の組はありません: ' + unknown.join(', '));
if (!suites.length) process.exit(2);

// 前回かかった時間（秒）。ないものは、プログラムの長さから見当をつける
let times = {};
try { times = JSON.parse(fs.readFileSync(TIMES, 'utf8')) || {}; } catch (_) {}
const known = all.filter(s => times[s.fn] > 0 && s.len > 0);
const perChar = known.length ? known.reduce((a, s) => a + times[s.fn], 0) / known.reduce((a, s) => a + s.len, 0) : 0.002;
const guess = s => times[s.fn] > 0 ? times[s.fn] : (s.len || 5000) * perChar;
const order = suites.slice().sort((a, b) => guess(b) - guess(a));

const CPUS = os.cpus().length;
const JOBS = Math.max(1, Math.min(+process.env.JOBS || CPUS, order.length));
const RETRY = process.env.RETRY !== '0';
const label = s => s.names.join('/');

// 1つの組を流す → { pass, total, fail, sec, out, ok }
function runOne(s) {
  return new Promise(resolve => {
    const t = Date.now();
    const p = spawn(process.execPath, [RUN, '@' + s.i], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => {
      const sec = (Date.now() - t) / 1000;
      const m = out.match(/合計 (\d+) 件 : 通った (\d+) \/ 通らなかった (\d+)/);
      if (!m) resolve({ ok: false, crashed: true, code, sec, out, pass: 0, fail: 0, total: 0 });
      else resolve({ ok: +m[3] === 0, crashed: false, code, sec, out, total: +m[1], pass: +m[2], fail: +m[3] });
    });
  });
}
const failText = r => {
  if (r.crashed) return `  （最後まで流れませんでした。終わりのコード ${r.code}）\n` + r.out.split('\n').slice(-15).join('\n');
  const fi = r.out.indexOf('通らなかったもの:');
  return fi >= 0 ? r.out.slice(fi + '通らなかったもの:'.length, r.out.lastIndexOf('合計')).trimEnd() : '';
};
const line = (s, r) => `${r.ok ? '✓' : '✗'} ${label(s).padEnd(18)} ${r.crashed ? '（止まった）' : r.pass + '/' + r.total}（${r.sec.toFixed(0)}秒）`;

(async () => {
  const t0 = Date.now();
  console.log(`テストを ${order.length} 組、${JOBS} つずつ同時に流します（時間のかかる組から）`);
  const res = new Map();
  let next = 0, done = 0;
  await new Promise(finish => {
    let running = 0;
    const kick = () => {
      if (next >= order.length && running === 0) return finish();
      while (running < JOBS && next < order.length) {
        const s = order[next++]; running++;
        runOne(s).then(r => {
          running--; done++; res.set(s.i, r);
          if (!r.crashed) times[s.fn] = +r.sec.toFixed(1);
          console.log(`  [${String(done).padStart(3)}/${order.length}] ` + line(s, r));
          kick();
        });
      }
    };
    kick();
  });
  const t1 = Date.now();

  // 通らなかった組は、ほかが終わってから1つずつもう一度
  const bad = order.filter(s => !res.get(s.i).ok);
  const flaky = [];
  if (RETRY && bad.length) {
    console.log(`\n通らなかった ${bad.length} 組を、1つずつもう一度流します`);
    for (const s of bad) {
      const r = await runOne(s);
      console.log('  ' + line(s, r));
      if (r.ok) flaky.push(s);
      res.set(s.i, r);
    }
  }
  try { fs.writeFileSync(TIMES, JSON.stringify(times, null, 1) + '\n'); } catch (_) {}

  let pass = 0, fail = 0;
  const failed = [], crashed = [];
  for (const s of order) {
    const r = res.get(s.i);
    pass += r.pass; fail += r.fail;
    if (r.crashed) crashed.push(s); else if (!r.ok) failed.push(s);
  }
  console.log('\n' + '─'.repeat(50));
  if (failed.length || crashed.length) {
    console.log('通らなかったもの:');
    for (const s of failed.concat(crashed)) console.log(`[${label(s)}]\n` + failText(res.get(s.i)));
  }
  if (crashed.length) console.log('最後まで流れなかった組: ' + crashed.map(label).join(', '));
  if (flaky.length) console.log('やり直しで通った組（同時に流すと不安定）: ' + flaky.map(label).join(', '));
  const slow = order.slice().sort((a, b) => res.get(b.i).sec - res.get(a.i).sec).slice(0, 5);
  console.log('時間のかかった組: ' + slow.map(s => `${label(s)} ${res.get(s.i).sec.toFixed(0)}秒`).join('、'));
  const wall = (Date.now() - t0) / 1000, par = (t1 - t0) / 1000;
  console.log(`合計 ${pass + fail} 件 : 通った ${pass} / 通らなかった ${fail}（${wall.toFixed(0)}秒${RETRY && bad.length ? `。うち やり直し ${(wall - par).toFixed(0)}秒` : ''}）`);
  process.exit(fail || crashed.length ? 1 : 0);
})();
