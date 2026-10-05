/* 🌳 家系図（v514〜v517。表電卓の道具。apps/kakeizu/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   ・人（名前・ふりがな・性別・生まれ・亡くなった日・写真・メモ）と、つながり（父・母・夫や妻）を入れていく。
     子・兄弟姉妹は「父・母」から決まる。
   ・図は「中心の人」から、上に親・祖父母…、横に兄弟姉妹と夫や妻、下に子・孫…を並べる（砂時計の形）。
     人を押すと、その人のことと「この人を中心に」「＋父」「＋母」「＋夫・妻」「＋子」「＋兄弟姉妹」。
   ・続柄（父・祖母（母方）・叔父・いとこ・義母・嫁…）は「本人」から自動でつける。
   ・生まれは「1950」「1950/4/1」「昭和25年」「S25.4.1」のように入れられる（和暦も出す）。年齢・亡くなった年齢も出す。
   ・一覧（さがす）・印刷（A4 横）・画像で保存・書き出し／読み込み（写真ごと）。
   ・生まれ順と続き柄（v515）：何番目に生まれたか（bo）を入れると、きょうだいがその順に並び、長男・次女…を自動で付ける。
     続き柄（ord）は自分で選んで決めることもできる。人の窓（カード）のボタンからすぐ選べる（v517）。
   ・養子（v515）：父母と（または父・母の片方と）養子縁組（adopt：b／f／m）。線は点線、続き柄は養子・養女、続柄は養父・養母。
     生みの親は「実父・実母」（bf・bm）として別に入れられる（図には出さず、人の窓に出す）。
   ・入れたものは端末の中だけ（excalc_kakeizu）。 */
