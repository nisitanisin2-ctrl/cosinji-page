/* 🔢 便利計算（v494。表電卓の道具。はじめて開いたときに読む）
   ひな形・式テンプレの計算のうち、専用の画面にすると便利になる8つをまとめる。
   開くと8つのカード → 押すとその計算の画面。入れた数は端末に覚える（excalc_keisan）。
   1 単位換算 / 2 ローン返済 / 3 給料・手取り / 4 積立・資産 / 5 お買い物・値引き /
   6 日付・時間 / 7 勾配・三角 / 8 ドライブ費用・電気代
   税・社会保険の率は目安（年度で変わる）。 */
(function(){
const KS_KEY='excalc_keisan';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ks={v:{}, last:''}, ksCur=null;
function ksLoad(){ try{ const o=JSON.parse(localStorage.getItem(KS_KEY)||'null')||{}; const v={}; if(o.v&&typeof o.v==='object') for(const k in o.v){ if(/^ks[A-Za-z0-9_]+$/.test(k) && typeof o.v[k]==='string') v[k]=o.v[k].slice(0,40); } ks={v, last:typeof o.last==='string'?o.last:''}; }catch(_){ ks={v:{},last:''}; } }
function ksSave(){ try{ localStorage.setItem(KS_KEY, JSON.stringify(ks)); }catch(_){} }
const num=id=>{ const e=$(id); if(!e) return 0; const n=parseFloat(String(e.value).normalize('NFKC').replace(/,/g,'')); return isFinite(n)?n:0; };
const val=id=>{ const e=$(id); return e?e.value:''; };
const yen=n=>(n<0?'−':'')+Math.round(Math.abs(n)).toLocaleString('ja-JP')+'円';
const fm=(n,d)=>{ if(!isFinite(n)) return '—'; const a=Math.abs(n); if(a!==0 && (a>=1e12||a<1e-6)) return n.toPrecision(6); return Number(n.toFixed(d==null?6:d)).toLocaleString('ja-JP',{maximumFractionDigits:d==null?6:d}); };
const sig=n=>{ if(!isFinite(n)) return '—'; if(n===0) return '0'; const a=Math.abs(n); if(a>=1e15||a<1e-9) return n.toExponential(4); return Number(n.toPrecision(7)).toLocaleString('ja-JP',{maximumFractionDigits:9}); };
const T=(rows,cls)=>`<table class="ks-t${cls?' '+cls:''}">`+rows.map((r,i)=>'<tr>'+r.map(c=>i?`<td>${c}</td>`:`<th>${c}</th>`).join('')+'</tr>').join('')+'</table>';
const NOTE=t=>`<div class="ks-note">${t}</div>`;
const BIG=(lb,v,sub)=>`<div class="ks-big"><div class="ks-big-l">${lb}</div><div class="ks-big-v">${v}</div>${sub?`<div class="ks-big-s">${sub}</div>`:''}</div>`;
const IN=(id,lb,def,opt)=>`<label>${lb}<input id="${id}" type="${opt&&opt.type||'text'}" inputmode="${opt&&opt.im||'decimal'}" value="${def}" oninput="ksRun()"${opt&&opt.ph?` placeholder="${opt.ph}"`:''}></label>`;
const SEL=(id,lb,opts,def)=>`<label>${lb}<select id="${id}" onchange="ksRun()">${opts.map(o=>{ const [v,t]=Array.isArray(o)?o:[o,o]; return `<option value="${v}"${String(v)===String(def)?' selected':''}>${t}</option>`; }).join('')}</select></label>`;
const SEC=t=>`<h4>${t}</h4>`;
const todayStr=()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const C=[];   // 計算 {id, ic, name, desc, col, h, run, sub?}

/* 切りかえのチップ（値は隠した欄に入れて、ほかの欄と同じように覚える） */
const TABS=(id,list,def)=>`<input type="hidden" id="${id}" value="${def}"><div class="ks-chips" data-tabs="${id}">${list.map(([v,t])=>`<button data-v="${v}" onclick="ksTab('${id}','${v}')">${t}</button>`).join('')}</div>`;
function ksTab(id,v){ const e=$(id); if(e) e.value=v; ksRun(); }
function ksSyncTabs(){ document.querySelectorAll('#ksViewBody [data-tabs]').forEach(box=>{ const v=val(box.dataset.tabs); box.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.v===v)); }); }

/* ───────── 1. 単位換算 ───────── */
const SHAKU=10/33;
const UNITS={
  len:{n:'長さ', base:'m', u:[['mm',0.001],['cm',0.01],['m',1],['km',1000],['インチ',0.0254],['フィート',0.3048],['ヤード',0.9144],['マイル',1609.344],['海里',1852],['分（ぶ）',SHAKU/100],['寸',SHAKU/10],['尺',SHAKU],['間（けん）',SHAKU*6],['丈',SHAKU*10],['町',SHAKU*360],['里',SHAKU*12960]]},
  area:{n:'面積', base:'㎡', u:[['㎠',1e-4],['㎡',1],['a（アール）',100],['ha（ヘクタール）',1e4],['㎢',1e6],['坪',400/121],['畳（1.62㎡）',1.62],['畝（せ）',400/121*30],['反（たん）',400/121*300],['町（ちょう）',400/121*3000],['平方フィート',0.09290304],['エーカー',4046.8564224]]},
  vol:{n:'体積・容量', base:'L', u:[['mL（cc）',0.001],['L',1],['㎥',1000],['小さじ',0.005],['大さじ',0.015],['カップ',0.2],['合',2401/13310],['升',24010/13310],['斗',240100/13310],['石',2401000/13310],['米ガロン',3.785411784],['英ガロン',4.54609],['バレル（石油）',158.987294928]]},
  wt:{n:'重さ', base:'kg', u:[['mg',1e-6],['g',0.001],['kg',1],['t（トン）',1000],['カラット',0.0002],['匁（もんめ）',0.00375],['斤（きん）',0.6],['貫（かん）',3.75],['オンス',0.028349523125],['ポンド',0.45359237]]},
  temp:{n:'温度', u:[['℃（摂氏）'],['℉（華氏）'],['K（ケルビン）']]},
  spd:{n:'速さ', base:'m/s', u:[['m/秒',1],['m/分',1/60],['km/時',1/3.6],['ノット',1852/3600],['マイル/時',0.44704]]},
  data:{n:'データ量', base:'B', u:[['B（バイト）',1],['KB',1e3],['MB',1e6],['GB',1e9],['TB',1e12],['KiB',1024],['MiB',1048576],['GiB',1073741824]]},
  prs:{n:'圧力', base:'Pa', u:[['Pa',1],['hPa',100],['kPa',1000],['MPa',1e6],['気圧（atm）',101325],['kgf/㎠',98066.5],['psi',6894.757293168],['mmHg',133.322387415]]},
};
function unitRun(){
  const cat=val('ksUcat')||'len', U=UNITS[cat]; const fromSel=$('ksUfrom');
  if(fromSel.dataset.cat!==cat){ const keep=ks.v.ksUfrom; fromSel.innerHTML=U.u.map((u,i)=>`<option value="${i}">${u[0]}</option>`).join(''); fromSel.dataset.cat=cat; fromSel.value=(keep!=null && U.u[+keep] && fromSel.dataset.first!=='done')?keep:(cat==='len'?'2':cat==='area'?'1':'0'); fromSel.dataset.first='done'; }
  const x=num('ksUval'), fi=+fromSel.value;
  let rows;
  if(cat==='temp'){ const c=fi===0?x:fi===1?(x-32)*5/9:x-273.15; rows=[c, c*9/5+32, c+273.15]; }
  else { const base=x*U.u[fi][1]; rows=U.u.map(u=>base/u[1]); }
  $('ksUout').innerHTML=`<div class="ks-ulist">${U.u.map((u,i)=>`<button class="ks-urow${i===fi?' me':''}" onclick="ksCopyVal(this)"><span class="v">${sig(rows[i])}</span><span class="u">${u[0]}</span></button>`).join('')}</div>`
    +NOTE(cat==='area'?'1坪＝400/121㎡（約3.306㎡）。畳の大きさは地域で違うので、不動産の表示ルール（1畳＝1.62㎡以上）で出しています。'
      :cat==='len'?'1尺＝10/33 m（約30.3cm）、1間＝6尺、1町＝60間、1里＝36町。':cat==='vol'?'1升＝約1.804L、1合＝約180mL、1石＝100升。カップは日本の200mL。'
      :cat==='wt'?'1貫＝1000匁＝3.75kg、1斤＝600g。':cat==='data'?'KB・MB は1000倍ずつ、KiB・MiB は1024倍ずつ（パソコンの表示はどちらのこともある）。':'行を押すと、その数をコピーします。');
}
C.push({id:'unit', ic:'📏', name:'単位換算', desc:'長さ・面積・体積・重さ・温度・速さ・データ・圧力。尺・坪・升・貫も', col:'#1e88e5',
h:()=>`${TABS('ksUcat',Object.entries(UNITS).map(([k,v])=>[k,v.n]),'len')}
<div class="ks-form ks-grid">${IN('ksUval','数','1')}<label>単位<select id="ksUfrom" onchange="ksRun()"></select></label></div>
<div id="ksUout"></div>`, run:unitRun});

