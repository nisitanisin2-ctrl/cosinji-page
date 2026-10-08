/* ════════════════════════════════════════════════════════════════
   算数の 単元（v7〜）：小3〜小6 の 大きな数・図形・グラフを 読む 問題・データの 調べ方。書き方は units-e.js と 同じ
   グラフの 図は core.js の F.bars・F.lines・F.band・F.pie（グラフを 読む ことが 問題なので、ぼうや 点の 数は 書かない）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU, F = S.F, H = S.H, { MI, decStr } = S;
const U = u => { S.UNITS.push(u); return u; };
const KD = '〇一二三四五六七八九';
/* 漢数字（1億 未満）：36000 → 三万六千、1000 → 千、10000 → 一万 */
const kan4 = n => [[1000, '千'], [100, '百'], [10, '十']].map(([u, c]) => { const d = Math.floor(n / u) % 10; return d ? (d > 1 ? KD[d] : '') + c : ''; }).join('') + (n % 10 ? KD[n % 10] : '');
const kan = n => { const m = Math.floor(n / 1e4), o = n % 1e4; return (m ? kan4(m) + '万' : '') + (o ? kan4(o) : '') || '〇'; };
/* 右から 4けたずつ 区切る：352000000 → 3|5200|0000 */
const sec4 = n => { const s = String(n), out = []; for(let e = s.length; e > 0; e -= 4) out.unshift(s.slice(Math.max(0, e - 4), e)); return out.join('|'); };
/* ちがう 数を k こ（lo〜hi） */
const distinct = (r, k, lo, hi) => { const out = []; while(out.length < k){ const v = r.int(lo, hi); if(!out.includes(v)) out.push(v); } return out; };

/* ════════════ 小学3年 ════════════ */
U({id: 'g3-man', g: 3, ic: '🏙', t: '大きな数（万）',
  ex: [['p', '1000 が 10こ で **10000（一万）**。一万が 10こ で 十万、100こ で 百万、1000こ で **千万**。'],
       ['eg', '35028 → 一万の くらい 3、千の くらい 5、百の くらい 0、十の くらい 2、一の くらい 8（三万五千二十八）'],
       ['eg', '10000 を 4こ、100 を 6こ → 40600（千の くらいは 0）'],
       ['p', '10倍 すると 右に 0 が 1つ つき、10 で わると 一の くらいの 0 が 1つ とれます。'],
       ['eg', '230 × 10 = 2300、230 × 100 = 23000、2300 ÷ 10 = 230'],
       ['tip', '大きな 数は 右から 4けたずつ 区切ると 読みやすいよ（3628|0000 → 三千六百二十八万）。']],
  gen(r){
    const t = r.int(0, 4);
    if(t === 0){ const a = r.int(1, 9), b = r.chance(0.3) ? 0 : r.int(1, 9), c = r.int(1, 9), v = a * 10000 + b * 1000 + c * 100;
      const parts = [[10000, a], [1000, b], [100, c]].filter(x => x[1]);
      return {q: `${parts.map(([u, k]) => `${u} を ${k}こ`).join('、')} あわせた 数は？`, form: '{0}', ans: [v],
        steps: ['くらいごとに 考えよう。', ...parts.map(([u, k]) => `${u} が ${k}こ で {{${u * k}}}`), b ? '' : '千の くらいは 0 だよ。'],
        answer: `${parts.map(([u, k]) => u * k).join(' + ')} = ${v}`,
        mis: ([G]) => G === a * 1000 + b * 100 + c * 10 || G === a * 100 + b * 10 + c ? 'くらいを たしかめよう（10000 が 1こ で 一万。5けたの 数に なるよ）' : !b && G === a * 1000 + c * 100 ? '千の くらいの 0 を わすれずに' : ''}; }
    if(t === 1){ const len = r.int(5, 8), n = r.int(10 ** (len - 1), 10 ** len - 1), k = r.int(3, len - 1), PN = ['一', '十', '百', '千', '一万', '十万', '百万', '千万'];
      const dg = Math.floor(n / 10 ** k) % 10;
      return {q: `${n} の **${PN[k]}の くらい** の 数字は？`, form: '{0}', ans: [dg],
        steps: [`右から 4けたで 区切ると ${sec4(n)}。区切りの すぐ 左が 一万の くらい`, '右から 一・十・百・千・一万・十万・百万・千万 の じゅん', `${PN[k]}の くらいは 右から ${k + 1}けため`],
        answer: `${n} の ${PN[k]}の くらいは ${dg}`,
        mis: ([G]) => [k - 1, k + 1].some(j => j >= 0 && j < len && Math.floor(n / 10 ** j) % 10 === G) ? 'となりの くらいを 見て いないかな？ 右から かぞえよう' : ''}; }
    if(t === 2){ const m = r.int(0, 2), b = m === 2 ? r.int(12, 999) * 10 : r.int(12, 999), res = m === 0 ? b * 10 : m === 1 ? b * 100 : b / 10, op = m === 2 ? '÷ 10' : `× ${m ? 100 : 10}`;
      return {q: m === 2 ? `${b} を 10 で わった 数は？` : `${b} を ${m ? 100 : 10}倍 した 数は？`, form: `${b} ${op} = {0}`, ans: [res],
        steps: [m === 2 ? '10 で わると、一の くらいの 0 が 1つ とれる。' : `${m ? 100 : 10}倍 すると、右に 0 が ${m ? 2 : 1}つ つく。`], answer: `${b} ${op} = ${res}`}; }
    if(t === 3){ const u = r.pick([1000, 10000]), a = r.int(2, 9), b = r.int(2, 9), plus = r.chance(0.6) || a <= b, k = plus ? a + b : a - b, op = plus ? '+' : MI;
      return {q: `${u === 1000 ? '何千' : '何万'}の 計算。`, form: `${a * u} ${op} ${b * u} = {0}`, ans: [k * u],
        steps: [`${u} の まとまりで 考えよう：${a * u} は ${u} が ${a}こ、${b * u} は ${u} が ${b}こ`, `${a} ${op} ${b} = {{${k}}} → ${u} が ${k}こ`], answer: `${a * u} ${op} ${b * u} = ${k * u}`}; }
    if(r.chance(0.5)){ const k = r.int(1, 9) * 10 + r.int(1, 9);
      return {q: `${k * 1000} は 1000 を 何こ あつめた 数？`, form: '{0} こ', ans: [k],
        steps: [`1000 が 10こ で 10000。${k * 1000} は 10000 が ${Math.floor(k / 10)}こ と 1000 が ${k % 10}こ`, `10000 は 1000 が 10こ だから、10 × ${Math.floor(k / 10)} + ${k % 10} = ？`], answer: `1000 が ${k}こ`}; }
    const th = r.chance(0.3) ? 0 : r.int(1, 9); let hu = r.int(0, 9); const tail = r.chance(0.5) ? r.int(1, 99) : 0; if(!th && !hu && !tail) hu = r.int(1, 9);
    const v = r.int(1, 9) * 10000 + th * 1000 + hu * 100 + tail;
    return {q: `「${kan(v)}」を 数字で 書くと？`, form: '{0}', ans: [v],
      steps: ['万の ところと、その 下の 4けたに 分けよう。', `万の ところは {{${Math.floor(v / 1e4)}}}、下の 4けたは「${kan(v % 1e4)}」→ ${String(v % 1e4).padStart(4, '0')}`], answer: `${kan(v)} = ${v}`,
      mis: ([G]) => String(G).length < String(v).length ? '0 の くらいも 書こう（下の 4けたは 0 も 入れて 4けた）' : ''};
  }});
U({id: 'g3-circle', g: 3, ic: '⚪', t: '円と球',
  ex: [['p', '円の まん中の 点が **中心**。中心から 円の まわりまで ひいた 直線が **半径**、中心を 通って まわりから まわりまで ひいた 直線が **直径**。'],
       ['p', '**直径 = 半径 × 2**。1つの 円では、半径は みんな 同じ 長さ。'],
       ['fig', () => F.circle(3, 'd', 'cm')],
       ['p', 'ボールの ように、どこから 見ても 円に 見える 形が **球**。球を 半分に 切った 切り口は 円で、その 半径・直径が 球の 半径・直径。'],
       ['eg', '直径 6cm の ボールが 3こ ぴったり ならぶ 箱の よこの 長さ：6 × 3 = 18cm'],
       ['tip', '半径が わかったら、まず 直径に して 考えよう。']],
  gen(r){
    const t = r.int(0, 3), R0 = r.int(2, 15);
    if(t === 0) return {q: `半径 ${R0}cm の 円の 直径は？`, fig: F.circle(R0, 'r', 'cm'), form: '{0} cm', ans: [2 * R0],
      steps: ['直径は 半径の 2つ分。', `${R0} × 2 = ？`], answer: `${R0} × 2 = ${2 * R0}（cm）`,
      mis: ([G]) => G * 2 === R0 ? '直径は 半径の 2倍。わるのでは なく かけるよ' : G === R0 ? '直径は 半径の 2つ分だよ' : ''};
    if(t === 1){ const ball = r.chance(0.35);
      return {q: ball ? `球を ちょうど 半分に 切ったら、切り口の 円の 直径が ${2 * R0}cm でした。この 球の 半径は？` : `直径 ${2 * R0}cm の 円の 半径は？`, fig: F.circle(R0, 'd', 'cm'), form: '{0} cm', ans: [R0],
        steps: [ball ? '半分に 切った 切り口の 円の 直径が、球の 直径。' : '', '半径は 直径の 半分。', `${2 * R0} ÷ 2 = ？`], answer: `${2 * R0} ÷ 2 = ${R0}（cm）`,
        mis: ([G]) => G === 4 * R0 ? '半径は 直径の 半分。かけるのでは なく わるよ' : G === 2 * R0 ? 'それは 直径。半径は その 半分だよ' : ''}; }
    const k = r.int(2, 5), rr = r.int(2, 9), d = 2 * rr;
    if(t === 2){ const rad = r.chance(0.5);
      return {q: `${rad ? `半径 ${rr}cm` : `直径 ${d}cm`} の ボールが ${k}こ、箱に ぴったり 1れつに 入って います。箱の 内がわの よこの 長さは？`, fig: F.balls(k), form: '{0} cm', ans: [d * k],
        steps: [rad ? `ボールの 直径は ${rr} × 2 = {{${d}}}cm` : `ボール 1この はばは 直径の ${d}cm`, `直径 ${k}こ分の 長さ：${d} × ${k} = ？`], answer: `${d} × ${k} = ${d * k}（cm）`,
        mis: ([G]) => rad && G === rr * k ? '半径では なく 直径（半径 × 2）が ならぶよ' : ''}; }
    return {q: `よこの 長さが ${d * k}cm の 箱に、同じ 大きさの ボールが ${k}こ ぴったり 1れつに 入って います。ボールの 半径は？`, fig: F.balls(k), form: '{0} cm', ans: [rr],
      steps: [`ボールの 直径 ${k}こ分が ${d * k}cm。直径は ${d * k} ÷ ${k} = {{${d}}}cm`, '半径は 直径の 半分。'], answer: `${d * k} ÷ ${k} = ${d}、${d} ÷ 2 = ${rr}（cm）`,
      mis: ([G]) => G === d ? 'それは 直径。半径は その 半分だよ' : ''};
  }});
