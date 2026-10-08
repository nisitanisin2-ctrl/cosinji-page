/* ════════════════════════════════════════════════════════════════
   🎓 算数・数学チャレンジ：画面とゲーム
   ・ホーム（学年 → 単元）→ 10問のステージ → けっか（★）
   ・答えは □ に タイルで 当てはめるか、🎤 で 言う。🦉 ヒントで とき方を 1つずつ
   ・XP と レベル、つづけた 日数（🔥）、タイムアタック（60びょう）
   ・キーと ヒントの ボタンは 画面の 下に 固定（ドック）。ヒントが ふえても すぐ 打てる
   ボタンには プログラムを 書かず、data-act で ここから 動かす（CSP で ページの中の プログラムを 止めているため）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU, { esc, mathHtml, speakMath } = S, V = S.voice;
const $ = id => document.getElementById(id);
const STAGE_N = 10, TA_SEC = 60, SEEN_VER_KEY = 'sansu_seen_ver';
const GR = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3'];
const TITLES = [[1, '🥚 たまご'], [2, '🐣 ひよこ'], [3, '🐥 ことり'], [5, '🐦 はばたき'], [8, '🦅 わし'], [12, '🦉 ちえの ふくろう'], [16, '🧙 すうがくの まほうつかい'], [25, '👑 すうがく王']];
const PRAISE = ['せいかい！', 'すごい！', 'よくできました！', 'ばっちり！', 'その ちょうし！', 'かんぺき！'];
const unitById = id => S.UNITS.find(u => u.id === id) || null;
const unitsOf = g => S.UNITS.filter(u => u.g === g);
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => window.SANSU_TODAY || ymd(new Date());
const yesterday = () => { const d = new Date(today() + 'T12:00:00'); d.setDate(d.getDate() - 1); return ymd(d); };

/* ── きろく ── */
let st = S.store.load();
const save = () => S.store.save(st);

/* ── レベル ── */
const need = lv => 50 * lv * (lv - 1);                 // Lv.lv に なるまでの XP（合計）
const levelOf = xp => { let lv = 1; while(xp >= need(lv + 1)) lv++; return lv; };
const titleOf = lv => { let t = TITLES[0][1]; for(const [l, s] of TITLES) if(lv >= l) t = s; return t; };
const streakNow = () => (st.days.last === today() || st.days.last === yesterday()) ? st.days.run : 0;
function touchDay(){
  const t = today();
  if(st.days.last !== t){ st.days.run = st.days.last === yesterday() ? st.days.run + 1 : 1; st.days.last = t; st.days.best = Math.max(st.days.best, st.days.run); }
  st.day = {d: t, n: (st.day.d === t ? st.day.n : 0) + 1};
}
function renderTop(){
  const lv = levelOf(st.xp), a = need(lv), b = need(lv + 1);
  $('hdLv').textContent = `Lv.${lv} ${titleOf(lv).split(' ')[0]}`;
  $('hdXp').style.width = Math.round((st.xp - a) / (b - a) * 100) + '%';
  $('hdStreak').textContent = '🔥 ' + streakNow();
  document.body.classList.toggle('big', !!st.set.big);
}

/* ── 画面の行き来（スマホの「戻る」で 前の画面へ） ── */
let view = {s: 'home'};
const depth = () => (history.state && history.state.d) || 1;
function go(s, extra, replace){
  view = Object.assign({s}, extra || {});
  const state = Object.assign({}, view, {d: replace ? depth() : depth() + 1});
  try { if(replace) history.replaceState(state, '', '#' + s); else history.pushState(state, '', '#' + s); } catch(_){}
  render();
}
function render(){
  document.body.classList.toggle('playing', view.s === 'play');
  document.querySelectorAll('#nav [data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === view.s || (view.s === 'ex' && b.dataset.s === 'home')));
  ({home: renderHome, ex: renderEx, play: renderPlay, result: renderResult, rec: renderRec, set: renderSet}[view.s] || renderHome)();
  renderTop();
  if(view.s !== 'play') window.scrollTo(0, 0);
}
window.addEventListener('popstate', e => {
  if(!$('modal').hidden){ closeModalNow(); return; }   // 窓だけ 閉じる
  const s = e.state && e.state.s ? e.state : {s: 'home', d: 1};
  if(view.s === 'play' && s.s !== 'play') endSession();
  if(s.s === 'play' && !(ses && ses.p && !ses.result)){ go('home', {}, true); return; }   // おわった 問題には 戻らない
  if(s.s === 'result' && !(ses && ses.result)){ go('home', {}, true); return; }
  view = s; render();
});
/* 表電卓から 開いたときは、表電卓へ 戻る */
let fromHyo = false;
try { if(/from=hyo/.test(location.hash)) sessionStorage.setItem('sansu_from_hyo', '1'); fromHyo = sessionStorage.getItem('sansu_from_hyo') === '1'; } catch(_){}
function toHyo(){
  endSession();
  const url = '../' + (location.protocol === 'file:' ? 'index.html' : '');
  if(fromHyo && history.length > 1){ const here = location.href; history.go(-depth()); setTimeout(() => { if(location.href === here) location.href = url; }, 600); }
  else location.href = url;
}

/* ── 窓・トースト・下の お知らせ ── */
let modalOnClose = null;
function openModal(html, onClose){
  $('mbody').innerHTML = html; $('modal').hidden = false; modalOnClose = onClose || null;
  try { history.pushState(Object.assign({}, view, {d: depth() + 1, m: 1}), '', location.hash); } catch(_){}
}
function closeModalNow(){ $('modal').hidden = true; $('mbody').innerHTML = ''; const f = modalOnClose; modalOnClose = null; if(f) f(); }
const closeModal = () => { if(!$('modal').hidden) history.back(); };
let toastT = null;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
let noticeAct = null;
function showNotice(o){
  const el = $('notice'); noticeAct = o;
  el.innerHTML = `<div class="nb-t">${esc(o.title)}</div>${o.sub ? `<div class="nb-s">${esc(o.sub)}</div>` : ''}<div class="nb-row"><button type="button" class="btn sub" data-act="nb-no">${esc(o.no || 'あとで')}</button><button type="button" class="btn" data-act="nb-yes">${esc(o.yes || 'OK')}</button></div>`;
  requestAnimationFrame(() => el.classList.add('show'));
}
function hideNotice(){ $('notice').classList.remove('show'); }

/* ── 音（端末の中で 作る短い音） ── */
let actx = null;
function beep(kind){
  if(!st.set.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = {ok: [660, 880], ng: [220, 165], near: [520], up: [523, 659, 784, 1047], star: [784, 988, 1175]}[kind] || [440];
    let t = actx.currentTime;
    notes.forEach(f => { const o = actx.createOscillator(), g = actx.createGain(); o.type = kind === 'ng' ? 'square' : 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'ng' ? 0.06 : 0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.2); t += 0.1; });
  } catch(_){}
}
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_){ return false; } };
function celebrate(mark, pts){
  const fx = $('fx'); fx.innerHTML = '';
  const m = document.createElement('div'); m.className = 'bigmark'; m.textContent = mark; fx.appendChild(m);
  if(pts){ const p = document.createElement('div'); p.className = 'plus'; p.textContent = '+' + pts; fx.appendChild(p); }
  if(!reduceMotion()){ const E = ['✨', '🎉', '⭐', '🌟', '💮']; for(let i = 0; i < 10; i++){ const c = document.createElement('span'); c.className = 'cf'; c.textContent = E[i % E.length];
    c.style.left = (40 + Math.random() * 20) + '%'; c.style.setProperty('--dx', (Math.random() * 260 - 130) + 'px'); c.style.setProperty('--dy', (-80 - Math.random() * 200) + 'px'); c.style.setProperty('--rot', (Math.random() * 360) + 'deg'); fx.appendChild(c); } }
  setTimeout(() => { fx.innerHTML = ''; }, 1200);
}

