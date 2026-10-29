/* ⏱ ど派手タイマー（v575。表電卓の道具。はじめて開いたときに読む。apps/hadetimer/ から単独のアプリとしても開ける）
   ・⏳ タイマー（決めた時間から 0 へ）・⏱ ストップウォッチ（ラップつき）・🔁 くり返し（がんばる／休む を 決めた回数。運動に）。
   ・全画面に 大きな数字と 光の輪。数字が かわるたびに 前の数字が はじけ飛び、背景（hade-fx.js の 6つの テーマ）も 動く。
     時間が へるほど 背景が 激しくなり（星が 流れる・炎が 高くなる・遠くの花火が ふえる）、半分・のこり5分／3分／1分／30秒で 知らせる。
     のこり10秒は 大きな数字が 1つずつ 飛び出し、心臓の音と ゆれで 盛り上げる（3・2・1 は 爆発）。
     0 で 花火・紙ふぶき・絵文字・ファンファーレ。「✓ 止める」を 押すまで 2.6秒ごとに 鳴らす（1分で 音は やめる）。
   ・動いているあいだは 5秒ごと（10秒・1分・なし も。v576）に 派手な演出を 8つ 順番に（花火の連発・衝撃波・紙ふぶきの大砲・絵文字の雨・
     光のうず・流れ星・大きな花火・光のすじ）。「ドドーン！」などの 大きな字と 数字の ジャンプつき。のこり10秒・「よーい」・区切りの3秒前は 休む。
   ・時間は 時・分・秒を 打つか「＋1分」などの ボタン。⭐ よく使う時間（名前つき。12まで）を 残せる。
   ・動いているあいだは 画面を消さない（対応している端末）。「← 戻る」で 閉じても 時間は 進み、画面の 右下に 残りの時間が 出る
     （押すと もどる）。0 になったら 開いて 知らせる。アプリを 閉じていたあいだに 0 になったときは、次に開いたときに 知らせる。
   ・🖼 数え方の 見せ方（v580。hade-look.js）：⭕ 光の輪・🔠 画面いっぱい・🎞 絵が 動く（ロケット・ろうそく・砂時計・ばくだん・風船・花）・
     🐾 動物（ねこ・うさぎ・いぬ・ペンギン・かえる・くま）。設定の 上の 見本も えらんだ 見せ方で 動く（0 の しめくくりまで）。
     🫧 ぽよん（v589。hade-poyo.js）：📢 電光掲示板の ぽよん と 同じ 動き（つぶれて 落ちて ぷるん）に しぶき・輪・ゆれ・音。🕐 時計 でも 使える（秒も ぽよん）。
   ・⏰ 時間が 来た 音（v580。hade-fx.js）：9つから えらぶ（押すと 聞ける）。「✓ 止める」・「← 戻る」で すぐ 止まる。🔀 おまかせ（v583）は 毎回 ちがう 音。
   ・🔊 演出の 音（v583）：🎆 花火（いままで）・🥁 和・🎮 ゲーム・🎹 楽器・🐤 自然・🚀 宇宙・🔔 やさしい・🔀 おまかせ（演出ごとに かわる）。
     数えている あいだの 音（花火の ドーン・パチパチ・のこり10秒・区切り・スタート など）を セットごとに かえる。
   ・⏱ 1秒ごとの 音（v583）：なし（いままで）・🕰 チクタク・📟 ピッ・🥁 トン・🎹 ドレミ（上って 下りる）・💧 ぽちゃ。のこり10秒は 数える 音が あるので 鳴らさない。
   ・⛶ 全画面（v588）：電光掲示板と 同じように 画面 ぜんぶ（ブラウザの 全画面。下の 表示も 消える）。下の ボタンは しばらくで 隠れ、
     画面を 押す か 右上の ☰ で また 出る。止めている・終わった・鳴っている ときは 出た まま。
   ・🕐 時計（v588）：いまの 時刻を ど派手に（見せ方・テーマ・演出は タイマーと 同じ）。24時間／12時間・秒を 出す／出さない。
     時報（毎時 0分に キーンコーン。30分ごと も）・⏰ 目覚まし（決めた 時刻に「時間が 来た 音」で 知らせる。✓ 止める まで）。
     「← 戻る」で 閉じても 右下に 時刻が 出て、表電卓を 開いて いれば 目覚ましが 鳴る。
   ・📋 進行表（v598）：名前と 時間の 段どり（開会の あいさつ 5分 → 乾杯 2分 → 歓談 30分 …。30まで）を 順に 数える。
     段が かわると 名前を 大きく 出して 鳴らし（声で「乾杯です」）、のこり 1分で「次は ○○」。⏭ 次へ で とばせる。見本（宴会・会議・授業・運動・発表会）。
     くり返し と 同じ しくみ（run.list）で 数える。
   ・⏲ 同時に（v598）：名前つきの タイマーを 6本まで いっしょに（パスタ 9分・ソース 5分 など）。1本ずつ ⏸ 止める・＋1分・✕。
     ⭐ よく使う時間 から 1回で 足せる。「⛶ 大きく 見る」で 画面いっぱいに 並べ、0 に なった ものは「できた！」と 光って 鳴る
     （押すと 止まる）。閉じても 動き、0 に なったら 開いて 知らせる（右下の 札は いちばん 早く 終わる もの）。
   ・えらんだもの・よく使う時間・動いているタイマーは excalc_hadetimer（この端末の中だけ）。 */
(function(){
'use strict';
const FX=window.HADE_FX, LOOK=window.HADE_LOOK||null;   // 見せ方（v580。読めなかったら 光の輪だけ）
const KEY='excalc_hadetimer', MAX_PRE=12, MAX_SEC=99*3600+59*60+59, MAX_LAP=99, PREP=3000, ALARM_MS=60000;
const MODES=[['down','⏳ タイマー'],['up','⏱ ストップウォッチ'],['iv','🔁 くり返し'],['prog','📋 進行表'],['multi','⏲ 同時に'],['clock','🕐 時計']];
const MAX_MULTI=6;   // ⏲ 同時に（v598）
// 📋 進行表（v598）：段の 名前と 秒。見本
const MAX_PROG=30;
const PROG_SAMPLES=[['🍻 宴会',[['開会の あいさつ',300],['乾杯',120],['歓談',1800],['余興',900],['しめの あいさつ',300]]],
  ['📋 会議',[['報告',600],['議題 1',900],['議題 2',900],['まとめ',300]]], ['🏫 授業',[['導入',300],['説明',900],['練習',1200],['まとめ',300]]],
  ['🏃 運動',[['準備運動',300],['ウォーキング',1200],['ストレッチ',300]]], ['🎤 発表会',[['発表 1',300],['質問',120],['発表 2',300],['質問',120],['講評',300]]]];
const STEP_COL=[{c1:'#ff3b30', c2:'#ffd23f'},{c1:'#00b4ff', c2:'#a8f0ff'},{c1:'#2bd96b', c2:'#d4ffb0'},{c1:'#c77dff', c2:'#ffd6ff'},{c1:'#ff8a3d', c2:'#fff0a8'},{c1:'#ff2bd6', c2:'#ffc4ee'}];
const cleanSteps=a=>(Array.isArray(a) ? a : []).filter(x=>x && typeof x==='object').map(x=>({n:oneLine(x.n,16)||'—', s:int(x.s,1,MAX_SEC,0)})).filter(x=>x.s).slice(0, MAX_PROG);
const JIHO=[['none','なし'],['hour','1時間ごと'],['half','30分ごと']];   // 時計の 時報（v588）
const WDAY='日月火水木金土', BAR_MS=3500;
const DEF_PRE=[{n:'カップめん',s:180},{n:'ゆでたまご',s:480},{n:'歯みがき',s:180},{n:'ひと休み',s:600}];
const QUICK=[[10,'＋10秒'],[30,'＋30秒'],[60,'＋1分'],[300,'＋5分'],[600,'＋10分']];
const EVERY=[[5,'5秒ごと'],[10,'10秒ごと'],[60,'1分ごと'],[0,'なし']];   // 間の 派手な 演出（v576）
const VOICES=[['off','なし'],['last','数える'],['all','節目も']];   // 🗣 声で 数える（v593）
const NUMF='"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Segoe UI",Roboto,sans-serif';
const TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const toastT=m=>{ if(typeof toast==='function') toast(m, 3000); };
const p2=n=>String(n).padStart(2,'0');
const rnd=(a,b)=>a+Math.random()*(b-a);
const int=(v,a,b,d)=>{ v=Math.round(+v); return isFinite(v) && v>=a && v<=b ? v : d; };
const num=(v,a,b)=>{ v=+v; return isFinite(v) && v>=a && v<=b ? v : null; };
const rid=()=>Math.random().toString(36).slice(2,9);
const reduceMotion=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_){ return false; } };
function hms(totalS){ totalS=Math.max(0, Math.floor(totalS)); const h=Math.floor(totalS/3600), m=Math.floor(totalS%3600/60), s=totalS%60; return (h ? h+':'+p2(m) : p2(m))+':'+p2(s); }
const fmtDown=ms=>hms(Math.ceil(Math.max(0, ms)/1000));
const fmtUp=ms=>{ ms=Math.max(0, ms); return hms(Math.floor(ms/1000))+'.'+p2(Math.floor(ms%1000/10)); };
const okHM=v=>{ const m=/^(\d{1,2}):(\d{2})$/.exec(String(v==null?'':v).normalize('NFKC').trim()); if(!m) return ''; const h=+m[1], mi=+m[2]; return h<24 && mi<60 ? p2(h)+':'+p2(mi) : ''; };
const ymdOf=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
const lenTxt=s=>{ s=Math.max(0, Math.round(s)); const h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return (h ? h+'時間' : '')+(m ? m+'分' : '')+(x || (!h && !m) ? x+'秒' : ''); };

/* ───────── 状態 ───────── */
let st=null, picked='', marks=new Set();
function cleanRun(r){
  if(!r || typeof r!=='object') return null;
  const BIG=8.64e15, id=oneLine(r.id,12)||rid();
  if(r.m==='down'){
    const dur=num(r.dur, 1000, (MAX_SEC+1)*1000), end=num(r.end, 0, BIG), left=num(r.left, 0, (MAX_SEC+1)*1000);
    if(dur==null || end==null || left==null) return null;
    return {m:'down', dur, end, left, p:!!r.p, done:!!r.done, name:oneLine(r.name,16), id};
  }
  if(r.m==='clock') return {m:'clock', p:false, done:false, id, al:okHM(r.al), alKey:/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(String(r.alKey==null ? '' : r.alKey)) ? String(r.alKey) : ''};   // 🕐 時計（v588。alKey：鳴らした 日と 時刻）
  if(r.m==='up' || r.m==='iv'){
    const s0=num(r.s0, 0, BIG), acc=num(r.acc, 0, BIG); if(s0==null || acc==null) return null;
    const o={m:r.m, s0, acc, p:!!r.p, done:!!r.done, id};
    if(r.m==='up') o.laps=(Array.isArray(r.laps) ? r.laps : []).map(x=>num(x,0,BIG)).filter(x=>x!=null).slice(0, MAX_LAP);
    else { o.w=int(r.w,5,3600,20); o.r=int(r.r,0,3600,10); o.n=int(r.n,1,99,8); const L=cleanSteps(r.list); if(L.length){ o.list=L; o.n=L.length; } }   // 📋 進行表（v598）：段の 一覧
    return o;
  }
  return null;
}
// ⏲ 同時に（v598）：{id, n 名前, dur, end（動いているとき 終わる 時刻）, left（止めているとき のこり）, p, done, ack（止めた）}
function cleanMulti(a){
  return (Array.isArray(a) ? a : []).filter(x=>x && typeof x==='object').map(x=>{
    const dur=num(x.dur, 1000, (MAX_SEC+1)*1000), end=num(x.end, 0, 8.64e15), left=num(x.left, 0, (MAX_SEC+1)*1000);
    return dur==null || end==null || left==null ? null : {id:/^[a-z0-9]{3,12}$/.test(String(x.id)) ? x.id : rid(), n:oneLine(x.n,16)||'タイマー', dur, end, left, p:!!x.p, done:!!x.done, ack:!!x.ack};
  }).filter(Boolean).slice(0, MAX_MULTI);
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const pre=Array.isArray(o.pre) ? o.pre.filter(p=>p && typeof p==='object').map(p=>({n:oneLine(p.n,16), s:int(p.s,1,MAX_SEC,0)})).filter(p=>p.n && p.s).slice(0, MAX_PRE) : DEF_PRE.map(p=>({n:p.n, s:p.s}));
  const iv=(o.iv && typeof o.iv==='object') ? o.iv : {};
  st={mode:MODES.some(m=>m[0]===o.mode) ? o.mode : 'down', sec:int(o.sec,1,MAX_SEC,180),
    theme:FX.hasTheme(o.theme) ? o.theme : 'hanabi', level:FX.hasLevel(o.level) ? o.level : (reduceMotion() ? 'calm' : 'ultra'),   // はじめは ド派手（v576）
    snd:o.snd!==false, vibe:o.vibe!==false, flash:o.flash!==false, every:EVERY.some(x=>x[0]===o.every) ? o.every : 5,
    look:LOOK && LOOK.has('look', o.look) ? o.look : 'ring', pic:LOOK && LOOK.has('pic', o.pic) ? o.pic : 'rocket', ani:LOOK && LOOK.has('ani', o.ani) ? o.ani : 'neko',   // 見せ方（v580）
    tone:o.tone==='rand' || (FX.TONES && FX.TONES.some(x=>x[0]===o.tone)) ? o.tone : 'fanfare',   // 時間が 来た 音（v580。🔀 おまかせ は v583）
    sset:o.sset==='rand' || (FX.hasSset && FX.hasSset(o.sset)) ? o.sset : 'hanabi', tick:FX.hasTick && FX.hasTick(o.tick) ? o.tick : 'none',   // 演出の 音・1秒ごとの 音（v583）
    voice:VOICES.some(x=>x[0]===o.voice) ? o.voice : 'last',   // 🗣 声で 数える（v593）
    pre, iv:{w:int(iv.w,5,3600,20), r:int(iv.r,0,3600,10), n:int(iv.n,1,99,8)}, run:cleanRun(o.run),
    prog:{list:o.prog && Array.isArray(o.prog.list) ? cleanSteps(o.prog.list) : PROG_SAMPLES[0][1].map(([n,s])=>({n, s}))},   // 📋 進行表（v598）
    multi:cleanMulti(o.multi),   // ⏲ 同時に（v598）
    clock:{h12:!!(o.clock && o.clock.h12===true), sec:!(o.clock && o.clock.sec===false), jiho:o.clock && JIHO.some(x=>x[0]===o.clock.jiho) ? o.clock.jiho : 'hour', al:okHM(o.clock && o.clock.al)}};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }
const vib=p=>{ if(st && st.vibe) FX.vib(p); };
// 音は この道具の 設定で（カウンターと 別々）。演出の 音は えらんだ セットで（v583。🔀 おまかせ は スタートと 演出ごとに えらびなおす）
let setNow='hanabi', toneNow='fanfare', tickN=0;
const pickOf=a=>a[Math.floor(Math.random()*a.length)];
function setPick(){ setNow=st.sset==='rand' ? pickOf(FX.SSETS || [['hanabi']])[0] : st.sset; }
const snd=(name, ...a)=>{ if(!st || !st.snd) return; if(FX.setSnd) FX.setSnd(st.sset==='rand' ? setNow : st.sset, name, ...a); else { const f=FX.snd[name]; if(f) f(...a); } };
function tonePick(){ toneNow=st.tone==='rand' ? pickOf(FX.TONES || [['fanfare']])[0] : st.tone; }
const toneSnd=first=>{ if(st && st.snd && FX.tone) FX.tone(toneNow, first); };   // 時間が 来た 音（v580）
/* ───────── 🗣 声で 数える（v593。声は 表電卓の「🔈 読み上げの声」と 同じ。音を 鳴らさない ときは 声も 出さない）─────────
   数える：タイマーは のこり10秒から「じゅう、きゅう…」と 0 で「時間です」・くり返しは 3・2・1 と スタート／休けい・
   ストップウォッチは 1分ごと・時計は 時報と 目覚ましで 時刻。節目も：タイマーの 半分・のこり5分・3分・1分・30秒、くり返しの ラウンド */
const NUMV=['','いち','に','さん','よん','ご','ろく','なな','はち','きゅう','じゅう'];
const said=[];   // 読んだ 言葉（たしかめ用）
let voicePrimed=false;
function primeVoice(){   // iPhone などは 押した ときに 1回 読ませて おかないと あとで 読めない
  if(voicePrimed || !st || st.voice==='off' || !st.snd || !('speechSynthesis' in window)) return;
  voicePrimed=true; try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); }catch(_){}
}
function sayV(text, lvl){   // lvl：'last'＝数える 以上・'all'＝節目も の ときだけ
  if(!st || !st.snd || st.voice==='off' || (lvl==='all' && st.voice!=='all')) return;
  said.push(text); if(said.length>80) said.shift();
  if(!('speechSynthesis' in window)) return;
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='ja-JP'; u.rate=1.15; if(window.HyoVoice) HyoVoice.apply(u, {lang:'ja', rate:1.15}); speechSynthesis.speak(u); }catch(_){}
}
const hushV=()=>{ try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(_){} };
// 時刻を 読む 言葉（7:30 → 7時30分・7:00 → 7時）
const hmV=hm=>{ const [h,m]=String(hm).split(':').map(Number); return h+'時'+(m ? m+'分' : ''); };
const lookKind=()=>LOOK && st.look!=='ring' ? st.look : 'ring';
const lookSub=()=>st.look==='pic' ? st.pic : st.look==='ani' ? st.ani : '';
function lk(s){ const k=lookKind(), sub=lookSub(); if(!s.lk || s.lk.k!==k || s.lk.sub!==sub) s.lk={k, sub}; return s.lk; }   // 見せ方ごとに 覚える もの

