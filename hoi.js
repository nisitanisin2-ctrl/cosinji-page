/* ⛩ 方位と恵方（v568。表電卓の道具。はじめて開いたときに koyomi-data.js と いっしょに読む。apps/hoi/ から単独のアプリとしても開ける）
   ・スマホの向きのセンサーで 方位磁石。いま向いている方角（16方位・十二支・二十四方位）と 度。
   ・今年の恵方（年の十干：甲・己 → 甲 東北東やや東 75°／乙・庚 → 庚 西南西やや西 255°／丙・辛・戊・癸 → 丙 南南東やや南 165°／丁・壬 → 壬 北北西やや北 345°）と
     鬼門（北東・艮 45°）・裏鬼門（南西・坤 225°）を 盤に重ねる。恵方を向くと 知らせる（ふるえる）。恵方は 立春から 次の節分まで（節分の日は 次の年の恵方）。
   ・方位磁石の北（磁北）と 地図の北（真北）の ずれ（偏角。日本は 西へ 約5〜9°）を直す。
   ・向きを 名前をつけて残す（玄関・畑の畝 など）。盤に しるしを出す。
   ・iPhone は はじめに「方位を使う」を押して 許可する。センサーのない端末（パソコンなど）は 指でなぞって 盤を回して見る。
   ・残した向き・偏角・盤の目盛りは excalc_hoi（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_hoi', MAX_PIN=30;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,n);
const norm=d=>((d%360)+360)%360;
const DIR16=['北','北北東','北東','東北東','東','東南東','南東','南南東','南','南南西','南西','西南西','西','西北西','北西','北北西'];
const DIR8=['北','北東','東','南東','南','南西','西','北西'];
const SHI='子丑寅卯辰巳午未申酉戌亥';
const D24=['子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙','午','丁','未','坤','申','庚','酉','辛','戌','乾','亥','壬'];
const D24Y=['ね','みずのと','うし','うしとら','とら','きのえ','う','きのと','たつ','たつみ','み','ひのえ','うま','ひのと','ひつじ','ひつじさる','さる','かのえ','とり','かのと','いぬ','いぬい','い','みずのえ'];
const dir16=d=>DIR16[Math.round(norm(d)/22.5)%16];
const shi=d=>SHI[Math.round(norm(d)/30)%12];
const d24=d=>Math.round(norm(d)/15)%24;
/* 偏角（西へ）：国土地理院の 2020年の値の おおよそ */
const DECL=[[0,'直さない（磁北のまま）'],[9,'北海道（西へ 9°）'],[8,'東北（西へ 8°）'],[7,'関東〜九州（西へ 7°）'],[5,'沖縄（西へ 5°）']];

/* ───────── 恵方 ───────── */
const EHOU_DEG={0:75,5:75,1:255,6:255,2:165,7:165,4:165,9:165,3:345,8:345};   // 年の十干（0＝甲）→ 度
const EHOU_N={75:['東北東やや東','甲（きのえ）'],255:['西南西やや西','庚（かのえ）'],165:['南南東やや南','丙（ひのえ）'],345:['北北西やや北','壬（みずのえ）']};
const JIKKAN='甲乙丙丁戊己庚辛壬癸', JUNISHI='子丑寅卯辰巳午未申酉戌亥';
const ehouDeg=y=>EHOU_DEG[(((y-4)%10)+10)%10];
const yearKs=y=>{ const k=(((y-4)%60)+60)%60; return JIKKAN[k%10]+JUNISHI[k%12]; };
// 立春の日（koyomi-data.js があれば その表から。なければ 2月4日）
function risshun(y){
  const A=window.KOYOMI_ASTRO;
  if(A && A.sun && A.sun['315']){
    const p=A.sun['315'], i=y-A.y0, w=A.w, B=Math.pow(36,w)/2;
    if(i>=0 && i<=p[1].length/w){ let m=p[0]; for(let k=0;k<i;k++) m+=parseInt(p[1].substr(k*w,w),36)-B+A.ms;
      const t=new Date(Date.UTC(1900,0,1)+m*60000+9*3600000); return {m:t.getUTCMonth()+1, d:t.getUTCDate()}; }
  }
  return {m:2, d:4};
}
// いまの恵方の年（節分の日からは その年の恵方。節分は 立春の前の日）
function ehouYear(now){
  const y=now.getFullYear(), r=risshun(y), setsubun=new Date(y, r.m-1, r.d-1);
  const t=new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return t>=setsubun ? y : y-1;
}

