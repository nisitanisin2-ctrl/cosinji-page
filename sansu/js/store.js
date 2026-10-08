/* ════════════════════════════════════════════════════════════════
   きろくの 保存（この 端末の 中だけ）
   読み込む ときは かならず cleanState を とおす：こわれた ものや、ファイルに 仕込まれた ものが あっても
   決まった 形・決まった 大きさの 数・知っている 単元だけに して 使う
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU;
const KEY = 'sansu_v1', REV_MAX = 60;
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v, lo, hi, def) => { v = Math.round(+v); return isFinite(v) && v >= lo && v <= hi ? v : def; };
const str = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n) : '';
function cleanState(o){
  const d = {v: 1, xp: 0, solved: 0, ok: 0, days: {last: '', run: 0, best: 0}, day: {d: '', n: 0}, units: {}, ta: {}, vlog: [],
    rev: [], stat: {}, mk: {},
    set: {grade: 1, read: false, voice: false, vconf: false, guide: true, sound: true, big: false}};
  if(!o || typeof o !== 'object') return d;
  d.xp = num(o.xp, 0, 1e9, 0); d.solved = num(o.solved, 0, 1e9, 0); d.ok = num(o.ok, 0, d.solved, 0);
  if(o.days && typeof o.days === 'object') d.days = {last: isDay(o.days.last) ? o.days.last : '', run: num(o.days.run, 0, 1e5, 0), best: num(o.days.best, 0, 1e5, 0)};
  if(o.day && typeof o.day === 'object' && isDay(o.day.d)) d.day = {d: o.day.d, n: num(o.day.n, 0, 1e5, 0)};
  // 名前を かえた 単元（v2：速さは 小5 へ）の きろくを 引き継ぐ
  const obj = v => Object.assign({}, v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const units = obj(o.units), ta = obj(o.ta), stat = obj(o.stat), RN = S.UNIT_RENAME || {};
  for(const [a, b] of Object.entries(RN)){ if(units[a] && !units[b]) units[b] = units[a]; if(ta[a] != null && ta[b] == null) ta[b] = ta[a]; if(stat[a] && !stat[b]) stat[b] = stat[a]; }
  const known = new Set(S.UNITS.map(u => u.id));
  for(const u of S.UNITS){   // 知っている 単元だけ
    const x = units[u.id], y = stat[u.id];
    if(x && typeof x === 'object') d.units[u.id] = {s: num(x.s, 0, 3, 0), n: num(x.n, 0, 1e6, 0), ok: num(x.ok, 0, 1e7, 0), tot: num(x.tot, 0, 1e7, 0), c: num(x.c, 0, 1e7, 0)};
    if(ta[u.id] != null) d.ta[u.id] = num(ta[u.id], 0, 999, 0);
    if(y && typeof y === 'object'){ const n = num(y.n, 0, 1e7, 0); d.stat[u.id] = {n, c: num(y.c, 0, n, 0), x: num(y.x, 0, n, 0)}; }   // 問題数・ヒントなしで せいかい・まちがえた
  }
  // ふくしゅう：まちがえた 問題を 種（s）で 作り直す。due の 日から 出す。n は つづけて できた 回数
  if(Array.isArray(o.rev)){
    const seen = new Set();
    for(const x of o.rev){
      if(!x || typeof x !== 'object') continue;
      const u = typeof x.u === 'string' ? (RN[x.u] || x.u) : '', sd = num(x.s, 1, 4294967295, 0), k = u + ':' + sd;
      if(!known.has(u) || !sd || !isDay(x.due) || seen.has(k)) continue;
      seen.add(k); d.rev.push({u, s: sd, due: x.due, n: num(x.n, 0, 9, 0)});
    }
    d.rev = d.rev.slice(-REV_MAX);
  }
  if(o.mk && typeof o.mk === 'object') for(const k of Object.keys(S.MIS_KINDS || {})) if(o.mk[k] != null) d.mk[k] = num(o.mk[k], 0, 1e7, 0);   // まちがいの しゅるいごとの 回数
  if(Array.isArray(o.vlog)) d.vlog = o.vlog.filter(x => x && typeof x === 'object' && typeof x.t === 'string').slice(-20).map(x => ({t: str(x.t, 60), f: str(x.f, 60), d: isDay(x.d) ? x.d : ''}));
  if(o.set && typeof o.set === 'object'){ d.set.grade = num(o.set.grade, 1, 9, 1); for(const k of ['read', 'voice', 'vconf', 'guide', 'sound', 'big']) if(typeof o.set[k] === 'boolean') d.set[k] = o.set[k]; }
  return d;
}
S.store = {
  KEY, REV_MAX, clean: cleanState, isDay, num, str,
  load(){ try { return cleanState(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch(_){ return cleanState(null); } },
  save(st){ try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(_){} },
};
})();
