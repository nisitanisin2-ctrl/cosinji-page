/* 声の計算帳：いろいろな言い方の文例と、期待する答え（v5 → v18）
   文例は koe/examples.js（アプリの「📚 文例」と同じもの）にまとめた。ここでは答えの付いた組だけを
   ジャンルごとに取り出して返す：{ ジャンル名: [[言葉, 期待する答え], …] }
   数なら「いまの答え」（state.lastV）と比べる。文字なら画面の答えに含まれるかを見る。
   日付は KOE_TODAY = 2026-09-25、消費税は 10% で確かめる。 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {}; ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'koe', 'examples.js'), 'utf8'), ctx);
const out = {};
for (const g of ctx.KOE_EXAMPLES) {
  const pairs = g.ex.filter(x => Array.isArray(x));
  if (pairs.length) out[g.g] = pairs;
}
module.exports = out;
