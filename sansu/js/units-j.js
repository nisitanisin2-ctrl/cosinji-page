/* ════════════════════════════════════════════════════════════════
   数学（中学1年〜3年）の単元。書き方は units-e.js と同じ（g は 7〜9）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU, F = S.F, H = S.H, { gcd, MI, num, term, par, poly } = S;
const UNITS = S.UNITS;
const U = u => { UNITS.push(u); return u; };
const fr = H.fr, sg = n => n < 0 ? MI : '+', ab = Math.abs;
const lin = (k, c) => `(x ${sg(c)} ${ab(c)})`.replace('(x', k === 1 ? '(x' : `(${H.cc(k)}x`);   // (x + 3)、(2x − 1)
H.sqrtCheck = (k, m) => g => {
  const [a, b] = g;
  if(a === k && b === m) return {ok: true};
  if(a > 0 && b > 0 && a * a * b === k * k * m) return {ok: false, near: true, msg: 'あと少し！ まだ √ の 中を 小さく できるよ'};
  return {ok: false};
};

/* ════════════ 中学1年 ════════════ */
U({id: 'j1-addsub', g: 7, ic: '🌡', t: '正負の数の たし算・ひき算', ta: true,
  ex: [['p', '**同じ符号** の たし算：絶対値の 和に、その 符号を つける。**ちがう符号**：絶対値の 大きい方から 小さい方を ひき、絶対値の 大きい方の 符号を つける。'],
       ['fig', () => F.line(-6, 6, -4, 3)],
       ['eg', '(−4) + (+7) = +3（数直線で −4 から 右へ 7）'],
       ['p', '**ひき算は、ひく数の 符号を かえて たし算に** します。'],
       ['eg', '(+2) − (−5) = (+2) + (+5) = +7'],
       ['tip', '−3 + 5 のように かっこの ない 式は「−3 と +5 の 和」と 考えよう。']],
  gen(r){
    const a = r.nz(-9, 9), b = r.nz(-9, 9), plus = r.chance(0.5), style = r.int(0, 1);
    const expr = style === 0 ? `${H.pp(a)} ${plus ? '+' : MI} ${H.pp(b)}` : `${num(a)} ${sg(b)} ${ab(b)}`;
    const bb = style === 0 && !plus ? -b : b, c = a + bb, lo = Math.min(a, c, 0) - 1, hi = Math.max(a, c, 0) + 1, steps = [];
    if(style === 0 && !plus) steps.push(`ひき算は、ひく数の 符号を かえて たし算に する：${H.pp(a)} − ${H.pp(b)} = ${H.pp(a)} + ({{${sg(-b)}${ab(b)}}})`);
    if(style === 1) steps.push(`${expr} は「${num(a)} と ${b < 0 ? MI + ab(b) : '+' + b} の 和」と 考える。`);
    const fig = F.line(lo, hi, a, c);
    if((a < 0) === (bb < 0)) steps.push({t: `同じ符号どうし：絶対値の 和 ${ab(a)} + ${ab(bb)} = {{${ab(a) + ab(bb)}}} に、符号 ${a < 0 ? '−' : '+'} を つける。`, fig});
    else if(ab(a) === ab(bb)) steps.push({t: '絶対値が 同じで 符号が ちがうので、打ち消しあう。', fig});
    else { const big = ab(a) > ab(bb) ? a : bb, hi = Math.max(ab(a), ab(bb)), lo = Math.min(ab(a), ab(bb)); steps.push({t: `ちがう符号どうし：${hi} − ${lo} = {{${hi - lo}}} に、絶対値の 大きい ${num(big)} の 符号（${big < 0 ? '−' : '+'}）を つける。`, fig}); }
    const mis = ([G]) => (a < 0) !== (bb < 0) && ab(G) === ab(a) + ab(bb) ? '符号が ちがう ときは、絶対値の 大きい ほうから 小さい ほうを ひくよ'
      : (a < 0) === (bb < 0) && ab(a) !== ab(bb) && ab(G) === ab(ab(a) - ab(bb)) ? '同じ 符号どうしは、絶対値を たして その 符号を つけるよ'
      : style === 0 && !plus && G === a + b ? 'ひき算は、ひく数の 符号を かえて たし算に しよう' : '';
    return {q: '計算しよう。', form: `${expr} = {0}`, ans: [c], kinds: ['i'], steps, mis, answer: `${expr} = ${num(c)}`};
  }});
U({id: 'j1-muldiv', g: 7, ic: '⚡', t: '正負の数の かけ算・わり算・累乗', ta: true,
  ex: [['p', 'かけ算・わり算は **まず符号を決める**：負の数が **偶数こ なら +、奇数こ なら −**。あとは 絶対値を 計算します。'],
       ['eg', '(−3) × (−4) = +12、(−24) ÷ 6 = −4、(−2) × 3 × (−5) = +30'],
       ['p', '**累乗**：(−3)² = (−3) × (−3) = 9。でも −3² = −(3 × 3) = −9。'],
       ['tip', 'かっこが あるか ないかで 答えが かわるので 注意！']],
  gen(r){
    const t = r.int(0, 4);
    const sgnStep = list => { const k = list.filter(v => v < 0).length; return `まず **符号** を 決める：負の数が ${k}こ → ${k % 2 ? '−' : '+'}`; };
    if(t === 0){ let a = r.nz(-9, 9), b = r.nz(-9, 9); if(a > 0 && b > 0) a = -a; const e = `${par(a)} × ${par(b)}`;
      return {q: '計算しよう。', form: `${e} = {0}`, ans: [a * b], kinds: ['i'], steps: [sgnStep([a, b]), `絶対値は ${ab(a)} × ${ab(b)} = {{${ab(a * b)}}}`], answer: `${e} = ${num(a * b)}`}; }
    if(t === 1){ const b = r.nz(-9, 9); let q = r.nz(-9, 9); if(b > 0 && q > 0) q = -q; const a = b * q, e = `${par(a)} ÷ ${par(b)}`;
      return {q: '計算しよう。', form: `${e} = {0}`, ans: [q], kinds: ['i'], steps: [sgnStep([a, b]), `絶対値は ${ab(a)} ÷ ${ab(b)} = {{${ab(q)}}}`], answer: `${e} = ${num(q)}`}; }
    if(t === 2){ let a, b, c; do { a = r.nz(-6, 6); b = r.nz(-5, 5); c = r.nz(-5, 5); } while(a > 0 && b > 0 && c > 0); const e = `${par(a)} × ${par(b)} × ${par(c)}`;
      return {q: '計算しよう。', form: `${e} = {0}`, ans: [a * b * c], kinds: ['i'], steps: [sgnStep([a, b, c]), `絶対値は ${ab(a)} × ${ab(b)} × ${ab(c)} = {{${ab(a * b * c)}}}`], answer: `${e} = ${num(a * b * c)}`}; }
    if(t === 3){ const k = r.int(0, 2), a = k === 2 ? r.int(2, 4) : r.int(2, 9);
      if(k === 0){ const e = `(${MI}${a})²`; return {q: '計算しよう。', form: `${e} = {0}`, ans: [a * a], kinds: ['i'], steps: [`(−${a})² は (−${a}) × (−${a})`, '負の数が 2こ → 符号は +'], answer: `${e} = ${a * a}`,
        mis: ([G]) => G === -a * a ? '(−) × (−) は ＋ だよ' : ab(G) === 2 * a ? '2乗は 2倍では ないよ（同じ 数を 2回 かける）' : ''}; }
      if(k === 1){ const e = `${MI}${a}²`; return {q: '計算しよう。', form: `${e} = {0}`, ans: [-a * a], kinds: ['i'], steps: [`${MI}${a}² は −(${a} × ${a})。2乗 するのは ${a} だけ（かっこが ないから）。`, `${a} × ${a} = {{${a * a}}} に − を つける。`], answer: `${e} = ${num(-a * a)}`,
        mis: ([G]) => G === a * a ? `かっこが ないので、2乗するのは ${a} だけ。− は そのまま のこるよ` : ab(G) === 2 * a ? '2乗は 2倍では ないよ（同じ 数を 2回 かける）' : ''}; }
      const e = `(${MI}${a})³`; return {q: '計算しよう。', form: `${e} = {0}`, ans: [-a * a * a], kinds: ['i'], steps: [`(−${a})³ = (−${a}) × (−${a}) × (−${a})`, '負の数が 3こ → 符号は −', `絶対値は ${a} × ${a} × ${a} = {{${a * a * a}}}`], answer: `${e} = ${num(-a * a * a)}`,
        mis: ([G]) => ab(G) === 3 * a ? '3乗は 3倍では ないよ（同じ 数を 3回 かける）' : ''};
    }
    const c = r.nz(-6, 6), m = r.nz(-6, 6), b = r.nz(-5, 5), a = c * m, e = `${par(a)} × ${par(b)} ÷ ${par(c)}`;
    return {q: '計算しよう。', form: `${e} = {0}`, ans: [m * b], kinds: ['i'], steps: [sgnStep([a, b, c]), `絶対値は ${ab(a)} × ${ab(b)} ÷ ${ab(c)} = {{${ab(m * b)}}}`], answer: `${e} = ${num(m * b)}`};
  }});
