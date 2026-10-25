/* 🎉 ど派手カウンター（v575。表電卓の道具。はじめて開いたときに読む。apps/hadecount/ から単独のアプリとしても開ける）
   ・大きな画面を 押すたびに ＋（1回に 足す数は 1・2・5・10・🎲 ランダム）。数字が はじけ、押したところから 光の粒・絵文字・輪が 飛び、
     つづけて 早く押すと コンボ（音が だんだん 高くなる。×10・×25・×50・×100 で 花火）。
   ・10 ごとに 小さな花火、50・100・500・1000 で 大きく、目標の数に とどくと 花火・紙ふぶき・ファンファーレ（背景は hade-fx.js）。
   ・−（へらす）・↶ もどす（1つ前に）・0 に もどす。目標を 決めると メーターが たまる（「あと ○」）。
   ・カウンターは 8つまで（名前・色・絵文字・目標・足す数を それぞれに）。「並べて」で いっしょに 数える（男女別・種類別 など）。
   ・Bluetooth の リモコン・キーボードでも 数えられる（スペース・Enter・↑・→ で ＋、↓・← で −）。
   ・演出の強さ（v576）：ド派手は 押すたびに 大きな輪・5ごとに 花火、ドド派手は 押すたびに ゆれて 数字が 七色・コンボ 5ごとに ほめ言葉。
   ・🎲 ランダム（v582）：決めた はんい（最小〜最大。見本 1〜6・1〜10・1〜100・10〜50）の どれかを 押すたびに 足す。
     − も 同じ はんいで へる（↶ もどす は ちょうど 1つ前に）。いちばん 大きい 数が 出ると「大当たり！」。
   ・押した 音（v583）：🎈 ポン・🪙 チャリン・🥁 ドン・🎮 ピコッ・🔔 チーン・🎹 木琴・👏 パチッ・💧 ぽちゃ・⚡ ピュン・🔀 おまかせ（毎回 ちがう）。
     押した ところの 演出（v583）：✨ きらきら・🎲 サイコロ・🎆 花火・⭐ 星・💖 ハート・🫧 あわ・💥 どかん・🪙 コイン・🌸 花びら・🎊 紙ふぶき・🔀 おまかせ。
     どちらも カウンターごとに えらべる（並べて 数える ときに 音で 聞き分けられる）。えらぶと その場で 鳴る・出る（hade-fx.js）。
   ・1時間ごとの数を 記録（2週間 残す）。「📋 数を コピー」で 文字にして 貼れる。
   ・数・名前・目標・記録・えらんだものは excalc_hadecount（この端末の中だけ）。 */
