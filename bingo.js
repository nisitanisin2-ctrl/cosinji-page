/* 🎱 ビンゴ（v587。表電卓の道具。apps/bingo/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   ・🎱 抽選：六角の 抽選器（ガラガラ）が まわって 中の 玉が ガラガラ 転がり、止まると 出口から 1つ 出て レールを コロコロ。
     受け皿で 止まったら 大きな 玉で「B の 12」と 出して 読み上げる。まわして いる あいだに もう一度 押すと すぐ 出る。
     出る 数は 端末の 乱数（crypto.getRandomValues）で かたよりなく 先に 決める。答えは 玉が 止まるまで 出さない。
   ・出た 数が わかる：1〜75 の 表（B・I・N・G・O の 列。出た 数に 色、いま 出た 数は 光る）・出た 順・○こ目／のこり。
     表の 数を 押すと 手で 入れられる（ほかの 抽選器を 使う とき）。↶ 1つ もどす・🔄 はじめから・📋 コピー。
   ・⛶ 大きく：テレビや プロジェクターに 映す ための 大きな 画面（抽選器・玉・表 だけ。横向きなら 左右に 並ぶ）。
   ・⚙ 設定：数の はんい（1〜75 BINGO・1〜90・1〜50・1〜30・自分で 2〜99）・演出の 長さ・音・読み上げ・表を 押した ときの 入れ方。
   ・🃏 カード：5×5（まん中は FREE）。読まれた 数を 押して 穴を あける。リーチ・ビンゴで お知らせ。
     カードは「組の コード」と「番号」で 決まる（同じなら いつも 同じ 並び）。🖨 A4 に 4枚ずつ 印刷・🔢 番号で 作る・
     🔎 たしかめ（番号を 入れると 出た 数で ビンゴか わかる）。
   ・音は WebAudio で その場で 作る（ファイルは 使わない）。読み上げは 設定の「🔈 読み上げの声」と 同じ 声。
   ・中身は excalc_bingo（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_bingo', TAU=Math.PI*2, LET='BINGO', LET_YOMI=['ビー','アイ','エヌ','ジー','オー'], MAXNO=9999, MAXP=200;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const int=(v,lo,hi,d)=>{ const n=Math.round(parseFloat(String(v==null?'':v).normalize('NFKC').replace(/[,\s]/g,''))); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const noAnim=()=>!!window.BINGO_NO_ANIM || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const ask=(m,y)=>typeof appConfirm==='function' ? appConfirm(m, y||'はい', 'やめる') : Promise.resolve(window.confirm(m));
const vib=p=>{ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(_){} };
// 玉の 色（B 青・I 赤・N 紫・G 緑・O だいだい）：b ふつう・d こい・l うすい
const COL=[{b:'#1e88e5',d:'#0b3d91',l:'#bbdefb'},{b:'#e53935',d:'#8e1414',l:'#ffcdd2'},{b:'#8e24aa',d:'#4a0f72',l:'#e1bee7'},{b:'#2e9d4a',d:'#145a27',l:'#c8e6c9'},{b:'#ef6c00',d:'#9a3f00',l:'#ffe0b2'}];
const RANGES=[[75,'1〜75（BINGO）'],[90,'1〜90'],[50,'1〜50'],[30,'1〜30']];
const SPEEDS=[['fast','⚡ はやい',1.0,2.2],['norm','🎱 ふつう',1.9,1.25],['slow','🐢 じっくり',3.6,0.9]];   // 名前・まわす 秒・転がる 速さ
const spOf=k=>SPEEDS.find(s=>s[0]===k)||SPEEDS[1];

/* ───────── 乱数（かたよりなく） ───────── */
function rnd(n){
  if(n<=1) return 0;
  const a=new Uint32Array(1), lim=Math.floor(0x100000000/n)*n;
  let x; do{ crypto.getRandomValues(a); x=a[0]; }while(x>=lim);
  return x%n;
}

/* ───────── 状態 ───────── */
let st=null, busy=null, pop=null, showRel=null;   // busy：まわして いる 玉 {n}（答えは 止まるまで 出さない）
const CA='ACEFHJKLMNPRTUWXY345679';   // 組の コードに 使う 字（見まちがえ やすい 字は 使わない）
function newCode(){ let s=''; for(let i=0;i<4;i++) s+=CA[rnd(CA.length)]; return s; }
function okCode(v){ const s=String(v==null?'':v).normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g,''); return s.length>=1 && s.length<=8 ? s : ''; }
function defaults(){ const code=newCode(); return {v:1, max:75, speed:'norm', sound:true, voice:true, quick:false, drawn:[], code, card:{code, no:1+rnd(999), marks:[]}, tab:'draw', printN:20, printFrom:1}; }
function cleanCard(c, dflt){
  if(!c || typeof c!=='object') return dflt;
  const code=okCode(c.code), no=int(c.no,1,MAXNO,0); if(!code || !no) return dflt;
  const on=new Set(cardNums(code,no));
  return {code, no, marks:[...new Set((Array.isArray(c.marks) ? c.marks : []).map(x=>Math.round(+x)).filter(n=>n>0 && on.has(n)))]};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const d=defaults(), max=int(o.max,2,99,75), seen=new Set();
  const drawn=(Array.isArray(o.drawn) ? o.drawn : []).map(x=>Math.round(+x)).filter(n=>Number.isInteger(n) && n>=1 && n<=max && !seen.has(n) && seen.add(n));
  st={v:1, max, speed:spOf(o.speed)[0], sound:o.sound!==false, voice:o.voice!==false, quick:o.quick===true, drawn,
    code:okCode(o.code)||d.code, card:cleanCard(o.card, d.card), tab:o.tab==='card' ? 'card' : 'draw',
    printN:int(o.printN,1,MAXP,20), printFrom:int(o.printFrom,1,MAXNO,1)};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); return false; } }
// 数の 組（色）：1〜75 は B I N G O の 15こずつ。ほかは 5つに 分ける
function grp(n){ return st.max===75 ? Math.min(4, Math.floor((n-1)/15)) : Math.min(4, Math.floor((n-1)/Math.ceil(st.max/5))); }
const letterOf=n=>st.max===75 ? LET[grp(n)] : '';
const callText=n=>st.max===75 ? LET[grp(n)]+' の '+n : String(n);
const yomiText=n=>st.max===75 ? LET_YOMI[grp(n)]+' の '+n : String(n);
const call75=n=>LET[Math.min(4, Math.floor((n-1)/15))]+' の '+n;
// まだ 出て いない 数（まわして いる 玉も のぞく）
function remaining(){ const d=new Set(st.drawn); if(busy) d.add(busy.n); const r=[]; for(let i=1;i<=st.max;i++) if(!d.has(i)) r.push(i); return r; }

