/* ════════════════════════════════════════════════════════════════
   数学（中学1年〜3年）の 単元（v8〜）：素因数分解・空間図形・データの 分布・等式の 変形・平行線と 角・
   箱ひげ図・解の公式・分母の 有理化・円周角・平行線と 線分の 比。書き方は units-e.js と 同じ（g は 7〜9）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU, F = S.F, H = S.H, { gcd, MI, num, term, poly, decStr, sgnOp } = S;
const U = u => { S.UNITS.push(u); return u; };
const ab = Math.abs;
const SUP = ['', '', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const isPrime = n => { if(n < 2 || !Number.isInteger(n)) return false; for(let p = 2; p * p <= n; p++) if(n % p === 0) return false; return true; };
/* 素因数分解：{2:3, 3:2} と 「2³ × 3²」 */
const fexp = n => { const e = {}; for(let p = 2; n > 1; p++) while(n % p === 0){ e[p] = (e[p] || 0) + 1; n /= p; } return e; };
const fstr = n => { const e = fexp(n); return Object.keys(e).map(Number).map(p => p + SUP[e[p]]).join(' × '); };
/* 小さい 素数で じゅんに わる ようす：72 ÷ 2 = 36 → 36 ÷ 2 = 18 → … */
const chain = n => { const out = []; for(let p = 2; n > 1; ) if(n % p === 0){ out.push(`${n} ÷ ${p} = ${n / p}`); n /= p; } else p++; return out.join(' → '); };
const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const quart = a => { const s = a.slice().sort((x, y) => x - y), n = s.length, h = Math.floor(n / 2); return {s, min: s[0], max: s[n - 1], q1: median(s.slice(0, h)), q2: median(s), q3: median(s.slice(n % 2 ? h + 1 : h))}; };
const dstr = v => String(+v.toFixed(4));   // 0.35・22.5 など

/* ════════════ 中学1年 ════════════ */
U({id: 'j1-prime', g: 7, ic: '🧱', pos: true, t: '素因数分解',
  ex: [['p', '1 と その 数 自身の ほかに 約数が ない 自然数が **素数**（2, 3, 5, 7, 11, 13, …。1 は 素数では ない）。'],
       ['p', '自然数を 素数の かけ算で あらわす ことを **素因数分解** と いいます。小さい 素数から じゅんに わって いきます。'],
       ['eg', '72 ÷ 2 = 36 → 36 ÷ 2 = 18 → 18 ÷ 2 = 9 → 9 ÷ 3 = 3 → 72 = 2³ × 3²'],
       ['p', 'ある 数の 2乗に なる 数は、どの 素因数も **偶数こ** ずつ ふくむ。'],
       ['eg', '72 = 2³ × 3² に 2 を かけると 2⁴ × 3² = 144 = 12²'],
       ['tip', '同じ 素数の かけ算は 累乗（2 × 2 × 2 = 2³）で 書くよ。']],
  gen(r){
    const t = r.int(0, 4);
    const mk = () => { for(let k = 0; k < 200; k++){ const e = {2: r.int(0, 3), 3: r.int(0, 2), 5: r.int(0, 2), 7: r.int(0, 1)}, ps = [2, 3, 5, 7].filter(p => e[p]), n = ps.reduce((a, p) => a * p ** e[p], 1); if(ps.length >= 2 && n >= 20 && n <= 1000) return {e, ps, n}; } return {e: {2: 3, 3: 2}, ps: [2, 3], n: 72}; };
    if(t === 0){ const {e, ps, n} = mk(), j = ps.length - 1, parts = ps.map((p, i) => i === j ? '{0}' + SUP[e[p]] : p + SUP[e[p]]);
      return {q: '素因数分解しよう。□に 入る 素数は？', form: `${n} = ${parts.join(' × ')}`, ans: [ps[j]],
        steps: ['小さい 素数で じゅんに わって いこう。', chain(n)], answer: `${n} = ${fstr(n)}`,
        mis: ([G]) => G > 1 && !isPrime(G) ? `${G} は 素数では ないよ（まだ 分けられる）` : ''}; }
    if(t === 1){ const {e, n} = mk(), p = Object.keys(e).map(Number).filter(q => e[q])[0];
      return {q: `${n} を 素因数分解すると、素因数 ${p} は 何こ ふくまれる？`, form: '{0} こ', ans: [e[p]],
        steps: ['小さい 素数で じゅんに わって いこう。', chain(n), `${n} = ${fstr(n)}`], answer: `${n} = ${fstr(n)} → ${p} が ${e[p]}こ`}; }
    if(t === 2){ let e, n, k; for(let i = 0; i < 100; i++){ ({e, n} = mk()); k = Object.keys(e).map(Number).filter(p => e[p] % 2).reduce((a, p) => a * p, 1); if(k > 1 && k < n) break; }
      if(!(k > 1 && k < n)){ n = 72; e = {2: 3, 3: 2}; k = 2; }
      const div = r.chance(0.4), odd = Object.keys(e).map(Number).filter(p => e[p] % 2);
      return {q: `${n} を できるだけ 小さい 自然数で ${div ? 'わって' : 'かけて'}、ある 自然数の 2乗に したい。何で ${div ? 'われば' : 'かければ'} よい？`, form: '{0}', ans: [k],
        steps: [`${n} を 素因数分解：${fstr(n)}`, '2乗の 数は、どの 素因数も 偶数こ ずつ。', `こ数が 奇数の 素因数（${odd.join('・')}）を 1つずつ ${div ? 'へらす' : 'ふやす'}`], answer: `${odd.join(' × ')} = ${k}（${div ? `${n} ÷ ${k} = ${n / k} = ${Math.round(Math.sqrt(n / k))}²` : `${n} × ${k} = ${n * k} = ${Math.round(Math.sqrt(n * k))}²`}）`,
        mis: ([G]) => G === n ? 'できるだけ 小さい 数を さがそう（素因数分解して 考える）' : ''}; }
    if(t === 3){ let g, x, y; do { g = r.int(6, 30); x = r.int(2, 9); y = r.int(2, 9); } while(x === y || gcd(x, y) !== 1 || g * Math.max(x, y) > 300);
      const a = g * x, b = g * y, lc = r.chance(0.35) && g * x * y <= 2000;
      return {q: `素因数分解を つかって、${a} と ${b} の ${lc ? '最小公倍数' : '最大公約数'}を もとめよう。`, form: '{0}', ans: [lc ? g * x * y : g],
        steps: [`${a} = ${fstr(a)}、${b} = ${fstr(b)}`, lc ? 'どちらかに ふくまれる 素因数を、多い ほうの こ数ずつ かけ合わせる。' : '両方に 共通な 素因数を、少ない ほうの こ数ずつ かけ合わせる。'], answer: lc ? `${a} と ${b} の 最小公倍数は ${g * x * y}` : `${a} と ${b} の 最大公約数は ${g}`,
        mis: ([G]) => !lc && G === g * x * y ? 'それは 最小公倍数。最大公約数は 共通な 素因数だけ' : lc && G === g ? 'それは 最大公約数' : lc && G === a * b ? 'かけるだけでは 共通な 素因数が 2重に なるよ' : ''}; }
    const N = r.pick([10, 20, 30, 40, 50]), ps = []; for(let i = 2; i <= N; i++) if(isPrime(i)) ps.push(i);
    return {q: `1 から ${N} までの 自然数の 中に、素数は いくつ ある？`, form: '{0} こ', ans: [ps.length],
      steps: ['1 は 素数では ない。2・3・5・7 の 倍数（その 数 自身は のぞく）を 消して いこう。', `のこるのは ${ps.join('、')}`], answer: `${ps.length}こ`,
      mis: ([G]) => G === ps.length + 1 ? '1 は 素数に 入らないよ' : ''};
  }});
