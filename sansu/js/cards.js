/* ════════════════════════════════════════════════════════════════
   🃏 えらんで 答える（v4）
   S.choices(問題, 乱数) → □に 入れる 中身の 並びを 4つ（正しい 答え 1つ ＋ まちがい 3つ。じゅんばんは ばらばら）
   まちがいは「よく ある まちがい」（S.diagnose が 見分けられる もの）を さきに えらぶ。
   その 問題の 数どうしを たした・ひいた・かけた・わった 数や、答えの となりの 数・けたの ずれた 数から さがす。
   作れなければ null（ふつうの キーで 答える）
   S.cardHtml(問題, 中身) → カードに 書く 答え（問題を 言い直した ところは のぞく）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU, MI = S.MI;
const isI = Number.isInteger;
/* 数を □の 種類の 書き方に（書けない 数なら null） */
function fmtV(kind, v){
  if(v === null || typeof v !== 'number' || !isFinite(v)) return null;
  switch(kind){
    case 'n': return isI(v) && v >= 0 && v < 1e8 ? String(v) : null;
    case 'i': return isI(v) && Math.abs(v) < 1e8 ? S.num(v) : null;
    case 'd': { if(Math.abs(v) >= 1e7) return null; const r = Math.round(v * 1e4) / 1e4; if(Math.abs(r - v) > 1e-9) return null; return (r < 0 ? MI : '') + String(Math.abs(r)); }
    case 't': return isI(v) ? S.term(v) : null;
    case 'tc': return isI(v) ? (v === 1 ? '+' : v === -1 ? MI : S.term(v)) : null;
    case 'c': return isI(v) ? (v === 1 ? '' : v === -1 ? MI : S.num(v)) : null;
  }
  return null;
}
/* 問題の 中の 数（□を のぞく）と、それを たした・ひいた・かけた・わった 数。W を わたすと 答えの となり・10倍 なども */
function soup(p, W){
  const t = (p.q + ' ' + p.form).replace(/\{\d+\}/g, ' ').replace(/[²³]/g, ' ');
  const base = [...new Set((t.match(/\d+(?:\.\d+)?/g) || []).map(Number))].filter(v => v > 0).slice(0, 8);
  const out = new Set(base);
  for(let i = 0; i < base.length; i++) for(let j = 0; j < base.length; j++){
    const a = base[i], b = base[j];
    if(i !== j){ out.add(a - b); out.add(a / b); }
    if(i <= j){ out.add(a + b); out.add(a * b); out.add((a + b) * 2); out.add(a * b / 2); }
  }
  if(W != null){
    for(const d of [1, 2, 3, 10]){ out.add(W + d); out.add(W - d); }
    for(const k of [2, 10]){ out.add(W * k); out.add(W / k); }
    out.add(-W); out.add(Math.round(W * 1.5));
    if(isI(W) && W >= 10) out.add(+String(Math.abs(W)).split('').reverse().join(''));
  }
  return [...out].filter(v => isFinite(v));
}
const RANK = {unit: 0, carry: 1, borrow: 1, mulcarry: 1, kuku: 1, op: 1, swap: 1, sign: 2, part: 2, one: 3, dec: 3, zero: 3, rev: 3, divchk: 4, near: 4};
const shuffle = (a, rng) => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

