/* ════════════════════════════════════════════════════════════════
   🎓 算数・数学チャレンジ（sansu/）の土台
   ・乱数（テストでは種を決めて、いつも同じ問題を作れるように）
   ・計算の道具（最大公約数・小数・符号つきの数の書き方）
   ・数式の見た目（[[3/4]] で分数、[[1|3/4]] で帯分数、√[12] でルート、{0} で答えの□）
   ・図（ドット・10のまとまり・ひっ算・数直線・図形・時計・さいころの表・グラフ）
   中身は全部この中で作った数字だけ。人が打った文字は入らないが、念のため文字はすべてエスケープする。
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU = window.SANSU || {};

/* ── 乱数 ── */
function mkRng(seed){
  if(seed == null) return Math.random;
  // 種を よく まぜてから 使う（小さい 種でも はじめの 数が かたよらない）
  let s = ((seed >>> 0) ^ 0x9e3779b9) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x85ebca6b) >>> 0; s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0; s = ((s ^ (s >>> 16)) >>> 0) || 1;
  return function(){ s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function R(rng){
  rng = rng || Math.random;
  const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
  return {
    rng, int,
    nz: (a, b) => { let v = 0; for(let k = 0; v === 0 && k < 50; k++) v = int(a, b); return v || 1; },   // 0 以外
    pick: arr => arr[Math.floor(rng() * arr.length)],
    chance: p => rng() < p,
    shuffle: arr => { const a = arr.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
}

/* ── 計算の道具 ── */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while(b){ const t = a % b; a = b; b = t; } return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const MI = '−';                                              // 画面のマイナス（ハイフンより見やすい）
const num = n => n < 0 ? MI + (-n) : String(n);              // −3
const term = n => (n < 0 ? MI : '+') + Math.abs(n);          // 式の中の項：+3 / −3
const par = n => n < 0 ? '(' + MI + (-n) + ')' : String(n);  // 負の数はかっこに入れる
const sgnOp = n => n < 0 ? ' ' + MI + ' ' + (-n) : ' + ' + n; // 「a + b」「a − b」の後ろ半分
/* 小数：整数 v を 10^p でわった数として書く（2.30 → 2.3 のように後ろの 0 は消す） */
function decStr(v, p){
  const neg = v < 0; let s = String(Math.abs(Math.round(v))).padStart(p + 1, '0');
  const ip = s.slice(0, s.length - p), fp = p ? s.slice(s.length - p).replace(/0+$/, '') : '';
  return (neg ? MI : '') + ip + (fp ? '.' + fp : '');
}
/* 文字式：[[係数, 'x²'], [係数, 'x'], [係数, '']] → x² + 5x − 6（1 は書かない・0 の項は消す） */
function poly(terms){
  let out = '';
  for(const [c, v] of terms){
    if(!c) continue;
    const a = Math.abs(c), body = (v && a === 1) ? v : a + v;
    out += out ? (c < 0 ? ' ' + MI + ' ' : ' + ') + body : (c < 0 ? MI : '') + body;
  }
  return out || '0';
}
/* 素因数分解の書き方：72 → 2×2×2×3×3 */
function factors(n){ const f = []; for(let p = 2; n > 1 && p <= n; p++) while(n % p === 0){ f.push(p); n /= p; } return f; }
const divisors = n => { const d = []; for(let i = 1; i <= n; i++) if(n % i === 0) d.push(i); return d; };

/* ── 数式の見た目 ── */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* opt.blank(i) を渡すと {i} をその HTML に（答えの□）。渡さなければ □。
   ヒントの {{5}} は とちゅうの 数：ふだんは そのまま 5、opt.gblank(k, '5') を 渡すと その HTML に（いっしょに とく □） */
const GV = /\{\{([^{}]*)\}\}/g;
const stepPlain = t => String(t == null ? '' : t).replace(GV, '$1');
const stepVals = t => [...String(t == null ? '' : t).matchAll(GV)].map(m => m[1]);
function mathHtml(src, opt){
  const gv = [];
  let s = esc(String(src == null ? '' : src).replace(GV, (m, v) => { gv.push(v); return '\u0001' + (gv.length - 1) + '\u0002'; }));
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  // √[…] は さきに しるしに して おく（分数の 中にも 書けるように：[[−3 ± √[5]/2]]）
  const rts = []; s = s.replace(/√\[([^\[\]]*)\]/g, (m, a) => { rts.push(a); return '\u0003' + (rts.length - 1) + '\u0004'; });
  s = s.replace(/\[\[([^\[\]|]*)\|([^\[\]\/]*)\/([^\[\]]*)\]\]/g, (m, w, a, b) => `<span class="mx">${w}<span class="fr"><span class="fn">${a}</span><span class="fd">${b}</span></span></span>`);
  s = s.replace(/\[\[([^\[\]\/]*)\/([^\[\]]*)\]\]/g, (m, a, b) => `<span class="fr"><span class="fn">${a}</span><span class="fd">${b}</span></span>`);
  s = s.replace(/\u0003(\d+)\u0004/g, (m, k) => `<span class="rt">√<span class="rc">${rts[+k]}</span></span>`);
  s = s.replace(/\{(\d+)\}/g, (m, i) => opt && opt.blank ? opt.blank(+i) : '<span class="bx0">□</span>');
  s = s.replace(/\u0001(\d+)\u0002/g, (m, k) => opt && opt.gblank ? opt.gblank(+k, gv[+k]) : esc(gv[+k]));
  return s.replace(/\n/g, '<br>');
}
/* 読み上げ用の言葉（[[3/4]] → 4ぶんの3、− → ひく／マイナス、{0} → なに） */
function speakMath(src){
  let s = stepPlain(src).replace(/\*\*/g, '').replace(/√\[([^\[\]]*)\]/g, 'ルート$1');
  s = s.replace(/\[\[([^\[\]|]*)\|([^\[\]\/]*)\/([^\[\]]*)\]\]/g, '$1と$3ぶんの$2');
  s = s.replace(/\[\[([^\[\]\/]*)\/([^\[\]]*)\]\]/g, '$2ぶんの$1');
  s = s.replace(/\{\d+\}/g, 'なに');
  s = s.replace(/(^|[(（=＝+×÷:\sの±])−/g, '$1マイナス').replace(/−/g, 'ひく');
  s = s.replace(/\(\+/g, '(プラス').replace(/(^|\s)\+(?=\d)/g, '$1プラス');
  s = s.replace(/km²/g, '平方キロメートル').replace(/cm²/g, '平方センチメートル').replace(/m²/g, '平方メートル').replace(/cm³/g, '立方センチメートル').replace(/m³/g, '立方メートル');
  s = s.replace(/(\d|何|なに)(\s*)ha(?![a-zA-Z])/g, '$1$2ヘクタール').replace(/(\d|何|なに)(\s*)a(?![a-zA-Z])/g, '$1$2アール').replace(/mL/g, 'ミリリットル');
  s = s.replace(/[⁴⁵⁶⁷⁸⁹]/g, ch => 'の' + ('⁴⁵⁶⁷⁸⁹'.indexOf(ch) + 4) + 'じょう').replace(/ℓ/g, 'エル').replace(/∥/g, 'と ').replace(/∠/g, 'かく');
  s = s.replace(/x²/g, 'エックスの2じょう').replace(/y²/g, 'ワイの2じょう').replace(/²/g, 'の2じょう').replace(/³/g, 'の3じょう');
  s = s.replace(/cm/g, 'センチメートル').replace(/km/g, 'キロメートル').replace(/kg/g, 'キログラム').replace(/mm/g, 'ミリメートル');
  s = s.replace(/([0-9])m(?![a-z])/g, '$1メートル').replace(/([0-9])g(?![a-z])/g, '$1グラム').replace(/([0-9])L/g, '$1リットル').replace(/dL/g, 'デシリットル');
  s = s.replace(/x/g, 'エックス').replace(/y/g, 'ワイ').replace(/π/g, 'パイ').replace(/°/g, 'ど').replace(/%/g, 'パーセント');
  s = s.replace(/\+/g, 'たす').replace(/×/g, 'かける').replace(/÷/g, 'わる').replace(/[=＝]/g, 'は').replace(/:/g, 'たい').replace(/±/g, 'プラスマイナス');
  s = s.replace(/[()（）□]/g, ' ').replace(/\s+/g, ' ');
  return s.trim();
}

/* ── 図（SVG） ── */
const svg = (w, h, body, cls) => `<svg class="fg${cls ? ' ' + cls : ''}" viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}" width="${Math.ceil(w)}" height="${Math.ceil(h)}" aria-hidden="true">${body}</svg>`;
const tx = (x, y, s, cls, anc) => `<text x="${r1(x)}" y="${r1(y)}" class="lb${cls ? ' ' + cls : ''}" text-anchor="${anc || 'middle'}">${esc(s)}</text>`;
const r1 = v => Math.round(v * 10) / 10;
const pts = a => a.map(p => r1(p[0]) + ',' + r1(p[1])).join(' ');
const F = {};

/* ●の数（groups は数の並び。cross は 1つ目のまとまりの後ろから消す数＝ひき算） */
F.dots = (groups, cross) => {
  const r = 10, g = 25; let x = 6, h = 0, b = '', k = 0;
  groups.forEach((n, gi) => {
    for(let i = 0; i < n; i++){
      const cx = x + (i % 5) * g + r + 2, cy = 6 + Math.floor(i / 5) * g + r;
      const xd = cross && gi === 0 && i >= n - cross;
      b += `<circle cx="${cx}" cy="${cy}" r="${r}" class="d${gi + 1}${xd ? ' dx' : ''}" style="--i:${k++}"/>`;
      if(xd) b += `<path d="M${cx - 8} ${cy - 8}L${cx + 8} ${cy + 8}M${cx + 8} ${cy - 8}L${cx - 8} ${cy + 8}" class="xl"/>`;
    }
    x += Math.min(5, Math.max(1, n)) * g + 18; h = Math.max(h, Math.ceil(n / 5) * g);
  });
  return svg(x, h + 12, b);
};
/* 10のまとまり（くり上がり）：1つ目のわくに a と b の一部で 10、2つ目のわくに b の残り */
F.ten = (a, b) => {
  const c = 26, need = 10 - a, rest = b - need; let s = '';
  let k = 0;
  const frame = (ox, fill) => { for(let i = 0; i < 10; i++){ const x = ox + (i % 5) * c, y = 8 + Math.floor(i / 5) * c;
    s += `<rect x="${x}" y="${y}" width="${c}" height="${c}" class="cell"/>`; if(fill[i]) s += `<circle cx="${x + c / 2}" cy="${y + c / 2}" r="9" class="${fill[i]}" style="--i:${k++}"/>`; } };
  frame(6, Array.from({length: 10}, (_, i) => i < a ? 'd1' : 'd2'));
  frame(6 + 5 * c + 22, Array.from({length: 10}, (_, i) => i < rest ? 'd2' : ''));
  s += tx(6 + 2.5 * c, 8 + 2 * c + 20, '10') + tx(28 + 7.5 * c, 8 + 2 * c + 20, String(rest));
  return svg(30 + 10 * c, 8 + 2 * c + 28, s);
};
/* くり下がり：10 のわく（b こ消す）と、ばらの ●（a−10 こ） */
F.tenSub = (a, b) => {
  const c = 26, ones = a - 10; let s = '';
  for(let i = 0; i < 10; i++){ const x = 6 + (i % 5) * c, y = 8 + Math.floor(i / 5) * c, cx = x + c / 2, cy = y + c / 2, xd = i >= 10 - b;
    s += `<rect x="${x}" y="${y}" width="${c}" height="${c}" class="cell"/><circle cx="${cx}" cy="${cy}" r="9" class="d1${xd ? ' dx' : ''}" style="--i:${i}"/>`;
    if(xd) s += `<path d="M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}M${cx + 7} ${cy - 7}L${cx - 7} ${cy + 7}" class="xl"/>`; }
  for(let i = 0; i < ones; i++){ const x = 6 + 5 * c + 22 + (i % 5) * c, y = 8 + Math.floor(i / 5) * c; s += `<circle cx="${x + c / 2}" cy="${y + c / 2}" r="9" class="d2" style="--i:${10 + i}"/>`; }
  s += tx(6 + 2.5 * c, 8 + 2 * c + 20, '10') + tx(28 + 7.5 * c, 8 + 2 * c + 20, String(ones));
  return svg(30 + 10 * c, 8 + 2 * c + 28, s);
};
/* かけ算の ●：1つ分 per こ が groups れつ */
F.array = (per, groups) => {
  const g = per > 6 || groups > 6 ? 17 : 22, r = g * 0.36; let s = '';
  for(let j = 0; j < groups; j++) for(let i = 0; i < per; i++) s += `<circle cx="${8 + i * g + r}" cy="${8 + j * g + r}" r="${r}" class="${j % 2 ? 'd2' : 'd1'}" style="--i:${j * 2 + i * 0.3}"/>`;
  return svg(16 + per * g, 16 + groups * g, s);
};
/* ひっ算（HTML の表）。lines は [{s:'346', op:''}, {s:'78', op:'+'}]、rule は線を引く行の番号（その行の下に線）。
   s の中の '?' は□、小さい数（くり上がり）は carry に「位置→数字」で */
F.cols = (lines, rules, carry) => {
  const w = Math.max(...lines.map(l => l.s.length)) + 1, r0 = Math.min(...rules);
  // 動く 図（v9）：線より 下の 行（答え）の 数字は、一の くらいから 1けたずつ 出る（--i が じゅんばん）
  let ord = 0; const at = {};
  lines.forEach((l, li) => { if(li <= r0) return; const t = (' '.repeat(w - 1 - l.s.length) + l.s).split(''); for(let i = t.length - 1; i >= 0; i--) if(/\d/.test(t[i])) at[li + ':' + i] = ord++; });
  let h = '<table class="hs">';
  if(carry){ h += '<tr class="cy">'; for(let i = 0; i < w; i++){ const k = w - 1 - i, q = at[(r0 + 1) + ':' + (i - 1)]; h += `<td${carry[k] != null && q != null ? ` class="fa" style="--i:${q - 0.5}"` : ''}>${carry[k] != null ? esc(carry[k]) : ''}</td>`; } h += '</tr>'; }
  lines.forEach((l, li) => {
    const pad = ' '.repeat(w - 1 - l.s.length) + l.s;
    h += `<tr${rules.includes(li) ? ' class="ru"' : ''}><td class="op">${esc(l.op || '')}</td>`;
    [...pad].forEach((ch, i) => { const q = at[li + ':' + i]; h += ch === '?' ? '<td><span class="bx0">□</span></td>' : `<td${q != null ? ` class="fa" style="--i:${q}"` : ''}>${esc(ch === ' ' ? '' : ch)}</td>`; });
    h += '</tr>';
  });
  return h + '</table>';
};
/* 数直線：lo〜hi に目もり、from から to へ矢印 */
F.line = (lo, hi, from, to) => {
  const u = Math.min(30, 520 / (hi - lo)), W = (hi - lo) * u + 40, y = 52, X = v => 20 + (v - lo) * u;
  let s = `<line x1="10" y1="${y}" x2="${W - 10}" y2="${y}" class="ln"/>`;
  for(let v = lo; v <= hi; v++){
    s += `<line x1="${X(v)}" y1="${y - (v === 0 ? 8 : 5)}" x2="${X(v)}" y2="${y + (v === 0 ? 8 : 5)}" class="ln"/>`;
    if(hi - lo <= 20 || v % 5 === 0) s += tx(X(v), y + 22, num(v), v === 0 ? 'b' : 'sm');
  }
  if(from != null){
    s += `<circle cx="${X(from)}" cy="${y}" r="5" class="pt"/>`;
    if(to != null && to !== from){   // ぴょんと とぶ 矢印（v9：線が のびてから 矢じりと 着いた 点が 出る）
      const mx = (X(from) + X(to)) / 2, E = [X(to), y - 9], dv = [E[0] - mx, E[1] - (y - 46)], L = Math.hypot(dv[0], dv[1]) || 1, d = [dv[0] / L, dv[1] / L], nv = [-d[1], d[0]];
      const A = [E[0] - d[0] * 10 + nv[0] * 5, E[1] - d[1] * 10 + nv[1] * 5], B = [E[0] - d[0] * 10 - nv[0] * 5, E[1] - d[1] * 10 - nv[1] * 5];
      s += `<path d="M${X(from)} ${y - 8}Q${mx} ${y - 46} ${r1(E[0] - d[0] * 6)} ${r1(E[1] - d[1] * 6)}" class="ar" pathLength="1"/><path d="M${r1(E[0])} ${r1(E[1])}L${r1(A[0])} ${r1(A[1])}L${r1(B[0])} ${r1(B[1])}Z" class="arh arh2"/><circle cx="${X(to)}" cy="${y}" r="4" class="pt to"/>`; }
  }
  return svg(W, y + 32, s);
};
/* 分数の帯：d こに分けて n こぬる */
F.bar = (n, d, cls) => {
  const W = 240, c = W / d; let s = '';
  for(let i = 0; i < d; i++) s += `<rect x="${4 + i * c}" y="4" width="${c}" height="26" class="${i < n ? (cls || 'f1') : 'cell'}"/>`;
  return svg(W + 8, 34, s + `<rect x="4" y="4" width="${W}" height="26" class="ln"/>`);
};
/* 長方形（w, h は数字か '?'）。単位つきのラベル */
F.rect = (w, h, u) => {
  const nw = +w || 6, nh = +h || 4, k = Math.min(200 / nw, 120 / nh), W = nw * k, H = nh * k;
  return svg(W + 90, H + 44, `<rect x="20" y="10" width="${r1(W)}" height="${r1(H)}" class="sh"/>` + tx(20 + W / 2, H + 34, w + (w === '?' ? '' : u)) + tx(28 + W, 14 + H / 2, h + (h === '?' ? '' : u), '', 'start'));
};
/* L の形：大きい長方形 W×H から、右上の w×h を切りとった形 */
F.lshape = (W, H, w, h, u) => {
  const k = Math.min(200 / W, 130 / H), X = v => 52 + v * k, Y = v => 10 + v * k;   // 左に たての 長さを 書くので あけておく
  const p = [[0, 0], [W - w, 0], [W - w, h], [W, h], [W, H], [0, H]];
  return svg(W * k + 80, H * k + 44, `<polygon points="${pts(p.map(q => [X(q[0]), Y(q[1])]))}" class="sh"/>`
    + tx(X(W / 2), Y(H) + 24, W + u) + tx(X(0) - 6, Y(H / 2) + 5, H + u, '', 'end')
    + tx(X(W - w / 2), Y(h) + 17, w + u, 'sm') + tx(X(W - w) + 6, Y(h / 2) + 5, h + u, 'sm', 'start'));   // 欠けた所の よこは 線の 下、たては 線の 右
};
/* 三角形（底辺 b・高さ h。高さは点線） */
F.tri = (b, h, u) => {
  const nb = +b || 6, nh = +h || 4, k = Math.min(200 / nb, 120 / nh), B = nb * k, H = nh * k, ax = 20 + B * 0.62;
  return svg(B + 60, H + 46, `<polygon points="${pts([[20, 10 + H], [20 + B, 10 + H], [ax, 10]])}" class="sh"/><line x1="${ax}" y1="10" x2="${ax}" y2="${10 + H}" class="ln dash"/>`
    + tx(20 + B / 2, H + 34, b + (b === '?' ? '' : u)) + tx(ax + 6, 14 + H / 2, h + (h === '?' ? '' : u), '', 'start'));
};
F.para = (b, h, u) => {
  const nb = +b || 6, nh = +h || 4, k = Math.min(170 / nb, 110 / nh), B = nb * k, H = nh * k, sh = 34;
  return svg(B + sh + 70, H + 46, `<polygon points="${pts([[20, 10 + H], [20 + B, 10 + H], [20 + B + sh, 10], [20 + sh, 10]])}" class="sh"/><line x1="${20 + sh}" y1="10" x2="${20 + sh}" y2="${10 + H}" class="ln dash"/>`
    + tx(20 + B / 2, H + 34, b + u) + tx(26 + sh, 14 + H / 2, h + u, '', 'start'));
};
F.trap = (a, b, h, u) => {
  const k = Math.min(200 / b, 110 / h), A = a * k, B = b * k, H = h * k, x0 = 20 + (B - A) * 0.35;
  return svg(B + 70, H + 64, `<polygon points="${pts([[20, 26 + H], [20 + B, 26 + H], [x0 + A, 26], [x0, 26]])}" class="sh"/><line x1="${x0}" y1="26" x2="${x0}" y2="${26 + H}" class="ln dash"/>`
    + tx(x0 + A / 2, 18, a + u) + tx(20 + B / 2, H + 50, b + u) + tx(x0 + 6, 30 + H / 2, h + u, '', 'start'));
};
F.rhombus = (d1, d2, u) => {
  const k = Math.min(200 / d1, 130 / d2), A = d1 * k, B = d2 * k, cx = 20 + A / 2, cy = 10 + B / 2;
  return svg(A + 60, B + 40, `<polygon points="${pts([[20, cy], [cx, 10], [20 + A, cy], [cx, 10 + B]])}" class="sh"/><line x1="20" y1="${cy}" x2="${20 + A}" y2="${cy}" class="ln dash"/><line x1="${cx}" y1="10" x2="${cx}" y2="${10 + B}" class="ln dash"/>`
    + tx(20 + A * 0.25, cy - 6, d1 + u, 'sm') + tx(cx + 6, 10 + B * 0.8, d2 + u, 'sm', 'start'));
};
/* 円（mode が 'd' なら直径を、ほかは半径を書く） */
F.circle = (r, mode, u) => {
  const R0 = 64, c = 80;
  return svg(c * 2 + 10, c * 2, `<circle cx="${c}" cy="${c}" r="${R0}" class="sh"/><circle cx="${c}" cy="${c}" r="3" class="pt"/>`
    + (mode === 'd' ? `<line x1="${c - R0}" y1="${c}" x2="${c + R0}" y2="${c}" class="ln"/>` + tx(c, c - 8, r * 2 + u) : `<line x1="${c}" y1="${c}" x2="${c + R0}" y2="${c}" class="ln"/>` + tx(c + R0 / 2, c - 8, r + u)));
};
/* おうぎ形（半径 r・中心角 deg） */
F.sector = (r, deg, u) => {
  const R0 = 70, cx = 90, cy = 90, a = deg * Math.PI / 180, x2 = cx + R0 * Math.cos(-a), y2 = cy + R0 * Math.sin(-a);
  return svg(190, 120 + (deg > 180 ? 70 : 0), `<path d="M${cx} ${cy}L${cx + R0} ${cy}A${R0} ${R0} 0 ${deg > 180 ? 1 : 0} 0 ${r1(x2)} ${r1(y2)}Z" class="sh"/>`
    + tx(cx + R0 / 2, cy + 18, r + u) + tx(cx + 22, cy - 6, deg + '°', 'sm', 'start'));
};
/* 直方体（見取図） */
F.cuboid = (a, b, c, u) => {
  const na = +a || 5, nb = +b || 4, nc = +c || 4, k = Math.min(140 / na, 90 / nc, 140 / nb), W = na * k, H = nc * k, D = nb * k * 0.45, x = 16, y = 12 + D;
  const front = [[x, y], [x + W, y], [x + W, y + H], [x, y + H]], top = [[x, y], [x + D, y - D], [x + W + D, y - D], [x + W, y]], side = [[x + W, y], [x + W + D, y - D], [x + W + D, y + H - D], [x + W, y + H]];
  return svg(W + D + 80, H + D + 46, `<polygon points="${pts(top)}" class="sh s2"/><polygon points="${pts(side)}" class="sh s3"/><polygon points="${pts(front)}" class="sh"/>`
    + tx(x + W / 2, y + H + 22, a + (a === '?' ? '' : u)) + tx(x + W + D / 2 + 8, y + H - D / 2 + 16, b + (b === '?' ? '' : u), 'sm', 'start') + tx(x + W + D + 6, y - D + H / 2, c + (c === '?' ? '' : u), c === '?' ? 'q' : '', 'start'));
};
/* 一直線と角（a° と ?） */
F.straight = (a) => {
  const cx = 130, cy = 80, L = 100, t = a * Math.PI / 180, ex = cx + L * Math.cos(Math.PI - t), ey = cy - L * Math.sin(Math.PI - t);
  return svg(260, 100, `<line x1="${cx - L - 10}" y1="${cy}" x2="${cx + L + 10}" y2="${cy}" class="ln"/><line x1="${cx}" y1="${cy}" x2="${r1(ex)}" y2="${r1(ey)}" class="ln"/>`
    + tx(cx - 44, cy - 10, a + '°', 'sm') + tx(cx + 40, cy - 12, '?', 'q'));
};
/* 三角形の角（底の2つの角 A・B、上が ?） */
F.triAng = (A, B, labA, labB, labC) => {
  // 底の 2つの 角から 頂点を 決めて、はみ出さないように 大きさを 合わせる（鈍角でも）
  const ta = Math.tan(A * Math.PI / 180), tb = Math.tan(B * Math.PI / 180), x = tb / (ta + tb), y = x * ta;
  const xs = [0, 1, x], lo = Math.min(...xs), hi = Math.max(...xs), k = Math.min(230 / (hi - lo), 130 / Math.max(y, 0.15));
  const P = [[0, 0], [1, 0], [x, y]].map(q => [24 + (q[0] - lo) * k, 20 + (y - q[1]) * k]), G = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
  const at = (i, t) => [P[i][0] + (G[0] - P[i][0]) * t, P[i][1] + (G[1] - P[i][1]) * t + 5];
  const la = at(0, 0.32), lb = at(1, 0.32), lc = at(2, 0.3);
  return svg((hi - lo) * k + 48, y * k + 40, `<polygon points="${pts(P)}" class="sh"/>` + tx(la[0], la[1], labA || A + '°', 'sm') + tx(lb[0], lb[1], labB || B + '°', 'sm') + tx(lc[0], lc[1] + 4, labC || '?', 'q'));
};
/* 四角形の角（形はおおよそ。3つの角の大きさと ?） */
F.quadAng = (a, b, c) => svg(250, 150, `<polygon points="20,130 230,130 200,20 60,40" class="sh"/>` + tx(46, 122, a + '°', 'sm') + tx(206, 122, b + '°', 'sm') + tx(190, 44, c + '°', 'sm') + tx(70, 62, '?', 'q'));
/* 直角三角形（よこ a・たて b・斜辺 c。わからない所は '?'） */
F.rightTri = (a, b, c, u) => {
  const na = +a || 4, nb = +b || 3, k = Math.min(200 / na, 120 / nb), A = na * k, B = nb * k, x0 = 56;   // 左に たての 辺の 長さを 書くので あけておく
  return svg(x0 + A + 80, B + 44, `<polygon points="${pts([[x0, 10 + B], [x0 + A, 10 + B], [x0, 10]])}" class="sh"/><polyline points="${pts([[x0, B - 4], [x0 + 14, B - 4], [x0 + 14, 10 + B]])}" class="ln"/>`
    + tx(x0 + A / 2, B + 34, a + (a === '?' ? '' : u), a === '?' ? 'q' : '') + tx(x0 - 8, 14 + B / 2, b + (b === '?' ? '' : u), b === '?' ? 'q' : '', 'end') + tx(x0 + 6 + A / 2, 4 + B / 2, c + (c === '?' ? '' : u), c === '?' ? 'q' : '', 'start'));
};
/* 正多角形（n 角形） */
F.ngon = (n) => {
  const c = 70, R0 = 58, P = []; for(let i = 0; i < n; i++){ const t = -Math.PI / 2 + i * 2 * Math.PI / n; P.push([c + R0 * Math.cos(t), c + R0 * Math.sin(t)]); }
  return svg(c * 2, c * 2, `<polygon points="${pts(P)}" class="sh"/>`);
};
/* 時計（h 時 m 分） */
F.clock = (h, m) => {
  const c = 70, R0 = 60; let s = `<circle cx="${c}" cy="${c}" r="${R0}" class="sh"/>`;
  for(let i = 1; i <= 12; i++){ const t = i * Math.PI / 6; s += tx(c + 47 * Math.sin(t), c - 47 * Math.cos(t) + 5, String(i), 'sm'); }
  for(let i = 0; i < 60; i++){ const t = i * Math.PI / 30, L = i % 5 ? 3 : 6; s += `<line x1="${r1(c + (R0 - L) * Math.sin(t))}" y1="${r1(c - (R0 - L) * Math.cos(t))}" x2="${r1(c + R0 * Math.sin(t))}" y2="${r1(c - R0 * Math.cos(t))}" class="tk"/>`; }
  const ha = ((h % 12) + m / 60) * Math.PI / 6, ma = m * Math.PI / 30;
  s += `<line x1="${c}" y1="${c}" x2="${r1(c + 30 * Math.sin(ha))}" y2="${r1(c - 30 * Math.cos(ha))}" class="hh"/><line x1="${c}" y1="${c}" x2="${r1(c + 46 * Math.sin(ma))}" y2="${r1(c - 46 * Math.cos(ma))}" class="mh"/><circle cx="${c}" cy="${c}" r="4" class="pt"/>`;
  return svg(c * 2, c * 2, s);
};
/* さいころ2つの表（ok(i,j) が true のますに色） */
F.dice = (ok) => {
  let h = '<table class="dt"><tr><th>　</th>' + [1, 2, 3, 4, 5, 6].map(j => `<th>${j}</th>`).join('') + '</tr>';
  for(let i = 1; i <= 6; i++){ h += `<tr><th>${i}</th>`; for(let j = 1; j <= 6; j++) h += `<td${ok(i, j) ? ' class="on"' : ''}>${ok(i, j) ? '○' : ''}</td>`; h += '</tr>'; }
  return h + '</table>';
};
/* グラフ（−6〜6 のます目に、点と直線・放物線） fn は x→y、marks は [[x,y],…] */
F.graph = (fn, marks, lim) => {
  const L = lim || 6, u = 13, c = L * u + 14, W = c * 2, X = x => c + x * u, Y = y => c - y * u;
  let s = '';
  for(let i = -L; i <= L; i++) s += `<line x1="${X(i)}" y1="${Y(-L)}" x2="${X(i)}" y2="${Y(L)}" class="gd"/><line x1="${X(-L)}" y1="${Y(i)}" x2="${X(L)}" y2="${Y(i)}" class="gd"/>`;
  s += `<line x1="${X(-L) - 6}" y1="${c}" x2="${X(L) + 6}" y2="${c}" class="ln"/><line x1="${c}" y1="${Y(-L) + 6}" x2="${c}" y2="${Y(L) - 6}" class="ln"/>` + tx(X(L) + 8, c + 4, 'x', 'sm', 'start') + tx(c + 6, Y(L) - 2, 'y', 'sm', 'start') + tx(c - 8, c + 14, 'O', 'sm');
  if(fn){ let d = ''; for(let x = -L; x <= L + 1e-9; x += 0.25){ const y = fn(x); if(Math.abs(y) > L + 2) { d += ' '; continue; } d += (d && !/ $/.test(d) ? 'L' : 'M') + r1(X(x)) + ' ' + r1(Y(y)); } s += `<path d="${d.replace(/ M/g, 'M').trim()}" class="gl"/>`; }
  (marks || []).forEach(p => { s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4" class="pt"/>`; });
  return svg(W, W, s, 'gr');
};
/* 帯図（割合）：もとにする量の帯と、くらべる量の帯 */
/* 帯図（割合）：もとにする量の帯と、くらべる量の部分。pct は図の長さ、ラベルは別に（わからない所は '?'） */
F.ratioBar = (base, part, pct, pctLab) => {
  const W = 240, w2 = Math.max(8, Math.min(W, W * (+pct || 50) / 100));
  return svg(W + 70, 74, `<rect x="4" y="6" width="${W}" height="22" class="cell"/><rect x="4" y="6" width="${r1(w2)}" height="22" class="f1"/>`
    + tx(W + 10, 22, String(base), 'sm', 'start') + tx(4 + w2 / 2, 50, String(part), 'sm') + tx(4 + w2 / 2, 68, pctLab == null ? pct + '%' : String(pctLab), 'sm q'));
};
/* 線分図（テープ図）：rows は [{name:'赤', segs:[{v:数, l:'12まい', c:'f1', q:true}, …]}, …]（同じ 目もりで 左を そろえる）。
   braces は [{row:0, from:0, to:2, l:'ぜんぶで ?', q:true, pos:'top'|'bottom'}]（from・to は 区切りの 番号） */
F.tape = (rows, braces) => {
  const NW = rows.some(r => r.name) ? 62 : 8, W = 236, rh = 24, bs = braces || [], tops = bs.filter(b => b.pos !== 'bottom');
  const tot = Math.max(...rows.map(r => r.segs.reduce((a, x) => a + x.v, 0))), k = W / tot;
  // 字の はば（だいたい）：入りきらない 名前は 帯の 下に 書く
  const tw = t => [...String(t)].reduce((a, ch) => a + (/[ -~]/.test(ch) ? 7 : 12.5), 0);
  const under = rows.map(r => { let x = 0; return r.segs.some(g => { const w = g.v * k, o = g.l && tw(g.l) + 6 > w; x += w; return o; }); });
  const gapAfter = i => 14 + (bs.some(b => (b.row === i && b.pos === 'bottom') || (b.row === i + 1 && b.pos !== 'bottom')) ? 30 : 0) + (under[i] ? 16 : 0);
  let s = '', y = tops.length ? 34 : 8; const R = [];
  rows.forEach((r, ri) => {
    let x = NW; const bx = [x];
    if(r.name) s += tx(NW - 8, y + rh / 2 + 5, r.name, 'sm', 'end');
    r.segs.forEach(g => { const w = g.v * k; s += `<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="${rh}" class="${g.c || 'cell'}"/>`;
      if(g.l) s += tw(g.l) + 6 > w ? tx(x + w / 2, y + rh + 14, g.l, g.q ? 'q' : 'sm') : tx(x + w / 2, y + rh / 2 + 5, g.l, g.q ? 'q' : 'sm');
      x += w; bx.push(x); });
    R.push({y, bx}); y += rh + (ri < rows.length - 1 ? gapAfter(ri) : 0);
  });
  (braces || []).forEach(b => {
    const r = R[b.row], x1 = r.bx[b.from], x2 = r.bx[b.to], xm = (x1 + x2) / 2, up = b.pos !== 'bottom', y0 = up ? r.y - 3 : r.y + rh + 3, d = up ? -7 : 7;
    s += `<path d="M${r1(x1)} ${y0}V${y0 + d}H${r1(xm - 6)}L${r1(xm)} ${y0 + d * 1.8}L${r1(xm + 6)} ${y0 + d}H${r1(x2)}V${y0}" class="br"/>`;
    s += tx(xm, up ? y0 + d * 1.8 - 5 : y0 + d * 1.8 + 15, b.l, b.q ? 'q' : 'sm');
  });
  return svg(NW + W + 14, y + (bs.some(b => b.pos === 'bottom' && b.row === rows.length - 1) ? 34 : 8) + (under[rows.length - 1] ? 16 : 0), s, 'tape');
};
/* 1れつに ならんだ 人（n人、まえから k番目に 色。まえは 左） */
F.queue = (n, k) => {
  const g = Math.min(26, 300 / n), r = g * 0.36; let s = tx(4, 30, 'まえ', 'sm', 'start');
  for(let i = 0; i < n; i++){ const cx = 44 + i * g + r, on = i === k - 1;
    s += `<circle cx="${r1(cx)}" cy="14" r="${r1(r * 0.62)}" class="${on ? 'd2' : 'd1'}"/><rect x="${r1(cx - r * 0.7)}" y="${r1(14 + r * 0.7)}" width="${r1(r * 1.4)}" height="${r1(r * 1.5)}" rx="3" class="${on ? 'd2' : 'd1'}"/>`; }
  return svg(52 + n * g, 46, s);
};
/* 道の ある 土地（縦 H・横 W。たて と よこに 同じ はばの 道） */
F.road = (H, W, u) => {
  const k = Math.min(200 / W, 120 / H), Wp = W * k, Hp = H * k, rw = Math.max(10, Math.min(W, H) * k * 0.12), x0 = 24, y0 = 10;
  return svg(Wp + 70, Hp + 46, `<rect x="${x0}" y="${y0}" width="${r1(Wp)}" height="${r1(Hp)}" class="sh s2"/>`
    + `<rect x="${r1(x0 + Wp * 0.42)}" y="${y0}" width="${r1(rw)}" height="${r1(Hp)}" class="cell"/><rect x="${x0}" y="${r1(y0 + Hp * 0.55)}" width="${r1(Wp)}" height="${r1(rw)}" class="cell"/>`
    + tx(x0 + Wp / 2, Hp + 34, W + u) + tx(x0 + Wp + 6, y0 + Hp / 2, H + u, '', 'start') + tx(x0 + Wp * 0.42 + rw / 2, y0 - 2 + Hp * 0.27, 'x', 'q'));
};
/* ── グラフ（読みとる 問題の 図。1つの 系列は 1色、目もりの 線は うすく） ── */
/* 目もり：6目もり いかは ぜんぶに 数を 書く。それより 多い ときは 5目もりごとに 書いて、上の はしも 5目もりの 区切りに */
const niceTicks = (mx, u) => { const n0 = Math.floor(mx / u + 1e-9) + 1; if(n0 <= 6) return {top: n0 * u, lab: 1}; return {top: Math.ceil(n0 / 5) * 5 * u, lab: 5}; };
function axes(W, H, L, B, T, top, u, lab, unit){
  let s = '';
  for(let i = 0, v = 0; v <= top + 1e-9; i++, v = i * u){ const y = H - B - (H - B - T) * v / top;
    s += `<line x1="${L}" y1="${r1(y)}" x2="${W - 6}" y2="${r1(y)}" class="cg"/>`; if(i % lab === 0) s += tx(L - 5, y + 4, String(+v.toFixed(4)), 'ax', 'end'); }
  return s + `<line x1="${L}" y1="${H - B}" x2="${W - 6}" y2="${H - B}" class="ca"/><line x1="${L}" y1="${T - 4}" x2="${L}" y2="${H - B}" class="ca"/>` + tx(L - 4, T - 8, `（${unit}）`, 'ax', 'start');
}
/* 棒グラフ（たて）：labels・vals・1目もり u・たんい。ぼうは はば 24 まで、上の かどだけ 丸く */
F.bars = (labels, vals, u, unit) => {
  const W = 310, H = 190, L = 40, B = 26, T = 22, {top, lab} = niceTicks(Math.max(...vals), u), n = vals.length, slot = (W - L - 10) / n, bw = Math.min(24, slot * 0.55);
  let s = axes(W, H, L, B, T, top, u, lab, unit);
  vals.forEach((v, i) => { const x = L + slot * i + (slot - bw) / 2, y = H - B - (H - B - T) * v / top, h = H - B - y, r = Math.min(4, h);
    if(v > 0) s += `<path d="M${r1(x)} ${H - B}V${r1(y + r)}Q${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)}H${r1(x + bw - r)}Q${r1(x + bw)} ${r1(y)} ${r1(x + bw)} ${r1(y + r)}V${H - B}Z" class="gb" style="--i:${i}"/>`;
    s += tx(L + slot * i + slot / 2, H - B + 16, labels[i], 'ax'); });
  return svg(W, H, s, 'chartfig');
};
/* 折れ線グラフ：labels・vals・1目もり u・たんい・よこの じくの たんい（点は 8px、線は 2px） */
F.lines = (labels, vals, u, unit, xunit) => {
  const W = 320, H = 190, L = 40, B = 26, T = 22, {top, lab} = niceTicks(Math.max(...vals), u), n = vals.length, slot = (W - L - 10) / n;
  let s = axes(W, H, L, B, T, top, u, lab, unit), d = '';
  const P = vals.map((v, i) => [L + slot * i + slot / 2, H - B - (H - B - T) * v / top]);
  P.forEach((p, i) => { d += (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1]); s += tx(p[0], H - B + 16, labels[i], 'ax'); });
  s += `<path d="${d}" class="gline" pathLength="1"/>` + P.map((p, i) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="4" class="gdot" style="--i:${i}"/>`).join('');
  if(xunit) s += tx(W - 4, H + 6, `（${xunit}）`, 'ax', 'end');
  return svg(W, H + (xunit ? 12 : 0), s, 'chartfig');
};
/* 帯グラフ：parts は [{n:'名前', p:%}]（合計 100）。下に 5% ごとの 目もり（10% ごとに 数） */
F.band = parts => {
  const W = 290, L = 10, y = 16, h = 34; let s = '', x = L;
  parts.forEach((q, i) => { const w = W * q.p / 100; s += `<rect x="${r1(x)}" y="${y}" width="${r1(Math.max(0, w - 2))}" height="${h}" class="c${i % 5 + 1} bseg" style="--i:${i}"/>`;
    const fit = [...q.n].length * 12 + 8 < w; s += tx(x + w / 2, fit ? y + h / 2 + 5 : y - 4, q.n, fit ? `cin t${i % 5 + 1}` : 'ax'); x += w; });
  for(let p = 0; p <= 100; p += 5){ const xx = L + W * p / 100; s += `<line x1="${r1(xx)}" y1="${y + h + 2}" x2="${r1(xx)}" y2="${y + h + (p % 10 ? 5 : p % 50 ? 8 : 11)}" class="ca"/>`; if(p % 10 === 0) s += tx(xx, y + h + 23, String(p), 'ax'); }
  return svg(W + L + 36, y + h + 30, s + tx(W + L + 13, y + h + 23, '(%)', 'ax', 'start'), 'chartfig');
};
/* 円グラフ：真上から 右まわり。名前と % を 書く（せまい ところは 外に） */
F.pie = parts => {
  const cx = 112, cy = 100, R0 = 74; let s = '', a0 = -Math.PI / 2;
  parts.forEach((q, i) => { const a1 = a0 + 2 * Math.PI * q.p / 100, big = q.p > 50 ? 1 : 0, X = a => r1(cx + R0 * Math.cos(a)), Y = a => r1(cy + R0 * Math.sin(a));
    s += `<path d="M${cx} ${cy}L${X(a0)} ${Y(a0)}A${R0} ${R0} 0 ${big} 1 ${X(a1)} ${Y(a1)}Z" class="c${i % 5 + 1} pie" style="--i:${i}"/>`;
    const am = (a0 + a1) / 2, out = q.p < 12, rr = out ? R0 + 18 : R0 * 0.6, cl = out ? 'ax' : `cin t${i % 5 + 1}`, px = cx + rr * Math.cos(am), py = cy + rr * Math.sin(am);
    s += tx(px, py + (out ? -1 : -2), q.n, cl) + tx(px, py + (out ? 12 : 12), q.p + '%', cl + ' sm2');
    a0 = a1; });
  return svg(cx * 2, cy * 2, s, 'chartfig');
};
/* 角の しるし：点 P で、A の 向きと B の 向きの 間（180° より 小さい ほう）に 半径 R の 弧。ラベルは その まん中の 向きに d */
const unitV = (P, Q) => { const dx = Q[0] - P[0], dy = Q[1] - P[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
const angArc = (P, A, B, R, q) => { const a = unitV(P, A), b = unitV(P, B), sw = a[0] * b[1] - a[1] * b[0] > 0 ? 1 : 0;
  return `<path d="M${r1(P[0] + R * a[0])} ${r1(P[1] + R * a[1])}A${R} ${R} 0 0 ${sw} ${r1(P[0] + R * b[0])} ${r1(P[1] + R * b[1])}" class="arc${q ? ' q' : ''}"/>`; };
const isQ = v => v === '?' || v === 'x';   // わからない ところ（赤）
const angLab = (P, A, B, d, lab, R) => { const a = unitV(P, A), b = unitV(P, B), m = unitV([0, 0], [a[0] + b[0], a[1] + b[1]]);
  return angArc(P, A, B, R || 13, isQ(lab)) + tx(P[0] + d * m[0], P[1] + d * m[1] + 5, lab, isQ(lab) ? 'q' : 'sm'); };
/* 多角形の 図：P は 頂点、names は 頂点の 名前（'' なら 書かない）、labs の キーは 辺（'AB'）・角（'A'）。辺の ラベルは 外がわに */
function polyFig(P, names, labs, cls){
  const L = labs || {}, n = P.length, G = [P.reduce((a, p) => a + p[0], 0) / n, P.reduce((a, p) => a + p[1], 0) / n];
  let s = `<polygon points="${pts(P)}" class="sh${cls ? ' ' + cls : ''}"/>`;
  P.forEach((p, i) => { if(!names[i]) return; const o = unitV(G, p); s += tx(p[0] + o[0] * 13, p[1] + o[1] * 13 + 5, names[i], 'b'); });
  for(let i = 0; i < n; i++){ const j = (i + 1) % n, k = names[i] + names[j], k2 = names[j] + names[i], v = L[k] != null ? L[k] : L[k2]; if(v == null) continue;
    const M = [(P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2], d = unitV(P[i], P[j]); let nx = -d[1], ny = d[0]; if((M[0] - G[0]) * nx + (M[1] - G[1]) * ny < 0){ nx = -nx; ny = -ny; }
    s += tx(M[0] + nx * 10, M[1] + ny * 12 + 5, v, isQ(v) ? 'q' : 'sm', Math.abs(nx) > 0.5 ? (nx > 0 ? 'start' : 'end') : 'middle'); }
  P.forEach((p, i) => { const v = L[names[i]]; if(v == null || !names[i]) return; s += angLab(p, P[(i + n - 1) % n], P[(i + 1) % n], 26, v); });
  return s;
}
/* 平行な 2本の 直線ア・イと、交わる 直線。上の 交わりの 右上の 角が a°。
   kind：'same'（下の 交わりの 同じ 位置の 角）・'line'（上の 交わりの 左上＝一直線で となり）・'alt'（下の 交わりの 左下） */
F.parallel = (a, kind) => {
  const W = 260, y1 = 40, y2 = 110, t = a * Math.PI / 180, dx = (y2 - y1) / Math.tan(t), xA = W / 2 + dx / 2, xB = xA - dx;
  const ext = 36, x0 = xA + ext / Math.tan(t), x3 = xB - ext / Math.tan(t), PA = [xA, y1], PB = [xB, y2];
  let s = `<line x1="10" y1="${y1}" x2="${W - 10}" y2="${y1}" class="ln"/><line x1="10" y1="${y2}" x2="${W - 10}" y2="${y2}" class="ln"/><line x1="${r1(x0)}" y1="${y1 - ext}" x2="${r1(x3)}" y2="${y2 + ext}" class="ln"/>`;
  s += tx(W - 12, y1 - 6, 'ア', 'sm', 'end') + tx(W - 12, y2 - 6, 'イ', 'sm', 'end');
  const d = a < 70 ? 30 : 24;
  s += angLab(PA, [W, y1], [x0, y1 - ext], d, a + '°');
  s += kind === 'same' ? angLab(PB, [W, y2], PA, d, '?') : kind === 'line' ? angLab(PA, [x0, y1 - ext], [0, y1], 180 - a < 70 ? 30 : 24, '?') : angLab(PB, [0, y2], [x3, y2 + ext], d, '?');
  return svg(W, y2 + ext + 6, s);
};
/* 平行四辺形：左下の 角が a°。labs は {A:左下の 角, B:右下, C:右上, D:左上, b:下の 辺, s:左の 辺}（ラベルの 字。'?' は 赤）。rhomb なら ひし形 */
F.pgram = (a, labs, rhomb) => {
  const t = a * Math.PI / 180, B = rhomb ? 110 : 150, h = rhomb ? B * Math.sin(t) : 84, dx = h / Math.tan(t), x0 = 30 + Math.max(0, -dx), y0 = 16 + h, L = labs || {}, cl = v => v === '?' ? 'q' : 'sm';
  const P = [[x0, y0], [x0 + B, y0], [x0 + B + dx, y0 - h], [x0 + dx, y0 - h]];
  let s = `<polygon points="${pts(P)}" class="sh"/>`;
  ['A', 'B', 'C', 'D'].forEach((k, i) => { if(L[k]){ const ac = i % 2 === 0 ? a : 180 - a; s += angLab(P[i], P[(i + 3) % 4], P[(i + 1) % 4], ac < 75 ? 30 : 24, L[k]); } });
  if(L.b) s += tx(x0 + B / 2, y0 + 20, L.b, cl(L.b));
  if(L.s) s += tx(x0 + dx / 2 - 8, y0 - h / 2 + 5, L.s, cl(L.s), 'end');
  return svg(B + Math.abs(dx) + 60, y0 + 28, s);
};
/* 合同な 三角形（ABC と、うら返した DEF）。labs の AB・BC・CA・DE・EF・FD は 辺、A〜F は 角の ラベル（'?' は 赤） */
F.congruent = (labs) => {
  const V = {B: [20, 120], C: [130, 120], A: [60, 30], E: [290, 120], F: [180, 120], D: [250, 30]}, L = labs || {}, cl = v => v === '?' ? 'q' : 'sm';
  const tri = {A: 'BC', B: 'CA', C: 'AB', D: 'EF', E: 'FD', F: 'DE'};
  let s = `<polygon points="${pts([V.B, V.C, V.A])}" class="sh"/><polygon points="${pts([V.E, V.F, V.D])}" class="sh s2"/>`;
  s += tx(12, 136, 'B', 'b') + tx(138, 136, 'C', 'b') + tx(60, 22, 'A', 'b') + tx(298, 136, 'E', 'b') + tx(172, 136, 'F', 'b') + tx(250, 22, 'D', 'b');
  const side = {AB: [30, 80, 'end'], BC: [75, 138], CA: [102, 80, 'start'], DE: [280, 80, 'start'], EF: [235, 138], FD: [208, 80, 'end']};
  for(const k in side) if(L[k]) s += tx(side[k][0], side[k][1], L[k], cl(L[k]), side[k][2]);
  for(const k in tri) if(L[k]) s += angLab(V[k], V[tri[k][0]], V[tri[k][1]], k === 'A' || k === 'D' ? 30 : 27, L[k]);
  return svg(310, 146, s);
};
/* 角柱（n角柱）・円柱（n = 0）の 見取図。見えない 辺は 点線（側面が 手前を 向いて いるかで 決める）。labs は {h:'高さ', r:'半径（円柱）'} */
F.prism = (n, labs) => {
  const cx = 90, rx = 56, ry = 18, top = 30, h = 90, yb = top + h, L = labs || {}, W = L.h ? 214 : 190, HH = yb + ry + 10;
  const hl = L.h ? tx(cx + rx + 8, top + h / 2 + 5, L.h, isQ(L.h) ? 'q' : 'sm', 'start') : '';
  if(!n){ const x1 = cx - rx, x2 = cx + rx;
    return svg(W, HH, `<path d="M${x1} ${top}V${yb}A${rx} ${ry} 0 0 0 ${x2} ${yb}V${top}Z" class="sh ns"/>`
      + `<path d="M${x1} ${yb}A${rx} ${ry} 0 0 1 ${x2} ${yb}" class="ln dash"/><path d="M${x1} ${yb}A${rx} ${ry} 0 0 0 ${x2} ${yb}" class="ln"/>`
      + `<line x1="${x1}" y1="${top}" x2="${x1}" y2="${yb}" class="ln"/><line x1="${x2}" y1="${top}" x2="${x2}" y2="${yb}" class="ln"/><ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" class="sh s2"/>`
      + (L.r ? `<circle cx="${cx}" cy="${top}" r="2.5" class="pt"/><line x1="${cx}" y1="${top}" x2="${x2}" y2="${top}" class="ln"/>` + tx(cx + rx / 2, top - 5, L.r, 'sm') : '') + hl);
  }
  const rot = n === 4 ? 0.35 : 0, ang = k => Math.PI / 2 + k * 2 * Math.PI / n + Math.PI / n + rot, front = k => Math.sin(ang(k) + Math.PI / n) > 1e-9;   // k と k+1 の 間の 側面（四角柱は 少し 回して 2つの 側面を 見せる）
  const up = Array.from({length: n}, (_, k) => [cx + rx * Math.cos(ang(k)), top + ry * Math.sin(ang(k))]), dn = up.map(p => [p[0], p[1] + h]);
  const seg = (p, q, vis) => `<line x1="${r1(p[0])}" y1="${r1(p[1])}" x2="${r1(q[0])}" y2="${r1(q[1])}" class="ln${vis ? '' : ' dash'}"/>`;
  let s = '', hid = '', vis = '';
  for(let k = 0; k < n; k++){ const k2 = (k + 1) % n;
    if(front(k)) s += `<polygon points="${pts([up[k], up[k2], dn[k2], dn[k]])}" class="sh ns"/>`;
    const e = seg(dn[k], dn[k2], front(k)), v = seg(up[k], dn[k], front(k) || front((k + n - 1) % n));
    if(front(k)) vis += e; else hid += e;
    if(front(k) || front((k + n - 1) % n)) vis += v; else hid += v; }
  return svg(W, HH, s + `<polygon points="${pts(up)}" class="sh s2"/>` + hid + vis + hl);
};
/* 底面を 手前に 見せた 角柱（教科書の ように ねかせた 見取図）：fr は 底面の 頂点 [x, y]（y は 上。左まわり）、dep は 角柱の 高さ（おく行き）。
   labs：h（おく行きの 長さ）・e0, e1, …（底面の i 番目の 辺の 外がわ。i0, i1, … は 内がわ）・hl（底面の 中の 高さの 点線：[頂点 i, 字, 'L' なら 左に 字]） */
F.prismSide = (fr, dep, labs) => {
  const L = labs || {}, n = fr.length, xs = fr.map(p => p[0]), ys = fr.map(p => p[1]), wx = Math.max(...xs) - Math.min(...xs), wy = Math.max(...ys) - Math.min(...ys);
  const k = Math.min(150 / (wx + dep * 0.55), 96 / (wy + dep * 0.4)), x0 = 30 - Math.min(...xs) * k, y0 = 18 + (Math.max(...ys) + dep * 0.4) * k;
  const F0 = fr.map(p => [x0 + p[0] * k, y0 - p[1] * k]), B0 = F0.map(p => [p[0] + dep * 0.55 * k, p[1] - dep * 0.4 * k]);
  const vis = i => { const a = fr[i], b = fr[(i + 1) % n]; return (b[1] - a[1]) * 0.55 - (b[0] - a[0]) * 0.4 > 1e-9; };   // 側面の 外向きの 向きが おく（右上）を 向けば 見える
  const seg = (p, q, v) => `<line x1="${r1(p[0])}" y1="${r1(p[1])}" x2="${r1(q[0])}" y2="${r1(q[1])}" class="ln${v ? '' : ' dash'}"/>`;
  let s = '', hid = '', vs = '';
  for(let i = 0; i < n; i++){ const j = (i + 1) % n, pv = (i + n - 1) % n;
    if(vis(i)) s += `<polygon points="${pts([F0[i], F0[j], B0[j], B0[i]])}" class="sh ns"/>`;
    const e = seg(B0[i], B0[j], vis(i)), d = seg(F0[i], B0[i], vis(i) || vis(pv));
    if(vis(i)) vs += e; else hid += e; if(vis(i) || vis(pv)) vs += d; else hid += d; }
  s += hid + `<polygon points="${pts(F0)}" class="sh s2"/>` + vs;
  const G = [F0.reduce((a, p) => a + p[0], 0) / n, F0.reduce((a, p) => a + p[1], 0) / n];
  for(let i = 0; i < n; i++) for(const inner of [false, true]){ const v = L[(inner ? 'i' : 'e') + i]; if(v == null) continue; const j = (i + 1) % n, M = [(F0[i][0] + F0[j][0]) / 2, (F0[i][1] + F0[j][1]) / 2], o = unitV(G, M).map(c => inner ? -c : c);
    s += tx(M[0] + o[0] * 12, M[1] + o[1] * 12 + 5, v, isQ(v) ? 'q' : 'sm', Math.abs(o[0]) > 0.6 ? (o[0] > 0 ? 'start' : 'end') : 'middle'); }
  if(L.hl){ const [i, v, side] = L.hl, P = F0[i], yb = Math.max(...F0.map(p => p[1])), lf = side === 'L'; s += `<line x1="${r1(P[0])}" y1="${r1(P[1])}" x2="${r1(P[0])}" y2="${r1(yb)}" class="ln dash"/>` + tx(P[0] + (lf ? -9 : 5), (P[1] + yb) / 2 + 12, v, isQ(v) ? 'q' : 'sm', lf ? 'end' : 'start'); }
  if(L.h){ let best = 0; for(let i = 1; i < n; i++) if(F0[i][0] + F0[i][1] * 0.01 > F0[best][0] + F0[best][1] * 0.01) best = i;
    const P = F0[best], Q = B0[best]; s += tx((P[0] + Q[0]) / 2 + 8, (P[1] + Q[1]) / 2 + 12, L.h, isQ(L.h) ? 'q' : 'sm', 'start'); }
  return svg(Math.max(...B0.map(p => p[0])) + 56, y0 + 26, s);
};
/* 同じ 大きさの ボールが 箱に ならぶ（k こ） */
F.balls = k => {
  const r = Math.min(22, 130 / k), W = 2 * r * k; let s = `<rect x="10" y="8" width="${r1(W)}" height="${r1(2 * r)}" class="cell"/>`;
  for(let i = 0; i < k; i++) s += `<circle cx="${r1(10 + r + 2 * r * i)}" cy="${r1(8 + r)}" r="${r1(r - 1)}" class="sh s3"/>`;
  return svg(W + 20, 2 * r + 16, s);
};
/* ドットプロット：lo〜hi の 目もりの 上に、それぞれの 値の 数だけ ● を つむ */
F.dotplot = (lo, hi, vals, unit) => {
  const u = Math.min(24, 300 / (hi - lo + 1)), r = Math.min(8, u * 0.38), cnt = {}, mx = Math.max(...vals.map(v => (cnt[v] = (cnt[v] || 0) + 1)));
  const H = 30 + mx * 2 * (r + 1.5), X = v => 18 + (v - lo + 0.5) * u, y0 = H - 4; let s = '';
  for(const k in cnt) for(let i = 0; i < cnt[k]; i++) s += `<circle cx="${r1(X(+k))}" cy="${r1(y0 - r - 1 - i * 2 * (r + 1.5))}" r="${r1(r)}" class="d1"/>`;
  s += `<line x1="10" y1="${y0 + 2}" x2="${r1(X(hi) + u / 2 + 6)}" y2="${y0 + 2}" class="ca"/>`;
  for(let v = lo; v <= hi; v++) s += `<line x1="${r1(X(v))}" y1="${y0 + 2}" x2="${r1(X(v))}" y2="${y0 + 7}" class="ca"/>` + tx(X(v), y0 + 20, String(v), 'ax');
  return svg(X(hi) + u / 2 + 58, H + 26, s + tx(X(hi) + u / 2 + 8, y0 + 20, `（${unit}）`, 'ax', 'start'), 'chartfig');
};
/* 柱状グラフ（ヒストグラム）：edges は 区切り（n+1 こ）、counts は 度数 */
F.hist = (edges, counts, xunit, yunit) => {
  const W = 320, H = 190, L = 40, B = 30, T = 22, {top, lab} = niceTicks(Math.max(...counts), 1), n = counts.length, bw = (W - L - 24) / n, X = i => L + 8 + bw * i;
  let s = axes(W, H, L, B, T, top, 1, lab, yunit);
  counts.forEach((c, i) => { if(!c) return; const y = H - B - (H - B - T) * c / top, x = X(i) + 1, w = bw - 2, r = Math.min(4, H - B - y);
    s += `<path d="M${r1(x)} ${H - B}V${r1(y + r)}Q${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + r)}V${H - B}Z" class="gb" style="--i:${i}"/>`; });
  edges.forEach((e, i) => { s += tx(X(i), H - B + 16, String(e), 'ax'); });
  return svg(W, H + 12, s + tx(W - 4, H + 8, `（${xunit}）`, 'ax', 'end'), 'chartfig');
};
/* 箱ひげ図：st は {min, q1, q2, q3, max}。lo〜hi に step ごとの 目もり */
F.boxplot = (st, lo, hi, step, unit) => {
  const W = 324, L = 18, R = W - 48, X = v => L + (R - L) * (v - lo) / (hi - lo), y = 34, h = 30; let s = '';
  s += `<line x1="${r1(X(st.min))}" y1="${y}" x2="${r1(X(st.q1))}" y2="${y}" class="ln"/><line x1="${r1(X(st.q3))}" y1="${y}" x2="${r1(X(st.max))}" y2="${y}" class="ln"/>`;
  s += `<line x1="${r1(X(st.min))}" y1="${y - 9}" x2="${r1(X(st.min))}" y2="${y + 9}" class="ln"/><line x1="${r1(X(st.max))}" y1="${y - 9}" x2="${r1(X(st.max))}" y2="${y + 9}" class="ln"/>`;
  s += `<rect x="${r1(X(st.q1))}" y="${y - h / 2}" width="${r1(X(st.q3) - X(st.q1))}" height="${h}" class="sh"/><line x1="${r1(X(st.q2))}" y1="${y - h / 2}" x2="${r1(X(st.q2))}" y2="${y + h / 2}" class="ln"/>`;
  const ya = y + h / 2 + 16; s += `<line x1="${L}" y1="${ya}" x2="${R}" y2="${ya}" class="ca"/>`;
  for(let v = lo; v <= hi + 1e-9; v += step) s += `<line x1="${r1(X(v))}" y1="${ya}" x2="${r1(X(v))}" y2="${ya + 5}" class="ca"/>` + tx(X(v), ya + 18, String(+v.toFixed(2)), 'ax');
  return svg(W, ya + 26, s + tx(W - 2, ya + 18, `（${unit}）`, 'ax', 'end'), 'chartfig');
};
/* 拡大図・縮図：三角形 ABC と、k 倍の 三角形 DEF（同じ 向き）。labs は polyFig と 同じ */
F.scaled = (k, labs) => {
  const base = 56, s1 = base * (k < 1 ? 1 / k : 1), s2 = s1 * k, shp = sz => [[0.42 * sz, 0], [0, sz], [1.45 * sz, sz]];
  const top = 26, x1 = 24, x2 = x1 + 1.45 * s1 + 46, h = Math.max(s1, s2) + top, off = (sz, x) => shp(sz).map(p => [p[0] + x, p[1] + h - sz]);
  return svg(x2 + 1.45 * s2 + 34, h + 30, polyFig(off(s1, x1), ['A', 'B', 'C'], labs) + polyFig(off(s2, x2), ['D', 'E', 'F'], labs, 's2'));
};
/* 線対称な 五角形（たての 対称の 軸は 点線）：A が 上、B・C が 右、D・E が 左 */
F.symLine = labs => {
  const P = [[110, 22], [172, 70], [160, 150], [60, 150], [48, 70]];
  return svg(230, 182, `<line x1="110" y1="8" x2="110" y2="170" class="ln dash"/>` + polyFig(P, ['A', 'B', 'C', 'D', 'E'], labs));
};
/* 点対称な 平行四辺形 ABCD（対角線は 点線、O が 対称の 中心）。labs の OA・OB・OC・OD は 対角線の 半分 */
F.symPoint = labs => {
  const P = [[40, 140], [210, 140], [250, 40], [80, 40]], O = [145, 90], L = labs || {};
  let s = polyFig(P, ['A', 'B', 'C', 'D'], labs) + `<line x1="40" y1="140" x2="250" y2="40" class="ln dash"/><line x1="210" y1="140" x2="80" y2="40" class="ln dash"/><circle cx="${O[0]}" cy="${O[1]}" r="3.5" class="pt"/>` + tx(O[0], O[1] + 20, 'O', 'b');
  const seg = {OA: [92, 108], OC: [204, 62], OB: [184, 122], OD: [104, 58]};
  for(const k in seg) if(L[k]) s += tx(seg[k][0], seg[k][1], L[k], isQ(L[k]) ? 'q' : 'sm');
  return svg(280, 166, s);
};
/* 角錐（n角錐）・円錐（n = 0）：labs は {h:'高さ', r:'半径'}（高さ・半径の 線は 点線） */
F.pyramid = (n, labs) => {
  const cx = 95, rx = 60, ry = 18, apex = 16, yb = 130, L = labs || {}; let s = '';
  if(!n){ s += `<path d="M${cx - rx} ${yb}L${cx} ${apex}L${cx + rx} ${yb}A${rx} ${ry} 0 0 1 ${cx - rx} ${yb}Z" class="sh"/><path d="M${cx - rx} ${yb}A${rx} ${ry} 0 0 1 ${cx + rx} ${yb}" class="ln dash"/>`; }
  else {
    const rot = n === 4 ? 0.35 : 0, ang = k => Math.PI / 2 + k * 2 * Math.PI / n + Math.PI / n + rot, front = k => Math.sin(ang(k) + Math.PI / n) > 1e-9, A = [cx, apex];
    const bp = Array.from({length: n}, (_, k) => [cx + rx * Math.cos(ang(k)), yb + ry * Math.sin(ang(k))]);
    const seg = (p, q, vis) => `<line x1="${r1(p[0])}" y1="${r1(p[1])}" x2="${r1(q[0])}" y2="${r1(q[1])}" class="ln${vis ? '' : ' dash'}"/>`;
    let hid = '', vis = '';
    for(let k = 0; k < n; k++){ const k2 = (k + 1) % n;
      if(front(k)) s += `<polygon points="${pts([A, bp[k], bp[k2]])}" class="sh ns"/>`;
      const e = seg(bp[k], bp[k2], front(k)), v = seg(A, bp[k], front(k) || front((k + n - 1) % n));
      if(front(k)) vis += e; else hid += e; if(front(k) || front((k + n - 1) % n)) vis += v; else hid += v; }
    s += hid + vis;
  }
  s += `<line x1="${cx}" y1="${apex}" x2="${cx}" y2="${yb}" class="ln dash"/><circle cx="${cx}" cy="${yb}" r="2.5" class="pt"/>`;
  if(L.h) s += tx(cx + 5, yb - 30, L.h, isQ(L.h) ? 'q' : 'sm', 'start');
  if(L.r) s += `<line x1="${cx}" y1="${yb}" x2="${cx + rx}" y2="${yb}" class="ln dash"/>` + tx(cx + rx / 2, yb + ry + 14, L.r, isQ(L.r) ? 'q' : 'sm');
  return svg(cx * 2 + 10, yb + ry + 22, s);
};
/* 球（半径の 線と ラベル） */
F.sphere = r => {
  const c = 80, R0 = 62; return svg(170, 166, `<circle cx="${c}" cy="${c}" r="${R0}" class="sh"/><path d="M${c - R0} ${c}A${R0} 16 0 0 1 ${c + R0} ${c}" class="ln dash"/><path d="M${c - R0} ${c}A${R0} 16 0 0 0 ${c + R0} ${c}" class="ln"/>`
    + `<circle cx="${c}" cy="${c}" r="2.5" class="pt"/><line x1="${c}" y1="${c}" x2="${c + R0}" y2="${c}" class="ln"/>` + tx(c + R0 / 2, c - 19, r, 'sm'));
};
/* 平行線と 角（中学）：上の 直線 ℓ・下の 直線 m と、交わる 直線。上の 交わり（T）と 下の 交わり（B）の
   ur（右上）・ul（左上）・dl（左下）・dr（右下）に ラベル。marks は {'T-ur':'65°', 'B-dl':'x'} の ように */
F.par2 = (a, marks) => {
  const W = 260, y1 = 40, y2 = 110, t = a * Math.PI / 180, dx = (y2 - y1) / Math.tan(t), xA = W / 2 + dx / 2, xB = xA - dx;
  const ext = 36, x0 = xA + ext / Math.tan(t), x3 = xB - ext / Math.tan(t), PA = [xA, y1], PB = [xB, y2], M = marks || {};
  let s = `<line x1="10" y1="${y1}" x2="${W - 10}" y2="${y1}" class="ln"/><line x1="10" y1="${y2}" x2="${W - 10}" y2="${y2}" class="ln"/><line x1="${r1(x0)}" y1="${y1 - ext}" x2="${r1(x3)}" y2="${y2 + ext}" class="ln"/>`;
  s += tx(W - 6, y1 + 16, 'ℓ', 'sm', 'end') + tx(W - 6, y2 + 16, 'm', 'sm', 'end');
  const rays = (P, y, up, dn) => ({ur: [[W, y], up], ul: [up, [0, y]], dl: [[0, y], dn], dr: [dn, [W, y]]});
  const R = {T: rays(PA, y1, [x0, y1 - ext], PB), B: rays(PB, y2, PA, [x3, y2 + ext])}, P = {T: PA, B: PB};
  for(const k in M){ const [w, pos] = k.split('-'), [r1_, r2_] = R[w][pos], deg = pos === 'ur' || pos === 'dl' ? a : 180 - a; s += angLab(P[w], r1_, r2_, deg < 70 ? 30 : 24, M[k]); }
  return svg(W, y2 + ext + 6, s);
};
/* くの字：平行な ℓ・m の 間の 点 P。A（ℓ の 上）で a°、B（m の 上）で b°、P の 角が x */
F.kink = (a, b) => {
  const W = 260, y1 = 30, y2 = 120, yP = (y1 + y2) / 2, xP = 196, A = [xP - (yP - y1) / Math.tan(a * Math.PI / 180), y1], B = [xP - (y2 - yP) / Math.tan(b * Math.PI / 180), y2], P = [xP, yP];
  let s = `<line x1="10" y1="${y1}" x2="${W - 10}" y2="${y1}" class="ln"/><line x1="10" y1="${y2}" x2="${W - 10}" y2="${y2}" class="ln"/><polyline points="${pts([A, P, B])}" class="ln"/>`;
  s += tx(16, y1 - 6, 'ℓ', 'sm', 'start') + tx(16, y2 - 6, 'm', 'sm', 'start');
  s += angLab(A, [W, y1], P, a < 45 ? 34 : 26, a + '°') + angLab(B, [W, y2], P, b < 45 ? 34 : 26, b + '°') + angLab(P, A, B, 24, 'x');
  return svg(W, y2 + 16, s);
};
/* 円周角：kind 'center'（中心角 c° と 円周角 x）・'same'（同じ 弧の 円周角 a° と x）・'diam'（直径 AB、角 A が a°、角 B が x） */
F.inscribed = (kind, c, lab1, lab2) => {
  const cx = 100, cy = 96, R0 = 74, at = d => [cx + R0 * Math.cos(d * Math.PI / 180), cy - R0 * Math.sin(d * Math.PI / 180)], O = [cx, cy];
  const name = (p, nm) => { const o = unitV(O, p); return tx(p[0] + o[0] * 14, p[1] + o[1] * 14 + 5, nm, 'b'); };
  let s = `<circle cx="${cx}" cy="${cy}" r="${R0}" class="sh"/><circle cx="${cx}" cy="${cy}" r="2.5" class="pt"/>` + (kind === 'diam' ? tx(cx, cy + 18, 'O', 'b') : kind === 'center' ? tx(cx, cy - 9, 'O', 'b') : tx(cx + 8, cy + 4, 'O', 'b', 'start'));
  if(kind === 'diam'){ const A = at(180), B = at(0), P = at(2 * c);
    s += `<polygon points="${pts([A, B, P])}" class="ln"/>` + name(A, 'A') + name(B, 'B') + name(P, 'P');
    return svg(cx * 2, cy * 2 + 6, s + angLab(A, B, P, 30, lab1) + angLab(B, P, A, 30, lab2));
  }
  const A = at(270 - c / 2), B = at(270 + c / 2), P = at(kind === 'same' ? 55 : 100), Q = at(140);
  s += `<polyline points="${pts([A, P, B])}" class="ln"/>` + name(A, 'A') + name(B, 'B') + name(P, 'P');
  if(kind === 'center') s += `<polyline points="${pts([A, O, B])}" class="ln"/>` + angLab(O, A, B, c > 120 ? 22 : 28, lab1) + angLab(P, A, B, 34, lab2, 16);
  else s += `<polyline points="${pts([A, Q, B])}" class="ln"/>` + name(Q, 'Q') + angLab(P, A, B, 34, lab1, 16) + angLab(Q, A, B, 34, lab2, 16);
  return svg(cx * 2, cy * 2 + 6, s);
};
/* 三角形と 平行線：DE ∥ BC（AD : AB = t）。labs の AD・DB・AE・EC・DE・BC に 長さ */
F.triPar = (t, labs) => {
  const A = [120, 18], B = [24, 160], C = [236, 160], D = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t], E = [A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t], L = labs || {};
  let s = `<polygon points="${pts([A, B, C])}" class="sh"/><line x1="${r1(D[0])}" y1="${r1(D[1])}" x2="${r1(E[0])}" y2="${r1(E[1])}" class="ln"/>`;
  s += tx(A[0], A[1] - 4, 'A', 'b') + tx(B[0] - 10, B[1] + 6, 'B', 'b') + tx(C[0] + 10, C[1] + 6, 'C', 'b') + tx(D[0] - 12, D[1] + 4, 'D', 'b') + tx(E[0] + 12, E[1] + 4, 'E', 'b');
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], put = (k, p, dx, dy, anc) => { if(L[k]) s += tx(p[0] + dx, p[1] + dy, L[k], isQ(L[k]) ? 'q' : 'sm', anc); };
  put('AD', mid(A, D), -10, 4, 'end'); put('DB', mid(D, B), -10, 4, 'end'); put('AE', mid(A, E), 10, 4, 'start'); put('EC', mid(E, C), 10, 4, 'start');
  put('DE', mid(D, E), 0, -6, 'middle'); put('BC', mid(B, C), 0, 20, 'middle');
  return svg(260, 188, s);
};
/* 3本の 平行線と 2本の 直線：左の 直線で a・b、右の 直線で c・x（labs は {a, b, c, d}） */
F.threePar = (ra, rb, labs) => {
  const ys = [26, 26 + 120 * ra / (ra + rb), 146], L = labs || {}, lx = y => 60 + (y - 26) * 0.25, rx = y => 200 - (y - 26) * 0.45;
  let s = ys.map((y, i) => `<line x1="14" y1="${r1(y)}" x2="276" y2="${r1(y)}" class="ln"/>` + tx(284, y + 5, ['ℓ', 'm', 'n'][i], 'sm', 'start')).join('');
  s += `<line x1="${lx(10)}" y1="10" x2="${lx(162)}" y2="162" class="ln"/><line x1="${rx(10)}" y1="10" x2="${rx(162)}" y2="162" class="ln"/>`;
  const put = (k, x, y, anc) => { if(L[k]) s += tx(x, y, L[k], isQ(L[k]) ? 'q' : 'sm', anc); };
  put('a', lx((ys[0] + ys[1]) / 2) - 8, (ys[0] + ys[1]) / 2 + 5, 'end'); put('b', lx((ys[1] + ys[2]) / 2) - 8, (ys[1] + ys[2]) / 2 + 5, 'end');
  put('c', rx((ys[0] + ys[1]) / 2) + 8, (ys[0] + ys[1]) / 2 + 5, 'start'); put('d', rx((ys[1] + ys[2]) / 2) + 8, (ys[1] + ys[2]) / 2 + 5, 'start');
  return svg(300, 172, s);
};
/* 相似な三角形（相似比 m:n） */
F.similar = (m, n) => {
  const k = 60 / Math.max(m, n), a = m * k, b = n * k;
  const tri = (ox, s) => pts([[ox, 10 + s * 1.2], [ox + s * 1.5, 10 + s * 1.2], [ox + s * 0.4, 10]]);
  return svg(a * 1.5 + b * 1.5 + 60, Math.max(a, b) * 1.2 + 34, `<polygon points="${tri(10, a)}" class="sh"/><polygon points="${tri(40 + a * 1.5, b)}" class="sh s2"/>` + tx(10 + a * 0.75, a * 1.2 + 28, 'A', 'sm') + tx(40 + a * 1.5 + b * 0.75, b * 1.2 + 28, 'B', 'sm'));
};

Object.assign(S, { mkRng, R, gcd, lcm, MI, num, term, par, sgnOp, decStr, poly, factors, divisors, esc, mathHtml, speakMath, stepPlain, stepVals, F });
})();