/* ───────── 時間の 計算 ───────── */
const elapsed=(r, now)=>r.p ? r.acc : r.acc+Math.max(0, now-r.s0);
function ivPhase(r, el){
  const w=r.w*1000, rs=r.r*1000;
  if(el<PREP) return {ph:'prep', round:0, left:PREP-el, len:PREP, name:r.list ? r.list[0].n : ''};
  let x=el-PREP;
  if(r.list){   // 📋 進行表（v598）：段ごとの 名前と 時間
    for(let i=0;i<r.list.length;i++){ const L=r.list[i].s*1000; if(x<L) return {ph:'work', round:i+1, left:L-x, len:L, name:r.list[i].n, next:r.list[i+1] ? r.list[i+1].n : ''}; x-=L; }
    return {ph:'done', round:r.list.length, left:0, len:1, name:''};
  }
  for(let i=1;i<=r.n;i++){
    if(x<w) return {ph:'work', round:i, left:w-x, len:w};
    x-=w;
    if(i<r.n && rs>0){ if(x<rs) return {ph:'rest', round:i, left:rs-x, len:rs}; x-=rs; }
  }
  return {ph:'done', round:r.n, left:0, len:1};
}
const ivTotal=iv=>PREP+iv.n*iv.w*1000+(iv.n-1)*iv.r*1000;
const progTotal=L=>PREP+L.reduce((a,x)=>a+x.s*1000, 0);
// 🕐 時計の ようす（v588）。frac：1分の 中の 進み（光の輪が 1分で 1回り）
function clockView(now){
  const d=new Date(now), h=d.getHours(), m=d.getMinutes(), s=d.getSeconds(), ms=s*1000+d.getMilliseconds(), c=st.clock;
  const hm=(c.h12 ? String(h%12||12) : p2(h))+':'+p2(m);
  return {mode:'clock', ms, str:hm, frac:ms/60000, sec:s, min:m, hour:h, ap:c.h12 ? (h<12 ? '午前' : '午後') : '', date:(d.getMonth()+1)+'月'+d.getDate()+'日（'+WDAY[d.getDay()]+'）'};
}
function viewOf(r, now){
  if(r && r.m==='clock') return clockView(now);
  if(!r && st.mode==='clock') return clockView(now||Date.now());
  if(!r) return st.mode==='up' ? {mode:'up', str:fmtUp(0), frac:0, sec:0, min:0, ms:0}
    : st.mode==='iv' ? {mode:'iv', str:hms(st.iv.w), frac:1, sec:st.iv.w, ms:st.iv.w*1000, ph:{ph:'prep', round:0, left:0, len:1}}
    : st.mode==='prog' ? (s0=>({mode:'iv', str:hms(s0), frac:1, sec:s0, ms:s0*1000, ph:{ph:'prep', round:0, left:0, len:1, name:st.prog.list.length ? st.prog.list[0].n : ''}}))(st.prog.list.length ? st.prog.list[0].s : 0)
    : {mode:'down', str:hms(st.sec), frac:1, sec:st.sec, ms:st.sec*1000};
  if(r.m==='down'){ const ms=r.done ? 0 : (r.p ? r.left : r.end-now); return {mode:'down', ms, str:fmtDown(ms), frac:Math.max(0, Math.min(1, ms/r.dur)), sec:Math.ceil(Math.max(0,ms)/1000)}; }
  const el=elapsed(r, now);
  if(r.m==='up') return {mode:'up', ms:el, str:fmtUp(el), frac:(el%60000)/60000, sec:Math.floor(el/1000), min:Math.floor(el/60000)};
  const ph=r.done ? {ph:'done', round:r.n, left:0, len:1} : ivPhase(r, el);
  return {mode:'iv', ms:ph.left, str:fmtDown(ph.left), frac:ph.len ? Math.max(0, Math.min(1, ph.left/ph.len)) : 0, sec:Math.ceil(ph.left/1000), ph};
}
function isOver(r, now){ if(!r || r.p || r.done) return false; if(r.m==='down') return r.end<=now; if(r.m==='iv') return ivPhase(r, elapsed(r, now)).ph==='done'; return false; }

/* ───────── 大きな数字と 光の輪（見本と 全画面で 使う）───────── */
function Scene(cv){ this.e=new FX.Engine(cv); this.prev=''; this.pop=[]; this.fly=[]; this.big=null; }
const SC=Scene.prototype;
// 数字：1字ずつ 置いて、かわった字は 前の字が はじけ飛び、新しい字が ぽんっと 出る
SC.digits=function(str, cx, cy, fs, o){
  o=o||{}; const e=this.e, g=e.g, ink=e.ink(), t=e.t;
  g.font='bold '+Math.round(fs)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle';
  const dw=g.measureText('0').width*1.02, ws=Array.from(str).map(ch=>/[0-9]/.test(ch) ? dw : dw*0.46);
  const total=ws.reduce((a,b)=>a+b,0), chars=Array.from(str), same=this.prev.length===str.length, dot=str.indexOf('.');
  let x=cx-total/2;
  const fill=g.createLinearGradient(0, -fs*0.5, 0, fs*0.5); fill.addColorStop(0, ink[0]); fill.addColorStop(1, o.col||ink[1]);   // 字の 中で 上から下へ
  const jt=this.jumpT!=null ? t-this.jumpT : 9;
  for(let i=0;i<chars.length;i++){
    const ch=chars[i], w=ws[i], mx=x+w/2; x+=w;
    if(!same) this.pop[i]=null;
    else if(this.prev[i]!==ch && (dot<0 || i<dot) && !o.still){
      this.pop[i]=t;
      if(/[0-9]/.test(this.prev[i])) this.fly.push({ch:this.prev[i], x:mx, y:cy, fs, t0:t, vx:rnd(-1,1)*fs*1.2, rot:rnd(-1.2,1.2)});
      if(o.sparks) e.burst(mx, cy, {n:o.sparks, sp:260, ring:false, life:0.7});
    }
    const k=this.pop[i]!=null ? Math.max(0, 1-(t-this.pop[i])/0.4) : 0, s=1+0.38*Math.sin(k*Math.PI)*k;
    const ph=(jt-i*0.06)/0.5, jy=ph>0 && ph<1 ? -Math.sin(ph*Math.PI)*fs*0.24 : 0, jr=ph>0 && ph<1 ? Math.sin(ph*Math.PI*2)*0.14 : 0;   // 跳ねる（左から 順に）
    g.save(); g.translate(mx, cy+jy); if(jr) g.rotate(jr); g.scale(s, s);
    const bo=e.boost();
    if(e.level!=='calm'){ g.shadowColor=bo>=2 ? 'hsl('+((t*160+i*45)%360).toFixed(0)+',100%,60%)' : (o.glow||ink[2]); g.shadowBlur=fs*(bo ? 0.26 : 0.16); }
    g.lineJoin='round'; g.lineWidth=fs*0.07; g.strokeStyle='rgba(0,0,0,.55)'; g.strokeText(ch, 0, 0);
    let f2=fill;
    if(bo>=2 && !o.col){ const h=(t*160+i*45)%360; f2=g.createLinearGradient(0, -fs*0.5, 0, fs*0.5); f2.addColorStop(0, '#ffffff'); f2.addColorStop(0.5, 'hsl('+h.toFixed(0)+',100%,70%)'); f2.addColorStop(1, 'hsl('+((h+60)%360).toFixed(0)+',100%,55%)'); }
    g.fillStyle=f2; g.fillText(ch, 0, 0); g.restore();
  }
  this.prev=str;
  // はじけ飛ぶ 前の数字
  this.fly=this.fly.filter(f=>t-f.t0<0.5);
  for(const f of this.fly){
    const a=(t-f.t0)/0.5;
    g.save(); g.globalAlpha=1-a; g.translate(f.x+f.vx*a, f.y-f.fs*1.1*a); g.rotate(f.rot*a); g.scale(1+a*0.9, 1+a*0.9);
    g.font='bold '+Math.round(f.fs)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=ink[2]; g.fillText(f.ch, 0, 0); g.restore();
  }
};
// 光の輪：frac は 残り（または 進み）の 割合。先っぽから 火花
SC.ring=function(frac, cx, cy, R, o){
  o=o||{}; const e=this.e, g=e.g, d=e.d, ink=e.ink(), lw=Math.max(6*d, R*0.065), a0=-Math.PI/2;
  g.save();
  g.lineCap='round';
  g.strokeStyle='rgba(255,255,255,.10)'; g.lineWidth=lw; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.fillStyle='rgba(255,255,255,.35)';
  for(let i=0;i<60;i++){ const an=a0+TAU*i/60, big=i%5===0, r1=R+lw*0.9, r2=R+lw*(big?1.9:1.4); g.globalAlpha=big?0.6:0.28; g.lineWidth=(big?2.6:1.4)*d; g.strokeStyle='#ffffff'; g.beginPath(); g.moveTo(cx+Math.cos(an)*r1, cy+Math.sin(an)*r1); g.lineTo(cx+Math.cos(an)*r2, cy+Math.sin(an)*r2); g.stroke(); }
  g.globalAlpha=1;
  frac=Math.max(0, Math.min(1, frac));
  if(frac>0.001){
    const c1=o.c1||ink[2], c2=o.c2||ink[1];
    let st2=c1;
    if(g.createConicGradient){ const cg=g.createConicGradient(a0, cx, cy); cg.addColorStop(0, c2); cg.addColorStop(0.5, c1); cg.addColorStop(1, c2); st2=cg; }
    g.strokeStyle=st2; g.lineWidth=lw; if(e.level!=='calm'){ g.shadowColor=c1; g.shadowBlur=lw*1.6; }
    g.beginPath(); g.arc(cx, cy, R, a0, a0+TAU*frac); g.stroke();
    const an=a0+TAU*frac, hx=cx+Math.cos(an)*R, hy=cy+Math.sin(an)*R;
    g.shadowBlur=0; g.globalCompositeOperation='lighter';
    const gr=g.createRadialGradient(hx, hy, 0, hx, hy, lw*2.2); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle=gr; g.beginPath(); g.arc(hx, hy, lw*2.2, 0, TAU); g.fill();
    if(o.emit && Math.random()<o.emit){ const tx=-Math.sin(an), ty=Math.cos(an), dir=o.back ? -1 : 1, v=rnd(60,180)*d; e.spark(hx, hy, tx*v*dir+rnd(-40,40)*d, ty*v*dir+rnd(-40,40)*d, Math.random()<0.5 ? c1 : '#ffffff', {life:rnd(0.35,0.8), gr:60, sz:rnd(1.2,2.4)}); }
    this.head=[hx, hy];
  } else this.head=[cx, cy-R];
  g.restore();
};
// のこり10秒：大きな数字が 飛び出す
SC.bigNum=function(n, ph, cx, cy, R){
  const e=this.e, g=e.g, fs=R*1.25, s=1+0.55*Math.pow(1-ph, 3), a=Math.min(1, 0.35+ph*1.6);
  g.save(); g.translate(cx, cy); g.scale(s, s); g.globalAlpha=Math.min(1, a);
  g.font='900 '+Math.round(fs)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle';
  const fill=g.createLinearGradient(0, -fs*0.5, 0, fs*0.5); fill.addColorStop(0, '#fff6c8'); fill.addColorStop(0.5, '#ffb000'); fill.addColorStop(1, '#ff2d2d');
  if(e.level!=='calm'){ g.shadowColor='#ff3b30'; g.shadowBlur=fs*0.2; }
  g.lineJoin='round'; g.lineWidth=fs*0.06; g.strokeStyle='rgba(60,0,0,.8)'; g.strokeText(String(n), 0, fs*0.04);
  g.fillStyle=fill; g.fillText(String(n), 0, fs*0.04); g.restore();
};
// 🕐 時計の 光の輪（v591）：時・分は ほかの 見せ方と 同じ 並べ方で 大きく（縦は 時・分を 縦に 積む・横は 時:分 の 1行）、
// 秒は 光の輪の 中に（秒なしでも 輪は 出す。輪は 1分で 1回り）。o：見本（S.prev）・火花の 出る 割合。行ごとの 数字は 跳ねる のも 上の 行から 順に
function paintRingClock(o2, v, top, bot, prev, emit){
  if(!LOOK || !LOOK.clockPlan) return false;
  const e=o2.e, g=e.g, W=e.W, H=e.H, sub=v.ap||'', met=LOOK.numMet(g, 'bold', 0.46);
  const S={W, H, d:e.d, prev, bstr:v.str, str:v.str, sec:v.sec, csec:!!st.clock.sec}, box={x:W*0.03, y:top, w:W*0.94, h:Math.max(10, bot-top)};
  const fit=(rows, dir, b)=>LOOK.fitRows(rows, met, b, dir, sub), plan=LOOK.clockPlan(S, o2, box, sub, fit, {ring:true, kS:[0.42, 0.56], kV:[0.36, 0.5], kH:0.42});
  if(!plan) return false;
  const lay=LOOK.placeRows(plan.rows, met, box, plan.dir, sub, fit(plan.rows, plan.dir, box));
  if(o2.rkey!==plan.kind+plan.rows.length){ o2.rkey=plan.kind+plan.rows.length; o2.rst=[]; }
  let n=0;
  lay.rows.forEach((R,i)=>{
    const rs=o2.rst[i]||(o2.rst[i]={e, prev:'', pop:[], fly:[]});
    rs.jumpT=o2.jumpT==null ? null : o2.jumpT+n*0.06;
    if(R.ring) o2.ring(v.frac, R.cx, R.cy, R.R, {emit, back:true});
    if(R.str) SC.digits.call(rs, R.str, R.cx, R.cy-met.mid*R.fs/100, R.fs, {sparks:prev ? 3 : e.level==='calm' ? 0 : 8});
    n+=Array.from(R.str).length;
  });
  if(sub){ const fs=Math.max(11*e.d, Math.min(34*e.d, lay.F*0.16)); g.save(); g.font='bold '+Math.round(fs)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; g.lineWidth=fs*0.14; g.strokeStyle='rgba(0,0,0,.55)'; g.strokeText(sub, W/2, lay.subY); g.fillStyle=e.ink()[1]; g.fillText(sub, W/2, lay.subY); g.restore(); }
  o2.crow={kind:plan.kind, str:lay.rows.map(R=>R.ring && !R.str ? '◯' : R.str).join('|'), fs:Math.round(lay.F), ring:Math.round((lay.rows.find(R=>R.ring)||{R:0}).R)};
  return true;
}
// 赤い ふち（のこり10秒の どきどき）
function vignette(g, W, H, a, col){
  if(a<=0.01) return;
  const gr=g.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col||('rgba(255,20,20,'+a.toFixed(3)+')'));
  g.save(); g.fillStyle=gr; g.fillRect(0, 0, W, H); g.restore();
}

// 見せ方に わたす ようす（v580）。p：進み（タイマーは 0→1。ストップウォッチは 1分で 1回り）
function lookS(v, r, e, bot){
  const mode=v.mode, done=!!(r && r.done), paused=!!(r && r.p);
  const p=mode==='up' || mode==='clock' ? v.frac : 1-v.frac, sec=v.sec;
  const last10=!!(r && mode==='down' && !done && !paused && sec<=10);
  let bstr, bsub='';
  if(mode==='down') bstr=done ? '0' : sec<=60 ? String(sec) : v.str.replace(/^0(\d:)/, '$1');
  else if(mode==='iv'){ bstr=sec<=99 ? String(sec) : v.str.replace(/^0(\d:)/, '$1'); bsub=r && r.list ? (v.ph.ph==='prep' ? 'よーい' : v.ph.name||'') : v.ph.ph==='work' ? 'がんばれ！' : v.ph.ph==='rest' ? '休けい' : v.ph.ph==='prep' ? 'よーい' : ''; }
  else if(mode==='clock'){ bstr=v.str; bsub=[v.ap, st.clock.sec ? p2(v.sec)+'秒' : ''].filter(Boolean).join(' '); }   // 🕐 時計（v588）
  else { bstr=hms(Math.floor(v.ms/1000)).replace(/^0(\d:)/, '$1'); bsub='.'+p2(Math.floor(v.ms%1000/10)); }
  if(done && sc && sc.e===e && sc.doneAt==null) sc.doneAt=e.t;
  return {t:e.t, W:e.W, H:e.H, d:e.d, prev:false, mode, p:Math.max(0, Math.min(1, p)), lvl:v.frac, str:v.str, bstr, bsub,
    sstr:mode==='up' ? hms(Math.floor(v.ms/1000)) : v.str, sec, ph:v.ph ? v.ph.ph : '', last10, paused, done,
    doneT:done && sc && sc.doneAt!=null ? e.t-sc.doneAt : 0, tickT:sc && sc.e===e ? sc.tickT : null, bot, ink:e.ink(), level:e.level,
    ap:v.ap||'', csec:mode==='clock' && !!st.clock.sec, snd:sc && sc.e===e ? snd : null};   // 🫧 ぽよん で 使う（v589）
}