/* ───────── 🃏 カード（組の コードと 番号で いつも 同じ 並び）───────── */
function hash32(s){ let h=2166136261>>>0; for(const ch of String(s)){ h^=ch.codePointAt(0); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
function prng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
// 左上から 横に 25こ。まん中は 0（FREE）。列ごとに B 1〜15・I 16〜30・N 31〜45・G 46〜60・O 61〜75 から 5つ
function cardNums(code, no){
  const r=prng(hash32('bingo:'+code+':'+no)), cols=[];
  for(let c=0;c<5;c++){
    const a=[]; for(let i=1;i<=15;i++) a.push(c*15+i);
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
    cols.push(a.slice(0,5));
  }
  const out=[]; for(let y=0;y<5;y++) for(let c=0;c<5;c++) out.push(y===2 && c===2 ? 0 : cols[c][y]);
  return out;
}
const LINES=(()=>{ const L=[], f=[0,1,2,3,4]; f.forEach(y=>L.push(f.map(c=>y*5+c))); f.forEach(c=>L.push(f.map(y=>y*5+c))); L.push(f.map(i=>i*6)); L.push(f.map(i=>(i+1)*4)); return L; })();
const lineName=i=>i<5 ? 'よこ '+(i+1)+'行め' : i<10 ? 'たて '+LET[i-5]+' の 列' : 'ななめ';
// has(n)：その 数が あいて いるか。bingo：そろった 列・need：リーチの あと 1つ・best：そろって いない 列で いちばん 多い あき
function judge(nums, has){
  const ok=nums.map(n=>n===0 || has(n)), bingo=[], need=new Set(), win=new Set(); let best=0;
  LINES.forEach((L,i)=>{ const k=L.filter(j=>ok[j]).length;
    if(k===5){ bingo.push(i); L.forEach(j=>win.add(j)); } else { best=Math.max(best, k); if(k===4) need.add(nums[L.find(j=>!ok[j])]); } });
  return {ok, bingo, need:[...need].sort((a,b)=>a-b), best, win};
}
function judgeText(J){
  if(J.bingo.length) return '🎉 ビンゴ！（'+J.bingo.map(lineName).join('・')+'）';
  if(J.need.length) return 'リーチ！ あと 1つ：'+J.need.map(call75).join('・');
  return 'あと '+Math.max(1, 4-J.best)+'つで リーチ';
}

/* ───────── 音（WebAudio。押した ときに 用意する）───────── */
let AC=null, OUT=null, NB=null, RUM=null, lastClack=0;
const played=[];   // 鳴らした 音（たしかめ用。音を 出さない 設定でも 残す）
function note(n){ played.push(n); if(played.length>300) played.shift(); }
function ac(){
  if(!st || !st.sound) return null;
  if(!AC){
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
    try{ AC=new C(); OUT=AC.createGain(); OUT.gain.value=0.75; OUT.connect(AC.destination); }catch(_){ AC=null; return null; }
  }
  if(AC.state==='suspended'){ try{ AC.resume(); }catch(_){} }
  return AC;
}
function noiseBuf(a){ if(NB) return NB; const n=Math.floor(a.sampleRate*0.6), b=a.createBuffer(1,n,a.sampleRate), ch=b.getChannelData(0); for(let i=0;i<n;i++) ch[i]=Math.random()*2-1; return (NB=b); }
function env(g,t,a,d,p){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002,p),t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
function osc(type,f,t,d,p,f2){
  const a=ac(); if(!a) return;
  try{ const o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+d);
    env(g,t,0.006,d,p); o.connect(g); g.connect(OUT); o.start(t); o.stop(t+d+0.05); }catch(_){}
}
function nz(t,d,p,type,f,q){
  const a=ac(); if(!a) return;
  try{ const s=a.createBufferSource(); s.buffer=noiseBuf(a); s.loop=true; const fl=a.createBiquadFilter(); fl.type=type||'bandpass'; fl.frequency.value=f||2000; fl.Q.value=q||1;
    const g=a.createGain(); env(g,t,0.003,d,p); s.connect(fl); fl.connect(g); g.connect(OUT); s.start(t, Math.random()*0.3); s.stop(t+d+0.05); }catch(_){}
}
const midi=m=>440*Math.pow(2,(m-69)/12);
const S=(name, fn)=>(...x)=>{ note(name); const a=ac(); if(!a) return; fn(a.currentTime+0.005, ...x); };
const SND={
  clack:S('clack', (t,v)=>nz(t, 0.018+Math.random()*0.02, Math.min(0.22, 0.04+v/2400*0.2), 'bandpass', 1700+Math.random()*2800, 3.5)),   // 玉が 当たる カラッ
  ratchet:S('ratchet', t=>{ nz(t, 0.012, 0.06, 'bandpass', 3400, 6); osc('square', 1900, t, 0.01, 0.012); }),   // ハンドルの カチッ
  pon:S('pon', t=>{ osc('sine', 560, t, 0.1, 0.32, 240); nz(t, 0.02, 0.12, 'highpass', 3000); }),   // 出口から ポトッ
  koto:S('koto', t=>{ osc('triangle', 320, t, 0.07, 0.24, 170); nz(t, 0.03, 0.12, 'bandpass', 900, 3); }),   // レールに コトン
  roll:S('roll', (t,v)=>{ const k=Math.min(1, Math.abs(v)/320); nz(t, 0.02, 0.03+0.09*k, 'bandpass', 650+Math.random()*450, 5); osc('sine', 150, t, 0.035, 0.03+0.05*k); }),   // コロコロ
  kachi:S('kachi', (t,v)=>{ const k=Math.min(1, Math.abs(v)/300); osc('triangle', 1250, t, 0.08, 0.08+0.16*k); osc('sine', 2600, t, 0.05, 0.03+0.05*k); }),   // 止め板に カチン
  chime:S('chime', t=>{ [84,88,91,96].forEach((m,i)=>{ osc('sine', midi(m), t+i*0.07, 0.9, 0.16); osc('triangle', midi(m+12), t+i*0.07, 0.25, 0.03); }); nz(t+0.28, 0.4, 0.05, 'highpass', 6000); }),   // 出た！
  tap:S('tap', t=>osc('triangle', 880, t, 0.09, 0.22, 1320)),
  untap:S('untap', t=>osc('triangle', 700, t, 0.08, 0.16, 470)),
  reach:S('reach', t=>{ [[67,71,74],[69,72,77]].forEach((ch,j)=>ch.forEach(m=>{ osc('square', midi(m), t+j*0.16, 0.14+j*0.25, 0.06); osc('triangle', midi(m), t+j*0.16, 0.2+j*0.3, 0.1); })); }),
  fanfare:S('fanfare', t=>{
    const q=0.12, seq=[[67,0,1],[67,1,1],[67,2,1],[72,3,3],[64,6,1],[67,7,1],[72,8,6]];
    seq.forEach(([m,at,len])=>{ osc('square', midi(m), t+at*q, len*q, 0.1); osc('triangle', midi(m), t+at*q, len*q+0.05, 0.2); });
    [60,64,67,72].forEach(m=>osc('triangle', midi(m), t+8*q, 1.1, 0.12)); nz(t+8*q, 0.5, 0.16, 'highpass', 5000);
  }),
};
function clack(v){ const t=performance.now(); if(t-lastClack<35) return; lastClack=t; SND.clack(v); }
// まわって いる あいだの ゴロゴロ（速さで 大きさが かわる）
function rumbleSet(om){
  const a=(st && st.sound) ? AC : null; if(!a) return;
  try{
    if(!RUM && om>0.05){ const s=a.createBufferSource(); s.buffer=noiseBuf(a); s.loop=true; const fl=a.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=260;
      const g=a.createGain(); g.gain.value=0.0001; s.connect(fl); fl.connect(g); g.connect(OUT); s.start(); RUM={s, g}; note('rumble'); }
    if(RUM) RUM.g.gain.setTargetAtTime(Math.min(0.2, Math.abs(om)*0.02), a.currentTime, 0.08);
  }catch(_){}
}
function rumbleOff(){ const r=RUM; RUM=null; if(!r || !AC) return; try{ r.g.gain.setTargetAtTime(0.0001, AC.currentTime, 0.06); setTimeout(()=>{ try{ r.s.stop(); r.s.disconnect(); r.g.disconnect(); }catch(_){} }, 400); }catch(_){} }

/* ───────── 読み上げ ───────── */
let lastSaid='', voicePrimed=false;
function primeVoice(){   // iPhone などは 押した ときに 1回 読ませて おかないと あとで 読めない
  if(voicePrimed || !st || !st.voice || !('speechSynthesis' in window)) return;
  voicePrimed=true; try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); }catch(_){}
}
function say(text, force){
  lastSaid=text;
  if(!st || (!st.voice && !force) || !('speechSynthesis' in window)) return;
  try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='ja-JP'; u.rate=0.95; if(window.HyoVoice) HyoVoice.apply(u, {lang:'ja'}); speechSynthesis.speak(u); }catch(_){}
}
function sayAgain(){ const n=st && st.drawn[st.drawn.length-1]; if(n==null || busy) return; say(yomiText(n), true); }

/* ───────── 🎡 抽選器（canvas）─────────
   この 大きさ（VW×VH）で 描いて、画面に 合わせて 大きく・小さく する。玉は 1つずつ 動きを 計算する（重さ・壁・玉どうし）。
   六角の 箱が まわると 壁が 玉を 持ち上げて ガラガラ 落ちる。止まると 出口（0番の 辺の まん中）が 真下に 来て、玉が 1つ 出る。 */
const VW=420, VH=300, CX=165, CY=124, HR=100, AP=HR*Math.cos(Math.PI/6), BR=11, GV=1100, MAXB=26, FLOOR=288;
const TH_HOLE=Math.PI/3;                        // 出口が 真下に 来る 角度
const R0={x:146, y:238}, R1={x:400, y:270};     // レールの 上の 面（左上 → 右下）
const RU=(()=>{ const dx=R1.x-R0.x, dy=R1.y-R0.y, L=Math.hypot(dx,dy); return {x:dx/L, y:dy/L, L}; })();
const RN={x:RU.y, y:-RU.x};                     // レールの 上むき
const RAIL_END=RU.L-BR-6;                       // 止め板の 手前（受け皿）
const pathPt=s=>({x:R0.x+RU.x*s+RN.x*BR, y:R0.y+RU.y*s+RN.y*BR});
const M={cv:null, g:null, k:1, ox:0, oy:0, balls:[], th:TH_HOLE, om:0, ph:'idle', t:0, plan:null, out:null, parts:[], raf:0, last:0, calm:0, glow:0, onDone:null, tick:0, spr:{}};

