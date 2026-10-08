/* ════════════════════════════════════════════════════════════════
   まちがい方に 合わせた ひとこと（v3）
   S.diagnose(問題, □の中身) → {k: しゅるい, m: ひとこと}（当てはまらなければ null）
   1. 単元ごとの 見分け：gen が 返す mis(g, w) → ひとこと か ''
      （g ＝ 入れた 数の 並び、w ＝ 正しい 数の 並び。どちらも 数に なおしたもの）
   2. どの 単元でも 使える 見分け：□の 入れかわり・一部だけ 正解・符号だけ ちがう・
      くり上がり／くり下がり・＋−×÷の とりちがえ・九九の となり・小数点や 0 の けた・1 だけ ちがう・数字の 並びが ぎゃく
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU;
const eq = (x, y) => Math.abs(x - y) < 1e-9;
const isInt = v => Number.isInteger(v);
const dR = n => String(n).split('').reverse().map(Number);
const p10 = i => Math.pow(10, i);
/* 記録する まちがいの しゅるい（おうちの人向けの レポートで 使う） */
S.MIS_KINDS = {unit: 'その 単元の よく ある まちがい', swap: '□の 入れかわり', part: '一部の □', sign: '符号（＋・−）', carry: 'くり上がり', borrow: 'くり下がり',
  mulcarry: 'かけ算の くり上がり', op: '＋−×÷の とりちがえ', kuku: '九九', divchk: 'わり算', dec: '小数点の 場所', zero: '0 の 数（けた）', one: '1 ちがい', rev: '数字の 並び'};

/* ── 筆算で よく ある まちがいの 答え ── */
function addNoCarry(a, b){   // くり上げた 1 を たさない（いちばん上の くらいは そのまま 書く）
  const x = dR(a), y = dR(b), n = Math.max(x.length, y.length); let v = 0;
  for(let i = 0; i < n; i++){ const s = (x[i] || 0) + (y[i] || 0); v += (i < n - 1 ? s % 10 : s) * p10(i); }
  return v;
}
function subBigMinusSmall(a, b){   // どの くらいも 大きい ほうから 小さい ほうを ひく
  const x = dR(a), y = dR(b); let v = 0;
  for(let i = 0; i < x.length; i++) v += Math.abs(x[i] - (y[i] || 0)) * p10(i);
  return v;
}
function subNoDecrease(a, b){   // 1 かりても、かした くらいを 1 へらさない
  const x = dR(a), y = dR(b); let v = 0;
  for(let i = 0; i < x.length; i++){ const t = x[i] - (y[i] || 0); v += (t < 0 ? t + 10 : t) * p10(i); }
  return v;
}
function mulNoCarry(a, b){   // × 1けた：くり上げた 数を たさない
  const x = dR(a); let v = 0;
  for(let i = 0; i < x.length; i++){ const q = x[i] * b; v += (i < x.length - 1 ? q % 10 : q) * p10(i); }
  return v;
}
S.misCalc = {addNoCarry, subBigMinusSmall, subNoDecrease, mulNoCarry};

/* □の よび名（「分子」「あまり」「x」「分の □」など。わからなければ「2つめの □」） */
function blankName(p, i){
  const f = String(p.form), at = f.indexOf('{' + i + '}'), before = f.slice(0, at), after = f.slice(at + String(i).length + 2);
  if(/^\|/.test(after)) return '整数の ところ';
  if(/\[\[$/.test(before) || /\|$/.test(before)) return '分子';
  if(/\/$/.test(before) && /^\]\]/.test(after)) return '分母';
  if(/^時/.test(after)) return '「時」の □';
  if(/^分/.test(after)) return '「分」の □';
  if(/あまり\s*$/.test(before)) return 'あまり';
  if(/^\s*あまり/.test(after)) return '答え（商）';
  const v = /^(x²|xy|x|y)/.exec(after); if(v) return `${v[1]} の 係数`;
  const lhs = /([xy])\s*=\s*$/.exec(before); if(lhs) return lhs[1];
  if(/^\s*$/.test(after) && /[xy]/.test(before)) return '数の 項';
  const u = /^\s*(cm|mm|km|kg|mL|dL|m|g|L)(?![a-zA-Z])/.exec(after); if(u) return `「${u[1]}」の □`;
  return `${i + 1}つめの □`;
}
const names = (p, flags) => flags.map((f, i) => f ? blankName(p, i) : '').filter(Boolean).join(' と ');