U({id: 'g3-boxeq', g: 3, ic: '🔲', t: '□を つかった 式',
  ex: [['p', 'わからない 数を **□** に して 式に 書くと、お話の とおりの じゅんに 式が 書けます。'],
       ['eg', 'あめが □こ あって、5こ もらったら 12こ → □ + 5 = 12'],
       ['p', '□ は **たし算 ↔ ひき算**、**かけ算 ↔ わり算** の かんけいで もとめます。'],
       ['eg', '□ + 5 = 12 → □ = 12 − 5 = 7'],
       ['eg', '□ − 8 = 15 → □ = 15 + 8 = 23'],
       ['eg', '□ × 4 = 28 → □ = 28 ÷ 4 = 7'],
       ['tip', 'もとめた 数を □ に 入れて、式が 正しいか たしかめよう。']],
  gen(r){
    const t = r.int(0, 9);
    if(t >= 8){ const k = r.int(0, 3);
      if(k === 0){ const b = r.int(6, 40), x = r.int(8, 60), c = x + b;
        return {q: `あめが □こ ありました。${b}こ もらったので、ぜんぶで ${c}こに なりました。□に あてはまる 数は？`, form: `{0} + ${b} = ${c}`, ans: [x],
          fig: F.tape([{segs: [{v: x, l: 'はじめ □', q: true}, {v: b, l: `もらった ${b}`, c: 'f1'}]}], [{row: 0, from: 0, to: 2, l: `ぜんぶで ${c}こ`}]),
          steps: ['ぜんぶの 数から もらった 数を ひくと、はじめの 数。', `□ = ${c} − ${b}`], answer: `□ = ${c} − ${b} = ${x}`,
          mis: ([G]) => G === c + b ? '□ は ひき算で もとめるよ（ぜんぶ − もらった 数）' : ''}; }
      if(k === 1){ const b = r.int(50, 400), c = r.int(30, 500), x = b + c;
        return {q: `□円 もって いました。${b}円の 本を 買ったら、のこりは ${c}円に なりました。□に あてはまる 数は？`, form: `{0} − ${b} = ${c}`, ans: [x],
          fig: F.tape([{segs: [{v: b, l: `買った ${b}`, c: 'f1'}, {v: c, l: `のこり ${c}`}]}], [{row: 0, from: 0, to: 2, l: 'はじめ □円', q: true}]),
          steps: ['はじめの お金は、つかった お金と のこりを あわせた もの。', `□ = ${b} + ${c}`], answer: `□ = ${b} + ${c} = ${x}`,
          mis: ([G]) => G === Math.abs(c - b) ? '□ は たし算で もとめるよ（つかった お金 + のこり）' : ''}; }
      const b = r.int(2, 9), c = r.int(2, 9);
      if(k === 2) return {q: `同じ 数ずつ □こ 入った ふくろが ${b}ふくろ あります。あめは ぜんぶで ${b * c}こ です。□に あてはまる 数は？`, form: `{0} × ${b} = ${b * c}`, ans: [c],
        steps: ['1ふくろ分の 数 × ふくろの 数 = ぜんぶの 数', `□ = ${b * c} ÷ ${b}`], answer: `□ = ${b * c} ÷ ${b} = ${c}`,
        mis: ([G]) => G === b * c * b ? '□ は わり算で もとめるよ（ぜんぶ ÷ ふくろの 数）' : ''};
      return {q: `□まいの 色紙を ${b}人で 同じ 数ずつ 分けたら、1人 ${c}まいに なりました。□に あてはまる 数は？`, form: `{0} ÷ ${b} = ${c}`, ans: [b * c],
        steps: ['1人分 × 人数 = はじめの まい数', `□ = ${c} × ${b}`], answer: `□ = ${c} × ${b} = ${b * c}`,
        mis: ([G]) => c % b === 0 && G === c / b ? '□ は かけ算で もとめるよ（1人分 × 人数）' : ''};
    }
    const q = '□に あてはまる 数を もとめよう。';
    if(t < 4){ const big = r.int(30, 99), small = r.int(5, big - 10);
      if(t === 0){ const x = big - small; return {q, form: `{0} + ${small} = ${big}`, ans: [x], steps: [`□ に ${small} を たすと ${big}。□ は ${big} から ${small} を ひいた 数`, `□ = ${big} − ${small}`], answer: `□ = ${big} − ${small} = ${x}`, mis: ([G]) => G === big + small ? 'たし算の □ は ひき算で もとめるよ' : ''}; }
      if(t === 1){ const x = big - small; return {q, form: `${small} + {0} = ${big}`, ans: [x], steps: [`${small} に □ を たすと ${big}。□ は ${big} から ${small} を ひいた 数`, `□ = ${big} − ${small}`], answer: `□ = ${big} − ${small} = ${x}`, mis: ([G]) => G === big + small ? 'たし算の □ は ひき算で もとめるよ' : ''}; }
      if(t === 2){ const x = big + small; return {q, form: `{0} − ${small} = ${big}`, ans: [x], steps: [`□ から ${small} を ひくと ${big}。□ は ${big} に ${small} を たした 数`, `□ = ${big} + ${small}`], answer: `□ = ${big} + ${small} = ${x}`, mis: ([G]) => G === big - small ? 'ひかれる 数（□）は たし算で もとめるよ' : ''}; }
      const x = big - small; return {q, form: `${big} − {0} = ${small}`, ans: [x], steps: [`${big} から □ を ひくと ${small}。□ は ${big} と ${small} の ちがい`, `□ = ${big} − ${small}`], answer: `□ = ${big} − ${small} = ${x}`, mis: ([G]) => G === big + small ? `□ は ひき算（${big} − ${small}）で もとめるよ` : ''};
    }
    const a = r.int(2, 9), b = r.int(2, 9), c = a * b;
    if(t === 4) return {q, form: `{0} × ${b} = ${c}`, ans: [a], steps: [`□ の ${b}こ分が ${c}。□ は ${c} を ${b} で わった 数`, `□ = ${c} ÷ ${b}`], answer: `□ = ${c} ÷ ${b} = ${a}`, mis: ([G]) => G === c * b ? 'かけ算の □ は わり算で もとめるよ' : ''};
    if(t === 5) return {q, form: `${a} × {0} = ${c}`, ans: [b], steps: [`${a} の □こ分が ${c}。□ は ${c} を ${a} で わった 数`, `□ = ${c} ÷ ${a}`], answer: `□ = ${c} ÷ ${a} = ${b}`, mis: ([G]) => G === c * a ? 'かけ算の □ は わり算で もとめるよ' : ''};
    if(t === 6) return {q, form: `{0} ÷ ${b} = ${a}`, ans: [c], steps: [`□ を ${b} で わると ${a}。□ は ${a} の ${b}こ分`, `□ = ${a} × ${b}`], answer: `□ = ${a} × ${b} = ${c}`, mis: ([G]) => a % b === 0 && G === a / b ? 'わられる 数（□）は かけ算で もとめるよ' : ''};
    return {q, form: `${c} ÷ {0} = ${a}`, ans: [b], steps: [`${c} を □ で わると ${a}。□ は ${c} を ${a} で わった 数`, `□ = ${c} ÷ ${a}`], answer: `□ = ${c} ÷ ${a} = ${b}`, mis: ([G]) => G === c * a ? '□ は わり算（ぜんぶ ÷ 1つ分）で もとめるよ' : ''};
  }});
/* ぼうグラフの テーマ（名前は 4字まで） */
const BARS = [
  {t: 'すきな くだもの', u: '人', c: ['りんご', 'みかん', 'いちご', 'バナナ', 'ぶどう']},
  {t: '保健室に 来た 人の けが', u: '人', c: ['すりきず', '切りきず', 'ねんざ', 'つき指', 'うちみ']},
  {t: '図書室で かりられた 本', u: 'さつ', c: ['物語', '図かん', '絵本', '詩集', 'まんが']},
  {t: '学校の 前を 通った 車', u: '台', c: ['ふつう車', 'トラック', 'バス', 'バイク', 'タクシー']},
  {t: 'すきな きせつ', u: '人', c: ['春', '夏', '秋', '冬']},
];
U({id: 'g3-bargraph', g: 3, ic: '📊', t: 'ぼうグラフ',
  ex: [['p', '**ぼうグラフ** は、ぼうの 長さで 数の 大きさを あらわします。'],
       ['fig', () => F.bars(['りんご', 'みかん', 'いちご', 'バナナ'], [8, 5, 11, 3], 1, '人')],
       ['p', 'まず **1目もりの 大きさ** を たしかめます。上の グラフは 5目もりで 5人 なので、1目もりは 1人。'],
       ['eg', 'いちごの ぼうは 11目もり → 11人'],
       ['tip', '1目もりが 2 や 10 の ときも あるよ。目もりの 数 × 1目もりの 大きさ で 読もう。']],
  gen(r){
    const th = r.pick(BARS), n = Math.min(th.c.length, r.int(4, 5)), u = r.pick([1, 2, 2, 5, 10]), ks = distinct(r, n, 1, 16), vals = ks.map(k => k * u), un = th.u;
    const many = Math.max(...ks) >= 6, fig = F.bars(th.c.slice(0, n), vals, u, un), head = `「${th.t}」を しらべた ぼうグラフです。`;
    const readU = many ? `目もり 5つで ${5 * u}${un} → 1目もりは {{${u}}}${un}` : '目もりの 数を 読もう。';
    const at = i => u === 1 ? `${th.c[i]} の ぼうは ${ks[i]}目もり` : `${th.c[i]} の ぼうは ${ks[i]}目もり → ${u} × ${ks[i]}`;
    let t = r.int(0, 4); if(t === 1 && (!many || u === 1)) t = 0;
    if(t === 0){ const i = r.int(0, n - 1);
      return {q: head + `${th.c[i]} は 何${un}？`, fig, form: `{0} ${un}`, ans: [vals[i]], steps: [readU, at(i)], answer: `${th.c[i]} は ${vals[i]}${un}`,
        mis: ([G]) => u > 1 && G === ks[i] ? `目もりの 数では なく、1目もりの 大きさ（${u}${un}）で 読もう` : ''}; }
    if(t === 1) return {q: head + `たての じくの 1目もりは 何${un}？`, fig, form: `{0} ${un}`, ans: [u],
      steps: ['数が 書いて ある 目もりを 2つ 見よう。', `0 から ${5 * u} まで 目もりが 5つ`, `${5 * u} ÷ 5 = ？`], answer: `${5 * u} ÷ 5 = ${u}（${un}）`,
      mis: ([G]) => G === 5 * u ? '数が 書いて ある 目もりの 間を 5つに 分けて いるよ' : ''};
    if(t === 2){ const [i, j] = r.shuffle([...Array(n).keys()]).slice(0, 2).sort((x, y) => vals[y] - vals[x]);
      return {q: head + `${th.c[i]} は ${th.c[j]} より 何${un} 多い？`, fig, form: `{0} ${un}`, ans: [vals[i] - vals[j]],
        steps: [readU, `${th.c[i]} は {{${vals[i]}}}${un}、${th.c[j]} は {{${vals[j]}}}${un}`, `ちがいは ひき算：${vals[i]} − ${vals[j]} = ？`], answer: `${vals[i]} − ${vals[j]} = ${vals[i] - vals[j]}（${un}）`,
        mis: ([G]) => G === vals[i] + vals[j] ? 'ちがいは ひき算だよ' : u > 1 && G === ks[i] - ks[j] ? `目もりの 数の ちがいに 1目もりの 大きさ（${u}）を かけよう` : ''}; }
    if(t === 3){ const mx = Math.max(...vals), i = vals.indexOf(mx);
      return {q: head + 'いちばん 多い ものは 何' + un + '？', fig, form: `{0} ${un}`, ans: [mx],
        steps: ['いちばん 長い ぼうを さがそう。', `いちばん 長いのは ${th.c[i]}。${readU}`, at(i)], answer: `${th.c[i]} の ${mx}${un}`,
        mis: ([G]) => G === Math.min(...vals) ? 'いちばん 長い ぼうだよ' : u > 1 && G === ks[i] ? `1目もりは ${u}${un} だよ` : ''}; }
    const sum = vals.reduce((a, b) => a + b, 0);
    return {q: head + `ぜんぶで 何${un}？`, fig, form: `{0} ${un}`, ans: [sum],
      steps: [readU, `${th.c.slice(0, n).join('・')} を じゅんに 読むと ${vals.join('、')}`, `${vals.join(' + ')} = ？`], answer: `${vals.join(' + ')} = ${sum}（${un}）`,
      mis: ([G]) => u > 1 && G === ks.reduce((a, b) => a + b, 0) ? `目もりの 数では なく、${un}に なおして たそう（1目もり = ${u}${un}）` : ''};
  }});

