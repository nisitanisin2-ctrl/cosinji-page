/* 🧺 洗濯表示の読み方（v605。表電卓の道具。apps/sentaku/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   服の タグの 記号（JIS L 0001。2016年12月から の 41種類）を 絵から えらぶと、洗い方・漂白・乾燥機・干し方・アイロン・クリーニングが 分かる。
   ・👕 タグを 読む：タグの 写真を 撮って（見ながら えらべる）、分けごとに 記号を 押す → まとめ（この服の 洗い方）と ひとこと。🔈 読み上げ・📋 コピー
   ・🔎 記号の 一覧：41種類を 分けごとに。押すと 意味と こつ
   ・📒 お手入れ メモ：家族の 服ごとに 名前・だれの・服と タグの 写真・記号・メモ（素材・買った 店）を 残す
   ・📜 古い 表示：2016年11月までの 記号（洗濯機の 絵・「手洗イ」・アイロンの「高・中・低」など）と 今の 記号の 対応
   ・🧥 服・素材（v606）：服（ズボン・靴下・セーター など）と 素材（綿・ウール・シルク など）の 洗い方・干し方・アイロン・気を つける こと、基本の こつ。
     中身は sentaku-guide.js（先に 読む）。上の 🔍 で 服・素材・記号・メモを まとめて さがせる
   中身は excalc_sentaku、写真は IndexedDB（excalc_sentaku）。この端末の中だけ。 */
