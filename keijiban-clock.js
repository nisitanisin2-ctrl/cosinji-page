/* 📢 電光掲示板の 動く時計（v571。keijiban.js の「🕐 時計」で、点で描く 電光の時計の ほかに えらべる）
   🕰 アナログ：秒針は カチッと ばねのように 止まる（なめらか も）。秒針が 通った目もりが 光の尾を引く
   📟 パタパタ：板の上半分が 倒れて、下半分が 下りてきて 数字が かわる（めくり時計）
   ✨ ネオン：管の光。数字が かわると ちらついてから 点く。床に 映りこむ
   🫧 ぽよん：前の数字が つぶれて、新しい数字が 落ちてきて ぷるんと はずむ
   🌅 空と太陽：時刻で 空の色が かわり、太陽（昼）と 月（夜）が 空を わたる。雲・鳥・星・家の明かり
   🔢 つぶつぶ：粒が 集まって 数字になる。かわると 粒が 飛んで 次の数字に。押すと はじける
   どれも canvas に 毎回 描く。o：{d, fmt, chars:[{k:'d'|'c', ch}], ampm, accent, rainbow, colon, date, dateTxt, hand, dpr}
   正時の花火・押したところの花火も なめらかに描く（つぶつぶは 押すと 粒が はじける）。 */
(function(){
'use strict';
const TAU=Math.PI*2;
const FONT='"Hiragino Maru Gothic ProN","Hiragino Sans","Arial Rounded MT Bold","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif';
const KINDS=[['analog','🕰 アナログ'],['flip','📟 パタパタ'],['neon','✨ ネオン'],['jelly','🫧 ぽよん'],['sky','🌅 空と太陽'],['tsubu','🔢 つぶつぶ']];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const hsl=(h,s,l,a)=>'hsla('+(((h%360)+360)%360).toFixed(1)+','+s+'%,'+l+'%,'+(a==null?1:+a.toFixed(3))+')';
const fr=n=>{ const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };   // いつも同じ でたらめ（0〜1）
const spring=t=>t<=0?0:t>=700?1:1-Math.exp(-t/55)*Math.cos(t/38);   // カチッ：少し行きすぎて もどる
const colAt=(o,i,t)=>o.rainbow ? hsl(i*47+t*36, 95, 62) : o.accent;
const colStep=(o,i,t)=>o.rainbow ? hsl(i*47+Math.floor(t/2)*20, 95, 62) : o.accent;   // 板の絵は 色ごとに 作るので 2秒ごとに かえる
function rgb(h){ const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h||''); return m ? [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)] : [255,255,255]; }
function mix(a, b, k){ const A=rgb(a), B=rgb(b); k=clamp(k,0,1); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join(''); }
const light=(c,k)=>/^#/.test(c) ? mix(c,'#ffffff',k) : c;
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
// 午前・午後の 1けたの時（「 9」）の 頭の空きは つめる
const trimLead=chars=>{ let i=0; while(i<chars.length-1 && chars[i].k==='d' && !chars[i].ch.trim()) i++; return chars.slice(i); };
// 字を 横に並べる（数字は いちばん広い数字の幅に そろえて、かわっても ずれない）。字の大きさ fs
function layout(g, chars, fs, weight){
  g.font=(weight||'bold')+' '+fs+'px '+FONT;
  let dw=0; for(const c of '0123456789') dw=Math.max(dw, g.measureText(c).width);
  const cw=Math.max(g.measureText(':').width, fs*0.3), gap=fs*0.04;
  const ws=chars.map(c=>c.k==='c'?cw:dw), tw=ws.reduce((a,b)=>a+b,0)+gap*(chars.length-1);
  const m=g.measureText('8'), asc=m.actualBoundingBoxAscent||fs*0.72, des=m.actualBoundingBoxDescent||0;
  return {fs, dw, cw, ws, gap, tw, asc, des};
}
// 横 maxW・高さ maxH に 入る いちばん大きい字
function fitLayout(g, chars, maxW, maxH, weight){
  const L=layout(g, chars, 100, weight), k=Math.min(maxW/Math.max(1,L.tw), maxH/Math.max(1,L.asc+L.des));
  return layout(g, chars, Math.max(6, Math.floor(100*k)), weight);
}

/* ───────── 花火（なめらか）───────── */
const fw={until:0, next:0, parts:[], last:null};
function fwStart(ms, dur){ fw.until=Math.max(fw.until, ms+dur); if(fw.next<ms) fw.next=ms; }
function fwBurst(x, y, t0, S){
  const hu=Math.random()*360, n=46;
  for(let i=0;i<n;i++){ const a=i/n*TAU+Math.random()*0.15, v=S*(0.28+Math.random()*0.22);
    fw.parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, g:S*0.32, t0, life:1.3+Math.random()*0.5, hu:hu+(i%4===0?40:0)}); }
  fw.last=[x, y];
  if(fw.parts.length>900) fw.parts.splice(0, fw.parts.length-900);
}
function fwStep(ms, W, H){
  const S=Math.min(W,H);
  while(fw.until>ms && fw.next<=ms){
    const x=W*(0.15+Math.random()*0.7), y=H*(0.14+Math.random()*0.3);
    fw.parts.push({rk:true, x, y0:H, y1:y, t0:fw.next, life:0.5});   // 下から 上がる
    fwBurst(x, y, fw.next+500, S);
    fw.next+=700;
  }
  if(fw.parts.length) fw.parts=fw.parts.filter(p=>ms-p.t0<p.life*1000);
}
function fwDraw(g, ms, S){
  if(!fw.parts.length) return;
  g.save(); g.globalCompositeOperation='lighter'; g.lineCap='round';
  for(const p of fw.parts){
    const age=(ms-p.t0)/1000; if(age<0 || age>p.life) continue;
    if(p.rk){ const e=age/p.life, y=p.y0+(p.y1-p.y0)*(1-(1-e)*(1-e)); g.strokeStyle='rgba(255,230,180,.9)'; g.lineWidth=S*0.008; g.beginPath(); g.moveTo(p.x,y); g.lineTo(p.x,y+S*0.06); g.stroke(); continue; }
    const pos=a=>[p.x+p.vx*a, p.y+p.vy*a+0.5*p.g*a*a], [x1,y1]=pos(age), [x0,y0]=pos(Math.max(0,age-0.09)), k=1-age/p.life;
    g.strokeStyle=hsl(p.hu,100,62,k); g.lineWidth=S*0.007; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke();
    g.fillStyle=hsl(p.hu,100,82,k); g.beginPath(); g.arc(x1,y1,S*0.006,0,TAU); g.fill();
  }
  g.restore();
}

