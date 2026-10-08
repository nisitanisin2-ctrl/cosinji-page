/* ════════════════════════════════════════════════════════════════
   算数（小学1年〜6年）の単元
   1つの単元＝ 解説（ex）＋ 問題を作る gen(r)。
   gen は {q:問題文, form:答えの形（{0}{1}… が□）, ans:答え, kinds:□の種類, steps:ヒント（その問題の数字で）, answer:答えの説明, fig:図}
   □の種類：n＝0以上の整数 i＝整数（−も） d＝小数 t＝符号つきの項（+3 −3） tc＝係数の項（+ だけ＝+1） c＝先頭の係数（空＝1・− だけ＝−1）
   ヒントは「考え方 → その問題の数字での途中の計算」の順に、1つずつ出す（最後の答えは書かない）
   ヒントの {{数}} は とちゅうの 数。「いっしょに とく」では □ に なり、子どもが 当てはめながら 進む（v3）
   mis(g, w) は まちがい方に 合わせた ひとこと（g＝入れた 数、w＝正しい 数。当てはまらなければ ''）（v3）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU, F = S.F, { gcd, lcm, MI, num, term, par, decStr, poly, divisors } = S;
const UNITS = S.UNITS = S.UNITS || [];
const U = u => { UNITS.push(u); return u; };

/* ── 答えの形の道具（中学の単元でも使う） ── */
const H = S.H = {};
H.fr = (a, b) => `[[${a}/${b}]]`;
H.mx = (w, a, b) => `[[${w}|${a}/${b}]]`;
H.op = plus => plus ? '+' : MI;
H.pp = n => '(' + (n < 0 ? MI : '+') + Math.abs(n) + ')';          // (+3) (−3)
H.tc = v => v === 1 ? '+' : v === -1 ? MI : term(v);               // 係数の項（+x は「+」だけ）
H.cc = v => v === 1 ? '' : v === -1 ? MI : num(v);                 // 先頭の係数（x は空）
H.is = (a, b) => Math.abs(a - b) < 1e-9;
H.fv = g => g.length === 2 ? (g[1] ? g[0] / g[1] : NaN) : g[0];     // 入れた 答え（分数 or 整数）の 大きさ
/* たんいを なおす ときの まちがい（1ub = K us。big ub と small us を あわせて us に） */
H.convMis = (big, small, K, ub, us) => ([G]) =>
  G === big + small ? `${ub} を ${us} に なおしてから たそう（1${ub} = ${K}${us}）`
  : G === big * K ? `${small}${us} を たすのを わすれずに`
  : [10, 100, 1000].some(x => x !== K && G === big * x + small) ? `1${ub} は ${K}${us} だよ` : '';
H.padDec = (v, p) => { const s = String(Math.abs(v)).padStart(p + 1, '0'); return (v < 0 ? MI : '') + s.slice(0, s.length - p) + (p ? '.' + s.slice(s.length - p) : ''); };
H.fracCheck = (N, D) => g => {
  const [a, b] = g; if(!b) return {ok: false};
  if(a * D !== b * N) return {ok: false};
  if(gcd(a, b) !== 1) return {ok: false, near: true, msg: 'あと少し！ まだ 約分できるよ'};
  return {ok: true};
};
/* 分数の答え（約分した形）。分母が 1 になるときは整数の□1つ */
H.fracAns = (n, d, pre, post) => {
  const g = gcd(n, d), N = n / g, D = d / g;
  if(D === 1) return {form: (pre || '') + '{0}' + (post || ''), ans: [N], kinds: ['i']};
  return {form: (pre || '') + '[[{0}/{1}]]' + (post || ''), ans: [N, D], kinds: [N < 0 ? 'i' : 'n', 'n'], check: H.fracCheck(N, D), val: N / D};
};
H.ratioCheck = (p, q) => g => {
  const [a, b] = g; if(!a || !b) return {ok: false};
  if(a * q !== b * p) return {ok: false};
  if(gcd(a, b) !== 1) return {ok: false, near: true, msg: 'もっと かんたんな 比に できるよ'};
  return {ok: true};
};
H.remCheck = (q, r, d) => g => {
  const [Q, Rm] = g;
  if(Q === q && Rm === r) return {ok: true};
  if(Q * d + Rm === q * d + r && Rm >= d) return {ok: false, near: true, msg: `あまりの ${Rm} が わる数の ${d} より 大きいよ。まだ 分けられるね`};
  return {ok: false};
};
/* 筆算のヒント（たし算・ひき算・かけ算）。くらいごとに1行 */
const PL = ['一', '十', '百', '千', '万'];
const digitsR = n => String(n).split('').reverse().map(Number);
H.colAdd = (a, b) => {
  const da = digitsR(a), db = digitsR(b), n = Math.max(da.length, db.length), out = []; let c = 0;
  for(let i = 0; i < n; i++){
    const x = da[i] || 0, y = db[i], s = x + (y || 0) + c;
    let t = `${PL[i]}のくらい：${x}${y != null ? ' + ' + y : ''}${c ? ' + 1（くり上げた 1）' : ''} = {{${s}}}`;
    t += s >= 10 ? (i < n - 1 ? ` → ${s % 10} を かいて、1 を ${PL[i + 1]}のくらいへ くり上げる` : ` → ${s} と かく`) : ` → ${s} を かく`;
    out.push(t); c = s >= 10 ? 1 : 0;
  }
  return out;
};
/* 答えまで うまった ひっ算（答えの あとに 見せる。v9：一のくらいから 1けたずつ 出る）。op は '+'・'−'・'×'（× は 1けた） */
H.colDone = (a, b, op) => {
  const da = digitsR(a), db = digitsR(b), cy = {}; let c = 0;
  if(op === '+'){ const n = Math.max(da.length, db.length); for(let i = 0; i < n; i++){ const s = (da[i] || 0) + (db[i] || 0) + c; c = s >= 10 ? 1 : 0; if(c && i + 1 < n) cy[i + 1] = '1'; }
    return F.cols([{s: String(a)}, {s: String(b), op: '+'}, {s: String(a + b)}], [1], Object.keys(cy).length ? cy : null); }
  if(op === MI) return F.cols([{s: String(a)}, {s: String(b), op: MI}, {s: String(a - b)}], [1]);
  for(let i = 0; i < da.length; i++){ const q = da[i] * b + c; c = Math.floor(q / 10); if(c && i + 1 < da.length) cy[i + 1] = String(c); }
  return F.cols([{s: String(a)}, {s: String(b), op: '×'}, {s: String(a * b)}], [1], Object.keys(cy).length ? cy : null);
};
H.subChain = (a, b) => {   // 0 の けたから かりる（くり下がりが2回続く）ものは小学2年では出さない
  const da = digitsR(a), db = digitsR(b); let bw = 0;
  for(let i = 0; i < da.length; i++){ const x = da[i] - bw; if(x < 0) return true; bw = x < (db[i] || 0) ? 1 : 0; }
  return false;
};
H.colSub = (a, b) => {
  const da = digitsR(a), db = digitsR(b), out = []; let bw = 0;
  for(let i = 0; i < da.length; i++){
    const x = da[i] - bw, y = db[i]; let t = `${PL[i]}のくらい：`;
    if(bw) t += `1 かしたので ${da[i]} は ${x}。`;
    if(y == null){ t += x ? `${x} を そのまま おろす` : '0 なので かかない'; bw = 0; }
    else if(x < y){ t += `${x} − ${y} は ひけないので、${PL[i + 1]}のくらいから 1 かりて ${x + 10} − ${y} = {{${x + 10 - y}}}`; bw = 1; }
    else { t += `${x} − ${y} = {{${x - y}}}`; if(i === da.length - 1 && x - y === 0) t += '（いちばん上の 0 は かかない）'; bw = 0; }
    out.push(t);
  }
  return out;
};
H.colMul = (a, b) => {
  const da = digitsR(a), out = []; let c = 0;
  for(let i = 0; i < da.length; i++){
    const p = da[i] * b + c; let t = `${PL[i]}のくらい：${da[i]} × ${b} = {{${da[i] * b}}}`;
    if(c) t += `、くり上げた ${c} を たして {{${p}}}`;
    t += i < da.length - 1 ? (p >= 10 ? ` → ${p % 10} を かいて、${Math.floor(p / 10)} を くり上げる` : ` → ${p} を かく`) : ` → ${p} と かく`;
    out.push(t); c = Math.floor(p / 10);
  }
  return out;
};
/* わり算の筆算のヒント（たてる → かける → ひく → おろす） */
H.longDiv = (c, d) => {
  const ds = String(c).split('').map(Number), out = []; let cur = 0, started = false;
  for(let i = 0; i < ds.length; i++){
    cur = cur * 10 + ds[i];
    if(!started && cur < d){ if(i < ds.length - 1) out.push(`${cur} は ${d} で われないので、つぎの けたと あわせて ${cur * 10 + ds[i + 1]} を わる`); continue; }
    started = true;
    const q = Math.floor(cur / d), p = q * d, rest = cur - p;
    let t = d >= 10 ? `${cur} ÷ ${d}：${d} × ${q} = {{${p}}}${q < 9 ? `、${d} × ${q + 1} = {{${p + d}}}（${cur} を こえる）` : ''} なので ${q} を たてる。${cur} − ${p} = {{${rest}}}`
                    : `${cur} ÷ ${d} → {{${q}}} を たてる。${d} × ${q} = {{${p}}}、${cur} − ${p} = {{${rest}}}`;
    if(i < ds.length - 1) t += `。つぎの ${ds[i + 1]} を おろして ${rest * 10 + ds[i + 1]}`;
    out.push(t); cur = rest;
  }
  return out;
};
const hsBox = n => '?'.repeat(String(n).length);
const fr = H.fr, mx = H.mx;

/* ════════════ 小学1年 ════════════ */
U({id: 'g1-add10', g: 1, ic: '🍎', t: 'たしざん（10まで）', ta: true,
  ex: [['p', 'たしざんは、**あわせて いくつ** に なるかを もとめる けいさんです。'],
       ['fig', () => F.dots([3, 2])],
       ['eg', '●が 3こ と ●が 2こ で、ぜんぶで 5こ。  3 + 2 = 5'],
       ['tip', 'おおきい ほうの かずから かぞえると はやいよ。2 + 7 は、7 から「8、9」と かぞえて 9。']],
  gen(r){
    const a = r.int(1, 9), b = r.int(1, 10 - a), c = a + b, seq = [];
    for(let i = a + 1; i < c; i++) seq.push(i);
    return {q: 'たしざんを しよう。', form: `${a} + ${b} = {0}`, ans: [c],
      steps: [{t: `●が ${a}こ と ●が ${b}こ。ぜんぶで なんこ かな？`, fig: F.dots([a, b])},
              b === 1 ? `${a} の つぎの かずは なにかな？` : `${a} の つぎから ${b}こ かぞえよう：${seq.join('、')}、…`],
      answer: `${a} + ${b} = ${c}`};
  }});
U({id: 'g1-sub10', g: 1, ic: '🍊', t: 'ひきざん（10まで）', ta: true,
  ex: [['p', 'ひきざんは、**のこりは いくつ** か、**ちがいは いくつ** かを もとめる けいさんです。'],
       ['fig', () => F.dots([5], 2)],
       ['eg', '●が 5こ。2こ とると、のこりは 3こ。  5 − 2 = 3'],
       ['tip', '「いくつと いくつ」で かんがえよう。5 は 2 と 3。だから 5 − 2 = 3。']],
  gen(r){
    const a = r.int(2, 10), b = r.int(1, a - 1), c = a - b, seq = [];
    for(let i = a - 1; i > c; i--) seq.push(i);
    return {q: 'ひきざんを しよう。', form: `${a} − ${b} = {0}`, ans: [c],
      steps: [{t: `●が ${a}こ。そこから ${b}こ とる（× の ぶん）と、のこりは なんこ？`, fig: F.dots([a], b)},
              b === 1 ? `${a} の ひとつ まえの かずは なにかな？` : `${a} から ${b}こ もどって かぞえよう：${seq.join('、')}、…`],
      answer: `${a} − ${b} = ${c}`};
  }});
U({id: 'g1-carry', g: 1, ic: '🔟', t: 'くりあがりの ある たしざん', ta: true,
  ex: [['p', 'こたえが 10 より おおきく なる たしざんは、**10 の まとまり** を つくって かんがえます。'],
       ['fig', () => F.ten(8, 5)],
       ['eg', '8 + 5：8 は あと 2 で 10。5 を 2 と 3 に わける。8 と 2 で 10、10 と 3 で 13。'],
       ['tip', 'おおきい ほうの かずを 10 に して、ちいさい ほうを わけると かんたん。']],
  gen(r){
    const a = r.int(2, 9), b = r.int(11 - a, 9), c = a + b, big = Math.max(a, b), small = Math.min(a, b), need = 10 - big, rest = small - need;
    return {q: 'くりあがりの ある たしざん。', form: `${a} + ${b} = {0}`, ans: [c],
      steps: [{t: `${big} は あと {{${need}}} で 10 に なるね。`, fig: F.ten(big, small)},
              `${small} を {{${need}}} と {{${rest}}} に わけよう。`,
              `${big} と ${need} で 10。10 と ${rest} で いくつ？`],
      mis: ([G]) => G === rest ? '10 の まとまりを わすれて いないかな？' : '',
      answer: `${big} + ${need} = 10、10 + ${rest} = ${c}`};
  }});
U({id: 'g1-borrow', g: 1, ic: '🧮', t: 'くりさがりの ある ひきざん', ta: true,
  ex: [['p', '一のくらいから ひけない ときは、**10 から ひいて**、のこりを あわせます。'],
       ['fig', () => F.tenSub(13, 8)],
       ['eg', '13 − 8：13 を 10 と 3 に わける。10 − 8 = 2。2 と 3 で 5。'],
       ['tip', '「10 から ひく」を おぼえると、どんな くりさがりも できるよ。']],
  gen(r){
    const a = r.int(11, 18), b = r.int(a - 9, 9), c = a - b, o = a - 10;
    return {q: 'くりさがりの ある ひきざん。', form: `${a} − ${b} = {0}`, ans: [c],
      steps: [{t: `${a} を 10 と {{${o}}} に わけよう。`, fig: F.tenSub(a, b)},
              `${o} から ${b} は ひけないね。10 から ${b} を ひくと {{${10 - b}}}。`,
              `${10 - b} と のこりの ${o} を あわせると？`],
      mis: ([G]) => G === 10 - b ? `のこりの ${o} を あわせるのを わすれずに` : '',
      answer: `10 − ${b} = ${10 - b}、${10 - b} + ${o} = ${c}`};
  }});
