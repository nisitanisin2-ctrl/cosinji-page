/* ════════════════════════════════════════════════════════════════
   メモ帳（表の顔）の書く所（表電卓 v529〜）。app.js より先に読む
   ・🎤 声で書く：聞き取ったことばをカーソルの所に入れる（話している途中の文字は下の帯に出す）。
     話の区切りには「。」を足す（⚙ で改行・なしにも）。少し間をあけて「まる」「てん」「はてな」「びっくり」
     「改行」「とりけし」（1つ戻す）「ストップ」（止める）と言うと、そのとおりにする
   ・句読点・改行のボタン（キーボードを出さずに入れられる）と ↶ 戻す（打った字・声・書式・写真を1つずつ）
   ・書式：文字色・背景色（マーカー）・フォント・大きさ・太字・下線・取消線。
     選んだ文字に（選んでいなければカーソルのある行に）
   ・📷 写真（v531）：カーソルの所に入れる（貼り付け・落とし込みも）。おして選ぶと、ドラッグで好きな行の間へ
     （落とした所が左・まん中・右なら、そちらに寄せる。左右に寄せると文字が回り込む）、角の ● で大きさを変える。
     写真は端末の中（IndexedDB）にしまい、メモには「どの写真を・どの幅で・どちらに寄せるか」だけを書く
   ・📤 出力：コピー（色・写真も）・ほかのアプリへ送る・テキスト／色つきで保存・印刷（PDF）・読み上げ
   ・保存は「保存」ボタンでする（合言葉をメモ欄に書いて開くしくみなので、途中では保存しない）
   中身は1字ずつ「文字と書式」（写真は1枚を1字）にしてから書き直すので、決まった書式（span の class）と
   写真の印と文字だけが残る。貼り付けたものも文字と写真だけ（よその HTML は入れない）
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
  function toast(m, ms) {
    const t = $('#toast'); if (!t) return;
    t.textContent = m; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 2200);
  }

  /* ════ 📷 写真のしまい場所（IndexedDB の memo-files）。メモには写真の印だけを書く ════ */
  const OBJ = '\uFFFC';                       // 写真1枚ぶんの「字」（文字としては数えない）
  const PH_ID = /^p[0-9a-z]{4,24}$/;
  const PDB = (function () {
    const ok = typeof indexedDB !== 'undefined';
    let dbp = null;
    function open() {
      if (!ok) return Promise.reject(new Error('no indexedDB'));
      if (!dbp) dbp = new Promise((res, rej) => {
        let r;
        try { r = indexedDB.open('memo-files', 1); } catch (e) { dbp = null; rej(e); return; }
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('p')) r.result.createObjectStore('p'); };
        r.onsuccess = () => res(r.result);
        r.onerror = () => { dbp = null; rej(r.error); };
      });
      return dbp;
    }
    function run(mode, fn) {
      return open().then(db => new Promise((res, rej) => {
        const t = db.transaction('p', mode), q = fn(t.objectStore('p'));
        t.oncomplete = () => res(q ? q.result : undefined);
        t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
      }));
    }
    return {
      ok,
      put: (id, blob) => run('readwrite', s => s.put(blob, id)),
      get: id => run('readonly', s => s.get(id)),
      del: id => run('readwrite', s => s.delete(id)),
      keys: () => run('readonly', s => s.getAllKeys()),
    };
  })();
  const purl = new Map(), loading = new Map(), keepIds = new Set();   // 表示用の URL・読み込み中・入れている途中（片づけない）
  const phEl = id => PH_ID.test(id) ? ed.querySelector('.ph[data-id="' + id + '"]') : null;
  function needUrl(id) {
    if (purl.has(id) || loading.has(id)) return;
    const mark = miss => ed.querySelectorAll('.ph[data-id="' + id + '"]').forEach(e => {
      e.classList.toggle('miss', miss);
      const im = e.querySelector('img'); if (im && !miss) im.src = purl.get(id);
    });
    loading.set(id, PDB.get(id).then(b => {
      loading.delete(id);
      if (!(b instanceof Blob)) { mark(true); return; }
      purl.set(id, URL.createObjectURL(b)); mark(false);
    }, () => { loading.delete(id); mark(true); }));
  }
  // 写真の印（span.ph の data-*）を読む。決まった形のものだけ
  function phOf(el) {
    const d = el.dataset || {}, id = String(d.id || '');
    if (!PH_ID.test(id)) return null;
    const w = Math.round(Number(d.w)), r = Number(d.r);
    return {
      id,
      w: w >= 10 && w <= 100 ? w : 60,
      al: ['l', 'c', 'r'].indexOf(d.al) >= 0 ? d.al : 'c',
      r: r > 0.05 && r < 20 ? Math.round(r * 10000) / 10000 : 0.75,
    };
  }
  const ALSTYLE = { l: 'float:left;margin:4px 12px 6px 0', r: 'float:right;margin:4px 0 6px 12px', c: 'display:block;margin:6px auto' };
  // mode：'ed' 画面（img 付き）・'save' 保存用（印だけ）・{urls} よそへ出す用（data: の img）
  function photoEl(ph, mode) {
    if (mode && typeof mode === 'object') {
      const src = mode.urls && mode.urls.get(ph.id); if (!src) return null;
      const im = document.createElement('img'); im.src = src; im.alt = '写真';
      im.setAttribute('style', 'width:' + ph.w + '%;height:auto;border-radius:6px;' + ALSTYLE[ph.al]);
      return im;
    }
    const sp = document.createElement('span');
    sp.className = 'ph' + (mode === 'ed' ? ' ph-' + ph.al + (ph.id === selPh ? ' sel' : '') : '');
    sp.dataset.id = ph.id; sp.dataset.w = ph.w; sp.dataset.al = ph.al; sp.dataset.r = ph.r;
    if (mode !== 'ed') return sp;
    sp.contentEditable = 'false'; sp.setAttribute('role', 'img'); sp.setAttribute('aria-label', '写真');
    sp.style.width = ph.w + '%';
    const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.style.aspectRatio = '1 / ' + ph.r;
    if (purl.has(ph.id)) im.src = purl.get(ph.id); else needUrl(ph.id);
    sp.appendChild(im);
    return sp;
  }

  /* ════ 中身 → 1字ずつの並び（{ch, k}。k は書式 {w, u, x, f, s, c, m}、改行は ch='\n'、写真は {ch: OBJ, ph}） ════
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
    const markIn = el => { for (let i = 0; i < mk.length; i++) if (mk[i] && el.contains(mk[i][0])) tk.push({ t: 'm', i }); };
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
            else if (ch !== '\r' && ch !== OBJ) tk.push({ t: 'c', ch: ch === '\u00a0' ? ' ' : ch, k });
          }
          if (mk.length) markAt(c, v.length);
        } else if (c.nodeType === 1) {
          if (c.classList && c.classList.contains('ph')) {   // 写真の印
            if (mk.length) markIn(c);
            const ph = phOf(c);
            if (ph) tk.push({ t: 'c', ch: OBJ, k: {}, ph });
            continue;
          }
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
      if (x.t === 'c') { if (need) { nl(); need = false; } out.push(x.ph ? { ch: OBJ, k: {}, ph: x.ph } : { ch: x.ch, k: x.k }); started = true; continue; }
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
  const rawOf = ch => ch.map(c => c.ch).join('');                 // 写真も1字（位置の計算用）
  const textOf = ch => ch.map(c => c.ph ? '' : c.ch).join('');     // 文字だけ（数える・保存・合言葉）
  const plainOf = ch => rawOf(ch).split(OBJ).join('［写真］');      // よそへ文字で出すとき
  const kCls = k => k ? GK.map(g => k[g]).filter(Boolean).join(' ') : '';
  const charsFromText = t => String(t || '').replace(/\r\n?/g, '\n').split('').filter(ch => ch !== OBJ).map(ch => ({ ch, k: ch === '\n' ? null : {} }));
  // 並び → 画面の中身（1行1つの div。書式のある所は span、写真は span.ph）。mode は photoEl と同じ
  function render(chars, mode) {
    const out = mode && typeof mode === 'object';
    const frag = document.createDocumentFragment();
    let line = document.createElement('div'), buf = '', bk = '';
    const flush = () => {
      if (!buf) return;
      if (bk) {
        const sp = document.createElement('span');
        if (out) sp.setAttribute('style', styleOf(bk)); else sp.className = bk;
        sp.textContent = buf; line.appendChild(sp);
      } else line.appendChild(document.createTextNode(buf));
      buf = '';
    };
    const endLine = () => { flush(); if (!line.firstChild) line.appendChild(document.createElement('br')); frag.appendChild(line); line = document.createElement('div'); };
    for (const c of chars) {
      if (c.ch === '\n') { endLine(); continue; }
      if (c.ph) { flush(); bk = ''; const el = photoEl(c.ph, mode); if (el) line.appendChild(el); continue; }
      const cl = kCls(c.k);
      if (cl !== bk) { flush(); bk = cl; }
      buf += c.ch;
    }
    if (chars.length) endLine();
    return frag;
  }
  const htmlOf = (chars, mode) => { const d = document.createElement('div'); d.appendChild(render(chars, mode || 'save')); return d.innerHTML; };
  // 保存しておいた HTML を読む（DOMParser の中ではプログラムも画像の読み込みも動かない）
  const parseHtml = h => new DOMParser().parseFromString('<!DOCTYPE html><body>' + String(h || ''), 'text/html').body;
  function setChars(ch) { ed.textContent = ''; ed.appendChild(render(ch, 'ed')); syncPh(); }

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
  // 何字目 → 画面の点（書き直したあとの、1行1つの div で。写真は1字）
  const isPh = n => n.nodeType === 1 && n.classList.contains('ph');
  const lineLen = div => { let n = 0; div.childNodes.forEach(c => { n += isPh(c) ? 1 : c.nodeName === 'BR' ? 0 : c.textContent.length; }); return n; };
  function pointAt(p) {
    const lines = ed.children;
    if (!lines.length) return [ed, 0];
    let col = p, li = 0;
    for (; li < lines.length - 1; li++) { const len = lineLen(lines[li]); if (col <= len) break; col -= len + 1; }
    const div = lines[li], kids = div.childNodes;
    let last = null;
    for (let i = 0; i < kids.length; i++) {
      const n = kids[i];
      if (isPh(n)) { if (col <= 0) return [div, i]; col -= 1; last = [div, i + 1]; continue; }
      const tn = n.nodeType === 3 ? n : n.firstChild && n.firstChild.nodeType === 3 ? n.firstChild : null;
      if (!tn) continue;
      if (col <= tn.length) return [tn, Math.max(0, col)];
      col -= tn.length; last = [tn, tn.length];
    }
    return last || [div, 0];
  }
  function selectRange(a, b) {
    const p1 = pointAt(a), p2 = pointAt(b), r = document.createRange();
    try { r.setStart(p1[0], p1[1]); r.setEnd(p2[0], p2[1]); } catch (e) { return; }
    saved = r.cloneRange();
    if (document.activeElement === ed) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  }
  // カーソル（または写真）が見えるようにメモの中を動かす
  function revealRect(rect) {
    if (!rect) return;
    const box = ed.getBoundingClientRect();
    if (rect.bottom > box.bottom - 12) ed.scrollTop += Math.min(rect.bottom - box.bottom + 32, rect.top - box.top - 8);
    else if (rect.top < box.top + 4) ed.scrollTop -= box.top - rect.top + 32;
  }
  function reveal() {
    const r = saved; if (!r) return;
    let rect = null;
    try { rect = r.getClientRects()[0] || null; } catch (e) {}
    if (!rect) { const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement; if (n && n.getBoundingClientRect) rect = n.getBoundingClientRect(); }
    revealRect(rect);
  }

  /* ════ ↶ 戻す ／ ↷ やり直す（打った字・声・ボタン・書式・写真を1つずつ。ブラウザの「戻す」は使わない） ════ */
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
    text = String(text || '').replace(/\r\n?/g, '\n').split(OBJ).join('');
    if (!text) return null;
    if (composing) {   // 変換の途中：ボタンは確定してもらう。声は欄を離れて確定させてから入れる（聞き取った分を捨てない）
      if (!(opt && opt.force)) { toast('変換を確定してからおしてください'); return null; }
      try { ed.blur(); } catch (e) {}
      composing = false;
    }
    unselectPhoto();
    const o = selOffsets(), ch = scan(ed);
    let a = o ? o[0] : ch.length;
    const b = o ? o[1] : ch.length;
    if (opt && opt.from != null && opt.from < a && ch[opt.from] && ch[opt.from].ch === opt.was) a = opt.from;
    pushUndo({ h: htmlOf(ch), p: o ? o[0] : ch.length }, 'put');
    const prev = a > 0 && ch[a - 1].ch !== '\n' && !ch[a - 1].ph ? ch[a - 1].k : null;
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
    const ch = scan(ed), t = rawOf(ch);
    let a = o[0], b = o[1];
    if (a === b) {   // 選んでいないときはカーソルのある行
      a = a > 0 ? t.lastIndexOf('\n', a - 1) + 1 : 0;
      b = t.indexOf('\n', a); if (b < 0) b = t.length;
      if (a === b) { toast('この行にはまだ文字がありません'); return; }
    }
    if (TOGGLE.indexOf(g) >= 0) { const all = ch.slice(a, b).every(c => c.ch === '\n' || c.ph || (c.k && c.k[g])); cls = all ? '' : G[g][0]; }
    else if (g !== 'clear' && (!G[g] || (cls && G[g].indexOf(cls) < 0))) return;
    pushUndo({ h: htmlOf(ch), p: o[0] }, 'fmt');
    for (let i = a; i < b; i++) {
      const c = ch[i]; if (c.ch === '\n' || c.ph) continue;
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
  ['#fmt', '#pop', '#quick', '#phbar'].forEach(sel => $(sel).addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); }));
  $('#fmt').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'phAdd') { closePop(); $('#phFile').click(); return; }
    if (b.dataset.pop) { openPop(b.dataset.pop, b); return; }
    closePop();
    if (b.dataset.fmt) format(b.dataset.fmt);
  });
  pop.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; format(b.dataset.g, b.dataset.cls); closePop(); });
  document.addEventListener('click', e => { if (!pop.hidden && !e.target.closest('#pop') && !e.target.closest('#fmt')) closePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { closePop(); e.stopPropagation(); } }, true);
  // 書式・写真のボタンが入りきらないときは右端をうすくする（すべらせられるしるし）
  ['#fmt', '#phbar'].forEach(sel => {
    const bar = $(sel);
    const more = () => bar.classList.toggle('more', bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4);
    bar.addEventListener('scroll', more, { passive: true });
    window.addEventListener('resize', more);
    bar._more = more; more();
  });

  /* ── 句読点・改行のボタン、↶ 戻す ── */
  $('#quick').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'undoBtn') { undo(); return; }
    if (b.dataset.ins != null) { autoSep = null; insert(b.dataset.ins === 'nl' ? '\n' : b.dataset.ins); }
  });

  /* ════ 📷 写真：入れる・選ぶ・動かす・大きさ ════ */
  const toLines = ch => { const L = [[]]; ch.forEach(c => { if (c.ch === '\n') L.push([]); else L[L.length - 1].push(c); }); return L; };
  const fromLines = L => { const out = []; L.forEach((l, i) => { if (i) out.push({ ch: '\n', k: null }); l.forEach(c => out.push(c)); }); return out; };
  const lineStart = (L, n) => n <= 0 ? 0 : fromLines(L.slice(0, n)).length + 1;
  function findPh(L, id) { for (let i = 0; i < L.length; i++) for (let j = 0; j < L[i].length; j++) if (L[i][j].ph && L[i][j].ph.id === id) return [i, j]; return null; }
  function lineW() { const cs = getComputedStyle(ed); return Math.max(100, ed.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)); }
  const newPhotoId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function readImage(file) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => res({ im, u });
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image')); };
      im.src = u;
    });
  }
  // 大きな写真は長い辺を 1600px に縮めて JPEG に（端末の中の場所を食わないように）。小さなものはそのまま
  async function storePhoto(file) {
    const { im, u } = await readImage(file);
    const W = im.naturalWidth, H = im.naturalHeight;
    if (!W || !H) { URL.revokeObjectURL(u); throw new Error('size'); }
    const sc = Math.min(1, 1600 / Math.max(W, H));
    let blob = file;
    if (!(sc === 1 && file.size <= 1.5 * 1024 * 1024 && /^image\/(png|jpeg|webp|gif)$/.test(file.type))) {
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(W * sc)); cv.height = Math.max(1, Math.round(H * sc));
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
      blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
    }
    URL.revokeObjectURL(u);
    if (!blob) throw new Error('blob');
    const id = newPhotoId();
    keepIds.add(id);
    try { await PDB.put(id, blob); } catch (e) { keepIds.delete(id); throw e; }
    purl.set(id, URL.createObjectURL(blob));
    return { id, r: Math.round(H / W * 10000) / 10000, pw: W * sc };
  }
  let adding = false;
  async function addPhotos(files) {
    const fs = Array.from(files || []).filter(f => f && /^image\//.test(f.type));
    if (!fs.length || adding) return;
    if (!PDB.ok) { toast('この端末では写真をしまえません'); return; }
    adding = true; closePop();
    toast('写真を入れています…', 8000);
    const made = [];
    for (const f of fs) { try { made.push(await storePhoto(f)); } catch (e) {} }
    adding = false;
    if (!made.length) { toast('写真を読み込めませんでした'); return; }
    // 写真は1枚ずつ自分の行に。空の行ならそこに、行の頭なら前に、行の途中なら次の行に
    const o = selOffsets(), ch = scan(ed), raw = rawOf(ch), L = toLines(ch);
    const p = o ? o[1] : ch.length;
    pushUndo({ h: htmlOf(ch), p: o ? o[0] : ch.length }, 'photo');
    const li = (raw.slice(0, p).match(/\n/g) || []).length;
    const col = p - (p > 0 ? raw.lastIndexOf('\n', p - 1) + 1 : 0);
    const lw = lineW(), dpr = window.devicePixelRatio || 1;
    const rows = made.map(m => [{ ch: OBJ, k: {}, ph: { id: m.id, w: Math.max(10, Math.min(60, Math.round(m.pw / dpr / lw * 100))), al: 'c', r: m.r } }]);
    let at;
    if (!L[li].length) { L.splice(li, 1, ...rows); at = li; }
    else if (col === 0) { L.splice(li, 0, ...rows); at = li; }
    else { L.splice(li + 1, 0, ...rows); at = li + 1; }
    const after = at + rows.length;
    if (after >= L.length) L.push([]);   // 写真の下にも書けるように
    setChars(fromLines(L));
    made.forEach(m => keepIds.delete(m.id));
    const off = lineStart(L, after);
    selectRange(off, off);
    selectPhoto(made[made.length - 1].id);
    const el = phEl(made[made.length - 1].id); if (el) revealRect(el.getBoundingClientRect());
    changed();
    toast(made.length < fs.length ? '読み込めない写真がありました' : '写真を入れました。ドラッグで動かす・角の ● で大きさ', 3200);
  }
  $('#phFile').addEventListener('change', e => { const f = Array.from(e.target.files || []); e.target.value = ''; addPhotos(f); });

  /* ── 写真を選ぶ（選ぶと上の段が写真の道具になる） ── */
  let selPh = '';
  const phbar = $('#phbar'), drop = $('#phDrop');
  function markSel() { ed.querySelectorAll('.ph').forEach(e => e.classList.toggle('sel', e.dataset.id === selPh)); }
  function updPhBar() {
    const e = phEl(selPh); if (!e) return;
    phbar.querySelectorAll('[data-al]').forEach(b => b.classList.toggle('on', b.dataset.al === e.dataset.al));
    phbar.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', b.dataset.w === e.dataset.w));
  }
  function showPhTools(x) {
    phbar.hidden = !x; $('#fmt').hidden = x;
    if (x) { closePop(); phbar._more(); } else $('#fmt')._more();
  }
  function selectPhoto(id) {
    selPh = PH_ID.test(id) ? id : '';
    markSel();
    if (!phEl(selPh)) { selPh = ''; showPhTools(false); return; }
    showPhTools(true); updPhBar();
  }
  function unselectPhoto() { if (!selPh) return; selPh = ''; markSel(); showPhTools(false); }
  function syncPh() { if (!selPh) return; if (!phEl(selPh)) unselectPhoto(); else { markSel(); updPhBar(); } }
  // 写真を1枚動かす・変える（fn(L, 行, 何番目) が行の並びを直す）。↶ で戻せる
  function photoOp(id, fn) {
    const ch = scan(ed), L = toLines(ch), at = findPh(L, id);
    if (!at) { unselectPhoto(); return; }
    const o = selOffsets();
    pushUndo({ h: htmlOf(ch), p: o ? o[0] : ch.length }, 'photo');
    fn(L, at[0], at[1]);
    const last = L[L.length - 1];
    if (last.length && last.every(c => c.ph)) L.push([]);   // いちばん下が写真なら、その下にも書けるように
    setChars(fromLines(L));
    const now = findPh(L, id);   // カーソルは写真の次の行の頭に（声やボタンで続きを書けるように）
    if (now) { const off = now[0] + 1 < L.length ? lineStart(L, now[0] + 1) : lineStart(L, now[0]) + now[1] + 1; selectRange(off, off); }
    changed();
  }
  function phSet(id, key, val) {
    photoOp(id, (L, i, j) => { const c = L[i][j]; L[i][j] = { ch: OBJ, k: {}, ph: Object.assign({}, c.ph, { [key]: val }) }; });
  }
  // 写真を行から取り出す（その行が空になったら行ごと消す）
  function phTake(L, i, j) {
    const c = L[i].splice(j, 1)[0];
    let gone = -1;
    if (!L[i].length && L.length > 1) { L.splice(i, 1); gone = i; }
    return { c, gone };
  }
  function phMove(id, dir) {
    photoOp(id, (L, i, j) => {
      const { c, gone } = phTake(L, i, j);
      const at = gone >= 0 ? (dir < 0 ? Math.max(0, i - 1) : Math.min(L.length, i + 1)) : (dir < 0 ? i : i + 1);
      L.splice(at, 0, [c]);
    });
    const el = phEl(id); if (el) revealRect(el.getBoundingClientRect());
  }
  // line 行目の前に置く（line は取り出す前の行番号）。al：寄せる向き
  function phPlace(id, line, al) {
    photoOp(id, (L, i, j) => {
      const { c, gone } = phTake(L, i, j);
      let at = line;
      if (gone >= 0 && gone < line) at--;
      at = Math.max(0, Math.min(L.length, at));
      c.ph = Object.assign({}, c.ph, { al: ['l', 'c', 'r'].indexOf(al) >= 0 ? al : c.ph.al });
      L.splice(at, 0, [c]);
    });
  }
  function phDelete(id) { photoOp(id, (L, i, j) => { phTake(L, i, j); }); unselectPhoto(); toast('写真を消しました（↶ で戻せます）'); }
  phbar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !selPh) return;
    if (b.dataset.al) phSet(selPh, 'al', b.dataset.al);
    else if (b.dataset.w) phSet(selPh, 'w', Number(b.dataset.w));
    else if (b.dataset.mv) phMove(selPh, Number(b.dataset.mv));
    else if (b.dataset.ph === 'del') phDelete(selPh);
    else if (b.dataset.ph === 'done') unselectPhoto();
  });

  /* ── 写真をドラッグで動かす・角の ● で大きさを変える ── */
  // 1行1つの div に書き直す（行の番号で置き場所を決めるため）
  function isCanon() {
    for (const d of ed.childNodes) {
      if (d.nodeType !== 1 || d.tagName !== 'DIV') return false;
      for (const n of d.childNodes) {
        if (n.nodeType === 3) continue;
        if (n.nodeType !== 1) return false;
        if (n.tagName === 'BR') { if (d.childNodes.length !== 1) return false; continue; }
        if (n.tagName !== 'SPAN') return false;
        if (n.classList.contains('ph')) continue;
        if (n.childNodes.length !== 1 || n.firstChild.nodeType !== 3) return false;
      }
    }
    return true;
  }
  function canon() { if (isCanon()) return; const o = selOffsets(); setChars(scan(ed)); if (o) selectRange(o[0], o[1]); }
  // 落とす所：どの行の前か（行の上半分なら前、下半分なら後ろ）と、左・まん中・右
  function dropTarget(x, y, self) {
    const box = ed.getBoundingClientRect(), cs = getComputedStyle(ed);
    const left = box.left + parseFloat(cs.paddingLeft), right = box.right - parseFloat(cs.paddingRight);
    const rx = (x - left) / Math.max(1, right - left);
    const al = rx < 0.34 ? 'l' : rx > 0.66 ? 'r' : 'c';
    const lines = ed.children;
    let line = lines.length, yy = null;
    for (let i = 0; i < lines.length; i++) {
      const el = lines[i];
      if (self && el.contains(self) && el.childNodes.length === 1) continue;   // 動かしている写真だけの行
      const r = el.getBoundingClientRect(); if (r.height < 1) continue;
      if (y < r.top + r.height / 2) { line = i; yy = r.top; break; }
      yy = r.bottom;
    }
    return { line, al, y: yy == null ? box.top + 12 : yy, left, right };
  }
  function showDrop(t) {
    const w = t.right - t.left;
    const l = t.al === 'l' ? t.left : t.al === 'r' ? t.right - w * 0.4 : t.left + w * 0.15;
    drop.style.left = l + 'px'; drop.style.width = (t.al === 'c' ? w * 0.7 : w * 0.4) + 'px'; drop.style.top = (t.y - 2) + 'px';
    drop.firstChild.textContent = t.al === 'l' ? '← 左に寄せる' : t.al === 'r' ? '右に寄せる →' : 'ここに置く';
    drop.hidden = false;
  }
  let drag = null;   // { id, el, mode: 'size'|'move', x0, y0, st0, r, al, lw, on, w, target }
  ed.addEventListener('pointerdown', e => {
    const el = e.target.closest && e.target.closest('.ph');
    if (!el || !ed.contains(el)) { unselectPhoto(); return; }
    e.preventDefault();
    const id = el.dataset.id;
    if (id !== selPh) { if (e.pointerType === 'mouse') selectPhoto(id); else return; }   // 指は軽くおして選ぶ（click で。画面をすべらせるのとまぎれないように）
    canon();
    const cur = phEl(id); if (!cur) return;
    const r = cur.getBoundingClientRect(), al = cur.dataset.al;
    const hx = al === 'r' ? r.left : r.right;
    drag = { id, el: cur, mode: Math.hypot(e.clientX - hx, e.clientY - r.bottom) < 30 ? 'size' : 'move', x0: e.clientX, y0: e.clientY, st0: ed.scrollTop, r, al, lw: lineW(), on: false, w: Number(cur.dataset.w), target: null };
    try { cur.setPointerCapture(e.pointerId); } catch (_) {}
  });
  ed.addEventListener('pointermove', e => {
    const d = drag; if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.on) { if (Math.hypot(dx, dy) < 6) return; d.on = true; d.el.classList.add(d.mode === 'size' ? 'sizing' : 'drag'); }
    e.preventDefault();
    if (d.mode === 'size') {
      const r = d.r;
      const w = d.al === 'l' ? e.clientX - r.left : d.al === 'r' ? r.right - e.clientX : 2 * (e.clientX - (r.left + r.width / 2));
      d.w = Math.max(10, Math.min(100, Math.round(w / d.lw * 100)));
      d.el.style.width = d.w + '%';
      return;
    }
    // 端まで来たらメモの中を動かす
    const box = ed.getBoundingClientRect();
    if (e.clientY < box.top + 36) ed.scrollTop -= 14; else if (e.clientY > box.bottom - 36) ed.scrollTop += 14;
    d.el.style.transform = 'translate(' + dx + 'px,' + (dy + ed.scrollTop - d.st0) + 'px)';
    d.target = dropTarget(e.clientX, e.clientY, d.el);
    showDrop(d.target);
  });
  function endDrag(cancel) {
    const d = drag; drag = null; if (!d) return;
    drop.hidden = true;
    d.el.classList.remove('drag', 'sizing'); d.el.style.transform = '';
    if (cancel || !d.on) { d.el.style.width = d.el.dataset.w + '%'; return; }
    if (d.mode === 'size') { if (String(d.w) !== d.el.dataset.w) phSet(d.id, 'w', d.w); return; }
    if (d.target) { phPlace(d.id, d.target.line, d.target.al); const el = phEl(d.id); if (el) revealRect(el.getBoundingClientRect()); }
  }
  ed.addEventListener('click', e => { const el = e.target.closest && e.target.closest('.ph'); if (el && ed.contains(el) && el.dataset.id !== selPh) selectPhoto(el.dataset.id); });
  ed.addEventListener('pointerup', () => endDrag(false));
  ed.addEventListener('pointercancel', () => endDrag(true));
  ed.addEventListener('lostpointercapture', () => { if (drag && drag.on) endDrag(false); else drag = null; });
  document.addEventListener('pointerdown', e => { if (selPh && !e.target.closest('#phbar') && !ed.contains(e.target)) unselectPhoto(); }, true);
  document.addEventListener('keydown', e => {
    if (!selPh || (e.target.closest && e.target.closest('input, textarea, select, .sheet'))) return;
    if (e.key === 'Escape') { unselectPhoto(); e.stopPropagation(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); phDelete(selPh); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); phMove(selPh, e.key === 'ArrowUp' ? -1 : 1); }
  }, true);

  /* ════ 🎤 声で書く（ブラウザの音声認識） ════ */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const PUNCT = { 'まる': '。', '丸': '。', '句点': '。', 'くてん': '。', 'てん': '、', '点': '、', '読点': '、', 'とうてん': '、',
    'はてな': '？', 'ハテナ': '？', 'クエスチョン': '？', 'びっくり': '！', 'ビックリ': '！', 'エクスクラメーション': '！' };
  const NL = ['かいぎょう', '改行', '次の行', 'つぎのぎょう'];
  const UNDO = ['とりけし', '取り消し', 'とりけす', '取り消す', '取消'];
  const STOP = ['ストップ', 'すとっぷ', 'おわり', '終わり', '終了'];
  const SIGN = { '?': '？', '!': '！', '.': '。', '．': '。', ',': '、', '，': '、' };
  const normCmd = t => String(t).replace(/[\s\u3000。、．.！!？?]/g, '');
  // 聞き取った1かたまり（話の区切り）を入れる
  function onFinal(t) {
    let raw = String(t || '').replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
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
    if (m && raw.length > m[0].length) { raw = raw.slice(0, -m[0].length).replace(/[\s\u3000]+$/, ''); nl = true; }
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
    stopSay(); closePop(); unselectPhoto();
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
  function blank() { const ch = scan(ed); return !textOf(ch).trim() && !ch.some(c => c.ph); }
  const isEmpty = () => { if (!blank()) return false; toast('まだ何も書いていません'); return true; };
  // 写真をよそへ出す用に読む（HTML に入れる data: の URL と、送るときのファイル）
  async function photoOut(ch) {
    const ids = [], urls = new Map(), files = [];
    ch.forEach(c => { if (c.ph && ids.indexOf(c.ph.id) < 0) ids.push(c.ph.id); });
    for (const id of ids) {
      let b = null; try { b = await PDB.get(id); } catch (e) {}
      if (!(b instanceof Blob)) continue;
      const u = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result || '')); fr.onerror = () => res(''); fr.readAsDataURL(b); });
      if (/^data:image\//.test(u)) urls.set(id, u);
      const ext = /png/.test(b.type) ? 'png' : /gif/.test(b.type) ? 'gif' : /webp/.test(b.type) ? 'webp' : 'jpg';
      files.push(new File([b], 'memo-photo-' + (files.length + 1) + '.' + ext, { type: b.type || 'image/jpeg' }));
    }
    return { urls, files };
  }
  let outPrep = null, outData = null;   // 出力の窓を開いたときに写真を読んでおく（送る・コピーをすぐできるように）
  const outPhotos = () => outPrep || (outPrep = photoOut(scan(ed)).then(d => (outData = d)));
  function fallbackCopy(t) {
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); toast(ok ? 'コピーしました' : 'コピーできませんでした');
  }
  async function copyOut() {
    if (isEmpty()) return;
    const ch = scan(ed), t = plainOf(ch), d = await outPhotos(), h = htmlOf(ch, { urls: d.urls });
    try {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ 'text/plain': new Blob([t], { type: 'text/plain' }), 'text/html': new Blob([h], { type: 'text/html' }) })]);
        toast(d.urls.size ? 'コピーしました（色・写真もいっしょ）' : 'コピーしました（色もいっしょ）'); return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); toast('コピーしました'); return; }
    } catch (e) {}
    fallbackCopy(t);
  }
  async function shareOut() {
    if (isEmpty()) return;
    const data = { text: plainOf(scan(ed)) }, d = outData;
    try { if (d && d.files.length && navigator.canShare && navigator.canShare({ files: d.files })) data.files = d.files; } catch (e) {}
    try { await navigator.share(data); }
    catch (e) { if (!e || e.name !== 'AbortError') toast('送れませんでした'); }
  }
  function txtOut() { if (isEmpty()) return; download('memo-' + today() + '.txt', 'text/plain;charset=utf-8', '\ufeff' + plainOf(scan(ed)).replace(/\n/g, '\r\n')); toast('テキストで保存しました'); }
  function htmlDoc(urls) {
    return '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="UTF-8">\n'
      + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">\n'
      + '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>メモ ' + today() + '</title>\n'
      + '<style>body{margin:24px;background:#fff;color:#2f3742;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP","Yu Gothic UI",sans-serif;font-size:17px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}body::after{content:"";display:block;clear:both}</style>\n'
      + '</head>\n<body>' + htmlOf(scan(ed), { urls: urls || new Map() }) + '</body>\n</html>\n';
  }
  async function htmlOut() {
    if (isEmpty()) return;
    const d = await outPhotos();
    download('memo-' + today() + '.html', 'text/html;charset=utf-8', htmlDoc(d.urls)); toast('色つきで保存しました');
  }
  function printOut() { if (isEmpty()) return; stopVoice(); unselectPhoto(); closeSheets(); setTimeout(() => window.print(), 80); }
  /* 🔊 読み上げ（文ごとに区切って読む。長い文は180字ずつ。写真は読まない） */
  let speaking = false;
  function stopSay() { if (!speaking) return; speaking = false; try { window.speechSynthesis.cancel(); } catch (e) {} updSay(); }
  function sayOut() {
    if (speaking) { stopSay(); return; }
    if (!('speechSynthesis' in window)) { toast('このブラウザでは読み上げが使えません'); return; }
    if (!text().trim()) { toast('読み上げる文字がありません'); return; }
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
    closePop(); unselectPhoto();
    outPrep = null; outData = null; outPhotos();
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
  ed.addEventListener('compositionstart', () => { composing = true; autoSep = null; unselectPhoto(); typingSnap('ime'); });
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
    autoSep = null; unselectPhoto();
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
  // 貼り付け・よそからの落とし込みは文字と写真だけ（よその書式や HTML は入れない）
  function imgFiles(dt) {
    const out = [];
    if (!dt) return out;
    Array.from(dt.files || []).forEach(f => { if (/^image\//.test(f.type)) out.push(f); });
    if (!out.length && dt.items) Array.from(dt.items).forEach(it => { if (it.kind === 'file' && /^image\//.test(it.type)) { const f = it.getAsFile(); if (f) out.push(f); } });
    return out;
  }
  ed.addEventListener('paste', e => {
    e.preventDefault();
    const fs = imgFiles(e.clipboardData);
    if (fs.length) { autoSep = null; addPhotos(fs); return; }
    const t = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    if (t) { autoSep = null; insert(t); }
  });
  let dragIn = false;
  ed.addEventListener('dragstart', () => { dragIn = true; });
  ed.addEventListener('dragend', () => { dragIn = false; });
  ed.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0) e.preventDefault(); });
  ed.addEventListener('drop', e => {
    if (dragIn) { typingSnap('drag'); return; }   // メモの中で動かすときはブラウザに任せる
    e.preventDefault();
    const fs = imgFiles(e.dataTransfer);
    const t = fs.length ? '' : (e.dataTransfer ? e.dataTransfer.getData('text/plain') : '');
    if (!fs.length && !t) return;
    let r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(e.clientX, e.clientY);
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
    if (r && ed.contains(r.startContainer)) saved = r;
    autoSep = null;
    if (fs.length) addPhotos(fs); else insert(t);
  });
  ed.addEventListener('blur', () => { composing = false; if (blank() && ed.childNodes.length) ed.textContent = ''; });   // 空なら「ここに書けます」を出す

  /* ════ 字数・まだ保存していないしるし ════ */
  let savedSig = '', refreshT = 0, dirty = false;
  function text() { return textOf(scan(ed)); }
  function refresh() {
    const ch = scan(ed), t = textOf(ch), n = ch.filter(c => c.ph).length;
    dirty = htmlOf(ch) !== savedSig;
    const c = $('#count');
    c.textContent = t.length + ' 文字' + (n ? '・写真' + n : '') + (dirty ? '・未保存' : '');
    c.classList.toggle('dirty', dirty);
    $('#save').classList.toggle('dirty', dirty);
  }
  function changed() { clearTimeout(refreshT); refreshT = setTimeout(refresh, 80); }
  // 保存していない中身があるまま閉じようとしたときは、ブラウザに確かめてもらう
  window.addEventListener('beforeunload', e => { refresh(); if (dirty && !blank()) { e.preventDefault(); e.returnValue = ''; } });

  /* ── 使われなくなった写真を片づける（保存したメモ・いまの画面・↶ の中にない写真） ── */
  async function gcPhotos(htmls) {
    if (!PDB.ok) return 0;
    const keep = new Set(keepIds), re = /data-id="(p[0-9a-z]{4,24})"/g;
    const add = h => { let m; re.lastIndex = 0; while ((m = re.exec(String(h || '')))) keep.add(m[1]); };
    (htmls || []).forEach(add);
    add(htmlOf(scan(ed))); undoSt.forEach(s => add(s.h)); redoSt.forEach(s => add(s.h));
    let keys = [], n = 0;
    try { keys = await PDB.keys(); } catch (e) { return 0; }
    for (const k of keys) {
      if (keep.has(k)) continue;
      try { await PDB.del(k); n++; } catch (e) {}
      const u = purl.get(k); if (u) { URL.revokeObjectURL(u); purl.delete(k); }
    }
    return n;
  }

  /* ════ app.js から使う ════ */
  return {
    // 保存しておいた中身を出す（h があれば書式・写真も。h と t が食い違うときは t だけ）
    load(st) {
      const t = st && typeof st.t === 'string' ? st.t.replace(/\r\n?/g, '\n') : '', h = st && typeof st.h === 'string' ? st.h : '';
      let ch = h ? scan(parseHtml(h)) : null;
      if (!ch || textOf(ch) !== t) ch = charsFromText(t);
      selPh = ''; showPhTools(false);
      setChars(ch); saved = null; undoSt = []; redoSt = []; autoSep = null; updUndo();
      savedSig = htmlOf(scan(ed)); clearTimeout(refreshT); refresh();
    },
    // 保存する形：t は文字だけ、h は書式か写真があるときだけ（決まった span だけの HTML）、n は写真の枚数
    dump() { const ch = scan(ed), n = ch.filter(c => c.ph).length; return { t: textOf(ch), h: n || ch.some(c => kCls(c.k)) ? htmlOf(ch) : '', n }; },
    markSaved() { savedSig = htmlOf(scan(ed)); clearTimeout(refreshT); refresh(); },
    // 保存していない変更があるか（📂 呼び出す・＋ 新しく の前に確かめる）
    dirty() { clearTimeout(refreshT); refresh(); return dirty; },
    blank,
    text,
    clear() { if (!blank()) pushUndo(null, 'clear'); unselectPhoto(); ed.textContent = ''; saved = null; autoSep = null; changed(); },
    stop() { stopVoice(); stopSay(); closePop(); unselectPhoto(); },
    gcPhotos,
    // テスト用
    _t: { scan, scanAt, render, htmlOf, htmlDoc, parseHtml, plainOf, onFinal, format, insert, selectRange, selOffsets, ui, isOn: () => on,
      addPhotos, selectPhoto, phSet, phMove, phPlace, phDelete, dropTarget, PDB, sel: () => selPh },
  };
})();
