/* 🧱 供試体（v611〜v615。v615 から メイン画面は「供試体 破壊予定ボード」の 形（ボード・カレンダー・試験一覧・破壊一覧・Excel連携）。カレンダーへ 送る 機能は 右上の 小さな 📅（まとめて 送る・⚙ 設定）に。表電卓の 道具。apps/kyoshi/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
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
   ・🗓 カレンダー（v614）：月の カレンダーに 採った日（採）と 試験の 日（赤＝過ぎた・橙＝きょう・緑＝この先・灰＝済み）。
     日を 押すと 下に その日の 採取・試験。◀ ▶・今日・左右に なぞって 月を かえる。上に 遅れ・きょう・あした・7日 以内・まだ 合計 の 数。
   ・📝 カレンダーに 入れる 書式（v614。⚙ → 📝）：予定の 名前（まだ・済み。{現場}{配合}{材齢}{本数}{打設箇所}{番号}{採った日}{試験日}）・
     採った日にも 予定を 入れる（名前）・説明に 入れる もの・色（Google）。かえると すぐ 送る 送り先の 予定も 直る。
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
const daysOf=a=>a.dd||a.d;   // 破壊までの 日数（ふつうは 材齢どおり。σ28を 27日目に、など かえた ときは dd）
const tdOf=(it, a)=>addDays(okDate(it.date), daysOf(a));

/* ───────── 決まり ───────── */
const AGE_CHOICES=[1,3,7,14,28,56,91];
const ALARMS=[['p17','前の日の 17時',420],['p9','前の日の 9時',900],['none','知らせない',null]];   // 終日の 予定の 0時から 何分 前
// 📝 カレンダーに 入れる 書式（v613）。はじめは v611・v612 と 同じ 名前・説明・色
const FMT0={title:'🧱 {材齢}日 試験：{現場} {配合} {本数}本', titleDone:'✅ {材齢}日 試験 済み：{現場} {配合} {本数}本', samp:false, sampTitle:'採 {現場} {配合}',
  desc:{sd:true, age:true, mix:true, part:true, no:true, n:true, done:true, memo:true, src:true}, color:{todo:'6', done:'8', samp:'5'}};
const TAGS=['現場','配合','材齢','本数','打設箇所','番号','採った日','試験日'];
const DESC_ITEMS=[['sd','採った日'],['age','材齢と 試験の 日'],['mix','配合'],['part','打設箇所'],['no','番号'],['n','本数'],['done','済み（いつ）'],['memo','メモ'],['src','（表電卓から）']];
const GCOLORS=[['1','ラベンダー','#7986cb'],['2','セージ','#33b679'],['3','ブドウ','#8e24aa'],['4','フラミンゴ','#e67c73'],['5','バナナ','#f6bf26'],['6','ミカン','#f4511e'],['7','ピーコック','#039be5'],
  ['8','グラファイト','#616161'],['9','ブルーベリー','#3f51b5'],['10','バジル','#0b8043'],['11','トマト','#d50000'],['','つけない（カレンダーの 色）','']];   // Google カレンダーの 予定の 色
function cleanFmt(o){
  o=(o && typeof o==='object') ? o : {};
  const t=(v,d)=>oneLine(v,80)||d, desc={}, color={};
  DESC_ITEMS.forEach(([k])=>{ desc[k]=!(o.desc && typeof o.desc==='object' && o.desc[k]===false); });
  ['todo','done','samp'].forEach(k=>{ const v=o.color && typeof o.color==='object' && o.color[k]!=null ? String(o.color[k]) : FMT0.color[k]; color[k]=GCOLORS.some(c=>c[0]===v) ? v : FMT0.color[k]; });
  return {title:t(o.title, FMT0.title), titleDone:t(o.titleDone, FMT0.titleDone), samp:o.samp===true, sampTitle:t(o.sampTitle, FMT0.sampTitle), desc, color};
}