function hexPts(th){ const p=[]; for(let k=0;k<6;k++){ const a=th+k*Math.PI/3; p.push([CX+HR*Math.cos(a), CY+HR*Math.sin(a)]); } return p; }
function inHex(x, y, m){ for(let k=0;k<6;k++){ const a=M.th+k*Math.PI/3+Math.PI/6; if(AP-((x-CX)*Math.cos(a)+(y-CY)*Math.sin(a))<m) return false; } return true; }
function newBall(n){
  for(let i=0;i<40;i++){
    const x=CX+(Math.random()*2-1)*(AP-BR-8), y=CY-AP+BR+8+Math.random()*60;
    if(inHex(x, y, BR+2) && M.balls.every(b=>(b.x-x)*(b.x-x)+(b.y-y)*(b.y-y)>4*BR*BR)) return {x, y, vx:(Math.random()-0.5)*80, vy:Math.random()*40, rot:Math.random()*TAU, n};
  }
  return {x:CX+(Math.random()-0.5)*30, y:CY-40+Math.random()*20, vx:0, vy:0, rot:0, n};
}
// 中の 玉を「まだ 出て いない 数」に 合わせる（26こまで。足りない 分は 上から 入れる）
function mSync(fresh){
  if(!st) return;
  const rest=remaining(), want=Math.min(rest.length, MAXB), keep=new Set(rest);
  if(fresh) M.balls=[];
  M.balls=M.balls.filter(b=>keep.has(b.n));
  while(M.balls.length>want) M.balls.splice(rnd(M.balls.length), 1);
  const have=new Set(M.balls.map(b=>b.n)), pool=rest.filter(n=>!have.has(n));
  while(M.balls.length<want && pool.length) M.balls.push(newBall(pool.splice(rnd(pool.length), 1)[0]));
  M.calm=0; wake();
}
// 速さの 形（はじめ ぐんぐん → 同じ 速さ → ゆっくり 止まる）。F は 進んだ 角度の 割合、W は 速さ
function trapF(u,a,d){ if(u<=0) return 0; if(u>=1) return 1-a/2-d/2; if(u<a) return u*u/(2*a); if(u<=1-d) return a/2+(u-a); const v=u-(1-d); return a/2+(1-d-a)+v-v*v/(2*d); }
function trapW(u,a,d){ if(u<=0 || u>=1) return 0; if(u<a) return u/a; if(u<=1-d) return 1; return 1-(u-(1-d))/d; }
function mStart(n, onDone){
  const sp=spOf(st.speed), T=sp[2], turns=Math.max(1, Math.round(T*1.05)), th0=M.th%TAU, d=((TH_HOLE-th0)%TAU+TAU)%TAU;
  M.out=null; M.parts=[]; M.glow=0; M.th=th0;
  M.plan={n, T, Th:turns*TAU+d, th0, a:0.22, d:0.32, ts:sp[3]};
  M.ph='spin'; M.t=0; M.onDone=onDone; M.calm=0; M.tick=Math.floor(th0/(Math.PI/6));
  // 出てくる 玉と 同じ 色の 玉が 中に なければ、1つ その 数に する（出口で 色が かわらない ように）
  if(M.balls.length && !M.balls.some(b=>grp(b.n)===grp(n))) M.balls[rnd(M.balls.length)].n=n;
  wake();
}
function startDrop(){
  const n=M.plan.n, a=M.th+Math.PI/6, hx=CX+AP*Math.cos(a), hy=CY+AP*Math.sin(a);   // 出口
  let pick=-1, best=1e9;
  M.balls.forEach((b,i)=>{ const d=Math.hypot(b.x-hx, b.y-hy)-(grp(b.n)===grp(n) ? 3*BR : 0); if(d<best){ best=d; pick=i; } });
  if(pick>=0){ const b=M.balls[pick], o=M.balls.find(x=>x!==b && x.n===n); if(o) o.n=b.n; M.balls.splice(pick, 1); }
  M.out={x:hx, y:hy-BR*0.6, vx:22, vy:60, rot:0, n, s:0, v:0, rest:false, q:0};
  M.ph='drop'; M.t=0; SND.pon(); wake();
}
function settle(){
  const o=M.out; if(!o) return;
  const p=pathPt(RAIL_END); Object.assign(o, {x:p.x, y:p.y, s:RAIL_END, v:0, rot:0, rest:true});
  M.ph='idle'; M.glow=1; burst(o.x, o.y);
  const f=M.onDone; M.onDone=null; if(f) f();
}
function mFinish(){   // すぐ 出す
  if(M.ph==='spin'){ M.th=M.plan.th0+M.plan.Th; M.om=0; rumbleOff(); startDrop(); }
  if(M.out && !M.out.rest) settle();
}
function mCancel(){ M.ph='idle'; M.om=0; M.onDone=null; M.out=null; rumbleOff(); }
function mPutTray(n){ const p=pathPt(RAIL_END); M.out={x:p.x, y:p.y, n, rot:0, s:RAIL_END, v:0, rest:true, q:0}; M.glow=1; burst(p.x, p.y); }
function burst(x, y){
  for(let i=0;i<30;i++){ const a=Math.random()*TAU, v=110+Math.random()*260;
    M.parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v-150, age:0, life:0.55+Math.random()*0.55, c:i%6===5 ? '#ffd54f' : COL[i%5].b, s:1.4+Math.random()*2.4, star:i%3===0}); }
  wake();
}
function physics(h){
  const B=M.balls, n=B.length, ang=[];
  for(let k=0;k<6;k++){ const m=M.th+k*Math.PI/3+Math.PI/6; ang.push([Math.cos(m), Math.sin(m)]); }
  const jig=M.ph==='spin' ? 30 : 0;
  for(const b of B){
    b.vy+=GV*h; b.vx*=1-0.12*h; b.vy*=1-0.12*h;
    if(jig){ b.vx+=(Math.random()-0.5)*jig*h*60; }
    b.x+=b.vx*h; b.y+=b.vy*h;
    for(const [cx,sy] of ang){
      const dist=AP-((b.x-CX)*cx+(b.y-CY)*sy);
      if(dist>=BR) continue;
      const nx=-cx, ny=-sy; b.x+=nx*(BR-dist); b.y+=ny*(BR-dist);
      const px=b.x-nx*BR-CX, py=b.y-ny*BR-CY, wx=-M.om*py, wy=M.om*px;   // 当たった ところの 壁の 速さ
      let rx=b.vx-wx, ry=b.vy-wy; const vn=rx*nx+ry*ny;
      if(vn<0){ rx-=1.45*vn*nx; ry-=1.45*vn*ny; if(-vn>160) clack(-vn); }
      const tx=-ny, ty=nx, vt=rx*tx+ry*ty; rx-=tx*vt*0.2; ry-=ty*vt*0.2;   // 壁に 少し 引っぱられる（持ち上がる）
      b.vx=rx+wx; b.vy=ry+wy;
    }
  }
  const md=2*BR;
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
    const a=B[i], c=B[j]; let dx=c.x-a.x, dy=c.y-a.y; const d2=dx*dx+dy*dy;
    if(d2>=md*md) continue;
    if(d2<1e-6){ dx=0.01; dy=0.01; }
    const d=Math.sqrt(dx*dx+dy*dy), nx=dx/d, ny=dy/d, pen=(md-d)/2;
    a.x-=nx*pen; a.y-=ny*pen; c.x+=nx*pen; c.y+=ny*pen;
    const vr=(c.vx-a.vx)*nx+(c.vy-a.vy)*ny;
    if(vr<0){ const J=-1.6*vr/2; a.vx-=J*nx; a.vy-=J*ny; c.vx+=J*nx; c.vy+=J*ny; if(-vr>240) clack(-vr*0.6); }
  }
  for(const b of B){
    const sp=Math.hypot(b.vx, b.vy); if(sp>1600){ b.vx*=1600/sp; b.vy*=1600/sp; }
    if(Math.hypot(b.x-CX, b.y-CY)>HR){ b.x=CX; b.y=CY-20; b.vx=b.vy=0; }   // 念のため（外に 出たら 中へ）
    b.rot+=b.vx*h/BR;
  }
}
function outStep(dt){
  const o=M.out; M.t+=dt;
  if(M.ph==='drop'){
    o.vy+=GV*dt; o.x+=o.vx*dt; o.y+=o.vy*dt; o.rot+=o.vx*dt/BR;
    const hgt=(o.x-R0.x)*RN.x+(o.y-R0.y)*RN.y-BR;   // レールの 上の 高さ（0 で 着く）
    if(hgt<=0 || M.t>2){ o.s=Math.max(0, (o.x-R0.x)*RU.x+(o.y-R0.y)*RU.y); o.v=Math.max(190, o.vx*RU.x+o.vy*RU.y); const p=pathPt(o.s); o.x=p.x; o.y=p.y; M.ph='roll'; M.t=0; SND.koto(); }
  } else if(M.ph==='roll'){
    o.v+=(GV*RU.y*5/7-(o.v<0 ? 2.6 : 0.15)*o.v)*dt; o.s+=o.v*dt; o.rot+=o.v*dt/BR;   // もどる ときは 早く 止まる
    if(o.s>=RAIL_END){ o.s=RAIL_END; if(o.v>70){ SND.kachi(o.v); o.v=-o.v*0.22; } else o.v=0; }
    if(o.s<0){ o.s=0; o.v=Math.abs(o.v)*0.3; }
    const p=pathPt(o.s); o.x=p.x; o.y=p.y;
    const q=Math.floor(o.rot/Math.PI); if(q!==o.q){ o.q=q; SND.roll(o.v); }
    if((o.v===0 && o.s>=RAIL_END-0.01) || M.t>6) settle();
  }
}
function mStep(dt){
  if(M.ph==='spin'){
    const P=M.plan; M.t+=dt; const u=Math.min(1, M.t/P.T), F1=1-P.a/2-P.d/2;
    M.th=P.th0+P.Th*trapF(u,P.a,P.d)/F1; M.om=P.Th/P.T*trapW(u,P.a,P.d)/F1;
    rumbleSet(M.om);
    const tk=Math.floor(M.th/(Math.PI/6)); if(tk!==M.tick){ M.tick=tk; SND.ratchet(); }
    if(u>=1){ M.th=P.th0+P.Th; M.om=0; rumbleOff(); startDrop(); }
  }
  for(let i=0;i<4;i++) physics(dt/4);
  if(M.out && !M.out.rest && (M.ph==='drop' || M.ph==='roll')) outStep(dt*(M.plan ? M.plan.ts : 1));
  if(M.parts.length){ for(const p of M.parts){ p.age+=dt; p.vy+=520*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=1-1.4*dt; } M.parts=M.parts.filter(p=>p.age<p.life); }
  if(M.glow>0) M.glow=Math.max(0, M.glow-dt*0.8);
  let mx=0; for(const b of M.balls) mx=Math.max(mx, Math.abs(b.vx)+Math.abs(b.vy));
  M.calm=(mx<14 && M.ph==='idle') ? M.calm+dt : 0;
}
function loop(ts){
  M.raf=0;
  if(!M.cv || !isDlgOpen('bingoOverlay')){ M.last=0; return; }
  const dt=M.last ? Math.min(0.034, Math.max(0, (ts-M.last)/1000)) : 0.016; M.last=ts;
  mStep(dt); draw();
  if(M.raf) return;   // とちゅうで wake() が 次の こまを 頼んだ とき（2重に 動かさない）
  if(M.ph!=='idle' || M.parts.length || M.glow>0 || M.calm<0.8) M.raf=requestAnimationFrame(loop); else M.last=0;
}
function wake(){ if(M.cv && !M.raf && isDlgOpen('bingoOverlay')){ M.last=0; M.raf=requestAnimationFrame(loop); } }
function mResize(){
  const cv=M.cv; if(!cv) return;
  const w=cv.clientWidth, h=cv.clientHeight; if(!w || !h) return;
  const dpr=Math.min(2, window.devicePixelRatio||1), W=Math.round(w*dpr), H=Math.round(h*dpr);
  if(cv.width!==W || cv.height!==H){ cv.width=W; cv.height=H; }
  const k=Math.min(W/VW, H/VH); if(k!==M.k) M.spr={};
  M.k=k; M.ox=(W-VW*k)/2; M.oy=(H-VH*k)/2;
  draw();
}

