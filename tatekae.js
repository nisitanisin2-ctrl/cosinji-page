/* 💴 立て替え精算（v561。表電卓の道具。apps/tatekae/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   旅行・飲み会・子ども会 などで 何人かが立て替えた分を、最後に「だれが だれに いくら払えば 終わるか」まで出す。
   ・👥 人：名前と 負担の重み（子どもは ×0.5、払うだけの人は ×0 など）。📅当番表の名簿・📇連絡帳のグループから まとめて入れられる。
   ・🧾 立て替えた分：払った人・金額・何に・だれの分（はじめは全員）。金額は 12,000／1万2千／1.2万 のどれでもよい。
   ・💴 精算：ひとりずつの 払った／負担／差し引き と、払う回数が少なくなる 払い方（だれ → だれ いくら）。
     端数は 1円・10円・100円 にそろえる（合計がずれないよう、端数の大きい人から ふり分ける）。済んだ払いには ✓ を付けられる。
   ・📋 コピー・📤 共有（LINE など）・▦ 表に入れる（精算・ひとりずつ・立て替えの一覧）。
   ・中身は excalc_tatekae（この端末の中だけ）。精算は いくつでも分けて持てる（旅行・飲み会 など）。 */
(function(){
const TK_KEY='excalc_tatekae', MAX_EV=30, MAX_MEM=40, MAX_IT=500, MAX_AMT=1e9;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,n);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const num=n=>Math.round(n).toLocaleString('ja-JP');
const yen=n=>num(n)+'円';
const ROUNDS=[1,10,100];
const W_OPTS=[[1,'ふつう','×1'],[0.5,'子ども','×0.5'],[2,'多め','×2'],[0,'払うだけ','×0']];
const wTag=w=>w===1?'':'×'+(Math.round(w*100)/100);

let st=null;          // {v, cur, events:[{id,name,members:[{id,n,w}],items:[{id,who,amt,what,for:[]}],round,done:{},upd,lastWho}]}
let edIt=null;        // 直している立て替えの id（null＝新しく足す）
let fFor=[];          // 入れている立て替えの「だれの分」（[]＝全員）
let pop=null;         // 開いている小さな窓 {el, rel}

/* ───────── 読み書き ───────── */
function blankEv(name){ const d=new Date(); return {id:uid('e'), name:name||('精算 '+(d.getMonth()+1)+'/'+d.getDate()), members:[], items:[], round:1, done:{}, upd:Date.now(), lastWho:''}; }
function clean(o){
  const s={v:1, cur:'', events:[]};
  ((o&&Array.isArray(o.events))?o.events:[]).slice(0,MAX_EV).forEach(e=>{
    if(!e||typeof e!=='object') return;
    const sid=(v,p)=>(typeof v==='string'&&v)?v.slice(0,40):uid(p);
    const ev={id:sid(e.id,'e'), name:line(e.name,40)||'精算', members:[], items:[], round:ROUNDS.includes(+e.round)?+e.round:1, done:{}, upd:+e.upd||Date.now(), lastWho:typeof e.lastWho==='string'?e.lastWho.slice(0,40):''};
    (Array.isArray(e.members)?e.members:[]).slice(0,MAX_MEM).forEach(m=>{
      if(!m||typeof m!=='object') return; const n=line(m.n,24); if(!n) return;
      const w=+m.w; ev.members.push({id:sid(m.id,'m'), n, w:(isFinite(w)&&w>=0&&w<=10)?Math.round(w*100)/100:1});
    });
    const ids=new Set(ev.members.map(m=>m.id));
    (Array.isArray(e.items)?e.items:[]).slice(0,MAX_IT).forEach(it=>{
      if(!it||typeof it!=='object'||!ids.has(it.who)) return;
      const a=Math.round(+it.amt); if(!(a>0&&a<=MAX_AMT)) return;
      ev.items.push({id:sid(it.id,'i'), who:it.who, amt:a, what:line(it.what,40), for:[...new Set((Array.isArray(it.for)?it.for:[]).filter(x=>ids.has(x)))]});
    });
    if(e.done&&typeof e.done==='object') Object.keys(e.done).slice(0,300).forEach(k=>{ if(e.done[k]===true && k.length<120) ev.done[k]=true; });
    if(!s.events.some(x=>x.id===ev.id)) s.events.push(ev);
  });
  s.cur=(o&&typeof o.cur==='string'&&s.events.some(e=>e.id===o.cur))?o.cur:(s.events[0]?s.events[0].id:'');
  return s;
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(TK_KEY)||'null'); }catch(_){}
  st=clean(o);
  if(!st.events.length){ const e=blankEv(); st.events.push(e); st.cur=e.id; }
}
function save(){ try{ localStorage.setItem(TK_KEY, JSON.stringify(st)); }catch(_){ toast('保存できませんでした（端末の空きが足りないかもしれません）'); } }
const ev=()=>st.events.find(e=>e.id===st.cur)||st.events[0];
function touch(){ ev().upd=Date.now(); save(); }

