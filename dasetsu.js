/* 🚛 生コン打設の段取り（v561。表電卓の道具。apps/dasetsu/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   ・📐 数量：部位ごと（スラブ・土間／梁／柱／壁／基礎／布基礎／円柱・杭／㎥で直接）に寸法を入れると、式と㎥が出る。
   ・🚛 発注と配車：割増し（ロス）→ 発注量（0.25㎥単位などで切り上げ）→ 台数（1台に積む量）→ 最後の1台、
     打設のはやさ（㎥/時）と開始の時刻から、1台ずつの 練混ぜ・工場を出る・現場に着く・荷卸し の時刻と累計（配車表）。
     昼休みには次の車を始めない。往復と洗いの時間から「車は何台で回せるか」も出す（台数を決めると待ちも出す）。
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
const LOSS=[0,3,5,10], UNITS=[0.1,0.25,0.5,1], LOADS=[4.5,4.25,4,3,2,1], RATES=[10,15,20,30,40];

let st=null, pop=null, showMix=false, moreOpen=false;

/* ───────── 読み書き ───────── */
function newPart(type){ const t=PT[type]?type:'direct'; const vals={}; PT[t].f.forEach(f=>vals[f[0]]=f[3]); return {id:uid('p'), type:t, name:'', vals}; }
function blankJob(name, from){
  const d=new Date();
  const j={id:uid('j'), name:name||('打設 '+(d.getMonth()+1)+'/'+d.getDate()), upd:Date.now(), parts:[newPart('direct')],
    loss:5, unit:0.25, load:4.25, even:true, rate:20, start:'08:30', travel:30, mix:10, wash:10, early:5, lunch:true, l1:'12:00', l2:'13:00', fleet:0, hot:false};
  if(from) ['loss','unit','load','even','rate','start','travel','mix','wash','early','lunch','l1','l2','fleet','hot'].forEach(k=>j[k]=from[k]);
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
    j.rate=num(x.rate,1,300,20); j.start=tm(x.start,'08:30'); j.travel=num(x.travel,0,300,30); j.mix=num(x.mix,0,120,10); j.wash=num(x.wash,0,180,10); j.early=num(x.early,0,60,5);
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
const hm=x=>{ let m=Math.round(x); const neg=m<0; m=Math.abs(m); const h=Math.floor(m/60)%48; return (neg?'-':'')+h+':'+String(m%60).padStart(2,'0'); };
const dur=x=>{ const m=Math.round(x); return (m>=60?Math.floor(m/60)+'時間':'')+((m%60)||m<60?(m%60)+'分':''); };
function plan(j){
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
  const rate=j.rate, start=toMin(j.start), L1=toMin(j.l1), L2=toMin(j.l2), lunch=j.lunch&&L2>L1;
  const rows=[], trucks=[]; let t=start, cum=0, lunchUsed=false, idle=0;
  loads.forEach((c,i)=>{
    const vol=c/100, dis=vol/rate*60;
    let s=t;
    if(lunch && s>=L1 && s<L2){ s=L2; lunchUsed=true; }
    const depPlan=s-j.early-j.travel-0;
    let tr=trucks.filter(x=>x.avail<=depPlan-j.mix+1e-6).sort((a,b)=>a.avail-b.avail)[0], dep=depPlan;   // 積み込む前に 工場に戻っている車
    if(!tr){
      if(!j.fleet || trucks.length<j.fleet){ tr={no:trucks.length+1, avail:-1e9, trips:0}; trucks.push(tr); }
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
  const per=j.load/rate*60;
  const cycle=j.early+per+j.travel+j.wash+j.mix+j.travel;
  const limit=j.hot?90:120;
  const warn=[];
  if(N){
    if(j.mix+j.travel>90) warn.push(`練混ぜから現場に着くまで ${Math.round(j.mix+j.travel)}分。JIS A 5308 の運搬時間（1.5時間）をこえます（購入者と協議が要ります）。`);
    const worst=rows.reduce((a,r)=>r.life>a.life?r:a, rows[0]);
    if(worst.life>limit) warn.push(`${worst.no}号車は 練混ぜから荷卸しが終わるまで ${Math.round(worst.life)}分。目安の ${limit}分（外気温 25℃${j.hot?'以上':'未満'}・JASS 5）をこえます。`);
    if(idle>=1) warn.push(`車が足りないので、待ちが出ます（ポンプが止まる時間 合計 約${Math.round(idle)}分）。使える車を ${trucks.length+1}台以上にすると減ります。`);
    if(end>=17*60) warn.push(`打設の終わりが ${hm(end)} です。`);
  }
  return {design, need, order:orderC/100, N, loads:loads.map(c=>c/100), rows, start, end, span, lunchUsed, per, cycle, trucks:trucks.length, warn, limit, idle};
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
function render(){ renderJob(); renderParts(); renderSet(); renderRes(); }
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
    <div class="ds-row"><span class="ds-l">打設のはやさ</span><div class="ds-chips">${chips('rate',RATES,j.rate)}<label class="ds-in"><input data-k="rate" inputmode="decimal" value="${RATES.includes(j.rate)?'':j.rate}" placeholder="ほか">㎥/時</label></div></div>
    <div class="ds-grid">
      <label>打設の開始<input type="time" data-k="start" value="${esc(j.start)}"></label>
      <label>運搬（片道）<span><input data-k="travel" inputmode="numeric" value="${j.travel}"><small>分</small></span></label>
    </div>
    <label class="ds-sw"><input type="checkbox" data-k="lunch" ${j.lunch?'checked':''}> 昼休み（次の車を始めない）<input type="time" data-k="l1" value="${esc(j.l1)}" ${j.lunch?'':'disabled'}>〜<input type="time" data-k="l2" value="${esc(j.l2)}" ${j.lunch?'':'disabled'}></label>
    <details class="ds-more"${moreOpen?' open':''}><summary>くわしい設定（積込み・洗い・使える車・外気温）</summary>
      <div class="ds-grid">
        <label>練混ぜ〜工場を出る<span><input data-k="mix" inputmode="numeric" value="${j.mix}"><small>分</small></span></label>
        <label>洗い・待ち（戻って次まで）<span><input data-k="wash" inputmode="numeric" value="${j.wash}"><small>分</small></span></label>
        <label>前の車の荷卸し中に着く<span><input data-k="early" inputmode="numeric" value="${j.early}"><small>分前</small></span></label>
        <label>使える車（0＝決めない）<span><input data-k="fleet" inputmode="numeric" value="${j.fleet}"><small>台</small></span></label>
      </div>
      <div class="ds-row"><span class="ds-l">外気温</span><div class="ds-chips"><button class="${!j.hot?'on':''}" onclick="DS.set('hot',false)">25℃未満</button><button class="${j.hot?'on':''}" onclick="DS.set('hot',true)">25℃以上</button></div></div>
    </details>`;
}
function renderRes(){
  const b=$('dsRes'); if(!b) return;
  const j=job(), P=plan(j);
  if(!P.N){ b.innerHTML=`<h4>📋 段取り</h4><div class="ds-empty">上で数量を入れると、発注量・台数・配車の時間割が出ます。</div>`; return; }
  const loadTxt=loadSummary(P, j);
  b.innerHTML=`<h4>📋 段取り</h4>
    <div class="ds-cards">
      <div><small>設計数量</small><b>${m3(P.design)}</b><i>㎥</i></div>
      <div><small>割増し ${j.loss}%</small><b>${m3(P.need)}</b><i>㎥</i></div>
      <div class="hl"><small>発注量（${j.unit}㎥単位）</small><b>${m3(P.order)}</b><i>㎥</i></div>
      <div class="hl"><small>台数</small><b>${P.N}</b><i>台</i></div>
    </div>
    <div class="ds-sum">
      <div>🚛 ${loadTxt}</div>
      <div>⏱ 打設 <b>${hm(P.start)}〜${hm(P.end)}</b>（${dur(P.span)}${P.lunchUsed?'・昼休みをのぞく':''}）</div>
      <div>🔁 1台 約${Math.round(P.per)}分ごと・車は <b>${P.trucks}台</b>で回せます（1回り 約${Math.round(P.cycle)}分）</div>
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
  L.push('打設 '+hm(P.start)+'〜'+hm(P.end)+'（'+dur(P.span)+(P.lunchUsed?'・昼休み '+j.l1+'〜'+j.l2+' をのぞく':'')+'）・'+j.rate+'㎥/時');
  L.push('1台 約'+Math.round(P.per)+'分ごと・車は '+P.trucks+'台で回せます（運搬 片道'+j.travel+'分）');
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
  out.push(['台数','',P.N]);
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
    if(el.dataset.f){ p.vals[el.dataset.f]=line(el.value,20); touch(); renderPartVols(); renderRes(); }
    else if(el.dataset.pn){ p.name=line(el.value,30); touch(); }
    return;
  }
  const k=el.dataset.k; if(!k) return;
  if(el.type==='checkbox' && e.type==='input') return;   // 切りかえは change で受ける
  if(k==='lunch'){ j.lunch=el.checked; touch(); renderSet(); renderRes(); return; }
  if(k==='start'||k==='l1'||k==='l2'){ if(/^\d\d:\d\d$/.test(el.value)){ j[k]=el.value; touch(); renderRes(); } return; }
  const v=toolNum(el.value);
  const lim={loss:[0,50],load:[0.25,12],rate:[1,300],travel:[0,300],mix:[0,120],wash:[0,180],early:[0,60],fleet:[0,99]}[k];
  if(!lim) return;
  if(el.value.trim()===''){ if(k==='loss'||k==='load'||k==='rate') return; }
  if(isFinite(v)&&v>=lim[0]&&v<=lim[1]){ j[k]=k==='fleet'?Math.round(v):v; touch(); renderRes();
    if(k==='loss'||k==='load'||k==='rate') document.querySelectorAll(`#dsSet [onclick^="DS.set('${k}'"]`).forEach(b=>b.classList.remove('on')); }
}
function onChange(e){
  const el=e.target, j=job();
  if(el.dataset.pt){
    const pe=el.closest('.ds-part'), p=j.parts.find(x=>x.id===pe.dataset.pid); if(!p||!PT[el.value]) return;
    const q=newPart(el.value); q.id=p.id; q.name=p.name;
    j.parts[j.parts.indexOf(p)]=q; touch(); renderParts(); renderRes();
    const first=document.querySelector(`.ds-part[data-pid="${CSS.escape(p.id)}"] input[data-f]`); if(first) first.focus();
  }
}
function set(k,v){ const j=job(); j[k]=v; touch(); renderSet(); renderRes(); }
function partAdd(){
  const j=job(); if(j.parts.length>=MAX_PARTS){ toast('部位は '+MAX_PARTS+'か所までです'); return; }
  const prev=j.parts[j.parts.length-1];
  const p=newPart(prev&&prev.type!=='direct'?prev.type:'slab'); j.parts.push(p); touch(); renderParts(); renderRes();
  const el=document.querySelector(`.ds-part[data-pid="${CSS.escape(p.id)}"] select`); if(el){ el.scrollIntoView({block:'center'}); }
}
async function partDel(id){
  const j=job(), p=j.parts.find(x=>x.id===id); if(!p) return;
  if(partVol(p)>0 && !await appConfirm('「'+(p.name||PT[p.type].n)+'」（'+m3(partVol(p))+'㎥）を消しますか？', '消す', 'やめる')) return;
  j.parts=j.parts.filter(x=>x.id!==id); if(!j.parts.length) j.parts.push(newPart('direct'));
  touch(); renderParts(); renderRes();
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
.ds-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; padding-top:10vh; }
.ds-pop{ width:min(420px,92%); box-sizing:border-box; padding:16px; border-radius:14px; background:var(--panel,var(--modal-bg,#fff)); color:var(--text,#222); box-shadow:0 10px 40px rgba(0,0,0,.35); }
.ds-pop>b{ display:block; font-size:16px; margin-bottom:8px; } .ds-pop label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#777); }
.ds-pop input{ display:block; width:100%; box-sizing:border-box; margin-top:3px; height:44px; padding:0 10px; font-size:17px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.ds-pop-acts{ display:flex; gap:6px; justify-content:flex-end; margin-top:14px; } .ds-pop-acts .ds-b.del{ margin-right:auto; }
@media (max-width:480px){ .ds-cards{ grid-template-columns:1fr 1fr; } .ds-t{ font-size:12.5px; } .ds-t th,.ds-t td{ padding:5px 3px; } }
@media (max-width:380px){ .ds-body{ padding:8px 8px calc(16px + var(--safe-bottom,0px)); } .ds-sec{ padding:8px 9px 10px; } .ds-b{ padding:0 9px; font-size:13px; } .ds-pf{ grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); } .ds-chips button{ padding:0 9px; font-size:13px; } }
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
  state:()=>JSON.parse(JSON.stringify(st)), plan:j=>plan(j||job()), text:resultText, rows:tableRows, partVol, clean,
  setJob:o=>{ Object.assign(job(), o); save(); render(); } };
Object.assign(window, { openDasetsu, closeDasetsu });
})();
