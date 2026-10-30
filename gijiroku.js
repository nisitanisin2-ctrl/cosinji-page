/* 📝 会議・総会の 議事録（v605。表電卓の道具。apps/gijiroku/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   町内会・PTA・役員会・職場の 会議・安全衛生委員会 などの 議事録を つくる。
   ・会議ごとに 会の 名前・会議の 名前・日時・場所・出席者（📇 名簿から・前回と 同じ 人。出席／欠席／委任）・議長・書記・議事録署名人
   ・議題ごとに 話し合ったこと・決まったこと・🗳 採決（賛成・反対・棄権 → 可決／否決）・宿題（内容・担当・期限・✓）
   ・前回からの 宿題（同じ 会の まだの もの）を 上に 出して ✓。📌 宿題 の 一覧（だれが・いつまで・過ぎたら 赤）
   ・会員の 数を 入れると 総会の 成立（出席＋委任が 過半数か）を 出す
   ・🖨 印刷・PDF（議事録の 形・署名欄）・🖼 画像・📋 文字で コピー・📅 次回を カレンダーに・📄 次の 会議を 作る
   ・🎤 声で 書く（端末が できるとき）。ひな形：定例会・役員会／総会／職場の 会議／安全衛生委員会／白紙
   中身は excalc_gijiroku（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_gijiroku', MAX_M=300, MAX_P=200, MAX_I=40, MAX_T=40;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);
const okD=s=>typeof s==='string' && /^\d{4}-\d\d-\d\d$/.test(s) && !isNaN(new Date(s+'T00:00'));
const okT=s=>typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
let fixedToday=null;
const todayS=()=>fixedToday && okD(fixedToday) ? fixedToday : ymd(new Date());
const WD='日月火水木金土';
const dOf=s=>{ const a=s.split('-').map(Number); return new Date(a[0], a[1]-1, a[2]); };
const jd=(s, yr)=>{ if(!okD(s)) return ''; const d=dOf(s); return (yr || d.getFullYear()!==dOf(todayS()).getFullYear() ? d.getFullYear()+'年' : '')+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）'; };
const md=s=>{ if(!okD(s)) return ''; const d=dOf(s); return (d.getMonth()+1)+'/'+d.getDate(); };
const ST={p:'出席', a:'欠席', d:'委任'};
const TPL=[
  ['teirei','📋 定例会・役員会',['前回の 議事録・宿題の 確認','報告事項','協議事項','その他']],
  ['sokai','🏛 総会',['第1号議案 事業報告','第2号議案 決算報告・監査報告','第3号議案 事業計画（案）','第4号議案 予算（案）','第5号議案 役員の 選出','その他']],
  ['shokuba','💼 職場の 会議',['前回の 宿題の 確認','報告・共有','決めたい こと','次の 予定']],
  ['anzen','⛑ 安全衛生委員会',['前月の 災害・ヒヤリハット','職場の 巡視の 結果','健康管理（健康診断・熱中症 など）','今月の 重点の 取り組み','その他']],
  ['blank','📄 白紙',[]],
];

/* ───────── 中身 ───────── */
let st=null;   // {v, list:[M], ui:{tab, org, who}}
const intIn=(v,a,b)=>{ const t=String(v==null?'':v).normalize('NFKC').replace(/[,\s人名]/g,''); if(t==='') return ''; const n=Math.round(parseFloat(t)); return isFinite(n) ? Math.min(b, Math.max(a, n)) : ''; };
function cleanTodo(t){ if(!t || typeof t!=='object') return null; const x={id:okId(t.id) ? t.id : rid(), t:oneLine(t.t, 120), who:oneLine(t.who, 30), due:okD(t.due) ? t.due : '', done:t.done===true, doneAt:okD(t.doneAt) ? t.doneAt : ''}; return x.t ? x : null; }
function cleanItem(i){
  if(!i || typeof i!=='object') return null;
  const v=i.vote && typeof i.vote==='object' ? i.vote : null;
  return {id:okId(i.id) ? i.id : rid(), t:oneLine(i.t, 80), memo:multi(i.memo, 3000), dec:multi(i.dec, 1500),
    vote:v ? {y:intIn(v.y,0,99999), n:intIn(v.n,0,99999), a:intIn(v.a,0,99999)} : null,
    todos:(Array.isArray(i.todos) ? i.todos : []).map(cleanTodo).filter(Boolean).slice(0, MAX_T)};
}
function cleanM(m){
  if(!m || typeof m!=='object') return null;
  const seen=new Set();
  const ppl=(Array.isArray(m.ppl) ? m.ppl : []).map(p=>p && typeof p==='object' ? {n:oneLine(p.n, 30), s:ST[p.s] ? p.s : 'p'} : null).filter(p=>p && p.n && !seen.has(p.n) && seen.add(p.n)).slice(0, MAX_P);
  const nx=m.next && typeof m.next==='object' ? m.next : {};
  return {id:okId(m.id) ? m.id : rid(), org:oneLine(m.org, 40), t:oneLine(m.t, 60), date:okD(m.date) ? m.date : todayS(), st:okT(m.st) ? m.st : '', en:okT(m.en) ? m.en : '',
    place:oneLine(m.place, 60), chair:oneLine(m.chair, 30), rec:oneLine(m.rec, 30), signs:[0,1].map(i=>oneLine(Array.isArray(m.signs) ? m.signs[i] : '', 30)),
    members:intIn(m.members, 0, 99999), ppl, items:(Array.isArray(m.items) ? m.items : []).map(cleanItem).filter(Boolean).slice(0, MAX_I),
    next:{date:okD(nx.date) ? nx.date : '', st:okT(nx.st) ? nx.st : '', place:oneLine(nx.place, 60)}, memo:multi(m.memo, 2000), tpl:TPL.some(t=>t[0]===m.tpl) ? m.tpl : 'teirei',
    at:+m.at||Date.now(), up:+m.up||+m.at||Date.now()};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=o && typeof o==='object' ? o : {};
  const ui=o.ui && typeof o.ui==='object' ? o.ui : {};
  st={v:1, list:(Array.isArray(o.list) ? o.list : []).map(cleanM).filter(Boolean).slice(0, MAX_M), ui:{tab:ui.tab==='todo' ? 'todo' : 'list', org:oneLine(ui.org, 40), who:oneLine(ui.who, 30)}};
}
let saveT=0;
function save(){ clearTimeout(saveT); saveT=0; try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末の 空きが 足りず、保存 できませんでした'); return false; } }
function saveSoon(){ clearTimeout(saveT); saveT=setTimeout(save, 400); }
const mOf=id=>st.list.find(m=>m.id===id)||null;
const sortKey=m=>m.date+' '+(m.st||'00:00')+' '+String(m.at).padStart(15,'0');
const ordered=()=>st.list.slice().sort((a,b)=>sortKey(b).localeCompare(sortKey(a)));
const orgs=()=>[...new Set(ordered().map(m=>m.org).filter(Boolean))];
const mTitle=m=>m.t || (m.org ? m.org+' の 会議' : '会議');
// 同じ 会で この 会議より 前の 会議（日付・時刻の 順）
const before=m=>ordered().filter(x=>x.id!==m.id && x.org===m.org && sortKey(x)<sortKey(m));
const counts=m=>({p:m.ppl.filter(x=>x.s==='p').length, a:m.ppl.filter(x=>x.s==='a').length, d:m.ppl.filter(x=>x.s==='d').length});
// 総会の 成立（出席＋委任が 会員の 過半数）
function quorum(m){ if(!m.members) return null; const c=counts(m), need=Math.floor(m.members/2)+1, have=c.p+c.d; return {need, have, ok:have>=need}; }
function voteText(v){
  if(!v || (v.y==='' && v.n==='' && v.a==='')) return '';
  const y=+v.y||0, n=+v.n||0, a=+v.a||0;
  const res=y>n ? (n===0 && a===0 ? '全会一致で 可決' : '賛成多数で 可決') : y===n ? '可否 同数' : '否決';
  return '賛成 '+y+'・反対 '+n+(a ? '・棄権 '+a : '')+' → '+res;
}
// まだの 宿題（全部の 会議から）
function openTodos(org){ const out=[]; ordered().forEach(m=>{ if(org!=null && m.org!==org) return; m.items.forEach(i=>i.todos.forEach(t=>{ if(!t.done) out.push({m, i, t}); })); }); return out; }
const late=t=>t.due && t.due<todayS();

/* ───────── 画面 ───────── */
let cur=null;   // いま 開いている 会議の id（null は 一覧）
function render(){
  const b=$('gjBody'); if(!b || !st) return;
  const top=b.scrollTop;
  b.innerHTML=`<div class="gj-wrap">${cur && mOf(cur) ? editHtml(mOf(cur)) : homeHtml()}</div>`;
  if(cur && mOf(cur)) bits(mOf(cur));
  b.scrollTop=top;
}
function homeHtml(){
  const n=openTodos().length;
  return `<div class="gj-tabs" role="tablist"><button type="button" role="tab" aria-selected="${st.ui.tab==='list'}" class="${st.ui.tab==='list'?'on':''}" onclick="GIJIROKU.tab('list')">📝 会議</button>
      <button type="button" role="tab" aria-selected="${st.ui.tab==='todo'}" class="${st.ui.tab==='todo'?'on':''}" onclick="GIJIROKU.tab('todo')">📌 宿題${n ? ' <small>'+n+'</small>' : ''}</button></div>
    ${st.ui.tab==='todo' ? todoHtml() : listHtml()}`;
}
function listHtml(){
  const os=orgs(), L=ordered().filter(m=>!st.ui.org || m.org===st.ui.org);
  return `<div class="gj-acts top"><button type="button" class="gj-b pri" onclick="GIJIROKU.add()">＋ 新しい 会議</button></div>
    ${os.length>1 ? `<div class="gj-chips"><button type="button" class="${st.ui.org?'':'on'}" onclick="GIJIROKU.org('')">ぜんぶ</button>${os.map(o=>`<button type="button" class="${st.ui.org===o?'on':''}" data-o="${esc(o)}" onclick="GIJIROKU.org(this.dataset.o)">${esc(o)}</button>`).join('')}</div>` : ''}
    ${L.length ? `<div class="gj-list">${L.map(m=>{ const c=counts(m), td=m.items.reduce((a,i)=>a+i.todos.length,0), left=m.items.reduce((a,i)=>a+i.todos.filter(t=>!t.done).length,0);
      return `<button type="button" class="gj-card" onclick="GIJIROKU.open('${m.id}')"><span class="d">${esc(jd(m.date))}${m.st ? ' '+m.st : ''}</span><b>${esc(mTitle(m))}</b>${m.org && m.t ? `<small>${esc(m.org)}</small>` : ''}
        <small class="s">出席 ${c.p}人${c.a ? '・欠席 '+c.a : ''}${c.d ? '・委任 '+c.d : ''}・議題 ${m.items.length}${td ? '・宿題 '+td+(left ? `（<em>のこり ${left}</em>）` : '（済み）') : ''}</small></button>`; }).join('')}</div>`
      : `<div class="gj-empty"><p>会議ごとに、出席者・議題・決まったこと・宿題を 残して、議事録の 形で 印刷・PDF・LINE に 送れます。</p><p>町内会・PTA の 役員会や 総会、職場の 会議、安全衛生委員会の ひな形が あります。</p></div>`}`;
}
function todoHtml(){
  const all=openTodos(), whos=[...new Set(all.map(x=>x.t.who).filter(Boolean))];
  const L=all.filter(x=>!st.ui.who || x.t.who===st.ui.who).sort((a,b)=>(a.t.due||'9999').localeCompare(b.t.due||'9999'));
  return `${whos.length>1 ? `<div class="gj-chips"><button type="button" class="${st.ui.who?'':'on'}" onclick="GIJIROKU.who('')">みんな</button>${whos.map(w=>`<button type="button" class="${st.ui.who===w?'on':''}" data-w="${esc(w)}" onclick="GIJIROKU.who(this.dataset.w)">${esc(w)}</button>`).join('')}</div>` : ''}
    ${L.length ? `<div class="gj-todos">${L.map(x=>`<div class="gj-td${late(x.t)?' late':''}"><button type="button" class="gj-ck" aria-label="${esc(x.t.t)} を 済みに" onclick="GIJIROKU.done('${x.m.id}','${x.i.id}','${x.t.id}')">☐</button>
        <div class="tx"><b>${esc(x.t.t)}</b><small>${x.t.who ? '👤 '+esc(x.t.who)+'　' : ''}${x.t.due ? (late(x.t) ? '⚠ ' : '📅 ')+esc(md(x.t.due))+' まで' : ''}</small><small class="m">${esc(mTitle(x.m))}（${esc(md(x.m.date))}）・${esc(x.i.t||'議題')}</small></div>
        <button type="button" class="gj-b sm" onclick="GIJIROKU.open('${x.m.id}')">開く</button></div>`).join('')}</div>`
      : '<p class="gj-note">まだの 宿題は ありません。議題ごとに「＋ 宿題」で 足せます。</p>'}`;
}
const ta=(id, val, ph, rows, key)=>`<div class="gj-ta"><textarea id="${id}" rows="${rows||3}" placeholder="${esc(ph)}" oninput="GIJIROKU.set(${key}, this.value)">${esc(val)}</textarea>${voiceOk() ? `<button type="button" class="gj-mic" aria-label="声で 書く" onclick="GIJIROKU.mic(this, '${id}')">🎤</button>` : ''}</div>`;
function editHtml(m){
  const c=counts(m), q=quorum(m), prev=before(m).flatMap(x=>x.items.flatMap(i=>i.todos.filter(t=>!t.done).map(t=>({m:x, i, t}))));
  const names=m.ppl.map(p=>p.n), dl=`<datalist id="gjNames">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`;
  const K=(...a)=>esc(JSON.stringify(a));
  const fld=(lab, key, val, o)=>`<label class="gj-f"><span>${lab}</span><input type="${o&&o.type||'text'}" value="${esc(val)}" ${o&&o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o&&o.list ? `list="${o.list}"` : ''} ${o&&o.im ? `inputmode="${o.im}"` : ''} oninput="GIJIROKU.set(${K(key)}, this.value)"></label>`;
  return `<div class="gj-eh"><button type="button" class="gj-b" onclick="GIJIROKU.back()">← 一覧</button><b id="gjEhT">${esc(mTitle(m))}</b></div>
    <section class="gj-sec"><h4>📌 会議</h4>
      ${fld('会の 名前', 'org', m.org, {ph:'例：○○町内会', list:'gjOrgs'})}<datalist id="gjOrgs">${orgs().map(o=>`<option value="${esc(o)}">`).join('')}</datalist>
      ${fld('会議の 名前', 't', m.t, {ph:'例：第3回 役員会'})}
      <div class="gj-row">${fld('日付', 'date', m.date, {type:'date'})}${fld('はじめ', 'st', m.st, {type:'time'})}${fld('おわり', 'en', m.en, {type:'time'})}</div>
      ${fld('場所', 'place', m.place, {ph:'例：公民館 2階'})}
    </section>
    <section class="gj-sec"><h4>👥 出席者 <small>出席 ${c.p}人${c.a ? '・欠席 '+c.a+'人' : ''}${c.d ? '・委任 '+c.d+'人' : ''}</small></h4>
      ${m.ppl.length ? `<div class="gj-ppl">${m.ppl.map((p,i)=>`<span class="gj-p s-${p.s}"><button type="button" class="nm" onclick="GIJIROKU.pst(${i})" aria-label="${esc(p.n)}：${ST[p.s]}（押すと かわる）">${esc(p.n)}<small>${ST[p.s]}</small></button><button type="button" class="x" onclick="GIJIROKU.pdel(${i})" aria-label="${esc(p.n)} を 外す">✕</button></span>`).join('')}</div>
        <p class="gj-note sm">名前を 押すと 出席 → 欠席 → 委任 と かわります。</p>` : ''}
      <div class="gj-add"><input type="text" id="gjPIn" placeholder="名前（「、」で いくつも）" enterkeyhint="done" onpaste="GIJIROKU.paste(event)" onkeydown="if(event.key==='Enter'){ event.preventDefault(); GIJIROKU.padd(); }"><button type="button" class="gj-b" onclick="GIJIROKU.padd()">＋ 足す</button></div>
      <div class="gj-acts"><button type="button" class="gj-b" onclick="GIJIROKU.pick()">📇 名簿から</button>${before(m).length && before(m)[0].ppl.length ? `<button type="button" class="gj-b" onclick="GIJIROKU.pprev()">↩ 前回と 同じ 人</button>` : ''}</div>
      ${fld('会員の 数', 'members', m.members, {im:'numeric', ph:'総会の 成立を 見る とき'})}
      <p class="gj-q" id="gjQ" hidden></p>
      ${dl}
      <div class="gj-row">${fld('議長', 'chair', m.chair, {list:'gjNames'})}${fld('書記', 'rec', m.rec, {list:'gjNames'})}</div>
      <div class="gj-row">${fld('署名人 1', 'sign0', m.signs[0], {list:'gjNames'})}${fld('署名人 2', 'sign1', m.signs[1], {list:'gjNames'})}</div>
    </section>
    ${prev.length ? `<section class="gj-sec"><h4>↩ 前回からの 宿題 <small>${prev.length}件</small></h4><div class="gj-todos">${prev.map(x=>`<div class="gj-td${late(x.t)?' late':''}"><button type="button" class="gj-ck" aria-label="${esc(x.t.t)} を 済みに" onclick="GIJIROKU.done('${x.m.id}','${x.i.id}','${x.t.id}')">☐</button>
      <div class="tx"><b>${esc(x.t.t)}</b><small>${x.t.who ? '👤 '+esc(x.t.who)+'　' : ''}${x.t.due ? (late(x.t) ? '⚠ ' : '📅 ')+esc(md(x.t.due))+' まで' : ''}　（${esc(md(x.m.date))} の ${esc(x.i.t||'議題')}）</small></div></div>`).join('')}</div></section>` : ''}
    <section class="gj-sec"><h4>🗂 議題 <small>${m.items.length}</small></h4>
      ${m.items.map((it,k)=>`<div class="gj-item"><div class="gj-ih"><span class="no">${k+1}</span><input type="text" value="${esc(it.t)}" placeholder="議題" aria-label="議題 ${k+1} の 名前" oninput="GIJIROKU.set(${K('item', it.id, 't')}, this.value)">
          <button type="button" class="gj-ib" aria-label="上へ" onclick="GIJIROKU.imove('${it.id}', -1)"${k ? '' : ' disabled'}>↑</button><button type="button" class="gj-ib" aria-label="下へ" onclick="GIJIROKU.imove('${it.id}', 1)"${k<m.items.length-1 ? '' : ' disabled'}>↓</button><button type="button" class="gj-ib" aria-label="議題を 消す" onclick="GIJIROKU.idel('${it.id}')">🗑</button></div>
        <small class="gj-lb">話し合ったこと</small>${ta('gjM_'+it.id, it.memo, '例：会場の 案を 2つ 出した。', 3, K('item', it.id, 'memo'))}
        <small class="gj-lb">決まったこと</small>${ta('gjD_'+it.id, it.dec, '例：会場は 公民館に する。', 2, K('item', it.id, 'dec'))}
        ${it.vote ? `<div class="gj-vote"><span>🗳 採決</span><label>賛成<input type="text" inputmode="numeric" value="${esc(it.vote.y)}" oninput="GIJIROKU.set(${K('vote', it.id, 'y')}, this.value)"></label><label>反対<input type="text" inputmode="numeric" value="${esc(it.vote.n)}" oninput="GIJIROKU.set(${K('vote', it.id, 'n')}, this.value)"></label><label>棄権<input type="text" inputmode="numeric" value="${esc(it.vote.a)}" oninput="GIJIROKU.set(${K('vote', it.id, 'a')}, this.value)"></label><button type="button" class="gj-ib" aria-label="採決を 外す" onclick="GIJIROKU.vote('${it.id}')">✕</button><b data-vr="${it.id}">${esc(voteText(it.vote))}</b></div>` : ''}
        ${it.todos.length ? `<div class="gj-tl">${it.todos.map(t=>`<div class="gj-t${t.done?' dn':''}${late(t) && !t.done?' late':''}"><button type="button" class="gj-ck" aria-label="${esc(t.t)}：${t.done ? '済み' : 'まだ'}" onclick="GIJIROKU.tdone('${it.id}','${t.id}')">${t.done ? '☑' : '☐'}</button>
            <input type="text" value="${esc(t.t)}" aria-label="宿題" oninput="GIJIROKU.set(${K('todo', it.id, t.id, 't')}, this.value)"><input type="text" class="w" value="${esc(t.who)}" placeholder="担当" list="gjNames" aria-label="担当" oninput="GIJIROKU.set(${K('todo', it.id, t.id, 'who')}, this.value)"><input type="date" class="dd" value="${esc(t.due)}" aria-label="期限" onchange="GIJIROKU.set(${K('todo', it.id, t.id, 'due')}, this.value, 1)"><button type="button" class="gj-ib" aria-label="宿題を 消す" onclick="GIJIROKU.tdel('${it.id}','${t.id}')">✕</button></div>`).join('')}</div>` : ''}
        <div class="gj-acts sm"><button type="button" class="gj-b sm" onclick="GIJIROKU.tadd('${it.id}')">＋ 宿題</button>${it.vote ? '' : `<button type="button" class="gj-b sm" onclick="GIJIROKU.vote('${it.id}')">🗳 採決を 書く</button>`}</div></div>`).join('')}
      <div class="gj-acts"><button type="button" class="gj-b" onclick="GIJIROKU.iadd()">＋ 議題を 足す</button></div>
    </section>
    <section class="gj-sec"><h4>📅 次回</h4>
      <div class="gj-row">${fld('日付', 'ndate', m.next.date, {type:'date'})}${fld('時刻', 'nst', m.next.st, {type:'time'})}</div>${fld('場所', 'nplace', m.next.place, {ph:'例：公民館'})}
      ${m.next.date ? '<div class="gj-acts"><button type="button" class="gj-b" onclick="GIJIROKU.cal()">📅 次回を カレンダーに</button></div>' : ''}</section>
    <section class="gj-sec"><h4>📎 その他</h4>${ta('gjMemo', m.memo, '例：配った 資料・連絡事項', 2, K('memo'))}</section>
    <div class="gj-out"><button type="button" class="gj-b pri" onclick="GIJIROKU.print()">🖨 印刷・PDF</button><button type="button" class="gj-b" onclick="GIJIROKU.image()">🖼 画像</button><button type="button" class="gj-b" onclick="GIJIROKU.copy()">📋 文字で コピー</button>
      <button type="button" class="gj-b" onclick="GIJIROKU.nextMeet()">📄 次の 会議を 作る</button><button type="button" class="gj-b warn" onclick="GIJIROKU.del('${m.id}')">🗑 この 会議を 消す</button></div>`;
}

/* ───────── 直す ───────── */
function setF(key, v){
  const m=mOf(cur); if(!m) return;
  const k=Array.isArray(key) ? key : [key];
  const w=k[0];
  if(['org','t','place','chair','rec'].includes(w)) m[w]=oneLine(v, w==='t' ? 60 : w==='org' || w==='place' ? 60 : 30);
  else if(w==='date'){ if(okD(v)) m.date=v; }
  else if(w==='st' || w==='en'){ m[w]=okT(v) ? v : ''; }
  else if(w==='sign0' || w==='sign1') m.signs[+w.slice(-1)]=oneLine(v, 30);
  else if(w==='members') m.members=intIn(v, 0, 99999);
  else if(w==='ndate') m.next.date=okD(v) ? v : '';
  else if(w==='nst') m.next.st=okT(v) ? v : '';
  else if(w==='nplace') m.next.place=oneLine(v, 60);
  else if(w==='memo') m.memo=multi(v, 2000);
  else if(w==='item'){ const it=m.items.find(i=>i.id===k[1]); if(!it) return; if(k[2]==='t') it.t=oneLine(v, 80); else if(k[2]==='memo') it.memo=multi(v, 3000); else if(k[2]==='dec') it.dec=multi(v, 1500); }
  else if(w==='vote'){ const it=m.items.find(i=>i.id===k[1]); if(!it || !it.vote) return; it.vote[k[2]]=intIn(v, 0, 99999); }
  else if(w==='todo'){ const it=m.items.find(i=>i.id===k[1]); const t=it && it.todos.find(x=>x.id===k[2]); if(!t) return; if(k[3]==='t') t.t=oneLine(v, 120); else if(k[3]==='who') t.who=oneLine(v, 30); else if(k[3]==='due') t.due=okD(v) ? v : ''; }
  else return;
  m.up=Date.now(); saveSoon();
  if(w==='date' || w==='ndate' || (w==='todo' && k[3]==='due')){ render(); return; }   // 日付を えらんだ とき（期限の 色・次回の ボタン）
  bits(m);
}
// 組み直さずに、題・成立・採決の 字だけ 合わせる
function bits(m){
  const t=$('gjEhT'); if(t) t.textContent=mTitle(m);
  const qe=$('gjQ'), q=quorum(m), c=counts(m);
  if(qe){ qe.hidden=!q; if(q){ qe.className='gj-q '+(q.ok ? 'ok' : 'ng'); qe.textContent=(q.ok ? '✅' : '⚠')+' 会員 '+m.members+'人 → 過半数は '+q.need+'人。出席 '+c.p+'人＋委任 '+c.d+'人＝'+q.have+'人で、'+(q.ok ? '会は 成立 しています' : 'まだ 足りません')+'。'; } }
  m.items.forEach(it=>{ const b=document.querySelector('[data-vr="'+it.id+'"]'); if(b) b.textContent=voteText(it.vote); });
}
function newMeet(org, tplK, copyPpl){
  const t=TPL.find(x=>x[0]===tplK)||TPL[0];
  const prev=org ? ordered().find(x=>x.org===org) : null;
  const m=cleanM({id:rid(), org, t:'', date:todayS(), tpl:t[0], items:t[2].map(n=>({id:rid(), t:n})), ppl:copyPpl && prev ? prev.ppl.map(p=>({n:p.n, s:'p'})) : [],
    chair:copyPpl && prev ? prev.chair : '', rec:copyPpl && prev ? prev.rec : '', place:prev && prev.next.place ? prev.next.place : prev ? prev.place : '', members:prev ? prev.members : '', at:Date.now()});
  if(prev && prev.next.date) m.date=prev.next.date;
  if(prev && prev.next.st) m.st=prev.next.st;
  st.list.unshift(m); st.list=st.list.slice(0, MAX_M); save();
  return m;
}
let pop=null;
function popOpen(html){
  popClose();
  const host=document.querySelector('#gijirokuOverlay .gj-modal'); if(!host) return null;
  const el=document.createElement('div'); el.className='gj-pop-bg';
  el.innerHTML=`<div class="gj-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  const me={el, rel:null}; pop=me;
  me.rel=typeof modalBack==='function' ? modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } }) : ()=>{};
  return el;
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }
let addTpl='teirei';
function add(){
  const os=orgs(), def=st.ui.org || os[0] || '';
  addTpl='teirei';
  popOpen(`<div class="gj-ph"><span aria-hidden="true">📝</span><b>新しい 会議</b><button type="button" class="gj-x" onclick="GIJIROKU.close()" aria-label="閉じる">✕</button></div>
    <label class="gj-f"><span>会の 名前</span><input type="text" id="gjNewOrg" maxlength="40" value="${esc(def)}" placeholder="例：○○町内会" list="gjOrgs2"></label><datalist id="gjOrgs2">${os.map(o=>`<option value="${esc(o)}">`).join('')}</datalist>
    <div class="gj-tpl" role="radiogroup" aria-label="ひな形">${TPL.map(t=>`<button type="button" role="radio" aria-checked="${t[0]==='teirei'}" class="${t[0]==='teirei'?'on':''}" data-t="${t[0]}" onclick="GIJIROKU.tpl('${t[0]}')"><b>${t[1]}</b><small>${t[2].length ? esc(t[2].join('・')) : '議題なし'}</small></button>`).join('')}</div>
    ${os.length ? '<label class="gj-ck2"><input type="checkbox" id="gjNewCopy" checked> 前回の 出席者・議長・書記を 写す（同じ 会の とき）</label>' : ''}
    <div class="gj-acts end"><button type="button" class="gj-b" onclick="GIJIROKU.close()">やめる</button><button type="button" class="gj-b pri" onclick="GIJIROKU.addGo()">＋ 作る</button></div>`);
}
function setTpl(k){ if(!TPL.some(t=>t[0]===k)) return; addTpl=k; document.querySelectorAll('.gj-tpl button').forEach(b=>{ const on=b.dataset.t===k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); }
function addGo(){
  const org=oneLine(($('gjNewOrg')||{}).value, 40), cp=$('gjNewCopy') ? $('gjNewCopy').checked : false;
  const m=newMeet(org, addTpl, cp);
  popClose(); cur=m.id; render(); const b=$('gjBody'); if(b) b.scrollTop=0;
}
function nextMeet(){
  const m=mOf(cur); if(!m) return;
  const n=newMeet(m.org, m.tpl, true);
  cur=n.id; render(); const b=$('gjBody'); if(b) b.scrollTop=0;
  toastS('📄 次の 会議を 作りました（前回の 出席者と、まだの 宿題が 出ます）');
}
function openM(id){ if(!mOf(id)) return; save(); cur=id; render(); const b=$('gjBody'); if(b) b.scrollTop=0; }
function back(){ save(); cur=null; render(); }
async function del(id){
  const m=mOf(id); if(!m) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+mTitle(m)+'」（'+jd(m.date)+'）を 消しますか？','消す','やめる'))) return;
  st.list=st.list.filter(x=>x.id!==id); save(); cur=null; render();
}
// 出席者
function splitNames(s){ return String(s||'').split(/[、，,\n]+/).map(x=>oneLine(x, 30)).filter(Boolean); }
function addNames(names){
  const m=mOf(cur); if(!m) return 0;
  let n=0; names.forEach(x=>{ if(m.ppl.length<MAX_P && !m.ppl.some(p=>p.n===x)){ m.ppl.push({n:x, s:'p'}); n++; } });
  if(n){ m.up=Date.now(); save(); render(); }
  return n;
}
// 1行に 1人の 名簿を 貼ると、1行の 欄では 改行が 消えて 名前が くっつく。貼る ときに「、」に かえる
function paste(e){
  const t=e && e.clipboardData ? e.clipboardData.getData('text') : ''; if(!t || !/[\r\n]/.test(t)) return;
  e.preventDefault();
  const el=e.target, v=t.split(/\r\n?|\n/).map(x=>x.trim()).filter(Boolean).join('、'), a=el.selectionStart||0, b=el.selectionEnd||0;
  el.value=el.value.slice(0, a)+v+el.value.slice(b); el.selectionStart=el.selectionEnd=a+v.length;
}
function padd(){ const el=$('gjPIn'); if(!el) return; const n=addNames(splitNames(el.value)); if(n){ const e2=$('gjPIn'); if(e2) e2.focus(); } else if(el.value.trim()) toastS('もう 入っています'); }
async function pick(){
  const m=mOf(cur); if(!m || typeof toolPickNames!=='function') return;
  const extra=[]; const pv=before(m)[0]; if(pv && pv.ppl.length) extra.push({label:'📝 前回（'+md(pv.date)+'）の 出席者', names:pv.ppl.map(p=>p.n)});
  const got=await toolPickNames(extra, {have:m.ppl.map(p=>p.n)});
  if(got && got.length){ const n=addNames(got); toastS(n+'人 足しました'); }
}
function pprev(){ const m=mOf(cur); if(!m) return; const pv=before(m)[0]; if(!pv) return; const n=addNames(pv.ppl.map(p=>p.n)); toastS(n ? n+'人 足しました' : 'もう みんな 入っています'); }
function pst(i){ const m=mOf(cur); const p=m && m.ppl[i]; if(!p) return; p.s=p.s==='p' ? 'a' : p.s==='a' ? 'd' : 'p'; m.up=Date.now(); save(); render(); }
function pdel(i){ const m=mOf(cur); if(!m || !m.ppl[i]) return; m.ppl.splice(i,1); m.up=Date.now(); save(); render(); }
// 議題・宿題
function iadd(){ const m=mOf(cur); if(!m) return; if(m.items.length>=MAX_I){ toastS('議題は '+MAX_I+'まで です'); return; } const it=cleanItem({id:rid(), t:''}); m.items.push(it); save(); render(); setTimeout(()=>{ const e=document.querySelector('.gj-item:last-of-type .gj-ih input'); if(e) e.focus(); }, 30); }
function imove(id, d){ const m=mOf(cur); if(!m) return; const i=m.items.findIndex(x=>x.id===id), j=i+d; if(i<0 || j<0 || j>=m.items.length) return; [m.items[i], m.items[j]]=[m.items[j], m.items[i]]; save(); render(); }
async function idel(id){
  const m=mOf(cur); const it=m && m.items.find(x=>x.id===id); if(!it) return;
  if((it.memo || it.dec || it.todos.length) && typeof appConfirm==='function' && !(await appConfirm('議題「'+(it.t||'（名前なし）')+'」を 消しますか？（書いた ことも 消えます）','消す','やめる'))) return;
  m.items=m.items.filter(x=>x.id!==id); save(); render();
}
function tadd(iid){ const m=mOf(cur); const it=m && m.items.find(x=>x.id===iid); if(!it) return; if(it.todos.length>=MAX_T) return; it.todos.push({id:rid(), t:'（宿題）', who:'', due:'', done:false, doneAt:''}); save(); render();
  setTimeout(()=>{ const els=document.querySelectorAll('.gj-item .gj-t input[aria-label="宿題"]'); const e=[...els].reverse().find(x=>x.value==='（宿題）'); if(e){ e.focus(); e.select(); } }, 30); }
function tdel(iid, tid){ const m=mOf(cur); const it=m && m.items.find(x=>x.id===iid); if(!it) return; it.todos=it.todos.filter(t=>t.id!==tid); save(); render(); }
function tdone(iid, tid){ const m=mOf(cur); const it=m && m.items.find(x=>x.id===iid); const t=it && it.todos.find(x=>x.id===tid); if(!t) return; t.done=!t.done; t.doneAt=t.done ? todayS() : ''; save(); render(); }
function doneAny(mid, iid, tid){ const m=mOf(mid); const it=m && m.items.find(x=>x.id===iid); const t=it && it.todos.find(x=>x.id===tid); if(!t) return; t.done=true; t.doneAt=todayS(); save(); render(); toastS('☑ 「'+t.t+'」を 済みに しました'); }
function vote(iid){ const m=mOf(cur); const it=m && m.items.find(x=>x.id===iid); if(!it) return; it.vote=it.vote ? null : {y:'', n:'', a:''}; save(); render(); }

/* ───────── 🎤 声で 書く ───────── */
const recCtor=()=>window.SpeechRecognition || window.webkitSpeechRecognition || null;
const voiceOk=()=>!!recCtor();
let rec=null;
function mic(btn, id){
  if(rec){ try{ rec.stop(); }catch(_){} return; }
  const C=recCtor(), el=$(id); if(!C || !el) return;
  rec=new C(); rec.lang='ja-JP'; rec.interimResults=false; rec.continuous=false;
  btn.classList.add('on'); btn.textContent='⏹';
  rec.onresult=e=>{ const t=[...e.results].map(r=>r[0].transcript).join('').trim(); if(t){ el.value=(el.value.trim() ? el.value.replace(/\s+$/,'')+'\n' : '')+t; el.dispatchEvent(new Event('input')); } };
  rec.onend=()=>{ rec=null; if(btn.isConnected){ btn.classList.remove('on'); btn.textContent='🎤'; } };
  rec.onerror=e=>{ if(e && e.error==='not-allowed') toastS('マイクが 使えません（端末の 設定で マイクを 許可して ください）'); };
  try{ rec.start(); }catch(_){ rec=null; btn.classList.remove('on'); btn.textContent='🎤'; }
}

/* ───────── 書き出す ───────── */
function plainText(m){
  const c=counts(m), names=s=>m.ppl.filter(p=>p.s===s).map(p=>p.n).join('、'), q=quorum(m);
  const L=['【議事録】'+mTitle(m)+(m.org && m.t ? '（'+m.org+'）' : '')];
  L.push('日時：'+jd(m.date, true)+(m.st ? ' '+m.st+(m.en ? '〜'+m.en : '') : ''));
  if(m.place) L.push('場所：'+m.place);
  if(c.p) L.push('出席：'+names('p')+'（'+c.p+'人）');
  if(c.a) L.push('欠席：'+names('a')+'（'+c.a+'人）');
  if(c.d) L.push('委任：'+names('d')+'（'+c.d+'人）');
  if(q) L.push('会員 '+m.members+'人・出席＋委任 '+q.have+'人（過半数 '+q.need+'人）→ '+(q.ok ? '成立' : '不成立'));
  const roles=[m.chair ? '議長：'+m.chair : '', m.rec ? '書記：'+m.rec : ''].filter(Boolean).join('　'); if(roles) L.push(roles);
  m.items.forEach((it,k)=>{
    L.push('', '■ '+(k+1)+'. '+(it.t||'議題'));
    if(it.memo) L.push(it.memo);
    if(it.dec) L.push('（決定）'+it.dec);
    const v=voteText(it.vote); if(v) L.push('（採決）'+v);
    it.todos.forEach(t=>L.push('（宿題）'+(t.done ? '☑ ' : '')+t.t+(t.who ? '：'+t.who : '')+(t.due ? '（'+md(t.due)+'まで）' : '')));
  });
  if(m.next.date) L.push('', '■ 次回：'+jd(m.next.date, true)+(m.next.st ? ' '+m.next.st : '')+(m.next.place ? '　'+m.next.place : ''));
  if(m.memo) L.push('', '■ その他', m.memo);
  return L.join('\n');
}
const DOC_CSS=`
#printArea .op-doc .gj-doc{ color:#000; font-size:12px; line-height:1.65; }
#printArea .op-doc .gj-dt{ text-align:center; font-size:22px; font-weight:bold; letter-spacing:.3em; margin:0 0 2px; }
#printArea .op-doc .gj-ds{ text-align:center; font-size:13px; margin:0 0 10px; }
#printArea .op-doc table.gj-dh{ width:100%; border-collapse:collapse; table-layout:fixed; margin:0 0 12px; }
#printArea .op-doc .gj-dh th, #printArea .op-doc .gj-dh td{ border:1px solid #555; padding:5px 8px; font-size:12px; text-align:left; vertical-align:top; overflow-wrap:anywhere; }
#printArea .op-doc .gj-dh th{ width:16%; background:#f1f3f5; font-weight:bold; }
#printArea .op-doc .gj-di{ margin:0 0 10px; break-inside:avoid; }
#printArea .op-doc .gj-dih{ font-size:13.5px; font-weight:bold; padding:2px 8px; border-left:5px solid #1f5aa6; background:#f2f5fa; margin:0 0 4px; }
#printArea .op-doc .gj-dp{ margin:2px 0 2px 10px; white-space:pre-wrap; }
#printArea .op-doc .gj-dk{ display:inline-block; min-width:4.5em; font-weight:bold; }
#printArea .op-doc table.gj-dtd{ width:calc(100% - 10px); margin:4px 0 0 10px; border-collapse:collapse; }
#printArea .op-doc .gj-dtd th, #printArea .op-doc .gj-dtd td{ border:1px solid #888; padding:3px 6px; font-size:11.5px; text-align:left; }
#printArea .op-doc .gj-dtd th{ background:#f1f3f5; }
#printArea .op-doc .gj-dsg{ margin:22px 0 0; break-inside:avoid; }
#printArea .op-doc .gj-dsg p{ margin:0 0 14px; }
#printArea .op-doc .gj-dsl{ display:flex; justify-content:flex-end; gap:8px; margin:0 0 16px; font-size:13px; }
#printArea .op-doc .gj-dsl span{ display:inline-block; width:15em; border-bottom:1px solid #000; text-align:center; }
`;
function docHtml(m){
  const c=counts(m), names=s=>m.ppl.filter(p=>p.s===s).map(p=>esc(p.n)).join('、'), q=quorum(m);
  const row=(k,v)=>v ? `<tr><th>${k}</th><td>${v}</td></tr>` : '';
  let h=`<div class="gj-dt">議 事 録</div><div class="gj-ds">${esc(mTitle(m))}${m.org && m.t ? '（'+esc(m.org)+'）' : ''}</div>
    <table class="gj-dh">${row('日時', esc(jd(m.date, true))+(m.st ? '　'+m.st+(m.en ? '〜'+m.en : '') : ''))}${row('場所', esc(m.place))}
    ${row('出席者', c.p ? names('p')+'（'+c.p+'名）' : '')}${row('欠席者', c.a ? names('a')+'（'+c.a+'名）' : '')}${row('委任', c.d ? names('d')+'（'+c.d+'名）' : '')}
    ${q ? row('成立', '会員 '+m.members+'名中　出席 '+c.p+'名・委任 '+c.d+'名　計 '+q.have+'名（過半数 '+q.need+'名）　'+(q.ok ? '<b>成立</b>' : '不成立')) : ''}
    ${row('議長', esc(m.chair))}${row('書記', esc(m.rec))}</table>`;
  m.items.forEach((it,k)=>{
    const v=voteText(it.vote);
    h+=`<div class="gj-di"><div class="gj-dih">${k+1}．${esc(it.t||'議題')}</div>
      ${it.memo ? `<div class="gj-dp">${esc(it.memo)}</div>` : ''}${it.dec ? `<div class="gj-dp"><span class="gj-dk">【決定】</span>${esc(it.dec)}</div>` : ''}${v ? `<div class="gj-dp"><span class="gj-dk">【採決】</span>${esc(v)}</div>` : ''}
      ${it.todos.length ? `<table class="gj-dtd"><tr><th>宿題</th><th style="width:22%">担当</th><th style="width:16%">期限</th><th style="width:8%">済</th></tr>${it.todos.map(t=>`<tr><td>${esc(t.t)}</td><td>${esc(t.who)}</td><td>${esc(md(t.due))}</td><td>${t.done ? '☑' : ''}</td></tr>`).join('')}</table>` : ''}</div>`;
  });
  if(m.next.date) h+=`<div class="gj-di"><div class="gj-dih">次回</div><div class="gj-dp">${esc(jd(m.next.date, true))}${m.next.st ? '　'+m.next.st : ''}${m.next.place ? '　'+esc(m.next.place) : ''}</div></div>`;
  if(m.memo) h+=`<div class="gj-di"><div class="gj-dih">その他</div><div class="gj-dp">${esc(m.memo)}</div></div>`;
  if(m.chair || m.signs[0] || m.signs[1] || m.tpl==='sokai'){
    h+=`<div class="gj-dsg"><p>以上の 議事の 経過と 結果を 明らかに するため、この 議事録を 作り、議長 及び 議事録署名人が 署名 押印する。</p>
      <div class="gj-dsl">${esc(jd(todayS(), true))}</div>
      <div class="gj-dsl">議　長　<span>${esc(m.chair)}</span>　印</div>
      <div class="gj-dsl">議事録署名人　<span>${esc(m.signs[0])}</span>　印</div>
      <div class="gj-dsl">議事録署名人　<span>${esc(m.signs[1])}</span>　印</div></div>`;
  }
  return `<div class="op-doc"><style>${DOC_CSS}</style><div class="gj-doc">${h}</div></div>`;
}
function print(){ const m=mOf(cur); if(!m) return null; save(); const built=opBuild(docHtml(m), true); opPrint(built); return built; }
async function image(){ const m=mOf(cur); if(!m) return null; save(); const built=opBuild(docHtml(m), true); return await opImage(built, '議事録', false); }
function copy(){ const m=mOf(cur); if(!m) return; if(typeof toolCopyText==='function') toolCopyText(plainText(m), '📋 議事録を コピーしました（LINE・メールに 貼れます）'); }
function calEv(m){
  if(!m.next.date) return null;
  return {uid:'gijiroku-'+m.id+'-next', title:(m.org ? m.org+' ' : '')+'会議', date:m.next.date, start:m.next.st||'', allDay:!m.next.st, loc:m.next.place, desc:'前回：'+mTitle(m)+'（'+md(m.date)+'）', alarm:m.next.st ? 60 : 0};
}
function cal(){
  const m=mOf(cur); const ev=m && calEv(m); if(!ev){ toastS('次回の 日付を 入れて ください'); return; }
  const go=()=>HyoIcs.sheet([ev], {file:'gijiroku-next.ics', name:'議事録', title:'次回を カレンダーに', note:(ev.allDay ? '終日の 予定で' : '1時間 前に 知らせる 予定で')+' 入れます。'});
  if(window.HyoIcs){ go(); return; }
  if(typeof loadSidePart==='function') loadSidePart(['hyoics.js']).then(ok=>{ if(ok && window.HyoIcs) go(); else toastS('カレンダーの 部品を 読めませんでした'); });
}

/* ───────── 窓 ───────── */
const CSS=`
#gijirokuOverlay .gj-modal{ display:flex; flex-direction:column; }
.gj-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.gj-wrap{ max-width:820px; margin:0 auto; padding-bottom:80px; }
.gj-tabs{ display:flex; gap:6px; margin:0 0 10px; } .gj-tabs button{ flex:1; min-height:44px; border-radius:22px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.gj-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .gj-tabs small{ font-size:12px; }
.gj-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.gj-b.sm{ min-height:38px; font-size:13.5px; padding:0 10px; } .gj-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .gj-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.gj-acts{ display:flex; gap:6px; flex-wrap:wrap; margin:8px 0 0; } .gj-acts.top{ margin:0 0 10px; } .gj-acts.end{ justify-content:flex-end; margin-top:14px; } .gj-acts.sm{ margin-top:6px; }
.gj-chips{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 10px; } .gj-chips button{ min-height:38px; padding:0 14px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; } .gj-chips button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.gj-list{ display:flex; flex-direction:column; gap:8px; }
.gj-card{ display:flex; flex-direction:column; gap:2px; align-items:flex-start; padding:10px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.35); border-left:6px solid #1f5aa6; background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.gj-card .d{ font-size:13px; font-weight:bold; color:var(--text-light,#666); } .gj-card b{ font-size:16px; overflow-wrap:anywhere; } .gj-card small{ font-size:12.5px; color:var(--text-light,#666); } .gj-card em{ font-style:normal; color:#e53935; font-weight:bold; }
.gj-empty p, .gj-note{ font-size:13.5px; line-height:1.7; color:var(--text-light,#666); margin:6px 0; } .gj-note.sm{ font-size:12px; margin:4px 0 0; }
.gj-todos{ display:flex; flex-direction:column; gap:6px; }
.gj-td{ display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:12px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); } .gj-td.late{ border-color:rgba(229,57,53,.6); background:rgba(229,57,53,.06); }
.gj-td .tx{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; } .gj-td .tx b{ font-size:15px; overflow-wrap:anywhere; } .gj-td .tx small{ font-size:12.5px; color:var(--text-light,#666); } .gj-td.late .tx small:first-of-type{ color:#e53935; font-weight:bold; }
.gj-ck{ min-width:42px; min-height:42px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:22px; cursor:pointer; padding:0; flex:none; }
.gj-eh{ display:flex; align-items:center; gap:10px; margin:0 0 10px; } .gj-eh b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.gj-sec{ margin:0 0 12px; padding:10px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); }
.gj-sec h4{ margin:0 0 8px; font-size:15.5px; display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; } .gj-sec h4 small{ font-size:12.5px; color:var(--text-light,#666); font-weight:normal; }
.gj-f{ display:flex; align-items:center; gap:8px; margin:6px 0; flex:1; min-width:0; } .gj-f > span{ min-width:4.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); line-height:1.3; }
.gj-f input, .gj-add input{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.gj-row{ display:flex; gap:8px; flex-wrap:wrap; } .gj-row .gj-f{ flex:1 1 200px; } .gj-row .gj-f:has(input[type=date]){ flex:1 1 240px; } .gj-row .gj-f:has(input[type=time]){ flex:1 1 140px; }   /* スマホでは 日付の 下に はじめ・おわりを 1行で */
.gj-ppl{ display:flex; flex-wrap:wrap; gap:6px; }
.gj-p{ display:inline-flex; align-items:stretch; border-radius:20px; border:1.5px solid #2e9d4a; overflow:hidden; background:rgba(46,157,74,.08); }
.gj-p.s-a{ border-color:rgba(120,132,156,.6); background:rgba(120,132,156,.1); opacity:.8; } .gj-p.s-d{ border-color:#f0a400; background:rgba(240,164,0,.1); }
.gj-p .nm{ display:flex; align-items:center; gap:4px; min-height:38px; padding:0 4px 0 12px; border:0; background:transparent; color:var(--text,#222); font-size:14.5px; cursor:pointer; } .gj-p .nm small{ font-size:11.5px; font-weight:bold; color:#2e7d32; } .gj-p.s-a .nm small{ color:var(--text-light,#666); } .gj-p.s-d .nm small{ color:#b26a00; }
.gj-p .x{ min-width:34px; border:0; background:transparent; color:var(--text-light,#666); font-size:13px; cursor:pointer; }
.gj-add{ display:flex; gap:6px; margin:8px 0 0; }
.gj-q{ margin:6px 0; padding:8px 10px; border-radius:10px; font-size:13.5px; line-height:1.6; } .gj-q.ok{ background:rgba(46,157,74,.12); } .gj-q.ng{ background:rgba(229,57,53,.1); color:#c62828; }
.gj-item{ margin:0 0 10px; padding:8px 10px; border-radius:12px; border:1px solid rgba(120,132,156,.3); background:rgba(120,132,156,.04); }
.gj-ih{ display:flex; align-items:center; gap:6px; } .gj-ih .no{ flex:none; width:30px; height:30px; border-radius:15px; background:#1f5aa6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; }
.gj-ih input{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; font-weight:bold; box-sizing:border-box; }
.gj-ib{ flex:none; min-width:38px; min-height:38px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; padding:0; } .gj-ib:disabled{ opacity:.3; cursor:default; }
.gj-lb{ display:block; margin:8px 0 3px; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.gj-ta{ position:relative; } .gj-ta textarea{ width:100%; min-height:60px; padding:8px 46px 8px 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; font-family:inherit; line-height:1.6; box-sizing:border-box; resize:vertical; }
.gj-mic{ position:absolute; right:6px; top:6px; width:36px; height:36px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); font-size:17px; cursor:pointer; padding:0; } .gj-mic.on{ background:#e53935; border-color:#e53935; color:#fff; }
.gj-vote{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:8px 0 0; padding:6px 8px; border-radius:10px; background:rgba(31,90,166,.07); font-size:13.5px; }
.gj-vote span{ font-weight:bold; } .gj-vote label{ display:flex; align-items:center; gap:3px; } .gj-vote input{ width:4.2em; min-height:36px; padding:0 6px; border-radius:8px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; text-align:right; } .gj-vote b{ flex:1 1 100%; font-size:13.5px; }
.gj-tl{ display:flex; flex-direction:column; gap:5px; margin:8px 0 0; }
.gj-t{ display:flex; align-items:center; gap:5px; flex-wrap:wrap; } .gj-t.dn input{ text-decoration:line-through; opacity:.6; } .gj-t.late .dd{ border-color:#e53935; color:#e53935; }
.gj-t input{ flex:2 1 160px; min-width:0; min-height:40px; padding:0 8px; border-radius:9px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; box-sizing:border-box; }
.gj-t input.w{ flex:1 1 90px; } .gj-t input.dd{ flex:0 1 150px; }
.gj-out{ display:flex; flex-wrap:wrap; gap:6px; margin:14px 0 0; }
.gj-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.gj-pop{ width:100%; max-width:640px; max-height:90%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.gj-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .gj-ph > span{ font-size:26px; line-height:1; } .gj-ph b{ flex:1; font-size:17px; }
.gj-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.gj-tpl{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:6px; margin:8px 0; }
.gj-tpl button{ display:flex; flex-direction:column; align-items:flex-start; gap:3px; padding:8px 10px; border-radius:12px; border:1.5px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.gj-tpl button b{ font-size:14.5px; } .gj-tpl button small{ font-size:11.5px; color:var(--text-light,#666); line-height:1.4; } .gj-tpl button.on{ border-color:var(--acc); box-shadow:0 0 0 2px var(--acc) inset; background:rgba(46,157,74,.08); }
.gj-ck2{ display:flex; align-items:center; gap:8px; font-size:14px; margin:8px 0; } .gj-ck2 input{ width:22px; height:22px; }
body.dark .gj-p .nm small{ color:#a5d6a7; } body.dark .gj-p.s-d .nm small{ color:#ffcc80; } body.dark .gj-card em, body.dark .gj-q.ng{ color:#ff8a80; } body.dark .gj-td.late .tx small:first-of-type{ color:#ff8a80; }
@media (max-width:520px){ .gj-f > span{ min-width:3.8em; } }
`;
function ensureDom(){
  if($('gijirokuOverlay')) return;
  const s=document.createElement('style'); s.id='gjStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="gijirokuOverlay">
  <div class="modal vol-modal gj-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📝 議事録</span><button class="modal-close" onclick="closeGijiroku()" aria-label="閉じる">✕</button></div>
    <div class="gj-body" id="gjBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('gijirokuOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('keydown', e=>{   // Esc は 上に 重ねた 小さな窓から 閉じる・会議を 開いて いれば 一覧に もどる
    if(e.key!=='Escape' || !isDlgOpen('gijirokuOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    if(pop){ e.preventDefault(); e.stopImmediatePropagation(); popClose(); return; }
    if(cur){ e.preventDefault(); e.stopImmediatePropagation(); back(); }
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
let backRel=null;
function cleanup(){ popClose(); if(rec){ try{ rec.abort(); }catch(_){} rec=null; } save(); cur=null; }
function openGijiroku(){ ensureDom(); load(); cur=null; openDlg('gijirokuOverlay', cleanup); render(); if(!window.HyoIcs && typeof loadSidePart==='function') loadSidePart(['hyoics.js']); }
function closeGijiroku(){ if(!$('gijirokuOverlay') || !isDlgOpen('gijirokuOverlay')) return; closeDlg('gijirokuOverlay', cleanup); }

window.GIJIROKU={ tab:k=>{ st.ui.tab=k==='todo' ? 'todo' : 'list'; save(); render(); }, org:o=>{ st.ui.org=oneLine(o, 40); save(); render(); }, who:w=>{ st.ui.who=oneLine(w, 30); save(); render(); },
  add, tpl:setTpl, addGo, open:openM, back, del, set:setF, padd, paste, pick, pprev, pst, pdel, iadd, imove, idel, tadd, tdel, tdone, done:doneAny, vote, mic, close:popClose,
  print, image, copy, cal, nextMeet,
  // ためす とき 用
  today:s=>{ fixedToday=s ? String(s) : null; if(st) render(); }, state:()=>JSON.parse(JSON.stringify(st)), cur:()=>cur, text:id=>{ const m=mOf(id||cur); return m ? plainText(m) : ''; },
  doc:id=>{ const m=mOf(id||cur); return m ? docHtml(m) : ''; }, newMeet:(org,tpl,cp)=>{ const m=newMeet(org, tpl, cp); return m.id; }, quorum:id=>{ const m=mOf(id||cur); return m ? quorum(m) : null; }, voteText, calEv:id=>{ const m=mOf(id||cur); return m ? calEv(m) : null; },
  openTodos:()=>openTodos().map(x=>x.t.t+'@'+(x.t.who||'')+'@'+(x.t.due||'')) };
Object.assign(window, { openGijiroku, closeGijiroku });
})();