(function(){
const KZ_KEY='excalc_kakeizu';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const P2=n=>String(n).padStart(2,'0');
let kz={people:[], me:'', focus:'', up:3, down:2, sib:true, photo:true, wareki:true, scale:1};
let kzEdit=null;       // 直している人の id／足すときは {rel, base}
let kzPhoto='';
let kzSheet=null;      // 開いている人の id

/* ───────── 保存 ───────── */
const cleanP=x=>({id:String(x.id||uid()), name:String(x.name||'').slice(0,40), kana:String(x.kana||'').slice(0,40), sex:x.sex==='m'||x.sex==='f'?x.sex:'',
  birth:String(x.birth||'').slice(0,10), death:String(x.death||'').slice(0,10), dead:!!x.dead||!!x.death, f:String(x.f||''), m:String(x.m||''),
  sp:Array.isArray(x.sp)?x.sp.map(String):[], note:String(x.note||'').slice(0,1000), photo:typeof x.photo==='string'&&x.photo.startsWith('data:image/')?x.photo:'',
  bo:Math.max(0,Math.min(30,Math.round(+x.bo||0))), ord:ORDS.includes(x.ord)?x.ord:'', adopt:['b','f','m'].includes(x.adopt)?x.adopt:'', bf:String(x.bf||''), bm:String(x.bm||'')});
const ORDS=['長男','次男','三男','四男','五男','六男','七男','長女','次女','三女','四女','五女','六女','七女','養子','養女'];
function kzFix(){   // つながりの向きをそろえる（夫婦は両方に・いない人への線を消す）
  const ids=new Set(kz.people.map(p=>p.id));
  kz.people.forEach(p=>{ if(!ids.has(p.f)||p.f===p.id) p.f=''; if(!ids.has(p.m)||p.m===p.id) p.m=''; if(!ids.has(p.bf)||p.bf===p.id) p.bf=''; if(!ids.has(p.bm)||p.bm===p.id) p.bm=''; p.sp=[...new Set(p.sp)].filter(s=>ids.has(s)&&s!==p.id); });
  kz.people.forEach(p=>p.sp.forEach(s=>{ const q=per(s); if(q&&!q.sp.includes(p.id)) q.sp.push(p.id); }));
  if(!ids.has(kz.me)) kz.me=kz.people[0]?kz.people[0].id:'';
  if(!ids.has(kz.focus)) kz.focus=kz.me;
}
function kzLoad(){
  try{ const o=JSON.parse(localStorage.getItem(KZ_KEY)||'null')||{};
    kz={people:Array.isArray(o.people)?o.people.filter(x=>x&&typeof x==='object').slice(0,2000).map(cleanP):[], me:String(o.me||''), focus:String(o.focus||''),
      up:[1,2,3,4].includes(+o.up)?+o.up:3, down:[0,1,2,3].includes(+o.down)?+o.down:2, sib:o.sib!==false, photo:o.photo!==false, wareki:o.wareki!==false,
      scale:Math.min(2,Math.max(0.3,+o.scale||1))};
  }catch(_){ kz={people:[], me:'', focus:'', up:3, down:2, sib:true, photo:true, wareki:true, scale:1}; }
  kzFix();
}
function kzSave(){ try{ localStorage.setItem(KZ_KEY, JSON.stringify(kz)); return true; }catch(_){ toast('保存できませんでした。端末の空きが足りないかもしれません（写真を減らすと入ります）', 4000); return false; } }

/* ───────── つながり ───────── */
const per=id=>kz.people.find(p=>p.id===id);
const parentsOf=id=>{ const p=per(id); return p?[p.f,p.m].filter(x=>x&&per(x)):[]; };
const childrenOf=id=>kz.people.filter(p=>p.f===id||p.m===id).sort(byOrder);
const spousesOf=id=>{ const p=per(id); return p?p.sp.filter(per):[]; };
const siblingsOf=id=>{ const ps=parentsOf(id), me=per(id); if(!ps.length) return []; return kz.people.filter(q=>q.id!==id&&!me.sp.includes(q.id)&&ps.some(x=>q.f===x||q.m===x)).sort(byOrder); };   // 婿養子などで夫や妻がきょうだいにもなるときは、夫や妻として出す
/* きょうだいの並び：生まれ順（何番目）があればそれで、なければ生まれた日で */
function byOrder(a,b){ if(a.bo&&b.bo&&a.bo!==b.bo) return a.bo-b.bo; const r=byBirth(a,b); if(r) return r; return (a.bo||99)-(b.bo||99); }
/* 養子：その親とは養子縁組か */
const adoptedFrom=(c,pid)=>!!c&&!!pid&&(c.adopt==='b'?(c.f===pid||c.m===pid):c.adopt==='f'?c.f===pid:c.adopt==='m'?c.m===pid:false);
/* 続き柄（長男・次女・養子…）。決めていなければ、同じ父母・同じ性別のきょうだいの順から */
const NUMS=['長','次','三','四','五','六','七','八','九','十'];
function ordAuto(p){
  if(!p||!p.sex) return '';
  if(p.adopt) return p.sex==='m'?'養子':'養女';
  if(!p.f&&!p.m) return '';
  const g=kz.people.filter(q=>q.f===p.f&&q.m===p.m&&q.sex===p.sex&&!q.adopt);
  const byBo=g.some(q=>q.bo);   // 生まれ順を入れた人がいれば、みんなの生まれ順で。いなければ生まれた日で
  if(g.length>1&&!g.every(q=>byBo?q.bo:parseD(q.birth))) return '';   // 順番が分からない人がいるときは付けない
  const i=g.sort(byOrder).indexOf(p); return i>=0&&i<NUMS.length?NUMS[i]+(p.sex==='m'?'男':'女'):'';
}
const ordOf=p=>p?(p.ord||ordAuto(p)):'';
function byBirth(a,b){ const x=dKey(a.birth), y=dKey(b.birth); return x&&y?(x<y?-1:x>y?1:0):x?-1:y?1:0; }
const dKey=s=>{ const d=parseD(s); return d?`${d.y}${P2(d.m||0)}${P2(d.d||0)}`:''; };
function isAncestor(a,b){ // a は b の先祖か
  const seen=new Set(), st=[b];
  while(st.length){ const x=st.pop(); for(const q of parentsOf(x)){ if(q===a) return true; if(!seen.has(q)){ seen.add(q); st.push(q); } } }
  return false;
}

/* ───────── 日付（西暦・和暦） ───────── */
const ERAS=[['令和','R',2019,5,1],['平成','H',1989,1,8],['昭和','S',1926,12,25],['大正','T',1912,7,30],['明治','M',1868,1,25]];
function parseD(s){
  s=String(s||'').normalize('NFKC').trim(); if(!s) return null;
  let m=s.match(/^(\d{4})(?:[-\/.年](\d{1,2})(?:[-\/.月](\d{1,2})日?)?月?)?年?$/);
  if(m) return okD(+m[1], m[2]?+m[2]:0, m[3]?+m[3]:0);
  m=s.match(/^(令和|平成|昭和|大正|明治|[RHSTMrhstm])\s*(元|\d{1,2})(?:[年.\/-](\d{1,2})(?:[月.\/-](\d{1,2})日?)?月?)?年?$/);
  if(m){ const e=ERAS.find(x=>x[0]===m[1]||x[1]===m[1].toUpperCase()); const n=m[2]==='元'?1:+m[2]; return okD(e[2]+n-1, m[3]?+m[3]:0, m[4]?+m[4]:0); }
  return null;
}
const okD=(y,m,d)=>y>=1000&&y<=2200&&m>=0&&m<=12&&d>=0&&d<=31?{y,m,d}:null;
const normD=s=>{ const d=parseD(s); return d?d.y+(d.m?'-'+P2(d.m)+(d.d?'-'+P2(d.d):''):''):''; };
function wareki(d){
  if(!d) return '';
  const md=(d.m||12)*100+(d.d||31);   // 月日が分からないときは、その年の新しい方の元号
  const e=ERAS.find(x=>d.y>x[2]||(d.y===x[2]&&md>=x[3]*100+x[4])); if(!e) return '';
  const n=d.y-e[2]+1; return e[0]+(n===1?'元':n)+'年';
}
function dText(s, wa){ const d=parseD(s); if(!d) return ''; return `${d.y}年${d.m?d.m+'月':''}${d.m&&d.d?d.d+'日':''}${wa&&kz.wareki?`（${wareki(d)}）`:''}`; }
function age(p){
  const b=parseD(p.birth); if(!b) return null;
  const now=new Date(), e=p.dead?parseD(p.death):{y:now.getFullYear(), m:now.getMonth()+1, d:now.getDate()};
  if(!e) return null;
  let a=e.y-b.y; if(b.m&&e.m&&(e.m<b.m||(e.m===b.m&&b.d&&e.d&&e.d<b.d))) a--;
  return a>=0&&a<150?a:null;
}
function years(p){
  const b=parseD(p.birth), d=parseD(p.death), a=age(p);
  if(p.dead) return `${b?b.y:'?'}〜${d?d.y:'?'}${a!=null&&d?`（${a}歳）`:''}`;
  return b?`${b.y}年生${a!=null?`（${a}歳）`:''}`:'';
}
const nm=p=>p?(p.name||'（名前なし）'):'';

/* ───────── 続柄（本人から） ───────── */
function kinPath(to){
  const from=kz.me; if(!from||!per(from)) return null; if(from===to) return {path:'', nodes:[from]};
  const q=[[from,'',[from]]], seen=new Set([from]);
  while(q.length){
    const [x,path,nodes]=q.shift(); if(path.length>=5) continue;
    const nb=[...parentsOf(x).map(y=>[y,'P']), ...childrenOf(x).map(y=>[y.id,'C']), ...spousesOf(x).map(y=>[y,'S'])];
    for(const [y,t] of nb){ if(seen.has(y)) continue; seen.add(y); const np=path+t, nn=nodes.concat(y); if(y===to) return {path:np, nodes:nn}; q.push([y,np,nn]); }
  }
  return null;
}
function older(a,b){ const x=dKey(per(a)&&per(a).birth), y=dKey(per(b)&&per(b).birth); return x&&y?(x<y?1:x>y?-1:0):0; }   // a が b より上なら 1
function kinLabel(id){
  const r=kinPath(id); if(!r) return ''; const p=per(id), s=p.sex, path=r.path, N=r.nodes;
  const mf=(m,f,u)=>s==='m'?m:s==='f'?f:u;
  const side=()=>{ const a=per(N[1]); return a?(a.sex==='m'?'（父方）':a.sex==='f'?'（母方）':''):''; };
  const sib=(base,x)=>{ const o=older(x,base); return o>0?mf('兄','姉','兄・姉'):o<0?mf('弟','妹','弟・妹'):mf('兄弟','姉妹','きょうだい'); };
  switch(path){
    case '': return '本人';
    case 'P': return adoptedFrom(per(kz.me),id)?mf('養父','養母','養親'):mf('父','母','親');
    case 'PP': return mf('祖父','祖母','祖父母')+side();
    case 'PPP': return mf('曾祖父','曾祖母','曾祖父母')+side();
    case 'PPPP': return mf('高祖父','高祖母','高祖父母')+side();
    case 'C': return adoptedFrom(p,kz.me)?mf('養子','養女','養子'):mf('息子','娘','子');
    case 'CC': return '孫';
    case 'CCC': return 'ひ孫';
    case 'CCCC': return '玄孫';
    case 'S': return mf('夫','妻','配偶者');
    case 'PC': return sib(kz.me,id);
    case 'PCC': return mf('甥','姪','甥・姪');
    case 'PCCC': return '甥・姪の子';
    case 'PCS': { const o=older(N[2],kz.me); return o>0?mf('義兄','義姉','義理のきょうだい'):o<0?mf('義弟','義妹','義理のきょうだい'):mf('義理の兄弟','義理の姉妹','義理のきょうだい'); }
    case 'PPC': { const o=older(id,N[1]); return (o>0?mf('伯父','伯母','おじ・おば'):o<0?mf('叔父','叔母','おじ・おば'):mf('おじ','おば','おじ・おば'))+side(); }
    case 'PPCS': return mf('おじ','おば','おじ・おば')+'（義理）';
    case 'PPCC': return 'いとこ'+side();
    case 'PPCCC': return 'いとこの子';
    case 'PPPC': return mf('大おじ','大おば','大おじ・大おば')+side();
    case 'SP': return mf('義父','義母','義理の親');
    case 'SPP': return mf('義理の祖父','義理の祖母','義理の祖父母');
    case 'SPC': { const o=older(id,N[1]); return o>0?mf('義兄','義姉','義理のきょうだい'):o<0?mf('義弟','義妹','義理のきょうだい'):mf('義理の兄弟','義理の姉妹','義理のきょうだい'); }
    case 'CS': return mf('婿','嫁','子の配偶者');
    case 'CCS': return '孫の配偶者';
    case 'PS': return mf('継父','継母','親の配偶者');
    case 'SC': return mf('継子（息子）','継子（娘）','配偶者の子');
  }
  return path.length<=3?'親族':'遠い親族';
}

/* ───────── 図の並べ方（中心の人から砂時計） ───────── */
const NW=132, NH=64, HG=16, VG=48, U=NW+HG, RH=NH+VG;
function kzLayout(){
  const F=kz.focus, nodes=[], lines=[], put=(id,x,row,extra)=>{ nodes.push(Object.assign({id,x,y:row*RH},extra||{})); };
  if(!per(F)) return {nodes, lines};
  // 上：親・祖父母（足りない親は「＋」の箱を1つ上まで）
  const pw=new Map();
  const slotW=(id,lv)=>{ if(lv>=kz.up) return 1; const p=per(id); if(!p) return 1;
    const a=p.f&&per(p.f)?slotW(p.f,lv+1):1, b=p.m&&per(p.m)?slotW(p.m,lv+1):1; const w=Math.max(1,a+b); pw.set(id+'@'+lv,w); return w; };
  slotW(F,0);
  const up=(id,cx,lv)=>{
    if(lv>=kz.up) return; const p=per(id);
    const fa=p.f&&per(p.f)?p.f:null, mo=p.m&&per(p.m)?p.m:null;
    const wf=fa?(lv+1<kz.up?(pw.get(fa+'@'+(lv+1))||1):1):1, wm=mo?(lv+1<kz.up?(pw.get(mo+'@'+(lv+1))||1):1):1, tot=wf+wm;
    const xf=cx-tot*U/2+wf*U/2, xm=cx-tot*U/2+wf*U+wm*U/2, row=-(lv+1);
    if(fa){ put(fa,xf,row); up(fa,xf,lv+1); } else put('',xf,row,{add:'f', of:id});
    if(mo){ put(mo,xm,row); up(mo,xm,lv+1); } else put('',xm,row,{add:'m', of:id});
    lines.push({t:'couple', x1:xf, x2:xm, y:row*RH});
    lines.push({t:'down', from:'mid', x:(xf+xm)/2, y:row*RH, kids:[cx], ad:[!!p.adopt], ky:(row+1)*RH, sib:id===F});
  };
  // 中心の行：兄弟姉妹（左）・中心・夫や妻（右）
  put(F,0,0,{focus:true});
  const sps=spousesOf(F); sps.forEach((s,i)=>{ put(s,(i+1)*U,0); lines.push({t:'spouse', x1:i*U, x2:(i+1)*U, y:0, k:i}); });
  const sibs=kz.sib?siblingsOf(F):[];
  sibs.forEach((s,i)=>put(s.id,-(sibs.length-i)*U,0,{sibling:true}));
  up(F,0,0);
  const dl=lines.find(l=>l.t==='down'&&l.sib); if(dl&&sibs.length){ dl.kids=dl.kids.concat(sibs.map((s,i)=>-(sibs.length-i)*U)); dl.ad=dl.ad.concat(sibs.map(s=>!!s.adopt)); }
  // 下：子・孫（子どもの夫や妻も）
  const memo=new Map();
  const unitW=id=>1+spousesOf(id).length;
  const meas=(id,dp)=>{ const k=id+'@'+dp; if(memo.has(k)) return memo.get(k);
    const ch=dp<kz.down?childrenOf(id):[]; const cw=ch.reduce((a,c)=>a+meas(c.id,dp+1),0); const w=Math.max(unitW(id),cw); memo.set(k,w); return w; };
  const place=(id,dp,left,row,isRoot)=>{
    const w=meas(id,dp), uw=unitW(id), ch=dp<kz.down?childrenOf(id):[], cw=ch.reduce((a,c)=>a+meas(c.id,dp+1),0);
    const ux=left+(w-uw)*U/2+U/2;   // この人の箱の真ん中
    if(!isRoot){ put(id,ux,row); spousesOf(id).forEach((s,i)=>{ put(s,ux+(i+1)*U,row,{inlaw:true}); lines.push({t:'spouse', x1:ux+i*U, x2:ux+(i+1)*U, y:row*RH, k:i}); }); }
    if(!ch.length) return ux;
    let cl=left+(w-cw)*U/2; const xs=[];
    ch.forEach(c=>{ xs.push({id:c.id, x:place(c.id,dp+1,cl,row+1,false), o:c.f===id?c.m:c.f, ad:!!c.adopt}); cl+=meas(c.id,dp+1)*U; });
    // 子の線は、もう一人の親ごとに分ける（夫や妻と線の真ん中から）
    const sp=spousesOf(id), groups=new Map();
    xs.forEach(c=>{ const k=sp.includes(c.o)?c.o:''; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(c); });
    [...groups].forEach(([o,cs],gi)=>{ const i=sp.indexOf(o), ox=o?ux+i*U+U/2:ux; lines.push({t:'down', from:o?'mid':'node', k:o?i:0, x:ox, y:row*RH, kids:cs.map(c=>c.x), ad:cs.map(c=>c.ad), ky:(row+1)*RH, g:gi, n:groups.size}); });
    return ux;
  };
  if(kz.down>0 && childrenOf(F).length){ const w=meas(F,0); place(F,0,(sps.length*U)/2-w*U/2,0,true); }
  return {nodes, lines};
}

/* ───────── 図を描く ───────── */
function kzRender(){
  const v=$('kzView'); if(!v) return;
  const empty=!kz.people.length;
  $('kzEmpty').style.display=empty?'':'none'; $('kzStage').style.display=empty?'none':'';
  $('kzTools').classList.toggle('dis', empty);
  if(empty) return;
  const L=kzLayout(); if(!L.nodes.length) return;
  const xs=L.nodes.map(n=>n.x), ys=L.nodes.map(n=>n.y), pad=30;
  const minX=Math.min(...xs)-NW/2-pad, maxX=Math.max(...xs)+NW/2+pad, minY=Math.min(...ys)-pad, maxY=Math.max(...ys)+NH+pad;
  const W=maxX-minX, H=maxY-minY, ox=-minX, oy=-minY;
  const svg=L.lines.map(l=>{
    if(l.t==='couple') return `<line x1="${l.x1+ox+NW/2}" y1="${l.y+oy+NH/2}" x2="${l.x2+ox-NW/2}" y2="${l.y+oy+NH/2}" class="cp"/>`;
    if(l.t==='spouse'){ const dy=l.k?10:0; return `<path d="M${l.x1+ox+NW/2} ${l.y+oy+NH/2+dy} H${l.x2+ox-NW/2}" class="cp${l.k?' cp2':''}"/>`; }
    if(l.t==='down'){ const by=l.ky+oy-VG/2+(l.n>1?(l.g-(l.n-1)/2)*8:0), sy=l.y+oy+(l.from==='node'?NH:NH/2+(l.k?10:0));
      const kx=l.kids.map(x=>x+ox), a=Math.min(l.x+ox,...kx), b=Math.max(l.x+ox,...kx);
      const ad=l.ad||[];
      return `<path d="M${l.x+ox} ${sy} V${by} M${a} ${by} H${b} ${kx.filter((x,i)=>!ad[i]).map(x=>`M${x} ${by} V${l.ky+oy}`).join(' ')}"/>`
        +(ad.some(Boolean)?`<path class="ad" d="${kx.filter((x,i)=>ad[i]).map(x=>`M${x} ${by} V${l.ky+oy}`).join(' ')}"/>`+kx.filter((x,i)=>ad[i]).map(x=>`<text class="adt" x="${x+4}" y="${l.ky+oy-6}">養</text>`).join(''):''); }
    return '';
  }).join('');
  const html=L.nodes.map(n=>{
    const st=`left:${n.x+ox-NW/2}px;top:${n.y+oy}px`;
    if(n.add) return `<button class="kz-node add" style="${st}" data-add="${n.add}" data-of="${n.of}" onclick="kzAddRel('${n.add}','${n.of}')">＋ ${n.add==='f'?'父':'母'}を入れる</button>`;
    const p=per(n.id); const o=ordOf(p), k0=kinLabel(n.id), k=[k0, o&&o!==k0?o:''].filter(Boolean).join('・');
    return `<button class="kz-node ${p.sex||'u'}${p.dead?' dead':''}${n.focus?' focus':''}${n.id===kz.me?' me':''}" style="${st}" data-id="${n.id}" onclick="kzTap('${n.id}')">
      ${kz.photo&&p.photo?`<img src="${p.photo}" alt="">`:''}<span class="tx"><b>${esc(nm(p))}${p.dead?'<i>†</i>':''}</b>${k?`<small class="kin">${esc(k)}</small>`:''}<small>${esc(years(p))}</small></span></button>`;
  }).join('');
  $('kzStage').innerHTML=`<div class="kz-inner" id="kzInner" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}" class="kz-lines">${svg}</svg>${html}</div>`;
  $('kzStage').dataset.w=W; $('kzStage').dataset.h=H; $('kzStage').dataset.fx=ox; $('kzStage').dataset.fy=oy;
  kzApplyScale(); kzHeader();
}
function kzApplyScale(){
  const st=$('kzStage'), inn=$('kzInner'); if(!st||!inn) return;
  inn.style.transform=`scale(${kz.scale})`; st.style.width=(+st.dataset.w*kz.scale)+'px'; st.style.height=(+st.dataset.h*kz.scale)+'px';
}
function kzCenter(){   // 中心の人が真ん中に来るように
  const v=$('kzView'), st=$('kzStage'); if(!v||!st||!st.dataset.w) return;
  v.scrollLeft=(+st.dataset.fx)*kz.scale-v.clientWidth/2; v.scrollTop=(+st.dataset.fy+NH/2)*kz.scale-v.clientHeight/2;
}
function kzZoom(f, keep){
  const v=$('kzView'); const cx=v.scrollLeft+v.clientWidth/2, cy=v.scrollTop+v.clientHeight/2, s0=kz.scale;
  kz.scale=Math.min(2,Math.max(0.3,Math.round(s0*f*100)/100)); kzApplyScale();
  if(!keep){ v.scrollLeft=cx*kz.scale/s0-v.clientWidth/2; v.scrollTop=cy*kz.scale/s0-v.clientHeight/2; }
  kzSave();
}
function kzFit(){ const v=$('kzView'), st=$('kzStage'); if(!st.dataset.w) return; kz.scale=Math.min(1.2,Math.max(0.3,Math.min((v.clientWidth-8)/+st.dataset.w,(v.clientHeight-8)/+st.dataset.h))); kzApplyScale(); v.scrollLeft=0; v.scrollTop=0; kzSave(); }
/* 指で動かす・2本指で大きさ（図のところはブラウザに任せない） */
function kzBindView(){
  const v=$('kzView'); if(!v||v._b) return; v._b=1;
  const pts=new Map(); let moved=0, d0=0, s0=1, last=null;
  const dist=()=>{ const a=[...pts.values()]; return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y); };
  v.addEventListener('pointerdown',e=>{ if(e.pointerType==='mouse'&&e.button) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); moved=0; d0=dist(); s0=kz.scale; last={x:e.clientX,y:e.clientY}; });
  v.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId)) return; const p=pts.get(e.pointerId);
    if(pts.size>=2){ p.x=e.clientX; p.y=e.clientY; const d=dist(); if(d0>10){ kzZoom(s0*d/d0/kz.scale); } moved=99; return; }
    const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY; moved+=Math.abs(dx)+Math.abs(dy);
    if(moved>6){ v.scrollLeft-=dx; v.scrollTop-=dy; } });
  const up=e=>{ pts.delete(e.pointerId); d0=dist(); s0=kz.scale; };
  v.addEventListener('pointerup',up); v.addEventListener('pointercancel',up);
  v.addEventListener('click',e=>{ if(moved>6){ e.stopPropagation(); e.preventDefault(); } }, true);   // 動かしたあとは押したことにしない
  v.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); kzZoom(Math.exp(-e.deltaY*0.002)); },{passive:false});
}
function kzHeader(){ const e=$('kzFocusName'); const p=per(kz.focus); if(e) e.textContent=p?`中心：${nm(p)}${kz.focus===kz.me?'（本人）':''}・${kz.people.length}人`:''; }

