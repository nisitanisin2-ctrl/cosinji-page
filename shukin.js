/* 📋 出欠・集金表（v579。表電卓の道具。apps/shukin/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   町内会・PTA・同窓会・サークル などの 名簿に、出欠と 集金の ✓ を つける。
   ・表（会や 行事）を いくつも 作れる。種類は 📋 出欠と 集金・✋ 出欠だけ・💰 集金だけ（v582。⚙ で あとから かえられる）。
     新しい 表は 前の 表の 名簿を 写して 始められる。
   ・名前は まとめて 入れる（改行・「、」で 区切る。「名前／班」で 班も）か、📅当番表・📇連絡帳の 名簿から。
   ・会費（1人）・人数（家族で 2人 など）・集金するのは 全員から／出席の 人だけ。金額は 1人ずつ かえられる。
   ・出欠は 出席／欠席／未定 を 押す。集金は 押すと 受け取り（日付も 入る）、もう一度で 取り消し（聞いてから）。一部だけも 入れられる。
   ・上に 合計：出席・欠席・未定の 人数と 返事の 数、集まった 金額／予定、まだの 件数と 金額。しぼる・🔎 さがす・班ごとに 分けて 小計。
   ・↕ 並べかえ（v582）：▲▼ か ≡ を ドラッグ・班の 順・逆さま・入れた 順に もどす。✏ で「何番目」も。番号・印刷・コピーも その 順。
   ・⚙ で まとめて 出欠（全員 出席に・未定を 欠席に）。名前を 押しても 直せる。
   ・🖨 印刷（A4 の 表。出欠だけは 受付の □ 欄つき）・📋 文字で コピー（まだの 方の 一覧も）・▦ 表に 入れる。中身は excalc_shukin（この端末の中だけ）。 */
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
// 表の 種類（v582）：出欠と 集金・出欠だけ・集金だけ
const KINDS=[['both','📋 出欠と 集金','会費の ある 会'],['att','✋ 出欠だけ','参加の 返事'],['pay','💰 集金だけ','会費・積立']];
const KIND_T={both:'出欠・集金表', att:'出欠表', pay:'集金表'};
const kindOf=l=>l && (l.kind==='att' || l.kind==='pay') ? l.kind : 'both';
const useAtt=l=>kindOf(l)!=='pay', usePay=l=>kindOf(l)!=='att';
const FILTS={both:[['all','すべて'],['unpaid','💰 まだ'],['o','出席'],['x','欠席'],['q','未定']], att:[['all','すべて'],['o','出席'],['x','欠席'],['q','未定']], pay:[['all','すべて'],['unpaid','💰 まだ'],['paid','✓ 済み']]};
const fOk=(l, f)=>FILTS[kindOf(l)].some(x=>x[0]===f);
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));

/* ───────── 状態 ───────── */
let st=null, ord=false, q='', newKind='both', drag=null;   // ord：並べかえ中・q：さがす 字（覚えない）
function cleanM(x){
  if(!x || typeof x!=='object') return null;
  const name=oneLine(x.name,24); if(!name) return null;
  return {id:okId(x.id) ? x.id : rid(), name, grp:oneLine(x.grp,12), n:numIn(x.n,1,99,1), amt:numIn(x.amt,0,MAX_YEN,0),
    att:x.att==='o' || x.att==='x' ? x.att : '', paid:numIn(x.paid,0,MAX_YEN,0), pd:okDate(x.pd) ? x.pd : '', memo:oneLine(x.memo,60), s:numIn(x.s,0,1e9,-1)};
}
function cleanL(x){
  if(!x || typeof x!=='object') return null;
  const mem=(Array.isArray(x.mem) ? x.mem : []).map(cleanM).filter(Boolean).slice(0,MAX_M);
  mem.forEach((m,i,a)=>{ if(a.findIndex(y=>y.id===m.id)<i) m.id=rid(); });
  // 入れた 順（s）：ない・重なる ときは いまの 順で つけなおす（「入れた 順に もどす」に 使う）
  const seen=new Set();
  if(mem.some(m=>{ if(m.s<0 || seen.has(m.s)) return true; seen.add(m.s); return false; })) mem.forEach((m,i)=>{ m.s=i; });
  return {id:okId(x.id) ? x.id : rid(), title:oneLine(x.title,40)||'出欠・集金表', date:okDate(x.date) ? x.date : '', fee:numIn(x.fee,0,MAX_YEN,0),
    who:x.who==='att' ? 'att' : 'all', kind:x.kind==='att' || x.kind==='pay' ? x.kind : 'both', memo:multi(x.memo,300), mem};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const lists=(Array.isArray(o.lists) ? o.lists : []).map(cleanL).filter(Boolean).slice(0,MAX_L);
  lists.forEach((l,i,a)=>{ if(a.findIndex(y=>y.id===l.id)<i) l.id=rid(); });
  st={lists, cur:lists.some(l=>l.id===o.cur) ? o.cur : (lists[0] ? lists[0].id : ''), filt:['all','unpaid','paid','o','x','q'].includes(o.filt) ? o.filt : 'all', grp:!!o.grp};
  ord=false; q='';
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); return false; } }
const L=()=>st.lists.find(l=>l.id===st.cur)||null;
const mOf=id=>{ const l=L(); return l ? l.mem.find(m=>m.id===id)||null : null; };
const nextS=l=>l.mem.reduce((a,m)=>Math.max(a, m.s), -1)+1;

/* ───────── 計算 ───────── */
function dueOf(l, m){ const k=kindOf(l); if(k==='att') return 0; if(k==='both' && l.who==='att' && m.att!=='o') return 0; return m.amt>0 ? m.amt : l.fee*m.n; }
// paid（済み）・part（一部）・unpaid（まだ）・none（集めない）・over（予定なしで 受け取り）
function payOf(l, m){ const d=dueOf(l,m); if(d<=0) return m.paid>0 ? 'over' : 'none'; return m.paid>=d ? 'paid' : m.paid>0 ? 'part' : 'unpaid'; }
function sums(l, mem){
  const s={o:0, x:0, q:0, people:0, due:0, paid:0, unN:0, unAmt:0, rows:0, ansN:0, paidN:0, dueN:0};
  (mem||l.mem).forEach(m=>{ s.rows++; s.people+=m.n; if(m.att==='o') s.o+=m.n; else if(m.att==='x') s.x+=m.n; else s.q+=m.n; if(m.att) s.ansN++;
    const d=dueOf(l,m); s.due+=d; s.paid+=m.paid; if(d>0){ s.dueN++; if(m.paid>=d) s.paidN++; } if(d>m.paid){ s.unN++; s.unAmt+=d-m.paid; } });
  return s;
}
function hit(l, m, f){ return f==='all' || (f==='unpaid' ? ['unpaid','part'].includes(payOf(l,m)) : f==='paid' ? ['paid','over'].includes(payOf(l,m)) : f==='q' ? m.att==='' : m.att===f); }
function shown(l){
  const f=fOk(l, st.filt) ? st.filt : 'all', k=norm(q);
  return l.mem.filter(m=>hit(l, m, f) && (!k || norm(m.name).includes(k) || norm(m.grp).includes(k)));
}
function groups(l, mem){
  if(!st.grp) return [{g:null, mem}];
  const keys=[...new Set(l.mem.map(m=>m.grp))].sort((a,b)=>a===''? 1 : b===''? -1 : a.localeCompare(b,'ja',{numeric:true}));
  return keys.map(g=>({g, mem:mem.filter(m=>m.grp===g)})).filter(x=>x.mem.length);
}

