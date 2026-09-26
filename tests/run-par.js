#!/usr/bin/env node
/* テストを組ごとに並べて流す（v427）
   node tests/run.js は全部の組を1つずつ順に流すので10分以上かかる。
   ここでは run.js にある組の名前（only === '…'）を拾い、組ごとに別の node で同時に流して、
   最後に合計を出す。中身の確かめ方は run.js と同じ。
     node tests/run-par.js            … 同時に流す数は CPU の数に合わせる（4まで）
     JOBS=2 node tests/run-par.js     … 同時に流す数を決める
   組どうしは別々のブラウザで動くので、ひとつの組が落ちてもほかの組は最後まで流れる。 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RUN = path.join(__dirname, 'run.js');
const src = fs.readFileSync(RUN, 'utf8');
// 組の名前を、run.js に書いてある順に拾う（1つの名前で2つの組が流れるもの＝koe などもそのまま）
const names = [];
for (const m of src.matchAll(/only === '([a-z0-9]+)'/g)) if (!names.includes(m[1])) names.push(m[1]);
// koelisten は koe の中でも流れるので、二重に数えないよう外す
const suites = names.filter(n => n !== 'koelisten');
const JOBS = Math.max(1, Math.min(+process.env.JOBS || Math.min(4, os.cpus().length), suites.length));

const t0 = Date.now();
let pass = 0, fail = 0, crashed = [];
const fails = [];
const lines = [];
let next = 0, running = 0;

function runOne(name) {
  return new Promise(resolve => {
    const t = Date.now();
    const p = spawn(process.execPath, [RUN, name], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => {
      const m = out.match(/合計 (\d+) 件 : 通った (\d+) \/ 通らなかった (\d+)/);
      const sec = ((Date.now() - t) / 1000).toFixed(0);
      if (!m) { crashed.push(name); lines.push(`  ✗ ${name}（${sec}秒）… 最後まで流れませんでした\n` + out.split('\n').slice(-8).join('\n')); }
      else {
        pass += +m[2]; fail += +m[3];
        lines.push(`  ${+m[3] ? '✗' : '✓'} ${name.padEnd(12)} ${m[2]}/${m[1]}（${sec}秒）`);
        const fi = out.indexOf('通らなかったもの:');
        if (fi >= 0) fails.push(`[${name}]\n` + out.slice(fi + '通らなかったもの:'.length, out.lastIndexOf('合計')).trimEnd());
      }
      process.stdout.write(lines[lines.length - 1].split('\n')[0] + '\n');
      resolve();
    });
  });
}

(async () => {
  console.log(`テストを ${suites.length} 組、${JOBS} つずつ同時に流します`);
  await new Promise(done => {
    const kick = () => {
      if (next >= suites.length && running === 0) return done();
      while (running < JOBS && next < suites.length) {
        const n = suites[next++]; running++;
        runOne(n).then(() => { running--; kick(); });
      }
    };
    kick();
  });
  console.log('\n' + '─'.repeat(50));
  if (fails.length) { console.log('通らなかったもの:'); fails.forEach(f => console.log(f)); }
  if (crashed.length) console.log('最後まで流れなかった組: ' + crashed.join(', '));
  console.log(`合計 ${pass + fail} 件 : 通った ${pass} / 通らなかった ${fail}（${((Date.now() - t0) / 1000).toFixed(0)}秒）`);
  process.exit(fail || crashed.length ? 1 : 0);
})();
