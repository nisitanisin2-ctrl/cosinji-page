/* 📢 電光掲示板（v569。表電卓の道具。はじめて開いたときに読む。apps/keijiban/ から単独のアプリとしても開ける）
   ・📝 文字：打った文字を 大きく流す。見た目は LED風（点で光る文字）／ふつうの文字。
     色（赤・緑・黄・白・青・虹）・動き（← 流す・止める・点滅）・速さ・点の細かさ（16・24・32 点）。⭐ よく使う文。
   ・🕐 時計（v570）：時:分／時:分:秒／午前・午後。数字の形（7セグ・ドット・まるい）・色（虹・時間で かわる も）・
     数字が かわるときの動き（くるっ・ぽろぽろ・ばらばら・ぱたぱた）・いつもの動き（なみ・ぴょん・ふわっ）・
     かざり（「:」の点滅・秒の光・星空・正時の花火・日付も ときどき）・点の細かさ。
   ・⏰ 予約（v570）：決めた時刻（曜日も）になったら 決めた文を 流す（1回・3回・1〜10分・押すまで）。🔔 チャイム。
     電光掲示板を 出している あいだだけ 流れる（全画面のあいだは 画面を消さない）。
   ・「▶ 全画面で 出す」：画面いっぱいに出す。縦に持っているときは 90° 回して 横長に出す（「回さない」も）。
     画面を消さない（対応している端末）・Android は 全画面＋横向きに。画面を押すと「⏸ 止める」「✕ 終わる」。端末の「戻る」でも 終わる。
   ・文・見た目・時計・予約は excalc_keijiban（この端末の中だけ）。
   LED風は 文字を 小さな絵にして（canvas）、明るい点を 丸い光で描く。点は 1列ずつ 動く（本物の掲示板と同じ）。
   時計の数字は 点の並び（7セグ・5×7 の点の字・ふつうの字）で作り、かわるときは 点を 1つずつ 動かす。 */
(function(){
'use strict';
const KEY='excalc_keijiban', MAX_TXT=200, MAX_LIST=30, MAX_SC=20;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=(v,n)=>String(v==null?'':v).replace(/[\r\n\t]+/g,'　').replace(/[\u0000-\u001F\u007F]/g,'').slice(0,n);
const toastK=m=>{ if(typeof toast==='function') toast(m, 3000); };
const p2=n=>String(n).padStart(2,'0');
const DEF_LIST=['受付は こちらです','少々 お待ちください','ただいま 準備中です','営業中','本日は ありがとうございました','休憩中','足もとに ご注意ください','バック オーライ','ストップ！','入口は こちら →','← 出口','がんばれ！'];
const LOOKS=[['led','LED風（点）'],['plain','ふつうの文字']];
const COLS=[['red','赤','#ff3b30'],['green','緑','#2bff6e'],['yellow','黄','#ffd60a'],['white','白','#f4f4f4'],['blue','青','#3aa0ff'],['rainbow','虹','']];
const MOVES=[['scroll','← 流す'],['still','止める'],['blink','点滅']];
const SPEEDS=[['slow','ゆっくり',1.2],['mid','ふつう',2.2],['fast','はやい',3.6]];   // 1秒に 流れる 字の数（字の高さ ぶん）
const ROWS=[16,24,32];
const ROTS=[['auto','縦に持っていたら 回す'],['off','回さない']];
const FONT='"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif';
const TABS=[['text','📝 文字'],['clock','🕐 時計'],['sched','⏰ 予約']];
// 🕐 時計（v570）
const CK_FMT=[['hm','時:分'],['hms','時:分:秒'],['ampm','午前・午後']];
const CK_FACE=[['seg','7セグ'],['dot','ドット'],['round','まるい']];
const CK_COL=COLS.concat([['time','時間で かわる','']]);
const CK_ANIM=[['none','なし'],['roll','くるっ'],['drop','ぽろぽろ'],['scatter','ばらばら'],['flip','ぱたぱた'],['mix','いろいろ']];
const MIX=['roll','drop','scatter','flip'];   // いろいろ：毎回 この中から えらぶ
const CK_IDLE=[['none','なし'],['wave','なみ'],['hop','ぴょん'],['glow','ふわっ']];
const CK_DENS=[[1,'あらい'],[2,'ふつう'],[3,'こまかい']];
const CK_DECO=[['colon','「:」の点滅'],['ring','秒の光'],['stars','星空'],['fire','正時の花火'],['date','日付も']];
const DEF_CK={fmt:'hms', face:'seg', color:'red', anim:'drop', idle:'none', dens:2, colon:true, ring:true, stars:false, fire:true, date:false};
const TR_DUR={none:1, roll:380, flip:420, drop:850, scatter:950};   // 数字が かわるときの 長さ（ミリ秒）
// ⏰ 予約（v570）
const SC_DUR=[['1','1回'],['3','3回'],['1m','1分'],['5m','5分'],['10m','10分'],['tap','押すまで']];
const WD='日月火水木金土';
const TP_M=[0,5,10,15,20,25,30,35,40,45,50,55];

/* ───────── 状態 ───────── */
let st=null, tab='text', raf=0, t0=0, paused=false, pauseAt=0, fullRel=null, wl=null, barT=0, prevKey='', ckPrevKey='', frozen=false;
const newId=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
// 曜日の並び → 'all'（毎日）・'wk'（平日）・'we'（土日）に まとめる
function normDays(a){ const k=a.join(','); return !a.length || k==='0,1,2,3,4,5,6' ? 'all' : k==='1,2,3,4,5' ? 'wk' : k==='0,6' ? 'we' : a; }
const dayArr=d=>d==='all'?[0,1,2,3,4,5,6]:d==='wk'?[1,2,3,4,5]:d==='we'?[0,6]:d.slice();
const dayOk=(s,w)=>dayArr(s.days).includes(w);
const daysTxt=d=>d==='all'?'毎日':d==='wk'?'平日':d==='we'?'土日':d.map(i=>WD[i]).join('・');
function cleanSc(s){
  if(!s || typeof s!=='object') return null;
  const t=typeof s.t==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.t) ? s.t : null, text=clean(s.text, MAX_TXT).trim();
  if(!t || !text) return null;
  let days=['all','wk','we'].includes(s.days) ? s.days : Array.isArray(s.days) ? [...new Set(s.days.filter(d=>Number.isInteger(d) && d>=0 && d<=6))].sort((a,b)=>a-b) : 'all';
  if(Array.isArray(days)) days=normDays(days);
  return {id:typeof s.id==='string' && /^[A-Za-z0-9_-]{1,24}$/.test(s.id) ? s.id : newId(), on:s.on!==false, t, days, text, dur:SC_DUR.some(x=>x[0]===s.dur)?s.dur:'3', chime:s.chime!==false};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const ck=(o.ck && typeof o.ck==='object') ? o.ck : {}, one=(arr,v,d)=>arr.some(x=>x[0]===v)?v:d;
  st={text:typeof o.text==='string' ? clean(o.text, MAX_TXT) : '受付は こちらです',
    look:LOOKS.some(x=>x[0]===o.look)?o.look:'led', color:COLS.some(x=>x[0]===o.color)?o.color:'red',
    move:MOVES.some(x=>x[0]===o.move)?o.move:'scroll', speed:SPEEDS.some(x=>x[0]===o.speed)?o.speed:'mid',
    rows:ROWS.includes(o.rows)?o.rows:24, rot:ROTS.some(x=>x[0]===o.rot)?o.rot:'auto',
    list:Array.isArray(o.list) ? o.list.map(x=>clean(x, MAX_TXT).trim()).filter(Boolean).slice(0,MAX_LIST) : DEF_LIST.slice(),
    mode:o.mode==='clock'?'clock':'text',
    ck:{fmt:one(CK_FMT,ck.fmt,DEF_CK.fmt), face:one(CK_FACE,ck.face,DEF_CK.face), color:one(CK_COL,ck.color,DEF_CK.color),
      anim:one(CK_ANIM,ck.anim,DEF_CK.anim), idle:one(CK_IDLE,ck.idle,DEF_CK.idle), dens:one(CK_DENS,ck.dens,DEF_CK.dens),
      colon:ck.colon!==false, ring:ck.ring!==false, stars:ck.stars===true, fire:ck.fire!==false, date:ck.date===true},
    sched:Array.isArray(o.sched) ? o.sched.map(cleanSc).filter(Boolean).slice(0,MAX_SC) : []};
  const seen=new Set(); st.sched.forEach(s=>{ while(seen.has(s.id)) s.id=newId(); seen.add(s.id); });
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }

/* ───────── 文字の点の表（LED風）───────── */
const bms=new Map();
function bitmapOf(text, R){
  const txt=text.trim() ? text : ' ', k=R+'|'+txt;
  if(bms.has(k)) return bms.get(k);
  const c=document.createElement('canvas'), g=c.getContext('2d'), font='bold '+Math.round(R*0.9)+'px '+FONT;
  g.font=font; const w=Math.max(1, Math.ceil(g.measureText(txt).width)+1);
  c.width=w; c.height=R;
  g.font=font; g.textBaseline='middle'; g.fillStyle='#fff'; g.fillText(txt, 0, R/2+R*0.03);
  const d=g.getImageData(0,0,w,R).data, lit=new Uint8Array(w*R);
  let n=0; for(let i=0;i<w*R;i++){ if(d[i*4+3]>110){ lit[i]=1; n++; } }
  const b={w, h:R, lit, n}; if(bms.size>30) bms.clear(); bms.set(k,b); return b;
}
const bitmap=()=>bitmapOf(st.text, st.rows);
// 光る点の絵（色ごと・点の大きさごとに 1つ作って 使いまわす）
const sprites=new Map();
function sprite(color, pitch){
  const k=color+'|'+pitch; if(sprites.has(k)) return sprites.get(k);
  const s=Math.max(2, Math.round(pitch)), c=document.createElement('canvas'); c.width=c.height=s;
  const g=c.getContext('2d'), r=s*0.43, gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,r);
  gr.addColorStop(0,'#fff'); gr.addColorStop(0.35,color); gr.addColorStop(1,color);
  g.fillStyle=gr; g.beginPath(); g.arc(s/2,s/2,r,0,Math.PI*2); g.fill();
  if(sprites.size>120) sprites.clear();
  sprites.set(k,c); return c;
}
const hue=(i)=>'hsl('+((((i%24)+24)%24)*15)+',100%,58%)';
const colorOf=c=>(COLS.find(x=>x[0]===c)||COLS[0])[2] || '#f4f4f4';
const baseColor=()=>colorOf(st.color);
// 暗い点（消えている点）を ならべた 下地（大きさが かわったときだけ 作る）。col：点の色（'' は 白っぽく）
const grids=new Map();
function grid(W, H, pitch, C, R, col){
  const k=[W,H,R,col].join('|'); if(grids.has(k)) return grids.get(k);
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  g.fillStyle='#050505'; g.fillRect(0,0,W,H);
  g.fillStyle=col || 'rgba(255,255,255,.07)'; g.globalAlpha=col ? 0.11 : 1;
  const r=pitch*0.38, oy=(H-pitch*R)/2;
  for(let y=0;y<R;y++) for(let x=0;x<C;x++){ g.beginPath(); g.arc(x*pitch+pitch/2, oy+y*pitch+pitch/2, r, 0, Math.PI*2); g.fill(); }
  if(grids.size>6) grids.clear();
  grids.set(k,c); return c;
}

