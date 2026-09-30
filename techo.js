/* 表電卓の 📔業務手帳（v433）。はじめて開いたときに読み込む（index.html の openTecho が script タグで読む）。
   営業・工場・品質管理のような「業務（役割）」ごとに、予定とメモを分けたり、まとめたりして見る手帳。
   上に月カレンダー、下にその日の日表示（業務ごとの列）。「明日10時 営業 A社訪問」と声や文で言えば登録する。
   画面（HTML・CSS）もこのファイルが持ち、はじめて開いたときに差し込む（index.html を大きくしないため）。
   入れたものはこの端末の中だけ（localStorage excalc_techo）。📋リストの書き出しにも入る（index.html の techoBundle）。
   ここの関数・変数は画面のボタンの onclick から呼ぶので、全体から見える名前にしている（頭に tc を付ける）。 */

/* ── 決まりごと ── */
const TC_KEY='excalc_techo';
const TC_WD=['日','月','火','水','木','金','土'];
const TC_WDMAP={'日':0,'月':1,'火':2,'水':3,'木':4,'金':5,'土':6};
const TC_COLORS=['#1e88e5','#43a047','#e53935','#fb8c00','#8e24aa','#00897b','#6d4c41','#546e7a','#d81b60','#c0a000'];
const TC_MAX_ROLES=8;
const TC_SIDE_MQ='(min-width:900px), (orientation:landscape) and (min-width:560px)';   // 月と1日を横に並べるとき
const TC_SPLIT={h:[25,60], v:[25,70]};   // 仕切りの位置（%）の範囲。h＝横並びの月の幅、v＝縦並びの月の高さ。0 は自動
const TC_REPS=[['','なし'],['d','毎日'],['wd','平日（月〜金）'],['w','毎週'],['w2','隔週'],['m','毎月'],['y','毎年']];
function tcDefRoles(){
  return [
    {id:'sales',   name:'営業',     color:'#1e88e5', kw:'商談,客先,顧客,お客,見積,訪問,提案,受注,納期,来客,来社,展示会', al:'営業部,営業課,セールス', col:1},
    {id:'factory', name:'工場',     color:'#43a047', kw:'製造,生産,ライン,設備,段取り,保全,稼働,出荷,在庫,棚卸,朝礼,工程,現場', al:'製造部,製造課,工場側', col:2},
    {id:'qc',      name:'品質管理', color:'#e53935', kw:'品質,品管,QC,検査,不良,クレーム,監査,是正,測定,校正,ISO,品証', al:'品管,品証,QC,品質保証', col:3},
  ];
}
function tcHourPx(){ return window.innerWidth>=900 ? 48 : 44; }   // 時間の表の1時間の高さ

/* ── しまう・読む ── */
let tc=null;                       // {v, roles, items, ui}
let tcSel='';                      // 選んでいる日 'YYYY-MM-DD'
let tcMon={y:2000,m:1};            // 月カレンダーに出している月
let tcShownDay='';                 // 日表示を最後に描いた日（日が変わったときだけ時刻の位置へ送る）
const tcIsDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && tcIso(tcD(s))===s;
const tcIsTime=s=>typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
function tcCleanRep(r){
  if(!r || typeof r!=='object' || !['d','wd','w','m','y'].includes(r.f)) return null;
  const n=(r.f==='w' && +r.n===2) ? 2 : 1;
  const dl=a=>Array.isArray(a) ? a.filter(tcIsDate).slice(0,2000) : [];
  return {f:r.f, n, until:tcIsDate(r.until)?r.until:null, ex:dl(r.ex), dd:dl(r.dd)};
}
function tcCleanItem(it, ids){
  if(!it || typeof it!=='object' || typeof it.id!=='string' || !it.id || it.id.length>40) return null;
  if(!tcIsDate(it.date)) return null;
  const kind=it.kind==='memo' ? 'memo' : 'ev';
  let roles=Array.isArray(it.roles) ? it.roles.filter((r,i,a)=>ids.includes(r) && a.indexOf(r)===i) : [];
  if(!roles.length) roles=[ids[0]];
  let allDay=kind==='ev' ? !!it.allDay : false, start=null, end=null;
  if(kind==='ev' && !allDay){
    if(tcIsTime(it.start)){ start=it.start; end=tcIsTime(it.end) && it.end>it.start ? it.end : tcAddMin(it.start, 60); }
    else allDay=true;
  }
  return { id:it.id, kind, roles, date:it.date, allDay, start, end,
    title:String(it.title==null?'':it.title).slice(0,200), note:String(it.note==null?'':it.note).slice(0,5000),
    done:!!it.done, rep:tcCleanRep(it.rep), cre:+it.cre||Date.now(), upd:+it.upd||+it.cre||Date.now() };
}
function tcCleanRoles(a){
  const out=[];
  (Array.isArray(a)?a:[]).forEach(r=>{
    if(!r || typeof r!=='object' || typeof r.id!=='string' || !/^[\w-]{1,24}$/.test(r.id)) return;
    if(out.some(x=>x.id===r.id) || out.length>=TC_MAX_ROLES) return;
    const name=String(r.name==null?'':r.name).trim().slice(0,12);
    if(!name) return;
    out.push({ id:r.id, name, color:/^#[0-9a-f]{6}$/i.test(r.color)?r.color.toLowerCase():TC_COLORS[out.length%TC_COLORS.length],
      kw:String(r.kw==null?'':r.kw).slice(0,300), al:String(r.al==null?'':r.al).slice(0,120), col:Math.min(TC_MAX_ROLES, Math.max(1, parseInt(r.col,10)||out.length+1)) });
  });
  return out.length ? out : tcDefRoles();
}
function tcSplitVal(k, v){
  v=Math.round(+v); if(!isFinite(v) || v<=0) return 0;
  return Math.min(TC_SPLIT[k][1], Math.max(TC_SPLIT[k][0], v));
}
function tcClean(o){
  o=(o && typeof o==='object') ? o : {};
  const roles=tcCleanRoles(o.roles), ids=roles.map(r=>r.id);
  const seen=new Set(), items=[];
  (Array.isArray(o.items)?o.items:[]).forEach(x=>{ const it=tcCleanItem(x, ids); if(it && !seen.has(it.id)){ seen.add(it.id); items.push(it); } });
  const u=(o.ui && typeof o.ui==='object') ? o.ui : {};
  const ui={ view:['split','merge','group'].includes(u.view)?u.view:'split',
    hidden:Array.isArray(u.hidden) ? u.hidden.filter(id=>ids.includes(id)) : [],
    wkStart:u.wkStart===1?1:0, confirm:u.confirm===true, calCollapsed:u.calCollapsed===true, dayMode:u.dayMode==='list'?'list':'time',
    dayTop:(Number.isInteger(u.dayTop) && u.dayTop>=0 && u.dayTop<=23) ? u.dayTop : 'now',
    lastRole:ids.includes(u.lastRole)?u.lastRole:ids[0],
    splitH:tcSplitVal('h', u.splitH), splitV:tcSplitVal('v', u.splitV) };
  if(ui.hidden.length>=ids.length) ui.hidden=[];      // 全部かくれていたら出す
  // 消した印（共有ファイルで、ほかの端末にも消したことを伝える）
  const dels=(Array.isArray(o.dels)?o.dels:[]).filter(d=>d && typeof d.id==='string' && d.id && d.id.length<=40 && +d.t>0)
    .map(d=>({id:d.id, t:+d.t})).slice(-3000);
  // 自分の言いかえ（声の聞き違いを直す）と、最近聞き取った言葉（v445）
  const alias=(Array.isArray(o.alias)?o.alias:[]).filter(a=>a && typeof a.from==='string' && a.from.trim() && typeof a.to==='string')
    .map(a=>({from:a.from.trim().slice(0,60), to:a.to.trim().slice(0,120)})).slice(0,300);
  const heard=(Array.isArray(o.heard)?o.heard:[]).filter(h=>h && typeof h.q==='string' && h.q)
    .map(h=>({q:h.q.slice(0,300), a:String(h.a||'').slice(0,300), title:String(h.title||'').slice(0,200), id:typeof h.id==='string'?h.id.slice(0,40):'', at:+h.at||0})).slice(-30);
  return {v:1, roles, items, ui, dels, alias, heard};
}
function tcLoad(){
  let o=null;
  try{ o=JSON.parse(localStorage.getItem(TC_KEY)||'null'); }catch(_){ o=null; }
  tc=tcClean(o);
}
function tcSave(){
  try{ localStorage.setItem(TC_KEY, JSON.stringify(tc)); }
  catch(_){ toast('端末の空きが足りず、業務手帳をしまえませんでした'); }
  tcShOnSave();
}
/* 消したときに印を残す（共有ファイルで、ほかの端末からも消えるように） */
function tcTomb(id){
  if(!tc || !id) return;
  if(!Array.isArray(tc.dels)) tc.dels=[];
  tc.dels=tc.dels.filter(d=>d.id!==id); tc.dels.push({id, t:Date.now()});
  if(tc.dels.length>3000) tc.dels=tc.dels.slice(-3000);
}
/* 📋リストの読み込みなどで、外から中身が変わったとき（index.html の techoMergeBundle から呼ぶ） */
window.tcReload=function(){ tcLoad(); if(isDlgOpen('techoOverlay')) tcRender(); };

/* ── 日付 ── */
const tcP2=n=>String(n).padStart(2,'0');
function tcIso(d){ return d.getFullYear()+'-'+tcP2(d.getMonth()+1)+'-'+tcP2(d.getDate()); }
function tcD(s){ const a=String(s).split('-').map(Number); return new Date(a[0], a[1]-1, a[2]); }
function tcAdd(s, n){ const d=tcD(s); d.setDate(d.getDate()+n); return tcIso(d); }
function tcDiff(a, b){ return Math.round((tcD(b)-tcD(a))/86400000); }     // b − a（日）
function tcYmd(y, m, d){ const x=new Date(y, m-1, d); return (x.getFullYear()===y && x.getMonth()===m-1 && x.getDate()===d) ? tcIso(x) : null; }
function tcNow(){ return window.TECHO_TODAY ? new Date(window.TECHO_TODAY) : new Date(); }
function tcTodayIso(){ return tcIso(tcNow()); }
function tcMonday(s){ const k=(tcD(s).getDay()+6)%7; return tcAdd(s, -k); }
function tcWeekStart(s){ const d=tcD(s).getDay(); return tcAdd(s, -((d-tc.ui.wkStart+7)%7)); }
function tcMin(t){ const a=t.split(':'); return (+a[0])*60+(+a[1]); }
function tcHM(min){ min=Math.max(0, Math.min(23*60+59, Math.round(min))); return tcP2(Math.floor(min/60))+':'+tcP2(min%60); }
function tcAddMin(t, n){ return tcHM(tcMin(t)+n); }
function tcMD(s){ const d=tcD(s); return (d.getMonth()+1)+'月'+d.getDate()+'日('+TC_WD[d.getDay()]+')'; }
function tcMDs(s){ const d=tcD(s); return (d.getMonth()+1)+'/'+d.getDate()+'('+TC_WD[d.getDay()]+')'; }
function tcHol(s){
  try{ if(typeof tbHolidays==='function'){ const y=+s.slice(0,4); return tbHolidays(y)[s]||''; } }catch(_){}
  return '';
}