const POLY = [['正四面体', 4, 3, 3], ['正六面体', 6, 4, 3], ['正八面体', 8, 3, 4], ['正十二面体', 12, 5, 3], ['正二十面体', 20, 3, 5]];   // 名前・面の 数・1つの 面の 辺の 数・1つの 頂点に 集まる 面の 数
const KN = '〇一二三四五六七八九';
U({id: 'j1-solid', g: 7, ic: '🔺', pos: true, t: '空間図形（体積・表面積）',
  ex: [['p', '**角錐・円錐の 体積 = [[1/3]] × 底面積 × 高さ**。'],
       ['fig', () => F.pyramid(0, {h: '4cm', r: '3cm'})],
       ['eg', '底面の 半径 3cm、高さ 4cm の 円錐：[[1/3]] × π × 3² × 4 = 12π cm³'],
       ['p', '**球**（半径 r）：体積 [[4/3]]πr³、表面積 4πr²。'],
       ['eg', '半径 3cm の 球：体積 36π cm³、表面積 36π cm²'],
       ['tip', 'π は そのまま 残して「〇π」の 形で 答えよう。']],
  gen(r){
    const t = r.int(0, 5);
    if(t === 0){ let a, h; do { a = r.int(2, 9); h = r.int(2, 12); } while((a * a * h) % 3); const V = a * a * h / 3;
      return {q: `底面が 1辺 ${a}cm の 正方形で、高さが ${h}cm の 正四角錐の 体積は？`, fig: F.pyramid(4, {h: h + 'cm'}), form: '{0} cm³', ans: [V],
        steps: ['角錐の 体積 = [[1/3]] × 底面積 × 高さ', `底面積：${a} × ${a} = {{${a * a}}}cm²`, `[[1/3]] × ${a * a} × ${h} = ？`], answer: `[[1/3]] × ${a * a} × ${h} = ${V}（cm³）`,
        mis: ([G]) => G === a * a * h ? '錐の 体積は [[1/3]] を かけるよ' : ''}; }
    if(t === 1){ let R0, h; do { R0 = r.int(2, 9); h = r.int(2, 12); } while((R0 * R0 * h) % 3); const V = R0 * R0 * h / 3;
      return {q: `底面の 半径が ${R0}cm、高さが ${h}cm の 円錐の 体積は？`, fig: F.pyramid(0, {h: h + 'cm', r: R0 + 'cm'}), form: '{0}π cm³', ans: [V],
        steps: ['円錐の 体積 = [[1/3]] × 底面積 × 高さ', `底面積：π × ${R0}² = {{${R0 * R0}}}π cm²`, `[[1/3]] × ${R0 * R0}π × ${h} = ？`], answer: `[[1/3]] × ${R0 * R0}π × ${h} = ${V}π（cm³）`,
        mis: ([G]) => G === R0 * R0 * h ? '錐の 体積は [[1/3]] を かけるよ' : ''}; }
    if(t === 2){ const R0 = r.pick([3, 6, 9, 3, 6]), V = 4 * R0 ** 3 / 3;
      return {q: `半径 ${R0}cm の 球の 体積は？`, fig: F.sphere(R0 + 'cm'), form: '{0}π cm³', ans: [V],
        steps: ['球の 体積 = [[4/3]]πr³', `${R0}³ = {{${R0 ** 3}}}`, `[[4/3]] × ${R0 ** 3} = ？`], answer: `[[4/3]]π × ${R0}³ = ${V}π（cm³）`,
        mis: ([G]) => G === 4 * R0 * R0 ? 'それは 表面積（4πr²）。体積は [[4/3]]πr³' : ''}; }
    if(t === 3){ const R0 = r.int(1, 10);
      return {q: `半径 ${R0}cm の 球の 表面積は？`, fig: F.sphere(R0 + 'cm'), form: '{0}π cm²', ans: [4 * R0 * R0],
        steps: ['球の 表面積 = 4πr²', `4 × ${R0}² = ？`], answer: `4π × ${R0}² = ${4 * R0 * R0}π（cm²）`,
        mis: ([G]) => G === R0 * R0 ? '球の 表面積は、同じ 半径の 円の 面積の 4つ分（4πr²）' : H.is(G, 4 * R0 ** 3 / 3) ? 'それは 体積。表面積は 4πr²' : ''}; }
    if(t === 4){ const R0 = r.int(1, 6), h = r.int(2, 10), side = 2 * R0 * h, base = R0 * R0;
      return {q: `底面の 半径が ${R0}cm、高さが ${h}cm の 円柱の 表面積は？`, fig: F.prism(0, {r: R0 + 'cm', h: h + 'cm'}), form: '{0}π cm²', ans: [2 * base + side],
        steps: ['表面積 = 底面積 × 2 + 側面積', `底面積：π × ${R0}² = {{${base}}}π、側面積：高さ × 底面の 円周 = ${h} × ${2 * R0}π = {{${side}}}π`, `${base}π × 2 + ${side}π = ？`], answer: `${2 * base}π + ${side}π = ${2 * base + side}π（cm²）`,
        mis: ([G]) => G === base + side ? '底面は 2つ あるよ' : G === side ? '底面積も たそう' : ''}; }
    if(r.chance(0.5)){ const [nm, f, sd, dg] = r.pick(POLY), w = r.pick(['辺', '頂点']), v = w === '辺' ? f * sd / 2 : f * sd / dg;
      return {q: `${nm}の ${w}の 数は いくつ？`, form: '{0}', ans: [v],
        steps: [`${nm}の 面は ${sd === 4 ? '正方形' : '正' + KN[sd] + '角形'}で ${f}こ。`, w === '辺' ? `面の 辺を ぜんぶ 数えると ${sd} × ${f} = {{${sd * f}}}。1本の 辺は 2つの 面が 共有 → ÷ 2` : `面の 頂点を ぜんぶ 数えると ${sd} × ${f} = {{${sd * f}}}。1つの 頂点に ${dg}つの 面が 集まる → ÷ ${dg}`],
        answer: `${sd * f} ÷ ${w === '辺' ? 2 : dg} = ${v}`, mis: ([G]) => G === sd * f ? (w === '辺' ? '1本の 辺を 2回 数えて いるよ' : `1つの 頂点を ${dg}回 数えて いるよ`) : ''}; }
    const n = r.int(3, 8), w = r.pick(['頂点', '辺', '面']), v = {頂点: n + 1, 辺: 2 * n, 面: n + 1}[w];
    return {q: `${KN[n]}角錐の ${w}の 数は いくつ？`, fig: F.pyramid(n), form: '{0}', ans: [v],
      steps: [{頂点: `底面に ${n}こ と、上に 1こ`, 辺: `底面の 辺が ${n}本 と、上の 頂点に 集まる 辺が ${n}本`, 面: `側面が ${n}こ と、底面が 1こ`}[w]], answer: `${KN[n]}角錐の ${w}は ${v}`,
      mis: ([G]) => w === '頂点' && G === n ? '上の 頂点も 数えよう' : w === '面' && G === n ? '底面も 数えよう' : w === '辺' && G === 3 * n ? '角錐の 底面は 1つ だけ' : ''};
  }});
