/* 隠しお気に入り帳（メモ）のプログラム。index.html の中に書かず、このファイルに分けている
   （ページの中に書いたプログラムは動かさない決まり＝CSP にしているので）（表電卓 v526）
   表のメモ帳の 書く 所（声・かざり・出力）は memo.js（MemoEd）。ここでは 中身の 出し入れだけ 使う（v529） */
'use strict';
/* ══════════════════════════════════════════════════════════════
   隠しお気に入り帳
   ・表向きは「メモ帳」。合言葉を知らない人には、保管庫の存在自体が見えない。
   ・中身は AES-GCM（256bit）で錠をかけて、この端末の localStorage にだけ置く。
     合言葉から鍵を作るのは PBKDF2-SHA256（21万回）。通信は一切しない。
   ══════════════════════════════════════════════════════════════ */

const KEY  = 'memo.local.v1';   // 保存場所の名前もそっけなくしておく
const ITER = 210000;            // 合言葉を鍵に練り直す回数（総当たりを重くする）
const PAD  = 1024;              // 中身の長さを丸めて、件数の多さを覗かせない
const enc = new TextEncoder(), dec = new TextDecoder();

/* ── 保存場所（表のメモ文・そのかざり と、錠つきの塊の束） ──
   t：メモの文字だけ。h：かざりがあるときだけ、決まった span だけの HTML（読むときに memo.js が作り直す） */
function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') {
      const o = { t: String(s.t || ''), b: Array.isArray(s.b) ? s.b : [] };
      if (typeof s.h === 'string' && s.h) o.h = s.h;
      return o;
    }
  } catch (e) {}
  return { t: '', b: [] };
}
function saveStore(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; }
  catch (e) { toast('保存できませんでした'); return false; }
}

/* ── 錠まわり ── */
const b64 = u => btoa(String.fromCharCode.apply(null, Array.from(u)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
// 塊の中身：[版1][塩16][初期値12][暗号文…]
async function seal(pass, obj) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(pass, salt);
  let body = JSON.stringify(obj);
  body += ' '.repeat((PAD - (enc.encode(body).length % PAD)) % PAD);   // 長さを丸める
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(body)));
  const out = new Uint8Array(29 + ct.length);
  out[0] = 1; out.set(salt, 1); out.set(iv, 17); out.set(ct, 29);
  return b64(out);
}
async function unseal(pass, block) {
  try {
    const raw = unb64(block);
    if (raw[0] !== 1 || raw.length < 46) return null;
    const key = await deriveKey(pass, raw.slice(1, 17));
    const pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(17, 29) }, key, raw.slice(29));
    return JSON.parse(dec.decode(pt));   // 合言葉が違えば復号の時点で必ず失敗する
  } catch (e) { return null; }
}

/* ── いま開いている保管庫（画面を閉じたら消す） ── */
let cur = null;   // { pass, idx, data }
const DEF = { v: 1, items: [], set: { idle: 60, blur: 1, open: 'open', sort: 'new' } };

/* ── ちいさな道具 ── */
const $ = s => document.querySelector(s);
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
}
function openSheet(id) { $(id).classList.add('on'); }
function closeSheets() { document.querySelectorAll('.sheet.on').forEach(s => s.classList.remove('on')); }
document.addEventListener('click', e => {
  if (e.target.hasAttribute && e.target.hasAttribute('data-close')) closeSheets();
  if (e.target.classList.contains('sheet')) closeSheets();
});

/* ══ 表のメモ帳 ══
   途中で勝手に保存しない（合言葉をメモ欄に書いて開くので、合言葉が残らないように）。「保存」をおしたときだけ。
   保存したメモはいくつでも持てて、📂 呼び出す から開く（v530）。
   ・一覧は別の場所（memo.list.v1）に置く。前の版のプログラムが memo.local.v1 を書き直しても一覧は消えない
   ・memo.local.v1 の t・h には、いま開いているメモの中身を写しておく（前の版で開いても同じものが出る）。
     前の版で保存されて一覧にない文があれば、次に開いたとき一覧に入れる */
