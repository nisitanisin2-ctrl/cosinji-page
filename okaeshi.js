/* 🎁 いただきもの・お返し帳（v564。表電卓の道具。apps/okaeshi/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   香典・お祝い・お見舞い・お中元などを「🎁 いただいた／📤 さしあげた」で残す。
   ・お返し：まだ／済み／しない。種類ごとの目安（半返し・3分の1〜半分）と 時期・表書き・水引を出し、時期が近い・過ぎたものを知らせる。
   ・📒 記録：行事ごと（葬儀・結婚式 など）・日付順・種類ごと。「入れて 次の人」で 香典帳のように 続けて入れられる。
   ・👤 人ごと：その人と いつ 何を いただいた／さしあげたか（前の額を見て 決められる）。📇連絡帳の人とつなぐと 住所・電話も出る。
   ・🕯️ 法事：故人と命日から、初七日〜五十回忌の日（その前の土日も）と 新盆の年。
   ・📋 コピー・📤 共有・▦ 表に入れる（お返しの準備の表も）・🖨 印刷。
   ・中身は excalc_okaeshi（この端末の中だけ）。 */
(function(){
const OK_KEY='excalc_okaeshi', MAX_IT=3000, MAX_HJ=40, MAX_AMT=1e9;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,n);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const sid=(v,p)=>(typeof v==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(v))?v:uid(p);   // onclick に入れるので 英数字だけ
const num=n=>Math.round(n).toLocaleString('ja-JP');
const yen=n=>num(n)+'円';
const WD='日月火水木金土';

/* ───────── 日付 ───────── */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function okDate(s){
  const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s||'')); if(!m) return null;
  const y=+m[1], mo=+m[2]-1, d=+m[3], t=new Date(y,mo,d);
  return (y>=1900 && y<=2200 && t.getMonth()===mo && t.getDate()===d) ? t : null;
}
function today(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
const addDays=(d,n)=>new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
function addYears(d,n){ const t=new Date(d.getFullYear()+n, d.getMonth(), d.getDate()); if(t.getMonth()!==d.getMonth()) t.setDate(0); return t; }   // 2/29 → 2/28
const daysTo=d=>Math.round((d-today())/86400000);
const md=d=>(d.getMonth()+1)+'/'+d.getDate();
const mdw=d=>md(d)+'（'+WD[d.getDay()]+'）';
const ymdS=d=>d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate();
const ymdJ=d=>d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）';
const dShow=s=>{ const d=okDate(s); return d?ymdS(d):''; };
function wareki(d){
  const y=d.getFullYear(), t=y*10000+(d.getMonth()+1)*100+d.getDate();
  if(t>=20190501) return '令和'+(y===2019?'元':y-2018)+'年';
  if(t>=19890108) return '平成'+(y===1989?'元':y-1988)+'年';
  if(t>=19261225) return '昭和'+(y===1926?'元':y-1925)+'年';
  if(t>=19120730) return '大正'+(y===1912?'元':y-1911)+'年';
  return '明治'+(y-1867)+'年';
}

/* ───────── 種類とお返しの目安（📜マナー帳と同じ中身） ─────────
   ret：お返しの割合（なし＝ふつう お返しはいらない）。due：いただいた日から お返しの時期までの日数のめやす（香典は 四十九日＋1か月） */
const KINDS=[
  {k:'koden', ic:'🕯️', n:'香典・お供え', s:'香典・お供え', ret:[1/3,1/2], rt:'3分の1〜半分', due:79,
    when:'四十九日（忌明け）のあと 1か月以内', omote:'志（関西などは「満中陰志」）', mizu:'黒白か黄白の結び切り',
    tip:'お茶・のり・タオル・洗剤など 使ってなくなる物が よいとされます。葬儀の日に「当日返し」をしたときは、高額の方にだけ 忌明けに あらためて品を送ります。会社・団体からの香典には、お返しは いらないことが多いです。',
    mn:'fun-kaeshi', oOmote:'御霊前・御香典（四十九日のあとと 浄土真宗は 御仏前）', oMizu:'黒白か双銀の結び切り・薄墨で書く', oMn:'fun-koden', ev:'例：父 〇〇の葬儀'},
  {k:'kekkon', ic:'💒', n:'結婚祝い', s:'結婚祝い', ret:[1/2,1/2], rt:'半返し', due:30,
    when:'式から 1か月以内（式がないときは いただいて 1か月以内）', omote:'内祝（ふたりの名前か 新しい姓）', mizu:'紅白の結び切り',
    tip:'披露宴に出てくださった方のご祝儀は、引き出物が お返しなので いりません。',
    mn:'gift-uchi', oOmote:'御結婚御祝・寿', oMizu:'紅白か金銀の結び切り', oMn:'gift-money', ev:'例：長女の結婚'},
  {k:'shussan', ic:'👶', n:'出産祝い', s:'出産祝い', ret:[1/3,1/2], rt:'3分の1〜半分', due:30,
    when:'生まれて 1か月ごろ（お宮参りのころ）', omote:'内祝（赤ちゃんの名前で）', mizu:'紅白の蝶結び',
    tip:'のしに 赤ちゃんの名前を書いて、名前の おひろめにします。',
    mn:'gift-uchi', oOmote:'御出産御祝・御祝', oMizu:'紅白の蝶結び', oMn:'gift-birth', ev:'例：長男の誕生'},
  {k:'mimai', ic:'💐', n:'お見舞い', s:'お見舞い', ret:[1/3,1/2], rt:'3分の1〜半分（快気祝い）', due:null,
    when:'治って（退院して）10日〜1か月', omote:'快気祝（快気内祝）', mizu:'紅白の結び切り',
    tip:'お菓子・洗剤・タオルなど あとに残らない物を。亡くなったときは 香典返しと 一緒にします。',
    mn:'gift-uchi', oOmote:'御見舞（のしは付けない）', oMizu:'紅白の結び切りか 白い封筒', oMn:'gift-mimai', ev:'例：入院'},
  {k:'shinchiku', ic:'🏠', n:'新築・引っ越し祝い', s:'新築祝い', ret:[1/3,1/2], rt:'3分の1〜半分', due:30,
    when:'いただいて 1か月以内（新しい家に招いて もてなしたときは それがお返し）', omote:'内祝（新築内祝）', mizu:'紅白の蝶結び',
    tip:'', mn:'gift-uchi', oOmote:'御新築御祝・御新居御祝', oMizu:'紅白の蝶結び', oMn:'gift-house', ev:'例：新築'},
  {k:'kodomo', ic:'🎒', n:'子どもへのお祝い（入学など）', s:'子どもの入学など', ret:null, rt:'', due:null,
    when:'', omote:'', mizu:'',
    tip:'ふつう お返しは いりません。子ども本人から お礼の電話か手紙を。気になるときは「内祝」として 3分の1ほどの品を返す家も あります。',
    mn:'gift-school', oOmote:'御入学御祝・御就職御祝 など', oMizu:'紅白の蝶結び', oMn:'gift-school', ev:'例：次男の小学校入学'},
  {k:'iwai', ic:'🎉', n:'長寿・ほかのお祝い', s:'長寿・お祝い', ret:[1/3,1/2], rt:'3分の1〜半分', due:30,
    when:'いただいて 1か月以内', omote:'内祝', mizu:'紅白の蝶結び',
    tip:'祝いの席に招いて もてなしたときは、引き出物が お返しになります。',
    mn:'gift-uchi', oOmote:'御祝・寿（長寿は「祝 還暦」など）', oMizu:'紅白の蝶結び', oMn:'gift-kotobuki', ev:'例：母の米寿'},
  {k:'kisetsu', ic:'🎐', n:'お中元・お歳暮', s:'お中元・お歳暮', ret:null, rt:'', due:null,
    when:'', omote:'', mizu:'',
    tip:'お返しは いりません。届いたら すぐ（その日か 次の日）お礼の電話か お礼状を。',
    mn:'gift-nokaeshi', oOmote:'御中元・御歳暮（時期をすぎたら 暑中御見舞・御年賀 など）', oMizu:'紅白の蝶結び', oMn:'season-chugen', ev:'例：2026年 お歳暮'},
  {k:'hoka', ic:'🎀', n:'お礼・おみやげ・ほか', s:'お礼・ほか', ret:null, rt:'', due:null,
    when:'', omote:'', mizu:'',
    tip:'お返しは 決まっていません。お礼は 早めに。',
    mn:'gift-nokaeshi', oOmote:'御礼・御祝 など', oMizu:'紅白の蝶結び', oMn:'gift-orei', ev:''},
];
const kindOf=k=>KINDS.find(x=>x.k===k)||KINDS[KINDS.length-1];
const RET_N={mada:'まだ', sumi:'済み', nashi:'しない'};
const QAMT=[[3000,'3千'],[5000,'5千'],[10000,'1万'],[20000,'2万'],[30000,'3万'],[50000,'5万'],[100000,'10万']];
/* 法要（📜マナー帳の「命日から法要の日」と同じ数え方。亡くなった日を1日目とする） */
const HOYO=[['初七日',0,6],['四十九日',0,48],['百か日',0,99],['一周忌',1],['三回忌',2],['七回忌',6],['十三回忌',12],['十七回忌',16],['二十三回忌',22],['二十七回忌',26],['三十三回忌',32],['五十回忌',49]];
const hoyoList=d=>HOYO.map(h=>({n:h[0], d:h.length===3?addDays(d,h[2]):addYears(d,h[1])}));
/* 法要は その日か 前の土日にすることが多い。その日より前の（その日をふくむ）土曜と日曜 */
const weekend=d=>[addDays(d,-((d.getDay()+1)%7)), addDays(d,-d.getDay())].sort((a,b)=>a-b);
/* 新盆：四十九日がすんでから はじめて来る お盆（8月13日・7月盆は 7月13日から） */
function niibon(d){ const k=addDays(d,48), y=d.getFullYear(); return {aug:k<=new Date(y,7,13)?y:y+1, jul:k<=new Date(y,6,13)?y:y+1}; }

/* ───────── 名前・さがす ───────── */
const kata2hira=s=>String(s).replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const normQ=s=>kata2hira(String(s==null?'':s).normalize('NFKC').toLowerCase()).replace(/[\s　]+/g,'');
const normName=s=>normQ(s).replace(/(様|さま|さん|殿|どの)$/,'');

/* ───────── 📇 連絡帳（excalc_renraku を読むだけ） ───────── */
let rkMemo={s:undefined, items:[], map:new Map()};   // 中身が変わらないうちは 読み直さない（人が多いと重いので）
function rkItems(){
  let s=null; try{ s=localStorage.getItem('excalc_renraku'); }catch(_){}
  if(s===rkMemo.s) return rkMemo.items;
  let items=[];
  try{ const o=JSON.parse(s||'null'); items=(o&&Array.isArray(o.items))?o.items.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'&&x.id):[]; }catch(_){}
  rkMemo={s, items, map:new Map(items.map(x=>[x.id,x]))};
  return items;
}
const rkById=id=>{ if(!id) return null; rkItems(); return rkMemo.map.get(id)||null; };
function rkNm(x){
  if(x.fn) return line(x.fn,40);
  if(x.fam||x.giv) return line((/^[A-Za-z]/.test(String(x.fam||x.giv).trim())?[x.giv,x.fam]:[x.fam,x.giv]).filter(Boolean).join(' '),40);
  return line(x.nick||x.org||'',40);
}
const rkKana=x=>line([x.famK,x.givK].filter(Boolean).join(' '),60);
function rkAdr(x){
  const a=(Array.isArray(x.adrs)?x.adrs:[]).find(a=>a&&typeof a==='object'&&[a.region,a.city,a.street,a.ext].some(Boolean));
  if(!a) return '';
  return line((a.zip?'〒'+a.zip+' ':'')+[a.region,a.city,a.street,a.ext].filter(Boolean).join(' '),120);
}
function rkTel(x){ const t=(Array.isArray(x.tels)?x.tels:[]).find(t=>t&&t.v&&t.t!=='fax'); return t?line(t.v,30):''; }

/* ───────── 読み書き ───────── */
let st=null;          // {v, tab, filt, grp, psort, lk:{in,out}, items:[…], hoji:[…]}
let q='', pq='';      // さがす言葉（記録・人ごと。残さない）
let pops=[];          // 開いている小さな窓（上が最後） {el, kind, rel, pk}
let fm=null;          // 入れる・直す窓の中身
let grpOpen={};       // 行事の見出しを 開いた／閉じた
let view={g:[]}, perCache=[], rkCache=[], outCache=null;

const amtOk=v=>{ const a=Math.round(+v); return (isFinite(a)&&a>0&&a<=MAX_AMT)?a:0; };
function defRet(dir,kind){ return (dir==='in' && kindOf(kind).ret)?'mada':'nashi'; }
function cleanRet(r,dir,kind){
  const s={st:defRet(dir,kind), date:'', what:'', amt:0};
  if(dir!=='in') return s;   // さしあげた分には お返しを付けない
  if(r&&typeof r==='object'){
    if(['mada','sumi','nashi'].includes(r.st)) s.st=r.st;
    if(s.st==='sumi'){ s.date=okDate(r.date)?r.date:''; s.what=line(r.what,60); s.amt=amtOk(r.amt); }
  }
  return s;
}
function clean(o){
  const s={v:1, tab:'list', filt:'all', grp:'ev', psort:'new', lk:{in:'koden', out:'koden'}, items:[], hoji:[]};
  if(!o||typeof o!=='object') return s;
  if(['list','person','hoji'].includes(o.tab)) s.tab=o.tab;
  if(['all','mada','in','out'].includes(o.filt)) s.filt=o.filt;
  if(['ev','date','kind'].includes(o.grp)) s.grp=o.grp;
  if(['new','name'].includes(o.psort)) s.psort=o.psort;
  if(o.lk&&typeof o.lk==='object') ['in','out'].forEach(d=>{ if(KINDS.some(k=>k.k===o.lk[d])) s.lk[d]=o.lk[d]; });
  const ids=new Set();
  (Array.isArray(o.items)?o.items:[]).slice(0,MAX_IT).forEach(x=>{
    if(!x||typeof x!=='object') return;
    const name=line(x.name,40); if(!name) return;
    const dir=x.dir==='out'?'out':'in', kind=KINDS.some(k=>k.k===x.kind)?x.kind:'hoka';
    let id=sid(x.id,'i'); if(ids.has(id)) id=uid('i'); ids.add(id);
    s.items.push({id, dir, kind, ev:line(x.ev,40), date:okDate(x.date)?x.date:'', name, rk:(typeof x.rk==='string'&&x.rk.length<=80)?x.rk:'', adr:line(x.adr,120),
      amt:amtOk(x.amt), what:line(x.what,60), memo:line(x.memo,200), ret:cleanRet(x.ret,dir,kind), t:(isFinite(+x.t)&&+x.t>0)?+x.t:0});
  });
  const hids=new Set();
  (Array.isArray(o.hoji)?o.hoji:[]).slice(0,MAX_HJ).forEach(x=>{
    if(!x||typeof x!=='object') return;
    const name=line(x.name,30); if(!name||!okDate(x.date)) return;
    let id=sid(x.id,'h'); if(hids.has(id)) id=uid('h'); hids.add(id);
    s.hoji.push({id, name, date:x.date, memo:line(x.memo,100)});
  });
  return s;
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(OK_KEY)||'null'); }catch(_){}
  st=clean(o);
}
function save(){ try{ localStorage.setItem(OK_KEY, JSON.stringify(st)); return true; }catch(_){ toast('保存できませんでした（端末の空きが足りないかもしれません）'); return false; } }

