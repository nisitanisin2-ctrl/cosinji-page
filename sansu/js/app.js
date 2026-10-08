/* ════════════════════════════════════════════════════════════════
   🎓 算数・数学チャレンジ：画面とゲーム
   ・ホーム（学年 → 単元）→ 10問のステージ → けっか（★）
   ・答えは □ に タイルで 当てはめるか、🎤 で 言う。🦉 ヒントで とき方を 1つずつ
   ・XP と レベル、つづけた 日数（🔥）、タイムアタック（60びょう）
   ・キーと ヒントの ボタンは 画面の 下に 固定（ドック）。ヒントが ふえても すぐ 打てる
   ・v3：まちがい方に 合わせた ひとこと（mistakes.js）・いっしょに とく（ヒントの とちゅうの 数も □ に）・
     ふくしゅう（まちがえた 問題を 種で 作り直して、1日後・3日後・7日後に もう一度）・にがてかも の 単元
   ・v4：むずかしさ 3段階（単元ごと・じどうで かわる）・🃏 えらんで 答える（cards.js）・
     🎯 きょうの ミッション と 🏅 メダル ずかん・⚔️ 学年の ボス（medals.js）
   ボタンには プログラムを 書かず、data-act で ここから 動かす（CSP で ページの中の プログラムを 止めているため）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU, { esc, mathHtml, speakMath } = S, V = S.voice;
const $ = id => document.getElementById(id);
const STAGE_N = 10, TA_SEC = 60, SEEN_VER_KEY = 'sansu_seen_ver';
const REV_GAP = [1, 3, 7];   // ふくしゅう：まちがえた 次の日 → できたら 3日後 → 7日後 → できたら おしまい
const LV_NAME = ['', 'やさしい', 'ふつう', 'むずかしい'];
const LV_UP = 4, LV_DOWN = 2;   // ヒントなしで 4問 つづけて できたら むずかしく、2問 つづけて つまずいたら やさしく
const GR = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3'];
const TITLES = [[1, '🥚 たまご'], [2, '🐣 ひよこ'], [3, '🐥 ことり'], [5, '🐦 はばたき'], [8, '🦅 わし'], [12, '🦉 ちえの ふくろう'], [16, '🧙 すうがくの まほうつかい'], [25, '👑 すうがく王']];
const PRAISE = ['せいかい！', 'すごい！', 'よくできました！', 'ばっちり！', 'その ちょうし！', 'かんぺき！'];
const unitById = id => S.UNITS.find(u => u.id === id) || null;
const unitsOf = g => S.UNITS.filter(u => u.g === g);
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => window.SANSU_TODAY || ymd(new Date());
const addDays = (day, n) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const yesterday = () => addDays(today(), -1);
const newSeed = () => (Math.floor(Math.random() * 4294967294) + 1) >>> 0;
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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
/* ── ふくしゅう と にがて ── */
const dueList = () => st.rev.filter(r => r.due <= today() && unitById(r.u));
function addReview(u, seed, lv){
  if(!seed) return;
  const it = st.rev.find(r => r.u === u && r.s === seed);
  if(it){ it.n = 0; it.due = addDays(today(), REV_GAP[0]); return; }
  st.rev.push({u, s: seed, due: addDays(today(), REV_GAP[0]), n: 0, lv: lv || 2});
  if(st.rev.length > S.store.REV_MAX) st.rev = st.rev.slice(-S.store.REV_MAX);
}
/* 問題が おわったら：単元ごとの きろく と ふくしゅう */
function recordProblem(ok){
  const p = ses.p, x = st.stat[p.unit] || {n: 0, c: 0, x: 0}, clean = ok && !ses.tries && !ses.hints, missed = !ok || ses.tries > 0;
  if(ok && !x.n) mEvent('newunit');
  x.n++; if(clean) x.c++; if(missed) x.x++; st.stat[p.unit] = x;
  if(p.rev){
    const it = st.rev.find(r => r.u === p.rev.u && r.s === p.rev.s);
    if(it){ if(clean){ it.n++; if(it.n >= REV_GAP.length){ st.rev = st.rev.filter(r => r !== it); ses.mastered++; st.cnt.mastered++; } else it.due = addDays(today(), REV_GAP[it.n]); }
            else { it.n = 0; it.due = addDays(today(), REV_GAP[0]); } }
    mEvent('rev');
  } else if(missed || ses.hints >= 2) addReview(p.unit, p.seed, p.lv);
  autoLevel(ok);
}
/* ── むずかしさ（単元ごと。じどうで かわる） ── */
const lvOf = id => st.lv[id] || 2;
function setLv(id, l){ if(l === 2) delete st.lv[id]; else st.lv[id] = l; }
function autoLevel(ok){
  if(!st.set.auto || ses.mode === 'rev' || ses.mode === 'boss') return;
  const id = ses.p.unit, r = ses.lvr[id] || (ses.lvr[id] = {c: 0, m: 0}), clean = ok && !ses.tries && !ses.hints, miss = !ok || ses.tries >= 2;
  if(clean){ r.c++; r.m = 0; } else if(miss){ r.m++; r.c = 0; } else r.c = 0;
  const lv = lvOf(id), name = (unitById(id) || {}).t || '';
  if(r.c >= LV_UP && lv < 3){ setLv(id, lv + 1); r.c = 0; ses.lvMsg = `⬆ 「${name}」を ${LV_NAME[lv + 1]} に したよ`; }
  else if(r.m >= LV_DOWN && lv > 1){ setLv(id, lv - 1); r.m = 0; ses.lvMsg = `⬇ 「${name}」を ${LV_NAME[lv - 1]} に したよ`; }
}

/* ── 🎯 きょうの ミッション ── */
function missions(){
  if(st.ms.d !== today()){
    const ids = S.pickMissions(today(), m => m.need === 'voice' ? V.supported : m.need === 'rev' ? dueList().length >= 3 : true);
    st.ms = {d: today(), ids, p: {}, ok: [], all: false}; save();
  }
  return st.ms;
}
const missionOf = id => S.MISSIONS.find(m => m.id === id);
/* できごとを 数える（max が true なら その 日の いちばん 大きい 数） */
function mEvent(ev, n, max){
  const ms = missions(); let changed = false;
  for(const id of ms.ids){
    const m = missionOf(id); if(!m || m.ev !== ev || ms.ok.includes(id)) continue;
    const b = ms.p[id] || 0, a = Math.min(m.n, max ? Math.max(b, n || 0) : b + (n || 1));
    if(a === b) continue;
    ms.p[id] = a; changed = true;
    if(a >= m.n){ ms.ok.push(id); addXp(S.MISSION_XP); toast(`🎯 ミッション クリア！「${m.t}」 +${S.MISSION_XP}XP`); }
  }
  if(changed && !ms.all && ms.ids.length && ms.ids.every(id => ms.ok.includes(id))){ ms.all = true; st.cnt.msday++; addXp(S.MISSION_ALL_XP); toast(`🌟 きょうの ミッション ぜんぶ クリア！ +${S.MISSION_ALL_XP}XP`); }
  if(changed){ save(); checkMedals(); }
}
function addXp(n){ const lv0 = levelOf(st.xp); st.xp += n; if(ses) ses.xp += n; if(levelOf(st.xp) > lv0) toast(`🎉 レベルアップ！ Lv.${levelOf(st.xp)} ${titleOf(levelOf(st.xp))}`); renderTop(); }