/* ───────── 🕰 アナログ ───────── */
function analog(g, W, H, ms, o){
  const d=o.d, t=ms/1000, cx=W/2, cy=H/2, R=Math.min(W,H)*0.44;
  const bg=g.createRadialGradient(cx,cy,R*0.1,cx,cy,Math.hypot(W,H)*0.6); bg.addColorStop(0,'#232b3b'); bg.addColorStop(1,'#04060a');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  const s=d.getSeconds(), mil=d.getMilliseconds(), m=d.getMinutes(), h=d.getHours()%12, sweep=o.hand==='sweep', secs=o.fmt!=='hm';
  const sp=sweep ? s+mil/1000 : s-1+spring(mil);              // 秒：カチッ（ばね）／なめらか
  const mp=sweep ? m+(s+mil/1000)/60 : m-1+spring(s*1000+mil); // 分：カチッのときは 毎分 はねて 進む
  const hp=h+mp/60, acc=o.rainbow ? hsl(t*30,95,62) : o.accent;
  // 文字盤とふち
  const dial=g.createRadialGradient(cx,cy-R*0.3,R*0.1,cx,cy,R); dial.addColorStop(0,'#2b3344'); dial.addColorStop(1,'#11151d');
  g.fillStyle=dial; g.beginPath(); g.arc(cx,cy,R,0,TAU); g.fill();
  g.lineWidth=R*0.035; g.strokeStyle=acc; g.shadowColor=acc; g.shadowBlur=R*0.12; g.stroke(); g.shadowBlur=0;
  // 目もり：秒針が 通ったところが 光って 消えていく
  g.lineCap='round';
  for(let i=0;i<60;i++){
    const a=i/60*TAU-TAU/4, big=i%5===0, r0=R*(big?0.8:0.87), r1=R*0.93, c=Math.cos(a), sn=Math.sin(a);
    const age=(((sp-i)%60)+60)%60, glow=secs ? Math.max(0,1-age/12) : 0;
    g.strokeStyle=big?'#c9d1de':'#5d6676'; g.lineWidth=R*(big?0.028:0.012);
    g.beginPath(); g.moveTo(cx+c*r0, cy+sn*r0); g.lineTo(cx+c*r1, cy+sn*r1); g.stroke();
    if(glow>0.02){ g.globalAlpha=glow; g.strokeStyle=acc; g.shadowColor=acc; g.shadowBlur=R*0.06; g.stroke(); g.shadowBlur=0; g.globalAlpha=1; }
  }
  g.fillStyle='#e9edf4'; g.font='bold '+Math.round(R*0.15)+'px '+FONT; g.textAlign='center'; g.textBaseline='middle';
  for(let n=1;n<=12;n++){ const a=n/12*TAU-TAU/4; g.fillText(String(n), cx+Math.cos(a)*R*0.66, cy+Math.sin(a)*R*0.66); }
  if(o.ampm){ g.font='bold '+Math.round(R*0.1)+'px '+FONT; g.fillStyle=acc; g.fillText(o.ampm, cx, cy-R*0.33); }
  if(o.date){ g.font='bold '+Math.round(R*0.085)+'px '+FONT; g.fillStyle='#aab3c2'; g.fillText(o.dateTxt, cx, cy+R*0.35); }
  // 針（影つき）
  const hand=(p, len, tail, w, col)=>{
    const a=p*TAU-TAU/4, c=Math.cos(a), sn=Math.sin(a);
    g.strokeStyle=col; g.lineWidth=w; g.shadowColor='rgba(0,0,0,.6)'; g.shadowBlur=R*0.04; g.shadowOffsetY=R*0.015;
    g.beginPath(); g.moveTo(cx-c*tail, cy-sn*tail); g.lineTo(cx+c*len, cy+sn*len); g.stroke();
    g.shadowBlur=0; g.shadowOffsetY=0;
  };
  hand(hp/12, R*0.5, R*0.08, R*0.06, '#f3f5f9');
  hand(mp/60, R*0.74, R*0.1, R*0.04, '#f3f5f9');
  if(secs){ hand(sp/60, R*0.84, R*0.2, R*0.016, acc); const a=sp/60*TAU-TAU/4; g.fillStyle=acc; g.beginPath(); g.arc(cx+Math.cos(a)*R*0.62, cy+Math.sin(a)*R*0.62, R*0.05, 0, TAU); g.fill(); }
  g.fillStyle=acc; g.beginPath(); g.arc(cx,cy,R*0.045,0,TAU); g.fill();
  g.fillStyle='#10131a'; g.beginPath(); g.arc(cx,cy,R*0.018,0,TAU); g.fill();
  return 60;
}