/* ════════════ 小学4年 ════════════ */
U({id: 'g4-oku', g: 4, ic: '🌏', t: '大きな数（億・兆）',
  ex: [['p', '千万の 10倍が **一億（100000000）**。千億の 10倍が **一兆**。数は 右から **4けたごと** に 万・億・兆 と 区切ります。'],
       ['eg', '352000000 → 3|5200|0000 → 3億5200万'],
       ['eg', '1億を 2こ、1000万を 4こ → 2億4000万'],
       ['p', '10倍 すると くらいが 1つ 上がり、10 で わると 1つ 下がります。'],
       ['eg', '1万 × 1万 = 1億、1億 × 1万 = 1兆'],
       ['tip', '万の 1万倍が 億、億の 1万倍が 兆 だよ。']],
  gen(r){
    const t = r.int(0, 5);
    if(t === 0){ const a = r.int(1, 9), b = r.int(1, 9), c = r.chance(0.5) ? r.int(1, 9) : 0, m = b * 1000 + c * 100;
      return {q: `1億を ${a}こ、1000万を ${b}こ${c ? `、100万を ${c}こ` : ''} あわせた 数は？`, form: '{0}億{1}万', ans: [a, m],
        steps: ['億の ところと 万の ところに 分けて 考えよう。', `1億が ${a}こ → {{${a}}}億`, `1000万が ${b}こ で ${b * 1000}万${c ? `、100万が ${c}こ で ${c * 100}万` : ''}`], answer: `${a}億${m}万`,
        mis: ([A, M]) => A === a && (M === b * 100 + c * 10 || M === b * 10 + c) ? '1000万が 1こ で「1000万」。万の ところは 4けた だよ' : ''}; }
    if(t === 1 || t === 2){ const a = r.int(1, 99), m = r.int(1, 999) * r.pick([10, 10, 1]), n = a * 1e8 + m * 1e4;
      if(t === 1) return {q: `${n} を「〇億〇万」の 形で 書くと？`, form: '{0}億{1}万', ans: [a, m],
        steps: ['右から 4けたずつ 区切ろう。', `${sec4(n)}`, 'いちばん 右の 4けたは 0000。その 左の 4けたが 万、その 左が 億'], answer: `${n} = ${a}億${m}万`,
        mis: ([A, M]) => M === a && A === m ? '億と 万が 入れかわって いるよ' : ''};
      return {q: `${a}億${m}万 を 数字だけで 書くと？`, form: '{0}', ans: [n],
        steps: [`万の ところ ${m} は 4けたに して ${String(m).padStart(4, '0')}`, `その 右に 一の ところの 0000 を つける`, `${a}|${String(m).padStart(4, '0')}|0000`], answer: `${a}億${m}万 = ${n}`,
        mis: ([G]) => String(G).length !== String(n).length ? '万の ところも 一の ところも 4けたずつ（0 も 書く）だよ' : ''}; }
    if(t === 3){ const k = r.int(0, 3), a = r.int(2, 9);
      const Q = [[`${a}億 を 10倍 した 数は？`, '{0}億', a * 10, `10倍 すると くらいが 1つ 上がる：${a}億 → ？億`, `${a}億 × 10 = ${a * 10}億`],
                 [`${a}000万 を 10倍 した 数は？`, '{0}億', a, `1000万の 10倍は 1億。${a}000万の 10倍は ？億`, `${a}000万 × 10 = ${a}億`],
                 [`${a}0億 を 10 で わった 数は？`, '{0}億', a, `10 で わると くらいが 1つ 下がる：${a}0億 → ？億`, `${a}0億 ÷ 10 = ${a}億`],
                 [`${a}000億 を 10倍 した 数は？`, '{0}兆', a, `1000億の 10倍は 1兆。${a}000億の 10倍は ？兆`, `${a}000億 × 10 = ${a}兆`]][k];
      return {q: Q[0], form: Q[1], ans: [Q[2]], steps: [Q[3]], answer: Q[4],
        mis: ([G]) => k !== 2 && G === Q[2] * 10 || k === 2 && G === a * 100 ? '0 の 数（くらい）を たしかめよう' : ''}; }
    if(t === 4){ const k = r.int(0, 2), a = r.int(2, 9), b = r.int(1, 9);
      if(k === 0) return {q: `${a}億 は 1000万を 何こ あつめた 数？`, form: '{0} こ', ans: [a * 10], steps: ['1000万を 10こ あつめると 1億', `${a}億 は 1000万が 10 × ${a} こ`], answer: `1000万が ${a * 10}こ`,
        mis: ([G]) => G === a ? '1億 は 1000万が 10こ だよ' : ''};
      if(k === 1) return {q: `${a}兆${b}000億 は 1億を 何こ あつめた 数？`, form: '{0} こ', ans: [a * 10000 + b * 1000],
        steps: ['1兆 は 1億が 10000こ', `${a}兆 → 1億が {{${a * 10000}}}こ、${b}000億 → 1億が {{${b * 1000}}}こ`], answer: `1億が ${a * 10000 + b * 1000}こ`,
        mis: ([G]) => G === a * 1000 + b * 100 || G === a * 10 + b ? '1兆 は 1億の 10000倍 だよ' : ''};
      const big = r.chance(0.5);
      return {q: big ? '1兆 は 1億の 何倍？' : '1億 は 1万の 何倍？', form: '{0} 倍', ans: [10000], steps: [big ? '1億 = 1|0000|0000、1兆 = 1|0000|0000|0000' : '1万 = 1|0000、1億 = 1|0000|0000', '0 が 4つ ふえて いる → 10 × 10 × 10 × 10'], answer: '10000倍',
        mis: ([G]) => G === 1000 || G === 100000 ? '4けたずつ 区切ると、ちょうど 1区切り ちがうよ（10000倍）' : ''};
    }
    const k = r.int(0, 2), a = r.int(1, 9), b = r.int(2, 9);
    if(k === 0) return {q: '大きな 数の かけ算。', form: `${a}万 × ${b}万 = {0}億`, ans: [a * b], steps: ['1万 × 1万 = 1億（0 が 4つ + 4つ = 8つ）', `${a} × ${b} = {{${a * b}}}`], answer: `${a}万 × ${b}万 = ${a * b}億`,
      mis: ([G]) => G === a * b * 10000 ? '1万 × 1万 は 1億。答えは「何億」で' : ''};
    if(k === 1) return {q: '大きな 数の かけ算。', form: `${a}億 × ${b}万 = {0}兆`, ans: [a * b], steps: ['1億 × 1万 = 1兆（0 が 8つ + 4つ = 12こ）', `${a} × ${b} = {{${a * b}}}`], answer: `${a}億 × ${b}万 = ${a * b}兆`};
    return {q: '大きな 数の かけ算。', form: `${a}00万 × ${b}00 = {0}億`, ans: [a * b], steps: ['100万 × 100 = 1億', `${a} × ${b} = {{${a * b}}}`], answer: `${a}00万 × ${b}00 = ${a * b}億`};
  }});