const ME = window.MemoEd;
const LIST_KEY = 'memo.list.v1';
$('#today').textContent = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

const newMemoId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function cleanMemo(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !/^m[0-9a-z]{4,24}$/.test(x.id) || typeof x.t !== 'string') return null;
  const o = { id: x.id, t: x.t, at: Number(x.at) || 0, up: Number(x.up) || Number(x.at) || 0 };
  if (typeof x.h === 'string' && x.h) o.h = x.h;
  return o;
}
function loadList() {
  let L = null;
  try {
    const o = JSON.parse(localStorage.getItem(LIST_KEY));
    if (o && typeof o === 'object' && Array.isArray(o.items)) {
      const seen = {}, items = [];
      o.items.forEach(x => { const c = cleanMemo(x); if (c && !seen[c.id]) { seen[c.id] = 1; items.push(c); } });
      L = { cur: typeof o.cur === 'string' && seen[o.cur] ? o.cur : null, items };
    }
  } catch (e) {}
  const s = loadStore();
  if (!L) L = { cur: null, items: [] };
  // はじめて開いたとき（これまでの1つだけのメモ）や、前の版で保存した文は、一覧に入れて開く
  if (s.t.trim() && !L.items.some(x => x.t === s.t)) {
    const now = Date.now(), it = { id: newMemoId(), t: s.t, at: now, up: now };
    if (s.h) it.h = s.h;
    L.items.push(it); L.cur = it.id;
    saveList(L);
  }
  return L;
}
function saveList(L) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(L)); return true; }
  catch (e) { toast('保存できませんでした（空きが足りないかもしれません）'); return false; }
}
let ML = loadList();
const curMemo = () => ML.cur ? ML.items.find(x => x.id === ML.cur) || null : null;
const firstLine = t => { const l = String(t || '').split('\n').map(x => x.trim()).find(Boolean) || ''; return l.length > 40 ? l.slice(0, 40) + '…' : l; };
const phCount = h => (String(h || '').match(/data-id="p[0-9a-z]{4,24}"/g) || []).length;   // 📷 写真の枚数（v531）
const titleOf = it => firstLine(it.t) || (phCount(it.h) ? '（写真）' : '（無題）');
// memo.local.v1 の t・h を、いま開いているメモにそろえる（消したメモの文がここに残らないように）
function mirror() {
  const s = loadStore(), it = curMemo();
  s.t = it ? it.t : '';
  if (it && it.h) s.h = it.h; else delete s.h;
  saveStore(s);
}
function updDoc() {
  const it = curMemo();
  $('#docTtl').textContent = '📄 ' + (it ? titleOf(it) : '新しいメモ');
}
function showMemo(it) { ME.load(it || { t: '' }); updDoc(); }
// どのメモにも使われなくなった写真を片づける（保存しなかった写真・消したメモの写真）
function gcPhotos() { ME.gcPhotos(ML.items.map(x => x.h || '').concat([loadStore().h || ''])).catch(() => {}); }
showMemo(curMemo());
gcPhotos();

function saveMemo() {
  const d = ME.dump(), it = curMemo();
  if (!d.t.trim() && !d.n) { toast(it ? '空のメモは保存しません（消すときは 📂 呼び出す の 🗑 から）' : 'まだ何も書いていません'); return false; }
  const now = Date.now(), x = it || { id: newMemoId(), t: '', at: now, up: now };
  x.t = d.t; x.up = now;
  if (d.h) x.h = d.h; else delete x.h;
  if (!it) { ML.items.push(x); ML.cur = x.id; }
  if (!saveList(ML)) { ML = loadList(); updDoc(); return false; }
  mirror(); ME.markSaved(); updDoc(); toast('保存しました');
  return true;
}
$('#save').addEventListener('click', saveMemo);