U({id: 'j1-moji', g: 7, ic: '🔡', t: '文字式の 計算',
  ex: [['p', '**同類項**（x の 項どうし、数の 項どうし）を まとめます。かっこは **分配法則** で はずします。'],
       ['eg', '3x + 5 − x + 2 = (3 − 1)x + (5 + 2) = 2x + 7'],
       ['eg', '−2(3x − 4) = −6x + 8'],
       ['p', '**−( ) を はずすと、中の 符号が すべて 反対** に なります。'],
       ['eg', '(4x + 1) − (x − 3) = 4x + 1 − x + 3 = 3x + 4'],
       ['tip', '1x は x、−1x は −x と 書くよ。']],
  gen(r){
    const t = r.int(0, 2); let A, B, e, steps, mis = null;
    if(t === 0){ let a, b, c, d; do { a = r.nz(-7, 7); b = r.nz(-9, 9); c = r.nz(-7, 7); d = r.nz(-9, 9); A = a + c; B = b + d; } while(!A || !B);
      e = poly([[a, 'x'], [b, ''], [c, 'x'], [d, '']]);
      steps = ['x の 項どうし、数の 項どうしを まとめる。', `x の 係数：${num(a)} ${sg(c)} ${ab(c)} = ？`, `数の 項：${num(b)} ${sg(d)} ${ab(d)} = ？`];
    } else if(t === 1){ let k, a, b; do { k = r.nz(-5, 5); a = r.nz(-5, 5); b = r.nz(-9, 9); } while(k === 1); A = k * a; B = k * b;
      e = `${k === -1 ? MI : num(k)}(${poly([[a, 'x'], [b, '']])})`;
      steps = [`かっこの 外の ${num(k)} を、中の 項 **それぞれに** かける（分配法則）。`, `${par(k)} × ${poly([[a, 'x']])} と ${par(k)} × ${par(b)} を 計算しよう。`];
      mis = ([X, Y]) => X === k * a && Y === b ? `${num(b)} にも ${num(k)} を かけよう（かっこの 中の 全部に かける）` : X === a && Y === k * b ? `${poly([[a, 'x']])} にも ${num(k)} を かけよう` : '';
    } else { let a, b, c, d; do { a = r.nz(-7, 7); b = r.nz(-9, 9); c = r.nz(-7, 7); d = r.nz(-9, 9); A = a - c; B = b - d; } while(!A || !B);
      e = `(${poly([[a, 'x'], [b, '']])}) − (${poly([[c, 'x'], [d, '']])})`;
      steps = ['− ( ) を はずすと、かっこの 中の 符号が **すべて 反対** に なる。', `${poly([[a, 'x'], [b, ''], [-c, 'x'], [-d, '']])} に なる。`, 'x の 項、数の 項を それぞれ まとめよう。'];
      mis = ([X, Y]) => X === a + c && Y === b + d ? '− ( ) を はずすと、かっこの 中の 符号が すべて 反対に なるよ' : X === A && Y === b + d ? '− ( ) を はずすと、うしろの 数の 項の 符号も かわるよ' : X === a + c && Y === B ? '− ( ) を はずすと、x の 項の 符号も かわるよ' : '';
    }
    return {q: '式を 計算しよう。', form: `${e} = {0}x {1}`, ans: [H.cc(A), term(B)], kinds: ['c', 't'], note: '数の 前の ＋・− も 入れてね', steps, mis, answer: `${e} = ${poly([[A, 'x'], [B, '']])}`};
  }});
U({id: 'j1-eq', g: 7, ic: '⚖', t: '一次方程式', ta: true,
  ex: [['p', '**移項**：項を 等号の 反対側へ 移すと、符号が かわる。x の 項を 左に、数の 項を 右に 集めて、さいごに x の 係数で わります。'],
       ['eg', '3x + 5 = 17 → 3x = 17 − 5 → 3x = 12 → x = 4'],
       ['eg', '5x − 3 = 2x + 9 → 5x − 2x = 9 + 3 → 3x = 12 → x = 4'],
       ['tip', '答えを もとの 式に 代入して、左辺と 右辺が 同じに なれば 正かい。']],
  gen(r){
    const t = r.int(0, 3); let x0 = r.nz(-9, 9);
    if(t === 0){ const a = r.pick([2, 3, 4, 5, 6, 7, 8, 9, -2, -3, -4, -5, -6]), b = r.nz(-15, 15), c = a * x0 + b, eq = `${poly([[a, 'x'], [b, '']])} = ${num(c)}`;
      return {q: '方程式を 解こう。', form: `${eq}　→　x = {0}`, ans: [x0], kinds: ['i'],
        steps: [`数の 項 ${num(b)} を 右辺に **移項** する（移項すると 符号が かわる）。`, `${poly([[a, 'x']])} = ${num(c)} ${b < 0 ? '+' : MI} ${ab(b)} → ${poly([[a, 'x']])} = {{${c - b}}}`, `両辺を ${num(a)} で わる。`], answer: `${poly([[a, 'x']])} = ${c - b} → x = ${num(x0)}`,
        mis: ([G]) => H.is(G, (c + b) / a) ? '移項すると 符号が かわるよ' : G === c - b ? `${poly([[a, 'x']])} = ${c - b}。まだ 両辺を ${num(a)} で わろう` : G === (c - b) * a ? `両辺を ${num(a)} で わろう（かけるのでは ないよ）` : ''}; }
    if(t === 1){ let a, c; do { a = r.nz(-7, 9); c = r.nz(-7, 9); } while(a === c);
      const b = r.nz(-12, 12), d = a * x0 + b - c * x0, k = a - c, eq = `${poly([[a, 'x'], [b, '']])} = ${poly([[c, 'x'], [d, '']])}`;
      const st = [`x の 項を 左辺に、数の 項を 右辺に 移項する。`, `${poly([[a, 'x'], [-c, 'x']])} = ${num(d)} ${b < 0 ? '+' : MI} ${ab(b)} → ${poly([[k, 'x']])} = {{${d - b}}}`];
      if(k !== 1) st.push(`両辺を ${num(k)} で わる。`);
      return {q: '方程式を 解こう。', form: `${eq}　→　x = {0}`, ans: [x0], kinds: ['i'], steps: st, answer: `${poly([[k, 'x']])} = ${d - b} → x = ${num(x0)}`,
        mis: ([G]) => H.is(G, (d + b) / k) ? '数の 項を 移項すると 符号が かわるよ' : a + c !== 0 && H.is(G, (d - b) / (a + c)) ? 'x の 項を 移項すると 符号が かわるよ' : k !== 1 && G === d - b ? `まだ 両辺を ${num(k)} で わろう` : ''}; }
    if(t === 2){ const a = r.int(2, 6), b = r.nz(-9, 9), c = a * (x0 + b), eq = `${a}(${poly([[1, 'x'], [b, '']])}) = ${num(c)}`;
      return {q: '方程式を 解こう。', form: `${eq}　→　x = {0}`, ans: [x0], kinds: ['i'],
        steps: [`まず かっこを はずす：${poly([[a, 'x'], [a * b, '']])} = ${num(c)}`, `${num(a * b)} を 移項：${a}x = ${num(c)} ${a * b < 0 ? '+' : MI} ${ab(a * b)} = {{${c - a * b}}}`, `両辺を ${a} で わる。`], answer: `${a}x = ${c - a * b} → x = ${num(x0)}`,
        mis: ([G]) => H.is(G, (c - b) / a) ? `かっこを はずす とき、${num(b)} にも ${a} を かけよう` : G === c - b ? `かっこの 外の ${a} も わすれずに` : ''}; }
    const a = r.int(2, 5), m = r.nz(-6, 6), b = r.nz(-9, 9), c = m + b; x0 = a * m;
    const eq = `${fr('x', a)} ${sg(b)} ${ab(b)} = ${num(c)}`;
    return {q: '方程式を 解こう。', form: `${eq}　→　x = {0}`, ans: [x0], kinds: ['i'],
      steps: [`${num(b)} を 移項：${fr('x', a)} = ${num(c)} ${b < 0 ? '+' : MI} ${ab(b)} = {{${m}}}`, `両辺に ${a} を かけて 分母を はらう：x = ${par(m)} × ${a}`], answer: `x = ${num(x0)}`,
      mis: ([G]) => G === m ? `${fr('x', a)} = ${num(m)}。両辺に ${a} を かけよう` : H.is(G, m / a) ? '両辺に かけよう（わるのでは ないよ）' : G === (c + b) * a ? '移項すると 符号が かわるよ' : ''};
  }});