/* ───────── 📟 パタパタ（めくり）───────── */
const FLIP_MS=620;
let flipSt=[], flipKey='';
const faces=new Map();
// 数字の板（上下の 2枚に分かれた 板の 表）
function cardFace(ch, cw, chh, col){
  const k=[ch,Math.round(cw),Math.round(chh),col].join('|'); let c=faces.get(k); if(c) return c;
  c=document.createElement('canvas'); c.width=Math.max(2,Math.round(cw)); c.height=Math.max(2,Math.round(chh)); const g=c.getContext('2d'), w=c.width, h=c.height;
  const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#383c45'); gr.addColorStop(0.5,'#25282e'); gr.addColorStop(0.5,'#1e2126'); gr.addColorStop(1,'#15171b');
  g.fillStyle=gr; rr(g,0,0,w,h,w*0.09); g.fill();
  if(ch.trim()){
    g.font='bold '+Math.round(h*0.78)+'px '+FONT; g.textAlign='center'; g.textBaseline='alphabetic';
    const m=g.measureText('8'), a=m.actualBoundingBoxAscent||h*0.56, de=m.actualBoundingBoxDescent||0;
    g.fillStyle=col; g.fillText(ch, w/2, h/2+(a-de)/2);
  }
  g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(0, h/2-Math.max(1,h*0.008), w, Math.max(2,h*0.016));   // まん中の すきま
  if(faces.size>90) faces.clear();
  faces.set(k,c); return c;
}
function drawCard(g, x, y, cw, chh, s, ms, col){
  const B=cardFace(s.ch,cw,chh,col), A=s.prev!=null ? cardFace(s.prev,cw,chh,col) : null, hh=chh/2, bw=B.width, bh=B.height/2;
  g.save(); g.shadowColor='rgba(0,0,0,.65)'; g.shadowBlur=chh*0.08; g.shadowOffsetY=chh*0.03; rr(g,x,y,cw,chh,cw*0.09); g.fillStyle='#15171b'; g.fill(); g.restore();
  const p=A ? (ms-s.t0)/FLIP_MS : 9;
  if(p>=1.3 || p<0){ g.drawImage(B, x, y, cw, chh); return false; }
  if(p>=1){   // 下りきって 少し はねる
    const b=Math.sin((p-1)/0.3*Math.PI)*0.05;
    g.drawImage(B, 0,0,bw,bh, x,y,cw,hh); g.drawImage(B, 0,bh,bw,bh, x,y+hh,cw,hh*(1-b));
    return true;
  }
  g.drawImage(B, 0,0,bw,bh, x,y,cw,hh);      // 上：新しい数字（倒れてくる板の うしろ）
  g.drawImage(A, 0,bh,bw,bh, x,y+hh,cw,hh);  // 下：前の数字
  if(p<0.5){   // 前の数字の 上半分が 手前へ 倒れてくる
    const k=Math.cos(p*Math.PI), sh=hh*k, wx=cw*0.045*(1-k);
    g.drawImage(A, 0,0,bw,bh, x-wx, y+hh-sh, cw+2*wx, sh);
    g.fillStyle='rgba(0,0,0,'+(0.55*(1-k)).toFixed(3)+')'; g.fillRect(x-wx, y+hh-sh, cw+2*wx, sh);
  } else {     // 新しい数字の 下半分が 下りてきて かぶさる
    const k=-Math.cos(p*Math.PI), sh=hh*k, wx=cw*0.045*(1-k);
    g.drawImage(B, 0,bh,bw,bh, x-wx, y+hh, cw+2*wx, sh);
    g.fillStyle='rgba(255,255,255,'+(0.1*(1-k)).toFixed(3)+')'; g.fillRect(x-wx, y+hh, cw+2*wx, sh);
  }
  return true;
}
function flip(g, W, H, ms, o){
  const t=ms/1000, chars=o.chars, n=chars.length;
  const bg=g.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#1b1d22'); bg.addColorStop(1,'#060708'); g.fillStyle=bg; g.fillRect(0,0,W,H);
  // 幅は 板の幅（cw）で数える：数字 1・「:」0.45・すきま 0.08・午前午後 1.15
  const units=chars.reduce((a,c)=>a+(c.k==='c'?0.45:1),0)+0.08*(n-1)+(o.ampm?1.15:0);
  const cw=Math.min(H*0.5*0.66, W*0.92/units), chh=cw/0.66, gap=cw*0.08;
  let x=(W-units*cw)/2; const y=(H-chh)/2-(o.date?chh*0.1:0);
  const key=[W,H,n,o.fmt].join('|'); if(key!==flipKey){ flipKey=key; flipSt=[]; }
  if(o.ampm){
    const lh=chh*0.3; g.fillStyle='#24272d'; rr(g, x, y+(chh-lh)/2, cw, lh, lh*0.2); g.fill();
    g.fillStyle=colAt(o,0,t); g.font='bold '+Math.round(lh*0.62)+'px '+FONT; g.textAlign='center'; g.textBaseline='middle'; g.fillText(o.ampm, x+cw/2, y+chh/2);
    x+=cw*1.15;
  }
  chars.forEach((c,i)=>{
    if(c.k==='c'){
      if(!o.colon || (ms%1000)<500){ g.fillStyle=colStep(o,i,t); const r=cw*0.09; for(const k of [0.36,0.64]){ g.beginPath(); g.arc(x+cw*0.225, y+chh*k, r, 0, TAU); g.fill(); } }
      x+=cw*0.45+gap; return;
    }
    let s=flipSt[i]; if(!s) s=flipSt[i]={ch:c.ch, prev:null, t0:0}; else if(s.ch!==c.ch){ s.prev=s.ch; s.ch=c.ch; s.t0=ms; }
    drawCard(g, x, y, cw, chh, s, ms, colStep(o,i,t));
    x+=cw+gap;
  });
  if(o.date){ g.fillStyle='#9aa3b2'; g.font='bold '+Math.round(chh*0.13)+'px '+FONT; g.textAlign='center'; g.textBaseline='middle'; g.fillText(o.dateTxt, W/2, y+chh+chh*0.17); }
  return n;
}