/* ───────── 状態 ───────── */
let st=null, head=0, raw=null, src='', live=false, manual=false, onEhou=false, sx=1, sy=0, drag=null, raf=0, waitT=0;
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  st={decl:DECL.some(d=>d[0]===o.decl) ? o.decl : 7, ring:o.ring==='24'?'24':'12',
    pins:(Array.isArray(o.pins)?o.pins:[]).filter(p=>p && typeof p==='object').map(p=>({n:line(p.n,20)||'向き', d:Math.round(norm(+p.d||0)), t:/^\d{4}-\d\d-\d\d$/.test(p.t||'')?p.t:''})).slice(0,MAX_PIN)};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }
const toastH=m=>{ if(typeof toast==='function') toast(m, 3000); };

/* ───────── 盤（SVG）───────── */
const R=100, P=(deg,r)=>{ const a=(deg-90)*Math.PI/180; return [r*Math.cos(a), r*Math.sin(a)]; };
function wedge(deg, half, r0, r1){
  const a=P(deg-half,r1), b=P(deg+half,r1), c=P(deg+half,r0), d=P(deg-half,r0);
  return `M${a[0].toFixed(2)},${a[1].toFixed(2)} A${r1},${r1} 0 0 1 ${b[0].toFixed(2)},${b[1].toFixed(2)} L${c[0].toFixed(2)},${c[1].toFixed(2)} A${r0},${r0} 0 0 0 ${d[0].toFixed(2)},${d[1].toFixed(2)} Z`;
}
function dialSvg(){
  const ey=ehouYear(new Date()), ed=ehouDeg(ey);
  let t='';
  for(let a=0;a<360;a+=5){ const big=a%45===0, mid=a%15===0, p1=P(a,R-1), p2=P(a,big?R-10:mid?R-7:R-4);
    t+=`<line x1="${p1[0].toFixed(2)}" y1="${p1[1].toFixed(2)}" x2="${p2[0].toFixed(2)}" y2="${p2[1].toFixed(2)}" class="tk${big?' big':''}"/>`; }
  const lab=(deg, r, txt, cls)=>{ const p=P(deg,r); return `<text x="${p[0].toFixed(2)}" y="${p[1].toFixed(2)}" class="${cls}" data-x="${p[0].toFixed(2)}" data-y="${p[1].toFixed(2)}">${txt}</text>`; };
  let labels='';
  DIR8.forEach((n,i)=>{ labels+=lab(i*45, R-21, n, 'l8'+(i===0?' n':'')); });
  if(st.ring==='24') D24.forEach((n,i)=>{ labels+=lab(i*15, R-38, n, 'l24'+((i===3||i===15)?' ki':'')+(i*15===ed?' eh':'')); });
  else [...SHI].forEach((n,i)=>{ labels+=lab(i*30, R-38, n, 'l12'); });
  const pins=st.pins.map((p,i)=>{ const a=P(p.d,R-52), b=P(p.d,R-12); return `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" class="pin"/>`+lab(p.d, R-58, esc(p.n.slice(0,4)), 'pn'); }).join('');
  const ep=P(ed,R-50), epo=P(ed,R+0);
  return `<svg viewBox="-112 -112 224 224" class="hoi-svg" role="img" aria-label="方位磁石">
    <circle r="${R+10}" class="bg"/>
    <g id="hoiDial">
      <circle r="${R}" class="rim"/>
      <path d="${wedge(45,7.5,R-46,R-1)}" class="kimon"/><path d="${wedge(225,7.5,R-46,R-1)}" class="kimon"/>
      <path d="${wedge(ed,7.5,26,R-1)}" class="ehou"/>
      <line x1="${ep[0].toFixed(2)}" y1="${ep[1].toFixed(2)}" x2="${epo[0].toFixed(2)}" y2="${epo[1].toFixed(2)}" class="eline"/>
      ${t}<circle r="${R-30}" class="in"/>${pins}${labels}
      ${lab(45, R-56, '鬼門', 'tag ki')}${lab(225, R-56, '裏鬼門', 'tag ki')}${lab(ed, 16+R-90, '恵方', 'tag eh')}
    </g>
    <path d="M0,-${R+9} L-7,-${R-6} L7,-${R-6} Z" class="ptr"/>
    <circle r="3" class="ctr"/>
  </svg>`;
}
// 盤を回す（文字は まっすぐのまま）
function paint(){
  raf=0;
  const g=$('hoiDial'); if(!g) return;
  g.setAttribute('transform', `rotate(${(-head).toFixed(1)})`);
  g.querySelectorAll('text').forEach(e=>e.setAttribute('transform', `rotate(${head.toFixed(1)} ${e.dataset.x} ${e.dataset.y})`));
  const ed=ehouDeg(ehouYear(new Date())), diff=((ed-head+540)%360)-180, near=Math.abs(diff)<=3;
  const n=d24(head);
  $('hoiNow').innerHTML=`<b>${dir16(head)}</b><span>${Math.round(norm(head))}°</span><small>十二支：${shi(head)}・二十四方位：${D24[n]}（${D24Y[n]}）</small>`;
  $('hoiTo').innerHTML=near ? '🎉 <b>恵方を向いています</b>' : `恵方（${EHOU_N[ed][0]}）まで：<b>${diff>0?'右':'左'}へ ${Math.round(Math.abs(diff))}°</b>`;
  $('hoiTo').classList.toggle('on', near);
  if(near && !onEhou && live && navigator.vibrate) try{ navigator.vibrate(150); }catch(_){}
  onEhou=near;
}
const sched=()=>{ if(!raf) raf=requestAnimationFrame(paint); };
function setHead(h, smooth){
  h=norm(h);
  if(smooth){ const a=h*Math.PI/180; sx=sx*0.75+Math.cos(a)*0.25; sy=sy*0.75+Math.sin(a)*0.25; head=norm(Math.atan2(sy,sx)*180/Math.PI); }
  else { head=h; sx=Math.cos(h*Math.PI/180); sy=Math.sin(h*Math.PI/180); }
  sched();
}