/* 描く */
function sprite(ci){
  const r=Math.max(4, Math.round(BR*M.k)), key=ci+':'+r; if(M.spr[key]) return M.spr[key];
  const s=r*2+2, c=document.createElement('canvas'); c.width=c.height=s;
  const g=c.getContext('2d'), C=COL[ci], m=s/2, gr=g.createRadialGradient(m-r*0.35, m-r*0.4, r*0.08, m, m, r);
  gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.2, C.l); gr.addColorStop(0.62, C.b); gr.addColorStop(1, C.d);
  g.fillStyle=gr; g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill();
  return (M.spr[key]=c);
}
function drawBall(g, x, y, n, rot, num){
  const spr=sprite(grp(n)), sz=spr.width/M.k;
  g.drawImage(spr, x-sz/2, y-sz/2, sz, sz);
  const ox=Math.cos(rot)*BR*0.14, oy=Math.sin(rot)*BR*0.14;   // 白い まる（数を 書く ところ）が まわる
  g.fillStyle='#ffffff'; g.beginPath(); g.arc(x+ox, y+oy, BR*(num ? 0.6 : 0.46), 0, TAU); g.fill();
  if(!num) return;
  g.save(); g.translate(x+ox, y+oy); g.rotate(rot); g.fillStyle='#1a1a1a';
  g.font='900 '+(n>=10 ? BR*0.7 : BR*0.84).toFixed(2)+'px system-ui, sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText(String(n), 0, BR*0.05); g.restore();
}
function hexPath(g, P){ g.beginPath(); P.forEach(([x,y],i)=>i ? g.lineTo(x,y) : g.moveTo(x,y)); g.closePath(); }
function rrect(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function star(g, x, y, r){ g.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, q=i%2 ? r*0.45 : r; g.lineTo(x+Math.cos(a)*q, y+Math.sin(a)*q); } g.closePath(); g.fill(); }
function isShow(){ const m=document.querySelector('#bingoOverlay .bg-modal'); return !!(m && m.classList.contains('show')); }
function draw(){
  const g=M.g, cv=M.cv; if(!g || !cv.width) return;
  const dark=isShow() || document.body.classList.contains('dark');
  g.setTransform(1,0,0,1,0,0);
  const bg=g.createLinearGradient(0, 0, 0, cv.height);
  if(dark){ bg.addColorStop(0,'#1d2147'); bg.addColorStop(1,'#3b2658'); } else { bg.addColorStop(0,'#fff6e5'); bg.addColorStop(1,'#ffd49c'); }
  g.fillStyle=bg; g.fillRect(0, 0, cv.width, cv.height);
  const fy=M.oy+FLOOR*M.k; g.fillStyle=dark ? '#3e2b23' : '#c98f52'; g.fillRect(0, fy, cv.width, cv.height-fy);   // 台（下まで）
  g.setTransform(M.k, 0, 0, M.k, M.ox, M.oy);
  // 旗（かざり）
  g.lineWidth=1.2; g.strokeStyle=dark ? 'rgba(255,255,255,.35)' : 'rgba(120,80,40,.45)';
  g.beginPath(); g.moveTo(-12, 6); g.quadraticCurveTo(VW/2, 40, VW+12, 6); g.stroke();
  for(let i=0;i<15;i++){ const u=(i+0.5)/15, x=-12+(VW+24)*u, y=(1-u)*(1-u)*6+2*(1-u)*u*40+u*u*6;
    g.fillStyle=COL[i%5].b; g.beginPath(); g.moveTo(x-7, y); g.lineTo(x+7, y); g.lineTo(x, y+14); g.closePath(); g.fill(); }
  if(dark){ const sp=g.createRadialGradient(CX, CY, 20, CX, CY, 210); sp.addColorStop(0,'rgba(255,240,200,.22)'); sp.addColorStop(1,'rgba(255,240,200,0)'); g.fillStyle=sp; g.fillRect(-40, -40, VW+80, VH+80); }
  g.fillStyle=dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.35)'; g.fillRect(-60, FLOOR, VW+120, 2.5);   // 台の ふち
  // 脚と 台
  g.lineCap='round'; g.strokeStyle='#6d4521'; g.lineWidth=9;
  g.beginPath(); g.moveTo(CX, CY); g.lineTo(CX-84, FLOOR-4); g.moveTo(CX, CY); g.lineTo(CX+84, FLOOR-4); g.stroke();
  g.fillStyle='#8a5a2b'; rrect(g, CX-108, FLOOR-7, 216, 9, 4); g.fill();
  // レール（支え・棒・止め板）と 出口の 受け
  g.strokeStyle='#607d8b'; g.lineWidth=4;
  [0.45, 0.93].forEach(u=>{ const x=R0.x+(R1.x-R0.x)*u, y=R0.y+(R1.y-R0.y)*u; g.beginPath(); g.moveTo(x, y+4); g.lineTo(x, FLOOR); g.stroke(); });
  g.lineCap='round'; g.strokeStyle='#455a64'; g.lineWidth=7; g.beginPath(); g.moveTo(R0.x, R0.y+3.5); g.lineTo(R1.x, R1.y+3.5); g.stroke();
  g.strokeStyle='#cfd8dc'; g.lineWidth=2.5; g.beginPath(); g.moveTo(R0.x, R0.y+1.5); g.lineTo(R1.x, R1.y+1.5); g.stroke();
  g.fillStyle='#e53935'; rrect(g, R1.x-1, R1.y-24, 8, 28, 3); g.fill();
  g.strokeStyle='#8a5a2b'; g.lineWidth=4; g.beginPath(); g.moveTo(CX-16, CY+AP+3); g.lineTo(CX-21, R0.y-2); g.stroke();
  // 六角の 箱：奥 → 玉 → 前の 板 → わく → 出口 → 金具
  const P=hexPts(M.th);
  hexPath(g, P); g.fillStyle=dark ? 'rgba(8,12,36,.62)' : 'rgba(38,50,82,.42)'; g.fill();
  const num=BR*M.k/Math.min(2, window.devicePixelRatio||1)>=9;   // 玉が 大きく 見える ときは 中の 玉にも 数を 書く
  g.save(); hexPath(g, P); g.clip(); for(const b of M.balls) drawBall(g, b.x, b.y, b.n, b.rot, num); g.restore();
  hexPath(g, P); const gl=g.createLinearGradient(CX-HR, CY-HR, CX+HR, CY+HR);
  gl.addColorStop(0,'rgba(255,255,255,.30)'); gl.addColorStop(0.45,'rgba(255,255,255,.05)'); gl.addColorStop(1,'rgba(255,255,255,.14)'); g.fillStyle=gl; g.fill();
  hexPath(g, P); g.lineJoin='round'; g.lineWidth=10; g.strokeStyle='#a8662c'; g.stroke(); g.lineWidth=2.5; g.strokeStyle='#e7ad6a'; g.stroke();
  const ha=M.th+Math.PI/6; g.save(); g.translate(CX+AP*Math.cos(ha), CY+AP*Math.sin(ha)); g.rotate(ha-Math.PI/2); g.fillStyle='#2b1a0c'; rrect(g, -BR*1.3, -5, BR*2.6, 10, 4); g.fill(); g.restore();
  P.forEach(([x,y])=>{ g.fillStyle='#ffd54f'; g.beginPath(); g.arc(x, y, 4.2, 0, TAU); g.fill(); g.fillStyle='#b8860b'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); });
  // じくと ハンドル（箱と いっしょに まわる）
  const ca=M.th+Math.PI*0.62, kx=CX+Math.cos(ca)*64, ky=CY+Math.sin(ca)*64;
  g.strokeStyle='#5d4037'; g.lineWidth=6; g.lineCap='round'; g.beginPath(); g.moveTo(CX, CY); g.lineTo(kx, ky); g.stroke();
  let rg=g.createRadialGradient(kx-3, ky-3, 1, kx, ky, 9); rg.addColorStop(0,'#ff8a80'); rg.addColorStop(1,'#c62828'); g.fillStyle=rg; g.beginPath(); g.arc(kx, ky, 9, 0, TAU); g.fill();
  rg=g.createRadialGradient(CX-4, CY-4, 1, CX, CY, 13); rg.addColorStop(0,'#fafafa'); rg.addColorStop(1,'#78909c'); g.fillStyle=rg; g.beginPath(); g.arc(CX, CY, 12, 0, TAU); g.fill();
  // 出てきた 玉（受け皿で 光る）
  const o=M.out;
  if(o){
    if(o.rest){ const hl=g.createRadialGradient(o.x, o.y, BR*0.5, o.x, o.y, BR*2.6); hl.addColorStop(0,'rgba(255,224,130,.55)'); hl.addColorStop(1,'rgba(255,224,130,0)'); g.fillStyle=hl; g.beginPath(); g.arc(o.x, o.y, BR*2.6, 0, TAU); g.fill(); }
    if(M.glow>0){ g.strokeStyle='rgba(255,213,79,'+M.glow.toFixed(3)+')'; g.lineWidth=3; g.beginPath(); g.arc(o.x, o.y, BR*(1.3+(1-M.glow)*1.8), 0, TAU); g.stroke(); }
    drawBall(g, o.x, o.y, o.n, o.rot, true);
  }
  for(const p of M.parts){ g.globalAlpha=Math.max(0, 1-p.age/p.life); g.fillStyle=p.c; if(p.star) star(g, p.x, p.y, p.s*1.8); else { g.beginPath(); g.arc(p.x, p.y, p.s, 0, TAU); g.fill(); } }
  g.globalAlpha=1;
}