/* 度数分布の データ（最頻値の 階級は 1つ） */
const FREQ = [{t: 'ハンドボール投げの 記録', u: 'm', st: [10, 15], w: 5, who: '人'}, {t: '通学に かかる 時間', u: '分', st: [0, 5], w: 5, who: '人'}, {t: '身長', u: 'cm', st: [130, 135, 140], w: 5, who: '人'}, {t: '1週間の 読書時間', u: '時間', st: [0], w: 2, who: '人'}];
function freqData(r){
  for(let k0 = 0; k0 < 400; k0++){
    const th = r.pick(FREQ), k = r.int(5, 6), N = r.pick([20, 25, 40, 50]), st = r.pick(th.st), m = r.int(1, k - 2), c = []; let sum = 0;
    for(let i = 0; i < k - 1; i++){ const v = i === m ? r.int(6, 14) : r.int(1, Math.max(1, 9 - 2 * Math.abs(i - m))); c.push(v); sum += v; }
    const last = N - sum; if(last < 0 || last > 6) continue; c.push(last);
    const mx = Math.max(...c); if(c.filter(x => x === mx).length > 1) continue;
    return {th, k, N, edges: Array.from({length: k + 1}, (_, i) => st + th.w * i), c};
  }
  return {th: FREQ[0], k: 5, N: 20, edges: [10, 15, 20, 25, 30, 35], c: [2, 5, 8, 4, 1]};
}
U({id: 'j1-freq', g: 7, ic: '📶', pos: true, t: 'データの 分布（度数分布・相対度数）',
  ex: [['p', 'データを いくつかの **階級**（区間）に 分けて、それぞれの 階級に 入る 個数（**度数**）を まとめた 表が **度数分布表**。柱状グラフ（**ヒストグラム**）で あらわします。'],
       ['fig', () => F.hist([10, 15, 20, 25, 30, 35], [2, 5, 8, 4, 1], 'm', '人')],
       ['p', '**相対度数 = その 階級の 度数 ÷ 度数の 合計**。**累積度数** は、最初の 階級から その 階級までの 度数の 合計。'],
       ['eg', '上の グラフで 20m 以上 25m 未満の 相対度数：8 ÷ 20 = 0.4'],
       ['p', '度数分布表では、度数が いちばん 多い 階級の **階級値**（まん中の 値）を **最頻値** と します。**範囲** = 最大値 − 最小値。'],
       ['tip', '「以上」は その 数を ふくみ、「未満」は ふくまない。']],
  gen(r){
    const t = r.int(0, 5);
    if(t === 5){ const n = r.int(8, 10), lo = r.int(10, 40), vals = Array.from({length: n}, () => lo + r.int(0, 30)), mx = Math.max(...vals), mn = Math.min(...vals);
      return {q: `次の データの 範囲は？　${vals.join('、')}`, form: '{0}', ans: [mx - mn], steps: ['範囲 = 最大値 − 最小値', `最大値 {{${mx}}}、最小値 {{${mn}}}`], answer: `${mx} − ${mn} = ${mx - mn}`,
        mis: ([G]) => G === mx ? '範囲は 最大値 − 最小値' : ''}; }
    const D = freqData(r), u = D.th.u, who = D.th.who, E = D.edges, c = D.c, fig = F.hist(E, c, u, who), head = `「${D.th.t}」（全部で ${D.N}${who}）の ヒストグラムです。`, cls = i => `${E[i]}${u}以上 ${E[i + 1]}${u}未満`;
    if(t === 0){ const i = r.int(0, D.k - 1);
      return {q: head + `${cls(i)}の 階級の 度数は？`, fig, form: `{0} ${who}`, ans: [c[i]], steps: [`${E[i]} から ${E[i + 1]} の 間の 柱を 見よう。`, '柱の 高さが 度数。'], answer: `${c[i]}${who}`}; }
    if(t === 1){ const i = r.int(0, D.k - 1), v = dstr(c[i] / D.N);
      return {q: head + `${cls(i)}の 階級の 相対度数は？`, fig, form: '{0}', ans: [v], kinds: ['d'],
        steps: ['相対度数 = その 階級の 度数 ÷ 度数の 合計', `度数は {{${c[i]}}}、合計は ${D.N}`, `${c[i]} ÷ ${D.N} = ？`], answer: `${c[i]} ÷ ${D.N} = ${v}`,
        mis: ([G]) => G === c[i] ? '相対度数は 度数 ÷ 合計（小数に なる）' : H.is(G, D.N / c[i]) ? 'わる じゅんが ぎゃく。度数 ÷ 合計' : ''}; }
    if(t === 2){ const i = r.int(1, D.k - 2), cum = c.slice(0, i + 1).reduce((a, b) => a + b, 0);
      return {q: head + `${E[i + 1]}${u}未満の ${who}は 何${who}？`, fig, form: `{0} ${who}`, ans: [cum],
        steps: [`${E[i + 1]}${u}未満は、いちばん 左から ${cls(i)}の 階級まで。`, `${c.slice(0, i + 1).join(' + ')} = ？`], answer: `${c.slice(0, i + 1).join(' + ')} = ${cum}（${who}）`,
        mis: ([G]) => G === cum + c[i + 1] ? `「未満」は ${E[i + 1]} を ふくまないよ` : G === c[i] ? '最初の 階級から ぜんぶ たそう（累積度数）' : ''}; }
    if(t === 3){ const mx = Math.max(...c), m = c.indexOf(mx), v = dstr((E[m] + E[m + 1]) / 2);
      return {q: head + '最頻値は 何' + u + '？', fig, form: `{0} ${u}`, ans: [v], kinds: ['d'],
        steps: ['度数が いちばん 多い 階級を さがそう。', `${cls(m)}（${mx}${who}）`, `その 階級値（まん中の 値）：(${E[m]} + ${E[m + 1]}) ÷ 2 = ？`], answer: `(${E[m]} + ${E[m + 1]}) ÷ 2 = ${v}（${u}）`,
        mis: ([G]) => G === mx ? `それは 度数（${who}数）。最頻値は 階級値（${u}）` : G === E[m] || G === E[m + 1] ? '階級の まん中の 値（階級値）だよ' : ''}; }
    const i = r.int(1, D.k - 2), cnt = c.slice(i).reduce((a, b) => a + b, 0), pc = dstr(cnt / D.N * 100);
    return {q: head + `${E[i]}${u}以上の ${who}は 全体の 何%？`, fig, form: '{0} %', ans: [pc], kinds: ['d'],
      steps: [`${E[i]}${u}以上の ${who}：${c.slice(i).join(' + ')} = {{${cnt}}}${who}`, `${cnt} ÷ ${D.N} × 100 = ？`], answer: `${cnt} ÷ ${D.N} × 100 = ${pc}（%）`,
      mis: ([G]) => G === cnt ? `それは ${who}数。全体の 何% かを もとめよう` : H.is(G, cnt / D.N) ? '100 を かけて % に しよう' : ''};
  }});

