/* ⏱ ど派手タイマー（v575。表電卓の道具。はじめて開いたときに読む。apps/hadetimer/ から単独のアプリとしても開ける）
   ・⏳ タイマー（決めた時間から 0 へ）・⏱ ストップウォッチ（ラップつき）・🔁 くり返し（がんばる／休む を 決めた回数。運動に）。
   ・全画面に 大きな数字と 光の輪。数字が かわるたびに 前の数字が はじけ飛び、背景（hade-fx.js の 6つの テーマ）も 動く。
     時間が へるほど 背景が 激しくなり（星が 流れる・炎が 高くなる・遠くの花火が ふえる）、半分・のこり5分／3分／1分／30秒で 知らせる。
     のこり10秒は 大きな数字が 1つずつ 飛び出し、心臓の音と ゆれで 盛り上げる（3・2・1 は 爆発）。
     0 で 花火・紙ふぶき・絵文字・ファンファーレ。「✓ 止める」を 押すまで 2.6秒ごとに 鳴らす（1分で 音は やめる）。
   ・時間は 時・分・秒を 打つか「＋1分」などの ボタン。⭐ よく使う時間（名前つき。12まで）を 残せる。
   ・動いているあいだは 画面を消さない（対応している端末）。「← 戻る」で 閉じても 時間は 進み、画面の 右下に 残りの時間が 出る
     （押すと もどる）。0 になったら 開いて 知らせる。アプリを 閉じていたあいだに 0 になったときは、次に開いたときに 知らせる。
   ・えらんだもの・よく使う時間・動いているタイマーは excalc_hadetimer（この端末の中だけ）。 */