/* ───────── 人の窓 ───────── */
function kzTap(id){
  const p=per(id); if(!p) return; kzSheet=id;
  const a=age(p), k=kinLabel(id), fa=per(p.f), mo=per(p.m), sp=spousesOf(id).map(per), ch=childrenOf(id), sib=siblingsOf(id), o=ordOf(p);
  const bfa=per(p.bf), bmo=per(p.bm), gave=kz.people.filter(q=>q.bf===id||q.bm===id);
  const ADT={b:'父母と養子縁組', f:'父と養子縁組', m:'母と養子縁組'};
  const link=q=>q?`<a onclick="kzTap('${q.id}')">${esc(nm(q))}</a>`:'—';
  $('kzSheetHdr').textContent=(p.sex==='m'?'👨 ':p.sex==='f'?'👩 ':'🧑 ')+nm(p);
  $('kzSheetBody').innerHTML=`<div class="kz-prof">${p.photo?`<img src="${p.photo}" alt="">`:''}<div>
      <div class="nm">${esc(nm(p))}${p.kana?`<small>${esc(p.kana)}</small>`:''}</div>
      ${k?`<div class="kin">${esc(k)}${id===kz.me?'':'（本人から）'}</div>`:''}
      ${o?`<div>続き柄：<b>${esc(o)}</b>${p.ord?'':'（自動）'}${p.bo?`・${p.bo}番目に生まれた`:''}</div>`:p.bo?`<div>${p.bo}番目に生まれた</div>`:''}
      ${p.adopt?`<div class="kz-ad">養子（${ADT[p.adopt]}）</div>`:''}
      ${p.birth?`<div>生まれ：${esc(dText(p.birth,true))}</div>`:''}
      ${p.dead?`<div>亡くなった日：${p.death?esc(dText(p.death,true)):'（分からない）'}${a!=null&&p.death?`・${a}歳`:''}</div>`:a!=null?`<div>年齢：${a}歳</div>`:''}</div></div>
    ${p.note?`<div class="kz-note">${esc(p.note).replace(/\n/g,'<br>')}</div>`:''}
    <table class="kz-rel"><tr><th>父</th><td>${link(fa)}</td></tr><tr><th>母</th><td>${link(mo)}</td></tr>
      <tr><th>夫・妻</th><td>${sp.map(link).join('、')||'—'}</td></tr><tr><th>子</th><td>${ch.map(link).join('、')||'—'}</td></tr>
      <tr><th>きょうだい</th><td>${sib.map(q=>link(q)+(ordOf(q)?`<small>（${esc(ordOf(q))}）</small>`:'')).join('、')||'—'}</td></tr>
      ${p.adopt||bfa||bmo?`<tr><th>実父</th><td>${link(bfa)}</td></tr><tr><th>実母</th><td>${link(bmo)}</td></tr>`:''}
      ${gave.length?`<tr><th>養子に出た子</th><td>${gave.map(link).join('、')}</td></tr>`:''}</table>
    <div class="kz-btns">
      <button class="kz-b pri" onclick="kzFocus('${id}')">🎯 この人を中心に</button>
      <button class="kz-b" onclick="kzEditPerson('${id}')">✏ 直す</button>
    </div>
    <h4>続き柄・生まれ順</h4>
    <div class="kz-chips" id="kzOrdChips">${['',...ORDS.filter(x=>p.sex==='m'?/男|養子/.test(x):p.sex==='f'?/女/.test(x):true)].map(x=>`<button type="button" class="${(p.ord||'')===x?'on':''}" data-ord="${x}" onclick="kzSetOrd('${id}','${x}')">${x||`自動${ordAuto(p)?`（${ordAuto(p)}）`:''}`}</button>`).join('')}</div>
    <div class="kz-chips" id="kzBoChips"><span>何番目</span>${[1,2,3,4,5,6,7,8].map(n=>`<button type="button" class="${p.bo===n?'on':''}" data-bo="${n}" onclick="kzSetBo('${id}',${n})">${n}</button>`).join('')}<button type="button" class="${p.bo?'':'on'}" data-bo="0" onclick="kzSetBo('${id}',0)">なし</button></div>
    <h4>家族を足す</h4>
    <div class="kz-btns s">
      ${p.f?'':`<button class="kz-b" onclick="kzAddRel('f','${id}')">＋ 父</button>`}${p.m?'':`<button class="kz-b" onclick="kzAddRel('m','${id}')">＋ 母</button>`}
      <button class="kz-b" onclick="kzAddRel('sp','${id}')">＋ 夫・妻</button><button class="kz-b" onclick="kzAddRel('c','${id}')">＋ 子</button><button class="kz-b" onclick="kzAddRel('sib','${id}')">＋ きょうだい</button>
      ${p.adopt&&!p.bf?`<button class="kz-b" onclick="kzAddRel('bf','${id}')">＋ 実父（生みの親）</button>`:''}${p.adopt&&!p.bm?`<button class="kz-b" onclick="kzAddRel('bm','${id}')">＋ 実母（生みの親）</button>`:''}
    </div>
    <div class="kz-btns s">${id===kz.me?'':`<button class="kz-b" onclick="kzSetMe('${id}')">⭐ この人を本人（自分）にする</button>`}<button class="kz-b danger" onclick="kzDel('${id}')">🗑 消す</button></div>`;
  if(!isDlgOpen('kzSheetOverlay')) openDlg('kzSheetOverlay', ()=>{ kzSheet=null; }); else $('kzSheetBody').scrollTop=0;
}
/* 人の窓から、続き柄・生まれ順をすぐ決める（v517） */
function kzSetOrd(id, v){ const p=per(id); if(!p) return; p.ord=ORDS.includes(v)?v:''; kzSave(); kzRender(); kzTap(id); toast(v?`続き柄を「${v}」にしました`:'続き柄を自動にしました'); }
function kzSetBo(id, n){ const p=per(id); if(!p) return; p.bo=Math.max(0,Math.min(30,+n||0)); kzSave(); kzRender(); kzTap(id); toast(n?`${n}番目に生まれた、にしました`:'生まれ順を消しました'); }
function kzFocus(id){ if(!per(id)) return; kz.focus=id; kzSave(); ['kzSheetOverlay','kzListOverlay'].forEach(o=>{ if(isDlgOpen(o)) closeDlg(o); }); kzRender(); setTimeout(kzCenter,30); }
function kzSetMe(id){ kz.me=id; kzSave(); kzRender(); kzTap(id); toast('本人にしました。続柄はこの人から付けます'); }
function kzDel(id){
  const p=per(id); if(!p||!confirm(`「${nm(p)}」を消しますか？（つながりも外れます）`)) return;
  kz.people=kz.people.filter(q=>q!==p); kzFix(); kzSave();
  if(isDlgOpen('kzSheetOverlay')) closeDlg('kzSheetOverlay'); kzRender(); setTimeout(kzCenter,30); toast('消しました');
}