/* ───────── センサー ───────── */
function onOri(e){
  let h=null;
  if(typeof e.webkitCompassHeading==='number' && !isNaN(e.webkitCompassHeading)) h=e.webkitCompassHeading;   // iPhone：磁北から 時計回り
  else if((e.absolute===true || e.type==='deviceorientationabsolute') && e.alpha!=null) h=360-e.alpha;      // Android：絶対の向き
  if(h==null) return;
  const so=(screen.orientation && typeof screen.orientation.angle==='number') ? screen.orientation.angle : (+window.orientation||0);
  raw=norm(h+so);
  if(!live){ live=true; manual=false; clearTimeout(waitT); renderCtl(); }
  setHead(raw-st.decl, true);
}
function listen(){
  stopSensor();
  if('ondeviceorientationabsolute' in window){ window.addEventListener('deviceorientationabsolute', onOri); src='abs'; }
  else { window.addEventListener('deviceorientation', onOri); src='rel'; }
  clearTimeout(waitT);
  waitT=setTimeout(()=>{ if(!live){ manual=true; renderCtl('この端末では 方位のセンサーが 使えないようです。盤を 指でなぞって回し、地図アプリや 方位磁石の北に 合わせて見てください。'); } }, 2500);
}
function stopSensor(){ window.removeEventListener('deviceorientationabsolute', onOri); window.removeEventListener('deviceorientation', onOri); }
function start(){
  const DOE=window.DeviceOrientationEvent;
  if(DOE && typeof DOE.requestPermission==='function'){
    DOE.requestPermission().then(r=>{ if(r==='granted') listen(); else { manual=true; renderCtl('方位のセンサーが 許可されませんでした。設定（Safari の「モーションと画面の向きのアクセス」）で許可するか、盤を 指で回して見てください。'); } })
      .catch(()=>{ manual=true; renderCtl('方位のセンサーを 使えませんでした。盤を 指で回して見てください。'); });
  } else if(DOE) listen();
  else { manual=true; renderCtl('この端末では 方位のセンサーが 使えません。盤を 指でなぞって回して見てください。'); }
}
// 指でなぞって 盤を回す（センサーがないとき・合わせたいとき）
function bindDrag(){
  const box=$('hoiDialBox'); if(!box || box.dataset.b) return; box.dataset.b='1';
  const ang=e=>{ const r=box.getBoundingClientRect(); return Math.atan2(e.clientY-(r.top+r.height/2), e.clientX-(r.left+r.width/2))*180/Math.PI; };
  box.addEventListener('pointerdown', e=>{ if(live) return; drag={a:ang(e), h:head}; try{ box.setPointerCapture(e.pointerId); }catch(_){} });
  box.addEventListener('pointermove', e=>{ if(!drag) return; setHead(drag.h-(ang(e)-drag.a), false); });
  ['pointerup','pointercancel'].forEach(t=>box.addEventListener(t, ()=>{ drag=null; }));
}