/* ── 🏅 メダル ── */
function medalCtx(){
  const us = Object.values(st.units), stars = us.reduce((a, x) => a + x.s, 0), bw = Object.values(st.boss).filter(b => b.w > 0);
  return {ok: st.ok, units3: us.filter(x => x.s >= 3).length, stars, best: st.days.best, combo: st.cnt.combo, ta: Math.max(0, ...Object.values(st.ta)),
    voice: st.cnt.voice, guide: st.cnt.guide, card: st.cnt.card, mastered: st.cnt.mastered, msday: st.cnt.msday, hard: st.cnt.hard, early: st.cnt.early,
    bossWins: bw.reduce((a, b) => a + b.w, 0), bossGrades: bw.length, lv: levelOf(st.xp),
    elemAll: S.UNITS.filter(u => u.g <= 6).every(u => starsOf(u.id) >= 1), jhsAll: S.UNITS.filter(u => u.g >= 7).every(u => starsOf(u.id) >= 1)};
}
/* 新しく もらえる メダルを わたす。quiet なら まとめて 1つの お知らせ（はじめて v4 を 開いた とき） */
function checkMedals(quiet){
  const c = medalCtx(), got = [];
  for(const m of S.MEDALS) if(!st.md[m.id] && m.f(c)){ st.md[m.id] = today(); got.push(m); }
  if(!got.length) return got;
  save();
  if(quiet) toast(`🏅 メダルを ${got.length}こ もらったよ（きろくの メダル ずかんで 見られる）`);
  else got.forEach(m => { toast(`🏅 メダル ゲット！ ${m.ic} ${m.t}`); beep('star'); });
  return got;
}
/* にがてかも：5問 いじょう といて、ヒントなしで せいかいが 6わり より 少ない 単元 */
function weakUnits(){
  return S.UNITS.map(u => ({u, x: st.stat[u.id]})).filter(o => o.x && o.x.n >= 5 && o.x.c / o.x.n < 0.6)
    .sort((a, b) => a.x.c / a.x.n - b.x.c / b.x.n || b.x.n - a.x.n).slice(0, 3).map(o => o.u);
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
/* お知らせは じゅんばんに 1つずつ（レベルアップ・ミッション・メダルが かさなっても 見える） */
let toastT = null; const toastQ = [];
function toast(msg){ if(!msg) return; if(toastQ[toastQ.length - 1] === msg) return; toastQ.push(msg); if(toastQ.length === 1) showToast(); }
function showToast(){
  const t = $('toast'), msg = toastQ[0]; if(msg == null) return;
  t.textContent = msg; t.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => { t.classList.remove('show'); toastQ.shift(); if(toastQ.length) setTimeout(showToast, 250); }, 2600);
}
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
  const gs = gTarget();
  if(gs){   // いっしょに とく の □ に 答える
    const k = gs.act, q = {form: '{0}', kinds: [gs.kinds[k]], ans: [gs.ans[k]]};
    for(const a of alts){
      const v = S.fromSpeech(q, a);
      if(v && v.length === 1){ gs.val = v[0]; setHeard('🎤「' + a + '」'); drawStepBody(ses.tgt); setTimeout(() => { if(gTarget() === gs && gs.act === k) gCheck(); }, 450); return true; }
    }
    setHeard('🎤「' + (alts[0] || '') + '」と 聞こえたよ。数が わからなかった…'); logUnheard(alts[0], q);
    return false;
  }
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
  ses = Object.assign({mode, i: 0, n: mode === 'ta' ? Infinity : STAGE_N, done: [], score: 0, combo: 0, maxCombo: 0, xp: 0, ok: 0, clean: 0, mastered: 0, keys: new Set(), t0: Date.now(), lv0: levelOf(st.xp), lastU: '', lvr: {}, card: !!st.set.card}, opt);
}
function endSession(){ V.stop(); V.stopSpeak(); clearInterval(taTimer); if(ses && !ses.result) ses = null; }
function startStage(id){ const u = unitById(id); if(!u) return; newSes('unit', {u: id, g: u.g}); nextProblem(true); go('play'); autoVoice(); }
function startMix(card){ newSes('mix', card ? {g: st.set.grade, card: true} : {g: st.set.grade}); nextProblem(true); go('play'); autoVoice(); }
/* ⚔️ 学年の ボス：その 学年の 問題を 15問。まちがえる・答えを 見ると ハートが へる */
function startBoss(g){ newSes('boss', {g, n: S.BOSS_N, hearts: S.BOSS_HEARTS}); nextProblem(true); go('play'); autoVoice(); }
/* 📝 ふくしゅう：きょう までに 出す 問題（10問まで） */
function startReview(){
  const due = dueList();
  if(!due.length){ toast('いまは ふくしゅうする 問題は ありません'); return; }
  const queue = shuffle(due).slice(0, STAGE_N).map(r => ({u: r.u, s: r.s, lv: r.lv}));
  newSes('rev', {queue, n: queue.length}); nextProblem(true); go('play'); autoVoice();
}
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
  if(ses.mode === 'rev') return unitById(ses.queue[ses.done.length].u);
  if(ses.mode !== 'mix' && ses.mode !== 'boss') return unitById(ses.u);
  const us = unitsOf(ses.g); let u;
  do { u = us[Math.floor(Math.random() * us.length)]; } while(us.length > 1 && u.id === ses.lastU);
  ses.lastU = u.id; return u;
}
function nextProblem(silent){
  if(!ses) return;
  if(ses.lost || (ses.mode !== 'ta' && ses.done.length >= ses.n)){ finish(); return; }
  if(ses.lvMsg){ toast(ses.lvMsg); ses.lvMsg = ''; }
  const u = pickUnit(); let p, k = 0;
  // 問題は 種（seed）と むずかしさ から 作る。まちがえたら 同じ 種で あとから 作り直せる（ふくしゅう）
  const lv = ses.mode === 'boss' ? Math.max(2, lvOf(u.id)) : lvOf(u.id);
  const make = (seed, l) => { const q = S.makeProblem(u, S.mkRng(seed), l); q.seed = seed; return q; };
  if(ses.mode === 'rev'){ const it = ses.queue[ses.done.length]; p = make(it.s, it.lv || 2); p.rev = it; }
  else do { p = make(newSeed(), lv); } while(ses.keys.has(p.key) && ++k < 25);
  ses.keys.add(p.key);
  // 🃏 えらんで 答える：4まいの カード（作れない 問題は ふつうの キー）
  const cards = ses.card ? S.choices(p, S.mkRng((p.seed ^ 0x9e3779b9) >>> 0 || 1)) : null;
  Object.assign(ses, {p, vals: p.kinds.map(() => ''), act: 0, tries: 0, hints: 0, revealed: false, answered: false, byVoice: false, gd: [], tgt: -1, cards, cardBad: []});
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
  const p = ses.p, u = unitById(p.unit), ta = ses.mode === 'ta', boss = ses.mode === 'boss';
  const segs = ta ? '<div class="tbar"><div id="taBar"></div></div>' : boss ? bossBar()
                  : `<div class="segs">${Array.from({length: ses.n}, (_, i) => `<i class="${ses.done[i] || (i === ses.done.length ? 'now' : '')}"></i>`).join('')}</div>`;
  $('main').innerHTML = `
    <div class="pbar"><button type="button" class="x" data-act="quit" aria-label="やめる">✕</button>
      <div class="pt"><span class="dif d${p.lv || 2}">${LV_NAME[p.lv || 2]}</span> ${esc(GR[u.g - 1])}　${esc(u.t)}${ses.mode === 'mix' ? '（ミックス）' : ta ? '（⏱）' : ses.mode === 'rev' ? '（📝 ふくしゅう）' : boss ? '（⚔️ ボス）' : ''}</div>
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
/* ⚔️ ボスの 体力（のこりの 問題）と ハート */
function bossBar(){
  const b = S.BOSSES[ses.g - 1], hp = Math.max(0, (ses.n - ses.ok) / ses.n * 100);
  return `<div class="bossbar"><span class="bi" id="bossIc">${b.ic}</span><span class="bn">${esc(b.t)}</span><div class="hp"><div id="bossHp" style="width:${hp}%"></div></div>`
    + `<span class="hearts" id="hearts" aria-label="ハート ${ses.hearts}">${'❤️'.repeat(Math.max(0, ses.hearts))}${'🤍'.repeat(Math.max(0, S.BOSS_HEARTS - ses.hearts))}</span></div>`;
}
function drawBoss(hit){
  const bb = document.querySelector('.bossbar'); if(!bb) return;
  bb.outerHTML = bossBar();
  if(hit && !reduceMotion()){ const ic = $('bossIc'); if(ic){ ic.classList.add(hit); setTimeout(() => ic.classList.remove(hit), 600); } }
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
    const v = ses.vals[i] || '', cls = ses.answered ? (ses.revealed ? ' rev' : ' done') : (i === ses.act && !gTarget() ? ' on' : '');
    return `<button type="button" class="bx${cls}" data-act="blank" data-i="${i}" aria-label="${i + 1}つめの □${v ? '：' + esc(v) : '（から）'}">${v ? esc(v) : '&#8203;'}</button>`;
  }});
}
function drawActs(){
  const a = $('acts'); if(!a || !ses) return;
  const n = ses.p.steps.length, ta = ses.mode === 'ta', on = V.listening();
  const hl = ses.answered ? '<span>🦉</span>とき方' : gPending() >= 0 ? '<span>🦉</span>おしえて' : ses.hints < n ? `<span>🦉</span>ヒント ${ses.hints}/${n}` : '<span>💡</span>こたえ';
  a.innerHTML = `<button type="button" data-act="read"><span>🔊</span>よむ</button>`
    + `<button type="button" data-act="hint" id="hintBtn"${ses.tries && !ses.hints && !ses.answered ? ' class="pulse"' : ''}>${hl}</button>`
    + (ta ? `<button type="button" data-act="pass"${ses.answered ? ' disabled' : ''}><span>⏭</span>パス</button>` : `<button type="button" data-act="pex"><span>📖</span>かいせつ</button>`)
    + `<button type="button" class="mic${on ? ' on' : ''}" data-act="mic"${ses.answered ? ' disabled' : ''}><span>🎤</span>${on ? 'きいてるよ' : 'こえで'}</button>`;
}
function drawKeys(){
  const k = $('keys'); if(!k || !ses) return;
  if(ses.answered){
    const last = ses.lost || (ses.mode !== 'ta' && ses.done.length >= ses.n);
    k.innerHTML = `<button type="button" class="btn next" data-act="next" style="grid-column:1/-1">${last ? '🏁 けっかを 見る' : 'つぎへ ▶'}</button>`;
    fitDock(); return;
  }
  const gs = gTarget();
  if(!gs && ses.cards){   // 🃏 カードから えらぶ（ヒントの □ に 答える ときは キー）
    k.innerHTML = `<div class="cards">${ses.cards.map((v, i) => { const bad = ses.cardBad.includes(i);
      return `<button type="button" class="card${bad ? ' bad' : ''}" data-act="card" data-c="${i}"${bad ? ' disabled' : ''} aria-label="${i + 1}ばんの カード">${S.cardHtml(ses.p, v)}</button>`; }).join('')}</div>`;
    fitDock(); return;
  }
  const ks = gs ? [gs.kinds[gs.act]] : ses.p.kinds, neg = ks.some(x => x !== 'n'), pls = ks.some(x => x === 't' || x === 'tc'), dot = ks.includes('d'), multi = ks.length > 1;
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
    + (ses.hints < p.steps.length ? `<details class="how"><summary>🦉 とき方を ぜんぶ 見る</summary><div class="hints">${p.steps.map((s, i) => stepHtml(s, i, true)).join('')}</div></details>` : '');
}
const stepText = i => { const s = ses.p.steps[i]; return typeof s === 'string' ? s : s.t; };
/* ヒント 1つ。plain なら いつも 数を 見せる（とき方を ぜんぶ 見る） */
function stepHtml(s, i, plain){
  const t = typeof s === 'string' ? s : s.t, fig = typeof s === 'string' ? '' : (s.fig || ''), gs = !plain && ses && ses.gd ? ses.gd[i] : null;
  return `<div class="hint${gs ? ' guided' + (gs.done ? ' gdone' : '') : ''}"${plain ? '' : ` id="hint${i}"`}><span class="ow">🦉</span><div class="hb"><div class="ht">${gs ? guidedBody(t, gs, i) : mathHtml(t)}</div>${fig}${gs && !gs.done ? `<div class="gfb" id="gfb${i}" aria-live="polite"></div>` : ''}</div></div>`;
}
function appendHint(i, quiet){
  const h = $('hints'); if(!h) return;
  if(guideOn() && ses.gd[i] === undefined) ses.gd[i] = gState(i);
  const gs = ses.gd[i] || null;
  if(gs && !gs.done && !ses.answered) ses.tgt = i;
  h.insertAdjacentHTML('beforeend', stepHtml(ses.p.steps[i], i));
  if(gs && !gs.done && !quiet){ drawForm(); drawKeys(); }
  if(!quiet){ revealAboveDock(h.lastElementChild, true); if(st.set.read) V.speak(speakStep(i)); }
}

/* ════ いっしょに とく：ヒントの {{数}} を □ に して、1つずつ 当てはめながら 進む ════
   □ の ある ところ（。、→ まで）だけ 見せて、当たったら その先を 見せる。🦉 で その □ の 数を 見せる */
const guideOn = () => !!st.set.guide && !!ses && ses.mode !== 'ta';
function gState(i){
  const vs = S.stepVals(stepText(i)); if(!vs.length) return null;
  const g = (unitById(ses.p.unit) || {}).g || 1;
  return {ans: vs, kinds: vs.map(v => /^\+/.test(v) ? 't' : /\./.test(v) ? 'd' : /^−/.test(v) || g >= 7 ? 'i' : 'n'), act: 0, val: '', rv: [], done: false, tries: 0};
}
const gPending = () => { if(!ses || !ses.gd || ses.answered) return -1; for(let i = 0; i < ses.gd.length; i++) if(ses.gd[i] && !ses.gd[i].done) return i; return -1; };
const gTarget = () => ses && !ses.answered && ses.tgt >= 0 && ses.gd && ses.gd[ses.tgt] && !ses.gd[ses.tgt].done ? ses.gd[ses.tgt] : null;
function markerEnd(t, k){ const re = /\{\{[^{}]*\}\}/g; let m, j = 0; while((m = re.exec(t))) if(j++ === k) return m.index + m[0].length; return t.length; }
function clauseEnd(t, from){   // from より 後ろで、[[ ]]・√[ ] の 外に ある 。、→ の すぐ 後ろ
  let depth = 0;
  for(let i = 0; i < t.length; i++){
    const c = t[i];
    if(c === '[') depth++; else if(c === ']') depth = Math.max(0, depth - 1);
    else if(i >= from && depth === 0 && '。、→\n'.includes(c)) return i + 1;
  }
  return t.length;
}
function guidedBody(t, gs, i){
  const src = gs.done ? t : t.slice(0, clauseEnd(t, markerEnd(t, gs.act)));
  return mathHtml(src, {gblank: (k, v) => {
    if(gs.done || k < gs.act) return `<span class="gv${gs.rv[k] ? ' rev' : ''}">${esc(v)}</span>`;
    const cur = k === gs.act, val = cur ? gs.val : '', on = cur && ses.tgt === i && !ses.answered;
    return `<button type="button" class="bx gbx${on ? ' on' : ''}" data-act="gblank" data-s="${i}"${cur ? '' : ' disabled'} aria-label="ヒントの □${val ? '：' + esc(val) : '（から）'}">${val ? esc(val) : '&#8203;'}</button>`;
  }});
}
function speakStep(i){
  const t = stepText(i), gs = ses.gd[i];
  if(!gs || gs.done) return speakMath(t);
  let k = 0;
  return speakMath(t.slice(0, clauseEnd(t, markerEnd(t, gs.act))).replace(/\{\{([^{}]*)\}\}/g, (m, v) => k++ < gs.act ? v : '{0}'));
}
function drawStepBody(i){
  const el = $('hint' + i), gs = ses && ses.gd[i]; if(!el || !gs) return;
  const ht = el.querySelector('.ht'); if(ht) ht.innerHTML = guidedBody(stepText(i), gs, i);
  if(gs.done){ el.classList.add('gdone'); const f = $('gfb' + i); if(f) f.remove(); }
}
function gFb(msg, cls){ const f = ses && ses.tgt >= 0 ? $('gfb' + ses.tgt) : null; if(f){ f.textContent = msg; f.className = 'gfb' + (cls ? ' ' + cls : ''); } }
function gKey(gs, k){
  const kind = gs.kinds[gs.act]; let v = gs.val;
  if(k === 'ok'){ gCheck(); return; }
  if(k === 'bs') v = v.slice(0, -1);
  else if(k === '−'){ if(kind === 'n') return; v = kind === 't' ? MI + v.replace(/^[+−]/, '') : v.startsWith(MI) ? v.slice(1) : MI + v; }
  else if(k === '+'){ if(kind !== 't') return; v = '+' + v.replace(/^[+−]/, ''); }
  else if(k === '.'){ if(kind !== 'd' || v.includes('.')) return; v = (v === '' || v === MI) ? v + '0.' : v + '.'; }
  else if(/^\d$/.test(k)){ if(v.replace(/\D/g, '').length >= 7) return; v += k; }
  else return;
  gs.val = v; gFb(''); drawStepBody(ses.tgt);
}
function gCheck(){
  const i = ses.tgt, gs = gTarget(); if(!gs) return;
  const kind = gs.kinds[gs.act], a = S.parseBlank(kind, gs.val), b = S.parseBlank(kind, gs.ans[gs.act]);
  if(gs.val === '' || a === null || Number.isNaN(a)){ gFb('□ に 数を 入れてね', 'near'); return; }
  if(b !== null && Math.abs(a - b) < 1e-9){
    beep('ok'); gs.act++; gs.val = ''; gs.tries = 0; ses.xp++; st.xp++; st.cnt.guide++; save(); renderTop(); mEvent('guide');
    if(gs.act >= gs.ans.length){ gFinish(i); return; }
    drawStepBody(i); gFb('⭕ そう！ つぎの □ は？', 'ok'); revealAboveDock($('hint' + i), true);
    if(st.set.read) V.speak(speakStep(i));
    return;
  }
  gs.tries++; beep('ng');
  const el = $('hint' + i); if(el){ el.classList.remove('ng'); void el.offsetWidth; el.classList.add('ng'); }
  gFb(gs.tries >= 2 ? '❌ もう一度。わからない ときは 🦉「おしえて」を おしてね' : '❌ ちがうよ。もう一度 考えてみよう', 'ng');
}
/* ヒントの □ が ぜんぶ うまったら、つぎの ヒントを 出す（なければ 答えの □ へ） */
function gFinish(i){
  const gs = ses.gd[i]; gs.done = true; gs.val = ''; ses.tgt = -1;
  drawStepBody(i);
  if(!ses.answered && ses.hints < ses.p.steps.length){ appendHint(ses.hints); ses.hints++; }
  if(!gTarget()) setFb('');
  drawForm(); drawActs(); drawKeys();
  if(!gTarget()){ const h = $('hints'); if(h && h.lastElementChild) revealAboveDock(h.lastElementChild, true); }
}
/* 🦉「おしえて」：いまの □ の 数を 見せて つぎへ */
function gReveal(i){
  const gs = ses.gd[i]; gs.rv[gs.act] = true; gs.act++; gs.val = ''; gs.tries = 0;
  if(gs.act >= gs.ans.length){ gFinish(i); return; }
  ses.tgt = i; drawStepBody(i); gFb('🦉 この 数だよ。つぎの □ は？', 'near'); drawForm(); drawActs(); drawKeys();
  if(st.set.read) V.speak(speakStep(i));
}
/* 答えが 出たら、のこりの ヒントの □ も 数を 見せる */
function gCloseAll(){
  (ses.gd || []).forEach((gs, i) => { if(gs && !gs.done){ for(let k = gs.act; k < gs.ans.length; k++) gs.rv[k] = true; gs.act = gs.ans.length; gs.done = true; gs.val = ''; drawStepBody(i); } });
  ses.tgt = -1;
}
function setFb(msg, cls){ const f = $('fb'); if(f){ f.textContent = msg; f.className = 'fb' + (cls ? ' ' + cls : ''); } }
function setFbHtml(html, cls){ const f = $('fb'); if(f){ f.innerHTML = html; f.className = 'fb' + (cls ? ' ' + cls : ''); } }
function setAct(i){
  if(!ses || ses.answered) return;
  const pi = ses.tgt; ses.act = i; ses.tgt = -1; drawForm();
  if(pi >= 0){ drawStepBody(pi); drawKeys(); }
}
/* ヒントの □ を おしたとき */
function setGTarget(i){ if(!ses || ses.answered || !ses.gd[i] || ses.gd[i].done) return; const was = ses.tgt; ses.tgt = i; drawForm(); drawStepBody(i); if(was !== i) drawKeys(); }
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
  const gs = gTarget(); if(gs){ gKey(gs, k); return; }
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
/* 🃏 カードを えらんだ とき */
function pickCard(i){
  if(!ses || !ses.cards || ses.answered || ses.cardBad.includes(i)) return;
  ses.vals = ses.cards[i].slice(); ses.byVoice = false; drawForm(); submit();
  if(!ses.answered && !ses.cardBad.includes(i)){ ses.cardBad.push(i); drawKeys(); }
}
function submit(){
  const p = ses.p;
  clearConfirm();
  const miss = ses.vals.findIndex((v, i) => v === '' && !S.blankMayBeEmpty(p.kinds[i]));
  if(miss >= 0){ setAct(miss); setFb('まだ あいている □ が あるよ', 'near'); return; }
  const r = S.check(p, ses.vals);
  if(r.ok){ correct(); return; }
  if(r.near){ setFb('🤏 ' + r.msg, 'near'); beep('near'); return; }
  wrong(r.msg, r.msg ? null : S.diagnose(p, ses.vals));
}
function correct(){
  V.stop();
  const ta = ses.mode === 'ta', clean = !ses.tries && !ses.hints, lvBefore = levelOf(st.xp), card = !!ses.cards;
  ses.answered = true; ses.combo++; ses.maxCombo = Math.max(ses.maxCombo, ses.combo); gCloseAll(); recordProblem(true);
  let pts = ta ? 5 : card ? (clean ? 6 : 3) : clean ? 10 : ses.hints ? 4 : 6;   // カードで えらぶ ときは すこし 少なめ
  if(!ta && ses.combo >= 3) pts += Math.min(10, ses.combo - 1);
  ses.score += pts; ses.xp += pts; ses.ok++; if(clean) ses.clean++;
  ses.done.push(clean ? 'c' : 'h');
  st.xp += pts; st.solved++; st.ok++; touchDay();
  const c = st.cnt; c.combo = Math.max(c.combo, ses.combo); if(ses.byVoice) c.voice++; if(card) c.card++; if(ses.p.lv === 3) c.hard++; if(new Date().getHours() < 7) c.early++;
  save();
  mEvent('solve'); if(clean) mEvent('clean'); mEvent('combo', ses.combo, true); if(ses.byVoice) mEvent('voice'); if(card) mEvent('card');
  checkMedals();
  beep('ok'); celebrate('⭕', pts);
  if(ses.mode === 'boss') drawBoss('hit');
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
function wrong(msg, dg){
  ses.tries++; ses.combo = 0; beep('ng');
  const c = $('qcard'); c.classList.remove('ng'); void c.offsetWidth; c.classList.add('ng');
  const heard = ses.byVoice ? '（声で 答えた ときは、聞きまちがいかも。□を たしかめてね）' : '';
  const head = msg && msg !== '書き方を たしかめてね' ? msg : dg ? 'ちがうよ。' : 'ちがうよ。もう一度 考えてみよう';
  // まちがい方に 合わせた ひとこと（よく ある まちがいに 当たった とき）
  setFbHtml(`❌ ${esc(head)}${dg ? `<span class="mis">🦉 ${esc(dg.m)}</span>` : ''}${heard ? `<small>${esc(heard)}</small>` : ''}`, 'ng');
  if(dg){ st.mk[dg.k] = (st.mk[dg.k] || 0) + 1; save(); if(st.set.read) V.speak(speakMath(dg.m)); }
  const cb = $('pCombo'); if(cb) cb.textContent = '';
  if(ses.mode === 'boss') bossHurt();
  drawActs(); showCard();
}
/* ⚔️ ボス：まちがえる・答えを 見ると ハートが 1つ へる。なくなったら まけ */
function bossHurt(){
  ses.hearts--; drawBoss('ouch');
  if(ses.hearts > 0) return;
  ses.lost = true; V.stop();
  if(!ses.answered){ ses.answered = true; ses.done.push('w'); }
  setFb('💔 ハートが なくなった…', 'ng'); drawForm(); drawActs(); drawKeys();
}
function hint(){
  if(!ses || !ses.p) return;
  if(ses.answered){ const d = document.querySelector('details.how'); if(d){ d.open = !d.open; if(d.open) revealAboveDock(d, true); } else { const h = $('hints'); if(h && h.lastElementChild) revealAboveDock(h.lastElementChild, true); } return; }
  const pi = gPending();
  if(pi >= 0){ gReveal(pi); return; }
  if(ses.hints < ses.p.steps.length){ appendHint(ses.hints); ses.hints++; drawActs(); return; }
  reveal();
}
function reveal(){
  V.stop(); clearConfirm();
  ses.revealed = true; ses.answered = true; ses.combo = 0; ses.vals = ses.p.ans.slice(); ses.done.push('r'); st.solved++; gCloseAll(); recordProblem(false); save();
  if(ses.mode === 'boss') bossHurt();
  setFb('💡 こたえは こう なるよ。つぎは できるかな？', 'near');
  if(ses.mode === 'ta'){ setTimeout(() => { if(ses && ses.mode === 'ta' && !ses.result) nextProblem(); }, 1500); }
  document.querySelectorAll('.segs i').forEach((el, i) => { el.className = ses.done[i] || ''; });
  drawForm(); drawActs(); drawKeys(); drawAfter(); showCard();
  if(st.set.read) V.speak(speakMath(ses.p.answer));
}
function pass(){ if(!ses || ses.answered) return; ses.combo = 0; nextProblem(); }
function finish(){
  V.stop(); V.stopSpeak(); clearInterval(taTimer);
  const r = {lv0: ses.lv0, sec: Math.round((Date.now() - ses.t0) / 1000)};
  if(ses.mode === 'ta'){ const best = st.ta[ses.u] || 0; r.best = Math.max(best, ses.ok); r.newBest = ses.ok > best; st.ta[ses.u] = r.best; mEvent('ta'); }
  else if(ses.mode === 'rev'){ r.rev = true; r.left = dueList().length; }
  else if(ses.mode === 'boss'){
    const win = !ses.lost && ses.hearts > 0 && ses.done.length >= ses.n, b = st.boss[ses.g] || {w: 0, t: 0, b: 0};
    st.boss[ses.g] = {w: b.w + (win ? 1 : 0), t: b.t + 1, b: Math.max(b.b, ses.ok)}; r.boss = {win, first: win && !b.w};
    if(win){ addXp(S.BOSS_XP); setTimeout(() => { beep('up'); celebrate('🏆'); }, 300); }
  }
  else {
    r.stars = ses.clean >= 9 ? 3 : ses.clean >= 7 ? 2 : ses.ok >= 5 ? 1 : 0;
    if(ses.mode === 'unit'){ const x = st.units[ses.u] || {s: 0, n: 0, ok: 0, tot: 0, c: 0}; r.oldStars = x.s;
      st.units[ses.u] = {s: Math.max(x.s, r.stars), n: x.n + 1, ok: x.ok + ses.ok, tot: x.tot + ses.n, c: x.c + ses.clean}; if(r.stars) mEvent('stage'); }
    if(ses.mode === 'mix' && ses.done.length >= ses.n) mEvent('mix');
  }
  checkMedals(); r.lv1 = levelOf(st.xp);
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
    ${revCard()}
    ${missionCard()}
    <div class="modes"><button type="button" data-act="mix">🎲 ミックス<small>${GR[g - 1]}の いろいろな 問題を 10問</small></button><button type="button" data-act="tapick">⏱ タイムアタック<small>${TA_SEC}びょうで 何問 とける？</small></button>
      <button type="button" data-act="cardmix">🃏 えらんで 答える<small>4まいの カードから えらぶ（10問）</small></button><button type="button" data-act="boss" data-g="${g}">${S.BOSSES[g - 1].ic} ボスに ちょうせん<small>${S.BOSS_N}問・ハート ${S.BOSS_HEARTS}つ${(st.boss[g] || {}).w ? '（🏆 かった）' : ''}</small></button></div>
    ${weakRow()}
    <div class="units">${us.map(u => `<div class="unit${starsOf(u.id) >= 3 ? ' done3' : ''}" role="button" tabindex="0" data-act="unit" data-u="${u.id}" aria-label="${esc(u.t)}（★${starsOf(u.id)}）"><span class="ic">${u.ic}</span><span class="nm">${esc(u.t)}</span>${st.ta[u.id] ? `<span class="ta">⏱${st.ta[u.id]}</span>` : ''}<span class="st">${starStr(starsOf(u.id))}</span>${lvOf(u.id) !== 2 ? `<span class="dif d${lvOf(u.id)}">${LV_NAME[lvOf(u.id)]}</span>` : ''}<button type="button" class="ex" data-act="ex" data-u="${u.id}" aria-label="${esc(u.t)}の 解説">📖 解説</button></div>`).join('')}</div>`;
  const on = document.querySelector('.grades .on'); if(on) try { on.scrollIntoView({inline: 'center', block: 'nearest'}); } catch(_){}
}
/* 🎯 きょうの ミッション（3つ） */
function missionCard(){
  const ms = missions(), done = ms.ok.length;
  return `<div class="mission${ms.all ? ' all' : ''}"><div class="mh">🎯 きょうの ミッション <b>${done} / ${ms.ids.length}</b>${ms.all ? ' 🌟' : ''}</div>${ms.ids.map(id => { const m = missionOf(id), v = ms.p[id] || 0, ok = ms.ok.includes(id);
    return `<div class="mrow${ok ? ' ok' : ''}"><span class="mk">${ok ? '✅' : '⬜'}</span><span class="mt">${esc(m.t)}</span><span class="mp">${Math.min(v, m.n)}/${m.n}</span><span class="mb"><i style="width:${Math.round(Math.min(v, m.n) / m.n * 100)}%"></i></span></div>`; }).join('')}</div>`;
}
/* 📝 ふくしゅう（きょう 出す 問題が あるとき）と、🔎 にがてかも の 単元 */
function revCard(){
  const n = dueList().length; if(!n) return '';
  return `<button type="button" class="revcard" data-act="rev"><span class="ic">📝</span><span><span class="tt">ふくしゅう ${n}問</span><small>まえに まちがえた 問題に もう一度 ちょうせん</small></span></button>`;
}
function weakRow(){
  const ws = weakUnits(); if(!ws.length) return '';
  return `<div class="weak"><span class="wl">🔎 にがてかも</span>${ws.map(u => `<button type="button" class="chip" data-act="unit" data-u="${u.id}">${u.ic} ${u.g === st.set.grade ? '' : GR[u.g - 1] + ' '}${esc(u.t)}</button>`).join('')}</div>`;
}
const exHtml = u => u.ex.map(([k, v]) => { const s = typeof v === 'function' ? v() : v;
  if(k === 'fig') return `<div class="figw">${s}</div>`; if(k === 'eg') return `<div class="eg">${mathHtml(s)}</div>`;
  if(k === 'tip') return `<div class="tip">💡 ${mathHtml(s)}</div>`; return `<p>${mathHtml(s)}</p>`; }).join('');
