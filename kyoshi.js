/* 🧱 供試体（v611・v612。表電卓の 道具。apps/kyoshi/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   現場で 採った 供試体（テストピース）の 採った日・現場・配合・材齢（7日・28日 など）・本数を 入れると、
   試験の 日（採った日 ＋ 材齢）を 出す。
   ・📅 試験の 予定：⚠ 過ぎた（まだ ✓ して いない。2週間まで）・きょう・あした・この先（日ごと）。日曜・祝日は 赤、土曜は 青。
     「✓ 試験した」で 済み（↶ で 取り消し）。
   ・🧱 採った 供試体：採った日ごと（新しい 順・🔎 さがす）。押すと くわしく（材齢を 足す／外す・本数・済み・直す・消す）。
     ▦ 表に 入れる（試験 1つ ＝ 1行）・🧹 古い もの（試験が 3か月 より 前）を 一覧から 片づける（カレンダーは そのまま）。
   ・1日に 何件も（v612）：入れる 窓の「＋ 入れて 次の 物件へ」で、採った日・材齢・本数は そのまま 次の 物件。
     「✓ 入れて おわる」で（すぐ 送る 送り先が ない ときは）📅 まとめて 送る 窓に その 窓で 入れた ものを えらんで 出す。
   ・📅 まとめて 送る（v612）：送る ものを えらび（まだの もの・きょう 採った・ぜんぶ）、送り先へ 1回で。
     送り先は ☁ Google の 送り先（いくつでも）か、📱 この スマホの カレンダー・Outlook など（.ics の ファイル。
     iPhone は「すべてを追加」で 入れる カレンダー＝アカウントを えらぶ）。
   ・☁ Google カレンダーに 自動で：自分の Google の Apps Script（ウェブアプリ）に 送って、終日の 予定を 作る・直す・消す。
     送り先は Google の アカウントごとに 5つまで（v612）。名前・入れる カレンダー（空＝いつもの・名前＝なければ 作る・
     メールアドレス／カレンダー ID＝共有で「予定の変更」を 許された ほかの アカウントの カレンダー）・送り方
     （入れたら すぐ／まとめて 送る とき だけ）・合言葉。コード（合言葉 入り。gasCode）を 📋 コピー → script.new に 貼って
     デプロイ → URL を 貼って 🧪 ためしに 送る。予定には 印（タグ hyo＝供試体の id-材齢）を 付け、同じ ものは 2つ 作らない。
     前の日の 17時 などに 知らせ。電波が ない ときは ためて おき、電波が もどった とき・表電卓を 開いた とき（app.js の kyoshiKick）・
     この 道具を 開いた ときに 送る（入れたら すぐ の 送り先だけ）。送り先は 自分で 貼った script.google.com の URL だけ
     （index.html の connect-src も その 2つだけ 足して ある）。
   ・🗓 1件ずつ Google カレンダーで 開く ときの アカウント（authuser。v612）。
   ・📋 文字で コピー。中身は excalc_kyoshi（この 端末の 中。設定の バックアップに 入る）。 */
(function(){
'use strict';
const KEY='excalc_kyoshi', MAX_IT=1000, MAX_DQ=300, MAX_DST=5, LATE_DAYS=14, LIST_STEP=80;
const BATCH=10;   // 1回に 送る 数（Apps Script は 1つ 1〜2秒 かかる ことが ある）
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const ABC='abcdefghijklmnopqrstuvwxyz0123456789';
function rnd(n, abc){ abc=abc||ABC; const a=new Uint8Array(n); try{ crypto.getRandomValues(a); }catch(_){ for(let i=0;i<n;i++) a[i]=Math.floor(Math.random()*256); } return Array.from(a, b=>abc[b%abc.length]).join(''); }
const rid=()=>rnd(8);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);   // onclick に 入れるので 英数字だけ
const okDid=x=>typeof x==='string' && /^g[a-z0-9]{1,8}$/.test(x);  // 送り先の id（onclick に 入れる）
const okKey=x=>typeof x==='string' && /^[A-Za-z0-9_-]{1,40}$/.test(x);
const okTok=x=>typeof x==='string' && /^[A-Za-z0-9_-]{6,40}$/.test(x);
const okIso=s=>typeof s==='string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(s);
const okMail=s=>typeof s==='string' && s.length<=100 && /^[^\s@<>"'&]+@[^\s@<>"'&]+\.[^\s@<>"'&]+$/.test(s);
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
function cleanRec(x){   // 送り先に 送った 予定の 控え
  if(!x || typeof x!=='object') return null;
  const g={id:oneLine(x.id,200), sd:okDate(x.sd) ? x.sd : '', h:oneLine(x.h,20), c:oneLine(x.c,100), e:oneLine(x.e,120)};
  return g.id || g.e ? g : null;
}
function cleanAge(x){
  if(!x || typeof x!=='object') return null;
  const d=Number(x.d); if(!(Number.isInteger(d) && d>=1 && d<=365)) return null;   // 0日・366日 より 先は 入れない
  const g={};
  if(x.g && typeof x.g==='object'){
    if('id' in x.g || 'h' in x.g){ const r=cleanRec(x.g); if(r) g.g1=r; }   // v611 の 形（送り先 1つ）
    else Object.keys(x.g).forEach(k=>{ if(okDid(k) && Object.keys(g).length<MAX_DST){ const r=cleanRec(x.g[k]); if(r) g[k]=r; } });
  }
  return {d, n:intIn(x.n,1,30,3), done:okDate(x.done) ? x.done : '', g};
}
function cleanIt(x){
  if(!x || typeof x!=='object') return null;
  const date=okDate(x.date) ? x.date : '', site=oneLine(x.site,40);
  if(!date || !site) return null;
  const seen=new Set(), ages=(Array.isArray(x.ages) ? x.ages : []).map(cleanAge).filter(a=>a && !seen.has(a.d) && seen.add(a.d)).sort((a,b)=>a.d-b.d).slice(0,12);
  if(!ages.length) return null;
  const num=v=>{ const n=Number(v); return isFinite(n) && n>0 ? n : 0; }, at=num(x.at)||Date.now();
  return {id:okId(x.id) ? x.id : rid(), date, site, mix:oneLine(x.mix,30), part:oneLine(x.part,30), no:oneLine(x.no,30), memo:multi(x.memo,200), ages, at, mt:num(x.mt)||at, fx:num(x.fx)};
}
const newTok=()=>rnd(12, 'abcdefghijkmnpqrstuvwxyz23456789');
function cleanDst(x, i){   // ☁ Google の 送り先（アカウントごと）
  if(!x || typeof x!=='object') return null;
  const p=parseUrl(x.url);
  return {id:okDid(x.id) ? x.id : 'g'+rnd(6), name:oneLine(x.name,20)||('Google'+(i ? ' '+(i+1) : '')), url:p ? p.url : '', tok:okTok(x.tok) ? x.tok : newTok(),
    cal:oneLine(x.cal,100), calName:oneLine(x.calName,60), auto:x.auto!==false, v:intIn(x.v,0,99,0), last:okIso(x.last) ? x.last : '', err:oneLine(x.err,160), net:oneLine(x.net,160)};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const items=(Array.isArray(o.items) ? o.items : []).map(cleanIt).filter(Boolean).slice(0,MAX_IT);
  items.forEach((it,i,a)=>{ if(a.findIndex(x=>x.id===it.id)<i) it.id=rid(); });   // 同じ id は 1つに
  let dests=(Array.isArray(o.dests) ? o.dests : []).slice(0,MAX_DST).map(cleanDst).filter(Boolean);
  if(!Array.isArray(o.dests) && o.g && typeof o.g==='object' && parseUrl(o.g.url) && okTok(o.g.tok))   // v611 の 形 → 送り先 1つ（g1）
    dests=[cleanDst({id:'g1', name:'Google', url:o.g.url, tok:o.g.tok, cal:o.g.cal, calName:o.g.calName, auto:o.g.on!==false, last:o.g.last, err:o.g.err, net:o.g.net}, 0)];
  dests.forEach((D,i,a)=>{ if(a.findIndex(x=>x.id===D.id)<i) D.id='g'+rnd(6); });
  const ids=new Set(dests.map(D=>D.id));
  items.forEach(it=>it.ages.forEach(a=>Object.keys(a.g).forEach(k=>{ if(!ids.has(k)) delete a.g[k]; })));   // ない 送り先の 控えは 消す
  const dq=(Array.isArray(o.dq) ? o.dq : []).map(d=>{
    if(!d || !okKey(d.k)) return null;
    const dst=okDid(d.dst) ? d.dst : 'g1';
    return ids.has(dst) ? {dst, k:d.k, id:oneLine(d.id,200), sd:okDate(d.sd) ? d.sd : '', c:oneLine(d.c,100), e:oneLine(d.e,120)} : null;
  }).filter(Boolean).slice(-MAX_DQ);
  const def=(o.def && typeof o.def==='object') ? o.def : {};
  const dAges=[...new Set((Array.isArray(def.ages) ? def.ages : [7,28]).map(v=>intIn(v,1,365,0)).filter(Boolean))].sort((a,b)=>a-b).slice(0,12);
  const al=[o.alarm, o.g && o.g.alarm].find(v=>ALARMS.some(a=>a[0]===v))||'p17';
  st={items, dq, dests, alarm:al, auth:okMail(o.auth) ? o.auth : '', view:['plan','list'].includes(o.view) ? o.view : 'plan',
    def:{ages:dAges.length ? dAges : [7,28], n:intIn(def.n,1,30,3), ask:def.ask!==false}, q:0};
}
function save(){
  pm=null; st.q=autoDs().reduce((n,D)=>n+plan(D).length, 0);   // すぐ 送る 数（表電卓が 開いた ときに 見る）
  try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); return false; }
}
const itOf=id=>st.items.find(x=>x.id===id)||null;
const ageOf=(it, d)=>it ? it.ages.find(a=>a.d===+d)||null : null;
const dOf=id=>st.dests.find(D=>D.id===id)||null;
const dReady=D=>!!(D && D.url && D.tok);
const autoDs=()=>st ? st.dests.filter(D=>dReady(D) && D.auto) : [];
const gOn=()=>!!(st && st.dests.some(dReady));   // Google の 送り先が ある
const sentTo=(a, D)=>!!(a.g[D.id] && a.g[D.id].id);   // その 送り先に 1回は 入れた

