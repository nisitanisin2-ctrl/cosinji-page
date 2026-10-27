/* 🖼 ど派手タイマーの 見せ方（v580。⏱ ど派手タイマーで 使う。hade-timer.js の 前に 読む）
   ・⭕ 光の輪（いままで。hade-timer.js で 描く）・🔠 画面いっぱい・🎞 絵が 動く・🐾 動物 の 4つ。
   ・🔠 画面いっぱい：画面を うめる 大きな 数字が 1秒ごとに どんっと 入れかわる（前の 数字は 大きく なって 消える）。
     のこり1分からは 秒だけ。うしろに 残りの 時間ぶんの 色の 帯（波うつ）。のこり10秒は 赤く どきどき。
   ・🎞 絵が 動く：🚀 ロケット（燃料が たまり、0 で 発射）・🕯 ろうそく（短く なって、0 で ふっと 消える）・
     ⏳ 砂時計（砂が 落ちて、0 で くるっと）・💣 ばくだん（火が 導火線を 進んで、0 で ドカーン）・🎈 風船（ふくらんで、0 で パーン）・
     🌻 花（芽が 出て のびて、0 で さく）。
   ・🐾 動物（v581：動物が 自分で 数える）：🐱 ねこ＝めくりの 数字板・🐰 うさぎ＝なわとび・🐶 いぬ＝ほえる・🐧 ペンギン＝指揮・
     🐸 かえる＝鳴く・🐻 くま＝太鼓。1秒ごとに 数える 動きを して、道具に 時間が 出る。残りが へるほど 空が 夕やけに なり 顔も 真剣に。
     のこり10秒は 数を さけび、0 で 大よろこび。くり返しの 休む あいだは ねる。
   ・🫧 ぽよん（v589。描き方は hade-poyo.js）：📢 電光掲示板の ぽよん と 同じ。前の 数字が つぶれて、新しい 数字が 落ちてきて ぷるんと はずむ。
     しぶき・床の 輪・ゆれ・はじける あわ・「ぽよん！」の 字と 音（演出の 強さで ふえる）。5秒ごとの 演出と 0 の あとは みんなで ぴょん。
   ・絵は すべて canvas に その場で 描く（画像の ファイルは 使わない）。
   ・S（その こまの ようす）は hade-timer.js が 作る：p（進み 0〜1）・str（時間の 字）・sec・mode・ph・last10・paused・done・doneT・tickT・bot など。
     L は 見せ方ごとの 覚えておく もの（煙の 粒・前の 数字・動物の 位置 など）。 */