/* ════════════ 中学2年 ════════════ */
U({id: 'j2-transform', g: 8, ic: '🔀', t: '等式の 変形',
  ex: [['p', '「y = 〜」の 形に する ことを **y について 解く** と いいます。方程式と 同じように **移項** と **両辺を 同じ 数で わる** を 使います。'],
       ['eg', '6x + 2y = 10 → 2y = −6x + 10 → y = −3x + 5'],
       ['eg', 'S = [[1/2]]ah を h について 解く → 2S = ah → h = [[2S/a]]'],
       ['tip', '移項すると 符号が かわる ことに 注意しよう。']],
  gen(r){
    const t = r.int(0, 2);
    if(t <= 1){ const yv = t === 0, b = r.pick([1, 2, 3, 4, 5, -1, -2, -3]), m = r.nz(-5, 5), k = r.nz(-6, 6), a = -m * b, c = k * b, v1 = yv ? 'y' : 'x', v2 = yv ? 'x' : 'y';
      const eq = `${poly(yv ? [[a, 'x'], [b, 'y']] : [[b, 'x'], [a, 'y']])} = ${num(c)}`;
      return {q: `${eq} を ${v1} について 解こう。`, form: `${v1} = {0}${v2} {1}`, ans: [H.cc(m), term(k)], kinds: ['c', 't'],
        steps: [`${poly([[a, v2]])} を 右辺に 移項：${poly([[b, v1]])} = ${poly([[-a, v2], [c, '']])}`, b === 1 ? '' : `両辺を ${num(b)} で わる`], answer: `${v1} = ${poly([[m, v2], [k, '']])}`,
        mis: ([M, K]) => b !== 1 && b !== -1 && H.is(M, -a) && H.is(K, c) ? `両辺を ${v1} の 係数 ${num(b)} で わろう` : H.is(M, -m) && H.is(K, k) ? `${v2} の 項を 移項すると 符号が かわるよ` : ''}; }
    const k = r.int(0, 5);
    if(k === 0) return {q: 'S = [[1/2]]ah を h について 解こう。', form: 'h = [[{0}S/a]]', ans: [2], steps: ['両辺に 2 を かける：2S = ah', '両辺を a で わる'], answer: 'h = [[2S/a]]', mis: ([G]) => G === 1 ? '[[1/2]] を 消す ために、両辺に 2 を かけよう' : ''};
    if(k === 1) return {q: 'V = [[1/3]]Sh を h について 解こう。', form: 'h = [[{0}V/S]]', ans: [3], steps: ['両辺に 3 を かける：3V = Sh', '両辺を S で わる'], answer: 'h = [[3V/S]]', mis: ([G]) => G === 1 ? '[[1/3]] を 消す ために、両辺に 3 を かけよう' : ''};
    if(k === 2) return {q: 'ℓ = 2πr を r について 解こう。', form: 'r = [[ℓ/{0}π]]', ans: [2], steps: ['左右を 入れかえる：2πr = ℓ', '両辺を 2π で わる'], answer: 'r = [[ℓ/2π]]'};
    if(k === 3) return {q: 'm = [[a + b/2]] を a について 解こう。', form: 'a = {0}m − b', ans: [2], steps: ['両辺に 2 を かける：2m = a + b', 'b を 移項：a = 2m − b'], answer: 'a = 2m − b', mis: ([G]) => G === 1 ? '分母の 2 を 消す ために、両辺に 2 を かけよう' : ''};
    if(k === 4) return {q: 'V = [[1/3]]πr²h を h について 解こう。', form: 'h = [[{0}V/πr²]]', ans: [3], steps: ['両辺に 3 を かける：3V = πr²h', '両辺を πr² で わる'], answer: 'h = [[3V/πr²]]'};
    const p = r.int(2, 6), q = r.nz(-9, 9);
    return {q: `y = ${p}x ${sgnOp(q).trim()} を x について 解こう。`, form: 'x = [[y {0}/{1}]]', ans: [term(-q), p], kinds: ['t', 'n'],
      steps: [`${num(q)} を 移項：${p}x = y ${sgnOp(-q).trim()}`, `両辺を ${p} で わる`], answer: `x = [[y ${sgnOp(-q).trim()}/${p}]]`,
      mis: ([Q, P]) => Q === q && P === p ? '移項すると 符号が かわるよ' : ''};
  }});