U({id: 'j1-prop', g: 7, ic: '📈', t: '比例と 反比例',
  ex: [['p', '**比例**：y = ax（x が 2倍・3倍 → y も 2倍・3倍）。**反比例**：y = [[a/x]]（x × y が いつも a）。a を **比例定数** と いいます。'],
       ['fig', () => F.graph(x => 2 * x, [[1, 2]])],
       ['eg', 'y が x に 比例し、x = 3 のとき y = 6 → 6 = a × 3、a = 2 → y = 2x'],
       ['eg', 'y が x に 反比例し、x = 2 のとき y = 6 → a = 2 × 6 = 12 → y = [[12/x]]'],
       ['tip', 'まず 比例定数 a を 求めて、式を つくってから 代入しよう。']],
  gen(r){
    const t = r.int(0, 2);
    if(t < 2){ const a = r.nz(-5, 5), x1 = r.nz(-6, 6), y1 = a * x1;
      if(t === 1) return {q: `y は x に 比例し、x = ${num(x1)} のとき y = ${num(y1)} です。比例定数 a は？`, form: 'a = {0}', ans: [a], kinds: ['i'], steps: ['比例 → y = ax と おける。', `x = ${num(x1)}、y = ${num(y1)} を 代入：${num(y1)} = a × ${par(x1)}`, `a = ${num(y1)} ÷ ${par(x1)}`], answer: `a = ${num(a)}`,
        mis: ([G]) => H.is(G, x1 / y1) ? 'a = y ÷ x だよ（ぎゃくに わって いないかな？）' : G === x1 * y1 && ab(x1) !== 1 ? 'それは 反比例の 考え方。比例は a = y ÷ x' : ''};
      let x2 = r.nz(-9, 9); while(x2 === x1) x2 = r.nz(-9, 9);
      return {q: `y は x に 比例し、x = ${num(x1)} のとき y = ${num(y1)} です。x = ${num(x2)} のときの y は？`, form: 'y = {0}', ans: [a * x2], kinds: ['i'],
        steps: [{t: '比例 → y = ax と おける。', fig: F.graph(x => a * x, Math.abs(y1) <= 6 ? [[x1, y1]] : [])}, `${num(y1)} = a × ${par(x1)} → a = {{${a}}}`, `y = ${poly([[a, 'x']])} に x = ${num(x2)} を 代入しよう。`], answer: `y = ${num(a)} × ${par(x2)} = ${num(a * x2)}`,
        mis: ([G]) => G === a ? `a = ${num(a)} が わかったら、x = ${num(x2)} を 代入しよう` : ''};
    }
    const A = r.pick([6, 8, 12, 18, 24, 30, 36, -6, -12, -24]), ds = [];
    for(let i = 1; i <= ab(A); i++) if(A % i === 0){ ds.push(i); ds.push(-i); }
    const x1 = r.pick(ds); let x2 = r.pick(ds); while(x2 === x1) x2 = r.pick(ds);
    const y1 = A / x1;
    return {q: `y は x に 反比例し、x = ${num(x1)} のとき y = ${num(y1)} です。x = ${num(x2)} のときの y は？`, form: 'y = {0}', ans: [A / x2], kinds: ['i'],
      steps: [{t: `反比例 → y = ${fr('a', 'x')}、つまり x × y = a（いつも 同じ）。`, fig: F.graph(x => A / x, Math.abs(x1) <= 6 && Math.abs(y1) <= 6 ? [[x1, y1]] : [])}, `a = ${par(x1)} × ${par(y1)} = {{${A}}}`, `y = ${num(A)} ÷ ${par(x2)} を 計算しよう。`], answer: `y = ${fr(num(A), 'x')} → ${num(A)} ÷ ${par(x2)} = ${num(A / x2)}`,
      mis: ([G]) => G === A * x2 ? 'y = a ÷ x だよ（反比例）' : H.is(G, y1 * x2 / x1) && !H.is(G, A / x2) ? 'それは 比例の 考え方。反比例は x × y が いつも 同じ' : ''};
  }});
U({id: 'j1-sector', g: 7, ic: '🍕', t: '円と おうぎ形（π）',
  ex: [['p', '円周率を **π** で 表します。**円周 = 2πr**、**円の 面積 = πr²**。'],
       ['p', 'おうぎ形は 円の [[中心角/360]]：**弧の 長さ = 2πr × [[中心角/360]]**、**面積 = πr² × [[中心角/360]]**。'],
       ['fig', () => F.sector(6, 60, 'cm')],
       ['eg', '半径 6cm、中心角 60°：弧 = 2π × 6 × [[60/360]] = 2π cm、面積 = π × 36 × [[1/6]] = 6π cm²'],
       ['tip', '[[中心角/360]] を さきに 約分すると 計算が らくだよ。']],
  gen(r){
    const t = r.int(0, 2);
    if(t === 0){ const R0 = r.int(2, 10);
      return r.chance(0.5) ? {q: `半径 ${R0}cm の 円の 面積は？（π を 使う）`, fig: F.circle(R0, 'r', 'cm'), form: '{0}π cm²', ans: [R0 * R0], steps: ['円の 面積 = π × 半径²', `π × ${R0}² = π × ？`], answer: `π × ${R0}² = ${R0 * R0}π（cm²）`,
                              mis: ([G]) => G === 2 * R0 ? 'それは 円周（2πr）。面積は πr²' : G === R0 ? '半径を 2乗しよう（πr²）' : ''}
                           : {q: `半径 ${R0}cm の 円の 円周は？（π を 使う）`, fig: F.circle(R0, 'r', 'cm'), form: '{0}π cm', ans: [2 * R0], steps: ['円周 = 2π × 半径', `2π × ${R0} = ？`], answer: `2π × ${R0} = ${2 * R0}π（cm）`,
                              mis: ([G]) => G === R0 * R0 ? 'それは 面積（πr²）。円周は 2πr' : G === R0 ? '円周は 2 × π × 半径。2 を わすれずに' : ''}; }
    const DEG = [30, 40, 45, 60, 72, 90, 120, 135, 150, 180, 210, 240, 270, 300];
    let R0, deg; do { R0 = r.int(2, 12); deg = r.pick(DEG); } while(t === 1 ? (2 * R0 * deg) % 360 : (R0 * R0 * deg) % 360);
    const g = gcd(deg, 360), f = fr(deg / g, 360 / g);
    if(t === 1) return {q: `半径 ${R0}cm、中心角 ${deg}° の おうぎ形の 弧の 長さは？`, fig: F.sector(R0, deg, 'cm'), form: '{0}π cm', ans: [2 * R0 * deg / 360],
      steps: [`弧の 長さ = 2π × 半径 × ${fr('中心角', 360)}`, `2π × ${R0} × ${fr(deg, 360)}`, `${fr(deg, 360)} = [[{{${deg / g}}}/{{${360 / g}}}]]。2 × ${R0} × ${f} を 計算しよう。`], answer: `2π × ${R0} × ${f} = ${2 * R0 * deg / 360}π（cm）`,
      mis: ([G]) => H.is(G, R0 * R0 * deg / 360) ? 'それは 面積の 式。弧の 長さは 2πr × 中心角/360' : H.is(G, R0 * deg / 360) ? '2 × π × 半径 だよ（2 を わすれずに）' : G === 2 * R0 ? `それは 円 全部の 円周。× ${f} しよう` : ''};
    return {q: `半径 ${R0}cm、中心角 ${deg}° の おうぎ形の 面積は？`, fig: F.sector(R0, deg, 'cm'), form: '{0}π cm²', ans: [R0 * R0 * deg / 360],
      steps: [`面積 = π × 半径² × ${fr('中心角', 360)}`, `π × ${R0}² × ${fr(deg, 360)} = π × {{${R0 * R0}}} × ${f}`, `${R0 * R0} × ${f} = ？`], answer: `π × ${R0 * R0} × ${f} = ${R0 * R0 * deg / 360}π（cm²）`,
      mis: ([G]) => H.is(G, 2 * R0 * deg / 360) ? 'それは 弧の 長さの 式。面積は πr² × 中心角/360' : G === R0 * R0 ? `それは 円 全部の 面積。× ${f} しよう` : ''};
  }});

/* ════════════ 中学2年 ════════════ */
U({id: 'j2-poly', g: 8, ic: '🧩', t: '式の 計算（多項式・単項式）',
  ex: [['p', '多項式の たし算・ひき算は、**同類項（x どうし・y どうし）** を まとめます。'],
       ['eg', '(3x + 2y) − (x − 4y) = 3x + 2y − x + 4y = 2x + 6y'],
       ['p', '単項式の かけ算・わり算は、**係数どうし、文字どうし** を 計算します。'],
       ['eg', '3x × (−4y) = −12xy、12x²y ÷ 3x = 4xy'],
       ['tip', 'x と y、x と x² は 同類項では ないので まとめられないよ。']],
  gen(r){
    const t = r.int(0, 3);
    if(t < 3){ let a, b, c, d, k, m, E, Fy, e;
      do { a = r.nz(-6, 6); b = r.nz(-6, 6); c = r.nz(-6, 6); d = r.nz(-6, 6);
        if(t === 0){ E = a + c; Fy = b + d; e = `(${poly([[a, 'x'], [b, 'y']])}) + (${poly([[c, 'x'], [d, 'y']])})`; }
        else if(t === 1){ E = a - c; Fy = b - d; e = `(${poly([[a, 'x'], [b, 'y']])}) − (${poly([[c, 'x'], [d, 'y']])})`; }
        else { k = r.int(2, 4); m = r.nz(-3, 3); E = k * a + m * c; Fy = k * b + m * d; e = `${k}(${poly([[a, 'x'], [b, 'y']])}) ${sg(m)} ${ab(m) === 1 ? '' : ab(m)}(${poly([[c, 'x'], [d, 'y']])})`; }
      } while(!E || !Fy);
      const steps = t === 0 ? ['かっこを そのまま はずして、同類項（x どうし・y どうし）を まとめる。', `x：${num(a)} ${sg(c)} ${ab(c)} = ？、y：${num(b)} ${sg(d)} ${ab(d)} = ？`]
                  : t === 1 ? ['− ( ) を はずすと、中の 符号が 反対に なる。', `${poly([[a, 'x'], [b, 'y'], [-c, 'x'], [-d, 'y']])}`, 'x どうし、y どうしを まとめよう。']
                            : [`分配法則で かっこを はずす：${poly([[k * a, 'x'], [k * b, 'y']])} と ${poly([[m * c, 'x'], [m * d, 'y']])}`, 'x どうし、y どうしを まとめよう。'];
      const mis = t === 1 ? ([X, Y]) => X === a + c && Y === b + d ? '− ( ) を はずすと、中の 符号が すべて 反対に なるよ' : X === E && Y === b + d ? '− ( ) を はずすと、y の 項の 符号も かわるよ' : X === a + c && Y === Fy ? '− ( ) を はずすと、x の 項の 符号も かわるよ' : ''
                : t === 2 ? ([X, Y]) => X === a + c * m && Y === b + d * m || X === k * a + c && Y === k * b + d ? 'かっこの 外の 数を かけわすれて いないかな？' : '' : null;
      return {q: '式を 計算しよう。', form: `${e} = {0}x {1}y`, ans: [H.cc(E), H.tc(Fy)], kinds: ['c', 'tc'], note: '数の 前の ＋・− も 入れてね', steps, mis, answer: `${e} = ${poly([[E, 'x'], [Fy, 'y']])}`};
    }
    const wrap = (c, v) => c < 0 ? `(${poly([[c, v]])})` : poly([[c, v]]);
    if(r.chance(0.5)){ const a = r.nz(-6, 6), b = r.nz(-6, 6), e = `${poly([[a, 'x']])} × ${wrap(b, 'y')}`;
      return {q: '式を 計算しよう。', form: `${e} = {0}xy`, ans: [H.cc(a * b)], kinds: ['c'], steps: ['係数どうし、文字どうしを かける。', `係数：${num(a)} × ${par(b)} = ？、文字：x × y = xy`], answer: `${e} = ${poly([[a * b, 'xy']])}`}; }
    const b = r.nz(-6, 6), q = r.nz(-6, 6), a = b * q, e = `${poly([[a, 'x²y']])} ÷ ${wrap(b, 'x')}`;
    return {q: '式を 計算しよう。', form: `${e} = {0}xy`, ans: [H.cc(q)], kinds: ['c'], steps: ['係数どうし、文字どうしを わる。', `係数：${num(a)} ÷ ${par(b)} = ？、文字：x²y ÷ x = xy`], answer: `${e} = ${poly([[q, 'xy']])}`};
  }});
