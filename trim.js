/* ✂ 写真トリミング（v486。表電卓の道具。はじめて開いたときに読む）
   写真を撮る／選ぶ → 四角の枠を動かして切り抜く → 大きさ（ピクセル・%・ファイルの大きさ）と形式を決めて保存・送る。
   ・枠は角・辺をつまんで大きさ、中をつまんで場所。形（自由・元の形・1:1・4:3・3:4・16:9・9:16・名刺・A4・証明写真）を選べる。
   ・左右に90°回す・左右反転・範囲をはじめに戻す。
   ・出す大きさ：そのまま／長い辺 2048〜640px／50%・25%／横×縦を手で（縦横比を保つ）。
     形式 JPEG・PNG・WebP、画質。「〜KB 以下に」を選ぶと画質（足りなければ大きさ）を下げてそこに収める。
   ・写真は端末の中で処理するだけで、どこにも送らず、残しもしない（決めた設定だけ excalc_trim に覚える）。 */
(function(){
const TR_KEY='excalc_trim';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAX_SRC_PX=16000000;   // 端末（とくに iPhone）の絵の大きさの上限に収める
const MAX_OUT=8000, MIN_CROP=16;
const ASPECTS=[ ['free','自由',0], ['orig','元の形',-1], ['1:1','1:1',1], ['4:3','4:3',4/3], ['3:4','3:4',3/4], ['16:9','16:9',16/9], ['9:16','9:16',9/16],
  ['card','名刺',91/55], ['a4','A4縦',210/297], ['id','証明写真',30/40] ];
const SIZES=[ ['keep','そのまま'], ['l2048','長い辺 2048'], ['l1600','1600'], ['l1200','1200'], ['l800','800'], ['l640','640'], ['p50','50%'], ['p25','25%'] ];
const KBS=[ [0,'決めない'], [1000,'1MB 以下'], [500,'500KB 以下'], [200,'200KB 以下'], [100,'100KB 以下'] ];
let st={ aspect:'free', fmt:'jpeg', q:85, size:'keep', lock:true, kb:0 };
let src=null;        // いまの写真（回転・反転をしたもの）canvas
let srcName='写真';
let crop=null;       // {x,y,w,h}（src の画素）
let disp={k:1, ox:0, oy:0};
let outW=0, outH=0;  // 出す大きさ
let estT=null, estSeq=0;

function trLoadSt(){ try{ const o=JSON.parse(localStorage.getItem(TR_KEY)||'null'); if(o){
  if(ASPECTS.some(a=>a[0]===o.aspect)) st.aspect=o.aspect; if(['jpeg','png','webp'].includes(o.fmt)) st.fmt=o.fmt;
  if(o.q>=30 && o.q<=100) st.q=Math.round(o.q); if(SIZES.some(s=>s[0]===o.size) || o.size==='custom') st.size=o.size;
  st.lock=o.lock!==false; if(KBS.some(k=>k[0]===o.kb)) st.kb=o.kb; } }catch(_){} }
function trSaveSt(){ try{ localStorage.setItem(TR_KEY, JSON.stringify(st)); }catch(_){} }
const webpOk=(()=>{ try{ const c=document.createElement('canvas'); c.width=c.height=1; return c.toDataURL('image/webp').startsWith('data:image/webp'); }catch(_){ return false; } })();
const fmtKB=n=>n>=1024*1024 ? (n/1024/1024).toFixed(n>=10*1024*1024?0:1)+'MB' : Math.max(1,Math.round(n/1024))+'KB';

/* ── 画面 ── */
const TR_CSS=`
#trimOverlay .tr-modal{ display:flex; flex-direction:column; }
.tr-empty{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:20px; text-align:center; color:var(--text-light,#888); line-height:1.8; font-size:14px; }
.tr-empty b{ color:var(--text,#333); }
.tr-big{ width:min(320px,90%); height:56px; border:none; border-radius:12px; background:var(--acc); color:#fff; font-size:17px; font-weight:bold; cursor:pointer; }
.tr-big.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.tr-bar{ display:flex; gap:6px; align-items:center; padding:8px 10px; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid rgba(120,132,156,.25); }
.tr-bar::-webkit-scrollbar{ display:none; }
.tr-chip{ flex:none; height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13.5px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.tr-chip.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.tr-stage{ flex:1; min-height:0; position:relative; overflow:hidden; background:#1b1b1b; touch-action:none; user-select:none; -webkit-user-select:none; }
.tr-stage canvas{ position:absolute; display:block; }
.tr-box{ position:absolute; box-shadow:0 0 0 9999px rgba(0,0,0,.55); outline:2px solid #fff; cursor:move; touch-action:none; }
.tr-box::before,.tr-box::after{ content:''; position:absolute; inset:0; pointer-events:none;
  background-image:linear-gradient(to right, transparent calc(33.33% - .5px), rgba(255,255,255,.45) calc(33.33% - .5px), rgba(255,255,255,.45) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.45) calc(66.66% - .5px), rgba(255,255,255,.45) calc(66.66% + .5px), transparent calc(66.66% + .5px)); }
.tr-box::after{ background-image:linear-gradient(to bottom, transparent calc(33.33% - .5px), rgba(255,255,255,.45) calc(33.33% - .5px), rgba(255,255,255,.45) calc(33.33% + .5px), transparent calc(33.33% + .5px), transparent calc(66.66% - .5px), rgba(255,255,255,.45) calc(66.66% - .5px), rgba(255,255,255,.45) calc(66.66% + .5px), transparent calc(66.66% + .5px)); }
.tr-h{ position:absolute; width:34px; height:34px; touch-action:none; z-index:2; }
.tr-h::before{ content:''; position:absolute; width:16px; height:16px; border:4px solid #fff; box-sizing:border-box; }
.tr-h[data-h=nw]{ left:-10px; top:-10px; cursor:nwse-resize; } .tr-h[data-h=nw]::before{ left:8px; top:8px; border-right:none; border-bottom:none; }
.tr-h[data-h=ne]{ right:-10px; top:-10px; cursor:nesw-resize; } .tr-h[data-h=ne]::before{ right:8px; top:8px; border-left:none; border-bottom:none; }
.tr-h[data-h=sw]{ left:-10px; bottom:-10px; cursor:nesw-resize; } .tr-h[data-h=sw]::before{ left:8px; bottom:8px; border-right:none; border-top:none; }
.tr-h[data-h=se]{ right:-10px; bottom:-10px; cursor:nwse-resize; } .tr-h[data-h=se]::before{ right:8px; bottom:8px; border-left:none; border-top:none; }
.tr-h.ed::before{ width:22px; height:6px; border:none; background:#fff; border-radius:3px; }
.tr-h[data-h=n]{ left:calc(50% - 17px); top:-14px; cursor:ns-resize; } .tr-h[data-h=s]{ left:calc(50% - 17px); bottom:-14px; cursor:ns-resize; }
.tr-h[data-h=n]::before,.tr-h[data-h=s]::before{ left:6px; top:14px; }
.tr-h[data-h=w]{ top:calc(50% - 17px); left:-14px; cursor:ew-resize; } .tr-h[data-h=e]{ top:calc(50% - 17px); right:-14px; cursor:ew-resize; }
.tr-h[data-h=w]::before,.tr-h[data-h=e]::before{ width:6px; height:22px; left:14px; top:6px; }
.tr-box.fixed .tr-h.ed{ display:none; }
.tr-tools{ display:grid; grid-template-columns:repeat(5,1fr); gap:6px; padding:8px 10px 0; }
.tr-tools button{ min-height:48px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:11.5px; font-weight:bold; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; }
.tr-tools span{ font-size:19px; line-height:1; }
.tr-info{ text-align:center; font-size:12.5px; color:var(--text-light,#888); padding:4px 10px 0; }
.tr-foot{ display:flex; gap:6px; padding:8px 10px calc(10px + var(--safe-bottom,0px)); }
.tr-foot button{ flex:1; height:50px; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:16px; font-weight:bold; cursor:pointer; }
.tr-body{ padding:10px 12px calc(16px + var(--safe-bottom,0px)); overflow:auto; }
.tr-prev{ display:block; max-width:100%; max-height:34vh; margin:0 auto 6px; border-radius:6px; background:repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0/16px 16px; }
.tr-sec{ font-size:13px; font-weight:bold; color:var(--acc); margin:12px 0 6px; }
.tr-chips{ display:flex; flex-wrap:wrap; gap:6px; }
.tr-wh{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:8px; font-size:14px; }
.tr-wh input[type=number]{ width:84px; height:42px; font-size:17px; text-align:right; padding:0 8px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.tr-lock{ display:flex; align-items:center; gap:4px; font-size:13px; width:100%; }
.tr-lock input{ width:20px; height:20px; }
.tr-q{ display:flex; align-items:center; gap:8px; font-size:14px; }
.tr-q input{ flex:1; }
.tr-est{ margin:12px 0 4px; padding:10px 12px; border-radius:10px; background:rgba(120,132,156,.1); font-size:15px; line-height:1.6; }
.tr-est b{ font-size:17px; }
.tr-est small{ display:block; color:var(--text-light,#888); font-size:12px; }
.tr-btn{ display:block; width:100%; min-height:48px; margin:8px 0 0; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:16px; font-weight:bold; cursor:pointer; }
.tr-btn.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.tr-note{ font-size:12px; color:var(--text-light,#888); line-height:1.65; margin:8px 0 0; }
`;
function trEnsureDom(){
  if($('trimOverlay')) return;
  const s=document.createElement('style'); s.id='trStyle'; s.textContent=TR_CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="trimOverlay">
  <div class="modal vol-modal tr-modal" style="position:relative">
    <div class="modal-header"><span>✂ 写真トリミング</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="modal-close" onclick="closeTrim()" aria-label="閉じる">✕</button></span></div>
    <div class="tr-empty" id="trEmpty">
      <div style="font-size:40px">✂</div>
      <div><b>写真を撮るか選ぶと、<br>いる所だけ切り抜いて、大きさも変えられます。</b></div>
      <button class="tr-big" onclick="document.getElementById('trCamIn').click()">📷 写真を撮る</button>
      <button class="tr-big sub" onclick="document.getElementById('trPicIn').click()">🖼 写真を選ぶ</button>
      <div style="font-size:12px">写真はこの端末の中で処理するだけで、どこにも送りません。</div>
    </div>
    <div id="trEdit" hidden style="display:flex;flex-direction:column;flex:1;min-height:0">
      <div class="tr-bar" id="trAspects"></div>
      <div class="tr-stage" id="trStage"><canvas id="trCv"></canvas>
        <div class="tr-box" id="trBox"><div class="tr-h" data-h="nw"></div><div class="tr-h" data-h="ne"></div><div class="tr-h" data-h="sw"></div><div class="tr-h" data-h="se"></div>
          <div class="tr-h ed" data-h="n"></div><div class="tr-h ed" data-h="s"></div><div class="tr-h ed" data-h="w"></div><div class="tr-h ed" data-h="e"></div></div></div>
      <div class="tr-info" id="trInfo"></div>
      <div class="tr-tools">
        <button onclick="trRotate(-1)"><span>⟲</span>左に回す</button>
        <button onclick="trRotate(1)"><span>⟳</span>右に回す</button>
        <button onclick="trFlip()"><span>⇋</span>左右反転</button>
        <button onclick="trResetCrop()"><span>⤢</span>全体に戻す</button>
        <button onclick="trAnother()"><span>📷</span>別の写真</button>
      </div>
      <div class="tr-foot"><button id="trNext" onclick="trOpenOut()">次へ：大きさを決めて保存 ▶</button></div>
    </div>
  </div>
</div>
<div class="modal-overlay" id="trOutOverlay" onclick="if(event.target===this)trCloseOut()">
  <div class="modal"><div class="modal-header"><span>✂ 大きさを決めて保存</span><button class="modal-close" onclick="trCloseOut()" aria-label="閉じる">✕</button></div>
    <div class="tr-body" id="trOutBody"></div></div>
</div>
<div class="modal-overlay" id="trSubOverlay" onclick="if(event.target===this)trCloseSub()">
  <div class="modal"><div class="modal-header"><span id="trSubHdr">✂</span><button class="modal-close" onclick="trCloseSub()" aria-label="閉じる">✕</button></div>
    <div class="tr-body" id="trSubBody"></div></div>
</div>
<input type="file" id="trPicIn" accept="image/*" hidden onchange="trPick(this)">
<input type="file" id="trCamIn" accept="image/*" capture="environment" hidden onchange="trPick(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  trBindDrag();
  if(window.ResizeObserver) new ResizeObserver(()=>{ if(src) trLayout(); }).observe($('trStage'));
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openTrim(){
  trEnsureDom(); trLoadSt();
  openDlg('trimOverlay');
  trShowEdit(!!src);
}
function closeTrim(){
  if(!$('trimOverlay') || !isDlgOpen('trimOverlay')) return;
  trCloseOut(); trCloseSub(); closeDlg('trimOverlay');
}
function trShowEdit(on){
  $('trEmpty').hidden=on; $('trEmpty').style.display=on?'none':'';
  $('trEdit').hidden=!on; $('trEdit').style.display=on?'flex':'none';
  if(on){ trRenderAspects(); requestAnimationFrame(trLayout); }
}

/* ── 写真を読む ── */
async function trPick(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  try{ await trLoadFile(f); }catch(_){ toast('写真を読めませんでした'); }
}
async function trLoadFile(f){
  let bmp=null;
  try{ bmp=await createImageBitmap(f, {imageOrientation:'from-image'}); }catch(_){ bmp=null; }
  if(!bmp){
    bmp=await new Promise((res,rej)=>{ const u=URL.createObjectURL(f), im=new Image(); im.onload=()=>{ URL.revokeObjectURL(u); res(im); }; im.onerror=()=>{ URL.revokeObjectURL(u); rej(new Error('img')); }; im.src=u; });
  }
  const w0=bmp.width||bmp.naturalWidth, h0=bmp.height||bmp.naturalHeight;
  const k=Math.min(1, Math.sqrt(MAX_SRC_PX/(w0*h0)));
  const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w0*k)); c.height=Math.max(1,Math.round(h0*k));
  c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  if(bmp.close) try{ bmp.close(); }catch(_){}
  src=c; srcName=String(f.name||'写真').replace(/\.[^.]+$/,'').slice(0,40)||'写真';
  trApplyAspect(true);
  trShowEdit(true);
  if(k<1) toast('とても大きな写真なので、少し小さくして読み込みました（'+c.width+'×'+c.height+'）', 3500);
}
function trAnother(){
  trAsk3('📷 別の写真', 'どちらで入れますか？', '📷 写真を撮る', '🖼 写真を選ぶ', 'やめる').then(r=>{ if(r===0) $('trCamIn').click(); else if(r===1) $('trPicIn').click(); });
}

/* ── 形（縦横比） ── */
function trRatio(){
  const a=ASPECTS.find(x=>x[0]===st.aspect); if(!a || !a[2]) return 0;
  return a[2]<0 ? src.width/src.height : a[2];
}
function trRenderAspects(){
  $('trAspects').innerHTML=ASPECTS.map(([k,l])=>`<button class="tr-chip${st.aspect===k?' on':''}" onclick="trSetAspect('${k}')">${l}</button>`).join('');
}
function trSetAspect(k){ st.aspect=k; trSaveSt(); trRenderAspects(); trApplyAspect(true); trLayout(); }
/* いまの範囲の真ん中を保ったまま、その形でいちばん大きく（full＝写真全体から） */
function trApplyAspect(full){
  if(!src) return;
  const W=src.width, H=src.height, r=trRatio();
  if(!r){ if(full || !crop) crop={x:0,y:0,w:W,h:H}; return; }
  const base=full||!crop ? {x:0,y:0,w:W,h:H} : crop;
  const cx=base.x+base.w/2, cy=base.y+base.h/2;
  let w=base.w, h=w/r; if(h>base.h){ h=base.h; w=h*r; }
  if(w>W){ w=W; h=w/r; } if(h>H){ h=H; w=h*r; }
  crop={ x:Math.min(Math.max(0,cx-w/2),W-w), y:Math.min(Math.max(0,cy-h/2),H-h), w, h };
}
function trResetCrop(){ trApplyAspect(true); trLayout(); }

/* ── 回す・反転（写真そのものを回す） ── */
function trRotate(dir){
  if(!src) return;
  const c=document.createElement('canvas'); c.width=src.height; c.height=src.width;
  const g=c.getContext('2d'); g.translate(c.width/2,c.height/2); g.rotate(dir*Math.PI/2); g.drawImage(src,-src.width/2,-src.height/2);
  // 範囲もいっしょに回す
  const o=crop, W=src.width, H=src.height;
  crop = dir>0 ? {x:H-o.y-o.h, y:o.x, w:o.h, h:o.w} : {x:o.y, y:W-o.x-o.w, w:o.h, h:o.w};
  src=c;
  if(trRatio()) trApplyAspect(st.aspect==='orig');
  trLayout();
}
function trFlip(){
  if(!src) return;
  const c=document.createElement('canvas'); c.width=src.width; c.height=src.height;
  const g=c.getContext('2d'); g.translate(c.width,0); g.scale(-1,1); g.drawImage(src,0,0);
  crop={...crop, x:src.width-crop.x-crop.w}; src=c; trLayout();
}

/* ── 表示（ステージに収める） ── */
function trLayout(){
  const sg=$('trStage'); if(!sg || !src || $('trEdit').hidden) return;
  const pad=18, aw=Math.max(40, sg.clientWidth-pad*2), ah=Math.max(40, sg.clientHeight-pad*2);
  const k=Math.min(aw/src.width, ah/src.height);
  const dw=Math.round(src.width*k), dh=Math.round(src.height*k);
  disp={k, ox:Math.round((sg.clientWidth-dw)/2), oy:Math.round((sg.clientHeight-dh)/2)};
  const cv=$('trCv'), dpr=Math.min(2, window.devicePixelRatio||1);
  cv.width=Math.max(1,Math.round(dw*dpr)); cv.height=Math.max(1,Math.round(dh*dpr)); cv.style.width=dw+'px'; cv.style.height=dh+'px';
  cv.style.left=disp.ox+'px'; cv.style.top=disp.oy+'px';
  const g=cv.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(src,0,0,cv.width,cv.height);
  trBoxPos();
}
function trBoxPos(){
  const b=$('trBox'); if(!b || !crop) return;
  b.style.left=(disp.ox+crop.x*disp.k)+'px'; b.style.top=(disp.oy+crop.y*disp.k)+'px';
  b.style.width=(crop.w*disp.k)+'px'; b.style.height=(crop.h*disp.k)+'px';
  b.classList.toggle('fixed', !!trRatio());
  $('trInfo').textContent=`切り抜く範囲 ${Math.round(crop.w)} × ${Math.round(crop.h)}　（写真は ${src.width} × ${src.height}）`;
}

/* ── 枠を動かす ── */
let drag=null;
function trBindDrag(){
  const box=$('trBox');
  box.addEventListener('pointerdown', e=>{
    if(e.button>0) return; e.preventDefault(); e.stopPropagation();
    const h=e.target.dataset && e.target.dataset.h || 'move';
    drag={h, sx:e.clientX, sy:e.clientY, c0:{...crop}};
    try{ box.setPointerCapture(e.pointerId); }catch(_){}
  });
  box.addEventListener('pointermove', e=>{ if(drag){ e.preventDefault(); trDragTo(e.clientX, e.clientY); } });
  const end=()=>{ drag=null; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
}
function trDragTo(px, py){
  if(!drag || !src) return;
  const W=src.width, H=src.height, r=trRatio(), c0=drag.c0, k=disp.k;
  const dx=(px-drag.sx)/k, dy=(py-drag.sy)/k, h=drag.h;
  const mn=Math.max(MIN_CROP, 24/k);
  let {x,y,w,h:hh}=c0;
  if(h==='move'){ x=Math.min(Math.max(0,c0.x+dx),W-c0.w); y=Math.min(Math.max(0,c0.y+dy),H-c0.h); crop={x,y,w,h:hh}; trBoxPos(); return; }
  let L=c0.x, T=c0.y, R=c0.x+c0.w, B=c0.y+c0.h;
  if(h.includes('w')) L=Math.min(Math.max(0,L+dx), R-mn);
  if(h.includes('e')) R=Math.max(Math.min(W,R+dx), L+mn);
  if(h.includes('n')) T=Math.min(Math.max(0,T+dy), B-mn);
  if(h.includes('s')) B=Math.max(Math.min(H,B+dy), T+mn);
  if(r && h.length===2){
    // 角：動かした量の大きい方に合わせ、向かいの角を止めたまま形を保つ
    let nw=R-L, nh=B-T;
    if(nw/nh>r) nw=nh*r; else nh=nw/r;
    const ax=h.includes('w')?c0.x+c0.w:c0.x, ay=h.includes('n')?c0.y+c0.h:c0.y;
    const maxW=h.includes('w')?ax:W-ax, maxH=h.includes('n')?ay:H-ay;
    if(nw>maxW){ nw=maxW; nh=nw/r; } if(nh>maxH){ nh=maxH; nw=nh*r; }
    L=h.includes('w')?ax-nw:ax; T=h.includes('n')?ay-nh:ay; R=L+nw; B=T+nh;
  }
  crop={x:L, y:T, w:R-L, h:B-T}; trBoxPos();
}
/* テスト・キーボードから範囲を決める（src の画素） */
function trSetCrop(x,y,w,h){ if(!src) return; const W=src.width, H=src.height; w=Math.max(MIN_CROP,Math.min(W,w)); h=Math.max(MIN_CROP,Math.min(H,h)); crop={x:Math.min(Math.max(0,x),W-w), y:Math.min(Math.max(0,y),H-h), w, h}; trBoxPos(); }

/* ── 大きさ・形式を決めて保存 ── */
function trCropWH(){ return [Math.max(1,Math.round(crop.w)), Math.max(1,Math.round(crop.h))]; }
function trSizeFromKey(){
  const [cw,ch]=trCropWH(), s=st.size;
  if(s==='keep' || s==='custom' && !outW) { outW=cw; outH=ch; }
  else if(s[0]==='l'){ const L=+s.slice(1), k=Math.min(1, L/Math.max(cw,ch)); outW=Math.max(1,Math.round(cw*k)); outH=Math.max(1,Math.round(ch*k)); }
  else if(s[0]==='p'){ const k=+s.slice(1)/100; outW=Math.max(1,Math.round(cw*k)); outH=Math.max(1,Math.round(ch*k)); }
}
function trOpenOut(){
  if(!src || !crop) return;
  outW=0; outH=0; trSizeFromKey();
  const [cw,ch]=trCropWH();
  const fmts=[['jpeg','JPEG（写真向き）'],['png','PNG（文字・図）']].concat(webpOk?[['webp','WebP（小さい）']]:[]);
  if(!webpOk && st.fmt==='webp') st.fmt='jpeg';
  $('trOutBody').innerHTML=`
    <canvas class="tr-prev" id="trPrev"></canvas>
    <div class="tr-sec">出す大きさ（切り抜いた範囲 ${cw} × ${ch}）</div>
    <div class="tr-chips" id="trSizes">${SIZES.map(([k,l])=>`<button class="tr-chip${st.size===k?' on':''}" data-k="${k}" onclick="trSetSize('${k}')">${l}</button>`).join('')}</div>
    <div class="tr-wh">横<input type="number" id="trW" min="1" max="${MAX_OUT}" inputmode="numeric" value="${outW}" oninput="trSetWH('w')">×縦<input type="number" id="trH" min="1" max="${MAX_OUT}" inputmode="numeric" value="${outH}" oninput="trSetWH('h')">px
      <label class="tr-lock"><input type="checkbox" id="trLock" ${st.lock?'checked':''} onchange="trSetLock(this.checked)">🔗 縦横比を保つ</label></div>
    <div class="tr-sec">形式</div>
    <div class="tr-chips">${fmts.map(([k,l])=>`<button class="tr-chip${st.fmt===k?' on':''}" onclick="trSetFmt('${k}')">${l}</button>`).join('')}</div>
    <div id="trQRow" ${st.fmt==='png'?'hidden':''}><div class="tr-sec">画質</div><div class="tr-q"><input type="range" id="trQ" min="30" max="100" step="1" value="${st.q}" oninput="trSetQ(this.value)"><b id="trQv">${st.q}</b></div></div>
    <div class="tr-sec">ファイルの大きさ</div>
    <div class="tr-chips">${KBS.map(([k,l])=>`<button class="tr-chip${st.kb===k?' on':''}" onclick="trSetKB(${k})">${l}</button>`).join('')}</div>
    <div class="tr-est" id="trEst">計算しています…</div>
    <button class="tr-btn" onclick="trSave()">💾 保存する</button>
    <button class="tr-btn sub" onclick="trShare()">📤 送る・写真に保存（LINE・メール・写真アプリ）</button>
    <div class="tr-note">iPhone は「📤 送る」→「画像を保存」で写真アプリに入ります。Android・パソコンは「💾 保存する」でダウンロードに入ります。</div>`;
  openDlg('trOutOverlay');
  trDrawPrev(); trEstimate();
}
function trCloseOut(){ if($('trOutOverlay') && isDlgOpen('trOutOverlay')) closeDlg('trOutOverlay'); }
function trCloseSub(){ if($('trSubOverlay') && isDlgOpen('trSubOverlay')) closeDlg('trSubOverlay'); }
function trSetSize(k){
  st.size=k; trSaveSt(); trSizeFromKey();
  $('trW').value=outW; $('trH').value=outH;
  document.querySelectorAll('#trSizes .tr-chip').forEach(b=>b.classList.toggle('on', b.dataset.k===k));
  trEstimate();
}
function trSetWH(which){
  const [cw,ch]=trCropWH();
  let w=Math.round(+$('trW').value||0), h=Math.round(+$('trH').value||0);
  if(st.lock){ if(which==='w' && w>0){ h=Math.max(1,Math.round(w*ch/cw)); $('trH').value=h; } else if(which==='h' && h>0){ w=Math.max(1,Math.round(h*cw/ch)); $('trW').value=w; } }
  outW=Math.min(MAX_OUT,Math.max(0,w)); outH=Math.min(MAX_OUT,Math.max(0,h));
  st.size='custom'; trSaveSt();
  document.querySelectorAll('#trSizes .tr-chip').forEach(b=>b.classList.remove('on'));
  trEstimate();
}
function trSetLock(on){ st.lock=!!on; trSaveSt(); if(on) trSetWH('w'); }
function trSetFmt(k){ st.fmt=k; trSaveSt(); const qs=$('trQRow'); if(qs) qs.hidden=k==='png';
  document.querySelectorAll('#trOutBody .tr-chip').forEach(b=>{ const m=/trSetFmt\('(\w+)'\)/.exec(b.getAttribute('onclick')||''); if(m) b.classList.toggle('on', m[1]===k); }); trEstimate(); }
function trSetQ(v){ st.q=Math.max(30,Math.min(100,Math.round(+v))); $('trQv').textContent=st.q; trSaveSt(); trEstimate(); }
function trSetKB(k){ st.kb=k; trSaveSt();
  document.querySelectorAll('#trOutBody .tr-chip').forEach(b=>{ const m=/trSetKB\((\d+)\)/.exec(b.getAttribute('onclick')||''); if(m) b.classList.toggle('on', +m[1]===k); }); trEstimate(); }

/* 切り抜いて大きさを変えた絵（ゆっくり段階的に縮めて、ぎざぎざを抑える） */
function trRender(w, h){
  let cur=document.createElement('canvas'); cur.width=Math.round(crop.w); cur.height=Math.round(crop.h);
  cur.getContext('2d').drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, cur.width, cur.height);
  while(cur.width/2>=w && cur.height/2>=h){
    const n=document.createElement('canvas'); n.width=Math.round(cur.width/2); n.height=Math.round(cur.height/2);
    const g=n.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(cur,0,0,n.width,n.height); cur=n;
  }
  const o=document.createElement('canvas'); o.width=w; o.height=h;
  const g=o.getContext('2d');
  if(st.fmt==='jpeg'){ g.fillStyle='#fff'; g.fillRect(0,0,w,h); }   // JPEG は透けない
  g.imageSmoothingQuality='high'; g.drawImage(cur,0,0,w,h);
  return o;
}
const toBlobP=(c,type,q)=>new Promise(r=>c.toBlob(b=>r(b), type, q));
/* できあがり（「〜KB 以下」なら画質→大きさの順に下げて収める）。{blob,w,h,q,shrunk} */
async function trMakeBlob(){
  if(!src || !crop) return null;
  let w=outW||trCropWH()[0], h=outH||trCropWH()[1];
  w=Math.max(1,Math.min(MAX_OUT,w)); h=Math.max(1,Math.min(MAX_OUT,h));
  const type='image/'+st.fmt;
  let q=st.fmt==='png'?undefined:st.q/100, cv=trRender(w,h), b=await toBlobP(cv,type,q), shrunk=false;
  const lim=st.kb*1024;
  if(lim && b && b.size>lim){
    if(st.fmt!=='png'){
      let lo=0.3, hi=q, best=null;
      for(let i=0;i<7;i++){ const m=(lo+hi)/2; const t=await toBlobP(cv,type,m); if(t && t.size<=lim){ best={b:t,q:m}; lo=m; } else hi=m; }
      if(best){ b=best.b; q=best.q; }
    }
    let tries=0;
    while(b && b.size>lim && tries<12 && w>32 && h>32){
      const k=Math.max(0.5, Math.sqrt(lim/b.size)*0.95); w=Math.max(1,Math.round(w*k)); h=Math.max(1,Math.round(h*k)); shrunk=true;
      cv=trRender(w,h); b=await toBlobP(cv,type,st.fmt==='png'?undefined:Math.max(0.3,q||0.3)); tries++;
    }
  }
  return {blob:b, w, h, q:q==null?null:Math.round(q*100), shrunk};
}
function trDrawPrev(){
  const p=$('trPrev'); if(!p) return;
  const k=Math.min(1, 600/Math.max(crop.w,crop.h));
  p.width=Math.max(1,Math.round(crop.w*k)); p.height=Math.max(1,Math.round(crop.h*k));
  p.getContext('2d').drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, p.width, p.height);
}
let lastOut=null;
function trEstimate(){
  clearTimeout(estT); const my=++estSeq;
  estT=setTimeout(async ()=>{
    const e=$('trEst'); if(!e) return;
    if(!(outW>0 && outH>0)){ e.innerHTML='横と縦の大きさを入れてください'; return; }
    const r=await trMakeBlob(); if(my!==estSeq || !r || !r.blob) return;
    lastOut=r;
    const [cw,ch]=trCropWH();
    const up=r.w>cw || r.h>ch;
    e.innerHTML=`できあがり：<b>${r.w} × ${r.h}</b>　<b>${fmtKB(r.blob.size)}</b>`
      +(r.q!=null && (st.kb && r.q<st.q)?`<small>画質を ${r.q} に下げて収めました</small>`:'')
      +(r.shrunk?`<small>${st.kb}KB に収めるため、大きさも小さくしました</small>`:'')
      +(st.kb && r.blob.size>st.kb*1024?`<small>この形式では ${st.kb}KB に収まりませんでした（JPEG にすると小さくなります）</small>`:'')
      +(up?'<small>元より大きくすると、ぼやけます</small>':'');
  }, 250);
}
function trFileName(r){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${srcName}_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${r.w}x${r.h}.${st.fmt==='jpeg'?'jpg':st.fmt}`; }
async function trSave(){
  const r=await trMakeBlob(); if(!r || !r.blob){ toast('作れませんでした'); return; }
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(r.blob), download:trFileName(r)});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast(`保存しました（${r.w}×${r.h}・${fmtKB(r.blob.size)}）`);
}
async function trShare(){
  const r=await trMakeBlob(); if(!r || !r.blob){ toast('作れませんでした'); return; }
  const file=new File([r.blob], trFileName(r), {type:r.blob.type});
  try{
    if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file]}); return; }
  }catch(e){ if(e && e.name==='AbortError') return; }
  toast('この端末では送れないので、保存します'); trSave();
}
function trAsk3(hdr, msg, a, b, c){
  return new Promise(res=>{
    $('trSubHdr').textContent=hdr;
    $('trSubBody').innerHTML=`<div style="white-space:pre-wrap;font-size:15px;line-height:1.7;margin:4px 0 8px">${esc(msg)}</div>
      <button class="tr-btn" data-r="0">${esc(a)}</button><button class="tr-btn sub" data-r="1">${esc(b)}</button><button class="tr-btn sub" data-r="2">${esc(c)}</button>`;
    let done=false; const fin=r=>{ if(done) return; done=true; res(r); };
    $('trSubBody').querySelectorAll('button').forEach(x=>x.onclick=()=>{ fin(+x.dataset.r); trCloseSub(); });
    openDlg('trSubOverlay', ()=>fin(2));
  });
}

Object.assign(window, { openTrim, closeTrim, trPick, trLoadFile, trAnother, trSetAspect, trResetCrop, trRotate, trFlip, trOpenOut, trCloseOut, trCloseSub,
  trSetSize, trSetWH, trSetLock, trSetFmt, trSetQ, trSetKB, trSave, trShare, trMakeBlob, trSetCrop, trDragTo,
  trState:()=>({st, crop:crop&&{...crop}, src:src&&{w:src.width,h:src.height}, outW, outH, disp:{...disp}, last:lastOut&&{w:lastOut.w,h:lastOut.h,size:lastOut.blob.size}}) });
})();
