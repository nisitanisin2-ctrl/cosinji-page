/* 🧱 供試体（v611。表電卓の 道具。apps/kyoshi/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   現場で 採った 供試体（テストピース）の 採った日・現場・配合・材齢（7日・28日 など）・本数を 入れると、
   試験の 日（採った日 ＋ 材齢）を 出す。
   ・📅 試験の 予定：⚠ 過ぎた（まだ ✓ して いない。2週間まで）・きょう・あした・この先（日ごと）。日曜・祝日は 赤、土曜は 青。
     「✓ 試験した」で 済み（↶ で 取り消し）。
   ・🧱 採った 供試体：採った日ごと（新しい 順・🔎 さがす）。押すと くわしく（材齢を 足す／外す・本数・済み・直す・消す）。
     🧹 古い もの（試験が 3か月 より 前）を 一覧から 片づける（カレンダーは そのまま）。
   ・☁ Google カレンダーに 自動で：自分の Google の Apps Script（ウェブアプリ）に 送って、終日の 予定を 作る・直す・消す。
     コード（合言葉 入り。gasCode）を 📋 コピー → script.new に 貼って デプロイ → URL を 貼って 🧪 ためしに 送る。
     予定には 印（タグ hyo＝供試体の id-材齢）を 付け、同じ ものは 2つ 作らない。前の日の 17時 などに 知らせ。
     電波が ない ときは ためて おき、電波が もどった とき・表電卓を 開いた とき（app.js の kyoshiKick）・この 道具を 開いた ときに 送る。
     送り先は 自分で 貼った script.google.com の URL だけ（index.html の connect-src も その 2つだけ 足して ある）。
   ・設定しない ときは 📅 カレンダーに（hyoics.js：.ics の 保存・送る・🗓 Google カレンダーで 開く）。入れた あとに 窓を 出す（出さない ことも）。
   ・📋 文字で コピー。中身は excalc_kyoshi（この 端末の 中。設定の バックアップに 入る）。 */
(function(){
'use strict';
const KEY='excalc_kyoshi', MAX_IT=1000, MAX_DQ=300, LATE_DAYS=14, BATCH=10, LIST_STEP=80;   // BATCH：1回に 送る 数（Apps Script は 1つ 1〜2秒 かかる ことが ある）
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const ABC='abcdefghijklmnopqrstuvwxyz0123456789';
function rnd(n, abc){ abc=abc||ABC; const a=new Uint8Array(n); try{ crypto.getRandomValues(a); }catch(_){ for(let i=0;i<n;i++) a[i]=Math.floor(Math.random()*256); } return Array.from(a, b=>abc[b%abc.length]).join(''); }
const rid=()=>rnd(8);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);   // onclick に 入れるので 英数字だけ
const okKey=x=>typeof x==='string' && /^[A-Za-z0-9_-]{1,40}$/.test(x);
const okTok=x=>typeof x==='string' && /^[A-Za-z0-9_-]{6,40}$/.test(x);
function intIn(v, a, b, dflt){ const t=String(v==null?'':v).normalize('NFKC').replace(/[,\s日本]/g,''); if(t==='') return dflt; const n=Math.round(parseFloat(t)); return isFinite(n) ? Math.min(b, Math.max(a, n)) : dflt; }

/* ───────── 日付 ───────── */
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
function okDate(s){
  const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s||'')); if(!m) return null;
  const y=+m[1], mo=+m[2]-1, d=+m[3], t=new Date(y,mo,d);
  return (y>=2000 && y<=2200 && t.getMonth()===mo && t.getDate()===d) ? t : null;
}
let fixedToday=null;   // ためす とき だけ（KYOSHI.today('2026-10-31')）
function today(){ const t=fixedToday ? okDate(fixedToday) : null, d=t||new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
const dayNo=d=>Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/86400000);
const diff=(a,b)=>dayNo(a)-dayNo(b);   // a − b（日）
const addDays=(d,n)=>new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
const WD='日月火水木金土';
const md=d=>(d.getMonth()+1)+'月'+d.getDate()+'日';
const mdw=d=>(d.getFullYear()!==today().getFullYear() ? d.getFullYear()+'年' : '')+md(d)+'（'+WD[d.getDay()]+'）';
const ymdJa=d=>d.getFullYear()+'年'+md(d)+'（'+WD[d.getDay()]+'）';
const hol=d=>{ try{ return typeof tbHolName==='function' ? tbHolName(d) : ''; }catch(_){ return ''; } };   // 祝日（当番表と 同じ 計算）
const dayCls=d=>hol(d) || d.getDay()===0 ? 'sun' : d.getDay()===6 ? 'sat' : '';
const dHtml=d=>{ const hn=hol(d); return `<span class="kyo-d ${dayCls(d)}">${esc(mdw(d))}${hn ? `<small>${esc(hn)}</small>` : ''}</span>`; };
const tdOf=(it, a)=>addDays(okDate(it.date), a.d);

/* ───────── 決まり ───────── */
const AGE_CHOICES=[1,3,7,14,28,56,91];
const ALARMS=[['p17','前の日の 17時',420],['p9','前の日の 9時',900],['none','知らせない',null]];   // 終日の 予定の 0時から 何分 前
const COLOR={todo:'6', done:'8'};   // Google カレンダーの 予定の 色（6＝みかん・8＝グラファイト）

/* ───────── 状態 ───────── */
let st=null;
function cleanG2(x){   // 送った 予定の 控え
  if(!x || typeof x!=='object') return null;
  const g={id:oneLine(x.id,200), sd:okDate(x.sd) ? x.sd : '', h:oneLine(x.h,20), c:oneLine(x.c,60), e:oneLine(x.e,120)};
  return g.id || g.e ? g : null;
}
function cleanAge(x){
  if(!x || typeof x!=='object') return null;
  const d=Number(x.d); if(!(Number.isInteger(d) && d>=1 && d<=365)) return null;   // 0日・366日 より 先は 入れない
  return {d, n:intIn(x.n,1,30,3), done:okDate(x.done) ? x.done : '', g:cleanG2(x.g)};
}
function cleanIt(x){
  if(!x || typeof x!=='object') return null;
  const date=okDate(x.date) ? x.date : '', site=oneLine(x.site,40);
  if(!date || !site) return null;
  const seen=new Set(), ages=(Array.isArray(x.ages) ? x.ages : []).map(cleanAge).filter(a=>a && !seen.has(a.d) && seen.add(a.d)).sort((a,b)=>a.d-b.d).slice(0,12);
  if(!ages.length) return null;
  const at=Number(x.at);
  return {id:okId(x.id) ? x.id : rid(), date, site, mix:oneLine(x.mix,30), part:oneLine(x.part,30), no:oneLine(x.no,30), memo:multi(x.memo,200), ages, at:isFinite(at) && at>0 ? at : Date.now()};
}
function cleanG(o){
  o=(o && typeof o==='object') ? o : {};
  const p=parseUrl(o.url);
  return {url:p ? p.url : '', tok:okTok(o.tok) ? o.tok : '', on:o.on!==false, cal:oneLine(o.cal,60), calName:oneLine(o.calName,60),
    alarm:ALARMS.some(a=>a[0]===o.alarm) ? o.alarm : 'p17', last:typeof o.last==='string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(o.last) ? o.last : '', err:oneLine(o.err,160), net:oneLine(o.net,160)};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const items=(Array.isArray(o.items) ? o.items : []).map(cleanIt).filter(Boolean).slice(0,MAX_IT);
  items.forEach((it,i,a)=>{ if(a.findIndex(x=>x.id===it.id)<i) it.id=rid(); });   // 同じ id は 1つに
  const dq=(Array.isArray(o.dq) ? o.dq : []).map(d=>d && okKey(d.k) ? {k:d.k, id:oneLine(d.id,200), sd:okDate(d.sd) ? d.sd : '', c:oneLine(d.c,60), e:oneLine(d.e,120)} : null).filter(Boolean).slice(-MAX_DQ);
  const def=(o.def && typeof o.def==='object') ? o.def : {};
  const dAges=[...new Set((Array.isArray(def.ages) ? def.ages : [7,28]).map(v=>intIn(v,1,365,0)).filter(Boolean))].sort((a,b)=>a-b).slice(0,12);
  st={items, dq, view:['plan','list'].includes(o.view) ? o.view : 'plan', def:{ages:dAges.length ? dAges : [7,28], n:intIn(def.n,1,30,3), ask:def.ask!==false}, g:cleanG(o.g), q:0};
}
function save(){
  pm=null; st.q=gOn() ? plan().length : 0;   // 送る 予定の 数（表電卓が 開いた ときに 見る）
  try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); return false; }
}
const itOf=id=>st.items.find(x=>x.id===id)||null;
const ageOf=(it, d)=>it ? it.ages.find(a=>a.d===+d)||null : null;

/* ───────── 試験の 一覧 ───────── */
function tests(){
  const T=today(), L=[];
  st.items.forEach(it=>{ const sd=okDate(it.date); it.ages.forEach(a=>{ const td=addDays(sd, a.d); L.push({it, a, sd, td, dd:diff(td, T)}); }); });
  L.sort((x,y)=>x.dd-y.dd || x.it.site.localeCompare(y.it.site,'ja') || x.a.d-y.a.d);
  return L;
}
const stOf=x=>x.a.done ? 'dn' : x.dd<0 ? 'late' : x.dd===0 ? 'today' : '';

/* ───────── 予定の 中身（☁ Google・📅 .ics で 同じ） ───────── */
function evOf(it, a){
  const sd=okDate(it.date), td=addDays(sd, a.d), dn=okDate(a.done);
  const title=(a.done ? '✅ ' : '🧱 ')+a.d+'日 試験'+(a.done ? ' 済み' : '')+'：'+it.site+(it.mix ? ' '+it.mix : '')+' '+a.n+'本';
  const desc=['採った日：'+ymdJa(sd), '材齢：'+a.d+'日（試験の 日 '+ymdJa(td)+'）', it.mix ? '配合：'+it.mix : '', it.part ? '打設箇所：'+it.part : '', it.no ? '番号：'+it.no : '',
    '本数：'+a.n+'本', dn ? '✓ 試験 済み（'+md(dn)+'）' : '', it.memo ? 'メモ：'+it.memo : '', '（🧱 表電卓の 供試体 から）'].filter(Boolean).join('\n');
  return {k:it.id+'-'+a.d, date:ymd(td), title, desc, color:a.done ? COLOR.done : COLOR.todo};
}
const alarmMin=()=>(ALARMS.find(x=>x[0]===st.g.alarm)||ALARMS[0])[2];
const alarmNote=()=>{ const a=ALARMS.find(x=>x[0]===st.g.alarm)||ALARMS[0]; return a[2]==null ? '知らせは なし' : a[1]+'に 知らせ'; };
function hsh(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h.toString(36); }
const evHash=e=>hsh(JSON.stringify([e.date, e.title, e.desc, e.color, alarmMin()]));

