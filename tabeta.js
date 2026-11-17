/* 🍽 食べた物 帳（v693。表電卓の道具。apps/tabeta/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   食べた物を 打つか 話すだけで どんどん 記録して いく。
   ・下の 欄に「おにぎり、みそ汁」のように 打って Enter（または ＋）。「、」「,」「・」「／」・改行で 分けて 1品ずつ 入る。
     🎤 で 話したときは「おにぎりと みそ汁」の「と」でも 分ける（⚙ で 切れる）。入れたら 欄は 空に なり、そのまま 続けて 入れられる。
   ・時刻は 入れた 時。朝（4時〜）・昼（10時半〜）・間食（15時〜）・夕（17時〜）・夜食（22時〜）は 時刻から 自動。
     「いつ：いま」を 押すと きのう・ちがう日・朝昼夕・時刻を 決めて あとから まとめて 入れられる（いまに もどすまで 続く）。
   ・よく 食べる 物・さっき 入れた 物は ボタンに なり、押すだけで 入る。
   ・日ごとに 朝・昼・夕… の まとまりで 並ぶ（下が 新しい）。上の「もっと 前」で 前の日を 出す。
   ・押すと 直す（名前・日・時刻・食事・量や メモ・消す・もう一度 食べた）。入れた・消したは 下の 帯の ↶ で 取り消せる。
   ・🔍 さがす：その 物を 何回・最後に いつ 食べたか。
   ・⚙：📋 コピー・📤 共有（きょう・きのう・この7日・ぜんぶ）・⬇ CSV（Excel）・▦ 表に 入れる・「と」で 分ける・ぜんぶ 消す。
   中身は excalc_tabeta（この端末の中だけ。📋リストの ⬇書き出しにも 入る）。 */
(function(){
'use strict';
const KEY='excalc_tabeta', MAX_E=40000, NAME_N=40, MEMO_N=80;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);   // onclick に 入れるので 英数字だけ

/* ───────── 日付・時刻 ───────── */
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const hm=d=>d.getHours()+':'+pad2(d.getMinutes());
let fixedNow=null;   // ためす とき だけ（TABETA.now('2026-11-17T12:30')）
function now(){ return fixedNow ? new Date(fixedNow) : new Date(); }
function okDate(s){
  const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s||'')); if(!m) return null;
  const y=+m[1], mo=+m[2]-1, d=+m[3], t=new Date(y,mo,d);
  return (y>=1900 && y<=2200 && t.getMonth()===mo && t.getDate()===d) ? t : null;
}
const dayStart=d=>new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayNo=d=>Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/86400000);
const WD='日月火水木金土';
function agoText(d){ const n=dayNo(now())-dayNo(d); return n<=0 ? 'きょう' : n===1 ? 'きのう' : n===2 ? 'おととい' : n<60 ? n+'日前' : '約'+Math.round(n/30.44)+'か月前'; }

/* ───────── 食事（時刻から 自動） ───────── */
const MEALS=[['asa','🌅','朝',7*60+30],['hiru','🍱','昼',12*60],['oya','🍪','間食',15*60],['yuu','🍲','夕',19*60],['yoru','🌙','夜食',22*60+30]];
const mealDef=k=>MEALS.find(x=>x[0]===k)||MEALS[0];
function mealOf(d){ const m=d.getHours()*60+d.getMinutes(); return m>=4*60 && m<10*60+30 ? 'asa' : m>=10*60+30 && m<15*60 ? 'hiru' : m>=15*60 && m<17*60 ? 'oya' : m>=17*60 && m<22*60 ? 'yuu' : 'yoru'; }
const mealName=k=>{ const x=mealDef(k); return x[1]+' '+x[2]; };