U({id: 'g1-blank', g: 1, ic: '❓', t: '□に はいる かず',
  ex: [['p', '□に はいる かずは、**ぎゃくの けいさん** で みつけられます。'],
       ['eg', '3 + □ = 8 → □ は 8 − 3 = 5'],
       ['eg', '□ − 2 = 6 → □ は 6 + 2 = 8'],
       ['tip', 'みつけた かずを □に いれて、しきが あって いるか たしかめよう。']],
  gen(r){
    const t = r.int(0, 2);
    if(t === 0){ const a = r.int(1, 9), x = r.int(1, 9), c = a + x;
      return {q: '□に はいる かずは なに？', form: `${a} + {0} = ${c}`, ans: [x],
        steps: [`${a} に いくつ たすと ${c} に なるかな？`, `${c} − ${a} を けいさんすると わかるよ。`], answer: `${c} − ${a} = ${x} だから □ は ${x}`,
        mis: ([G]) => G === a + c ? `たしざん では なく、${c} − ${a} で もとめよう` : ''}; }
    if(t === 1){ const a = r.int(5, 18), x = r.int(1, Math.min(9, a - 1)), c = a - x;
      return {q: '□に はいる かずは なに？', form: `${a} − {0} = ${c}`, ans: [x],
        steps: [`${a} から いくつ とると ${c} に なるかな？`, `${a} − ${c} で もとめられるよ。`], answer: `${a} − ${c} = ${x} だから □ は ${x}`,
        mis: ([G]) => G === a + c ? `ひきざんで もとめよう（${a} − ${c}）` : ''}; }
    const b = r.int(1, 9), c = r.int(1, 9), x = b + c;
    return {q: '□に はいる かずは なに？', form: `{0} − ${b} = ${c}`, ans: [x],
      steps: [`□ から ${b} を ひいたら ${c} が のこったよ。`, `のこりの ${c} に、ひいた ${b} を もどすと？  ${c} + ${b}`], answer: `${c} + ${b} = ${x} だから □ は ${x}`,
      mis: ([G]) => G === c - b ? `ひいた ${b} を もどして（たして）みよう` : ''};
  }});

/* ════════════ 小学2年 ════════════ */
U({id: 'g2-add2', g: 2, ic: '➕', t: '2けたの たし算（ひっ算）',
  ex: [['p', 'ひっ算は、**くらいを たてに そろえて**、一のくらいから じゅんに 計算します。'],
       ['fig', () => F.cols([{s: '38'}, {s: '45', op: '+'}, {s: '83'}], [1], {1: '1'})],
       ['eg', '一のくらい 8 + 5 = 13 → 3 を かいて 1 を くり上げる。十のくらい 3 + 4 + 1 = 8。答えは 83。'],
       ['tip', 'くり上げた 1 を 小さく かいておくと、たしわすれないよ。']],
  gen(r){
    const a = r.int(12, 98), b = r.int(11, 98), c = a + b;
    return {q: 'ひっ算で 計算しよう。', form: `${a} + ${b} = {0}`, ans: [c],
      steps: [{t: 'くらいを そろえて、**一のくらい** から 計算するよ。', fig: F.cols([{s: String(a)}, {s: String(b), op: '+'}, {s: hsBox(c)}], [1])}, ...H.colAdd(a, b)],
      answer: `${a} + ${b} = ${c}`, afterFig: H.colDone(a, b, '+')};
  }});
U({id: 'g2-sub2', g: 2, ic: '➖', t: '2けたの ひき算（ひっ算）',
  ex: [['p', 'ひき算の ひっ算も、くらいを そろえて **一のくらい** から。ひけない ときは、となりの くらいから 1 かりて 10 に します。'],
       ['fig', () => F.cols([{s: '52'}, {s: '27', op: MI}, {s: '25'}], [1])],
       ['eg', '一のくらい 2 − 7 は ひけない → 十のくらいから かりて 12 − 7 = 5。十のくらい 5 は 4 に なって 4 − 2 = 2。答えは 25。'],
       ['tip', 'かした くらいの 数字に ／ を つけて、1 小さく かいておこう。']],
  gen(r){
    const a = r.int(31, 99), b = r.int(11, a - 2), c = a - b;
    return {q: 'ひっ算で 計算しよう。', form: `${a} − ${b} = {0}`, ans: [c],
      steps: [{t: 'くらいを そろえて、**一のくらい** から 計算するよ。', fig: F.cols([{s: String(a)}, {s: String(b), op: MI}, {s: hsBox(c)}], [1])}, ...H.colSub(a, b)],
      answer: `${a} − ${b} = ${c}`, afterFig: H.colDone(a, b, MI)};
  }});
U({id: 'g2-add3', g: 2, ic: '💯', t: '3けたの たし算・ひき算',
  ex: [['p', '3けたでも やりかたは 同じ。**一 → 十 → 百** の じゅんに、くり上がり・くり下がりに 気をつけて 計算します。'],
       ['eg', '254 + 368：一 4+8=12（1くり上がり）、十 5+6+1=12（1くり上がり）、百 2+3+1=6 → 622'],
       ['tip', '答えが だいたい いくつか（250 + 370 で 620くらい）を さきに 考えると、まちがいに 気づけるよ。']],
  gen(r){
    if(r.chance(0.5)){ const a = r.int(101, 898), b = r.int(101, 999 - a), c = a + b;
      return {q: 'ひっ算で 計算しよう。', form: `${a} + ${b} = {0}`, ans: [c],
        steps: [{t: 'くらいを そろえて、一のくらいから 計算するよ。', fig: F.cols([{s: String(a)}, {s: String(b), op: '+'}, {s: hsBox(c)}], [1])}, ...H.colAdd(a, b)], answer: `${a} + ${b} = ${c}`, afterFig: H.colDone(a, b, '+')}; }
    let a, b; do { a = r.int(201, 999); b = r.int(101, a - 1); } while(H.subChain(a, b));
    return {q: 'ひっ算で 計算しよう。', form: `${a} − ${b} = {0}`, ans: [a - b],
      steps: [{t: 'くらいを そろえて、一のくらいから 計算するよ。', fig: F.cols([{s: String(a)}, {s: String(b), op: MI}, {s: hsBox(a - b)}], [1])}, ...H.colSub(a, b)], answer: `${a} − ${b} = ${a - b}`, afterFig: H.colDone(a, b, MI)};
  }});
U({id: 'g2-kuku', g: 2, ic: '🍡', t: 'かけ算九九', ta: true,
  ex: [['p', '「3 × 4」は **3 が 4つ分**。3 + 3 + 3 + 3 と 同じです。'],
       ['fig', () => F.array(3, 4)],
       ['eg', '3 × 4 = 12（さんしじゅうに）'],
       ['tip', 'かける数が 1 ふえると、答えは かけられる数だけ ふえる。3 × 5 は 3 × 4 より 3 多い 15。'],
       ['tip', 'かける じゅんばんを かえても 答えは 同じ。7 × 2 は 2 × 7 と 同じ 14。']],
  gen(r){
    const a = r.int(1, 9), b = r.int(1, 9), c = a * b, list = [];
    for(let i = 1; i < b; i++) list.push(a * i);
    return {q: '九九を こたえよう。', form: `${a} × ${b} = {0}`, ans: [c],
      steps: [{t: `${a} × ${b} は「${a} が ${b}つ分」だよ。`, fig: F.array(a, b)},
              b === 1 ? `${a} が 1つ分 だから…？` : `${a} の だんは ${a} ずつ ふえる：${list.join('、')}、…`],
      answer: `${a} × ${b} = ${c}`};
  }});
U({id: 'g2-kukublank', g: 2, ic: '🔍', t: '九九の □を さがそう', ta: true,
  ex: [['p', '□に 入る 数は、**九九の だんを じゅんに 言って** さがします。'],
       ['eg', '6 × □ = 42 → 6 の だん：6、12、18、24、30、36、42 → □ は 7'],
       ['tip', '□ × 4 = 28 のように 前が □ でも、4 の だんで さがせるよ（じゅんばんを かえても 答えは 同じ）。']],
  gen(r){
    const a = r.int(2, 9), x = r.int(2, 9), c = a * x, left = r.chance(0.5), list = [];
    for(let i = 1; i <= Math.min(x - 1, 4); i++) list.push(`${a} × ${i} = ${a * i}`);
    return {q: '□に 入る 数は？', form: left ? `{0} × ${a} = ${c}` : `${a} × {0} = ${c}`, ans: [x],
      steps: [`${a} の だんの 九九で、答えが ${c} に なるのを さがそう。${left ? '（じゅんばんを かえても 答えは 同じ）' : ''}`, `${list.join('、')}、…と じゅんに 言ってみよう。`],
      mis: ([G]) => G > 0 && G !== x ? `たしかめよう：${a} × ${G} = ${a * G}。${c} に なるかな？` : '',
      answer: left ? `${x} × ${a} = ${c}` : `${a} × ${x} = ${c}`};
  }});
U({id: 'g2-time', g: 2, ic: '🕐', t: '時こくと 時間',
  ex: [['p', '**60分 で 1時間**。分を たして 60分を こえたら、1時間 くり上げます。'],
       ['fig', () => F.clock(8, 40)],
       ['eg', '8時40分 の 30分後：40 + 30 = 70分 = 1時間10分 → 9時10分'],
       ['eg', '9時20分 から 10時10分 まで：10時 まで 40分、10時 から 10分 → 50分'],
       ['tip', 'ちょうどの 時こく（10時 など）で 区切って 考えると かんたん。']],
  gen(r){
    const t = r.int(0, 2), hm = (h, m) => `${h}時${m ? m + '分' : ''}`;
    if(t === 0){
      const h = r.int(1, 10), m = r.int(1, 11) * 5, d = r.int(2, 11) * 5, s = m + d, H2 = s >= 60 ? h + 1 : h, M2 = s % 60;
      return {q: `${hm(h, m)} の ${d}分後は 何時何分？`, fig: F.clock(h, m), form: '{0}時{1}分', ans: [H2, M2],
        steps: s >= 60 ? [`${m}分 + ${d}分 = {{${s}}}分`, `60分 で 1時間。${s}分 = 1時間{{${M2}}}分`, `${h}時 の 1時間あとは {{${h + 1}}}時。`] : [`${m}分 + ${d}分 = {{${s}}}分`, `60分より 少ないので、時は ${h}時の まま。`],
        mis: ([G, M]) => s >= 60 && G === h && M === M2 ? '60分を こえたら、時を 1 ふやすよ' : s >= 60 && M === s ? `60分で 1時間。${s}分は 1時間と 何分かな？` : '',
        answer: `${hm(H2, M2)}${M2 ? '' : '（ちょうど）'}`};
    }
    if(t === 1){
      const h = r.int(2, 11), m = r.int(0, 11) * 5, d = r.int(2, 11) * 5, s = m - d, H2 = s < 0 ? h - 1 : h, M2 = (s + 60) % 60;
      return {q: `${hm(h, m)} の ${d}分前は 何時何分？`, fig: F.clock(h, m), form: '{0}時{1}分', ans: [H2, M2],
        steps: s < 0 ? [`${m}分 から ${d}分は ひけないね。`, `1時間を 60分に くずす：${hm(h, m)} = {{${h - 1}}}時{{${m + 60}}}分`, `${m + 60}分 − ${d}分 = ？`] : [`${m}分 − ${d}分 = {{${s}}}分`, `時は ${h}時の まま。`],
        mis: ([G, M]) => s < 0 && G === h && M === M2 ? '1時間 もどるので、時を 1 へらすよ' : s < 0 && M === d - m ? `${m}分 から ${d}分は ひけないよ。1時間を 60分に くずそう` : '',
        answer: `${hm(H2, M2)}${M2 ? '' : '（ちょうど）'}`};
    }
    const h1 = r.int(1, 10), m1 = r.int(0, 11) * 5, len = r.int(3, 11) * 5, e = m1 + len, h2 = e >= 60 ? h1 + 1 : h1, m2 = e % 60;
    return {q: `${hm(h1, m1)} から ${hm(h2, m2)} までは 何分？`, fig: F.clock(h1, m1) + F.clock(h2, m2), form: '{0}分', ans: [len],
      mis: ([G]) => h2 > h1 && m2 && G === (h2 * 100 + m2) - (h1 * 100 + m1) ? '1時間は 60分。100分では ないよ' : h2 > h1 && m2 && G === Math.abs(m2 - m1) ? `ちょうどの 時こく（${h2}時）で 区切って 考えよう` : '',
      steps: h2 > h1 && m2 ? [`${hm(h1, m1)} から ${h2}時 までは {{${60 - m1}}}分。`, `${h2}時 から ${hm(h2, m2)} までは {{${m2}}}分。`, `${60 - m1}分 + ${m2}分 = ？`]
           : h2 > h1 ? ['長い はりが 1まわりして、ちょうど ' + h2 + '時 に なった。', `${hm(h1, m1)} から ${h2}時 までは 60 − ${m1} = ？`]
                     : [`長い はりが ${m1}分 から ${m2}分 の ところまで 進んだ。`, `${m2} − ${m1} = ？`],
      answer: `${len}分`};
  }});
U({id: 'g2-length', g: 2, ic: '📏', t: '長さの たんい（m・cm・mm）',
  ex: [['p', '**1cm = 10mm**、**1m = 100cm**。大きい たんいを 小さい たんいに なおすときは かけ算、ぎゃくは わり算の 考えです。'],
       ['eg', '3cm5mm = 30mm + 5mm = 35mm'],
       ['eg', '160cm = 100cm + 60cm = 1m60cm'],
       ['tip', 'ものさしの 1cm の 中に 小さい 目もりが 10こ（＝10mm）あるよ。']],
  gen(r){
    const t = r.int(0, 3);
    if(t === 0){ const c = r.int(1, 15), m = r.int(1, 9);
      return {q: 'たんいを なおそう。', form: `${c}cm${m}mm = {0}mm`, ans: [c * 10 + m], steps: ['1cm = 10mm', `${c}cm = {{${c * 10}}}mm`, `${c * 10}mm と ${m}mm で？`], answer: `${c}cm${m}mm = ${c * 10 + m}mm`, mis: H.convMis(c, m, 10, 'cm', 'mm')}; }
    if(t === 1){ let n = r.int(11, 99); if(n % 10 === 0) n++;
      return {q: 'たんいを なおそう。', form: `${n}mm = {0}cm{1}mm`, ans: [Math.floor(n / 10), n % 10], steps: ['10mm で 1cm', `${n}mm は 10mm が {{${Math.floor(n / 10)}}}こ と {{${n % 10}}}mm`], answer: `${n}mm = ${Math.floor(n / 10)}cm${n % 10}mm`}; }
    if(t === 2){ const m = r.int(1, 3), c = r.int(1, 99);
      return {q: 'たんいを なおそう。', form: `${m}m${c}cm = {0}cm`, ans: [m * 100 + c], steps: ['1m = 100cm', `${m}m = {{${m * 100}}}cm`, `${m * 100}cm と ${c}cm で？`], answer: `${m}m${c}cm = ${m * 100 + c}cm`, mis: H.convMis(m, c, 100, 'm', 'cm')}; }
    let n = r.int(101, 399); if(n % 100 === 0) n += 7;
    return {q: 'たんいを なおそう。', form: `${n}cm = {0}m{1}cm`, ans: [Math.floor(n / 100), n % 100], steps: ['100cm で 1m', `${n}cm は 100cm が {{${Math.floor(n / 100)}}}こ と {{${n % 100}}}cm`], answer: `${n}cm = ${Math.floor(n / 100)}m${n % 100}cm`};
  }});

