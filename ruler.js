/* 📏 定規（v496。表電卓の道具。はじめて開いたときに読む）
   ・定規：画面のふちに mm の目盛り。つまみ（赤い線）を動かして物の縦×横を測る。mm とインチ。
   ・校正：ブラウザは画面の1mmが何ドットか分からないので、カード・硬貨・お札を画面に当てて合わせる。
     結果は端末ごとに覚える（excalc_ruler_cal。機種で違うのでバックアップには入れない）。
   ・写真で測る：大きさの分かっている物（基準）を並べて撮り、写真の上で基準と測りたい所をなぞると長さが出る。
     基準は、定規で測って名前を付けて登録した物（excalc_ruler）か、カード・硬貨などの決まった大きさ。
   ・写真は端末の外に出さない。線を描いた画像を保存・共有できる。 */
(function(){
const RL_KEY='excalc_ruler', RL_CAL='excalc_ruler_cal';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rl={refs:[], off:false}, pxmm=null, rlTab='ruler', rlFullOn=false, rlFinger=null;
const OFF_MM=15;   // 「指の先で合わせる」ときの、指から点までの長さ
function rlLoad(){
  try{ const o=JSON.parse(localStorage.getItem(RL_KEY)||'null')||{}; rl={refs:Array.isArray(o.refs)?o.refs.filter(r=>r&&typeof r.name==='string'&&r.w>0).slice(0,50).map(r=>({name:r.name.slice(0,30),w:+r.w,h:r.h>0?+r.h:0})):[], off:o.off===true}; }catch(_){ rl={refs:[], off:false}; }
  const c=parseFloat(localStorage.getItem(RL_CAL)); pxmm=(c>1&&c<60)?c:null;
}
function rlSave(){ try{ localStorage.setItem(RL_KEY, JSON.stringify(rl)); }catch(_){} }
const DEF_PXMM=160/25.4;   // 校正していないときの見当（スマホのふつうの画面）
const PM=()=>pxmm||DEF_PXMM;
const f1=n=>(Math.round(n*10)/10).toFixed(1), f2=n=>(Math.round(n*100)/100).toFixed(2);
/* 決まった大きさの物（mm） */
const KNOWN=[
  ['card','クレジット・ポイントカード',85.6,53.98,'rect'],['yen1','1円玉',20,20,'circle'],['yen5','5円玉',22,22,'circle'],['yen10','10円玉',23.5,23.5,'circle'],
  ['yen50','50円玉',21,21,'circle'],['yen100','100円玉',22.6,22.6,'circle'],['yen500','500円玉',26.5,26.5,'circle'],
  ['bill1000','千円札',150,76,'rect'],['bill10000','1万円札',160,76,'rect'],['a4','A4の紙（短い辺）',210,297,'rect'],['meishi','名刺（ふつうの大きさ）',91,55,'rect'],['cap','ペットボトルのキャップ（直径）',30,30,'circle'],
];

/* ───────── 定規 ───────── */
let rlX=null, rlY=null, rlDrag=null;
function rulerCanvas(){ return $('rlCanvas'); }
function rulerSize(){
  const c=rulerCanvas(); if(!c) return; const box=c.parentElement; const r=box.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1; c.width=Math.round(r.width*dpr); c.height=Math.round(r.height*dpr); c.style.width=r.width+'px'; c.style.height=r.height+'px';
  if(rlX==null){ rlX=Math.min(r.width-40, 50*PM()); rlY=Math.min(r.height-40, 30*PM()); }
  rulerDraw();
}
function rulerDraw(){
  const c=rulerCanvas(); if(!c) return; const dpr=window.devicePixelRatio||1; const ctx=c.getContext('2d');
  const W=c.width/dpr, H=c.height/dpr; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  const dark=document.body.classList.contains('dark'); const fg=dark?'#e0e0e0':'#222', sub=dark?'#9e9e9e':'#555';
  ctx.fillStyle=dark?'#1e1e1e':'#fafafa'; ctx.fillRect(0,0,W,H);
  const p=PM(); ctx.strokeStyle=fg; ctx.fillStyle=fg; ctx.lineWidth=1; ctx.font='13px sans-serif'; ctx.textBaseline='top';
  // 上の目盛り（左から右へ）
  for(let mm=0; mm*p<=W; mm++){ const x=Math.round(mm*p)+0.5; const L=mm%10===0?26:mm%5===0?18:10; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,L); ctx.stroke(); if(mm%10===0&&mm) { ctx.textAlign='center'; ctx.fillText(String(mm/10),x,28); } }
  // 左の目盛り（上から下へ）
  ctx.textAlign='left'; ctx.textBaseline='middle';
  for(let mm=0; mm*p<=H; mm++){ const y=Math.round(mm*p)+0.5; const L=mm%10===0?26:mm%5===0?18:10; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(L,y); ctx.stroke(); if(mm%10===0&&mm) ctx.fillText(String(mm/10),30,y); }
  ctx.fillStyle=sub; ctx.textBaseline='top'; ctx.font='11px sans-serif'; ctx.fillText('cm',44,30);
  // 0の線
  ctx.strokeStyle='#e53935'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(1,0); ctx.lineTo(1,H); ctx.moveTo(0,1); ctx.lineTo(W,1); ctx.stroke();
  // 測る線（つまみ）
  ctx.strokeStyle='#1e88e5'; ctx.lineWidth=2; ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.moveTo(rlX,0); ctx.lineTo(rlX,H); ctx.moveTo(0,rlY); ctx.lineTo(W,rlY); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='rgba(30,136,229,.08)'; ctx.fillRect(0,0,rlX,rlY);
  ctx.fillStyle='#1e88e5'; ctx.beginPath(); ctx.arc(rlX,rlY,13,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(rlX,rlY,13,0,Math.PI*2); ctx.stroke();
  if(rlFinger){ ctx.strokeStyle='rgba(30,136,229,.7)'; ctx.lineWidth=1.5; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(rlFinger.x,rlFinger.y); ctx.lineTo(rlX,rlY); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle='rgba(30,136,229,.55)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(rlFinger.x,rlFinger.y,22,0,Math.PI*2); ctx.stroke(); }
  const w=rlX/p, h=rlY/p;
  const out=$('rlOut'); if(out) out.innerHTML=`<b>${f1(w)} × ${f1(h)}</b> mm<small>${f2(w/25.4)} × ${f2(h/25.4)} inch</small>`;
}
/* 指で押さえた所に点を置く。「☝ 指の先で合わせる」のときは、点を指より15mm 先（左上＝物のある側）に置く。
   上に物をのせて測るとき、物の角の下に指を入れなくても合わせられるように（v497） */
function rulerPointer(e){
  const c=rulerCanvas(); const r=c.getBoundingClientRect(); const fx=e.clientX-r.left, fy=e.clientY-r.top;
  const o=rl.off?OFF_MM*PM():0, od=o*Math.SQRT1_2;
  if(e.type==='pointerdown'){ c.setPointerCapture&&c.setPointerCapture(e.pointerId);
    const px=fx-od, py=fy-od; const dx=Math.abs(px-rlX), dy=Math.abs(py-rlY);
    if(!rl.off){ rlDrag=(Math.abs(fx-rlX)<30&&Math.abs(fy-rlY)<30)?'xy':(Math.abs(fx-rlX)<24?'x':(Math.abs(fy-rlY)<24?'y':'xy')); }
    else rlDrag=(dx<34&&dy<34)?'xy':(Math.abs(fx-o-rlX)<28?'x':(Math.abs(fy-o-rlY)<28?'y':'xy')); }
  if(!rlDrag) return; e.preventDefault();
  const sx=rlDrag==='xy'?od:o;   // 1つの線だけ動かすときは、その向きに15mm
  if(rlDrag!=='y') rlX=Math.max(0,Math.min(r.width,fx-sx)); if(rlDrag!=='x') rlY=Math.max(0,Math.min(r.height,fy-sx));
  rlFinger=rl.off?{x:fx,y:fy}:null;
  if(e.type==='pointerup'||e.type==='pointercancel'){ rlDrag=null; rlFinger=null; }
  rulerDraw();
}
function rlOffToggle(){ rl.off=!rl.off; rlSave(); rlSyncBtns(); toast(rl.off?'指より15mm 先に点を置きます（物の角に指が届かなくても合わせられます）':'指で押さえた所に点を置きます'); }
function rlSyncBtns(){ document.querySelectorAll('.rl-offbtn').forEach(b=>{ b.classList.toggle('on',!!rl.off); b.textContent=rl.off?'☝ 15mm先 ON':'☝ 15mm先'; }); document.querySelectorAll('.rl-fullbtn').forEach(b=>b.textContent=rlFullOn?'⤡ 全画面をやめる':'⛶ 全画面'); }
/* 定規を画面いっぱいに（見出し・タブ・下のボタンを隠す。できる端末ではブラウザの帯も消す） */
function rlFull(on){
  if(on==null) on=!rlFullOn; rlFullOn=!!on;
  const ov=$('rulerOverlay'); if(!ov) return;
  ov.classList.toggle('rl-full', rlFullOn);
  try{
    if(rlFullOn && ov.requestFullscreen && !document.fullscreenElement) ov.requestFullscreen().catch(()=>{});
    if(!rlFullOn && document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  }catch(_){}
  rlSyncBtns(); setTimeout(rulerSize,60); setTimeout(rulerSize,400);
}
function rlNudge(axis,d){ const p=PM(); const c=rulerCanvas(); const r=c.getBoundingClientRect(); if(axis==='x') rlX=Math.max(0,Math.min(r.width,rlX+d*p)); else rlY=Math.max(0,Math.min(r.height,rlY+d*p)); rulerDraw(); }
function rlSetMm(axis){ const cur=(axis==='x'?rlX:rlY)/PM(); const v=prompt(axis==='x'?'横の長さ（mm）':'縦の長さ（mm）', f1(cur)); if(v==null) return; const n=parseFloat(String(v).normalize('NFKC')); if(!(n>=0)) return; if(axis==='x') rlX=n*PM(); else rlY=n*PM(); rulerDraw(); }
function rlAddRef(){
  const w=rlX/PM(), h=rlY/PM(); if(!(w>0)) return;
  const name=prompt(`この大きさ（${f1(w)} × ${f1(h)} mm）に名前を付けて、写真で測るときの基準に登録します`, '');
  if(name==null||!name.trim()) return;
  rl.refs.unshift({name:name.trim().slice(0,30), w:Math.round(w*10)/10, h:Math.round(h*10)/10}); rl.refs=rl.refs.slice(0,50); rlSave();
  toast('「'+name.trim()+'」を基準に登録しました');
}

/* ───────── 校正 ───────── */
let calObj='card', calPx=null;
function calDraw(){
  const k=calObj==='custom'?['custom','手元の物',Math.max(1,parseFloat(String(($('rlCalMm')||{}).value||'').normalize('NFKC'))||50),0,'line']:(KNOWN.find(x=>x[0]===calObj)||KNOWN[0]);
  if(calPx==null) calPx=PM();
  const box=$('rlCalBox'); if(!box) return;
  let shape, hpx;
  if(k[4]==='circle'){ const d=k[2]*calPx; shape=`<div class="rl-cal-shape circle" style="width:${d}px;height:${d}px"></div>`; hpx=d; }
  else if(k[4]==='line'){ shape=`<div class="rl-cal-shape line" style="width:${k[2]*calPx}px"></div>`; hpx=20; }
  else { const w=Math.min(k[2],k[3])*calPx, h=Math.max(k[2],k[3])*calPx; shape=`<div class="rl-cal-shape" style="width:${w}px;height:${h}px"></div>`; hpx=h; }   // 縦向きに当てる（長い辺がたて）
  box.innerHTML=shape; box.parentElement.style.height=Math.max(120, hpx+40)+'px';
  $('rlCalInfo').innerHTML=`${esc(k[1])}：<b>${k[4]==='circle'?'直径 ':k[4]==='line'?'':'縦 '}${k[4]==='rect'?Math.max(k[2],k[3]):k[2]} mm${k[4]==='rect'?' × 横 '+Math.min(k[2],k[3])+' mm':''}</b>　いまの見当 1cm＝${f1(calPx*10)} ドット${pxmm?'':'<br><span class="rl-warn">まだ校正していません</span>'}`;
}
function calPick(v){ calObj=v; document.querySelectorAll('#rlCalObjs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v)); const c=$('rlCalCustom'); if(c) c.style.display=v==='custom'?'':'none'; calDraw(); }
function calStep(d){ calPx=Math.max(1.5,Math.min(60,(calPx||PM())*(1+d))); calDraw(); }
function calSlide(v){ calPx=+v/100; calDraw(); }
function calSaveIt(){ pxmm=calPx; try{ localStorage.setItem(RL_CAL,String(calPx)); }catch(_){} rlX=null; toast('校正しました（1cm＝'+f1(calPx*10)+'ドット）'); rlShow('ruler'); }
function calReset(){ if(!confirm('校正を消して、見当の大きさに戻しますか？')) return; pxmm=null; calPx=null; try{ localStorage.removeItem(RL_CAL); }catch(_){} rlX=null; calDraw(); toast('校正を消しました'); }

/* ───────── 写真で測る ───────── */
let ph={img:null, url:null, ref:null, meas:[], mode:'ref', view:{s:1,tx:0,ty:0}, ptrs:new Map(), g:null, refMm:null, refName:''};
const PCOL=['#1e88e5','#43a047','#fb8c00','#8e24aa','#00897b','#6d4c41'];
function phCanvas(){ return $('rlPhCanvas'); }
function phPhoto(e){
  const f=e.target.files&&e.target.files[0]; if(!f) return;
  if(ph.url) try{ URL.revokeObjectURL(ph.url); }catch(_){}
  ph.url=URL.createObjectURL(f); const im=new Image();
  im.onload=()=>{ ph.img=im; ph.ref=null; ph.meas=[]; ph.mode='ref'; phUI(); phFit(); };
  im.src=ph.url; e.target.value='';
}
function phFit(){
  const c=phCanvas(); if(!c||!ph.img) return; const box=c.parentElement; const W=box.clientWidth; const H=Math.min(window.innerHeight*0.55, W*ph.img.height/ph.img.width);
  const dpr=window.devicePixelRatio||1; c.width=Math.round(W*dpr); c.height=Math.round(H*dpr); c.style.width=W+'px'; c.style.height=H+'px';
  const s=Math.min(W/ph.img.width, H/ph.img.height); ph.view={s, tx:(W-ph.img.width*s)/2, ty:(H-ph.img.height*s)/2}; phDraw();
}
const toScr=p=>({x:p.x*ph.view.s+ph.view.tx, y:p.y*ph.view.s+ph.view.ty});
const toImg=p=>({x:(p.x-ph.view.tx)/ph.view.s, y:(p.y-ph.view.ty)/ph.view.s});
const segLen=l=>Math.hypot(l.b.x-l.a.x, l.b.y-l.a.y);
function phMmOf(l){ if(!ph.ref||!(ph.refMm>0)) return null; const r=segLen(ph.ref); return r>0?segLen(l)/r*ph.refMm:null; }
function phDrawLines(ctx, T, lw, fs){
  const line=(l,col,lab)=>{ const a=T(l.a), b=T(l.b); ctx.strokeStyle='rgba(0,0,0,.55)'; ctx.lineWidth=lw+2.5; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    [a,b].forEach(p=>{ ctx.fillStyle=col; ctx.beginPath(); ctx.arc(p.x,p.y,lw*2.2,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=Math.max(1.5,lw/2); ctx.stroke(); });
    if(lab){ const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; ctx.font=`bold ${fs}px sans-serif`; const tw=ctx.measureText(lab).width; ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillRect(m.x-tw/2-5,m.y-fs-10,tw+10,fs+8); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText(lab,m.x,m.y-6); } };
  if(ph.ref) line(ph.ref,'#e53935',`基準 ${ph.refMm>0?f1(ph.refMm)+'mm':''}`);
  ph.meas.forEach((l,i)=>{ const mm=phMmOf(l); line(l,PCOL[i%PCOL.length],`${i+1}: ${mm!=null?(mm>=1000?f2(mm/1000)+'m':f1(mm)+'mm'):'?'}`); });
}
function phDraw(){
  const c=phCanvas(); if(!c) return; const dpr=window.devicePixelRatio||1; const ctx=c.getContext('2d'); const W=c.width/dpr, H=c.height/dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle='#111'; ctx.fillRect(0,0,W,H);
  if(!ph.img) return;
  ctx.drawImage(ph.img, ph.view.tx, ph.view.ty, ph.img.width*ph.view.s, ph.img.height*ph.view.s);
  phDrawLines(ctx, toScr, 3, 14);
  if(ph.g&&ph.g.loupe){ const p=ph.g.loupe, R=52, Z=3; const cx=p.x<W/2?W-R-10:R+10, cy=R+10;
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip(); ctx.fillStyle='#111'; ctx.fillRect(cx-R,cy-R,R*2,R*2);
    ctx.translate(cx-p.x*Z, cy-p.y*Z); ctx.scale(Z,Z); ctx.drawImage(ph.img, ph.view.tx, ph.view.ty, ph.img.width*ph.view.s, ph.img.height*ph.view.s); phDrawLines(ctx,toScr,1.2,6); ctx.restore();
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke(); ctx.strokeStyle='#e53935'; ctx.beginPath(); ctx.moveTo(cx-8,cy); ctx.lineTo(cx+8,cy); ctx.moveTo(cx,cy-8); ctx.lineTo(cx,cy+8); ctx.stroke(); }
}
function phHit(sp){
  const all=[]; if(ph.ref) all.push(['ref',ph.ref]); ph.meas.forEach((l,i)=>all.push([i,l]));
  let best=null, bd=26; all.forEach(([k,l])=>['a','b'].forEach(e=>{ const q=toScr(l[e]); const d=Math.hypot(q.x-sp.x,q.y-sp.y); if(d<bd){ bd=d; best={k,e,l}; } }));
  return best;
}
function phPointer(e){
  const c=phCanvas(); if(!c||!ph.img) return; const r=c.getBoundingClientRect(); const sp={x:e.clientX-r.left, y:e.clientY-r.top};
  if(e.type==='pointerdown'){ c.setPointerCapture&&c.setPointerCapture(e.pointerId); ph.ptrs.set(e.pointerId, sp);
    if(ph.ptrs.size===2){ const [p1,p2]=[...ph.ptrs.values()]; ph.g={pinch:{d:Math.hypot(p1.x-p2.x,p1.y-p2.y), s:ph.view.s, mid:toImg({x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2})}}; if(ph.drawing){ ph.drawing.cancel(); ph.drawing=null; } phDraw(); return; }
    const hit=phHit(sp);
    if(hit){ ph.g={move:hit, loupe:sp}; }
    else if(ph.mode==='move'){ ph.g={pan:{x:sp.x,y:sp.y,tx:ph.view.tx,ty:ph.view.ty}}; }
    else { const p=toImg(sp); const l={a:p,b:{x:p.x,y:p.y}}; if(ph.mode==='ref'){ const old=ph.ref; ph.ref=l; ph.drawing={cancel:()=>{ ph.ref=old; }}; } else { ph.meas.push(l); ph.drawing={cancel:()=>{ ph.meas.pop(); }}; } ph.g={draw:l, loupe:sp}; }
    e.preventDefault(); phDraw(); return;
  }
  if(!ph.ptrs.has(e.pointerId)) return;
  if(e.type==='pointermove'){ ph.ptrs.set(e.pointerId, sp); e.preventDefault();
    if(ph.g&&ph.g.pinch&&ph.ptrs.size>=2){ const [p1,p2]=[...ph.ptrs.values()]; const d=Math.hypot(p1.x-p2.x,p1.y-p2.y); const s=Math.max(0.05,Math.min(40,ph.g.pinch.s*d/ph.g.pinch.d)); const m={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2};
      ph.view.s=s; ph.view.tx=m.x-ph.g.pinch.mid.x*s; ph.view.ty=m.y-ph.g.pinch.mid.y*s; }
    else if(ph.g&&ph.g.move){ ph.g.move.l[ph.g.move.e]=toImg(sp); ph.g.loupe=sp; }
    else if(ph.g&&ph.g.draw){ ph.g.draw.b=toImg(sp); ph.g.loupe=sp; }
    else if(ph.g&&ph.g.pan){ ph.view.tx=ph.g.pan.tx+sp.x-ph.g.pan.x; ph.view.ty=ph.g.pan.ty+sp.y-ph.g.pan.y; }
    phDraw(); phResults(); return;
  }
  ph.ptrs.delete(e.pointerId);
  if(ph.g&&ph.g.draw){ const l=ph.g.draw; if(segLen(l)*ph.view.s<8){ ph.drawing&&ph.drawing.cancel(); } else if(ph.mode==='ref'){ ph.mode='meas'; } }
  ph.drawing=null;
  if(ph.ptrs.size===0) ph.g=null;
  phDraw(); phUI();
}
function phZoom(k){ const c=phCanvas(); if(!c||!ph.img) return; const W=c.clientWidth/2, H=c.clientHeight/2; const m=toImg({x:W,y:H}); ph.view.s*=k; ph.view.tx=W-m.x*ph.view.s; ph.view.ty=H-m.y*ph.view.s; phDraw(); }
function phMode(m){ ph.mode=m; phUI(); }
function phRefSel(v){
  if(v==='custom'){ ph.refName='自分で入れた長さ'; }
  else if(v.startsWith('k:')){ const k=KNOWN.find(x=>x[0]===v.slice(2)); if(k){ ph.refMm=k[2]; ph.refName=k[1]+(k[4]==='circle'?'（直径）':''); } }
  else if(v.startsWith('r:')){ const [i,s]=v.slice(2).split('.'); const r=rl.refs[+i]; if(r){ ph.refMm=s==='h'?r.h:r.w; ph.refName=r.name+(s==='h'?'（縦）':'（横）'); } }
  const inp=$('rlRefMm'); if(inp) inp.value=ph.refMm>0?ph.refMm:''; phDraw(); phResults();
}
function phRefMm(v){ const n=parseFloat(String(v).normalize('NFKC')); ph.refMm=n>0?n:null; phDraw(); phResults(); }
function phDel(i){ if(i==='ref') ph.ref=null; else ph.meas.splice(i,1); phDraw(); phUI(); }
function phClear(){ if((ph.ref||ph.meas.length) && !confirm('引いた線をすべて消しますか？')) return; ph.ref=null; ph.meas=[]; ph.mode='ref'; phDraw(); phUI(); }
function phResults(){
  const o=$('rlPhRes'); if(!o) return;
  if(!ph.img){ o.innerHTML=''; return; }
  const rows=[];
  rows.push(`<div class="rl-res-row ref"><span class="dot" style="background:#e53935"></span><span class="n">基準 ${esc(ph.refName||'')}</span><span class="v">${ph.ref?(ph.refMm>0?f1(ph.refMm)+' mm':'長さを入れて'):'まだ線がありません'}</span>${ph.ref?`<button onclick="rlPhDel('ref')">✕</button>`:''}</div>`);
  ph.meas.forEach((l,i)=>{ const mm=phMmOf(l); rows.push(`<div class="rl-res-row"><span class="dot" style="background:${PCOL[i%PCOL.length]}"></span><span class="n">${i+1}</span><span class="v">${mm!=null?`<b>${f1(mm)} mm</b><small>${f1(mm/10)} cm・${f2(mm/25.4)} inch</small>`:'—'}</span><button onclick="rlPhDel(${i})">✕</button></div>`); });
  o.innerHTML=rows.join('');
}
function phUI(){
  const has=!!ph.img; const w=$('rlPhWrap'); if(w) w.style.display=has?'':'none';
  const t=$('rlPhTools'); if(t) t.style.display=has?'':'none';
  document.querySelectorAll('#rlPhModes button').forEach(b=>b.classList.toggle('on',b.dataset.m===ph.mode));
  const hint=$('rlPhHint'); if(hint) hint.innerHTML=!has?'':ph.mode==='ref'?'① <b>基準の物</b>の端から端を、写真の上でなぞってください':ph.mode==='meas'?'② <b>測りたい所</b>をなぞると長さが出ます（何本でも）。丸い点はつまんで直せます':'✋ 1本指で写真を動かす・2本指で大きさを変える';
  phResults();
}
function phSave(share){
  if(!ph.img){ toast('先に写真を選んでください'); return; }
  const c=document.createElement('canvas'); const s=Math.min(1, 2400/Math.max(ph.img.width,ph.img.height)); c.width=Math.round(ph.img.width*s); c.height=Math.round(ph.img.height*s);
  const ctx=c.getContext('2d'); ctx.drawImage(ph.img,0,0,c.width,c.height);
  const k=Math.max(1,c.width/600); phDrawLines(ctx, p=>({x:p.x*s,y:p.y*s}), 3*k, 15*k);
  c.toBlob(b=>{ if(!b) return; const name='measure_'+new Date().toISOString().slice(0,19).replace(/[-:T]/g,'')+'.jpg'; const file=new File([b],name,{type:'image/jpeg'});
    if(share && navigator.canShare && navigator.canShare({files:[file]})){ navigator.share({files:[file]}).catch(()=>{}); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); toast('画像を保存しました'); }, 'image/jpeg', 0.9);
}

/* ───────── 画面 ───────── */
const RL_CSS=`
#rulerOverlay .rl-modal{ display:flex; flex-direction:column; }
.rl-tabs{ display:flex; gap:6px; padding:8px 10px; border-bottom:1px solid rgba(120,132,156,.25); }
.rl-tabs button{ flex:1; height:40px; border-radius:20px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:14px; font-weight:bold; cursor:pointer; }
.rl-tabs button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.rl-page{ flex:1; min-height:0; display:none; flex-direction:column; } .rl-page.on{ display:flex; }
.rl-rbox{ position:relative; flex:1; min-height:200px; overflow:hidden; touch-action:none; }
.rl-rbox canvas{ position:absolute; left:0; top:0; touch-action:none; }
.rl-out{ position:absolute; left:50%; top:55%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; color:var(--text,#222); }
.rl-out b{ display:block; font-size:34px; letter-spacing:.02em; } .rl-out small{ display:block; font-size:14px; color:var(--text-light,#777); }
.rl-bar{ display:flex; flex-wrap:wrap; gap:6px; padding:8px 10px calc(8px + var(--safe-bottom,0px)); border-top:1px solid rgba(120,132,156,.25); align-items:center; }
.rl-bar button{ height:38px; padding:0 11px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; }
.rl-bar .grow{ flex:1; }
.rl-bar .rl-offbtn.on,.rl-float .rl-offbtn.on{ background:#1e88e5; border-color:#1e88e5; color:#fff; }
.rl-float{ display:none; position:absolute; right:calc(8px + var(--safe-right,0px)); bottom:calc(8px + var(--safe-bottom,0px)); gap:5px; flex-wrap:wrap; justify-content:flex-end; max-width:70%; }
.rl-float button{ height:38px; padding:0 10px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:rgba(255,255,255,.88); color:#222; font-size:12.5px; font-weight:bold; cursor:pointer; }
body.dark .rl-float button{ background:rgba(40,40,40,.88); color:#eee; }
#rulerOverlay.rl-full .modal{ width:100%; max-width:none; height:100%; max-height:100%; border-radius:0; }
#rulerOverlay.rl-full .modal-header,#rulerOverlay.rl-full .rl-tabs,#rulerOverlay.rl-full .rl-bar,#rulerOverlay.rl-full .rl-calwarn,#rulerOverlay.rl-full .tool-back{ display:none !important; }
#rulerOverlay.rl-full .rl-float{ display:flex; }
#rulerOverlay.rl-full .rl-rbox{ padding-top:0; }
.rl-warn{ color:#e65100; font-weight:bold; }
.rl-calwarn{ margin:6px 10px 0; padding:6px 10px; border-radius:8px; background:rgba(251,140,0,.15); font-size:12.5px; color:var(--text,#222); }
.rl-calwarn button{ margin-left:6px; height:28px; border-radius:8px; border:1px solid #fb8c00; background:#fff3e0; color:#e65100; font-weight:bold; cursor:pointer; }
.rl-scroll{ flex:1; min-height:0; overflow:auto; padding:10px 12px calc(16px + var(--safe-bottom,0px)); font-size:14px; line-height:1.6; color:var(--text,#222); }
.rl-chips{ display:flex; flex-wrap:wrap; gap:6px; margin:6px 0; }
.rl-chips button{ height:34px; padding:0 10px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:12.5px; font-weight:bold; cursor:pointer; }
.rl-chips button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.rl-calarea{ position:relative; height:240px; margin:8px 0; border:1px dashed rgba(120,132,156,.5); border-radius:10px; overflow:hidden; background:var(--modal-bg,#fff); }
#rlCalBox{ position:absolute; left:12px; top:12px; }
.rl-cal-shape{ border:2px solid #e53935; background:rgba(229,57,53,.08); box-sizing:border-box; border-radius:3mm; }
.rl-cal-shape.circle{ border-radius:50%; } .rl-cal-shape.line{ height:0; border:0; border-top:3px solid #e53935; border-radius:0; position:relative; }
.rl-cal-shape.line::before,.rl-cal-shape.line::after{ content:''; position:absolute; top:-12px; width:3px; height:21px; background:#e53935; } .rl-cal-shape.line::before{ left:0; } .rl-cal-shape.line::after{ right:0; }
.rl-calctl{ display:flex; gap:6px; align-items:center; } .rl-calctl input[type=range]{ flex:1; }
.rl-calctl button,.rl-btn{ height:42px; min-width:46px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.rl-btn.pri{ background:var(--acc); border-color:var(--acc); color:#fff; }
.rl-row{ display:flex; gap:6px; flex-wrap:wrap; margin:8px 0; } .rl-row .rl-btn{ flex:1; }
.rl-note{ margin:8px 0; padding:8px 10px; border-radius:8px; background:rgba(120,132,156,.1); font-size:12.5px; }
.rl-form label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:6px 0; }
.rl-form input,.rl-form select{ display:block; width:100%; box-sizing:border-box; margin-top:3px; height:42px; padding:0 8px; font-size:16px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.rl-grid{ display:grid; grid-template-columns:1.4fr 1fr; gap:0 8px; } .rl-grid>*{ min-width:0; }
.rl-phwrap{ position:relative; margin:8px 0; border-radius:8px; overflow:hidden; background:#111; }
.rl-phwrap canvas{ display:block; touch-action:none; }
.rl-phzoom{ position:absolute; right:6px; bottom:6px; display:flex; gap:4px; } .rl-phzoom button{ width:38px; height:38px; border-radius:50%; border:none; background:rgba(0,0,0,.6); color:#fff; font-size:18px; cursor:pointer; }
.rl-hint{ font-size:13px; padding:6px 8px; border-radius:8px; background:rgba(255,213,79,.25); margin:6px 0; }
.rl-res-row{ display:flex; align-items:center; gap:8px; padding:7px 8px; border-bottom:1px solid rgba(120,132,156,.2); }
.rl-res-row .dot{ width:14px; height:14px; border-radius:50%; flex:none; } .rl-res-row .n{ font-weight:bold; min-width:20px; } .rl-res-row .v{ flex:1; text-align:right; } .rl-res-row .v b{ font-size:17px; } .rl-res-row .v small{ display:block; font-size:11.5px; color:var(--text-light,#777); }
.rl-res-row button{ width:32px; height:32px; border-radius:8px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text-light,#888); cursor:pointer; }
.rl-refs{ margin:6px 0; } .rl-refs div{ display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid rgba(120,132,156,.15); font-size:13px; } .rl-refs div span{ flex:1; } .rl-refs button{ height:30px; border-radius:8px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text-light,#888); cursor:pointer; }
`;
function rlEnsureDom(){
  if($('rulerOverlay')) return;
  const st=document.createElement('style'); st.id='rlStyle'; st.textContent=RL_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="rulerOverlay">
  <div class="modal vol-modal rl-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📏 定規</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center"><button class="modal-close" onclick="closeRuler()" aria-label="閉じる">✕</button></span></div>
    <div class="rl-tabs" id="rlTabs"><button data-t="ruler" onclick="rlShow('ruler')">📏 定規</button><button data-t="photo" onclick="rlShow('photo')">📷 写真で測る</button><button data-t="cal" onclick="rlShow('cal')">🎯 校正</button></div>
    <div class="rl-page" id="rlPage_ruler">
      <div class="rl-calwarn" id="rlCalWarn" style="display:none">まだ校正していないので、目盛りは見当です。<button onclick="rlShow('cal')">🎯 校正する</button></div>
      <div class="rl-rbox" id="rlRBox" data-hswipe="1"><canvas id="rlCanvas"></canvas><div class="rl-out" id="rlOut"></div>
        <div class="rl-float"><button class="rl-offbtn" onclick="rlOffToggle()">☝ 15mm先</button><button onclick="rlNudge('x',-0.5)">横−</button><button onclick="rlNudge('x',0.5)">横＋</button><button onclick="rlNudge('y',-0.5)">縦−</button><button onclick="rlNudge('y',0.5)">縦＋</button><button class="rl-fullbtn" onclick="rlFull(false)">⤡ 全画面をやめる</button></div></div>
      <div class="rl-bar">
        <button class="rl-offbtn" onclick="rlOffToggle()" title="上に物をのせて測るとき、指より15mm 先に点を置きます">☝ 15mm先</button><button class="rl-fullbtn" onclick="rlFull()">⛶ 全画面</button>
        <button onclick="rlNudge('x',-0.5)">横−</button><button onclick="rlNudge('x',0.5)">横＋</button><button onclick="rlNudge('y',-0.5)">縦−</button><button onclick="rlNudge('y',0.5)">縦＋</button>
        <span class="grow"></span><button onclick="rlAddRef()">📌 基準に登録</button>
      </div>
    </div>
    <div class="rl-page" id="rlPage_photo"><div class="rl-scroll">
      <input type="file" id="rlCam" accept="image/*" capture="environment" style="display:none" onchange="rlPhPhoto(event)">
      <input type="file" id="rlFile" accept="image/*" style="display:none" onchange="rlPhPhoto(event)">
      <div class="rl-row"><button class="rl-btn pri" onclick="$rl('rlCam').click()">📷 カメラで撮る</button><button class="rl-btn" onclick="$rl('rlFile').click()">🖼 写真を選ぶ</button></div>
      <div class="rl-form rl-grid"><label>基準にする物<select id="rlRefSel" onchange="rlPhRefSel(this.value)"></select></label><label>基準の長さ（mm）<input id="rlRefMm" inputmode="decimal" oninput="rlPhRefMm(this.value)" placeholder="85.6"></label></div>
      <div class="rl-hint" id="rlPhHint"></div>
      <div class="rl-phwrap" id="rlPhWrap" style="display:none" data-hswipe="1"><canvas id="rlPhCanvas"></canvas><div class="rl-phzoom"><button onclick="rlPhZoom(1/1.4)">−</button><button onclick="rlPhZoom(1.4)">＋</button></div></div>
      <div id="rlPhTools" style="display:none">
        <div class="rl-chips" id="rlPhModes"><button data-m="ref" onclick="rlPhMode('ref')">① 基準をなぞる</button><button data-m="meas" onclick="rlPhMode('meas')">② 測る</button><button data-m="move" onclick="rlPhMode('move')">✋ 動かす</button></div>
        <div id="rlPhRes"></div>
        <div class="rl-row"><button class="rl-btn" onclick="rlPhClear()">🗑 線を消す</button><button class="rl-btn" onclick="rlPhSave(false)">💾 画像で保存</button><button class="rl-btn" onclick="rlPhSave(true)">📤 共有</button></div>
      </div>
      <div class="rl-note"><b>うまく測るコツ</b><br>・基準の物と測りたい物を<b>同じ高さ（同じ面）</b>に置き、<b>真上からまっすぐ</b>撮る（斜め・手前と奥では長さがずれます）<br>・基準は測りたい物の<b>近く</b>に、できるだけ<b>長い物</b>を使う（カードの長い辺など）<br>・2本指で大きくして、端をきっちり合わせる。なぞっている間は左上に拡大鏡が出ます</div>
      <div id="rlRefList"></div>
    </div></div>
    <div class="rl-page" id="rlPage_cal"><div class="rl-scroll">
      <p>手元の物を<b>画面の赤い枠に当てて</b>、枠がぴったり同じ大きさになるように合わせてください。合わせると、この端末の定規が正しい長さになります。</p>
      <div class="rl-chips" id="rlCalObjs">${KNOWN.filter(k=>['card','yen1','yen10','yen100','yen500'].includes(k[0])).map(k=>`<button data-v="${k[0]}" onclick="rlCalPick('${k[0]}')">${k[1]}</button>`).join('')}<button data-v="custom" onclick="rlCalPick('custom')">長さを入れる</button></div>
      <div class="rl-form" id="rlCalCustom" style="display:none"><label>手元の物の長さ（mm）<input id="rlCalMm" inputmode="decimal" value="100" oninput="rlCalDraw()"></label></div>
      <div class="rl-calarea" data-hswipe="1"><div id="rlCalBox"></div></div>
      <div class="rl-calctl"><button onclick="rlCalStep(-0.01)">−</button><button onclick="rlCalStep(-0.002)">－細</button><button onclick="rlCalStep(0.002)">＋細</button><button onclick="rlCalStep(0.01)">＋</button></div>
      <div id="rlCalInfo" style="margin:8px 0"></div>
      <div class="rl-row"><button class="rl-btn pri" onclick="rlCalSave()">✓ この大きさで決める</button><button class="rl-btn" onclick="rlCalReset()">校正を消す</button></div>
      <div class="rl-note">カードを<b>縦向き</b>にして角を赤い枠の左上に当て、<b>長い辺（85.6mm）</b>の下の端が枠と重なるまで「＋」「−」で合わせるのがいちばん正確です（硬貨より誤差が小さくなります）。校正の結果はこの端末だけに覚えます（ほかのスマホでは、そのスマホで校正してください）。ブラウザの表示を拡大・縮小していると合わなくなります。</div>
    </div></div>
  </div>
</div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const c=rulerCanvas(); ['pointerdown','pointermove','pointerup','pointercancel'].forEach(t=>c.addEventListener(t,rulerPointer));
  const pc=phCanvas(); ['pointerdown','pointermove','pointerup','pointercancel'].forEach(t=>pc.addEventListener(t,phPointer));
  document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement && rlFullOn){ rlFullOn=false; const ov=$('rulerOverlay'); if(ov) ov.classList.remove('rl-full'); rlSyncBtns(); setTimeout(rulerSize,60); } });
  window.addEventListener('resize',()=>{ if(isDlgOpen('rulerOverlay')){ if(rlTab==='ruler') rulerSize(); else if(rlTab==='photo'&&ph.img) phFit(); } });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function rlRefOptions(){
  const s=$('rlRefSel'); if(!s) return; const cur=s.value;
  s.innerHTML=(rl.refs.length?`<optgroup label="登録した物">${rl.refs.map((r,i)=>`<option value="r:${i}.w">${esc(r.name)}（横 ${r.w}mm）</option>${r.h>0?`<option value="r:${i}.h">${esc(r.name)}（縦 ${r.h}mm）</option>`:''}`).join('')}</optgroup>`:'')
    +`<optgroup label="決まった大きさ">${KNOWN.map(k=>`<option value="k:${k[0]}">${k[1]}（${k[2]}mm）</option>`).join('')}</optgroup><option value="custom">自分で長さを入れる</option>`;
  if(cur && [...s.options].some(o=>o.value===cur)) s.value=cur; else s.value=rl.refs.length?'r:0.w':'k:card';
  if(!(ph.refMm>0)) phRefSel(s.value);
  const L=$('rlRefList'); if(L) L.innerHTML=rl.refs.length?`<div style="font-weight:bold;margin-top:10px">登録した基準</div><div class="rl-refs">${rl.refs.map((r,i)=>`<div><span>${esc(r.name)}　${r.w}${r.h>0?' × '+r.h:''} mm</span><button onclick="rlDelRef(${i})">消す</button></div>`).join('')}</div>`:'';
}
function rlDelRef(i){ const r=rl.refs[i]; if(!r||!confirm('「'+r.name+'」を消しますか？')) return; rl.refs.splice(i,1); rlSave(); rlRefOptions(); }
function rlShow(t){
  if(t!=='ruler' && rlFullOn) rlFull(false);
  rlTab=t; document.querySelectorAll('#rlTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  ['ruler','photo','cal'].forEach(x=>{ const e=$('rlPage_'+x); if(e) e.classList.toggle('on',x===t); });
  if(t==='ruler'){ $('rlCalWarn').style.display=pxmm?'none':''; rlSyncBtns(); requestAnimationFrame(rulerSize); }
  else if(t==='cal'){ calPx=PM(); calPick(calObj); }
  else { rlRefOptions(); phUI(); if(ph.img) requestAnimationFrame(phFit); }
}
function openRuler(tab){
  rlEnsureDom(); rlLoad();
  openDlg('rulerOverlay', ()=>{ if(rlFullOn) rlFull(false); });
  rlShow(typeof tab==='string'?tab:(pxmm?'ruler':'cal'));
}
function closeRuler(){ if(!$('rulerOverlay')||!isDlgOpen('rulerOverlay')) return; if(rlFullOn) rlFull(false); closeDlg('rulerOverlay'); }

Object.assign(window, { openRuler, closeRuler, rlShow, rlOffToggle, rlFull, rlNudge, rlSetMm, rlAddRef, rlDelRef,
  rlCalPick:calPick, rlCalStep:calStep, rlCalSlide:calSlide, rlCalSave:calSaveIt, rlCalReset:calReset, rlCalDraw:calDraw,
  rlPhPhoto:phPhoto, rlPhRefSel:phRefSel, rlPhRefMm:phRefMm, rlPhMode:phMode, rlPhZoom:phZoom, rlPhDel:phDel, rlPhClear:phClear, rlPhSave:phSave, $rl:$,
  rlState:()=>({pxmm, tab:rlTab, off:!!rl.off, full:rlFullOn, refs:rl.refs.slice(), x:rlX, y:rlY, ph:{ref:ph.ref, meas:ph.meas.slice(), refMm:ph.refMm, mode:ph.mode, img:!!ph.img}}),
  rlTestSetPhoto:(img)=>{ ph.img=img; ph.ref=null; ph.meas=[]; ph.mode='ref'; phUI(); phFit(); },
  rlTestLines:(ref, meas)=>{ ph.ref=ref; ph.meas=meas; phDraw(); phUI(); }, rlMmOf:l=>phMmOf(l) });
})();