/* 保存していない変更があるときは、ほかのメモに移る前に聞く */
let dsFn = null;
function guard(fn) {
  if (!ME.dirty() || ME.blank()) { fn(); return; }
  dsFn = fn;
  const it = curMemo();
  $('#dsText').textContent = (it ? '「' + titleOf(it) + '」' : '新しいメモ') + 'の変更を保存しますか？';
  openSheet('#dsSheet');
}
const dsDone = () => { const f = dsFn; dsFn = null; $('#dsSheet').classList.remove('on'); return f; };
$('#dsSave').addEventListener('click', () => { const f = dsDone(); if (saveMemo() && f) f(); });
$('#dsDrop').addEventListener('click', () => { const f = dsDone(); if (f) f(); });
$('#dsNo').addEventListener('click', () => { dsDone(); });

/* ＋ 新しく：いまのメモは残したまま、空のメモを書き始める */
function newMemo() {
  guard(() => {
    ME.stop();
    ML.cur = null; saveList(ML); mirror();
    showMemo(null); closeSheets(); gcPhotos();
    if (!matchMedia('(pointer: coarse)').matches) $('#memo').focus();   // スマホではキーボードを出さない（🎤 で書く人のため）
  });
}
$('#newBtn').addEventListener('click', newMemo);
$('#lsNew').addEventListener('click', newMemo);

/* 📂 呼び出す：保存したメモの一覧（新しい順・さがす・🗑 消す） */
function whenStr(ts) {
  if (!ts) return '';
  const d = new Date(ts), n = new Date(), hm = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  if (d.toDateString() === n.toDateString()) return '今日 ' + hm;
  const y = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'きのう ' + hm;
  if (d.getFullYear() === n.getFullYear()) return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}
function memoRow(it) {
  const row = document.createElement('div');
  row.className = 'ls-item' + (it.id === ML.cur ? ' cur' : '');
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ls-open'; b.dataset.id = it.id;
  const ttl = document.createElement('span'); ttl.className = 'ls-ttl'; ttl.textContent = titleOf(it);
  const sub = document.createElement('span'); sub.className = 'ls-sub';
  const np = phCount(it.h);
  sub.textContent = [whenStr(it.up), it.t.length + '文字', np ? '📷 ' + np + '枚' : '', it.h && /class="[^"]*\b[wuxfscm]-/.test(it.h) ? '🎨 書式あり' : '', it.id === ML.cur ? '開いています' : ''].filter(Boolean).join('・');
  b.appendChild(ttl); b.appendChild(sub);
  const lines = it.t.split('\n').map(x => x.trim()).filter(Boolean);
  if (lines.length > 1) { const pv = document.createElement('span'); pv.className = 'ls-pv'; pv.textContent = lines.slice(1).join(' ').slice(0, 80); b.appendChild(pv); }
  row.appendChild(b);
  const del = document.createElement('button'); del.type = 'button'; del.className = 'icon-btn ls-del'; del.dataset.del = it.id;
  del.textContent = '🗑'; del.title = '消す'; del.setAttribute('aria-label', '「' + titleOf(it) + '」を消す');
  row.appendChild(del);
  return row;
}
function renderMemos() {
  const box = $('#lsList'), q = $('#lsQ').value.trim().toLowerCase();
  const items = ML.items.slice().sort((a, b) => (b.up || 0) - (a.up || 0));
  $('#lsTitle').textContent = '保存したメモ' + (items.length ? '（' + items.length + '）' : '');
  $('#lsQ').hidden = items.length < 2;
  box.textContent = '';
  const hit = q ? items.filter(it => it.t.toLowerCase().indexOf(q) >= 0) : items;
  if (!hit.length) {
    const e = document.createElement('div'); e.className = 'ls-empty';
    e.textContent = items.length ? '見つかりません' : 'まだ保存したメモはありません。書いて「保存」をおすと、ここに入ります。';
    box.appendChild(e); return;
  }
  hit.forEach(it => box.appendChild(memoRow(it)));
}
function openList() { ME.stop(); $('#lsQ').value = ''; renderMemos(); openSheet('#lsSheet'); }
$('#lsBtn').addEventListener('click', openList);
$('#docTtl').addEventListener('click', openList);
$('#lsQ').addEventListener('input', renderMemos);
function openMemo(id) {
  const it = ML.items.find(x => x.id === id); if (!it) return;
  guard(() => {
    ML.cur = id; saveList(ML); mirror();
    showMemo(it); closeSheets(); gcPhotos();
    toast('「' + titleOf(it) + '」を開きました');
  });
}
function deleteMemo(id) {
  const i = ML.items.findIndex(x => x.id === id); if (i < 0) return;
  const wasCur = ML.cur === id;
  ML.items.splice(i, 1);
  if (wasCur) ML.cur = null;
  if (!saveList(ML)) { ML = loadList(); renderMemos(); return; }
  mirror();
  if (wasCur) showMemo(null);
  renderMemos(); toast('消しました'); gcPhotos();
}
$('#lsList').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const row = t.closest('.ls-item');
  if (t.dataset.id) { openMemo(t.dataset.id); return; }
  if (t.dataset.del) {   // その場で「消しますか？」と聞く
    if (row.querySelector('.ls-ask')) return;
    const ask = document.createElement('div'); ask.className = 'ls-ask';
    const msg = document.createElement('span'); msg.textContent = '消しますか？';
    const no = document.createElement('button'); no.type = 'button'; no.className = 'btn sub'; no.dataset.no = '1'; no.textContent = 'やめる';
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'btn danger'; yes.dataset.yes = t.dataset.del; yes.textContent = '消す';
    ask.appendChild(msg); ask.appendChild(no); ask.appendChild(yes);
    t.hidden = true; row.appendChild(ask); row.classList.add('asking');
    return;
  }
  if (t.dataset.no) { renderMemos(); return; }
  if (t.dataset.yes) deleteMemo(t.dataset.yes);
});