/* ───────── ☁ Google カレンダーに 自動で（自分の Apps Script） ───────── */
const G_URL_RE=/^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]{1,100}|macros)\/s\/[A-Za-z0-9_-]{20,200}\/exec$/;
// 貼った 字から URL（と「ほかの スマホ 用」の 合言葉）を 取り出す
function parseUrl(s){
  s=String(s==null?'':s).normalize('NFKC').trim().replace(/^[<「"']+|[>」"']+$/g,'');
  let tok='';
  const m=/#(?:aikotoba|k)=([A-Za-z0-9_-]{6,40})$/.exec(s); if(m){ tok=m[1]; s=s.slice(0, m.index); }
  s=s.replace(/[?#].*$/,'');
  return G_URL_RE.test(s) ? {url:s, tok} : null;
}
const gOn=()=>!!(st && st.g.url && st.g.tok && st.g.on);
const newTok=()=>rnd(12, 'abcdefghijkmnpqrstuvwxyz23456789');
// 送る もの（消す・カレンダーを 移す・作る／直す）。過ぎた 日で まだ 送って いない ものは 送らない
function plan(){
  if(!st) load();
  const out=[], T=ymd(today()), cal=st.g.cal;
  st.dq.forEach(d=>out.push({t:'dq', d, op:{op:'del', k:d.k, id:d.id, date:d.sd, sd:d.sd, cal:d.c}}));
  st.items.forEach(it=>it.ages.forEach(a=>{
    const e=evOf(it, a), g=a.g, sent=!!(g && g.id), past=e.date<T;
    let id=sent ? g.id : '', sd=sent ? g.sd : '';
    if(sent && (g.c||'')!==cal){
      if(past) return;   // 過ぎた ものは もとの カレンダーに 置いて おく
      out.push({t:'mv', it, a, op:{op:'del', k:e.k, id:g.id, date:g.sd, sd:g.sd, cal:g.c||''}}); id=''; sd='';
    }
    else if(sent && g.h===evHash(e)) return;   // もう 入って いる
    if(!sent && past) return;
    out.push({t:'put', it, a, h:evHash(e), op:{op:'put', k:e.k, date:e.date, sd, id, title:e.title, desc:e.desc, alarm:alarmMin(), color:e.color, cal}});
  }));
  return out;
}
// 送る ものの 覚え（試験 1つ → plan の 1つ）。save() と 画面を 作る たびに 作り直す
let pm=null;
function pmap(){ if(!pm){ pm=new Map(); plan().forEach(p=>{ if(p.a) pm.set(p.a, p); }); } return pm; }
// 1つの 試験の ☁ の ようす：ok（入って いる）・wait（まだ）・err（送れなかった）・''（送らない）
function gState(it, a){
  if(!gOn()) return '';
  if(!pmap().has(a)) return a.g && a.g.id ? 'ok' : '';
  return a.g && a.g.e ? 'err' : 'wait';
}
const G_ICON={ok:['☁✓','Google カレンダーに 入って います'], wait:['⏳','まだ Google カレンダーに 送って いません'], err:['⚠','Google カレンダーに 送れませんでした']};
const gIcon=(it, a)=>{ const s=gState(it, a), x=G_ICON[s]; return x ? `<i class="kyo-g ${s}" title="${x[1]}" aria-label="${x[1]}">${x[0]}</i>` : ''; };
let syncing=false, again=false, kickT=0, retryT=0;
function kick(ms){ if(!gOn()) return; clearTimeout(kickT); kickT=setTimeout(()=>{ sync('auto'); }, ms==null ? 800 : ms); }
async function post(body){
  if(!st.g.url) return {ok:false, kind:'cfg', msg:'URL が 入って いません'};
  if(typeof navigator!=='undefined' && navigator.onLine===false) return {ok:false, kind:'off', msg:'電波が ありません（もどったら 送ります）'};
  let ctl=null, tm=0; try{ ctl=new AbortController(); tm=setTimeout(()=>ctl.abort(), 150000); }catch(_){}
  let r=null;
  try{ r=await fetch(st.g.url, {method:'POST', body:JSON.stringify(body), redirect:'follow', cache:'no-store', credentials:'omit', signal:ctl ? ctl.signal : undefined}); }
  catch(e){ clearTimeout(tm); return {ok:false, kind:'net', msg:e && e.name==='AbortError' ? '返事が ありませんでした（時間切れ）' : 'つながりませんでした（電波・URL・デプロイの「アクセスできる ユーザー：全員」を たしかめて ください）'}; }
  clearTimeout(tm);
  let j=null; try{ j=await r.json(); }catch(_){}
  if(!j || typeof j!=='object') return {ok:false, kind:'bad', msg:'返事が 読めませんでした（コードを 貼り直して、デプロイし直して ください）'};
  if(!j.ok){
    if(j.err==='token') return {ok:false, kind:'token', msg:'合言葉が ちがいます（📋 コードを コピーして 貼り直し、デプロイし直して ください）'};
    if(j.err==='busy') return {ok:false, kind:'net', msg:'Apps Script が 混み合って います（あとで 送ります）'};
    return {ok:false, kind:'bad', msg:'Apps Script で うまく いきませんでした（'+oneLine(j.err,60)+'）'};
  }
  return {ok:true, data:j};
}
const errOf=x=>x ? oneLine(x.err||'うまく いきませんでした',80) : '返事が ありませんでした';
function applyRes(p, x){
  const ok=!!(x && x.ok);
  if(p.t==='dq'){ if(ok){ const i=st.dq.indexOf(p.d); if(i>=0) st.dq.splice(i,1); } else p.d.e=errOf(x); return ok; }
  if(p.t==='mv'){ if(ok && p.a.g && p.a.g.id===p.op.id) p.a.g=null; return ok; }
  const alive=st.items.includes(p.it) && p.it.ages.includes(p.a);
  if(ok && x.id){
    const id=oneLine(x.id,200);
    if(!alive){ st.dq.push({k:p.op.k, id, sd:p.op.date, c:p.op.cal, e:''}); return true; }   // 送って いる 間に 消した もの は 消しに 行く
    p.a.g={id, sd:p.op.date, h:p.h, c:p.op.cal, e:''};
    return true;
  }
  if(alive) p.a.g=Object.assign({id:'', sd:'', h:'', c:'', e:''}, p.a.g||{}, {e:ok ? '予定の id が 返って きませんでした' : errOf(x)});
  return false;
}
// 送る（why：user＝押した・auto＝入れた／直した あと・bg＝表電卓が 開いた／電波が もどった）
async function sync(why){
  if(!st) load();
  if(!gOn()) return {sent:0};
  if(syncing){ again=true; return {busy:true}; }
  const P=plan().slice(0, BATCH);
  if(!P.length){ if(why==='user') toastS('☁ 送る ものは ありません（ぜんぶ 入って います）'); return {sent:0}; }
  syncing=true; refresh();
  let res;
  try{ res=await post({t:st.g.tok, cal:st.g.cal, ops:P.map(p=>p.op)}); }
  catch(e){ res={ok:false, kind:'net', msg:'つながりませんでした'}; }
  finally{ syncing=false; }
  if(!res.ok){
    const wait=res.kind==='off' || res.kind==='net';   // 電波・つながらない は 待って また 送る
    if(wait) st.g.net=res.msg; else st.g.err=res.msg;
    save(); refresh();
    if(why==='user' || (!wait && why==='auto')) toastS('☁ '+res.msg, 4600);
    clearTimeout(retryT); if(wait && isOpen()) retryT=setTimeout(()=>kick(0), 60000);   // 開いて いる 間は 1分 ごとに
    again=false;
    return {sent:0, err:res.msg, kind:res.kind};
  }
  const R=Array.isArray(res.data.res) ? res.data.res : [];
  let put=0, del=0, bad=0, first='';
  P.forEach((p,i)=>{ if(applyRes(p, R[i])){ if(p.t==='put') put++; else del++; } else { bad++; if(!first) first=errOf(R[i]); } });
  st.g.err=bad ? bad+'件 送れませんでした（'+first+'）' : ''; st.g.net='';
  st.g.last=new Date().toISOString();
  save(); refresh();
  if((put || del) && why!=='silent') toastS('☁ Google カレンダーに '+[put ? put+'件 入れました' : '', del ? del+'件 消しました' : ''].filter(Boolean).join('・'), 2600);
  if(bad && why==='user') toastS('⚠ '+st.g.err, 4600);
  if(again || (!bad && plan().length)){ again=false; kick(300); }   // のこりを つづけて
  return {sent:put+del, put, del, bad};
}
async function gtest(){
  const inp=$('kyoGUrl'), p=parseUrl(inp ? inp.value : st.g.url);
  if(!p){ toastS('URL が ちがう ようです（https://script.google.com/macros/s/…/exec）', 4600); return false; }
  st.g.url=p.url; if(p.tok) st.g.tok=p.tok; if(!st.g.tok) st.g.tok=newTok(); st.g.on=true; save();
  gMsg='🧪 たしかめて います…'; reG();
  const r=await post({t:st.g.tok, ping:true, cal:st.g.cal});
  if(r.ok){
    st.g.err=''; st.g.net=''; st.g.calName=oneLine(r.data.cal,60); st.g.last=new Date().toISOString(); save();
    gMsg='✅ つながりました。カレンダー「'+(st.g.calName||'いつもの カレンダー')+'」に 入れます。';
    toastS('✅ Google カレンダーに つながりました', 3000); reG(); render(); kick(200);
    return true;
  }
  st.g.err=r.msg; save(); gMsg='⚠ '+r.msg; reG(); render();
  return false;
}
function gurl(v){
  const p=parseUrl(v);
  if(!p){ if(String(v||'').trim()) toastS('URL が ちがう ようです（https://script.google.com/macros/s/…/exec）', 4600); return; }
  if(p.url===st.g.url && (!p.tok || p.tok===st.g.tok)) return;
  gtest();
}
async function gset(k, v){
  if(k==='cal'){ const c=oneLine(v,60); if(c===st.g.cal) return; st.g.cal=c; st.g.calName=''; save(); toastS(c ? 'これからの 予定は カレンダー「'+c+'」に 入れます（なければ 作ります）' : 'これからの 予定は いつもの カレンダーに 入れます', 3600); }
  else if(k==='alarm'){ if(!ALARMS.some(a=>a[0]===v) || st.g.alarm===v) return; st.g.alarm=v; save(); }
  else if(k==='on'){ st.g.on=!!v; save(); }
  else if(k==='tok'){
    const t=String(v==null?'':v).trim();
    if(!okTok(t)){ toastS('合言葉は 6〜40字の 英数字です'); reG(); return; }
    if(t===st.g.tok) return;
    st.g.tok=t; st.g.err=''; save(); toastS('合言葉を かえました（コードの AIKOTOBA も 同じに して、デプロイし直して ください）', 4600);
  }
  else return;
  reG(); render(); kick(300);
}
async function gclear(){
  if(typeof appConfirm==='function' && !(await appConfirm('Google カレンダーに 自動で 入れる 設定を 消しますか？\n（もう 入って いる 予定は カレンダーに 残ります）', '消す', 'やめる'))) return;
  Object.assign(st.g, {url:'', err:'', net:'', last:'', calName:''}); st.dq=[]; save(); gMsg=''; reG(); render(); toastS('設定を 消しました');
}
function gcopy(){ if(!st.g.tok){ st.g.tok=newTok(); save(); } if(typeof toolCopyText==='function') toolCopyText(gasCode(st.g.tok), '📋 コードを コピーしました（Apps Script に 貼ります）'); }
async function gshare(){
  if(!st.g.tok){ st.g.tok=newTok(); save(); }
  try{ await navigator.share({title:'表電卓 🧱 供試体 の Apps Script', text:gasCode(st.g.tok)}); }catch(e){ if(!(e && e.name==='AbortError')) gcopy(); }
}
function gcopyCfg(){ if(!st.g.url) return; if(typeof toolCopyText==='function') toolCopyText(st.g.url+'#aikotoba='+st.g.tok, '📋 コピーしました。ほかの スマホの 🧱 供試体 → ☁ の URL に 貼って ください'); }

/* Apps Script に 貼る コード（Google の 中で 動く。ためす ときは tests/run.js の 作り物の CalendarApp で 動かす） */
const GAS=String.raw`/* ─────────────────────────────────────────────
   表電卓 🧱 供試体 → Google カレンダー の 受け口（v611）
   ① この コードを ぜんぶ Apps Script（https://script.new）に 貼って 💾 保存
   ② 右上の「デプロイ」→「新しいデプロイ」→ 左の ⚙ →「ウェブアプリ」
      次のユーザーとして実行：自分 ／ アクセスできるユーザー：全員 →「デプロイ」
   ③「アクセスを承認」→ 自分の アカウント →「詳細」→「（名前）に移動」→「許可」
   ④ 出てきた ウェブアプリ の URL（…/exec）を 表電卓の 🧱 供試体 → ☁ に 貼る
   ・合言葉（AIKOTOBA）が 表電卓と 同じ ときだけ 受けつけます。
   ・さわるのは この 受け口が 作った 予定（印 hyo）だけです。
   ・コードを 直したら「デプロイを管理」→ ✎ →「新バージョン」で デプロイし直します。
   ───────────────────────────────────────────── */
const AIKOTOBA = '%AIKOTOBA%';
const VERSION = 1;

function doPost(e) {
  let d = null;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, err: 'json' }); }
  if (!d || d.t !== AIKOTOBA) return out_({ ok: false, err: 'token' });
  const lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return out_({ ok: false, err: 'busy' }); }
  try {
    if (d.ping) {
      const c = cal_(d.cal, true);
      return out_({ ok: true, v: VERSION, cal: c.getName(), tz: Session.getScriptTimeZone() });
    }
    const ops = Array.isArray(d.ops) ? d.ops.slice(0, 100) : [];
    const res = ops.map(function (op) {
      try { return op_(op); } catch (err) { return { ok: false, err: String((err && err.message) || err).slice(0, 200) }; }
    });
    return out_({ ok: true, v: VERSION, res: res });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return out_({ ok: true, v: VERSION, msg: '表電卓 🧱 供試体 の 受け口です（表電卓から 使います）' });
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// カレンダー：名前が 空なら いつもの カレンダー。make の ときは なければ 作る
const CALS_ = {};
function cal_(name, make) {
  name = String(name || '').trim().slice(0, 60);
  if (CALS_[name]) return CALS_[name];
  let c = null;
  if (!name) c = CalendarApp.getDefaultCalendar();
  else {
    const l = CalendarApp.getOwnedCalendarsByName(name);
    c = l.length ? l[0] : (make ? CalendarApp.createCalendar(name) : null);
  }
  if (c) CALS_[name] = c;
  return c;
}

function day_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  if (!d || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) throw new Error('date');
  return d;
}

// この 受け口の 予定を さがす（id → その日 → 前に 送った 日。印 hyo が 同じ もの だけ）
function find_(c, op, k) {
  if (op.id) {
    try { const ev = c.getEventById(String(op.id)); if (ev && ev.getTag('hyo') === k) return ev; } catch (err) {}
  }
  const days = [op.date, op.sd].filter(function (s, i, a) { return s && a.indexOf(s) === i; });
  for (let i = 0; i < days.length; i++) {
    const evs = c.getEventsForDay(day_(days[i]));
    for (let j = 0; j < evs.length; j++) if (evs[j].getTag('hyo') === k) return evs[j];
  }
  return null;
}

function op_(op) {
  const k = String((op && op.k) || '');
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(k)) return { ok: false, err: 'key' };
  if (op.op === 'del') {
    const c = cal_(op.cal, false);
    const ev = c ? find_(c, op, k) : null;
    if (ev) ev.deleteEvent();
    return { ok: true, k: k, gone: !!ev };
  }
  if (op.op !== 'put') return { ok: false, err: 'op' };
  const c = cal_(op.cal, true);
  const date = day_(op.date);
  const title = String(op.title || '供試体').slice(0, 200);
  const desc = String(op.desc || '').slice(0, 3000);
  let ev = find_(c, op, k);
  if (ev) {
    ev.setTitle(title);
    ev.setDescription(desc);
    ev.setAllDayDate(date);
  } else {
    ev = c.createAllDayEvent(title, date, { description: desc });
    ev.setTag('hyo', k);
  }
  ev.removeAllReminders();
  const a = Number(op.alarm);
  if (op.alarm !== null && op.alarm !== undefined && isFinite(a) && a >= 0 && a <= 40320) ev.addPopupReminder(Math.round(a));
  if (op.color) { try { ev.setColor(String(op.color)); } catch (err) {} }
  return { ok: true, k: k, id: ev.getId() };
}
`;
const gasCode=tok=>GAS.replace('%AIKOTOBA%', okTok(tok) ? tok : 'aikotoba');

/* ───────── 画面 ───────── */
let lq='', listMax=LIST_STEP;
const isOpen=()=>!!($('kyoshiOverlay') && typeof isDlgOpen==='function' && isDlgOpen('kyoshiOverlay'));
function render(){
  const b=$('kyoBody'); if(!b || !st) return;
  const top=b.scrollTop; pm=null;
  b.innerHTML=`<div class="kyo-wrap">
    <div class="kyo-top"><button type="button" class="kyo-b pri" onclick="KYOSHI.add()">＋ 入れる</button><button type="button" class="kyo-b" onclick="KYOSHI.calAll()">📅 カレンダー</button><button type="button" class="kyo-b" onclick="KYOSHI.copy()">📋 コピー</button></div>
    <div id="kyoGBar">${gBarHtml()}</div>
    <div class="kyo-tabs" role="tablist">${[['plan','📅 試験の 予定'],['list','🧱 採った 供試体']].map(([k,t])=>`<button type="button" role="tab" aria-selected="${st.view===k}" class="${st.view===k?'on':''}" onclick="KYOSHI.view('${k}')">${t}</button>`).join('')}</div>
    <div id="kyoView">${st.view==='plan' ? planHtml() : listHtml()}</div>
  </div>`;
  b.scrollTop=top;
}
// ☁ の ようすが かわった ときに（打って いる 字を 消さない ように、入れる 欄の ない ところだけ 書き直す）
function refresh(){
  if(!isOpen() || !st) return;
  pm=null; const gb=$('kyoGBar'); if(gb) gb.innerHTML=gBarHtml();
  if(st.view==='plan'){ const v=$('kyoView'); if(v) v.innerHTML=planHtml(); }
  else { const l=$('kyoList'); if(l) l.innerHTML=listInner(); }
  if(pop && pop.kind==='item'){ const it=itOf(pop.id), ae=pop.el.querySelector('#kyoAgesEd'); if(it && ae) ae.innerHTML=agesEdHtml(it); }
  if(pop && pop.kind==='g') reGst();
}
const lastText=s=>{ const d=new Date(s); if(isNaN(d.getTime())) return ''; return (diff(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today())===0 ? 'きょう ' : md(d)+' ')+pad2(d.getHours())+':'+pad2(d.getMinutes()); };
function gBarHtml(){
  const g=st.g;
  if(!g.url) return `<button type="button" class="kyo-gbar off" onclick="KYOSHI.gopen()"><span><b>☁ 入れるだけで Google カレンダーに</b><small>はじめに 1回だけ 設定します（10分ほど。パソコンが かんたん）</small></span></button>`;
  if(!g.on) return `<button type="button" class="kyo-gbar off" onclick="KYOSHI.gopen()"><span><b>☁ Google カレンダー：止めて います</b><small>押すと 設定</small></span></button>`;
  if(syncing) return `<div class="kyo-gbar run" role="status"><span><b>☁ Google カレンダーに 送って います…</b></span></div>`;
  const n=plan().length;
  if(g.err && n) return `<button type="button" class="kyo-gbar err" onclick="KYOSHI.gopen()"><span><b>⚠ Google カレンダーに 送れて いません（${n}件）</b><small>${esc(g.err)}</small></span></button>`;
  if(n) return `<div class="kyo-gbar wait"><span><b>⏳ まだ 送って いない ${n}件</b><small>${esc(navigator.onLine===false ? '電波が もどったら 送ります' : g.net || 'すぐ 送ります')}</small></span><button type="button" class="kyo-b sm" onclick="KYOSHI.sync()">☁ 今 送る</button></div>`;
  return `<button type="button" class="kyo-gbar ok" onclick="KYOSHI.gopen()"><span><b>☁ Google カレンダーに 自動で 入れて います</b><small>${esc(['カレンダー「'+(g.calName||g.cal||'いつもの カレンダー')+'」', g.last ? '最後に 送った '+lastText(g.last) : ''].filter(Boolean).join('・'))}</small></span></button>`;
}
function emptyHtml(){
  return `<div class="kyo-empty"><p><b>現場で 採った 供試体を 入れると、試験の 日（7日・28日 など）が わかります。</b></p>
    <p>「＋ 入れる」で 採った日・現場・配合・材齢・本数を 入れます。${gOn() ? 'Google カレンダーにも 自動で 入ります。' : '上の ☁ を 設定すると、入れるだけで Google カレンダーにも 入ります。'}</p>
    <button type="button" class="kyo-b pri" onclick="KYOSHI.add()">＋ 入れる</button></div>`;
}
function rowHtml(x, showDate){
  const {it, a}=x, s=stOf(x), lb=esc(it.site)+' '+a.d+'日';
  return `<div class="kyo-row ${s}">
    <span class="kyo-age" aria-hidden="true"><b>${a.d}</b>日</span>
    <button type="button" class="kyo-main" onclick="KYOSHI.open('${it.id}')" aria-label="${lb}の くわしく">
      <span><b class="nm">${esc(it.site)}</b>${it.mix ? ` <span class="mx">${esc(it.mix)}</span>` : ''}</span>
      <small>${showDate ? '試験 '+dHtml(x.td)+'・' : ''}採取 ${esc(mdw(x.sd))}・${a.n}本${it.part ? '・'+esc(it.part) : ''}${it.no ? '・'+esc(it.no) : ''}${gIcon(it, a)}</small>
    </button>
    <button type="button" class="kyo-do${a.done ? ' dn' : ''}" onclick="KYOSHI.done('${it.id}', ${a.d})" aria-label="${lb}を ${a.done ? '済みから もどす' : '試験した に する'}">${a.done ? '✓<small>済み</small>' : '✓<small>試験<br>した</small>'}</button>
  </div>`;
}
function planHtml(){
  if(!st.items.length) return emptyHtml();
  const T=today(), L=tests();
  const late=L.filter(x=>!x.a.done && x.dd<0 && x.dd>=-LATE_DAYS), tod=L.filter(x=>x.dd===0), tom=L.filter(x=>x.dd===1), later=L.filter(x=>x.dd>1);
  let h='';
  if(late.length) h+=`<h4 class="kyo-h late">⚠ 過ぎた（まだ ✓ して いない）</h4>`+late.map(x=>rowHtml(x, true)).join('');
  h+=`<h4 class="kyo-h today">きょう ${dHtml(T)}</h4>`+(tod.length ? tod.map(x=>rowHtml(x)).join('') : '<p class="kyo-none">きょうの 試験は ありません。</p>');
  if(tom.length) h+=`<h4 class="kyo-h">あした ${dHtml(addDays(T,1))}</h4>`+tom.map(x=>rowHtml(x)).join('');
  let cur='';
  later.forEach(x=>{ const k=ymd(x.td); if(k!==cur){ cur=k; h+=`<h4 class="kyo-h">${dHtml(x.td)}<small>あと ${x.dd}日</small></h4>`; } h+=rowHtml(x); });
  if(!later.length && !tom.length) h+='<p class="kyo-none">この先の 試験は ありません。</p>';
  return h+`<p class="kyo-note">試験が 済んだら「✓ 試験した」。行を 押すと くわしく（材齢・本数・直す・消す）。${LATE_DAYS}日 より 前に 過ぎた ものは「🧱 採った 供試体」に あります。中身は この 端末の 中に 残ります（設定の バックアップに 入ります）。</p>`;
}
function listHits(){
  const q=lq.normalize('NFKC').trim().toLowerCase();
  return st.items.filter(it=>!q || [it.site,it.mix,it.part,it.no,it.memo].some(s=>s && s.normalize('NFKC').toLowerCase().includes(q)))
    .sort((a,b)=>b.date.localeCompare(a.date) || b.at-a.at);
}
function cardHtml(it, T){
  const sd=okDate(it.date), sub=[it.part, it.no].filter(Boolean).join('・');
  return `<button type="button" class="kyo-card" onclick="KYOSHI.open('${it.id}')">
    <span class="t"><b class="nm">${esc(it.site)}</b>${it.mix ? ` <span class="mx">${esc(it.mix)}</span>` : ''}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
    <span class="kyo-ages">${it.ages.map(a=>{ const td=addDays(sd, a.d), x={a, dd:diff(td, T)}; return `<i class="${stOf(x)}">${a.d}日 ${esc(md(td))}${a.done ? ' ✓' : ''}${gIcon(it, a)}</i>`; }).join('')}</span>
  </button>`;
}
function listInner(){
  const T=today(), L=listHits(), shown=L.slice(0, listMax);
  if(!L.length) return `<p class="kyo-none">${lq ? '「'+esc(lq)+'」は 見つかりません。' : 'まだ ありません。'}</p>`;
  let h='', cur='';
  shown.forEach(it=>{ if(it.date!==cur){ cur=it.date; h+=`<h4 class="kyo-h">${dHtml(okDate(it.date))}<small>採った 日</small></h4>`; } h+=cardHtml(it, T); });
  if(L.length>shown.length) h+=`<button type="button" class="kyo-b kyo-moreb" onclick="KYOSHI.more()">もっと 見る（あと ${L.length-shown.length}件）</button>`;
  return h;
}
function listHtml(){
  if(!st.items.length) return emptyHtml();
  return `<label class="kyo-q"><span aria-hidden="true">🔎</span><input type="search" value="${esc(lq)}" placeholder="現場・配合・番号で さがす" aria-label="さがす" oninput="KYOSHI.q(this.value)"></label>
    <div id="kyoList">${listInner()}</div>
    <div class="kyo-acts end"><button type="button" class="kyo-b" onclick="KYOSHI.tidy()">🧹 古い ものを 片づける</button></div>
    <p class="kyo-note">🧹 は 試験の 日が みな 3か月 より 前の ものを 一覧から 消します（Google カレンダーの 予定は そのまま）。</p>`;
}

/* ───────── 小さな窓（入れる・くわしく・☁ 設定）───────── */
let pop=null;   // {el, rel, kind, id}
function popOpen(html, kind, id){
  popClose();
  const host=document.querySelector('#kyoshiOverlay .kyo-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='kyo-pop-bg';
  el.innerHTML=`<div class="kyo-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  pop={el, kind, id, rel:null};
  const me=pop; pop.rel=modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } });   // 端末の「戻る」は この窓だけ 閉じる
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }
const popBody=()=>pop ? pop.el.querySelector('.kyo-pop') : null;
function rePop(html){ const b=popBody(); if(!b) return; const top=b.scrollTop; b.innerHTML=html; b.scrollTop=top; }

// 入れる 欄（dr＝入れる 前の 下書き・id＝くわしくで 直す）
function recentVals(k, n){ const out=[]; st.items.slice().sort((a,b)=>b.at-a.at).forEach(it=>{ const v=it[k]; if(v && !out.includes(v) && out.length<n) out.push(v); }); return out; }
function shikenKoji(){ try{ const o=JSON.parse(localStorage.getItem('excalc_shiken')||'null'); return o && typeof o.koji==='string' ? oneLine(o.koji,40) : ''; }catch(_){ return ''; } }   // 📝 試験報告書の 工事名
function siteSug(){ const L=recentVals('site', 6), sk=shikenKoji(); if(sk && !L.includes(sk)) L.unshift(sk); return L.slice(0,6); }
const sugHtml=(k, list)=>list.length ? `<div class="kyo-sug" aria-label="${k==='site' ? '前に 入れた 現場' : '前に 入れた 配合'}">${list.map(v=>`<button type="button" data-f="${k}" data-v="${esc(v)}" onclick="KYOSHI.pick(this)">${esc(v)}</button>`).join('')}</div>` : '';
function fieldsHtml(o, id){
  const dr=id==='dr', on=dr ? `oninput="KYOSHI.drSet(this.dataset.k, this.value)"` : `onchange="KYOSHI.set('${id}', this.dataset.k, this.value)"`;
  return `<label class="kyo-f"><span>採った日</span><input type="date" data-k="date" value="${esc(o.date)}" ${on} aria-label="採った日"></label>
    ${dr ? `<div class="kyo-quick">${[[0,'きょう'],[-1,'きのう'],[-2,'おととい']].map(([n,t])=>`<button type="button" class="${o.date===ymd(addDays(today(),n)) ? 'on' : ''}" onclick="KYOSHI.drDay(${n})">${t}</button>`).join('')}</div>` : ''}
    <label class="kyo-f"><span>現場</span><input type="text" data-k="site" maxlength="40" value="${esc(o.site)}" placeholder="例：○○ビル 新築工事" autocomplete="off" ${on} aria-label="現場の 名前"></label>
    ${dr ? sugHtml('site', siteSug()) : ''}
    <label class="kyo-f"><span>配合</span><input type="text" data-k="mix" maxlength="30" value="${esc(o.mix)}" placeholder="例：24-18-20N" autocomplete="off" ${on} aria-label="配合（呼び方）"></label>
    ${dr ? sugHtml('mix', recentVals('mix', 6)) : ''}
    <details class="kyo-more"${o.part || o.no || o.memo ? ' open' : ''}><summary>くわしく（打設箇所・番号・メモ）</summary>
      <label class="kyo-f"><span>打設箇所</span><input type="text" data-k="part" maxlength="30" value="${esc(o.part)}" placeholder="例：2F スラブ" autocomplete="off" ${on} aria-label="打設箇所"></label>
      <label class="kyo-f"><span>番号</span><input type="text" data-k="no" maxlength="30" value="${esc(o.no)}" placeholder="例：No.1〜6" autocomplete="off" ${on} aria-label="供試体の 番号"></label>
      <label class="kyo-f top"><span>メモ</span><textarea data-k="memo" rows="2" maxlength="200" placeholder="例：現場水中養生 3本" ${on} aria-label="メモ">${esc(o.memo)}</textarea></label>
    </details>`;
}
const ageList=sel=>[...new Set(AGE_CHOICES.concat(sel))].sort((a,b)=>a-b);
let dr=null;   // 入れる 前の 下書き
function agesChipsDr(){ return ageList(dr.ages).map(d=>{ const on=dr.ages.includes(d); return `<button type="button" class="${on?'on':''}" aria-pressed="${on}" onclick="KYOSHI.drAge(${d})">${d}日</button>`; }).join(''); }
function prevHtml(){
  const sd=okDate(dr.date); if(!sd) return '採った日を 入れて ください';
  return '<b>試験の 日</b>'+dr.ages.map(d=>{ const td=addDays(sd,d), hn=hol(td); return `<span>${d}日 → ${dHtml(td)}${hn || td.getDay()===0 ? ` <em>⚠ ${esc(hn||'日曜')}</em>` : ''}</span>`; }).join('');
}
function addHtml(){
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">🧱</span><b>供試体を 入れる</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    ${fieldsHtml(dr, 'dr')}
    <div class="kyo-f top"><span>材齢</span><div class="kyo-chips" id="kyoAgeChips">${agesChipsDr()}</div></div>
    <div class="kyo-f"><span></span><span class="kyo-cust"><input id="kyoCust" type="text" inputmode="numeric" maxlength="3" placeholder="例 21" aria-label="ほかの 材齢（日）"><em>日</em><button type="button" class="kyo-b sm" onclick="KYOSHI.drAgeCust()">＋ ほかの 日数</button></span></div>
    <div class="kyo-f"><span>本数</span><span class="kyo-step"><button type="button" onclick="KYOSHI.drN(-1)" aria-label="1本 へらす">−</button><b id="kyoN">${dr.n}</b><button type="button" onclick="KYOSHI.drN(1)" aria-label="1本 ふやす">＋</button><em>本（材齢 1つ ごと）</em></span></div>
    <div class="kyo-prev" id="kyoPrev">${prevHtml()}</div>
    ${gOn() ? '' : `<label class="kyo-ck"><input type="checkbox" id="kyoAsk"${st.def.ask ? ' checked' : ''}> 入れたら カレンダーに 入れる 窓を 出す</label>`}
    <div class="kyo-acts end"><button type="button" class="kyo-b pri" onclick="KYOSHI.addGo()">＋ 入れる</button></div>
    <p class="kyo-note">${gOn() ? '☁ 入れると、試験の 日が Google カレンダーにも 自動で 入ります（電波が ない ときは もどってから）。' : '☁ 入れるだけで Google カレンダーに 入れるには、一覧の 上の「☁ 入れるだけで Google カレンダーに」から 設定します。'}</p>`;
}
function openAdd(pre){
  dr={date:ymd(today()), site:'', mix:'', part:'', no:'', memo:'', ages:st.def.ages.slice(), n:st.def.n};
  if(pre && typeof pre==='object'){ if(okDate(pre.date)) dr.date=pre.date; if(pre.site) dr.site=oneLine(pre.site,40); if(pre.mix) dr.mix=oneLine(pre.mix,30); }
  popOpen(addHtml(), 'add');
  const n=pop && pop.el.querySelector('input[data-k="site"]'); if(n && !dr.site) setTimeout(()=>{ try{ n.focus(); }catch(_){} }, 60);
}
function drSet(k, v){
  if(!dr) return;
  if(k==='date'){ if(okDate(v)) dr.date=v; }
  else if(k==='site') dr.site=oneLine(v,40); else if(k==='mix') dr.mix=oneLine(v,30); else if(k==='part') dr.part=oneLine(v,30); else if(k==='no') dr.no=oneLine(v,30); else if(k==='memo') dr.memo=multi(v,200);
  else return;
  const p=$('kyoPrev'); if(p) p.innerHTML=prevHtml();
  if(k==='date' && pop) pop.el.querySelectorAll('.kyo-quick button').forEach((b,i)=>b.classList.toggle('on', dr.date===ymd(addDays(today(),-i))));
}
function drDay(n){ if(!dr) return; dr.date=ymd(addDays(today(), +n||0)); const i=pop && pop.el.querySelector('input[data-k="date"]'); if(i) i.value=dr.date; drSet('date', dr.date); }
function pick(el){
  if(!el || !pop) return; const k=el.dataset.f, v=el.dataset.v||'';
  if(pop.kind==='add' && dr){ drSet(k, v); const i=pop.el.querySelector(`input[data-k="${k}"]`); if(i) i.value=dr[k]; }
}
function drAge(d){
  if(!dr) return; d=intIn(d,1,365,0); if(!d) return;
  const i=dr.ages.indexOf(d);
  if(i>=0){ if(dr.ages.length===1){ toastS('材齢を 1つは えらんで ください'); return; } dr.ages.splice(i,1); }
  else { if(dr.ages.length>=12){ toastS('材齢は 12まで です'); return; } dr.ages.push(d); dr.ages.sort((a,b)=>a-b); }
  const c=$('kyoAgeChips'); if(c) c.innerHTML=agesChipsDr(); const p=$('kyoPrev'); if(p) p.innerHTML=prevHtml();
}
function drAgeCust(){ const i=$('kyoCust'), d=intIn(i ? i.value : '', 1, 365, 0); if(!d){ toastS('日数を 1〜365 で 入れて ください'); return; } if(dr && !dr.ages.includes(d)) drAge(d); if(i) i.value=''; }
function drN(k){ if(!dr) return; dr.n=Math.min(30, Math.max(1, dr.n+(+k||0))); const b=$('kyoN'); if(b) b.textContent=dr.n; }
function addItem(o){   // 入れる（ためす ときも ここ）
  if(st.items.length>=MAX_IT){ toastS('入れられるのは '+MAX_IT+'件 までです（🧱 採った 供試体 の 🧹 で 古い ものを 片づけて ください）', 4600); return null; }
  const ages=[...new Set((o.ages||[]).map(v=>intIn(v,1,365,0)).filter(Boolean))].sort((a,b)=>a-b).slice(0,12), n=intIn(o.n,1,30,3);
  const it=cleanIt({id:rid(), date:o.date, site:o.site, mix:o.mix, part:o.part, no:o.no, memo:o.memo, ages:ages.map(d=>({d, n})), at:Date.now()});
  if(!it) return null;
  st.items.push(it); st.def.ages=ages; st.def.n=n;
  save(); return it;
}
function addGo(){
  if(!dr) return;
  const site=oneLine(dr.site,40);
  if(!okDate(dr.date)){ toastS('採った日を 入れて ください'); return; }
  if(!site){ toastS('現場の 名前を 入れて ください'); const i=pop && pop.el.querySelector('input[data-k="site"]'); if(i) try{ i.focus(); }catch(_){} return; }
  const ask=$('kyoAsk'); if(ask) st.def.ask=ask.checked;
  const it=addItem(dr); if(!it) return;
  dr=null; popClose(); render();
  const sd=okDate(it.date);
  toastS('🧱 入れました：'+it.ages.map(a=>a.d+'日 '+md(addDays(sd, a.d))).join('・'), 3600);
  if(gOn()) kick(0);
  else if(st.def.ask){ const L=icsOfIt(it, true); if(L.length) withIcs(()=>HyoIcs.sheet(L, {file:'kyoshi-'+it.date+'.ics', name:'供試体', title:'試験の 日を カレンダーに', note:'終日の 予定で、'+alarmNote()+'。Android の 人は 行を 押した くわしくの 🗓 で 1件ずつ Google カレンダーにも 入れられます。'})); }
  return it;
}

// くわしく
function agesEdHtml(it){
  const sd=okDate(it.date), T=today(), on=gOn();
  return it.ages.map(a=>{
    const td=addDays(sd, a.d), dd=diff(td, T), s=stOf({a, dd}), gs=gState(it, a), dn=okDate(a.done);
    const gt=gs==='ok' ? '・☁ 入って います' : gs==='wait' ? '・⏳ まだ 送って いません' : gs==='err' ? '・⚠ '+(a.g && a.g.e ? a.g.e : '送れませんでした') : '';
    return `<div class="kyo-ae ${s}">
      <span class="kyo-age" aria-hidden="true"><b>${a.d}</b>日</span>
      <span class="t">${dHtml(td)}<small>${esc((dn ? '✓ 済み（'+md(dn)+'）' : dd<0 ? (-dd)+'日 過ぎ' : dd===0 ? 'きょう' : 'あと '+dd+'日')+gt)}</small></span>
      <span class="kyo-step sm"><button type="button" onclick="KYOSHI.setN('${it.id}', ${a.d}, -1)" aria-label="${a.d}日の 本数を へらす">−</button><b>${a.n}</b><button type="button" onclick="KYOSHI.setN('${it.id}', ${a.d}, 1)" aria-label="${a.d}日の 本数を ふやす">＋</button><em>本</em></span>
      <button type="button" class="kyo-do2${a.done ? ' dn' : ''}" onclick="KYOSHI.done('${it.id}', ${a.d})">${a.done ? '↶ 済みを 外す' : '✓ 試験した'}</button>
      ${on ? '' : `<button type="button" class="kyo-gc" onclick="KYOSHI.gcal1('${it.id}', ${a.d})" title="Google カレンダーで 開く（1件）" aria-label="${a.d}日を Google カレンダーで 開く">🗓</button>`}
    </div>`;
  }).join('');
}
function detailHtml(it){
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">🧱</span><b>${esc(it.site)}${it.mix ? ' <small>'+esc(it.mix)+'</small>' : ''}</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <h5>材齢ごとの 試験</h5>
    <div class="kyo-aes" id="kyoAgesEd">${agesEdHtml(it)}</div>
    <div class="kyo-f top"><span>材齢</span><div class="kyo-chips">${ageList(it.ages.map(a=>a.d)).map(d=>{ const on=it.ages.some(a=>a.d===d); return `<button type="button" class="${on?'on':''}" aria-pressed="${on}" onclick="KYOSHI.age('${it.id}', ${d})">${d}日</button>`; }).join('')}</div></div>
    <div class="kyo-f"><span></span><span class="kyo-cust"><input id="kyoCust2" type="text" inputmode="numeric" maxlength="3" placeholder="例 21" aria-label="ほかの 材齢（日）"><em>日</em><button type="button" class="kyo-b sm" onclick="KYOSHI.ageCust('${it.id}')">＋ ほかの 日数</button></span></div>
    <h5>直す</h5>
    ${fieldsHtml(it, it.id)}
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.cal('${it.id}')">📅 カレンダーに（ファイル）</button><button type="button" class="kyo-b" onclick="KYOSHI.copyOne('${it.id}')">📋 コピー</button></div>
    ${gOn() ? '<p class="kyo-note">☁ Google カレンダーには 自動で 入ります（直すと カレンダーも 直ります）。</p>' : ''}
    <div class="kyo-acts end"><button type="button" class="kyo-b warn" onclick="KYOSHI.del('${it.id}')">🗑 この 供試体を 消す</button></div>`;
}
function openItem(id){ const it=itOf(id); if(!it) return; popOpen(detailHtml(it), 'item', id); }
function reItem(){ if(pop && pop.kind==='item'){ const it=itOf(pop.id); if(it) rePop(detailHtml(it)); else popClose(); } }

/* ───────── 入れる・かえる ───────── */
function changed(){ save(); render(); reItem(); kick(); }
function setF(id, k, v){
  const it=itOf(id); if(!it) return;
  if(k==='date'){ if(!okDate(v)){ toastS('日付を えらんで ください'); reItem(); return; } if(v===it.date) return; it.date=v; }
  else if(k==='site'){ const s=oneLine(v,40); if(!s){ toastS('現場の 名前は 空に できません'); reItem(); return; } it.site=s; }
  else if(k==='mix') it.mix=oneLine(v,30); else if(k==='part') it.part=oneLine(v,30); else if(k==='no') it.no=oneLine(v,30); else if(k==='memo') it.memo=multi(v,200);
  else return;
  changed();
}
function goneOf(it, a){ if(a.g && a.g.id){ st.dq.push({k:it.id+'-'+a.d, id:a.g.id, sd:a.g.sd, c:a.g.c||'', e:''}); if(st.dq.length>MAX_DQ) st.dq.splice(0, st.dq.length-MAX_DQ); } }
function toggleAge(id, d){
  const it=itOf(id); d=intIn(d,1,365,0); if(!it || !d) return;
  const a=ageOf(it, d);
  if(a){ if(it.ages.length===1){ toastS('材齢を 1つは 残して ください（消すときは 🗑）'); return; } goneOf(it, a); it.ages.splice(it.ages.indexOf(a),1); }
  else { if(it.ages.length>=12){ toastS('材齢は 12まで です'); return; } it.ages.push({d, n:it.ages[0] ? it.ages[0].n : st.def.n, done:'', g:null}); it.ages.sort((x,y)=>x.d-y.d); }
  changed();
}
function ageCust(id){ const i=$('kyoCust2'), d=intIn(i ? i.value : '', 1, 365, 0); if(!d){ toastS('日数を 1〜365 で 入れて ください'); return; } const it=itOf(id); if(it && !ageOf(it, d)) toggleAge(id, d); }
function setN(id, d, k){ const it=itOf(id), a=ageOf(it, d); if(!a) return; const n=Math.min(30, Math.max(1, a.n+(+k||0))); if(n===a.n) return; a.n=n; changed(); }
let undo=null, undoT=0;   // {id, d, done} ✓ の あと しばらく 取り消せる
function done(id, d){
  const it=itOf(id), a=ageOf(it, d); if(!a) return;
  undo={id, d:a.d, done:a.done};
  a.done=a.done ? '' : ymd(today());
  changed(); showUndo(it, a);
}
function showUndo(it, a){
  const u=$('kyoUndo'); if(!u) return;
  u.innerHTML=`<span>${a.done ? '✓「'+esc(it.site)+'」の '+a.d+'日を 試験した に しました' : '「'+esc(it.site)+'」の '+a.d+'日を まだ に もどしました'}</span><button type="button" onclick="KYOSHI.undo()">↶ 取り消す</button>`;
  u.classList.add('on'); clearTimeout(undoT); undoT=setTimeout(()=>{ u.classList.remove('on'); undo=null; }, 8000);
}
function undoDo(){
  if(!undo) return; const it=itOf(undo.id), a=ageOf(it, undo.d); if(a) a.done=undo.done;
  undo=null; clearTimeout(undoT); const u=$('kyoUndo'); if(u) u.classList.remove('on'); changed(); toastS('取り消しました');
}
async function delItem(id){
  const it=itOf(id); if(!it) return false;
  const sent=it.ages.some(a=>a.g && a.g.id);
  if(typeof appConfirm==='function' && !(await appConfirm('「'+it.site+'」（'+md(okDate(it.date))+' 採取）を 消しますか？'+(sent ? '\n（Google カレンダーの 予定も 消します）' : ''), '消す', 'やめる'))) return false;
  it.ages.forEach(a=>goneOf(it, a));
  const i=st.items.indexOf(it); if(i>=0) st.items.splice(i,1);
  popClose(); changed(); toastS('消しました');
  return true;
}
async function tidy(){
  const cut=addDays(today(), -90), old=st.items.filter(it=>it.ages.every(a=>tdOf(it, a)<cut));
  if(!old.length){ toastS('片づける 古い ものは ありません（試験の 日が みな 3か月 より 前の もの）', 3600); return 0; }
  if(typeof appConfirm==='function' && !(await appConfirm(old.length+'件の 古い 供試体（試験の 日が みな 3か月 より 前）を 一覧から 消しますか？\n（Google カレンダーの 予定は そのまま 残ります）', '片づける', 'やめる'))) return 0;
  st.items=st.items.filter(it=>!old.includes(it)); save(); render(); toastS('🧹 '+old.length+'件 片づけました');
  return old.length;
}
function setView(k){ if(!['plan','list'].includes(k)) return; st.view=k; save(); render(); }
function setQ(v){ lq=String(v==null?'':v).slice(0,40); listMax=LIST_STEP; const l=$('kyoList'); if(l) l.innerHTML=listInner(); }
function more(){ listMax+=LIST_STEP; const l=$('kyoList'); if(l) l.innerHTML=listInner(); }

/* ───────── 文字で コピー ───────── */
const line=x=>x.a.d+'日：'+x.it.site+(x.it.mix ? ' '+x.it.mix : '')+' '+x.a.n+'本（採取 '+md(x.sd)+'）'+(x.a.done ? ' ✓済み' : '');
function text(){
  const T=today(), L=tests(), out=['🧱 供試体の 試験（'+mdw(T)+' 現在）'];
  const late=L.filter(x=>!x.a.done && x.dd<0 && x.dd>=-LATE_DAYS), tod=L.filter(x=>x.dd===0), later=L.filter(x=>x.dd>0);
  if(late.length){ out.push('', '⚠ 過ぎた（まだ 試験して いない）'); late.forEach(x=>out.push('・'+mdw(x.td)+' '+line(x))); }
  out.push('', 'きょう '+mdw(T)); if(tod.length) tod.forEach(x=>out.push('・'+line(x))); else out.push('・なし');
  if(later.length){ out.push('', 'この先'); later.forEach(x=>out.push('・'+mdw(x.td)+' '+line(x))); }
  return out.join('\n');
}
function textOne(it){
  const sd=okDate(it.date);
  return ['🧱 '+it.site+(it.mix ? ' '+it.mix : ''), '採取 '+mdw(sd)+(it.part ? '・'+it.part : '')+(it.no ? '・'+it.no : '')]
    .concat(it.ages.map(a=>'・'+a.d+'日 → '+mdw(addDays(sd, a.d))+' '+a.n+'本'+(a.done ? ' ✓済み' : ''))).concat(it.memo ? ['メモ：'+it.memo] : []).join('\n');
}
function copy(){ if(!st.items.length){ toastS('まだ 何も ありません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 コピーしました（LINE などに 貼れます）'); }
function copyOne(id){ const it=itOf(id); if(it && typeof toolCopyText==='function') toolCopyText(textOne(it), '📋 コピーしました（LINE などに 貼れます）'); }

/* ───────── 📅 カレンダーに（設定しない ときの ボタン 1回。hyoics.js） ───────── */
function icsEv(it, a){ const e=evOf(it, a), al=alarmMin(); return {uid:'kyoshi-'+e.k, title:e.title, date:e.date, allDay:true, alarm:al, desc:e.desc}; }
function icsOfIt(it, onlyNext){ const T=ymd(today()); return it.ages.map(a=>icsEv(it, a)).filter(e=>!onlyNext || e.date>=T); }
function withIcs(fn){
  if(window.HyoIcs){ fn(); return; }
  if(typeof loadSidePart!=='function'){ toastS('カレンダーの 部品が 読めません'); return; }
  loadSidePart(['hyoics.js']).then(ok=>{ if(ok && window.HyoIcs) fn(); else toastS('カレンダーの 部品を 読めませんでした。インターネットに つながる ところで もう一度 どうぞ'); });
}
function cal(id){ const it=itOf(id); if(!it) return; withIcs(()=>HyoIcs.sheet(icsOfIt(it), {file:'kyoshi-'+it.date+'.ics', name:'供試体', title:'試験の 日を カレンダーに', note:'終日の 予定で、'+alarmNote()+'。'+(it.ages.length>1 && !gOn() ? 'Android の 人は 上の 🗓 で 1件ずつ Google カレンダーにも 入れられます。' : '')})); }
function calAll(){
  const T=ymd(today()), L=tests().filter(x=>!x.a.done && ymd(x.td)>=T).map(x=>icsEv(x.it, x.a));
  if(!L.length){ toastS('この先の 試験が ありません'); return; }
  withIcs(()=>HyoIcs.sheet(L, {file:'kyoshi-all.ics', name:'供試体', title:'この先の 試験を まとめて カレンダーに', note:'まだ 済んで いない '+L.length+'件を 終日の 予定で 入れます（'+alarmNote()+'）。'+(gOn() ? '☁ Google カレンダーには もう 自動で 入って います。' : '')}));
}
function gcal1(id, d){ const it=itOf(id), a=ageOf(it, d); if(!a) return; withIcs(()=>{ const u=HyoIcs.gcal(icsEv(it, a)); if(u) try{ window.open(u, '_blank', 'noopener'); }catch(_){} }); }

/* ───────── ☁ 設定の 窓 ───────── */
let gMsg='';
function gStHtml(){
  const g=st.g;
  if(gMsg) return gMsg;
  if(!g.url) return '○ まだ 設定して いません。下の ①〜⑤ を 1回だけ します。';
  if(!g.on) return '⏸ 自動で 入れるのを 止めて います。';
  if(g.err) return '⚠ '+g.err;
  return '✅ つながって います'+(g.calName ? '（カレンダー「'+g.calName+'」）' : '')+(g.last ? '。最後に 送った '+lastText(g.last) : '');
}
function reGst(){ const s=pop && pop.el.querySelector('#kyoGSt'); if(s) s.textContent=gStHtml(); }
function gHtml(){
  const g=st.g, sh=typeof navigator.share==='function';
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">☁</span><b>Google カレンダーに 自動で 入れる</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <p class="kyo-gst" id="kyoGSt" role="status">${esc(gStHtml())}</p>
    <details class="kyo-steps"${g.url ? '' : ' open'}><summary>${g.url ? '設定の しかた（もう一度 見る）' : 'はじめての 設定（10分ほど・パソコンが かんたん）'}</summary>
      <ol>
        <li><b>コードを コピー</b>します（合言葉 入り）。
          <div class="kyo-acts"><button type="button" class="kyo-b pri" onclick="KYOSHI.gcopy()">📋 コードを コピー</button>${sh ? '<button type="button" class="kyo-b" onclick="KYOSHI.gshare()">📤 送る</button>' : ''}</div>
          <small>${sh ? 'スマホで 見て いる ときは「📤 送る」で パソコンに 送ると かんたんです。' : 'パソコンで 設定する ときは、パソコンでも 表電卓を 開いて コピーすると かんたんです。'}</small></li>
        <li>Google に ログインした ブラウザで <a href="https://script.new" target="_blank" rel="noopener">script.new</a> を 開き、中の 字を ぜんぶ 消して、コピーした コードを 貼って 💾 保存。</li>
        <li>右上の <b>「デプロイ」→「新しいデプロイ」</b>、左の ⚙ で <b>「ウェブアプリ」</b>。<br>次のユーザーとして実行：<b>自分</b>／アクセスできるユーザー：<b>全員</b> →「デプロイ」。</li>
        <li><b>「アクセスを承認」</b> → 自分の アカウント。「このアプリは Google で確認されていません」と 出たら <b>「詳細」→「（名前）に移動」→「許可」</b>（自分で 作った コードなので 大丈夫です）。</li>
        <li>出てきた <b>ウェブアプリ の URL</b>（…/exec で 終わる）を コピーして 下に 貼り、「🧪 ためしに 送る」。</li>
      </ol>
    </details>
    <label class="kyo-f"><span>URL</span><input id="kyoGUrl" type="url" value="${esc(g.url)}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false" onchange="KYOSHI.gurl(this.value)" aria-label="ウェブアプリ の URL"></label>
    <div class="kyo-acts"><button type="button" class="kyo-b pri" onclick="KYOSHI.gtest()">🧪 ためしに 送る</button>${g.url && g.on ? '<button type="button" class="kyo-b" onclick="KYOSHI.sync()">☁ 今 送る</button>' : ''}</div>
    <h5>入れる カレンダー</h5>
    <label class="kyo-f"><span>名前</span><input id="kyoGCal" type="text" maxlength="60" value="${esc(g.cal)}" placeholder="空なら いつもの カレンダー" autocomplete="off" onchange="KYOSHI.gset('cal', this.value)" aria-label="入れる カレンダーの 名前"></label>
    <p class="kyo-note">名前を 入れると、その 名前の カレンダーに 入れます（なければ 作ります）。会社の 人と 共有する カレンダーにも できます。</p>
    <div class="kyo-f"><span>知らせ</span><div class="kyo-chips">${ALARMS.map(([k,t])=>`<button type="button" class="${g.alarm===k?'on':''}" aria-pressed="${g.alarm===k}" onclick="KYOSHI.gset('alarm', '${k}')">${t}</button>`).join('')}</div></div>
    ${g.url ? `<label class="kyo-ck"><input type="checkbox"${g.on ? ' checked' : ''} onchange="KYOSHI.gset('on', this.checked)"> 自動で 入れる</label>` : ''}
    <h5>合言葉</h5>
    <label class="kyo-f"><span>合言葉</span><input id="kyoGTok" type="text" maxlength="40" value="${esc(g.tok)}" autocomplete="off" spellcheck="false" onchange="KYOSHI.gset('tok', this.value)" aria-label="合言葉"></label>
    <p class="kyo-note">コードの 中の AIKOTOBA と 同じ ときだけ 受けつけます。ほかの スマホでは「📋 ほかの スマホ 用に コピー」を その スマホの URL の 欄に 貼ると、URL と 合言葉が いっしょに 入ります。</p>
    ${g.url ? `<div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.gcopyCfg()">📋 ほかの スマホ 用に コピー</button><button type="button" class="kyo-b warn" onclick="KYOSHI.gclear()">⏏ 設定を 消す</button></div>` : ''}
    <p class="kyo-note">送るのは 試験の 予定（日付・現場・配合・本数・メモ）だけで、送り先は 自分で 作った Apps Script（自分の Google）だけです。ほかの ところには 送りません。Google カレンダーで 予定を 消しても、表電卓の 中身は 消えません。</p>`;
}
function gopen(){ if(!st.g.tok){ st.g.tok=newTok(); save(); } gMsg=''; popOpen(gHtml(), 'g'); }
function reG(){ if(pop && pop.kind==='g') rePop(gHtml()); }

/* ───────── 窓 ───────── */
const CSS=`
#kyoshiOverlay .kyo-modal{ display:flex; flex-direction:column; }
.kyo-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.kyo-wrap{ max-width:760px; margin:0 auto; padding-bottom:70px; }
.kyo-top{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 8px; } .kyo-top .kyo-b{ flex:1 1 auto; }
.kyo-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.kyo-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .kyo-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.kyo-b.sm{ min-height:38px; padding:0 10px; font-size:14px; } .kyo-moreb{ display:block; width:100%; margin:6px 0 0; }
.kyo-gbar{ display:flex; align-items:center; gap:8px; width:100%; box-sizing:border-box; margin:0 0 8px; padding:8px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.07); color:var(--text,#222); text-align:left; font:inherit; cursor:pointer; }
.kyo-gbar > span{ flex:1; min-width:0; } .kyo-gbar b{ display:block; font-size:14.5px; } .kyo-gbar small{ display:block; font-size:12.5px; color:var(--text-light,#666); line-height:1.45; overflow-wrap:anywhere; }
.kyo-gbar.ok{ border-color:rgba(46,125,50,.45); background:rgba(46,157,74,.08); } .kyo-gbar.ok b{ color:#2e7d32; }
.kyo-gbar.wait, .kyo-gbar.run{ border-color:rgba(240,164,0,.55); background:rgba(240,164,0,.09); cursor:default; } .kyo-gbar.wait b{ color:#b26a00; }
.kyo-gbar.err{ border-color:rgba(229,57,53,.5); background:rgba(229,57,53,.07); } .kyo-gbar.err b{ color:#c62828; } .kyo-gbar.off b{ color:var(--acc); }
.kyo-tabs{ display:flex; gap:6px; margin:0 0 6px; } .kyo-tabs button{ flex:1; min-height:42px; border-radius:21px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14.5px; cursor:pointer; }
.kyo-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.kyo-h{ display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 8px; margin:14px 0 6px; font-size:14.5px; } .kyo-h > small{ font-size:12.5px; font-weight:normal; color:var(--text-light,#666); }
.kyo-h.late{ color:#c62828; } .kyo-h.today{ color:var(--acc); }
.kyo-d.sun{ color:#e53935; } .kyo-d.sat{ color:#1e88e5; } .kyo-d small{ margin-left:4px; font-size:11.5px; font-weight:normal; }
.kyo-none{ margin:4px 0 8px; font-size:13.5px; color:var(--text-light,#666); }
.kyo-row{ display:flex; align-items:stretch; margin:0 0 6px; border-radius:14px; border:1px solid rgba(120,132,156,.3); border-left:6px solid rgba(120,132,156,.5); background:var(--modal-bg,#fff); overflow:hidden; }
.kyo-row.late{ border-left-color:#e53935; background:rgba(229,57,53,.06); } .kyo-row.today{ border-left-color:#f0a400; background:rgba(240,164,0,.08); } .kyo-row.dn{ border-left-color:#2e9d4a; } .kyo-row.dn .kyo-main{ opacity:.62; }
.kyo-age{ flex:none; display:flex; flex-direction:column; align-items:center; justify-content:center; width:52px; font-size:12px; color:var(--text-light,#666); border-right:1px solid rgba(120,132,156,.2); } .kyo-age b{ font-size:21px; line-height:1.05; color:var(--text,#222); }
.kyo-main{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; padding:8px 10px; border:0; background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.kyo-main .nm{ font-size:16px; overflow-wrap:anywhere; } .mx{ font-size:13.5px; font-weight:bold; color:var(--text-light,#555); } .kyo-main small{ font-size:12.5px; color:var(--text-light,#666); line-height:1.45; }
.kyo-do{ flex:none; width:72px; border:0; border-left:1px solid rgba(120,132,156,.25); background:var(--acc); color:var(--on-acc,#fff); font-size:22px; font-weight:bold; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; line-height:1; }
.kyo-do small{ font-size:11.5px; line-height:1.25; } .kyo-do.dn{ background:rgba(120,132,156,.18); color:var(--text,#222); }
.kyo-g{ font-style:normal; font-size:11.5px; margin-left:5px; white-space:nowrap; } .kyo-g.ok{ color:#2e7d32; } .kyo-g.wait{ color:#b26a00; } .kyo-g.err{ color:#e53935; }
.kyo-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:10px 0 0; }
.kyo-empty{ padding:6px 2px; } .kyo-empty p{ margin:4px 0 10px; font-size:14px; line-height:1.6; }
.kyo-q{ display:flex; align-items:center; gap:6px; margin:4px 0 2px; } .kyo-q input{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; }
.kyo-card{ display:flex; flex-direction:column; gap:5px; width:100%; box-sizing:border-box; margin:0 0 6px; padding:9px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; font:inherit; cursor:pointer; }
.kyo-card .t{ display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 6px; } .kyo-card .nm{ font-size:15.5px; overflow-wrap:anywhere; } .kyo-card .t small{ width:100%; font-size:12.5px; color:var(--text-light,#666); }
.kyo-ages{ display:flex; flex-wrap:wrap; gap:4px; } .kyo-ages i{ font-style:normal; font-size:12.5px; padding:2px 8px; border-radius:10px; background:rgba(120,132,156,.12); }
.kyo-ages i.late{ background:rgba(229,57,53,.12); color:#c62828; } .kyo-ages i.today{ background:rgba(240,164,0,.2); } .kyo-ages i.dn{ background:rgba(46,157,74,.14); color:#2e7d32; } .kyo-ages i .kyo-g{ margin-left:3px; }
.kyo-undo{ display:none; align-items:center; gap:10px; margin:6px 10px calc(8px + var(--safe-bottom,0px)); padding:10px 12px; border-radius:12px; background:#263238; color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.3); font-size:14px; z-index:3; }
.kyo-undo.on{ display:flex; } .kyo-undo span{ flex:1; min-width:0; } .kyo-undo button{ min-height:38px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.5); background:transparent; color:#fff; font-size:14px; font-weight:bold; cursor:pointer; }
.kyo-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.kyo-pop{ width:100%; max-width:640px; max-height:90%; overflow:auto; box-sizing:border-box; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.kyo-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .kyo-ph .e{ font-size:26px; line-height:1; } .kyo-ph b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; } .kyo-ph b small{ font-size:13.5px; color:var(--text-light,#555); }
.kyo-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.kyo-pop h5{ margin:14px 0 6px; font-size:14.5px; }
.kyo-f{ display:flex; align-items:center; gap:8px; margin:8px 0; min-width:0; } .kyo-f.top{ align-items:flex-start; } .kyo-f > span:first-child{ flex:none; width:4.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); line-height:1.3; }
.kyo-f.top > span:first-child{ padding-top:10px; }
.kyo-f input, .kyo-f textarea{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.kyo-f textarea{ padding:8px 10px; resize:vertical; }
.kyo-quick, .kyo-sug{ display:flex; flex-wrap:wrap; gap:5px; margin:-2px 0 6px 5.1em; }
.kyo-quick button, .kyo-sug button{ min-height:34px; max-width:100%; padding:0 10px; border-radius:17px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kyo-quick button.on{ background:rgba(120,132,156,.16); font-weight:bold; }
.kyo-chips{ display:flex; flex-wrap:wrap; gap:5px; flex:1; min-width:0; } .kyo-chips button{ min-height:40px; min-width:52px; padding:0 10px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14.5px; cursor:pointer; }
.kyo-chips button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.kyo-cust{ display:flex; align-items:center; gap:6px; flex:1; min-width:0; } .kyo-f .kyo-cust input{ flex:none; width:5em; min-height:40px; padding:0 8px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; }
.kyo-cust em, .kyo-step em{ font-style:normal; font-size:13px; color:var(--text-light,#666); }
.kyo-step{ display:inline-flex; align-items:center; gap:6px; } .kyo-step button{ width:44px; height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:20px; font-weight:bold; cursor:pointer; }
.kyo-step b{ min-width:1.6em; text-align:center; font-size:19px; } .kyo-step.sm button{ width:36px; height:36px; font-size:17px; } .kyo-step.sm b{ font-size:16px; min-width:1.3em; }
.kyo-prev{ margin:10px 0 0; padding:9px 12px; border-radius:12px; background:rgba(120,132,156,.1); font-size:14px; line-height:1.7; display:flex; flex-direction:column; } .kyo-prev em{ font-style:normal; font-size:12.5px; color:#e53935; }
.kyo-more{ margin:4px 0; } .kyo-more summary{ cursor:pointer; min-height:36px; line-height:36px; font-size:13.5px; color:var(--text-light,#555); }
.kyo-ck{ display:flex; align-items:center; gap:8px; margin:10px 0 0; font-size:14px; cursor:pointer; } .kyo-ck input{ width:22px; height:22px; flex:none; }
.kyo-acts{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin:10px 0 0; } .kyo-acts.end{ justify-content:flex-end; margin-top:14px; }
.kyo-aes{ border:1px solid rgba(120,132,156,.25); border-radius:12px; overflow:hidden; }
.kyo-ae{ display:flex; align-items:center; flex-wrap:wrap; gap:6px 8px; padding:6px 8px; border-bottom:1px solid rgba(120,132,156,.18); border-left:5px solid rgba(120,132,156,.4); } .kyo-ae:last-child{ border-bottom:0; }
.kyo-ae.late{ border-left-color:#e53935; } .kyo-ae.today{ border-left-color:#f0a400; } .kyo-ae.dn{ border-left-color:#2e9d4a; }
.kyo-ae .kyo-age{ width:40px; border-right:0; } .kyo-ae .t{ flex:1 1 9em; min-width:0; display:flex; flex-direction:column; font-size:14px; } .kyo-ae .t small{ font-size:12px; color:var(--text-light,#666); overflow-wrap:anywhere; }
.kyo-do2{ min-height:38px; padding:0 10px; border-radius:10px; border:1px solid var(--acc); background:var(--acc); color:var(--on-acc,#fff); font-size:13.5px; font-weight:bold; cursor:pointer; } .kyo-do2.dn{ background:transparent; color:var(--text,#222); border-color:rgba(120,132,156,.45); }
.kyo-gc{ min-width:38px; min-height:38px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; font-size:17px; cursor:pointer; }
.kyo-gst{ margin:0 0 8px; padding:9px 12px; border-radius:12px; background:rgba(120,132,156,.1); font-size:14px; line-height:1.6; overflow-wrap:anywhere; }
.kyo-steps{ margin:4px 0 8px; } .kyo-steps summary{ cursor:pointer; min-height:40px; line-height:40px; font-weight:bold; font-size:14.5px; color:var(--acc); }
.kyo-steps ol{ margin:4px 0 0; padding-left:22px; font-size:14px; line-height:1.7; } .kyo-steps li{ margin:0 0 8px; } .kyo-steps li small{ display:block; font-size:12.5px; color:var(--text-light,#666); }
.kyo-steps a{ color:var(--acc); font-weight:bold; }
@media (max-width:420px){ .kyo-quick, .kyo-sug{ margin-left:0; } .kyo-f > span:first-child{ width:4em; } }
`;
function ensureDom(){
  if($('kyoshiOverlay')) return;
  const s=document.createElement('style'); s.id='kyoStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="kyoshiOverlay">
  <div class="modal vol-modal kyo-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🧱 供試体</span><button class="modal-close" onclick="closeKyoshi()" aria-label="閉じる">✕</button></div>
    <div class="kyo-body" id="kyoBody"></div>
    <div class="kyo-undo" id="kyoUndo" role="status"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('kyoshiOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の 電卓キーに 届かないように
  // Esc は 上に 重ねた 小さな窓から 閉じる（表電卓の「Esc で 閉じる」より 先に 受ける）
  window.addEventListener('keydown', e=>{
    if(e.key!=='Escape' || !pop || !isDlgOpen('kyoshiOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); dr=null; clearTimeout(undoT); clearTimeout(retryT); undo=null; const u=$('kyoUndo'); if(u) u.classList.remove('on'); }
// pre：{site, date}（📝 試験報告書 から 来た とき。入れる 窓を 出す）
function openKyoshi(pre){
  ensureDom(); if(!st || !syncing) load(); lq=''; listMax=LIST_STEP;
  openDlg('kyoshiOverlay', cleanup); render();
  if(!window.HyoIcs && typeof loadSidePart==='function') loadSidePart(['hyoics.js']);   // 📅 カレンダーの 部品を 先に 読んでおく
  if(gOn()) kick(600);
  if(pre && typeof pre==='object' && !(pre instanceof Event) && (pre.site || pre.date)) openAdd(pre);
}
function closeKyoshi(){ if(!$('kyoshiOverlay') || !isDlgOpen('kyoshiOverlay')) return; closeDlg('kyoshiOverlay', cleanup); }

window.KYOSHI={ add:pre=>openAdd(pre), addGo, drSet, drDay, drAge, drAgeCust, drN, pick, open:openItem, close:popClose, set:setF, age:toggleAge, ageCust, setN, done, undo:undoDo,
  del:id=>delItem(id), tidy:()=>tidy(), view:setView, q:setQ, more, copy, copyOne, text, cal, calAll, gcal1,
  gopen, gtest, gurl, gset:(k,v)=>gset(k,v), gclear:()=>gclear(), gcopy, gshare, gcopyCfg, sync:why=>sync(why||'user'),
  // ためす とき 用
  today:s=>{ fixedToday=s ? String(s) : null; if(st && isOpen()) render(); }, state:()=>JSON.parse(JSON.stringify(st)), clean:cleanIt, gasCode, parseUrl,
  addItem:o=>{ if(!st) load(); const it=addItem(o||{}); if(isOpen()) render(); return it ? it.id : null; },
  plan:()=>{ if(!st) load(); return plan().map(p=>Object.assign({t:p.t}, p.op)); },
  tests:()=>tests().map(x=>({id:x.it.id, site:x.it.site, d:x.a.d, date:ymd(x.td), dd:x.dd, done:x.a.done})),
  ev:(id,d)=>{ const it=itOf(id), a=ageOf(it, d); return a ? evOf(it, a) : null; }, ics:id=>{ const it=itOf(id); return it ? icsOfIt(it) : []; },
  gstate:(id,d)=>{ const it=itOf(id), a=ageOf(it, d); return a ? gState(it, a) : null; }, busy:()=>syncing };
Object.assign(window, { openKyoshi, closeKyoshi });
})();