/* ───────── 文字を流す（t 秒のとき）───────── */
const charsPerSec=()=>(SPEEDS.find(x=>x[0]===st.speed)||SPEEDS[1])[2];
// LED風：画面の列 C に対して 文字の左はしが 何列目か（x0）と、点いているか（on）
function posFor(t, C, b, move){
  const fits=b.w<=C;
  let x0;
  if(move==='scroll' || !fits){ const sp=charsPerSec()*st.rows, L=b.w+C; x0=C-Math.floor((t*sp)%L); }
  else x0=Math.floor((C-b.w)/2);
  const on=move!=='blink' || Math.floor(t*2)%2===0;
  return {x0, on, w:b.w, fits};
}
const ledPos=(t, C)=>posFor(t, C, bitmap(), st.move);
let textPass=0;   // 流しおえた回数（予約の文を 何回 流したか）
function drawText(cv, t, text, move){
  const W=cv.width, H=cv.height; if(!W || !H) return 0;
  const g=cv.getContext('2d');
  g.globalAlpha=1;
  if(st.look==='led'){
    const R=st.rows, pitch=H/R, C=Math.ceil(W/pitch), b=bitmapOf(text, R), p=posFor(t, C, b, move);
    textPass=Math.floor(t*charsPerSec()*R/(b.w+C));
    const key=[W,H,R,st.color,text,p.x0,p.on,st.color==='rainbow'?Math.floor(t*8):0].join('|');
    if(key===prevKey && cv.__drawn) return cv.__lit||0;
    prevKey=key; cv.__drawn=true;
    g.drawImage(grid(W,H,pitch,C,R, st.color==='rainbow'?'':baseColor()), 0, 0);
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
  const txt=text.trim() ? text : '', fs=Math.round(H*0.74);
  g.font='bold '+fs+'px '+FONT; g.textBaseline='middle';
  const tw=g.measureText(txt).width, fits=tw<=W*0.96;
  let x;
  if(move==='scroll' || !fits){ const sp=charsPerSec()*fs, L=tw+W; x=W-((t*sp)%L); textPass=Math.floor(t*sp/L); }
  else { x=(W-tw)/2; textPass=Math.floor(t/4); }
  const on=move!=='blink' || Math.floor(t*2)%2===0;
  if(!on || !txt) return 0;
  if(st.color==='rainbow'){ const gr=g.createLinearGradient(x,0,x+tw,0); for(let i=0;i<=6;i++) gr.addColorStop(i/6, 'hsl('+((i*60+t*90)%360)+',100%,60%)'); g.fillStyle=gr; }
  else g.fillStyle=baseColor();
  g.shadowColor=g.fillStyle===baseColor() ? baseColor() : '#fff'; g.shadowBlur=Math.round(fs*0.12);
  g.fillText(txt, x, H/2+fs*0.03); g.shadowBlur=0;
  return 1;
}
const draw=(cv, t)=>drawText(cv, t, st.text, st.move);

/* ───────── 🕐 時計の 数字（点の並び）───────── */
// 5×7 の 点の字（電光掲示板らしい 角ばった字）
const F57={
  '0':['01110','10001','10011','10101','11001','10001','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11111','00010','00100','00010','00001','10001','01110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','11110','00001','00001','10001','01110'],
  '6':['00110','01000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00010','01100'],
  ':':['00','11','11','00','11','11','00'], ' ':['00000','00000','00000','00000','00000','00000','00000'],
  'A':['01110','10001','10001','11111','10001','10001','10001'], 'P':['11110','10001','10001','11110','10000','10000','10000'],
  'M':['10001','11011','10101','10101','10001','10001','10001']};
// 7セグ：どの線が点くか（a 上・b 右上・c 右下・d 下・e 左下・f 左上・g まん中）
const SEG={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg',' ':''};
const mk=(w,h)=>({w, h, m:new Uint8Array(Math.max(1,w*h))});   // m：0 消えている・1 点いている・2 うすく（7セグの消えている線）
function glyphDot(s, k){
  const gs=[...s].map(c=>F57[c]||F57[' ']), fw=gs.reduce((a,g)=>a+g[0].length,0)+Math.max(0,gs.length-1), M=mk(fw*k, 7*k);
  let ox=0;
  for(const g of gs){ for(let r=0;r<7;r++) for(let c=0;c<g[0].length;c++) if(g[r][c]==='1') for(let y=0;y<k;y++) for(let x=0;x<k;x++) M.m[(r*k+y)*M.w+(ox+c)*k+x]=1; ox+=g[0].length+1; }
  return M;
}
const segW=h=>Math.max(3,Math.round(h*0.56)), segT=h=>Math.max(1,Math.round(h/8)), segCW=h=>Math.max(2,Math.round(h*0.2));
function glyphSeg(ch, h){
  if(ch===':'){
    const w=segCW(h), M=mk(w,h), s=Math.max(1,Math.min(w,segT(h)+1)), x0=Math.floor((w-s)/2);
    for(const cy of [Math.round(h*0.3), Math.round(h*0.7)]) for(let y=cy-Math.floor(s/2);y<cy-Math.floor(s/2)+s;y++) for(let x=x0;x<x0+s;x++) if(y>=0 && y<h) M.m[y*w+x]=1;
    return M;
  }
  const w=segW(h), t=segT(h), M=mk(w,h), mid=Math.round((h-t)/2), on=SEG[ch]||'';
  const R={a:[t,0,w-t,t], b:[w-t,t,w,mid], c:[w-t,mid+t,w,h-t], d:[t,h-t,w-t,h], e:[0,mid+t,t,h-t], f:[0,t,t,mid], g:[t,mid,w-t,mid+t]};
  for(const s in R){ const [x0,y0,x1,y1]=R[s], v=on.includes(s)?1:2; for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) if(M.m[y*w+x]!==1) M.m[y*w+x]=v; }
  return M;
}
// まるい（ふつうの字の）数字：数字の高さが h 点になる 字の大きさ・1字の幅
const rfCache=new Map();
function roundFont(h){
  if(rfCache.has(h)) return rfCache.get(h);
  const g=document.createElement('canvas').getContext('2d'); g.font='bold 100px '+FONT;
  let asc=0, des=0, wmax=0;
  for(const d of '0123456789'){ const m=g.measureText(d); asc=Math.max(asc, m.actualBoundingBoxAscent||72); des=Math.max(des, m.actualBoundingBoxDescent||0); wmax=Math.max(wmax, m.width); }
  const fs=100*h/Math.max(1,asc+des), r={fs, asc:asc*fs/100, dw:Math.max(2,Math.ceil(wmax*fs/100)), cw:Math.max(2,Math.ceil(g.measureText(':').width*fs/100))};
  rfCache.set(h,r); return r;
}
function maskFrom(c, w, h){ const M=mk(w,h), d=c.getContext('2d').getImageData(0,0,w,h).data; for(let i=0;i<w*h;i++) if(d[i*4+3]>110) M.m[i]=1; return M; }
function glyphRound(ch, h){
  const f=roundFont(h), w=ch===':'?f.cw:f.dw;
  if(ch===' ') return mk(w,h);
  const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
  g.font='bold '+f.fs+'px '+FONT; g.textBaseline='alphabetic'; g.textAlign='center'; g.fillStyle='#fff'; g.fillText(ch, w/2, f.asc);
  return maskFrom(c, w, h);
}
// 日付・午前午後（文字の高さを h 点に そろえる）
function glyphText(txt, h){
  const c=document.createElement('canvas'), g=c.getContext('2d'); g.font='bold 100px '+FONT;
  const m=g.measureText(txt), asc=m.actualBoundingBoxAscent||80, des=m.actualBoundingBoxDescent||12, fs=100*h/Math.max(1,asc+des);
  g.font='bold '+fs+'px '+FONT; const w=Math.max(1, Math.ceil(g.measureText(txt).width));
  c.width=w; c.height=h; g.font='bold '+fs+'px '+FONT; g.textBaseline='alphabetic'; g.fillStyle='#fff'; g.fillText(txt, 0, asc*fs/100);
  return maskFrom(c, w, h);
}
const glyphs=new Map();
function glyph(kind, ch, h){
  const f=st.ck.face, k=[f,kind,ch,h].join('|'); if(glyphs.has(k)) return glyphs.get(k);
  let M;
  if(kind==='L') M=f==='round' ? glyphText(ch==='AM'?'午前':'午後', Math.max(8,Math.round(h*0.55))) : glyphDot(ch, Math.max(1,Math.floor(h*0.55/7)));
  else if(f==='dot') M=glyphDot(ch, Math.max(1,Math.round(h/7)));
  else if(f==='seg') M=glyphSeg(ch, h);
  else M=glyphRound(ch, h);
  if(glyphs.size>400) glyphs.clear();
  glyphs.set(k,M); return M;
}
const pts=M=>M.pts||(M.pts=(()=>{ const a=[]; for(let y=0;y<M.h;y++) for(let x=0;x<M.w;x++) if(M.m[y*M.w+x]===1) a.push([x,y]); return a; })());
const ghostPts=M=>M.gp||(M.gp=(()=>{ const a=[]; for(let y=0;y<M.h;y++) for(let x=0;x<M.w;x++) if(M.m[y*M.w+x]) a.push([x,y]); return a; })());

/* ───────── 🕐 時計の 並び ───────── */
// [種類, 字]：d 数字・c 「:」・L 午前／午後
function ckChars(d){
  const H=d.getHours(), M=p2(d.getMinutes()), S=p2(d.getSeconds()), f=st.ck.fmt;
  if(f==='ampm'){ const h=H%12||12; return [['L',H<12?'AM':'PM'],['d',h<10?' ':'1'],['d',String(h%10)],['c',':'],['d',M[0]],['d',M[1]]]; }
  const a=[['d',p2(H)[0]],['d',p2(H)[1]],['c',':'],['d',M[0]],['d',M[1]]];
  if(f==='hms') a.push(['c',':'],['d',S[0]],['d',S[1]]);
  return a;
}
const ckStr=d=>ckChars(d).map(([k,ch])=>k==='L'?(ch==='AM'?'午前 ':'午後 '):ch).join('').replace(/^(午[前後] ) /,'$1');
// 点の数（画面の縦横）と 数字の大きさ・置き場所。数字が 横いっぱい（または 縦いっぱい）に なるように 点の数を決める
let geo=null, cst=[], stars=[];
function ckGeom(W, H){
  const c=st.ck, key=[W,H,c.fmt,c.face,c.dens,c.ring,c.idle].join('|');
  if(geo && geo.key===key) return geo;
  const m=c.ring?2:1, ex=(c.idle==='wave'||c.idle==='hop')?1:0, h=c.face==='dot' ? 7*c.dens : [0,11,16,22][c.dens];
  const kinds=ckChars(new Date(2000,0,1,10,0,0)).map(x=>x[0]);
  const gap=c.face==='dot' ? c.dens : Math.max(1, Math.round(h*(c.face==='seg'?0.14:0.08)));
  const wOf=k=>k==='d' ? glyph('d','8',h).w : k==='c' ? glyph('c',':',h).w : Math.max(glyph('L','AM',h).w, glyph('L','PM',h).w);
  const ws=kinds.map(wOf), tw=ws.reduce((a,b)=>a+b,0)+gap*(kinds.length-1)+(kinds[0]==='L'?gap:0);
  const R=Math.max(Math.ceil((tw+2*m+2)/(W/H)), h+2*m+2*ex+2, 8), pitch=H/R, C=Math.ceil(W/pitch);
  const x0=Math.floor((C-tw)/2), y0=Math.floor((R-h)/2);
  let x=x0; const cells=kinds.map((k,i)=>{ const o={kind:k, x, w:ws[i]}; x+=ws[i]+gap+(k==='L'?gap:0); return o; });
  geo={key, R, C, pitch, oy:(H-pitch*R)/2, h, gap, cells, tw, x0, y0, m};
  cst=[]; stars=makeStars(geo);
  return geo;
}
function makeStars(G){
  const out=[], n=Math.round(G.C*G.R/55), bx0=G.x0-2, bx1=G.x0+G.tw+1, by0=G.y0-2, by1=G.y0+G.h+1;
  for(let tries=0; out.length<n && tries<n*30; tries++){
    const x=Math.floor(Math.random()*G.C), y=Math.floor(Math.random()*G.R);
    if(x>=bx0 && x<=bx1 && y>=by0 && y<=by1) continue;
    if(G.m===2 && (x===0 || y===0 || x===G.C-1 || y===G.R-1)) continue;
    out.push({x, y, r:0.7+Math.random()*1.3, p:Math.random()*6.3});
  }
  return out;
}
// 日付（ときどき出す）：画面に入る いちばん大きい字で
let dateCache={k:'', M:null};
function dateMask(d, G){
  const txt=(d.getMonth()+1)+'/'+d.getDate()+'('+WD[d.getDay()]+')', k=txt+'|'+G.C+'|'+G.R;
  if(dateCache.k===k) return dateCache.M;
  const aw=G.C-2*G.m-2, ah=G.R-2*G.m-2; let lo=6, hi=Math.max(6,ah), best=null;
  while(lo<=hi){ const mid=(lo+hi)>>1, M=glyphText(txt, mid); if(M.w<=aw){ best=M; lo=mid+1; } else hi=mid-1; }
  dateCache={k, M:best||glyphText(txt,6)}; return dateCache.M;
}
function ckColor(d){
  const c=st.ck.color;
  if(c==='time'){ const H=d.getHours(); return H>=5&&H<10 ? '#ffb74d' : H>=10&&H<16 ? '#ffe066' : H>=16&&H<19 ? '#ff7043' : '#64b5f6'; }   // 朝・昼・夕方・夜
  return colorOf(c==='rainbow'?'white':c);
}
// まわりの点（秒の光）：左上から 時計まわり
function perim(i, C, R){
  const L=2*(C+R)-4; i=((i%L)+L)%L;
  if(i<C) return [i,0]; i-=C;
  if(i<R-1) return [C-1,i+1]; i-=R-1;
  if(i<C-1) return [C-2-i,R-1]; i-=C-1;
  return [0,R-2-i];
}
const easeIO=p=>p<=0?0:p>=1?1:p<0.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
// 数字が かわるときの でたらめさ（はじめに 決めておく）
function trRnd(a, k, from, to, h){
  if(a==='drop'){
    return {A:pts(glyph(k,from,h)).map(([x,y])=>[x,y,Math.random()*0.18]),                       // 前の数字の点：少しずつ ずれて 落ちる
      B:pts(glyph(k,to,h)).map(([x,y])=>[x,y,0.16+(h-1-y)/h*0.3+Math.random()*0.05])};            // 新しい数字の点：下の段から 上から 落ちてきて 積もる
  }
  if(a==='scatter'){
    const A=shuffle(pts(glyph(k,from,h)).slice()), B=shuffle(pts(glyph(k,to,h)).slice()), n=Math.max(A.length,B.length), P=[];
    for(let i=0;i<n;i++) P.push({f:A.length?A[i%A.length]:[Math.random()*h*0.6, Math.random()*h], t:i<B.length?B[i]:null,
      cx:(Math.random()-0.5)*h*2.4, cy:(Math.random()-0.5)*h*1.8, dl:Math.random()*0.12});
    return {P};
  }
  return null;
}
// 数字が かわるとき（p：0→1）。put(x, y, 明るさ)
function animCell(s, X, Y, h, ms, put){
  const a=s.a, Mf=glyph(s.kind,s.prev,h), Mt=glyph(s.kind,s.ch,h), p=Math.min(1,(ms-s.t0)/TR_DUR[a]), tau=(ms-s.t0)/1000;
  if(a==='roll'){   // くるっ：上へ回って 下から次の数字（ローラー）
    const off=Math.round(easeIO(p)*(h+1));
    for(const [x,y] of pts(Mf)){ const yy=y-off; if(yy>=0) put(X+x, Y+yy, 1); }
    for(const [x,y] of pts(Mt)){ const yy=y+h+1-off; if(yy<h) put(X+x, Y+yy, 1); }
  } else if(a==='flip'){   // ぱたぱた：つぶれて 次の数字が ひらく
    const first=p<0.5, sc=first?1-2*p:2*p-1, M=first?Mf:Mt, cy=(h-1)/2;
    for(const [x,y] of pts(M)) put(X+x, Y+Math.round(cy+(y-cy)*sc), 0.45+0.55*sc);
  } else if(a==='drop' && s.rnd){   // ぽろぽろ：前の数字が こぼれ落ち、新しい数字の点が 上から 降って 積もる
    const gA=h*14, fallH=h+3, gB=2*fallH/(0.28*0.28);
    for(const [x,y,dl] of s.rnd.A){ const tt=tau-dl; put(X+x, Y+y+(tt>0?0.5*gA*tt*tt:0), 1); }
    for(const [x,y,s0] of s.rnd.B){ const tt=tau-s0; if(tt<0) continue; put(X+x, Y+Math.min(y, y-fallH+0.5*gB*tt*tt), 1); }
  } else if(a==='scatter' && s.rnd){   // ばらばら：点が 飛びちって 次の数字に 集まる
    for(const q of s.rnd.P){
      const e=easeIO(Math.max(0,Math.min(1,(tau-q.dl)/0.8))), tx=q.t?q.t[0]:q.f[0]+q.cx*1.6, ty=q.t?q.t[1]:q.f[1]+q.cy*1.6, mx=(q.f[0]+tx)/2+q.cx, my=(q.f[1]+ty)/2+q.cy;
      put(X+(1-e)*(1-e)*q.f[0]+2*(1-e)*e*mx+e*e*tx, Y+(1-e)*(1-e)*q.f[1]+2*(1-e)*e*my+e*e*ty, q.t?1:1-e);
    }
  } else for(const [x,y] of pts(Mt)) put(X+x, Y+y, 1);
}
/* 花火（正時）：ひとつの花火は 26粒。0.65秒ごとに 上がる */
let fw={until:0, next:0, parts:[]}, lastHourFire='';
function fwStart(ms, dur){ fw.until=Math.max(fw.until, ms+dur); if(fw.next<ms) fw.next=ms; }
function fwBurst(cx, cy, t0, R){
  fw.last=[cx, cy];
  const hu=Math.floor(Math.random()*24), n=26;
  for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+Math.random()*0.2, v=R*(0.42+Math.random()*0.3);
    fw.parts.push({x:cx, y:cy, vx:Math.cos(a)*v, vy:Math.sin(a)*v, g:R*0.6, t0, life:1.1+Math.random()*0.4, hu:hu+(i%3===0?2:0)}); }
  if(fw.parts.length>600) fw.parts.splice(0, fw.parts.length-600);
}
function fwStep(ms, C, R){
  while(fw.until>ms && fw.next<=ms){
    const cx=C*(0.15+Math.random()*0.7), cy=R*(0.12+Math.random()*0.33), up=420;
    fw.parts.push({rk:true, x:Math.round(cx), y0:R-1, y1:cy, t0:fw.next, life:up/1000});   // 下から 上がる
    fwBurst(cx, cy, fw.next+up, R);
    fw.next+=650;
  }
  if(fw.parts.length) fw.parts=fw.parts.filter(p=>ms-p.t0<p.life*1000);
}
let ckView='time', vTr=null, rec=null;
function ckUpdate(chars, ms, h){
  const a=st.ck.anim==='mix' ? MIX[Math.floor(Math.random()*MIX.length)] : st.ck.anim;
  chars.forEach(([k,ch],i)=>{
    const s=cst[i];
    if(!s || s.kind!==k){ cst[i]={kind:k, ch, prev:null, t0:0, a:'none', rnd:null}; return; }
    if(s.ch===ch) return;
    cst[i]=(a!=='none' && k==='d') ? {kind:k, ch, prev:s.ch, t0:ms, a, rnd:trRnd(a, k, s.ch, ch, h)} : {kind:k, ch, prev:null, t0:0, a:'none', rnd:null};
  });
  cst.length=chars.length;
}
function ckDraw(cv, ms){
  const W=cv.width, H=cv.height; if(!W || !H) return 0;
  const G=ckGeom(W,H), {R,C,pitch,oy,h}=G, d=new Date(ms), sec=d.getSeconds(), mil=d.getMilliseconds(), t=ms/1000, ck=st.ck;
  const chars=ckChars(d); ckUpdate(chars, ms, h);
  const view=ck.date && sec%20>=16 ? 'date' : 'time';   // 日付も：20秒ごとに 4秒 日付
  if(view!==ckView){ vTr={from:ckView, t0:ms}; ckView=view; }
  if(vTr && ms-vTr.t0>450) vTr=null;
  if(ck.fire && d.getMinutes()===0 && sec<3){ const hk=d.toDateString()+'|'+d.getHours(); if(lastHourFire!==hk){ lastHourFire=hk; fwStart(ms, 7000); } }
  fwStep(ms, C, R);
  const moving=cst.some(s=>s.prev!=null && ms-s.t0<TR_DUR[s.a]) || !!vTr || fw.parts.length>0 || fw.until>ms;
  const dyn=moving || ck.idle!=='none' || ck.stars || ck.color==='rainbow';
  const colonOn=!ck.colon || mil<500;
  const ringHead=ck.ring ? Math.floor(((sec+mil/1000)/60)*(2*(C+R)-4)) : -1;
  const key=[W,H,R,chars.map(x=>x[1]).join(''),colonOn,ringHead,view,ck.color==='time'?d.getHours():0].join('|');
  if(!dyn && !rec && key===ckPrevKey && cv.__drawn) return cv.__lit||0;
  ckPrevKey=key; cv.__drawn=true;
  const g=cv.getContext('2d'); g.globalAlpha=1;
  const col0=ckColor(d);
  g.drawImage(grid(W,H,pitch,C,R, ck.color==='rainbow' ? '' : col0), 0, 0);
  let n=0;
  const dot=(x,y,col,a)=>{
    x=Math.round(x); y=Math.round(y); if(x<0 || y<0 || x>=C || y>=R || a<=0.02) return;
    if(a<1) g.globalAlpha=a;
    g.drawImage(sprite(col,pitch), x*pitch, oy+y*pitch, pitch, pitch);
    if(a<1) g.globalAlpha=1;
    n++; if(rec) rec.push(x+','+y);
  };
  const colAt=x=>ck.color==='rainbow' ? hue(Math.floor(x/Math.max(2,h/3))+Math.floor(t*6)) : col0;
  // 星空
  if(ck.stars) for(const s of stars) dot(s.x, s.y, '#fff3c4', 0.1+0.9*Math.pow(Math.max(0,Math.sin(t*s.r+s.p)),8));
  // 花火（尾を引いて 広がる）
  for(const p of fw.parts){
    const age=(ms-p.t0)/1000; if(age<0 || age>p.life) continue;
    if(p.rk){ const e=age/p.life, y=p.y0+(p.y1-p.y0)*(1-(1-e)*(1-e)); for(let j=0;j<3;j++) dot(p.x, y+j*1.3, j?'#ffcf8a':'#fff', 1-j*0.3); continue; }
    for(let j=0;j<3;j++){ const a=age-j*0.05; if(a<0) break; dot(p.x+p.vx*a, p.y+p.vy*a+0.5*p.g*a*a, hue(p.hu), (1-age/p.life)*(1-j*0.33)); }
  }
  // いつもの動き
  const amp=Math.max(1,Math.round(h*0.1));
  const hopDy=ck.idle==='hop' && mil<350 ? -Math.round(Math.sin(mil/350*Math.PI)*amp*1.6) : 0;
  const glowA=ck.idle==='glow' ? 0.55+0.45*(0.5+0.5*Math.sin(t*2.2)) : 1;
  const dyAt=x=>ck.idle==='wave' ? Math.round(Math.sin(t*2.6-x*0.42)*amp) : hopDy;
  const paint=(v, vy)=>{
    if(v==='date'){
      const M=dateMask(d, G), X=Math.floor((C-M.w)/2), Y=Math.floor((R-M.h)/2)+vy;
      for(const [x,y] of pts(M)) dot(X+x, Y+y+dyAt(X+x), colAt(X+x), glowA);
      return;
    }
    chars.forEach(([k,ch],i)=>{
      const c=G.cells[i], s=cst[i]; if(!c) return;
      const M=glyph(k,ch,h), Y=G.y0+(k==='L'?Math.floor((h-M.h)/2):0)+vy;
      if(ck.face==='seg' && k==='d') for(const [x,y] of ghostPts(glyph('d','8',h))) dot(c.x+x, Y+y+dyAt(c.x+x), colAt(c.x+x), 0.13*glowA);   // 7セグの 消えている線
      if(k==='c' && !colonOn) return;
      const put=(x,y,a)=>dot(x, y+dyAt(Math.round(x)), colAt(Math.round(x)), a*glowA);
      if(s && s.prev!=null && ms-s.t0<TR_DUR[s.a]) animCell(s, c.x, Y, h, ms, put);
      else for(const [x,y] of pts(M)) put(c.x+x, Y+y, 1);
    });
  };
  if(vTr){ const off=Math.round(easeIO((ms-vTr.t0)/450)*R); paint(vTr.from, -off); paint(view, R-off); }
  else paint(view, 0);
  // 秒の光：1分で ひとまわり
  if(ck.ring) for(let j=0;j<10;j++){ const [x,y]=perim(ringHead-j, C, R); dot(x, y, ck.color==='rainbow'?hue(Math.floor((ringHead-j)/3)):col0, 1-j/10); }
  cv.__lit=n; return n;
}