(function(){
'use strict';
if(window.HADE_LOOK) return;
const LOOKS=[['ring','⭕ 光の輪'],['big','🔠 画面 いっぱい'],['poyo','🫧 ぽよん'],['pic','🎞 絵が 動く'],['ani','🐾 動物']];
const PICS=[['rocket','🚀 ロケット'],['candle','🕯 ろうそく'],['sand','⏳ 砂時計'],['bomb','💣 ばくだん'],['balloon','🎈 風船'],['flower','🌻 花']];
const ANIS=[['neko','🐱 ねこ'],['usagi','🐰 うさぎ'],['inu','🐶 いぬ'],['pen','🐧 ペンギン'],['kaeru','🐸 かえる'],['kuma','🐻 くま']];
const END={rocket:'発射！', candle:'おしまい', sand:'おわり', bomb:'ドカーン！', balloon:'パーン！', flower:'さいた！'};
const NUMF='"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Segoe UI",Roboto,sans-serif';
const TAU=Math.PI*2, INK='#5b3a29';
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,k)=>a+(b-a)*k, sm=k=>{ k=clamp(k,0,1); return k*k*(3-2*k); };
const has=(list,k)=>list.some(x=>x[0]===k);
const rnd=(a,b)=>a+Math.random()*(b-a);
function rgb(hex){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return '255,255,255'; const n=parseInt(m[1],16); return [(n>>16)&255,(n>>8)&255,n&255].join(','); }
function seeded(n){ let s=(n|0)||1; return ()=>((s=(s*16807)%2147483647)-1)/2147483646; }

/* ───────── 描く 道具 ───────── */
function rr(g,x,y,w,h,r){ r=Math.max(0,Math.min(r,w/2,h/2)); g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function oval(g,x,y,rx,ry,rot){ g.beginPath(); g.ellipse(x,y,Math.max(0.01,rx),Math.max(0.01,ry),rot||0,0,TAU); }
function paint(g,fill,line,lw){ if(fill){ g.fillStyle=fill; g.fill(); } if(line){ g.strokeStyle=line; g.lineWidth=lw||1; g.stroke(); } }
function lin(g,x0,y0,x1,y1,cs){ const gr=g.createLinearGradient(x0,y0,x1,y1); cs.forEach((c,i)=>gr.addColorStop(i/(cs.length-1),c)); return gr; }
function rad(g,x,y,r0,r1,cs){ const gr=g.createRadialGradient(x,y,Math.max(0,r0),x,y,Math.max(r0+0.01,r1)); cs.forEach((c,i)=>gr.addColorStop(i/(cs.length-1),c)); return gr; }
function cloud(g,x,y,s,a,col){
  g.save(); g.globalAlpha=a==null?1:a; g.fillStyle=col||'#ffffff'; g.beginPath();
  [[0,0,1],[1.05,-0.45,1.2],[2.15,-0.05,0.95],[1.05,0.22,1.05]].forEach(([dx,dy,k])=>{ g.moveTo(x+dx*s+k*s, y+dy*s); g.arc(x+dx*s, y+dy*s, k*s, 0, TAU); });
  g.fill(); g.restore();
}
// 時間の 札（丸い 帯に 大きな 字）
function pill(g,text,x,y,fs,o){
  o=o||{}; g.save(); g.font='900 '+Math.round(fs)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle';
  const w=g.measureText(text).width+fs*0.9, h=fs*1.32;
  rr(g, x-w/2, y-h/2, w, h, h/2); g.fillStyle=o.bg||'rgba(0,0,0,.5)'; g.fill();
  g.strokeStyle=o.line||'rgba(255,255,255,.55)'; g.lineWidth=Math.max(1, fs*0.05); g.stroke();
  g.fillStyle=o.col||'#ffffff'; g.fillText(text, x, y+fs*0.04); g.restore();
}
// ふきだし（tx,ty は しっぽの 先）
function bubble(g,text,x,y,fs,tx,ty,o){
  o=o||{}; g.save(); g.font='900 '+fs+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle';
  const w=g.measureText(text).width+fs*1.1, h=fs*1.6;
  if(o.minX!=null) x=Math.max(o.minX+w/2, x); if(o.maxX!=null) x=Math.min(o.maxX-w/2, x);
  tx=clamp(tx, x-w/2+fs*0.6, x+w/2-fs*0.6);
  g.beginPath(); rr(g, x-w/2, y-h/2, w, h, h*0.45); g.fillStyle=o.bg||'#ffffff'; g.fill();
  g.beginPath(); g.moveTo(x-fs*0.35, y+h/2-1); g.lineTo(tx, ty); g.lineTo(x+fs*0.45, y+h/2-1); g.closePath(); g.fill();
  g.strokeStyle=o.line||INK; g.lineWidth=fs*0.08; rr(g, x-w/2, y-h/2, w, h, h*0.45); g.stroke();
  g.beginPath(); g.moveTo(x-fs*0.35, y+h/2); g.lineTo(tx, ty); g.lineTo(x+fs*0.45, y+h/2); g.stroke();
  g.fillStyle=o.bg||'#ffffff'; g.fillRect(x-fs*0.3, y+h/2-fs*0.12, fs*0.7, fs*0.16);
  g.fillStyle=o.col||INK; g.fillText(text, x, y+fs*0.05); g.restore();
}
// 夜空の 星（L に 位置を 覚える）
function stars(g,L,B,t,ybot,a){
  if(!L.stars){ const r=seeded(7); L.stars=Array.from({length:46},()=>[r(), r(), r()*6, 0.3+r()*0.9]); }
  g.save(); g.fillStyle='#ffffff';
  for(const [sx,sy,ph,s] of L.stars){ const x=B.xl+sx*(B.xr-B.xl), y=B.yt+sy*(ybot-B.yt); g.globalAlpha=a*(0.35+0.65*Math.abs(Math.sin(t*1.3+ph))); g.beginPath(); g.arc(x, y, s*0.55, 0, TAU); g.fill(); }
  g.restore();
}
// 下向きの 炎（ロケット）
function jet(g,x,y,w,len,t){
  g.save(); g.globalCompositeOperation='lighter';
  g.fillStyle=rad(g, x, y+len*0.35, 0, len, ['rgba(255,236,170,.6)','rgba(255,150,40,.28)','rgba(255,80,0,0)']); g.beginPath(); g.arc(x, y+len*0.35, len, 0, TAU); g.fill();
  const f=1+0.12*Math.sin(t*47)+0.06*Math.sin(t*31);
  g.beginPath(); g.moveTo(x-w, y); g.quadraticCurveTo(x-w*0.9, y+len*0.55*f, x, y+len*f); g.quadraticCurveTo(x+w*0.9, y+len*0.55*f, x+w, y); g.closePath();
  g.fillStyle=lin(g, 0, y, 0, y+len*f, ['#fffef0','#ffd23f','#ff8a3d','rgba(255,60,0,0)']); g.fill();
  g.beginPath(); g.moveTo(x-w*0.45, y); g.quadraticCurveTo(x-w*0.4, y+len*0.3*f, x, y+len*0.55*f); g.quadraticCurveTo(x+w*0.4, y+len*0.3*f, x+w*0.45, y); g.closePath();
  g.fillStyle='rgba(255,255,255,.85)'; g.fill();
  g.restore();
}
// 上向きの 炎（ろうそく）。sway は 先の ゆれ
function candleFlame(g,x,y,w,h,sway){
  g.save(); g.globalCompositeOperation='lighter';
  g.fillStyle=rad(g, x+sway*0.5, y-h*0.45, 0, h*1.25, ['rgba(255,220,140,.55)','rgba(255,150,60,.18)','rgba(255,120,40,0)']); g.beginPath(); g.arc(x+sway*0.5, y-h*0.45, h*1.25, 0, TAU); g.fill();
  g.restore();
  const tear=(k)=>{ g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x-w*k*1.05, y-h*k*0.18, x-w*k*0.75+sway*0.4, y-h*k*0.72, x+sway*k, y-h*k); g.bezierCurveTo(x+w*k*0.75+sway*0.4, y-h*k*0.72, x+w*k*1.05, y-h*k*0.18, x, y); g.closePath(); };
  tear(1); g.fillStyle=lin(g, 0, y, 0, y-h, ['rgba(90,120,255,.75)','#ffb030','#ffd760','rgba(255,170,60,.9)']); g.fill();
  tear(0.62); g.fillStyle=lin(g, 0, y, 0, y-h*0.62, ['rgba(255,255,255,.5)','#fffbe0','#fff3b0']); g.fill();
}
const dtOf=(L,t)=>{ const d=clamp(t-(L.lt==null?t:L.lt), 0, 0.05); L.lt=t; return d; };

/* ───────── 🔠 画面いっぱい ───────── */
function drawBig(g, e, S, L){
  const W=S.W, H=S.H, t=S.t, ink=S.ink||['#ffffff','#ffd23f','#ff9f43'];
  const top=S.prev ? H*0.04 : H*0.13, bot=S.prev ? H*0.96 : S.bot;
  // 残りの 時間ぶんの 帯（下から。波うつ）
  const lvl=clamp(S.lvl, 0, 1);
  if(lvl>0.002){
    const y0=lerp(H, top*0.5, lvl), amp=Math.min(W,H)*0.014, col=S.last10 ? '255,70,40' : rgb(ink[2]);
    g.save(); g.beginPath(); g.moveTo(0, H); g.lineTo(0, y0);
    for(let i=0;i<=32;i++){ const x=W*i/32; g.lineTo(x, y0+Math.sin(i/32*TAU*1.4+t*2.4)*amp+Math.sin(i/32*TAU*3.1-t*1.7)*amp*0.4); }
    g.lineTo(W, H); g.closePath(); g.fillStyle=lin(g, 0, y0, 0, H, ['rgba('+col+',.26)','rgba('+col+',.07)']); g.fill();
    g.beginPath(); for(let i=0;i<=32;i++){ const x=W*i/32, y=y0+Math.sin(i/32*TAU*1.4+t*2.4)*amp+Math.sin(i/32*TAU*3.1-t*1.7)*amp*0.4; if(i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.strokeStyle='rgba('+col+',.75)'; g.lineWidth=Math.max(2, 3*S.d); g.stroke(); g.restore();
  }
  const str=S.bstr||S.str, chars=Array.from(str);
  // 字が かわった ときの 時刻（字ごと）。字の 数が 同じなら かわった 字だけ 跳ねる
  if(L.str!==str){
    const prev=L.str==null ? null : Array.from(L.str), same=!!prev && prev.length===chars.length;
    L.cht=chars.map((c,i)=>same && prev[i]===c && L.cht ? L.cht[i] : t);
    L.olds=same ? prev.map((c,i)=>c!==chars[i] ? {c, i} : null).filter(Boolean) : [];
    L.oldAll=same || !prev ? null : L.str; L.oldT=t; L.str=str; L.newT=t;
  }
  const cy=(top+bot)/2, aw=W*0.95, ah=(bot-top)*(S.bsub ? 0.78 : 0.94);
  g.save(); g.font='900 100px '+NUMF; const w100=Math.max(1, g.measureText(str).width); g.restore();
  const fs=Math.max(10, Math.min(aw/w100*100, ah/0.78));
  L.v=fs; L.fs=+(fs/Math.min(W,H)).toFixed(3);
  g.save(); g.font='900 '+Math.round(fs)+'px '+NUMF; const ws=chars.map(c=>g.measureText(c).width); g.restore();
  const total=ws.reduce((a,b)=>a+b, 0), xs=[]; let x=W/2-total/2; ws.forEach(w=>{ xs.push(x+w/2); x+=w; });
  const beat=S.last10 ? 1+0.07*Math.pow(1-(((t-(L.newT||0))%1)+1)%1, 3) : 1;
  const dy=S.bsub ? -fs*0.1 : 0;
  const one=(text, x0, sc, al)=>{
    g.save(); g.globalAlpha=clamp(al,0,1); g.translate(x0, cy+dy); g.scale(sc, sc);
    g.font='900 '+Math.round(fs)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle';
    if(S.level!=='calm'){ g.shadowColor=S.last10 ? '#ff3b30' : ink[2]; g.shadowBlur=Math.min(fs*0.1, 36*S.d); }
    g.lineJoin='round'; g.lineWidth=Math.max(2, fs*0.045); g.strokeStyle='rgba(0,0,0,.62)'; g.strokeText(text, 0, fs*0.035);
    g.shadowBlur=0; g.fillStyle=S.last10 ? lin(g, 0, -fs*0.42, 0, fs*0.42, ['#fff6c8','#ffb000','#ff2d2d']) : lin(g, 0, -fs*0.42, 0, fs*0.42, [ink[0], ink[1], ink[2]]);
    g.fillText(text, 0, fs*0.035); g.restore();
  };
  const ok=t-(L.oldT||0);
  if(ok<0.34){
    if(L.oldAll) one(L.oldAll, W/2, 1+0.7*ok/0.34, 1-ok/0.34);
    else for(const o of L.olds||[]) one(o.c, xs[o.i], 1+0.8*ok/0.34, 1-ok/0.34);
  }
  chars.forEach((c,i)=>{ const k=(t-(L.cht && L.cht[i]!=null ? L.cht[i] : -9))/0.6, b=k<1 && !S.prev ? 1+0.3*Math.exp(-5*k)*Math.cos(k*8.5) : 1; one(c, xs[i], b*beat, 1); });
  if(S.bsub) pill(g, S.bsub, W/2, cy+dy+fs*0.56, clamp(fs*0.14, 12*S.d, 46*S.d), {bg:'rgba(0,0,0,.4)'});
  L.head=[W/2, cy+dy-fs*0.38];
}

/* ───────── 🎞 絵が 動く（絵の 単位：まん中 0,0・上下左右 ±50）───────── */
function picLay(S){
  const W=S.W, H=S.H;
  if(S.prev){ const u=Math.min(W*0.52, H*0.92)/100; return {cx:W*0.3, cy:H*0.5, u, px:W*0.74, py:H*0.5, pf:Math.min(W*0.075, H*0.2)}; }
  const top=H*0.15, bot=S.bot, pf=clamp(Math.min(W*0.1, (bot-top)*0.1), 14*S.d, 60*S.d), py=bot-pf*0.95, ab=py-pf*1.05;
  const u=Math.max(0.5, Math.min(W*0.9, ab-top)/100);
  return {cx:W/2, cy:(top+ab)/2, u, px:W/2, py, pf};
}
// 🚀 ロケット：燃料が たまる・のこり3秒で 火が つく・0 で 発射
function picRocket(g, S, L, B, e, P){
  const t=S.t, p=S.done ? 1 : S.p, dt=L.dt;
  g.fillStyle=lin(g, 0, B.yt, 0, 38, ['#060b2b','#16286e','#3f6fd6','#8fb6ff']); g.fillRect(B.xl, B.yt, B.xr-B.xl, 38-B.yt+0.5);
  stars(g, L, B, t, 10, 1);
  g.fillStyle=lin(g, 0, 38, 0, B.yb, ['#2d3552','#141829']); g.fillRect(B.xl, 38, B.xr-B.xl, B.yb-38);
  // 発射台
  rr(g, -24, 32.5, 48, 6, 1.6); paint(g, lin(g,0,32.5,0,38.5,['#a7b0c4','#6d7590']), '#2b3145', 0.7);
  // 塔
  g.strokeStyle='#d9433a'; g.lineWidth=1.7; g.beginPath(); g.moveTo(-35,33); g.lineTo(-35,-32); g.moveTo(-27,33); g.lineTo(-27,-32); g.stroke();
  g.lineWidth=0.8; g.beginPath(); for(let y=33;y>-32;y-=8.1){ g.moveTo(-35,y); g.lineTo(-27,y-8.1); g.moveTo(-27,y); g.lineTo(-35,y-8.1); } g.stroke();
  rr(g, -37, -35, 12, 3.4, 1); paint(g, '#d9433a');
  const arm=S.done ? Math.max(0, 1-(S.doneT||0)*2.5) : 1;
  if(arm>0){ g.strokeStyle='#d9433a'; g.lineWidth=1.6; g.beginPath(); g.moveTo(-27,-6); g.lineTo(-27+18*arm, -6); g.stroke(); }
  // 燃料の めもり
  rr(g, -47, -27, 7, 58, 2); paint(g, 'rgba(0,0,0,.45)', 'rgba(255,255,255,.6)', 0.7);
  const fh=54*clamp(p,0,1); if(fh>0.2){ rr(g, -45.5, 29.5-fh, 4, fh, 1.4); paint(g, lin(g,0,29.5,0,-25,['#3ee86b','#ffd23f','#ff4d3d'])); }
  g.save(); g.font='bold 4.2px '+NUMF; g.textAlign='center'; g.fillStyle='#ffffff'; g.fillText('燃料', -43.5, -30); g.restore();
  // 煙
  L.puffs=L.puffs||[];
  let ry=0;
  if(S.done){ const k=Math.max(0, (S.doneT||0)-0.3); ry=-k*k*42-k*6; }
  const emit=S.paused ? 0 : S.done ? (ry>-140 ? 46 : 0) : S.last10 ? 14 : 0.8+p*5;
  L.acc=(L.acc||0)+emit*dt;
  while(L.acc>1){ L.acc--; if(L.puffs.length<90) L.puffs.push({x:rnd(-7,7), y:S.done ? 30+ry : 33, vx:rnd(-16,16)*(S.done?1.6:1), vy:rnd(-9,-2), r:rnd(2.5,5.5), age:0, life:rnd(1.3,2.4)}); }
  for(const q of L.puffs){ q.x+=q.vx*dt; q.y+=q.vy*dt; q.vx*=0.985; q.r+=dt*5.5; q.age+=dt; }
  L.puffs=L.puffs.filter(q=>q.age<q.life);
  // ロケット
  const shake=!S.done && (S.last10 || p>0.93) ? Math.sin(t*70)*(S.last10 ? 0.65 : 0.3) : 0;
  g.save(); g.translate(shake, ry);
  const fire=S.done ? 1 : (S.last10 && S.sec<=3 && !S.paused ? 0.32+0.12*Math.sin(t*40) : 0);
  if(fire>0) jet(g, 0, 28.5, 5.5+fire*1.8, 9+24*fire, t);
  const LN='#1b2233';
  g.beginPath(); g.moveTo(-9,6); g.quadraticCurveTo(-18,13,-18,28); g.lineTo(-9,23); g.closePath(); paint(g, '#e8463c', LN, 0.8);
  g.beginPath(); g.moveTo(9,6); g.quadraticCurveTo(18,13,18,28); g.lineTo(9,23); g.closePath(); paint(g, '#c9352c', LN, 0.8);
  g.beginPath(); g.moveTo(-6,23.5); g.lineTo(6,23.5); g.lineTo(7.8,29); g.lineTo(-7.8,29); g.closePath(); paint(g, '#4b5470', LN, 0.8);
  g.beginPath(); g.moveTo(-9,-18); g.lineTo(-9,24); g.lineTo(9,24); g.lineTo(9,-18); g.closePath(); paint(g, lin(g,-9,0,9,0,['#ffffff','#eef2fa','#b8c2d8']), LN, 0.8);
  g.fillStyle='#e8463c'; g.fillRect(-9, 15, 18, 3.4); g.strokeStyle=LN; g.lineWidth=0.6; g.strokeRect(-9, 15, 18, 3.4);
  g.beginPath(); g.moveTo(-9,-18); g.bezierCurveTo(-9,-29,-4,-37,0,-40); g.bezierCurveTo(4,-37,9,-29,9,-18); g.closePath(); paint(g, lin(g,-9,0,9,0,['#ff7a6e','#e8463c','#b22d25']), LN, 0.8);
  g.beginPath(); g.arc(0,-4,5.4,0,TAU); paint(g, '#9aa3b8', LN, 0.8);
  g.beginPath(); g.arc(0,-4,4,0,TAU); paint(g, rad(g,-1.2,-5.4,0.3,4.6,['#d8f1ff','#5aa8f0','#1d4f9c']));
  oval(g,-1.4,-5.6,1.2,0.8,-0.5); paint(g, 'rgba(255,255,255,.85)');
  g.restore();
  // 煙（ロケットの 前）
  for(const q of L.puffs){ const a=0.62*(1-q.age/q.life); g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fillStyle='rgba(236,240,248,'+a.toFixed(3)+')'; g.fill(); }
  L.v=+(-ry).toFixed(1);
  return S.done ? [shake, 30+ry] : [shake, -40];
}
// 🕯 ろうそく：短く なって 0 で ふっと 消える
function picCandle(g, S, L, B, e, P){
  const t=S.t, p=S.done ? 1 : S.p, hc=lerp(58, 7, clamp(p,0,1)), top=36-hc;
  const fk=S.done ? Math.max(0, 1-(S.doneT||0)/0.45) : 1;
  g.fillStyle='#0c070f'; g.fillRect(B.xl, B.yt, B.xr-B.xl, B.yb-B.yt);
  if(fk>0){ const R=(115+8*Math.sin(t*9))*(0.4+0.6*fk); g.fillStyle=rad(g, 0, top-12, 0, R, ['rgba(255,196,100,.6)','rgba(190,100,40,.25)','rgba(40,15,10,0)']); g.fillRect(B.xl, B.yt, B.xr-B.xl, B.yb-B.yt); }
  g.fillStyle=lin(g, 0, 38, 0, B.yb, ['#5a3820','#26160c']); g.fillRect(B.xl, 38, B.xr-B.xl, B.yb-38);
  g.fillStyle='rgba(255,200,120,'+(0.22*fk+0.04).toFixed(3)+')'; g.fillRect(B.xl, 38, B.xr-B.xl, 1);
  oval(g,0,39.5,25,5.6); paint(g, lin(g,-25,0,25,0,['#9a6c22','#ffd98a','#9a6c22']), '#5c3d10', 0.7);
  oval(g,0,37.6,17,3.3); paint(g, '#d9ad55');
  // ろう
  g.beginPath(); g.moveTo(-8, top); g.lineTo(-8, 37); g.quadraticCurveTo(0, 38.4, 8, 37); g.lineTo(8, top); g.closePath();
  paint(g, lin(g,-8,0,8,0,['#fffaf0','#fff2da','#e2c9a0']), 'rgba(140,90,40,.45)', 0.5);
  [[-5.6,9,0.2],[2.6,14,0.55],[6.2,6,0.8]].forEach(([x,len,k])=>{ const l=Math.min(36-top-3, len*(0.35+p*0.8)+k*3); if(l<1) return; rr(g, x-1.35, top-0.4, 2.7, l, 1.35); paint(g, '#fff6e8'); oval(g, x, top-0.4+l, 1.55, 1.75); paint(g, '#fff6e8'); });
  oval(g,0,top,8,2.2); paint(g, '#f6e4c4', 'rgba(140,90,40,.35)', 0.4);
  if(fk>0){ oval(g,0,top+0.2,5.4,1.35); paint(g, 'rgba(255,208,110,'+(0.9*fk).toFixed(3)+')'); }
  g.strokeStyle='#2b1d14'; g.lineWidth=0.95; g.lineCap='round'; g.beginPath(); g.moveTo(0, top); g.quadraticCurveTo(0.7, top-2, 0.2, top-3.8); g.stroke();
  let head=[0.2, top-4];
  if(fk>0){
    const wind=S.last10 ? Math.sin(t*9)*1.7 : 0, sway=Math.sin(t*2.7)*0.8+wind;
    const h=14*(1+0.06*Math.sin(t*11)+0.04*Math.sin(t*17+1))*(S.last10 ? 1+0.12*Math.sin(t*23) : 1)*fk, w=5.3*Math.max(0.3, fk);
    candleFlame(g, 0.2, top-3.4, w, h, sway); head=[0.2+sway, top-3.4-h];
  }
  if(S.done){ const k=(S.doneT||0)-0.3; if(k>0 && k<4.5){ g.save(); g.lineCap='round';
    for(let j=0;j<3;j++){ const a=0.5*(1-k/4.5)*(j===1?1:0.7); g.strokeStyle='rgba(200,200,215,'+a.toFixed(3)+')'; g.lineWidth=1.3-j*0.3; g.beginPath(); const y0=top-4, len=10+k*14+j*4;
      g.moveTo(0.2, y0); g.bezierCurveTo(0.2+Math.sin(t*1.6+j)*5, y0-len*0.35, 0.2-Math.sin(t*1.3+j*2)*6, y0-len*0.7, 0.2+Math.sin(t+j)*4, y0-len); g.stroke(); }
    g.restore(); } }
  L.v=+hc.toFixed(2);
  return head;
}
// ⏳ 砂時計：砂が 落ちて 0 で くるっと
function glassPath(g){
  g.beginPath(); g.moveTo(-21,-37); g.lineTo(21,-37); g.lineTo(21,-29); g.bezierCurveTo(21,-15,3.2,-8,2.2,0); g.bezierCurveTo(3.2,8,21,15,21,29); g.lineTo(21,37);
  g.lineTo(-21,37); g.lineTo(-21,29); g.bezierCurveTo(-21,15,-3.2,8,-2.2,0); g.bezierCurveTo(-3.2,-8,-21,-15,-21,-29); g.closePath();
}
function picSand(g, S, L, B, e, P){
  const t=S.t, p=S.done ? 1 : clamp(S.p,0,1), a=1-p, flow=!S.paused && !S.done && a>0.004;
  g.fillStyle=lin(g, 0, B.yt, 0, B.yb, ['#21183f','#45367d','#7c61b8']); g.fillRect(B.xl, B.yt, B.xr-B.xl, B.yb-B.yt);
  g.fillStyle=rad(g, 0, 0, 0, 70, ['rgba(255,226,160,.22)','rgba(255,226,160,0)']); g.fillRect(B.xl, B.yt, B.xr-B.xl, B.yb-B.yt);
  oval(g, 0, 47, 34, 3.4); paint(g, 'rgba(0,0,0,.28)');
  const rot=S.done ? Math.PI*sm((S.doneT||0)/0.9) : 0, jump=S.done ? Math.max(0, Math.sin(Math.min(1,(S.doneT||0)/0.9)*Math.PI))*6 : 0;
  g.save(); g.translate(0, -jump); g.rotate(rot);
  if(S.done){ g.fillStyle=rad(g, 0, 0, 0, 52, ['rgba(255,220,120,.45)','rgba(255,220,120,0)']); g.beginPath(); g.arc(0,0,52,0,TAU); g.fill(); }
  const wood=lin(g,0,-6,0,6,['#c48a4a','#8f5c2c']);
  g.save(); g.translate(0,-40.5); rr(g,-31,-3.5,62,7,2.2); paint(g, wood, '#5c3a19', 0.7); g.restore();
  g.save(); g.translate(0,40.5); rr(g,-31,-3.5,62,7,2.2); paint(g, wood, '#5c3a19', 0.7); g.restore();
  rr(g,-30,-37,4,74,1.6); paint(g, lin(g,-30,0,-26,0,['#b07a3f','#7d4f24']), '#5c3a19', 0.5);
  rr(g,26,-37,4,74,1.6); paint(g, lin(g,26,0,30,0,['#b07a3f','#7d4f24']), '#5c3a19', 0.5);
  glassPath(g); paint(g, 'rgba(210,235,255,.14)');
  const sand=lin(g,0,-37,0,37,['#ffe39a','#f2c066','#d99d3e']);
  g.save(); glassPath(g); g.clip();
  if(a>0.004){ const yT=-1.2-29*Math.pow(a, 0.62), dip=flow ? Math.min(4, -yT*0.4) : 0;
    g.beginPath(); g.moveTo(-24, yT); g.quadraticCurveTo(0, yT+dip*2, 24, yT); g.lineTo(24, 0.4); g.lineTo(-24, 0.4); g.closePath(); g.fillStyle=sand; g.fill(); }
  const hb=31*Math.pow(p, 0.62), pk=37-hb*1.12;
  if(hb>0.3){ g.beginPath(); g.moveTo(-24, 37); g.lineTo(-24, 37-hb*0.42); g.quadraticCurveTo(0, 37-hb*1.8, 24, 37-hb*0.42); g.lineTo(24, 37); g.closePath(); g.fillStyle=sand; g.fill(); }
  if(flow){ g.fillStyle='#f2c066'; g.fillRect(-0.45, 0, 0.9, Math.max(0, pk)); const len=Math.max(1, pk);
    for(let i=0;i<7;i++){ const y=(t*42+i*6.3)%len; g.beginPath(); g.arc(Math.sin(i*1.7+t*3)*0.55, y, 0.55, 0, TAU); g.fill(); } }
  g.restore();
  glassPath(g); paint(g, null, 'rgba(230,245,255,.8)', 1.1);
  g.strokeStyle='rgba(255,255,255,.5)'; g.lineWidth=1.4; g.lineCap='round';
  g.beginPath(); g.moveTo(-16,-33); g.quadraticCurveTo(-18,-20,-8,-10); g.stroke(); g.beginPath(); g.moveTo(-16,33); g.quadraticCurveTo(-18,22,-9,12); g.stroke();
  g.restore();
  L.v=+a.toFixed(3);
  return [0, -jump];
}
// 💣 ばくだん：火が 導火線を 進んで 0 で ドカーン
const FUSE=(()=>{
  const C=[[-46,-14],[-45,-30],[-33,-41],[-18,-37],[-20,-24],[-11,-15],[-6,-8]], pts=[];
  for(let i=0;i<C.length-1;i++){ const p0=C[Math.max(0,i-1)], p1=C[i], p2=C[i+1], p3=C[Math.min(C.length-1,i+2)];
    for(let s=0;s<14;s++){ const u=s/14, u2=u*u, u3=u2*u;
      pts.push([0,1].map(k=>0.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u3))); } }
  pts.push(C[C.length-1]);
  const len=[0]; for(let i=1;i<pts.length;i++) len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
  return {pts, len, total:len[len.length-1]};
})();
function fuseAt(s){   // 先から s（0〜1）の ところ
  const want=clamp(s,0,1)*FUSE.total, L=FUSE.len; let i=1; while(i<L.length-1 && L[i]<want) i++;
  const k=(want-L[i-1])/Math.max(1e-6, L[i]-L[i-1]), a=FUSE.pts[i-1], b=FUSE.pts[i];
  return {x:lerp(a[0],b[0],k), y:lerp(a[1],b[1],k), i};
}
function picBomb(g, S, L, B, e, P){
  const t=S.t, p=S.done ? 1 : clamp(S.p,0,1);
  g.fillStyle=lin(g, 0, B.yt, 0, B.yb, ['#fff6dc','#ffe0a3','#ffc27a']); g.fillRect(B.xl, B.yt, B.xr-B.xl, B.yb-B.yt);
  // 集中線
  const lines=0.12+0.4*p+(S.last10 ? 0.25+0.15*Math.sin(t*10) : 0);
  g.save(); g.translate(10, 14); g.fillStyle='rgba(255,140,40,'+clamp(lines,0,0.7).toFixed(3)+')';
  const R=Math.hypot(B.xr-B.xl, B.yb-B.yt);
  for(let i=0;i<36;i++){ const an=i/36*TAU+Math.sin(i*7.3)*0.05, w=0.035+0.02*Math.sin(i*3.1); g.beginPath(); g.moveTo(Math.cos(an-w)*30, Math.sin(an-w)*30); g.lineTo(Math.cos(an)*R, Math.sin(an)*R); g.lineTo(Math.cos(an+w)*30, Math.sin(an+w)*30); g.closePath(); g.fill(); }
  g.restore();
  oval(g, 10, 38, 22, 3.6); paint(g, 'rgba(120,60,0,.25)');
  const sp=fuseAt(p);
  if(!S.done){
    // 燃えた ところ（灰）
    g.save(); g.lineCap='round'; g.lineJoin='round';
    g.strokeStyle='rgba(90,80,70,.4)'; g.lineWidth=0.8; g.beginPath(); FUSE.pts.slice(0, sp.i).forEach((q,j)=>j ? g.lineTo(q[0],q[1]) : g.moveTo(q[0],q[1])); g.lineTo(sp.x, sp.y); g.stroke();
    // 残りの 導火線
    const rest=[[sp.x, sp.y]].concat(FUSE.pts.slice(sp.i));
    g.strokeStyle='#6b4423'; g.lineWidth=2.6; g.beginPath(); rest.forEach((q,j)=>j ? g.lineTo(q[0],q[1]) : g.moveTo(q[0],q[1])); g.stroke();
    g.strokeStyle='#d9a066'; g.lineWidth=1; g.setLineDash([1.6,1.4]); g.stroke(); g.setLineDash([]);
    g.restore();
    // ばくだん
    const sh=S.last10 ? Math.sin(t*60)*0.9 : p>0.85 ? Math.sin(t*50)*0.35 : 0;
    g.save(); g.translate(10+sh, 14);
    g.save(); g.translate(-14.5,-16.5); g.rotate(-0.72); rr(g,-4.4,-3.2,8.8,6.4,1.4); paint(g, lin(g,0,-3,0,3,['#b9bfcc','#6f7586']), '#22252e', 0.7); g.restore();
    g.beginPath(); g.arc(0,0,22,0,TAU); paint(g, rad(g,-7,-8,2,26,['#6e6e7c','#2a2a33','#0b0b10']), '#000000', 0.9);
    if(S.last10 || p>0.9){ const a=S.last10 ? 0.3+0.22*Math.sin(t*12) : 0.12; g.beginPath(); g.arc(0,0,22,0,TAU); g.fillStyle=rad(g,0,4,2,23,['rgba(255,90,30,'+a.toFixed(3)+')','rgba(255,30,0,0)']); g.fill(); }
    oval(g,-8.5,-10,5.2,3,-0.65); paint(g, 'rgba(255,255,255,.38)');
    // 顔
    const look=[clamp((sp.x-10)/40,-1,1)*1.1, clamp((sp.y-14)/40,-1,1)*1.1];
    [-5.5,5.5].forEach(x=>{ oval(g,x,1.5,3.4,4.2); paint(g, '#ffffff'); oval(g,x+look[0],1.8+look[1],1.7,2.2); paint(g, '#111111'); });
    if(S.last10){ g.strokeStyle='#ffffff'; g.lineWidth=1.1; g.lineCap='round'; g.beginPath(); g.moveTo(-9,-4.5); g.lineTo(-3,-3); g.moveTo(9,-4.5); g.lineTo(3,-3); g.stroke();
      oval(g,0,9.5,2.2,2.6); paint(g, '#ffffff'); g.beginPath(); g.moveTo(19,-9); g.quadraticCurveTo(22,-4,19.5,-2.5); g.quadraticCurveTo(17,-4,19,-9); paint(g, '#7cd3ff'); }
    else { g.strokeStyle='#ffffff'; g.lineWidth=1.1; g.lineCap='round'; g.beginPath(); g.arc(0,7.5,3.2,0.15*Math.PI,0.85*Math.PI); g.stroke(); }
    g.restore();
    // 火花
    const fl=1+0.25*Math.sin(t*37);
    g.save(); g.globalCompositeOperation='lighter';
    g.fillStyle=rad(g, sp.x, sp.y, 0, 9*fl, ['rgba(255,255,220,.95)','rgba(255,200,60,.55)','rgba(255,120,0,0)']); g.beginPath(); g.arc(sp.x, sp.y, 9*fl, 0, TAU); g.fill();
    g.strokeStyle='#fff6b0'; g.lineWidth=0.7; g.beginPath();
    for(let i=0;i<8;i++){ const an=t*9+i*TAU/8, r1=2, r2=(4.5+2.5*Math.sin(t*23+i*1.9))*fl; g.moveTo(sp.x+Math.cos(an)*r1, sp.y+Math.sin(an)*r1); g.lineTo(sp.x+Math.cos(an)*r2, sp.y+Math.sin(an)*r2); }
    g.stroke(); g.restore();
    if(e && !S.paused && !S.prev && Math.random()<0.7){ const [cx,cy]=P.c(sp.x, sp.y), v=rnd(40,140)*e.d, an=rnd(0,TAU); e.spark(cx, cy, Math.cos(an)*v, Math.sin(an)*v-30*e.d, ['#fff6a0','#ffd23f','#ff8a3d'][Math.floor(Math.random()*3)], {life:rnd(0.25,0.6), gr:120, sz:rnd(1,2)}); }
  } else {
    // 爆発の あとの 煙
    const k=S.doneT||0;
    g.save();
    for(let j=0;j<10;j++){ const an=j/10*TAU+0.3, dist=Math.min(26, k*30)*(0.6+0.4*((j*7)%3)/2), r=Math.min(16, 6+k*9)*(0.8+0.3*((j*5)%4)/3);
      g.globalAlpha=clamp(1-k/3.2, 0, 1)*0.85; g.beginPath(); g.arc(10+Math.cos(an)*dist, 14+Math.sin(an)*dist*0.7-k*4, r, 0, TAU); g.fillStyle=j%2 ? '#8d8a92' : '#b3b0b8'; g.fill(); }
    g.restore();
  }
  L.v=+p.toFixed(3);
  return S.done ? [10, 14] : [sp.x, sp.y];
}
// 🎈 風船：ふくらんで 0 で パーン
function picBalloon(g, S, L, B, e, P){
  const t=S.t, p=S.done ? 1 : clamp(S.p,0,1);
  g.fillStyle=lin(g, 0, B.yt, 0, 40, ['#5fb8ff','#a8dcff','#e8f7ff']); g.fillRect(B.xl, B.yt, B.xr-B.xl, 40-B.yt+0.5);
  const sx=B.xr-16, sy=B.yt+16;
  g.fillStyle=rad(g, sx, sy, 2, 22, ['rgba(255,236,140,.75)','rgba(255,236,140,0)']); g.beginPath(); g.arc(sx, sy, 22, 0, TAU); g.fill();
  g.beginPath(); g.arc(sx, sy, 8, 0, TAU); paint(g, '#ffd84d');
  [[0.1,0.18,7],[0.55,0.32,5],[0.85,0.12,6]].forEach(([cx,cy,s],i)=>{ const w=B.xr-B.xl+40, x=B.xl-20+(((cx*w+t*(1.2+i*0.5))%w)+w)%w; cloud(g, x, B.yt+cy*(40-B.yt), s, 0.92); });
  g.beginPath(); g.moveTo(B.xl, 41); g.quadraticCurveTo(0, 33, B.xr, 41); g.lineTo(B.xr, B.yb); g.lineTo(B.xl, B.yb); g.closePath(); paint(g, lin(g,0,33,0,B.yb,['#8fdc72','#4fae55']));
  // 箱
  rr(g,-7.5,30,15,10.5,1.6); paint(g, lin(g,0,30,0,40.5,['#ff8fb8','#f0568f']), '#9c2457', 0.7);
  g.fillStyle='#ffe066'; g.fillRect(-1.3,30,2.6,10.5); g.fillRect(-7.5,33.6,15,2.4);
  oval(g,-3,29.3,3,1.8,-0.4); paint(g, '#ffe066', '#c9a227', 0.4); oval(g,3,29.3,3,1.8,0.4); paint(g, '#ffe066', '#c9a227', 0.4);
  const r=lerp(7, 30, Math.pow(p, 0.85)), wob=(p>0.82 || S.last10) && !S.done ? Math.sin(t*22)*(S.last10 ? 0.035 : 0.018) : 0;
  const by=12-r*1.05, knot=by+r*1.12;
  // ひも
  g.strokeStyle='#7a6a60'; g.lineWidth=0.7; g.beginPath();
  if(!S.done){ g.moveTo(0, 29.5); g.bezierCurveTo(Math.sin(t*1.5)*3, 29.5-(29.5-knot)*0.35, -Math.sin(t*1.3)*3, 29.5-(29.5-knot)*0.7, 0, knot+1.5); }
  else { const k=Math.min(1.2, S.doneT||0), fall=k*k*12; g.moveTo(0, 29.5); g.bezierCurveTo(4, 24-fall*0.3, -4, 18+fall*0.5, 2, Math.min(29, 12+fall)); }
  g.stroke();
  if(!S.done){
    const rx=r*(1+wob), ry=r*1.12*(1-wob);
    g.beginPath(); g.moveTo(-1.8, knot+2.2); g.lineTo(1.8, knot+2.2); g.lineTo(0, knot-0.6); g.closePath(); paint(g, '#c9184a');
    oval(g, 0, by, rx, ry); paint(g, rad(g, -r*0.35, by-r*0.45, r*0.1, r*1.35, ['#ffc2cf','#ff4d6d','#b5133f']), '#8e0b33', 0.7);
    oval(g, -r*0.4, by-r*0.5, r*0.17, r*0.32, -0.55); paint(g, 'rgba(255,255,255,.7)');
    if(p>0.9 || S.last10){ g.strokeStyle='rgba(255,255,255,.85)'; g.lineWidth=0.8; g.lineCap='round'; g.beginPath();
      for(let i=0;i<6;i++){ const an=i/6*TAU+0.3, r1=r*1.2+1.5, r2=r1+2.5+Math.sin(t*20+i)*0.8; g.moveTo(Math.cos(an)*r1*(rx/r), by+Math.sin(an)*r1*(ry/r)); g.lineTo(Math.cos(an)*r2*(rx/r), by+Math.sin(an)*r2*(ry/r)); } g.stroke(); }
  }
  L.v=S.done ? 0 : +r.toFixed(2);
  return [0, by-r*1.12];
}
// 🌻 花：芽が 出て のびて 0 で さく
function picFlower(g, S, L, B, e, P){
  const t=S.t, p=S.done ? 1 : clamp(S.p,0,1);
  g.fillStyle=lin(g, 0, B.yt, 0, 40, ['#8fd3ff','#cdeeff','#fff7dc']); g.fillRect(B.xl, B.yt, B.xr-B.xl, 40-B.yt+0.5);
  const sx=B.xl+15, sy=B.yt+15;
  g.save(); g.translate(sx, sy); g.rotate(t*0.25); g.strokeStyle='rgba(255,200,40,.75)'; g.lineWidth=1.4; g.lineCap='round'; g.beginPath();
  for(let i=0;i<12;i++){ const an=i/12*TAU; g.moveTo(Math.cos(an)*10.5, Math.sin(an)*10.5); g.lineTo(Math.cos(an)*14, Math.sin(an)*14); } g.stroke(); g.restore();
  g.beginPath(); g.arc(sx, sy, 8, 0, TAU); paint(g, '#ffd84d');
  g.fillStyle=lin(g, 0, 40, 0, B.yb, ['#8fd36f','#5cb85a']); g.fillRect(B.xl, 40, B.xr-B.xl, B.yb-40);
  // 鉢
  g.beginPath(); g.moveTo(-15,24); g.lineTo(15,24); g.lineTo(11,43); g.lineTo(-11,43); g.closePath(); paint(g, lin(g,-15,0,15,0,['#e0814a','#c8642f','#a84f22']), '#7a3514', 0.7);
  rr(g,-18,20,36,6,2); paint(g, lin(g,0,20,0,26,['#ea8e57','#c8642f']), '#7a3514', 0.7);
  oval(g,0,21.3,15,2.6); paint(g, '#5a3a22');
  // くき
  const sprout=sm(p/0.08), hs=p<0.06 ? 5*sprout : 5+42*sm((p-0.06)/0.64);
  const sway=Math.sin(t*1.4)*1.2*(hs/47), tx=sway, ty=21-hs;
  g.strokeStyle='#3f9e3a'; g.lineWidth=2.1; g.lineCap='round'; g.beginPath(); g.moveTo(0,21); g.quadraticCurveTo(-1.5, 21-hs*0.5, tx, ty); g.stroke();
  const leaf=(y,dir,k)=>{ if(k<=0) return; g.save(); g.translate(lerp(0,tx,(21-y)/Math.max(1,hs))*0.6, y); g.rotate(dir*0.65); g.scale(k,k); g.beginPath(); g.moveTo(0,0); g.quadraticCurveTo(dir*5,-4.5,dir*11,-1); g.quadraticCurveTo(dir*5,3,0,0); paint(g, '#5cc04b', '#2f7d2a', 0.6); g.restore(); };
  if(p<0.2){ leaf(21-hs*0.95, -1, sprout*0.55); leaf(21-hs*0.95, 1, sprout*0.55); }
  [[0.22,-1,0.28],[0.38,1,0.48],[0.55,-1,0.68]].forEach(([th,dir,fr])=>leaf(21-hs*fr, dir, sm((p-th)/0.1)));
  g.save(); g.translate(tx, ty);
  if(!S.done){
    const b=sm((p-0.66)/0.3);
    if(b>0){ g.rotate(S.last10 ? Math.sin(t*9)*0.12 : 0); const s=2.5+5.5*b;
      if(b>0.55){ g.fillStyle='#ffd23f'; for(let i=-2;i<=2;i++){ g.beginPath(); g.ellipse(i*s*0.28, -s*1.2, s*0.22, s*0.5, i*0.25, 0, TAU); g.fill(); } }
      g.beginPath(); g.moveTo(0,0.5); g.bezierCurveTo(-s*1.2,-s*0.3,-s*0.6,-s*1.5,0,-s*1.7); g.bezierCurveTo(s*0.6,-s*1.5,s*1.2,-s*0.3,0,0.5); paint(g, '#4fae3f', '#2f7d2a', 0.6); }
  } else {
    const k=sm((S.doneT||0)/0.9), n=16, pr=2+5*k, pl=3+9*k;
    g.rotate(Math.sin(t*2)*0.06);
    for(let i=0;i<n;i++){ const an=i/n*TAU+k*0.6; g.save(); g.rotate(an); g.beginPath(); g.ellipse(0, -(pr+pl*0.55), pl*0.36, pl*0.6, 0, 0, TAU); paint(g, i%2 ? '#ffd23f' : '#ffc21a', '#d89a00', 0.5); g.restore(); }
    g.beginPath(); g.arc(0,0,pr+0.6,0,TAU); paint(g, rad(g,-1,-1,0.5,pr+1,['#9a6232','#6b3f1a']), '#4a2a10', 0.6);
    if(k>0.6){ g.strokeStyle='#2a1508'; g.lineWidth=0.7; g.lineCap='round'; g.beginPath(); g.arc(-2.3,-0.6,1.1,Math.PI*1.1,Math.PI*1.9); g.moveTo(3.4,-0.6); g.arc(2.3,-0.6,1.1,Math.PI*1.1,Math.PI*1.9); g.stroke();
      g.beginPath(); g.arc(0,1.4,1.8,0.15*Math.PI,0.85*Math.PI); g.stroke(); oval(g,-4,1.4,1.2,0.7); paint(g,'rgba(255,120,140,.7)'); oval(g,4,1.4,1.2,0.7); paint(g,'rgba(255,120,140,.7)'); }
  }
  g.restore();
  L.v=+hs.toFixed(2);
  return [tx, ty-(S.done ? 8 : 4)];
}
const PIC={rocket:picRocket, candle:picCandle, sand:picSand, bomb:picBomb, balloon:picBalloon, flower:picFlower};
function drawPic(g, e, S, L, sub){
  const P=picLay(S), D=PIC[sub]||picRocket;
  L.dt=dtOf(L, S.t);
  P.c=(x,y)=>[P.cx+x*P.u, P.cy+y*P.u];
  const B={xl:-P.cx/P.u, xr:(S.W-P.cx)/P.u, yt:-P.cy/P.u, yb:(S.H-P.cy)/P.u};
  g.save(); g.translate(P.cx, P.cy); g.scale(P.u, P.u);
  const h=D(g, S, L, B, e, P) || [0,0];
  g.restore();
  L.head=P.c(h[0], h[1]); L.lay=P;
  if(S.last10 && S.sec>0){ const k=1-clamp((S.t-(S.tickT==null ? S.t : S.tickT))/0.6, 0, 1); pill(g, String(S.sec), P.px, P.py-P.pf*0.3, P.pf*(1.7+0.25*k*k), {bg:'rgba(210,20,20,.82)', line:'#ffe08a'}); }
  else pill(g, S.done ? END[sub]||'おわり' : S.str, P.px, P.py, P.pf, S.done ? {bg:'rgba(255,140,0,.85)'} : {});
}

/* ───────── 🐾 動物（v581：動物が 自分で 数える。1秒ごとに 数える 動きを して、道具に 時間が 出る）─────────
   🐱 ねこ＝めくりの 数字板を かかえて 前足で めくる・🐰 うさぎ＝なわとび（1秒に 1回 とぶ）・🐶 いぬ＝看板の 横で「わん！」と ほえる・
   🐧 ペンギン＝指揮（1秒ごとに タクトを ふる・♪）・🐸 かえる＝はすの 葉で「ケロ」と 鳴いて のどが ふくらむ・🐻 くま＝太鼓を たたく（面に 時間）。
   残りが へるほど 空が 夕やけに なって お日さまが しずみ、顔も ふつう → 真剣 → あせる。のこり10秒は 数を さけび、0 で 大よろこび。 */
const ANI={
  neko:{body:'#ffcf8a', belly:'#fff3dd', end:'やったー！'},
  usagi:{body:'#ffffff', belly:'#fff4f6', end:'やったー！'},
  inu:{body:'#f2b56b', belly:'#fff6e8', end:'わんわん！'},
  pen:{body:'#2f3d63', belly:'#ffffff', end:'ブラボー！'},
  kaeru:{body:'#7fd35b', belly:'#eaf8c9', end:'ケロケロ〜！'},
  kuma:{body:'#b07a4f', belly:'#e6bf92', end:'やったー！'},
};
const ACT={neko:'めくる', usagi:'なわとび', inu:'ほえる', pen:'指揮', kaeru:'鳴く', kuma:'太鼓'};
function mix(c1, c2, k){ const a=rgb(c1).split(',').map(Number), b=rgb(c2).split(',').map(Number); return 'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*clamp(k,0,1))).join(',')+')'; }
// 1拍の 動き：0（たたく・めくる とき）→ もどる → 上げて まつ → 1 で また
function swing(s){ if(s>=1 || s<0.1) return 0; if(s<0.5) return sm((s-0.1)/0.4); if(s<0.86) return 1; return 1-Math.pow((s-0.86)/0.14, 2); }
const lerp2=(p, q, k)=>[lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
function eyes(g, k, f, t){
  const hx=1.5, ey=k==='kaeru' ? -41 : -30.5, ex=k==='kaeru' ? [-4.5, 7.5] : [hx-5.2, hx+5.2];
  const blink=(f==='n' || f==='focus') && ((t*0.9)%3.4)<0.12;
  g.strokeStyle='#2a1a14'; g.fillStyle='#2a1a14'; g.lineWidth=1.25; g.lineCap='round';
  ex.forEach((x,i)=>{
    if(f==='happy'){ g.beginPath(); g.moveTo(x-2.2, ey+0.9); g.quadraticCurveTo(x, ey-2.4, x+2.2, ey+0.9); g.stroke(); }
    else if(f==='sleep' || blink){ g.beginPath(); g.moveTo(x-2, ey+0.3); g.quadraticCurveTo(x, ey+1.6, x+2, ey+0.3); g.stroke(); }
    else if(f==='tense'){ const d=i ? -1 : 1; g.beginPath(); g.moveTo(x-1.8*d, ey-1.8); g.lineTo(x+1.6*d, ey); g.lineTo(x-1.8*d, ey+1.8); g.stroke(); }
    else {
      if(k==='kaeru'){ oval(g, x+0.6, ey+0.4, 1.9, 2.3); g.fill(); g.fillStyle='#ffffff'; oval(g, x+1.2, ey-0.4, 0.6, 0.6); g.fill(); g.fillStyle='#2a1a14'; }
      else { oval(g, x+0.3, ey, 1.85, 2.45); g.fill(); g.fillStyle='#ffffff'; oval(g, x+0.9, ey-0.9, 0.62, 0.62); g.fill(); g.fillStyle='#2a1a14'; }
      if(f==='focus'){ const d=i ? -1 : 1; g.lineWidth=1.05; g.beginPath(); g.moveTo(x-2.6*d, ey-(k==='kaeru' ? 5.6 : 4.6)); g.lineTo(x+1.6*d, ey-(k==='kaeru' ? 4.6 : 3.6)); g.stroke(); }
    }
  });
}
// 動物を 描く（足もと 0,0・絵の 単位）。o：t・face（n／focus／tense／happy／sleep）・mouth（open）・hy（浮く）・lean・headRot・sit・
// armL／armR（{x,y,r}。null は 描かない）・holdL／holdR（手に 持つ ものを 描く）・sweat・sac（かえるの のど）・sacTxt・wag（しっぽ）
function creature(g, k, o){
  const C=ANI[k]||ANI.neko, t=o.t||0, body=C.body, belly=C.belly, f=o.face||'n', hy=o.hy||0, sleep=f==='sleep' && o.lie;
  g.save();
  oval(g, 0, 0.6, 13*(1-Math.min(0.35, hy/40)), 2.6); paint(g, 'rgba(0,40,0,.2)');
  g.translate(0, -hy);
  if(o.lean){ g.translate(0, -6); g.rotate(o.lean); g.translate(0, 6); }
  if(sleep) g.translate(0, 3);
  const wag=o.wag==null ? 1 : o.wag;
  if(k==='neko'){ g.strokeStyle=INK; g.lineWidth=4.6; g.lineCap='round'; g.beginPath(); g.moveTo(-9,-9); g.quadraticCurveTo(-19,-12+Math.sin(t*3*wag)*2,-17+Math.sin(t*2.4*wag)*2,-25); g.stroke(); g.strokeStyle=body; g.lineWidth=3; g.stroke(); }
  if(k==='inu'){ g.save(); g.translate(-10, o.sit ? -9 : -14); g.rotate(Math.sin(t*16*wag)*0.45); g.strokeStyle=INK; g.lineWidth=4.4; g.lineCap='round'; g.beginPath(); g.arc(-3,-3,3.6,0.4,Math.PI*1.6); g.stroke(); g.strokeStyle=body; g.lineWidth=2.8; g.stroke(); g.restore(); }
  if(k==='usagi'){ g.beginPath(); g.arc(-11,-8,3.8,0,TAU); paint(g, '#ffffff', INK, 1); }
  if(k==='kuma'){ g.beginPath(); g.arc(-11,-8,2.8,0,TAU); paint(g, body, INK, 1); }
  const foot=(fx, fy)=>{ oval(g, fx, fy, k==='kaeru' ? 5.2 : 4.4, 2.7); paint(g, k==='pen' ? '#ffb020' : body, INK, 1); };
  const arm=(a)=>{ if(!a) return; oval(g, a.x, a.y, 3.1, 4.4, a.r||0); paint(g, body, INK, 1); };
  if(o.sit){ oval(g, -5.5, -5.6, 6.4, 5.4); paint(g, body, INK, 1); }
  else if(!sleep) foot(-4.5, -1.9);
  if(o.holdL) o.holdL(g);
  if(!o.noArms) arm(o.armL===undefined ? {x:-10.5, y:-12, r:0.25} : o.armL);
  oval(g, 0, o.sit ? -10.5 : -11.5, k==='kaeru' ? 12.5 : 11.5, sleep ? 9 : 10.5); paint(g, body, INK, 1.1);
  if(k!=='neko'){ oval(g, 1.6, o.sit ? -9 : -10, 7.2, 7.4); paint(g, belly); }
  if(o.sit || sleep){ foot(7, -1.6); foot(-1.5, -1.6); } else foot(4.5, -1.9);
  // 頭（ほえる ときなどは 首を 回す）
  g.save(); if(o.headRot){ g.translate(1.5, -18); g.rotate(o.headRot); g.translate(-1.5, 18); }
  if(k==='neko' || k==='inu'){ const ear=(s)=>{ g.beginPath(); g.moveTo(1.5+s*12.5,-36); g.lineTo(1.5+s*10.5,-48.5); g.lineTo(1.5+s*2.5,-43); g.closePath(); paint(g, body, INK, 1.1); g.beginPath(); g.moveTo(1.5+s*10.6,-38.5); g.lineTo(1.5+s*9.6,-45.2); g.lineTo(1.5+s*5.2,-42); g.closePath(); paint(g, k==='neko' ? '#ffb3c1' : '#c97b3a'); }; ear(-1); ear(1); }
  if(k==='usagi'){ const flop=Math.sin(t*6)*0.05+hy*0.006; [[-4.5,-0.16-flop],[7.5,0.16+flop]].forEach(([ex,r])=>{ g.save(); g.translate(ex,-42); g.rotate(r); oval(g,0,-10,4,11.5); paint(g, '#ffffff', INK, 1.1); oval(g,0,-10,2,8.2); paint(g, '#ffc4d0'); g.restore(); }); }
  if(k==='kuma'){ [[-8.5,-42.5],[11.5,-42.5]].forEach(([ex,ey])=>{ g.beginPath(); g.arc(ex,ey,5.2,0,TAU); paint(g, body, INK, 1.1); g.beginPath(); g.arc(ex,ey,2.8,0,TAU); paint(g, '#e9b98f'); }); }
  if(k==='kaeru'){ [[-4.5,-40.5],[7.5,-40.5]].forEach(([ex,ey])=>{ g.beginPath(); g.arc(ex,ey,5.4,0,TAU); paint(g, body, INK, 1.1); }); oval(g, 1.5, -29, 16, 12.5); paint(g, body, INK, 1.1); [[-4.5,-40.5],[7.5,-40.5]].forEach(([ex,ey])=>{ g.beginPath(); g.arc(ex,ey,4,0,TAU); paint(g, '#ffffff'); }); }
  else { g.beginPath(); g.arc(1.5, -30, 15, 0, TAU); paint(g, body, INK, 1.1); }
  if(k==='neko'){ g.strokeStyle='#e99a4c'; g.lineWidth=1.3; g.lineCap='round'; g.beginPath(); [-2,1.5,5].forEach(x=>{ g.moveTo(x,-44); g.lineTo(x+(x-1.5)*0.12,-40); }); g.stroke(); }
  if(k==='pen'){ g.beginPath(); g.arc(-2.4,-30,6.6,0,TAU); g.moveTo(12,-30); g.arc(5.4,-30,6.6,0,TAU); g.moveTo(10.5,-24.5); g.ellipse(1.5,-24.5,9,6.2,0,0,TAU); paint(g, '#ffffff'); }
  if(k==='inu'){ oval(g, 1.5, -24.6, 7.4, 5); paint(g, '#fff6e8'); }
  if(k==='kuma'){ oval(g, 1.5, -24.8, 6.2, 4.6); paint(g, '#f3d7b5', INK, 0.6); }
  eyes(g, k, f, t);
  g.fillStyle='rgba(255,120,150,.45)'; oval(g, -7.6, -24.8, 2.6, 1.6); g.fill(); oval(g, 10.6, -24.8, 2.6, 1.6); g.fill();
  // かえるの のど（鳴く とき ふくらむ）
  if(k==='kaeru' && o.sac>0.02){ const s=o.sac; oval(g, 1.5, -18.5+s*1.5, 7.2*s, 5.6*s); paint(g, '#fff3b0', INK, 0.8);
    if(o.sacTxt && s>0.6){ g.fillStyle='#d62828'; g.font='900 '+(7.2*s).toFixed(2)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle'; g.fillText(o.sacTxt, 1.5, -18.2+s*1.5); } }
  // 口・鼻
  g.strokeStyle=INK; g.lineWidth=1; g.lineCap='round';
  const m=o.mouth||'';
  if(k==='pen'){ if(m==='open'){ g.beginPath(); g.moveTo(-1,-26.4); g.lineTo(4.4,-26.4); g.lineTo(1.6,-24.4); g.closePath(); paint(g, '#ffb020', '#b86e00', 0.6); g.beginPath(); g.moveTo(-0.6,-23.6); g.lineTo(4,-23.6); g.lineTo(1.6,-21.4); g.closePath(); paint(g, '#ff9a00', '#b86e00', 0.6); }
    else { g.beginPath(); g.moveTo(-1,-25.8); g.lineTo(4,-25.8); g.lineTo(1.5,-22.6); g.closePath(); paint(g, '#ffb020', '#b86e00', 0.6); } }
  else if(k==='kaeru'){ if(m==='open' || f==='tense'){ oval(g, 1.5, -23.2, m==='open' ? 4.6 : 2.6, m==='open' ? 2.8 : 2); paint(g, '#c0392b', INK, 0.8); } else { g.beginPath(); g.moveTo(-6,-25); g.quadraticCurveTo(1.5, f==='happy' ? -18 : -20.5, 9,-25); g.stroke(); } }
  else {
    if(k==='inu' || k==='kuma'){ oval(g, 1.5, -26.6, 2, 1.4); paint(g, '#2a1a14'); }
    else { g.beginPath(); g.moveTo(0.4,-26.9); g.lineTo(2.6,-26.9); g.lineTo(1.5,-25.6); g.closePath(); paint(g, '#ff8fa3'); }
    if(m==='open'){ oval(g, 1.5, -22.4, 2.9, 3.3); paint(g, '#7a1f2b', INK, 0.8); oval(g, 1.5, -20.7, 1.7, 1.1); paint(g, '#ff7a8a'); }
    else if(f==='tense'){ oval(g, 1.5, -22.6, 1.8, 1.6); paint(g, '#c0392b', INK, 0.7); }
    else if(f==='happy'){ g.beginPath(); g.moveTo(-1.5,-24.4); g.quadraticCurveTo(1.5,-19.5,4.5,-24.4); g.closePath(); paint(g, '#e2546b', INK, 0.8); }
    else { g.beginPath(); g.arc(0.2,-24.6,1.3,0.1*Math.PI,0.95*Math.PI); g.moveTo(4.1,-24.4); g.arc(2.8,-24.6,1.3,0.05*Math.PI,0.9*Math.PI); g.stroke(); }
  }
  if(k==='neko'){ g.strokeStyle='rgba(91,58,41,.75)'; g.lineWidth=0.6; g.beginPath(); [[-1,-0.06],[1,0.06]].forEach(([s,dy])=>{ for(let i=0;i<2;i++){ const yy=-25.5+i*2; g.moveTo(1.5+s*7.5, yy); g.lineTo(1.5+s*14, yy+(i?1.4:-0.6)+dy); } }); g.stroke(); }
  if(o.sweat){ const yy=-40+((t*2.2)%1)*6; g.beginPath(); g.moveTo(16,yy-3.4); g.quadraticCurveTo(18.6,yy+0.6,16,yy+1.6); g.quadraticCurveTo(13.4,yy+0.6,16,yy-3.4); paint(g, '#7cd3ff', '#2b8bd1', 0.5); }
  g.restore();
  if(o.holdR) o.holdR(g);
  if(!o.noArms) arm(o.armR===undefined ? {x:13, y:-15, r:0} : o.armR);
  if(f==='sleep'){ g.fillStyle='#4a6fa5'; g.textAlign='center'; for(let i=0;i<3;i++){ const k2=((t*0.5+i/3)%1); g.globalAlpha=Math.sin(k2*Math.PI); g.font='bold '+(5+k2*5)+'px '+NUMF; g.fillText('Z', 16+k2*10, -44-k2*16); } g.globalAlpha=1; }
  g.restore();
}
// 看板（棒つき）。y：板の 下の へり（地面が 0）
function postSign(g, x, y, text, o){
  o=o||{}; const fs=o.fs||11; g.save(); g.font='900 '+fs+'px '+NUMF;
  const tw=g.measureText(text).width, bw=Math.max(tw+fs*1.1, fs*3.4), bh=fs*1.62;
  rr(g, x-1.4, y-2, 2.8, (o.foot!=null ? o.foot : 0)-y+2, 1); paint(g, '#8a5a2b', '#5c3a19', 0.5);
  g.translate(x, y-bh/2); if(o.rot) g.rotate(o.rot);
  rr(g, -bw/2, -bh/2, bw, bh, 3); paint(g, '#ffe9b0', '#a8733c', 1.3);
  g.fillStyle=o.red ? '#d62828' : INK; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text, 0, fs*0.06);
  g.restore(); return {w:bw, h:bh};
}
// めくりの カード（k：めくり 0〜1。前の 上半分が たおれて、新しい 下半分が おりる）
function flipCard(g, x, y, w, h, cur, old, k, red){
  const half=(txt, top, sy)=>{
    g.save(); g.translate(x, y); g.scale(1, Math.max(0.001, sy)); g.beginPath(); g.rect(-w/2-0.5, top ? -h/2-0.5 : 0, w+1, h/2+0.5); g.clip();
    rr(g, -w/2, -h/2, w, h, 2.2); g.fillStyle=lin(g, 0, -h/2, 0, h/2, ['#454b59','#2a2e37','#1f222a']); g.fill();
    g.fillStyle=red ? '#ff6b5b' : '#ffffff'; g.font='900 '+(h*0.64).toFixed(2)+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt, 0, h*0.05);
    if(sy<0.999){ g.fillStyle='rgba(0,0,0,'+(0.45*(1-sy)).toFixed(3)+')'; g.fillRect(-w/2, -h/2, w, h); }
    g.restore();
  };
  if(old==null || k>=1){ half(cur, true, 1); half(cur, false, 1); }
  else if(k<0.5){ half(cur, true, 1); half(old, false, 1); half(old, true, 1-2*k); }
  else { half(cur, true, 1); half(old, false, 1); half(cur, false, 2*k-1); }
  g.strokeStyle='rgba(0,0,0,.65)'; g.lineWidth=0.5; g.beginPath(); g.moveTo(x-w/2, y); g.lineTo(x+w/2, y); g.stroke();
  g.strokeStyle='#c9ced8'; g.lineWidth=0.8; [-0.26,0.26].forEach(d=>{ g.beginPath(); g.arc(x+d*w, y-h/2, 1.2, Math.PI*0.9, Math.PI*2.1); g.stroke(); });
}
// 太鼓（前から 見た 面に 時間）
function drum(g, cx, cy, R, txt, red, wob){
  g.strokeStyle='#6b3f1d'; g.lineWidth=2.4; g.lineCap='round'; g.beginPath(); g.moveTo(cx-R*0.8, 0); g.lineTo(cx+R*0.45, cy+R*0.62); g.moveTo(cx+R*0.8, 0); g.lineTo(cx-R*0.45, cy+R*0.62); g.stroke();
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); paint(g, rad(g, cx-R*0.3, cy-R*0.3, R*0.2, R*1.1, ['#c0703a','#8b4a2b','#5e2f16']), '#3b1d0c', 1);
  const r2=R*0.83*(1+wob*0.035);
  g.beginPath(); g.arc(cx, cy, r2, 0, TAU); paint(g, rad(g, cx-r2*0.3, cy-r2*0.35, r2*0.1, r2*1.05, ['#fffaf0','#f3e2bd','#e2c48e']), '#a07a3c', 0.8);
  g.fillStyle='#2b1a10'; for(let i=0;i<18;i++){ const an=i/18*TAU; g.beginPath(); g.arc(cx+Math.cos(an)*R*0.915, cy+Math.sin(an)*R*0.915, 0.65, 0, TAU); g.fill(); }
  let fs=R*0.6; g.font='900 '+fs.toFixed(2)+'px '+NUMF; const tw=g.measureText(txt).width; if(tw>r2*1.66){ fs*=r2*1.66/tw; g.font='900 '+fs.toFixed(2)+'px '+NUMF; }
  g.fillStyle=red ? '#d62828' : '#3b1d0c'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt, cx, cy+fs*0.06);
}
// 譜面台（楽譜に 時間）
function musicStand(g, x, txt, red){
  g.strokeStyle='#3b3b45'; g.lineWidth=1.5; g.lineCap='round'; g.beginPath(); g.moveTo(x, -1); g.lineTo(x, -27); g.moveTo(x-7.5, 0); g.lineTo(x, -7); g.lineTo(x+7.5, 0); g.stroke();
  const fs=10.5; g.save(); g.translate(x, -37); g.font='900 '+fs+'px '+NUMF;
  const tw=g.measureText(txt).width, w=Math.max(30, tw+9), h=21;
  g.beginPath(); g.moveTo(-w/2, -h/2); g.lineTo(w/2, -h/2); g.lineTo(w/2+2.4, h/2); g.lineTo(-w/2-2.4, h/2); g.closePath(); paint(g, '#2f2f38', '#15151b', 0.8);
  rr(g, -w/2+2, -h/2+2, w-4, h-5.5, 1.2); paint(g, '#fffdf5');
  g.strokeStyle='rgba(60,60,80,.25)'; g.lineWidth=0.4; g.beginPath(); for(let i=0;i<5;i++){ const yy=-h/2+4+i*2.6; g.moveTo(-w/2+3.5, yy); g.lineTo(w/2-3.5, yy); } g.stroke();
  g.fillStyle=red ? '#d62828' : INK; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt, 0, -0.6);
  g.restore();
}
// 数える 字（ドン・わん・♪・ケロ・数）を 出す
function pop(L, C, txt, x, y, o){ o=o||{}; (L.pops=L.pops||[]).push({txt, x, y, t0:C.t, col:o.col||'#ff5a36', sz:o.sz||8}); if(L.pops.length>12) L.pops.shift(); }
const PERF={
  // 🐻 くま：太鼓を たたく（面に 時間）。のこり10秒は 両手で
  kuma(g, C, L){
    const bx=-17, dx=14, dy=-19, R=18.5, both=C.last10 || C.fast;
    const sw=C.active ? swing(C.since) : 0.6;
    const wob=C.active && C.since<0.3 ? Math.sin(C.since*55)*(1-C.since/0.3) : 0;
    drum(g, dx, dy, R, C.str, C.last10 || C.done, wob);
    const thR=C.done ? -1.15 : lerp(-0.18, -1.0, sw), thL=C.done ? -2.0 : both ? lerp(0.02, -1.6, sw) : 0.95;
    const hand=(sx, sy, th, len)=>[sx+Math.cos(th)*len, sy+Math.sin(th)*len];
    const hR=hand(7, -17, thR, 6.5), tR=hand(hR[0], hR[1], thR-0.12, 15), hL=hand(-6, -17, thL, 6.5), tL=hand(hL[0], hL[1], thL-0.1, 18);
    const stick=(h, tp)=>g2=>{ g2.strokeStyle='#7a4a22'; g2.lineWidth=1.7; g2.lineCap='round'; g2.beginPath(); g2.moveTo(h[0], h[1]); g2.lineTo(tp[0], tp[1]); g2.stroke(); g2.beginPath(); g2.arc(tp[0], tp[1], 1.3, 0, TAU); paint(g2, '#f3d7b5', '#7a4a22', 0.5); };
    const hy=C.done ? Math.abs(Math.sin(C.doneT*5))*10 : 0;
    g.save(); g.translate(bx, 0);
    creature(g, 'kuma', {t:C.t, face:C.mood, mouth:C.last10 && C.since<0.25 ? 'open' : '', hy, sweat:C.last10 || C.fast, sleep:false,
      armL:{x:hL[0], y:hL[1], r:thL+Math.PI/2}, armR:{x:hR[0], y:hR[1], r:thR+Math.PI/2}, holdL:stick(hL, tL), holdR:stick(hR, tR)});
    g.restore();
    const hit=[bx+tR[0], tR[1]-hy];
    if(C.beat) pop(L, C, both ? 'ドドン' : 'ドン', dx+4, dy-R-3, {sz:both ? 10 : 8.5, col:'#d62828'});
    if(C.done && !L.donePop){ L.donePop=true; pop(L, C, 'ドドーン！', dx, dy-R-4, {sz:12, col:'#d62828'}); }
    return {head:[bx+1.5, -48-hy], hit};
  },
  // 🐱 ねこ：めくりの 数字板を かかえて、1秒ごとに 前足で めくる
  neko(g, C, L){
    const groups=String(C.str).split(':'), n=groups.length, ch=19.5, gap=3.8, red=C.last10 || C.done;
    if(!L.cards || L.cards.length!==n) L.cards=groups.map(s=>({cur:s, old:null, t0:-9}));
    groups.forEach((s,i)=>{ const c=L.cards[i]; if(c.cur!==s){ c.old=c.cur; c.cur=s; c.t0=C.t; } });
    g.save(); g.font='900 '+(ch*0.64).toFixed(2)+'px '+NUMF; const ws=groups.map(s=>g.measureText(s).width+4.6); g.restore();
    const total=ws.reduce((a,b)=>a+b, 0)+gap*(n-1), hy=C.done ? Math.abs(Math.sin(C.doneT*5))*9 : 0, by=-9-hy, x0=1.5-total/2;
    creature(g, 'neko', {t:C.t, face:C.mood, mouth:C.last10 && C.since<0.25 ? 'open' : '', hy, noArms:true, sweat:C.last10});
    rr(g, x0-2.4, by-ch/2-2.4, total+4.8, ch+4.8, 2.6); paint(g, lin(g, 0, by-ch/2, 0, by+ch/2, ['#a26a34','#7d4c22']), INK, 1);
    let x=x0; const cx=[];
    groups.forEach((s,i)=>{ const c=L.cards[i]; flipCard(g, x+ws[i]/2, by, ws[i], ch, c.cur, c.old, (C.t-c.t0)/0.34, red && i===n-1); cx.push(x+ws[i]/2); x+=ws[i];
      if(i<n-1){ g.fillStyle='#ffe9b0'; [-2.6,2.6].forEach(d=>{ g.beginPath(); g.arc(x+gap/2, by+d, 0.9, 0, TAU); g.fill(); }); x+=gap; } });
    // 前足：左は 板の はし、右は めくる
    const xr=x0+total+1.2, xs=cx[n-1]+ws[n-1]*0.18, rest=[xr, by-0.5], top=[xs, by-ch/2-1.6], bot=[xs-1, by+ch*0.3], s=C.since;
    let pr=rest;
    if(C.done) pr=[xr+1.5, by-ch/2-3];
    else if(C.active){ if(s<0.16) pr=lerp2(top, bot, s/0.16); else if(s<0.5) pr=lerp2(bot, rest, sm((s-0.16)/0.34)); else if(s>0.82) pr=lerp2(rest, top, sm((s-0.82)/0.18)); }
    const paw=(p, r)=>{ oval(g, p[0], p[1], 3.6, 3, r); paint(g, ANI.neko.body, INK, 1); g.strokeStyle=INK; g.lineWidth=0.5; g.beginPath(); g.moveTo(p[0]-1, p[1]-2.3); g.lineTo(p[0]-1, p[1]-0.8); g.moveTo(p[0]+1, p[1]-2.3); g.lineTo(p[0]+1, p[1]-0.8); g.stroke(); };
    paw([x0-1.2, by-0.5], 0.2); paw(pr, -0.2);
    if(C.beat) pop(L, C, 'ぱたっ', xs+6, by-ch/2-2, {sz:6.5, col:'#8a5a2b'});
    return {head:[1.5, -48-hy], hit:[xs, by]};
  },
  // 🐶 いぬ：看板の 横に すわって、1秒ごとに「わん！」
  inu(g, C, L){
    const dxg=-15, sx=24, bark=C.active && C.since<0.32;
    const jolt=C.active && C.since<0.3 ? Math.sin(C.since*40)*0.05*(1-C.since/0.3) : 0;
    postSign(g, sx, -27, C.str, {red:C.last10 || C.done, fs:10.5, rot:jolt});
    const headRot=C.active && C.since<0.36 ? -0.24*Math.sin(Math.PI*C.since/0.36) : 0, hy=C.done ? Math.abs(Math.sin(C.doneT*5))*12 : 0;
    g.save(); g.translate(dxg, 0);
    creature(g, 'inu', {t:C.t, face:C.mood, mouth:bark || C.done ? 'open' : '', headRot, sit:!C.done, hy, wag:C.last10 || C.done ? 1.9 : 1, sweat:C.last10,
      armL:C.done ? {x:-11, y:-24, r:0.5} : {x:-2.2, y:-5.6, r:0}, armR:C.done ? {x:14, y:-24, r:-0.5} : {x:7.4, y:-5.6, r:0}});
    g.restore();
    const mouth=[dxg+12, -27-hy];
    if(C.beat) pop(L, C, 'わん！', dxg+13, -51-hy, {sz:C.last10 ? 9.5 : 8, col:'#c0392b'});
    return {head:[dxg+1.5, -48-hy], hit:mouth};
  },
  // 🐰 うさぎ：なわとび（1秒に 1回 とぶ）
  usagi(g, C, L){
    const rx=-11, sx=26, ph=C.active ? C.since*TAU : 0;
    postSign(g, sx, -30, C.str, {red:C.last10 || C.done, fs:10.5});
    const hop=C.active ? (C.last10 ? 14 : 10)*Math.pow(Math.max(0, Math.cos(ph)), 3) : C.done ? Math.abs(Math.sin(C.doneT*5))*16 : 0;
    const hl=[rx-12.5, -15-hop], hr=[rx+15.5, -15-hop];
    const cy=C.active ? -15-hop+(Math.cos(ph)>=0 ? 34+hop : 62)*Math.cos(ph) : 19;
    const rope=()=>{ g.strokeStyle='#e8466c'; g.lineWidth=1.3; g.lineCap='round'; g.beginPath(); g.moveTo(hl[0], hl[1]); g.quadraticCurveTo(rx+1.5, cy, hr[0], hr[1]); g.stroke(); };
    const behind=C.active && ph>0.02 && ph<Math.PI;
    if(C.done){ g.strokeStyle='#e8466c'; g.lineWidth=1.3; g.beginPath(); g.moveTo(rx-20, -0.6); g.bezierCurveTo(rx-10, -3, rx-2, 1.5, rx+8, -1); g.bezierCurveTo(rx+14, -2.5, rx+18, 0.5, rx+24, -0.8); g.stroke(); }
    else if(behind) rope();
    g.save(); g.translate(rx, 0);
    const handle=(h)=>g2=>{ if(C.done) return; rr(g2, h[0]-rx-1.3, h[1]+hop-3.2, 2.6, 6.4, 1.1); paint(g2, '#ffd23f', '#b8860b', 0.5); };
    creature(g, 'usagi', {t:C.t, face:C.mood, mouth:C.last10 && C.since<0.25 ? 'open' : '', hy:hop, sweat:C.last10 || C.fast,
      armL:C.done ? {x:-11, y:-26, r:0.5} : {x:-12.5, y:-15, r:0.45}, armR:C.done ? {x:14, y:-26, r:-0.5} : {x:15.5, y:-15, r:-0.45}, holdL:handle(hl), holdR:handle(hr)});
    g.restore();
    if(!C.done && !behind) rope();
    if(C.beat) pop(L, C, String(C.sec>60 ? C.sec%60 : C.sec), rx+19, -6, {sz:C.last10 ? 10 : 8, col:'#ff4f9a'});
    return {head:[rx+1.5, -64-hop], hit:[rx+1.5, -1]};
  },
  // 🐧 ペンギン：指揮（4拍で 下・左・右・上。1秒ごとに ♪）
  pen(g, C, L){
    const px=-16, sx=22;
    musicStand(g, sx, C.str, C.last10 || C.done);
    const pts=[[16,-13],[3,-21],[23,-24],[14,-38]], i=((C.beats||0)%4+4)%4, j=(i+1)%4, s=C.active ? Math.min(1, C.since) : 0.5;
    const e2=sm(s), big=C.last10 ? 1.25 : 1;
    let tip=[lerp(pts[i][0], pts[j][0], e2), lerp(pts[i][1], pts[j][1], e2)-Math.sin(Math.PI*s)*3*big];
    if(C.done) tip=[16, -44];
    const sh=[6,-18], d=Math.hypot(tip[0]-sh[0], tip[1]-sh[1])||1, ux=(tip[0]-sh[0])/d, uy=(tip[1]-sh[1])/d, hand=[sh[0]+ux*6, sh[1]+uy*6];
    let lean=C.active ? Math.sin(Math.PI*s)*0.05*(i%2 ? 1 : -1)*big : 0;
    if(C.done){ const k=C.doneT; lean=k<1.4 ? 0.45*sm(k/0.35)*(1-sm((k-1)/0.4)) : 0; }
    const baton=g2=>{ g2.strokeStyle='#5b3a29'; g2.lineWidth=1.9; g2.lineCap='round'; g2.beginPath(); g2.moveTo(hand[0], hand[1]); g2.lineTo(tip[0], tip[1]); g2.stroke(); g2.strokeStyle='#ffffff'; g2.lineWidth=1.1; g2.stroke(); g2.beginPath(); g2.arc(tip[0], tip[1], 0.9, 0, TAU); g2.fillStyle='#ffffff'; g2.fill(); g2.strokeStyle='#5b3a29'; g2.lineWidth=1.6; g2.beginPath(); g2.moveTo(hand[0], hand[1]); g2.lineTo(hand[0]+ux*2.4, hand[1]+uy*2.4); g2.stroke(); };
    g.save(); g.translate(px, 0);
    creature(g, 'pen', {t:C.t, face:C.done && C.doneT<1.4 ? 'happy' : C.mood, mouth:C.last10 && C.since<0.25 ? 'open' : '', lean, sweat:C.last10, hy:C.done && C.doneT>1.4 ? Math.abs(Math.sin(C.doneT*5))*9 : 0,
      armL:C.done && C.doneT>1.4 ? {x:-11, y:-24, r:0.5} : {x:-10.5, y:-12+Math.sin(C.t*3)*0.6, r:0.25}, armR:{x:hand[0], y:hand[1], r:Math.atan2(uy, ux)+Math.PI/2}, holdR:baton});
    g.restore();
    const tp=[px+tip[0], tip[1]];
    if(C.beat) pop(L, C, (C.beats||0)%2 ? '♫' : '♪', tp[0]+2, tp[1]-3, {sz:C.last10 ? 11 : 9, col:['#ff4f9a','#3e8bff','#ffb000','#22b573'][i]});
    return {head:[px+1.5, -48], hit:tp};
  },
  // 🐸 かえる：はすの 葉で 1秒ごとに「ケロ」（のどが ふくらむ。のこり10秒は のどに 数）
  kaeru(g, C, L){
    const fx=-13, sx=25;
    postSign(g, sx, -27, C.str, {red:C.last10 || C.done, fs:10.5, foot:3});
    L.rip=(L.rip||[]).filter(t0=>C.t-t0<1.4); if(C.beat) L.rip.push(C.t);
    for(const t0 of L.rip){ const k=(C.t-t0)/1.4; oval(g, fx+1, 1.4, 20+26*k, 4.6+6*k); paint(g, null, 'rgba(255,255,255,'+(0.65*(1-k)).toFixed(3)+')', 0.6); }
    oval(g, fx+1, 1, 19.5, 4.5); paint(g, lin(g, 0, -3, 0, 5, ['#6ccf5a','#3e9e3a']), '#2e7d32', 0.8);
    g.beginPath(); g.moveTo(fx+1, 1); g.lineTo(fx+9, 5.6); g.lineTo(fx+13, 4.6); g.closePath(); paint(g, '#4aa8de');
    const sac=C.active ? (C.since<0.5 ? Math.sin(Math.PI*C.since/0.5) : 0)*(C.last10 ? 1.45 : 1) : 0, hop=C.done ? Math.abs(Math.sin(C.doneT*4))*20 : 0;
    g.save(); g.translate(fx, 0);
    creature(g, 'kaeru', {t:C.t, face:C.mood, hy:hop, sac, sacTxt:C.last10 ? String(C.sec) : '', mouth:C.done ? 'open' : '', sweat:C.last10,
      armL:C.done ? {x:-12, y:-24, r:0.5} : {x:-10.5, y:-10, r:0.35}, armR:C.done ? {x:15, y:-24, r:-0.5} : {x:13, y:-10, r:-0.35}});
    g.restore();
    const mouth=[fx+10, -26-hop];
    if(C.beat) pop(L, C, 'ケロ', fx+14, -52-hop, {sz:C.last10 ? 9.5 : 8, col:'#2e8b3a'});
    return {head:[fx+1.5, -48-hop], hit:[fx+1.5, -18]};
  },
};
// 背景：空（残りが へるほど 夕やけ・お日さまが しずむ・星が 出る）・丘・草（かえるは 池）
function stageScene(g, S, L, gy, dusk, pond){
  const W=S.W, H=S.H, t=S.t, m=Math.min(W,H), d=clamp(dusk,0,1);
  g.fillStyle=lin(g, 0, 0, 0, gy, [mix('#7ccbff','#3d4f9e',d), mix('#b9e6ff','#ef8a6a',d), mix('#effaff','#ffd29a',d)]); g.fillRect(0, 0, W, gy+2);
  if(d>0.7){ if(!L.stars2){ const r=seeded(11); L.stars2=Array.from({length:30},()=>[r(), r()*0.45, r()*6]); } g.fillStyle='#ffffff'; for(const [sx,sy,ph] of L.stars2){ g.globalAlpha=(d-0.7)/0.3*(0.4+0.6*Math.abs(Math.sin(t*1.3+ph))); g.beginPath(); g.arc(sx*W, sy*gy, m*0.003, 0, TAU); g.fill(); } g.globalAlpha=1; }
  const sx=W*0.82, sy=lerp(Math.min(H*0.13, gy*0.3), gy-m*0.01, Math.pow(d, 1.3)), sr=m*0.055;
  if(d<0.85){ g.save(); g.translate(sx, sy); g.rotate(t*0.3); g.strokeStyle='rgba(255,196,40,'+(0.8*(1-d/0.85)).toFixed(3)+')'; g.lineWidth=m*0.008; g.lineCap='round'; g.beginPath();
    for(let i=0;i<12;i++){ const an=i/12*TAU; g.moveTo(Math.cos(an)*sr*1.3, Math.sin(an)*sr*1.3); g.lineTo(Math.cos(an)*sr*1.7, Math.sin(an)*sr*1.7); } g.stroke(); g.restore(); }
  g.fillStyle=rad(g, sx, sy, sr*0.6, sr*3, ['rgba(255,190,90,'+(0.25+0.35*d).toFixed(3)+')','rgba(255,150,80,0)']); g.beginPath(); g.arc(sx, sy, sr*3, 0, TAU); g.fill();
  g.beginPath(); g.arc(sx, sy, sr, 0, TAU); paint(g, rad(g, sx-sr*0.3, sy-sr*0.3, sr*0.1, sr, [mix('#fff3a0','#ffd08a',d), mix('#ffd23f','#ff6b3d',d)]));
  for(let i=0;i<4;i++){ const w=W*1.4, x=((((i*0.29+0.07)*w-t*W*0.006*(1+i*0.25))%w)+w)%w-W*0.2; cloud(g, x, gy*(0.16+0.13*(i%3)), m*0.032*(1+0.22*(i%2)), 0.92, mix('#ffffff','#ffc9b8',d)); }
  const hill=(col, h, off)=>{ g.fillStyle=col; const w=W*0.9; for(let i=-1;i<3;i++){ oval(g, i*w+off, gy+2, w*0.42, h); g.fill(); } };
  hill(mix('#bfe9b0','#8e7fa8',d*0.7), H*0.12, W*0.1); hill(mix('#9fdc8f','#6f8a7a',d*0.7), H*0.075, W*0.55);
  if(pond){
    g.fillStyle=lin(g, 0, gy, 0, H, [mix('#7fd0f5','#5a6fae',d*0.7), mix('#3b9bd6','#2c3f7a',d*0.7)]); g.fillRect(0, gy-m*0.004, W, H-gy+m*0.004);
    g.strokeStyle='rgba(255,255,255,.35)'; g.lineWidth=Math.max(1, m*0.003); g.beginPath();
    for(let i=0;i<9;i++){ const y=gy+H*(0.02+0.025*i), x=(((i*0.37+t*0.02)%1)+1)%1*W; g.moveTo(x-m*0.04, y); g.lineTo(x+m*0.04, y); } g.stroke();
    [[0.08,0.05,0.07],[0.9,0.03,0.06],[0.75,0.09,0.05]].forEach(([x,y,r])=>{ oval(g, x*W, gy+H*y, m*r, m*r*0.25); paint(g, '#5cb85a', '#2e7d32', 1); });
    g.strokeStyle='#4f7d32'; g.lineWidth=Math.max(1.5, m*0.006); g.lineCap='round'; g.beginPath(); [0.03,0.06,0.95,0.97].forEach((x,i)=>{ g.moveTo(x*W, gy+H*0.01); g.quadraticCurveTo(x*W+(i%2 ? 4 : -4), gy-H*0.06, x*W+(i%2 ? -3 : 3), gy-H*(0.1+0.02*i)); }); g.stroke();
  } else {
    g.fillStyle=lin(g, 0, gy, 0, H, [mix('#7fd36f','#5e8a5a',d*0.6), mix('#55b552','#3f6b48',d*0.6)]); g.fillRect(0, gy, W, H-gy);
    g.strokeStyle=mix('#3f9a44','#35603d',d*0.6); g.lineWidth=Math.max(1, m*0.004); g.lineCap='round'; g.beginPath();
    for(let i=0;i<12;i++){ const x=(i+0.5)/12*W, y=gy+H*(0.025+0.035*((i*7)%5)/4), s=m*0.012; g.moveTo(x-s, y); g.lineTo(x-s*0.4, y-s*1.4); g.moveTo(x, y); g.lineTo(x, y-s*1.8); g.moveTo(x+s, y); g.lineTo(x+s*0.4, y-s*1.4); }
    g.stroke();
    for(let i=0;i<6;i++){ const x=(i*0.17+0.05)*W, y=gy+H*(0.05+0.035*(i%3)), s=m*0.008; g.fillStyle=['#ff8fb1','#fff36b','#ffffff'][i%3]; for(let j=0;j<5;j++){ const an=j/5*TAU; g.beginPath(); g.arc(x+Math.cos(an)*s, y+Math.sin(an)*s, s*0.75, 0, TAU); g.fill(); } g.fillStyle='#ffb000'; g.beginPath(); g.arc(x, y, s*0.55, 0, TAU); g.fill(); }
  }
}
function drawAni(g, e, S, L, k){
  const W=S.W, H=S.H, t=S.t;
  dtOf(L, t);
  const gy=S.prev ? H*0.88 : S.bot-Math.max(H*0.09, 72*S.d), a=S.prev ? Math.min(W*0.0075, H*0.0098) : Math.max(0.5, Math.min(W*0.0108, (gy-H*0.2)/88));
  const sleep=S.mode==='iv' && S.ph==='rest', prep=S.mode==='iv' && S.ph==='prep', fast=S.mode==='iv' && S.ph==='work';
  const active=!S.paused && !S.done && !sleep && !prep;
  // 1秒ごとの 合図（数える 動き）
  let beat=false;
  if(S.tickT!=null && L.tk!==S.tickT){ L.tk=S.tickT; if(active && t-S.tickT<0.25){ beat=true; L.beats=(L.beats||0)+1; } }   // 合図の すぐ あとだけ（見せ方を かえた ときの 古い 合図は 数えない）
  let since=S.tickT==null ? 0.6 : t-S.tickT; if(since>1.25) since=0.6;
  const dusk=S.mode==='down' ? (S.done ? 1 : clamp(S.p,0,1)) : 0;
  L.dusk=+dusk.toFixed(3);
  stageScene(g, S, L, gy, dusk, k==='kaeru');
  const mood=S.done ? 'happy' : sleep ? 'sleep' : S.last10 ? 'tense' : S.mode==='down' && S.p>=0.5 ? 'focus' : 'n';
  const C={t, since, active, sleep, prep, fast, mood, last10:S.last10, done:S.done, doneT:S.doneT||0, sec:S.sec, str:S.sstr||S.str, prev:S.prev, beat, beats:L.beats||0};
  g.save(); g.translate(W/2, gy); g.scale(a, a);
  const r=(PERF[k]||PERF.neko)(g, C, L) || {};
  // 数える 字（上へ 出て 消える）
  L.pops=(L.pops||[]).filter(q=>t-q.t0<0.9);
  for(const q of L.pops){ const k2=(t-q.t0)/0.9, sc=0.6+0.4*sm(k2/0.15); g.save(); g.globalAlpha=1-k2*k2; g.translate(q.x, q.y-12*k2); g.scale(sc, sc);
    g.font='900 '+q.sz+'px '+NUMF; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; g.lineWidth=q.sz*0.28; g.strokeStyle='rgba(255,255,255,.9)'; g.strokeText(q.txt, 0, 0); g.fillStyle=q.col; g.fillText(q.txt, 0, 0); g.restore(); }
  g.restore();
  if(beat && !S.prev && e && r.hit) e.burst(W/2+r.hit[0]*a, gy+r.hit[1]*a, {n:S.last10 ? 18 : 9, sp:S.last10 ? 260 : 170, ring:false});
  // ことば（はんぶん・のこり10秒は 数を さけぶ・0 で よろこぶ）
  let say='', sayRed=false;
  if(S.done) say=(ANI[k]||ANI.neko).end;
  else if(!S.prev){
    if(S.last10 && S.sec>0){ say=S.sec+'！'; sayRed=true; }
    else if(S.mode==='down' && S.p>=0.5){ if(L.halfT==null) L.halfT=t; if(t-L.halfT<2.4) say='はんぶん！'; }
    if(S.mode==='iv'){ if(L.lph!==S.ph){ L.lph=S.ph; L.phT=t; } if(prep) say='よーい…'; else if(fast && t-L.phT<1.6) say='がんばる！'; }
    if(S.mode==='up' && S.sec>0 && S.sec%60===0) say=(S.sec/60)+'分！';
  }
  const head=r.head||[0,-48];
  if(say){ const fb=sayRed ? 15 : 10.5, hx=W/2+head[0]*a, hy=gy+head[1]*a, by=hy-(fb*0.8+6)*a;
    bubble(g, say, hx, by, Math.round(fb*a), hx, hy-2*a, Object.assign({minX:6*a, maxX:W-6*a}, sayRed ? {col:'#d62828'} : {})); }
  L.pose=S.done ? 'cheer' : sleep ? 'sleep' : prep || S.paused ? 'stand' : fast ? 'fast' : 'act';
  L.say=say; L.act=ACT[k]||''; L.v=L.beats||0; L.head=[W/2+head[0]*a, gy+head[1]*a];
}