U({id: 'j2-simul', g: 8, ic: '🔗', t: '連立方程式',
  ex: [['p', '2つの 式から **1つの 文字を 消して**、1年で 習った 方程式に します。'],
       ['p', '**加減法**：式どうしを たしたり ひいたり して 消す（係数を そろえるために 何倍か する こともある）。**代入法**：y = … の 式を もう一方に 代入する。'],
       ['eg', 'x + y = 5、x − y = 1 → たすと 2x = 6、x = 3 → y = 2'],
       ['tip', '求めた x、y を 両方の 式に 入れて たしかめよう。']],
  gen(r){
    const x0 = r.nz(-5, 5), y0 = r.nz(-5, 5), t = r.int(0, 2); let e1, e2, steps;
    if(t === 2){ let m, a, b; do { m = r.nz(-3, 3); a = r.nz(-4, 4); b = r.nz(-4, 4); } while(a + b * m === 0);
      const n = y0 - m * x0, c = a * x0 + b * y0;
      e1 = `y = ${poly([[m, 'x'], [n, '']])}`; e2 = `${poly([[a, 'x'], [b, 'y']])} = ${num(c)}`;
      steps = [`① の y = ${poly([[m, 'x'], [n, '']])} を ② の y に **代入** する（代入法）。`, `${poly([[a, 'x']])} ${sg(b)} ${ab(b) === 1 ? '' : ab(b)}(${poly([[m, 'x'], [n, '']])}) = ${num(c)}`, 'かっこを はずして x を 求め、① に 代入して y を 求めよう。'];
    } else {
      let a1, b1, a2, b2, k = 1;
      if(t === 0){ b1 = r.nz(-4, 4); b2 = r.chance(0.5) ? b1 : -b1; do { a1 = r.nz(-5, 5); a2 = r.nz(-5, 5); } while(a1 * b2 - a2 * b1 === 0); }
      else { b1 = r.nz(-3, 3); k = r.pick([2, 3, -2]); b2 = k * b1; do { a1 = r.nz(-4, 4); a2 = r.nz(-5, 5); } while(a1 * b2 - a2 * b1 === 0); }
      const c1 = a1 * x0 + b1 * y0, c2 = a2 * x0 + b2 * y0;
      e1 = `${poly([[a1, 'x'], [b1, 'y']])} = ${num(c1)}`; e2 = `${poly([[a2, 'x'], [b2, 'y']])} = ${num(c2)}`;
      if(t === 0 && b2 === b1) steps = ['y の 係数が 同じ → ① − ② で y を 消す（加減法）。', `(${num(a1)} − ${par(a2)})x = ${num(c1)} − ${par(c2)} → ${poly([[a1 - a2, 'x']])} = {{${c1 - c2}}}`, 'x を 求めて、① に 代入して y を 求めよう。'];
      else if(t === 0) steps = ['y の 係数の 符号が 反対 → ① + ② で y を 消す（加減法）。', `(${num(a1)} + ${par(a2)})x = ${num(c1)} + ${par(c2)} → ${poly([[a1 + a2, 'x']])} = {{${c1 + c2}}}`, 'x を 求めて、① に 代入して y を 求めよう。'];
      else steps = [`① を ${num(k)} 倍すると、y の 係数が ② と 同じ ${num(b2)} に なる：${poly([[k * a1, 'x'], [k * b1, 'y']])} = {{${k * c1}}}`, `それから ② を ひいて y を 消す：${poly([[k * a1 - a2, 'x']])} = {{${k * c1 - c2}}}`, 'x を 求めて、① に 代入して y を 求めよう。'];
    }
    return {q: `連立方程式を 解こう。\n①　${e1}\n②　${e2}`, form: 'x = {0}、y = {1}', ans: [x0, y0], kinds: ['i', 'i'], steps, answer: `x = ${num(x0)}、y = ${num(y0)}`};
  }});
U({id: 'j2-linear', g: 8, ic: '📉', t: '一次関数',
  ex: [['p', '**y = ax + b**（a は **傾き＝変化の割合**、b は **切片**＝ x = 0 のときの y）。グラフは 直線に なります。'],
       ['fig', () => F.graph(x => 2 * x - 1, [[0, -1], [2, 3]])],
       ['eg', '2点 (0, −1)、(2, 3) を 通る：傾き = [[3 − (−1)/2 − 0]] = 2、切片 −1 → y = 2x − 1'],
       ['tip', 'y の 増加量 = 変化の割合 × x の 増加量']],
  gen(r){
    const t = r.int(0, 3);
    if(t === 0){ const a = r.nz(-4, 4), b = r.int(-8, 8), p = r.int(-5, 5), y = a * p + b;
      return {q: `一次関数 y = ${poly([[a, 'x'], [b, '']])} で、x = ${num(p)} のときの y は？`, form: 'y = {0}', ans: [y], kinds: ['i'],
        steps: [`x = ${num(p)} を 代入する：y = ${num(a)} × ${par(p)}${b ? ' ' + sg(b) + ' ' + ab(b) : ''}`, `${num(a)} × ${par(p)} = {{${a * p}}}${b ? `、それに ${num(b)} を たす` : ''}`], answer: `y = ${num(y)}`,
        mis: ([G]) => b && G === a * p ? `${num(b)} を たすのを わすれずに` : b && G === a * p - b ? `${b < 0 ? MI : '+'}${ab(b)} の 符号に 気をつけて` : G === a + p + b || G === a + b * p ? 'y = ax + b の x に 代入しよう（a × x）' : ''}; }
    if(t === 1){ let a, b, x1, x2; do { a = r.nz(-3, 3); b = r.nz(-6, 6); x1 = r.int(-4, 3); x2 = r.int(x1 + 1, 4); } while(ab(a * x1 + b) > 8 || ab(a * x2 + b) > 8);
      const y1 = a * x1 + b, y2 = a * x2 + b;
      return {q: `2点 (${num(x1)}, ${num(y1)})、(${num(x2)}, ${num(y2)}) を 通る 直線の 式は？`, form: 'y = {0}x {1}', ans: [H.cc(a), term(b)], kinds: ['c', 't'], note: '数の 前の ＋・− も 入れてね',
        steps: [{t: `傾き = ${fr('y の 増加量', 'x の 増加量')} = ${fr(`${num(y2)} − ${par(y1)}`, `${num(x2)} − ${par(x1)}`)}`, fig: F.graph(x => a * x + b, [[x1, y1], [x2, y2]].filter(p => ab(p[1]) <= 6))}, '傾きを a と すると、y = ax + b に 1つの 点を 代入して b を 求める。', `${num(y1)} = a × ${par(x1)} + b`],
        mis: ([A]) => y2 !== y1 && H.is(A, (x2 - x1) / (y2 - y1)) && !H.is(A, a) ? '傾き = y の 増加量 ÷ x の 増加量（ぎゃくに わって いないかな？）' : '',
        answer: `y = ${poly([[a, 'x'], [b, '']])}`}; }
    if(t === 2){ const a = r.nz(-4, 4), b = r.nz(-6, 6), p = r.int(-4, 4), qv = a * p + b;
      return {q: `傾きが ${num(a)} で、点 (${num(p)}, ${num(qv)}) を 通る 直線の 式は？`, form: 'y = {0}x {1}', ans: [H.cc(a), term(b)], kinds: ['c', 't'], note: '数の 前の ＋・− も 入れてね',
        steps: [`y = ${poly([[a, 'x']])} + b と おく。`, `点 (${num(p)}, ${num(qv)}) を 代入：${num(qv)} = ${num(a)} × ${par(p)} + b`, `b = ${num(qv)} − ${par(a * p)}`], answer: `y = ${poly([[a, 'x'], [b, '']])}`,
        mis: ([A, B]) => A === a && a * p !== 0 && B === qv + a * p ? 'b を 求める ときの 移項の 符号に 気をつけて' : A === a && B === qv ? `それは 点の y の 値。b = ${num(qv)} − ${par(a * p)} を 計算しよう` : ''}; }
    const a = r.nz(-4, 4), b = r.int(-6, 6), x1 = r.int(-5, 3), x2 = r.int(x1 + 1, 6);
    return {q: `一次関数 y = ${poly([[a, 'x'], [b, '']])} で、x が ${num(x1)} から ${num(x2)} まで 増加するとき、y の 増加量は？`, form: '{0}', ans: [a * (x2 - x1)], kinds: ['i'],
      steps: ['y の 増加量 = 変化の割合 × x の 増加量', `一次関数の 変化の割合は 傾きと 同じ ${num(a)}`, `x の 増加量は ${num(x2)} − ${par(x1)} = {{${x2 - x1}}}`], answer: `${num(a)} × ${x2 - x1} = ${num(a * (x2 - x1))}`,
      mis: ([G]) => G === a && x2 - x1 !== 1 ? 'それは 変化の割合。y の 増加量 = 変化の割合 × x の 増加量' : G === x2 - x1 && a !== 1 ? 'それは x の 増加量。変化の割合を かけよう' : ''};
  }});
