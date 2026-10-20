/* 🚛 生コン打設の段取り（v561。表電卓の道具。apps/dasetsu/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   ・📐 数量：部位ごと（スラブ・土間／梁／柱／壁／基礎／布基礎／円柱・杭／㎥で直接）に寸法を入れると、式と㎥が出る。
   ・🚛 発注と配車：割増し（ロス）→ 発注量（0.25㎥単位などで切り上げ）→ 台数（1台に積む量）→ 最後の1台、
     打設のはやさ（㎥/時）と開始の時刻から、1台ずつの 練混ぜ・工場を出る・現場に着く・荷卸し の時刻と累計（配車表）。
     昼休みには次の車を始めない。往復と洗いの時間から「車は何台で回せるか」も出す（台数を決めると待ちも出す）。
   ・🎯 終わりの時刻と車の台数（v562）：終わりたい時刻から、回す車の台数（とペース）を逆算する。間に合わないときは要るはやさも。
     車の台数ごとの終わりの予定を並べ、押すと配車表がその台数になる。打設のはやさは ㎥/時 でも 台/時（時間○台）でも入れられる。
   ・1台の取り時間（v562）：1台を何分で取るか（荷卸しの時間）でも はやさを決められる。そのときは どの車も同じ分で並べる。
   ・時刻は 自前の窓（時・分を押して ✓ 決定）で決める（端末の時刻の窓では 決められないことがあったため。v562）。
   ・時間の目安：JIS A 5308 の運搬時間（練混ぜ〜荷卸し地点に着くまで 1.5時間）と、
     JASS 5 の 練混ぜ〜打込み終了（外気温 25℃未満 120分・25℃以上 90分）をこえる車があれば知らせる。
   ・📋 コピー・📤 共有・▦ 表に入れる。現場（打設）ごとに保存できる。中身は excalc_dasetsu（この端末の中だけ）。 */
(function(){
const DS_KEY='excalc_dasetsu', MAX_JOBS=30, MAX_PARTS=60;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,n);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const m3=v=>(Math.round(v*100)/100).toFixed(2);
const m3s=v=>{ const t=(Math.round(v*100)/100).toFixed(2); return t.replace(/\.?0+$/,'')||'0'; };
const f1=v=>String(Math.round(v*1000)/1000);

/* 部位の形。f：[キー, 名前, 単位, はじめの値]。vol：㎥ */
const PT={
  direct:{n:'㎥で入れる', ic:'🧮', f:[['v','数量','㎥','']], vol:p=>p.v, ex:p=>m3s(p.v)+'㎥'},
  slab:{n:'スラブ・土間', ic:'⬛', f:[['l','長さ','m',''],['w','幅','m',''],['t','厚さ','mm','150']], vol:p=>p.l*p.w*p.t/1000, ex:p=>f1(p.l)+'×'+f1(p.w)+'×'+f1(p.t/1000)},
  beam:{n:'梁', ic:'➖', f:[['b','幅','mm',''],['h','せい','mm',''],['l','長さ','m',''],['n','本数','本','1']], vol:p=>p.b/1000*p.h/1000*p.l*p.n, ex:p=>f1(p.b/1000)+'×'+f1(p.h/1000)+'×'+f1(p.l)+'×'+f1(p.n)+'本'},
  col:{n:'柱', ic:'▮', f:[['b','幅','mm',''],['d','奥行','mm',''],['h','高さ','m',''],['n','本数','本','1']], vol:p=>p.b/1000*p.d/1000*p.h*p.n, ex:p=>f1(p.b/1000)+'×'+f1(p.d/1000)+'×'+f1(p.h)+'×'+f1(p.n)+'本'},
  wall:{n:'壁', ic:'▯', f:[['l','長さ','m',''],['h','高さ','m',''],['t','厚さ','mm','180'],['n','枚数','枚','1']], vol:p=>p.l*p.h*p.t/1000*p.n, ex:p=>f1(p.l)+'×'+f1(p.h)+'×'+f1(p.t/1000)+'×'+f1(p.n)+'枚'},
  found:{n:'基礎（箱形）', ic:'🟫', f:[['l','長さ','m',''],['w','幅','m',''],['h','高さ','m',''],['n','個数','個','1']], vol:p=>p.l*p.w*p.h*p.n, ex:p=>f1(p.l)+'×'+f1(p.w)+'×'+f1(p.h)+'×'+f1(p.n)+'個'},
  nuno:{n:'布基礎', ic:'⊥', f:[['l','長さ（合計）','m',''],['bw','底盤の幅','mm','450'],['bt','底盤の厚さ','mm','150'],['rw','立上りの幅','mm','150'],['rh','立上りの高さ','mm','400']], vol:p=>p.l*(p.bw*p.bt+p.rw*p.rh)/1e6, ex:p=>f1(p.l)+'×('+f1(p.bw/1000)+'×'+f1(p.bt/1000)+'＋'+f1(p.rw/1000)+'×'+f1(p.rh/1000)+')'},
  cyl:{n:'円柱・杭', ic:'⬤', f:[['d','直径','mm',''],['h','高さ・長さ','m',''],['n','本数','本','1']], vol:p=>Math.PI*Math.pow(p.d/2000,2)*p.h*p.n, ex:p=>'π×'+f1(p.d/2000)+'²×'+f1(p.h)+'×'+f1(p.n)+'本'},
};
const PT_KEYS=Object.keys(PT);
const LOSS=[0,3,5,10], UNITS=[0.1,0.25,0.5,1], LOADS=[4.5,4.25,4,3,2,1], RATES=[10,15,20,30,40], CARS_H=[2,3,4,5,6,8], MIN_PER=[10,12,15,20,25,30];
const PACE_BY=[['m3','㎥/時'],['car','台/時（時間○台）'],['min','1台の取り時間']];
const f1x=v=>(Math.round(v*10)/10).toFixed(1);

let st=null, pop=null, showMix=false, moreOpen=false;

/* ───────── 読み書き ───────── */
function newPart(type){ const t=PT[type]?type:'direct'; const vals={}; PT[t].f.forEach(f=>vals[f[0]]=f[3]); return {id:uid('p'), type:t, name:'', vals}; }
function blankJob(name, from){
  const d=new Date();
  const j={id:uid('j'), name:name||('打設 '+(d.getMonth()+1)+'/'+d.getDate()), upd:Date.now(), parts:[newPart('direct')],
    loss:5, unit:0.25, load:4.25, even:true, rate:20, rateBy:'m3', carsH:5, minPer:15, start:'08:30', travel:30, mix:10, wash:10, early:5, lunch:true, l1:'12:00', l2:'13:00', fleet:0, hot:false, goal:''};
  if(from) ['loss','unit','load','even','rate','rateBy','carsH','minPer','start','travel','mix','wash','early','lunch','l1','l2','fleet','hot'].forEach(k=>j[k]=from[k]);
  return j;
}
const num=(v,lo,hi,d)=>{ const n=+v; return (isFinite(n)&&n>=lo&&n<=hi)?n:d; };
const tm=(v,d)=>/^([01]?\d|2[0-3]):[0-5]\d$/.test(String(v||''))?String(v).padStart(5,'0'):d;
function clean(o){
  const s={v:1, cur:'', jobs:[]};
  ((o&&Array.isArray(o.jobs))?o.jobs:[]).slice(0,MAX_JOBS).forEach(x=>{
    if(!x||typeof x!=='object') return;
    const j=blankJob(line(x.name,40)||'打設');
    j.id=(typeof x.id==='string'&&x.id)?x.id.slice(0,40):j.id; j.upd=+x.upd||Date.now();
    const parts=(Array.isArray(x.parts)?x.parts:[]).slice(0,MAX_PARTS).map(p=>{
      if(!p||typeof p!=='object'||!PT[p.type]) return null;
      const q=newPart(p.type); q.id=(typeof p.id==='string'&&p.id)?p.id.slice(0,40):q.id; q.name=line(p.name,30);
      PT[p.type].f.forEach(f=>{ const v=p.vals&&p.vals[f[0]]; if(v!=null) q.vals[f[0]]=line(v,20); });
      return q;
    }).filter(Boolean);
    j.parts=parts.length?parts:[newPart('direct')];
    j.loss=num(x.loss,0,50,5); j.unit=UNITS.includes(+x.unit)?+x.unit:0.25; j.load=num(x.load,0.25,12,4.25); j.even=x.even!==false;
    j.rate=num(x.rate,1,300,20); j.rateBy=PACE_BY.some(u=>u[0]===x.rateBy)?x.rateBy:'m3'; j.carsH=num(x.carsH,0.5,60,5); j.minPer=num(x.minPer,1,180,15); j.goal=tm(x.goal,''); j.start=tm(x.start,'08:30'); j.travel=num(x.travel,0,300,30); j.mix=num(x.mix,0,120,10); j.wash=num(x.wash,0,180,10); j.early=num(x.early,0,60,5);
    j.lunch=x.lunch!==false; j.l1=tm(x.l1,'12:00'); j.l2=tm(x.l2,'13:00'); j.fleet=Math.round(num(x.fleet,0,99,0)); j.hot=x.hot===true;
    if(!s.jobs.some(y=>y.id===j.id)) s.jobs.push(j);
  });
  s.cur=(o&&typeof o.cur==='string'&&s.jobs.some(j=>j.id===o.cur))?o.cur:(s.jobs[0]?s.jobs[0].id:'');
  return s;
}
function load(){ let o=null; try{ o=JSON.parse(localStorage.getItem(DS_KEY)||'null'); }catch(_){} st=clean(o); if(!st.jobs.length){ const j=blankJob(); st.jobs.push(j); st.cur=j.id; } }
function save(){ try{ localStorage.setItem(DS_KEY, JSON.stringify(st)); }catch(_){ toast('保存できませんでした（端末の空きが足りないかもしれません）'); } }
const job=()=>st.jobs.find(j=>j.id===st.cur)||st.jobs[0];
let saveT=0;
function touch(){ job().upd=Date.now(); clearTimeout(saveT); saveT=setTimeout(save, 300); }

/* ───────── 計算 ───────── */
function partVals(p){ const o={}; PT[p.type].f.forEach(f=>{ const s=String(p.vals[f[0]]==null?'':p.vals[f[0]]).trim(); o[f[0]]=s===''&&(f[0]==='n')?1:toolNum(s); }); return o; }
function partVol(p){ const o=partVals(p), v=PT[p.type].vol(o); return (isFinite(v)&&v>0)?v:0; }
const toMin=t=>{ const m=/^(\d+):(\d+)$/.exec(t||''); return m?(+m[1])*60+(+m[2]):0; };
const hm=x=>{ let m=Math.round(x); const neg=m<0; m=Math.abs(m); if(!neg && m>=1440) return '翌'+hm(m-1440); const h=Math.floor(m/60)%48; return (neg?'-':'')+h+':'+String(m%60).padStart(2,'0'); };
const hhmm=m=>{ m=((Math.round(m)%1440)+1440)%1440; return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); };
/* 打設のはやさ（㎥/時）。「時間○台」で入れたときは 1台に積む量をかける */
const rateOf=j=>j.rateBy==='car'?j.carsH*j.load:j.rateBy==='min'?j.load/j.minPer*60:j.rate;
/* はやさの言い方（入れた単位を先に）。per＝1台の取り時間（分） */
function paceTxt(j, rate, per){
  if(per==null) per=j.load/rate*60;
  if(j.rateBy==='min') return '1台 '+m3s(per)+'分（'+m3s(rate)+'㎥/時）';
  if(j.rateBy==='car') return '1時間に '+f1x(rate/j.load)+'台（'+m3s(rate)+'㎥/時）';
  return m3s(rate)+'㎥/時（1時間に '+f1x(rate/j.load)+'台）';
}
const dur=x=>{ const m=Math.round(x); return (m>=60?Math.floor(m/60)+'時間':'')+((m%60)||m<60?(m%60)+'分':''); };
/* 段取りを出す。o.rate（㎥/時）・o.per（1台の取り時間・分）・o.fleet（回す車の台数。0＝決めない）で いまの設定を変えて試せる。
   取り時間で決めたときは、どの車も同じ分で荷卸しする（最後の少ない車も） */
