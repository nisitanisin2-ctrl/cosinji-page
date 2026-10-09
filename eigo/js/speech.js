/* ════════════════════════════════════════════════════════════════
   🎤 発音チェック（表電卓 v533）：画面に出ている英語（チャンク・単語・例文・文）を声に出すと、
   ブラウザの音声認識で聞き取って、お手本と1語ずつ比べて点数・★・直すコツを出す。
   💬 英会話（talk.js）も、ここの「聞く」「話す」「比べる」を使う。
   ・聞き取り：SpeechRecognition（en-US・候補5つ）。声はブラウザの音声認識（Google・Apple など）に送られる
   ・比べ方：大文字小文字・記号・短縮形（I'm＝I am）・数字（2＝two）・同じ音の語（to/two）はそろえてから、
     1語ずつ並べて合わせる（編集距離）。1文字ちがいは「おしい」。候補5つのうちいちばん合うものを使う
   ・点数：合った語の割合 ×（音声認識の自信の強さ）。★3＝90点〜、★2＝75点〜、★1＝50点〜
   ・長文（高校英語・日本史）は1文ずつ。いま光っている語の文から始めて ◀ ▶ で進む
   ════════════════════════════════════════════════════════════════ */
'use strict';
window.ES = (function () {
  const $ = id => document.getElementById(id);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasTTS = 'speechSynthesis' in window;

  /* ── 話す（お手本の読み上げ。英語の声をえらぶ） ── */
  let voice = null;
  function pickVoice() {
    if (!hasTTS) return;
    const vs = window.speechSynthesis.getVoices() || [];
    const en = vs.filter(v => /^en(-|_)/i.test(v.lang));
    voice = en.find(v => /en(-|_)US/i.test(v.lang) && /google|samantha|aria|jenny|natural/i.test(v.name))
      || en.find(v => /en(-|_)US/i.test(v.lang)) || en[0] || null;
  }
  if (hasTTS) { pickVoice(); try { window.speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) {} }
  function say(text, opt) {
    opt = opt || {};
    return new Promise(res => {
      if (!hasTTS || !text) { res(); return; }
      const ss = window.speechSynthesis;
      if (!opt.queue) ss.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = opt.rate || 0.92;
      if (voice) u.voice = voice;
      let done = false;
      const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, Math.min(20000, 1500 + text.length * 120 / (opt.rate || 0.92)));   // onend が来ないブラウザのため
      ss.speak(u);
    });
  }
  const hush = () => { try { if (hasTTS) window.speechSynthesis.cancel(); } catch (e) {} };

  /* ── 聞く（英語の音声認識） ── */
  let cur = null;   // いま聞いているもの
  function listen(opt) {
    opt = opt || {};
    stopListen();
    if (!SR) { if (opt.onEnd) opt.onEnd(null, 'unsupported'); return null; }
    hush();
    let r;
    try { r = new SR(); } catch (e) { if (opt.onEnd) opt.onEnd(null, 'unsupported'); return null; }
    r.lang = opt.lang || 'en-US'; r.interimResults = true; r.maxAlternatives = 5; r.continuous = false;
    const me = { r, alts: [], err: '', done: false, timer: 0 };
    cur = me;
    const finish = () => {
      if (me.done) return; me.done = true; clearTimeout(me.timer);
      if (cur === me) cur = null;
      if (opt.onEnd) opt.onEnd(me.alts.length ? { alts: me.alts } : null, me.err || (me.alts.length ? '' : 'nospeech'));
    };
    r.onresult = e => {
      let mid = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const x = e.results[i];
        if (x.isFinal) {
          const alts = [];
          for (let a = 0; a < x.length; a++) alts.push({ t: String(x[a].transcript || '').trim(), c: Number(x[a].confidence) || 0 });
          if (!me.alts.length) me.alts = alts;
          else me.alts = me.alts.map((p, a) => ({ t: (p.t + ' ' + (alts[a] ? alts[a].t : alts[0].t)).trim(), c: Math.min(p.c, (alts[a] || alts[0]).c) }));
        } else mid += x[0].transcript;
      }
      if (opt.onInterim) opt.onInterim(mid || (me.alts[0] ? me.alts[0].t : ''));
    };
    r.onerror = e => {
      const er = e && e.error;
      me.err = er === 'not-allowed' || er === 'service-not-allowed' || er === 'audio-capture' ? 'perm'
        : er === 'network' ? 'net' : er === 'no-speech' ? 'nospeech' : er === 'aborted' ? 'aborted' : (er || 'error');
    };
    r.onend = finish;
    // 止めても onend が来ないブラウザのため、止めてから3秒で終える
    const halt = () => { try { r.stop(); } catch (e) {} clearTimeout(me.timer); me.timer = setTimeout(finish, 3000); };
    me.timer = setTimeout(halt, opt.maxMs || 12000);
    try { r.start(); } catch (e) { me.err = 'error'; finish(); return null; }
    return { stop: halt };
  }
  function stopListen() { const c = cur; cur = null; if (c && !c.done) { c.done = true; clearTimeout(c.timer); try { c.r.abort(); } catch (e) {} } }
  const errMsg = e => e === 'perm' ? 'マイクが使えません。ブラウザの設定でマイクを許可してください。'
    : e === 'net' ? '🎤 はネットにつながっているときに使えます。'
    : e === 'unsupported' ? 'このブラウザでは 🎤 の聞き取りが使えません（Chrome・Edge・Safari で開いてください）。'
    : e === 'nospeech' ? '声が聞こえませんでした。マイクに近づいて、もう一度話してください。'
    : '聞き取れませんでした。もう一度話してください。';

  /* ════ 英語をそろえる（比べる前に） ════ */
  const CONTR = { "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
    "that's": 'that is', "what's": 'what is', "where's": 'where is', "who's": 'who is', "how's": 'how is', "there's": 'there is', "here's": 'here is',
    "when's": 'when is', "why's": 'why is', "let's": 'let us', "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
    "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will', "he'll": 'he will', "she'll": 'she will', "it'll": 'it will',
    "that'll": 'that will', "i'd": 'i would', "you'd": 'you would', "we'd": 'we would', "they'd": 'they would', "he'd": 'he would', "she'd": 'she would',
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'can not', "cannot": 'can not', "won't": 'will not', "wouldn't": 'would not',
    "shouldn't": 'should not', "couldn't": 'could not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
    "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not', "mustn't": 'must not', "gonna": 'going to', "wanna": 'want to', "gotta": 'got to',
    "ok": 'okay', "o'clock": 'oclock', "ma'am": 'maam', "y'all": 'you all' };
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function numWords(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numWords(n % 100) : '');
    if (n < 10000) return numWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numWords(n % 1000) : '');
    return String(n);
  }
  // 同じ音の語（聞き取りではどちらにもなるので同じとみなす）
  const SAME = {};
  [['to', 'too', 'two'], ['for', 'four'], ['there', 'their'], ['right', 'write'], ['here', 'hear'], ['see', 'sea'], ['know', 'no'], ['by', 'buy', 'bye'],
   ['one', 'won'], ['eight', 'ate'], ['your', 'youre'], ['its', 'it'], ['wear', 'where'], ['weather', 'whether'], ['meet', 'meat'], ['week', 'weak'],
   ['hour', 'our'], ['knew', 'new'], ['peace', 'piece'], ['whole', 'hole'], ['which', 'witch'], ['would', 'wood'], ['flower', 'flour'], ['mail', 'male'],
   ['okay', 'okey'], ['alright', 'all right'], ['grey', 'gray'], ['color', 'colour'], ['favorite', 'favourite'], ['center', 'centre'], ['theater', 'theatre']]
    .forEach((g, i) => g.forEach(w => { SAME[w] = i; }));
  const sameWord = (a, b) => a === b || (SAME[a] != null && SAME[a] === SAME[b]);
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const row = [i];
      for (let j = 1; j <= n; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row;
    }
    return prev[n];
  }
  const near = (a, b) => a.length >= 4 && b.length >= 3 && lev(a, b) <= 1;
  // 1つの語 → そろえた語の並び（短縮形はほどく・数字は英語に）
  function normWord(w) {
    let s = String(w).toLowerCase().replace(/[‘’`´]/g, "'").replace(/[^a-z0-9'$%&.-]/g, '');
    s = s.replace(/^[-.'$]+|[-.']+$/g, '');
    if (!s) return [];
    if (CONTR[s]) return CONTR[s].split(' ');
    if (/^\d+$/.test(s)) return numWords(Math.min(9999, parseInt(s, 10))).split(' ');
    if (/^\d+(st|nd|rd|th)$/.test(s)) return [s];
    if (/^\d+%$/.test(s)) return numWords(Math.min(9999, parseInt(s, 10))).split(' ').concat(['percent']);
    if (s === '&') return ['and'];
    return s.split(/[-.]/).flatMap(x => {
      x = x.replace(/'s$/, 's').replace(/['$%&]/g, '');
      return /^\d+$/.test(x) ? numWords(Math.min(9999, parseInt(x, 10))).split(' ') : x ? [x] : [];
    });
  }
  // 文 → 表示する語 [{w: 画面の語, t: そろえた語の並び}]
  function words(text) {
    return String(text || '').replace(/[“”"]/g, ' ').split(/\s+/).filter(Boolean)
      .map(w => ({ w, t: normWord(w) })).filter(x => x.t.length);
  }
  const tokens = text => words(text).flatMap(x => x.t);

  /* ════ 比べる：お手本の語と聞き取った語を並べて合わせる ════ */
  function align(T, H) {
    const n = T.length, m = H.length, D = [], B = [];
    for (let i = 0; i <= n; i++) { D.push(new Array(m + 1).fill(0)); B.push(new Array(m + 1).fill('')); }
    for (let i = 1; i <= n; i++) { D[i][0] = i; B[i][0] = 'del'; }
    for (let j = 1; j <= m; j++) { D[0][j] = j; B[0][j] = 'ins'; }
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
      const a = T[i - 1], b = H[j - 1];
      const c = sameWord(a, b) ? 0 : near(a, b) ? 0.5 : 1;
      let best = D[i - 1][j - 1] + c, op = c === 0 ? 'ok' : c < 1 ? 'near' : 'sub';
      if (D[i - 1][j] + 1 < best) { best = D[i - 1][j] + 1; op = 'del'; }
      if (D[i][j - 1] + 1 < best) { best = D[i][j - 1] + 1; op = 'ins'; }
      D[i][j] = best; B[i][j] = op;
    }
    const st = new Array(n).fill('del'), heard = new Array(n).fill(''); let ins = 0, i = n, j = m;
    while (i > 0 || j > 0) {
      const op = B[i][j];
      if (op === 'ok' || op === 'near' || op === 'sub') { st[i - 1] = op; heard[i - 1] = H[j - 1]; i--; j--; }
      else if (op === 'del') { st[i - 1] = 'del'; i--; }
      else { ins++; j--; }
    }
    return { st, heard, ins };
  }
  // target：お手本の英語、alts：[{t: 聞き取った英語, c: 自信 0〜1}]
  function score(target, alts) {
    const W = words(target), T = W.flatMap(x => x.t);
    let best = null;
    (alts || []).forEach(alt => {
      const H = tokens(alt.t), A = align(T, H);
      const ok = A.st.filter(s => s === 'ok').length, nr = A.st.filter(s => s === 'near').length;
      const acc = T.length ? Math.max(0, Math.min(1, (ok + 0.6 * nr) / T.length - Math.min(0.2, 0.05 * A.ins))) : 0;
      if (!best || acc > best.acc + 1e-9 || (Math.abs(acc - best.acc) < 1e-9 && alt.c > best.alt.c)) best = { acc, A, alt };
    });
    if (!best) return { score: 0, stars: 0, words: W.map(x => ({ w: x.w, st: 'del', heard: '' })), heard: '', conf: 0, tips: [] };
    const top = (alts[0] && alts[0].c) || 0, conf = best.alt.c > 0 ? best.alt.c : top > 0 ? top : null;
    const sc = Math.round(100 * best.acc * (conf != null ? 0.8 + 0.2 * Math.min(1, conf) : 1));
    // 語ごとの結果（短縮形などで2つにほどいた語は、悪いほうに合わせる）
    let k = 0;
    const out = W.map(x => {
      const ss = x.t.map(() => best.A.st[k]), hh = x.t.map(() => best.A.heard[k++]);
      const st = ss.every(s => s === 'ok') ? 'ok' : ss.every(s => s === 'ok' || s === 'near') ? 'near' : ss.some(s => s === 'sub' || s === 'near') ? 'sub' : 'del';
      return { w: x.w, st, heard: hh.filter(Boolean).join(' ') };
    });
    return { score: sc, stars: sc >= 90 ? 3 : sc >= 75 ? 2 : sc >= 50 ? 1 : 0, words: out, heard: best.alt.t, conf: conf || 0, tips: tipsFor(out) };
  }

  /* ── 直すコツ（日本語を話す人がつまずきやすい音から）
     聞きちがえた語は、お手本とちがった所（light → right なら l と r）から音をえらぶ。
     聞こえなかった語は、その語にある つまずきやすい音（th・v・f）から ── */
  const TIP = {
    th: '「th」は舌先を上下の前歯で軽くはさみ、息を出しながら言います（「ス」「ズ」「ザ」にならないように）。',
    lr: '「l」は舌先を上の前歯のうしろの歯ぐきにしっかりつけて、「r」は舌をどこにもつけずに奥へ丸めて言います。',
    v: '「v」は上の前歯を下くちびるに軽く当てて、声をふるわせます（「ブ」にならないように）。',
    f: '「f」は上の前歯を下くちびるに当てて、息だけを強く出します（日本語の「フ」より、こすれる音）。',
    w: '「w」は唇を丸く前に突き出してから言います（would・woman・work など）。',
    end: '語の最後の音（-ng・-t・-d・-s など）まで、軽く ていねいに言い切ります。',
    vow: '最後の子音のあとに「ウ」「オ」を足さないように（good は「グッド」ではなく「グッ(d)」と軽く止めます）。',
    si: '「si」は「シ」ではなく「スィ」。舌先を上の歯ぐきに近づけて言います（sit・city・see）。',
    long: '長い語は、強く言う所（アクセント）を1つ決めて、そこをはっきり高く長めに言います。',
  };
  function tipsFor(ws) {
    const bad = ws.filter(x => x.st !== 'ok'), out = [], seen = {};
    const plain = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
    const add = (key, word, text) => { if (seen[key] || out.length >= 3) return; seen[key] = 1; out.push(text || '「' + word + '」：' + TIP[key]); };
    bad.forEach(x => {
      const a = plain(x.w), b = plain(x.heard), W = x.w.replace(/[^A-Za-z'-]/g, '');
      if (!a) return;
      if (b && x.st !== 'del') {
        // ちがった所：前からも後ろからも同じ文字をはずした残り（mA：お手本、mB：聞こえた語）
        let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
        let j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
        const mA = a.slice(i, a.length - j), mB = b.slice(i, b.length - j), cA = a.slice(Math.max(0, i - 1), a.length - j + 1);
        const n0 = out.length;
        if ((/l/.test(mA) && /r/.test(mB)) || (/r/.test(mA) && /l/.test(mB)) || (/[lr]/.test(mA) && !mB)) add('lr', W, a.length === b.length && a.replace(/r/g, 'l') === b.replace(/r/g, 'l') ? '「' + W + '」が「' + b + '」に聞こえました。' + TIP.lr : '');
        if (/th/.test(cA)) add('th', W);
        if (/v/.test(mA)) add('v', W);
        if (/f|ph/.test(mA)) add('f', W);
        if (i === 0 && /^wh?/.test(a) && !/^wh?/.test(b)) add('w', W);
        if (/si|ci|see|sea/.test(cA) && /sh/.test(b)) add('si', W);
        if (!mB && j === 0 && mA) add('end', W);                                   // 最後の音が落ちた（morning → mornin）
        if (j === 0 && /[bcdgkpt]$/.test(a) && /[uo]$/.test(b) && b.length > a.length) add('vow', W);   // 「ウ・オ」を足した
        if (out.length === n0 && a.length >= 8) add('long', W);
      } else {
        if (/th/.test(a)) add('th', W); else if (/v/.test(a)) add('v', W); else if (/f|ph/.test(a)) add('f', W);
      }
    });
    // 聞こえなかった語（最後のほうが落ちやすい）
    const miss = ws.map((x, i) => x.st === 'del' ? i : -1).filter(i => i >= 0);
    if (miss.length && out.length < 3) {
      const tail = miss[miss.length - 1] === ws.length - 1 && miss.every((v, k) => k === 0 || v === miss[k - 1] + 1);
      out.push('「' + miss.slice(0, 3).map(i => ws[i].w.replace(/[^A-Za-z'-]/g, '')).join('」「') + '」' + (miss.length > 3 ? 'など' : '') + 'が聞こえませんでした。'
        + (tail ? '文の最後まで、声を落とさずに言いましょう。' : '1語1語、口をしっかり動かして言いましょう。'));
    }
    if (bad.length && !out.length) out.push('1語ずつ区切らずに、なめらかにつなげて言ってみましょう（お手本の 🐢 ゆっくり で確かめて）。');
    if (out.length < 3 && bad.length >= Math.max(2, ws.length / 2)) out.push('はじめは ゆっくり・はっきり。言えたら少しずつ速くします。');
    return out.slice(0, 3);
  }

  /* ════ 発音チェックの窓 ════ */
  const BEST_KEY = 'eigo_pron_v1';
  function loadBest() { try { const o = JSON.parse(localStorage.getItem(BEST_KEY)); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function saveBest(text, sc) {
    const o = loadBest(), k = String(text).trim().slice(0, 200);
    const prev = Number(o[k]) || 0;
    if (sc > prev) {
      delete o[k]; o[k] = sc;
      const ks = Object.keys(o); if (ks.length > 3000) ks.slice(0, ks.length - 3000).forEach(x => { delete o[x]; });
      try { localStorage.setItem(BEST_KEY, JSON.stringify(o)); } catch (e) {}
    }
    return Math.max(prev, sc);
  }
  const bestOf = text => Number(loadBest()[String(text).trim().slice(0, 200)]) || 0;
  /* ── 長い文章は1文ずつに分ける（Mr. や U.S. の点では切らない） ── */
  const ABBR = /^(mr|mrs|ms|dr|st|mt|jr|sr|prof|vs|etc|no|e\.g|i\.e|u\.s|u\.k|a\.m|p\.m|[a-z])\.$/i;
  function sentences(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim(), out = [], re = /[.!?]+["”’')]*\s+/g;
    let st = 0, m;
    while ((m = re.exec(t))) {
      const end = m.index + m[0].length, last = t.slice(st, m.index + 1).split(' ').pop();
      if (ABBR.test(last) || !/^["“'(A-Z0-9]/.test(t.charAt(end))) continue;
      out.push({ s: t.slice(st, end).trim(), at: st }); st = end;
    }
    if (st < t.length) out.push({ s: t.slice(st).trim(), at: st });
    return out;
  }
  let P = { text: '', ja: '', ctl: null, list: [], k: 0 };
  const sheet = () => $('pron-sheet');
  function isOpen() { const s = sheet(); return !!s && s.style.display !== 'none'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function setMic(state) {
    const b = $('pron-mic'); if (!b) return;
    b.classList.toggle('on', state === 'on');
    b.textContent = state === 'on' ? '⏹ 止める（話し終わったら自動で止まります）' : state === 'again' ? '🎤 もう一度言う' : '🎤 タップして話す';
  }
  // at：長文のとき、何文字目の文から始めるか
  function open(text, ja, at) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    stopListen(); hush();
    const ss = sentences(text), many = ss.length > 1 && tokens(text).length > 16;
    let k = 0;
    if (many) ss.forEach((x, i) => { if (x.at <= (at || 0)) k = i; });
    P = { text: '', ja: many ? '' : String(ja || '').trim(), ctl: null, list: many ? ss.map(x => x.s) : [text], k };
    $('pron-mic').hidden = !SR;
    $('pron-nosr').hidden = !!SR;
    showTarget();
    sheet().style.display = 'flex';
  }
  function showTarget() {
    P.text = P.list[P.k];
    $('pron-target').textContent = P.text;
    $('pron-ja').textContent = P.ja; $('pron-ja').hidden = !P.ja;
    $('pron-nav').hidden = P.list.length < 2;
    $('pron-pos').textContent = (P.k + 1) + ' / ' + P.list.length + ' 文';
    $('pron-prev').disabled = P.k === 0; $('pron-next').disabled = P.k >= P.list.length - 1;
    $('pron-result').hidden = true; $('pron-live').textContent = '';
    const b = bestOf(P.text);
    $('pron-best').textContent = b ? 'これまでのベスト：' + b + '点' : '';
    setMic('idle');
  }
  function go(d) {
    const k = Math.max(0, Math.min(P.list.length - 1, P.k + d));
    if (k === P.k) return;
    stopListen(); hush(); P.ctl = null; P.k = k; showTarget();
  }
  function close() {
    if (!isOpen()) return false;
    stopListen(); hush();
    sheet().style.display = 'none';
    return true;
  }
  function start() {
    if (P.ctl) { P.ctl.stop(); return; }   // 話している途中でおしたら止める
    $('pron-result').hidden = true;
    $('pron-live').textContent = '聞いています… お手本を見ながら英語で言ってください';
    setMic('on');
    P.ctl = listen({
      onInterim: t => { if (t) $('pron-live').textContent = '「' + t + '」'; },
      onEnd: (res, err) => {
        P.ctl = null; setMic('again');
        if (!res) { $('pron-live').textContent = errMsg(err); return; }
        $('pron-live').textContent = '';
        show(score(P.text, res.alts));
      },
    });
    if (!P.ctl && !SR) { setMic('idle'); $('pron-live').textContent = errMsg('unsupported'); }
  }
  function show(r) {
    $('pron-result').hidden = false;
    $('pron-num').textContent = r.score;
    $('pron-stars').innerHTML = '★'.repeat(r.stars) + '<i>' + '★'.repeat(3 - r.stars) + '</i>';
    $('pron-msg').textContent = r.stars === 3 ? 'すばらしい！ はっきり伝わります。' : r.stars === 2 ? 'よく伝わります。色のついた語をもう一度ていねいに。'
      : r.stars === 1 ? 'あと少し。🔊 お手本を聞いてから、ゆっくり言ってみましょう。' : 'うまく聞き取れませんでした。🐢 ゆっくりのお手本をまねして、はっきり言ってみましょう。';
    $('pron-score-box').className = 'pron-score s' + r.stars;
    $('pron-words').innerHTML = r.words.map(x => '<span class="pw ' + x.st + '"' + (x.st !== 'ok' && x.heard ? ' title="聞こえた語：' + esc(x.heard) + '"' : '') + '>' + esc(x.w)
      + ((x.st === 'sub' || x.st === 'near') && x.heard ? '<small>' + esc(x.heard) + '</small>' : '') + '</span>').join(' ');
    $('pron-heard').textContent = r.heard || '（なし）';
    $('pron-conf').textContent = r.conf ? '（聞き取りの自信 ' + Math.round(r.conf * 100) + '%）' : '';
    $('pron-tips').innerHTML = (r.tips.length ? r.tips : ['このまま、お手本と同じ速さ・リズムで言えるようにしてみましょう。']).map(t => '<li>' + esc(t) + '</li>').join('');
    const b = saveBest(P.text, r.score);
    $('pron-best').textContent = 'これまでのベスト：' + b + '点' + (r.score >= b && r.score > 0 ? '（いまの点）' : '');
  }
  /* ── どの画面の英語か（ボタンの data-pron） ── */
  const txt = id => { const e = $(id); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
  // 長文：文章の全体と、いま光っている語（.rd-current）が何文字目か
  function passage(id) {
    const box = $(id); if (!box) return ['', '', 0];
    let all = '', at = 0;
    box.childNodes.forEach(n => {
      if (n.nodeType === 1 && n.classList.contains('rd-current')) at = all.replace(/\s+/g, ' ').replace(/^ /, '').length;
      all += n.nodeType === 1 && n.querySelector('br') ? ' ' + n.textContent + ' ' : n.textContent;
    });
    return [all, '', at];
  }
  const SRC = {
    chant: () => [txt('chant-en'), txt('chant-ja')],
    fcword: () => [txt('fc-word'), txt('fc-japanese')],
    // 例文の欄は「英語＋改行＋日本語」
    fcex: () => { const e = $('fc-example'), [en, ja] = (e ? e.textContent : '').split('\n'); return [en || '', ja || '']; },
    sfc: () => [txt('sfc-rd-passage'), txt('sfc-rd-passage-ja')],
    rd: () => passage('rd-passage'),
    jh: () => passage('jh-passage'),
  };
  function init() {
    if (!sheet()) return;
    document.querySelectorAll('[data-pron]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const f = SRC[b.dataset.pron]; if (!f) return;
      if (typeof App !== 'undefined' && App.stopAudio) App.stopAudio();   // 長文の再生・一括再生を止めてから（App は window のものではない）
      const [t, j, at] = f(); open(t, j, at);
    }));
    $('pron-prev').addEventListener('click', () => go(-1));
    $('pron-next').addEventListener('click', () => go(1));
    $('pron-mic').addEventListener('click', start);
    $('pron-play').addEventListener('click', () => { stopListen(); if (P.ctl) P.ctl = null; setMic('idle'); say(P.text, { rate: 0.92 }); });
    $('pron-slow').addEventListener('click', () => { stopListen(); if (P.ctl) P.ctl = null; setMic('idle'); say(P.text, { rate: 0.62 }); });
    sheet().addEventListener('click', e => { if (e.target === sheet() || e.target.closest('[data-pron-close]')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { close(); e.stopPropagation(); } }, true);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      stopListen(); hush();
      if (P.ctl) { P.ctl = null; setMic('idle'); $('pron-live').textContent = ''; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { supported: !!SR, say, hush, listen, stopListen, errMsg, words, tokens, score, tipsFor, sentences, open, close, isOpen, bestOf, _align: align };
})();
