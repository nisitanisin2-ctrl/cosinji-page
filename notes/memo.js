/* ════════════════════════════════════════════════════════════════
   メモ帳（表の顔）の書く所（表電卓 v529）。app.js より先に読む
   ・🎤 声で書く：聞き取ったことばをカーソルの所に入れる（話している途中の文字は下の帯に出す）。
     話の区切りには「。」を足す（⚙ で改行・なしにも）。少し間をあけて「まる」「てん」「はてな」「びっくり」
     「改行」「とりけし」（1つ戻す）「ストップ」（止める）と言うと、そのとおりにする
   ・句読点・改行のボタン（キーボードを出さずに入れられる）と ↶ 戻す（打った字・声・書式を1つずつ）
   ・書式：文字色・背景色（マーカー）・フォント・大きさ・太字・下線・取消線。
     選んだ文字に（選んでいなければカーソルのある行に）
   ・📤 出力：コピー（色も）・ほかのアプリへ送る・テキスト／色つきで保存・印刷（PDF）・読み上げ
   ・保存は「保存」ボタンでする（合言葉をメモ欄に書いて開くしくみなので、途中では保存しない）
   中身は1字ずつ「文字と書式」にしてから書き直すので、決まった書式（span の class）と文字だけが残る。
   貼り付けたものも文字だけ（よその HTML は入れない）
   ════════════════════════════════════════════════════════════════ */