/* 「メモ」の文字：ふつうにおす＝開ける、長おし＝新しく作る */
const brand = $('#brand');
let holdTimer = 0, held = false;
brand.addEventListener('pointerdown', () => {
  held = false;
  holdTimer = setTimeout(() => { held = true; askMake(); }, 900);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
  brand.addEventListener(ev, () => clearTimeout(holdTimer)));
brand.addEventListener('click', () => {
  if (held) { held = false; return; }
  tryUnlock();
});
brand.addEventListener('contextmenu', e => e.preventDefault());

/* 合言葉で開ける。合わなければ「何も起きない」＝ただのメモ帳のまま */
let busy = false;
async function tryUnlock() {
  const pass = ME.text().trim();
  if (busy || !pass) return;
  busy = true;
  const store = loadStore();
  for (let i = 0; i < store.b.length; i++) {
    const data = await unseal(pass, store.b[i]);
    if (data) {
      cur = { pass, idx: i, data: normalize(data) };
      showMemo(curMemo());                 // 合言葉を画面に残さない（↶ でも戻せない）。開いていたメモにもどす
      enterVault();
      busy = false;
      return;
    }
  }
  busy = false;
}
function normalize(d) {
  const s = Object.assign({}, DEF.set, d && d.set);
  return { v: 1, items: Array.isArray(d && d.items) ? d.items : [], set: s };
}

/* 新しい保管庫を作る */
function askMake() {
  $('#mk1').value = ''; $('#mk2').value = ''; $('#mkMsg').textContent = '';
  openSheet('#mkSheet'); setTimeout(() => $('#mk1').focus(), 30);
}
$('#mkGo').addEventListener('click', async () => {
  const p1 = $('#mk1').value, p2 = $('#mk2').value;
  if (p1.length < 4) { $('#mkMsg').textContent = '合言葉は4文字以上にしてください。'; return; }
  if (p1 !== p2)     { $('#mkMsg').textContent = '2つが同じではありません。'; return; }
  const store = loadStore();
  for (const b of store.b) {
    if (await unseal(p1, b)) { $('#mkMsg').textContent = 'その合言葉の保管庫はすでにあります。'; return; }
  }
  const data = JSON.parse(JSON.stringify(DEF));
  store.b.push(await seal(p1, data));
  if (!saveStore(store)) return;
  cur = { pass: p1, idx: store.b.length - 1, data };
  $('#mk1').value = ''; $('#mk2').value = '';
  closeSheets();
  enterVault();
});

/* ══ 保管庫の中 ══ */
function enterVault() {
  ME.stop();                               // 🎤・読み上げを 止める
  document.body.classList.add('open');
  $('#q').value = ''; filterTag = '';
  applySettings();
  render();
  resetIdle();
}
function lock() {
  cur = null;
  document.body.classList.remove('open', 'veil');
  closeSheets(); $('#menu').classList.remove('on');
  $('#list').textContent = ''; $('#tags').textContent = ''; $('#q').value = '';
  clearTimeout(idleTimer);
}
$('#lockBtn').addEventListener('click', lock);
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  // Esc は「開いているものを1枚ずつ」閉じ、最後に保管庫を閉じる
  const menu = $('#menu');
  if (menu.classList.contains('on')) { menu.classList.remove('on'); return; }
  if (document.querySelector('.sheet.on')) { closeSheets(); return; }
  if (cur) lock();
});