const ANG = [35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100, 105, 110, 115, 120, 125, 130, 135, 140];
U({id: 'j2-parallel', g: 8, ic: '🛤', pos: true, t: '平行線と 角（同位角・錯角・対頂角）',
  ex: [['p', '2直線が 交わって できる 向かい合った 角が **対頂角**（等しい）。'],
       ['p', '**ℓ ∥ m**（ℓ と m が 平行）の とき、**同位角**（同じ 位置の 角）と **錯角**（Z の 形の 内がわの 角）は 等しい。'],
       ['fig', () => F.par2(65, {'T-dl': '65°', 'B-ur': 'x'})],
       ['p', '平行線の 間で 折れ曲がった 線（くの字）は、折れた 点を 通る 平行線を ひくと **x = a + b**。'],
       ['fig', () => F.kink(40, 30)],
       ['tip', '一直線の 角は 180°。となりの 角から 考えても よい。']],
  gen(r){
    const t = r.int(0, 4), a = r.pick(ANG), q0 = 'ℓ ∥ m の とき、∠x の 大きさは？', val = pos => pos === 'ur' || pos === 'dl' ? a : 180 - a;
    if(t === 4){ const A = r.int(25, 65), B = r.int(20, 60);
      return {q: q0, fig: F.kink(A, B), form: '{0}°', ans: [A + B],
        steps: ['折れ曲がった 点を 通って、ℓ・m に 平行な 直線を ひこう。', `錯角で ${A}° と ${B}° が 点の ところに 移る`, `x = ${A} + ${B}`], answer: `x = ${A}° + ${B}° = ${A + B}°`,
        mis: ([G]) => G === 180 - A - B || G === ab(A - B) ? '平行線を ひいて 錯角を 移すと、x は 2つの 角の 和' : ''}; }
    const kinds = [
      ['対頂角', () => { const p = r.pick(['ur', 'ul']), o = {ur: 'dl', ul: 'dr'}[p]; return [{['T-' + p]: val(p) + '°', ['T-' + o]: 'x'}, val(o), '向かい合った 角（対頂角）は 等しい。']; }],
      ['同位角', () => { const p = r.pick(['ur', 'ul', 'dl', 'dr']); return [{['T-' + p]: val(p) + '°', ['B-' + p]: 'x'}, val(p), 'ℓ ∥ m なので 同位角は 等しい。']; }],
      ['錯角', () => { const p = r.pick(['dl', 'dr']), o = {dl: 'ur', dr: 'ul'}[p]; return [{['T-' + p]: val(p) + '°', ['B-' + o]: 'x'}, val(o), 'ℓ ∥ m なので 錯角は 等しい。']; }],
      ['一直線', () => { const p = r.pick(['ur', 'ul']), o = p === 'ur' ? 'ul' : 'ur'; return [{['T-' + p]: val(p) + '°', ['B-' + o]: 'x'}, val(o), `同位角で 下の 交わりにも ${val(p)}° が ある。`, `x と その 角を あわせて 一直線（180°）：180 − ${val(p)}`]; }],
    ][t];
    const [marks, ans, st1, st2] = kinds[1]();
    return {q: q0, fig: F.par2(a, marks), form: '{0}°', ans: [ans], steps: [st1, st2 || ''], answer: `x = ${ans}°（${kinds[0]}）`,
      mis: ([G]) => G === 180 - ans ? 'となりの 角（あわせて 180°）と まちがえて いないかな？' : ''};
  }});
U({id: 'j2-boxplot', g: 8, ic: '📦', pos: true, t: '四分位数と 箱ひげ図',
  ex: [['p', 'データを 小さい 順に 並べて 4等分する 位置の 値が **四分位数**。小さい ほうから **第1四分位数・第2四分位数（中央値）・第3四分位数**。'],
       ['eg', '1, 3, 4, 6, 7, 8, 9, 10 → 前半 1, 3, 4, 6 の 中央値 3.5 が 第1四分位数、後半 7, 8, 9, 10 の 中央値 8.5 が 第3四分位数'],
       ['p', '**四分位範囲 = 第3四分位数 − 第1四分位数**。最小値・四分位数・最大値を 図に したのが **箱ひげ図**。'],
       ['fig', () => F.boxplot({min: 2, q1: 4, q2: 6, q3: 10, max: 14}, 0, 20, 2, '点')],
       ['tip', 'データの 個数が 奇数の ときは、中央値を 前半にも 後半にも 入れずに 分けるよ。']],
  gen(r){
    const t = r.int(0, 2);
    if(t <= 1){ const n = r.int(8, 11), vals = Array.from({length: n}, () => r.int(1, 30)), Q = quart(vals), h = Math.floor(n / 2), lo = Q.s.slice(0, h), hi = Q.s.slice(n % 2 ? h + 1 : h);
      const split = `前半 ${lo.join(', ')}／後半 ${hi.join(', ')}${n % 2 ? `（まん中の ${Q.q2} は 入れない）` : ''}`;
      if(t === 0){ const w = r.pick(['q1', 'q2', 'q3']), nm = {q1: '第1四分位数', q2: '第2四分位数（中央値）', q3: '第3四分位数'}[w];
        return {q: `次の データの ${nm}は？　${vals.join('、')}`, form: '{0}', ans: [dstr(Q[w])], kinds: ['d'],
          steps: [`小さい 順に 並べると ${Q.s.join(', ')}`, w === 'q2' ? `${n}こ の まん中` : split, w === 'q2' ? '' : `${w === 'q1' ? '前半' : '後半'}の 中央値`], answer: `${nm}は ${dstr(Q[w])}`,
          mis: ([G]) => w !== 'q2' && H.is(G, Q.q2) ? 'それは 中央値（第2四分位数）' : w === 'q1' && H.is(G, Q.q3) ? 'それは 第3四分位数。第1は 前半の 中央値' : w === 'q3' && H.is(G, Q.q1) ? 'それは 第1四分位数。第3は 後半の 中央値' : ''}; }
      const iqr = dstr(Q.q3 - Q.q1);
      return {q: `次の データの 四分位範囲は？　${vals.join('、')}`, form: '{0}', ans: [iqr], kinds: ['d'],
        steps: [`小さい 順に 並べると ${Q.s.join(', ')}`, split, `第1四分位数 {{${dstr(Q.q1)}}}、第3四分位数 {{${dstr(Q.q3)}}}`, `${dstr(Q.q3)} − ${dstr(Q.q1)} = ？`], answer: `${dstr(Q.q3)} − ${dstr(Q.q1)} = ${iqr}`,
        mis: ([G]) => G === Q.max - Q.min ? 'それは 範囲（最大値 − 最小値）。四分位範囲は 第3 − 第1 四分位数' : ''}; }
    const v = distinctSorted(r, 5, 0, 10).map(x => x * 2), st = {min: v[0], q1: v[1], q2: v[2], q3: v[3], max: v[4]}, w = r.pick(['q2', 'range', 'iqr', 'q3', 'q1']);
    const ans = {q2: st.q2, range: st.max - st.min, iqr: st.q3 - st.q1, q3: st.q3, q1: st.q1}[w], nm = {q2: '中央値', range: '範囲', iqr: '四分位範囲', q3: '第3四分位数', q1: '第1四分位数'}[w];
    return {q: `テストの 点数を 箱ひげ図に あらわしました。${nm}は 何点？`, fig: F.boxplot(st, 0, 20, 2, '点'), form: '{0} 点', ans: [ans],
      steps: ['箱ひげ図：ひげの はしが 最小値・最大値、箱の 左はし・まん中の 線・右はしが 第1・第2（中央値）・第3四分位数。', w === 'range' ? `最大値 {{${st.max}}} − 最小値 {{${st.min}}}` : w === 'iqr' ? `第3四分位数 {{${st.q3}}} − 第1四分位数 {{${st.q1}}}` : `${nm}は ${{q2: '箱の 中の 線', q3: '箱の 右はし', q1: '箱の 左はし'}[w]}`], answer: `${nm}は ${ans}点`,
      mis: ([G]) => w === 'iqr' && G === st.max - st.min ? 'それは 範囲。四分位範囲は 箱の 長さ' : w === 'range' && G === st.q3 - st.q1 ? 'それは 四分位範囲。範囲は ひげの はしから はしまで' : w === 'q2' && G === (st.q1 + st.q3) / 2 && st.q2 !== G ? '中央値は 箱の 中の 線の 位置' : ''};
  }});
