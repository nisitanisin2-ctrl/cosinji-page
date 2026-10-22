/* ✍️かきじゅん帳（表電卓 v532）：常用漢字2136字とひらがな・カタカナ（v558）の書き順アニメーション・綺麗に書くコツ・なぞり練習・文章をなぞる（v558）。
   v567 から 人名用漢字（晋・匡・伊 など）と、地名・名字・身近なことばに使う そのほかの漢字も（js/data2.js）。
   字は漢字・よみ・画数のほか、✏️ 手書き・🎤 声でも探せる。データは js/data.js・js/data2.js、手書きの照合は js/recog.js */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  // 表電卓から開いたとき（#from=hyo）は、左上に「← 表電卓」を出す（iPhone には画面に「戻る」がないため）
  var fromHyo = false;
  try {
    if (/from=hyo/.test(location.hash)) { sessionStorage.setItem('kkj_from_hyo', '1'); history.replaceState(history.state, '', location.pathname + location.search); }
    fromHyo = sessionStorage.getItem('kkj_from_hyo') === '1';
  } catch (e) { }
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('kkj:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('kkj:' + k, JSON.stringify(v)); } catch (e) { } }
  };
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }

  // ---------------- データ ----------------
  // 常用漢字（data.js）のあとに、ひらがな・カタカナ（kana.js。v558。学年の代わりに 8＝ひらがな・9＝カタカナ）、
  // 人名用漢字（data2.js。v567。10）・そのほかの漢字（地名・名字・身近なことば。11）
  var RAW = (Array.isArray(window.KKJ_DATA) ? window.KKJ_DATA : []).concat(Array.isArray(window.KKJ_KANA) ? window.KKJ_KANA : [], Array.isArray(window.KKJ_DATA2) ? window.KKJ_DATA2 : []);
  var K = new Map();
  var kata2hira = function (s) { return s.replace(/[ァ-ヶ]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x60); }); };
  var ALL = RAW.map(function (r, i) {
    var o = { c: r[0], g: r[1], n: r[2], on: r[3] ? r[3].split(' ') : [], kun: r[4] ? r[4].split(' ') : [],
      paths: r[5], types: r[6], nums: r[7], comps: r[8], rad: r[9], i: i };
    var rd = [];
    o.on.forEach(function (x) { rd.push(kata2hira(x)); });
    o.kun.forEach(function (x) {
      var s = x.replace(/-/g, '');
      rd.push(s.replace('.', ''));
      if (s.indexOf('.') > 0) rd.push(s.split('.')[0]);
    });
    o.kana = o.g === 8 || o.g === 9;
    if (o.kana) {
      rd = [kata2hira(o.c)];
      if (/\u309A/.test(o.c.normalize('NFD'))) o.circ = o.n - 1;   // 半濁点（゜）の丸の画
    }
    o.rd = rd;
    o.key = rd[0] || '';
    K.set(o.c, o);
    return o;
  });
  // 同じ字の ちがう形。髙（はしご高）・﨑（たつさき）・濵・𠮷（つちよし）は 書き順データがないので、ふつうの形で出す（v567）
  var ALIAS = { '\u{20B9F}': '叱', '剝': '剥', '頬': '頰', '填': '塡', '髙': '高', '﨑': '崎', '濵': '濱', '\u{20BB7}': '吉' };
  var NOFORM = { '髙': 1, '﨑': 1, '濵': 1, '\u{20BB7}': 1 };
  var GRADE = { 1: '小学1年', 2: '小学2年', 3: '小学3年', 4: '小学4年', 5: '小学5年', 6: '小学6年', 7: '中学以降', 8: 'ひらがな', 9: 'カタカナ', 10: '人名用漢字', 11: 'そのほかの漢字' };
  // ひらがな・カタカナ（五十音の表の順）→ 学年順（各学年は50音順）→ 人名用漢字 → そのほかの漢字
  var rank = function (g) { return g === 8 || g === 9 ? g - 20 : g; };
  var NKAN = ALL.filter(function (k) { return !k.kana; }).length;   // 漢字の数（常用・人名用・そのほか）
  var ORDER = ALL.slice().sort(function (a, b) { return rank(a.g) - rank(b.g) || (a.kana ? a.i - b.i : a.key.localeCompare(b.key, 'ja') || a.i - b.i); });
  ORDER.forEach(function (k, i) { k.o = i; });
  var isKanji = function (ch) { return /[㐀-鿿豈-﫿\u{20000}-\u{2ffff}]/u.test(ch); };
  var isKana = function (ch) { return /^[ぁ-ゖァ-ヺー]$/.test(ch); };
  var kanaPair = function (c) {
    var n = c.charCodeAt(0);
    return n >= 0x3041 && n <= 0x3096 ? String.fromCharCode(n + 0x60) : n >= 0x30A1 && n <= 0x30F6 ? String.fromCharCode(n - 0x60) : '';
  };

  // ---------------- ひらがな・カタカナの画の書き方・コツ（v558。kana.js） ----------------
  // 濁音（が）・半濁音（ぱ）・小さい字（ゃ）は、もとの字（か・は・や）の書き方とコツに、濁点・半濁点・小さく書くコツを足す
  var KI = window.KKJ_KANA_INFO || {};
  var SMALLK = 'ぁぃぅぇぉっゃゅょァィゥェォッャュョ';
  var DAKU_S = [['点', 'とめ', '右上に、左上から右下へ短く書いて止めます。', '濁点（゛）は字の<em>右上</em>に、小さく書きます。'],
    ['点', 'とめ', '1つ目の右に、同じ向き・同じ長さでそろえて書きます。', '']];
  var HANDAKU_S = [['丸', '', '右上に、小さな丸を書きます。書き始めにつなげて閉じます。', '半濁点（゜）は字の<em>右上</em>に、小さく書きます。']];
  function kinfo(k) {
    if (k._ki) return k._ki;
    var c = k.c, d = c.normalize('NFD'), mark = d.charAt(1), small = SMALLK.indexOf(c) >= 0;
    var base = small ? String.fromCharCode(c.charCodeAt(0) + 1) : d.charAt(0);
    var b = KI[base] || { o: '', s: [], t: [] }, s = b.s.slice(), t = b.t.slice(), kind = '';
    if (mark === '\u3099') { s = s.concat(DAKU_S); t = t.slice(0, 2).concat(['濁点（゛）は字の<em>右上</em>に小さく。2つの点の<em>向きと長さ</em>をそろえます。']); kind = '濁音'; }
    else if (mark === '\u309A') { s = s.concat(HANDAKU_S); t = t.slice(0, 2).concat(['半濁点（゜）は字の<em>右上</em>に小さく、<em>まるく</em>書きます。']); kind = '半濁音'; }
    if (small) { t = ['<em>小さく</em>書く字です（ふつうの「' + base + '」の半分くらい）。横書きでは マスの<em>下のほう</em>に、縦書きでは<em>右上</em>に寄せて書きます。'].concat(t.slice(0, 2)); kind = '小さい字'; }
    if ('ゐゑヰヱ'.indexOf(c) >= 0) kind = 'むかしの字';
    if (c === 'ー') kind = 'のばす音';
    k._ki = { base: base !== c ? base : '', mark: mark, small: small, o: b.o, s: s, t: t, kind: kind };
    return k._ki;
  }

  // ---------------- 画の種類 ----------------
  var T = {
    '㇐': ['横画', 'とめ', '左から右へ、ほんの少し右上がりに。終わりはしっかり止めます。'],
    '㇑': ['縦画', 'とめ', '上から下へまっすぐ下ろし、終わりはしっかり止めます。'],
    '㇒': ['左払い', 'はらい', '書き始めはしっかり、だんだん力をぬいて左下へスッと払います。'],
    '㇓': ['左払い', 'はらい', 'まっすぐ下ろしてから、左下へ向きを変えて払います。'],
    '㇏': ['右払い', 'はらい', '細く入って少しずつ太く。最後に一度ためてから右下へ払います。'],
    '㇝': ['右払い', 'はらい', 'ゆるやかに右へ進み、最後に一度ためてから払います。'],
    '㇔': ['点', 'とめ', '小さくても向きを意識して、最後はきちんと止めます。'],
    dotv: ['点', 'とめ', '上から短く下ろして止めます。小さく、向きをそろえて。'],
    '㇀': ['右上払い', 'はらい', '左下から右上へ、スッと払い上げます。'],
    '㇚': ['縦はね', 'はね', 'まっすぐ下ろし、一度止めてから左上へ短くはねます。'],
    '㇖': ['横はね', 'はね', '横に引いて一度止め、左下へ短くはねます。'],
    '㇕': ['横折れ', 'とめ', '横に引いたら角で一度止め、向きを変えて下ろします。'],
    '㇆': ['横折れはね', 'はね', '角で止めて下ろし、最後は左上へ短くはねます。'],
    '㇗': ['縦折れ', 'とめ', '下ろしたら角で止め、右へ折って止めます。'],
    '㇘': ['縦折れ', 'とめ', '下ろしたら角で止め、右へ折って止めます。'],
    '㇄': ['縦曲がり', 'とめ', '下ろしてから角をまるくして右へ引き、止めます。'],
    '㇙': ['縦はね上げ', 'はらい', '下ろして止め、右上へ払い上げます。'],
    '㇟': ['曲がりはね', 'はね', '下ろしてからまるく右へ曲げ、最後は上へはねます。'],
    '㇃': ['曲がりはね', 'はね', 'ゆるやかなカーブで右へ進み、最後は上へはねます。'],
    '㇁': ['曲がりはね', 'はね', 'ゆるく弧をえがいて下ろし、止めてから左上へはねます。'],
    '㇂': ['そりはね', 'はね', '右下へ弓なりにそらせて引き、最後は上へはねます。'],
    '㇇': ['横折れ払い', 'はらい', '横に引いて角で止め、左下へ払います。'],
    '㇋': ['折れ払い', 'はらい', '角ごとに一度止めて折り返し、最後は左下へ払います。'],
    '㇈': ['横折れ曲がりはね', 'はね', '横に引いて角で止め、下ろしながら右へ曲げて上へはねます。'],
    '㇉': ['折れはね', 'はね', '角ごとに止めながら進み、最後は左上へはねます。'],
    '㇌': ['折れはね', 'はね', '小さく折り返して下ろし、最後ははねます。'],
    '㇊': ['横折れ上げ', 'はらい', '横に引いて折り、最後は右上へ払い上げます。'],
    '㇛': ['くの字', 'とめ', '左下へ払うように下ろし、向きを変えて右下で止めます。'],
    '㇜': ['払い折れ', 'とめ', '左下へ下ろして角で止め、右へ折ります。'],
    '㇞': ['縦折れ折れ', 'とめ', '角ごとに一度止めて向きを変えます。'],
    '㇅': ['折れ', 'とめ', '角ごとに一度止めて向きを変えます。'],
    '㇎': ['折れ', 'とめ', '角ごとに一度止めて向きを変えます。'],
    '㇍': ['横折れ曲がり', 'とめ', '角で止めて下ろし、まるく右へ曲げます。'],
    '㇠': ['折れはね', 'はね', '角ごとに止めながら進み、最後ははねます。'],
    '㇡': ['折れはね', 'はね', '角ごとに止めながら進み、最後ははねます。'],
    '㇢': ['払いはね', 'はね', '左下へ払うように引き、最後ははねます。']
  };

  // 部品の呼び名（位置別）
  var PN = {
    left: { '亻': 'にんべん', '氵': 'さんずい', '扌': 'てへん', '木': 'きへん', '糸': 'いとへん', '糹': 'いとへん', '言': 'ごんべん', '訁': 'ごんべん', '金': 'かねへん', '釒': 'かねへん', '口': 'くちへん', '日': 'ひへん', '月': 'つきへん', '女': 'おんなへん', '土': 'つちへん', '石': 'いしへん', '禾': 'のぎへん', '衤': 'ころもへん', '礻': 'しめすへん', '示': 'しめすへん', '犭': 'けものへん', '王': 'おうへん', '玉': 'おうへん', '車': 'くるまへん', '馬': 'うまへん', '魚': 'うおへん', '貝': 'かいへん', '足': 'あしへん', '⻊': 'あしへん', '目': 'めへん', '耳': 'みみへん', '火': 'ひへん', '方': 'ほうへん', '舟': 'ふねへん', '米': 'こめへん', '食': 'しょくへん', '飠': 'しょくへん', '𩙿': 'しょくへん', '忄': 'りっしんべん', '彳': 'ぎょうにんべん', '阝': 'こざとへん', '弓': 'ゆみへん', '山': 'やまへん', '巾': 'はばへん', '子': 'こへん', '立': 'たつへん', '牛': 'うしへん', '牜': 'うしへん', '酉': 'とりへん', '歹': 'がつへん', '片': 'かたへん', '角': 'つのへん', '革': 'かわへん', '骨': 'ほねへん', '冫': 'にすい', '白': 'しろへん', '矢': 'やへん', '田': 'たへん', '虫': 'むしへん', '羊': 'ひつじへん', '耒': 'すきへん', '身': 'みへん', '歯': 'はへん', '豸': 'むじなへん', '舌': 'したへん', '臣': 'しんへん', '止': 'とめへん', '血': 'ちへん', '缶': 'ほとぎへん', '毛': 'けへん', '癶': 'はつがしら' },
    right: { '刂': 'りっとう', '阝': 'おおざと', '攵': 'のぶん', '欠': 'あくび', '殳': 'るまた', '彡': 'さんづくり', '隹': 'ふるとり', '斤': 'おのづくり', '力': 'ちから', '頁': 'おおがい', '卩': 'ふしづくり', '寸': 'すん', '又': 'また', '鳥': 'とり', '見': 'みる', '戈': 'ほこづくり', '月': 'つき', '匕': 'ひ' },
    top: { '艹': 'くさかんむり', '宀': 'うかんむり', '⺮': 'たけかんむり', '竹': 'たけかんむり', '雨': 'あめかんむり', '冖': 'わかんむり', '亠': 'なべぶた', '癶': 'はつがしら', '穴': 'あなかんむり', '罒': 'あみがしら', '耂': 'おいかんむり', '老': 'おいかんむり', '人': 'ひとやね', '𠆢': 'ひとやね', '爫': 'つめかんむり', '山': 'やまかんむり', '虍': 'とらかんむり', '⺍': 'つかんむり', '夂': 'ふゆがしら', '⺌': 'しょう' },
    bottom: { '心': 'こころ', '灬': 'れんが', '儿': 'ひとあし', '皿': 'さら', '大': 'だい', '貝': 'かい', '廾': 'にじゅうあし', '衣': 'ころも', '女': 'おんな' },
    kamae: { '囗': 'くにがまえ', '門': 'もんがまえ', '冂': 'けいがまえ', '匚': 'はこがまえ', '勹': 'つつみがまえ', '行': 'ぎょうがまえ', '戈': 'ほこがまえ', '气': 'きがまえ', '凵': 'うけばこ', '匸': 'かくしがまえ', '弋': 'しきがまえ', '几': 'つくえ' },
    tare: { '广': 'まだれ', '疒': 'やまいだれ', '厂': 'がんだれ', '尸': 'しかばね', '戸': 'とだれ', '户': 'とだれ', '虍': 'とらかんむり' },
    nyo: { '⻌': 'しんにょう', '辶': 'しんにょう', '⻍': 'しんにょう', '廴': 'えんにょう', '走': 'そうにょう', '鬼': 'きにょう', '是': 'ぜにょう', '麦': 'ばくにょう' }
  };
  var TRICKY = '右左必飛馬無発成九方布希有皮長世出何区医書耳上止乗非臣母毎生王田博卵片版興鳥島為衆感';

  // ---------------- 形の計算 ----------------
  function geo(k) {
    if (k._geo) return k._geo;
    var polys = k.paths.map(KRecog.parsePath);
    var len = polys.map(KRecog.polyLen);
    var bb = polys.map(function (p) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      p.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
      return [x0, y0, x1, y1];
    });
    k._geo = { polys: polys, len: len, bb: bb };
    return k._geo;
  }
  function cbox(k, a, b) {
    var g = geo(k), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var i = a - 1; i < b; i++) { var B = g.bb[i]; if (!B) continue; x0 = Math.min(x0, B[0]); y0 = Math.min(y0, B[1]); x1 = Math.max(x1, B[2]); y1 = Math.max(y1, B[3]); }
    return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function sinfo(k, i) {
    if (k.kana) { var ks = kinfo(k).s[i]; return ks ? { name: ks[0], end: ks[1], tip: ks[2], base: '' } : { name: '線', end: '', tip: '', base: '' }; }
    var raw = k.types[i] || '', b = raw.split('/')[0].charAt(0), t = T[b], g = geo(k);
    if (b === '㇑' && g.len[i] < 21 && g.polys[i][0][1] < 34) t = T.dotv;
    return t ? { name: t[0], end: t[1], tip: t[2], base: b } : { name: '線', end: '', tip: '', base: b };
  }
  function pname(pos, e) { var t = PN[pos] && PN[pos][e]; return t ? e + '（' + t + '）' : e; }
  // 部品の字をかぎかっこで。データに部品の字が無いときは「部分」と書く（v538。空の「」が出ていた）
  function qq(s) { return s ? '<q>' + esc(s) + '</q>' : '部分'; }

  // ---------------- 綺麗に書くコツ（データから組み立て） ----------------
  function analyze(k) {
    if (k.kana) return { layout: '', formula: '', tips: kinfo(k).t.slice(0, 7) };   // かなは字ごとに書いたコツ（kana.js）
    var g = geo(k), n = k.n, tips = [];
    var C = k.comps.filter(function (c) { return c[0] || c[1]; });
    var find = function (p) { return C.filter(function (c) { return c[1] === p; }); };
    var L = find('left')[0], R = find('right')[0], Tp = find('top')[0], B = find('bottom')[0];
    var KA = find('kamae'), KC = find('kamaec')[0], TA = find('tare')[0], TC = find('tarec')[0], NY = find('nyo')[0], NC = find('nyoc')[0];
    var layout = '', formula = '';
    var first = sinfo(k, 0);
    tips.push('1画目は<em>' + first.name + '</em>から書き始めます。全部で<em>' + n + '画</em>です。');
    if (k.c === '右') tips.push({ alert: 1, h: '「右」は<em>左払い → 横画</em>の順。「左」は横画から書くので順番が逆です。どちらも短いほうの線を先に書きます。' });
    if (k.c === '左') tips.push({ alert: 1, h: '「左」は<em>横画 → 左払い</em>の順。「右」は左払いから書くので順番が逆です。どちらも短いほうの線を先に書きます。' });
    if (k.c === '永') tips.push('「永」には点・横画・縦画・はね・払いなど、書写の基本になる筆づかいがそろっているとされ、<em>永字八法</em>と呼ばれます。');
    if (TRICKY.indexOf(k.c) >= 0 && k.c !== '右' && k.c !== '左') tips.push({ alert: 1, h: '書き順をまちがえやすい字です。アニメーションで順番をよく確かめましょう。' });

    var big = function (c) { return c && c[4] - c[3] >= 1; };
    if (L && R && big(L) && big(R)) {
      layout = '左右'; formula = pname('left', L[0]) + ' ＋ ' + pname('right', R[0]);
      var bl = cbox(k, L[3], L[4]), br = cbox(k, R[3], R[4]);
      var a = Math.min(7, Math.max(3, Math.round(bl.w / (bl.w + br.w) * 10)));
      var t = '左の' + qq(L[0]) + 'と右の' + qq(R[0]) + 'の幅は、およそ<em>' + a + ' : ' + (10 - a) + '</em>。';
      t += a <= 4 ? '左側は細めにして、右側に場所をゆずります。' : a >= 6 ? '左側を大きめに、右側は細めにまとめます。' : '左右ほぼ同じ幅です。間をあけすぎないように。';
      tips.push(t);
      if (bl.h < br.h * 0.7) {
        tips.push('左の' + qq(L[0]) + 'は小さめに書き、' + (bl.cy < br.cy - 4 ? '<em>上に寄せます</em>。' : bl.cy > br.cy + 4 ? '<em>下に寄せます</em>。' : 'たての中ほどに置きます。'));
      } else if (br.h < bl.h * 0.7) {
        tips.push('右の' + qq(R[0]) + 'は小さめに書き、' + (br.cy < bl.cy - 4 ? '<em>上に寄せます</em>。' : br.cy > bl.cy + 4 ? '<em>下に寄せます</em>。' : 'たての中ほどに置きます。'));
      }
      var lt = (k.types[L[4] - 1] || '').charAt(0);
      if (lt === '㇀') tips.push(qq(L[0]) + 'の最後の画（' + L[4] + '画目）は、右上へ払い上げて右側へつなげます。');
      if ('木禾米火'.indexOf(L[0]) >= 0 && lt === '㇔') tips.push('へんになった' + qq(L[0]) + 'の最後の画（' + L[4] + '画目）は、払わずに<em>点のように止めます</em>。');
    } else if (Tp && B && big(Tp) && big(B)) {
      layout = '上下'; formula = pname('top', Tp[0]) + ' ＋ ' + pname('bottom', B[0]);
      var bt = cbox(k, Tp[3], Tp[4]), bb = cbox(k, B[3], B[4]);
      var a2 = Math.min(8, Math.max(2, Math.round(bt.h / (bt.h + bb.h) * 10)));
      tips.push('上の' + qq(Tp[0]) + 'と下の' + qq(B[0]) + 'の高さは、およそ<em>' + a2 + ' : ' + (10 - a2) + '</em>。たての中心線をそろえます。');
      var tn = PN.top[Tp[0]] || '';
      var added = false;
      if (/かんむり|がしら|やね|なべぶた/.test(tn) && bt.w >= bb.w * 0.95) { tips.push('かんむりの' + qq(Tp[0]) + 'は横に広めに書き、下の部分をおおうようにします。'); added = true; }
      if ('心灬儿皿大廾'.indexOf(B[0]) >= 0 && bb.w >= bt.w * 0.95) { tips.push('下の' + qq(B[0]) + 'は横に広げて、上の部分を支えるように書きます。'); added = true; }
      if (!added) {
        if (bb.w > bt.w * 1.15) tips.push('下の' + qq(B[0]) + 'のほうが横に広い字です。上は少しすぼめて、下で支えます。');
        else if (bt.w > bb.w * 1.15) tips.push('上の' + qq(Tp[0]) + 'のほうが横に広い字です。下はその幅の内側に収めます。');
      }
    } else if (KA.length && KA[0][0] && C.some(function (c) { return c[1] !== 'kamae' && c[0]; })) {   // 囲みの字がデータに無いもの（「左」など）は囲みとして扱わない
      var k1 = KA[0], inner = C.filter(function (c) { return c[1] !== 'kamae' && c[0]; });
      var inName = inner.length === 1 ? qq(inner[0][0]) : '部分';
      layout = '囲み'; formula = pname('kamae', k1[0]) + ' ＋ ' + inner.map(function (c) { return c[0]; }).join(' ＋ ');
      var part2 = KA.filter(function (c) { return c[5] === '2'; })[0];
      if (k1[3] < inner[0][3] && part2 && part2[4] === n) tips.push('外側の' + qq(k1[0]) + 'を' + k1[4] + '画目まで書いたら中の' + inName + 'を書き、最後の<em>' + sinfo(k, n - 1).name + '</em>（' + n + '画目）で囲みを閉じます。');
      else if (k1[3] < inner[0][3]) tips.push('外側の' + qq(k1[0]) + 'を先に書いてから、中の' + inName + 'を書きます。');
      else tips.push('中の' + inName + 'を先に書き、外側の' + qq(k1[0]) + 'はあとから書きます。');
      tips.push('中の部分は小さめにまとめ、外側との<em>すき間を均等に</em>とります。');
    } else if (TA && TC) {
      layout = 'たれ'; formula = pname('tare', TA[0]) + ' ＋ ' + TC[0];
      tips.push((TA[3] < TC[3] ? 'たれの' + qq(TA[0]) + 'を先に書きます。' : '') + '左払いはのびやかに長く、中の' + qq(TC[0]) + 'は右下にまとめます。');
    } else if (NY && NC) {
      layout = 'にょう'; formula = pname('nyo', NY[0]) + ' ＋ ' + NC[0];
      var hasRS = false;
      for (var s = NY[3] - 1; s < NY[4]; s++) if ((k.types[s] || '').charAt(0) === '㇏') hasRS = true;
      if (NY[3] < NC[3]) tips.push('にょうの' + qq(NY[0]) + 'を先に書きます。' + (hasRS ? '右払いを長くのばして、右側の' + qq(NC[0]) + 'を乗せるようにします。' : ''));
      else tips.push(qq(NC[0]) + 'を先に書いてから、にょうの' + qq(NY[0]) + 'を最後に書きます。' + (hasRS ? '右払いを長くのばして、上の部分を乗せるように。' : ''));
    } else {
      tips.push('一つのまとまりとして書く字です。中心線を意識して、左右のつり合いをとります。');
    }
    if (!layout) {
      var parts = C.filter(function (c) { return c[0]; }).map(function (c) { return c[0]; });
      if (parts.length >= 2) formula = parts.join(' ＋ ');
    }
    var H = [], V = [];
    k.types.forEach(function (t, i) { var b = t.charAt(0); if (b === '㇐' && g.len[i] > 16) H.push(i); if (b === '㇑' && g.len[i] > 16) V.push(i); });
    if (H.length >= 3) {
      var lg = H.reduce(function (p, c) { return g.len[c] > g.len[p] ? c : p; });
      tips.push('横画が' + H.length + '本あります。間隔を同じにそろえ、いちばん長い<em>' + (lg + 1) + '画目</em>をしっかり長く書くと引きしまります。');
    }
    if (V.length >= 3) tips.push('縦画が' + V.length + '本あります。間隔をそろえて、まっすぐ平行に下ろします。');
    if (layout !== 'にょう') {
      var RS = []; k.types.forEach(function (t, i) { if (t.charAt(0) === '㇏') RS.push(i + 1); });
      if (RS.length) tips.push(RS.join('・') + '画目の右払いは、少しずつ太くして、最後に一度ためてから払います。');
    }
    if (n <= 4) tips.push('画数の少ない字です。マスいっぱいに書かず、ひとまわり小さめに書くと文の中で整って見えます。');
    if (n >= 15) tips.push('画数の多い字です。線と線のすき間を均等にし、細かい部分をつめすぎないようにします。');
    var fp = formula.split(' ＋ ').filter(function (x) { return x; });   // 部品の字が無いところは式に出さない
    formula = fp.length >= 2 ? fp.join(' ＋ ') : '';
    return { layout: layout, formula: formula, tips: tips.slice(0, 7) };
  }

  // ---------------- なぞり練習の案内：その画を書くときの「うまく書くコツ」（v538） ----------------
  // 字の組み立て（左右・上下・囲み・たれ・にょう）や、いちばん長い横画・つらぬく縦画などのコツを、その画に割り当てる。
  // 1画に2つまで。h は画面に出す文、s は読み上げる文（部品は「にんべん」のような呼び名で読む）
  function strokeTips(k) {
    if (k._st) return k._st;
    if (k.kana) {   // かな：その画のコツ（「1画目のまん中あたりを通します」など。kana.js）
      k._st = kinfo(k).s.map(function (s) { return s[3] ? [{ h: s[3], s: s[3] }] : []; });
      return k._st;
    }
    var n = k.n, g = geo(k), out = [], i;
    for (i = 0; i < n; i++) out.push([]);
    var add = function (j, h, s) { if (j >= 0 && j < n && out[j].length < 2) out[j].push({ h: h, s: s || h }); };
    var nm = function (pos, e) { return e ? (PN[pos] && PN[pos][e]) || e : '部分'; };
    var C = k.comps.filter(function (c) { return c[0] || c[1]; });
    var find = function (p) { return C.filter(function (c) { return c[1] === p; }); };
    var L = find('left')[0], R = find('right')[0], Tp = find('top')[0], B = find('bottom')[0];
    var KA = find('kamae'), TA = find('tare')[0], TC = find('tarec')[0], NY = find('nyo')[0], NC = find('nyoc')[0];
    var big = function (c) { return c && c[4] - c[3] >= 1; };
    var bt0 = function (c) { return (k.types[c] || '').charAt(0); };
    if (k.c === '右') add(0, '「右」は<em>左払いから</em>。短いほうの線を先に書きます（「左」は横画から）。', '右は、ひだりはらいから書きます。短いほうの線を先に。');
    else if (k.c === '左') add(0, '「左」は<em>横画から</em>。短いほうの線を先に書きます（「右」は左払いから）。', '左は、よこかくから書きます。短いほうの線を先に。');
    else if (TRICKY.indexOf(k.c) >= 0) add(0, '書き順をまちがえやすい字です。順番をたしかめながら書きましょう。');
    if (L && R && big(L) && big(R)) {
      var bl = cbox(k, L[3], L[4]), br = cbox(k, R[3], R[4]);
      var a = Math.min(7, Math.max(3, Math.round(bl.w / (bl.w + br.w) * 10)));
      var vpos = function (me, ot) { return me.h < ot.h * 0.7 ? (me.cy < ot.cy - 4 ? '。小さめにして上に寄せます' : me.cy > ot.cy + 4 ? '。小さめにして下に寄せます' : '。小さめにして、たての中ほどに置きます') : ''; };
      var lw = (a <= 4 ? '細めに書き、右側に場所をゆずります' : a >= 6 ? '大きめに書きます' : '右側とほぼ同じ幅で書きます') + vpos(bl, br);
      var rw = (a <= 4 ? '広めに、のびのびと書きます' : a >= 6 ? '細めにまとめます' : '左側との間をあけすぎないように書きます') + vpos(br, bl);
      add(L[3] - 1, '左の' + qq(L[0]) + 'は' + lw + '（左右の幅は およそ<em>' + a + ' : ' + (10 - a) + '</em>）。', '左の' + nm('left', L[0]) + 'は、' + lw + '。');
      add(R[3] - 1, '右の' + qq(R[0]) + 'は' + rw + '。', '右の' + nm('right', R[0]) + 'は、' + rw + '。');
      if (bt0(L[4] - 1) === '㇀') add(L[4] - 1, '右上へ払い上げて、右側へつなげるように書きます。');
      if ('木禾米火'.indexOf(L[0]) >= 0 && bt0(L[4] - 1) === '㇔') add(L[4] - 1, 'へんの' + qq(L[0]) + 'の最後の画は、払わずに<em>点のように止めます</em>。', 'へんの' + nm('left', L[0]) + 'の最後の画は、払わずに、点のように止めます。');
    } else if (Tp && B && big(Tp) && big(B)) {
      var bt = cbox(k, Tp[3], Tp[4]), bb = cbox(k, B[3], B[4]);
      var a2 = Math.min(8, Math.max(2, Math.round(bt.h / (bt.h + bb.h) * 10)));
      var tw = /かんむり|がしら|やね|なべぶた/.test(PN.top[Tp[0]] || '') && bt.w >= bb.w * 0.95 ? '横に広めに書き、下の部分をおおうようにします'
        : bt.w > bb.w * 1.15 ? '横に広めに書きます' : bb.w > bt.w * 1.15 ? '少しすぼめて書きます' : 'たての中心線をそろえて書きます';
      var bw = ('心灬儿皿大廾'.indexOf(B[0]) >= 0 && bb.w >= bt.w * 0.95) || bb.w > bt.w * 1.15 ? '横に広げて、上の部分を支えるように書きます'
        : bt.w > bb.w * 1.15 ? '上の幅の内側に収めます' : '上とたての中心線をそろえて書きます';
      add(Tp[3] - 1, '上の' + qq(Tp[0]) + 'は' + tw + '（上下の高さは およそ<em>' + a2 + ' : ' + (10 - a2) + '</em>）。', '上の' + nm('top', Tp[0]) + 'は、' + tw + '。');
      add(B[3] - 1, '下の' + qq(B[0]) + 'は' + bw + '。', '下の' + nm('bottom', B[0]) + 'は、' + bw + '。');
    } else if (KA.length && KA[0][0] && C.some(function (c) { return c[1] !== 'kamae' && c[0]; })) {
      var k1 = KA[0], inner = C.filter(function (c) { return c[1] !== 'kamae' && c[0]; }), kn = nm('kamae', k1[0]);
      var part2 = KA.filter(function (c) { return c[5] === '2'; })[0];
      if (k1[3] < inner[0][3]) {
        add(k1[3] - 1, '外側の' + qq(k1[0]) + 'から先に書きます。', '外側の' + kn + 'から、先に書きます。');
        add(inner[0][3] - 1, '中の部分は小さめにまとめ、外側との<em>すき間を均等に</em>とります。');
        if (part2 && part2[4] === n) add(n - 1, 'この最後の画で<em>囲みを閉じます</em>。');
      } else {
        add(inner[0][3] - 1, '中の部分を先に書き、外側の' + qq(k1[0]) + 'はあとから書きます。', '中の部分を先に書き、外側の' + kn + 'は、あとから書きます。');
        add(k1[3] - 1, '外側の' + qq(k1[0]) + 'で、中の部分を囲むように書きます。', '外側の' + kn + 'で、中の部分を囲むように書きます。');
      }
    } else if (TA && TC) {
      var tl = -1; for (i = TA[3] - 1; i < TA[4]; i++) if (bt0(i) === '㇒' && tl < 0) tl = i;
      add(tl >= 0 ? tl : TA[3] - 1, 'たれの' + qq(TA[0]) + 'の左払いは、のびやかに長く書きます。', 'たれの' + nm('tare', TA[0]) + 'の、ひだりはらいは、のびやかに長く書きます。');
      add(TC[3] - 1, '中の' + qq(TC[0]) + 'は右下にまとめます。', '中の' + (TC[0] || '部分') + 'は、右下にまとめます。');
    } else if (NY && NC) {
      var rs = -1; for (i = NY[3] - 1; i < NY[4]; i++) if (bt0(i) === '㇏') rs = i;
      var yn = nm('nyo', NY[0]);
      add(NY[3] - 1, 'にょうの' + qq(NY[0]) + (NY[3] < NC[3] ? 'を先に書きます。' : 'は最後に書きます。'), 'にょうの' + yn + (NY[3] < NC[3] ? 'を、先に書きます。' : 'は、最後に書きます。'));
      if (rs >= 0) add(rs, '右払いを長くのばして、' + (NY[3] < NC[3] ? '右側' : '上') + 'の部分を乗せるようにします。');
    }
    // 横画・縦画が多い字
    var H = [], V = [];
    k.types.forEach(function (t, j) { var b = t.charAt(0); if (b === '㇐' && g.len[j] > 16) H.push(j); if (b === '㇑' && g.len[j] > 16) V.push(j); });
    if (H.length >= 2) {
      var hs = H.slice().sort(function (x, y) { return g.len[y] - g.len[x]; });
      if (g.len[hs[0]] >= g.len[hs[1]] * 1.2) add(hs[0], 'この字で<em>いちばん長い横画</em>です。しっかり長く書くと引きしまります。');
    }
    if (H.length >= 3) add(H[1], '横画は' + H.length + '本。間隔を同じにそろえます。');
    if (V.length >= 3) add(V[1], '縦画は' + V.length + '本。間隔をそろえて、まっすぐ平行に下ろします。');
    // 字をつらぬく縦画は最後（中・十・車 など）
    var last = n - 1, lb = g.bb[last];
    if (bt0(last) === '㇑' && g.len[last] > 50 && lb && Math.abs((lb[0] + lb[2]) / 2 - 54.5) < 10 && crossesMid(k, last)) add(last, '字を<em>つらぬく縦画</em>は最後に書きます。まっすぐ長く下ろします。');
    if (n >= 15) add(0, '画数の多い字です。線と線のすき間を均等にして、つめすぎないように書きます。');
    k._st = out;
    return out;
  }
  // i 画目が、前に書いた画と（はしではなく）なかほどで交わるか
  function crossesMid(k, i) {
    var g = geo(k), a = g.polys[i], s = a[0], e = a[a.length - 1];
    for (var j = 0; j < i; j++) {
      var b = g.polys[j];
      for (var p = 1; p < a.length; p++) for (var q = 1; q < b.length; q++) {
        var x = segCross(a[p - 1], a[p], b[q - 1], b[q]);
        if (x && Math.hypot(x[0] - s[0], x[1] - s[1]) > 8 && Math.hypot(x[0] - e[0], x[1] - e[1]) > 8) return true;
      }
    }
    return false;
  }
  function segCross(p1, p2, p3, p4) {
    var d1x = p2[0] - p1[0], d1y = p2[1] - p1[1], d2x = p4[0] - p3[0], d2y = p4[1] - p3[1];
    var den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-9) return null;
    var t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / den, u = ((p3[0] - p1[0]) * d1y - (p3[1] - p1[1]) * d1x) / den;
    return t > 0 && t < 1 && u > 0 && u < 1 ? [p1[0] + t * d1x, p1[1] + t * d1y] : null;
  }

  // ---------------- 状態 ----------------
  var cur = null, mode = 'view';
  var opt = { nums: store.get('nums', true), ghost: store.get('ghost', true), loop: store.get('loop', false), speed: store.get('speed', 1), say: store.get('sayTips', true) };   // say：コツを自動で読む（v539 から、はじめからオン）
  var SPEEDS = [{ n: 'ゆっくり', v: 38, gap: 420 }, { n: 'ふつう', v: 72, gap: 230 }, { n: 'はやい', v: 140, gap: 110 }];

  var stage = $('#stage'), lGhost = $('#lGhost'), lInk = $('#lInk'), lNums = $('#lNums'), lHint = $('#lHint'), lOverlay = $('#lOverlay'), lMaru = $('#lMaru');
  var inkPaths = [], numEls = [], lens = [];

  // ---------------- アニメーション ----------------
  var P = { k: 0, playing: false, anim: null, raf: 0, timer: 0, single: false };

  function buildStage() {
    lGhost.innerHTML = ''; lInk.innerHTML = ''; lNums.innerHTML = ''; lHint.innerHTML = ''; lOverlay.innerHTML = ''; lMaru.innerHTML = '';
    var g = geo(cur);
    inkPaths = cur.paths.map(function (d) { el('path', { d: d }, lGhost); return el('path', { d: d }, lInk); });
    lens = inkPaths.map(function (p, i) { try { return p.getTotalLength() || g.len[i]; } catch (e) { return g.len[i]; } });
    numEls = cur.paths.map(function (d, i) {
      var t = el('text', { x: cur.nums[2 * i] || 0, y: cur.nums[2 * i + 1] || 0 }, lNums);
      t.textContent = i + 1; return t;
    });
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function stopPlayer() {
    cancelAnimationFrame(P.raf); clearTimeout(P.timer);
    if (P.anim) { P.k = P.anim.i + 1; P.anim = null; }
    P.playing = false; P.single = false;
  }
  function startStroke(i) {
    var p = inkPaths[i], L = lens[i] + 1;
    var sp = SPEEDS[opt.speed];
    var dur = reduceMotion ? 1 : Math.min(1700, Math.max(260, L / sp.v * 1000));
    for (var j = 0; j < inkPaths.length; j++) inkPaths[j].classList.remove('cur');
    numEls.forEach(function (t) { t.classList.remove('cur'); });
    p.style.strokeDasharray = L + ' ' + L;
    p.style.strokeDashoffset = L;
    p.classList.add('on', 'cur');
    if (opt.nums) numEls[i].classList.add('on', 'cur');
    lHint.innerHTML = '';
    P.anim = { i: i, t0: performance.now(), dur: dur, L: L };
    caption(i, true);
    markStep(i);
    P.raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    var a = P.anim; if (!a) return;
    var e = (now - a.t0) / a.dur;
    var p = inkPaths[a.i];
    if (e >= 1) {
      p.style.strokeDasharray = ''; p.style.strokeDashoffset = '';
      P.k = a.i + 1; P.anim = null;
      if (P.single || !P.playing) { P.playing = false; P.single = false; refresh(); return; }
      if (P.k < cur.n) { P.timer = setTimeout(function () { startStroke(P.k); }, SPEEDS[opt.speed].gap); }
      else {
        refresh();
        if (opt.loop) { P.playing = true; setPlayIcon(); P.timer = setTimeout(function () { P.k = 0; refresh(); P.timer = setTimeout(function () { startStroke(0); }, 300); }, 1300); }
        else { P.playing = false; setPlayIcon(); }
      }
      return;
    }
    p.style.strokeDashoffset = a.L * (1 - ease(e));
    P.raf = requestAnimationFrame(tick);
  }
  function play() {
    if (mode !== 'view') return;
    if (P.playing) { stopPlayer(); refresh(); return; }
    if (P.k >= cur.n) { P.k = 0; refresh(); }
    P.playing = true; setPlayIcon();
    P.timer = setTimeout(function () { startStroke(P.k); }, 120);
  }
  function stepNext() {
    if (P.anim) { stopPlayer(); refresh(); return; }
    stopPlayer();
    if (P.k >= cur.n) { P.k = 0; refresh(); }
    P.single = true; P.playing = true; setPlayIcon();
    startStroke(P.k);
  }
  function stepPrev() { stopPlayer(); P.k = Math.max(0, P.k - 1); refresh(); }
  function reset() { stopPlayer(); P.k = 0; refresh(); }
  function setPlayIcon() {
    var on = P.playing && !P.single;
    $('#icoPlay').hidden = on; $('#icoPause').hidden = !on;
    $('#bPlay').setAttribute('aria-label', on ? '一時停止' : '再生');
  }
  function refresh() {
    if (!cur) return;
    var k = P.k, n = cur.n;
    inkPaths.forEach(function (p, j) {
      p.style.strokeDasharray = ''; p.style.strokeDashoffset = '';
      p.classList.toggle('on', j < k);
      p.classList.toggle('cur', j === k - 1);
    });
    numEls.forEach(function (t, j) {
      t.classList.toggle('on', opt.nums && (j < k || (j === k && k < n)));
      t.classList.toggle('cur', j === k - 1);
    });
    lGhost.style.display = opt.ghost ? '' : 'none';
    lHint.innerHTML = '';
    if (mode === 'view' && k < n) startDot(k, false);
    caption(k - 1, false);
    markStep(k - 1);
    setPlayIcon();
    $('#bPrev').disabled = k === 0;
  }
  function startDot(i, arrow) {
    var g = geo(cur), p0 = g.polys[i][0];
    el('circle', { class: 'ring', cx: p0[0], cy: p0[1], r: 3.2 }, lHint);
    el('circle', { class: 'dot', cx: p0[0], cy: p0[1], r: 2.4 }, lHint);
    if (arrow) {
      var poly = g.polys[i], L = g.len[i];
      if (L > 22) {
        var tgt = L * 0.5, acc = 0;
        for (var j = 1; j < poly.length; j++) {
          var s = Math.hypot(poly[j][0] - poly[j - 1][0], poly[j][1] - poly[j - 1][1]);
          if (acc + s >= tgt && s > 0) {
            var x = poly[j][0], y = poly[j][1], ang = Math.atan2(poly[j][1] - poly[j - 1][1], poly[j][0] - poly[j - 1][0]) * 180 / Math.PI;
            el('path', { class: 'arrow', d: 'M3.6,0 L-2.4,-2.8 L-1.2,0 L-2.4,2.8 Z', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ang.toFixed(0) + ')' }, lHint);
            break;
          }
          acc += s;
        }
      }
    }
  }
  function caption(i, animating) {
    var n = cur.n, cnt = $('#capCount'), nm = $('#capName'), tp = $('#capTip');
    if (i < 0) {
      var f = sinfo(cur, 0);
      cnt.innerHTML = '<big>0</big><small> / ' + n + '画</small>';
      nm.innerHTML = '1画目は「' + f.name + '」' + (f.end ? '<span class="end-tag">' + f.end + '</span>' : '');
      tp.textContent = '▶で1画ずつ書いていきます。●が書き始めの位置です。';
      return;
    }
    var s = sinfo(cur, i);
    cnt.innerHTML = '<big>' + (i + 1) + '</big><small> / ' + n + '画</small>';
    nm.innerHTML = esc(s.name) + (s.end ? '<span class="end-tag">' + s.end + '</span>' : '');
    tp.textContent = (!animating && i === n - 1 ? '書き終わり。' : '') + s.tip;
  }

  // ---------------- 筆順一覧 ----------------
  var stepBtns = [];
  function buildSteps() {
    var box = $('#steps'); box.innerHTML = ''; stepBtns = [];
    var g = geo(cur);
    cur.paths.forEach(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'step';
      b.setAttribute('aria-label', (i + 1) + '画目');
      var svg = el('svg', { viewBox: '0 0 109 109' }, b);
      cur.paths.forEach(function (dd, j) { el('path', { d: dd, class: j < i ? 'd' : j === i ? 'c' : 'g' }, svg); });
      var p0 = g.polys[i][0];
      el('circle', { cx: p0[0], cy: p0[1], r: 4.2, class: 's' }, svg);
      var sp = document.createElement('span'); sp.textContent = i + 1; b.appendChild(sp);
      b.addEventListener('click', function () {
        if (mode !== 'view') setMode('view');
        stopPlayer(); P.k = i + 1; refresh();
      });
      box.appendChild(b); stepBtns.push(b);
    });
    $('#stepsNote').textContent = '全' + cur.n + '画・タップでその画へ';
  }
  function markStep(i) { stepBtns.forEach(function (b, j) { b.classList.toggle('on', j === i); }); }

  // ---------------- 情報・コツ ----------------
  // 「どの字でも意識したいこと」：漢字（はじめの画面のまま）・ひらがな・カタカナで入れかえる（v558）
  var BASICS = {
    j: $('#basics').innerHTML,
    h: '<div><b>まるみをつける</b>ひらがなは漢字をくずしてできた字。線をなめらかに、まるく書きます。</div>' +
      '<div><b>漢字より少し小さく</b>文の中では、ひらがなを漢字より少し小さめに書くと整います。</div>' +
      '<div><b>結びは三角形に</b>「な・は・ほ・ま・よ」などの結びは、小さく三角形のように。</div>' +
      '<div><b>とめ・はね・はらい</b>線の終わりを書き分けると、ぐっと整います。</div>',
    k: '<div><b>まっすぐ・角ははっきり</b>カタカナは漢字の一部や形からできた字。線はまっすぐ、角ははっきり書きます。</div>' +
      '<div><b>漢字より少し小さく</b>文の中では、カタカナを漢字より少し小さめに書くと整います。</div>' +
      '<div><b>似た字に気をつける</b>「シ・ツ」「ソ・ン」は点の並びと最後の線の向きで、「ス・ヌ」は2画目で書き分けます。</div>' +
      '<div><b>とめ・はね・はらい</b>線の終わりを書き分けると、ぐっと整います。</div>'
  };
  $('#yomi').addEventListener('click', function (e) { var b = e.target.closest('button[data-c]'); if (b) load(b.dataset.c); });
  function renderInfo() {
    var k = cur;
    $('#big').textContent = k.c;
    var meta = $('#meta'); meta.innerHTML = '';
    var tg = function (t, cls) { var s = document.createElement('span'); s.className = 'tag' + (cls ? ' ' + cls : ''); s.textContent = t; meta.appendChild(s); };
    tg(GRADE[k.g], 'g'); tg(k.n + '画');
    if (k.kana) { if (kinfo(k).kind) tg(kinfo(k).kind); }
    else if (k.rad) tg('部首（目安）' + k.rad);
    var y = $('#yomi'); y.innerHTML = '';
    var add = function (lab, html) { if (!html) return; var dt = document.createElement('dt'); dt.textContent = lab; var dd = document.createElement('dd'); dd.innerHTML = html; y.appendChild(dt); y.appendChild(dd); };
    if (k.kana) {
      // かな（v558）：もとの字（ひらがなは漢字をくずした形・カタカナは漢字の一部や形から）と、ひらがな⇔カタカナ。字はおすと開く
      var ki = kinfo(k), cp = kanaPair(k.c);
      var kb = function (c) { return K.has(c) ? '<button type="button" class="kl" data-c="' + esc(c) + '" aria-label="' + esc(c) + 'を開く">' + esc(c) + '</button>' : '<span class="kl0">' + esc(c) + '</span>'; };
      if (ki.base) add('もとの字', kb(ki.base) + (ki.small ? 'を小さく書いた字' : ki.mark === '゙' ? 'に濁点（゛）' : 'に半濁点（゜）'));
      else if (ki.o) add('もとの字', kb(ki.o) + (k.g === 8 ? '（漢字をくずした形から）' : '（漢字の一部や形から）') + (k.c === 'ン' ? '・ほかの説もあり' : ''));
      if (cp && K.has(cp)) add(k.g === 8 ? 'カタカナ' : 'ひらがな', kb(cp));
      if (k.c === 'ー') add('使い方', 'カタカナのことばで、のばす音を表します（例：ケーキ）');
    } else {
      add('音', k.on.slice(0, 6).map(esc).join('<span class="sep">・</span>'));
      add('訓', k.kun.slice(0, 8).map(function (r) {
        var pre = r.charAt(0) === '-' ? '〜' : '', post = r.charAt(r.length - 1) === '-' ? '〜' : '';
        var s = r.replace(/-/g, ''), i = s.indexOf('.');
        return pre + (i > 0 ? esc(s.slice(0, i)) + '<span class="okuri">' + esc(s.slice(i + 1)) + '</span>' : esc(s)) + post;
      }).join('<span class="sep">・</span>'));
    }
    var bs = $('#basics'), bk = k.kana ? (k.g === 8 ? 'h' : 'k') : 'j';
    if (bs.dataset.k !== bk) { bs.dataset.k = bk; bs.innerHTML = BASICS[bk]; }
    var an = analyze(k);
    $('#parts').innerHTML = an.layout || an.formula ? '組み立て：' + (an.layout ? '<b>' + an.layout + '</b>' : '') + (an.layout && an.formula ? '　' : '') + esc(an.formula) : '';
    $('#parts').hidden = !(an.layout || an.formula);
    $('#tipsTitle').textContent = '「' + k.c + '」を綺麗に書くコツ';
    var ol = $('#tips'); ol.innerHTML = '';
    an.tips.forEach(function (t) {
      var li = document.createElement('li');
      var sp = document.createElement('span');
      if (typeof t === 'object') { li.className = 'alert'; sp.innerHTML = t.h; } else sp.innerHTML = t;
      li.appendChild(sp);
      ol.appendChild(li);
    });
    // 線の種類
    var kinds = $('#kinds'); kinds.innerHTML = '';
    var groups = [], idx = {};
    k.types.forEach(function (t, i) {
      var s = sinfo(k, i), key = s.name + s.end;
      if (!(key in idx)) { idx[key] = groups.length; groups.push({ s: s, list: [] }); }
      groups[idx[key]].list.push(i);
    });
    var g = geo(k);
    groups.forEach(function (gr) {
      var d = document.createElement('div'); d.className = 'kind';
      var svg = el('svg', { viewBox: '0 0 109 109', 'aria-hidden': 'true' }, d);
      k.paths.forEach(function (dd) { el('path', { d: dd, class: 'g' }, svg); });
      gr.list.forEach(function (i) { el('path', { d: k.paths[i], class: 'c' }, svg); });
      var p0 = g.polys[gr.list[0]][0]; el('circle', { cx: p0[0], cy: p0[1], r: 4, class: 's' }, svg);
      var tx = document.createElement('div'); tx.style.minWidth = '0';
      tx.innerHTML = '<b>' + esc(gr.s.name) + '</b>' + (gr.s.end ? '<small>' + gr.s.end + '</small>' : '') +
        '<small>' + gr.list.map(function (i) { return i + 1; }).join('・') + '画目</small><p>' + esc(gr.s.tip) + '</p>';
      d.appendChild(tx); kinds.appendChild(d);
    });
  }

  // ---------------- 書き順の基本ルール ----------------
  var RULES = [
    ['上から下へ', '上の部分から順に書きます。', '三工'],
    ['左から右へ', '左の部分から順に書きます。', '川州'],
    ['横画が先', '横画と縦画が交わるときは、ふつう横画から。', '十土'],
    ['中が先', '左右に分かれる字は、まん中から書きます。', '小水'],
    ['外側が先', '囲む字は外側から。「国」は下の横画で最後に閉じます。', '国同'],
    ['左払いが先', '左払いと右払いが交わるときは、左払いから。', '文父人'],
    ['つらぬく縦画は最後', '字の中心をつらぬく縦画は、最後に書きます。', '中車'],
    ['つらぬく横画は最後', '字をつらぬく横画は、最後に書きます。', '女子'],
    ['「右」と「左」', '右は左払いから、左は横画から。短いほうを先に書きます。', '右左']
  ];
  function buildRules() {
    var ul = $('#ruleList');
    RULES.forEach(function (r) {
      var li = document.createElement('li');
      var d = document.createElement('div'); d.innerHTML = '<b>' + r[0] + '</b><span>' + r[1] + '</span>';
      var ex = document.createElement('div'); ex.className = 'ex';
      Array.from(r[2]).forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.setAttribute('aria-label', c + 'の書き順を見る');
        b.addEventListener('click', function () { load(c); scrollToStage(); });
        ex.appendChild(b);
      });
      li.appendChild(d); li.appendChild(ex); ul.appendChild(li);
    });
  }

  // ---------------- 学年別一覧 ----------------
  var TABS = [['h', 'ひらがな'], ['k', 'カタカナ'], ['1', '1年'], ['2', '2年'], ['3', '3年'], ['4', '4年'], ['5', '5年'], ['6', '6年'], ['7', '中学以降'], ['10', '人名用'], ['11', 'そのほか'], ['r', '最近見た']];
  var curTab = null;
  var tabOf = function (k) { return k.g === 8 ? 'h' : k.g === 9 ? 'k' : String(k.g); };
  // ひらがな・カタカナは五十音の表の形で並べる（・はあき）。v558
  var KTAB = {
    h: [['', 'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', 'や・ゆ・よ', 'らりるれろ', 'わゐ・ゑを', 'ん・・・・'],
      ['濁音・半濁音（゛゜）', 'がぎぐげご', 'ざじずぜぞ', 'だぢづでど', 'ばびぶべぼ', 'ぱぴぷぺぽ'], ['小さい字', 'ぁぃぅぇぉ', 'っゃゅょ・']],
    k: [['', 'アイウエオ', 'カキクケコ', 'サシスセソ', 'タチツテト', 'ナニヌネノ', 'ハヒフヘホ', 'マミムメモ', 'ヤ・ユ・ヨ', 'ラリルレロ', 'ワヰ・ヱヲ', 'ン・・・・'],
      ['濁音・半濁音（゛゜）', 'ガギグゲゴ', 'ザジズゼゾ', 'ダヂヅデド', 'バビブベボ', 'パピプペポ', '・・ヴ・・'], ['小さい字・のばす音', 'ァィゥェォ', 'ッャュョー']]
  };
  function gridBtn(k) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = k.c; b.dataset.c = k.c;
    b.setAttribute('aria-label', k.c + '（' + (k.kana ? GRADE[k.g] : k.rd[0] || '') + '）');
    if ('ゐゑヰヱ'.indexOf(k.c) >= 0) b.className = 'old';
    if (cur && k.c === cur.c) b.setAttribute('aria-current', 'true');
    return b;
  }
  function buildTabs() {
    var box = $('#gtabs');
    TABS.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.t = t[0]; b.textContent = t[1];
      b.addEventListener('click', function () { showTab(t[0]); });
      box.appendChild(b);
    });
  }
  function showTab(t) {
    curTab = t;
    Array.from($('#gtabs').children).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.t === t ? 'true' : 'false'); });
    var grid = $('#kgrid'); grid.innerHTML = '';
    var frag = document.createDocumentFragment();
    grid.classList.toggle('kana', !!KTAB[t]);
    if (KTAB[t]) {
      var cnt = 0;
      KTAB[t].forEach(function (sec) {
        if (sec[0]) { var h = document.createElement('div'); h.className = 'kg-h'; h.textContent = sec[0]; frag.appendChild(h); }
        sec.slice(1).forEach(function (row) {
          Array.from(row).forEach(function (ch) {
            var k = K.get(ch);
            if (!k) { var sp = document.createElement('span'); sp.className = 'kg-blank'; frag.appendChild(sp); return; }
            cnt++; frag.appendChild(gridBtn(k));
          });
        });
      });
      $('#gridCount').textContent = GRADE[t === 'h' ? 8 : 9] + '・' + cnt + '字';
      grid.appendChild(frag);
      return;
    }
    var list = t === 'r' ? store.get('recent', []).map(function (c) { return K.get(c); }).filter(Boolean) : ORDER.filter(function (k) { return String(k.g) === t; });
    $('#gridCount').textContent = t === 'r' ? '' : (GRADE[t] + '・' + list.length + '字');
    if (!list.length) { var e = document.createElement('p'); e.className = 'empty'; e.textContent = 'まだありません。字を開くとここに並びます。'; grid.appendChild(e); return; }
    list.forEach(function (k) { frag.appendChild(gridBtn(k)); });
    grid.appendChild(frag);
  }
  $('#kgrid').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-c]'); if (!b) return;
    load(b.dataset.c); scrollToStage();
  });
  function markGrid() {
    Array.from($('#kgrid').querySelectorAll('button[data-c]')).forEach(function (b) {
      if (b.dataset.c === cur.c) { b.setAttribute('aria-current', 'true'); } else b.removeAttribute('aria-current');
    });
  }
  function scrollToStage() {
    if (window.matchMedia('(min-width: 900px)').matches) return;
    var top = $('.stage-card').getBoundingClientRect().top + window.scrollY - 70;
    if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  // ---------------- 読み込み ----------------
  function load(c, o) {
    o = o || {};
    c = ALIAS[c] || c;
    var k = K.get(c); if (!k) return;
    stopPlayer();
    cur = k;
    buildStage(); buildSteps(); renderInfo();
    // 文章をなぞっているとき（o.doc）は、字の一覧の切りかえ・最近見た字には入れない
    if (curTab && curTab !== 'r') { if (tabOf(k) !== curTab && !o.doc) showTab(tabOf(k)); else markGrid(); }
    if (!o.doc) {
      var rc = store.get('recent', []).filter(function (x) { return x !== c; }); rc.unshift(c); store.set('recent', rc.slice(0, 40));
      if (curTab === 'r') showTab('r');
    }
    try { history.replaceState(history.state, '', '#u' + c.codePointAt(0).toString(16)); } catch (e) { }   // 戻るの見張りの印は残す
    document.title = 'かきじゅん帳';
    if (mode === 'doc' && !o.doc) { setMode('practice'); return; }   // 文章の途中で ほかの字を開いたら、その字のなぞって練習へ（文章の続きは覚えている）
    if (mode === 'practice' || mode === 'doc') { prStart(); return; }
    P.k = o.full ? k.n : 0;
    refresh();
    if (o.autoplay !== false) { P.playing = true; setPlayIcon(); P.timer = setTimeout(function () { P.k = 0; refresh(); P.playing = true; setPlayIcon(); P.timer = setTimeout(function () { startStroke(0); }, 200); }, o.delay || 250); }
  }

  // ---------------- モード切替 ----------------
  // view：書き順を見る・practice：なぞって練習・doc：文章をなぞる（v558。練習の画面をそのまま使い、1字書けたら次の字へ）
  function setMode(m) {
    var was = mode;
    mode = m;
    $('#modeView').setAttribute('aria-selected', m === 'view' ? 'true' : 'false');
    $('#modePractice').setAttribute('aria-selected', m === 'practice' ? 'true' : 'false');
    $('#modeDoc').setAttribute('aria-selected', m === 'doc' ? 'true' : 'false');
    $('#viewUI').hidden = m !== 'view';
    $('#practiceUI').hidden = m === 'view';
    $('#pc').hidden = m === 'view';
    $('#docBar').hidden = m !== 'doc';
    $('#docSkip').hidden = m !== 'doc';
    stopPlayer();
    if (was === 'doc' && m !== 'doc') docPause();
    if (m !== 'view') { PR.lv = store.get(m === 'doc' ? 'docLv' : 'lv', 1); syncLv(); }   // 文章をなぞるときのレベルは別に覚える（はじめは「なぞる」）
    if (m === 'practice') prStart();
    else if (m === 'doc') docEnter(was);
    else {
      hush();
      lOverlay.innerHTML = ''; lMaru.innerHTML = ''; lInk.style.display = ''; P.k = cur.n; refresh();
    }
  }

  // ---------------- 読み上げ（v538）：練習の案内と「うまく書くコツ」を声で ----------------
  // 「横画」を「おうが」、「1画目」を「いちがめ」と読まれないよう、読み上げる文はかなに直してから渡す
  var TTS = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function';
  var YOMI = { '横画': 'よこかく', '縦画': 'たてかく', '左払い': 'ひだりはらい', '右払い': 'みぎはらい', '右上払い': 'みぎうえはらい', '点': 'てん',
    '縦はね上げ': 'たてはねあげ', '縦はね': 'たてはね', '横はね': 'よこはね', '横折れ曲がりはね': 'よこおれまがりはね', '横折れ曲がり': 'よこおれまがり',
    '横折れはね': 'よこおれはね', '横折れ払い': 'よこおればらい', '横折れ上げ': 'よこおれあげ', '横折れ': 'よこおれ', '縦折れ折れ': 'たておれおれ',
    '縦折れ': 'たておれ', '縦曲がり': 'たてまがり', '曲がりはね': 'まがりはね', 'そりはね': 'そりはね', '折れ払い': 'おればらい', '折れはね': 'おれはね',
    'くの字': 'くのじ', '払い折れ': 'はらいおれ', '払いはね': 'はらいはね', '折れ': 'おれ',
    '曲線': 'きょくせん', '結び': 'むすび', '斜めの線': 'ななめのせん', '丸': 'まる', '濁点': 'だくてん', '半濁点': 'はんだくてん' };
  var YOMI_RE = new RegExp(Object.keys(YOMI).sort(function (a, b) { return b.length - a.length; }).join('|'), 'g');
  var TEN = ['', '', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'], ONE = ['', 'いっ', 'に', 'さん', 'よん', 'ご', 'ろっ', 'なな', 'はっ', 'きゅう'];
  // 画の数のよみ：1→いっかく、6→ろっかく、10→じゅっかく、16→じゅうろっかく、20→にじゅっかく
  function kakuYomi(n) {
    n = +n; if (!(n > 0 && n < 100)) return n + 'かく';
    var t = Math.floor(n / 10), o = n % 10;
    return (t ? TEN[t] + (o ? 'じゅう' : 'じゅっ') : '') + ONE[o] + 'かく';
  }
  function sayText(h) {
    return String(h).replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/(\d+)画目/g, function (m, d) { return kakuYomi(d) + 'め'; })
      .replace(/(\d+)画/g, function (m, d) { return kakuYomi(d); })
      .replace(/●/g, 'まる').replace(/[「」]/g, '')
      .replace(YOMI_RE, function (w) { return YOMI[w]; });
  }
  // 声・速さ・高さ・大きさは、表電卓・声の計算帳・ほかの道具と同じ（hyovoice.js。v540）
  function speak(text) {
    if (!TTS || !text) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      if (window.HyoVoice) HyoVoice.apply(u, { lang: 'ja' }); else { u.lang = 'ja-JP'; u.rate = 1; }
      speechSynthesis.speak(u);
    } catch (e) { }
  }
  function hush() { if (TTS) { try { speechSynthesis.cancel(); } catch (e) { } } }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') hush(); });

  // ---------------- 練習モード ----------------
  var pc = $('#pc'), pctx = pc.getContext('2d');
  var PR = { lv: store.get('lv', 1), i: 0, done: [], live: null, miss: 0, missCur: 0, scores: [], fin: false, hint: false, flash: null, fit: null, over: false, say: null, saidKinds: {}, saidAt: -1 };
  function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#000'; }
  function prStart() {
    clearTimeout(DOC.timer);   // 文章をなぞる：次の字へ進む前に「はじめから」などをおしたら、この字を書き直す
    PR.i = 0; PR.done = []; PR.live = null; PR.miss = 0; PR.missCur = 0; PR.scores = []; PR.fin = false; PR.hint = false; PR.flash = null; PR.fit = null; PR.over = false;
    PR.saidKinds = {}; PR.saidAt = -1; hush();
    lMaru.innerHTML = ''; lOverlay.innerHTML = '';
    $('#prResult').hidden = true; $('#prLive').hidden = false;
    lInk.style.display = 'none';
    numEls.forEach(function (t) { t.classList.remove('on', 'cur'); });
    sizePC(); prLayers(); prMsg();
    markStep(-1);
  }
  function prLayers() {
    lGhost.style.display = PR.lv === 1 && !PR.fin ? '' : 'none';
    lHint.innerHTML = '';
    if (PR.fin) return;
    var i = PR.i;
    var showFull = PR.lv === 1 || PR.hint;
    if (showFull) el('path', { class: 'guide', d: cur.paths[i] }, lHint);
    if (PR.lv <= 2 || PR.hint) startDot(i, showFull);
  }
  // 案内（v538）：「◯画目は「◯◯」」と書き方、その下に「うまく書くコツ」（線の書き方＋字の組み立てなど）。
  // まちがえたときは msg を赤い地で出す（コツはそのまま下に残す）。pre は「きれい！」などのほめ言葉
  var LV_TXT = ['', '色の線を●からなぞりましょう。', '●の位置から書きましょう。', '覚えた書き順で書きましょう。'];
  var SPK_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  // その画のコツ：線の書き方（とめ・はね・はらい）と、字の組み立てなど（strokeTips）。テストでは、まちがえたときだけ出す
  function prTips(i) {
    if (PR.lv === 3 && !PR.missCur && !PR.hint) return [];
    var s = sinfo(cur, i), t = [];
    if (s.tip) t.push({ h: esc(s.tip), s: s.tip, kind: s.name });
    return t.concat(strokeTips(cur)[i] || []);
  }
  function prMsg(msg, bad, pre) {
    var m = $('#prMsg'), i = PR.i, s = sinfo(cur, i), tips = prTips(i);
    var head = (pre ? '<b class="pr-ok">' + esc(pre) + '</b> ' : '') + (i + 1) + '画目は「' + esc(s.name) + '」' + (s.end ? '<span class="end-tag">' + s.end + '</span>' : '');
    var lead = bad ? msg : head, sub = bad ? '' : LV_TXT[PR.lv];
    m.className = 'pr-msg' + (bad ? ' bad' : '');
    m.innerHTML = '<span class="pr-count"><em>' + (i + 1) + '</em>/' + cur.n + '</span><div class="pr-body"><p class="pr-lead">' + lead + '</p>'
      + (sub ? '<p class="pr-sub">' + sub + '</p>' : '') + '</div>'
      + (TTS ? '<button class="pr-say" type="button" aria-label="うまく書くコツを読み上げる" title="コツを読み上げる">' + SPK_ICON + '</button>' : '')
      + (tips.length ? '<div class="pr-tips"><b>うまく書くコツ</b><ul>' + tips.map(function (t) { return '<li>' + t.h + '</li>'; }).join('') + '</ul></div>' : '');
    PR.say = { lead: bad ? msg : (pre ? pre + ' ' : '') + (i + 1) + '画目は「' + s.name + '」。', tips: tips };
    // 自動の読み上げ（v539）：一筆書くごとに、次に書く画の「うまく書くコツ」だけを読む。
    // 案内（「2画目は…」）・まちがえた理由・点数は読まない。同じ画のコツは一度だけ（まちがえて書き直すときは読まない）
    if (opt.say && tips.length && PR.saidAt !== i) { PR.saidAt = i; prSpeak(false); }
  }
  // コツを読む。自動のときは、前にも読んだ線の書き方（「左から右へ…」）は、字のコツがあればそちらだけ読む。
  // 🔈（full）は全部読む。テストでまだコツを出していないときの 🔈 は、案内を読む
  function prSpeak(full) {
    var d = PR.say; if (!d) return;
    if (!d.tips.length) { if (full) speak(sayText(d.lead)); return; }
    var other = d.tips.some(function (t) { return !t.kind; }), parts = [];
    d.tips.forEach(function (t) {
      if (t.kind) { if (!full && other && PR.saidKinds[t.kind]) return; PR.saidKinds[t.kind] = 1; }
      parts.push(t.s);
    });
    speak(sayText(parts.join(' ')));
  }
  $('#prMsg').addEventListener('click', function (e) { if (e.target.closest('.pr-say')) prSpeak(true); });
  function sizePC() {
    var r = $('#masu').getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    pc.width = Math.max(10, Math.round(r.width * dpr)); pc.height = Math.max(10, Math.round(r.height * dpr));
    drawPC();
  }
  function drawLine(pts, color, w, alpha) {
    if (!pts || !pts.length) return;
    var s = pc.width / 109;
    pctx.globalAlpha = alpha == null ? 1 : alpha;
    pctx.strokeStyle = color; pctx.fillStyle = color; pctx.lineWidth = w * s; pctx.lineCap = 'round'; pctx.lineJoin = 'round';
    if (pts.length === 1) { pctx.beginPath(); pctx.arc(pts[0][0] * s, pts[0][1] * s, w * s / 2, 0, Math.PI * 2); pctx.fill(); pctx.globalAlpha = 1; return; }
    pctx.beginPath(); pctx.moveTo(pts[0][0] * s, pts[0][1] * s);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      pctx.quadraticCurveTo(pts[i][0] * s, pts[i][1] * s, mx * s, my * s);
    }
    var l = pts[pts.length - 1]; pctx.lineTo(l[0] * s, l[1] * s); pctx.stroke();
    pctx.globalAlpha = 1;
  }
  function drawPC() {
    pctx.clearRect(0, 0, pc.width, pc.height);
    var ink = cssv('--ink'), mark = cssv('--mark');
    PR.done.forEach(function (p) { drawLine(p, ink, 4.2); });
    if (PR.live) drawLine(PR.live, ink, 4.2);
    if (PR.flash) {
      var a = 1 - (performance.now() - PR.flash.t0) / 700;
      if (a > 0) { drawLine(PR.flash.pts, mark, 4.2, a); requestAnimationFrame(drawPC); } else PR.flash = null;
    }
  }
  function ptFrom(e) {
    var r = pc.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 109, (e.clientY - r.top) / r.height * 109];
  }
  pc.addEventListener('pointerdown', function (e) {
    if (PR.fin || mode === 'view') return;   // なぞって練習・文章をなぞる
    e.preventDefault();
    try { pc.setPointerCapture(e.pointerId); } catch (x) { }
    PR.live = [ptFrom(e)]; drawPC();
  });
  pc.addEventListener('pointermove', function (e) {
    if (!PR.live) return;
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (!evs.length) evs = [e];
    evs.forEach(function (ev) { PR.live.push(ptFrom(ev)); });
    drawPC();
  });
  function endStroke() {
    if (!PR.live) return;
    var pts = PR.live; PR.live = null;
    var g = geo(cur), total = KRecog.polyLen(pts);
    if (total < 1.2 && g.len[PR.i] > 10) { drawPC(); return; }
    var r = judge(pts);
    if (r.ok) {
      PR.done.push(pts); PR.scores.push(r.score); PR.i++; PR.missCur = 0; PR.hint = false;
      updateFit();
      drawPC();
      if (PR.i >= cur.n) { finish(); return; }
      prLayers();
      prMsg('', false, r.score >= 90 ? 'きれい！' : r.score >= 75 ? 'いいですね。' : 'OK。');
    } else {
      PR.miss++; PR.missCur++;
      PR.flash = { pts: pts, t0: performance.now() }; drawPC();
      var msg = r.msg;
      if (PR.missCur >= 2 && PR.lv > 1 && !PR.hint) { PR.hint = true; prLayers(); msg += ' ヒントを出しました。'; }
      prMsg(msg, true);
    }
  }
  pc.addEventListener('pointerup', endStroke);
  pc.addEventListener('pointercancel', function () { PR.live = null; drawPC(); });

  function updateFit() {
    if (PR.lv === 1) { PR.fit = null; return; }
    var g = geo(cur), U = [], R = [];
    PR.done.forEach(function (p, i) {
      var a = KRecog.resample(p, 12), b = KRecog.resample(g.polys[i], 12);
      for (var k = 0; k < 12; k++) { U.push(a[k]); R.push(b[k]); }
    });
    var n = U.length, mu = [0, 0], mr = [0, 0];
    for (var i = 0; i < n; i++) { mu[0] += U[i][0]; mu[1] += U[i][1]; mr[0] += R[i][0]; mr[1] += R[i][1]; }
    mu[0] /= n; mu[1] /= n; mr[0] /= n; mr[1] /= n;
    var num = 0, den = 0;
    for (var j = 0; j < n; j++) { var rx = R[j][0] - mr[0], ry = R[j][1] - mr[1]; num += (U[j][0] - mu[0]) * rx + (U[j][1] - mu[1]) * ry; den += rx * rx + ry * ry; }
    var s = den > 40 ? Math.min(1.3, Math.max(0.7, num / den)) : 1;
    PR.fit = { s: s, tx: mu[0] - s * mr[0], ty: mu[1] - s * mr[1] };
  }
  function judge(pts) {
    var g = geo(cur), i = PR.i, N = 24, n = cur.n;
    var f = PR.fit;
    var mapped = f ? pts.map(function (p) { return [(p[0] - f.tx) / f.s, (p[1] - f.ty) / f.s]; }) : pts;
    var u = KRecog.resample(mapped, N), uLen = KRecog.polyLen(mapped);
    var ref = function (j) { return KRecog.resample(g.polys[j], N); };
    var md = function (a, b, rev) { var s = 0; for (var k = 0; k < N; k++) { var q = b[rev ? N - 1 - k : k]; s += Math.hypot(a[k][0] - q[0], a[k][1] - q[1]); } return s / N; };
    var r = ref(i), L = g.len[i];
    var tol = [0, 12, 13.5, 14.5][PR.lv] * (PR.lv > 1 && i === 0 ? 1.35 : 1);
    var fwd = md(u, r, false), rev = md(u, r, true);
    var sd = Math.hypot(u[0][0] - r[0][0], u[0][1] - r[0][1]);
    var circ = cur.circ === i, short = L < 16 || circ, ok;   // circ：半濁点（゜）の丸は、どこから・どちら回りに書いてもよい（v558）
    if (short) {
      var cu = [0, 0], cr = [0, 0];
      for (var k = 0; k < N; k++) { cu[0] += u[k][0] / N; cu[1] += u[k][1] / N; cr[0] += r[k][0] / N; cr[1] += r[k][1] / N; }
      var cd = Math.hypot(cu[0] - cr[0], cu[1] - cr[1]);
      ok = cd < tol && uLen < Math.max(30, L * 3) && (!circ || uLen > L * 0.35);
      fwd = circ ? Math.min(fwd, rev, cd * 1.2 + 2) : Math.min(fwd, rev);
    } else {
      ok = fwd <= tol && sd <= tol * 1.7 && uLen > L * 0.45 && uLen < L * 1.9;
    }
    if (ok) return { ok: true, score: Math.round(Math.min(100, Math.max(55, 100 - Math.max(0, fwd - 2.5) * (40 / (tol - 2.5))))) };
    var dot = PR.lv <= 2 || PR.hint;
    if (!short && rev <= tol && rev < fwd) return { ok: false, msg: '向きが逆です。' + (dot ? '●の位置から' : '反対側から') + '書き始めましょう。' };
    for (var j = i + 1; j < n; j++) {
      var rj = ref(j);
      if (Math.min(md(u, rj, false), md(u, rj, true)) <= tol * 0.9) return { ok: false, msg: '書き順がちがいます。いまのは' + (j + 1) + '画目の線です。先に' + (i + 1) + '画目「' + esc(sinfo(cur, i).name) + '」を書きましょう。' };
    }
    for (var j2 = 0; j2 < i; j2++) {
      var rj2 = ref(j2);
      if (Math.min(md(u, rj2, false), md(u, rj2, true)) <= tol * 0.8) return { ok: false, msg: 'その線はもう書きました。次は' + (i + 1) + '画目です。' };
    }
    if (!short && sd > tol * 1.7) return { ok: false, msg: '書き始めの位置がずれています。' + (dot ? '●から書き始めましょう。' : '') };
    if (!short && uLen < L * 0.45) return { ok: false, msg: '線が短いようです。最後までしっかり引きましょう。' };
    if (!short && uLen > L * 1.9) return { ok: false, msg: '線が長すぎます。お手本の長さに合わせましょう。' };
    return { ok: false, msg: short ? '点の位置がずれています。' : '形がずれています。お手本の線にそって書きましょう。' };
  }
  function finish() {
    PR.fin = true; prLayers();
    var avg = PR.scores.reduce(function (a, b) { return a + b; }, 0) / PR.scores.length;
    var score = Math.max(0, Math.min(100, Math.round(avg - PR.miss * 4)));
    var stars = score >= 88 ? 3 : score >= 72 ? 2 : 1;
    if (mode === 'doc' && DOC.active) { docDone(score, stars); return; }
    var best = store.get('best', {}), prev = best[cur.c] || 0, rec = stars > prev;
    if (rec) { best[cur.c] = stars; store.set('best', best); }
    var title = stars === 3 ? 'はなまる！' : stars === 2 ? 'よくできました' : 'もう一息！';
    var box = $('#prResult');
    box.innerHTML = '<div class="stars" aria-label="星' + stars + 'つ">' + '★'.repeat(stars) + '<i>' + '★'.repeat(3 - stars) + '</i></div>' +
      '<strong>' + title + '</strong>' +
      '<p>点数 ' + score + '　書き順や形のミス ' + PR.miss + '回' + (PR.lv === 3 ? '（テスト）' : PR.lv === 2 ? '（お手本なし）' : '') + (rec && prev ? '　自己ベスト更新' : '') + '</p>' +
      '<div class="pr-row"><button class="btn" id="rAgain" type="button">もう一度</button><button class="btn" id="rOver" type="button" aria-pressed="false">お手本と重ねる</button><button class="btn pri" id="rNext" type="button">次の字へ</button></div>';
    $('#prLive').hidden = true; box.hidden = false;
    $('#rAgain').onclick = prStart;
    $('#rOver').onclick = function () {
      PR.over = !PR.over; this.setAttribute('aria-pressed', PR.over ? 'true' : 'false');
      lOverlay.innerHTML = '';
      if (PR.over) cur.paths.forEach(function (d) { el('path', { d: d }, lOverlay); });
    };
    $('#rNext').onclick = function () { var nx = ORDER[(cur.o + 1) % ORDER.length]; load(nx.c); };
    if (stars >= 2) drawMaru(stars === 3);
  }
  function drawMaru(hana) {
    lMaru.innerHTML = '';
    var cx = 84, cy = 82, pts = [], t;
    if (hana) {
      for (t = 0; t <= Math.PI * 4.2; t += 0.12) { var rr = 1 + t * 1.15; pts.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]); }
      var R = 11.5, r0 = 2.3, d0 = 4.4, m = (R + r0) / r0;
      for (t = 0; t <= Math.PI * 2 + 0.05; t += 0.025) pts.push([cx + (R + r0) * Math.cos(t + 0.7) - d0 * Math.cos(m * t + 0.7), cy + (R + r0) * Math.sin(t + 0.7) - d0 * Math.sin(m * t + 0.7)]);
    } else {
      for (t = 0; t <= Math.PI * 2.15; t += 0.08) pts.push([cx + 14 * Math.cos(t - 1.9), cy + 13 * Math.sin(t - 1.9)]);
    }
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L');
    var p = el('path', { d: d }, lMaru);
    var L = p.getTotalLength ? p.getTotalLength() : 400;
    if (reduceMotion) return;
    p.style.strokeDasharray = L + ' ' + L; p.style.strokeDashoffset = L;
    var t0 = performance.now(), dur = hana ? 1500 : 700;
    (function step(now) { var e = Math.min(1, (now - t0) / dur); p.style.strokeDashoffset = L * (1 - e); if (e < 1) requestAnimationFrame(step); else { p.style.strokeDasharray = ''; } })(t0);
  }
  $('#prUndo').addEventListener('click', function () {
    if (!PR.done.length || PR.fin) return;
    PR.done.pop(); PR.scores.pop(); PR.i--; PR.hint = false; PR.missCur = 0; updateFit(); if (!PR.done.length) PR.fit = null;
    drawPC(); prLayers(); prMsg();
  });
  $('#prRestart').addEventListener('click', prStart);
  $('#prHint').addEventListener('click', function () {
    if (PR.fin) return;
    PR.hint = true; prLayers();
    var path = lHint.querySelector('.guide'); if (!path) return;
    var L = path.getTotalLength(); path.style.strokeDasharray = L + ' ' + L; path.style.strokeDashoffset = L;
    var t0 = performance.now(), dur = Math.max(500, L / 60 * 1000);
    (function step(now) { var e = Math.min(1, (now - t0) / dur); path.style.strokeDashoffset = L * (1 - ease(e)); if (e < 1) requestAnimationFrame(step); else path.style.strokeDasharray = ''; })(t0);
  });
  Array.from(document.querySelectorAll('#practiceUI [data-lv]')).forEach(function (b) {
    b.addEventListener('click', function () {
      PR.lv = +b.dataset.lv; store.set(mode === 'doc' ? 'docLv' : 'lv', PR.lv);
      Array.from(document.querySelectorAll('#practiceUI [data-lv]')).forEach(function (x) { var on = x === b; x.setAttribute('aria-checked', on); x.setAttribute('aria-selected', on); });
      prStart();
    });
  });
  // 🔈 コツを自動で読む（一筆ごとに、次の画のコツだけ。はじめからオン・覚える）。オンにしたら、いまの画のコツをすぐ読む
  var prAuto = $('#prAuto');
  prAuto.hidden = !TTS;
  prAuto.setAttribute('aria-pressed', opt.say ? 'true' : 'false');
  prAuto.addEventListener('click', function () {
    opt.say = !opt.say; store.set('sayTips', opt.say); prAuto.setAttribute('aria-pressed', opt.say ? 'true' : 'false');
    if (!opt.say) { hush(); return; }
    PR.saidAt = PR.i;
    if (PR.say && PR.say.tips.length) prSpeak(true);
  });
  // 声の設定（v540）：表電卓・声の計算帳と同じ「読み上げの声」の画面を、下から出す
  var prVoice = $('#prVoice');
  prVoice.hidden = !TTS || !window.HyoVoice;
  prVoice.addEventListener('click', function () { HyoVoice.ui($('#voiceBox'), { test: '書き始めはしっかり、だんだん力をぬいて左下へスッと払います。' }); openSheet($('#voiceSheet')); });
  function syncLv() { Array.from(document.querySelectorAll('#practiceUI [data-lv]')).forEach(function (x) { var on = +x.dataset.lv === PR.lv; x.setAttribute('aria-checked', on); x.setAttribute('aria-selected', on); }); }

  // ---------------- 📜 文章をなぞる（v558）：有名な文章を、1字ずつ続けてなぞる ----------------
  // 文は、著作権の切れた作品・昔から伝わることばから選ぶ。句読点・空白（と書き順データのない字）はとばす。
  // 1字書けたら点数を覚えて次の字へ。とちゅうでやめても続きから（kkj:doc）。書き終わると、点数と「もう一度練習したい字」
  var DOC_G = ['ひらがな・カタカナ', 'うた・ことば', '名作の書き出し'];
  var DOCS = [
    { id: 'aiueo', g: 0, t: 'あいうえお', by: 'ひらがなの五十音', x: 'あいうえお\nかきくけこ\nさしすせそ\nたちつてと\nなにぬねの\nはひふへほ\nまみむめも\nやゆよ\nらりるれろ\nわをん' },
    { id: 'aiueok', g: 0, t: 'アイウエオ', by: 'カタカナの五十音', x: 'アイウエオ\nカキクケコ\nサシスセソ\nタチツテト\nナニヌネノ\nハヒフヘホ\nマミムメモ\nヤユヨ\nラリルレロ\nワヲン' },
    { id: 'iroha', g: 0, t: 'いろは歌', by: '平安時代のうた（かなを1回ずつ使う）', x: 'いろはにほへと\nちりぬるを\nわかよたれそ\nつねならむ\nうゐのおくやま\nけふこえて\nあさきゆめみし\nゑひもせす' },
    { id: 'usagi', g: 1, t: 'うさぎとかめ', by: '童謡（石原和三郎 作詞）', x: 'もしもし かめよ\nかめさんよ\nせかいのうちに\nおまえほど\nあゆみの のろい\nものはない\nどうして そんなに\nのろいのか' },
    { id: 'haru', g: 1, t: '春が来た', by: '唱歌（高野辰之 作詞）', x: '春が来た 春が来た\nどこに来た\n山に来た 里に来た\n野にも来た' },
    { id: 'kotowaza', g: 1, t: 'ことわざ', by: '昔から伝わることば', x: '石の上にも三年\n花より団子\n急がば回れ\n七転び八起き\nちりも積もれば山となる' },
    { id: 'haiku', g: 1, t: '俳句', by: '松尾芭蕉・与謝蕪村・小林一茶・正岡子規', x: '夏草や兵どもが夢の跡\n菜の花や月は東に日は西に\n名月をとってくれろと泣く子かな\n柿くへば鐘が鳴るなり法隆寺' },
    { id: 'jugemu', g: 1, t: '寿限無', by: '落語（長い名前）', x: 'じゅげむ じゅげむ\nごこうのすりきれ\nかいじゃりすいぎょの\nすいぎょうまつ\nうんらいまつ\nふうらいまつ\nくうねるところに\nすむところ\nやぶらこうじの\nぶらこうじ\nパイポ パイポ\nパイポのシューリンガン\nシューリンガンの\nグーリンダイ\nグーリンダイの\nポンポコピーの\nポンポコナーの\nちょうきゅうめいの\nちょうすけ' },
    { id: 'ame', g: 2, t: '雨ニモマケズ', by: '宮沢賢治（書き出し）', x: '雨ニモマケズ\n風ニモマケズ\n雪ニモ夏ノ暑サニモマケヌ\n丈夫ナカラダヲモチ' },
    { id: 'makura', g: 2, t: '枕草子', by: '清少納言（「春はあけぼの」）', x: '春はあけぼの。\nやうやう白くなりゆく山ぎは、\n少しあかりて、\n紫だちたる雲の\n細くたなびきたる。' },
    { id: 'hojo', g: 2, t: '方丈記', by: '鴨長明（書き出し）', x: 'ゆく河の流れは絶えずして、\nしかももとの水にあらず。\nよどみに浮かぶうたかたは、\nかつ消えかつ結びて、\n久しくとどまりたるためしなし。' },
    { id: 'bocchan', g: 2, t: '坊っちゃん', by: '夏目漱石（書き出し）', x: '親譲りの無鉄砲で\n小供の時から\n損ばかりしている。' },
    { id: 'rasho', g: 2, t: '羅生門', by: '芥川龍之介（書き出し）', x: 'ある日の暮方の事である。\n一人の下人が、\n羅生門の下で\n雨やみを待っていた。' }
  ];
  // 覚えておいた続き（kkj:doc）は形をたしかめてから使う：{ id, pos, res: { 字の位置: [点数（とばした字は -1）, 書き直し] }, ms, fin }
  function docClean(st) {
    if (!st || typeof st !== 'object' || !docById(st.id)) return null;
    var res = {}, n = docCs(docById(st.id)).length;
    if (st.res && typeof st.res === 'object') Object.keys(st.res).forEach(function (i) {
      var r = st.res[i];
      if (/^\d+$/.test(i) && +i < n && Array.isArray(r) && isFinite(r[0]) && isFinite(r[1])) res[i] = [Math.max(-1, Math.min(100, Math.round(r[0]))), Math.max(0, Math.min(999, Math.round(r[1])))];
    });
    return { id: st.id, pos: Math.max(0, Math.min(n, Math.round(+st.pos) || 0)), res: res, ms: Math.max(0, +st.ms || 0), fin: !!st.fin };
  }
  var DOC = { st: docClean(store.get('doc', null)), active: false, timer: 0, t: 0, prev: 'practice', chosen: false, sum: false };   // sum：書き終わりのまとめを出している
  function docById(id) { for (var i = 0; i < DOCS.length; i++) if (DOCS[i].id === id) return DOCS[i]; return null; }
  function docCs(d) { if (!d._cs) d._cs = Array.from(d.x); return d._cs; }
  function docOk(ch) { return !/\s/.test(ch) && K.has(ALIAS[ch] || ch); }   // なぞる字か（句読点・空白・データのない字はとばす）
  function docTotal(d) { return docCs(d).filter(docOk).length; }
  function docSave() { store.set('doc', DOC.st); }
  function docPause() { clearTimeout(DOC.timer); DOC.active = false; DOC.sum = false; }
  function docEnter(was) {
    DOC.prev = was === 'doc' ? 'practice' : was;
    var st = DOC.st, d = st && docById(st.id);
    if (d && !st.fin) { docGo(st.pos); return; }
    DOC.active = false; DOC.sum = false; docBar(); prStart(); openDocSheet();
  }
  function docStart(id) {
    DOC.st = { id: id, pos: 0, res: {}, ms: 0, fin: false }; docSave();
    lOverlay.innerHTML = ''; lMaru.innerHTML = '';
    if (mode !== 'doc') setMode('doc'); else docGo(0);
  }
  function docGo(pos) {
    var st = DOC.st, d = st && docById(st.id); if (!d) return;
    clearTimeout(DOC.timer);
    var cs = docCs(d);
    while (pos < cs.length && !docOk(cs[pos])) pos++;
    if (pos >= cs.length) { docFinish(); return; }
    st.pos = pos; st.fin = false; docSave();
    DOC.active = true; DOC.sum = false; DOC.t = Date.now();
    lMaru.innerHTML = '';
    load(cs[pos], { doc: true, autoplay: false });
    docBar();
  }
  // 1字書けた：点数を覚えて、少し待ってから次の字へ
  function docDone(score, stars) {
    var st = DOC.st, now = Date.now();
    st.res[st.pos] = [score, PR.miss];
    st.ms = (st.ms || 0) + Math.min(90000, now - (DOC.t || now));   // 1字に90秒まで（席をはずした時間は数えない）
    docSave(); docBar();
    if (stars >= 2) drawMaru(stars === 3);
    var m = $('#prMsg'), cs = docCs(docById(st.id)), nx = st.pos + 1;
    while (nx < cs.length && !docOk(cs[nx])) nx++;
    m.className = 'pr-msg';
    m.innerHTML = '<span class="pr-count"><em>' + score + '</em>点</span><div class="pr-body"><p class="pr-lead"><b class="pr-ok">' + (stars === 3 ? 'はなまる！' : stars === 2 ? 'よくできました' : 'OK') + '</b>「' + esc(cur.c) + '」が書けました。</p><p class="pr-sub">' + (nx < cs.length ? '次は「' + esc(cs[nx]) + '」' : 'これで最後の字です') + '</p></div>';
    var id = st.id, pos = st.pos + 1;
    DOC.timer = setTimeout(function () { if (mode === 'doc' && DOC.st && DOC.st.id === id) docGo(pos); }, reduceMotion ? 350 : 1200);
  }
  $('#docSkip').addEventListener('click', function () {
    if (mode !== 'doc' || !DOC.active || PR.fin) return;
    DOC.st.res[DOC.st.pos] = [-1, 0]; docSave(); docGo(DOC.st.pos + 1);   // とばした字は点数に入れない（あとで「もう一度練習したい字」に出す）
  });
  function docStars(sc) { return sc >= 88 ? 3 : sc >= 72 ? 2 : 1; }
  function docFinish() {
    var st = DOC.st, d = docById(st.id), cs = docCs(d);
    clearTimeout(DOC.timer); DOC.active = false; DOC.sum = true;
    st.fin = true; st.pos = cs.length; docSave();
    var keys = Object.keys(st.res).map(Number), done = keys.filter(function (i) { return st.res[i][0] >= 0; });
    var avg = done.length ? Math.round(done.reduce(function (a, i) { return a + st.res[i][0]; }, 0) / done.length) : 0;
    var miss = done.reduce(function (a, i) { return a + st.res[i][1]; }, 0), stars = done.length ? docStars(avg) : 1;
    var best = store.get('docBest', {}); if (!best || typeof best !== 'object') best = {};
    var rec = stars > (best[d.id] | 0);
    if (rec) { best[d.id] = stars; store.set('docBest', best); }
    var low = [];
    keys.filter(function (i) { return st.res[i][0] < 80; }).sort(function (a, b) { return st.res[a][0] - st.res[b][0]; })
      .forEach(function (i) { var c = ALIAS[cs[i]] || cs[i]; if (low.indexOf(c) < 0 && low.length < 8) low.push(c); });
    var min = Math.max(1, Math.round((st.ms || 0) / 60000));
    PR.fin = true; prLayers(); hush();
    var box = $('#prResult');
    box.innerHTML = '<div class="stars" aria-label="星' + stars + 'つ">' + '★'.repeat(stars) + '<i>' + '★'.repeat(3 - stars) + '</i></div>' +
      '<strong>「' + esc(d.t) + '」を書きました！</strong>' +
      '<p>' + done.length + '字・平均 ' + avg + '点・書き直し ' + miss + '回・約' + min + '分' + (keys.length > done.length ? '・とばした字 ' + (keys.length - done.length) + '字' : '') + '</p>' +
      (low.length ? '<p>もう一度練習したい字（おすと、その字のなぞって練習）</p><div class="doc-low">' + low.map(function (c) { return '<button type="button" data-c="' + esc(c) + '" aria-label="' + esc(c) + 'を練習する">' + esc(c) + '</button>'; }).join('') + '</div>' : '<p>どの字もきれいに書けました。</p>') +
      '<div class="pr-row"><button class="btn" id="dAgain" type="button">もう一度</button><button class="btn pri" id="dOther" type="button">ほかの文章</button></div>';
    $('#prLive').hidden = true; box.hidden = false;
    $('#dAgain').onclick = function () { docStart(d.id); };
    $('#dOther').onclick = function () { openDocSheet(); };
    Array.from(box.querySelectorAll('.doc-low button')).forEach(function (b) { b.onclick = function () { load(b.dataset.c); }; });
    if (stars >= 2) drawMaru(stars === 3);
    docBar();
  }
  // 上の帯：題・いまの行（書いた字・いまの字・これからの字）・進み具合。字をおすと、その字から書き直せる
  function docBar() {
    var st = DOC.st, d = st && docById(st.id), line = $('#docLine');
    if (!d || (st.fin && !DOC.sum)) { $('#docTitle').textContent = '文章をえらんでください'; $('#docBy').textContent = ''; line.innerHTML = ''; $('#docProg').textContent = ''; $('#docFill').style.width = '0%'; return; }
    var cs = docCs(d), total = docTotal(d), done = Object.keys(st.res).length, pos = Math.min(st.pos, cs.length - 1);
    var a = pos, b = pos;
    while (a > 0 && cs[a - 1] !== '\n') a--;
    while (b < cs.length && cs[b] !== '\n') b++;
    var lines = d.x.split('\n').length, ln = d.x.slice(0, a).split('\n').length;
    $('#docTitle').textContent = d.t; $('#docBy').textContent = d.by;
    $('#docProg').textContent = done + ' / ' + total + '字・' + ln + ' / ' + lines + '行';
    $('#docFill').style.width = Math.round(done / Math.max(1, total) * 100) + '%';
    var h = '';
    for (var i = a; i < b; i++) {
      var ch = cs[i], r = st.res[i];
      if (!docOk(ch)) { h += '<span class="p">' + (/\s/.test(ch) ? '&nbsp;' : esc(ch)) + '</span>'; continue; }
      var cls = r ? (r[0] < 0 ? 'sk' : 'd s' + docStars(r[0])) : (i === st.pos && !st.fin ? 'c' : '');
      h += '<span class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-label="' + esc(ch) + (r ? (r[0] < 0 ? '（とばした）' : '（' + r[0] + '点）') : i === st.pos ? '（いまの字）' : '') + '">' + esc(ch) + '</span>';
    }
    line.innerHTML = h;
  }
  function docJump(e) {
    var sp = e.target.closest('#docLine span[data-i]'); if (!sp || mode !== 'doc' || !DOC.st) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    docGo(+sp.dataset.i);
  }
  $('#docLine').addEventListener('click', docJump);
  $('#docLine').addEventListener('keydown', docJump);
  // 文章をえらぶ窓
  function openDocSheet() {
    var box = $('#docList'), st = DOC.st, best = store.get('docBest', {}), h = '';
    DOC_G.forEach(function (gn, gi) {
      h += '<div class="doc-g">' + esc(gn) + '</div>';
      DOCS.filter(function (d) { return d.g === gi; }).forEach(function (d) {
        var cur2 = st && st.id === d.id && !st.fin, n = docTotal(d), bs = Math.max(0, Math.min(3, best[d.id] | 0));
        var stat = (cur2 ? '<span class="st go">つづきから ' + Object.keys(st.res).length + ' / ' + n + '字</span>' : '<span class="st">' + n + '字</span>') +
          (bs ? '<span class="st best" aria-label="いちばんよかったとき 星' + bs + 'つ">' + '★'.repeat(bs) + '</span>' : '');
        h += '<div class="doc-it' + (cur2 ? ' on' : '') + '"><button type="button" class="doc-go" data-id="' + d.id + '"><b>' + esc(d.t) + '</b><small>' + esc(d.by) + '</small>' +
          '<span class="pv">' + esc(d.x.replace(/\n/g, '　')) + '</span><span class="sts">' + stat + '</span></button>' +
          (cur2 ? '<button type="button" class="btn sm doc-re" data-re="' + d.id + '">はじめから</button>' : '') + '</div>';
      });
    });
    box.innerHTML = h;
    openSheet($('#docSheet'));
  }
  $('#docList').addEventListener('click', function (e) {
    var go = e.target.closest('[data-id]'), re = e.target.closest('[data-re]');
    if (!go && !re) return;
    DOC.chosen = true; closeSheet(); DOC.chosen = false;
    if (re) { docStart(re.dataset.re); return; }
    var id = go.dataset.id, st = DOC.st;
    if (st && st.id === id && !st.fin) { if (mode !== 'doc') setMode('doc'); else docGo(st.pos); }
    else docStart(id);
  });
  $('#docPick').addEventListener('click', openDocSheet);
  // 何もえらばずに窓を閉じたら、文章をなぞる前の画面へもどす
  function docSheetClosed() { if (!DOC.chosen && mode === 'doc' && !DOC.active && !DOC.sum) setMode(DOC.prev || 'practice'); }

  // ---------------- 検索 ----------------
  var q = $('#q'), results = $('#results');
  function search(s) {
    s = s.trim(); if (!s) return null;
    var z = s.replace(/[０-９]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0xFEE0); });
    var m = z.match(/^(\d{1,2})\s*(画|かく)?$/);
    if (m) { var n = +m[1], l = ALL.filter(function (k) { return !k.kana && k.n === n; }); return { list: l, msg: l.length ? n + '画の漢字（' + l.length + '字）' : n + '画の漢字はありません。' }; }
    var chars = Array.from(s), hit = [], nj = [], sub = [];
    chars.forEach(function (ch) {
      if (!isKanji(ch)) return;
      var c = ALIAS[ch] || ch;
      if (K.has(c)) { if (hit.indexOf(c) < 0) hit.push(c); if (NOFORM[ch] && sub.indexOf(ch) < 0) sub.push(ch); } else if (nj.indexOf(ch) < 0) nj.push(ch);
    });
    if (hit.length || nj.length) return { list: hit.map(function (c) { return K.get(c); }),
      msg: (sub.length ? sub.map(function (ch) { return '「' + ch + '」は「' + ALIAS[ch] + '」'; }).join('・') + 'の書き順で出します（その形の書き順データがないため）。' : '') +
        (nj.length ? '「' + nj.join('') + '」は書き順データがありません（常用漢字・人名用漢字・地名などの漢字 ' + NKAN + '字のほかの字です）。' : '') };
    var h = kata2hira(s).replace(/[\s　、。・.]/g, '');
    if (/^[ぁ-ゖー]+$/.test(h)) {
      // かなの字そのもの（v558）：1字なら ひらがな・カタカナを先に、2字より長いときは 漢字のあとに並べる
      var kc = [];
      Array.from(s).forEach(function (ch) { var k = isKana(ch) && K.get(ch); if (k && kc.indexOf(k) < 0) kc.push(k); });
      if (kc.length === 1) { var pc = K.get(kanaPair(kc[0].c)); if (pc) kc.push(pc); }
      var ex = [], pre = [];
      if (/^[ぁ-ゖ]+$/.test(h)) ALL.forEach(function (k) {
        if (k.kana) return;
        if (k.rd.indexOf(h) >= 0) ex.push(k);
        else if (k.rd.some(function (r) { return r.indexOf(h) === 0; })) pre.push(k);
      });
      var one = h.length === 1, l2 = one ? kc.concat(ex, pre) : ex.concat(pre, kc), parts = [];
      if (kc.length && one) parts.push('かなの「' + kc.map(function (k) { return k.c; }).join('」「') + '」');
      if (ex.length || pre.length) parts.push('「' + h + '」と読む漢字' + (ex.length ? '（' + ex.length + '字）' : '') + (pre.length ? '・「' + h + '…」で始まる読み（' + pre.length + '字）' : ''));
      if (kc.length && !one) parts.push('かなの字（' + kc.length + '字）');
      return { list: l2, msg: l2.length ? parts.join('・') : '「' + h + '」と読む漢字は見つかりませんでした。' };
    }
    return { list: [], msg: '見つかりませんでした。漢字・ひらがな・カタカナ・画数（例：5画）で探せます。' };
  }
  function showResults(r) {
    if (!r) { results.hidden = true; return; }
    results.innerHTML = '';
    if (r.msg) { var p = document.createElement('p'); p.className = 'hint'; p.textContent = r.msg; results.appendChild(p); }
    if (r.list.length) {
      var g = document.createElement('div'); g.className = 'res-grid';
      r.list.slice(0, 120).forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'res-item'; b.dataset.c = k.c;
        b.innerHTML = '<b>' + esc(k.c) + '</b><small>' + esc(k.kana ? GRADE[k.g] : k.rd[0] || '') + '・' + k.n + '画</small>';
        g.appendChild(b);
      });
      results.appendChild(g);
      if (r.list.length > 120) { var more = document.createElement('p'); more.className = 'hint'; more.style.margin = '8px 0 0'; more.textContent = 'ほか' + (r.list.length - 120) + '字。もう少しくわしく入力してください。'; results.appendChild(more); }
    }
    results.hidden = false;
  }
  var composing = false;
  q.addEventListener('compositionstart', function () { composing = true; });
  q.addEventListener('compositionend', function () { composing = false; onQ(); });
  q.addEventListener('input', function () { if (!composing) onQ(); $('#qClear').hidden = !q.value; });
  function onQ() { showResults(search(q.value)); }
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !composing) {
      var r = search(q.value);
      if (r && r.list.length) pick(r.list[0].c);
    } else if (e.key === 'Escape') { results.hidden = true; q.blur(); }
  });
  q.addEventListener('focus', function () { if (q.value) onQ(); });
  results.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) pick(b.dataset.c); });
  document.addEventListener('pointerdown', function (e) { if (!$('#searchWrap').contains(e.target)) results.hidden = true; });
  $('#qClear').addEventListener('click', function () { q.value = ''; $('#qClear').hidden = true; results.hidden = true; q.focus(); });
  function pick(c) { results.hidden = true; q.blur(); load(c); scrollToStage(); }

  // ---------------- シート ----------------
  var openSheetEl = null, lastFocus = null;
  function openSheet(s) {
    lastFocus = document.activeElement;
    openSheetEl = s; s.hidden = false; $('#backdrop').hidden = false;
    var c = s.querySelector('[data-close]'); if (c) c.focus();
  }
  function closeSheet() {
    if (!openSheetEl) return;
    if (openSheetEl === $('#micSheet')) stopRec();
    if (openSheetEl === $('#voiceSheet')) hush();   // 声の設定の試しの読み上げを止める
    var wasDoc = openSheetEl === $('#docSheet');
    openSheetEl.hidden = true; $('#backdrop').hidden = true; openSheetEl = null;
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { }
    if (wasDoc) docSheetClosed();
  }
  $('#backdrop').addEventListener('click', closeSheet);
  Array.from(document.querySelectorAll('[data-close]')).forEach(function (b) { b.addEventListener('click', closeSheet); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openSheetEl) { closeSheet(); return; }
    var t = e.target;
    if (openSheetEl || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || mode !== 'view') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); stepNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stepPrev(); }
    else if (e.key === ' ' && t.tagName !== 'BUTTON') { e.preventDefault(); play(); }
  });

  // ---------------- 手書き検索 ----------------
  var hwc = $('#hwc'), hctx = hwc.getContext('2d'), HW = { strokes: [], live: null, rec: null, timer: 0 };
  function hwSize() {
    var r = hwc.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    hwc.width = Math.round(r.width * dpr); hwc.height = Math.round(r.height * dpr); hwDraw();
  }
  function hwDraw() {
    hctx.clearRect(0, 0, hwc.width, hwc.height);
    var s = hwc.width / 300, ink = cssv('--ink');
    hctx.strokeStyle = ink; hctx.fillStyle = ink; hctx.lineWidth = 10 * s; hctx.lineCap = 'round'; hctx.lineJoin = 'round';
    HW.strokes.concat(HW.live ? [HW.live] : []).forEach(function (p) {
      hctx.beginPath(); hctx.moveTo(p[0][0] * s, p[0][1] * s);
      if (p.length === 1) hctx.lineTo(p[0][0] * s + 0.1, p[0][1] * s);
      for (var i = 1; i < p.length; i++) hctx.lineTo(p[i][0] * s, p[i][1] * s);
      hctx.stroke();
    });
    $('#hwPh').hidden = HW.strokes.length > 0 || !!HW.live;
  }
  function hwPt(e) { var r = hwc.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 300, (e.clientY - r.top) / r.height * 300]; }
  hwc.addEventListener('pointerdown', function (e) { e.preventDefault(); try { hwc.setPointerCapture(e.pointerId); } catch (x) { } HW.live = [hwPt(e)]; hwDraw(); });
  hwc.addEventListener('pointermove', function (e) {
    if (!HW.live) return;
    (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(function (ev) { HW.live.push(hwPt(ev)); });
    if (!HW.live.length) HW.live.push(hwPt(e));
    hwDraw();
  });
  hwc.addEventListener('pointerup', function () {
    if (!HW.live) return;
    HW.strokes.push(HW.live); HW.live = null; hwDraw();
    clearTimeout(HW.timer); HW.timer = setTimeout(hwRecognize, 60);
  });
  hwc.addEventListener('pointercancel', function () { HW.live = null; hwDraw(); });
  function ensureRec() {
    if (!HW.rec) HW.rec = new KRecog.Recognizer(ALL.map(function (k) { return { c: k.c, paths: k.paths, w: k.g === 10 ? 0.015 : k.g === 11 ? 0.03 : 0 }; }));
    return HW.rec;
  }
  function hwRecognize() {
    var box = $('#cands');
    if (!HW.strokes.length) { box.innerHTML = '<span class="empty">書くと候補が出ます</span>'; return; }
    var res = ensureRec().recognize(HW.strokes, 300, 12);
    box.innerHTML = '';
    res.forEach(function (r) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = r.c; b.setAttribute('aria-label', r.c + 'を開く');
      b.addEventListener('click', function () { closeSheet(); HW.strokes = []; hwDraw(); hwRecognize(); load(r.c); scrollToStage(); });
      box.appendChild(b);
    });
  }
  $('#hwBtn').addEventListener('click', function () { results.hidden = true; openSheet($('#hwSheet')); requestAnimationFrame(hwSize); setTimeout(ensureRec, 30); });
  $('#hwUndo').addEventListener('click', function () { HW.strokes.pop(); hwDraw(); hwRecognize(); });
  $('#hwClear').addEventListener('click', function () { HW.strokes = []; hwDraw(); hwRecognize(); });

  // ---------------- 音声検索 ----------------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, recog = null;
  var MIC_ICON = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';
  function stopRec() { if (recog) { try { recog.abort(); } catch (e) { } recog = null; } }
  function micFallback(why) {
    stopRec();
    var head = why === 'perm' ? 'マイクが使えません（ブラウザの設定でマイクを許可してください）。'
      : why === 'net' ? '🎤 はネットにつながっているときに使えます。'
      : 'このブラウザでは 🎤 で聞き取れません。';
    $('#micState').innerHTML = '<div class="mic-dot" style="opacity:.5">' + MIC_ICON + '</div>' +
      '<p class="note">' + head + 'かわりに<b>キーボードの音声入力</b>を使えます。下のボタンで検索欄を開き、キーボードのマイクをタップして「やま」「海」のように話してください。</p>' +
      '<button class="btn pri" id="micToInput" type="button">検索欄で音声入力する</button>';
    $('#micCands').innerHTML = '';
    $('#micToInput').addEventListener('click', function () { closeSheet(); q.value = ''; q.focus(); });
  }
  function micListen() {
    if (!SR) { micFallback(); return; }
    stopRec();
    try { recog = new SR(); } catch (e) { micFallback(); return; }
    recog.lang = 'ja-JP'; recog.interimResults = true; recog.maxAlternatives = 5; recog.continuous = false;
    $('#micState').innerHTML = '<div class="mic-dot live">' + MIC_ICON + '</div><div class="transcript" id="micText"></div><p class="note">「やま」「さくら」「海の字」のように話してください。</p><p class="note small">声はブラウザの音声認識（Google・Apple など）で文字にします。</p>';
    $('#micCands').innerHTML = '';
    var finalAlts = [], heard = false;
    recog.onresult = function (e) {
      heard = true;
      var txt = '';
      for (var i = 0; i < e.results.length; i++) {
        txt += e.results[i][0].transcript;
        if (e.results[i].isFinal) for (var a = 0; a < e.results[i].length; a++) finalAlts.push(e.results[i][a].transcript);
      }
      var mt = $('#micText'); if (mt) mt.textContent = txt;
    };
    recog.onerror = function (e) {
      var r = recog; recog = null;
      if (/not-allowed|service-not-allowed|audio-capture/.test(e.error)) micFallback('perm');
      else if (e.error === 'network') micFallback('net');
      else if (e.error === 'language-not-supported') micFallback();
      else if (e.error === 'no-speech') micRetry('聞き取れませんでした。もう一度話してください。');
    };
    recog.onend = function () {
      if (!recog) return;
      recog = null;
      if (finalAlts.length) micResults(finalAlts);
      else if (!heard) micRetry('聞き取れませんでした。もう一度話してください。');
    };
    try { recog.start(); } catch (e) { micFallback(); }
  }
  function micRetry(msg) {
    $('#micState').innerHTML = '<div class="mic-dot">' + MIC_ICON + '</div><p class="note">' + esc(msg) + '</p><button class="btn pri" id="micAgain" type="button">もう一度話す</button>';
    $('#micAgain').addEventListener('click', micListen);
  }
  function micResults(alts) {
    var seen = [], list = [];
    alts.forEach(function (t) {
      t = t.replace(/(という|って|の)(漢字|字)/g, '');
      Array.from(t).forEach(function (ch) { var c = ALIAS[ch] || ch; if (isKanji(c) && K.has(c) && seen.indexOf(c) < 0) { seen.push(c); list.push(K.get(c)); } });
    });
    if (!list.length) {   // 「ひらがなのあ」「カタカナのア」（v558）
      var km = alts.map(function (t) { return t.match(/(ひらがな|平仮名|カタカナ|片仮名)の?\s*([ぁ-ゖァ-ヺー])/); }).filter(Boolean)[0];
      if (km) {
        var hira = /ひらがな|平仮名/.test(km[1]), cc = km[2], isH = /[ぁ-ゖ]/.test(cc), kk = K.get(hira === isH ? cc : kanaPair(cc) || cc);
        if (kk) list = [kk];
      }
    }
    if (!list.length) { var r = search(alts[0]); if (r) list = r.list.slice(0, 30); }
    $('#micState').innerHTML = '<div class="transcript">' + esc(alts[0]) + '</div><button class="btn" id="micAgain" type="button">もう一度話す</button>';
    $('#micAgain').addEventListener('click', micListen);
    var box = $('#micCands'); box.innerHTML = '';
    if (!list.length) { box.innerHTML = '<span class="empty">字が見つかりませんでした。</span>'; return; }
    list.forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = k.c;
      b.addEventListener('click', function () { closeSheet(); load(k.c); scrollToStage(); });
      box.appendChild(b);
    });
    if (list.length === 1) { closeSheet(); load(list[0].c); scrollToStage(); }
  }
  $('#micBtn').addEventListener('click', function () { results.hidden = true; openSheet($('#micSheet')); micListen(); });

  // ---------------- 操作 ----------------
  $('#bPlay').addEventListener('click', play);
  $('#bNext').addEventListener('click', stepNext);
  $('#bPrev').addEventListener('click', stepPrev);
  $('#bReset').addEventListener('click', function () { reset(); });
  function syncSpeed() { var b = $('#bSpeed'); b.textContent = SPEEDS[opt.speed].n; b.setAttribute('aria-label', '速さ：' + SPEEDS[opt.speed].n); }
  $('#bSpeed').addEventListener('click', function () { opt.speed = (opt.speed + 1) % 3; store.set('speed', opt.speed); syncSpeed(); });
  function toggle(id, key) {
    var b = $(id); b.setAttribute('aria-pressed', opt[key] ? 'true' : 'false');
    b.addEventListener('click', function () { opt[key] = !opt[key]; store.set(key, opt[key]); b.setAttribute('aria-pressed', opt[key] ? 'true' : 'false'); if (!P.anim) refresh(); else lGhost.style.display = opt.ghost ? '' : 'none'; });
  }
  toggle('#oNums', 'nums'); toggle('#oGhost', 'ghost'); toggle('#oLoop', 'loop');
  $('#modeView').addEventListener('click', function () { if (mode !== 'view') setMode('view'); });
  $('#modePractice').addEventListener('click', function () { if (mode !== 'practice') setMode('practice'); });
  $('#modeDoc').addEventListener('click', function () { if (mode !== 'doc') setMode('doc'); else openDocSheet(); });
  $('#kPrev').addEventListener('click', function () { load(ORDER[(cur.o - 1 + ORDER.length) % ORDER.length].c); });
  $('#kNext').addEventListener('click', function () { load(ORDER[(cur.o + 1) % ORDER.length].c); });
  $('#kRand').addEventListener('click', function () { load(ORDER[Math.floor(Math.random() * ORDER.length)].c); });
  window.addEventListener('resize', function () { if (mode !== 'view') sizePC(); if (openSheetEl === $('#hwSheet')) hwSize(); });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { drawPC(); hwDraw(); }); } catch (e) { }
  try { new MutationObserver(function () { drawPC(); hwDraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }

  // ---------------- 表電卓へ戻る ----------------
  var bh = $('#backHyo');
  bh.hidden = !fromHyo; document.body.classList.toggle('from-hyo', fromHyo);
  bh.addEventListener('click', function () { BackGuard.home('../' + (location.protocol === 'file:' ? 'index.html' : '')); });
  // 戻るの見張り（backguard.js。v535）：手書き・声の窓は端末の「戻る」で窓だけ閉じる。何も開いていないときは
  // 一度知らせてから表電卓へ（なぞり練習で画面の端をなぞったときなどに、急に表電卓へ戻らないように）
  BackGuard.setup({ app: 'kakijun', fromHyo: fromHyo });
  BackGuard.watch('.sheet', function (s) { return !s.hidden; }, function () { $('#backdrop').click(); });

  // ---------------- 起動 ----------------
  if (!ALL.length) { $('#capTip').textContent = '字のデータを読み込めませんでした。ページを開き直してください。'; return; }
  syncSpeed(); syncLv(); buildRules(); buildTabs();
  var start = '永';
  var hm = (location.hash || '').match(/^#u([0-9a-f]{4,5})$/i);
  if (hm) { var ch = String.fromCodePoint(parseInt(hm[1], 16)); if (K.has(ch)) start = ch; }
  cur = K.get(start);
  showTab(tabOf(cur));
  load(start, { full: true, delay: 900 });
  setTimeout(function () { try { ensureRec(); } catch (e) { } }, 2500);

  // オフラインでも使えるように（このフォルダの分だけを控える）
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('service-worker.js').catch(function () { }); });

  // テスト用
  window.KKJ_APP = {
    load: load, search: search, analyze: analyze, setMode: setMode, micResults: micResults, NKAN: NKAN, showTab: function (t) { showTab(t); }, recognize: function (s, f, n) { return ensureRec().recognize(s, f || 300, n || 12); },
    cur: function () { return cur; }, mode: function () { return mode; }, P: function () { return P; }, PR: function () { return PR; }, K: K, ALL: ALL, geo: geo,
    strokeTips: strokeTips, sayText: sayText, kakuYomi: kakuYomi, kinfo: kinfo, sinfo: sinfo, ORDER: ORDER,
    DOCS: DOCS, docOk: docOk, doc: function () { return DOC; }, docStart: docStart, docGo: docGo, openDocSheet: openDocSheet
  };
})();