/* ───────── お返しの計算 ───────── */
const isMada=x=>x.dir==='in' && x.ret.st==='mada';
function dueOf(x){ if(!isMada(x)) return null; const K=kindOf(x.kind), d=okDate(x.date); return (K.due!=null && d)?addDays(d,K.due):null; }
function rng(K,amt){ if(!K.ret||!(amt>0)) return null; const r=v=>Math.max(100, Math.round(v/100)*100); return [r(amt*K.ret[0]), r(amt*K.ret[1])]; }
const rngText=a=>a?(a[0]===a[1]?yen(a[0]):num(a[0])+'〜'+yen(a[1])):'';
function lateness(x){ const d=dueOf(x); if(!d) return null; return daysTo(d); }
function pill(x){
  if(x.dir==='out') return '<span class="ok-pl out">📤 さしあげた</span>';
  if(x.ret.st==='sumi') return '<span class="ok-pl sumi">✓ お返し 済み</span>';
  if(x.ret.st==='nashi') return '<span class="ok-pl nashi">お返し しない</span>';
  const n=lateness(x);
  if(n!=null && n<0) return '<span class="ok-pl late">⚠ お返し 時期すぎ</span>';
  if(n!=null && n<=14) return `<span class="ok-pl soon">お返し あと${n}日</span>`;
  return '<span class="ok-pl mada">お返し まだ</span>';
}
function retText(x){
  if(x.dir==='out') return '';
  if(x.ret.st!=='sumi') return 'お返し '+RET_N[x.ret.st];
  const d=[dShow(x.ret.date), x.ret.what, x.ret.amt?yen(x.ret.amt):''].filter(Boolean).join(' ');
  return 'お返し 済み'+(d?'（'+d+'）':'');
}
function adrOf(x){ if(x.adr) return x.adr; const c=rkById(x.rk); return c?rkAdr(c):''; }

/* ───────── 画面 ───────── */
const TABS=[['list','📒 記録'],['person','👤 人ごと'],['hoji','🕯️ 法事']];
function render(){
  const t=$('okTabs'); if(!t) return;
  t.innerHTML=TABS.map(([k,l])=>`<button role="tab" aria-selected="${st.tab===k}" class="${st.tab===k?'on':''}" onclick="OKA.tab('${k}')">${l}</button>`).join('');
  if(st.tab==='person') renderPerson(); else if(st.tab==='hoji') renderHoji(); else renderList();
}
function refresh(){
  if(!$('okaeshiOverlay')) return;
  renderLists(); render();
  pops.forEach(p=>{ if(p.kind==='person') personRender(p); });
}
function renderLists(){
  const ev=[], nm=[], se=new Set(), sn=new Set();
  st.items.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.t-a.t).forEach(x=>{
    if(x.ev && !se.has(x.ev) && ev.length<40){ se.add(x.ev); ev.push(x.ev); }
    if(!sn.has(x.name) && nm.length<400){ sn.add(x.name); nm.push(x.name); }
  });
  const a=$('okEvL'), b=$('okNameL');
  if(a) a.innerHTML=ev.map(v=>`<option value="${esc(v)}"></option>`).join('');
  if(b) b.innerHTML=nm.map(v=>`<option value="${esc(v)}"></option>`).join('');
}