/* ───────── 🫧 ぽよん（v589。描き方は hade-poyo.js）───────── */
function drawPoyo(g, e, S, L){
  const P=window.HADE_POYO; if(!P){ drawBig(g, e, S, L); return; }
  const W=S.W, H=S.H, t=S.t;
  P.bg(g, W, H, t, {boost:e ? e.boost() : 0, urgent:S.last10}, L);
  const top=S.prev ? H*0.05 : H*0.13, bot=S.prev ? H*0.95 : S.bot;
  let str=S.bstr||S.str, sub=S.bsub||'';
  if(S.mode==='clock'){ sub=S.ap||''; if(S.csec) str=S.bstr+':'+String(S.sec).padStart(2,'0'); }   // 🕐 時計は 秒も ぽよん
  if(S.done && S.doneT>1.2 && t-(L.doneHop==null ? -9 : L.doneHop)>1.8){ L.doneHop=t; P.hop(L, t, 1.4); }   // 0 の あとも ときどき みんなで ぴょん
  P.draw(g, e, {x:W*0.03, y:top, w:W*0.94, h:Math.max(10, bot-top)}, str, {t, rainbow:true, sub, urgent:S.last10, snd:S.prev ? null : S.snd, intro:true}, L);
  L.v=L.batch||0;
}

