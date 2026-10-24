/* 🔁 前にやった日 帳（v579。表電卓の道具。apps/yatta/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   エアコンの フィルター 掃除・布団干し・散髪・電池交換 など「この前 いつ やったか」を 残す。
   ・「✓ きょう やった」を 押すだけ（くわしくの 📅 で ちがう日も）。最後の日と「あれから ○日」、目安（○日ごと）までの 残りを 出す。
     目安の 2割 手前から「近い」（黄）、過ぎたら「過ぎ」（赤）。目安なしも よい。
   ・急ぐ順（過ぎた・近い が 上）・名前・最近 やった 順。⚠ 過ぎた・⏳ 近い だけ 出す。
   ・押すと くわしく：やった日の 記録（60回まで。前回から ○日・1回ずつ 消せる）・ふだんの 間隔（平均）・次は いつごろ・名前／絵／目安／メモを 直す。
   ・よくある もの（エアコンの フィルター・換気扇・布団干し・散髪・歯ブラシ・浄水器 など 16）から 1回で 足す。
   ・📋 文字で コピー。中身は excalc_yatta（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_yatta', MAX_IT=200, MAX_H=60, MAX_EVERY=3650;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);   // onclick に 入れるので 英数字だけ
function intIn(v, a, b, dflt){ const t=String(v==null?'':v).normalize('NFKC').replace(/[,\s日]/g,''); if(t==='') return dflt; const n=Math.round(parseFloat(t)); return isFinite(n) ? Math.min(b, Math.max(a, n)) : dflt; }

/* ───────── 日付 ───────── */
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
function okDate(s){
  const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s||'')); if(!m) return null;
  const y=+m[1], mo=+m[2]-1, d=+m[3], t=new Date(y,mo,d);
  return (y>=1900 && y<=2200 && t.getMonth()===mo && t.getDate()===d) ? t : null;
}
let fixedToday=null;   // ためす とき だけ（YATTA.today('2026-10-24')）
function today(){ const t=fixedToday ? okDate(fixedToday) : null, d=t||new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
const dayNo=d=>Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/86400000);
const diff=(a,b)=>dayNo(a)-dayNo(b);   // a − b（日）
const addDays=(d,n)=>new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
const WD='日月火水木金土';
const md=d=>(d.getMonth()+1)+'月'+d.getDate()+'日';
const mdw=d=>(d.getFullYear()!==today().getFullYear() ? d.getFullYear()+'年' : '')+md(d)+'（'+WD[d.getDay()]+'）';
function agoText(n){
  if(n<0) return (-n)+'日 先';
  if(n===0) return 'きょう'; if(n===1) return 'きのう'; if(n===2) return 'おととい';
  if(n<60) return n+'日前';
  return n+'日前（約'+(n>=730 ? Math.round(n/365.25*10)/10+'年' : Math.round(n/30.44)+'か月')+'）';
}

/* ───────── よくある もの ───────── */
const PRESETS=[
  ['🌀','エアコンの フィルター 掃除',14],['🍳','換気扇の 掃除',90],['🛏','布団干し',7],['🧺','シーツ 洗い',7],
  ['💇','散髪',45],['🪥','歯ブラシ 交換',30],['🚰','浄水器の カートリッジ 交換',90],['🧽','排水口の 掃除',14],
  ['🫧','洗濯槽の 掃除',30],['🧊','冷蔵庫の 掃除',90],['🔋','火災報知器の 点検',180],['🚗','車の オイル交換',180],
  ['🪴','植木の 水やり',3],['🐕','ペットの シャンプー',30],['🦷','歯医者（定期検診）',180],['👁','コンタクトレンズ 交換',14]];
const EMOS=['✅','🧹','🧽','🧺','🛏','🌀','🍳','🚰','🔋','💡','🧯','🚗','🚲','💇','🪥','💊','🦷','🪴','🐕','🐈','📮','💳','📱','🔧'];
const EVERYS=[0,3,7,14,30,60,90,180,365];