/* 📒 記録 */
function renderList(){
  const b=$('okMain');
  let h=`<div class="ok-add"><button class="ok-big" onclick="OKA.add('in')">🎁 いただいた</button><button class="ok-big out" onclick="OKA.add('out')">📤 さしあげた</button></div>`;
  if(!st.items.length){
    b.innerHTML=h+`<div class="ok-intro"><b>はじめに</b>
      <p>香典・お祝い・お見舞い・お中元などを いただいたら「🎁 いただいた」で残します。<b>お返しの目安</b>（半返しなど）と<b>時期</b>・表書きが出て、済んだら「✓ 済み」に。</p>
      <p>「✓ 入れて 次の人」で、香典帳のように 続けて入れられます。さしあげた物も残しておくと、次に何かあったとき「前に いくら いただいたか／さしあげたか」が すぐ分かります。</p>
      <p>「🕯️ 法事」では 命日から 一周忌・三回忌… の年と日が分かります。</p></div>`;
    return;
  }
  const mada=st.items.filter(isMada), late=mada.filter(x=>{ const n=lateness(x); return n!=null&&n<0; }).length, soon=mada.filter(x=>{ const n=lateness(x); return n!=null&&n>=0&&n<=14; }).length;
  if(late||soon) h+=`<button class="ok-alert" onclick="OKA.filt('mada')">⚠ お返しの時期が ${late?`過ぎているもの ${late}件`:''}${late&&soon?'・':''}${soon?`近いもの ${soon}件`:''}</button>`;
  const cnt={all:st.items.length, mada:mada.length, in:st.items.filter(x=>x.dir==='in').length, out:st.items.filter(x=>x.dir==='out').length};
  h+=`<div class="ok-filt" role="group" aria-label="しぼる">${[['all','すべて'],['mada','お返しまだ'],['in','いただいた'],['out','さしあげた']].map(([k,l])=>`<button class="ok-chip${st.filt===k?' on':''}" aria-pressed="${st.filt===k}" onclick="OKA.filt('${k}')">${l}<small>${cnt[k]}件</small></button>`).join('')}</div>
    <div class="ok-tools"><input type="search" id="okQ" placeholder="🔎 名前・行事・品物で さがす" value="${esc(q)}" oninput="OKA.find(this.value)" autocomplete="off" aria-label="さがす">
      <select id="okGrp" aria-label="並べ方" onchange="OKA.grp(this.value)">${[['ev','行事ごと'],['date','月ごと'],['kind','種類ごと']].map(([k,l])=>`<option value="${k}"${st.grp===k?' selected':''}>${l}</option>`).join('')}</select></div>
    <div id="okList"></div>`;
  b.innerHTML=h;
  renderItems();
}
function shown(){
  const Q=normQ(q);
  return st.items.filter(x=>{
    if(st.filt==='mada' && !isMada(x)) return false;
    if((st.filt==='in'||st.filt==='out') && x.dir!==st.filt) return false;
    if(Q && !normQ([x.name,x.ev,x.what,x.memo,x.adr,kindOf(x.kind).n,x.ret.what].join(' ')).includes(Q)) return false;
    return true;
  });
}
function groups(list){
  const by=st.grp, G=new Map();
  const key=x=>by==='kind'?x.kind:by==='date'?x.date.slice(0,7):x.ev;
  list.forEach(x=>{ const k=key(x); if(!G.has(k)) G.set(k,[]); G.get(k).push(x); });
  const arr=[...G.entries()].map(([k,its])=>({k, its, last:its.reduce((m,x)=>x.date>m?x.date:m,''), t:its.reduce((m,x)=>Math.max(m,x.t||0),0)}));
  if(by==='kind') arr.sort((a,b)=>KINDS.findIndex(K=>K.k===a.k)-KINDS.findIndex(K=>K.k===b.k));
  else if(by==='date') arr.sort((a,b)=>b.k.localeCompare(a.k));   // 日付のないものは いちばん下
  else arr.sort((a,b)=>(a.k==='')-(b.k==='') || b.last.localeCompare(a.last) || b.t-a.t);
  arr.forEach(g=>{
    if(by==='ev') g.its.sort((a,b)=>a.date.localeCompare(b.date)||(a.t-b.t));   // 受付の順（香典帳）
    else g.its.sort((a,b)=>b.date.localeCompare(a.date)||(b.t-a.t));
  });
  return arr;
}
function gTitle(g){
  if(st.grp==='kind'){ const K=kindOf(g.k); return K.ic+' '+K.n; }
  if(st.grp==='date') return g.k?(+g.k.slice(0,4))+'年'+(+g.k.slice(5,7))+'月':'（日付なし）';
  return g.k||'（行事を入れていない分）';
}
function gSum(its){
  const I=its.filter(x=>x.dir==='in'), O=its.filter(x=>x.dir==='out');
  const mada=I.filter(x=>x.ret.st==='mada'), sumi=I.filter(x=>x.ret.st==='sumi');
  let lo=0, hi=0; mada.forEach(x=>{ const r=rng(kindOf(x.kind),x.amt); if(r){ lo+=r[0]; hi+=r[1]; } });
  return {I, O, ia:I.reduce((s,x)=>s+x.amt,0), oa:O.reduce((s,x)=>s+x.amt,0), mada, sumi, lo, hi,
    late:mada.filter(x=>{ const n=lateness(x); return n!=null&&n<0; }).length};
}
function isOpenG(g,s){
  const k=st.grp+':'+g.k;
  if(k in grpOpen) return grpOpen[k];
  if(q.trim() || view.g.length<=3) return true;
  const d=okDate(g.last);
  return s.mada.length>0 || (d && daysTo(d)>-120);
}
function dateRange(its){
  const ds=its.map(x=>x.date).filter(Boolean).sort(); if(!ds.length) return '';
  const a=okDate(ds[0]), b=okDate(ds[ds.length-1]);
  return ds[0]===ds[ds.length-1]?ymdS(a):ymdS(a)+'〜'+(a.getFullYear()===b.getFullYear()?md(b):ymdS(b));
}
function itemRow(x,no){
  const K=kindOf(x.kind), d=okDate(x.date);
  const sub=[d?(st.grp==='ev'?md(d):ymdS(d)):'', st.grp==='ev'?'':x.ev, st.grp==='date'?K.n:'', x.memo].filter(Boolean).join('・');
  return `<button class="ok-it ${x.dir}" onclick="OKA.edit('${x.id}')">${no?`<span class="no">${no}</span>`:''}<span class="ic" aria-hidden="true">${K.ic}</span>`
    +`<span class="w"><b>${esc(x.name)}${x.rk?' <i title="連絡帳の人">📇</i>':''}</b>${sub?`<small>${esc(sub)}</small>`:''}${pill(x)}</span>`
    +`<span class="a">${x.amt?yen(x.amt):''}${x.what?`<small>${esc(x.what)}</small>`:''}</span></button>`;
}
function renderItems(){
  const b=$('okList'); if(!b) return;
  const list=shown();
  view={g:groups(list)};
  if(!list.length){
    b.innerHTML=`<div class="ok-empty">${q.trim()?'「'+esc(q.trim())+'」は 見つかりませんでした':st.filt==='mada'?'お返しが まだのものは ありません ✓':'ありません'}</div>`;
    return;
  }
  b.innerHTML=view.g.map((g,gi)=>{
    const s=gSum(g.its), open=isOpenG(g,s);
    const sum=[s.I.length?`🎁 ${s.I.length}件${s.ia?' '+yen(s.ia):''}`:'', s.O.length?`📤 ${s.O.length}件${s.oa?' '+yen(s.oa):''}`:''].filter(Boolean).join('・');
    let rs='';
    if(s.mada.length) rs=`お返し まだ ${s.mada.length}件${s.hi?`（めやす ${rngText([s.lo,s.hi])}）`:''}${s.late?`<b class="late">⚠ ${s.late}件は 時期が すぎています</b>`:''}`;
    else if(s.sumi.length) rs='✓ お返しは ぜんぶ済み';
    const dr=dateRange(g.its);
    return `<section class="ok-g${open?' open':''}"><button class="ok-gh" onclick="OKA.gToggle(${gi})" aria-expanded="${open}"><span class="ar" aria-hidden="true">${open?'▾':'▸'}</span><span class="w"><b>${esc(gTitle(g))}</b><small>${esc([dr,sum].filter(Boolean).join('・'))}</small>${rs?`<small class="rs">${rs}</small>`:''}</span></button>`
      +(open?`<div class="ok-gb">${g.its.map((x,i)=>itemRow(x, st.grp==='ev'&&g.its.length>1?i+1:0)).join('')}<div class="ok-ga">${st.grp==='ev'?`<button onclick="OKA.addTo(${gi})">＋ 続けて入れる</button>`:''}<button onclick="OKA.out(${gi})">📋 一覧を出す・印刷</button></div></div>`:'')
      +`</section>`;
  }).join('')+`<div class="ok-ga ok-all"><button onclick="OKA.out(-1)">📋 ここに出ている ${list.length}件を 出す・印刷</button></div>`;
}

/* 👤 人ごと */
function people(){
  const nameRk={};
  st.items.forEach(x=>{ if(x.rk) nameRk[normName(x.name)]=x.rk; });
  const P=new Map();
  st.items.forEach(x=>{
    const r=x.rk||nameRk[normName(x.name)], k=r?'r:'+r:'n:'+normName(x.name);
    if(!P.has(k)) P.set(k,{k, its:[], rk:r||''});
    P.get(k).its.push(x);
  });
  const out=[...P.values()];
  out.forEach(p=>{
    p.its.sort((a,b)=>b.date.localeCompare(a.date)||b.t-a.t);
    p.name=p.its[0].name; p.last=p.its[0].date;
    const c=p.rk?rkById(p.rk):null; p.kana=c?rkKana(c):'';
    p.I=p.its.filter(x=>x.dir==='in'); p.O=p.its.filter(x=>x.dir==='out');
    p.ia=p.I.reduce((s,x)=>s+x.amt,0); p.oa=p.O.reduce((s,x)=>s+x.amt,0);
  });
  if(st.psort==='name') out.sort((a,b)=>kata2hira(a.kana||a.name).localeCompare(kata2hira(b.kana||b.name),'ja'));
  else out.sort((a,b)=>b.last.localeCompare(a.last));
  return out;
}
const perSum=p=>[p.I.length?`🎁 ${p.I.length}件${p.ia?' '+yen(p.ia):''}`:'', p.O.length?`📤 ${p.O.length}件${p.oa?' '+yen(p.oa):''}`:''].filter(Boolean).join('・');
function renderPerson(){
  const b=$('okMain');
  if(!st.items.length){ b.innerHTML=`<div class="ok-empty">まだ 記録がありません。「📒 記録」で いただいた・さしあげた を入れると、人ごとの やりとりが ここに出ます。</div>`; return; }
  b.innerHTML=`<div class="ok-tools"><input type="search" id="okPQ" placeholder="🔎 名前で さがす" value="${esc(pq)}" oninput="OKA.pFind(this.value)" autocomplete="off" aria-label="名前でさがす">
    <select aria-label="並べ方" onchange="OKA.psort(this.value)"><option value="new"${st.psort==='new'?' selected':''}>さいきん順</option><option value="name"${st.psort==='name'?' selected':''}>名前順</option></select></div><div id="okPList"></div>`;
  renderPeople();
}
function renderPeople(){
  const L=$('okPList'); if(!L) return;
  const Q=normQ(pq);
  perCache=people().filter(p=>!Q || normQ(p.name+' '+p.kana).includes(Q) || p.its.some(x=>normQ(x.name).includes(Q)));
  L.innerHTML=perCache.length?`<div class="ok-note">${perCache.length}人。押すと その方との やりとりが ぜんぶ出ます。</div>`+perCache.map((p,i)=>`<button class="ok-it per" onclick="OKA.person(${i})"><span class="w"><b>${esc(p.name)}${p.rk?' <i title="連絡帳の人">📇</i>':''}</b><small>${esc(perSum(p))}</small>${p.I.some(isMada)?'<span class="ok-pl mada">お返し まだ</span>':''}</span><span class="a"><small>${esc(dShow(p.last))}</small></span></button>`).join('')
    :`<div class="ok-empty">「${esc(pq.trim())}」は 見つかりませんでした</div>`;
}
function person(i){
  const p=perCache[i]; if(!p) return;
  const pop=popOpen('', 'person'); pop.pk=p.k; personRender(pop);
}
function personRender(pop){
  const p=people().find(x=>x.k===pop.pk);
  if(!p){ popClose(false, pop); return; }
  pop.p=p;
  const c=p.rk?rkById(p.rk):null, adr=c?rkAdr(c):((p.its.find(x=>x.adr)||{}).adr||''), tel=c?rkTel(c):'';
  pop.el.querySelector('.ok-pop').innerHTML=`<div class="ok-fh"><b>👤 ${esc(p.name)}</b>${p.kana?`<small>${esc(p.kana)}</small>`:''}</div>
    ${c||adr||tel?`<div class="ok-rkb"><span>${c?'📇 連絡帳の人':'🏠'}${adr?'<br>'+esc(adr):''}${tel?'<br>☎ '+esc(tel):''}</span></div>`:''}
    <div class="ok-psum">${p.I.length?`<div><span>🎁 いただいた</span><b>${p.I.length}件${p.ia?'・'+yen(p.ia):''}</b></div>`:''}${p.O.length?`<div><span>📤 さしあげた</span><b>${p.O.length}件${p.oa?'・'+yen(p.oa):''}</b></div>`:''}</div>
    <div class="ok-lbl">やりとり（新しい順）</div>
    ${p.its.map(x=>{ const K=kindOf(x.kind); return `<button class="ok-it ${x.dir}" onclick="OKA.edit('${x.id}')"><span class="ic" aria-hidden="true">${K.ic}</span><span class="w"><b>${x.dir==='in'?'いただいた':'さしあげた'}</b><small>${esc([dShow(x.date), x.ev||K.n].filter(Boolean).join('・'))}</small>${x.dir==='in'?pill(x):''}</span><span class="a">${x.amt?yen(x.amt):''}${x.what?`<small>${esc(x.what)}</small>`:''}</span></button>`; }).join('')}
    <div class="ok-pop-acts"><button class="ok-b" onclick="OKA.pAdd('in')">🎁 いただいた を足す</button><button class="ok-b" onclick="OKA.pAdd('out')">📤 さしあげた を足す</button><button class="ok-b" onclick="OKA.pCopy()">📋 コピー</button><button class="ok-b pri" onclick="OKA.popClose()">閉じる</button></div>`.replace('class="ok-pop-acts"','class="ok-pop-acts grid"');
}
function topPerson(){ for(let i=pops.length-1;i>=0;i--) if(pops[i].kind==='person') return pops[i]; return null; }
function pAdd(dir){
  const p=topPerson(); if(!p||!p.p) return;
  const last=p.p.its[0];
  openForm(newFm(dir, {name:p.p.name, rk:p.p.rk, adr:(p.p.its.find(x=>x.adr)||{}).adr||'', kind:last?last.kind:''}));
}
function personText(p){
  const L=['👤 '+p.name+' さんとの やりとり', ''];
  p.its.forEach(x=>L.push('・'+[dShow(x.date), x.dir==='in'?'いただいた':'さしあげた', kindOf(x.kind).n, x.ev, x.amt?yen(x.amt):'', x.what, retText(x)].filter(Boolean).join(' ')));
  L.push('', perSum(p).replace(/🎁/g,'いただいた').replace(/📤/g,'さしあげた'));
  return L.join('\n');
}
function pCopy(){ const p=topPerson(); if(p&&p.p) toolCopyText(personText(p.p), 'コピーしました'); }