'use strict';
window.MemoEd = (function () {
  const $ = s => document.querySelector(s);
  const ed = $('#memo');

  /* ── 書式の種類（class の名前。これ以外は残さない） ── */
  const G = {
    w: ['w-bold'],                                                   // 太字
    u: ['u-under'],                                                  // 下線
    x: ['x-strike'],                                                 // 取り消し線
    f: ['f-mincho', 'f-maru', 'f-mono'],                             // フォント（ゴシックは付けない）
    s: ['s-small', 's-big', 's-huge'],                               // 大きさ（ふつうは付けない）
    c: ['c-red', 'c-blue', 'c-green', 'c-orange', 'c-purple'],       // 文字色
    m: ['m-yellow', 'm-green', 'm-blue', 'm-pink', 'm-orange'],      // 背景色（マーカー）
  };
  const GK = Object.keys(G), C2G = {};
  GK.forEach(g => G[g].forEach(c => { C2G[c] = g; }));
  const TOGGLE = ['w', 'u', 'x'];
  // ほかで書いた太字・下線・取消線のタグも書式に直す
  const TAG = { B: 'w-bold', STRONG: 'w-bold', U: 'u-under', INS: 'u-under', S: 'x-strike', STRIKE: 'x-strike', DEL: 'x-strike' };
  /* よそへ出すときの見た目（コピー・色つきで保存。白い紙の色） */
  const INLINE = {
    'w-bold': 'font-weight:700',
    'f-mincho': 'font-family:"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif',
    'f-maru': 'font-family:"Hiragino Maru Gothic ProN","Kosugi Maru","Noto Sans JP",sans-serif',
    'f-mono': 'font-family:Menlo,Consolas,"Noto Sans Mono",monospace',
    's-small': 'font-size:.82em', 's-big': 'font-size:1.3em', 's-huge': 'font-size:1.7em',
    'c-red': 'color:#c62828', 'c-blue': 'color:#1565c0', 'c-green': 'color:#2e7d32', 'c-orange': 'color:#b85000', 'c-purple': 'color:#7b1fa2',
    'm-yellow': 'background-color:#fff176', 'm-green': 'background-color:#c8e6c9', 'm-blue': 'background-color:#bbdefb', 'm-pink': 'background-color:#f8bbd0', 'm-orange': 'background-color:#ffe0b2',
  };
  function styleOf(cls) {
    const l = cls.split(' '), deco = [];
    if (l.indexOf('u-under') >= 0) deco.push('underline');
    if (l.indexOf('x-strike') >= 0) deco.push('line-through');
    return l.filter(c => INLINE[c]).map(c => INLINE[c]).concat(deco.length ? ['text-decoration:' + deco.join(' ')] : []).join(';');
  }

  /* ── 見た目の好み（文字の大きさ・話の区切り・🎤 の案内を見たか）。中身とは別に覚える ── */
  const UI_KEY = 'memo.ui.v1';
  const ui = { fs: 17, sep: 'maru', mic: 0 };
  try {
    const o = JSON.parse(localStorage.getItem(UI_KEY));
    if (o && typeof o === 'object') {
      if (Number(o.fs) >= 13 && Number(o.fs) <= 29) ui.fs = Math.round(Number(o.fs));
      if (['none', 'maru', 'nl'].indexOf(o.sep) >= 0) ui.sep = o.sep;
      if (o.mic === 1) ui.mic = 1;
    }
  } catch (e) {}
  const saveUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (e) {} };

  let toastT = 0;
  function toast(m) {
    const t = $('#toast'); if (!t) return;
    t.textContent = m; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
  }

  /* ════ 中身 → 1字ずつの並び（{ch, k}。k は書式 {w, u, x, f, s, c, m}、改行は ch='\n'） ════
     ブラウザが書く形（<div>・<br>・行末の <br>・空の行の <div><br></div>）を見た目どおりの行に直す。
     marks（[node, offset] の並び）を渡すと、その所が何字目かも返す（カーソルの位置） */
  const BLOCK = /^(DIV|P|LI|UL|OL|H[1-6]|BLOCKQUOTE|PRE|TABLE|TR|SECTION|ARTICLE|HEADER|FOOTER|ADDRESS|DL|DT|DD|FIGURE|HR)$/;
  const SKIP = /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|IFRAME|OBJECT|EMBED|SVG|MATH|HEAD|TITLE|META|LINK|IMG|PICTURE|VIDEO|AUDIO|CANVAS|INPUT|SELECT|TEXTAREA|BUTTON|RT|RP)$/;
  function kOf(el, k) {
    let o = k;
    const put = c => { if (o === k) o = Object.assign({}, k); o[C2G[c]] = c; };
    if (TAG[el.tagName]) put(TAG[el.tagName]);
    if (el.classList) for (const c of el.classList) if (C2G[c]) put(c);
    return o;
  }
  function scanAt(root, marks) {
    const mk = marks || [], tk = [];
    const markAt = (node, off) => { for (let i = 0; i < mk.length; i++) if (mk[i] && mk[i][0] === node && mk[i][1] === off) tk.push({ t: 'm', i }); };
    (function walk(el, k) {
      const kids = el.childNodes;
      for (let i = 0; i < kids.length; i++) {
        if (mk.length) markAt(el, i);
        const c = kids[i];
        if (c.nodeType === 3) {
          const v = c.nodeValue;
          for (let j = 0; j < v.length; j++) {
            if (mk.length) markAt(c, j);
            const ch = v[j];
            if (ch === '\n') tk.push({ t: 'br' });
            else if (ch !== '\r') tk.push({ t: 'c', ch: ch === ' ' ? ' ' : ch, k });
          }
          if (mk.length) markAt(c, v.length);
        } else if (c.nodeType === 1) {
          if (c.tagName === 'BR') { tk.push({ t: 'br' }); continue; }
          if (SKIP.test(c.tagName)) continue;
          const blk = BLOCK.test(c.tagName);
          if (blk) tk.push({ t: 'b' });
          walk(c, kOf(c, k));
          if (blk) tk.push({ t: 'b' });
        }
      }
      if (mk.length) markAt(el, kids.length);
    })(root, {});
    const out = [], pos = mk.map(() => -1);
    let need = false, started = false;   // need：次に字が来たら行を変える（かたまりの境目）
    const nl = () => out.push({ ch: '\n', k: null });
    for (let i = 0; i < tk.length; i++) {
      const x = tk[i];
      if (x.t === 'm') { pos[x.i] = out.length + (need ? 1 : 0); continue; }
      if (x.t === 'c') { if (need) { nl(); need = false; } out.push({ ch: x.ch, k: x.k }); started = true; continue; }
      if (x.t === 'br') {
        let j = i + 1; while (j < tk.length && tk[j].t === 'm') j++;
        const nx = tk[j];
        if (nx && (nx.t === 'c' || nx.t === 'br')) { if (need) { nl(); need = false; } nl(); }   // 行を変える <br>
        else if (need) { nl(); need = false; }                                                    // 空の行のしるし
        started = true; continue;
      }
      if (started) need = true;   // かたまり（div など）の始め・終わり
    }
    return { chars: out, pos: pos.map(p => p < 0 ? out.length : Math.min(p, out.length)) };
  }
  const scan = root => scanAt(root).chars;
  const textOf = ch => ch.map(c => c.ch).join('');
  const kCls = k => k ? GK.map(g => k[g]).filter(Boolean).join(' ') : '';
  const charsFromText = t => String(t || '').replace(/\r\n?/g, '\n').split('').map(ch => ({ ch, k: ch === '\n' ? null : {} }));
  // 並び → 画面の中身（1行1つの div。書式のある所は span。inline はよそへ出す用の style 付き）
  function render(chars, inline) {
    const frag = document.createDocumentFragment();
    let line = document.createElement('div'), buf = '', bk = '';
    const flush = () => {
      if (!buf) return;
      if (bk) {
        const sp = document.createElement('span');
        if (inline) sp.setAttribute('style', styleOf(bk)); else sp.className = bk;
        sp.textContent = buf; line.appendChild(sp);
      } else line.appendChild(document.createTextNode(buf));
      buf = '';
    };
    const endLine = () => { flush(); if (!line.firstChild) line.appendChild(document.createElement('br')); frag.appendChild(line); line = document.createElement('div'); };
    for (const c of chars) {
      if (c.ch === '\n') { endLine(); continue; }
      const cl = kCls(c.k);
      if (cl !== bk) { flush(); bk = cl; }
      buf += c.ch;
    }
    if (chars.length) endLine();
    return frag;
  }
  const htmlOf = (chars, inline) => { const d = document.createElement('div'); d.appendChild(render(chars, inline)); return d.innerHTML; };
  // 保存しておいた HTML を読む（DOMParser の中ではプログラムも画像の読み込みも動かない）
  const parseHtml = h => new DOMParser().parseFromString('<!DOCTYPE html><body>' + String(h || ''), 'text/html').body;
  function setChars(ch) { ed.textContent = ''; ed.appendChild(render(ch)); }

  /* ════ カーソル（選んだ所）を覚える。ボタンをおしてメモから離れても使えるように ════ */
  let saved = null;
  document.addEventListener('selectionchange', () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ed.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange();
  });
  function liveRange() {
    const s = window.getSelection();
    if (s && s.rangeCount && ed.contains(s.anchorNode) && ed.contains(s.focusNode)) return s.getRangeAt(0);
    return saved && ed.contains(saved.startContainer) && ed.contains(saved.endContainer) ? saved : null;
  }
  // [始め, 終わり]（何字目）。カーソルがどこにもなければ null
  function selOffsets() {
    const r = liveRange(); if (!r) return null;
    const p = scanAt(ed, [[r.startContainer, r.startOffset], [r.endContainer, r.endOffset]]).pos;
    return p[0] <= p[1] ? p : [p[1], p[0]];
  }
  // 何字目 → 画面の点（書き直したあとの、1行1つの div で）
  function pointAt(p) {
    const lines = ed.children;
    if (!lines.length) return [ed, 0];
    let col = p, li = 0;
    for (; li < lines.length - 1; li++) { const len = lines[li].textContent.length; if (col <= len) break; col -= len + 1; }
    const div = lines[li];
    const tw = document.createTreeWalker(div, NodeFilter.SHOW_TEXT); let n, acc = 0, last = null;
    while ((n = tw.nextNode())) { if (col <= acc + n.length) return [n, Math.max(0, col - acc)]; acc += n.length; last = n; }
    return last ? [last, last.length] : [div, 0];
  }
  function selectRange(a, b) {
    const p1 = pointAt(a), p2 = pointAt(b), r = document.createRange();
    try { r.setStart(p1[0], p1[1]); r.setEnd(p2[0], p2[1]); } catch (e) { return; }
    saved = r.cloneRange();
    if (document.activeElement === ed) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  }
  // カーソルが見えるようにメモの中を動かす
  function reveal() {
    const r = saved; if (!r) return;
    let rect = null;
    try { rect = r.getClientRects()[0] || null; } catch (e) {}
    if (!rect) { const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement; if (n && n.getBoundingClientRect) rect = n.getBoundingClientRect(); }
    if (!rect) return;
    const box = ed.getBoundingClientRect();
    if (rect.bottom > box.bottom - 12) ed.scrollTop += rect.bottom - box.bottom + 32;
    else if (rect.top < box.top + 4) ed.scrollTop -= box.top - rect.top + 32;
  }

  /* ════ ↶ 戻す ／ ↷ やり直す（打った字・声・ボタン・書式を1つずつ。ブラウザの「戻す」は使わない） ════ */
  let undoSt = [], redoSt = [], lastKind = '', lastAt = 0, burstAt = 0;
  const cap = () => { const o = selOffsets(), ch = scan(ed); return { h: htmlOf(ch), p: o ? o[0] : ch.length }; };
  function pushUndo(st, kind) {
    undoSt.push(st || cap()); if (undoSt.length > 60) undoSt.shift();
    redoSt = []; lastKind = kind || ''; lastAt = burstAt = Date.now();
    updUndo();
  }
  // 打っている間はひと続きを1つにまとめる（1.2秒止まるか、8秒たったら次のかたまり）
  function typingSnap(kind) {
    const now = Date.now();
    if (kind !== lastKind || now - lastAt > 1200 || now - burstAt > 8000) pushUndo(null, kind);
    else lastAt = now;
  }
  function restore(st) { setChars(scan(parseHtml(st.h))); selectRange(st.p, st.p); reveal(); changed(); }
  function undo(quiet) {
    const st = undoSt.pop();
    if (!st) { updUndo(); if (!quiet) toast('戻せるものがありません'); return; }
    redoSt.push(cap()); restore(st); lastKind = ''; autoSep = null; updUndo();
    if (!quiet) toast('1つ戻しました');
  }
  function redo() {
    const st = redoSt.pop(); if (!st) return;
    undoSt.push(cap()); restore(st); lastKind = ''; autoSep = null; updUndo();
  }
  function updUndo() { const b = $('#undoBtn'); if (b) b.disabled = !undoSt.length; }

  /* ════ 入れる（声・句読点のボタン・貼り付け）：カーソルの所に。前の字の書式を引き継ぐ ════ */
  let composing = false, autoSep = null;   // autoSep：声の区切りに足した字 {p: その字の後ろ, ch}
  function insert(text, opt) {
    text = String(text || '').replace(/\r\n?/g, '\n');
    if (!text) return null;
    if (composing) {   // 変換の途中：ボタンは確定してもらう。声は欄を離れて確定させてから入れる（聞き取った分を捨てない）
      if (!(opt && opt.force)) { toast('変換を確定してからおしてください'); return null; }
      try { ed.blur(); } catch (e) {}
      composing = false;
    }
    const o = selOffsets(), ch = scan(ed);
    let a = o ? o[0] : ch.length;
    const b = o ? o[1] : ch.length;
    if (opt && opt.from != null && opt.from < a && ch[opt.from] && ch[opt.from].ch === opt.was) a = opt.from;
    pushUndo({ h: htmlOf(ch), p: o ? o[0] : ch.length }, 'put');
    const prev = a > 0 && ch[a - 1].ch !== '\n' ? ch[a - 1].k : null;
    const k = prev ? Object.assign({}, prev) : {};
    const add = text.split('').map(c => ({ ch: c, k: c === '\n' ? null : k }));
    setChars(ch.slice(0, a).concat(add, ch.slice(b)));
    const p = a + text.length;
    selectRange(p, p); reveal(); changed();
    return p;
  }

  /* ════ 書式 ════ */
  function format(g, cls) {
    if (composing) { toast('変換を確定してからおしてください'); return; }
    const o = selOffsets();
    if (!o) { toast('メモの中の文字を選んでからおしてください'); return; }
    const ch = scan(ed), t = textOf(ch);
    let a = o[0], b = o[1];
    if (a === b) {   // 選んでいないときはカーソルのある行
      a = a > 0 ? t.lastIndexOf('\n', a - 1) + 1 : 0;
      b = t.indexOf('\n', a); if (b < 0) b = t.length;
      if (a === b) { toast('この行にはまだ文字がありません'); return; }
    }
    if (TOGGLE.indexOf(g) >= 0) { const all = ch.slice(a, b).every(c => c.ch === '\n' || (c.k && c.k[g])); cls = all ? '' : G[g][0]; }
    else if (g !== 'clear' && (!G[g] || (cls && G[g].indexOf(cls) < 0))) return;
    pushUndo({ h: htmlOf(ch), p: o[0] }, 'fmt');
    for (let i = a; i < b; i++) {
      const c = ch[i]; if (c.ch === '\n') continue;
      if (g === 'clear') { c.k = {}; continue; }
      const k = Object.assign({}, c.k);
      if (cls) k[g] = cls; else delete k[g];
      c.k = k;
    }
    setChars(ch);
    if (o[0] === o[1]) selectRange(o[0], o[0]); else selectRange(a, b);
    changed();
  }

  /* ── 書式を選ぶ窓（文字色・背景色・フォント・大きさ） ── */
  const POPS = {
    f: { t: 'フォント', items: [['', 'ゴシック'], ['f-mincho', '明朝'], ['f-maru', '丸ゴシック'], ['f-mono', '等幅']] },
    s: { t: '大きさ', items: [['s-small', '小'], ['', 'ふつう'], ['s-big', '大'], ['s-huge', '特大']] },
    c: { t: '文字色', items: [['c-red', '赤'], ['c-blue', '青'], ['c-green', '緑'], ['c-orange', '橙'], ['c-purple', '紫'], ['', 'もとの色']] },
    m: { t: '背景色（マーカー）', items: [['m-yellow', '黄'], ['m-green', '緑'], ['m-blue', '水色'], ['m-pink', 'ピンク'], ['m-orange', '橙'], ['', 'なし']] },
  };
  const pop = $('#pop');
  function openPop(g, btn) {
    const P = POPS[g]; if (!P) return;
    if (!pop.hidden && pop.dataset.g === g) { closePop(); return; }
    pop.dataset.g = g; pop.textContent = '';
    const h = document.createElement('div'); h.className = 'pop-t'; h.textContent = P.t + '（選んだ文字に。選んでいなければその行に）'; pop.appendChild(h);
    const row = document.createElement('div'); row.className = 'pop-row' + (g === 'c' || g === 'm' ? ' sw' : '');
    P.items.forEach(([cls, label]) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.g = g; b.dataset.cls = cls;
      const sm = document.createElement('span'); sm.className = 'pv' + (cls ? ' ' + cls : g === 'm' ? ' m-none' : '');
      sm.textContent = g === 'c' || g === 'm' ? 'あ' : label;
      b.appendChild(sm);
      if (g === 'c' || g === 'm') { const l = document.createElement('small'); l.textContent = label; b.appendChild(l); }
      b.setAttribute('aria-label', P.t + '：' + label);
      row.appendChild(b);
    });
    pop.appendChild(row);
    pop.hidden = false;
    document.querySelectorAll('#fmt [data-pop]').forEach(x => x.classList.toggle('on', x === btn));
  }
  function closePop() { pop.hidden = true; pop.dataset.g = ''; document.querySelectorAll('#fmt [data-pop]').forEach(x => x.classList.remove('on')); }
  // ボタンをおしても、メモのカーソル（選んだ所）とキーボードがそのままになるように
  ['#fmt', '#pop', '#quick'].forEach(sel => $(sel).addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); }));
  $('#fmt').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.pop) { openPop(b.dataset.pop, b); return; }
    closePop();
    if (b.dataset.fmt) format(b.dataset.fmt);
  });
  pop.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; format(b.dataset.g, b.dataset.cls); closePop(); });
  document.addEventListener('click', e => { if (!pop.hidden && !e.target.closest('#pop') && !e.target.closest('#fmt')) closePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { closePop(); e.stopPropagation(); } }, true);
  // 書式のボタンが入りきらないときは右端をうすくする（すべらせられるしるし）
  const fmtBar = $('#fmt');
  const fmtMore = () => fmtBar.classList.toggle('more', fmtBar.scrollLeft + fmtBar.clientWidth < fmtBar.scrollWidth - 4);
  fmtBar.addEventListener('scroll', fmtMore, { passive: true });
  window.addEventListener('resize', fmtMore);
  fmtMore();

  /* ── 句読点・改行のボタン、↶ 戻す ── */
  $('#quick').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'undoBtn') { undo(); return; }
    if (b.dataset.ins != null) { autoSep = null; insert(b.dataset.ins === 'nl' ? '\n' : b.dataset.ins); }
  });

  /* ════ 🎤 声で書く（ブラウザの音声認識） ════ */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const PUNCT = { 'まる': '。', '丸': '。', '句点': '。', 'くてん': '。', 'てん': '、', '点': '、', '読点': '、', 'とうてん': '、',
    'はてな': '？', 'ハテナ': '？', 'クエスチョン': '？', 'びっくり': '！', 'ビックリ': '！', 'エクスクラメーション': '！' };
  const NL = ['かいぎょう', '改行', '次の行', 'つぎのぎょう'];
  const UNDO = ['とりけし', '取り消し', 'とりけす', '取り消す', '取消'];
  const STOP = ['ストップ', 'すとっぷ', 'おわり', '終わり', '終了'];
  const SIGN = { '?': '？', '!': '！', '.': '。', '．': '。', ',': '、', '，': '、' };
  const normCmd = t => String(t).replace(/[\s　。、．.！!？?]/g, '');
  // 聞き取った1かたまり（話の区切り）を入れる
  function onFinal(t) {
    let raw = String(t || '').replace(/^[\s　]+|[\s　]+$/g, '');
    if (!raw) return;
    const n = normCmd(raw);
    if (UNDO.indexOf(n) >= 0) { autoSep = null; undo(); return; }
    if (STOP.indexOf(n) >= 0) { stopVoice(); return; }
    if (NL.indexOf(n) >= 0) { putVoice('\n', true); return; }
    let pc = PUNCT[n];
    if (!pc && /^[。、？！?!．.,，]+$/.test(raw)) { const l = raw.slice(-1); pc = SIGN[l] || l; }
    if (pc) { putVoice(pc, true); return; }
    let nl = false;
    const m = /(改行|かいぎょう)$/.exec(raw);   // 「牛乳 改行」のように終わりに言ったとき
    if (m && raw.length > m[0].length) { raw = raw.slice(0, -m[0].length).replace(/[\s　]+$/, ''); nl = true; }
    let auto = '';
    if (nl) raw += '\n';
    else if (ui.sep === 'maru' && !/[。、！？!?.]$/.test(raw)) auto = '。';
    else if (ui.sep === 'nl') auto = '\n';
    putVoice(raw + auto, false, auto);
  }
  function putVoice(s, cmd, auto) {
    const a = autoSep; autoSep = null;
    const opt = { force: true };
    // 足した「。」のすぐ後ろで句読点を言ったときは、その「。」と入れ替える（改行のときは改行の前に入れる）
    if (cmd && a && s !== '\n') {
      const o = selOffsets();
      if (o && o[0] === o[1] && o[0] === a.p) { opt.from = a.p - 1; opt.was = a.ch; if (a.ch === '\n') s += '\n'; }
    }
    if (auto) {   // 文の途中に入れるときは区切りを足さない（行の終わりに足すときだけ）
      const o = selOffsets(), ch = scan(ed), e = o ? o[1] : ch.length;
      if (e < ch.length && ch[e].ch !== '\n') { s = s.slice(0, -auto.length); auto = ''; }
    }
    const p = insert(s, opt);
    if (p != null && auto) autoSep = { p, ch: auto };
  }
  let rec = null, on = false, idle = 0, gotAny = false;
  function showMid(t) { $('#vtext').textContent = t ? '「' + t + '」' : '聞いています… 話してください'; }
  function setMicUi(x) {
    const b = $('#mic');
    b.classList.toggle('on', x); b.setAttribute('aria-pressed', x ? 'true' : 'false');
    b.textContent = x ? '⏹ 止める' : '🎤 話す';
    $('#vbar').hidden = !x;
    document.body.classList.toggle('talking', x);
    // 話している間はメモをおしてもキーボードを出さない（カーソルを動かすだけ）
    if (x) ed.setAttribute('inputmode', 'none'); else ed.removeAttribute('inputmode');
  }
  function begin() {
    let r;
    try {
      r = rec = new SR();
      r.lang = 'ja-JP'; r.interimResults = true; r.maxAlternatives = 1;
      r.continuous = !/Android/i.test(navigator.userAgent);   // Android は1回ずつ聞き直す（同じ文が2回来るのを防ぐ）
      gotAny = false;
      r.onresult = e => {
        let fin = '', mid = '';
        for (let i = e.resultIndex; i < e.results.length; i++) { const x = e.results[i]; if (x.isFinal) fin += x[0].transcript; else mid += x[0].transcript; }
        if (fin) { gotAny = true; idle = 0; onFinal(fin); }
        if (on) showMid(mid);
      };
      r.onerror = e => {
        const er = e && e.error;
        if (er === 'not-allowed' || er === 'service-not-allowed' || er === 'audio-capture') { stopVoice(); toast('マイクが使えません（ブラウザの設定でマイクを許可してください）'); }
        else if (er === 'network') { stopVoice(); toast('🎤 はネットにつながっているときに使えます'); }
        else if (er === 'language-not-supported') { stopVoice(); toast('このブラウザは日本語の聞き取りができません'); }
      };
      r.onend = () => {
        if (!on || rec !== r) return;
        idle = gotAny ? 0 : idle + 1;
        if (idle >= 6) { stopVoice(); toast('しばらく声がなかったので止めました'); return; }
        setTimeout(() => { if (on && rec === r) begin(); }, 150);
      };
      r.start();
    } catch (e) { stopVoice(); toast('🎤 を始められませんでした'); }
  }
  function startVoice() {
    if (!SR) { toast('このブラウザでは 🎤 ボタンが使えません。キーボードの 🎤（音声入力）で話してください'); return; }
    if (on) return;
    if (!ui.mic) { $('#micSheet').classList.add('on'); return; }   // はじめてのときはしくみを知らせる
    stopSay(); closePop();
    if (composing) { try { ed.blur(); } catch (e) {} composing = false; }   // 変換の途中なら確定させる
    on = true; idle = 0; autoSep = null; setMicUi(true); showMid('');
    begin();
  }
  function stopVoice() {
    const was = on; on = false;
    const r = rec; rec = null;
    try { if (r) r.stop(); } catch (e) {}
    setMicUi(false);
    return was;
  }
  $('#mic').addEventListener('click', () => { if (on) stopVoice(); else startVoice(); });
  $('#micGo').addEventListener('click', () => { ui.mic = 1; saveUi(); $('#micSheet').classList.remove('on'); startVoice(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopVoice(); stopSay(); } });

  /* ════ 📤 出力 ════ */
  const pad2 = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
  function download(name, type, data) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const isEmpty = () => { if (text().trim()) return false; toast('まだ何も書いていません'); return true; };
  function fallbackCopy(t) {
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); toast(ok ? 'コピーしました' : 'コピーできませんでした');
  }
  async function copyOut() {
    if (isEmpty()) return;
    const ch = scan(ed), t = textOf(ch), h = htmlOf(ch, true);
    try {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ 'text/plain': new Blob([t], { type: 'text/plain' }), 'text/html': new Blob([h], { type: 'text/html' }) })]);
        toast('コピーしました（色もいっしょ）'); return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); toast('コピーしました'); return; }
    } catch (e) {}
    fallbackCopy(t);
  }
  async function shareOut() {
    if (isEmpty()) return;
    try { await navigator.share({ text: text() }); }
    catch (e) { if (!e || e.name !== 'AbortError') toast('送れませんでした'); }
  }
  function txtOut() { if (isEmpty()) return; download('memo-' + today() + '.txt', 'text/plain;charset=utf-8', '﻿' + text().replace(/\n/g, '\r\n')); toast('テキストで保存しました'); }
  function htmlDoc() {
    return '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="UTF-8">\n'
      + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">\n'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>メモ ' + today() + '</title>\n'
      + '<style>body{margin:24px;background:#fff;color:#2f3742;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP","Yu Gothic UI",sans-serif;font-size:17px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}</style>\n'
      + '</head>\n<body>' + htmlOf(scan(ed), true) + '</body>\n</html>\n';
  }
  function htmlOut() { if (isEmpty()) return; download('memo-' + today() + '.html', 'text/html;charset=utf-8', htmlDoc()); toast('色つきで保存しました'); }
  function printOut() { if (isEmpty()) return; stopVoice(); closeSheets(); setTimeout(() => window.print(), 80); }
  /* 🔊 読み上げ（文ごとに区切って読む。長い文は180字ずつ） */
  let speaking = false;
  function stopSay() { if (!speaking) return; speaking = false; try { window.speechSynthesis.cancel(); } catch (e) {} updSay(); }
  function sayOut() {
    if (speaking) { stopSay(); return; }
    if (!('speechSynthesis' in window)) { toast('このブラウザでは読み上げが使えません'); return; }
    if (isEmpty()) return;
    stopVoice();
    const parts = [];
    text().replace(/([。！？!?\n])/g, '$1\u0000').split('\u0000').map(s => s.trim()).filter(Boolean)
      .forEach(s => { for (let i = 0; i < s.length; i += 180) parts.push(s.slice(i, i + 180)); });
    const ss = window.speechSynthesis; ss.cancel();
    speaking = true; updSay();
    parts.forEach((s, i) => {
      const u = new SpeechSynthesisUtterance(s); u.lang = 'ja-JP'; u.rate = 1;
      if (i === parts.length - 1) { u.onend = () => { speaking = false; updSay(); }; u.onerror = u.onend; }
      ss.speak(u);
    });
  }
  function updSay() { $('#outSay').textContent = speaking ? '⏹ 読み上げを止める' : '🔊 読み上げる'; }
  function closeSheets() { document.querySelectorAll('.sheet.on').forEach(s => s.classList.remove('on')); }
  $('#outBtn').addEventListener('click', () => {
    closePop();
    $('#outShare').hidden = !navigator.share;
    updSay();
    $('#outSheet').classList.add('on');
  });
  $('#outSheet').addEventListener('click', e => {
    const b = e.target.closest('[data-out]'); if (!b) return;
    const m = b.dataset.out;
    if (m === 'copy') copyOut();
    else if (m === 'share') shareOut();
    else if (m === 'txt') txtOut();
    else if (m === 'html') htmlOut();
    else if (m === 'print') printOut();
    else if (m === 'say') sayOut();
  });

  /* ════ ⚙ メモの設定（文字の大きさ・話の区切り） ════ */
  function applyUi() { ed.style.fontSize = ui.fs + 'px'; $('#fsNow').textContent = ui.fs; $('#mcSep').value = ui.sep; }
  $('#cfMemo').addEventListener('click', () => { closePop(); applyUi(); $('#mcSheet').classList.add('on'); });
  $('#fsDn').addEventListener('click', () => { ui.fs = Math.max(13, ui.fs - 2); saveUi(); applyUi(); });
  $('#fsUp').addEventListener('click', () => { ui.fs = Math.min(29, ui.fs + 2); saveUi(); applyUi(); });
  $('#mcSep').addEventListener('change', () => { const v = $('#mcSep').value; if (['none', 'maru', 'nl'].indexOf(v) >= 0) { ui.sep = v; saveUi(); } });
  applyUi();

  /* ════ 打つ・貼る・落とす ════ */
  try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch (e) {}
  ed.addEventListener('compositionstart', () => { composing = true; autoSep = null; typingSnap('ime'); });
  ed.addEventListener('compositionend', () => { composing = false; changed(); });
  ed.addEventListener('beforeinput', e => {
    const t = e.inputType || '';
    if (t === 'historyUndo') { e.preventDefault(); undo(true); return; }
    if (t === 'historyRedo') { e.preventDefault(); redo(); return; }
    if (t.indexOf('format') === 0) {   // ブラウザの書式は使わず、こちらの書式に
      e.preventDefault();
      const g = { formatBold: 'w', formatUnderline: 'u', formatStrikeThrough: 'x' }[t];
      if (g) format(g);
      return;
    }
    autoSep = null;
    if (e.isComposing || composing) return;
    typingSnap(t.indexOf('delete') === 0 ? 'del' : 'ins');
  });
  ed.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.isComposing) return;
    const k = String(e.key).toLowerCase();
    if (k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(true); }
    else if (k === 'y') { e.preventDefault(); redo(); }
    else if (k === 'b' || k === 'u') { e.preventDefault(); format(k === 'b' ? 'w' : 'u'); }
    else if (k === 'i') e.preventDefault();
  });
  ed.addEventListener('input', e => { if (!e.isComposing) changed(); });
  // 貼り付け・よそからの落とし込みは文字だけ（よその書式や HTML は入れない）
  ed.addEventListener('paste', e => {
    e.preventDefault();
    const t = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    if (t) { autoSep = null; insert(t); }
  });
  let dragIn = false;
  ed.addEventListener('dragstart', () => { dragIn = true; });
  ed.addEventListener('dragend', () => { dragIn = false; });
  ed.addEventListener('drop', e => {
    if (dragIn) { typingSnap('drag'); return; }   // メモの中で動かすときはブラウザに任せる
    e.preventDefault();
    const t = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
    if (!t) return;
    let r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(e.clientX, e.clientY);
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
    if (r && ed.contains(r.startContainer)) saved = r;
    autoSep = null; insert(t);
  });
  ed.addEventListener('blur', () => { composing = false; if (!text() && ed.childNodes.length) ed.textContent = ''; });   // 空なら「ここに書けます」を出す

  /* ════ 字数・まだ保存していないしるし ════ */
  let savedSig = '', refreshT = 0, dirty = false;
  function text() { return textOf(scan(ed)); }
  function refresh() {
    const ch = scan(ed), t = textOf(ch);
    dirty = htmlOf(ch) !== savedSig;
    const c = $('#count');
    c.textContent = t.length + ' 文字' + (dirty ? '・未保存' : '');
    c.classList.toggle('dirty', dirty);
    $('#save').classList.toggle('dirty', dirty);
  }
  function changed() { clearTimeout(refreshT); refreshT = setTimeout(refresh, 80); }
  // 保存していない中身があるまま閉じようとしたときは、ブラウザに確かめてもらう
  window.addEventListener('beforeunload', e => { refresh(); if (dirty && text().trim()) { e.preventDefault(); e.returnValue = ''; } });

  /* ════ app.js から使う ════ */
  return {
    // 保存しておいた中身を出す（h があれば書式も。h と t が食い違うときは t だけ）
    load(st) {
      const t = st && typeof st.t === 'string' ? st.t.replace(/\r\n?/g, '\n') : '', h = st && typeof st.h === 'string' ? st.h : '';
      let ch = h ? scan(parseHtml(h)) : null;
      if (!ch || textOf(ch) !== t) ch = charsFromText(t);
      setChars(ch); saved = null; undoSt = []; redoSt = []; autoSep = null; updUndo();
      savedSig = htmlOf(scan(ed)); clearTimeout(refreshT); refresh();
    },
    // 保存する形：t は文字だけ、h は書式があるときだけ（決まった span だけの HTML）
    dump() { const ch = scan(ed); return { t: textOf(ch), h: ch.some(c => kCls(c.k)) ? htmlOf(ch) : '' }; },
    markSaved() { savedSig = htmlOf(scan(ed)); clearTimeout(refreshT); refresh(); },
    text,
    clear() { if (text()) pushUndo(null, 'clear'); ed.textContent = ''; saved = null; autoSep = null; changed(); },
    stop() { stopVoice(); stopSay(); closePop(); },
    // テスト用
    _t: { scan, scanAt, render, htmlOf, htmlDoc, parseHtml, onFinal, format, insert, selectRange, selOffsets, ui, isOn: () => on },
  };
})();