(function(){
'use strict';
const FX=window.HADE_FX;
const KEY='excalc_hadetimer', MAX_PRE=12, MAX_SEC=99*3600+59*60+59, MAX_LAP=99, PREP=3000, ALARM_MS=60000;
const MODES=[['down','⏳ タイマー'],['up','⏱ ストップウォッチ'],['iv','🔁 くり返し']];
const DEF_PRE=[{n:'カップめん',s:180},{n:'ゆでたまご',s:480},{n:'歯みがき',s:180},{n:'ひと休み',s:600}];
const QUICK=[[10,'＋10秒'],[30,'＋30秒'],[60,'＋1分'],[300,'＋5分'],[600,'＋10分']];
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
  if(r.m==='up' || r.m==='iv'){
    const s0=num(r.s0, 0, BIG), acc=num(r.acc, 0, BIG); if(s0==null || acc==null) return null;
    const o={m:r.m, s0, acc, p:!!r.p, done:!!r.done, id};
    if(r.m==='up') o.laps=(Array.isArray(r.laps) ? r.laps : []).map(x=>num(x,0,BIG)).filter(x=>x!=null).slice(0, MAX_LAP);
    else { o.w=int(r.w,5,3600,20); o.r=int(r.r,0,3600,10); o.n=int(r.n,1,99,8); }
    return o;
  }
  return null;
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const pre=Array.isArray(o.pre) ? o.pre.filter(p=>p && typeof p==='object').map(p=>({n:oneLine(p.n,16), s:int(p.s,1,MAX_SEC,0)})).filter(p=>p.n && p.s).slice(0, MAX_PRE) : DEF_PRE.map(p=>({n:p.n, s:p.s}));
  const iv=(o.iv && typeof o.iv==='object') ? o.iv : {};
  st={mode:MODES.some(m=>m[0]===o.mode) ? o.mode : 'down', sec:int(o.sec,1,MAX_SEC,180),
    theme:FX.hasTheme(o.theme) ? o.theme : 'hanabi', level:FX.hasLevel(o.level) ? o.level : (reduceMotion() ? 'calm' : 'max'),
    snd:o.snd!==false, vibe:o.vibe!==false, flash:o.flash!==false, pre, iv:{w:int(iv.w,5,3600,20), r:int(iv.r,0,3600,10), n:int(iv.n,1,99,8)}, run:cleanRun(o.run)};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }
const vib=p=>{ if(st && st.vibe) FX.vib(p); };
const snd=(name, ...a)=>{ const f=FX.snd[name]; if(f && st && st.snd) f(...a); };   // 音は この道具の 設定で（カウンターと 別々）

/* ───────── 時間の 計算 ───────── */
const elapsed=(r, now)=>r.p ? r.acc : r.acc+Math.max(0, now-r.s0);
function ivPhase(r, el){
  const w=r.w*1000, rs=r.r*1000;
  if(el<PREP) return {ph:'prep', round:0, left:PREP-el, len:PREP};
  let x=el-PREP;
  for(let i=1;i<=r.n;i++){
    if(x<w) return {ph:'work', round:i, left:w-x, len:w};
    x-=w;
    if(i<r.n && rs>0){ if(x<rs) return {ph:'rest', round:i, left:rs-x, len:rs}; x-=rs; }
  }
  return {ph:'done', round:r.n, left:0, len:1};
}
const ivTotal=iv=>PREP+iv.n*iv.w*1000+(iv.n-1)*iv.r*1000;
function viewOf(r, now){
  if(!r) return st.mode==='up' ? {mode:'up', str:fmtUp(0), frac:0, sec:0, min:0, ms:0}
    : st.mode==='iv' ? {mode:'iv', str:hms(st.iv.w), frac:1, sec:st.iv.w, ms:st.iv.w*1000, ph:{ph:'prep', round:0, left:0, len:1}}
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
  const fill=g.createLinearGradient(0, cy-fs*0.5, 0, cy+fs*0.5); fill.addColorStop(0, ink[0]); fill.addColorStop(1, o.col||ink[1]);
  for(let i=0;i<chars.length;i++){
    const ch=chars[i], w=ws[i], mx=x+w/2; x+=w;
    if(!same) this.pop[i]=null;
    else if(this.prev[i]!==ch && (dot<0 || i<dot) && !o.still){
      this.pop[i]=t;
      if(/[0-9]/.test(this.prev[i])) this.fly.push({ch:this.prev[i], x:mx, y:cy, fs, t0:t, vx:rnd(-1,1)*fs*1.2, rot:rnd(-1.2,1.2)});
      if(o.sparks) e.burst(mx, cy, {n:o.sparks, sp:260, ring:false, life:0.7});
    }
    const k=this.pop[i]!=null ? Math.max(0, 1-(t-this.pop[i])/0.4) : 0, s=1+0.38*Math.sin(k*Math.PI)*k;
    g.save(); g.translate(mx, cy); g.scale(s, s);
    if(e.level!=='calm'){ g.shadowColor=o.glow||ink[2]; g.shadowBlur=fs*0.16; }
    g.lineJoin='round'; g.lineWidth=fs*0.07; g.strokeStyle='rgba(0,0,0,.55)'; g.strokeText(ch, 0, 0);
    g.fillStyle=fill; g.fillText(ch, 0, 0); g.restore();
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
// 赤い ふち（のこり10秒の どきどき）
function vignette(g, W, H, a, col){
  if(a<=0.01) return;
  const gr=g.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col||('rgba(255,20,20,'+a.toFixed(3)+')'));
  g.save(); g.fillStyle=gr; g.fillRect(0, 0, W, H); g.restore();
}

/* ───────── 全画面（ステージ）───────── */
let sc=null, stageRel=null, wl=null, raf=0, lastTs=0, frozen=false, prevSec=null, prevMin=null, prevPh=null, prevTenth=null;
let alarmOn=false, alarmUntil=0, nextAlarm=0, banT=0, ticker=0, pv=null, cur=null, overNote='';
const stageOpen=()=>!!$('htFull');
function openStage(){
  if(stageOpen()){ paintBar(); return; }
  if(!st.run) return;
  FX.unlock();
  const el=document.createElement('div'); el.className='ht-full'; el.id='htFull'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','ど派手タイマー');
  el.innerHTML=`<canvas id="htCv"></canvas><div class="ht-top"><span id="htLab"></span><span id="htSub"></span></div>
    <div class="ht-ban" id="htBan" aria-live="polite"></div><div class="ht-laps" id="htLaps"></div>
    <button type="button" class="ht-stop" id="htStop" hidden onclick="HADE_TIMER.stopAlarm()">✓ 止める</button>
    <div class="ht-bar" id="htBar"></div>`;
  document.body.appendChild(el);
  sc=new Scene($('htCv')); sc.e.setTheme(st.theme); sc.e.setLevel(st.level); sc.e.noFlash=!st.flash;
  sc.e.onCrackle=()=>snd('crackle');
  sc.e.onBoom=()=>{ if(Math.random()<0.6) snd('boom'); };
  $('htCv').addEventListener('pointerdown', stageTap);
  stageRel=typeof modalBack==='function' ? modalBack(()=>closeStage(true)) : null;
  window.addEventListener('keydown', stageKey, true);
  window.addEventListener('resize', onResize);
  prevSec=prevMin=prevPh=prevTenth=null;
  wake(); paintBar(); paintLaps(); hideChip(); loop();
}
function closeStage(byBack){
  const el=$('htFull'); if(!el) return;
  el.remove(); sc=null;
  window.removeEventListener('keydown', stageKey, true); window.removeEventListener('resize', onResize);
  if(!byBack && stageRel) stageRel(); stageRel=null;
  unwake(); alarmOn=false;
  if(st.run && st.run.done){ st.run=null; save(); }   // 終わった タイマーは 閉じたら おしまい
  if(st.run) startTicker(); else { stopTicker(); hideChip(); }
  if($('hadeTimerOverlay') && isDlgOpen('hadeTimerOverlay')){ render(); loop(); }
  else paintChip();
}
function onResize(){ if(sc) sc.e.resize(); if(pv) pv.e.resize(); }
function stageKey(e){
  if(!stageOpen()) return;
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); if(alarmOn) stopAlarm(); else closeStage(); }
  else if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); if(alarmOn) stopAlarm(); else togglePause(); }
  else if((e.key==='l' || e.key==='L') && st.run && st.run.m==='up'){ e.preventDefault(); e.stopPropagation(); lap(); }
}
function stageTap(ev){
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
  b.innerHTML=r.done ? B('restart()','↺ もう一度','pri')+(r.m==='down' ? B('plus(60)','＋1分') : '')+B('back()','← 戻る')
    : pp+mid+B('restart()','↺ 最初から')+B('stop()','■ やめる')+B('back()','← 戻る');
  const f=$('htFull'); if(f) f.style.setProperty('--ht-bar', (b.offsetHeight+10)+'px');   // ボタンが 2段に なっても 上に 出す
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
  b.className='ht-ban '+(kind||''); b.textContent=text; fitBan(b, text, kind); void b.offsetWidth; b.classList.add('go');
  clearTimeout(banT); banT=setTimeout(()=>{ const x=$('htBan'); if(x) x.classList.remove('go'); }, kind==='big' ? 4200 : 1900);
}