/* ── 「A ○ B = □」の 1つの 計算（0 以上の 数どうし）の まちがい ── */
function opMis(f, G, W){
  const m = /^(\d+(?:\.\d+)?) ([+−×÷]) (\d+(?:\.\d+)?) = \{0\}$/.exec(f);
  if(!m) return null;
  const A = +m[1], op = m[2], B = +m[3], ints = isInt(A) && isInt(B) && isInt(G) && isInt(W);
  if(op === '+'){
    if(ints && A >= 10 && B >= 10 && G === addNoCarry(A, B)) return {k: 'carry', m: 'くり上げた 1 を たした？ くり上がりを たしかめてね'};
    if(eq(G, Math.abs(A - B))) return {k: 'op', m: 'ひき算に なって いないかな？ ＋ は たし算だよ'};
    if(A > 1 && B > 1 && eq(G, A * B)) return {k: 'op', m: 'かけ算に なって いないかな？ ＋ は たし算だよ'};
    if(ints && [10, 100, 1000].includes(W - G)) return {k: 'carry', m: 'くり上がりを たしかめてね（くり上げた 1 を たしたかな？）'};
  }
  if(op === '−'){
    if(ints && A >= 10 && B < A && (G === subBigMinusSmall(A, B) || G === subNoDecrease(A, B))) return {k: 'borrow', m: 'くり下がりに 気をつけて。ひけない ときは となりの くらいから 1 かりるよ（かした くらいは 1 へる）'};
    if(eq(G, A + B)) return {k: 'op', m: 'たし算に なって いないかな？ − は ひき算だよ'};
    if(ints && A >= 10 && [10, 100, 1000].includes(Math.abs(W - G))) return {k: 'borrow', m: 'くり下がりを たしかめてね'};
  }
  if(op === '×'){
    if(ints && A >= 10 && B < 10 && G === mulNoCarry(A, B)) return {k: 'mulcarry', m: 'くり上げた 数を たしわすれて いないかな？'};
    if(A > 1 && B > 1 && eq(G, A + B)) return {k: 'op', m: 'たし算に なって いないかな？ × は かけ算だよ'};
    if(ints && A <= 9 && B <= 9){
      if(G === A * (B + 1) || G === A * (B - 1)) return {k: 'kuku', m: `となりの 九九の 答えだよ。${A} の だんを もう一度 となえてみよう`};
      if(G === (A + 1) * B || G === (A - 1) * B) return {k: 'kuku', m: `となりの 九九の 答えだよ。${B} の だんで 考えてみよう（${B} × ${A} も 同じ 答え）`};
    }
  }
  if(op === '÷'){
    if(B > 1 && eq(G, A * B)) return {k: 'op', m: 'かけ算に なって いないかな？ ÷ は わり算だよ'};
    if(eq(G, A - B)) return {k: 'op', m: 'ひき算に なって いないかな？ ÷ は わり算だよ'};
    if(ints && B > 0 && G > 0 && B * G !== A) return {k: 'divchk', m: `かけ算で たしかめよう：${B} × ${G} = ${B * G}。${A} に なるかな？`};
  }
  return null;
}

/* ── どの 単元でも 使える 見分け ── */
function generic(p, g, w){
  const n = w.length, f = String(p.form);
  if(n >= 2){
    if(p.order === 'any'){
      const neg = g.map(v => -v).sort((x, y) => x - y), ws = w.slice().sort((x, y) => x - y);
      if(neg.every((v, i) => eq(v, ws[i])) && ws.some(v => !eq(v, 0))) return {k: 'sign', m: 'どちらも 符号（＋・−）が ぎゃくだよ'};
      const left = w.slice(); let right = 0;
      for(const v of g){ const j = left.findIndex(x => eq(x, v)); if(j >= 0){ left.splice(j, 1); right++; } }
      if(right > 0 && right < n) return {k: 'part', m: '1つは あっているよ。もう 1つを 見直そう'};
      return null;
    }
    if(n === 2 && eq(g[0], w[1]) && eq(g[1], w[0]) && !eq(w[0], w[1])){
      const frac = /\[\[\{0\}\/\{1\}\]\]/.test(f);
      return {k: 'swap', m: frac ? '分子と 分母が ぎゃくだよ（分子が 上、分母が 下）' : `${blankName(p, 0)} と ${blankName(p, 1)} の 答えが 入れかわって いないかな？`};
    }
    const right = g.map((v, i) => eq(v, w[i])), sgn = g.map((v, i) => !right[i] && !eq(w[i], 0) && eq(v, -w[i]));
    if(sgn.some(Boolean)) return {k: 'sign', m: `${names(p, sgn)} の 符号（＋・−）を たしかめてね`};
    if(right.some(Boolean)) return {k: 'part', m: `${names(p, right)} は あっているよ。${names(p, right.map(x => !x))} を 見直そう`};
    return null;
  }
  const G = g[0], W = w[0], dec = p.kinds[0] === 'd' || !isInt(W);
  if(!eq(W, 0) && eq(G, -W)) return {k: 'sign', m: '数の 大きさは あっているよ。符号（＋・−）を たしかめてね'};
  const om = opMis(f, G, W); if(om) return om;
  if(!eq(W, 0) && !eq(G, 0)) for(const k of [10, 100, 1000]) if(eq(G, W * k) || eq(G * k, W))
    return dec || !isInt(G) ? {k: 'dec', m: '小数点の 場所を たしかめてね'} : {k: 'zero', m: '0 の 数（けた）を たしかめてね'};
  if(isInt(W) && isInt(G) && Math.abs(G - W) === 1) return {k: 'one', m: 'おしい！ 1 だけ ちがうよ。もう一度 たしかめてみよう'};
  if(isInt(W) && isInt(G) && W >= 10 && G >= 0 && String(G) === String(W).split('').reverse().join('')) return {k: 'rev', m: '数字の 並びが ぎゃくに なって いないかな？'};
  return null;
}

S.diagnose = (p, vals) => {
  if(!p || !vals) return null;
  const g = vals.map((v, i) => S.parseBlank(p.kinds[i], v));
  if(g.some(v => v === null || Number.isNaN(v))) return null;
  const w = p.ans.map((v, i) => S.parseBlank(p.kinds[i], v));
  if(w.some(v => v === null) || g.length !== w.length) return null;
  if(typeof p.mis === 'function'){ try { const m = p.mis(g, w); if(m) return {k: 'unit', m: String(m)}; } catch(_){} }
  try { return generic(p, g, w); } catch(_){ return null; }
};
S.blankName = blankName;
})();