/* ───────── 状態 ───────── */
let st=null;
function cleanRec(x){   // 送り先に 送った 予定の 控え
  if(!x || typeof x!=='object') return null;
  const g={id:oneLine(x.id,200), sd:okDate(x.sd) ? x.sd : '', h:oneLine(x.h,20), c:oneLine(x.c,100), e:oneLine(x.e,120)};
  return g.id || g.e ? g : null;
}
function cleanRecs(x){   // 送り先ごとの 控え（{送り先の id: 控え}）
  const g={};
  if(x && typeof x==='object'){
    if('id' in x || 'h' in x){ const r=cleanRec(x); if(r) g.g1=r; }   // v611 の 形（送り先 1つ）
    else Object.keys(x).forEach(k=>{ if(okDid(k) && Object.keys(g).length<MAX_DST){ const r=cleanRec(x[k]); if(r) g[k]=r; } });
  }
  return g;
}
function cleanAge(x){
  if(!x || typeof x!=='object') return null;
  const d=Number(x.d); if(!(Number.isInteger(d) && d>=1 && d<=365)) return null;   // 0日・366日 より 先は 入れない
  const dd=intIn(x.dd,0,400,0);
  return {d, dd:dd===d ? 0 : dd, n:intIn(x.n,1,30,3), done:okDate(x.done) ? x.done : '', g:cleanRecs(x.g)};
}
function cleanIt(x){
  if(!x || typeof x!=='object') return null;
  const date=okDate(x.date) ? x.date : '', site=oneLine(x.site,40);
  if(!date || !site) return null;
  const seen=new Set(), ages=(Array.isArray(x.ages) ? x.ages : []).map(cleanAge).filter(a=>a && !seen.has(a.d) && seen.add(a.d)).sort((a,b)=>a.d-b.d).slice(0,12);
  if(!ages.length) return null;
  const num=v=>{ const n=Number(v); return isFinite(n) && n>0 ? n : 0; }, at=num(x.at)||Date.now();
  return {id:okId(x.id) ? x.id : rid(), date, site, mix:oneLine(x.mix,30), part:oneLine(x.part,30), no:oneLine(x.no,30), memo:multi(x.memo,200), ages, at, mt:num(x.mt)||at, fx:num(x.fx), sg:cleanRecs(x.sg)};   // sg：採った日の 予定（v613）の 控え
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
  items.forEach(it=>[it.sg].concat(it.ages.map(a=>a.g)).forEach(g=>Object.keys(g).forEach(k=>{ if(!ids.has(k)) delete g[k]; })));   // ない 送り先の 控えは 消す
  const dq=(Array.isArray(o.dq) ? o.dq : []).map(d=>{
    if(!d || !okKey(d.k)) return null;
    const dst=okDid(d.dst) ? d.dst : 'g1';
    return ids.has(dst) ? {dst, k:d.k, id:oneLine(d.id,200), sd:okDate(d.sd) ? d.sd : '', c:oneLine(d.c,100), e:oneLine(d.e,120)} : null;
  }).filter(Boolean).slice(-MAX_DQ);
  const def=(o.def && typeof o.def==='object') ? o.def : {};
  const dAges=[...new Set((Array.isArray(def.ages) ? def.ages : [7,28]).map(v=>intIn(v,1,365,0)).filter(Boolean))].sort((a,b)=>a-b).slice(0,12);
  const al=[o.alarm, o.g && o.g.alarm].find(v=>ALARMS.some(a=>a[0]===v))||'p17';
  st={items, dq, dests, alarm:al, auth:okMail(o.auth) ? o.auth : '', view:['board','cal','tests','list'].includes(o.view) ? o.view : o.view==='plan' ? 'board' : 'board', fmt:cleanFmt(o.fmt),
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
// 採った日の 予定（v613）は 仮の 材齢 {d:0, samp:true}（控えは it.sg）。同じ 供試体には いつも 同じ もの（送る ものの 覚えで 見分ける）
const sampC=new WeakMap();
function sampOf(it){ let s=sampC.get(it); if(!s || s.g!==it.sg){ s={d:0, n:0, done:'', g:it.sg, samp:true}; sampC.set(it, s); } return s; }
const keyOf=(it, a)=>it.id+'-'+(a.samp ? 's' : a.d);   // 予定の 印（Google の タグ hyo・.ics の UID）
const evsOf=it=>st.fmt.samp ? it.ages.concat([sampOf(it)]) : it.ages;   // カレンダーに 入れる 予定（試験＋採った日）

/* ───────── 試験の 一覧 ───────── */
function tests(){
  const T=today(), L=[];
  st.items.forEach(it=>{ const sd=okDate(it.date); it.ages.forEach(a=>{ const td=addDays(sd, daysOf(a)); L.push({it, a, sd, td, dd:diff(td, T)}); }); });
  L.sort((x,y)=>x.dd-y.dd || x.it.site.localeCompare(y.it.site,'ja') || x.a.d-y.a.d);
  return L;
}
const stOf=x=>x.a.done ? 'dn' : x.dd<0 ? 'late' : x.dd===0 ? 'today' : '';
const futOf=it=>{ const T=ymd(today()); return it.ages.filter(a=>ymd(tdOf(it, a))>=T); };   // この先（きょう から）の 試験

/* ───────── 予定の 中身（☁ Google・📱 .ics で 同じ） ───────── */
// 書式の {現場} などを その 供試体の 字に（空なら 消す）。採った日の 予定では 材齢・本数・試験日は ぜんぶを 並べる
function fill(tpl, it, a){
  const sd=okDate(it.date), md2=d=>(d.getMonth()+1)+'/'+d.getDate(), s=!!a.samp;
  const v={現場:it.site, 配合:it.mix, 打設箇所:it.part, 番号:it.no, 採った日:md2(sd),
    材齢:s ? it.ages.map(x=>x.d).join('・') : String(a.d), 本数:s ? String(it.ages.reduce((n,x)=>n+x.n, 0)) : String(a.n),
    試験日:s ? it.ages.map(x=>md2(addDays(sd, daysOf(x)))).join('・') : md2(addDays(sd, daysOf(a)))};
  const out=String(tpl||'').replace(/\{(現場|配合|材齢|本数|打設箇所|番号|採った日|試験日)\}/g, (_,k)=>v[k]||'').replace(/[ \u3000]{2,}/g,' ').replace(/[（(][ \u3000]*[)）]/g,'').trim();
  return oneLine(out, 200) || it.site;
}
function evOf(it, a){
  const f=st.fmt, D=f.desc, s=!!a.samp, sd=okDate(it.date), td=addDays(sd, s ? 0 : daysOf(a)), dn=s ? null : okDate(a.done);
  const title=fill(s ? f.sampTitle : a.done ? f.titleDone : f.title, it, a);
  const lines=s ? [D.sd ? '採った日：'+ymdJa(sd) : '', D.age ? '試験の 日：'+it.ages.map(x=>x.d+'日 → '+ymdJa(addDays(sd, daysOf(x)))).join('・') : '',
      D.mix && it.mix ? '配合：'+it.mix : '', D.part && it.part ? '打設箇所：'+it.part : '', D.no && it.no ? '番号：'+it.no : '',
      D.n ? '本数：'+it.ages.map(x=>x.d+'日 '+x.n+'本').join('・') : '', D.memo && it.memo ? 'メモ：'+it.memo : '', D.src ? '（🧱 表電卓の 供試体 から）' : '']
    : [D.sd ? '採った日：'+ymdJa(sd) : '', D.age ? '材齢：'+a.d+'日'+(daysOf(a)!==a.d ? '（'+daysOf(a)+'日目に 破壊）' : '')+'（試験の 日 '+ymdJa(td)+'）' : '', D.mix && it.mix ? '配合：'+it.mix : '', D.part && it.part ? '打設箇所：'+it.part : '', D.no && it.no ? '番号：'+it.no : '',
      D.n ? '本数：'+a.n+'本' : '', D.done && dn ? '✓ 試験 済み（'+md(dn)+'）' : '', D.memo && it.memo ? 'メモ：'+it.memo : '', D.src ? '（🧱 表電卓の 供試体 から）' : ''];
  return {k:keyOf(it, a), date:ymd(td), title, desc:lines.filter(Boolean).join('\n'), color:s ? f.color.samp : a.done ? f.color.done : f.color.todo};
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
  st.items.forEach(it=>{ evsOf(it).forEach(a=>{
    const e=evOf(it, a), g=a.g[D.id], sent=!!(g && g.id), past=e.date<T;
    let id=sent ? g.id : '', sd=sent ? g.sd : '';
    if(sent && (g.c||'')!==cal){
      if(past) return;   // 過ぎた ものは もとの カレンダーに 置いて おく
      out.push({t:'mv', D, it, a, op:{op:'del', k:e.k, id:g.id, date:g.sd, sd:g.sd, cal:g.c||''}}); id=''; sd='';
    }
    else if(sent && g.h===evHash(e)) return;   // もう 入って いる
    if(!sent && past) return;
    out.push({t:'put', D, it, a, h:evHash(e), op:{op:'put', k:e.k, date:e.date, sd, id, title:e.title, desc:e.desc, alarm:al, color:e.color, cal}});
  });
    const sa=sampOf(it), sg=sa.g[D.id];   // 採った日の 予定を 止めた：この先の ものは 消す（過ぎた ものは 残す）
    if(!st.fmt.samp && sg && sg.id && (sg.sd||'9')>=T) out.push({t:'un', D, it, a:sa, op:{op:'del', k:keyOf(it, sa), id:sg.id, date:sg.sd, sd:sg.sd, cal:sg.c||''}});
  });
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
  if(p.t==='mv' || p.t==='un'){ if(ok && p.a.g[D.id] && p.a.g[D.id].id===p.op.id) delete p.a.g[D.id]; return ok; }
  const alive=st.items.includes(p.it) && (p.a.samp ? st.fmt.samp : p.it.ages.includes(p.a));
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

/* ───────── 画面（v615。「供試体 破壊予定ボード」と 同じ 形：1行＝1回の 試験） ───────── */
let base='', month='', selDay='', testF='open', testMonth='', listF='open', tq='', lq='';
const isOpen=()=>!!($('kyoshiOverlay') && typeof isDlgOpen==='function' && isDlgOpen('kyoshiOverlay'));
const notInN=()=>st.items.filter(notIn).length;
/* 日づけを 文字（YYYY-MM-DD）の まま あつかう */
const S0=()=>ymd(today());
const sAdd=(s, n)=>ymd(addDays(okDate(s), n));
const sMd=s=>{ const d=okDate(s); return d ? (d.getMonth()+1)+'/'+d.getDate() : ''; };
const sMdw=s=>{ const d=okDate(s); return d ? (d.getMonth()+1)+'/'+d.getDate()+'('+WD[d.getDay()]+')' : ''; };
const sDow=s=>okDate(s).getDay();
const ageCls=a=>a===7 ? 'a7' : a===28 ? 'a28' : a<7 ? 'a3' : '';
const sig=a=>'σ'+a;
/* 1行＝1回の 試験（供試体 1つ × 材齢 1つ） */
function mkRow(it, a){ const dys=daysOf(a); return {id:it.id+'-'+a.d, it, a, sampled:it.date, name:it.site, age:a.d, days:dys, shifted:dys!==a.d, note:it.memo, done:!!a.done, b:sAdd(it.date, dys)}; }
function rows(){ const L=[]; st.items.forEach(it=>it.ages.forEach(a=>L.push(mkRow(it, a)))); return L; }
function rowOf(id){ const m=/^([a-z0-9]{4,12})-(\d{1,3})$/.exec(String(id)); const it=m && itOf(m[1]), a=it && ageOf(it, +m[2]); return a ? mkRow(it, a) : null; }
const isLate=r=>!r.done && r.b<S0();
const sortRows=L=>L.slice().sort((x,y)=>(x.done-y.done) || x.b.localeCompare(y.b) || x.sampled.localeCompare(y.sampled) || x.name.localeCompare(y.name,'ja'));

function statsHtml(){
  const t=S0(), t1=sAdd(t,1), R=rows(), open=R.filter(r=>!r.done);
  const late=open.filter(isLate).length, tn=R.filter(r=>r.b===t).length, tOpen=open.filter(r=>r.b===t).length, tm=R.filter(r=>r.b===t1).length;
  const wk=open.filter(r=>r.b>=t && r.b<=sAdd(t,6)).length;
  return `<span class="kyo-stat late"><span>遅れ</span><b>${late}</b>件</span><span class="kyo-stat today"><span>今日</span><b>${tn}</b>件${tn ? `（残り ${tOpen}）` : ''}</span><span class="kyo-stat"><span>明日</span><b>${tm}</b>件</span><span class="kyo-stat"><span>7日以内の未破壊</span><b>${wk}</b>件</span><span class="kyo-stat"><span>未破壊 合計</span><b>${open.length}</b>件</span>`;
}
// ヘッダーの 小さな 印（カレンダーに 送る 設定を した ときだけ。目立たせない）
function syncHtml(){
  const L=st.dests.filter(dReady); if(!L.length) return '';
  const n=L.reduce((s,D)=>s+plan(D).length, 0), D0=L.find(D=>D.err && plan(D).length);
  if(syncing) return '<span class="kyo-sy">☁ 送信中…</span>';
  if(D0) return `<button type="button" class="kyo-sy err" onclick="KYOSHI.gedit('${D0.id}')" title="${esc(D0.err)}">⚠ カレンダーに 送れて いません</button>`;
  const w=L.find(D=>D.auto && plan(D).length), m=L.some(D=>!D.auto && plan(D).length);
  return `<span class="kyo-sy">${w ? '☁ 送信まち '+plan(w).length+'件' : m ? '☁ 未送信 あり' : '☁ 送信ずみ'}</span>`;
}
function headHtml(){
  const d=today();
  return `<div class="kyo-head"><div class="kyo-today">今日 <b class="kyo-num">${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]})</b></div><div class="kyo-spacer"></div><span id="kyoSync">${syncHtml()}</span>
    <button type="button" class="kyo-b" onclick="KYOSHI.excel()">Excel連携</button>
    <button type="button" class="kyo-b pri" onclick="KYOSHI.add()">＋ 供試体を登録</button>
    <button type="button" class="kyo-b kyo-cal-b" onclick="KYOSHI.batch()" title="カレンダーに 送る（Google・iPhone・Outlook など）" aria-label="カレンダーに 送る">📅</button></div>`;
}
const VIEWS=[['board','ボード'],['cal','カレンダー'],['tests','試験一覧'],['list','破壊一覧']];
const viewHtml=()=>st.view==='board' ? boardHtml() : st.view==='cal' ? calHtml() : st.view==='tests' ? testsHtml() : listHtml();
function render(){
  const b=$('kyoBody'); if(!b || !st) return;
  const top=b.scrollTop;
  if(!base) base=S0(); if(!month) month=S0().slice(0,7); if(!okDate(selDay)) selDay=S0();
  b.innerHTML=`<div class="kyo-wrap">${headHtml()}<div class="kyo-stats" id="kyoStats">${statsHtml()}</div>
    <div class="kyo-toolbar"><div class="kyo-tabs" role="tablist">${VIEWS.map(([k,t])=>`<button type="button" role="tab" aria-selected="${st.view===k}" class="${st.view===k ? 'on' : ''}" onclick="KYOSHI.view('${k}')">${t}</button>`).join('')}</div><div id="kyoNav">${navHtml()}</div></div>
    <div id="kyoView">${viewHtml()}</div>${legendHtml()}</div>`;
  b.scrollTop=top; bindCal();
}
// ☁ の ようすが かわった ときに（打って いる 字を 消さない ように、入れる 欄の ない ところだけ 書き直す）
function refresh(){
  if(!isOpen() || !st) return;
  pm=null;
  const sy=$('kyoSync'); if(sy) sy.innerHTML=syncHtml();
  const ss=$('kyoStats'); if(ss) ss.innerHTML=statsHtml();
  const ae=document.activeElement, v=$('kyoView');
  if(v && !(ae && v.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName))) reView();
  if(pop && pop.kind==='detail') reItem();
  if(pop && pop.kind==='gd') reGst();
  if(pop && pop.kind==='batch'){ const bl=pop.el.querySelector('#kyoBList'); if(bl) bl.innerHTML=batchListHtml(); }
}
const lastText=s=>{ const d=new Date(s); if(isNaN(d.getTime())) return ''; return (diff(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today())===0 ? 'きょう ' : md(d)+' ')+pad2(d.getHours())+':'+pad2(d.getMinutes()); };
const calTxt=D=>'カレンダー「'+(D.calName||D.cal||'いつもの カレンダー')+'」';
function legendHtml(){
  return `<div class="kyo-legend"><span><i style="background:var(--k-d3)"></i>σ3・σ4など</span><span><i style="background:var(--k-d7)"></i>σ7</span><span><i style="background:var(--k-d28)"></i>σ28</span><span><i class="s"></i>採＝採取日（カレンダー）</span><span><i style="background:var(--k-late)"></i>遅れ（予定日を過ぎて未破壊）</span><span><i style="background:var(--k-done)"></i>破壊済</span><span>カードの ◯ を タップで 破壊済に できます</span></div>`;
}
function navHtml(){
  if(st.view==='list' || st.view==='tests') return '';
  const lbl=st.view==='board' ? sMdw(base)+' 〜 '+sMdw(sAdd(base,6)) : month.slice(0,4)+'年'+(+month.slice(5))+'月';
  return `<div class="kyo-nav"><button type="button" class="kyo-b" onclick="KYOSHI.nav(-1)" aria-label="前へ">◀</button><span class="lbl kyo-num">${lbl}</span><button type="button" class="kyo-b" onclick="KYOSHI.nav(1)" aria-label="次へ">▶</button><button type="button" class="kyo-b" onclick="KYOSHI.navToday()">今日</button></div>`;
}
function reView(){ const v=$('kyoView'); if(!v || !st) return; v.innerHTML=viewHtml(); const n=$('kyoNav'); if(n) n.innerHTML=navHtml(); bindCal(); }
function reAll(){ render(); }

/* カード */
function cardHtml(r, showDate){
  const late=isLate(r), cls=ageCls(r.age);
  return `<div class="kyo-card ${cls} ${late ? 'late' : ''} ${r.done ? 'done' : ''}" data-id="${r.id}" role="button" tabindex="0" onclick="KYOSHI.detail('${r.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();KYOSHI.detail('${r.id}')}">
    <span class="nm">${esc(r.name)}${r.it.mix ? ` <span class="mx">${esc(r.it.mix)}</span>` : ''}</span>
    <button type="button" class="chk" onclick="event.stopPropagation();KYOSHI.chk('${r.id}')" title="${r.done ? '未破壊に戻す' : '破壊済にする'}" aria-label="${esc(r.name)}の ${sig(r.age)}を ${r.done ? '未破壊に戻す' : '破壊済にする'}">✓</button>
    <span class="meta"><span class="age ${cls}">${sig(r.age)}</span>${r.shifted ? `<span class="shift">${r.days}日目</span>` : ''}<span>採取 <span class="kyo-num">${sMd(r.sampled)}</span></span>${showDate ? `<span>予定 <span class="kyo-num">${sMdw(r.b)}</span></span>` : ''}</span>
    ${r.note ? `<span class="memo">📝 ${esc(r.note)}</span>` : ''}</div>`;
}
/* ボード（遅れ ＋ 7日分の レーン） */
function boardHtml(){
  const t=S0(), R=rows(), late=sortRows(R.filter(isLate)), L=[];
  L.push(`<div class="kyo-lane is-late${late.length ? '' : ' blank'}"><div class="kyo-lh"><span class="d">⚠ 遅れ</span><span class="c">${late.length}件</span></div><div class="kyo-cards">${late.map(r=>cardHtml(r, true)).join('') || '<div class="kyo-empty">遅れなし</div>'}</div></div>`);
  for(let i=0;i<7;i++){
    const d=sAdd(base, i), list=sortRows(R.filter(r=>r.b===d)), w=sDow(d), lbl=d===t ? '今日 ' : d===sAdd(t,1) ? '明日 ' : '', hn=hol(okDate(d));
    L.push(`<div class="kyo-lane${d===t ? ' is-today' : ''}${list.length ? '' : ' blank'}"><div class="kyo-lh"><span class="d ${w===0 || hn ? 'sun' : w===6 ? 'sat' : ''}">${lbl}<span class="kyo-num">${sMdw(d)}</span>${hn ? `<small>${esc(hn)}</small>` : ''}</span><span class="c">${list.length}件</span></div><div class="kyo-cards">${list.map(r=>cardHtml(r, false)).join('') || '<div class="kyo-empty">予定なし</div>'}</div></div>`);
  }
  return `<div class="kyo-board-scroll"><div class="kyo-board">${L.join('')}</div></div>`;
}
/* 試験（1回の 採取）ごとに まとめる */
function groups(){
  return st.items.map(it=>{ const items=it.ages.map(a=>mkRow(it, a)).sort((x,y)=>x.age-y.age); return {it, sampled:it.date, name:it.site, items, done:items.every(r=>r.done), notes:it.memo}; });
}
const groupsOn=d=>groups().filter(g=>g.sampled===d).sort((a,b)=>a.name.localeCompare(b.name,'ja'));
/* カレンダー（月） */
function calHtml(){
  const [y, m]=month.split('-').map(Number), first=new Date(y, m-1, 1), start=addDays(first, -first.getDay()), t=S0(), R=rows();
  let g=[...WD].map((w,i)=>`<div class="wd ${i===0 ? 'sun' : i===6 ? 'sat' : ''}">${w}</div>`).join('');
  for(let i=0;i<42;i++){
    const d=addDays(start, i), s=ymd(d); if(i===35 && d.getMonth()!==m-1) break;
    const list=sortRows(R.filter(r=>r.b===s)), samp=groupsOn(s), w=d.getDay(), hn=hol(d);
    const pills=samp.map(x=>`<span class="kyo-pill samp" title="採取"><b>採</b>${esc(x.name)}</span>`).concat(list.map(r=>`<span class="kyo-pill ${r.done ? 'done' : ageCls(r.age)}">${esc(r.name)} ${sig(r.age)}</span>`));
    g+=`<button type="button" class="kyo-day${d.getMonth()!==m-1 ? ' out' : ''}${s===t ? ' today' : ''}${s===selDay ? ' sel' : ''}" data-day="${s}" onclick="KYOSHI.calDay('${s}')" aria-pressed="${s===selDay}" aria-label="${esc(mdw(d)+(hn ? ' '+hn : '')+(samp.length ? '・採取 '+samp.length+'件' : '')+(list.length ? '・破壊 '+list.length+'件' : ''))}"><span class="dn ${w===0 || hn ? 'sun' : w===6 ? 'sat' : ''}">${d.getDate()}</span>${pills.slice(0,5).join('')}${pills.length>5 ? `<span class="more">他${pills.length-5}件</span>` : ''}</button>`;
  }
  return `<div class="kyo-cal" id="kyoCal" data-hswipe="1">${g}</div>${selDay ? `<div class="kyo-daypanel" id="kyoDay">${dayPanelHtml(selDay)}</div>` : ''}`;
}
function dayPanelHtml(s){
  const list=sortRows(rows().filter(r=>r.b===s)), samp=groupsOn(s);
  return `<h3><span class="kyo-num">${sMdw(s)}</span></h3><h4>採取 ${samp.length}件</h4>
    <div class="kyo-samplist">${samp.map(x=>`<div class="kyo-samprow" onclick="KYOSHI.detail('${x.items[0].id}')"><span class="nm">${esc(x.name)}</span><span class="bd kyo-num">${x.items.map(r=>`${sig(r.age)} → ${sMdw(r.b)}${r.done ? ' ✓' : ''}`).join('　')}</span></div>`).join('') || '<div class="kyo-empty">採取なし</div>'}</div>
    <h4>破壊予定 ${list.length}件</h4><div class="kyo-cards kyo-grid">${list.map(r=>cardHtml(r, false)).join('') || '<div class="kyo-empty">予定なし</div>'}</div>`;
}
function bindCal(){ const c=$('kyoCal'); if(c && typeof bindHSwipe==='function') bindHSwipe(c, n=>nav(n)); }   // 左へ なぞる＝次の 月
function calDay(s){ const d=okDate(s); if(!d) return; selDay=selDay===s ? '' : s; if(selDay){ month=s.slice(0,7); } reView(); }
function nav(n){
  n=+n||0;
  if(st.view==='board') base=sAdd(base, 7*n);
  else { const [y,m]=month.split('-').map(Number), d=new Date(y, m-1+n, 1); month=ymd(d).slice(0,7); }
  reView();
}
function navToday(){ base=S0(); month=S0().slice(0,7); selDay=S0(); reView(); }
/* 試験一覧（1行＝1回の 採取） */
function cellHtml(r){
  const t=S0(), st0=r.done ? ['done','✓済'] : isLate(r) ? ['late','遅れ'] : r.b===t ? ['today','今日'] : ['wait', r.b===sAdd(t,1) ? '明日' : '待ち'];
  return `<button type="button" class="kyo-tc ${st0[0]}" onclick="KYOSHI.detail('${r.id}')">${sMdw(r.b)}${r.shifted ? `<span class="shift">${r.days}日目</span>` : ''}<span class="m">${st0[1]}</span></button>`;
}
function testsTable(){
  const all=groups(), months=[...new Set(all.map(g=>g.sampled.slice(0,7)))].sort().reverse();
  if(testMonth && !months.includes(testMonth)) testMonth='';
  const q=tq.trim().toLowerCase();
  let list=all.filter(g=>testF==='all' || (testF==='done' ? g.done : !g.done));
  if(testMonth) list=list.filter(g=>g.sampled.startsWith(testMonth));
  if(q) list=list.filter(g=>(g.name+' '+g.notes+' '+g.it.mix).toLowerCase().includes(q));
  list.sort((a,b)=>testF==='open' ? a.sampled.localeCompare(b.sampled) || a.name.localeCompare(b.name,'ja') : b.sampled.localeCompare(a.sampled) || a.name.localeCompare(b.name,'ja'));
  const cols=[...new Set([7, 28].concat(...list.map(g=>g.items.map(r=>r.age))))].sort((a,b)=>a-b);
  const head=`<tr><th class="sticky">採取日</th><th>共試体名</th>${cols.map(a=>`<th class="ac"><span class="age ${ageCls(a)}">${sig(a)}</span> 破壊日</th>`).join('')}<th>進み</th><th>打合せ・メモ</th></tr>`;
  const body=list.map((g,i)=>{
    const dn=g.items.filter(r=>r.done).length, nd=i===0 || list[i-1].sampled!==g.sampled;
    return `<tr class="${nd ? 'grp-start' : ''}"><td class="sd sticky">${nd ? sMdw(g.sampled) : ''}</td><td class="nm">${esc(g.name)}<button type="button" class="mini" onclick="KYOSHI.edit('${g.it.id}')" title="材齢の追加・変更">編集</button></td>${cols.map(a=>{ const rs=g.items.filter(r=>r.age===a); return `<td>${rs.length ? rs.map(cellHtml).join('') : '<span class="hint">—</span>'}</td>`; }).join('')}<td class="prog ${g.done ? 'all' : ''}">${g.done ? '完了' : dn+'/'+g.items.length+' 済'}</td><td class="memo">${esc(g.notes)}</td></tr>`;
  }).join('') || `<tr><td colspan="${cols.length+4}" class="kyo-empty">該当する試験はありません</td></tr>`;
  return {head, body, months};
}
function testsHtml(){
  const T=testsTable();
  return `<div class="kyo-tbar"><div class="kyo-tabs" id="kyoTf">${[['open','未完了'],['all','すべて'],['done','完了']].map(([k,t])=>`<button type="button" class="${testF===k ? 'on' : ''}" aria-selected="${testF===k}" onclick="KYOSHI.tf('${k}')">${t}</button>`).join('')}</div>
    <select id="kyoTMonth" aria-label="採取月" onchange="KYOSHI.tmonth(this.value)"><option value="">採取月：すべて</option>${T.months.map(mo=>`<option value="${mo}"${mo===testMonth ? ' selected' : ''}>${mo.slice(0,4)}年${+mo.slice(5)}月</option>`).join('')}</select>
    <input id="kyoTq" type="search" value="${esc(tq)}" placeholder="共試体名・メモで検索" aria-label="さがす" oninput="KYOSHI.tqs(this.value)"></div>
    <div class="kyo-tests-wrap"><table class="kyo-tests"><thead id="kyoThead">${T.head}</thead><tbody id="kyoTbody">${T.body}</tbody></table></div>
    <div class="hint" style="margin-top:6px">1行＝1回の採取。破壊日を押すと詳細（破壊済にする・編集）が開きます。</div>`;
}
function tf(k){ if(!['open','all','done'].includes(k)) return; testF=k; reView(); }
function tmonth(v){ testMonth=String(v||''); reView(); }
function tqs(v){ tq=String(v==null ? '' : v).slice(0,40); const T=testsTable(), h=$('kyoThead'), b=$('kyoTbody'); if(h) h.innerHTML=T.head; if(b) b.innerHTML=T.body; }
/* 破壊一覧（1行＝1回の 破壊） */
function listBody(){
  const q=lq.trim().toLowerCase(), t=S0();
  let L=rows().filter(r=>listF==='all' || (listF==='done' ? r.done : !r.done));
  if(q) L=L.filter(r=>(r.name+' '+r.note+' '+r.it.mix).toLowerCase().includes(q));
  L=L.sort((a,b)=>listF==='done' ? b.b.localeCompare(a.b) : a.b.localeCompare(b.b));
  return L.map(r=>{
    const late=isLate(r), stx=r.done ? '<span class="st done">破壊済</span>' : late ? '<span class="st late">遅れ</span>' : r.b===t ? '<span class="st today">今日</span>' : '<span class="st wait">待ち</span>';
    return `<tr class="${late ? 'late' : ''} ${r.done ? 'done' : ''}" onclick="KYOSHI.detail('${r.id}')"><td class="kyo-num">${sMdw(r.b)}</td><td>${stx}</td><td class="nm">${esc(r.name)}</td><td><span class="age ${ageCls(r.age)}">${sig(r.age)}</span></td><td class="kyo-num">${sMdw(r.sampled)}</td><td class="memo">${esc(r.note)}</td></tr>`;
  }).join('') || '<tr><td colspan="6" class="kyo-empty">該当する供試体はありません</td></tr>';
}
function listHtml(){
  return `<div class="kyo-tbar"><div class="kyo-tabs" id="kyoLf">${[['open','未破壊'],['all','すべて'],['done','破壊済']].map(([k,t])=>`<button type="button" class="${listF===k ? 'on' : ''}" aria-selected="${listF===k}" onclick="KYOSHI.lf('${k}')">${t}</button>`).join('')}</div>
    <input id="kyoLq" type="search" value="${esc(lq)}" placeholder="共試体名・メモで検索" aria-label="さがす" oninput="KYOSHI.lqs(this.value)"></div>
    <div class="kyo-tbl-wrap" style="margin-top:8px"><table><thead><tr><th>破壊日</th><th>状態</th><th>共試体名</th><th>材齢</th><th>採取日</th><th>打合せ・メモ</th></tr></thead><tbody id="kyoLbody">${listBody()}</tbody></table></div>`;
}
function lf(k){ if(!['open','all','done'].includes(k)) return; listF=k; reView(); }
function lqs(v){ lq=String(v==null ? '' : v).slice(0,40); const b=$('kyoLbody'); if(b) b.innerHTML=listBody(); }

/* ───────── 小さな窓（登録・詳細・Excel連携・まとめて 送る・☁ 送り先）───────── */
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
function onPopGone(p){ if(p.kind==='edit') ed=null; if(p.kind==='batch') bt=null; }
const popBody=()=>pop ? pop.el.querySelector('.kyo-pop') : null;
function rePop(html){ const b=popBody(); if(!b) return; const top=b.scrollTop; b.innerHTML=html; b.scrollTop=top; }

/* 詳細 */
function detailHtml(r){
  const b=r.b, d=okDate(b);
  return `<div class="kyo-ph"><b>${esc(r.name)}</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <dl class="kyo-kv"><dt>破壊日</dt><dd class="kyo-num">${sMdw(b)}${r.shifted ? ` <span class="shift">${r.days}日目に変更</span>` : ''}${isLate(r) ? ' <span class="st late">遅れ</span>' : ''}${d.getDay()===0 ? ' <span class="err">日曜</span>' : hol(d) ? ' <span class="err">'+esc(hol(d))+'</span>' : ''}</dd>
    <dt>材齢</dt><dd><span class="age ${ageCls(r.age)}">${sig(r.age)}</span></dd><dt>採取日</dt><dd class="kyo-num">${sMdw(r.sampled)}</dd>
    ${r.it.mix ? `<dt>配合</dt><dd>${esc(r.it.mix)}</dd>` : ''}${r.it.part ? `<dt>打設箇所</dt><dd>${esc(r.it.part)}</dd>` : ''}${r.it.no ? `<dt>番号</dt><dd>${esc(r.it.no)}</dd>` : ''}<dt>本数</dt><dd>${r.a.n}本</dd>
    <dt>打合せ・メモ</dt><dd>${esc(r.note) || '—'}</dd><dt>状態</dt><dd>${r.done ? '破壊済（'+esc(sMd(r.a.done))+'）' : '未破壊'}</dd></dl>
    <div class="kyo-acts"><button type="button" class="kyo-b warn" onclick="KYOSHI.delAsk('${r.id}')">削除</button><span class="kyo-sp"></span><button type="button" class="kyo-b" onclick="KYOSHI.again('${r.it.id}')">この現場で新規登録</button><button type="button" class="kyo-b" onclick="KYOSHI.edit('${r.it.id}')">編集・材齢変更</button><button type="button" class="kyo-b pri" onclick="KYOSHI.chk('${r.id}', true)">${r.done ? '未破壊に戻す' : '破壊済にする'}</button></div>
    <div class="kyo-acts" id="kyoDelAsk" hidden><span class="err kyo-sp">この供試体（${sig(r.age)}）を削除しますか？元に戻せません。</span><button type="button" class="kyo-b" onclick="KYOSHI.delNo()">やめる</button><button type="button" class="kyo-b warn" onclick="KYOSHI.delYes('${r.id}')">削除する</button></div>
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.close()">閉じる</button></div>`;
}
function detail(id){ const r=rowOf(id); if(!r) return; popOpen(detailHtml(r), 'detail', id); }
function reItem(){ if(pop && pop.kind==='detail'){ const r=rowOf(pop.id); if(r) rePop(detailHtml(r)); else popClose(); } }
function delAsk(){ const e=$('kyoDelAsk'); if(e) e.hidden=false; }
function delNo(){ const e=$('kyoDelAsk'); if(e) e.hidden=true; }
async function delYes(id){
  const r=rowOf(id); if(!r) return false;
  const it=r.it;
  if(it.ages.length>1){ goneOf(it, r.a); it.ages.splice(it.ages.indexOf(r.a),1); popClose(); changed(it); toastS('削除しました'); return true; }
  it.ages.concat([sampOf(it)]).forEach(a=>goneOf(it, a));
  const i=st.items.indexOf(it); if(i>=0) st.items.splice(i,1);
  popClose(); changed(); toastS('削除しました');
  return true;
}

/* 登録・編集 */
let ed=null;   // {id（直す とき）, date, site, mix, part, no, memo, n, ages:[], adj:{材齢:日数}, had:[], conf}
const BASE_AGES=[3,4,7,14,28,56,91];
const adjOf=a=>ed.adj[a]||a;
const edAges=()=>ed.ages.slice().sort((a,b)=>a-b);
function histOf(){
  const m=new Map();
  st.items.forEach(it=>{ const h=m.get(it.site); if(!h || it.date>h.sampled) m.set(it.site, {name:it.site, sampled:it.date, ages:new Set(it.ages.map(a=>a.d)), mix:it.mix, count:(h ? h.count : 0)+1}); else { h.count++; if(it.date===h.sampled) it.ages.forEach(a=>h.ages.add(a.d)); } });
  return [...m.values()].sort((a,b)=>b.sampled.localeCompare(a.sampled) || b.count-a.count).slice(0,12);
}
function namesList(){ const L=[...new Set(st.items.map(it=>it.site))].sort((a,b)=>a.localeCompare(b,'ja')), sk=shikenKoji(); if(sk && !L.includes(sk)) L.unshift(sk); return L; }
function shikenKoji(){ try{ const o=JSON.parse(localStorage.getItem('excalc_shiken')||'null'); return o && typeof o.koji==='string' ? oneLine(o.koji,40) : ''; }catch(_){ return ''; } }   // 📝 試験報告書の 工事名
function edAgesHtml(){
  const opts=[...new Set(BASE_AGES.concat(ed.ages))].sort((a,b)=>a-b);
  return opts.map(a=>`<button type="button" class="chip" aria-pressed="${ed.ages.includes(a)}" onclick="KYOSHI.edAge(${a})">${sig(a)}</button>`).join('')+`<span class="addage"><input id="kyoEdOther" type="number" min="1" max="365" inputmode="numeric" placeholder="日数" aria-label="ほかの材齢（日）"><button type="button" onclick="KYOSHI.edAgeCust()">＋追加</button></span>`;
}
function edPrevHtml(){
  if(!okDate(ed.date) || !ed.ages.length) return '採取日と材齢を入れると破壊日が出ます';
  const had=ed.id ? new Set(ed.had) : null, mark=a=>!had ? '' : had.has(a) ? '<span class="chg keep">そのまま</span>' : '<span class="chg add">追加</span>';
  let h=`破壊日（${ed.ages.length}件）<span class="hint">　－／＋で1日ずつ前後できます</span>`+edAges().map(a=>{
    const d=adjOf(a), b=sAdd(ed.date, d), w=sDow(b), hn=hol(okDate(b));
    return `<div class="prow"><span class="sg">${sig(a)}</span><button type="button" class="dj" onclick="KYOSHI.edAdj(${a}, -1)" aria-label="${sig(a)}を1日早める">－</button><b class="kyo-num dd">${sMdw(b)}</b><button type="button" class="dj" onclick="KYOSHI.edAdj(${a}, 1)" aria-label="${sig(a)}を1日遅らせる">＋</button>${d!==a ? `<span class="shift">${d}日目</span><button type="button" class="mini" onclick="KYOSHI.edAdj(${a}, 0)">${a}日に戻す</button>` : ''}${mark(a)}${w===0 ? ' <span class="warn">日曜です</span>' : hn ? ' <span class="warn">'+esc(hn)+'</span>' : ''}${b<S0() ? ' <span class="warn">過去日</span>' : ''}</div>`;
  }).join('');
  if(ed.id){ const it=itOf(ed.id); if(it) h+=it.ages.filter(a=>!ed.ages.includes(a.d)).map(a=>`<div class="prow"><span class="sg">${sig(a.d)}</span><span class="chg del">削除</span>${a.done ? ' <span class="warn">破壊済の記録も消えます</span>' : ''}</div>`).join(''); }
  return h;
}
function edHtml(){
  const hs=ed.id ? [] : histOf();
  return `<div class="kyo-ph"><b>${ed.id ? '試験を編集（'+sMd(ed.date)+' '+esc(ed.site)+'）' : '供試体を登録'}</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    ${hs.length ? `<div class="hist"><span class="hint">履歴から登録（タップで現場名と材齢を入れます）</span><div class="hist-list">${hs.map(h=>`<button type="button" onclick="KYOSHI.edHist(this.dataset.n)" data-n="${esc(h.name)}"><span class="hn">${esc(h.name)}</span><span class="hm">前回 ${sMd(h.sampled)}　${[...h.ages].sort((a,b)=>a-b).map(sig).join('+')}</span></button>`).join('')}</div></div>` : ''}
    <div class="field"><label for="kyoEdDate">採取日</label><input id="kyoEdDate" type="date" value="${esc(ed.date)}" oninput="KYOSHI.edSet('date', this.value)"></div>
    ${ed.id ? '' : `<div class="kyo-quick">${[[0,'きょう'],[-1,'きのう'],[-2,'おととい']].map(([n,t])=>`<button type="button" onclick="KYOSHI.edDay(${n})">${t}</button>`).join('')}</div>`}
    <div class="field"><label for="kyoEdSite">共試体名（業者・現場）</label><input id="kyoEdSite" list="kyoNames" maxlength="40" autocomplete="off" placeholder="例: アース建設" value="${esc(ed.site)}" oninput="KYOSHI.edSet('site', this.value)"><datalist id="kyoNames">${namesList().map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>
    <div class="field"><label>材齢 <span class="hint">${ed.id ? '（タップで追加・解除。外した材齢は削除されます）' : '（タップで追加・解除。選んだ数だけ登録します）'}</span></label><div class="ages" id="kyoEdAges">${edAgesHtml()}</div></div>
    <div class="field"><label for="kyoEdMemo">打合せ時間・メモ</label><input id="kyoEdMemo" maxlength="200" placeholder="例: 役所立会 10:00" value="${esc(ed.memo)}" oninput="KYOSHI.edSet('memo', this.value)"></div>
    <details class="kyo-more"${ed.mix || ed.part || ed.no ? ' open' : ''}><summary>くわしく（配合・打設箇所・番号・本数）</summary>
      <div class="field"><label for="kyoEdMix">配合</label><input id="kyoEdMix" maxlength="30" placeholder="例：24-18-20N" value="${esc(ed.mix)}" oninput="KYOSHI.edSet('mix', this.value)"></div>
      <div class="field"><label for="kyoEdPart">打設箇所</label><input id="kyoEdPart" maxlength="30" placeholder="例：2F スラブ" value="${esc(ed.part)}" oninput="KYOSHI.edSet('part', this.value)"></div>
      <div class="field"><label for="kyoEdNo">番号</label><input id="kyoEdNo" maxlength="30" placeholder="例：No.1〜6" value="${esc(ed.no)}" oninput="KYOSHI.edSet('no', this.value)"></div>
      <div class="field"><label>本数（材齢 1つごと）</label><span class="kyo-step"><button type="button" onclick="KYOSHI.edN(-1)" aria-label="1本 へらす">−</button><b id="kyoEdN">${ed.n}</b><button type="button" onclick="KYOSHI.edN(1)" aria-label="1本 ふやす">＋</button></span></div></details>
    <div class="preview" id="kyoEdPrev">${edPrevHtml()}</div><div class="err" id="kyoEdErr" hidden></div>
    <div class="kyo-acts end"><button type="button" class="kyo-b" onclick="KYOSHI.close()">キャンセル</button>${ed.id ? '' : '<button type="button" class="kyo-b" onclick="KYOSHI.edGo(true)">登録して次の現場へ</button>'}<button type="button" class="kyo-b pri" id="kyoEdSave" onclick="KYOSHI.edGo()">${ed.id ? '保存' : '登録'}</button></div>`;
}
// pre：{site, date, mix}（📝 試験報告書・この現場で新規登録）
function openEdit(id, pre){
  const it=id ? itOf(id) : null; if(id && !it) return;
  const p=(pre && typeof pre==='object' && !(pre instanceof Event)) ? pre : {};
  ed={id:it ? it.id : '', date:it ? it.date : (okDate(p.date) ? p.date : S0()), site:it ? it.site : oneLine(p.site,40), mix:it ? it.mix : oneLine(p.mix,30), part:it ? it.part : '', no:it ? it.no : '', memo:it ? it.memo : '',
    n:it ? (it.ages[0] ? it.ages[0].n : st.def.n) : st.def.n, ages:it ? it.ages.map(a=>a.d) : st.def.ages.slice(), adj:{}, had:it ? it.ages.map(a=>a.d) : [], conf:false};
  if(it) it.ages.forEach(a=>{ if(a.dd) ed.adj[a.d]=a.dd; });
  popOpen(edHtml(), 'edit');
  const n=$('kyoEdSite'); if(n && !n.value) setTimeout(()=>{ try{ n.focus(); }catch(_){} }, 60);
}
function edPrev(){ const p=$('kyoEdPrev'); if(p) p.innerHTML=edPrevHtml(); const c=$('kyoEdAges'); if(c) c.innerHTML=edAgesHtml(); ed.conf=false; const e=$('kyoEdErr'); if(e) e.hidden=true; }
function edSet(k, v){
  if(!ed) return;
  if(k==='date'){ if(okDate(v)) ed.date=v; }
  else if(k==='site') ed.site=oneLine(v,40); else if(k==='mix') ed.mix=oneLine(v,30); else if(k==='part') ed.part=oneLine(v,30); else if(k==='no') ed.no=oneLine(v,30); else if(k==='memo') ed.memo=multi(v,200);
  else return;
  if(k==='date') edPrev();
}
function edDay(n){ if(!ed) return; ed.date=ymd(addDays(today(), +n||0)); const i=$('kyoEdDate'); if(i) i.value=ed.date; edPrev(); }
function edAge(d){
  if(!ed) return; d=intIn(d,1,365,0); if(!d) return;
  const i=ed.ages.indexOf(d);
  if(i>=0) ed.ages.splice(i,1); else { if(ed.ages.length>=12){ toastS('材齢は 12まで です'); return; } ed.ages.push(d); }
  edPrev();
}
function edAgeCust(){ const i=$('kyoEdOther'), d=intIn(i ? i.value : '', 1, 365, 0); if(!d){ toastS('日数を 1〜365 で 入れて ください'); return; } if(ed && !ed.ages.includes(d)) edAge(d); else edPrev(); }
function edAdj(a, v){
  if(!ed || !ed.ages.includes(+a)) return; a=+a;
  if(!v) delete ed.adj[a];
  else { const d=adjOf(a)+(+v||0); if(d<1 || d>400) return; if(d===a) delete ed.adj[a]; else ed.adj[a]=d; }
  edPrev();
}
function edN(k){ if(!ed) return; ed.n=Math.min(30, Math.max(1, ed.n+(+k||0))); const b=$('kyoEdN'); if(b) b.textContent=ed.n; }
function edHist(name){
  if(!ed) return; const h=histOf().find(x=>x.name===name); ed.site=name; if(h && h.mix && !ed.mix) ed.mix=h.mix;
  ed.ages=[...new Set([7, 28].concat(h ? [...h.ages] : []))]; rePop(edHtml());
}
function edErr(m){ const e=$('kyoEdErr'); if(e){ e.textContent=m; e.hidden=false; } }
function addItem(o){   // 入れる（ためす ときも ここ）。o.adj：{材齢:破壊までの 日数}
  if(st.items.length>=MAX_IT){ toastS('入れられるのは '+MAX_IT+'件 までです（Excel連携の 🧹 で 古い ものを 片づけて ください）', 4600); return null; }
  const ages=[...new Set((o.ages||[]).map(v=>intIn(v,1,365,0)).filter(Boolean))].sort((a,b)=>a-b).slice(0,12), n=intIn(o.n,1,30,3), adj=o.adj||{};
  const now=Date.now(), it=cleanIt({id:rid(), date:o.date, site:o.site, mix:o.mix, part:o.part, no:o.no, memo:o.memo, ages:ages.map(d=>({d, n, dd:adj[d]||0})), at:now, mt:now});
  if(!it) return null;
  st.items.push(it); st.def.ages=ages; st.def.n=n;
  save(); return it;
}
function edGo(more){
  if(!ed) return null;
  const site=oneLine(ed.site,40), ages=edAges();
  if(!okDate(ed.date)){ edErr('採取日を入れてください'); return null; }
  if(!site){ edErr('共試体名を入れてください'); return null; }
  if(!ages.length){ edErr('材齢を選んでください'); return null; }
  if(ed.id) return applyEdit(site, ages);
  const it=addItem({date:ed.date, site, mix:ed.mix, part:ed.part, no:ed.no, memo:ed.memo, ages, n:ed.n, adj:ed.adj}); if(!it) return null;
  if(autoDs().length) kick(0);
  toastS('🧱 '+site+' を '+ages.map(sig).join('+')+' の '+ages.length+'件 登録しました', 3200);
  if(more){ ed.site=''; ed.mix=''; ed.part=''; ed.no=''; ed.memo=''; ed.adj=Object.assign({}, ed.adj); rePop(edHtml()); render(); const n=$('kyoEdSite'); if(n) try{ n.focus(); }catch(_){} return it; }
  popClose(); render();
  return it;
}
function applyEdit(site, ages){
  const it=itOf(ed.id); if(!it){ popClose(); return null; }
  const sel=new Set(ages), gone=it.ages.filter(a=>!sel.has(a.d)), added=ages.filter(d=>!ageOf(it, d));
  if(gone.some(a=>a.done) && !ed.conf){ ed.conf=true; edErr('破壊済の '+gone.filter(a=>a.done).map(a=>sig(a.d)).join('・')+' を削除します。よければもう一度［保存］を押してください'); return null; }
  gone.forEach(a=>goneOf(it, a)); it.ages=it.ages.filter(a=>sel.has(a.d));
  const n0=it.ages[0] ? it.ages[0].n : ed.n;
  added.forEach(d=>it.ages.push({d, dd:0, n:ed.n, done:'', g:{}}));
  it.ages.sort((x,y)=>x.d-y.d);
  it.ages.forEach(a=>{ const v=ed.adj[a.d]; a.dd=(v && v!==a.d) ? v : 0; if(ed.n!==n0 && !added.includes(a.d)) a.n=ed.n; });
  Object.assign(it, {date:ed.date, site, mix:ed.mix, part:ed.part, no:ed.no, memo:ed.memo});
  st.def.ages=ages.slice();
  popClose(); changed(it);
  toastS(added.length || gone.length ? site+'：'+[added.length ? added.map(sig).join('・')+'を追加' : '', gone.length ? gone.map(a=>sig(a.d)).join('・')+'を削除' : ''].filter(Boolean).join('、')+'しました' : '保存しました', 3000);
  return it;
}
function again(id){ const it=itOf(id); if(!it) return; popClose(); openEdit('', {site:it.site, mix:it.mix}); const h=histOf().find(x=>x.name===it.site); if(ed && h){ ed.ages=[...new Set([7, 28].concat([...h.ages]))]; rePop(edHtml()); } }

/* ───────── 入れる・かえる ───────── */
function changed(it){ if(it) it.mt=Date.now(); save(); render(); reItem(); kick(); }   // it：中身を 直した（📱 ファイルに した あとの 直し）
// 送った 予定を 消しに 行く（送り先 ぜんぶ）
function goneOf(it, a){ Object.keys(a.g).forEach(dst=>{ const g=a.g[dst]; if(g && g.id && dOf(dst)) st.dq.push({dst, k:keyOf(it, a), id:g.id, sd:g.sd, c:g.c||'', e:''}); }); if(st.dq.length>MAX_DQ) st.dq.splice(0, st.dq.length-MAX_DQ); }
let undo=null, undoT=0;   // {id, d, done} ✓ の あと しばらく 取り消せる
function chk(id, fromDetail){
  const r=rowOf(id); if(!r) return false;
  const a=r.a, was=!!a.done;
  undo={id:r.it.id, d:a.d, done:a.done};
  a.done=was ? '' : S0();
  if(fromDetail) popClose();
  changed(r.it); showUndo(r.it, a);
  return true;
}
function showUndo(it, a){
  const u=$('kyoUndo'); if(!u) return;
  u.innerHTML=`<span>${a.done ? esc(it.site)+'（'+sig(a.d)+'）を破壊済にしました' : '未破壊に戻しました'}</span><button type="button" onclick="KYOSHI.undo()">↶ 取り消す</button>`;
  u.classList.add('on'); clearTimeout(undoT); undoT=setTimeout(()=>{ u.classList.remove('on'); undo=null; }, 6000);
}
function undoDo(){
  if(!undo) return; const it=itOf(undo.id), a=ageOf(it, undo.d); if(a) a.done=undo.done;
  undo=null; clearTimeout(undoT); const u=$('kyoUndo'); if(u) u.classList.remove('on'); changed(it); toastS('取り消しました');
}
async function tidy(){
  const cut=addDays(today(), -90), old=st.items.filter(it=>it.ages.every(a=>tdOf(it, a)<cut));
  if(!old.length){ toastS('片づける 古い ものは ありません（試験の 日が みな 3か月 より 前の もの）', 3600); return 0; }
  if(typeof appConfirm==='function' && !(await appConfirm(old.length+'件の 古い 供試体（試験の 日が みな 3か月 より 前）を 一覧から 消しますか？\n（カレンダーの 予定は そのまま 残ります）', '片づける', 'やめる'))) return 0;
  st.items=st.items.filter(it=>!old.includes(it)); save(); render(); toastS('🧹 '+old.length+'件 片づけました');
  return old.length;
}
function setView(k){ if(!['board','cal','tests','list'].includes(k)) return; st.view=k; save(); render(); }

/* ───────── Excel連携・文字で コピー・▦ 表に 入れる ───────── */
let pending=[];
function parseDate(v){
  v=String(v).trim().replace(/\(.\)$/,'').replace(/（.）$/,'');
  let m;
  if((m=v.match(/^(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})日?$/))) return ymd(new Date(+m[1], m[2]-1, +m[3]));
  if((m=v.match(/^(\d{1,2})[\/月](\d{1,2})日?$/))){ const now=today(); let y=now.getFullYear(); if(+m[1]>now.getMonth()+3) y--; return ymd(new Date(y, m[1]-1, +m[2])); }   // 先の月なら 前年
  if(/^\d{5}$/.test(v)){ const d=new Date(1899, 11, 30); d.setDate(d.getDate()+Number(v)); return ymd(d); }
  return null;
}
function parsePaste(txt){
  pending=[]; let skipped=0, dup=0;
  const keys=new Set(rows().map(r=>r.sampled+'|'+r.name+'|'+r.age));
  String(txt||'').split(/\r?\n/).forEach(line=>{
    if(!line.trim()) return;
    const c=line.split('\t'), s=parseDate(c[0]||''), n=oneLine(c[1],40), a=parseInt(c[2],10);
    if(!s || !n || !(a>0 && a<=365)){ skipped++; return; }
    const k=s+'|'+n+'|'+a; if(keys.has(k)){ dup++; return; } keys.add(k);
    pending.push({sampled:s, name:n, age:a, note:multi(c[3]||'',200), done:c.slice(4).some(x=>x.trim()==='済')});
  });
  return {n:pending.length, dup, skipped};
}
function excelHtml(){
  return `<div class="kyo-ph"><b>Excel連携</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <div class="field"><label for="kyoPaste">取り込み：Excelの入力欄（採取日・共試体名・材齢・打合せ）の行をコピーして貼り付け</label><textarea class="paste" id="kyoPaste" rows="5" placeholder="9月3日(水)&#9;アース建設&#9;28&#9;&#10;9月10日(水)&#9;アース建設&#9;28&#9;役所立会" oninput="KYOSHI.xparse(this.value)"></textarea></div>
    <div class="preview" id="kyoXPrev">貼り付けると取り込める件数が表示されます。同じ採取日・名称・材齢の行は重複として飛ばします。</div>
    <div class="kyo-acts"><button type="button" class="kyo-b pri" id="kyoXImport" disabled onclick="KYOSHI.ximport()">取り込む</button></div>
    <hr><div class="field"><label>書き出し：未破壊の供試体を Excel の入力欄 A列 へ貼れる形でコピー</label></div>
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.xcopy(false)">未破壊分をコピー</button><button type="button" class="kyo-b" onclick="KYOSHI.xcopy(true)">全件をコピー</button><button type="button" class="kyo-b" onclick="KYOSHI.table()">▦ 表電卓の表に入れる</button></div>
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.copy()">📋 予定を文字でコピー（LINEなど）</button><button type="button" class="kyo-b" onclick="KYOSHI.tidy()">🧹 古いものを片づける</button></div>
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.close()">閉じる</button></div>`;
}
function openExcel(){ pending=[]; popOpen(excelHtml(), 'excel'); }
function xparse(v){
  const r=parsePaste(v), p=$('kyoXPrev'), b=$('kyoXImport');
  if(p) p.innerHTML=!String(v||'').trim() ? '貼り付けると取り込める件数が表示されます。同じ採取日・名称・材齢の行は重複として飛ばします。'
    : `取り込み <b class="kyo-num">${r.n}</b>件　／　重複 ${r.dup}件　／　読めない行 ${r.skipped}件`+(pending.length ? `<br>例: ${esc(pending[0].name)} 採取${sMdw(pending[0].sampled)} ${pending[0].age}日 → 破壊 ${sMdw(sAdd(pending[0].sampled, pending[0].age))}` : '');
  if(b) b.disabled=!pending.length;
  return r;
}
function ximport(){
  if(!pending.length) return 0;
  let n=0;
  pending.forEach(p=>{
    let it=st.items.find(x=>x.date===p.sampled && x.site===p.name);
    if(it){ if(it.ages.length>=12 || ageOf(it, p.age)) return; it.ages.push({d:p.age, dd:0, n:st.def.n, done:p.done ? S0() : '', g:{}}); it.ages.sort((a,b)=>a.d-b.d); it.mt=Date.now(); n++; return; }
    if(st.items.length>=MAX_IT) return;
    it=addItem({date:p.sampled, site:p.name, memo:p.note, ages:[p.age], n:st.def.n}); if(it){ if(p.done) it.ages[0].done=S0(); n++; }
  });
  pending=[]; save(); render(); kick(0);
  toastS(n+'件 取り込みました', 3000);
  const t=$('kyoPaste'); if(t) t.value=''; xparse('');
  return n;
}
async function xcopy(all){
  const L=rows().filter(r=>all || !r.done).sort((a,b)=>a.sampled.localeCompare(b.sampled)), txt=L.map(r=>[r.sampled.replace(/-/g,'/'), r.name, r.age, r.note||''].join('\t')).join('\n');
  if(typeof toolCopyText==='function') await toolCopyText(txt, L.length+'件コピーしました。Excelの入力欄A列に貼り付け');
  return txt;
}
const line=x=>x.a.d+'日：'+x.it.site+(x.it.mix ? ' '+x.it.mix : '')+' '+x.a.n+'本（採取 '+md(x.sd)+'）'+(x.a.done ? ' ✓済み' : '');
function text(){
  const T=today(), L=tests(), out=['🧱 供試体の 試験（'+mdw(T)+' 現在）'];
  const late=L.filter(x=>!x.a.done && x.dd<0 && x.dd>=-LATE_DAYS), tod=L.filter(x=>x.dd===0), later=L.filter(x=>x.dd>0);
  if(late.length){ out.push('', '⚠ 過ぎた（まだ 試験して いない）'); late.forEach(x=>out.push('・'+mdw(x.td)+' '+line(x))); }
  out.push('', 'きょう '+mdw(T)); if(tod.length) tod.forEach(x=>out.push('・'+line(x))); else out.push('・なし');
  if(later.length){ out.push('', 'この先'); later.forEach(x=>out.push('・'+mdw(x.td)+' '+line(x))); }
  return out.join('\n');
}
function copy(){ if(!st.items.length){ toastS('まだ 何も ありません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 コピーしました（LINE などに 貼れます）'); }
// 試験 1つ ＝ 1行（採った日の 順）
function tableRows(){
  const L=tests().slice().sort((x,y)=>x.it.date.localeCompare(y.it.date) || x.it.at-y.it.at || x.a.d-y.a.d);
  return [['採った日','現場','配合','打設箇所','番号','材齢（日）','試験の日','本数','試験 済み','メモ']]
    .concat(L.map(x=>[ymd(x.sd), x.it.site, x.it.mix, x.it.part, x.it.no, x.a.d, ymd(x.td), x.a.n, x.a.done, x.it.memo.replace(/\n/g,' ')]));
}
function toTable(){ if(!st.items.length){ toastS('まだ 何も ありません'); return; } if(typeof toolPasteRows==='function') toolPasteRows(tableRows(), '🧱 供試体の 試験', closeKyoshi); }

/* ───────── 📅 カレンダーの ファイル（.ics。hyoics.js） ───────── */
function icsEv(it, a){ const e=evOf(it, a), al=alarmMin(); return {uid:'kyoshi-'+e.k, title:e.title, date:e.date, allDay:true, alarm:al, desc:e.desc}; }
function icsOfIt(it, onlyNext){ const T=ymd(today()); return evsOf(it).map(a=>icsEv(it, a)).filter(e=>!onlyNext || e.date>=T); }
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
  return evsOf(it).some(a=>pmap(D).has(a)) || (!st.fmt.samp && pmap(D).has(sampOf(it)));
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
      <small>${esc(fut.map(a=>a.d+'日 '+md(addDays(sd, daysOf(a)))).join('・') || 'この先の 試験は ありません')}</small></span></label>`;
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
    ${gOn() ? '' : '<p class="kyo-note">☁ Google カレンダーに 自動で 送るには、下の「⚙ 設定」で 送り先を 作ります（アカウントごとに いくつでも）。</p>'}
    <h5 id="kyoBCnt">${bCntHtml()}</h5>
    <div class="kyo-chips kyo-bsel">${[['pend','まだの もの'],['today','きょう 採った'],['all','ぜんぶ'],['none','はずす']].map(([k,t])=>`<button type="button" onclick="KYOSHI.bAll('${k}')">${t}</button>`).join('')}</div>
    <div class="kyo-blist" id="kyoBList">${batchListHtml()}</div>
    <p class="kyo-note">送るのは この先（きょう から）の 試験${st.fmt.samp ? 'と 採った日' : ''}だけです。☁✓・📱✓ は もう 入れた もの。予定の 名前や 色は ⚙ →「📝 カレンダーに 入れる 書式」で かえられます。</p>
    <div class="kyo-acts end" id="kyoBActs">${bActsHtml()}</div>
    <div class="kyo-acts"><button type="button" class="kyo-b sm" onclick="KYOSHI.sopen()">⚙ 設定（予定の書式・送り先・知らせ）</button></div>
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
  const it=sampleIt();
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">⚙</span><b>カレンダーの 設定</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <h5>📝 カレンダーに 入れる 書式</h5>
    <button type="button" class="kyo-dcard" onclick="KYOSHI.fopen()"><b>📝 予定の 名前・説明・色・採った日</b><small>${esc(fill(st.fmt.title, it, it.ages[0]))}${st.fmt.samp ? '・'+esc(fill(st.fmt.sampTitle, it, {d:0, samp:true})) : ''}</small><i aria-hidden="true">直す ›</i></button>
    <h5>☁ Google カレンダーの 送り先（アカウントごと）</h5>
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
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.sopen()">← カレンダーの 設定（書式・送り先・知らせ）</button></div>`;
}
function sopen(){ gMsg=''; popOpen(gListHtml(), 'g'); }   // ⚙（送り先が なくても 開く）
function gopen(){ gMsg=''; if(!st.dests.length){ gadd(); return; } sopen(); }   // ☁（はじめては 送り先を 作る）
function gedit(id){ const D=dOf(id); if(!D) return; gMsg=''; popOpen(gdHtml(D), 'gd', id); }
function reG(){ if(!pop) return; if(pop.kind==='g') rePop(gListHtml()); else if(pop.kind==='gd'){ const D=dOf(pop.id); if(D) rePop(gdHtml(D)); } else if(pop.kind==='fmt') rePop(fHtml()); }

/* ───────── 📝 カレンダーに 入れる 書式（v613） ───────── */
// 見本の 供試体（いちばん 新しく 入れた もの。なければ 見本）
function sampleIt(){
  const L=st.items.slice().sort((a,b)=>b.at-a.at);
  return L[0] || {id:'sample00', date:ymd(today()), site:'○○ビル 新築工事', mix:'24-18-20N', part:'2F スラブ', no:'No.1〜6', memo:'', ages:[{d:7, n:3, done:'', g:{}}, {d:28, n:3, done:'', g:{}}], sg:{}, at:0, mt:0, fx:0};
}
const fval=k=>{ const i=$('kyoFt_'+k); return i ? (oneLine(i.value,80)||FMT0[k]) : st.fmt[k]; };   // 打って いる 途中の 字も 見本に
function fPrevHtml(){
  const it=sampleIt(), a=it.ages[0];
  return '<b>見本（'+esc(it.site)+'）</b>'+[['まだ', fill(fval('title'), it, a)], ['済み', fill(fval('titleDone'), it, Object.assign({}, a, {done:ymd(today())}))]]
    .concat(st.fmt.samp ? [['採った日', fill(fval('sampTitle'), it, {d:0, samp:true})]] : []).map(([t,v])=>`<span><em>${t}</em>${esc(v)}</span>`).join('');
}
function fHtml(){
  const f=st.fmt;
  const inp=(k, lb, ph)=>`<label class="kyo-f"><span>${lb}</span><input id="kyoFt_${k}" type="text" maxlength="80" value="${esc(f[k])}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="false" oninput="KYOSHI.fprev()" onchange="KYOSHI.fset('${k}', this.value)" aria-label="${lb}の 予定の 名前"></label>
    <div class="kyo-tags" aria-label="差し込む もの">${TAGS.map(t=>`<button type="button" onmousedown="event.preventDefault()" onclick="KYOSHI.ftag('${k}', '${t}')">＋${t}</button>`).join('')}</div>`;
  return `<div class="kyo-ph"><span class="e" aria-hidden="true">📝</span><b>カレンダーに 入れる 書式</b><button type="button" class="kyo-x" onclick="KYOSHI.close()" aria-label="閉じる">✕</button></div>
    <h5>試験の 予定の 名前</h5>
    ${inp('title', 'まだ', FMT0.title)}
    ${inp('titleDone', '済み', FMT0.titleDone)}
    <div class="kyo-fprev" id="kyoFPrev">${fPrevHtml()}</div>
    <h5>採った日にも 予定を 入れる</h5>
    <label class="kyo-ck"><input type="checkbox"${f.samp ? ' checked' : ''} onchange="KYOSHI.fset('samp', this.checked)"> 採った日にも 入れる（🗓 カレンダーの「採」と 同じ 日）</label>
    ${f.samp ? inp('sampTitle', '名前', FMT0.sampTitle) : ''}
    <h5>説明（メモ欄）に 入れる もの</h5>
    <div class="kyo-chips">${DESC_ITEMS.map(([k,t])=>`<button type="button" class="${f.desc[k] ? 'on' : ''}" aria-pressed="${f.desc[k]}" onclick="KYOSHI.fset('desc.${k}', ${!f.desc[k]})">${t}</button>`).join('')}</div>
    <h5>色（Google カレンダー）</h5>
    ${[['todo','試験 まだ'],['done','済み'],['samp','採った日']].map(([k,t])=>{ const c=GCOLORS.find(x=>x[0]===f.color[k])||GCOLORS[0]; return `<label class="kyo-f"><span>${t}</span><select onchange="KYOSHI.fset('color.${k}', this.value)" aria-label="${t}の 色">${GCOLORS.map(([v,n])=>`<option value="${v}"${f.color[k]===v ? ' selected' : ''}>${n}</option>`).join('')}</select><i class="kyo-sw" aria-hidden="true" style="background:${c[2]||'transparent'}"></i></label>`; }).join('')}
    <div class="kyo-acts"><button type="button" class="kyo-b" onclick="KYOSHI.freset()">↺ はじめに もどす</button><button type="button" class="kyo-b" onclick="KYOSHI.sopen()">← カレンダーの 設定</button></div>
    <p class="kyo-note">{現場}・{材齢} などは その 供試体の 字に かわります（空なら 消えます。採った日の 予定では 材齢・本数・試験日は ぜんぶ 並べます）。かえると「入れたら すぐ」の 送り先の 予定も 直ります。まとめて の 送り先は 次に 送る とき、ファイルは 次に 保存 する とき から。色は Google カレンダーだけ（「つけない」は これから 入れる 予定に 色を つけない）。</p>`;
}
function fopen(){ popOpen(fHtml(), 'fmt'); }
function fprev(){ const p=$('kyoFPrev'); if(p) p.innerHTML=fPrevHtml(); }
// 書式の 決まり（title・titleDone・sampTitle・samp・desc.○○・color.○○）
function fset(k, v){
  const f=st.fmt;
  if(k==='title' || k==='titleDone' || k==='sampTitle'){ const t=oneLine(v,80)||FMT0[k]; if(t===f[k]){ fprev(); return; } f[k]=t; }
  else if(k==='samp'){ if(!!v===f.samp) return; f.samp=!!v; }
  else if(/^desc\./.test(k)){ const n=k.slice(5); if(!(n in f.desc) || f.desc[n]===!!v) return; f.desc[n]=!!v; }
  else if(/^color\./.test(k)){ const n=k.slice(6), c=String(v==null ? '' : v); if(!(n in f.color) || !GCOLORS.some(x=>x[0]===c) || f.color[n]===c) return; f.color[n]=c; }
  else return;
  save(); reG(); render(); kick();
}
// 差し込む もの（打って いる ところに {現場} などを 入れる）
function ftag(k, t){
  const i=$('kyoFt_'+k); if(!i || !TAGS.includes(t)) return;
  const a=i.selectionStart==null ? i.value.length : i.selectionStart, b=i.selectionEnd==null ? a : i.selectionEnd, ins='{'+t+'}';
  i.value=(i.value.slice(0,a)+ins+i.value.slice(b)).slice(0,80);
  fset(k, i.value);
  const j=$('kyoFt_'+k); if(j){ try{ j.focus(); j.setSelectionRange(a+ins.length, a+ins.length); }catch(_){} }
}
function freset(){ st.fmt=cleanFmt(null); save(); reG(); render(); kick(); toastS('書式を はじめに もどしました'); }

/* ───────── 窓 ───────── */
const CSS=`
#kyoshiOverlay{ --k-bg:#eef0f2; --k-panel:#ffffff; --k-ink:#1f2a33; --k-muted:#66727d; --k-line:#d5dade; --k-soft:#f6f7f8; --k-accent:#e8710a; --k-accent-ink:#ffffff; --k-accent-soft:#fdebd9; --k-late:#c62828; --k-late-soft:#fde3e1; --k-d7:#2364aa; --k-d7-soft:#e1ecf8; --k-d28:#2e7d4f; --k-d28-soft:#e0f1e6; --k-d3:#7a4bb0; --k-d3-soft:#efe6f8; --k-done:#9aa3ab; --k-done-soft:#eceef0; --k-sun:#c62828; --k-sat:#2364aa;
  --modal-bg:var(--k-panel); --text:var(--k-ink); --text-light:var(--k-muted); --acc:var(--k-accent); --on-acc:var(--k-accent-ink); --cell-bg:var(--k-bg); }
body.dark #kyoshiOverlay{ --k-bg:#14191d; --k-panel:#1d242a; --k-ink:#e6eaed; --k-muted:#9aa5ae; --k-line:#323c44; --k-soft:#232b32; --k-accent:#ff8f2e; --k-accent-ink:#1a1206; --k-accent-soft:#3a2614; --k-late:#ff6b62; --k-late-soft:#3d1f1f; --k-d7:#7fb2ec; --k-d7-soft:#1c2c3e; --k-d28:#6fcb95; --k-d28-soft:#1b3326; --k-d3:#c3a2ec; --k-d3-soft:#2d2140; --k-done:#6c767f; --k-done-soft:#262d33; --k-sun:#ff6b62; --k-sat:#7fb2ec; }
#kyoshiOverlay .kyo-modal{ display:flex; flex-direction:column; }
.kyo-body{ flex:1; min-height:0; overflow:auto; padding:12px 12px 0; background:var(--k-bg); color:var(--k-ink); font-size:14px; line-height:1.5; }
.kyo-wrap{ max-width:1400px; margin:0 auto; display:flex; flex-direction:column; gap:12px; padding-bottom:70px; }
.kyo-num{ font-variant-numeric:tabular-nums; font-family:ui-monospace,Consolas,monospace; }
.kyo-head{ display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; } .kyo-today{ color:var(--k-muted); } .kyo-today b{ color:var(--k-ink); } .kyo-spacer{ flex:1; }
.kyo-b{ min-height:38px; padding:6px 12px; border-radius:8px; border:1px solid var(--k-line); background:var(--k-panel); color:var(--k-ink); font-size:14px; cursor:pointer; }
.kyo-b:hover{ border-color:var(--k-muted); } .kyo-b.pri{ background:var(--k-accent); border-color:var(--k-accent); color:var(--k-accent-ink); font-weight:bold; } .kyo-b.warn{ color:var(--k-late); border-color:var(--k-late); background:transparent; }
.kyo-b.sm{ min-height:34px; padding:0 10px; font-size:13.5px; } .kyo-b:disabled{ opacity:.45; cursor:not-allowed; }
.kyo-cal-b{ min-width:38px; padding:0 8px; border-color:transparent; background:transparent; color:var(--k-muted); font-size:16px; } .kyo-cal-b:hover{ border-color:var(--k-line); }
.kyo-sy{ font-size:12px; color:var(--k-muted); border:0; background:none; padding:2px 4px; } .kyo-sy.err{ color:var(--k-late); font-weight:bold; cursor:pointer; text-decoration:underline; }
.kyo-stats{ display:flex; flex-wrap:wrap; gap:8px; } .kyo-stat{ display:flex; align-items:baseline; gap:6px; padding:5px 12px; border-radius:999px; background:var(--k-panel); border:1px solid var(--k-line); }
.kyo-stat b{ font-size:16px; font-family:ui-monospace,Consolas,monospace; } .kyo-stat.late{ border-color:var(--k-late); color:var(--k-late); background:var(--k-late-soft); } .kyo-stat.today{ border-color:var(--k-accent); background:var(--k-accent-soft); }
.kyo-toolbar, .kyo-tbar{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.kyo-tabs{ display:flex; background:var(--k-panel); border:1px solid var(--k-line); border-radius:8px; padding:3px; gap:2px; } .kyo-tabs button{ border:0; background:none; padding:6px 14px; border-radius:6px; color:var(--k-muted); font-size:14px; cursor:pointer; }
.kyo-tabs button.on{ background:var(--k-ink); color:var(--k-bg); font-weight:bold; }
.kyo-nav{ display:flex; gap:4px; align-items:center; } .kyo-nav .lbl{ min-width:9em; text-align:center; font-weight:bold; }
.kyo-tbar select, .kyo-tbar input{ border:1px solid var(--k-line); background:var(--k-panel); color:var(--k-ink); border-radius:8px; padding:7px 10px; min-width:0; font-size:14px; } .kyo-tbar input{ flex:1 1 180px; max-width:300px; }
.kyo-board-scroll{ overflow-x:auto; padding-bottom:4px; } .kyo-board{ display:grid; grid-template-columns:repeat(8,minmax(160px,1fr)); gap:8px; min-width:1100px; }
.kyo-lane{ background:var(--k-soft); border:1px solid var(--k-line); border-radius:8px; display:flex; flex-direction:column; min-width:0; min-height:200px; }
.kyo-lh{ display:flex; justify-content:space-between; align-items:baseline; padding:8px 10px; border-bottom:1px solid var(--k-line); background:var(--k-panel); border-radius:8px 8px 0 0; } .kyo-lh .d{ font-weight:bold; } .kyo-lh .d small{ margin-left:4px; font-size:11px; font-weight:normal; } .kyo-lh .c{ color:var(--k-muted); font-size:12px; }
.kyo-lane.is-late .kyo-lh{ background:var(--k-late); color:var(--k-accent-ink); border-color:var(--k-late); } .kyo-lane.is-late .kyo-lh .c, .kyo-lane.is-today .kyo-lh .c{ color:inherit; }
.kyo-lane.is-today .kyo-lh{ background:var(--k-accent); color:var(--k-accent-ink); border-color:var(--k-accent); }
.kyo-lane .sun{ color:var(--k-sun); } .kyo-lane .sat{ color:var(--k-sat); } .kyo-lane.is-late .sun, .kyo-lane.is-today .sun, .kyo-lane.is-late .sat, .kyo-lane.is-today .sat{ color:inherit; }
.kyo-cards{ display:flex; flex-direction:column; gap:6px; padding:8px; } .kyo-cards.kyo-grid{ padding:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); }
.kyo-empty{ color:var(--k-muted); font-size:12.5px; text-align:center; padding:16px 4px; }
.kyo-card{ position:relative; display:grid; grid-template-columns:1fr auto; gap:2px 8px; text-align:left; width:100%; box-sizing:border-box; background:var(--k-panel); border:1px solid var(--k-line); border-left:5px solid var(--k-muted); border-radius:6px; padding:7px 8px; cursor:pointer; color:var(--k-ink); }
.kyo-card:hover{ border-color:var(--k-muted); } .kyo-card.a7{ border-left-color:var(--k-d7); } .kyo-card.a28{ border-left-color:var(--k-d28); } .kyo-card.a3{ border-left-color:var(--k-d3); }
.kyo-card.late{ background:var(--k-late-soft); border-left-color:var(--k-late); } .kyo-card.done{ background:var(--k-done-soft); color:var(--k-done); border-left-color:var(--k-done); } .kyo-card.done .nm{ text-decoration:line-through; }
.kyo-card .nm{ font-weight:bold; overflow-wrap:anywhere; min-width:0; } .kyo-card .mx{ font-size:12px; font-weight:normal; color:var(--k-muted); }
.kyo-card .meta{ grid-column:1/2; font-size:12px; color:var(--k-muted); display:flex; flex-wrap:wrap; gap:2px 8px; } .kyo-card .memo{ grid-column:1/3; font-size:12px; overflow-wrap:anywhere; }
.age{ display:inline-block; font-family:ui-monospace,Consolas,monospace; font-size:11px; font-weight:bold; padding:0 6px; border-radius:4px; background:var(--k-soft); }
.age.a7{ background:var(--k-d7-soft); color:var(--k-d7); } .age.a28{ background:var(--k-d28-soft); color:var(--k-d28); } .age.a3{ background:var(--k-d3-soft); color:var(--k-d3); }
.chk{ grid-row:1/3; grid-column:2; align-self:center; width:32px; height:32px; border-radius:50%; border:2px solid var(--k-line); background:var(--k-panel); display:grid; place-items:center; font-weight:bold; color:transparent; cursor:pointer; padding:0; }
.chk:hover{ border-color:var(--k-d28); color:var(--k-d28); } .kyo-card.done .chk{ background:var(--k-d28); border-color:var(--k-d28); color:var(--k-accent-ink); }
.shift{ font-size:11px; font-weight:bold; color:var(--k-accent); background:var(--k-accent-soft); border-radius:4px; padding:0 5px; }
.kyo-cal{ display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:1px; background:var(--k-line); border:1px solid var(--k-line); border-radius:8px; overflow:hidden; touch-action:pan-y; }
.kyo-cal .wd{ background:var(--k-panel); text-align:center; font-weight:bold; padding:6px 0; font-size:12px; } .kyo-cal .wd.sun, .dn.sun{ color:var(--k-sun); } .kyo-cal .wd.sat, .dn.sat{ color:var(--k-sat); }
.kyo-day{ background:var(--k-panel); min-height:96px; padding:4px 5px; display:flex; flex-direction:column; gap:2px; text-align:left; border:0; border-radius:0; min-width:0; color:var(--k-ink); font:inherit; cursor:pointer; }
.kyo-day.out{ background:var(--k-soft); color:var(--k-muted); } .kyo-day.today{ box-shadow:inset 0 0 0 2px var(--k-accent); } .kyo-day.sel{ background:var(--k-accent-soft); }
.kyo-day .dn{ font-size:12px; font-weight:bold; font-family:ui-monospace,Consolas,monospace; }
.kyo-pill{ font-size:11px; line-height:1.35; padding:1px 4px; border-radius:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:var(--k-soft); }
.kyo-pill.a7{ background:var(--k-d7-soft); } .kyo-pill.a28{ background:var(--k-d28-soft); } .kyo-pill.a3{ background:var(--k-d3-soft); } .kyo-pill.done{ background:var(--k-done-soft); color:var(--k-done); text-decoration:line-through; }
.kyo-pill.samp{ background:transparent; border:1px dashed var(--k-accent); } .kyo-pill.samp b{ color:var(--k-accent); margin-right:2px; } .kyo-day .more{ font-size:11px; color:var(--k-muted); }
.kyo-daypanel{ background:var(--k-panel); border:1px solid var(--k-line); border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:8px; margin-top:10px; } .kyo-daypanel h3{ margin:0; font-size:15px; } .kyo-daypanel h4{ margin:4px 0 0; font-size:13px; color:var(--k-muted); }
.kyo-samplist{ display:flex; flex-direction:column; gap:6px; } .kyo-samprow{ display:flex; flex-wrap:wrap; gap:4px 10px; align-items:baseline; padding:6px 10px; border:1px dashed var(--k-accent); border-radius:6px; cursor:pointer; } .kyo-samprow .nm{ font-weight:bold; } .kyo-samprow .bd{ font-size:12px; color:var(--k-muted); }
.kyo-tests-wrap, .kyo-tbl-wrap{ overflow-x:auto; background:var(--k-panel); border:1px solid var(--k-line); border-radius:8px; }
.kyo-tests-wrap table, .kyo-tbl-wrap table{ border-collapse:collapse; width:100%; min-width:560px; } .kyo-tbl-wrap table{ min-width:640px; }
.kyo-tests-wrap th, .kyo-tests-wrap td, .kyo-tbl-wrap th, .kyo-tbl-wrap td{ padding:7px 9px; border-bottom:1px solid var(--k-line); text-align:left; white-space:nowrap; vertical-align:middle; color:var(--k-ink); }
.kyo-tests-wrap th, .kyo-tbl-wrap th{ font-size:12px; color:var(--k-muted); font-weight:bold; background:var(--k-soft); } .kyo-tests-wrap th.ac{ text-align:center; }
td.memo{ white-space:normal; min-width:140px; } td.nm{ font-weight:bold; white-space:normal; min-width:7em; } td.sd{ font-weight:bold; font-family:ui-monospace,Consolas,monospace; }
.sticky{ position:sticky; left:0; background:var(--k-panel); z-index:1; } tr.grp-start td{ border-top:2px solid var(--k-line); }
.kyo-tbl-wrap tbody tr{ cursor:pointer; } .kyo-tbl-wrap tbody tr:hover td{ background:var(--k-accent-soft); } tr.late td{ background:var(--k-late-soft); } tr.done td{ color:var(--k-done); } tr.done td.nm{ text-decoration:line-through; }
.st{ font-size:12px; font-weight:bold; padding:1px 8px; border-radius:999px; } .st.late{ background:var(--k-late); color:var(--k-accent-ink); } .st.done{ background:var(--k-done-soft); color:var(--k-done); } .st.wait{ background:var(--k-soft); color:var(--k-muted); } .st.today{ background:var(--k-accent); color:var(--k-accent-ink); }
.kyo-tc{ display:flex; flex-direction:column; align-items:center; gap:1px; width:100%; min-width:76px; border:1px solid var(--k-line); border-radius:6px; background:var(--k-panel); color:var(--k-ink); padding:3px 4px; font-family:ui-monospace,Consolas,monospace; font-size:13px; cursor:pointer; }
.kyo-tc .m{ font-family:inherit; font-size:10px; font-weight:bold; padding:0 6px; border-radius:999px; } .kyo-tc.wait .m{ background:var(--k-soft); color:var(--k-muted); }
.kyo-tc.today{ border-color:var(--k-accent); background:var(--k-accent-soft); } .kyo-tc.today .m{ background:var(--k-accent); color:var(--k-accent-ink); }
.kyo-tc.late{ border-color:var(--k-late); background:var(--k-late-soft); color:var(--k-late); } .kyo-tc.late .m{ background:var(--k-late); color:var(--k-accent-ink); } .kyo-tc.done{ background:var(--k-done-soft); color:var(--k-done); } .kyo-tc.done .m{ background:var(--k-d28); color:var(--k-accent-ink); }
.prog{ font-size:12px; } .prog.all{ color:var(--k-d28); font-weight:bold; } .hint{ font-size:12px; color:var(--k-muted); font-weight:normal; }
.mini{ border:1px solid var(--k-line); background:var(--k-panel); color:var(--k-ink); border-radius:6px; padding:2px 8px; font-size:12px; font-weight:normal; margin-left:6px; cursor:pointer; }
.kyo-legend{ display:flex; flex-wrap:wrap; gap:6px 12px; font-size:12px; color:var(--k-muted); } .kyo-legend i{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; } .kyo-legend i.s{ border:1px dashed var(--k-accent); }
.kyo-undo{ display:none; align-items:center; gap:10px; margin:6px 10px calc(8px + var(--safe-bottom,0px)); padding:10px 12px; border-radius:12px; background:#263238; color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.3); font-size:14px; z-index:3; }
.kyo-undo.on{ display:flex; } .kyo-undo span{ flex:1; min-width:0; } .kyo-undo button{ min-height:38px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.5); background:transparent; color:#fff; font-size:14px; font-weight:bold; cursor:pointer; }
.kyo-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(10,15,20,.45); display:flex; align-items:center; justify-content:center; padding:12px; box-sizing:border-box; }
.kyo-pop{ width:100%; max-width:480px; max-height:100%; overflow:auto; box-sizing:border-box; background:var(--k-panel); color:var(--k-ink); border:1px solid var(--k-line); border-radius:12px; padding:16px 16px calc(16px + var(--safe-bottom,0px)); box-shadow:0 10px 40px rgba(0,0,0,.35); }
.kyo-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .kyo-ph .e{ font-size:26px; line-height:1; } .kyo-ph b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.kyo-x{ min-width:40px; min-height:40px; border-radius:10px; border:1px solid var(--k-line); background:transparent; color:var(--k-ink); font-size:18px; cursor:pointer; }
.kyo-pop h5{ margin:14px 0 6px; font-size:14.5px; } .kyo-pop hr{ border:0; border-top:1px solid var(--k-line); width:100%; margin:12px 0; }
.field{ display:flex; flex-direction:column; gap:4px; margin:8px 0; } .field label{ font-size:12px; color:var(--k-muted); font-weight:bold; }
.field input, .field textarea{ border:1px solid var(--k-line); background:var(--k-bg); color:var(--k-ink); border-radius:6px; padding:8px 10px; width:100%; box-sizing:border-box; font-size:16px; font-family:inherit; } textarea.paste{ min-height:110px; font-family:ui-monospace,Consolas,monospace; font-size:12px; }
.ages{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; } .ages .chip{ min-width:58px; border:1px solid var(--k-line); background:var(--k-bg); color:var(--k-muted); border-radius:999px; padding:7px 12px; font-family:ui-monospace,Consolas,monospace; font-weight:bold; cursor:pointer; }
.ages .chip[aria-pressed="true"]{ background:var(--k-ink); color:var(--k-bg); border-color:var(--k-ink); } .ages .chip[aria-pressed="true"]::before{ content:"✓ "; }
.addage{ display:flex; gap:4px; align-items:center; } .addage input{ width:64px; border:1px solid var(--k-line); background:var(--k-bg); color:var(--k-ink); border-radius:6px; padding:6px 8px; font-size:16px; } .addage button{ border:1px solid var(--k-line); background:var(--k-panel); color:var(--k-ink); border-radius:6px; padding:6px 10px; cursor:pointer; }
.hist{ display:flex; flex-direction:column; gap:6px; margin:0 0 6px; } .hist-list{ display:flex; flex-wrap:wrap; gap:6px; max-height:132px; overflow:auto; }
.hist-list button{ display:flex; flex-direction:column; align-items:flex-start; gap:1px; border:1px solid var(--k-line); background:var(--k-soft); color:var(--k-ink); border-radius:8px; padding:5px 10px; text-align:left; max-width:100%; cursor:pointer; } .hist-list button:hover{ border-color:var(--k-accent); background:var(--k-accent-soft); }
.hist-list .hn{ font-weight:bold; overflow-wrap:anywhere; } .hist-list .hm{ font-size:11px; color:var(--k-muted); }
.kyo-quick{ display:flex; flex-wrap:wrap; gap:5px; margin:-2px 0 6px; } .kyo-quick button, .kyo-sug button{ min-height:34px; padding:0 10px; border-radius:17px; border:1px solid var(--k-line); background:transparent; color:var(--k-ink); font-size:13.5px; cursor:pointer; }
.preview{ background:var(--k-soft); border-radius:6px; padding:8px 10px; font-size:13px; margin:8px 0 0; } .preview .warn, .warn{ color:var(--k-late); font-weight:bold; } .err{ color:var(--k-late); font-size:13px; }
.prow{ display:flex; flex-wrap:wrap; align-items:center; gap:4px 6px; padding:3px 0; } .prow .sg{ min-width:3.2em; font-weight:bold; } .prow .dd{ min-width:6.5em; text-align:center; }
.dj{ width:32px; height:32px; border:1px solid var(--k-line); background:var(--k-panel); color:var(--k-ink); border-radius:6px; font-weight:bold; line-height:1; cursor:pointer; } .dj:hover{ border-color:var(--k-accent); }
.chg{ font-size:11px; font-weight:bold; padding:0 6px; border-radius:999px; margin-left:4px; } .chg.add{ background:var(--k-d28-soft); color:var(--k-d28); } .chg.del{ background:var(--k-late-soft); color:var(--k-late); } .chg.keep{ background:var(--k-soft); color:var(--k-muted); }
.kyo-kv{ display:grid; grid-template-columns:6em 1fr; gap:4px 10px; margin:6px 0 0; } .kyo-kv dt{ color:var(--k-muted); font-size:12px; padding-top:2px; } .kyo-kv dd{ margin:0; overflow-wrap:anywhere; }
.kyo-acts{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin:10px 0 0; } .kyo-acts.end{ justify-content:flex-end; margin-top:14px; } .kyo-sp{ margin-right:auto; }
.kyo-more{ margin:4px 0; } .kyo-more summary{ cursor:pointer; min-height:36px; line-height:36px; font-size:13.5px; color:var(--k-muted); }
.kyo-step{ display:inline-flex; align-items:center; gap:6px; } .kyo-step button{ width:44px; height:44px; border-radius:12px; border:1px solid var(--k-line); background:var(--k-soft); color:var(--k-ink); font-size:20px; font-weight:bold; cursor:pointer; } .kyo-step b{ min-width:1.6em; text-align:center; font-size:19px; }
.kyo-f{ display:flex; align-items:center; gap:8px; margin:8px 0; min-width:0; } .kyo-f > span:first-child{ flex:none; width:4.6em; font-size:12.5px; font-weight:bold; color:var(--k-muted); line-height:1.3; }
.kyo-f input, .kyo-f textarea, .kyo-f select{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid var(--k-line); background:var(--k-bg); color:var(--k-ink); font-size:16px; box-sizing:border-box; font-family:inherit; }
.kyo-chips{ display:flex; flex-wrap:wrap; gap:5px; flex:1; min-width:0; } .kyo-chips button{ min-height:40px; min-width:52px; padding:0 10px; border-radius:20px; border:1px solid var(--k-line); background:transparent; color:var(--k-ink); font-size:14.5px; cursor:pointer; }
.kyo-chips button.on{ background:var(--k-accent); border-color:var(--k-accent); color:var(--k-accent-ink); font-weight:bold; }
.kyo-ck{ display:flex; align-items:center; gap:8px; margin:10px 0 0; font-size:14px; cursor:pointer; } .kyo-ck input{ width:22px; height:22px; flex:none; }
.kyo-note{ font-size:12.5px; color:var(--k-muted); line-height:1.6; margin:10px 0 0; } .kyo-note .kyo-cs{ border:1px dashed var(--k-accent); padding:0 4px; border-radius:4px; font-style:normal; }
.kyo-gst{ margin:0 0 8px; padding:9px 12px; border-radius:12px; background:var(--k-soft); font-size:14px; line-height:1.6; overflow-wrap:anywhere; }
.kyo-steps{ margin:4px 0 8px; } .kyo-steps summary{ cursor:pointer; min-height:40px; line-height:40px; font-weight:bold; font-size:14.5px; color:var(--k-accent); } .kyo-steps ol{ margin:4px 0 0; padding-left:22px; font-size:14px; line-height:1.7; } .kyo-steps li{ margin:0 0 8px; } .kyo-steps li small{ display:block; font-size:12.5px; color:var(--k-muted); } .kyo-steps a{ color:var(--k-accent); font-weight:bold; }
.kyo-dsts{ display:flex; flex-direction:column; gap:6px; } .kyo-dsts button{ display:flex; flex-direction:column; align-items:flex-start; gap:1px; width:100%; min-height:48px; padding:7px 12px; border-radius:12px; border:2px solid var(--k-line); background:transparent; color:var(--k-ink); text-align:left; font:inherit; cursor:pointer; }
.kyo-dsts button b{ font-size:14.5px; } .kyo-dsts button small{ font-size:12px; color:var(--k-muted); } .kyo-dsts button.on{ border-color:var(--k-accent); background:var(--k-soft); } .kyo-dsts button.on b::before{ content:'● '; color:var(--k-accent); }
.kyo-h{ display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 8px; margin:14px 0 6px; font-size:14.5px; } .kyo-h > small{ font-size:12.5px; font-weight:normal; color:var(--k-muted); } .kyo-d.sun{ color:var(--k-sun); } .kyo-d.sat{ color:var(--k-sat); } .kyo-d small{ margin-left:4px; font-size:11.5px; font-weight:normal; } .kyo-none{ margin:4px 0 8px; font-size:13.5px; color:var(--k-muted); }
.kyo-bsel{ margin:0 0 4px; } .kyo-bsel button{ min-height:36px; font-size:13.5px; }
.kyo-blist{ max-height:40vh; overflow:auto; border:1px solid var(--k-line); border-radius:12px; padding:0 8px 6px; } .kyo-blist .kyo-h{ margin:10px 0 4px; font-size:13.5px; }
.kyo-bi{ display:flex; align-items:flex-start; gap:8px; padding:6px 4px; border-bottom:1px solid var(--k-line); cursor:pointer; } .kyo-bi:last-child{ border-bottom:0; } .kyo-bi input{ width:22px; height:22px; flex:none; margin-top:2px; }
.kyo-bi .t{ flex:1; min-width:0; display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 6px; font-size:14.5px; } .kyo-bi .t small{ width:100%; font-size:12.5px; color:var(--k-muted); } .kyo-bi.in .t > b{ color:var(--k-muted); } .kyo-bd{ font-style:normal; font-size:11.5px; color:var(--k-d28); } .mx{ font-size:13px; font-weight:bold; color:var(--k-muted); }
.kyo-dlist{ display:flex; flex-direction:column; gap:6px; margin:0 0 8px; } .kyo-dcard{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; position:relative; width:100%; box-sizing:border-box; padding:8px 70px 8px 12px; border-radius:12px; border:1px solid var(--k-line); background:var(--k-soft); color:var(--k-ink); text-align:left; font:inherit; cursor:pointer; }
.kyo-dcard b{ font-size:15px; } .kyo-dcard small{ font-size:12.5px; color:var(--k-muted); line-height:1.45; overflow-wrap:anywhere; } .kyo-dcard i{ position:absolute; right:12px; top:50%; transform:translateY(-50%); font-style:normal; font-size:13px; color:var(--k-accent); font-weight:bold; }
.kyo-tags{ display:flex; flex-wrap:wrap; gap:4px; margin:-2px 0 8px; } .kyo-tags button{ min-height:32px; padding:0 8px; border-radius:16px; border:1px dashed var(--k-muted); background:transparent; color:var(--k-ink); font-size:12.5px; cursor:pointer; }
.kyo-fprev{ display:flex; flex-direction:column; gap:2px; margin:6px 0 0; padding:8px 12px; border-radius:12px; background:var(--k-soft); font-size:13.5px; line-height:1.6; overflow-wrap:anywhere; } .kyo-fprev em{ display:inline-block; min-width:4.5em; font-style:normal; font-size:12px; color:var(--k-muted); }
.kyo-sw{ flex:none; width:26px; height:26px; border-radius:50%; border:1px solid var(--k-line); }
@media (max-width:760px){ .kyo-board-scroll{ overflow:visible; } .kyo-board{ grid-template-columns:1fr; min-width:0; } .kyo-lane{ min-height:0; } .kyo-lane.blank{ display:none; } .kyo-day{ min-height:64px; padding:3px 2px; } .kyo-day .kyo-pill{ font-size:10px; padding:0 2px; } }
`;
function ensureDom(){
  if($('kyoshiOverlay')) return;
  const s=document.createElement('style'); s.id='kyoStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="kyoshiOverlay">
  <div class="modal vol-modal kyo-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🧱 供試体 破壊予定ボード</span><button class="modal-close" onclick="closeKyoshi()" aria-label="閉じる">✕</button></div>
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
function cleanup(){ popClose(); ed=null; bt=null; clearTimeout(undoT); clearTimeout(retryT); undo=null; const u=$('kyoUndo'); if(u) u.classList.remove('on'); }
// pre：{site, date}（📝 試験報告書 から 来た とき。入れる 窓を 出す）
function openKyoshi(pre){
  ensureDom(); if(!st || !busyN) load(); lq=''; tq=''; base=''; month=''; selDay='';
  openDlg('kyoshiOverlay', cleanup); render();
  if(!window.HyoIcs && typeof loadSidePart==='function') loadSidePart(['hyoics.js']);   // 📅 カレンダーの 部品を 先に 読んでおく
  kick(600);
  if(pre && typeof pre==='object' && !(pre instanceof Event) && (pre.site || pre.date)) openEdit('', pre);
}
function closeKyoshi(){ if(!$('kyoshiOverlay') || !isDlgOpen('kyoshiOverlay')) return; closeDlg('kyoshiOverlay', cleanup); }

window.KYOSHI={ add:pre=>openEdit('', pre), edit:id=>openEdit(id), again, excel:openExcel, detail, chk:(id, f)=>chk(id, f), close:popClose, delAsk, delNo, delYes:id=>delYes(id), undo:undoDo,
  edSet, edDay, edAge, edAgeCust, edAdj, edN, edHist, edGo:more=>edGo(!!more), xparse, ximport, xcopy:all=>xcopy(!!all), view:setView, nav, navToday, calDay, tf, tmonth, tqs, lf, lqs,
  tidy:()=>tidy(), copy, text, table:toTable, rows:tableRows, cal:id=>openBatch({ids:[id]}), gcal1,
  batch:o=>openBatch(o), bDst, bSel, bAll, bGo:how=>bGo(how),
  gopen, sopen, gadd, gedit, gdel:id=>gdel(id), gtest:id=>gtest(id), gurl, dset, gset, gcopy, gshare, gcopyCfg, sync:why=>sync(why||'user'),
  fopen, fprev, fset, ftag, freset, fill:(tpl, id, d)=>{ const it=itOf(id); if(!it) return ''; return fill(tpl, it, d==='s' ? sampOf(it) : ageOf(it, d)); },
  // ためす とき 用
  today:s=>{ fixedToday=s ? String(s) : null; base=''; month=''; selDay=''; if(st && isOpen()) render(); }, state:()=>JSON.parse(JSON.stringify(st)), clean:cleanIt, gasCode, parseUrl,
  addItem:o=>{ if(!st) load(); const it=addItem(o||{}); if(isOpen()) render(); return it ? it.id : null; },
  plan:id=>{ if(!st) load(); const L=id ? [dOf(id)].filter(Boolean) : autoDs(); return [].concat(...L.map(D=>plan(D).map(p=>Object.assign({t:p.t, dst:D.id}, p.op)))); },
  tests:()=>tests().map(x=>({id:x.it.id, site:x.it.site, d:x.a.d, date:ymd(x.td), dd:x.dd, done:x.a.done})),
  ev:(id,d)=>{ const it=itOf(id), a=d==='s' ? (it && sampOf(it)) : ageOf(it, d); return a ? evOf(it, a) : null; }, ics:id=>{ const it=itOf(id); return it ? icsOfIt(it) : []; }, gurlOf:(id,d)=>{ const it=itOf(id), a=ageOf(it, d); return a ? gcalUrl(it, a) : ''; },
  gstate:(id,d,dst)=>{ const it=itOf(id), a=ageOf(it, d), D=dst ? dOf(dst) : st.dests.find(dReady); return a && D ? gState(it, a, D) : null; },
  notIn:()=>st.items.filter(notIn).map(it=>it.id), busy:()=>busyN>0 };
Object.assign(window, { openKyoshi, closeKyoshi });
})();