U({id: 'g4-areaunit', g: 4, ic: '🗾', t: '面積の たんい（m²・a・ha・km²）',
  ex: [['p', '1辺が 1m の 正方形の 面積が **1m²**。1m = 100cm なので **1m² = 100 × 100 = 10000cm²**。'],
       ['p', '1辺 10m の 正方形が **1a（アール）= 100m²**。1辺 100m の 正方形が **1ha（ヘクタール）= 10000m²**。1辺 1km の 正方形が **1km² = 1000000m²**。'],
       ['eg', 'たて 20m、よこ 30m の 畑：20 × 30 = 600m² = 6a'],
       ['eg', '1km² = 100ha、1ha = 100a'],
       ['tip', '1辺の 長さが 10倍に なると、面積は 100倍。']],
  gen(r){
    const t = r.int(0, 5), k = r.int(2, 9), q = '面積の たんいを なおそう。';
    if(t === 0) return {q, form: `${k}m² = {0}cm²`, ans: [k * 10000], steps: ['1m = 100cm だから、1m² = 100cm × 100cm = {{10000}}cm²', `${k}m² = 10000cm² × ${k}`], answer: `${k}m² = ${k * 10000}cm²`,
      mis: ([G]) => G === k * 100 ? '1m² は 100cm × 100cm で 10000cm² だよ' : ''};
    if(t === 1){ const n = r.int(2, 30); return {q, form: `${n}a = {0}m²`, ans: [n * 100], steps: ['1a は 1辺 10m の 正方形：10 × 10 = {{100}}m²', `${n}a = 100m² × ${n}`], answer: `${n}a = ${n * 100}m²`,
      mis: ([G]) => G === n * 10 ? '1a は 10m × 10m で 100m² だよ' : ''}; }
    if(t === 2){ const toA = r.chance(0.5);
      return toA ? {q, form: `${k}ha = {0}a`, ans: [k * 100], steps: ['1ha = 10000m²、1a = 100m²', '1ha は 1a の {{100}}倍', `${k}ha = 100a × ${k}`], answer: `${k}ha = ${k * 100}a`, mis: ([G]) => G === k * 10000 ? 'それは m² の 数。a に なおそう（100m² で 1a）' : ''}
                 : {q, form: `${k}ha = {0}m²`, ans: [k * 10000], steps: ['1ha は 1辺 100m の 正方形：100 × 100 = {{10000}}m²', `${k}ha = 10000m² × ${k}`], answer: `${k}ha = ${k * 10000}m²`, mis: ([G]) => G === k * 100 ? '1ha は 100m × 100m で 10000m² だよ' : ''}; }
    if(t === 3){ const toHa = r.chance(0.6);
      return toHa ? {q, form: `${k}km² = {0}ha`, ans: [k * 100], steps: ['1km² は 1辺 1000m。1ha は 1辺 100m', '1辺が 10倍 → 面積は {{100}}倍', `${k}km² = 100ha × ${k}`], answer: `${k}km² = ${k * 100}ha`}
                  : {q, form: `${k}km² = {0}m²`, ans: [k * 1000000], steps: ['1km = 1000m だから、1km² = 1000m × 1000m = {{1000000}}m²', `${k}km² = 1000000m² × ${k}`], answer: `${k}km² = ${k * 1000000}m²`,
                     mis: ([G]) => G === k * 1000 ? '1km² は 1000m × 1000m。0 が 6つ だよ' : ''}; }
    if(t === 4){ const a = r.int(1, 6) * 10, b = r.int(2, 9) * 10, m2 = a * b;
      return {q: `たて ${a}m、よこ ${b}m の 長方形の 畑の 面積は 何a？`, fig: F.rect(b, a, 'm'), form: '{0} a', ans: [m2 / 100],
        steps: [`まず m² で：${a} × ${b} = {{${m2}}}m²`, '100m² で 1a', `${m2} ÷ 100 = ？`], answer: `${a} × ${b} = ${m2}（m²）= ${m2 / 100}a`,
        mis: ([G]) => G === m2 ? 'それは m² の 数。100m² で 1a に なおそう' : G === m2 / 10000 ? '1a = 100m² だよ' : ''}; }
    const a = r.int(1, 5) * 100, b = r.int(2, 9) * 100, m2 = a * b;
    return {q: `たて ${a}m、よこ ${b}m の 長方形の 土地の 面積は 何ha？`, fig: F.rect(b, a, 'm'), form: '{0} ha', ans: [m2 / 10000],
      steps: [`まず m² で：${a} × ${b} = {{${m2}}}m²`, '10000m² で 1ha', `${m2} ÷ 10000 = ？`], answer: `${a} × ${b} = ${m2}（m²）= ${m2 / 10000}ha`,
      mis: ([G]) => G === m2 / 100 ? 'それは a の 数。1ha = 10000m² だよ' : ''};
  }});
/* 折れ線グラフ：月ごとの 気温（1目もり 2度・偶数）か、植物の 高さ（週ごと） */
const TEMP0 = [5, 6, 9, 14, 19, 22, 26, 27, 23, 18, 12, 8];
function lineData(r){
  for(let tries = 0; tries < 80; tries++){
    if(r.chance(0.6)){
      const s = r.pick([0.8, 0.9, 1, 1.05]), o = r.pick([-1, 1, 3]), v = TEMP0.map(x => Math.max(0, 2 * Math.round((x * s + o + r.int(-1, 1)) / 2)));
      const d = v.slice(1).map((x, i) => x - v[i]), mx = Math.max(...v), up = Math.max(...d);
      if(mx > 30 || v.filter(x => x === mx).length > 1 || d.filter(x => x === up).length > 1 || v.filter(x => x === Math.min(...v)).length > 1) continue;
      return {temp: true, v, lab: v.map((_, i) => String(i + 1)), un: '度', xu: '月', name: m => `${m}月`, nm: '気温', u: 2};
    }
    const v = [r.int(1, 3) * 2]; for(let i = 1; i < 7; i++) v.push(v[i - 1] + r.pick([2, 2, 4, 4, 6]));
    const d = v.slice(1).map((x, i) => x - v[i]), up = Math.max(...d);
    if(v[6] > 30 || d.filter(x => x === up).length > 1) continue;
    return {temp: false, v, lab: v.map((_, i) => String(i + 1)), un: 'cm', xu: '週目', name: w => `${w}週目`, nm: 'ヒマワリの 高さ', u: 2};
  }
  return {temp: true, v: [4, 6, 8, 14, 18, 22, 26, 28, 24, 18, 12, 6], lab: TEMP0.map((_, i) => String(i + 1)), un: '度', xu: '月', name: m => `${m}月`, nm: '気温', u: 2};
}
U({id: 'g4-linegraph', g: 4, ic: '📈', t: '折れ線グラフ',
  ex: [['p', '**折れ線グラフ** は、気温の ように **かわって いく ようす** を あらわします。'],
       ['fig', () => F.lines(TEMP0.map((_, i) => String(i + 1)), [6, 6, 10, 14, 20, 22, 26, 28, 24, 18, 12, 8], 2, '度', '月')],
       ['p', '線が **右上がり** なら ふえて いる（上がって いる）、**右下がり** なら へって いる。かたむきが 急な ほど、かわり方が 大きい。'],
       ['eg', '4月から 5月：14度 → 20度。6度 上がった'],
       ['tip', 'ぼうグラフは 大きさを くらべる とき、折れ線グラフは かわり方を 見る ときに つかうよ。']],
  gen(r){
    const D = lineData(r), v = D.v, n = v.length, fig = F.lines(D.lab, v, D.u, D.un, D.xu), head = `${D.temp ? 'ある 町の 1年間の 気温' : 'ヒマワリの 高さ'}を あらわした 折れ線グラフです。`;
    const readU = `たての じくは 5目もりで 10${D.un} → 1目もりは {{2}}${D.un}`;
    const d = v.slice(1).map((x, i) => x - v[i]);
    let t = r.int(0, 4); if(t === 1 && !D.temp) t = 3;
    if(t === 0){ const i = r.int(0, n - 1);
      return {q: head + `${D.name(i + 1)}の ${D.nm}は 何${D.un}？`, fig, form: `{0} ${D.un}`, ans: [v[i]], steps: [readU, `${D.name(i + 1)}の 点は ${v[i] / 2}目もりの ところ`, `2 × ${v[i] / 2} = ？`], answer: `${D.name(i + 1)}は ${v[i]}${D.un}`,
        mis: ([G]) => G === v[i] / 2 ? '目もりの 数では なく、1目もり 2' + D.un + ' で 読もう' : ''}; }
    if(t === 1){ const hi = r.chance(0.6), want = hi ? Math.max(...v) : Math.min(...v), i = v.indexOf(want);
      return {q: head + `${D.nm}が いちばん ${hi ? '高い' : '低い'}のは 何月？`, fig, form: '{0}月', ans: [i + 1], steps: [`点が いちばん ${hi ? '上' : '下'}に ある ところを さがそう。`, `その 点の 下の じくの 数を 読もう（${want}${D.un}）`], answer: `${i + 1}月（${want}${D.un}）`,
        mis: ([G]) => G === v.indexOf(hi ? Math.min(...v) : Math.max(...v)) + 1 ? `いちばん ${hi ? '高い' : '低い'} ところだよ` : ''}; }
    if(t === 2){ const nz = d.map((x, i) => i).filter(i => d[i] !== 0), i = r.pick(nz), x = d[i], upw = x > 0, verb = D.temp ? (upw ? '上がった' : '下がった') : 'のびた';
      return {q: head + `${D.name(i + 1)}から ${D.name(i + 2)}で、${D.nm}は 何${D.un} ${verb}？`, fig, form: `{0} ${D.un}`, ans: [Math.abs(x)],
        steps: [readU, `${D.name(i + 1)}は {{${v[i]}}}${D.un}、${D.name(i + 2)}は {{${v[i + 1]}}}${D.un}`, `${Math.max(v[i], v[i + 1])} − ${Math.min(v[i], v[i + 1])} = ？`], answer: `${Math.max(v[i], v[i + 1])} − ${Math.min(v[i], v[i + 1])} = ${Math.abs(x)}（${D.un}）`,
        mis: ([G]) => G === Math.abs(x) / 2 ? `1目もりは 2${D.un} だよ` : G === v[i] + v[i + 1] ? 'かわり方は ひき算で' : ''}; }
    if(t === 3){ const up = Math.max(...d), i = d.indexOf(up), dn = Math.min(...d), j = d.indexOf(dn);
      const form = D.temp ? '{0}月から {1}月' : '{0}週目から {1}週目';
      return {q: head + `${D.temp ? '気温の 上がり方' : 'のび方'}が いちばん 大きいのは、どこから どこの 間？`, fig, form, ans: [i + 1, i + 2],
        steps: ['線の かたむきが いちばん 急な 右上がりの ところを さがそう。', `${D.name(i + 1)}から ${D.name(i + 2)}は ${v[i]}${D.un} → ${v[i + 1]}${D.un} で ${up}${D.un} ${D.temp ? '上がって いる' : 'のびて いる'}`], answer: `${D.name(i + 1)}から ${D.name(i + 2)}（${up}${D.un}）`,
        mis: ([A, B]) => D.temp && dn < 0 && A === j + 1 && B === j + 2 ? 'そこは 下がり方が 大きい ところ。右上がりの 線を 見よう' : B !== A + 1 ? 'となりどうしの 間で くらべよう' : ''}; }
    return {q: head + `たての じくの 1目もりは 何${D.un}？`, fig, form: `{0} ${D.un}`, ans: [2], steps: ['数が 書いて ある 目もりを 2つ 見よう。', `0 から 10 まで 目もりが 5つ`, '10 ÷ 5 = ？'], answer: `10 ÷ 5 = 2（${D.un}）`,
      mis: ([G]) => G === 10 || G === 5 ? '数が 書いて ある 目もりの 間を 5つに 分けて いるよ' : ''};
  }});