/* ── 読み上げ ── */
function speakQ(){
  if(!ses || !ses.p) return;
  const p = ses.p;
  V.speak(speakMath(p.q) + '。' + speakMath(p.form), () => { if(st.set.voice && ses && ses.p === p && !ses.answered && view.s === 'play') listen(); });
}

/* ── 声で 答える ── */
function setHeard(s){ const h = $('heard'); if(h) h.textContent = s || ''; }
function listen(){
  if(!ses || !ses.p || ses.answered) return;
  if(V.listening()){ V.stop(); drawActs(); return; }
  const p = ses.p;
  V.listen({
    onStart: () => { drawActs(); setHeard('🎤 どうぞ。こたえを 言ってね'); clearConfirm(); },
    onInterim: t => setHeard('🎤 ' + t),
    onFinal: alts => heardFinal(alts, p),
    onError: code => { const m = S.voiceErrMsg(code); if(code === 'no-speech') setHeard(m); else if(m) toast(m); },
    onEnd: () => { if(view.s === 'play' && ses && ses.p) drawActs(); },
  });
}
/* 聞き取れなかった 言葉は さいきんの 20こを のこす（🎤 声の ためし で 見られる） */
function logUnheard(text, p){
  if(!text) return;
  st.vlog.push({t: String(text).slice(0, 60), f: S.plainForm(p.form).slice(0, 60), d: today()});
  st.vlog = st.vlog.slice(-20); save();
}
/* 聞こえた 言葉（候補いくつか）から、□に 入る 答えを さがす */
function heardFinal(alts, p){
  if(!ses || ses.p !== p || ses.answered) return false;
  for(const a of alts){
    const v = S.fromSpeech(p, a);
    if(v && v.length === p.kinds.length){
      ses.vals = v; ses.byVoice = true; setHeard('🎤「' + a + '」'); drawForm();
      if(st.set.vconf){ showConfirm(); return true; }
      setTimeout(() => { if(ses && ses.p === p && !ses.answered) submit(); }, 450);
      return true;
    }
  }
  setHeard('🎤「' + (alts[0] || '') + '」と 聞こえたよ。答えの 数が わからなかった…');
  logUnheard(alts[0], p);
  return false;
}
/* 「これで いい？」（せってい で えらんだ とき） */
function showConfirm(){
  const c = $('vconf'); if(!c) return;
  c.innerHTML = '<span>これで いい？</span><button type="button" class="btn" data-act="vok">✔ こたえる</button><button type="button" class="btn sub" data-act="mic">🎤 もう一度</button>';
  c.hidden = false;
}
function clearConfirm(){ const c = $('vconf'); if(c){ c.hidden = true; c.innerHTML = ''; } }

/* ════════════ ゲーム ════════════ */
let ses = null, taTimer = null;
function newSes(mode, opt){
  V.stop(); V.stopSpeak(); clearInterval(taTimer);
  ses = Object.assign({mode, i: 0, n: mode === 'ta' ? Infinity : STAGE_N, done: [], score: 0, combo: 0, maxCombo: 0, xp: 0, ok: 0, clean: 0, keys: new Set(), t0: Date.now(), lv0: levelOf(st.xp), lastU: ''}, opt);
}
function endSession(){ V.stop(); V.stopSpeak(); clearInterval(taTimer); if(ses && !ses.result) ses = null; }
function startStage(id){ const u = unitById(id); if(!u) return; newSes('unit', {u: id, g: u.g}); nextProblem(true); go('play'); autoVoice(); }
function startMix(){ newSes('mix', {g: st.set.grade}); nextProblem(true); go('play'); autoVoice(); }
function startTA(id){
  const u = unitById(id); if(!u) return;
  newSes('ta', {u: id, g: u.g, end: Date.now() + TA_SEC * 1000}); nextProblem(true); go('play'); autoVoice();
  taTimer = setInterval(() => {
    if(!ses || ses.mode !== 'ta' || ses.result){ clearInterval(taTimer); return; }
    const left = ses.end - Date.now(), bar = $('taBar');
    if(bar) bar.style.width = Math.max(0, left / (TA_SEC * 1000) * 100) + '%';
    if(left <= 0){ clearInterval(taTimer); finish(); }
  }, 200);
}
function pickUnit(){
  if(ses.mode !== 'mix') return unitById(ses.u);
  const us = unitsOf(ses.g); let u;
  do { u = us[Math.floor(Math.random() * us.length)]; } while(us.length > 1 && u.id === ses.lastU);
  ses.lastU = u.id; return u;
}
function nextProblem(silent){
  if(!ses) return;
  if(ses.mode !== 'ta' && ses.done.length >= ses.n){ finish(); return; }
  const u = pickUnit(); let p, k = 0;
  do { p = S.makeProblem(u); } while(ses.keys.has(p.key) && ++k < 25);
  ses.keys.add(p.key);
  Object.assign(ses, {p, vals: p.kinds.map(() => ''), act: 0, tries: 0, hints: 0, revealed: false, answered: false, byVoice: false});
  if(!silent){ renderPlay(); window.scrollTo(0, 0); autoVoice(); }
}
function autoVoice(){
  if(!ses || !ses.p) return;
  if(st.set.read) speakQ();
  else if(st.set.voice) setTimeout(() => { if(ses && ses.p && !ses.answered && view.s === 'play' && !V.listening()) listen(); }, 350);
}

