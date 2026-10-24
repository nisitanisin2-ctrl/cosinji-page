/* 📢 電光掲示板（v569。表電卓の道具。はじめて開いたときに読む。apps/keijiban/ から単独のアプリとしても開ける）
   ・打った文字を 大きく流す。見た目は LED風（点で光る文字）／ふつうの文字。
     色（赤・緑・黄・白・青・虹）・動き（← 流す・止める・点滅）・速さ・点の細かさ（16・24・32 点）。
   ・「▶ 全画面で 出す」：画面いっぱいに出す。縦に持っているときは 90° 回して 横長に出す（「回さない」も）。
     画面を消さない（対応している端末）・Android は 全画面＋横向きに。画面を押すと「⏸ 止める」「✕ 終わる」。端末の「戻る」でも 終わる。
   ・⭐ よく使う文（受付・準備中・バック オーライ など）を 残して 1回で出す。
   ・文と見た目は excalc_keijiban（この端末の中だけ）。
   LED風は 文字を 高さ 16〜32 点の 小さな絵にして（canvas）、明るい点を 丸い光で描く。点は 1列ずつ 動く（本物の掲示板と同じ）。 */
(function(){
'use strict';
const KEY='excalc_keijiban', MAX_TXT=200, MAX_LIST=30;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=(v,n)=>String(v==null?'':v).replace(/[\r\n\t]+/g,'　').replace(/[\u0000-\u001F\u007F]/g,'').slice(0,n);
const toastK=m=>{ if(typeof toast==='function') toast(m, 3000); };
const DEF_LIST=['受付は こちらです','少々 お待ちください','ただいま 準備中です','営業中','本日は ありがとうございました','休憩中','足もとに ご注意ください','バック オーライ','ストップ！','入口は こちら →','← 出口','がんばれ！'];
const LOOKS=[['led','LED風（点）'],['plain','ふつうの文字']];
const COLS=[['red','赤','#ff3b30'],['green','緑','#2bff6e'],['yellow','黄','#ffd60a'],['white','白','#f4f4f4'],['blue','青','#3aa0ff'],['rainbow','虹','']];
const MOVES=[['scroll','← 流す'],['still','止める'],['blink','点滅']];
const SPEEDS=[['slow','ゆっくり',1.2],['mid','ふつう',2.2],['fast','はやい',3.6]];   // 1秒に 流れる 字の数（字の高さ ぶん）
const ROWS=[16,24,32];
const ROTS=[['auto','縦に持っていたら 回す'],['off','回さない']];
const FONT='"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif';

/* ───────── 状態 ───────── */
let st=null, raf=0, t0=0, paused=false, pauseAt=0, fullRel=null, wl=null, barT=0, prevKey='';
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  st={text:typeof o.text==='string' ? clean(o.text, MAX_TXT) : '受付は こちらです',
    look:LOOKS.some(x=>x[0]===o.look)?o.look:'led', color:COLS.some(x=>x[0]===o.color)?o.color:'red',
    move:MOVES.some(x=>x[0]===o.move)?o.move:'scroll', speed:SPEEDS.some(x=>x[0]===o.speed)?o.speed:'mid',
    rows:ROWS.includes(o.rows)?o.rows:24, rot:ROTS.some(x=>x[0]===o.rot)?o.rot:'auto',
    list:Array.isArray(o.list) ? o.list.map(x=>clean(x, MAX_TXT).trim()).filter(Boolean).slice(0,MAX_LIST) : DEF_LIST.slice()};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }

/* ───────── 文字の点の表（LED風）───────── */
let bm=null, bmKey='';
function bitmap(){
  const k=st.rows+'|'+st.text;
  if(bm && bmKey===k) return bm;
  const R=st.rows, txt=st.text.trim() ? st.text : ' ', c=document.createElement('canvas'), g=c.getContext('2d');
  const font='bold '+Math.round(R*0.9)+'px '+FONT;
  g.font=font; const w=Math.max(1, Math.ceil(g.measureText(txt).width)+1);
  c.width=w; c.height=R;
  g.font=font; g.textBaseline='middle'; g.fillStyle='#fff'; g.fillText(txt, 0, R/2+R*0.03);
  const d=g.getImageData(0,0,w,R).data, lit=new Uint8Array(w*R);
  let n=0; for(let i=0;i<w*R;i++){ if(d[i*4+3]>110){ lit[i]=1; n++; } }
  bm={w, h:R, lit, n}; bmKey=k; return bm;
}
// 光る点の絵（色ごと・点の大きさごとに 1つ作って 使いまわす）
const sprites=new Map();
function sprite(color, pitch){
  const k=color+'|'+pitch; if(sprites.has(k)) return sprites.get(k);
  const s=Math.max(2, Math.round(pitch)), c=document.createElement('canvas'); c.width=c.height=s;
  const g=c.getContext('2d'), r=s*0.43, gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,r);
  gr.addColorStop(0,'#fff'); gr.addColorStop(0.35,color); gr.addColorStop(1,color);
  g.fillStyle=gr; g.beginPath(); g.arc(s/2,s/2,r,0,Math.PI*2); g.fill();
  if(sprites.size>80) sprites.clear();
  sprites.set(k,c); return c;
}
const hue=(i)=>'hsl('+((i%24)*15)+',100%,58%)';
const baseColor=()=>(COLS.find(x=>x[0]===st.color)||COLS[0])[2] || '#f4f4f4';
// 暗い点（消えている点）を ならべた 下地（大きさが かわったときだけ 作る）
const grids=new Map();
function grid(W, H, pitch, C, R){
  const k=[W,H,R,st.color].join('|'); if(grids.has(k)) return grids.get(k);
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  g.fillStyle='#050505'; g.fillRect(0,0,W,H);
  g.fillStyle=st.color==='rainbow' ? 'rgba(255,255,255,.07)' : baseColor(); g.globalAlpha=st.color==='rainbow' ? 1 : 0.11;
  const r=pitch*0.38, oy=(H-pitch*R)/2;
  for(let y=0;y<R;y++) for(let x=0;x<C;x++){ g.beginPath(); g.arc(x*pitch+pitch/2, oy+y*pitch+pitch/2, r, 0, Math.PI*2); g.fill(); }
  if(grids.size>6) grids.clear();
  grids.set(k,c); return c;
}