/* ───────── ✨ ネオン ───────── */
let neonSt=[], neonKey='', neonBg=null;
function neonBack(W, H){
  if(neonBg && neonBg.width===W && neonBg.height===H) return neonBg;
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  const gr=g.createRadialGradient(W/2,H*0.45,0,W/2,H*0.45,Math.hypot(W,H)*0.6); gr.addColorStop(0,'#1e1532'); gr.addColorStop(1,'#050308');
  g.fillStyle=gr; g.fillRect(0,0,W,H);
  g.strokeStyle='rgba(255,255,255,.04)'; g.lineWidth=Math.max(1,H/320); const bh=H/12, bw=bh*2.3;   // れんがの かべ
  for(let r=0;r*bh<H;r++){ const y=r*bh; g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); for(let x=(r%2)*bw/2; x<W; x+=bw){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+bh); g.stroke(); } }
  neonBg=c; return c;
}
function neonText(g, ch, x, y, fs, col, a){
  g.globalAlpha=a; g.fillStyle=col; g.shadowColor=col;
  g.shadowBlur=fs*0.38; g.fillText(ch, x, y);
  g.shadowBlur=fs*0.14; g.fillText(ch, x, y);
  g.shadowBlur=fs*0.04; g.fillStyle=light(col,0.72); g.fillText(ch, x, y);   // まん中は 白っぽく
  g.shadowBlur=0;
}
function neon(g, W, H, ms, o){
  const t=ms/1000; g.drawImage(neonBack(W,H),0,0);
  const chars=trimLead(o.chars), L=fitLayout(g, chars, W*0.84, H*(o.date?0.36:0.42), '500');
  const key=[W,H,chars.length,o.fmt].join('|'); if(key!==neonKey){ neonKey=key; neonSt=[]; }
  const base=H*0.47+(L.asc-L.des)/2; let x=(W-L.tw)/2, lit=0;
  g.save(); g.globalCompositeOperation='lighter'; g.font='500 '+L.fs+'px '+FONT; g.textAlign='center'; g.textBaseline='alphabetic';
  const rnd=n=>fr(n*0.731);
  chars.forEach((c,i)=>{
    const w=L.ws[i], cx=x+w/2; x+=w+L.gap;
    let s=neonSt[i]; if(!s) s=neonSt[i]={ch:c.ch, t0:-1e9}; else if(s.ch!==c.ch){ s.ch=c.ch; s.t0=ms; }
    if(c.k==='c' && o.colon && (ms%1000)>=500) return;
    const p=(ms-s.t0)/700;
    let a=0.9+0.1*Math.sin(t*13+i*2.3)*Math.sin(t*7.1+i);   // じーっと ゆれる 光
    if(p<1 && !(rnd(Math.floor(p*22)+i*7)<0.2+p)) a=0.07;     // かわったばかり：ちらついて 点く
    else if(rnd(Math.floor(t*5)+i*13)>0.996) a*=0.3;         // ときどき ちかっ
    const col=colAt(o,i,t);
    neonText(g, c.ch, cx, base, L.fs, col, a);
    g.save(); g.translate(0, 2*(base+L.fs*0.06)); g.scale(1,-1); neonText(g, c.ch, cx, base, L.fs, col, a*0.05); g.restore();   // 床に うすく 映る
    if(a>0.5) lit++;
  });
  g.globalAlpha=1;
  if(o.ampm){ g.font='500 '+Math.round(L.fs*0.22)+'px '+FONT; neonText(g, o.ampm, (W-L.tw)/2+L.fs*0.3, base-L.asc-L.fs*0.12, L.fs*0.22, '#ff4fd8', 0.95); }
  if(o.date){ g.font='500 '+Math.round(L.fs*0.2)+'px '+FONT; neonText(g, o.dateTxt, W/2, base+L.fs*0.5, L.fs*0.2, '#4fe3ff', 0.9); }
  g.restore();
  return lit;
}