/* ───────── 画面 ───────── */
function renderCtl(msg){
  const c=$('hoiCtl'); if(!c) return;
  c.innerHTML=(live ? `<div class="hoi-st ok">🧭 方位センサーで 動いています。スマホを <b>水平に</b> 持ってください。${st.decl?`（偏角 西へ ${st.decl}° を直しています）`:''}</div>`
      : manual ? `<div class="hoi-st">${esc(msg||'盤を 指でなぞって回せます。')}</div><div class="hoi-rot"><button type="button" onclick="HOI.rot(-15)">↺ 15°</button><button type="button" onclick="HOI.rot(-1)">↺ 1°</button><button type="button" onclick="HOI.rot(1)">↻ 1°</button><button type="button" onclick="HOI.rot(15)">↻ 15°</button></div><button type="button" class="hoi-b" onclick="HOI.start()">🧭 もう一度 センサーを使う</button>`
      : `<button type="button" class="hoi-b pri" onclick="HOI.start()">🧭 方位を使う（スマホの向きのセンサー）</button><div class="hoi-st">押すと 方位磁石になります（iPhone は 許可を求められます）。</div>`);
}
function pinsHtml(){
  if(!st.pins.length) return '<div class="hoi-note">玄関・窓・畑の畝などに スマホを向けて「📌 この向きを残す」を押すと、名前をつけて残せます（盤に しるしが出ます）。</div>';
  return st.pins.map((p,i)=>{ const n=d24(p.d), k=(n===3||n===15);
    return `<div class="hoi-pin"><span class="w"><b>${esc(p.n)}</b><small>${dir16(p.d)}・${p.d}°・${D24[n]}${k?'（'+(n===3?'鬼門':'裏鬼門')+'）':''}${p.t?'・'+p.t.replace(/-/g,'/'):''}</small></span><button type="button" onclick="HOI.pinDel(${i})" aria-label="消す">🗑</button></div>`; }).join('');
}
function render(){
  const now=new Date(), ey=ehouYear(now), ed=ehouDeg(ey), r=risshun(ey+1), ny=ehouDeg(ey+1);
  $('hoiBody').innerHTML=`<div class="hoi-wrap">
    <div class="hoi-eh"><div class="t">⛩ いまの恵方：<b>${EHOU_N[ed][0]}</b><small>（${ed}°・${EHOU_N[ed][1]}の方位）</small></div>
      <div class="s">${ey}年（${yearKs(ey)}）の立春から ${ey+1}年の節分まで。${ey+1}年の恵方は ${EHOU_N[ny][0]}（${ey+1}年の節分 ${r.m}/${r.d-1} から）。</div></div>
    <div class="hoi-now" id="hoiNow"></div>
    <div class="hoi-to" id="hoiTo"></div>
    <div class="hoi-dial" id="hoiDialBox">${dialSvg()}</div>
    <div id="hoiCtl"></div>
    <div class="hoi-acts"><button type="button" class="hoi-b" onclick="HOI.pin()">📌 この向きを残す</button>
      <button type="button" class="hoi-b" onclick="HOI.ring()">${st.ring==='24'?'十二支の目盛りに':'二十四方位の目盛りに'}</button></div>
    <div class="hoi-sec"><h4>📌 残した向き</h4>${pinsHtml()}</div>
    <div class="hoi-sec"><h4>🧭 偏角（磁北と真北の ずれ）</h4>
      <div class="hoi-decl">${DECL.map(([v,n])=>`<button type="button" class="${st.decl===v?'on':''}" onclick="HOI.decl(${v})">${n}</button>`).join('')}</div>
      <div class="hoi-note">方位磁石の北（磁北）は、地図の北（真北）より 西へ ずれています（日本で 約5〜9°）。住んでいる所をえらぶと 真北で見られます。センサーは 鉄・磁石・電気の機器の近くで くるいます。</div></div>
    <div class="hoi-sec"><h4>📖 恵方・鬼門のこと</h4>
      <p><b>恵方（えほう）</b>：その年の 福の神（歳徳神）が いる方角。節分に 恵方巻を この方角を向いて だまって食べると 福が来るとされる。年の十干で 東北東・西南西・南南東・北北西 の4つが めぐる（南南東が 2回）。</p>
      <p><b>鬼門（きもん）</b>：北東（艮・うしとら）。鬼が出入りする方角とされ、玄関・トイレ・水まわりを 置かないようにする 言い伝え。</p>
      <p><b>裏鬼門（うらきもん）</b>：南西（坤・ひつじさる）。鬼門の反対で、同じように 気にされる。</p>
      <p class="hoi-note">家の中心から見た方角で 考えます。言い伝えで、地域や家で 考え方が ちがいます。</p></div>
  </div>`;
  renderCtl(manual ? '盤を 指でなぞって回せます。' : '');
  bindDrag(); sched();
}
function rot(d){ setHead(head+d, false); }
async function pin(){
  const v=typeof appPrompt==='function' ? await appPrompt('この向き（'+dir16(head)+'・'+Math.round(norm(head))+'°）の名前（例：玄関・寝室の窓・畑の畝）','') : prompt('名前','');
  if(v==null) return;
  if(st.pins.length>=MAX_PIN){ toastH('残せるのは '+MAX_PIN+'まで です'); return; }
  const d=new Date(), t=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  st.pins.push({n:line(v,20)||'向き', d:Math.round(norm(head)), t}); save(); render();
}
async function pinDel(i){
  const p=st.pins[i]; if(!p) return;
  if(typeof appConfirm==='function' && !await appConfirm('「'+p.n+'」の向きを消しますか？','消す','やめる')) return;
  st.pins.splice(i,1); save(); render();
}
function ring(){ st.ring=st.ring==='24'?'12':'24'; save(); render(); }
function decl(v){ if(!DECL.some(d=>d[0]===v)) return; st.decl=v; save(); if(raw!=null) setHead(raw-st.decl, false); render(); }