U({id: 'g4-perp', g: 4, ic: '📐', t: '垂直・平行と 四角形',
  ex: [['p', '2本の 直線が 直角に 交わる とき、**垂直** と いいます。1本の 直線に 垂直な 2本の 直線は **平行** です。'],
       ['p', '平行な 直線は、ほかの 直線と **同じ 角度で 交わり** ます。'],
       ['fig', () => F.parallel(65, 'same')],
       ['p', '**平行四辺形**：向かい合った 2組の 辺が 平行。向かい合った 辺の 長さ・角の 大きさが 同じ。**ひし形**：4つの 辺の 長さが みんな 同じ。'],
       ['fig', () => F.pgram(70, {A: '70°', B: '110°', C: '70°', D: '110°'})],
       ['eg', '平行四辺形の 1つの 角が 70° → となりの 角は 180° − 70° = 110°'],
       ['tip', '一直線の 角は 180° だよ。']],
  gen(r){
    const t = r.int(0, 3), a = r.pick([40, 45, 50, 55, 60, 65, 70, 75, 80, 100, 105, 110, 115, 120, 125, 130]), q0 = '直線アと 直線イは 平行です。? の 角度は？';
    if(t === 0) return {q: q0, fig: F.parallel(a, 'same'), form: '{0}°', ans: [a],
      steps: ['平行な 直線は、ほかの 直線と 同じ 角度で 交わる。', `上の 交わりの ${a}° と、下の 交わりの ? は 同じ 位置の 角`], answer: `${a}°`,
      mis: ([G]) => G === 180 - a ? 'となりの 角では なく、同じ 位置の 角を 見よう' : ''};
    if(t === 1) return {q: q0, fig: F.parallel(a, 'line'), form: '{0}°', ans: [180 - a],
      steps: ['? と ' + a + '° を あわせると 一直線。', '一直線の 角は {{180}}°', `180 − ${a} = ？`], answer: `180° − ${a}° = ${180 - a}°`,
      mis: ([G]) => G === a ? `? は ${a}° の となりの 角。あわせて 180° だよ` : ''};
    const b = r.pick([50, 55, 60, 65, 70, 75, 80, 100, 110, 115, 120]);
    if(t === 2){ const adj = r.chance(0.5);
      return {q: `平行四辺形の ? の 角度は？`, fig: F.pgram(b, adj ? {A: b + '°', B: '?'} : {A: b + '°', C: '?'}), form: '{0}°', ans: [adj ? 180 - b : b],
        steps: adj ? ['平行四辺形の となり合った 角を たすと 180°', `180 − ${b} = ？`] : ['平行四辺形の 向かい合った 角は 同じ 大きさ。'], answer: adj ? `180° − ${b}° = ${180 - b}°` : `向かい合った 角なので ${b}°`,
        mis: ([G]) => adj && G === b ? 'となり合った 角は 同じでは ないよ。あわせて 180°' : !adj && G === 180 - b ? '向かい合った 角は 同じ 大きさだよ' : ''}; }
    if(r.chance(0.5)){ const B0 = r.int(5, 15), s = r.int(3, B0 - 1);
      return {q: `平行四辺形の まわりの 長さは？`, fig: F.pgram(b, {b: B0 + 'cm', s: s + 'cm'}), form: '{0} cm', ans: [2 * (B0 + s)],
        steps: ['平行四辺形は、向かい合った 辺の 長さが 同じ。辺は 4本。', `${B0} + ${s} = {{${B0 + s}}}、それが 2つ分`], answer: `(${B0} + ${s}) × 2 = ${2 * (B0 + s)}（cm）`,
        mis: ([G]) => G === B0 + s ? '辺は 4本 あるよ' : G === B0 * s ? 'まわりの 長さは 辺の 長さを たすよ' : ''}; }
    const s = r.int(3, 15);
    return {q: `1辺が ${s}cm の ひし形の まわりの 長さは？`, fig: F.pgram(60, {b: s + 'cm'}, true), form: '{0} cm', ans: [4 * s],
      steps: ['ひし形は、4つの 辺の 長さが みんな 同じ。', `${s} × 4 = ？`], answer: `${s} × 4 = ${4 * s}（cm）`,
      mis: ([G]) => G === 2 * s ? '辺は 4本 あるよ' : G === s * s ? 'まわりの 長さは 辺の 長さを たすよ' : ''};
  }});

/* ════════════ 小学5年 ════════════ */
U({id: 'g5-perunit', g: 5, ic: '🚃', t: '単位量あたりの 大きさ',
  ex: [['p', '「1m² あたり」「1L あたり」「1こ あたり」の ように、**1 あたりの 大きさ** に そろえると くらべられます。'],
       ['eg', '6m² に 9人 → 1m² あたり 9 ÷ 6 = 1.5人（こみぐあい）'],
       ['eg', '人口 24000人、面積 30km² の 町 → **人口密度**（1km² あたりの 人口）は 24000 ÷ 30 = 800人'],
       ['eg', '1L で 15km 走る 車は、8L で 15 × 8 = 120km'],
       ['tip', '「何 あたり」かを 見て、その 数で わろう。']],
  gen(r){
    const t = r.int(0, 5);
    if(t === 0){ let A, P; do { A = r.pick([4, 5, 6, 8, 10, 12, 15, 16, 20, 25]); P = r.int(A, 3 * A); } while((P * 100) % A !== 0 || P === A);
      const v = decStr(P * 100 / A, 2);
      return {q: `${A}m² の へやに ${P}人 います。1m² あたり 何人？`, form: '{0} 人', ans: [v], kinds: ['d'],
        steps: ['1m² あたりの 人数 = 人数 ÷ 面積（m²）', `${P} ÷ ${A} = ？`], answer: `${P} ÷ ${A} = ${v}（人）`,
        mis: ([G]) => H.is(G, A / P) ? 'わる じゅんが ぎゃく。人数 ÷ 面積 だよ' : H.is(G, P * A) ? '1m² あたりは わり算で もとめるよ' : ''}; }
    if(t === 1){ const A = r.int(12, 90), dn = r.int(5, 200) * 10, P = A * dn;
      return {q: `人口 ${P}人、面積 ${A}km² の 町の 人口密度は？（1km² あたりの 人口）`, form: '{0} 人', ans: [dn],
        steps: ['人口密度 = 人口 ÷ 面積（km²）', `${P} ÷ ${A} = ？`], answer: `${P} ÷ ${A} = ${dn}（人）`,
        mis: ([G]) => G === P * A ? '人口密度は わり算（人口 ÷ 面積）だよ' : ''}; }
    const k = r.int(8, 25), L = r.int(3, 40);
    if(t === 2) return {q: `${L}L の ガソリンで ${k * L}km 走る 車は、1L あたり 何km 走る？`, form: '{0} km', ans: [k],
      steps: ['1L あたりの 道のり = 道のり ÷ ガソリンの 量', `${k * L} ÷ ${L} = ？`], answer: `${k * L} ÷ ${L} = ${k}（km）`,
      mis: ([G]) => G === k * L * L ? '1L あたりは わり算で もとめるよ' : ''};
    if(t === 3) return {q: `1L あたり ${k}km 走る 車は、${L}L の ガソリンで 何km 走る？`, form: '{0} km', ans: [k * L],
      steps: ['道のり = 1L あたりの 道のり × ガソリンの 量', `${k} × ${L} = ？`], answer: `${k} × ${L} = ${k * L}（km）`,
      mis: ([G]) => G === k + L ? `${L}L 分だから かけ算だよ` : ''};
    if(t === 4) return {q: `1L あたり ${k}km 走る 車で ${k * L}km 走るには、ガソリンが 何L いる？`, form: '{0} L', ans: [L],
      steps: ['ガソリンの 量 = 道のり ÷ 1L あたりの 道のり', `${k * L} ÷ ${k} = ？`], answer: `${k * L} ÷ ${k} = ${L}（L）`,
      mis: ([G]) => G === k * L * k ? 'ガソリンの 量は わり算で もとめるよ' : ''};
    const L1 = r.int(10, 30), L2 = r.int(10, 30), k1 = r.int(10, 20); let k2 = r.int(10, 20); if(k2 === k1) k2 = k1 + r.pick([-2, 2, 3]);
    return {q: `Aの 車は ${L1}L で ${k1 * L1}km、Bの 車は ${L2}L で ${k2 * L2}km 走ります。1L あたりで くらべると、何km ちがう？`, form: '{0} km', ans: [Math.abs(k1 - k2)],
      steps: ['それぞれ 1L あたり 何km 走るかを もとめよう。', `A：${k1 * L1} ÷ ${L1} = {{${k1}}}km、B：${k2 * L2} ÷ ${L2} = {{${k2}}}km`, `${Math.max(k1, k2)} − ${Math.min(k1, k2)} = ？`], answer: `1L あたり Aは ${k1}km、Bは ${k2}km → ${Math.abs(k1 - k2)}km ちがう`,
      mis: ([G]) => G === Math.abs(k1 * L1 - k2 * L2) ? 'そのまま ひかずに、1L あたりに そろえて くらべよう' : ''};
  }});