(function(){
'use strict';
const KEY='excalc_sentaku', MAX_IT=300, PIC_PX=1000;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);
const okPic=x=>typeof x==='string' && /^p[a-z0-9]{6,20}$/.test(x);

/* ───────── 記号の 絵（SVG。0 0 100 112 の 中。下の 線は 弱い 処理） ───────── */
const SW='stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const TUB='<path d="M8 30 L19 84 H81 L92 30"/><path d="M8 30 C16 22 24 22 31 30 S46 38 53 30 S68 22 75 30 S88 36 92 30"/>';
const HAND='<path d="M37 74 V55 Q37 50 41 50 Q45 50 45 55 V62 M45 54 V48 Q45 43 49 43 Q53 43 53 48 V62 M53 51 Q53 46 57 46 Q61 46 61 51 V64 Q61 76 51 78 H44 Q36 78 32 71 L27 63 Q26 59 30 59 Q33 59 37 65"/>';
const SQ='<path d="M10 10 H90 V90 H10 Z"/>';
const TRI='<path d="M50 9 L93 88 H7 Z"/>';
const IRON='<path d="M10 80 H88 V66 C88 46 72 38 54 38 H36 C30 38 26 42 23 48 Z"/><path d="M42 38 C42 28 50 24 60 24 H78"/>';
const CIR='<circle cx="50" cy="48" r="38"/>';
const CROSS='<path d="M8 8 L92 92 M92 8 L8 92"/>';
const SHADE='<path d="M10 34 L34 10"/>';
const dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="5.5" fill="currentColor" stroke="none"/>`;
const bars=(n,x1,x2)=>[96,106].slice(0,n).map(y=>`<path d="M${x1} ${y} H${x2}"/>`).join('');
const txt=(t,x,y,sz)=>`<text x="${x}" y="${y}" font-size="${sz}" font-weight="bold" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif">${t}</text>`;
function shape(sp){
  const k=sp.k;
  if(k==='tub') return TUB+(sp.hand ? HAND : sp.t ? txt(sp.t, 50, 72, 30) : '')+bars(sp.b||0, 22, 78)+(sp.x ? CROSS : '');
  if(k==='tri') return TRI+(sp.o ? '<path d="M38 84 L60 44 M52 84 L70 52"/>' : '')+(sp.x ? CROSS : '');
  if(k==='tum') return SQ+'<circle cx="50" cy="50" r="29"/>'+(sp.d===1 ? dot(50,50) : sp.d===2 ? dot(40,50)+dot(60,50) : '')+(sp.x ? CROSS : '');
  if(k==='dry'){ let s=SQ;
    if(sp.l==='v') s+=sp.w ? '<path d="M42 22 V78 M58 22 V78"/>' : '<path d="M50 22 V78"/>';
    else s+=sp.w ? '<path d="M24 42 H76 M24 58 H76"/>' : '<path d="M24 50 H76"/>';
    return s+(sp.s ? SHADE : ''); }
  if(k==='iron') return IRON+(sp.d===1 ? dot(56,64) : sp.d===2 ? dot(46,64)+dot(66,64) : sp.d===3 ? dot(40,64)+dot(56,64)+dot(72,64) : '')+(sp.x ? CROSS : '');
  if(k==='cir') return CIR+(sp.t ? txt(sp.t, 50, 62, 40) : '')+bars(sp.b||0, 24, 76)+(sp.x ? CROSS : '');
  return '';
}
function svg(code, px, lab){
  const s=SYM[code]; if(!s) return '';
  const w=px||48, h=Math.round(w*1.12);
  return `<svg class="sn-svg" viewBox="0 0 100 112" width="${w}" height="${h}" ${SW} role="img" aria-label="${esc(lab!=null ? lab : s.n)}">${shape(s.sp)}</svg>`;
}

/* ───────── 41の 記号（JIS L 0001）。c：分け・n：名前・m：意味・tip：こつ ───────── */
const CATS=[
  ['wash','🫧','洗う'], ['bleach','🧴','漂白'], ['tum','🌀','乾燥機'], ['dry','👕','干し方'], ['iron','♨','アイロン'], ['dc','🧥','ドライクリーニング'], ['wet','💧','ウエットクリーニング'],
];
const L=[
  // 洗う（14）
  ['W95','wash',{k:'tub',t:'95'},'95℃まで 洗濯機','液温は 95℃を 限度に、洗濯機で 洗える','熱い お湯でも 洗える 丈夫な もの（白い 綿の タオル・シーツ など）。ふつうの 洗濯でも かまいません。'],
  ['W70','wash',{k:'tub',t:'70'},'70℃まで 洗濯機','液温は 70℃を 限度に、洗濯機で 洗える','ふつうに 洗濯機で 洗えます。お湯は 70℃まで。'],
  ['W60','wash',{k:'tub',t:'60'},'60℃まで 洗濯機','液温は 60℃を 限度に、洗濯機で 洗える','ふつうに 洗濯機で 洗えます。お湯は 60℃まで。'],
  ['W60L','wash',{k:'tub',t:'60',b:1},'60℃まで 弱い 洗い','液温は 60℃を 限度に、洗濯機で 弱い 洗濯が できる','洗濯機の「弱」「ドライ」「おしゃれ着」コースで。'],
  ['W50','wash',{k:'tub',t:'50'},'50℃まで 洗濯機','液温は 50℃を 限度に、洗濯機で 洗える','ふつうに 洗濯機で 洗えます。お湯は 50℃まで。'],
  ['W50L','wash',{k:'tub',t:'50',b:1},'50℃まで 弱い 洗い','液温は 50℃を 限度に、洗濯機で 弱い 洗濯が できる','洗濯機の「弱」「ドライ」「おしゃれ着」コースで。'],
  ['W40','wash',{k:'tub',t:'40'},'40℃まで 洗濯機','液温は 40℃を 限度に、洗濯機で 洗える','家の ふつうの 洗濯で だいじょうぶです（お湯は 40℃まで）。'],
  ['W40L','wash',{k:'tub',t:'40',b:1},'40℃まで 弱い 洗い','液温は 40℃を 限度に、洗濯機で 弱い 洗濯が できる','洗濯機の「弱」「ドライ」「おしゃれ着」コースで。洗濯ネットに 入れると 安心。'],
  ['W40LL','wash',{k:'tub',t:'40',b:2},'40℃まで とても 弱い 洗い','液温は 40℃を 限度に、洗濯機で 非常に 弱い 洗濯が できる','洗濯機の「手洗い」「ドライ」など いちばん 弱い コースで。洗濯ネットに 入れて、おしゃれ着用（中性）洗剤で。'],
  ['W30','wash',{k:'tub',t:'30'},'30℃まで 洗濯機','液温は 30℃を 限度に、洗濯機で 洗える','水か ぬるま湯（30℃まで）で、洗濯機で 洗えます。'],
  ['W30L','wash',{k:'tub',t:'30',b:1},'30℃まで 弱い 洗い','液温は 30℃を 限度に、洗濯機で 弱い 洗濯が できる','水か ぬるま湯で、洗濯機の「弱」「おしゃれ着」コースで。'],
  ['W30LL','wash',{k:'tub',t:'30',b:2},'30℃まで とても 弱い 洗い','液温は 30℃を 限度に、洗濯機で 非常に 弱い 洗濯が できる','水か ぬるま湯で、いちばん 弱い コース（手洗い コース）。ネットに 入れて、中性洗剤で。'],
  ['WH','wash',{k:'tub',hand:1},'手洗い','液温は 40℃を 限度に、手洗いが できる','押し洗い・振り洗いで やさしく（もみ洗いは さける）。洗濯機の「手洗い」コースが 使える ことも 多いです。'],
  ['WX','wash',{k:'tub',x:1},'家では 洗えない','家庭での 洗濯は できない','家では 洗わずに、クリーニング店へ。'],
  // 漂白（3）
  ['B','bleach',{k:'tri'},'漂白剤 なんでも OK','塩素系 及び 酸素系の 漂白剤を 使って 漂白が できる','白い ものは 塩素系も 使えます。色柄物は 塩素系だと 色が 抜けるので、酸素系に。'],
  ['BO','bleach',{k:'tri',o:1},'酸素系だけ OK','酸素系 漂白剤の 使用は できるが、塩素系 漂白剤は 使用禁止','「酸素系」「色柄物にも 使える」と 書いた 漂白剤を 使います。'],
  ['BX','bleach',{k:'tri',x:1},'漂白剤 ×','漂白処理は できない','漂白剤は 使いません（落ちない シミは クリーニング店に 相談）。'],
  // 乾燥機（3）
  ['T2','tum',{k:'tum',d:2},'乾燥機 OK（ふつう）','タンブル乾燥が できる（排気温度の 上限は 最高 80℃）','家の 乾燥機・コインランドリーの 乾燥機で 乾かせます。'],
  ['T1','tum',{k:'tum',d:1},'乾燥機は 低い 温度で','低い 温度での タンブル乾燥が できる（排気温度の 上限は 最高 60℃）','乾燥機は「低温」で。コインランドリーの 高い 温度は さけます。'],
  ['TX','tum',{k:'tum',x:1},'乾燥機 ×','タンブル乾燥は できない','乾燥機は 使いません（縮む・型くずれ の もと）。'],
  // 干し方（8）
  ['DL','dry',{k:'dry',l:'v'},'つり干し','つり干しが よい','ハンガーなどに つるして 干します。'],
  ['DLS','dry',{k:'dry',l:'v',s:1},'日陰で つり干し','日陰の つり干しが よい','色あせ しないよう、日陰で つるして 干します。'],
  ['DW','dry',{k:'dry',l:'v',w:1},'ぬれたまま つり干し','ぬれつり干しが よい','洗濯機で 脱水せずに、ぬれたまま つるして 干します（しわに なりにくい）。'],
  ['DWS','dry',{k:'dry',l:'v',w:1,s:1},'日陰で ぬれたまま つり干し','日陰の ぬれつり干しが よい','脱水せずに、日陰で つるして 干します。'],
  ['DF','dry',{k:'dry',l:'h'},'平干し','平干しが よい','平らに 広げて 干します（ニットが のびない。平干し ネットが 便利）。'],
  ['DFS','dry',{k:'dry',l:'h',s:1},'日陰で 平干し','日陰の 平干しが よい','日陰で、平らに 広げて 干します。'],
  ['DWF','dry',{k:'dry',l:'h',w:1},'ぬれたまま 平干し','ぬれ平干しが よい','脱水せずに、ぬれたまま 平らに 広げて 干します。'],
  ['DWFS','dry',{k:'dry',l:'h',w:1,s:1},'日陰で ぬれたまま 平干し','日陰の ぬれ平干しが よい','脱水せずに、日陰で 平らに 広げて 干します。'],
  // アイロン（4）
  ['I3','iron',{k:'iron',d:3},'アイロン 高温（200℃）','底面温度 200℃を 限度に アイロン仕上げが できる','高い 温度で（綿・麻 など）。'],
  ['I2','iron',{k:'iron',d:2},'アイロン 中温（150℃）','底面温度 150℃を 限度に アイロン仕上げが できる','中くらいの 温度で（ウール・ポリエステル など）。あて布を すると 安心です。'],
  ['I1','iron',{k:'iron',d:1},'アイロン 低温（110℃）','底面温度 110℃を 限度に スチームなしで アイロン仕上げが できる','低い 温度で、スチームは 使いません（アクリル・ナイロン など）。あて布を。'],
  ['IX','iron',{k:'iron',x:1},'アイロン ×','アイロン仕上げは できない','アイロンは かけません。'],
  // ドライクリーニング（5）
  ['P','dc',{k:'cir',t:'P'},'ドライ OK（P）','パークロロエチレン 及び 石油系 溶剤による ドライクリーニングが できる','クリーニング店で ふつうの ドライクリーニングが できます。'],
  ['PL','dc',{k:'cir',t:'P',b:1},'ドライ 弱く（P）','パークロロエチレン 及び 石油系 溶剤による 弱い ドライクリーニングが できる','クリーニング店で 弱い 処理の ドライクリーニングを。'],
  ['F','dc',{k:'cir',t:'F'},'ドライ OK（石油系）','石油系 溶剤による ドライクリーニングが できる','クリーニング店で 石油系の ドライクリーニングを。'],
  ['FL','dc',{k:'cir',t:'F',b:1},'ドライ 弱く（石油系）','石油系 溶剤による 弱い ドライクリーニングが できる','クリーニング店で 石油系・弱い 処理の ドライクリーニングを。'],
  ['PX','dc',{k:'cir',x:1},'ドライ ×','ドライクリーニングは できない','ドライクリーニングは できません（出すときに 店に 伝えます）。'],
  // ウエットクリーニング（4）
  ['WW','wet',{k:'cir',t:'W'},'ウエット OK','ウエットクリーニングが できる','クリーニング店の 水洗い（プロの 技術）が できます。家での 洗濯とは ちがいます。'],
  ['WWL','wet',{k:'cir',t:'W',b:1},'ウエット 弱く','弱い 操作による ウエットクリーニングが できる','クリーニング店で 弱い ウエットクリーニングを。'],
  ['WWLL','wet',{k:'cir',t:'W',b:2},'ウエット とても 弱く','非常に 弱い 操作による ウエットクリーニングが できる','クリーニング店で とても 弱い ウエットクリーニングを。'],
  ['WWX','wet',{k:'cir',t:'W',x:1},'ウエット ×','ウエットクリーニングは できない','クリーニング店の 水洗い（ウエット）は できません。'],
];
const SYM={}; L.forEach(([code,c,sp,n,m,tip])=>{ SYM[code]={code, c, sp, n, m, tip}; });
const byCat=c=>L.filter(x=>x[1]===c).map(x=>x[0]);
const catOf=code=>SYM[code] ? SYM[code].c : '';

/* 古い 表示（2016年11月まで。JIS L 0217）と 今の 記号 */
const OLD=[
  ['洗濯機の 絵に「40」','40℃までの お湯で 洗濯機','W40'],
  ['洗濯機の 絵に「弱 30」','30℃まで・弱い 水流','W30L'],
  ['おけの 絵に「手洗イ 30」','30℃までの お湯で 手洗い','WH'],
  ['おけの 絵に ×','水洗い できない','WX'],
  ['フラスコの 絵に「エンソサラシ」','塩素系の 漂白剤が 使える','B'],
  ['フラスコの 絵に ×','塩素系の 漂白剤は 使えない（酸素系は 書かれて いなかった）','BO'],
  ['アイロンの 絵に「高」','180〜210℃','I3'],
  ['アイロンの 絵に「中」','140〜160℃','I2'],
  ['アイロンの 絵に「低」','80〜120℃','I1'],
  ['アイロンの 絵に ×','アイロン できない','IX'],
  ['まるに「ドライ」','ドライクリーニング できる','P'],
  ['まるに「ドライ セキユ系」','石油系で ドライクリーニング','F'],
  ['まるに「ドライ」と ×','ドライクリーニング できない','PX'],
  ['シャツの 絵（つり干し）','つるして 干す','DL'],
  ['シャツの 絵に ななめ線','日陰で つるして 干す','DLS'],
  ['「平」の 字','平らに 干す','DF'],
  ['しぼり方「ヨワク」','手で 軽く しぼる・脱水は 短く（今は しぼり方の 記号は ありません。ぬれ干しの 記号が 近い）',''],
];

/* ───────── 中身 ───────── */
let st=null;   // {v, items:[{id,n,who,sym,memo,pic,tag,at}], sel:[codes], selTag:'', tab}
function cleanSyms(a){ const seen=new Set(); return (Array.isArray(a) ? a : []).filter(c=>SYM[c] && !seen.has(SYM[c].c) && seen.add(SYM[c].c)); }   // 分けごとに 1つ
function cleanIt(x){
  if(!x || typeof x!=='object') return null;
  const n=oneLine(x.n, 40); if(!n) return null;
  return {id:okId(x.id) ? x.id : rid(), n, who:oneLine(x.who, 16), sym:cleanSyms(x.sym), memo:multi(x.memo, 300), pic:okPic(x.pic) ? x.pic : '', tag:okPic(x.tag) ? x.tag : '', at:+x.at||Date.now()};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=o && typeof o==='object' ? o : {};
  st={v:1, items:(Array.isArray(o.items) ? o.items : []).map(cleanIt).filter(Boolean).slice(0, MAX_IT), sel:cleanSyms(o.sel), selTag:okPic(o.selTag) ? o.selTag : '',
    tab:TABS.some(t=>t[0]===o.tab) ? o.tab : 'read', who:oneLine(o.who, 16), gk:GKS.some(g=>g[0]===o.gk) ? o.gk : 'fuku'};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末の 空きが 足りず、保存 できませんでした'); return false; } }

/* ───────── 写真（IndexedDB） ───────── */
let dbP=null;
function db(){
  if(dbP) return dbP;
  dbP=new Promise((res,rej)=>{ try{ const r=indexedDB.open('excalc_sentaku',1); r.onupgradeneeded=()=>r.result.createObjectStore('pics'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e); } }).catch(e=>{ dbP=null; throw e; });
  return dbP;
}
async function picGet(id){ try{ const d=await db(); return await new Promise(r=>{ const q=d.transaction('pics').objectStore('pics').get(id); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); }catch(_){ return null; } }
async function picPut(id, data){ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction('pics','readwrite'); t.objectStore('pics').put(data,id); t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error); }); }
async function picDel(id){ if(!okPic(id)) return; try{ const d=await db(); await new Promise(r=>{ const t=d.transaction('pics','readwrite'); t.objectStore('pics').delete(id); t.oncomplete=r; t.onerror=r; }); }catch(_){} }
const okData=u=>typeof u==='string' && /^data:image\/(jpeg|png|webp);base64,/.test(u);
function resize(file, max){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{ const k=Math.min(1, max/Math.max(im.naturalWidth, im.naturalHeight)), c=document.createElement('canvas');
      c.width=Math.max(1, Math.round(im.naturalWidth*k)); c.height=Math.max(1, Math.round(im.naturalHeight*k));
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',0.82)); };
    im.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('img')); };
    im.src=url;
  });
}
async function addPic(file){
  if(!file || !/^image\//.test(file.type||'')){ toastS('写真を えらんで ください'); return ''; }
  try{ const u=await resize(file, PIC_PX), id='p'+rid()+rid().slice(0,4); await picPut(id, u); return id; }
  catch(_){ toastS('写真を 読めませんでした'); return ''; }
}
function fillPics(root){ (root||document).querySelectorAll('img[data-pic]').forEach(im=>{ const id=im.dataset.pic; picGet(id).then(u=>{ if(okData(u) && im.dataset.pic===id) im.src=u; }); }); }

/* ───────── まとめ（えらんだ 記号から この服の 洗い方） ───────── */
function summary(sym){
  const by={}; cleanSyms(sym).forEach(c=>{ by[catOf(c)]=SYM[c]; });
  const lines=[];
  CATS.forEach(([c,ic,n])=>{ if(by[c]) lines.push({ic, n, s:by[c]}); });
  const tips=[], w=by.wash, t=by.tum, d=by.dry;
  if(w){
    if(w.code==='WX') tips.push('家では 洗わずに、クリーニング店へ'+(by.dc || by.wet ? '（記号を 見せると 伝わります）' : '')+'。');
    else if(w.code==='WH' || /L$/.test(w.code)) tips.push('おしゃれ着用（中性）洗剤で、洗濯ネットに 入れて 弱い コースで。');
    if(/^W30/.test(w.code)) tips.push('お湯は 使わず、水か ぬるま湯で。');
  }
  if(t && t.code==='TX' && d) tips.push('乾燥機は 使わずに、'+d.n+'。');
  else if(t && t.code==='TX') tips.push('乾燥機は 使いません。');
  if(by.iron && by.iron.code!=='IX' && by.iron.code!=='I3') tips.push('アイロンは あて布を すると 安心です。');
  return {lines, tips};
}
function summaryText(sym){
  const s=summary(sym);
  if(!s.lines.length) return '';
  return s.lines.map(l=>l.n+'：'+l.s.n).join('\n')+(s.tips.length ? '\n\n'+s.tips.join('\n') : '');
}

/* ───────── 画面 ───────── */
const TABS=[['read','👕 タグを 読む'],['guide','🧥 服・素材'],['memo','📒 メモ'],['list','🔎 記号'],['old','📜 古い 表示']];
let query='';   // 🔍 さがす ことば（残さない）
function render(){
  const b=$('snBody'); if(!b || !st) return;
  if(!$('snMain')){   // 🔍 の 欄は 作り直さない（打って いる あいだ キーボードが 閉じない ように）
    b.innerHTML=`<div class="sn-wrap"><div class="sn-qbar"><span aria-hidden="true">🔍</span><input type="search" id="snQ" maxlength="40" autocomplete="off" enterkeyhint="search" placeholder="服・素材・記号を さがす（例：セーター・ウール・靴下）" aria-label="服・素材・記号を さがす" oninput="SENTAKU.q(this.value)">
      <button type="button" class="sn-qx" id="snQx" onclick="SENTAKU.q('', true)" aria-label="さがすのを やめる" hidden>✕</button></div><div id="snMain"></div></div>`;
  }
  const main=$('snMain'), top=b.scrollTop;
  main.innerHTML=query ? searchHtml(query)
    : `<div class="sn-tabs" role="tablist">${TABS.map(([k,n])=>`<button type="button" role="tab" aria-selected="${st.tab===k}" class="${st.tab===k?'on':''}" onclick="SENTAKU.tab('${k}')">${n}${k==='memo' && st.items.length ? ' <small>'+st.items.length+'</small>' : ''}</button>`).join('')}</div>
    ${st.tab==='read' ? readHtml() : st.tab==='guide' ? guideHtml() : st.tab==='list' ? listHtml() : st.tab==='memo' ? memoHtml() : oldHtml()}`;
  const qx=$('snQx'); if(qx) qx.hidden=!query;
  b.scrollTop=top;
  fillPics(main);
}

/* ───────── 🧥 服・素材の 洗い方（v606。中身は sentaku-guide.js） ───────── */
const GKS=[['fuku','👕 服'],['sozai','🧶 素材'],['kihon','📘 基本の こつ']];
const HOME={ok:['🟢','洗濯機で OK'], soft:['🟡','手洗い・弱い コース'], pro:['🔴','クリーニングが 安心']};
const GUIDE=(Array.isArray(window.SENTAKU_GUIDE) ? window.SENTAKU_GUIDE : []).filter(e=>e && typeof e.id==='string' && GKS.some(g=>g[0]===e.k) && e.n)
  .map(e=>Object.assign({}, e, {sym:(Array.isArray(e.sym) ? e.sym : []).filter(c=>SYM[c])}));
const gOf=id=>GUIDE.find(e=>e.id===id)||null;
const GFIELDS=[['wash','🫧','洗い方'],['dry','👕','干し方'],['iron','♨','アイロン'],['note','⚠','気を つける']];
// ひらがなと カタカナ・全角と 半角・大文字と 小文字を 同じに、区切りの 記号は 消して くらべる
const kana=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\u3041-\u3096]/g, c=>String.fromCharCode(c.charCodeAt(0)+0x60)).replace(/[\s・、。,.／/()（）「」『』〜~:：]/g,'');
const gText=e=>GFIELDS.map(([k])=>e[k]||'').concat(e.pts||[]).join(' ');
const GIDX=GUIDE.map(e=>({e, n:kana(e.n), al:kana(e.al), t:kana(gText(e))}));
function guideHtml(){
  const k=st.gk||'fuku', L2=GUIDE.filter(e=>e.k===k);
  return `<p class="sn-lead">服・素材を 押すと 洗い方・干し方・アイロンが 出ます。上の 🔍 で さがす ことも できます（タグの 表示が いちばん 確かです）。</p>
    <div class="sn-chips" role="tablist">${GKS.map(([g,n])=>`<button type="button" role="tab" aria-selected="${k===g}" class="${k===g?'on':''}" onclick="SENTAKU.gk('${g}')">${n} <small>${GUIDE.filter(e=>e.k===g).length}</small></button>`).join('')}</div>
    ${k!=='kihon' ? `<p class="sn-legend">${Object.values(HOME).map(([c,t])=>c+' '+t).join('　')}</p>` : ''}
    <div class="sn-gl">${L2.map(gbtn).join('')}</div>`;
}
const gbtn=e=>`<button type="button" class="sn-gb" onclick="SENTAKU.guide('${e.id}')"><span class="i" aria-hidden="true">${e.ic}</span><span class="n">${esc(e.n)}</span>${HOME[e.home] ? `<span class="h" title="${HOME[e.home][1]}" aria-label="${HOME[e.home][1]}">${HOME[e.home][0]}</span>` : ''}</button>`;
// 洗い方の カード（pop：小さな 窓の 中。記号を 押して 閉じたら この 窓に もどる）
function cardHtml(e, pop){
  const body=e.pts ? `<ul class="sn-pts">${e.pts.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`
    : `<dl class="sn-gd">${GFIELDS.filter(([k])=>e[k]).map(([k,ic,n])=>`<dt><span aria-hidden="true">${ic}</span> ${n}</dt><dd>${esc(e[k])}</dd>`).join('')}</dl>`;
  return `<article class="sn-card" data-g="${e.id}">${pop ? '' : `<h4><span aria-hidden="true">${e.ic}</span> ${esc(e.n)}</h4>`}
    ${HOME[e.home] ? `<p class="sn-home ${e.home}">${HOME[e.home][0]} 家では：<b>${HOME[e.home][1]}</b></p>` : ''}${body}
    ${e.sym && e.sym.length ? `<div class="sn-gsym"><small>よく ある 表示（例。押すと 意味）</small><div>${e.sym.map(c=>`<button type="button" onclick="SENTAKU.info('${c}', '${pop ? 'g:'+e.id : ''}')">${svg(c, 34)}<span>${esc(SYM[c].n)}</span></button>`).join('')}</div></div>` : ''}
    <div class="sn-cacts"><button type="button" class="sn-b sm" onclick="SENTAKU.gsay('${e.id}')">🔈 読み上げ</button><button type="button" class="sn-b sm" onclick="SENTAKU.gcopy('${e.id}')">📋 コピー</button>${pop ? '<button type="button" class="sn-b sm" onclick="SENTAKU.close()">とじる</button>' : ''}</div></article>`;
}
function guide(id){ const e=gOf(id); if(!e) return; popOpen(head(e.ic, e.n)+cardHtml(e, true)); }
const gPlain=e=>e.n+'\n'+(HOME[e.home] ? '家では：'+HOME[e.home][1]+'\n' : '')+(e.pts ? e.pts.map(t=>'・'+t).join('\n') : GFIELDS.filter(([k])=>e[k]).map(([k,ic,n])=>n+'：'+e[k]).join('\n'));
function gsay(id){ const e=gOf(id); if(e) speak(gPlain(e).replace(/\n/g, '。')); }
function gcopy(id){ const e=gOf(id); if(e && typeof toolCopyText==='function') toolCopyText('🧺 '+gPlain(e), '📋 コピーしました'); }
function setGk(g){ if(!GKS.some(x=>x[0]===g)) return; st.gk=g; save(); render(); }