function plan(j, o){
  o=o||{};
  const design=j.parts.reduce((s,p)=>s+partVol(p),0);
  const need=design*(1+j.loss/100);
  const U=Math.round(j.unit*100), L=Math.max(U, Math.round(j.load*100));
  const orderC=need>0?Math.ceil(need*100/U-1e-6)*U:0;
  const N=orderC>0?Math.ceil(orderC/L-1e-9):0;
  let loads=[];
  if(N){
    if(j.even && N>1){
      const base=Math.floor(orderC/N/U)*U; let k=Math.round((orderC-base*N)/U);
      loads=Array.from({length:N},()=>base);
      for(let i=0;i<N&&k>0;i++,k--) loads[i]+=U;
      while(k>0){ for(let i=0;i<N&&k>0;i++,k--) loads[i]+=U; }
    } else { loads=Array(N).fill(L); loads[N-1]=orderC-L*(N-1); }
  }
  const perFix=o.per!=null?o.per:(o.rate==null&&j.rateBy==='min'?j.minPer:null);
  const rate=perFix!=null?j.load/perFix*60:(o.rate!=null?o.rate:rateOf(j)), fleet=o.fleet!=null?o.fleet:j.fleet, start=toMin(j.start), L1=toMin(j.l1), L2=toMin(j.l2), lunch=j.lunch&&L2>L1;
  const rows=[], trucks=[]; let t=start, cum=0, lunchUsed=false, idle=0;
  loads.forEach((c,i)=>{
    const vol=c/100, dis=perFix!=null?perFix:vol/rate*60;
    let s=t;
    if(lunch && s>=L1 && s<L2){ s=L2; lunchUsed=true; }
    const depPlan=s-j.early-j.travel-0;
    let tr=trucks.filter(x=>x.avail<=depPlan-j.mix+1e-6).sort((a,b)=>a.avail-b.avail)[0], dep=depPlan;   // 積み込む前に 工場に戻っている車
    if(!tr){
      if(!fleet || trucks.length<fleet){ tr={no:trucks.length+1, avail:-1e9, trips:0}; trucks.push(tr); }
      else { tr=trucks.slice().sort((a,b)=>a.avail-b.avail)[0]; dep=tr.avail+j.mix; }
    }
    const arr=dep+j.travel;
    if(arr+j.early>s){ const s2=Math.max(s, arr); if(s2>s){ idle+=s2-s; s=s2; } if(lunch && s>=L1 && s<L2){ s=L2; lunchUsed=true; } }
    const e=s+dis; t=e; cum+=c;
    tr.trips++; tr.avail=e+j.travel+j.wash;
    rows.push({no:i+1, truck:tr.no, trip:tr.trips, mix:dep-j.mix, dep, arr, s, e, vol, cum:cum/100, life:e-(dep-j.mix)});
  });
  const end=rows.length?rows[rows.length-1].e:start;
  const span=end-start-(lunchUsed?Math.max(0, Math.min(L2,end)-Math.max(L1,start)):0);
  const per=perFix!=null?perFix:j.load/rate*60, perH=span>0?N/(span/60):0;   // 1台あたりの荷卸しの分・平均して1時間に何台
  const cycle=j.early+per+j.travel+j.wash+j.mix+j.travel;
  const limit=j.hot?90:120;
  const warn=[];
  if(N){
    if(j.mix+j.travel>90) warn.push(`練混ぜから現場に着くまで ${Math.round(j.mix+j.travel)}分。JIS A 5308 の運搬時間（1.5時間）をこえます（購入者と協議が要ります）。`);
    const worst=rows.reduce((a,r)=>r.life>a.life?r:a, rows[0]);
    if(worst.life>limit) warn.push(`${worst.no}号車は 練混ぜから荷卸しが終わるまで ${Math.round(worst.life)}分。目安の ${limit}分（外気温 25℃${j.hot?'以上':'未満'}・JASS 5）をこえます。`);
    if(idle>=1) warn.push(`車が ${fleet}台では足りないので、待ちが出ます（ポンプが止まる時間 合計 約${Math.round(idle)}分）。下の 🎯 で台数をふやすと減ります。`);
    if(end>=17*60) warn.push(`打設の終わりが ${hm(end)} です。`);
  }
  return {design, need, order:orderC/100, N, loads:loads.map(c=>c/100), rows, start, end, span, lunchUsed, per, perH, cycle, trucks:trucks.length, warn, limit, idle, rate, fleet, perFix};
}
/* 回す車の台数ごとの 終わりの予定（いちばん少ない台数〜これ以上ふやしても早くならない台数） */
function fleetTable(j, o){
  o=o||{};
  const base=plan(j, Object.assign({}, o, {fleet:0})), rows=[];
  if(!base.N) return {base, rows};
  for(let f=1; f<=base.trucks; f++){ const P=f===base.trucks?base:plan(j, Object.assign({}, o, {fleet:f})); rows.push({f, end:P.end, span:P.span, idle:P.idle, perH:P.perH}); }
  return {base, rows};
}
/* 終わりたい時刻から逆算：何台で回せば間に合うか。いまのはやさで間に合わないときは、要るはやさと台数 */
function goalCalc(j){
  if(!j.goal) return null;
  const base=plan(j, {fleet:0}); if(!base.N) return null;
  const S=base.start, T=toMin(j.goal);
  if(T<=S) return {err:'終わりたい時刻は、打設の開始（'+hm(S)+'）より後にしてください'};
  const L1=toMin(j.l1), L2=toMin(j.l2), lunch=j.lunch&&L2>L1;
  const avail=T-S-(lunch?Math.max(0, Math.min(L2,T)-Math.max(L1,S)):0);
  const need=avail>0?base.order/avail*60:Infinity, rateNow=rateOf(j);
  const G={T, avail, need, carsH:need/j.load, rate:rateNow, per:base.per, fastest:base.end};
  const tb=fleetTable(j), ok=tb.rows.find(r=>r.end<=T+0.5);
  if(ok) return Object.assign(G, {fleet:ok.f, end:ok.end, fmax:tb.base.trucks});
  G.impossible=true;
  if(!(avail>0)) return G;
  if(j.rateBy==='min'){   // 取り時間で決めているときは 0.5分ずつ短くして試す
    for(let p=Math.floor(Math.min(j.minPer-0.5, j.load/need*60)*2)/2; p>=1-1e-9; p-=0.5){
      const t2=fleetTable(j, {per:p}), ok2=t2.rows.find(x=>x.end<=T+0.5);
      if(ok2) return Object.assign(G, {perNeed:p, rateNeed:j.load/p*60, fleetNeed:ok2.f, endNeed:ok2.end, fmaxNeed:t2.base.trucks});
    }
    return G;
  }
  const step=j.rateBy==='car'?0.5*j.load:0.5;   // 「時間○台」で入れているときは 0.5台ずつ
  let r=j.rateBy==='car'?Math.ceil(Math.max(need, rateNow)/j.load*2)/2*j.load:Math.ceil(Math.max(need, rateNow)*2)/2;
  if(r<=rateNow+1e-9) r+=step;
  for(let i=0;i<1200 && r<=300+1e-9;i++, r+=step){
    const t2=fleetTable(j, {rate:r}), ok2=t2.rows.find(x=>x.end<=T+0.5);
    if(ok2) return Object.assign(G, {rateNeed:Math.round(r*1000)/1000, fleetNeed:ok2.f, endNeed:ok2.end, fmaxNeed:t2.base.trucks});
  }
  return G;
}