/* 帯グラフ・円グラフの テーマ（名前は 2字まで。その他は さいご） */
const PARTS = [
  {t: 'すきな 動物', u: '人', c: ['犬', 'ねこ', '鳥', '金魚']},
  {t: 'すきな 色', u: '人', c: ['青', '赤', '緑', '黄']},
  {t: 'すきな きせつ', u: '人', c: ['夏', '春', '秋', '冬']},
  {t: '図書室の 本', u: 'さつ', c: ['物語', '科学', '絵本', '詩']},
  {t: '町の 土地の 使われ方', u: 'ha', c: ['住宅', '畑', '林', '田']},
];
function partsData(r){
  for(let tries = 0; tries < 300; tries++){
    const th = r.pick(PARTS), k = r.int(3, 4), other = r.pick([5, 10, 10, 15]), rest = 100 - other;
    const ps = []; let left = rest;
    for(let i = 0; i < k - 1; i++){ const p = r.int(3, Math.min(10, Math.floor(left / 5) - 3 * (k - 1 - i))) * 5; ps.push(p); left -= p; }
    ps.push(left); ps.sort((a, b) => b - a);
    if(ps.some(p => p < 15) || new Set(ps).size < k || ps[k - 1] <= other && other === 15) continue;
    return {th, parts: th.c.slice(0, k).map((n, i) => ({n, p: ps[i]})).concat([{n: 'その他', p: other}])};
  }
  return {th: PARTS[0], parts: [{n: '犬', p: 35}, {n: 'ねこ', p: 30}, {n: '鳥', p: 20}, {n: 'その他', p: 15}]};
}
U({id: 'g5-graph', g: 5, ic: '🥧', t: '帯グラフと 円グラフ',
  ex: [['p', '全体を 100% と して、それぞれの **割合** を 長方形で あらわしたのが **帯グラフ**、円で あらわしたのが **円グラフ**。'],
       ['fig', () => F.band([{n: '犬', p: 35}, {n: 'ねこ', p: 30}, {n: '鳥', p: 20}, {n: 'その他', p: 15}])],
       ['p', '目もりを 読むと 割合が わかります。割合が わかれば、**全体 × 割合** で その 数が もとめられます。'],
       ['eg', '全体が 200人 で 犬が 35% → 200 × 0.35 = 70人'],
       ['fig', () => F.pie([{n: '夏', p: 40}, {n: '春', p: 30}, {n: '秋', p: 20}, {n: 'その他', p: 10}])],
       ['tip', '割合の 大きい じゅんに 左から（円グラフは 真上から 右回りに）かくよ。その他は さいご。']],
  gen(r){
    const {th, parts} = partsData(r), named = parts.slice(0, -1), un = th.u, t = r.int(0, 4);
    if(t === 0 || t === 3){ const fig = F.band(parts), head = `「${th.t}」の 割合を あらわした 帯グラフです。`, ends = []; let acc = 0; parts.forEach(q => { ends.push([acc, acc + q.p]); acc += q.p; });
      if(t === 0){ const i = r.int(0, named.length - 1), [s0, e0] = ends[i];
        return {q: head + `${parts[i].n} は 全体の 何%？`, fig, form: '{0} %', ans: [parts[i].p],
          steps: ['目もりは 10% ごと（小さい 目もりは 5%）。', s0 ? `${parts[i].n} の 区切りは {{${s0}}}% から {{${e0}}}% まで` : `${parts[i].n} は 0% から {{${e0}}}% まで`, s0 ? `${e0} − ${s0} = ？` : ''], answer: s0 ? `${e0} − ${s0} = ${parts[i].p}（%）` : `${parts[i].p}%`,
          mis: ([G]) => s0 && G === e0 ? '区切りの 右はしの 目もりから、左はしの 目もりを ひこう' : ''}; }
      const [i, j] = r.shuffle([...named.keys()]).slice(0, 2).sort((x, y) => x - y);
      return {q: head + `${parts[i].n} と ${parts[j].n} を あわせると、全体の 何%？`, fig, form: '{0} %', ans: [parts[i].p + parts[j].p],
        steps: ['目もりを 読んで、それぞれの 割合を もとめよう。', `${parts[i].n} は {{${parts[i].p}}}%、${parts[j].n} は {{${parts[j].p}}}%`, `${parts[i].p} + ${parts[j].p} = ？`], answer: `${parts[i].p} + ${parts[j].p} = ${parts[i].p + parts[j].p}（%）`}; }
    const fig = F.pie(parts), head = `「${th.t}」の 割合を あらわした 円グラフです。`, i = r.int(0, named.length - 1), p = parts[i].p;
    const N = r.pick([20, 40, 60, 80, 100, 120, 200, 300, 400, 500, 600, 800].filter(N => N * p % 100 === 0)), x = N * p / 100, pd = decStr(p, 2);
    if(t === 1) return {q: head + `全体が ${N}${un} の とき、${parts[i].n} は 何${un}？`, fig, form: `{0} ${un}`, ans: [x],
      steps: [`${parts[i].n} は ${p}%。小数で あらわすと {{${pd}}}`, 'くらべる量 = もとにする量 × 割合', `${N} × ${pd} = ？`], answer: `${N} × ${pd} = ${x}（${un}）`,
      mis: ([G]) => G === N * p ? '% は 100 で わって 小数に してから かけよう' : H.is(G, N / p) ? '全体 × 割合 で もとめるよ' : ''};
    if(t === 2){ const pairs = []; named.forEach((a, ai) => named.forEach((b, bi) => { if(ai < bi && a.p % b.p === 0) pairs.push([ai, bi]); }));
      if(pairs.length){ const [ai, bi] = r.pick(pairs), A = parts[ai], B = parts[bi];
        return {q: head + `${A.n} の 割合は、${B.n} の 割合の 何倍？`, fig, form: '{0} 倍', ans: [A.p / B.p],
          steps: [`${A.n} は ${A.p}%、${B.n} は ${B.p}%`, `${A.p} ÷ ${B.p} = ？`], answer: `${A.p} ÷ ${B.p} = ${A.p / B.p}（倍）`,
          mis: ([G]) => G === A.p - B.p ? '何倍かは わり算で もとめるよ' : ''}; } }
    return {q: head + `${parts[i].n} は ${x}${un} です。全体は 何${un}？`, fig, form: `{0} ${un}`, ans: [N],
      steps: [`${parts[i].n} の 割合は ${p}% → {{${pd}}}`, 'もとにする量 = くらべる量 ÷ 割合', `${x} ÷ ${pd} = ？`], answer: `${x} ÷ ${pd} = ${N}（${un}）`,
      mis: ([G]) => H.is(G, x * p / 100) ? '全体（もとにする量）は くらべる量 ÷ 割合 だよ' : H.is(G, x * p) ? '% を 小数に なおして、わり算に しよう' : ''};
  }});
U({id: 'g5-congruent', g: 5, ic: '🪞', t: '合同な 図形',
  ex: [['p', 'ぴったり 重ね合わせる ことの できる 2つの 図形は **合同** です。うら返して 重なる ときも 合同。'],
       ['p', '合同な 図形では、**対応する 辺の 長さ** と **対応する 角の 大きさ** が それぞれ 等しい。'],
       ['fig', () => F.congruent({AB: '5cm', BC: '6cm', CA: '7cm', B: '65°'})],
       ['eg', '上の 図で 頂点 A と D、B と E、C と F が 対応。辺 EF = 辺 BC = 6cm、角 E = 角 B = 65°'],
       ['tip', '三角形の 3つの 角の 和は 180° だから、2つの 角が わかれば のこりの 角も わかるよ。']],
  gen(r){
    const t = r.int(0, 3), AB = r.int(4, 7), BC = AB + r.int(1, 2), CA = BC + r.int(1, 2), q0 = '三角形 ABC と 三角形 DEF は 合同です。';
    const SD = [['AB', 'DE', AB], ['BC', 'EF', BC], ['CA', 'FD', CA]];
    const st0 = '対応する 頂点は A と D、B と E、C と F。';
    if(t === 0){ const [s1, s2, v] = r.pick(SD), rev = r.chance(0.4), L = {AB: AB + 'cm', BC: BC + 'cm', CA: CA + 'cm'};
      if(rev){ delete L.AB; delete L.BC; delete L.CA; L.DE = AB + 'cm'; L.EF = BC + 'cm'; L.FD = CA + 'cm'; L[s1] = '?'; delete L[s2]; }
      else { L[s2] = '?'; }
      const ask = rev ? s1 : s2, from = rev ? s2 : s1;
      return {q: q0 + `辺 ${ask} の 長さは？`, fig: F.congruent(L), form: '{0} cm', ans: [v],
        steps: [st0, `辺 ${ask} に 対応する 辺は 辺 ${from}`, '合同な 図形では 対応する 辺の 長さは 等しい。'], answer: `辺 ${ask} = 辺 ${from} = ${v}cm`,
        mis: ([G]) => [AB, BC, CA].includes(G) ? '対応する 辺を たしかめよう（B と E、C と F が 対応）' : ''}; }
    const B = r.int(60, 70), C = r.int(45, 58), A = 180 - B - C;
    if(t === 1){ const k = r.pick(['B', 'C', 'A']), m = {A: 'D', B: 'E', C: 'F'}[k], val = {A, B, C}[k], L = {}; L[k] = val + '°'; L[m] = '?';
      return {q: q0 + `角 ${m} の 大きさは？`, fig: F.congruent(L), form: '{0}°', ans: [val],
        steps: [st0, `角 ${m} に 対応する 角は 角 ${k}`, '合同な 図形では 対応する 角の 大きさは 等しい。'], answer: `角 ${m} = 角 ${k} = ${val}°`}; }
    if(t === 2) return {q: q0 + '角 F の 大きさは？', fig: F.congruent({A: A + '°', B: B + '°', F: '?'}), form: '{0}°', ans: [C],
      steps: [st0 + '角 F に 対応するのは 角 C', '三角形の 3つの 角の 和は {{180}}°', `角 C = 180 − ${A} − ${B} = ？`], answer: `180° − ${A}° − ${B}° = ${C}°`,
      mis: ([G]) => G === A || G === B ? '角 F に 対応するのは 角 C。三角形の 角の 和 180° から もとめよう' : G === A + B ? '180° から ひこう' : ''};
    return {q: q0 + '三角形 DEF の まわりの 長さは？', fig: F.congruent({AB: AB + 'cm', BC: BC + 'cm', CA: CA + 'cm'}), form: '{0} cm', ans: [AB + BC + CA],
      steps: ['合同な 三角形は、まわりの 長さも 同じ。', `${AB} + ${BC} + ${CA} = ？`], answer: `${AB} + ${BC} + ${CA} = ${AB + BC + CA}（cm）`,
      mis: ([G]) => G === AB * BC * CA ? 'まわりの 長さは たし算だよ' : ''};
  }});
U({id: 'g5-prism', g: 5, ic: '🧊', t: '角柱と 円柱',
  ex: [['p', '上下に 合同で 平行な 2つの 面（**底面**）が あり、まわりが 長方形の 立体が **角柱**。底面が 円なら **円柱**。まわりの 面を **側面** と いいます。'],
       ['fig', () => F.prism(5)],
       ['p', '**n角柱**：頂点 2n こ、辺 3n 本、面 n + 2 こ（側面 n こ ＋ 底面 2こ）。'],
       ['eg', '五角柱：頂点 10こ、辺 15本、面 7こ'],
       ['fig', () => F.prism(0)],
       ['p', '円柱の 展開図の 側面は 長方形で、**よこの 長さ = 底面の 円周**（直径 × 3.14）。'],
       ['tip', '底面の 形で 名前が きまるよ（底面が 三角形 → 三角柱）。']],
  gen(r){
    const t = r.int(0, 3);
    if(t <= 1){ const n = r.int(3, 8), w = r.pick(['頂点', '辺', '面', '側面']), v = {頂点: 2 * n, 辺: 3 * n, 面: n + 2, 側面: n}[w], nm = KD[n] + '角柱';
      const st = {頂点: [`上の 底面に ${n}こ、下の 底面に ${n}こ`, `${n} × 2 = ？`], 辺: [`底面の 辺が 上と 下に ${n}本ずつ、たての 辺が ${n}本`, `${n} × 3 = ？`], 面: [`側面が ${n}こ、底面が {{2}}こ`, `${n} + 2 = ？`], 側面: [`側面の 数は、底面の ${KD[n]}角形の 辺の 数と 同じ`]}[w];
      return {q: `${nm}の ${w}の 数は いくつ？`, fig: F.prism(n), form: '{0}', ans: [v], steps: st, answer: `${nm}の ${w}は ${v}`,
        mis: ([G]) => w === '頂点' && G === n ? '上と 下の 底面の 両方に 頂点が あるよ' : w === '辺' && G === 2 * n ? 'たての 辺も わすれずに' : w === '面' && G === n ? '底面 2つも 入れよう' : w === '側面' && G === n + 2 ? '側面は まわりの 長方形の 面だけ（底面は 入れない）' : ''}; }
    if(t === 2){ const R0 = r.int(2, 10), dia = r.chance(0.4), C = decStr(2 * R0 * 314, 2);
      return {q: `底面の ${dia ? `直径が ${2 * R0}cm` : `半径が ${R0}cm`} の 円柱の 展開図で、側面の 長方形の よこの 長さは？（円周率は 3.14）`, fig: F.prism(0), form: '{0} cm', ans: [C], kinds: ['d'],
        steps: ['側面の よこの 長さは、底面の 円周と 同じ。', dia ? '円周 = 直径 × 3.14' : `円周 = 直径 × 3.14、直径 = ${R0} × 2 = {{${2 * R0}}}`, `${2 * R0} × 3.14 = ？`], answer: `${2 * R0} × 3.14 = ${C}（cm）`,
        mis: ([G]) => H.is(G, R0 * 3.14) ? '円周は 直径 × 3.14（半径では なく 直径）' : H.is(G, R0 * R0 * 3.14) ? 'それは 円の 面積。円周の 長さだよ' : ''}; }
    const n = r.int(3, 6), s = r.int(2, 9), nm = KD[n] + '角柱';
    return {q: `底面が 1辺 ${s}cm の 正${KD[n]}角形の ${nm}が あります。展開図で、側面 ぜんぶを あわせた 長方形の よこの 長さは？`, fig: F.prism(n), form: '{0} cm', ans: [n * s],
      steps: ['側面 ぜんぶの よこの 長さは、底面の まわりの 長さと 同じ。', `底面は 1辺 ${s}cm の 正${KD[n]}角形：${s} × ${n} = ？`], answer: `${s} × ${n} = ${n * s}（cm）`,
      mis: ([G]) => G === s ? `側面は ${n}こ ならぶよ` : G === s * (n + 2) ? '底面は 入れないよ（側面だけ）' : ''};
  }});