/* ───────── 入れる・直す ───────── */
const REL_T={bf:'実父を入れる', bm:'実母を入れる', me:'本人（自分）を入れる', f:'父を入れる', m:'母を入れる', sp:'夫・妻を入れる', c:'子を入れる', sib:'きょうだいを入れる'};
function kzAddRel(rel, base){ kzForm({rel, base}); }
function kzEditPerson(id){ kzForm(id); }
function kzForm(target){
  kzEdit=target; const add=typeof target==='object', p=add?null:per(target), base=add?per(target.base):null, rel=add?target.rel:'';
  kzPhoto=p?p.photo:'';
  let sex=p?p.sex:rel==='f'||rel==='bf'?'m':rel==='m'||rel==='bm'?'f':rel==='sp'&&base?(base.sex==='m'?'f':base.sex==='f'?'m':''):'';
  const RW={f:'父',m:'母',sp:'夫・妻',c:'子',sib:'きょうだい',bf:'実父（生みの親）',bm:'実母（生みの親）'};
  const ad=p?p.adopt:'', auto=p?ordAuto(Object.assign({},p,{ord:'',adopt:''})):'';
  const withParents=p?!!(p.f||p.m):(rel==='c'||rel==='sib');
  $('kzEditHdr').textContent=add?(base?`${nm(base)}の${RW[rel]}を入れる`:REL_T[rel]):'✏ '+nm(p)+'を直す';
  const cand=add&&rel!=='me'?kz.people.filter(q=>q.id!==target.base&&kzCanLink(rel,target.base,q.id)):[];
  const sps=add&&rel==='c'?spousesOf(target.base):[];
  $('kzEditBody').innerHTML=`${cand.length?`<div class="kz-form"><label>だれを入れますか<select id="kzPick" onchange="kzPickCh()"><option value="">＋ 新しい人</option>${cand.map(q=>`<option value="${q.id}">${esc(nm(q))}${q.birth?`（${parseD(q.birth).y}年生）`:''}</option>`).join('')}</select></label></div>`:''}
    ${rel==='c'&&sps.length?`<div class="kz-form"><label>もう一人の親<select id="kzOther">${sps.map(s=>`<option value="${s}">${esc(nm(per(s)))}</option>`).join('')}<option value="">（入れない）</option></select></label></div>`:''}
    <div id="kzNewBox">
    <div class="kz-ephoto" id="kzEPhoto" onclick="$kz('kzPick2').click()">${kzPhoto?`<img src="${kzPhoto}" alt="">`:'<span>写真<br>（なくてもよい）</span>'}</div>
    <input type="file" id="kzPick2" accept="image/*" style="display:none" onchange="kzPhotoIn(event)">
    ${kzPhoto?'<div style="text-align:center"><button class="kz-b" onclick="kzPhotoClear()">写真を消す</button></div>':''}
    <div class="kz-form"><label>名前<input id="kzEName" value="${esc(p?p.name:'')}" placeholder="例：山田 太郎"></label>
    <label>ふりがな<input id="kzEKana" value="${esc(p?p.kana:'')}" placeholder="やまだ たろう"></label>
    <label>性別</label><div class="kz-seg" id="kzESex">${[['m','男性'],['f','女性'],['','分からない']].map(o=>`<button type="button" class="${sex===o[0]?'on':''}" data-v="${o[0]}" onclick="kzSeg(this)">${o[1]}</button>`).join('')}</div>
    ${p||rel==='c'||rel==='sib'||rel==='me'?`<div class="kz-g2"><label>生まれ順（何番目）<input id="kzEBo" inputmode="numeric" value="${p&&p.bo?p.bo:''}" placeholder="例：1"></label>
    <label>続き柄<select id="kzEOrd"><option value="">自動${auto?`（${auto}）`:''}</option>${ORDS.map(x=>`<option${p&&p.ord===x?' selected':''}>${x}</option>`).join('')}</select></label></div>
    <div class="kz-hint" style="margin-top:0">生まれ順を入れると、きょうだいがその順に並び、長男・次女などが自動で付きます。</div>`:''}
    ${withParents?`<label>養子縁組</label><div class="kz-seg" id="kzEAd">${[['','なし（実の子）'],['b','父母と養子'],['f','父とだけ'],['m','母とだけ']].map(o=>`<button type="button" class="${ad===o[0]?'on':''}" data-v="${o[0]}" onclick="kzSeg(this)">${o[1]}</button>`).join('')}</div>
    <div class="kz-hint" style="margin-top:0">婿養子は、妻の両親を「父・母」に入れて「父母と養子」にします。生みの親は人の窓の「＋ 実父・実母」で入れられます。</div>`:''}
    <div class="kz-g2"><label>生まれ<input id="kzEBirth" value="${esc(p?p.birth.replace(/-/g,'/'):'')}" placeholder="1950/4/1・昭和25年" oninput="kzDHint('kzEBirth')"><small id="kzEBirthH"></small></label>
    <label>亡くなった日<input id="kzEDeath" value="${esc(p?p.death.replace(/-/g,'/'):'')}" placeholder="なければ空" oninput="kzDHint('kzEDeath')"><small id="kzEDeathH"></small></label></div>
    <label class="kz-sw"><input type="checkbox" id="kzEDead" ${p&&p.dead?'checked':''}> 亡くなっている（日が分からなくても）</label>
    <label>メモ<textarea id="kzENote" rows="3" placeholder="出身地・仕事・思い出など">${esc(p?p.note:'')}</textarea></label></div></div>
    <button class="kz-b pri wide" onclick="kzSaveForm()">✓ 保存</button>`;
  if(!isDlgOpen('kzEditOverlay')) openDlg('kzEditOverlay');
  kzDHint('kzEBirth'); kzDHint('kzEDeath');
  setTimeout(()=>{ const n=$('kzEName'); if(n&&!p) n.focus(); },150);
}
function kzSeg(b){ b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); }
function kzPickCh(){ const v=$('kzPick').value; $('kzNewBox').style.display=v?'none':''; }
function kzDHint(id){ const e=$(id), h=$(id+'H'); if(!e||!h) return; const v=e.value.trim(); h.textContent=!v?'':parseD(v)?dText(v,true):'⚠ 読めません（例：1950/4/1・S25.4.1）'; h.classList.toggle('bad', !!v&&!parseD(v)); }
function kzCanLink(rel, base, other){   // つないでも親子がぐるぐるにならないか
  if(rel==='f'||rel==='m'||rel==='bf'||rel==='bm'){ const o=per(other); return !isAncestor(base,other) && !(o&&(rel==='f'||rel==='bf'?o.sex==='f':o.sex==='m')); }
  if(rel==='c') return !isAncestor(other,base) && !parentsOf(other).includes(base);
  if(rel==='sp') return !spousesOf(base).includes(other) && !isAncestor(other,base) && !isAncestor(base,other);
  if(rel==='sib') return !isAncestor(other,base) && !isAncestor(base,other) && !siblingsOf(base).some(s=>s.id===other);
  return true;
}
function kzSaveForm(){
  const t=kzEdit, add=typeof t==='object', pick=add&&$('kzPick')?$('kzPick').value:'';
  let p;
  if(pick){ p=per(pick); }
  else{
    const name=$('kzEName').value.trim();
    const sb=document.querySelector('#kzESex button.on'), sex=sb?sb.dataset.v:'';
    const bs=$('kzEBirth').value.trim(), ds=$('kzEDeath').value.trim();
    if(bs&&!parseD(bs)){ toast('生まれの日が読めません'); return; } if(ds&&!parseD(ds)){ toast('亡くなった日が読めません'); return; }
    if(!name && !confirm('名前が空です。「名前なし」で入れますか？')) return;
    const v={name, kana:$('kzEKana').value.trim(), sex, birth:normD(bs), death:normD(ds), dead:$('kzEDead').checked||!!ds, note:$('kzENote').value.trim(), photo:kzPhoto||''};
    if($('kzEBo')){ v.bo=Math.max(0,Math.min(30,parseInt(String($('kzEBo').value).normalize('NFKC'),10)||0)); v.ord=$('kzEOrd').value; }
    if($('kzEAd')){ const ab=document.querySelector('#kzEAd button.on'); v.adopt=ab?ab.dataset.v:''; }
    if(add){ p=cleanP(Object.assign({id:uid()},v)); kz.people.push(p); } else { p=per(t); if(!p) return; Object.assign(p,v); p.photo=v.photo; }
  }
  if(add){
    const base=per(t.base), rel=t.rel;
    if(rel==='me'){ kz.me=p.id; kz.focus=p.id; }
    else if(base && !kzCanLink(rel, base.id, p.id) && pick){ toast('その人とはつなげません（親子がぐるぐるになります）'); return; }
    else if(rel==='f'||rel==='m'){ base[rel]=p.id; if(!p.sex) p.sex=rel==='f'?'m':'f'; const o=per(rel==='f'?base.m:base.f); if(o&&!p.sp.includes(o.id)){ p.sp.push(o.id); o.sp.push(p.id); } }
    else if(rel==='bf'||rel==='bm'){ base[rel]=p.id; if(!p.sex) p.sex=rel==='bf'?'m':'f'; }
    else if(rel==='sp'){ if(!base.sp.includes(p.id)) base.sp.push(p.id); if(!p.sp.includes(base.id)) p.sp.push(base.id); }
    else if(rel==='c'){ const oid=$('kzOther')?$('kzOther').value:'', o=per(oid);
      const baseIsMother=base.sex==='f'||(base.sex===''&&o&&o.sex==='m');
      if(baseIsMother){ p.m=base.id; p.f=o?o.id:p.f; } else { p.f=base.id; p.m=o?o.id:p.m; } }
    else if(rel==='sib'){
      if(!base.f&&!base.m){ const fa=cleanP({id:uid(), name:'', sex:'m'}); kz.people.push(fa); base.f=fa.id; toast('親が入っていないので、名前なしの父を入れてつなぎました（あとで直せます）',3500); }
      p.f=base.f; p.m=base.m; }
  }
  kzFix(); if(!kzSave()) return;
  closeDlg('kzEditOverlay'); kzRender();
  if(isDlgOpen('kzSheetOverlay') && kzSheet && per(kzSheet)) kzTap(kzSheet);
  if(add&&t.rel==='me') setTimeout(kzCenter,30);
  toast(add?'入れました':'直しました');
}
function kzPhotoIn(e){
  const f=e.target.files&&e.target.files[0]; if(!f) return; e.target.value='';
  const url=URL.createObjectURL(f), im=new Image();
  im.onload=()=>{ URL.revokeObjectURL(url); const M=200, s=Math.min(im.width,im.height), c=document.createElement('canvas'); c.width=c.height=M;
    c.getContext('2d').drawImage(im,(im.width-s)/2,Math.max(0,(im.height-s)/2-s*0.08),s,s,0,0,M,M);   // 真ん中を四角に（顔が上のことが多いので少し上より）
    kzPhoto=c.toDataURL('image/jpeg',0.75); $('kzEPhoto').innerHTML=`<img src="${kzPhoto}" alt="">`; };
  im.onerror=()=>{ URL.revokeObjectURL(url); toast('写真を読み込めませんでした'); };
  im.src=url;
}
function kzPhotoClear(){ kzPhoto=''; $('kzEPhoto').innerHTML='<span>写真<br>（なくてもよい）</span>'; }