/* ほうっておいたら閉じる／ほかの画面に移ったら閉じる */
let idleTimer = 0;
function resetIdle() {
  clearTimeout(idleTimer);
  const sec = cur ? Number(cur.data.set.idle) : 0;
  if (cur && sec > 0) idleTimer = setTimeout(lock, sec * 1000);
}
['pointerdown', 'keydown', 'input', 'scroll'].forEach(ev =>
  document.addEventListener(ev, () => { if (cur) resetIdle(); }, true));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { document.body.classList.remove('veil'); return; }
  if (!cur) return;
  if (Number(cur.data.set.blur)) lock(); else document.body.classList.add('veil');
});
window.addEventListener('blur',  () => { if (cur) document.body.classList.add('veil'); });
window.addEventListener('focus', () => document.body.classList.remove('veil'));

/* 保存（開いている保管庫だけを錠つきで書き戻す） */
async function persist() {
  if (!cur) return;
  const store = loadStore();
  const block = await seal(cur.pass, cur.data);
  if (cur.idx < store.b.length) store.b[cur.idx] = block; else { store.b.push(block); cur.idx = store.b.length - 1; }
  saveStore(store);
}

/* ── 一覧の描画 ── */
let filterTag = '';
function tidyUrl(u) {
  let s = String(u || '').trim();
  if (!s) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
  try {
    const url = new URL(s);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';   // javascript: などは受け付けない
    return url.href;
  } catch (e) { return ''; }
}
function sorted(items) {
  const a = items.slice();
  const mode = cur.data.set.sort;
  a.sort((x, y) => {
    if (!!y.pin !== !!x.pin) return (y.pin ? 1 : 0) - (x.pin ? 1 : 0);
    if (mode === 'name') return String(x.title).localeCompare(String(y.title), 'ja');
    if (mode === 'hit')  return (y.hits || 0) - (x.hits || 0) || (y.at || 0) - (x.at || 0);
    return (y.at || 0) - (x.at || 0);
  });
  return a;
}
function render() {
  if (!cur) return;
  const list = $('#list'); list.textContent = '';
  const q = $('#q').value.trim().toLowerCase();

  // ふだ（タグ）の並び
  const tagBox = $('#tags'); tagBox.textContent = '';
  const tags = [];
  cur.data.items.forEach(it => (it.tags || []).forEach(t => { if (t && tags.indexOf(t) < 0) tags.push(t); }));
  tags.sort((a, b) => a.localeCompare(b, 'ja'));
  tags.forEach(t => {
    const c = document.createElement('button');
    c.className = 'chip' + (filterTag === t ? ' on' : ''); c.textContent = t;
    c.addEventListener('click', () => { filterTag = (filterTag === t ? '' : t); render(); });
    tagBox.appendChild(c);
  });

  const hit = sorted(cur.data.items).filter(it => {
    if (filterTag && (it.tags || []).indexOf(filterTag) < 0) return false;
    if (!q) return true;
    return (it.title + ' ' + it.url + ' ' + (it.memo || '') + ' ' + (it.tags || []).join(' ')).toLowerCase().indexOf(q) >= 0;
  });

  if (!hit.length) {
    const e = document.createElement('div'); e.id = 'empty';
    e.textContent = cur.data.items.length ? '見つかりません' : 'まだ空です。右下の ＋ で入れられます。';
    list.appendChild(e); return;
  }
  hit.forEach(it => list.appendChild(row(it)));
}
function row(it) {
  const el = document.createElement('div'); el.className = 'item';

  const star = document.createElement('button');
  star.className = 'icon-btn pin' + (it.pin ? '' : ' off'); star.textContent = '★'; star.title = '上に留める';
  star.addEventListener('click', async () => { it.pin = !it.pin; await persist(); render(); });
  el.appendChild(star);

  const body = document.createElement('div'); body.className = 'body';
  const ttl = document.createElement('div'); ttl.className = 'ttl'; ttl.textContent = it.title || it.url;
  ttl.style.cursor = 'pointer';
  ttl.addEventListener('click', () => go(it));
  body.appendChild(ttl);
  const url = document.createElement('div'); url.className = 'url'; url.textContent = it.url;
  body.appendChild(url);
  if (it.memo) { const m = document.createElement('div'); m.className = 'note'; m.textContent = it.memo; body.appendChild(m); }
  if ((it.tags || []).length) {
    const tr = document.createElement('div'); tr.className = 'tagrow';
    it.tags.forEach(t => { const s = document.createElement('span'); s.textContent = t; tr.appendChild(s); });
    body.appendChild(tr);
  }
  el.appendChild(body);

  const acts = document.createElement('div'); acts.className = 'acts';
  acts.appendChild(mkBtn('⧉', 'URLを写す', () => copy(it.url)));
  acts.appendChild(mkBtn('✎', '直す', () => askEdit(it)));
  acts.appendChild(mkBtn('🗑', '消す', () => askRemove(it)));
  el.appendChild(acts);
  return el;
}
function mkBtn(label, title, fn) {
  const b = document.createElement('button');
  b.className = 'icon-btn'; b.textContent = label; b.title = title;
  b.addEventListener('click', fn);
  return b;
}
async function go(it) {
  it.hits = (it.hits || 0) + 1; await persist();
  if (cur.data.set.open === 'copy') { copy(it.url); return; }
  window.open(it.url, '_blank', 'noopener,noreferrer');
}
function copy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('URLを写しました'), () => toast('写せませんでした'));
  } else {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
    t.select(); try { document.execCommand('copy'); toast('URLを写しました'); } catch (e) { toast('写せませんでした'); }
    document.body.removeChild(t);
  }
}