/* ───────── 🫧 ぽよん ───────── */
let jSt=[], jKey='';
const PASTEL=['#ff5f8f','#ffad33','#3ccf6a','#38a6f5','#a26bff','#ff7a52','#1fc7b6','#f25fd0'];
function jDigit(g, ch, x, base, fs, sx, sy, col, alpha){
  if(alpha<=0.01 || !ch.trim()) return;
  g.save(); g.translate(x, base); g.scale(sx, sy); g.globalAlpha=alpha;
  g.lineJoin='round'; g.lineWidth=fs*0.1; g.strokeStyle='#ffffff'; g.shadowColor='rgba(60,40,90,.22)'; g.shadowBlur=fs*0.08; g.shadowOffsetY=fs*0.05;
  g.strokeText(ch, 0, 0); g.shadowColor='transparent';
  const gr=g.createLinearGradient(0,-fs*0.75,0,0); gr.addColorStop(0, light(col,0.4)); gr.addColorStop(1, col);
  g.fillStyle=gr; g.fillText(ch, 0, 0);
  g.restore();
}
function jelly(g, W, H, ms, o){
  const t=ms/1000, hb=(t*6)%360;
  const bg=g.createLinearGradient(0,0,W,H); bg.addColorStop(0,hsl(hb,80,93)); bg.addColorStop(1,hsl(hb+60,85,86)); g.fillStyle=bg; g.fillRect(0,0,W,H);
  for(let i=0;i<14;i++){   // ふわふわ のぼる 泡
    const r=(0.03+0.05*fr(i*3.1))*Math.min(W,H), span=H+2*r, y=H+r-((t*H*0.05*(0.5+fr(i*1.3))+fr(i*5.1)*span)%span), x=fr(i*7.7)*W+Math.sin(t*0.4+i)*W*0.02;
    g.fillStyle='rgba(255,255,255,.38)'; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill();
  }
  const chars=trimLead(o.chars), L=fitLayout(g, chars, W*0.84, H*(o.date?0.4:0.46));
  const key=[W,H,chars.length,o.fmt].join('|'); if(key!==jKey){ jKey=key; jSt=[]; }
  const fs=L.fs, base=H*0.5+(L.asc-L.des)/2; let x=(W-L.tw)/2;
  g.font='bold '+fs+'px '+FONT; g.textAlign='center'; g.textBaseline='alphabetic';
  chars.forEach((c,i)=>{
    const w=L.ws[i], cx=x+w/2; x+=w+L.gap;
    const col=o.rainbow ? PASTEL[i%PASTEL.length] : o.accent;
    if(c.k==='c'){   // 「:」は 2つの玉が かわりばんこに はねる
      if(o.colon && (ms%1000)>=500) return;
      for(const [k,ph] of [[0.62,0],[0.25,Math.PI]]){ const by=Math.abs(Math.sin(t*3+ph))*fs*0.06; g.fillStyle=col; g.beginPath(); g.arc(cx, base-L.asc*k-by, fs*0.07, 0, TAU); g.fill(); }
      return;
    }
    let s=jSt[i]; if(!s) s=jSt[i]={ch:c.ch, prev:null, t0:-1e9}; else if(s.ch!==c.ch){ s.prev=s.ch; s.ch=c.ch; s.t0=ms; }
    const p=(ms-s.t0)/1000;
    if(s.prev!=null && p<0.35){ const q=p/0.35; jDigit(g, s.prev, cx, base, fs, 1+0.6*q, 1-0.85*q, col, 1-q); }   // 前の数字：つぶれて 消える
    let dy=0, sx=1, sy=1, show=true;
    if(s.prev!=null && p<1.4){
      const st0=0.12, fall=0.36;
      if(p<st0) show=false;
      else if(p<st0+fall){ const q=(p-st0)/fall; dy=-(1-q*q)*H*0.75; sy=1.12; sx=0.9; }       // 上から 落ちてくる（のびる）
      else { const q=p-st0-fall, damp=Math.exp(-q*5.5)*Math.cos(q*21); sy=1-0.32*damp; sx=1+0.24*damp; }   // 着いて ぷるん
    } else { const b=Math.sin(t*2.6+i*0.7); dy=-Math.abs(b)*fs*0.03; sy=1+b*0.02; sx=1-b*0.015; }   // いつもは ゆらゆら
    if(show) jDigit(g, s.ch, cx, base+dy, fs, sx, sy, col, 1);
  });
  if(o.ampm){ g.font='bold '+Math.round(fs*0.2)+'px '+FONT; g.fillStyle='#6b5a8e'; g.fillText(o.ampm, W/2, base-L.asc-fs*0.12); }
  if(o.date){ g.font='bold '+Math.round(fs*0.18)+'px '+FONT; g.fillStyle='#6b5a8e'; g.fillText(o.dateTxt, W/2, base+fs*0.3); }
  return chars.length;
}