S.choices = (p, rng) => {
  rng = rng || Math.random;
  const n = p.ans.length, w = p.ans.map((v, i) => S.parseBlank(p.kinds[i], v));
  if(w.some(v => v === null)) return null;
  const f = String(p.form), den = i => new RegExp('/\\{' + i + '\\}\\]\\]').test(f);   // 分母の □
  const u = S.UNITS.find(x => x.id === p.unit), young = !u || u.g < 7 || u.pos;   // 小学生（と 答えが 負に ならない 単元 pos）には 負の数の カードは 出さない
  const bare = (p.q + ' ' + f).replace(/\{\d+\}/g, ' ');
  // 0 の 数の まちがいは、何十・何百の かけ算・わり算の とき だけ。小数点の まちがいは 小数の とき だけ
  const zeroOK = /[×÷]/.test(f) && /(^|[^\d.])\d*0(?![\d.])/.test(bare) && Math.abs(w[0]) >= 10, decOK = p.kinds.includes('d') || /\d\.\d/.test(bare);
  const seen = new Set([p.ans.join('|')]), found = [];
  const tryVals = vals => {
    if(vals.length !== n) return;
    if(young && vals.some((v, i) => v < 0 && w[i] >= 0)) return;
    const s = vals.map((v, i) => fmtV(p.kinds[i], v));
    if(s.some(x => x === null)) return;
    if(vals.some((v, i) => den(i) && v < 2)) return;
    const k = s.join('|'); if(seen.has(k)) return; seen.add(k);
    const r = S.check(p, s); if(r.ok || r.near || r.bad) return;
    const dg = S.diagnose(p, s), W0 = Math.abs(w[0]) || 1, close = n === 1 && Math.abs(vals[0] - w[0]) <= Math.max(3, W0 * 0.25);
    if(n === 1 && Math.abs(vals[0]) > Math.max(10 * W0 + 10, 100)) return;   // 大きすぎる 数は 出さない
    // けたの ずれは 10倍・10分の1 だけ（その まちがいが おきやすい 問題で）
    if(dg && (dg.k === 'zero' || dg.k === 'dec') && (!(dg.k === 'zero' ? zeroOK : decOK) || !(Math.abs(vals[0] - w[0] * 10) < 1e-9 || Math.abs(vals[0] * 10 - w[0]) < 1e-9))) return;
    if(n > 1 && pairOnly && !dg) return;
    // よく ある まちがい（見分けが つく もの）か、答えに 近い 数
    if(dg && dg.k !== 'divchk') found.push({s, r: RANK[dg.k] != null ? RANK[dg.k] : 3, k: dg.k, close});
    else if(close || n > 1) found.push({s, r: RANK.near, k: 'near', close});
  };
  let pairOnly = false;
  if(n === 1){
    for(const v of soup(p, w[0])) tryVals([v]);
  } else {
    if(n === 2 && p.order !== 'any' && !/時/.test(f)) tryVals([w[1], w[0]]);
    for(let i = 0; i < n; i++) for(const d of [1, -1, 2, -2]){ const v = w.slice(); v[i] = w[i] + d; tryVals(v); }
    for(let i = 0; i < n; i++){ const v = w.slice(); v[i] = -w[i]; tryVals(v); }
    tryVals(w.map(x => -x));
    if(/\[\[\{0\}\/\{1\}\]\]/.test(f) && n === 2){   // 分数の 答え：問題の 数から 分子・分母を 作る（分母どうしを たした など。見分けが つく ものだけ）
      const sp = soup(p).filter(v => isI(v) && v > 0 && v <= 200).slice(0, 40);
      pairOnly = true;
      for(const a of sp) for(const b of sp) if(b >= 2) tryVals([a, b]);
      pairOnly = false;
    }
  }
  if(found.length < 3) return null;
  // 見分けの しゅるいが かさならない ように、よく ある まちがいから じゅんに 2つ ＋ 答えに 近い 数 1つ
  const order = shuffle(found, rng).sort((a, b) => a.r - b.r), pick = [], kinds = {};
  for(const o of order){
    if(pick.length >= 2) break;
    const lim = o.k === 'unit' ? 2 : 1;
    if((kinds[o.k] || 0) >= lim) continue;
    kinds[o.k] = (kinds[o.k] || 0) + 1; pick.push(o);
  }
  const near = order.find(o => o.close && !pick.includes(o)) || order.find(o => !pick.includes(o) && (kinds[o.k] || 0) < 1) || order.find(o => !pick.includes(o));
  if(near) pick.push(near);
  for(const o of order){ if(pick.length >= 3) break; if(!pick.includes(o)) pick.push(o); }
  if(pick.length < 3) return null;
  return shuffle([p.ans.slice(), ...pick.map(o => o.s)], rng);
};

/* カードに 書く 答え：問題を 言い直した ところ（「8 + 5 =」「… →」）は のぞいて、□に 中身を 入れる */
S.cardHtml = (p, vals) => {
  let f = String(p.form);
  const b0 = f.search(/\{\d+\}/), head = b0 >= 0 ? f.slice(0, b0) : f, k = Math.max(head.lastIndexOf('→'), head.lastIndexOf('='));
  if(k >= 0 && (head.lastIndexOf('→') >= 0 || /[\d)\]]/.test(head.slice(0, k)))) f = f.slice(k + 1);
  return S.mathHtml(f.trim(), {blank: i => `<b class="cv">${S.esc(vals[i] == null ? '' : vals[i]) || '&#8203;'}</b>`});
};
S.fmtBlank = fmtV;
})();
