/* ✂ 写真トリミング（v486・v487。表電卓の道具。はじめて開いたときに読む）
   写真を撮る／選ぶ → 四角の枠を動かして切り抜く → 大きさ（ピクセル・%・ファイルの大きさ）と形式を決めて保存・送る。
   ・枠は角・辺をつまんで大きさ、中をつまんで場所。形（自由・元の形・1:1・4:3・3:4・16:9・9:16・名刺・A4・証明写真）を選べる。
   ・左右に90°回す・左右反転・範囲をはじめに戻す。
   ・角度を 0.1° ずつ回す（−45°〜＋45°。すき間が出ないよう少し大きくして回す）。
   ・📏 水平線：写真の中の水平なもの（地平線・机のふち）の両はしを点で結ぶと、その線が水平になるように回す
     （縦に近い線なら垂直にする。v487）。
   ・出す大きさ：そのまま／長い辺 2048〜640px／50%・25%／横×縦を手で（縦横比を保つ）。
     形式 JPEG・PNG・WebP、画質。「〜KB 以下に」を選ぶと画質（足りなければ大きさ）を下げてそこに収める。
   ・写真は端末の中で処理するだけで、どこにも送らず、残しもしない（決めた設定だけ excalc_trim に覚える）。
   ・v601：☀ 明るさ・◐ コントラスト（−50〜＋50。✨ 自動 で ちょうど よく）。画面は CSS の filter、書き出しは 同じ 式で 画素を 直す。
   ・v601：🗂 何枚も まとめて 同じ大きさに（長い辺を そろえる／横×縦 ぴったり（はみ出しは 真ん中で 切る））。
     明るさ・コントラスト（1枚ずつ 自動 も）・形式・画質・「〜KB 以下」も 同じに。📤 まとめて 送る・🗜 ZIP・💾 1枚ずつ。 */
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
let st={ aspect:'free', fmt:'jpeg', q:85, size:'keep', lock:true, kb:0, bt:{mode:'long', L:1600, W:1200, H:900} };
let src=null;        // いまの写真（回転・反転をしたもの）canvas
let srcName='写真';
let crop=null;       // {x,y,w,h}（src の画素）
let ang=0;           // 細かい回転（度。−45〜45。v487）。src の大きさのまま、すき間が出ないよう拡大して回す
let srcRot=null, srcRotKey='';   // 回した写真（書き出しのときに作って覚える）
let lineMode=false, lineP=[];    // 📏 水平線：点（ステージの座標）
let disp={k:1, ox:0, oy:0};
let outW=0, outH=0;  // 出す大きさ
let estT=null, estSeq=0;
let adj={b:0, c:0};  // ☀ 明るさ・◐ コントラスト（−50〜＋50。v601）

function trLoadSt(){ try{ const o=JSON.parse(localStorage.getItem(TR_KEY)||'null'); if(o){
  if(ASPECTS.some(a=>a[0]===o.aspect)) st.aspect=o.aspect; if(['jpeg','png','webp'].includes(o.fmt)) st.fmt=o.fmt;
  if(o.q>=30 && o.q<=100) st.q=Math.round(o.q); if(SIZES.some(s=>s[0]===o.size) || o.size==='custom') st.size=o.size;
  st.lock=o.lock!==false; if(KBS.some(k=>k[0]===o.kb)) st.kb=o.kb;
  const b=o.bt||{}, n=(v,d)=>Number.isInteger(v) && v>=16 && v<=MAX_OUT ? v : d;
  st.bt={mode:b.mode==='fit' ? 'fit' : 'long', L:n(b.L,1600), W:n(b.W,1200), H:n(b.H,900)}; } }catch(_){} }
function trSaveSt(){ try{ localStorage.setItem(TR_KEY, JSON.stringify(st)); }catch(_){} }
const toBlobP=(c,type,q)=>new Promise(r=>c.toBlob(b=>r(b), type, q));
const webpOk=(()=>{ try{ const c=document.createElement('canvas'); c.width=c.height=1; return c.toDataURL('image/webp').startsWith('data:image/webp'); }catch(_){ return false; } })();
const fmtKB=n=>n>=1024*1024 ? (n/1024/1024).toFixed(n>=10*1024*1024?0:1)+'MB' : Math.max(1,Math.round(n/1024))+'KB';

/* ── ☀ 明るさ・◐ コントラスト（v601）──
   画面は CSS の brightness()・contrast()。書き出しは 同じ 式（明るさを かけて 0〜1 に おさめ、0.5 を 中心に コントラスト）で 画素を 直す */