/* ───────── 一覧 ───────── */
function kzOpenList(){ kzRenderList(); if(!isDlgOpen('kzListOverlay')) openDlg('kzListOverlay'); setTimeout(()=>{ const e=$('kzQ'); if(e) e.value=''; },0); }
function kzRenderList(q){
  const b=$('kzListBody'); if(!b) return; q=String(q||'').trim().toLowerCase();
  const gen=id=>{ const r=kinPath(id); if(!r) return 99; let g=0; for(const c of r.path){ if(c==='P') g--; else if(c==='C') g++; } return g; };
  const L=kz.people.filter(p=>!q||(p.name+' '+p.kana+' '+kinLabel(p.id)+' '+p.note).toLowerCase().includes(q)).map(p=>({p,g:gen(p.id)})).sort((a,c)=>a.g-c.g||byBirth(a.p,c.p));
  b.innerHTML=`<input id="kzQ" class="kz-q" placeholder="🔍 名前・続柄・メモでさがす" value="${esc(q)}" oninput="kzRenderList(this.value);this.focus()">
    <div class="kz-hint">${kz.people.length}人${q?`（見つかった ${L.length}人）`:''}</div>
    <div class="kz-list">${L.map(({p})=>`<button class="kz-li ${p.sex||'u'}${p.dead?' dead':''}" onclick="kzTap('${p.id}')">${p.photo?`<img src="${p.photo}" alt="">`:'<span class="av">'+(p.sex==='m'?'👨':p.sex==='f'?'👩':'🧑')+'</span>'}<span class="tx"><b>${esc(nm(p))}${p.dead?' †':''}</b><small>${esc([kinLabel(p.id),years(p)].filter(Boolean).join('・'))}</small></span></button>`).join('')||'<div class="kz-hint">見つかりません</div>'}</div>`;
  const e=$('kzQ'); if(e&&q){ e.setSelectionRange(e.value.length,e.value.length); }
}

