/* 📋 出欠・集金表（v579。表電卓の道具。apps/shukin/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   町内会・PTA・同窓会・サークル などの 名簿に、出欠と 集金の ✓ を つける。
   ・表（会や 行事）を いくつも 作れる。新しい 表は 前の 表の 名簿を 写して 始められる。
   ・名前は まとめて 入れる（改行・「、」で 区切る。「名前／班」で 班も）か、📅当番表・📇連絡帳の 名簿から。
   ・会費（1人）・人数（家族で 2人 など）・集金するのは 全員から／出席の 人だけ。金額は 1人ずつ かえられる。
   ・出欠は 出席／欠席／未定 を 押す。集金は 押すと 受け取り（日付も 入る）、もう一度で 取り消し（聞いてから）。一部だけも 入れられる。
   ・上に 合計：出席・欠席・未定の 人数、集まった 金額／予定、まだの 件数と 金額。まだ・出席・欠席・未定で しぼる。班ごとに 分けて 小計。
   ・🖨 印刷（A4 の 表）・📋 文字で コピー（まだの 方の 一覧も）・▦ 表に 入れる。中身は excalc_shukin（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_shukin', MAX_L=60, MAX_M=400, MAX_YEN=99999999;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);   // onclick に 入れるので 英数字だけ
const fmt=n=>Math.round(n).toLocaleString('ja-JP');
// 金額・人数：全角・カンマ・円・1万2千 も（表電卓の toolNum）
function numIn(v, a, b, dflt){
  const s=String(v==null?'':v).trim(); if(s==='') return dflt;
  let n=typeof toolNum==='function' ? toolNum(s) : parseFloat(s.normalize('NFKC').replace(/[,円¥￥\s人]/g,''));
  if(!isFinite(n)) n=parseFloat(s.normalize('NFKC').replace(/[,円¥￥\s人]/g,''));
  return isFinite(n) ? Math.min(b, Math.max(a, Math.round(n))) : dflt;
}
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
function okDate(s){
  const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s||'')); if(!m) return null;
  const y=+m[1], mo=+m[2]-1, d=+m[3], t=new Date(y,mo,d);
  return (y>=1900 && y<=2200 && t.getMonth()===mo && t.getDate()===d) ? t : null;
}
const WD='日月火水木金土';
const jd=s=>{ const d=okDate(s); return d ? d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）' : ''; };
const md=s=>{ const d=okDate(s); return d ? (d.getMonth()+1)+'/'+d.getDate() : ''; };
const ATT={o:'出席', x:'欠席', '':'未定'};

/* ───────── 状態 ───────── */
let st=null;
function cleanM(x){
  if(!x || typeof x!=='object') return null;
  const name=oneLine(x.name,24); if(!name) return null;
  return {id:okId(x.id) ? x.id : rid(), name, grp:oneLine(x.grp,12), n:numIn(x.n,1,99,1), amt:numIn(x.amt,0,MAX_YEN,0),
    att:x.att==='o' || x.att==='x' ? x.att : '', paid:numIn(x.paid,0,MAX_YEN,0), pd:okDate(x.pd) ? x.pd : '', memo:oneLine(x.memo,60)};
}
function cleanL(x){
  if(!x || typeof x!=='object') return null;
  const mem=(Array.isArray(x.mem) ? x.mem : []).map(cleanM).filter(Boolean).slice(0,MAX_M);
  mem.forEach((m,i,a)=>{ if(a.findIndex(y=>y.id===m.id)<i) m.id=rid(); });
  return {id:okId(x.id) ? x.id : rid(), title:oneLine(x.title,40)||'出欠・集金表', date:okDate(x.date) ? x.date : '', fee:numIn(x.fee,0,MAX_YEN,0),
    who:x.who==='att' ? 'att' : 'all', memo:multi(x.memo,300), mem};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const lists=(Array.isArray(o.lists) ? o.lists : []).map(cleanL).filter(Boolean).slice(0,MAX_L);
  lists.forEach((l,i,a)=>{ if(a.findIndex(y=>y.id===l.id)<i) l.id=rid(); });
  st={lists, cur:lists.some(l=>l.id===o.cur) ? o.cur : (lists[0] ? lists[0].id : ''), filt:['all','unpaid','o','x','q'].includes(o.filt) ? o.filt : 'all', grp:!!o.grp};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); return false; } }
const L=()=>st.lists.find(l=>l.id===st.cur)||null;
const mOf=id=>{ const l=L(); return l ? l.mem.find(m=>m.id===id)||null : null; };

