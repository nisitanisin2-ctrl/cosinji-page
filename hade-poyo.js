/* 🫧 ぽよん（v589。📢 電光掲示板の 時計の「🫧 ぽよん」を ⏱ ど派手タイマー（🕐 時計も）と 🎉 ど派手カウンター でも 使う。
   hade-fx.js の あとに 読む。はじめて 開いた ときに 読む）
   ・数字が かわると 前の 数字が つぶれて 消え、新しい 数字が 上から 落ちてきて ぷるんと はずむ（電光掲示板と 同じ 動き）。
     いつもは ゆらゆら。「:」は 2つの 玉が かわりばんこに はねる。地は 色が ゆっくり かわる パステルの 空と のぼる あわ。
   ・いくつかの 桁が いっしょに かわる ときは 左から 順に ぽよぽよ 落ちる。桁が ふえる・へる ときは 右に そろえる。
     つづけて すぐ かわる とき（カウンターを 早く 押す など）は 動きを 短く して 数が 読める ように する。
   ・動きに 合わせた 演出（演出の 強さで ふえる。ひかえめ は 少し・画面の ゆれ なし）：
     つぶれる＝数字の 色の しぶき（ぷるぷるの 玉）が 左右に はねて 床で はずむ／落ちる＝きらきらの 尾／
     着地＝床に 広がる しぶきの 輪・はねる 玉・光の 粒・2けた 以上 かわると「ぽよん」の 音／ぷるん＝きらきら。
     ド派手＝着地で 画面が ゆれ、うしろの あわが はじけ、「ぽよん！」の 字。
     ドド派手＝数字が 虹色に かわり、高い ところから 落ちて 何度も はずむ・🫧 ✨ 💖 ⭐ が とぶ・いつも 音・大きな ゆれ。
   ・hop：みんなで ぴょんと はねる（タイマーの 5秒ごとの 演出・0 に なった あと・カウンターの 節目）。
   ・しぶきと 輪は 自分で 描く（明るい 地でも 見える ように 重ねて 描く）。光の 粒・字・絵文字・ゆれは hade-fx.js の 演出を 使う。
   ・drawRows（v590）：いくつかの 行に 分けて 描く。🕐 時計で 秒を 出しても 字が 小さく ならない ように、
     縦の 画面は 時・分・秒を 縦に 積み、横の 画面は 時:分 の 下（とても 横長なら 右）に 秒を 少し 小さく。
     行が かわる ときは 上の 行から 順に 落ちる。
   ・L（覚える もの）：前の 字・桁ごとの 動き・しぶき。いくつかの 行の ときは 行ごとに L.rows[i] に。 */
(function(){
'use strict';
if(window.HADE_POYO) return;
const TAU=Math.PI*2;
const FONT='"Hiragino Maru Gothic ProN","Hiragino Sans","Arial Rounded MT Bold","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif';
const PASTEL=['#ff5f8f','#ffad33','#3ccf6a','#38a6f5','#a26bff','#ff7a52','#1fc7b6','#f25fd0'];
// 演出の 強さ：k＝しぶきの 多さ・b＝ド派手 1／ドド派手 2（ひかえめ は -1）
const LV={calm:{k:0.3, b:-1}, norm:{k:0.6, b:0}, max:{k:1, b:0}, ultra:{k:1.5, b:1}, mega:{k:2.2, b:2}};
const CAP={calm:70, norm:150, max:260, ultra:420, mega:620};   // しぶきの 粒の 上限
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const hsl=(h,s,l,a)=>'hsla('+(((h%360)+360)%360).toFixed(1)+','+s+'%,'+l+'%,'+(a==null?1:+a.toFixed(3))+')';
const fr=n=>{ const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };   // いつも同じ でたらめ（0〜1）
function rgb(h){ const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h||''); return m ? [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)] : null; }
function mix(a, b, k){ const A=rgb(a), B=rgb(b); if(!A || !B) return a; k=clamp(k,0,1); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join(''); }
const luma=c=>{ const A=rgb(c); return A ? (0.299*A[0]+0.587*A[1]+0.114*A[2])/255 : 0.5; };
// 明るすぎる 色（金・黄緑・水色 など）は 地に とけない ように 同じ 色あいの まま 少し こく
function deep(c){
  const A=rgb(c); if(!A) return c;
  const r=A[0]/255, g=A[1]/255, b=A[2]/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2;
  if(l<=0.56 && luma(c)<=0.62) return c;
  const dd=mx-mn, s=dd ? dd/(1-Math.abs(2*l-1)) : 0;
  let h=0; if(dd){ h=mx===r ? ((g-b)/dd)%6 : mx===g ? (b-r)/dd+2 : (r-g)/dd+4; h*=60; }
  return hsl(h, Math.round(Math.max(s, 0.78)*100), luma(c)>0.75 ? 47 : 52);
}
const lvOf=(e, o)=>LV[(o && o.level) || (e && e.level)]||LV.max;

