/* ✍️かきじゅん帳（表電卓 v532）：常用漢字2136字の書き順アニメーション・綺麗に書くコツ・なぞり練習。
   字は漢字・よみ・画数のほか、✏️ 手書き・🎤 声でも探せる。データは js/data.js、手書きの照合は js/recog.js */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  // 表電卓から開いたとき（#from=hyo）は、左上に「← 表電卓」を出す（iPhone には画面に「戻る」がないため）
  var fromHyo = false;
  try {
    if (/from=hyo/.test(location.hash)) { sessionStorage.setItem('kkj_from_hyo', '1'); history.replaceState(null, '', location.pathname + location.search); }
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
  var RAW = Array.isArray(window.KKJ_DATA) ? window.KKJ_DATA : [];
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
    o.rd = rd;
    o.key = rd[0] || '';
    K.set(o.c, o);
    return o;
  });
  var ALIAS = { '\u{20B9F}': '叱', '剝': '剥', '頬': '頰', '填': '塡' };
  var GRADE = { 1: '小学1年', 2: '小学2年', 3: '小学3年', 4: '小学4年', 5: '小学5年', 6: '小学6年', 7: '中学以降' };
  // 学年順・各学年は50音順
  var ORDER = ALL.slice().sort(function (a, b) { return a.g - b.g || a.key.localeCompare(b.key, 'ja') || a.i - b.i; });
  ORDER.forEach(function (k, i) { k.o = i; });
  var isKanji = function (ch) { return /[㐀-鿿豈-﫿\u{20000}-\u{2ffff}]/u.test(ch); };

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
    var raw = k.types[i] || '', b = raw.split('/')[0].charAt(0), t = T[b], g = geo(k);
    if (b === '㇑' && g.len[i] < 21 && g.polys[i][0][1] < 34) t = T.dotv;
    return t ? { name: t[0], end: t[1], tip: t[2], base: b } : { name: '線', end: '', tip: '', base: b };
  }
  function pname(pos, e) { var t = PN[pos] && PN[pos][e]; return t ? e + '（' + t + '）' : e; }
  function qq(s) { return '<q>' + esc(s) + '</q>'; }

  // ---------------- 綺麗に書くコツ（データから組み立て） ----------------
  function analyze(k) {
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
    } else if (KA.length && C.some(function (c) { return c[1] !== 'kamae' && c[0]; })) {
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
    return { layout: layout, formula: formula, tips: tips.slice(0, 7) };
  }

  // ---------------- 状態 ----------------
  var cur = null, mode = 'view';
  var opt = { nums: store.get('nums', true), ghost: store.get('ghost', true), loop: store.get('loop', false), speed: store.get('speed', 1) };
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
  function renderInfo() {
    var k = cur;
    $('#big').textContent = k.c;
    var meta = $('#meta'); meta.innerHTML = '';
    var tg = function (t, cls) { var s = document.createElement('span'); s.className = 'tag' + (cls ? ' ' + cls : ''); s.textContent = t; meta.appendChild(s); };
    tg(GRADE[k.g], 'g'); tg(k.n + '画');
    if (k.rad) tg('部首（目安）' + k.rad);
    var y = $('#yomi'); y.innerHTML = '';
    var add = function (lab, html) { if (!html) return; var dt = document.createElement('dt'); dt.textContent = lab; var dd = document.createElement('dd'); dd.innerHTML = html; y.appendChild(dt); y.appendChild(dd); };
    add('音', k.on.slice(0, 6).map(esc).join('<span class="sep">・</span>'));
    add('訓', k.kun.slice(0, 8).map(function (r) {
      var pre = r.charAt(0) === '-' ? '〜' : '', post = r.charAt(r.length - 1) === '-' ? '〜' : '';
      var s = r.replace(/-/g, ''), i = s.indexOf('.');
      return pre + (i > 0 ? esc(s.slice(0, i)) + '<span class="okuri">' + esc(s.slice(i + 1)) + '</span>' : esc(s)) + post;
    }).join('<span class="sep">・</span>'));
    var an = analyze(k);
    $('#parts').innerHTML = an.formula ? '組み立て：' + (an.layout ? '<b>' + an.layout + '</b>　' : '') + esc(an.formula) : '';
    $('#parts').hidden = !an.formula;
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
  var TABS = [['1', '1年'], ['2', '2年'], ['3', '3年'], ['4', '4年'], ['5', '5年'], ['6', '6年'], ['7', '中学以降'], ['r', '最近見た']];
  var curTab = null;
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
    var list = t === 'r' ? store.get('recent', []).map(function (c) { return K.get(c); }).filter(Boolean) : ORDER.filter(function (k) { return String(k.g) === t; });
    var grid = $('#kgrid'); grid.innerHTML = '';
    $('#gridCount').textContent = t === 'r' ? '' : (GRADE[t] + '・' + list.length + '字');
    if (!list.length) { var e = document.createElement('p'); e.className = 'empty'; e.textContent = 'まだありません。字を開くとここに並びます。'; grid.appendChild(e); return; }
    var frag = document.createDocumentFragment();
    list.forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = k.c; b.dataset.c = k.c;
      b.setAttribute('aria-label', k.c + '（' + (k.rd[0] || '') + '）');
      if (cur && k.c === cur.c) b.setAttribute('aria-current', 'true');
      frag.appendChild(b);
    });
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
    if (curTab && curTab !== 'r') { if (String(k.g) !== curTab) showTab(String(k.g)); else markGrid(); }
    var rc = store.get('recent', []).filter(function (x) { return x !== c; }); rc.unshift(c); store.set('recent', rc.slice(0, 40));
    if (curTab === 'r') showTab('r');
    try { history.replaceState(null, '', '#u' + c.codePointAt(0).toString(16)); } catch (e) { }
    document.title = 'かきじゅん帳';
    if (mode === 'practice') { prStart(); return; }
    P.k = o.full ? k.n : 0;
    refresh();
    if (o.autoplay !== false) { P.playing = true; setPlayIcon(); P.timer = setTimeout(function () { P.k = 0; refresh(); P.playing = true; setPlayIcon(); P.timer = setTimeout(function () { startStroke(0); }, 200); }, o.delay || 250); }
  }

  // ---------------- モード切替 ----------------
  function setMode(m) {
    mode = m;
    $('#modeView').setAttribute('aria-selected', m === 'view' ? 'true' : 'false');
    $('#modePractice').setAttribute('aria-selected', m === 'practice' ? 'true' : 'false');
    $('#viewUI').hidden = m !== 'view';
    $('#practiceUI').hidden = m !== 'practice';
    $('#pc').hidden = m !== 'practice';
    stopPlayer();
    if (m === 'practice') prStart();
    else {
      lOverlay.innerHTML = ''; lMaru.innerHTML = ''; lInk.style.display = ''; P.k = cur.n; refresh();
    }
  }

  // ---------------- 練習モード ----------------
  var pc = $('#pc'), pctx = pc.getContext('2d');
  var PR = { lv: store.get('lv', 1), i: 0, done: [], live: null, miss: 0, missCur: 0, scores: [], fin: false, hint: false, flash: null, fit: null, over: false };
  function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#000'; }
  function prStart() {
    PR.i = 0; PR.done = []; PR.live = null; PR.miss = 0; PR.missCur = 0; PR.scores = []; PR.fin = false; PR.hint = false; PR.flash = null; PR.fit = null; PR.over = false;
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
  function prMsg(html, bad) {
    var m = $('#prMsg');
    var s = sinfo(cur, PR.i);
    m.className = 'pr-msg' + (bad ? ' bad' : '');
    m.innerHTML = '<span class="pr-count"><em>' + (PR.i + 1) + '</em>/' + cur.n + '</span><span>' + (html || ((PR.i + 1) + '画目は「' + esc(s.name) + '」。' + (PR.lv === 1 ? '色のついた線を●からなぞりましょう。' : PR.lv === 2 ? '●の位置から書きましょう。' : '覚えた書き順で書きましょう。'))) + '</span>';
  }
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
    if (PR.fin || mode !== 'practice') return;
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
      var s = sinfo(cur, PR.i);
      prMsg((r.score >= 90 ? 'きれい！ ' : r.score >= 75 ? 'いいですね。' : 'OK。') + '次は' + (PR.i + 1) + '画目「' + esc(s.name) + '」。');
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
    var short = L < 16, ok;
    if (short) {
      var cu = [0, 0], cr = [0, 0];
      for (var k = 0; k < N; k++) { cu[0] += u[k][0] / N; cu[1] += u[k][1] / N; cr[0] += r[k][0] / N; cr[1] += r[k][1] / N; }
      ok = Math.hypot(cu[0] - cr[0], cu[1] - cr[1]) < tol && uLen < Math.max(30, L * 3);
      fwd = Math.min(fwd, rev);
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
    if (!PR.done.length) return;
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
      PR.lv = +b.dataset.lv; store.set('lv', PR.lv);
      Array.from(document.querySelectorAll('#practiceUI [data-lv]')).forEach(function (x) { var on = x === b; x.setAttribute('aria-checked', on); x.setAttribute('aria-selected', on); });
      prStart();
    });
  });
  function syncLv() { Array.from(document.querySelectorAll('#practiceUI [data-lv]')).forEach(function (x) { var on = +x.dataset.lv === PR.lv; x.setAttribute('aria-checked', on); x.setAttribute('aria-selected', on); }); }

  // ---------------- 検索 ----------------
  var q = $('#q'), results = $('#results');
  function search(s) {
    s = s.trim(); if (!s) return null;
    var z = s.replace(/[０-９]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0xFEE0); });
    var m = z.match(/^(\d{1,2})\s*(画|かく)?$/);
    if (m) { var n = +m[1], l = ALL.filter(function (k) { return k.n === n; }); return { list: l, msg: l.length ? n + '画の漢字（' + l.length + '字）' : n + '画の常用漢字はありません。' }; }
    var chars = Array.from(s), hit = [], nj = [];
    chars.forEach(function (ch) {
      if (!isKanji(ch)) return;
      var c = ALIAS[ch] || ch;
      if (K.has(c)) { if (hit.indexOf(c) < 0) hit.push(c); } else if (nj.indexOf(ch) < 0) nj.push(ch);
    });
    if (hit.length || nj.length) return { list: hit.map(function (c) { return K.get(c); }), msg: nj.length ? '「' + nj.join('') + '」は常用漢字ではないため、書き順データがありません。' : '' };
    var h = kata2hira(s).replace(/[\s　、。・.]/g, '');
    if (/^[ぁ-ゖ]+$/.test(h)) {
      var ex = [], pre = [];
      ALL.forEach(function (k) {
        if (k.rd.indexOf(h) >= 0) ex.push(k);
        else if (k.rd.some(function (r) { return r.indexOf(h) === 0; })) pre.push(k);
      });
      var l2 = ex.concat(pre);
      return { list: l2, msg: l2.length ? '「' + h + '」と読む漢字' + (ex.length ? '（' + ex.length + '字）' : '') + (pre.length ? '・「' + h + '…」で始まる読み（' + pre.length + '字）' : '') : '「' + h + '」と読む常用漢字は見つかりませんでした。' };
    }
    return { list: [], msg: '見つかりませんでした。漢字・ひらがな・画数（例：5画）で探せます。' };
  }
  function showResults(r) {
    if (!r) { results.hidden = true; return; }
    results.innerHTML = '';
    if (r.msg) { var p = document.createElement('p'); p.className = 'hint'; p.textContent = r.msg; results.appendChild(p); }
    if (r.list.length) {
      var g = document.createElement('div'); g.className = 'res-grid';
      r.list.slice(0, 120).forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'res-item'; b.dataset.c = k.c;
        b.innerHTML = '<b>' + esc(k.c) + '</b><small>' + esc(k.rd[0] || '') + '・' + k.n + '画</small>';
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
    openSheetEl.hidden = true; $('#backdrop').hidden = true; openSheetEl = null;
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { }
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
    if (!HW.rec) HW.rec = new KRecog.Recognizer(ALL.map(function (k) { return { c: k.c, paths: k.paths }; }));
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
      Array.from(t).forEach(function (ch) { var c = ALIAS[ch] || ch; if (K.has(c) && seen.indexOf(c) < 0) { seen.push(c); list.push(K.get(c)); } });
    });
    if (!list.length) { var r = search(alts[0]); if (r) list = r.list.slice(0, 30); }
    $('#micState').innerHTML = '<div class="transcript">' + esc(alts[0]) + '</div><button class="btn" id="micAgain" type="button">もう一度話す</button>';
    $('#micAgain').addEventListener('click', micListen);
    var box = $('#micCands'); box.innerHTML = '';
    if (!list.length) { box.innerHTML = '<span class="empty">常用漢字が見つかりませんでした。</span>'; return; }
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
  $('#kPrev').addEventListener('click', function () { load(ORDER[(cur.o - 1 + ORDER.length) % ORDER.length].c); });
  $('#kNext').addEventListener('click', function () { load(ORDER[(cur.o + 1) % ORDER.length].c); });
  $('#kRand').addEventListener('click', function () { load(ORDER[Math.floor(Math.random() * ORDER.length)].c); });
  window.addEventListener('resize', function () { if (mode === 'practice') sizePC(); if (openSheetEl === $('#hwSheet')) hwSize(); });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { drawPC(); hwDraw(); }); } catch (e) { }
  try { new MutationObserver(function () { drawPC(); hwDraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }

  // ---------------- 表電卓へ戻る ----------------
  var bh = $('#backHyo');
  bh.hidden = !fromHyo; document.body.classList.toggle('from-hyo', fromHyo);
  bh.addEventListener('click', function () {
    if (fromHyo && history.length > 1) { history.back(); return; }
    location.href = '../' + (location.protocol === 'file:' ? 'index.html' : '');
  });

  // ---------------- 起動 ----------------
  if (!ALL.length) { $('#capTip').textContent = '字のデータを読み込めませんでした。ページを開き直してください。'; return; }
  syncSpeed(); syncLv(); buildRules(); buildTabs();
  var start = '永';
  var hm = (location.hash || '').match(/^#u([0-9a-f]{4,5})$/i);
  if (hm) { var ch = String.fromCodePoint(parseInt(hm[1], 16)); if (K.has(ch)) start = ch; }
  cur = K.get(start);
  showTab(String(cur.g));
  load(start, { full: true, delay: 900 });
  setTimeout(function () { try { ensureRec(); } catch (e) { } }, 2500);

  // オフラインでも使えるように（このフォルダの分だけを控える）
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('service-worker.js').catch(function () { }); });

  // テスト用
  window.KKJ_APP = {
    load: load, search: search, analyze: analyze, setMode: setMode, micResults: micResults, recognize: function (s, f, n) { return ensureRec().recognize(s, f || 300, n || 12); },
    cur: function () { return cur; }, mode: function () { return mode; }, P: function () { return P; }, PR: function () { return PR; }, K: K, ALL: ALL, geo: geo
  };
})();