U({id: 'j2-angles', g: 8, ic: '⬡', t: '多角形の 角',
  ex: [['p', '**n角形の 内角の 和 = 180° × (n − 2)**。**外角の 和は いつも 360°**。'],
       ['fig', () => F.ngon(6)],
       ['eg', '六角形の 内角の 和：180° × 4 = 720°。正六角形の 1つの 内角は 720° ÷ 6 = 120°'],
       ['eg', '正八角形の 1つの 外角：360° ÷ 8 = 45°'],
       ['tip', '三角形の 外角は、となりに ない 2つの 内角の 和に 等しい。']],
  gen(r){
    const t = r.int(0, 4);
    if(t === 0){ const n = r.int(5, 12); return {q: `${n}角形の 内角の 和は 何度？`, fig: F.ngon(n), form: '{0}°', ans: [180 * (n - 2)], steps: [`${n}角形は、1つの 頂点から 対角線を ひくと、${n} − 2 = {{${n - 2}}}こ の 三角形に 分けられる。`, `180° × ${n - 2} = ？`], answer: `180° × ${n - 2} = ${180 * (n - 2)}°`,
      mis: ([G]) => G === 180 * n || G === 180 * (n - 1) ? `三角形は ${n} − 2 こ だよ` : G === 360 ? '360° は 外角の 和。内角の 和は 180° × (n − 2)' : ''}; }
    if(t === 1){ const n = r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20]); return {q: `正${n}角形の 1つの 内角は 何度？`, fig: F.ngon(n), form: '{0}°', ans: [180 * (n - 2) / n], steps: [`内角の 和は 180° × (${n} − 2) = {{${180 * (n - 2)}}}°`, `正多角形の 内角は みんな 同じ → ${180 * (n - 2)}° ÷ ${n}`], answer: `${180 * (n - 2)}° ÷ ${n} = ${180 * (n - 2) / n}°`,
      mis: ([G]) => H.is(G, 360 / n) ? 'それは 外角。内角 = 180° − 外角' : G === 180 * (n - 2) ? `それは 内角の 和。${n} で わろう` : ''}; }
    if(t === 2){ const n = r.pick([3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]); return {q: `正${n}角形の 1つの 外角は 何度？`, form: '{0}°', ans: [360 / n], steps: ['多角形の 外角の 和は いつも 360°', `360° ÷ ${n} = ？`], answer: `360° ÷ ${n} = ${360 / n}°`,
      mis: ([G]) => H.is(G, 180 * (n - 2) / n) ? 'それは 内角。外角の 和は いつも 360°' : H.is(G, 180 / n) ? '外角の 和は 360° だよ' : ''}; }
    if(t === 3){ const e = r.pick([10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120]); return {q: `1つの 外角が ${e}° の 正多角形は 正何角形？`, form: '正{0}角形', ans: [360 / e], steps: ['外角の 和は 360°', `360 ÷ ${e} = ？`], answer: `360 ÷ ${e} = ${360 / e} → 正${360 / e}角形`,
      mis: ([G]) => H.is(G, 180 / e) ? '外角の 和は 360° だよ' : ''}; }
    const A = r.int(30, 80), B = r.int(30, 165 - A);
    return {q: `三角形の 2つの 内角が ${A}° と ${B}° の とき、のこりの 角の 外角は 何度？`, form: '{0}°', ans: [A + B], steps: ['三角形の 外角は、となりに ない 2つの 内角の 和に 等しい。', `${A}° + ${B}° = ？`], answer: `${A}° + ${B}° = ${A + B}°`,
      mis: ([G]) => G === 180 - A - B ? 'それは のこりの 内角。外角は、となりに ない 2つの 内角の 和' : ''};
  }});
U({id: 'j2-prob', g: 8, ic: '🎲', t: '確率',
  ex: [['p', '**確率 = [[あてはまる 場合の数/全部の 場合の数]]**（どれも 同じように 起こる とき）。'],
       ['eg', 'さいころで 偶数：2、4、6 の 3通り → [[3/6]] = [[1/2]]'],
       ['fig', () => F.dice((i, j) => i + j === 7)],
       ['eg', '2つの さいころの 和が 7：6通り → [[6/36]] = [[1/6]]'],
       ['tip', '答えは 約分しよう。表や 樹形図で もれなく 数えるのが コツ。']],
  gen(r){
    const t = r.int(0, 3);
    if(t === 0){ const ev = r.pick([['偶数', [2, 4, 6]], ['奇数', [1, 3, 5]], ['3の倍数', [3, 6]], ['5以上', [5, 6]], ['4以下', [1, 2, 3, 4]], ['素数', [2, 3, 5]], ['6の約数', [1, 2, 3, 6]], ['1', [1]]]), k = ev[1].length;
      return Object.assign(H.fracAns(k, 6), {q: `さいころを 1回 投げて、${ev[0]} の 目が 出る 確率は？`, steps: ['さいころの 目の 出方は 全部で 6通り（どれも 同じように 出る）', `${ev[0]} の 目：${ev[1].join('、')} の {{${k}}}通り`, `確率 = ${fr(k, 6)} → 約分できるかな？`], answer: `${fr(k, 6)}${gcd(k, 6) > 1 ? ' = ' + fr(k / gcd(k, 6), 6 / gcd(k, 6)) : ''}`,
        mis: gv => k * 2 !== 6 && H.is(H.fv(gv), (6 - k) / 6) ? 'それは あてはまらない ほうの 確率だよ' : ''}); }
    if(t === 1){ const ty = r.int(0, 2); let pred, label;
      if(ty === 0){ const s = r.int(3, 11); pred = (i, j) => i + j === s; label = `2つの 目の 和が ${s}`; }
      else if(ty === 1){ pred = (i, j) => i === j; label = '2つとも 同じ 目'; }
      else { const s = r.int(8, 11); pred = (i, j) => i + j >= s; label = `2つの 目の 和が ${s} 以上`; }
      let k = 0; for(let i = 1; i <= 6; i++) for(let j = 1; j <= 6; j++) if(pred(i, j)) k++;
      return Object.assign(H.fracAns(k, 36), {q: `2つの さいころを 同時に 投げる。${label} に なる 確率は？`, steps: [{t: '2つの さいころの 目の 出方は 6 × 6 = {{36}}通り', fig: F.dice(pred)}, `${label} に なるのは {{${k}}}通り（表の ○）`, `確率 = ${fr(k, 36)} → 約分しよう。`], answer: `${fr(k, 36)} = ${fr(k / gcd(k, 36), 36 / gcd(k, 36))}`,
        mis: gv => H.is(H.fv(gv), k / 12) && k !== 0 ? '目の 出方は 6 + 6 では なく 6 × 6 = 36通り' : ''}); }
    if(t === 2){ const c = r.pick([[2, '2枚とも 表', 1], [2, '1枚が 表で 1枚が 裏', 2], [3, '3枚とも 表', 1], [3, '少なくとも 1枚は 表', 7], [3, 'ちょうど 2枚が 表', 3]]), n = c[0], N = Math.pow(2, n), k = c[2];
      const list = n === 2 ? '表表・表裏・裏表・裏裏' : '表表表・表表裏・表裏表・表裏裏・裏表表・裏表裏・裏裏表・裏裏裏';
      return Object.assign(H.fracAns(k, N), {q: `${n}枚の 硬貨を 同時に 投げる。${c[1]} に なる 確率は？`, steps: [`表・裏の 出方は 全部で {{${N}}}通り：${list}`, `${c[1]} に なるのは {{${k}}}通り`, `確率 = ${fr(k, N)}${gcd(k, N) > 1 ? ' → 約分しよう' : ''}`], answer: `${fr(k, N)}${gcd(k, N) > 1 ? ' = ' + fr(k / gcd(k, N), N / gcd(k, N)) : ''}`,
        mis: gv => H.is(H.fv(gv), k / (2 * n)) && k / (2 * n) !== k / N ? `表・裏の 出方は 2 × 2${n === 3 ? ' × 2' : ''} 通り だよ` : ''}); }
    const red = r.int(1, 6), white = r.int(1, 6), blue = r.chance(0.4) ? r.int(1, 4) : 0, tot = red + white + blue;
    return Object.assign(H.fracAns(red, tot), {q: `ふくろに 赤玉 ${red}こ、白玉 ${white}こ${blue ? `、青玉 ${blue}こ` : ''} が 入っている。1こ 取り出すとき、赤玉が 出る 確率は？`, steps: [`玉は 全部で {{${tot}}}こ。どの 玉が 出るのも 同じように 起こる。`, `赤玉は ${red}こ → ${fr(red, tot)}`, '約分できるかな？'], answer: `${fr(red, tot)}${gcd(red, tot) > 1 ? ' = ' + (tot / gcd(red, tot) === 1 ? 1 : fr(red / gcd(red, tot), tot / gcd(red, tot))) : ''}`,
      mis: gv => H.is(H.fv(gv), red / (white + blue)) ? '分母は 玉 全部の 数だよ（赤玉も 入れて 数えよう）' : ''});
  }});