/* 🔍 さがす：服・素材・こつ（名前 → ほかの 言い方 → 中身 の 順に 強い）・記号・お手入れ メモ */
function search(q){
  const terms=String(q||'').split(/[\s　]+/).map(kana).filter(Boolean);
  if(!terms.length) return {g:[], s:[], m:[]};
  const score=fields=>{ let t=0; for(const w of terms){ let best=0; fields.forEach(([txt, pt])=>{ if(txt.includes(w)) best=Math.max(best, pt+(txt===w ? 5 : 0)); }); if(!best) return 0; t+=best; } return t; };
  const g=GIDX.map(x=>({e:x.e, s:score([[x.n, 10], [x.al, 6], [x.t, 1]])})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).map(x=>x.e);
  const sy=L.map(x=>x[0]).map(c=>{ const y=SYM[c], cat=CATS.find(k=>k[0]===y.c); return {c, s:score([[kana(y.n), 6], [kana(c), 3], [kana(cat ? cat[2] : ''), 2], [kana(y.m+' '+y.tip), 1]])}; }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).map(x=>x.c);
  const m=st.items.filter(x=>score([[kana(x.n), 5], [kana(x.who+' '+x.memo), 1]])>0);
  return {g, s:sy, m};
}
function searchHtml(q){
  const r=search(q);
  if(!r.g.length && !r.s.length && !r.m.length) return `<p class="sn-note">「${esc(q)}」は 見つかりませんでした。ことばを かえて さがして ください（例：ニット・綿・ズボン・アイロン・平干し）。</p>`;
  return `${r.g.length ? `<h4 class="sn-rh2">🧥 服・素材・こつ <small>${r.g.length}</small></h4>${r.g.slice(0, 3).map(e=>cardHtml(e, false)).join('')}
      ${r.g.length>3 ? `<p class="sn-more">ほかにも：</p><div class="sn-gl">${r.g.slice(3).map(gbtn).join('')}</div>` : ''}` : ''}
    ${r.s.length ? `<h4 class="sn-rh2">🏷 記号 <small>${r.s.length}</small></h4><div class="sn-srow">${r.s.slice(0, 8).map(c=>`<button type="button" class="sn-sr" onclick="SENTAKU.info('${c}')">${svg(c, 40)}<span><b>${esc(SYM[c].n)}</b><small>${esc(SYM[c].m)}</small></span></button>`).join('')}</div>` : ''}
    ${r.m.length ? `<h4 class="sn-rh2">📒 お手入れ メモ <small>${r.m.length}</small></h4><div class="sn-items">${r.m.map(x=>`<button type="button" class="sn-item" onclick="SENTAKU.edit('${x.id}')"><span class="sn-noimg" aria-hidden="true">👕</span><span class="sn-it"><b>${esc(x.n)}</b>${x.who ? `<small>${esc(x.who)}</small>` : ''}<span class="sn-mini">${x.sym.map(c=>svg(c, 22)).join('')}</span></span></button>`).join('')}</div>` : ''}`;
}
function setQ(v, focus){
  query=oneLine(v, 40);
  const i=$('snQ'); if(i && i.value!==v && !query) i.value='';
  render();
  const b=$('snBody'); if(b) b.scrollTop=0;
  if(focus && i) i.focus();
}
// 分けごとに 記号を ならべる（えらぶ 用）。on：えらんだ 記号の 配列・fn：押した ときの 関数
function pickRows(on, fn){
  return CATS.map(([c,ic,n])=>{
    const cur=on.find(x=>catOf(x)===c)||'';
    return `<div class="sn-row"><div class="sn-rh"><span aria-hidden="true">${ic}</span>${n}${cur ? `<b>${esc(SYM[cur].n)}</b>` : '<em>えらんで いない</em>'}</div>
      <div class="sn-syms">${byCat(c).map(code=>`<button type="button" class="sn-sym${cur===code?' on':''}" aria-pressed="${cur===code}" onclick="${fn}('${code}')">${svg(code, 44)}<small>${esc(SYM[code].n)}</small></button>`).join('')}</div></div>`;
  }).join('');
}
function sumHtml(sym){
  const s=summary(sym);
  if(!s.lines.length) return '<p class="sn-note">タグに ある 記号を、上の 分けごとに 押して ください（ない 分けは そのままで）。</p>';
  return `<div class="sn-sum"><h4>🧺 この 服の 洗い方</h4>${s.lines.map(l=>`<div class="sn-sl">${svg(l.s.code, 34)}<div><b>${l.ic} ${l.n}：${esc(l.s.n)}</b><small>${esc(l.s.tip)}</small></div></div>`).join('')}
    ${s.tips.length ? `<div class="sn-tips">${s.tips.map(t=>'💡 '+esc(t)).join('<br>')}</div>` : ''}</div>`;
}
function readHtml(){
  return `<p class="sn-lead">タグの 記号を、分けごとに 押して ください。下に「この 服の 洗い方」が 出ます。</p>
    <div class="sn-tagbox">${st.selTag ? `<img data-pic="${st.selTag}" alt="タグの 写真" onclick="SENTAKU.zoom('${st.selTag}')"><button type="button" class="sn-b sm" onclick="SENTAKU.tagDel()">✕ 写真を 外す</button>` : ''}
      <button type="button" class="sn-b" onclick="document.getElementById('snTagIn').click()">📷 タグを 撮る・えらぶ</button><input type="file" id="snTagIn" accept="image/*" hidden onchange="SENTAKU.tagPick(this)"></div>
    ${pickRows(st.sel, 'SENTAKU.sel')}
    ${sumHtml(st.sel)}
    <div class="sn-acts"><button type="button" class="sn-b pri" onclick="SENTAKU.memoFromSel()"${st.sel.length ? '' : ' disabled'}>📒 メモに 残す</button>
      <button type="button" class="sn-b" onclick="SENTAKU.say()"${st.sel.length ? '' : ' disabled'}>🔈 読み上げ</button>
      <button type="button" class="sn-b" onclick="SENTAKU.copy()"${st.sel.length ? '' : ' disabled'}>📋 コピー</button>
      <button type="button" class="sn-b" onclick="SENTAKU.clear()"${st.sel.length || st.selTag ? '' : ' disabled'}>🧹 やり直す</button></div>`;
}
function listHtml(){
  return `<p class="sn-lead">記号を 押すと、意味と こつが 出ます（JIS L 0001・2016年12月から の 41種類）。</p>`
    +CATS.map(([c,ic,n])=>`<h4 class="sn-ch">${ic} ${n}</h4><div class="sn-grid">${byCat(c).map(code=>`<button type="button" class="sn-cell" onclick="SENTAKU.info('${code}')">${svg(code, 52)}<span>${esc(SYM[code].n)}</span></button>`).join('')}</div>`).join('');
}
function memoHtml(){
  const whos=[...new Set(st.items.map(x=>x.who).filter(Boolean))];
  const list=st.items.filter(x=>!st.who || x.who===st.who);
  return `<div class="sn-acts top"><button type="button" class="sn-b pri" onclick="SENTAKU.edit()">＋ 服を 足す</button></div>
    ${whos.length ? `<div class="sn-chips"><button type="button" class="${st.who?'':'on'}" onclick="SENTAKU.who('')">みんな</button>${whos.map(w=>`<button type="button" class="${st.who===w?'on':''}" onclick="SENTAKU.who(this.dataset.w)" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : ''}
    ${list.length ? `<div class="sn-items">${list.map(x=>`<button type="button" class="sn-item" onclick="SENTAKU.edit('${x.id}')">
        ${x.pic || x.tag ? `<img data-pic="${x.pic||x.tag}" alt="">` : '<span class="sn-noimg" aria-hidden="true">👕</span>'}
        <span class="sn-it"><b>${esc(x.n)}</b>${x.who ? `<small>${esc(x.who)}</small>` : ''}<span class="sn-mini">${x.sym.map(c=>svg(c, 22)).join('')}</span>${x.memo ? `<small class="mm">${esc(x.memo.split('\n')[0])}</small>` : ''}</span></button>`).join('')}</div>`
      : `<p class="sn-note">まだ ありません。「＋ 服を 足す」か、👕 タグを 読む の「📒 メモに 残す」で 残せます。家族の 服ごとに、記号と 素材・買った 店 などを メモ できます。</p>`}`;
}
function oldHtml(){
  return `<p class="sn-lead">2016年11月までに 作られた 服には、前の 記号（洗濯機の 絵・カタカナの 字など）が ついて います。今の 記号と ほぼ 同じ 意味の ものを 並べました。</p>
    <div class="sn-old">${OLD.map(([a,b,c])=>`<div class="sn-or"><div class="o"><b>${esc(a)}</b><small>${esc(b)}</small></div><div class="n">${c ? svg(c, 40)+'<small>'+esc(SYM[c].n)+'</small>' : '<small>（今は なし）</small>'}</div></div>`).join('')}</div>
    <p class="sn-note">前の 表示には 酸素系 漂白剤・乾燥機・ウエットクリーニングの 記号が ありませんでした。分からない ときは、弱い ほう（ネット・弱い コース・乾燥機 なし・低い 温度の アイロン）に すると 安心です。</p>`;
}

/* ───────── 小さな 窓 ───────── */
let pop=null;
// onClose：閉じた あとに する こと（メモの 画面から 写真を 大きく した ときは、メモの 画面に もどる）
function popOpen(html, onClose){
  popClose(true);
  const host=document.querySelector('#sentakuOverlay .sn-modal'); if(!host) return null;
  const el=document.createElement('div'); el.className='sn-pop-bg';
  el.innerHTML=`<div class="sn-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  const me={el, rel:null, onClose:onClose||null}; pop=me;
  me.rel=typeof modalBack==='function' ? modalBack(()=>{ if(pop===me){ pop=null; el.remove(); afterClose(me); } }) : ()=>{};   // 端末の「戻る」は この窓だけ 閉じる
  fillPics(el);
  return el;
}
// keep：つぎの 窓に かえる だけ（メモの 中身は そのまま）
function popClose(keep){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); if(!keep) afterClose(p); }
function afterClose(p){ if(p.onClose) p.onClose(); else edDrop(); }
const head=(ic, t)=>`<div class="sn-ph"><span aria-hidden="true">${ic}</span><b>${esc(t)}</b><button type="button" class="sn-x" onclick="SENTAKU.close()" aria-label="閉じる">✕</button></div>`;
// from：'g:服の id' なら 閉じた あと その 服の 窓に もどる
function info(code, from){
  const s=SYM[code]; if(!s) return;
  const back=typeof from==='string' && /^g:/.test(from) && gOf(from.slice(2)) ? ()=>guide(from.slice(2)) : null;
  const cat=CATS.find(c=>c[0]===s.c);
  popOpen(head(cat[1], s.n)+`<div class="sn-info">${svg(code, 120)}<div><small>${esc(cat[2])}</small><p><b>${esc(s.m)}</b></p><p>💡 ${esc(s.tip)}</p></div></div>
    <div class="sn-acts"><button type="button" class="sn-b" onclick="SENTAKU.sayCode('${code}')">🔈 読み上げ</button><button type="button" class="sn-b" onclick="SENTAKU.close()">${back ? '← もどる' : 'とじる'}</button></div>`, back);
}
function zoom(id){ if(!okPic(id)) return; const back=!!ed; if(back) edKeepTop(); popOpen(head('🔍', '写真')+`<img class="sn-big" data-pic="${id}" alt="写真">`, back ? ()=>edRender() : null); }

/* お手入れ メモの 足す・直す */
let ed=null;   // {id, n, who, sym, memo, pic, tag, isNew}
function edit(id){
  const it=id ? st.items.find(x=>x.id===id) : null;
  if(id && !it) return;
  ed=it ? Object.assign({isNew:false}, JSON.parse(JSON.stringify(it))) : {isNew:true, id:rid(), n:'', who:st.who||'', sym:[], memo:'', pic:'', tag:'', at:Date.now()};
  edRender();
}
function edRender(){
  if(!ed) return;
  const whos=[...new Set(st.items.map(x=>x.who).filter(Boolean))];
  const ph=(k, lab)=>`<div class="sn-ph2"><span>${lab}</span>${ed[k] ? `<img data-pic="${ed[k]}" alt="${lab}" onclick="SENTAKU.zoom('${ed[k]}')"><button type="button" class="sn-b sm" onclick="SENTAKU.edPicDel('${k}')">✕ 外す</button>` : ''}
    <button type="button" class="sn-b sm" onclick="document.getElementById('snEd_${k}').click()">📷 ${ed[k] ? '撮りなおす' : '撮る・えらぶ'}</button><input type="file" id="snEd_${k}" accept="image/*" hidden onchange="SENTAKU.edPic('${k}', this)"></div>`;
  const el=popOpen(head('👕', ed.isNew ? '服を 足す' : '服の メモ')+`
    <label class="sn-f"><span>名前</span><input type="text" id="snEdN" maxlength="40" value="${esc(ed.n)}" placeholder="例：紺の セーター" oninput="SENTAKU.edSet('n', this.value)"></label>
    <label class="sn-f"><span>だれの</span><input type="text" id="snEdW" maxlength="16" value="${esc(ed.who)}" placeholder="例：父" list="snWhoL" oninput="SENTAKU.edSet('who', this.value)"><datalist id="snWhoL">${whos.map(w=>`<option value="${esc(w)}">`).join('')}</datalist></label>
    <div class="sn-phs">${ph('pic','服の 写真')}${ph('tag','タグの 写真')}</div>
    <h5>記号</h5>${pickRows(ed.sym, 'SENTAKU.edSym')}
    ${ed.sym.length ? sumHtml(ed.sym) : ''}
    <label class="sn-f top"><span>メモ</span><textarea id="snEdM" rows="3" maxlength="300" placeholder="例：ウール 100%・○○で 買った・ネットに 入れる" oninput="SENTAKU.edSet('memo', this.value)">${esc(ed.memo)}</textarea></label>
    <div class="sn-acts end">${ed.isNew ? '' : `<button type="button" class="sn-b warn" onclick="SENTAKU.del('${ed.id}')">🗑 消す</button>`}<button type="button" class="sn-b" onclick="SENTAKU.close()">やめる</button><button type="button" class="sn-b pri" onclick="SENTAKU.edSave()">💾 残す</button></div>`);
  if(el){ const p=el.querySelector('.sn-pop'); if(p && ed._top) p.scrollTop=ed._top; }
}
// 残さずに 閉じた とき：この 画面で 撮った 写真は 消す（ほかで 使って いる ものは 残す）
function edDrop(){
  if(!ed) return; const e=ed; ed=null;
  const was=st.items.find(x=>x.id===e.id);
  ['pic','tag'].forEach(k=>{ if(e[k] && (!was || was[k]!==e[k])) dropPic(e[k]); });
}
// 写真を 消す（タグを 読む の 写真・ほかの 服で 使って いる ものは 消さない）
function dropPic(id){ if(id && id!==st.selTag && !st.items.some(x=>x.pic===id || x.tag===id)) picDel(id); }
function edKeepTop(){ const p=pop && pop.el.querySelector('.sn-pop'); if(ed && p) ed._top=p.scrollTop; }
function edSet(k, v){ if(!ed) return; ed[k]=v; }
function edSym(code){ if(!ed || !SYM[code]) return; edKeepTop(); const c=catOf(code), had=ed.sym.includes(code); ed.sym=ed.sym.filter(x=>catOf(x)!==c); if(!had) ed.sym.push(code); ed.sym=cleanSyms(CATS.map(([k])=>ed.sym.find(x=>catOf(x)===k)).filter(Boolean)); edRender(); }
async function edPic(k, input){
  const f=input && input.files && input.files[0]; if(input) input.value=''; if(!ed || !f) return;
  edKeepTop(); const id=await addPic(f); if(!id) return;
  if(!ed){ dropPic(id); return; }
  dropPic(ed[k]);   // この 画面で 撮った 前の 写真は 消す（残して ある 写真は 残すまで 消さない）
  ed[k]=id; edRender();
}
function edPicDel(k){ if(!ed) return; edKeepTop(); dropPic(ed[k]); ed[k]=''; edRender(); }
function edSave(){
  if(!ed) return;
  const x=cleanIt(ed);
  if(!x){ toastS('名前を 入れて ください'); const n=$('snEdN'); if(n) n.focus(); return; }
  const i=st.items.findIndex(y=>y.id===x.id), was=i>=0 ? st.items[i] : null;
  if(i>=0) st.items[i]=x; else st.items.unshift(x);
  st.items=st.items.slice(0, MAX_IT);
  if(!save()) return;
  // 外した・撮りなおした 前の 写真は 消す
  if(was) ['pic','tag'].forEach(k=>{ if(was[k] && was[k]!==x[k]) dropPic(was[k]); });
  ed=null; popClose(); st.tab='memo'; render(); toastS('📒 残しました');
}
async function del(id){
  const it=st.items.find(x=>x.id===id); if(!it) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+it.n+'」の メモを 消しますか？','消す','やめる'))) return;
  st.items=st.items.filter(x=>x.id!==id); save(); dropPic(it.pic); dropPic(it.tag);
  ed=null; popClose(); render();
}

/* ───────── 操作 ───────── */
function setTab(k){ if(!TABS.some(t=>t[0]===k)) return; st.tab=k; query=''; const qi=$('snQ'); if(qi) qi.value=''; save(); const b=$('snBody'); if(b) b.scrollTop=0; render(); }
function sel(code){ if(!SYM[code]) return; const c=catOf(code), had=st.sel.includes(code); st.sel=st.sel.filter(x=>catOf(x)!==c); if(!had) st.sel.push(code); st.sel=CATS.map(([k])=>st.sel.find(x=>catOf(x)===k)).filter(Boolean); save(); render(); }
async function tagPick(input){
  const f=input && input.files && input.files[0]; if(input) input.value=''; if(!f) return;
  const id=await addPic(f); if(!id) return;
  const old=st.selTag; st.selTag=id; save(); render();
  if(old && !st.items.some(x=>x.tag===old || x.pic===old)) picDel(old);
}
function tagDel(){ const old=st.selTag; st.selTag=''; save(); render(); if(old && !st.items.some(x=>x.tag===old || x.pic===old)) picDel(old); }
async function clear(){
  if(!st.sel.length && !st.selTag) return;
  const old=st.selTag; st.sel=[]; st.selTag=''; save(); render();
  if(old && !st.items.some(x=>x.tag===old || x.pic===old)) picDel(old);
}
function memoFromSel(){
  if(!st.sel.length) return;
  ed={isNew:true, id:rid(), n:'', who:st.who||'', sym:st.sel.slice(), memo:'', pic:'', tag:st.selTag||'', at:Date.now()};
  edRender(); setTimeout(()=>{ const n=$('snEdN'); if(n) n.focus(); }, 60);
}
function speak(t){
  if(!t) return;
  if(window.HyoVoice && HyoVoice.available) HyoVoice.speak(t, {lang:'ja'});
  else if(window.speechSynthesis && window.SpeechSynthesisUtterance){ const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; speechSynthesis.cancel(); speechSynthesis.speak(u); }
  else toastS('この 端末では 読み上げが 使えません');
}
const sayText=sym=>{ const s=summary(sym); return s.lines.map(l=>l.n+'は、'+l.s.n+'。').join('')+s.tips.join(''); };
function say(){ speak(sayText(st.sel)); }
function sayCode(code){ const s=SYM[code]; if(s) speak(s.n+'。'+s.m+'。'+s.tip); }
function copy(){
  const t=summaryText(st.sel); if(!t) return;
  if(typeof toolCopyText==='function') toolCopyText('🧺 洗濯表示\n'+t, '📋 コピーしました');
}
function setWho(w){ st.who=oneLine(w, 16); save(); render(); }

/* ───────── 窓 ───────── */
const CSS=`
#sentakuOverlay .sn-modal{ display:flex; flex-direction:column; }
.sn-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.sn-wrap{ max-width:820px; margin:0 auto; padding-bottom:70px; }
.sn-qbar{ display:flex; align-items:center; gap:6px; margin:0 0 10px; padding:0 4px 0 12px; border-radius:24px; border:2px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); }
.sn-qbar:focus-within{ border-color:var(--acc); } .sn-qbar > span{ font-size:17px; }
.sn-qbar input{ flex:1; min-width:0; height:44px; border:0; outline:none; background:transparent; color:var(--text,#222); font-size:16px; font-family:inherit; }
.sn-qbar input::-webkit-search-cancel-button{ display:none; }
.sn-qx{ width:38px; height:38px; flex:none; border-radius:19px; border:0; background:rgba(120,132,156,.15); color:var(--text,#222); font-size:16px; cursor:pointer; }
.sn-tabs{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 10px; }
.sn-tabs button{ flex:1 1 auto; min-height:44px; padding:0 12px; border-radius:22px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.sn-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .sn-tabs small{ font-size:12px; opacity:.85; }
.sn-lead{ margin:2px 0 10px; font-size:14px; line-height:1.6; } .sn-note{ margin:10px 0; font-size:13px; line-height:1.7; color:var(--text-light,#666); }
.sn-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.sn-b.sm{ min-height:38px; font-size:13.5px; padding:0 10px; } .sn-b:disabled{ opacity:.45; cursor:default; }
.sn-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .sn-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.sn-acts{ display:flex; gap:6px; flex-wrap:wrap; margin:12px 0 0; } .sn-acts.top{ margin:0 0 10px; } .sn-acts.end{ justify-content:flex-end; margin-top:14px; }
.sn-tagbox{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:0 0 10px; }
.sn-tagbox img{ max-width:100%; max-height:200px; border-radius:10px; border:1px solid rgba(120,132,156,.35); cursor:zoom-in; display:block; }
.sn-row{ margin:0 0 10px; } .sn-rh{ display:flex; align-items:baseline; gap:6px; font-size:14px; font-weight:bold; margin:0 0 4px; } .sn-rh b{ margin-left:auto; font-size:13px; color:var(--acc-text,#1b5e20); } .sn-rh em{ margin-left:auto; font-style:normal; font-size:12.5px; color:var(--text-light,#888); font-weight:normal; }
.sn-syms{ display:flex; gap:6px; overflow-x:auto; padding:2px 2px 6px; -webkit-overflow-scrolling:touch; }
.sn-sym{ flex:none; width:84px; display:flex; flex-direction:column; align-items:center; gap:2px; padding:6px 4px; border-radius:12px; border:1.5px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; }
.sn-sym small{ font-size:11px; line-height:1.25; text-align:center; } .sn-sym.on{ border-color:var(--acc); background:rgba(46,157,74,.12); box-shadow:0 0 0 2px var(--acc) inset; }
.sn-svg{ display:block; color:var(--text,#222); flex:none; }
.sn-sum{ margin:12px 0 0; padding:12px; border-radius:14px; border:2px solid var(--acc); background:rgba(46,157,74,.06); } .sn-sum h4{ margin:0 0 8px; font-size:16px; }
.sn-sl{ display:flex; gap:10px; align-items:flex-start; padding:6px 0; border-top:1px solid rgba(120,132,156,.2); } .sn-sl:first-of-type{ border-top:0; }
.sn-sl div{ display:flex; flex-direction:column; gap:2px; font-size:14px; } .sn-sl small{ font-size:12.5px; color:var(--text-light,#555); line-height:1.5; }
.sn-tips{ margin:8px 0 0; padding:8px 10px; border-radius:10px; background:rgba(255,193,7,.16); font-size:13.5px; line-height:1.7; }
.sn-legend{ margin:0 0 8px; font-size:12.5px; color:var(--text-light,#555); }
.sn-gl{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:6px; }
.sn-gb{ display:flex; align-items:center; gap:8px; min-height:52px; padding:6px 10px; border-radius:12px; border:1px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.sn-gb .i{ font-size:24px; flex:none; } .sn-gb .n{ flex:1; min-width:0; font-size:14px; font-weight:bold; line-height:1.35; overflow-wrap:anywhere; } .sn-gb .h{ flex:none; font-size:13px; }
.sn-card{ margin:0 0 12px; padding:12px; border-radius:14px; border:1px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); } .sn-card h4{ margin:0 0 6px; font-size:17px; }
.sn-home{ margin:0 0 8px; font-size:14px; } .sn-home b{ font-size:14.5px; }
.sn-gd{ margin:0; } .sn-gd dt{ margin:8px 0 2px; font-size:13px; font-weight:bold; color:var(--text-light,#555); } .sn-gd dd{ margin:0; font-size:14.5px; line-height:1.7; }
.sn-pts{ margin:4px 0 0; padding-left:1.3em; } .sn-pts li{ margin:0 0 6px; font-size:14.5px; line-height:1.7; }
.sn-gsym{ margin:10px 0 0; } .sn-gsym small{ display:block; margin:0 0 4px; font-size:12px; color:var(--text-light,#666); }
.sn-gsym > div{ display:flex; flex-wrap:wrap; gap:4px; } .sn-gsym button{ display:flex; flex-direction:column; align-items:center; gap:2px; width:74px; padding:4px 2px; border-radius:10px; border:1px solid rgba(120,132,156,.3); background:transparent; color:var(--text,#222); font-size:10.5px; line-height:1.25; cursor:pointer; }
.sn-cacts{ display:flex; gap:6px; flex-wrap:wrap; margin:10px 0 0; }
.sn-rh2{ margin:6px 0 8px; font-size:15.5px; } .sn-rh2 small{ font-size:12px; color:var(--text-light,#666); } .sn-more{ margin:4px 0 6px; font-size:13px; color:var(--text-light,#666); }
.sn-srow{ display:flex; flex-direction:column; gap:6px; margin:0 0 12px; }
.sn-sr{ display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:12px; border:1px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.sn-sr span{ display:flex; flex-direction:column; gap:2px; min-width:0; } .sn-sr b{ font-size:14.5px; } .sn-sr small{ font-size:12.5px; color:var(--text-light,#555); line-height:1.45; }
.sn-ch{ margin:14px 0 6px; font-size:15px; } .sn-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:6px; }
.sn-cell{ display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 4px; border-radius:12px; border:1px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; font-size:12px; line-height:1.3; text-align:center; }
.sn-chips{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 10px; } .sn-chips button{ min-height:38px; padding:0 14px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; } .sn-chips button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.sn-items{ display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:8px; }
.sn-item{ display:flex; gap:10px; align-items:center; padding:8px; border-radius:14px; border:1px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.sn-item img, .sn-noimg{ width:64px; height:64px; flex:none; border-radius:10px; object-fit:cover; background:rgba(120,132,156,.12); display:flex; align-items:center; justify-content:center; font-size:30px; }
.sn-it{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; } .sn-it b{ font-size:15.5px; overflow-wrap:anywhere; } .sn-it small{ font-size:12.5px; color:var(--text-light,#666); } .sn-it .mm{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sn-mini{ display:flex; gap:3px; flex-wrap:wrap; }
.sn-old{ border:1px solid rgba(120,132,156,.3); border-radius:12px; overflow:hidden; }
.sn-or{ display:flex; align-items:center; gap:10px; padding:8px 10px; border-bottom:1px solid rgba(120,132,156,.2); } .sn-or:last-child{ border-bottom:0; }
.sn-or .o{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; font-size:14px; } .sn-or .o small{ font-size:12.5px; color:var(--text-light,#666); line-height:1.5; }
.sn-or .n{ flex:none; width:96px; display:flex; flex-direction:column; align-items:center; gap:2px; font-size:11px; text-align:center; }
.sn-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.sn-pop{ width:100%; max-width:680px; max-height:90%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.sn-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .sn-ph > span{ font-size:26px; line-height:1; } .sn-ph b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.sn-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.sn-info{ display:flex; gap:14px; align-items:flex-start; } .sn-info p{ margin:4px 0 8px; font-size:15px; line-height:1.6; } .sn-info small{ font-size:12.5px; color:var(--text-light,#666); }
.sn-big{ display:block; max-width:100%; margin:0 auto; border-radius:10px; }
.sn-pop h5{ margin:12px 0 6px; font-size:14.5px; }
.sn-f{ display:flex; align-items:center; gap:8px; margin:8px 0; } .sn-f.top{ align-items:flex-start; } .sn-f > span{ min-width:3.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.sn-f input, .sn-f textarea{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.sn-f textarea{ padding:8px 10px; resize:vertical; }
.sn-phs{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:8px 0; }
.sn-ph2{ display:flex; flex-direction:column; gap:6px; align-items:flex-start; padding:8px; border-radius:12px; border:1px dashed rgba(120,132,156,.5); } .sn-ph2 > span{ font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.sn-ph2 img{ max-width:100%; max-height:140px; border-radius:8px; cursor:zoom-in; }
body.dark .sn-sym.on{ background:rgba(102,187,106,.18); } body.dark .sn-rh b{ color:#a5d6a7; } body.dark .sn-tips{ background:rgba(255,193,7,.12); }
@media (max-width:520px){ .sn-items{ grid-template-columns:1fr; } .sn-info{ flex-direction:column; align-items:center; } }
`;
function ensureDom(){
  if($('sentakuOverlay')) return;
  const s=document.createElement('style'); s.id='snStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="sentakuOverlay">
  <div class="modal vol-modal sn-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🧺 洗濯表示</span><button class="modal-close" onclick="closeSentaku()" aria-label="閉じる">✕</button></div>
    <div class="sn-body" id="snBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('sentakuOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の 電卓キーに 届かないように
  window.addEventListener('keydown', e=>{   // Esc は 上に 重ねた 小さな窓から 閉じる
    if(e.key!=='Escape' || !pop || !isDlgOpen('sentakuOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); ed=null; }
function openSentaku(){ ensureDom(); load(); query=''; const qi=$('snQ'); if(qi) qi.value=''; openDlg('sentakuOverlay', cleanup); render(); }
function closeSentaku(){ if(!$('sentakuOverlay') || !isDlgOpen('sentakuOverlay')) return; closeDlg('sentakuOverlay', cleanup); }

window.SENTAKU={ tab:setTab, sel, info, zoom, close:()=>popClose(), tagPick, tagDel, clear, memoFromSel, say, sayCode, copy, who:setWho,
  edit, edSet, edSym, edPic, edPicDel, edSave, del, q:setQ, guide, gk:setGk, gsay, gcopy,
  // ためす とき 用
  search:q=>{ const r=search(q); return {g:r.g.map(e=>e.id), s:r.s, m:r.m.map(x=>x.n)}; }, guideIds:k=>GUIDE.filter(e=>!k || e.k===k).map(e=>e.id), kana, gPlain:id=>{ const e=gOf(id); return e ? gPlain(e) : ''; },
  state:()=>JSON.parse(JSON.stringify(st)), codes:()=>L.map(x=>x[0]), svg, summary:s=>{ const r=summary(s); return {lines:r.lines.map(l=>l.n+':'+l.s.code), tips:r.tips}; }, summaryText, sayText,
  cats:()=>CATS.map(c=>c[0]+':'+byCat(c[0]).length), picIds:()=>new Promise(r=>{ db().then(d=>{ const q=d.transaction('pics').objectStore('pics').getAllKeys(); q.onsuccess=()=>r(q.result||[]); q.onerror=()=>r([]); }).catch(()=>r([])); }),
  addPicData:async(data)=>{ if(!okData(data)) return ''; const id='p'+rid()+rid().slice(0,4); await picPut(id, data); return id; }, edState:()=>ed ? JSON.parse(JSON.stringify(ed)) : null };
Object.assign(window, { openSentaku, closeSentaku });
})();