(function(){
'use strict';
const FX=window.HADE_FX;
const KEY='excalc_hadecount', MAX_C=8, MAX_N=9999999, MAX_UNDO=50, KEEP_DAYS=14;
const COLS=[['gold','金','#ffd23f'],['pink','ピンク','#ff5fa8'],['cyan','水色','#38e8ff'],['lime','黄緑','#9dff5c'],['orange','オレンジ','#ff8a3d'],['violet','紫','#c77dff'],['red','赤','#ff4040'],['white','白','#f4f4f4']];
const EMOS=['⭐','💖','🎉','🔥','🌸','💰','🍀','⚡','👍','🐟','🍺','🏃','🚗','🐦','👤','✅'];
const STEPS=[1,2,5,10];
const MAX_R=1000, RNG=[[1,6,'🎲 1〜6'],[1,10,'1〜10'],[1,100,'1〜100'],[10,50,'10〜50']];   // 🎲 ランダムの はんい（v582）と 見本
const TAPK=FX.TAPS.map(x=>x[0]), FXK=FX.TAP_FX.map(x=>x[0]);   // 押した 音・押した ところの 演出（v583。'rand' は おまかせ）
const VIEWS=[['one','1つを 大きく'],['grid','並べて']];
const PRAISE=['ナイス！','いいね！','すごい！','最高！','神！','天才！'];   // ドド派手の コンボで 出る ことば
const NUMF='"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Segoe UI",Roboto,sans-serif';
const TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const toastC=m=>{ if(typeof toast==='function') toast(m, 3000); };
const int=(v,a,b,d)=>{ v=Math.round(+v); return isFinite(v) && v>=a && v<=b ? v : d; };
const rnd=(a,b)=>a+Math.random()*(b-a);
const rid=()=>Math.random().toString(36).slice(2,9);
const fmtN=n=>Number(n).toLocaleString('ja-JP');
const colOf=c=>(COLS.find(x=>x[0]===c)||COLS[0])[2];
const reduceMotion=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_){ return false; } };
const pad2=n=>String(n).padStart(2,'0');
const hourKey=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours());
const dayKey=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const emoOk=e=>{ e=Array.from(oneLine(e,8)).slice(0,2).join(''); return e && !/[<>&"'`]/.test(e) ? e : ''; };

/* ───────── 状態 ───────── */
let st=null, undo=[], combo=0, lastTap=0, lastIdx=-1, saveT=0, lastRoll=0, lastSnd='', lastFx='';
const newC=(name, i)=>({id:rid(), name:name||'カウンター', n:0, goal:0, step:1, rnd:false, ra:1, rb:6, tap:'pop', fx:'kira', emo:EMOS[(i||0)%EMOS.length], col:COLS[(i||0)%COLS.length][0], hist:{}});
const pickOf=a=>a[Math.floor(Math.random()*a.length)];
// 🎲 ランダム：はんいの 中の 数を 1つ（最小〜最大 どれも 同じ くらい 出る）
const roll=c=>c.ra+Math.floor(Math.random()*(c.rb-c.ra+1));
function cleanC(c, i){
  if(!c || typeof c!=='object') return null;
  const hist={};
  if(c.hist && typeof c.hist==='object') Object.keys(c.hist).slice(-KEEP_DAYS*24).forEach(k=>{ if(/^\d{4}-\d\d-\d\d \d\d$/.test(k)){ const v=int(c.hist[k], -MAX_N, MAX_N, null); if(v!=null) hist[k]=v; } });
  let ra=int(c.ra,1,MAX_R,1), rb=int(c.rb,1,MAX_R,6); if(ra>rb) [ra,rb]=[rb,ra];
  return {id:typeof c.id==='string' && /^[a-z0-9]{3,12}$/.test(c.id) ? c.id : rid(), name:oneLine(c.name,16)||('カウンター'+(i+1)), n:int(c.n,0,MAX_N,0), goal:int(c.goal,0,MAX_N,0),
    step:STEPS.includes(+c.step) ? +c.step : 1, rnd:c.rnd===true, ra, rb, tap:c.tap==='rand' || TAPK.includes(c.tap) ? c.tap : 'pop', fx:c.fx==='rand' || FXK.includes(c.fx) ? c.fx : 'kira',
    emo:emoOk(c.emo)||EMOS[i%EMOS.length], col:COLS.some(x=>x[0]===c.col) ? c.col : COLS[i%COLS.length][0], hist};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const list=(Array.isArray(o.list) ? o.list : []).map(cleanC).filter(Boolean).slice(0, MAX_C);
  if(!list.length) list.push(newC('カウンター', 0));
  st={list, cur:int(o.cur,0,list.length-1,0), theme:FX.hasTheme(o.theme) ? o.theme : 'neon', level:FX.hasLevel(o.level) ? o.level : (reduceMotion() ? 'calm' : 'ultra'),
    snd:o.snd!==false, vibe:o.vibe!==false, flash:o.flash!==false, view:VIEWS.some(v=>v[0]===o.view) ? o.view : 'one'};
}
function prune(){
  const lim=dayKey(new Date(Date.now()-KEEP_DAYS*86400000));
  st.list.forEach(c=>{ Object.keys(c.hist).forEach(k=>{ if(k.slice(0,10)<lim) delete c.hist[k]; }); });
}
function save(){ clearTimeout(saveT); saveT=0; try{ prune(); localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }
function saveSoon(){ clearTimeout(saveT); saveT=setTimeout(save, 400); }
const vib=p=>{ if(st && st.vibe) FX.vib(p); };
const snd=(name, ...a)=>{ const f=FX.snd[name]; if(f && st && st.snd) f(...a); };   // 音は この道具の 設定で（タイマーと 別々）
// 押した 音（カウンターごと。🔀 おまかせは 毎回 ちがう 音）
function tapSnd(c, i){ const k=c.tap==='rand' ? pickOf(TAPK) : c.tap; lastSnd=k; if(st && st.snd) FX.tapSnd(k, i); }
const curC=()=>st.list[st.cur]||st.list[0];

/* ───────── 描く ───────── */
let eng=null, raf=0, lastTs=0, frozen=false, tiles=[], banT=0, fullRel=null;
function layout(){
  const e=eng, W=e.W, H=e.H, d=e.d;
  if(st.view!=='grid' || st.list.length<2){ tiles=[{i:st.cur, x:0, y:0, w:W, h:H-(isFull() ? 60*d : 0)}]; return; }
  const n=st.list.length, cols=W>H*1.1 ? Math.min(n, 4) : (n<=3 ? 1 : 2), rows=Math.ceil(n/cols), gap=8*d, top=10*d, bot=(isFull() ? 76 : 10)*d;   // 全画面は 下の ボタンの 分 あける
  const tw=(W-gap*(cols+1))/cols, th=(H-top-bot-gap*(rows-1))/rows;
  tiles=st.list.map((c,i)=>({i, x:gap+(i%cols)*(tw+gap), y:top+Math.floor(i/cols)*(th+gap), w:tw, h:th}));
}
function drawNum(c, T, big){
  const e=eng, g=e.g, d=e.d, col=colOf(c.col), s=fmtN(c.n), t=e.t;
  const cx=T.x+T.w/2, cy=T.y+T.h*(big ? 0.47 : 0.52);
  const fs=Math.max(14*d, Math.min(T.w*0.86/(Array.from(s).length*0.6+0.2), T.h*(big ? 0.4 : 0.42)));
  const k=c._pop!=null ? Math.max(0, 1-(t-c._pop)/0.32) : 0, kd=c._dn!=null ? Math.max(0, 1-(t-c._dn)/0.3) : 0, sc=1+0.34*Math.sin(k*Math.PI)*k-0.18*kd;
  g.save(); g.translate(cx, cy); g.scale(sc, sc);
  g.font='900 '+Math.round(fs)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle';
  const fill=g.createLinearGradient(0, -fs*0.5, 0, fs*0.5), bo=e.boost(), hh=(t*150)%360;
  if(bo>=2){ fill.addColorStop(0, '#ffffff'); fill.addColorStop(0.45, 'hsl('+hh.toFixed(0)+',100%,68%)'); fill.addColorStop(1, 'hsl('+((hh+70)%360).toFixed(0)+',100%,55%)'); }   // ドド派手は 七色
  else { fill.addColorStop(0, '#ffffff'); fill.addColorStop(0.55, col); fill.addColorStop(1, col); }
  if(e.level!=='calm'){ g.shadowColor=bo>=2 ? 'hsl('+hh.toFixed(0)+',100%,60%)' : col; g.shadowBlur=fs*(0.14+0.25*k+0.1*bo); }
  g.lineJoin='round'; g.lineWidth=fs*0.07; g.strokeStyle='rgba(0,0,0,.6)'; g.strokeText(s, 0, fs*0.03);
  g.fillStyle=fill; g.fillText(s, 0, fs*0.03); g.restore();
  // 名前
  const ns=Math.round(Math.min(T.w*0.07, (big ? 26 : 20)*d));
  g.save(); g.font='bold '+ns+'px '+NUMF; g.textAlign='center'; g.textBaseline='top'; g.fillStyle='rgba(255,255,255,.95)'; g.lineWidth=ns*0.18; g.strokeStyle='rgba(0,0,0,.55)'; g.lineJoin='round';
  const name=c.emo+' '+c.name; g.strokeText(name, cx, T.y+(big ? 14 : 8)*d); g.fillText(name, cx, T.y+(big ? 14 : 8)*d);
  if(c.rnd && (big || T.h>260*d)){ const rs=Math.round(ns*0.78), rt='🎲 '+fmtN(c.ra)+'〜'+fmtN(c.rb), ry=T.y+(big ? 14 : 8)*d+ns*1.25; g.font='bold '+rs+'px '+NUMF; g.lineWidth=rs*0.18; g.fillStyle='rgba(255,243,150,.95)'; g.strokeText(rt, cx, ry); g.fillText(rt, cx, ry); }   // 🎲 ランダムの はんい
  g.restore();
  // 目標の メーター
  if(c.goal>0){
    const mw=T.w*0.78, mh=Math.max(8*d, Math.min(18*d, T.h*0.05)), mx=cx-mw/2, my=T.y+T.h*(big ? 0.8 : 0.82), f=Math.min(1, c.n/c.goal);
    g.save(); g.fillStyle='rgba(255,255,255,.14)'; rr(g, mx, my, mw, mh, mh/2); g.fill();
    if(f>0){ const gr=g.createLinearGradient(mx, 0, mx+mw, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, col); g.fillStyle=gr; if(e.level!=='calm'){ g.shadowColor=col; g.shadowBlur=mh*1.2; } rr(g, mx, my, Math.max(mh, mw*f), mh, mh/2); g.fill(); }
    g.shadowBlur=0; const ts=Math.round(Math.max(12*d, mh*1.15));
    g.font='bold '+ts+'px '+NUMF; g.textAlign='center'; g.textBaseline='top'; g.fillStyle='rgba(255,255,255,.92)';
    g.fillText(c.n>=c.goal ? '🎉 目標 '+fmtN(c.goal)+' たっせい！' : '目標 '+fmtN(c.goal)+' まで あと '+fmtN(c.goal-c.n), cx, my+mh+6*d);
    g.restore();
    if(f>0 && f<1 && Math.random()<0.3 && e.level!=='calm') e.spark(mx+mw*f, my+mh/2, rnd(-40,40)*d, rnd(-80,-20)*d, '#ffffff', {life:0.5, gr:60, sz:1.6});
  }
}
function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x+r, y); g.arcTo(x+w, y, x+w, y+h, r); g.arcTo(x+w, y+h, x, y+h, r); g.arcTo(x, y+h, x, y, r); g.arcTo(x, y, x+w, y, r); g.closePath(); }
function paint(){
  const e=eng, g=e.g, d=e.d;
  e.drawBg(); layout();
  const [ox,oy]=e.offset(); g.save(); g.translate(ox, oy);
  const big=tiles.length===1;
  tiles.forEach(T=>{
    const c=st.list[T.i]; if(!c) return;
    if(!big){ g.save(); g.fillStyle='rgba(0,0,0,.32)'; rr(g, T.x, T.y, T.w, T.h, 14*d); g.fill(); g.lineWidth=(T.i===st.cur ? 3 : 1.5)*d; g.strokeStyle=colOf(c.col); g.globalAlpha=T.i===st.cur ? 0.95 : 0.55; g.stroke(); g.restore(); }
    drawNum(c, T, big);
  });
  // コンボ
  const since=e.t-(lastTap ? e._tapT||0 : 0);
  if(combo>=5 && since<0.9){
    const a=Math.min(1, (0.9-since)*2.5), s=Math.round(Math.min(64, 26+combo*0.6)*d), hue=(e.t*240)%360;
    g.save(); g.globalAlpha=a; g.font='900 '+s+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle';
    g.lineJoin='round'; g.lineWidth=s*0.16; g.strokeStyle='rgba(0,0,0,.6)'; const y=e.H*(big ? 0.1 : 0.04)+s*0.9;
    g.strokeText('×'+combo+' COMBO', e.W/2, y); g.fillStyle='hsl('+hue+',100%,65%)'; g.fillText('×'+combo+' COMBO', e.W/2, y); g.restore();
  }
  g.restore();
  g.save(); g.translate(ox, oy); e.drawFx(); g.restore();
  paintMinus();
}
// 並べて 数えるとき：タイルの 右下に「−」
function paintMinus(){
  const box=$('hcMinus'); if(!box) return;
  const want=tiles.length>1 ? tiles.map(T=>T.i).join(',') : '';
  if(box.dataset.k!==want){
    box.dataset.k=want;
    box.innerHTML=tiles.length>1 ? tiles.map(T=>`<button type="button" class="hc-tmin" data-i="${T.i}" aria-label="${esc(st.list[T.i].name)} を へらす" onclick="HADE_COUNT.minus(${T.i})">−</button>`).join('') : '';
  }
  if(tiles.length>1 && eng){
    const d=eng.d; box.querySelectorAll('.hc-tmin').forEach(b=>{ const T=tiles.find(x=>x.i===+b.dataset.i); if(!T) return; b.style.left=((T.x+T.w)/d-48)+'px'; b.style.top=((T.y+T.h)/d-48)+'px'; });
  }
}
function loop(){ if(!raf){ lastTs=performance.now(); raf=requestAnimationFrame(frame); } }
function frame(ts){
  raf=0;
  if(!eng || !$('hcCv') || !document.body.contains($('hcCv')) || document.visibilityState==='hidden') return;
  const open=$('hadeCountOverlay') && isDlgOpen('hadeCountOverlay');
  if(!open && !isFull()) return;
  raf=requestAnimationFrame(frame);
  const dt=Math.min(0.05, Math.max(0, (ts-lastTs)/1000)); lastTs=ts;
  if(frozen) return;
  eng.resize(); eng.warp=Math.max(0.12, eng.warp-dt*0.6); eng.heat=Math.max(0.3, eng.heat-dt*0.3); eng.amb=0.35;
  eng.step(dt); paint();
}
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') loop(); });
// バナーの 字の大きさ：1行に 入る 大きさに（全角は 1、半角は 0.62 字ぶん）
function fitBan(b, text, kind){
  const W=(b.parentElement ? b.parentElement.clientWidth : window.innerWidth)*0.92, u=Array.from(text).reduce((a,ch)=>a+(/[ -~]/.test(ch) ? 0.62 : 1), 0)||1;
  const max=kind==='big' ? 150 : kind==='s' ? 64 : 90; b.style.fontSize=Math.max(18, Math.min(max, W/u))+'px';
}
function banner(text, kind){
  const b=$('hcBan'); if(!b) return;
  b.className='hc-ban '+(kind||''); b.textContent=text; fitBan(b, text, kind); void b.offsetWidth; b.classList.add('go');
  clearTimeout(banT); banT=setTimeout(()=>{ const x=$('hcBan'); if(x) x.classList.remove('go'); }, kind==='big' ? 3800 : 1700);
}

/* ───────── 数える ───────── */
function tileCenter(i){ const T=tiles.find(x=>x.i===i)||tiles[0]; return T ? [T.x+T.w/2, T.y+T.h*0.47] : [eng.W/2, eng.H/2]; }
function addHist(c, k){ const key=hourKey(new Date()); c.hist[key]=(c.hist[key]||0)+k; }
function plus(i, k, x, y){
  const c=st.list[i]; if(!c) return;
  FX.unlock();
  const rolled=k==null && c.rnd;   // 🎲 ランダム（数を 決めて 呼ばれた ときは そのまま）
  k=int(k,1,1000,rolled ? roll(c) : c.step); const before=c.n; c.n=Math.min(MAX_N, c.n+k); const dk=c.n-before; if(!dk) return;
  undo.push({id:c.id, n:before}); if(undo.length>MAX_UNDO) undo.shift();
  addHist(c, dk); saveSoon(); paintHoursSoon(); lastRoll=rolled ? k : 0;
  const now=Date.now(); combo=(now-lastTap<650 && lastIdx===i) ? combo+1 : 1; lastTap=now; lastIdx=i;
  if(!eng) return;
  const e=eng, d=e.d, col=colOf(c.col); e._tapT=e.t; c._pop=e.t;
  if(x==null){ [x,y]=tileCenter(i); y+=rnd(-30,30)*d; x+=rnd(-60,60)*d; }
  // 押した ところの 演出（カウンターごと。🔀 おまかせは 毎回 ちがう。✨ きらきら は ランダムの とき サイコロも）
  const fk=c.fx==='rand' ? pickOf(FXK) : c.fx; lastFx=fk;
  e.tapFx(fk, x, y, {col, pal:[col, '#ffffff', col, FX.PAL[e.theme][0]], emo:c.emo, combo, dice:rolled});
  e.text(x, y-30*d, (rolled ? '🎲+' : '+')+fmtN(dk), {sz:(rolled ? 38 : 30)+Math.min(30, combo), col});
  if(rolled && c.rb>c.ra && k===c.rb){ banner('大当たり！ +'+fmtN(dk)); e.ring(x, y, '#fff36b', 1.8); for(let j=0;j<3;j++) e.shell(null); snd('level'); vib([40,30,80]); }   // いちばん 大きい 数
  e.pulse=1; e.warp=Math.min(1, e.warp+0.18); e.heat=Math.min(1, e.heat+0.07);
  tapSnd(c, Math.min(14, combo-1)); vib(12);
  if(combo>=8 && e.level!=='calm') e.kick(Math.min(0.5, combo*0.012));
  const bo=e.boost();
  if(bo>=1){ e.ring(x, y, col, 1.4+0.4*bo); if(c.n%5===0) e.shell(x, {sc:0.8}); }   // ド派手：大きな 輪・5 ごとに 花火
  if(bo>=2){ e.kick(0.16); e.glow(x, y, 120, col, 0.35); if(combo>=5 && combo%5===0) e.text(x, y-70*d, PRAISE[(combo/5-1)%PRAISE.length], {sz:44, pop:true, rot:rnd(-0.2,0.2), vy:-40, life:1, grad:['#ffffff','#fff36b','#ff2bd6']}); }   // ドド派手：押すたびに ゆれる・ほめ言葉
  // 節目
  const m=[1000,500,100,50,10].find(m=>Math.floor(before/m)<Math.floor(c.n/m));
  if(m) milestone(c, m, i);
  if(c.goal>0 && before<c.goal && c.n>=c.goal) goal(c);
  if([10,25,50,100,200,300].includes(combo)){ banner('×'+combo+' COMBO!', combo>=50 ? 'big' : ''); for(let j=0;j<Math.min(6, Math.ceil(combo/15)+1);j++) e.shell(null); snd('level'); vib([40,30,40]); }
}
function milestone(c, m, i){
  const e=eng, [x,y]=tileCenter(i), col=colOf(c.col);
  if(m===10){ e.shell(x); e.shell(x+rnd(-120,120)*e.d); snd('coin'); return; }
  if(m===50){ banner(fmtN(c.n)+'！'); for(let j=0;j<4;j++) e.shell(null); e.confetti(70); snd('level'); vib([60,40,60]); e.kick(0.5); return; }
  banner(fmtN(c.n)+(m>=500 ? '！ すごい！' : ' 達成！'), m>=100 ? 'big' : '');
  e.finale({shells:m>=500 ? 16 : 9, conf:m>=500 ? 220 : 140, emo:[c.emo,'🎉','✨'], flash:col});
  snd('fanfare'); vib([200,80,200,80,400]);
}
function goal(c){
  const e=eng;
  banner('🎉 目標 達成！', 'big');
  e.finale({shells:16, conf:240, emo:[c.emo,'🎉','🎊','✨','🥳'], flash:'#fff3c4'});
  e.burst(e.W/2, e.H/2, {n:140, sp:760});
  snd('fanfare'); setTimeout(()=>snd('crackle'), 1200); vib([300,120,300,120,600]);
}
function minus(i, k){
  const c=st.list[i==null ? st.cur : i]; if(!c) return;
  FX.unlock();
  const rolled=k==null && c.rnd;
  k=int(k,1,1000,rolled ? roll(c) : c.step); const before=c.n; c.n=Math.max(0, c.n-k); const dk=before-c.n;
  if(!dk){ toastC('0 より 少なくは できません'); return; }
  undo.push({id:c.id, n:before}); if(undo.length>MAX_UNDO) undo.shift();
  addHist(c, -dk); saveSoon(); paintHoursSoon(); combo=0;
  if(eng){ const e=eng, idx=st.list.indexOf(c), [x,y]=tileCenter(idx); c._dn=e.t; e.implode(x, y, {n:26, r:150, pal:[colOf(c.col),'#ffffff']}); e.text(x, y+40*e.d, (rolled ? '🎲−' : '−')+fmtN(dk), {sz:28, col:'#ffb3b3', vy:60}); }
  snd('down'); vib(25);
}
function undoLast(){
  const u=undo.pop(); if(!u){ toastC('もどせる ものが ありません'); return; }
  const c=st.list.find(x=>x.id===u.id); if(!c){ undoLast(); return; }
  const dk=u.n-c.n; c.n=u.n; addHist(c, dk); saveSoon(); combo=0;
  if(eng){ const idx=st.list.indexOf(c), [x,y]=tileCenter(idx); c._dn=eng.t; eng.implode(x, y, {n:16, r:110}); }
  snd('down'); toastC('↶ 「'+c.name+'」を '+fmtN(c.n)+' に もどしました');
  paintSide();
}
async function reset(i){
  const c=st.list[i==null ? st.cur : i]; if(!c) return;
  if(!c.n) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+c.name+'」の 数（'+fmtN(c.n)+'）を 0 に もどしますか？', '0 に もどす', 'やめる'))) return;
  undo.push({id:c.id, n:c.n}); addHist(c, -c.n); c.n=0; save(); combo=0;
  if(eng){ const idx=st.list.indexOf(c), [x,y]=tileCenter(idx); eng.implode(x, y, {n:40, r:200}); eng.kick(0.4); }
  snd('whoosh'); paintSide();
}
function stageTap(ev){
  if(!eng) return;
  ev.preventDefault();
  const r=$('hcCv').getBoundingClientRect(), d=eng.d, x=(ev.clientX-r.left)*d, y=(ev.clientY-r.top)*d;
  layout();
  const T=tiles.find(T=>x>=T.x && x<=T.x+T.w && y>=T.y && y<=T.y+T.h)||tiles[0]; if(!T) return;
  if(tiles.length>1 && st.cur!==T.i){ st.cur=T.i; paintTabs(); paintSide(); }
  plus(T.i, null, x, y);
  paintTabs();
}
function onKey(e){
  if(!($('hadeCountOverlay') && isDlgOpen('hadeCountOverlay')) && !isFull()) return;
  const tg=e.target, typing=tg && (tg.tagName==='INPUT' || tg.tagName==='TEXTAREA' || tg.tagName==='SELECT' || tg.isContentEditable);
  if(typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if(document.querySelector('body > div[style*="z-index:99999"]')) return;   // はい／いいえ の 窓が 出ているとき
  const k=e.key;
  if([' ','Enter','ArrowUp','ArrowRight','PageDown','+','='].includes(k)){ e.preventDefault(); e.stopPropagation(); plus(st.cur); paintTabs(); }
  else if(['ArrowDown','ArrowLeft','PageUp','-','Backspace'].includes(k)){ e.preventDefault(); e.stopPropagation(); minus(st.cur); paintTabs(); }
  else if(k==='Escape' && isFull()){ e.preventDefault(); e.stopPropagation(); setFull(false); }
}

/* ───────── 全画面 ───────── */
const isFull=()=>{ const s=$('hcStage'); return !!(s && s.classList.contains('full')); };
function setFull(on){
  const s=$('hcStage'); if(!s) return;
  if(on && !isFull()){
    FX.unlock();
    s.classList.add('full'); document.body.appendChild(s);
    fullRel=typeof modalBack==='function' ? modalBack(()=>setFull(false)) : null;
    wake();
  } else if(!on && isFull()){
    s.classList.remove('full');
    const home=$('hcHome'); if(home) home.appendChild(s); else s.remove();
    if(fullRel){ const f=fullRel; fullRel=null; f(); }
    unwake();
  }
  if(eng) eng.resize();
  paintSide(); loop();
}
let wl=null;
async function wake(){ try{ if(navigator.wakeLock && navigator.wakeLock.request) wl=await navigator.wakeLock.request('screen'); }catch(_){ wl=null; } }
function unwake(){ if(wl){ try{ wl.release(); }catch(_){} wl=null; } }

/* ───────── 画面 ───────── */
function paintTabs(){
  const b=$('hcTabs'); if(!b) return;
  b.innerHTML=st.list.map((c,i)=>`<button type="button" class="hc-tab${i===st.cur?' on':''}" style="--c:${colOf(c.col)}" onclick="HADE_COUNT.sel(${i})"><span>${esc(c.emo)} ${esc(c.name)}</span><b>${fmtN(c.n)}</b></button>`).join('')
    +(st.list.length<MAX_C ? `<button type="button" class="hc-tab add" onclick="HADE_COUNT.add()">＋ 足す</button>` : '');
}
function hoursHtml(c){
  const now=new Date(), today=dayKey(now), yest=dayKey(new Date(now.getTime()-86400000));
  const rows=Object.keys(c.hist).filter(k=>k.slice(0,10)===today).sort().map(k=>[+k.slice(11), c.hist[k]]).filter(r=>r[1]);
  const sum=k=>Object.keys(c.hist).filter(x=>x.slice(0,10)===k).reduce((a,x)=>a+c.hist[x], 0);
  const max=Math.max(1, ...rows.map(r=>Math.abs(r[1])));
  return `<div class="hc-tot"><span>きょう <b>${fmtN(sum(today))}</b></span><span>きのう <b>${fmtN(sum(yest))}</b></span></div>`
    +(rows.length ? `<div class="hc-hours">${rows.map(([h,v])=>`<div class="r"><span class="h">${h}時</span><span class="bar"><i style="width:${Math.max(3, Math.round(Math.abs(v)/max*100))}%;background:${colOf(c.col)}"></i></span><b>${v>0?'':'−'}${fmtN(Math.abs(v))}</b></div>`).join('')}</div>` : '<p class="hc-note">きょうは まだ 数えていません</p>');
}
let hoursT=0;
function paintHoursSoon(){ if(hoursT) return; hoursT=setTimeout(()=>{ hoursT=0; const b=$('hcHours'); if(b) b.innerHTML=hoursHtml(curC()); }, 700); }
function paintSide(){
  const b=$('hcSide'); if(!b) return;
  const c=curC(), opt=(k, list, lab)=>`<div class="hc-opt"><span>${lab}</span>${list.map(([v,n])=>`<button type="button" class="${st[k]===v?'on':''}" onclick='HADE_COUNT.opt("${k}", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>`;
  b.innerHTML=`<div class="hc-sec"><h4>⚙ このカウンター<small>${esc(c.emo)} ${esc(c.name)}</small></h4>
      <div class="hc-opt"><span>1回に 足す数</span>${STEPS.map(v=>`<button type="button" class="${!c.rnd && c.step===v?'on':''}" onclick="HADE_COUNT.set('step', ${v})">＋${v}</button>`).join('')}<button type="button" class="${c.rnd?'on':''}" onclick="HADE_COUNT.set('step', 'rnd')">🎲 ランダム</button></div>
      ${c.rnd ? `<div class="hc-rng"><div class="hc-f"><span>ランダムの はんい</span><input id="hcRa" type="number" inputmode="numeric" min="1" max="${MAX_R}" value="${c.ra}" aria-label="いちばん 小さい 数" onchange="HADE_COUNT.set('ra', this.value)"><b>〜</b><input id="hcRb" type="number" inputmode="numeric" min="1" max="${MAX_R}" value="${c.rb}" aria-label="いちばん 大きい 数" onchange="HADE_COUNT.set('rb', this.value)"><em>の どれか</em></div>
        <div class="hc-opt"><span>見本</span>${RNG.map(([a,b,t])=>`<button type="button" class="${c.ra===a && c.rb===b?'on':''}" onclick="HADE_COUNT.set('rng', '${a}-${b}')">${t}</button>`).join('')}</div>
        <p class="hc-note">押すたびに ${fmtN(c.ra)}〜${fmtN(c.rb)} の どれかを くじ引きで 足します（− も 同じ はんいで へります。まちがえたら ↶ もどす）。いちばん 大きい ${fmtN(c.rb)} が 出ると「大当たり！」。</p></div>` : ''}
      <div class="hc-opt hc-tap"><span>押した 音</span>${FX.TAPS.map(([v,n])=>`<button type="button" class="${c.tap===v?'on':''}" onclick="HADE_COUNT.set('tap', '${v}')">${n}</button>`).join('')}<button type="button" class="${c.tap==='rand'?'on':''}" onclick="HADE_COUNT.set('tap', 'rand')">🔀 おまかせ</button></div>
      <div class="hc-opt hc-tfx"><span>押した ところ</span>${FX.TAP_FX.map(([v,n])=>`<button type="button" class="${c.fx===v?'on':''}" onclick="HADE_COUNT.set('fx', '${v}')">${n}</button>`).join('')}<button type="button" class="${c.fx==='rand'?'on':''}" onclick="HADE_COUNT.set('fx', 'rand')">🔀 おまかせ</button></div>
      <p class="hc-note">音と 押した ところの 演出は カウンターごとに えらべます（並べて 数える とき 音で 聞き分けられます）。えらぶと ためしに 鳴って・出ます。🔀 おまかせ は 押すたびに ちがいます。</p>
      <label class="hc-f"><span>名前</span><input id="hcName" type="text" maxlength="16" value="${esc(c.name)}" onchange="HADE_COUNT.set('name', this.value)"></label>
      <label class="hc-f"><span>目標の数</span><input id="hcGoal" type="number" inputmode="numeric" min="0" max="${MAX_N}" value="${c.goal||''}" placeholder="なし" onchange="HADE_COUNT.set('goal', this.value)"></label>
      <div class="hc-opt"><span>絵文字</span>${EMOS.map(x=>`<button type="button" class="emo${c.emo===x?' on':''}" onclick='HADE_COUNT.set("emo", ${JSON.stringify(x)})'>${x}</button>`).join('')}</div>
      <div class="hc-opt"><span>色</span>${COLS.map(([v,n,h])=>`<button type="button" class="${c.col===v?'on':''}" style="--c:${h}" onclick="HADE_COUNT.set('col', '${v}')"><i class="sw"></i>${n}</button>`).join('')}</div>
      <div class="hc-acts"><button type="button" class="hc-b" onclick="HADE_COUNT.copy()">📋 数を コピー</button>${st.list.length>1 ? `<button type="button" class="hc-b warn" onclick="HADE_COUNT.del(${st.cur})">🗑 このカウンターを 消す</button>` : ''}</div></div>
    <div class="hc-sec"><h4>📊 1時間ごとの 数<small>2週間 残します</small></h4><div id="hcHours">${hoursHtml(c)}</div></div>
    <div class="hc-sec"><h4>🎆 演出</h4>
      <div class="hc-opt"><span>テーマ</span>${FX.THEMES.map(([v,n])=>`<button type="button" class="th th-${v}${st.theme===v?' on':''}" onclick='HADE_COUNT.opt("theme", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>
      <div class="hc-opt"><span>演出の 強さ</span>${FX.LEVELS.map(([v,n])=>`<button type="button" class="lv-${v}${st.level===v?' on':''}" onclick='HADE_COUNT.opt("level", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>${opt('view', VIEWS, '並べ方')}
      ${opt('snd', [[true,'🔊 鳴らす'],[false,'🔇 鳴らさない']], '音')}${opt('vibe', [[true,'ふるえる'],[false,'ふるえない']], '振動')}${opt('flash', [[true,'光る'],[false,'光らない']], '画面の 点滅')}
      <p class="hc-note">画面を 押すたびに ＋。つづけて 早く押すと コンボです。Bluetooth の リモコンや キーボードでも 数えられます（スペース・Enter・↑・→ で ＋、↓・← で −）。「並べて」は カウンターが 2つ以上のとき（押したタイルが ふえます。右下の − で へらす）。<b>ド派手</b>は 押すたびに 大きな輪と 5ごとに 花火、<b>ドド派手</b>は 画面が ゆれて 数字が 七色・コンボで ほめ言葉（とても 激しいので ご注意ください）。</p></div>`;
}
function render(){
  const b=$('hcBody'); if(!b) return;
  b.innerHTML=`<div class="hc-wrap"><div class="hc-tabs" id="hcTabs"></div>
    <div id="hcHome"><div class="hc-stage" id="hcStage"><canvas id="hcCv" aria-label="押すと 数が ふえます"></canvas><div id="hcMinus"></div><div class="hc-ban" id="hcBan" aria-live="polite"></div>
      <div class="hc-fbar"><button type="button" onclick="HADE_COUNT.minus()">− へらす</button><button type="button" onclick="HADE_COUNT.undo()">↶ もどす</button><button type="button" onclick="HADE_COUNT.full(false)">← 戻る</button></div></div></div>
    <div class="hc-ctl"><button type="button" class="hc-b" onclick="HADE_COUNT.minus()">− へらす</button><button type="button" class="hc-b" onclick="HADE_COUNT.undo()">↶ もどす</button><button type="button" class="hc-b" onclick="HADE_COUNT.reset()">0 に</button><button type="button" class="hc-b pri" onclick="HADE_COUNT.full(true)">⛶ 全画面</button></div>
    <div id="hcSide"></div></div>`;
  eng=new FX.Engine($('hcCv')); eng.setTheme(st.theme); eng.setLevel(st.level); eng.noFlash=!st.flash; eng.warp=0.12; eng.heat=0.3;
  eng.onCrackle=()=>snd('crackle'); eng.onBoom=()=>{ if(Math.random()<0.5) snd('boom'); };
  $('hcCv').addEventListener('pointerdown', stageTap);
  paintTabs(); paintSide(); loop();
}
function sel(i){ if(!st.list[i]) return; st.cur=i; combo=0; save(); paintTabs(); paintSide(); }
async function addC(name){
  if(st.list.length>=MAX_C){ toastC('カウンターは '+MAX_C+'つまで です'); return; }
  let n=typeof name==='string' ? name : (typeof appPrompt==='function' ? await appPrompt('＋ 新しい カウンターの 名前（例：男性・女性・赤い車）', 'カウンター'+(st.list.length+1)) : '');
  n=oneLine(n, 16); if(!n) return;
  st.list.push(newC(n, st.list.length)); st.cur=st.list.length-1; save(); paintTabs(); paintSide();
  if(eng){ eng.burst(eng.W/2, eng.H/2, {n:60, sp:500}); snd('level'); }
}
async function delC(i){
  const c=st.list[i]; if(!c || st.list.length<2) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+c.name+'」（'+fmtN(c.n)+'）を 消しますか？', '消す', 'やめる'))) return;
  st.list.splice(i,1); st.cur=Math.min(st.cur, st.list.length-1); undo=undo.filter(u=>u.id!==c.id); save(); paintTabs(); paintSide();
}
function setC(k, v){
  const c=curC();
  if(k==='name'){ const n=oneLine(v,16); if(!n){ paintSide(); return; } c.name=n; }
  else if(k==='goal'){ c.goal=int(String(v||'0').normalize('NFKC').replace(/,/g,''), 0, MAX_N, 0); }
  else if(k==='step'){ if(v==='rnd') c.rnd=true; else if(STEPS.includes(+v)){ c.step=+v; c.rnd=false; } else return; }
  else if(k==='ra' || k==='rb' || k==='rng'){   // 🎲 ランダムの はんい（小さい ほうと 大きい ほうが 逆なら 入れかえる）
    const p=k==='rng' ? String(v).split('-') : null, n=x=>int(String(x==null ? '' : x).normalize('NFKC').replace(/,/g,''), 1, MAX_R, null);
    let a=p ? n(p[0]) : k==='ra' ? n(v) : c.ra, b=p ? n(p[1]) : k==='rb' ? n(v) : c.rb;
    if(a==null || b==null){ paintSide(); return; }
    if(a>b) [a,b]=[b,a];
    c.ra=a; c.rb=b; c.rnd=true;
  }
  else if(k==='tap'){ if(v!=='rand' && !TAPK.includes(v)) return; c.tap=v; }   // 押した 音（v583）
  else if(k==='fx'){ if(v!=='rand' && !FXK.includes(v)) return; c.fx=v; }   // 押した ところの 演出（v583）
  else if(k==='emo'){ const e=emoOk(v); if(!e) return; c.emo=e; }
  else if(k==='col'){ if(!COLS.some(x=>x[0]===v)) return; c.col=v; }
  else return;
  save(); paintTabs(); paintSide();
  if(k==='tap'){ FX.unlock(); tapSnd(c, 0); }   // ためしに 鳴らす（鳴らさない 設定なら 鳴らない）
  if(k==='fx' && eng){ const [x,y]=tileCenter(st.list.indexOf(c)), fk=v==='rand' ? pickOf(FXK) : v; lastFx=fk; eng.tapFx(fk, x, y, {col:colOf(c.col), emo:c.emo, combo:1}); loop(); }   // ためしに 出す
}
function setOpt(k, v){
  if(k==='theme'){ if(!FX.hasTheme(v)) return; st.theme=v; }
  else if(k==='level'){ if(!FX.hasLevel(v)) return; st.level=v; }
  else if(k==='view'){ if(!VIEWS.some(x=>x[0]===v)) return; st.view=v; }
  else if(k==='snd' || k==='vibe' || k==='flash'){ st[k]=v===true || v==='true'; }
  else return;
  save();
  if(eng){ eng.setTheme(st.theme); eng.setLevel(st.level); eng.noFlash=!st.flash; eng.resize(); eng.burst(eng.W/2, eng.H/2, {n:50, sp:420}); if(k==='theme') eng.shell(null, {sc:0.8}); }
  if(k==='snd' && st.snd){ FX.unlock(); snd('coin'); }
  if(k==='vibe' && st.vibe) vib(50);
  paintSide();
}
function copyText(){
  const now=new Date(), today=dayKey(now);
  const lines=st.list.map(c=>{ const hs=Object.keys(c.hist).filter(k=>k.slice(0,10)===today).sort().map(k=>(+k.slice(11))+'時 '+c.hist[k]).join('・'); return c.emo+' '+c.name+'：'+fmtN(c.n)+(c.goal ? '（目標 '+fmtN(c.goal)+'）' : '')+(hs ? '\n　きょう '+hs : ''); });
  const txt=today.replace(/-/g,'/')+' '+pad2(now.getHours())+':'+pad2(now.getMinutes())+' の 数\n'+lines.join('\n');
  try{ navigator.clipboard.writeText(txt).then(()=>toastC('📋 数を コピーしました'), ()=>toastC('コピーできませんでした')); }catch(_){ toastC('コピーできませんでした'); }
  return txt;
}