/* ════════════ 中学3年 ════════════ */
U({id: 'j3-expand', g: 9, ic: '🎁', t: '式の 展開（乗法公式）', ta: true,
  ex: [['p', '**乗法公式**'],
       ['eg', '(x + a)(x + b) = x² + (a + b)x + ab'],
       ['eg', '(x + a)² = x² + 2ax + a²　　(x − a)² = x² − 2ax + a²'],
       ['eg', '(x + a)(x − a) = x² − a²'],
       ['tip', '(x + 3)(x − 5)：a + b = 3 + (−5) = −2、ab = 3 × (−5) = −15 → x² − 2x − 15']],
  gen(r){
    const t = r.int(0, 3), note = '数の 前の ＋・− も 入れてね';
    if(t === 0){ let a, b; do { a = r.nz(-9, 9); b = r.nz(-9, 9); } while(a + b === 0);
      const e = lin(1, a) + lin(1, b);
      return {q: '式を 展開しよう。', form: `${e} = x² {0}x {1}`, ans: [H.tc(a + b), term(a * b)], kinds: ['tc', 't'], note,
        steps: ['(x + a)(x + b) = x² + (a + b)x + ab を 使う。', `a + b = ${num(a)} + ${par(b)} = ？`, `ab = ${num(a)} × ${par(b)} = ？`], answer: `${e} = ${poly([[1, 'x²'], [a + b, 'x'], [a * b, '']])}`,
        mis: ([P, Q]) => P === a * b && Q === a + b ? 'x の 係数は たして（a + b）、数の 項は かけて（ab）だよ' : ''}; }
    if(t === 1){ const a = r.nz(-9, 9), e = lin(1, a) + '²';
      return {q: '式を 展開しよう。', form: `${e} = x² {0}x {1}`, ans: [H.tc(2 * a), term(a * a)], kinds: ['tc', 't'], note,
        steps: [a < 0 ? '(x − a)² = x² − 2ax + a² を 使う。' : '(x + a)² = x² + 2ax + a² を 使う。', `x の 係数：2 × ${par(a)} = ？`, `数の 項：${par(a)}² = ？`], answer: `${e} = ${poly([[1, 'x²'], [2 * a, 'x'], [a * a, '']])}`,
        mis: ([P, Q]) => P === a && Q === a * a ? 'x の 係数は 2 × a（2 を わすれずに）' : P === 2 * a && Q === 2 * a ? `${par(a)}² は ${par(a)} × ${par(a)} だよ` : P === 2 * a && Q === -a * a ? '数の 項（a²）は いつも ＋ だよ' : P === 0 ? '(x + a)² は x² + a² では ないよ。まん中の 2ax を わすれずに' : ''}; }
    if(t === 2){ const a = r.int(1, 9), e = `(x + ${a})(x ${MI} ${a})`;
      return {q: '式を 展開しよう。', form: `${e} = x² {0}`, ans: [term(-a * a)], kinds: ['t'], note, steps: ['(x + a)(x − a) = x² − a²（和と 差の 積）', `a² = ${a}² = {{${a * a}}}`], answer: `${e} = x² ${MI} ${a * a}`,
        mis: ([Q]) => Q === a * a ? '(x + a)(x − a) = x² − a²。− が つくよ' : ab(Q) === 2 * a ? `${a}² は ${a} × ${a} だよ` : ''}; }
    let a, b, c, d; do { a = r.int(2, 3); c = r.int(1, 3); b = r.nz(-5, 5); d = r.nz(-5, 5); } while(a * d + b * c === 0);
    const e = lin(a, b) + lin(c, d);
    return {q: '式を 展開しよう。', form: `${e} = {0}x² {1}x {2}`, ans: [H.cc(a * c), H.tc(a * d + b * c), term(b * d)], kinds: ['c', 'tc', 't'], note,
      steps: ['分配法則で 4つの かけ算を して たす。', `${poly([[a, 'x']])} × ${poly([[c, 'x']])} = ${poly([[a * c, 'x²']])}、${poly([[a, 'x']])} × ${par(d)} = ${poly([[a * d, 'x']])}、${num(b)} × ${poly([[c, 'x']])} = ${poly([[b * c, 'x']])}、${num(b)} × ${par(d)} = {{${b * d}}}`, 'x の 項を まとめよう。'],
      mis: ([A, P, Q]) => A === a * c && Q === b * d && (P === a * d || P === b * c) ? 'x の 項は 2つ できるよ。両方 たそう' : A === a * c && Q === b * d && P === 0 ? 'まん中の x の 項を わすれずに（4つの かけ算）' : '',
      answer: `${e} = ${poly([[a * c, 'x²'], [a * d + b * c, 'x'], [b * d, '']])}`};
  }});
U({id: 'j3-factor', g: 9, ic: '🧷', t: '因数分解',
  ex: [['p', '展開の **ぎゃく**。x² + px + q は、**かけて q、たして p に なる 2つの 数** a、b を 見つけて (x + a)(x + b)。'],
       ['eg', 'x² + 5x + 6：かけて 6、たして 5 → 2 と 3 → (x + 2)(x + 3)'],
       ['eg', 'x² − 9 = x² − 3² = (x + 3)(x − 3)'],
       ['tip', 'かけた数（q）の 組から さがすと はやい。q が 負なら、2つの 数の 符号は ちがう。']],
  gen(r){
    let a, b; do { a = r.nz(-9, 9); b = r.nz(-9, 9); } while(ab(a * b) > 60);
    const P = a + b, Q = a * b, e = poly([[1, 'x²'], [P, 'x'], [Q, '']]), pairs = [];
    for(let u = -ab(Q); u <= ab(Q); u++){ if(!u || Q % u) continue; const v = Q / u; if(u <= v) pairs.push(`${num(u)} と ${num(v)}`); }
    const steps = P === 0 ? [`x² − ${ab(Q)} = x² − ${ab(a)}² と 見る。`, 'a² − b² = (a + b)(a − b) を 使う。']
                          : [`かけて ${num(Q)}、たして ${num(P)} に なる 2つの 数を さがそう。`, `かけて ${num(Q)} に なる 組：${pairs.join('、')}`, `その中で、たして ${num(P)} に なるのは どれ？`];
    const mis = ([u, v]) => u * v === Q && u + v === -P && P !== 0 ? `かけて ${num(Q)} は あっているよ。たして ${num(P)} に なるように 符号を 考えよう` : u + v === P && u * v !== Q ? `たして ${num(P)} は あっているよ。かけて ${num(Q)} に なる 組を さがそう` : u * v === Q && u + v !== P ? `かけて ${num(Q)} は あっているよ。たして ${num(P)} に なる 組を さがそう` : '';
    return {q: '因数分解しよう。', form: `${e} = (x {0})(x {1})`, ans: [term(a), term(b)], kinds: ['t', 't'], order: 'any', note: '数の 前の ＋・− も 入れてね', steps, mis,
      answer: `${e} = ${lin(1, a)}${a === b ? '²' : lin(1, b)}`};
  }});
