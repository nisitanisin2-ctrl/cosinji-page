/* 🛏 部屋割り表（v454。表電卓の道具。はじめて開いたときに読む）
   旅館・民宿の予約台帳。横に日付、縦に部屋を並べ、予約を帯で置く。
   ・空いているマスを押すと、その部屋・その日から予約を足す。帯を押すと直す。
   ・「12日から2泊 大人2 子供1 山田様 松」のように打つか 🎤 で話すと、そのまま予約の窓に入る。
   ・下の段に日ごとの 部屋の埋まり・人数・夕食と朝食の数。📋 でその日の到着・出発・食事数の一覧（印刷できる）。
   ・同じ部屋で日が重なる予約は知らせる。入れたものは端末の中（excalc_heya）だけ。 */
(function(){
const HY_KEY='excalc_heya';
const HY_MEALS=['2食','朝食','夕食','素泊'];
const HY_STATUS={tent:'仮', ok:'確定', in:'到着', out:'出発済', cancel:'取消'};
const HY_COLORS=['#1e88e5','#43a047','#e53935','#8e24aa','#fb8c00','#00897b','#6d4c41','#3949ab','#546e7a','#d81b60'];
const HY_WD='日月火水木金土';
let hy=null, hyEdId=null, hyEdNew=null, hyRec=null;

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const dOf=s=>new Date(s+'T00:00');
const addD=(s,n)=>{ const d=dOf(s); d.setDate(d.getDate()+n); return isoOf(d); };
const diffD=(a,b)=>Math.round((dOf(b)-dOf(a))/86400000);
const today=()=>isoOf(new Date());
const isDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const md=s=>(+s.slice(5,7))+'/'+(+s.slice(8,10));
const wd=s=>HY_WD[dOf(s).getDay()];
const hol=s=>{ try{ return typeof tbHolidays==='function' ? (tbHolidays(+s.slice(0,4))[s]||'') : ''; }catch(_){ return ''; } };
const uid=()=>'h'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ── データ ── */
function hyDefault(){
  return {v:1, rooms:['松','竹','梅','桜','楓','椿'].map((n,i)=>({id:'r'+(i+1), name:n, cap:i<2?5:4, note:''})), bookings:[], ui:{start:'', days:14}};
}
function hyClean(o){
  const d=hyDefault();
  if(!o || typeof o!=='object') return d;
  const rooms=Array.isArray(o.rooms) ? o.rooms.filter(r=>r && typeof r.id==='string' && r.name).map(r=>({id:r.id, name:String(r.name).slice(0,20), cap:Math.max(1,Math.min(50,+r.cap||2)), note:String(r.note||'').slice(0,100)})) : d.rooms;
  const ids=new Set(rooms.map(r=>r.id));
  const bookings=Array.isArray(o.bookings) ? o.bookings.filter(b=>b && isDate(b.in)).map(b=>({
    id:typeof b.id==='string'?b.id:uid(), room:ids.has(b.room)?b.room:'', in:b.in, nights:Math.max(1,Math.min(60,Math.round(+b.nights||1))),
    name:String(b.name||'').slice(0,40), tel:String(b.tel||'').slice(0,30), adult:Math.max(0,Math.min(99,+b.adult||0)), child:Math.max(0,Math.min(99,+b.child||0)),
    infant:Math.max(0,Math.min(99,+b.infant||0)), meal:HY_MEALS.includes(b.meal)?b.meal:'2食', status:HY_STATUS[b.status]?b.status:'ok',
    allergy:String(b.allergy||'').slice(0,200), note:String(b.note||'').slice(0,1000), price:Math.max(0,+b.price||0), color:typeof b.color==='string'&&/^#[0-9a-f]{6}$/i.test(b.color)?b.color:'',
    upd:+b.upd||0 })) : [];
  const ui=o.ui&&typeof o.ui==='object'?o.ui:{};
  return {v:1, rooms:rooms.length?rooms:d.rooms, bookings, ui:{start:isDate(ui.start)?ui.start:'', days:[7,14,31].includes(+ui.days)?+ui.days:14}};
}
function hyLoad(){ try{ hy=hyClean(JSON.parse(localStorage.getItem(HY_KEY)||'null')); }catch(_){ hy=hyDefault(); } }
function hySave(){ try{ localStorage.setItem(HY_KEY, JSON.stringify(hy)); }catch(_){ toast('端末の空きが足りず、保存できませんでした'); } }
const hyRoom=id=>hy.rooms.find(r=>r.id===id);
const hyOut=b=>addD(b.in, b.nights);
const hyLive=b=>b.status!=='cancel';
const hyPeople=b=>b.adult+b.child+b.infant;
/* その日に泊まっている予約（到着日〜出発日の前日） */
const hyStaying=(day)=>hy.bookings.filter(b=>hyLive(b) && b.in<=day && day<hyOut(b));
function hyColor(b){ if(b.color) return b.color; let h=0; for(const c of b.id) h=(h*31+c.charCodeAt(0))>>>0; return HY_COLORS[h%HY_COLORS.length]; }
/* 同じ部屋で日が重なる予約 */
function hyClash(b, exceptId){
  if(!b.room) return null;
  const out=hyOut(b);
  return hy.bookings.find(x=>x.id!==exceptId && hyLive(x) && x.room===b.room && x.in<out && b.in<hyOut(x)) || null;
}

/* ── 画面 ── */
const HY_CSS=`
#heyaOverlay .hy-modal{ display:flex; flex-direction:column; --hy-cw:46px; --hy-rw:64px; --hy-rh:44px; --hy-line:rgba(120,132,156,.28); --hy-soft:rgba(120,132,156,.08); }
.hy-bar{ flex:none; display:flex; align-items:center; gap:4px; padding:6px 8px; flex-wrap:wrap; border-bottom:1px solid var(--hy-line); }
.hy-bar b{ font-size:15px; margin:0 4px; white-space:nowrap; }
.hy-nb{ min-width:36px; height:34px; border-radius:8px; border:1px solid var(--hy-line); background:var(--hy-soft); color:var(--text,#333); font-size:14px; font-weight:bold; cursor:pointer; padding:0 8px; }
.hy-sp{ flex:1; }
.hy-seg{ display:inline-flex; border:1px solid var(--hy-line); border-radius:8px; overflow:hidden; }
.hy-seg button{ height:32px; padding:0 9px; border:none; background:transparent; color:var(--text,#333); font-size:13px; font-weight:bold; cursor:pointer; }
.hy-seg button.on{ background:var(--acc); color:#fff; }
.hy-wrap{ flex:1; min-height:0; overflow:auto; position:relative; -webkit-overflow-scrolling:touch; }
.hy-grid{ position:relative; display:grid; grid-template-columns:var(--hy-rw) repeat(var(--hy-n), var(--hy-cw)); min-width:max-content; font-size:12px; }
.hy-h{ position:sticky; top:0; z-index:3; background:var(--modal-bg,#fff); text-align:center; border-bottom:1px solid var(--hy-line); border-left:1px solid var(--hy-line); padding:3px 0; line-height:1.25; }
.hy-h small{ display:block; font-size:10px; color:var(--text-light,#888); }
.hy-h.sun,.hy-h.hol{ color:#d32f2f; } .hy-h.sat{ color:#1565c0; }
.hy-h.today{ background:rgba(33,115,70,.16); font-weight:bold; }
.hy-corner{ position:sticky; left:0; top:0; z-index:5; background:var(--modal-bg,#fff); border-bottom:1px solid var(--hy-line); font-size:11px; color:var(--text-light,#888); display:flex; align-items:center; justify-content:center; }
.hy-rn{ position:sticky; left:0; z-index:2; background:var(--modal-bg,#fff); border-bottom:1px solid var(--hy-line); padding:3px 5px; font-weight:bold; font-size:13px; line-height:1.2; display:flex; flex-direction:column; justify-content:center; box-shadow:1px 0 0 var(--hy-line); overflow:hidden; }
.hy-rn small{ font-weight:normal; font-size:10px; color:var(--text-light,#888); }
.hy-c{ height:var(--hy-rh); border-bottom:1px solid var(--hy-line); border-left:1px solid var(--hy-line); cursor:pointer; }
.hy-c.we{ background:rgba(211,47,47,.04); } .hy-c.today{ background:rgba(33,115,70,.07); }
.hy-c:active{ background:rgba(33,115,70,.18); }
.hy-bk{ position:absolute; z-index:1; height:calc(var(--hy-rh) - 8px); border-radius:7px; color:#fff; font-size:12px; line-height:1.2; padding:3px 6px; box-sizing:border-box;
  overflow:hidden; white-space:nowrap; text-overflow:ellipsis; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.25); }
.hy-bk b{ font-size:12.5px; } .hy-bk small{ display:block; font-size:10.5px; opacity:.92; overflow:hidden; text-overflow:ellipsis; }
.hy-bk.tent{ background-image:repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 6px, transparent 6px 12px); }
.hy-bk.in{ outline:2px solid #ffd54f; }
.hy-bk.clash{ outline:3px solid #d32f2f; }
.hy-foot{ position:sticky; bottom:0; z-index:3; background:var(--modal-bg,#fff); border-top:2px solid var(--hy-line); border-left:1px solid var(--hy-line); text-align:center; font-size:10.5px; line-height:1.35; padding:2px 0; color:var(--text,#333); }
.hy-foot b{ font-size:12px; } .hy-foot.full b{ color:#d32f2f; }
.hy-footh{ position:sticky; left:0; bottom:0; z-index:5; background:var(--modal-bg,#fff); border-top:2px solid var(--hy-line); font-size:10px; line-height:1.35; padding:2px 4px; color:var(--text-light,#888); }
.hy-add{ flex:none; display:flex; gap:6px; align-items:center; padding:6px 8px calc(6px + var(--safe-bottom,0px)); border-top:1px solid var(--hy-line); }
.hy-add input{ flex:1; min-width:0; height:40px; border-radius:20px; border:1px solid var(--hy-line); padding:0 14px; font-size:16px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.hy-mic{ flex:none; width:42px; height:40px; border-radius:50%; border:none; background:var(--acc); color:#fff; font-size:18px; cursor:pointer; }
.hy-mic.on{ background:#d32f2f; animation:hyPulse 1s infinite; }
@keyframes hyPulse{ 50%{ opacity:.6; } }
.hy-body{ padding:10px 12px calc(16px + var(--safe-bottom,0px)); overflow:auto; }
.hy-f{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:7px 0; }
.hy-f input,.hy-f select,.hy-f textarea{ display:block; width:100%; box-sizing:border-box; margin-top:4px; min-height:40px; padding:6px 10px; font-size:16px;
  border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
.hy-f textarea{ min-height:56px; resize:vertical; }
.hy-row{ display:flex; gap:8px; } .hy-row > *{ flex:1; min-width:0; }
.hy-btn{ display:block; width:100%; height:44px; margin:8px 0 0; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; }
.hy-btn.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.hy-btn.del{ background:transparent; color:#d32f2f; border:1px solid rgba(211,47,47,.45); }
.hy-warn{ background:#ffebee; color:#b71c1c; border-radius:8px; padding:8px 10px; font-size:13px; margin:6px 0; }
body.dark .hy-warn{ background:#4a2020; color:#ffb4ab; }
.hy-sum{ font-size:13px; color:var(--text,#333); margin:4px 0 2px; }
.hy-sec{ font-size:14px; font-weight:bold; margin:14px 0 6px; padding:4px 8px; border-radius:6px; background:rgba(33,115,70,.10); }
.hy-li{ border-bottom:1px dashed var(--hy-line); padding:7px 2px; font-size:13.5px; line-height:1.5; cursor:pointer; overflow-wrap:anywhere; }
.hy-li b{ font-size:14px; } .hy-li small{ color:var(--text-light,#888); }
.hy-li .al{ color:#d32f2f; font-weight:bold; }
.hy-cnt{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin:6px 0; }
.hy-cnt div{ background:rgba(33,115,70,.10); border-radius:8px; padding:6px 2px; text-align:center; font-size:11px; color:var(--text-light,#888); }
.hy-cnt b{ display:block; font-size:18px; color:var(--acc-text,#217346); }
body.dark .hy-cnt b{ color:#8fd4ab; }
.hy-rrow{ display:flex; gap:6px; align-items:center; margin:5px 0; }
.hy-rrow input{ min-width:0; height:38px; padding:0 8px; font-size:15px; border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.hy-rrow input.n{ flex:1; } .hy-rrow input.c{ width:56px; flex:none; }
.hy-rrow button{ flex:none; width:36px; height:36px; border-radius:8px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#333); cursor:pointer; }
.hy-note{ font-size:12px; color:var(--text-light,#888); line-height:1.6; margin:6px 0; }
.hy-cols{ display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
.hy-cols button{ width:30px; height:30px; border-radius:50%; border:2px solid transparent; cursor:pointer; }
.hy-cols button.on{ border-color:var(--text,#333); }
#printArea .hy-pdoc{ font-size:12px; color:#000; }
#printArea .hy-pdoc h2{ font-size:18px; margin:0 0 6px; }
#printArea .hy-pdoc h3{ font-size:14px; margin:12px 0 4px; border-bottom:1px solid #999; }
#printArea .hy-pdoc table{ width:100%; border-collapse:collapse; }
#printArea .hy-pdoc th,#printArea .hy-pdoc td{ border:1px solid #999; padding:3px 5px; text-align:left; vertical-align:top; }
#printArea .hy-pdoc th{ background:#f0f0f0; }
#printArea .hy-pdoc .al{ color:#c00; font-weight:bold; }
`;
function hyEnsureDom(){
  if($('heyaOverlay')) return;
  const st=document.createElement('style'); st.id='hyStyle'; st.textContent=HY_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="heyaOverlay">
  <div class="modal vol-modal hy-modal">
    <div class="modal-header"><span>🛏 部屋割り表</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="hdr-btn" onclick="hyFind()" title="名前でさがす" aria-label="名前でさがす">🔍</button>
      <button class="hdr-btn" onclick="hyOpenDay()" title="その日の一覧" aria-label="その日の一覧">📋 一覧</button>
      <button class="hdr-btn" onclick="hyOpenSet()" title="部屋と設定">⚙ 設定</button>
      <button class="modal-close" onclick="closeHeya()" aria-label="閉じる">✕</button></span></div>
    <div class="hy-bar">
      <button class="hy-nb" onclick="hyMove(-1)" aria-label="前へ">◀</button><b id="hyTitle"></b><button class="hy-nb" onclick="hyMove(1)" aria-label="次へ">▶</button>
      <button class="hy-nb" onclick="hyGoToday()">今日</button><span class="hy-sp"></span>
      <span class="hy-seg" id="hyDaysSeg">${[7,14,31].map(n=>`<button data-n="${n}" onclick="hySetDays(${n})">${n===31?'1か月':n+'日'}</button>`).join('')}</span>
    </div>
    <div class="hy-wrap" id="hyWrap"><div class="hy-grid" id="hyGrid"></div></div>
    <form class="hy-add" onsubmit="event.preventDefault(); hyQuick();">
      <button type="button" class="hy-mic" id="hyMic" onclick="hyListen()" aria-label="声で入れる">🎤</button>
      <input id="hyAddIn" placeholder="例：12日から2泊 大人2 子供1 山田様 松" autocomplete="off" enterkeyhint="done">
      <button type="submit" class="hy-mic" aria-label="予約を足す" style="background:transparent;color:var(--acc);border:1.5px solid var(--acc);font-weight:bold;font-size:20px">＋</button>
    </form>
  </div>
</div>
<div class="modal-overlay" id="hyEdOverlay" onclick="if(event.target===this)hyCloseEd()">
  <div class="modal"><div class="modal-header"><span id="hyEdHdr">予約</span><button class="modal-close" onclick="hyCloseEd()" aria-label="閉じる">✕</button></div>
    <div class="hy-body" id="hyEdBody"></div></div>
</div>
<div class="modal-overlay" id="hyDayOverlay" onclick="if(event.target===this)hyCloseDay()">
  <div class="modal"><div class="modal-header"><span>📋 その日の一覧</span><button class="modal-close" onclick="hyCloseDay()" aria-label="閉じる">✕</button></div>
    <div class="hy-body" id="hyDayBody"></div></div>
</div>
<div class="modal-overlay" id="hySetOverlay" onclick="if(event.target===this)hyCloseSet()">
  <div class="modal"><div class="modal-header"><span>⚙ 部屋と設定</span><button class="modal-close" onclick="hyCloseSet()" aria-label="閉じる">✕</button></div>
    <div class="hy-body" id="hySetBody"></div></div>
</div>
<input type="file" id="hyFileIn" accept=".json,application/json" hidden onchange="hyImport(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
  $('hyAddIn').addEventListener('keydown', e=>{ if(e.key==='Enter' && e.isComposing) e.stopPropagation(); });
}

/* ── 開く・閉じる ── */
function openHeya(){
  hyEnsureDom(); hyLoad();
  if(!isDate(hy.ui.start)) hy.ui.start=addD(today(), -1);
  openDlg('heyaOverlay', ()=>hyStopListen());
  hyRender();
  setTimeout(hyScrollToday, 30);
}
function closeHeya(){
  if(!isDlgOpen('heyaOverlay')) return;
  hyCloseEd(); hyCloseDay(); hyCloseSet();
  closeDlg('heyaOverlay', ()=>hyStopListen());
}
function hyMove(dir){ hy.ui.start=addD(hy.ui.start, dir*(hy.ui.days===31?28:hy.ui.days===14?7:7)); hySave(); hyRender(); }
function hyGoToday(){ hy.ui.start=addD(today(), -1); hySave(); hyRender(); }
function hySetDays(n){ hy.ui.days=n; hySave(); hyRender(); }
function hyScrollToday(){ const w=$('hyWrap'); if(w) w.scrollLeft=0; }

/* 表を描く */
function hyRender(){
  const start=hy.ui.start, n=hy.ui.days, t=today();
  const days=Array.from({length:n},(_,i)=>addD(start,i)), end=addD(start,n);
  $('hyTitle').textContent=md(start)+'〜'+md(addD(end,-1));
  document.querySelectorAll('#hyDaysSeg button').forEach(b=>b.classList.toggle('on', +b.dataset.n===n));
  const g=$('hyGrid'); g.style.setProperty('--hy-n', n);
  // 日数が少ないときは、画面の幅いっぱいに列を広げる（1列 46px より狭くはしない）
  const mod=g.closest('.hy-modal'), ww=($('hyWrap').clientWidth||360)-64-2;
  mod.style.setProperty('--hy-cw', Math.max(46, Math.floor(ww/n))+'px');
  const cls=d=>{ const w=dOf(d).getDay(), h=hol(d); return (h||w===0?' sun':w===6?' sat':'')+(h?' hol':'')+(d===t?' today':''); };
  let h='<div class="hy-corner">部屋</div>'+days.map(d=>`<div class="hy-h${cls(d)}" title="${esc(hol(d))}">${+d.slice(8,10)===1||d===start?(+d.slice(5,7))+'/':''}${+d.slice(8,10)}<small>${wd(d)}${hol(d)?'祝':''}</small></div>`).join('');
  hy.rooms.forEach((r,ri)=>{
    h+=`<div class="hy-rn" style="grid-row:${ri+2}">${esc(r.name)}<small>${r.cap}人</small></div>`;
    h+=days.map((d,di)=>{ const w=dOf(d).getDay(); return `<div class="hy-c${w===0||w===6||hol(d)?' we':''}${d===t?' today':''}" style="grid-row:${ri+2};grid-column:${di+2}" data-r="${r.id}" data-d="${d}" onclick="hyNewAt('${r.id}','${d}')"></div>`; }).join('');
  });
  // 下の段：埋まった部屋・人数・夕食と朝食の数
  const fr=hy.rooms.length+2;
  h+=`<div class="hy-footh" style="grid-row:${fr}">部屋<br>人数<br>夕/朝</div>`;
  days.forEach((d,di)=>{
    const st=hyStaying(d).filter(b=>b.room), rooms=new Set(st.map(b=>b.room)).size, ppl=st.reduce((s,b)=>s+hyPeople(b),0);
    const din=st.filter(b=>b.meal==='2食'||b.meal==='夕食').reduce((s,b)=>s+b.adult+b.child,0);
    const brk=hy.bookings.filter(b=>hyLive(b) && b.room && (b.meal==='2食'||b.meal==='朝食') && b.in<d && d<=hyOut(b)).reduce((s,b)=>s+b.adult+b.child,0);
    h+=`<div class="hy-foot${rooms>=hy.rooms.length?' full':''}" style="grid-row:${fr};grid-column:${di+2}"><b>${rooms}/${hy.rooms.length}</b><br>${ppl}<br>${din}/${brk}</div>`;
  });
  g.innerHTML=h;
  // 予約の帯（部屋の行に、到着日から泊数ぶん）
  const cw=parseFloat(getComputedStyle(g.closest('.hy-modal')).getPropertyValue('--hy-cw'))||46;
  const rw=parseFloat(getComputedStyle(g.closest('.hy-modal')).getPropertyValue('--hy-rw'))||64;
  const head=g.querySelector('.hy-h'), hh=head?head.offsetHeight:30;
  const rowH=(g.querySelector('.hy-c')||{}).offsetHeight||44;
  hy.bookings.filter(b=>hyLive(b) && b.room && b.in<end && start<hyOut(b)).forEach(b=>{
    const ri=hy.rooms.findIndex(r=>r.id===b.room); if(ri<0) return;
    const s=Math.max(0, diffD(start,b.in)), e=Math.min(n, diffD(start,hyOut(b)));
    const el=document.createElement('div');
    el.className='hy-bk'+(b.status==='tent'?' tent':'')+(b.status==='in'?' in':'')+(hyClash(b,b.id)?' clash':'');
    el.style.cssText=`left:${rw+s*cw+3}px;top:${hh+ri*rowH+4}px;width:${(e-s)*cw-6}px;background-color:${hyColor(b)}`;
    el.innerHTML=`<b>${esc(b.name||'（名前なし）')}</b> ${hyPeople(b)}名<small>${b.nights}泊・${esc(b.meal)}${b.status==='tent'?'・仮':''}${b.allergy?'・⚠':''}</small>`;
    el.title=b.name+' '+md(b.in)+'〜'+md(hyOut(b));
    el.onclick=e=>{ e.stopPropagation(); hyEdit(b.id); };
    g.appendChild(el);
  });
}

/* ── 予約の窓 ── */
function hyNewAt(room, day){ hyEdit(null, {room, in:day}); }
function hyEdit(id, preset){
  const b=id ? hy.bookings.find(x=>x.id===id) : Object.assign({id:'', room:'', in:today(), nights:1, name:'', tel:'', adult:2, child:0, infant:0, meal:'2食', status:'ok', allergy:'', note:'', price:0, color:''}, preset||{});
  if(!b) return;
  hyEdId=id; hyEdNew=id?null:b;
  $('hyEdHdr').textContent=id?'予約を直す':'予約を足す';
  $('hyEdBody').innerHTML=`
    <label class="hy-f">お名前<input id="hyEName" maxlength="40" value="${esc(b.name)}" placeholder="例：山田様・〇〇会社"></label>
    <div class="hy-row"><label class="hy-f">到着日<input type="date" id="hyEIn" value="${esc(b.in)}" oninput="hyEdCheck()"></label>
      <label class="hy-f">泊数<input type="number" inputmode="numeric" id="hyENights" min="1" max="60" value="${b.nights}" oninput="hyEdCheck()"></label></div>
    <div class="hy-sum" id="hyEOut"></div>
    <label class="hy-f">部屋<select id="hyERoom" onchange="hyEdCheck()"><option value="">（まだ決めない）</option>${hy.rooms.map(r=>`<option value="${r.id}"${r.id===b.room?' selected':''}>${esc(r.name)}（${r.cap}人）</option>`).join('')}</select></label>
    <div id="hyEWarn"></div>
    <div class="hy-row"><label class="hy-f">大人<input type="number" inputmode="numeric" id="hyEAd" min="0" value="${b.adult}" oninput="hyEdCheck()"></label>
      <label class="hy-f">子ども<input type="number" inputmode="numeric" id="hyECh" min="0" value="${b.child}" oninput="hyEdCheck()"></label>
      <label class="hy-f">幼児<input type="number" inputmode="numeric" id="hyEIf" min="0" value="${b.infant}" oninput="hyEdCheck()"></label></div>
    <div class="hy-row"><label class="hy-f">食事<select id="hyEMeal">${HY_MEALS.map(m=>`<option${m===b.meal?' selected':''}>${m}</option>`).join('')}</select></label>
      <label class="hy-f">状態<select id="hyEStat">${Object.entries(HY_STATUS).map(([k,l])=>`<option value="${k}"${k===b.status?' selected':''}>${l}</option>`).join('')}</select></label></div>
    <div class="hy-row"><label class="hy-f">電話<input type="tel" id="hyETel" maxlength="30" value="${esc(b.tel)}"></label>
      <label class="hy-f">料金（合計・円）<input type="number" inputmode="numeric" id="hyEPrice" min="0" value="${b.price||''}"></label></div>
    <label class="hy-f">アレルギー・苦手なもの<input id="hyEAl" maxlength="200" value="${esc(b.allergy)}" placeholder="例：そば・えび（子ども）"></label>
    <label class="hy-f">メモ<textarea id="hyENote" maxlength="1000" placeholder="到着時刻・送迎・記念日・スキー持ち込み など">${esc(b.note)}</textarea></label>
    <label class="hy-f">帯の色<div class="hy-cols" id="hyECols">${['',...HY_COLORS].map(c=>`<button type="button" data-c="${c}" class="${(b.color||'')===c?'on':''}" style="background:${c||'conic-gradient(#1e88e5,#43a047,#e53935,#fb8c00,#1e88e5)'}" onclick="document.querySelectorAll('#hyECols button').forEach(x=>x.classList.toggle('on',x===this))" aria-label="${c||'自動'}"></button>`).join('')}</div></label>
    <button class="hy-btn" onclick="hyEdSave()">保存する</button>
    ${id?`<button class="hy-btn sub" onclick="hyEdCopy()">📄 この予約を写して足す</button><button class="hy-btn del" onclick="hyEdDelete()">🗑 消す</button>`:''}
    <button class="hy-btn sub" onclick="hyCloseEd()">やめる</button>`;
  openDlg('hyEdOverlay', ()=>{ hyEdId=null; hyEdNew=null; });
  hyEdCheck();
  if(!id && !b.name) setTimeout(()=>{ const e=$('hyEName'); if(e) e.focus(); }, 60);
}
function hyEdRead(){
  const col=(document.querySelector('#hyECols button.on')||{}).dataset;
  return { id:hyEdId||uid(), name:$('hyEName').value.trim(), in:$('hyEIn').value, nights:Math.max(1,Math.round(+$('hyENights').value||1)), room:$('hyERoom').value,
    adult:Math.max(0,+$('hyEAd').value||0), child:Math.max(0,+$('hyECh').value||0), infant:Math.max(0,+$('hyEIf').value||0), meal:$('hyEMeal').value, status:$('hyEStat').value,
    tel:$('hyETel').value.trim(), price:Math.max(0,+$('hyEPrice').value||0), allergy:$('hyEAl').value.trim(), note:$('hyENote').value, color:col?col.c||'':'', upd:Date.now() };
}
/* 出発日・重なり・定員を見せる */
function hyEdCheck(){
  const b=hyEdRead(); if(!isDate(b.in)){ $('hyEOut').textContent=''; return; }
  $('hyEOut').textContent='出発 '+md(hyOut(b))+'（'+wd(hyOut(b))+'）・'+b.nights+'泊';
  const w=[]; const c=hyClash(b, hyEdId);
  if(c) w.push('同じ部屋に「'+(c.name||'名前なし')+'」（'+md(c.in)+'〜'+md(hyOut(c))+'）の予約があります');
  const r=hyRoom(b.room); if(r && b.adult+b.child>r.cap) w.push('「'+r.name+'」の定員（'+r.cap+'人）をこえています');
  $('hyEWarn').innerHTML=w.map(x=>`<div class="hy-warn">⚠ ${esc(x)}</div>`).join('');
}
async function hyEdSave(){
  const b=hyEdRead();
  if(!isDate(b.in)){ toast('到着日を入れてください'); return; }
  if(!b.name){ toast('お名前を入れてください'); $('hyEName').focus(); return; }
  const c=hyClash(b, hyEdId);
  if(c && b.status!=='cancel' && !await appConfirm('同じ部屋に「'+(c.name||'名前なし')+'」（'+md(c.in)+'〜'+md(hyOut(c))+'）の予約があります。\nこのまま保存しますか？（表では赤い枠で知らせます）','保存する','やめる')) return;
  const clean=hyClean({rooms:hy.rooms, bookings:[b]}).bookings[0];
  const i=hy.bookings.findIndex(x=>x.id===clean.id);
  if(i>=0) hy.bookings[i]=clean; else hy.bookings.push(clean);
  hySave(); hyCloseEd(); hyRender(); toast(i>=0?'直しました':'予約を足しました');
}
function hyEdCopy(){ const b=hyEdRead(); hyCloseEd(); setTimeout(()=>hyEdit(null, Object.assign(b,{id:'', room:'', status:'ok'})), 60); }
async function hyEdDelete(){
  const b=hy.bookings.find(x=>x.id===hyEdId); if(!b) return;
  if(!await appConfirm('「'+(b.name||'この予約')+'」の予約を消しますか？\n（取消として残すときは「状態」を「取消」にしてください）','消す','やめる')) return;
  hy.bookings=hy.bookings.filter(x=>x.id!==b.id); hySave(); hyCloseEd(); hyRender(); toast('消しました');
}
function hyCloseEd(){ closeDlg('hyEdOverlay', ()=>{ hyEdId=null; hyEdNew=null; }); }

/* ── 文・声で入れる ──
   「12日から2泊 大人2 子供1 山田様 松」「明日 1泊 3人 佐藤 2食」「3月5日〜7日 鈴木様 4名 素泊」など。
   読めたところを予約の窓に入れて見せる（その場で確かめて保存する） */
function hyParse(text){
  let s=String(text||'').normalize('NFKC').replace(/[、,]/g,' ').trim();
  const kan={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
  s=s.replace(/([一二三四五六七八九十])(泊|人|名)/g,(m,k,u)=>kan[k]+u);
  const t=today(), o={};
  const base=dOf(t); let m;
  const mkDate=(mo,d)=>{ let y=base.getFullYear(); const dt=new Date(y,mo-1,d); if(isoOf(dt)<addD(t,-60)) dt.setFullYear(y+1); return isoOf(dt); };
  if((m=s.match(/(\d{1,2})月(\d{1,2})日?(?:から|〜|~|-)(?:(\d{1,2})月)?(\d{1,2})日/))){ o.in=mkDate(+m[1],+m[2]); const out=mkDate(m[3]?+m[3]:+m[1],+m[4]); o.nights=Math.max(1,diffD(o.in,out)); s=s.replace(m[0],' '); }
  else if((m=s.match(/(\d{1,2})\/(\d{1,2})/)) || (m=s.match(/(\d{1,2})月(\d{1,2})日?/))){ o.in=mkDate(+m[1],+m[2]); s=s.replace(m[0],' '); }
  else if((m=s.match(/(\d{1,2})日/))){ let d=new Date(base.getFullYear(), base.getMonth(), +m[1]); if(isoOf(d)<t) d.setMonth(d.getMonth()+1); o.in=isoOf(d); s=s.replace(m[0],' '); }
  else if(/明後日|あさって/.test(s)){ o.in=addD(t,2); s=s.replace(/明後日|あさって/,' '); }
  else if(/明日|あした/.test(s)){ o.in=addD(t,1); s=s.replace(/明日|あした/,' '); }
  else if(/今日|本日/.test(s)){ o.in=t; s=s.replace(/今日|本日/,' '); }
  s=s.replace(/から|より/g,' ');
  if((m=s.match(/(\d{1,2})泊/))){ o.nights=+m[1]; s=s.replace(m[0],' '); }
  if((m=s.match(/(?:大人|おとな)\s*(\d{1,2})(?:人|名)?/))){ o.adult=+m[1]; s=s.replace(m[0],' '); }
  if((m=s.match(/(?:子供|子ども|こども|小人)\s*(\d{1,2})(?:人|名)?/))){ o.child=+m[1]; s=s.replace(m[0],' '); }
  if((m=s.match(/(?:幼児|乳児|赤ちゃん)\s*(\d{1,2})(?:人|名)?/))){ o.infant=+m[1]; s=s.replace(m[0],' '); }
  if(o.adult==null && (m=s.match(/(\d{1,2})\s*(?:人|名)/))){ o.adult=+m[1]; s=s.replace(m[0],' '); }
  for(const ml of ['素泊まり','素泊','2食','二食','朝食のみ','朝食','夕食のみ','夕食']){ if(s.includes(ml)){ o.meal=ml.startsWith('素')?'素泊':ml.startsWith('朝')?'朝食':ml.startsWith('夕')?'夕食':'2食'; s=s.replace(ml,' '); break; } }
  if(/仮/.test(s)){ o.status='tent'; s=s.replace(/仮(予約)?/,' '); }
  // 部屋の名前（長い名前から）
  const rs=hy.rooms.slice().sort((a,b)=>b.name.length-a.name.length);
  for(const r of rs){ const re=new RegExp('(^|\\s)'+r.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(の間|号室|部屋)?(\\s|$)'); if(re.test(s)){ o.room=r.id; s=s.replace(re,' '); break; } }
  if(!o.room){ for(const r of rs){ const re=new RegExp(r.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(の間|号室)'); if(re.test(s)){ o.room=r.id; s=s.replace(re,' '); break; } } }
  // 名前：「〜様」「〜さん」を優先、なければ残った言葉
  if((m=s.match(/(\S+?)\s*(様|さま|さん)/))){ o.name=m[1]+'様'; s=s.replace(m[0],' '); }
  const rest=s.replace(/\s+/g,' ').trim();
  if(!o.name && rest) o.name=rest; else if(rest) o.note=rest;
  return o;
}
function hyQuick(){
  const inp=$('hyAddIn'), t=inp.value.trim(); if(!t){ hyEdit(null); return; }
  const o=hyParse(t); inp.value='';
  hyEdit(null, o);
  toast('読み取った内容を入れました。たしかめて「保存する」を押してください', 3200);
}
function hyListen(){
  const Rec=typeof speechRecCtor==='function' ? speechRecCtor() : (window.SpeechRecognition||window.webkitSpeechRecognition);
  if(!Rec){ toast('この端末では声で入れられません。下の欄に打ってください'); return; }
  if(hyRec){ hyStopListen(); return; }
  const r=new Rec(); r.lang='ja-JP'; r.interimResults=true; r.continuous=false; hyRec=r;
  $('hyMic').classList.add('on');
  let last='';
  r.onresult=e=>{ last=Array.from(e.results).map(x=>x[0].transcript).join(''); $('hyAddIn').value=last; };
  r.onerror=()=>{};
  r.onend=()=>{ hyRec=null; const m=$('hyMic'); if(m) m.classList.remove('on'); if(last) hyQuick(); };
  try{ r.start(); }catch(_){ hyStopListen(); }
}
function hyStopListen(){ if(hyRec){ try{ hyRec.stop(); }catch(_){} } hyRec=null; const m=$('hyMic'); if(m) m.classList.remove('on'); }

/* ── その日の一覧（到着・出発・滞在・食事数） ── */
let hyDay='';
function hyOpenDay(day){
  hyDay=isDate(day)?day:today();
  hyRenderDay(); openDlg('hyDayOverlay');
}
function hyDayData(d){
  const live=hy.bookings.filter(hyLive);
  const arr=live.filter(b=>b.in===d), dep=live.filter(b=>hyOut(b)===d), stay=live.filter(b=>b.in<d && d<hyOut(b));
  const night=live.filter(b=>b.in<=d && d<hyOut(b));
  const cnt=(list,meals)=>list.filter(b=>meals.includes(b.meal)).reduce((a,b)=>({ad:a.ad+b.adult, ch:a.ch+b.child, inf:a.inf+b.infant}),{ad:0,ch:0,inf:0});
  const dinner=cnt(night,['2食','夕食']);
  const breakfast=cnt(live.filter(b=>b.in<d && d<=hyOut(b)),['2食','朝食']);
  const used=new Set(night.filter(b=>b.room).map(b=>b.room));
  const free=hy.rooms.filter(r=>!used.has(r.id));
  const allergy=live.filter(b=>b.allergy && b.in<=d && d<=hyOut(b));
  return {arr, dep, stay, night, dinner, breakfast, free, allergy, ppl:night.reduce((s,b)=>s+hyPeople(b),0), noRoom:night.filter(b=>!b.room)};
}
function hyRenderDay(){
  const d=hyDay, x=hyDayData(d);
  const rn=b=>b.room?esc((hyRoom(b.room)||{}).name||''):'<span class="al">部屋未定</span>';
  const li=(b,extra)=>`<div class="hy-li" onclick="hyCloseDay(); setTimeout(()=>hyEdit('${b.id}'),60)"><b>${rn(b)}</b>　${esc(b.name)}　${hyPeople(b)}名（大${b.adult}・子${b.child}${b.infant?'・幼'+b.infant:''}）・${esc(b.meal)}${b.status==='tent'?'・<span class="al">仮</span>':''}<br><small>${extra||''}${b.tel?' ☎'+esc(b.tel):''}${b.note?' ・'+esc(b.note.split('\n')[0]):''}</small>${b.allergy?`<div class="al">⚠ ${esc(b.allergy)}</div>`:''}</div>`;
  $('hyDayBody').innerHTML=`
    <div class="hy-row" style="align-items:center"><button class="hy-nb" style="flex:none" onclick="hyDay=hyAddD(hyDay,-1);hyRenderDay()">◀</button>
      <input type="date" value="${d}" onchange="if(this.value){hyDay=this.value;hyRenderDay()}" style="height:36px;font-size:16px;border-radius:8px;border:1px solid rgba(120,132,156,.45);padding:0 8px;background:var(--modal-bg,#fff);color:var(--text,#222)">
      <button class="hy-nb" style="flex:none" onclick="hyDay=hyAddD(hyDay,1);hyRenderDay()">▶</button></div>
    <div class="hy-sum"><b>${md(d)}（${wd(d)}）${esc(hol(d))}</b>　泊まり ${x.night.length}組 ${x.ppl}名・空き部屋 ${x.free.length}/${hy.rooms.length}</div>
    <div class="hy-cnt"><div><b>${x.dinner.ad}</b>夕食 大人</div><div><b>${x.dinner.ch}</b>夕食 子ども</div><div><b>${x.breakfast.ad}</b>朝食 大人</div><div><b>${x.breakfast.ch}</b>朝食 子ども</div></div>
    ${x.allergy.length?`<div class="hy-warn">⚠ アレルギー・苦手なもの：${x.allergy.map(b=>esc(rn(b).replace(/<[^>]+>/g,''))+' '+esc(b.name)+'（'+esc(b.allergy)+'）').join('、')}</div>`:''}
    ${x.noRoom.length?`<div class="hy-warn">部屋が決まっていない予約が ${x.noRoom.length}件あります</div>`:''}
    <div class="hy-sec">🛬 到着 ${x.arr.length}組</div>${x.arr.map(b=>li(b, b.nights+'泊（出発 '+md(hyOut(b))+'）')).join('')||'<div class="hy-note">ありません</div>'}
    <div class="hy-sec">🛫 出発 ${x.dep.length}組</div>${x.dep.map(b=>li(b, md(b.in)+'から '+b.nights+'泊'+(b.price?' ・ '+b.price.toLocaleString()+'円':''))).join('')||'<div class="hy-note">ありません</div>'}
    <div class="hy-sec">🛏 連泊中 ${x.stay.length}組</div>${x.stay.map(b=>li(b, md(b.in)+'〜'+md(hyOut(b)))).join('')||'<div class="hy-note">ありません</div>'}
    <div class="hy-sec">空き部屋</div><div class="hy-note" style="font-size:14px;color:var(--text,#333)">${x.free.map(r=>esc(r.name)+'（'+r.cap+'人）').join('、')||'満室'}</div>
    <button class="hy-btn" onclick="hyPrintDay()">🖨 この日の一覧を印刷・PDF</button>`;
}
function hyPrintDay(){
  if(typeof opBuild!=='function'){ window.print(); return; }
  const d=hyDay, x=hyDayData(d);
  const rn=b=>b.room?esc((hyRoom(b.room)||{}).name||''):'未定';
  const rows=list=>list.length?`<table><tr><th>部屋</th><th>お名前</th><th>人数</th><th>食事</th><th>泊</th><th>アレルギー・メモ</th></tr>${list.map(b=>`<tr><td>${rn(b)}</td><td>${esc(b.name)}${b.status==='tent'?'（仮）':''}</td><td>大${b.adult} 子${b.child}${b.infant?' 幼'+b.infant:''}</td><td>${esc(b.meal)}</td><td>${md(b.in)}〜${md(hyOut(b))}</td><td>${b.allergy?`<span class="al">⚠${esc(b.allergy)}</span> `:''}${esc(b.note)}</td></tr>`).join('')}</table>`:'<p>ありません</p>';
  const html=`<div class="hy-pdoc"><h2>${md(d)}（${wd(d)}）${esc(hol(d))} の一覧</h2>
    <p>泊まり ${x.night.length}組 ${x.ppl}名 ／ 夕食 大人${x.dinner.ad}・子ども${x.dinner.ch} ／ 朝食 大人${x.breakfast.ad}・子ども${x.breakfast.ch} ／ 空き部屋 ${x.free.map(r=>esc(r.name)).join('・')||'満室'}</p>
    <h3>到着</h3>${rows(x.arr)}<h3>出発</h3>${rows(x.dep)}<h3>連泊中</h3>${rows(x.stay)}</div>`;
  opPrint(opBuild(html, true));
}
function hyCloseDay(){ closeDlg('hyDayOverlay'); }

/* ── 名前でさがす ── */
function hyFind(){
  const q=prompt('お名前・電話・メモでさがす'); if(!q) return;
  const k=q.normalize('NFKC').toLowerCase();
  const hit=hy.bookings.filter(b=>[b.name,b.tel,b.note].some(v=>String(v||'').normalize('NFKC').toLowerCase().includes(k))).sort((a,b)=>a.in<b.in?1:-1);
  if(!hit.length){ toast('見つかりません'); return; }
  $('hyDayBody').innerHTML=`<div class="hy-sec">🔍「${esc(q)}」 ${hit.length}件</div>`+hit.map(b=>`<div class="hy-li" onclick="hyCloseDay(); hyJump('${b.in}'); setTimeout(()=>hyEdit('${b.id}'),80)"><b>${md(b.in)}〜${md(hyOut(b))}</b>　${esc(b.name)}　${hyPeople(b)}名・${b.room?esc((hyRoom(b.room)||{}).name):'部屋未定'}・${HY_STATUS[b.status]}</div>`).join('');
  openDlg('hyDayOverlay');
}
function hyJump(day){ hy.ui.start=addD(day,-1); hySave(); hyRender(); }

/* ── 部屋と設定 ── */
function hyOpenSet(){ hyRenderSet(); openDlg('hySetOverlay'); }
function hyRenderSet(){
  $('hySetBody').innerHTML=`
    <div class="hy-sec">部屋（上から順に表に並びます）</div>
    <div class="hy-note">名前と定員を変えられます。部屋を消すと、その部屋の予約は「部屋未定」になります。</div>
    ${hy.rooms.map((r,i)=>`<div class="hy-rrow"><input class="n" value="${esc(r.name)}" maxlength="20" aria-label="部屋の名前" onchange="hyRoomSet('${r.id}','name',this.value)">
      <input class="c" type="number" inputmode="numeric" min="1" max="50" value="${r.cap}" aria-label="定員" onchange="hyRoomSet('${r.id}','cap',this.value)"><span style="font-size:12px">人</span>
      <button onclick="hyRoomMove('${r.id}',-1)" ${i===0?'disabled':''} aria-label="上へ">↑</button><button onclick="hyRoomMove('${r.id}',1)" ${i===hy.rooms.length-1?'disabled':''} aria-label="下へ">↓</button>
      <button onclick="hyRoomDel('${r.id}')" aria-label="${esc(r.name)}を消す">🗑</button></div>`).join('')}
    <button class="hy-btn sub" onclick="hyRoomAdd()">＋ 部屋を足す</button>
    <div class="hy-sec">書き出す・読み込む</div>
    <button class="hy-btn sub" onclick="hyCsv()">📄 予約を CSV で（Excel で開けます）</button>
    <button class="hy-btn sub" onclick="hyExport()">⬇ 部屋割り表を書き出す（.json）</button>
    <button class="hy-btn sub" onclick="document.getElementById('hyFileIn').click()">⬆ 読み込む（いまの中身と置きかえ）</button>
    <div class="hy-note">入れたものはこの端末の中だけに残ります。📋リストの ⬇書き出し（全体のバックアップ）にも入ります。ほかの端末と同じ表を使うときは、書き出したファイルを読み込んでください。</div>
    <div class="hy-sec">使いかた</div>
    <div class="hy-note">・空いているマスを押すと、その部屋・その日から予約を足せます。帯を押すと直せます。<br>
      ・下の欄に「<b>12日から2泊 大人2 子供1 山田様 松</b>」「<b>明日 1泊 3人 佐藤様 素泊</b>」のように打つか 🎤 で話すと、読み取って予約の窓に入れます。<br>
      ・帯のしましまは<b>仮予約</b>、黄色いふちは<b>到着済み</b>、赤いふちは<b>同じ部屋で日が重なっている</b>予約です。⚠ はアレルギーあり。<br>
      ・下の段は日ごとの <b>埋まった部屋／全部屋・泊まる人数・夕食／朝食の数</b>（大人＋子ども）です。<br>
      ・📋 で、その日の到着・出発・連泊・食事の数・アレルギーをまとめて見て、印刷できます。</div>`;
}
function hyRoomSet(id, k, v){
  const r=hyRoom(id); if(!r) return;
  if(k==='name'){ v=String(v).trim().slice(0,20); if(!v){ toast('名前を入れてください'); hyRenderSet(); return; } r.name=v; }
  if(k==='cap') r.cap=Math.max(1,Math.min(50,Math.round(+v||1)));
  hySave(); hyRender();
}
function hyRoomMove(id, dir){ const i=hy.rooms.findIndex(r=>r.id===id), j=i+dir; if(i<0||j<0||j>=hy.rooms.length) return; [hy.rooms[i],hy.rooms[j]]=[hy.rooms[j],hy.rooms[i]]; hySave(); hyRenderSet(); hyRender(); }
function hyRoomAdd(){ const n=hy.rooms.length+1; hy.rooms.push({id:uid(), name:'部屋'+n, cap:4, note:''}); hySave(); hyRenderSet(); hyRender(); }
async function hyRoomDel(id){
  const r=hyRoom(id); if(!r) return;
  if(hy.rooms.length<=1){ toast('部屋はひとつは残してください'); return; }
  const n=hy.bookings.filter(b=>b.room===id && hyLive(b) && hyOut(b)>=today()).length;
  if(!await appConfirm('「'+r.name+'」を消しますか？'+(n?'\nこれからの予約 '+n+'件は「部屋未定」になります':''),'消す','やめる')) return;
  hy.rooms=hy.rooms.filter(x=>x.id!==id); hy.bookings.forEach(b=>{ if(b.room===id) b.room=''; });
  hySave(); hyRenderSet(); hyRender();
}
function hyCloseSet(){ closeDlg('hySetOverlay'); }
function hyDownload(name, text, type){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([text],{type})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function hyCsv(){
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const rows=[['到着日','出発日','泊数','部屋','お名前','大人','子ども','幼児','食事','状態','電話','料金','アレルギー','メモ']].concat(
    hy.bookings.slice().sort((a,b)=>a.in<b.in?-1:1).map(b=>[b.in, hyOut(b), b.nights, (hyRoom(b.room)||{}).name||'', b.name, b.adult, b.child, b.infant, b.meal, HY_STATUS[b.status], b.tel, b.price||'', b.allergy, b.note]));
  hyDownload('部屋割り表_'+today()+'.csv', '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'), 'text/csv');
}
function hyExport(){ hyDownload('部屋割り表_'+today()+'.json', JSON.stringify({app:'hyodenki', type:'heya', version:1, exportedAt:Date.now(), data:hy}), 'application/json'); }
async function hyImport(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  let o=null; try{ o=JSON.parse(await f.text()); }catch(_){}
  const d=o && (o.type==='heya' ? o.data : o.heya);
  if(!d || !Array.isArray(d.rooms) || !Array.isArray(d.bookings)){ toast('部屋割り表のファイルではありません'); return; }
  if(!await appConfirm('読み込むと、いまの部屋割り表（部屋と予約）と置きかわります。読み込みますか？','読み込む','やめる')) return;
  hy=hyClean(d); if(!isDate(hy.ui.start)) hy.ui.start=addD(today(),-1);
  hySave(); hyCloseSet(); hyRender(); toast('読み込みました（予約 '+hy.bookings.length+'件）');
}

Object.assign(window, { openHeya, closeHeya, hyMove, hyGoToday, hySetDays, hyNewAt, hyEdit, hyEdCheck, hyEdSave, hyEdCopy, hyEdDelete, hyCloseEd,
  hyQuick, hyListen, hyOpenDay, hyRenderDay, hyPrintDay, hyCloseDay, hyFind, hyJump, hyOpenSet, hyRoomSet, hyRoomMove, hyRoomAdd, hyRoomDel, hyCloseSet,
  hyCsv, hyExport, hyImport, hyParse, hyAddD:addD, hyState:()=>hy, hyReload:()=>{ hyLoad(); if(isDlgOpen('heyaOverlay')) hyRender(); } });
Object.defineProperty(window, 'hyDay', { get:()=>hyDay, set:v=>{ hyDay=v; }, configurable:true });
})();