/* ───────── 窓 ───────── */
const HC_CSS=`
#hadeCountOverlay .hc-modal{ display:flex; flex-direction:column; }
.hc-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.hc-wrap{ max-width:760px; margin:0 auto; }
.hc-tabs{ display:flex; gap:6px; overflow-x:auto; padding:2px 0 8px; scrollbar-width:thin; }
.hc-tab{ flex:0 0 auto; display:flex; flex-direction:column; align-items:flex-start; gap:1px; min-height:48px; padding:4px 12px; border-radius:14px; border:2px solid var(--c,#7b2bff); background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; font:inherit; }
.hc-tab span{ font-size:12.5px; font-weight:bold; white-space:nowrap; } .hc-tab b{ font-size:18px; font-variant-numeric:tabular-nums; }
.hc-tab.on{ background:#1a1030; color:#fff; box-shadow:0 0 0 3px rgba(123,43,255,.25); }
.hc-tab.add{ justify-content:center; border-style:dashed; border-color:rgba(120,132,156,.6); font-weight:bold; }
.hc-stage{ position:relative; height:min(56vh,520px); min-height:260px; border-radius:20px; overflow:hidden; background:#05061a; touch-action:manipulation; user-select:none; -webkit-user-select:none; box-shadow:0 8px 26px rgba(40,0,80,.4); }
.hc-stage canvas{ position:absolute; inset:0; width:100%; height:100%; display:block; cursor:pointer; }
.hc-stage.full{ position:fixed; inset:0; height:auto; min-height:0; border-radius:0; z-index:99990; box-shadow:none; }
.hc-fbar{ display:none; }
.hc-stage.full .hc-fbar{ position:absolute; left:0; right:0; bottom:0; display:flex; gap:8px; justify-content:center; padding:8px 10px calc(10px + var(--safe-bottom,0px)); background:linear-gradient(0deg, rgba(0,0,0,.5), rgba(0,0,0,0)); }
.hc-fbar button{ flex:1 1 auto; max-width:200px; min-height:50px; border-radius:14px; border:1.5px solid rgba(255,255,255,.75); background:rgba(0,0,0,.35); color:#fff; font-size:16px; font-weight:bold; cursor:pointer; }
.hc-tmin{ position:absolute; width:42px; height:42px; border-radius:21px; border:1.5px solid rgba(255,255,255,.8); background:rgba(0,0,0,.45); color:#fff; font-size:24px; font-weight:bold; line-height:1; cursor:pointer; }
.hc-ban{ position:absolute; left:3%; right:3%; top:30%; white-space:nowrap; text-align:center; font-weight:900; font-size:clamp(28px,9vw,76px); line-height:1.1; pointer-events:none; opacity:0;
  background:linear-gradient(90deg,#fff36b,#ff8a3d,#ff2bd6,#7cf0ff,#fff36b); background-size:300% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:#fff;
  filter:drop-shadow(0 0 10px rgba(255,255,255,.55)) drop-shadow(0 4px 2px rgba(0,0,0,.6)); }
.hc-ban.go{ animation:hcBan 1.7s cubic-bezier(.2,.9,.3,1.2) forwards, hcRain 1.1s linear infinite; }
.hc-ban.big.go{ top:26%; animation:hcBig 3.8s cubic-bezier(.2,.9,.3,1.2) forwards, hcRain .9s linear infinite; }
@keyframes hcBan{ 0%{ opacity:0; transform:scale(.2) rotate(-6deg); } 14%{ opacity:1; transform:scale(1.25) rotate(3deg); } 24%{ transform:scale(1) rotate(0); } 80%{ opacity:1; } 100%{ opacity:0; transform:translateY(-22px); } }
@keyframes hcBig{ 0%{ opacity:0; transform:scale(.1) rotate(-12deg); } 10%{ opacity:1; transform:scale(1.35) rotate(5deg); } 18%{ transform:scale(.92); } 28%{ transform:scale(1.06); } 36%{ transform:scale(1); } 90%{ opacity:1; } 100%{ opacity:0; transform:translateY(-28px); } }
@keyframes hcRain{ 0%{ background-position:0% 50%; } 100%{ background-position:300% 50%; } }
.hc-ctl{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin:10px 0; }
.hc-b{ min-height:48px; padding:0 10px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.hc-b.pri{ background:linear-gradient(135deg,#7b2bff,#ff2bd6); border-color:transparent; color:#fff; }
.hc-b.warn{ color:#c62828; border-color:rgba(198,40,40,.5); }
.hc-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.hc-sec h4{ margin:0 0 8px; font-size:15px; } .hc-sec h4 small{ font-weight:normal; font-size:12px; color:var(--text-light,#666); margin-left:8px; }
.hc-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:6px 0; } .hc-opt span{ min-width:5.4em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.hc-opt button{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
.hc-opt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.hc-opt button.emo{ min-width:42px; padding:0 6px; font-size:20px; justify-content:center; }
.hc-opt .sw{ width:14px; height:14px; border-radius:7px; background:var(--c); box-shadow:0 0 0 1px rgba(0,0,0,.35); }
.hc-opt button.th:not(.on){ color:#fff; border-color:transparent; text-shadow:0 1px 2px rgba(0,0,0,.6); }
.hc-opt button.th-hanabi:not(.on){ background:linear-gradient(135deg,#03061a,#2b1b4c); } .hc-opt button.th-uchu:not(.on){ background:linear-gradient(135deg,#02030c,#2a1a6e); }
.hc-opt button.th-neon:not(.on){ background:linear-gradient(135deg,#24004a,#ff2bd6); } .hc-opt button.th-matsuri:not(.on){ background:linear-gradient(135deg,#2a0b25,#a3121b); }
.hc-opt button.lv-ultra:not(.on){ background:linear-gradient(135deg,#fff3c4,#ffb000); border-color:#e08a00; color:#5a2a00; font-weight:bold; }
.hc-opt button.lv-mega:not(.on){ background:linear-gradient(90deg,#ff3b6b,#ffb000,#3ee8ff,#c77dff,#ff3b6b); background-size:300% 100%; animation:hcRain 2.4s linear infinite; border-color:transparent; color:#fff; font-weight:900; text-shadow:0 1px 2px rgba(0,0,0,.7); }
.hc-opt button.th-honoo:not(.on){ background:linear-gradient(135deg,#1a0300,#ff4500); } .hc-opt button.th-yume:not(.on){ background:linear-gradient(135deg,#b04f8a,#6a54c8); }
.hc-f{ display:flex; align-items:center; gap:8px; margin:6px 0; } .hc-f span{ min-width:5.4em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.hc-f input{ flex:1; min-width:0; min-height:40px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; }
.hc-acts{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.hc-rng{ margin:4px 0 8px; padding:8px 10px; border-radius:12px; background:rgba(255,200,0,.1); border:1px dashed rgba(224,138,0,.55); }
.hc-rng .hc-f input{ flex:0 1 6.5em; text-align:center; font-weight:bold; } .hc-rng .hc-f b{ font-size:16px; } .hc-rng .hc-f em{ font-style:normal; font-size:12.5px; color:var(--text-light,#666); }
.hc-rng .hc-note{ margin-top:4px; }
.hc-tap button, .hc-tfx button{ padding:0 10px; }
.hc-tot{ display:flex; gap:16px; font-size:14px; margin-bottom:6px; } .hc-tot b{ font-size:20px; font-variant-numeric:tabular-nums; }
.hc-hours .r{ display:flex; align-items:center; gap:8px; font-size:13.5px; margin:3px 0; } .hc-hours .h{ width:3.2em; text-align:right; color:var(--text-light,#666); }
.hc-hours .bar{ flex:1; height:14px; border-radius:7px; background:rgba(120,132,156,.15); overflow:hidden; } .hc-hours .bar i{ display:block; height:100%; border-radius:7px; }
.hc-hours b{ min-width:3em; text-align:right; font-variant-numeric:tabular-nums; }
.hc-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; }
`;
function ensureDom(){
  if($('hadeCountOverlay')) return;
  const stl=document.createElement('style'); stl.id='hcStyle'; stl.textContent=HC_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="hadeCountOverlay">
  <div class="modal vol-modal hc-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🎉 ど派手カウンター</span><button class="modal-close" onclick="closeHadeCount()" aria-label="閉じる">✕</button></div>
    <div class="hc-body" id="hcBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  $('hadeCountOverlay').addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('keydown', onKey, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ setFull(false); save(); unwake(); const s=$('hcStage'); if(s) s.remove(); eng=null; undo=[]; combo=0; }
function openHadeCount(){
  ensureDom(); load(); undo=[]; combo=0;
  openDlg('hadeCountOverlay', cleanup);
  render();
}
function closeHadeCount(){ if(!$('hadeCountOverlay') || !isDlgOpen('hadeCountOverlay')) return; closeDlg('hadeCountOverlay', cleanup); }

window.HADE_COUNT={ tap:(i,x,y)=>{ plus(i==null ? st.cur : i, null, x, y); paintTabs(); }, plus:(i,k)=>{ plus(i==null ? st.cur : i, k); paintTabs(); }, minus:(i,k)=>{ minus(i, k); paintTabs(); },
  undo:()=>{ undoLast(); paintTabs(); }, reset:i=>{ reset(i).then(()=>paintTabs()); }, add:n=>{ addC(n); }, del:i=>{ delC(i); }, sel, set:setC, opt:setOpt, full:setFull, isFull, copy:copyText,
  state:()=>{ save(); return JSON.parse(JSON.stringify(st)); }, combo:()=>combo, fx:()=>({n:eng ? eng.count() : 0, played:FX.played(), cap:eng ? eng.cap : 0, level:eng ? eng.level : '', shake:eng ? +eng.shake.toFixed(2) : 0}), tiles:()=>tiles.map(T=>T.i+':'+Math.round(T.w)+'x'+Math.round(T.h)),
  banner:()=>{ const b=$('hcBan'); return b ? b.textContent : ''; }, freeze:b=>{ frozen=!!b; }, draw:()=>{ if(eng){ eng.resize(); paint(); } }, lastRoll:()=>lastRoll, lastSnd:()=>lastSnd, lastFx:()=>lastFx };
Object.assign(window, { openHadeCount, closeHadeCount });
})();