function distinctSorted(r, k, lo, hi){ const out = []; while(out.length < k){ const v = r.int(lo, hi); if(!out.includes(v)) out.push(v); } return out.sort((a, b) => a - b); }

/* ════════════ 中学3年 ════════════ */
const sqFree = n => { for(let k = 2; k * k <= n; k++) if(n % (k * k) === 0) return false; return n > 1; };
U({id: 'j3-formula', g: 9, ic: '🧮', t: '2次方程式（解の公式）',
  ex: [['p', '**ax² + bx + c = 0** の 解は **x = [[−b ± √[b² − 4ac]/2a]]**（解の公式）。'],
       ['eg', 'x² + 3x + 1 = 0：a = 1、b = 3、c = 1 → x = [[−3 ± √[9 − 4]/2]] = [[−3 ± √[5]/2]]'],
       ['eg', 'x² + 4x + 1 = 0 → x = [[−4 ± √[12]/2]] = [[−4 ± 2√[3]/2]] = −2 ± √[3]（約分できる ときは 約分）'],
       ['tip', 'まず √ の 中（b² − 4ac）を 計算しよう。']],
  gen(r){
    const t = r.int(0, 3);
    if(t === 2){ let h, c, D; do { h = r.nz(-5, 5); c = r.int(-9, 9); D = h * h - c; } while(D < 2 || !sqFree(D) || c === 0);
      const eq = `${poly([[1, 'x²'], [2 * h, 'x'], [c, '']])} = 0`, D4 = 4 * D;
      return {q: '解の公式で 解こう。', form: `${eq}　→　x = {0} ± √[{1}]`, ans: [-h, D], kinds: ['i', 'n'],
        steps: [`a = 1、b = ${num(2 * h)}、c = ${num(c)}`, `b² − 4ac = ${2 * h}² − 4 × 1 × ${c < 0 ? '(' + num(c) + ')' : c} = {{${D4}}}`, `x = [[${num(-2 * h)} ± √[${D4}]/2]]、√[${D4}] = 2√[${D}] → 2 で 約分`], answer: `x = ${num(-h)} ± √[${D}]`,
        mis: ([P, Q]) => P === h && Q === D ? '−b の 符号に 気をつけて' : P === -2 * h && Q === D4 ? '分母の 2 で 約分しよう' : ''}; }
    let a, b, c, D; do { a = t === 3 ? r.int(2, 3) : 1; b = r.nz(-9, 9); c = r.nz(-9, 9); D = b * b - 4 * a * c; } while(D < 2 || !sqFree(D) || (a === 1 && b % 2 === 0));
    const eq = `${poly([[a, 'x²'], [b, 'x'], [c, '']])} = 0`;
    if(t === 0) return {q: `${eq} を 解の公式で 解く とき、√ の 中（b² − 4ac）は いくつ？`, form: 'b² − 4ac = {0}', ans: [D], kinds: ['i'],
      steps: [`a = ${a}、b = ${num(b)}、c = ${num(c)}`, `${b < 0 ? '(' + num(b) + ')' : b}² − 4 × ${a} × ${c < 0 ? '(' + num(c) + ')' : c} = {{${b * b}}} ${4 * a * c < 0 ? '+' : MI} ${ab(4 * a * c)}`], answer: `b² − 4ac = ${D}`,
      mis: ([G]) => G === b * b + 4 * a * c ? '− 4ac の 符号に 気をつけて' : G === -b * b - 4 * a * c ? 'b² は いつも 0 以上' : ''};
    return {q: '解の公式で 解こう。', form: `${eq}　→　x = [[{0} ± √[{1}]/{2}]]`, ans: [-b, D, 2 * a], kinds: ['i', 'n', 'n'],
      steps: [`a = ${a}、b = ${num(b)}、c = ${num(c)}`, `b² − 4ac = ${b * b} ${4 * a * c < 0 ? '+' : MI} ${ab(4 * a * c)} = {{${D}}}`, `x = [[−b ± √[b² − 4ac]/2a]] に 入れよう`], answer: `x = [[${num(-b)} ± √[${D}]/${2 * a}]]`,
      mis: ([P, Q, R]) => P === b && Q === D ? '−b だよ（b の 符号を かえる）' : P === -b && Q === b * b + 4 * a * c ? '√ の 中は b² − 4ac' : P === -b && Q === D && R === a ? '分母は 2a' : ''};
  }});