/* ── 追加・編集 ── */
let editing = null;
function askEdit(it) {
  editing = it || null;
  $('#edTitle').textContent = it ? '直す' : '追加';
  $('#edGo').textContent = it ? '直す' : '入れる';
  $('#edName').value = it ? it.title : '';
  $('#edUrl').value  = it ? it.url : '';
  $('#edTags').value = it ? (it.tags || []).join(', ') : (filterTag || '');
  $('#edMemo').value = it ? (it.memo || '') : '';
  $('#edMsg').textContent = '';
  openSheet('#edSheet');
  setTimeout(() => $('#edUrl').focus(), 30);
}
$('#add').addEventListener('click', () => askEdit(null));
$('#edGo').addEventListener('click', async () => {
  const url = tidyUrl($('#edUrl').value);
  if (!url) { $('#edMsg').textContent = 'URL を確かめてください（http / https のみ）。'; return; }
  const tags = $('#edTags').value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 12);
  const title = $('#edName').value.trim() || (new URL(url)).hostname.replace(/^www\./, '');
  if (editing) {
    Object.assign(editing, { title, url, tags, memo: $('#edMemo').value.trim(), up: Date.now() });
  } else {
    cur.data.items.push({ id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                          title, url, tags, memo: $('#edMemo').value.trim(), pin: false, hits: 0, at: Date.now() });
  }
  await persist(); closeSheets(); render();
  toast(editing ? '直しました' : '入れました');
  editing = null;
});