/* ───────── 2. ローン返済 ───────── */
function loanSim(P, rY, n, type, pre){   // P:円 rY:年利% n:月数 type:'eq'元利均等|'pr'元金均等 pre:{k:何回目のあと, x:円, mode:'short'|'less'}
  const r=rY/100/12; let bal=P, nEnd=n;
  const pay=(B,m)=>r?B*r*Math.pow(1+r,m)/(Math.pow(1+r,m)-1):B/m;
  let M=pay(P,n), pp=P/n;
  const rows=[]; let tot=0, totI=0, i=0;
  while(bal>0 && i<1200){
    i++; const it=Math.round(bal*r);
    let pr=type==='eq'?Math.round(M)-it:Math.round(pp);
    if(pr>=bal || i>=nEnd || pr<=0) pr=bal;
    bal-=pr; tot+=pr+it; totI+=it; rows.push([i,pr+it,pr,it,bal]);
    if(pre && i===pre.k && bal>0){ const x=Math.min(pre.x,bal); bal-=x; tot+=x;
      if(pre.mode==='less'){ M=pay(bal,n-i); pp=bal/(n-i); } else nEnd=Infinity; }
  }
  return {M, rows, tot, totI, months:i};
}
function loanRun(){
  const P=num('ksLp')*10000, rY=num('ksLr'), y=num('ksLy'), type=val('ksLt')||'eq'; const n=Math.round(y*12);
  const o=$('ksLout'); if(!(P>0) || !(n>0) || rY<0){ o.innerHTML='<div class="ks-empty">借りる額・金利・年数を入れてください</div>'; return; }
  const a=loanSim(P,rY,n,type,null);
  const first=a.rows[0][1], last=a.rows[a.rows.length-1][1];
  let h=BIG(type==='eq'?'毎月の返済額':'1回目の返済額', yen(first), type==='eq'?'':'最後の回は '+yen(last)+'（だんだん減る）')
    +T([['項目','金額'],['借りる額',yen(P)],['返す総額','<b>'+yen(a.tot)+'</b>'],['うち利息','<b>'+yen(a.totI)+'</b>'],['返済回数',a.months+'回（'+fm(a.months/12,1)+'年）']])
    +`<div class="ks-bar"><span style="width:${(P/a.tot*100).toFixed(1)}%" class="p">元金 ${fm(P/a.tot*100,1)}%</span><span style="width:${(a.totI/a.tot*100).toFixed(1)}%" class="i">利息</span></div>`;
  const pk=num('ksLpk'), px=num('ksLpx')*10000, pm=val('ksLpm')||'short';
  if(pk>0 && px>0 && pk*12<n){
    const b=loanSim(P,rY,n,type,{k:Math.round(pk*12),x:px,mode:pm});
    h+=SEC('繰上げ返済をすると')+T([['','そのまま','繰上げ返済'],['返す総額',yen(a.tot),yen(b.tot)],['利息',yen(a.totI),'<b>'+yen(b.totI)+'</b>'],['返済の終わり',fm(a.months/12,1)+'年',fm(b.months/12,1)+'年'],
      ...(pm==='less'?[['その後の毎月',yen(first),yen(b.rows[Math.round(pk*12)]?b.rows[Math.round(pk*12)][1]:0)]]:[])])
      +`<p class="ks-hl">利息が <b>${yen(a.totI-b.totI)}</b> 少なくなります${pm==='short'?`（返済が <b>${a.months-b.months}か月</b> 早く終わる）`:''}</p>`;
  }
  const yr=[]; for(let k=0;k<a.rows.length;k+=12){ const s=a.rows.slice(k,k+12); yr.push([k/12+1, s.reduce((t,r)=>t+r[1],0), s.reduce((t,r)=>t+r[2],0), s.reduce((t,r)=>t+r[3],0), s[s.length-1][4]]); }
  h+=`<details class="ks-det"><summary>年ごとの返済表を見る</summary>${T([['年','返済額','元金','利息','残り'],...yr.map(r=>[r[0]+'年目',yen(r[1]),yen(r[2]),yen(r[3]),yen(r[4])])],'ks-num')}</details>`
    +NOTE('金利がずっと同じとして計算した目安です（1円未満は四捨五入）。ボーナス払い・手数料・保証料・団体信用生命保険は入れていません。');
  o.innerHTML=h;
}
C.push({id:'loan', ic:'🏠', name:'ローン返済', desc:'毎月の返済額・利息の総額・返済表・繰上げ返済でいくら得するか', col:'#43a047',
h:()=>`<div class="ks-form ks-grid">${IN('ksLp','借りる額（万円）','3000')}${IN('ksLr','金利（年%）','1.0')}${IN('ksLy','返済の年数','35')}${SEL('ksLt','返し方',[['eq','元利均等（毎月同じ額）'],['pr','元金均等（だんだん減る）']],'eq')}</div>
<details class="ks-det"><summary>繰上げ返済を試す</summary><div class="ks-form ks-grid">${IN('ksLpk','何年後に','10')}${IN('ksLpx','いくら（万円）','300')}${SEL('ksLpm','やり方',[['short','期間を短くする'],['less','毎月の額を減らす']],'short')}</div></details>
<div id="ksLout"></div>`, run:loanRun});