/* a√m / d の 答えの たしかめ（約分 前・√ を 小さく する 前は「あと少し」） */
const rootCheck = (C, M, Dn) => g => {
  const [c, m, d] = g.length === 3 ? g : [g[0], g[1], 1];
  if(c === C && m === M && d === Dn) return {ok: true};
  if(c > 0 && m > 0 && d > 0 && H.is(c * Math.sqrt(m) / d, C * Math.sqrt(M) / Dn)) return {ok: false, near: true, msg: 'あと少し！ まだ かんたんに できるよ（約分・√ の 中）'};
  return {ok: false};
};
U({id: 'j3-rational', g: 9, ic: '🪄', t: '分母の 有理化・√ を ふくむ 式の 計算',
  ex: [['p', '分母に √ が ある とき、分母と 分子に 同じ √ を かけて、分母に √ が ない 形に する ことを **分母の 有理化** と いいます。'],
       ['eg', '[[3/√[2]]] = [[3 × √[2]/√[2] × √[2]]] = [[3√[2]/2]]'],
       ['eg', '[[6/√[3]]] = [[6√[3]/3]] = 2√[3]'],
       ['p', '乗法公式も 使えます：(√[a] + b)(√[a] − b) = a − b²、(√[a] + b)² = a + 2b√[a] + b²'],
       ['eg', '(√[5] + 2)(√[5] − 2) = 5 − 4 = 1'],
       ['tip', '答えの √ の 中は できるだけ 小さく、分母に √ を のこさない。']],
  gen(r){
    const t = r.int(0, 4), m = r.pick([2, 3, 5, 6, 7, 10]);
    if(t <= 1){ const a = t === 0 ? r.int(1, 12) : m * r.int(1, 5), g = gcd(a, m), C = a / g, Dn = m / g;
      if(Dn === 1) return {q: '分母を 有理化しよう。', form: `[[${a}/√[${m}]]] = {0}√[{1}]`, ans: [C, m], check: rootCheck(C, m, 1),
        steps: [`分母と 分子に √[${m}] を かける：[[${a}√[${m}]/${m}]]`, `${a} ÷ ${m} = {{${C}}} で 約分`], answer: `[[${a}/√[${m}]]] = ${C === 1 ? '' : C}√[${m}]`,
        mis: ([P, Q]) => P === a && Q === m ? `分母の ${m} で 約分しよう` : ''};
      if(C === 1) return {q: '分母を 有理化しよう。', form: `[[${a}/√[${m}]]] = [[√[{0}]/{1}]]`, ans: [m, Dn],
        steps: [`分母と 分子に √[${m}] を かける：[[${a} × √[${m}]/√[${m}] × √[${m}]]]`, `= [[${a}√[${m}]/${m}]]`, g > 1 ? `${a} と ${m} を ${g} で 約分` : ''], answer: `[[${a}/√[${m}]]] = [[√[${m}]/${Dn}]]`,
        mis: ([Q, R]) => R === m * m ? `分母は √[${m}] × √[${m}] = ${m}` : ''};
      return {q: '分母を 有理化しよう。', form: `[[${a}/√[${m}]]] = [[{0}√[{1}]/{2}]]`, ans: [C, m, Dn], check: rootCheck(C, m, Dn),
        steps: [`分母と 分子に √[${m}] を かける：[[${a} × √[${m}]/√[${m}] × √[${m}]]]`, `= [[${a}√[${m}]/${m}]]`, g > 1 ? `${a} と ${m} を ${g} で 約分` : ''], answer: `[[${a}/√[${m}]]] = [[${C === 1 ? '' : C}√[${m}]/${Dn}]]`,
        mis: ([P, Q, R]) => P === a && Q === m && R === m && g > 1 ? `${g} で 約分しよう` : R === m * m ? `分母は √[${m}] × √[${m}] = ${m}` : ''}; }
    const b = r.int(1, 4);
    if(t === 2){ const v = m - b * b;
      return {q: '計算しよう。', form: `(√[${m}] + ${b})(√[${m}] − ${b}) = {0}`, ans: [v], kinds: ['i'],
        steps: ['(a + b)(a − b) = a² − b² を 使う。', `(√[${m}])² − ${b}² = ${m} − {{${b * b}}}`], answer: `${m} − ${b * b} = ${num(v)}`,
        mis: ([G]) => G === m + b * b ? '(a + b)(a − b) = a² − b²（ひき算）' : G === m - b ? `${b}² = ${b * b} だよ` : ''}; }
    if(t === 3) return {q: '計算しよう。', form: `(√[${m}] + ${b})² = {0} + {1}√[${m}]`, ans: [m + b * b, 2 * b],
      steps: ['(a + b)² = a² + 2ab + b² を 使う。', `(√[${m}])² = {{${m}}}、2 × √[${m}] × ${b} = {{${2 * b}}}√[${m}]、${b}² = {{${b * b}}}`], answer: `${m} + ${2 * b}√[${m}] + ${b * b} = ${m + b * b} + ${2 * b}√[${m}]`,
      mis: ([P, Q]) => P === m + b * b && Q === b ? '2ab の 2 を わすれずに' : P === m && Q === 2 * b ? `${b}² も たそう` : ''};
    const two = r.pick([2, 3]), A = two * r.int(1, 4), K = r.int(2, 3), sum = K + A / two;
    return {q: '計算しよう。', form: `√[${K * K * two}] + [[${A}/√[${two}]]] = {0}√[{1}]`, ans: [sum, two], check: rootCheck(sum, two, 1),
      steps: [`√[${K * K * two}] = {{${K}}}√[${two}]`, `[[${A}/√[${two}]]] = [[${A}√[${two}]/${two}]] = {{${A / two}}}√[${two}]`, `${K} + ${A / two} = ？`], answer: `${K}√[${two}] + ${A / two}√[${two}] = ${sum}√[${two}]`,
      mis: ([P, Q]) => Q === two && P === K + A ? `[[${A}/√[${two}]]] を 有理化してから たそう` : ''};
  }});