function loadSummary(P, j){
  if(!P.N) return '';
  const last=P.loads[P.loads.length-1];
  if(P.loads.every(v=>v===P.loads[0])) return m3s(P.loads[0])+'㎥ × '+P.N+'台';
  if(!j.even) return m3s(j.load)+'㎥×'+(P.N-1)+'台＋最後 '+m3s(last)+'㎥';
  const cnt={}; P.loads.forEach(v=>{ const k=m3s(v); cnt[k]=(cnt[k]||0)+1; });
  return Object.entries(cnt).sort((a,b)=>b[0]-a[0]).map(([v,n])=>v+'㎥×'+n+'台').join('＋');
}

/* ───────── 画面 ───────── */
function render(){ renderJob(); renderParts(); renderSet(); renderGoal(); renderRes(); }
/* 数が変わったときに出し直すところ（入れている欄は そのまま） */
function renderOut(){ renderGoal(); renderRes(); }
function renderJob(){
  const b=$('dsJob'); if(!b) return;
  const list=st.jobs.slice().sort((x,y)=>(y.id===st.cur)-(x.id===st.cur)||y.upd-x.upd);
  b.innerHTML=`<select aria-label="打設をえらぶ" onchange="DS.pick(this.value)">${list.map(j=>`<option value="${esc(j.id)}"${j.id===st.cur?' selected':''}>${esc(j.name)}</option>`).join('')}</select>
    <button class="ds-b" onclick="DS.jobNew()">＋ 新しく</button><button class="ds-b" onclick="DS.jobMenu()" aria-label="名前・消す">⋯</button>`;
}
function partHtml(p,i){
  const T=PT[p.type];
  return `<div class="ds-part" data-pid="${esc(p.id)}">
    <div class="ds-ph"><select data-pt="1" aria-label="部位の形">${PT_KEYS.map(k=>`<option value="${k}"${k===p.type?' selected':''}>${PT[k].ic} ${PT[k].n}</option>`).join('')}</select>
      <input class="ds-pn" data-pn="1" value="${esc(p.name)}" maxlength="30" placeholder="名前（例：1F床）"><button class="ds-x" onclick="DS.partDel('${esc(p.id)}')" aria-label="この部位を消す">🗑</button></div>
    <div class="ds-pf">${T.f.map(f=>`<label>${f[1]}<span><input data-f="${f[0]}" inputmode="decimal" autocomplete="off" value="${esc(p.vals[f[0]])}" placeholder="${f[0]==='n'?'1':''}"><small>${f[2]}</small></span></label>`).join('')}</div>
    <div class="ds-pv" id="dsPv${i}"></div>
  </div>`;
}
function renderParts(){
  const b=$('dsParts'); if(!b) return;
  const j=job();
  b.innerHTML=j.parts.map(partHtml).join('');
  renderPartVols();
}
function renderPartVols(){
  const j=job(); let sum=0;
  j.parts.forEach((p,i)=>{ const el=$('dsPv'+i); const v=partVol(p); sum+=v;
    if(el) el.innerHTML=v>0?(p.type==='direct'?`＝ <b>${m3(v)}</b> ㎥`:`${esc(PT[p.type].ex(partVals(p)))} ＝ <b>${m3(v)}</b> ㎥`):'<small>寸法を入れると ㎥ が出ます</small>'; });
  const t=$('dsSum'); if(t) t.innerHTML=`設計数量 <b>${m3(sum)}</b> ㎥${j.parts.length>1?`（${j.parts.length}か所）`:''}`;
}
const chips=(k,list,v,fmt)=>list.map(x=>`<button class="${Math.abs(v-x)<1e-9?'on':''}" onclick="DS.set('${k}',${x})">${fmt?fmt(x):x}</button>`).join('');
function renderSet(){
  const b=$('dsSet'); if(!b) return;
  const j=job();
  b.innerHTML=`
    <div class="ds-row"><span class="ds-l">割増し（ロス）</span><div class="ds-chips">${chips('loss',LOSS,j.loss,x=>x+'%')}<label class="ds-in"><input data-k="loss" inputmode="decimal" value="${LOSS.includes(j.loss)?'':j.loss}" placeholder="ほか">%</label></div></div>
    <div class="ds-row"><span class="ds-l">発注の単位</span><div class="ds-chips">${chips('unit',UNITS,j.unit,x=>x+'㎥')}</div></div>
    <div class="ds-row"><span class="ds-l">1台に積む量</span><div class="ds-chips">${chips('load',LOADS,j.load,x=>x+'㎥')}<label class="ds-in"><input data-k="load" inputmode="decimal" value="${LOADS.includes(j.load)?'':j.load}" placeholder="ほか">㎥</label></div></div>
    <div class="ds-row"><span class="ds-l">台ごとの量</span><div class="ds-chips"><button class="${j.even?'on':''}" onclick="DS.set('even',true)">どの車も同じくらい</button><button class="${!j.even?'on':''}" onclick="DS.set('even',false)">最後の1台で調整</button></div></div>
    <div class="ds-row"><span class="ds-l">打設のはやさ</span><span class="ds-unit">${PACE_BY.map(u=>`<button class="${j.rateBy===u[0]?'on':''}" onclick="DS.rateBy('${u[0]}')">${u[1]}</button>`).join('')}</span>
      <div class="ds-chips">${j.rateBy==='car'
        ?`${chips('carsH',CARS_H,j.carsH,x=>x+'台')}<label class="ds-in"><input data-k="carsH" inputmode="decimal" value="${CARS_H.includes(j.carsH)?'':j.carsH}" placeholder="ほか">台/時</label>`
        :j.rateBy==='min'
        ?`${chips('minPer',MIN_PER,j.minPer,x=>x+'分')}<label class="ds-in"><input data-k="minPer" inputmode="decimal" value="${MIN_PER.includes(j.minPer)?'':j.minPer}" placeholder="ほか">分/台</label>`
        :`${chips('rate',RATES,j.rate)}<label class="ds-in"><input data-k="rate" inputmode="decimal" value="${RATES.includes(j.rate)?'':j.rate}" placeholder="ほか">㎥/時</label>`}</div>
      <span class="ds-conv" id="dsConv">${convTxt(j)}</span></div>
    <div class="ds-grid">
      <div class="ds-f"><span>打設の開始</span><button type="button" class="ds-time" data-tk="start" onclick="DS.time('start')">${esc(hm(toMin(j.start)))}</button></div>
      <label>運搬（片道）<span><input data-k="travel" inputmode="numeric" value="${j.travel}"><small>分</small></span></label>
    </div>
    <div class="ds-lunch"><label class="ds-sw"><input type="checkbox" data-k="lunch" ${j.lunch?'checked':''}> 昼休み（次の車を始めない）</label>
      <span class="ds-lt"><button type="button" class="ds-time sm" data-tk="l1" onclick="DS.time('l1')" ${j.lunch?'':'disabled'}>${esc(hm(toMin(j.l1)))}</button>〜<button type="button" class="ds-time sm" data-tk="l2" onclick="DS.time('l2')" ${j.lunch?'':'disabled'}>${esc(hm(toMin(j.l2)))}</button></span></div>
    <details class="ds-more"${moreOpen?' open':''}><summary>くわしい設定（積込み・洗い・着く時間・外気温）</summary>
      <div class="ds-grid">
        <label>練混ぜ〜工場を出る<span><input data-k="mix" inputmode="numeric" value="${j.mix}"><small>分</small></span></label>
        <label>洗い・待ち（戻って次まで）<span><input data-k="wash" inputmode="numeric" value="${j.wash}"><small>分</small></span></label>
        <label>前の車の荷卸し中に着く<span><input data-k="early" inputmode="numeric" value="${j.early}"><small>分前</small></span></label>
      </div>
      <div class="ds-row"><span class="ds-l">外気温</span><div class="ds-chips"><button class="${!j.hot?'on':''}" onclick="DS.set('hot',false)">25℃未満</button><button class="${j.hot?'on':''}" onclick="DS.set('hot',true)">25℃以上</button></div></div>
    </details>`;
}
function renderGoal(){
  const b=$('dsGoal'); if(!b) return;
  const j=job(), tb=fleetTable(j);
  const head=`<h4>🎯 終わりの時刻と車の台数</h4>`;
  if(!tb.base.N){ b.innerHTML=head+`<div class="ds-empty">数量を入れると、終わりたい時刻から 回す車の台数を逆算したり、車の台数ごとの 終わりの予定を出したりできます。</div>`; return; }
  const fmax=tb.base.trucks, cur=(j.fleet>0&&j.fleet<fmax)?j.fleet:fmax, G=goalCalc(j);
  let g='';
  if(G&&G.err) g=`<div class="ds-warn">⚠ ${esc(G.err)}</div>`;
  else if(G&&!G.impossible) g=`<div class="ds-goal ok">🏁 <b>${hm(G.T)}</b> までに終わらせるには、車を <b>${G.fleet}台</b> 回します → <b>${hm(G.end)}</b> に終わる予定。<small>平均で 1時間に ${f1x(G.carsH)}台（${f1x(G.need)}㎥/時）のペースが要ります。</small>
      ${cur===G.fleet?'<span class="ds-tag">✓ 配車表は この台数です</span>':`<button class="ds-b pri" onclick="DS.goalApply()">${G.fleet}台で配車表を作る</button>`}</div>`;
  else if(G) g=`<div class="ds-goal ng">⚠ いまの打設のはやさ（${esc(paceTxt(j, G.rate, G.per))}）では、車を何台にしても いちばん早くて <b>${hm(G.fastest)}</b> に終わります。
      ${G.rateNeed?`はやさを <b>${esc(paceTxt(j, G.rateNeed, G.perNeed))}</b> にすると、車 <b>${G.fleetNeed}台</b> で <b>${hm(G.endNeed)}</b> に終わります。<button class="ds-b pri" onclick="DS.goalApply()">${j.rateBy==='min'?'取り時間 '+m3s(G.perNeed)+'分':'そのはやさ'}・${G.fleetNeed}台にする</button>`
        :'打設のはやさを上げても間に合いません。開始の時刻を早めるか、2回に分けて打つことを考えてください。'}</div>`;
  const rows=tb.rows.filter(r=>r.f>fmax-12 || (G&&r.f===G.fleet));
  b.innerHTML=head+`
    <div class="ds-f2"><span>終わりたい時刻</span><button type="button" class="ds-time" data-tk="goal" onclick="DS.time('goal')">${j.goal?esc(hm(toMin(j.goal))):'決めない'}</button>${j.goal?'<button type="button" class="ds-mini" onclick="DS.goalClear()" aria-label="終わりたい時刻をやめる">✕</button>':''}</div>
    ${g}
    <div class="ds-th"><span>車の台数ごとの 終わりの予定</span><small>押すと配車表がその台数に</small></div>
    <div class="ds-ft">${rows.map(r=>`<button class="${r.f===cur?'on':''}${G&&!G.err&&!G.impossible&&r.f===G.fleet?' goal':''}" data-f="${r.f}" onclick="DS.fleet(${r.f===fmax?0:r.f})"><b>${r.f}台</b><span>${hm(r.end)} 終わり</span><small>${dur(r.span)}・1時間に ${f1x(r.perH)}台${r.idle>=1?'・ポンプ待ち 約'+dur(r.idle):''}${r.f===fmax?'・いちばん早い':''}</small></button>`).join('')}</div>
    ${rows.length<tb.rows.length?`<div class="ds-note">${tb.rows.length-rows.length}台以下は 時間がかかりすぎるので省いています。</div>`:''}`;
}
function renderRes(){
  const b=$('dsRes'); if(!b) return;
  const j=job(), P=plan(j);
  if(!P.N){ b.innerHTML=`<h4>📋 段取り</h4><div class="ds-empty">上で数量を入れると、発注量・台数・配車の時間割が出ます。</div>`; return; }
  const fmax=plan(j, {fleet:0}).trucks, limited=j.fleet>0&&j.fleet<fmax;
  const loadTxt=loadSummary(P, j);
  b.innerHTML=`<h4>📋 段取り</h4>
    <div class="ds-cards">
      <div><small>設計数量</small><b>${m3(P.design)}</b><i>㎥</i></div>
      <div><small>割増し ${j.loss}%</small><b>${m3(P.need)}</b><i>㎥</i></div>
      <div class="hl"><small>発注量（${j.unit}㎥単位）</small><b>${m3(P.order)}</b><i>㎥</i></div>
      <div class="hl"><small>台数（のべ）</small><b>${P.N}</b><i>台</i></div>
    </div>
    <div class="ds-sum">
      <div>🚛 ${loadTxt}</div>
      <div>⏱ 打設 <b>${hm(P.start)}〜${hm(P.end)}</b>（${dur(P.span)}${P.lunchUsed?'・昼休みをのぞく':''}）</div>
      <div>${limited?`🔁 車 <b>${j.fleet}台</b>で回す（1回り 約${Math.round(P.cycle)}分）・平均 1時間に ${f1x(P.perH)}台`:`🔁 1台 ${P.perFix!=null?m3s(P.per):'約'+Math.round(P.per)}分ごと（1時間に ${f1x(60/P.per)}台）・車は <b>${P.trucks}台</b>で回せます（1回り 約${Math.round(P.cycle)}分）`}</div>
    </div>
    ${P.warn.map(w=>`<div class="ds-warn">⚠ ${esc(w)}</div>`).join('')}
    <div class="ds-th"><span>配車表</span><label class="ds-sw sm"><input type="checkbox" ${showMix?'checked':''} onchange="DS.mixCol(this.checked)"> 練混ぜの時刻も</label></div>
    <div class="ds-tw"><table class="ds-t"><thead><tr><th>号</th><th>車</th>${showMix?'<th>練混ぜ</th>':''}<th>出発</th><th>着</th><th>荷卸し</th><th>㎥</th><th>累計</th></tr></thead><tbody>
      ${P.rows.map((r,i)=>`${P.lunchUsed&&i>0&&P.rows[i-1].s<toMin(j.l1)&&r.s>=toMin(j.l2)-1e-6?`<tr class="lunch"><td colspan="${showMix?8:7}">🍙 昼休み ${esc(j.l1)}〜${esc(j.l2)}</td></tr>`:''}<tr><td>${r.no}</td><td>${r.truck}${r.trip>1?`<small>(${r.trip})</small>`:''}</td>${showMix?`<td>${hm(r.mix)}</td>`:''}<td>${hm(r.dep)}</td><td>${hm(r.arr)}</td><td>${hm(r.s)}-${hm(r.e)}</td><td>${m3s(r.vol)}</td><td>${m3s(r.cum)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="ds-note">出発＝工場を出る・着＝現場に着く。「車」は何台目の車か（かっこは その車の何回目）。時刻は目安です。JIS A 5308 では 練混ぜから荷卸し地点に着くまで 1.5時間以内、JASS 5 では 練混ぜから打込み終了まで 外気温25℃未満 120分・25℃以上 90分 が限度です。</div>
    <div class="ds-acts"><button onclick="DS.copy()">📋 コピー</button><button onclick="DS.share()">📤 共有</button><button onclick="DS.toTable()">▦ 表に入れる</button></div>`;
}

/* ───────── 文・表 ───────── */
function resultText(){
  const j=job(), P=plan(j); if(!P.N) return '';
  const L=['🚛 打設の段取り：'+j.name];
  j.parts.forEach(p=>{ const v=partVol(p); if(v>0) L.push('・'+(p.name||PT[p.type].n)+'　'+(p.type==='direct'?'':PT[p.type].ex(partVals(p))+' ＝ ')+m3(v)+'㎥'); });
  L.push('設計数量 '+m3(P.design)+'㎥ → 割増し'+j.loss+'% '+m3(P.need)+'㎥ → 発注 '+m3(P.order)+'㎥');
  L.push('台数 '+P.N+'台（'+loadSummary(P, j)+'）');
  const fmax=plan(j, {fleet:0}).trucks, limited=j.fleet>0&&j.fleet<fmax, G=goalCalc(j);
  L.push('打設 '+hm(P.start)+'〜'+hm(P.end)+'（'+dur(P.span)+(P.lunchUsed?'・昼休み '+j.l1+'〜'+j.l2+' をのぞく':'')+'）・'+paceTxt(j, P.rate, P.per));
  L.push(limited?'車 '+j.fleet+'台で回す・平均 1時間に '+f1x(P.perH)+'台（運搬 片道'+j.travel+'分）':'1台 '+(P.perFix!=null?m3s(P.per):'約'+Math.round(P.per))+'分ごと・車は '+P.trucks+'台で回せます（運搬 片道'+j.travel+'分）');
  if(G&&!G.err) L.push(G.impossible?'🏁 終わりたい時刻 '+hm(G.T)+'：いまのはやさでは いちばん早くて '+hm(G.fastest):'🏁 終わりたい時刻 '+hm(G.T)+'：車 '+G.fleet+'台で '+hm(G.end)+' に終わる');
  P.warn.forEach(w=>L.push('⚠ '+w));
  L.push('', '▼ 配車表（号・車・工場を出る・着く・荷卸し・量・累計）');
  P.rows.forEach(r=>L.push(r.no+'号 '+r.truck+'車'+(r.trip>1?'('+r.trip+')':'')+' 出'+hm(r.dep)+' 着'+hm(r.arr)+' 卸'+hm(r.s)+'〜'+hm(r.e)+' '+m3s(r.vol)+'㎥ 計'+m3s(r.cum)));
  return L.join('\n');
}
function tableRows(){
  const j=job(), P=plan(j), out=[];
  out.push(['打設の段取り', j.name]);
  out.push(['部位','式','㎥']);
  j.parts.forEach(p=>{ const v=partVol(p); if(v>0) out.push([p.name||PT[p.type].n, p.type==='direct'?'':PT[p.type].ex(partVals(p)), Math.round(v*100)/100]); });
  out.push(['設計数量','',Math.round(P.design*100)/100]);
  out.push(['割増し '+j.loss+'%','',Math.round(P.need*100)/100]);
  out.push(['発注量','',P.order]);
  out.push(['台数（のべ）','',P.N]);
  out.push(['回す車','',P.trucks]);
  out.push(['打設','',hm(P.start)+'〜'+hm(P.end)]);
  out.push(['']);
  out.push(['号','車','工場を出る','着く','荷卸し始め','荷卸し終わり','量㎥','累計㎥']);
  P.rows.forEach(r=>out.push([r.no, r.truck, hm(r.dep), hm(r.arr), hm(r.s), hm(r.e), r.vol, r.cum]));
  return out;
}
function copy(){ const t=resultText(); if(!t){ toast('先に数量を入れてください'); return; } toolCopyText(t, '段取りをコピーしました（LINE などに貼れます）'); }
function share(){ const t=resultText(); if(!t){ toast('先に数量を入れてください'); return; } toolShareText('打設の段取り', t); }
function toTable(){ if(!plan(job()).N){ toast('先に数量を入れてください'); return; } toolPasteRows(tableRows(), '打設の段取り', closeDasetsu); }

/* ───────── 操作 ───────── */
function onInput(e){
  const el=e.target, j=job();
  const pe=el.closest('.ds-part');
  if(pe){
    const p=j.parts.find(x=>x.id===pe.dataset.pid); if(!p) return;
    if(el.dataset.f){ p.vals[el.dataset.f]=line(el.value,20); touch(); renderPartVols(); renderOut(); }
    else if(el.dataset.pn){ p.name=line(el.value,30); touch(); }
    return;
  }
  const k=el.dataset.k; if(!k) return;
  if(el.type==='checkbox' && e.type==='input') return;   // 切りかえは change で受ける
  if(k==='lunch'){ j.lunch=el.checked; touch(); renderSet(); renderOut(); return; }
  const v=toolNum(el.value);
  const lim={loss:[0,50],load:[0.25,12],rate:[1,300],carsH:[0.5,60],minPer:[1,180],travel:[0,300],mix:[0,120],wash:[0,180],early:[0,60]}[k];
  if(!lim) return;
  if(el.value.trim()===''){ if(k==='loss'||k==='load'||k==='rate'||k==='carsH'||k==='minPer') return; }
  if(isFinite(v)&&v>=lim[0]&&v<=lim[1]){ j[k]=v; touch(); renderOut(); renderConv();
    if(k==='loss'||k==='load'||k==='rate'||k==='carsH'||k==='minPer') document.querySelectorAll(`#dsSet [onclick^="DS.set('${k}'"]`).forEach(b=>b.classList.remove('on')); }
}
function convTxt(j){
  const r=rateOf(j);
  if(j.rateBy==='min') return '＝ '+m3s(r)+'㎥/時（1時間に '+f1x(60/j.minPer)+'台）。どの車も '+m3s(j.minPer)+'分で取る';
  return '＝ '+(j.rateBy==='car'?m3s(r)+'㎥/時':'1時間に '+f1x(r/j.load)+'台')+'（1台 約'+f1x(j.load/r*60)+'分）';
}
function renderConv(){ const c=$('dsConv'); if(c) c.textContent=convTxt(job()); }
/* はやさの入れ方を ㎥/時 ⇔ 台/時 に。いまのはやさは そのまま（近い値に） */
function rateBy(u){
  const j=job(); if(!PACE_BY.some(x=>x[0]===u)||u===j.rateBy) return;
  const r=rateOf(j);
  if(u==='car') j.carsH=Math.max(0.5, Math.round(r/j.load*10)/10);
  else if(u==='min') j.minPer=Math.max(1, Math.min(180, Math.round(j.load/r*60*2)/2));
  else j.rate=Math.max(1, Math.round(r*10)/10);
  j.rateBy=u; touch(); renderSet(); renderOut();
}
function setFleet(f){ const j=job(); j.fleet=Math.max(0, Math.min(99, Math.round(+f)||0)); touch(); renderOut(); }
function goalClear(){ job().goal=''; touch(); renderOut(); }
function goalApply(){
  const j=job(), G=goalCalc(j); if(!G||G.err) return;
  if(!G.impossible){ j.fleet=G.fleet>=G.fmax?0:G.fleet; toast('車 '+G.fleet+'台で配車表を作りました（'+hm(G.end)+' に終わる予定）', 3500); }
  else if(G.rateNeed){
    if(j.rateBy==='min') j.minPer=G.perNeed; else if(j.rateBy==='car') j.carsH=Math.round(G.rateNeed/j.load*10)/10; else j.rate=G.rateNeed;
    j.fleet=G.fleetNeed>=G.fmaxNeed?0:G.fleetNeed;
    toast('はやさを '+paceTxt(j, G.rateNeed, G.perNeed)+'・車 '+G.fleetNeed+'台にしました', 3500);
  } else return;
  touch(); renderSet(); renderOut();
}

/* ───────── 時刻の窓（時・分を押して ✓ 決定。打って入れることもできる） ───────── */
const TP_TITLE={start:'打設の開始', l1:'昼休みの始まり', l2:'昼休みの終わり', goal:'終わりたい時刻'};
const TP_H=[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4], TP_M=[0,5,10,15,20,25,30,35,40,45,50,55];
/* 「8:30」「830」「0830」「8時30分」「8時」「15」→ 0時からの分 */
function parseTime(s){
  const t=String(s==null?'':s).normalize('NFKC').replace(/\s+/g,'');
  let m=/^(\d{1,2})(?::|時)(\d{1,2})?分?$/.exec(t);
  if(m){ const h=+m[1], mi=m[2]?+m[2]:0; return h<24&&mi<60?h*60+mi:null; }
  if(/^\d{3,4}$/.test(t)){ const n=t.padStart(4,'0'), h=+n.slice(0,2), mi=+n.slice(2); return h<24&&mi<60?h*60+mi:null; }
  if(/^\d{1,2}$/.test(t)){ const h=+t; return h<24?h*60:null; }
  return null;
}
function timePick(k){
  if(!TP_TITLE[k]) return;
  const j=job();
  let mins=k==='goal'?(j.goal?toMin(j.goal):Math.ceil((plan(j,{fleet:0}).end||toMin(j.start)+240)/30)*30):toMin(j[k]);
  mins=((mins%1440)+1440)%1440;
  popOpen(`<b>${TP_TITLE[k]}</b>
    <div class="ds-tp-big" id="dsTpBig"></div>
    <div class="ds-tp-l">時</div><div class="ds-tp-g" id="dsTpH">${TP_H.map(h=>`<button type="button" data-h="${h}">${h}</button>`).join('')}</div>
    <div class="ds-tp-l">分</div><div class="ds-tp-g" id="dsTpM">${TP_M.map(m=>`<button type="button" data-m="${m}">${String(m).padStart(2,'0')}</button>`).join('')}</div>
    <div class="ds-tp-fine"><button type="button" data-d="-1">−1分</button><button type="button" data-d="1">＋1分</button><input id="dsTpIn" inputmode="numeric" autocomplete="off" placeholder="打つ：830・8:30" aria-label="時刻を打って入れる"></div>
    <div class="ds-pop-acts">${k==='goal'&&j.goal?'<button type="button" class="ds-b del" data-x="clear">決めない</button>':''}<button type="button" class="ds-b" data-x="cancel">やめる</button><button type="button" class="ds-b pri" data-x="ok">✓ 決定</button></div>`);
  const box=pop.el, inp=$('dsTpIn');
  const show=()=>{
    $('dsTpBig').textContent=hm(mins);
    box.querySelectorAll('#dsTpH button').forEach(b=>b.classList.toggle('on', +b.dataset.h===Math.floor(mins/60)));
    box.querySelectorAll('#dsTpM button').forEach(b=>b.classList.toggle('on', +b.dataset.m===mins%60));
  };
  const ok=()=>{
    if(inp.value.trim()){ const v=parseTime(inp.value); if(v==null){ toast('時刻の形がちがいます（例：8:30・830）'); return; } mins=v; }
    timeSet(k, mins);
  };
  box.addEventListener('click', e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.h!=null){ mins=(+b.dataset.h)*60+mins%60; inp.value=''; show(); }
    else if(b.dataset.m!=null){ mins=Math.floor(mins/60)*60+(+b.dataset.m); inp.value=''; show(); }
    else if(b.dataset.d){ mins=(mins+(+b.dataset.d)+1440)%1440; inp.value=''; show(); }
    else if(b.dataset.x==='ok') ok();
    else if(b.dataset.x==='clear'){ popClose(); goalClear(); }
    else if(b.dataset.x==='cancel') popClose();
  });
  inp.addEventListener('input', ()=>{ const v=parseTime(inp.value); if(v!=null){ mins=v; show(); } });
  inp.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); ok(); } });
  show();
}
function timeSet(k, mins){
  const j=job(); j[k]=hhmm(mins);
  popClose(); touch(); renderSet(); renderOut();
  if((k==='l1'||k==='l2') && toMin(j.l2)<=toMin(j.l1)) toast('昼休みの終わりは、始まりより後にしてください（いまは昼休みなしで出しています）', 4500);
  else toast(TP_TITLE[k]+'を '+hm(mins)+' にしました');
}
function onChange(e){
  const el=e.target, j=job();
  if(el.dataset.pt){
    const pe=el.closest('.ds-part'), p=j.parts.find(x=>x.id===pe.dataset.pid); if(!p||!PT[el.value]) return;
    const q=newPart(el.value); q.id=p.id; q.name=p.name;
    j.parts[j.parts.indexOf(p)]=q; touch(); renderParts(); renderOut();
    const first=document.querySelector(`.ds-part[data-pid="${CSS.escape(p.id)}"] input[data-f]`); if(first) first.focus();
  }
}
function set(k,v){ const j=job(); j[k]=v; touch(); renderSet(); renderOut(); }
function partAdd(){
  const j=job(); if(j.parts.length>=MAX_PARTS){ toast('部位は '+MAX_PARTS+'か所までです'); return; }
  const prev=j.parts[j.parts.length-1];
  const p=newPart(prev&&prev.type!=='direct'?prev.type:'slab'); j.parts.push(p); touch(); renderParts(); renderOut();
  const el=document.querySelector(`.ds-part[data-pid="${CSS.escape(p.id)}"] select`); if(el){ el.scrollIntoView({block:'center'}); }
}
async function partDel(id){
  const j=job(), p=j.parts.find(x=>x.id===id); if(!p) return;
  if(partVol(p)>0 && !await appConfirm('「'+(p.name||PT[p.type].n)+'」（'+m3(partVol(p))+'㎥）を消しますか？', '消す', 'やめる')) return;
  j.parts=j.parts.filter(x=>x.id!==id); if(!j.parts.length) j.parts.push(newPart('direct'));
  touch(); renderParts(); renderOut();
}
function mixCol(on){ showMix=!!on; renderRes(); }
function pick(id){ if(!st.jobs.some(j=>j.id===id)) return; st.cur=id; save(); render(); }
async function jobNew(){
  if(st.jobs.length>=MAX_JOBS){ toast('打設は '+MAX_JOBS+'件までです。いらないものを ⋯ から消してください', 4000); return; }
  const d=new Date(), n=await appPrompt('新しい打設の名前（例：〇〇邸 基礎・2F床）', '打設 '+(d.getMonth()+1)+'/'+d.getDate());
  if(n==null) return;
  const j=blankJob(line(n,40)||undefined, job()); st.jobs.push(j); st.cur=j.id; save(); render();
  toast('「'+j.name+'」を作りました（設定は前の打設と同じにしています）', 3500);
}
function popOpen(html){
  popClose();
  const el=document.createElement('div'); el.className='ds-pop-bg';
  el.innerHTML=`<div class="ds-pop" role="dialog">${html}</div>`;
  el.addEventListener('mousedown', e=>{ if(e.target===el) popClose(); });
  $('dasetsuOverlay').appendChild(el);
  pop={el, rel:modalBack(()=>popClose(true))};
}
function popClose(fromBack){ if(!pop) return; const p=pop; pop=null; if(!fromBack) p.rel(); p.el.remove(); }
function jobMenu(){
  const j=job();
  popOpen(`<b>この打設</b><label>名前<input id="dsPopName" value="${esc(j.name)}" maxlength="40"></label>
    <div class="ds-pop-acts"><button class="ds-b del" onclick="DS.jobDel()">🗑 消す</button><button class="ds-b" onclick="DS.popClose()">やめる</button><button class="ds-b pri" onclick="DS.jobRename()">✓ 決める</button></div>`);
  const i=$('dsPopName'); i.addEventListener('keydown', e=>e.stopPropagation());
}
function jobRename(){ const n=line($('dsPopName').value,40); if(!n){ toast('名前を入れてください'); return; } job().name=n; touch(); popClose(); renderJob(); }
async function jobDel(){
  const j=job(); popClose();
  if(!await appConfirm('「'+j.name+'」を消しますか？ もとに戻せません。', '消す', 'やめる')) return;
  st.jobs=st.jobs.filter(x=>x.id!==j.id); if(!st.jobs.length) st.jobs.push(blankJob());
  st.cur=st.jobs.slice().sort((a,b)=>b.upd-a.upd)[0].id; save(); render(); toast('消しました');
}