/* ════════════ 小学3年 ════════════ */
U({id: 'g3-div', g: 3, ic: '🍪', t: 'わり算（九九で わる）', ta: true,
  ex: [['p', '12 ÷ 3 は「12こを **3人で 同じ数ずつ 分けると** 1人分は いくつ」。**3 の だんの 九九** で 答えを さがします。'],
       ['eg', '12 ÷ 3：3 × □ = 12 → □ = 4。だから 12 ÷ 3 = 4'],
       ['tip', 'わり算の 答えは、かけ算で たしかめられる。4 × 3 = 12 なら 正かい！']],
  gen(r){
    const a = r.int(2, 9), q = r.int(1, 9), c = a * q;
    return {q: 'わり算を しよう。', form: `${c} ÷ ${a} = {0}`, ans: [q],
      steps: [`${c} ÷ ${a} は、${c}こを ${a}人で 同じ数ずつ 分けると 1人分は いくつ？ という 計算。`, {t: `${a} の だんの 九九で、答えが ${c} に なるのは？  ${a} × □ = ${c}`, fig: F.array(a, q)}],
      answer: `${a} × ${q} = ${c} だから、${c} ÷ ${a} = ${q}`};
  }});
U({id: 'g3-divrem', g: 3, ic: '🍬', t: 'あまりの ある わり算',
  ex: [['p', 'ぴったり 分けられない ときは、**あまり** が 出ます。あまりは いつも **わる数より 小さく** なります。'],
       ['eg', '17 ÷ 5：5 × 3 = 15、5 × 4 = 20（こえる）→ 3 あまり 2（17 − 15 = 2）'],
       ['tip', 'たしかめ：わる数 × 答え + あまり = わられる数（5 × 3 + 2 = 17）']],
  gen(r){
    const a = r.int(2, 9), q = r.int(1, 9), rem = r.int(1, a - 1), c = a * q + rem;
    return {q: 'あまりの ある わり算。', form: `${c} ÷ ${a} = {0} あまり {1}`, ans: [q, rem], check: H.remCheck(q, rem, a),
      steps: [`${a} の だんで、${c} を こえない いちばん 大きい 答えを さがそう。`, `${a} × ${q} = {{${a * q}}}、${a} × ${q + 1} = {{${a * (q + 1)}}}（${c} を こえる）`, `${c} − ${a * q} = ？ が あまり。あまりは わる数 ${a} より 小さく なるよ。`],
      mis: ([Q]) => Q === q + 1 ? `${a} × ${q + 1} = ${a * (q + 1)} は ${c} を こえるよ` : '',
      answer: `${c} ÷ ${a} = ${q} あまり ${rem}（たしかめ：${a} × ${q} + ${rem} = ${c}）`};
  }});
U({id: 'g3-mul1', g: 3, ic: '✏', t: 'かけ算の ひっ算（× 1けた）',
  ex: [['p', 'かけられる数の **一のくらいから じゅんに** かけて、くり上がりを つぎの くらいに たします。'],
       ['fig', () => F.cols([{s: '47'}, {s: '6', op: '×'}, {s: '282'}], [1], {1: '4'})],
       ['eg', '47 × 6：7 × 6 = 42（2 を かいて 4 くり上げ）、4 × 6 = 24、24 + 4 = 28 → 282'],
       ['tip', 'だいたいの 答え（50 × 6 = 300）と くらべると、けたの まちがいに 気づけるよ。']],
  gen(r){
    const a = r.chance(0.5) ? r.int(12, 99) : r.int(102, 999), b = r.int(2, 9), c = a * b;
    return {q: 'ひっ算で 計算しよう。', form: `${a} × ${b} = {0}`, ans: [c],
      steps: [{t: '一のくらいから じゅんに かけるよ。', fig: F.cols([{s: String(a)}, {s: String(b), op: '×'}, {s: hsBox(c)}], [1])}, ...H.colMul(a, b)], answer: `${a} × ${b} = ${c}`, afterFig: H.colDone(a, b, '×')};
  }});
U({id: 'g3-mul22', g: 3, ic: '🧱', t: '2けた × 2けたの かけ算',
  ex: [['p', 'かける数を **十のくらいと 一のくらいに 分けて**、それぞれ かけてから たします。'],
       ['eg', '23 × 45 = 23 × 5 + 23 × 40 = 115 + 920 = 1035'],
       ['tip', 'ひっ算では 23 × 4 = 92 を **1けた 左に ずらして** かく（本当は 920 だから）。']],
  gen(r){
    const a = r.int(12, 98); let b = r.int(12, 98); if(b % 10 === 0) b++;
    const b1 = b % 10, b10 = Math.floor(b / 10), p1 = a * b1, p2 = a * b10, c = a * b;
    return {q: '2けた × 2けたの かけ算。', form: `${a} × ${b} = {0}`, ans: [c],
      steps: [{t: `${b} を ${b10 * 10} と ${b1} に 分けて 計算するよ（ひっ算と 同じ）。`, fig: F.cols([{s: String(a)}, {s: String(b), op: '×'}, {s: hsBox(p1)}, {s: hsBox(p2) + ' '}, {s: hsBox(c)}], [1, 3])},
              `${a} × ${b1} = {{${p1}}}`, `${a} × ${b10} = {{${p2}}}（ひっ算では 1けた 左に ずらして かく。本当は ${p2 * 10}）`, `${p1} + ${p2 * 10} = ？`],
      mis: ([G]) => G === p1 + p2 ? `${b10} を かけた 答えは、1けた 左に ずらして（10倍して）たそう` : G === Math.floor(a / 10) * b10 * 100 + (a % 10) * b1 ? '十のくらいどうし・一のくらいどうしを かける だけでは たりないよ。かける数を 十と 一に 分けて かけよう' : '',
      answer: `${a} × ${b} = ${p1} + ${p2 * 10} = ${c}`, afterFig: F.cols([{s: String(a)}, {s: String(b), op: '×'}, {s: String(p1)}, {s: p2 + ' '}, {s: String(c)}], [1, 3])};
  }});
U({id: 'g3-dec', g: 3, ic: '🥛', t: '小数の たし算・ひき算',
  ex: [['p', '0.1 が いくつ分 かで 考えると、整数と 同じように 計算できます。ひっ算では **小数点を そろえます**。'],
       ['eg', '0.7 + 0.5：0.1 が 7こ と 5こ で 12こ → 1.2'],
       ['eg', '2.4 − 1.8：0.1 が 24こ − 18こ = 6こ → 0.6'],
       ['tip', '答えの 小数点を わすれずに。0.1 が 10こ で 1 だよ。']],
  gen(r){
    const plus = r.chance(0.5); let A = r.int(3, 99), B = r.int(3, 99);
    if(!plus && A < B) [A, B] = [B, A]; if(!plus && A === B) A += r.int(1, 9);
    const C = plus ? A + B : A - B, a = decStr(A, 1), b = decStr(B, 1), c = decStr(C, 1), o = H.op(plus);
    return {q: '小数の 計算を しよう。', form: `${a} ${o} ${b} = {0}`, ans: [c], kinds: ['d'],
      steps: [`0.1 が いくつ分 かで 考えよう。${a} は 0.1 が {{${A}}}こ、${b} は 0.1 が {{${B}}}こ。`, `${A} ${o} ${B} = {{${C}}} だから、0.1 が ${C}こ。`, '0.1 が 10こ で 1。0.1 が ' + C + 'こ は いくつ？'],
      answer: `${a} ${o} ${b} = ${c}`};
  }});
U({id: 'g3-frac', g: 3, ic: '🍰', t: '分数の たし算・ひき算（分母が同じ）',
  ex: [['p', '分母が 同じ 分数は、**分子どうしを 計算** します。分母は そのままです。'],
       ['fig', () => F.bar(2, 5) + F.bar(1, 5, 'f2')],
       ['eg', `${fr(2, 5)} + ${fr(1, 5)}：${fr(1, 5)} が 2こ と 1こ で 3こ → ${fr(3, 5)}`],
       ['tip', `${fr(5, 5)} や ${fr(3, 3)} のように、分母と 分子が 同じ 数は 1 だよ。`]],
  gen(r){
    const d = r.int(3, 12), plus = r.chance(0.5), o = H.op(plus); let a, b, c;
    if(plus){ a = r.int(1, d - 1); b = r.int(1, d - a); c = a + b; } else { a = r.int(2, d); b = r.int(1, a - 1); c = a - b; }
    const A = a === d ? '1' : fr(a, d), lhs = `${A} ${o} ${fr(b, d)}`;
    return {q: '分数の 計算を しよう。', form: c === d ? `${lhs} = {0}` : `${lhs} = [[{0}/${d}]]`, ans: [c === d ? 1 : c],
      steps: [{t: `${fr(1, d)} が いくつ分 かで 考えよう。`, fig: F.bar(a, d) + F.bar(b, d, 'f2')},
              a === d ? `1 は ${fr(d, d)}、つまり ${fr(1, d)} が {{${d}}}こ。${fr(b, d)} は ${fr(1, d)} が ${b}こ。` : `${fr(a, d)} は ${fr(1, d)} が {{${a}}}こ、${fr(b, d)} は ${fr(1, d)} が {{${b}}}こ。`,
              `${a} ${o} ${b} = {{${c}}} だから、${fr(1, d)} が ${c}こ。${c === d ? `（${fr(d, d)} は いくつ？）` : ''}`],
      mis: ([G]) => !plus && G === a + b ? 'たし算に なって いないかな？ − は ひき算だよ' : plus && G === Math.abs(a - b) ? 'ひき算に なって いないかな？ ＋ は たし算だよ' : '',
      answer: `${lhs} = ${c === d ? fr(d, d) + ' = 1' : fr(c, d)}`};
  }});
U({id: 'g3-unit', g: 3, ic: '⚖', t: 'たんい（km・kg・L）',
  ex: [['p', '**1km = 1000m**、**1kg = 1000g**、**1L = 10dL = 1000mL**。'],
       ['eg', '2km300m = 2000m + 300m = 2300m'],
       ['eg', '1250g = 1000g + 250g = 1kg250g'],
       ['tip', 'k（キロ）が つくと 1000倍 という いみだよ。']],
  gen(r){
    const t = r.int(0, 4);
    if(t === 0){ const k = r.int(1, 5), m = r.int(1, 999); return {q: 'たんいを なおそう。', form: `${k}km${m}m = {0}m`, ans: [k * 1000 + m], steps: ['1km = 1000m', `${k}km = {{${k * 1000}}}m`, `${k * 1000}m + ${m}m = ？`], answer: `${k}km${m}m = ${k * 1000 + m}m`, mis: H.convMis(k, m, 1000, 'km', 'm')}; }
    if(t === 1){ let n = r.int(1001, 9999); if(n % 1000 === 0) n += 25; return {q: 'たんいを なおそう。', form: `${n}m = {0}km{1}m`, ans: [Math.floor(n / 1000), n % 1000], steps: ['1000m で 1km', `${n}m は 1000m が {{${Math.floor(n / 1000)}}}こ と {{${n % 1000}}}m`], answer: `${n}m = ${Math.floor(n / 1000)}km${n % 1000}m`}; }
    if(t === 2){ const k = r.int(1, 5), g = r.int(1, 999); return {q: 'たんいを なおそう。', form: `${k}kg${g}g = {0}g`, ans: [k * 1000 + g], steps: ['1kg = 1000g', `${k}kg = {{${k * 1000}}}g`, `${k * 1000}g + ${g}g = ？`], answer: `${k}kg${g}g = ${k * 1000 + g}g`, mis: H.convMis(k, g, 1000, 'kg', 'g')}; }
    if(t === 3){ let n = r.int(1001, 5999); if(n % 1000 === 0) n += 50; return {q: 'たんいを なおそう。', form: `${n}g = {0}kg{1}g`, ans: [Math.floor(n / 1000), n % 1000], steps: ['1000g で 1kg', `${n}g は 1000g が {{${Math.floor(n / 1000)}}}こ と {{${n % 1000}}}g`], answer: `${n}g = ${Math.floor(n / 1000)}kg${n % 1000}g`}; }
    const l = r.int(1, 5), dl = r.int(1, 9); return {q: 'たんいを なおそう。', form: `${l}L${dl}dL = {0}dL`, ans: [l * 10 + dl], steps: ['1L = 10dL', `${l}L = {{${l * 10}}}dL`, `${l * 10}dL + ${dl}dL = ？`], answer: `${l}L${dl}dL = ${l * 10 + dl}dL`, mis: H.convMis(l, dl, 10, 'L', 'dL')};
  }});

/* ════════════ 小学4年 ════════════ */
U({id: 'g4-div1', g: 4, ic: '🍫', t: 'わり算の ひっ算（÷1けた）',
  ex: [['p', 'わり算の ひっ算は、上の くらいから **たてる → かける → ひく → おろす** を くりかえします。'],
       ['eg', '73 ÷ 3：7 ÷ 3 → 2 を たてる、3 × 2 = 6、7 − 6 = 1、3 を おろして 13。13 ÷ 3 → 4、3 × 4 = 12、13 − 12 = 1 → 24 あまり 1'],
       ['tip', 'さいごの あまりが わる数より 小さいか たしかめよう。']],
  gen(r){
    let d, q, rem, c; do { d = r.int(2, 9); q = r.int(12, 199); rem = r.chance(0.5) ? r.int(1, d - 1) : 0; c = q * d + rem; } while(c > 999);
    return {q: 'わり算の ひっ算。', form: rem ? `${c} ÷ ${d} = {0} あまり {1}` : `${c} ÷ ${d} = {0}`, ans: rem ? [q, rem] : [q], check: rem ? H.remCheck(q, rem, d) : null,
      steps: ['上の くらいから「たてる → かける → ひく → おろす」を くりかえすよ。', ...H.longDiv(c, d)],
      answer: `${c} ÷ ${d} = ${q}${rem ? ' あまり ' + rem : ''}`};
  }});
U({id: 'g4-div2', g: 4, ic: '🎂', t: 'わり算の ひっ算（÷2けた）',
  ex: [['p', '2けたで わるときは、**わる数を 何十と 見て** 商の 見当を つけます。大きすぎたら 1 小さく します。'],
       ['eg', '178 ÷ 23：23 を 20 と 見ると 17 ÷ 2 → 8 くらい。23 × 8 = 184（大きすぎ）→ 7。23 × 7 = 161、178 − 161 = 17 → 7 あまり 17'],
       ['tip', 'ひいた 答えが わる数より 大きかったら、商を 1 大きく しよう。']],
  gen(r){
    let d, q, rem, c; do { d = r.int(12, 49); q = r.int(2, 25); rem = r.chance(0.5) ? r.int(1, d - 1) : 0; c = q * d + rem; } while(c > 999);
    return {q: 'わり算の ひっ算。', form: rem ? `${c} ÷ ${d} = {0} あまり {1}` : `${c} ÷ ${d} = {0}`, ans: rem ? [q, rem] : [q], check: rem ? H.remCheck(q, rem, d) : null,
      steps: [`${d} を 約${Math.round(d / 10) * 10} と 見て、商の 見当を つけよう。`, ...H.longDiv(c, d)],
      answer: `${c} ÷ ${d} = ${q}${rem ? ' あまり ' + rem : ''}`};
  }});