/* ───────── 全画面（ステージ）───────── */
let sc=null, stageRel=null, wl=null, raf=0, lastTs=0, frozen=false, prevSec=null, prevMin=null, prevPh=null, prevTenth=null;
let alarmOn=false, alarmUntil=0, nextAlarm=0, banT=0, ticker=0, pv=null, cur=null, overNote='', prevShow=null, shows={n:0, last:-1, multi:0};
let barT2=0, fsOn=false, botH=70, prevClk=null;   // 下の ボタンを 隠す・ブラウザの 全画面・絵の 下の あき・時計の 分（v588）
const stageOpen=()=>!!$('htFull');
function openStage(){
  if(stageOpen()){ paintBar(); return; }
  if(!st.run) return;
  FX.unlock();
  const el=document.createElement('div'); el.className='ht-full'; el.id='htFull'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','ど派手タイマー');
  el.innerHTML=`<canvas id="htCv"></canvas><div class="ht-top"><span id="htLab"></span><span id="htSub"></span></div>
    <div class="ht-ban" id="htBan" aria-live="polite"></div><div class="ht-laps" id="htLaps"></div>
    <button type="button" class="ht-stop" id="htStop" hidden onclick="HADE_TIMER.stopAlarm()">✓ 止める</button>
    <div class="ht-bar" id="htBar"></div><button type="button" class="ht-more" id="htMore" aria-label="ボタンを 出す" onclick="HADE_TIMER.bar()">☰</button>`;
  document.body.appendChild(el);
  $('htBar').addEventListener('pointerdown', ()=>barShow());   // ボタンを さわって いる あいだは 隠さない
  enterFs();
  sc=new Scene($('htCv')); sc.e.setTheme(st.theme); sc.e.setLevel(st.level); sc.e.noFlash=!st.flash;
  sc.e.onCrackle=()=>snd('crackle');
  sc.e.onBoom=()=>{ if(Math.random()<0.6) snd('boom'); };
  $('htCv').addEventListener('pointerdown', stageTap);
  stageRel=typeof modalBack==='function' ? modalBack(()=>closeStage(true)) : null;
  window.addEventListener('keydown', stageKey, true);
  window.addEventListener('resize', onResize);
  prevSec=prevMin=prevPh=prevTenth=prevShow=prevClk=null; botH=70;
  wake(); paintBar(); paintLaps(); hideChip(); loop();
}
function closeStage(byBack){
  const el=$('htFull'); if(!el) return;
  el.remove(); sc=null; clearTimeout(barT2); exitFs();
  window.removeEventListener('keydown', stageKey, true); window.removeEventListener('resize', onResize);
  if(!byBack && stageRel) stageRel(); stageRel=null;
  unwake(); alarmOn=false; if(FX.toneStop) FX.toneStop();
  if(st.run && st.run.done){ st.run=null; save(); }   // 終わった タイマーは 閉じたら おしまい
  if(st.run) startTicker(); else { stopTicker(); hideChip(); }
  if($('hadeTimerOverlay') && isDlgOpen('hadeTimerOverlay')){ render(); loop(); }
  else paintChip();
}
function onResize(){ if(sc) sc.e.resize(); if(pv) pv.e.resize(); }
// ブラウザの 全画面（電光掲示板と 同じ。下の 表示も 消える）。できない 端末は そのまま（v588）
async function enterFs(){ try{ const de=document.documentElement; if(de.requestFullscreen && !document.fullscreenElement){ await de.requestFullscreen({navigationUI:'hide'}); fsOn=true; } }catch(_){ fsOn=false; } }
function exitFs(){ if(!fsOn) return; fsOn=false; try{ if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{}); }catch(_){} }
// 下の ボタン：しばらく さわらないと 隠す（止めている・終わった・鳴っている ときは 出した まま）
function barShow(){ const f=$('htFull'); if(!f) return; f.classList.remove('bar-hide'); clearTimeout(barT2); barT2=setTimeout(barAuto, BAR_MS); }
function barAuto(){ const f=$('htFull'), r=st && st.run; if(!f) return; if(!r || r.p || r.done || alarmOn){ barT2=setTimeout(barAuto, BAR_MS); return; } f.classList.add('bar-hide'); }
const barHidden=()=>{ const f=$('htFull'); return !!(f && f.classList.contains('bar-hide')); };
function stageKey(e){
  if(!stageOpen()) return;
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); if(alarmOn) stopAlarm(); else closeStage(); }
  else if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); if(alarmOn) stopAlarm(); else togglePause(); }
  else if((e.key==='l' || e.key==='L') && st.run && st.run.m==='up'){ e.preventDefault(); e.stopPropagation(); lap(); }
}
function stageTap(ev){
  barShow();
  if(alarmOn){ stopAlarm(); return; }
  if(!sc) return;
  const r=$('htCv').getBoundingClientRect(), d=sc.e.d, x=(ev.clientX-r.left)*d, y=(ev.clientY-r.top)*d;
  sc.e.burst(x, y, {n:26, sp:300}); snd('pop', Math.floor(Math.random()*8));
}
async function wake(){ try{ if(navigator.wakeLock && navigator.wakeLock.request) wl=await navigator.wakeLock.request('screen'); }catch(_){ wl=null; } }
function unwake(){ if(wl){ try{ wl.release(); }catch(_){} wl=null; } }
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible'){ if(stageOpen()) wake(); if(st && st.run) tick(); loop(); } });

function paintBar(){
  const b=$('htBar'); if(!b) return;
  const r=st.run; if(!r){ b.innerHTML=''; return; }
  const B=(fn, txt, cls)=>`<button type="button" class="${cls||''}" onclick="HADE_TIMER.${fn}">${txt}</button>`;
  const pp=r.p ? B('resume()','▶ 再開','pri') : B('pause()','⏸ 一時停止');
  let mid='';
  if(r.m==='down') mid=B('plus(60)','＋1分');
  else if(r.m==='up') mid=B('lap()','🏁 ラップ');
  else mid=B('next()','⏭ 次へ');
  if(r.m==='clock'){ b.innerHTML=B('showNow()','🎆 いま 派手に')+B('stop()','■ やめる')+B('back()','← 戻る'); barShow(); return; }   // 🕐 時計（v588）
  b.innerHTML=r.done ? B('restart()','↺ もう一度','pri')+(r.m==='down' ? B('plus(60)','＋1分') : '')+B('back()','← 戻る')
    : pp+mid+B('restart()','↺ 最初から')+B('stop()','■ やめる')+B('back()','← 戻る');
  const f=$('htFull'); if(f) f.style.setProperty('--ht-bar', (b.offsetHeight+10)+'px');   // ボタンが 2段に なっても 上に 出す
  barShow();
}
function paintLaps(){
  const b=$('htLaps'); if(!b) return;
  const r=st.run; if(!r || r.m!=='up' || !r.laps.length){ b.innerHTML=''; return; }
  const ls=r.laps.map((x,i)=>x-(i ? r.laps[i-1] : 0)), best=Math.min(...ls), worst=Math.max(...ls);
  b.innerHTML=ls.map((v,i)=>({v,i})).slice(-5).reverse().map(({v,i})=>`<div class="${ls.length>1 && v===best?'best':ls.length>1 && v===worst?'worst':''}"><b>LAP ${i+1}</b><span>${fmtUp(v)}</span><small>${fmtUp(r.laps[i])}</small></div>`).join('');
}
// バナーの 字の大きさ：1行に 入る 大きさに（全角は 1、半角は 0.62 字ぶん）
function fitBan(b, text, kind){
  const W=(b.parentElement ? b.parentElement.clientWidth : window.innerWidth)*0.92, u=Array.from(text).reduce((a,ch)=>a+(/[ -~]/.test(ch) ? 0.62 : 1), 0)||1;
  const max=kind==='big' ? 150 : kind==='s' ? 64 : 90; b.style.fontSize=Math.max(18, Math.min(max, W/u))+'px';
}
function banner(text, kind){
  const b=$('htBan'); if(!b) return;
  b.className='ht-ban '+(kind||''); fitBan(b, text, kind);
  const m=/^(\p{Extended_Pictographic}\uFE0F?)\s*/u.exec(text);   // 先の 絵文字は 虹色の 字に すると 丸く ぬりつぶされるので、そのままの 色で（v591）
  if(m){ b.textContent=''; const em=document.createElement('span'); em.className='ht-emo'; em.textContent=m[1]+' '; b.append(em, text.slice(m[0].length)); } else b.textContent=text;
  void b.offsetWidth; b.classList.add('go');
  clearTimeout(banT); banT=setTimeout(()=>{ const x=$('htBan'); if(x) x.classList.remove('go'); }, kind==='big' ? 4200 : 1900);
}

/* ───────── 操作 ───────── */
function start(){
  if(st.mode==='multi'){ FX.unlock(); primeVoice(); if(!st.multi.length){ toastT('タイマーを 足してください'); return; } mOpen(); return; }   // ⏲ 同時に（v598）は 並べて 見る
  FX.unlock(); stopAlarm(true); primeVoice();
  const now=Date.now();
  if(st.mode==='down'){
    if(!(st.sec>0)){ toastT('時間を 決めてください'); return; }
    st.run={m:'down', dur:st.sec*1000, end:now+st.sec*1000, left:0, p:false, done:false, name:picked, id:rid()};
  } else if(st.mode==='up') st.run={m:'up', s0:now, acc:0, p:false, done:false, laps:[], id:rid()};
  else if(st.mode==='clock'){ const d=new Date(now), hm=p2(d.getHours())+':'+p2(d.getMinutes()); st.run={m:'clock', p:false, done:false, id:rid(), al:st.clock.al, alKey:st.clock.al===hm ? ymdOf(d)+' '+hm : ''}; }   // 🕐 時計（v588。いまの 分は もう 鳴らさない）
  else if(st.mode==='prog'){   // 📋 進行表（v598）
    if(!st.prog.list.length){ toastT('段を 足してください'); return; }
    st.run={m:'iv', list:st.prog.list.map(x=>({n:x.n, s:x.s})), n:st.prog.list.length, w:5, r:0, s0:now, acc:0, p:false, done:false, id:rid()};
  }
  else st.run={m:'iv', w:st.iv.w, r:st.iv.r, n:st.iv.n, s0:now, acc:0, p:false, done:false, id:rid()};
  marks=new Set(); overNote=''; tickN=0; setPick(); save();
  openStage();
  if(sc){ const e=sc.e; e.after(0.05, ()=>{ e.burst(e.W/2, e.H*0.46, {n:70, sp:520}); e.kick(0.5); }); }
  const ivl=st.mode==='iv' || st.mode==='prog';
  banner(ivl ? 'よーい！' : st.mode==='clock' ? '🕐 時計' : 'スタート！', 'go1'); snd(ivl ? 'drum' : 'whoosh', 18); vib(60);
  if(ivl) sayV(NUMV[3], 'last'); else if(st.mode==='down' && st.sec<=10) sayV(NUMV[st.sec], 'last');   // 🗣 はじめの 秒も 読む（v593）
}
function pause(){
  const r=st.run; if(!r || r.p || r.done || r.m==='clock') return;
  const now=Date.now(); if(r.m==='down') r.left=Math.max(0, r.end-now); else r.acc+=Math.max(0, now-r.s0);
  r.p=true; save(); paintBar(); banner('一時停止', 's'); snd('down');
}
function resume(){
  const r=st.run; if(!r || !r.p || r.done || r.m==='clock') return;
  const now=Date.now(); if(r.m==='down') r.end=now+r.left; else r.s0=now;
  r.p=false; save(); paintBar(); banner('再開！', 's'); snd('whoosh');
}
function togglePause(){ const r=st.run; if(!r || r.done || r.m==='clock') return; if(r.p) resume(); else pause(); }
function plus(sec){
  const r=st.run; sec=int(sec,1,3600,60);
  if(!r || r.m!=='down') return;
  const now=Date.now(), add=sec*1000;
  if(r.done){ r.done=false; r.p=false; r.dur=add; r.end=now+add; stopAlarm(true); marks=new Set(); }
  else if(r.p){ r.left=Math.min((MAX_SEC+1)*1000, r.left+add); r.dur=Math.max(r.dur, r.left); }
  else { r.end=Math.min(now+(MAX_SEC+1)*1000, r.end+add); r.dur=Math.max(r.dur, r.end-now); }
  save(); paintBar(); banner('＋'+lenTxt(sec), 's'); snd('coin');
  if(sc) sc.e.burst(sc.head ? sc.head[0] : sc.e.W/2, sc.head ? sc.head[1] : sc.e.H/2, {n:40, sp:380});
}
function restart(){
  const r=st.run; if(!r || r.m==='clock') return;
  const now=Date.now(); stopAlarm(true); marks=new Set(); overNote=''; if(sc){ sc.big=null; sc.lk=null; sc.doneAt=null; }
  if(r.m==='down'){ r.end=now+r.dur; r.left=0; }
  else { r.s0=now; r.acc=0; if(r.m==='up') r.laps=[]; }
  r.p=false; r.done=false; save(); prevSec=prevMin=prevPh=prevShow=null; paintBar(); paintLaps();
  banner('もう一度！', 'go1'); snd('whoosh'); if(sc) sc.e.burst(sc.e.W/2, sc.e.H*0.46, {n:60, sp:480});
}
function stop(){ stopAlarm(true); hushV(); st.run=null; save(); stopTicker(); hideChip(); closeStage(); }
function back(){ closeStage(); }
function lap(){
  const r=st.run; if(!r || r.m!=='up' || r.p || r.done) return;
  if(r.laps.length>=MAX_LAP){ toastT('ラップは '+MAX_LAP+' まで です'); return; }
  const el=elapsed(r, Date.now()); r.laps.push(el); save(); paintLaps();
  const n=r.laps.length, lt=el-(n>1 ? r.laps[n-2] : 0);
  banner('LAP '+n+'  '+fmtUp(lt), 's'); snd('coin'); vib(30);
  if(sc){ const [x,y]=sc.head||[sc.e.W/2, sc.e.H/2]; sc.e.burst(x, y, {n:50, sp:420}); sc.e.text(x, y-30*sc.e.d, 'LAP '+n, {sz:30, col:'#ffffff'}); }
}
function next(){
  const r=st.run; if(!r || r.m!=='iv' || r.done) return;
  const now=Date.now(), el=elapsed(r, now), ph=ivPhase(r, el);
  r.acc=el+ph.left+1; if(!r.p) r.s0=now; save();
}
function stopAlarm(quiet){
  const was=alarmOn; alarmOn=false; const b=$('htStop'); if(b) b.hidden=true;
  if(FX.toneStop) FX.toneStop();   // 試しに 聞いた 音も 止める
  if(was && !quiet){ banner('おつかれさま！', 's'); snd('chime'); paintBar(); }
}
function finish(){
  const r=st.run; if(!r || r.done) return;
  const now=Date.now();
  const late=r.m==='down' && !r.p ? now-r.end : 0;
  r.done=true; r.p=false; save();
  overNote=late>15000 ? lenTxt(late/1000)+' 前に 終わりました' : '';
  if(!($('hadeTimerOverlay') && isDlgOpen('hadeTimerOverlay'))) openHadeTimer(true);
  openStage();
  tonePick(); alarmOn=true; alarmUntil=now+ALARM_MS; nextAlarm=now+(toneNow==='fanfare' ? 3200 : FX.tonePer(toneNow)*1000);
  const b=$('htStop'); if(b) b.hidden=false;
  paintBar();
  banner(r.m==='iv' ? 'おつかれさま！' : 'TIME UP!', 'big');
  sayV(r.m==='iv' ? 'おつかれさまでした' : '時間です', 'last');   // 🗣（v593）
  if(sc){ const e=sc.e; e.finale({shells:14, conf:200, emo:['🎉','✨','🎊','⭐','🥳'], flash:'#fff3c4'}); e.burst(e.W/2, e.H*0.46, {n:120, sp:700});
    sc.doneAt=e.t; if(lookKind()!=='ring') LOOK.finish(e, lookKind(), lookSub(), lk(sc), snd); }   // 絵ごとの しめくくり（v580）
  toneSnd(true); vib([300,120,300,120,600]);
}
function alarmStep(now){
  if(!alarmOn) return;
  if(now>alarmUntil){ alarmOn=false; return; }
  if(now>=nextAlarm){
    nextAlarm=now+FX.tonePer(toneNow)*1000; toneSnd(false); vib([200,100,200]);
    if(sc){ const e=sc.e; e.shell(null, {sc:1.1}); e.shell(null, {sc:1}); e.flash('#ffffff', 0.3); e.kick(0.4); }
  }
}