/* 🕯️ 法事 */
function renderHoji(){
  const b=$('okMain');
  let h=`<button class="ok-big hj" onclick="OKA.hjEdit('')">＋ 故人を入れる<small>命日から 法要の日を出します</small></button>`;
  const note=`<div class="ok-note">亡くなった日を 1日目として数えます（関西など、前の日から数える地域も あります）。法要は その日より前の土日に することが多いです。<br>
    <button class="ok-mn" onclick="OKA.manner('fun-hoyo')">📜 法要の年と日</button> <button class="ok-mn" onclick="OKA.manner('fun-hoji')">📜 法事に招かれたとき</button> <button class="ok-mn" onclick="OKA.manner('fun-sese')">📜 施主の準備（お布施）</button></div>`;
  if(!st.hoji.length){
    b.innerHTML=h+`<div class="ok-empty">亡くなった方の 名前と命日を入れると、初七日・四十九日から 一周忌・三回忌… 五十回忌までの日と、その前の土日、新盆の年が出ます。</div>`+note;
    return;
  }
  const up=[];
  st.hoji.forEach(p=>{ hoyoList(okDate(p.date)).forEach(x=>{ const n=daysTo(x.d); if(n>=0 && n<=730) up.push({p, x, n}); }); });
  up.sort((a,b)=>a.n-b.n);
  h+=`<section class="ok-sec"><h4>📅 これからの法事 <small>（2年先まで）</small></h4>`
    +(up.length?up.slice(0,12).map(u=>`<div class="ok-up${u.n<=60?' near':''}"><span class="d">${ymdS(u.x.d)}<small>（${WD[u.x.d.getDay()]}）</small></span><span class="w"><b>${esc(u.p.name)} の ${u.x.n}</b><small>${u.n===0?'今日':'あと '+u.n+'日'}・前の土日 ${weekend(u.x.d).map(mdw).join('・')}</small></span></div>`).join('')
      :'<div class="ok-empty">2年先までに 法要は ありません</div>')+`</section>`;
  h+=st.hoji.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(hjCard).join('');
  b.innerHTML=h+note;
}
function hjCard(p){
  const d=okDate(p.date), L=hoyoList(d), nx=L.find(x=>daysTo(x.d)>=0), nb=niibon(d), y0=today().getFullYear();
  const yrs=Math.floor((today()-d)/86400000/365.2425);
  return `<section class="ok-sec ok-hj"><h4>🕯️ ${esc(p.name)}</h4>
    <div class="ok-hjd">命日 ${ymdJ(d)}・${wareki(d)}${yrs>=1?`<small>（亡くなって ${yrs}年）</small>`:''}</div>
    ${p.memo?`<div class="ok-hjm">${esc(p.memo)}</div>`:''}
    ${nx?`<div class="ok-next">次は <b>${nx.n}</b>：${ymdJ(nx.d)}<small>${daysTo(nx.d)===0?'今日':'あと '+daysTo(nx.d)+'日'}・前の土日 ${weekend(nx.d).map(mdw).join('・')}</small></div>`:'<div class="ok-note">五十回忌まで すみました</div>'}
    ${Math.max(nb.aug,nb.jul)>=y0?`<div class="ok-nb">🏮 新盆（初盆）：${nb.aug}年の お盆（8月13〜16日）${nb.jul!==nb.aug?`<small>7月盆の地域は ${nb.jul}年7月</small>`:'<small>7月盆の地域も 同じ年の7月</small>'}</div>`:''}
    <details class="ok-hjall"><summary>ぜんぶの法要の日</summary><table class="ok-t"><tr><th>法要</th><th>日</th><th></th></tr>${L.map(x=>{ const n=daysTo(x.d); return `<tr class="${x===nx?'now':n<0?'done':''}"><td>${x.n}</td><td>${ymdJ(x.d)}<br><small>${wareki(x.d)}</small></td><td><small>${n<0?'すんだ':n===0?'今日':'あと'+n+'日'}</small></td></tr>`; }).join('')}</table></details>
    <div class="ok-ga"><button onclick="OKA.hjEdit('${p.id}')">✏️ 直す</button><button onclick="OKA.hjCopy('${p.id}')">📋 コピー</button><button onclick="OKA.hjFind('${p.id}')">🔎 記録で さがす</button></div></section>`;
}
function hjEdit(id){
  const p=id?st.hoji.find(x=>x.id===id):null;
  if(!p && st.hoji.length>=MAX_HJ){ toast('故人は '+MAX_HJ+'人までです'); return; }
  popOpen(`<b>${p?'✏️ 故人を直す':'🕯️ 故人を入れる'}</b>
    <label>お名前<input id="okHName" value="${esc(p?p.name:'')}" maxlength="30" placeholder="例：父 山田 一郎" autocomplete="off"></label>
    <label>命日（亡くなった日）<input id="okHDate" type="date" value="${esc(p?p.date:'')}"></label>
    <label>メモ（なくてもよい）<input id="okHMemo" value="${esc(p?p.memo:'')}" maxlength="100" placeholder="例：〇〇寺・浄土真宗" autocomplete="off"></label>
    <div class="ok-pop-acts">${p?`<button class="ok-b del" onclick="OKA.hjDel('${p.id}')">🗑 消す</button>`:''}<button class="ok-b" onclick="OKA.popClose()">やめる</button><button class="ok-b pri" onclick="OKA.hjSave('${p?p.id:''}')">✓ 決める</button></div>`, 'hoji');
}
function hjSave(id){
  const name=line($('okHName').value,30), date=$('okHDate').value;
  if(!name){ toast('お名前を入れてください'); return; }
  if(!okDate(date)){ toast('命日を入れてください'); return; }
  if(okDate(date)>today()){ toast('命日が 今日より先に なっています'); return; }
  const memo=line($('okHMemo').value,100);
  const p=id?st.hoji.find(x=>x.id===id):null;
  if(p) Object.assign(p,{name,date,memo}); else st.hoji.push({id:uid('h'), name, date, memo});
  save(); popClose(); refresh();
  toast(p?'直しました':name+' を入れました');
}
async function hjDel(id){
  const p=st.hoji.find(x=>x.id===id); if(!p) return;
  if(!await appConfirm(p.name+' を消しますか？（法事の日の一覧から外れます。記録は消えません）', '消す', 'やめる')) return;
  st.hoji=st.hoji.filter(x=>x!==p); save(); popClose(); refresh(); toast('消しました');
}
function hjText(p){
  const d=okDate(p.date), nb=niibon(d);
  const L=['🕯️ '+p.name+' の法要', '命日 '+ymdJ(d)+'（'+wareki(d)+'）', ''];
  hoyoList(d).forEach(x=>L.push('・'+x.n+'　'+ymdJ(x.d)+(daysTo(x.d)<0?'（すんだ）':'')));
  L.push('', '新盆：'+nb.aug+'年のお盆'+(nb.jul!==nb.aug?'（7月盆の地域は '+nb.jul+'年）':''));
  return L.join('\n');
}
function hjCopy(id){ const p=st.hoji.find(x=>x.id===id); if(p) toolCopyText(hjText(p), '法要の日を コピーしました'); }
function hjFind(id){
  const p=st.hoji.find(x=>x.id===id); if(!p) return;
  q=p.name.replace(/^(父|母|祖父|祖母|夫|妻|兄|姉|弟|妹)[\s　]+/,'');   // 「父 山田 一郎」→「山田 一郎」
  st.tab='list'; st.filt='all'; grpOpen={}; save(); render();
  const L=$('okList'); if(L && !shown().length) toast('「'+q+'」の記録は 見つかりませんでした。行事に 故人の名前を入れておくと さがせます', 4500);
}