/* ───────── 計算 ───────── */
/* 精算する。bal は丸めた差し引き（＋もらう／−払う）。払う回数が少なくなるよう、同じ金額の人どうしを先に組み、
   あとは 払う額の大きい人から もらう額の大きい人へ 順に回す */
function settle(e){
  const M=e.members, n=M.length, at=new Map(M.map((m,i)=>[m.id,i]));
  const paid=Array(n).fill(0), owe=Array(n).fill(0); let total=0;
  e.items.forEach(it=>{
    const p=at.get(it.who); if(p==null) return;
    paid[p]+=it.amt; total+=it.amt;
    let ben=(it.for&&it.for.length)?it.for.map(id=>at.get(id)).filter(i=>i!=null):[];
    if(!ben.length) ben=M.map((_,i)=>i);
    const W=ben.reduce((s,i)=>s+M[i].w,0);
    ben.forEach(i=>{ owe[i]+= W>0 ? it.amt*M[i].w/W : it.amt/ben.length; });
  });
  const u=ROUNDS.includes(e.round)?e.round:1;
  const raw=paid.map((v,i)=>v-owe[i]);
  const q=raw.map(v=>Math.floor(v/u+1e-7));
  let k=-q.reduce((s,v)=>s+v,0);   // 合計を0にするのに足りない分（単位の数）
  raw.map((v,i)=>[v/u-q[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).forEach(([,i])=>{ if(k>0){ q[i]++; k--; } });
  const bal=q.map(v=>v*u);
  const deb=[], cre=[];
  bal.forEach((v,i)=>{ if(v<0) deb.push({i,v:-v}); else if(v>0) cre.push({i,v}); });
  const tr=[];
  deb.forEach(d=>{ const c=cre.find(c=>c.v>0 && c.v===d.v); if(c){ tr.push({from:d.i, to:c.i, amt:d.v}); c.v=0; d.v=0; } });
  const D=deb.filter(d=>d.v>0).sort((a,b)=>b.v-a.v), C=cre.filter(c=>c.v>0).sort((a,b)=>b.v-a.v);
  let a=0, b=0;
  while(a<D.length && b<C.length){
    const x=Math.min(D[a].v, C[b].v);
    tr.push({from:D[a].i, to:C[b].i, amt:x});
    D[a].v-=x; C[b].v-=x; if(!D[a].v) a++; if(!C[b].v) b++;
  }
  tr.sort((x,y)=>x.from-y.from||y.amt-x.amt);
  const dev=Math.max(0, ...raw.map((v,i)=>Math.abs(v-bal[i])));
  return {total, paid, owe, bal, tr, u, dev};
}
const trKey=(e,t)=>e.members[t.from].id+'>'+e.members[t.to].id+':'+t.amt;
const forText=(e,it)=>{
  if(!it.for||!it.for.length||it.for.length>=e.members.length) return '全員';
  return it.for.map(id=>{ const m=e.members.find(x=>x.id===id); return m?m.n:''; }).filter(Boolean).join('・');
};
const memName=(e,id)=>{ const m=e.members.find(x=>x.id===id); return m?m.n:'?'; };

/* ───────── 画面 ───────── */
function render(){ renderEv(); renderMems(); renderForm(); renderItems(); renderRes(); }
function renderEv(){
  const b=$('tkEv'); if(!b) return;
  const list=st.events.slice().sort((x,y)=>(y.id===st.cur)-(x.id===st.cur)||y.upd-x.upd);
  b.innerHTML=`<select id="tkEvSel" aria-label="精算をえらぶ" onchange="TK.pickEv(this.value)">${list.map(e=>`<option value="${esc(e.id)}"${e.id===st.cur?' selected':''}>${esc(e.name)}</option>`).join('')}</select>
    <button class="tk-b" onclick="TK.evNew()">＋ 新しく</button><button class="tk-b" onclick="TK.evMenu()" aria-label="この精算の名前・消す">⋯</button>`;
}
function renderMems(){
  const b=$('tkMems'); if(!b) return;
  const e=ev();
  $('tkMemN').textContent=e.members.length?`（${e.members.length}人）`:'';
  b.innerHTML=e.members.map(m=>`<button class="tk-chip" onclick="TK.memEdit('${esc(m.id)}')">${esc(m.n)}${m.w!==1?`<i>${wTag(m.w)}</i>`:''}</button>`).join('')
    +`<button class="tk-chip add" onclick="TK.memAdd()">＋ 人を足す</button><button class="tk-chip add" onclick="TK.memImport()">📇 名簿から</button>`
    +(e.members.length?'':`<div class="tk-note">はじめに、いっしょに精算する人を入れます（自分も入れます）。子どもの分を半分にするなど、人を押すと 負担の重みを変えられます。</div>`);
}
function renderForm(){
  const e=ev(), sel=$('tkWho'); if(!sel) return;
  const it=edIt?e.items.find(x=>x.id===edIt):null;
  if(edIt && !it) edIt=null;
  const who=it?it.who:(e.members.some(m=>m.id===sel.value)?sel.value:(e.members.some(m=>m.id===e.lastWho)?e.lastWho:(e.members[0]?e.members[0].id:'')));
  sel.innerHTML=e.members.length?e.members.map(m=>`<option value="${esc(m.id)}"${m.id===who?' selected':''}>${esc(m.n)}</option>`).join(''):'<option value="">（先に人を入れます）</option>';
  $('tkFormSec').classList.toggle('editing', !!edIt);
  $('tkFormH').textContent=edIt?'✏️ 立て替えを直す':'🧾 立て替えた分を入れる';
  renderFor();
  $('tkFBtn').innerHTML=edIt
    ?`<button class="tk-b del" onclick="TK.itemDel()">🗑 消す</button><button class="tk-b" onclick="TK.itemCancel()">やめる</button><button class="tk-b pri" onclick="TK.itemSave()">✓ 直す</button>`
    :`<button class="tk-b pri wide" onclick="TK.itemSave()">＋ 足す</button>`;
}
function renderFor(){
  const b=$('tkFor'); if(!b) return;
  const e=ev(), all=!fFor.length;
  b.innerHTML=e.members.length?`<button class="tk-chip sm${all?' on':''}" onclick="TK.forAll()">全員</button>`+e.members.map(m=>`<button class="tk-chip sm${(all||fFor.includes(m.id))?' on':''}${all?' dim':''}" onclick="TK.forToggle('${esc(m.id)}')">${esc(m.n)}</button>`).join(''):'';
}
function renderItems(){
  const b=$('tkItems'); if(!b) return;
  const e=ev(), tot=e.items.reduce((s,x)=>s+x.amt,0);
  $('tkItN').textContent=e.items.length?`（${e.items.length}件・合計 ${yen(tot)}）`:'';
  b.innerHTML=e.items.length?e.items.map((it,i)=>`<button class="tk-it${it.id===edIt?' cur':''}" onclick="TK.itemEdit('${esc(it.id)}')"><span class="no">${i+1}</span><span class="w"><b>${esc(memName(e,it.who))}</b> が立て替え<small>${esc(it.what||'（何に：なし）')}・${esc(forText(e,it))}の分</small></span><span class="a">${yen(it.amt)}</span></button>`).join('')
    :`<div class="tk-empty">まだありません。上で「払った人」と「金額」を入れて「＋ 足す」を押します。</div>`;
}
function renderRes(){
  const b=$('tkRes'); if(!b) return;
  const e=ev();
  if(!e.items.length){ b.innerHTML=`<h4>💴 精算</h4><div class="tk-empty">立て替えを入れると、ここに「だれが だれに いくら払うか」が出ます。</div>`; return; }
  const s=settle(e), M=e.members, per=s.total/Math.max(1,M.length);
  const doneN=s.tr.filter(t=>e.done[trKey(e,t)]).length;
  const even=M.every(m=>m.w===1) && e.items.every(it=>!it.for||!it.for.length||it.for.length>=M.length);   // みんな同じだけ負担
  b.innerHTML=`<h4>💴 精算 <small>合計 ${yen(s.total)}・${M.length}人${even?`（1人あたり 約${yen(per)}）`:''}</small></h4>
    <div class="tk-seg" role="group" aria-label="端数"><span>端数</span>${ROUNDS.map(u=>`<button class="${s.u===u?'on':''}" onclick="TK.round(${u})">${u}円</button>`).join('')}</div>
    ${s.tr.length?`<div class="tk-pay-h">払い方（${s.tr.length}回${doneN?`・${doneN}回 済み`:''}）</div>
      <div class="tk-pays">${s.tr.map(t=>{ const k=trKey(e,t), d=!!e.done[k]; return `<button class="tk-pay${d?' done':''}" onclick="TK.done('${esc(k)}')" aria-pressed="${d}"><span class="ck">${d?'✓':''}</span><span class="who"><b>${esc(M[t.from].n)}</b><i>→</i><b>${esc(M[t.to].n)}</b></span><span class="a">${yen(t.amt)}</span></button>`; }).join('')}</div>
      <div class="tk-note">払い終わったら 押して ✓ を付けておけます。</div>`
      :`<div class="tk-ok">✓ 払い合う分はありません（ちょうど同じだけ出しています）</div>`}
    <table class="tk-t"><thead><tr><th>名前</th><th>払った</th><th>負担</th><th>差し引き</th></tr></thead><tbody>
      ${M.map((m,i)=>{ const v=s.bal[i]; return `<tr><td>${esc(m.n)}${m.w!==1?`<small> ${wTag(m.w)}</small>`:''}</td><td>${num(s.paid[i])}</td><td>${num(s.paid[i]-v)}</td><td class="${v>0?'plus':v<0?'minus':''}">${v>0?'＋'+num(v)+'<small>もらう</small>':v<0?'−'+num(-v)+'<small>払う</small>':'±0'}</td></tr>`; }).join('')}
      <tr class="sum"><td>合計</td><td>${num(s.total)}</td><td>${num(s.total)}</td><td></td></tr></tbody></table>
    ${s.u>1&&s.dev>=0.5?`<div class="tk-note">${s.u}円単位にそろえたので、ぴったりの金額と ひとり ${yen(Math.min(s.u-1,Math.ceil(s.dev)))} までちがいます。</div>`:''}
    <div class="tk-acts"><button onclick="TK.copy()">📋 コピー</button><button onclick="TK.share()">📤 共有</button><button onclick="TK.toTable()">▦ 表に入れる</button></div>`;
}

/* ───────── 小さな窓（人を直す・精算の名前 など） ───────── */
function popOpen(html){
  popClose();
  const el=document.createElement('div'); el.className='tk-pop-bg';
  el.innerHTML=`<div class="tk-pop" role="dialog">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  $('tatekaeOverlay').appendChild(el);
  pop={el, rel:modalBack(()=>popClose(true))};
  const f=el.querySelector('input'); if(f) setTimeout(()=>{ try{ f.focus(); }catch(_){} }, 50);
}
function popClose(fromBack){
  if(!pop) return;
  const p=pop; pop=null;
  if(!fromBack) p.rel();
  p.el.remove();
}

/* ───────── 精算（旅行・飲み会 ごと） ───────── */
function pickEv(id){ if(!st.events.some(e=>e.id===id)) return; st.cur=id; edIt=null; fFor=[]; save(); render(); }
async function evNew(){
  if(st.events.length>=MAX_EV){ toast('精算は '+MAX_EV+'個までです。いらないものを ⋯ から消してください', 4000); return; }
  const d=new Date(), n=await appPrompt('新しい精算の名前（例：キャンプ・歓迎会）', '精算 '+(d.getMonth()+1)+'/'+d.getDate());
  if(n==null) return;
  const e=blankEv(line(n,40)||undefined);
  const prev=ev();
  if(prev && prev.members.length && await appConfirm('「'+prev.name+'」と同じ人（'+prev.members.length+'人）で始めますか？', '同じ人で', '人は入れ直す'))
    e.members=prev.members.map(m=>({id:uid('m'), n:m.n, w:m.w}));
  st.events.push(e); st.cur=e.id; edIt=null; fFor=[]; save(); render();
  toast('「'+e.name+'」を作りました');
}
function evMenu(){
  const e=ev();
  popOpen(`<b>この精算</b><label>名前<input id="tkPopEvName" value="${esc(e.name)}" maxlength="40"></label>
    <div class="tk-pop-acts"><button class="tk-b del" onclick="TK.evDel()">🗑 消す</button><button class="tk-b" onclick="TK.popClose()">やめる</button><button class="tk-b pri" onclick="TK.evRename()">✓ 決める</button></div>`);
}
function evRename(){ const n=line($('tkPopEvName').value,40); if(!n){ toast('名前を入れてください'); return; } ev().name=n; touch(); popClose(); renderEv(); }
async function evDel(){
  const e=ev(); popClose();
  if(!await appConfirm('「'+e.name+'」を消しますか？（人 '+e.members.length+'人・立て替え '+e.items.length+'件）\nもとに戻せません。', '消す', 'やめる')) return;
  st.events=st.events.filter(x=>x.id!==e.id);
  if(!st.events.length) st.events.push(blankEv());
  st.cur=st.events.slice().sort((a,b)=>b.upd-a.upd)[0].id; edIt=null; fFor=[]; save(); render();
  toast('消しました');
}

/* ───────── 人 ───────── */
function splitNames(t){ return String(t||'').split(/[、,，\n\t]+|\s{2,}|[\s　]*[・／\/][\s　]*/).map(x=>line(x,24)).filter(Boolean); }
async function addNames(names){
  const e=ev(), have=new Set(e.members.map(m=>m.n));
  const add=[...new Set(names)].filter(n=>!have.has(n));
  if(!add.length){ toast('もう入っている人だけでした'); return 0; }
  const room=MAX_MEM-e.members.length;
  if(room<=0){ toast('人は '+MAX_MEM+'人までです'); return 0; }
  const allItems=e.items.filter(it=>!it.for||!it.for.length);
  const prevIds=e.members.map(m=>m.id);
  const list=add.slice(0,room).map(n=>({id:uid('m'), n, w:1}));
  if(allItems.length && !await appConfirm('前に入れた「全員の分」の立て替え（'+allItems.length+'件）を、'+list.map(m=>m.n).join('・')+' さんも 負担しますか？', '負担する', '負担しない'))
    allItems.forEach(it=>{ it.for=prevIds.slice(); });
  e.members.push(...list);
  touch(); renderMems(); renderForm(); renderItems(); renderRes();
  toast(list.length+'人 入れました'+(add.length>room?'（'+MAX_MEM+'人までなので、残りは入れていません）':''));
  return list.length;
}
async function memAdd(){
  const t=await appPrompt('足す人の名前\n（「、」で区切ると 何人もまとめて入れられます）', '');
  if(t==null) return;
  const names=splitNames(t);
  if(!names.length){ toast('名前を入れてください'); return; }
  await addNames(names);
}
async function memImport(){
  const extra=st.events.filter(x=>x.id!==st.cur && x.members.length).sort((a,b)=>b.upd-a.upd).slice(0,3).map(x=>({label:'💴 「'+x.name+'」の人', names:x.members.map(m=>m.n)}));
  const names=await toolPickNames(extra);
  if(names && names.length) await addNames(names);
}
function memEdit(id){
  const e=ev(), m=e.members.find(x=>x.id===id); if(!m) return;
  const used=e.items.filter(it=>it.who===id).length;
  popOpen(`<b>人を直す</b><label>名前<input id="tkPopName" value="${esc(m.n)}" maxlength="24"></label>
    <div class="tk-pop-h">負担の重み<small>（ふつうの人の何人分を負担するか）</small></div>
    <div class="tk-chips" id="tkPopW">${W_OPTS.map(o=>`<button class="tk-chip sm${m.w===o[0]?' on':''}" data-w="${o[0]}" onclick="TK.popW(${o[0]})">${o[1]} ${o[2]}</button>`).join('')}
      <label class="tk-wc">ほか ×<input id="tkPopWc" inputmode="decimal" value="${W_OPTS.some(o=>o[0]===m.w)?'':m.w}" placeholder="1.5" oninput="TK.popW(null)"></label></div>
    ${used?`<div class="tk-note">${esc(m.n)} さんの立て替えが ${used}件 あります。</div>`:''}
    <div class="tk-pop-acts"><button class="tk-b del" onclick="TK.memDel('${esc(id)}')">🗑 消す</button><button class="tk-b" onclick="TK.popClose()">やめる</button><button class="tk-b pri" onclick="TK.memSave('${esc(id)}')">✓ 決める</button></div>`);
  pop.w=m.w;
}
function popW(w){
  if(!pop) return;
  if(w==null){ const v=toolNum($('tkPopWc').value); pop.w=(isFinite(v)&&v>=0&&v<=10)?Math.round(v*100)/100:pop.w; }
  else { pop.w=w; const c=$('tkPopWc'); if(c) c.value=''; }
  document.querySelectorAll('#tkPopW button').forEach(b=>b.classList.toggle('on', +b.dataset.w===pop.w));
}
function memSave(id){
  const e=ev(), m=e.members.find(x=>x.id===id); if(!m||!pop) return;
  const n=line($('tkPopName').value,24); if(!n){ toast('名前を入れてください'); return; }
  if(e.members.some(x=>x.id!==id && x.n===n)){ toast('同じ名前の人がいます。「鈴木（兄）」のように分けてください', 4000); return; }
  m.n=n; m.w=pop.w; popClose(); touch(); render();
}
async function memDel(id){
  const e=ev(), m=e.members.find(x=>x.id===id); if(!m) return;
  const paid=e.items.filter(it=>it.who===id);
  const only=e.items.filter(it=>it.who!==id && it.for && it.for.length && it.for.every(x=>x===id));   // この人だけの分
  popClose();
  const L=[m.n+' さんを消しますか？'];
  if(paid.length) L.push('・'+m.n+' さんが立て替えた '+paid.length+'件（'+yen(paid.reduce((s,x)=>s+x.amt,0))+'）も消えます');
  if(only.length) L.push('・'+m.n+' さんだけの分の立て替え '+only.length+'件も消えます');
  if(!await appConfirm(L.join('\n'), '消す', 'やめる')) return;
  e.items=e.items.filter(it=>it.who!==id && !only.includes(it));
  e.items.forEach(it=>{ if(it.for&&it.for.length) it.for=it.for.filter(x=>x!==id); });
  e.members=e.members.filter(x=>x.id!==id);
  fFor=fFor.filter(x=>x!==id);
  if(edIt && !e.items.some(x=>x.id===edIt)) edIt=null;
  touch(); render();
}

/* ───────── 立て替え ───────── */
function forAll(){ fFor=[]; renderFor(); }
function forToggle(id){
  const e=ev(), ids=e.members.map(m=>m.id);
  let cur=fFor.length?fFor.slice():ids.slice();
  cur=cur.includes(id)?cur.filter(x=>x!==id):cur.concat(id);
  if(!cur.length){ toast('だれか1人は選んでください'); return; }
  fFor=(cur.length>=ids.length)?[]:ids.filter(x=>cur.includes(x));
  renderFor();
}
function itemSave(){
  const e=ev();
  if(!e.members.length){ toast('先に「＋ 人を足す」で人を入れてください'); return; }
  const who=$('tkWho').value, a=toolNum($('tkAmt').value), what=line($('tkWhat').value,40);
  if(!e.members.some(m=>m.id===who)){ toast('払った人を選んでください'); return; }
  if(!isFinite(a)||a<=0){ toast('金額を入れてください（例：12000・1万2千）'); try{ $('tkAmt').focus(); }catch(_){} return; }
  if(a>MAX_AMT){ toast('金額が大きすぎます'); return; }
  const amt=Math.round(a);
  if(edIt){
    const it=e.items.find(x=>x.id===edIt);
    if(it){ Object.assign(it, {who, amt, what, for:fFor.slice()}); toast('直しました'); }
    edIt=null;
  } else {
    if(e.items.length>=MAX_IT){ toast('立て替えは '+MAX_IT+'件までです'); return; }
    e.items.push({id:uid('i'), who, amt, what, for:fFor.slice()});
    toast(memName(e,who)+' さんの '+yen(amt)+' を入れました');
  }
  e.lastWho=who; fFor=[];
  $('tkAmt').value=''; $('tkWhat').value='';
  touch(); renderForm(); renderItems(); renderRes();
}
function itemEdit(id){
  const e=ev(), it=e.items.find(x=>x.id===id); if(!it) return;
  edIt=id; fFor=(it.for||[]).slice();
  renderForm(); renderItems();
  $('tkAmt').value=String(it.amt); $('tkWhat').value=it.what||'';
  const sec=$('tkFormSec'); if(sec&&sec.scrollIntoView) sec.scrollIntoView({block:'start', behavior:'smooth'});
}
function itemCancel(){ edIt=null; fFor=[]; $('tkAmt').value=''; $('tkWhat').value=''; renderForm(); renderItems(); }
async function itemDel(){
  const e=ev(), it=e.items.find(x=>x.id===edIt); if(!it) return;
  if(!await appConfirm(memName(e,it.who)+' さんの '+yen(it.amt)+(it.what?'（'+it.what+'）':'')+' を消しますか？', '消す', 'やめる')) return;
  e.items=e.items.filter(x=>x.id!==it.id); edIt=null; fFor=[];
  $('tkAmt').value=''; $('tkWhat').value='';
  touch(); renderForm(); renderItems(); renderRes();
}

/* ───────── 精算の結果 ───────── */
function round(u){ if(!ROUNDS.includes(u)) return; ev().round=u; touch(); renderRes(); }
function done(k){ const e=ev(); if(e.done[k]) delete e.done[k]; else e.done[k]=true; touch(); renderRes(); }
function resultText(){
  const e=ev(), s=settle(e), M=e.members;
  const L=['💴 '+e.name+' の精算', '合計 '+yen(s.total)+'（'+M.length+'人）', ''];
  if(s.tr.length){ L.push('▼ 払う'); s.tr.forEach(t=>L.push('・'+M[t.from].n+' → '+M[t.to].n+'　'+yen(t.amt)+(e.done[trKey(e,t)]?'（済）':''))); }
  else L.push('▼ 払い合う分はありません');
  L.push('', '▼ ひとりずつ（払った／負担）');
  M.forEach((m,i)=>{ const v=s.bal[i]; L.push('・'+m.n+(m.w!==1?'('+wTag(m.w)+')':'')+'：'+yen(s.paid[i])+'／'+yen(s.paid[i]-v)+(v>0?' → '+yen(v)+' もらう':v<0?' → '+yen(-v)+' 払う':'')); });
  L.push('', '▼ 立て替えた分');
  e.items.forEach(it=>L.push('・'+memName(e,it.who)+' '+(it.what||'')+' '+yen(it.amt)+'（'+forText(e,it)+'）'));
  if(s.u>1) L.push('', '※ '+s.u+'円単位にそろえています');
  return L.join('\n');
}
function copy(){ return toolCopyText(resultText(), '精算の結果をコピーしました（LINE などに貼れます）'); }
function share(){ return toolShareText(ev().name+' の精算', resultText()); }
function tableRows(kind){
  const e=ev(), s=settle(e), M=e.members, out=[];
  const pay=()=>{ out.push(['払う人','もらう人','金額']); s.tr.forEach(t=>out.push([M[t.from].n, M[t.to].n, t.amt])); if(!s.tr.length) out.push(['（払い合う分はありません）']); };
  const per=()=>{ out.push(['名前','払った','負担','差し引き（＋もらう）']); M.forEach((m,i)=>out.push([m.n, s.paid[i], s.paid[i]-s.bal[i], s.bal[i]])); out.push(['合計', s.total, s.total, 0]); };
  const its=()=>{ out.push(['払った人','何に','金額','だれの分']); e.items.forEach(it=>out.push([memName(e,it.who), it.what||'', it.amt, forText(e,it)])); };
  if(kind==='pay') pay(); else if(kind==='per') per(); else if(kind==='items') its();
  else { out.push([e.name+' の精算']); pay(); out.push(['']); per(); out.push(['']); its(); }
  return out;
}
function toTable(){
  popOpen(`<b>▦ 表に入れる</b><div class="tk-note">表で選んでいるセルから 右下へ入れます（↶戻る で元に戻せます）。</div>
    <div class="tk-pick">${[['all','ぜんぶ（精算・ひとりずつ・立て替え）'],['pay','払い方（だれ → だれ）'],['per','ひとりずつ（払った・負担・差し引き）'],['items','立て替えた分の一覧']].map(o=>`<button class="tk-b" onclick="TK.toTableGo('${o[0]}')">${o[1]}</button>`).join('')}</div>
    <div class="tk-pop-acts"><button class="tk-b" onclick="TK.popClose()">やめる</button></div>`);
}
function toTableGo(kind){ popClose(); toolPasteRows(tableRows(kind), '立て替え精算', closeTatekae); }

/* ───────── 見た目 ───────── */
const TK_CSS=`
#tatekaeOverlay .tk-modal{ display:flex; flex-direction:column; }
.tk-body{ flex:1; min-height:0; overflow:auto; padding:10px 12px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.tk-wrap{ max-width:720px; margin:0 auto; }
.tk-ev{ display:flex; gap:6px; align-items:center; margin-bottom:8px; }
.tk-ev select{ flex:1; min-width:0; height:42px; padding:0 8px; font-size:16px; font-weight:bold; border:1px solid rgba(120,132,156,.5); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.tk-b{ height:42px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; white-space:nowrap; touch-action:manipulation; }
.tk-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .tk-b.del{ color:#c62828; border-color:rgba(198,40,40,.4); } body.dark .tk-b.del{ color:#ef9a9a; }
.tk-b.wide{ width:100%; height:46px; font-size:16px; }
.tk-sec{ margin:10px 0; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); }
.tk-sec h4{ margin:0 0 8px; font-size:15px; color:var(--acc-text,var(--acc)); } .tk-sec h4 small{ color:var(--text-light,#777); font-weight:normal; font-size:12.5px; }
.tk-sec.editing{ box-shadow:0 0 0 2px #fb8c00; }
.tk-mems,.tk-chips{ display:flex; flex-wrap:wrap; gap:6px; }
.tk-chip{ min-height:40px; padding:0 12px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:var(--acc-weak,rgba(33,115,70,.12)); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; touch-action:manipulation; }
.tk-chip i{ font-style:normal; font-size:12px; margin-left:4px; color:#e65100; } body.dark .tk-chip i{ color:#ffb74d; }
.tk-chip.add{ background:transparent; border-style:dashed; color:var(--acc-text,var(--acc)); font-size:14px; }
.tk-chip.sm{ min-height:36px; padding:0 11px; font-size:14px; background:transparent; }
.tk-chip.sm.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .tk-chip.sm.on.dim{ opacity:.75; }
.tk-form{ display:grid; grid-template-columns:1fr 1fr; gap:0 10px; } .tk-form>*{ min-width:0; } .tk-form .wide{ grid-column:1 / -1; }
.tk-form label,.tk-pop label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#777); margin:4px 0 6px; }
.tk-form input,.tk-form select,.tk-pop input{ display:block; width:100%; box-sizing:border-box; margin-top:3px; height:44px; padding:0 10px; font-size:17px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
#tkAmt{ font-variant-numeric:tabular-nums; font-weight:bold; }
.tk-for{ margin:4px 0 10px; } .tk-for-h{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#777); margin-bottom:5px; }
.tk-fbtn{ display:flex; gap:6px; } .tk-fbtn .tk-b{ flex:1; }
.tk-it{ display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:8px 10px; margin:0 0 6px; border-radius:10px; border:1px solid rgba(120,132,156,.25); background:transparent; color:var(--text,#222); cursor:pointer; }
.tk-it.cur{ border-color:#fb8c00; background:rgba(251,140,0,.08); }
.tk-it .no{ flex:none; width:22px; height:22px; border-radius:11px; background:rgba(120,132,156,.18); font-size:11.5px; display:flex; align-items:center; justify-content:center; }
.tk-it .w{ flex:1; min-width:0; font-size:14px; } .tk-it .w small{ display:block; font-size:12px; color:var(--text-light,#777); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tk-it .a{ flex:none; font-size:16px; font-weight:bold; font-variant-numeric:tabular-nums; }
.tk-empty{ padding:14px 6px; text-align:center; color:var(--text-light,#888); font-size:13.5px; line-height:1.6; }
.tk-note{ margin:8px 0 0; padding:7px 10px; border-radius:8px; background:rgba(120,132,156,.1); font-size:12.5px; line-height:1.6; color:var(--text,#333); }
.tk-seg{ display:flex; align-items:center; gap:4px; margin:0 0 10px; font-size:12.5px; font-weight:bold; color:var(--text-light,#777); }
.tk-seg span{ margin-right:4px; }
.tk-seg button{ height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13.5px; font-weight:bold; cursor:pointer; }
.tk-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.tk-pay-h{ font-size:12.5px; font-weight:bold; color:var(--text-light,#777); margin:0 0 6px; }
.tk-pays{ display:flex; flex-direction:column; gap:6px; }
.tk-pay{ display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border-radius:12px; border:2px solid var(--acc); background:var(--acc-weak,rgba(33,115,70,.12)); color:var(--text,#222); cursor:pointer; text-align:left; }
.tk-pay .ck{ flex:none; width:26px; height:26px; border-radius:13px; border:2px solid var(--acc); display:flex; align-items:center; justify-content:center; font-weight:bold; color:var(--on-acc,#fff); }
.tk-pay .who{ flex:1; min-width:0; font-size:16px; display:flex; flex-wrap:wrap; align-items:center; gap:2px 8px; } .tk-pay .who i{ font-style:normal; color:var(--text-light,#777); }
.tk-pay .a{ flex:none; font-size:19px; font-weight:bold; font-variant-numeric:tabular-nums; }
.tk-pay.done{ border-color:rgba(120,132,156,.4); background:transparent; opacity:.6; } .tk-pay.done .ck{ background:var(--acc); } .tk-pay.done .a{ text-decoration:line-through; }
.tk-ok{ padding:10px 12px; border-radius:10px; background:var(--acc-weak,rgba(33,115,70,.12)); font-weight:bold; }
.tk-t{ width:100%; border-collapse:collapse; margin:12px 0 4px; font-size:14px; }
.tk-t th,.tk-t td{ border:1px solid rgba(120,132,156,.3); padding:6px 7px; } .tk-t th{ background:rgba(120,132,156,.12); font-size:12px; }
.tk-t td:not(:first-child){ text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
.tk-t td small{ font-size:11px; margin-left:2px; color:var(--text-light,#777); }
.tk-t td.plus{ color:#1b5e20; font-weight:bold; } .tk-t td.minus{ color:#b71c1c; font-weight:bold; }
body.dark .tk-t td.plus{ color:#81c784; } body.dark .tk-t td.minus{ color:#ef9a9a; }
.tk-t tr.sum td{ font-weight:bold; background:rgba(120,132,156,.08); }
.tk-acts{ display:flex; gap:6px; margin-top:12px; } .tk-acts button{ flex:1; height:44px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.tk-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; padding-top:10vh; }
.tk-pop{ width:min(420px,92%); max-height:80%; overflow:auto; box-sizing:border-box; padding:16px; border-radius:14px; background:var(--panel,var(--modal-bg,#fff)); color:var(--text,#222); box-shadow:0 10px 40px rgba(0,0,0,.35); }
.tk-pop>b{ display:block; font-size:16px; margin-bottom:8px; }
.tk-pop-h{ font-size:12px; font-weight:bold; color:var(--text-light,#777); margin:10px 0 6px; } .tk-pop-h small{ font-weight:normal; }
.tk-wc{ display:flex !important; align-items:center; gap:4px; margin:0 !important; } .tk-wc input{ width:70px !important; height:36px !important; margin:0 !important; font-size:15px !important; }
.tk-pop-acts{ display:flex; gap:6px; justify-content:flex-end; margin-top:14px; } .tk-pop-acts .tk-b.del{ margin-right:auto; }
.tk-pick{ display:flex; flex-direction:column; gap:6px; margin-top:10px; } .tk-pick .tk-b{ text-align:left; height:auto; min-height:44px; padding:8px 12px; white-space:normal; }
@media (max-width:380px){ .tk-body{ padding:8px 8px calc(16px + var(--safe-bottom,0px)); } .tk-sec{ padding:8px 9px 10px; } .tk-b{ padding:0 9px; font-size:13px; } .tk-pay .a{ font-size:17px; } .tk-t{ font-size:13px; } .tk-t th,.tk-t td{ padding:5px 4px; } }
`;
function ensureDom(){
  if($('tatekaeOverlay')) return;
  const stl=document.createElement('style'); stl.id='tkStyle'; stl.textContent=TK_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="tatekaeOverlay">
  <div class="modal vol-modal tk-modal modal-full" style="position:relative">
    <div class="modal-header"><span>💴 立て替え精算</span><button class="modal-close" onclick="closeTatekae()" aria-label="閉じる">✕</button></div>
    <div class="tk-body"><div class="tk-wrap">
      <div class="tk-ev" id="tkEv"></div>
      <section class="tk-sec"><h4>👥 人 <small id="tkMemN"></small></h4><div class="tk-mems" id="tkMems"></div></section>
      <section class="tk-sec" id="tkFormSec"><h4 id="tkFormH">🧾 立て替えた分を入れる</h4>
        <div class="tk-form">
          <label>払った人<select id="tkWho"></select></label>
          <label>金額（円）<input id="tkAmt" inputmode="decimal" autocomplete="off" placeholder="例 12000" enterkeyhint="next"></label>
          <label class="wide">何に（なくてもよい）<input id="tkWhat" autocomplete="off" placeholder="例 ガソリン・夕食・宿" maxlength="40" enterkeyhint="done"></label>
        </div>
        <div class="tk-for"><span class="tk-for-h">だれの分（押すと外せます）</span><div class="tk-chips" id="tkFor"></div></div>
        <div class="tk-fbtn" id="tkFBtn"></div>
      </section>
      <section class="tk-sec"><h4>🧾 立て替えた分 <small id="tkItN"></small></h4><div id="tkItems"></div></section>
      <section class="tk-sec" id="tkRes"></section>
    </div></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  $('tkAmt').addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); $('tkWhat').focus(); } });
  $('tkWhat').addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); itemSave(); } });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openTatekae(){
  ensureDom(); load(); edIt=null; fFor=[];
  openDlg('tatekaeOverlay', ()=>popClose());
  render();
}
function closeTatekae(){ if(!$('tatekaeOverlay')||!isDlgOpen('tatekaeOverlay')) return; popClose(); closeDlg('tatekaeOverlay'); }

window.TK={ pickEv, evNew, evMenu, evRename, evDel, memAdd, memImport, memEdit, popW, memSave, memDel, forAll, forToggle, itemSave, itemEdit, itemCancel, itemDel, round, done, copy, share, toTable, toTableGo, popClose:()=>popClose(),
  state:()=>JSON.parse(JSON.stringify(st)), settle:e=>settle(e||ev()), text:resultText, rows:tableRows, addNames, clean };
Object.assign(window, { openTatekae, closeTatekae });
})();