/* ── 問題の画面 ── */
function renderPlay(){
  if(!ses || !ses.p){ go('home', {}, true); return; }
  const p = ses.p, u = unitById(p.unit), ta = ses.mode === 'ta';
  const segs = ta ? '<div class="tbar"><div id="taBar"></div></div>'
                  : `<div class="segs">${Array.from({length: ses.n}, (_, i) => `<i class="${ses.done[i] || (i === ses.done.length ? 'now' : '')}"></i>`).join('')}</div>`;
  $('main').innerHTML = `
    <div class="pbar"><button type="button" class="x" data-act="quit" aria-label="やめる">✕</button>
      <div class="pt">${esc(GR[u.g - 1])}　${esc(u.t)}${ses.mode === 'mix' ? '（ミックス）' : ses.mode === 'ta' ? '（⏱）' : ''}</div>
      <div class="sc">${ta ? '✔ ' + ses.ok : Math.min(ses.done.length + 1, ses.n) + ' / ' + ses.n}</div>
      <div class="cb" id="pCombo">${ses.combo >= 2 ? '🔥×' + ses.combo : ''}</div>
      <div class="sc" id="pScore">⭐${ses.score}</div></div>
    ${segs}
    <div class="qcard" id="qcard">
      <div class="qtext">${mathHtml(p.q)}</div>
      ${p.fig ? `<div class="qfig">${p.fig}</div>` : ''}
      <div class="qform" id="qform"></div>
      ${p.note ? `<div class="qnote">${mathHtml(p.note)}</div>` : ''}
      <div class="fb" id="fb" aria-live="polite"></div>
      <div class="heard" id="heard"></div>
      <div class="vconf" id="vconf" hidden></div>
      <div id="after"></div>
    </div>
    <div class="hints" id="hints"></div>
    <div class="dock" id="dock"><div class="acts" id="acts"></div><div class="keys" id="keys"></div></div>`;
  for(let i = 0; i < ses.hints; i++) appendHint(i, true);
  drawForm(); drawActs(); drawKeys();
  if(ses.answered) drawAfter();
  fitDock();
}
/* ドックの 高さを おぼえて、ヒントや 答えが ドックの 下に かくれないように する */
function fitDock(){ const d = $('dock'); if(d) document.documentElement.style.setProperty('--dock-h', d.offsetHeight + 'px'); }
window.addEventListener('resize', fitDock);
function drawForm(){
  const q = $('qform'); if(!q || !ses) return;
  // 長い 式は 字を 小さく。「… → x = □」の → から 先は 次の 行に
  const f = ses.p.form, len = f.replace(/\[\[|\]\]|√\[|\]|\*\*/g, '').replace(/\{\d+\}/g, '___').split('→').reduce((m, x) => Math.max(m, x.trim().length), 0);
  q.classList.toggle('long', len > 17); q.classList.toggle('xlong', len > 24);
  q.innerHTML = mathHtml(f.replace(/[\s　]*→[\s　]*/g, '\n'), {blank: i => {
    const v = ses.vals[i] || '', cls = ses.answered ? (ses.revealed ? ' rev' : ' done') : (i === ses.act ? ' on' : '');
    return `<button type="button" class="bx${cls}" data-act="blank" data-i="${i}" aria-label="${i + 1}つめの □${v ? '：' + esc(v) : '（から）'}">${v ? esc(v) : '&#8203;'}</button>`;
  }});
}
function drawActs(){
  const a = $('acts'); if(!a || !ses) return;
  const n = ses.p.steps.length, ta = ses.mode === 'ta', on = V.listening();
  const hl = ses.answered ? '<span>🦉</span>とき方' : ses.hints < n ? `<span>🦉</span>ヒント ${ses.hints}/${n}` : '<span>💡</span>こたえ';
  a.innerHTML = `<button type="button" data-act="read"><span>🔊</span>よむ</button>`
    + `<button type="button" data-act="hint" id="hintBtn"${ses.tries && !ses.hints && !ses.answered ? ' class="pulse"' : ''}>${hl}</button>`
    + (ta ? `<button type="button" data-act="pass"${ses.answered ? ' disabled' : ''}><span>⏭</span>パス</button>` : `<button type="button" data-act="pex"><span>📖</span>かいせつ</button>`)
    + `<button type="button" class="mic${on ? ' on' : ''}" data-act="mic"${ses.answered ? ' disabled' : ''}><span>🎤</span>${on ? 'きいてるよ' : 'こえで'}</button>`;
}
function drawKeys(){
  const k = $('keys'); if(!k || !ses) return;
  if(ses.answered){
    const last = ses.mode !== 'ta' && ses.done.length >= ses.n;
    k.innerHTML = `<button type="button" class="btn next" data-act="next" style="grid-column:1/-1">${last ? '🏁 けっかを 見る' : 'つぎへ ▶'}</button>`;
    fitDock(); return;
  }
  const ks = ses.p.kinds, neg = ks.some(x => x !== 'n'), pls = ks.some(x => x === 't' || x === 'tc'), dot = ks.includes('d'), multi = ks.length > 1;
  const b = (key, lbl, cls, dis, al) => `<button type="button" class="${cls || ''}" data-act="key" data-k="${key}"${dis ? ' disabled' : ''}${al ? ` aria-label="${al}"` : ''}>${lbl}</button>`;
  k.innerHTML = b('7', '7') + b('8', '8') + b('9', '9') + b('bs', '⌫', 'op', false, 'けす')
    + b('4', '4') + b('5', '5') + b('6', '6') + b('−', '−', 'op', !neg, 'マイナス')
    + b('1', '1') + b('2', '2') + b('3', '3') + b('+', '＋', 'op', !pls, 'プラス')
    + b('0', '0') + b('.', '.', 'op', !dot, 'しょうすうてん') + b('nx', 'つぎの□', 'mv', !multi) + b('ok', 'こたえる', 'go');
  fitDock();
}
function drawAfter(){
  const a = $('after'); if(!a || !ses || ses.mode === 'ta') return;
  const p = ses.p;
  a.innerHTML = `<div class="ansline">${mathHtml(p.answer)}</div>`
    + (ses.hints < p.steps.length ? `<details class="how"><summary>🦉 とき方を ぜんぶ 見る</summary><div class="hints">${p.steps.map(stepHtml).join('')}</div></details>` : '');
}
const stepHtml = s => { const t = typeof s === 'string' ? s : s.t, fig = typeof s === 'string' ? '' : (s.fig || ''); return `<div class="hint"><span class="ow">🦉</span><div class="hb">${mathHtml(t)}${fig}</div></div>`; };
function appendHint(i, quiet){
  const h = $('hints'); if(!h) return;
  const s = ses.p.steps[i]; h.insertAdjacentHTML('beforeend', stepHtml(s));
  if(!quiet){ revealAboveDock(h.lastElementChild, true);
    if(st.set.read) V.speak(speakMath(typeof s === 'string' ? s : s.t)); }
}
function setFb(msg, cls){ const f = $('fb'); if(f){ f.textContent = msg; f.className = 'fb' + (cls ? ' ' + cls : ''); } }
function setAct(i){ if(!ses || ses.answered) return; ses.act = i; drawForm(); }
/* el が 下の ドック（キー）に かくれていたら、見える ところまで ずらす（長い ものは 上を そろえる） */
function revealAboveDock(el, smooth){
  if(!el) return;
  const d = $('dock'), r = el.getBoundingClientRect(), lim = (d ? d.getBoundingClientRect().top : innerHeight) - 8, head = $('top').offsetHeight + 8;
  let dy = r.bottom > lim ? r.bottom - lim : 0;
  if(r.top - dy < head) dy = r.top - head;
  if(Math.abs(dy) > 1) window.scrollBy({top: dy, behavior: smooth && !reduceMotion() ? 'smooth' : 'auto'});
}
const showCard = () => revealAboveDock($('qcard'));