/* ── 消す（確認つき） ── */
let okFn = null;
function confirmBox(title, text, fn) {
  $('#okTitle').textContent = title; $('#okText').textContent = text; okFn = fn; openSheet('#okSheet');
}
$('#okGo').addEventListener('click', () => { const f = okFn; okFn = null; closeSheets(); if (f) f(); });
function askRemove(it) {
  confirmBox('消しますか', '「' + (it.title || it.url) + '」を消します。元に戻せません。', async () => {
    cur.data.items = cur.data.items.filter(x => x !== it);
    await persist(); render(); toast('消しました');
  });
}

/* ── メニュー ── */
$('#menuBtn').addEventListener('click', () => $('#menu').classList.add('on'));
$('#menu').addEventListener('click', e => {
  const m = e.target.getAttribute && e.target.getAttribute('data-m');
  $('#menu').classList.remove('on');
  if (!m) return;
  if (m === 'add') askEdit(null);
  if (m === 'cf') { applySettingsToForm(); openSheet('#cfSheet'); }
  if (m === 'hp') openSheet('#hpSheet');
  if (m === 'pw') { $('#pw1').value = ''; $('#pw2').value = ''; $('#pwMsg').textContent = ''; openSheet('#pwSheet'); }
  if (m === 'ex') exportBox();
  if (m === 'im') importBox();
  if (m === 'rm') askRemoveVault();
});

/* ── 設定 ── */
function applySettings() { resetIdle(); }
function applySettingsToForm() {
  $('#cfIdle').value = String(cur.data.set.idle);
  $('#cfBlur').value = String(cur.data.set.blur);
  $('#cfOpen').value = cur.data.set.open;
  $('#cfSort').value = cur.data.set.sort;
}
[['#cfIdle', 'idle'], ['#cfBlur', 'blur'], ['#cfOpen', 'open'], ['#cfSort', 'sort']].forEach(([sel, key]) => {
  $(sel).addEventListener('change', async () => {
    cur.data.set[key] = (key === 'idle' || key === 'blur') ? Number($(sel).value) : $(sel).value;
    await persist(); applySettings(); render();
  });
});

/* ── 合言葉の変更 ── */
$('#pwGo').addEventListener('click', async () => {
  const p1 = $('#pw1').value, p2 = $('#pw2').value;
  if (p1.length < 4) { $('#pwMsg').textContent = '合言葉は4文字以上にしてください。'; return; }
  if (p1 !== p2)     { $('#pwMsg').textContent = '2つが同じではありません。'; return; }
  const store = loadStore();
  for (let i = 0; i < store.b.length; i++) {
    if (i !== cur.idx && await unseal(p1, store.b[i])) { $('#pwMsg').textContent = 'ほかの保管庫と同じ合言葉は使えません。'; return; }
  }
  cur.pass = p1;
  await persist();
  $('#pw1').value = ''; $('#pw2').value = '';
  closeSheets(); toast('合言葉を変えました');
});