/* ───────── ⏰ 予約 ───────── */
let ann=null, annQ=[], fired=new Set(), actx=null, chimes=0;
function audioUnlock(){ try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; if(!actx) actx=new AC(); if(actx.state==='suspended') actx.resume(); }catch(_){} }
// ピンポーン
function chime(){
  chimes++;
  try{
    audioUnlock(); if(!actx) return;
    const t=actx.currentTime+0.02;
    [[880,0,0.5],[660,0.45,1.0]].forEach(([f,a,len])=>{ const o=actx.createOscillator(), gn=actx.createGain(); o.type='sine'; o.frequency.value=f;
      gn.gain.setValueAtTime(0.0001,t+a); gn.gain.exponentialRampToValueAtTime(0.3,t+a+0.02); gn.gain.exponentialRampToValueAtTime(0.0001,t+a+len);
      o.connect(gn); gn.connect(actx.destination); o.start(t+a); o.stop(t+a+len+0.05); });
  }catch(_){}
}
const vib=()=>{ try{ if(navigator.vibrate) navigator.vibrate([180,90,180]); }catch(_){} };
function checkSched(ms){
  if(!st.sched.length) return;
  const d=new Date(ms), hhmm=p2(d.getHours())+':'+p2(d.getMinutes()), dk=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' '+hhmm, w=d.getDay();
  for(const s of st.sched){
    if(!s.on || s.t!==hhmm || !dayOk(s, w)) continue;
    const k=s.id+'@'+dk; if(fired.has(k)) continue;
    fired.add(k); if(fired.size>200) fired=new Set([k]);
    startAnn(s, ms);
  }
}
function startAnn(s, ms){
  if(ann){ if(annQ.length<10) annQ.push(s); return; }
  ann={id:s.id, t:s.t, text:s.text, dur:s.dur, t0:ms, tp:now()}; textPass=0; prevKey='';
  if(s.chime) chime();
  vib(); paintAnn();
}
function annEndCheck(ms){
  if(!ann) return;
  const d=ann.dur, end=(d==='1'||d==='3') ? textPass>=+d : d==='tap' ? ms-ann.t0>=3600000 : ms-ann.t0>=parseInt(d,10)*60000;
  if(end) endAnn();
}
function endAnn(){
  if(!ann) return;
  ann=null; prevKey=''; ckPrevKey='';
  if(annQ.length){ startAnn(annQ.shift(), Date.now()); return; }
  paintAnn();
}
function nextSched(ms){
  const now=new Date(ms); let best=null;
  for(const s of st.sched){
    if(!s.on) continue;
    const [hh,mm]=s.t.split(':').map(Number);
    for(let dd=0; dd<8; dd++){ const d=new Date(now.getFullYear(), now.getMonth(), now.getDate()+dd, hh, mm, 0, 0);
      if(d.getTime()>ms && dayOk(s, d.getDay())){ if(!best || d<best.d) best={s, d}; break; } }
  }
  return best;
}
function nextTxt(ms){
  const nx=nextSched(ms);
  if(!nx) return st.sched.length ? '予約は ぜんぶ 休みに なっています' : '予約は まだ ありません';
  const d=nx.d, now=new Date(ms), dd=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/864e5);
  return '⏰ 次は '+(dd===0?'今日':dd===1?'あした':(d.getMonth()+1)+'/'+d.getDate()+'('+WD[d.getDay()]+')')+' '+nx.s.t+'「'+nx.s.text+'」';
}
function paintAnn(){
  const b=$('kjAnn');
  if(b) b.innerHTML=ann ? `<div class="kj-ann" role="status">⏰ <b>${esc(ann.t)}</b>の予約「${esc(ann.text)}」を 流しています<button type="button" class="kj-b" onclick="KEIJIBAN.annEnd()">✓ 終える</button></div>` : '';
  const fb=$('kjAnnB'); if(fb) fb.hidden=!ann;
  const pb=$('kjPauseB'); if(pb) pb.hidden=!!ann;
}