/* ════════════ 小学6年 ════════════ */
/* ドットプロットの データ（最頻値は 1つだけ） */
const DP = [{t: '10点 まんてんの 小テストの 点数', u: '点', lo: [1, 2]}, {t: '1か月に 読んだ 本の 数', u: 'さつ', lo: [0, 1, 2]}, {t: 'シュートが 入った 数', u: '本', lo: [0, 1]}];
function dpData(r){
  for(let tries = 0; tries < 200; tries++){
    const th = r.pick(DP), lo = r.pick(th.lo), m = r.int(2, 6), c = Array(9).fill(0); c[m] = r.int(3, 5);
    for(let i = 0; i < 9; i++) if(i !== m) c[i] = r.int(0, Math.max(0, c[m] - 1 - Math.floor(Math.abs(i - m) / 2)));
    const vals = []; c.forEach((k, i) => { for(let j = 0; j < k; j++) vals.push(lo + i); });
    if(vals.length < 8 || vals.length > 18) continue;
    return {th, lo, hi: lo + 8, vals, mode: lo + m, cm: c[m]};
  }
  return {th: DP[0], lo: 2, hi: 10, vals: [3, 4, 5, 5, 6, 6, 6, 7, 8, 9], mode: 6, cm: 3};
}
const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const midTxt = n => n % 2 ? `${(n + 1) / 2}番目` : `${n / 2}番目と ${n / 2 + 1}番目`;
U({id: 'g6-data', g: 6, ic: '📊', t: 'データの 調べ方（平均値・中央値・最頻値）',
  ex: [['p', 'データの 特ちょうを 1つの 数で あらわした ものを **代表値** と いいます。'],
       ['p', '**平均値**＝合計 ÷ 個数。**中央値**＝大きさの 順に 並べた ときの まん中の 値（個数が 偶数なら まん中 2つの 平均）。**最頻値**＝いちばん 多く 出て くる 値。'],
       ['fig', () => F.dotplot(3, 10, [4, 5, 5, 6, 6, 6, 7, 9], '点')],
       ['eg', '上の ドットプロット：4, 5, 5, 6, 6, 6, 7, 9 → 平均値 48 ÷ 8 = 6、中央値 (6 + 6) ÷ 2 = 6、最頻値 6'],
       ['tip', '中央値は、まず 小さい 順に 並べてから さがそう。']],
  gen(r){
    const t = r.int(0, 3);
    if(t === 0){ const n = r.int(7, 10), vals = Array.from({length: n}, () => r.int(1, 30)), md = median(vals), s = vals.slice().sort((x, y) => x - y), mean = vals.reduce((a, b) => a + b, 0) / n;
      return {q: `${vals.join('、')} の 中央値は？`, form: '{0}', ans: [String(md)], kinds: ['d'],
        steps: [`小さい 順に 並べると ${s.join('、')}`, `${n}こ の まん中は ${midTxt(n)}`, n % 2 ? '' : `${s[n / 2 - 1]} と ${s[n / 2]} の 平均`], answer: n % 2 ? `中央値は ${md}` : `(${s[n / 2 - 1]} + ${s[n / 2]}) ÷ 2 = ${md}`,
        mis: ([G]) => H.is(G, mean) ? 'それは 平均値。中央値は まん中の 値' : n % 2 && H.is(G, vals[(n - 1) / 2]) ? 'まず 小さい 順に 並べよう' : ''}; }
    const D = dpData(r), n = D.vals.length, fig = F.dotplot(D.lo, D.hi, D.vals, D.th.u), head = `「${D.th.t}」を ドットプロットに あらわしました。`, md = median(D.vals), sum = D.vals.reduce((a, b) => a + b, 0);
    if(t === 1) return {q: head + '最頻値は？', fig, form: `{0} ${D.th.u}`, ans: [D.mode],
      steps: ['いちばん 高く ● が つまれて いる 値を さがそう。', `${D.mode}${D.th.u} の ところに ${D.cm}こ`], answer: `最頻値は ${D.mode}${D.th.u}`,
      mis: ([G]) => G === D.cm ? `それは 人数。最頻値は いちばん 多い 値（${D.th.u}）` : ''};
    if(t === 2 || (sum * 10) % n) return {q: head + '中央値は？', fig, form: `{0} ${D.th.u}`, ans: [String(md)], kinds: ['d'],
      steps: [`ぜんぶで ${n}こ。まん中は 小さい ほうから ${midTxt(n)}`, '左から ● を じゅんに 数えよう。'], answer: `中央値は ${md}${D.th.u}`,
      mis: ([G]) => G === D.mode && md !== D.mode ? 'それは 最頻値。中央値は まん中の 値' : ''};
    const mean = decStr(sum * 10 / n, 1);
    return {q: head + '平均値は？', fig, form: `{0} ${D.th.u}`, ans: [mean], kinds: ['d'],
      steps: [`合計：${D.vals.join(' + ')} = {{${sum}}}`, `個数は ${n}こ`, `${sum} ÷ ${n} = ？`], answer: `${sum} ÷ ${n} = ${mean}（${D.th.u}）`,
      mis: ([G]) => G === sum ? `合計を 個数（${n}）で わろう` : H.is(G, md) && !H.is(md, +mean) ? 'それは 中央値。平均値は 合計 ÷ 個数' : ''};
  }});
U({id: 'g6-scale', g: 6, ic: '🗺', t: '拡大図と 縮図・縮尺',
  ex: [['p', '形を かえずに 大きく した 図が **拡大図**、小さく した 図が **縮図**。対応する **辺の 長さの 比は 同じ**、対応する **角の 大きさは 等しい**。'],
       ['fig', () => F.scaled(2, {BC: '3cm', EF: '6cm', B: '65°', E: '65°'})],
       ['p', '実際の 長さを 縮めた 割合を **縮尺** と いいます。1 : 25000 は、実際の 長さを [[1/25000]] に した もの。'],
       ['eg', '縮尺 1 : 25000 の 地図で 4cm → 4 × 25000 = 100000cm = 1000m'],
       ['tip', 'cm を m に なおすときは 100 で、km に なおすときは 100000 で わるよ。']],
  gen(r){
    const t = r.int(0, 5);
    if(t <= 1){ const k = t === 0 ? r.pick([2, 3]) : 0.5, [s1, s2] = r.pick([['AB', 'DE'], ['BC', 'EF'], ['CA', 'FD']]), b = r.int(2, 9) * (k === 0.5 ? 2 : 1), v = b * k, L = {}; L[s1] = b + 'cm'; L[s2] = '?';
      const nm = k === 0.5 ? '[[1/2]]の 縮図' : `${k}倍の 拡大図`;
      return {q: `三角形 DEF は 三角形 ABC の ${nm}です。辺 ${s2} の 長さは？`, fig: F.scaled(k, L), form: '{0} cm', ans: [v],
        steps: [`辺 ${s2} に 対応する 辺は 辺 ${s1}`, k === 0.5 ? `${nm}は 長さが 半分：${b} ÷ 2 = ？` : `${k}倍の 拡大図は 長さが ${k}倍：${b} × ${k} = ？`], answer: `${b} ${k === 0.5 ? '÷ 2' : '× ' + k} = ${v}（cm）`,
        mis: ([G]) => k !== 0.5 && G === b + k ? `${k}倍は かけ算だよ` : k === 0.5 && G === b * 2 ? '縮図は 小さく なるよ（半分）' : ''}; }
    if(t === 2){ const k = r.pick([2, 3, 0.5]), [a1, a2] = r.pick([['B', 'E'], ['C', 'F'], ['A', 'D']]), deg = {A: 70, B: 65, C: 45}[a1] + r.pick([-5, 0, 5]), L = {}; L[a1] = deg + '°'; L[a2] = '?';
      return {q: `三角形 DEF は 三角形 ABC の ${k === 0.5 ? '[[1/2]]の 縮図' : k + '倍の 拡大図'}です。角 ${a2} の 大きさは？`, fig: F.scaled(k, L), form: '{0}°', ans: [deg],
        steps: [`角 ${a2} に 対応する 角は 角 ${a1}`, '拡大図・縮図では、対応する 角の 大きさは かわらない。'], answer: `角 ${a2} = 角 ${a1} = ${deg}°`,
        mis: ([G]) => H.is(G, deg * k) ? '角の 大きさは 何倍にも ならないよ（同じ 大きさ）' : ''}; }
    const S0 = r.pick([1000, 2000, 5000, 10000, 25000, 50000]), d = r.int(1, 12), cm = d * S0, m = cm / 100;
    if(t === 3){ const km = m % 1000 === 0 && r.chance(0.6);
      return {q: `縮尺 1 : ${S0} の 地図で ${d}cm の 長さは、実際には 何${km ? 'km' : 'm'}？`, form: `{0} ${km ? 'km' : 'm'}`, ans: [km ? m / 1000 : m],
        steps: [`実際の 長さは 地図の 長さの ${S0}倍`, `${d} × ${S0} = {{${cm}}}cm`, km ? '100000cm で 1km' : '100cm で 1m'], answer: `${d} × ${S0} = ${cm}cm = ${km ? m / 1000 + 'km' : m + 'm'}`,
        mis: ([G]) => G === cm ? `それは cm の 数。${km ? 'km' : 'm'} に なおそう` : ''}; }
    if(t === 4) return {q: `実際の 長さ ${m}m は、縮尺 1 : ${S0} の 地図では 何cm？`, form: '{0} cm', ans: [d],
      steps: [`${m}m = {{${cm}}}cm`, `地図の 長さは 実際の [[1/${S0}]]：${cm} ÷ ${S0} = ？`], answer: `${cm} ÷ ${S0} = ${d}（cm）`,
      mis: ([G]) => H.is(G, m / S0) ? 'm を cm に なおしてから わろう' : ''};
    return {q: `実際の 長さ ${m}m を ${d}cm に 縮めて かいた 地図の 縮尺は？`, form: '1 : {0}', ans: [S0],
      steps: [`${m}m = {{${cm}}}cm`, `${cm}cm が ${d}cm に なる → ${cm} ÷ ${d} = ？`], answer: `${cm} ÷ ${d} = ${S0} → 1 : ${S0}`,
      mis: ([G]) => H.is(G, m / d) ? 'm を cm に なおしてから わろう' : ''};
  }});