U({id: 'j3-sqrt', g: 9, ic: '√', t: '平方根',
  ex: [['p', '2乗して a に なる 数が a の **平方根**（正と 負の 2つ：±√a）。'],
       ['p', '**√ の 中の 2乗の 数は 外に 出せる**：√[12] = √[2² × 3] = 2√[3]。'],
       ['eg', '√[18] + √[8] = 3√[2] + 2√[2] = 5√[2]'],
       ['eg', '√[2] × √[8] = √[16] = 4'],
       ['tip', '√ の 中は できるだけ 小さい 数に しよう（素因数分解すると 見つけやすい）。']],
  gen(r){
    const t = r.int(0, 4), M = [2, 3, 5, 6, 7, 10, 11];
    if(t === 0){ let k, m, n; do { k = r.int(2, 6); m = r.pick(M); n = k * k * m; } while(n > 300);
      return {q: '√ の 中を できるだけ 小さい 数に しよう。', form: `√[${n}] = {0}√[{1}]`, ans: [k, m], check: H.sqrtCheck(k, m),
        steps: [`${n} を 素因数分解：${S.factors(n).join(' × ')}`, `2つ 組に なる 数は √ の 外へ 1つ 出せる：${n} = {{${k}}}² × {{${m}}}`, `√[${k}² × ${m}] の ${k}² が 外へ 出ると いくつ？`], answer: `√[${n}] = ${k}√[${m}]`,
        mis: ([K, M]) => K === k * k && M === m ? `${k}² が √ の 外に 出ると、2乗する 前の 数に なるよ` : ''}; }
    if(t === 1){ const m = r.pick(M); let a, b; do { a = r.int(1, 7); b = r.nz(-6, 6); } while(a + b < 2);
      const e = `${a === 1 ? '' : a}√[${m}] ${sg(b)} ${ab(b) === 1 ? '' : ab(b)}√[${m}]`;
      return {q: '計算しよう。', form: `${e} = {0}√[{1}]`, ans: [a + b, m], steps: [`√ の 中が 同じなら、文字式の 同類項と 同じように まとめられる（√[${m}] を x と 思うと ${a}x ${sg(b)} ${ab(b)}x）。`, `${a} ${sg(b)} ${ab(b)} = ？`], answer: `${e} = ${a + b}√[${m}]`}; }
    if(t === 2){ const m = r.pick([2, 3, 5]); let k1, k2; do { k1 = r.int(1, 4); k2 = r.int(2, 5); } while(k1 === k2);
      const n1 = k1 * k1 * m, n2 = k2 * k2 * m, s1 = k1 === 1 ? `√[${m}]` : `${k1}√[${m}]`;
      return {q: '計算しよう。', form: `√[${n1}] + √[${n2}] = {0}√[{1}]`, ans: [k1 + k2, m], check: H.sqrtCheck(k1 + k2, m), steps: [`それぞれ かんたんに する：√[${n1}] = ${s1}、√[${n2}] = {{${k2}}}√[${m}]`, `${s1} + ${k2}√[${m}] → ${k1} + ${k2} = ？`], answer: `${s1} + ${k2}√[${m}] = ${k1 + k2}√[${m}]`,
        mis: ([K, M]) => K === 1 && M === n1 + n2 ? '√[a] + √[b] は √[a + b] では ないよ。かんたんに してから まとめよう' : ''}; }
    if(t === 3){ const p = r.pick([[2, 8], [3, 12], [2, 18], [3, 27], [5, 20], [6, 24], [2, 32], [7, 28], [2, 50], [3, 48]]), v = Math.round(Math.sqrt(p[0] * p[1]));
      return {q: '計算しよう。', form: `√[${p[0]}] × √[${p[1]}] = {0}`, ans: [v], steps: ['√[a] × √[b] = √[ab]', `√[${p[0]} × ${p[1]}] = √[{{${p[0] * p[1]}}}]`, `${p[0] * p[1]} は 何の 2乗？`], answer: `√[${p[0] * p[1]}] = ${v}`,
        mis: ([G]) => G === p[0] * p[1] ? `√ を はずそう（2乗して ${p[0] * p[1]} に なる 数は？）` : H.is(G, (p[0] * p[1]) / 2) ? `2乗して ${p[0] * p[1]}。半分では ないよ` : ''}; }
    const k = r.int(2, 15), n = k * k;
    return {q: `${n} の 平方根を 答えよう。`, form: '±{0}', ans: [k], steps: [`2乗して ${n} に なる 数を 考えよう。`, 'プラスと マイナスの 2つ ある。だから ± を つけて 答える。'], answer: `±${k}（${k}² = ${n}、(−${k})² = ${n}）`,
      mis: ([G]) => H.is(G, n / 2) ? `2乗して ${n}。半分では ないよ` : G === n ? `2乗して ${n} に なる 数だよ` : ''};
  }});
U({id: 'j3-quad', g: 9, ic: '🎯', t: '2次方程式',
  ex: [['p', '**因数分解** して **A × B = 0 なら A = 0 か B = 0** を 使います。'],
       ['eg', 'x² − 5x + 6 = 0 → (x − 2)(x − 3) = 0 → x = 2、3'],
       ['eg', 'x² = 16 → x = ±4　　(x − 1)² = 9 → x − 1 = ±3 → x = 4、−2'],
       ['tip', '因数分解できない ときは 解の公式 x = [[−b ± √[b² − 4ac]/2a]] を 使う（「2次方程式（解の公式）」で れんしゅうできるよ）。']],
  gen(r){
    const t = r.int(0, 3);
    if(t === 0){ let r1, r2; do { r1 = r.nz(-9, 9); r2 = r.nz(-9, 9); } while(r1 === r2 || ab(r1 * r2) > 60);
      const P = -(r1 + r2), Q = r1 * r2, eq = `${poly([[1, 'x²'], [P, 'x'], [Q, '']])} = 0`;
      return {q: '2次方程式を 解こう。', form: `${eq}　→　x = {0}、{1}`, ans: [r1, r2], kinds: ['i', 'i'], order: 'any',
        steps: [`左辺を **因数分解** しよう：かけて ${num(Q)}、たして ${num(P)} に なる 2つの 数は？`, `${lin(1, -r1)}${lin(1, -r2)} = 0`, 'A × B = 0 なら A = 0 か B = 0。それぞれの x を 求めよう。'], answer: `x = ${num(r1)}、${num(r2)}`,
        mis: ([u, v]) => (u === -r1 && v === -r2) || (u === -r2 && v === -r1) ? '(x − a) = 0 なら x = a。符号に 気をつけて' : ''}; }
    if(t === 1){ const k = r.int(2, 12);
      return {q: '2次方程式を 解こう。', form: `x² = ${k * k}　→　x = ±{0}`, ans: [k], steps: [`2乗して ${k * k} に なる 数が x。`, 'プラスと マイナスの 2つ ある。'], answer: `x = ±${k}`,
        mis: ([G]) => H.is(G, k * k / 2) ? `2乗して ${k * k}。半分では ないよ` : ''}; }
    if(t === 2){ const a = r.nz(-6, 6), b = r.int(1, 6), eq = `${lin(1, a)}² = ${b * b}`;
      return {q: '2次方程式を 解こう。', form: `${eq}　→　x = {0}、{1}`, ans: [-a + b, -a - b], kinds: ['i', 'i'], order: 'any',
        steps: [`x ${sg(a)} ${ab(a)} は 2乗して ${b * b} に なる 数 → x ${sg(a)} ${ab(a)} = ±{{${b}}}`, `x = ${num(-a)} + ${b} と x = ${num(-a)} − ${b} を 計算しよう。`], answer: `x = ${num(-a + b)}、${num(-a - b)}`,
        mis: ([u, v]) => [u, v].sort((x, y) => x - y).join() === [a + b, a - b].sort((x, y) => x - y).join() ? `移項すると 符号が かわるよ（x = ${num(-a)} ± ${b}）` : ''}; }
    const p = r.nz(-9, 9), eq = `${poly([[1, 'x²'], [p, 'x']])} = 0`;
    return {q: '2次方程式を 解こう。', form: `${eq}　→　x = {0}、{1}`, ans: [0, -p], kinds: ['i', 'i'], order: 'any',
      steps: [`共通な x で くくる：x${lin(1, p)} = 0`, `x = 0 または x ${sg(p)} ${ab(p)} = 0`], answer: `x = 0、${num(-p)}`,
      mis: ([u, v]) => (u === 0 && v === p) || (v === 0 && u === p) ? `x ${sg(p)} ${ab(p)} = 0 の 解の 符号に 気をつけて` : u !== 0 && v !== 0 ? 'x = 0 も 解の 1つだよ（x で わっては いけない）' : ''};
  }});
U({id: 'j3-yax2', g: 9, ic: '🏀', t: '関数 y = ax²',
  ex: [['p', 'y = ax² の グラフは **放物線**。a > 0 なら 上に 開き、a < 0 なら 下に 開く。'],
       ['fig', () => F.graph(x => x * x / 2, [[2, 2]])],
       ['eg', 'y = 2x² で x = 3 → y = 2 × 9 = 18'],
       ['p', '**変化の割合 = [[y の 増加量/x の 増加量]]**。y = ax² では 一定では ないよ（x が p から q まで なら a(p + q)）。'],
       ['tip', '(−3)² = 9。負の数の 2乗は 正に なる。']],
  gen(r){
    const t = r.int(0, 2), a = r.nz(-3, 3);
    if(t === 0){ const p = r.nz(-4, 4), y = a * p * p;
      return {q: `y = ${poly([[a, 'x²']])} で、x = ${num(p)} のときの y は？`, form: 'y = {0}', ans: [y], kinds: ['i'],
        steps: [{t: `x = ${num(p)} を 代入：y = ${ab(a) === 1 ? (a < 0 ? MI : '') : num(a) + ' × '}${par(p)}²`, fig: F.graph(x => a * x * x, ab(y) <= 6 ? [[p, y]] : [])}, `${par(p)}² = {{${p * p}}}`], answer: `y = ${num(y)}`,
        mis: ([G]) => G === 2 * a * p || G === -2 * a * p ? '2乗は 2倍では ないよ（同じ 数を 2回 かける）' : G === a * a * p * p && ab(a) !== 1 ? '2乗するのは x だけ。a は あとで かけよう' : ''}; }
    if(t === 1){ const p = r.nz(-4, 4), y = a * p * p;
      return {q: `y = ax² の グラフが 点 (${num(p)}, ${num(y)}) を 通る。a の 値は？`, form: 'a = {0}', ans: [a], kinds: ['i'],
        steps: [`x = ${num(p)}、y = ${num(y)} を 代入：${num(y)} = a × ${par(p)}²`, `${num(y)} = {{${p * p}}}a → a = ${num(y)} ÷ ${p * p}`], answer: `a = ${num(a)}`,
        mis: ([G]) => H.is(G, p * p / y) ? 'a = y ÷ x² だよ（ぎゃくに わって いないかな？）' : ab(p) !== 1 && H.is(G, y / p) ? 'x² で わろう（x では ないよ）' : ''}; }
    const x1 = r.int(-4, 3), x2 = r.int(x1 + 1, 5), y1 = a * x1 * x1, y2 = a * x2 * x2;
    return {q: `y = ${poly([[a, 'x²']])} で、x が ${num(x1)} から ${num(x2)} まで 増加するときの 変化の割合は？`, form: '{0}', ans: [a * (x1 + x2)], kinds: ['i'],
      steps: [`変化の割合 = ${fr('y の 増加量', 'x の 増加量')}`, `x = ${num(x1)} のとき y = {{${y1}}}、x = ${num(x2)} のとき y = {{${y2}}}`, `${fr(`${num(y2)} − ${par(y1)}`, `${num(x2)} − ${par(x1)}`)} を 計算しよう。`], answer: `${fr(y2 - y1, x2 - x1)} = ${num(a * (x1 + x2))}`,
      mis: ([G]) => x2 - x1 !== 1 && G === y2 - y1 ? 'それは y の 増加量。x の 増加量で わろう' : G === a ? 'y = ax² の 変化の割合は 一定では ないよ。y の 増加量 ÷ x の 増加量 で 求めよう' : ''};
  }});