/* ───────── 計算 ───────── */
function dueOf(l, m){ if(l.who==='att' && m.att!=='o') return 0; return m.amt>0 ? m.amt : l.fee*m.n; }
// paid（済み）・part（一部）・unpaid（まだ）・none（集めない）・over（予定なしで 受け取り）
function payOf(l, m){ const d=dueOf(l,m); if(d<=0) return m.paid>0 ? 'over' : 'none'; return m.paid>=d ? 'paid' : m.paid>0 ? 'part' : 'unpaid'; }
function sums(l, mem){
  const s={o:0, x:0, q:0, people:0, due:0, paid:0, unN:0, unAmt:0, rows:0};
  (mem||l.mem).forEach(m=>{ s.rows++; s.people+=m.n; if(m.att==='o') s.o+=m.n; else if(m.att==='x') s.x+=m.n; else s.q+=m.n;
    const d=dueOf(l,m); s.due+=d; s.paid+=m.paid; if(d>m.paid){ s.unN++; s.unAmt+=d-m.paid; } });
  return s;
}
function shown(l){
  const f=st.filt;
  return l.mem.filter(m=>f==='all' || (f==='unpaid' ? ['unpaid','part'].includes(payOf(l,m)) : f==='q' ? m.att==='' : m.att===f));
}
function groups(l, mem){
  if(!st.grp) return [{g:null, mem}];
  const keys=[...new Set(l.mem.map(m=>m.grp))].sort((a,b)=>a===''? 1 : b===''? -1 : a.localeCompare(b,'ja',{numeric:true}));
  return keys.map(g=>({g, mem:mem.filter(m=>m.grp===g)})).filter(x=>x.mem.length);
}