/* ───────── 3. 給料・手取り ───────── */
function kyuyoKojo(a){ if(a<=1900000) return Math.min(a,650000); if(a<=3600000) return a*0.3+80000; if(a<=6600000) return a*0.2+440000; if(a<=8500000) return a*0.1+1100000; return 1950000; }
function kisoKojo(s){ return s<=1320000?950000:s<=3360000?880000:s<=4890000?680000:s<=6550000?630000:s<=23500000?580000:0; }
function incomeTax(t){ if(t<=0) return 0; const tb=[[1950000,.05,0],[3300000,.10,97500],[6950000,.20,427500],[9000000,.23,636000],[18000000,.33,1536000],[40000000,.40,2796000],[Infinity,.45,4796000]]; const r=tb.find(x=>t<=x[0]); return Math.floor((t*r[1]-r[2])*1.021+1e-6); }
const KABE=[[1060000,'106万円','勤め先の社会保険に入る目安（月8.8万円・週20時間以上・従業員51人以上の会社など。なくしていく方向）'],[1100000,'110万円','住民税がかかり始める目安（市区町村で少し違う）'],[1230000,'123万円','親や配偶者の「扶養控除・配偶者控除」の対象から外れる'],[1300000,'130万円','家族の健康保険の扶養から外れ、自分で社会保険に入る（19〜22歳は150万円）'],[1500000,'150万円','配偶者特別控除（38万円）を満額で受けられる上限。大学生年代（19〜22歳）の特定親族特別控除も満額の上限'],[1600000,'160万円','本人に所得税がかかり始める'],[2016000,'201.6万円','配偶者特別控除がなくなる']];
function wageRun(){
  const mode=val('ksWm')||'hour';
  let gross;
  if(mode==='hour'){ const w=num('ksWh'); gross=w*(num('ksWn') + num('ksWo')*1.25 + num('ksWy')*1.25 + num('ksWk')*1.35); }
  else gross=num('ksWmon');
  const trans=num('ksWtr'), bonus=num('ksWb'), age=num('ksWage'), shaho=$('ksWsh').checked;
  const o=$('ksWout'); if(!(gross>0)){ o.innerHTML='<div class="ks-empty">時給と時間、または月給を入れてください</div>'; return; }
  const kenpo=shaho?0.0495+(age>=40&&age<65?0.008:0):0, nenkin=shaho?0.0915:0, koyo=0.0055;
  const mSoc=Math.round((gross+trans)*(kenpo+nenkin)) + Math.round((gross+trans)*koyo);
  const bSoc=Math.round(bonus*(kenpo+nenkin+koyo));
  const annual=gross*12+bonus, soc=mSoc*12+bSoc;
  const shotoku=Math.max(0, annual-kyuyoKojo(annual));
  const it=incomeTax(Math.max(0, Math.floor((shotoku-soc-kisoKojo(shotoku))/1000)*1000));
  const jt=shotoku<=450000?0:Math.floor(Math.max(0,shotoku-soc-430000)*0.10/100)*100+5000;
  const take=gross+trans-mSoc-it/12-jt/12;
  const next=KABE.find(k=>k[0]>annual);
  o.innerHTML=BIG('1か月の手取りの目安', yen(take), `年収 ${yen(annual)}（交通費は入れず）・年の手取り ${yen(take*12+bonus-bSoc)}`)
    +T([['1か月の内わけ','金額'],['総支給（交通費をのぞく）',yen(gross)],...(mode==='hour'?[['　うち残業・深夜・休日の割増分',yen(gross-num('ksWh')*(num('ksWn')+num('ksWo')+num('ksWy')+num('ksWk')))]]:[]),['交通費（税金はかからない）',yen(trans)],['社会保険料（健康保険・厚生年金・雇用保険）','−'+yen(mSoc)],['所得税（年の1/12）','−'+yen(it/12)],['住民税（年の1/12）','−'+yen(jt/12)],['<b>手取り</b>','<b>'+yen(take)+'</b>']],'ks-num')
    +SEC('年収の壁（2025年からの目安）')
    +`<div class="ks-kabe">${KABE.map(k=>`<div class="${annual>=k[0]?'over':''}${next===k?' next':''}"><b>${k[1]}</b><span>${k[2]}</span>${next===k?`<em>あと ${yen(k[0]-annual)}</em>`:annual>=k[0]?'<em>こえています</em>':''}</div>`).join('')}</div>`
    +NOTE('社会保険料は協会けんぽ・厚生年金の平均的な率（本人負担）で、所得税・住民税は1年分を12で割った目安です（扶養する家族の控除・生命保険料控除などは入れていません）。住民税は本当は前の年の収入で決まります。正確な額は給与明細・勤め先で確かめてください。残業が月60時間をこえた分は1.5倍、残業かつ深夜は1.5倍です。');
}
C.push({id:'wage', ic:'💴', name:'給料・手取り', desc:'時給・残業・深夜から支給額、社会保険と税金を引いた手取り、年収の壁', col:'#fb8c00',
h:()=>`${TABS('ksWm',[['hour','時給で'],['mon','月給で']],'hour')}
<div class="ks-form ks-grid" id="ksWhour">${IN('ksWh','時給（円）','1200')}${IN('ksWn','ふつうの時間（月）','80')}${IN('ksWo','残業（×1.25）','0')}${IN('ksWy','深夜22〜5時（×1.25）','0')}${IN('ksWk','法定休日（×1.35）','0')}</div>
<div class="ks-form ks-grid" id="ksWmonb">${IN('ksWmon','月の総支給（円）','250000')}</div>
<div class="ks-form ks-grid">${IN('ksWtr','交通費（月・円）','0')}${IN('ksWb','賞与（年の合計・円）','0')}${IN('ksWage','年齢','30')}<label class="ks-sw"><input type="checkbox" id="ksWsh" checked onchange="ksRun()"> 勤め先の社会保険に入っている</label></div>
<div id="ksWout"></div>`,
run:()=>{ const m=val('ksWm')||'hour'; $('ksWhour').style.display=m==='hour'?'':'none'; $('ksWmonb').style.display=m==='mon'?'':'none'; wageRun(); }});