/* ───────── 状態 ───────── */
let st=null;
function cleanIt(x){
  if(!x || typeof x!=='object') return null;
  const name=oneLine(x.name,30); if(!name) return null;
  const hist=[...new Set((Array.isArray(x.hist) ? x.hist : []).filter(s=>typeof s==='string' && okDate(s)))].sort().reverse().slice(0,MAX_H);
  return {id:okId(x.id) ? x.id : rid(), name, emo:oneLine(x.emo,8)||'✅', every:intIn(x.every,0,MAX_EVERY,0), hist, memo:multi(x.memo,200)};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const items=(Array.isArray(o.items) ? o.items : []).map(cleanIt).filter(Boolean).slice(0,MAX_IT);
  items.forEach((it,i,a)=>{ if(a.findIndex(x=>x.id===it.id)<i) it.id=rid(); });   // 同じ id は 1つに
  st={items, sort:['due','name','recent'].includes(o.sort) ? o.sort : 'due', filt:['all','late','soon'].includes(o.filt) ? o.filt : 'all'};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); return false; } }
const itOf=id=>st.items.find(x=>x.id===id)||null;

/* ───────── 計算 ───────── */
function avgOf(it){
  if(it.hist.length<2) return null;
  const ds=it.hist.map(okDate); let s=0;
  for(let i=0;i<ds.length-1;i++) s+=diff(ds[i], ds[i+1]);
  return Math.round(s/(ds.length-1));
}
// st：late（過ぎた）・soon（近い）・ok・free（目安なし）・none（まだ 記録なし）
function info(it){
  const last=it.hist.length ? okDate(it.hist[0]) : null, avg=avgOf(it);
  if(!last) return {st:'none', days:null, left:null, next:null, last:null, avg};
  const days=diff(today(), last);
  if(!it.every) return {st:'free', days, left:null, next:null, last, avg};
  const left=it.every-days, next=addDays(last, it.every), near=Math.max(1, Math.round(it.every*0.2));
  return {st:left<0 ? 'late' : left<=near ? 'soon' : 'ok', days, left, next, last, avg};
}
const RANK={late:0, soon:1, ok:2, free:3, none:4};
function ordered(){
  const L=st.items.map(it=>({it, f:info(it)}));
  if(st.sort==='name') L.sort((a,b)=>a.it.name.localeCompare(b.it.name,'ja'));
  else if(st.sort==='recent') L.sort((a,b)=>(b.it.hist[0]||'').localeCompare(a.it.hist[0]||'') || a.it.name.localeCompare(b.it.name,'ja'));
  else L.sort((a,b)=>RANK[a.f.st]-RANK[b.f.st] || (a.f.left!=null && b.f.left!=null ? a.f.left-b.f.left : 0) || (b.f.days||0)-(a.f.days||0) || a.it.name.localeCompare(b.it.name,'ja'));
  return L;
}
function stText(f, it){
  if(f.st==='none') return 'まだ 記録なし';
  if(f.st==='free') return '目安なし';
  if(f.st==='late') return '⚠ '+(-f.left)+'日 過ぎ';
  if(f.st==='soon') return f.left===0 ? '⏳ きょうが 目安' : '⏳ あと '+f.left+'日';
  return 'あと '+f.left+'日（'+md(f.next)+'ごろ）';
}