/* ───────── 状態 ───────── */
let st=null;          // {e:[{i,t,n,m,q}] 古い 順, split:true}
let when=null;        // あとから 入れる ときの「いつ」 {day:'YYYY-MM-DD', meal:'asa'|null, time:'HH:MM'|null}（null＝いま）
let q='';             // さがす
const SHOW_N=200;     // はじめに 出す 品数（新しい ほうから）
let shown=SHOW_N;     // 出して いる 品数（上の「もっと 前」で ふやす）
function cleanE(x){
  if(!x || typeof x!=='object') return null;
  const n=oneLine(x.n, NAME_N), t=+x.t; if(!n || !isFinite(t) || t<0) return null;
  const m=MEALS.some(y=>y[0]===x.m) ? x.m : mealOf(new Date(t));
  return {i:okId(x.i) ? x.i : rid(), t:Math.round(t), n, m, q:oneLine(x.q, MEMO_N)};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const seen=new Set(), e=(Array.isArray(o.e) ? o.e : []).map(cleanE).filter(Boolean).filter(x=>{ if(seen.has(x.i)) x.i=rid(); seen.add(x.i); return true; });
  e.sort((a,b)=>a.t-b.t);
  st={e:e.slice(-MAX_E), split:o.split!==false};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません。⚙ の ⬇ CSV で 残して、古い 記録を 消して ください）', 5200); return false; } }
const eOf=id=>st.e.find(x=>x.i===id)||null;
function insertSorted(x){ let k=st.e.length; while(k>0 && st.e[k-1].t>x.t) k--; st.e.splice(k, 0, x); }

/* ───────── 入れる ───────── */
// 1回に 入れた 言葉を 1品ずつに 分ける。「、」「,」「・」「／」・改行。声の ときは「と」でも（さとう・おべんとう・とうふ は 分けない）
function splitFoods(text, voice){
  let parts=String(text||'').normalize('NFKC').split(/[、,，・\/\n。]+/).map(s=>s.trim()).filter(Boolean);
  if(voice && st.split) parts=parts.flatMap(p=>splitTo(p));
  return parts.map(p=>oneLine(p.replace(/^(それから|あとは)\s*/,'').replace(/^あと\s+/,'').replace(/(を食べた|食べた|を食べました|食べました|です)$/,''), NAME_N)).filter(Boolean);   // 頭の「それから」「あとは」・おわりの「食べた」は 落とす
}
function splitTo(p){
  for(let i=2;i<p.length-1;i++){
    if(p[i]!=='と') continue;
    const L=p.slice(0,i).trim(), R=p.slice(i+1).trim();
    if(L.length<2 || R.length<2 || /^[うぅ]/.test(R)) continue;   // さとう・おべんとう・とうふ・いとこ煮 は 1つ
    return [L].concat(splitTo(R));
  }
  return [p];
}
function whenTime(){   // 入れる 時刻（いま か「いつ」で 決めた 時）
  const n=now();
  if(!when) return {t:n.getTime(), m:mealOf(n)};
  const d=okDate(when.day)||dayStart(n);
  let mins;
  if(when.time && /^\d{1,2}:\d\d$/.test(when.time)){ const [h,mi]=when.time.split(':').map(Number); mins=h*60+mi; }
  else if(when.meal) mins=mealDef(when.meal)[3];
  else mins=n.getHours()*60+n.getMinutes();
  const t=new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(mins/60), mins%60, 0).getTime()+(when.seq=(when.seq||0)+1)*1000;   // 同じ 時刻でも 入れた 順に 並ぶ
  return {t, m:when.meal || mealOf(new Date(t))};
}
function addFoods(names, how){
  if(!names.length) return [];
  if(st.e.length+names.length>MAX_E){ toastS('記録は '+MAX_E.toLocaleString()+' 品まで です。⚙ の ⬇ CSV で 残して、古い 記録を 消して ください', 5200); return []; }
  const added=[]; let base=null;
  names.forEach((n, k)=>{ const w=whenTime(); if(base==null) base=w.t; const x={i:rid(), t:when ? w.t : base+k, n, m:w.m, q:''}; insertSorted(x); added.push(x); });
  if(!save()){ added.forEach(x=>{ const k=st.e.indexOf(x); if(k>=0) st.e.splice(k,1); }); return []; }
  showUndo((added.length===1 ? '「'+added[0].n+'」' : added.length+'品（'+added.map(x=>x.n).join('・').slice(0,40)+'）')+'を 入れました'+(when ? '（'+whenText()+'）' : ''), ()=>{ added.forEach(x=>{ const k=st.e.indexOf(x); if(k>=0) st.e.splice(k,1); }); save(); render(); });
  return added;
}
function addText(text, voice){
  const names=splitFoods(text, voice); if(!names.length) return [];
  const a=addFoods(names, voice ? 'voice' : 'text'); if(a.length){ q=''; render(true); }
  return a;
}
function addGo(){
  const inp=$('tbIn'); if(!inp) return;
  const v=inp.value; if(!v.trim()){ toastS('食べた物を 入れて ください（例：おにぎり、みそ汁）'); try{ inp.focus(); }catch(_){} return; }
  if(addText(v, false).length){ inp.value=''; try{ inp.focus(); }catch(_){} }
}
function chip(i){ const n=chipList()[+i]; if(!n) return; addFoods([n], 'chip'); q=''; render(true); }