/* ───────── 4. 積立・資産 ───────── */
function tsumiSim(init, mon, rY, yrs){
  const rm=Math.pow(1+rY/100,1/12)-1; let v=init, p=init; const rows=[];
  for(let m=1;m<=Math.round(yrs*12);m++){ v=v*(1+rm)+mon; p+=mon; if(m%12===0) rows.push([m/12,p,v]); }
  return {rows, v, p, rm};
}
function tsumiRun(){
  const init=num('ksTi')*10000, mon=num('ksTm'), r=num('ksTr'), y=Math.min(60,num('ksTy'));
  const o=$('ksTout'); if(!(y>0) || !(init>0||mon>0)){ o.innerHTML='<div class="ks-empty">毎月の積立と年数を入れてください</div>'; return; }
  const s=tsumiSim(init,mon,r,y); const gain=s.v-s.p;
  const mx=Math.max(...s.rows.map(x=>x[2]),1), W=320, H=150, bw=Math.max(2,(W-20)/s.rows.length-2);
  const bars=s.rows.map((x,i)=>{ const X=10+i*((W-20)/s.rows.length), hp=x[1]/mx*(H-20), hv=x[2]/mx*(H-20);
    return `<rect x="${X}" y="${H-hv}" width="${bw}" height="${Math.max(0,hv-hp)}" fill="#fb8c00"/><rect x="${X}" y="${H-hp}" width="${bw}" height="${hp}" fill="#1e88e5"/>`; }).join('');
  let h=BIG(`${fm(y,1)}年後の金額`, yen(s.v), `積み立てた元本 ${yen(s.p)} ＋ 増えた分 <b>${yen(gain)}</b>`)
    +`<svg class="ks-chart" viewBox="0 0 ${W} ${H+14}">${bars}<text x="10" y="${H+12}" font-size="10" fill="#888">1年</text><text x="${W-10}" y="${H+12}" font-size="10" fill="#888" text-anchor="end">${s.rows.length}年</text></svg>
    <div class="ks-legend"><span><i style="background:#1e88e5"></i>元本</span><span><i style="background:#fb8c00"></i>増えた分</span></div>`;
  const tg=num('ksTg')*10000;
  if(tg>0){ const N=Math.round(y*12), f=Math.pow(1+s.rm,N); const need=s.rm?(tg-init*f)*s.rm/(f-1):(tg-init)/N;
    h+=SEC('目標から逆算')+`<p class="ks-hl">${fm(y,1)}年で ${yen(tg)} にするには、毎月 <b>${need>0?yen(Math.ceil(need)):'0円（今の額で届きます）'}</b> の積立が必要です</p>`; }
  h+=`<details class="ks-det"><summary>年ごとの表を見る</summary>${T([['年','元本','金額','増えた分'],...s.rows.map(x=>[x[0]+'年',yen(x[1]),yen(x[2]),yen(x[2]-x[1])])],'ks-num')}</details>`
    +NOTE('毎年同じ利回りで、月ごとに複利で増えるとした目安です。実際の運用は増えたり減ったりします。税金（ふつうの口座は利益の約20%）・手数料は入れていません（NISAなら利益に税金はかかりません）。');
  o.innerHTML=h;
}
C.push({id:'tsumi', ic:'🏦', name:'積立・資産', desc:'毎月の積立で何年後にいくら？グラフ・目標額から毎月の額を逆算', col:'#8e24aa',
h:()=>`<div class="ks-form ks-grid">${IN('ksTi','今ある額（万円）','0')}${IN('ksTm','毎月の積立（円）','30000')}${IN('ksTr','利回り（年%）','3')}${IN('ksTy','年数','20')}${IN('ksTg','目標の額（万円・なくてもよい）','')}</div><div id="ksTout"></div>`, run:tsumiRun});

/* ───────── 5. お買い物・値引き ───────── */
function shopRun(){
  const tab=val('ksSt')||'off';
  ['off','cmp','tax'].forEach(t=>{ const e=$('ksS_'+t); if(e) e.style.display=t===tab?'':'none'; });
  const o=$('ksSout');
  if(tab==='off'){
    const p=num('ksSp'), d1=num('ksSd1'), d2=num('ksSd2'), yn=num('ksSyen'), pt=num('ksSpt');
    let x=p*(1-d1/100); x=x*(1-d2/100); x=Math.max(0,x-yn); const pay=Math.round(x); const back=Math.round(pay*pt/100); const real=pay-back;
    if(!(p>0)){ o.innerHTML='<div class="ks-empty">もとの値段を入れてください</div>'; return; }
    o.innerHTML=BIG('払う額', yen(pay), `${fm((1-pay/p)*100,1)}% 引き（${yen(p-pay)} 安い）`)
      +(pt?T([['ポイントも入れると',''],['もらえるポイント',fm(back,0)+'pt'],['実質の値段','<b>'+yen(real)+'</b>'],['実質の割引率','<b>'+fm((1-real/p)*100,1)+'%</b>']]):'')
      +(d1&&d2?NOTE(`${d1}%引きのさらに${d2}%引きは、${d1+d2}%引きではなく <b>${fm((1-(1-d1/100)*(1-d2/100))*100,2)}%引き</b> です。`):'')
      +NOTE('値引きの順番：%引き → %引き → 円引き。ポイントは払う額に対してもらえるとしています。');
  } else if(tab==='cmp'){
    const items=['A','B','C','D'].map(k=>({k, p:num('ksSc'+k+'p'), q:num('ksSc'+k+'q'), n:Math.max(1,num('ksSc'+k+'n')||1)})).filter(x=>x.p>0&&x.q>0);
    const per=val('ksScu')||'100';
    if(items.length<2){ o.innerHTML='<div class="ks-empty">2つ以上の値段と量を入れてください</div>'; return; }
    items.forEach(x=>x.u=x.p/(x.q*x.n)*(+per));
    const best=Math.min(...items.map(x=>x.u));
    o.innerHTML=T([['','値段','量×個数',`${per==='1'?'1':per}あたり`],...items.map(x=>[`<b>${x.k}</b>${x.u===best?' 🏆':''}`,yen(x.p),fm(x.q*x.n,2),(x.u===best?'<b>':'')+fm(x.u,2)+'円'+(x.u===best?'</b>':'')])],'ks-num')
      +items.filter(x=>x.u!==best).map(x=>`<p>${x.k} は いちばん得なものより <b>${fm((x.u/best-1)*100,1)}%</b> 高い</p>`).join('')
      +NOTE('量は同じ単位でそろえて入れます（g・mL・枚・個など）。「1あたり」は1g・1枚などの値段です。');
  } else {
    const p=num('ksSx'), r=+val('ksSxr')||10;
    if(!(p>0)){ o.innerHTML='<div class="ks-empty">金額を入れてください</div>'; return; }
    const inc=Math.floor(p*(100+r)/100), exc=Math.ceil(p*100/(100+r));
    o.innerHTML=T([['',`税率 ${r}%`],[`${yen(p)} が<b>税抜</b>なら`,`税込 <b>${yen(inc)}</b>（消費税 ${yen(inc-p)}）`],[`${yen(p)} が<b>税込</b>なら`,`税抜 <b>${yen(exc)}</b>（消費税 ${yen(p-exc)}）`]])
      +NOTE('8%は食べ物・飲み物（お酒と外食はのぞく）と定期購読の新聞。1円未満は、税込は切り捨て・税抜は切り上げで出しています（お店によって違うことがあります）。');
  }
}
C.push({id:'shop', ic:'🛒', name:'お買い物・値引き', desc:'重ねた割引・ポイント込みの実質価格・どっちが得（g単価）・税込税抜', col:'#e53935',
h:()=>`${TABS('ksSt',[['off','値引き・ポイント'],['cmp','どっちが得'],['tax','税込・税抜']],'off')}
<div class="ks-form ks-grid" id="ksS_off">${IN('ksSp','もとの値段（円）','10000')}${IN('ksSd1','割引①（%）','20')}${IN('ksSd2','さらに割引②（%）','10')}${IN('ksSyen','クーポン（円引き）','0')}${IN('ksSpt','ポイント還元（%）','0')}</div>
<div id="ksS_cmp">${SEL('ksScu','くらべる単位',[['100','100あたり（100g・100mLなど）'],['1','1あたり（1枚・1個など）']],'100')}
<div class="ks-cmp">${['A','B','C','D'].map((k,i)=>`<div class="ks-cmp-r"><b>${k}</b>${IN('ksSc'+k+'p','値段',i<2?(i?'398':'248'):'')}${IN('ksSc'+k+'q','量',i<2?(i?'1000':'500'):'')}${IN('ksSc'+k+'n','個数','1')}</div>`).join('')}</div></div>
<div class="ks-form ks-grid" id="ksS_tax">${IN('ksSx','金額（円）','1000')}${SEL('ksSxr','税率',[['10','10%'],['8','8%（軽減）']],'10')}</div>
<div id="ksSout"></div>`, run:shopRun});