/* ───────── 操作 ───────── */
function start(){
  FX.unlock(); stopAlarm(true);
  const now=Date.now();
  if(st.mode==='down'){
    if(!(st.sec>0)){ toastT('時間を 決めてください'); return; }
    st.run={m:'down', dur:st.sec*1000, end:now+st.sec*1000, left:0, p:false, done:false, name:picked, id:rid()};
  } else if(st.mode==='up') st.run={m:'up', s0:now, acc:0, p:false, done:false, laps:[], id:rid()};
  else st.run={m:'iv', w:st.iv.w, r:st.iv.r, n:st.iv.n, s0:now, acc:0, p:false, done:false, id:rid()};
  marks=new Set(); overNote=''; save();
  openStage();
  if(sc){ const e=sc.e; e.after(0.05, ()=>{ e.burst(e.W/2, e.H*0.46, {n:70, sp:520}); e.kick(0.5); }); }
  banner(st.mode==='iv' ? 'よーい！' : 'スタート！', 'go1'); snd(st.mode==='iv' ? 'drum' : 'whoosh', 18); vib(60);
}
function pause(){
  const r=st.run; if(!r || r.p || r.done) return;
  const now=Date.now(); if(r.m==='down') r.left=Math.max(0, r.end-now); else r.acc+=Math.max(0, now-r.s0);
  r.p=true; save(); paintBar(); banner('一時停止', 's'); snd('down');
}
function resume(){
  const r=st.run; if(!r || !r.p || r.done) return;
  const now=Date.now(); if(r.m==='down') r.end=now+r.left; else r.s0=now;
  r.p=false; save(); paintBar(); banner('再開！', 's'); snd('whoosh');
}
function togglePause(){ const r=st.run; if(!r || r.done) return; if(r.p) resume(); else pause(); }
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
  const r=st.run; if(!r) return;
  const now=Date.now(); stopAlarm(true); marks=new Set(); overNote=''; if(sc) sc.big=null;
  if(r.m==='down'){ r.end=now+r.dur; r.left=0; }
  else { r.s0=now; r.acc=0; if(r.m==='up') r.laps=[]; }
  r.p=false; r.done=false; save(); prevSec=prevMin=prevPh=null; paintBar(); paintLaps();
  banner('もう一度！', 'go1'); snd('whoosh'); if(sc) sc.e.burst(sc.e.W/2, sc.e.H*0.46, {n:60, sp:480});
}
function stop(){ stopAlarm(true); st.run=null; save(); stopTicker(); hideChip(); closeStage(); }
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
  alarmOn=true; alarmUntil=now+ALARM_MS; nextAlarm=now+3200;
  const b=$('htStop'); if(b) b.hidden=false;
  paintBar();
  banner(r.m==='iv' ? 'おつかれさま！' : 'TIME UP!', 'big');
  if(sc){ const e=sc.e; e.finale({shells:14, conf:200, emo:['🎉','✨','🎊','⭐','🥳'], flash:'#fff3c4'}); e.burst(e.W/2, e.H*0.46, {n:120, sp:700}); }
  snd('fanfare'); vib([300,120,300,120,600]);
}
function alarmStep(now){
  if(!alarmOn) return;
  if(now>alarmUntil){ alarmOn=false; return; }
  if(now>=nextAlarm){
    nextAlarm=now+2600; snd('alarm'); vib([200,100,200]);
    if(sc){ const e=sc.e; e.shell(null, {sc:1.1}); e.shell(null, {sc:1}); e.flash('#ffffff', 0.3); e.kick(0.4); }
  }
}