/* ───────── 画面 ───────── */
function render(){
  const b=$('shBody'); if(!b) return;
  const l=L(), top=b.scrollTop;
  if(!l){
    b.innerHTML=`<div class="sh-wrap"><div class="sh-empty"><p>町内会・PTA・同窓会 などの 名簿に、出欠と 集金の ✓ を つけます。</p>
      <button type="button" class="sh-b pri" onclick="SHUKIN.newList()">＋ 新しい 表を 作る</button></div></div>`;
    return;
  }
  const s=sums(l), mem=shown(l), pct=s.due ? Math.min(100, Math.round(s.paid/s.due*100)) : 0;
  const cnt={all:l.mem.length, unpaid:l.mem.filter(m=>['unpaid','part'].includes(payOf(l,m))).length, o:l.mem.filter(m=>m.att==='o').length, x:l.mem.filter(m=>m.att==='x').length, q:l.mem.filter(m=>m.att==='').length};
  b.innerHTML=`<div class="sh-wrap">
    <div class="sh-top"><select class="sh-sel" aria-label="表を えらぶ" onchange="SHUKIN.sel(this.value)">${st.lists.map(x=>`<option value="${x.id}"${x.id===l.id?' selected':''}>${esc(x.title)}${x.date ? '（'+md(x.date)+'）' : ''}</option>`).join('')}</select>
      <button type="button" class="sh-b" onclick="SHUKIN.newList()">＋ 新しい 表</button><button type="button" class="sh-b" onclick="SHUKIN.setup()">⚙ 表の 設定</button></div>
    <div class="sh-sum">
      <div class="h"><b>${esc(l.title)}</b>${l.date ? `<span>📅 ${esc(jd(l.date))}</span>` : ''}</div>
      <div class="f">${l.fee ? '会費 1人 <b>'+fmt(l.fee)+'円</b>（'+(l.who==='att' ? '出席の 人だけ' : '全員から')+'）' : '会費は ⚙ で 決めます（集金しない ときは 0 の まま）'}</div>
      <div class="a"><span class="o">出席 <b>${s.o}</b>人</span><span class="x">欠席 <b>${s.x}</b>人</span><span class="q">未定 <b>${s.q}</b>人</span></div>
      ${s.due || s.paid ? `<div class="m">集まった <b>${fmt(s.paid)}円</b> ／ 予定 ${fmt(s.due)}円${s.unN ? `<span class="un">まだ ${s.unN}件 ${fmt(s.unAmt)}円</span>` : '<span class="ok">ぜんぶ 集まりました ✓</span>'}</div>
      <span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ''}
    </div>
    <div class="sh-filt" role="tablist">${[['all','すべて'],['unpaid','💰 まだ'],['o','出席'],['x','欠席'],['q','未定']].map(([k,t])=>`<button type="button" role="tab" aria-selected="${st.filt===k}" class="${st.filt===k?'on':''}" onclick="SHUKIN.filt('${k}')">${t} <b>${cnt[k]}</b></button>`).join('')}
      <label class="sh-ck"><input type="checkbox" ${st.grp?'checked':''} onchange="SHUKIN.grp(this.checked)"> 班ごと</label></div>
    ${!l.mem.length ? '<p class="sh-note">まだ 名簿が ありません。下の「＋ 名前を 入れる」か「📇 名簿から」で 入れてください。</p>'
      : !mem.length ? '<p class="sh-note">当てはまる 人は いません。</p>'
      : groups(l, mem).map(g=>(g.g!==null ? `<h5 class="sh-gh">${esc(g.g||'班なし')}<small>${grpSub(l, g.mem)}</small></h5>` : '')+`<div class="sh-list">${g.mem.map(m=>rowHtml(l, m)).join('')}</div>`).join('')}
    <div class="sh-acts"><button type="button" class="sh-b pri" onclick="SHUKIN.addNames()">＋ 名前を 入れる</button><button type="button" class="sh-b" onclick="SHUKIN.pick()">📇 名簿から</button></div>
    <div class="sh-acts"><button type="button" class="sh-b" onclick="SHUKIN.print()">🖨 印刷</button><button type="button" class="sh-b" onclick="SHUKIN.copy()">📋 コピー</button><button type="button" class="sh-b" onclick="SHUKIN.table()">▦ 表に 入れる</button></div>
    <p class="sh-note">出欠は 出席・欠席・未定を 押します。集金の ボタンを 押すと 受け取り（日付も 入ります）、もう一度で 取り消せます。一部だけ・この人だけ ちがう 金額・人数・班は ✏ で。中身は この端末の中だけに 残ります（設定の バックアップに 入ります）。</p>
  </div>`;
  b.scrollTop=top;
}
function grpSub(l, mem){ const s=sums(l, mem); return s.rows+'件'+(s.due ? '・集まった '+fmt(s.paid)+'円'+(s.unN ? '・まだ '+s.unN+'件' : '') : ''); }
function payBtn(l, m){
  const d=dueOf(l,m), p=payOf(l,m);
  const t=p==='paid' ? '✓ 済 '+fmt(m.paid) : p==='part' ? '一部 '+fmt(m.paid)+'／'+fmt(d) : p==='unpaid' ? '💰 まだ '+fmt(d) : p==='over' ? '✓ '+fmt(m.paid) : '— 集金なし';
  return `<button type="button" class="sh-pay ${p}" onclick="SHUKIN.pay('${m.id}')" aria-label="${esc(m.name)}の 集金：${esc(t)}">${t}${p==='paid' && m.pd ? `<small>${md(m.pd)}</small>` : ''}</button>`;
}
function rowHtml(l, m){
  const i=l.mem.indexOf(m)+1, info=[m.grp, m.n>1 ? m.n+'人' : '', m.amt>0 ? 'この人 '+fmt(m.amt)+'円' : '', m.memo].filter(Boolean).join('・');
  return `<div class="sh-row a-${m.att||'q'}">
    <div class="r1"><span class="no">${i}</span><b class="nm">${esc(m.name)}</b>
      <span class="seg" role="group" aria-label="${esc(m.name)}の 出欠">${[['o','出席'],['x','欠席'],['','未定']].map(([k,t])=>`<button type="button" class="${m.att===k?'on '+(k||'q'):''}" aria-pressed="${m.att===k}" onclick="SHUKIN.att('${m.id}','${k}')">${t}</button>`).join('')}</span></div>
    <div class="r2"><small>${esc(info)}</small>${payBtn(l, m)}<button type="button" class="sh-ed" onclick="SHUKIN.edit('${m.id}')" aria-label="${esc(m.name)}を 直す">✏</button></div>
  </div>`;
}

/* ───────── 小さな窓 ───────── */
let pop=null;
function popOpen(html, kind, id){
  popClose();
  const host=document.querySelector('#shukinOverlay .sh-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='sh-pop-bg';
  el.innerHTML=`<div class="sh-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  pop={el, kind, id, rel:null};
  const me=pop; pop.rel=modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } });
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }
const ph=t=>`<div class="sh-ph"><b>${t}</b><button type="button" class="sh-x" onclick="SHUKIN.close()" aria-label="閉じる">✕</button></div>`;
function openEdit(id){
  const l=L(), m=mOf(id); if(!l || !m) return;
  const d=dueOf(l,m);
  popOpen(ph('✏ '+esc(m.name))+`
    <label class="sh-f"><span>名前</span><input id="shEName" type="text" maxlength="24" value="${esc(m.name)}"></label>
    <label class="sh-f"><span>班</span><input id="shEGrp" type="text" maxlength="12" value="${esc(m.grp)}" placeholder="例：1班"></label>
    <label class="sh-f"><span>人数</span><input id="shEN" type="text" inputmode="numeric" value="${m.n}"><em>人（家族で 2人 など）</em></label>
    <label class="sh-f"><span>この人の 金額</span><input id="shEAmt" type="text" inputmode="numeric" value="${m.amt||''}" placeholder="${fmt(l.fee*m.n)}（会費 × 人数）"><em>円</em></label>
    <label class="sh-f"><span>受け取った</span><input id="shEPaid" type="text" inputmode="numeric" value="${m.paid||''}" placeholder="0"><em>円（予定 ${fmt(d)}円）</em></label>
    <label class="sh-f"><span>受け取った 日</span><input id="shEPd" type="date" value="${esc(m.pd)}"></label>
    <label class="sh-f"><span>メモ</span><input id="shEMemo" type="text" maxlength="60" value="${esc(m.memo)}" placeholder="例：口座で 振込"></label>
    <div class="sh-acts end"><button type="button" class="sh-b warn" onclick="SHUKIN.delM('${m.id}')">🗑 名簿から 消す</button><button type="button" class="sh-b pri" onclick="SHUKIN.editSave('${m.id}')">✓ 直す</button></div>`, 'edit', id);
}
function editSave(id){
  const m=mOf(id); if(!m) return;
  const v=k=>($(k)||{}).value;
  const name=oneLine(v('shEName'),24); if(!name){ toastS('名前を 入れてください'); return; }
  m.name=name; m.grp=oneLine(v('shEGrp'),12); m.n=numIn(v('shEN'),1,99,1); m.amt=numIn(v('shEAmt'),0,MAX_YEN,0);
  m.paid=numIn(v('shEPaid'),0,MAX_YEN,0); m.pd=okDate(v('shEPd')) ? v('shEPd') : (m.paid>0 ? (m.pd||ymd(new Date())) : ''); m.memo=oneLine(v('shEMemo'),60);
  if(!m.paid) m.pd='';
  save(); popClose(); render();
}
function openSetup(){
  const l=L(); if(!l) return;
  popOpen(ph('⚙ 表の 設定')+`
    <label class="sh-f"><span>名前</span><input id="shLTitle" type="text" maxlength="40" value="${esc(l.title)}"></label>
    <label class="sh-f"><span>日付</span><input id="shLDate" type="date" value="${esc(l.date)}"></label>
    <label class="sh-f"><span>会費（1人）</span><input id="shLFee" type="text" inputmode="numeric" value="${l.fee||''}" placeholder="0（集金しない）"><em>円</em></label>
    <div class="sh-f"><span>集金する 人</span><span class="sh-seg2">${[['all','全員から'],['att','出席の 人だけ']].map(([k,t])=>`<button type="button" class="${l.who===k?'on':''}" onclick="SHUKIN.who('${k}')">${t}</button>`).join('')}</span></div>
    <label class="sh-f top"><span>メモ</span><textarea id="shLMemo" rows="2" maxlength="300" placeholder="例：集金は 11/10 まで">${esc(l.memo)}</textarea></label>
    <div class="sh-acts end"><button type="button" class="sh-b warn" onclick="SHUKIN.delList()">🗑 この表を 消す</button><button type="button" class="sh-b" onclick="SHUKIN.reset()">↺ 出欠・集金を 空に</button><button type="button" class="sh-b pri" onclick="SHUKIN.setupSave()">✓ 決める</button></div>`, 'setup');
}
function setupSave(){
  const l=L(); if(!l) return; const v=k=>($(k)||{}).value;
  l.title=oneLine(v('shLTitle'),40)||'出欠・集金表'; l.date=okDate(v('shLDate')) ? v('shLDate') : ''; l.fee=numIn(v('shLFee'),0,MAX_YEN,0); l.memo=multi(v('shLMemo'),300);
  save(); popClose(); render();
}
function setWho(k){ const l=L(); if(!l || !['all','att'].includes(k)) return; l.who=k; save(); render(); if(pop && pop.kind==='setup'){ pop.el.querySelectorAll('.sh-seg2 button').forEach((b,i)=>b.classList.toggle('on', ['all','att'][i]===k)); } }