/* タイルを おしたとき */
function keyIn(k){
  if(!ses || !ses.p) return;
  if(ses.answered){ if(k === 'ok') nextProblem(); return; }
  const p = ses.p, i = ses.act, kind = p.kinds[i]; let v = ses.vals[i] || '';
  if(k === 'ok'){ submit(); return; }
  if(k === 'nx'){ setAct((i + 1) % p.kinds.length); return; }
  if(k === 'bs'){ if(v) v = v.slice(0, -1); else { if(i > 0) setAct(i - 1); return; } }
  else if(k === '−'){ if(kind === 'n') return; if(kind === 't' || kind === 'tc') v = '−' + v.replace(/^[+−]/, ''); else v = v.startsWith('−') ? v.slice(1) : '−' + v; }
  else if(k === '+'){ if(kind !== 't' && kind !== 'tc') return; v = '+' + v.replace(/^[+−]/, ''); }
  else if(k === '.'){ if(kind !== 'd' || v.includes('.')) return; v = (v === '' || v === '−') ? v + '0.' : v + '.'; }
  else if(/^\d$/.test(k)){ if(v.replace(/\D/g, '').length >= 7) return; v += k; }
  else return;
  ses.vals[i] = v; ses.byVoice = false; setFb(''); clearConfirm(); drawForm();
}
function submit(){
  const p = ses.p;
  clearConfirm();
  const miss = ses.vals.findIndex((v, i) => v === '' && !S.blankMayBeEmpty(p.kinds[i]));
  if(miss >= 0){ setAct(miss); setFb('まだ あいている □ が あるよ', 'near'); return; }
  const r = S.check(p, ses.vals);
  if(r.ok){ correct(); return; }
  if(r.near){ setFb('🤏 ' + r.msg, 'near'); beep('near'); return; }
  wrong(r.msg);
}
function correct(){
  V.stop();
  const ta = ses.mode === 'ta', clean = !ses.tries && !ses.hints, lvBefore = levelOf(st.xp);
  ses.answered = true; ses.combo++; ses.maxCombo = Math.max(ses.maxCombo, ses.combo);
  let pts = ta ? 5 : clean ? 10 : ses.hints ? 4 : 6;
  if(!ta && ses.combo >= 3) pts += Math.min(10, ses.combo - 1);
  ses.score += pts; ses.xp += pts; ses.ok++; if(clean) ses.clean++;
  ses.done.push(clean ? 'c' : 'h');
  st.xp += pts; st.solved++; st.ok++; touchDay(); save();
  beep('ok'); celebrate('⭕', pts);
  if(levelOf(st.xp) > lvBefore){ setTimeout(() => { beep('up'); toast(`🎉 レベルアップ！ Lv.${levelOf(st.xp)} ${titleOf(levelOf(st.xp))}`); }, 500); }
  renderTop();
  if(ta){ setTimeout(() => { if(ses && ses.mode === 'ta' && !ses.result) nextProblem(); }, 380); renderPlay(); return; }
  setFb('⭕ ' + PRAISE[Math.floor(Math.random() * PRAISE.length)] + (clean ? '' : '（ヒントあり）'), 'ok');
  $('qcard').classList.add('ok');
  const sc = $('pScore'), cb = $('pCombo'); if(sc) sc.textContent = '⭐' + ses.score; if(cb) cb.textContent = ses.combo >= 2 ? '🔥×' + ses.combo : '';
  document.querySelectorAll('.segs i').forEach((el, i) => { el.className = ses.done[i] || ''; });
  drawForm(); drawActs(); drawKeys(); drawAfter(); showCard();
  if(st.set.read) V.speak(PRAISE[0]);
}
function wrong(msg){
  ses.tries++; ses.combo = 0; beep('ng');
  const c = $('qcard'); c.classList.remove('ng'); void c.offsetWidth; c.classList.add('ng');
  const heard = ses.byVoice ? '（声で 答えた ときは、聞きまちがいかも。□を たしかめてね）' : '';
  setFb('❌ ' + (msg && msg !== '書き方を たしかめてね' ? msg : 'ちがうよ。もう一度 考えてみよう') + heard, 'ng');
  const cb = $('pCombo'); if(cb) cb.textContent = '';
  drawActs(); showCard();
}
function hint(){
  if(!ses || !ses.p) return;
  if(ses.answered){ const d = document.querySelector('details.how'); if(d){ d.open = !d.open; if(d.open) revealAboveDock(d, true); } else { const h = $('hints'); if(h && h.lastElementChild) revealAboveDock(h.lastElementChild, true); } return; }
  if(ses.hints < ses.p.steps.length){ appendHint(ses.hints); ses.hints++; drawActs(); return; }
  reveal();
}
function reveal(){
  V.stop(); clearConfirm();
  ses.revealed = true; ses.answered = true; ses.combo = 0; ses.vals = ses.p.ans.slice(); ses.done.push('r'); st.solved++; save();
  setFb('💡 こたえは こう なるよ。つぎは できるかな？', 'near');
  if(ses.mode === 'ta'){ setTimeout(() => { if(ses && ses.mode === 'ta' && !ses.result) nextProblem(); }, 1500); }
  document.querySelectorAll('.segs i').forEach((el, i) => { el.className = ses.done[i] || ''; });
  drawForm(); drawActs(); drawKeys(); drawAfter(); showCard();
  if(st.set.read) V.speak(speakMath(ses.p.answer));
}
function pass(){ if(!ses || ses.answered) return; ses.combo = 0; nextProblem(); }
function finish(){
  V.stop(); V.stopSpeak(); clearInterval(taTimer);
  const lv1 = levelOf(st.xp), r = {lv0: ses.lv0, lv1, sec: Math.round((Date.now() - ses.t0) / 1000)};
  if(ses.mode === 'ta'){ const best = st.ta[ses.u] || 0; r.best = Math.max(best, ses.ok); r.newBest = ses.ok > best; st.ta[ses.u] = r.best; }
  else {
    r.stars = ses.clean >= 9 ? 3 : ses.clean >= 7 ? 2 : ses.ok >= 5 ? 1 : 0;
    if(ses.mode === 'unit'){ const x = st.units[ses.u] || {s: 0, n: 0, ok: 0, tot: 0, c: 0}; r.oldStars = x.s;
      st.units[ses.u] = {s: Math.max(x.s, r.stars), n: x.n + 1, ok: x.ok + ses.ok, tot: x.tot + ses.n, c: x.c + ses.clean}; }
  }
  save(); ses.result = r;
  if(r.stars) setTimeout(() => beep('star'), 300);
  go('result', {}, true);
}