/* ───────── 🌅 空と太陽 ───────── */
// [0時からの分, 空の上の色, 地平線の色]
const SKY=[[0,'#0b1026','#1b2147'],[270,'#0f1433','#2a2556'],[330,'#3b3a7a','#f29e6b'],[390,'#5fa8e8','#ffd3a0'],[480,'#3d8fe0','#bfe3ff'],[720,'#2f80e0','#a6d8ff'],[960,'#4a8fd8','#ffe2b4'],[1050,'#5b5ba8','#ff9a5c'],[1110,'#2c2f6b','#c0617a'],[1170,'#121735','#2a2552'],[1440,'#0b1026','#1b2147']];
function skyAt(min){ for(let i=1;i<SKY.length;i++) if(min<=SKY[i][0]){ const a=SKY[i-1], b=SKY[i], k=(min-a[0])/(b[0]-a[0]); return [mix(a[1],b[1],k), mix(a[2],b[2],k)]; } return [SKY[0][1], SKY[0][2]]; }
const nightAt=min=>min<270||min>1170 ? 1 : min<330 ? 1-(min-270)/60 : min>1110 ? (min-1110)/60 : 0;
function face(g, x, y, r, sleepy, blink){   // 太陽と 月の かお
  g.strokeStyle='rgba(90,50,20,.75)'; g.fillStyle='rgba(90,50,20,.75)'; g.lineWidth=r*0.09; g.lineCap='round';
  for(const ex of [-0.33,0.33]){
    if(sleepy || blink){ g.beginPath(); g.arc(x+ex*r, y-r*0.12, r*0.13, 0.15*Math.PI, 0.85*Math.PI); g.stroke(); }
    else { g.beginPath(); g.arc(x+ex*r, y-r*0.12, r*0.09, 0, TAU); g.fill(); }
  }
  g.beginPath(); g.arc(x, y+r*0.12, r*0.3, 0.2*Math.PI, 0.8*Math.PI); g.stroke();
  g.fillStyle='rgba(255,120,120,.35)'; for(const ex of [-0.55,0.55]){ g.beginPath(); g.arc(x+ex*r, y+r*0.15, r*0.13, 0, TAU); g.fill(); }
}
function cloud(g, x, y, s){ for(const [dx,dy,k] of [[0,0,1],[0.9,-0.35,0.8],[1.8,0,0.9],[0.9,0.25,0.9]]){ g.beginPath(); g.arc(x+dx*s, y+dy*s, k*s, 0, TAU); g.fill(); } }
function hill(g, W, H, base, amp, ph, col){
  g.fillStyle=col; g.beginPath(); g.moveTo(0,H);
  for(let i=0;i<=40;i++){ const x=i/40*W; g.lineTo(x, base-amp*(0.5+0.5*Math.sin(x/W*TAU*1.3+ph))); }
  g.lineTo(W,H); g.closePath(); g.fill();
}
function sky(g, W, H, ms, o){
  const d=o.d, t=ms/1000, hr=d.getHours(), min=hr*60+d.getMinutes()+d.getSeconds()/60+d.getMilliseconds()/60000, [top,bot]=skyAt(min), night=nightAt(min), hy=H*0.8;
  const gr=g.createLinearGradient(0,0,0,hy); gr.addColorStop(0,top); gr.addColorStop(1,bot); g.fillStyle=gr; g.fillRect(0,0,W,H);
  if(night>0.01){   // 星
    g.fillStyle='#fffbe8';
    for(let i=0;i<70;i++){ const tw=0.5+0.5*Math.sin(t*(1+fr(i)*2)+i); g.globalAlpha=night*(0.3+0.7*tw); g.beginPath(); g.arc(fr(i*12.3)*W, fr(i*7.9)*hy*0.85, Math.max(1,H*0.003*(0.6+fr(i*3.3))), 0, TAU); g.fill(); }
    g.globalAlpha=1;
  }
  const arcAt=p=>[W*(0.06+0.88*p), hy-(hy-H*0.13)*Math.sin(p*Math.PI)];
  const ps=(min-360)/720, pm=((min-1080+1440)%1440)/720, blink=(t%4)<0.15;
  if(ps>=-0.04 && ps<=1.04){   // 太陽（6時〜18時）
    const [x,y]=arcAt(clamp(ps,0,1)), r=H*0.075;
    const sg=g.createRadialGradient(x,y,0,x,y,r*3.2); sg.addColorStop(0,'rgba(255,240,180,.9)'); sg.addColorStop(0.3,'rgba(255,210,120,.35)'); sg.addColorStop(1,'rgba(255,200,120,0)');
    g.fillStyle=sg; g.beginPath(); g.arc(x,y,r*3.2,0,TAU); g.fill();
    g.save(); g.translate(x,y); g.rotate(t*0.25); g.strokeStyle='rgba(255,215,110,.7)'; g.lineWidth=r*0.13; g.lineCap='round';
    for(let k=0;k<12;k++){ const a=k/12*TAU, l=r*(1.38+0.14*Math.sin(t*2.5+k)); g.beginPath(); g.moveTo(Math.cos(a)*r*1.16, Math.sin(a)*r*1.16); g.lineTo(Math.cos(a)*l, Math.sin(a)*l); g.stroke(); }
    g.restore();
    g.fillStyle='#ffd23f'; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill();
    face(g, x, y, r, false, blink);
  }
  if(pm>=-0.04 && pm<=1.04){   // 月（18時〜6時）
    const [x,y]=arcAt(clamp(pm,0,1)), r=H*0.065;
    const mg=g.createRadialGradient(x,y,0,x,y,r*2.6); mg.addColorStop(0,'rgba(220,230,255,.5)'); mg.addColorStop(1,'rgba(220,230,255,0)');
    g.fillStyle=mg; g.beginPath(); g.arc(x,y,r*2.6,0,TAU); g.fill();
    g.fillStyle='#f4f1d0'; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill();
    g.fillStyle='rgba(0,0,0,.07)'; for(const [dx,dy,k] of [[-0.35,-0.4,0.18],[0.4,0.35,0.14],[0.2,-0.1,0.1]]){ g.beginPath(); g.arc(x+dx*r, y+dy*r, k*r, 0, TAU); g.fill(); }
    face(g, x, y, r, true, false);
  }
  g.fillStyle=night>0.5 ? 'rgba(150,160,195,.28)' : 'rgba(255,255,255,.88)';   // 雲
  for(let i=0;i<5;i++){ const span=W*1.6, x=((fr(i*9.1)*span+t*W*0.012*(0.6+fr(i*2.2)))%span)-W*0.3, y=hy*(0.1+0.42*fr(i*4.4)), s=H*(0.045+0.035*fr(i*6.6)); cloud(g, x, y, s); }
  if(night<0.3){   // 鳥（昼）
    g.strokeStyle='rgba(40,50,70,.75)'; g.lineWidth=Math.max(1.5,H*0.006); g.lineCap='round';
    const span=W*2.2, bx=((t*W*0.05)%span)-W*0.4;
    for(let i=0;i<3;i++){ const x=bx-i*H*0.08, y=hy*0.33+i*H*0.04+Math.sin(t*1.3+i)*H*0.015, wv=H*0.025*(0.4+0.6*Math.abs(Math.sin(t*7+i))), s=H*0.03;
      g.beginPath(); g.moveTo(x-s, y-wv); g.quadraticCurveTo(x-s*0.4, y-wv*0.2, x, y); g.quadraticCurveTo(x+s*0.4, y-wv*0.2, x+s, y-wv); g.stroke(); }
  }
  hill(g, W, H, hy+H*0.02, H*0.07, 0.4, mix('#4c9a5e','#0f1d17',night));
  const b2=hy+H*0.09; hill(g, W, H, b2, H*0.05, 2.1, mix('#3a8550','#09140f',night));
  const lit=hr>=17 || hr<1;   // 家（夜は 窓に 明かり）
  for(const [i,fx] of [[0,0.12],[1,0.3],[2,0.68],[3,0.86]]){
    const x=W*fx, hw=H*0.06, by=b2-H*0.05*(0.5+0.5*Math.sin(fx*TAU*1.3+2.1))+H*0.01;
    g.fillStyle=mix('#f2e8d5','#262833',night); g.fillRect(x-hw/2, by-hw*0.8, hw, hw*0.8);
    g.fillStyle=mix('#d9534f','#3a1f25',night); g.beginPath(); g.moveTo(x-hw*0.62, by-hw*0.78); g.lineTo(x, by-hw*1.3); g.lineTo(x+hw*0.62, by-hw*0.78); g.closePath(); g.fill();
    const on=lit && (hr!==0 || fr(i*5.5)>0.5);
    g.fillStyle=on ? '#ffd76a' : mix('#7aa7c7','#141824',night); if(on){ g.shadowColor='#ffcf4a'; g.shadowBlur=hw*0.5; }
    g.fillRect(x-hw*0.18, by-hw*0.55, hw*0.36, hw*0.3); g.shadowBlur=0;
  }
  // 時刻
  const chars=trimLead(o.chars), L=fitLayout(g, chars, W*0.62, H*0.26), base=H*0.44+(L.asc-L.des)/2;
  let x=(W-L.tw)/2;
  g.font='bold '+L.fs+'px '+FONT; g.textAlign='center'; g.textBaseline='alphabetic';
  g.shadowColor='rgba(0,0,0,.45)'; g.shadowBlur=L.fs*0.12; g.shadowOffsetY=L.fs*0.04;
  chars.forEach((c,i)=>{ const w=L.ws[i]; if(!(c.k==='c' && o.colon && (ms%1000)>=500)){ g.fillStyle='#ffffff'; g.fillText(c.ch, x+w/2, base); } x+=w+L.gap; });
  g.font='bold '+Math.round(L.fs*0.24)+'px '+FONT;
  if(o.ampm) g.fillText(o.ampm, W/2, base-L.asc-L.fs*0.1);
  if(o.date) g.fillText(o.dateTxt, W/2, base+L.fs*0.32);
  g.shadowBlur=0; g.shadowOffsetY=0;
  return 1;
}