/* ───────── 試験の 一覧 ───────── */
function tests(){
  const T=today(), L=[];
  st.items.forEach(it=>{ const sd=okDate(it.date); it.ages.forEach(a=>{ const td=addDays(sd, a.d); L.push({it, a, sd, td, dd:diff(td, T)}); }); });
  L.sort((x,y)=>x.dd-y.dd || x.it.site.localeCompare(y.it.site,'ja') || x.a.d-y.a.d);
  return L;
}
const stOf=x=>x.a.done ? 'dn' : x.dd<0 ? 'late' : x.dd===0 ? 'today' : '';
const futOf=it=>{ const T=ymd(today()); return it.ages.filter(a=>ymd(tdOf(it, a))>=T); };   // この先（きょう から）の 試験

/* ───────── 予定の 中身（☁ Google・📱 .ics で 同じ） ───────── */
function evOf(it, a){
  const sd=okDate(it.date), td=addDays(sd, a.d), dn=okDate(a.done);
  const title=(a.done ? '✅ ' : '🧱 ')+a.d+'日 試験'+(a.done ? ' 済み' : '')+'：'+it.site+(it.mix ? ' '+it.mix : '')+' '+a.n+'本';
  const desc=['採った日：'+ymdJa(sd), '材齢：'+a.d+'日（試験の 日 '+ymdJa(td)+'）', it.mix ? '配合：'+it.mix : '', it.part ? '打設箇所：'+it.part : '', it.no ? '番号：'+it.no : '',
    '本数：'+a.n+'本', dn ? '✓ 試験 済み（'+md(dn)+'）' : '', it.memo ? 'メモ：'+it.memo : '', '（🧱 表電卓の 供試体 から）'].filter(Boolean).join('\n');
  return {k:it.id+'-'+a.d, date:ymd(td), title, desc, color:a.done ? COLOR.done : COLOR.todo};
}
const alarmMin=()=>(ALARMS.find(x=>x[0]===st.alarm)||ALARMS[0])[2];
const alarmNote=()=>{ const a=ALARMS.find(x=>x[0]===st.alarm)||ALARMS[0]; return a[2]==null ? '知らせは なし' : a[1]+'に 知らせ'; };
function hsh(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h.toString(36); }
const evHash=e=>hsh(JSON.stringify([e.date, e.title, e.desc, e.color, alarmMin()]));