/* ════════════ 画面 ════════════ */
const greet = () => { const h = new Date().getHours(); return h < 10 ? 'おはよう！' : h < 17 ? 'こんにちは！' : 'こんばんは！'; };
const starsOf = id => (st.units[id] || {}).s || 0;
const starStr = s => '★'.repeat(s) + `<span class="off">${'★'.repeat(3 - s)}</span>`;
function recommend(g){ const us = unitsOf(g); return us.find(u => starsOf(u.id) < 3) || us[Math.floor(Math.random() * us.length)]; }
function renderHome(){
  const g = st.set.grade, us = unitsOf(g), rc = recommend(g), gs = gg => unitsOf(gg).reduce((s, u) => s + starsOf(u.id), 0);
  $('main').innerHTML = `
    <div class="hello"><span>${greet()}</span><span>きょう とけた 問題：${st.day.d === today() ? st.day.n : 0}</span></div>
    <div class="grades" role="tablist" aria-label="学年">${GR.map((l, i) => `<button type="button" role="tab" class="${i + 1 === g ? 'on' : ''}" aria-selected="${i + 1 === g}" data-act="grade" data-g="${i + 1}">${l}<span class="gs">★${gs(i + 1)}</span></button>`).join('')}</div>
    <button type="button" class="hero" data-act="unit" data-u="${rc.id}"><span class="ic">${rc.ic}</span><span><span class="tt">▶ きょうの チャレンジ</span><br><span class="nm">${esc(rc.t)}</span></span></button>
    <div class="modes"><button type="button" data-act="mix">🎲 ミックス<small>${GR[g - 1]}の いろいろな 問題を 10問</small></button><button type="button" data-act="tapick">⏱ タイムアタック<small>${TA_SEC}びょうで 何問 とける？</small></button></div>
    <div class="units">${us.map(u => `<div class="unit${starsOf(u.id) >= 3 ? ' done3' : ''}" role="button" tabindex="0" data-act="unit" data-u="${u.id}" aria-label="${esc(u.t)}（★${starsOf(u.id)}）"><span class="ic">${u.ic}</span><span class="nm">${esc(u.t)}</span>${st.ta[u.id] ? `<span class="ta">⏱${st.ta[u.id]}</span>` : ''}<span class="st">${starStr(starsOf(u.id))}</span><button type="button" class="ex" data-act="ex" data-u="${u.id}" aria-label="${esc(u.t)}の 解説">📖 解説</button></div>`).join('')}</div>`;
  const on = document.querySelector('.grades .on'); if(on) try { on.scrollIntoView({inline: 'center', block: 'nearest'}); } catch(_){}
}
const exHtml = u => u.ex.map(([k, v]) => { const s = typeof v === 'function' ? v() : v;
  if(k === 'fig') return `<div class="figw">${s}</div>`; if(k === 'eg') return `<div class="eg">${mathHtml(s)}</div>`;
  if(k === 'tip') return `<div class="tip">💡 ${mathHtml(s)}</div>`; return `<p>${mathHtml(s)}</p>`; }).join('');