/* ───────── 色 ───────── */
// 字の 色（上・下）。urgent：のこり10秒（赤）・rainbow：桁ごとに パステル（ドド派手は 虹色に かわる）・col：1色
function colsOf(i, o, t, lv){
  if(o.urgent) return i%2 ? ['#ffe0a8', '#ff6a2f'] : ['#ffd2c8', '#ff3048'];
  if(lv.b>=2){ const h=i*47+t*70; return [hsl(h,95,82), hsl(h,92,57)]; }
  if(o.rainbow || !rgb(o.col) || luma(o.col)>0.9){ const c=PASTEL[i%PASTEL.length]; return [mix(c,'#ffffff',0.4), c]; }
  const c=deep(o.col); if(rgb(c)) return [mix(c,'#ffffff',0.45), c];
  const m=/hsla\(([-\d.]+),(\d+)%/.exec(c); return [m ? hsl(+m[1], +m[2], 76) : '#ffffff', c];
}

/* ───────── 地（パステルの 空と のぼる あわ）───────── */
const bubN=b=>b>=1 ? 20 : 14;
function bub(i, W, H, t){
  const r=(0.03+0.05*fr(i*3.1))*Math.min(W,H), span=H+2*r, v=t*H*0.05*(0.5+fr(i*1.3))+fr(i*5.1)*span;
  return {x:fr(i*7.7)*W+Math.sin(t*0.4+i)*W*0.02, y:H+r-(v%span), r, cyc:Math.floor(v/span)};
}
function bg(g, W, H, t, o, L){
  o=o||{}; L=L||{};
  const b=o.boost||0, hb=(t*6)%360;
  g.save(); g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.globalCompositeOperation='source-over';
  const gr=g.createLinearGradient(0,0,W,H);
  if(o.urgent){ const pu=0.5+0.5*Math.sin(t*6.3); gr.addColorStop(0, hsl(350,90,91-5*pu)); gr.addColorStop(1, hsl(22,92,85-5*pu)); }
  else { gr.addColorStop(0, hsl(hb,80,93)); gr.addColorStop(1, hsl(hb+60,85,86)); }
  g.fillStyle=gr; g.fillRect(0,0,W,H);
  if(b>=2){   // ドド派手：うしろで ゆっくり まわる 虹の 光
    const cx=W/2, cy=H*0.5, R=Math.hypot(W,H)*0.7, n=12;
    for(let i=0;i<n;i++){ const a=t*0.35+i*TAU/n; g.fillStyle=hsl(i*30+t*40, 95, 75, 0.18); g.beginPath(); g.moveTo(cx,cy); g.arc(cx, cy, R, a-0.11, a+0.11); g.closePath(); g.fill(); }
  }
  const n=bubN(b); L.bp=L.bp||{};
  for(let i=0;i<n;i++){
    const B=bub(i, W, H, t); if(L.bp[i]===B.cyc) continue;   // はじけた あわは 下から また 出てくるまで 出さない
    g.fillStyle=b>=2 ? hsl(i*41+t*30, 90, 92, 0.5) : 'rgba(255,255,255,.38)'; g.beginPath(); g.arc(B.x, B.y, B.r, 0, TAU); g.fill();
    if(b>=1){ g.strokeStyle='rgba(255,255,255,.7)'; g.lineWidth=Math.max(1, B.r*0.12); g.beginPath(); g.arc(B.x, B.y, B.r*0.68, Math.PI*1.1, Math.PI*1.45); g.stroke(); }
  }
  // はじけた あわの しぶき（うしろ）
  const dt=clamp(t-(L.blt==null ? t : L.blt), 0, 0.05); L.blt=t;
  if(L.bfx && L.bfx.length){ stepFx(L.bfx, dt); drawFx(g, L.bfx); }
  g.restore();
}
// あわを はじく（着地の ゆれで）
function popBubble(L, W, H, t, b){
  const n=bubN(b), vis=[]; L.bp=L.bp||{};
  for(let i=0;i<n;i++){ const B=bub(i, W, H, t); if(L.bp[i]!==B.cyc && B.y>B.r && B.y<H-B.r) vis.push([i,B]); }
  if(!vis.length) return;
  const [i,B]=pick(vis); L.bp[i]=B.cyc;
  const fx=L.bfx||(L.bfx=[]);
  fx.push({k:'r', x:B.x, y:B.y, col:'#ffffff', r0:B.r*0.8, r1:B.r*2.2, fl:1, age:0, life:0.45});
  for(let j=0;j<8;j++){ const a=j/8*TAU+rnd(-0.2,0.2), v=B.r*rnd(4,7); fx.push({k:'d', x:B.x+Math.cos(a)*B.r, y:B.y+Math.sin(a)*B.r, vx:Math.cos(a)*v, vy:Math.sin(a)*v, r:B.r*rnd(0.1,0.18), col:'#ffffff', gr:B.r*14, age:0, life:rnd(0.4,0.7)}); }
  if(fx.length>200) fx.splice(0, fx.length-200);
}

/* ───────── しぶき・輪・きらきら（自分で 描く）───────── */
function stepFx(list, dt){
  let j=0;
  for(let i=0;i<list.length;i++){
    const p=list[i]; p.age+=dt; if(p.age>=p.life) continue;
    if(p.k==='d' || p.k==='s'){
      p.vy+=(p.gr||0)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.dr){ const f=Math.pow(p.dr, dt*60); p.vx*=f; p.vy*=f; }
      if(p.fy!=null && p.y>p.fy){ p.y=p.fy; if(Math.abs(p.vy)>p.r*6){ p.vy*=-0.42; p.vx*=0.72; p.sq=p.age; } else { p.vy=0; p.vx*=0.9; } }   // 床で ぽよんと はずむ
    }
    list[j++]=p;
  }
  list.length=j;
}
function drawFx(g, list){
  for(const p of list){
    const a=p.age/p.life, al=a<0.7 ? 1 : 1-(a-0.7)/0.3;
    g.globalAlpha=clamp(al, 0, 1);
    if(p.k==='d'){   // ぷるぷるの 玉（床に 当たると つぶれる）
      const q=p.sq!=null ? Math.max(0, 1-(p.age-p.sq)/0.18) : 0, rx=p.r*(1+0.5*q), ry=p.r*(1-0.38*q);
      g.fillStyle=p.col; g.beginPath(); g.ellipse(p.x, p.y-ry*0.1, rx, ry, 0, 0, TAU); g.fill();
      if(p.r>2){ g.fillStyle='rgba(255,255,255,.75)'; g.beginPath(); g.arc(p.x-rx*0.32, p.y-ry*0.45, p.r*0.3, 0, TAU); g.fill(); }
    } else if(p.k==='r'){   // 床に 広がる 輪（つぶれた だ円）
      const e=1-Math.pow(1-a, 2.2), r=p.r0+(p.r1-p.r0)*e;
      g.strokeStyle=p.col; g.lineWidth=Math.max(1, p.r1*0.07*(1-a)); g.beginPath(); g.ellipse(p.x, p.y, r, r*(p.fl ? 1 : 0.3), 0, 0, TAU); g.stroke();
    } else if(p.k==='s'){   // きらきら（✦）
      const s=p.r*(1-a*0.6); g.fillStyle=p.col; g.beginPath();
      for(let i=0;i<8;i++){ const an=i*Math.PI/4, rr=i%2 ? s*0.32 : s; g.lineTo(p.x+Math.cos(an)*rr, p.y+Math.sin(an)*rr); }
      g.closePath(); g.fill();
    }
  }
  g.globalAlpha=1;
}
function addFx(L, p, cap){ const fx=L.fx||(L.fx=[]); if(fx.length>=cap) fx.splice(0, fx.length-cap+1); fx.push(p); }