/* ───────── 🔢 つぶつぶ ───────── */
const tb={key:'', cells:[], parts:[], last:0};
const tbPts=new Map();
// 1字の中の 点（字の 左上から）。step ごとに 見る
function charPts(ch, fs, w, h, base, step){
  const k=[ch,fs,Math.round(w),Math.round(h),step].join('|'); if(tbPts.has(k)) return tbPts.get(k);
  const c=document.createElement('canvas'); c.width=Math.max(1,Math.ceil(w)); c.height=Math.max(1,Math.ceil(h)); const g=c.getContext('2d');
  g.font='bold '+fs+'px '+FONT; g.textAlign='center'; g.textBaseline='alphabetic'; g.fillStyle='#fff'; g.fillText(ch, c.width/2, base);
  const dt=g.getImageData(0,0,c.width,c.height).data, out=[];
  for(let y=0;y<c.height;y+=step) for(let x=0;x<c.width;x+=step) if(dt[(Math.floor(y)*c.width+Math.floor(x))*4+3]>128) out.push([x,y]);
  if(tbPts.size>120) tbPts.clear();
  tbPts.set(k,out); return out;
}
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function tbSetup(g, W, H, chars){
  const L=fitLayout(g, chars, W*0.86, H*0.5), step=Math.max(2, L.fs/30), h=L.asc+L.des+step*2, top=H*0.5-(L.asc+L.des)/2-step;
  let x=(W-L.tw)/2; tb.cells=[]; tb.parts=[];
  chars.forEach((c,i)=>{
    const w=L.ws[i];
    let n=1; const set=c.k==='c' ? [':'] : '0123456789'.split('');
    for(const ch of set) n=Math.max(n, charPts(ch, L.fs, w, h, L.asc+step, step).length);
    const cell={x, y:top, w, h, base:L.asc+step, fs:L.fs, step, k:c.k, ch:null, idx:[]};
    for(let j=0;j<n;j++){ cell.idx.push(tb.parts.length); tb.parts.push({x:Math.random()*W, y:Math.random()*H, vx:0, vy:0, tx:W/2, ty:H/2, j:Math.random()*100, cell:i}); }
    tb.cells.push(cell); x+=w+L.gap;
  });
  tb.step=step;
}
function tbAssign(cell, ch, kick){
  const pts=shuffle(charPts(ch, cell.fs, cell.w, cell.h, cell.base, cell.step).slice());
  cell.ch=ch;
  cell.idx.forEach((pi,j)=>{
    const p=tb.parts[pi];
    if(!pts.length){ p.tx=cell.x+cell.w/2; p.ty=cell.y+cell.h/2; p.hide=true; return; }
    const q=pts[j%pts.length]; p.hide=false;   // 点より 粒が 多いときは 同じ点に 重ねる
    p.tx=cell.x+q[0]+(j>=pts.length ? (Math.random()-0.5)*cell.step*0.6 : 0); p.ty=cell.y+q[1];
    if(kick){ const a=Math.random()*TAU, v=cell.fs*(1.5+Math.random()*2.5); p.vx+=Math.cos(a)*v; p.vy+=Math.sin(a)*v-cell.fs*1.5; }
  });
}
const sprites=new Map();
function dotSprite(col, r){
  const k=col+'|'+Math.round(r*2); let c=sprites.get(k); if(c) return c;
  const s=Math.max(2, Math.ceil(r*4)); c=document.createElement('canvas'); c.width=c.height=s; const g=c.getContext('2d');
  const gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2); gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.25,col); gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr; g.fillRect(0,0,s,s);
  if(sprites.size>80) sprites.clear();
  sprites.set(k,c); return c;
}
function tsubu(g, W, H, ms, o){
  const t=ms/1000, chars=trimLead(o.chars);
  const bg=g.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.hypot(W,H)*0.6); bg.addColorStop(0,'#0f1a2c'); bg.addColorStop(1,'#020408'); g.fillStyle=bg; g.fillRect(0,0,W,H);
  const key=[W,H,chars.map(c=>c.k).join(''),o.fmt].join('|');
  if(key!==tb.key){ tb.key=key; tbSetup(g, W, H, chars); tb.last=ms; }
  chars.forEach((c,i)=>{ const cell=tb.cells[i]; if(cell && cell.ch!==c.ch) tbAssign(cell, c.ch, cell.ch!=null); });
  const dt=clamp((ms-tb.last)/1000, 0, 0.05); tb.last=ms;
  const K=70, Cd=10, r=tb.step*0.5;
  g.save(); g.globalCompositeOperation='lighter';
  let n=0;
  for(const p of tb.parts){
    const jx=Math.sin(t*3+p.j)*tb.step*0.12, jy=Math.cos(t*2.6+p.j)*tb.step*0.12;   // 止まっていても ふるふる
    p.vx+=((p.tx+jx-p.x)*K-p.vx*Cd)*dt; p.vy+=((p.ty+jy-p.y)*K-p.vy*Cd)*dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    const cell=tb.cells[p.cell]; if(!cell || p.hide) continue;
    let a=1; if(cell.k==='c' && o.colon && (ms%1000)>=500) a=0.18;
    const col=o.rainbow ? hsl(Math.round((p.tx/W*300+t*30)/15)*15, 95, 62) : o.accent;   // 粒の絵は 色ごとに 作るので 15°ずつ
    g.globalAlpha=a; g.drawImage(dotSprite(col, r), p.x-r*2, p.y-r*2, r*4, r*4); n++;
  }
  g.restore();
  g.fillStyle='rgba(220,230,255,.8)'; g.font='bold '+Math.round(H*0.06)+'px '+FONT; g.textAlign='center'; g.textBaseline='middle';
  if(o.ampm) g.fillText(o.ampm, W/2, H*0.16);
  if(o.date) g.fillText(o.dateTxt, W/2, H*0.86);
  return n;
}
function tbPush(x, y, W, H){
  const R=Math.min(W,H)*0.45;
  for(const p of tb.parts){ const dx=p.x-x, dy=p.y-y, dd=Math.hypot(dx,dy)||1; if(dd<R){ const f=(1-dd/R)*Math.min(W,H)*5; p.vx+=dx/dd*f; p.vy+=dy/dd*f; } }
}