function renderEx(){
  const u = unitById(view.u); if(!u){ go('home', {}, true); return; }
  $('main').innerHTML = `<div class="page-h"><button type="button" class="back" data-act="back" aria-label="もどる">←</button><h2>${u.ic} ${esc(u.t)}<small style="font-weight:600;color:var(--sub);font-size:.75rem">　${GR[u.g - 1]}</small></h2></div>
    <div class="exbox">${exHtml(u)}</div>
    <button type="button" class="btn wide" data-act="unit" data-u="${u.id}">▶ この 単元の 問題を とく（${STAGE_N}問）</button>
    ${u.ta ? `<button type="button" class="btn sub wide" data-act="ta" data-u="${u.id}">⏱ タイムアタック（${TA_SEC}びょう）</button>` : ''}`;
}
function openExModal(id){ const u = unitById(id); if(!u) return; openModal(`<div class="page-h"><h2>📖 ${u.ic} ${esc(u.t)}</h2></div><div class="exbox">${exHtml(u)}</div><button type="button" class="btn wide" data-act="mclose">とじる</button>`); }
function openTaPicker(){
  const g = st.set.grade, list = unitsOf(g).filter(u => u.ta), us = list.length ? list : unitsOf(g);
  openModal(`<div class="page-h"><h2>⏱ タイムアタック（${GR[g - 1]}）</h2></div><p style="margin:0 0 8px;color:var(--sub);font-size:.9rem">${TA_SEC}びょうで 何問 とけるかな？ 単元を えらんでね。</p>
    <div class="units">${us.map(u => `<div class="unit" role="button" tabindex="0" data-act="ta" data-u="${u.id}"><span class="ic">${u.ic}</span><span class="nm">${esc(u.t)}</span><span class="st" style="color:var(--sub);font-size:.85rem">ベスト ${st.ta[u.id] || 0}問</span></div>`).join('')}</div>
    <button type="button" class="btn sub wide" data-act="mclose">とじる</button>`);
}
function renderResult(){
  if(!ses || !ses.result){ go('home', {}, true); return; }
  const r = ses.result, u = ses.u ? unitById(ses.u) : null, ta = ses.mode === 'ta';
  const msg = ta ? (r.newBest ? '🎉 ベスト きろく こうしん！' : 'おつかれさま！') : ['もう すこし！ ヒントを 見ながら やってみよう', 'よく がんばったね！', 'すごい！ あと すこしで ★3つ', 'パーフェクト！ ★3つ！'][r.stars];
  let next = null;
  if(ses.mode === 'unit' && u){ const all = S.UNITS, k = all.indexOf(u); next = all[k + 1] || null; }
  $('main').innerHTML = `<div class="res">
    ${ta ? `<div class="big" style="color:var(--accent)">⏱ ${ses.ok}問</div>` : `<div class="big"><span>${r.stars >= 1 ? '★' : '<span class="off">★</span>'}</span><span>${r.stars >= 2 ? '★' : '<span class="off">★</span>'}</span><span>${r.stars >= 3 ? '★' : '<span class="off">★</span>'}</span></div>`}
    <div class="msg">${msg}</div>
    <table>${ta ? `<tr><td>とけた 問題</td><td>${ses.ok}問</td></tr><tr><td>ベスト</td><td>${r.best}問</td></tr>`
      : `<tr><td>せいかい</td><td>${ses.ok} / ${ses.n}</td></tr><tr><td>ヒントなしで せいかい</td><td>${ses.clean}</td></tr><tr><td>さいだい れんぞく</td><td>🔥${ses.maxCombo}</td></tr><tr><td>かかった 時間</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}びょう</td></tr>`}
      <tr><td>もらった XP</td><td>+${ses.xp}</td></tr></table>
    ${r.lv1 > r.lv0 ? `<div class="lvup">🎉 レベルアップ！ Lv.${r.lv1} ${titleOf(r.lv1)}</div>` : ''}
    ${!ta ? '<p style="font-size:.78rem;color:var(--sub);margin:10px 0 0">★1：5問 せいかい　★2：ヒントなしで 7問　★3：ヒントなしで 9問</p>' : ''}
  </div>
  <div class="btnrow"><button type="button" class="btn sub" data-act="again">🔁 もう一度</button>${next && ses.mode === 'unit' ? `<button type="button" class="btn" data-act="unit" data-u="${next.id}">つぎへ ▶<small style="display:block;font-size:.7rem;font-weight:600;opacity:.9">${next.ic} ${esc(next.t)}</small></button>` : ''}</div>
  <button type="button" class="btn sub wide" data-act="nav" data-s="home">🏠 ホームへ</button>`;
}
function renderRec(){
  const lv = levelOf(st.xp), acc = st.solved ? Math.round(st.ok / st.solved * 100) : 0;
  const rows = GR.map((l, i) => { const us = unitsOf(i + 1), s = us.reduce((a, u) => a + starsOf(u.id), 0), m = us.length * 3;
    return `<div class="gbar"><span class="gn">${l}</span><span class="tr"><div style="width:${m ? Math.round(s / m * 100) : 0}%"></div></span><span class="gv">★${s} / ${m}</span></div>`; }).join('');
  const tro = GR.map((l, i) => { const us = unitsOf(i + 1), all1 = us.every(u => starsOf(u.id) >= 1), all3 = us.every(u => starsOf(u.id) >= 3);
    return `<span class="${all1 ? '' : 'off'}">🏅 ${l} ぜんぶ ★1</span><span class="${all3 ? '' : 'off'}">🏆 ${l} ぜんぶ ★3</span>`; }).join('');
  const tas = S.UNITS.filter(u => st.ta[u.id]).map(u => `<div class="kv"><span>${u.ic} ${GR[u.g - 1]} ${esc(u.t)}</span><b>${st.ta[u.id]}問</b></div>`).join('');
  $('main').innerHTML = `
    <div class="box"><h3>${titleOf(lv)}　Lv.${lv}</h3>
      <div class="kv"><span>XP</span><b>${st.xp}（つぎの レベルまで ${need(lv + 1) - st.xp}）</b></div>
      <div class="kv"><span>🔥 つづけて 学んだ 日数</span><b>${streakNow()}日（さいこう ${st.days.best}日）</b></div>
      <div class="kv"><span>とけた 問題</span><b>${st.ok}問</b></div>
      <div class="kv"><span>せいかい りつ（答えを 見なかった 割合）</span><b>${acc}%</b></div></div>
    <div class="box"><h3>⭐ 学年ごとの ★</h3>${rows}</div>
    <div class="box"><h3>🏆 トロフィー</h3><div class="trophies">${tro}</div></div>
    <div class="box"><h3>⏱ タイムアタックの ベスト</h3>${tas || '<div style="color:var(--sub)">まだ ありません。ホームの「⏱ タイムアタック」から ちょうせん！</div>'}</div>`;
}
function renderSet(){
  const sw = (k, t, sub) => `<div class="sw"><span>${t}${sub ? `<small>${sub}</small>` : ''}</span><button type="button" class="tg${st.set[k] ? ' on' : ''}" data-act="tg" data-k="${k}" role="switch" aria-checked="${!!st.set[k]}" aria-label="${t}"></button></div>`;
  $('main').innerHTML = `
    <div class="box"><h3>⚙️ せってい</h3>
      ${sw('read', '🔊 問題を 自動で 読み上げる', 'ヒントや 答えも 読み上げます')}
      ${sw('voice', '🎤 問題が 出たら すぐ 声で 答える', '問題が 出ると マイクが 聞きはじめます（ブラウザが マイクの 許可を 聞いてきます）')}
      ${sw('vconf', '🎤 声の 答えは たしかめてから', '聞こえた 答えを □に 入れて「これで いい？」と 聞きます（聞きまちがいで ×に ならない）')}
      ${sw('sound', '🔔 こうかおん')}
      ${sw('big', '🔠 文字を 大きく')}
      <button type="button" class="btn sub wide" data-act="vtest">🎤 声の ためし</button></div>
    <div class="box"><h3>📱 ホーム画面に 置く</h3><div style="font-size:.9rem">iPhone（Safari）：下の 共有（□に↑）→「ホーム画面に追加」<br>Android（Chrome）：右上の ⋮ →「ホーム画面に追加」<br>表電卓とは べつの アプリとして 置けます。</div></div>
    <div class="box"><h3>🗂 データ</h3><div style="font-size:.88rem;color:var(--sub);margin-bottom:8px">きろく（★・XP・レベル）は この 端末の 中だけに 保存しています。</div><button type="button" class="btn sub wide" data-act="reset">🗑 きろくを ぜんぶ 消す</button></div>
    <div class="box"><h3>ℹ️ この アプリ</h3>
      <div class="kv"><span>バージョン</span><b id="verNow">算数・数学チャレンジ ${S.VERSION}</b></div>
      <div class="kv"><span>単元</span><b>${S.UNITS.length}こ（小1〜中3）</b></div>
      <button type="button" class="btn sub wide" data-act="wn">🆕 新しくなった こと</button>
      <button type="button" class="btn sub wide" data-act="upd">🔄 更新を たしかめる</button></div>
    <button type="button" class="btn sub wide" data-act="hyo">🧮 表電卓へ</button>`;
}

