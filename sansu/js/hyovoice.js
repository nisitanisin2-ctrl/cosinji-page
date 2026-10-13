/* ════════════════════════════════════════════════════════════════
   🔈 読み上げの声（表電卓 v540。表電卓・声の計算帳・かきじゅん帳・英単語・算数・メモに、同じものを1つずつ置く）
   どの道具でも同じ声で読むように、声の設定を1か所（localStorage の hyo_voice）にまとめる。
   同じサイトの中なので、表電卓で決めた声を、声の計算帳やかきじゅん帳でもそのまま使える。
   ・日本語の声・英語の声（英単語）・読む速さ・声の高さ・音の大きさ
   ・はじめて使うときは、声の計算帳で決めていた声（koe_settings）を引きつぐ
   使い方：HyoVoice.speak(文, {lang:'ja'|'en', rate:その道具の速さ, keepRate:true…, onend})
          HyoVoice.apply(SpeechSynthesisUtterance, {lang, rate, keepRate}) … 自分で読むとき、声と速さ・高さ・大きさを当てる
          HyoVoice.ui(要素) … 設定の画面（声をえらぶ・速さ・高さ・大きさ・テスト再生）をその中に作る
          HyoVoice.get() / set({...}) / onchange(関数)
   速さ：日本語は「その道具の速さ × ここで決めた速さ」。英単語のように道具の中で速さを選ぶものは keepRate で道具の速さのまま
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.HyoVoice) return;
  var KEY = 'hyo_voice';
  var TTS = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function';
  var listeners = [];
  function num(v, lo, hi, d) { v = +v; return isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v * 10) / 10)) : d; }
  function norm(o) {
    o = o || {};
    return { ja: typeof o.ja === 'string' ? o.ja : '', en: typeof o.en === 'string' ? o.en : '',
      rate: num(o.rate, 0.5, 2, 1), pitch: num(o.pitch, 0.5, 2, 1), vol: num(o.vol, 0, 1, 1) };
  }
  function read() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') return norm(o); } catch (e) { }
    // はじめて：声の計算帳で決めていた声・速さ・高さ・大きさを引きつぐ
    try {
      var k = JSON.parse(localStorage.getItem('koe_settings') || 'null');
      if (k && typeof k === 'object' && (k.voice || k.rate != null || k.pitch != null || k.vol != null)) {
        var m = norm({ ja: k.voice || '', rate: k.rate, pitch: k.pitch, vol: k.vol });
        try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { }
        return m;
      }
    } catch (e) { }
    return norm({});
  }
  var S = read();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  // 変わったことを知らせる（false を返した見張りは外す：閉じて消えた設定の画面など）
  function fire() { listeners = listeners.filter(function (f) { try { return f(get()) !== false; } catch (e) { return true; } }); }
  function get() { return { ja: S.ja, en: S.en, rate: S.rate, pitch: S.pitch, vol: S.vol }; }
  function set(p) { S = norm(Object.assign({}, S, p || {})); save(); fire(); return get(); }
  // ほかの画面（別のタブ・別の道具）で変えたとき
  window.addEventListener('storage', function (e) { if (e.key === KEY) { S = read(); fire(); } });

  /* ── 声をえらぶ ── */
  function voices() { if (!TTS) return []; try { return speechSynthesis.getVoices() || []; } catch (e) { return []; } }
  function list(lang) {
    var re = lang === 'en' ? /^en([-_]|$)/i : /^ja([-_]|$)/i;
    return voices().filter(function (v) { return re.test(v.lang || ''); });
  }
  // えらんだ声（なければ、その言葉の声から。英語はアメリカの声を先に）
  function pick(lang) {
    lang = lang === 'en' ? 'en' : 'ja';
    var c = list(lang), want = S[lang];
    var v = want ? c.filter(function (x) { return x.voiceURI === want; })[0] : null;
    if (v) return v;
    if (lang === 'en') {
      return c.filter(function (x) { return /en[-_]US/i.test(x.lang) && /google|samantha|aria|jenny|natural/i.test(x.name); })[0]
        || c.filter(function (x) { return /en[-_]US/i.test(x.lang); })[0] || c[0] || null;
    }
    return c[0] || null;
  }
  // 読む文に、声・速さ・高さ・大きさを当てる
  function apply(u, o) {
    o = o || {};
    var lang = o.lang === 'en' ? 'en' : 'ja';
    u.lang = lang === 'en' ? 'en-US' : 'ja-JP';
    var v = pick(lang); if (v) { u.voice = v; if (v.lang) u.lang = v.lang; }
    var base = +o.rate || 1;
    u.rate = Math.min(4, Math.max(0.1, o.keepRate ? base : base * S.rate));
    u.pitch = S.pitch; u.volume = S.vol;
    return u;
  }
  function speak(text, o) {
    o = o || {};
    if (!TTS || !text) { if (o.onend) setTimeout(o.onend, 0); return null; }
    try {
      if (!o.queue) speechSynthesis.cancel();
      var u = apply(new SpeechSynthesisUtterance(String(text)), o);
      if (o.onend) { u.onend = o.onend; u.onerror = o.onend; }
      speechSynthesis.speak(u);
      return u;
    } catch (e) { if (o.onend) setTimeout(o.onend, 0); return null; }
  }
  function cancel() { if (TTS) { try { speechSynthesis.cancel(); } catch (e) { } } }
  if (TTS) { try { speechSynthesis.addEventListener('voiceschanged', function () { fire(); }); } catch (e) { } }

  /* ── 設定の画面（どの道具でも同じもの） ── */
  var CSS = '.hv{display:grid;gap:8px}.hv-l{display:block;font-size:13px;font-weight:700}.hv-l select{display:block;width:100%;box-sizing:border-box;margin-top:4px;'
    + 'min-height:40px;padding:6px 8px;font-size:15px;border:1px solid var(--line,#ccc);border-radius:10px;background:var(--card,var(--sheet,#fff));color:inherit}'
    + '.hv-eng{font-size:12px;opacity:.75;margin-top:-2px}.hv-row{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700}.hv-row b{font-variant-numeric:tabular-nums}'
    + '.hv-row button{margin-left:auto;font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid var(--line,#ccc);background:transparent;color:inherit;cursor:pointer}'
    + '.hv-sl{display:flex;align-items:center;gap:8px;font-size:12px;opacity:.9}.hv-sl input{flex:1;min-width:0}'
    + '.hv-test{width:100%;box-sizing:border-box;min-height:40px;padding:6px 10px;font-size:15px;border:1px solid var(--line,#ccc);border-radius:10px;background:var(--card,var(--sheet,#fff));color:inherit}'
    + '.hv-btns{display:flex;gap:8px;flex-wrap:wrap}.hv-btns button{flex:1;min-height:42px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--card,var(--sheet,#fff));color:inherit;font-weight:700;font-size:14px;cursor:pointer}'
    + '.hv-note{font-size:12px;line-height:1.6;opacity:.8;margin:0}';
  function addCss() {
    if (document.getElementById('hv-style')) return;
    var st = document.createElement('style'); st.id = 'hv-style'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
  }
  var LAB = { rate: ['読む速さ', '遅い', '速い', 0.5, 2], pitch: ['声の高さ', '低い', '高い', 0.5, 2], vol: ['音の大きさ', '小さい', '大きい', 0, 1] };
  var SAY = { rate: 'この速さで読みます', pitch: 'この高さで読みます', vol: 'この大きさで読みます' };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function ui(box, o) {
    if (!box) return;
    o = o || {};
    addCss();
    box.innerHTML = '';
    var root = el('div', 'hv'); box.appendChild(root);
    if (!TTS) { root.appendChild(el('p', 'hv-note', 'この端末・ブラウザでは読み上げを使えません。')); return; }
    var sel = {};
    ['ja', 'en'].forEach(function (lang) {
      var l = el('label', 'hv-l', lang === 'ja' ? '日本語の声' : '英語の声（📚 英単語）');
      var s = el('select'); s.setAttribute('data-hv', lang); s.setAttribute('aria-label', lang === 'ja' ? '日本語の声' : '英語の声');
      s.addEventListener('change', function () { var p = {}; p[lang] = s.value; set(p); speak(lang === 'ja' ? 'この声で読みます' : 'I will read with this voice.', { lang: lang }); });
      l.appendChild(s); root.appendChild(l); sel[lang] = s;
    });
    var eng = el('div', 'hv-eng'); root.appendChild(eng);
    var rng = {}, val = {};
    Object.keys(LAB).forEach(function (k) {
      var L = LAB[k], row = el('div', 'hv-row', L[0] + ' '), b = el('b'), rs = el('button', '', 'リセット');
      rs.type = 'button'; rs.setAttribute('aria-label', L[0] + 'をもとにもどす');
      row.appendChild(b); row.appendChild(rs); root.appendChild(row);
      var sl = el('div', 'hv-sl'), r = el('input');
      r.type = 'range'; r.min = L[3]; r.max = L[4]; r.step = '0.1'; r.setAttribute('data-hv', k); r.setAttribute('aria-label', L[0]);
      sl.appendChild(el('span', '', L[1])); sl.appendChild(r); sl.appendChild(el('span', '', L[2])); root.appendChild(sl);
      r.addEventListener('input', function () { var p = {}; p[k] = r.value; set(p); });
      r.addEventListener('change', function () { speak(SAY[k], { lang: 'ja' }); });
      rs.addEventListener('click', function () { var p = {}; p[k] = 1; set(p); speak(SAY[k], { lang: 'ja' }); });
      rng[k] = r; val[k] = b;
    });
    var t = el('input', 'hv-test'); t.value = o.test || '1280円を3つで、3840円です'; t.setAttribute('aria-label', 'テストで読む言葉'); root.appendChild(t);
    var bs = el('div', 'hv-btns'), pj = el('button', '', '▶ 日本語で試す'), pe = el('button', '', '▶ 英語で試す');
    pj.type = pe.type = 'button';
    pj.addEventListener('click', function () { speak((t.value || '').trim() || '1280円を3つで、3840円です', { lang: 'ja' }); });
    pe.addEventListener('click', function () { speak('Nice to meet you. How are you today?', { lang: 'en' }); });
    bs.appendChild(pj); bs.appendChild(pe); root.appendChild(bs);
    root.appendChild(el('p', 'hv-note', 'ここで決めた声は、表電卓・🎙 声の計算帳・✍️ かきじゅん帳・📚 英単語・🎓 算数・📄 メモで同じになります（英単語の速さは、英単語の中で選びます）。'
      + '読み上げの仕組み（エンジン）は端末の設定で変えます（Android：設定 → システム → 言語と入力 → 音声出力／iPhone：設定 → アクセシビリティ → 読み上げコンテンツ → 声）。入れた声が出ないときは、開き直してください。'));
    function opt(v, i) { var x = el('option', '', String(i + 1).padStart(2, '0') + '_' + v.name + ' (' + v.lang + ')' + (v.localService === false ? ' ・ネット' : '')); x.value = v.voiceURI; return x; }
    function draw() {
      ['ja', 'en'].forEach(function (lang) {
        var s = sel[lang], vs = list(lang);
        s.innerHTML = '';
        var d = el('option', '', lang === 'ja' ? 'おまかせ（日本語の声）' : 'おまかせ（英語の声）'); d.value = ''; s.appendChild(d);
        vs.forEach(function (v, i) { s.appendChild(opt(v, i)); });
        s.value = vs.some(function (v) { return v.voiceURI === S[lang]; }) ? S[lang] : '';
      });
      var cj = pick('ja');
      eng.textContent = cj ? 'いまの日本語の声：' + cj.name + (cj.localService === false ? '（インターネットを使う声）' : '（端末の中の声）')
        : '日本語の声が見つかりません（端末の設定で日本語の音声データを入れてください）';
      Object.keys(LAB).forEach(function (k) { if (document.activeElement !== rng[k]) rng[k].value = S[k]; val[k].textContent = (+S[k]).toFixed(1); });
    }
    draw();
    onchange(function () { if (!root.isConnected) return false; draw(); });
  }
  function onchange(f) { if (typeof f === 'function') listeners.push(f); }

  window.HyoVoice = { get: get, set: set, speak: speak, apply: apply, cancel: cancel, pick: pick, voices: list, ui: ui, onchange: onchange, available: TTS, KEY: KEY };
})();