/* ───────── 6. 日付・時間 ───────── */
const WD='日月火水木金土';
const pD=v=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||''); return m?new Date(+m[1],+m[2]-1,+m[3]):null; };
const ymd=d=>`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${WD[d.getDay()]}）`;
const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function holName(d){ try{ return typeof tbHolidays==='function' ? (tbHolidays(d.getFullYear())[isoD(d)]||'') : ''; }catch(_){ return ''; } }
const isOff=d=>d.getDay()===0||d.getDay()===6||!!holName(d)||(d.getMonth()===11&&d.getDate()>=29)||(d.getMonth()===0&&d.getDate()<=3&&$('ksDny')&&$('ksDny').checked);
function wareki(y,m,d){ const t=y*10000+m*100+d; const E=[[20190501,'令和',2019],[19890108,'平成',1989],[19261225,'昭和',1926],[19120730,'大正',1912],[18680125,'明治',1868]]; const e=E.find(x=>t>=x[0]); if(!e) return ''; const n=y-e[2]+1; return e[1]+(n===1?'元':n)+'年'; }
function dateRun(){
  const tab=val('ksDt')||'diff';
  ['diff','add','age','work'].forEach(t=>{ const e=$('ksD_'+t); if(e) e.style.display=t===tab?'':'none'; });
  const o=$('ksDout'); const yearEnd=$('ksDnyRow'); if(yearEnd) yearEnd.style.display=(tab==='diff'||tab==='add')?'':'none';
  if(tab==='diff'){
    const a=pD(val('ksDa')), b=pD(val('ksDb')); if(!a||!b){ o.innerHTML=''; return; }
    const s=a<=b?a:b, e=a<=b?b:a; const days=Math.round((e-s)/864e5);
    let biz=0; for(let d=new Date(s); d<=e; d.setDate(d.getDate()+1)) if(!isOff(d)) biz++;
    let y=e.getFullYear()-s.getFullYear(), m=e.getMonth()-s.getMonth(), dd=e.getDate()-s.getDate(); if(dd<0){ m--; dd+=new Date(e.getFullYear(),e.getMonth(),0).getDate(); } if(m<0){ y--; m+=12; }
    o.innerHTML=BIG('あいだの日数', fm(days,0)+'日', `両方の日を入れると ${fm(days+1,0)}日・${fm(days/7,1)}週`)
      +T([['',''],['年・月・日で',`${y?y+'年':''}${m?m+'か月':''}${dd}日`],['営業日（土日祝・年末年始をのぞく。両方の日を入れて）','<b>'+biz+'日</b>']]);
  } else if(tab==='add'){
    const a=pD(val('ksDs')), n=Math.round(num('ksDn')), biz=val('ksDk')==='biz'; if(!a){ o.innerHTML=''; return; }
    const d=new Date(a);
    if(biz){ let k=0; const st=n>=0?1:-1; while(k<Math.abs(n)){ d.setDate(d.getDate()+st); if(!isOff(d)) k++; } }
    else d.setDate(d.getDate()+n);
    const h=holName(d);
    o.innerHTML=BIG(`${n>=0?Math.abs(n)+(biz?'営業日後':'日後'):Math.abs(n)+(biz?'営業日前':'日前')}`, ymd(d), wareki(d.getFullYear(),d.getMonth()+1,d.getDate())+(h?'・'+h:''))
      +NOTE(biz?'営業日は土日・祝日・年末年始（12/29〜）をのぞいて数えています。':'「3日後」は次の日を1日目として数えます。');
  } else if(tab==='age'){
    const b=pD(val('ksDbd')), t=pD(val('ksDat'))||new Date(); if(!b){ o.innerHTML=''; return; }
    let age=t.getFullYear()-b.getFullYear(); if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate())) age--;
    const kazoe=t.getFullYear()-b.getFullYear()+1; const nb=new Date(t.getFullYear(),b.getMonth(),b.getDate()); if(nb<t) nb.setFullYear(nb.getFullYear()+1);
    o.innerHTML=BIG('満年齢', age+'歳', `数え年 ${kazoe}歳・${wareki(b.getFullYear(),b.getMonth()+1,b.getDate())}生まれ（${WD[b.getDay()]}曜日）`)
      +T([['',''],['生まれてから',fm(Math.round((t-b)/864e5),0)+'日'],['次の誕生日',`${ymd(nb)}（あと${Math.round((nb-t)/864e5)}日）`]]);
  } else {
    const rows=[1,2,3].map(i=>{ const s=val('ksDw'+i+'s'), e=val('ksDw'+i+'e'); const br=num('ksDw'+i+'b'); if(!/^\d{1,2}:\d{2}$/.test(s)||!/^\d{1,2}:\d{2}$/.test(e)) return null;
      const m=t=>{ const [h,mm]=t.split(':').map(Number); return h*60+mm; }; let a=m(s), b=m(e); if(b<=a) b+=1440;
      const night=(()=>{ let n=0; for(let x=a;x<b;x++){ const h=(x%1440)/60; if(h>=22||h<5) n++; } return n; })();
      return {i, s, e, mins:b-a-br, night:Math.max(0,night)}; }).filter(Boolean);
    if(!rows.length){ o.innerHTML='<div class="ks-empty">始まりと終わりの時刻を入れてください</div>'; return; }
    const tot=rows.reduce((t,r)=>t+r.mins,0), w=num('ksDwage');
    const hm=m=>`${Math.floor(m/60)}時間${m%60?m%60+'分':''}`;
    o.innerHTML=BIG('はたらいた時間の合計', hm(tot), `${fm(tot/60,2)}時間${w?`・${yen(tot/60*w)}（時給 ${yen(w)}）`:''}`)
      +T([['日','時刻','実働','うち深夜'],...rows.map(r=>[r.i+'日目',`${r.s}〜${r.e}`,hm(r.mins),r.night?hm(r.night):'—'])])
      +NOTE('終わりが始まりより早い時刻なら、夜中をまたいだとして数えます。深夜は22時〜翌5時（休憩は深夜の分から引いていません）。');
  }
}
C.push({id:'date', ic:'📅', name:'日付・時間', desc:'2つの日のあいだの日数・営業日・何日後・年齢・勤務時間の合計', col:'#00897b',
h:()=>`${TABS('ksDt',[['diff','日数'],['add','何日後'],['age','年齢'],['work','勤務時間']],'diff')}
<div class="ks-form ks-grid" id="ksD_diff">${IN('ksDa','はじめの日',todayStr(),{type:'date'})}${IN('ksDb','終わりの日',(new Date().getFullYear())+'-12-31',{type:'date'})}</div>
<div class="ks-form ks-grid" id="ksD_add">${IN('ksDs','もとの日',todayStr(),{type:'date'})}${IN('ksDn','日数（前はマイナス）','30',{im:'numeric'})}${SEL('ksDk','数え方',[['cal','カレンダーどおり'],['biz','営業日で']],'cal')}</div>
<div class="ks-form ks-grid" id="ksD_age">${IN('ksDbd','生まれた日','1990-04-01',{type:'date'})}${IN('ksDat','この日の年齢（空なら今日）','',{type:'date'})}</div>
<div class="ks-form" id="ksD_work">${[1,2,3].map(i=>`<div class="ks-grid3">${IN('ksDw'+i+'s',i+'日目 始め',i===1?'9:00':'',{im:'text',ph:'9:00'})}${IN('ksDw'+i+'e','終わり',i===1?'18:00':'',{im:'text',ph:'18:00'})}${IN('ksDw'+i+'b','休憩（分）',i===1?'60':'0',{im:'numeric'})}</div>`).join('')}<div class="ks-grid">${IN('ksDwage','時給（なくてもよい）','')}</div></div>
<div class="ks-form" id="ksDnyRow"><label class="ks-sw"><input type="checkbox" id="ksDny" checked onchange="ksRun()"> 1月1〜3日も休みにする</label></div>
<div id="ksDout"></div>`, run:dateRun});