/* ───────── 小さな窓（上に重ねられる） ───────── */
function popOpen(html, kind){
  const host=document.querySelector('#okaeshiOverlay .ok-modal'); if(!host) return null;
  const el=document.createElement('div'); el.className='ok-pop-bg'; el.style.zIndex=String(20+pops.length*2);
  el.innerHTML=`<div class="ok-pop${kind==='form'||kind==='person'?' big':''}" role="dialog" aria-modal="true">${html}</div>`;
  if(kind!=='form' && kind!=='hoji') el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(false, p); });   // 入れている途中の窓は 外を押しても閉じない
  host.appendChild(el);
  const p={el, kind, rel:null};
  p.rel=modalBack(()=>popClose(true, p));
  pops.push(p);
  return p;
}
function popClose(fromBack, which){
  const p=which||pops[pops.length-1]; if(!p) return;
  const i=pops.indexOf(p); if(i<0) return;
  pops.splice(i).reverse().forEach(x=>{ if(!(fromBack&&x===p)) x.rel(); x.el.remove(); if(x.kind==='form') fm=null; });
}
function popCloseAll(){ while(pops.length) popClose(); }

/* ───────── 入れる・直す ───────── */
function newFm(dir, base){
  base=base||{};
  return {id:null, dir, kind:base.kind||st.lk[dir]||'koden', ev:base.ev||'', date:base.date||ymd(today()), name:base.name||'', rk:base.rk||'', adr:base.adr||'',
    amt:'', what:'', memo:'', ret:{st:'', date:'', what:'', amt:''}, n:base.n||0};
}
function openForm(f){
  const old=pops.find(p=>p.kind==='form'); if(old) popClose(false, old);
  fm=f;
  const p=popOpen('', 'form'); if(!p) return;
  renderForm();
}
function formPop(){ return pops.find(p=>p.kind==='form')||null; }
function renderForm(){
  const p=formPop(); if(!p||!fm) return;
  const box=p.el.querySelector('.ok-pop'), sc=box.scrollTop;
  const K=kindOf(fm.kind), isIn=fm.dir==='in', rs=fm.ret.st||defRet(fm.dir,fm.kind);
  box.innerHTML=`<div class="ok-fh"><b>${fm.id?'✏️ 直す':isIn?'🎁 いただいた を入れる':'📤 さしあげた を入れる'}</b>${fm.n?`<small>続けて ${fm.n+1}件め</small>`:''}</div>
    <div class="ok-seg2" role="group" aria-label="いただいた／さしあげた"><button class="${isIn?'on':''}" aria-pressed="${isIn}" onclick="OKA.fDir('in')">🎁 いただいた</button><button class="${!isIn?'on':''}" aria-pressed="${!isIn}" onclick="OKA.fDir('out')">📤 さしあげた</button></div>
    <div class="ok-lbl">種類</div>
    <div class="ok-kinds" role="group" aria-label="種類">${KINDS.map(k=>`<button class="ok-kd${fm.kind===k.k?' on':''}" aria-pressed="${fm.kind===k.k}" onclick="OKA.fKind('${k.k}')" title="${esc(k.n)}">${k.ic} ${k.s}</button>`).join('')}</div>
    <div class="ok-form">
      <label class="wide">行事（なくてもよい）<input id="okFEv" list="okEvL" value="${esc(fm.ev)}" maxlength="40" placeholder="${esc(K.ev||'例：〇〇の葬儀・〇〇の結婚')}" autocomplete="off" enterkeyhint="next"></label>
      <label>日付<input id="okFDate" type="date" value="${esc(fm.date)}" onchange="OKA.fUpd()"></label>
      <label class="wide">${isIn?'だれから':'だれへ'}<span class="ok-nm"><input id="okFName" list="okNameL" value="${esc(fm.name)}" maxlength="40" placeholder="例：山田 太郎" autocomplete="off" enterkeyhint="next" oninput="OKA.fName()"><button type="button" class="ok-b" onclick="OKA.rkPick()">📇 連絡帳</button></span></label>
      <div class="wide" id="okFRk"></div>
      <label>金額（円）<input id="okFAmt" inputmode="decimal" value="${esc(fm.amt)}" placeholder="例 10000・1万" autocomplete="off" enterkeyhint="done" oninput="OKA.fUpd()"></label>
      <label>品物（お金でないとき）<input id="okFWhat" value="${esc(fm.what)}" maxlength="60" placeholder="例 お菓子・花" autocomplete="off" enterkeyhint="done"></label>
      <div class="ok-qa wide" role="group" aria-label="よく使う金額">${QAMT.map(([v,l])=>`<button type="button" onclick="OKA.fAmt(${v})">${l}</button>`).join('')}</div>
      <details class="wide ok-more"${fm.adr||fm.memo?' open':''}><summary>住所・メモ</summary>
        <label>住所<input id="okFAdr" value="${esc(fm.adr)}" maxlength="120" placeholder="お返しを送るとき用" autocomplete="off"></label>
        <label>メモ（間柄など）<input id="okFMemo" value="${esc(fm.memo)}" maxlength="200" placeholder="例 父の会社の方" autocomplete="off"></label>
      </details>
    </div>
    <div id="okFGuide"></div>
    ${isIn?`<div class="ok-lbl">お返し</div>
    <div class="ok-seg3" role="group" aria-label="お返し">${[['mada','まだ'],['sumi','✓ 済み'],['nashi','しない']].map(([k,l])=>`<button class="${rs===k?'on':''}" aria-pressed="${rs===k}" onclick="OKA.fRet('${k}')">${l}</button>`).join('')}</div>
    ${rs==='sumi'?`<div class="ok-form"><label>お返しの日<input id="okFRDate" type="date" value="${esc(fm.ret.date||ymd(today()))}"></label><label>金額（円）<input id="okFRAmt" inputmode="decimal" value="${esc(fm.ret.amt)}" autocomplete="off"></label><label class="wide">お返しの品<input id="okFRWhat" value="${esc(fm.ret.what)}" maxlength="60" placeholder="例 カタログギフト・お茶" autocomplete="off"></label></div>`:''}`:''}
    <div class="ok-pop-acts">${fm.id?`<button class="ok-b del" onclick="OKA.fDel()">🗑 消す</button>`:''}<button class="ok-b" onclick="OKA.popClose()">やめる</button>${fm.id?`<button class="ok-b pri" onclick="OKA.fSave(false)">✓ 直す</button>`:`<button class="ok-b" onclick="OKA.fSave(false)">✓ 入れる</button><button class="ok-b pri" onclick="OKA.fSave(true)">✓ 入れて 次の人</button>`}</div>`;
  box.scrollTop=sc;
  renderRk(); renderGuide();
  /* Enter は 次の欄へ（勝手に保存はしない。スマホの「完了」でキーボードを閉じたいだけのことが多いので） */
  const nm=$('okFName'), am=$('okFAmt'), ev=$('okFEv');
  if(ev) ev.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); nm.focus(); } });
  if(nm) nm.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); am.focus(); } });
  box.querySelectorAll('#okFAmt,#okFWhat,#okFAdr,#okFMemo,#okFRAmt,#okFRWhat').forEach(x=>x.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); x.blur(); } }));
}
function fmRead(){
  if(!fm) return;
  const v=id=>{ const e=$(id); return e?e.value:null; };
  [['okFEv','ev'],['okFDate','date'],['okFName','name'],['okFAmt','amt'],['okFWhat','what'],['okFAdr','adr'],['okFMemo','memo']].forEach(([id,k])=>{ const x=v(id); if(x!=null) fm[k]=x; });
  [['okFRDate','date'],['okFRAmt','amt'],['okFRWhat','what']].forEach(([id,k])=>{ const x=v(id); if(x!=null) fm.ret[k]=x; });
}
function fAmtVal(){ const s=String(fm.amt==null?'':fm.amt).trim(); if(!s) return 0; const a=toolNum(s); return (isFinite(a)&&a>0)?Math.round(a):NaN; }
function renderGuide(){
  const g=$('okFGuide'); if(!g||!fm) return;
  const K=kindOf(fm.kind), a=fAmtVal(), amt=a>0?a:0;
  const L=[];
  if(fm.dir==='in'){
    const d=okDate(fm.date), due=(K.due!=null&&d)?addDays(d,K.due):null;
    L.push(K.ret?`<div><span>お返し</span><b>${K.rt}${amt?' → '+rngText(rng(K,amt)):''}</b></div>`:`<div><span>お返し</span><b>いりません</b></div>`);
    if(K.when) L.push(`<div><span>時期</span>${esc(K.when)}${due?`<b>（${ymdS(due)}ごろまで）</b>`:''}</div>`);
    if(K.omote) L.push(`<div><span>表書き</span>${esc(K.omote)}</div>`);
    if(K.mizu) L.push(`<div><span>水引</span>${esc(K.mizu)}</div>`);
    if(K.tip) L.push(`<div class="tip">💡 ${esc(K.tip)}</div>`);
    g.innerHTML=`<div class="ok-guide">${L.join('')}${K.mn?`<button class="ok-mn" onclick="OKA.manner('${K.mn}')">📜 マナー帳で くわしく</button>`:''}</div>`;
  } else {
    if(K.oOmote) L.push(`<div><span>表書き</span>${esc(K.oOmote)}</div>`);
    if(K.oMizu) L.push(`<div><span>水引</span>${esc(K.oMizu)}</div>`);
    g.innerHTML=`<div class="ok-guide out">${L.join('')}${K.oMn?`<button class="ok-mn" onclick="OKA.manner('${K.oMn}')">📜 マナー帳で くわしく（金額の目安など）</button>`:''}</div>`;
  }
}
function prevOf(name, rk, skipId){
  const nk=normName(name); if(!nk) return [];
  return st.items.filter(x=>x.id!==skipId && (normName(x.name)===nk || (rk && x.rk===rk))).sort((a,b)=>b.date.localeCompare(a.date)||b.t-a.t);
}
function renderRk(){
  const b=$('okFRk'); if(!b||!fm) return;
  let h='';
  if(fm.rk){
    const c=rkById(fm.rk);
    if(c){ const a=rkAdr(c), t=rkTel(c); h+=`<div class="ok-rkb"><span>📇 連絡帳の人${a?'<br>'+esc(a):''}${t?'<br>☎ '+esc(t):''}</span><button type="button" class="ok-b" onclick="OKA.rkOff()">はずす</button></div>`; }
    else h+=`<div class="ok-rkb"><span>📇 連絡帳に 見つかりません（消されたかもしれません）</span><button type="button" class="ok-b" onclick="OKA.rkOff()">はずす</button></div>`;
  }
  const pv=prevOf(fm.name, fm.rk, fm.id).slice(0,4);
  if(pv.length) h+=`<div class="ok-prev"><b>この方との 前のやりとり</b>${pv.map(x=>{ const K=kindOf(x.kind); return `<div>${x.dir==='in'?'🎁 いただいた':'📤 さしあげた'}　${esc(dShow(x.date))} ${K.ic}${esc(x.ev||K.n)}　<b>${x.amt?yen(x.amt):esc(x.what)}</b></div>`; }).join('')}</div>`;
  b.innerHTML=h;
}
function add(dir){ openForm(newFm(dir==='out'?'out':'in')); }
function addTo(gi){
  const g=view.g[gi]; if(!g||!g.its.length) return;
  const last=g.its.reduce((m,x)=>(x.t||0)>=(m.t||0)?x:m, g.its[0]);
  openForm(newFm(last.dir, {kind:last.kind, ev:last.ev, date:last.date}));
  setTimeout(()=>{ const n=$('okFName'); if(n) try{ n.focus(); }catch(_){} }, 60);
}
function edit(id){
  const x=st.items.find(y=>y.id===id); if(!x) return;
  openForm({id:x.id, dir:x.dir, kind:x.kind, ev:x.ev, date:x.date, name:x.name, rk:x.rk, adr:x.adr, amt:x.amt?String(x.amt):'', what:x.what, memo:x.memo,
    ret:{st:x.ret.st, date:x.ret.date, what:x.ret.what, amt:x.ret.amt?String(x.ret.amt):''}, n:0});
}
function fDir(d){ fmRead(); if(!fm||fm.dir===d||(d!=='in'&&d!=='out')) return; fm.dir=d; fm.ret.st=''; renderForm(); }
function fKind(k){ fmRead(); if(!fm||!KINDS.some(x=>x.k===k)) return; fm.kind=k; if(fm.ret.st!=='sumi') fm.ret.st=''; renderForm(); }   // お返しは その種類の ふつうに戻す（済みは そのまま）
function fRet(s){ fmRead(); if(!fm||!RET_N[s]) return; fm.ret.st=s; if(s==='sumi'&&!fm.ret.date) fm.ret.date=ymd(today()); renderForm(); if(s==='sumi') setTimeout(()=>{ const w=$('okFRWhat'); if(w&&w.scrollIntoView) w.scrollIntoView({block:'nearest'}); }, 30); }
function fUpd(){ fmRead(); renderGuide(); }
function fAmt(v){ const a=$('okFAmt'); if(!a) return; a.value=String(v); fUpd(); }
function fName(){
  fmRead(); if(!fm) return;
  if(fm.rk){ const c=rkById(fm.rk); if(c && normName(rkNm(c))!==normName(fm.name)) fm.rk=''; }   // 名前を書きかえたら 連絡帳とのつながりは外す
  renderRk();
}
function rkOff(){ fmRead(); if(!fm) return; fm.rk=''; renderRk(); }
function fSave(next){
  fmRead(); if(!fm) return;
  const name=line(fm.name,40);
  if(!name){ toast((fm.dir==='in'?'だれから':'だれへ')+' を入れてください'); try{ $('okFName').focus(); }catch(_){} return; }
  const a=fAmtVal();
  if(isNaN(a)){ toast('金額は 数で入れてください（例：10000・1万）'); try{ $('okFAmt').focus(); }catch(_){} return; }
  if(a>MAX_AMT){ toast('金額が大きすぎます'); return; }
  const K=kindOf(fm.kind);
  let ret={st:'nashi', date:'', what:'', amt:0};
  if(fm.dir==='in'){
    ret.st=fm.ret.st||(K.ret?'mada':'nashi');
    if(ret.st==='sumi'){
      const rs=String(fm.ret.amt==null?'':fm.ret.amt).trim(), ra=rs?toolNum(rs):0;
      if(rs && !(isFinite(ra)&&ra>0)){ toast('お返しの金額は 数で入れてください'); return; }
      ret.date=okDate(fm.ret.date)?fm.ret.date:ymd(today()); ret.what=line(fm.ret.what,60); ret.amt=amtOk(ra);
    }
  }
  const it={dir:fm.dir, kind:K.k, ev:line(fm.ev,40), date:okDate(fm.date)?fm.date:'', name, rk:fm.rk||'', adr:line(fm.adr,120), amt:amtOk(a), what:line(fm.what,60), memo:line(fm.memo,200), ret};
  if(fm.id){
    const x=st.items.find(y=>y.id===fm.id); if(x) Object.assign(x, it);
    toast('直しました');
  } else {
    if(st.items.length>=MAX_IT){ toast('記録は '+MAX_IT+'件までです。いらないものを消してください', 4000); return; }
    st.items.push(Object.assign({id:uid('i'), t:Date.now()}, it));
    toast(name+' さん'+(it.amt?' '+yen(it.amt):it.what?' '+it.what:'')+' を入れました');
  }
  st.lk[fm.dir]=K.k;
  if(!save()) return;
  if(next && !fm.id){
    fm=newFm(fm.dir, {kind:K.k, ev:it.ev, date:fm.date, n:(fm.n||0)+1});
    renderForm();
    setTimeout(()=>{ const n=$('okFName'); if(n) try{ n.focus(); }catch(_){} }, 60);
  } else popClose(false, formPop());
  refresh();
}
async function fDel(){
  fmRead(); if(!fm||!fm.id) return;
  const x=st.items.find(y=>y.id===fm.id); if(!x) return;
  if(!await appConfirm(x.name+' さんの '+(x.amt?yen(x.amt):x.what||'記録')+'（'+(x.dir==='in'?'いただいた':'さしあげた')+'）を消しますか？\nもとに戻せません。', '消す', 'やめる')) return;
  st.items=st.items.filter(y=>y!==x); save(); popClose(false, formPop()); refresh(); toast('消しました');
}