/* ───────── 見た目 ───────── */
const DS_CSS=`
#dasetsuOverlay .ds-modal{ display:flex; flex-direction:column; }
.ds-body{ flex:1; min-height:0; overflow:auto; padding:10px 12px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.ds-wrap{ max-width:760px; margin:0 auto; }
.ds-job{ display:flex; gap:6px; align-items:center; margin-bottom:8px; }
.ds-job select{ flex:1; min-width:0; height:42px; padding:0 8px; font-size:16px; font-weight:bold; border:1px solid rgba(120,132,156,.5); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ds-b{ height:42px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.ds-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .ds-b.del{ color:#c62828; border-color:rgba(198,40,40,.4); } body.dark .ds-b.del{ color:#ef9a9a; }
.ds-sec{ margin:10px 0; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); }
.ds-sec h4{ margin:0 0 8px; font-size:15px; color:var(--acc-text,var(--acc)); }
.ds-part{ padding:8px 0 10px; border-bottom:1px dashed rgba(120,132,156,.35); } .ds-part:last-child{ border-bottom:none; }
.ds-ph{ display:flex; gap:6px; align-items:center; } .ds-ph select{ flex:none; max-width:46%; height:40px; padding:0 6px; font-size:14.5px; font-weight:bold; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ds-pn{ flex:1; min-width:0; height:40px; padding:0 8px; font-size:15px; border:1px solid rgba(120,132,156,.4); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ds-x{ flex:none; width:40px; height:40px; border-radius:8px; border:1px solid rgba(120,132,156,.35); background:transparent; cursor:pointer; }
.ds-pf{ display:grid; grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); gap:4px 8px; margin-top:6px; }
.ds-pf label,.ds-grid label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#777); min-width:0; }
.ds-pf label span,.ds-grid label span{ display:flex; align-items:center; gap:3px; margin-top:3px; } .ds-pf small,.ds-grid small{ flex:none; font-size:12px; color:var(--text-light,#777); }
.ds-pf input,.ds-grid input{ display:block; width:100%; min-width:0; box-sizing:border-box; height:42px; padding:0 8px; font-size:17px; text-align:right; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-variant-numeric:tabular-nums; }
.ds-grid input[type=time]{ text-align:left; margin-top:3px; }
.ds-pv{ margin-top:6px; font-size:13.5px; color:var(--text-light,#666); text-align:right; } .ds-pv b{ font-size:17px; color:var(--text,#222); }
.ds-add{ display:flex; gap:6px; margin-top:8px; } .ds-add .ds-b{ flex:1; }
.ds-total{ margin-top:8px; padding:8px 10px; border-radius:10px; background:var(--acc-weak,rgba(33,115,70,.12)); text-align:right; font-size:14px; } .ds-total b{ font-size:22px; }
.ds-row{ display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; margin:0 0 10px; } .ds-l{ width:100%; font-size:12px; font-weight:bold; color:var(--text-light,#777); }
.ds-chips{ display:flex; flex-wrap:wrap; align-items:center; gap:4px; }
.ds-chips button{ min-height:36px; padding:0 11px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:14px; font-weight:bold; cursor:pointer; touch-action:manipulation; }
.ds-chips button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.ds-in{ display:inline-flex; align-items:center; gap:3px; font-size:13px; color:var(--text-light,#777); } .ds-in input{ width:64px; height:36px; padding:0 6px; font-size:15px; text-align:right; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ds-grid{ display:grid; grid-template-columns:1fr 1fr; gap:6px 10px; margin:0 0 8px; }
.ds-sw{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; margin:4px 0 6px; } .ds-sw input[type=checkbox]{ width:20px; height:20px; }
.ds-sw input[type=time]{ height:36px; padding:0 4px; font-size:15px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); } .ds-sw input:disabled{ opacity:.45; }
.ds-sw.sm{ font-size:12.5px; margin:0; font-weight:normal; } .ds-sw.sm input{ width:17px; height:17px; }
.ds-more{ margin-top:6px; } .ds-more summary{ cursor:pointer; font-size:13.5px; font-weight:bold; color:var(--acc-text,var(--acc)); padding:6px 0; }
.ds-empty{ padding:14px 6px; text-align:center; color:var(--text-light,#888); font-size:13.5px; }
.ds-cards{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
.ds-cards>div{ padding:8px 6px; border-radius:12px; background:rgba(120,132,156,.1); text-align:center; min-width:0; }
.ds-cards>div.hl{ background:var(--acc-weak,rgba(33,115,70,.12)); box-shadow:inset 0 0 0 2px var(--acc); }
.ds-cards small{ display:block; font-size:11px; color:var(--text-light,#777); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .ds-cards b{ font-size:21px; font-variant-numeric:tabular-nums; } .ds-cards i{ font-style:normal; font-size:12px; margin-left:2px; }
.ds-sum{ margin:10px 0 6px; font-size:14.5px; line-height:1.8; }
.ds-warn{ margin:6px 0; padding:8px 10px; border-radius:8px; background:rgba(255,152,0,.16); border-left:4px solid #fb8c00; font-size:13.5px; line-height:1.6; }
.ds-th{ display:flex; justify-content:space-between; align-items:center; margin:12px 0 4px; font-weight:bold; font-size:13.5px; }
.ds-tw{ overflow-x:auto; -webkit-overflow-scrolling:touch; }
.ds-t{ width:100%; border-collapse:collapse; font-size:13.5px; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ds-t th,.ds-t td{ border:1px solid rgba(120,132,156,.3); padding:5px 5px; text-align:right; } .ds-t th{ background:rgba(120,132,156,.12); font-size:11.5px; text-align:center; }
.ds-t td:nth-child(2) small{ font-size:10.5px; color:var(--text-light,#777); }
.ds-t tr.lunch td{ text-align:center; background:rgba(255,213,79,.2); font-size:12.5px; }
.ds-note{ margin:8px 0 0; padding:7px 10px; border-radius:8px; background:rgba(120,132,156,.1); font-size:12px; line-height:1.6; color:var(--text,#444); }
.ds-acts{ display:flex; gap:6px; margin-top:12px; } .ds-acts button{ flex:1; height:44px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.ds-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; padding-top:6vh; }
.ds-pop{ width:min(420px,94%); max-height:88%; overflow:auto; box-sizing:border-box; padding:16px; border-radius:14px; background:var(--panel,var(--modal-bg,#fff)); color:var(--text,#222); box-shadow:0 10px 40px rgba(0,0,0,.35); }
.ds-pop>b{ display:block; font-size:16px; margin-bottom:8px; } .ds-pop label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#777); }
.ds-pop input{ display:block; width:100%; box-sizing:border-box; margin-top:3px; height:44px; padding:0 10px; font-size:17px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ds-pop-acts{ display:flex; gap:6px; justify-content:flex-end; margin-top:14px; } .ds-pop-acts .ds-b.del{ margin-right:auto; }
.ds-unit{ display:flex; flex-wrap:wrap; gap:4px; width:100%; } .ds-unit button{ height:26px; padding:0 9px; border-radius:13px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:12px; font-weight:bold; cursor:pointer; }
.ds-unit button.on{ background:var(--text,#333); border-color:var(--text,#333); color:var(--modal-bg,#fff); }
.ds-conv{ width:100%; font-size:12.5px; color:var(--text-light,#777); }
.ds-f,.ds-f2{ font-size:12px; font-weight:bold; color:var(--text-light,#777); min-width:0; } .ds-f>span{ display:block; }
.ds-f2{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:13px; margin:0 0 8px; }
.ds-time{ display:inline-flex; align-items:center; justify-content:space-between; gap:6px; min-width:110px; height:42px; margin-top:3px; padding:0 10px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-size:18px; font-weight:bold; font-variant-numeric:tabular-nums; cursor:pointer; touch-action:manipulation; }
.ds-f .ds-time{ width:100%; } .ds-time::after{ content:'🕗'; font-size:15px; }
.ds-time.sm{ min-width:86px; height:38px; margin-top:0; font-size:16px; } .ds-time:disabled{ opacity:.45; }
.ds-lunch{ display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; margin:4px 0 6px; } .ds-lunch .ds-sw{ margin:0; } .ds-lt{ display:inline-flex; align-items:center; gap:4px; }
.ds-mini{ width:36px; height:36px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text-light,#777); cursor:pointer; }
.ds-goal{ margin:4px 0 8px; padding:10px 12px; border-radius:12px; font-size:14.5px; line-height:1.7; }
.ds-goal.ok{ background:var(--acc-weak,rgba(33,115,70,.12)); } .ds-goal.ng{ background:rgba(255,152,0,.16); border-left:4px solid #fb8c00; }
.ds-goal small{ display:block; font-size:12.5px; color:var(--text-light,#666); } .ds-goal .ds-b{ display:block; margin-top:8px; width:100%; }
.ds-tag{ display:inline-block; margin-top:6px; padding:2px 10px; border-radius:12px; background:var(--acc); color:var(--on-acc,#fff); font-size:12.5px; font-weight:bold; }
.ds-th small{ font-weight:normal; font-size:11.5px; color:var(--text-light,#777); }
.ds-ft{ display:flex; flex-direction:column; gap:4px; }
.ds-ft button{ display:grid; grid-template-columns:52px 1fr; grid-template-rows:auto auto; column-gap:8px; align-items:center; width:100%; padding:7px 10px; border-radius:10px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; cursor:pointer; touch-action:manipulation; }
.ds-ft button b{ grid-row:1 / 3; font-size:18px; } .ds-ft button span{ font-size:16px; font-weight:bold; font-variant-numeric:tabular-nums; } .ds-ft button small{ font-size:12px; color:var(--text-light,#777); }
.ds-ft button.on{ border:2px solid var(--acc); background:var(--acc-weak,rgba(33,115,70,.12)); } .ds-ft button.goal b::after{ content:' 🏁'; font-size:13px; }
.ds-tp-big{ margin:2px 0 8px; text-align:center; font-size:40px; font-weight:bold; font-variant-numeric:tabular-nums; color:var(--acc-text,var(--acc)); }
.ds-tp-l{ font-size:12px; font-weight:bold; color:var(--text-light,#777); margin:6px 0 4px; }
.ds-tp-g{ display:grid; grid-template-columns:repeat(6,1fr); gap:4px; }
.ds-tp-g button{ height:40px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:16px; font-weight:bold; cursor:pointer; touch-action:manipulation; padding:0; }
.ds-tp-g button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.ds-tp-fine{ display:flex; gap:6px; margin-top:10px; } .ds-tp-fine button{ flex:none; height:40px; padding:0 10px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13.5px; font-weight:bold; cursor:pointer; }
.ds-pop .ds-tp-fine input{ flex:1; min-width:0; height:40px; margin:0; font-size:16px; }
@media (max-height:700px){ .ds-pop-bg{ padding-top:2vh; } .ds-pop{ max-height:96%; padding:12px 14px; } .ds-pop>b{ margin-bottom:2px; } .ds-tp-big{ font-size:30px; margin:0 0 2px; } .ds-tp-l{ margin:3px 0 3px; } .ds-tp-g{ gap:3px; } .ds-tp-g button{ height:34px; font-size:15px; } .ds-tp-fine{ margin-top:6px; } .ds-tp-fine button,.ds-pop .ds-tp-fine input{ height:36px; } .ds-pop-acts{ margin-top:8px; } }
@media (max-width:480px){ .ds-cards{ grid-template-columns:1fr 1fr; } .ds-t{ font-size:12.5px; } .ds-t th,.ds-t td{ padding:5px 3px; } }
@media (max-width:380px){ .ds-body{ padding:8px 8px calc(16px + var(--safe-bottom,0px)); } .ds-sec{ padding:8px 9px 10px; } .ds-b{ padding:0 9px; font-size:13px; } .ds-pf{ grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); } .ds-chips button{ padding:0 9px; font-size:13px; } .ds-pop{ padding:12px; } .ds-tp-g button{ height:38px; font-size:15px; } .ds-tp-big{ font-size:34px; } .ds-tp-fine button{ padding:0 7px; } }
`;
function ensureDom(){
  if($('dasetsuOverlay')) return;
  const stl=document.createElement('style'); stl.id='dsStyle'; stl.textContent=DS_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="dasetsuOverlay">
  <div class="modal vol-modal ds-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🚛 打設の段取り</span><button class="modal-close" onclick="closeDasetsu()" aria-label="閉じる">✕</button></div>
    <div class="ds-body"><div class="ds-wrap" id="dsWrap">
      <div class="ds-job" id="dsJob"></div>
      <section class="ds-sec"><h4>📐 数量（部位ごと）</h4><div id="dsParts"></div>
        <div class="ds-add"><button class="ds-b" onclick="DS.partAdd()">＋ 部位を足す</button></div>
        <div class="ds-total" id="dsSum"></div></section>
      <section class="ds-sec"><h4>🚛 発注と配車</h4><div id="dsSet"></div></section>
      <section class="ds-sec" id="dsGoal"></section>
      <section class="ds-sec" id="dsRes"></section>
    </div></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const w=$('dsWrap');
  w.addEventListener('input', onInput); w.addEventListener('change', e=>{ onChange(e); if(e.target.type==='checkbox'&&e.target.dataset.k) onInput(e); });
  w.addEventListener('keydown', e=>{ if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'){ e.stopPropagation(); if(e.key==='Enter'&&e.target.tagName==='INPUT'){ e.preventDefault(); e.target.blur(); } } });
  w.addEventListener('toggle', e=>{ if(e.target.classList&&e.target.classList.contains('ds-more')) moreOpen=e.target.open; }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openDasetsu(){
  ensureDom(); load();
  openDlg('dasetsuOverlay', ()=>{ popClose(); clearTimeout(saveT); save(); });
  render();
}
function closeDasetsu(){ if(!$('dasetsuOverlay')||!isDlgOpen('dasetsuOverlay')) return; popClose(); clearTimeout(saveT); save(); closeDlg('dasetsuOverlay'); }

window.DS={ pick, jobNew, jobMenu, jobRename, jobDel, partAdd, partDel, set, mixCol, copy, share, toTable, popClose:()=>popClose(),
  time:timePick, rateBy, fleet:setFleet, goalApply, goalClear,
  state:()=>JSON.parse(JSON.stringify(st)), plan:(j,o)=>plan(j||job(),o), text:resultText, rows:tableRows, partVol, clean,
  goal:()=>goalCalc(job()), fleets:()=>fleetTable(job()).rows, parseTime,
  setJob:o=>{ Object.assign(job(), o); save(); render(); } };
Object.assign(window, { openDasetsu, closeDasetsu });
})();