/* ───────── 7. 勾配・三角 ───────── */
const DEG=180/Math.PI;
function slopeRun(){
  const tab=val('ksGt')||'grad';
  ['grad','tri','sq'].forEach(t=>{ const e=$('ksG_'+t); if(e) e.style.display=t===tab?'':'none'; });
  const o=$('ksGout');
  if(tab==='grad'){
    const x=num('ksGv'), k=val('ksGk')||'sun'; let tn;
    if(k==='sun') tn=x/10; else if(k==='pct') tn=x/100; else if(k==='deg') tn=Math.tan(x/DEG); else tn=x>0?1/x:NaN;
    if(!isFinite(tn) || tn<0 || (k==='deg' && x>=90)){ o.innerHTML='<div class="ks-empty">勾配を入れてください</div>'; return; }
    const L=num('ksGL');
    o.innerHTML=T([['表し方','値'],['寸勾配',fm(tn*10,2)+'寸'],['パーセント',fm(tn*100,2)+'%'],['角度',fm(Math.atan(tn)*DEG,2)+'°'],['比（1：n）',tn?'1：'+fm(1/tn,2):'—'],['1mあたりの上がり',fm(tn*1000,1)+'mm']])
      +(L>0?T([['水平の長さ '+fm(L,3)+' のとき',''],['高さの差','<b>'+fm(L*tn,3)+'</b>'],['斜めの長さ','<b>'+fm(L*Math.sqrt(1+tn*tn),3)+'</b>']]):'')
      +NOTE('寸勾配は水平1尺（10寸）に対して何寸上がるか（4寸勾配＝4/10＝40%＝約21.8°）。屋根は寸勾配、道路やスロープは%、排水管は1/100 などで表すことが多いです。車いすのスロープは1/12（約8.3%）以下が目安。');
  } else if(tab==='tri'){
    const a=num('ksGa'), b=num('ksGb'), c=num('ksGc'); let A=a,B=b,Cc=c, msg='';
    if(a>0&&b>0) Cc=Math.hypot(a,b); else if(a>0&&c>0) B=c>a?Math.sqrt(c*c-a*a):NaN; else if(b>0&&c>0) A=c>b?Math.sqrt(c*c-b*b):NaN; else msg='2つの辺を入れてください';
    if(msg||!isFinite(A)||!isFinite(B)){ o.innerHTML=`<div class="ks-empty">${msg||'斜辺はほかの辺より長くしてください'}</div>`; return; }
    o.innerHTML=T([['','値'],['底辺',fm(A,4)],['高さ',fm(B,4)],['斜辺','<b>'+fm(Cc,4)+'</b>'],['底辺側の角度',fm(Math.atan(B/A)*DEG,2)+'°'],['上の角度',fm(Math.atan(A/B)*DEG,2)+'°'],['面積',fm(A*B/2,4)],['勾配',fm(B/A*100,2)+'%（'+fm(B/A*10,2)+'寸）']])
      +NOTE('3つの辺のうち2つを入れると、残りを三平方の定理（底辺²＋高さ²＝斜辺²）で出します。入れていない欄は空のままにしてください。');
  } else {
    const k=num('ksGk3'), w=num('ksGw'), d=num('ksGd');
    o.innerHTML=(k>0?T([['3：4：5で直角を出す',''],['一方の辺','<b>'+fm(3*k,3)+'</b>'],['もう一方の辺','<b>'+fm(4*k,3)+'</b>'],['この2点の間が','<b>'+fm(5*k,3)+'</b> になれば直角']]):'')
      +(w>0&&d>0?T([['長方形の対角線（直角の確かめ）',''],['対角線の長さ','<b>'+fm(Math.hypot(w,d),4)+'</b>'],['2本の対角線が同じ長さなら','4つの角は直角']]):'')
      +NOTE('基礎・ブロック・花壇などで直角を出すとき、角から3と4の長さに印を付け、その間がちょうど5になるように合わせます（大工さんの「さしがね」の考え方）。');
  }
}
C.push({id:'slope', ic:'📐', name:'勾配・三角', desc:'寸勾配・%・角度の換算、高さの差、直角三角形、3:4:5で直角を出す', col:'#6d4c41',
h:()=>`${TABS('ksGt',[['grad','勾配の換算'],['tri','直角三角形'],['sq','直角を出す']],'grad')}
<div class="ks-form ks-grid" id="ksG_grad">${IN('ksGv','勾配','4')}${SEL('ksGk','入れた形',[['sun','寸勾配（寸）'],['pct','パーセント（%）'],['deg','角度（°）'],['rat','比 1：n の n']],'sun')}${IN('ksGL','水平の長さ（なくてもよい）','')}</div>
<div class="ks-form ks-grid" id="ksG_tri">${IN('ksGa','底辺','3')}${IN('ksGb','高さ','4')}${IN('ksGc','斜辺','')}</div>
<div class="ks-form ks-grid" id="ksG_sq">${IN('ksGk3','1目もりの長さ（例 1m・30cm）','1')}<span></span>${IN('ksGw','長方形の縦','')}${IN('ksGd','横','')}</div>
<div id="ksGout"></div>`, run:slopeRun});