/* ───────── 紙ふぶき（ビンゴ・ぜんぶ 出た とき）───────── */
const FX={cv:null, g:null, ps:[], raf:0, last:0, dpr:1};
const FXC=['#1e88e5','#e53935','#8e24aa','#2e9d4a','#ef6c00','#fdd835','#ff80ab'];
function confetti(n){
  const cv=$('bgFx'); if(!cv) return;
  const w=cv.clientWidth, h=cv.clientHeight; if(!w || !h) return;
  FX.cv=cv; FX.g=cv.getContext('2d'); FX.dpr=Math.min(2, window.devicePixelRatio||1); cv.width=Math.round(w*FX.dpr); cv.height=Math.round(h*FX.dpr);
  for(let i=0;i<(n||140);i++) FX.ps.push({x:Math.random()*w, y:-20-Math.random()*h*0.5, vx:(Math.random()-0.5)*140, vy:90+Math.random()*170, r:Math.random()*TAU, vr:(Math.random()-0.5)*12, w:6+Math.random()*7, h:4+Math.random()*5, c:FXC[i%FXC.length], age:0, life:2.4+Math.random()*1.4});
  if(!FX.raf){ FX.last=0; FX.raf=requestAnimationFrame(fxLoop); }
}
function fxLoop(ts){
  FX.raf=0; const g=FX.g, cv=FX.cv; if(!g) return;
  const dt=FX.last ? Math.min(0.04, (ts-FX.last)/1000) : 0.016; FX.last=ts;
  g.setTransform(1,0,0,1,0,0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(FX.dpr,0,0,FX.dpr,0,0);
  for(const p of FX.ps){ p.age+=dt; p.vy+=50*dt; p.x+=p.vx*dt+Math.sin(p.age*3+p.r)*24*dt; p.y+=p.vy*dt; p.r+=p.vr*dt;
    g.save(); g.globalAlpha=Math.max(0, Math.min(1, (p.life-p.age)*2)); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle=p.c; g.fillRect(-p.w/2, -p.h/2, p.w, p.h); g.restore(); }
  FX.ps=FX.ps.filter(p=>p.age<p.life);
  if(FX.raf) return;
  if(FX.ps.length && isDlgOpen('bingoOverlay')) FX.raf=requestAnimationFrame(fxLoop); else { FX.ps=[]; g.setTransform(1,0,0,1,0,0); g.clearRect(0, 0, cv.width, cv.height); FX.last=0; }
}
let banT=0;
function banner(text, kind){
  const b=$('bgBanner'); if(!b) return;
  b.textContent=text; b.className='bg-banner'; void b.offsetWidth; b.className='bg-banner on '+(kind||'');
  clearTimeout(banT); banT=setTimeout(()=>{ b.className='bg-banner'; }, 2400);
}

/* ───────── 抽選の 流れ ───────── */
function spin(){
  if(!st) return;
  if(busy){ skip(); return; }   // まわして いる あいだに もう一度 押すと すぐ 出す
  const rest=remaining();
  if(!rest.length){ toastS('ぜんぶ 出ました。「🔄 はじめから」で もう一度 遊べます'); return; }
  try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(_){}   // 前の 読み上げを 止める
  ac(); primeVoice();
  const n=rest[rnd(rest.length)];
  busy={n};
  renderRes(false); renderGo(); renderActs();
  if(noAnim() || !M.cv || !M.cv.width){ reveal(); return; }
  mStart(n, reveal);
}
function skip(){ if(busy) mFinish(); }
function reveal(){
  if(!busy) return;
  const n=busy.n; busy=null;
  if(!st.drawn.includes(n)) st.drawn.push(n);
  save();
  if(!M.out || M.out.n!==n || !M.out.rest) mPutTray(n);
  mSync();
  renderDraw(true);
  SND.chime(); vib(30);
  setTimeout(()=>{ if(st && !busy && st.drawn[st.drawn.length-1]===n) say(yomiText(n)); }, 380);
  if(st.drawn.length>=st.max) allDone();
}
function allDone(){ setTimeout(()=>{ if(!isDlgOpen('bingoOverlay')) return; SND.fanfare(); confetti(170); banner('🎉 ぜんぶ 出ました', 'all'); }, 650); }
function addNum(n){
  if(!st || busy || !Number.isInteger(n) || n<1 || n>st.max || st.drawn.includes(n)) return false;
  st.drawn.push(n); save(); mPutTray(n); mSync(); renderDraw(true); SND.chime(); say(yomiText(n));
  if(st.drawn.length>=st.max) allDone();
  return true;
}
async function boardTap(n){
  if(!st) return;
  if(busy){ toastS('玉が 出るまで 待って ください'); return; }
  const i=st.drawn.indexOf(n);
  if(i>=0){
    if(!st.quick){ toastS(callText(n)+'：'+(i+1)+'こ目に 出ました'); return; }
    if(!(await ask(callText(n)+' を 出て いない ことに しますか？', 'もどす'))) return;
    const j=st.drawn.indexOf(n); if(j<0 || busy) return;
    st.drawn.splice(j, 1); save(); if(M.out && M.out.n===n) M.out=null; mSync(); renderDraw(false); return;
  }
  if(!st.quick && !(await ask(callText(n)+' を 出た ことに しますか？\n（表を 押して 手で 入れます。⚙ 設定で「すぐ 入れる」にも できます）', '入れる'))) return;
  addNum(n);
}
async function undo(){
  if(!st || busy || !st.drawn.length) return;
  const n=st.drawn[st.drawn.length-1];
  if(!(await ask(callText(n)+' を 出なかった ことに しますか？', 'もどす'))) return;
  if(busy || st.drawn[st.drawn.length-1]!==n) return;
  st.drawn.pop(); save(); if(M.out && M.out.n===n) M.out=null; mSync(); renderDraw(false); toastS('↶ '+callText(n)+' を もどしました');
}
async function reset(){
  if(!st || busy || !st.drawn.length) return;
  if(!(await ask('出た 数（'+st.drawn.length+'こ）を ぜんぶ 消して、はじめから に しますか？', 'はじめから'))) return;
  if(busy) return;
  st.drawn=[]; save(); M.out=null; mSync(); renderDraw(false); toastS('🔄 はじめから に しました');
}

/* ───────── 画面 ───────── */
function render(){
  if(!st || !$('bgBody')) return;
  renderTabs();
  const d=st.tab==='draw';
  $('bgDraw').hidden=!d; $('bgCardTab').hidden=d;
  if(d){ renderDraw(false); mResize(); } else renderCard();
}
function renderTabs(){
  const b=$('bgTabs'); if(!b) return;
  b.innerHTML=[['draw','🎱 抽選'],['card','🃏 カード']].map(([k,t])=>`<button type="button" role="tab" class="${st.tab===k?'on':''}" aria-selected="${st.tab===k}" onclick="BINGO.tab('${k}')">${t}</button>`).join('');
}
function setTab(k){ if(!st || !['draw','card'].includes(k) || st.tab===k) return; st.tab=k; save(); render(); }
function renderDraw(fresh){ renderRes(fresh); renderGo(); renderActs(); renderBoard(); renderHist(); }
function renderRes(fresh){
  const b=$('bgRes'); if(!b) return;
  const n=st.drawn[st.drawn.length-1], cnt=st.drawn.length, left=st.max-cnt;
  if(busy){ b.innerHTML=`<div class="bg-big wait"><b>？</b></div><div class="bg-rt"><div class="bg-call sm">ガラガラ… コロコロ…</div><div class="bg-sub">${cnt}こ 出ました ・ のこり <b>${left}</b></div></div>`; return; }
  if(n==null){ b.innerHTML=`<div class="bg-big none"><b>？</b></div><div class="bg-rt"><div class="bg-call sm">「🎱 まわす」を 押すと 抽選器が まわって 玉が 出ます</div><div class="bg-sub">1〜${st.max} の ${st.max}こ</div></div>`; return; }
  const L=letterOf(n);
  b.innerHTML=`<div class="bg-big bgc${grp(n)}${fresh?' pop':''}">${L?`<small>${L}</small>`:''}<b>${n}</b></div>
    <div class="bg-rt"><div class="bg-call">${esc(callText(n))}</div><div class="bg-sub"><b>${cnt}</b>こ目 ・ のこり <b>${left}</b></div>
    <button type="button" class="bg-say" onclick="BINGO.sayAgain()">🔊 もう一度 読む</button></div>`;
}
function renderGo(){
  const g=$('bgGo'); if(!g) return;
  const all=st.drawn.length>=st.max;
  g.classList.toggle('busy', !!busy); g.disabled=!busy && all;
  g.textContent=busy ? '⏩ すぐ 出す' : all ? '🎉 ぜんぶ 出ました' : '🎱 まわす';
}
function renderActs(){
  const a=$('bgActs'); if(!a) return;
  const has=st.drawn.length>0, off=(!has || busy) ? ' disabled' : '';
  a.innerHTML=`<button type="button" class="bg-b" onclick="BINGO.undo()"${off}>↶ 1つ もどす</button>
    <button type="button" class="bg-b" onclick="BINGO.reset()"${off}>🔄 はじめから</button>
    <button type="button" class="bg-b" onclick="BINGO.copy()"${has?'':' disabled'}>📋 コピー</button>
    ${st.max===75 ? `<button type="button" class="bg-b" onclick="BINGO.verifyPop()">🔎 たしかめ</button>` : ''}
    <button type="button" class="bg-b" onclick="BINGO.show(true)">⛶ 大きく</button>
    <button type="button" class="bg-b" onclick="BINGO.setPop()">⚙ 設定</button>`;
}
function renderBoard(){
  const b=$('bgBoard'), c=$('bgCnt'); if(!b) return;
  const order=new Map(st.drawn.map((n,i)=>[n,i])), last=st.drawn[st.drawn.length-1];
  const cell=n=>{ const on=order.has(n);
    return `<button type="button" class="bn${on ? ' on bgc'+grp(n) : ''}${n===last ? ' last' : ''}" data-n="${n}" aria-pressed="${on}" aria-label="${esc(callText(n))}${on ? '（'+(order.get(n)+1)+'こ目）' : ''}">${n}</button>`; };
  if(st.max===75) b.innerHTML=`<div class="bg-b75">${[0,1,2,3,4].map(k=>`<div class="col bgc${k}"><b class="h">${LET[k]}</b>${Array.from({length:15}, (_,i)=>cell(k*15+i+1)).join('')}</div>`).join('')}</div>`;
  else b.innerHTML=`<div class="bg-bn${st.max>60 ? ' big' : ''}">${Array.from({length:st.max}, (_,i)=>cell(i+1)).join('')}</div>`;
  if(c) c.textContent='（'+st.drawn.length+'／'+st.max+'）';
}
function renderHist(){
  const h=$('bgHist'); if(!h) return;
  if(!st.drawn.length){ h.innerHTML='<div class="bg-none">まだ ありません</div>'; return; }
  const n=st.drawn.length;
  h.innerHTML=st.drawn.slice().reverse().map((x,i)=>`<span class="mb bgc${grp(x)}${i===0 ? ' now' : ''}" title="${n-i}こ目"><i>${n-i}</i>${esc(letterOf(x))}${x}</span>`).join('');
}
// カードの 5×5（tap：押せる・自分の カード）
function cardGrid(nums, J, tap){
  const tag=tap ? 'button' : 'span';
  return `<div class="bg-card${tap ? '' : ' sm'}"><div class="hd">${[0,1,2,3,4].map(c=>`<b class="bgc${c}">${LET[c]}</b>`).join('')}</div>
    <div class="gr">${nums.map((n,i)=>`<${tag}${tap ? ` type="button" data-i="${i}" aria-pressed="${J.ok[i]}"` : ''} class="cc${J.ok[i] ? ' on' : ''}${n===0 ? ' free' : ''}${J.win.has(i) ? ' win' : ''}">${n===0 ? '<i>★</i><small>FREE</small>' : '<span>'+n+'</span>'}</${tag}>`).join('')}</div></div>`;
}
function renderCard(){
  const b=$('bgCardTab'); if(!b) return;
  const c=st.card, nums=cardNums(c.code, c.no), mk=new Set(c.marks), J=judge(nums, n=>mk.has(n));
  b.innerHTML=`<div class="bg-cinfo"><b>🃏 カード No. ${c.no}</b><span>組 ${esc(c.code)}</span></div>
    ${cardGrid(nums, J, true)}
    <div class="bg-cstat${J.bingo.length ? ' win' : J.need.length ? ' reach' : ''}">${esc(judgeText(J))}</div>
    <div class="bg-acts">
      <button type="button" class="bg-b" onclick="BINGO.cardNew()">🔄 新しい カード</button>
      <button type="button" class="bg-b" onclick="BINGO.cardNoPop()">🔢 番号で 作る</button>
      <button type="button" class="bg-b" onclick="BINGO.cardClear()"${c.marks.length ? '' : ' disabled'}>🧹 穴を ふさぐ</button>
      <button type="button" class="bg-b" onclick="BINGO.printPop()">🖨 カードを 印刷</button>
    </div>
    <p class="bg-note">読み上げられた 数を 押すと 穴が あきます（もう一度 押すと もどります）。たて・よこ・ななめ の どれか 1列 そろうと ビンゴ！<br>
    みんなで 遊ぶ ときは、親の 人が「🖨 カードを 印刷」で 配るか、組の コードと 番号を 伝えて「🔢 番号で 作る」で 作って もらいます。
    親は「🎱 抽選」の「🔎 たしかめ」に 番号を 入れると、ビンゴか どうか すぐ わかります。</p>`;
}
function cardMark(i){
  const c=st.card, nums=cardNums(c.code, c.no), n=nums[i]; if(!n) return;   // FREE は いつも あいて いる
  const mk=new Set(c.marks), J0=judge(nums, x=>mk.has(x));
  if(mk.has(n)){ mk.delete(n); SND.untap(); } else { mk.add(n); SND.tap(); }
  c.marks=[...mk]; save();
  const J1=judge(nums, x=>mk.has(x));
  renderCard();
  if(J1.bingo.length>J0.bingo.length){ SND.fanfare(); confetti(150); banner('🎉 ビンゴ！', 'win'); vib([60,40,160]); }
  else if(!J1.bingo.length && J1.need.length>J0.need.length){ SND.reach(); banner('リーチ！', 'reach'); vib(40); }
}
async function cardNew(){
  const c=st.card;
  if(c.marks.length && !(await ask('いまの カード（穴 '+c.marks.length+'こ）を やめて、新しい カードに しますか？', '新しく'))) return;
  let no=1+rnd(999); if(no===c.no) no=no%999+1;
  st.card={code:c.code, no, marks:[]}; save(); renderCard(); toastS('🔄 新しい カード（No. '+no+'）に しました');
}
async function cardClear(){
  if(!st.card.marks.length) return;
  if(!(await ask('あけた 穴（'+st.card.marks.length+'こ）を ぜんぶ ふさぎますか？', 'ふさぐ'))) return;
  st.card.marks=[]; save(); renderCard();
}
function cardNoPop(){
  popOpen(`<div class="bg-ph"><b>🔢 番号で カードを 作る</b><button type="button" class="bg-x" onclick="BINGO.close()" aria-label="閉じる">✕</button></div>
    <div class="bg-f"><span>組の コード</span><input id="bgCCode" type="text" maxlength="8" autocomplete="off" autocapitalize="characters" value="${esc(st.card.code)}"></div>
    <div class="bg-f"><span>カードの 番号</span><input id="bgCNo" type="text" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="例）12"></div>
    <div class="bg-pacts"><button type="button" class="bg-b" onclick="BINGO.close()">やめる</button><button type="button" class="bg-b pri" onclick="BINGO.cardMake()">作る</button></div>
    <p class="bg-note">親の 人から 聞いた「組の コード」と「番号」を 入れます。同じ コードと 番号なら、印刷した カードと 同じ 並びに なるので、親が 番号で たしかめられます。</p>`);
  setTimeout(()=>{ const e=$('bgCNo'); if(e) e.focus(); }, 60);
}
async function cardMake(code, no){
  const cd=okCode(code!=null ? code : ($('bgCCode') ? $('bgCCode').value : '')), n=int(no!=null ? no : ($('bgCNo') ? $('bgCNo').value : ''), 1, MAXNO, 0);
  if(!cd){ toastS('組の コードを 入れて ください（英字と 数字）'); return false; }
  if(!n){ toastS('カードの 番号を 入れて ください（1〜'+MAXNO+'）'); return false; }
  if(st.card.marks.length && !(cd===st.card.code && n===st.card.no) && code==null && !(await ask('いまの カード（穴 '+st.card.marks.length+'こ）を やめて、No. '+n+' に しますか？', '作る'))) return false;
  if(!(cd===st.card.code && n===st.card.no)) st.card={code:cd, no:n, marks:[]};
  save(); popClose(); renderCard(); toastS('🃏 カード No. '+n+'（組 '+cd+'）');
  return true;
}

/* ───────── 小さな 窓 ───────── */
function popOpen(html){
  popClose();
  const el=document.createElement('div'); el.className='bg-pop-bg';
  el.innerHTML=`<div class="bg-pop" role="dialog">${html}</div>`;
  el.addEventListener('mousedown', e=>{ if(e.target===el) popClose(); });
  document.querySelector('#bingoOverlay .bg-modal').appendChild(el);
  pop={el, rel:modalBack(()=>popClose(true))};
}
function popClose(fromBack){ if(!pop) return; const p=pop; pop=null; if(!fromBack) p.rel(); p.el.remove(); }
const seg=(items, cur, fn)=>`<div class="bg-seg">${items.map(([v,t])=>`<button type="button" class="${cur===v ? 'on' : ''}" onclick="${fn}(${JSON.stringify(v).replace(/"/g,'&quot;')})">${t}</button>`).join('')}</div>`;
function setPop(){
  const custom=!RANGES.some(r=>r[0]===st.max);
  popOpen(`<div class="bg-ph"><b>⚙ ビンゴの 設定</b><button type="button" class="bg-x" onclick="BINGO.close()" aria-label="閉じる">✕</button></div>
    <h5>数の はんい</h5>${seg(RANGES, st.max, 'BINGO.setMax')}
    <div class="bg-f"><span>自分で 決める</span><em>1 〜</em><input id="bgMax" type="text" inputmode="numeric" maxlength="3" value="${custom ? st.max : ''}" placeholder="2〜99"><button type="button" class="bg-b" onclick="BINGO.setMax(document.getElementById('bgMax').value)">決める</button></div>
    <h5>演出の 長さ</h5>${seg(SPEEDS.map(s=>[s[0], s[1]]), st.speed, "BINGO.set.bind(null,'speed')")}
    <h5>音</h5>${seg([[true,'🔊 出す'],[false,'🔇 出さない']], st.sound, "BINGO.set.bind(null,'sound')")}
    <h5>読み上げ（「ビー の 12」）</h5>${seg([[true,'🗣 読む'],[false,'読まない']], st.voice, "BINGO.set.bind(null,'voice')")}
    <h5>表の 数を 押したら</h5>${seg([[false,'たしかめて 入れる'],[true,'すぐ 入れる・もどす']], st.quick, "BINGO.set.bind(null,'quick')")}
    <p class="bg-note">数の はんいを かえると はじめから に なります。1〜75 の ときは B・I・N・G・O の 列で 出て、🃏 カードと 🔎 たしかめ が 使えます。<br>
    「すぐ 入れる」は 自分の 抽選器（ガラガラ）を 使って、この 画面を 出た 数の 表に する とき 向けです。読み上げの 声の 種類は 表電卓の ⚙ 設定 →「🔈 読み上げの声」で えらべます。</p>`);
}
async function setMax(v){
  const n=Math.round(parseFloat(String(v==null?'':v).normalize('NFKC')));
  if(!isFinite(n) || n<2 || n>99){ toastS('2〜99 の 数を 入れて ください'); return; }
  if(busy){ toastS('玉が 出るまで 待って ください'); return; }
  if(n===st.max){ if(pop) setPop(); return; }
  if(st.drawn.length && !(await ask('数の はんいを 1〜'+n+' に かえると、出た 数（'+st.drawn.length+'こ）は 消えて はじめから に なります。かえますか？', 'かえる'))) return;
  st.max=n; st.drawn=[]; save(); M.out=null; mSync(true); render(); if(pop) setPop();
  toastS('数の はんいを 1〜'+n+' に しました');
}
function setOpt(k, v){
  if(k==='speed' && SPEEDS.some(s=>s[0]===v)) st.speed=v;
  else if(['sound','voice','quick'].includes(k)) st[k]=!!v;
  else return;
  save();
  if(k==='sound' && !st.sound) rumbleOff();
  if(k==='voice' && !st.voice){ try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(_){} }
  if(k==='sound' && st.sound) SND.tap();
  if(pop) setPop();
}
// 🔎 カードを たしかめる（番号と 組の コードで カードを 出し、出た 数で ビンゴか みる）
function verifyPop(){
  if(st.max!==75){ toastS('カードは 1〜75 の ときに 使えます'); return; }
  popOpen(`<div class="bg-ph"><b>🔎 カードを たしかめる</b><button type="button" class="bg-x" onclick="BINGO.close()" aria-label="閉じる">✕</button></div>
    <div class="bg-f"><span>カードの 番号</span><input id="bgVNo" type="text" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="例）12"></div>
    <div class="bg-f"><span>組の コード</span><input id="bgVCode" type="text" maxlength="8" autocomplete="off" autocapitalize="characters" value="${esc(st.code)}"></div>
    <div class="bg-vout" id="bgVOut"></div>
    <p class="bg-note">印刷した カードや「🔢 番号で 作る」で 作った カードを、いま 出た 数（${st.drawn.length}こ）で たしかめます。カードの 下の「No.」と「組」を 入れて ください。</p>`);
  ['bgVNo','bgVCode'].forEach(id=>$(id).addEventListener('input', verifyOut));
  verifyOut(); setTimeout(()=>{ const e=$('bgVNo'); if(e) e.focus(); }, 60);
}
function verifyOut(){
  const o=$('bgVOut'); if(!o) return;
  const no=int($('bgVNo').value, 1, MAXNO, 0), code=okCode($('bgVCode').value);
  if(!no || !code){ o.innerHTML='<div class="bg-none">番号と 組の コードを 入れると、その カードが 出ます</div>'; return; }
  const nums=cardNums(code, no), dr=new Set(st.drawn), J=judge(nums, n=>dr.has(n));
  o.innerHTML=`<div class="bg-vh">No. ${no} ・ 組 ${esc(code)}</div>`+cardGrid(nums, J, false)+`<div class="bg-cstat${J.bingo.length ? ' win' : J.need.length ? ' reach' : ''}">${esc(judgeText(J))}</div>`;
}
// 🖨 カードを 印刷（A4 に 4枚ずつ。下に 番号と 組の コード）
function printPop(){
  popOpen(`<div class="bg-ph"><b>🖨 ビンゴカードを 印刷</b><button type="button" class="bg-x" onclick="BINGO.close()" aria-label="閉じる">✕</button></div>
    <div class="bg-f"><span>枚数</span><input id="bgPN" type="text" inputmode="numeric" maxlength="3" autocomplete="off" value="${st.printN}"><em>枚（A4 1枚に 4つ）</em></div>
    <div class="bg-f"><span>番号</span><input id="bgPF" type="text" inputmode="numeric" maxlength="5" autocomplete="off" value="${st.printFrom}"><em>番から</em></div>
    <div class="bg-f"><span>組の コード</span><b class="bg-code" id="bgPCode">${esc(st.code)}</b><button type="button" class="bg-b" onclick="BINGO.newCode()">🔀 新しく</button></div>
    <div class="bg-pacts"><button type="button" class="bg-b" onclick="BINGO.close()">やめる</button><button type="button" class="bg-b pri" onclick="BINGO.print()">🖨 印刷する</button></div>
    <p class="bg-note">カードの 下に「No.」と「組 ${esc(st.code)}」が 入ります。ビンゴの 人が 出たら「🎱 抽選」の「🔎 たしかめ」に 番号を 入れると、本当に そろって いるか すぐ わかります。同じ 組の コードと 番号なら、いつも 同じ カードです（次の 会でも 使えます）。</p>`);
}
async function newCodeAsk(){
  if(!(await ask('組の コードを 新しく しますか？\n（前に 印刷した カードを たしかめる ときは、🔎 たしかめ で 前の コード「'+st.code+'」を 入れます）', '新しく'))) return;
  st.code=newCode(); save(); if(pop) printPop(); toastS('組の コードを「'+st.code+'」に しました');
}
const DOC=`
.bg-doc{ color:#111; background:#fff; font-family:"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.bg-doc .pg{ display:grid; grid-template-columns:1fr 1fr; gap:8mm 7mm; page-break-after:always; break-after:page; }
.bg-doc .pg:last-child{ page-break-after:auto; break-after:auto; }
.bg-doc .pc{ border:1.4px dashed #888; border-radius:3mm; padding:4mm 4mm 3mm; break-inside:avoid; page-break-inside:avoid; }
.bg-doc .t, .bg-doc .g{ display:grid; grid-template-columns:repeat(5,1fr); gap:1.3mm; }
.bg-doc .t{ margin:0 0 1.3mm; } .bg-doc .t b{ text-align:center; color:#fff; font-size:21pt; font-weight:900; line-height:1.25; border-radius:1.6mm; }
.bg-doc .g span{ display:flex; align-items:center; justify-content:center; height:15.6mm; border:1.3px solid #333; border-radius:1.6mm; font-size:21pt; font-weight:900; }
.bg-doc .g span.f{ flex-direction:column; font-size:8.5pt; background:#fff3c4; } .bg-doc .g span.f i{ font-style:normal; font-size:15pt; line-height:1; color:#f9a825; }
.bg-doc .ft{ display:flex; justify-content:space-between; align-items:baseline; margin:1.8mm 0 0; font-size:10pt; } .bg-doc .ft b{ font-size:13pt; }
`;
function printCards(){
  const N0=int($('bgPN') ? $('bgPN').value : st.printN, 1, MAXP, 20), F=int($('bgPF') ? $('bgPF').value : st.printFrom, 1, MAXNO, 1), N=Math.min(N0, MAXNO-F+1);
  st.printN=N; st.printFrom=F; save();
  const pc=no=>{ const nums=cardNums(st.code, no);
    return `<div class="pc"><div class="t">${[0,1,2,3,4].map(c=>`<b style="background:${COL[c].b}">${LET[c]}</b>`).join('')}</div><div class="g">${nums.map(n=>n===0 ? '<span class="f"><i>★</i>FREE</span>' : '<span>'+n+'</span>').join('')}</div><div class="ft"><b>No. ${no}</b><span>組 ${esc(st.code)}</span></div></div>`; };
  const pages=[]; for(let i=0;i<N;i+=4){ const p=[]; for(let j=i;j<Math.min(N, i+4);j++) p.push(pc(F+j)); pages.push(`<div class="pg">${p.join('')}</div>`); }
  let pa=$('printArea'); if(!pa){ pa=document.createElement('div'); pa.id='printArea'; document.body.appendChild(pa); }
  pa.innerHTML=`<div class="bg-doc">${pages.join('')}</div>`;
  let dyn=$('printDynamicStyle'); if(!dyn){ dyn=document.createElement('style'); dyn.id='printDynamicStyle'; document.head.appendChild(dyn); }
  dyn.textContent='@page{ size: A4 portrait; margin: 10mm; }';
  popClose();
  const old=document.title; document.title='bingo_cards_'+st.code+'_No'+F+'-'+(F+N-1);
  setTimeout(()=>{ try{ window.print(); }catch(_){ toastS('印刷を 開けませんでした'); } setTimeout(()=>{ document.title=old; }, 1500); }, 250);
}