/* ───────── 設定・書き出し ───────── */
function kzOpenSet(){ kzRenderSet(); if(!isDlgOpen('kzSetOverlay')) openDlg('kzSetOverlay'); }
function kzRenderSet(){
  const seg=(k,opts)=>`<div class="kz-seg">${opts.map(o=>`<button type="button" class="${String(kz[k])===String(o[0])?'on':''}" data-k="${k}" data-v="${o[0]}" onclick="kzSetOpt('${k}','${o[0]}')">${o[1]}</button>`).join('')}</div>`;
  $('kzSetBody').innerHTML=`<h4>図に出す代</h4><label class="kz-lb">上（親・祖父母…）</label>${seg('up',[[1,'親まで'],[2,'祖父母'],[3,'曾祖父母'],[4,'高祖父母']])}
    <label class="kz-lb">下（子・孫…）</label>${seg('down',[[0,'出さない'],[1,'子まで'],[2,'孫まで'],[3,'ひ孫まで']])}
    <h4>見え方</h4>${seg('sib',[['true','きょうだいを出す'],['false','出さない']])}${seg('photo',[['true','写真を出す'],['false','出さない']])}${seg('wareki',[['true','和暦も出す'],['false','西暦だけ']])}
    <h4>書き出し・読み込み</h4>
    <div class="kz-btns"><button class="kz-b" onclick="kzExport()">⬇ 書き出す（写真ごと）</button><button class="kz-b" onclick="$kz('kzImpFile').click()">⬆ 読み込む</button></div>
    <input type="file" id="kzImpFile" accept=".json,application/json" style="display:none" onchange="kzImport(event)">
    <div class="kz-hint">ほかの端末へうつすときや、念のための控えに。読み込むと、いまの家系図と入れかわります。</div>
    <div class="kz-btns"><button class="kz-b danger" onclick="kzClearAll()">🗑 ぜんぶ消す</button></div>
    <div class="kz-note">入れたものはこの端末の中だけに残り、どこにも送りません。</div>`;
}
function kzSetOpt(k,v){ kz[k]=k==='sib'||k==='photo'||k==='wareki'?v==='true':+v; kzSave(); kzRenderSet(); kzRender(); setTimeout(kzCenter,30); }
function kzDownload(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }
const kzStamp=()=>{ const d=new Date(); return d.getFullYear()+P2(d.getMonth()+1)+P2(d.getDate()); };
function kzExportData(){ return {type:'excalc-kakeizu', v:1, me:kz.me, focus:kz.focus, people:kz.people}; }
function kzExport(){ kzDownload(new Blob([JSON.stringify(kzExportData())],{type:'application/json'}), `kakeizu_${kzStamp()}.json`); toast('書き出しました'); }
function kzImportData(o){
  if(!o||o.type!=='excalc-kakeizu'||!Array.isArray(o.people)) throw 0;
  kz.people=o.people.filter(x=>x&&typeof x==='object').slice(0,2000).map(cleanP); kz.me=String(o.me||''); kz.focus=String(o.focus||''); kzFix(); kzSave();
}
function kzImport(e){
  const f=e.target.files&&e.target.files[0]; if(!f) return; e.target.value='';
  f.text().then(t=>{ const o=JSON.parse(t); if(!o||o.type!=='excalc-kakeizu'||!Array.isArray(o.people)) throw 0;
    if(kz.people.length && !confirm(`${o.people.length}人の家系図を読み込みますか？（いまの${kz.people.length}人と入れかわります）`)) return;
    kzImportData(o); kzRender(); setTimeout(kzCenter,30); kzRenderSet(); toast('読み込みました');
  }).catch(()=>toast('家系図のファイルを読めませんでした'));
}
function kzClearAll(){ if(!kz.people.length||!confirm('家系図をぜんぶ消しますか？（もとに戻せません。先に書き出しておくと安心です）')) return; kz.people=[]; kz.me=''; kz.focus=''; kzSave(); closeDlg('kzSetOverlay'); kzRender(); }