/* ───────── 8. ドライブ費用・電気代 ───────── */
function carRun(){
  const tab=val('ksCt')||'drive';
  ['drive','elec','cmp'].forEach(t=>{ const e=$('ksC_'+t); if(e) e.style.display=t===tab?'':'none'; });
  const o=$('ksCout');
  if(tab==='drive'){
    const km=num('ksCkm')*($('ksCrt').checked?2:1), eff=num('ksCeff'), pr=num('ksCpr'), hw=num('ksChw')*($('ksCrt').checked?2:1), pk=num('ksCpk'), n=Math.max(1,Math.round(num('ksCn')||1));
    if(!(km>0&&eff>0)){ o.innerHTML='<div class="ks-empty">距離と燃費を入れてください</div>'; return; }
    const L=km/eff, gas=L*pr, tot=gas+hw+pk;
    o.innerHTML=BIG(n>1?'1人あたり':'合計', yen(Math.ceil(tot/n)), n>1?`合計 ${yen(tot)} を ${n}人で`:'')
      +T([['内わけ',''],['走る距離',fm(km,1)+'km'],['ガソリン',fm(L,1)+'L × '+yen(pr)+' ＝ '+yen(gas)],['高速代',yen(hw)],['駐車場など',yen(pk)],['<b>合計</b>','<b>'+yen(tot)+'</b>']])
      +NOTE('1人あたりは1円未満を切り上げ。運転する人の分を少なくするなど、分け方はみんなで決めましょう。燃費はカタログより1〜3割悪くなることが多いです。');
  } else if(tab==='elec'){
    const w=num('ksCw'), h=num('ksCh'), u=num('ksCu'), d=num('ksCd')||30;
    if(!(w>0&&h>0)){ o.innerHTML='<div class="ks-empty">消費電力と使う時間を入れてください</div>'; return; }
    const day=w/1000*h*u;
    o.innerHTML=T([['','電気代'],['1時間',yen(w/1000*u)],['1日（'+fm(h,1)+'時間）',yen(day)],['1か月（'+d+'日）','<b>'+yen(day*d)+'</b>'],['1年','<b>'+yen(day*365)+'</b>']],'ks-num')
      +NOTE('電気代 ＝ 消費電力(kW) × 時間 × 1kWhの単価。単価は全国家庭電気製品公正取引協議会の目安 31円/kWh（2022年から）。実際の単価は電気の明細の「料金 ÷ 使用量」で分かります。エアコンなどは強さで消費電力が変わります。');
  } else {
    const a=num('ksCa'), b=num('ksCb'), u=num('ksCu2'), price=num('ksCp');
    if(!(a>0&&b>=0)){ o.innerHTML='<div class="ks-empty">今の家電と新しい家電の年間消費電力量を入れてください</div>'; return; }
    const save=(a-b)*u;
    o.innerHTML=BIG('1年で安くなる電気代', yen(save), `10年で ${yen(save*10)}`)
      +(price>0&&save>0?`<p class="ks-hl">本体の値段 ${yen(price)} は、電気代の差だけで <b>${fm(price/save,1)}年</b> で取り戻せます</p>`:'')
      +NOTE('年間消費電力量（kWh/年）は、カタログや本体のシール（省エネラベル）に書いてあります。冷蔵庫は10年前の物より4割ほど少ないことが多いです。');
  }
}
C.push({id:'car', ic:'🚗', name:'ドライブ費用・電気代', desc:'ガソリン代と高速代の割り勘、家電の電気代、買い替えで得する額', col:'#546e7a',
h:()=>`${TABS('ksCt',[['drive','ドライブ費用'],['elec','電気代'],['cmp','買い替え比較']],'drive')}
<div class="ks-form ks-grid" id="ksC_drive">${IN('ksCkm','距離（片道km）','120')}<label class="ks-sw"><input type="checkbox" id="ksCrt" checked onchange="ksRun()"> 往復</label>${IN('ksCeff','燃費（km/L）','15')}${IN('ksCpr','ガソリン（円/L）','170')}${IN('ksChw','高速代（片道）','2500')}${IN('ksCpk','駐車場など','1000')}${IN('ksCn','人数','3',{im:'numeric'})}</div>
<div class="ks-form ks-grid" id="ksC_elec">${IN('ksCw','消費電力（W）','600')}${IN('ksCh','1日に使う時間','8')}${IN('ksCu','単価（円/kWh）','31')}${IN('ksCd','1か月に使う日数','30',{im:'numeric'})}</div>
<div class="ks-form ks-grid" id="ksC_cmp">${IN('ksCa','今の家電（kWh/年）','450')}${IN('ksCb','新しい家電（kWh/年）','280')}${IN('ksCu2','単価（円/kWh）','31')}${IN('ksCp','新しい家電の値段（円）','150000')}</div>
<div id="ksCout"></div>`, run:carRun});