U({id: 'g6-volume', g: 6, ic: '🥫', t: '角柱と 円柱の 体積',
  ex: [['p', '**角柱・円柱の 体積 = 底面積 × 高さ**'],
       ['fig', () => F.prismSide([[0, 0], [6, 0], [1.8, 4]], 8, {e0: '6cm', hl: [2, '4cm', 'L'], h: '8cm'})],
       ['eg', '底面が 底辺 6cm・高さ 4cm の 三角形、高さ 8cm の 三角柱：6 × 4 ÷ 2 × 8 = 96cm³'],
       ['eg', '底面の 半径 3cm、高さ 5cm の 円柱：3 × 3 × 3.14 × 5 = 141.3cm³'],
       ['tip', 'まず 底面積を もとめて、高さを かけよう。']],
  gen(r){
    const t = r.int(0, 4), Hh = r.int(3, 12);
    if(t === 0){ let b, h; do { b = r.int(3, 12); h = r.int(2, 10); } while((b * h) % 2); const S0 = b * h / 2;
      return {q: `底面が 底辺 ${b}cm・高さ ${h}cm の 三角形で、高さが ${Hh}cm の 三角柱の 体積は？`, fig: F.prismSide([[0, 0], [b, 0], [b * 0.3, h]], Hh, {e0: b + 'cm', hl: [2, h + 'cm', 'L'], h: Hh + 'cm'}), form: '{0} cm³', ans: [S0 * Hh],
        steps: ['角柱の 体積 = 底面積 × 高さ', `底面積：${b} × ${h} ÷ 2 = {{${S0}}}cm²`, `${S0} × ${Hh} = ？`], answer: `${S0} × ${Hh} = ${S0 * Hh}（cm³）`,
        mis: ([G]) => G === b * h * Hh ? '三角形の 面積は ÷ 2 を わすれずに' : G === S0 + Hh ? '体積は 底面積 × 高さ（かけ算）' : ''}; }
    if(t === 1){ let a, b, h; do { a = r.int(2, 8); b = r.int(a + 1, 12); h = r.int(2, 8); } while(((a + b) * h) % 2); const S0 = (a + b) * h / 2;
      return {q: `底面が 上底 ${a}cm・下底 ${b}cm・高さ ${h}cm の 台形で、高さが ${Hh}cm の 四角柱の 体積は？`, fig: F.prismSide([[0, 0], [b, 0], [(b + a) / 2, h], [(b - a) / 2, h]], Hh, {e0: b + 'cm', i2: a + 'cm', hl: [3, h + 'cm'], h: Hh + 'cm'}), form: '{0} cm³', ans: [S0 * Hh],
        steps: ['角柱の 体積 = 底面積 × 高さ', `底面積：(${a} + ${b}) × ${h} ÷ 2 = {{${S0}}}cm²`, `${S0} × ${Hh} = ？`], answer: `${S0} × ${Hh} = ${S0 * Hh}（cm³）`,
        mis: ([G]) => G === (a + b) * h * Hh ? '台形の 面積は ÷ 2 を わすれずに' : ''}; }
    if(t === 2){ const R0 = r.int(1, 6), base = decStr(R0 * R0 * 314, 2), V = decStr(R0 * R0 * 314 * Hh, 2);
      return {q: `底面の 半径が ${R0}cm、高さが ${Hh}cm の 円柱の 体積は？（円周率は 3.14）`, fig: F.prism(0, {r: R0 + 'cm', h: Hh + 'cm'}), form: '{0} cm³', ans: [V], kinds: ['d'],
        steps: ['円柱の 体積 = 底面積 × 高さ', `底面積：${R0} × ${R0} × 3.14 = {{${base}}}cm²`, `${base} × ${Hh} = ？`], answer: `${base} × ${Hh} = ${V}（cm³）`,
        mis: ([G]) => H.is(G, 2 * R0 * 3.14 * Hh) ? '底面積は 半径 × 半径 × 3.14（円周では ないよ）' : H.is(G, 4 * R0 * R0 * 3.14 * Hh) ? '直径では なく 半径を 2回 かけよう' : ''}; }
    if(t === 3){ const S0 = r.int(6, 60);
      return {q: `底面積が ${S0}cm²、高さが ${Hh}cm の 角柱の 体積は？`, fig: F.prism(r.pick([3, 5, 6]), {h: Hh + 'cm'}), form: '{0} cm³', ans: [S0 * Hh],
        steps: ['角柱の 体積 = 底面積 × 高さ', `${S0} × ${Hh} = ？`], answer: `${S0} × ${Hh} = ${S0 * Hh}（cm³）`}; }
    const S0 = r.int(6, 40);
    return {q: `体積が ${S0 * Hh}cm³、底面積が ${S0}cm² の 角柱の 高さは？`, fig: F.prism(4, {h: '?'}), form: '{0} cm', ans: [Hh],
      steps: ['体積 = 底面積 × 高さ だから、高さ = 体積 ÷ 底面積', `${S0 * Hh} ÷ ${S0} = ？`], answer: `${S0 * Hh} ÷ ${S0} = ${Hh}（cm）`,
      mis: ([G]) => G === S0 * Hh * S0 ? '高さは わり算で もとめるよ' : ''};
  }});
const NGON = {3: '正三角形', 4: '正方形', 5: '正五角形', 6: '正六角形', 7: '正七角形', 8: '正八角形', 9: '正九角形', 10: '正十角形'};
U({id: 'g6-symmetry', g: 6, ic: '🦋', t: '対称な 図形（線対称・点対称）',
  ex: [['p', '1本の 直線を 折り目に して 折ると ぴったり 重なる 図形が **線対称**（その 直線が **対称の 軸**）。'],
       ['fig', () => F.symLine({B: '120°', E: '120°', BC: '5cm', ED: '5cm'})],
       ['p', '1つの 点の まわりに 180° 回すと ぴったり 重なる 図形が **点対称**（その 点が **対称の 中心**）。'],
       ['fig', () => F.symPoint({OA: '4cm', OC: '4cm'})],
       ['eg', '対応する 辺の 長さ・角の 大きさは 等しい。点対称では、対応する 点を 結ぶ 直線は 対称の 中心を 通り、中心までの 長さが 等しい。'],
       ['tip', '正多角形の 対称の 軸の 数は、辺の 数と 同じ だよ。']],
  gen(r){
    const t = r.int(0, 4);
    if(t === 0){ const [s1, s2] = r.pick([['BC', 'ED'], ['AB', 'AE'], ['ED', 'BC']]), v = r.int(3, 9), L = {}; L[s1] = v + 'cm'; L[s2] = '?';
      return {q: `点線を 対称の 軸と する 線対称な 五角形です。辺 ${s2} の 長さは？`, fig: F.symLine(L), form: '{0} cm', ans: [v],
        steps: ['線対称な 図形では、対応する 辺の 長さは 等しい。', `軸で 折ると、辺 ${s2} と 重なるのは 辺 ${s1}`], answer: `辺 ${s2} = 辺 ${s1} = ${v}cm`}; }
    if(t === 1){ const B = r.int(115, 125), C = r.int(92, 100), A = 540 - 2 * B - 2 * C;
      if(r.chance(0.5)) return {q: '点線を 対称の 軸と する 線対称な 五角形です。角 E の 大きさは？', fig: F.symLine({B: B + '°', E: '?'}), form: '{0}°', ans: [B],
        steps: ['線対称な 図形では、対応する 角の 大きさは 等しい。', '軸で 折ると、角 E と 重なるのは 角 B'], answer: `角 E = 角 B = ${B}°`};
      return {q: '点線を 対称の 軸と する 線対称な 五角形です。角 A の 大きさは？（五角形の 角の 和は 540°）', fig: F.symLine({B: B + '°', C: C + '°', A: '?'}), form: '{0}°', ans: [A],
        steps: [`対応する 角は 等しいので、角 E = ${B}°、角 D = ${C}°`, `${B} × 2 + ${C} × 2 = {{${2 * B + 2 * C}}}`, `540 − ${2 * B + 2 * C} = ？`], answer: `540° − ${2 * B + 2 * C}° = ${A}°`,
        mis: ([G]) => G === 540 - B - C ? '角 E・角 D も わすれずに（角 B・角 C と 同じ 大きさ）' : ''}; }
    if(t === 2){ const a = r.int(3, 9), k = r.int(0, 2), q0 = '点 O を 対称の 中心と する 点対称な 平行四辺形です。';
      if(k === 0) return {q: q0 + 'OC の 長さは？', fig: F.symPoint({OA: a + 'cm', OC: '?'}), form: '{0} cm', ans: [a],
        steps: ['対応する 点を 結ぶ 直線は 対称の 中心を 通る。', '中心から 対応する 2つの 点までの 長さは 等しい（OA = OC）'], answer: `OC = OA = ${a}cm`};
      if(k === 1) return {q: q0 + '対角線 AC の 長さは？', fig: F.symPoint({OA: a + 'cm'}), form: '{0} cm', ans: [2 * a],
        steps: ['OA と OC は 等しい。', `AC = OA + OC = ${a} + ${a}`], answer: `${a} × 2 = ${2 * a}（cm）`, mis: ([G]) => G === a ? 'AC は OA の 2つ分だよ' : ''};
      const b = r.int(5, 12);
      return {q: q0 + '辺 CD の 長さは？', fig: F.symPoint({AB: b + 'cm', CD: '?'}), form: '{0} cm', ans: [b],
        steps: ['点 O の まわりに 180° 回すと、A は C に、B は D に 重なる。', '辺 CD に 対応するのは 辺 AB'], answer: `CD = AB = ${b}cm`}; }
    if(t === 3){ const n = r.int(3, 10);
      return {q: `${NGON[n]}の 対称の 軸は 何本？`, fig: F.ngon(n), form: '{0} 本', ans: [n], steps: ['正多角形の 対称の 軸の 数は、辺（頂点）の 数と 同じ。'], answer: `${n}本`,
        mis: ([G]) => G === Math.floor(n / 2) ? '頂点を 通る 軸と、辺の まん中を 通る 軸の 両方を 数えよう' : ''}; }
    const ns = r.shuffle([3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 4).sort((a, b) => a - b), ev = ns.filter(n => n % 2 === 0);
    return {q: `${ns.map(n => NGON[n]).join('・')} の うち、点対称な 図形は いくつ？`, form: '{0} こ', ans: [ev.length],
      steps: ['正多角形は、辺の 数が 偶数の とき 点対称に なる。', '偶数の ものを 数えよう。'], answer: `${ev.map(n => NGON[n]).join('・') || 'なし'}（${ev.length}こ）`};
  }});
})();