/* ───────── 画面 ───────── */
function sumHtml(l, s){
  const k=kindOf(l), pct=s.due ? Math.min(100, Math.round(s.paid/s.due*100)) : 0;
  const fee=k==='att' ? '' : `<div class="f">${l.fee ? '会費 1人 <b>'+fmt(l.fee)+'円</b>'+(k==='both' ? '（'+(l.who==='att' ? '出席の 人だけ' : '全員から')+'）' : '') : '会費は ⚙ で 決めます'+(k==='both' ? '（集金しない ときは 0 の まま）' : '')}</div>`;
  const att=k==='pay' ? '' : `<div class="a"><span class="o">出席 <b>${s.o}</b>人</span><span class="x">欠席 <b>${s.x}</b>人</span><span class="q">未定 <b>${s.q}</b>人</span>${k==='att' ? `<span class="n">返事 <b>${s.ansN}</b>／${s.rows}件</span>` : ''}</div>`
    +(k==='att' && s.rows ? `<span class="bar" aria-hidden="true"><i class="o" style="width:${(s.o/Math.max(1,s.people)*100).toFixed(1)}%"></i><i class="x" style="width:${(s.x/Math.max(1,s.people)*100).toFixed(1)}%"></i></span>` : '');
  const pay=k==='att' || !(s.due || s.paid) ? '' : `<div class="m">集まった <b>${fmt(s.paid)}円</b> ／ 予定 ${fmt(s.due)}円${s.unN ? `<span class="un">まだ ${s.unN}件 ${fmt(s.unAmt)}円</span>` : '<span class="ok">ぜんぶ 集まりました ✓</span>'}</div>`
    +(k==='pay' ? `<div class="pn">済み <b>${s.paidN}</b>／${s.dueN}件</div>` : '')+`<span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
  return `<div class="sh-sum k-${k}"><div class="h"><b>${esc(l.title)}</b><span class="kd">${esc(KINDS.find(x=>x[0]===k)[1])}</span>${l.date ? `<span>📅 ${esc(jd(l.date))}</span>` : ''}</div>${fee}${att}${pay}</div>`;
}
function render(){
  const b=$('shBody'); if(!b) return;
  const l=L(), top=b.scrollTop;
  if(!l){
    b.innerHTML=`<div class="sh-wrap"><div class="sh-empty"><p>町内会・PTA・同窓会 などの 名簿に、出欠と 集金の ✓ を つけます。<br>出欠だけ・集金だけ の 表も 作れます。</p>
      <button type="button" class="sh-b pri" onclick="SHUKIN.newList()">＋ 新しい 表を 作る</button></div></div>`;
    return;
  }
  if(!fOk(l, st.filt)) st.filt='all';
  const s=sums(l), k=kindOf(l);
  const cnt={}; FILTS[k].forEach(([f])=>{ cnt[f]=l.mem.filter(m=>hit(l, m, f)).length; });
  const bar=`<div class="sh-top"><select class="sh-sel" aria-label="表を えらぶ" onchange="SHUKIN.sel(this.value)">${st.lists.map(x=>`<option value="${x.id}"${x.id===l.id?' selected':''}>${esc(x.title)}${x.date ? '（'+md(x.date)+'）' : ''}</option>`).join('')}</select>
      <button type="button" class="sh-b" onclick="SHUKIN.newList()">＋ 新しい 表</button><button type="button" class="sh-b" onclick="SHUKIN.setup()" aria-label="表の 設定">⚙ 設定</button></div>`;
  if(ord){
    b.innerHTML=`<div class="sh-wrap">
      <div class="sh-ordbar"><b>↕ 並べかえ</b><small>▲▼ を 押すか、≡ を つかんで 上下に 動かします</small>
        <div class="sh-acts"><button type="button" class="sh-b" onclick="SHUKIN.sortBy('grp')">班の 順</button><button type="button" class="sh-b" onclick="SHUKIN.sortBy('rev')">逆さま</button><button type="button" class="sh-b" onclick="SHUKIN.sortBy('seq')">入れた 順に もどす</button><button type="button" class="sh-b pri" onclick="SHUKIN.order(false)">✓ おわる</button></div></div>
      <div class="sh-list" id="shOrd">${l.mem.map((m,i)=>ordRow(l, m, i)).join('')}</div></div>`;
    b.scrollTop=top; return;
  }
  b.innerHTML=`<div class="sh-wrap">${bar}${sumHtml(l, s)}
    <div class="sh-filt" role="tablist">${FILTS[k].map(([f,t])=>`<button type="button" role="tab" aria-selected="${st.filt===f}" class="${st.filt===f?'on':''}" onclick="SHUKIN.filt('${f}')">${t} <b>${cnt[f]}</b></button>`).join('')}
      <label class="sh-ck"><input type="checkbox" ${st.grp?'checked':''} onchange="SHUKIN.grp(this.checked)"> 班ごと</label></div>
    ${l.mem.length>=8 ? `<input class="sh-q" id="shQ" type="search" placeholder="🔎 名前・班で さがす" aria-label="名前・班で さがす" value="${esc(q)}" oninput="SHUKIN.find(this.value)" autocomplete="off">` : ''}
    <div id="shListBox">${listHtml(l)}</div>
    <div class="sh-acts"><button type="button" class="sh-b pri" onclick="SHUKIN.addNames()">＋ 名前を 入れる</button><button type="button" class="sh-b" onclick="SHUKIN.pick()">📇 名簿から</button>${l.mem.length>1 ? '<button type="button" class="sh-b" onclick="SHUKIN.order(true)">↕ 並べかえ</button>' : ''}</div>
    <div class="sh-acts"><button type="button" class="sh-b" onclick="SHUKIN.print()">🖨 印刷</button><button type="button" class="sh-b" onclick="SHUKIN.copy()">📋 コピー</button><button type="button" class="sh-b" onclick="SHUKIN.table()">▦ 表に 入れる</button></div>
    <p class="sh-note">${k==='pay' ? '集金の ボタンを 押すと 受け取り（日付も 入ります）、もう一度で 取り消せます。' : k==='att' ? '出席・欠席・未定を 押します。' : '出欠は 出席・欠席・未定を 押します。集金の ボタンを 押すと 受け取り（日付も 入ります）、もう一度で 取り消せます。'}名前か ✏ を 押すと 直せます（${k==='att' ? '' : '一部だけ・この人だけ ちがう 金額・'}人数・班・順番）。中身は この端末の中だけに 残ります（設定の バックアップに 入ります）。</p>
  </div>`;
  b.scrollTop=top;
}
function listHtml(l){
  const mem=shown(l);
  if(!l.mem.length) return '<p class="sh-note">まだ 名簿が ありません。下の「＋ 名前を 入れる」か「📇 名簿から」で 入れてください。</p>';
  if(!mem.length) return '<p class="sh-note">当てはまる 人は いません。</p>';
  return groups(l, mem).map(g=>(g.g!==null ? `<h5 class="sh-gh">${esc(g.g||'班なし')}<small>${grpSub(l, g.mem)}</small></h5>` : '')+`<div class="sh-list">${g.mem.map(m=>rowHtml(l, m)).join('')}</div>`).join('');
}
function grpSub(l, mem){ const s=sums(l, mem); return s.rows+'件'+(kindOf(l)==='att' ? '・出席 '+s.o+'人・未定 '+s.q+'人' : '')+(s.due ? '・集まった '+fmt(s.paid)+'円'+(s.unN ? '・まだ '+s.unN+'件' : '') : ''); }
function payBtn(l, m){
  const d=dueOf(l,m), p=payOf(l,m);
  const t=p==='paid' ? '✓ 済 '+fmt(m.paid) : p==='part' ? '一部 '+fmt(m.paid)+'／'+fmt(d) : p==='unpaid' ? '💰 まだ '+fmt(d) : p==='over' ? '✓ '+fmt(m.paid) : '— 集金なし';
  return `<button type="button" class="sh-pay ${p}" onclick="SHUKIN.pay('${m.id}')" aria-label="${esc(m.name)}の 集金：${esc(t)}">${t}${p==='paid' && m.pd ? `<small>${md(m.pd)}</small>` : ''}</button>`;
}
function rowHtml(l, m){
  const k=kindOf(l), i=l.mem.indexOf(m)+1, info=[m.grp, m.n>1 ? m.n+'人' : '', k!=='att' && m.amt>0 ? 'この人 '+fmt(m.amt)+'円' : '', m.memo].filter(Boolean).join('・');
  const one=k!=='both';   // 出欠だけ・集金だけ は 1行（班・人数などは 名前の 下に 小さく）
  const nm=`<button type="button" class="nm" onclick="SHUKIN.edit('${m.id}')" aria-label="${esc(m.name)}（押すと 直す）">${esc(m.name)}${one && info ? `<small>${esc(info)}</small>` : ''}</button>`;
  const ed=`<button type="button" class="sh-ed" onclick="SHUKIN.edit('${m.id}')" aria-label="${esc(m.name)}を 直す">✏</button>`;
  const seg=`<span class="seg" role="group" aria-label="${esc(m.name)}の 出欠">${[['o','出席'],['x','欠席'],['','未定']].map(([a,t])=>`<button type="button" class="${m.att===a?'on '+(a||'q'):''}" aria-pressed="${m.att===a}" onclick="SHUKIN.att('${m.id}','${a}')">${t}</button>`).join('')}</span>`;
  if(k==='pay') return `<div class="sh-row one p-${payOf(l,m)}" data-id="${m.id}"><div class="r1"><span class="no">${i}</span>${nm}${payBtn(l, m)}${ed}</div></div>`;
  if(k==='att') return `<div class="sh-row one a-${m.att||'q'}" data-id="${m.id}"><div class="r1"><span class="no">${i}</span>${nm}${seg}${ed}</div></div>`;
  return `<div class="sh-row a-${m.att||'q'}" data-id="${m.id}"><div class="r1"><span class="no">${i}</span>${nm}${seg}</div>
    <div class="r2"><small>${esc(info)}</small>${payBtn(l, m)}${ed}</div></div>`;
}
function ordRow(l, m, i){
  const n=l.mem.length;
  return `<div class="sh-row ord" data-id="${m.id}"><div class="r1"><span class="hd" role="img" aria-label="${esc(m.name)}を つかんで 動かす" onpointerdown="SHUKIN.drag(event,'${m.id}')">≡</span><span class="no">${i+1}</span><b class="nm">${esc(m.name)}</b>${m.grp ? `<small class="g">${esc(m.grp)}</small>` : ''}
    <span class="mv"><button type="button" data-d="-1" ${i===0 ? 'disabled' : ''} onclick="SHUKIN.move('${m.id}',-1)" aria-label="${esc(m.name)}を 上へ">▲</button><button type="button" data-d="1" ${i===n-1 ? 'disabled' : ''} onclick="SHUKIN.move('${m.id}',1)" aria-label="${esc(m.name)}を 下へ">▼</button></span></div></div>`;
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
  const d=dueOf(l,m), i=l.mem.indexOf(m);
  popOpen(ph('✏ '+esc(m.name))+`
    <label class="sh-f"><span>名前</span><input id="shEName" type="text" maxlength="24" value="${esc(m.name)}"></label>
    <label class="sh-f"><span>班</span><input id="shEGrp" type="text" maxlength="12" value="${esc(m.grp)}" placeholder="例：1班"></label>
    <label class="sh-f"><span>人数</span><input id="shEN" type="text" inputmode="numeric" value="${m.n}"><em>人（家族で 2人 など）</em></label>
    ${usePay(l) ? `<label class="sh-f"><span>この人の 金額</span><input id="shEAmt" type="text" inputmode="numeric" value="${m.amt||''}" placeholder="${fmt(l.fee*m.n)}（会費 × 人数）"><em>円</em></label>
    <label class="sh-f"><span>受け取った</span><input id="shEPaid" type="text" inputmode="numeric" value="${m.paid||''}" placeholder="0"><em>円（予定 ${fmt(d)}円）</em></label>
    <label class="sh-f"><span>受け取った 日</span><input id="shEPd" type="date" value="${esc(m.pd)}"></label>` : ''}
    <label class="sh-f"><span>メモ</span><input id="shEMemo" type="text" maxlength="60" value="${esc(m.memo)}" placeholder="${usePay(l) ? '例：口座で 振込' : '例：おくれて 来る'}"></label>
    <label class="sh-f"><span>順番</span><input id="shEPos" type="text" inputmode="numeric" value="${i+1}"><em>番目（1〜${l.mem.length}）</em></label>
    <div class="sh-acts end"><button type="button" class="sh-b warn" onclick="SHUKIN.delM('${m.id}')">🗑 名簿から 消す</button><button type="button" class="sh-b pri" onclick="SHUKIN.editSave('${m.id}')">✓ 直す</button></div>`, 'edit', id);
}
function editSave(id){
  const l=L(), m=mOf(id); if(!l || !m) return;
  const v=k=>($(k)||{}).value;
  const name=oneLine(v('shEName'),24); if(!name){ toastS('名前を 入れてください'); return; }
  m.name=name; m.grp=oneLine(v('shEGrp'),12); m.n=numIn(v('shEN'),1,99,1); m.memo=oneLine(v('shEMemo'),60);
  if(usePay(l)){
    m.amt=numIn(v('shEAmt'),0,MAX_YEN,0); m.paid=numIn(v('shEPaid'),0,MAX_YEN,0);
    m.pd=okDate(v('shEPd')) ? v('shEPd') : (m.paid>0 ? (m.pd||ymd(new Date())) : ''); if(!m.paid) m.pd='';
  }
  const to=numIn(v('shEPos'),1,l.mem.length,0), from=l.mem.indexOf(m);
  if(to && to-1!==from){ l.mem.splice(from,1); l.mem.splice(to-1,0,m); }
  save(); popClose(); render();
}
function openSetup(){
  const l=L(); if(!l) return;
  const k=kindOf(l);
  popOpen(ph('⚙ 表の 設定')+`
    <div class="sh-f"><span>種類</span><span class="sh-seg2">${KINDS.map(([x,t])=>`<button type="button" class="${k===x?'on':''}" aria-pressed="${k===x}" onclick="SHUKIN.kind('${x}')">${t}</button>`).join('')}</span></div>
    <label class="sh-f"><span>名前</span><input id="shLTitle" type="text" maxlength="40" value="${esc(l.title)}"></label>
    <label class="sh-f"><span>日付</span><input id="shLDate" type="date" value="${esc(l.date)}"></label>
    ${k!=='att' ? `<label class="sh-f"><span>会費（1人）</span><input id="shLFee" type="text" inputmode="numeric" value="${l.fee||''}" placeholder="0${k==='both' ? '（集金しない）' : ''}"><em>円</em></label>` : ''}
    ${k==='both' ? `<div class="sh-f"><span>集金する 人</span><span class="sh-seg2 who">${[['all','全員から'],['att','出席の 人だけ']].map(([x,t])=>`<button type="button" class="${l.who===x?'on':''}" onclick="SHUKIN.who('${x}')">${t}</button>`).join('')}</span></div>` : ''}
    <label class="sh-f top"><span>メモ</span><textarea id="shLMemo" rows="2" maxlength="300" placeholder="例：集金は 11/10 まで">${esc(l.memo)}</textarea></label>
    ${k!=='pay' && l.mem.length ? `<div class="sh-f"><span>まとめて 出欠</span><span class="sh-seg2"><button type="button" onclick="SHUKIN.bulk('allO')">✋ 全員 出席に</button><button type="button" onclick="SHUKIN.bulk('qToX')">未定を 欠席に</button></span></div>` : ''}
    <div class="sh-acts end"><button type="button" class="sh-b warn" onclick="SHUKIN.delList()">🗑 この表を 消す</button><button type="button" class="sh-b" onclick="SHUKIN.reset()">↺ ${k==='att' ? '出欠' : k==='pay' ? '集金' : '出欠・集金'}を 空に</button><button type="button" class="sh-b pri" onclick="SHUKIN.setupSave()">✓ 決める</button></div>`, 'setup');
}
// 設定の 窓で 入れた 字を 表に うつす（閉じない）
function setupTake(l){
  const v=k=>{ const e=$(k); return e ? e.value : null; };
  if(v('shLTitle')!=null) l.title=oneLine(v('shLTitle'),40)||KIND_T[kindOf(l)];
  if(v('shLDate')!=null) l.date=okDate(v('shLDate')) ? v('shLDate') : '';
  if(v('shLFee')!=null) l.fee=numIn(v('shLFee'),0,MAX_YEN,0);
  if(v('shLMemo')!=null) l.memo=multi(v('shLMemo'),300);
}
function setupSave(){ const l=L(); if(!l) return; setupTake(l); save(); popClose(); render(); }
function setWho(k){ const l=L(); if(!l || !['all','att'].includes(k)) return; l.who=k; save(); render(); if(pop && pop.kind==='setup'){ pop.el.querySelectorAll('.sh-seg2.who button').forEach((b,i)=>b.classList.toggle('on', ['all','att'][i]===k)); } }
function setKind(k){
  const l=L(); if(!l || !KINDS.some(x=>x[0]===k)) return;
  if(pop && pop.kind==='setup') setupTake(l);
  l.kind=k; if(!fOk(l, st.filt)) st.filt='all';
  save(); render(); if(pop && pop.kind==='setup') openSetup();
}
async function bulk(how){
  const l=L(); if(!l || !useAtt(l)) return;
  const n=how==='allO' ? l.mem.length : l.mem.filter(m=>m.att==='').length;
  if(!n){ toastS('未定の 人は いません'); return; }
  const msg=how==='allO' ? '全員（'+n+'件）を 出席に しますか？' : '未定の '+n+'件を 欠席に しますか？';
  if(typeof appConfirm==='function' && !(await appConfirm(msg, 'する', 'やめる'))) return;
  if(pop && pop.kind==='setup') setupTake(l);
  l.mem.forEach(m=>{ if(how==='allO') m.att='o'; else if(m.att==='') m.att='x'; });
  save(); popClose(); render(); toastS(how==='allO' ? '全員 出席に しました' : n+'件を 欠席に しました');
}

/* ───────── 入れる・かえる ───────── */
// 新しい 表の 窓（種類・名前・日付・会費・前の 表の 名簿を 写す）
function newList(){
  if(st.lists.length>=MAX_L){ toastS('表は '+MAX_L+' まで です。古い 表を 消してください'); return; }
  const prev=L(); newKind=prev ? kindOf(prev) : 'both';
  popOpen(ph('＋ 新しい 表')+`
    <div class="sh-kinds" role="group" aria-label="種類">${KINDS.map(([k,t,d])=>`<button type="button" data-k="${k}" class="${k===newKind?'on':''}" aria-pressed="${k===newKind}" onclick="SHUKIN.newKind('${k}')"><b>${t}</b><small>${d}</small></button>`).join('')}</div>
    <label class="sh-f"><span>名前</span><input id="shNTitle" type="text" maxlength="40" placeholder="例：11月 町内会費・同窓会 2026" enterkeyhint="done" onkeydown="if(event.key==='Enter' &amp;&amp; !event.isComposing){ event.preventDefault(); SHUKIN.newGo(); }"></label>
    <label class="sh-f"><span>日付</span><input id="shNDate" type="date" value="${ymd(new Date())}"></label>
    <label class="sh-f" id="shNFeeRow"${newKind==='att' ? ' hidden' : ''}><span>会費（1人）</span><input id="shNFee" type="text" inputmode="numeric" value="${prev && prev.fee ? prev.fee : ''}" placeholder="0（あとでも 決められます）"><em>円</em></label>
    ${prev && prev.mem.length ? `<label class="sh-ck2"><input id="shNCopy" type="checkbox" checked> 「${esc(prev.title)}」の 名簿を 写す（${prev.mem.length}件。出欠・集金は 空で 始めます）</label>` : ''}
    <div class="sh-acts end"><button type="button" class="sh-b" onclick="SHUKIN.close()">やめる</button><button type="button" class="sh-b pri" onclick="SHUKIN.newGo()">✓ 作る</button></div>`, 'new');
}
function setNewKind(k){
  if(!KINDS.some(x=>x[0]===k)) return; newKind=k;
  if(pop && pop.kind==='new'){ pop.el.querySelectorAll('.sh-kinds button').forEach(b=>{ const on=b.dataset.k===k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); const r=$('shNFeeRow'); if(r) r.hidden=k==='att'; }
}
function newGo(){
  const v=k=>{ const e=$(k); return e ? e.value : ''; }, c=$('shNCopy');
  newListGo({title:v('shNTitle'), kind:newKind, date:v('shNDate'), fee:v('shNFee'), copy:!!(c && c.checked)});
}
// 作る（o：title・kind・date・fee・copy）
function newListGo(o){
  o=o||{}; if(st.lists.length>=MAX_L){ toastS('表は '+MAX_L+' まで です。古い 表を 消してください'); return null; }
  const prev=L(), k=KINDS.some(x=>x[0]===o.kind) ? o.kind : (prev ? kindOf(prev) : 'both');
  const nl=cleanL({title:oneLine(o.title,40)||KIND_T[k], kind:k, date:o.date===undefined ? ymd(new Date()) : (okDate(o.date) ? o.date : ''), fee:k==='att' ? 0 : numIn(o.fee,0,MAX_YEN,0), mem:[]});
  if(o.copy && prev && prev.mem.length){
    nl.mem=prev.mem.map((m,i)=>cleanM({name:m.name, grp:m.grp, n:m.n, amt:m.amt, s:i})); nl.who=prev.who;
    if(o.fee===undefined || String(o.fee).trim()==='') nl.fee=k==='att' ? 0 : prev.fee;
  }
  st.lists.push(nl); st.cur=nl.id; st.filt='all'; ordOff(); q=''; save(); popClose(); render();
  toastS('📋「'+nl.title+'」を 作りました');
  return nl.id;
}
function parseNames(text){
  return String(text||'').split(/[\n、，,]+/).map(s=>{ const [n,g]=s.split(/[／\/]/); return {name:oneLine(n,24), grp:oneLine(g,12)}; }).filter(x=>x.name);
}
function addList(arr){
  const l=L(); if(!l) return 0;
  let add=0, same=0, s=nextS(l);
  // 同じ 人は 入れない（班を 書いていない ときは 名前だけで みる。名簿から 入れる ときなど）
  arr.forEach(x=>{ if(l.mem.length>=MAX_M) return; if(l.mem.some(m=>m.name===x.name && (!x.grp || m.grp===x.grp))){ same++; return; } const m=cleanM(Object.assign({}, x, {s:s})); if(m){ l.mem.push(m); add++; s++; } });
  save(); render();
  toastS(add+'人 入れました'+(same ? '（同じ 名前の '+same+'人は 入れません）' : '')+(l.mem.length>=MAX_M ? '（'+MAX_M+'人 まで）' : ''), 3200);
  return add;
}
async function addNames(){
  if(!L()){ newList(); return; } if(typeof appPrompt!=='function') return;
  const t=await appPrompt('名前を 入れてください。\n改行や「、」で 区切ると まとめて 入ります。\n「名前／班」で 班も（例：山田 太郎／1班）', '', true);
  if(t==null) return; const arr=parseNames(t); if(!arr.length){ toastS('名前が ありません'); return; }
  addList(arr);
}
async function pick(){
  if(!L()){ newList(); return; } if(typeof toolPickNames!=='function') return;
  const ns=await toolPickNames(null, {have:L().mem.map(m=>m.name)}); if(!ns || !ns.length) return;
  addList(ns.map(n=>({name:n, grp:''})));
}
function setAtt(id, v){ const l=L(), m=mOf(id); if(!l || !m || !useAtt(l) || !['o','x',''].includes(v)) return; m.att=v; save(); render(); }
async function pay(id){
  const l=L(), m=mOf(id); if(!l || !m || !usePay(l)) return;
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
  st.lists.splice(st.lists.indexOf(l),1); st.cur=st.lists[0] ? st.lists[0].id : ''; ordOff(); save(); popClose(); render();
}
async function resetMarks(){
  const l=L(); if(!l) return;
  const what=kindOf(l)==='att' ? '出欠' : kindOf(l)==='pay' ? '集金' : '出欠と 集金';
  if(typeof appConfirm==='function' && !(await appConfirm('「'+l.title+'」の '+what+'を ぜんぶ 空に しますか？（名簿は 残ります）', '空に する', 'やめる'))) return;
  l.mem.forEach(m=>{ m.att=''; m.paid=0; m.pd=''; }); save(); popClose(); render();
}
function sel(id){ if(!st.lists.some(l=>l.id===id)) return; st.cur=id; ordOff(); q=''; save(); render(); const b=$('shBody'); if(b) b.scrollTop=0; }
function setFilt(k){ const l=L(); if(!l || !fOk(l, k)) return; st.filt=k; save(); render(); }
function setGrp(on){ st.grp=!!on; save(); render(); }
// 🔎 さがす（入力中は 一覧だけ 描きなおす。字が 消えない ように）
function find(v){ q=String(v==null ? '' : v).slice(0,40); const l=L(), box=$('shListBox'); if(l && box) box.innerHTML=listHtml(l); }

/* ───────── 並べかえ ───────── */
// ↕ 並べかえの あいだは 端末の「戻る」で 並べかえだけ おわる（表は 閉じない）
let ord0='';
function ordOff(){ ord=false; if(typeof modeBackGuard==='function') modeBackGuard('shOrdGuard', false); }
function setOrder(on){
  const l=L(), was=ord; ord=!!on && !!l && l.mem.length>1;
  if(ord && !was) ord0=l.mem.map(m=>m.id).join();
  if(typeof modeBackGuard==='function') modeBackGuard('shOrdGuard', ord && isDlgOpen('shukinOverlay'), ()=>setOrder(false));
  render();
  if(was && !ord){ const b=$('shBody'); if(b) b.scrollTop=0; if(l && l.mem.map(m=>m.id).join()!==ord0) toastS('✓ 順番を かえました（番号・印刷・コピーも この 順）'); }
}
function move(id, d){
  const l=L(), m=mOf(id); if(!l || !m) return;
  const i=l.mem.indexOf(m), j=i+(d<0 ? -1 : 1); if(j<0 || j>=l.mem.length) return;
  l.mem.splice(i,1); l.mem.splice(j,0,m); save(); render();
  const row=document.querySelector('#shOrd .sh-row[data-id="'+id+'"]');
  if(row){ try{ row.scrollIntoView({block:'nearest'}); }catch(_){} const b=row.querySelector('.mv button[data-d="'+(d<0 ? -1 : 1)+'"]'); const b2=b && !b.disabled ? b : row.querySelector('.mv button:not([disabled])'); if(b2) b2.focus({preventScroll:true}); }
}
function sortBy(how){
  const l=L(); if(!l) return;
  if(how==='grp'){ const ix=new Map(l.mem.map((m,i)=>[m,i])); l.mem.sort((a,b)=>a.grp===b.grp ? ix.get(a)-ix.get(b) : a.grp==='' ? 1 : b.grp==='' ? -1 : a.grp.localeCompare(b.grp,'ja',{numeric:true}) || ix.get(a)-ix.get(b)); }
  else if(how==='rev') l.mem.reverse();
  else if(how==='seq') l.mem.sort((a,b)=>a.s-b.s);
  else return;
  save(); render(); toastS(how==='grp' ? '班の 順に しました' : how==='rev' ? '逆さまに しました' : '入れた 順に もどしました');
}
function applyOrder(ids){
  const l=L(); if(!l) return false;
  const map=new Map(l.mem.map(m=>[m.id,m])), out=ids.map(id=>map.get(id)).filter(Boolean);
  if(out.length!==l.mem.length || new Set(out).size!==out.length) return false;
  l.mem=out; save(); render(); return true;
}
// ≡ を つかんで 動かす（指・マウス）。動かしている あいだは 並びだけ かえて、はなしたら 名簿に うつす
function dragStart(ev, id){
  if(!ord || drag || ev.button>0) return;
  const h=ev.currentTarget || ev.target, row=h.closest('.sh-row'), list=row && row.parentElement; if(!row || !list) return;
  ev.preventDefault();
  drag={id, row, list, pid:ev.pointerId, y:ev.clientY, raf:0};
  row.classList.add('drag');
  try{ h.setPointerCapture(ev.pointerId); }catch(_){}
  window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', dragEnd); window.addEventListener('pointercancel', dragEnd);
  drag.raf=requestAnimationFrame(dragTick);
}
// 指が となりの 行の まんなかを こえたら 入れかえる（つかんだ 行は そのまま。指の つかみが はずれない ように となりを 動かす）
function dragPlace(){
  const row=drag.row, y=drag.y; let moved=false;
  for(let k=0; k<MAX_M; k++){
    const prev=row.previousElementSibling, next=row.nextElementSibling;
    if(prev){ const r=prev.getBoundingClientRect(); if(y<r.top+r.height/2){ drag.list.insertBefore(prev, row.nextSibling); moved=true; continue; } }
    if(next){ const r=next.getBoundingClientRect(); if(y>r.top+r.height/2){ drag.list.insertBefore(next, row); moved=true; continue; } }
    break;
  }
  if(moved) drag.list.querySelectorAll('.sh-row .no').forEach((n,i)=>{ n.textContent=i+1; });
}
function dragMove(ev){ if(!drag || ev.pointerId!==drag.pid) return; drag.y=ev.clientY; dragPlace(); }
// 上・下の はしに 近づけると 一覧が 動く（指を 止めていても）
function dragTick(){
  if(!drag) return;
  const b=$('shBody');
  if(b){
    const r=b.getBoundingClientRect(), y=drag.y, e=56;
    const d=y<r.top+e ? -Math.ceil((r.top+e-y)/4) : y>r.bottom-e ? Math.ceil((y-r.bottom+e)/4) : 0;
    if(d){ const t0=b.scrollTop; b.scrollTop=t0+d; if(b.scrollTop!==t0) dragPlace(); }
  }
  drag.raf=requestAnimationFrame(dragTick);
}
function dragEnd(ev){
  if(!drag || (ev && ev.pointerId!==undefined && ev.pointerId!==drag.pid)) return;
  const d=drag; drag=null; cancelAnimationFrame(d.raf);
  window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', dragEnd); window.removeEventListener('pointercancel', dragEnd);
  d.row.classList.remove('drag');
  applyOrder([...d.list.querySelectorAll('.sh-row')].map(r=>r.dataset.id));
}

/* ───────── 印刷・コピー・表に ───────── */
const PAY_N={paid:'済', part:'一部', unpaid:'まだ', none:'', over:'済'};
function cols(l){ const k=kindOf(l); return k==='att' ? ['No.','班','名前','人数','出欠','受付','メモ'] : k==='pay' ? ['No.','班','名前','人数','予定','受取','集金','日付','メモ'] : ['No.','班','名前','人数','出欠','予定','受取','集金','日付','メモ']; }
function metaTxt(l){ const k=kindOf(l); return (l.date ? jd(l.date)+'　' : '')+(k!=='att' && l.fee ? '会費 1人 '+fmt(l.fee)+'円'+(k==='both' ? '（'+(l.who==='att' ? '出席の 人だけ' : '全員から')+'）' : '') : ''); }
function docHtml(l){
  const s=sums(l), k=kindOf(l);
  const rows=l.mem.map((m,i)=>{ const p=payOf(l,m), d=dueOf(l,m), a=`<td class="c a-${m.att||'q'}">${ATT[m.att]}</td>`, money=`<td class="r">${d ? fmt(d) : ''}</td><td class="r">${m.paid ? fmt(m.paid) : ''}</td><td class="c">${PAY_N[p]}</td><td class="c">${esc(md(m.pd))}</td>`;
    return `<tr><td class="c">${i+1}</td><td>${esc(m.grp)}</td><td class="nm">${esc(m.name)}</td><td class="c">${m.n}</td>${k==='pay' ? money : k==='att' ? a+'<td class="c box">□</td>' : a+money}<td>${esc(m.memo)}</td></tr>`; }).join('');
  const un=l.mem.filter(m=>['unpaid','part'].includes(payOf(l,m))), qm=l.mem.filter(m=>m.att==='');
  const foot=k==='att' ? `<td colspan="3" class="r">合計</td><td class="c">${s.people}</td><td class="c">出席 ${s.o}</td><td colspan="2"></td>`
    : k==='pay' ? `<td colspan="3" class="r">合計</td><td class="c">${s.people}</td><td class="r">${fmt(s.due)}</td><td class="r">${fmt(s.paid)}</td><td colspan="3"></td>`
    : `<td colspan="3" class="r">合計</td><td class="c">${s.people}</td><td class="c">出席 ${s.o}</td><td class="r">${fmt(s.due)}</td><td class="r">${fmt(s.paid)}</td><td colspan="3"></td>`;
  const tot=(k!=='pay' ? '出席 '+s.o+'人・欠席 '+s.x+'人・未定 '+s.q+'人' : '')+(k==='both' ? '　／　' : '')+(k!=='att' ? '集まった '+fmt(s.paid)+'円・予定 '+fmt(s.due)+'円'+(s.unN ? '・まだ '+s.unN+'件 '+fmt(s.unAmt)+'円' : '') : '');
  return `<div class="sh-doc k-${k}"><h1>${esc(l.title)}</h1>
    <div class="meta">${esc(metaTxt(l))}</div>
    <table><thead><tr>${cols(l).map(c=>'<th>'+c+'</th>').join('')}</tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>${foot}</tr></tfoot></table>
    <div class="tot">${tot}</div>
    ${k!=='att' && un.length ? `<div class="un"><b>まだの 方</b>：${un.map(m=>esc(m.name)).join('、')}</div>` : ''}
    ${k==='att' && qm.length ? `<div class="un"><b>まだ 返事の ない 方</b>：${qm.map(m=>esc(m.name)).join('、')}</div>` : ''}
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
  const s=sums(l), k=kindOf(l), out=['📋 '+l.title+(l.date ? '（'+jd(l.date)+'）' : '')];
  if(k!=='att' && l.fee) out.push('会費 1人 '+fmt(l.fee)+'円'+(k==='both' ? '（'+(l.who==='att' ? '出席の 人だけ' : '全員から')+'）' : ''));
  if(k!=='pay') out.push('出席 '+s.o+'人・欠席 '+s.x+'人・未定 '+s.q+'人');
  if(k!=='att' && (s.due || s.paid)) out.push('集まった '+fmt(s.paid)+'円 ／ 予定 '+fmt(s.due)+'円'+(s.unN ? '（まだ '+s.unN+'件 '+fmt(s.unAmt)+'円）' : '（ぜんぶ 集まりました）'));
  const un=l.mem.filter(m=>['unpaid','part'].includes(payOf(l,m))), qm=l.mem.filter(m=>m.att==='');
  if(k==='att'){
    const o=l.mem.filter(m=>m.att==='o'), x=l.mem.filter(m=>m.att==='x');
    if(o.length) out.push('', '✋ 出席（'+o.length+'）', o.map(m=>m.name+(m.n>1 ? '（'+m.n+'人）' : '')).join('、'));
    if(x.length) out.push('', '欠席（'+x.length+'）', x.map(m=>m.name).join('、'));
  }
  if(k!=='att' && un.length) out.push('', '💰 まだの 方（'+un.length+'）', un.map(m=>m.name+(payOf(l,m)==='part' ? '（一部）' : '')).join('、'));
  if(k!=='pay' && qm.length && qm.length<l.mem.length) out.push('', '？ 出欠が まだの 方（'+qm.length+'）', qm.map(m=>m.name).join('、'));
  return out.join('\n');
}
function copy(){ if(!L()){ toastS('表が ありません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 コピーしました（LINE などに 貼れます）'); }
function rows(){
  const l=L(); if(!l) return [];
  const s=sums(l), k=kindOf(l), r=[cols(l)];
  l.mem.forEach((m,i)=>{ const base=[i+1, m.grp, m.name, m.n], money=[dueOf(l,m)||'', m.paid||'', PAY_N[payOf(l,m)], m.pd];
    r.push(k==='att' ? base.concat([ATT[m.att], '', m.memo]) : k==='pay' ? base.concat(money, [m.memo]) : base.concat([ATT[m.att]], money, [m.memo])); });
  r.push(k==='att' ? ['','','合計', s.people, '出席 '+s.o, '', ''] : k==='pay' ? ['','','合計', s.people, s.due, s.paid, s.unN ? 'まだ '+s.unN : '', '', ''] : ['','','合計', s.people, '出席 '+s.o, s.due, s.paid, s.unN ? 'まだ '+s.unN : '', '', '']);
  return r;
}
function toTable(){ const l=L(); if(!l || !l.mem.length){ toastS('名簿が ありません'); return; } if(typeof toolPasteRows==='function') toolPasteRows(rows(), KIND_T[kindOf(l)], closeShukin); }

/* ───────── 窓 ───────── */
const DOC=`
.sh-doc{ color:#111; background:#fff; font-family:"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif; font-size:12px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sh-doc h1{ font-size:20px; margin:0 0 4px; } .sh-doc .meta{ font-size:12px; margin:0 0 8px; }
.sh-doc table{ width:100%; border-collapse:collapse; border-spacing:0; }
.sh-doc th{ background:#eef0f4; border:1px solid #333; padding:4px 5px; font-size:11.5px; }
.sh-doc td{ border:1px solid #333; padding:3px 5px; font-size:11.5px; vertical-align:top; }
.sh-doc td.nm{ font-weight:bold; } .sh-doc td.r{ text-align:right; white-space:nowrap; } .sh-doc td.c{ text-align:center; white-space:nowrap; }
.sh-doc td.box{ font-size:15px; line-height:1; width:3.2em; } .sh-doc.k-att td{ padding:5px; }
.sh-doc td.a-x{ color:#b3001b; } .sh-doc tfoot td{ font-weight:bold; background:#f6f7fa; }
.sh-doc .tot{ margin:8px 0 4px; font-weight:bold; } .sh-doc .un{ margin:4px 0; } .sh-doc .memo{ margin:6px 0 0; border:1px solid #333; padding:5px 8px; }
`;
const CSS=`
#shukinOverlay .sh-modal{ display:flex; flex-direction:column; }
.sh-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.sh-wrap{ max-width:820px; margin:0 auto; padding-bottom:16px; }
.sh-top{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 8px; } .sh-sel{ flex:1 1 140px; min-width:0; min-height:44px; padding:0 8px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; }
.sh-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.sh-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .sh-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.sh-sum{ border-radius:14px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); padding:10px 12px; margin:0 0 8px; line-height:1.6; }
.sh-sum .h{ display:flex; flex-wrap:wrap; gap:4px 10px; align-items:baseline; } .sh-sum .h b{ font-size:17px; } .sh-sum .h span{ font-size:13px; color:var(--text-light,#666); }
.sh-sum .h .kd{ font-size:12px; font-weight:bold; padding:0 8px; border-radius:10px; background:rgba(120,132,156,.14); color:var(--text,#222); }
.sh-sum .f{ font-size:13.5px; color:var(--text-light,#666); } .sh-sum .f b{ color:var(--text,#222); }
.sh-sum .a{ display:flex; gap:12px; flex-wrap:wrap; font-size:14.5px; } .sh-sum .a b{ font-size:18px; } .sh-sum .a .o b{ color:#2e7d32; } .sh-sum .a .x b{ color:#e53935; } .sh-sum .a .n{ margin-left:auto; color:var(--text-light,#666); } .sh-sum .a .n b{ color:var(--text,#222); }
.sh-sum .m{ font-size:14.5px; display:flex; flex-wrap:wrap; gap:4px 10px; align-items:baseline; } .sh-sum .m b{ font-size:18px; } .sh-sum .m .un{ color:#b26a00; font-weight:bold; } .sh-sum .m .ok{ color:#2e7d32; font-weight:bold; }
.sh-sum .pn{ font-size:13.5px; color:var(--text-light,#666); } .sh-sum .pn b{ color:#2e7d32; font-size:16px; }
.sh-sum .bar{ display:flex; height:8px; border-radius:4px; background:rgba(120,132,156,.2); overflow:hidden; margin-top:4px; } .sh-sum .bar i{ display:block; height:100%; background:#2e9d4a; } .sh-sum .bar i.x{ background:#e53935; }
.sh-filt{ display:flex; gap:5px; flex-wrap:wrap; align-items:center; margin:0 0 8px; }
.sh-filt button{ min-height:38px; padding:0 11px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.sh-filt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.sh-ck{ display:inline-flex; align-items:center; gap:5px; font-size:14px; margin-left:auto; cursor:pointer; } .sh-ck input{ width:20px; height:20px; }
.sh-q{ display:block; width:100%; box-sizing:border-box; min-height:42px; margin:0 0 8px; padding:0 12px; border-radius:12px; border:1px solid rgba(120,132,156,.5); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; }
.sh-gh{ margin:12px 0 6px; font-size:15px; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; } .sh-gh small{ font-weight:normal; font-size:12.5px; color:var(--text-light,#666); }
.sh-list{ display:flex; flex-direction:column; gap:6px; }
.sh-row{ border-radius:12px; border:1px solid rgba(120,132,156,.3); border-left:5px solid rgba(120,132,156,.45); background:var(--modal-bg,#fff); padding:6px 8px; }
.sh-row.a-o, .sh-row.p-paid, .sh-row.p-over{ border-left-color:#2e9d4a; } .sh-row.a-x{ border-left-color:#e53935; } .sh-row.p-unpaid, .sh-row.p-part{ border-left-color:#f0a400; }
.sh-row .r1{ display:flex; align-items:center; gap:8px; } .sh-row .no{ min-width:1.6em; font-size:12.5px; color:var(--text-light,#666); text-align:right; }
.sh-row .nm{ flex:1; min-width:0; font-size:16px; font-weight:bold; overflow-wrap:anywhere; text-align:left; padding:4px 0; border:0; background:transparent; color:var(--text,#222); cursor:pointer; font-family:inherit; }
.sh-row .seg{ display:inline-flex; border:1px solid rgba(120,132,156,.45); border-radius:10px; overflow:hidden; flex:none; }
.sh-row .seg button{ min-width:44px; min-height:38px; padding:0 6px; border:0; border-left:1px solid rgba(120,132,156,.3); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; } .sh-row .seg button:first-child{ border-left:0; }
.sh-row .seg button.on.o{ background:#2e9d4a; color:#fff; font-weight:bold; } .sh-row .seg button.on.x{ background:#e53935; color:#fff; font-weight:bold; } .sh-row .seg button.on.q{ background:rgba(120,132,156,.3); font-weight:bold; }
.sh-row .r2{ display:flex; align-items:center; gap:6px; margin-top:4px; padding-left:calc(1.6em + 8px); } .sh-row .r2 > small{ flex:1; min-width:0; font-size:12.5px; color:var(--text-light,#666); overflow-wrap:anywhere; }
.sh-pay{ min-height:40px; min-width:118px; padding:0 10px; border-radius:10px; border:1.5px solid #f0a400; background:transparent; color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; flex:none; }
.sh-pay.paid, .sh-pay.over{ background:#2e9d4a; border-color:#2e9d4a; color:#fff; } .sh-pay small{ font-size:11.5px; font-weight:normal; color:inherit; }
.sh-pay.part{ background:rgba(240,164,0,.18); } .sh-pay.none{ border-color:rgba(120,132,156,.4); color:var(--text-light,#666); font-weight:normal; }
.sh-row .nm small{ display:block; margin-top:1px; font-size:12.5px; font-weight:normal; color:var(--text-light,#666); overflow-wrap:anywhere; }
.sh-row.one{ padding:5px 8px; } .sh-row.one .sh-ed{ min-width:36px; }
.sh-ed{ min-width:40px; min-height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; flex:none; }
.sh-ordbar{ position:sticky; top:-10px; z-index:2; margin:0 0 8px; padding:8px 10px; border-radius:12px; border:1px solid var(--acc); background:var(--modal-bg,#fff); box-shadow:0 2px 8px rgba(0,0,0,.08); }
.sh-ordbar b{ font-size:15px; } .sh-ordbar small{ display:block; font-size:12.5px; color:var(--text-light,#666); } .sh-ordbar .sh-acts{ margin-top:6px; }
.sh-row.ord .r1{ gap:6px; } .sh-row.ord .nm{ cursor:default; } .sh-row.ord .g{ font-size:12px; color:var(--text-light,#666); flex:none; }
.sh-row .hd{ flex:none; display:inline-flex; align-items:center; justify-content:center; width:40px; min-height:40px; border-radius:10px; background:rgba(120,132,156,.12); color:var(--text,#222); font-size:20px; cursor:grab; touch-action:none; user-select:none; -webkit-user-select:none; }
.sh-row.drag{ box-shadow:0 6px 18px rgba(0,0,0,.25); border-color:var(--acc); position:relative; z-index:1; } .sh-row.drag .hd{ cursor:grabbing; background:var(--acc); color:var(--on-acc,#fff); }
.sh-row .mv{ display:inline-flex; gap:4px; flex:none; } .sh-row .mv button{ min-width:42px; min-height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; } .sh-row .mv button:disabled{ opacity:.3; cursor:default; }
.sh-acts{ display:flex; gap:6px; flex-wrap:wrap; margin:10px 0 0; } .sh-acts .sh-b{ flex:1 1 auto; } .sh-acts.end{ justify-content:flex-end; } .sh-acts.end .sh-b{ flex:0 1 auto; }
.sh-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:10px 0 0; }
.sh-empty{ text-align:center; padding:30px 10px; } .sh-empty p{ margin:0 0 14px; line-height:1.7; }
.sh-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.sh-pop{ width:100%; max-width:600px; max-height:88%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.sh-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .sh-ph b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.sh-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.sh-f{ display:flex; align-items:center; gap:8px; margin:8px 0; flex-wrap:wrap; } .sh-f[hidden]{ display:none; } .sh-f.top{ align-items:flex-start; } .sh-f > span{ min-width:6.2em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.sh-f input, .sh-f textarea{ flex:1 1 140px; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.sh-f textarea{ padding:8px 10px; resize:vertical; } .sh-f em{ font-style:normal; font-size:12.5px; color:var(--text-light,#666); }
.sh-seg2{ display:inline-flex; gap:5px; flex-wrap:wrap; flex:1 1 200px; } .sh-seg2 button{ min-height:40px; padding:0 12px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.sh-seg2 button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.sh-kinds{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin:0 0 4px; }
.sh-kinds button{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:64px; padding:6px 4px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); cursor:pointer; font-family:inherit; text-align:center; }
.sh-kinds button b{ font-size:14px; } .sh-kinds button small{ font-size:11.5px; color:var(--text-light,#666); line-height:1.3; }
.sh-kinds button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .sh-kinds button.on small{ color:var(--on-acc,#fff); opacity:.9; }
.sh-ck2{ display:flex; align-items:flex-start; gap:8px; margin:10px 0 4px; font-size:14px; line-height:1.5; cursor:pointer; } .sh-ck2 input{ width:20px; height:20px; flex:none; margin:1px 0 0; }
@media (max-width:400px){ .sh-row .seg button{ min-width:40px; padding:0 4px; font-size:13px; } .sh-pay{ min-width:104px; padding:0 6px; } .sh-kinds button b{ font-size:13px; } .sh-row.one .r1{ gap:6px; } .sh-row.one .nm{ font-size:15px; } }
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
    if(e.key!=='Escape' || !(pop || ord) || !isDlgOpen('shukinOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); if(pop) popClose(); else setOrder(false);   // 小さな窓・並べかえ だけ おわる
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); if(drag) dragEnd(); ordOff(); }
function openShukin(){ ensureDom(); load(); openDlg('shukinOverlay', cleanup); render(); }
function closeShukin(){ if(!$('shukinOverlay') || !isDlgOpen('shukinOverlay')) return; closeDlg('shukinOverlay', cleanup); }

window.SHUKIN={ newList, newKind:setNewKind, newGo, newListGo, addNames:()=>addNames(), pick:()=>pick(), att:setAtt, pay:id=>pay(id), edit:openEdit, editSave, delM:id=>delM(id),
  setup:openSetup, setupSave, who:setWho, kind:setKind, bulk:h=>bulk(h), delList:()=>delList(), reset:()=>resetMarks(), sel, filt:setFilt, grp:setGrp, find, close:popClose,
  order:setOrder, move, sortBy, drag:dragStart, print:printDoc, copy, table:toTable, text, rows, html:()=>{ const l=L(); return l ? docHtml(l) : ''; },
  // ためす とき 用
  state:()=>JSON.parse(JSON.stringify(st)), sums:()=>{ const l=L(); return l ? sums(l) : null; }, parse:parseNames, addList, applyOrder,
  payState:()=>{ const l=L(); return l ? l.mem.map(m=>m.name+':'+payOf(l,m)+':'+dueOf(l,m)) : []; }, ids:()=>{ const l=L(); return l ? l.mem.map(m=>m.id) : []; },
  names:()=>{ const l=L(); return l ? l.mem.map(m=>m.name) : []; }, ordering:()=>ord,
  newListNow:o=>newListGo(o), payNow:pay, delMNow:delM, delListNow:delList, resetNow:resetMarks, bulkNow:bulk };
Object.assign(window, { openShukin, closeShukin });
})();