/* ── 控えの書き出し／読み込み（錠がかかったままの文字列をやり取りする） ── */
let ioMode = 'ex';
async function exportBox() {
  ioMode = 'ex';
  $('#ioTitle').textContent = '控えを書き出す';
  $('#ioHelp').textContent = '下の文字列が控えです。錠がかかったままなので、そのままメールや紙に控えても中身は読まれません。戻すときは同じ合言葉が要ります。';
  $('#ioText').value = await seal(cur.pass, cur.data);
  $('#ioMsg').textContent = '';
  $('#ioGo').textContent = 'ファイルに落とす';
  openSheet('#ioSheet');
  setTimeout(() => $('#ioText').select(), 30);
}
function importBox() {
  ioMode = 'im';
  $('#ioTitle').textContent = '控えを読み込む';
  $('#ioHelp').textContent = '書き出した文字列を貼り付けてください。いまの保管庫と同じ合言葉の控えなら、中身を差し替えます。';
  $('#ioText').value = ''; $('#ioMsg').textContent = '';
  $('#ioGo').textContent = '読み込む';
  openSheet('#ioSheet');
  setTimeout(() => $('#ioText').focus(), 30);
}
$('#ioGo').addEventListener('click', async () => {
  if (ioMode === 'ex') {
    const blob = new Blob([$('#ioText').value], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'memo-backup-' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('書き出しました');
    return;
  }
  const data = await unseal(cur.pass, $('#ioText').value.trim());
  if (!data) { $('#ioMsg').textContent = '読めませんでした（合言葉が違うか、文字列が欠けています）。'; return; }
  confirmBox('入れ替えますか', 'いまの ' + cur.data.items.length + ' 件を、控えの ' + ((data.items || []).length) + ' 件で置き換えます。', async () => {
    cur.data = normalize(data);
    await persist(); applySettings(); render(); toast('読み込みました');
  });
});

/* ── 保管庫ごと消す ── */
function askRemoveVault() {
  confirmBox('保管庫を消しますか', '中身 ' + cur.data.items.length + ' 件がすべて消えます。元に戻せません。', () => {
    const store = loadStore();
    store.b.splice(cur.idx, 1);
    saveStore(store);
    lock();
    toast('消しました');
  });
}

$('#q').addEventListener('input', render);

/* ── Enter で決定（小窓の中の1行入力） ── */
[['#mk1', '#mkGo'], ['#mk2', '#mkGo'], ['#pw1', '#pwGo'], ['#pw2', '#pwGo'],
 ['#edName', '#edGo'], ['#edUrl', '#edGo'], ['#edTags', '#edGo']].forEach(([sel, go]) => {
  $(sel).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $(go).click(); } });
});

/* ── オフラインでも使えるようにする ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
}

/* 表電卓から開いたときだけ「← 表電卓」を出す */
(function(){
  try{ if(/from=hyo/.test(location.hash)){ sessionStorage.setItem('memo_from_hyo','1'); history.replaceState(history.state,'',location.pathname+location.search); } }catch(_){}
  let from=false; try{ from=sessionStorage.getItem('memo_from_hyo')==='1'; }catch(_){}
  const b=document.getElementById('backHyo'); if(b) b.hidden=!from;
  /* 戻るの見張り（backguard.js。v535）：下から出る窓（一覧・出力・設定…）とメニューは、端末の「戻る」で窓だけ閉じる。
     何も開いていないときは一度知らせてから表電卓へ（以前は窓が開いていても「戻る」でアプリごと表電卓へ戻っていた） */
  BackGuard.setup({app:'notes', fromHyo:from, toast:m=>toast(m)});
  BackGuard.watch('.sheet', el=>el.classList.contains('on'), el=>el.classList.remove('on'));
  BackGuard.watch('#menu', el=>el.classList.contains('on'), el=>el.classList.remove('on'));
  // 「← 表電卓」：開いた窓の分などをまとめて戻って、表電卓へ
  const backToHyo=function(){ BackGuard.home('../'+(location.protocol==='file:'?'index.html':'')); };
  if(b) b.addEventListener('click', backToHyo);
})();