const HOI_CSS=`
#hoiOverlay .hoi-modal{ display:flex; flex-direction:column; }
.hoi-body{ flex:1; min-height:0; overflow:auto; padding:10px 12px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.hoi-wrap{ max-width:560px; margin:0 auto; }
.hoi-eh{ padding:10px 12px; border-radius:14px; background:rgba(200,150,30,.14); border:1px solid rgba(200,150,30,.45); margin:0 0 8px; }
.hoi-eh .t{ font-size:15px; } .hoi-eh .t b{ font-size:20px; } .hoi-eh .t small{ color:var(--text-light,#666); font-size:12.5px; }
.hoi-eh .s{ font-size:12.5px; color:var(--text-light,#555); margin-top:3px; line-height:1.55; }
.hoi-now{ text-align:center; margin:6px 0 0; } .hoi-now b{ font-size:30px; } .hoi-now span{ font-size:20px; margin-left:8px; font-variant-numeric:tabular-nums; }
.hoi-now small{ display:block; font-size:13px; color:var(--text-light,#555); }
.hoi-to{ text-align:center; font-size:14.5px; margin:2px 0 4px; min-height:22px; } .hoi-to.on{ color:#a06b00; font-size:17px; } body.dark .hoi-to.on{ color:#ffd54f; }
.hoi-dial{ width:min(86vw,380px); margin:0 auto; touch-action:none; user-select:none; -webkit-user-select:none; }
.hoi-svg{ display:block; width:100%; height:auto; }
.hoi-svg .bg{ fill:var(--modal-bg,#fff); stroke:rgba(120,132,156,.35); stroke-width:1; }
.hoi-svg .rim{ fill:none; stroke:var(--text,#333); stroke-width:1.4; }
.hoi-svg .in{ fill:none; stroke:rgba(120,132,156,.35); stroke-width:.8; }
.hoi-svg .tk{ stroke:var(--text-light,#777); stroke-width:.6; } .hoi-svg .tk.big{ stroke:var(--text,#333); stroke-width:1.2; }
.hoi-svg text{ text-anchor:middle; dominant-baseline:central; fill:var(--text,#222); font-family:inherit; }
.hoi-svg .l8{ font-size:10px; font-weight:bold; } .hoi-svg .l8.n{ fill:#d32f2f; font-size:12px; }
.hoi-svg .l12{ font-size:9px; fill:var(--text-light,#555); } .hoi-svg .l24{ font-size:7.5px; fill:var(--text-light,#555); }
.hoi-svg .l24.ki{ fill:#c62828; font-weight:bold; } .hoi-svg .l24.eh{ fill:#a06b00; font-weight:bold; }
.hoi-svg .kimon{ fill:rgba(211,47,47,.16); } .hoi-svg .ehou{ fill:rgba(200,150,30,.28); }
.hoi-svg .eline{ stroke:#c8961e; stroke-width:2.2; stroke-linecap:round; }
.hoi-svg .tag{ font-size:7.5px; font-weight:bold; } .hoi-svg .tag.ki{ fill:#c62828; } .hoi-svg .tag.eh{ fill:#a06b00; }
.hoi-svg .pin{ stroke:#1e88e5; stroke-width:1.6; stroke-dasharray:3 2; } .hoi-svg .pn{ font-size:7px; fill:#1565c0; font-weight:bold; }
.hoi-svg .ptr{ fill:#d32f2f; } .hoi-svg .ctr{ fill:var(--text,#333); }
body.dark .hoi-svg .l8.n, body.dark .hoi-svg .tag.ki, body.dark .hoi-svg .l24.ki{ fill:#ef9a9a; } body.dark .hoi-svg .tag.eh, body.dark .hoi-svg .l24.eh{ fill:#ffd54f; } body.dark .hoi-svg .pn{ fill:#90caf9; }
.hoi-st{ font-size:13px; line-height:1.6; padding:7px 10px; border-radius:10px; background:rgba(120,132,156,.1); margin:8px 0 6px; } .hoi-st.ok{ background:var(--acc-weak,rgba(33,115,70,.12)); }
.hoi-rot{ display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin:0 0 6px; }
.hoi-rot button{ min-height:42px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.hoi-b{ display:block; width:100%; min-height:46px; margin:6px 0 0; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.hoi-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-size:16px; min-height:52px; }
.hoi-acts{ display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:4px 0 10px; } .hoi-acts .hoi-b{ margin:0; font-size:14px; }
.hoi-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.hoi-sec h4{ margin:0 0 6px; font-size:15.5px; } .hoi-sec p{ margin:6px 0; font-size:13.5px; line-height:1.65; }
.hoi-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; }
.hoi-decl{ display:flex; flex-wrap:wrap; gap:5px; }
.hoi-decl button{ min-height:36px; padding:0 10px; border-radius:18px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13px; cursor:pointer; }
.hoi-decl button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.hoi-pin{ display:flex; align-items:center; gap:8px; padding:7px 0; border-top:1px solid rgba(120,132,156,.16); }
.hoi-pin .w{ flex:1; min-width:0; } .hoi-pin small{ display:block; font-size:12px; color:var(--text-light,#666); }
.hoi-pin button{ flex:none; width:40px; height:40px; border-radius:20px; border:1px solid rgba(120,132,156,.4); background:transparent; cursor:pointer; }
`;
function ensureDom(){
  if($('hoiOverlay')) return;
  const stl=document.createElement('style'); stl.id='hoiStyle'; stl.textContent=HOI_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="hoiOverlay">
  <div class="modal vol-modal hoi-modal modal-full" style="position:relative">
    <div class="modal-header"><span>⛩ 方位と恵方</span><button class="modal-close" onclick="closeHoi()" aria-label="閉じる">✕</button></div>
    <div class="hoi-body" id="hoiBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  $('hoiOverlay').addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openHoi(){
  ensureDom(); load(); live=false; manual=false; onEhou=false; raw=null;
  openDlg('hoiOverlay', ()=>{ stopSensor(); clearTimeout(waitT); live=false; });
  render();
  // Android など 許可の いらない端末は すぐ センサーを使う（iPhone は ボタンを押してから）
  const DOE=window.DeviceOrientationEvent;
  if(DOE && typeof DOE.requestPermission!=='function') listen();
}
function closeHoi(){ if(!$('hoiOverlay')||!isDlgOpen('hoiOverlay')) return; closeDlg('hoiOverlay', ()=>{ stopSensor(); clearTimeout(waitT); live=false; }); }

window.HOI={ start, rot, pin:()=>{ pin(); }, pinDel:i=>{ pinDel(i); }, ring, decl,
  ehou:y=>{ const d=ehouDeg(y); return {deg:d, name:EHOU_N[d][0], kan:EHOU_N[d][1]}; }, ehouYear:(y,m,d)=>ehouYear(new Date(y,m-1,d)),
  dir:d=>({d16:dir16(d), shi:shi(d), d24:D24[d24(d)]}), head:()=>Math.round(norm(head)*10)/10, setHead:h=>setHead(h,false), feed:e=>onOri(e), state:()=>JSON.parse(JSON.stringify(st)) };
Object.assign(window, { openHoi, closeHoi });
})();