/* ───────── 入れる・かえる ───────── */
async function newList(){
  if(st.lists.length>=MAX_L){ toastS('表は '+MAX_L+' まで です。古い 表を 消してください'); return; }
  const prev=L();
  const t=typeof appPrompt==='function' ? await appPrompt('新しい 表の 名前（例：11月 町内会費・同窓会 2026）', '') : '';
  if(t==null) return;
  const nl=cleanL({title:oneLine(t,40)||'出欠・集金表', date:ymd(new Date()), mem:[]});
  if(prev && prev.mem.length && typeof appConfirm==='function' && await appConfirm('名簿を「'+prev.title+'」から 写しますか？\n（'+prev.mem.length+'件。出欠・集金は 空で 始めます）', '写す', '写さない')){
    nl.mem=prev.mem.map(m=>cleanM({name:m.name, grp:m.grp, n:m.n, amt:m.amt})); nl.fee=prev.fee; nl.who=prev.who;
  }
  st.lists.push(nl); st.cur=nl.id; st.filt='all'; save(); render();
  toastS('📋「'+nl.title+'」を 作りました');
}
function parseNames(text){
  return String(text||'').split(/[\n、，,]+/).map(s=>{ const [n,g]=s.split(/[／\/]/); return {name:oneLine(n,24), grp:oneLine(g,12)}; }).filter(x=>x.name);
}
function addList(arr){
  const l=L(); if(!l) return 0;
  let add=0, same=0;
  // 同じ 人は 入れない（班を 書いていない ときは 名前だけで みる。名簿から 入れる ときなど）
  arr.forEach(x=>{ if(l.mem.length>=MAX_M) return; if(l.mem.some(m=>m.name===x.name && (!x.grp || m.grp===x.grp))){ same++; return; } const m=cleanM(x); if(m){ l.mem.push(m); add++; } });
  save(); render();
  toastS(add+'人 入れました'+(same ? '（同じ 名前の '+same+'人は 入れません）' : '')+(l.mem.length>=MAX_M ? '（'+MAX_M+'人 まで）' : ''), 3200);
  return add;
}
async function addNames(){
  if(!L()) await newList(); if(!L() || typeof appPrompt!=='function') return;
  const t=await appPrompt('名前を 入れてください。\n改行や「、」で 区切ると まとめて 入ります。\n「名前／班」で 班も（例：山田 太郎／1班）', '', true);
  if(t==null) return; const arr=parseNames(t); if(!arr.length){ toastS('名前が ありません'); return; }
  addList(arr);
}
async function pick(){
  if(!L()) await newList(); if(!L() || typeof toolPickNames!=='function') return;
  const ns=await toolPickNames(); if(!ns || !ns.length) return;
  addList(ns.map(n=>({name:n, grp:''})));
}
function setAtt(id, v){ const m=mOf(id); if(!m || !['o','x',''].includes(v)) return; m.att=v; save(); render(); }
async function pay(id){
  const l=L(), m=mOf(id); if(!l || !m) return;
  const p=payOf(l,m), d=dueOf(l,m);
  if(p==='none'){ openEdit(id); return; }
  if(p==='paid' || p==='over'){
    if(typeof appConfirm==='function' && !(await appConfirm(m.name+' さんの 受け取り（'+fmt(m.paid)+'円）を 取り消しますか？', '取り消す', 'やめる'))) return;
    m.paid=0; m.pd=''; save(); render(); return;
  }
  m.paid=d; m.pd=ymd(new Date()); save(); render(); toastS('✓ '+m.name+' さん '+fmt(d)+'円 受け取り');
}
async function delM(id){
  const l=L(), m=mOf(id); if(!l || !m) return;
  if(typeof appConfirm==='function' && !(await appConfirm(m.name+' さんを この表の 名簿から 消しますか？', '消す', 'やめる'))) return;
  const i=l.mem.indexOf(m); if(i>=0) l.mem.splice(i,1); save(); popClose(); render();
}
async function delList(){
  const l=L(); if(!l) return;
  if(typeof appConfirm==='function' && !(await appConfirm('表「'+l.title+'」を 消しますか？（名簿・出欠・集金も 消えます）', '消す', 'やめる'))) return;
  st.lists.splice(st.lists.indexOf(l),1); st.cur=st.lists[0] ? st.lists[0].id : ''; save(); popClose(); render();
}
async function resetMarks(){
  const l=L(); if(!l) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+l.title+'」の 出欠と 集金を ぜんぶ 空に しますか？（名簿は 残ります）', '空に する', 'やめる'))) return;
  l.mem.forEach(m=>{ m.att=''; m.paid=0; m.pd=''; }); save(); popClose(); render();
}
function sel(id){ if(!st.lists.some(l=>l.id===id)) return; st.cur=id; save(); render(); const b=$('shBody'); if(b) b.scrollTop=0; }
function setFilt(k){ if(!['all','unpaid','o','x','q'].includes(k)) return; st.filt=k; save(); render(); }
function setGrp(on){ st.grp=!!on; save(); render(); }