/* ───────── 入口 ───────── */
// 描く。look：'big'・'poyo'・'pic'・'ani'（'ring' は hade-timer.js）。sub：絵／動物の 種類
function draw(e, look, sub, S, L){
  const g=e.g;
  if(look==='big') drawBig(g, e, S, L);
  else if(look==='pic') drawPic(g, e, S, L, has(PICS, sub) ? sub : 'rocket');
  else if(look==='ani') drawAni(g, e, S, L, has(ANIS, sub) ? sub : 'neko');
  else if(look==='poyo') drawPoyo(g, e, S, L);
}
// 0 に なったとき（絵ごとの 派手な しめくくり）。snd は 音を 鳴らす 関数
function finish(e, look, sub, L, snd){
  const W=e.W, H=e.H, h=L.head||[W/2, H/2], d=e.d, big=n=>Math.min(n, W/d/6), cx=x=>clamp(x, W*0.3, W*0.7);
  if(look==='pic'){
    if(sub==='bomb'){ const c=L.lay ? L.lay.c(10, 14) : h; e.explode(c[0], c[1], '#ff8a3d', 'peony', 2.2); e.after(0.12, ()=>e.explode(c[0], c[1], '#ffd23f', 'ring', 1.8)); e.burst(c[0], c[1], {n:220, sp:950, pal:['#ffffff','#ffd23f','#ff8a3d','#ff3b30','#555555']}); e.flash('#ffffff', 0.6); e.kick(1.3); e.text(cx(c[0]), c[1]-40*d, 'ドカーン！', {sz:big(72), pop:true, life:1.6, grad:['#fff6c8','#ffb000','#ff2d2d']}); snd('boom'); e.after(0.18, ()=>snd('boom')); }
    else if(sub==='balloon'){ e.burst(h[0], h[1]+40*d, {n:110, sp:640, pal:['#ff4d6d','#ff8fa3','#ffffff','#c9184a']}); e.flash('#ffffff', 0.35); e.kick(0.7); e.text(cx(h[0]), h[1]+20*d, 'パーン！', {sz:big(64), pop:true, life:1.4, grad:['#ffffff','#ff8fa3','#ff2d55']}); snd('boom'); snd('pop', 7); }
    else if(sub==='rocket'){ e.after(0.3, ()=>{ e.burst(h[0], h[1], {n:120, sp:520, pal:['#ffffff','#ffd23f','#ff8a3d']}); e.kick(1); }); snd('whoosh'); e.after(0.25, ()=>snd('boom')); }
    else if(sub==='candle'){ e.burst(h[0], h[1], {n:30, sp:160, pal:['#d0d0d8','#ffffff','#ffd28a']}); snd('down'); }
    else if(sub==='sand'){ e.burst(h[0], h[1], {n:90, sp:520, pal:['#ffe39a','#ffd23f','#ffffff']}); e.spiral(h[0], h[1], Math.min(W,H)*0.3, {n:50}); snd('level'); }
    else if(sub==='flower'){ e.burst(h[0], h[1], {n:100, sp:560, pal:['#ffd23f','#ff8fb1','#9dff5c','#ffffff']}); e.rain(['🌸','🌼','✨','🌻'], 14); snd('level'); }
  } else if(look==='ani'){ e.confetti(130); e.rain(['🎉','⭐','🎵','✨'], 16); e.burst(h[0], h[1], {n:80, sp:520}); snd('level'); }
  else if(look==='big'){ e.burst(W/2, H/2, {n:160, sp:900}); e.kick(0.8); }
  else if(look==='poyo' && window.HADE_POYO) window.HADE_POYO.finish(e, L, snd);   // ぜんぶ つぶれて 大しぶき・ぽよよ〜ん（v589）
}
// たしかめ用（いまの ようす）
function info(L){ return {k:L.k||'', sub:L.sub||'', v:L.v==null ? null : L.v, x:L.x==null ? null : L.x, fs:L.fs==null ? null : L.fs, str:L.str||'', pose:L.pose||'', say:L.say||'', act:L.act||'', dusk:L.dusk==null ? null : L.dusk, head:L.head ? L.head.map(n=>Math.round(n)) : null}; }
window.HADE_LOOK={ LOOKS, PICS, ANIS, END, draw, finish, info, pill, has:(kind, k)=>has(kind==='pic' ? PICS : kind==='ani' ? ANIS : LOOKS, k) };
})();