/* ── 🎤 声の ためし（聞こえた 言葉と、読みとった 数を その場で 見る） ── */
function openVoiceTest(){
  const rows = st.vlog.slice().reverse().map(x => `<li><b>「${esc(x.t)}」</b><small>${esc(x.d)}　答えの 形：${esc(x.f)}</small></li>`).join('');
  openModal(`<div class="page-h"><h2>🎤 声の ためし</h2></div>
    <p style="margin:0 0 8px;font-size:.9rem">${V.supported ? '🎤 を おして、数を 言ってみてね（「じゅうさん」「4ぶんの3」「マイナス5」「7あまり3」など）。' : '⚠ この ブラウザでは 声の 聞き取りが 使えません。スマホの Chrome や Safari で ためしてね。'}</p>
    <button type="button" class="btn wide" data-act="vtgo" id="vtBtn"${V.supported ? '' : ' disabled'}>🎤 はなす</button>
    <div class="vt"><div class="vtl">聞こえた ことば</div><div id="vtHeard" class="vtv">—</div><div class="vtl">読みとった 数・しき</div><div id="vtNum" class="vtv">—</div><div id="vtAlts" class="vta"></div></div>
    <div class="box" style="margin-top:12px"><h3>聞き取れなかった ことば（さいきん）</h3>${rows ? `<ul class="vlog">${rows}</ul><button type="button" class="btn sub wide" data-act="vlogclr">🗑 消す</button>` : '<div style="color:var(--sub);font-size:.88rem">まだ ありません</div>'}</div>
    <button type="button" class="btn sub wide" data-act="mclose">とじる</button>`, () => V.stop());
}
const VT_FORM = {form: '{0}', kinds: ['d'], ans: ['0']};
function voiceTestShow(alts){
  const h = $('vtHeard'), nm = $('vtNum'), al = $('vtAlts'); if(!h) return;
  h.textContent = alts[0] ? '「' + alts[0] + '」' : '—';
  nm.textContent = S.normSpeech(alts[0] || '', VT_FORM) || '（数が 見つからなかった）';
  al.textContent = alts.length > 1 ? 'ほかの 候補：' + alts.slice(1).map(a => '「' + a + '」').join(' ') : '';
}
function voiceTestGo(){
  if(V.listening()){ V.stop(); return; }
  const b = $('vtBtn');
  V.listen({
    onStart: () => { if(b) b.textContent = '■ きいてるよ（おすと やめる）'; },
    onInterim: t => { const h = $('vtHeard'); if(h) h.textContent = '🎤 ' + t; },
    onFinal: alts => voiceTestShow(alts),
    onError: code => { const h = $('vtHeard'); if(h) h.textContent = S.voiceErrMsg(code) || code; },
    onEnd: () => { const bb = $('vtBtn'); if(bb) bb.textContent = '🎤 はなす'; },
  });
}

/* ── 新しくなった こと ── */
const seenVer = () => { try { return localStorage.getItem(SEEN_VER_KEY) || ''; } catch(_){ return ''; } };
const markSeenVer = () => { try { localStorage.setItem(SEEN_VER_KEY, S.VERSION); } catch(_){} };
function openWhatsNew(){
  markSeenVer();
  openModal(`<div class="page-h"><h2>🆕 新しくなった こと</h2></div><p style="margin:0 0 8px;color:var(--sub)">いまの 版：<b>${S.VERSION}</b></p>
    ${S.WHATSNEW.map((w, i) => `<details class="wn"${i === 0 ? ' open' : ''}><summary>${esc(w.v)}　${esc(w.t)}</summary><ul>${w.li.map(x => `<li>${x}</li>`).join('')}</ul></details>`).join('')}
    <button type="button" class="btn wide" data-act="mclose">とじる</button>`);
}
/* 前に 使っていた 版と ちがえば、下に 1度だけ 知らせる。はじめて 使う 人には 出さない */
function maybeTellWhatsNew(){
  const prev = seenVer();
  if(!prev && !st.solved && !Object.keys(st.units).length){ markSeenVer(); return false; }
  if(prev === S.VERSION) return false;
  const w = S.WHATSNEW.find(x => x.v === S.VERSION);
  if(!w){ markSeenVer(); return false; }
  showNotice({title: `${S.VERSION} に 新しく なりました`, sub: w.t, yes: '見る', no: 'あとで', onYes: openWhatsNew, onNo: markSeenVer});
  return true;
}
/* 新しい 版の 入れかえ：「いま更新」を おした ときだけ（問題の とちゅうで 画面が かわらないように） */
let swReg = null, swDeclined = false;
function swOfferUpdate(worker, force){
  if(!worker || (swDeclined && !force)) return;
  showNotice({title: '新しい 版が 用意 できました', sub: '「いま更新」を おすと 読み込み直します。問題の とちゅうなら「あとで」を えらんでね。', yes: 'いま更新', no: 'あとで',
    onYes: () => { try { worker.postMessage('SKIP_WAITING'); } catch(_){ location.reload(); } }, onNo: () => { swDeclined = true; }});
}
async function checkUpdate(){
  if(!swReg){ toast('ここでは 更新を たしかめられません'); return; }
  toast('たしかめています…');
  try { await swReg.update(); } catch(_){ toast('たしかめられませんでした。電波の ある ところで もう一度'); return; }
  setTimeout(() => { const w = swReg.waiting || swReg.installing;
    if(w){ if(w.state === 'installed') swOfferUpdate(w, true); else toast('新しい 版を 取りこんでいます。少しすると「いま更新」が 出ます'); }
    else toast(`いまの 版（${S.VERSION}）が いちばん 新しい 版です`); }, 800);
}

