/* ════════════════════════════════════════════════════════════════
   🔙 戻るの見張り（表電卓 v535。声の計算帳・英単語・メモ・かきじゅん帳に、同じものを1つずつ置く）
   アプリが「意図せず表電卓に戻る」のを防ぐ。
   ・アプリの中で開いた窓は、端末の「戻る」で窓だけ閉じる（アプリごと表電卓へ戻らない）
   ・何も開いていないところで「戻る」を押すと、一度だけ「もう一度「戻る」を押すと表電卓に戻ります」と
     知らせる。画面の端をなぞったときなどの押しまちがいで、急に表電卓へ戻らないように。続けてもう一度で戻る
   ・履歴は「窓が開いている間ずっと1つだけ」積む。窓を閉じた分の back は少し待ってから出し、
     そのあいだに窓を開き直したら打ち消し合う（back は非同期・pushState はすぐなので、順番が入れかわって
     アプリごと戻ってしまうのを防ぐ）。自分の back が終わる前に開いたら、終わってから積む
   ・Chrome は、一度も触れていないページが積んだ履歴を「戻る」で飛ばすので、はじめて触れたときに積む
   ・表電卓から開いたアプリは、うしろに回るときに「使っていた」と書き残す（excalc_resume）。
     スマホがうしろのアプリを閉じたあとに表電卓から開き直すと、表電卓がこのアプリを開き直す
   使い方：BackGuard.setup({app, fromHyo, atRoot, toast}) … はじめに1回
          const t = BackGuard.open(閉じる処理) … 窓を開いたとき（「戻る」で閉じる処理が呼ばれる）
          BackGuard.close(t) … 画面のボタンなどで閉じたとき（何度呼んでもよい）
          BackGuard.watch(要素, 開いているか, 閉じる処理) … 開け閉めを見張って、上の2つを自動で呼ぶ
          BackGuard.take() … 窓を閉じてすぐ自分で履歴を積むとき、積む代わりに置きかえてよいか
          BackGuard.home(url) … 「← 表電卓」：積んだ分をまとめて戻って、表電卓へ
          BackGuard.leaving() … 自分で表電卓のページへ移る直前に（開き直しの印を消す）
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.BackGuard) return;
  const H = window.history;
  const S = {
    stack: [],        // 開いている窓（下から順。いちばん後ろが上の窓）
    skip: 0,          // 自分で back した分（popstate を読み飛ばす）
    flying: 0,        // 自分で出した back で、まだ終わっていない数
    pushAfter: false, // back が終わってから積む
    pending: 0,       // 閉じたあと、少し待ってから back する分
    deferred: false,  // 積みたかったが、まだ一度も触れていないので積めていない
    base: false,      // いちばん下の分（何も開いていないとき用）が積んであるか
    n: 0,             // いまの位置までに、この見張りが積んだ分の数（「← 表電卓」で戻る数）
    app: '', fromHyo: false, atRoot: null, toast: null, leaving: false, seq: 0,
  };
  const acted = () => { const u = navigator.userActivation; return !u || u.hasBeenActive; };
  function push(kind) {
    try { H.pushState({ bg: kind, bgN: S.n + 1 }, ''); S.n++; return true; } catch (e) { return false; }
  }
  function pushModal() {
    if (!acted()) { S.deferred = true; return; }
    if (S.flying) { S.pushAfter = true; return; }
    push('m');
  }
  function pushBase() {
    if (S.base || S.pending || S.flying || S.leaving || !acted()) return;
    if (push('b')) S.base = true;
  }
  const atRoot = () => { try { return !S.atRoot || !!S.atRoot(); } catch (e) { return true; } };

  window.addEventListener('popstate', e => {
    const st = e.state || {};
    S.n = st.bgN || 0;
    S.base = !!st.bg;                       // 戻った先がこの見張りの分なら、いちばん下の分はまだ残っている
    if (S.skip > 0) {                       // 自分で戻した分
      S.skip--; S.flying = Math.max(0, S.flying - 1); e.bgDone = true;
      if (!S.flying && S.pushAfter) { S.pushAfter = false; if (S.stack.length) push('m'); }
      return;
    }
    if (S.leaving) return;
    const top = S.stack.pop();
    if (top) {                              // いちばん上の窓だけ閉じる
      e.bgDone = true;
      try { top.fn(); } catch (er) { setTimeout(() => { throw er; }); }
      if (S.stack.length) pushModal();     // まだ下に開いている窓があるので積み直す
      return;
    }
    if (st.bg) return;                      // まだいちばん下の分の上にいる（アプリの画面の行き来など）
    if (!atRoot()) { setTimeout(pushBase, 0); return; }   // アプリが自分で前の画面へ戻す。いちばん下の分は積み直す
    // 何も開いていないところで「戻る」：いちばん下の分を使い切った。一度だけ知らせる
    e.bgDone = true;
    say(S.fromHyo ? 'もう一度「戻る」を押すと表電卓に戻ります' : 'もう一度「戻る」を押すと閉じます');
  });
  // 画面に触れたとき（ブラウザが「利用者の操作」と認めるとき）に、いちばん下の分と積めていなかった分を積む
  function onAct() {
    if (S.pending || S.flying || S.leaving) return;   // 閉じた分の back がこれから走る。いま積むと取られてしまう
    pushBase();
    if (S.deferred) { S.deferred = false; if (S.stack.length) push('m'); }
  }
  ['pointerup', 'touchend', 'keydown', 'mousedown'].forEach(t => window.addEventListener(t, onAct, true));

  function open(fn) {
    const tok = { fn: fn || function () {}, id: ++S.seq };
    S.stack.push(tok);
    if (S.pending) { S.pending--; return tok; }   // 直前に閉じた分と打ち消し合う（履歴はそのまま）
    if (S.stack.length === 1) pushModal();
    return tok;
  }
  function close(tok) {
    const i = S.stack.indexOf(tok);
    if (i < 0) return false;                      // もう閉じている（「戻る」で閉じたあとなど）
    S.stack.splice(i, 1);
    if (S.stack.length) return true;             // まだ開いている窓があるので、履歴はそのまま
    if (S.deferred) { S.deferred = false; return true; }   // 積めていなかったので戻す分も無い
    if (S.pushAfter) { S.pushAfter = false; return true; } // 積む前だったので戻す分も無い
    S.pending++;
    setTimeout(() => {                            // 閉じてすぐ開いたときに打ち消せるよう、少し待つ
      if (!S.pending) return;                     // 開き直したので取り消し
      S.pending--;
      if (S.stack.length) return;
      S.skip++; S.flying++;
      try { H.back(); } catch (e) { S.skip--; S.flying--; }
    }, 0);
    return true;
  }
  // 窓を閉じてすぐアプリが自分の画面の分を積むとき：閉じた窓の分を使ってもらう（true なら pushState の代わりに replaceState）
  function take() {
    if (!S.pending || S.stack.length) return false;
    S.pending--;
    S.n = Math.max(0, S.n - 1);
    return true;
  }
  // 開け閉めを見張る：開いたら open、閉じたら close を自分で呼ぶ（いくつもの所で開け閉めしているアプリ用）
  function watch(els, isOpen, closeFn) {
    const list = typeof els === 'string' ? Array.from(document.querySelectorAll(els)) : [].concat(els);
    list.forEach(el => {
      if (!el || el._bgWatch) return;
      el._bgWatch = true;
      const sync = () => {
        const on = !!isOpen(el);
        if (on && !el._bgTok) el._bgTok = open(() => { el._bgTok = null; closeFn(el); });
        else if (!on && el._bgTok) { const t = el._bgTok; el._bgTok = null; close(t); }
      };
      try { new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] }); } catch (e) {}
      sync();
    });
  }
  function home(url) {
    S.leaving = true; noteLeave();
    const k = S.n + 1;                            // 積んだ分 ＋ このアプリのはじめの分
    if (S.fromHyo && H.length > k) {
      let gone = false;
      window.addEventListener('pagehide', () => { gone = true; }, { once: true });
      try { H.go(-k); } catch (e) { location.href = url; return; }
      setTimeout(() => { if (!gone) location.href = url; }, 900);   // 戻れなかったときは、表電卓のページへ移る
      return;
    }
    location.href = url;
  }

  /* ── 表電卓から開いたアプリ：うしろに回るときに「使っていた」と書き残す（表電卓が開き直す） ── */
  const RESUME = 'excalc_resume';
  function noteUse() {
    if (!S.fromHyo || S.leaving || !S.app) return;
    try { localStorage.setItem(RESUME, JSON.stringify({ app: S.app, t: Date.now() })); } catch (e) {}
  }
  function noteLeave() { try { localStorage.removeItem(RESUME); } catch (e) {} }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') noteUse(); });

  function setup(o) {
    o = o || {};
    S.app = o.app || S.app; S.fromHyo = !!o.fromHyo;
    if (o.atRoot) S.atRoot = o.atRoot;
    if (o.toast) S.toast = o.toast;
    const st = H.state || {};                   // 読み込み直したとき：前に積んだ分の上にいるかもしれない
    S.n = st.bgN || 0; S.base = !!st.bg;
  }

  /* ── 知らせ（アプリの toast があればそれを使う） ── */
  let toastEl = null, toastT = 0;
  function say(msg) {
    if (S.toast) { try { S.toast(msg); return; } catch (e) {} }
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'bg-toast'; toastEl.setAttribute('role', 'status');
      const s = toastEl.style;
      s.position = 'fixed'; s.left = '50%'; s.bottom = 'calc(92px + env(safe-area-inset-bottom, 0px))'; s.transform = 'translateX(-50%)';
      s.zIndex = '2147483000'; s.background = 'rgba(30,41,59,.95)'; s.color = '#fff'; s.padding = '10px 18px';
      s.borderRadius = '22px'; s.fontSize = '14px'; s.fontWeight = '700'; s.lineHeight = '1.4'; s.textAlign = 'center';
      s.maxWidth = 'calc(100vw - 32px)'; s.boxShadow = '0 6px 20px rgba(0,0,0,.25)'; s.pointerEvents = 'none';
      s.transition = 'opacity .2s'; s.opacity = '0';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg; toastEl.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.style.opacity = '0'; }, 2600);
  }

  // アプリから表電卓のページへ自分で移るとき（「🧮 電卓」など）：うしろに回った印を残さない
  function leaving() { S.leaving = true; noteLeave(); }

  window.BackGuard = { setup, open, close, take, watch, home, leaving, say, isOpen: () => S.stack.length > 0, _s: S };
})();