/* ───────── 画像・印刷（いまの図をそのまま canvas に描く） ───────── */
function kzDrawCanvas(){
  const L=kzLayout(); if(!L.nodes.length) return Promise.resolve(null);
  const xs=L.nodes.map(n=>n.x), ys=L.nodes.map(n=>n.y), pad=30, top=40;
  const minX=Math.min(...xs)-NW/2-pad, maxX=Math.max(...xs)+NW/2+pad, minY=Math.min(...ys)-pad-top, maxY=Math.max(...ys)+NH+pad;
  const W=maxX-minX, H=maxY-minY, ox=-minX, oy=-minY, k=2;
  const c=document.createElement('canvas'); c.width=W*k; c.height=H*k; const x=c.getContext('2d'); x.scale(k,k);
  x.fillStyle='#fff'; x.fillRect(0,0,W,H);
  const F=per(kz.focus); x.fillStyle='#333'; x.font='bold 16px sans-serif'; x.fillText(`🌳 家系図（中心：${nm(F)}）`, 14, 26);
  x.strokeStyle='#8d6e63'; x.lineWidth=1.6;
  L.lines.forEach(l=>{ x.beginPath();
    if(l.t==='couple'||l.t==='spouse'){ const dy=l.t==='spouse'&&l.k?10:0; x.moveTo(l.x1+ox+NW/2,l.y+oy+NH/2+dy); x.lineTo(l.x2+ox-NW/2,l.y+oy+NH/2+dy); }
    else if(l.t==='down'){ const by=l.ky+oy-VG/2+(l.n>1?(l.g-(l.n-1)/2)*8:0), sy=l.y+oy+(l.from==='node'?NH:NH/2+(l.k?10:0)), kx=l.kids.map(v=>v+ox);
      x.moveTo(l.x+ox,sy); x.lineTo(l.x+ox,by); x.moveTo(Math.min(l.x+ox,...kx),by); x.lineTo(Math.max(l.x+ox,...kx),by); kx.forEach((v,i)=>{ if(l.ad&&l.ad[i]) return; x.moveTo(v,by); x.lineTo(v,l.ky+oy); }); }
    x.stroke();
    if(l.t==='down'&&l.ad&&l.ad.some(Boolean)){ const by=l.ky+oy-VG/2+(l.n>1?(l.g-(l.n-1)/2)*8:0); x.save(); x.setLineDash([5,4]); x.strokeStyle='#2e7d32'; x.beginPath(); l.kids.forEach((v,i)=>{ if(!l.ad[i]) return; x.moveTo(v+ox,by); x.lineTo(v+ox,l.ky+oy); }); x.stroke(); x.restore(); } });
  const imgs=[];
  L.nodes.filter(n=>!n.add).forEach(n=>{ const p=per(n.id), X=n.x+ox-NW/2, Y=n.y+oy;
    x.fillStyle=p.sex==='m'?'#e3f2fd':p.sex==='f'?'#fce4ec':'#f3f3f3'; x.strokeStyle=n.focus?'#e65100':p.sex==='m'?'#64b5f6':p.sex==='f'?'#f06292':'#aaa'; x.lineWidth=n.focus?3:1.4;
    x.beginPath(); x.roundRect?x.roundRect(X,Y,NW,NH,10):x.rect(X,Y,NW,NH); x.fill(); x.stroke();
    const tx=X+(kz.photo&&p.photo?50:8); x.fillStyle='#222'; x.font='bold 13px sans-serif'; x.fillText((nm(p)+(p.dead?' †':'')).slice(0,9), tx, Y+20);
    x.font='11px sans-serif'; x.fillStyle='#bf360c'; x.fillText([kinLabel(n.id), ordOf(p)!==kinLabel(n.id)?ordOf(p):''].filter(Boolean).join('・').slice(0,11), tx, Y+37); x.fillStyle='#666'; x.fillText(years(p).slice(0,14), tx, Y+53);
    if(kz.photo&&p.photo) imgs.push(new Promise(r=>{ const im=new Image(); im.onload=()=>{ x.save(); x.beginPath(); x.arc(X+25,Y+NH/2,19,0,Math.PI*2); x.clip(); x.drawImage(im,X+6,Y+NH/2-19,38,38); x.restore(); r(); }; im.onerror=r; im.src=p.photo; })); });
  return Promise.all(imgs).then(()=>c);
}
function kzSaveImage(){
  kzDrawCanvas().then(c=>{ if(!c) return; c.toBlob(b=>{ const name=`kakeizu_${kzStamp()}.png`, file=new File([b],name,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})&&confirm('画像を共有（LINE・メール・写真に保存など）しますか？\n「キャンセル」で端末に保存します。')){ navigator.share({files:[file],title:'家系図'}).catch(()=>{}); return; }
    kzDownload(b,name); toast('画像を保存しました'); },'image/png'); });
}
function kzPrint(){
  kzDrawCanvas().then(c=>{ if(!c) return;
    let pa=document.getElementById('printArea'); if(!pa){ pa=document.createElement('div'); pa.id='printArea'; document.body.appendChild(pa); }
    pa.innerHTML=`<img src="${c.toDataURL('image/png')}" style="display:block;max-width:100%;max-height:180mm;margin:0 auto" alt="家系図">`;
    let dyn=document.getElementById('printDynamicStyle'); if(!dyn){ dyn=document.createElement('style'); dyn.id='printDynamicStyle'; document.head.appendChild(dyn); }
    dyn.textContent='@page{ size: A4 landscape; margin: 10mm; }';
    setTimeout(()=>{ try{ window.print(); }catch(_){ toast('印刷を開けませんでした'); } },300);
  });
}