/* ───────── 位置（t 秒のとき）───────── */
const charsPerSec=()=>(SPEEDS.find(x=>x[0]===st.speed)||SPEEDS[1])[2];
// LED風：画面の列 C に対して 文字の左はしが 何列目か（x0）と、点いているか（on）
function ledPos(t, C){
  const b=bitmap(), fits=b.w<=C;
  let x0;
  if(st.move==='scroll' || !fits){ const sp=charsPerSec()*st.rows, L=b.w+C; x0=C-Math.floor((t*sp)%L); }
  else x0=Math.floor((C-b.w)/2);
  const on=st.move!=='blink' || Math.floor(t*2)%2===0;
  return {x0, on, w:b.w, fits};
}
function draw(cv, t){
  const W=cv.width, H=cv.height; if(!W || !H) return 0;
  const g=cv.getContext('2d');
  if(st.look==='led'){
    const R=st.rows, pitch=H/R, C=Math.ceil(W/pitch), p=ledPos(t, C), b=bitmap();
    const key=[W,H,R,st.color,st.text,p.x0,p.on,st.color==='rainbow'?Math.floor(t*8):0].join('|');
    if(key===prevKey && cv.__drawn) return cv.__lit||0;
    prevKey=key; cv.__drawn=true;
    g.drawImage(grid(W,H,pitch,C,R), 0, 0);
    let n=0;
    if(p.on){
      const oy=(H-pitch*R)/2, one=st.color==='rainbow' ? null : sprite(baseColor(), pitch), shift=Math.floor(t*8);
      for(let x=0;x<C;x++){
        const sx=x-p.x0; if(sx<0 || sx>=b.w) continue;
        const spr=one || sprite(hue(Math.floor(sx/Math.max(2,R/3))+shift), pitch);
        for(let y=0;y<R;y++){ if(b.lit[y*b.w+sx]){ g.drawImage(spr, x*pitch, oy+y*pitch, pitch, pitch); n++; } }
      }
    }
    cv.__lit=n; return n;
  }
  // ふつうの文字
  prevKey=''; cv.__drawn=false;
  g.fillStyle='#050505'; g.fillRect(0,0,W,H);
  const txt=st.text.trim() ? st.text : '', fs=Math.round(H*0.74);
  g.font='bold '+fs+'px '+FONT; g.textBaseline='middle';
  const tw=g.measureText(txt).width, fits=tw<=W*0.96;
  let x;
  if(st.move==='scroll' || !fits){ const sp=charsPerSec()*fs, L=tw+W; x=W-((t*sp)%L); }
  else x=(W-tw)/2;
  const on=st.move!=='blink' || Math.floor(t*2)%2===0;
  if(!on || !txt) return 0;
  if(st.color==='rainbow'){ const gr=g.createLinearGradient(x,0,x+tw,0); for(let i=0;i<=6;i++) gr.addColorStop(i/6, 'hsl('+((i*60+t*90)%360)+',100%,60%)'); g.fillStyle=gr; }
  else g.fillStyle=baseColor();
  g.shadowColor=g.fillStyle===baseColor() ? baseColor() : '#fff'; g.shadowBlur=Math.round(fs*0.12);
  g.fillText(txt, x, H/2+fs*0.03); g.shadowBlur=0;
  return 1;
}