/* ════════════ ボタン ════════════ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if(!el || el.disabled) return;
  const a = el.dataset.act, u = el.dataset.u;
  switch(a){
    case 'nav': if(el.dataset.s === 'home' && view.s === 'result') ses = null; go(el.dataset.s); break;
    case 'hyo': toHyo(); break;
    case 'back': history.back(); break;
    case 'grade': st.set.grade = +el.dataset.g; save(); renderHome(); break;
    case 'unit': if(!$('modal').hidden){ $('modal').hidden = true; } startStage(u); break;
    case 'ex': go('ex', {u}); break;
    case 'mix': startMix(); break;
    case 'tapick': openTaPicker(); break;
    case 'ta': if(!$('modal').hidden){ $('modal').hidden = true; $('mbody').innerHTML = ''; try { history.replaceState(Object.assign({}, view, {d: depth()}), '', location.hash); } catch(_){} } startTA(u); break;
    case 'blank': setAct(+el.dataset.i); break;
    case 'key': keyIn(el.dataset.k); break;
    case 'hint': hint(); break;
    case 'read': speakQ(); break;
    case 'mic': listen(); break;
    case 'vok': submit(); break;
    case 'pex': if(ses && ses.p) openExModal(ses.p.unit); break;
    case 'pass': pass(); break;
    case 'next': nextProblem(); break;
    case 'quit': history.back(); break;
    case 'again': if(ses){ const m = ses.mode, uu = ses.u; if(m === 'ta') startTA(uu); else if(m === 'mix') startMix(); else startStage(uu); } break;
    case 'tg': { const k = el.dataset.k; st.set[k] = !st.set[k]; save(); renderSet(); renderTop(); if((k === 'voice' || k === 'vconf') && st.set[k] && !V.supported) toast('この 端末では 声の 聞き取りが 使えないかも しれません'); break; }
    case 'vtest': openVoiceTest(); break;
    case 'vtgo': voiceTestGo(); break;
    case 'vlogclr': st.vlog = []; save(); closeModal(); setTimeout(openVoiceTest, 60); break;
    case 'wn': openWhatsNew(); break;
    case 'upd': checkUpdate(); break;
    case 'nb-yes': { const o = noticeAct; hideNotice(); if(o && o.onYes) o.onYes(); break; }
    case 'nb-no': { const o = noticeAct; hideNotice(); if(o && o.onNo) o.onNo(); break; }
    case 'reset': openModal(`<div class="page-h"><h2>🗑 きろくを 消す</h2></div><p>★・XP・レベル・タイムアタックの きろくを ぜんぶ 消します。もとには もどせません。</p><div class="btnrow"><button type="button" class="btn sub" data-act="mclose">やめる</button><button type="button" class="btn" data-act="doreset">けす</button></div>`); break;
    case 'doreset': { const set = st.set; st = S.store.clean(null); st.set = set; save(); closeModal(); setTimeout(() => { render(); toast('きろくを 消しました'); }, 50); break; }
    case 'mclose': closeModal(); break;
  }
});
/* 単元の カード（div）も Enter・スペースで 押せるように */
document.addEventListener('keydown', e => {
  const el = e.target.closest && e.target.closest('[role="button"][data-act]');
  if(el && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); el.click(); return; }
  if(view.s !== 'play' || !ses || !ses.p || !$('modal').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const k = e.key;
  if(/^[0-9]$/.test(k)) keyIn(k);
  else if(k === '-' || k === '−') keyIn('−');
  else if(k === '+') keyIn('+');
  else if(k === '.') keyIn('.');
  else if(k === 'Backspace') keyIn('bs');
  else if(k === 'Enter'){ if(e.target && e.target.tagName === 'BUTTON' && e.target.dataset.act !== 'blank') return; keyIn('ok'); }
  else if(k === 'Tab' || k === 'ArrowRight'){ if(ses.p.kinds.length > 1 && !ses.answered) keyIn('nx'); else return; }
  else if(k === 'ArrowLeft'){ if(ses.p.kinds.length > 1) setAct((ses.act - 1 + ses.p.kinds.length) % ses.p.kinds.length); }
  else return;
  e.preventDefault();
});
document.addEventListener('visibilitychange', () => { if(document.hidden){ V.stop(); V.stopSpeak(); } });
$('modal').addEventListener('click', e => { if(e.target === $('modal')) closeModal(); });

/* ── はじめ ── */
$('hdBack').hidden = !fromHyo;
const h0 = (location.hash || '').replace('#', '');
try { history.replaceState({s: 'home', d: 1}, '', location.pathname + location.search + '#home'); } catch(_){}
render();
if(h0 === 'rec' || h0 === 'set') go(h0);
setTimeout(maybeTellWhatsNew, 600);
if('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw/.test(location.search)){
  let refreshing = false;
  const hadCtrl = !!navigator.serviceWorker.controller;   // はじめて 入れた ときは 読み込み直さない
  navigator.serviceWorker.addEventListener('controllerchange', () => { if(refreshing || !hadCtrl) return; refreshing = true; location.reload(); });
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    swReg = reg; reg.update();
    document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') reg.update(); });
    if(reg.waiting && navigator.serviceWorker.controller) swOfferUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => { const nw = reg.installing; if(!nw) return;
      nw.addEventListener('statechange', () => { if(nw.state === 'installed' && navigator.serviceWorker.controller) swOfferUpdate(nw); }); });
  }).catch(() => {});
}

/* テストから さわる ための 入り口 */
S.app = {state: () => st, ses: () => ses, view: () => view, startStage, startMix, startTA, keyIn, submit, hint, heard: alts => heardFinal(alts, ses && ses.p),
  levelOf, need, finish, swOfferUpdate, maybeTellWhatsNew, voiceTestShow};
})();