/* ── くり返し ── */
function tcOccurs(it, ds){
  if(!it.rep) return it.date===ds;
  if(ds<it.date) return false;
  const r=it.rep;
  if(r.until && ds>r.until) return false;
  if(r.ex.includes(ds)) return false;
  const d=tcD(ds), s=tcD(it.date);
  switch(r.f){
    case 'd':  return true;
    case 'wd': { const w=d.getDay(); return w>=1 && w<=5; }
    case 'w':  return tcDiff(it.date, ds)%(7*(r.n||1))===0;
    case 'm':  return d.getDate()===s.getDate();
    case 'y':  return d.getMonth()===s.getMonth() && d.getDate()===s.getDate();
  }
  return false;
}
/* その日にある予定・メモ（業務の表示オフも見るなら vis=true） */
function tcItemsOn(ds, vis){
  const hid=tc.ui.hidden;
  return tc.items.filter(it=>tcOccurs(it, ds) && (!vis || it.roles.some(id=>!hid.includes(id))));
}
function tcDoneOn(it, ds){ return it.rep ? it.rep.dd.includes(ds) : !!it.done; }
/* ある日から先で、次に出る日（なければ null）。さがす・メモ一覧で使う */
function tcNextOcc(it, from){
  if(!it.rep) return it.date;
  let ds=from<it.date ? it.date : from;
  for(let i=0;i<800;i++){ if(tcOccurs(it, ds)) return ds; if(it.rep.until && ds>it.rep.until) break; ds=tcAdd(ds,1); }
  return null;
}
function tcRepKey(rep){ return !rep ? '' : (rep.f==='w' && rep.n===2 ? 'w2' : rep.f); }
function tcRepLabel(it){
  const r=it.rep; if(!r) return '';
  const d=tcD(it.date);
  let s={d:'毎日', wd:'平日', m:'毎月'+d.getDate()+'日', y:'毎年'+(d.getMonth()+1)+'月'+d.getDate()+'日'}[r.f]
    || ((r.n===2?'隔週':'毎週')+TC_WD[d.getDay()]+'曜');
  if(r.until) s+='（〜'+tcMDs(r.until)+'）';
  return s;
}
function tcRole(id){ return tc.roles.find(r=>r.id===id)||null; }
function tcRoleNames(ids){ return ids.map(id=>(tcRole(id)||{}).name).filter(Boolean).join('・'); }
function tcTint(hex, a){
  const m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex||''); if(!m) return 'rgba(120,132,156,'+a+')';
  return 'rgba('+parseInt(m[1],16)+','+parseInt(m[2],16)+','+parseInt(m[3],16)+','+a+')';
}
const tcEsc=s=>(typeof escHtml==='function') ? escHtml(s) : String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tcNewId(){ return 't'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/* ── 列の分け方（分ける／まとめる／組み合わせ） ── */
function tcVisRoles(){ return tc.roles.filter(r=>!tc.ui.hidden.includes(r.id)); }
function tcColumns(){
  const vis=tcVisRoles();
  if(!vis.length) return [];
  if(tc.ui.view==='merge') return [{ids:vis.map(r=>r.id), name:'まとめて', roles:vis}];
  if(tc.ui.view==='group'){
    const by=new Map();
    vis.slice().sort((a,b)=>a.col-b.col).forEach(r=>{ if(!by.has(r.col)) by.set(r.col, []); by.get(r.col).push(r); });
    return [...by.values()].map(rs=>({ids:rs.map(r=>r.id), name:rs.map(r=>r.name).join('＋'), roles:rs}));
  }
  return vis.map(r=>({ids:[r.id], name:r.name, roles:[r]}));
}
/* 列の中での色：その列に入っている業務のうち、はじめのもの */
function tcColOf(it, ids){
  const own=it.roles.filter(id=>ids.includes(id));
  return own.map(id=>(tcRole(id)||{}).color).filter(Boolean);
}

/* ── 画面を差し込む（はじめて開いたときに1回だけ） ── */
const TC_CSS=`
.tc-modal{ --tc-line:rgba(120,132,156,.30); --tc-line2:rgba(120,132,156,.16); --tc-soft:rgba(120,132,156,.10);
  --tc-ink:var(--text,#333); --tc-sub:var(--text-light,#888); --tc-bg:var(--modal-bg,#fff); --tc-sel:rgba(33,115,70,.16);
  --tc-sun:#d32f2f; --tc-sat:#1565c0; position:relative; display:flex; flex-direction:column; }
body.dark .tc-modal{ --tc-line:rgba(150,170,210,.28); --tc-line2:rgba(150,170,210,.13); --tc-soft:rgba(150,170,210,.10);
  --tc-sel:rgba(76,175,80,.32); --tc-sun:#ff8a80; --tc-sat:#82b1ff; }
.tc-modal .modal-header .hdr-right{ gap:6px; }
.tc-modal .tc-hb{ padding:6px 9px; }
/* 上のタイトルバーは出さず、☰ のメニューにまとめる（v442）。iPhone のカメラ・角の丸みにかからないよう、安全な範囲の内側に置く */
#techoOverlay .tc-modal{ padding-top:var(--safe-top,env(safe-area-inset-top,0px)); padding-left:var(--safe-left,env(safe-area-inset-left,0px)); padding-right:var(--safe-right,env(safe-area-inset-right,0px)); box-sizing:border-box; }
.tc-menubtn{ font-size:16px; padding:0 11px; }
.tc-menuov{ position:fixed; inset:0; z-index:99990; display:none; background:rgba(0,0,0,.18); }
.tc-menuov.open{ display:block; }
.tc-menu{ position:absolute; min-width:220px; max-width:calc(100vw - 16px); background:var(--modal-bg,#fff); color:var(--text,#333); border-radius:12px;
  box-shadow:0 10px 36px rgba(0,0,0,.28); padding:6px; display:flex; flex-direction:column; }
.tc-menutt{ font-size:12px; font-weight:bold; color:var(--text-light,#888); padding:6px 10px 4px; }
.tc-menu button{ height:44px; text-align:left; padding:0 12px; border:none; border-radius:8px; background:transparent; color:inherit; font-size:15px; font-weight:bold; cursor:pointer; }
.tc-menu button:hover,.tc-menu button:focus-visible{ background:rgba(120,132,156,.14); }
.tc-menu button[hidden]{ display:none; }
.tc-menu .tc-menux{ border-top:1px solid rgba(120,132,156,.25); border-radius:0 0 8px 8px; margin-top:4px; color:#d32f2f; }
.tc-body{ flex:1; min-height:0; display:flex; flex-direction:column; color:var(--tc-ink); }
.tc-cal{ flex:none; padding:3px 8px 2px; display:flex; flex-direction:column; min-height:0; overflow-x:clip; touch-action:pan-y pinch-zoom; }   /* 横の動きは月めくりに使う（v448） */
.tc-body.sv .tc-cal:not(.fold){ height:var(--tc-calh); overflow-y:auto; }
.tc-body.sv .tc-cal:not(.fold) .tc-grid{ flex:1; grid-auto-rows:minmax(28px,1fr); }
.tc-body.sv .tc-cal:not(.fold) .tc-d{ height:auto; }
.tc-split{ flex:none; height:12px; position:relative; cursor:row-resize; touch-action:none; user-select:none; -webkit-user-select:none; outline:none; }
.tc-split::before{ content:''; position:absolute; left:0; right:0; top:5px; height:1px; background:var(--tc-line); }
.tc-split::after{ content:''; position:absolute; left:50%; top:4px; width:40px; height:4px; margin-left:-20px; border-radius:2px; background:var(--tc-sub); opacity:.5; }
.tc-split:hover::after,.tc-split:focus-visible::after,.tc-split.drag::after{ opacity:1; background:var(--acc); }
.tc-calnav,.tc-daybar{ display:flex; align-items:center; gap:4px; min-height:32px; }
.tc-calnav b,.tc-daybar b{ font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.tc-daybar small{ font-size:11px; color:var(--tc-sun); font-weight:bold; white-space:nowrap; }
.tc-nb{ flex:none; width:32px; height:30px; border:none; border-radius:8px; background:var(--tc-soft); color:var(--tc-ink); font-size:12px; cursor:pointer; }
.tc-mini{ flex:none; height:28px; padding:0 10px; border:1px solid var(--tc-line); border-radius:14px; background:transparent; color:var(--tc-ink); font-size:12.5px; font-weight:bold; cursor:pointer; }
.tc-sp{ flex:1; }
.tc-wd,.tc-grid{ display:grid; grid-template-columns:repeat(7,1fr); }
.tc-wd span{ text-align:center; font-size:11px; color:var(--tc-sub); padding:1px 0; }
.tc-wd span.sun{ color:var(--tc-sun); } .tc-wd span.sat{ color:var(--tc-sat); }
.tc-d{ height:31px; border:none; background:transparent; color:var(--tc-ink); display:flex; flex-direction:column; align-items:center;
  padding:1px 0 0; border-radius:8px; font-size:13px; cursor:pointer; min-width:0; touch-action:manipulation; }
.tc-dn{ width:22px; height:22px; line-height:22px; border-radius:50%; text-align:center; }
.tc-d.sun,.tc-d.hol{ color:var(--tc-sun); } .tc-d.sat{ color:var(--tc-sat); }
.tc-d.out{ opacity:.4; }
.tc-d.today .tc-dn{ box-shadow:inset 0 0 0 2px var(--acc); font-weight:bold; }
.tc-d.sel{ background:var(--tc-sel); } .tc-d.sel .tc-dn{ font-weight:bold; }
.tc-dots{ display:flex; gap:2px; height:5px; margin-top:1px; }
.tc-dots i{ width:5px; height:5px; border-radius:50%; background:var(--c); }
/* マスが大きいとき（仕切りで月を広げた・広い画面）は、点の代わりに件名を小さく出す */
.tc-dts{ display:none; flex:1; min-height:0; width:100%; flex-direction:column; gap:1px; overflow:hidden; padding:0 1px 1px; box-sizing:border-box; }
.tc-cal .tc-grid{ min-height:0; }
.tc-grid.tt .tc-d{ overflow:hidden; justify-content:flex-start; }
.tc-grid.tt .tc-dn{ width:18px; height:18px; line-height:18px; flex:none; font-size:12px; }
.tc-grid.tt .tc-dts{ display:flex; }
.tc-grid.tt .tc-dots{ display:none; }
.tc-dts i{ flex:none; display:block; font-style:normal; font-size:8.5px; line-height:11px; height:11px; white-space:nowrap; overflow:hidden; text-align:left;
  border-left:2px solid var(--c); background:var(--bgc); border-radius:2px; padding-left:2px; color:var(--tc-ink); font-weight:normal; }
.tc-dts i.dn{ text-decoration:line-through; opacity:.55; }
.tc-day{ flex:1; min-height:0; display:flex; flex-direction:column; padding:0 6px; }
.tc-daybar{ padding:3px 2px 1px; }
.tc-day{ min-width:0; }
.tc-chiprow{ flex-wrap:wrap; row-gap:3px; }
.tc-chiprow .tc-dm{ margin-left:auto; }
.tc-seg{ flex:none; display:inline-flex; border:1px solid var(--tc-line); border-radius:15px; overflow:hidden; }
.tc-seg button{ height:28px; padding:0 9px; border:none; background:transparent; color:var(--tc-sub); font-size:12px; font-weight:bold; cursor:pointer; }
.tc-seg button.on{ background:var(--acc); color:#fff; }
.tc-chiprow{ flex:none; display:flex; align-items:center; gap:6px; min-width:0; }
.tc-chiprow .tc-chips{ flex:1; min-width:0; }
.tc-dm button{ padding:0 8px; white-space:nowrap; }
.tc-cols.lm .tc-row{ grid-template-columns:repeat(var(--n,1),minmax(0,1fr)); }
.tc-cols.lm .tc-colhead > div:first-child{ display:none; }
.tc-cols.lm .tc-colhead > div:nth-child(2){ border-left:none; }
.tc-cols.lm .tc-memorow{ display:none; }
.tc-list{ display:grid; grid-template-columns:repeat(var(--n,1),minmax(0,1fr)); min-height:100%; }
.tc-lcol{ border-left:1px solid var(--tc-line2); padding:4px; display:flex; flex-direction:column; gap:4px; min-width:0; }
.tc-lcol:first-child{ border-left:none; }
.tc-card{ position:relative; display:flex; align-items:flex-start; gap:2px; border-left:3px solid var(--c); background:var(--bgc); border-radius:6px; min-width:0; }
.tc-card.past{ opacity:.6; }
.tc-card.done .tc-cb{ text-decoration:line-through; opacity:.55; }
.tc-cbtn{ flex:1; min-width:0; border:none; background:transparent; color:var(--tc-ink); text-align:left; padding:3px 6px 4px; cursor:pointer; }
.tc-card .tc-ck{ position:absolute; top:1px; right:1px; width:20px; height:20px; font-size:13px; }
.tc-card .tc-ck + .tc-cbtn .tc-ct{ padding-right:18px; }
.tc-ct{ display:block; font-size:10.5px; font-weight:bold; color:var(--tc-sub); line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tc-ct i{ display:inline-block; width:7px; height:7px; border-radius:50%; margin-left:3px; vertical-align:middle; }
.tc-cb{ display:block; font-size:12.5px; font-weight:bold; line-height:1.3; overflow-wrap:anywhere; }
.tc-cn2{ display:block; font-size:11px; color:var(--tc-sub); line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tc-lnow{ position:relative; height:2px; background:#e53935; margin:2px 0 2px 5px; flex:none; }
.tc-lnow::before{ content:''; position:absolute; left:-5px; top:-4px; width:10px; height:10px; border-radius:50%; background:#e53935; }
.tc-lnone{ font-size:11px; color:var(--tc-sub); text-align:center; padding:6px 0; }
.tc-ladd{ display:flex; flex-wrap:wrap; gap:4px; }
.tc-ladd .tc-madd{ flex:1 1 42px; min-width:0; white-space:nowrap; padding:0 2px; }
.tc-cbtn{ padding:3px 5px 4px; }
.tc-chips{ flex:none; display:flex; gap:5px; overflow-x:auto; padding:3px 2px 5px; scrollbar-width:none; }
.tc-chips::-webkit-scrollbar{ display:none; }
.tc-chip{ flex:none; height:26px; padding:0 10px 0 8px; border-radius:13px; border:1.5px solid var(--c); background:var(--bgc);
  color:var(--tc-ink); font-size:12.5px; font-weight:bold; display:inline-flex; align-items:center; gap:5px; cursor:pointer; }
.tc-chip::before{ content:''; width:9px; height:9px; border-radius:50%; background:var(--c); }
.tc-chip.off{ background:transparent; opacity:.5; text-decoration:line-through; }
.tc-chip.off::before{ background:transparent; box-shadow:inset 0 0 0 1.5px var(--c); }
.tc-cols{ flex:1; min-height:0; display:flex; flex-direction:column; border:1px solid var(--tc-line); border-radius:10px; overflow:hidden; margin-bottom:5px; }
.tc-row{ display:grid; grid-template-columns:38px repeat(var(--n,1),minmax(0,1fr)); }
.tc-colhead{ flex:none; background:var(--tc-soft); border-bottom:1px solid var(--tc-line); overflow-y:hidden; scrollbar-gutter:stable; }
.tc-colhead > div{ font-size:12px; font-weight:bold; padding:4px; border-left:1px solid var(--tc-line2); display:flex; align-items:center; gap:4px; min-width:0; }
.tc-colhead > div:first-child{ border-left:none; }
.tc-colhead i{ flex:none; width:8px; height:8px; border-radius:50%; background:var(--c); }
.tc-cn{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tc-memorow{ flex:none; max-height:30%; overflow-y:auto; scrollbar-gutter:stable; border-bottom:1px solid var(--tc-line); }
.tc-lab{ font-size:10.5px; color:var(--tc-sub); text-align:center; padding-top:6px; }
.tc-mcell{ border-left:1px solid var(--tc-line2); padding:3px; display:flex; flex-direction:column; gap:3px; min-width:0; }
.tc-m{ display:flex; align-items:flex-start; gap:3px; border-radius:6px; background:var(--bgc); border-left:3px solid var(--c); min-width:0; }
.tc-ck{ flex:none; width:22px; height:22px; border:none; background:transparent; color:var(--tc-ink); font-size:14px; padding:0; cursor:pointer; }
.tc-mt{ flex:1; min-width:0; border:none; background:transparent; color:var(--tc-ink); font-size:12px; line-height:1.3; padding:3px 3px 3px 0;
  text-align:left; cursor:pointer; overflow-wrap:anywhere; }
.tc-m.done .tc-mt{ text-decoration:line-through; opacity:.55; }
.tc-ad{ border:none; border-radius:6px; background:var(--c); color:#fff; font-size:12px; font-weight:bold; line-height:1.3; padding:3px 6px;
  text-align:left; cursor:pointer; overflow-wrap:anywhere; }
.tc-madd{ border:1px dashed var(--tc-line); background:transparent; color:var(--tc-sub); border-radius:6px; height:22px; font-size:11px; cursor:pointer; }
.tc-scroll{ flex:1; min-height:0; overflow-y:auto; scrollbar-gutter:stable; touch-action:pan-y; position:relative; }
.tc-tgrid{ position:relative; }
.tc-hours{ position:absolute; left:0; top:0; width:38px; height:100%; }
.tc-hours span{ position:absolute; right:5px; font-size:10px; color:var(--tc-sub); transform:translateY(-50%); }
.tc-tcols{ position:absolute; left:38px; right:0; top:0; height:100%; display:grid; grid-template-columns:repeat(var(--n,1),minmax(0,1fr));
  background-image:linear-gradient(var(--tc-line2) 1px, transparent 1px); background-size:100% var(--h); }
.tc-tcol{ position:relative; border-left:1px solid var(--tc-line2); cursor:cell; }
.tc-ev{ position:absolute; border:none; border-left:3px solid var(--c); border-radius:6px; padding:2px 4px; background:var(--bgc); color:var(--tc-ink);
  font-size:11.5px; line-height:1.25; overflow:hidden; text-align:left; cursor:pointer; box-sizing:border-box; overflow-wrap:anywhere; }
.tc-ev b{ display:block; font-size:10.5px; }
.tc-ev .tc-rd{ display:inline-block; width:7px; height:7px; border-radius:50%; margin-left:3px; vertical-align:middle; }
.tc-now{ position:absolute; left:38px; right:0; height:2px; background:#e53935; z-index:3; pointer-events:none; }
.tc-now::before{ content:''; position:absolute; left:-5px; top:-4px; width:10px; height:10px; border-radius:50%; background:#e53935; }
.tc-flash{ animation:tcFlash .7s ease 3; }
@keyframes tcFlash{ 50%{ box-shadow:0 0 0 3px var(--acc); } }
.tc-empty{ padding:14px; text-align:center; color:var(--tc-sub); font-size:13px; }
.tc-add{ flex:none; display:flex; gap:6px; align-items:center; padding:6px 8px calc(6px + var(--safe-bottom,0px)); border-top:1px solid var(--tc-line);
  background:var(--tc-bg); position:relative; }
.tc-mic{ flex:none; width:42px; height:40px; border-radius:50%; border:none; background:var(--acc); color:#fff; font-size:18px; cursor:pointer; }
.tc-mic.on,.tc-fmic.on{ background:#e53935; color:#fff; animation:tcPulse 1.2s infinite; }
@keyframes tcPulse{ 50%{ box-shadow:0 0 0 6px rgba(229,57,53,.25); } }
.tc-add input{ flex:1; min-width:0; height:40px; border:1px solid var(--tc-line); border-radius:20px; padding:0 14px; font-size:15px;
  background:var(--tc-bg); color:var(--tc-ink); }
.tc-plus{ flex:none; width:42px; height:40px; border-radius:50%; border:1.5px solid var(--acc); background:transparent; color:var(--acc); font-size:22px; font-weight:bold; cursor:pointer; }
body.dark .tc-plus{ color:var(--acc-text,#7cc68b); border-color:var(--acc-text,#7cc68b); }
.tc-wait{ position:absolute; left:0; top:-1px; height:2px; background:var(--acc); animation:tcWait linear forwards; }
@keyframes tcWait{ from{ width:100%; } to{ width:0; } }
.tc-snack{ position:absolute; left:8px; right:8px; bottom:calc(60px + var(--safe-bottom,0px)); z-index:6; background:rgba(20,30,28,.95); color:#fff;
  border-radius:12px; padding:8px 8px 8px 14px; display:flex; align-items:center; gap:6px; font-size:13px; box-shadow:0 8px 28px rgba(0,0,0,.3); }
.tc-snack[hidden]{ display:none; }
.tc-shbar{ flex:none; display:flex; align-items:center; gap:8px; padding:6px 10px; font-size:12.5px; background:#fff8e1; color:#5d4037; border-bottom:1px solid rgba(120,132,156,.25); }
.tc-shbar[hidden]{ display:none; }
.tc-alrow{ display:flex; align-items:center; gap:8px; padding:8px 10px; margin-bottom:5px; border-radius:8px; background:rgba(120,132,156,.10); cursor:pointer; font-size:13.5px; }
.tc-alrow span{ flex:1; min-width:0; overflow-wrap:anywhere; }
.tc-alrow small{ display:block; font-size:12px; color:var(--text-light,#888); }
.tc-alrow button{ flex:none; width:32px; height:32px; border:none; border-radius:50%; background:transparent; color:#d32f2f; font-size:15px; cursor:pointer; }
.tc-aldlg{ position:fixed; inset:0; z-index:99999; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.45); }
.tc-aldlg.open{ display:flex; }
.tc-allist{ z-index:99998; }
.tc-alpanel{ background:var(--modal-bg,#fff); color:var(--text,#222); width:520px; max-width:calc(100vw - 16px - var(--safe-left,0px) - var(--safe-right,0px));
  height:calc(100% - 24px - var(--safe-top,0px) - var(--safe-bottom,0px)); max-height:760px; margin-top:calc(var(--safe-top,0px) - var(--safe-bottom,0px));
  display:flex; flex-direction:column; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,.35); overflow:hidden; }
.tc-alphd{ flex:none; display:flex; align-items:center; justify-content:space-between; padding:10px 8px 6px 14px; font-size:16px; }
.tc-alphd button{ width:38px; height:38px; border:none; border-radius:50%; background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.tc-alptool{ flex:none; display:flex; gap:8px; padding:0 12px 8px; border-bottom:1px solid rgba(120,132,156,.25); }
.tc-alptool input{ flex:1; min-width:0; height:40px; padding:0 10px; font-size:16px; border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.tc-alptool button{ flex:none; height:40px; padding:0 14px; border-radius:8px; border:1px solid var(--acc); background:var(--acc); color:#fff; font-weight:bold; font-size:14px; cursor:pointer; }
.tc-alpbody{ flex:1; min-height:0; overflow:auto; -webkit-overflow-scrolling:touch; padding:8px 12px calc(12px + var(--safe-bottom,0px)); }
.tc-alopen{ display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:10px 12px; margin-bottom:6px; border-radius:8px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.10); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.tc-alopen span{ flex:1; min-width:0; }
.tc-alopen small{ display:block; font-size:12px; font-weight:normal; color:var(--text-light,#888); }
.tc-alopen b{ font-size:20px; color:var(--text-light,#888); }
.tc-alsrc{ font-size:13px; background:rgba(120,132,156,.12); border-radius:8px; padding:6px 10px; margin-bottom:8px; overflow-wrap:anywhere; }
.tc-alf{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:6px 0; }
.tc-alf input{ display:block; width:100%; box-sizing:border-box; margin-top:4px; height:40px; padding:0 10px; font-size:16px; border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.tc-alhint{ font-size:12.5px; line-height:1.6; min-height:2.4em; margin:8px 0 0; color:var(--text,#333); overflow-wrap:anywhere; }
.tc-shbar.err{ background:#ffebee; color:#b71c1c; }
body.dark .tc-shbar{ background:#3e3420; color:#ffe0a3; } body.dark .tc-shbar.err{ background:#4a2020; color:#ffb4ab; }
.tc-shbar span{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tc-shbar button{ flex:none; height:30px; padding:0 12px; border-radius:15px; border:none; background:var(--acc); color:#fff; font-weight:bold; font-size:12.5px; cursor:pointer; }
.tc-shbar button.x{ background:transparent; color:inherit; padding:0 6px; }
.tc-shcur{ font-size:13px; line-height:1.6; padding:6px 10px; border-radius:8px; background:rgba(120,132,156,.10); margin-bottom:6px; overflow-wrap:anywhere; }
.tc-snack .tc-st{ flex:1; min-width:0; line-height:1.4; }
.tc-snack button{ flex:none; height:32px; padding:0 11px; border-radius:16px; border:1px solid rgba(255,255,255,.55); background:transparent; color:#fff; font-weight:bold; font-size:12.5px; cursor:pointer; }
@media (min-width:900px), (orientation:landscape) and (min-width:560px){
  .tc-body{ flex-direction:row; }
  .tc-cal,.tc-body.sv .tc-cal:not(.fold){ width:var(--tc-calw, min(360px, 42%)); height:auto; flex:none; overflow-y:auto; padding:4px 8px; }
  .tc-cal:not(.fold) .tc-grid{ flex:1; grid-auto-rows:minmax(28px,1fr); }
  .tc-cal:not(.fold) .tc-d{ height:auto; }
  .tc-split{ width:12px; height:auto; cursor:col-resize; }
  .tc-split::before{ left:5px; right:auto; top:0; bottom:0; width:1px; height:auto; }
  .tc-split::after{ left:4px; top:50%; width:4px; height:40px; margin:-20px 0 0; }
  .tc-day{ padding:4px 8px 0 2px; }
  .tc-daybar{ flex-wrap:wrap; row-gap:3px; }
}
@media (min-width:900px){ .tc-cal,.tc-body.sv .tc-cal:not(.fold){ padding:8px 12px; } }
/* 入力画面・メモ一覧・さがす・設定 */
.tc-edm{ max-width:470px; max-height:90vh; }
.tc-edm .modal-body,.tc-setm .modal-body{ color:var(--text,#333); }
.tc-heard{ font-size:12.5px; background:rgba(120,132,156,.12); border-radius:8px; padding:6px 10px; margin-bottom:10px; }
.tc-f{ display:flex; flex-direction:column; gap:4px; margin:0 0 10px; font-size:13px; }
.tc-f > .tc-fl{ font-size:12px; color:var(--text-light,#888); font-weight:bold; }
.tc-f input[type=text],.tc-f input[type=date],.tc-f input[type=time],.tc-f textarea,.tc-f select{ height:38px; border:1px solid rgba(120,132,156,.4);
  border-radius:8px; padding:0 10px; font-size:15px; background:var(--modal-bg,#fff); color:var(--text,#333); min-width:0; font-family:inherit; }
.tc-f textarea{ height:auto; min-height:66px; padding:8px 10px; resize:vertical; line-height:1.5; }
.tc-inrow{ display:flex; gap:6px; align-items:stretch; }
.tc-inrow input,.tc-inrow textarea{ flex:1; }
.tc-fmic{ flex:none; width:42px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.10); font-size:17px; cursor:pointer; }
.tc-kind{ display:flex; gap:6px; margin-bottom:10px; }
.tc-kind button{ flex:1; height:38px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-weight:bold; font-size:14px; cursor:pointer; }
.tc-kind button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.tc-rolepick{ display:flex; flex-wrap:wrap; gap:6px; }
.tc-rolepick .tc-chip{ height:32px; font-size:13.5px; padding:0 12px 0 10px; }
.tc-time{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.tc-time input[type=time]{ width:112px; }
.tc-tfield{ width:86px; text-align:center; cursor:pointer; font-weight:bold; font-size:16px; caret-color:transparent; }
#tcTimePick{ position:fixed; inset:0; z-index:99999; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.45); }
#tcTimePick.open{ display:flex; }
.tc-tp{ background:var(--modal-bg,#fff); color:var(--text,#222); width:340px; max-width:94vw; max-height:94vh; overflow:auto; padding:14px; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,.35); }
.tc-tphd{ display:flex; align-items:baseline; justify-content:space-between; font-weight:bold; margin-bottom:8px; }
.tc-tpnow{ font-size:30px; font-variant-numeric:tabular-nums; color:var(--acc); }
.tc-tpl{ font-size:12px; font-weight:bold; opacity:.7; margin:8px 0 4px; }
.tc-tpg{ display:grid; grid-template-columns:repeat(6,1fr); gap:4px; }
.tc-tpg button{ height:36px; border-radius:7px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; padding:0; font-variant-numeric:tabular-nums; }
.tc-tpg button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.tc-tpft{ display:flex; gap:8px; margin-top:12px; }
.tc-tpft button{ flex:1; height:44px; border-radius:8px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.12); color:var(--text,#222); font-weight:bold; font-size:15px; cursor:pointer; }
.tc-tpft .tc-tpok{ background:var(--acc); border-color:var(--acc); color:#fff; }
.tc-chk{ display:inline-flex; align-items:center; gap:6px; font-size:14px; font-weight:bold; cursor:pointer; }
.tc-chk input{ width:20px; height:20px; }
.tc-edbtns{ display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:6px; }
.tc-edbtns button,.tc-btn{ height:38px; padding:0 13px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.10);
  color:var(--text,#333); font-weight:bold; font-size:14px; cursor:pointer; }
.tc-edbtns .tc-save{ background:var(--acc); border-color:var(--acc); color:#fff; min-width:84px; }
.tc-edfoot{ position:sticky; bottom:-10px; margin:6px -10px -10px; padding:8px 10px; background:var(--modal-bg,#fff); border-top:1px solid rgba(120,132,156,.25); flex-wrap:nowrap; z-index:2; }
.tc-edbtns .tc-del{ color:#d32f2f; }
body.dark .tc-edbtns .tc-del{ color:#ff8a80; }
.tc-bodyfull{ flex:1; min-height:0; display:flex; flex-direction:column; padding:8px; color:var(--text,#333); }
.tc-tools{ flex:none; display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:6px; }
.tc-bd{ flex:1; min-height:0; display:flex; gap:8px; overflow-x:auto; align-items:stretch; padding-bottom:4px; }
.tc-bcol{ flex:1 0 190px; max-width:380px; background:rgba(120,132,156,.10); border-radius:10px; padding:6px; display:flex; flex-direction:column; gap:6px; overflow-y:auto; }
.tc-bh{ display:flex; align-items:center; gap:6px; font-weight:bold; font-size:13.5px; padding:2px 2px 5px; border-bottom:2px solid var(--c); }
.tc-bh .tc-cn{ flex:1; }
.tc-card{ display:flex; gap:4px; align-items:flex-start; background:var(--modal-bg,#fff); border-radius:8px; border-left:3px solid var(--c);
  box-shadow:0 1px 4px rgba(0,0,0,.14); }
.tc-card.done .tc-mt{ text-decoration:line-through; opacity:.55; }
.tc-card .tc-mt{ font-size:13px; padding:6px 6px 6px 0; }
.tc-card small{ display:block; font-size:11px; color:var(--text-light,#888); margin-top:2px; }
.tc-bnone{ font-size:12px; color:var(--text-light,#888); text-align:center; padding:10px 0; }
.tc-find{ width:100%; height:42px; border:1px solid rgba(120,132,156,.4); border-radius:10px; padding:0 12px; font-size:15px;
  background:var(--modal-bg,#fff); color:var(--text,#333); margin-bottom:6px; }
.tc-fres{ flex:1; min-height:0; overflow-y:auto; }
.tc-fr{ display:flex; gap:10px; width:100%; padding:9px 6px; border:none; border-bottom:1px solid rgba(120,132,156,.2); background:none;
  color:var(--text,#333); text-align:left; cursor:pointer; align-items:flex-start; }
.tc-fr .tc-fd{ flex:none; width:74px; font-size:12px; color:var(--text-light,#888); }
.tc-fr .tc-ft{ flex:1; min-width:0; font-size:14px; overflow-wrap:anywhere; }
.tc-fr .tc-ft small{ display:block; font-size:11.5px; color:var(--text-light,#888); }
.tc-fr i{ display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:3px; }
.tc-setm{ max-width:560px; max-height:90vh; }
.tc-sec{ font-size:13px; font-weight:bold; margin:14px 0 6px; padding-bottom:3px; border-bottom:1px solid rgba(120,132,156,.3); }
.tc-sec:first-child{ margin-top:0; }
.tc-rrow{ display:grid; grid-template-columns:40px 1fr auto; gap:6px; align-items:center; padding:7px 0; border-bottom:1px solid rgba(120,132,156,.18); }
.tc-rrow input[type=color]{ width:36px; height:36px; border:none; padding:0; background:none; cursor:pointer; }
.tc-rrow .tc-rn{ height:36px; border:1px solid rgba(120,132,156,.4); border-radius:8px; padding:0 8px; font-size:15px; font-weight:bold;
  background:var(--modal-bg,#fff); color:var(--text,#333); min-width:0; }
.tc-rrow .tc-rk{ grid-column:2 / 4; height:34px; border:1px solid rgba(120,132,156,.4); border-radius:8px; padding:0 8px; font-size:13px;
  background:var(--modal-bg,#fff); color:var(--text,#333); min-width:0; }
.tc-rbtn{ display:flex; gap:4px; align-items:center; }
.tc-rbtn button,.tc-rbtn select{ height:34px; min-width:34px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.10);
  color:var(--text,#333); font-size:13px; cursor:pointer; }
.tc-rbtn button:disabled{ opacity:.35; }
.tc-note{ font-size:12px; color:var(--text-light,#888); line-height:1.6; margin:8px 0; }
.tc-segw{ display:flex; gap:6px; flex-wrap:wrap; }
.tc-slrow{ display:flex; align-items:center; gap:8px; font-size:13px; margin:4px 0; }
.tc-slrow > span{ flex:1; }
.tc-slrow input[type=range]{ flex:1; min-width:0; accent-color:var(--acc); }
.tc-slv{ min-width:3em; text-align:right; }
.tc-segw button{ height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333);
  font-weight:bold; font-size:13px; cursor:pointer; }
.tc-segw button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
/* 印刷（紙は白なので色は決め打ち） */
#printArea .tc-pdoc .tc-pt{ font-size:18px; font-weight:bold; }
#printArea .tc-pdoc .tc-ps{ font-size:11px; color:#555; margin:2px 0 8px; }
#printArea .tc-pdoc table{ width:100%; border-collapse:collapse; table-layout:fixed; }
#printArea .tc-pdoc th,#printArea .tc-pdoc td{ border:1px solid #999; padding:4px 5px; vertical-align:top; font-size:11px; text-align:left; }
#printArea .tc-pdoc th{ background:#f0f0f0; font-size:12px; }
#printArea .tc-pdoc th i{ display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:4px; vertical-align:middle; }
#printArea .tc-pdoc td.tc-pk{ width:70px; font-weight:bold; background:#fafafa; }
#printArea .tc-pdoc .tc-pi{ margin:0 0 4px; padding-left:5px; border-left:3px solid #999; break-inside:avoid; }
#printArea .tc-pdoc .tc-pi b{ font-size:10px; margin-right:4px; }
#printArea .tc-pdoc .tc-pn{ color:#444; font-size:10px; white-space:pre-wrap; }
#printArea .tc-pdoc .tc-sun{ color:#c62828; } #printArea .tc-pdoc .tc-sat{ color:#1565c0; }
`;
function tcEnsureDom(){
  if(document.getElementById('techoOverlay')) return;
  const st=document.createElement('style'); st.id='tcStyle'; st.textContent=TC_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="techoOverlay">
  <div class="modal vol-modal tc-modal">
    <div class="tc-shbar" id="tcShBar" hidden></div>
    <div class="tc-body">
      <section class="tc-cal" id="tcCal" data-hswipe="1" aria-label="月のカレンダー">
        <div class="tc-calnav">
          <button class="tc-nb" onclick="tcMonthMove(-1)" aria-label="前へ">◀</button>
          <b id="tcMonTitle"></b>
          <button class="tc-nb" onclick="tcMonthMove(1)" aria-label="次へ">▶</button>
          <span class="tc-sp"></span>
          <button class="tc-mini" onclick="tcGoToday()">今日</button>
          <button class="tc-mini" id="tcFoldBtn" onclick="tcToggleFold()" aria-label="月を畳む">▲</button>
          <button class="tc-mini tc-menubtn" id="tcMenuBtn" onclick="tcMenuOpen()" aria-label="メニュー" aria-haspopup="menu" title="さがす・メモ一覧・印刷・設定・閉じる">☰</button>
        </div>
        <div class="tc-wd" id="tcWd"></div>
        <div class="tc-grid" id="tcGrid"></div>
      </section>
      <div class="tc-split" id="tcSplit" role="separator" tabindex="0" aria-label="月と1日の仕切り（なぞって動かす・ダブルタップで元に戻す）" title="なぞって動かす・ダブルタップで元に戻す"></div>
      <section class="tc-day" aria-label="その日の予定とメモ">
        <div class="tc-daybar">
          <button class="tc-nb" onclick="tcDayMove(-1)" aria-label="前の日">◀</button>
          <b id="tcDayTitle"></b>
          <button class="tc-nb" onclick="tcDayMove(1)" aria-label="次の日">▶</button>
          <small id="tcDayHol"></small>
          <span class="tc-sp"></span>
          <span class="tc-seg" id="tcViewSeg" role="group" aria-label="列の分け方">
            <button data-v="split" onclick="tcSetView('split')">分ける</button><button data-v="merge" onclick="tcSetView('merge')">まとめる</button><button data-v="group" onclick="tcSetView('group')">組合せ</button>
          </span>
        </div>
        <div class="tc-chiprow"><div class="tc-chips" id="tcChips" role="group" aria-label="出す業務"></div>
          <span class="tc-seg tc-dm" id="tcDayModeSeg" role="group" aria-label="1日の見せ方"><button data-m="time" onclick="tcSetDayMode('time')" title="時間の目に予定を置く">🕘時間</button><button data-m="list" onclick="tcSetDayMode('list')" title="時間の目なしで、順番に並べる">☰個別</button></span></div>
        <div class="tc-cols" id="tcCols">
          <div class="tc-row tc-colhead" id="tcColHead"></div>
          <div class="tc-row tc-memorow" id="tcMemoRow"></div>
          <div class="tc-scroll" id="tcScroll" data-hswipe="1"><div class="tc-tgrid" id="tcTGrid"></div></div>
        </div>
      </section>
    </div>
    <div class="tc-snack" id="tcSnack" hidden></div>
    <div class="tc-menuov" id="tcMenuOv" onclick="if(event.target===this) tcMenuClose()">
      <div class="tc-menu" id="tcMenu" role="menu" aria-label="業務手帳のメニュー">
        <div class="tc-menutt">📔 業務手帳</div>
        <button role="menuitem" onclick="tcMenuDo(tcOpenFind)">🔍 さがす</button>
        <button role="menuitem" onclick="tcMenuDo(tcOpenBoard)">📝 メモ一覧</button>
        <button role="menuitem" onclick="tcMenuDo(tcOpenPrint)">🖨 印刷・PDF・画像</button>
        <button role="menuitem" onclick="tcMenuDo(tcOpenSet)">⚙ 設定</button>
        <button role="menuitem" id="tcMenuSync" onclick="tcMenuDo(()=>tcShSync({ask:true, say:true}))" hidden>⇅ 共有ファイルと合わせる</button>
        <button role="menuitem" class="tc-menux" onclick="tcMenuDo(closeTecho)"${window.APP_TECHO?' hidden':''}>✕ 業務手帳を閉じる</button>
      </div>
    </div>
    <form class="tc-add" id="tcAddForm" onsubmit="event.preventDefault(); tcAddSubmit();">
      <button type="button" class="tc-mic" id="tcMic" onclick="tcMicTap('add')" aria-label="声で登録">🎤</button>
      <input id="tcAddIn" type="text" enterkeyhint="done" autocomplete="off" maxlength="300" placeholder="例：明日10時 営業 A社訪問" aria-label="予定やメモを文で入れる">
      <button type="submit" class="tc-plus" aria-label="登録する">＋</button>
    </form>
  </div>
</div>
<div class="modal-overlay" id="techoBoardOverlay">
  <div class="modal vol-modal tc-modal">
    <div class="modal-header"><span>📝 メモ一覧</span><span class="hdr-right"><button class="modal-close" onclick="tcCloseBoard()" aria-label="閉じる">✕</button></span></div>
    <div class="tc-bodyfull">
      <div class="tc-tools">
        <span class="tc-segw" id="tcBdRange"></span>
        <label class="tc-chk"><input type="checkbox" id="tcBdUndone" onchange="tcRenderBoard()"> 未済だけ</label>
      </div>
      <div class="tc-bd" id="tcBd"></div>
    </div>
  </div>
</div>
<div class="modal-overlay" id="techoFindOverlay">
  <div class="modal vol-modal tc-modal">
    <div class="modal-header"><span>🔍 さがす</span><span class="hdr-right"><button class="modal-close" onclick="tcCloseFind()" aria-label="閉じる">✕</button></span></div>
    <div class="tc-bodyfull">
      <input class="tc-find" id="tcFindIn" type="search" placeholder="件名・メモ・業務の言葉" aria-label="さがす言葉" oninput="tcRenderFind()">
      <div class="tc-fres" id="tcFindRes"></div>
    </div>
  </div>
</div>
<div class="modal-overlay" id="techoSetOverlay">
  <div class="modal tc-setm">
    <div class="modal-header"><span>⚙ 業務手帳の設定</span><button class="modal-close" onclick="tcCloseSet()" aria-label="閉じる">✕</button></div>
    <div class="modal-body" id="tcSetBody"></div>
  </div>
</div>
<div class="modal-overlay" id="techoEditOverlay">
  <div class="modal tc-edm">
    <div class="modal-header"><span id="tcEdHdr">予定を足す</span><button class="modal-close" onclick="tcCloseEdit()" aria-label="閉じる">✕</button></div>
    <div class="modal-body">
      <div class="tc-heard" id="tcEdHeard" hidden></div>
      <div class="tc-kind" role="group" aria-label="種類"><button data-k="ev" onclick="tcEdKind('ev')">📅 予定</button><button data-k="memo" onclick="tcEdKind('memo')">📝 メモ</button></div>
      <div class="tc-f"><span class="tc-fl">件名</span><div class="tc-inrow"><input type="text" id="tcEdT" maxlength="200" aria-label="件名"><button type="button" class="tc-fmic" data-mic="t" onclick="tcMicTap('t')" aria-label="件名を声で入れる">🎤</button></div></div>
      <div class="tc-f"><span class="tc-fl">業務（いくつでも）</span><div class="tc-rolepick" id="tcEdRoles"></div></div>
      <div class="tc-f"><span class="tc-fl">日付</span><input type="date" id="tcEdDate" aria-label="日付"></div>
      <div class="tc-f" id="tcEdTimeW"><span class="tc-fl">時間</span><div class="tc-time">
        <label class="tc-chk"><input type="checkbox" id="tcEdAll" onchange="tcEdSync()"> 終日</label>
        <span id="tcEdTimes"><input type="text" id="tcEdS" class="tc-tfield" readonly inputmode="none" onclick="tcTimePick('tcEdS')" aria-label="はじまり（押して選ぶ）"> 〜 <input type="text" id="tcEdE" class="tc-tfield" readonly inputmode="none" onclick="tcTimePick('tcEdE')" aria-label="おわり（押して選ぶ）"></span></div></div>
      <div class="tc-f" id="tcEdDoneW"><label class="tc-chk"><input type="checkbox" id="tcEdDone"> 済み</label></div>
      <div class="tc-f"><span class="tc-fl">くり返し</span><div class="tc-time"><select id="tcEdRep" onchange="tcEdSync()" aria-label="くり返し">${TC_REPS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>
        <span id="tcEdUntilW">いつまで <input type="date" id="tcEdUntil" aria-label="いつまで"></span></div></div>
      <div class="tc-f"><span class="tc-fl">くわしいメモ</span><div class="tc-inrow"><textarea id="tcEdN" rows="3" maxlength="5000" aria-label="くわしいメモ"></textarea><button type="button" class="tc-fmic" data-mic="n" onclick="tcMicTap('n')" aria-label="メモを声で足す">🎤</button></div></div>
      <div class="tc-edbtns tc-edfoot"><button class="tc-del" id="tcEdDel" onclick="tcEdDelete()" aria-label="消す" title="消す">🗑</button><button id="tcEdDup" onclick="tcEdDup()" aria-label="複製" title="複製（同じものをもう1つ）">📋</button>
        <span class="tc-sp"></span><button onclick="tcCloseEdit()">やめる</button><button class="tc-save" onclick="tcEdSave()">保存</button></div>
    </div>
  </div>
</div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  // 入力欄で打った文字を、下の表のテンキー操作に渡さない
  ['techoOverlay','techoBoardOverlay','techoFindOverlay','techoSetOverlay','techoEditOverlay'].forEach(id=>{
    const el=document.getElementById(id);
    el.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  });
  document.getElementById('tcAddIn').addEventListener('keydown', e=>{ if(e.key==='Enter' && e.isComposing) e.stopPropagation(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
  tcBindCalSwipe();
  if(typeof bindHSwipe==='function'){
    bindHSwipe(document.getElementById('tcScroll'), d=>tcDayMove(d));
  }
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) tcStopListen();
    else if(isDlgOpen('techoOverlay')) tcShInit(true);   // 画面に戻ったら共有ファイルと合わせ直す
  });
}

/* ── 開く・閉じる ── */
let tcNowTimer=null;
function openTecho(){
  tcEnsureDom();
  tcLoad();
  if(!tcIsDate(tcSel)) tcSel=tcTodayIso();
  tcMon={y:+tcSel.slice(0,4), m:+tcSel.slice(5,7)};
  tcShownDay='';
  // 業務手帳だけのアプリ（?app=techo）では戻るで閉じない。いちばん下で戻ると、表電卓と同じく「もう一度でアプリを閉じる」
  if(window.APP_TECHO){ document.getElementById('techoOverlay').classList.add('open'); if(typeof applyNpToolFull==='function') applyNpToolFull(); }
  else openDlg('techoOverlay', tcOnClosed);
  tcBindSplit();
  tcRender();
  tcShInit(false);
  clearInterval(tcNowTimer);
  tcNowTimer=setInterval(()=>{ if(!isDlgOpen('techoOverlay')) return; if(tc.ui.dayMode==='list'){ if(tcSel===tcTodayIso()){ const sc=document.getElementById('tcScroll'), t=sc?sc.scrollTop:0; tcRenderDay(); if(sc) sc.scrollTop=t; } } else tcPlaceNow(); }, 60000);
}
function tcOnClosed(){
  tcStopListen(); clearInterval(tcNowTimer); tcNowTimer=null; tcHideSnack();
}
/* 月カレンダーを指で左右にめくる（v448）。指について動き、離すと次・前の月へすべって入れかわる。
   横に動かしはじめたら指をつかまえ（ブラウザに横の動きを取られると、途中で指の知らせが切れるため）、
   縦に動かしたときは何もしない（画面のスクロールのじゃまをしない） */
function tcBindCalSwipe(){
  const cal=document.getElementById('tcCal'), g=document.getElementById('tcGrid');
  if(!cal || !g || cal.dataset.cswipe) return;
  cal.dataset.cswipe='1';
  let x0=null, y0=0, id=null, dir=0, t0=0, lx=0;
  const put=(x, op, tr)=>{ g.style.transition=tr||'none'; g.style.transform=x?`translateX(${x}px)`:''; g.style.opacity=op==null?'':String(op); };
  cal.addEventListener('pointerdown', e=>{
    if((e.button!==undefined && e.button>0) || x0!==null) return;
    if(e.target.closest && e.target.closest('.tc-calnav, input, select, textarea')) return;   // ◀▶・今日・☰ はそのまま押せる
    x0=e.clientX; y0=e.clientY; lx=x0; id=e.pointerId; dir=0; t0=Date.now();
  });
  cal.addEventListener('pointermove', e=>{
    if(x0===null || e.pointerId!==id) return;
    const dx=e.clientX-x0, dy=e.clientY-y0; lx=e.clientX;
    if(!dir){
      if(Math.abs(dx)<8 && Math.abs(dy)<8) return;
      dir=Math.abs(dx)>Math.abs(dy)*1.2 ? 1 : 2;
      if(dir===1) try{ cal.setPointerCapture(id); }catch(_){}
    }
    if(dir!==1) return;
    put(dx, 1-Math.min(.6, Math.abs(dx)/(g.offsetWidth||300)));
  });
  const end=(e, cancel)=>{
    if(x0===null || e.pointerId!==id) return;
    const dx=(cancel?lx:e.clientX)-x0, fast=Math.abs(dx)>30 && Date.now()-t0<260, was=dir;
    x0=null; id=null; dir=0;
    if(was!==1) return;
    try{ npSwipeBlockUntil=Date.now()+400; }catch(_){}   // なぞった先の日が押されたことにならないように
    const w=g.offsetWidth||300;
    if(Math.abs(dx)<Math.min(70, w*.22) && !fast){ put(0, null, 'transform .18s ease-out, opacity .18s'); return; }   // 足りなければ戻す
    const d=dx<0 ? 1 : -1;                                // 左へ払う＝次の月／右へ払う＝前の月
    put(-d*w, 0, 'transform .14s ease-in, opacity .14s');
    setTimeout(()=>{
      tcMonthMove(d);
      put(d*w*.5, 0); void g.offsetWidth;               // 反対側から入ってくる
      put(0, null, 'transform .2s ease-out, opacity .2s');
    }, 140);
  };
  cal.addEventListener('pointerup', e=>end(e, false));
  cal.addEventListener('pointercancel', e=>end(e, true));
}
/* ☰ メニュー：▲ の右のボタンの下に出す。戻る・外を押す・もう一度 ☰ で閉じる */
function tcMenuOpen(){
  const ov=document.getElementById('tcMenuOv'), m=document.getElementById('tcMenu'), b=document.getElementById('tcMenuBtn');
  if(!ov || !m || !b) return;
  if(isDlgOpen('tcMenuOv')){ tcMenuClose(); return; }
  document.getElementById('tcMenuSync').hidden=!(typeof tcShHandle!=='undefined' && tcShHandle);
  document.body.appendChild(ov);   // いちばん上に重ねる
  openDlg('tcMenuOv');
  const r=b.getBoundingClientRect(), mw=m.offsetWidth||230;
  m.style.top=Math.round(r.bottom+4)+'px';
  m.style.left=Math.round(Math.max(8, Math.min(window.innerWidth-mw-8, r.right-mw)))+'px';
  const f=m.querySelector('button:not([hidden])'); if(f) try{ f.focus({preventScroll:true}); }catch(_){}
}
function tcMenuClose(){ closeDlg('tcMenuOv'); }
function tcMenuDo(fn){ tcMenuClose(); try{ fn(); }catch(_){ toast('うまく開けませんでした'); } }
function closeTecho(){
  if(!isDlgOpen('techoOverlay')) return;
  tcMenuClose();
  // 上に開いている窓から順に閉じる（戻るの履歴を崩さない）
  if(typeof closePrn==='function' && isDlgOpen('prnOverlay')) closePrn();
  if(isDlgOpen('tcAlDlg')) tcAliasClose();
  if(isDlgOpen('tcAlList')) tcAliasListClose();
  tcCloseEdit(); tcCloseSet(); tcCloseFind(); tcCloseBoard();
  if(window.APP_TECHO) return;                        // 業務手帳だけのアプリでは、業務手帳そのものは閉じない
  closeDlg('techoOverlay', tcOnClosed);
}

/* ── 描く ── */
function tcRender(){ tcApplySplit(); tcRenderCal(); tcRenderDay(); }

/* ── 月と1日の仕切り（横並びでは月の幅、縦並びでは月の高さ。なぞる・設定・ダブルタップで自動） ── */
function tcSide(){ return window.matchMedia(TC_SIDE_MQ).matches; }
function tcApplySplit(){
  const body=document.querySelector('#techoOverlay .tc-body'); if(!body || !tc) return;
  const u=tc.ui, side=tcSide();
  body.style.setProperty('--tc-calw', u.splitH ? u.splitH+'%' : '');
  if(!u.splitH) body.style.removeProperty('--tc-calw');
  body.style.setProperty('--tc-calh', (u.splitV||0)+'%');
  body.classList.toggle('sv', !!u.splitV);
  const cal=document.getElementById('tcCal'); if(cal) cal.classList.toggle('fold', !!u.calCollapsed);
  const sp=document.getElementById('tcSplit');
  if(sp){
    const k=side?'h':'v', v=side?u.splitH:u.splitV;
    sp.setAttribute('aria-orientation', side?'vertical':'horizontal');
    sp.setAttribute('aria-valuemin', TC_SPLIT[k][0]); sp.setAttribute('aria-valuemax', TC_SPLIT[k][1]);
    sp.setAttribute('aria-valuenow', v || tcSplitNow());
    sp.setAttribute('aria-valuetext', v ? v+'%' : '自動');
  }
}
/* いまの月の幅・高さ（%）。自動のときの見えている大きさから */
function tcSplitNow(){
  const body=document.querySelector('#techoOverlay .tc-body'), cal=document.getElementById('tcCal');
  if(!body || !cal) return 40;
  const br=body.getBoundingClientRect(), cr=cal.getBoundingClientRect(), side=tcSide();
  const tot=side?br.width:br.height; if(!tot) return 40;
  const k=side?'h':'v';
  return Math.min(TC_SPLIT[k][1], Math.max(TC_SPLIT[k][0], Math.round((side?cr.width:cr.height)/tot*100)));
}
function tcSetSplit(k, v, quiet){
  if(!tc) return;
  v=tcSplitVal(k, v);
  if(k==='v' && v && tc.ui.calCollapsed){ tc.ui.calCollapsed=false; tcMon={y:+tcSel.slice(0,4), m:+tcSel.slice(5,7)}; tc.ui.splitV=v; tcRender(); }
  if(k==='h') tc.ui.splitH=v; else tc.ui.splitV=v;
  tcApplySplit();
  if(!quiet) tcSave();
  const lab=document.getElementById(k==='h'?'tcSplitHV':'tcSplitVV'); if(lab) lab.textContent=v ? v+'%' : '自動';
  const rg=document.getElementById(k==='h'?'tcSplitHR':'tcSplitVR'); if(rg && v && +rg.value!==v) rg.value=v;
}
function tcBindSplit(){
  const sp=document.getElementById('tcSplit'); if(!sp || sp._tcBound) return; sp._tcBound=true;
  let drag=null, lastUp=0;
  sp.addEventListener('pointerdown', e=>{
    if(e.button>0) return;
    e.preventDefault();
    const body=sp.parentElement.getBoundingClientRect();
    drag={id:e.pointerId, x:e.clientX, y:e.clientY, moved:false, side:tcSide(), body};
    try{ sp.setPointerCapture(e.pointerId); }catch(_){}
  });
  sp.addEventListener('pointermove', e=>{
    if(!drag || e.pointerId!==drag.id) return;
    if(!drag.moved && Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)<4) return;
    drag.moved=true; sp.classList.add('drag');
    const b=drag.body, half=6;
    const pct=drag.side ? (e.clientX-half-b.left)/b.width*100 : (e.clientY-half-b.top)/b.height*100;
    tcSetSplit(drag.side?'h':'v', Math.round(pct), true);
  });
  const end=e=>{
    if(!drag || e.pointerId!==drag.id) return;
    const d=drag; drag=null; sp.classList.remove('drag');
    if(d.moved){ tcSave(); lastUp=0; return; }
    const now=Date.now();
    if(now-lastUp<400){ lastUp=0; tcSetSplit(d.side?'h':'v', 0); toast('仕切りを元に戻しました'); }
    else lastUp=now;
  };
  sp.addEventListener('pointerup', end);
  sp.addEventListener('pointercancel', e=>{ if(drag && e.pointerId===drag.id){ drag=null; sp.classList.remove('drag'); tcSave(); } });
  sp.addEventListener('keydown', e=>{
    const side=tcSide(), k=side?'h':'v';
    const d={ArrowLeft:side?-2:0, ArrowRight:side?2:0, ArrowUp:side?0:-2, ArrowDown:side?0:2}[e.key];
    if(e.key==='Home'){ e.preventDefault(); e.stopPropagation(); tcSetSplit(k, 0); return; }
    if(!d) return;
    e.preventDefault(); e.stopPropagation();
    tcSetSplit(k, ((side?tc.ui.splitH:tc.ui.splitV) || tcSplitNow())+d);
  });
  window.addEventListener('resize', ()=>{ if(isDlgOpen('techoOverlay')) tcApplySplit(); });
}
function tcRenderCal(){
  const today=tcTodayIso(), fold=tc.ui.calCollapsed;
  const wk=[0,1,2,3,4,5,6].map(i=>(i+tc.ui.wkStart)%7);
  document.getElementById('tcWd').innerHTML=wk.map(w=>`<span class="${w===0?'sun':w===6?'sat':''}">${TC_WD[w]}</span>`).join('');
  let first, n;
  if(fold){ first=tcWeekStart(tcSel); n=7; }
  else { first=tcWeekStart(tcIso(new Date(tcMon.y, tcMon.m-1, 1))); n=42; }
  const title=fold ? (+tcSel.slice(0,4))+'年'+(+tcSel.slice(5,7))+'月' : tcMon.y+'年'+tcMon.m+'月';
  document.getElementById('tcMonTitle').textContent=title;
  const fb=document.getElementById('tcFoldBtn');
  fb.textContent=fold?'▼':'▲'; fb.setAttribute('aria-label', fold?'月を広げる':'月を畳む（その週だけにする）');
  let h='';
  for(let i=0;i<n;i++){
    const ds=tcAdd(first, i), d=tcD(ds), w=d.getDay(), hol=tcHol(ds);
    const its=tcItemsOn(ds, true);
    const roleIds=[]; its.forEach(it=>it.roles.forEach(id=>{ if(!tc.ui.hidden.includes(id) && !roleIds.includes(id)) roleIds.push(id); }));
    const dots=tc.roles.filter(r=>roleIds.includes(r.id)).slice(0,5).map(r=>`<i style="--c:${r.color}"></i>`).join('');
    const cls=['tc-d', w===0?'sun':'', w===6?'sat':'', hol?'hol':'', ds===today?'today':'', ds===tcSel?'sel':'',
      (!fold && d.getMonth()+1!==tcMon.m)?'out':''].filter(Boolean).join(' ');
    const lb=(d.getMonth()+1)+'月'+d.getDate()+'日 '+TC_WD[w]+'曜'+(hol?' '+hol:'')+(its.length?' '+its.length+'件':'');
    const shown=its.filter(it=>it.roles.some(id=>!tc.ui.hidden.includes(id)))
      .sort((a,b)=>(a.kind==='memo')-(b.kind==='memo') || (b.allDay?1:0)-(a.allDay?1:0) || String(a.start||'').localeCompare(String(b.start||'')) || a.cre-b.cre);
    const tts=shown.slice(0,8).map(it=>{ const r=tc.roles.find(x=>it.roles.includes(x.id) && !tc.ui.hidden.includes(x.id)), c=r?r.color:'#888';
      return `<i class="${it.kind==='memo' && tcDoneOn(it, ds)?'dn':''}" style="--c:${c};--bgc:${tcTint(c,.16)}">${tcEsc(it.title||'（件名なし）')}</i>`; }).join('');
    h+=`<button class="${cls}" onclick="tcPick('${ds}')" aria-label="${tcEsc(lb)}"${hol?` title="${tcEsc(hol)}"`:''}><span class="tc-dn">${d.getDate()}</span><span class="tc-dots">${dots}</span><span class="tc-dts" aria-hidden="true">${tts}</span></button>`;
  }
  document.getElementById('tcGrid').innerHTML=h;
  tcFitCalTitles();
}
/* マスの高さが件名1行ぶん入る大きさなら、件名を出す（なければ点のまま） */
function tcFitCalTitles(){
  const g=document.getElementById('tcGrid'); if(!g) return;
  const d=g.querySelector('.tc-d'); if(!d) return;
  const h=d.getBoundingClientRect().height;
  if(h>0) g.classList.toggle('tt', h>=34);
  if(!g._tcRO && typeof ResizeObserver!=='undefined'){
    g._tcRO=new ResizeObserver(()=>{ requestAnimationFrame(tcFitCalTitles); });
    g._tcRO.observe(g);
  }
}
function tcRenderDay(){
  document.getElementById('tcDayTitle').textContent=tcMD(tcSel)+(tcSel===tcTodayIso()?' 今日':'');
  document.getElementById('tcDayHol').textContent=tcHol(tcSel);
  document.querySelectorAll('#tcViewSeg button').forEach(b=>b.classList.toggle('on', b.dataset.v===tc.ui.view));
  document.getElementById('tcChips').innerHTML=tc.roles.map(r=>{
    const off=tc.ui.hidden.includes(r.id);
    return `<button class="tc-chip${off?' off':''}" style="--c:${r.color};--bgc:${tcTint(r.color,.14)}" aria-pressed="${!off}" onclick="tcToggleRole('${r.id}')">${tcEsc(r.name)}</button>`;
  }).join('');
  const cols=tcColumns(), n=Math.max(1, cols.length), H=tcHourPx();
  const wrap=document.getElementById('tcCols');
  wrap.style.setProperty('--n', n); wrap.style.setProperty('--h', H+'px');
  document.getElementById('tcColHead').innerHTML='<div></div>'+cols.map(c=>
    `<div>${c.roles.map(r=>`<i style="--c:${r.color}"></i>`).join('')}<span class="tc-cn">${tcEsc(c.name)}</span></div>`).join('');
  const its=tcItemsOn(tcSel, true), lm=tc.ui.dayMode==='list';
  wrap.classList.toggle('lm', lm);
  document.querySelectorAll('#tcDayModeSeg button').forEach(b=>{ const on=b.dataset.m===(lm?'list':'time'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  if(lm){ tcRenderList(cols, its); return; }
  // メモと終日の予定
  let mh='<div class="tc-lab">メモ<br>終日</div>';
  cols.forEach((c, ci)=>{
    const mine=its.filter(it=>(it.kind==='memo' || it.allDay) && it.roles.some(id=>c.ids.includes(id)));
    mine.sort((a,b)=>(a.kind==='memo')-(b.kind==='memo') || tcDoneOn(a,tcSel)-tcDoneOn(b,tcSel) || a.cre-b.cre);
    mh+='<div class="tc-mcell">'+mine.map(it=>{
      const cs=tcColOf(it, c.ids), c0=cs[0]||'#888', rep=it.rep?' ↻':'';
      if(it.kind==='ev') return `<button class="tc-ad" data-id="${it.id}" style="--c:${c0}" onclick="tcOpenItem('${it.id}','${tcSel}')">${tcEsc(it.title||'（件名なし）')}${rep}</button>`;
      const dn=tcDoneOn(it, tcSel);
      return `<div class="tc-m${dn?' done':''}" data-id="${it.id}" style="--c:${c0};--bgc:${tcTint(c0,.12)}"><button class="tc-ck" onclick="tcToggleDone('${it.id}','${tcSel}')" aria-label="${dn?'済みをやめる':'済みにする'}">${dn?'☑':'☐'}</button>`
        +`<button class="tc-mt" onclick="tcOpenItem('${it.id}','${tcSel}')">${tcEsc(it.title||'（件名なし）')}${rep}</button></div>`;
    }).join('')+`<button class="tc-madd" onclick="tcNewItem('memo','${tcSel}',${ci})" aria-label="${tcEsc(c.name)}にメモを足す">＋メモ</button></div>`;
  });
  document.getElementById('tcMemoRow').innerHTML=mh;
  // 時間の表
  let hh='<div class="tc-hours">';
  for(let i=1;i<24;i++) hh+=`<span style="top:${i*H}px">${i}:00</span>`;
  hh+='</div><div class="tc-tcols">';
  cols.forEach((c, ci)=>{
    const evs=its.filter(it=>it.kind==='ev' && !it.allDay && it.roles.some(id=>c.ids.includes(id)))
      .map(it=>{ const s=tcMin(it.start); let e=tcMin(it.end); if(e<=s) e=Math.min(24*60, s+60); return {it, s, e:Math.max(e, s+25)}; });
    tcLayout(evs);
    hh+=`<div class="tc-tcol" onclick="tcGridTap(event,${ci})">`+evs.map(v=>{
      const cs=tcColOf(v.it, c.ids), c0=cs[0]||'#888';
      const top=v.s/60*H, ht=Math.max(20, (v.e-v.s)/60*H-2), w=100/v.lanes;
      const more=cs.slice(1).map(x=>`<span class="tc-rd" style="background:${x}"></span>`).join('');
      return `<button class="tc-ev" data-id="${v.it.id}" style="--c:${c0};--bgc:${tcTint(c0,.18)};top:${top}px;height:${ht}px;left:calc(${v.lane*w}% + 1px);width:calc(${w}% - 3px)"`
        +` onclick="event.stopPropagation();tcOpenItem('${v.it.id}','${tcSel}')"><b>${v.it.start}〜${v.it.end}${v.it.rep?' ↻':''}${more}</b>${tcEsc(v.it.title||'（件名なし）')}</button>`;
    }).join('')+'</div>';
  });
  hh+='</div><div class="tc-now" id="tcNow" hidden></div>';
  const tg=document.getElementById('tcTGrid');
  tg.style.height=(24*H)+'px';
  tg.innerHTML=cols.length ? hh : '<div class="tc-empty">出す業務がありません。上の業務を押して出してください。</div>';
  tcPlaceNow();
  if(tcShownDay!==tcSel){ tcShownDay=tcSel; tcScrollDay(its); }
}
/* 個別の見せ方：時間の目なしで、列ごとに 終日 → 時刻の順の予定 → メモ の順に並べ、頭の上に時刻を出す */
function tcRenderList(cols, its){
  document.getElementById('tcMemoRow').innerHTML='';
  const today=tcSel===tcTodayIso(), nowM=today ? (()=>{ const n=tcNow(); return n.getHours()*60+n.getMinutes(); })() : -1;
  const note=it=>{ const l=(it.note||'').split('\n').find(x=>x.trim()); return l ? `<span class="tc-cn2">${tcEsc(l.trim())}</span>` : ''; };
  let h='<div class="tc-list">';
  cols.forEach((c, ci)=>{
    const mine=its.filter(it=>it.roles.some(id=>c.ids.includes(id)));
    const ad=mine.filter(it=>it.kind==='ev' && it.allDay).sort((a,b)=>a.cre-b.cre);
    const tm=mine.filter(it=>it.kind==='ev' && !it.allDay).sort((a,b)=>a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.cre-b.cre);
    const mm=mine.filter(it=>it.kind==='memo').sort((a,b)=>tcDoneOn(a,tcSel)-tcDoneOn(b,tcSel) || a.cre-b.cre);
    const card=(it, head, past)=>{
      const cs=tcColOf(it, c.ids), c0=cs[0]||'#888';
      const more=cs.slice(1).map(x=>`<i style="background:${x}"></i>`).join('');
      const memo=it.kind==='memo', dn=memo && tcDoneOn(it, tcSel);
      return `<div class="tc-card${past?' past':''}${dn?' done':''}" data-id="${it.id}" style="--c:${c0};--bgc:${tcTint(c0, memo?.12:.18)}">`
        +(memo ? `<button class="tc-ck" onclick="tcToggleDone('${it.id}','${tcSel}')" aria-label="${dn?'済みをやめる':'済みにする'}">${dn?'☑':'☐'}</button>` : '')
        +`<button class="tc-cbtn" onclick="tcOpenItem('${it.id}','${tcSel}')"><span class="tc-ct">${head}${it.rep?' ↻':''}${more}</span>`
        +`<span class="tc-cb">${tcEsc(it.title||'（件名なし）')}</span>${note(it)}</button></div>`;
    };
    let b='';
    ad.forEach(it=>{ b+=card(it, '終日', false); });
    let nowDone=!today;
    tm.forEach(it=>{
      if(!nowDone && tcMin(it.start)>nowM){ b+='<div class="tc-lnow" role="img" aria-label="いま"></div>'; nowDone=true; }
      b+=card(it, it.start+'〜'+it.end, today && tcMin(it.end)<=nowM);
    });
    if(!nowDone && tm.length) b+='<div class="tc-lnow" role="img" aria-label="いま"></div>';
    mm.forEach(it=>{ b+=card(it, 'メモ', false); });
    if(!mine.length) b+='<div class="tc-lnone">予定・メモなし</div>';
    b+=`<div class="tc-ladd"><button class="tc-madd" onclick="tcNewItem('ev','${tcSel}',${ci})" aria-label="${tcEsc(c.name)}に予定を足す">＋予定</button><button class="tc-madd" onclick="tcNewItem('memo','${tcSel}',${ci})" aria-label="${tcEsc(c.name)}にメモを足す">＋メモ</button></div>`;
    h+=`<div class="tc-lcol">${b}</div>`;
  });
  h+='</div>';
  const tg=document.getElementById('tcTGrid');
  tg.style.height='';
  tg.innerHTML=cols.length ? h : '<div class="tc-empty">出す業務がありません。上の業務を押して出してください。</div>';
  if(tcShownDay!==tcSel){ tcShownDay=tcSel; const sc=document.getElementById('tcScroll'); if(sc) sc.scrollTop=0; }
}
/* 重なった予定を、列の中で横に並べる */
function tcLayout(evs){
  evs.sort((a,b)=>a.s-b.s || b.e-a.e);
  let group=[], end=-1;
  const flush=()=>{
    const lanes=[];
    group.forEach(v=>{ let i=lanes.findIndex(x=>x<=v.s); if(i<0){ i=lanes.length; lanes.push(0); } lanes[i]=v.e; v.lane=i; });
    group.forEach(v=>{ v.lanes=lanes.length; });
    group=[];
  };
  evs.forEach(v=>{ if(group.length && v.s>=end){ flush(); end=-1; } group.push(v); end=Math.max(end, v.e); });
  flush();
}
function tcPlaceNow(){
  const el=document.getElementById('tcNow'); if(!el) return;
  if(tcSel!==tcTodayIso() || !tcColumns().length){ el.hidden=true; return; }
  const n=tcNow(); el.hidden=false; el.style.top=((n.getHours()*60+n.getMinutes())/60*tcHourPx())+'px';
}
/* 日を変えたときは、その日の予定のはじめ（今日なら今の時刻）が見えるところへ */
function tcScrollDay(its){
  const sc=document.getElementById('tcScroll'); if(!sc) return;
  let m=8*60;
  if(tc.ui.dayTop!=='now') m=tc.ui.dayTop*60;   // 設定で決めた時刻から見せる
  else if(tcSel===tcTodayIso()){ const n=tcNow(); m=Math.max(0, n.getHours()*60+n.getMinutes()-60); }
  else { const t=(its||[]).filter(it=>it.kind==='ev' && !it.allDay).map(it=>tcMin(it.start)); if(t.length) m=Math.max(0, Math.min(...t)-30); }
  sc.scrollTop=Math.max(0, m/60*tcHourPx()-4);
}

/* ── 動かす ── */
function tcPick(ds){
  if(!tcIsDate(ds)) return;
  tcSel=ds;
  if(!tc.ui.calCollapsed){ const y=+ds.slice(0,4), m=+ds.slice(5,7); if(y!==tcMon.y || m!==tcMon.m) tcMon={y, m}; }
  tcRender();
}
function tcMonthMove(d){
  if(tc.ui.calCollapsed){ tcPick(tcAdd(tcSel, 7*d)); return; }
  let y=tcMon.y, m=tcMon.m+d; if(m<1){ m=12; y--; } if(m>12){ m=1; y++; }
  tcMon={y, m};
  // 選んでいる日も、その月の同じ日（なければ月末）へ
  const day=Math.min(+tcSel.slice(8,10), new Date(y, m, 0).getDate());
  tcSel=tcYmd(y, m, day);
  tcRender();
}
function tcDayMove(d){ tcPick(tcAdd(tcSel, d)); }
function tcGoToday(){ tcShownDay=''; tcPick(tcTodayIso()); }
function tcToggleFold(){
  tc.ui.calCollapsed=!tc.ui.calCollapsed; tcSave();
  if(!tc.ui.calCollapsed) tcMon={y:+tcSel.slice(0,4), m:+tcSel.slice(5,7)};
  tcRender();
}
/* 1日の見せ方：time＝時間の目に置く（前から）／list＝個別（時間の目なしで順番に並べ、頭の上に時刻） */
function tcSetDayMode(m){
  tc.ui.dayMode=m==='list'?'list':'time'; tcShownDay=''; tcSave(); tcRenderDay();
}
function tcSetView(v){
  if(!['split','merge','group'].includes(v)) return;
  tc.ui.view=v; tcSave(); tcRender();
  if(v==='group' && typeof toast==='function') toast('組み合わせの列は ⚙設定 の「列」で決められます', 3200);
}
function tcToggleRole(id){
  const h=tc.ui.hidden, i=h.indexOf(id);
  if(i>=0) h.splice(i,1);
  else {
    if(tc.roles.length-h.length<=1){ toast('ひとつは出しておきます'); return; }
    h.push(id);
  }
  tcSave(); tcRender();
}
/* 時間の表の空いたところを押した：その列の業務・その時刻で新しい予定 */
function tcGridTap(e, ci){
  if(e.target.closest('.tc-ev')) return;
  const col=e.currentTarget, r=col.getBoundingClientRect();
  const min=Math.max(0, Math.min(23*60+30, Math.floor((e.clientY-r.top)/tcHourPx()*2)*30));
  tcNewItem('ev', tcSel, ci, tcHM(min));
}

/* ── 足す・直す ── */
let tcEd=null;          // 入力画面の中身 {id|null, occ, heard, it:{…}}
function tcDefaultRoles(ci){
  const cols=tcColumns();
  if(ci!=null && cols[ci]) return [cols[ci].ids[0]];
  const vis=tcVisRoles().map(r=>r.id);
  return [vis.includes(tc.ui.lastRole) ? tc.ui.lastRole : (vis[0]||tc.roles[0].id)];
}
function tcNewItem(kind, ds, ci, start){
  const it={id:null, kind:kind==='memo'?'memo':'ev', roles:tcDefaultRoles(ci), date:ds||tcSel, allDay:false,
    start:start||null, end:null, title:'', note:'', done:false, rep:null};
  if(it.kind==='ev'){
    if(!it.start){ const n=tcNow(); it.start=tcHM(Math.min(22*60, (n.getHours()+1)*60)); }
    it.end=tcAddMin(it.start, 60);
  }
  tcOpenEdit(it, null, '');
}
function tcOpenItem(id, ds){
  const it=tc.items.find(x=>x.id===id); if(!it) return;
  tcOpenEdit(JSON.parse(JSON.stringify(it)), it.rep ? ds : null, '');
}
function tcOpenEdit(it, occ, heard){
  tcStopListen();
  tcEd={id:it.id, occ, heard, it, learn:heard ? it.title : (it.id && tcLearnSrc[it.id]) || null};
  const $=id=>document.getElementById(id);
  $('tcEdHdr').textContent=it.id ? (it.kind==='memo'?'メモを直す':'予定を直す') : (it.kind==='memo'?'メモを足す':'予定を足す');
  const hd=$('tcEdHeard'); hd.hidden=!heard; hd.textContent=heard ? '聞き取った言葉：「'+heard+'」' : '';
  $('tcEdT').value=it.title||'';
  $('tcEdDate').value=occ||it.date;
  $('tcEdAll').checked=!!it.allDay;
  $('tcEdS').value=it.start||'09:00'; $('tcEdE').value=it.end||tcAddMin(it.start||'09:00', 60);
  $('tcEdDone').checked=occ ? tcDoneOn(it, occ) : !!it.done;
  $('tcEdRep').value=tcRepKey(it.rep);
  $('tcEdUntil').value=(it.rep && it.rep.until)||'';
  $('tcEdN').value=it.note||'';
  $('tcEdDel').style.display=it.id?'':'none';
  $('tcEdDup').style.display=it.id?'':'none';
  tcEdRenderRoles(); tcEdKind(it.kind, true);
  openDlg('techoEditOverlay', ()=>{ tcStopListen(); tcEd=null; });
  if(!it.id && !heard) setTimeout(()=>{ const t=$('tcEdT'); if(t && isDlgOpen('techoEditOverlay')) t.focus(); }, 120);
}
function tcCloseEdit(){ tcStopListen(); closeDlg('techoEditOverlay', ()=>{ tcEd=null; }); }
function tcEdRenderRoles(){
  if(!tcEd) return;
  document.getElementById('tcEdRoles').innerHTML=tc.roles.map(r=>{
    const on=tcEd.it.roles.includes(r.id);
    return `<button type="button" class="tc-chip${on?'':' off'}" style="--c:${r.color};--bgc:${tcTint(r.color,.16)}" aria-pressed="${on}" onclick="tcEdRole('${r.id}')">${tcEsc(r.name)}</button>`;
  }).join('');
}
function tcEdRole(id){
  if(!tcEd) return;
  const a=tcEd.it.roles, i=a.indexOf(id);
  if(i>=0){ if(a.length<=1){ toast('業務はひとつは選んでください'); return; } a.splice(i,1); }
  else a.push(id);
  tcEdRenderRoles();
}
function tcEdKind(k, quiet){
  if(!tcEd) return;
  tcEd.it.kind=k==='memo'?'memo':'ev';
  document.querySelectorAll('#techoEditOverlay .tc-kind button').forEach(b=>b.classList.toggle('on', b.dataset.k===tcEd.it.kind));
  if(!quiet) document.getElementById('tcEdHdr').textContent=(tcEd.id?(tcEd.it.kind==='memo'?'メモを直す':'予定を直す'):(tcEd.it.kind==='memo'?'メモを足す':'予定を足す'));
  tcEdSync();
}
function tcEdSync(){
  if(!tcEd) return;
  const $=id=>document.getElementById(id), ev=tcEd.it.kind==='ev';
  $('tcEdTimeW').style.display=ev?'':'none';
  $('tcEdDoneW').style.display=ev?'none':'';
  $('tcEdTimes').style.display=$('tcEdAll').checked?'none':'';
  $('tcEdUntilW').style.display=$('tcEdRep').value?'':'none';
}
/* 入力画面の中身を集める（おかしなところがあれば知らせて null） */
function tcEdCollect(){
  const $=id=>document.getElementById(id), it=JSON.parse(JSON.stringify(tcEd.it));
  it.title=$('tcEdT').value.trim().slice(0,200);
  it.note=$('tcEdN').value.replace(/\s+$/,'').slice(0,5000);
  if(!it.title && it.note) it.title=it.note.split('\n')[0].slice(0,60);
  if(!it.title){ toast('件名を入れてください'); $('tcEdT').focus(); return null; }
  const ds=$('tcEdDate').value;
  if(!tcIsDate(ds)){ toast('日付を選んでください'); return null; }
  it.date=ds;
  if(it.kind==='ev'){
    it.allDay=$('tcEdAll').checked;
    if(it.allDay){ it.start=null; it.end=null; }
    else {
      const s=$('tcEdS').value, e=$('tcEdE').value;
      if(!tcIsTime(s)){ toast('はじまりの時刻を入れてください'); return null; }
      it.start=s; it.end=(tcIsTime(e) && e>s) ? e : tcAddMin(s, 60);
    }
    it.done=false;
  } else { it.allDay=false; it.start=null; it.end=null; it.done=$('tcEdDone').checked; }
  const rk=$('tcEdRep').value, until=$('tcEdUntil').value;
  if(rk){
    const old=tcEd.it.rep;
    it.rep={f:rk==='w2'?'w':rk, n:rk==='w2'?2:1, until:tcIsDate(until)&&until>=ds?until:null, ex:old?old.ex.slice():[], dd:old?old.dd.slice():[]};
  } else it.rep=null;
  return it;
}
/* 時刻を選ぶ窓（端末の時刻選びは閉じ方が分かりにくいので、自前で「決定」ボタンを出す）。
   時と分（5分きざみ）を押して「決定」。はじまりを変えたら、おわりも同じ長さだけずらす。 */
let tcTp=null;
function tcTimePick(id){
  const f=document.getElementById(id); if(!f) return;
  const v=tcIsTime(f.value) ? f.value : '09:00';
  tcTp={id, h:+v.slice(0,2), m:Math.min(55, Math.round(+v.slice(3)/5)*5), m0:+v.slice(3)};
  if(tcTp.m0%5) tcTp.m=null;   // 5分きざみでない分はそのまま残す
  let ov=document.getElementById('tcTimePick');
  if(!ov){
    ov=document.createElement('div'); ov.id='tcTimePick';
    ov.addEventListener('click', e=>{ if(e.target===ov) tcTimePickClose(); });
    document.body.appendChild(ov);
  }
  tcTimePickRender();
  openDlg('tcTimePick', ()=>{ tcTp=null; });
}
function tcTimePickRender(){
  const ov=document.getElementById('tcTimePick'); if(!ov || !tcTp) return;
  const mm=tcTp.m==null ? tcTp.m0 : tcTp.m;
  const hb=(h)=>`<button type="button" class="${h===tcTp.h?'on':''}" onclick="tcTpSet('h',${h})">${h}</button>`;
  const mb=(m)=>`<button type="button" class="${m===tcTp.m?'on':''}" onclick="tcTpSet('m',${m})">${tcP2(m)}</button>`;
  ov.innerHTML=`<div class="tc-tp" role="dialog" aria-label="時刻を選ぶ">
    <div class="tc-tphd"><span>${tcTp.id==='tcEdS'?'はじまり':'おわり'}の時刻</span><span class="tc-tpnow" id="tcTpNow">${tcP2(tcTp.h)}:${tcP2(mm)}</span></div>
    <div class="tc-tpl">時（午前）</div><div class="tc-tpg">${[0,1,2,3,4,5,6,7,8,9,10,11].map(hb).join('')}</div>
    <div class="tc-tpl">時（午後）</div><div class="tc-tpg">${[12,13,14,15,16,17,18,19,20,21,22,23].map(hb).join('')}</div>
    <div class="tc-tpl">分</div><div class="tc-tpg">${[0,5,10,15,20,25,30,35,40,45,50,55].map(mb).join('')}</div>
    <div class="tc-tpft"><button type="button" onclick="tcTimePickClose()">やめる</button><button type="button" class="tc-tpok" onclick="tcTimePickOk()">決定</button></div></div>`;
}
function tcTpSet(k, v){ if(!tcTp) return; tcTp[k]=v; tcTimePickRender(); }
function tcTimePickClose(){ closeDlg('tcTimePick', ()=>{ tcTp=null; }); }
function tcTimePickOk(){
  if(!tcTp) return;
  const $=id=>document.getElementById(id);
  const v=tcP2(tcTp.h)+':'+tcP2(tcTp.m==null ? tcTp.m0 : tcTp.m);
  if(tcTp.id==='tcEdS'){
    const s0=$('tcEdS').value, e0=$('tcEdE').value;
    const dur=(tcIsTime(s0) && tcIsTime(e0) && e0>s0) ? tcMin(e0)-tcMin(s0) : 60;
    $('tcEdS').value=v; $('tcEdE').value=tcAddMin(v, dur);
  } else {
    $('tcEdE').value=v;
    if(tcIsTime($('tcEdS').value) && v<=$('tcEdS').value) toast('おわりが、はじまりより前です（保存すると1時間にします）');
  }
  tcTimePickClose();
}
function tcChoose(msg, opts){
  return new Promise(res=>{
    const ov=document.createElement('div'); ov.className='tc-choose';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)';
    ov.innerHTML=`<div style="background:var(--modal-bg,#fff);color:var(--text,#222);max-width:92vw;width:340px;padding:16px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.35)">
      <div style="font-weight:bold;margin-bottom:12px;line-height:1.5">${tcEsc(msg)}</div>
      ${opts.map((o,i)=>`<button data-i="${i}" style="display:block;width:100%;height:42px;margin-top:6px;border-radius:8px;border:1px solid rgba(120,132,156,.45);background:${i===0?'var(--acc)':'rgba(120,132,156,.12)'};color:${i===0?'#fff':'var(--text,#222)'};font-weight:bold;font-size:14px">${tcEsc(o)}</button>`).join('')}
      <button data-i="-1" style="display:block;width:100%;height:40px;margin-top:10px;border:none;background:none;color:var(--text-light,#888);font-size:14px">やめる</button></div>`;
    ov.addEventListener('click', e=>{
      const b=e.target.closest('button'); if(!b && e.target!==ov) return;
      const i=b ? +b.dataset.i : -1; ov.remove(); if(typeof appModalOpen!=='undefined') appModalOpen=false; res(i);
    });
    if(typeof appModalOpen!=='undefined') appModalOpen=true;
    document.body.appendChild(ov);
  });
}
const TC_SCOPES=['この日だけ','この日から先','ぜんぶ'];
/* 声で登録したものの件名を直したら、その直し方を言いかえとして覚えるか聞く（v445） */
async function tcEdSave(){
  const lf=tcEd && tcEd.learn, id0=tcEd && tcEd.id;
  const nt=(document.getElementById('tcEdT')||{}).value;
  await tcEdSave0();
  if(lf && typeof nt==='string' && !isDlgOpen('techoEditOverlay')){
    if(id0) delete tcLearnSrc[id0];
    const t=nt.trim(); if(t && t!==lf) await tcLearnPropose(lf, t);
  }
}
async function tcEdSave0(){
  if(!tcEd) return;
  const it=tcEdCollect(); if(!it) return;
  const now=Date.now();
  if(!tcEd.id){
    it.id=tcNewId(); it.cre=now; it.upd=now;
    tc.items.push(it);
    tcAfterSave(it, it.date);
    return;
  }
  const orig=tc.items.find(x=>x.id===tcEd.id);
  if(!orig){ tcCloseEdit(); return; }
  const occ=tcEd.occ;
  if(orig.rep && occ){
    const k=await tcChoose('くり返しの予定です。どこを変えますか', TC_SCOPES);
    if(k<0) return;
    if(k===0){                                   // この日だけ：くり返しから外して、1回だけの予定を作る
      orig.rep.ex.push(occ); orig.rep.dd=orig.rep.dd.filter(x=>x!==occ); orig.upd=now;
      const one=Object.assign({}, it, {id:tcNewId(), rep:null, cre:now, upd:now});
      if(one.kind==='memo') one.done=document.getElementById('tcEdDone').checked;
      tc.items.push(one); tcAfterSave(one, one.date); return;
    }
    if(k===1 && occ>orig.date){                  // この日から先：前のくり返しはきのうまで、この日から新しく
      orig.rep.until=tcAdd(occ,-1); orig.upd=now;
      const nx=Object.assign({}, it, {id:tcNewId(), cre:now, upd:now});
      if(nx.rep){ nx.rep.ex=nx.rep.ex.filter(x=>x>=nx.date); nx.rep.dd=nx.rep.dd.filter(x=>x>=nx.date); }
      tc.items.push(nx); tcAfterSave(nx, nx.date); return;
    }
    // ぜんぶ：日付を動かしたら、はじまりも同じだけずらす
    const shift=tcDiff(occ, it.date);
    it.date=tcAdd(orig.date, shift);
    if(it.kind==='memo' && it.rep){ const dd=it.rep.dd.filter(x=>x!==occ); if(document.getElementById('tcEdDone').checked) dd.push(occ); it.rep.dd=dd; it.done=false; }
    Object.assign(orig, it, {id:orig.id, cre:orig.cre, upd:now});
    tcAfterSave(orig, tcAdd(occ, shift)); return;
  }
  if(it.kind==='memo' && it.rep){ it.done=false; }
  Object.assign(orig, it, {id:orig.id, cre:orig.cre, upd:now});
  tcAfterSave(orig, it.date);
}
function tcAfterSave(it, ds){
  tc.ui.lastRole=it.roles[0];
  tcSave(); tcCloseEdit();
  tcPick(tcIsDate(ds)?ds:it.date);
  tcFlash(it.id);
}
async function tcEdDelete(){
  if(!tcEd || !tcEd.id) return;
  const orig=tc.items.find(x=>x.id===tcEd.id); if(!orig){ tcCloseEdit(); return; }
  const occ=tcEd.occ;
  if(orig.rep && occ){
    const k=await tcChoose('くり返しの予定です。どこを消しますか', TC_SCOPES);
    if(k<0) return;
    if(k===0){ orig.rep.ex.push(occ); orig.upd=Date.now(); }
    else if(k===1 && occ>orig.date){ orig.rep.until=tcAdd(occ,-1); orig.upd=Date.now(); }
    else { tc.items=tc.items.filter(x=>x!==orig); tcTomb(orig.id); }
  } else {
    if(!await appConfirm('「'+(orig.title||'（件名なし）')+'」を消しますか', '消す', 'やめる')) return;
    tc.items=tc.items.filter(x=>x!==orig); tcTomb(orig.id);
  }
  tcSave(); tcCloseEdit(); tcRender(); toast('消しました');
}
function tcEdDup(){
  if(!tcEd || !tcEd.id) return;
  const it=tcEdCollect(); if(!it) return;
  const now=Date.now(), cp=Object.assign({}, it, {id:tcNewId(), cre:now, upd:now});
  if(cp.rep){ cp.rep.ex=[]; cp.rep.dd=[]; }
  tc.items.push(cp); tcAfterSave(cp, cp.date); toast('複製しました');
}
function tcToggleDone(id, ds){
  const it=tc.items.find(x=>x.id===id); if(!it) return;
  if(it.rep){ const i=it.rep.dd.indexOf(ds); if(i>=0) it.rep.dd.splice(i,1); else it.rep.dd.push(ds); }
  else it.done=!it.done;
  it.upd=Date.now(); tcSave();
  tcRenderDay();
  if(isDlgOpen('techoBoardOverlay')) tcRenderBoard();
}
function tcFlash(id){
  requestAnimationFrame(()=>{
    const els=[...document.querySelectorAll('#techoOverlay [data-id="'+id+'"]')];
    els.forEach(el=>{ el.classList.remove('tc-flash'); void el.offsetWidth; el.classList.add('tc-flash'); });
    const ev=els.find(el=>el.classList.contains('tc-ev'));
    const sc=document.getElementById('tcScroll');
    if(ev && sc){ const t=parseFloat(ev.style.top)||0; if(t<sc.scrollTop || t>sc.scrollTop+sc.clientHeight-30) sc.scrollTop=Math.max(0, t-40); }
    const m=els.find(el=>!el.classList.contains('tc-ev')); if(m && m.scrollIntoView) m.scrollIntoView({block:'nearest'});
  });
}
/* すぐ登録したときの知らせ（直す・取り消し） */
let tcSnackTimer=null, tcSnackId=null;
function tcShowSnack(it, ds){
  const el=document.getElementById('tcSnack'); if(!el) return;
  tcSnackId=it.id;
  const when=tcMDs(ds)+' '+(it.kind==='memo'?'メモ':(it.allDay?'終日':it.start+'〜'+it.end))+(it.rep?' ↻'+tcRepLabel(it):'');
  el.innerHTML=`<span class="tc-st">✔ 登録しました：${tcEsc(when)} ${tcEsc(tcRoleNames(it.roles))}「${tcEsc(it.title)}」</span>`
    +`<button onclick="tcSnackEdit()">直す</button><button onclick="tcSnackUndo()">取り消し</button>`;
  el.hidden=false;
  clearTimeout(tcSnackTimer); tcSnackTimer=setTimeout(tcHideSnack, 8000);
}
function tcHideSnack(){ const el=document.getElementById('tcSnack'); if(el) el.hidden=true; clearTimeout(tcSnackTimer); }
function tcSnackEdit(){ const id=tcSnackId; tcHideSnack(); const it=tc.items.find(x=>x.id===id); if(it) tcOpenItem(id, tcNextOcc(it, it.date)||it.date); }
function tcSnackUndo(){
  const id=tcSnackId; tcHideSnack();
  const n=tc.items.length; tc.items=tc.items.filter(x=>x.id!==id);
  if(tc.items.length<n){ tcTomb(id); tcSave(); tcRender(); toast('取り消しました'); }
}

/* ── 声・文から読む：「明日の10時から11時 営業でA社訪問」→ 日付・時刻・業務・件名 ── */
const TC_KNUM={'〇':0,'零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
function tcKan(s){
  let total=0, num=0, any=false;
  for(const ch of s){
    const d=TC_KNUM[ch];
    if(d!==undefined){ num=num*10+d; any=true; continue; }
    const u={'十':10,'百':100,'千':1000}[ch];
    if(!u) return null;
    total+=(num||1)*u; num=0; any=true;
  }
  return any ? total+num : null;
}
const TC_KN='[〇零一二三四五六七八九十百千]+';
function tcNormText(s){
  s=String(s||'').normalize('NFKC').replace(/[　\s]+/g,' ').trim();
  const cv=m=>{ const v=tcKan(m); return v==null ? m : String(v); };
  // 漢数字は、日付・時刻の言葉の前だけ数字にする（「一時停止」「一番」はそのまま）
  s=s.replace(new RegExp(TC_KN+'(?=(日|月|週|年|曜|時間|か月|ヶ月|カ月|ケ月|回|分(?:から|まで|に|間|頃|後|前|ほど|くらい|ぐらい|$|\\s|、)))','g'), cv);
  s=s.replace(new RegExp(TC_KN+'(?=時(?:半|\\d|'+TC_KN+'分|から|まで|に|頃|ごろ|の|、|,|\\s|$))','g'), cv);
  s=s.replace(new RegExp('(時)('+TC_KN+')(?=分)','g'), (m,a,b)=>a+cv(b));
  s=s.replace(/正午/g,'12時');
  return s;
}
/* 見つけたところを消して、あとに続く「の・に・は」も一緒に外す */
function tcCut(s, m){ const i=m.index, rest=s.slice(i+m[0].length).replace(/^(の|に|は|、|,)/,''); return (s.slice(0,i)+' '+rest).replace(/\s+/g,' ').trim(); }
function tcWdOffMon(ch){ return (TC_WDMAP[ch]+6)%7; }            // 月曜はじまりで何日目か
function tcNextWd(base, wd, incl){ const k=(wd-tcD(base).getDay()+7)%7; return tcAdd(base, k===0 && !incl ? 7 : k); }
function tcNearYear(T, M, D){
  const y=+T.slice(0,4); let ds=tcYmd(y, M, D); if(!ds) return null;
  if(tcDiff(ds, T)>60) ds=tcYmd(y+1, M, D)||ds;                  // 2か月より前なら来年のこと
  return ds;
}
function tcNextDayOfMonth(T, D){
  const y=+T.slice(0,4), m=+T.slice(5,7);
  for(let k=0;k<13;k++){ const yy=y+Math.floor((m-1+k)/12), mm=(m-1+k)%12+1, ds=tcYmd(yy, mm, D); if(ds && ds>=T) return ds; }
  return null;
}
function tcDateRules(T){
  return [
    [/(\d{4})年(\d{1,2})月(\d{1,2})日/, m=>tcYmd(+m[1], +m[2], +m[3])],
    [/再来週の?([日月火水木金土])曜日?/, m=>tcAdd(tcMonday(T), 14+tcWdOffMon(m[1]))],
    [/来週の?([日月火水木金土])曜日?/, m=>tcAdd(tcMonday(T), 7+tcWdOffMon(m[1]))],
    [/今週の?([日月火水木金土])曜日?/, m=>tcAdd(tcMonday(T), tcWdOffMon(m[1]))],
    [/再来週/, ()=>tcAdd(tcMonday(T), 14)],
    [/来週/, ()=>tcAdd(tcMonday(T), 7)],
    [/来月の?(\d{1,2})日/, m=>{ const y=+T.slice(0,4), mo=+T.slice(5,7); return tcYmd(mo===12?y+1:y, mo===12?1:mo+1, +m[1]); }],
    [/(今月末|月末)/, ()=>{ const y=+T.slice(0,4), mo=+T.slice(5,7); return tcIso(new Date(y, mo, 0)); }],
    [/(\d{1,3})日(後|ご|先)/, m=>tcAdd(T, +m[1])],
    [/(\d{1,3})日前/, m=>tcAdd(T, -m[1])],
    [/(\d{1,2})週間(後|先)/, m=>tcAdd(T, 7*m[1])],
    [/(明々後日|明明後日|しあさって)/, ()=>tcAdd(T, 3)],
    [/(明後日|あさって)/, ()=>tcAdd(T, 2)],
    [/(明日|あした|あす)/, ()=>tcAdd(T, 1)],
    [/(一昨日|おととい|おとつい)/, ()=>tcAdd(T, -2)],
    [/(昨日|きのう)/, ()=>tcAdd(T, -1)],
    [/(今日|本日|きょう)/, ()=>T],
    [/(\d{1,2})月(\d{1,2})日/, m=>tcNearYear(T, +m[1], +m[2])],
    [/(?<![\d:])(\d{1,2})\/(\d{1,2})(?![\d\/])/, m=>tcNearYear(T, +m[1], +m[2])],
    [/(次の|今度の)?([日月火水木金土])曜日?/, m=>tcNextWd(T, TC_WDMAP[m[2]], !m[1])],
    [/(?<![\d月])(\d{1,2})日(?!(後|前|間|中|分|目|ご|先))/, m=>tcNextDayOfMonth(T, +m[1])],
  ];
}
const TC_TP='(午前|午後|朝|夜|夕方|夕|昼)?(?:の)?(\\d{1,2})(?:[:：](\\d{2})|時(?!間)(?:(\\d{1,2})分|(半))?)(?:頃|ごろ)?';
function tcHour(pre, h){
  if(/午後|夜|夕|昼/.test(pre||'') && h<12) return h+12;
  if(pre==='午前' && h===12) return 0;
  if(!pre && h>=1 && h<=6) return h+12;          // 仕事の時間：「3時から」は午後3時とみなす
  return h;
}
function tcTok(m, o){ return {pre:m[o+1]||'', h:+m[o+2], mi:m[o+3]!=null ? +m[o+3] : (m[o+4]!=null ? +m[o+4] : (m[o+5] ? 30 : 0))}; }
function tcParseTime(s){
  const re=new RegExp(TC_TP);
  const m=re.exec(s); if(!m) return null;
  const a=tcTok(m, 0);
  if(a.h>24 || a.mi>59) return null;
  let sm=tcHour(a.pre, a.h)*60+a.mi, em=null, len=m[0].length;
  const rest=s.slice(m.index+len);
  const rng=new RegExp('^\\s*(?:から|〜|~|-|ー|より)\\s*'+TC_TP+'\\s*(?:まで)?').exec(rest);
  const dur=/^\s*(?:から)?\s*(\d{1,2})時間(半)?(?:(\d{1,2})分)?(?:間|ほど|くらい|ぐらい)?/.exec(rest)
    || /^\s*(?:から)?\s*()()(\d{1,3})分(?:間|ほど|くらい|ぐらい)?/.exec(rest);
  if(rng){
    const b=tcTok(rng, 0);
    let h=b.pre ? tcHour(b.pre, b.h) : b.h;
    if(!b.pre && h*60+b.mi<=sm && h+12<=24) h+=12;
    em=Math.min(24*60, h*60+b.mi); len+=rng[0].length;
  } else if(dur){
    em=sm+(dur[1]?(+dur[1])*60:0)+(dur[2]?30:0)+(dur[3]?+dur[3]:0); len+=dur[0].length;
  } else { const k=/^\s*(から|より)/.exec(rest); if(k) len+=k[0].length; }
  if(sm>=24*60) sm=23*60;
  if(em==null || em<=sm) em=sm+60;
  return { start:tcHM(sm), end:tcHM(Math.min(em, 23*60+59)), cut:{index:m.index, 0:s.substr(m.index, len)} };
}
const TC_MEMO_W=/(メモ|覚え書き|覚書|やること|TODO|ToDo|todo|タスク|宿題|忘れずに|忘れないように|備忘)/;
const TC_EV_W=/(予定|スケジュール|会議|打ち合わせ|打合せ|打ち合せ|ミーティング|MTG|面談|商談|訪問|来客|来社|出張|研修|監査|点検|立会い|立ち会い|説明会|展示会|納品|工事|休み|休暇|有給|健康診断|健診|棚卸|面接|検収|式|祭|大会|セミナー|講習|試験|定例)/;
function tcRoleNamesOf(r){
  const a=[r.name]; if(r.name.length>=3) a.push(r.name.slice(0,2));
  String(r.al||'').split(/[,、，\s]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>{ if(!a.includes(x)) a.push(x); });
  return a;
}
function tcParse(text, baseDs){
  const heard=String(text||'').trim();
  const T=tcTodayIso();
  let s=tcNormText(heard), m;
  const out={kind:'memo', date:tcIsDate(baseDs)?baseDs:T, allDay:false, start:null, end:null, rep:null, roles:[], title:'', heard, dateSaid:false};
  // くり返し
  let repWd=null, repDay=null;
  if((m=/隔週の?([日月火水木金土])曜日?/.exec(s))){ out.rep={f:'w', n:2}; repWd=TC_WDMAP[m[1]]; s=tcCut(s, m); }
  else if((m=/毎週の?([日月火水木金土])曜日?/.exec(s))){ out.rep={f:'w', n:1}; repWd=TC_WDMAP[m[1]]; s=tcCut(s, m); }
  else if((m=/(毎日)/.exec(s))){ out.rep={f:'d', n:1}; s=tcCut(s, m); }
  else if((m=/(毎平日|平日(は|の)?毎日|平日)/.exec(s))){ out.rep={f:'wd', n:1}; s=tcCut(s, m); }
  else if((m=/毎月の?(\d{1,2})日/.exec(s))){ out.rep={f:'m', n:1}; repDay=+m[1]; s=tcCut(s, m); }
  else if((m=/(毎週)/.exec(s))){ out.rep={f:'w', n:1}; s=tcCut(s, m); }
  else if((m=/(毎月)/.exec(s))){ out.rep={f:'m', n:1}; s=tcCut(s, m); }
  else if((m=/(毎年)/.exec(s))){ out.rep={f:'y', n:1}; s=tcCut(s, m); }
  // 終日
  if((m=/(終日|一日中|1日中|丸一日|まる一日)/.exec(s))){ out.allDay=true; s=tcCut(s, m); }
  // 日付
  for(const [re, fn] of tcDateRules(T)){
    const mm=re.exec(s); if(!mm) continue;
    const ds=fn(mm); if(!ds) continue;
    out.date=ds; out.dateSaid=true; s=tcCut(s, mm); break;
  }
  if(!out.dateSaid){
    if(repWd!=null) out.date=tcNextWd(T, repWd, true);
    else if(repDay!=null) out.date=tcNextDayOfMonth(T, repDay)||out.date;
  }
  // 種類と時刻
  const memoSaid=TC_MEMO_W.test(s);
  if(memoSaid){
    s=s.replace(/(メモ|覚え書き|覚書|やること|TODO|ToDo|todo|タスク|備忘|忘れずに|忘れないように)(を|に|して(おいて|おく|ください)?|しといて|と|は)?/g,' ').replace(/\s+/g,' ').trim();
    out.kind='memo'; out.allDay=false;
  } else {
    const t=tcParseTime(s);
    if(t && !out.allDay){ out.kind='ev'; out.start=t.start; out.end=t.end; s=tcCut(s, t.cut); }
    else if(!out.allDay && (m=/(午前|午後)(中)?(に|から|は)?/.exec(s))){      // 「午後に」だけ：午前は9〜12時、午後は13〜17時
      out.kind='ev'; out.start=m[1]==='午前'?'09:00':'13:00'; out.end=m[1]==='午前'?'12:00':'17:00'; s=tcCut(s, m);
    }
    else if(out.allDay || TC_EV_W.test(s)){ out.kind='ev'; out.allDay=true; if(t) s=tcCut(s, t.cut); }
  }
  // 業務：名前（件名からは外す）→ 聞き分ける言葉
  const names=[];
  tc.roles.forEach(r=>tcRoleNamesOf(r).forEach(n=>names.push({n, id:r.id})));
  names.sort((a,b)=>b.n.length-a.n.length);
  names.forEach(({n, id})=>{
    let i=s.indexOf(n);
    while(i>=0){
      if(!out.roles.includes(id)) out.roles.push(id);
      const after=s.slice(i+n.length);
      const mm=/^(の|で|は|に|へ|と|、|,|:|：|\s|$)/.exec(after);
      if(mm){ s=(s.slice(0,i)+' '+after.slice(mm[0].length)).replace(/\s+/g,' ').trim(); i=s.indexOf(n); }
      else i=s.indexOf(n, i+n.length);
    }
  });
  if(!out.roles.length){
    tc.roles.forEach(r=>{
      const kws=String(r.kw||'').split(/[,、，\s]+/).map(x=>x.trim()).filter(Boolean);
      if(kws.some(k=>s.toLowerCase().includes(k.toLowerCase()))) out.roles.push(r.id);
    });
  }
  if(!out.roles.length) out.roles=tcDefaultRoles(null);
  out.roles=tc.roles.map(r=>r.id).filter(id=>out.roles.includes(id));   // 並びは業務の順に
  // 件名：言い回しと、前後の助詞・区切りを外す
  let t=s;
  for(let k=0;k<4;k++){
    t=t.replace(/\s*(の|を)?(予定|スケジュール)?(を)?(入れて(おいて|ください|下さい)?|いれて|入れる|登録(して(おいて|ください)?|する|お願いします)?|追加(して(ください)?|する)?|でお願いします|お願いします|お願い|しておいて|してください|下さい|ください|です|ね|よ)\s*$/,'').trim();
    t=t.replace(/^\s*(予定|スケジュール)(を|は)?\s*/,'').trim();
  }
  t=t.replace(/^(の|に|で|は|を|へ|と|から|まで|、|,|。|\s)+/,'').replace(/(の|に|で|は|を|へ|と|から|まで|、|,|。|\s)+$/,'').replace(/\s+/g,' ').trim();
  if(!t) t=out.kind==='memo' ? heard.slice(0,60) : '予定';
  out.title=t.slice(0,200);
  if(out.rep){ out.rep={f:out.rep.f, n:out.rep.n, until:null, ex:[], dd:[]}; }
  return out;
}
/* 読んだものを登録する（設定で「確かめてから」なら入力画面を開く） */
function tcRegisterText(text, fromVoice){
  const src=String(text||'').trim(); if(!src) return null;
  const al=tcApplyAlias(src);                 // 自分の言いかえ（v445）
  const p=tcParse(al, tcSel);
  const it={id:null, kind:p.kind, roles:p.roles, date:p.date, allDay:p.allDay, start:p.start, end:p.end, title:p.title, note:'', done:false, rep:p.rep};
  const note=h=>{ if(!fromVoice) return; tc.heard=(tc.heard||[]).concat([h]).slice(-30); };
  if(tc.ui.confirm){ note({q:src, a:al!==src?al:'', title:p.title, id:'', at:Date.now()}); tcSave(); tcOpenEdit(it, null, al!==src ? src+'」→「'+al : src); return it; }
  const now=Date.now();
  Object.assign(it, {id:tcNewId(), cre:now, upd:now});
  tcLearnSrc[it.id]=p.title;                  // 直したら「覚えますか」と聞くため
  note({q:src, a:al!==src?al:'', title:p.title, id:it.id, at:now});
  tc.items.push(it); tc.ui.lastRole=it.roles[0]; tcSave();
  tcShownDay='';
  tcPick(it.date); tcFlash(it.id); tcShowSnack(it, it.date);
  return it;
}
function tcAddSubmit(){
  const inp=document.getElementById('tcAddIn');
  if(tcRecOn || tcWant){ if(tcUtterText()) tcFinish(); else tcStopListen(); return; }
  const v=inp.value.trim();
  if(!v){ tcNewItem('ev', tcSel, null, null); return; }
  inp.value='';
  tcRegisterText(v);
}

/* ── 🗣 自分の言いかえ（v445）：声の聞き違いを、読む前に置きかえる ── */
let tcLearnSrc={};   // 声・文ですぐ登録した予定の、登録したときの件名（直したら覚えるか聞く）
function tcApplyAlias(src, extra){
  let s=String(src==null?'':src);
  const list=(tc && tc.alias ? tc.alias : []).concat(extra||[]).slice().sort((a,b)=>b.from.length-a.from.length);
  for(const a of list){
    if(!a.from) continue;
    if(s.includes(a.from)){ s=s.split(a.from).join(a.to); continue; }
    const nf=a.from.normalize('NFKC'), ns=s.normalize('NFKC');
    if(nf && ns.includes(nf)) s=ns.split(nf).join(a.to);   // 全角・半角のちがいは気にしない
  }
  return s;
}
/* 直す前と直したあとの件名から、ちがうところだけを取り出す（「A者訪問」→「A社訪問」なら 者→社。1文字だけなら前の字も付ける） */
function tcAliasDiff(a, b){
  a=String(a); b=String(b);
  if(a===b) return null;
  let p=0; while(p<a.length && p<b.length && a[p]===b[p]) p++;
  let q=0; while(q<a.length-p && q<b.length-p && a[a.length-1-q]===b[b.length-1-q]) q++;
  let from=a.slice(p, a.length-q), to=b.slice(p, b.length-q);
  if(from.length<2 && p>0){ from=a[p-1]+from; to=a[p-1]+to; p--; }
  if(from.length<2 && q>0){ from=from+a[a.length-q]; to=to+a[a.length-q]; }
  if(!from || from.length>30 || to.length>60) return null;
  return {from, to};
}
async function tcLearnPropose(before, after){
  const d=tcAliasDiff(before, after); if(!d) return;
  if((tc.alias||[]).some(a=>a.from===d.from)) return;
  const k=await tcChoose('「'+d.from+'」を「'+d.to+'」と覚えますか？ 次から声や文で「'+d.from+'」と入ったら「'+d.to+'」に置きかえます', ['覚える']);
  if(k!==0) return;
  tc.alias=(tc.alias||[]).concat([d]); tcSave();
  toast('「'+d.from+'」→「'+d.to+'」を覚えました（⚙設定の「自分の言いかえ」で直せます）', 3500);
  tcAliasRefresh();
}
/* 業務手帳だけのアプリ（v447）：techo/ を開いてホーム画面に足すと、アイコンから業務手帳だけが開く */
function tcHomeUrl(){ try{ return new URL('techo/', location.href).href; }catch(_){ return 'techo/'; } }
function tcHomeSetHtml(){
  const u=tcHomeUrl();
  return `<div class="tc-note">業務手帳だけを<b>アイコンから直接</b>開けます。${window.APP_TECHO?'いまは業務手帳だけで開いています。':'下のボタンで業務手帳だけの画面を開き、そこでホーム画面に足してください。'}<br>
    ・iPhone：Safari の <b>共有（□↑）→「ホーム画面に追加」</b><br>・Android：Chrome の <b>⋮ →「ホーム画面に追加」</b>（または「アプリをインストール」）<br>
    予定は表電卓の中の業務手帳と同じものを見ます（同じ端末・同じブラウザのとき）。</div>
    <div class="tc-slrow"><input type="text" readonly value="${tcEsc(u)}" aria-label="業務手帳だけのアドレス" style="flex:1;min-width:0;height:36px;border-radius:8px;border:1px solid rgba(120,132,156,.4);background:var(--modal-bg,#fff);color:var(--text,#333);font-size:13px;padding:0 8px" onclick="this.select()"><button class="tc-mini" onclick="tcHomeCopy()">コピー</button></div>
    ${window.APP_TECHO?'':'<div class="tc-edbtns"><button onclick="tcHomeOpen()">📔 業務手帳だけの画面を開く</button></div>'}`;
}
function tcHomeCopy(){
  const u=tcHomeUrl();
  const done=()=>toast('アドレスをコピーしました');
  try{ navigator.clipboard.writeText(u).then(done, ()=>toast(u, 4000)); }catch(_){ toast(u, 4000); }
}
function tcHomeOpen(){ location.href='index.html?app=techo'; }
/* 設定には件数だけを出し、一覧は別の窓で開く（増えても下の設定が見えなくならないように） */
function tcAliasSetHtml(){
  const n=(tc.alias||[]).length, m=(tc.heard||[]).length;
  return `<button class="tc-alopen" id="tcAlOpen" onclick="tcAliasListOpen()"><span>🗣 言いかえの一覧を開く<small>登録 ${n}件・聞き取った言葉 ${m}件</small></span><b aria-hidden="true">›</b></button>
    <div class="tc-note">声の聞き違い（「A者」「てんけん」など）や、自分の言い方を登録すると、読む前にその言葉に置きかえます。</div>`;
}
let tcAlQ='';
function tcAliasListOpen(){
  let ov=document.getElementById('tcAlList');
  if(!ov){ ov=document.createElement('div'); ov.id='tcAlList'; ov.className='tc-aldlg tc-allist'; document.body.appendChild(ov);
    ov.addEventListener('click', e=>{ if(e.target===ov) tcAliasListClose(); }); }
  tcAlQ='';
  ov.innerHTML=`<div class="tc-alpanel" role="dialog" aria-label="自分の言いかえ">
    <div class="tc-alphd"><b>🗣 自分の言いかえ</b><button type="button" onclick="tcAliasListClose()" aria-label="閉じる">✕</button></div>
    <div class="tc-alptool"><input type="search" id="tcAlQ" placeholder="🔍 言葉でさがす" aria-label="言いかえをさがす" oninput="tcAlQ=this.value.trim();tcAliasListRender()"><button type="button" class="tc-tpok" onclick="tcAliasEdit(-1)">＋ 足す</button></div>
    <div class="tc-alpbody" id="tcAlListBody"></div></div>`;
  openDlg('tcAlList', ()=>{ tcAlQ=''; });
  tcAliasListRender();
}
function tcAliasListClose(){
  if(isDlgOpen('tcAlDlg')) tcAliasClose();
  closeDlg('tcAlList', ()=>{ tcAlQ=''; });
}
function tcAliasListRender(){
  const b=document.getElementById('tcAlListBody'); if(!b) return;
  const q=tcAlQ.normalize('NFKC').toLowerCase(), hit=(...v)=>!q || v.some(x=>String(x||'').normalize('NFKC').toLowerCase().includes(q));
  const al=(tc.alias||[]).map((a,i)=>({a,i})).filter(({a})=>hit(a.from,a.to));
  const hd=(tc.heard||[]).slice().reverse().filter(x=>hit(x.q,x.a,x.title));
  let h='<div class="tc-note">声の聞き違いや、自分の言い方を登録すると、読む前にその言葉に置きかえます。声ですぐ登録したあとに件名を直すと、覚えるか聞きます。</div>';
  h+=`<div class="tc-sec">登録した言いかえ <small>${q?al.length+' / ':''}${(tc.alias||[]).length}件・押すと直せます</small></div>`;
  h+=al.length ? al.map(({a,i})=>`<div class="tc-alrow" onclick="tcAliasEdit(${i})"><span>「${tcEsc(a.from)}」<small>→「${tcEsc(a.to)}」と読む</small></span><button onclick="event.stopPropagation();tcAliasDel(${i})" aria-label="「${tcEsc(a.from)}」の言いかえを消す">✕</button></div>`).join('')
    : `<div class="tc-note">${q?'見つかりません。':'まだありません。上の「＋ 足す」で登録できます。'}</div>`;
  h+='<div class="tc-sec">聞き取った言葉（最近）<small>押すと、そこから言いかえを登録できます</small></div>';
  h+=hd.length ? hd.map(x=>`<div class="tc-alrow" data-q="${tcEsc(x.q)}" onclick="tcAliasEdit(-1,this.dataset.q)"><span>「${tcEsc(x.q)}」<small>${x.a?'言いかえ →「'+tcEsc(x.a)+'」／':''}件名「${tcEsc(x.title||'')}」</small></span></div>`).join('')
    : `<div class="tc-note">${q?'見つかりません。':'まだありません（🎤で登録すると、ここに残ります）。'}</div>`;
  b.innerHTML=h;
}
/* 言いかえが変わったら、開いている一覧と設定の件数を直す */
function tcAliasRefresh(){
  if(isDlgOpen('tcAlList')) tcAliasListRender();
  const o=document.getElementById('tcAlOpen');
  if(o && isDlgOpen('techoSetOverlay')){ const t=document.createElement('div'); t.innerHTML=tcAliasSetHtml(); o.replaceWith(t.firstElementChild); }
}
function tcAliasDel(i){
  const a=(tc.alias||[])[i]; if(!a) return;
  tc.alias.splice(i,1); tcSave(); tcAliasRefresh(); toast('「'+a.from+'」の言いかえを消しました');
}
/* 言いかえを足す・直す窓。元の言葉（聞き取った言葉）があれば、置きかえてどう登録されるかを見せる */
let tcAlEd=null;
function tcAliasEdit(i, src){
  const a=i>=0 ? tc.alias[i] : {from:'', to:''};
  if(!a) return;
  tcAlEd={i, src:String(src||'')};
  let ov=document.getElementById('tcAlDlg');
  if(!ov){ ov=document.createElement('div'); ov.id='tcAlDlg'; ov.className='tc-aldlg'; document.body.appendChild(ov); }
  ov.innerHTML=`<div class="tc-tp" role="dialog" aria-label="言いかえ">
    <div class="tc-tphd"><span>${i>=0?'言いかえを直す':'言いかえを足す'}</span></div>
    ${tcAlEd.src?`<div class="tc-alsrc">聞き取った言葉：「${tcEsc(tcAlEd.src)}」</div>`:''}
    <label class="tc-alf">この言葉を<input id="tcAlFrom" maxlength="60" value="${tcEsc(a.from)}" oninput="tcAliasHint()" placeholder="例：A者・てんけん"></label>
    <label class="tc-alf">こう読む<input id="tcAlTo" maxlength="120" value="${tcEsc(a.to)}" oninput="tcAliasHint()" placeholder="例：A社・点検"></label>
    <div class="tc-alhint" id="tcAlHint"></div>
    <div class="tc-tpft">${i>=0?`<button type="button" onclick="tcAliasClose();tcAliasDel(${i})">🗑</button>`:''}<button type="button" onclick="tcAliasClose()">やめる</button><button type="button" class="tc-tpok" onclick="tcAliasOk()">決める</button></div></div>`;
  openDlg('tcAlDlg', ()=>{ tcAlEd=null; });
  tcAliasHint();
  setTimeout(()=>{ const e=document.getElementById(a.from||!tcAlEd||!tcAlEd.src?'tcAlTo':'tcAlFrom'); if(e){ e.focus(); try{ e.select(); }catch(_){} } }, 60);
}
function tcAliasHint(){
  const h=document.getElementById('tcAlHint'); if(!h || !tcAlEd) return;
  const f=document.getElementById('tcAlFrom').value.trim(), t=document.getElementById('tcAlTo').value.trim();
  if(!f){ h.textContent=''; return; }
  const base=tcAlEd.src && tcAlEd.src.includes(f) ? tcAlEd.src : '';
  if(!base){ h.textContent='「'+f+'」と入ったら「'+t+'」と読みます'; return; }
  const others=(tc.alias||[]).filter((x,k)=>k!==tcAlEd.i && x.from!==f);
  const save=tc.alias; tc.alias=others;
  const txt=tcApplyAlias(base, [{from:f, to:t}]); tc.alias=save;
  const p=tcParse(txt, tcSel);
  const when=tcMDs(p.date)+' '+(p.kind==='memo'?'メモ':(p.allDay?'終日':p.start+'〜'+p.end))+(p.rep?' ↻':'');
  h.innerHTML='→「'+tcEsc(txt)+'」<br>→ <b>'+tcEsc(when)+' '+tcEsc(tcRoleNames(p.roles))+'「'+tcEsc(p.title)+'」</b> と登録します';
}
function tcAliasClose(){ closeDlg('tcAlDlg', ()=>{ tcAlEd=null; }); }
function tcAliasOk(){
  if(!tcAlEd) return;
  const f=document.getElementById('tcAlFrom').value.trim(), t=document.getElementById('tcAlTo').value.trim();
  if(!f){ toast('置きかえる言葉を入れてください'); return; }
  if(f===t){ toast('同じ言葉です'); return; }
  const list=(tc.alias||[]).filter((x,k)=>k!==tcAlEd.i && x.from!==f);   // 同じ言葉の言いかえは1つにする
  list.splice(tcAlEd.i>=0 ? Math.min(tcAlEd.i, list.length) : list.length, 0, {from:f, to:t});
  tc.alias=list; tcSave(); tcAliasClose(); tcAliasRefresh();
  toast('「'+f+'」を「'+t+'」と読みます');
}

/* ── 聞き取り（声の計算帳 v7/v9 と同じ考え）──
   端末の聞き取りは少し間があくと切れてしまうので、切れても聞き直して言葉をつなげ、
   話し終わってから少し待って登録する。「〜から」「〜に」のような言いかけで止まったら倍待つ。
   🎤をもう一度押すと待たずにすぐ登録、何も言っていなければやめる。 */
const TC_MOBILE=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
const TC_WAIT=1800, TC_NOSPEECH=8000;
const TC_UNFIN=/(を|に|で|と|から|の|は|が|、|,|まで|時|分|曜|曜日|毎週|毎月|明日|今日|来週|午前|午後|えーと|えっと|あの)$/;
let tcRec=null, tcRecOn=false, tcWant=false, tcUtter=[], tcSess=[], tcInterim='', tcTarget='add', tcBase='';
let tcTimer=null, tcFinishing=false, tcFinFb=null, tcNoSp=null, tcStopByUser=false;
function tcJoin(a, b){
  a=String(a||''); b=String(b||'').trim();
  if(!b) return a;
  const ac=a.replace(/\s/g,''), bc=b.replace(/\s/g,'');
  if(bc.startsWith(ac)) return b;          // 前の言葉をまるごと含んで届いた
  if(ac.endsWith(bc)) return a;            // 同じものがもう一度届いた
  return a+(a && /[0-9A-Za-z]$/.test(a) && /^[0-9A-Za-z]/.test(b) ? ' ' : '')+b;
}
function tcCollapse(t){ return String(t).replace(/([^\d\s、。]{2,12}?)(?:\s*\1)+/g,'$1'); }
function tcUtterText(){ return tcCollapse(tcUtter.concat(tcSess.filter(Boolean), [tcInterim]).reduce(tcJoin,'')).trim(); }
function tcFieldEl(tg){ return tg==='t' ? document.getElementById('tcEdT') : tg==='n' ? document.getElementById('tcEdN') : document.getElementById('tcAddIn'); }
function tcSyncMic(){
  const on=tcRecOn||tcWant;
  const m=document.getElementById('tcMic');
  if(m){ const me=on && tcTarget==='add'; m.classList.toggle('on', me); m.setAttribute('aria-label', me?(tcUtterText()?'聞いています（押すとすぐ登録）':'聞いています（押すとやめる）'):'声で登録'); }
  document.querySelectorAll('#techoEditOverlay .tc-fmic').forEach(b=>b.classList.toggle('on', on && tcTarget===b.dataset.mic));
  const inp=document.getElementById('tcAddIn');
  if(inp){ inp.readOnly=on && tcTarget==='add'; if(!(on && tcTarget==='add')) inp.placeholder='例：明日10時 営業 A社訪問'; }
}
function tcShowUtter(){
  const txt=tcUtterText(), el=tcFieldEl(tcTarget); if(!el) return;
  if(tcTarget==='add'){ el.value=txt; el.placeholder='🎤 どうぞ（話し終わると登録します）'; }
  else el.value=tcBase+(tcBase && txt ? (tcTarget==='n'?'\n':' ') : '')+txt;
}
function tcShowWait(ms){
  const f=document.getElementById('tcAddForm'); if(!f) return;
  const old=f.querySelector('.tc-wait'); if(old) old.remove();
  if(!ms || tcTarget!=='add') return;
  const bar=document.createElement('div'); bar.className='tc-wait'; bar.style.animationDuration=ms+'ms'; f.appendChild(bar);
}
function tcArm(){
  clearTimeout(tcTimer); clearTimeout(tcNoSp);
  const txt=tcUtterText();
  tcShowUtter(); tcSyncMic();
  if(!txt){ tcShowWait(0); return; }
  const ms=TC_UNFIN.test(txt) ? TC_WAIT*2 : TC_WAIT;
  tcShowWait(ms);
  tcTimer=setTimeout(tcFinish, ms);
}
function tcMicTap(target){
  target=target||'add';
  if(tcRecOn || tcWant){
    const same=tcTarget===target;
    if(same && tcUtterText()) tcFinish(); else tcStopListen();
    if(same) return;
  }
  tcStartListen(target);
}
function tcStartListen(target){
  const Ctor=(typeof speechRecCtor==='function') ? speechRecCtor() : (window.SpeechRecognition||window.webkitSpeechRecognition||null);
  const el=tcFieldEl(target);
  if(!Ctor){
    toast('この端末ではアプリの中で聞き取れません。欄を押して、キーボードのマイクで話してください', 5200);
    if(el) el.focus();
    return;
  }
  if(tcRecOn) return;
  const fresh=!tcWant;
  if(fresh){ tcTarget=target; tcUtter=[]; tcSess=[]; tcInterim=''; tcBase=(target!=='add' && el) ? el.value.replace(/\s+$/,'') : ''; }
  tcWant=true; tcStopByUser=false;
  let rec;
  try{ rec=new Ctor(); }catch(_){ tcWant=false; tcSyncMic(); toast('聞き取りを始められませんでした'); return; }
  tcRec=rec;
  rec.lang='ja-JP'; rec.interimResults=true; rec.maxAlternatives=1; rec.continuous=!TC_MOBILE;
  tcSess=[];
  rec.onstart=()=>{
    tcRecOn=true; tcSyncMic();
    if(tcTarget==='add' && !tcUtterText()){ const i=document.getElementById('tcAddIn'); if(i){ i.value=''; i.placeholder='🎤 どうぞ（話し終わると登録します）'; } }
    if(fresh){ clearTimeout(tcNoSp); tcNoSp=setTimeout(()=>{ if(!tcUtterText() && tcWant){ tcStopListen(); toast('聞こえませんでした。もう一度 🎤 を押してください'); } }, TC_NOSPEECH); }
  };
  rec.onresult=e=>{
    let interim='';
    for(let i=0;i<e.results.length;i++){
      const r=e.results[i];
      if(r.isFinal){ const t=String(r[0].transcript||'').trim(); if(t) tcSess[i]=t; }
      else if(i>=e.resultIndex) interim+=r[0].transcript;
    }
    tcInterim=interim.trim();
    if(tcFinishing) return;
    tcArm();
  };
  rec.onerror=e=>{
    const k=(e && e.error)||'';
    if(k==='not-allowed' || k==='service-not-allowed'){ tcWant=false; toast('マイクが使えませんでした。ブラウザの鍵マークや端末の設定で、このサイトのマイクを許可してください', 5600); }
    else if(k==='audio-capture'){ tcWant=false; toast('マイクが見つかりませんでした。ほかのアプリがマイクを使っていないかご確認ください', 5600); }
    else if(k==='network'){ tcWant=false; toast('ネットにつながっていないと聞き取れません。欄を押して、キーボードのマイクをお使いください', 5600); }
  };
  rec.onend=()=>{
    tcRecOn=false;
    tcUtter=tcUtter.concat(tcSess.filter(Boolean)); tcSess=[];
    if(tcFinishing){ tcDoFinish(); return; }
    if(tcWant && !tcStopByUser && !document.hidden){ setTimeout(()=>{ if(!tcRecOn && tcWant && !tcFinishing) tcStartListen(tcTarget); }, 120); return; }
    if(tcUtterText() && !tcStopByUser){ tcFinish(); return; }
    tcWant=false; tcSyncMic();
  };
  try{ rec.start(); }catch(_){ tcWant=false; tcSyncMic(); toast('聞き取りを始められませんでした'); }
}
function tcFinish(){
  if(tcFinishing) return;
  clearTimeout(tcTimer); clearTimeout(tcNoSp);
  tcFinishing=true; tcShowWait(0);
  if(tcRecOn){ try{ tcRec.stop(); }catch(_){} clearTimeout(tcFinFb); tcFinFb=setTimeout(tcDoFinish, 1200); }
  else tcDoFinish();
}
function tcDoFinish(){
  if(!tcFinishing) return;
  tcFinishing=false; clearTimeout(tcFinFb);
  const text=tcUtterText(), tg=tcTarget;
  tcUtter=[]; tcSess=[]; tcInterim=''; tcWant=false;
  tcSyncMic();
  if(tg==='add'){
    const i=document.getElementById('tcAddIn'); if(i) i.value='';
    if(text) tcRegisterText(text, true);
  } else {
    const el=tcFieldEl(tg);
    if(el && text) el.value=tcBase+(tcBase ? (tg==='n'?'\n':' ') : '')+tcApplyAlias(text);
  }
}
/* やめる（聞いた言葉は捨てる。入力画面の欄は聞く前にもどす） */
function tcStopListen(){
  const was=tcRecOn||tcWant;
  tcStopByUser=true; tcWant=false; tcFinishing=false;
  clearTimeout(tcTimer); clearTimeout(tcNoSp); clearTimeout(tcFinFb); tcShowWait(0);
  if(was && tcTarget!=='add'){ const el=tcFieldEl(tcTarget); if(el) el.value=tcBase; }
  if(was && tcTarget==='add'){ const i=document.getElementById('tcAddIn'); if(i) i.value=''; }
  tcUtter=[]; tcSess=[]; tcInterim='';
  try{ tcRec && tcRec.stop(); }catch(_){}
  tcRecOn=false;
  tcSyncMic();
  setTimeout(()=>{ tcStopByUser=false; }, 500);
}

/* ── 📝 メモ一覧（業務ごとの付せん） ── */
let tcBdRange='week';
const TC_RANGES=[['day','この日'],['week','この週'],['month','この月'],['all','すべて']];
function tcOpenBoard(){ tcRenderBoard(); openDlg('techoBoardOverlay'); }
function tcCloseBoard(){ closeDlg('techoBoardOverlay'); }
function tcBdSet(r){ tcBdRange=r; tcRenderBoard(); }
function tcRangeDays(){
  if(tcBdRange==='day') return [tcSel];
  if(tcBdRange==='week'){ const s=tcWeekStart(tcSel); return [0,1,2,3,4,5,6].map(i=>tcAdd(s,i)); }
  if(tcBdRange==='month'){ const y=+tcSel.slice(0,4), m=+tcSel.slice(5,7), n=new Date(y, m, 0).getDate(), a=[]; for(let d=1;d<=n;d++) a.push(tcYmd(y,m,d)); return a; }
  return null;
}
function tcBoardEntries(){
  const days=tcRangeDays(), out=[];
  const memos=tc.items.filter(it=>it.kind==='memo');
  if(days) days.forEach(ds=>memos.forEach(it=>{ if(tcOccurs(it, ds)) out.push({it, ds}); }));
  else { const T=tcTodayIso(); memos.forEach(it=>out.push({it, ds:it.rep ? (tcNextOcc(it, T)||it.date) : it.date})); }
  return out;
}
function tcRenderBoard(){
  const rg=document.getElementById('tcBdRange'); if(!rg) return;
  rg.innerHTML=TC_RANGES.map(([k,l])=>`<button class="${k===tcBdRange?'on':''}" onclick="tcBdSet('${k}')">${l}</button>`).join('');
  const undone=document.getElementById('tcBdUndone').checked;
  const cols=tcColumns(), ents=tcBoardEntries();
  document.getElementById('tcBd').innerHTML=cols.map((c, ci)=>{
    let mine=ents.filter(e=>e.it.roles.some(id=>c.ids.includes(id)));
    if(undone) mine=mine.filter(e=>!tcDoneOn(e.it, e.ds));
    mine.sort((a,b)=>tcDoneOn(a.it,a.ds)-tcDoneOn(b.it,b.ds) || (a.ds<b.ds?-1:a.ds>b.ds?1:0) || a.it.cre-b.it.cre);
    const c0=c.roles[0].color;
    return `<div class="tc-bcol"><div class="tc-bh" style="--c:${c0}">${c.roles.map(r=>`<span style="width:9px;height:9px;border-radius:50%;background:${r.color};display:inline-block"></span>`).join('')}`
      +`<span class="tc-cn">${tcEsc(c.name)}（${mine.length}）</span><button class="tc-nb" onclick="tcNewItem('memo','${tcSel}',${ci})" aria-label="${tcEsc(c.name)}にメモを足す">＋</button></div>`
      +(mine.length ? mine.map(e=>{
        const dn=tcDoneOn(e.it, e.ds), cs=tcColOf(e.it, c.ids);
        const other=e.it.roles.filter(id=>!c.ids.includes(id)).map(id=>(tcRole(id)||{}).name).filter(Boolean);
        return `<div class="tc-card${dn?' done':''}" style="--c:${cs[0]||c0}"><button class="tc-ck" onclick="tcToggleDone('${e.it.id}','${e.ds}')" aria-label="${dn?'済みをやめる':'済みにする'}">${dn?'☑':'☐'}</button>`
          +`<button class="tc-mt" onclick="tcBoardOpen('${e.it.id}','${e.ds}')">${tcEsc(e.it.title||'（件名なし）')}`
          +`<small>${tcMDs(e.ds)}${e.it.rep?' ↻'+tcEsc(tcRepLabel(e.it)):''}${other.length?' ／ '+tcEsc(other.join('・'))+'とも':''}${e.it.note?' ／ '+tcEsc(e.it.note.slice(0,40)):''}</small></button></div>`;
      }).join('') : '<div class="tc-bnone">ありません</div>')+'</div>';
  }).join('') || '<div class="tc-empty">出す業務がありません</div>';
}
function tcBoardOpen(id, ds){ tcPick(ds); tcOpenItem(id, ds); }

/* ── 🔍 さがす ── */
function tcOpenFind(){ tcRenderFind(); openDlg('techoFindOverlay'); setTimeout(()=>{ const i=document.getElementById('tcFindIn'); if(i) i.focus(); }, 120); }
function tcCloseFind(){ closeDlg('techoFindOverlay'); }
function tcRenderFind(){
  const box=document.getElementById('tcFindRes'); if(!box) return;
  const q=String(document.getElementById('tcFindIn').value||'').normalize('NFKC').toLowerCase().trim();
  if(!q){ box.innerHTML='<div class="tc-note">件名・くわしいメモ・業務の名前でさがせます。押すとその日へ移って開きます。</div>'; return; }
  const words=q.split(/\s+/), T=tcTodayIso();
  const hits=tc.items.filter(it=>{
    const hay=(it.title+' '+it.note+' '+tcRoleNames(it.roles)+' '+(it.kind==='memo'?'メモ':'予定')).normalize('NFKC').toLowerCase();
    return words.every(w=>hay.includes(w));
  }).map(it=>({it, ds:it.rep ? (tcNextOcc(it, T)||it.date) : it.date}));
  hits.sort((a,b)=>a.ds<b.ds?1:a.ds>b.ds?-1:0);
  box.innerHTML=hits.length ? hits.slice(0,300).map(h=>{
    const it=h.it, dots=it.roles.map(id=>{ const r=tcRole(id); return r?`<i style="background:${r.color}"></i>`:''; }).join('');
    const when=it.kind==='memo' ? '📝 メモ' : (it.allDay ? '終日' : it.start+'〜'+it.end);
    return `<button class="tc-fr" onclick="tcFindGo('${it.id}','${h.ds}')"><span class="tc-fd">${h.ds.slice(0,4)}<br>${tcMDs(h.ds)}</span>`
      +`<span class="tc-ft">${dots}${tcEsc(it.title||'（件名なし）')}<small>${tcEsc(when)} ／ ${tcEsc(tcRoleNames(it.roles))}${it.rep?' ／ ↻'+tcEsc(tcRepLabel(it)):''}${it.note?' ／ '+tcEsc(it.note.slice(0,60)):''}</small></span></button>`;
  }).join('') : '<div class="tc-note">見つかりませんでした。</div>';
}
function tcFindGo(id, ds){ tcCloseFind(); tcShownDay=''; tcPick(ds); tcOpenItem(id, ds); }

/* ── ⚙ 設定 ── */
function tcOpenSet(){ tcRenderSet(); openDlg('techoSetOverlay'); }
function tcCloseSet(){ closeDlg('techoSetOverlay'); }
function tcRenderSet(){
  const b=document.getElementById('tcSetBody'); if(!b) return;
  const n=tc.roles.length;
  b.innerHTML=`<div class="tc-sec">業務（役割）</div>
    <div class="tc-note">名前と色を変えられます。<b>ほかの呼び名</b>（品管・QC など）は名前と同じに扱い、件名からは外します。<b>聞き分ける言葉</b>は、声や文で業務の名前を言わなかったときに、どの業務かを決める手がかりです（どちらも「、」で区切る）。
    <b>列</b>は「組合せ」のときに同じ番号どうしを1つの列にまとめます。</div>`
    +tc.roles.map((r,i)=>`<div class="tc-rrow">
      <input type="color" value="${r.color}" aria-label="${tcEsc(r.name)}の色" onchange="tcRoleSet('${r.id}','color',this.value)">
      <input class="tc-rn" type="text" maxlength="12" value="${tcEsc(r.name)}" aria-label="業務の名前" onchange="tcRoleSet('${r.id}','name',this.value)">
      <span class="tc-rbtn"><select aria-label="${tcEsc(r.name)}の列" onchange="tcRoleSet('${r.id}','col',this.value)">${Array.from({length:TC_MAX_ROLES},(_,k)=>`<option value="${k+1}"${r.col===k+1?' selected':''}>列${k+1}</option>`).join('')}</select>
        <button onclick="tcRoleMove('${r.id}',-1)" ${i===0?'disabled':''} aria-label="上へ">↑</button><button onclick="tcRoleMove('${r.id}',1)" ${i===n-1?'disabled':''} aria-label="下へ">↓</button>
        <button onclick="tcRoleDel('${r.id}')" ${n<=1?'disabled':''} aria-label="${tcEsc(r.name)}を消す">🗑</button></span>
      <input class="tc-rk" type="text" maxlength="120" value="${tcEsc(r.al||'')}" placeholder="ほかの呼び名（例：品管、QC）" aria-label="${tcEsc(r.name)}のほかの呼び名" onchange="tcRoleSet('${r.id}','al',this.value)">
      <input class="tc-rk" type="text" maxlength="300" value="${tcEsc(r.kw)}" placeholder="聞き分ける言葉（例：見積、客先）" aria-label="${tcEsc(r.name)}の聞き分ける言葉" onchange="tcRoleSet('${r.id}','kw',this.value)">
    </div>`).join('')
    +(n<TC_MAX_ROLES ? `<div class="tc-edbtns"><button onclick="tcRoleAdd()">＋ 業務を足す</button></div>` : '')
    +`<div class="tc-sec">🗣 自分の言いかえ（声の聞き違いを直す）</div>${tcAliasSetHtml()}
    <div class="tc-sec">月と1日の仕切り</div>
    <div class="tc-slrow"><span>横並びのとき <b>月の幅</b></span><b class="tc-slv" id="tcSplitHV">${tc.ui.splitH?tc.ui.splitH+'%':'自動'}</b></div>
    <div class="tc-slrow"><input type="range" id="tcSplitHR" min="${TC_SPLIT.h[0]}" max="${TC_SPLIT.h[1]}" step="1" value="${tc.ui.splitH||40}" aria-label="横並びのときの月の幅" oninput="tcSetSplit('h',this.value)"><button class="tc-mini" onclick="tcSetSplit('h',0)">自動</button></div>
    <div class="tc-slrow"><span>縦並びのとき <b>月の高さ</b></span><b class="tc-slv" id="tcSplitVV">${tc.ui.splitV?tc.ui.splitV+'%':'自動'}</b></div>
    <div class="tc-slrow"><input type="range" id="tcSplitVR" min="${TC_SPLIT.v[0]}" max="${TC_SPLIT.v[1]}" step="1" value="${tc.ui.splitV||40}" aria-label="縦並びのときの月の高さ" oninput="tcSetSplit('v',this.value)"><button class="tc-mini" onclick="tcSetSplit('v',0)">自動</button></div>
    <div class="tc-note">スマホを横にすると、左に月・右に1日を並べます。月と1日のあいだの<b>仕切りの線を指でなぞっても</b>動かせます（線を<b>ダブルタップ</b>すると自動に戻ります）。</div>
    <div class="tc-sec">1日の時間の表示で、はじめに見せる時刻</div>
    <div class="tc-slrow"><select id="tcDayTopSel" aria-label="はじめに見せる時刻" onchange="tcSetDayTop(this.value)" style="flex:1;height:36px;border-radius:8px;border:1px solid rgba(120,132,156,.4);background:var(--modal-bg,#fff);color:var(--text,#333);font-size:14px;padding:0 8px">
      <option value="now"${tc.ui.dayTop==='now'?' selected':''}>今の時刻（今日以外は、その日の最初の予定）</option>
      ${Array.from({length:24},(_,h)=>`<option value="${h}"${tc.ui.dayTop===h?' selected':''}>${h}時から</option>`).join('')}</select></div>
    <div class="tc-note">🕘時間の見せ方で、日を開いたときにどの時刻のあたりを見せるかを決めます。上下になぞれば、ほかの時刻も見られます。</div>
    <div class="tc-sec">週の始まり</div><div class="tc-segw"><button class="${tc.ui.wkStart===0?'on':''}" onclick="tcSetWk(0)">日曜</button><button class="${tc.ui.wkStart===1?'on':''}" onclick="tcSetWk(1)">月曜</button></div>
    <div class="tc-sec">声や文で入れたとき</div><div class="tc-segw"><button class="${!tc.ui.confirm?'on':''}" onclick="tcSetConfirm(false)">すぐ登録</button><button class="${tc.ui.confirm?'on':''}" onclick="tcSetConfirm(true)">確かめてから登録</button></div>
    <div class="tc-note">「すぐ登録」は、登録したあと下に <b>直す／取り消し</b> を出します。「確かめてから」は、聞き取った内容を入力画面に入れて見せます。</div>
    <div class="tc-sec">📄 共有ファイル（Excel）</div>${tcShSetHtml()}
    <div class="tc-sec">📱 ホーム画面のアイコンから開く</div>${tcHomeSetHtml()}
    <div class="tc-sec">書き出し・読み込み</div>
    <div class="tc-edbtns"><button onclick="tcCsvMonth()">📄 この月を CSV</button><button onclick="tcExport()">⬇ 書き出す</button><button onclick="document.getElementById('tcImportFile').click()">⬆ 読み込む</button></div>
    <input type="file" id="tcImportFile" accept=".json,application/json" hidden onchange="tcImport(event)">
    <div class="tc-note">CSV は Excel で開けます（${tcMon.y}年${tcMon.m}月の予定とメモ）。<b>書き出す</b>は業務手帳だけのバックアップです（📋リストの ⬇書き出し にも入ります）。<b>読み込む</b>と、いまの中身に足します（同じものは重なりません）。<br>
    入れたものは、この端末の中だけに残ります（共有ファイルを決めたときは、そのファイルにも書きます）。ほかへは送りません（声の聞き取りは、端末によってはインターネットを使います）。</div>`;
}
function tcRoleSet(id, key, v){
  const r=tcRole(id); if(!r) return;
  if(key==='name'){ v=String(v).trim().slice(0,12); if(!v){ toast('名前を入れてください'); tcRenderSet(); return; } r.name=v; }
  else if(key==='color'){ if(!/^#[0-9a-f]{6}$/i.test(v)) return; r.color=v.toLowerCase(); }
  else if(key==='kw') r.kw=String(v).slice(0,300);
  else if(key==='al') r.al=String(v).slice(0,120);
  else if(key==='col') r.col=Math.min(TC_MAX_ROLES, Math.max(1, parseInt(v,10)||1));
  tcSave(); tcRender();
  if(key==='name') tcRenderSet();
}
function tcRoleMove(id, d){
  const i=tc.roles.findIndex(r=>r.id===id), j=i+d;
  if(i<0 || j<0 || j>=tc.roles.length) return;
  const t=tc.roles[i]; tc.roles[i]=tc.roles[j]; tc.roles[j]=t;
  tcSave(); tcRenderSet(); tcRender();
}
function tcRoleAdd(){
  if(tc.roles.length>=TC_MAX_ROLES) return;
  let k=tc.roles.length+1, id='r'+Date.now().toString(36);
  const used=new Set(tc.roles.map(r=>r.color));
  const color=TC_COLORS.find(c=>!used.has(c))||TC_COLORS[k%TC_COLORS.length];
  const cols=tc.roles.map(r=>r.col);
  tc.roles.push({id, name:'業務'+k, color, kw:'', al:'', col:Math.min(TC_MAX_ROLES, Math.max(...cols, 0)+1)});
  tcSave(); tcRenderSet(); tcRender();
  setTimeout(()=>{ const ins=document.querySelectorAll('#tcSetBody .tc-rn'); const el=ins[ins.length-1]; if(el){ el.focus(); el.select(); } }, 60);
}
async function tcRoleDel(id){
  const r=tcRole(id); if(!r || tc.roles.length<=1) return;
  const rest=tc.roles.filter(x=>x.id!==id), to=rest[0];
  const only=tc.items.filter(it=>it.roles.length===1 && it.roles[0]===id).length;
  if(!await appConfirm('「'+r.name+'」を消しますか'+(only?'\nこの業務だけの予定・メモ '+only+'件は「'+to.name+'」へ移します':''), '消す', 'やめる')) return;
  tc.items.forEach(it=>{ it.roles=it.roles.filter(x=>x!==id); if(!it.roles.length){ it.roles=[to.id]; it.upd=Date.now(); } });
  tc.roles=rest; tc.ui.hidden=tc.ui.hidden.filter(x=>x!==id);
  if(tc.ui.lastRole===id) tc.ui.lastRole=to.id;
  tcSave(); tcRenderSet(); tcRender();
}
function tcSetDayTop(v){
  tc.ui.dayTop=v==='now' ? 'now' : Math.min(23, Math.max(0, parseInt(v,10)||0));
  tcSave(); tcShownDay=''; tcRenderDay();
}
function tcSetWk(v){ tc.ui.wkStart=v===1?1:0; tcSave(); tcRenderSet(); tcRender(); }
function tcSetConfirm(v){ tc.ui.confirm=!!v; tcSave(); tcRenderSet(); }

/* ── CSV・書き出し・読み込み ── */
function tcCsvCell(v){ v=String(v==null?'':v); return /[",\n\r]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }
function tcCsvText(y, m){
  const n=new Date(y, m, 0).getDate(), rows=[['日付','曜日','開始','終了','終日','種類','業務','件名','くわしいメモ','済み','くり返し']];
  for(let d=1; d<=n; d++){
    const ds=tcYmd(y, m, d);
    tcItemsOn(ds, false).sort((a,b)=>(a.kind==='memo')-(b.kind==='memo') || (a.allDay?-1:0)-(b.allDay?-1:0) || String(a.start||'').localeCompare(String(b.start||'')))
      .forEach(it=>rows.push([ds.replace(/-/g,'/'), TC_WD[tcD(ds).getDay()], it.start||'', it.end||'', it.allDay?'○':'', it.kind==='memo'?'メモ':'予定',
        tcRoleNames(it.roles), it.title, it.note, tcDoneOn(it, ds)?'○':'', tcRepLabel(it)]));
  }
  return '﻿'+rows.map(r=>r.map(tcCsvCell).join(',')).join('\r\n');
}
function tcDownload(text, name, type){
  const blob=new Blob([text], {type});
  const url=URL.createObjectURL(blob);
  const a=Object.assign(document.createElement('a'), {href:url, download:name});
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(_){} }, 1000);
}
function tcCsvMonth(){
  const y=tcMon.y, m=tcMon.m;
  tcDownload(tcCsvText(y, m), '業務手帳_'+y+'-'+tcP2(m)+'.csv', 'text/csv;charset=utf-8;');
  toast(y+'年'+m+'月の予定とメモを CSV にしました');
}
function tcExport(){
  const payload={app:'hyodenki', type:'techo', version:1, exportedAt:Date.now(), data:tc};
  tcDownload(JSON.stringify(payload), '業務手帳_'+tcTodayIso()+'.json', 'application/json;charset=utf-8;');
  toast('業務手帳を書き出しました（'+tc.items.length+'件）');
}
function tcImport(ev){
  const f=ev.target.files && ev.target.files[0]; ev.target.value=''; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{
    let o=null; try{ o=JSON.parse(rd.result); }catch(_){ toast('読み込めませんでした（ファイルの形がちがいます）'); return; }
    const inc=o && (o.type==='techo' ? o.data : o.techo);
    if(!inc || !Array.isArray(inc.items)){ toast('業務手帳のデータが見つかりませんでした'); return; }
    const n=(typeof techoMergeBundle==='function') ? techoMergeBundle(inc) : 0;
    tcLoad(); tcRenderSet(); tcRender();
    toast(n ? '業務手帳に '+n+'件を足しました' : '足すものはありませんでした（もう入っています）');
  };
  rd.readAsText(f);
}

/* ── 📄 共有ファイル（Excel）：ほかのパソコンと、ファイルを通して予定を受け渡す ──
   「予定」シート：1行＝1件（ID・種類・日付・終日・開始・終了・業務・件名・くわしいメモ・済み・くり返し・更新・消した）。
   「業務」シート：業務の名前・色・呼び名・聞き分ける言葉・列。
   合わせ方：同じ ID は「更新」が新しい方を残す。更新が同じ（または空）で中身がちがうときは、
   Excel で直したものとみなしてファイルの方を取る。「消した」に ○ の行は、ほかの端末でも消す。
   パソコンの Chrome・Edge では、決めたファイルを覚えておき（File System Access）、開くたびに読んで、
   変えるたびに「読む→合わせる→書く」をする。覚えられない端末は、書き出す／読み込むで受け渡す。 */
const TC_SH_KEY='excalc_techo_share';       // {name, at}（最後に合わせた時刻）
const TC_SH_HEAD=['ID','種類','日付','終日','開始','終了','業務','件名','くわしいメモ','済み','くり返し','くり返しの設定','更新','消した'];
const TC_SH_ROLEHEAD=['ID','名前','色','ほかの呼び名','聞き分ける言葉','列'];
const TC_SH_TYPES=[{description:'Excel ブック', accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}];
let tcShHandle=null, tcShLoaded=false, tcShBusy=false, tcShAgain=false, tcShTimer=null, tcShSig='', tcShState='';
const tcShOK=()=>typeof window.showOpenFilePicker==='function' && typeof window.showSaveFilePicker==='function';
function tcShMeta(){ try{ return JSON.parse(localStorage.getItem(TC_SH_KEY)||'null')||{}; }catch(_){ return {}; } }
function tcShSetMeta(m){ try{ if(m) localStorage.setItem(TC_SH_KEY, JSON.stringify(m)); else localStorage.removeItem(TC_SH_KEY); }catch(_){} }

/* ファイルの「持ち手」は IndexedDB に覚える（localStorage には入らないため） */
function tcShDb(){
  return new Promise((res, rej)=>{
    try{ const rq=indexedDB.open('excalc_techo_fs', 1);
      rq.onupgradeneeded=()=>rq.result.createObjectStore('h');
      rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error); }catch(e){ rej(e); }
  });
}
async function tcShDbGet(){ try{ const db=await tcShDb(); return await new Promise(r=>{ const q=db.transaction('h').objectStore('h').get('share'); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); }catch(_){ return null; } }
async function tcShDbPut(h){ try{ const db=await tcShDb(); await new Promise(r=>{ const t=db.transaction('h','readwrite'); if(h) t.objectStore('h').put(h,'share'); else t.objectStore('h').delete('share'); t.oncomplete=r; t.onerror=r; }); }catch(_){} }

/* ── 表にする・表から読む ── */
const tcShSec=ms=>Math.floor((+ms||0)/1000);
function tcShStamp(ms){ const d=new Date(+ms||Date.now()); return tcIso(d)+' '+tcP2(d.getHours())+':'+tcP2(d.getMinutes())+':'+tcP2(d.getSeconds()); }
function tcShRoleNames(ids, roles){ return ids.map(id=>{ const r=roles.find(x=>x.id===id); return r?r.name:id; }).join('・'); }
function tcShRows(){
  const rows=[TC_SH_HEAD];
  const items=tc.items.slice().sort((a,b)=>a.date.localeCompare(b.date) || String(a.start||'').localeCompare(String(b.start||'')) || a.cre-b.cre);
  items.forEach(it=>{
    const rk=tcRepKey(it.rep), rl=rk ? (TC_REPS.find(x=>x[0]===rk)||['',''])[1] : '';
    rows.push([it.id, it.kind==='memo'?'メモ':'予定', it.date, it.kind==='ev' && it.allDay?'○':'', it.start||'', it.end||'',
      tcShRoleNames(it.roles, tc.roles), it.title, it.note, it.kind==='memo' && it.done?'○':'', rl, it.rep?JSON.stringify(it.rep):'',
      tcShStamp(it.upd), '']);
  });
  (tc.dels||[]).forEach(d=>{ if(!tc.items.some(x=>x.id===d.id)) rows.push([d.id,'','','','','','','','','','','',tcShStamp(d.t),'○']); });
  return rows;
}
function tcShSheetXml(rows, widths){
  const P='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const cols='<cols>'+widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols>';
  const body=rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((v,ci)=>{
    v=v==null?'':String(v); if(v==='') return '';
    return `<c r="${xlColLetter(ci)}${ri+1}" t="inlineStr"${ri===0?' s="1"':''}><is><t xml:space="preserve">${xlEsc(v)}</t></is></c>`;
  }).join('')+'</row>').join('');
  return `${P}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${body}</sheetData></worksheet>`;
}
async function tcShBuild(){
  const enc=new TextEncoder(), P='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const roleRows=[TC_SH_ROLEHEAD].concat(tc.roles.map(r=>[r.id, r.name, r.color, r.al||'', r.kw||'', String(r.col)]));
  const help=[['業務手帳の共有ファイル'],['「予定」シートの1行が、予定・メモ1件です。Excel で直したり、行を足したりしても、業務手帳で読み込むと入ります。'],
    ['足すときは ID を空のままにしてください（読み込んだときに付けます）。日付は 2026-10-01、時刻は 10:00 のように入れます。'],
    ['業務は名前で入れます（いくつかあるときは「・」で区切る）。知らない名前は新しい業務として足します。'],
    ['消すときは、行を消さずに「消した」に ○ を入れてください（ほかの端末からも消えます）。'],
    ['「くり返しの設定」「更新」は業務手帳が使います。直さないでください。']];
  const sheets=[['予定', tcShSheetXml(tcShRows(), [16,6,12,6,7,7,14,28,36,6,12,10,20,7])],
    ['業務', tcShSheetXml(roleRows, [12,12,10,20,40,6])], ['使い方', tcShSheetXml(help, [110])]];
  const styles=`${P}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const wb=`${P}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((x,i)=>`<sheet name="${xlEsc(x[0])}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
  const wbRels=`${P}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((x,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const rootRels=`${P}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const ct=`${P}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((x,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const files=[{name:'[Content_Types].xml', u8:enc.encode(ct)}, {name:'_rels/.rels', u8:enc.encode(rootRels)},
    {name:'xl/workbook.xml', u8:enc.encode(wb)}, {name:'xl/_rels/workbook.xml.rels', u8:enc.encode(wbRels)}, {name:'xl/styles.xml', u8:enc.encode(styles)}];
  sheets.forEach((x,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`, u8:enc.encode(x[1])}));
  return await xlsxZip(files);
}
/* シートの XML → 文字の2次元の表 */
function tcShGrid(xml, shared){
  const rows=[]; const re=/<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g; let m;
  while((m=re.exec(xml))){
    const a=m[1], inner=m[3]||''; const rm=/r="([A-Z]+)(\d+)"/.exec(a); if(!rm) continue;
    const c=xlColToIdx(rm[1]), r=parseInt(rm[2],10)-1; if(r<0 || c<0 || r>20000 || c>60) continue;
    const t=(/t="([^"]+)"/.exec(a)||[])[1]||'', v=(/<v>([\s\S]*?)<\/v>/.exec(inner)||[])[1];
    let val='';
    if(t==='inlineStr') val=xlsxRichText(inner);
    else if(t==='s') val=shared[parseInt(v,10)]||'';
    else if(t==='b') val=v==='1'?'TRUE':'';
    else if(v!=null) val=xlUnesc(v);
    (rows[r]=rows[r]||[])[c]=val;
  }
  return rows;
}
async function tcShReadBook(buf){
  const map=await xlsxUnzip(buf), names=[...map.keys()], dec=new TextDecoder();
  const shared=[]; const ss=names.find(n=>/sharedStrings\.xml$/i.test(n));
  if(ss){ const x=dec.decode(map.get(ss)); const re=/<si\b[^>]*>([\s\S]*?)<\/si>/g; let mm; while((mm=re.exec(x))) shared.push(xlsxRichText(mm[1])); }
  const out={}; xlsxWorkbookSheets(map, names, dec).forEach(sh=>{ out[sh.name]=tcShGrid(sh.xml, shared); });
  return out;
}
/* Excel で直したときの形のゆれを直す（日付の通し番号・2026/10/1・0.375＝9:00 など） */
function tcShDate(v){
  v=String(v==null?'':v).trim(); if(!v) return '';
  if(/^\d{4,6}(\.\d+)?$/.test(v) && +v>20000 && +v<80000){ const d=new Date(1899, 11, 30+Math.floor(+v)); return tcIso(d); }
  const m=v.match(/^(\d{4})[-\/年.](\d{1,2})[-\/月.](\d{1,2})日?/);
  if(m){ const s=m[1]+'-'+tcP2(+m[2])+'-'+tcP2(+m[3]); return tcIsDate(s)?s:''; }
  return '';
}
function tcShTime(v){
  v=String(v==null?'':v).trim(); if(!v) return '';
  if(/^0?\.\d+$|^0$/.test(v)){ const mm=Math.round(+v*24*60); return mm>=0 && mm<24*60 ? tcP2(Math.floor(mm/60))+':'+tcP2(mm%60) : ''; }
  let m=v.match(/^(\d{1,2})[:：時](\d{1,2})?/);
  if(m){ const h=+m[1], mi=+(m[2]||0); return h<24 && mi<60 ? tcP2(h)+':'+tcP2(mi) : ''; }
  return '';
}
function tcShStampMs(v){
  v=String(v==null?'':v).trim(); if(!v) return 0;
  if(/^\d{4,6}(\.\d+)?$/.test(v) && +v>20000 && +v<80000) return new Date(1899, 11, 30).getTime()+Math.round(+v*86400000);   // Excel の日時の通し番号
  const m=v.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return m ? new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0)).getTime() : 0;
}
const tcShYes=v=>/^(○|〇|◯|✓|✔|1|true|yes|はい|済|済み|終日|x|ｘ|×)$/i.test(String(v==null?'':v).trim());
/* 読んだブック → {items:[{it, upd, del}], roles:[…]} */
function tcShParse(book){
  const g=book['予定'] || Object.values(book)[0] || [];
  const head=(g[0]||[]).map(x=>String(x||'').trim());
  const col=n=>head.indexOf(n);
  if(col('日付')<0 || col('件名')<0) throw new Error('予定の見出し（日付・件名）が見つかりません');
  const rg=book['業務']||[], rh=(rg[0]||[]).map(x=>String(x||'').trim());
  const roles=rg.slice(1).filter(Boolean).map(r=>({id:r[rh.indexOf('ID')]||'', name:String(r[rh.indexOf('名前')]||'').trim(), color:r[rh.indexOf('色')]||'',
    al:r[rh.indexOf('ほかの呼び名')]||'', kw:r[rh.indexOf('聞き分ける言葉')]||'', col:parseInt(r[rh.indexOf('列')],10)||0})).filter(r=>r.name);
  const rows=[];
  g.slice(1).forEach(r=>{
    if(!r) return;
    const get=n=>{ const i=col(n); return i<0 ? '' : (r[i]==null?'':String(r[i])); };
    const id=get('ID').trim(), del=tcShYes(get('消した')), upd=tcShStampMs(get('更新'));
    if(del){ if(id) rows.push({id, del:true, upd}); return; }
    const date=tcShDate(get('日付')), title=get('件名').trim();
    if(!date || (!title && !get('くわしいメモ').trim())) return;
    const kind=/メモ|memo/i.test(get('種類')) ? 'memo' : 'ev';
    const start=tcShTime(get('開始')), end=tcShTime(get('終了'));
    let rep=null; try{ rep=tcCleanRep(JSON.parse(get('くり返しの設定')||'null')); }catch(_){ rep=null; }
    if(!rep){ const lb=get('くり返し').trim(); const k=(TC_REPS.find(x=>x[0] && (x[1]===lb || x[1].replace(/（.*/,'')===lb))||[])[0];
      if(k) rep={f:k==='w2'?'w':k, n:k==='w2'?2:1, until:null, ex:[], dd:[]}; }
    rows.push({id, del:false, upd, names:get('業務').split(/[・,、，\/／\s]+/).map(x=>x.trim()).filter(Boolean),
      it:{kind, date, allDay:kind==='ev' && (tcShYes(get('終日')) || !start), start:start||null, end:end||null, title, note:get('くわしいメモ').replace(/\r\n?/g,'\n'),
        done:kind==='memo' && tcShYes(get('済み')), rep}});
  });
  return {rows, roles};
}
/* 名前 → 業務の id（知らない名前はファイルの「業務」シートの色で新しく足す） */
function tcShRoleIds(names, fileRoles){
  const ids=[];
  names.forEach(nm=>{
    const low=nm.toLowerCase();
    let r=tc.roles.find(x=>x.name===nm) || tc.roles.find(x=>String(x.al||'').split(/[,、，]/).map(a=>a.trim().toLowerCase()).includes(low));
    if(!r && tc.roles.length<TC_MAX_ROLES){
      const fr=(fileRoles||[]).find(x=>x.name===nm)||{};
      const used=new Set(tc.roles.map(x=>x.color));
      let id=/^[\w-]{1,24}$/.test(fr.id||'') && !tc.roles.some(x=>x.id===fr.id) ? fr.id : 'r'+Date.now().toString(36)+tc.roles.length;
      r={id, name:nm.slice(0,12), color:/^#[0-9a-f]{6}$/i.test(fr.color||'') ? fr.color.toLowerCase() : (TC_COLORS.find(c=>!used.has(c))||TC_COLORS[0]),
        kw:String(fr.kw||'').slice(0,300), al:String(fr.al||'').slice(0,120), col:Math.min(TC_MAX_ROLES, Math.max(1, fr.col||tc.roles.length+1))};
      tc.roles.push(r);
    }
    if(r && !ids.includes(r.id)) ids.push(r.id);
  });
  return ids;
}
const tcShBody=it=>JSON.stringify([it.kind, it.date, !!it.allDay, it.start||'', it.end||'', it.roles.slice().sort(), it.title, it.note, !!it.done, it.rep||null]);
/* 読んだ中身を手帳に合わせる。{add, upd, del, needWrite} を返す */
function tcShMerge(inc){
  const res={add:0, upd:0, del:0, needWrite:false};
  const seen=new Set(), now=Date.now();
  if(!Array.isArray(tc.dels)) tc.dels=[];
  inc.rows.forEach(row=>{
    if(row.id) seen.add(row.id);
    const i=row.id ? tc.items.findIndex(x=>x.id===row.id) : -1, cur=i>=0 ? tc.items[i] : null;
    const tomb=row.id ? tc.dels.find(d=>d.id===row.id) : null;
    if(row.del){
      if(cur && tcShSec(row.upd||now)>=tcShSec(cur.upd)){ tc.items.splice(i,1); res.del++; tcTomb(row.id); tc.dels[tc.dels.length-1].t=row.upd||now; }
      else if(cur) res.needWrite=true;
      else if(!tomb) tc.dels.push({id:row.id, t:row.upd||now});
      return;
    }
    const roles=tcShRoleIds(row.names, inc.roles);
    const base=Object.assign({}, row.it, {roles:roles.length?roles:[(cur&&cur.roles[0])||tc.ui.lastRole||tc.roles[0].id]});
    if(!cur){
      if(tomb && tcShSec(tomb.t)>=tcShSec(row.upd)){ res.needWrite=true; return; }   // こちらで消したもの
      const it=tcCleanItem(Object.assign({id:row.id||tcNewId(), cre:row.upd||now, upd:row.upd||now}, base), tc.roles.map(r=>r.id));
      if(!it) return;
      if(tomb) tc.dels=tc.dels.filter(d=>d.id!==it.id);
      tc.items.push(it); res.add++;
      if(!row.id || !row.upd) res.needWrite=true;   // ID・更新を書き足す
      return;
    }
    const fs=tcShSec(row.upd), ls=tcShSec(cur.upd);
    const cand=tcCleanItem(Object.assign({id:cur.id, cre:cur.cre, upd:row.upd||now}, base), tc.roles.map(r=>r.id));
    if(!cand) return;
    // くり返しの「この日だけ消す・済み」は、ファイルに設定がなければ手元を残す
    if(cand.rep && cur.rep && !cand.rep.ex.length && !cand.rep.dd.length && cand.rep.f===cur.rep.f){ cand.rep.ex=cur.rep.ex.slice(); cand.rep.dd=cur.rep.dd.slice(); }
    const differ=tcShBody(cand)!==tcShBody(cur);
    if(fs>ls || ((fs===ls || !fs) && differ)){
      if(differ){ if(!fs || fs===ls) cand.upd=Math.max(now, cur.upd+1000); tc.items[i]=cand; res.upd++; if(!fs || fs===ls) res.needWrite=true; }
    } else if(fs<ls && differ) res.needWrite=true;
  });
  // 手元にあってファイルにないもの・手元で消したものは書き足す
  if(tc.items.some(it=>!seen.has(it.id)) || tc.dels.some(d=>!seen.has(d.id))) res.needWrite=true;
  return res;
}
const tcShDataSig=()=>JSON.stringify([tc.items, tc.roles.map(r=>[r.id,r.name,r.color,r.al,r.kw,r.col]), tc.dels||[]]);

/* ── ファイルとのやりとり ── */
async function tcShPerm(ask){
  if(!tcShHandle) return 'none';
  try{
    const o={mode:'readwrite'};
    let p=tcShHandle.queryPermission ? await tcShHandle.queryPermission(o) : 'granted';
    if(p!=='granted' && ask && tcShHandle.requestPermission) p=await tcShHandle.requestPermission(o);
    return p;
  }catch(_){ return 'denied'; }
}
async function tcShSync(opt){
  opt=opt||{};
  if(!tcShHandle || !tc) return null;
  if(tcShBusy){ tcShAgain=true; return null; }
  tcShBusy=true; clearTimeout(tcShTimer);
  let res=null;
  try{
    const p=await tcShPerm(!!opt.ask);
    if(p!=='granted'){ tcShState='need'; tcShBar(); return null; }
    const f=await tcShHandle.getFile();
    res={add:0, upd:0, del:0, needWrite:true};
    if(f.size>0){ res=tcShMerge(tcShParse(await tcShReadBook(await f.arrayBuffer()))); }
    const changed=res.add+res.upd+res.del>0;
    if(changed){ try{ localStorage.setItem(TC_KEY, JSON.stringify(tc)); }catch(_){} }
    if(res.needWrite || changed || opt.force){
      const w=await tcShHandle.createWritable(); await w.write(await tcShBuild()); await w.close();
    }
    tcShSig=tcShDataSig(); tcShState='ok';
    const m=tcShMeta(); m.name=tcShHandle.name||m.name||''; m.at=Date.now(); tcShSetMeta(m);
    tcShBar();
    if(changed){
      if(isDlgOpen('techoOverlay')) tcRender();
      if(isDlgOpen('techoBoardOverlay')) tcRenderBoard();
      const t=[res.add?'足した '+res.add+'件':'', res.upd?'直した '+res.upd+'件':'', res.del?'消した '+res.del+'件':''].filter(Boolean).join('・');
      toast('共有ファイルから取り込みました（'+t+'）', 3500);
    } else if(opt.say) toast('共有ファイルと合わせました（変わったものはありません）');
  }catch(e){
    tcShState='err'; tcShBar(e && e.message);
  }finally{
    tcShBusy=false;
    if(isDlgOpen('techoSetOverlay')) tcRenderSet();
    if(tcShAgain){ tcShAgain=false; tcShSchedule(); }
  }
  return res;
}
function tcShSchedule(){ clearTimeout(tcShTimer); tcShTimer=setTimeout(()=>tcShSync(), 1200); }
/* 手帳をしまうたびに：中身（予定・メモ・業務・消した印）が変わっていれば、少し待ってファイルへ */
function tcShOnSave(){
  if(!tcShHandle || tcShState!=='ok' || !tc) return;
  const sig=tcShDataSig(); if(sig===tcShSig) return;
  tcShSchedule();
}
/* 開いたとき：覚えているファイルがあれば読む（読んでよいか聞く必要があれば上に帯を出す） */
async function tcShInit(again){
  if(!tcShOK()) { tcShBar(); return; }
  if(!tcShLoaded){ tcShLoaded=true; const h=await tcShDbGet(); if(h && !tcShHandle) tcShHandle=h; }
  if(!tcShHandle){ tcShBar(); return; }
  const p=await tcShPerm(false);
  if(p==='granted') await tcShSync();
  else { tcShState='need'; tcShBar(); }
}
function tcShBar(msg){
  const el=document.getElementById('tcShBar'); if(!el) return;
  const nm=tcEsc((tcShHandle && tcShHandle.name) || tcShMeta().name || '');
  if(tcShHandle && tcShState==='need'){
    el.className='tc-shbar'; el.hidden=false;
    el.innerHTML=`<span>📄 共有ファイル「${nm}」を読み込みます</span><button onclick="tcShSync({ask:true, say:true})">読み込む</button>`;
  } else if(tcShHandle && tcShState==='err'){
    el.className='tc-shbar err'; el.hidden=false;
    el.innerHTML=`<span>⚠ 共有ファイル「${nm}」を読み書きできませんでした${msg?'（'+tcEsc(msg)+'）':''}</span><button onclick="tcShSync({ask:true, say:true})">もう一度</button><button class="x" onclick="this.parentNode.hidden=true" aria-label="閉じる">✕</button>`;
  } else { el.hidden=true; el.innerHTML=''; }
}
/* ── 設定の「📄 共有ファイル」 ── */
function tcShSetHtml(){
  const m=tcShMeta(), at=m.at ? tcShStamp(m.at).slice(5,16).replace('-','/') : '';
  let h='';
  if(tcShOK()){
    if(tcShHandle){
      const st=tcShState==='ok' ? '（最後に合わせた：'+at+'）' : tcShState==='need' ? '（読み込むには「いま合わせる」を押してください）' : tcShState==='err' ? '（読み書きできませんでした）' : '';
      h+=`<div class="tc-shcur">使っているファイル：<b>${tcEsc(tcShHandle.name||m.name||'')}</b> ${st}</div>
        <div class="tc-edbtns"><button onclick="tcShSync({ask:true, say:true})">⇅ いま合わせる</button><button onclick="tcShUnlink()">解除</button></div>`;
    } else {
      h+=`<div class="tc-edbtns"><button onclick="tcShLink(true)">📄 新しく共有ファイルを作る</button><button onclick="tcShLink(false)">📂 ある共有ファイルを使う</button></div>`;
    }
    h+=`<div class="tc-note">OneDrive・Google ドライブ・社内の共有フォルダなど、みんなが開ける場所のファイルを決めると、手帳を開くたびに読み込み、変えるたびに書き込みます（ほかの人の変更と合わせてから書くので、消えません）。ブラウザを開き直したあとは、上に出る「読み込む」を1回押してください。</div>`;
  } else {
    h+=`<div class="tc-note">この端末のブラウザは、決めたファイルを覚えておけません（パソコンの Chrome・Edge なら覚えておけます）。下の <b>Excelに書き出す</b>／<b>Excelから読み込む</b> で受け渡してください。</div>`;
  }
  h+=`<div class="tc-edbtns"><button onclick="tcShExport()">⬇ Excelに書き出す</button><button onclick="document.getElementById('tcShFile').click()">⬆ Excelから読み込む</button></div>
    <input type="file" id="tcShFile" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onchange="tcShImport(event)">
    <div class="tc-note">Excel の「予定」シートは1行が1件です。Excel で直したり行を足したりしても、読み込むと入ります（消すときは行を消さずに「消した」に ○）。同じ予定は、あとで直した方を残します。</div>`;
  return h;
}
async function tcShLink(create){
  try{
    let h;
    if(create) h=await window.showSaveFilePicker({suggestedName:'業務手帳_共有.xlsx', types:TC_SH_TYPES});
    else { const a=await window.showOpenFilePicker({types:TC_SH_TYPES, multiple:false}); h=a && a[0]; }
    if(!h) return;
    tcShHandle=h; tcShLoaded=true; tcShState='';
    await tcShDbPut(h);
    tcShSetMeta({name:h.name||'', at:0});
    const r=await tcShSync({ask:true, force:create});
    if(r) toast(create ? '共有ファイル「'+(h.name||'')+'」を作りました' : '共有ファイル「'+(h.name||'')+'」を使います');
    if(isDlgOpen('techoSetOverlay')) tcRenderSet();
  }catch(e){ if(!(e && e.name==='AbortError')) toast('共有ファイルを決められませんでした'); }
}
async function tcShUnlink(){
  if(!tcShHandle) return;
  if(!await appConfirm('共有ファイルの設定を外しますか（ファイルはそのまま残ります）', '外す', 'やめる')) return;
  tcShHandle=null; tcShState=''; clearTimeout(tcShTimer);
  await tcShDbPut(null); tcShSetMeta(null); tcShBar(); tcRenderSet();
  toast('共有ファイルの設定を外しました');
}
async function tcShExport(){
  try{
    const blob=await tcShBuild();
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement('a'), {href:url, download:'業務手帳_共有_'+tcTodayIso()+'.xlsx'});
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(_){} }, 1500);
    toast('Excel に書き出しました（'+tc.items.length+'件）');
  }catch(_){ toast('Excel に書き出せませんでした'); }
}
async function tcShImport(ev){
  const f=ev.target.files && ev.target.files[0]; ev.target.value=''; if(!f) return;
  try{
    const res=tcShMerge(tcShParse(await tcShReadBook(await f.arrayBuffer())));
    tcSave(); tcRender(); if(isDlgOpen('techoSetOverlay')) tcRenderSet();
    const t=[res.add?'足した '+res.add+'件':'', res.upd?'直した '+res.upd+'件':'', res.del?'消した '+res.del+'件':''].filter(Boolean).join('・');
    toast(t ? 'Excel から取り込みました（'+t+'）' : '取り込むものはありませんでした（もう入っています）', 3500);
  }catch(e){ toast('Excel を読み込めませんでした'+(e && e.message && /見出し/.test(e.message) ? '（'+e.message+'）' : '（業務手帳の共有ファイルか確かめてください）'), 4000); }
}

/* ── 🖨 印刷（共通の「印刷のしかた」に乗せる） ── */
if(typeof PRN_TOOLS==='object' && PRN_TOOLS){
  PRN_TOOLS.techo={ n:'📔 業務手帳', fit:true, fitLb:'📄 1枚に収める', footLb:'📝 下に作った日を出す',
    extras:[['week','📅 1週間ぶんにする（オフ＝選んだ日だけ）'],['memo','📝 メモも出す'],['note','🗒 くわしいメモも出す']],
    print:()=>tcPrint(), image:()=>tcImage() };
  try{
    const o=prnOpts('techo');
    if(typeof o.week!=='boolean') o.week=false;
    if(typeof o.memo!=='boolean') o.memo=true;
    if(typeof o.note!=='boolean') o.note=false;
  }catch(_){}
}
function tcOpenPrint(){
  const po=document.getElementById('prnOverlay');
  if(po) document.body.appendChild(po);              // 業務手帳の上に出す（あとから差し込んだ窓より前にあるため）
  if(typeof openPrn==='function') openPrn('techo');
}
function tcPrintItemHtml(it, ds, o){
  const c=(tcRole(it.roles[0])||{}).color||'#999';
  const when=it.kind==='memo' ? (tcDoneOn(it, ds)?'☑':'☐') : (it.allDay ? '終日' : it.start+'〜'+it.end);
  return `<div class="tc-pi" style="border-left-color:${c}"><b>${tcEsc(when)}</b>${tcEsc(it.title||'（件名なし）')}${it.rep?' ↻':''}`
    +(o.note && it.note ? `<div class="tc-pn">${tcEsc(it.note)}</div>` : '')+'</div>';
}
function tcPrintCell(ds, c, o){
  const its=tcItemsOn(ds, true).filter(it=>it.roles.some(id=>c.ids.includes(id)) && (o.memo || it.kind!=='memo'));
  its.sort((a,b)=>(a.kind==='memo')-(b.kind==='memo') || (b.allDay?1:0)-(a.allDay?1:0) || String(a.start||'').localeCompare(String(b.start||'')));
  return its.map(it=>tcPrintItemHtml(it, ds, o)).join('');
}
function tcPrintHtml(){
  const o=(typeof prnOpts==='function') ? prnOpts('techo') : {week:false, memo:true, note:false};
  const cols=tcColumns();
  const th=cols.map(c=>`<th>${c.roles.map(r=>`<i style="background:${r.color}"></i>`).join('')}${tcEsc(c.name)}</th>`).join('');
  const wdCls=ds=>{ const w=tcD(ds).getDay(); return (w===0||tcHol(ds))?'tc-sun':(w===6?'tc-sat':''); };
  let title, body;
  if(o.week){
    const s=tcWeekStart(tcSel), days=[0,1,2,3,4,5,6].map(i=>tcAdd(s,i));
    title=tcMD(days[0])+'〜'+tcMD(days[6]);
    body=`<table><thead><tr><th style="width:70px"></th>${th}</tr></thead><tbody>`
      +days.map(ds=>`<tr><td class="tc-pk ${wdCls(ds)}">${tcMDs(ds)}${tcHol(ds)?'<br>'+tcEsc(tcHol(ds)):''}</td>${cols.map(c=>`<td>${tcPrintCell(ds, c, o)}</td>`).join('')}</tr>`).join('')
      +'</tbody></table>';
  } else {
    title=tcSel.slice(0,4)+'年'+tcMD(tcSel)+(tcHol(tcSel)?' '+tcHol(tcSel):'');
    body=`<table><thead><tr>${th}</tr></thead><tbody><tr>${cols.map(c=>`<td>${tcPrintCell(tcSel, c, o)||'—'}</td>`).join('')}</tr></tbody></table>`;
  }
  return `<div class="op-doc"><div class="tc-pdoc"><div class="tc-pt">📔 業務手帳　${tcEsc(title)}</div>`
    +`<div class="tc-ps">${tcEsc(cols.map(c=>c.name).join(' ／ '))}（${{split:'業務ごと',merge:'まとめて',group:'組み合わせ'}[tc.ui.view]}）</div>${body}`
    +`<div class="vp-foot" style="font-size:9px;color:#666;margin-top:6px;text-align:right">${tcTodayIso()} 作成（表電卓 ${typeof APP_VERSION!=='undefined'?APP_VERSION:''}）</div></div></div>`;
}
function tcPrint(){
  if(typeof closePrn==='function' && isDlgOpen('prnOverlay')) closePrn();
  const built=prnBuild('techo', tcPrintHtml());
  opPrint(built);
  return built.k;
}
async function tcImage(){
  const built=prnBuild('techo', tcPrintHtml());
  return opImage(built, '業務手帳', false);
}