U({id: 'g4-round', g: 4, ic: '🎯', t: 'がい数（四捨五入）',
  ex: [['p', '**四捨五入**：知りたい くらいの **1つ下の くらい** の 数字が 0〜4 なら 切り捨て、5〜9 なら 切り上げ。'],
       ['eg', '3486 を 百の位までの がい数に：1つ下の 十の位は 8 → 切り上げ → 3500'],
       ['eg', '62149 を 上から2けたの がい数に：3けため 1 → 切り捨て → 62000'],
       ['tip', '切り上げた くらいより 下は、ぜんぶ 0 に するよ。']],
  gen(r){
    const t = r.int(0, 3), NM = {10: '十', 100: '百', 1000: '千'}, LO = {10: '一', 100: '十', 1000: '百'};
    if(t < 3){
      const k = [10, 100, 1000][t], n = t === 0 ? r.int(101, 9999) : t === 1 ? r.int(1001, 99999) : r.int(10001, 999999), dg = Math.floor(n / (k / 10)) % 10, res = Math.round(n / k) * k;
      return {q: `${n} を 四捨五入して、${NM[k]}の位までの がい数に しよう。`, form: '{0}', ans: [res],
        steps: [`${NM[k]}の位までの がい数に するときは、1つ下の **${LO[k]}の位** の 数字を 見る。`, `${LO[k]}の位は {{${dg}}}。${dg >= 5 ? '5 以上なので 切り上げる' : '4 以下なので 切り捨てる'}。`, dg >= 5 ? `${NM[k]}の位を 1 ふやして、その下を 0 に しよう。` : `${NM[k]}の位は そのままで、その下を 0 に しよう。`],
        mis: ([G]) => G === n ? `がい数に しよう（${NM[k]}の位より 下を 0 に する）` : dg >= 5 && G === Math.floor(n / k) * k ? `${LO[k]}の位が 5 以上なので 切り上げるよ` : dg < 5 && G === Math.ceil(n / k) * k ? `${LO[k]}の位が 4 以下なので 切り捨てるよ`
          : k > 10 && G === Math.round(n / (k / 10)) * (k / 10) ? `${NM[k]}の位までに しよう（1つ 下の 位までに なっているよ）` : G === Math.round(n / (k * 10)) * (k * 10) ? `${NM[k]}の位までに しよう（1つ 上の 位までに なっているよ）` : '',
        answer: `${n} → ${res}`};
    }
    const n = r.int(1000, 999999), L = String(n).length, k = Math.pow(10, L - 2), dg = Math.floor(n / (k / 10)) % 10, res = Math.round(n / k) * k;
    return {q: `${n} を 四捨五入して、上から 2けたの がい数に しよう。`, form: '{0}', ans: [res],
      steps: ['上から 2けたの がい数に するときは、**上から 3けためを** 見る。', `上から 3けためは {{${dg}}}。${dg >= 5 ? '5 以上なので 切り上げる' : '4 以下なので 切り捨てる'}。`, '3けためから 下は 0 に しよう。'],
      mis: ([G]) => dg >= 5 && G === Math.floor(n / k) * k ? '上から 3けためが 5 以上なので 切り上げるよ' : dg < 5 && G === Math.ceil(n / k) * k ? '上から 3けためが 4 以下なので 切り捨てるよ' : G === Math.round(n / (k / 10)) * (k / 10) ? '上から 2けたに しよう（3けたに なっているよ）' : '',
      answer: `${n} → ${res}`};
  }});
U({id: 'g4-mixed', g: 4, ic: '🥧', t: '仮分数と 帯分数',
  ex: [['p', `**仮分数**：分子が 分母と 同じか 大きい 分数（${fr(7, 4)}）。**帯分数**：整数と 分数の 和（${mx(1, 3, 4)}）。`],
       ['eg', `${fr(7, 4)} → 7 ÷ 4 = 1 あまり 3 → ${mx(1, 3, 4)}`],
       ['eg', `${mx(2, 1, 3)} → 2 は ${fr(6, 3)}、6 + 1 = 7 → ${fr(7, 3)}`],
       ['tip', '分母は かわらないよ。']],
  gen(r){
    const d = r.int(2, 9), w = r.int(1, 5), a = r.int(1, d - 1), n = w * d + a;
    if(r.chance(0.5)) return {q: '仮分数を 帯分数に なおそう。', form: `${fr(n, d)} = [[{0}|{1}/${d}]]`, ans: [w, a],
      steps: [`${fr(d, d)} で 1。${fr(n, d)} の 中に 1 が いくつ あるかな？`, `${n} ÷ ${d} = {{${w}}} あまり {{${a}}}`, `わり算の 答え（${w}）が 整数の 部分、あまり（${a}）が 分子に なるよ。`], answer: `${fr(n, d)} = ${mx(w, a, d)}`};
    return {q: '帯分数を 仮分数に なおそう。', form: `${mx(w, a, d)} = [[{0}/${d}]]`, ans: [n],
      steps: [`${w} は [[{{${w * d}}}/${d}]]（1 = ${fr(d, d)} が ${w}こ）。`, `${fr(w * d, d)} と ${fr(a, d)} を あわせると、分子は ${w * d} + ${a}。`], answer: `${mx(w, a, d)} = ${fr(n, d)}`,
      mis: ([G]) => G === w + a ? `整数の ${w} も 分数に なおそう（1 = ${fr(d, d)}）` : G === w * a + d || G === w * d ? `分子は ${w} × ${d} + ${a} だよ` : ''};
  }});
U({id: 'g4-decmul', g: 4, ic: '🧃', t: '小数 × 整数・小数 ÷ 整数',
  ex: [['p', '小数点を ないものと 考えて **整数と 同じように 計算** し、さいごに 小数点を うちます。'],
       ['eg', '2.4 × 3：24 × 3 = 72 → 小数点より下が 1けた なので 7.2'],
       ['eg', '7.2 ÷ 3：0.1 が 72こ ÷ 3 = 24こ → 2.4'],
       ['tip', '答えの 小数点より下の さいごの 0 は 消すよ（3.50 → 3.5）。']],
  gen(r){
    if(r.chance(0.5)){
      const p = r.chance(0.6) ? 1 : 2; let A = p === 1 ? r.int(11, 99) : r.int(101, 999); if(A % 10 === 0) A++;
      const b = r.int(2, 9), C = A * b, a = decStr(A, p), c = decStr(C, p);
      return {q: '小数 × 整数', form: `${a} × ${b} = {0}`, ans: [c], kinds: ['d'],
        steps: [`小数点を ないものと 考えて、${A} × ${b} を 計算する。`, `${A} × ${b} = {{${C}}}`, `${a} は 小数点より下が ${p}けた。答えも 右から ${p}けたの ところに 小数点を うつ（${H.padDec(C, p)}）。`], answer: `${a} × ${b} = ${c}`};
    }
    const b = r.int(2, 9); let Q = r.int(11, 99); if(Q % 10 === 0) Q++;
    const A = Q * b, a = decStr(A, 1), q = decStr(Q, 1);
    return {q: '小数 ÷ 整数', form: `${a} ÷ ${b} = {0}`, ans: [q], kinds: ['d'],
      steps: [`${a} は 0.1 が {{${A}}}こ。`, `${A} ÷ ${b} = {{${Q}}}。だから 0.1 が ${Q}こ分。`], answer: `${a} ÷ ${b} = ${q}`};
  }});
U({id: 'g4-area', g: 4, ic: '🟩', t: '長方形・正方形の 面積',
  ex: [['p', '**長方形の 面積 = たて × よこ**、**正方形の 面積 = 1辺 × 1辺**。たんいは cm²（平方センチメートル）。'],
       ['fig', () => F.rect(5, 3, 'cm')],
       ['eg', 'たて 3cm、よこ 5cm → 3 × 5 = 15cm²'],
       ['tip', 'へこんだ 形は、大きな 長方形から かけた 部分を ひくか、2つの 長方形に 分けて 考えよう。']],
  gen(r){
    const t = r.int(0, 3);
    if(t === 0){ const w = r.int(3, 15), h = r.int(2, 12);
      return {q: `たて ${h}cm、よこ ${w}cm の 長方形の 面積は？`, fig: F.rect(w, h, 'cm'), form: '{0} cm²', ans: [w * h], steps: ['長方形の 面積 = たて × よこ', `${h} × ${w} = ？`], answer: `${h} × ${w} = ${w * h}（cm²）`,
        mis: ([G]) => G === 2 * (w + h) ? 'それは まわりの 長さだよ。面積は たて × よこ' : G === w + h ? '面積は たて × よこ（かけ算）だよ' : ''}; }
    if(t === 1){ const s = r.int(2, 15);
      return {q: `1辺が ${s}cm の 正方形の 面積は？`, fig: F.rect(s, s, 'cm'), form: '{0} cm²', ans: [s * s], steps: ['正方形の 面積 = 1辺 × 1辺', `${s} × ${s} = ？`], answer: `${s} × ${s} = ${s * s}（cm²）`,
        mis: ([G]) => G === 4 * s ? 'それは まわりの 長さだよ。面積は 1辺 × 1辺' : G === 2 * s ? '面積は 1辺 × 1辺（かけ算）だよ' : ''}; }
    if(t === 2){ const w = r.int(3, 12), h = r.int(2, 12), A = w * h;
      return {q: `面積が ${A}cm² で、たてが ${h}cm の 長方形。よこは 何cm？`, fig: F.rect('?', h, 'cm'), form: '{0} cm', ans: [w], steps: ['たて × よこ = 面積', `${h} × □ = ${A}`, `□ = ${A} ÷ ${h}`], answer: `${A} ÷ ${h} = ${w}（cm）`,
        mis: ([G]) => G === A * h || G === A - h ? `わり算で もとめよう（${A} ÷ ${h}）` : ''}; }
    const W = r.int(8, 14), Hh = r.int(6, 12), w = r.int(2, W - 3), h = r.int(2, Hh - 3);
    return {q: '図のような 形の 面積は？', fig: F.lshape(W, Hh, w, h, 'cm'), form: '{0} cm²', ans: [W * Hh - w * h],
      steps: ['大きな 長方形から、かけている 部分を ひいて 考えよう。', `大きな 長方形：${Hh} × ${W} = {{${W * Hh}}}`, `かけている 部分：${h} × ${w} = {{${w * h}}}`, `${W * Hh} − ${w * h} = ？`], answer: `${W * Hh} − ${w * h} = ${W * Hh - w * h}（cm²）`,
      mis: ([G]) => G === W * Hh ? 'かけている 部分を ひこう' : G === W * Hh + w * h ? 'かけている 部分は たすのでは なく ひくよ' : ''};
  }});
U({id: 'g4-angle', g: 4, ic: '📐', t: '角の 大きさ',
  ex: [['p', '**一直線の 角は 180°**、**1回転の 角は 360°**。三角じょうぎの 角は 30°・60°・90° と 45°・45°・90°。'],
       ['fig', () => F.straight(130)],
       ['eg', '一直線で 片方が 130° なら、もう片方は 180° − 130° = 50°'],
       ['tip', '分度器で はかる ときは、中心を 頂点に、0° の 線を 辺に ぴったり 合わせよう。']],
  gen(r){
    const t = r.int(0, 2);
    if(t === 0){ const a = r.int(4, 16) * 10 + r.pick([0, 0, 5]);
      return {q: '一直線の 角は 180°。図の ? の 角は 何度？', fig: F.straight(a), form: '{0}°', ans: [180 - a], steps: ['一直線の 角は 180°', `180° − ${a}° = ？`], answer: `180° − ${a}° = ${180 - a}°`,
        mis: ([G]) => G === 360 - a ? '一直線の 角は 180° だよ' : ''}; }
    if(t === 1){ const a = r.int(19, 34) * 10;
      return {q: `1回転の 角は 360°。${a}° の 角の のこりは 何度？`, form: '{0}°', ans: [360 - a], steps: ['1回転は 360°', `360° − ${a}° = ？`], answer: `360° − ${a}° = ${360 - a}°`,
        mis: ([G]) => G === 180 - a ? '1回転の 角は 360° だよ' : ''}; }
    const set = [30, 45, 60, 90], x = r.pick(set); let y = r.pick(set); while(y === x) y = r.pick(set);
    const add = r.chance(0.5), big = Math.max(x, y), small = Math.min(x, y);
    return add ? {q: `三角じょうぎの ${x}° と ${y}° の 角を あわせると 何度？`, form: '{0}°', ans: [x + y], steps: ['あわせた 角は たし算', `${x}° + ${y}° = ？`], answer: `${x}° + ${y}° = ${x + y}°`}
               : {q: `三角じょうぎの ${big}° の 角と ${small}° の 角の ちがいは 何度？`, form: '{0}°', ans: [big - small], steps: ['ちがいは ひき算', `${big}° − ${small}° = ？`], answer: `${big}° − ${small}° = ${big - small}°`};
  }});
U({id: 'g4-order', g: 4, ic: '🚦', t: '計算の じゅんじょ', ta: true,
  ex: [['p', '計算は **( ) の 中 → × と ÷ → + と −** の じゅんに します。'],
       ['eg', '3 + 4 × 5 = 3 + 20 = 23（かけ算が さき）'],
       ['eg', '(3 + 4) × 5 = 7 × 5 = 35（かっこの 中が さき）'],
       ['tip', 'さきに 計算する ところに 線を 引いておくと まちがえないよ。']],
  gen(r){
    const t = r.int(0, 5);
    if(t === 0){ const a = r.int(2, 30), b = r.int(2, 9), c = r.int(2, 9); return {q: '計算の じゅんじょに 気をつけよう。', form: `${a} + ${b} × ${c} = {0}`, ans: [a + b * c], steps: ['× は + より さきに 計算する。', `${b} × ${c} = {{${b * c}}}`, `${a} + ${b * c} = ？`], answer: `${a} + ${b * c} = ${a + b * c}`,
      mis: ([G]) => G === (a + b) * c ? '× を さきに 計算しよう（左から じゅんに では ないよ）' : ''}; }
    if(t === 1){ const c = r.int(2, 9), q = r.int(2, 9), b = c * q, a = r.int(q + 1, q + 40); return {q: '計算の じゅんじょに 気をつけよう。', form: `${a} − ${b} ÷ ${c} = {0}`, ans: [a - q], steps: ['÷ は − より さきに 計算する。', `${b} ÷ ${c} = {{${q}}}`, `${a} − ${q} = ？`], answer: `${a} − ${q} = ${a - q}`,
      mis: ([G]) => H.is(G, (a - b) / c) ? '÷ を さきに 計算しよう（左から じゅんに では ないよ）' : ''}; }
    if(t === 2){ const a = r.int(2, 20), b = r.int(2, 20), c = r.int(2, 9); return {q: '計算の じゅんじょに 気をつけよう。', form: `(${a} + ${b}) × ${c} = {0}`, ans: [(a + b) * c], steps: ['( ) の 中を さきに 計算する。', `${a} + ${b} = {{${a + b}}}`, `${a + b} × ${c} = ？`], answer: `${a + b} × ${c} = ${(a + b) * c}`,
      mis: ([G]) => G === a + b * c ? '( ) の 中を さきに 計算しよう' : ''}; }
    if(t === 3){ const a = r.int(2, 9), c = r.int(1, 20), b = r.int(c + 1, c + 20); return {q: '計算の じゅんじょに 気をつけよう。', form: `${a} × (${b} − ${c}) = {0}`, ans: [a * (b - c)], steps: ['( ) の 中を さきに 計算する。', `${b} − ${c} = {{${b - c}}}`, `${a} × ${b - c} = ？`], answer: `${a} × ${b - c} = ${a * (b - c)}`,
      mis: ([G]) => G === a * b - c ? '( ) の 中を さきに 計算しよう' : ''}; }
    if(t === 4){ const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 9), d = r.int(2, 9); return {q: '計算の じゅんじょに 気をつけよう。', form: `${a} × ${b} + ${c} × ${d} = {0}`, ans: [a * b + c * d], steps: ['× を さきに、2か所とも 計算する。', `${a} × ${b} = {{${a * b}}}、${c} × ${d} = {{${c * d}}}`, `${a * b} + ${c * d} = ？`], answer: `${a * b} + ${c * d} = ${a * b + c * d}`,
      mis: ([G]) => G === (a * b + c) * d ? '× を さきに、2か所とも 計算しよう' : ''}; }
    const c = r.int(2, 9), q = r.int(2, 9), b = r.int(2, 30), a = b + c * q; return {q: '計算の じゅんじょに 気をつけよう。', form: `(${a} − ${b}) ÷ ${c} = {0}`, ans: [q], steps: ['( ) の 中を さきに 計算する。', `${a} − ${b} = {{${a - b}}}`, `${a - b} ÷ ${c} = ？`], answer: `${a - b} ÷ ${c} = ${q}`,
      mis: ([G]) => H.is(G, a - b / c) ? '( ) の 中を さきに 計算しよう' : ''};
  }});