/* ───────── 1こま ごとの 動き ───────── */
function onSecond(v){
  const e=sc.e, s=v.sec, r=st.run; e.pulse=1;
  if(r.m==='down'){
    if(s<=10 && s>=1){
      sc.big={n:s, t0:e.t};
      if(s<=3){ snd('boom'); snd('beep', 1320, 0.16); e.kick(0.9); e.flash('#ff3030', 0.32); vib(140); e.burst(e.W/2, e.H*0.46, {n:90, sp:620, pal:['#ff3b30','#ffb000','#ffffff']}); }
      else { snd('heart'); snd('beep', 660+(10-s)*45, 0.09); e.kick(0.3+(10-s)*0.04); vib(40); e.burst(e.W/2, e.H*0.46, {n:30, sp:380, pal:['#ff6a3d','#ffd23f']}); }
    }
    const dur=r.dur, ms=v.ms;
    if(dur>=20000 && !marks.has('half') && ms<=dur/2){ marks.add('half'); banner('半分 すぎた！'); snd('whoosh'); e.confetti(50); }
    for(const m of [5,3,1]){ if(dur>(m*60+30)*1000 && s===m*60 && !marks.has('m'+m)){ marks.add('m'+m); banner('のこり '+m+'分！'); snd('taiko'); e.shell(null); e.shell(null); vib([80,60,80]); } }
    if(dur>60000 && s===30 && !marks.has('s30')){ marks.add('s30'); banner('のこり 30秒！'); snd('taiko'); e.kick(0.5); }
  } else if(r.m==='iv'){
    if(s<=3 && s>=1 && v.ph.ph!=='done'){ snd('beep', v.ph.ph==='work' ? 1046 : 784, 0.1); e.kick(0.25); vib(30); }
  }
}
function onPhase(ph){
  const e=sc.e, r=st.run;
  if(ph.ph==='prep') return;
  if(ph.ph==='work'){ banner('ROUND '+ph.round+'/'+r.n+'  がんばれ！', 'go1'); snd('whistle'); e.burst(e.W/2, e.H*0.46, {n:80, sp:600, pal:['#ff3b30','#ffb000','#ffffff']}); e.kick(0.7); e.flash('#ff6a3d', 0.28); vib([90,60,90]); }
  else if(ph.ph==='rest'){ banner('休けい  あと '+(r.n-ph.round)+'回', 's'); snd('chime'); e.confetti(40, {pal:['#7cf0ff','#a8ffcf','#ffffff']}); vib(60); }
}
function update(){
  const r=st.run; if(!r || !sc) return;
  const now=Date.now(), v=viewOf(r, now), e=sc.e; cur=v;
  if(v.mode==='down'){ const pg=1-v.frac; e.warp=Math.min(1, pg*pg*1.1+(v.sec<=10 && !r.done ? 0.35 : 0)); e.heat=Math.min(1, pg); e.amb=0.3+0.7*pg; }
  else if(v.mode==='up'){ e.warp=0.3; e.heat=0.45; e.amb=0.45; }
  else { const wk=v.ph.ph==='work'; e.warp=wk ? 0.75 : 0.12; e.heat=wk ? 0.85 : 0.2; e.amb=wk ? 0.7 : 0.3; }
  if(r.done){ e.amb=1; e.warp=0.9; e.heat=1; alarmStep(now); prevSec=v.sec; return; }
  if(r.p){ prevSec=v.sec; return; }
  if(isOver(r, now)){ finish(); return; }
  if(v.mode==='iv'){ const key=v.ph.ph+v.ph.round; if(prevPh!=null && key!==prevPh) onPhase(v.ph); prevPh=key; }
  if(v.mode==='up'){
    if(prevMin!=null && v.min>prevMin){ banner(v.min+'分！', 'go1'); snd('level'); e.shell(null); e.shell(null); e.shell(null); vib([60,40,60]); }
    prevMin=v.min;
    const ten=Math.floor(v.sec/10); if(prevTenth!=null && ten>prevTenth && sc.head) e.burst(sc.head[0], sc.head[1], {n:24, sp:260}); prevTenth=ten;
  }
  if(prevSec!=null && v.sec!==prevSec) onSecond(v);
  prevSec=v.sec;
}
function paintStage(){
  const e=sc.e, g=e.g, W=e.W, H=e.H, d=e.d, r=st.run, v=cur || viewOf(r, Date.now());
  e.drawBg();
  const [ox,oy]=e.offset(); g.save(); g.translate(ox, oy);
  const cx=W/2, cy=H*0.47, R=Math.min(W*0.44, H*0.36);
  // のこり10秒の 赤い どきどき
  const last10=r && r.m==='down' && !r.done && !r.p && v.sec<=10;
  if(last10){ const ph=(Date.now()%1000)/1000; vignette(g, W, H, 0.22+0.3*Math.pow(1-ph,2)); }
  let col=null;
  if(v.mode==='iv'){ col=v.ph.ph==='work' ? {c1:'#ff3b30', c2:'#ffd23f'} : v.ph.ph==='rest' ? {c1:'#00e0ff', c2:'#a8ffcf'} : {c1:'#ffffff', c2:'#b0b8ff'}; }
  sc.ring(v.mode==='up' ? v.frac : v.frac, cx, cy, R, Object.assign({emit:r && !r.p && !r.done ? (e.level==='calm' ? 0.25 : 0.9) : 0, back:v.mode!=='up'}, col||{}));
  if(last10 && sc.big){ const ph=Math.min(1, (e.t-sc.big.t0)/1); sc.bigNum(sc.big.n, ph, cx, cy, R); }
  else {
    const units=Array.from(v.str).reduce((a,ch)=>a+(/[0-9]/.test(ch) ? 1 : 0.46), 0), fs=Math.min(R*1.55/(units*0.62), R*0.62);
    sc.digits(v.str, cx, cy, fs, {sparks:e.level==='calm' ? 0 : 8, col:col ? col.c2 : null, glow:col ? col.c1 : null});
    if(r && r.p){ g.save(); g.font='bold '+Math.round(fs*0.28)+'px '+NUMF; g.textAlign='center'; g.fillStyle='rgba(255,255,255,'+(0.55+0.45*Math.sin(e.t*4))+')'; g.fillText('一時停止中', cx, cy+fs*0.85); g.restore(); }
  }
  g.restore();
  g.save(); g.translate(ox, oy); e.drawFx(); g.restore();
  // 上の文字
  const lab=$('htLab'), sub=$('htSub');
  if(lab){
    let a='', b='';
    if(r.m==='down'){ a='⏳ '+(r.name || lenTxt(r.dur/1000)); b=r.done ? (overNote || 'おわり') : ''; }
    else if(r.m==='up'){ a='⏱ ストップウォッチ'; b=r.laps.length ? 'ラップ '+r.laps.length : ''; }
    else { a='🔁 くり返し'; b=v.ph.ph==='prep' ? 'よーい' : v.ph.ph==='done' ? 'おわり' : 'ROUND '+v.ph.round+'/'+r.n+' ・ '+(v.ph.ph==='work' ? 'がんばる' : '休けい'); }
    if(lab.textContent!==a) lab.textContent=a; if(sub.textContent!==b) sub.textContent=b;
  }
}
// 見本（設定の画面の 上）
function paintPrev(){
  const c=$('htPrev'); if(!c) return;
  if(!pv || pv.e.cv!==c){ pv=new Scene(c); }
  const e=pv.e; e.setTheme(st.theme); e.setLevel(st.level); e.noFlash=!st.flash; e.resize(); e.amb=0.6; e.warp=0.35; e.heat=0.55;
  const r=st.run, v=viewOf(r, Date.now()), W=e.W, H=e.H, R=Math.min(W*0.4, H*0.4);
  e.drawBg();
  pv.ring(r ? v.frac : 0.72, W/2, H*0.5, R, {emit:0.5});
  const units=Array.from(v.str).reduce((a,ch)=>a+(/[0-9]/.test(ch) ? 1 : 0.46), 0), fs=Math.min(R*1.55/(units*0.62), R*0.62);
  pv.digits(v.str, W/2, H*0.5, fs, {sparks:3});
  e.drawFx();
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
  const r=st && st.run; if(!r){ stopTicker(); hideChip(); return; }
  if(stageOpen()) return;
  if(isOver(r, Date.now())){ finish(); return; }
  paintChip(); paintRunCard();
}
function chipText(){
  const r=st.run; if(!r) return '';
  const v=viewOf(r, Date.now());
  return (r.m==='down' ? '⏳ ' : r.m==='up' ? '⏱ ' : '🔁 ')+(r.p ? '⏸ ' : '')+(r.done ? 'おわり' : r.m==='up' ? hms(Math.floor(v.ms/1000)) : v.str);
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
    <button type="button" class="ht-go" onclick="HADE_TIMER.start()">▶ スタート</button>
    <div class="ht-sec"><h4>🎆 演出</h4>
      <div class="ht-opt"><span>テーマ</span>${FX.THEMES.map(([v,n])=>`<button type="button" class="th th-${v}${st.theme===v?' on':''}" onclick='HADE_TIMER.opt("theme", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>
      ${opt('level', FX.LEVELS, '演出の 強さ')}
      ${opt('snd', [[true,'🔊 鳴らす'],[false,'🔇 鳴らさない']], '音')}
      ${opt('vibe', [[true,'ふるえる'],[false,'ふるえない']], '振動')}
      ${opt('flash', [[true,'光る'],[false,'光らない']], '画面の 点滅')}
      <p class="ht-note">全画面のあいだは 画面を消しません（対応している端末）。「← 戻る」で 閉じても 時間は 進み、右下に 残りの時間が 出ます。0 になると 開いて 知らせます（アプリを 閉じていたときは 次に開いたとき）。光が まぶしいときは「ひかえめ」か「光らない」に。</p></div>
  </div>`;
  paintRunCard(); loop();
}
function setMode(k){ if(!MODES.some(m=>m[0]===k)) return; st.mode=k; save(); render(); }
function setOpt(k, v){
  if(k==='theme'){ if(!FX.hasTheme(v)) return; st.theme=v; }
  else if(k==='level'){ if(!FX.hasLevel(v)) return; st.level=v; }
  else if(k==='snd' || k==='vibe' || k==='flash'){ st[k]=v===true || v==='true'; }
  else return;
  save(); render();
  if(pv){ const e=pv.e; e.setTheme(st.theme); e.setLevel(st.level); e.noFlash=!st.flash; e.resize(); e.burst(e.W/2, e.H/2, {n:50, sp:400}); if(k==='theme') e.shell(null, {sc:0.8}); }
  if(k==='snd' && st.snd){ FX.unlock(); snd('coin'); }
  if(k==='vibe' && st.vibe) vib(50);
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

/* ───────── 窓 ───────── */
const HT_CSS=`
#hadeTimerOverlay .ht-modal{ display:flex; flex-direction:column; }
.ht-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.ht-wrap{ max-width:760px; margin:0 auto; }
.ht-prev{ display:block; width:100%; height:min(44vw,230px); border-radius:18px; background:#05061a; cursor:pointer; box-shadow:0 6px 22px rgba(40,0,80,.35); }
.ht-modes{ display:grid; grid-template-columns:repeat(3,1fr); gap:5px; margin:10px 0 8px; }
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
.ht-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:6px 0; } .ht-opt span{ min-width:5.4em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.ht-opt button{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.ht-opt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.ht-opt button.th:not(.on){ color:#fff; border-color:transparent; text-shadow:0 1px 2px rgba(0,0,0,.6); }
.ht-opt button.th-hanabi:not(.on){ background:linear-gradient(135deg,#03061a,#2b1b4c); } .ht-opt button.th-uchu:not(.on){ background:linear-gradient(135deg,#02030c,#2a1a6e); }
.ht-opt button.th-neon:not(.on){ background:linear-gradient(135deg,#24004a,#ff2bd6); } .ht-opt button.th-matsuri:not(.on){ background:linear-gradient(135deg,#2a0b25,#a3121b); }
.ht-opt button.th-honoo:not(.on){ background:linear-gradient(135deg,#1a0300,#ff4500); } .ht-opt button.th-yume:not(.on){ background:linear-gradient(135deg,#b04f8a,#6a54c8); }
.ht-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; } .ht-note.big{ font-size:14px; }
.ht-full{ position:fixed; inset:0; z-index:99990; background:#000; overflow:hidden; touch-action:manipulation; user-select:none; -webkit-user-select:none; }
.ht-full canvas{ position:absolute; inset:0; width:100%; height:100%; display:block; }
.ht-top{ position:absolute; left:0; right:0; top:calc(8px + var(--safe-top,0px)); display:flex; flex-direction:column; align-items:center; gap:2px; pointer-events:none; color:#fff; text-shadow:0 2px 6px rgba(0,0,0,.8); }
.ht-top #htLab{ font-size:clamp(16px,4.6vw,26px); font-weight:bold; } .ht-top #htSub{ font-size:clamp(13px,3.6vw,20px); font-weight:bold; opacity:.92; }
.ht-ban{ position:absolute; left:4%; right:4%; top:16%; white-space:nowrap; text-align:center; font-weight:900; font-size:clamp(30px,10vw,86px); line-height:1.1; color:#fff; pointer-events:none; opacity:0;
  background:linear-gradient(90deg,#fff36b,#ff8a3d,#ff2bd6,#7cf0ff,#fff36b); background-size:300% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 10px rgba(255,255,255,.55)) drop-shadow(0 4px 2px rgba(0,0,0,.6)); }
.ht-ban.s{ font-size:clamp(24px,7.5vw,60px); }
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
.ht-bar{ position:absolute; left:0; right:0; bottom:0; display:flex; gap:6px; padding:8px 10px calc(10px + var(--safe-bottom,0px)); justify-content:center; flex-wrap:wrap; background:linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,0)); }
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
}
function openHadeTimer(fromRun){
  ensureDom();
  if(!st || fromRun!==true) load();
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
  start, pause, resume, toggle:togglePause, plus, restart, stop, back, lap, next, stopAlarm:()=>stopAlarm(), show,
  state:()=>JSON.parse(JSON.stringify(st)), view:()=>{ const v=viewOf(st.run, Date.now()); return {str:v.str, frac:+v.frac.toFixed(4), sec:v.sec, ph:v.ph ? v.ph.ph+':'+v.ph.round : ''}; },
  stage:stageOpen, alarm:()=>alarmOn, chip:()=>{ const c=$('htChip'); return c ? c.textContent : ''; }, fx:()=>({n:sc ? sc.e.count() : 0, prev:pv ? pv.e.count() : 0, played:FX.played()}),
  banner:()=>{ const b=$('htBan'); return b ? b.textContent : ''; }, label:()=>[($('htLab')||{}).textContent||'', ($('htSub')||{}).textContent||''].join('|'),
  freeze:b=>{ frozen=!!b; }, tick };
Object.assign(window, { openHadeTimer:()=>openHadeTimer(), closeHadeTimer });
})();