/* ───────── 印刷・コピー・表に ───────── */
const PAY_N={paid:'済', part:'一部', unpaid:'まだ', none:'', over:'済'};
function docHtml(l){
  const s=sums(l);
  const rows=l.mem.map((m,i)=>{ const p=payOf(l,m), d=dueOf(l,m); return `<tr><td class="c">${i+1}</td><td>${esc(m.grp)}</td><td class="nm">${esc(m.name)}</td><td class="c">${m.n}</td><td class="c a-${m.att||'q'}">${ATT[m.att]}</td><td class="r">${d ? fmt(d) : ''}</td><td class="r">${m.paid ? fmt(m.paid) : ''}</td><td class="c">${PAY_N[p]}</td><td class="c">${esc(md(m.pd))}</td><td>${esc(m.memo)}</td></tr>`; }).join('');
  const un=l.mem.filter(m=>['unpaid','part'].includes(payOf(l,m)));
  return `<div class="sh-doc"><h1>${esc(l.title)}</h1>
    <div class="meta">${l.date ? esc(jd(l.date))+'　' : ''}${l.fee ? '会費 1人 '+fmt(l.fee)+'円（'+(l.who==='att' ? '出席の 人だけ' : '全員から')+'）' : ''}</div>
    <table><thead><tr><th>No.</th><th>班</th><th>名前</th><th>人数</th><th>出欠</th><th>予定</th><th>受取</th><th>集金</th><th>日付</th><th>メモ</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3" class="r">合計</td><td class="c">${s.people}</td><td class="c">出席 ${s.o}</td><td class="r">${fmt(s.due)}</td><td class="r">${fmt(s.paid)}</td><td colspan="3"></td></tr></tfoot></table>
    <div class="tot">出席 ${s.o}人・欠席 ${s.x}人・未定 ${s.q}人　／　集まった ${fmt(s.paid)}円・予定 ${fmt(s.due)}円${s.unN ? '・まだ '+s.unN+'件 '+fmt(s.unAmt)+'円' : ''}</div>
    ${un.length ? `<div class="un"><b>まだの 方</b>：${un.map(m=>esc(m.name)).join('、')}</div>` : ''}
    ${l.memo ? `<div class="memo">${esc(l.memo).replace(/\n/g,'<br>')}</div>` : ''}</div>`;
}
function printDoc(){
  const l=L(); if(!l || !l.mem.length){ toastS('名簿が ありません'); return; }
  let pa=$('printArea'); if(!pa){ pa=document.createElement('div'); pa.id='printArea'; document.body.appendChild(pa); }
  pa.innerHTML=docHtml(l);
  let dyn=$('printDynamicStyle'); if(!dyn){ dyn=document.createElement('style'); dyn.id='printDynamicStyle'; document.head.appendChild(dyn); }
  dyn.textContent='@page{ size: A4 portrait; margin: 12mm; }';
  const old=document.title; document.title=(l.title||'出欠・集金表').replace(/[\\/:*?"<>|]/g,'_');   // PDF に 保存するときの 名前
  setTimeout(()=>{ try{ window.print(); }catch(_){ toastS('印刷を 開けませんでした'); } setTimeout(()=>{ document.title=old; }, 1500); }, 250);
}
function text(){
  const l=L(); if(!l) return '';
  const s=sums(l), out=['📋 '+l.title+(l.date ? '（'+jd(l.date)+'）' : '')];
  if(l.fee) out.push('会費 1人 '+fmt(l.fee)+'円（'+(l.who==='att' ? '出席の 人だけ' : '全員から')+'）');
  out.push('出席 '+s.o+'人・欠席 '+s.x+'人・未定 '+s.q+'人');
  if(s.due || s.paid) out.push('集まった '+fmt(s.paid)+'円 ／ 予定 '+fmt(s.due)+'円'+(s.unN ? '（まだ '+s.unN+'件 '+fmt(s.unAmt)+'円）' : '（ぜんぶ 集まりました）'));
  const un=l.mem.filter(m=>['unpaid','part'].includes(payOf(l,m))), q=l.mem.filter(m=>m.att==='');
  if(un.length) out.push('', '💰 まだの 方（'+un.length+'）', un.map(m=>m.name+(payOf(l,m)==='part' ? '（一部）' : '')).join('、'));
  if(q.length && q.length<l.mem.length) out.push('', '？ 出欠が まだの 方（'+q.length+'）', q.map(m=>m.name).join('、'));
  return out.join('\n');
}
function copy(){ if(!L()){ toastS('表が ありません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 コピーしました（LINE などに 貼れます）'); }
function rows(){
  const l=L(); if(!l) return [];
  const s=sums(l), r=[['No.','班','名前','人数','出欠','予定','受取','集金','日付','メモ']];
  l.mem.forEach((m,i)=>r.push([i+1, m.grp, m.name, m.n, ATT[m.att], dueOf(l,m)||'', m.paid||'', PAY_N[payOf(l,m)], m.pd, m.memo]));
  r.push(['','','合計', s.people, '出席 '+s.o, s.due, s.paid, s.unN ? 'まだ '+s.unN : '', '', '']);
  return r;
}
function toTable(){ const l=L(); if(!l || !l.mem.length){ toastS('名簿が ありません'); return; } if(typeof toolPasteRows==='function') toolPasteRows(rows(), '出欠・集金表', closeShukin); }

/* ───────── 窓 ───────── */
const DOC=`
.sh-doc{ color:#111; background:#fff; font-family:"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif; font-size:12px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sh-doc h1{ font-size:20px; margin:0 0 4px; } .sh-doc .meta{ font-size:12px; margin:0 0 8px; }
.sh-doc table{ width:100%; border-collapse:collapse; border-spacing:0; }
.sh-doc th{ background:#eef0f4; border:1px solid #333; padding:4px 5px; font-size:11.5px; }
.sh-doc td{ border:1px solid #333; padding:3px 5px; font-size:11.5px; vertical-align:top; }
.sh-doc td.nm{ font-weight:bold; } .sh-doc td.r{ text-align:right; white-space:nowrap; } .sh-doc td.c{ text-align:center; white-space:nowrap; }
.sh-doc td.a-x{ color:#b3001b; } .sh-doc tfoot td{ font-weight:bold; background:#f6f7fa; }
.sh-doc .tot{ margin:8px 0 4px; font-weight:bold; } .sh-doc .un{ margin:4px 0; } .sh-doc .memo{ margin:6px 0 0; border:1px solid #333; padding:5px 8px; }
`;
const CSS=`
#shukinOverlay .sh-modal{ display:flex; flex-direction:column; }
.sh-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.sh-wrap{ max-width:820px; margin:0 auto; padding-bottom:16px; }
.sh-top{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 8px; } .sh-sel{ flex:1 1 180px; min-width:0; min-height:44px; padding:0 8px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; }
.sh-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.sh-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .sh-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.sh-sum{ border-radius:14px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); padding:10px 12px; margin:0 0 8px; line-height:1.6; }
.sh-sum .h{ display:flex; flex-wrap:wrap; gap:4px 10px; align-items:baseline; } .sh-sum .h b{ font-size:17px; } .sh-sum .h span{ font-size:13px; color:var(--text-light,#666); }
.sh-sum .f{ font-size:13.5px; color:var(--text-light,#666); } .sh-sum .f b{ color:var(--text,#222); }
.sh-sum .a{ display:flex; gap:12px; flex-wrap:wrap; font-size:14.5px; } .sh-sum .a b{ font-size:18px; } .sh-sum .a .o b{ color:#2e7d32; } .sh-sum .a .x b{ color:#e53935; }
.sh-sum .m{ font-size:14.5px; display:flex; flex-wrap:wrap; gap:4px 10px; align-items:baseline; } .sh-sum .m b{ font-size:18px; } .sh-sum .m .un{ color:#b26a00; font-weight:bold; } .sh-sum .m .ok{ color:#2e7d32; font-weight:bold; }
.sh-sum .bar{ display:block; height:8px; border-radius:4px; background:rgba(120,132,156,.2); overflow:hidden; margin-top:4px; } .sh-sum .bar i{ display:block; height:100%; background:#2e9d4a; }
.sh-filt{ display:flex; gap:5px; flex-wrap:wrap; align-items:center; margin:0 0 8px; }
.sh-filt button{ min-height:38px; padding:0 11px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.sh-filt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.sh-ck{ display:inline-flex; align-items:center; gap:5px; font-size:14px; margin-left:auto; cursor:pointer; } .sh-ck input{ width:20px; height:20px; }
.sh-gh{ margin:12px 0 6px; font-size:15px; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; } .sh-gh small{ font-weight:normal; font-size:12.5px; color:var(--text-light,#666); }
.sh-list{ display:flex; flex-direction:column; gap:6px; }
.sh-row{ border-radius:12px; border:1px solid rgba(120,132,156,.3); border-left:5px solid rgba(120,132,156,.45); background:var(--modal-bg,#fff); padding:6px 8px; }
.sh-row.a-o{ border-left-color:#2e9d4a; } .sh-row.a-x{ border-left-color:#e53935; }
.sh-row .r1{ display:flex; align-items:center; gap:8px; } .sh-row .no{ min-width:1.6em; font-size:12.5px; color:var(--text-light,#666); text-align:right; }
.sh-row .nm{ flex:1; min-width:0; font-size:16px; overflow-wrap:anywhere; }
.sh-row .seg{ display:inline-flex; border:1px solid rgba(120,132,156,.45); border-radius:10px; overflow:hidden; flex:none; }
.sh-row .seg button{ min-width:44px; min-height:38px; padding:0 6px; border:0; border-left:1px solid rgba(120,132,156,.3); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; } .sh-row .seg button:first-child{ border-left:0; }
.sh-row .seg button.on.o{ background:#2e9d4a; color:#fff; font-weight:bold; } .sh-row .seg button.on.x{ background:#e53935; color:#fff; font-weight:bold; } .sh-row .seg button.on.q{ background:rgba(120,132,156,.3); font-weight:bold; }
.sh-row .r2{ display:flex; align-items:center; gap:6px; margin-top:4px; padding-left:calc(1.6em + 8px); } .sh-row .r2 small{ flex:1; min-width:0; font-size:12.5px; color:var(--text-light,#666); overflow-wrap:anywhere; }
.sh-pay{ min-height:40px; min-width:118px; padding:0 10px; border-radius:10px; border:1.5px solid #f0a400; background:transparent; color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; flex:none; }
.sh-pay.paid, .sh-pay.over{ background:#2e9d4a; border-color:#2e9d4a; color:#fff; } .sh-pay small{ font-size:11.5px; font-weight:normal; color:inherit; }
.sh-pay.part{ background:rgba(240,164,0,.18); } .sh-pay.none{ border-color:rgba(120,132,156,.4); color:var(--text-light,#666); font-weight:normal; }
.sh-ed{ min-width:40px; min-height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; flex:none; }
.sh-acts{ display:flex; gap:6px; flex-wrap:wrap; margin:10px 0 0; } .sh-acts .sh-b{ flex:1 1 auto; } .sh-acts.end{ justify-content:flex-end; } .sh-acts.end .sh-b{ flex:0 1 auto; }
.sh-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:10px 0 0; }
.sh-empty{ text-align:center; padding:30px 10px; } .sh-empty p{ margin:0 0 14px; }
.sh-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.sh-pop{ width:100%; max-width:600px; max-height:88%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.sh-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .sh-ph b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.sh-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.sh-f{ display:flex; align-items:center; gap:8px; margin:8px 0; flex-wrap:wrap; } .sh-f.top{ align-items:flex-start; } .sh-f > span{ min-width:6.2em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.sh-f input, .sh-f textarea{ flex:1 1 140px; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.sh-f textarea{ padding:8px 10px; resize:vertical; } .sh-f em{ font-style:normal; font-size:12.5px; color:var(--text-light,#666); }
.sh-seg2{ display:inline-flex; gap:5px; flex-wrap:wrap; } .sh-seg2 button{ min-height:40px; padding:0 12px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.sh-seg2 button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
@media (max-width:400px){ .sh-row .seg button{ min-width:40px; padding:0 4px; font-size:13px; } .sh-pay{ min-width:104px; padding:0 6px; } }
`+DOC.replace(/\.sh-doc/g, '#printArea .sh-doc');
function ensureDom(){
  if($('shukinOverlay')) return;
  const s=document.createElement('style'); s.id='shStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="shukinOverlay">
  <div class="modal vol-modal sh-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📋 出欠・集金表</span><button class="modal-close" onclick="closeShukin()" aria-label="閉じる">✕</button></div>
    <div class="sh-body" id="shBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('shukinOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('keydown', e=>{
    if(e.key!=='Escape' || !pop || !isDlgOpen('shukinOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); }
function openShukin(){ ensureDom(); load(); openDlg('shukinOverlay', cleanup); render(); }
function closeShukin(){ if(!$('shukinOverlay') || !isDlgOpen('shukinOverlay')) return; closeDlg('shukinOverlay', cleanup); }

window.SHUKIN={ newList:()=>newList(), addNames:()=>addNames(), pick:()=>pick(), att:setAtt, pay:id=>pay(id), edit:openEdit, editSave, delM:id=>delM(id),
  setup:openSetup, setupSave, who:setWho, delList:()=>delList(), reset:()=>resetMarks(), sel, filt:setFilt, grp:setGrp, close:popClose,
  print:printDoc, copy, table:toTable, text, rows, html:()=>{ const l=L(); return l ? docHtml(l) : ''; },
  // ためす とき 用
  state:()=>JSON.parse(JSON.stringify(st)), sums:()=>{ const l=L(); return l ? sums(l) : null; }, parse:parseNames, addList,
  payState:()=>{ const l=L(); return l ? l.mem.map(m=>m.name+':'+payOf(l,m)+':'+dueOf(l,m)) : []; }, ids:()=>{ const l=L(); return l ? l.mem.map(m=>m.id) : []; },
  newListNow:newList, payNow:pay, delMNow:delM, delListNow:delList, resetNow:resetMarks };
Object.assign(window, { openShukin, closeShukin });
})();