/* ───────── 数字が かわった ことを 見る（右に そろえる）───────── */
function update(L, str, t, intro, j0){
  j0=j0||0; if(L.str===str) return j0;
  const chars=Array.from(str), n=chars.length, old=L.cells||[], first=L.str==null;
  const sp=first ? 1 : clamp((t-(L.chg==null ? -9 : L.chg))/0.55, 0.3, 1);   // すぐ また かわる ときは 動きを 短く
  const cells=new Array(n);
  for(let i=0;i<n;i++){
    const ch=chars[i], k=/[0-9]/.test(ch) ? 'd' : 'c', o=old[old.length-n+i];
    if(o && o.ch===ch){ cells[i]=o; continue; }
    if(first && !intro){ cells[i]={ch, k, prev:null, t0:-1e9, sp:1, sq:true, landed:true}; continue; }
    cells[i]={ch, k, prev:o && o.k==='d' && k==='d' ? o.ch : null, t0:t, sp, sq:false, landed:false, x:o ? o.x : null};
  }
  let j=j0; for(const c of cells) if(c.t0===t && c.k==='d'){ c.t0=t+j*0.07*sp; j++; }   // 左から 順に ぽよぽよ（いくつかの 行は 上の 行から つづけて）
  // 消えた 桁（左の ほう）：その 場所で つぶれる
  if(old.length>n) old.slice(0, old.length-n).forEach(o=>{ if(o.k==='d' && o.x!=null) (L.ghosts=L.ghosts||[]).push({ch:o.ch, x:o.x, cols:o.cols, t0:t, sp}); });
  L.cells=cells; L.str=str; L.chg=t; L.nchg=Math.max(1, j-j0); L.batch=(L.batch||0)+1; if(first) L.introB=L.batch;
  return j;
}
const ROWK=['cells','str','lay','ghosts','chg','nchg','batch','introB','sqB','txB','sndB','base','rfs'];
function resetRow(R){ for(const k of ROWK) delete R[k]; }