/* 📇 連絡帳から えらぶ */
let rkQ='';
function rkPick(){
  fmRead();
  if(!rkItems().length){ toast('📇 連絡帳に 人がいません（連絡帳に入れると、ここから えらべます）', 4000); return; }
  rkQ=fm&&fm.name?fm.name:'';
  popOpen(`<b>📇 連絡帳から えらぶ</b><input id="okRkQ" type="search" value="${esc(rkQ)}" placeholder="名前・よみ・会社で さがす" autocomplete="off" oninput="OKA.rkFind(this.value)" aria-label="さがす"><div class="ok-rkl" id="okRkL"></div><div class="ok-pop-acts"><button class="ok-b" onclick="OKA.popClose()">やめる</button></div>`, 'rk');
  rkRender();
}
function rkRender(){
  const L=$('okRkL'); if(!L) return;
  const Q=normQ(rkQ);
  let r=rkItems().map(x=>({x, n:rkNm(x), k:rkKana(x)})).filter(o=>o.n);
  if(Q){ const f=r.filter(o=>normQ(o.n+' '+o.k+' '+(o.x.org||'')+' '+(o.x.nick||'')).includes(Q)); r=f.length?f:r.filter(o=>normQ(o.n).includes(normName(rkQ))); }
  r.sort((a,b)=>kata2hira(a.k||a.n).localeCompare(kata2hira(b.k||b.n),'ja'));
  const more=r.length>80; rkCache=r.slice(0,80);
  L.innerHTML=rkCache.length?rkCache.map((o,i)=>{ const a=rkAdr(o.x); return `<button class="ok-rk" onclick="OKA.rkSel(${i})"><b>${esc(o.n)}</b>${o.k?`<small>${esc(o.k)}</small>`:''}${a?`<small>${esc(a)}</small>`:''}</button>`; }).join('')+(more?'<div class="ok-note">ほかにも います。名前で さがしてください。</div>':'')
    :'<div class="ok-empty">見つかりません</div>';
}
function rkSel(i){
  const o=rkCache[i]; if(!o||!fm) return;
  fm.name=o.n; fm.rk=o.x.id; if(!fm.adr) fm.adr=rkAdr(o.x);
  popClose(); renderForm();
}