/* ───────── よく 食べる 物・さっき 入れた 物（ボタン） ───────── */
function chipList(){
  const lim=now().getTime()-90*86400000, cnt=new Map(), last=new Map();
  for(const x of st.e){ if(x.t<lim) continue; cnt.set(x.n, (cnt.get(x.n)||0)+1); last.set(x.n, x.t); }
  const recent=[...last.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  const top=[...cnt.entries()].sort((a,b)=>b[1]-a[1] || (last.get(b[0])-last.get(a[0]))).map(x=>x[0]);
  return [...new Set(recent.concat(top))].slice(0,18);
}

/* ───────── 取り消し（下の 帯） ───────── */
let undo=null, undoT=0;
function showUndo(msg, fn){
  undo=fn; const u=$('tbUndo'); if(!u) return;
  u.innerHTML='<span>'+esc(msg)+'</span><button type="button" onclick="TABETA.undo()">↶ 取り消す</button>';
  u.classList.add('on'); clearTimeout(undoT); undoT=setTimeout(()=>{ u.classList.remove('on'); undo=null; }, 6000);
}
function undoDo(){ const f=undo; undo=null; clearTimeout(undoT); const u=$('tbUndo'); if(u) u.classList.remove('on'); if(f){ f(); toastS('取り消しました'); } }

/* ───────── 画面 ───────── */
function whenText(){
  if(!when) return '';
  const d=okDate(when.day)||dayStart(now()), n=dayNo(now())-dayNo(d);
  const dt=n===0 ? 'きょう' : n===1 ? 'きのう' : n===2 ? 'おととい' : (d.getMonth()+1)+'/'+d.getDate();
  return dt+(when.meal ? 'の '+mealName(when.meal) : '')+(when.time ? ' '+when.time : '');
}
function dateText(d){   // 11/17（火）・年が ちがえば 2025/11/17（月）
  return (d.getFullYear()!==now().getFullYear() ? d.getFullYear()+'/' : '')+(d.getMonth()+1)+'/'+d.getDate()+'（'+WD[d.getDay()]+'）';
}
function rowsHtml(list){   // 食べた物を 1行ずつ（入れた 日付・時刻つき）。日が かわる 所に 線
  const tk=ymd(now()); let prev='';
  return '<div class="tb-list">'+list.map(x=>{
    const d=new Date(x.t), k=ymd(d), nd=k!==prev; prev=k;
    return '<button type="button" class="tb-row'+(nd ? ' nd' : '')+(k===tk ? ' td' : '')+'" onclick="TABETA.open(\''+x.i+'\')"><span class="tb-dt">'+dateText(d)+'<b>'+hm(d)+'</b></span><span class="tb-nm">'+esc(x.n)+(x.q ? '<small>'+esc(x.q)+'</small>' : '')+'</span></button>';
  }).join('')+'</div>';
}
function render(toBottom){
  const b=$('tbBody'); if(!b) return;
  const keepBottom=toBottom || (b.scrollHeight-b.scrollTop-b.clientHeight<40);
  const qq=q.trim().normalize('NFKC').toLowerCase();
  let html='';
  if(qq){
    const hit=st.e.filter(x=>x.n.normalize('NFKC').toLowerCase().includes(qq)||x.q.normalize('NFKC').toLowerCase().includes(qq));
    if(!hit.length) html='<p class="tb-note">「'+esc(q.trim())+'」は まだ ありません。</p>';
    else {
      const names=new Map(); hit.forEach(x=>{ const o=names.get(x.n)||{n:0, last:0}; o.n++; o.last=Math.max(o.last, x.t); names.set(x.n, o); });
      html='<div class="tb-sum">'+[...names.entries()].sort((a,b)=>b[1].n-a[1].n).slice(0,8).map(([n,o])=>'<div><b>'+esc(n)+'</b> '+o.n+'回・最後 '+(new Date(o.last).getMonth()+1)+'月'+new Date(o.last).getDate()+'日（'+agoText(new Date(o.last))+'）</div>').join('')+'</div>'
        +rowsHtml(hit.slice(-300))+(hit.length>300 ? '<p class="tb-note">新しい 300件を 出して います（ぜんぶで '+hit.length+'件）</p>' : '');
    }
  } else if(!st.e.length){
    html='<div class="tb-empty"><div class="e" aria-hidden="true">🍽</div><p>食べた物を 下の 欄に 打つか 🎤 で 話して ください。<br>入れた 物が 1行ずつ ずっと 並んで いきます。<br>「おにぎり、みそ汁、卵焼き」のように まとめて 入れると 1品ずつ 入ります。</p><p>入れた <b>日付と 時刻は 自動で</b> つきます。あとから 入れる ときは「いつ：いま」を 押して 日を えらびます。</p></div>';
  } else {
    const list=st.e.slice(-shown), older=st.e.length-list.length;
    html=(older ? '<button type="button" class="tb-more" onclick="TABETA.more()">▲ もっと 前を 見る（あと '+older.toLocaleString()+'品）</button>' : '')
      +rowsHtml(list)+'<p class="tb-count">ぜんぶで '+st.e.length.toLocaleString()+'品</p>';
  }
  b.innerHTML='<div class="tb-wrap">'+html+'</div>';
  renderDock();
  if(keepBottom && !qq) b.scrollTop=b.scrollHeight;
}
function renderDock(){
  const w=$('tbWhen'), c=$('tbChips'); if(!w || !c) return;
  const nm=mealName(mealOf(now()));
  w.innerHTML=when ? '🕘 '+esc(whenText())+'<b>✕</b>' : '🕘 いつ：いま（'+nm+'）';
  w.classList.toggle('set', !!when);
  const ch=chipList();
  c.innerHTML=ch.length ? ch.map((n,i)=>'<button type="button" onclick="TABETA.chip('+i+')">＋ '+esc(n)+'</button>').join('') : '<span class="tb-hint">よく 食べる 物は ここに ボタンで 出ます</span>';
}

/* ───────── 小さな窓（直す・いつ・メニュー） ───────── */
let pop=null;
function popOpen(html, kind, id){
  popClose();
  const host=document.querySelector('#tabetaOverlay .tb-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='tb-pop-bg';
  el.innerHTML='<div class="tb-pop" role="dialog" aria-modal="true">'+html+'</div>';
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  pop={el, kind, id, rel:()=>{}};
  const me=pop; if(typeof modalBack==='function') pop.rel=modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } });   // 端末の「戻る」は この窓だけ 閉じる
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }
const ph=t=>'<div class="tb-ph"><b>'+t+'</b><button type="button" class="tb-x" onclick="TABETA.close()" aria-label="閉じる">✕</button></div>';
function openItem(id){
  const x=eOf(id); if(!x) return;
  const d=new Date(x.t);
  popOpen(ph('✏ 直す')
    +'<label class="tb-f"><span>食べた物</span><input id="tbEN" type="text" maxlength="'+NAME_N+'" value="'+esc(x.n)+'"></label>'
    +'<label class="tb-f"><span>量・メモ</span><input id="tbEQ" type="text" maxlength="'+MEMO_N+'" value="'+esc(x.q)+'" placeholder="例：大盛り・半分・外食"></label>'
    +'<label class="tb-f"><span>日</span><input id="tbED" type="date" value="'+ymd(d)+'"></label>'
    +'<label class="tb-f"><span>時刻</span><input id="tbET" type="time" value="'+pad2(d.getHours())+':'+pad2(d.getMinutes())+'"></label>'
    +'<div class="tb-f"><span>食事</span><div class="tb-seg" id="tbEM">'+MEALS.map(m=>'<button type="button" data-m="'+m[0]+'" class="'+(x.m===m[0]?'on':'')+'" onclick="TABETA.pickMeal(this)">'+m[1]+' '+m[2]+'</button>').join('')+'</div></div>'
    +'<div class="tb-acts"><button type="button" class="tb-b pri" onclick="TABETA.saveItem(\''+x.i+'\')">✓ 直す</button><button type="button" class="tb-b" onclick="TABETA.again(\''+x.i+'\')">🔁 もう一度 食べた（いま 入れる）</button><button type="button" class="tb-b warn" onclick="TABETA.del(\''+x.i+'\')">🗑 消す</button></div>', 'item', x.i);
}
function pickMeal(btn){ btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b===btn)); }
function saveItem(id){
  const x=eOf(id); if(!x) return popClose();
  const n=oneLine(($('tbEN')||{}).value, NAME_N); if(!n){ toastS('食べた物を 入れて ください'); return; }
  const d=okDate(($('tbED')||{}).value)||dayStart(new Date(x.t)), tm=String(($('tbET')||{}).value||'');
  const mm=/^(\d{1,2}):(\d\d)$/.exec(tm), H=mm ? +mm[1] : new Date(x.t).getHours(), M=mm ? +mm[2] : new Date(x.t).getMinutes();
  const onBtn=document.querySelector('#tbEM button.on'), old=Object.assign({}, x);
  x.n=n; x.q=oneLine(($('tbEQ')||{}).value, MEMO_N); x.t=new Date(d.getFullYear(), d.getMonth(), d.getDate(), H, M, new Date(old.t).getSeconds()).getTime(); x.m=onBtn ? onBtn.dataset.m : mealOf(new Date(x.t));
  st.e.splice(st.e.indexOf(x), 1); insertSorted(x); save(); popClose(); render();
  showUndo('「'+x.n+'」を 直しました', ()=>{ Object.assign(x, old); st.e.splice(st.e.indexOf(x), 1); insertSorted(x); save(); render(); });
}
function delItem(id){
  const x=eOf(id); if(!x) return; const k=st.e.indexOf(x);
  st.e.splice(k, 1); save(); popClose(); render();
  showUndo('「'+x.n+'」を 消しました', ()=>{ insertSorted(x); save(); render(); });
}
function again(id){ const x=eOf(id); if(!x) return; popClose(); const w=when; when=null; addFoods([x.n], 'again'); when=w; render(true); }
function openWhen(){
  const T=dayStart(now()), cur=when||{day:ymd(T), meal:null, time:null};
  const dayBtn=(n,t)=>{ const d=new Date(T.getFullYear(), T.getMonth(), T.getDate()-n), k=ymd(d); return '<button type="button" class="'+(cur.day===k?'on':'')+'" onclick="TABETA.setWhen(\'day\',\''+k+'\')">'+t+'</button>'; };
  popOpen(ph('🕘 いつ 食べた？')
    +'<p class="tb-note">あとから 入れる ときに。決めた 日・食事で、もどすまで 続けて 入れられます。</p>'
    +'<div class="tb-f"><span>日</span><div class="tb-seg">'+dayBtn(0,'きょう')+dayBtn(1,'きのう')+dayBtn(2,'おととい')+'</div></div>'
    +'<label class="tb-f"><span></span><input id="tbWD" type="date" value="'+esc(cur.day)+'" max="'+ymd(T)+'" onchange="TABETA.setWhen(\'day\',this.value)"></label>'
    +'<div class="tb-f"><span>食事</span><div class="tb-seg">'+MEALS.map(m=>'<button type="button" class="'+(cur.meal===m[0]?'on':'')+'" onclick="TABETA.setWhen(\'meal\',\''+m[0]+'\')">'+m[1]+' '+m[2]+'</button>').join('')+'</div></div>'
    +'<label class="tb-f"><span>時刻</span><input id="tbWT" type="time" value="'+esc(cur.time||'')+'" onchange="TABETA.setWhen(\'time\',this.value)"><em>（なくても よい）</em></label>'
    +'<div class="tb-acts"><button type="button" class="tb-b pri" onclick="TABETA.close()">✓ これで 入れる</button><button type="button" class="tb-b" onclick="TABETA.setWhen(\'now\')">🕘 いまに もどす</button></div>', 'when');
}
function setWhen(k, v){
  const T=dayStart(now());
  if(k==='now'){ when=null; popClose(); renderDock(); toastS('いまの 時刻で 入れます'); return; }
  const w=when||{day:ymd(T), meal:null, time:null};
  if(k==='day'){ const d=okDate(v); if(!d || dayNo(d)>dayNo(T)) return; w.day=ymd(d); }
  else if(k==='meal'){ w.meal=MEALS.some(m=>m[0]===v) ? v : null; w.time=null; }
  else if(k==='time'){ w.time=/^\d{1,2}:\d\d$/.test(String(v)) ? String(v) : null; if(w.time) w.meal=mealOf(new Date(2000,0,1,+w.time.split(':')[0],+w.time.split(':')[1])); }
  w.seq=0; when=w; renderDock();
  if(pop && pop.kind==='when') openWhen();
}
function whenTap(){ if(when){ when=null; renderDock(); toastS('いまの 時刻で 入れます'); } else openWhen(); }
function openMenu(){
  const n=st.e.length, days=new Set(st.e.map(x=>ymd(new Date(x.t)))).size;
  popOpen(ph('⚙ 食べた物 帳')
    +'<p class="tb-note">いま <b>'+n.toLocaleString()+'</b>品（'+days+'日ぶん）。入れた ものは この 端末の 中だけに あります（📋リストの ⬇書き出しにも 入ります）。</p>'
    +'<h5>コピー・共有（LINE・メールに 貼れます）</h5>'
    +'<div class="tb-seg wide">'+[['today','きょう'],['yday','きのう'],['week','この7日'],['all','ぜんぶ']].map(([k,t])=>'<button type="button" onclick="TABETA.out(\'copy\',\''+k+'\')">📋 '+t+'</button>').join('')+'</div>'
    +'<div class="tb-seg wide">'+[['today','きょう'],['week','この7日']].map(([k,t])=>'<button type="button" onclick="TABETA.out(\'share\',\''+k+'\')">📤 '+t+'を 送る</button>').join('')+'</div>'
    +'<h5>ほかの 形で</h5>'
    +'<div class="tb-acts col"><button type="button" class="tb-b" onclick="TABETA.csv()">⬇ CSV（Excel）で 保存（ぜんぶ）</button><button type="button" class="tb-b" onclick="TABETA.out(\'table\',\'week\')">▦ この7日を 表に 入れる</button></div>'
    +'<h5>入れ方</h5>'
    +'<label class="tb-chk"><input type="checkbox" '+(st.split ? 'checked' : '')+' onchange="TABETA.setSplit(this.checked)"> 🎤 で 話した ときは「と」でも 分ける（おにぎりと みそ汁 → 2品）</label>'
    +'<div class="tb-acts col"><button type="button" class="tb-b warn" onclick="TABETA.wipe()">🗑 ぜんぶ 消す</button></div>', 'menu');
}
function setSplit(v){ st.split=!!v; save(); }
function rangeOf(k){
  const T=dayStart(now()).getTime(), D=86400000;
  if(k==='today') return {from:T, to:T+D, title:'きょう'};
  if(k==='yday') return {from:T-D, to:T, title:'きのう'};
  if(k==='week') return {from:T-6*D, to:T+D, title:'この7日'};
  return {from:0, to:Infinity, title:'ぜんぶ'};
}
function text(k){
  const r=rangeOf(k||'today'), list=st.e.filter(x=>x.t>=r.from && x.t<r.to);
  if(!list.length) return '';
  return '🍽 食べた物（'+r.title+'・'+list.length+'品）\n'+list.map(x=>{ const d=new Date(x.t); return dateText(d)+' '+hm(d)+'　'+x.n+(x.q ? '（'+x.q+'）' : ''); }).join('\n');
}
function rows(k){
  const r=rangeOf(k||'week'), list=st.e.filter(x=>x.t>=r.from && x.t<r.to);
  return [['日付','時刻','食事','食べた物','量・メモ']].concat(list.map(x=>{ const d=new Date(x.t); return [ymd(d), hm(d), mealDef(x.m)[2], x.n, x.q]; }));
}
function out(kind, k){
  const t=text(k), r=rangeOf(k);
  if(!t){ toastS(r.title+'の 記録が ありません'); return; }
  popClose();
  if(kind==='copy'){ if(typeof toolCopyText==='function') toolCopyText(t, '📋 '+r.title+'の 食べた物を コピーしました（LINE などに 貼れます）'); return; }
  if(kind==='share'){ if(typeof toolShareText==='function') toolShareText('食べた物（'+r.title+'）', t); return; }
  if(kind==='table'){ if(typeof toolPasteRows==='function') toolPasteRows(rows(k), '食べた物 帳', closeTabeta); }
}
function csv(){
  if(!st.e.length){ toastS('記録が ありません'); return; }
  const cs=v=>typeof csvSafe==='function' ? csvSafe(v) : String(v);
  const body='﻿'+rows('all').map(r=>r.map(v=>'"'+cs(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const n=now(), name='tabeta_'+n.getFullYear()+pad2(n.getMonth()+1)+pad2(n.getDate())+'.csv';
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([body], {type:'text/csv;charset=utf-8'})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  popClose(); toastS('⬇ CSV を 保存しました（Excel で 開けます）');
}
async function wipe(){
  if(!st.e.length){ toastS('記録が ありません'); return; }
  const ok=typeof appConfirm==='function' ? await appConfirm('食べた物の 記録 '+st.e.length+'品を ぜんぶ 消します。よろしいですか？（先に ⬇ CSV で 残せます）') : confirm('ぜんぶ 消しますか？');
  if(!ok) return;
  const keep=st.e; st.e=[]; save(); popClose(); render();
  showUndo('ぜんぶ 消しました', ()=>{ st.e=keep; save(); render(true); });
}
function more(){ const b=$('tbBody'), h=b ? b.scrollHeight : 0; shown+=300; render(); if(b) b.scrollTop=b.scrollHeight-h; }
function find(v){ q=String(v||''); render(!q); }

/* ───────── 🎤 声 ───────── */
let rec=null;
function micStop(){ if(rec){ try{ rec.abort(); }catch(_){} rec=null; } const m=$('tbMic'); if(m) m.classList.remove('on'); }
function mic(){
  if(rec){ micStop(); return; }
  const C=typeof speechRecCtor==='function' ? speechRecCtor() : (window.SpeechRecognition||window.webkitSpeechRecognition);
  if(!C){ toastS('この 端末では 声を 聞き取れません。キーボードの マイクか 文字で 入れて ください'); return; }
  const r=new C(); r.lang='ja-JP'; r.interimResults=true; r.maxAlternatives=1;
  const inp=$('tbIn'), btn=$('tbMic'); let said='';
  r.onresult=e=>{ said=[...e.results].map(x=>x[0].transcript).join(''); if(inp) inp.value=said; };
  r.onerror=e=>{ if(e.error==='not-allowed') toastS('マイクを 使えません。ブラウザの 設定で マイクを 許可して ください'); };
  r.onend=()=>{ rec=null; if(btn) btn.classList.remove('on'); heard(said); };
  rec=r; if(btn) btn.classList.add('on');
  try{ r.start(); }catch(_){ micStop(); }
}
function heard(t){ t=String(t||'').trim(); if(!t) return; const a=addText(t, true); const inp=$('tbIn'); if(a.length && inp) inp.value=''; }

/* ───────── 見た目 ───────── */
const CSS=`
#tabetaOverlay .tb-modal{ display:flex; flex-direction:column; }
.tb-top{ display:flex; gap:6px; padding:8px 10px 6px; border-bottom:1px solid rgba(120,132,156,.25); }
.tb-top input{ flex:1; min-width:0; min-height:42px; padding:0 12px; border-radius:21px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; }
.tb-top button{ min-width:46px; min-height:42px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:18px; cursor:pointer; }
.tb-body{ flex:1; min-height:0; overflow:auto; padding:6px 10px 10px; color:var(--text,#222); font-size:15px; overscroll-behavior:contain; }
.tb-wrap{ max-width:760px; margin:0 auto; }
.tb-list{ display:flex; flex-direction:column; }
#tabetaOverlay .tb-row{ display:flex; justify-content:flex-start; align-items:baseline; gap:10px; width:100%; min-height:44px; padding:11px 6px; border:0; border-bottom:1px solid rgba(120,132,156,.22); background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
#tabetaOverlay .tb-row.nd{ border-top:2px solid rgba(120,132,156,.55); } #tabetaOverlay .tb-row.nd:first-child{ border-top:0; }
.tb-row:active{ background:rgba(120,132,156,.12); }
.tb-dt{ flex:none; min-width:8.3em; font-size:13px; color:var(--text-light,#666); white-space:nowrap; font-variant-numeric:tabular-nums; } .tb-dt b{ display:inline-block; min-width:2.9em; margin-left:4px; text-align:right; font-weight:normal; }
.tb-row.td .tb-dt{ color:var(--acc-text,var(--acc)); font-weight:bold; } .tb-row.td .tb-dt b{ font-weight:bold; }
.tb-nm{ flex:1; min-width:0; text-align:left; font-size:16px; overflow-wrap:anywhere; } .tb-nm small{ margin-left:8px; font-size:12.5px; color:var(--text-light,#666); }
.tb-count{ margin:8px 0 2px; text-align:right; font-size:12.5px; color:var(--text-light,#666); }
.tb-more{ display:block; width:100%; min-height:42px; margin:4px 0 6px; border-radius:12px; border:1px dashed rgba(120,132,156,.6); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.tb-note{ font-size:13px; color:var(--text-light,#666); line-height:1.6; margin:8px 0; }
.tb-sum{ margin:6px 0 8px; padding:8px 10px; border-radius:12px; background:var(--acc-weak,rgba(33,115,70,.12)); font-size:14px; line-height:1.7; }
.tb-empty{ text-align:center; padding:30px 8px; } .tb-empty .e{ font-size:56px; } .tb-empty p{ font-size:14.5px; line-height:1.8; color:var(--text,#222); }
.tb-dock{ flex:none; border-top:1px solid rgba(120,132,156,.3); padding:6px 8px calc(8px + var(--safe-bottom,0px)); background:var(--modal-bg,#fff); }
.tb-when{ min-height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; }
.tb-when.set{ background:#fff3e0; border-color:#fb8c00; color:#7a3f00; font-weight:bold; } .tb-when b{ margin-left:8px; }
.tb-chips{ display:flex; gap:5px; overflow-x:auto; padding:6px 0; scrollbar-width:none; } .tb-chips::-webkit-scrollbar{ display:none; }
.tb-chips button{ flex:none; min-height:36px; padding:0 12px; border-radius:18px; border:1px solid var(--acc); background:var(--acc-weak,rgba(33,115,70,.12)); color:var(--text,#222); font-size:14px; cursor:pointer; white-space:nowrap; }
.tb-hint{ font-size:12.5px; color:var(--text-light,#666); padding:8px 2px; }
.tb-in{ display:flex; gap:6px; align-items:center; }
.tb-in input{ flex:1; min-width:0; min-height:48px; padding:0 14px; border-radius:24px; border:2px solid var(--acc); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:17px; }
.tb-in button{ flex:none; min-width:52px; min-height:48px; border-radius:24px; border:0; font-size:20px; font-weight:bold; cursor:pointer; }
.tb-in .mic{ background:rgba(120,132,156,.15); color:var(--text,#222); } .tb-in .mic.on{ background:#e53935; color:#fff; animation:tbPulse 1s infinite; }
.tb-in .add{ background:var(--acc); color:var(--on-acc,#fff); padding:0 16px; font-size:16px; }
@keyframes tbPulse{ 50%{ box-shadow:0 0 0 8px rgba(229,57,53,.25); } }
.tb-undo{ display:none; align-items:center; gap:10px; margin:6px 10px 0; padding:10px 12px; border-radius:12px; background:#263238; color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.3); font-size:14px; }
.tb-undo.on{ display:flex; } .tb-undo span{ flex:1; min-width:0; overflow-wrap:anywhere; } .tb-undo button{ flex:none; min-height:38px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.5); background:transparent; color:#fff; font-size:14px; font-weight:bold; cursor:pointer; }
.tb-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.tb-pop{ width:100%; max-width:560px; max-height:88%; overflow:auto; padding:10px 14px calc(14px + var(--safe-bottom,0px)); border-radius:16px 16px 0 0; background:var(--modal-bg,#fff); color:var(--text,#222); box-shadow:0 -6px 24px rgba(0,0,0,.3); }
.tb-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .tb-ph b{ flex:1; font-size:17px; }
.tb-x{ width:40px; height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.tb-pop h5{ margin:12px 0 6px; font-size:14px; color:var(--acc-text,var(--acc)); }
.tb-f{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .tb-f > span{ flex:none; width:4.6em; font-size:13.5px; font-weight:bold; }
.tb-f input{ flex:1; min-width:0; min-height:44px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; }
.tb-f em{ font-style:normal; font-size:12.5px; color:var(--text-light,#666); white-space:nowrap; }
.tb-seg{ flex:1; display:flex; flex-wrap:wrap; gap:5px; } .tb-seg.wide{ margin:0 0 6px; }
.tb-seg button{ min-height:40px; padding:0 12px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.tb-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.tb-acts{ display:flex; flex-wrap:wrap; gap:6px; margin:10px 0 0; } .tb-acts.col{ flex-direction:column; }
.tb-b{ min-height:46px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.tb-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .tb-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.tb-chk{ display:flex; gap:8px; align-items:flex-start; font-size:14px; line-height:1.5; margin:4px 0; } .tb-chk input{ width:22px; height:22px; flex:none; }
body.dark .tb-when.set{ background:#4e342e; color:#ffe0b2; }
`;
function ensureDom(){
  if($('tabetaOverlay')) return;
  const s=document.createElement('style'); s.id='tbStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="tabetaOverlay">
  <div class="modal vol-modal tb-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🍽 食べた物 帳</span><button class="modal-close" onclick="closeTabeta()" aria-label="閉じる">✕</button></div>
    <div class="tb-top"><input id="tbFind" type="search" placeholder="🔍 さがす（例：カレー）" aria-label="食べた物を さがす" autocomplete="off" oninput="TABETA.find(this.value)"><button type="button" onclick="TABETA.menu()" aria-label="コピー・CSV・設定">⚙</button></div>
    <div class="tb-body" id="tbBody"></div>
    <div class="tb-undo" id="tbUndo" role="status"></div>
    <div class="tb-dock">
      <button type="button" class="tb-when" id="tbWhen" onclick="TABETA.whenTap()"></button>
      <div class="tb-chips" id="tbChips"></div>
      <div class="tb-in"><input id="tbIn" type="text" enterkeyhint="send" maxlength="300" autocomplete="off" placeholder="食べた物（例：おにぎり、みそ汁）" aria-label="食べた物"
        onkeydown="if(event.key==='Enter' && !event.isComposing){ event.preventDefault(); TABETA.go(); }"><button type="button" class="mic" id="tbMic" onclick="TABETA.mic()" aria-label="声で 入れる">🎤</button><button type="button" class="add" onclick="TABETA.go()">＋ 入れる</button></div>
    </div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('tabetaOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の 電卓キーに 届かないように
  window.addEventListener('keydown', e=>{   // Esc は 上に 重ねた 小さな窓から 閉じる
    if(e.key!=='Escape' || !pop || !isDlgOpen('tabetaOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); micStop(); clearTimeout(undoT); undo=null; const u=$('tbUndo'); if(u) u.classList.remove('on'); }
function openTabeta(){ ensureDom(); load(); q=''; shown=SHOW_N; const f=$('tbFind'); if(f) f.value=''; openDlg('tabetaOverlay', cleanup); render(true); }
function closeTabeta(){ if(!$('tabetaOverlay') || !isDlgOpen('tabetaOverlay')) return; closeDlg('tabetaOverlay', cleanup); }

window.TABETA={ go:addGo, chip, undo:undoDo, open:openItem, close:popClose, pickMeal, saveItem, del:delItem, again, whenTap, setWhen, openWhen, menu:openMenu, out, csv, wipe, setSplit, more, find, mic,
  // ためす とき 用
  now:s=>{ fixedNow=s ? String(s) : null; if(st) render(true); }, add:(t, voice)=>addText(t, !!voice).length, state:()=>JSON.parse(JSON.stringify(st)), split:(t, v)=>splitFoods(t, v!==false), mealOf:s=>mealOf(new Date(s)),
  text, rows, chips:chipList, clean:cleanE, heard, when:()=>when ? Object.assign({}, when) : null };
Object.assign(window, { openTabeta, closeTabeta });
})();
