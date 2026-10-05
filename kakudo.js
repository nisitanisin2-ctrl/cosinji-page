/* 📐 角度計（v518。表電卓の道具。apps/kakudo/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   スマホの傾きのセンサー（deviceorientation の beta・gamma）から、画面の上向き・右向き・手前向きの3つの軸が
   水平からどれだけ傾いているかを出して使う。
   ・📐 傾き：置く（背面を当てる）→ 面の傾きと気泡の水平器。立てて辺を当てる → その辺の角度（長い辺・短い辺は自動）。
     角度のほかに寸勾配・％・1：n。0点合わせ（校正）・ここを0に（2つの面の差）・止める（固定）。
   ・📏 分度器：画面の上で2本の線を指で合わせて角度。
   ・🖼 写真：写真の上で3点（はし・角・はし）を押して角度。
   ・📷 距離・高さ：カメラの真ん中の＋を、物の根元（地面）に合わせると、カメラの高さと下向きの角度から距離（高さ÷tan）。
     続けててっぺんに合わせると、その物の高さ。
   ・設定は excalc_kakudo（校正・カメラの高さ）。 */
(function(){
const KG_KEY='excalc_kakudo';
const $=id=>document.getElementById(id);
const D=180/Math.PI, R=Math.PI/180;
const cl=v=>Math.max(-1,Math.min(1,v));
const f1=v=>(Math.round(v*10)/10).toFixed(1);
let kg={tab:'level', mode:'auto', cal:{x:0,y:0}, h:1.5};
let sm=null, have=false, raf=0, hold=null, ref=null, permAsked=false, lastFeed=0;
let cam=null, base=null, top=null;   // 距離・高さ
let pro=null, ph={img:null, pts:[]};  // 分度器・写真

function kgLoad(){ try{ const o=JSON.parse(localStorage.getItem(KG_KEY)||'null')||{};
  kg={tab:['level','pro','photo','dist'].includes(o.tab)?o.tab:'level', mode:['auto','flat','long','short'].includes(o.mode)?o.mode:'auto',
    cal:{x:+(o.cal&&o.cal.x)||0, y:+(o.cal&&o.cal.y)||0}, h:Math.min(50,Math.max(0.1,+o.h||1.5))}; }catch(_){} }
function kgSave(){ try{ localStorage.setItem(KG_KEY, JSON.stringify(kg)); }catch(_){} }

/* ───────── センサー ───────── */
/* 水平に対する、端末の3つの軸の「上向きの成分」（x：画面の右、y：画面の上、z：画面から手前） */
function upVec(beta, gamma){ const b=beta*R, g=gamma*R; return {x:-Math.sin(g)*Math.cos(b), y:Math.sin(b), z:Math.cos(b)*Math.cos(g)}; }
function kgFeed(e){
  if(e==null||e.beta==null||e.gamma==null) return;
  const v=upVec(+e.beta, +e.gamma); have=true; lastFeed=Date.now();
  if(!sm||e.now) sm=v; else { const k=0.18; sm={x:sm.x+(v.x-sm.x)*k, y:sm.y+(v.y-sm.y)*k, z:sm.z+(v.z-sm.z)*k}; }
  if(!raf) raf=requestAnimationFrame(()=>{ raf=0; kgTick(); });
}
const onOri=e=>kgFeed(e);
function kgSensorOn(){
  window.removeEventListener('deviceorientation', onOri); window.addEventListener('deviceorientation', onOri);
  setTimeout(()=>{ if(!have) kgRenderLevel(); }, 1500);
}
function kgSensorOff(){ window.removeEventListener('deviceorientation', onOri); }
/* iPhone は押したときに許可を聞く */
function kgAsk(){
  const DOE=window.DeviceOrientationEvent;
  if(DOE && typeof DOE.requestPermission==='function'){
    DOE.requestPermission().then(r=>{ permAsked=true; if(r==='granted'){ kgSensorOn(); toast('センサーを使います'); } else toast('許可されませんでした。設定 → Safari → 「モーションと画面の向きのアクセス」をオンにしてください', 5000); kgRenderLevel(); }).catch(()=>toast('許可を聞けませんでした'));
  } else { kgSensorOn(); permAsked=true; kgRenderLevel(); }
}
const needAsk=()=>!permAsked && window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission==='function';

/* 傾きを出す：置く（面の傾き）／長い辺／短い辺 */
function kgMeasure(){
  if(!sm) return null;
  const ax=Math.asin(cl(sm.x))*D-kg.cal.x, ay=Math.asin(cl(sm.y))*D-kg.cal.y;   // 短い辺・長い辺が水平からどれだけ
  let mode=kg.mode;
  if(mode==='auto') mode=Math.abs(sm.z)>0.8?'flat':(Math.abs(sm.y)<Math.abs(sm.x)?'long':'short');
  if(mode==='flat'){ const t=Math.atan(Math.hypot(Math.tan(ax*R),Math.tan(ay*R)))*D; return {mode, a:t, ax, ay, up:sm.z>=0}; }
  return {mode, a:mode==='long'?ay:ax, ax, ay};
}
/* 角度 → 勾配の言い方 */
function slopeText(a){
  const t=Math.tan(Math.abs(a)*R);
  if(Math.abs(a)>=89.95) return '垂直';
  return `${f1(t*10)}寸・${f1(t*100)}%${t>0.0005?`・1：${1/t<10?f1(1/t):Math.round(1/t)}`:''}`;
}

/* ───────── 📐 傾き ───────── */
function kgTick(){
  if(kg.tab==='level') kgDrawLevel();
  else if(kg.tab==='dist') kgDrawDist();
}
function kgRenderLevel(){
  const b=$('kgLevel'); if(!b) return;
  b.innerHTML=`${needAsk()?`<div class="kg-ask"><b>傾きのセンサーを使います</b><br>iPhone は許可がいります。<button class="kg-b pri" onclick="kgAsk()">センサーを使う</button></div>`:''}
    <div class="kg-seg" id="kgMode">${[['auto','自動'],['flat','置く'],['long','長い辺'],['short','短い辺']].map(o=>`<button class="${kg.mode===o[0]?'on':''}" data-v="${o[0]}" onclick="kgSetMode('${o[0]}')">${o[1]}</button>`).join('')}</div>
    <div class="kg-stage" id="kgStage"><div class="kg-ring"></div><div class="kg-cross"></div><div class="kg-bub" id="kgBub"></div><div class="kg-tube" id="kgTube"><div class="kg-tb" id="kgTb"></div></div></div>
    <div class="kg-big"><span id="kgDeg">--.-</span><small>°</small></div>
    <div class="kg-sub" id="kgSub">${have?'':'スマホを動かすと出ます（センサーが使えない端末では出ません）'}</div>
    <div class="kg-what" id="kgWhat"></div>
    <div class="kg-acts"><button class="kg-b" id="kgRefBtn" onclick="kgRef()">${ref!=null?'↺ 差をやめる':'📍 ここを0に'}</button><button class="kg-b${hold?' on':''}" id="kgHoldBtn" onclick="kgHold()">${hold?'▶ 動かす':'⏸ 止める'}</button><button class="kg-b" onclick="kgCal()">🎯 0点合わせ</button></div>
    <div class="kg-note">使い方：<b>置く</b>…背面を面にぴったり置くと、その面の傾き（気泡がまん中なら水平）。<b>長い辺・短い辺</b>…スマホを立てて辺を面に当てると、その辺の角度（自動で、当てている辺を見分けます。45°より急な坂は、上で「長い辺」「短い辺」を選んでください）。「📍 ここを0に」で、2つの面の角度の差を測れます。カメラの出っぱりやケースで傾くので、置くときは平らな所で一度「🎯 0点合わせ」をしてください。${kg.cal.x||kg.cal.y?' <a onclick="kgCalClear()">0点合わせを元に戻す</a>':''}</div>`;
  kgDrawLevel();
}
function kgDrawLevel(){
  const deg=$('kgDeg'); if(!deg) return;
  let m=hold||kgMeasure();
  if(!m){ deg.textContent='--.-'; return; }
  let a=m.a; if(ref!=null&&!hold) a-=ref; else if(ref!=null&&hold) a=hold.a-ref;
  deg.textContent=f1(Math.abs(a));
  const lab={flat:'置いた面の傾き', long:'長い辺の角度', short:'短い辺の角度'}[m.mode];
  $('kgWhat').textContent=(ref!=null?'0にした所との差・':'')+lab+(hold?'（止めています）':'');
  $('kgSub').textContent=slopeText(a)+(Math.abs(a)<0.25?'　✓ 水平':'')+(m.mode!=='flat'&&Math.abs(Math.abs(a)-90)<0.25?'　✓ 垂直':'');
  const st=$('kgStage'); st.classList.toggle('flat', m.mode==='flat'); st.classList.toggle('ok', Math.abs(a)<0.25);
  const S=4;   // 1° で何 px
  if(m.mode==='flat'){ const bx=Math.max(-90,Math.min(90,-m.ax*S)), by=Math.max(-90,Math.min(90,m.ay*S)); $('kgBub').style.transform=`translate(${bx}px,${by}px)`; }
  else { const t=Math.max(-120,Math.min(120,-a*S)); $('kgTb').style.transform=`translateX(${t}px)`; }
}
function kgCalClear(){ kg.cal={x:0,y:0}; kgSave(); toast('0点合わせを元に戻しました'); kgRenderLevel(); }
function kgSetMode(v){ kg.mode=v; kgSave(); ref=null; kgRenderLevel(); }
function kgRef(){ if(ref!=null){ ref=null; } else { const m=kgMeasure(); if(!m){ toast('まだ傾きが出ていません'); return; } ref=m.a; toast('ここを0にしました。次の面に当てると差が出ます'); } kgRenderLevel(); }
function kgHold(){ if(hold){ hold=null; } else { const m=kgMeasure(); if(!m){ toast('まだ傾きが出ていません'); return; } hold=m; } kgRenderLevel(); }
function kgCal(){
  if(!sm){ toast('まだ傾きが出ていません'); return; }
  if(Math.abs(sm.z)<0.9){ toast('平らな机などに、スマホを置いてから押してください', 3500); return; }
  if(!confirm('平らな所にスマホを置いていますか？\nいまの傾きを0にします（カメラの出っぱり・ケースの分を差し引きます）')) return;
  kg.cal={x:Math.asin(cl(sm.x))*D, y:Math.asin(cl(sm.y))*D}; kgSave(); toast('0点を合わせました'); kgRenderLevel();
}

/* ───────── 📏 分度器 ───────── */
function kgRenderPro(){
  const b=$('kgPro'); if(!b) return;
  b.innerHTML=`<canvas id="kgProCv"></canvas><div class="kg-proout"><span id="kgProDeg">--</span>°<small id="kgProSub"></small></div>
    <div class="kg-acts"><button class="kg-b" onclick="kgProReset()">↺ はじめに戻す</button></div>
    <div class="kg-note">●（3つ）を指で動かして、物の2つの辺に線を合わせます。まん中の● が角です。物は画面の上に置いて大丈夫です。</div>`;
  requestAnimationFrame(()=>{ kgProFit(); kgProDraw(); kgProBind(); });
}
function kgProFit(){
  const cv=$('kgProCv'); if(!cv) return; const w=cv.parentNode.clientWidth, h=Math.max(260,Math.min(520,window.innerHeight*0.55));
  const dpr=window.devicePixelRatio||1; cv.width=w*dpr; cv.height=h*dpr; cv.style.width=w+'px'; cv.style.height=h+'px'; cv._w=w; cv._h=h;
  if(!pro) kgProReset(true);
}
function kgProReset(quiet){ const cv=$('kgProCv'); if(!cv) return; const w=cv._w, h=cv._h; const L=Math.min(w/2-24, h-80); pro={o:{x:w/2,y:h-36}, a:{x:w/2+L,y:h-36}, b:{x:w/2+L*Math.cos(60*R),y:h-36-L*Math.sin(60*R)}};   /* はじめは 60° */ if(!quiet) kgProDraw(); }
const angAt=(o,a,b)=>{ const t=Math.atan2(a.y-o.y,a.x-o.x)-Math.atan2(b.y-o.y,b.x-o.x); let d=Math.abs(t*D)%360; if(d>180) d=360-d; return d; };
function kgProDraw(){
  const cv=$('kgProCv'); if(!cv||!pro) return; const x=cv.getContext('2d'), dpr=window.devicePixelRatio||1; x.setTransform(dpr,0,0,dpr,0,0);
  x.clearRect(0,0,cv._w,cv._h);
  const {o,a,b}=pro, d=angAt(o,a,b), ra=Math.atan2(a.y-o.y,a.x-o.x), rb=Math.atan2(b.y-o.y,b.x-o.x);
  // 目盛りの円
  x.strokeStyle='rgba(120,132,156,.35)'; x.lineWidth=1; const RR=Math.min(cv._w,cv._h)*0.42;
  for(let i=0;i<360;i+=5){ const r1=RR-(i%30===0?14:i%10===0?9:5); x.beginPath(); x.moveTo(o.x+Math.cos(ra-i*R)*r1,o.y+Math.sin(ra-i*R)*r1); x.lineTo(o.x+Math.cos(ra-i*R)*RR,o.y+Math.sin(ra-i*R)*RR); x.stroke(); }
  // 角の扇
  let s=ra, e=rb; let diff=((e-s)%(2*Math.PI)+2*Math.PI)%(2*Math.PI); const ccw=diff>Math.PI;
  x.fillStyle='rgba(30,136,229,.18)'; x.beginPath(); x.moveTo(o.x,o.y); x.arc(o.x,o.y,Math.min(70,RR*0.5),s,e,ccw); x.closePath(); x.fill();
  x.strokeStyle='#1e88e5'; x.lineWidth=3; x.lineCap='round';
  [a,b].forEach(p=>{ const k=4000/Math.hypot(p.x-o.x,p.y-o.y)||1; x.beginPath(); x.moveTo(o.x,o.y); x.lineTo(o.x+(p.x-o.x)*k,o.y+(p.y-o.y)*k); x.stroke(); });
  [o,a,b].forEach((p,i)=>{ x.fillStyle=i?'#1e88e5':'#e65100'; x.beginPath(); x.arc(p.x,p.y,11,0,7); x.fill(); x.fillStyle='#fff'; x.beginPath(); x.arc(p.x,p.y,4,0,7); x.fill(); });
  $('kgProDeg').textContent=f1(d); $('kgProSub').textContent=`（反対側 ${f1(360-d)}°・残り ${f1(180-d)}°）`;
}
function kgProBind(){
  const cv=$('kgProCv'); if(!cv||cv._b) return; cv._b=1; let drag=null;
  const pt=e=>{ const r=cv.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; };
  cv.addEventListener('pointerdown',e=>{ const p=pt(e); let best=null, bd=40; ['o','a','b'].forEach(k=>{ const d=Math.hypot(pro[k].x-p.x,pro[k].y-p.y); if(d<bd){ bd=d; best=k; } }); drag=best; if(drag){ try{ cv.setPointerCapture(e.pointerId); }catch(_){} e.preventDefault(); } });
  cv.addEventListener('pointermove',e=>{ if(!drag) return; const p=pt(e); pro[drag]={x:Math.max(0,Math.min(cv._w,p.x)), y:Math.max(0,Math.min(cv._h,p.y))}; kgProDraw(); });
  const up=()=>{ drag=null; }; cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
}

/* ───────── 🖼 写真で角度 ───────── */
function kgRenderPhoto(){
  const b=$('kgPhoto'); if(!b) return;
  b.innerHTML=`<div class="kg-acts"><button class="kg-b" onclick="$kg('kgCam').click()">📷 撮る</button><button class="kg-b" onclick="$kg('kgPick').click()">🖼 写真を選ぶ</button><button class="kg-b" onclick="kgPhReset()">↺ 点をやり直す</button></div>
    <input type="file" id="kgCam" accept="image/*" capture="environment" style="display:none" onchange="kgPhIn(event)"><input type="file" id="kgPick" accept="image/*" style="display:none" onchange="kgPhIn(event)">
    <canvas id="kgPhCv"></canvas><div class="kg-proout"><span id="kgPhDeg">--</span>°<small id="kgPhSub"></small></div>
    <div class="kg-note">写真の上で、<b>①はし → ②角 → ③もう一方のはし</b>の順に3つ押すと、②の角度が出ます。点は指で動かして合わせ直せます。屋根の傾きは「①軒先 → ②屋根の下のはし → ③水平な線の上」などで。</div>`;
  requestAnimationFrame(()=>{ kgPhFit(); kgPhBind(); });
}
function kgPhIn(e){
  const f=e.target.files&&e.target.files[0]; if(!f) return; e.target.value='';
  const u=URL.createObjectURL(f), im=new Image(); im.onload=()=>{ URL.revokeObjectURL(u); ph={img:im, pts:[]}; kgPhFit(); }; im.onerror=()=>{ URL.revokeObjectURL(u); toast('写真を読み込めませんでした'); }; im.src=u;
}
function kgPhFit(){
  const cv=$('kgPhCv'); if(!cv) return; const w=cv.parentNode.clientWidth;
  const h=ph.img?Math.round(w*ph.img.height/ph.img.width):Math.round(w*0.6); const dpr=window.devicePixelRatio||1;
  cv.width=w*dpr; cv.height=h*dpr; cv.style.width=w+'px'; cv.style.height=h+'px'; cv._w=w; cv._h=h; kgPhDraw();
}
function kgPhReset(){ ph.pts=[]; kgPhDraw(); }
function kgPhDraw(){
  const cv=$('kgPhCv'); if(!cv) return; const x=cv.getContext('2d'), dpr=window.devicePixelRatio||1; x.setTransform(dpr,0,0,dpr,0,0);
  x.fillStyle='#eceff1'; x.fillRect(0,0,cv._w,cv._h);
  if(ph.img) x.drawImage(ph.img,0,0,cv._w,cv._h); else { x.fillStyle='#90a4ae'; x.font='15px sans-serif'; x.textAlign='center'; x.fillText('📷 撮るか 🖼 写真を選んでください', cv._w/2, cv._h/2); x.textAlign='start'; }
  const P=ph.pts.map(p=>({x:p.x*cv._w, y:p.y*cv._h}));
  x.lineWidth=3; x.strokeStyle='#ffeb3b'; x.shadowColor='rgba(0,0,0,.6)'; x.shadowBlur=3;
  if(P.length>=2){ x.beginPath(); x.moveTo(P[0].x,P[0].y); x.lineTo(P[1].x,P[1].y); if(P[2]) x.lineTo(P[2].x,P[2].y); x.stroke(); }
  x.shadowBlur=0;
  P.forEach((p,i)=>{ x.fillStyle=i===1?'#e65100':'#1e88e5'; x.beginPath(); x.arc(p.x,p.y,10,0,7); x.fill(); x.fillStyle='#fff'; x.font='bold 12px sans-serif'; x.textAlign='center'; x.fillText(String(i+1),p.x,p.y+4); x.textAlign='start'; });
  const d=P.length===3?angAt(P[1],P[0],P[2]):null;
  $('kgPhDeg').textContent=d==null?'--':f1(d); $('kgPhSub').textContent=d==null?(ph.img?`（あと ${3-P.length}点）`:''):`（残り ${f1(180-d)}°・${slopeText(Math.min(d,180-d))}）`;
}
function kgPhBind(){
  const cv=$('kgPhCv'); if(!cv||cv._b) return; cv._b=1; let drag=-1, moved=false;
  const pt=e=>{ const r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height}; };
  cv.addEventListener('pointerdown',e=>{ if(!ph.img) return; const p=pt(e); drag=-1; moved=false; ph.pts.forEach((q,i)=>{ if(Math.hypot((q.x-p.x)*cv._w,(q.y-p.y)*cv._h)<28) drag=i; }); if(drag<0&&ph.pts.length<3){ ph.pts.push(p); drag=ph.pts.length-1; } try{ cv.setPointerCapture(e.pointerId); }catch(_){} kgPhDraw(); });
  cv.addEventListener('pointermove',e=>{ if(drag<0) return; moved=true; ph.pts[drag]=pt(e); kgPhDraw(); });
  const up=()=>{ drag=-1; }; cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
}

/* ───────── 📷 距離・高さ ───────── */
const elev=()=>sm?Math.asin(cl(-sm.z))*D:null;   // カメラ（背面）の向きが水平から何度上か（下はマイナス）
const distOf=e=>e<-0.3?kg.h/Math.tan(-e*R):null;
function kgRenderDist(){
  const b=$('kgDist'); if(!b) return;
  b.innerHTML=`${needAsk()?`<div class="kg-ask"><b>傾きのセンサーを使います</b><br><button class="kg-b pri" onclick="kgAsk()">センサーを使う</button></div>`:''}
    <div class="kg-cam" id="kgCamBox"><video id="kgVideo" playsinline muted autoplay></video><div class="kg-plus"></div><div class="kg-camnote" id="kgCamNote">カメラを使うには ▶ を押してください</div>
      <div class="kg-live"><span id="kgElev">--</span><b id="kgLiveD"></b></div></div>
    <div class="kg-acts"><button class="kg-b" id="kgCamBtn" onclick="kgCamToggle()">▶ カメラ</button>
      <label class="kg-h">カメラの高さ<input id="kgH" inputmode="decimal" value="${kg.h}" onchange="kgSetH(this.value)">m</label></div>
    <div class="kg-acts"><button class="kg-b pri" id="kgBaseBtn" onclick="kgBase()">① 根元（地面）に合わせて決定</button><button class="kg-b" id="kgTopBtn" onclick="kgTop()" ${base?'':'disabled'}>② てっぺんに合わせて決定</button></div>
    <div class="kg-res" id="kgRes"></div>
    <div class="kg-note">使い方：①スマホを目の前でまっすぐ持ち、<b>カメラの高さ</b>（地面からレンズまで。立って胸の前なら 1.3〜1.5m くらい）を入れます。②画面の＋を、測りたい物が<b>地面に着いている所</b>に合わせて「①」。距離が出ます。③そのまま＋を<b>てっぺん</b>に合わせて「②」で高さも出ます。<br>地面が平らなときに使えます。近い物ほど正確で、遠くなるほど（30m より先）ずれやすくなります。角度が0.5°ずれたときの幅も出します。</div>`;
  kgDrawDist(); kgDrawRes();
}
function kgDrawDist(){
  const el=$('kgElev'); if(!el) return; const e=elev();
  if(e==null){ el.textContent='--'; $('kgLiveD').textContent=''; return; }
  el.textContent=(e>=0?'上 ':'下 ')+f1(Math.abs(e))+'°';
  const d=distOf(e); $('kgLiveD').textContent=d!=null&&d<1000?`　根元まで 約 ${d<10?f1(d):Math.round(d)} m`:'';
}
function kgSetH(v){ const n=parseFloat(String(v).normalize('NFKC')); if(!(n>0&&n<=50)){ toast('0.1〜50 m の数を入れてください'); $('kgH').value=kg.h; return; } kg.h=n; kgSave(); if(base){ base.d=kg.h/Math.tan(-base.e*R); } kgDrawRes(); }
function kgBase(){
  const e=elev(); if(e==null){ toast('まだ傾きが出ていません'); return; }
  if(e>-0.5){ toast('根元は下にあるはずです。スマホを少し下に向けて、＋を地面に着いた所に合わせてください', 4000); return; }
  base={e, d:kg.h/Math.tan(-e*R)}; top=null; kgDrawRes(); const b=$('kgTopBtn'); if(b) b.disabled=false;
}
function kgTop(){
  const e=elev(); if(e==null||!base){ toast('先に「① 根元」を決めてください'); return; }
  top={e, H:kg.h+base.d*Math.tan(e*R)}; kgDrawRes();
}
function kgDrawRes(){
  const r=$('kgRes'); if(!r) return;
  if(!base){ r.innerHTML=''; return; }
  const rng=e=>[kg.h/Math.tan((-e+0.5)*R), -e-0.5>0.05?kg.h/Math.tan((-e-0.5)*R):Infinity];
  const [lo,hi]=rng(base.e), fm=v=>v<10?f1(v):String(Math.round(v));
  r.innerHTML=`<div><small>距離（根元まで）</small><b>約 ${fm(base.d)} m</b><small>${isFinite(hi)?`${fm(lo)}〜${fm(hi)} m`:`${fm(lo)} m より遠い`}・下 ${f1(-base.e)}°</small></div>`
    +(top?`<div><small>高さ</small><b>約 ${fm(top.H)} m</b><small>${top.e>=0?'上':'下'} ${f1(Math.abs(top.e))}°・カメラの高さ ${kg.h} m から</small></div>`:'');
}
function kgCamToggle(){
  if(cam){ kgCamStop(); return; }
  const md=navigator.mediaDevices; if(!md||!md.getUserMedia){ toast('この端末ではカメラが使えません。スマホの上の辺を物に向けても測れます', 4500); return; }
  md.getUserMedia({video:{facingMode:{ideal:'environment'}}, audio:false}).then(st=>{ cam=st; const v=$('kgVideo'); if(v){ v.srcObject=st; v.play().catch(()=>{}); } const n=$('kgCamNote'); if(n) n.style.display='none'; const b=$('kgCamBtn'); if(b) b.textContent='■ カメラを止める'; if(needAsk()) kgAsk(); })
    .catch(()=>toast('カメラを使えませんでした（許可を確かめてください）', 4000));
}
function kgCamStop(){ if(cam){ cam.getTracks().forEach(t=>t.stop()); cam=null; } const v=$('kgVideo'); if(v) v.srcObject=null; const b=$('kgCamBtn'); if(b) b.textContent='▶ カメラ'; const n=$('kgCamNote'); if(n) n.style.display=''; }

/* ───────── 画面 ───────── */
function kgShow(t){
  kg.tab=t; kgSave(); if(t!=='dist') kgCamStop();
  document.querySelectorAll('#kgTabs button').forEach(b=>b.classList.toggle('on', b.dataset.t===t));
  ['level','pro','photo','dist'].forEach(k=>{ const e=$('kg'+k[0].toUpperCase()+k.slice(1)); if(e) e.style.display=k===t?'':'none'; });
  if(t==='level') kgRenderLevel(); else if(t==='pro') kgRenderPro(); else if(t==='photo') kgRenderPhoto(); else kgRenderDist();
}
const KG_CSS=`
#kakudoOverlay .kg-modal{ display:flex; flex-direction:column; }
.kg-tabs{ display:flex; gap:4px; padding:6px 8px; border-bottom:1px solid rgba(120,132,156,.25); overflow-x:auto; scrollbar-width:none; } .kg-tabs::-webkit-scrollbar{ display:none; }
.kg-tabs button{ flex:1 0 auto; height:38px; padding:0 10px; border-radius:19px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:13.5px; font-weight:bold; cursor:pointer; white-space:nowrap; } .kg-tabs button.on{ background:#00897b; border-color:#00897b; color:#fff; }
.kg-body{ flex:1; min-height:0; overflow:auto; padding:10px 14px calc(16px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:14.5px; line-height:1.6; }
.kg-seg{ display:flex; gap:4px; margin-bottom:8px; } .kg-seg button{ flex:1; height:36px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-weight:bold; font-size:13px; cursor:pointer; } .kg-seg button.on{ background:#00897b; border-color:#00897b; color:#fff; }
.kg-stage{ position:relative; width:240px; height:240px; margin:6px auto; }
.kg-ring{ position:absolute; inset:0; border-radius:50%; border:3px solid rgba(0,137,123,.35); background:radial-gradient(circle,rgba(0,137,123,.06),rgba(0,137,123,.14)); display:none; }
.kg-cross{ position:absolute; left:50%; top:50%; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%; border:2px dashed #00897b; display:none; }
.kg-bub{ position:absolute; left:50%; top:50%; width:40px; height:40px; margin:-20px 0 0 -20px; border-radius:50%; background:radial-gradient(circle at 35% 35%,#fff,#aed581 45%,#7cb342); box-shadow:0 2px 6px rgba(0,0,0,.25); display:none; }
.kg-stage.flat .kg-ring,.kg-stage.flat .kg-cross,.kg-stage.flat .kg-bub{ display:block; } .kg-stage.flat .kg-tube{ display:none; }
.kg-tube{ position:absolute; left:0; right:0; top:50%; height:46px; margin-top:-23px; border-radius:23px; border:3px solid rgba(0,137,123,.4); background:linear-gradient(#e0f2f1,#b2dfdb); overflow:hidden; }
.kg-tube::before,.kg-tube::after{ content:''; position:absolute; top:4px; bottom:4px; width:2px; background:#00897b; } .kg-tube::before{ left:calc(50% - 26px); } .kg-tube::after{ left:calc(50% + 24px); }
.kg-tb{ position:absolute; left:50%; top:5px; width:44px; height:30px; margin-left:-22px; border-radius:15px; background:radial-gradient(circle at 35% 35%,#fff,#aed581 45%,#7cb342); }
.kg-stage.ok .kg-bub,.kg-stage.ok .kg-tb{ background:radial-gradient(circle at 35% 35%,#fff,#4fc3f7 45%,#0288d1); }
.kg-big{ text-align:center; font-size:64px; font-weight:bold; line-height:1.1; font-variant-numeric:tabular-nums; } .kg-big small{ font-size:34px; }
.kg-sub{ text-align:center; font-size:15px; font-weight:bold; color:#00695c; min-height:1.4em; } .kg-what{ text-align:center; font-size:12.5px; color:var(--text-light,#888); }
.kg-acts{ display:flex; flex-wrap:wrap; gap:6px; margin:10px 0; align-items:center; } .kg-acts .kg-b{ flex:1 1 auto; }
.kg-b{ height:42px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; } .kg-b.pri{ background:#00897b; border-color:#00897b; color:#fff; } .kg-b.on{ background:#e65100; border-color:#e65100; color:#fff; } .kg-b:disabled{ opacity:.4; }
.kg-note a{ color:#00695c; font-weight:bold; text-decoration:underline; cursor:pointer; }
.kg-note{ margin:10px 0; padding:8px 10px; border-radius:8px; background:rgba(120,132,156,.1); font-size:12.5px; line-height:1.7; }
.kg-ask{ margin:4px 0 10px; padding:10px; border-radius:10px; background:#fff3e0; color:#5d4037; text-align:center; } .kg-ask .kg-b{ margin-top:6px; }
#kgProCv,#kgPhCv{ display:block; width:100%; border-radius:10px; background:rgba(120,132,156,.06); touch-action:none; }
.kg-proout{ text-align:center; font-size:40px; font-weight:bold; margin-top:4px; } .kg-proout small{ display:block; font-size:13px; font-weight:normal; color:var(--text-light,#888); }
.kg-cam{ position:relative; height:min(52vh,420px); border-radius:12px; overflow:hidden; background:#263238; }
.kg-cam video{ width:100%; height:100%; object-fit:cover; display:block; }
.kg-plus{ position:absolute; left:50%; top:50%; width:64px; height:64px; margin:-32px 0 0 -32px; pointer-events:none; }
.kg-plus::before,.kg-plus::after{ content:''; position:absolute; background:#ffeb3b; box-shadow:0 0 0 1px rgba(0,0,0,.5); } .kg-plus::before{ left:31px; top:0; width:2px; height:64px; } .kg-plus::after{ top:31px; left:0; height:2px; width:64px; }
.kg-camnote{ position:absolute; left:0; right:0; top:42%; text-align:center; color:#cfd8dc; font-size:13px; }
.kg-live{ position:absolute; left:8px; right:8px; bottom:8px; padding:6px 10px; border-radius:10px; background:rgba(0,0,0,.55); color:#fff; font-size:16px; text-align:center; } .kg-live b{ color:#ffeb3b; }
.kg-h{ display:flex; align-items:center; gap:4px; font-size:13px; font-weight:bold; } .kg-h input{ width:70px; height:40px; font-size:17px; text-align:right; padding:0 6px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.kg-res{ display:grid; grid-template-columns:1fr 1fr; gap:8px; } .kg-res>div{ padding:10px; border-radius:12px; background:rgba(0,137,123,.1); text-align:center; } .kg-res small{ display:block; font-size:12px; color:var(--text-light,#777); } .kg-res b{ display:block; font-size:24px; color:#00695c; }
`;
function kgEnsureDom(){
  if($('kakudoOverlay')) return;
  const st=document.createElement('style'); st.id='kgStyle'; st.textContent=KG_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="kakudoOverlay">
  <div class="modal vol-modal kg-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📐 角度計</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center"><button class="modal-close" onclick="closeKakudo()" aria-label="閉じる">✕</button></span></div>
    <div class="kg-tabs" id="kgTabs" data-hswipe="1">${[['level','📐 傾き'],['pro','📏 分度器'],['photo','🖼 写真'],['dist','📷 距離・高さ']].map(t=>`<button data-t="${t[0]}" onclick="kgShow('${t[0]}')">${t[1]}</button>`).join('')}</div>
    <div class="kg-body"><div id="kgLevel"></div><div id="kgPro" data-hswipe="1"></div><div id="kgPhoto" data-hswipe="1"></div><div id="kgDist"></div></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  window.addEventListener('resize',()=>{ if(!isDlgOpen('kakudoOverlay')) return; if(kg.tab==='pro'){ kgProFit(); kgProDraw(); } else if(kg.tab==='photo') kgPhFit(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openKakudo(){
  kgEnsureDom(); kgLoad(); hold=null; ref=null;
  openDlg('kakudoOverlay', ()=>{ kgSensorOff(); kgCamStop(); });
  if(!needAsk()) kgSensorOn();
  kgShow(kg.tab);
}
function closeKakudo(){ if(!$('kakudoOverlay')||!isDlgOpen('kakudoOverlay')) return; kgSensorOff(); kgCamStop(); closeDlg('kakudoOverlay'); }

Object.assign(window, { openKakudo, closeKakudo, kgShow, kgAsk, kgSetMode, kgRef, kgHold, kgCal, kgCalClear, kgProReset, kgPhIn, kgPhReset, kgCamToggle, kgSetH, kgBase, kgTop, $kg:$,
  kgFeed, kgState:()=>({tab:kg.tab, mode:kg.mode, cal:Object.assign({},kg.cal), h:kg.h, m:kgMeasure(), elev:elev(), base, top, ref, hold:!!hold, pro:pro&&JSON.parse(JSON.stringify(pro)), pts:ph.pts.slice()}),
  kgProSet:(o,a,b)=>{ pro={o,a,b}; kgProDraw(); }, kgPhSet:pts=>{ ph.pts=pts; kgPhDraw(); }, kgAngAt:angAt, kgSlope:slopeText });
})();