/* ───────── 画面 ───────── */
function render(){
  const b=$('ytBody'); if(!b) return;
  const all=ordered(), n={late:0, soon:0}; all.forEach(x=>{ if(n[x.f.st]!=null) n[x.f.st]++; });
  const list=st.filt==='all' ? all : all.filter(x=>x.f.st===st.filt), T=ymd(today());
  b.innerHTML=`<div class="yt-wrap">
    <div class="yt-top"><button type="button" class="yt-b pri" onclick="YATTA.add()">＋ 足す</button><button type="button" class="yt-b" onclick="YATTA.copy()">📋 コピー</button>
      <select class="yt-sel" aria-label="並べ方" onchange="YATTA.sort(this.value)">${[['due','急ぐ順'],['name','名前'],['recent','最近 やった 順']].map(([k,t])=>`<option value="${k}"${st.sort===k?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="yt-filt" role="tablist">${[['all','すべて',st.items.length],['late','⚠ 過ぎた',n.late],['soon','⏳ 近い',n.soon]].map(([k,t,c])=>`<button type="button" role="tab" aria-selected="${st.filt===k}" class="${st.filt===k?'on':''}${k!=='all' && c ? ' '+k : ''}" onclick="YATTA.filt('${k}')">${t} <b>${c}</b></button>`).join('')}</div>
    ${!st.items.length ? emptyHtml() : !list.length ? `<p class="yt-note">${st.filt==='late' ? '過ぎた ものは ありません 👍' : '近い ものは ありません'}</p>` : `<div class="yt-list">${list.map(({it,f})=>cardHtml(it, f, T)).join('')}</div>`}
    <p class="yt-note">「✓ きょう やった」を 押すと 記録します。カードを 押すと やった日の 記録・ちがう日・目安の 日数・メモ。目安の 2割 手前から 黄色、過ぎると 赤に なります。中身は この端末の中だけに 残ります（設定の バックアップに 入ります）。</p>
  </div>`;
}
function cardHtml(it, f, T){
  const pct=f.st==='none' || f.st==='free' ? -1 : Math.max(0, Math.min(100, Math.round(f.days/it.every*100))), dn=it.hist[0]===T;
  return `<div class="yt-card st-${f.st}">
    <button type="button" class="yt-main" onclick="YATTA.open('${it.id}')" aria-label="${esc(it.name)}の くわしく">
      <span class="e" aria-hidden="true">${esc(it.emo)}</span>
      <span class="t"><b class="nm">${esc(it.name)}</b>
        <small>${f.last ? '最後 '+mdw(f.last)+'・'+agoText(f.days) : 'まだ やった日が ありません'}</small>
        ${pct>=0 ? `<span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ''}
        <small class="s">${it.every ? '目安 '+it.every+'日ごと → ' : ''}<b>${esc(stText(f, it))}</b></small></span>
    </button>
    <button type="button" class="yt-do${dn?' dn':''}" onclick="YATTA.done('${it.id}')" aria-label="${esc(it.name)}を きょう やった">${dn ? '✓<small>きょう<br>済み</small>' : '✓<small>きょう<br>やった</small>'}</button>
  </div>`;
}
function emptyHtml(){
  return `<div class="yt-empty"><p>よくある ものを 押すと すぐ 足せます（あとで 名前や 目安を 直せます）。</p>
    <div class="yt-pre">${PRESETS.map((p,i)=>`<button type="button" onclick="YATTA.preset(${i})"><span aria-hidden="true">${p[0]}</span>${esc(p[1])}<small>${p[2]}日ごと</small></button>`).join('')}</div>
    <button type="button" class="yt-b" onclick="YATTA.add()">＋ 自分で 足す</button></div>`;
}

/* ───────── 小さな窓（くわしく・足す）───────── */
let pop=null;   // {el, rel, kind, id}
function popOpen(html, kind, id){
  popClose();
  const host=document.querySelector('#yattaOverlay .yt-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='yt-pop-bg';
  el.innerHTML=`<div class="yt-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  pop={el, kind, id, rel:null};
  const me=pop; pop.rel=modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } });   // 端末の「戻る」は この窓だけ 閉じる
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }
function openItem(id){
  const it=itOf(id); if(!it) return;
  popOpen(detailHtml(it), 'item', id);
}
function reItem(){ if(pop && pop.kind==='item'){ const it=itOf(pop.id); if(it){ const b=pop.el.querySelector('.yt-pop'), top=b.scrollTop; b.innerHTML=detailHtml(it); b.scrollTop=top; } else popClose(); } }
function detailHtml(it){
  const f=info(it), T=today(), ds=it.hist.map(okDate);
  return `<div class="yt-ph"><span class="e" aria-hidden="true">${esc(it.emo)}</span><b>${esc(it.name)}</b><button type="button" class="yt-x" onclick="YATTA.close()" aria-label="閉じる">✕</button></div>
    <div class="yt-sum st-${f.st}">${f.last ? `最後 <b>${mdw(f.last)}</b>・${agoText(f.days)}` : 'まだ やった日が ありません'}<br>
      ${it.every ? '目安 '+it.every+'日ごと → <b class="stx">'+esc(stText(f, it))+'</b>'+(f.next ? '（次は '+mdw(f.next)+'）' : '') : '目安なし'}${f.avg!=null ? `<br>ふだんは 約 <b>${f.avg}日</b>ごと（${it.hist.length}回の 平均）` : ''}</div>
    <div class="yt-acts"><button type="button" class="yt-b pri" onclick="YATTA.done('${it.id}')">✓ きょう やった</button>
      <label class="yt-dt"><span>📅 ちがう日</span><input id="ytDate" type="date" max="${ymd(T)}" value="${ymd(addDays(T,-1))}" aria-label="やった日"></label><button type="button" class="yt-b" onclick="YATTA.doneOn('${it.id}', document.getElementById('ytDate').value)">＋ 入れる</button></div>
    <h5>やった日の 記録（${it.hist.length}回）</h5>
    ${ds.length ? `<div class="yt-hist">${ds.map((d,i)=>`<div class="yt-h"><span>${mdw(d)}</span><small>${i<ds.length-1 ? '前回から '+diff(d, ds[i+1])+'日' : 'はじめ'}</small><button type="button" aria-label="${md(d)}の 記録を 消す" onclick="YATTA.delHist('${it.id}', ${i})">🗑</button></div>`).join('')}</div>` : '<p class="yt-note">まだ ありません。</p>'}
    <h5>直す</h5>
    <label class="yt-f"><span>名前</span><input type="text" maxlength="30" value="${esc(it.name)}" aria-label="名前" onchange="YATTA.set('${it.id}','name',this.value)"></label>
    <div class="yt-f"><span>絵</span><div class="yt-emos">${EMOS.map(e=>`<button type="button" class="${it.emo===e?'on':''}" onclick="YATTA.set('${it.id}','emo','${e}')" aria-label="絵 ${e}">${e}</button>`).join('')}</div></div>
    <label class="yt-f"><span>目安</span><input type="text" inputmode="numeric" value="${it.every||''}" placeholder="なし" aria-label="目安の 日数" onchange="YATTA.set('${it.id}','every',this.value)"><em>日ごと</em></label>
    <div class="yt-chips">${EVERYS.map(n=>`<button type="button" class="${it.every===n?'on':''}" onclick="YATTA.set('${it.id}','every',${n})">${n ? n+'日' : 'なし'}</button>`).join('')}</div>
    <label class="yt-f top"><span>メモ</span><textarea rows="2" maxlength="200" placeholder="例：フィルターの 型番 ○○" aria-label="メモ" onchange="YATTA.set('${it.id}','memo',this.value)">${esc(it.memo)}</textarea></label>
    <div class="yt-acts end"><button type="button" class="yt-b warn" onclick="YATTA.del('${it.id}')">🗑 この ものを 消す</button></div>`;
}
function openAdd(){
  const have=new Set(st.items.map(x=>x.name)), T=today();
  popOpen(`<div class="yt-ph"><span class="e" aria-hidden="true">＋</span><b>足す</b><button type="button" class="yt-x" onclick="YATTA.close()" aria-label="閉じる">✕</button></div>
    <h5>よくある もの（押すと 足す）</h5>
    <div class="yt-pre">${PRESETS.map((p,i)=>have.has(p[1]) ? '' : `<button type="button" onclick="YATTA.preset(${i})"><span aria-hidden="true">${p[0]}</span>${esc(p[1])}<small>${p[2]}日ごと</small></button>`).join('')||'<p class="yt-note">ぜんぶ 入っています。</p>'}</div>
    <h5>自分で</h5>
    <label class="yt-f"><span>名前</span><input id="ytNewName" type="text" maxlength="30" placeholder="例：網戸の 掃除" aria-label="名前"></label>
    <label class="yt-f"><span>目安</span><input id="ytNewEvery" type="text" inputmode="numeric" placeholder="なし" aria-label="目安の 日数"><em>日ごと</em></label>
    <label class="yt-f"><span>最後に<br>やった日</span><input id="ytNewLast" type="date" max="${ymd(T)}" aria-label="最後に やった日（わかれば）"></label>
    <div class="yt-acts end"><button type="button" class="yt-b pri" onclick="YATTA.addGo()">＋ 足す</button></div>`, 'add');
  const n=$('ytNewName'); if(n) setTimeout(()=>{ try{ n.focus(); }catch(_){} }, 60);
}

/* ───────── 入れる・かえる ───────── */
function addItem(name, every, emo, last){
  name=oneLine(name,30); if(!name){ toastS('名前を 入れてください'); return null; }
  if(st.items.length>=MAX_IT){ toastS('入れられるのは '+MAX_IT+' まで です'); return null; }
  if(st.items.some(x=>x.name===name)){ toastS('「'+name+'」は もう あります'); return null; }
  const it={id:rid(), name, emo:oneLine(emo,8)||'✅', every:intIn(every,0,MAX_EVERY,0), hist:[], memo:''};
  const d=okDate(last); if(d && diff(d, today())<=0) it.hist=[ymd(d)];
  st.items.push(it); save(); return it;
}
function preset(i){
  const p=PRESETS[+i]; if(!p) return;
  const it=addItem(p[1], p[2], p[0]); if(!it) return;
  toastS(p[0]+'「'+p[1]+'」を 足しました（'+p[2]+'日ごと）');
  if(pop && pop.kind==='add') openAdd(); render();
}
function addGo(){
  const it=addItem(($('ytNewName')||{}).value, ($('ytNewEvery')||{}).value, '✅', ($('ytNewLast')||{}).value); if(!it) return;
  popClose(); render(); toastS('「'+it.name+'」を 足しました');
}
let undo=null, undoT=0;   // {id, hist} ✓ の あと しばらく 取り消せる
function doneOn(id, s){
  const it=itOf(id); if(!it) return;
  const d=okDate(s); if(!d){ toastS('日付を えらんでください'); return; }
  if(diff(d, today())>0){ toastS('先の 日は 入れられません'); return; }
  const k=ymd(d); if(it.hist.includes(k)){ toastS(md(d)+'は もう 入っています'); return; }
  undo={id, hist:it.hist.slice()};
  it.hist=[...it.hist, k].sort().reverse().slice(0,MAX_H); save(); render(); reItem(); showUndo(it, d);
}
function done(id){ doneOn(id, ymd(today())); }
function showUndo(it, d){
  const u=$('ytUndo'); if(!u) return;
  u.innerHTML=`<span>✓「${esc(it.name)}」を ${diff(d, today())===0 ? 'きょう' : md(d)} やった に しました</span><button type="button" onclick="YATTA.undo()">↶ 取り消す</button>`;
  u.classList.add('on'); clearTimeout(undoT); undoT=setTimeout(()=>{ u.classList.remove('on'); undo=null; }, 8000);
}
function undoDo(){
  if(!undo) return; const it=itOf(undo.id); if(it){ it.hist=undo.hist; save(); }
  undo=null; clearTimeout(undoT); const u=$('ytUndo'); if(u) u.classList.remove('on'); render(); reItem(); toastS('取り消しました');
}
async function delHist(id, i){
  const it=itOf(id); if(!it || !it.hist[i]) return;
  const d=okDate(it.hist[i]);
  if(typeof appConfirm==='function' && !(await appConfirm(mdw(d)+'の 記録を 消しますか？', '消す', 'やめる'))) return;
  const j=it.hist.indexOf(ymd(d)); if(j>=0) it.hist.splice(j,1); save(); render(); reItem();
}
function setF(id, k, v){
  const it=itOf(id); if(!it) return;
  if(k==='name'){ const n=oneLine(v,30); if(!n){ toastS('名前は 空に できません'); reItem(); return; } if(st.items.some(x=>x!==it && x.name===n)){ toastS('「'+n+'」は もう あります'); reItem(); return; } it.name=n; }
  else if(k==='emo') it.emo=oneLine(v,8)||'✅';
  else if(k==='every') it.every=intIn(v,0,MAX_EVERY,0);
  else if(k==='memo') it.memo=multi(v,200);
  else return;
  save(); render(); reItem();
}
async function delItem(id){
  const it=itOf(id); if(!it) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+it.name+'」を 消しますか？\n（やった日の 記録も 消えます）', '消す', 'やめる'))) return;
  const i=st.items.indexOf(it); if(i>=0) st.items.splice(i,1); save(); popClose(); render();
}
function setSort(k){ if(!['due','name','recent'].includes(k)) return; st.sort=k; save(); render(); }
function setFilt(k){ if(!['all','late','soon'].includes(k)) return; st.filt=k; save(); render(); }

/* ───────── 文字で コピー ───────── */
function text(){
  const T=today(), all=ordered(), out=['🔁 前にやった日（'+mdw(T)+'）'];
  const grp=[['late','⚠ 過ぎた'],['soon','⏳ 近い'],['ok','まだ 大丈夫'],['free','目安なし'],['none','まだ 記録なし']];
  grp.forEach(([k,t])=>{ const L=all.filter(x=>x.f.st===k); if(!L.length) return; out.push('', t);
    L.forEach(({it,f})=>out.push('・'+it.name+(f.last ? '：最後 '+md(f.last)+'（'+agoText(f.days)+'）' : '')+(it.every ? '・目安 '+it.every+'日'+(f.st==='late' ? ' → '+(-f.left)+'日 過ぎ' : f.st==='soon' || f.st==='ok' ? ' → あと '+f.left+'日' : '') : ''))); });
  return out.join('\n');
}
function copy(){ if(!st.items.length){ toastS('まだ 何も ありません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 コピーしました（LINE などに 貼れます）'); }

/* ───────── 窓 ───────── */
const CSS=`
#yattaOverlay .yt-modal{ display:flex; flex-direction:column; }
.yt-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.yt-wrap{ max-width:760px; margin:0 auto; padding-bottom:70px; }
.yt-top{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 8px; } .yt-top .yt-b{ flex:1 1 auto; }
.yt-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.yt-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .yt-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.yt-sel{ min-height:44px; padding:0 8px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; }
.yt-filt{ display:flex; gap:6px; margin:0 0 10px; flex-wrap:wrap; }
.yt-filt button{ min-height:40px; padding:0 14px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14.5px; cursor:pointer; }
.yt-filt button b{ margin-left:2px; } .yt-filt button.late b{ color:#e53935; } .yt-filt button.soon b{ color:#b26a00; }
.yt-filt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .yt-filt button.on b{ color:inherit; }
.yt-list{ display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:8px; }
.yt-card{ display:flex; align-items:stretch; border-radius:14px; border:1px solid rgba(120,132,156,.3); border-left:6px solid rgba(120,132,156,.5); background:var(--modal-bg,#fff); overflow:hidden; }
.yt-card.st-late{ border-left-color:#e53935; background:rgba(229,57,53,.07); } .yt-card.st-soon{ border-left-color:#f0a400; background:rgba(240,164,0,.08); } .yt-card.st-ok{ border-left-color:#2e9d4a; }
.yt-main{ flex:1; min-width:0; display:flex; gap:10px; align-items:center; padding:10px; border:0; background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.yt-main .e{ font-size:30px; line-height:1; flex:none; } .yt-main .t{ flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.yt-main .nm{ font-size:16px; overflow-wrap:anywhere; } .yt-main small{ font-size:13px; color:var(--text-light,#666); line-height:1.4; } .yt-main small b{ font-size:14px; color:var(--text,#222); }
.yt-card.st-late .s b{ color:#e53935; } .yt-card.st-soon .s b{ color:#b26a00; } .yt-card.st-ok .s b{ color:#2e7d32; }
.bar{ display:block; height:7px; border-radius:4px; background:rgba(120,132,156,.2); overflow:hidden; } .bar i{ display:block; height:100%; border-radius:4px; background:#2e9d4a; }
.st-soon .bar i{ background:#f0a400; } .st-late .bar i{ background:#e53935; }
.yt-do{ flex:none; width:78px; border:0; border-left:1px solid rgba(120,132,156,.25); background:var(--acc); color:var(--on-acc,#fff); font-size:24px; font-weight:bold; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; line-height:1; }
.yt-do small{ font-size:11.5px; line-height:1.25; font-weight:bold; } .yt-do.dn{ background:rgba(120,132,156,.18); color:var(--text,#222); }
.yt-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:10px 0 0; }
.yt-empty p{ margin:4px 0 8px; font-size:14px; }
.yt-pre{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:6px; margin:0 0 10px; }
.yt-pre button{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-height:56px; padding:8px 10px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:14px; font-weight:bold; text-align:left; cursor:pointer; }
.yt-pre button span{ font-size:22px; line-height:1; } .yt-pre button small{ font-size:11.5px; font-weight:normal; color:var(--text-light,#666); }
.yt-undo{ display:none; align-items:center; gap:10px; margin:6px 10px calc(8px + var(--safe-bottom,0px)); padding:10px 12px; border-radius:12px; background:#263238; color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.3); font-size:14px; z-index:3; }
.yt-undo.on{ display:flex; } .yt-undo span{ flex:1; min-width:0; } .yt-undo button{ min-height:38px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.5); background:transparent; color:#fff; font-size:14px; font-weight:bold; cursor:pointer; }
.yt-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.yt-pop{ width:100%; max-width:640px; max-height:88%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.yt-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .yt-ph .e{ font-size:28px; line-height:1; } .yt-ph b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.yt-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.yt-sum{ padding:10px 12px; border-radius:12px; background:rgba(120,132,156,.1); font-size:14px; line-height:1.7; } .yt-sum b{ font-size:15px; }
.yt-sum.st-late .stx{ color:#e53935; } .yt-sum.st-soon .stx{ color:#b26a00; } .yt-sum.st-ok .stx{ color:#2e7d32; }
.yt-acts{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin:10px 0 0; } .yt-acts.end{ justify-content:flex-end; margin-top:14px; }
.yt-dt{ display:inline-flex; align-items:center; gap:6px; font-size:13.5px; } .yt-dt input{ min-height:42px; padding:0 8px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; }
.yt-pop h5{ margin:14px 0 6px; font-size:14.5px; }
.yt-hist{ border:1px solid rgba(120,132,156,.25); border-radius:12px; overflow:hidden; }
.yt-h{ display:flex; align-items:center; gap:10px; padding:4px 6px 4px 12px; border-bottom:1px solid rgba(120,132,156,.18); } .yt-h:last-child{ border-bottom:0; }
.yt-h span{ flex:1; font-size:14.5px; } .yt-h small{ font-size:12.5px; color:var(--text-light,#666); }
.yt-h button{ min-width:40px; min-height:40px; border:0; background:transparent; color:var(--text,#222); font-size:16px; cursor:pointer; }
.yt-f{ display:flex; align-items:center; gap:8px; margin:8px 0; } .yt-f.top{ align-items:flex-start; } .yt-f > span{ min-width:4.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); line-height:1.3; }
.yt-f input, .yt-f textarea{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.yt-f textarea{ padding:8px 10px; resize:vertical; } .yt-f em{ font-style:normal; font-size:13px; color:var(--text-light,#666); white-space:nowrap; }
.yt-emos{ display:flex; flex-wrap:wrap; gap:4px; flex:1; } .yt-emos button{ width:40px; height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.3); background:transparent; font-size:20px; cursor:pointer; padding:0; } .yt-emos button.on{ border:2px solid var(--acc); background:rgba(120,132,156,.12); }
.yt-chips{ display:flex; flex-wrap:wrap; gap:5px; margin:0 0 6px 5.1em; } .yt-chips button{ min-height:36px; padding:0 10px; border-radius:18px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; }
.yt-chips button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
@media (max-width:520px){ .yt-list{ grid-template-columns:1fr; } .yt-chips{ margin-left:0; } .yt-pre{ grid-template-columns:1fr 1fr; } }
`;
function ensureDom(){
  if($('yattaOverlay')) return;
  const s=document.createElement('style'); s.id='ytStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="yattaOverlay">
  <div class="modal vol-modal yt-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🔁 前にやった日 帳</span><button class="modal-close" onclick="closeYatta()" aria-label="閉じる">✕</button></div>
    <div class="yt-body" id="ytBody"></div>
    <div class="yt-undo" id="ytUndo" role="status"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('yattaOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の 電卓キーに 届かないように
  // Esc は 上に 重ねた 小さな窓から 閉じる（表電卓の「Esc で 閉じる」より 先に 受ける）
  window.addEventListener('keydown', e=>{
    if(e.key!=='Escape' || !pop || !isDlgOpen('yattaOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); clearTimeout(undoT); undo=null; const u=$('ytUndo'); if(u) u.classList.remove('on'); }
function openYatta(){ ensureDom(); load(); openDlg('yattaOverlay', cleanup); render(); }
function closeYatta(){ if(!$('yattaOverlay') || !isDlgOpen('yattaOverlay')) return; closeDlg('yattaOverlay', cleanup); }

window.YATTA={ add:openAdd, addGo, preset, done, doneOn, undo:undoDo, open:openItem, close:popClose, set:setF, del:id=>{ delItem(id); }, delHist:(id,i)=>{ delHist(id,i); },
  sort:setSort, filt:setFilt, copy, text,
  // ためす とき 用
  today:s=>{ fixedToday=s ? String(s) : null; if(st) render(); }, state:()=>JSON.parse(JSON.stringify(st)), clean:cleanIt, addItem:(n,e,emo,last)=>{ const it=addItem(n,e,emo,last); render(); return it ? it.id : null; },
  info:id=>{ const it=itOf(id); if(!it) return null; const f=info(it); return {st:f.st, days:f.days, left:f.left, next:f.next ? ymd(f.next) : '', avg:f.avg}; },
  order:()=>ordered().map(x=>x.it.name), delItem, delHistNow:delHist };
Object.assign(window, { openYatta, closeYatta });
})();