/* ───────── 1こま ごとの 動き ───────── */
function onSecond(v){
  const e=sc.e, s=v.sec, r=st.run, bo=e.boost(); e.pulse=1; sc.tickT=e.t;
  if(bo>=1 && sc.head && !(r.m==='down' && s<=10)){ e.burst(sc.head[0], sc.head[1], {n:16, sp:340, rs:0.8}); }
  if(bo>=2 && !(r.m==='down' && s<=10)){ e.shell(null, {sc:rnd(0.7,1)}); e.kick(0.18); if(st.tick==='none') snd('tick'); }
  if(st.tick!=='none' && FX.tickSnd && !(r.m==='down' && s<=10) && !(r.m==='iv' && s<=3 && v.ph.ph!=='done')){ tickN++; if(st.snd) FX.tickSnd(st.tick, tickN-1); }   // ⏱ 1秒ごとの 音（v583。のこり10秒・区切りの 3秒前は 数える 音が あるので 休む）
  if(r.m==='down'){
    if(s<=10 && s>=1){
      sc.big={n:s, t0:e.t}; sayV(NUMV[s], 'last');   // 🗣 じゅう、きゅう…（v593）
      if(s<=3){ snd('boom'); snd('beep', 1320, 0.16); e.kick(0.9); e.flash('#ff3030', 0.32); vib(140); e.burst(e.W/2, e.H*0.46, {n:90, sp:620, pal:['#ff3b30','#ffb000','#ffffff']}); }
      else { snd('heart'); snd('beep', 660+(10-s)*45, 0.09); e.kick(0.3+(10-s)*0.04); vib(40); e.burst(e.W/2, e.H*0.46, {n:30, sp:380, pal:['#ff6a3d','#ffd23f']}); }
    }
    const dur=r.dur, ms=v.ms;
    if(dur>=20000 && !marks.has('half') && ms<=dur/2){ marks.add('half'); banner('半分 すぎた！'); snd('whoosh'); e.confetti(50); sayV('半分 すぎました', 'all'); }
    for(const m of [5,3,1]){ if(dur>(m*60+30)*1000 && s===m*60 && !marks.has('m'+m)){ marks.add('m'+m); banner('のこり '+m+'分！'); snd('taiko'); e.shell(null); e.shell(null); vib([80,60,80]); sayV('のこり '+m+'分です', 'all'); } }
    if(dur>60000 && s===30 && !marks.has('s30')){ marks.add('s30'); banner('のこり 30秒！'); snd('taiko'); e.kick(0.5); sayV('のこり 30秒です', 'all'); }
  } else if(r.m==='iv'){
    if(r.list && v.ph.ph==='work' && v.ph.len>=180000 && s===60 && !marks.has('n'+v.ph.round)){ marks.add('n'+v.ph.round); banner('のこり 1分'+(v.ph.next ? '  次は '+v.ph.next : '')); snd('taiko'); e.shell(null); vib([80,60,80]); sayV('のこり 1分です'+(v.ph.next ? '。次は '+v.ph.next : ''), 'all'); }   // 📋 進行表（v598）
    if(s<=3 && s>=1 && v.ph.ph!=='done'){ snd('beep', v.ph.ph==='work' ? 1046 : 784, 0.1); e.kick(0.25); vib(30); sayV(NUMV[s], 'last'); }
  }
}
function onPhase(ph){
  const e=sc.e, r=st.run;
  if(ph.ph==='prep') return;
  if(r.list){   // 📋 進行表（v598）：段の 名前を 大きく
    if(ph.ph!=='work') return;
    const c=STEP_COL[(ph.round-1)%STEP_COL.length];
    sayV(ph.name+'です', 'last'); banner(ph.name, 'go1'); snd(ph.round===1 ? 'whistle' : 'chime'); vib([60,40,60]);
    e.burst(e.W/2, e.H*0.46, {n:90, sp:620, pal:[c.c1, c.c2, '#ffffff']}); e.shell(null); if(ph.round>1) e.confetti(50, {pal:[c.c1, c.c2, '#ffffff']});
    return;
  }
  if(ph.ph==='work'){ sayV(st.voice==='all' && r.n>1 ? 'ラウンド '+ph.round+'、スタート' : 'スタート', 'last'); banner('ROUND '+ph.round+'/'+r.n+'  がんばれ！', 'go1'); snd('whistle'); e.burst(e.W/2, e.H*0.46, {n:80, sp:600, pal:['#ff3b30','#ffb000','#ffffff']}); e.kick(0.7); e.flash('#ff6a3d', 0.28); vib([90,60,90]); }
  else if(ph.ph==='rest'){ sayV('休けい', 'last'); banner('休けい  あと '+(r.n-ph.round)+'回', 's'); snd('chime'); e.confetti(40, {pal:['#7cf0ff','#a8ffcf','#ffffff']}); vib(60); }
}
// 5秒ごとの 派手な 演出（8つを 順番に）。大きな 文字（ドドーン！ など）と 数字の ジャンプも
const WORDS=['ドドーン！','バーン！','パーン！','キラッ！','ギュイーン！','シュッ！','ドーン！','ピカーッ！'];
const EMO_T={hanabi:['🎆','✨','🎇'], uchu:['🚀','🌟','🪐','✨'], neon:['💜','🌈','⚡','✨'], matsuri:['🏮','🌸','🎐','🍡'], honoo:['🔥','💥','⚡'], yume:['🫧','💖','🦄','⭐']};
const SHOWS=[
  (e,c)=>{ for(let i=0;i<5;i++) e.after(i*0.16, ()=>e.shell(e.W*(0.12+0.76*i/4), {sc:1.05})); snd('boom'); e.kick(0.5); },   // 花火の 連発
  (e,c)=>{ const p=e.pal(); for(let i=0;i<3;i++) e.after(i*0.13, ()=>{ e.ring(c[0], c[1], p[i%p.length], 2.4); e.burst(c[0], c[1], {n:50, sp:720, ring:false}); }); e.flash(p[0], 0.3); e.kick(0.9); snd('boom'); },   // 衝撃波
  (e,c)=>{ e.confetti(80, {x:e.W*0.04, y:e.H*0.96}); e.confetti(80, {x:e.W*0.96, y:e.H*0.96}); snd('whoosh'); snd('crackle'); },   // 紙ふぶきの 大砲
  (e,c)=>{ e.rain(EMO_T[e.theme]||['✨'], 18); snd('level'); },   // 絵文字の 雨
  (e,c)=>{ e.spiral(c[0], c[1], c[2]*1.15, {n:60}); e.beams(c[0], c[1], {n:14, col:e.ink()[2], life:1.1}); snd('whoosh'); },   // 光の うず
  (e,c)=>{ for(let i=0;i<6;i++) e.after(i*0.1, ()=>e.meteor()); snd('whistle'); },   // 流れ星
  (e,c)=>{ e.explode(c[0], c[1]-c[2]*0.2, e.pal()[1], ['heart','star','ring'][Math.floor(Math.random()*3)], 1.7); e.glow(c[0], c[1], 260, e.ink()[2], 0.6); snd('boom'); e.kick(0.6); },   // まん中に 大きな 花火
  (e,c)=>{ e.beams(c[0], c[1], {n:18, col:'#ffffff', vr:-2.2, life:1.2}); e.burst(c[0], c[1], {n:90, sp:820}); e.flash('#ffffff', 0.25); snd('coin'); },   // 光の すじ
];
function showTime(k){
  if(!sc) return;
  const e=sc.e, W=e.W, H=e.H, c=[W/2, H*0.47, Math.min(W*0.44, H*0.36)], i=(k-1)%SHOWS.length, w=WORDS[i];
  const bo=e.boost(), list=bo>=2 ? [i, (i+3)%SHOWS.length, (i+5)%SHOWS.length] : bo>=1 ? [i, (i+4)%SHOWS.length] : [i];   // ド派手 2つ・ドド派手 3つ
  if(st.sset==='rand') setPick();   // 🔀 おまかせ：演出ごとに 音の セットを かえる（v583）
  list.forEach((j,n)=>e.after(n*0.22, ()=>SHOWS[j](e, c))); shows.n++; shows.last=i; shows.multi=list.length;
  const big=1+0.2*bo, rainbow=['#ffffff','#fff36b','#ff8a3d','#ff2bd6','#7cf0ff'];
  e.text(rnd(W*0.3, W*0.7), H*rnd(0.17, 0.25), w, {sz:Math.min(64*big, W/e.d/(Array.from(w).length*0.95)), pop:true, rot:rnd(-0.18,0.18), vy:-20, life:1.15+0.2*bo, grad:bo>=2 ? rainbow : ['#ffffff', e.ink()[1], e.ink()[2]]});
  if(bo>=1){ e.flash(e.pal()[i%e.pal().length], 0.22+0.08*bo); e.kick(0.4*bo); }
  sc.jumpT=e.t; e.pulse=1; vib([30,30,30]);
  if(lookKind()==='poyo' && window.HADE_POYO && sc.lk) window.HADE_POYO.hop(sc.lk, e.t, 1+0.4*bo);   // 🫧 ぽよん：みんなで ぴょん（v589）
}
// 🕐 時計：分が かわったら 少し・0分は 時報（キーンコーン）・30分ごと・目覚まし（v588）
function alarmDue(r, now){ if(!r || r.m!=='clock' || !r.al) return false; const d=new Date(now), hm=p2(d.getHours())+':'+p2(d.getMinutes()); return hm===r.al && r.alKey!==ymdOf(d)+' '+hm; }
function fireAlarm(r, now){
  const d=new Date(now); r.alKey=ymdOf(d)+' '+r.al; save();
  if(!($('hadeTimerOverlay') && isDlgOpen('hadeTimerOverlay'))) openHadeTimer(true);
  openStage();
  tonePick(); alarmOn=true; alarmUntil=now+ALARM_MS; nextAlarm=now+(toneNow==='fanfare' ? 3200 : FX.tonePer(toneNow)*1000);
  const b=$('htStop'); if(b) b.hidden=false;
  paintBar(); banner('⏰ '+r.al.replace(/^0/, '')+' です！', 'big'); sayV(hmV(r.al)+'です', 'last');
  if(sc){ const e=sc.e; e.finale({shells:12, conf:180, emo:['⏰','✨','🌅','⭐','🎉'], flash:'#fff3c4'}); e.burst(e.W/2, e.H*0.46, {n:110, sp:680}); }
  toneSnd(true); vib([300,120,300,120,600]);
}
function clockStep(r, v, now){
  const e=sc.e, key=v.hour*60+v.min, c=[e.W/2, e.H*0.47];
  if(prevClk!=null && key!==prevClk){
    const hh=st.clock.h12 ? (v.hour%12||12) : v.hour;
    if(v.min===0 && st.clock.jiho!=='none'){   // 時報
      banner((st.clock.h12 ? v.ap+' ' : '')+hh+'時です！', 'big'); sayV((st.clock.h12 ? v.ap : '')+hh+'時です', 'last');
      e.finale({shells:8, conf:120, emo:['🔔','✨','🎉'], flash:'#fff3c4'}); e.burst(c[0], c[1], {n:90, sp:620}); vib([120,80,120]);
      if(st.snd && FX.tone && !alarmOn) FX.tone('chime', true);
    } else if(v.min===30 && st.clock.jiho==='half'){ banner(hh+'時 30分', 's'); sayV(hh+'時30分です', 'last'); e.shell(null); e.shell(null); snd('chime'); vib(60); }
    else { e.burst(c[0], c[1], {n:40, sp:420}); sc.jumpT=e.t; }   // 分が かわった
  }
  prevClk=key;
  if(alarmDue(r, now)) fireAlarm(r, now);
  alarmStep(now);
}
function showNow(){ if(!sc) return; showTime(shows.n+1); barShow(); }
function update(){
  const r=st.run; if(!r || !sc) return;
  const now=Date.now(), v=viewOf(r, now), e=sc.e; cur=v;
  if(v.mode==='down'){ const pg=1-v.frac; e.warp=Math.min(1, pg*pg*1.1+(v.sec<=10 && !r.done ? 0.35 : 0)); e.heat=Math.min(1, pg); e.amb=0.3+0.7*pg; }
  else if(v.mode==='up'){ e.warp=0.3; e.heat=0.45; e.amb=0.45; }
  else if(v.mode==='clock'){ e.warp=0.3; e.heat=0.4; e.amb=0.5; }
  else { const wk=v.ph.ph==='work'; e.warp=wk ? 0.75 : 0.12; e.heat=wk ? 0.85 : 0.2; e.amb=wk ? 0.7 : 0.3; }
  if(r.m==='clock') clockStep(r, v, now);
  if(r.done){ e.amb=1; e.warp=0.9; e.heat=1; alarmStep(now); prevSec=v.sec; return; }
  if(r.p){ prevSec=v.sec; return; }
  if(isOver(r, now)){ finish(); return; }
  if(st.every>0){   // 間の 派手な 演出（のこり10秒・くり返しの「よーい」と 区切りの 3秒前は 休む）
    const el=r.m==='down' ? r.dur-Math.max(0, v.ms) : r.m==='up' ? v.ms : r.m==='clock' ? ((v.hour*60+v.min)*60+v.sec)*1000 : elapsed(r, now), k=Math.floor(el/(st.every*1000));
    if(prevShow!=null && k>prevShow && !((r.m==='down' && v.sec<=10) || (r.m==='iv' && (v.ph.ph==='prep' || v.sec<=3)))) showTime(k);
    prevShow=k;
  }
  if(v.mode==='iv'){ const key=v.ph.ph+v.ph.round; if(prevPh!=null && key!==prevPh) onPhase(v.ph); prevPh=key; }
  if(v.mode==='up'){
    if(prevMin!=null && v.min>prevMin){ sayV(v.min+'分', 'last'); banner(v.min+'分！', 'go1'); snd('level'); e.shell(null); e.shell(null); e.shell(null); vib([60,40,60]); }
    prevMin=v.min;
    const ten=Math.floor(v.sec/10); if(!st.every && prevTenth!=null && ten>prevTenth && sc.head) e.burst(sc.head[0], sc.head[1], {n:24, sp:260}); prevTenth=ten;
  }
  if(prevSec!=null && v.sec!==prevSec) onSecond(v);
  prevSec=v.sec;
}
function paintStage(){
  const e=sc.e, g=e.g, W=e.W, H=e.H, d=e.d, r=st.run, v=cur || viewOf(r, Date.now()), look=lookKind();
  const fu=$('htFull'); if(fu) fu.classList.toggle('lk', look!=='ring');   // 絵・動物の 明るい 地でも 上の 字が 読めるように
  e.lightBg=look==='poyo';   // 🫧 ぽよん の 明るい 地では 光を 色の まま 重ねる（v589）
  if(look!=='ring'){ paintLook(look, r, v); paintTop(r, v); return; }
  e.drawBg();
  const [ox,oy]=e.offset(); g.save(); g.translate(ox, oy);
  if(v.mode==='clock' && paintRingClock(sc, v, H*0.13, H-(barBot()+12)*d, false, r && !r.p ? (e.level==='calm' ? 0.25 : 0.9) : 0)){   // 🕐 時計（v591）
    g.restore(); g.save(); g.translate(ox, oy); e.drawFx(); g.restore(); paintTop(r, v); return;
  }
  const cx=W/2, cy=H*0.47, R=Math.min(W*0.44, H*0.36);
  // のこり10秒の 赤い どきどき
  const last10=r && r.m==='down' && !r.done && !r.p && v.sec<=10;
  if(last10){ const ph=(Date.now()%1000)/1000; vignette(g, W, H, 0.22+0.3*Math.pow(1-ph,2)); }
  let col=null;
  if(v.mode==='iv'){ col=r && r.list && v.ph.ph==='work' ? STEP_COL[(v.ph.round-1)%STEP_COL.length] : v.ph.ph==='work' ? {c1:'#ff3b30', c2:'#ffd23f'} : v.ph.ph==='rest' ? {c1:'#00e0ff', c2:'#a8ffcf'} : {c1:'#ffffff', c2:'#b0b8ff'}; }   // 📋 進行表は 段ごとの 色
  sc.ring(v.mode==='up' ? v.frac : v.frac, cx, cy, R, Object.assign({emit:r && !r.p && !r.done ? (e.level==='calm' ? 0.25 : 0.9) : 0, back:v.mode!=='up'}, col||{}));
  if(last10 && sc.big){ const ph=Math.min(1, (e.t-sc.big.t0)/1); sc.bigNum(sc.big.n, ph, cx, cy, R); }
  else {
    const units=Array.from(v.str).reduce((a,ch)=>a+(/[0-9]/.test(ch) ? 1 : 0.46), 0), fs=Math.min(R*1.55/(units*0.62), R*0.62);
    sc.digits(v.str, cx, cy, fs, {sparks:e.level==='calm' ? 0 : 8, col:col ? col.c2 : null, glow:col ? col.c1 : null});
    if(v.mode==='clock'){ const sub=[v.ap, st.clock.sec ? p2(v.sec)+'秒' : ''].filter(Boolean).join(' '); if(sub){ g.save(); g.font='bold '+Math.round(fs*0.3)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; g.lineWidth=fs*0.04; g.strokeStyle='rgba(0,0,0,.55)'; g.strokeText(sub, cx, cy+fs*0.82); g.fillStyle=e.ink()[1]; g.fillText(sub, cx, cy+fs*0.82); g.restore(); } }
    if(r && r.p){ g.save(); g.font='bold '+Math.round(fs*0.28)+'px '+NUMF; g.textAlign='center'; g.fillStyle='rgba(255,255,255,'+(0.55+0.45*Math.sin(e.t*4))+')'; g.fillText('一時停止中', cx, cy+fs*0.85); g.restore(); }
  }
  g.restore();
  g.save(); g.translate(ox, oy); e.drawFx(); g.restore();
  paintTop(r, v);
}
// 画面いっぱい・絵・動物（v580。hade-look.js で 描く）
// 下の ボタンの 高さ（隠れたら 絵を 下まで。v588）
function barBot(){ const bar=$('htBar'), want=barHidden() ? 10 : (bar ? bar.offsetHeight : 70); botH+=(want-botH)*0.18; if(Math.abs(want-botH)<0.5) botH=want; return botH; }
function paintLook(look, r, v){
  const e=sc.e, g=e.g, W=e.W, H=e.H, d=e.d, [ox,oy]=e.offset();
  const last10=r && r.m==='down' && !r.done && !r.p && v.sec<=10;
  if(look==='big') e.drawBg();
  const S=lookS(v, r, e, H-(barBot()+12)*d);
  g.save(); if(look==='big' || look==='poyo') g.translate(ox, oy);
  LOOK.draw(e, look, lookSub(), S, lk(sc));
  g.restore();
  sc.head=sc.lk.head || [W/2, H/2];
  if(last10 && look!=='ani'){ const ph=(Date.now()%1000)/1000; vignette(g, W, H, 0.22+0.3*Math.pow(1-ph,2)); }
  if(r && r.p) LOOK.pill(g, '⏸ 一時停止中', W/2, H*0.5, Math.min(W, H)*0.07, {bg:'rgba(0,0,0,'+(0.5+0.15*Math.sin(e.t*4)).toFixed(3)+')'});
  g.save(); g.translate(ox, oy); e.drawFx(); g.restore();
}
// 上の文字
function paintTop(r, v){
  const lab=$('htLab'), sub=$('htSub');
  if(lab){
    let a='', b='';
    if(r.m==='clock'){ a='🕐 '+v.date; b=r.al ? '⏰ '+r.al.replace(/^0/, '')+' に 鳴らす' : ''; }   // 🕐 時計（v588）
    else if(r.m==='down'){ a='⏳ '+(r.name || lenTxt(r.dur/1000)); b=r.done ? (overNote || 'おわり') : ''; }
    else if(r.m==='up'){ a='⏱ ストップウォッチ'; b=r.laps.length ? 'ラップ '+r.laps.length : ''; }
    else if(r.list){ a='📋 '+(v.ph.ph==='done' ? '進行表' : v.ph.name); b=v.ph.ph==='prep' ? 'よーい（'+r.list.length+'段・ぜんぶで '+lenTxt(progTotal(r.list)/1000-3)+'）' : v.ph.ph==='done' ? 'おわり' : v.ph.round+'/'+r.n+(v.ph.next ? ' ・ 次は '+v.ph.next : ' ・ さいご'); }   // 📋 進行表（v598）
    else { a='🔁 くり返し'; b=v.ph.ph==='prep' ? 'よーい' : v.ph.ph==='done' ? 'おわり' : 'ROUND '+v.ph.round+'/'+r.n+' ・ '+(v.ph.ph==='work' ? 'がんばる' : '休けい'); }
    if(lab.textContent!==a) lab.textContent=a; if(sub.textContent!==b) sub.textContent=b;
  }
}
// 見本（設定の画面の 上）
function paintPrev(){
  const c=$('htPrev'); if(!c) return;
  if(!pv || pv.e.cv!==c){ pv=new Scene(c); }
  const e=pv.e; e.setTheme(st.theme); e.setLevel(st.level); e.noFlash=!st.flash; e.resize(); e.amb=0.6; e.warp=0.35; e.heat=0.55;
  const r=st.run, v=viewOf(r, Date.now()), W=e.W, H=e.H, R=Math.min(W*0.4, H*0.4), look=lookKind(); e.lightBg=look==='poyo';
  if(look!=='ring'){   // 見せ方の 見本（v580）：動いて いる タイマーが あれば その時間、なければ 9.5秒で 0 まで 進めて しめくくりも 見せる
    const S=r && !r.done ? Object.assign(lookS(v, r, e, H), {prev:true, tickT:Math.floor(e.t)}) : prevS(e), L=lk(pv);
    if(look==='big') e.drawBg();
    LOOK.draw(e, look, lookSub(), S, L);
    if(S.done && !pv.fin){ pv.fin=true; LOOK.finish(e, look, lookSub(), L, ()=>{}); } else if(!S.done) pv.fin=false;
    e.drawFx(); return;
  }
  e.drawBg();
  if(v.mode==='clock' && paintRingClock(pv, v, H*0.05, H*0.95, true, 0.5)){ e.drawFx(); return; }   // 🕐 時計（v591）
  pv.ring(r || st.mode==='clock' ? v.frac : 0.72, W/2, H*0.5, R, {emit:0.5});
  const units=Array.from(v.str).reduce((a,ch)=>a+(/[0-9]/.test(ch) ? 1 : 0.46), 0), fs=Math.min(R*1.55/(units*0.62), R*0.62);
  pv.digits(v.str, W/2, H*0.5, fs, {sparks:3});
  e.drawFx();
}
function prevS(e){
  if(st.mode==='clock') return Object.assign(lookS(clockView(Date.now()), null, e, e.H), {prev:true, tickT:Math.floor(e.t)});   // 🕐 時計（v588）
  const T=Math.max(0, e.t-(pv.t0||0))%13, done=T>=9.5, pp=done ? 1 : T/9.5;
  let str, sec, bstr, bsub='', sstr, mode='down';
  if(st.mode==='up'){ mode='up'; const ms=pp*60000; str=fmtUp(ms); sec=Math.floor(ms/1000); sstr=hms(sec); bstr=sstr.replace(/^0(\d:)/, '$1'); bsub='.'+p2(Math.floor(ms%1000/10)); }
  else { const total=(st.mode==='iv' ? st.iv.w : st.sec)||1, rem=done ? 0 : Math.max(1, Math.ceil(total*(1-pp))); str=hms(rem); sec=rem; sstr=str; bstr=done ? '0' : rem<=60 ? String(rem) : str.replace(/^0(\d:)/, '$1'); }
  return {t:e.t, W:e.W, H:e.H, d:e.d, prev:true, mode, p:pp, lvl:mode==='up' ? pp : 1-pp, str, bstr, bsub, sstr, sec, ph:'', last10:false, paused:false, done, doneT:done ? T-9.5 : 0, tickT:Math.floor(e.t), bot:e.H, ink:e.ink(), level:e.level};
}
function loop(){ if(!raf){ lastTs=performance.now(); raf=requestAnimationFrame(frame); } }
function frame(ts){
  raf=0;
  const stage=stageOpen(), prevOn=!stage && $('hadeTimerOverlay') && isDlgOpen('hadeTimerOverlay') && $('htPrev') && document.visibilityState!=='hidden';
  if(!stage && !prevOn) return;
  raf=requestAnimationFrame(frame);
  const dt=Math.min(0.05, Math.max(0, (ts-lastTs)/1000)); lastTs=ts;
  if(frozen) return;
  if(stage){ sc.e.resize(); update(); if(!sc) return; sc.e.step(dt); paintStage(); }
  else { if(pv) pv.e.step(dt); paintPrev(); paintRunCard(); }
}