/* ───────── 画面 ───────── */
const KZ_CSS=`
#kakeizuOverlay .kz-modal{ display:flex; flex-direction:column; }
.kz-tools{ display:flex; gap:6px; padding:6px 10px; align-items:center; border-bottom:1px solid rgba(120,132,156,.25); overflow-x:auto; scrollbar-width:none; } .kz-tools::-webkit-scrollbar{ display:none; }
.kz-tools .fn{ flex:1; min-width:80px; font-size:12.5px; font-weight:bold; color:var(--text-light,#777); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kz-tools button{ flex:none; height:34px; padding:0 10px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.kz-tools.dis button.nd{ display:none; }
.kz-view{ flex:1; min-height:0; overflow:auto; position:relative; background:repeating-linear-gradient(0deg,transparent 0 23px,rgba(141,110,99,.06) 23px 24px),var(--modal-bg,#fffdf8); touch-action:none; -webkit-user-select:none; user-select:none; }
.kz-stage{ position:relative; }
.kz-inner{ position:absolute; left:0; top:0; transform-origin:0 0; }
.kz-lines{ position:absolute; left:0; top:0; overflow:visible; } .kz-lines path,.kz-lines line{ fill:none; stroke:#8d6e63; stroke-width:1.8; } .kz-lines .cp{ stroke:#c62828; stroke-width:2; } .kz-lines .cp2{ stroke-dasharray:5 4; } .kz-lines .ad{ stroke:#2e7d32; stroke-dasharray:5 4; } .kz-lines .adt{ font-size:11px; font-weight:bold; fill:#2e7d32; }
.kz-node{ position:absolute; width:${NW}px; height:${NH}px; box-sizing:border-box; display:flex; align-items:center; gap:6px; padding:4px 8px; border-radius:12px; border:1.5px solid #bbb; background:#f6f6f6; color:#222; text-align:left; cursor:pointer; font:inherit; box-shadow:0 1px 3px rgba(0,0,0,.12); }
.kz-node.m{ background:#e3f2fd; border-color:#64b5f6; } .kz-node.f{ background:#fce4ec; border-color:#f06292; }
.kz-node.dead{ filter:saturate(.35); } .kz-node.dead b i{ font-style:normal; margin-left:3px; color:#555; }
.kz-node.focus{ border:3px solid #e65100; box-shadow:0 0 0 3px rgba(230,81,0,.18); } .kz-node.me:not(.focus)::after{ content:'本人'; position:absolute; top:-9px; right:6px; font-size:10px; font-weight:bold; background:#e65100; color:#fff; padding:0 5px; border-radius:6px; }
.kz-node img{ width:38px; height:38px; border-radius:50%; object-fit:cover; flex:none; }
.kz-node .tx{ min-width:0; display:flex; flex-direction:column; line-height:1.25; } .kz-node b{ font-size:13.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .kz-node small{ font-size:10.5px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .kz-node small.kin{ color:#bf360c; font-weight:bold; }
.kz-node.add{ border:1.5px dashed #a1887f; background:rgba(255,255,255,.7); color:#795548; font-size:13px; font-weight:bold; justify-content:center; box-shadow:none; }
.kz-empty{ padding:40px 18px; text-align:center; line-height:1.9; color:var(--text,#333); } .kz-empty .big{ font-size:56px; }
.kz-b{ height:42px; padding:0 14px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.kz-b.pri{ background:#8d6e63; border-color:#8d6e63; color:#fff; } .kz-b.danger{ color:#d32f2f; border-color:rgba(211,47,47,.4); } .kz-b.wide{ display:block; width:100%; margin:12px 0 4px; }
.kz-chips{ display:flex; flex-wrap:wrap; gap:5px; align-items:center; margin:4px 0 6px; } .kz-chips span{ font-size:12px; font-weight:bold; color:var(--text-light,#888); margin-right:2px; }
.kz-chips button{ height:34px; min-width:40px; padding:0 10px; border-radius:17px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; } .kz-chips button.on{ background:#8d6e63; border-color:#8d6e63; color:#fff; }
.kz-btns{ display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; } .kz-btns .kz-b{ flex:1 1 auto; } .kz-btns.s .kz-b{ height:38px; font-size:13px; padding:0 10px; }
.kz-body{ padding:10px 14px calc(16px + var(--safe-bottom,0px)); overflow:auto; font-size:14.5px; line-height:1.65; color:var(--text,#222); }
.kz-body h4{ font-size:14px; color:#6d4c41; margin:14px 0 6px; border-left:4px solid #8d6e63; padding-left:8px; }
.kz-prof{ display:flex; gap:12px; align-items:flex-start; } .kz-prof img{ width:84px; height:84px; border-radius:12px; object-fit:cover; flex:none; } .kz-prof .nm{ font-size:19px; font-weight:bold; } .kz-prof .nm small{ display:block; font-size:12px; font-weight:normal; color:var(--text-light,#888); } .kz-prof .kin{ color:#bf360c; font-weight:bold; } .kz-ad{ color:#2e7d32; font-weight:bold; } .kz-rel td small{ color:var(--text-light,#888); }
.kz-note{ margin:8px 0; padding:8px 10px; border-radius:8px; background:rgba(141,110,99,.1); font-size:13.5px; }
.kz-rel{ width:100%; border-collapse:collapse; margin:8px 0; font-size:13.5px; } .kz-rel th{ width:5.5em; text-align:left; color:var(--text-light,#888); font-weight:bold; padding:4px 0; vertical-align:top; } .kz-rel td{ padding:4px 0; border-bottom:1px solid rgba(120,132,156,.15); } .kz-rel a{ color:#1565c0; font-weight:bold; cursor:pointer; text-decoration:underline; }
.kz-form label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:8px 0 2px; }
.kz-form input:not([type=checkbox]),.kz-form select,.kz-form textarea{ display:block; width:100%; box-sizing:border-box; margin-top:3px; min-height:42px; padding:6px 10px; font-size:16px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
.kz-form small{ display:block; min-height:1.2em; font-size:11.5px; color:#2e7d32; font-weight:normal; } .kz-form small.bad{ color:#d32f2f; }
.kz-g2{ display:grid; grid-template-columns:1fr 1fr; gap:0 10px; } .kz-g2>*{ min-width:0; }
.kz-form label.kz-sw{ display:flex; align-items:center; gap:8px; color:var(--text,#222); font-size:13.5px; } .kz-sw input{ width:20px; height:20px; }
.kz-seg{ display:flex; flex-wrap:wrap; gap:6px; margin:4px 0 6px; } .kz-seg button{ flex:1 1 auto; min-width:60px; height:40px; padding:0 8px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; font-weight:bold; cursor:pointer; } .kz-seg button.on{ background:#8d6e63; border-color:#8d6e63; color:#fff; }
.kz-lb{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:6px 0 0; }
.kz-ephoto{ width:110px; height:110px; margin:4px auto 6px; border-radius:14px; overflow:hidden; background:rgba(120,132,156,.12); display:flex; align-items:center; justify-content:center; color:var(--text-light,#999); font-size:12px; text-align:center; cursor:pointer; } .kz-ephoto img{ width:100%; height:100%; object-fit:cover; }
.kz-q{ display:block; width:100%; box-sizing:border-box; height:42px; padding:0 12px; font-size:16px; border:1px solid rgba(120,132,156,.5); border-radius:21px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.kz-hint{ font-size:12.5px; color:var(--text-light,#888); margin:6px 2px; }
.kz-li{ display:flex; width:100%; align-items:center; gap:10px; padding:7px 4px; border:0; border-bottom:1px solid rgba(120,132,156,.2); background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.kz-li img,.kz-li .av{ width:40px; height:40px; border-radius:50%; object-fit:cover; flex:none; display:flex; align-items:center; justify-content:center; font-size:22px; background:rgba(120,132,156,.12); }
.kz-li .tx{ display:flex; flex-direction:column; min-width:0; } .kz-li small{ color:var(--text-light,#888); font-size:12px; } .kz-li.dead b{ color:var(--text-light,#777); }
`;
function kzEnsureDom(){
  if($('kakeizuOverlay')) return;
  const st=document.createElement('style'); st.id='kzStyle'; st.textContent=KZ_CSS; document.head.appendChild(st);
  const ov=(id,hdr,bodyId)=>`<div class="modal-overlay" id="${id}" onclick="if(event.target===this)closeDlg('${id}')"><div class="modal"><div class="modal-header"><span id="${hdr}"></span><button class="modal-close" onclick="closeDlg('${id}')" aria-label="閉じる">✕</button></div><div class="kz-body" id="${bodyId}"></div></div></div>`;
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="kakeizuOverlay">
  <div class="modal vol-modal kz-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🌳 家系図</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center"><button class="hdr-btn" onclick="kzOpenSet()" title="出す代・見え方・書き出し">⚙ 設定</button><button class="modal-close" onclick="closeKakeizu()" aria-label="閉じる">✕</button></span></div>
    <div class="kz-tools" id="kzTools"><span class="fn" id="kzFocusName"></span>
      <button class="nd" onclick="kzOpenList()">📋 一覧</button><button class="nd" onclick="kzFocus(kzState().me)">🏠 本人へ</button>
      <button class="nd" onclick="kzZoom(1/1.25)" aria-label="小さく">－</button><button class="nd" onclick="kzZoom(1.25)" aria-label="大きく">＋</button><button class="nd" onclick="kzFit()">⤢ 全体</button>
      <button class="nd" onclick="kzSaveImage()">🖼 画像</button><button class="nd" onclick="kzPrint()">🖨 印刷</button></div>
    <div class="kz-empty" id="kzEmpty"><div class="big">🌳</div><b>家系図をつくりましょう</b><br>はじめに、<b>自分（本人）</b>を入れます。<br>そのあと人を押して「＋父」「＋母」「＋子」…と家族を足していきます。<br><button class="kz-b pri" style="margin-top:14px" onclick="kzAddRel('me','')">＋ 自分（本人）を入れる</button>
      <div class="kz-hint" style="margin-top:14px">書き出したファイルがあるときは ⚙ 設定 →「⬆ 読み込む」</div></div>
    <div class="kz-view" id="kzView" data-hswipe="1"><div class="kz-stage" id="kzStage"></div></div>
  </div>
</div>
${ov('kzSheetOverlay','kzSheetHdr','kzSheetBody')}
${ov('kzListOverlay','kzListHdr','kzListBody')}
${ov('kzEditOverlay','kzEditHdr','kzEditBody')}
${ov('kzSetOverlay','kzSetHdr','kzSetBody')}`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  $('kzListHdr').textContent='📋 一覧'; $('kzSetHdr').textContent='⚙ 家系図の設定';
  kzBindView();
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openKakeizu(){
  kzEnsureDom(); kzLoad();
  openDlg('kakeizuOverlay'); kzRender(); setTimeout(kzCenter,60);
}
function closeKakeizu(){ if(!$('kakeizuOverlay')||!isDlgOpen('kakeizuOverlay')) return; ['kzEditOverlay','kzSheetOverlay','kzListOverlay','kzSetOverlay'].forEach(id=>{ if(isDlgOpen(id)) closeDlg(id); }); closeDlg('kakeizuOverlay'); }

Object.assign(window, { openKakeizu, closeKakeizu, kzTap, kzSetOrd, kzSetBo, kzFocus, kzSetMe, kzDel, kzAddRel, kzEditPerson, kzSeg, kzPickCh, kzDHint, kzSaveForm, kzPhotoIn, kzPhotoClear,
  kzOpenList, kzRenderList, kzOpenSet, kzSetOpt, kzExport, kzImport, kzClearAll, kzZoom, kzFit, kzSaveImage, kzPrint, $kz:$,
  kzState:()=>JSON.parse(JSON.stringify(kz)), kzKin:kinLabel, kzParseDate:s=>parseD(s), kzWareki:s=>wareki(parseD(s)), kzAge:id=>age(per(id)), kzLayoutData:()=>kzLayout(),
  kzOrd:id=>ordOf(per(id)), kzExportData, kzImportData:o=>{ kzImportData(o); kzRender(); }, kzDrawCanvas });
})();
