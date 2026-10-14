/* 📇 連絡帳：写真のかわりの アイコン（v550。直す画面の「📷 写真」→「🙂 アイコンからえらぶ」で 使うときに読む）
   ・若者（男・女）・中年（男・女）・子ども・お年寄り・会社やお店 を 10こずつ。絵は ここで組み立てる（SVG。外から何も読まない）。
   ・人の絵は「頭の真ん中を 0,0 とした形」（髪・ぼうし・めがね…）を 頭の大きさに合わせて置く。
   ・えらぶと renraku.js が 320×320 の絵（JPEG）にして、その人の写真として入れる（スマホに戻すときも 写真として持っていける）。
   ・window.rkIcons = { cats:[{k,n,items:[id…]}], svg(id, inline) → SVG の文字, label(id) → 名前 } */
(function(){
'use strict';
const SKIN=['#f9dcc4','#f3c9a8','#e9b591','#d99c74','#bf825b'];
const H={kuro:'#2a2220',koge:'#3e2c23',cha:'#6b4630',akaruicha:'#9a6a3d',kin:'#c9a063',aka:'#8a3b24',hai:'#8f8f8f',gin:'#b3b3b3',shiro:'#d6d6d6'};

/* 色を 少し暗く／明るく */
function tone(hex, k){
  const n=parseInt(hex.slice(1),16); let r=n>>16, g=(n>>8)&255, b=n&255;
  const f=v=>Math.max(0,Math.min(255,Math.round(k<0 ? v*(1+k) : v+(255-v)*k)));
  return '#'+((1<<24)|(f(r)<<16)|(f(g)<<8)|f(b)).toString(16).slice(1);
}
/* 頭の真ん中を 0,0 とした道すじ（M L C Q Z と数）を、頭の大きさ・場所に合わせて置きなおす */
function tr(d, h){
  const sx=h.rx/18.5, sy=h.ry/21.5; let i=0;
  return d.replace(/-?\d+(\.\d+)?/g, m=>{ const v=+m, out=(i%2===0) ? 50+v*sx : h.cy+v*sy; i++; return ' '+(Math.round(out*10)/10); });   // 前に空白（「-21-16」のように つながっていた数が くっつかないように）
}
const P=(d,h,fill,extra)=>`<path d="${tr(d,h)}" fill="${fill}"${extra||''}/>`;
const S=(d,h,stroke,w,extra)=>`<path d="${tr(d,h)}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra||''}/>`;
const C=(x,y,r,h,fill,extra)=>`<circle cx="${(50+x*h.rx/18.5).toFixed(1)}" cy="${(h.cy+y*h.ry/21.5).toFixed(1)}" r="${(r*h.rx/18.5).toFixed(1)}" fill="${fill}"${extra||''}/>`;
const E=(x,y,rx,ry,h,fill,extra)=>`<ellipse cx="${(50+x*h.rx/18.5).toFixed(1)}" cy="${(h.cy+y*h.ry/21.5).toFixed(1)}" rx="${(rx*h.rx/18.5).toFixed(1)}" ry="${(ry*h.ry/21.5).toFixed(1)}" fill="${fill}"${extra||''}/>`;

/* ── 髪（うしろ＝頭より下に描く／まえ＝頭の上に描く） ── */
const HAIR={
  short:{f:'M-19 2C-21-16-10-25 2-24C14-23 21-15 19 2C17-7 13-12 7-13C0-10-9-12-14-8C-16-5-18-2-19 2Z'},
  side:{f:'M-19 3C-22-18-6-27 8-24C18-22 22-13 19 3C18-5 15-10 10-12C2-12-8-17-13-10C-16-6-18-1-19 3Z'},
  buzz:{f:'M-18-2C-19-18-9-23 0-23C9-23 19-18 18-2C16-12 9-16 0-16C-9-16-16-12-18-2Z'},
  spiky:{f:'M-19 1L-20-12L-15-22L-9-19L-5-28L0-21L5-29L9-21L15-26L16-17L20-12L19 1C16-9 10-13 0-12C-10-13-16-9-19 1Z'},
  mash:{f:'M-21 5C-23-18-10-27 0-27C10-27 23-18 21 5L17-3C9-6-9-6-17-3Z'},
  center:{f:'M-20 6C-22-17-10-26 0-25C10-26 22-17 20 6C17-4 12-12 2-15L0-10L-2-15C-12-12-17-4-20 6Z',b:'M-20 0C-21 8-19 12-16 13L16 13C19 12 21 8 20 0Z'},
  wolf:{f:'M-20 4C-23-19-6-28 7-25C18-23 23-13 20 4C18-6 13-11 7-12C1-9-8-13-13-8C-17-4-19 0-20 4Z',b:'M-20-2C-23 8-20 16-15 18L15 18C20 16 23 8 20-2Z'},
  perm:{f:'M-20 2C-22-17-10-26 0-26C10-26 22-17 20 2C17-8 9-11 0-10C-9-11-17-8-20 2Z',curl:[[-17,-12,5],[-11,-19,5.5],[-3,-22,5.5],[5,-22,5.5],[12,-19,5.5],[17,-12,5],[-19,-4,4],[19,-4,4]]},
  receding:{f:'M-19 2C-21-14-12-24 0-24C12-24 21-14 19 2C18-6 15-10 11-15C7-17 3-15 0-18C-3-15-7-17-11-15C-15-10-18-6-19 2Z'},
  slick:{f:'M-19 1C-20-17-10-25 1-25C12-25 21-17 19 1C18-9 12-16 1-17C-11-16-18-9-19 1Z',shine:'M-6-21C0-23 6-22 10-19'},
  balding:{f:'M-19 6C-20-4-18-10-15-13C-16-6-15 0-14 6Z M19 6C20-4 18-10 15-13C16-6 15 0 14 6Z'},
  thin:{f:'M-19 6C-20-4-18-10-15-13C-16-6-15 0-14 6Z M19 6C20-4 18-10 15-13C16-6 15 0 14 6Z',strand:'M-7-20C-3-23 3-23 7-20'},
  // 女の人
  long:{b:'M-21-4C-24-22-14-28 0-28C14-28 24-22 21-4L24 36C10 42-10 42-24 36Z',f:'M-20 6C-23-20-9-27 2-26C14-25 22-16 20 6C18-6 12-12 4-13C-4-10-12-9-16-4C-18-1-19 2-20 6Z'},
  hime:{b:'M-21-4C-24-22-14-28 0-28C14-28 24-22 21-4L23 36C10 40-10 40-23 36Z',f:'M-20 4C-22-20-10-26 0-26C10-26 22-20 20 4L17-6C8-7-8-7-17-6Z'},
  bob:{b:'M-22 14C-25-22 25-22 22 14C20 19 14 18 14 14L-14 14C-14 18-20 19-22 14Z',f:'M-20-1C-22-30 22-30 20-1C13-8-13-8-20-1Z'},
  bobside:{b:'M-22 12C-25-22 25-22 22 12C20 18 14 17 14 12L-14 12C-14 17-20 18-22 12Z',f:'M-19 3C-21-19-6-26 7-24C17-22 21-13 19 3C17-6 13-11 8-12C0-11-9-15-14-9C-17-5-18-1-19 3Z'},
  pony:{b:'M13-17C30-15 31 13 23 25C25 10 22-2 13-7Z',f:'M-19 4C-21-20-8-26 4-25C15-24 21-14 19 4C16-7 10-12 2-12C-6-12-14-8-19 4Z',tie:[15,-14]},
  bun:{b:'',top:[0,-26,8],f:'M-19 2C-21-18-9-24 0-24C9-24 21-18 19 2C16-8 8-12 0-12C-8-12-16-8-19 2Z'},
  pixie:{b:'M-19 0C-21 10-18 14-15 15L15 15C18 14 21 10 19 0Z',f:'M-20 8C-23-18-8-27 4-26C16-25 23-14 20 8C19-2 16-8 11-11C4-9-6-14-12-9C-16-5-18 1-20 8Z'},
  wavy:{b:'M-21-4C-24-24 24-24 21-4C26 6 22 14 26 24C22 34 10 38 0 37C-10 38-22 34-26 24C-22 14-26 6-21-4Z',f:'M-20 5C-23-19-8-27 3-26C15-25 22-15 20 5C18-6 12-12 4-13C-4-11-12-10-16-5C-18-2-19 1-20 5Z'},
  semi:{b:'M-21-2C-24-22 24-22 21-2L23 22C14 27-14 27-23 22Z',f:'M-20 5C-22-19-6-27 6-25C17-23 22-14 20 5C18-6 13-11 7-12C-1-11-10-14-15-8C-18-4-19 0-20 5Z'},
  permf:{f:'M-21 4C-23-17-11-26 0-26C11-26 23-17 21 4C18-6 9-10 0-9C-9-10-18-6-21 4Z',curl:[[-19,-9,6],[-14,-18,6.5],[-6,-23,6.5],[3,-24,6.5],[11,-21,6.5],[18,-13,6],[21,-3,5.5],[-21,0,5.5],[-21,9,5],[21,8,5]]},
  // 子ども
  kid:{f:'M-19 2C-21-16-10-24 1-24C13-24 21-16 19 2C17-7 12-11 6-12C0-9-8-12-13-8C-16-5-18-2-19 2Z',cow:'M1-24C-1-30 5-32 6-27'},
  twin:{b:'',side:[[-24,4,7],[24,4,7]],f:'M-20 0C-22-30 22-30 20 0C12-9-12-9-20 0Z',ties:[[-19,0],[19,0]]},
  twinbun:{b:'',top2:[[-15,-20,7],[15,-20,7]],f:'M-20 0C-22-30 22-30 20 0C12-8-12-8-20 0Z'},
  baby:{f:'',tuft:'M-2-21C-7-29 5-31 4-24'}
};

/* ── 服 ── */
function bodyOf(p, h){
  const cl=p.cl, dk=tone(cl,-0.22), sk=SKIN[p.sk||0], skd=tone(sk,-0.12);
  const kid=p.age==='kid', baby=p.age==='baby';
  const top=baby?82:(kid?79:73), wL=baby?26:(kid?21:14), wR=100-wL;
  let s=`<rect x="${43.5+(kid||baby?1:0)}" y="${h.cy+12}" width="${13-(kid||baby?2:0)}" height="${top-h.cy-6}" rx="5" fill="${skd}"/>`;
  s+=`<path d="M${wL} 100C${wL+1} ${top+9} ${wL+14} ${top+1} 50 ${top}C${wR-14} ${top+1} ${wR-1} ${top+9} ${wR} 100Z" fill="${cl}"/>`;
  const t=p.top||'tee';
  if(t==='tee'||t==='knit') s+=`<path d="M42 ${top+0.5}Q50 ${top+8} 58 ${top+0.5}Z" fill="${skd}"/>`+(t==='knit'?`<path d="M41.5 ${top+0.5}Q50 ${top+10} 58.5 ${top+0.5}" fill="none" stroke="${dk}" stroke-width="2.4"/>`:'');
  if(t==='shirt') s+=`<path d="M42 ${top}L50 ${top+9}L58 ${top}Z" fill="${skd}"/><path d="M41 ${top-1}L50 ${top+10}L44 ${top+14}L38 ${top+4}Z" fill="#fff"/><path d="M59 ${top-1}L50 ${top+10}L56 ${top+14}L62 ${top+4}Z" fill="#fff"/>`;
  if(t==='suit') s+=`<path d="M42 ${top}L50 ${top+19}L58 ${top}Z" fill="#fff"/>`+(p.tie?`<path d="M48.4 ${top+3}L51.6 ${top+3}L53 ${top+17}L50 ${top+22}L47 ${top+17}Z" fill="${p.tie}"/><path d="M48 ${top+1}L52 ${top+1}L51.6 ${top+4}L48.4 ${top+4}Z" fill="${tone(p.tie,-0.2)}"/>`:'')
    +`<path d="M42 ${top}L50 ${top+19}L41 100L32 ${top+6}Z" fill="${dk}"/><path d="M58 ${top}L50 ${top+19}L59 100L68 ${top+6}Z" fill="${dk}"/>`;
  if(t==='hoodie') s+=`<path d="M35 ${top-1}C37 ${top-9} 63 ${top-9} 65 ${top-1}C58 ${top+4} 42 ${top+4} 35 ${top-1}Z" fill="${dk}"/><path d="M46 ${top+3}L45 ${top+13}M54 ${top+3}L55 ${top+13}" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`;
  if(t==='blouse') s+=`<path d="M42 ${top}Q50 ${top+7} 58 ${top}Z" fill="${skd}"/><path d="M41 ${top-0.5}C42 ${top+7} 49 ${top+8} 50 ${top+4}C46 ${top+3} 43 ${top+1} 41 ${top-0.5}Z" fill="#fff"/><path d="M59 ${top-0.5}C58 ${top+7} 51 ${top+8} 50 ${top+4}C54 ${top+3} 57 ${top+1} 59 ${top-0.5}Z" fill="#fff"/>`;
  if(t==='cardigan') s+=`<path d="M42 ${top}L50 ${top+18}L58 ${top}Z" fill="${p.in||'#fff'}"/><path d="M42 ${top}L50 ${top+18}L50 100L37 100L33 ${top+5}Z" fill="${cl}"/><path d="M58 ${top}L50 ${top+18}L50 100L63 100L67 ${top+5}Z" fill="${cl}"/><circle cx="50" cy="${top+21}" r="1.3" fill="${dk}"/><circle cx="50" cy="${top+26}" r="1.3" fill="${dk}"/>`;
  if(t==='kimono') s+=`<path d="M42 ${top}L56 100L49 100L38 ${top+3}Z" fill="#f5f5f5"/><path d="M58 ${top}L44 100L51 100L62 ${top+3}Z" fill="#f5f5f5"/><path d="M58 ${top}L44 100L50 100L60 ${top+2}Z" fill="${dk}"/>`;
  if(t==='overall') s+=`<path d="M42 ${top}Q50 ${top+7} 58 ${top}Z" fill="${skd}"/><rect x="40" y="${top+9}" width="20" height="${100-top-9}" rx="3" fill="${p.in||'#3f6fb5'}"/><path d="M40 ${top+10}L35 ${top+2}M60 ${top+10}L65 ${top+2}" stroke="${p.in||'#3f6fb5'}" stroke-width="3" stroke-linecap="round"/><circle cx="43" cy="${top+12}" r="1.4" fill="#ffd54f"/><circle cx="57" cy="${top+12}" r="1.4" fill="#ffd54f"/>`;
  if(t==='apron') s+=`<path d="M42 ${top}Q50 ${top+7} 58 ${top}Z" fill="${skd}"/><path d="M39 ${top+8}L61 ${top+8}L63 100L37 100Z" fill="${p.in||'#fff'}"/><path d="M39 ${top+8}L35 ${top}M61 ${top+8}L65 ${top}" stroke="${p.in||'#fff'}" stroke-width="2.4" stroke-linecap="round"/>`;
  if(t==='bib') s+=`<path d="M38 ${top+1}C40 ${top+12} 60 ${top+12} 62 ${top+1}C56 ${top+5} 44 ${top+5} 38 ${top+1}Z" fill="${p.in||'#fff'}"/>`;
  if(p.neck) s+=[-8,-4,0,4,8].map(dx=>`<circle cx="${50+dx}" cy="${top+3.5+Math.abs(dx)*-0.25+Math.abs(dx)*Math.abs(dx)*0.0}" r="1.5" fill="#fffaf0" stroke="#d9cbb0" stroke-width=".4"/>`).join('');
  return s;
}

/* ── 顔 ── */
function faceOf(p, h){
  const hc=p.hc||H.kuro, ink='#2a2220', sk=SKIN[p.sk||0], skd=tone(sk,-0.18);
  const kid=p.age==='kid'||p.age==='baby', old=p.age==='old', fem=p.sex==='f';
  let s='';
  // まゆ
  const bw=old?1.6:1.5, by=kid?-4:-5.5, bc=old&&p.hc?tone(p.hc,-0.25):tone(hc,-0.1);
  if(p.age!=='baby') s+=S(`M-10.5 ${by+0.6}Q-7.5 ${by-1.4}-4.5 ${by}`,h,bc,bw)+S(`M10.5 ${by+0.6}Q7.5 ${by-1.4} 4.5 ${by}`,h,bc,bw);
  // 目
  const ey=kid?3:2;
  if(p.eyes==='smile') s+=S(`M-10 ${ey+1}Q-7.5 ${ey-2}-5 ${ey+1}`,h,ink,1.7)+S(`M10 ${ey+1}Q7.5 ${ey-2} 5 ${ey+1}`,h,ink,1.7);
  else if(p.eyes==='wink') s+=E(-7.5,ey,1.9,2.6,h,ink)+S(`M10 ${ey+1}Q7.5 ${ey-1.5} 5 ${ey+1}`,h,ink,1.7);
  else {
    const r=kid?2.4:1.9, ry=kid?2.8:2.5;
    s+=E(-7.5,ey,r,ry,h,ink)+E(7.5,ey,r,ry,h,ink);
    if(!old) s+=C(-6.8,ey-0.9,0.7,h,'#fff')+C(8.2,ey-0.9,0.7,h,'#fff');
    if(fem && !kid) s+=S(`M-10.4 ${ey-1.2}L-11.8 ${ey-2.4}`,h,ink,1.1)+S(`M10.4 ${ey-1.2}L11.8 ${ey-2.4}`,h,ink,1.1);
  }
  // めがね
  if(p.gl==='round') s+=C(-7.5,ey,5.6,h,'none',` stroke="${p.glc||'#3a3a3a'}" stroke-width="1.6"`)+C(7.5,ey,5.6,h,'none',` stroke="${p.glc||'#3a3a3a'}" stroke-width="1.6"`)+S(`M-2 ${ey}Q0 ${ey-1.5} 2 ${ey}`,h,p.glc||'#3a3a3a',1.4)+S(`M-13 ${ey-1}L-18.4 ${ey-2}M13 ${ey-1}L18.4 ${ey-2}`,h,p.glc||'#3a3a3a',1.3);
  if(p.gl==='square') s+=`<rect x="${(50-13.4*h.rx/18.5).toFixed(1)}" y="${(h.cy+(ey-4.4)*h.ry/21.5).toFixed(1)}" width="${(11*h.rx/18.5).toFixed(1)}" height="${(8.4*h.ry/21.5).toFixed(1)}" rx="2" fill="none" stroke="${p.glc||'#3a3a3a'}" stroke-width="1.6"/>`
    +`<rect x="${(50+2.4*h.rx/18.5).toFixed(1)}" y="${(h.cy+(ey-4.4)*h.ry/21.5).toFixed(1)}" width="${(11*h.rx/18.5).toFixed(1)}" height="${(8.4*h.ry/21.5).toFixed(1)}" rx="2" fill="none" stroke="${p.glc||'#3a3a3a'}" stroke-width="1.6"/>`
    +S(`M-2.4 ${ey-1}L2.4 ${ey-1}M-13.4 ${ey-1.5}L-18.4 ${ey-2.4}M13.4 ${ey-1.5}L18.4 ${ey-2.4}`,h,p.glc||'#3a3a3a',1.3);
  // 鼻・ほお
  if(p.age!=='baby') s+=S(`M0 ${ey+3}Q1.7 ${ey+6} 0 ${ey+7}`,h,skd,1.2);
  if(p.cheek!==false && (kid||fem)) s+=E(-11.5,ey+7.5,3.3,2.1,h,'#f3a1a1',' opacity=".6"')+E(11.5,ey+7.5,3.3,2.1,h,'#f3a1a1',' opacity=".6"');
  // しわ（お年寄り）
  if(old) s+=S(`M-7-13Q0-15 7-13`,h,skd,1)+S(`M-12.5 ${ey+6}Q-12 ${ey+10}-9.5 ${ey+12.5}`,h,skd,1)+S(`M12.5 ${ey+6}Q12 ${ey+10} 9.5 ${ey+12.5}`,h,skd,1);
  // ひげ
  if(p.brd) s+=P(`M-19 2C-19 22-8 27 0 27C8 27 19 22 19 2C17 14 10 19 0 19C-10 19-17 14-19 2Z`,h,p.brdc||hc);
  if(p.mus) s+=P(`M-8 ${ey+9}C-4 ${ey+6} 0 ${ey+7} 0 ${ey+8}C0 ${ey+7} 4 ${ey+6} 8 ${ey+9}C4 ${ey+11} 0 ${ey+10} 0 ${ey+9.5}C0 ${ey+10}-4 ${ey+11}-8 ${ey+9}Z`,h,p.brdc||hc);
  // 口
  const my=ey+(kid?9.5:11), lip=fem&&!kid?'#c2555b':'#a0524a';
  if(p.mouth==='open') s+=P(`M-5 ${my-0.5}Q0 ${my+6} 5 ${my-0.5}Z`,h,'#c0504d')+P(`M-2.6 ${my+2.2}Q0 ${my+4.6} 2.6 ${my+2.2}Q0 ${my+1.6}-2.6 ${my+2.2}Z`,h,'#ef8a8a');
  else if(p.mouth==='o') s+=E(0,my+1,2,2.4,h,'#c0504d');
  else s+=S(`M-5 ${my}Q0 ${my+(p.mouth==='grin'?5.5:4)} 5 ${my}`,h,lip,1.8);
  return s;
}

/* ── かざり（ぼうし・リボン・耳かざり…） ── */
function accOf(p, h){
  const a=p.acc||'', c=p.ac||'#e53935';
  if(a==='cap') return P('M-20-4C-21-25 21-25 20-4Z',h,c)+P('M-2-6C10-8 26-6 30-2C22 0 8-2-2-2Z',h,tone(c,-0.2))+C(0,-21.6,1.6,h,tone(c,-0.25));
  if(a==='beanie') return P('M-21-2C-22-27 22-27 21-2Z',h,c)+`<rect x="${(50-21.5*h.rx/18.5).toFixed(1)}" y="${(h.cy-6*h.ry/21.5).toFixed(1)}" width="${(43*h.rx/18.5).toFixed(1)}" height="${(6*h.ry/21.5).toFixed(1)}" rx="2" fill="${tone(c,-0.2)}"/>`+C(0,-26,4.2,h,'#fff');
  if(a==='hat') return P('M-21-6C-20-22 18-24 23-10C27-8 28-4 24-3C10-2-10-2-21-6Z',h,c)+S('M-20-7C-6-6 8-6 23-5',h,tone(c,-0.25),1.2);
  if(a==='beret') return P('M-22-8C-24-22 18-27 24-12C24-8 16-6 0-6C-12-6-20-6-22-8Z',h,c)+S('M2-24L3-28',h,tone(c,-0.3),2);
  if(a==='ribbon') return P('M10-20L4-26L4-14Z',h,c)+P('M10-20L16-26L16-14Z',h,c)+C(10,-20,2.2,h,tone(c,-0.2));
  if(a==='headband') return S('M-19-6C-16-22 16-22 19-6',h,c,3.6);
  if(a==='flower') return C(-14,-15,2.6,h,c)+C(-11,-18,2.6,h,c)+C(-11,-12,2.6,h,c)+C(-8,-15,2.6,h,c)+C(-11,-15,2,h,'#ffd54f');
  if(a==='earring') return C(-18.6,11,1.7,h,c)+C(18.6,11,1.7,h,c);
  if(a==='helmet') return P('M-21-3C-22-26 22-26 21-3Z',h,c)+`<rect x="${(50-23*h.rx/18.5).toFixed(1)}" y="${(h.cy-5*h.ry/21.5).toFixed(1)}" width="${(46*h.rx/18.5).toFixed(1)}" height="${(4*h.ry/21.5).toFixed(1)}" rx="1.5" fill="${tone(c,-0.15)}"/>`+P('M-3-24L3-24L2-12L-2-12Z',h,tone(c,0.25));
  return '';
}

function person(p){
  const kid=p.age==='kid', baby=p.age==='baby';
  const h=baby?{cy:52,rx:22,ry:21}:(kid?{cy:49,rx:20.5,ry:20.5}:{cy:45,rx:18.5,ry:21.5});
  const sk=SKIN[p.sk||0], hc=p.hc||H.kuro, st=HAIR[p.hair]||HAIR.short;
  let s=`<rect width="100" height="100" fill="${p.bg||'#dfe9f7'}"/>`;
  // うしろの髪
  if(st.b) s+=P(st.b,h,hc);
  if(st.side) s+=st.side.map(([x,y,r])=>E(x,y,r*0.75,r*1.25,h,hc)).join('');
  if(st.top) s+=C(st.top[0],st.top[1],st.top[2],h,hc);
  if(st.top2) s+=st.top2.map(([x,y,r])=>C(x,y,r,h,hc)).join('');
  s+=bodyOf(p,h);
  // 耳・頭
  s+=E(-18.5,3,3.6,5,h,sk)+E(18.5,3,3.6,5,h,sk);
  s+=`<ellipse cx="50" cy="${h.cy}" rx="${h.rx}" ry="${h.ry}" fill="${sk}"/>`;
  // まえの髪
  if(st.curl) s+=st.curl.map(([x,y,r])=>C(x,y,r,h,hc)).join('');
  if(st.f) s+=P(st.f,h,hc);
  if(st.shine) s+=S(st.shine,h,tone(hc,0.35),1.6,' opacity=".8"');
  if(st.strand) s+=S(st.strand,h,hc,1.4);
  if(st.cow) s+=S(st.cow,h,hc,2.4);
  if(st.tuft) s+=S(st.tuft,h,hc,2.6);
  if(st.tie) s+=C(st.tie[0],st.tie[1],2.6,h,p.ac||'#e53935');
  if(st.ties) s+=st.ties.map(([x,y])=>C(x,y,2.4,h,p.ac||'#e53935')).join('');
  s+=faceOf(p,h);
  s+=accOf(p,h);
  return s;
}

/* ── 会社・お店 ── */
function place(k, bg){
  let s=`<rect width="100" height="100" fill="${bg}"/>`;
  const win=(x,y,w,hh,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="1" fill="${c}"/>`;
  if(k==='biru'){ s+=`<rect x="28" y="18" width="44" height="72" rx="3" fill="#5c7cae"/><rect x="24" y="86" width="52" height="6" rx="2" fill="#3f5a86"/>`;
    for(let r=0;r<5;r++) for(let c=0;c<3;c++) s+=win(33+c*12,24+r*12,8,8,'#d7e6fb');
    s+=`<rect x="45" y="78" width="10" height="12" fill="#2f4670"/>`; }
  if(k==='kojo'){ s+=`<path d="M14 88L14 52L30 40L30 52L46 40L46 52L62 40L62 52L86 52L86 88Z" fill="#8d6e63"/><rect x="66" y="22" width="9" height="32" fill="#6d4c41"/><circle cx="76" cy="16" r="5" fill="#cfd8dc"/><circle cx="84" cy="11" r="4" fill="#cfd8dc"/>`
    +win(20,62,9,9,'#ffe082')+win(36,62,9,9,'#ffe082')+win(52,62,9,9,'#ffe082')+`<rect x="68" y="66" width="12" height="22" fill="#5d4037"/><rect x="10" y="88" width="80" height="4" rx="2" fill="#5d4037"/>`; }
  if(k==='mise'){ s+=`<rect x="20" y="42" width="60" height="46" fill="#fff8e1"/><path d="M16 30L84 30L88 44L12 44Z" fill="#e53935"/>`
    +[0,1,2,3,4,5,6,7].map(i=>`<path d="M${16+i*8.5} 30L${16+i*8.5+4.25} 30L${12+i*9.5+4.75} 44L${12+i*9.5} 44Z" fill="#fff"/>`).join('')
    +`<path d="M12 44Q16.75 50 21.5 44Q26.25 50 31 44Q35.75 50 40.5 44Q45.25 50 50 44Q54.75 50 59.5 44Q64.25 50 69 44Q73.75 50 78.5 44Q83.25 50 88 44Z" fill="#e53935"/>`
    +`<rect x="26" y="56" width="20" height="18" rx="1" fill="#bbdefb"/><rect x="54" y="56" width="18" height="32" fill="#8d6e63"/><circle cx="68" cy="73" r="1.3" fill="#ffd54f"/><rect x="14" y="88" width="72" height="4" rx="2" fill="#6d4c41"/>`; }
  if(k==='byoin'){ s+=`<rect x="20" y="30" width="60" height="58" rx="3" fill="#fafafa" stroke="#cfd8dc" stroke-width="1.5"/><rect x="42" y="14" width="16" height="20" rx="2" fill="#fafafa" stroke="#cfd8dc" stroke-width="1.5"/>`
    +`<rect x="47.5" y="17" width="5" height="14" fill="#e53935"/><rect x="43" y="21.5" width="14" height="5" fill="#e53935"/>`
    +win(26,40,10,9,'#b3e5fc')+win(45,40,10,9,'#b3e5fc')+win(64,40,10,9,'#b3e5fc')+win(26,56,10,9,'#b3e5fc')+win(64,56,10,9,'#b3e5fc')+`<rect x="43" y="66" width="14" height="22" fill="#90a4ae"/><rect x="14" y="88" width="72" height="4" rx="2" fill="#90a4ae"/>`; }
  if(k==='gakko'){ s+=`<rect x="14" y="44" width="72" height="44" fill="#ffcc80"/><rect x="38" y="26" width="24" height="62" fill="#ffb74d"/><path d="M36 28L50 16L64 28Z" fill="#e57373"/>`
    +`<circle cx="50" cy="38" r="7" fill="#fff" stroke="#8d6e63" stroke-width="1.4"/><path d="M50 34L50 38L53 40" stroke="#5d4037" stroke-width="1.4" fill="none" stroke-linecap="round"/>`
    +win(19,52,8,8,'#e3f2fd')+win(29,52,8,8,'#e3f2fd')+win(63,52,8,8,'#e3f2fd')+win(73,52,8,8,'#e3f2fd')+win(19,66,8,8,'#e3f2fd')+win(73,66,8,8,'#e3f2fd')
    +`<rect x="44" y="70" width="12" height="18" fill="#8d6e63"/><path d="M62 16L62 6" stroke="#5d4037" stroke-width="1.3"/><path d="M62 6L70 8.5L62 11Z" fill="#e53935"/><rect x="10" y="88" width="80" height="4" rx="2" fill="#a1887f"/>`; }
  if(k==='ginko'){ s+=`<path d="M14 36L50 16L86 36Z" fill="#607d8b"/><rect x="16" y="36" width="68" height="5" fill="#78909c"/>`
    +[0,1,2,3].map(i=>`<rect x="${21+i*16}" y="43" width="7" height="36" fill="#eceff1"/>`).join('')+`<rect x="14" y="79" width="72" height="6" fill="#78909c"/><rect x="10" y="85" width="80" height="6" rx="2" fill="#607d8b"/>`
    +`<text x="50" y="33" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffd54f" font-family="sans-serif">¥</text>`; }
  if(k==='yakusho'){ s+=`<rect x="16" y="40" width="68" height="48" fill="#cfd8dc"/><rect x="34" y="24" width="32" height="18" fill="#b0bec5"/><path d="M50 24L50 8" stroke="#546e7a" stroke-width="1.4"/><path d="M50 8L62 11L50 14Z" fill="#fff" stroke="#90a4ae" stroke-width=".6"/><circle cx="55" cy="11" r="1.8" fill="#e53935"/>`
    +[0,1,2,3,4].map(i=>win(21+i*12,48,8,10,'#e1f5fe')).join('')+[0,1,3,4].map(i=>win(21+i*12,64,8,10,'#e1f5fe')).join('')
    +`<rect x="45" y="64" width="10" height="24" fill="#546e7a"/><rect x="12" y="88" width="76" height="4" rx="2" fill="#78909c"/>`; }
  if(k==='ie'){ s+=`<path d="M14 50L50 20L86 50Z" fill="#e57373"/><rect x="22" y="48" width="56" height="40" fill="#fff3e0"/><rect x="64" y="26" width="8" height="16" fill="#8d6e63"/>`
    +`<rect x="44" y="62" width="13" height="26" rx="1" fill="#8d6e63"/><circle cx="54" cy="76" r="1.2" fill="#ffd54f"/>`+win(28,56,11,10,'#bbdefb')+win(62,56,11,10,'#bbdefb')+`<rect x="10" y="88" width="80" height="4" rx="2" fill="#81c784"/>`; }
  if(k==='truck'){ s+=`<rect x="10" y="34" width="50" height="40" rx="3" fill="#fafafa" stroke="#90a4ae" stroke-width="1.5"/><path d="M60 46L76 46L88 58L88 74L60 74Z" fill="#42a5f5"/><path d="M64 50L75 50L83 59L64 59Z" fill="#e3f2fd"/>`
    +`<rect x="14" y="44" width="42" height="8" rx="2" fill="#42a5f5"/><circle cx="26" cy="76" r="7" fill="#37474f"/><circle cx="26" cy="76" r="3" fill="#cfd8dc"/><circle cx="74" cy="76" r="7" fill="#37474f"/><circle cx="74" cy="76" r="3" fill="#cfd8dc"/>`; }
  if(k==='kogu'){ s+=`<g transform="rotate(-40 50 50)"><rect x="46" y="30" width="8" height="52" rx="3" fill="#8d6e63"/><rect x="32" y="20" width="36" height="14" rx="3" fill="#78909c"/></g>`
    +`<g transform="rotate(40 50 50)"><rect x="46.5" y="34" width="7" height="46" rx="3" fill="#b0bec5"/><path d="M50 14C41 14 36 22 39 29L45 26L45 18L55 18L55 26L61 29C64 22 59 14 50 14Z" fill="#b0bec5"/></g>`; }
  if(k==='inshoku'){ s+=`<path d="M22 50L78 50C78 68 66 80 50 80C34 80 22 68 22 50Z" fill="#e53935"/><rect x="18" y="47" width="64" height="6" rx="3" fill="#c62828"/><path d="M30 50C34 44 40 44 44 50C48 44 54 44 58 50C62 44 68 44 72 50" fill="#ffe082"/>`
    +`<path d="M56 18L64 46M64 16L70 44" stroke="#8d6e63" stroke-width="2.6" stroke-linecap="round"/><path d="M38 40C36 34 40 32 38 26M46 38C44 32 48 30 46 24" stroke="#b0bec5" stroke-width="1.8" fill="none" stroke-linecap="round"/><rect x="38" y="80" width="24" height="5" rx="2" fill="#c62828"/>`; }
  if(k==='biyo'){ s+=`<circle cx="36" cy="66" r="9" fill="none" stroke="#ec407a" stroke-width="4"/><circle cx="64" cy="66" r="9" fill="none" stroke="#ec407a" stroke-width="4"/>`
    +`<path d="M41 58L64 18M59 58L36 18" stroke="#90a4ae" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="42" r="2.4" fill="#546e7a"/>`; }
  return s;
}

/* ── 一覧（10こずつ） ── */
const BG=['#dfe9f7','#e3f2e6','#fbe7e1','#f3e5f5','#fff4d6','#e0f2f1','#fde7ef','#e8eaf6','#f1f8e9','#efebe9'];
const BG_OLD=['#cfe0f5','#d4ead8','#f6d9cf','#e6d4ee','#fbe9bf','#cdeae6','#f8d3e0','#d3d8f0','#dfeccf','#e2d9d4'];   // 白い髪が見えるよう 少し濃い地
const ITEMS={
  ym:[ // 若者・男
    {hair:'short',hc:H.kuro,cl:'#3f6fb5',top:'tee'},
    {hair:'side',hc:H.cha,cl:'#2e7d32',top:'shirt'},
    {hair:'spiky',hc:H.koge,cl:'#e65100',top:'hoodie'},
    {hair:'mash',hc:H.akaruicha,cl:'#6d4c41',top:'knit'},
    {hair:'center',hc:H.kuro,cl:'#455a64',top:'tee',gl:'round'},
    {hair:'buzz',hc:H.kuro,cl:'#c62828',top:'tee',sk:2},
    {hair:'wolf',hc:H.kin,cl:'#5e35b1',top:'hoodie'},
    {hair:'short',hc:H.kuro,cl:'#263238',top:'suit',tie:'#1e88e5'},
    {hair:'side',hc:H.kuro,cl:'#00897b',top:'tee',acc:'cap',ac:'#1565c0'},
    {hair:'mash',hc:H.kuro,cl:'#8d6e63',top:'cardigan',in:'#fff',gl:'square',eyes:'smile'}
  ],
  yf:[ // 若者・女
    {sex:'f',hair:'long',hc:H.kuro,cl:'#ec407a',top:'blouse'},
    {sex:'f',hair:'bob',hc:H.cha,cl:'#42a5f5',top:'tee'},
    {sex:'f',hair:'pony',hc:H.koge,cl:'#66bb6a',top:'tee',ac:'#ff7043'},
    {sex:'f',hair:'hime',hc:H.kuro,cl:'#7e57c2',top:'blouse',acc:'ribbon',ac:'#ec407a'},
    {sex:'f',hair:'wavy',hc:H.akaruicha,cl:'#ffb300',top:'knit'},
    {sex:'f',hair:'pixie',hc:H.kuro,cl:'#26a69a',top:'shirt',acc:'earring',ac:'#ffd54f'},
    {sex:'f',hair:'bun',hc:H.cha,cl:'#ef5350',top:'tee',eyes:'smile'},
    {sex:'f',hair:'bobside',hc:H.kin,cl:'#5c6bc0',top:'cardigan',in:'#fff'},
    {sex:'f',hair:'long',hc:H.cha,cl:'#8d6e63',top:'knit',gl:'round',glc:'#8d6e63'},
    {sex:'f',hair:'semi',hc:H.kuro,cl:'#263238',top:'suit',acc:'headband',ac:'#90caf9'}
  ],
  mm:[ // 中年・男
    {age:'mid',hair:'slick',hc:H.kuro,cl:'#37474f',top:'suit',tie:'#c62828'},
    {age:'mid',hair:'receding',hc:H.koge,cl:'#5d4037',top:'shirt',gl:'square'},
    {age:'mid',hair:'short',hc:H.hai,cl:'#1565c0',top:'suit',tie:'#fbc02d',sk:1},
    {age:'mid',hair:'side',hc:H.kuro,cl:'#455a64',top:'knit',mus:true},
    {age:'mid',hair:'buzz',hc:H.koge,cl:'#2e7d32',top:'tee',sk:2,brd:true},
    {age:'mid',hair:'receding',hc:H.hai,cl:'#795548',top:'cardigan',in:'#fff8e1',gl:'round'},
    {age:'mid',hair:'short',hc:H.kuro,cl:'#ff8f00',top:'tee',acc:'helmet',ac:'#fdd835'},
    {age:'mid',hair:'side',hc:H.cha,cl:'#3949ab',top:'shirt',eyes:'smile'},
    {age:'mid',hair:'slick',hc:H.hai,cl:'#212121',top:'suit',tie:'#7b1fa2',mus:true,gl:'square'},
    {age:'mid',hair:'balding',hc:H.koge,cl:'#00695c',top:'shirt',sk:1}
  ],
  mf:[ // 中年・女
    {age:'mid',sex:'f',hair:'permf',hc:H.koge,cl:'#ad1457',top:'blouse'},
    {age:'mid',sex:'f',hair:'semi',hc:H.cha,cl:'#3949ab',top:'cardigan',in:'#fff',neck:true},
    {age:'mid',sex:'f',hair:'bob',hc:H.kuro,cl:'#00897b',top:'shirt',gl:'square',glc:'#8d6e63'},
    {age:'mid',sex:'f',hair:'bun',hc:H.koge,cl:'#6d4c41',top:'apron',in:'#fff8e1'},
    {age:'mid',sex:'f',hair:'short',hc:H.akaruicha,cl:'#ef6c00',top:'knit',acc:'earring',ac:'#ffd54f'},
    {age:'mid',sex:'f',hair:'wavy',hc:H.koge,cl:'#5e35b1',top:'blouse',neck:true},
    {age:'mid',sex:'f',hair:'pony',hc:H.kuro,cl:'#43a047',top:'tee',ac:'#26a69a',eyes:'smile'},
    {age:'mid',sex:'f',hair:'permf',hc:H.cha,cl:'#e53935',top:'cardigan',in:'#fff',gl:'round'},
    {age:'mid',sex:'f',hair:'bobside',hc:H.hai,cl:'#546e7a',top:'suit'},
    {age:'mid',sex:'f',hair:'semi',hc:H.kuro,cl:'#f06292',top:'knit',acc:'headband',ac:'#4a148c'}
  ],
  ch:[ // 子ども
    {age:'kid',hair:'kid',hc:H.kuro,cl:'#ffb300',top:'tee',mouth:'open'},
    {age:'kid',sex:'f',hair:'twin',hc:H.kuro,cl:'#ec407a',top:'tee',ac:'#ffeb3b'},
    {age:'kid',hair:'mash',hc:H.cha,cl:'#42a5f5',top:'overall',in:'#1e88e5'},
    {age:'kid',sex:'f',hair:'bob',hc:H.koge,cl:'#ab47bc',top:'blouse',acc:'ribbon',ac:'#e53935'},
    {age:'kid',hair:'spiky',hc:H.kuro,cl:'#43a047',top:'tee',acc:'cap',ac:'#e53935',mouth:'grin'},
    {age:'kid',sex:'f',hair:'twinbun',hc:H.cha,cl:'#26a69a',top:'tee',mouth:'open'},
    {age:'baby',hair:'baby',hc:H.koge,cl:'#90caf9',top:'bib',in:'#fff',eyes:'smile',mouth:'o'},
    {age:'kid',sex:'f',hair:'pony',hc:H.kuro,cl:'#ff7043',top:'tee',ac:'#42a5f5',eyes:'smile'},
    {age:'kid',hair:'kid',hc:H.akaruicha,cl:'#7e57c2',top:'hoodie',gl:'round'},
    {age:'baby',sex:'f',hair:'baby',hc:H.kuro,cl:'#f48fb1',top:'bib',in:'#fff',acc:'ribbon',ac:'#f06292',mouth:'open'}
  ],
  old:[ // お年寄り
    {age:'old',hair:'balding',hc:H.shiro,cl:'#6d4c41',top:'cardigan',in:'#fff8e1',gl:'round'},
    {age:'old',sex:'f',hair:'bun',hc:H.gin,cl:'#7e57c2',top:'cardigan',in:'#fff'},
    {age:'old',hair:'thin',hc:H.gin,cl:'#455a64',top:'shirt',mus:true,brdc:H.shiro},
    {age:'old',sex:'f',hair:'permf',hc:H.shiro,cl:'#ec407a',top:'blouse',gl:'square',glc:'#8d6e63'},
    {age:'old',hair:'short',hc:H.shiro,cl:'#2e7d32',top:'knit',acc:'hat',ac:'#8d6e63'},
    {age:'old',sex:'f',hair:'short',hc:H.gin,cl:'#00897b',top:'kimono'},
    {age:'old',hair:'balding',hc:H.gin,cl:'#37474f',top:'kimono',brd:true,brdc:H.shiro,eyes:'smile'},
    {age:'old',sex:'f',hair:'bobside',hc:H.shiro,cl:'#ff8a65',top:'cardigan',in:'#fff',neck:true,eyes:'smile'},
    {age:'old',hair:'receding',hc:H.gin,cl:'#1565c0',top:'suit',tie:'#90a4ae',gl:'square'},
    {age:'old',sex:'f',hair:'semi',hc:H.gin,cl:'#8d6e63',top:'apron',in:'#e8f5e9',acc:'beret',ac:'#5c6bc0'}
  ],
  biz:['biru','kojo','mise','byoin','gakko','ginko','yakusho','ie','truck','kogu','inshoku','biyo']
};
const BIZN={biru:'ビル・会社',kojo:'工場',mise:'お店',byoin:'病院',gakko:'学校',ginko:'銀行',yakusho:'役所',ie:'家',truck:'運送',kogu:'工事・修理',inshoku:'飲食店',biyo:'美容・理容'};
const BIZBG=['#e3f2fd','#efebe9','#fff8e1','#e8f5e9','#e1f5fe','#eceff1','#f3e5f5','#fff3e0','#e3f2fd','#f5f5f5','#fff8e1','#fce4ec'];
const CATS=[['ym','若者・男'],['yf','若者・女'],['mm','中年・男'],['mf','中年・女'],['ch','子ども'],['old','お年寄り'],['biz','会社・お店']];

function draw(id){
  const m=/^([a-z]+)(\d+)$/.exec(String(id||'')); if(!m || !ITEMS[m[1]]) return '';
  const k=m[1], i=+m[2]-1, it=ITEMS[k][i]; if(it==null) return '';
  if(k==='biz') return place(it, BIZBG[i%BIZBG.length]);
  const p=Object.assign({age:'young',sex:'m'}, it);
  if(k==='old') p.age='old';
  if(!p.bg) p.bg=(k==='old'?BG_OLD:BG)[i%BG.length];
  return person(p);
}
window.rkIcons={
  cats:CATS.map(([k,n])=>({k, n, items:ITEMS[k].map((_,i)=>k+(i+1))})),
  svg(id, inline){ const b=draw(id); if(!b) return ''; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${inline?'':' width="320" height="320"'}>${b}</svg>`; },
  label(id){ const m=/^([a-z]+)(\d+)$/.exec(String(id||'')); if(!m) return ''; const c=CATS.find(x=>x[0]===m[1]); if(!c) return ''; return m[1]==='biz' ? (BIZN[ITEMS.biz[+m[2]-1]]||c[1]) : c[1]+' '+m[2]; }
};
})();