/* ───────── うごかす ───────── */
const now=()=>performance.now()/1000;
const curT=()=>paused ? pauseAt : now()-t0;
function sizeCanvas(cv){
  const r=cv.getBoundingClientRect(), dpr=Math.min(2, window.devicePixelRatio||1);
  const w=Math.max(1, Math.round((cv.__w||r.width)*dpr)), h=Math.max(1, Math.round((cv.__h||r.height)*dpr));
  if(cv.width!==w || cv.height!==h){ cv.width=w; cv.height=h; cv.__drawn=false; }
}
const frameMode=()=>$('kjFull') ? st.mode : (tab==='text' ? 'text' : 'clock');
function frame(cv){
  const ms=Date.now();
  checkSched(ms);
  let n;
  if(ann){ n=drawText(cv, now()-ann.tp, ann.text, 'scroll'); ckPrevKey=''; annEndCheck(ms); }
  else if(frameMode()==='clock'){ n=ckDraw(cv, ms); prevKey=''; }
  else { n=drawText(cv, curT(), st.text, st.move); ckPrevKey=''; }
  return n;
}
function loop(){
  cancelAnimationFrame(raf);
  const step=()=>{
    raf=0;
    const full=$('kjFullCv'), cv=full || $('kjPrev');
    if(!cv || (!full && !isDlgOpen('keijibanOverlay')) || document.hidden){ return; }
    if(!frozen){ sizeCanvas(cv); frame(cv); }
    raf=requestAnimationFrame(step);
  };
  raf=requestAnimationFrame(step);
}
function restart(){ t0=now(); paused=false; prevKey=''; ckPrevKey=''; loop(); }