const DRAW={analog, flip, neon, jelly, sky, tsubu};
window.KJ_CLOCKS={
  KINDS,
  draw(kind, cv, ms, o){
    const f=DRAW[kind], W=cv.width, H=cv.height; if(!f || !W || !H) return 0;
    const g=cv.getContext('2d'); g.save(); g.globalAlpha=1; g.globalCompositeOperation='source-over';
    const n=f(g, W, H, ms, o);
    g.restore();
    fwStep(ms, W, H); fwDraw(g, ms, Math.min(W,H));
    return n;
  },
  // 押したところ（canvas の点）：つぶつぶは 粒が はじけ、ほかは 花火
  tap(kind, cv, x, y, ms){ if(kind==='tsubu') tbPush(x, y, cv.width, cv.height); else fwBurst(x, y, ms, Math.min(cv.width, cv.height)); },
  fire(ms){ fwStart(ms, 7000); },
  info(){ return {fw:fw.parts.length, last:fw.last ? fw.last.map(v=>Math.round(v)) : null, flip:flipSt.filter(Boolean).map(s=>s.ch).join(''), neon:neonSt.filter(Boolean).map(s=>s.ch).join(''), jelly:jSt.filter(Boolean).map(s=>s.ch).join(''), tsubu:tb.parts.length, cells:tb.cells.map(c=>c.ch).join('')}; },
  // 動いている 途中の数（たしかめる用）
  moving(kind, ms){
    const L=kind==='flip' ? flipSt : kind==='neon' ? neonSt : kind==='jelly' ? jSt : [];
    const dur=kind==='flip' ? FLIP_MS*1.3 : kind==='neon' ? 700 : 1400;
    return L.filter(s=>s && s.t0>0 && ms-s.t0>=0 && ms-s.t0<dur).length;
  },
  reset(){ flipSt=[]; flipKey=''; neonSt=[]; neonKey=''; jSt=[]; jKey=''; tb.key=''; tb.parts=[]; tb.cells=[]; fw.parts=[]; fw.until=0; fw.next=0; }
};
})();