/* ───────── 閉じているあいだ（右下の 残り時間・0 の 知らせ）───────── */
function startTicker(){ if(!ticker) ticker=setInterval(tick, 500); }
function stopTicker(){ if(ticker){ clearInterval(ticker); ticker=0; } }
function tick(){
  const r=st && st.run; if(!r){ stopTicker(); hideChip(); mChip(); return; }
  if(stageOpen()) return;
  if(r.m==='clock' && alarmDue(r, Date.now())){ fireAlarm(r, Date.now()); return; }   // 閉じて いても 目覚まし（v588）
  if(isOver(r, Date.now())){ finish(); return; }
  paintChip(); paintRunCard();
}
function chipText(){
  const r=st.run; if(!r) return '';
  const v=viewOf(r, Date.now());
  if(r.m==='clock') return '🕐 '+(v.ap ? v.ap+' ' : '')+v.str+(r.al ? ' ⏰' : '');   // 🕐 時計（v588）
  return (r.m==='down' ? '⏳ ' : r.m==='up' ? '⏱ ' : r.list ? '📋 '+(v.ph && v.ph.name ? v.ph.name+' ' : '') : '🔁 ')+(r.p ? '⏸ ' : '')+(r.done ? 'おわり' : r.m==='up' ? hms(Math.floor(v.ms/1000)) : v.str);
}
function paintChip(){
  const open=$('hadeTimerOverlay') && isDlgOpen('hadeTimerOverlay');
  if(!st || !st.run || open || stageOpen()){ hideChip(); return; }
  let c=$('htChip');
  if(!c){ c=document.createElement('button'); c.type='button'; c.id='htChip'; c.className='ht-chip'; c.title='ど派手タイマーを 開く'; c.onclick=()=>{ openHadeTimer(true); if(st.run) openStage(); }; document.body.appendChild(c); }
  const t=chipText(); if(c.textContent!==t) c.textContent=t;
}
function hideChip(){ const c=$('htChip'); if(c) c.remove(); }
function paintRunCard(){
  const b=$('htRunCard'); if(!b) return;
  const r=st.run;
  if(!r){ if(b.innerHTML) b.innerHTML=''; return; }
  let t=b.querySelector('.ht-run .t');
  if(!t){ b.innerHTML=`<div class="ht-run"><span class="t"></span><button type="button" class="ht-b pri" onclick="HADE_TIMER.show()">⛶ 見る</button><button type="button" class="ht-b" onclick="HADE_TIMER.stop()">■ やめる</button></div>`; t=b.querySelector('.ht-run .t'); }
  const x=chipText(); if(t.textContent!==x) t.textContent=x;   // 文字だけ かえる（ボタンは 作りなおさない）
}

