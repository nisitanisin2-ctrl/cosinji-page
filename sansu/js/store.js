/* ════════════════════════════════════════════════════════════════
   きろくの 保存（この 端末の 中だけ）
   読み込む ときは かならず cleanState を とおす：こわれた ものや、ファイルに 仕込まれた ものが あっても
   決まった 形・決まった 大きさの 数・知っている 単元だけに して 使う
   v5：かぞく（きょうだい）ごとに きろくを 分ける。1人目は これまでと 同じ sansu_v1、2人目からは sansu_v1:p2 …
   どの 人が いるかは sansu_profiles。書き出し・読み込み（バックアップ）も ここ
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU;
const KEY = 'sansu_v1', PKEY = 'sansu_profiles', REV_MAX = 60, LOG_DAYS = 120, PROF_MAX = 8;
S.PROF_ICONS = ['🧒', '👧', '👦', '👶', '🐱', '🐶', '🐰', '🐻', '🦊', '🐼', '🐸', '🦁'];
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v, lo, hi, def) => { v = Math.round(+v); return isFinite(v) && v >= lo && v <= hi ? v : def; };
const str = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n) : '';
function cleanState(o){
  const d = {v: 1, xp: 0, solved: 0, ok: 0, days: {last: '', run: 0, best: 0}, day: {d: '', n: 0}, units: {}, ta: {}, vlog: [],
    rev: [], stat: {}, mk: {},
    lv: {}, ms: {d: '', ids: [], p: {}, ok: [], all: false}, md: {}, boss: {},
    cnt: {voice: 0, guide: 0, card: 0, mastered: 0, msday: 0, combo: 0, hard: 0, early: 0},
    log: {},
    set: {grade: 1, read: false, voice: false, vconf: false, guide: true, auto: true, card: false, sound: true, big: false}};
  if(!o || typeof o !== 'object') return d;
  d.xp = num(o.xp, 0, 1e9, 0); d.solved = num(o.solved, 0, 1e9, 0); d.ok = num(o.ok, 0, d.solved, 0);
  if(o.days && typeof o.days === 'object') d.days = {last: isDay(o.days.last) ? o.days.last : '', run: num(o.days.run, 0, 1e5, 0), best: num(o.days.best, 0, 1e5, 0)};
  if(o.day && typeof o.day === 'object' && isDay(o.day.d)) d.day = {d: o.day.d, n: num(o.day.n, 0, 1e5, 0)};
  // 名前を かえた 単元（v2：速さは 小5 へ）の きろくを 引き継ぐ
  const obj = v => Object.assign({}, v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const units = obj(o.units), ta = obj(o.ta), stat = obj(o.stat), lvs = obj(o.lv), RN = S.UNIT_RENAME || {};
  for(const [a, b] of Object.entries(RN)){ if(units[a] && !units[b]) units[b] = units[a]; if(ta[a] != null && ta[b] == null) ta[b] = ta[a]; if(stat[a] && !stat[b]) stat[b] = stat[a]; if(lvs[a] != null && lvs[b] == null) lvs[b] = lvs[a]; }
  const known = new Set(S.UNITS.map(u => u.id));
  for(const u of S.UNITS){   // 知っている 単元だけ
    const x = units[u.id], y = stat[u.id];
    if(x && typeof x === 'object') d.units[u.id] = {s: num(x.s, 0, 3, 0), n: num(x.n, 0, 1e6, 0), ok: num(x.ok, 0, 1e7, 0), tot: num(x.tot, 0, 1e7, 0), c: num(x.c, 0, 1e7, 0)};
    if(ta[u.id] != null) d.ta[u.id] = num(ta[u.id], 0, 999, 0);
    if(y && typeof y === 'object'){ const n = num(y.n, 0, 1e7, 0); d.stat[u.id] = {n, c: num(y.c, 0, n, 0), x: num(y.x, 0, n, 0)}; }   // 問題数・ヒントなしで せいかい・まちがえた
    if(lvs[u.id] != null){ const l = num(lvs[u.id], 1, 3, 2); if(l !== 2) d.lv[u.id] = l; }   // むずかしさ（ふつう＝2 は 書かない）
  }
  // ふくしゅう：まちがえた 問題を 種（s）で 作り直す。due の 日から 出す。n は つづけて できた 回数
  if(Array.isArray(o.rev)){
    const seen = new Set();
    for(const x of o.rev){
      if(!x || typeof x !== 'object') continue;
      const u = typeof x.u === 'string' ? (RN[x.u] || x.u) : '', sd = num(x.s, 1, 4294967295, 0), k = u + ':' + sd;
      if(!known.has(u) || !sd || !isDay(x.due) || seen.has(k)) continue;
      seen.add(k); d.rev.push({u, s: sd, due: x.due, n: num(x.n, 0, 9, 0), lv: num(x.lv, 1, 3, 2)});
    }
    d.rev = d.rev.slice(-REV_MAX);
  }
  if(o.mk && typeof o.mk === 'object') for(const k of Object.keys(S.MIS_KINDS || {})) if(o.mk[k] != null) d.mk[k] = num(o.mk[k], 0, 1e7, 0);   // まちがいの しゅるいごとの 回数
  // きょうの ミッション（その 日の 分だけ）・メダル（もらった 日）・ボス（学年ごと）・いろいろな 回数（v4）
  const mids = new Set((S.MISSIONS || []).map(m => m.id)), ms = o.ms;
  if(ms && typeof ms === 'object' && isDay(ms.d) && Array.isArray(ms.ids)){
    const ids = [...new Set(ms.ids.filter(id => mids.has(id)))].slice(0, 3), p = {};
    for(const id of ids) if(ms.p && ms.p[id] != null) p[id] = num(ms.p[id], 0, 1000, 0);
    d.ms = {d: ms.d, ids, p, ok: Array.isArray(ms.ok) ? [...new Set(ms.ok.filter(id => ids.includes(id)))] : [], all: ms.all === true};
  }
  if(o.md && typeof o.md === 'object') for(const m of S.MEDALS || []) if(isDay(o.md[m.id])) d.md[m.id] = o.md[m.id];
  if(o.boss && typeof o.boss === 'object') for(let g = 1; g <= 9; g++){ const b = o.boss[g]; if(b && typeof b === 'object') d.boss[g] = {w: num(b.w, 0, 1e5, 0), t: num(b.t, 0, 1e5, 0), b: num(b.b, 0, 99, 0)}; }
  if(o.cnt && typeof o.cnt === 'object') for(const k of Object.keys(d.cnt)) d.cnt[k] = num(o.cnt[k], 0, 1e9, 0);
  // 日ごとの きろく（レポート用。さいきんの LOG_DAYS 日）：n 問題・ok せいかい・c ヒントなし・t 秒・u 単元ごとの 問題数（v5）
  if(o.log && typeof o.log === 'object'){
    const days = Object.keys(o.log).filter(isDay).sort().slice(-LOG_DAYS);
    for(const k of days){
      const x = o.log[k]; if(!x || typeof x !== 'object') continue;
      const n = num(x.n, 0, 1e5, 0), u = {};
      if(x.u && typeof x.u === 'object') for(const id of Object.keys(x.u)){ const to = RN[id] || id; if(known.has(to)) u[to] = (u[to] || 0) + num(x.u[id], 0, 1e5, 0); }
      d.log[k] = {n, ok: num(x.ok, 0, n, 0), c: num(x.c, 0, n, 0), t: num(x.t, 0, 86400, 0), u};
    }
  }
  if(Array.isArray(o.vlog)) d.vlog = o.vlog.filter(x => x && typeof x === 'object' && typeof x.t === 'string').slice(-20).map(x => ({t: str(x.t, 60), f: str(x.f, 60), d: isDay(x.d) ? x.d : ''}));
  if(o.set && typeof o.set === 'object'){ d.set.grade = num(o.set.grade, 1, 9, 1); for(const k of ['read', 'voice', 'vconf', 'guide', 'auto', 'card', 'sound', 'big']) if(typeof o.set[k] === 'boolean') d.set[k] = o.set[k]; }
  return d;
}
/* ── かぞく（プロフィール） ── */
const cleanProfiles = o => {
  const d = {cur: 'p1', list: [{id: 'p1', name: '', ic: S.PROF_ICONS[0]}]};
  if(!o || typeof o !== 'object' || !Array.isArray(o.list)) return d;
  const seen = new Set(), list = [];
  for(const x of o.list){
    if(!x || typeof x !== 'object' || typeof x.id !== 'string' || !/^p\d{1,6}$/.test(x.id) || seen.has(x.id)) continue;
    seen.add(x.id); list.push({id: x.id, name: str(x.name, 12).trim(), ic: S.PROF_ICONS.includes(x.ic) ? x.ic : S.PROF_ICONS[0]});
    if(list.length >= PROF_MAX) break;
  }
  if(!list.length) return d;
  return {cur: list.some(x => x.id === o.cur) ? o.cur : list[0].id, list};
};
const keyOf = id => id === 'p1' ? KEY : KEY + ':' + id;
const readJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(_){ return null; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(_){ return false; } };
const profiles = () => cleanProfiles(readJSON(PKEY));
/* バックアップの ファイル：{app:'sansu', kind:'backup', v:1, ver, at, profiles:[{id,name,ic,data}]} */
function makeBackup(){
  const P = profiles();
  return {app: 'sansu', kind: 'backup', v: 1, ver: S.VERSION || '', at: new Date().toISOString(),
    profiles: P.list.map(x => ({id: x.id, name: x.name, ic: x.ic, data: cleanState(readJSON(keyOf(x.id)))}))};
}
/* ファイルの 中身を たしかめて、読み込める 形に（だめなら null）。名前・きろくは ぜんぶ cleanProfiles・cleanState を とおす */
function readBackup(o){
  if(!o || typeof o !== 'object' || o.app !== 'sansu' || o.kind !== 'backup' || !Array.isArray(o.profiles) || !o.profiles.length) return null;
  const P = cleanProfiles({cur: '', list: o.profiles});
  const data = {};
  for(const x of P.list){ const src = o.profiles.find(y => y && y.id === x.id); data[x.id] = cleanState(src && src.data); }
  return {P, data, at: typeof o.at === 'string' ? o.at.slice(0, 10) : ''};
}
function restoreBackup(b){
  const old = profiles();
  for(const x of old.list) if(x.id !== 'p1' && !b.P.list.some(y => y.id === x.id)) try { localStorage.removeItem(keyOf(x.id)); } catch(_){}
  if(!b.P.list.some(y => y.id === 'p1')) try { localStorage.removeItem(KEY); } catch(_){}
  for(const x of b.P.list) writeJSON(keyOf(x.id), b.data[x.id]);
  writeJSON(PKEY, b.P);
}
S.store = {
  KEY, PKEY, REV_MAX, LOG_DAYS, PROF_MAX, clean: cleanState, cleanProfiles, isDay, num, str, keyOf, profiles, makeBackup, readBackup, restoreBackup,
  load(){ return cleanState(readJSON(keyOf(profiles().cur))); },
  save(st){ writeJSON(keyOf(profiles().cur), st); },
  /* かぞくを ふやす・名前や 絵を かえる・へらす・きりかえる */
  addProfile(name, ic){
    const P = profiles(); if(P.list.length >= PROF_MAX) return null;
    let n = 2; while(P.list.some(x => x.id === 'p' + n)) n++;
    const p = {id: 'p' + n, name: str(name, 12).trim(), ic: S.PROF_ICONS.includes(ic) ? ic : S.PROF_ICONS[P.list.length % S.PROF_ICONS.length]};
    P.list.push(p); writeJSON(PKEY, P); return p;
  },
  editProfile(id, name, ic){ const P = profiles(), x = P.list.find(y => y.id === id); if(!x) return; if(name != null) x.name = str(name, 12).trim(); if(ic && S.PROF_ICONS.includes(ic)) x.ic = ic; writeJSON(PKEY, P); },
  removeProfile(id){
    const P = profiles(); if(P.list.length <= 1 || !P.list.some(x => x.id === id)) return false;
    P.list = P.list.filter(x => x.id !== id); if(P.cur === id) P.cur = P.list[0].id;
    try { localStorage.removeItem(keyOf(id)); } catch(_){}
    writeJSON(PKEY, P); return true;
  },
  switchProfile(id){ const P = profiles(); if(!P.list.some(x => x.id === id)) return false; P.cur = id; writeJSON(PKEY, P); return true; },
};
})();