function renderEx(){
  const u = unitById(view.u); if(!u){ go('home', {}, true); return; }
  $('main').innerHTML = `<div class="page-h"><button type="button" class="back" data-act="back" aria-label="もどる">←</button><h2>${u.ic} ${esc(u.t)}<small style="font-weight:600;color:var(--sub);font-size:.75rem">　${GR[u.g - 1]}</small></h2></div>
    <div class="exbox">${exHtml(u)}</div>
    <div class="difpick" role="group" aria-label="むずかしさ"><span>むずかしさ</span>${[1, 2, 3].map(l => `<button type="button" class="${lvOf(u.id) === l ? 'on' : ''}" data-act="setlv" data-u="${u.id}" data-l="${l}" aria-pressed="${lvOf(u.id) === l}">${LV_NAME[l]}</button>`).join('')}</div>
    <p class="difnote">${st.set.auto ? 'つづけて できると むずかしく、つまずくと やさしく、じどうで かわります（せってい で とめられます）' : 'じどうで かえない せってい に なっています'}</p>
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
  if(r.rev){ renderRevResult(r); return; }
  if(r.boss){ renderBossResult(r); return; }
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
function openBossIntro(g){
  const b = S.BOSSES[g - 1], rec = st.boss[g] || {w: 0, t: 0, b: 0};
  openModal(`<div class="bossintro"><div class="bic">${b.ic}</div><h2>${GR[g - 1]}の ボス「${esc(b.t)}」が あらわれた！</h2>
    <p>${GR[g - 1]}の いろいろな 問題が ${S.BOSS_N}問。まちがえたり 答えを 見たり すると ❤️ が へるよ。❤️ ${S.BOSS_HEARTS}つ の うちに さいごまで とけたら かち！</p>
    ${rec.t ? `<p class="br">これまで：${rec.w}かい かち（${rec.t}かい ちょうせん）・さいこう ${rec.b}問</p>` : ''}</div>
    <div class="btnrow"><button type="button" class="btn sub" data-act="mclose">やめる</button><button type="button" class="btn" data-act="bossgo" data-g="${g}">⚔️ たたかう</button></div>`);
}
function renderBossResult(r){
  const b = S.BOSSES[ses.g - 1], win = r.boss.win;
  $('main').innerHTML = `<div class="res">
    <div class="big" style="color:var(--accent)">${win ? '🏆' : '💔'}</div>
    <div class="msg">${win ? `${b.ic} ${esc(b.t)} を たおした！${r.boss.first ? '（はじめて！）' : ''}` : `ざんねん… ${b.ic} ${esc(b.t)} は つよかった`}</div>
    <table><tr><td>とけた 問題</td><td>${ses.ok} / ${ses.n}</td></tr><tr><td>のこった ❤️</td><td>${Math.max(0, ses.hearts)}</td></tr><tr><td>かかった 時間</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}びょう</td></tr><tr><td>もらった XP</td><td>+${ses.xp}</td></tr></table>
    ${r.lv1 > r.lv0 ? `<div class="lvup">🎉 レベルアップ！ Lv.${r.lv1} ${titleOf(r.lv1)}</div>` : ''}
    <p style="font-size:.8rem;color:var(--sub);margin:10px 0 0">${win ? 'きろくの トロフィーに 🏆 が ふえたよ。' : 'にがてな 単元を れんしゅう してから、もう一度 ちょうせん しよう！'}</p>
  </div>
  <div class="btnrow"><button type="button" class="btn sub" data-act="again">🔁 もう一度</button><button type="button" class="btn" data-act="nav" data-s="home">🏠 ホームへ</button></div>`;
}
function renderRevResult(r){
  $('main').innerHTML = `<div class="res">
    <div class="big" style="color:var(--accent)">📝</div>
    <div class="msg">ふくしゅう おわり！ ${ses.clean === ses.n ? 'ぜんぶ ヒントなしで できたね！' : 'よく がんばったね！'}</div>
    <table><tr><td>せいかい</td><td>${ses.ok} / ${ses.n}</td></tr><tr><td>ヒントなしで せいかい</td><td>${ses.clean}</td></tr>
      <tr><td>おぼえた（もう 出ない）</td><td>${ses.mastered}問</td></tr><tr><td>きょうの のこり</td><td>${r.left}問</td></tr><tr><td>もらった XP</td><td>+${ses.xp}</td></tr></table>
    ${r.lv1 > r.lv0 ? `<div class="lvup">🎉 レベルアップ！ Lv.${r.lv1} ${titleOf(r.lv1)}</div>` : ''}
    <p style="font-size:.78rem;color:var(--sub);margin:10px 0 0">ヒントなしで できた 問題は 3日後・7日後に もう一度 出ます。3回 つづけて できたら おしまい。</p>
  </div>
  <div class="btnrow">${r.left ? '<button type="button" class="btn" data-act="rev">📝 つづけて ふくしゅう</button>' : ''}<button type="button" class="btn sub" data-act="nav" data-s="home">🏠 ホームへ</button></div>`;
}
function renderRec(){
  const lv = levelOf(st.xp), acc = st.solved ? Math.round(st.ok / st.solved * 100) : 0;
  const rows = GR.map((l, i) => { const us = unitsOf(i + 1), s = us.reduce((a, u) => a + starsOf(u.id), 0), m = us.length * 3;
    return `<div class="gbar"><span class="gn">${l}</span><span class="tr"><div style="width:${m ? Math.round(s / m * 100) : 0}%"></div></span><span class="gv">★${s} / ${m}</span></div>`; }).join('');
  const tro = GR.map((l, i) => { const us = unitsOf(i + 1), all1 = us.every(u => starsOf(u.id) >= 1), all3 = us.every(u => starsOf(u.id) >= 3);
    return `<span class="${all1 ? '' : 'off'}">🏅 ${l} ぜんぶ ★1</span><span class="${all3 ? '' : 'off'}">🏆 ${l} ぜんぶ ★3</span><span class="${(st.boss[i + 1] || {}).w ? '' : 'off'}">${S.BOSSES[i].ic} ${l} ボス</span>`; }).join('');
  const tas = S.UNITS.filter(u => st.ta[u.id]).map(u => `<div class="kv"><span>${u.ic} ${GR[u.g - 1]} ${esc(u.t)}</span><b>${st.ta[u.id]}問</b></div>`).join('');
  $('main').innerHTML = `
    <div class="box"><h3>${titleOf(lv)}　Lv.${lv}</h3>
      <div class="kv"><span>XP</span><b>${st.xp}（つぎの レベルまで ${need(lv + 1) - st.xp}）</b></div>
      <div class="kv"><span>🔥 つづけて 学んだ 日数</span><b>${streakNow()}日（さいこう ${st.days.best}日）</b></div>
      <div class="kv"><span>とけた 問題</span><b>${st.ok}問</b></div>
      <div class="kv"><span>せいかい りつ（答えを 見なかった 割合）</span><b>${acc}%</b></div></div>
    <div class="box"><h3>⭐ 学年ごとの ★</h3>${rows}</div>
    <div class="box"><h3>🏆 トロフィー</h3><div class="trophies">${tro}</div></div>
    <div class="box"><h3>⏱ タイムアタックの ベスト</h3>${tas || '<div style="color:var(--sub)">まだ ありません。ホームの「⏱ タイムアタック」から ちょうせん！</div>'}</div>
    ${recStudy()}
    ${medalBox()}`;
}
/* 🏅 メダル ずかん */
function medalBox(){
  const n = S.MEDALS.filter(m => st.md[m.id]).length;
  return `<div class="box" id="medals"><h3>🏅 メダル ずかん（${n} / ${S.MEDALS.length}）</h3><div class="medals">${S.MEDALS.map(m => { const d = st.md[m.id];
    return `<div class="md${d ? '' : ' off'}" title="${esc(m.d)}"><span class="mi">${d ? m.ic : '？'}</span><span class="mt">${esc(m.t)}</span><small>${d ? esc(d.slice(5).replace('-', '/')) : esc(m.d)}</small></div>`; }).join('')}</div></div>`;
}
/* 📝 ふくしゅう・🔎 にがてかも・まちがいの くせ（おうちの 人も 見られるように） */
function recStudy(){
  const due = dueList().length, later = st.rev.length - due, ws = weakUnits();
  const mk = Object.entries(st.mk).filter(e => e[1] > 0 && S.MIS_KINDS[e[0]]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const pct = x => Math.round(x.c / x.n * 100);
  return `<div class="box"><h3>📝 ふくしゅう</h3>
      <div class="kv"><span>きょう ふくしゅう できる 問題</span><b>${due}問</b></div>
      <div class="kv"><span>あとで 出る 問題</span><b>${later}問</b></div>
      ${due ? '<button type="button" class="btn wide" data-act="rev">📝 ふくしゅうする</button>' : ''}</div>
    <div class="box"><h3>🔎 にがてかも</h3>${ws.length ? ws.map(u => `<div class="kv"><span>${u.ic} ${GR[u.g - 1]} ${esc(u.t)}</span><b>ヒントなしで ${pct(st.stat[u.id])}%</b></div>`).join('')
        : '<div style="color:var(--sub);font-size:.88rem">まだ ありません（5問 いじょう といた 単元で、ヒントなしの せいかいが 6わりより 少ないと 出ます）</div>'}</div>
    ${mk.length ? `<div class="box"><h3>🦉 よく ある まちがい</h3>${mk.map(([k, n]) => `<div class="kv"><span>${esc(S.MIS_KINDS[k])}</span><b>${n}回</b></div>`).join('')}</div>` : ''}`;
}
function renderSet(){
  const sw = (k, t, sub) => `<div class="sw"><span>${t}${sub ? `<small>${sub}</small>` : ''}</span><button type="button" class="tg${st.set[k] ? ' on' : ''}" data-act="tg" data-k="${k}" role="switch" aria-checked="${!!st.set[k]}" aria-label="${t}"></button></div>`;
  $('main').innerHTML = `
    <div class="box"><h3>⚙️ せってい</h3>
      ${sw('read', '🔊 問題を 自動で 読み上げる', 'ヒントや 答えも 読み上げます')}
      ${sw('voice', '🎤 問題が 出たら すぐ 声で 答える', '問題が 出ると マイクが 聞きはじめます（ブラウザが マイクの 許可を 聞いてきます）')}
      ${sw('vconf', '🎤 声の 答えは たしかめてから', '聞こえた 答えを □に 入れて「これで いい？」と 聞きます（聞きまちがいで ×に ならない）')}
      ${sw('guide', '🤝 いっしょに とく', 'ヒントの とちゅうの 数も □ に 入れながら 進みます（オフに すると 数が 見える ヒント）')}
      ${sw('auto', '🎚 むずかしさを じどうで かえる', 'ヒントなしで 4問 つづけて できると むずかしく、2問 つづけて つまずくと やさしく します')}
      ${sw('card', '🃏 いつも カードから えらぶ', 'キーで 打つ かわりに、4まいの カードから 答えを えらびます')}
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
    case 'gblank': setGTarget(+el.dataset.s); break;
    case 'card': pickCard(+el.dataset.c); break;
    case 'cardmix': startMix(true); break;
    case 'boss': openBossIntro(+el.dataset.g || st.set.grade); break;
    case 'bossgo': if(!$('modal').hidden){ $('modal').hidden = true; $('mbody').innerHTML = ''; try { history.replaceState(Object.assign({}, view, {d: depth()}), '', location.hash); } catch(_){} } startBoss(+el.dataset.g); break;
    case 'setlv': setLv(u, +el.dataset.l); save(); renderEx(); break;
    case 'rev': startReview(); break;
    case 'key': keyIn(el.dataset.k); break;
    case 'hint': hint(); break;
    case 'read': speakQ(); break;
    case 'mic': listen(); break;
    case 'vok': submit(); break;
    case 'pex': if(ses && ses.p) openExModal(ses.p.unit); break;
    case 'pass': pass(); break;
    case 'next': nextProblem(); break;
    case 'quit': history.back(); break;
    case 'again': if(ses){ const m = ses.mode, uu = ses.u; if(m === 'ta') startTA(uu); else if(m === 'mix') startMix(ses.card && !st.set.card); else if(m === 'rev') startReview(); else if(m === 'boss') startBoss(ses.g); else startStage(uu); } break;
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
setTimeout(() => { if(view.s === 'home' || view.s === 'rec') { if(checkMedals(true).length && view.s === 'rec') render(); } }, 900);   // 前の 版で もう できていた ことの メダル
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
S.app = {state: () => st, ses: () => ses, view: () => view, startStage, startMix, startTA, startReview, keyIn, submit, hint, heard: alts => heardFinal(alts, ses && ses.p),
  levelOf, need, finish, swOfferUpdate, maybeTellWhatsNew, voiceTestShow, dueList, weakUnits, addDays, render,
  startBoss, pickCard, missions, mEvent, checkMedals, medalCtx, lvOf, setLv};
})();
