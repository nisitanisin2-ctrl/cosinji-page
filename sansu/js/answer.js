/* ════════════════════════════════════════════════════════════════
   答え合わせと、声の答えの読み取り
   ・S.makeProblem(単元, 乱数, むずかしさ) … 問題を作って、□の種類・答えの文字をそろえる。
     むずかしさ 1（やさしい）・3（むずかしい）は、候補を 6つ 作って むずかしさの 点（S.diffScore）で えらぶ（v4）
   ・S.check(問題, □の中身)       … {ok, near, msg}。near は「あと少し（約分できる など）」でまちがいにしない
   ・S.fromSpeech(問題, 聞こえた言葉) … □に入れる中身の並び（読めなければ null）
   ・S.sayAnswer(問題)            … 答えを話し言葉で（読み上げと、テストで声の読み取りを確かめるのに使う）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU, MI = S.MI;

/* むずかしさの 点：数の けた・答えの けた・□の 数・ヒントの 数・負の数・くり上がりの 回数 */
function carries(a, b, op){
  const x = String(a).split('').reverse().map(Number), y = String(b).split('').reverse().map(Number); let c = 0, n = 0;
  if(op === '×'){ for(let i = 0; i < x.length; i++){ const q = x[i] * b + c; c = Math.floor(q / 10); if(c) n++; } return n; }
  for(let i = 0; i < Math.max(x.length, y.length); i++){
    const u = x[i] || 0, v = y[i] || 0;
    if(op === '+'){ c = u + v + c >= 10 ? 1 : 0; n += c; } else { c = u - c < v ? 1 : 0; n += c; }
  }
  return n;
}
S.diffScore = p => {
  const strip = t => String(t || '').replace(/\{\d+\}/g, ' ');
  const nums = (strip(p.q) + ' ' + strip(p.form)).match(/\d+(?:\.\d+)?/g) || [];
  let sc = nums.reduce((s, n) => s + n.replace('.', '').length + (n.includes('.') ? 1 : 0), 0);
  sc += p.ans.reduce((s, a) => s + String(a).replace(/[^\d]/g, '').length, 0) * 1.5 + (p.ans.length - 1) * 1.5 + (p.steps || []).length * 0.8;
  if(/(^|[(\s])−\d/.test(p.form + ' ' + p.ans.join(' '))) sc += 1.5;
  const f = String(p.form).split('→')[0];   // 式の 形：文字の 項・分数・かっこが 多いほど むずかしい
  sc += Math.max(0, (f.match(/[xy]/g) || []).length - 1) * 1.2 + (f.match(/\[\[/g) || []).length + (f.match(/\(/g) || []).length * 0.5;
  const m = /^(\d+) ([+−×]) (\d+) = \{0\}$/.exec(p.form);
  if(m && (m[2] !== '×' || +m[3] < 10)) sc += 1.5 * carries(+m[1], +m[3], m[2]);
  return sc;
};
S.makeProblem = (unit, rng, lv) => {
  rng = rng || Math.random;
  if(lv === 1 || lv === 3){   // 候補から やさしい（むずかしい）ほうの 2つの どちらか
    const cs = []; for(let i = 0; i < 6; i++){ const c = build(unit, rng); c.score = S.diffScore(c); cs.push(c); }
    cs.sort((a, b) => a.score - b.score);
    const k = rng() < 0.5 ? 0 : 1, p = lv === 1 ? cs[k] : cs[cs.length - 1 - k];
    p.lv = lv; return p;
  }
  const p = build(unit, rng); p.lv = 2; return p;
};
function build(unit, rng){
  const p = unit.gen(S.R(rng));
  const nb = (p.form.match(/\{\d+\}/g) || []).length;
  p.ans = p.ans.map(v => typeof v === 'number' ? S.num(v) : String(v));
  p.kinds = (p.kinds || []).slice();
  for(let i = 0; i < nb; i++) if(!p.kinds[i]) p.kinds[i] = 'n';
  // 「-6」のように 計算の 途中で できた 負の数も、画面では − で 書く
  const fm = s => typeof s === 'string' ? s.replace(/(^|[^0-9A-Za-z_])-(?=\d)/g, '$1' + MI) : s;
  p.q = fm(p.q); p.form = fm(p.form); p.answer = fm(p.answer); if(p.note) p.note = fm(p.note);
  p.steps = (p.steps || []).filter(Boolean).map(s => typeof s === 'string' ? fm(s) : Object.assign({}, s, {t: fm(s.t)}));
  p.unit = unit.id; p.key = p.q + '|' + p.form + '|' + p.ans.join(',');   // 図だけ ちがう 問題（とけい など）も 見分ける
  return p;
}

/* ── □の中身を数に ── */
const normIn = s => String(s == null ? '' : s).normalize('NFKC').replace(/[-‐‑‒–—―−﹣ー]/g, '-').replace(/\s+/g, '');
function parseBlank(kind, raw){
  const s = normIn(raw);
  switch(kind){
    case 'n': return /^\d+$/.test(s) ? +s : null;
    case 'i': return /^-?\d+$/.test(s) ? +s : null;
    case 'd': return /^-?\d+(\.\d+)?$/.test(s) ? +s : null;
    case 't': return /^[+-]?\d+$/.test(s) ? +s : null;
    case 'tc': if(s === '+') return 1; if(s === '-') return -1; return /^[+-]?\d+$/.test(s) ? +s : null;
    case 'c': if(s === '') return 1; if(s === '-') return -1; return /^-?\d+$/.test(s) ? +s : null;
  }
  return null;
}
S.parseBlank = parseBlank;
/* 空のまま「こたえる」を押してよい□（係数の 1 は書かないので） */
S.blankMayBeEmpty = kind => kind === 'c';

S.check = (p, vals) => {
  const g = vals.map((v, i) => parseBlank(p.kinds[i], v));
  if(g.some(v => v === null || Number.isNaN(v))) return {ok: false, bad: true, msg: '書き方を たしかめてね'};
  if(p.check){ const r = p.check(g, vals); if(r) return r; }
  const w = p.ans.map((v, i) => parseBlank(p.kinds[i], v)), eq = (x, y) => Math.abs(x - y) < 1e-9;
  if(p.order === 'any'){ const a = g.slice().sort((x, y) => x - y), b = w.slice().sort((x, y) => x - y); return {ok: a.every((v, i) => eq(v, b[i]))}; }
  return {ok: g.every((v, i) => eq(v, w[i]))};
};

/* ── 話し言葉をそろえる ── */
const KD = {〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9};
const KS = {十: 10, 百: 100, 千: 1000}, KB = {万: 10000, 億: 100000000};
function kanjiRun(run){
  // 数の 並びとして ありえない もの（「千千」＝ぜんぜん、「五五」＝ごご、「二三」）は 数に しない
  let total = 0, sec = 0, dg = 0, seen = false, kd = false, lastSmall = Infinity;
  for(const ch of run){
    if(ch in KD){ if(kd) return null; dg = KD[ch]; seen = true; kd = true; }
    else if(ch >= '0' && ch <= '9'){ dg = dg * 10 + Number(ch); seen = true; }
    else if(ch in KS){ if(KS[ch] >= lastSmall) return null; lastSmall = KS[ch]; sec += (dg || 1) * KS[ch]; dg = 0; kd = false; seen = true; }
    else if(ch in KB){ total += (sec + dg) * KB[ch]; sec = 0; dg = 0; kd = false; lastSmall = Infinity; seen = true; }
    else return null;
  }
  return seen ? total + sec + dg : null;
}
const kanjiToDigits = t => t.replace(/[〇零一二三四五六七八九十百千万億0-9]+/g, run => {
  if(!/[〇零一二三四五六七八九十百千万億]/.test(run)) return run;
  const n = kanjiRun(run); return n === null ? run : String(n);
});
/* ひらがなで 聞こえた 数（「じゅうさん」「さんびゃくろくじゅうご」「さんぶんのに」）を 漢字の 数に。
   ひらがなの かたまりが 全部「数の ことば」と「つなぎの ことば（ぶんの・あまり・てん…）」で できている ときだけ かえる
   （「には」「ごめん」の ような ふつうの ことばは そのまま） */
const KNUM = [['ぜろ', '〇'], ['れい', '〇'], ['いち', '一'], ['いっ', '一'], ['に', '二'], ['さん', '三'], ['よん', '四'], ['よ', '四'], ['し', '四'], ['ご', '五'],
  ['ろく', '六'], ['ろっ', '六'], ['なな', '七'], ['しち', '七'], ['はち', '八'], ['はっ', '八'], ['きゅう', '九'], ['く', '九'],
  ['じゅう', '十'], ['じゅっ', '十'], ['じっ', '十'], ['ひゃく', '百'], ['びゃく', '百'], ['ぴゃく', '百'], ['せん', '千'], ['ぜん', '千'], ['まん', '万'], ['おく', '億']];
const KCON = [['ぶんの', '分の'], ['あまり', 'あまり'], ['てん', '点'], ['と', 'と'], ['たい', '対'], ['じ', '時'], ['ふん', '分'], ['ぷん', '分'], ['ど', '度'], ['は', 'は'], ['が', ' ']];
const KTOK = KNUM.map(x => [x[0], x[1], 1]).concat(KCON.map(x => [x[0], x[1], 0])).sort((a, b) => b[0].length - a[0].length);
function kanaRun(run){
  const memo = {};
  const seg = i => {   // i から 後ろを 区切れたら [漢字の 並び, 数の ことばが あったか]
    if(i === run.length) return ['', false];
    if(i in memo) return memo[i];
    let res = null;
    for(const [k, v, isNum] of KTOK){
      if(!run.startsWith(k, i)) continue;
      const rest = seg(i + k.length);
      if(rest){ res = [v + rest[0], rest[1] || !!isNum]; break; }
    }
    return memo[i] = res;
  };
  if(/[はが]$/.test(run)) return run;   // 「には」の ように 助詞で おわるのは ことば
  const r = seg(0);
  return r && r[1] ? r[0] : run;
}
const kanaToKanji = t => t.replace(/[ぁ-ゖー]+/g, kanaRun);
/* 答えの形を、話し言葉と同じ書き方の文字に（[[3/4]] → 3/4、√[2] → √2） */
const plainForm = f => String(f).replace(/\[\[([^\[\]|]*)\|([^\[\]\/]*)\/([^\[\]]*)\]\]/g, '$1と$2/$3')
  .replace(/\[\[([^\[\]\/]*)\/([^\[\]]*)\]\]/g, '$1/$2').replace(/√\[([^\[\]]*)\]/g, '√$1').replace(/\*\*/g, '')
  .replace(/[\s　]+/g, '').replace(/[＝]/g, '=').replace(/[-‐−]/g, MI);
function normSpeech(raw, p){
  // ² ³ は NFKC で 2 3 に なってしまうので、そのまま残す
  let t = [...String(raw || '')].map(ch => ch === '²' || ch === '³' ? ch : ch.normalize('NFKC')).join('').toLowerCase();
  const form = plainForm(p.form), mixed = /\{\d+\}と\{\d+\}/.test(form);
  t = t.replace(/[。．!?！？「」]/g, ' ').replace(/(です|だよ|かな|でしょう|だと思う|と思います|かも)/g, ' ');
  t = t.replace(/(プラスマイナス|ぷらすまいなす|±)/g, '±');
  t = t.replace(/(えっくす|エックス|ｘ)/g, 'x').replace(/(わい|ワイ)(?![ぁ-ん])/g, 'y');
  t = t.replace(/(の)?(2|二|に)乗/g, '²').replace(/(の)?(3|三|さん)乗/g, '³').replace(/(にじょう|じじょう)/g, '²');
  t = t.replace(/(ルート|るーと|root)/g, '√').replace(/(パイ|ぱい)/g, 'π');
  t = t.replace(/(マイナス|まいなす|ﾏｲﾅｽ|負の)/g, MI).replace(/(プラス|ぷらす|正の)/g, '+').replace(/[-‐－]/g, MI);
  t = t.replace(/([−+±])\s+(?=[\d〇一二三四五六七八九十])/g, '$1');   // 「マイナス 2」の あいだの 空白
  t = t.replace(/(足す|たす)/g, '+').replace(/(引く|ひく)/g, MI).replace(/(かける|掛ける|×)/g, '×').replace(/(割る|わる|÷)/g, '÷');
  t = t.replace(/(イコール|いこーる|＝)/g, '=').replace(/(パーセント|ぱーせんと|％)/g, '%').replace(/(余り|あまり|アマリ)/g, 'あまり').replace(/分の/g, 'ぶんの');   // 分の は いったん かなに（「さん分のに」も ひとまとまりで 読めるように）
  t = t.replace(/(かっこ|カッコ|括弧)(とじ|閉じ)?/g, ' ').replace(/度/g, '°');
  // 一言だけの かなの数（「さん」「マイナスご」など）
  t = t.replace(/(答え|こたえ|答)(は|が)?/g, ' ');
  t = kanaToKanji(t).replace(/ぶんの/g, '分の');
  t = kanjiToDigits(t);
  t = t.replace(/(\d)\s*(てん|点)\s*(\d)/g, '$1.$3').replace(/(\d)\s*(じ)(?![ょゃゅ])/g, '$1時').replace(/(\d)\s*(ふん|ぷん)/g, '$1分');
  t = t.replace(/(対|たい)\s*(?=[−+]?\d)/g, ':');
  t = t.replace(/(\d+)\s*分の\s*([−+]?\d+)/g, '$2/$1');                       // 4分の3 → 3/4
  if(mixed) t = t.replace(/(\d+)\s*と\s*(\d+)\/(\d+)/g, '$1と$2/$3');
  else t = t.replace(/(\d+)\s*と\s*(\d+)\/(\d+)/g, (m, w, n, d) => `${+w * +d + +n}/${d}`);   // 帯分数で言っても 仮分数の□に
  t = t.replace(/([0-9x)²])\s*は\s*(?=[−+±]?\d)/g, '$1=');
  if(/時\{1\}分/.test(form)) t = t.replace(/(\d+)時(ちょうど)?\s*$/, '$1時0分');
  if(!mixed) t = t.replace(/(\d)\s*(と|か|や|、|,)?\s*x\s*=\s*(?=[−+]?\d)/g, '$1、').replace(/(\d)\s*(と|か|や|、|,)\s*(?=[−+]?\d)/g, '$1、');   // 「x=3 と x=−2」も
  t = t.replace(/(\d)\s+(?=[−+]?\d)/g, '$1、');
  // 答えの形に ない文字は落とす（「です」「センチメートル」など）
  const keep = new Set([...'0123456789.−+/√π:xy²³=±%°、', ...form.replace(/\{\d+\}/g, '')]);
  return [...t].filter(ch => keep.has(ch)).join('');
}
S.normSpeech = normSpeech; S.kanaToKanji = kanaToKanji; S.plainForm = plainForm;

const RE_KIND = {n: '(\\d+)', i: '(−?\\d+)', d: '(−?\\d+(?:\\.\\d+)?)', t: '([+−]?\\d+)', tc: '([+−]?\\d*)', c: '(−?\\d*)'};
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const opt1 = s => [...s].map(ch => `(?:${reEsc(ch)})?[、]*`).join('');          // 1文字ずつ あっても なくても よい
const optAll = s => `(?:${[...s].map(reEsc).join('[、]*')})?[、]*`;               // まるごと あっても なくても よい
function formRegex(p){
  const parts = plainForm(p.form).split(/(\{\d+\})/).filter(s => s !== ''), out = [];
  parts.forEach((s, i) => {
    const m = /^\{(\d+)\}$/.exec(s);
    if(m){ out.push(RE_KIND[p.kinds[+m[1]]] || RE_KIND.n); return; }
    if(i === 0){
      // 問題を言い直したところ（「8+5=」「3x+5=17 →」）は まるごと あってもなくてもよい。
      // そのあとの「x=」「x²」のような 短い所は 1文字ずつ
      let pre = '', post = s;
      const k = s.lastIndexOf('→') >= 0 ? s.lastIndexOf('→') : s.lastIndexOf('=');
      if(k >= 0 && (s.lastIndexOf('→') >= 0 || /\d|\)/.test(s.slice(0, k)))){ pre = s.slice(0, k + 1).replace(/→/g, ''); post = s.slice(k + 1); }
      if(post.length > 4 || /\d/.test(post)){ pre += post; post = ''; }
      out.push((pre ? optAll(pre) : '') + opt1(post));
      return;
    }
    out.push(opt1(s));
  });
  return new RegExp('^' + out.join('[、]*') + '$');
}
/* 何の□がいくつ空いているかを順に（数字の答えを 1つ言っただけのとき用） */
S.fromSpeech = (p, raw) => {
  const t = normSpeech(raw, p);
  if(!t) return null;
  const re = formRegex(p);
  const tryM = s => { const m = re.exec(s); return m ? m.slice(1).map(v => v == null ? '' : v) : null; };
  let v = tryM(t);
  if(!v && t.includes('=')) v = tryM(t.slice(t.lastIndexOf('=') + 1));
  if(!v && p.kinds.length === 1 && /^[nid]$/.test(p.kinds[0])){   // □が1つ：言った 数の さいごの 1つ（「56対72」→ 72）
    const all = t.match(/−?\d+(?:\.\d+)?/g);
    if(all){ const last = all[all.length - 1]; if(S.parseBlank(p.kinds[0], last) !== null) v = [last]; }
  }
  if(!v && p.val != null){   // 分数の答えを 小数や 帯分数で 言ったとき
    const m = /^(−)?(\d+(?:\.\d+)?)(?:\/(\d+))?$/.exec(t);
    if(m){ const x = (m[1] ? -1 : 1) * (+m[2]) / (m[3] ? +m[3] : 1); if(Math.abs(x - p.val) < 1e-9) v = p.ans.slice(); }
  }
  if(!v) return null;
  return v.map(s => s.replace(/-/g, MI));
};

/* ── 答えを話し言葉で（「4分の3」「マイナス5」「エックスの2乗マイナス2エックス…」） ── */
S.sayAnswer = (p, vals) => {
  const v = vals || p.ans;
  // 問題を言い直したところ（「8 + 5 =」「… →」）は言わない。「x =」のような 短い所は残す
  let f = String(p.form);
  const b0 = f.search(/\{\d+\}/), head = b0 >= 0 ? f.slice(0, b0) : f, k = Math.max(head.lastIndexOf('→'), head.lastIndexOf('='));
  if(k >= 0 && (head.lastIndexOf('→') >= 0 || /[\d)]/.test(head.slice(0, k)))) f = f.slice(k + 1);
  f = f.replace(/\{(\d+)\}/g, (m, i) => v[+i] == null ? '' : v[+i]);
  f = f.replace(/\[\[([^\[\]|]*)\|([^\[\]\/]*)\/([^\[\]]*)\]\]/g, '$1と$3分の$2').replace(/\[\[([^\[\]\/]*)\/([^\[\]]*)\]\]/g, '$2分の$1').replace(/√\[([^\[\]]*)\]/g, 'ルート$1');
  f = f.replace(/±/g, 'プラスマイナス').replace(/−/g, 'マイナス').replace(/\+/g, 'プラス').replace(/x²/g, 'エックスの2乗').replace(/x/g, 'エックス').replace(/y/g, 'ワイ')
       .replace(/π/g, 'パイ').replace(/:/g, '対').replace(/%/g, 'パーセント').replace(/=/g, 'イコール').replace(/[()]/g, ' ').replace(/\s+/g, ' ');
  return f.trim();
};
})();