const adjOn=a=>!!(a && (a.b || a.c));
const adjCss=a=>adjOn(a) ? `brightness(${(1+a.b/100).toFixed(2)}) contrast(${(1+a.c/100).toFixed(2)})` : '';
function adjPixels(cv, a){
  if(!adjOn(a)) return cv;
  const g=cv.getContext('2d'), d=g.getImageData(0,0,cv.width,cv.height), px=d.data, B=1+a.b/100, C=1+a.c/100, lut=new Uint8ClampedArray(256);
  for(let i=0;i<256;i++){ const x=Math.min(1, i/255*B); lut[i]=Math.round(((x-0.5)*C+0.5)*255); }
  for(let i=0;i<px.length;i+=4){ px[i]=lut[px[i]]; px[i+1]=lut[px[i+1]]; px[i+2]=lut[px[i+2]]; }
  g.putImageData(d,0,0); return cv;
}
// ✨ 自動：明るさの 2%〜98% が 0.02〜0.98 に 広がるように（−50〜＋50 に おさめる）
function autoAdj(srcCv, sx, sy, sw, sh){
  const k=Math.min(1, 256/Math.max(sw,sh)), c=document.createElement('canvas'); c.width=Math.max(1,Math.round(sw*k)); c.height=Math.max(1,Math.round(sh*k));
  const g=c.getContext('2d'); g.drawImage(srcCv, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const px=g.getImageData(0,0,c.width,c.height).data, h=new Uint32Array(256); let n=0;
  for(let i=0;i<px.length;i+=4){ h[Math.round(0.299*px[i]+0.587*px[i+1]+0.114*px[i+2])]++; n++; }
  const at=f=>{ let s=0; for(let i=0;i<256;i++){ s+=h[i]; if(s>=n*f) return i/255; } return 1; };
  const lo=at(0.02), hi=Math.max(lo+0.05, at(0.98)), bc=0.96/(hi-lo), C=1.92*lo/(hi-lo)+0.96, B=bc/C;
  const v=x=>Math.max(-50, Math.min(50, Math.round((x-1)*100)));
  return {b:v(B), c:v(C)};
}
// 切り抜いて w×h に（ゆっくり 段階的に 縮めて ぎざぎざを 抑える）。明るさ・コントラストも
function stepDraw(srcCv, sx, sy, sw, sh, w, h, fmt, a){
  let cur=document.createElement('canvas'); cur.width=Math.max(1,Math.round(sw)); cur.height=Math.max(1,Math.round(sh));
  cur.getContext('2d').drawImage(srcCv, sx, sy, sw, sh, 0, 0, cur.width, cur.height);
  while(cur.width/2>=w && cur.height/2>=h){
    const n=document.createElement('canvas'); n.width=Math.round(cur.width/2); n.height=Math.round(cur.height/2);
    const g=n.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(cur,0,0,n.width,n.height); cur=n;
  }
  const o=document.createElement('canvas'); o.width=w; o.height=h;
  const g=o.getContext('2d');
  if(fmt==='jpeg'){ g.fillStyle='#fff'; g.fillRect(0,0,w,h); }   // JPEG は透けない
  g.imageSmoothingQuality='high'; g.drawImage(cur,0,0,w,h);
  return adjPixels(o, a);
}
// できあがり（「〜KB 以下」なら 画質→大きさ の 順に 下げて 収める）。{blob,w,h,q,shrunk}
async function blobFit(draw, w, h, fmt, qPct, kb){
  const type='image/'+fmt;
  let q=fmt==='png'?undefined:qPct/100, cv=draw(w,h), b=await toBlobP(cv,type,q), shrunk=false;
  const lim=kb*1024;
  if(lim && b && b.size>lim){
    if(fmt!=='png'){
      let lo=0.3, hi=q, best=null;
      for(let i=0;i<7;i++){ const m=(lo+hi)/2; const t=await toBlobP(cv,type,m); if(t && t.size<=lim){ best={b:t,q:m}; lo=m; } else hi=m; }
      if(best){ b=best.b; q=best.q; }
    }
    let tries=0;
    while(b && b.size>lim && tries<12 && w>32 && h>32){
      const k=Math.max(0.5, Math.sqrt(lim/b.size)*0.95); w=Math.max(1,Math.round(w*k)); h=Math.max(1,Math.round(h*k)); shrunk=true;
      cv=draw(w,h); b=await toBlobP(cv,type,fmt==='png'?undefined:Math.max(0.3,q||0.3)); tries++;
    }
  }
  return {blob:b, w, h, q:q==null?null:Math.round(q*100), shrunk};
}

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
.tr-ang{ display:flex; align-items:center; gap:6px; padding:6px 10px 0; }
.tr-ang[hidden]{ display:none; }
.tr-ang input{ flex:1; min-width:0; height:32px; }
.tr-ang button{ flex:none; height:40px; min-width:44px; padding:0 6px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; }
.tr-ang b{ flex:none; width:52px; text-align:center; font-size:15px; cursor:pointer; }
.tr-ang .tr-lv{ background:#fff8c4; border-color:#e0c200; }
.tr-line{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; display:none; }
.tr-stage.line-mode .tr-line{ display:block; }
.tr-stage.line-mode .tr-box{ display:none; }
.tr-stage.line-mode{ cursor:crosshair; }
.tr-linebar{ padding:6px 10px 0; font-size:12.5px; color:var(--text,#333); line-height:1.5; }
.tr-linebar .row{ display:flex; gap:6px; margin-top:6px; }
.tr-linebar button{ flex:1; height:44px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.tr-linebar button.go{ flex:2; background:#e0c200; border-color:#e0c200; color:#222; }
.tr-linebar button:disabled{ opacity:.45; }
.tr-tools{ display:grid; grid-template-columns:repeat(6,1fr); gap:5px; padding:8px 10px 0; }
.tr-tools button.on{ background:#fff8c4; border-color:#e0c200; }
.tr-tools button{ white-space:nowrap; overflow:hidden; font-size:11px; letter-spacing:-.02em; padding:0 2px; }
.tr-adj{ padding:6px 10px 0; display:flex; flex-direction:column; gap:2px; }
.tr-adj[hidden]{ display:none; }
.tr-adj label{ display:flex; align-items:center; gap:8px; font-size:13px; font-weight:bold; color:var(--text,#333); }
.tr-adj label input{ flex:1; min-width:0; height:30px; } .tr-adj label b{ width:34px; text-align:right; font-variant-numeric:tabular-nums; }
.tr-adj .row{ display:flex; gap:6px; margin-top:2px; } .tr-adj .row button{ flex:1; height:38px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; }
.tr-btpics{ display:grid; grid-template-columns:repeat(auto-fill,minmax(72px,1fr)); gap:6px; }
.tr-btp{ position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; background:#ddd; } .tr-btp img{ width:100%; height:100%; object-fit:cover; display:block; }
.tr-btp button{ position:absolute; top:2px; right:2px; width:26px; height:26px; border-radius:13px; border:0; background:rgba(0,0,0,.6); color:#fff; font-size:13px; cursor:pointer; }
.tr-btp i{ position:absolute; left:3px; bottom:2px; font-style:normal; font-size:11px; font-weight:bold; color:#fff; text-shadow:0 0 3px #000; }
.tr-btadd{ aspect-ratio:1; border-radius:8px; border:2px dashed rgba(120,132,156,.6); background:transparent; color:var(--text,#333); font-size:24px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; }
.tr-btadd small{ font-size:11px; font-weight:bold; }
.tr-btadj label{ display:flex; align-items:center; gap:8px; font-size:13px; } .tr-btadj label input[type=range]{ flex:1; min-width:0; } .tr-btadj label b{ width:34px; text-align:right; }
.tr-btadj .ck{ font-weight:bold; margin-top:4px; } .tr-btadj .ck input{ width:20px; height:20px; }
.tr-btn:disabled{ opacity:.5; cursor:default; }
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
      <button class="tr-big sub" onclick="trBatchOpen()">🗂 何枚も まとめて 同じ大きさに</button>
      <div style="font-size:12px">写真はこの端末の中で処理するだけで、どこにも送りません。</div>
    </div>
    <div id="trEdit" hidden style="display:flex;flex-direction:column;flex:1;min-height:0">
      <div class="tr-bar" id="trAspects"></div>
      <div class="tr-stage" id="trStage"><canvas id="trCv"></canvas><svg class="tr-line" id="trLine"></svg>
        <div class="tr-box" id="trBox"><div class="tr-h" data-h="nw"></div><div class="tr-h" data-h="ne"></div><div class="tr-h" data-h="sw"></div><div class="tr-h" data-h="se"></div>
          <div class="tr-h ed" data-h="n"></div><div class="tr-h ed" data-h="s"></div><div class="tr-h ed" data-h="w"></div><div class="tr-h ed" data-h="e"></div></div></div>
      <div class="tr-info" id="trInfo"></div>
      <div class="tr-ang" id="trAngRow">
        <button onclick="trNudge(-0.1)" aria-label="0.1度 左へ">−0.1</button>
        <input type="range" id="trAng" min="-45" max="45" step="0.1" value="0" oninput="trSetAng(this.value)" aria-label="角度">
        <button onclick="trNudge(0.1)" aria-label="0.1度 右へ">＋0.1</button>
        <b id="trAngV" onclick="trSetAng(0)" title="押すと 0° に戻す">0.0°</b>
        <button class="tr-lv" onclick="trLineMode(true)">📏 線で水平</button>
      </div>
      <div class="tr-linebar" id="trLineBar" hidden>
        <div id="trLineMsg"></div>
        <div class="row"><button class="go" id="trLineGo" onclick="trLineApply()" disabled>この線を水平にする</button><button onclick="trLineMode(false)">やめる</button></div>
      </div>
      <div class="tr-adj" id="trAdjRow" hidden>
        <label>☀ 明るさ<input type="range" id="trAdjB" min="-50" max="50" step="1" value="0" oninput="trSetAdj('b',this.value)"><b id="trAdjBv">0</b></label>
        <label>◐ コントラスト<input type="range" id="trAdjC" min="-50" max="50" step="1" value="0" oninput="trSetAdj('c',this.value)"><b id="trAdjCv">0</b></label>
        <div class="row"><button onclick="trAdjAuto()">✨ 自動</button><button onclick="trAdjReset()">↺ 0 に もどす</button><button onclick="trAdjShow(false)">✓ とじる</button></div>
      </div>
      <div class="tr-tools">
        <button onclick="trRotate(-1)"><span>⟲</span>左に回す</button>
        <button onclick="trRotate(1)"><span>⟳</span>右に回す</button>
        <button onclick="trFlip()"><span>⇋</span>左右反転</button>
        <button onclick="trResetCrop()"><span>⤢</span>全体に戻す</button>
        <button id="trAdjBtn" onclick="trAdjShow()"><span>☀</span>明るさ</button>
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
<div class="modal-overlay" id="trBatchOverlay" onclick="if(event.target===this)trBatchClose()">
  <div class="modal"><div class="modal-header"><span>🗂 まとめて 同じ大きさに</span><button class="modal-close" onclick="trBatchClose()" aria-label="閉じる">✕</button></div>
    <div class="tr-body" id="trBtBody"></div></div>
</div>
<input type="file" id="trBtIn" accept="image/*" multiple hidden onchange="trBatchAdd(this)">
<input type="file" id="trPicIn" accept="image/*" hidden onchange="trPick(this)">
<input type="file" id="trCamIn" accept="image/*" capture="environment" hidden onchange="trPick(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  trBindDrag(); trBindLine();
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
  trCloseOut(); trCloseSub(); if(lineMode) trLineMode(false); closeDlg('trimOverlay');
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
// 写真の ファイル → canvas（向きは 写真の とおり。とても 大きい ものは 少し 小さく）{c,k}
async function loadCanvas(f){
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
  return {c, k};
}
async function trLoadFile(f){
  const {c, k}=await loadCanvas(f);
  src=c; trSrcId++; ang=0; if($('trAng')) trSetAng(0); if(lineMode) trLineMode(false); adj={b:0, c:0}; trAdjUi(); srcName=String(f.name||'写真').replace(/\.[^.]+$/,'').slice(0,40)||'写真';
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
  src=c; trSrcId++;
  if(trRatio()) trApplyAspect(st.aspect==='orig');
  trLayout();
}
function trFlip(){
  if(!src) return;
  const c=document.createElement('canvas'); c.width=src.width; c.height=src.height;
  const g=c.getContext('2d'); g.translate(c.width,0); g.scale(-1,1); g.drawImage(src,0,0);
  crop={...crop, x:src.width-crop.x-crop.w}; src=c; trSrcId++; trSetAng(-ang);
}

/* ── 細かい回転 ── */
function trRotScale(){
  const t=Math.abs(ang)*Math.PI/180, c=Math.cos(t), sn=Math.sin(t), W=src.width, H=src.height;
  return Math.max((W*c+H*sn)/W, (W*sn+H*c)/H);   // 回してもすき間が出ない拡大率
}
/* src を ang だけ回して、ow×oh（src と同じ縦横比）の g に描く */
function trDrawRot(g, ow, oh){
  const W=src.width, H=src.height;
  g.save(); g.translate(ow/2, oh/2);
  if(ang) g.rotate(ang*Math.PI/180);
  const k=ow/W*(ang?trRotScale():1); g.scale(k, k);
  g.imageSmoothingQuality='high'; g.drawImage(src, -W/2, -H/2); g.restore();
}
/* 書き出し用の回した写真（角度が 0 なら src のまま） */
function trSrcR(){
  if(!ang) return src;
  const key=ang+'|'+src.width+'x'+src.height+'|'+trSrcId;
  if(srcRot && srcRotKey===key) return srcRot;
  const c=document.createElement('canvas'); c.width=src.width; c.height=src.height;
  trDrawRot(c.getContext('2d'), c.width, c.height);
  srcRot=c; srcRotKey=key; return c;
}
let trSrcId=0;   // src を作り直すたびに増やす（回した写真の覚えを捨てる）
const fmtAng=a=>(a>0?'+':a<0?'−':'')+Math.abs(a).toFixed(1)+'°';
function trSetAng(a, quiet){
  a=Math.round(Math.max(-45, Math.min(45, +a||0))*10)/10;
  ang=a;
  const r=$('trAng'); if(r && +r.value!==a) r.value=a;
  const v=$('trAngV'); if(v) v.textContent=fmtAng(a);
  trLayout();
}
function trNudge(d){ trSetAng(ang+d); }

/* ── 📏 水平線（両はしを点で結んで、その線を水平にする） ── */
function trLineMode(on){
  lineMode=!!on; lineP=[];
  const sg=$('trStage'); if(sg) sg.classList.toggle('line-mode', lineMode);
  $('trLineBar').hidden=!lineMode; $('trAngRow').hidden=lineMode;
  trDrawLine();
  // 📏 のあいだは 端末の「戻る」で 📏 だけ おわる（トリミングごと 閉じない。v553）
  if(typeof modeBackGuard==='function') modeBackGuard('trLineGuard', lineMode && isDlgOpen('trimOverlay'), ()=>{ if(lineMode){ trLineMode(false); toast('📏 線で水平を やめました'); } });
}
function trLineAngle(){
  if(lineP.length<2) return null;
  const dx=lineP[1].x-lineP[0].x, dy=lineP[1].y-lineP[0].y;
  if(Math.hypot(dx,dy)<20) return null;
  let a=Math.atan2(dy,dx)*180/Math.PI;          // 画面での線の傾き（右下がりが＋）
  if(a>90) a-=180; if(a<-90) a+=180;            // −90〜90 に
  const vert=Math.abs(a)>45;
  const off=vert ? (a>0 ? a-90 : a+90) : a;     // 水平（縦なら垂直）からのずれ
  return {off, vert};
}
function trDrawLine(){
  const svg=$('trLine'); if(!svg) return;
  const ok=trLineAngle();
  const L=lineP.length>=2 ? `<line x1="${lineP[0].x}" y1="${lineP[0].y}" x2="${lineP[1].x}" y2="${lineP[1].y}" stroke="#ffeb3b" stroke-width="3" stroke-dasharray="${ok?'0':'6 4'}"/>`:'';
  const D=lineP.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="11" fill="rgba(255,235,59,.35)" stroke="#ffeb3b" stroke-width="3"/><circle cx="${p.x}" cy="${p.y}" r="3" fill="#ffeb3b"/>`).join('');
  svg.innerHTML=L+D;
  const b=$('trLineGo'); if(b){ b.disabled=!ok; b.textContent=ok ? (ok.vert?'この線を垂直にする':'この線を水平にする')+'（'+fmtAng(-ok.off)+'）' : 'この線を水平にする'; }
  const t=$('trLineMsg'); if(t) t.textContent = lineP.length<2 ? '写真の中の水平なもの（地平線・机のふち・棚など）の、はしを押してください'+(lineP.length?'（もう一方のはしも）':'') : '点をつまむと動かせます。合ったら下のボタンを押してください';
}
function trLineApply(){
  const r=trLineAngle(); if(!r) return;
  const before=ang;
  trSetAng(ang - r.off);
  trLineMode(false);
  if(Math.abs(before - r.off)>45) toast('45°までしか回せません。90°の回転と組み合わせてください');
  else toast((r.vert?'垂直':'水平')+'にしました（'+fmtAng(ang)+'）');
}
function trBindLine(){
  const sg=$('trStage'); let dragI=-1;
  const pt=e=>{ const r=sg.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; };   // 小数のまま（丸めると角度が 0.1° ずれる）
  sg.addEventListener('pointerdown', e=>{
    if(!lineMode) return; e.preventDefault();
    const p=pt(e);
    dragI=lineP.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<26);
    if(dragI<0){
      if(lineP.length>=2) lineP=[];
      lineP.push(p); if(lineP.length===1) lineP.push({...p});   // 押してなぞれば1回で線になる
      dragI=lineP.length-1;
    }
    try{ sg.setPointerCapture(e.pointerId); }catch(_){}
    trDrawLine();
  });
  sg.addEventListener('pointermove', e=>{ if(!lineMode || dragI<0) return; e.preventDefault(); lineP[dragI]=pt(e); trDrawLine(); });
  const end=()=>{ if(!lineMode) return;
    // 1回押しただけ（なぞっていない）なら、2つ目の点を待つ
    if(lineP.length===2 && Math.hypot(lineP[1].x-lineP[0].x, lineP[1].y-lineP[0].y)<6) lineP=[lineP[0]];
    dragI=-1; trDrawLine(); };
  sg.addEventListener('pointerup', end); sg.addEventListener('pointercancel', end);
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
  const g=cv.getContext('2d'); g.clearRect(0,0,cv.width,cv.height); trDrawRot(g, cv.width, cv.height);
  cv.style.filter=adjCss(adj);
  trBoxPos();
}
function trBoxPos(){
  const b=$('trBox'); if(!b || !crop) return;
  b.style.left=(disp.ox+crop.x*disp.k)+'px'; b.style.top=(disp.oy+crop.y*disp.k)+'px';
  b.style.width=(crop.w*disp.k)+'px'; b.style.height=(crop.h*disp.k)+'px';
  b.classList.toggle('fixed', !!trRatio());
  $('trInfo').textContent=`切り抜く範囲 ${Math.round(crop.w)}×${Math.round(crop.h)}（写真 ${src.width}×${src.height}${ang?'・'+fmtAng(ang):''}${adjOn(adj)?'・☀'+fmtAdj(adj.b)+' ◐'+fmtAdj(adj.c):''}）`;
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
  if(lineMode) trLineMode(false);
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
function trRender(w, h){ return stepDraw(trSrcR(), crop.x, crop.y, crop.w, crop.h, w, h, st.fmt, adj); }
/* できあがり（「〜KB 以下」なら画質→大きさの順に下げて収める）。{blob,w,h,q,shrunk} */
async function trMakeBlob(){
  if(!src || !crop) return null;
  let w=outW||trCropWH()[0], h=outH||trCropWH()[1];
  w=Math.max(1,Math.min(MAX_OUT,w)); h=Math.max(1,Math.min(MAX_OUT,h));
  return blobFit(trRender, w, h, st.fmt, st.q, st.kb);
}
function trDrawPrev(){
  const p=$('trPrev'); if(!p) return;
  const k=Math.min(1, 600/Math.max(crop.w,crop.h));
  p.width=Math.max(1,Math.round(crop.w*k)); p.height=Math.max(1,Math.round(crop.h*k));
  p.getContext('2d').drawImage(trSrcR(), crop.x, crop.y, crop.w, crop.h, 0, 0, p.width, p.height);
  p.style.filter=adjCss(adj);
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
/* ── ☀ 明るさ・◐ コントラスト の 画面（v601）── */
const fmtAdj=v=>(v>0?'+':v<0?'−':'')+Math.abs(v);
function trAdjUi(){
  const b=$('trAdjB'), c=$('trAdjC'); if(!b || !c) return;
  b.value=adj.b; c.value=adj.c; $('trAdjBv').textContent=fmtAdj(adj.b); $('trAdjCv').textContent=fmtAdj(adj.c);
  const bt=$('trAdjBtn'), r=$('trAdjRow'); if(bt) bt.classList.toggle('on', adjOn(adj) || !!(r && !r.hidden));
}
function trAdjPaint(){ const cv=$('trCv'); if(cv) cv.style.filter=adjCss(adj); if(src && crop) trBoxPos(); }
function trAdjShow(on){ const r=$('trAdjRow'); if(!r) return; r.hidden=on==null ? !r.hidden : !on; if(!r.hidden && lineMode) trLineMode(false); trAdjUi(); requestAnimationFrame(trLayout); }
function trSetAdj(k, v){ if(!src || !['b','c'].includes(k)) return; adj[k]=Math.max(-50, Math.min(50, Math.round(+v)||0)); trAdjUi(); trAdjPaint(); }
function trAdjAuto(){ if(!src || !crop) return; adj=autoAdj(trSrcR(), crop.x, crop.y, crop.w, crop.h); trAdjUi(); trAdjPaint(); toast('✨ 明るさ '+fmtAdj(adj.b)+'・コントラスト '+fmtAdj(adj.c)+' に しました'); }
function trAdjReset(){ adj={b:0, c:0}; trAdjUi(); trAdjPaint(); }

/* ── 🗂 何枚も まとめて 同じ大きさに（v601）── */
const BT_MAX=50, BT_L=[2048,1600,1200,1000,800,640], BT_FIT=[[1200,900],[1600,1200],[1080,1080],[1920,1080],[900,1200]];
let bt={files:[], b:0, c:0, auto:false, busy:false}, btLast=null, btZip=null, btPrevT=null, btPrevSeq=0;
const btExt=()=>st.fmt==='jpeg' ? 'jpg' : st.fmt;
const btBase=n=>String(n||'写真').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|\u0000-\u001F]/g,'_').slice(0,40)||'写真';
function trBatchOpen(){
  trEnsureDom(); trLoadSt();
  if(!isDlgOpen('trBatchOverlay')) openDlg('trBatchOverlay', trBatchGone);
  trBatchRender();
}
function trBatchClose(){ if($('trBatchOverlay') && isDlgOpen('trBatchOverlay')) closeDlg('trBatchOverlay', trBatchGone); }
function trBatchGone(){ bt.files.forEach(x=>{ try{ URL.revokeObjectURL(x.url); }catch(_){} }); bt.files=[]; clearTimeout(btPrevT); btPrevSeq++; }
function trBatchAdd(inp){
  const fs=[...(inp.files||[])].filter(f=>/^image\//.test(f.type||'')); inp.value='';
  const room=BT_MAX-bt.files.length;
  if(fs.length>room) toast('まとめて できるのは '+BT_MAX+'枚まで です', 3200);
  fs.slice(0, Math.max(0,room)).forEach(f=>bt.files.push({f, url:URL.createObjectURL(f), name:btBase(f.name)}));
  trBatchRender();
}
function trBatchDel(i){ const x=bt.files[i]; if(!x || bt.busy) return; try{ URL.revokeObjectURL(x.url); }catch(_){} bt.files.splice(i,1); trBatchRender(); }
function trBatchSet(k, v){
  if(bt.busy) return;
  const B=st.bt, px=x=>Math.max(16, Math.min(MAX_OUT, Math.round(+x)||16));
  if(k==='mode') B.mode=v==='fit' ? 'fit' : 'long';
  else if(k==='L') B.L=px(v);
  else if(k==='W' || k==='H') B[k]=px(v);
  else if(k==='WH'){ const m=/^(\d+)x(\d+)$/.exec(v); if(m){ B.W=px(m[1]); B.H=px(m[2]); } }
  else if(k==='q') st.q=Math.max(30, Math.min(100, Math.round(+v)||85));
  else if(k==='kb'){ if(KBS.some(x=>x[0]===+v)) st.kb=+v; }
  else if(k==='fmt'){ if(['jpeg','png'].includes(v) || v==='webp' && webpOk) st.fmt=v; }
  else return;
  trSaveSt(); trBatchRender();
}
function trBatchAdj(k, v){
  if(k==='auto'){ bt.auto=!!v; trBatchRender(); return; }
  if(!['b','c'].includes(k)) return;
  bt[k]=Math.max(-50, Math.min(50, Math.round(+v)||0));
  const e=$(k==='b' ? 'trBtBv' : 'trBtCv'); if(e) e.textContent=fmtAdj(bt[k]);
  trBatchPrev();
}
function trBatchRender(){
  const b=$('trBtBody'); if(!b) return;
  const B=st.bt, n=bt.files.length, top=b.scrollTop, off=n && !bt.busy ? '' : ' disabled';
  const fmts=[['jpeg','JPEG'],['png','PNG']].concat(webpOk?[['webp','WebP']]:[]);
  b.innerHTML=`<div class="tr-btpics">${bt.files.map((x,i)=>`<div class="tr-btp"><img src="${x.url}" alt=""><i>${i+1}</i><button type="button" onclick="trBatchDel(${i})" aria-label="${i+1}枚目を 外す">✕</button></div>`).join('')}
      ${n<BT_MAX?`<button type="button" class="tr-btadd" onclick="document.getElementById('trBtIn').click()">＋<small>${n?'足す':'写真を えらぶ'}</small></button>`:''}</div>
    <div class="tr-note">${n ? n+'枚（'+BT_MAX+'枚まで）。どれも 同じ ように 作ります。' : '何枚でも まとめて えらべます（'+BT_MAX+'枚まで）。'}</div>
    <div class="tr-sec">そろえ方</div>
    <div class="tr-chips">${[['long','📏 長い辺を そろえる'],['fit','🔲 横×縦 ぴったり']].map(([k,l])=>`<button type="button" class="tr-chip${B.mode===k?' on':''}" onclick="trBatchSet('mode','${k}')">${l}</button>`).join('')}</div>
    ${B.mode==='long'
      ? `<div class="tr-chips" style="margin-top:8px">${BT_L.map(L=>`<button type="button" class="tr-chip${B.L===L?' on':''}" onclick="trBatchSet('L',${L})">${L}px</button>`).join('')}</div>
         <div class="tr-note">長い 辺を ${B.L}px に します（それより 小さい 写真は そのまま）。形は 写真の まま です。</div>`
      : `<div class="tr-wh">横<input type="number" id="trBtW" min="16" max="${MAX_OUT}" inputmode="numeric" value="${B.W}" onchange="trBatchSet('W',this.value)">×縦<input type="number" id="trBtH" min="16" max="${MAX_OUT}" inputmode="numeric" value="${B.H}" onchange="trBatchSet('H',this.value)">px</div>
         <div class="tr-chips" style="margin-top:8px">${BT_FIT.map(([w,h])=>`<button type="button" class="tr-chip${B.W===w&&B.H===h?' on':''}" onclick="trBatchSet('WH','${w}x${h}')">${w}×${h}</button>`).join('')}</div>
         <div class="tr-note">どの 写真も ${B.W}×${B.H} に します（形が ちがう ところは 真ん中で 切ります。小さい 写真は 大きく なって ぼやける ことが あります）。</div>`}
    <div class="tr-sec">明るさ・コントラスト</div>
    <div class="tr-btadj">
      <label>☀ 明るさ<input type="range" min="-50" max="50" step="1" value="${bt.b}"${bt.auto?' disabled':''} oninput="trBatchAdj('b',this.value)" aria-label="明るさ"><b id="trBtBv">${fmtAdj(bt.b)}</b></label>
      <label>◐ コントラスト<input type="range" min="-50" max="50" step="1" value="${bt.c}"${bt.auto?' disabled':''} oninput="trBatchAdj('c',this.value)" aria-label="コントラスト"><b id="trBtCv">${fmtAdj(bt.c)}</b></label>
      <label class="ck"><input type="checkbox"${bt.auto?' checked':''} onchange="trBatchAdj('auto',this.checked)"> ✨ 1枚ずつ 自動で 整える</label></div>
    <div class="tr-sec">形式</div>
    <div class="tr-chips">${fmts.map(([k,l])=>`<button type="button" class="tr-chip${st.fmt===k?' on':''}" onclick="trBatchSet('fmt','${k}')">${l}</button>`).join('')}</div>
    ${st.fmt==='png' ? '' : `<div class="tr-sec">画質</div><div class="tr-q"><input type="range" min="30" max="100" step="1" value="${st.q}" onchange="trBatchSet('q',this.value)" aria-label="画質"><b>${st.q}</b></div>`}
    <div class="tr-sec">ファイルの大きさ</div>
    <div class="tr-chips">${KBS.map(([k,l])=>`<button type="button" class="tr-chip${st.kb===k?' on':''}" onclick="trBatchSet('kb',${k})">${l}</button>`).join('')}</div>
    <canvas class="tr-prev" id="trBtPrev" style="margin-top:12px"${n?'':' hidden'}></canvas>
    <div class="tr-est" id="trBtEst">${n ? '1枚目で 見本を 作っています…' : '写真を えらぶと、ここに 1枚目の できあがりが 出ます'}</div>
    <button type="button" class="tr-btn" onclick="trBatchRun('share')"${off}>📤 まとめて 送る・写真に 保存</button>
    <button type="button" class="tr-btn sub" onclick="trBatchRun('zip')"${off}>🗜 ZIP に まとめて 保存</button>
    <button type="button" class="tr-btn sub" onclick="trBatchRun('each')"${off}>💾 1枚ずつ 保存</button>
    <div class="tr-note">写真は この 端末の 中で 作る だけです。iPhone は「📤」→「画像を保存」で 写真アプリに 入ります。</div>`;
  b.scrollTop=top;
  if(n) trBatchPrev();
}
// 1枚 作る（そろえ方・明るさ・形式・画質・KB）
async function btOne(x){
  const {c}=await loadCanvas(x.f), B=st.bt, W0=c.width, H0=c.height;
  let sx=0, sy=0, sw=W0, sh=H0, w, h;
  if(B.mode==='fit'){ const r=B.W/B.H; if(W0/H0>r){ sw=H0*r; sx=(W0-sw)/2; } else { sh=W0/r; sy=(H0-sh)/2; } w=B.W; h=B.H; }
  else { const k=Math.min(1, B.L/Math.max(W0,H0)); w=Math.max(1,Math.round(W0*k)); h=Math.max(1,Math.round(H0*k)); }
  const a=bt.auto ? autoAdj(c, sx, sy, sw, sh) : {b:bt.b, c:bt.c};
  const r=await blobFit((ww,hh)=>stepDraw(c, sx, sy, sw, sh, ww, hh, st.fmt, a), w, h, st.fmt, st.q, st.kb);
  r.a=a; return r;
}
function trBatchPrev(){
  clearTimeout(btPrevT); const my=++btPrevSeq;
  btPrevT=setTimeout(async ()=>{
    const x=bt.files[0], e=$('trBtEst'), p=$('trBtPrev'); if(!x || !e || !p || bt.busy) return;
    let r=null; try{ r=await btOne(x); }catch(_){ r=null; }
    if(my!==btPrevSeq || !$('trBtPrev')) return;
    if(!r || !r.blob){ e.textContent='1枚目を 読めませんでした'; return; }
    try{ const bm=await createImageBitmap(r.blob), k=Math.min(1, 600/Math.max(bm.width,bm.height)); p.width=Math.max(1,Math.round(bm.width*k)); p.height=Math.max(1,Math.round(bm.height*k)); p.getContext('2d').drawImage(bm,0,0,p.width,p.height); if(bm.close) bm.close(); }catch(_){}
    e.innerHTML=`1枚目の できあがり：<b>${r.w} × ${r.h}</b>　<b>${fmtKB(r.blob.size)}</b>`
      +(bt.auto ? `<small>✨ 明るさ ${fmtAdj(r.a.b)}・コントラスト ${fmtAdj(r.a.c)}（1枚ずつ ちがいます）</small>` : '')
      +(r.shrunk ? `<small>${st.kb}KB に 収めるため、大きさも 小さく しました</small>` : '')
      +(st.kb && r.blob.size>st.kb*1024 ? `<small>この 形式では ${st.kb}KB に 収まりませんでした（JPEG に すると 小さく なります）</small>` : '');
  }, 300);
}
// 写真を まとめた ZIP（ちぢめない。名前は UTF-8）
async function zipStore(outs){
  const enc=new TextEncoder(), parts=[], cen=[]; let off=0;
  const u16=n=>[n&255,(n>>>8)&255], u32=n=>{ n>>>=0; return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]; };
  for(const o of outs){
    const nm=enc.encode(o.name), d=new Uint8Array(await o.blob.arrayBuffer()), c=xlsxCrc32(d);
    const lh=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0)]);
    parts.push(lh, nm, d); cen.push({nm, c, n:d.length, off}); off+=lh.length+nm.length+d.length;
  }
  const cd=[]; let cs=0;
  for(const e of cen){ const h=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(e.c),...u32(e.n),...u32(e.n),...u16(e.nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(e.off)]); cd.push(h, e.nm); cs+=h.length+e.nm.length; }
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(cen.length),...u16(cen.length),...u32(cs),...u32(off),...u16(0)]);
  return new Blob([...parts, ...cd, end], {type:'application/zip'});
}
function btDl(blob, name){ const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:name}); document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
async function trBatchRun(how){
  if(bt.busy || !bt.files.length) return;
  bt.busy=true; trBatchRender();
  const outs=[], used=new Set(), N=bt.files.length;
  try{
    for(let i=0;i<N;i++){
      const e=$('trBtEst'); if(e) e.innerHTML=`作っています… <b>${i+1} / ${N}</b>`;
      let r=null; try{ r=await btOne(bt.files[i]); }catch(_){ r=null; }
      if(!r || !r.blob) continue;
      const base=bt.files[i].name; let nm=`${base}_${r.w}x${r.h}.${btExt()}`, k=2;
      while(used.has(nm)) nm=`${base}_${k++}_${r.w}x${r.h}.${btExt()}`;
      used.add(nm); outs.push({name:nm, blob:r.blob, w:r.w, h:r.h});
      await new Promise(res=>setTimeout(res, 0));   // 画面を 止めない
    }
  } finally { bt.busy=false; }
  trBatchRender();
  btLast=outs.map(o=>({name:o.name, w:o.w, h:o.h, size:o.blob.size, type:o.blob.type})); btZip=null;
  const e=$('trBtEst');
  if(!outs.length){ toast('作れませんでした'); return; }
  const total=outs.reduce((s,o)=>s+o.blob.size, 0);
  if(e) e.innerHTML=`できました：<b>${outs.length}枚</b>・ぜんぶで <b>${fmtKB(total)}</b>`+(outs.length<N ? `<small>読めなかった 写真が ${N-outs.length}枚 ありました</small>` : '');
  if(how==='share'){
    const files=outs.map(o=>new File([o.blob], o.name, {type:o.blob.type}));
    try{ if(navigator.canShare && navigator.canShare({files})){ await navigator.share({files}); return; } }catch(err){ if(err && err.name==='AbortError') return; }
    toast('この 端末では まとめて 送れないので、ZIP で 保存します', 3500); how='zip';
  }
  if(how==='zip'){
    const d=new Date(), p=n=>String(n).padStart(2,'0');
    btZip=await zipStore(outs); btDl(btZip, `写真_${outs.length}枚_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}.zip`);
    toast(`🗜 ${outs.length}枚を ZIP に しました（${fmtKB(btZip.size)}）`); return;
  }
  for(const o of outs){ btDl(o.blob, o.name); await new Promise(res=>setTimeout(res, 350)); }
  toast(`💾 ${outs.length}枚 保存しました`);
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
  trSetAng, trNudge, trLineMode, trLineApply, trSetLine:(a,b)=>{ lineP=[a,b]; trDrawLine(); },
  trSetSize, trSetWH, trSetLock, trSetFmt, trSetQ, trSetKB, trSave, trShare, trMakeBlob, trSetCrop, trDragTo,
  trAdjShow, trSetAdj, trAdjAuto, trAdjReset, trAdjState:()=>({...adj}), trBatchOpen, trBatchClose, trBatchAdd, trBatchDel, trBatchSet, trBatchAdj, trBatchRun,
  trBatchState:()=>({n:bt.files.length, b:bt.b, c:bt.c, auto:bt.auto, busy:bt.busy, bt:{...st.bt}, fmt:st.fmt, q:st.q, kb:st.kb, last:btLast}), trBatchZip:()=>btZip, trAdjPixels:adjPixels, trAutoAdj:autoAdj,
  trState:()=>({st, ang, lineMode, crop:crop&&{...crop}, src:src&&{w:src.width,h:src.height}, outW, outH, disp:{...disp}, last:lastOut&&{w:lastOut.w,h:lastOut.h,size:lastOut.blob.size}}) });
})();