/* ───────── 設定の画面 ───────── */
function setPanel(){
  if(st.mode==='down'){
    const h=Math.floor(st.sec/3600), m=Math.floor(st.sec%3600/60), s=st.sec%60;
    const box=(id, v, lab, max)=>`<label class="ht-num"><input id="${id}" type="number" inputmode="numeric" min="0" max="${max}" value="${v}" oninput="HADE_TIMER.typed()" aria-label="${lab}"><span>${lab}</span></label>`;
    return `<div class="ht-nums">${box('htH',h,'時間',99)}${box('htM',m,'分',59)}${box('htS',s,'秒',59)}</div>
      <div class="ht-chips">${QUICK.map(([v,n])=>`<button type="button" onclick="HADE_TIMER.add(${v})">${n}</button>`).join('')}<button type="button" onclick="HADE_TIMER.set(0)">クリア</button></div>
      <div class="ht-sub"><h4>⭐ よく使う時間<small>押すと その時間に</small></h4>
        <div class="ht-pres">${st.pre.map((p,i)=>`<span class="ht-pre${picked===p.n && st.sec===p.s ? ' on':''}"><button type="button" onclick="HADE_TIMER.usePre(${i})"><b>${esc(p.n)}</b><small>${esc(lenTxt(p.s))}</small></button><button type="button" class="x" onclick="HADE_TIMER.delPre(${i})" aria-label="${esc(p.n)} を消す">✕</button></span>`).join('') || '<p class="ht-note">まだ ありません</p>'}</div>
        <div class="ht-chips"><button type="button" onclick="HADE_TIMER.addPre()">＋ いまの時間を 残す</button></div></div>`;
  }
  if(st.mode==='clock'){   // 🕐 時計（v588）
    const c=st.clock, o=(k, list, lab)=>`<div class="ht-opt"><span>${lab}</span>${list.map(([v,n])=>`<button type="button" class="${c[k]===v?'on':''}" onclick='HADE_TIMER.clock("${k}", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>`;
    return `${o('h12', [[false,'24時間'],[true,'12時間（午前・午後）']], '表示')}${o('sec', [[true,'出す'],[false,'出さない']], '秒')}${o('jiho', JIHO, '時報')}
      <div class="ht-opt ht-al"><span>⏰ 目覚まし</span><input type="time" id="htAl" value="${c.al}" aria-label="目覚ましの 時刻" onchange="HADE_TIMER.clock('al', this.value)"><button type="button" class="${c.al?'':'on'}" onclick="HADE_TIMER.clock('al', '')">なし</button></div>
      <p class="ht-note big">「▶ 時計を 出す」で 全画面の 大きな 時計に なります（見せ方・テーマ・演出は 下で えらべます）。時報は 毎時 0分に キーンコーン（30分ごと は 30分にも 知らせる）。⏰ 目覚ましの 時刻に なると「時間が 来た 音」で「✓ 止める」まで 知らせます。「← 戻る」で 閉じても、表電卓を 開いて いる あいだは 鳴ります。</p>`;
  }
  if(st.mode==='multi'){   // ⏲ 同時に（v598）
    const box=(id, lab, max, v)=>`<label class="ht-num sm"><input id="${id}" type="text" inputmode="numeric" maxlength="3" value="${v}" aria-label="${lab}"><span>${lab}</span></label>`;
    return `<div class="ht-mlist" id="htMList">${mCards()}</div>
      <div class="ht-madd"><input id="htMName" class="ht-in" type="text" maxlength="16" placeholder="名前（例：パスタ）" aria-label="名前">
        <div class="ht-nums">${box('htMM', '分', 999, 3)}${box('htMS', '秒', 59, 0)}</div>
        <button type="button" class="ht-b pri" onclick="HADE_TIMER.mAddForm()">＋ 足して スタート</button></div>
      <div class="ht-chips">${st.pre.map((p,i)=>`<button type="button" onclick="HADE_TIMER.mAddPre(${i})">⭐ ${esc(p.n)} ${esc(lenTxt(p.s))}</button>`).join('')}</div>
      <p class="ht-note">6本まで いっしょに 数えます。1本ずつ ⏸ 止める・＋1分・✕ 消す。0 に なると「できた！」と 光って 鳴ります（押すと 止まる）。閉じても 数えて いて、0 に なったら 開いて 知らせます。</p>`;
  }
  if(st.mode==='prog'){   // 📋 進行表（v598）
    const L=st.prog.list, ed=(i, k, v, lab, cls)=>`<input class="${cls}" type="text" inputmode="numeric" value="${v}" aria-label="${lab}" onchange="HADE_TIMER.prog(${i}, '${k}', this.value)">`;
    return `<div class="ht-prog">${L.map((x,i)=>`<div class="ht-pr"><b>${i+1}</b><input class="n" type="text" maxlength="16" value="${esc(x.n)}" aria-label="${i+1}番目の 名前" onchange="HADE_TIMER.prog(${i}, 'n', this.value)">
        ${ed(i, 'm', Math.floor(x.s/60), (i+1)+'番目の 分', 'm')}<span>分</span>${ed(i, 's', x.s%60, (i+1)+'番目の 秒', 's')}<span>秒</span>
        <button type="button" onclick="HADE_TIMER.progMove(${i}, -1)" aria-label="上へ"${i?'':' disabled'}>▲</button><button type="button" onclick="HADE_TIMER.progDel(${i})" aria-label="消す">✕</button></div>`).join('') || '<p class="ht-note">段が ありません。「＋ 段を 足す」か 見本から。</p>'}</div>
      <div class="ht-chips"><button type="button" onclick="HADE_TIMER.progAdd()">＋ 段を 足す</button>${PROG_SAMPLES.map(([n],i)=>`<button type="button" onclick="HADE_TIMER.progSample(${i})">${n}</button>`).join('')}</div>
      <p class="ht-note" id="htProgTot">${L.length ? 'ぜんぶで '+esc(lenTxt(progTotal(L)/1000-3))+'（'+L.length+'段）。' : ''}段が かわると 名前を 大きく 出して 鳴らします（声で「○○です」）。3分 以上の 段は のこり 1分で「次は ○○」。⏭ 次へ で 次の 段へ。</p>`;
  }
  if(st.mode==='up') return `<p class="ht-note big">「▶ スタート」で 0 から 数えます。🏁 ラップで 区切りの時間を 残し、いちばん はやい周（緑）と おそい周（赤）が 分かります。1分ごとに 花火。</p>`;
  const iv=st.iv, box=(k, v, lab, max)=>`<label class="ht-num sm"><input id="htIv${k}" type="number" inputmode="numeric" min="0" max="${max}" value="${v}" oninput="HADE_TIMER.ivTyped()" aria-label="${lab}"><span>${lab}</span></label>`;
  return `<div class="ht-nums">${box('W',iv.w,'がんばる 秒',3600)}${box('R',iv.r,'休む 秒',3600)}${box('N',iv.n,'回',99)}</div>
    <div class="ht-chips"><button type="button" onclick="HADE_TIMER.ivSet(20,10,8)">タバタ式（20秒・10秒・8回）</button><button type="button" onclick="HADE_TIMER.ivSet(60,30,5)">1分・30秒・5回</button><button type="button" onclick="HADE_TIMER.ivSet(30,15,10)">30秒・15秒・10回</button></div>
    <p class="ht-note" id="htIvTot">ぜんぶで ${esc(lenTxt(ivTotal(iv)/1000))}（はじめの「よーい」3秒を ふくむ）</p>`;
}
function render(){
  const b=$('htBody'); if(!b) return;
  const opt=(k, list, lab)=>`<div class="ht-opt"><span>${lab}</span>${list.map(([v,n])=>`<button type="button" class="${st[k]===v?'on':''}" onclick='HADE_TIMER.opt("${k}", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>`;
  b.innerHTML=`<div class="ht-wrap">
    <canvas id="htPrev" class="ht-prev" aria-label="見本（押すと はじまる）" onclick="HADE_TIMER.start()"></canvas>
    <div class="ht-modes" role="tablist">${MODES.map(([k,n])=>`<button type="button" role="tab" aria-selected="${st.mode===k}" class="${st.mode===k?'on':''}" onclick="HADE_TIMER.mode('${k}')">${n}</button>`).join('')}</div>
    <div id="htRunCard"></div>
    <div class="ht-sec" id="htSet">${setPanel()}</div>
    <button type="button" class="ht-go" onclick="HADE_TIMER.start()">${st.mode==='multi' ? '⛶ 大きく 見る' : '▶ '+(st.mode==='clock' ? '時計を 出す' : 'スタート')}</button>
    ${lookSec()}
    <div class="ht-sec"><h4>🎆 演出</h4>
      <div class="ht-opt"><span>テーマ</span>${FX.THEMES.map(([v,n])=>`<button type="button" class="th th-${v}${st.theme===v?' on':''}" onclick='HADE_TIMER.opt("theme", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>
      <div class="ht-opt"><span>演出の 強さ</span>${FX.LEVELS.map(([v,n])=>`<button type="button" class="lv-${v}${st.level===v?' on':''}" onclick='HADE_TIMER.opt("level", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>${opt('every', EVERY, '間の 演出')}
      ${opt('snd', [[true,'🔊 鳴らす'],[false,'🔇 鳴らさない']], '音')}
      ${opt('voice', VOICES, '🗣 声で 数える')}<p class="ht-note">数える：タイマーは のこり10秒から「じゅう、きゅう…」と 0 で「時間です」・くり返しは 3・2・1 と スタート／休けい・ストップウォッチは 1分ごと・時計は 時報と 目覚ましで 時刻を 読みます。節目も：タイマーの 半分・のこり5分・3分・1分・30秒、くり返しの ラウンドも 読みます。声は ⚙ 設定の「🔈 読み上げの声」で かえられます（音を 鳴らさない ときは 声も 出しません）。</p>
      ${FX.SSETS ? opt('sset', FX.SSETS.concat([['rand','🔀 おまかせ']]), '演出の 音')+'<p class="ht-note">数えている あいだの 音（花火の ドーン・パチパチ、のこり10秒、区切り など）を かえます。押すと 聞けます。🔀 おまかせ は 演出ごとに かわります。</p>' : ''}
      ${FX.TICKS ? opt('tick', FX.TICKS, '1秒ごとの 音') : ''}
      ${FX.TONES ? opt('tone', FX.TONES.concat([['rand','🔀 おまかせ']]), '時間が 来た 音')+'<p class="ht-note">押すと 聞けます。0 に なったら 「✓ 止める」まで くり返します（1分まで）。🔀 おまかせ は 毎回 ちがう 音です。</p>' : ''}
      ${opt('vibe', [[true,'ふるえる'],[false,'ふるえない']], '振動')}
      ${opt('flash', [[true,'光る'],[false,'光らない']], '画面の 点滅')}
      <p class="ht-note">全画面のあいだは 画面を消しません（対応している端末）。「← 戻る」で 閉じても 時間は 進み、右下に 残りの時間が 出ます。0 になると 開いて 知らせます（アプリを 閉じていたときは 次に開いたとき）。光が まぶしいときは「ひかえめ」か「光らない」に。<b>ド派手</b>は 粒が 1.6倍で 背景に 光のすじ、<b>ドド派手</b>は 2.4倍で 流れ星・虹色の ふち・大きな ゆれも（とても 激しいので 光や ゆれが 苦手な方は ご注意ください）。</p></div>
  </div>`;
  paintRunCard(); loop();
}
// 🖼 数え方の 見せ方（v580）
const LOOK_NOTE={ring:'光の輪が 残りの 時間ぶん へって いきます（いままでの 見せ方）。',
  big:'画面いっぱいの 大きな 数字で 数えます（のこり1分からは 秒だけ）。うしろの 色の 帯が 残りの 時間です。',
  poyo:'📢 電光掲示板の ぽよん と 同じ：前の 数字が つぶれて、新しい 数字が 落ちてきて ぷるんと はずみます。つぶれると しぶき、着地で 床に 輪（ド派手は 画面が ゆれて あわが はじけ「ぽよん！」、ドド派手は 虹色で 何度も はずむ）。5秒ごとの 演出と 0 の あとは みんなで ぴょん。🕐 時計は 秒も ぽよん。',
  pic:'絵が 時間に 合わせて 動き、0 で 絵ごとの しめくくり（発射・ふっと 消える・くるっと・ドカーン・パーン・さく）。',
  ani:'動物が 自分で 数えます：ねこ＝めくりの 数字板・うさぎ＝なわとび・いぬ＝ほえる・ペンギン＝指揮・かえる＝鳴く・くま＝太鼓（1秒ごとに 動いて、道具に 時間が 出ます）。残りが へるほど 空が 夕やけに なり、のこり10秒は 数を さけんで、0 で 大よろこび。'};
function lookSec(){
  if(!LOOK) return '';
  const one=(k, v, n)=>{ const i=n.indexOf(' '), on=st[k]===v && (k==='look' || st.look===k); return `<button type="button" class="${on ? 'on' : ''}" aria-pressed="${on}" onclick='HADE_TIMER.opt("${k}", ${JSON.stringify(v)})'><span class="i">${n.slice(0, i)}</span><span>${esc(n.slice(i+1))}</span></button>`; };
  return `<div class="ht-sec" id="htLookSec"><h4>🖼 数え方の 見せ方<small>上の 見本で 動きが 分かります</small></h4>
    <div class="ht-looks">${LOOK.LOOKS.map(([v,n])=>one('look', v, n)).join('')}</div>
    ${st.look==='pic' ? `<div class="ht-looks sub" aria-label="絵">${LOOK.PICS.map(([v,n])=>one('pic', v, n)).join('')}</div>` : ''}
    ${st.look==='ani' ? `<div class="ht-looks sub" aria-label="動物">${LOOK.ANIS.map(([v,n])=>one('ani', v, n)).join('')}</div>` : ''}
    <p class="ht-note">${LOOK_NOTE[st.look]||''}</p></div>`;
}
function setMode(k){ if(!MODES.some(m=>m[0]===k)) return; st.mode=k; save(); render(); }
// 🕐 時計の 設定（v588）。動いて いる 時計にも すぐ 効く
function setClock(k, v){
  const c=st.clock;
  if(k==='h12' || k==='sec') c[k]=v===true || v==='true';
  else if(k==='jiho'){ if(!JIHO.some(x=>x[0]===v)) return; c.jiho=v; }
  else if(k==='al'){ const a=okHM(v); if(v && !a){ toastT('時刻を 入れてください（例：7:30）'); return; } c.al=a; }
  else return;
  const r=st.run; if(r && r.m==='clock' && k==='al'){ r.al=c.al; const d=new Date(Date.now()), hm=p2(d.getHours())+':'+p2(d.getMinutes()); r.alKey=c.al===hm ? ymdOf(d)+' '+hm : ''; }
  save(); const set=$('htSet'); if(set) set.innerHTML=setPanel(); paintRunCard();
  if(k==='al') toastT(c.al ? '⏰ '+c.al.replace(/^0/, '')+' に 鳴らします' : '⏰ 目覚ましを なしに しました');
}
function setOpt(k, v){
  if(k==='theme'){ if(!FX.hasTheme(v)) return; st.theme=v; }
  else if(k==='level'){ if(!FX.hasLevel(v)) return; st.level=v; }
  else if(k==='every'){ if(!EVERY.some(x=>x[0]===+v)) return; st.every=+v; }
  else if(k==='snd' || k==='vibe' || k==='flash'){ st[k]=v===true || v==='true'; }
  else if(k==='look' || k==='pic' || k==='ani'){ if(!LOOK || !LOOK.has(k, v)) return; if(k==='look') st.look=v; else { st[k]=v; st.look=k; } if(pv){ pv.lk=null; pv.t0=pv.e.t; pv.fin=false; } }   // 見せ方（v580）
  else if(k==='tone'){ if(v!=='rand' && (!FX.TONES || !FX.TONES.some(x=>x[0]===v))) return; st.tone=v; }   // 時間が 来た 音（v580。🔀 おまかせ は v583）
  else if(k==='sset'){ if(v!=='rand' && !(FX.hasSset && FX.hasSset(v))) return; st.sset=v; setPick(); }   // 演出の 音（v583）
  else if(k==='tick'){ if(!(FX.hasTick && FX.hasTick(v))) return; st.tick=v; }   // 1秒ごとの 音（v583）
  else if(k==='voice'){ if(!VOICES.some(x=>x[0]===v)) return; st.voice=v; }   // 🗣 声で 数える（v593）
  else return;
  save(); render();
  if(pv){ const e=pv.e; e.setTheme(st.theme); e.setLevel(st.level); e.noFlash=!st.flash; e.resize(); e.burst(e.W/2, e.H/2, {n:50, sp:400}); if(k==='theme') e.shell(null, {sc:0.8}); }
  if(k==='snd' && st.snd){ FX.unlock(); snd('coin'); }
  if(k==='tone'){ FX.unlock(); if(st.snd){ tonePick(); toneSnd(true); } else toastT('🔇 音が「鳴らさない」に なっています（「音」で かえられます）'); }
  if(k==='sset' || (k==='tick' && v!=='none')){ FX.unlock(); if(st.snd) demo(k); else toastT('🔇 音が「鳴らさない」に なっています（「音」で かえられます）'); }
  if(k==='vibe' && st.vibe) vib(50);
  if(k==='voice'){ hushV(); if(v==='off') return; if(!st.snd){ toastT('🔇 音が「鳴らさない」に なっています（「音」で かえられます）'); return; } voicePrimed=false; primeVoice(); sayV(v==='all' ? 'のこり 1分です' : 'さん、に、いち、時間です', 'last'); }   // ためしに 読む
}
// 演出の 音・1秒ごとの 音を ためしに 鳴らす（v583）
let demoT=[];
function demo(k){
  demoT.forEach(clearTimeout); demoT=[];
  const seq=k==='sset' ? [['boom'],['crackle'],['heart'],['beep', 1320, 0.16],['level']] : [0,1,2,3,4,5];
  seq.forEach((x,i)=>demoT.push(setTimeout(()=>{ if(!st || !st.snd) return; if(k==='sset') snd(...x); else if(st.tick!=='none') FX.tickSnd(st.tick, x); }, i*(k==='sset' ? 380 : 450))));
}
function setSec(s){ st.sec=int(s,0,MAX_SEC,0); picked=''; save(); const set=$('htSet'); if(set) set.innerHTML=setPanel(); }
function addSec(s){ setSec(Math.min(MAX_SEC, st.sec+int(s,1,3600,0))); }
function typed(){
  const v=id=>{ const e=$(id); const n=parseInt(String(e && e.value || '0').normalize('NFKC'), 10); return isFinite(n) && n>0 ? n : 0; };
  st.sec=Math.min(MAX_SEC, Math.min(99, v('htH'))*3600+Math.min(59, v('htM'))*60+Math.min(59, v('htS'))); picked=''; save();
  document.querySelectorAll('.ht-pre.on').forEach(x=>x.classList.remove('on'));
}
function ivTyped(){
  const v=(id, a, b, d)=>{ const e=$(id); const n=parseInt(String(e && e.value || '').normalize('NFKC'), 10); return isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
  st.iv={w:v('htIvW',5,3600,st.iv.w), r:v('htIvR',0,3600,st.iv.r), n:v('htIvN',1,99,st.iv.n)}; save();
  const t=$('htIvTot'); if(t) t.textContent='ぜんぶで '+lenTxt(ivTotal(st.iv)/1000)+'（はじめの「よーい」3秒を ふくむ）';
}
// 📋 進行表（v598）：段の 名前・分・秒を 直す・足す・消す・並べかえ・見本
function progPaint(){ const set=$('htSet'); if(set) set.innerHTML=setPanel(); }
function prog(i, k, v){
  const x=st.prog.list[i]; if(!x) return;
  const n=t=>{ const m=parseInt(String(t==null ? '' : t).normalize('NFKC').replace(/[^\d]/g, ''), 10); return isFinite(m) ? m : 0; };
  if(k==='n'){ const nm=oneLine(v, 16); if(nm) x.n=nm; }
  else if(k==='m') x.s=Math.max(1, Math.min(MAX_SEC, Math.min(999, n(v))*60+x.s%60));
  else if(k==='s') x.s=Math.max(1, Math.min(MAX_SEC, Math.floor(x.s/60)*60+Math.min(59, n(v))));
  else return;
  save(); progPaint();
}
function progAdd(){ const L=st.prog.list; if(L.length>=MAX_PROG){ toastT('段は '+MAX_PROG+' まで です'); return; } L.push({n:(L.length+1)+'番目', s:300}); save(); progPaint(); }
function progDel(i){ if(!st.prog.list[i]) return; st.prog.list.splice(i, 1); save(); progPaint(); }
function progMove(i, d){ const L=st.prog.list, j=i+d; if(!L[i] || j<0 || j>=L.length) return; [L[i], L[j]]=[L[j], L[i]]; save(); progPaint(); }
function progSample(i){ const p=PROG_SAMPLES[i]; if(!p) return; st.prog.list=p[1].map(([n,s])=>({n, s})); save(); progPaint(); toastT(p[0]+' の 段どりに しました'); }
function ivSet(w, r, n){ st.iv={w:int(w,5,3600,20), r:int(r,0,3600,10), n:int(n,1,99,8)}; save(); const set=$('htSet'); if(set) set.innerHTML=setPanel(); }
function usePre(i){ const p=st.pre[i]; if(!p) return; st.mode='down'; st.sec=p.s; picked=p.n; save(); render(); }
async function addPre(name){
  if(!(st.sec>0)){ toastT('時間を 決めてから 残してください'); return; }
  if(st.pre.length>=MAX_PRE){ toastT('よく使う時間は '+MAX_PRE+' まで です'); return; }
  let n=typeof name==='string' ? name : (typeof appPrompt==='function' ? await appPrompt('⭐ この時間（'+lenTxt(st.sec)+'）の 名前', '') : '');
  n=oneLine(n, 16); if(!n) return;
  st.pre.push({n, s:st.sec}); picked=n; save(); render();
}
async function delPre(i){
  const p=st.pre[i]; if(!p) return;
  if(typeof appConfirm==='function' && !(await appConfirm('⭐「'+p.n+'」を 消しますか？', '消す', 'やめる'))) return;
  st.pre.splice(i,1); save(); render();
}
function show(){ if(st.run) openStage(); }

/* ───────── ⏲ 同時に（v598）───────── */
let mTimer=0, mAl={on:false, until:0, next:0}, mf=null, mfRel=null, mfRaf=0, mfTs=0;
const mLeft=(t, now)=>t.done ? 0 : t.p ? t.left : Math.max(0, t.end-now);
const mOf=id=>st.multi.find(t=>t.id===id);
const mActive=()=>st.multi.some(t=>!t.done || !t.ack);
function mAdd(n, sec){
  sec=int(sec, 1, MAX_SEC, 0); if(!sec){ toastT('時間を 決めてください'); return false; }
  if(st.multi.length>=MAX_MULTI){ toastT('いっしょに 数えるのは '+MAX_MULTI+'本 まで です'); return false; }
  FX.unlock(); primeVoice();
  const now=Date.now(); st.multi.push({id:rid(), n:oneLine(n,16)||('タイマー'+(st.multi.length+1)), dur:sec*1000, end:now+sec*1000, left:sec*1000, p:false, done:false, ack:false});
  save(); mStart(); mRender(); snd('whoosh'); vib(30); return true;
}
function mAddForm(){
  const v=id=>{ const e=$(id); const m=parseInt(String(e && e.value || '').normalize('NFKC').replace(/[^\d]/g, ''), 10); return isFinite(m) ? m : 0; };
  const nm=$('htMName') ? $('htMName').value : '';
  if(mAdd(nm, Math.min(999, v('htMM'))*60+Math.min(59, v('htMS')))){ const e=$('htMName'); if(e) e.value=''; }
}
function mAddPre(i){ const p=st.pre[i]; if(p) mAdd(p.n, p.s); }
function mToggle(id){
  const t=mOf(id), now=Date.now(); if(!t || t.done) return;
  if(t.p){ t.end=now+t.left; t.p=false; } else { t.left=Math.max(0, t.end-now); t.p=true; }
  save(); mStart(); mRender();
}
function mPlus(id, sec){
  const t=mOf(id), now=Date.now(), add=int(sec,1,3600,60)*1000; if(!t) return;
  if(t.done){ t.done=false; t.ack=false; t.p=false; t.dur=add; t.end=now+add; t.left=add; }
  else if(t.p){ t.left=Math.min((MAX_SEC+1)*1000, t.left+add); t.dur=Math.max(t.dur, t.left); }
  else { t.end=Math.min(now+(MAX_SEC+1)*1000, t.end+add); t.dur=Math.max(t.dur, t.end-now); }
  save(); mStart(); mAlarmCheck(); mRender(); snd('coin');
}
function mDel(id){ const i=st.multi.findIndex(t=>t.id===id); if(i<0) return; st.multi.splice(i,1); save(); mAlarmCheck(); mRender(); if(!st.multi.length) mClose(); }
function mAck(id){ const t=mOf(id); if(!t || !t.done || t.ack) return; t.ack=true; save(); mAlarmCheck(); mRender(); snd('chime'); }
// まだ 止めていない できた ものが なければ 音を 止める
function mAlarmCheck(){ if(!st.multi.some(t=>t.done && !t.ack)){ mAl.on=false; if(FX.toneStop) FX.toneStop(); } }
function mStart(){ if(!mTimer && mActive()) mTimer=setInterval(mTick, 250); mChip(); }
function mStop(){ if(mTimer){ clearInterval(mTimer); mTimer=0; } }
function mTick(){
  if(!st){ mStop(); return; }
  const now=Date.now();
  st.multi.forEach(t=>{ if(!t.done && !t.p && t.end<=now){ t.done=true; t.ack=false; save(); mFinish(t, now); } });
  if(mAl.on){
    if(now>mAl.until){ mAl.on=false; }
    else if(now>=mAl.next){ mAl.next=now+FX.tonePer(toneNow)*1000; toneSnd(false); vib([200,100,200]); if(mf){ mf.e.shell(null, {sc:1.1}); mf.e.flash('#ffffff', 0.25); } }
  }
  if(!mActive()){ mStop(); }
  mPaint(); mChip();
}
function mFinish(t, now){
  if(!($('hadeTimerOverlay') && isDlgOpen('hadeTimerOverlay'))){ openHadeTimer(true); }
  if(st.mode!=='multi'){ st.mode='multi'; save(); render(); }
  mOpen();
  tonePick(); mAl={on:true, until:now+ALARM_MS, next:now+(toneNow==='fanfare' ? 3200 : FX.tonePer(toneNow)*1000)};
  toneSnd(true); vib([300,120,300,120,600]); sayV(t.n+'、時間です', 'last');
  mBan('⏰ '+t.n+' できた！');
  if(mf){ const e=mf.e, T=$('htMT_'+t.id); let x=e.W/2, y=e.H/2; if(T){ const r=T.getBoundingClientRect(), c=mf.cv.getBoundingClientRect(); x=(r.left+r.width/2-c.left)*e.d; y=(r.top+r.height/2-c.top)*e.d; }
    e.finale({shells:10, conf:160, emo:['🎉','✨','⏰'], flash:'#fff3c4'}); e.burst(x, y, {n:100, sp:640}); }
}
function mCards(){
  if(!st.multi.length) return '<p class="ht-note">まだ ありません。下で 名前と 時間を 決めて「＋ 足して スタート」か、⭐ の 時間を 押します。</p>';
  const now=Date.now();
  return st.multi.map(t=>`<div class="ht-mc${t.done ? ' done' : t.p ? ' p' : ''}" id="htMC_${t.id}"><div class="t"><b>${esc(t.n)}</b><span class="tm">${mTxt(t, now)}</span></div>
    <div class="bt">${t.done ? (t.ack ? '' : `<button type="button" class="ht-b pri" onclick="HADE_TIMER.mAck('${t.id}')">✓ 止める</button>`) : `<button type="button" class="ht-b" onclick="HADE_TIMER.mToggle('${t.id}')">${t.p ? '▶' : '⏸'}</button>`}<button type="button" class="ht-b" onclick="HADE_TIMER.mPlus('${t.id}', 60)">＋1分</button><button type="button" class="ht-b" onclick="HADE_TIMER.mDel('${t.id}')" aria-label="${esc(t.n)}を 消す">✕</button></div></div>`).join('');
}
const mTxt=(t, now)=>t.done ? 'できた！' : fmtDown(mLeft(t, now))+(t.p ? ' ⏸' : '');
function mRender(){ const b=$('htMList'); if(b) b.innerHTML=mCards(); mGrid(); mChip(); }
// 数字だけ かえる（毎回 作りなおさない）
function mPaint(){
  const now=Date.now();
  st.multi.forEach(t=>{
    const c=$('htMC_'+t.id); if(c){ const e=c.querySelector('.tm'), x=mTxt(t, now); if(e && e.textContent!==x) e.textContent=x; if(t.done && !c.classList.contains('done')) mRender(); }
    const T=$('htMT_'+t.id); if(T){ const e=T.querySelector('.tm'), x=t.done ? 'できた！' : fmtDown(mLeft(t, now)); if(e.textContent!==x) e.textContent=x; const g=T.querySelector('.pg i'); if(g) g.style.width=(t.done ? 100 : Math.max(0, Math.min(100, 100-mLeft(t, now)/t.dur*100))).toFixed(1)+'%';
      const want=t.done ? (t.ack ? 'fin' : 'done') : t.p ? 'p' : 'run'; if(T.dataset.s!==want) mGrid(); }
  });
}
// 右下の 札（大きな タイマーが ないとき。いちばん 早く 終わる もの）
function mChip(){
  if(st && st.run) return;   // ふつうの タイマーの 札を 出す
  const open=$('hadeTimerOverlay') && isDlgOpen('hadeTimerOverlay');
  const L=st ? st.multi.filter(t=>!t.done && !t.p) : [];
  if(!st || open || mf || !mActive()){ hideChip(); return; }
  let c=$('htChip');
  if(!c){ c=document.createElement('button'); c.type='button'; c.id='htChip'; c.className='ht-chip'; c.title='ど派手タイマーを 開く'; c.onclick=()=>{ openHadeTimer(true); st.mode='multi'; save(); render(); mOpen(); }; document.body.appendChild(c); }
  const now=Date.now(), t=L.slice().sort((a,b)=>a.end-b.end)[0], dn=st.multi.filter(x=>x.done && !x.ack).length;
  const x='⏲ '+(dn ? '⏰ できた '+dn : t ? t.n+' '+fmtDown(t.end-now) : '⏸')+(st.multi.length>1 ? '（'+st.multi.length+'本）' : '');
  if(c.textContent!==x) c.textContent=x;
}
function mBan(text){ const b=$('htMFBan'); if(!b) return; b.textContent=text; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
// 画面いっぱいに 並べる
function mOpen(){
  if(stageOpen()) closeStage();
  if(!$('htMF')){
    const el=document.createElement('div'); el.className='ht-mf'; el.id='htMF'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','いっしょに 数える タイマー');
    el.innerHTML=`<canvas id="htMFCv"></canvas><div class="ht-mf-top"><b>⏲ 同時に</b><span id="htMFn"></span><button type="button" onclick="HADE_TIMER.mClose()">← 戻る</button></div><div class="ht-mf-grid" id="htMFG"></div><div class="ht-mf-ban" id="htMFBan" aria-live="polite"></div>`;
    document.body.appendChild(el);
    const cv=$('htMFCv'); mf={cv, e:new FX.Engine(cv)}; mf.e.setTheme(st.theme); mf.e.setLevel(st.level); mf.e.noFlash=!st.flash; mf.e.amb=0.4; mf.e.warp=0.2; mf.e.heat=0.35;
    mf.e.onBoom=()=>{ if(Math.random()<0.5) snd('boom'); };
    mfRel=typeof modalBack==='function' ? modalBack(()=>mClose(true)) : null;
    window.addEventListener('keydown', mKey, true); window.addEventListener('resize', mGrid);
    enterFs(); wake(); hideChip();
    mfTs=performance.now(); const step=ts=>{ mfRaf=0; if(!mf) return; const dt=Math.min(0.05, Math.max(0, (ts-mfTs)/1000)); mfTs=ts; mf.e.resize(); mf.e.step(dt); mf.e.drawBg(); mf.e.drawFx(); mfRaf=requestAnimationFrame(step); };
    mfRaf=requestAnimationFrame(step);
  }
  mStart(); mGrid();
}
function mClose(byBack){
  const el=$('htMF'); if(!el) return;
  el.remove(); if(mfRaf) cancelAnimationFrame(mfRaf); mfRaf=0; mf=null;
  window.removeEventListener('keydown', mKey, true); window.removeEventListener('resize', mGrid);
  if(!byBack && mfRel) mfRel(); mfRel=null;
  st.multi.forEach(t=>{ if(t.done) t.ack=true; }); st.multi=st.multi.filter(t=>!t.done); save(); mAlarmCheck();   // 見た できあがりは 片づける
  exitFs(); unwake(); mRender();
  if(!mActive()) mStop();
}
function mKey(e){
  if(!$('htMF')) return;
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); if(mAl.on){ st.multi.forEach(t=>{ if(t.done) t.ack=true; }); save(); mAlarmCheck(); mRender(); } else mClose(); }
}
function mGrid(){
  const g=$('htMFG'); if(!g) return;
  const now=Date.now(), L=st.multi, n=Math.max(1, L.length), land=innerWidth>innerHeight*1.1;
  const cols=n===1 ? 1 : land ? Math.min(3, n===4 ? 2 : Math.ceil(n/2)) : (n<=3 ? 1 : 2), rows=Math.ceil(n/cols);
  g.style.gridTemplateColumns='repeat('+cols+', 1fr)'; g.style.gridTemplateRows='repeat('+rows+', 1fr)';
  const W=(innerWidth-16)/cols, H=(innerHeight-70)/rows, fs=Math.max(24, Math.min(W/4.2, H*0.42));
  g.innerHTML=L.map(t=>{ const sd=t.done ? (t.ack ? 'fin' : 'done') : t.p ? 'p' : 'run';
    return `<div class="ht-mt ${sd}" id="htMT_${t.id}" data-s="${sd}" onclick="HADE_TIMER.mAck('${t.id}')"><div class="nm">${esc(t.n)}</div><div class="tm" style="font-size:${fs.toFixed(0)}px">${t.done ? 'できた！' : fmtDown(mLeft(t, now))}</div><div class="pg"><i></i></div>
      <div class="bt" onclick="event.stopPropagation()">${t.done ? (t.ack ? '' : `<button type="button" class="pri" onclick="HADE_TIMER.mAck('${t.id}')">✓ 止める</button>`) : `<button type="button" onclick="HADE_TIMER.mToggle('${t.id}')">${t.p ? '▶ 再開' : '⏸'}</button>`}<button type="button" onclick="HADE_TIMER.mPlus('${t.id}', 60)">＋1分</button><button type="button" onclick="HADE_TIMER.mDel('${t.id}')" aria-label="消す">✕</button></div></div>`; }).join('') || '<p class="ht-mf-none">タイマーが ありません</p>';
  const c=$('htMFn'); if(c) c.textContent=L.length ? L.length+'本' : '';
  mPaint();
}

/* ───────── 窓 ───────── */
const HT_CSS=`
#hadeTimerOverlay .ht-modal{ display:flex; flex-direction:column; }
.ht-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.ht-wrap{ max-width:760px; margin:0 auto; }
.ht-prev{ display:block; width:100%; height:min(44vw,230px); border-radius:18px; background:#05061a; cursor:pointer; box-shadow:0 6px 22px rgba(40,0,80,.35); }
.ht-modes{ display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin:10px 0 8px; }
@media (max-width:560px){ .ht-modes{ grid-template-columns:repeat(2,1fr); } }
.ht-al input{ min-height:42px; padding:0 10px; border-radius:12px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:20px; font-weight:bold; }
.ht-modes button{ min-height:48px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:var(--modal-bg,#fff); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; padding:0 4px; }
.ht-modes button.on{ background:linear-gradient(135deg,#ff2bd6,#7b2bff); border-color:transparent; color:#fff; }
.ht-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.ht-sec h4, .ht-sub h4{ margin:0 0 8px; font-size:15px; } .ht-sec h4 small, .ht-sub h4 small{ font-weight:normal; font-size:12px; color:var(--text-light,#666); margin-left:8px; }
.ht-sub{ margin-top:10px; }
.ht-nums{ display:flex; gap:8px; justify-content:center; }
.ht-num{ display:flex; flex-direction:column; align-items:center; gap:2px; flex:1; max-width:150px; }
.ht-num input{ width:100%; box-sizing:border-box; text-align:center; font-size:40px; font-weight:bold; padding:6px 4px; border-radius:14px; border:2px solid rgba(123,43,255,.45); background:var(--cell-bg,#fff); color:var(--text,#222); font-variant-numeric:tabular-nums; }
.ht-num.sm input{ font-size:30px; }
.ht-num span{ font-size:13px; font-weight:bold; color:var(--text-light,#666); }
.ht-chips{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; justify-content:center; }
.ht-chips button{ min-height:40px; padding:0 12px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:rgba(123,43,255,.07); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.ht-pres{ display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:6px; }
.ht-pre{ display:flex; align-items:stretch; border-radius:12px; border:1px solid rgba(200,150,30,.55); background:rgba(200,150,30,.09); overflow:hidden; }
.ht-pre.on{ border-color:#7b2bff; box-shadow:0 0 0 2px rgba(123,43,255,.35); }
.ht-pre button{ border:0; background:transparent; color:var(--text,#222); cursor:pointer; font:inherit; }
.ht-pre button:first-child{ flex:1; min-width:0; padding:6px 8px; text-align:left; min-height:48px; }
.ht-pre b{ display:block; font-size:14.5px; overflow-wrap:anywhere; } .ht-pre small{ font-size:12px; color:var(--text-light,#666); }
.ht-pre .x{ width:34px; font-size:14px; color:var(--text-light,#666); }
.ht-go{ display:block; width:100%; min-height:64px; margin:0 0 12px; border:0; border-radius:18px; background:linear-gradient(135deg,#ff2bd6,#ff8a3d 50%,#ffd23f); color:#fff; font-size:24px; font-weight:900; letter-spacing:.06em; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,.35); box-shadow:0 6px 18px rgba(255,43,214,.35); animation:htGlow 2.4s ease-in-out infinite; }
@keyframes htGlow{ 0%,100%{ box-shadow:0 6px 18px rgba(255,43,214,.35); } 50%{ box-shadow:0 6px 28px rgba(255,138,61,.6); } }
.ht-run{ display:flex; align-items:center; gap:8px; margin:0 0 10px; padding:10px 12px; border-radius:14px; background:linear-gradient(135deg,#2b0057,#7b2bff); color:#fff; }
.ht-run .t{ flex:1; font-size:22px; font-weight:bold; font-variant-numeric:tabular-nums; }
.ht-b{ min-height:42px; padding:0 12px; border-radius:12px; border:1px solid rgba(255,255,255,.55); background:transparent; color:inherit; font-size:15px; font-weight:bold; cursor:pointer; }
.ht-b.pri{ background:#fff; color:#4a00a8; border-color:#fff; }
.ht-looks{ display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:6px; margin:4px 0 8px; }
@media (max-width:400px){ .ht-looks:not(.sub){ grid-template-columns:repeat(3,minmax(0,1fr)); } }   /* 見せ方 5つ（v589）：せまい 画面は 3つずつ */
.ht-looks.sub{ grid-template-columns:repeat(3,minmax(0,1fr)); }
.ht-looks button{ word-break:keep-all; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; min-height:64px; padding:6px 3px; border-radius:14px; border:1px solid rgba(120,132,156,.45); background:var(--modal-bg,#fff); color:var(--text,#222); font-size:13px; font-weight:bold; line-height:1.25; cursor:pointer; overflow-wrap:anywhere; }
.ht-looks.sub button{ min-height:56px; }
.ht-looks button .i{ font-size:25px; line-height:1; }
.ht-looks button.on{ background:linear-gradient(135deg,#ff2bd6,#7b2bff); border-color:transparent; color:#fff; box-shadow:0 3px 12px rgba(123,43,255,.35); }
.ht-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:6px 0; } .ht-opt span{ min-width:5.4em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.ht-opt button{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.ht-opt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.ht-opt button.th:not(.on){ color:#fff; border-color:transparent; text-shadow:0 1px 2px rgba(0,0,0,.6); }
.ht-opt button.th-hanabi:not(.on){ background:linear-gradient(135deg,#03061a,#2b1b4c); } .ht-opt button.th-uchu:not(.on){ background:linear-gradient(135deg,#02030c,#2a1a6e); }
.ht-opt button.th-neon:not(.on){ background:linear-gradient(135deg,#24004a,#ff2bd6); } .ht-opt button.th-matsuri:not(.on){ background:linear-gradient(135deg,#2a0b25,#a3121b); }
.ht-opt button.lv-ultra:not(.on){ background:linear-gradient(135deg,#fff3c4,#ffb000); border-color:#e08a00; color:#5a2a00; font-weight:bold; }
.ht-opt button.lv-mega:not(.on){ background:linear-gradient(90deg,#ff3b6b,#ffb000,#3ee8ff,#c77dff,#ff3b6b); background-size:300% 100%; animation:htRain 2.4s linear infinite; border-color:transparent; color:#fff; font-weight:900; text-shadow:0 1px 2px rgba(0,0,0,.7); }
.ht-opt button.th-honoo:not(.on){ background:linear-gradient(135deg,#1a0300,#ff4500); } .ht-opt button.th-yume:not(.on){ background:linear-gradient(135deg,#b04f8a,#6a54c8); }
.ht-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; } .ht-note.big{ font-size:14px; }
.ht-full{ position:fixed; inset:0; z-index:99990; background:#000; overflow:hidden; touch-action:manipulation; user-select:none; -webkit-user-select:none; }
/* 📋 進行表（v598） */
.ht-prog{ margin:0 0 4px; }
.ht-pr{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:0 0 8px; padding:0 0 8px; border-bottom:1px solid rgba(120,132,156,.18); }
.ht-pr input.n{ flex:1 1 calc(100% - 2.2em) !important; } .ht-pr input.m{ margin-left:auto; }   /* 名前は 1行目いっぱい・時間と ボタンは 2行目 */ .ht-pr b{ flex:none; min-width:1.5em; text-align:center; font-size:14px; color:#7b2bff; }
.ht-pr input{ min-width:0; height:42px; padding:0 8px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; }
.ht-pr input.n{ flex:1; } .ht-pr input.m, .ht-pr input.s{ flex:none; width:3.4em; text-align:center; font-variant-numeric:tabular-nums; } .ht-pr span{ flex:none; font-size:12.5px; color:var(--text-light,#666); }
.ht-pr button{ flex:none; width:38px; height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; } .ht-pr button:disabled{ opacity:.35; }
/* ⏲ 同時に（v598） */
.ht-mc{ display:flex; align-items:center; gap:8px; margin:0 0 6px; padding:8px 10px; border-radius:14px; background:linear-gradient(135deg,#2b0057,#7b2bff); color:#fff; }
.ht-mc .t{ flex:1; min-width:0; display:flex; flex-direction:column; } .ht-mc .t b{ font-size:14px; overflow-wrap:anywhere; } .ht-mc .tm{ font-size:28px; font-weight:900; font-variant-numeric:tabular-nums; line-height:1.15; }
.ht-mc .bt{ display:flex; gap:5px; flex:none; } .ht-mc .ht-b{ min-height:40px; padding:0 9px; font-size:14px; }
.ht-mc.p{ opacity:.78; } .ht-mc.done{ background:linear-gradient(135deg,#ff2bd6,#ff8a3d); animation:htMBlink .6s steps(2) infinite; }
@keyframes htMBlink{ 0%{ filter:brightness(1.25); } 100%{ filter:brightness(.9); } }
.ht-madd{ display:flex; flex-wrap:wrap; align-items:flex-end; gap:8px; margin:8px 0 0; padding:8px; border-radius:12px; border:1px dashed rgba(120,132,156,.5); }
.ht-madd .ht-in{ flex:1 1 100%; min-height:44px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; }
.ht-madd .ht-nums{ flex:1 1 auto; } .ht-madd .ht-b.pri{ flex:1 1 auto; min-height:52px; background:linear-gradient(135deg,#7b2bff,#ff2bd6); color:#fff; border:0; font-size:16px; }
.ht-mf{ position:fixed; inset:0; z-index:99990; background:#05061a; overflow:hidden; color:#fff; touch-action:manipulation; user-select:none; -webkit-user-select:none; }
.ht-mf canvas{ position:absolute; inset:0; width:100%; height:100%; }
.ht-mf-top{ position:absolute; left:0; right:0; top:calc(6px + var(--safe-top,0px)); display:flex; align-items:center; gap:10px; padding:0 10px; height:46px; z-index:2; }
.ht-mf-top b{ font-size:18px; } .ht-mf-top span{ flex:1; font-size:13px; opacity:.8; }
.ht-mf-top button{ min-height:42px; padding:0 14px; border-radius:21px; border:1.5px solid rgba(255,255,255,.7); background:rgba(0,0,0,.4); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; }
.ht-mf-grid{ position:absolute; left:8px; right:8px; top:calc(58px + var(--safe-top,0px)); bottom:calc(8px + var(--safe-bottom,0px)); display:grid; gap:8px; z-index:1; }
.ht-mt{ position:relative; min-width:0; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; padding:8px; border-radius:18px; background:rgba(8,6,30,.62); border:2px solid rgba(124,240,255,.55); box-shadow:0 0 22px rgba(124,240,255,.18) inset; overflow:hidden; }
.ht-mt .nm{ font-size:clamp(15px,3.2vmin,26px); font-weight:bold; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ht-mt .tm{ font-weight:900; line-height:1.05; font-variant-numeric:tabular-nums; white-space:nowrap; text-shadow:0 0 18px rgba(124,240,255,.55); }
.ht-mt .pg{ width:86%; height:8px; border-radius:4px; background:rgba(255,255,255,.15); overflow:hidden; } .ht-mt .pg i{ display:block; height:100%; width:0; border-radius:4px; background:linear-gradient(90deg,#7cf0ff,#ff2bd6); }
.ht-mt .bt{ display:flex; gap:6px; margin-top:4px; } .ht-mt .bt button{ min-height:40px; min-width:52px; padding:0 10px; border-radius:20px; border:1.5px solid rgba(255,255,255,.6); background:rgba(0,0,0,.35); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; }
.ht-mt .bt button.pri{ background:#fff; color:#b0006e; border-color:#fff; }
.ht-mt.p{ opacity:.7; border-color:rgba(255,255,255,.35); } .ht-mt.p .tm{ text-shadow:none; }
.ht-mt.done{ border-color:#ffd23f; background:linear-gradient(135deg,rgba(255,43,214,.75),rgba(255,138,61,.75)); animation:htMBlink .5s steps(2) infinite; cursor:pointer; } .ht-mt.done .tm{ color:#fff36b; text-shadow:0 0 24px #ffb000; }
.ht-mt.fin{ opacity:.5; }
.ht-mf-ban{ position:absolute; left:4%; right:4%; top:38%; z-index:3; text-align:center; font-weight:900; font-size:clamp(28px,9vw,80px); line-height:1.1; pointer-events:none; opacity:0; color:#fff36b; text-shadow:0 0 18px #ff2bd6, 0 4px 2px rgba(0,0,0,.6); white-space:nowrap; }
.ht-mf-ban.go{ animation:htBan 2.2s cubic-bezier(.2,.9,.3,1.2) forwards; }
.ht-mf-none{ grid-column:1/-1; align-self:center; text-align:center; font-size:18px; opacity:.8; }
.ht-full canvas{ position:absolute; inset:0; width:100%; height:100%; display:block; }
.ht-top{ position:absolute; left:0; right:0; top:calc(8px + var(--safe-top,0px)); display:flex; flex-direction:column; align-items:center; gap:2px; pointer-events:none; color:#fff; text-shadow:0 2px 6px rgba(0,0,0,.8); }
.ht-top #htLab{ font-size:clamp(16px,4.6vw,26px); font-weight:bold; } .ht-top #htSub{ font-size:clamp(13px,3.6vw,20px); font-weight:bold; opacity:.92; }
.ht-full.lk .ht-top span:not(:empty){ background:rgba(0,0,0,.42); padding:1px 12px; border-radius:12px; opacity:1; }
.ht-ban{ position:absolute; left:4%; right:4%; top:16%; white-space:nowrap; text-align:center; font-weight:900; font-size:clamp(30px,10vw,86px); line-height:1.1; color:#fff; pointer-events:none; opacity:0;
  background:linear-gradient(90deg,#fff36b,#ff8a3d,#ff2bd6,#7cf0ff,#fff36b); background-size:300% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 10px rgba(255,255,255,.55)) drop-shadow(0 4px 2px rgba(0,0,0,.6)); }
.ht-ban.s{ font-size:clamp(24px,7.5vw,60px); }
.ht-ban .ht-emo{ -webkit-text-fill-color:initial; }
.ht-ban.go{ animation:htBan 1.9s cubic-bezier(.2,.9,.3,1.2) forwards, htRain 1.2s linear infinite; }
.ht-ban.big.go{ top:12%; animation:htBig 4.2s cubic-bezier(.2,.9,.3,1.2) forwards, htRain .9s linear infinite; }
@keyframes htBan{ 0%{ opacity:0; transform:scale(.2) rotate(-6deg); } 14%{ opacity:1; transform:scale(1.25) rotate(3deg); } 24%{ transform:scale(1) rotate(0); } 80%{ opacity:1; transform:scale(1); } 100%{ opacity:0; transform:translateY(-24px) scale(.96); } }
@keyframes htBig{ 0%{ opacity:0; transform:scale(.1) rotate(-12deg); } 10%{ opacity:1; transform:scale(1.35) rotate(5deg); } 18%{ transform:scale(.92) rotate(-2deg); } 26%{ transform:scale(1.06); } 34%{ transform:scale(1); } 50%{ transform:scale(1.08); } 66%{ transform:scale(1); } 90%{ opacity:1; } 100%{ opacity:0; transform:translateY(-30px); } }
@keyframes htRain{ 0%{ background-position:0% 50%; } 100%{ background-position:300% 50%; } }
.ht-laps{ position:absolute; left:10px; bottom:var(--ht-bar,84px); display:flex; flex-direction:column; gap:3px; pointer-events:none; color:#fff; font-variant-numeric:tabular-nums; text-shadow:0 1px 4px rgba(0,0,0,.9); }
.ht-laps div{ display:flex; gap:8px; align-items:baseline; font-size:15px; background:rgba(0,0,0,.35); padding:2px 10px; border-radius:10px; }
.ht-laps div.best{ color:#7dff9a; } .ht-laps div.worst{ color:#ff8f8f; } .ht-laps small{ opacity:.7; font-size:12px; }
.ht-stop{ position:absolute; left:50%; bottom:calc(var(--ht-bar,84px) + 12px); transform:translateX(-50%); min-width:220px; min-height:72px; border:0; border-radius:36px; background:linear-gradient(135deg,#ffffff,#ffe9a8); color:#7a2b00; font-size:28px; font-weight:900; cursor:pointer; box-shadow:0 0 0 6px rgba(255,255,255,.25), 0 8px 30px rgba(255,200,80,.6); animation:htPulse 1s ease-in-out infinite; }
.ht-stop[hidden]{ display:none; }
@keyframes htPulse{ 0%,100%{ transform:translateX(-50%) scale(1); } 50%{ transform:translateX(-50%) scale(1.08); } }
.ht-bar{ position:absolute; left:0; right:0; bottom:0; display:flex; gap:6px; padding:8px 10px calc(10px + var(--safe-bottom,0px)); justify-content:center; flex-wrap:wrap; background:linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,0)); transition:opacity .3s, transform .3s; }
.ht-full.bar-hide .ht-bar{ opacity:0; transform:translateY(26px); pointer-events:none; }   /* 下の ボタンを 隠す（v588） */
.ht-full.bar-hide{ --ht-bar:calc(14px + var(--safe-bottom,0px)) !important; }
.ht-more{ position:absolute; right:10px; top:calc(8px + var(--safe-top,0px)); z-index:3; width:46px; height:46px; border-radius:23px; border:1.5px solid rgba(255,255,255,.6); background:rgba(0,0,0,.4); color:#fff; font-size:21px; cursor:pointer; opacity:0; pointer-events:none; transition:opacity .3s; }
.ht-full.bar-hide .ht-more{ opacity:.75; pointer-events:auto; }
.ht-bar button{ flex:1 1 auto; max-width:180px; min-height:50px; padding:0 10px; border-radius:14px; border:1.5px solid rgba(255,255,255,.75); background:rgba(0,0,0,.35); color:#fff; font-size:16px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.ht-bar button.pri{ background:#fff; color:#3a0070; border-color:#fff; }
.ht-chip{ position:fixed; right:10px; top:calc(52px + var(--safe-top,0px)); z-index:99980; min-height:44px; padding:0 16px; border-radius:22px; border:0; background:linear-gradient(135deg,#7b2bff,#ff2bd6); color:#fff; font-size:17px; font-weight:bold; font-variant-numeric:tabular-nums; box-shadow:0 4px 16px rgba(123,43,255,.5); cursor:pointer; }
@media (prefers-reduced-motion: reduce){ .ht-go, .ht-stop{ animation:none; } }
`;
function ensureDom(){
  if($('hadeTimerOverlay')) return;
  const stl=document.createElement('style'); stl.id='htStyle'; stl.textContent=HT_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="hadeTimerOverlay">
  <div class="modal vol-modal ht-modal modal-full" style="position:relative">
    <div class="modal-header"><span>⏱ ど派手タイマー</span><button class="modal-close" onclick="closeHadeTimer()" aria-label="閉じる">✕</button></div>
    <div class="ht-body" id="htBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  $('hadeTimerOverlay').addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('resize', onResize);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){
  closeStage(); pv=null;
  if(st && st.run){ startTicker(); paintChip(); }
  else mChip();   // ⏲ 同時に（v598）
}
function openHadeTimer(fromRun){
  ensureDom();
  if(!st || fromRun!==true){ load(); if(mActive()) mStart(); }
  openDlg('hadeTimerOverlay', cleanup);
  render(); hideChip();
  const r=st.run;
  if(r && fromRun!==true){
    if(isOver(r, Date.now())) finish();
    else if(!r.p && !r.done) openStage();
  }
}
function closeHadeTimer(){ if(!$('hadeTimerOverlay') || !isDlgOpen('hadeTimerOverlay')) return; closeDlg('hadeTimerOverlay', cleanup); }

window.HADE_TIMER={ mode:setMode, opt:setOpt, set:setSec, add:addSec, typed, ivTyped, ivSet, usePre, addPre:n=>addPre(n), delPre:i=>{ delPre(i); },
  prog, progAdd, progDel, progMove, progSample,   // 📋 進行表（v598）
  mAdd, mAddForm, mAddPre, mToggle, mPlus, mDel, mAck, mOpen, mClose:()=>mClose(), mTick, mOn:()=>!!$('htMF'), mAlarm:()=>mAl.on,   // ⏲ 同時に（v598）
  mList:()=>st.multi.map(t=>t.n+':'+(t.done ? (t.ack ? 'fin' : 'done') : t.p ? 'p' : 'run')+':'+Math.ceil(mLeft(t, Date.now())/1000)),
  mShift:ms=>{ st.multi.forEach(t=>{ if(!t.p && !t.done) t.end-=ms; }); save(); },
  start, pause, resume, toggle:togglePause, plus, restart, stop, back, lap, next, stopAlarm:()=>stopAlarm(), show, clock:setClock, showNow, bar:()=>barShow(),
  said:()=>said.slice(),   // 🗣 読んだ 言葉（v593）
  barHidden, fs:()=>fsOn, clockView:()=>{ const v=clockView(Date.now()); return {str:v.str, sec:v.sec, ap:v.ap, date:v.date}; }, alarmDue:()=>alarmDue(st.run, Date.now()),
  state:()=>JSON.parse(JSON.stringify(st)), view:()=>{ const v=viewOf(st.run, Date.now()); return {str:v.str, frac:+v.frac.toFixed(4), sec:v.sec, ph:v.ph ? v.ph.ph+':'+v.ph.round : ''}; },
  stage:stageOpen, alarm:()=>alarmOn, chip:()=>{ const c=$('htChip'); return c ? c.textContent : ''; }, fx:()=>({n:sc ? sc.e.count() : 0, prev:pv ? pv.e.count() : 0, played:FX.played(), cap:sc ? sc.e.cap : 0, level:sc ? sc.e.level : '', light:sc ? !!sc.e.lightBg : false, plight:pv ? !!pv.e.lightBg : false}),
  banner:()=>{ const b=$('htBan'); return b ? b.textContent : ''; }, label:()=>[($('htLab')||{}).textContent||'', ($('htSub')||{}).textContent||''].join('|'),
  freeze:b=>{ frozen=!!b; }, tick, shows:()=>({n:shows.n, last:shows.last, multi:shows.multi}), sound:()=>({set:st.sset==='rand' ? setNow : st.sset, tone:toneNow, tickN}),
  look:()=>LOOK && sc && sc.lk ? LOOK.info(sc.lk) : null, prevLook:()=>LOOK && pv && pv.lk ? LOOK.info(pv.lk) : null,
  // 🕐 時計の 並べ方（v591）：kind（s 縦に 積む・v 下に 秒・h 右に 秒・r 1行）・str（行を「|」で。光の輪 の 秒なしは ◯）
  clockLay:(p)=>{ const o=p ? pv : sc; if(!o) return null; const k=lookKind(); if(k==='ring') return o.crow||null; const L=o.lk; if(!L || !L.plan) return null;
    return {kind:L.plan, str:k==='poyo' && window.HADE_POYO ? window.HADE_POYO.info(L).str : L.str||''}; },
  prevAt:sec=>{ if(pv) pv.t0=pv.e.t-(+sec||0); },   // 見本の 時間を 進める（たしかめ用）
  poyo:()=>window.HADE_POYO && sc && sc.lk && lookKind()==='poyo' ? window.HADE_POYO.info(sc.lk) : null,   // 🫧 ぽよん（v589。たしかめ用）
  shift:ms=>{ const r=st.run; if(!r) return; ms=+ms||0; if(r.m==='down'){ if(r.p) r.left-=ms; else r.end-=ms; } else if(r.p) r.acc+=ms; else r.s0-=ms; save(); } };   // 時計を 進める（たしかめ用）
Object.assign(window, { openHadeTimer:()=>openHadeTimer(), closeHadeTimer });
})();