/* ════════════ 小学5年 ════════════ */
U({id: 'g5-decmul', g: 5, ic: '🔬', t: '小数 × 小数',
  ex: [['p', '整数と 見て かけ算を し、**かける数と かけられる数の 小数点より下の けた数の 和** だけ、右から 数えて 小数点を うちます。'],
       ['eg', '2.3 × 1.4：23 × 14 = 322、けた数は 1 + 1 = 2 → 3.22'],
       ['tip', '1 より 小さい 数を かけると、答えは もとの 数より 小さく なるよ。']],
  gen(r){
    let A = r.int(11, 99); if(A % 10 === 0) A++;
    const pb = r.chance(0.7) ? 1 : 2; let B = pb === 1 ? r.int(2, 99) : r.int(11, 99); if(B % 10 === 0) B++;
    const p = 1 + pb, C = A * B, a = decStr(A, 1), b = decStr(B, pb), c = decStr(C, p);
    return {q: '小数 × 小数', form: `${a} × ${b} = {0}`, ans: [c], kinds: ['d'],
      steps: [`小数点を ないものと 考えて ${A} × ${B} = {{${C}}}`, `小数点より下の けた数：${a} は 1けた、${b} は ${pb}けた → あわせて {{${p}}}けた`, `${C} の 右から ${p}けたの ところに 小数点を うつ（${H.padDec(C, p)}）。`],
      answer: `${a} × ${b} = ${c}`};
  }});
U({id: 'g5-decdiv', g: 5, ic: '🧪', t: '小数 ÷ 小数',
  ex: [['p', '**わる数が 整数に なるように**、わる数と わられる数の 小数点を 同じ けただけ 右に うつしてから 計算します（両方 10倍しても 答えは 同じ）。'],
       ['eg', '4.8 ÷ 1.2 → 48 ÷ 12 = 4'],
       ['eg', '1 ÷ 0.4 → 10 ÷ 4 = 2.5'],
       ['tip', '1 より 小さい 数で わると、答えは もとの 数より 大きく なるよ。']],
  gen(r){
    let B = r.int(2, 49); if(B % 10 === 0) B++;
    const b = decStr(B, 1);
    if(r.chance(0.55)){ const Q = r.int(2, 30), A = Q * B, a = decStr(A, 1);
      return {q: '小数 ÷ 小数', form: `${a} ÷ ${b} = {0}`, ans: [Q], kinds: ['d'],
        steps: [`わる数 ${b} が 整数に なるように、わる数と わられる数を **両方 10倍** する（答えは かわらない）。`, `${a} ÷ ${b} → {{${A}}} ÷ {{${B}}}`, `${A} ÷ ${B} を 計算しよう。`], answer: `${a} ÷ ${b} = ${Q}`}; }
    let Q = r.int(11, 99); if(Q % 10 === 0) Q++;
    const A = Q * B, a = decStr(A, 2), a10 = decStr(A, 1), q = decStr(Q, 1);
    return {q: '小数 ÷ 小数', form: `${a} ÷ ${b} = {0}`, ans: [q], kinds: ['d'],
      steps: [`わる数 ${b} が 整数に なるように、両方 **10倍** する。`, `${a} ÷ ${b} → {{${a10}}} ÷ {{${B}}}`, `${a10} ÷ ${B} を 計算しよう（商の 小数点は、わられる数の 小数点に そろえる）。`], answer: `${a} ÷ ${b} = ${q}`};
  }});
U({id: 'g5-gcdlcm', g: 5, ic: '🤝', t: '最大公約数・最小公倍数',
  ex: [['p', '**公約数**：どちらも わりきれる 数。いちばん 大きいのが **最大公約数**。**公倍数**：どちらの 倍数でも ある 数。いちばん 小さいのが **最小公倍数**。'],
       ['eg', '12 と 18 の 約数：12 → 1,2,3,4,6,12 ／ 18 → 1,2,3,6,9,18 → 最大公約数 6'],
       ['eg', '4 と 6 の 倍数：4 → 4,8,12 ／ 6 → 6,12 → 最小公倍数 12'],
       ['tip', '最小公倍数は「大きい ほうの 倍数を じゅんに 調べる」と はやいよ。']],
  gen(r){
    if(r.chance(0.5)){
      const g = r.int(2, 12); let m, n; do { m = r.int(1, 9); n = r.int(2, 9); } while(m === n || gcd(m, n) !== 1);
      const a = g * Math.min(m, n), b = g * Math.max(m, n);
      return {q: `${a} と ${b} の **最大公約数** は？`, form: '{0}', ans: [g],
        steps: [`${a} の 約数：${divisors(a).join('、')}`, `${b} の 約数：${divisors(b).join('、')}`, '両方に 入っている 数（公約数）の うち、いちばん 大きいのは？'], answer: `最大公約数は ${g}`,
        mis: ([G]) => G === lcm(a, b) ? 'それは 最小公倍数だよ。最大公約数は 両方を わりきれる いちばん 大きい 数' : G > 0 && a % G === 0 && b % G === 0 ? `${G} も 公約数だけど、もっと 大きい 公約数が あるよ` : G > 0 && a % G === 0 ? `${b} は ${G} で わりきれないよ` : G > 0 && b % G === 0 ? `${a} は ${G} で わりきれないよ` : ''};
    }
    let a, b; do { a = r.int(2, 15); b = r.int(2, 15); } while(a === b || lcm(a, b) > 120 || lcm(a, b) === Math.max(a, b) && r.chance(0.6));
    const L = lcm(a, b), ma = [], mb = [];
    for(let x = a; x <= L; x += a) ma.push(x); for(let x = b; x <= L; x += b) mb.push(x);
    return {q: `${a} と ${b} の **最小公倍数** は？`, form: '{0}', ans: [L],
      steps: [`${a} の 倍数：${ma.join('、')}、…`, `${b} の 倍数：${mb.join('、')}、…`, 'はじめて 同じに なる 数が 最小公倍数。'], answer: `最小公倍数は ${L}`,
      mis: ([G]) => G === gcd(a, b) && G !== L ? 'それは 最大公約数だよ。最小公倍数は 両方の 倍数に なる いちばん 小さい 数' : G > L && G % a === 0 && G % b === 0 ? `${G} も 公倍数だけど、もっと 小さい 公倍数が あるよ` : G > 0 && G % a === 0 ? `${G} は ${b} の 倍数では ないよ` : G > 0 && G % b === 0 ? `${G} は ${a} の 倍数では ないよ` : ''};
  }});
U({id: 'g5-reduce', g: 5, ic: '✂', t: '約分・通分',
  ex: [['p', '**約分**：分母と 分子を 同じ 数で わって かんたんに する。**通分**：分母を そろえる（最小公倍数に するのが ふつう）。'],
       ['eg', `${fr(12, 18)} → 6 で わって ${fr(2, 3)}`],
       ['eg', `${fr(3, 4)} と ${fr(5, 6)} → 分母を 12 に：${fr(9, 12)} と ${fr(10, 12)}`],
       ['tip', '約分は 最大公約数で わると 1回で おわるよ。']],
  gen(r){
    if(r.chance(0.55)){
      let p, q; do { q = r.int(2, 12); p = r.int(1, q - 1); } while(gcd(p, q) !== 1);
      const k = r.int(2, 9), n = p * k, d = q * k;
      return {q: '約分しよう。', form: `${fr(n, d)} = [[{0}/{1}]]`, ans: [p, q], check: H.fracCheck(p, q),
        steps: ['分母と 分子を 同じ 数で わって、かんたんな 分数に するよ。', `${n} と ${d} の 最大公約数は {{${k}}}`, `${n} ÷ ${k} と ${d} ÷ ${k} を 計算しよう。`], answer: `${fr(n, d)} = ${fr(p, q)}`,
        mis: ([x, y]) => x === p && y === d ? '分母も 同じ 数で わろう' : y === q && x === n ? '分子も 同じ 数で わろう' : ''};
    }
    let a, b, c, d; do { b = r.int(2, 10); d = r.int(2, 10); a = r.int(1, b - 1); c = r.int(1, d - 1); } while(b === d || gcd(a, b) !== 1 || gcd(c, d) !== 1 || lcm(b, d) > 60 || lcm(b, d) === Math.max(b, d) && r.chance(0.5));
    const L = lcm(b, d);
    return {q: '通分しよう（分母は できるだけ 小さく）。', form: `${fr(a, b)} と ${fr(c, d)} → [[{0}/{1}]] と [[{2}/{3}]]`, ans: [a * L / b, L, c * L / d, L],
      check: g => { const [x, y, z, w] = g; if(y !== w) return {ok: false, msg: '2つの 分母を そろえよう'}; if(x * b !== y * a || z * d !== w * c) return {ok: false}; if(y !== L) return {ok: false, near: true, msg: `あと少し！ 分母を もっと 小さく（${b} と ${d} の 最小公倍数に）できるよ`}; return {ok: true}; },
      steps: [`分母を そろえるのが 通分。分母 ${b} と ${d} の **最小公倍数** を 見つけよう：{{${L}}}`, `${fr(a, b)} は 分母・分子に {{${L / b}}} を かけて [[{{${a * L / b}}}/${L}]]`, `${fr(c, d)} も 分母を ${L} に するには、分母・分子に {{${L / d}}} を かける。`],
      answer: `${fr(a, b)} = ${fr(a * L / b, L)}、${fr(c, d)} = ${fr(c * L / d, L)}`};
  }});
U({id: 'g5-fracadd', g: 5, ic: '🍕', t: '分数の たし算・ひき算（分母が ちがう）',
  ex: [['p', '分母が ちがう ときは、**通分して 分母を そろえてから** 分子を 計算します。さいごに 約分できるか たしかめます。'],
       ['eg', `${fr(1, 2)} + ${fr(1, 3)} = ${fr(3, 6)} + ${fr(2, 6)} = ${fr(5, 6)}`],
       ['eg', `${fr(5, 6)} − ${fr(1, 2)} = ${fr(5, 6)} − ${fr(3, 6)} = ${fr(2, 6)} = ${fr(1, 3)}`],
       ['tip', '答えが 1 より 大きい ときは、仮分数の ままで いいよ。']],
  gen(r){
    let a, b, c, d, plus; do { b = r.int(2, 10); d = r.int(2, 10); a = r.int(1, b - 1); c = r.int(1, d - 1); plus = r.chance(0.55); } while(b === d || gcd(a, b) !== 1 || gcd(c, d) !== 1 || lcm(b, d) > 60 || (!plus && a * d <= c * b));
    const L = lcm(b, d), A = a * L / b, C = c * L / d, N = plus ? A + C : A - C, g = gcd(N, L), o = H.op(plus), res = H.fracAns(N, L, `${fr(a, b)} ${o} ${fr(c, d)} = `);
    return Object.assign(res, {q: '分数の 計算を しよう。', note: N > L ? '1 より 大きい ときは 仮分数で 答えてね' : '',
      steps: [`分母が ちがうので、まず **通分** する。${b} と ${d} の 最小公倍数は {{${L}}}。`, `${fr(a, b)} = [[{{${A}}}/${L}]]、${fr(c, d)} = [[{{${C}}}/${L}]]`, `${fr(A, L)} ${o} ${fr(C, L)} = [[{{${N}}}/${L}]]`, g > 1 ? `${fr(N, L)} は まだ 約分できるよ（${N} と ${L} は ${g} で われる）。` : `${fr(N, L)} は これ以上 約分できないか、たしかめよう。`],
      mis: gv => { const v = H.fv(gv), dn = plus ? b + d : b - d, nu = plus ? a + c : a - c;
        if(dn > 0 && nu > 0 && H.is(v, nu / dn) && !H.is(v, N / L)) return `分母どうしは ${plus ? 'たさない' : 'ひかない'}よ。通分して 分母を そろえてから 分子を 計算しよう`;
        if(gv.length === 2 && gv[0] === nu && gv[1] === L) return '通分する ときは、分子にも 同じ 数を かけよう';
        return ''; },
      answer: `${fr(a, b)} ${o} ${fr(c, d)} = ${fr(N, L)}${g > 1 ? ' = ' + (L / g === 1 ? N / g : fr(N / g, L / g)) : ''}`});
  }});
U({id: 'g5-percent', g: 5, ic: '📊', t: '割合と 百分率',
  ex: [['p', '**くらべる量 = もとにする量 × 割合**。割合を 100倍 したのが 百分率（%）。1% = 0.01。'],
       ['eg', '300円の 20% → 300 × 0.2 = 60円'],
       ['eg', '30 は 120 の 何%？ → 30 ÷ 120 = 0.25 → 25%'],
       ['tip', '「〜の」の 前が もとにする量（300円の 20% → 300 が もと）。']],
  gen(r){
    const t = r.int(0, 3), P = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90];
    let base, p; do { base = r.pick([200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 60, 80, 120, 240]); p = r.pick(P); } while(base * p % 100);
    const part = base * p / 100, pd = decStr(p, 2);
    if(t === 0) return {q: `${base}円の ${p}% は 何円？`, fig: F.ratioBar(base, '?', p, p + '%'), form: '{0} 円', ans: [part], steps: [`${p}% を 小数に すると {{${pd}}}（1% = 0.01）。`, 'くらべる量 = もとにする量 × 割合', `${base} × ${pd} = ？`], answer: `${base} × ${pd} = ${part}（円）`,
      mis: ([G]) => G === base * p ? '% は 小数に なおしてから かけよう（1% = 0.01）' : H.is(G, base / p) || H.is(G, base * 100 / p) ? 'くらべる量 = もとにする量 × 割合（かけ算）だよ' : G === base - part ? `それは のこりの ${100 - p}% の ぶんだよ` : ''};
    if(t === 1) return {q: `${part} は ${base} の 何%？`, fig: F.ratioBar(base, part, p, '?%'), form: '{0} %', ans: [p], steps: ['割合 = くらべる量 ÷ もとにする量', `${part} ÷ ${base} = {{${pd}}}`, `小数の 割合を 100倍 すると %：${pd} × 100 = ？`], answer: `${part} ÷ ${base} = ${pd} → ${p}%`,
      mis: ([G]) => H.is(G, p / 100) ? '割合を 100倍 すると % に なるよ' : H.is(G, base / part * 100) || H.is(G, base / part) ? '割合 = くらべる量 ÷ もとにする量（ぎゃくに わって いないかな？）' : ''};
    if(t === 2) return {q: `ある 金がくの ${p}% が ${part}円。もとの 金がくは 何円？`, fig: F.ratioBar('?', part, p, p + '%'), form: '{0} 円', ans: [base], steps: ['もとにする量 = くらべる量 ÷ 割合', `${p}% = {{${pd}}}`, `${part} ÷ ${pd} = ？`], answer: `${part} ÷ ${pd} = ${base}（円）`,
      mis: ([G]) => H.is(G, part * p / 100) ? 'もとにする量 = くらべる量 ÷ 割合（わり算）だよ' : H.is(G, part / p) ? '% を 小数に なおしてから わろう（1% = 0.01）' : ''};
    let price, q; do { price = r.pick([500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000]); q = r.pick([10, 20, 25, 30, 40, 50]); } while(price * q % 100);
    return {q: `${price}円の 品物が ${q}% 引き。売り値は 何円？`, form: '{0} 円', ans: [price * (100 - q) / 100], steps: [`${q}% 引き は、もとの ねだんの {{${100 - q}}}% に なる。`, `${100 - q}% = {{${decStr(100 - q, 2)}}}`, `${price} × ${decStr(100 - q, 2)} = ？`], answer: `${price} × ${decStr(100 - q, 2)} = ${price * (100 - q) / 100}（円）`,
      mis: ([G]) => G === price * q / 100 ? 'それは 引かれる 金がくだよ。売り値は その のこり' : G === price - q ? `% を 金がくに なおそう（${q}% 引き は もとの ${100 - q}%）` : ''};
  }});