U({id: 'j3-inscribed', g: 9, ic: '🎡', pos: true, t: '円周角の 定理',
  ex: [['p', '**円周角は、同じ 弧に 対する 中心角の 半分**。同じ 弧に 対する 円周角は みんな 等しい。'],
       ['fig', () => F.inscribed('center', 120, '120°', 'x')],
       ['eg', '中心角 120° → 円周角 60°'],
       ['p', '**半円の 弧に 対する 円周角は 90°**（直径の 両はしと 円周上の 点で できる 角）。'],
       ['fig', () => F.inscribed('diam', 30, '30°', 'x')],
       ['tip', '同じ 弧の 上に ある 角どうしを さがそう。']],
  gen(r){
    const t = r.int(0, 3), q0 = '点 O は 円の 中心です。∠x の 大きさは？';
    if(t === 0){ const c = r.int(3, 8) * 20;
      return {q: q0, fig: F.inscribed('center', c, c + '°', 'x'), form: '{0}°', ans: [c / 2], steps: ['円周角は、同じ 弧に 対する 中心角の 半分。', `${c} ÷ 2 = ？`], answer: `x = ${c}° ÷ 2 = ${c / 2}°`,
        mis: ([G]) => G === 2 * c ? '円周角は 中心角の 半分だよ' : G === 180 - c ? '弧 AB に 対する 中心角を 見よう' : ''}; }
    if(t === 1){ const c = r.int(3, 8) * 20;
      return {q: q0, fig: F.inscribed('center', c, 'x', c / 2 + '°'), form: '{0}°', ans: [c], steps: ['中心角は、同じ 弧に 対する 円周角の 2倍。', `${c / 2} × 2 = ？`], answer: `x = ${c / 2}° × 2 = ${c}°`,
        mis: ([G]) => G === c / 4 ? '中心角は 円周角の 2倍だよ' : ''}; }
    if(t === 2){ const c = r.int(3, 8) * 20;
      return {q: '∠x の 大きさは？', fig: F.inscribed('same', c, c / 2 + '°', 'x'), form: '{0}°', ans: [c / 2], steps: ['∠APB と ∠AQB は、同じ 弧 AB に 対する 円周角。', '同じ 弧に 対する 円周角は 等しい。'], answer: `x = ${c / 2}°`,
        mis: ([G]) => G === c ? '同じ 弧に 対する 円周角どうしは 等しい（2倍では ない）' : ''}; }
    const a = r.int(4, 13) * 5;
    return {q: 'AB は 円の 直径です。∠x の 大きさは？', fig: F.inscribed('diam', a, a + '°', 'x'), form: '{0}°', ans: [90 - a],
      steps: ['直径に 対する 円周角は 90°（∠APB = {{90}}°）', `三角形 PAB の 角の 和 180°：180 − 90 − ${a} = ？`], answer: `x = 180° − 90° − ${a}° = ${90 - a}°`,
      mis: ([G]) => G === 180 - a ? '∠APB = 90° も ひこう' : G === a ? '∠APB が 90° だから、のこりの 2つの 角の 和は 90°' : ''};
  }});
U({id: 'j3-ratioline', g: 9, ic: '📏', pos: true, t: '平行線と 線分の 比',
  ex: [['p', '△ABC で **DE ∥ BC** の とき、**AD : AB = AE : AC = DE : BC**、また **AD : DB = AE : EC**。'],
       ['fig', () => F.triPar(0.4, {AD: '4cm', DB: '6cm', AE: '6cm', EC: 'x'})],
       ['eg', 'AD : DB = 4 : 6 = 2 : 3 → AE : EC = 2 : 3。AE = 6cm なら EC = 9cm'],
       ['p', '**中点連結定理**：2辺の 中点を 結ぶ 線分は、のこりの 辺に 平行で、長さは その **半分**。'],
       ['p', '3本の 平行線に 2本の 直線が 交わる とき、切り取られる 線分の 比は 等しい（a : b = c : d）。'],
       ['fig', () => F.threePar(2, 3, {a: '4cm', b: '6cm', c: '5cm', d: 'x'})],
       ['tip', '比の 式は「何倍か」で 考えると かんたん。']],
  gen(r){
    const t = r.int(0, 3); let m, n; do { m = r.int(1, 4); n = r.int(1, 4); } while(m === n || gcd(m, n) !== 1);
    const u = r.int(1, 4), v = r.int(1, 4), q0 = 'DE ∥ BC の とき、x の 長さは？';
    if(t === 0){ const L = {AD: m * u + 'cm', DB: n * u + 'cm', AE: m * v + 'cm', EC: 'x'};
      return {q: q0, fig: F.triPar(m / (m + n), L), form: '{0} cm', ans: [n * v], steps: ['DE ∥ BC なので AD : DB = AE : EC', `${m * u} : ${n * u} = ${m * v} : x`, `${m * v} は ${m * u} の 何倍？ → x は ${n * u} の 同じ 倍`], answer: `x = ${n * v}cm`,
        mis: ([G]) => G === (m + n) * v ? 'AD : DB = AE : EC（AC では なく EC）' : ''}; }
    if(t === 1){ const w = r.int(1, 4), L = {AD: m * u + 'cm', DB: n * u + 'cm', DE: 'x', BC: (m + n) * w + 'cm'};
      return {q: q0, fig: F.triPar(m / (m + n), L), form: '{0} cm', ans: [m * w], steps: ['DE ∥ BC なので AD : AB = DE : BC', `AB = ${m * u} + ${n * u} = {{${(m + n) * u}}}cm`, `${m * u} : ${(m + n) * u} = x : ${(m + n) * w}`], answer: `x = ${m * w}cm`,
        mis: ([G]) => H.is(G, (m + n) * w * m / n) ? 'DE : BC は AD : AB（DB では ない）' : ''}; }
    if(t === 2){ const k = r.int(3, 12);
      return {q: '点 D・E は 辺 AB・AC の 中点です。x の 長さは？', fig: F.triPar(0.5, {DE: 'x', BC: 2 * k + 'cm'}), form: '{0} cm', ans: [k], steps: ['中点連結定理：DE ∥ BC、DE = [[1/2]]BC', `${2 * k} ÷ 2 = ？`], answer: `x = ${2 * k} ÷ 2 = ${k}（cm）`,
        mis: ([G]) => G === 4 * k ? '中点を 結ぶ 線分は 半分の 長さ' : ''}; }
    return {q: 'ℓ ∥ m ∥ n の とき、x の 長さは？', fig: F.threePar(m, n, {a: m * u + 'cm', b: n * u + 'cm', c: m * v + 'cm', d: 'x'}), form: '{0} cm', ans: [n * v],
      steps: ['平行線で 切り取られる 線分の 比は 等しい：a : b = c : x', `${m * u} : ${n * u} = ${m * v} : x`], answer: `x = ${n * v}cm`,
      mis: ([G]) => H.is(G, m * v * m / n) ? '比の 順番（上どうし・下どうし）を そろえよう' : ''};
  }});
})();