/* ───────── 出す（コピー・共有・表・印刷） ───────── */
function out(gi){
  const its=gi>=0?(view.g[gi]?view.g[gi].its:[]):view.g.flatMap(g=>g.its);
  if(!its.length) return;
  outCache={its, title:gi>=0?gTitle(view.g[gi]):(q.trim()?'「'+q.trim()+'」の記録':'いただきもの・お返し帳')};
  const hasIn=its.some(x=>x.dir==='in');
  popOpen(`<b>📋 一覧を出す</b><div class="ok-note">${esc(outCache.title)}（${its.length}件）</div>
    <div class="ok-pick"><button onclick="OKA.outGo('copy')">📋 コピー（LINE・メールに貼れます）</button><button onclick="OKA.outGo('share')">📤 共有</button>
    <button onclick="OKA.outGo('table')">▦ 表に入れる（ぜんぶの欄）</button>${hasIn?`<button onclick="OKA.outGo('prep')">▦ お返しの準備の表（名前・住所・いただいた額・めやす）</button>`:''}
    <button onclick="OKA.outGo('print')">🖨 印刷（PDF にも）</button></div>
    <div class="ok-pop-acts"><button class="ok-b" onclick="OKA.popClose()">やめる</button></div>`, 'out');
}
function listText(its, title){
  const L=['🎁 '+title, ''];
  its.forEach(x=>L.push('・'+[dShow(x.date), x.dir==='in'?'いただいた':'さしあげた', x.name, x.amt?yen(x.amt):'', x.what, x.ev&&x.ev!==title?'（'+x.ev+'）':'', retText(x)].filter(Boolean).join(' ')));
  const s=gSum(its);
  L.push('');
  if(s.I.length) L.push('いただいた '+s.I.length+'件'+(s.ia?'・'+yen(s.ia):''));
  if(s.O.length) L.push('さしあげた '+s.O.length+'件'+(s.oa?'・'+yen(s.oa):''));
  if(s.mada.length) L.push('お返し まだ '+s.mada.length+'件'+(s.hi?'（めやす '+rngText([s.lo,s.hi])+'）':''));
  return L.join('\n');
}
function rowsAll(its){
  const out=[['日付','いただいた／さしあげた','種類','行事','名前','金額','品物','住所','お返し','お返しの日','お返しの品','お返しの金額','メモ']];
  its.forEach(x=>{ const s=x.ret.st==='sumi'; out.push([dShow(x.date), x.dir==='in'?'いただいた':'さしあげた', kindOf(x.kind).n, x.ev, x.name, x.amt||'', x.what, adrOf(x), x.dir==='in'?RET_N[x.ret.st]:'', s?dShow(x.ret.date):'', s?x.ret.what:'', s&&x.ret.amt?x.ret.amt:'', x.memo]); });
  return out;
}
function rowsPrep(its){
  const out=[['名前','住所','いただいた','お返しのめやす','お返しの品','済み']];
  its.filter(x=>x.dir==='in' && x.ret.st!=='nashi').forEach(x=>{
    const r=rng(kindOf(x.kind), x.amt);
    out.push([x.name, adrOf(x), x.amt||x.what, r?(r[0]===r[1]?r[0]:num(r[0])+'〜'+num(r[1])):'', x.ret.st==='sumi'?x.ret.what:'', x.ret.st==='sumi'?'済み':'']);
  });
  return out;
}
function printList(its, title){
  const td='border:1px solid #888;padding:3px 5px;vertical-align:top;';
  const s=gSum(its);
  const rows=its.map((x,i)=>`<tr><td style="${td}text-align:right">${i+1}</td><td style="${td}white-space:nowrap">${esc(dShow(x.date))}</td><td style="${td}">${x.dir==='in'?'いただいた':'さしあげた'}<br>${esc(kindOf(x.kind).n)}</td>`
    +`<td style="${td}"><b>${esc(x.name)}</b>${adrOf(x)?'<br><span style="font-size:10px">'+esc(adrOf(x))+'</span>':''}</td><td style="${td}text-align:right;white-space:nowrap">${x.amt?num(x.amt):''}${x.what?'<br>'+esc(x.what):''}</td>`
    +`<td style="${td}">${esc(retText(x))}</td><td style="${td}">${esc(x.memo)}</td></tr>`).join('');
  const html=`<div class="op-doc"><div style="font-size:17px;font-weight:bold;margin:0 0 4px">🎁 ${esc(title)}</div><div style="font-size:11px;color:#555;margin:0 0 8px">${its.length}件・${esc(ymdJ(today()))}</div>
    <table style="border-collapse:collapse;width:100%;font-size:11px"><thead><tr>${['No.','日付','','名前・住所','金額・品物','お返し','メモ'].map(h=>`<th style="${td}background:#eee">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
    <div style="margin-top:8px;font-size:12px">${[s.I.length?'いただいた '+s.I.length+'件'+(s.ia?'・'+yen(s.ia):''):'', s.O.length?'さしあげた '+s.O.length+'件'+(s.oa?'・'+yen(s.oa):''):'', s.mada.length?'お返し まだ '+s.mada.length+'件':''].filter(Boolean).join('　')}</div></div>`;
  if(typeof opBuild==='function' && typeof opPrint==='function') opPrint(opBuild(html, true));
  else { toast('印刷できませんでした'); }
}
function outGo(kind){
  const o=outCache; if(!o) return;
  popClose();
  if(kind==='copy') return toolCopyText(listText(o.its, o.title), '一覧を コピーしました（LINE などに貼れます）');
  if(kind==='share') return toolShareText(o.title, listText(o.its, o.title));
  if(kind==='table') return toolPasteRows(rowsAll(o.its), 'お返し帳', closeOkaeshi);
  if(kind==='prep'){ const r=rowsPrep(o.its); if(r.length<2){ toast('お返しをする分が ありません'); return; } return toolPasteRows(r, 'お返し帳', closeOkaeshi); }
  if(kind==='print') printList(o.its, o.title);
}

/* 📜 マナー帳を この上に開く（先に開いたことがあると 下に隠れるので、いちばん上に置きなおす） */
async function manner(pid){
  if(typeof window.openManner!=='function'){ toast('マナー帳を 開けませんでした'); return; }
  try{ await window.openManner(); }catch(_){}
  ['mannerOverlay','mnViewOverlay'].forEach(id=>{ const el=$(id); if(el) document.body.appendChild(el); });
  if(pid && typeof window.mnOpen==='function') window.mnOpen(pid);
}

/* ───────── 切りかえ ───────── */
function tab(t){ if(!TABS.some(x=>x[0]===t)) return; st.tab=t; save(); popCloseAll(); render(); const b=$('okBody'); if(b) b.scrollTop=0; }
function filt(f){ if(!['all','mada','in','out'].includes(f)) return; st.filt=f; save(); render(); }
function grp(g){ if(!['ev','date','kind'].includes(g)) return; st.grp=g; save(); renderItems(); }
function find(v){ q=String(v||''); renderItems(); }
function gToggle(i){ const g=view.g[i]; if(!g) return; grpOpen[st.grp+':'+g.k]=!isOpenG(g, gSum(g.its)); renderItems(); }
function pFind(v){ pq=String(v||''); renderPeople(); }
function psort(v){ if(!['new','name'].includes(v)) return; st.psort=v; save(); renderPeople(); }

/* ───────── 見た目 ───────── */
const OK_CSS=`
#okaeshiOverlay .ok-modal{ display:flex; flex-direction:column; }
.ok-body{ flex:1; min-height:0; overflow:auto; padding:10px 12px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.ok-wrap{ max-width:720px; margin:0 auto; }
.ok-tabs{ display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin:0 0 10px; }
.ok-tabs button{ min-height:46px; padding:0 2px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); color:var(--text,#333); font-size:14.5px; font-weight:bold; cursor:pointer; }
.ok-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.ok-add{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:0 0 10px; }
.ok-big{ min-height:56px; padding:6px 10px; border-radius:14px; border:2px solid var(--acc); background:var(--acc); color:var(--on-acc,#fff); font-size:17px; font-weight:bold; cursor:pointer; touch-action:manipulation; }
.ok-big.out{ background:transparent; color:var(--acc-text,var(--acc)); }
.ok-big.hj{ width:100%; margin:0 0 10px; font-size:16px; } .ok-big.hj small{ display:block; font-size:12.5px; font-weight:normal; }
.ok-intro{ padding:12px 14px; border-radius:14px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); font-size:14px; line-height:1.7; }
.ok-intro p{ margin:6px 0 0; }
.ok-alert{ display:block; width:100%; text-align:left; margin:0 0 10px; padding:10px 12px; border-radius:12px; border:1px solid rgba(198,40,40,.45); background:rgba(198,40,40,.08); color:#b71c1c; font-size:14px; font-weight:bold; cursor:pointer; }
body.dark .ok-alert{ color:#ef9a9a; }
.ok-filt{ display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin:0 0 8px; }
.ok-chip{ min-height:48px; padding:2px 2px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13px; font-weight:bold; line-height:1.25; cursor:pointer; }
.ok-chip small{ display:block; font-weight:normal; font-size:12px; }
.ok-chip.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.ok-tools{ display:flex; gap:6px; margin:0 0 10px; }
.ok-tools input{ flex:1; min-width:0; height:42px; padding:0 10px; font-size:16px; border:1px solid rgba(120,132,156,.5); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ok-tools select{ flex:none; height:42px; padding:0 4px; font-size:14px; border:1px solid rgba(120,132,156,.5); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ok-g{ margin:0 0 10px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); overflow:hidden; }
.ok-gh{ display:flex; gap:8px; align-items:flex-start; width:100%; text-align:left; padding:10px 12px; border:0; background:rgba(120,132,156,.08); color:var(--text,#222); cursor:pointer; }
.ok-gh .ar{ flex:none; width:14px; color:var(--text-light,#777); }
.ok-gh .w{ flex:1; min-width:0; } .ok-gh b{ font-size:15.5px; }
.ok-gh small{ display:block; margin-top:2px; font-size:12.5px; color:var(--text-light,#666); }
.ok-gh small.rs{ color:var(--text,#333); } .ok-gh .late{ display:block; color:#c62828; } body.dark .ok-gh .late{ color:#ef9a9a; }
.ok-gb{ padding:8px 8px 10px; }
.ok-ga{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.ok-ga button{ flex:1 1 auto; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13.5px; font-weight:bold; cursor:pointer; }
.ok-ga.ok-all{ margin:4px 0 0; }
.ok-it{ display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:8px 10px; margin:0 0 6px; border-radius:10px; border:1px solid rgba(120,132,156,.25); background:transparent; color:var(--text,#222); cursor:pointer; font:inherit; }
.ok-it.out{ border-style:dashed; }
.ok-it .no{ flex:none; min-width:22px; height:22px; padding:0 3px; box-sizing:border-box; border-radius:11px; background:rgba(120,132,156,.18); font-size:11.5px; display:flex; align-items:center; justify-content:center; }
.ok-it .ic{ flex:none; font-size:20px; line-height:1; }
.ok-it .w{ flex:1; min-width:0; font-size:15px; } .ok-it .w b i{ font-style:normal; font-size:12px; }
.ok-it .w small{ display:block; font-size:12px; color:var(--text-light,#666); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ok-it .a{ flex:none; max-width:42%; text-align:right; font-size:15.5px; font-weight:bold; font-variant-numeric:tabular-nums; }
.ok-it .a small{ display:block; font-size:12px; font-weight:normal; color:var(--text-light,#666); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ok-pl{ display:inline-block; margin-top:3px; padding:1px 8px; border-radius:10px; font-size:11.5px; font-weight:bold; }
.ok-pl.mada{ background:rgba(251,140,0,.14); color:#9a4100; } .ok-pl.soon{ background:rgba(251,140,0,.24); color:#843800; }
.ok-pl.late{ background:rgba(198,40,40,.12); color:#b71c1c; } .ok-pl.sumi{ background:rgba(46,125,50,.13); color:#1b5e20; }
.ok-pl.nashi{ background:rgba(120,132,156,.15); color:var(--text-light,#666); } .ok-pl.out{ background:rgba(30,136,229,.12); color:#0d47a1; }
body.dark .ok-pl.mada, body.dark .ok-pl.soon{ color:#ffb74d; } body.dark .ok-pl.late{ color:#ef9a9a; } body.dark .ok-pl.sumi{ color:#81c784; } body.dark .ok-pl.out{ color:#90caf9; }
.ok-empty{ padding:14px 6px; text-align:center; color:var(--text-light,#888); font-size:13.5px; line-height:1.7; }
.ok-note{ margin:8px 0; padding:7px 10px; border-radius:8px; background:rgba(120,132,156,.1); font-size:12.5px; line-height:1.6; }
.ok-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); }
.ok-sec h4{ margin:0 0 6px; font-size:16px; } .ok-sec h4 small{ font-weight:normal; font-size:12.5px; color:var(--text-light,#777); }
.ok-up{ display:flex; gap:10px; align-items:center; padding:7px 0; border-top:1px solid rgba(120,132,156,.18); }
.ok-up:nth-of-type(1){ border-top:0; }
.ok-up .d{ flex:none; width:7.4em; font-weight:bold; font-variant-numeric:tabular-nums; } .ok-up .d small{ font-weight:normal; }
.ok-up .w{ flex:1; min-width:0; } .ok-up .w small{ display:block; font-size:12px; color:var(--text-light,#666); }
.ok-up.near .d{ color:#c62828; } body.dark .ok-up.near .d{ color:#ef9a9a; }
.ok-hjd{ font-size:13.5px; } .ok-hjd small{ margin-left:4px; color:var(--text-light,#666); }
.ok-hjm{ font-size:12.5px; color:var(--text-light,#666); margin-top:2px; }
.ok-next{ margin:8px 0 6px; padding:8px 10px; border-radius:10px; background:var(--acc-weak,rgba(33,115,70,.12)); font-size:14.5px; }
.ok-next small{ display:block; font-size:12.5px; color:var(--text,#333); margin-top:2px; }
.ok-nb{ font-size:13px; margin:4px 0; } .ok-nb small{ display:block; color:var(--text-light,#666); font-size:12px; }
.ok-hjall summary{ cursor:pointer; font-size:13.5px; font-weight:bold; color:var(--acc-text,var(--acc)); padding:6px 0; }
.ok-t{ width:100%; border-collapse:collapse; margin:4px 0; font-size:13.5px; }
.ok-t th,.ok-t td{ border:1px solid rgba(120,132,156,.3); padding:5px 6px; } .ok-t th{ background:rgba(120,132,156,.12); font-size:12px; }
.ok-t td small{ font-size:11px; color:var(--text-light,#666); }
.ok-t tr.now td{ background:var(--acc-weak,rgba(33,115,70,.12)); font-weight:bold; } .ok-t tr.done td{ color:var(--text-light,#888); }
.ok-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; padding-top:5vh; }
.ok-pop{ width:min(440px,94%); max-height:88%; overflow:auto; overscroll-behavior:contain; box-sizing:border-box; padding:14px 14px 16px; border-radius:14px; background:var(--panel,var(--modal-bg,#fff)); color:var(--text,#222); box-shadow:0 10px 40px rgba(0,0,0,.35); }
.ok-pop.big{ width:min(560px,96%); max-height:92%; }
.ok-pop>b{ display:block; font-size:16px; margin-bottom:8px; }
.ok-pop label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#666); margin:4px 0 6px; }
.ok-pop input:not([type=checkbox]), .ok-pop select{ display:block; width:100%; box-sizing:border-box; margin-top:3px; height:44px; padding:0 10px; font-size:17px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ok-fh{ display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 10px; margin-bottom:8px; } .ok-fh b{ font-size:16.5px; } .ok-fh small{ color:var(--text-light,#666); font-size:12.5px; }
.ok-seg2,.ok-seg3{ display:grid; grid-template-columns:1fr 1fr; gap:4px; margin:0 0 6px; } .ok-seg3{ grid-template-columns:repeat(3,1fr); }
.ok-seg2 button,.ok-seg3 button{ min-height:42px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.ok-seg2 button.on,.ok-seg3 button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.ok-lbl{ font-size:12px; font-weight:bold; color:var(--text-light,#666); margin:8px 0 5px; }
.ok-kinds{ display:flex; flex-wrap:wrap; gap:5px; }
.ok-kd{ min-height:36px; padding:0 10px; border-radius:18px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; }
.ok-kd.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.ok-form{ display:grid; grid-template-columns:1fr 1fr; gap:0 10px; margin-top:6px; } .ok-form>*{ min-width:0; } .ok-form .wide{ grid-column:1 / -1; }
.ok-nm{ display:flex; gap:6px; align-items:center; } .ok-nm input{ flex:1; min-width:0; } .ok-nm .ok-b{ flex:none; margin-top:3px; padding:0 10px; }
#okFAmt,#okFRAmt{ font-variant-numeric:tabular-nums; font-weight:bold; }
.ok-qa{ display:flex; flex-wrap:wrap; gap:5px; margin:0 0 6px; }
.ok-qa button{ min-height:34px; padding:0 10px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13px; cursor:pointer; }
.ok-more summary{ cursor:pointer; font-size:13px; font-weight:bold; color:var(--acc-text,var(--acc)); padding:6px 0; }
.ok-guide{ margin:8px 0; padding:10px 12px; border-radius:12px; background:var(--acc-weak,rgba(33,115,70,.1)); font-size:13.5px; line-height:1.6; }
.ok-guide.out{ background:rgba(30,136,229,.08); }
.ok-guide div{ margin:0 0 3px; } .ok-guide span{ display:inline-block; min-width:4.4em; font-size:12px; font-weight:bold; color:var(--text-light,#555); }
.ok-guide .tip{ font-size:12.5px; margin-top:6px; }
.ok-mn{ margin:6px 4px 0 0; min-height:36px; padding:0 12px; border-radius:18px; border:1px solid rgba(120,132,156,.45); background:var(--modal-bg,#fff); color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; }
.ok-prev{ margin:2px 0 6px; padding:8px 10px; border-radius:10px; border:1px dashed rgba(120,132,156,.55); font-size:13px; line-height:1.65; }
.ok-prev>b{ display:block; font-size:12px; color:var(--text-light,#666); }
.ok-rkb{ display:flex; align-items:center; gap:8px; margin:0 0 6px; padding:7px 10px; border-radius:10px; background:rgba(30,136,229,.09); font-size:13px; line-height:1.5; }
.ok-rkb span{ flex:1; min-width:0; overflow-wrap:anywhere; } .ok-rkb .ok-b{ flex:none; height:36px; font-size:13px; }
.ok-psum{ display:flex; flex-wrap:wrap; gap:6px 14px; margin:4px 0; font-size:14px; } .ok-psum span{ font-size:12px; color:var(--text-light,#666); margin-right:4px; }
.ok-rkl{ margin-top:8px; }
.ok-rk{ display:block; width:100%; text-align:left; padding:8px 10px; margin:0 0 5px; border-radius:10px; border:1px solid rgba(120,132,156,.3); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; }
.ok-rk small{ display:block; font-size:12px; color:var(--text-light,#666); }
.ok-pick{ display:flex; flex-direction:column; gap:6px; margin-top:10px; }
.ok-pick button{ text-align:left; min-height:46px; padding:8px 12px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.ok-pop-acts{ display:flex; flex-wrap:wrap; gap:6px; justify-content:flex-end; margin-top:14px; } .ok-pop-acts .del{ margin-right:auto; }
.ok-pop-acts.grid{ display:grid; grid-template-columns:1fr 1fr; } .ok-pop-acts.grid .ok-b{ white-space:normal; height:auto; min-height:44px; }
.ok-b{ height:44px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; white-space:nowrap; touch-action:manipulation; }
.ok-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .ok-b.del{ color:#c62828; border-color:rgba(198,40,40,.4); } body.dark .ok-b.del{ color:#ef9a9a; }
@media (max-width:380px){ .ok-body{ padding:8px 8px calc(16px + var(--safe-bottom,0px)); } .ok-chip{ font-size:11.5px; letter-spacing:-.02em; } .ok-up .d{ width:6.6em; font-size:14px; } .ok-big{ font-size:15.5px; } .ok-tabs button{ font-size:13px; } .ok-b{ padding:0 9px; font-size:13px; } .ok-pop{ padding:12px 10px 14px; } .ok-it .w{ font-size:14px; } }
`;
function ensureDom(){
  if($('okaeshiOverlay')) return;
  const stl=document.createElement('style'); stl.id='okStyle'; stl.textContent=OK_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="okaeshiOverlay">
  <div class="modal vol-modal ok-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🎁 いただきもの・お返し帳</span><button class="modal-close" onclick="closeOkaeshi()" aria-label="閉じる">✕</button></div>
    <div class="ok-body" id="okBody"><div class="ok-wrap">
      <div class="ok-tabs" id="okTabs" role="tablist"></div>
      <div id="okMain"></div>
    </div></div>
    <datalist id="okEvL"></datalist><datalist id="okNameL"></datalist>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('okaeshiOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の電卓キーに 届かないように
  /* Esc は 上に重ねた小さな窓から閉じる（どこに文字の入る所があっても。ほかの道具や確かめる窓が上にあるときは そちらに任せる）。
     表電卓の「Esc で閉じる」（document の capture）より先に受けるよう window で受ける */
  window.addEventListener('keydown', e=>{
    if(e.key!=='Escape' || !pops.length || !isDlgOpen('okaeshiOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openOkaeshi(t){
  ensureDom(); load();
  if(TABS.some(x=>x[0]===t)) st.tab=t;
  q=''; pq=''; grpOpen={}; fm=null;
  openDlg('okaeshiOverlay', ()=>popCloseAll());
  refresh();
}
function closeOkaeshi(){ if(!$('okaeshiOverlay')||!isDlgOpen('okaeshiOverlay')) return; popCloseAll(); closeDlg('okaeshiOverlay'); }

window.OKA={ tab, filt, grp, find, gToggle, add, addTo, edit, out, outGo, person, pAdd, pCopy, pFind, psort,
  fDir, fKind, fRet, fUpd, fAmt, fName, fSave, fDel, rkPick, rkFind:v=>{ rkQ=String(v||''); rkRender(); }, rkSel, rkOff,
  hjEdit, hjSave, hjDel, hjCopy, hjFind, manner, popClose:()=>popClose(),
  state:()=>JSON.parse(JSON.stringify(st)), clean, kinds:()=>KINDS.map(k=>({k:k.k, n:k.n, ret:k.ret, due:k.due})), rng:(k,a)=>rng(kindOf(k),a), due:x=>{ const d=dueOf(x); return d?ymd(d):''; },
  hoyo:s=>{ const d=okDate(s); return d?hoyoList(d).map(x=>x.n+':'+ymd(x.d)):[]; }, niibon:s=>{ const d=okDate(s); return d?niibon(d):null; }, weekend:s=>{ const d=okDate(s); return d?weekend(d).map(ymd):[]; },
  text:(gi)=>{ const its=gi>=0&&view.g[gi]?view.g[gi].its:view.g.flatMap(g=>g.its); return listText(its, gi>=0&&view.g[gi]?gTitle(view.g[gi]):'いただきもの・お返し帳'); },
  rows:(gi,kind)=>{ const its=gi>=0&&view.g[gi]?view.g[gi].its:view.g.flatMap(g=>g.its); return kind==='prep'?rowsPrep(its):rowsAll(its); }, people:()=>people().map(p=>({name:p.name, n:p.its.length, ia:p.ia, oa:p.oa, rk:p.rk})) };
Object.assign(window, { openOkaeshi, closeOkaeshi });
})();