U({id: 'g5-average', g: 5, ic: '⚖', t: '平均',
  ex: [['p', '**平均 = 合計 ÷ 個数**。でこぼこを ならして、1つ分に した 大きさです。'],
       ['eg', '6、8、7 の 平均：(6 + 8 + 7) ÷ 3 = 21 ÷ 3 = 7'],
       ['tip', '合計 = 平均 × 個数。「あと何点 とれば いい？」は 合計で 考えよう。']],
  gen(r){
    const t = r.int(0, 2);
    if(t === 0){
      let k, vals, m; do { k = r.int(3, 5); m = r.int(20, 90); vals = []; for(let i = 0; i < k - 1; i++) vals.push(m + r.int(-15, 15)); vals.push(m * k - vals.reduce((s, v) => s + v, 0)); } while(vals.some(v => v < 1 || v > 100));
      const sum = m * k;
      return {q: `${vals.join('、')} の 平均は？`, form: '{0}', ans: [m], steps: ['平均 = 合計 ÷ 個数', `合計：${vals.join(' + ')} = {{${sum}}}`, `${sum} ÷ ${k} = ？`], answer: `${sum} ÷ ${k} = ${m}`,
        mis: ([G]) => G === sum ? `合計を 個数（${k}こ）で わろう` : H.is(G, sum / (k - 1)) || H.is(G, sum / (k + 1)) ? `個数は ${k}こ だよ` : ''};
    }
    if(t === 1){ const k = r.int(3, 8), m = r.int(50, 95);
      return {q: `${k}回の テストの 平均が ${m}点。合計は 何点？`, form: '{0} 点', ans: [m * k], steps: ['合計 = 平均 × 個数', `${m} × ${k} = ？`], answer: `${m} × ${k} = ${m * k}（点）`,
        mis: ([G]) => G === m || G === m + k ? '合計 = 平均 × 個数（かけ算）だよ' : ''}; }
    let k, m1, m2, need; do { k = r.int(3, 4); m1 = r.int(60, 85); m2 = m1 + r.int(1, 4); need = m2 * (k + 1) - m1 * k; } while(need > 100);
    return {q: `${k}回の テストの 平均は ${m1}点。${k + 1}回目で 何点 とると、平均が ${m2}点に なる？`, form: '{0} 点', ans: [need],
      steps: [`${k + 1}回 ぜんぶの 合計が いくつに なれば いいか 考えよう：${m2} × ${k + 1} = {{${m2 * (k + 1)}}}`, `今までの 合計は ${m1} × ${k} = {{${m1 * k}}}`, `${m2 * (k + 1)} − ${m1 * k} = ？`], answer: `${m2 * (k + 1)} − ${m1 * k} = ${need}（点）`,
      mis: ([G]) => G === m2 || G === 2 * m2 - m1 ? '平均だけでは わからないよ。合計で 考えよう' : ''};
  }});
U({id: 'g5-areatri', g: 5, ic: '🔺', t: '三角形・平行四辺形・台形の 面積',
  ex: [['p', '**三角形 = 底辺 × 高さ ÷ 2**、**平行四辺形 = 底辺 × 高さ**、**台形 = (上底 + 下底) × 高さ ÷ 2**、**ひし形 = 対角線 × 対角線 ÷ 2**。'],
       ['fig', () => F.tri(6, 4, 'cm')],
       ['eg', '底辺 6cm、高さ 4cm の 三角形：6 × 4 ÷ 2 = 12cm²'],
       ['tip', '高さは 底辺に **すい直** な 長さ。ななめの 辺では ないよ。']],
  gen(r){
    const t = r.int(0, 4);
    if(t === 0){ let b, h; do { b = r.int(3, 16); h = r.int(2, 12); } while(b * h % 2);
      return {q: `底辺 ${b}cm、高さ ${h}cm の 三角形の 面積は？`, fig: F.tri(b, h, 'cm'), form: '{0} cm²', ans: [b * h / 2], steps: ['三角形の 面積 = 底辺 × 高さ ÷ 2', `${b} × ${h} ÷ 2 = ？`], answer: `${b} × ${h} ÷ 2 = ${b * h / 2}（cm²）`,
        mis: ([G]) => G === b * h ? '三角形は ÷ 2 を わすれずに' : G === b + h ? '底辺 × 高さ ÷ 2 だよ' : ''}; }
    if(t === 1){ const b = r.int(3, 15), h = r.int(2, 12);
      return {q: `底辺 ${b}cm、高さ ${h}cm の 平行四辺形の 面積は？`, fig: F.para(b, h, 'cm'), form: '{0} cm²', ans: [b * h], steps: ['平行四辺形の 面積 = 底辺 × 高さ', `${b} × ${h} = ？`], answer: `${b} × ${h} = ${b * h}（cm²）`,
        mis: ([G]) => H.is(G, b * h / 2) ? '平行四辺形は ÷ 2 しないよ（÷ 2 するのは 三角形）' : G === b + h ? '底辺 × 高さ だよ' : ''}; }
    if(t === 2){ let a, b, h; do { a = r.int(2, 9); b = r.int(a + 2, 15); h = r.int(2, 10); } while((a + b) * h % 2);
      return {q: `上底 ${a}cm、下底 ${b}cm、高さ ${h}cm の 台形の 面積は？`, fig: F.trap(a, b, h, 'cm'), form: '{0} cm²', ans: [(a + b) * h / 2], steps: ['台形の 面積 = (上底 + 下底) × 高さ ÷ 2', `(${a} + ${b}) × ${h} ÷ 2 で、まず ${a} + ${b} = {{${a + b}}}`, `${a + b} × ${h} ÷ 2 = ？`], answer: `(${a} + ${b}) × ${h} ÷ 2 = ${(a + b) * h / 2}（cm²）`,
        mis: ([G]) => G === (a + b) * h ? '台形は ÷ 2 を わすれずに' : H.is(G, a * b * h / 2) || G === a + b + h ? '(上底 + 下底) × 高さ ÷ 2 だよ' : ''}; }
    if(t === 3){ let a, b; do { a = r.int(4, 16); b = r.int(3, 12); } while(a * b % 2);
      return {q: `対角線が ${a}cm と ${b}cm の ひし形の 面積は？`, fig: F.rhombus(a, b, 'cm'), form: '{0} cm²', ans: [a * b / 2], steps: ['ひし形の 面積 = 対角線 × 対角線 ÷ 2', `${a} × ${b} ÷ 2 = ？`], answer: `${a} × ${b} ÷ 2 = ${a * b / 2}（cm²）`,
        mis: ([G]) => G === a * b ? 'ひし形は ÷ 2 を わすれずに' : ''}; }
    let b, h; do { b = r.int(3, 16); h = r.int(2, 12); } while(b * h % 2);
    return {q: `面積が ${b * h / 2}cm²、底辺が ${b}cm の 三角形の 高さは？`, fig: F.tri(b, '?', 'cm'), form: '{0} cm', ans: [h], steps: ['底辺 × 高さ ÷ 2 = 面積', `${b} × □ ÷ 2 = ${b * h / 2}`, `□ = ${b * h / 2} × 2 ÷ ${b}`], answer: `${b * h / 2} × 2 ÷ ${b} = ${h}（cm）`,
      mis: ([G]) => H.is(G, h / 2) ? '× 2 を わすれずに（三角形は ÷ 2 して いるから）' : ''};
  }});
U({id: 'g5-volume', g: 5, ic: '🧊', t: '体積',
  ex: [['p', '**直方体の 体積 = たて × よこ × 高さ**、**立方体 = 1辺 × 1辺 × 1辺**。たんいは cm³。'],
       ['fig', () => F.cuboid(5, 3, 4, 'cm')],
       ['eg', 'たて 3cm、よこ 5cm、高さ 4cm → 3 × 5 × 4 = 60cm³'],
       ['tip', '1L = 1000cm³（たて・よこ・高さ 10cm の 立方体）。']],
  gen(r){
    const t = r.int(0, 3);
    if(t === 0){ const a = r.int(2, 12), b = r.int(2, 10), c = r.int(2, 10);
      return {q: `たて ${b}cm、よこ ${a}cm、高さ ${c}cm の 直方体の 体積は？`, fig: F.cuboid(a, b, c, 'cm'), form: '{0} cm³', ans: [a * b * c], steps: ['直方体の 体積 = たて × よこ × 高さ', `${b} × ${a} × ${c} = {{${a * b}}} × ${c}`], answer: `${b} × ${a} × ${c} = ${a * b * c}（cm³）`,
        mis: ([G]) => G === a + b + c ? '体積は たて × よこ × 高さ（かけ算）だよ' : G === a * b || G === b * c || G === a * c ? '3つとも かけよう（たて × よこ × 高さ）' : G === 2 * (a * b + b * c + a * c) ? 'それは 表面積。体積は たて × よこ × 高さ' : ''}; }
    if(t === 1){ const s = r.int(2, 10);
      return {q: `1辺が ${s}cm の 立方体の 体積は？`, fig: F.cuboid(s, s, s, 'cm'), form: '{0} cm³', ans: [s * s * s], steps: ['立方体の 体積 = 1辺 × 1辺 × 1辺', `${s} × ${s} × ${s} = {{${s * s}}} × ${s}`], answer: `${s} × ${s} × ${s} = ${s * s * s}（cm³）`,
        mis: ([G]) => G === 3 * s ? '体積は かけ算だよ（1辺 × 1辺 × 1辺）' : G === s * s ? 'もう 1回 かけよう（1辺 × 1辺 × 1辺）' : G === 6 * s * s ? 'それは 表面積。体積は 1辺 × 1辺 × 1辺' : ''}; }
    if(t === 2){ const a = r.int(2, 12), b = r.int(2, 10), c = r.int(2, 10), V = a * b * c;
      return {q: `体積が ${V}cm³ で、たて ${b}cm、よこ ${a}cm の 直方体。高さは 何cm？`, fig: F.cuboid(a, b, '?', 'cm'), form: '{0} cm', ans: [c], steps: ['たて × よこ × 高さ = 体積', `${b} × ${a} × □ = ${V} → {{${a * b}}} × □ = ${V}`, `□ = ${V} ÷ ${a * b}`], answer: `${V} ÷ ${a * b} = ${c}（cm）`,
        mis: ([G]) => G === V - a * b || G === V - a - b ? `わり算で もとめよう（${V} ÷ ${a * b}）` : ''}; }
    let a, b, c; do { a = r.pick([10, 20, 25, 40, 50]); b = r.pick([10, 20, 25, 40, 50]); c = r.pick([5, 10, 20, 25, 40]); } while(a * b * c % 1000 || a * b * c > 60000);
    const V = a * b * c;
    return {q: `内のりが たて ${b}cm、よこ ${a}cm、深さ ${c}cm の 水そうに 入る 水は 何L？`, fig: F.cuboid(a, b, c, 'cm'), form: '{0} L', ans: [V / 1000], steps: ['1L = 1000cm³', `${b} × ${a} × ${c} = {{${V}}}cm³`, `${V} ÷ 1000 = ？`], answer: `${V}cm³ = ${V / 1000}L`,
      mis: ([G]) => G === V ? '1L = 1000cm³。cm³ を L に なおそう（÷ 1000）' : H.is(G, V / 100) ? '1L は 1000cm³ だよ' : ''};
  }});
U({id: 'g5-angsum', g: 5, ic: '📐', t: '三角形・四角形の 角',
  ex: [['p', '**三角形の 3つの 角の 和は 180°**、**四角形の 4つの 角の 和は 360°**。'],
       ['fig', () => F.triAng(60, 70)],
       ['eg', '60° と 70° → のこりは 180° − 60° − 70° = 50°'],
       ['tip', '二等辺三角形は、底の 2つの 角が 同じ 大きさ。']],
  gen(r){
    const t = r.int(0, 2);
    if(t === 0){ const A = r.int(25, 85), B = r.int(20, 160 - A), C = 180 - A - B;
      return {q: '三角形の ? の 角は 何度？', fig: F.triAng(A, B), form: '{0}°', ans: [C], steps: ['三角形の 3つの 角の 和は 180°', `わかっている 2つの 角の 和：${A}° + ${B}° = {{${A + B}}}°`, `180° − ${A + B}° = ？`], answer: `180° − ${A}° − ${B}° = ${C}°`,
        mis: ([G]) => G === 360 - A - B ? '三角形の 3つの 角の 和は 180° だよ' : G === A + B ? 'のこりの 角は 180° から ひいて もとめよう' : ''}; }
    if(t === 1){ const X = r.int(2, 14) * 10, B = (180 - X) / 2;
      return {q: `二等辺三角形で、てっぺんの 角が ${X}°。底の 1つの 角は 何度？`, fig: F.triAng(B, B, '?', '?', X + '°'), form: '{0}°', ans: [B], steps: ['二等辺三角形の 底の 2つの 角は 同じ 大きさ。', `180° − ${X}° = {{${180 - X}}}°（底の 2つぶん）`, `${180 - X}° ÷ 2 = ？`], answer: `(180° − ${X}°) ÷ 2 = ${B}°`,
        mis: ([G]) => G === 180 - X ? '底の 角は 2つ あるよ。÷ 2 しよう' : G === X ? 'てっぺんの 角と 底の 角は ちがうよ' : ''}; }
    let a, b, c, d; do { a = r.int(50, 130); b = r.int(50, 130); c = r.int(50, 130); d = 360 - a - b - c; } while(d < 40 || d > 150);
    return {q: '四角形の ? の 角は 何度？', fig: F.quadAng(a, b, c), form: '{0}°', ans: [d], steps: ['四角形の 4つの 角の 和は 360°', `わかっている 3つの 角の 和：${a}° + ${b}° + ${c}° = {{${a + b + c}}}°`, `360° − ${a + b + c}° = ？`], answer: `360° − ${a}° − ${b}° − ${c}° = ${d}°`,
      mis: ([G]) => G === a + b + c ? 'のこりの 角は 360° から ひいて もとめよう' : ''};
  }});