/* ───────── 全画面 ───────── */
async function startFull(mode){
  mode=mode==='clock' ? 'clock' : 'text';
  if(mode==='text' && !st.text.trim() && !ann){ toastK('流す文字を 入れてください'); const ta=$('kjText'); if(ta) ta.focus(); return; }
  if($('kjFull')) return;
  if(st.mode!==mode){ st.mode=mode; save(); }
  audioUnlock();   // チャイムを 鳴らせるように（ボタンを 押したときに）
  const el=document.createElement('div'); el.id='kjFull'; el.className='kj-full'+(mode==='clock'?' ck':''); el.setAttribute('role','dialog'); el.setAttribute('aria-label','電光掲示板');
  // ボタンも 文字といっしょに回す（縦に持って 横向きに出すとき）
  el.innerHTML=`<div class="kj-stage" id="kjStage"><canvas id="kjFullCv"></canvas>
    <div class="kj-fbar" id="kjFBar"><button type="button" id="kjPauseB" onclick="KEIJIBAN.pause()">⏸ 止める</button><button type="button" id="kjAnnB" onclick="KEIJIBAN.annEnd()" hidden>✓ 予約の文を 終える</button><button type="button" onclick="KEIJIBAN.stopFull()">✕ 終わる</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e=>{
    if(e.target.closest('.kj-fbar')) return;
    if(ann && ann.dur==='tap') endAnn();
    else if(st.mode==='clock' && !ann) tapFire(e.clientX, e.clientY);
    showBar();
  });
  fullRel=typeof modalBack==='function' ? modalBack(()=>stopFull(true)) : null;
  window.addEventListener('keydown', fullKey, true);
  window.addEventListener('resize', layoutFull);
  paintAnn();
  try{ if(document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen({navigationUI:'hide'}); }catch(_){}
  try{ if(screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); }catch(_){}
  await wake();
  layoutFull(); showBar(); restart();
}
// 時計を押したところに 花火（回しているときは 押した場所を 回しなおす）
function tapFire(x, y){
  const sg=$('kjStage'), cv=$('kjFullCv'); if(!sg || !cv || !geo || !cv.__w) return;
  const r=sg.getBoundingClientRect(), rot=sg.classList.contains('rot'), w=cv.__w, h=cv.__h, sx=x-(r.left+r.width/2), sy=y-(r.top+r.height/2);
  const u=rot ? w/2+sy : w/2+sx, v=rot ? h/2-sx : h/2+sy;
  fwBurst(u*cv.width/w/geo.pitch, (v*cv.height/h-geo.oy)/geo.pitch, Date.now(), geo.R);
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
  if($('kjFull') && st.mode==='clock' && !ann) return;   // 時計は 止めない
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
function go(i){ pick(i); startFull('text'); }
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

/* ───────── ⏰ 予約を 足す・直す（時刻は 時・分を押して えらぶ。打っても よい）───────── */
let pop=null, ed=null;
function popKey(e){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); popClose(); } }
function popOpen(html){
  popClose();
  const el=document.createElement('div'); el.className='kj-pop-bg';
  el.innerHTML=`<div class="kj-pop" role="dialog">${html}</div>`;
  el.addEventListener('mousedown', e=>{ if(e.target===el) popClose(); });
  $('keijibanOverlay').appendChild(el);
  window.addEventListener('keydown', popKey, true);
  pop={el, rel:typeof modalBack==='function' ? modalBack(()=>popClose(true)) : ()=>{}};
  return el;
}
function popClose(fromBack){ if(!pop) return; const p=pop; pop=null; window.removeEventListener('keydown', popKey, true); if(!fromBack) p.rel(); p.el.remove(); }
const toMin=s=>{ const m=/^(\d{1,2}):(\d{2})$/.exec(s||''); return m ? (+m[1])*60+(+m[2]) : 0; };
const hm=mins=>p2(Math.floor(mins/60))+':'+p2(mins%60);
// 「8:30」「830」「0830」「8時30分」「8時」「15」→ 0時からの分
function parseTime(s){
  const t=String(s==null?'':s).normalize('NFKC').replace(/\s+/g,'');
  let m=/^(\d{1,2})(?::|時)(\d{1,2})?分?$/.exec(t);
  if(m){ const h=+m[1], mi=m[2]?+m[2]:0; return h<24&&mi<60?h*60+mi:null; }
  if(/^\d{3,4}$/.test(t)){ const n=t.padStart(4,'0'), h=+n.slice(0,2), mi=+n.slice(2); return h<24&&mi<60?h*60+mi:null; }
  if(/^\d{1,2}$/.test(t)){ const h=+t; return h<24?h*60:null; }
  return null;
}
function scEdit(i){
  const s=i==null ? null : st.sched[i];
  if(i!=null && !s) return;
  if(!s && st.sched.length>=MAX_SC){ toastK('予約は '+MAX_SC+'まで です'); return; }
  const d=new Date(), def=p2((d.getHours()+1)%24)+':00';
  ed={i:s?i:null, mins:toMin(s?s.t:def), days:s?(Array.isArray(s.days)?s.days.slice():s.days):'all', dur:s?s.dur:'3'};
  const text=s ? s.text : (st.text.trim() || st.list[0] || '');
  const el=popOpen(`<b>⏰ ${s?'予約を 直す':'予約を 足す'}</b>
    <div class="kj-tp-big" id="kjTpBig"></div>
    <div class="kj-tp-l">時</div><div class="kj-tp-g h" id="kjTpH">${Array.from({length:24},(_,h)=>`<button type="button" data-h="${h}">${h}</button>`).join('')}</div>
    <div class="kj-tp-l">分</div><div class="kj-tp-g" id="kjTpM">${TP_M.map(m=>`<button type="button" data-m="${m}">${p2(m)}</button>`).join('')}</div>
    <div class="kj-tp-fine"><button type="button" data-d="-1">−1分</button><button type="button" data-d="1">＋1分</button><input id="kjTpIn" inputmode="numeric" autocomplete="off" placeholder="打つ：1230・12:30" aria-label="時刻を打って入れる"></div>
    <div class="kj-tp-l">曜日</div><div class="kj-days" id="kjScDays">${[['all','毎日'],['wk','平日'],['we','土日']].map(([k,n])=>`<button type="button" class="pre" data-dp="${k}">${n}</button>`).join('')}${[...WD].map((w,j)=>`<button type="button" class="wd" data-dy="${j}">${w}</button>`).join('')}</div>
    <div class="kj-tp-l">流す文</div><input id="kjScTx" class="kj-sc-in" maxlength="${MAX_TXT}" value="${esc(text)}" placeholder="例：お昼休みです">
    ${st.list.length?`<select id="kjScSel" class="kj-sc-sel" aria-label="よく使う文から えらぶ"><option value="">⭐ よく使う文から えらぶ</option>${st.list.map((t,j)=>`<option value="${j}">${esc(t)}</option>`).join('')}</select>`:''}
    <div class="kj-tp-l">流す長さ</div><div class="kj-days" id="kjScDur">${SC_DUR.map(([k,n])=>`<button type="button" data-du="${k}">${n}</button>`).join('')}</div>
    <label class="kj-chk"><input type="checkbox" id="kjScCh"${!s||s.chime?' checked':''}> 🔔 チャイムを 鳴らす</label>
    <div class="kj-pop-acts">${s?'<button type="button" class="kj-b del" data-x="del">🗑 消す</button>':''}<button type="button" class="kj-b" data-x="try">▶ ためす</button><button type="button" class="kj-b" data-x="cancel">やめる</button><button type="button" class="kj-b pri" data-x="ok">✓ 決める</button></div>`);
  const inp=$('kjTpIn');
  el.addEventListener('click', e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.h!=null){ ed.mins=(+b.dataset.h)*60+ed.mins%60; inp.value=''; }
    else if(b.dataset.m!=null){ ed.mins=Math.floor(ed.mins/60)*60+(+b.dataset.m); inp.value=''; }
    else if(b.dataset.d){ ed.mins=(ed.mins+(+b.dataset.d)+1440)%1440; inp.value=''; }
    else if(b.dataset.dp){ ed.days=b.dataset.dp; }
    else if(b.dataset.dy!=null){ const j=+b.dataset.dy, a=dayArr(ed.days); const k=a.indexOf(j); if(k>=0) a.splice(k,1); else a.push(j); a.sort((x,y)=>x-y); ed.days=a.length ? normDays(a) : []; }
    else if(b.dataset.du){ ed.dur=b.dataset.du; }
    else if(b.dataset.x==='ok'){ edSave(); return; }
    else if(b.dataset.x==='try'){ edTry(); return; }
    else if(b.dataset.x==='del'){ edDel(); return; }
    else if(b.dataset.x==='cancel'){ popClose(); return; }
    edPaint();
  });
  inp.addEventListener('input', ()=>{ const v=parseTime(inp.value); if(v!=null){ ed.mins=v; edPaint(); } });
  inp.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); edSave(); } });
  $('kjScTx').addEventListener('keydown', e=>e.stopPropagation());
  const sel=$('kjScSel'); if(sel) sel.addEventListener('change', ()=>{ const t=st.list[+sel.value]; if(t!=null) $('kjScTx').value=t; sel.value=''; });
  edPaint();
}
function edPaint(){
  if(!pop || !ed) return;
  const box=pop.el, a=Array.isArray(ed.days) ? ed.days : dayArr(ed.days);
  $('kjTpBig').textContent=hm(ed.mins);
  box.querySelectorAll('#kjTpH button').forEach(b=>b.classList.toggle('on', +b.dataset.h===Math.floor(ed.mins/60)));
  box.querySelectorAll('#kjTpM button').forEach(b=>b.classList.toggle('on', +b.dataset.m===ed.mins%60));
  box.querySelectorAll('#kjScDays .pre').forEach(b=>b.classList.toggle('on', ed.days===b.dataset.dp));
  box.querySelectorAll('#kjScDays .wd').forEach(b=>b.classList.toggle('on', a.includes(+b.dataset.dy)));
  box.querySelectorAll('#kjScDur button').forEach(b=>b.classList.toggle('on', ed.dur===b.dataset.du));
}
function edVals(){
  const inp=$('kjTpIn');
  if(inp && inp.value.trim()){ const v=parseTime(inp.value); if(v==null){ toastK('時刻の形が ちがいます（例：12:30・1230）'); return null; } ed.mins=v; }
  const text=clean($('kjScTx').value, MAX_TXT).trim();
  if(!text){ toastK('流す文を 入れてください'); return null; }
  return {t:hm(ed.mins), text, chime:$('kjScCh').checked};
}
function edSave(){
  const v=edVals(); if(!v) return;
  if(Array.isArray(ed.days) && !ed.days.length){ toastK('曜日を えらんでください'); return; }
  const o={id:ed.i!=null ? st.sched[ed.i].id : newId(), on:true, t:v.t, days:ed.days, text:v.text, dur:ed.dur, chime:v.chime};
  if(ed.i!=null) st.sched[ed.i]=o; else st.sched.push(o);
  st.sched.sort((a,b)=>a.t<b.t?-1:a.t>b.t?1:0);
  save(); audioUnlock(); popClose(); paintSched(); paintInfo();
  toastK('⏰ '+o.t+'（'+daysTxt(o.days)+'）に「'+o.text+'」を 流します');
}
function edTry(){
  const v=edVals(); if(!v) return;
  audioUnlock(); popClose();
  ann=null; annQ=[]; startAnn({id:'try', t:v.t, text:v.text, dur:'1', chime:v.chime}, Date.now());
}
async function edDel(){
  if(ed.i==null) return;
  const s=st.sched[ed.i]; if(!s) return;
  if(typeof appConfirm==='function' && !await appConfirm(s.t+'「'+s.text+'」の予約を 消しますか？', '消す', 'やめる')) return;
  st.sched.splice(ed.i,1); save(); popClose(); paintSched(); paintInfo();
}
function scTog(i){ const s=st.sched[i]; if(!s) return; audioUnlock(); s.on=!s.on; save(); paintSched(); paintInfo(); }

/* ───────── 画面 ───────── */
function setTab(k){
  if(!TABS.some(x=>x[0]===k)) return;
  popClose(); tab=k; audioUnlock();
  if(k!=='sched'){ const m=k==='clock'?'clock':'text'; if(st.mode!==m){ st.mode=m; save(); } }
  render(); restart();
  const b=$('kjBody'); if(b) b.scrollTop=0;
}
function setOpt(k, v){
  const ok={look:LOOKS.some(x=>x[0]===v), color:COLS.some(x=>x[0]===v), move:MOVES.some(x=>x[0]===v), speed:SPEEDS.some(x=>x[0]===v), rows:ROWS.includes(v), rot:ROTS.some(x=>x[0]===v)}[k];
  if(!ok) return; st[k]=v; save(); grids.clear(); prevKey=''; render(); restart();
}
function ckOpt(k, v){
  const L={fmt:CK_FMT, face:CK_FACE, color:CK_COL, anim:CK_ANIM, idle:CK_IDLE, dens:CK_DENS}[k];
  if(!L || !L.some(x=>x[0]===v)) return;
  st.ck[k]=v; save(); geo=null; cst=[]; ckView='time'; vTr=null; ckPrevKey=''; grids.clear(); render(); restart();
}
function ckTog(k){
  if(!CK_DECO.some(x=>x[0]===k)) return;
  st.ck[k]=!st.ck[k]; save(); geo=null; cst=[]; ckView='time'; vTr=null; ckPrevKey=''; render(); restart();
}
function paintInfo(){
  const b=$('kjInfo'); if(!b) return;
  if(tab==='clock'){ const nm=(L,v)=>(L.find(x=>x[0]===v)||L[0])[1]; b.textContent=nm(CK_FACE,st.ck.face)+'・'+nm(CK_FMT,st.ck.fmt)+'・かわるとき：'+nm(CK_ANIM,st.ck.anim); return; }
  if(tab==='sched'){ const on=st.sched.filter(s=>s.on).length; b.textContent=st.sched.length ? '予約 '+st.sched.length+'件（使う '+on+'件）' : ''; return; }
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
function paintSched(){
  const b=$('kjScList'); if(!b) return;
  b.innerHTML=st.sched.length ? st.sched.map((s,i)=>`<div class="kj-sc${s.on?'':' off'}"><button type="button" class="sw${s.on?' on':''}" onclick="KEIJIBAN.scTog(${i})" aria-pressed="${s.on}" aria-label="${s.on?'休みにする':'使う'}">${s.on?'ON':'OFF'}</button><button type="button" class="b" onclick="KEIJIBAN.scEdit(${i})"><b>${s.t}</b><small>${daysTxt(s.days)}・${(SC_DUR.find(x=>x[0]===s.dur)||SC_DUR[1])[1]}${s.chime?'・🔔':''}</small><span>${esc(s.text)}</span></button></div>`).join('')
    : '<p class="kj-note">「＋ 予約を足す」で、決めた時刻に 流す文を 決められます（例：12:00「お昼休みです」・17:00「本日の作業は 終わりです」）。</p>';
  const n=$('kjNext'); if(n) n.textContent=nextTxt(Date.now());
}
function textTab(){
  const o=(k, arr, lab)=>`<div class="kj-opt"><span>${lab}</span>${arr.map(a=>{ const v=Array.isArray(a)?a[0]:a, n=Array.isArray(a)?a[1]:a+'点'; return `<button type="button" class="${st[k]===v?'on':''}${k==='color'?' c-'+v:''}" onclick='KEIJIBAN.opt("${k}", ${JSON.stringify(v)})'>${n}</button>`; }).join('')}</div>`;
  return `<textarea id="kjText" class="kj-in" rows="2" maxlength="${MAX_TXT}" placeholder="流す文字（例：受付は こちらです）" oninput="KEIJIBAN.text(this.value)"></textarea>
    <button type="button" class="kj-go" onclick="KEIJIBAN.start()">▶ 全画面で 出す</button>
    <div class="kj-acts"><button type="button" class="kj-b" onclick="KEIJIBAN.keep()">⭐ 残す</button><button type="button" class="kj-b" onclick="KEIJIBAN.clear()">🧹 文字を消す</button></div>
    <div class="kj-sec"><h4>⭐ よく使う文<small>押すと 文字が かわる・▶ で すぐ全画面</small></h4><div id="kjList"></div>
      <div class="kj-acts sm"><button type="button" class="kj-b" onclick="KEIJIBAN.resetList()">はじめの文に 戻す</button></div></div>
    <div class="kj-sec"><h4>⚙ 見た目</h4>
      ${o('look', LOOKS, '見た目')}${o('color', COLS, '色')}${o('move', MOVES, '動き')}${o('speed', SPEEDS, '速さ')}
      ${st.look==='led' ? o('rows', ROWS, '点の細かさ') : ''}${o('rot', ROTS, '縦に持つと')}
      <p class="kj-note">全画面のあいだは 画面を消さないようにします（対応している端末）。画面を押すと「⏸ 止める」「✕ 終わる」が出ます。Android は 横向きの全画面に、iPhone は 縦に持っていても 90° 回して 横長に出します。</p></div>`;
}
function clockTab(){
  const c=st.ck, o=(k, L, lab)=>`<div class="kj-opt"><span>${lab}</span>${L.map(([v,n])=>`<button type="button" class="${c[k]===v?'on':''}${k==='color'?' c-'+v:''}" onclick='KEIJIBAN.ckOpt("${k}", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>`;
  return `<button type="button" class="kj-go" onclick="KEIJIBAN.startClock()">▶ 全画面で 時計を出す</button>
    <div class="kj-sec"><h4>🕐 時計の見た目</h4>
      ${o('fmt', CK_FMT, '出し方')}${o('face', CK_FACE, '数字の形')}${o('color', CK_COL, '色')}
      ${o('anim', CK_ANIM, 'かわるとき')}${o('idle', CK_IDLE, 'いつもの動き')}${o('dens', CK_DENS, '点の細かさ')}
      <div class="kj-opt"><span>かざり</span>${CK_DECO.map(([k,n])=>`<button type="button" class="tg${c[k]?' on':''}" aria-pressed="${!!c[k]}" onclick="KEIJIBAN.ckTog('${k}')">${c[k]?'✓ ':''}${n}</button>`).join('')}</div>
      <div class="kj-opt"><span>縦に持つと</span>${ROTS.map(([v,n])=>`<button type="button" class="${st.rot===v?'on':''}" onclick='KEIJIBAN.opt("rot", ${JSON.stringify(v)})'>${n}</button>`).join('')}</div>
      <p class="kj-note">「かわるとき」の動きは 数字が かわるたびに 見られます（「時:分:秒」なら 毎秒）。<b>くるっ</b>＝ローラーのように回る・<b>ぽろぽろ</b>＝点が こぼれ落ちて 上から降って積もる・<b>ばらばら</b>＝点が 飛びちって 集まる・<b>ぱたぱた</b>＝パタッと めくれる・<b>いろいろ</b>＝毎回 ちがう動き。
        <b>なみ</b>＝ゆらゆら波打つ・<b>ぴょん</b>＝1秒ごとに 跳ねる・<b>ふわっ</b>＝ゆっくり明るさが かわる。<b>秒の光</b>＝まわりを 1分で ひとまわり・<b>星空</b>＝まわりで 星が またたく・<b>正時の花火</b>＝毎時 0分に 花火（全画面の時計は 押したところにも 花火）・<b>日付も</b>＝ときどき 日付に かわる。<b>時間で かわる</b>色は 朝・昼・夕方・夜で かわります。</p></div>`;
}
function schedTab(){
  return `<div class="kj-sec"><h4>⏰ 予約<small>決めた時刻に 決めた文を 流します</small></h4>
      <div class="kj-next" id="kjNext"></div><div id="kjScList"></div>
      <div class="kj-acts sm"><button type="button" class="kj-b" onclick="KEIJIBAN.scEdit()">＋ 予約を足す</button></div></div>
    <button type="button" class="kj-go" onclick="KEIJIBAN.startClock()">▶ 時計を 全画面で出して 待つ</button>
    <p class="kj-note">予約の文は、この 電光掲示板（時計や文字）を 出している あいだだけ 流れます。全画面のあいだは 画面を消しません。スマホの画面を消したり、別のアプリに しているあいだは 流れません。チャイムは、一度 この画面の ボタンを押してから 鳴るように なります。流れている文は 画面の「✓ 終える」で 止められます。</p>`;
}
function render(){
  const b=$('kjBody'); if(!b) return;
  b.innerHTML=`<div class="kj-wrap">
    <canvas id="kjPrev" class="kj-prev" onclick="KEIJIBAN.start()" aria-label="見本（押すと 全画面）"></canvas>
    <div class="kj-info" id="kjInfo"></div>
    <div id="kjAnn"></div>
    <div class="kj-tabs" role="tablist">${TABS.map(([k,n])=>`<button type="button" role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" onclick="KEIJIBAN.tab('${k}')">${n}</button>`).join('')}</div>
    ${tab==='text' ? textTab() : tab==='clock' ? clockTab() : schedTab()}
  </div>`;
  if(tab==='text'){ $('kjText').value=st.text; $('kjText').addEventListener('keydown', e=>{ if(e.key!=='Escape') e.stopPropagation(); }); paintList(); }
  if(tab==='sched') paintSched();
  paintInfo(); paintAnn();
}
const KJ_CSS=`
#keijibanOverlay .kj-modal{ display:flex; flex-direction:column; }
.kj-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.kj-wrap{ max-width:820px; margin:0 auto; }
.kj-prev{ display:block; width:100%; height:min(28vw,170px); border-radius:12px; background:#050505; cursor:pointer; box-shadow:0 0 0 3px #222 inset; }
.kj-info{ font-size:12px; color:var(--text-light,#666); text-align:right; min-height:18px; margin:3px 2px 6px; }
.kj-tabs{ display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin:0 0 8px; }
.kj-tabs button{ min-height:46px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); color:var(--text,#333); font-size:15px; font-weight:bold; cursor:pointer; }
.kj-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-in{ display:block; width:100%; box-sizing:border-box; padding:10px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font:inherit; font-size:19px; line-height:1.4; resize:vertical; }
.kj-go{ display:block; width:100%; min-height:60px; margin:8px 0 0; border-radius:14px; border:0; background:var(--acc); color:var(--on-acc,#fff); font-size:20px; font-weight:bold; cursor:pointer; }
.kj-acts{ display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 10px; } .kj-acts .kj-b{ flex:1 1 auto; white-space:nowrap; } .kj-acts.sm{ margin:8px 0 0; } .kj-acts.sm .kj-b{ flex:0 1 auto; min-height:36px; font-size:13px; }
.kj-b{ min-height:44px; padding:0 12px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.kj-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .kj-b.del{ color:#c62828; } body.dark .kj-b.del{ color:#ef9a9a; }
.kj-sec{ margin:8px 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.kj-sec h4{ margin:0 0 8px; font-size:15px; } .kj-sec h4 small{ font-weight:normal; font-size:12px; color:var(--text-light,#666); margin-left:8px; }
.kj-li{ display:flex; gap:5px; align-items:stretch; margin:0 0 5px; }
.kj-li .t{ flex:1; min-width:0; min-height:44px; padding:6px 10px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#222); font-size:15.5px; text-align:left; cursor:pointer; overflow-wrap:anywhere; }
.kj-li .go, .kj-li .del{ flex:none; width:46px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#222); font-size:16px; cursor:pointer; }
.kj-li .go{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:6px 0; } .kj-opt span{ min-width:5.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.kj-opt button{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.kj-opt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.kj-opt button.c-red:not(.on){ color:#d32f2f; } .kj-opt button.c-green:not(.on){ color:#2e7d32; } .kj-opt button.c-yellow:not(.on){ color:#8d6e00; } .kj-opt button.c-blue:not(.on){ color:#1565c0; } .kj-opt button.c-time:not(.on){ color:#e65100; }
body.dark .kj-opt button.c-red:not(.on){ color:#ff8a80; } body.dark .kj-opt button.c-green:not(.on){ color:#69f0ae; } body.dark .kj-opt button.c-yellow:not(.on){ color:#ffd740; } body.dark .kj-opt button.c-blue:not(.on){ color:#82b1ff; } body.dark .kj-opt button.c-time:not(.on){ color:#ffab40; }
.kj-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; }
.kj-ann{ display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:0 0 8px; padding:8px 10px; border-radius:12px; background:rgba(255,193,7,.18); border:1px solid rgba(255,193,7,.6); font-size:14px; }
.kj-ann .kj-b{ margin-left:auto; min-height:38px; }
.kj-next{ font-size:14.5px; font-weight:bold; margin:0 0 8px; color:var(--acc-text,var(--acc)); }
.kj-sc{ display:flex; gap:6px; align-items:stretch; margin:0 0 6px; }
.kj-sc .sw{ flex:none; width:58px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text-light,#666); font-size:13px; font-weight:bold; cursor:pointer; }
.kj-sc .sw.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-sc .b{ flex:1; min-width:0; display:grid; grid-template-columns:auto 1fr; column-gap:10px; align-items:center; text-align:left; padding:6px 10px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#222); cursor:pointer; font:inherit; }
.kj-sc .b b{ grid-row:span 2; font-size:24px; font-variant-numeric:tabular-nums; } .kj-sc .b small{ font-size:12px; color:var(--text-light,#666); } .kj-sc .b span{ font-size:15px; overflow-wrap:anywhere; }
.kj-sc.off .b{ opacity:.5; }
.kj-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; padding-top:4vh; }
.kj-pop{ width:min(440px,94%); max-height:92%; overflow:auto; box-sizing:border-box; padding:14px 16px 0; border-radius:14px; background:var(--panel,var(--modal-bg,#fff)); color:var(--text,#222); box-shadow:0 10px 40px rgba(0,0,0,.35); }
.kj-pop>b{ display:block; font-size:16px; margin-bottom:4px; }
.kj-tp-big{ margin:2px 0 6px; text-align:center; font-size:38px; font-weight:bold; font-variant-numeric:tabular-nums; color:var(--acc-text,var(--acc)); }
.kj-tp-l{ font-size:12px; font-weight:bold; color:var(--text-light,#777); margin:8px 0 4px; }
.kj-tp-g{ display:grid; grid-template-columns:repeat(6,1fr); gap:4px; } .kj-tp-g.h{ grid-template-columns:repeat(8,1fr); }
.kj-tp-g button, .kj-days button{ height:36px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; touch-action:manipulation; padding:0 6px; }
.kj-tp-g button.on, .kj-days button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-tp-fine{ display:flex; gap:6px; margin-top:8px; } .kj-tp-fine button{ flex:none; height:40px; padding:0 10px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13.5px; font-weight:bold; cursor:pointer; }
.kj-tp-fine input, .kj-sc-in{ flex:1; min-width:0; height:40px; box-sizing:border-box; padding:0 10px; border-radius:8px; border:1px solid rgba(120,132,156,.5); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; }
.kj-sc-in{ display:block; width:100%; } .kj-sc-sel{ display:block; width:100%; margin-top:6px; height:40px; border-radius:8px; border:1px solid rgba(120,132,156,.5); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:14px; }
.kj-days{ display:flex; flex-wrap:wrap; gap:4px; } .kj-days .pre{ min-width:58px; } .kj-days .wd{ width:38px; padding:0; }
.kj-chk{ display:flex; align-items:center; gap:6px; margin:10px 0 0; font-size:14.5px; } .kj-chk input{ width:20px; height:20px; }
.kj-pop-acts{ position:sticky; bottom:0; display:flex; flex-wrap:wrap; gap:6px; justify-content:flex-end; margin-top:12px; padding:10px 0 14px; background:var(--panel,var(--modal-bg,#fff)); border-top:1px solid rgba(120,132,156,.22); } .kj-pop-acts .kj-b.del{ margin-right:auto; }
.kj-full{ position:fixed; inset:0; z-index:99990; background:#000; overflow:hidden; touch-action:none; }
.kj-full.ck #kjPauseB{ display:none; }
.kj-stage{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); }
.kj-stage.rot{ transform:translate(-50%,-50%) rotate(90deg); }
.kj-stage canvas{ display:block; }
.kj-fbar{ position:absolute; left:50%; bottom:14px; transform:translateX(-50%); display:flex; gap:10px; opacity:0; pointer-events:none; transition:opacity .25s; }
.kj-fbar.show{ opacity:1; pointer-events:auto; }
.kj-fbar button{ min-height:52px; min-width:130px; border-radius:26px; border:2px solid #fff; background:rgba(0,0,0,.65); color:#fff; font-size:18px; font-weight:bold; cursor:pointer; white-space:nowrap; }
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
function cleanup(){ popClose(); stopFull(); cancelAnimationFrame(raf); raf=0; ann=null; annQ=[]; }
function openKeijiban(){
  ensureDom(); load(); bms.clear(); grids.clear(); geo=null; cst=[];
  tab=st.mode==='clock' ? 'clock' : 'text';
  openDlg('keijibanOverlay', cleanup);
  render(); restart();
}
function closeKeijiban(){ if(!$('keijibanOverlay')||!isDlgOpen('keijibanOverlay')) return; closeDlg('keijibanOverlay', cleanup); }

const curCv=()=>{ const cv=$('kjFullCv')||$('kjPrev'); if(cv) sizeCanvas(cv); return cv; };
window.KEIJIBAN={ text:setText, start:()=>{ startFull(tab==='text'?'text':'clock'); }, startClock:()=>{ startFull('clock'); }, stopFull:()=>stopFull(), pause:togglePause,
  keep, del:i=>{ del(i); }, resetList:()=>{ resetList(); }, pick, go, clear:clearText, opt:setOpt,
  tab:setTab, ckOpt, ckTog, scEdit:i=>{ scEdit(i==null?null:i); }, scTog, annEnd:()=>endAnn(),
  state:()=>JSON.parse(JSON.stringify(st)), bitmap:()=>{ const b=bitmap(); return {w:b.w, h:b.h, n:b.n}; },
  pos:(t, C)=>ledPos(t, C), draw:t=>{ const cv=curCv(); if(!cv) return -1; prevKey=''; return draw(cv, t); },
  isFull:()=>!!$('kjFull'), paused:()=>paused, rotated:()=>{ const s=$('kjStage'); return !!(s && s.classList.contains('rot')); },
  // 時計・予約（v570。たしかめる用）
  ckStr:ms=>ckStr(new Date(ms==null?Date.now():ms)),
  ckGeo:()=>{ const cv=curCv(); if(!cv) return null; const G=ckGeom(cv.width, cv.height); return {R:G.R, C:G.C, h:G.h, x0:G.x0, y0:G.y0, tw:G.tw, cells:G.cells.map(c=>c.kind+c.w)}; },
  ckDraw:ms=>{ const cv=curCv(); if(!cv) return -1; ckPrevKey=''; return ckDraw(cv, ms); },
  ckDots:ms=>{ const cv=curCv(); if(!cv) return []; rec=[]; ckPrevKey=''; ckDraw(cv, ms); const r=rec; rec=null; return r; },
  ckTrans:ms=>cst.filter(s=>s.prev!=null && ms-s.t0<TR_DUR[s.a]).map(s=>s.prev+'→'+s.ch), ckView:()=>ckView, ckColor:ms=>ckColor(new Date(ms)),
  fx:()=>({fw:fw.parts.length, fwOn:fw.until>Date.now(), chimes, stars:stars.length, last:fw.last ? fw.last.map(v=>Math.round(v)) : null}),
  ann:()=>ann ? {t:ann.t, text:ann.text, dur:ann.dur, passes:textPass} : null, queue:()=>annQ.length,
  next:ms=>nextTxt(ms==null?Date.now():ms), freeze:b=>{ frozen=!!b; } };
Object.assign(window, { openKeijiban, closeKeijiban });
})();