/* ───────── 📋 コピー ───────── */
function text(){
  const d=new Date(), out=['🎱 ビンゴ（'+(d.getMonth()+1)+'月'+d.getDate()+'日 '+d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')+'）', '出た 数：'+st.drawn.length+'こ（のこり '+(st.max-st.drawn.length)+'）'];
  if(st.max===75) for(let c=0;c<5;c++){ const a=st.drawn.filter(n=>grp(n)===c).sort((x,y)=>x-y); out.push(LET[c]+'：'+(a.length ? a.join('・') : '—')); }
  else out.push('小さい 順：'+(st.drawn.slice().sort((a,b)=>a-b).join('・')||'—'));
  out.push('出た 順：'+(st.drawn.map(n=>letterOf(n)+n).join(' → ')||'—'));
  return out.join('\n');
}
function copy(){ if(!st.drawn.length){ toastS('まだ 出て いません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 コピーしました（LINE などに 貼れます）'); }

/* ───────── ⛶ 大きく（テレビ・プロジェクター 用）───────── */
function show(on, fromBack){
  const m=document.querySelector('#bingoOverlay .bg-modal'); if(!m || !st) return;
  if(on){
    if(isShow()) return;
    popClose();
    if(st.tab!=='draw'){ st.tab='draw'; save(); render(); }
    m.classList.add('show'); showRel=modalBack(()=>show(false, true)); const bd=$('bgBody'); if(bd) bd.scrollTop=0;
  } else {
    if(!isShow()) return;
    m.classList.remove('show'); const r=showRel; showRel=null; if(r && !fromBack) r();
  }
  requestAnimationFrame(()=>{ mResize(); wake(); });
}

/* ───────── 窓 ───────── */
const CSS=`
#bingoOverlay .bg-modal{ display:flex; flex-direction:column; }
.bg-body{ flex:1; min-height:0; overflow:auto; padding:8px 10px 0; color:var(--text,#222); font-size:15px; }
.bg-wrap{ max-width:1180px; margin:0 auto; padding-bottom:24px; }
.bgc0{ --c:#1e88e5; --cd:#0b3d91; --cl:#bbdefb; } .bgc1{ --c:#e53935; --cd:#8e1414; --cl:#ffcdd2; } .bgc2{ --c:#8e24aa; --cd:#4a0f72; --cl:#e1bee7; }
.bgc3{ --c:#2e9d4a; --cd:#145a27; --cl:#c8e6c9; } .bgc4{ --c:#ef6c00; --cd:#9a3f00; --cl:#ffe0b2; }
.bg-tabs{ display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:0 auto 8px; max-width:560px; }
.bg-tabs button{ min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:15.5px; font-weight:bold; cursor:pointer; }
.bg-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.bg-draw{ display:grid; grid-template-columns:minmax(0,1fr); gap:12px; align-items:start; }
.bg-draw[hidden], .bg-cardtab[hidden]{ display:none; }
@media (min-width:760px){ .bg-draw{ grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); } }
.bg-stage{ position:relative; width:100%; aspect-ratio:420/300; border-radius:16px; overflow:hidden; background:#ffe3bd; box-shadow:inset 0 0 0 1px rgba(120,132,156,.25); }
@supports not (aspect-ratio:1){ .bg-stage{ height:0; padding-top:71.43%; } }
.bg-stage canvas{ position:absolute; left:0; top:0; width:100%; height:100%; display:block; cursor:pointer; touch-action:manipulation; }
.bg-res{ display:flex; align-items:center; gap:14px; margin:12px 2px 0; min-height:118px; }
.bg-big{ --bs:clamp(96px, 30vw, 150px); position:relative; flex:none; width:var(--bs); height:var(--bs); border-radius:50%;
  background:radial-gradient(circle at 33% 28%, #fff 0, var(--cl) 14%, var(--c) 55%, var(--cd) 100%);
  box-shadow:0 10px 22px rgba(0,0,0,.28), inset -8px -12px 20px rgba(0,0,0,.22); display:flex; flex-direction:column; align-items:center; justify-content:center; }
.bg-big::before{ content:''; position:absolute; inset:20%; border-radius:50%; background:#fff; box-shadow:inset 0 -3px 8px rgba(0,0,0,.15), 0 0 0 2px rgba(255,255,255,.6); }
.bg-big small, .bg-big b{ position:relative; line-height:1; font-family:system-ui, sans-serif; }
.bg-big small{ font-size:calc(var(--bs)*.15); font-weight:900; color:var(--cd); margin-bottom:1px; }
.bg-big b{ font-size:calc(var(--bs)*.34); font-weight:900; color:#1a1a1a; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.bg-big.none, .bg-big.wait{ --c:#b0bec5; --cd:#607d8b; --cl:#eceff1; } .bg-big.none b, .bg-big.wait b{ color:#78909c; }
.bg-big.pop{ animation:bgPop .7s cubic-bezier(.2,.9,.3,1.3); }
.bg-big.wait{ animation:bgWob .9s ease-in-out infinite; }
@keyframes bgPop{ 0%{ transform:scale(.25) rotate(-220deg); opacity:.3; } 55%{ transform:scale(1.18) rotate(12deg); opacity:1; } 78%{ transform:scale(.95) rotate(-4deg); } 100%{ transform:scale(1) rotate(0); } }
@keyframes bgWob{ 0%,100%{ transform:rotate(-8deg); } 50%{ transform:rotate(8deg); } }
.bg-rt{ flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; align-items:flex-start; }
.bg-call{ font-size:clamp(26px, 8.4vw, 42px); font-weight:900; line-height:1.1; color:var(--text,#222); }
.bg-call.sm{ font-size:15.5px; font-weight:bold; line-height:1.5; color:var(--text-light,#666); }
.bg-sub{ font-size:14px; color:var(--text-light,#666); } .bg-sub b{ font-size:17px; color:var(--text,#222); }
.bg-say{ min-height:38px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.bg-go{ display:block; width:100%; min-height:66px; margin:12px 0 0; border-radius:18px; border:0; background:linear-gradient(180deg,#ff7a45,#e8491d); color:#fff; font-size:25px; font-weight:900; letter-spacing:.08em;
  box-shadow:0 5px 0 #a8360f, 0 10px 18px rgba(0,0,0,.18); cursor:pointer; text-shadow:0 1px 2px rgba(0,0,0,.25); }
.bg-go:active{ transform:translateY(3px); box-shadow:0 2px 0 #a8360f, 0 4px 8px rgba(0,0,0,.18); }
.bg-go.busy{ background:linear-gradient(180deg,#78909c,#546e7a); box-shadow:0 5px 0 #37474f, 0 10px 18px rgba(0,0,0,.18); }
.bg-go:disabled{ background:linear-gradient(180deg,#b0bec5,#90a4ae); box-shadow:none; cursor:default; transform:none; }
.bg-acts{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin:10px 0 0; }
.bg-b{ min-height:44px; padding:0 8px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.bg-b:disabled{ opacity:.45; cursor:default; } .bg-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.bg-sec{ border-radius:14px; border:1px solid rgba(120,132,156,.3); padding:8px; background:var(--modal-bg,#fff); }
.bg-sec + .bg-sec{ margin-top:10px; }
.bg-sec h4{ margin:2px 2px 8px; font-size:15px; display:flex; align-items:baseline; gap:6px; } .bg-sec h4 small{ font-weight:normal; color:var(--text-light,#666); font-size:13px; }
.bg-b75{ display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:5px; }
.bg-b75 .col{ display:flex; flex-direction:column; gap:3px; }
.bg-b75 .h{ display:flex; align-items:center; justify-content:center; height:34px; border-radius:9px; background:var(--c); color:#fff; font-size:21px; font-weight:900; }
.bg-bn{ display:grid; grid-template-columns:repeat(10,minmax(0,1fr)); gap:3px; }
.bn{ min-height:30px; padding:0; border-radius:8px; border:1px solid rgba(120,132,156,.28); background:transparent; color:var(--text-light,#666); font-size:15px; font-weight:bold; font-variant-numeric:tabular-nums; cursor:pointer; }
.bg-bn.big .bn{ font-size:13.5px; }
.bn.on{ background:var(--c); border-color:var(--c); color:#fff; }
.bn.last{ position:relative; z-index:1; box-shadow:0 0 0 3px #ffd54f, 0 0 12px 3px rgba(255,193,7,.75); animation:bgLast 1.1s ease-in-out infinite alternate; }
@keyframes bgLast{ from{ transform:scale(1); } to{ transform:scale(1.12); } }
.bg-hist{ display:flex; flex-wrap:wrap; gap:5px; }
.bg-hist .mb{ display:inline-flex; align-items:center; justify-content:center; min-width:46px; height:34px; padding:0 9px; border-radius:17px; background:var(--c); color:#fff; font-size:14.5px; font-weight:900; font-variant-numeric:tabular-nums; }
.bg-hist .mb i{ font-style:normal; font-size:10.5px; font-weight:bold; margin-right:5px; color:#fff; }
.bg-hist .mb.now{ box-shadow:0 0 0 3px #ffd54f; }
.bg-none{ font-size:13.5px; color:var(--text-light,#666); padding:4px; }
.bg-cinfo{ display:flex; align-items:baseline; justify-content:center; gap:10px; margin:2px 0 8px; } .bg-cinfo b{ font-size:17px; } .bg-cinfo span{ font-size:13.5px; color:var(--text-light,#666); }
.bg-card{ max-width:440px; margin:0 auto; padding:8px; border-radius:16px; border:2px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); }
.bg-card .hd, .bg-card .gr{ display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:5px; }
.bg-card .hd{ margin:0 0 5px; } .bg-card .hd b{ text-align:center; color:#fff; background:var(--c); border-radius:9px; font-size:24px; font-weight:900; padding:2px 0; }
.bg-card .cc{ position:relative; aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0; border-radius:10px; border:2px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222);
  font-size:clamp(20px, 6.4vw, 30px); font-weight:900; font-variant-numeric:tabular-nums; cursor:pointer; overflow:hidden; }
@supports not (aspect-ratio:1){ .bg-card .cc{ min-height:58px; } }
.bg-card .cc > span, .bg-card .cc > i, .bg-card .cc > small{ position:relative; z-index:1; }
.bg-card .cc.on::before{ content:''; position:absolute; inset:9%; border-radius:50%; background:rgba(229,57,53,.3); border:3px solid rgba(229,57,53,.85); }
.bg-card .cc.free{ background:#fff3c4; color:#7a5c00; } .bg-card .cc.free i{ font-style:normal; font-size:22px; line-height:1; color:#f9a825; } .bg-card .cc.free small{ font-size:11px; font-weight:bold; }
.bg-card .cc.win{ background:#ffe082; border-color:#ffb300; color:#222; }
.bg-card.sm{ max-width:300px; } .bg-card.sm .cc{ font-size:19px; cursor:default; } .bg-card.sm .hd b{ font-size:17px; }
.bg-cstat{ margin:10px auto 0; max-width:440px; text-align:center; font-size:16px; font-weight:bold; padding:8px 10px; border-radius:12px; background:rgba(120,132,156,.12); }
.bg-cstat.reach{ background:#fff3c4; color:#6d4c00; } .bg-cstat.win{ background:#e53935; color:#fff; font-size:18px; }
.bg-cardtab .bg-acts{ grid-template-columns:repeat(2,minmax(0,1fr)); max-width:440px; margin-left:auto; margin-right:auto; }
.bg-cardtab .bg-note{ max-width:600px; margin-left:auto; margin-right:auto; }
.bg-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.65; margin:12px 0 0; }
.bg-vh{ text-align:center; font-weight:bold; margin:0 0 6px; } .bg-vout{ margin:10px 0 0; }
.bg-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.bg-pop{ width:100%; max-width:600px; max-height:90%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.bg-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .bg-ph b{ flex:1; min-width:0; font-size:17px; }
.bg-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.bg-pop h5{ margin:14px 0 6px; font-size:14.5px; }
.bg-seg{ display:flex; flex-wrap:wrap; gap:6px; }
.bg-seg button{ min-height:42px; padding:0 13px; border-radius:21px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14.5px; cursor:pointer; }
.bg-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.bg-f{ display:flex; align-items:center; gap:8px; margin:8px 0; flex-wrap:wrap; } .bg-f > span{ min-width:6.6em; font-size:13px; font-weight:bold; color:var(--text-light,#666); }
.bg-f input{ flex:1 1 90px; min-width:0; max-width:200px; min-height:44px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:18px; box-sizing:border-box; }
.bg-f em{ font-style:normal; font-size:13px; color:var(--text-light,#666); }
.bg-code{ font-size:22px; letter-spacing:.14em; font-family:ui-monospace, Menlo, monospace; }
.bg-pacts{ display:flex; justify-content:flex-end; gap:6px; margin:12px 0 0; } .bg-pacts .bg-b{ min-width:7em; }
.bg-fx{ position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:25; }
.bg-banner{ display:none; position:absolute; left:50%; top:42%; z-index:26; pointer-events:none; padding:10px 28px; border-radius:24px; background:#e53935; color:#fff; font-size:clamp(34px, 11vw, 84px); font-weight:900; white-space:nowrap; box-shadow:0 10px 30px rgba(0,0,0,.35); transform:translate(-50%,-50%); }
.bg-banner.on{ display:block; animation:bgBan 2.4s ease forwards; } .bg-banner.reach{ background:#e65100; } .bg-banner.all{ background:#6a1b9a; }
@keyframes bgBan{ 0%{ transform:translate(-50%,-50%) scale(.3); opacity:0; } 14%{ transform:translate(-50%,-50%) scale(1.15); opacity:1; } 24%{ transform:translate(-50%,-50%) scale(1); } 80%{ opacity:1; } 100%{ transform:translate(-50%,-50%) scale(1.04); opacity:0; } }
.bg-showx{ display:none; }
.bg-modal.show{ background:radial-gradient(ellipse at 50% 0%, #34306b, #141633 72%); }
.bg-modal.show > .modal-header, .bg-modal.show .bg-tabs, .bg-modal.show .bg-acts, .bg-modal.show .bg-histsec, .bg-modal.show .bg-say{ display:none; }
.bg-modal.show .bg-body{ padding:calc(8px + var(--safe-top,0px)) 12px 10px; }
.bg-modal.show .bg-wrap{ max-width:none; padding-bottom:0; }
.bg-modal.show .bg-showx{ display:flex; align-items:center; position:absolute; top:calc(8px + var(--safe-top,0px)); left:10px; z-index:8; min-height:40px; padding:0 14px; border-radius:20px; border:1px solid rgba(255,255,255,.5); background:rgba(0,0,0,.45); color:#fff; font-size:14px; font-weight:bold; cursor:pointer; }
.bg-modal.show .bg-call{ color:#fff; } .bg-modal.show .bg-call.sm, .bg-modal.show .bg-sub{ color:#cfd8dc; } .bg-modal.show .bg-sub b{ color:#fff; }
.bg-modal.show .bg-sec{ background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.18); }
.bg-modal.show .bg-sec h4{ color:#fff; } .bg-modal.show .bg-sec h4 small{ color:#cfd8dc; }
.bg-modal.show .bn{ color:#b0bec5; border-color:rgba(255,255,255,.2); } .bg-modal.show .bn.on{ color:#fff; border-color:var(--c); }
@media (orientation:landscape){
  .bg-modal.show .bg-draw{ grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); }
  .bg-modal.show .bg-stage{ width:min(100%, calc((100vh - 230px)*1.4)); margin:0 auto; }
  .bg-modal.show .bg-res{ justify-content:center; min-height:0; }
  .bg-modal.show .bg-big{ --bs:clamp(96px, 22vh, 220px); }
  .bg-modal.show .bg-call{ font-size:clamp(32px, 9vh, 76px); }
  .bg-modal.show .bg-rt{ flex:0 1 auto; }
  .bg-modal.show .bg-go{ max-width:520px; margin-left:auto; margin-right:auto; }
  .bg-modal.show .bg-b75 .h{ height:calc((100vh - 110px)/16); font-size:clamp(18px, 3.4vh, 32px); }
  .bg-modal.show .bn{ min-height:calc((100vh - 110px)/16 - 3px); font-size:clamp(14px, 2.7vh, 26px); }
}
@media (max-width:380px){ .bg-acts .bg-b{ font-size:13px; padding:0 4px; } .bg-res{ gap:10px; } }
`+DOC.replace(/\.bg-doc/g, '#printArea .bg-doc');
function ensureDom(){
  if($('bingoOverlay')) return;
  const s=document.createElement('style'); s.id='bgStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="bingoOverlay">
  <div class="modal vol-modal bg-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🎱 ビンゴ</span><button class="modal-close" onclick="closeBingo()" aria-label="閉じる">✕</button></div>
    <div class="bg-body" id="bgBody"><div class="bg-wrap">
      <div class="bg-tabs" id="bgTabs" role="tablist"></div>
      <div class="bg-draw" id="bgDraw">
        <div class="bg-left">
          <div class="bg-stage" id="bgStage"><canvas id="bgCv" role="img" aria-label="ビンゴの 抽選器（押すと まわります）"></canvas></div>
          <div class="bg-res" id="bgRes" aria-live="polite"></div>
          <button type="button" class="bg-go" id="bgGo" onclick="BINGO.spin()">🎱 まわす</button>
          <div class="bg-acts" id="bgActs"></div>
        </div>
        <div class="bg-right">
          <section class="bg-sec"><h4>📋 出た 数 <small id="bgCnt"></small></h4><div id="bgBoard"></div></section>
          <section class="bg-sec bg-histsec"><h4>🕘 出た 順 <small>（新しい 順）</small></h4><div class="bg-hist" id="bgHist"></div></section>
        </div>
      </div>
      <div class="bg-cardtab" id="bgCardTab" hidden></div>
    </div></div>
    <button type="button" class="bg-showx" onclick="BINGO.show(false)">✕ もどす</button>
    <div class="bg-banner" id="bgBanner" aria-live="polite"></div>
    <canvas class="bg-fx" id="bgFx" aria-hidden="true"></canvas>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('bingoOverlay');
  M.cv=$('bgCv'); M.g=M.cv.getContext('2d');
  M.cv.addEventListener('click', ()=>spin());
  $('bgBoard').addEventListener('click', e=>{ const b=e.target.closest('button[data-n]'); if(b) boardTap(+b.dataset.n); });
  $('bgCardTab').addEventListener('click', e=>{ const b=e.target.closest('.bg-card button[data-i]'); if(b) cardMark(+b.dataset.i); });
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の 電卓キーに 届かないように
  // Esc は 小さな窓・大きく から 閉じる。スペースで まわす（文字を 入れる ところ・ボタンの 上 では しない）
  window.addEventListener('keydown', e=>{
    if(!isDlgOpen('bingoOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    if(e.key==='Escape'){
      if(pop){ e.preventDefault(); e.stopImmediatePropagation(); popClose(); }
      else if(isShow()){ e.preventDefault(); e.stopImmediatePropagation(); show(false); }
      return;
    }
    const tg=(e.target && e.target.tagName)||'';
    if(e.key===' ' && !pop && st && st.tab==='draw' && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tg)){ e.preventDefault(); e.stopImmediatePropagation(); spin(); }
  }, true);
  if(window.ResizeObserver) new ResizeObserver(()=>{ if(isDlgOpen('bingoOverlay')) mResize(); }).observe($('bgStage'));
  window.addEventListener('resize', ()=>{ if(isDlgOpen('bingoOverlay')) mResize(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){
  popClose(); if(isShow()) show(false);
  if(busy){ busy=null; mCancel(); }
  rumbleOff(); clearTimeout(banT); const bn=$('bgBanner'); if(bn) bn.className='bg-banner';
  try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(_){}
  if(M.raf){ cancelAnimationFrame(M.raf); M.raf=0; } M.last=0;
  if(FX.raf){ cancelAnimationFrame(FX.raf); FX.raf=0; } FX.ps=[];
}
function openBingo(){
  ensureDom(); load(); busy=null;
  openDlg('bingoOverlay', cleanup);
  render(); mSync(!M.balls.length); mResize(); wake();
}
function closeBingo(){ if(!$('bingoOverlay') || !isDlgOpen('bingoOverlay')) return; closeDlg('bingoOverlay', cleanup); }

window.BINGO={ spin, skip, undo:()=>{ undo(); }, reset:()=>{ reset(); }, tab:setTab, set:setOpt, setMax:v=>{ setMax(v); }, sayAgain, show:on=>show(!!on),
  setPop, verifyPop, printPop, print:printCards, newCode:()=>{ newCodeAsk(); }, copy, text, close:()=>popClose(),
  cardNew:()=>{ cardNew(); }, cardNoPop, cardMake:(c,n)=>cardMake(c,n), cardClear:()=>{ cardClear(); }, mark:cardMark,
  // ためす とき 用
  state:()=>JSON.parse(JSON.stringify(st)), phase:()=>M.ph, busy:()=>!!busy, played:()=>played.slice(), said:()=>lastSaid, add:n=>addNum(+n), tap:n=>boardTap(+n),
  balls:()=>M.balls.length, out:()=>M.out ? {n:M.out.n, rest:!!M.out.rest} : null, cardNums, call:n=>callText(n), isShow,
  judge:(nums, drawn)=>{ const s=new Set(drawn), J=judge(nums, n=>s.has(n)); return {bingo:J.bingo, need:J.need, text:judgeText(J)}; } };
Object.assign(window, { openBingo, closeBingo });
})();