/* ───────── うごかす ───────── */
const now=()=>performance.now()/1000;
const curT=()=>paused ? pauseAt : now()-t0;
function sizeCanvas(cv){
  const r=cv.getBoundingClientRect(), dpr=Math.min(2, window.devicePixelRatio||1);
  const w=Math.max(1, Math.round((cv.__w||r.width)*dpr)), h=Math.max(1, Math.round((cv.__h||r.height)*dpr));
  if(cv.width!==w || cv.height!==h){ cv.width=w; cv.height=h; cv.__drawn=false; }
}
function loop(){
  cancelAnimationFrame(raf);
  const step=()=>{
    raf=0;
    const full=$('kjFullCv'), cv=full || $('kjPrev');
    if(!cv || (!full && !isDlgOpen('keijibanOverlay')) || document.hidden){ return; }
    sizeCanvas(cv); draw(cv, curT());
    raf=requestAnimationFrame(step);
  };
  raf=requestAnimationFrame(step);
}
function restart(){ t0=now(); paused=false; prevKey=''; loop(); }

/* ───────── 全画面 ───────── */
async function startFull(){
  if(!st.text.trim()){ toastK('流す文字を 入れてください'); const ta=$('kjText'); if(ta) ta.focus(); return; }
  if($('kjFull')) return;
  const el=document.createElement('div'); el.id='kjFull'; el.className='kj-full'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','電光掲示板');
  // ボタンも 文字といっしょに回す（縦に持って 横向きに出すとき）
  el.innerHTML=`<div class="kj-stage" id="kjStage"><canvas id="kjFullCv"></canvas>
    <div class="kj-fbar" id="kjFBar"><button type="button" id="kjPauseB" onclick="KEIJIBAN.pause()">⏸ 止める</button><button type="button" onclick="KEIJIBAN.stopFull()">✕ 終わる</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e=>{ if(!e.target.closest('.kj-fbar')) showBar(); });
  fullRel=typeof modalBack==='function' ? modalBack(()=>stopFull(true)) : null;
  window.addEventListener('keydown', fullKey, true);
  window.addEventListener('resize', layoutFull);
  try{ if(document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen({navigationUI:'hide'}); }catch(_){}
  try{ if(screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); }catch(_){}
  await wake();
  layoutFull(); showBar(); restart();
}
function fullKey(e){
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); stopFull(); }
  else if(e.key===' '){ e.preventDefault(); e.stopPropagation(); togglePause(); }
}
function layoutFull(){
  const sg=$('kjStage'), cv=$('kjFullCv'); if(!sg || !cv) return;
  const vw=window.innerWidth, vh=window.innerHeight, rot=st.rot==='auto' && vh>vw;
  const w=rot?vh:vw, h=rot?vw:vh;
  sg.style.width=w+'px'; sg.style.height=h+'px'; sg.classList.toggle('rot', rot);
  cv.__w=w; cv.__h=h; cv.style.width=w+'px'; cv.style.height=h+'px'; cv.__drawn=false;
}
function showBar(){ const b=$('kjFBar'); if(!b) return; b.classList.add('show'); clearTimeout(barT); barT=setTimeout(()=>{ if(!paused) b.classList.remove('show'); }, 3000); }
function togglePause(){
  if(paused){ t0=now()-pauseAt; paused=false; } else { pauseAt=now()-t0; paused=true; }
  const b=$('kjPauseB'); if(b) b.textContent=paused?'▶ 動かす':'⏸ 止める';
  showBar(); prevKey='';
}
async function wake(){ try{ if(navigator.wakeLock && navigator.wakeLock.request) wl=await navigator.wakeLock.request('screen'); }catch(_){ wl=null; } }
function stopFull(byBack){
  const el=$('kjFull'); if(!el) return;
  el.remove(); window.removeEventListener('keydown', fullKey, true); window.removeEventListener('resize', layoutFull); clearTimeout(barT);
  if(fullRel && !byBack) fullRel(); fullRel=null;
  if(wl){ try{ wl.release(); }catch(_){} wl=null; }
  try{ if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); }catch(_){}
  try{ if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{}); }catch(_){}
  paused=false; prevKey=''; restart();
}
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible'){ if($('kjFull')) wake(); if($('kjFull') || ($('keijibanOverlay') && isDlgOpen('keijibanOverlay'))) loop(); } });

/* ───────── 文・よく使う文 ───────── */
function setText(v){ st.text=clean(v, MAX_TXT); save(); prevKey=''; paintInfo(); }
function pick(i){ const t=st.list[i]; if(t==null) return; st.text=t; save(); const ta=$('kjText'); if(ta) ta.value=t; prevKey=''; paintInfo(); restart(); }
function go(i){ pick(i); startFull(); }
function keep(){
  const t=st.text.trim(); if(!t){ toastK('残す文字を 入れてください'); return; }
  if(st.list.includes(t)){ toastK('もう あります'); return; }
  if(st.list.length>=MAX_LIST){ toastK('残せるのは '+MAX_LIST+'まで です'); return; }
  st.list.unshift(t); save(); paintList(); toastK('⭐ よく使う文に 残しました');
}
async function del(i){
  const t=st.list[i]; if(t==null) return;
  if(typeof appConfirm==='function' && !await appConfirm('「'+t+'」を 消しますか？', '消す', 'やめる')) return;
  st.list.splice(i,1); save(); paintList();
}
async function resetList(){
  if(typeof appConfirm==='function' && !await appConfirm('よく使う文を はじめの '+DEF_LIST.length+'個に 戻しますか？（残した文は 消えます）', '戻す', 'やめる')) return;
  st.list=DEF_LIST.slice(); save(); paintList();
}
function clearText(){ setText(''); const ta=$('kjText'); if(ta){ ta.value=''; ta.focus(); } }

/* ───────── 画面 ───────── */
function setOpt(k, v){
  const ok={look:LOOKS.some(x=>x[0]===v), color:COLS.some(x=>x[0]===v), move:MOVES.some(x=>x[0]===v), speed:SPEEDS.some(x=>x[0]===v), rows:ROWS.includes(v), rot:ROTS.some(x=>x[0]===v)}[k];
  if(!ok) return; st[k]=v; save(); grids.clear(); prevKey=''; render(); restart();
}
function paintInfo(){
  const b=$('kjInfo'); if(!b) return;
  if(!st.text.trim()){ b.textContent='流す文字を 入れてください'; return; }
  if(st.look!=='led'){ b.textContent=''; return; }
  const bmp=bitmap(), chars=Math.max(1, Math.round(bmp.w/st.rows));
  b.textContent=`${st.rows}点の文字で 約${chars}字ぶん`+(st.move!=='scroll' ? '（長い文は 流します）' : '');
}
function paintList(){
  const b=$('kjList'); if(!b) return;
  b.innerHTML=st.list.length ? st.list.map((t,i)=>`<div class="kj-li"><button type="button" class="t" onclick="KEIJIBAN.pick(${i})">${esc(t)}</button><button type="button" class="go" onclick="KEIJIBAN.go(${i})" aria-label="全画面で出す">▶</button><button type="button" class="del" onclick="KEIJIBAN.del(${i})" aria-label="消す">🗑</button></div>`).join('')
    : '<p class="kj-note">「⭐ 残す」で 文を 残せます。</p>';
}
function render(){
  const b=$('kjBody'); if(!b) return;
  const opt=(k, arr, lab)=>`<div class="kj-opt"><span>${lab}</span>${arr.map(a=>{ const v=Array.isArray(a)?a[0]:a, n=Array.isArray(a)?a[1]:a+'点'; return `<button type="button" class="${st[k]===v?'on':''}${k==='color'?' c-'+v:''}" onclick='KEIJIBAN.opt("${k}", ${JSON.stringify(v)})'>${n}</button>`; }).join('')}</div>`;
  b.innerHTML=`<div class="kj-wrap">
    <canvas id="kjPrev" class="kj-prev" onclick="KEIJIBAN.start()" aria-label="見本（押すと 全画面）"></canvas>
    <div class="kj-info" id="kjInfo"></div>
    <textarea id="kjText" class="kj-in" rows="2" maxlength="${MAX_TXT}" placeholder="流す文字（例：受付は こちらです）" oninput="KEIJIBAN.text(this.value)"></textarea>
    <button type="button" class="kj-go" onclick="KEIJIBAN.start()">▶ 全画面で 出す</button>
    <div class="kj-acts"><button type="button" class="kj-b" onclick="KEIJIBAN.keep()">⭐ 残す</button><button type="button" class="kj-b" onclick="KEIJIBAN.clear()">🧹 文字を消す</button></div>
    <div class="kj-sec"><h4>⭐ よく使う文<small>押すと 文字が かわる・▶ で すぐ全画面</small></h4><div id="kjList"></div>
      <div class="kj-acts sm"><button type="button" class="kj-b" onclick="KEIJIBAN.resetList()">はじめの文に 戻す</button></div></div>
    <div class="kj-sec"><h4>⚙ 見た目</h4>
      ${opt('look', LOOKS, '見た目')}${opt('color', COLS, '色')}${opt('move', MOVES, '動き')}${opt('speed', SPEEDS, '速さ')}
      ${st.look==='led' ? opt('rows', ROWS, '点の細かさ') : ''}${opt('rot', ROTS, '縦に持つと')}
      <p class="kj-note">全画面のあいだは 画面を消さないようにします（対応している端末）。画面を押すと「⏸ 止める」「✕ 終わる」が出ます。Android は 横向きの全画面に、iPhone は 縦に持っていても 90° 回して 横長に出します。</p></div>
  </div>`;
  $('kjText').value=st.text;
  $('kjText').addEventListener('keydown', e=>{ if(e.key!=='Escape') e.stopPropagation(); });
  paintInfo(); paintList();
}
const KJ_CSS=`
#keijibanOverlay .kj-modal{ display:flex; flex-direction:column; }
.kj-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.kj-wrap{ max-width:820px; margin:0 auto; }
.kj-prev{ display:block; width:100%; height:min(28vw,170px); border-radius:12px; background:#050505; cursor:pointer; box-shadow:0 0 0 3px #222 inset; }
.kj-info{ font-size:12px; color:var(--text-light,#666); text-align:right; min-height:18px; margin:3px 2px 6px; }
.kj-in{ display:block; width:100%; box-sizing:border-box; padding:10px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font:inherit; font-size:19px; line-height:1.4; resize:vertical; }
.kj-go{ display:block; width:100%; min-height:60px; margin:8px 0 0; border-radius:14px; border:0; background:var(--acc); color:var(--on-acc,#fff); font-size:20px; font-weight:bold; cursor:pointer; }
.kj-acts{ display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 10px; } .kj-acts .kj-b{ flex:1 1 auto; white-space:nowrap; } .kj-acts.sm{ margin:8px 0 0; } .kj-acts.sm .kj-b{ flex:0 1 auto; min-height:36px; font-size:13px; }
.kj-b{ min-height:44px; padding:0 12px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.kj-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.kj-sec h4{ margin:0 0 8px; font-size:15px; } .kj-sec h4 small{ font-weight:normal; font-size:12px; color:var(--text-light,#666); margin-left:8px; }
.kj-li{ display:flex; gap:5px; align-items:stretch; margin:0 0 5px; }
.kj-li .t{ flex:1; min-width:0; min-height:44px; padding:6px 10px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#222); font-size:15.5px; text-align:left; cursor:pointer; overflow-wrap:anywhere; }
.kj-li .go, .kj-li .del{ flex:none; width:46px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#222); font-size:16px; cursor:pointer; }
.kj-li .go{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:6px 0; } .kj-opt span{ min-width:5.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.kj-opt button{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.kj-opt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.kj-opt button.c-red:not(.on){ color:#d32f2f; } .kj-opt button.c-green:not(.on){ color:#2e7d32; } .kj-opt button.c-yellow:not(.on){ color:#8d6e00; } .kj-opt button.c-blue:not(.on){ color:#1565c0; }
body.dark .kj-opt button.c-red:not(.on){ color:#ff8a80; } body.dark .kj-opt button.c-green:not(.on){ color:#69f0ae; } body.dark .kj-opt button.c-yellow:not(.on){ color:#ffd740; } body.dark .kj-opt button.c-blue:not(.on){ color:#82b1ff; }
.kj-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; }
.kj-full{ position:fixed; inset:0; z-index:99990; background:#000; overflow:hidden; touch-action:none; }
.kj-stage{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); }
.kj-stage.rot{ transform:translate(-50%,-50%) rotate(90deg); }
.kj-stage canvas{ display:block; }
.kj-fbar{ position:absolute; left:50%; bottom:14px; transform:translateX(-50%); display:flex; gap:10px; opacity:0; pointer-events:none; transition:opacity .25s; }
.kj-fbar.show{ opacity:1; pointer-events:auto; }
.kj-fbar button{ min-height:52px; min-width:130px; border-radius:26px; border:2px solid #fff; background:rgba(0,0,0,.65); color:#fff; font-size:18px; font-weight:bold; cursor:pointer; }
`;
function ensureDom(){
  if($('keijibanOverlay')) return;
  const stl=document.createElement('style'); stl.id='kjStyle'; stl.textContent=KJ_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="keijibanOverlay">
  <div class="modal vol-modal kj-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📢 電光掲示板</span><button class="modal-close" onclick="closeKeijiban()" aria-label="閉じる">✕</button></div>
    <div class="kj-body" id="kjBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  $('keijibanOverlay').addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ stopFull(); cancelAnimationFrame(raf); raf=0; }
function openKeijiban(){
  ensureDom(); load(); bm=null; bmKey=''; grids.clear();
  openDlg('keijibanOverlay', cleanup);
  render(); restart();
}
function closeKeijiban(){ if(!$('keijibanOverlay')||!isDlgOpen('keijibanOverlay')) return; closeDlg('keijibanOverlay', cleanup); }

window.KEIJIBAN={ text:setText, start:()=>{ startFull(); }, stopFull:()=>stopFull(), pause:togglePause, keep, del:i=>{ del(i); }, resetList:()=>{ resetList(); }, pick, go, clear:clearText, opt:setOpt,
  state:()=>JSON.parse(JSON.stringify(st)), bitmap:()=>{ const b=bitmap(); return {w:b.w, h:b.h, n:b.n}; },
  pos:(t, C)=>ledPos(t, C), draw:t=>{ const cv=$('kjFullCv')||$('kjPrev'); if(!cv) return -1; sizeCanvas(cv); prevKey=''; return draw(cv, t); },
  isFull:()=>!!$('kjFull'), paused:()=>paused, rotated:()=>{ const s=$('kjStage'); return !!(s && s.classList.contains('rot')); } };
Object.assign(window, { openKeijiban, closeKeijiban });
})();