U({id: 'g5-circum', g: 5, ic: '🛞', t: '円周の 長さ',
  ex: [['p', '円の まわりの 長さが **円周**。どんな 大きさの 円でも、**円周 ÷ 直径 = 3.14…**（これを **円周率** と いう）。'],
       ['p', '**円周 = 直径 × 3.14**'],
       ['fig', () => F.circle(5, 'd', 'cm')],
       ['eg', '直径 10cm の 円周：10 × 3.14 = 31.4cm'],
       ['eg', '円周 25.12cm の 円の 直径：25.12 ÷ 3.14 = 8cm'],
       ['tip', '半径が わかっている ときは、まず 直径（半径 × 2）に しよう。']],
  gen(r){
    const t = r.int(0, 2), R0 = r.int(1, 10);
    if(t === 0){ const d = r.int(2, 20);
      return {q: `直径 ${d}cm の 円の 円周は？`, fig: F.circle(d / 2, 'd', 'cm'), form: '{0} cm', ans: [decStr(d * 314, 2)], kinds: ['d'], steps: ['円周 = 直径 × 3.14', `${d} × 3.14 = ？`], answer: `${d} × 3.14 = ${decStr(d * 314, 2)}（cm）`,
        mis: ([G]) => H.is(G, d * 1.57) ? '円周は 直径 × 3.14 だよ（半径では ないよ）' : H.is(G, d * d * 0.785) || H.is(G, d * d * 3.14) ? 'それは 面積の 考え方。円周は 直径 × 3.14' : ''}; }
    if(t === 1) return {q: `半径 ${R0}cm の 円の 円周は？`, fig: F.circle(R0, 'r', 'cm'), form: '{0} cm', ans: [decStr(2 * R0 * 314, 2)], kinds: ['d'], steps: ['円周 = 直径 × 3.14', `直径は 半径の 2倍：${R0} × 2 = {{${2 * R0}}}`, `${2 * R0} × 3.14 = ？`], answer: `${2 * R0} × 3.14 = ${decStr(2 * R0 * 314, 2)}（cm）`,
      mis: ([G]) => H.is(G, R0 * 3.14) ? '円周は 直径 × 3.14。半径を 2倍して 直径に しよう' : H.is(G, R0 * R0 * 3.14) && R0 !== 2 ? 'それは 面積の 式。円周は 直径 × 3.14' : ''};
    const d = r.int(2, 12), C = decStr(d * 314, 2);
    return {q: `円周が ${C}cm の 円の 直径は？`, form: '{0} cm', ans: [d], steps: ['円周 = 直径 × 3.14 だから、直径 = 円周 ÷ 3.14', `${C} ÷ 3.14 = ？`], answer: `${C} ÷ 3.14 = ${d}（cm）`,
      mis: ([G]) => H.is(G, d * 3.14 * 3.14) ? '直径 = 円周 ÷ 3.14（わり算）だよ' : H.is(G, d / 2) ? 'それは 半径。直径を 答えよう' : ''};
  }});
U({id: 'g5-fracint', g: 5, ic: '🧁', t: '分数 × 整数・分数 ÷ 整数',
  ex: [['p', '**分数 × 整数** は、分子に 整数を かける。**分数 ÷ 整数** は、分母に 整数を かける。'],
       ['eg', `${fr(2, 7)} × 3 = ${fr('2 × 3', 7)} = ${fr(6, 7)}`],
       ['eg', `${fr(4, 5)} ÷ 3 = ${fr(4, '5 × 3')} = ${fr(4, 15)}`],
       ['tip', '答えが 約分できる ときは 約分しよう。']],
  gen(r){
    if(r.chance(0.5)){ let a, b, n; do { b = r.int(2, 12); a = r.int(1, b - 1); n = r.int(2, 9); } while(gcd(a, b) !== 1);
      const N = a * n, g = gcd(N, b), res = H.fracAns(N, b, `${fr(a, b)} × ${n} = `);
      return Object.assign(res, {q: '分数 × 整数', note: N > b && res.ans.length > 1 ? '1 より 大きい ときは 仮分数で 答えてね' : '',
        steps: ['分数 × 整数 は、分子に 整数を かける（分母は そのまま）。', `${fr(a + ' × ' + n, b)} = [[{{${N}}}/${b}]]`, g > 1 ? `${N} と ${b} は ${g} で 約分できるよ。` : '約分できるか たしかめよう。'],
        mis: gv => H.is(H.fv(gv), a / (b * n)) ? '× 整数は 分子に かけるよ（分母では ないよ）' : gv.length === 2 && gv[0] === a * n && gv[1] === b * n ? '分子と 分母の 両方に かけると、大きさが かわらないよ。分子だけに かけよう' : '',
        answer: `${fr(a, b)} × ${n} = ${fr(N, b)}${g > 1 ? ' = ' + (b / g === 1 ? N / g : fr(N / g, b / g)) : ''}`}); }
    let a, b, n; do { b = r.int(2, 9); a = r.int(1, b + 3); n = r.int(2, 6); } while(gcd(a, b) !== 1 || a === b);
    const N = a, D = b * n, g = gcd(N, D), res = H.fracAns(N, D, `${fr(a, b)} ÷ ${n} = `);
    return Object.assign(res, {q: '分数 ÷ 整数', steps: ['分数 ÷ 整数 は、分母に 整数を かける（分子は そのまま）。', `${fr(a, b + ' × ' + n)} = [[${N}/{{${D}}}]]`, g > 1 ? `${N} と ${D} は ${g} で 約分できるよ。` : '約分できるか たしかめよう。'], answer: `${fr(a, b)} ÷ ${n} = ${fr(N, D)}${g > 1 ? ' = ' + fr(N / g, D / g) : ''}`,
      mis: gv => H.is(H.fv(gv), a * n / b) ? '÷ 整数は 分母に かけるよ（分子では ないよ）' : ''});
  }});

/* ════════════ 小学6年 ════════════ */
U({id: 'g6-fracmul', g: 6, ic: '✖', t: '分数の かけ算',
  ex: [['p', '分数 × 分数は、**分子どうし・分母どうしを かけます**。とちゅうで 約分すると 計算が らく。'],
       ['eg', `${fr(2, 3)} × ${fr(3, 4)} = ${fr('2 × 3', '3 × 4')} = ${fr(6, 12)} = ${fr(1, 2)}`],
       ['eg', `3 × ${fr(2, 7)} = ${fr('3 × 2', 7)} = ${fr(6, 7)}`],
       ['tip', '整数は 分母が 1 の 分数（3 = 3/1）と 考えられるよ。']],
  gen(r){
    if(r.chance(0.3)){ let n, c, d; do { n = r.int(2, 9); d = r.int(3, 12); c = r.int(1, d - 1); } while(gcd(c, d) !== 1);
      const res = H.fracAns(n * c, d, `${n} × ${fr(c, d)} = `), g = gcd(n * c, d);
      return Object.assign(res, {q: '分数の かけ算。', note: n * c > d && res.ans.length > 1 ? '1 より 大きい ときは 仮分数で 答えてね' : '',
        steps: ['整数は 分子に かける。', `${fr(n + ' × ' + c, d)} = [[{{${n * c}}}/${d}]]`, g > 1 ? `${n * c} と ${d} は ${g} で 約分できるよ。` : '約分できるか たしかめよう。'], answer: `${n} × ${fr(c, d)} = ${fr(n * c, d)}${g > 1 ? ' = ' + (d / g === 1 ? n * c / g : fr(n * c / g, d / g)) : ''}`,
        mis: gv => H.is(H.fv(gv), c / (n * d)) ? '整数は 分子に かけるよ（分母では ないよ）' : gv.length === 2 && gv[0] === n * c && gv[1] === n * d ? '分子と 分母の 両方に かけると、大きさが かわらないよ' : ''}); }
    let a, b, c, d; do { b = r.int(2, 9); d = r.int(2, 9); a = r.int(1, b + 2); c = r.int(1, d - 1); } while(gcd(a, b) !== 1 || gcd(c, d) !== 1 || a === b);
    const N = a * c, D = b * d, g = gcd(N, D), res = H.fracAns(N, D, `${fr(a, b)} × ${fr(c, d)} = `);
    return Object.assign(res, {q: '分数の かけ算。', note: N > D && res.ans.length > 1 ? '1 より 大きい ときは 仮分数で 答えてね' : '',
      steps: ['分子どうし、分母どうしを かける。', `${fr(a + ' × ' + c, b + ' × ' + d)} = [[{{${N}}}/{{${D}}}]]`, g > 1 ? `とちゅうで 約分しよう（${N} と ${D} は ${g} で われる）。` : '約分できるか たしかめよう。'],
      mis: gv => { const v = H.fv(gv); return H.is(v, (a * d) / (b * c)) && !H.is(v, N / D) ? 'かけ算は 分子どうし・分母どうしを かけるよ（逆数に するのは わり算の とき）' : H.is(v, (a * d + b * c) / (b * d)) ? 'たし算に なって いないかな？ × は 分子どうし・分母どうしを かける' : ''; },
      answer: `${fr(a, b)} × ${fr(c, d)} = ${fr(N, D)}${g > 1 ? ' = ' + (D / g === 1 ? N / g : fr(N / g, D / g)) : ''}`});
  }});
U({id: 'g6-fracdiv', g: 6, ic: '🔄', t: '分数の わり算',
  ex: [['p', '分数で わるときは、**わる数の 逆数（分母と 分子を 入れかえた 数）を かけます**。'],
       ['eg', `${fr(2, 3)} ÷ ${fr(4, 5)} = ${fr(2, 3)} × ${fr(5, 4)} = ${fr(10, 12)} = ${fr(5, 6)}`],
       ['eg', `3 ÷ ${fr(2, 5)} = 3 × ${fr(5, 2)} = ${fr(15, 2)}`],
       ['tip', '整数を 分数で わるときも 同じ。整数は 分母が 1 の 分数（3 = 3/1）。']],
  gen(r){
    if(r.chance(0.3)){ let n, c, d; do { n = r.int(2, 9); d = r.int(2, 9); c = r.int(1, d + 3); } while(gcd(c, d) !== 1 || c === d);
      const N = n * d, D = c, g = gcd(N, D), res = H.fracAns(N, D, `${n} ÷ ${fr(c, d)} = `);
      return Object.assign(res, {q: '分数の わり算。', note: N > D && res.ans.length > 1 ? '1 より 大きい ときは 仮分数で 答えてね' : '',
        steps: ['わる数の **逆数を かける**。', `${fr(c, d)} の 逆数は [[{{${d}}}/{{${c}}}]]`, `${n} × ${fr(d, c)} = ${fr(n + ' × ' + d, c)} = [[{{${n * d}}}/${c}]]`, g > 1 ? `約分を わすれずに（${N} と ${D} は ${g} で われる）。` : '約分できるか たしかめよう。'],
        mis: gv => H.is(H.fv(gv), n * c / d) ? `わる数を 逆数に して かけよう（${fr(c, d)} の 逆数は？）` : H.is(H.fv(gv), c / (n * d)) ? 'わられる数と わる数が ぎゃくに なって いないかな？' : '',
        answer: `${n} × ${fr(d, c)} = ${fr(N, D)}${g > 1 ? ' = ' + (D / g === 1 ? N / g : fr(N / g, D / g)) : ''}`}); }
    let a, b, c, d; do { b = r.int(2, 9); d = r.int(2, 9); a = r.int(1, b + 2); c = r.int(1, d + 2); } while(gcd(a, b) !== 1 || gcd(c, d) !== 1 || a === b || c === d);
    const N = a * d, D = b * c, g = gcd(N, D), res = H.fracAns(N, D, `${fr(a, b)} ÷ ${fr(c, d)} = `);
    return Object.assign(res, {q: '分数の わり算。', note: N > D && res.ans.length > 1 ? '1 より 大きい ときは 仮分数で 答えてね' : '',
      steps: ['わる数の **逆数を かける**。', `${fr(c, d)} の 逆数は [[{{${d}}}/{{${c}}}]]`, `${fr(a, b)} × ${fr(d, c)} = ${fr(a + ' × ' + d, b + ' × ' + c)} = [[{{${N}}}/{{${D}}}]]`, g > 1 ? `約分を わすれずに（${N} と ${D} は ${g} で われる）。` : '約分できるか たしかめよう。'],
      mis: gv => { const v = H.fv(gv); return H.is(v, (a * c) / (b * d)) ? 'わる数を 逆数に してから かけよう' : H.is(v, (b * c) / (a * d)) ? '逆数に するのは わる数（÷ の うしろ）だけだよ' : ''; },
      answer: `${fr(a, b)} × ${fr(d, c)} = ${fr(N, D)}${g > 1 ? ' = ' + (D / g === 1 ? N / g : fr(N / g, D / g)) : ''}`});
  }});
U({id: 'g6-ratio', g: 6, ic: '🍹', t: '比',
  ex: [['p', '**a : b** は a と b の 割合を 表す。前と 後ろに **同じ 数を かけても わっても** 等しい 比に なります。'],
       ['eg', '12 : 18 = 2 : 3（どちらも 6 で わる）'],
       ['eg', '3 : 5 = 12 : x → 3 を 4倍して 12、5 も 4倍で x = 20'],
       ['tip', '全体を 比で 分ける ときは、全体を「比の 和」こに 分けて 考えよう。']],
  gen(r){
    const t = r.int(0, 3); let p, q; do { p = r.int(1, 9); q = r.int(1, 9); } while(p === q || gcd(p, q) !== 1);
    if(t === 0){ const k = r.int(2, 12), a = p * k, b = q * k;
      return {q: 'いちばん かんたんな 整数の 比に しよう。', form: `${a} : ${b} = {0} : {1}`, ans: [p, q], check: H.ratioCheck(p, q), steps: ['前と 後ろを 同じ 数で わって、かんたんな 比に する。', `${a} と ${b} の 最大公約数は {{${k}}}`, `${a} ÷ ${k} と ${b} ÷ ${k} を 計算しよう。`], answer: `${a} : ${b} = ${p} : ${q}`,
        mis: ([x, y]) => x === p && y === b ? '後ろも 同じ 数で わろう' : y === q && x === a ? '前も 同じ 数で わろう' : ''}; }
    if(t === 1){ const k = r.int(2, 9), right = r.chance(0.5);
      return right ? {q: 'x に あてはまる 数は？', form: `${p} : ${q} = ${p * k} : {0}`, ans: [q * k], steps: [`${p} が ${p * k} に なったのは 何倍？ → {{${k}}}倍`, `後ろの ${q} も ${k}倍 する。`], answer: `${q} × ${k} = ${q * k}`,
                      mis: ([G]) => G === q + (p * k - p) ? '比は たし算では なく、何倍か で 考えよう' : ''}
                   : {q: 'x に あてはまる 数は？', form: `${p} : ${q} = {0} : ${q * k}`, ans: [p * k], steps: [`${q} が ${q * k} に なったのは 何倍？ → {{${k}}}倍`, `前の ${p} も ${k}倍 する。`], answer: `${p} × ${k} = ${p * k}`,
                      mis: ([G]) => G === p + (q * k - q) ? '比は たし算では なく、何倍か で 考えよう' : ''}; }
    if(t === 2){ const u = r.int(2, 15), T = (p + q) * u, big = Math.max(p, q);
      return {q: `${T}こを ${p} : ${q} に 分けると、多い ほうは 何こ？`, form: '{0} こ', ans: [big * u], steps: [`全体を ${p} + ${q} = {{${p + q}}} つ分と 考える。`, `1つ分は ${T} ÷ ${p + q} = {{${u}}}`, `多い ほうは ${big}つ分 → ${u} × ${big} = ？`], answer: `${u} × ${big} = ${big * u}（こ）`,
        mis: ([G]) => G === Math.min(p, q) * u ? 'それは 少ない ほうだよ。多い ほうを 答えよう' : G === u ? `それは 1つ分。多い ほうは ${big}つ分` : ''}; }
    const k = r.int(1, 6), a = p * k, b = q * k, res = H.fracAns(p, q, `${a} : ${b} の 比の値は `);
    return Object.assign(res, {q: '比の値を 求めよう。', steps: ['a : b の 比の値は a ÷ b', `${a} ÷ ${b} = ${fr(a, b)}`, '約分できるか たしかめよう。'], answer: `${a} ÷ ${b} = ${q === 1 ? p : fr(p, q)}`,
      mis: gv => H.is(H.fv(gv), q / p) ? '比の値は 前 ÷ 後ろ だよ（ぎゃくに なって いないかな？）' : ''});
  }});