/* ───────── ☁ Google カレンダーに（自分の Apps Script。送り先ごと） ───────── */
const G_URL_RE=/^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]{1,100}|macros)\/s\/[A-Za-z0-9_-]{20,200}\/exec$/;
// 貼った 字から URL（と「ほかの スマホ 用」の 合言葉）を 取り出す
function parseUrl(s){
  s=String(s==null?'':s).normalize('NFKC').trim().replace(/^[<「"']+|[>」"']+$/g,'');
  let tok='';
  const m=/#(?:aikotoba|k)=([A-Za-z0-9_-]{6,40})$/.exec(s); if(m){ tok=m[1]; s=s.slice(0, m.index); }
  s=s.replace(/[?#].*$/,'');
  return G_URL_RE.test(s) ? {url:s, tok} : null;
}
// その 送り先に 送る もの（消す・カレンダーを 移す・作る／直す）。過ぎた 日で まだ 送って いない ものは 送らない
function plan(D){
  const out=[]; if(!st || !dReady(D)) return out;
  const T=ymd(today()), cal=D.cal, al=alarmMin();
  st.dq.forEach(d=>{ if(d.dst===D.id) out.push({t:'dq', D, d, op:{op:'del', k:d.k, id:d.id, date:d.sd, sd:d.sd, cal:d.c}}); });
  st.items.forEach(it=>it.ages.forEach(a=>{
    const e=evOf(it, a), g=a.g[D.id], sent=!!(g && g.id), past=e.date<T;
    let id=sent ? g.id : '', sd=sent ? g.sd : '';
    if(sent && (g.c||'')!==cal){
      if(past) return;   // 過ぎた ものは もとの カレンダーに 置いて おく
      out.push({t:'mv', D, it, a, op:{op:'del', k:e.k, id:g.id, date:g.sd, sd:g.sd, cal:g.c||''}}); id=''; sd='';
    }
    else if(sent && g.h===evHash(e)) return;   // もう 入って いる
    if(!sent && past) return;
    out.push({t:'put', D, it, a, h:evHash(e), op:{op:'put', k:e.k, date:e.date, sd, id, title:e.title, desc:e.desc, alarm:al, color:e.color, cal}});
  }));
  return out;
}
// 送る ものの 覚え（送り先ごとに 試験 1つ → plan の 1つ）。save() と 画面を 作る たびに 作り直す
let pm=null;
function pmap(D){ if(!pm) pm={}; if(!pm[D.id]){ const m=new Map(); plan(D).forEach(p=>{ if(p.a) m.set(p.a, p); }); pm[D.id]=m; } return pm[D.id]; }
// 1つの 試験の その 送り先での ようす：ok（入って いる）・wait（まだ）・err（送れなかった）・''（送らない）
function gState(it, a, D){
  if(!dReady(D)) return '';
  if(!pmap(D).has(a)) return sentTo(a, D) ? 'ok' : '';
  return a.g[D.id] && a.g[D.id].e ? 'err' : 'wait';
}
const G_TXT={ok:'入って います', wait:'まだ 送って いません', later:'まとめて 送る とき に 送ります', err:'送れませんでした'};
function gIcon(it, a){   // 送り先 ぜんぶを まとめた 印（⚠ → ⏳ すぐ 送る → 📤 まとめて → ☁✓）
  const L=st.dests.filter(dReady).map(D=>{ const s=gState(it, a, D); return [D, s==='wait' && !D.auto ? 'later' : s]; }).filter(x=>x[1]);
  if(!L.length) return '';
  const has=k=>L.some(x=>x[1]===k), s=has('err') ? 'err' : has('wait') ? 'wait' : has('later') ? 'later' : 'ok';
  const t=L.map(([D,v])=>(st.dests.length>1 ? D.name+'：' : 'Google カレンダーに ')+G_TXT[v]).join('・');
  return `<i class="kyo-g ${s}" title="${esc(t)}" aria-label="${esc(t)}">${{ok:'☁✓', wait:'⏳', later:'📤', err:'⚠'}[s]}</i>`;
}
// まだ どの カレンダーにも 入れて いない（この先の 試験が ある もの。ファイルに した もの・送り先に この先 ぜんぶ 入れた ものは 入れた と みる）
function notIn(it){
  const fut=futOf(it); if(!fut.length || it.fx) return false;
  return !st.dests.some(D=>dReady(D) && fut.every(a=>sentTo(a, D)));
}
let chain=Promise.resolve(), busyN=0, syncing='', kickT=0, retryT=0;
function kick(ms){ if(!autoDs().length) return; clearTimeout(kickT); kickT=setTimeout(()=>{ sync('auto'); }, ms==null ? 800 : ms); }
async function post(D, body){
  if(!D.url) return {ok:false, kind:'cfg', msg:'URL が 入って いません'};
  if(typeof navigator!=='undefined' && navigator.onLine===false) return {ok:false, kind:'off', msg:'電波が ありません（もどったら 送ります）'};
  let ctl=null, tm=0; try{ ctl=new AbortController(); tm=setTimeout(()=>ctl.abort(), 150000); }catch(_){}
  let r=null;
  try{ r=await fetch(D.url, {method:'POST', body:JSON.stringify(body), redirect:'follow', cache:'no-store', credentials:'omit', signal:ctl ? ctl.signal : undefined}); }
  catch(e){ clearTimeout(tm); return {ok:false, kind:'net', msg:e && e.name==='AbortError' ? '返事が ありませんでした（時間切れ）' : 'つながりませんでした（電波・URL・デプロイの「アクセスできる ユーザー：全員」を たしかめて ください）'}; }
  clearTimeout(tm);
  let j=null; try{ j=await r.json(); }catch(_){}
  if(!j || typeof j!=='object') return {ok:false, kind:'bad', msg:'返事が 読めませんでした（コードを 貼り直して、デプロイし直して ください）'};
  if(!j.ok){
    if(j.err==='token') return {ok:false, kind:'token', msg:'合言葉が ちがいます（📋 コードを コピーして 貼り直し、デプロイし直して ください）'};
    if(j.err==='busy') return {ok:false, kind:'net', msg:'Apps Script が 混み合って います（あとで 送ります）'};
    if(j.err==='cal') return {ok:false, kind:'bad', msg:ERR_TXT.cal};
    return {ok:false, kind:'bad', msg:'Apps Script で うまく いきませんでした（'+oneLine(j.err,60)+'）'};
  }
  return {ok:true, data:j};
}
const ERR_TXT={cal:'カレンダーが 見つかりません（メールアドレスの ときは、その カレンダーを 共有して「予定の変更」を 許し、Google カレンダーに 追加して ください）', date:'日付が おかしい', key:'印が おかしい', op:'うまく いきませんでした'};
const errOf=x=>x ? (ERR_TXT[x.err] || oneLine(x.err||'うまく いきませんでした',80)) : '返事が ありませんでした';
function applyRes(p, x){
  const ok=!!(x && x.ok), D=p.D;
  if(!st.dests.includes(D)) return ok;   // 送って いる 間に 送り先を 消した
  if(p.t==='dq'){ if(ok){ const i=st.dq.indexOf(p.d); if(i>=0) st.dq.splice(i,1); } else p.d.e=errOf(x); return ok; }
  if(p.t==='mv'){ if(ok && p.a.g[D.id] && p.a.g[D.id].id===p.op.id) delete p.a.g[D.id]; return ok; }
  const alive=st.items.includes(p.it) && p.it.ages.includes(p.a);
  if(ok && x.id){
    const id=oneLine(x.id,200);
    if(!alive){ st.dq.push({dst:D.id, k:p.op.k, id, sd:p.op.date, c:p.op.cal, e:''}); return true; }   // 送って いる 間に 消した もの は 消しに 行く
    p.a.g[D.id]={id, sd:p.op.date, h:p.h, c:p.op.cal, e:''};
    return true;
  }
  if(alive) p.a.g[D.id]=Object.assign({id:'', sd:'', h:'', c:'', e:''}, p.a.g[D.id]||{}, {e:ok ? '予定の id が 返って きませんでした' : errOf(x)});
  return false;
}
// 送る（1つずつ 順に）。why：user＝押した・auto＝入れた／直した あと・bg＝表電卓が 開いた／電波が もどった・batch＝まとめて 送る
// opt：{dst（その 送り先だけ。まとめて の 送り先も）, only（Set：その 供試体だけ）}。dst が ない ときは すぐ 送る 送り先 ぜんぶ
function sync(why, opt){
  busyN++;
  const p=chain.then(()=>doSync(why||'user', opt||{})).catch(()=>({sent:0})).finally(()=>{ busyN--; refresh(); });
  chain=p.then(()=>{}, ()=>{});
  return p;
}
async function doSync(why, opt){
  if(!st) load();
  const L=opt.dst ? st.dests.filter(D=>D.id===opt.dst && dReady(D)) : autoDs();
  let put=0, del=0, bad=0, first='', err='', kind='';
  const who=[];
  for(const D of L){
    const n0=put+del;
    for(let round=0; round<50 && st.dests.includes(D); round++){   // 10件ずつ
      let P=plan(D); if(opt.only) P=P.filter(p=>p.t==='dq' || opt.only.has(p.it.id));
      P=P.slice(0, BATCH); if(!P.length) break;
      syncing=D.id; refresh();
      let res;
      try{ res=await post(D, {t:D.tok, cal:D.cal, ops:P.map(p=>p.op)}); }catch(_){ res={ok:false, kind:'net', msg:'つながりませんでした'}; }
      syncing='';
      if(!res.ok){
        const wait=res.kind==='off' || res.kind==='net';   // 電波・つながらない は 待って また 送る
        if(wait) D.net=res.msg; else D.err=res.msg;
        err=res.msg; kind=res.kind; save(); refresh();
        if(why==='user' || why==='batch' || (!wait && why==='auto')) toastS('☁ '+(st.dests.length>1 ? D.name+'：' : '')+res.msg, 4600);
        if(wait && D.auto && isOpen()){ clearTimeout(retryT); retryT=setTimeout(()=>kick(0), 60000); }   // 開いて いる 間は 1分 ごとに
        break;
      }
      const R=Array.isArray(res.data.res) ? res.data.res : [];
      let b=0;
      P.forEach((p,i)=>{ if(applyRes(p, R[i])){ if(p.t==='put') put++; else del++; } else { b++; if(!first) first=errOf(R[i]); } });
      bad+=b; D.err=b ? b+'件 送れませんでした（'+first+'）' : ''; D.net=''; D.last=new Date().toISOString();
      const v=Math.round(Number(res.data.v)); if(v>0) D.v=Math.min(99, v);
      save(); refresh();
      if(b) break;   // 送れない ものが ある ときは 次の きっかけで
    }
    if(put+del>n0) who.push(D.name);
  }
  if((put || del) && why!=='silent') toastS('☁ '+(st.dests.length>1 ? who.join('・')+'：' : '')+'Google カレンダーに '+[put ? put+'件 入れました' : '', del ? del+'件 消しました' : ''].filter(Boolean).join('・'), 2600);
  if(bad && (why==='user' || why==='batch')) toastS('⚠ '+bad+'件 送れませんでした（'+first+'）', 4600);
  if(why==='user' && !put && !del && !bad && !err) toastS('☁ 送る ものは ありません（ぜんぶ 入って います）');
  return {sent:put+del, put, del, bad, err, kind};
}
async function gtest(id){
  const D=dOf(id); if(!D) return false;
  const inp=$('kyoGUrl'), p=parseUrl(inp && pop && pop.kind==='gd' && pop.id===D.id ? inp.value : D.url);
  if(!p){ toastS('URL が ちがう ようです（https://script.google.com/macros/s/…/exec）', 4600); return false; }
  D.url=p.url; if(p.tok) D.tok=p.tok; save();
  gMsg='🧪 たしかめて います…'; reG();
  const r=await post(D, {t:D.tok, ping:true, cal:D.cal});
  if(r.ok){
    D.err=''; D.net=''; D.calName=oneLine(r.data.cal,60); D.last=new Date().toISOString();
    const v=Math.round(Number(r.data.v)); if(v>0) D.v=Math.min(99, v);
    save();
    gMsg='✅ つながりました。カレンダー「'+(D.calName||'いつもの カレンダー')+'」に 入れます。'+(D.auto ? '' : '（「📅 まとめて 送る」で 送ります）');
    if(D.cal.includes('@') && D.v<2) gMsg='⚠ コードが 古い ため、メールアドレスの カレンダーには 入れられません（📋 コードを コピーして 貼り直し、新しい バージョンで デプロイし直して ください）';
    toastS('✅ Google カレンダーに つながりました', 3000); reG(); render(); if(D.auto) kick(200);
    return true;
  }
  D.err=r.msg; save(); gMsg='⚠ '+r.msg; reG(); render();
  return false;
}
function gurl(id, v){
  const D=dOf(id), p=parseUrl(v); if(!D) return;
  if(!p){ if(String(v||'').trim()) toastS('URL が ちがう ようです（https://script.google.com/macros/s/…/exec）', 4600); return; }
  if(p.url===D.url && (!p.tok || p.tok===D.tok)) return;
  gtest(id);
}
// 送り先ごとの 決まり（name・cal・auto・tok）
function dset(id, k, v){
  const D=dOf(id); if(!D) return;
  if(k==='name'){ const n=oneLine(v,20); if(!n){ toastS('送り先の 名前を 入れて ください'); reG(); return; } if(n===D.name) return; D.name=n; save(); }
  else if(k==='cal'){
    const c=oneLine(v,100); if(c===D.cal) return; D.cal=c; D.calName=''; save();
    toastS(c ? 'これからの 予定は カレンダー「'+c+'」に 入れます'+(c.includes('@') ? '（共有で「予定の変更」が 許されて いる こと）' : '（なければ 作ります）') : 'これからの 予定は いつもの カレンダーに 入れます', 4200);
  }
  else if(k==='auto'){ const a=!!v; if(a===D.auto) return; D.auto=a; save(); toastS(a ? '入れたら すぐ 送ります' : '「📅 まとめて 送る」で 送ります'); }
  else if(k==='tok'){
    const t=String(v==null?'':v).trim();
    if(!okTok(t)){ toastS('合言葉は 6〜40字の 英数字です'); reG(); return; }
    if(t===D.tok) return;
    D.tok=t; D.err=''; save(); toastS('合言葉を かえました（コードの AIKOTOBA も 同じに して、デプロイし直して ください）', 4600);
  }
  else return;
  reG(); render(); if(D.auto) kick(300);
}
// みんなの 決まり（alarm：知らせ・auth：🗓 で 開く ときの Google アカウント）
function gset(k, v){
  if(k==='alarm'){ if(!ALARMS.some(a=>a[0]===v) || st.alarm===v) return; st.alarm=v; save(); }
  else if(k==='auth'){
    const m=String(v==null?'':v).normalize('NFKC').trim();
    if(m && !okMail(m)){ toastS('メールアドレスが ちがう ようです'); reG(); return; }
    if(m===st.auth) return;
    st.auth=m; save(); toastS(m ? '🗓 で 開く ときは「'+m+'」の Google カレンダーに します' : '🗓 で 開く ときは いま ログイン して いる アカウントに します', 3600);
  }
  else return;
  reG(); render(); kick(300);
}
function gadd(){
  if(st.dests.length>=MAX_DST){ toastS('送り先は '+MAX_DST+'つ まで です'); return null; }
  const D=cleanDst({name:st.dests.length ? 'Google '+(st.dests.length+1) : 'Google'}, st.dests.length);
  st.dests.push(D); save(); gedit(D.id); render();
  return D.id;
}
async function gdel(id){
  const D=dOf(id); if(!D) return false;
  if(typeof appConfirm==='function' && !(await appConfirm('送り先「'+D.name+'」を 消しますか？\n（もう 入って いる 予定は その カレンダーに 残ります）', '消す', 'やめる'))) return false;
  st.dests.splice(st.dests.indexOf(D),1); st.dq=st.dq.filter(d=>d.dst!==D.id);
  st.items.forEach(it=>it.ages.forEach(a=>{ delete a.g[D.id]; }));
  save(); popClose(); render(); if(st.dests.length) gopen(); toastS('送り先「'+D.name+'」を 消しました');
  return true;
}
function gcopy(id){ const D=dOf(id); if(D && typeof toolCopyText==='function') toolCopyText(gasCode(D.tok), '📋 コードを コピーしました（Apps Script に 貼ります）'); }
async function gshare(id){
  const D=dOf(id); if(!D) return;
  try{ await navigator.share({title:'表電卓 🧱 供試体 の Apps Script（'+D.name+'）', text:gasCode(D.tok)}); }catch(e){ if(!(e && e.name==='AbortError')) gcopy(id); }
}
function gcopyCfg(id){ const D=dOf(id); if(D && D.url && typeof toolCopyText==='function') toolCopyText(D.url+'#aikotoba='+D.tok, '📋 コピーしました。ほかの スマホの 🧱 供試体 → ☁ → 送り先の URL に 貼って ください'); }

/* Apps Script に 貼る コード（Google の 中で 動く。ためす ときは tests/run.js の 作り物の CalendarApp で 動かす） */
const GAS=String.raw`/* ─────────────────────────────────────────────
   表電卓 🧱 供試体 → Google カレンダー の 受け口（v612）
   ① この コードを ぜんぶ Apps Script（https://script.new）に 貼って 💾 保存
   ② 右上の「デプロイ」→「新しいデプロイ」→ 左の ⚙ →「ウェブアプリ」
      次のユーザーとして実行：自分 ／ アクセスできるユーザー：全員 →「デプロイ」
   ③「アクセスを承認」→ 自分の アカウント →「詳細」→「（名前）に移動」→「許可」
   ④ 出てきた ウェブアプリ の URL（…/exec）を 表電卓の 🧱 供試体 → ☁ → 送り先 に 貼る
   ・合言葉（AIKOTOBA）が 表電卓と 同じ ときだけ 受けつけます。
   ・入れる カレンダー：空なら この アカウントの いつもの カレンダー、名前なら その カレンダー（なければ 作る）、
     メールアドレス／カレンダー ID なら その カレンダー（共有で「予定の変更」を 許されて いる もの）。
   ・さわるのは この 受け口が 作った 予定（印 hyo）だけです。
   ・コードを 直したら「デプロイを管理」→ ✎ →「新バージョン」で デプロイし直します。
   ───────────────────────────────────────────── */
const AIKOTOBA = '%AIKOTOBA%';
const VERSION = 2;

function doPost(e) {
  let d = null;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, err: 'json' }); }
  if (!d || d.t !== AIKOTOBA) return out_({ ok: false, err: 'token' });
  const lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return out_({ ok: false, err: 'busy' }); }
  try {
    if (d.ping) {
      const c = cal_(d.cal, true);
      if (!c) return out_({ ok: false, v: VERSION, err: 'cal' });
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

// カレンダー：空なら いつもの カレンダー・@ が あれば カレンダー ID（メールアドレス）・ほかは 名前（make の ときは なければ 作る）
const CALS_ = {};
function cal_(name, make) {
  name = String(name || '').trim().slice(0, 100);
  if (CALS_[name]) return CALS_[name];
  let c = null;
  if (!name) c = CalendarApp.getDefaultCalendar();
  else if (name.indexOf('@') > 0) c = CalendarApp.getCalendarById(name);
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
  if (!c) return { ok: false, err: 'cal' };
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
const notInN=()=>st.items.filter(notIn).length;
function topHtml(){
  const n=notInN();
  return `<button type="button" class="kyo-b pri" onclick="KYOSHI.add()">＋ 入れる</button><button type="button" class="kyo-b" onclick="KYOSHI.batch()" aria-label="まとめて 送る${n ? '（まだ '+n+'件）' : ''}">📅 まとめて 送る${n ? `<b class="kyo-cnt">${n}</b>` : ''}</button><button type="button" class="kyo-b" onclick="KYOSHI.copy()">📋 コピー</button>`;
}
function render(){
  const b=$('kyoBody'); if(!b || !st) return;
  const top=b.scrollTop; pm=null;
  b.innerHTML=`<div class="kyo-wrap">
    <div class="kyo-top" id="kyoTop">${topHtml()}</div>
    <div id="kyoGBar">${gBarHtml()}</div>
    <div class="kyo-tabs" role="tablist">${[['plan','📅 試験の 予定'],['list','🧱 採った 供試体']].map(([k,t])=>`<button type="button" role="tab" aria-selected="${st.view===k}" class="${st.view===k?'on':''}" onclick="KYOSHI.view('${k}')">${t}</button>`).join('')}</div>
    <div id="kyoView">${st.view==='plan' ? planHtml() : listHtml()}</div>
  </div>`;
  b.scrollTop=top;
}
// ☁ の ようすが かわった ときに（打って いる 字を 消さない ように、入れる 欄の ない ところだけ 書き直す）
function refresh(){
  if(!isOpen() || !st) return;
  pm=null;
  const tp=$('kyoTop'); if(tp) tp.innerHTML=topHtml();
  const gb=$('kyoGBar'); if(gb) gb.innerHTML=gBarHtml();
  if(st.view==='plan'){ const v=$('kyoView'); if(v) v.innerHTML=planHtml(); }
  else { const l=$('kyoList'); if(l) l.innerHTML=listInner(); }
  if(pop && pop.kind==='item'){ const it=itOf(pop.id), ae=pop.el.querySelector('#kyoAgesEd'); if(it && ae) ae.innerHTML=agesEdHtml(it); }
  if(pop && pop.kind==='gd') reGst();
}
const lastText=s=>{ const d=new Date(s); if(isNaN(d.getTime())) return ''; return (diff(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today())===0 ? 'きょう ' : md(d)+' ')+pad2(d.getHours())+':'+pad2(d.getMinutes()); };
const calTxt=D=>'カレンダー「'+(D.calName||D.cal||'いつもの カレンダー')+'」';
function gBarHtml(){
  const L=st.dests.filter(dReady);
  if(!L.length) return `<button type="button" class="kyo-gbar off" onclick="KYOSHI.gopen()"><span><b>☁ 入れるだけで Google カレンダーに</b><small>はじめに 1回だけ 設定します（10分ほど。パソコンが かんたん）</small></span></button>`;
  const many=st.dests.length>1;
  return L.map(D=>{
    const nm=many ? D.name+'：' : '', n=plan(D).length;
    if(syncing===D.id) return `<div class="kyo-gbar run" role="status"><span><b>☁ ${esc(nm)}Google カレンダーに 送って います…</b></span></div>`;
    if(D.err && n) return `<button type="button" class="kyo-gbar err" onclick="KYOSHI.gedit('${D.id}')"><span><b>⚠ ${esc(nm)}Google カレンダーに 送れて いません（${n}件）</b><small>${esc(D.err)}</small></span></button>`;
    if(!D.auto) return n ? `<div class="kyo-gbar later"><span><b>📤 ${esc(nm)}まとめて 送る とき に 送ります（まだ ${n}件）</b><small>${esc(D.net || calTxt(D))}</small></span><button type="button" class="kyo-b sm" onclick="KYOSHI.batch({dst:'${D.id}'})">📅 まとめて 送る</button></div>`
      : `<button type="button" class="kyo-gbar ok" onclick="KYOSHI.gedit('${D.id}')"><span><b>☁ ${esc(nm)}まとめて 送る（ぜんぶ 入って います）</b><small>${esc(calTxt(D)+(D.last ? '・最後に 送った '+lastText(D.last) : ''))}</small></span></button>`;
    if(n) return `<div class="kyo-gbar wait"><span><b>⏳ ${esc(nm)}まだ 送って いない ${n}件</b><small>${esc(navigator.onLine===false ? '電波が もどったら 送ります' : D.net || 'すぐ 送ります')}</small></span><button type="button" class="kyo-b sm" onclick="KYOSHI.sync()">☁ 今 送る</button></div>`;
    return `<button type="button" class="kyo-gbar ok" onclick="KYOSHI.gedit('${D.id}')"><span><b>☁ ${esc(nm)}Google カレンダーに 自動で 入れて います</b><small>${esc([calTxt(D), D.last ? '最後に 送った '+lastText(D.last) : ''].filter(Boolean).join('・'))}</small></span></button>`;
  }).join('');
}
function emptyHtml(){
  return `<div class="kyo-empty"><p><b>現場で 採った 供試体を 入れると、試験の 日（7日・28日 など）が わかります。</b></p>
    <p>「＋ 入れる」で 採った日・現場・配合・材齢・本数を 入れます。1日に 何件でも 続けて 入れて、「📅 まとめて 送る」で カレンダーに 入れられます。${gOn() ? 'Google カレンダーにも 送ります。' : '上の ☁ を 設定すると、入れるだけで Google カレンダーにも 入ります。'}</p>
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
    <div class="kyo-acts end"><button type="button" class="kyo-b" onclick="KYOSHI.table()">▦ 表に 入れる</button><button type="button" class="kyo-b" onclick="KYOSHI.tidy()">🧹 古い ものを 片づける</button></div>
    <p class="kyo-note">▦ は 試験 1つを 1行に して 表に 入れます（Excel・印刷にも）。🧹 は 試験の 日が みな 3か月 より 前の ものを 一覧から 消します（カレンダーの 予定は そのまま）。</p>`;
}

/* ───────── 小さな窓（入れる・くわしく・まとめて 送る・☁ 送り先）───────── */
let pop=null;   // {el, rel, kind, id}
function popOpen(html, kind, id){
  popClose();
  const host=document.querySelector('#kyoshiOverlay .kyo-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='kyo-pop-bg';
  el.innerHTML=`<div class="kyo-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  pop={el, kind, id, rel:null};
  const me=pop; pop.rel=modalBack(()=>{ if(pop===me){ pop=null; el.remove(); onPopGone(me); } });   // 端末の「戻る」は この窓だけ 閉じる
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); onPopGone(p); }
function onPopGone(p){ if(p.kind==='add'){ dr=null; sess=[]; } if(p.kind==='batch') bt=null; }
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
let dr=null, sess=[];   // 入れる 前の 下書き・この 窓で 入れた 供試体の id（1日に 何件も）
function agesChipsDr(){ return ageList(dr.ages).map(d=>{ const on=dr.ages.includes(d); return `<button type="button" class="${on?'on':''}" aria-pressed="${on}" onclick="KYOSHI.drAge(${d})">${d}日</button>`; }).join(''); }
function prevHtml(){
  const sd=okDate(dr.date); if(!sd) return '採った日を 入れて ください';
  return '<b>試験の 日</b>'+dr.ages.map(d=>{ const td=addDays(sd,d), hn=hol(td); return `<span>${d}日 → ${dHtml(td)}${hn || td.getDay()===0 ? ` <em>⚠ ${esc(hn||'日曜')}</em>` : ''}</span>`; }).join('');
}
function sessHtml(){
  const L=sess.map(itOf).filter(Boolean);
  return L.length ? `<div class="kyo-sess" id="kyoSess" role="status"><b>この 窓で 入れた 物件（${L.length}）</b>${L.map((it,i)=>`<span>${i+1}. ${esc(it.site)}${it.mix ? ' '+esc(it.mix) : ''}<small>${esc(md(okDate(it.date)))} 採取</small></span>`).join('')}</div>` : '';
}
function addHtml(){
  const auto=autoDs().length>0;
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">🧱</span><b>供試体を 入れる</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    ${sessHtml()}
    ${fieldsHtml(dr, 'dr')}
    <div class="kyo-f top"><span>材齢</span><div class="kyo-chips" id="kyoAgeChips">${agesChipsDr()}</div></div>
    <div class="kyo-f"><span></span><span class="kyo-cust"><input id="kyoCust" type="text" inputmode="numeric" maxlength="3" placeholder="例 21" aria-label="ほかの 材齢（日）"><em>日</em><button type="button" class="kyo-b sm" onclick="KYOSHI.drAgeCust()">＋ ほかの 日数</button></span></div>
    <div class="kyo-f"><span>本数</span><span class="kyo-step"><button type="button" onclick="KYOSHI.drN(-1)" aria-label="1本 へらす">−</button><b id="kyoN">${dr.n}</b><button type="button" onclick="KYOSHI.drN(1)" aria-label="1本 ふやす">＋</button><em>本（材齢 1つ ごと）</em></span></div>
    <div class="kyo-prev" id="kyoPrev">${prevHtml()}</div>
    ${auto ? '' : `<label class="kyo-ck"><input type="checkbox" id="kyoAsk"${st.def.ask ? ' checked' : ''}> 入れ おわったら「📅 まとめて 送る」窓を 出す</label>`}
    <div class="kyo-acts end"><button type="button" class="kyo-b" onclick="KYOSHI.addGo(true)">＋ 入れて 次の 物件へ</button><button type="button" class="kyo-b pri" onclick="KYOSHI.addGo()">✓ 入れて おわる</button></div>
    <p class="kyo-note">1日に 何件も ある ときは「＋ 入れて 次の 物件へ」（採った日・材齢・本数は そのまま）。${auto ? '☁ 入れると、試験の 日が Google カレンダーにも 自動で 入ります（電波が ない ときは もどってから）。' : '入れ おわったら「📅 まとめて 送る」で カレンダーに まとめて 入れます。☁ を 設定すると、入れるだけで Google カレンダーに 入ります。'}</p>`;
}
function openAdd(pre){
  popClose();
  dr={date:ymd(today()), site:'', mix:'', part:'', no:'', memo:'', ages:st.def.ages.slice(), n:st.def.n}; sess=[];
  if(pre && typeof pre==='object' && !(pre instanceof Event)){ if(okDate(pre.date)) dr.date=pre.date; if(pre.site) dr.site=oneLine(pre.site,40); if(pre.mix) dr.mix=oneLine(pre.mix,30); }
  popOpen(addHtml(), 'add');
  focusSite();
}
function focusSite(){ const n=pop && pop.el.querySelector('input[data-k="site"]'); if(n && !n.value) setTimeout(()=>{ try{ n.focus(); }catch(_){} }, 60); }
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
  const now=Date.now(), it=cleanIt({id:rid(), date:o.date, site:o.site, mix:o.mix, part:o.part, no:o.no, memo:o.memo, ages:ages.map(d=>({d, n})), at:now, mt:now});
  if(!it) return null;
  st.items.push(it); st.def.ages=ages; st.def.n=n;
  save(); return it;
}
// 入れる（more：入れて 次の 物件へ）。現場が 空で、この 窓で もう 入れて いれば「おわる」だけ
function addGo(more){
  if(!dr) return null;
  const site=oneLine(dr.site,40);
  if(!okDate(dr.date)){ toastS('採った日を 入れて ください'); return null; }
  const ask=$('kyoAsk'); if(ask) st.def.ask=ask.checked;
  if(!site){
    if(!more && sess.length){ finishAdd(); return null; }
    toastS('現場の 名前を 入れて ください'); const i=pop && pop.el.querySelector('input[data-k="site"]'); if(i) try{ i.focus(); }catch(_){}
    return null;
  }
  const it=addItem(dr); if(!it) return null;
  sess.push(it.id);
  if(autoDs().length) kick(0);
  if(more){
    dr=Object.assign({}, dr, {site:'', mix:'', part:'', no:'', memo:''});
    rePop(addHtml()); render(); focusSite();
    toastS('🧱「'+it.site+'」を 入れました。次の 物件を どうぞ（'+sess.length+'件め まで）', 3000);
    return it;
  }
  finishAdd();
  return it;
}
function finishAdd(){
  const L=sess.map(itOf).filter(Boolean);
  popClose(); render();
  if(!L.length) return;
  const sd=okDate(L[0].date);
  toastS(L.length===1 ? '🧱 入れました：'+L[0].ages.map(a=>a.d+'日 '+md(addDays(sd, a.d))).join('・') : '🧱 '+L.length+'件 入れました', 3600);
  if(st.def.ask && !autoDs().length && L.some(it=>futOf(it).length)) openBatch({ids:L.map(it=>it.id)});   // まとめて 送る 窓（入れた ものを えらんで）
}

// くわしく
function agesEdHtml(it){
  const sd=okDate(it.date), T=today(), on=gOn();
  return it.ages.map(a=>{
    const td=addDays(sd, a.d), dd=diff(td, T), s=stOf({a, dd}), dn=okDate(a.done);
    const gt=st.dests.filter(dReady).map(D=>{ const v=gState(it, a, D); if(!v) return ''; const x=v==='wait' && !D.auto ? 'later' : v; return (st.dests.length>1 ? D.name : '☁')+'：'+(x==='err' ? '⚠ '+(a.g[D.id] && a.g[D.id].e ? a.g[D.id].e : '送れませんでした') : {ok:'入って います', wait:'⏳ まだ', later:'📤 まとめて 送る とき'}[x]); }).filter(Boolean).join('・');
    return `<div class="kyo-ae ${s}">
      <span class="kyo-age" aria-hidden="true"><b>${a.d}</b>日</span>
      <span class="t">${dHtml(td)}<small>${esc((dn ? '✓ 済み（'+md(dn)+'）' : dd<0 ? (-dd)+'日 過ぎ' : dd===0 ? 'きょう' : 'あと '+dd+'日')+(gt ? '・'+gt : ''))}</small></span>
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
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.batch({ids:['${it.id}']})">📅 カレンダーに</button><button type="button" class="kyo-b" onclick="KYOSHI.copyOne('${it.id}')">📋 コピー</button></div>
    ${gOn() ? '<p class="kyo-note">☁ Google カレンダーに 送った ものは、直すと カレンダーも 直ります（まとめて 送る 送り先は 次に 送る とき）。</p>' : ''}
    <div class="kyo-acts end"><button type="button" class="kyo-b warn" onclick="KYOSHI.del('${it.id}')">🗑 この 供試体を 消す</button></div>`;
}
function openItem(id){ const it=itOf(id); if(!it) return; popOpen(detailHtml(it), 'item', id); }
function reItem(){ if(pop && pop.kind==='item'){ const it=itOf(pop.id); if(it) rePop(detailHtml(it)); else popClose(); } }

/* ───────── 入れる・かえる ───────── */
function changed(it){ if(it) it.mt=Date.now(); save(); render(); reItem(); kick(); }   // it：中身を 直した（📱 ファイルに した あとの 直し）
function setF(id, k, v){
  const it=itOf(id); if(!it) return;
  if(k==='date'){ if(!okDate(v)){ toastS('日付を えらんで ください'); reItem(); return; } if(v===it.date) return; it.date=v; }
  else if(k==='site'){ const s=oneLine(v,40); if(!s){ toastS('現場の 名前は 空に できません'); reItem(); return; } it.site=s; }
  else if(k==='mix') it.mix=oneLine(v,30); else if(k==='part') it.part=oneLine(v,30); else if(k==='no') it.no=oneLine(v,30); else if(k==='memo') it.memo=multi(v,200);
  else return;
  changed(it);
}
// 送った 予定を 消しに 行く（送り先 ぜんぶ）
function goneOf(it, a){ Object.keys(a.g).forEach(dst=>{ const g=a.g[dst]; if(g && g.id && dOf(dst)) st.dq.push({dst, k:it.id+'-'+a.d, id:g.id, sd:g.sd, c:g.c||'', e:''}); }); if(st.dq.length>MAX_DQ) st.dq.splice(0, st.dq.length-MAX_DQ); }
function toggleAge(id, d){
  const it=itOf(id); d=intIn(d,1,365,0); if(!it || !d) return;
  const a=ageOf(it, d);
  if(a){ if(it.ages.length===1){ toastS('材齢を 1つは 残して ください（消すときは 🗑）'); return; } goneOf(it, a); it.ages.splice(it.ages.indexOf(a),1); }
  else { if(it.ages.length>=12){ toastS('材齢は 12まで です'); return; } it.ages.push({d, n:it.ages[0] ? it.ages[0].n : st.def.n, done:'', g:{}}); it.ages.sort((x,y)=>x.d-y.d); }
  changed(it);
}
function ageCust(id){ const i=$('kyoCust2'), d=intIn(i ? i.value : '', 1, 365, 0); if(!d){ toastS('日数を 1〜365 で 入れて ください'); return; } const it=itOf(id); if(it && !ageOf(it, d)) toggleAge(id, d); }
function setN(id, d, k){ const it=itOf(id), a=ageOf(it, d); if(!a) return; const n=Math.min(30, Math.max(1, a.n+(+k||0))); if(n===a.n) return; a.n=n; changed(it); }
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
  const sent=it.ages.some(a=>Object.keys(a.g).some(k=>a.g[k] && a.g[k].id));
  if(typeof appConfirm==='function' && !(await appConfirm('「'+it.site+'」（'+md(okDate(it.date))+' 採取）を 消しますか？'+(sent ? '\n（Google カレンダーの 予定も 消します）' : ''), '消す', 'やめる'))) return false;
  it.ages.forEach(a=>goneOf(it, a));
  const i=st.items.indexOf(it); if(i>=0) st.items.splice(i,1);
  popClose(); changed(); toastS('消しました');
  return true;
}
async function tidy(){
  const cut=addDays(today(), -90), old=st.items.filter(it=>it.ages.every(a=>tdOf(it, a)<cut));
  if(!old.length){ toastS('片づける 古い ものは ありません（試験の 日が みな 3か月 より 前の もの）', 3600); return 0; }
  if(typeof appConfirm==='function' && !(await appConfirm(old.length+'件の 古い 供試体（試験の 日が みな 3か月 より 前）を 一覧から 消しますか？\n（カレンダーの 予定は そのまま 残ります）', '片づける', 'やめる'))) return 0;
  st.items=st.items.filter(it=>!old.includes(it)); save(); render(); toastS('🧹 '+old.length+'件 片づけました');
  return old.length;
}
function setView(k){ if(!['plan','list'].includes(k)) return; st.view=k; save(); render(); }
function setQ(v){ lq=String(v==null?'':v).slice(0,40); listMax=LIST_STEP; const l=$('kyoList'); if(l) l.innerHTML=listInner(); }
function more(){ listMax+=LIST_STEP; const l=$('kyoList'); if(l) l.innerHTML=listInner(); }

/* ───────── 文字で コピー・▦ 表に 入れる ───────── */
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
// 試験 1つ ＝ 1行（採った日の 順）
function tableRows(){
  const L=tests().slice().sort((x,y)=>x.it.date.localeCompare(y.it.date) || x.it.at-y.it.at || x.a.d-y.a.d);
  return [['採った日','現場','配合','打設箇所','番号','材齢（日）','試験の日','本数','試験 済み','メモ']]
    .concat(L.map(x=>[ymd(x.sd), x.it.site, x.it.mix, x.it.part, x.it.no, x.a.d, ymd(x.td), x.a.n, x.a.done, x.it.memo.replace(/\n/g,' ')]));
}
function toTable(){ if(!st.items.length){ toastS('まだ 何も ありません'); return; } if(typeof toolPasteRows==='function') toolPasteRows(tableRows(), '🧱 供試体の 試験', closeKyoshi); }

/* ───────── 📅 カレンダーの ファイル（.ics。hyoics.js） ───────── */
function icsEv(it, a){ const e=evOf(it, a), al=alarmMin(); return {uid:'kyoshi-'+e.k, title:e.title, date:e.date, allDay:true, alarm:al, desc:e.desc}; }
function icsOfIt(it, onlyNext){ const T=ymd(today()); return it.ages.map(a=>icsEv(it, a)).filter(e=>!onlyNext || e.date>=T); }
function withIcs(fn){
  if(window.HyoIcs){ fn(); return; }
  if(typeof loadSidePart!=='function'){ toastS('カレンダーの 部品が 読めません'); return; }
  loadSidePart(['hyoics.js']).then(ok=>{ if(ok && window.HyoIcs) fn(); else toastS('カレンダーの 部品を 読めませんでした。インターネットに つながる ところで もう一度 どうぞ'); });
}
function gcalUrl(it, a){ let u=window.HyoIcs ? HyoIcs.gcal(icsEv(it, a)) : ''; if(u && st.auth) u+='&authuser='+encodeURIComponent(st.auth); return u; }
function gcal1(id, d){ const it=itOf(id), a=ageOf(it, d); if(!a) return; withIcs(()=>{ const u=gcalUrl(it, a); if(u) try{ window.open(u, '_blank', 'noopener'); }catch(_){} }); }

/* ───────── 📅 まとめて 送る ───────── */
let bt=null;   // {dst（送り先の id か 'file'）, sel（Set）, keep（入れた ばかりの ものを えらんだ まま）}
// その 送り先に まだ 入って いない（直した あと まだ も）。この先の 試験が ある ものだけ
function pendFor(it, dst){
  if(!futOf(it).length) return false;
  if(dst==='file') return !(it.fx && it.fx>=it.mt);
  const D=dOf(dst); if(!dReady(D)) return false;
  return it.ages.some(a=>pmap(D).has(a));
}
const batchItems=()=>st.items.filter(it=>futOf(it).length || (bt && bt.sel.has(it.id))).sort((a,b)=>b.date.localeCompare(a.date) || b.at-a.at);
function bDefDst(){ const m=st.dests.find(D=>dReady(D) && !D.auto && st.items.some(it=>pendFor(it, D.id))); return m ? m.id : 'file'; }
function openBatch(o){
  o=(o && typeof o==='object' && !(o instanceof Event)) ? o : {};
  popClose(); pm=null;
  const dst=o.dst==='file' || dReady(dOf(o.dst)) ? o.dst : bDefDst(), ids=Array.isArray(o.ids) ? o.ids.filter(id=>itOf(id)) : null;
  bt={dst, sel:new Set(ids || st.items.filter(it=>pendFor(it, dst)).map(it=>it.id)), keep:!!ids};
  popOpen(batchHtml(), 'batch');
}
function badges(it){
  const fut=futOf(it), out=st.dests.filter(dReady).filter(D=>fut.length && fut.every(a=>sentTo(a, D))).map(D=>'☁'+D.name+'✓');
  if(it.fx) out.push('📱✓');
  return out.length ? `<em class="kyo-bd">${esc(out.join(' '))}</em>` : '';
}
function batchListHtml(){
  if(!bt) return '';
  const L=batchItems();
  if(!L.length) return '<p class="kyo-none">この先の 試験が ある 供試体が ありません。</p>';
  let h='', cur='';
  L.forEach(it=>{
    if(it.date!==cur){ cur=it.date; h+=`<h4 class="kyo-h">${dHtml(okDate(it.date))}<small>採った 日</small></h4>`; }
    const sd=okDate(it.date), fut=futOf(it);
    h+=`<label class="kyo-bi${pendFor(it, bt.dst) ? '' : ' in'}"><input type="checkbox"${bt.sel.has(it.id) ? ' checked' : ''} onchange="KYOSHI.bSel('${it.id}', this.checked)" aria-label="${esc(it.site)}を 送る">
      <span class="t"><b>${esc(it.site)}</b>${it.mix ? ` <span class="mx">${esc(it.mix)}</span>` : ''}${badges(it)}
      <small>${esc(fut.map(a=>a.d+'日 '+md(addDays(sd, a.d))).join('・') || 'この先の 試験は ありません')}</small></span></label>`;
  });
  return h;
}
const bPick=()=>[...bt.sel].map(itOf).filter(it=>it && futOf(it).length);
function bCntHtml(){ const L=bPick(); return '送る もの（'+L.length+'件・試験 '+L.reduce((s,it)=>s+futOf(it).length, 0)+'つ）'; }
function bActsHtml(){
  const n=bPick().length, D=dOf(bt.dst), sh=window.HyoIcs ? HyoIcs.canShare() : false;
  return bt.dst==='file'
    ? `${sh ? `<button type="button" class="kyo-b" onclick="KYOSHI.bGo('share')">📤 送る（メール・LINE など）</button>` : ''}<button type="button" class="kyo-b pri" onclick="KYOSHI.bGo('dl')">📥 ファイルを 保存（${n}件）</button>`
    : `<button type="button" class="kyo-b pri" onclick="KYOSHI.bGo()">☁ ${esc(D ? D.name : '')} に 送る（${n}件）</button>`;
}
function batchHtml(){
  const opts=st.dests.filter(dReady).map(x=>[x.id, '☁ '+x.name, 'Google カレンダー'+(x.calName||x.cal ? '「'+(x.calName||x.cal)+'」' : '')+(x.auto ? '・入れたら すぐ' : '・まとめて')])
    .concat([['file', '📱 この スマホの カレンダー・Outlook など', 'カレンダーの ファイル（.ics）。開く とき に 入れる カレンダー（アカウント）を えらぶ']]);
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">📅</span><b>まとめて カレンダーに 送る</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <h5>送り先</h5>
    <div class="kyo-dsts" role="radiogroup" aria-label="送り先">${opts.map(([id,t,s])=>`<button type="button" role="radio" aria-checked="${bt.dst===id}" class="${bt.dst===id ? 'on' : ''}" onclick="KYOSHI.bDst('${id}')"><b>${esc(t)}</b><small>${esc(s)}</small></button>`).join('')}</div>
    ${gOn() ? '' : '<p class="kyo-note">☁ Google カレンダーに 送るには、一覧の 上の「☁ 入れるだけで Google カレンダーに」で 送り先を 作ります（アカウントごとに いくつでも）。</p>'}
    <h5 id="kyoBCnt">${bCntHtml()}</h5>
    <div class="kyo-chips kyo-bsel">${[['pend','まだの もの'],['today','きょう 採った'],['all','ぜんぶ'],['none','はずす']].map(([k,t])=>`<button type="button" onclick="KYOSHI.bAll('${k}')">${t}</button>`).join('')}</div>
    <div class="kyo-blist" id="kyoBList">${batchListHtml()}</div>
    <p class="kyo-note">送るのは この先（きょう から）の 試験だけです。☁✓・📱✓ は もう 入れた もの。</p>
    <div class="kyo-acts end" id="kyoBActs">${bActsHtml()}</div>
    ${bt.dst==='file' ? `<p class="kyo-note">iPhone：保存した ファイルを 開いて「すべてを追加」→ 入れる カレンダー（iCloud・Google・Outlook など の アカウント）を えらぶ。Android：Samsung カレンダー など で 開く。パソコンの Outlook・Google カレンダー は ファイルを 読み込む（インポート）。Google に 自動で 入れて いる カレンダーに 入れると 2つに なります。</p>` : ''}`;
}
function bDst(d){ if(!bt || !(d==='file' || dReady(dOf(d)))) return; bt.dst=d; pm=null; if(!bt.keep) bt.sel=new Set(st.items.filter(it=>pendFor(it, d)).map(it=>it.id)); rePop(batchHtml()); }
// 1つ えらぶ・外す（一覧は 書き直さない＝見て いる ところが 動かない）
function bSel(id, on){ if(!bt || !itOf(id)) return; if(on) bt.sel.add(id); else bt.sel.delete(id); const c=$('kyoBCnt'), a=$('kyoBActs'); if(c) c.textContent=bCntHtml(); if(a) a.innerHTML=bActsHtml(); }
function bAll(k){
  if(!bt) return; const T=ymd(today()), L=batchItems();
  bt.sel=new Set(k==='none' ? [] : L.filter(it=>k==='all' ? futOf(it).length : k==='today' ? it.date===T : pendFor(it, bt.dst)).map(it=>it.id));
  rePop(batchHtml());
}
async function bGo(how){
  if(!bt) return false;
  const L=bPick();
  if(!L.length){ toastS('送る ものを えらんで ください（この先の 試験が ある もの）'); return false; }
  if(bt.dst==='file'){
    if(!window.HyoIcs){ withIcs(()=>bGo(how)); return false; }
    const E=[]; L.forEach(it=>icsOfIt(it, true).forEach(e=>E.push(e))); E.sort((a,b)=>a.date.localeCompare(b.date));
    const r=await HyoIcs.save(HyoIcs.build(E, {name:'供試体'}), 'kyoshi-'+ymd(today()).replace(/-/g,'')+'.ics', how==='share' ? 'share' : 'dl', '🧱 供試体の 試験');
    if(r==='cancel') return false;
    const now=Date.now(); L.forEach(it=>{ it.fx=Math.max(now, it.mt); }); save(); popClose(); render();
    toastS((r==='share' ? '📤 送りました' : '📥 保存しました')+'（'+L.length+'件・試験 '+E.length+'つ）'+(r==='share' ? '' : '。ファイルを 開くと カレンダーに 入ります'), 4200);
    return true;
  }
  const D=dOf(bt.dst); if(!dReady(D)) return false;
  const only=new Set(L.map(it=>it.id)); popClose(); render();
  const r=await sync('batch', {dst:D.id, only});
  return !r.err && !r.bad;
}

/* ───────── ☁ 送り先の 窓 ───────── */
let gMsg='';
function dStText(D){
  if(!D.url) return '○ まだ 設定して いません。下の ①〜⑤ を 1回だけ します。';
  if(D.err) return '⚠ '+D.err;
  return '✅ つながって います'+(D.calName ? '（カレンダー「'+D.calName+'」）' : '')+(D.last ? '。最後に 送った '+lastText(D.last) : '')+'・'+(D.auto ? '入れたら すぐ' : 'まとめて 送る とき');
}
function reGst(){ const s=pop && pop.el.querySelector('#kyoGSt'); if(!s || pop.kind!=='gd') return; const D=dOf(pop.id); if(D) s.textContent=gMsg || dStText(D); }
function gListHtml(){
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">☁</span><b>Google カレンダーに 送る</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <h5>送り先（Google の アカウントごと）</h5>
    <div class="kyo-dlist">${st.dests.map(D=>`<button type="button" class="kyo-dcard" onclick="KYOSHI.gedit('${D.id}')"><b>☁ ${esc(D.name)}</b><small>${esc(D.url ? dStText(D) : '○ まだ 設定して いません（押すと 手順）')}</small><i aria-hidden="true">直す ›</i></button>`).join('')}</div>
    ${st.dests.length<MAX_DST ? `<button type="button" class="kyo-b" onclick="KYOSHI.gadd()">＋ 送り先を 足す（ほかの アカウント・カレンダー）</button>` : ''}
    <p class="kyo-note">Google の アカウントごとに 送り先を 作ります（会社の アカウント・自分の アカウント など。${MAX_DST}つまで）。1つの 送り先でも、「入れる カレンダー」に メールアドレスを 入れると、共有された ほかの アカウントの カレンダーに 入れられます。</p>
    <h5>知らせ（試験の 前の日）</h5>
    <div class="kyo-chips">${ALARMS.map(([k,t])=>`<button type="button" class="${st.alarm===k?'on':''}" aria-pressed="${st.alarm===k}" onclick="KYOSHI.gset('alarm', '${k}')">${t}</button>`).join('')}</div>
    <h5>🗓 1件ずつ Google カレンダーで 開く ときの アカウント</h5>
    <label class="kyo-f"><span>メール</span><input id="kyoAuth" type="email" maxlength="100" value="${esc(st.auth)}" placeholder="空なら いま ログイン して いる アカウント" autocomplete="off" spellcheck="false" onchange="KYOSHI.gset('auth', this.value)" aria-label="Google アカウントの メールアドレス"></label>
    <p class="kyo-note">送るのは 試験の 予定（日付・現場・配合・本数・メモ）だけで、送り先は 自分で 作った Apps Script だけです。ほかの ところには 送りません。Google カレンダーで 予定を 消しても、表電卓の 中身は 消えません。Google に 入れた 予定は、iPhone の カレンダーや Outlook に その Google アカウントを 足すと そちらにも 出ます。</p>`;
}
function gdHtml(D){
  const sh=typeof navigator.share==='function';
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">☁</span><b>送り先：${esc(D.name)}</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <p class="kyo-gst" id="kyoGSt" role="status">${esc(gMsg || dStText(D))}</p>
    <label class="kyo-f"><span>名前</span><input type="text" maxlength="20" value="${esc(D.name)}" placeholder="例：会社・自分" autocomplete="off" onchange="KYOSHI.dset('${D.id}', 'name', this.value)" aria-label="送り先の 名前"></label>
    <details class="kyo-steps"${D.url ? '' : ' open'}><summary>${D.url ? '設定の しかた（もう一度 見る）' : 'はじめての 設定（10分ほど・パソコンが かんたん）'}</summary>
      <ol>
        <li>入れたい Google アカウントで 使う <b>コードを コピー</b>します（この 送り先の 合言葉 入り）。
          <div class="kyo-acts"><button type="button" class="kyo-b pri" onclick="KYOSHI.gcopy('${D.id}')">📋 コードを コピー</button>${sh ? `<button type="button" class="kyo-b" onclick="KYOSHI.gshare('${D.id}')">📤 送る</button>` : ''}</div>
          <small>${sh ? 'スマホで 見て いる ときは「📤 送る」で パソコンに 送ると かんたんです。' : 'パソコンで 設定する ときは、パソコンでも 表電卓を 開いて コピーすると かんたんです。'}</small></li>
        <li>その アカウントに ログインした ブラウザで <a href="https://script.new" target="_blank" rel="noopener">script.new</a> を 開き、中の 字を ぜんぶ 消して、コピーした コードを 貼って 💾 保存。</li>
        <li>右上の <b>「デプロイ」→「新しいデプロイ」</b>、左の ⚙ で <b>「ウェブアプリ」</b>。<br>次のユーザーとして実行：<b>自分</b>／アクセスできるユーザー：<b>全員</b> →「デプロイ」。</li>
        <li><b>「アクセスを承認」</b> → その アカウント。「このアプリは Google で確認されていません」と 出たら <b>「詳細」→「（名前）に移動」→「許可」</b>（自分で 作った コードなので 大丈夫です）。</li>
        <li>出てきた <b>ウェブアプリ の URL</b>（…/exec で 終わる）を コピーして 下に 貼り、「🧪 ためしに 送る」。</li>
      </ol>
    </details>
    <label class="kyo-f"><span>URL</span><input id="kyoGUrl" type="url" value="${esc(D.url)}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false" onchange="KYOSHI.gurl('${D.id}', this.value)" aria-label="ウェブアプリ の URL"></label>
    <div class="kyo-acts"><button type="button" class="kyo-b pri" onclick="KYOSHI.gtest('${D.id}')">🧪 ためしに 送る</button>${dReady(D) ? (D.auto ? `<button type="button" class="kyo-b" onclick="KYOSHI.sync()">☁ 今 送る</button>` : `<button type="button" class="kyo-b" onclick="KYOSHI.batch({dst:'${D.id}'})">📅 まとめて 送る</button>`) : ''}</div>
    <h5>送り方</h5>
    <div class="kyo-chips">${[[true,'入れたら すぐ'],[false,'まとめて 送る とき だけ']].map(([v,t])=>`<button type="button" class="${D.auto===v?'on':''}" aria-pressed="${D.auto===v}" onclick="KYOSHI.dset('${D.id}', 'auto', ${v})">${t}</button>`).join('')}</div>
    <h5>入れる カレンダー</h5>
    <label class="kyo-f"><span>カレンダー</span><input type="text" maxlength="100" value="${esc(D.cal)}" placeholder="空なら いつもの カレンダー" autocomplete="off" spellcheck="false" onchange="KYOSHI.dset('${D.id}', 'cal', this.value)" aria-label="入れる カレンダー"></label>
    <p class="kyo-note">空なら この アカウントの いつもの カレンダー。名前（例：供試体）なら その カレンダー（なければ 作る）。メールアドレス（カレンダー ID）なら その カレンダー＝ほかの アカウントの カレンダーでも、共有で「予定の変更」を 許されて いて、この アカウントの Google カレンダーに 追加して あれば 入れられます。</p>
    <h5>合言葉</h5>
    <label class="kyo-f"><span>合言葉</span><input type="text" maxlength="40" value="${esc(D.tok)}" autocomplete="off" spellcheck="false" onchange="KYOSHI.dset('${D.id}', 'tok', this.value)" aria-label="合言葉"></label>
    <p class="kyo-note">コードの 中の AIKOTOBA と 同じ ときだけ 受けつけます。ほかの スマホでは「📋 ほかの スマホ 用に コピー」を その スマホの 送り先の URL の 欄に 貼ると、URL と 合言葉が いっしょに 入ります。</p>
    <div class="kyo-acts">${D.url ? `<button type="button" class="kyo-b" onclick="KYOSHI.gcopyCfg('${D.id}')">📋 ほかの スマホ 用に コピー</button>` : ''}<button type="button" class="kyo-b warn" onclick="KYOSHI.gdel('${D.id}')">🗑 この 送り先を 消す</button></div>
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.gopen()">← 送り先の 一覧・知らせ</button></div>`;
}
function gopen(){ gMsg=''; if(!st.dests.length){ gadd(); return; } popOpen(gListHtml(), 'g'); }
function gedit(id){ const D=dOf(id); if(!D) return; gMsg=''; popOpen(gdHtml(D), 'gd', id); }
function reG(){ if(!pop) return; if(pop.kind==='g') rePop(gListHtml()); else if(pop.kind==='gd'){ const D=dOf(pop.id); if(D) rePop(gdHtml(D)); } }

/* ───────── 窓 ───────── */
const CSS=`
#kyoshiOverlay .kyo-modal{ display:flex; flex-direction:column; }
.kyo-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.kyo-wrap{ max-width:760px; margin:0 auto; padding-bottom:70px; }
.kyo-top{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 8px; } .kyo-top .kyo-b{ flex:1 1 auto; }
.kyo-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.kyo-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .kyo-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.kyo-b.sm{ min-height:38px; padding:0 10px; font-size:14px; } .kyo-moreb{ display:block; width:100%; margin:6px 0 0; }
.kyo-cnt{ display:inline-block; min-width:1.5em; margin-left:6px; padding:1px 6px; border-radius:10px; background:#e53935; color:#fff; font-size:12.5px; line-height:1.5; }
.kyo-gbar{ display:flex; align-items:center; gap:8px; width:100%; box-sizing:border-box; margin:0 0 8px; padding:8px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.07); color:var(--text,#222); text-align:left; font:inherit; cursor:pointer; }
.kyo-gbar > span{ flex:1; min-width:0; } .kyo-gbar b{ display:block; font-size:14.5px; } .kyo-gbar small{ display:block; font-size:12.5px; color:var(--text-light,#666); line-height:1.45; overflow-wrap:anywhere; }
.kyo-gbar.ok{ border-color:rgba(46,125,50,.45); background:rgba(46,157,74,.08); } .kyo-gbar.ok b{ color:#2e7d32; }
.kyo-gbar.wait, .kyo-gbar.run, .kyo-gbar.later{ border-color:rgba(240,164,0,.55); background:rgba(240,164,0,.09); cursor:default; } .kyo-gbar.wait b, .kyo-gbar.later b{ color:#b26a00; }
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
.kyo-g{ font-style:normal; font-size:11.5px; margin-left:5px; white-space:nowrap; } .kyo-g.ok{ color:#2e7d32; } .kyo-g.wait, .kyo-g.later{ color:#b26a00; } .kyo-g.err{ color:#e53935; }
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
.kyo-sess{ display:flex; flex-direction:column; gap:2px; margin:0 0 8px; padding:8px 12px; border-radius:12px; border:1px solid rgba(46,125,50,.4); background:rgba(46,157,74,.08); font-size:13.5px; }
.kyo-sess b{ color:#2e7d32; } .kyo-sess span{ overflow-wrap:anywhere; } .kyo-sess small{ margin-left:6px; font-size:12px; color:var(--text-light,#666); }
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
.kyo-dsts{ display:flex; flex-direction:column; gap:6px; } .kyo-dsts button{ display:flex; flex-direction:column; align-items:flex-start; gap:1px; width:100%; min-height:48px; padding:7px 12px; border-radius:12px; border:2px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#222); text-align:left; font:inherit; cursor:pointer; }
.kyo-dsts button b{ font-size:14.5px; } .kyo-dsts button small{ font-size:12px; color:var(--text-light,#666); } .kyo-dsts button.on{ border-color:var(--acc); background:rgba(120,132,156,.1); } .kyo-dsts button.on b::before{ content:'● '; color:var(--acc); }
.kyo-bsel{ margin:0 0 4px; } .kyo-bsel button{ min-height:36px; font-size:13.5px; }
.kyo-blist{ max-height:46vh; overflow:auto; border:1px solid rgba(120,132,156,.25); border-radius:12px; padding:0 8px 6px; } .kyo-blist .kyo-h{ margin:10px 0 4px; font-size:13.5px; }
.kyo-bi{ display:flex; align-items:flex-start; gap:8px; padding:6px 4px; border-bottom:1px solid rgba(120,132,156,.15); cursor:pointer; } .kyo-bi:last-child{ border-bottom:0; }
.kyo-bi input{ width:22px; height:22px; flex:none; margin-top:2px; } .kyo-bi .t{ flex:1; min-width:0; display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 6px; font-size:14.5px; } .kyo-bi .t small{ width:100%; font-size:12.5px; color:var(--text-light,#666); }
.kyo-bi.in .t > b{ color:var(--text-light,#555); } .kyo-bd{ font-style:normal; font-size:11.5px; color:#2e7d32; }
.kyo-dlist{ display:flex; flex-direction:column; gap:6px; margin:0 0 8px; } .kyo-dcard{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; position:relative; width:100%; box-sizing:border-box; padding:8px 70px 8px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.06); color:var(--text,#222); text-align:left; font:inherit; cursor:pointer; }
.kyo-dcard b{ font-size:15px; } .kyo-dcard small{ font-size:12.5px; color:var(--text-light,#666); line-height:1.45; overflow-wrap:anywhere; } .kyo-dcard i{ position:absolute; right:12px; top:50%; transform:translateY(-50%); font-style:normal; font-size:13px; color:var(--acc); font-weight:bold; }
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
function cleanup(){ popClose(); dr=null; sess=[]; bt=null; clearTimeout(undoT); clearTimeout(retryT); undo=null; const u=$('kyoUndo'); if(u) u.classList.remove('on'); }
// pre：{site, date}（📝 試験報告書 から 来た とき。入れる 窓を 出す）
function openKyoshi(pre){
  ensureDom(); if(!st || !busyN) load(); lq=''; listMax=LIST_STEP;
  openDlg('kyoshiOverlay', cleanup); render();
  if(!window.HyoIcs && typeof loadSidePart==='function') loadSidePart(['hyoics.js']);   // 📅 カレンダーの 部品を 先に 読んでおく
  kick(600);
  if(pre && typeof pre==='object' && !(pre instanceof Event) && (pre.site || pre.date)) openAdd(pre);
}
function closeKyoshi(){ if(!$('kyoshiOverlay') || !isDlgOpen('kyoshiOverlay')) return; closeDlg('kyoshiOverlay', cleanup); }

window.KYOSHI={ add:pre=>openAdd(pre), addGo:more=>addGo(!!more), drSet, drDay, drAge, drAgeCust, drN, pick, open:openItem, close:popClose, set:setF, age:toggleAge, ageCust, setN, done, undo:undoDo,
  del:id=>delItem(id), tidy:()=>tidy(), view:setView, q:setQ, more, copy, copyOne, text, table:toTable, rows:tableRows, cal:id=>openBatch({ids:[id]}), gcal1,
  batch:o=>openBatch(o), bDst, bSel, bAll, bGo:how=>bGo(how),
  gopen, gadd, gedit, gdel:id=>gdel(id), gtest:id=>gtest(id), gurl, dset, gset, gcopy, gshare, gcopyCfg, sync:why=>sync(why||'user'),
  // ためす とき 用
  today:s=>{ fixedToday=s ? String(s) : null; if(st && isOpen()) render(); }, state:()=>JSON.parse(JSON.stringify(st)), clean:cleanIt, gasCode, parseUrl,
  addItem:o=>{ if(!st) load(); const it=addItem(o||{}); if(isOpen()) render(); return it ? it.id : null; },
  plan:id=>{ if(!st) load(); const L=id ? [dOf(id)].filter(Boolean) : autoDs(); return [].concat(...L.map(D=>plan(D).map(p=>Object.assign({t:p.t, dst:D.id}, p.op)))); },
  tests:()=>tests().map(x=>({id:x.it.id, site:x.it.site, d:x.a.d, date:ymd(x.td), dd:x.dd, done:x.a.done})),
  ev:(id,d)=>{ const it=itOf(id), a=ageOf(it, d); return a ? evOf(it, a) : null; }, ics:id=>{ const it=itOf(id); return it ? icsOfIt(it) : []; }, gurlOf:(id,d)=>{ const it=itOf(id), a=ageOf(it, d); return a ? gcalUrl(it, a) : ''; },
  gstate:(id,d,dst)=>{ const it=itOf(id), a=ageOf(it, d), D=dst ? dOf(dst) : st.dests.find(dReady); return a && D ? gState(it, a, D) : null; },
  notIn:()=>st.items.filter(notIn).map(it=>it.id), busy:()=>busyN>0 };
Object.assign(window, { openKyoshi, closeKyoshi });
})();