/* ───────── 数字 1つ ───────── */
function jDigit(g, ch, x, base, fs, sx, sy, cols, alpha, sh){
  if(alpha<=0.01 || !ch || !ch.trim()) return;
  g.save(); g.translate(x, base); g.scale(sx, sy); g.globalAlpha=Math.min(1, alpha);
  g.lineJoin='round'; g.lineWidth=fs*0.1; g.strokeStyle='#ffffff';
  if(sh){ g.shadowColor='rgba(60,40,90,.24)'; g.shadowBlur=fs*0.08; g.shadowOffsetY=fs*0.05; }
  g.strokeText(ch, 0, 0); g.shadowColor='transparent'; g.shadowBlur=0; g.shadowOffsetY=0;
  const gr=g.createLinearGradient(0,-fs*0.75,0,0); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
  g.fillStyle=gr; g.fillText(ch, 0, 0);
  g.restore();
}
function ball(g, x, y, r, cols){
  const gr=g.createRadialGradient(x-r*0.35, y-r*0.35, r*0.1, x, y, r); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
  g.fillStyle='#ffffff'; g.beginPath(); g.arc(x, y, r*1.28, 0, TAU); g.fill();
  g.fillStyle=gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// 字の 幅（数字は いちばん 広い 数字の 幅に そろえて、かわっても ずれない）。100px で はかって 覚えておく
function measure(g, L, cells){
  const key=cells.map(c=>c.k==='d' ? 'd' : c.ch).join('');
  if(L.lay && L.lay.key===key) return L.lay;
  g.save(); g.font='bold 100px '+FONT;
  let dw=0; for(const c of '0123456789') dw=Math.max(dw, g.measureText(c).width);
  const cw=Math.max(g.measureText(':').width, 30), m=g.measureText('8'), asc=m.actualBoundingBoxAscent||72, des=m.actualBoundingBoxDescent||0;
  g.restore();
  const ws=cells.map(c=>c.k==='d' ? dw : c.ch===':' ? cw : cw*0.66), gap=4;
  return (L.lay={key, ws, gap, tw:ws.reduce((a,b)=>a+b,0)+gap*Math.max(0, cells.length-1), asc, des});
}

/* ───────── 動きに 合わせた 演出 ───────── */
// P：ぜんぶで 1つ（しぶき・ぴょん・音の 間）・R：行ごと（字の 動き・いっしょに かわった 数）。1行の ときは P と R は 同じ
const sndOnce=(P, o, name, k)=>{ if(!o.snd) return; const n=performance.now(); if(n-(P.sndAt||0)<120) return; P.sndAt=n; try{ o.snd(name, k); }catch(_){} };
// つぶれる：数字の 色の しぶきが 左右に はねる
function squashFx(e, P, R, x, base, fs, cols, lv, o, imp){
  const cap=CAP[(e && e.level)||'max']||260, n=Math.round((4+3*Math.min(imp,4))*lv.k);
  for(let i=0;i<n;i++){ const side=i%2 ? 1 : -1, a=rnd(0.08, 0.48)*Math.PI, v=fs*rnd(2.2, 4.6)*(lv.b>=2 ? 1.25 : 1);
    addFx(P, {k:'d', x:x+side*fs*rnd(0.12,0.3), y:base-fs*rnd(0.02,0.12), vx:side*Math.cos(a)*v, vy:-Math.sin(a)*v, r:fs*rnd(0.03,0.075), col:Math.random()<0.22 ? '#ffffff' : cols[1], gr:fs*9, fy:base+fs*0.05, age:0, life:rnd(0.8,1.3)}, cap); }
  if(e && lv.b>=0) e.burst(x, base-fs*0.2, {n:5+2*Math.min(imp,3), sp:200*(1+0.3*lv.b), pal:[cols[1], '#ffffff', cols[0]], ring:false, life:0.7});
  if(R.sqB!==R.batch && (imp>=2 || lv.b>=2)){ R.sqB=R.batch; sndOnce(P, o, 'pecha'); }
}
// 着地：床に しぶきの 輪・はねる 玉・きらきら・（ド派手）ゆれ・あわが はじける・「ぽよん！」
function landFx(e, P, R, x, base, fs, cols, lv, o, imp, hop){
  const cap=CAP[(e && e.level)||'max']||260, W=e ? e.W : (o.W||1), H=e ? e.H : (o.H||1), t=o.t;
  addFx(P, {k:'r', x, y:base+fs*0.05, col:cols[1], r0:fs*0.12, r1:fs*(0.62+0.22*Math.max(0,lv.b))*(hop ? 0.8 : 1), age:0, life:0.55}, cap);
  if(lv.k>=0.6) addFx(P, {k:'r', x, y:base+fs*0.05, col:'#ffffff', r0:fs*0.08, r1:fs*(0.42+0.16*Math.max(0,lv.b)), age:0, life:0.42}, cap);
  const n=Math.round((3+2*Math.min(imp,4))*lv.k*(hop ? 0.6 : 1));
  for(let i=0;i<n;i++){ const side=i%2 ? 1 : -1, a=rnd(0.05, 0.3)*Math.PI, v=fs*rnd(1.6, 3.4);
    addFx(P, {k:'d', x:x+side*fs*0.3, y:base, vx:side*Math.cos(a)*v, vy:-Math.sin(a)*v, r:fs*rnd(0.025,0.055), col:i%3 ? cols[1] : cols[0], gr:fs*10, fy:base+fs*0.05, age:0, life:rnd(0.6,1.0)}, cap); }
  if(lv.k>=0.6) for(let i=0;i<Math.round(2*lv.k);i++) addFx(P, {k:'s', x:x+rnd(-fs*0.35, fs*0.35), y:base-fs*rnd(0.55,0.95), vx:rnd(-fs*0.4, fs*0.4), vy:-fs*rnd(0.4,1.1), r:fs*rnd(0.05,0.09), col:Math.random()<0.5 ? '#ffffff' : cols[0], gr:0, dr:0.95, age:0, life:rnd(0.45,0.8)}, cap);
  if(!e) return;
  if(lv.b>=1){
    e.kick((0.06+0.06*lv.b)*(hop ? 0.7 : 1)*(imp>=2 ? 1.3 : 1));
    popBubble(o.bgL||P, W, H, t, lv.b); if(lv.b>=2 && Math.random()<0.5) popBubble(o.bgL||P, W, H, t, lv.b);
    const fresh=hop ? P.hopTx!==P.hopT && P.hopQuiet!==P.hopT : R.txB!==R.batch && R.introB!==R.batch;   // 字は 1回の 動きに 1つ（はじめに 落ちて くる とき・0 の しめくくりは 出さない）
    if(fresh && t-(P.txAt==null ? -9 : P.txAt)>0.3 && (imp>=2 || (lv.b>=2 && Math.random()<0.3))){ if(hop) P.hopTx=P.hopT; else R.txB=R.batch; P.txAt=t; const sz=clamp(fs/e.d*0.28+14, 18, 54);
      const hw=sz*e.d*2.7; e.text(clamp(x, Math.min(W/2, hw), Math.max(W/2, W-hw)), Math.max(H*0.08, base-fs*1.05), hop ? 'ぴょん！' : 'ぽよん！', {sz, pop:true, life:0.9, vy:-50, rot:rnd(-0.15,0.15), grad:['#ffffff', cols[0], cols[1]]}); }
  }
  if(lv.b>=2) e.emoji(x, base-fs*0.55, ['🫧','✨','💖','⭐'], {n:hop ? 1 : 2, sp:420, up:true, sz:26});
  if(hop){ if(P.hopSnd!==P.hopT){ P.hopSnd=P.hopT; sndOnce(P, o, 'poyon', 1); } }
  else if(R.sndB!==R.batch && (imp>=2 || o.urgent || lv.b>=2)){ R.sndB=R.batch; sndOnce(P, o, 'poyon', imp>=2 ? 2 : 1); }
}

/* ───────── 1行を 描く ───────── */
// cx0：行の まん中・base：床の 高さ・fs：字の 大きさ・H0：落ちてくる 高さ・ci0：色の 番号の はじめ（行を またいで 色が つづく）・
// roof：はねても ここより 上に 出ない（画面の 上・縦に 積んだ ときは 上の 行の 床）
function drawRow(g, e, P, R, lay, cx0, base, fs, H0, o, lv, ci0, sh, roof){
  const t=o.t, k=fs/100, tw=lay.tw*k, asc=lay.asc*k, gap=lay.gap*k, imp=R.nchg||1, cap=CAP[(e && e.level)||'max']||260;
  R.base=base; R.rfs=fs; roof=roof||0;
  const room=Math.max(fs*0.05, base-asc*1.16-fs*0.08-roof);   // はねる 高さの 上限
  g.font='bold '+Math.round(fs)+'px '+FONT; g.textAlign='center'; g.textBaseline='alphabetic';
  // 消えた 桁（つぶれて 消える）
  if(R.ghosts && R.ghosts.length){
    R.ghosts=R.ghosts.filter(q=>t-q.t0<0.35*q.sp);
    for(const q of R.ghosts){ const p=(t-q.t0)/(0.35*q.sp), cols=q.cols||colsOf(ci0, o, t, lv); if(!q.fx){ q.fx=true; squashFx(e, P, R, q.x, base, fs, cols, lv, o, imp); } jDigit(g, q.ch, q.x, base, fs, 1+0.6*p, 1-0.85*p, cols, 1-p, false); }
  }
  let x=cx0-tw/2, top=base-asc;
  (R.cells||[]).forEach((c,i)=>{
    const w=lay.ws[i]*k, cx=x+w/2, ci=ci0+i; x+=w+gap; c.x=cx;
    const cols=colsOf(ci, o, t, lv); c.cols=cols;
    if(c.k==='c'){   // 区切り：「:」は 2つの 玉が かわりばんこに はねる・「,」「.」は 1つ
      const bob=ph=>Math.abs(Math.sin(t*3+ph))*fs*0.06;
      if(c.ch===':'){ for(const [kk,ph] of [[0.62,0],[0.25,Math.PI]]) ball(g, cx, base-asc*kk-bob(ph), fs*0.065, cols); }
      else if(c.ch.trim()) ball(g, cx, base-fs*0.07-bob(ci), fs*0.06, cols);
      return;
    }
    const s=c.sp||1, p=t-c.t0, T_ST=0.12*s, T_FALL=0.36*s, T_END=T_ST+T_FALL+1.0*s+0.15;
    if(p<0){ if(c.prev!=null) jDigit(g, c.prev, cx, base, fs, 1, 1, cols, 1, sh); return; }   // 順番 待ち：前の 数字の まま
    if(c.prev!=null && p<0.35*s){ const q=p/(0.35*s); jDigit(g, c.prev, cx, base, fs, 1+0.6*q, 1-0.85*q, cols, 1-q, false); }   // 前の 数字：つぶれて 消える
    if(c.prev!=null && !c.sq){ c.sq=true; squashFx(e, P, R, cx, base, fs, cols, lv, o, imp); }
    let dy=0, sx=1, sy=1, show=true, hgt=0;
    if(p<T_END){
      if(p<T_ST) show=false;
      else if(p<T_ST+T_FALL){   // 上から 落ちてくる（のびる）
        const q=(p-T_ST)/T_FALL; dy=-(1-q*q)*H0*s; sy=1.12; sx=0.9; hgt=1-q*q;
        const ty=base+dy-fs*rnd(0.2,0.7);
        if(lv.k>=0.6 && ty>roof && Math.random()<0.55*lv.k) addFx(P, {k:'s', x:cx+rnd(-fs*0.25, fs*0.25), y:ty, vx:0, vy:-fs*0.3, r:fs*rnd(0.035,0.06), col:Math.random()<0.5 ? '#ffffff' : cols[0], gr:0, dr:0.93, age:0, life:0.35}, cap);
      } else {   // 着いて ぷるん（ドド派手は 何度も はずむ）
        if(!c.landed){ c.landed=true; landFx(e, P, R, cx, base, fs, cols, lv, o, imp, false); }
        const q=(p-T_ST-T_FALL)/s, damp=Math.exp(-q*5.5)*Math.cos(q*21), amp=1+0.25*Math.max(0, lv.b);
        sy=1-0.32*amp*damp; sx=1+0.24*amp*damp;
        if(lv.b>=2){ const hp=Math.min(room, H0*0.2*s)*Math.exp(-q*3.2)*Math.abs(Math.sin(q*8.5)); dy-=hp; hgt=hp/H0; }
        if(lv.b>=1 && Math.abs(damp)>0.3 && Math.random()<0.25) addFx(P, {k:'s', x:cx+rnd(-fs*0.3, fs*0.3), y:base-fs*rnd(0.6,0.9), vx:rnd(-fs*0.3,fs*0.3), vy:-fs*rnd(0.3,0.8), r:fs*0.05, col:'#ffffff', gr:0, dr:0.95, age:0, life:0.5}, cap);
      }
    } else { const b=Math.sin(t*2.6+ci*0.7); dy=-Math.abs(b)*fs*0.03; sy=1+b*0.02; sx=1-b*0.015; }   // いつもは ゆらゆら
    // みんなで ぴょん（hop）
    if(P.hopT!=null){
      const q=(t-P.hopT-ci*0.06)/0.5;
      if(q>=0 && q<1){ const s2=Math.sin(Math.PI*q), lift=Math.min(fs*(0.3+0.12*(P.hopK||1))*(lv.b>=2 ? 1.3 : 1), room);   // 画面の 上（上の 行の 床）から 出ない 高さまで
        dy-=s2*lift; sy*=1+0.14*s2; sx*=1-0.1*s2; hgt=Math.max(hgt, s2*0.4); }
      else if(q>=1 && q<2.4){ if(c.hopL!==P.hopT){ c.hopL=P.hopT; landFx(e, P, R, cx, base, fs, cols, lv, o, 1+Math.round(P.hopK||1), true); } const qq=(q-1)*0.5, dm=Math.exp(-qq*5.5)*Math.cos(qq*21); sy*=1-0.24*dm; sx*=1+0.18*dm; }
    }
    if(!show) return;
    // 床の かげ（高い ところに いる ほど 小さく うすく）
    g.fillStyle='rgba(70,40,110,'+(0.16*(1-clamp(hgt,0,1))).toFixed(3)+')'; g.beginPath(); g.ellipse(cx, base+fs*0.07, fs*0.3*(1-0.5*clamp(hgt,0,1))*sx, fs*0.05, 0, 0, TAU); g.fill();
    jDigit(g, c.ch, cx, base+dy, fs, sx, sy, cols, 1, sh);
    top=Math.min(top, base+dy-asc*sy);
  });
  return top;
}

/* ───────── 描く ───────── */
// box：数字を 置く 場所 {x,y,w,h}（canvas の 点）。o：t（秒）・col（1色）・rainbow・urgent（のこり10秒）・sub（下の 小さな 字）・
//   snd（音を 鳴らす 関数）・bgL（地の あわを 覚える もの）・intro（はじめに 落ちてくる）・level
function draw(g, e, box, str, o, L){ return drawRows(g, e, box, [{str, k:1}], o, L); }
const GV=24, GH=30;   // 行の あいだ（100px の 字に 対して。縦・横）
const cellsOf=s=>Array.from(String(s)).map(ch=>({ch, k:/[0-9]/.test(ch) ? 'd' : 'c'}));
// いちばん 大きい 行（k=1）の 字の 大きさ（100px で はかった 字の 形 lays から）
function fitF(lays, ks, box, dir, sub){
  const n=lays.length;
  if(dir==='v'){
    const W100=Math.max(...lays.map((l,i)=>l.tw*ks[i])), H100=lays.reduce((a,l,i)=>a+(l.asc+l.des)*ks[i], 0)+GV*(n-1)+(sub ? 40 : 0);
    return 100*Math.min(box.w*0.92/Math.max(1, W100), box.h*0.94/Math.max(1, H100));
  }
  const W100=lays.reduce((a,l,i)=>a+l.tw*ks[i], 0)+GH*(n-1), H100=Math.max(...lays.map((l,i)=>(l.asc+l.des)*ks[i]));
  return 100*Math.min(box.w*0.92/Math.max(1, W100), box.h*(sub ? 0.6 : 0.7)/Math.max(1, H100));
}
// 並べ方を くらべる ため（描かずに 字の 大きさだけ）
function fit(g, box, rows, dir, sub){ return fitF(rows.map(r=>measure(g, {}, cellsOf(r.str))), rows.map(r=>r.k||1), box, rows.length>1 && dir==='v' ? 'v' : 'h', sub); }
// いくつかの 行に 分けて 描く（v590）。rows：[{str, k}]（k：大きさ。1 が いちばん 大きい）・
//   o.dir：'v'（縦に 積む）／'h'（横に 並べて 床を そろえる。あいだに 小さな「:」）
function drawRows(g, e, box, rows, o, L){
  o=Object.assign({}, o); L=L||{};
  const t=o.t!=null ? o.t : (e ? e.t : performance.now()/1000), lv=lvOf(e, o), d=e ? e.d : (o.d||1); o.t=t;
  const dt=clamp(t-(L.lt==null ? t : L.lt), 0, 0.05); L.lt=t;
  const n=rows.length, multi=n>1, dir=multi && o.dir==='v' ? 'v' : 'h', sub=o.sub ? String(o.sub) : '', intro=o.intro!==false;
  // 1行は L に そのまま 覚える（カウンター・タイマー）。いくつかの 行は L.rows に 行ごと（行の 組が かわったら 作りなおして 落ち直す）
  if(multi){ const key=n+dir; if(L.rkey!==key){ L.rkey=key; L.rows=[]; resetRow(L); } }
  else if(L.rows){ L.rows=null; L.rkey=null; resetRow(L); }
  L.dir=multi ? dir : '';
  const RS=multi ? rows.map((r,i)=>L.rows[i]||(L.rows[i]={})) : [L];
  let j=0; rows.forEach((r,i)=>{ j=update(RS[i], String(r.str==null ? '' : r.str), t, intro, j); });
  if(multi) L.str=RS.map(R=>R.str).join('|');
  const lays=RS.map(R=>measure(g, R, R.cells||[])), ks=rows.map(r=>r.k||1);
  const ci0=RS.map((R,i)=>RS.slice(0,i).reduce((a,Q)=>a+(Q.cells||[]).length, 0));
  const F=Math.max(8*d, fitF(lays, ks, box, dir, sub));
  L.fs=L.fs==null || F>L.fs*1.6 || F<L.fs*0.6 ? F : L.fs+(F-L.fs)*Math.min(1, dt*9);   // 大きさは なめらかに かえる
  const Fs=L.fs, sh=Fs/d>=26, cx=box.x+box.w/2;
  let top=Infinity, subY=0;
  g.save();
  if(dir==='v'){
    const gap=GV*Fs/100, hs=lays.map((l,i)=>(l.asc+l.des)*ks[i]*Fs/100), blockH=hs.reduce((a,b)=>a+b, 0)+gap*(n-1);
    let y=box.y+(box.h-blockH-(sub ? Fs*0.4 : 0))/2;
    const pos=rows.map((r,i)=>{ const fs=Fs*ks[i], base=y+lays[i].asc*fs/100; y+=hs[i]+(i<n-1 ? gap : 0); return [fs, base]; });
    // 下の 行の 数字は 1つ 上の 行の 床の 下から 出てきて 落ちる（上の 行の 数字と まざって 読めなく ならない）。下の 行から 描いて 上の 行の かげを 重ねる
    for(let i=n-1;i>=0;i--){
      const [fs, base]=pos[i];
      if(!i){ top=Math.min(top, drawRow(g, e, L, RS[0], lays[0], cx, base, fs, ((base-box.y)*1.05+fs*0.5)*(lv.b>=2 ? 1.25 : 1), o, lv, ci0[0], sh, 0)); continue; }
      const roof=pos[i-1][1]+pos[i-1][0]*0.07;   // 上の 行の 床（かげの まん中）
      g.save(); g.beginPath(); g.rect(-1e5, roof, 2e5, 2e5); g.clip();
      top=Math.min(top, drawRow(g, e, L, RS[i], lays[i], cx, base, fs, base-roof+fs*0.08, o, lv, ci0[i], sh, roof));
      g.restore();
    }
    subY=y+Fs*0.24;
  } else {
    const gap=GH*Fs/100, ws=lays.map((l,i)=>l.tw*ks[i]*Fs/100), totalW=ws.reduce((a,b)=>a+b, 0)+gap*(n-1);
    const ascM=Math.max(...lays.map((l,i)=>l.asc*ks[i]))*Fs/100, desM=Math.max(...lays.map((l,i)=>l.des*ks[i]))*Fs/100;
    const base=box.y+box.h*(sub ? 0.46 : 0.53)+(ascM-desM)/2;
    let x=box.x+(box.w-totalW)/2;
    rows.forEach((r,i)=>{
      const l=lays[i], fs=Fs*ks[i], H0=((base-box.y)*1.05+fs*0.5)*(lv.b>=2 ? 1.25 : 1);
      if(i){   // 前の 行との あいだに 小さな「:」（この 行の 大きさで）
        const gx=x-gap/2, asc=l.asc*fs/100, cols=colsOf(ci0[i]-1, o, t, lv);
        for(const [kk,ph] of [[0.62,0],[0.25,Math.PI]]) ball(g, gx, base-asc*kk-Math.abs(Math.sin(t*3+ph))*fs*0.06, fs*0.065, cols);
      }
      top=Math.min(top, drawRow(g, e, L, RS[i], l, x+ws[i]/2, base, fs, H0, o, lv, ci0[i], sh));
      x+=ws[i]+gap;
    });
    subY=base+Fs*0.36;
  }
  // しぶき（前）
  if(L.fx && L.fx.length){ stepFx(L.fx, dt); drawFx(g, L.fx); }
  // 下の 小さな 字（午前・ラップ・がんばれ など）
  if(sub){
    const ss=clamp(Fs*0.16, 11*d, 34*d); g.font='bold '+Math.round(ss)+'px '+FONT; g.textAlign='center'; g.textBaseline='middle';
    const sw=g.measureText(sub).width+ss*1.2, sh2=ss*1.5;
    g.fillStyle='rgba(255,255,255,.72)'; g.beginPath(); g.ellipse(cx, subY, sw/2, sh2/2, 0, 0, TAU); g.fill();
    g.fillStyle=o.urgent ? '#c81e3a' : '#6b5a8e'; g.fillText(sub, cx, subY+ss*0.04);
  }
  g.restore();
  L.head=[cx, Math.max(box.y, isFinite(top) ? top : box.y)]; L.base=RS[RS.length-1].base;
  return L;
}
// みんなで ぴょんと はねる（k：強さ 1〜2）
function hop(L, t, k){ if(!L) return; L.hopT=t; L.hopK=k||1; }
// 0 に なった とき（タイマー）：ぜんぶの 桁から 大しぶき・「ぽよよ〜ん！」・みんなで ぴょん
function finish(e, L, snd){
  if(!e || !L) return;
  const W=e.W, H=e.H, lv=lvOf(e), cap=CAP[e.level]||260, RS=L.rows && L.rows.length ? L.rows : [L];
  const pts=[]; for(const R of RS){ const fs=R.rfs||L.fs||Math.min(W,H)*0.3, base=R.base||H*0.55; for(const c of R.cells||[]) if(c.k==='d' && c.x!=null) pts.push([c.x, base, fs, c.cols||['#ffd2e6','#ff5f8f']]); }
  if(!pts.length) pts.push([W/2, L.base||H*0.55, L.fs||Math.min(W,H)*0.3, ['#ffd2e6','#ff5f8f']]);
  for(const [x,base,fs,cols] of pts){
    for(let i=0;i<Math.round(9*lv.k);i++){ const a=rnd(0.1,0.9)*Math.PI, v=fs*rnd(2.5,5.5); addFx(L, {k:'d', x, y:base-fs*0.2, vx:Math.cos(a)*v*(Math.random()<0.5 ? -1 : 1), vy:-Math.sin(a)*v, r:fs*rnd(0.025,0.06), col:Math.random()<0.25 ? '#ffffff' : pick([cols[0], cols[1]]), gr:fs*8, fy:base+fs*0.05, age:0, life:rnd(1.1,1.8)}, cap); }
    addFx(L, {k:'r', x, y:base+fs*0.05, col:cols[1], r0:fs*0.2, r1:fs*1.3, age:0, life:0.8}, cap);
  }
  const fb=pts[pts.length-1];
  e.after(0.15, ()=>addFx(L, {k:'r', x:W/2, y:fb[1]+fb[2]*0.05, col:'#ffffff', r0:fb[2]*0.3, r1:Math.max(W,H)*0.6, age:0, life:0.9}, cap));
  e.confetti(120); e.emoji(W/2, H*0.92, ['🫧','🎉','✨','💖','⭐'], {n:14, up:true, sp:900, sz:40}); e.kick(1); e.flash('#ffffff', 0.32);
  e.text(W/2, H*0.68, 'ぽよよ〜ん！', {sz:clamp(W/e.d/8, 28, 72), pop:true, life:1.8, vy:-30, grad:['#ffffff','#ffb3e6','#a26bff']});
  if(snd){ snd('poyon', 2); e.after(0.28, ()=>snd('poyon', 1)); e.after(0.5, ()=>snd('level')); }
  hop(L, e.t+0.55, 2); L.hopQuiet=L.hopT;   // この ぴょん は 字を 出さない（上の「TIME UP!」と 重ならない ように）
}
// たしかめ用（いまの ようす）。いくつかの 行の ときは str を「|」で つなぐ
function info(L){
  L=L||{}; const multi=!!(L.rows && L.rows.length), RS=multi ? L.rows : [L], t=L.lt||0;
  const cells=[].concat(...RS.map(R=>R.cells||[])), ds=cells.filter(c=>c.k==='d');
  return {str:RS.map(R=>R.str||'').join(multi ? '|' : ''), rows:RS.length, dir:L.dir||'', cells:cells.map(c=>c.ch).join(''),
    moving:ds.filter(c=>t-c.t0<(0.12+0.36+1.15)*(c.sp||1)).length, sp:ds.length ? +Math.min(...ds.map(c=>c.sp||1)).toFixed(2) : 1, landed:ds.filter(c=>c.landed).length,
    fx:(L.fx||[]).length, bfx:(L.bfx||[]).length, popped:Object.keys(L.bp||{}).length, nchg:Math.max(0, ...RS.map(R=>R.nchg||0)), fs:L.fs ? Math.round(L.fs) : 0,
    rfs:RS.map(R=>Math.round(R.rfs||0)), hop:L.hopT!=null, head:L.head ? L.head.map(n=>Math.round(n)) : null};
}
window.HADE_POYO={ PASTEL, bg, draw, drawRows, fit, hop, finish, info, popBubble };
})();