U({id: 'g5-speed', g: 5, ic: '🚗', t: '速さ',
  ex: [['p', '**道のり = 速さ × 時間**、**速さ = 道のり ÷ 時間**、**時間 = 道のり ÷ 速さ**。'],
       ['eg', '時速 40km で 3時間 → 40 × 3 = 120km'],
       ['eg', '時速 60km は 分速 1km（1000m）。時速 → 分速 は ÷ 60'],
       ['tip', '「は・じ・き」：は（速さ）× じ（時間）= き（きょり）。たんいを そろえて 計算しよう。']],
  gen(r){
    const t = r.int(0, 3), v = r.pick([4, 5, 30, 40, 45, 50, 60, 70, 80]), h = r.int(2, 5), d = v * h;
    if(t === 0) return {q: `時速 ${v}km で ${h}時間 進むと、道のりは 何km？`, form: '{0} km', ans: [d], steps: ['道のり = 速さ × 時間', `${v} × ${h} = ？`], answer: `${v} × ${h} = ${d}（km）`,
      mis: ([G]) => H.is(G, v / h) || H.is(G, h / v) || G === v + h ? '道のり = 速さ × 時間（かけ算）だよ' : ''};
    if(t === 1) return {q: `${d}km を ${h}時間で 進んだ。時速 何km？`, form: '時速 {0} km', ans: [v], steps: ['速さ = 道のり ÷ 時間', `${d} ÷ ${h} = ？`], answer: `${d} ÷ ${h} = ${v} → 時速 ${v}km`,
      mis: ([G]) => G === d * h ? '速さ = 道のり ÷ 時間（わり算）だよ' : H.is(G, h / d) ? '道のり ÷ 時間 だよ（ぎゃくに わって いないかな？）' : ''};
    if(t === 2) return {q: `${d}km を 時速 ${v}km で 進むと 何時間 かかる？`, form: '{0} 時間', ans: [h], steps: ['時間 = 道のり ÷ 速さ', `${d} ÷ ${v} = ？`], answer: `${d} ÷ ${v} = ${h}（時間）`,
      mis: ([G]) => G === d * v ? '時間 = 道のり ÷ 速さ（わり算）だよ' : H.is(G, v / d) ? '道のり ÷ 速さ だよ（ぎゃくに わって いないかな？）' : ''};
    const w = r.pick([30, 36, 42, 48, 54, 60, 72, 90, 120, 150, 180]);
    return {q: `時速 ${w}km は 分速 何m？`, form: '分速 {0} m', ans: [w * 1000 / 60], steps: [`1km = 1000m なので、時速 ${w}km = 時速 {{${w * 1000}}}m`, '1時間 = 60分 なので、分速は 時速 ÷ 60', `${w * 1000} ÷ 60 = ？`], answer: `${w * 1000} ÷ 60 = ${w * 1000 / 60} → 分速 ${w * 1000 / 60}m`,
      mis: ([G]) => G === w * 1000 * 60 ? '分速は 時速 ÷ 60（1時間 = 60分）だよ' : H.is(G, w / 60) ? 'km を m に なおそう（1km = 1000m）' : G === w * 1000 ? '分速に するには ÷ 60 しよう' : ''};
  }});
U({id: 'g6-circle', g: 6, ic: '⭕', t: '円の 面積',
  ex: [['p', '**円の 面積 = 半径 × 半径 × 3.14**（円周率は 3.14 を 使う）。'],
       ['fig', () => F.circle(3, 'r', 'cm')],
       ['eg', '半径 3cm の 円：3 × 3 × 3.14 = 28.26cm²'],
       ['eg', '直径 10cm の 円：半径は 5cm → 5 × 5 × 3.14 = 78.5cm²'],
       ['tip', '直径が わかっている ときは、まず 半径（直径 ÷ 2）に しよう。']],
  gen(r){
    const t = r.int(0, 2), R0 = r.int(1, 10);
    if(t === 0) return {q: `半径 ${R0}cm の 円の 面積は？`, fig: F.circle(R0, 'r', 'cm'), form: '{0} cm²', ans: [decStr(R0 * R0 * 314, 2)], kinds: ['d'], steps: ['円の 面積 = 半径 × 半径 × 3.14', `${R0} × ${R0} = {{${R0 * R0}}}`, `${R0 * R0} × 3.14 = ？`], answer: `${R0} × ${R0} × 3.14 = ${decStr(R0 * R0 * 314, 2)}（cm²）`,
      mis: ([G]) => H.is(G, 2 * R0 * 3.14) ? 'それは 円周の 長さ。面積は 半径 × 半径 × 3.14' : H.is(G, R0 * 3.14) ? '半径 × 半径 × 3.14。半径を 2回 かけよう' : H.is(G, 4 * R0 * R0 * 3.14) ? '半径を 使おう（直径では ないよ）' : ''};
    if(t === 1) return {q: `直径 ${2 * R0}cm の 円の 面積は？`, fig: F.circle(R0, 'd', 'cm'), form: '{0} cm²', ans: [decStr(R0 * R0 * 314, 2)], kinds: ['d'], steps: ['円の 面積 = 半径 × 半径 × 3.14', `半径は 直径の 半分：${2 * R0} ÷ 2 = {{${R0}}}`, `${R0} × ${R0} × 3.14 = ？`], answer: `${R0} × ${R0} × 3.14 = ${decStr(R0 * R0 * 314, 2)}（cm²）`,
      mis: ([G]) => H.is(G, 4 * R0 * R0 * 3.14) ? '直径では なく 半径（直径 ÷ 2）を 使おう' : H.is(G, 2 * R0 * 3.14) ? 'それは 円周の 長さ。面積は 半径 × 半径 × 3.14' : ''};
    const Rr = r.int(1, 5) * 2;
    return {q: `半径 ${Rr}cm の 半円の 面積は？`, form: '{0} cm²', ans: [decStr(Rr * Rr * 157, 2)], kinds: ['d'], steps: ['半円は 円の 半分：半径 × 半径 × 3.14 ÷ 2', `${Rr} × ${Rr} × 3.14 = {{${decStr(Rr * Rr * 314, 2)}}}`, `${decStr(Rr * Rr * 314, 2)} ÷ 2 = ？`], answer: `${Rr} × ${Rr} × 3.14 ÷ 2 = ${decStr(Rr * Rr * 157, 2)}（cm²）`,
      mis: ([G]) => H.is(G, Rr * Rr * 3.14) ? '半円は 円の 半分。÷ 2 しよう' : H.is(G, Rr * Rr * 0.785) ? '半径は そのまま 使おう' : ''};
  }});
U({id: 'g6-moji', g: 6, ic: '🔤', t: '文字と 式（x を もとめる）',
  ex: [['p', 'わからない 数を **x** と おいて 式に します。x は **ぎゃくの 計算** で もとめられます。'],
       ['eg', 'x + 15 = 42 → x = 42 − 15 = 27'],
       ['eg', 'x × 4 = 36 → x = 36 ÷ 4 = 9'],
       ['tip', 'もとめた x を 式に 入れて、正しいか たしかめよう。']],
  gen(r){
    const t = r.int(0, 4), x = r.int(2, 40);
    if(t === 0){ const a = r.int(2, 60); return {q: 'x に あてはまる 数は？', form: `x + ${a} = ${x + a}　→　x = {0}`, ans: [x], steps: [`x に ${a} を たすと ${x + a}。`, `x = ${x + a} − ${a}`], answer: `x = ${x + a} − ${a} = ${x}`,
      mis: ([G]) => G === x + 2 * a ? 'ぎゃくの 計算（ひき算）で もとめよう' : ''}; }
    if(t === 1){ const a = r.int(2, 60), xx = x + a; return {q: 'x に あてはまる 数は？', form: `x − ${a} = ${x}　→　x = {0}`, ans: [xx], steps: [`x から ${a} を ひくと ${x}。`, `x = ${x} + ${a}`], answer: `x = ${x} + ${a} = ${xx}`,
      mis: ([G]) => G === Math.abs(x - a) ? 'ぎゃくの 計算（たし算）で もとめよう' : ''}; }
    if(t === 2){ const a = r.int(2, 9), xx = r.int(2, 15); return {q: 'x に あてはまる 数は？', form: `x × ${a} = ${xx * a}　→　x = {0}`, ans: [xx], steps: [`x を ${a}倍 すると ${xx * a}。`, `x = ${xx * a} ÷ ${a}`], answer: `x = ${xx * a} ÷ ${a} = ${xx}`,
      mis: ([G]) => G === xx * a * a || G === xx * a - a ? 'ぎゃくの 計算（わり算）で もとめよう' : ''}; }
    if(t === 3){ const a = r.int(2, 9), q = r.int(2, 15); return {q: 'x に あてはまる 数は？', form: `x ÷ ${a} = ${q}　→　x = {0}`, ans: [a * q], steps: [`x を ${a} で わると ${q}。`, `x = ${q} × ${a}`], answer: `x = ${q} × ${a} = ${a * q}`,
      mis: ([G]) => H.is(G, q / a) || G === q + a ? 'ぎゃくの 計算（かけ算）で もとめよう' : ''}; }
    const a = r.int(2, 9), b = r.int(1, 30), xx = r.int(2, 12), c = a * xx + b;
    return {q: 'x に あてはまる 数は？', form: `${a} × x + ${b} = ${c}　→　x = {0}`, ans: [xx], steps: [`まず ${a} × x を 1つの かたまりと 考える：${a} × x = ${c} − ${b} = {{${c - b}}}`, `x = ${c - b} ÷ ${a}`], answer: `x = ${c - b} ÷ ${a} = ${xx}`,
      mis: ([G]) => H.is(G, (c + b) / a) ? `${b} は ひこう（たすのでは ないよ）` : G === c - b ? `${a} × x = ${c - b}。まだ ${a} で わろう` : H.is(G, c / a - b) ? `さきに ${b} を ひいてから ${a} で わろう` : ''};
  }});
U({id: 'g6-cases', g: 6, ic: '🎲', t: '場合の数（並べ方・組み合わせ）',
  ex: [['p', '**並べ方**：1番目・2番目…と じゅんに 何通りか 考えて かける。**組み合わせ**：順番が ちがう だけの ものは 同じと 考える。'],
       ['eg', '3人の 並び方：3 × 2 × 1 = 6通り'],
       ['eg', '4人から 2人 選ぶ：4 × 3 = 12、AB と BA は 同じ なので ÷ 2 → 6通り'],
       ['tip', 'わからない ときは、樹形図や 表に かいて もれなく 数えよう。']],
  gen(r){
    const t = r.int(0, 4);
    if(t === 0){ const n = r.int(3, 5), seq = []; for(let i = n; i >= 1; i--) seq.push(i); const v = seq.reduce((a, b) => a * b, 1);
      return {q: `${n}人が 1れつに 並ぶ 並び方は 何通り？`, form: '{0} 通り', ans: [v], steps: [`1番目は ${n}通り、2番目は のこりの {{${n - 1}}}通り、…`, `${seq.join(' × ')} = ？`], answer: `${seq.join(' × ')} = ${v}（通り）`,
        mis: ([G]) => G === seq.reduce((a, b) => a + b, 0) ? 'たし算では なく かけ算だよ' : G === n * n || G === Math.pow(n, n) ? '1番目に 並んだ 人は、2番目には 並べないよ' : ''}; }
    if(t === 1){ const n = r.int(4, 8);
      return {q: `${n}人の 中から 2人の 当番を 選ぶ 選び方は 何通り？`, form: '{0} 通り', ans: [n * (n - 1) / 2], steps: [`まず 順番を つけて 選ぶと ${n} × ${n - 1} = {{${n * (n - 1)}}}通り`, 'でも「A と B」と「B と A」は 同じ 組なので、2 で わる。', `${n * (n - 1)} ÷ 2 = ？`], answer: `${n * (n - 1)} ÷ 2 = ${n * (n - 1) / 2}（通り）`,
        mis: ([G]) => G === n * (n - 1) ? '「A と B」と「B と A」は 同じ 組。÷ 2 しよう' : ''}; }
    if(t === 2){ const n = r.int(3, 6), cards = []; for(let i = 1; i <= n; i++) cards.push(i);
      return {q: `${cards.join('、')} の ${n}まいの カードから 2まい 並べて 2けたの 整数を つくる。何通り できる？`, form: '{0} 通り', ans: [n * (n - 1)], steps: [`十の位は ${n}通り`, `一の位は のこりの {{${n - 1}}}通り`, `${n} × ${n - 1} = ？`], answer: `${n} × ${n - 1} = ${n * (n - 1)}（通り）`,
        mis: ([G]) => G === n * n ? '同じ カードは 2回 使えないよ' : G === n * (n - 1) / 2 ? '12 と 21 は ちがう 数。÷ 2 しないよ' : ''}; }
    if(t === 3){ const n = r.int(4, 8);
      return {q: `${n}チームで 総当たり戦（どの チームとも 1回ずつ 試合）を すると、全部で 何試合？`, form: '{0} 試合', ans: [n * (n - 1) / 2], steps: [`1チームは のこりの ${n - 1}チームと 試合する → ${n} × ${n - 1} = {{${n * (n - 1)}}}`, '「A 対 B」と「B 対 A」は 同じ 試合なので 2 で わる。'], answer: `${n * (n - 1)} ÷ 2 = ${n * (n - 1) / 2}（試合）`,
        mis: ([G]) => G === n * (n - 1) ? '「A 対 B」と「B 対 A」は 同じ 試合。÷ 2 しよう' : ''}; }
    const k = r.int(2, 4), twos = Array(k).fill(2);
    return {q: `10円玉を ${k}回 投げる。表と 裏の 出方は 全部で 何通り？`, form: '{0} 通り', ans: [Math.pow(2, k)], steps: ['1回ごとに 表か 裏の 2通り。', `${twos.join(' × ')} = ？`], answer: `${twos.join(' × ')} = ${Math.pow(2, k)}（通り）`,
      mis: ([G]) => G === 2 * k ? `たし算では なく かけ算（2 を ${k}回 かける）` : ''};
  }});
})();