U({id: 'j3-pythag', g: 9, ic: '📐', t: '三平方の定理',
  ex: [['p', '直角三角形で、直角を はさむ 2辺を a、b、斜辺を c と すると **a² + b² = c²**。'],
       ['fig', () => F.rightTri(4, 3, 5, 'cm')],
       ['eg', 'a = 3、b = 4 → c² = 9 + 16 = 25 → c = 5'],
       ['eg', 'a = 1、b = 2 → c² = 1 + 4 = 5 → c = √[5]'],
       ['tip', '3:4:5、5:12:13、8:15:17 は よく 出る 組み合わせ。']],
  gen(r){
    const t = r.int(0, 3);
    if(t < 3){ let tr, k; do { tr = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]]); k = r.int(1, 3); } while(tr[2] * k > 60);
      const [a, b, c] = tr.map(v => v * k);
      const hyp = ([G]) => G === a + b ? '三平方の定理（a² + b² = c²）を 使おう' : G === c * c ? `c² = ${c * c}。2乗して ${c * c} に なる 数が 答え` : '';
      if(t === 0) return {q: '直角三角形の 斜辺（? の 辺）の 長さは？', fig: F.rightTri(a, b, '?', 'cm'), form: '{0} cm', ans: [c], steps: ['三平方の定理：a² + b² = c²（c は 斜辺）', `${a}² + ${b}² = {{${a * a}}} + {{${b * b}}} = {{${c * c}}}`, `c² = ${c * c}。2乗して ${c * c} に なる 正の 数は？`], answer: `c = √[${c * c}] = ${c}（cm）`, mis: hyp};
      if(t === 1) return {q: '直角三角形の ? の 辺の 長さは？', fig: F.rightTri(a, '?', c, 'cm'), form: '{0} cm', ans: [b], steps: ['a² + b² = c²（c は 斜辺）', `${a}² + b² = ${c}² → b² = ${c * c} − ${a * a} = {{${c * c - a * a}}}`, `2乗して ${c * c - a * a} に なる 正の 数は？`], answer: `b = √[${c * c - a * a}] = ${b}（cm）`,
        mis: ([G]) => G === c - a ? '2乗で 考えよう（b² = c² − a²）' : G === c * c - a * a ? `b² = ${c * c - a * a}。2乗して ${c * c - a * a} に なる 数が 答え` : ''};
      return {q: `たて ${b}cm、よこ ${a}cm の 長方形の 対角線の 長さは？`, fig: F.rect(a, b, 'cm'), form: '{0} cm', ans: [c], steps: ['対角線で 直角三角形が できる → 三平方の定理', `${a}² + ${b}² = {{${a * a + b * b}}}`, `2乗して ${c * c} に なる 正の 数は？`], answer: `√[${c * c}] = ${c}（cm）`, mis: hyp};
    }
    const [a, b] = r.pick([[1, 1], [1, 2], [2, 3], [1, 3], [2, 2], [2, 4], [3, 3], [3, 6], [4, 4], [1, 4], [2, 5], [4, 6]]), n = a * a + b * b;
    let k = 1; for(let i = 2; i * i <= n; i++) if(n % (i * i) === 0) k = i;
    const m = n / (k * k);
    return k === 1 ? {q: '直角三角形の 斜辺の 長さは？（√ を 使って 答えよう）', fig: F.rightTri(a, b, '?', 'cm'), form: '√[{0}] cm', ans: [n], steps: ['a² + b² = c²', `${a}² + ${b}² = {{${n}}}`, `c = √[${n}]（これ以上 かんたんに ならない）`], answer: `c = √[${n}]（cm）`,
                      mis: ([N]) => N === a + b ? 'それぞれ 2乗してから たそう（a² + b²）' : ''}
                   : {q: '直角三角形の 斜辺の 長さは？（√ を 使って 答えよう）', fig: F.rightTri(a, b, '?', 'cm'), form: '{0}√[{1}] cm', ans: [k, m], check: H.sqrtCheck(k, m), steps: ['a² + b² = c²', `${a}² + ${b}² = {{${n}}}`, `c = √[${n}]。√ の 中を かんたんに しよう（${n} = ${k}² × ${m}）。`], answer: `c = √[${n}] = ${k}√[${m}]（cm）`};
  }});
U({id: 'j3-similar', g: 9, ic: '🔍', t: '相似',
  ex: [['p', '形が 同じで 大きさが ちがう 図形が **相似**。対応する 辺の 比が **相似比**。'],
       ['fig', () => F.similar(2, 3)],
       ['p', '相似比が m : n なら、**面積比は m² : n²**、**体積比は m³ : n³**。'],
       ['eg', '相似比 2 : 3 → 面積比 4 : 9、体積比 8 : 27'],
       ['tip', '比の 式 a : b = c : x は、何倍に なったかで 考えると かんたん。']],
  gen(r){
    const t = r.int(0, 3); let m, n; do { m = r.int(1, 5); n = r.int(1, 5); } while(m === n || gcd(m, n) !== 1);
    if(t === 0){ const u = r.int(2, 6);
      return {q: `△A と △B は 相似で、相似比は ${m} : ${n}。△A の 辺 ${m * u}cm に 対応する △B の 辺は 何cm？`, fig: F.similar(m, n), form: '{0} cm', ans: [n * u], steps: [`対応する 辺の 比は 相似比と 同じ ${m} : ${n}`, `${m} : ${n} = ${m * u} : x → ${m} を {{${u}}}倍 すると ${m * u}`, `x は ${n} の ${u}倍`], answer: `${n} × ${u} = ${n * u}（cm）`,
        mis: ([G]) => G === n + (m * u - m) ? '比は たし算では なく、何倍か で 考えよう' : ''}; }
    if(t === 1){ const u = r.int(1, 5), A = m * m * u, B = n * n * u;
      return {q: `△A と △B は 相似で、相似比は ${m} : ${n}。△A の 面積が ${A}cm² の とき、△B の 面積は？`, fig: F.similar(m, n), form: '{0} cm²', ans: [B], steps: [`面積比は 相似比の 2乗：${m}² : ${n}² = {{${m * m}}} : {{${n * n}}}`, `${m * m} : ${n * n} = ${A} : x`, `${A} は ${m * m} の ${u}倍 → x は ${n * n} の ${u}倍`], answer: `${n * n} × ${u} = ${B}（cm²）`,
        mis: ([G]) => H.is(G, A * n / m) ? '面積比は 相似比の 2乗だよ' : ''}; }
    if(t === 2){ const u = r.int(1, 3), A = m * m * m * u, B = n * n * n * u;
      return {q: `相似な 2つの 立体 A・B の 相似比は ${m} : ${n}。A の 体積が ${A}cm³ の とき、B の 体積は？`, form: '{0} cm³', ans: [B], steps: [`体積比は 相似比の 3乗：${m}³ : ${n}³ = {{${m * m * m}}} : {{${n * n * n}}}`, `${m * m * m} : ${n * n * n} = ${A} : x`, `${A} は ${m * m * m} の ${u}倍 → x は ${n * n * n} の ${u}倍`], answer: `${n * n * n} × ${u} = ${B}（cm³）`,
        mis: ([G]) => H.is(G, A * n * n / (m * m)) ? '体積比は 2乗では なく 3乗だよ' : H.is(G, A * n / m) ? '体積比は 相似比の 3乗だよ' : ''}; }
    const u = r.int(2, 6);
    return {q: `相似な △A と △B で、対応する 辺が ${m * u}cm と ${n * u}cm。相似比は？`, fig: F.similar(m, n), form: '{0} : {1}', ans: [m, n], check: H.ratioCheck(m, n), steps: ['相似比 = 対応する 辺の 比', `${m * u} : ${n * u} を かんたんに する（${u} で わる）`], answer: `${m * u} : ${n * u} = ${m} : ${n}`};
  }});
})();