/* ── 画面 ── */
const KS_CSS=`
#keisanOverlay .ks-modal{ display:flex; flex-direction:column; }
.ks-list{ flex:1; min-height:0; overflow:auto; padding:12px; }
.ks-grid8{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
.ks-card{ position:relative; text-align:left; padding:12px; border-radius:14px; border:1px solid rgba(120,132,156,.3); border-top:5px solid var(--c); background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; min-height:118px; display:flex; flex-direction:column; gap:4px; }
.ks-card .no{ position:absolute; top:8px; right:10px; font-size:12px; font-weight:bold; color:var(--c); }
.ks-card .ic{ font-size:30px; line-height:1.1; } .ks-card b{ font-size:15.5px; } .ks-card small{ font-size:11.5px; line-height:1.45; color:var(--text-light,#777); }
.ks-card.last{ box-shadow:0 0 0 2px var(--c); }
.ks-body{ padding:10px 14px calc(16px + var(--safe-bottom,0px)); overflow:auto; font-size:15px; line-height:1.7; color:var(--text,#222); }
.ks-body h4{ font-size:15px; color:var(--acc); margin:16px 0 6px; border-left:4px solid var(--acc); padding-left:8px; }
.ks-body p{ margin:6px 0; }
.ks-chips{ display:flex; flex-wrap:wrap; gap:6px; margin:2px 0 8px; }
.ks-chips button{ height:36px; padding:0 12px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13.5px; font-weight:bold; cursor:pointer; }
.ks-chips button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.ks-form label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:6px 0; }
.ks-form input:not([type=checkbox]),.ks-form select{ display:block; width:100%; box-sizing:border-box; margin-top:3px; height:44px; padding:0 10px; font-size:17px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ks-grid{ display:grid; grid-template-columns:1fr 1fr; gap:0 10px; } .ks-grid>*,.ks-grid3>*{ min-width:0; } .ks-form input[type=date]{ min-width:0; } .ks-grid3{ display:grid; grid-template-columns:1.2fr 1fr .8fr; gap:0 8px; }
.ks-form label.ks-sw{ display:flex; align-items:center; gap:8px; color:var(--text,#222); font-size:14px; margin-top:22px; } .ks-sw input{ width:20px; height:20px; }
.ks-cmp-r{ display:grid; grid-template-columns:22px 1.2fr 1fr .7fr; gap:0 8px; align-items:end; } .ks-cmp-r>b{ padding-bottom:12px; font-size:16px; }
.ks-cmp-r label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:6px 0; } .ks-cmp-r input{ display:block; width:100%; box-sizing:border-box; margin-top:3px; height:42px; padding:0 8px; font-size:16px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ks-big{ margin:12px 0 8px; padding:12px; border-radius:12px; background:color-mix(in srgb, var(--acc) 10%, transparent); text-align:center; }
.ks-big-l{ font-size:13px; color:var(--text-light,#777); font-weight:bold; } .ks-big-v{ font-size:28px; font-weight:bold; color:var(--acc); line-height:1.3; word-break:break-all; } .ks-big-s{ font-size:12.5px; color:var(--text-light,#777); }
.ks-t{ width:100%; border-collapse:collapse; margin:8px 0; font-size:14px; }
.ks-t th,.ks-t td{ border:1px solid rgba(120,132,156,.35); padding:6px 7px; text-align:left; vertical-align:top; } .ks-t th{ background:rgba(120,132,156,.12); font-size:12.5px; }
.ks-num td:not(:first-child){ text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
.ks-note{ margin:8px 0; padding:8px 10px; border-radius:8px; background:rgba(120,132,156,.1); font-size:12.5px; line-height:1.6; }
.ks-hl{ padding:8px 10px; border-radius:8px; background:rgba(255,213,79,.25); }
.ks-empty{ text-align:center; color:var(--text-light,#888); padding:20px 8px; }
.ks-det{ margin:10px 0; } .ks-det summary{ cursor:pointer; font-weight:bold; color:var(--acc); padding:6px 0; }
.ks-bar{ display:flex; height:22px; border-radius:6px; overflow:hidden; font-size:11px; color:#fff; font-weight:bold; margin:6px 0; } .ks-bar span{ display:flex; align-items:center; padding-left:6px; white-space:nowrap; overflow:hidden; } .ks-bar .p{ background:#1e88e5; } .ks-bar .i{ background:#fb8c00; }
.ks-chart{ width:100%; height:auto; max-height:200px; margin-top:4px; } .ks-legend{ display:flex; gap:14px; font-size:12px; color:var(--text-light,#777); justify-content:center; } .ks-legend i{ display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:4px; vertical-align:-1px; }
.ks-ulist{ display:flex; flex-direction:column; gap:4px; margin-top:8px; }
.ks-urow{ display:flex; align-items:baseline; gap:10px; padding:9px 12px; border-radius:10px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; text-align:left; }
.ks-urow .v{ flex:1; font-size:18px; font-weight:bold; font-variant-numeric:tabular-nums; word-break:break-all; } .ks-urow .u{ font-size:13px; color:var(--text-light,#777); white-space:nowrap; }
.ks-urow.me{ background:color-mix(in srgb, var(--acc) 12%, transparent); border-color:var(--acc); }
.ks-kabe>div{ display:flex; flex-wrap:wrap; gap:2px 10px; align-items:baseline; padding:6px 8px; border-left:4px solid rgba(120,132,156,.4); margin:4px 0; font-size:13px; }
.ks-kabe b{ min-width:66px; } .ks-kabe span{ flex:1; min-width:180px; color:var(--text-light,#666); } .ks-kabe em{ font-style:normal; font-weight:bold; font-size:12px; }
.ks-kabe .over{ opacity:.55; } .ks-kabe .next{ border-left-color:#fb8c00; background:rgba(251,140,0,.08); } .ks-kabe .next em{ color:#e65100; }
.ks-acts{ display:flex; gap:6px; margin:14px 0 4px; } .ks-acts button{ flex:1; height:42px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13.5px; font-weight:bold; cursor:pointer; }
`;
function ksEnsureDom(){
  if($('keisanOverlay')) return;
  const st=document.createElement('style'); st.id='ksStyle'; st.textContent=KS_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="keisanOverlay">
  <div class="modal vol-modal ks-modal" style="position:relative">
    <div class="modal-header"><span>🔢 便利計算</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="modal-close" onclick="closeKeisan()" aria-label="閉じる">✕</button></span></div>
    <div class="ks-list" id="ksList"></div>
  </div>
</div>
<div class="modal-overlay" id="ksViewOverlay" onclick="if(event.target===this)ksCloseView()">
  <div class="modal"><div class="modal-header"><span id="ksViewHdr"></span><button class="modal-close" onclick="ksCloseView()" aria-label="閉じる">✕</button></div>
    <div class="ks-body" id="ksViewBody"></div></div>
</div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openKeisan(id){
  ksEnsureDom(); ksLoad();
  $('ksList').innerHTML=`<div class="ks-grid8">${C.map((c,i)=>`<button class="ks-card${ks.last===c.id?' last':''}" style="--c:${c.col}" data-id="${c.id}" onclick="ksOpen('${c.id}')"><span class="no">${i+1}</span><span class="ic">${c.ic}</span><b>${c.name}</b><small>${c.desc}</small></button>`).join('')}</div>`
    +NOTE('入れた数はこの端末に残るので、次に開いたときも続きから使えます。税金・保険料などの率は目安です。');
  openDlg('keisanOverlay');
  if(typeof id==='string' && C.some(c=>c.id===id)) ksOpen(id);
}
function closeKeisan(){ if(!$('keisanOverlay') || !isDlgOpen('keisanOverlay')) return; ksCloseView(); closeDlg('keisanOverlay'); }
function ksOpen(id){
  const c=C.find(x=>x.id===id); if(!c) return;
  ksCur=id; ks.last=id; ksSave();
  document.querySelectorAll('#ksList .ks-card').forEach(b=>b.classList.toggle('last', b.dataset.id===id));
  $('ksViewHdr').textContent=c.ic+' '+c.name;
  $('ksViewBody').innerHTML=c.h()+`<div class="ks-acts"><button onclick="ksClear()">↺ はじめの数に戻す</button><button onclick="ksPrint()">🖨 印刷</button></div>`;
  $('ksViewBody').querySelectorAll('input,select').forEach(e=>{ if(!e.id || !(e.id in ks.v)) return; if(e.type==='checkbox') e.checked=ks.v[e.id]==='1'; else if(e.tagName!=='SELECT' || [...e.options].some(o=>o.value===ks.v[e.id])) e.value=ks.v[e.id]; });
  if(!isDlgOpen('ksViewOverlay')) openDlg('ksViewOverlay', ()=>{ ksCur=null; }); else $('ksViewBody').scrollTop=0;
  ksRun(true);
}
function ksCloseView(){ if($('ksViewOverlay') && isDlgOpen('ksViewOverlay')) closeDlg('ksViewOverlay', ()=>{ ksCur=null; }); }
function ksRun(noSave){
  const c=C.find(x=>x.id===ksCur); if(!c) return;
  if(noSave!==true){ $('ksViewBody').querySelectorAll('input,select').forEach(e=>{ if(!e.id) return; ks.v[e.id]=e.type==='checkbox'?(e.checked?'1':'0'):String(e.value).slice(0,40); }); ksSave(); }
  ksSyncTabs();
  try{ c.run(); }catch(err){ console.error(err); }
}
function ksClear(){
  const c=C.find(x=>x.id===ksCur); if(!c) return;
  $('ksViewBody').querySelectorAll('input,select').forEach(e=>{ if(e.id) delete ks.v[e.id]; }); ksSave();
  ksOpen(c.id); toast('はじめの数に戻しました');
}
function ksCopyVal(btn){ const t=btn.querySelector('.v').textContent.replace(/,/g,''); if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast(t+' をコピーしました'),()=>{}); }
function ksPrint(){
  const c=C.find(x=>x.id===ksCur); if(!c) return;
  const body=$('ksViewBody').cloneNode(true);
  body.querySelectorAll('input').forEach(e=>{ if(e.type==='hidden'){ e.remove(); return; } const s=document.createElement('span'); s.className='ks-pv'; s.textContent=e.type==='checkbox'?(e.checked?'☑':'☐'):e.value; e.replaceWith(s); });
  body.querySelectorAll('select').forEach(e=>{ const s=document.createElement('span'); s.textContent=e.options[e.selectedIndex]?e.options[e.selectedIndex].text:''; e.replaceWith(s); });
  body.querySelectorAll('.ks-acts,.ks-chips,[style*="display: none"]').forEach(e=>e.remove());
  body.querySelectorAll('details').forEach(d=>d.setAttribute('open',''));
  const html=`<div class="ks-pr"><h1>${esc(c.ic+' '+c.name)}</h1>${body.innerHTML}</div><style>#printArea .ks-pr{font-family:sans-serif;color:#000;font-size:10.5pt;line-height:1.6}#printArea .ks-pr h1{font-size:15pt;margin:0 0 3mm}#printArea .ks-pr table{width:100%;border-collapse:collapse;margin:2mm 0}#printArea .ks-pr th,#printArea .ks-pr td{border:1px solid #999;padding:1mm 2mm;text-align:left}#printArea .ks-pr label{display:inline-block;margin:0 5mm 1mm 0;font-size:9.5pt}#printArea .ks-pr .ks-pv{font-weight:bold;margin-left:2mm}</style>`;
  if(typeof opBuild==='function' && typeof opPrint==='function') opPrint(opBuild(html, true)); else window.print();
}

Object.assign(window, { openKeisan, closeKeisan, ksOpen, ksCloseView, ksRun, ksTab, ksClear, ksCopyVal, ksPrint,
  ksCalcs:()=>C.map(c=>c.id), ksState:()=>({cur:ksCur, last:ks.last, v:Object.assign({},ks.v)}),
  ksLoanSim:loanSim, ksTsumiSim:tsumiSim, ksIncomeTax:incomeTax, ksKyuyoKojo:kyuyoKojo, ksUnits:UNITS });
})();
