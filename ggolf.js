/* ⛳ グラウンドゴルフ（v616。表電卓の道具。apps/ggolf/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   グラウンドゴルフ大会の 成績を まとめて、順位と 賞を 出す。
   ・入れるのは 1人ずつ 合計（打数）と ホールインワンの 数 だけ（ホールごとの 打数は 要らない）。チームを 入れると チーム賞も。
     ✏ の 名簿で 合計を 打って Enter で 次の 人へ・⛳ は －／＋。上の 欄で 名前・チーム・合計・ホールインワンを 1人ずつ 足す ことも。
   ・順位は 合計の 少ない 順 → 同じなら ホールインワンの 多い 順。それも 同じで 賞が かわる ときは ⚠ を 出し、
     じゃんけん・年上 など 大会の 決まりで 決めた 順を ▲ と「✓ この 順で 決める」で 入れる（合計か ⛳ が かわると 決めなおし）。
   ・賞（⚙ で かえられる。はじめは 個人賞 5位まで・チーム賞 1位・とび賞 10・15・20・25位・ブービー賞・ホールインワン賞 用意 15個）。
     チームの 成績は 合計 か 平均。ホールインワン賞は 出た 回数（か 1人 1つ）を 用意した 数と くらべる。参加賞は 合計を 入れた 人数。
   ・名前は 📝 まとめて 入れる（1行に「名前／チーム 合計 ホールインワン」。名前だけ・「、」区切り・「チーム：名前、名前」・Excel の 行も）か 📇 名簿から。
     同じ 名前の 人には 成績を 入れる（前もって 名簿だけ 入れて おける）。新しい 大会は 前の 大会の 名簿と 賞の 決め方を 写せる。
   ・🏆 順位・賞：賞の 一覧（🎤 発表の 順＝下の 賞から）・順位・チームの 順位。🖨 印刷（A4）・📋 コピー・▦ 表に 入れる。
   ・📁 Excel（v618）：① 名簿の ひな形（.xlsx）を 書き出す → Excel や AI で 書く → ② Excel・CSV から 読み込む（この 大会に 入れる・入れかえる・
     新しい 大会）。③ 競技結果を Excel に（賞・順位・チーム・名簿・大会）。
   ・⚙ 入力の しかた（v620）：合計と ホールインワン か、ホールごとの スコア（コースの 数 × ホール数。はじめは 2 × 8）。ホールごとの ときは
     📝 スコアカード（ホールを 押して 下の 数を 押す・1＝ホールインワン・次の 人へ）で 入れ、ぜんぶ 入ると 合計と ⛳ が 出る（途中は 順位に 入らない）。
     コースごとの 計を 順位・コピー・表・印刷（スコア表）に、Excel は A1〜B8 の 列（合計・ホールインワンは 式）と 結果の「スコア」の シート。
   ・⚙ ホールインワンで 引く（v638）：ホールインワン 1回で 合計から ○打 引く 大会の 決まり。入れるのは 実打数の まま、順位・賞・印刷・Excel は 引いた 合計で。
   ・中身は excalc_ggolf（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_ggolf', MAX_C=40, MAX_M=300, MAX_TOT=999, MAX_HIO=99, MAX_CRS=6, MAX_HN=18, MAX_H=MAX_CRS*MAX_HN, MAX_ST=99;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);   // onclick に 入れるので 英数字だけ
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
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const fmt1=n=>(Math.round(n*10)/10).toFixed(1);
const teamIn=v=>oneLine(String(v==null?'':v).normalize('NFKC'),16);   // チーム：Ａ と A は 同じ
const nk=s=>String(s||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();   // 名前を くらべる とき（空白・全角半角の ちがいは 同じ 人）
// 数：全角・「48打」「2回」・漢数字も（表電卓の toolNum）
function numIn(v, a, b, dflt){
  const s=String(v==null?'':v).normalize('NFKC').replace(/[\s,打回個人位]/g,''); if(s==='') return dflt;
  let n=typeof toolNum==='function' ? toolNum(s) : NaN;
  if(!isFinite(n)) n=/^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  return isFinite(n) ? Math.min(b, Math.max(a, Math.round(n))) : dflt;
}
// 合計：1〜999。空・数で ない ときは null（まだ）
function totIn(v){ const n=numIn(v, -1, 1e6, null); return n!=null && n>=1 && n<=MAX_TOT ? n : null; }
// 1ホールの 打数：1〜99（0 や 数で ない ものは まだ。1 に しない ＝ ホールインワンに しない）
function stIn(v){ const n=numIn(v, -1, 1e6, null); return n!=null && n>=1 ? Math.min(n, MAX_ST) : null; }

/* ───────── 状態 ───────── */
// 賞の 決め方。ind：個人賞（上位 何人）・team：チーム賞（上位 いくつ）・tmode：チームの 成績（sum 合計／avg 平均）・
// tobi：とび賞の 位・booby：ブービー賞・bmaker：ブービーメーカー賞・hio：ホールインワン賞の 用意（0＝見ない）・hone：1人 1つ まで
// inp：入力の しかた（tot 合計と ホールインワン／hole ホールごとの スコア）・crs：コースの 数・hn：1コースの ホール数（v620）
// hded：ホールインワン 1回で 合計から 引く 打数（0＝引かない。v638）
const DEF={ind:5, team:1, tmode:'sum', tobi:[10,15,20,25], booby:true, bmaker:false, hio:15, hone:false, inp:'tot', crs:2, hn:8, hded:0};
function tobiList(v){ return [...new Set(String(Array.isArray(v) ? v.join(',') : v==null ? '' : v).normalize('NFKC').split(/[^0-9]+/).filter(Boolean).map(Number).filter(n=>n>=2 && n<=MAX_M))].sort((a,b)=>a-b).slice(0,20); }
function cleanSet(x){
  x=(x && typeof x==='object') ? x : {};
  return {ind:numIn(x.ind,0,30,DEF.ind), team:numIn(x.team,0,10,DEF.team), tmode:x.tmode==='avg' ? 'avg' : 'sum',
    tobi:x.tobi===undefined ? DEF.tobi.slice() : tobiList(x.tobi), booby:x.booby===undefined ? DEF.booby : !!x.booby, bmaker:!!x.bmaker,
    hio:numIn(x.hio,0,999,DEF.hio), hone:!!x.hone, inp:x.inp==='hole' ? 'hole' : 'tot', crs:numIn(x.crs,1,MAX_CRS,DEF.crs), hn:numIn(x.hn,1,MAX_HN,DEF.hn), hded:numIn(x.hded,0,5,0)};
}
// ホールごとの スコア：h[コース×ホール数＋ホール]（null＝まだ）。うしろの まだ は 持たない
const CL=k=>String.fromCharCode(65+k);   // コースの 名前：A・B・C…
const NH=S=>S.crs*S.hn;
function cleanH(a){
  const h=(Array.isArray(a) ? a : []).slice(0,MAX_H).map(v=>v==null || v==='' ? null : stIn(v));
  while(h.length && h[h.length-1]==null) h.pop();
  return h;
}
function holeInfo(S, m){
  const N=NH(S), h=m.h||[]; let n=0, sum=0, hio=0;
  for(let i=0; i<N; i++){ const v=h[i]; if(v==null) continue; n++; sum+=v; if(v===1) hio++; }   // 1打＝ホールインワン
  return {N, n, sum, hio, done:N>0 && n===N};
}
// コースごとの 計（s 計・n 入った 数・done ぜんぶ）
const crsSums=(S, m)=>Array.from({length:S.crs}, (_,k)=>{ let s=0, n=0; for(let i=0; i<S.hn; i++){ const v=(m.h||[])[k*S.hn+i]; if(v!=null){ s+=v; n++; } } return {s, n, done:n===S.hn}; });
const crsTxt=(c, m)=>c.set.inp==='hole' && holeInfo(c.set, m).n ? crsSums(c.set, m).map((x,k)=>CL(k)+' '+(x.n ? x.s : '－')).join('・') : '';
// ホールごとの とき：スコアから 合計と ⛳ を 出す（ぜんぶ 入るまで 合計は まだ）。1つも ない 人は 合計だけ（合計と ホールインワン で 入れた 分）の まま
function derive(S, m){
  if(S.inp!=='hole') return;
  const f=holeInfo(S, m); if(!f.n) return;
  m.tot=f.done ? Math.min(f.sum, MAX_TOT) : null; m.hio=Math.min(f.hio, MAX_HIO);
}
// コース・ホールの 数を かえた とき：同じ コースの 同じ ホールに 写す
function remapH(h, S0, S1){
  if(S0.crs===S1.crs && S0.hn===S1.hn) return h;
  const out=[];
  for(let k=0; k<Math.min(S0.crs, S1.crs); k++) for(let i=0; i<Math.min(S0.hn, S1.hn); i++){ const v=h[k*S0.hn+i]; if(v!=null) out[k*S1.hn+i]=v; }
  return cleanH(Array.from(out, v=>v==null ? null : v));
}
// 人：tot 合計（null＝まだ）・hio ホールインワンの 数・tb／tg 同じ 成績の 中で 決めた 順と その ときの 成績（tg が いまと ちがえば 決めなおし）・s 入れた 順
function cleanM(x){
  if(!x || typeof x!=='object') return null;
  const name=oneLine(x.name,24); if(!name) return null;
  return {id:okId(x.id) ? x.id : rid(), name, team:teamIn(x.team), tot:x.tot==null || x.tot==='' ? null : totIn(x.tot), hio:numIn(x.hio,0,MAX_HIO,0),
    tb:numIn(x.tb,0,MAX_M,0), tg:oneLine(x.tg,20), s:numIn(x.s,0,1e9,-1), h:cleanH(x.h)};
}
function cleanC(x){
  if(!x || typeof x!=='object') return null;
  const mem=(Array.isArray(x.mem) ? x.mem : []).map(cleanM).filter(Boolean).slice(0,MAX_M);
  mem.forEach((m,i,a)=>{ if(a.findIndex(y=>y.id===m.id)<i) m.id=rid(); });
  // 入れた 順（s）：ない・重なる ときは いまの 順で つけなおす
  const seen=new Set();
  if(mem.some(m=>{ if(m.s<0 || seen.has(m.s)) return true; seen.add(m.s); return false; })) mem.forEach((m,i)=>{ m.s=i; });
  // チームの 同じ 成績の 中で 決めた 順（チームの 名前 → {n 順, g その ときの 成績}）
  const ttb={};
  if(x.ttb && typeof x.ttb==='object') Object.keys(x.ttb).slice(0,100).forEach(k=>{ const v=x.ttb[k], t=teamIn(k); if(t && v && typeof v==='object' && typeof v.g==='string') ttb[t]={n:numIn(v.n,1,MAX_M,1), g:v.g.slice(0,40)}; });
  const set=cleanSet(x.set); mem.forEach(m=>derive(set, m));
  return {id:okId(x.id) ? x.id : rid(), title:oneLine(x.title,40)||'グラウンドゴルフ大会', date:okDate(x.date) ? x.date : '', set, mem, ttb};
}
let st=null, q='', addTeam='';   // q：さがす 字・addTeam：さっき 足した 人の チーム（続けて 同じ チームを 入れやすく。覚えない）
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const cups=(Array.isArray(o.cups) ? o.cups : []).map(cleanC).filter(Boolean).slice(0,MAX_C);
  cups.forEach((c,i,a)=>{ if(a.findIndex(y=>y.id===c.id)<i) c.id=rid(); });
  st={cups, cur:cups.some(c=>c.id===o.cur) ? o.cur : (cups[0] ? cups[0].id : ''), view:o.view==='res' ? 'res' : 'in', grp:!!o.grp, ann:!!o.ann};
  q='';
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); return false; } }
const C=()=>st.cups.find(c=>c.id===st.cur)||null;
const mOf=id=>{ const c=C(); return c ? c.mem.find(m=>m.id===id)||null : null; };
const nextS=c=>c.mem.reduce((a,m)=>Math.max(a, m.s), -1)+1;
const bySeq=(a,b)=>a.s-b.s;

/* ───────── 計算 ───────── */
// 順位に 使う 合計：入れた 合計（実打数）から ホールインワン 1回ごとに hded 打 引く。ded は calc で いまの 大会の 分に する
let ded=0;
const pt=m=>m.tot-ded*m.hio;
const keyM=m=>pt(m)+'|'+m.hio;
const fixed=m=>m.tb>0 && m.tg===keyM(m);
// 合計の 少ない 順 → ホールインワンの 多い 順 → 決めた 順 → 入れた 順
function cmpM(a,b){ return pt(a)-pt(b) || b.hio-a.hio || (fixed(a) ? a.tb : 1e6)-(fixed(b) ? b.tb : 1e6) || a.s-b.s; }
function teamsOf(c){
  const by=new Map();
  c.mem.slice().sort(bySeq).forEach(m=>{
    if(!m.team) return;
    let t=by.get(m.team); if(!t){ t={name:m.team, mem:[], n:0, sum:0, hio:0, miss:0, s:m.s}; by.set(m.team, t); }
    t.mem.push(m); if(m.tot==null){ t.miss++; return; } t.n++; t.sum+=pt(m); t.hio+=m.hio;
  });
  const avg=c.set.tmode==='avg', list=[...by.values()].filter(t=>t.n>0);
  list.forEach(t=>{ t.score=avg ? t.sum/t.n : t.sum; t.key=(avg ? t.score.toFixed(6) : String(t.sum))+'|'+t.hio; const d=c.ttb[t.name]; t.tb=d && d.g===t.key ? d.n : 0; });
  // 平均は 割らずに くらべる（48.333… と 48.25 など）
  list.sort((a,b)=>(avg ? a.sum*b.n-b.sum*a.n : a.sum-b.sum) || b.hio-a.hio || (a.tb||1e6)-(b.tb||1e6) || a.s-b.s);
  return list;
}
// 同じ ものが 続く ところ（[はじめ, おわり] の 番号）
function runs(list, key){ const g=[]; for(let i=0; i<list.length;){ let j=i; while(j+1<list.length && key(list[j+1])===key(list[i])) j++; if(j>i) g.push([i,j]); i=j+1; } return g; }
function calc(c){
  ded=c.set.hded||0;
  const S=c.set, list=c.mem.filter(m=>m.tot!=null).sort(cmpM), N=list.length;
  const booby=S.booby && N>=3 && N-1>S.ind ? N-1 : 0, bmaker=S.bmaker && N>=2 && N>S.ind ? N : 0;
  const tobi=S.tobi.filter(p=>p>S.ind && p<=N);
  const at={}, put=(p,k,l)=>{ (at[p]=at[p]||[]).push({k,l}); };   // 位 → その 位の 賞
  for(let p=1; p<=Math.min(S.ind,N); p++) put(p,'ind','個人賞');
  tobi.forEach(p=>put(p,'tobi','とび賞'));
  if(booby) put(booby,'booby','ブービー賞');
  if(bmaker) put(bmaker,'bmaker','ブービーメーカー賞');
  // 同じ 成績（合計も ⛳ も 同じ）。賞に かかる（hot）のに 順を 決めて いない ときは ⚠
  const ties=runs(list, keyM).map(([i,j])=>{ const ms=list.slice(i,j+1), hot=[]; for(let p=i+1; p<=j+1; p++) if(at[p]) hot.push(p); return {from:i+1, to:j+1, ms, hot, ok:ms.every(fixed)}; });
  const teams=teamsOf(c), tN=Math.min(S.team, teams.length);
  const tties=runs(teams, t=>t.key).map(([i,j])=>{ const ts=teams.slice(i,j+1); return {from:i+1, to:j+1, ts, hot:i<tN, ok:ts.every(t=>t.tb>0)}; });
  // ホールインワン：順位の 順（まだ 合計の ない 人は うしろ）
  const pend=c.mem.filter(m=>m.tot==null).sort(bySeq), hw=list.concat(pend).filter(m=>m.hio>0), times=hw.reduce((a,m)=>a+m.hio,0);
  return {list, N, pend, at, tobi, booby, bmaker, ties, teams, tN, tties, hio:{who:hw, times, need:S.hone ? hw.length : times, have:S.hio}};
}
const warnN=R=>R.ties.filter(t=>t.hot.length && !t.ok).length+R.tties.filter(t=>t.hot && !t.ok).length;
const scTxt=m=>m.tot==null ? 'まだ' : pt(m)+'打'+(m.hio ? '・⛳'+m.hio : '')+(ded && m.hio ? '（実打数 '+m.tot+'）' : '');
const tScTxt=(c,t)=>(c.set.tmode==='avg' ? '平均 '+fmt1(t.score)+'打' : '合計 '+t.sum+'打')+'（'+t.n+'人）'+(t.hio ? '・⛳'+t.hio : '');
const posTxt=(a,b)=>b-a===1 ? a+'位・'+b+'位' : a+'〜'+b+'位';
function hioSub(c, H){
  const S=c.set;
  if(!H.times) return 'まだ 出て いません'+(S.hio ? '（用意 '+S.hio+'個）' : '');
  return (S.hone ? H.who.length+'人（1人 1つ）' : H.times+'回')+(S.hio ? ' ／ 用意 '+S.hio+'個'+(H.need<=S.hio ? '・のこり '+(S.hio-H.need)+'個' : '・'+(H.need-S.hio)+'個 たりない') : '');
}
// 賞の 一覧（ふだんの 順）。rows：lab 位・name・team・sc 成績・mem チームの 人・p 位の 数・m 人／tm チーム（Excel に 数で 出す とき）
function sections(c, R){
  const S=c.set, L=R.list, out=[], medal=['🥇','🥈','🥉'];
  const row=(p, lab)=>{ const m=L[p-1]; return {lab:lab||p+'位', p, m, name:m.name, team:m.team, sc:scTxt(m)}; };
  const ind=Math.min(S.ind, R.N);
  if(ind) out.push({k:'ind', ic:'🥇', t:'個人賞', rows:Array.from({length:ind}, (_,i)=>row(i+1, (medal[i]||'')+(i+1)+'位'))});
  if(R.tN) out.push({k:'team', ic:'👥', t:'チーム賞', rows:R.teams.slice(0, R.tN).map((t,i)=>({lab:(i+1)+'位', p:i+1, tm:t, name:t.name, team:'', sc:tScTxt(c, t), mem:t.mem.map(m=>m.name).join('・')}))});
  if(R.tobi.length) out.push({k:'tobi', ic:'🎯', t:'とび賞', rows:R.tobi.map(p=>row(p))});
  if(R.booby) out.push({k:'booby', ic:'🎈', t:'ブービー賞', rows:[row(R.booby)]});
  if(R.bmaker) out.push({k:'bmaker', ic:'🎈', t:'ブービーメーカー賞', rows:[row(R.bmaker)]});
  out.push({k:'hio', ic:'⛳', t:'ホールインワン賞', sub:hioSub(c, R.hio), rows:R.hio.who.map(m=>({lab:m.hio+'回', m, name:m.name, team:m.team, sc:''}))});
  if(R.N) out.push({k:'sanka', ic:'🎁', t:'参加賞', sub:R.N+'人', rows:[]});
  return out;
}
// 🎤 発表の 順：ホールインワン → ブービー → とび賞（下の 位から）→ チーム賞 → 個人賞（5位 → 1位）→ 参加賞
function annOrder(secs){
  return ['hio','bmaker','booby','tobi','team','ind','sanka'].map(k=>secs.find(s=>s.k===k)).filter(Boolean)
    .map(s=>['tobi','team','ind'].includes(s.k) ? Object.assign({}, s, {rows:s.rows.slice().reverse()}) : s);
}
// 気を つける こと（⚠ 以外）
function notes(c, R){
  const S=c.set, out=[];
  if(R.pend.length) out.push('まだ 合計が 入って いない 人が '+R.pend.length+'人 います（順位に 入りません）：'+R.pend.map(m=>m.name).join('・'));
  Object.keys(R.at).filter(p=>R.at[p].length>1).forEach(p=>out.push(p+'位は '+R.at[p].map(x=>x.l).join('と ')+'が 重なって います'));
  const low=S.tobi.filter(p=>p<=S.ind), far=S.tobi.filter(p=>p>S.ind && p>R.N);
  if(low.length) out.push('とび賞の '+low.join('・')+'位は 個人賞と 同じなので 出しません');
  if(far.length && R.N) out.push('とび賞の '+far.join('・')+'位は 人数（'+R.N+'人）より 下なので ありません');
  if(S.tmode==='sum' && R.teams.length>1 && new Set(R.teams.map(t=>t.mem.length)).size>1) out.push('人数の ちがう チームが あります（⚙ で チームの 成績を「平均」に できます）');
  const miss=R.teams.filter(t=>t.miss); if(miss.length) out.push('まだ 合計が 入って いない 人の いる チーム：'+miss.map(t=>t.name).join('・'));
  if(R.hio.have && R.hio.need>R.hio.have) out.push('ホールインワン賞が '+(R.hio.need-R.hio.have)+'個 たりません（用意 '+R.hio.have+'個・要る '+R.hio.need+'個）');
  return out;
}

/* ───────── 画面 ───────── */
const RULE=c=>{ const S=c.set; return [S.ind ? '個人 '+S.ind+'位まで' : '', S.team ? 'チーム '+(S.team>1 ? S.team+'位まで' : '1位') : '', S.tobi.length ? 'とび '+S.tobi.join('・')+'位' : '',
  S.booby ? 'ブービー' : '', S.bmaker ? 'ブービーメーカー' : '', 'ホールインワン'+(S.hio ? ' '+S.hio+'個' : ''), S.hded ? 'ホールインワン 1回 −'+S.hded+'打' : ''].filter(Boolean).join('・'); };
const inpTxt=S=>S.inp==='hole' ? 'ホールごとの スコア（'+(S.crs>1 ? 'A〜'+CL(S.crs-1)+' の '+S.crs+'コース × ' : '')+S.hn+'ホール）' : '合計と ホールインワン';
function sumN(c, R){
  const mid=c.set.inp==='hole' ? R.pend.filter(m=>holeInfo(c.set, m).n).length : 0;   // ホールごと：入れて いる 途中の 人
  return `<span>入れた <b>${R.N}</b>／${c.mem.length}人</span><span>⛳ ホールインワン <b>${R.hio.times}</b>回</span>`
    +(R.pend.length ? `<span class="pend">まだ ${R.pend.length}人${mid ? '（途中 '+mid+'人）' : ''}</span>` : c.mem.length ? '<span class="ok">ぜんぶ 入りました ✓</span>' : '');
}
function render(){
  const b=$('ggBody'); if(!b) return;
  const c=C(), top=b.scrollTop;
  if(!c){
    b.innerHTML=`<div class="gg-wrap"><div class="gg-empty"><p>グラウンドゴルフの 大会の 成績を まとめます。<br>1人ずつ <b>合計</b>と <b>ホールインワンの 数</b>を 入れるだけで、順位と 賞（個人賞・チーム賞・とび賞・ブービー賞・ホールインワン賞）が 出ます。</p>
      <button type="button" class="gg-b pri" onclick="GGOLF.newCup()">＋ 新しい 大会を 作る</button>
      <p><button type="button" class="gg-b" onclick="GGOLF.xl()">📁 Excel で 名簿を 入れる</button></p><p class="gg-note">Excel の ひな形を 書き出して 名簿を 書き、読み込むと 大会が できます（AI（Claude など）で 作った 表も 読めます）。</p></div></div>`;
    return;
  }
  const R=calc(c), wn=warnN(R);
  b.innerHTML=`<div class="gg-wrap">
    <div class="gg-top"><select class="gg-sel" aria-label="大会を えらぶ" onchange="GGOLF.sel(this.value)">${st.cups.map(x=>`<option value="${x.id}"${x.id===c.id ? ' selected' : ''}>${esc(x.title)}${x.date ? '（'+md(x.date)+'）' : ''}</option>`).join('')}</select>
      <button type="button" class="gg-b" onclick="GGOLF.newCup()">＋ 新しい 大会</button><button type="button" class="gg-b" onclick="GGOLF.setup()" aria-label="大会と 賞の 設定">⚙ 設定</button></div>
    <div class="gg-sum"><div class="h"><b>${esc(c.title)}</b>${c.date ? `<span>📅 ${esc(jd(c.date))}</span>` : ''}</div>
      <div class="n" id="ggSumN">${sumN(c, R)}</div>
      <div class="r"><span>賞：${esc(RULE(c))}</span></div>
      <div class="r"><span>入力：${esc(inpTxt(c.set))}</span><button type="button" class="gg-lnk" onclick="GGOLF.setup()">⚙ かえる</button></div></div>
    <div class="gg-tabs" role="tablist">${[['in','✏ 成績を 入れる'],['res','🏆 順位・賞']].map(([v,t])=>`<button type="button" role="tab" aria-selected="${st.view===v}" class="${st.view===v ? 'on' : ''}" onclick="GGOLF.view('${v}')">${t}${v==='res' && wn ? ' <i class="wn">⚠</i>' : ''}</button>`).join('')}</div>
    ${st.view==='res' ? resHtml(c, R) : inHtml(c)}</div>`;
  b.scrollTop=top;
}
// ✏ 成績を 入れる
function inHtml(c){
  const teams=[...new Set(c.mem.slice().sort(bySeq).map(m=>m.team).filter(Boolean))], hole=c.set.inp==='hole';
  const add=hole ? `<div class="gg-add">
    <div class="r"><input id="ggANm" type="text" maxlength="24" placeholder="名前" aria-label="足す 人の 名前" enterkeyhint="next" autocomplete="off"><input id="ggATm" type="text" maxlength="16" placeholder="チーム" aria-label="足す 人の チーム（なくても よい）" enterkeyhint="done" list="ggTeams" autocomplete="off" value="${esc(addTeam)}"></div>
    <div class="r"><button type="button" class="gg-b pri" onclick="GGOLF.quick()">＋ 足して スコアを 入れる</button></div>
    <datalist id="ggTeams">${teams.map(t=>`<option value="${esc(t)}"></option>`).join('')}</datalist></div>` : `<div class="gg-add">
    <div class="r"><input id="ggANm" type="text" maxlength="24" placeholder="名前" aria-label="足す 人の 名前" enterkeyhint="next" autocomplete="off"><input id="ggATm" type="text" maxlength="16" placeholder="チーム" aria-label="足す 人の チーム（なくても よい）" enterkeyhint="next" list="ggTeams" autocomplete="off" value="${esc(addTeam)}"></div>
    <div class="r"><label class="f"><span>合計</span><input id="ggATot" type="text" inputmode="numeric" enterkeyhint="done" aria-label="足す 人の 合計（打数）" autocomplete="off"><em>打</em></label>
      <span class="gg-step" role="group" aria-label="足す 人の ホールインワン"><b class="ic" aria-hidden="true">⛳</b><button type="button" onclick="GGOLF.aHio(-1)" aria-label="ホールインワンを 1つ 減らす">−</button><input id="ggAHio" type="text" inputmode="numeric" enterkeyhint="done" value="0" aria-label="足す 人の ホールインワンの 数" autocomplete="off"><button type="button" onclick="GGOLF.aHio(1)" aria-label="ホールインワンを 1つ 増やす">＋</button></span>
      <button type="button" class="gg-b pri" onclick="GGOLF.quick()">＋ 入れる</button></div>
    <datalist id="ggTeams">${teams.map(t=>`<option value="${esc(t)}"></option>`).join('')}</datalist></div>`;
  const list=c.mem.length ? `<div class="gg-lh"><b>名簿（${c.mem.length}人）</b>${teams.length ? `<label class="gg-ck"><input type="checkbox" ${st.grp ? 'checked' : ''} onchange="GGOLF.grp(this.checked)"> チームごと</label>` : ''}</div>
    ${c.mem.length>=12 ? `<input class="gg-q" id="ggQ" type="search" placeholder="🔎 名前・チームで さがす" aria-label="名前・チームで さがす" value="${esc(q)}" oninput="GGOLF.find(this.value)" autocomplete="off">` : ''}
    <div id="ggListBox">${listHtml(c)}</div>`
    : '<p class="gg-note">まだ だれも いません。上の 欄で 1人ずつ 足すか、下の「📝 まとめて 入れる」「📇 名簿から」「📁 Excel」で 名簿を 入れてください。</p>';
  return add+list+`<div class="gg-acts"><button type="button" class="gg-b" onclick="GGOLF.bulk()">📝 まとめて 入れる</button><button type="button" class="gg-b" onclick="GGOLF.pick()">📇 名簿から</button><button type="button" class="gg-b" onclick="GGOLF.xl()">📁 Excel</button></div>
    <p class="gg-note">${hole ? '「📝 スコア」で ホールごとの 打数を 入れます（1 は ホールインワン）。ぜんぶの ホールが 入ると 合計が 出て「🏆 順位・賞」に 入ります。「次の 人 →」で 続けて 入れられます。'
      : '合計（打数）と ホールインワンの 数を 入れると「🏆 順位・賞」に 順位と 賞が 出ます。合計を 打って Enter で 次の 人へ 進みます。'}名前を 押すと 直す・消す が できます。ホールごとに 入れるか 合計だけに するかは ⚙ 設定で えらべます。</p>`;
}
function listHtml(c){
  if(c.mem.length<12) q='';   // 🔎 が 出ない ときは しぼらない
  const k=norm(q), all=c.mem.slice().sort(bySeq), no=new Map(all.map((m,i)=>[m.id, i+1]));
  const ms=all.filter(m=>!k || norm(m.name).includes(k) || norm(m.team).includes(k));
  if(!ms.length) return '<p class="gg-note">当てはまる 人は いません。</p>';
  const row=c.set.inp==='hole' ? m=>rowHole(c, m, no.get(m.id)) : m=>rowHtml(m, no.get(m.id));
  if(!st.grp || !c.mem.some(m=>m.team)) return `<div class="gg-list">${ms.map(row).join('')}</div>`;
  const keys=[...new Set(ms.map(m=>m.team))].sort((a,b)=>a==='' ? 1 : b==='' ? -1 : a.localeCompare(b,'ja',{numeric:true}));
  return keys.map(t=>`<h5 class="gg-gh" data-team="${esc(t)}">${esc(t||'チームなし')}<small>${esc(grpSub(c, t))}</small></h5><div class="gg-list">${ms.filter(m=>m.team===t).map(row).join('')}</div>`).join('');
}
function grpSub(c, t){
  const g=c.mem.filter(m=>m.team===t), d=g.filter(m=>m.tot!=null), h=g.reduce((a,m)=>a+m.hio,0);
  return g.length+'人'+(d.length ? '・合計 '+d.reduce((a,m)=>a+m.tot,0)+'打' : '')+(h ? '・⛳'+h : '')+(d.length<g.length ? '・まだ '+(g.length-d.length)+'人' : '');
}
function rowHtml(m, no){
  const n=esc(m.name);
  return `<div class="gg-row${m.tot==null ? ' empty' : ''}" data-id="${m.id}"><span class="no">${no}</span>
    <button type="button" class="nm" onclick="GGOLF.edit('${m.id}')" aria-label="${n}（押すと 直す）">${n}${m.team ? `<small>${esc(m.team)}</small>` : ''}</button>
    <span class="ent"><span class="sc"><input class="gg-tot" type="text" inputmode="numeric" enterkeyhint="next" data-id="${m.id}" value="${m.tot==null ? '' : m.tot}" placeholder="合計" aria-label="${n}の 合計（打数）" autocomplete="off"><em>打</em></span>
    <span class="gg-step${m.hio ? ' on' : ''}" role="group" aria-label="${n}の ホールインワン"><button type="button" onclick="GGOLF.hio('${m.id}',-1)" aria-label="${n}の ホールインワンを 1つ 減らす"${m.hio ? '' : ' disabled'}>−</button><b class="hv">⛳${m.hio}</b><button type="button" onclick="GGOLF.hio('${m.id}',1)" aria-label="${n}の ホールインワンを 1つ 増やす">＋</button></span></span></div>`;
}
// ホールごとの 名簿の 行：合計（途中・合計だけ）と「📝 スコア」
function rowHole(c, m, no){
  const f=holeInfo(c.set, m), n=esc(m.name);
  const sc=f.n ? (f.done ? `<b>${f.sum}</b>打` : `途中 ${f.sum}打<small>（あと ${f.N-f.n}）</small>`) : m.tot!=null ? `<b>${m.tot}</b>打<small>（合計だけ）</small>` : '<small>まだ</small>';
  return `<div class="gg-row${m.tot==null ? ' empty' : ''}" data-id="${m.id}"><span class="no">${no}</span>
    <button type="button" class="nm" onclick="GGOLF.edit('${m.id}')" aria-label="${n}（押すと 直す）">${n}${m.team ? `<small>${esc(m.team)}</small>` : ''}</button>
    <span class="ent"><span class="hs">${sc}${m.hio ? `<i>⛳${m.hio}</i>` : ''}</span><button type="button" class="gg-b sm pri" onclick="GGOLF.card('${m.id}')" aria-label="${n}の スコアを 入れる">📝 スコア</button></span></div>`;
}
// 入れた ところだけ 書きかえる（打って いる 欄を 作り直さない）
function refresh(c){
  const R=calc(c), n=$('ggSumN'); if(n) n.innerHTML=sumN(c, R);
  document.querySelectorAll('#ggBody .gg-gh').forEach(h=>{ const s=h.querySelector('small'); if(s) s.textContent=grpSub(c, h.dataset.team||''); });
  const tb=document.querySelector('#ggBody .gg-tabs button:last-child'); if(tb) tb.innerHTML='🏆 順位・賞'+(warnN(R) ? ' <i class="wn">⚠</i>' : '');
}
// 🏆 順位・賞
function resHtml(c, R){
  if(!c.mem.length) return '<p class="gg-note">まだ だれも いません。「✏ 成績を 入れる」で 名前と 合計を 入れてください。</p>';
  if(!R.N) return '<p class="gg-note">合計を 入れると、ここに 順位と 賞が 出ます。</p>';
  const w=R.ties.filter(t=>t.hot.length && !t.ok).map(t=>`<div class="w"><span>${posTxt(t.from, t.to)}：${t.ms.map(m=>esc(m.name)).join('・')}（${pt(t.ms[0])}打${t.ms[0].hio ? '・⛳'+t.ms[0].hio : ''}）</span><button type="button" class="gg-b sm" onclick="GGOLF.fix('${t.ms[0].id}')">✓ この 順で 決める</button></div>`)
    .concat(R.tties.filter(t=>t.hot && !t.ok).map(t=>`<div class="w"><span>チーム ${posTxt(t.from, t.to)}：${t.ts.map(x=>esc(x.name)).join('・')}</span><button type="button" class="gg-b sm" onclick="GGOLF.tfix(${t.from})">✓ この 順で 決める</button></div>`));
  const nt=notes(c, R);
  let secs=sections(c, R); if(st.ann) secs=annOrder(secs);
  return (w.length ? `<div class="gg-warn" role="status"><b>⚠ 同じ 成績で 賞が かわる 人が います</b>${w.join('')}<small>じゃんけん・年上 など 大会の 決まりで 決めて、下の 順位の ▲ で 並べかえてから「✓ この 順で 決める」を 押します。</small></div>` : '')
    +(nt.length ? `<ul class="gg-info">${nt.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : '')
    +`<div class="gg-prz"><div class="gg-ph2"><b>🏆 賞</b><label class="gg-ck"><input type="checkbox" ${st.ann ? 'checked' : ''} onchange="GGOLF.ann(this.checked)"> 🎤 発表の 順</label></div>
      ${secs.map(s=>`<div class="sec k-${s.k}"><div class="st"><span class="ic" aria-hidden="true">${s.ic}</span><b>${s.t}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</div>`
        +s.rows.map(r=>`<div class="pr"><span class="lb">${esc(r.lab)}</span><span class="nm">${esc(r.name)}${r.team ? `<small>（${esc(r.team)}）</small>` : ''}</span>${r.sc ? `<span class="sc">${esc(r.sc)}</span>` : ''}${r.mem ? `<small class="mm">${esc(r.mem)}</small>` : ''}</div>`).join('')+'</div>').join('')}</div>`
    +rankHtml(c, R)+teamHtml(c, R)
    +`<div class="gg-acts"><button type="button" class="gg-b" onclick="GGOLF.print()">🖨 印刷</button><button type="button" class="gg-b" onclick="GGOLF.copy()">📋 コピー</button><button type="button" class="gg-b" onclick="GGOLF.table()">▦ 表に 入れる</button><button type="button" class="gg-b" onclick="GGOLF.xlRes()">📊 Excel</button></div>
    <p class="gg-note">順位は 合計の 少ない 順${c.set.hded ? '（合計は 実打数から ホールインワン 1回で '+c.set.hded+'打 引いた 数）' : ''}、同じ ときは ホールインワンの 多い 順です。それも 同じ 人には「同点」と 出ます。</p>`;
}
function rankHtml(c, R){
  const tie=new Map(); R.ties.forEach(t=>t.ms.forEach((m,i)=>tie.set(m.id, {t, i})));
  return `<h4 class="gg-h4">📋 順位（${R.N}人）</h4><div class="gg-rk">${R.list.map((m,i)=>{
    const p=i+1, pz=R.at[p]||[], ti=tie.get(m.id), n=esc(m.name), x=crsTxt(c, m);
    const sub=(m.team ? `<small>${esc(m.team)}</small>` : '')+(x ? `<small>${esc(x)}</small>` : '')+pz.map(x=>`<i class="bd k-${x.k}">${x.l}</i>`).join('')+(ti ? '<i class="bd tie">同点</i>' : '');
    return `<div class="gg-rr${pz.length ? ' hot' : ''}${ti && ti.t.hot.length && !ti.t.ok ? ' warn' : ''}" data-id="${m.id}"><span class="p">${p}</span><span class="nm"><b>${n}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</span>
      <span class="sc"><b>${pt(m)}</b><small>打</small>${m.hio ? `<i class="h">⛳${m.hio}</i>` : ''}${ded && m.hio ? `<small class="raw">実 ${m.tot}</small>` : ''}</span>${ti && ti.i>0 ? `<button type="button" class="gg-up" onclick="GGOLF.up('${m.id}')" aria-label="${n}を 同点の 中で 1つ 上へ">▲</button>` : ''}</div>`; }).join('')}</div>`;
}
function teamHtml(c, R){
  if(!R.teams.length) return c.mem.some(m=>m.team) ? '' : '<p class="gg-note">チームを 入れると、チームの 順位と チーム賞も 出ます（名前を 押して チームを 入れるか、「名前／チーム」で まとめて 入れます）。</p>';
  const tie=new Map(); R.tties.forEach(t=>t.ts.forEach((x,i)=>tie.set(x, {t, i}))); const avg=c.set.tmode==='avg';
  return `<h4 class="gg-h4">👥 チームの 順位（${avg ? '平均' : '合計'}）</h4><div class="gg-rk">${R.teams.map((t,i)=>{
    const p=i+1, ti=tie.get(t), pz=p<=R.tN;
    return `<div class="gg-rr team${pz ? ' hot' : ''}${ti && ti.t.hot && !ti.t.ok ? ' warn' : ''}"><span class="p">${p}</span><span class="nm"><b>${esc(t.name)}</b><span class="sub">${pz ? `<i class="bd k-team">${R.tN>1 ? 'チーム '+p+'位' : 'チーム賞'}</i>` : ''}${ti ? '<i class="bd tie">同点</i>' : ''}<small>${esc(t.mem.map(m=>m.name).join('・'))}${t.miss ? '（まだ '+t.miss+'人）' : ''}</small></span></span>
      <span class="sc"><b>${avg ? fmt1(t.score) : t.sum}</b><small>打</small>${t.hio ? `<i class="h">⛳${t.hio}</i>` : ''}</span>${ti && ti.i>0 ? `<button type="button" class="gg-up" onclick="GGOLF.tup(${p})" aria-label="${esc(t.name)}を 同点の 中で 1つ 上へ">▲</button>` : ''}</div>`; }).join('')}</div>`;
}

/* ───────── 小さな窓 ───────── */
let pop=null;
function popOpen(html, kind, id){
  popClose();
  const host=document.querySelector('#ggolfOverlay .gg-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='gg-pop-bg';
  el.innerHTML=`<div class="gg-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  pop={el, kind, id, rel:null};
  const me=pop; pop.rel=modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } });
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }
const ph=t=>`<div class="gg-ph"><b>${t}</b><button type="button" class="gg-x" onclick="GGOLF.close()" aria-label="閉じる">✕</button></div>`;
const val=k=>{ const e=$(k); return e ? e.value : ''; };
// ＋ 新しい 大会（前の 大会の 名簿・賞の 決め方を 写せる）
function newCup(){
  if(st.cups.length>=MAX_C){ toastS('大会は '+MAX_C+' まで です。古い 大会を 消してください'); return; }
  const prev=C();
  popOpen(ph('＋ 新しい 大会')+`
    <label class="gg-f"><span>大会の 名前</span><input id="ggNTitle" type="text" maxlength="40" placeholder="例：秋の グラウンドゴルフ大会" enterkeyhint="done" onkeydown="if(event.key==='Enter' &amp;&amp; !event.isComposing){ event.preventDefault(); GGOLF.newGo(); }"></label>
    <label class="gg-f"><span>日付</span><input id="ggNDate" type="date" value="${ymd(new Date())}"></label>
    ${prev && prev.mem.length ? `<label class="gg-ck2"><input id="ggNCopy" type="checkbox" checked> 「${esc(prev.title)}」の 名簿（${prev.mem.length}人・チームも）を 写す（成績は 空で 始めます）</label>` : ''}
    <p class="gg-help">${prev ? '賞の 決め方は「'+esc(prev.title)+'」と 同じに します。' : '賞は はじめ 個人賞 5位まで・チーム賞 1位・とび賞 10・15・20・25位・ブービー賞・ホールインワン賞（用意 15個）です。'}あとから ⚙ 設定で かえられます。</p>
    <div class="gg-acts end"><button type="button" class="gg-b" onclick="GGOLF.close()">やめる</button><button type="button" class="gg-b pri" onclick="GGOLF.newGo()">✓ 作る</button></div>`, 'new');
}
function newGo(){ const cp=$('ggNCopy'); newCupGo({title:val('ggNTitle'), date:val('ggNDate'), copy:!!(cp && cp.checked)}); }
// 作る（o：title・date・copy）
function newCupGo(o){
  o=o||{}; if(st.cups.length>=MAX_C){ toastS('大会は '+MAX_C+' まで です。古い 大会を 消してください'); return null; }
  const prev=C();
  const nc=cleanC({title:oneLine(o.title,40)||'グラウンドゴルフ大会', date:o.date===undefined ? ymd(new Date()) : (okDate(o.date) ? o.date : ''), set:Object.assign({}, prev ? prev.set : {}, o.set||{}), mem:[]});
  if(o.copy && prev) nc.mem=prev.mem.slice().sort(bySeq).map((m,i)=>cleanM({name:m.name, team:m.team, s:i})).filter(Boolean);
  st.cups.push(nc); st.cur=nc.id; st.view='in'; q=''; save(); popClose(); render();
  toastS('⛳「'+nc.title+'」を 作りました');
  return nc.id;
}
// ⚙ 大会と 賞の 決め方
function openSetup(){
  const c=C(); if(!c) return; const S=c.set;
  popOpen(ph('⚙ 大会と 賞の 決め方')+`
    <label class="gg-f"><span>大会の 名前</span><input id="ggSTitle" type="text" maxlength="40" value="${esc(c.title)}"></label>
    <label class="gg-f"><span>日付</span><input id="ggSDate" type="date" value="${esc(c.date)}"></label>
    <div class="gg-sep"></div>
    <div class="gg-f" role="radiogroup" aria-label="入力の しかた"><span>入力の しかた</span>
      <label class="gg-rad"><input type="radio" name="ggSInp" value="tot"${S.inp==='tot' ? ' checked' : ''} onchange="GGOLF.sInp(this.value)"> 合計と ホールインワン</label>
      <label class="gg-rad"><input type="radio" name="ggSInp" value="hole"${S.inp==='hole' ? ' checked' : ''} onchange="GGOLF.sInp(this.value)"> ホールごとの スコア（全コース）</label></div>
    <div class="gg-f" id="ggSHoleRow"${S.inp==='hole' ? '' : ' hidden'}><span>コースと ホール</span><input id="ggSCrs" class="sm" type="text" inputmode="numeric" value="${S.crs}" aria-label="コースの 数"><em>コース ×</em><input id="ggSHn" class="sm" type="text" inputmode="numeric" value="${S.hn}" aria-label="1コースの ホールの 数"><em>ホール（ふつうは 8）</em></div>
    <div class="gg-sep"></div>
    <label class="gg-f"><span>個人賞</span><em>上位</em><input id="ggSInd" class="sm" type="text" inputmode="numeric" value="${S.ind}"><em>人まで（0＝なし）</em></label>
    <label class="gg-f"><span>チーム賞</span><em>上位</em><input id="ggSTeam" class="sm" type="text" inputmode="numeric" value="${S.team}"><em>チームまで（0＝なし）</em></label>
    <div class="gg-f" role="radiogroup" aria-label="チームの 成績"><span>チームの 成績</span><label class="gg-rad"><input type="radio" name="ggSTm" value="sum"${S.tmode==='sum' ? ' checked' : ''}> 合計</label><label class="gg-rad"><input type="radio" name="ggSTm" value="avg"${S.tmode==='avg' ? ' checked' : ''}> 平均（人数が ちがう とき）</label></div>
    <label class="gg-f"><span>とび賞</span><input id="ggSTobi" type="text" inputmode="numeric" value="${S.tobi.join('、')}" placeholder="例：10、15、20、25（空＝なし）"><em>位</em></label>
    <label class="gg-ck2"><input id="ggSBooby" type="checkbox"${S.booby ? ' checked' : ''}> ブービー賞（下から 2番め）</label>
    <label class="gg-ck2"><input id="ggSBmaker" type="checkbox"${S.bmaker ? ' checked' : ''}> ブービーメーカー賞（いちばん 下）</label>
    <label class="gg-f"><span>ホールインワン賞</span><em>用意</em><input id="ggSHio" class="sm" type="text" inputmode="numeric" value="${S.hio}"><em>個（たりるか 見ます。0＝見ない）</em></label>
    <label class="gg-ck2"><input id="ggSHone" type="checkbox"${S.hone ? ' checked' : ''}> ホールインワン賞は 1人 1つ まで（何回 出ても）</label>
    <label class="gg-f"><span>ホールインワンで 引く</span><em>1回で 合計から</em><input id="ggSHded" class="sm" type="text" inputmode="numeric" value="${S.hded}"><em>打 引く（0＝引かない。大会の 決まりで 3打 など）</em></label>
    <div class="gg-acts end"><button type="button" class="gg-b" onclick="GGOLF.close()">やめる</button><button type="button" class="gg-b pri" onclick="GGOLF.setupSave()">✓ 保存</button></div>
    <div class="gg-sep"></div>
    <div class="gg-acts"><button type="button" class="gg-b" onclick="GGOLF.clear()">🧹 成績を 空に する（名簿は 残す）</button><button type="button" class="gg-b warn" onclick="GGOLF.delCup()">🗑 この 大会を 消す</button></div>`, 'setup');
}
function setupSave(){
  const c=C(); if(!c) return;
  const ck=k=>{ const e=$(k); return !!(e && e.checked); }, tm=document.querySelector('#ggolfOverlay input[name="ggSTm"]:checked');
  c.title=oneLine(val('ggSTitle'),40)||c.title; c.date=okDate(val('ggSDate')) ? val('ggSDate') : '';
  const ip=document.querySelector('#ggolfOverlay input[name="ggSInp"]:checked'), S0=c.set;
  const S1=cleanSet({ind:val('ggSInd'), team:val('ggSTeam'), tmode:tm ? tm.value : 'sum', tobi:val('ggSTobi'), booby:ck('ggSBooby'), bmaker:ck('ggSBmaker'), hio:val('ggSHio'), hone:ck('ggSHone'), hded:$('ggSHded') ? val('ggSHded') : S0.hded,
    inp:ip ? ip.value : S0.inp, crs:$('ggSCrs') ? val('ggSCrs') : S0.crs, hn:$('ggSHn') ? val('ggSHn') : S0.hn});
  setSet(c, S1);
  save(); popClose(); render(); toastS('✓ 保存しました'+(S1.inp!==S0.inp ? '（入力：'+inpTxt(S1)+'）' : ''));
}
// 決め方を かえる（コース・ホールの 数が かわれば スコアを 写しなおし、ホールごとの ときは 合計を 出しなおす）
function setSet(c, S1){
  const S0=c.set;
  c.mem.forEach(m=>{ const had=(m.h||[]).some(v=>v!=null); m.h=remapH(m.h||[], S0, S1); if(had && !m.h.length && S1.inp==='hole'){ m.tot=null; m.hio=0; } });
  c.set=S1; c.mem.forEach(m=>derive(S1, m));
}
function sInp(v){ const r=$('ggSHoleRow'); if(r) r.hidden=v!=='hole'; }
async function clearScores(){
  const c=C(); if(!c) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+c.title+'」の 合計と ホールインワンを ぜんぶ 空に しますか？（名簿と チームは 残ります）', '空に する', 'やめる'))) return;
  c.mem.forEach(m=>{ m.tot=null; m.hio=0; m.tb=0; m.tg=''; m.h=[]; }); c.ttb={}; save(); popClose(); render();
}
async function delCup(){
  const c=C(); if(!c) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+c.title+'」を 消しますか？（名簿と 成績も 消えます）', '消す', 'やめる'))) return;
  st.cups=st.cups.filter(x=>x.id!==c.id); st.cur=st.cups[0] ? st.cups[0].id : ''; q=''; save(); popClose(); render();
}
// ✏ 1人を 直す
function openEdit(id){
  const c=C(), m=mOf(id); if(!c || !m) return;
  const teams=[...new Set(c.mem.map(x=>x.team).filter(Boolean))];
  popOpen(ph('✏ '+esc(m.name))+`
    <label class="gg-f"><span>名前</span><input id="ggEName" type="text" maxlength="24" value="${esc(m.name)}"></label>
    <label class="gg-f"><span>チーム</span><input id="ggETeam" type="text" maxlength="16" value="${esc(m.team)}" placeholder="例：A・1班（なくても よい）" list="ggTeamsE" autocomplete="off"></label>
    <datalist id="ggTeamsE">${teams.map(t=>`<option value="${esc(t)}"></option>`).join('')}</datalist>
    ${c.set.inp==='hole' ? `<div class="gg-f"><span>スコア</span><em class="gg-esc">${esc(scoreTxt(c, m))}</em></div>
    <div class="gg-acts"><button type="button" class="gg-b pri" onclick="GGOLF.editCard('${m.id}')">📝 ホールごとの スコアを 入れる</button></div>`
    : `<label class="gg-f"><span>合計</span><input id="ggETot" type="text" inputmode="numeric" value="${m.tot==null ? '' : m.tot}" placeholder="まだ"><em>打</em></label>
    <label class="gg-f"><span>ホールインワン</span><input id="ggEHio" type="text" inputmode="numeric" value="${m.hio}"><em>回</em></label>`}
    <div class="gg-acts end"><button type="button" class="gg-b warn" onclick="GGOLF.delM('${m.id}')">🗑 消す</button><button type="button" class="gg-b" onclick="GGOLF.close()">やめる</button><button type="button" class="gg-b pri" onclick="GGOLF.editSave('${m.id}')">✓ 保存</button></div>`, 'edit', id);
}
function editSave(id){
  const c=C(), m=mOf(id); if(!c || !m) return false;
  const name=oneLine(val('ggEName'),24); if(!name){ toastS('名前を 入れてください'); return false; }
  if(c.set.inp!=='hole'){   // ホールごとの ときの 合計と ⛳ は スコアから
    const raw=String(val('ggETot')).trim(), tot=raw==='' ? null : totIn(raw);
    if(raw!=='' && tot==null){ toastS('合計は 1〜'+MAX_TOT+' の 数で 入れてください'); return false; }
    m.tot=tot; m.hio=numIn(val('ggEHio'),0,MAX_HIO,0);
  }
  m.name=name; m.team=teamIn(val('ggETeam'));
  save(); popClose(); render(); return true;
}
function editCard(id){ if(editSave(id)) openCard(id); }
// スコアの ようす（直す 窓）
function scoreTxt(c, m){
  const f=holeInfo(c.set, m), x=crsTxt(c, m);
  if(!f.n) return m.tot!=null ? '合計だけ '+m.tot+'打'+(m.hio ? '・⛳'+m.hio : '') : 'まだ';
  return (f.done ? '合計 '+f.sum+'打' : '途中 '+f.sum+'打（あと '+(f.N-f.n)+'ホール）')+(f.hio ? '・⛳'+f.hio : '')+(x ? '（'+x+'）' : '');
}
async function delM(id){
  const c=C(), m=mOf(id); if(!c || !m) return;
  if(typeof appConfirm==='function' && !(await appConfirm(m.name+' さんを 消しますか？', '消す', 'やめる'))) return;
  c.mem=c.mem.filter(x=>x.id!==id); save(); popClose(); render();
}
// 📝 まとめて 入れる
function openBulk(){
  if(!C()) return;
  popOpen(ph('📝 まとめて 入れる')+`
    <p class="gg-help">1行に 1人。「名前　合計　ホールインワン」の 順に 空白で 区切ります。チームは「名前／チーム」か、行の 頭に「チーム：」。名前だけでも 入ります（「、」で 区切っても）。Excel の 行（名前・チーム・合計・ホールインワン）を 貼っても 入ります。</p>
    <p class="gg-help">例：<code>山田 太郎／A 48 1</code>　<code>佐藤 花子／A 52</code>　<code>Bチーム：鈴木、田中、高橋</code></p>
    <p class="gg-help">数を 3つ 以上 書くと ホールごとの 打数（A コースの 1番から 順に）です：<code>鈴木 一郎／B 3 2 1 4 3 2 3 2 …</code></p>
    <textarea id="ggBulk" class="gg-ta" rows="8" placeholder="山田 太郎／A 48 1&#10;佐藤 花子／A 52&#10;鈴木 一郎／B 50 2" aria-label="まとめて 入れる 名前と 成績"></textarea>
    <p class="gg-help">もう 入って いる 名前は、その 人の 成績を 入れます（前もって 名簿だけ 入れて おけます）。</p>
    <div class="gg-acts end"><button type="button" class="gg-b" onclick="GGOLF.close()">やめる</button><button type="button" class="gg-b pri" onclick="GGOLF.bulkGo()">✓ 入れる</button></div>`, 'bulk');
}
function bulkGo(){ const arr=parseLines(val('ggBulk')); if(!arr.length){ toastS('入れる 名前が ありません'); return; } popClose(); addMany(arr); }
// 1行に 1人：「名前／チーム 合計 ホールインワン」（空白・タブ・「,」で 区切る）。数の ない 行は「、」で いくつも・「チーム：名前、名前」
function parseLines(text){
  const out=[];
  String(text||'').replace(/\r\n?/g,'\n').split('\n').forEach(line=>{
    let s=line.normalize('NFKC').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g,' ').trim(); if(!s) return;
    const nums=[];
    for(let k=0; k<MAX_H; k++){   // うしろの 数（合計・ホールインワン。3つ 以上は ホールごとの 打数）。名前に くっついた 数（佐藤2 など）は 名前の まま
      const m=/^(.*\S)[\s,、]+(?:⛳|HIO|hio|ホールインワン)?\s*(\d{1,3})\s*(?:打|回|個)?$/.exec(s); if(!m) break;
      nums.unshift(m[2]); s=m[1].trim();
    }
    if(!nums.length && !s.includes('\t')){
      const h=/^([^:、,]{1,16}):\s*(.+)$/.exec(s);   // 「Bチーム：鈴木、田中」
      const team=h ? teamIn(h[1]) : '', body=h ? h[2] : s;
      if(h || /[、,]/.test(body)){ body.split(/[、,]+/).forEach(x=>{ const p=nameTeam(x); if(p.name) out.push({name:p.name, team:p.team||team}); }); return; }
    }
    const parts=s.split(/\t|,/).map(x=>x.trim());
    const p=nameTeam(parts[0]||''); if(!p.name) return;
    const x={name:p.name, team:p.team||teamIn(parts[1])};
    if(nums.length>=3) x.h=nums.map(stIn);
    else if(nums.length){ x.tot=totIn(nums[0]); if(nums.length>1){ x.hio=numIn(nums[1],0,MAX_HIO,0); x.hioSet=true; } }
    out.push(x);
  });
  return out;
}
function nameTeam(s){ const m=/^(.*?)[／/](.*)$/.exec(String(s||'')); return m ? {name:oneLine(m[1],24), team:teamIn(m[2])} : {name:oneLine(s,24), team:''}; }
// 同じ 名前（空白・全角半角の ちがいは 見ない。チームを 書いた ときは 同じ チームか チームなし）の 人
function findM(c, name, team){ const k=nk(name); return c.mem.find(m=>nk(m.name)===k && (!team || !m.team || m.team===team))||null; }
// いれば 成績を 入れる（'upd'）・いなければ 足す（'add'）・いっぱい（'full'）
function putM(c, x){
  let m=findM(c, x.name, x.team), r='upd';
  if(m){ if(x.team) m.team=x.team; if(x.tot!=null) m.tot=x.tot; if(x.hioSet) m.hio=x.hio; }
  else{
    if(c.mem.length>=MAX_M) return 'full';
    m=cleanM({name:x.name, team:x.team, tot:x.tot, hio:x.hio||0, s:nextS(c)}); if(!m) return 'full';
    c.mem.push(m); r='add';
  }
  if(Array.isArray(x.h)) putH(c, m, x.h, x.hN);
  return r;
}
// ホールごとの 打数を 入れる。合計と ホールインワン の 大会でも、ぜんぶ ある ときは 合計と ⛳ を 出す
// need：そろって いる ホールの 数（Excel は ファイルの ホール数。まとめて 入れるは 書いた 数 ぜんぶ）
function putH(c, m, h, need){
  m.h=cleanH(h); if(!m.h.some(v=>v!=null)) return;
  if(c.set.inp==='hole'){ derive(c.set, m); return; }
  const got=m.h.filter(v=>v!=null);
  if(got.length===(need||m.h.length)){ m.tot=Math.min(got.reduce((a,v)=>a+v,0), MAX_TOT); m.hio=Math.min(got.filter(v=>v===1).length, MAX_HIO); }
}
function addMany(arr){
  const c=C(); if(!c) return null;
  const r={add:0, upd:0, full:0}; arr.forEach(x=>{ r[putM(c, x)]++; });
  save(); render();
  toastS([r.add ? r.add+'人 足しました' : '', r.upd ? r.upd+'人の 成績を 入れました' : '', r.full ? '（'+MAX_M+'人 まで です）' : ''].filter(Boolean).join('・')||'かわりませんでした', 3200);
  return r;
}
async function pick(){
  const c=C(); if(!c || typeof toolPickNames!=='function') return;
  const ns=await toolPickNames(null, {have:c.mem.map(m=>m.name)}); if(!ns || !ns.length) return;
  addMany(ns.map(n=>({name:oneLine(n,24), team:''})).filter(x=>x.name));
}
// 上の 欄で 1人 足す（同じ 名前が いれば その 人の 成績に。もう 合計が ある ときは 聞いてから）
async function quick(){
  const c=C(); if(!c) return;
  if(c.set.inp==='hole'){
    const name=oneLine(val('ggANm'),24), team=teamIn(val('ggATm'));
    if(!name){ toastS('名前を 入れてください'); const e=$('ggANm'); if(e) e.focus(); return; }
    if(putM(c, {name, team})==='full'){ toastS(MAX_M+'人 まで です'); return; }
    addTeam=team; save(); render();
    const m=findM(c, name, team); if(m) openCard(m.id);
    return;
  }
  const name=oneLine(val('ggANm'),24), team=teamIn(val('ggATm')), raw=String(val('ggATot')).trim(), tot=raw==='' ? null : totIn(raw), hio=numIn(val('ggAHio'),0,MAX_HIO,0);
  if(!name){ toastS('名前を 入れてください'); const e=$('ggANm'); if(e) e.focus(); return; }
  if(raw!=='' && tot==null){ toastS('合計は 1〜'+MAX_TOT+' の 数で 入れてください'); const e=$('ggATot'); if(e) e.focus(); return; }
  const old=findM(c, name, team);
  if(old && old.tot!=null && tot!=null && typeof appConfirm==='function'
    && !(await appConfirm(name+' さんは もう '+old.tot+'打で 入って います。入れ直しますか？\n（ちがう 人なら 名前を かえてください）', '入れ直す', 'やめる'))) return;
  const r=putM(c, {name, team, tot, hio, hioSet:hio>0 || !old});   // もう いる 人の ⛳ は、欄が 0 の ときは そのまま（名簿の ＋ で 数えた 分を 消さない）
  if(r==='full'){ toastS(MAX_M+'人 まで です'); return; }
  addTeam=team; save(); render();
  const e=$('ggANm'); if(e) e.focus();
  toastS(r==='upd' ? '✓ '+name+' さんの 成績を 入れました' : '＋ '+name+' さんを 足しました'+(tot!=null ? '（'+tot+'打）' : ''));
}
/* ── 📝 スコアカード（ホールごと。v620）：ホールを 押して えらび、下の 数を 押すと 入って 次の ホールへ。1＝ホールインワン ── */
let card=null;   // {id, pos}：入れて いる 人と ホール
function firstOpen(c, m){ const N=NH(c.set), h=m.h||[]; let p=0; while(p<N-1 && h[p]!=null) p++; return p; }
function openCard(id, pos){
  const c=C(), m=mOf(id); if(!c || !m) return;
  if(c.set.inp!=='hole'){ toastS('⚙ 設定で「ホールごとの スコア」に すると 入れられます'); return; }
  card={id, pos:pos==null ? firstOpen(c, m) : Math.max(0, Math.min(NH(c.set)-1, pos))};
  popOpen(cardHtml(c, m), 'card', id);
}
function cardHtml(c, m){
  const S=c.set, f=holeInfo(S, m), sums=crsSums(S, m), h=m.h||[], ord=c.mem.slice().sort(bySeq), i=ord.indexOf(m);
  const row=(k, a, b)=>{   // 1行に 9ホールまで
    const cells=[]; for(let j=a; j<b; j++){ const p=k*S.hn+j, v=h[p];
      cells.push(`<button type="button" class="hc${p===card.pos ? ' cur' : ''}${v===1 ? ' hio' : ''}" onclick="GGOLF.cpos(${p})" aria-label="${CL(k)}コース ${j+1}番 ${v==null ? 'まだ' : v+'打'}"><small>${j+1}</small><b>${v==null ? '' : v}</b></button>`); }
    return cells.join('');
  };
  const grid=Array.from({length:S.crs}, (_,k)=>{
    const lines=[]; for(let a=0; a<S.hn; a+=9) lines.push(`<div class="cells" style="--n:${Math.min(S.hn, 9)}">${row(k, a, Math.min(S.hn, a+9))}</div>`);
    return `<div class="gg-cr"><span class="cl">${CL(k)}</span><div class="ln">${lines.join('')}</div><span class="cs"><b>${sums[k].n ? sums[k].s : ''}</b><small>${sums[k].done ? '計' : sums[k].n ? '途中' : ''}</small></span></div>`;
  }).join('');
  const k=Math.floor(card.pos/S.hn), j=card.pos%S.hn;
  const pad=[1,2,3,4,'del',5,6,7,8,'big'].map(x=>x==='del' ? '<button type="button" class="pd del" onclick="GGOLF.cdel()" aria-label="消す">⌫</button>'
    : x==='big' ? '<button type="button" class="pd" onclick="GGOLF.cbig()" aria-label="9打 より 多い">9+</button>'
    : `<button type="button" class="pd${x===1 ? ' one' : ''}" onclick="GGOLF.cset(${x})" aria-label="${x}打${x===1 ? '（ホールインワン）' : ''}">${x}${x===1 ? '<small>⛳</small>' : ''}</button>`).join('');
  return ph('📝 '+esc(m.name)+(m.team ? '<small>（'+esc(m.team)+'）</small>' : ''))+`
    <div class="gg-ctop"><span class="now">${S.crs>1 ? CL(k)+'コース ' : ''}${j+1}番</span><span class="tot">${f.done ? '合計 <b>'+f.sum+'</b>打' : f.n ? '途中 <b>'+f.sum+'</b>打（あと '+(f.N-f.n)+'）' : 'まだ'}${f.hio ? '・⛳'+f.hio : ''}</span></div>
    <div class="gg-card">${grid}</div>
    <div class="gg-pad">${pad}</div>
    <div class="gg-acts"><button type="button" class="gg-b" onclick="GGOLF.cnext(-1)"${i<=0 ? ' disabled' : ''}>← 前の 人</button><button type="button" class="gg-b" onclick="GGOLF.cnext(1)"${i>=ord.length-1 ? ' disabled' : ''}>次の 人 →</button><button type="button" class="gg-b pri" onclick="GGOLF.close()">✓ 閉じる</button></div>`;
}
function cardRender(){
  if(!pop || pop.kind!=='card' || !card) return;
  const c=C(), m=mOf(card.id); if(!c || !m){ popClose(); return; }
  pop.id=m.id; pop.el.querySelector('.gg-pop').innerHTML=cardHtml(c, m);
}
// いまの ホールに 入れて 次へ
function cset(v){
  const c=C(), m=card && mOf(card.id); if(!c || !m) return;
  const S=c.set, N=NH(S); v=stIn(v); if(v==null) return;
  const was=holeInfo(S, m).done, h=(m.h||[]).slice(); while(h.length<N) h.push(null);
  h[card.pos]=v; m.h=cleanH(h); derive(S, m); save();
  const now=holeInfo(S, m).done;
  if(card.pos<N-1) card.pos++;
  cardRender(); render();
  if(now && !was) toastS('✓ '+m.name+' さんの スコアが そろいました（合計 '+m.tot+'打'+(m.hio ? '・⛳'+m.hio : '')+'）', 3200);
}
// ⌫：いまの ホールを 消す（空なら 1つ 前を）
function cdel(){
  const c=C(), m=card && mOf(card.id); if(!c || !m) return;
  const S=c.set, h=(m.h||[]).slice();
  if(h[card.pos]==null && card.pos>0) card.pos--;
  if(h[card.pos]!=null){ h[card.pos]=null; m.h=cleanH(h); if(!m.h.length){ m.tot=null; m.hio=0; } derive(S, m); save(); render(); }
  cardRender();
}
async function cbig(){ if(typeof appPrompt!=='function') return; const t=await appPrompt('9打 より 多い ときは 打数を 入れて ください', '9'); if(t==null) return; cset(t); }
function cpos(p){ const c=C(); if(!c || !card) return; card.pos=Math.max(0, Math.min(NH(c.set)-1, p|0)); cardRender(); }
function cnext(d){
  const c=C(), m=card && mOf(card.id); if(!c || !m) return;
  const ord=c.mem.slice().sort(bySeq), nx=ord[ord.indexOf(m)+d]; if(!nx) return;
  card={id:nx.id, pos:firstOpen(c, nx)}; cardRender();
}
function aHio(d){ const e=$('ggAHio'); if(e) e.value=String(Math.max(0, Math.min(MAX_HIO, numIn(e.value,0,MAX_HIO,0)+d))); }
// 名簿の ⛳ －／＋
function setHio(id, d){
  const c=C(), m=mOf(id); if(!c || !m) return;
  const v=Math.max(0, Math.min(MAX_HIO, m.hio+d)); if(v===m.hio) return;
  m.hio=v; save();
  const row=document.querySelector('#ggBody .gg-row[data-id="'+id+'"]');
  if(row){ row.querySelector('.hv').textContent='⛳'+v; row.querySelector('.gg-step').classList.toggle('on', v>0); row.querySelector('.gg-step button').disabled=!v; }
  refresh(c);
}
// 名簿の 合計の 欄（打つ たびに しまう）
function totFrom(el){
  const c=C(), m=mOf(el.dataset.id); if(!c || !m) return;
  const raw=String(el.value).trim(), v=raw==='' ? null : totIn(raw);
  el.classList.toggle('bad', raw!=='' && v==null);
  if(v===m.tot) return;
  m.tot=v; save();
  const row=el.closest('.gg-row'); if(row) row.classList.toggle('empty', v==null);
  refresh(c);
}
function nextTot(el){
  const all=[...document.querySelectorAll('#ggBody .gg-tot')], nx=all[all.indexOf(el)+1];
  if(nx){ nx.focus(); try{ nx.select(); }catch(_){} if(nx.scrollIntoView) nx.scrollIntoView({block:'nearest'}); return; }
  el.blur(); const c=C();
  toastS(c && c.mem.every(m=>m.tot!=null) ? '✓ ぜんぶ 入りました。「🏆 順位・賞」で 見られます' : 'いちばん 下の 人です');
}
// 同じ 成績の 中の 順を 決める（ms の 順に 1, 2, 3…）
function decide(ms){ ms.forEach((m,i)=>{ m.tb=i+1; m.tg=keyM(m); }); }
function up(id){
  const c=C(); if(!c) return;
  const t=calc(c).ties.find(t=>t.ms.some(m=>m.id===id)); if(!t) return;
  const ms=t.ms.slice(), i=ms.findIndex(m=>m.id===id); if(i<1) return;
  [ms[i-1], ms[i]]=[ms[i], ms[i-1]]; decide(ms); save(); render();
}
function fix(id){
  const c=C(); if(!c) return;
  const t=calc(c).ties.find(t=>t.ms.some(m=>m.id===id)); if(!t) return;
  decide(t.ms); save(); render(); toastS('✓ '+t.ms.map(m=>m.name).join('・')+' の 順に 決めました');
}
function tDecide(c, ts){
  Object.keys(c.ttb).forEach(k=>{ if(!c.mem.some(m=>m.team===k)) delete c.ttb[k]; });   // もう ない チームの 分は 消す
  ts.forEach((t,i)=>{ c.ttb[t.name]={n:i+1, g:t.key}; });
}
function tup(p){
  const c=C(); if(!c) return;
  const t=calc(c).tties.find(t=>p>t.from && p<=t.to); if(!t) return;
  const ts=t.ts.slice(), i=p-t.from; [ts[i-1], ts[i]]=[ts[i], ts[i-1]]; tDecide(c, ts); save(); render();
}
function tfix(p){
  const c=C(); if(!c) return;
  const t=calc(c).tties.find(t=>p>=t.from && p<=t.to); if(!t) return;
  tDecide(c, t.ts); save(); render(); toastS('✓ '+t.ts.map(x=>x.name).join('・')+' の 順に 決めました');
}
function sel(id){ if(!st.cups.some(c=>c.id===id)) return; st.cur=id; q=''; save(); render(); const b=$('ggBody'); if(b) b.scrollTop=0; }
function setView(v){ if(!['in','res'].includes(v)) return; st.view=v; save(); render(); const b=$('ggBody'); if(b) b.scrollTop=0; }
function setGrp(on){ st.grp=!!on; save(); render(); }
function setAnn(on){ st.ann=!!on; save(); render(); }
function find(v){ q=String(v==null ? '' : v).slice(0,40); const c=C(), box=$('ggListBox'); if(c && box) box.innerHTML=listHtml(c); }

/* ───────── 印刷・コピー・表に ───────── */
function docHtml(c){
  const R=calc(c), avg=c.set.tmode==='avg';
  const prz=sections(c, R).map(s=>s.rows.length
    ? s.rows.map((r,i)=>`<tr>${i===0 ? `<td rowspan="${s.rows.length}" class="k">${s.ic} ${s.t}${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</td>` : ''}<td class="c">${esc(r.lab)}</td><td class="nm">${esc(r.name)}${r.mem ? `<small>${esc(r.mem)}</small>` : ''}</td><td>${esc(r.team)}</td><td class="r">${esc(r.sc)}</td></tr>`).join('')
    : `<tr><td class="k">${s.ic} ${s.t}</td><td colspan="4">${esc(s.sub||'')}</td></tr>`).join('');
  const rk=R.list.map((m,i)=>`<tr><td class="c">${i+1}</td><td class="nm">${esc(m.name)}</td><td>${esc(m.team)}</td><td class="r">${pt(m)}${ded && m.hio ? '（実 '+m.tot+'）' : ''}</td><td class="c">${m.hio||''}</td><td>${(R.at[i+1]||[]).map(x=>x.l).join('・')}</td></tr>`).join('')
    +R.pend.map(m=>`<tr class="pend"><td class="c">—</td><td class="nm">${esc(m.name)}</td><td>${esc(m.team)}</td><td class="r">まだ</td><td class="c">${m.hio||''}</td><td></td></tr>`).join('');
  const tm=R.teams.length ? `<h2>チームの 順位（${avg ? '平均' : '合計'}）</h2><table><thead><tr><th>順位</th><th>チーム</th><th>人数</th><th>${avg ? '平均' : '合計'}</th><th>⛳</th><th>賞</th><th>メンバー</th></tr></thead><tbody>`
    +R.teams.map((t,i)=>`<tr><td class="c">${i+1}</td><td class="nm">${esc(t.name)}</td><td class="c">${t.n}${t.miss ? '（まだ '+t.miss+'）' : ''}</td><td class="r">${avg ? fmt1(t.score) : t.sum}</td><td class="c">${t.hio||''}</td><td>${i<R.tN ? 'チーム賞' : ''}</td><td>${esc(t.mem.map(m=>m.name).join('・'))}</td></tr>`).join('')+'</tbody></table>' : '';
  const S=c.set, sc=S.inp==='hole' && c.mem.some(m=>holeInfo(S, m).n) ? `<h2>スコア（ホールごと）</h2><table class="sc"><thead><tr><th>順位</th><th>名前</th>`
      +Array.from({length:S.crs}, (_,k)=>Array.from({length:S.hn}, (_,j)=>`<th>${CL(k)}${j+1}</th>`).join('')+`<th class="cs">${CL(k)}計</th>`).join('')+'<th class="cs">合計</th><th>⛳</th></tr></thead><tbody>'
      +R.list.concat(R.pend).map((m,i)=>{ const h=m.h||[], sm=crsSums(S, m), f=holeInfo(S, m);
        return `<tr${i<R.N ? '' : ' class="pend"'}><td>${i<R.N ? i+1 : '—'}</td><td class="nm">${esc(m.name)}</td>`
          +Array.from({length:S.crs}, (_,k)=>Array.from({length:S.hn}, (_,j)=>{ const v=h[k*S.hn+j]; return `<td${v===1 ? ' class="hio"' : ''}>${v==null ? '' : v}</td>`; }).join('')+`<td class="cs">${sm[k].n ? sm[k].s : ''}</td>`).join('')
          +`<td class="cs">${m.tot!=null ? m.tot : f.n ? '('+f.sum+')' : ''}</td><td>${m.hio||''}</td></tr>`; }).join('')+'</tbody></table>' : '';
  return `<div class="gg-doc"><h1>⛳ ${esc(c.title)}</h1>
    <div class="meta">${esc([jd(c.date), '参加 '+R.N+'人', 'ホールインワン '+R.hio.times+'回', R.pend.length ? 'まだ '+R.pend.length+'人' : ''].filter(Boolean).join('　'))}</div>
    <h2>賞</h2><table class="prz"><thead><tr><th>賞</th><th>位</th><th>名前</th><th>チーム</th><th>成績</th></tr></thead><tbody>${prz}</tbody></table>
    <h2>順位</h2><table><thead><tr><th>順位</th><th>名前</th><th>チーム</th><th>合計</th><th>⛳</th><th>賞</th></tr></thead><tbody>${rk}</tbody></table>
    ${tm}${sc}<div class="note">順位は 合計の 少ない 順、同じ ときは ホールインワンの 多い 順。${sc ? '（ ）は 途中の 計。' : ''}</div></div>`;
}
function printDoc(){
  const c=C(); if(!c || !c.mem.some(m=>m.tot!=null)){ toastS('まだ 合計が 入って いません'); return; }
  let pa=$('printArea'); if(!pa){ pa=document.createElement('div'); pa.id='printArea'; document.body.appendChild(pa); }
  pa.innerHTML=docHtml(c);
  let dyn=$('printDynamicStyle'); if(!dyn){ dyn=document.createElement('style'); dyn.id='printDynamicStyle'; document.head.appendChild(dyn); }
  dyn.textContent='@page{ size: A4 portrait; margin: 12mm; }';
  const old=document.title; document.title=(c.title||'グラウンドゴルフ').replace(/[\\/:*?"<>|]/g,'_');   // PDF に 保存するときの 名前
  setTimeout(()=>{ try{ window.print(); }catch(_){ toastS('印刷を 開けませんでした'); } setTimeout(()=>{ document.title=old; }, 1500); }, 250);
}
function text(){
  const c=C(); if(!c) return '';
  const R=calc(c), out=['⛳ '+c.title+(c.date ? '（'+jd(c.date)+'）' : ''), '参加 '+R.N+'人・ホールインワン '+R.hio.times+'回'+(R.pend.length ? '（まだ 合計の ない 人 '+R.pend.length+'人）' : '')];
  sections(c, R).forEach(s=>{
    out.push('', s.ic+' '+s.t+(s.sub ? '（'+s.sub+'）' : ''));
    s.rows.forEach(r=>out.push(r.lab+'　'+r.name+(r.team ? '（'+r.team+'）' : '')+(r.sc ? '　'+r.sc : '')+(r.mem ? '\n　'+r.mem : '')));
  });
  if(R.N){ out.push('', '📋 順位'); R.list.forEach((m,i)=>{ const x=crsTxt(c, m); out.push((i+1)+'. '+m.name+(m.team ? '（'+m.team+'）' : '')+'　'+scTxt(m)+(x ? '（'+x+'）' : '')); }); }
  if(R.teams.length){ out.push('', '👥 チームの 順位'); R.teams.forEach((t,i)=>out.push((i+1)+'. '+t.name+'　'+tScTxt(c, t))); }
  return out.join('\n');
}
function copy(){ if(!C()){ toastS('大会が ありません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 コピーしました（LINE などに 貼れます）'); }
// 順位の 表（見出し・1人ずつ・まだの 人）
function rankRows(c, R){
  const S=c.set, hole=S.inp==='hole', cs=m=>hole ? crsSums(S, m).map(x=>x.n ? x.s : '') : [];
  const raw=m=>S.hded ? [m.tot==null ? '' : m.tot] : [];   // ホールインワンで 引く ときは 実打数も
  return [['順位','名前','チーム','合計','ホールインワン','賞'].concat(hole ? Array.from({length:S.crs}, (_,k)=>CL(k)+'計') : [], S.hded ? ['実打数'] : [])]
    .concat(R.list.map((m,i)=>[i+1, m.name, m.team, pt(m), m.hio||'', (R.at[i+1]||[]).map(x=>x.l).concat(m.hio ? ['ホールインワン賞'] : []).join('・')].concat(cs(m), raw(m))),
      R.pend.map(m=>['まだ', m.name, m.team, '', m.hio||'', m.hio ? 'ホールインワン賞' : ''].concat(cs(m), raw(m))));
}
// チームの 順位の 表（first：はじめの 見出し・mem：メンバーの 列も）
function teamRows(c, R, first, mem){
  const avg=c.set.tmode==='avg';
  return [[first,'チーム','人数', avg ? '平均' : '合計','ホールインワン','賞'].concat(mem ? ['メンバー'] : [])]
    .concat(R.teams.map((t,i)=>[i+1, t.name, t.n, avg ? Math.round(t.score*10)/10 : t.sum, t.hio||'', i<R.tN ? 'チーム賞' : ''].concat(mem ? [t.mem.map(m=>m.name).join('・')] : [])));
}
function rows(){
  const c=C(); if(!c) return [];
  const R=calc(c), r=rankRows(c, R);
  if(R.teams.length) r.push(['','','','','',''], ...teamRows(c, R, 'チーム順位', false));
  return r;
}
function toTable(){ const c=C(); if(!c || !c.mem.some(m=>m.tot!=null)){ toastS('まだ 合計が 入って いません'); return; } if(typeof toolPasteRows==='function') toolPasteRows(rows(), 'グラウンドゴルフ', closeGgolf); }

/* ───────── 📁 Excel：名簿の ひな形・読み込み・競技結果（v618） ─────────
   ひな形（.xlsx）は「名簿」（名前・チーム・合計・ホールインワン）・「大会」・「説明」の 3枚。いまの 名簿も 入れて 書き出す。
   読み込みは Excel（.xlsx）・CSV（UTF-8・Shift_JIS）・タブ区切り。見出し（名前・チーム・合計・ホールインワン。氏名・班・打数・HIO なども）を
   さがして 列を 決める（列の 順・ほかの 列は 自由）。見出しが ない ときは 1行を「まとめて 入れる」と 同じに 読む。
   競技結果（.xlsx）は 賞・順位・チーム・名簿（そのまま 読み込み直せる）・大会。ZIP は 表電卓の xlsxZip・xlsxUnzip を 使う。 */
const XP='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', XMIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XHEAD=['名前','チーム','合計','ホールインワン'];
let xlHow='save', xlBusy=false, xlGot=null;   // ⬇ 保存／📤 送る・作って いる 最中・読んだ 中身（たしかめの 窓の 間だけ。覚えない）
const canShareX=()=>{ try{ return !!(navigator.share && navigator.canShare && navigator.canShare({files:[new File(['x'], 'a.xlsx', {type:XMIME})]})); }catch(_){ return false; } };
const fstamp=d=>d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate());   // 端末に よっては 日本語の 名前が 化けるので 英数字
// 1枚の シート（head：1行目を 見出しに して 止める。数は 数の セルに）
function sheetXml(rows, widths, head){
  const cols='<cols>'+widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols>';
  const body=rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((v,ci)=>{
    if(v==null || v==='') return '';
    const ref=xlColLetter(ci)+(ri+1), s=head && ri===0 ? ' s="1"' : '';
    if(typeof v==='object' && v.f) return `<c r="${ref}"${s}><f>${xlEsc(v.f)}</f><v>${v.v}</v></c>`;   // 式（Excel で 直すと 計算しなおす）
    return typeof v==='number' && isFinite(v) ? `<c r="${ref}"${s}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xlEsc(String(v))}</t></is></c>`;
  }).join('')+'</row>').join('');
  const pane=head ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';
  return `${XP}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${body}</sheetData></worksheet>`;
}
// [[シートの 名前, XML], …] → .xlsx の Blob
async function bookBlob(sheets){
  if(typeof xlsxZip!=='function') throw new Error('xlsx');
  const enc=new TextEncoder(), M='http://schemas.openxmlformats.org/spreadsheetml/2006/main', R='http://schemas.openxmlformats.org/officeDocument/2006/relationships', PK='http://schemas.openxmlformats.org/package/2006/', O='application/vnd.openxmlformats-officedocument.spreadsheetml.';
  const styles=`${XP}<styleSheet xmlns="${M}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>`
    +`<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/><bgColor indexed="64"/></patternFill></fill></fills>`
    +`<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
    +`<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>`
    +`<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const wb=`${XP}<workbook xmlns="${M}" xmlns:r="${R}"><sheets>${sheets.map((x,i)=>`<sheet name="${xlEsc(x[0])}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
  const wbRels=`${XP}<Relationships xmlns="${PK}relationships">${sheets.map((x,i)=>`<Relationship Id="rId${i+1}" Type="${R}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="${R}/styles" Target="styles.xml"/></Relationships>`;
  const rootRels=`${XP}<Relationships xmlns="${PK}relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const ct=`${XP}<Types xmlns="${PK}content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
    +`<Override PartName="/xl/workbook.xml" ContentType="${O}sheet.main+xml"/>${sheets.map((x,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="${O}worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="${O}styles+xml"/></Types>`;
  const files=[['[Content_Types].xml', ct], ['_rels/.rels', rootRels], ['xl/workbook.xml', wb], ['xl/_rels/workbook.xml.rels', wbRels], ['xl/styles.xml', styles]]
    .concat(sheets.map((x,i)=>['xl/worksheets/sheet'+(i+1)+'.xml', x[1]]));
  return xlsxZip(files.map(([name, x])=>({name, u8:enc.encode(x)})));
}
const XHELP=[['⛳ グラウンドゴルフ（表電卓）の 名簿の ひな形'], [''],
  ['「名簿」の シートの 1行に 1人 書きます。名前は かならず。チーム・合計・ホールインワンは なくても かまいません。'],
  ['チームは A・1班・赤 など 好きな 名前。合計は 打数（数）、ホールインワンは 回数（数）。まだ 決まって いない ところは 空けて おきます。'],
  ['見出し（名前・チーム・合計・ホールインワン）は かえないで ください。列の 順が かわっても、ほかの 列（No. など）が あっても 読めます。'],
  ['書いたら 表電卓の ⛳ グラウンドゴルフ →「📁 Excel」→「② 📂 Excel・CSV から 読み込む」で この ファイルを えらびます。'],
  ['いまの 大会に 入れる ときは、同じ 名前の 人に 成績が 入ります（名前だけ 先に 入れて、あとで 合計を 入れても よい）。'],
  ['「大会」の シートの 名前と 日付は、新しい 大会と して 読み込む ときに 使います。'],
  ['ホールごとの スコアの 大会は、A1〜A8・B1〜B8（コースと ホールの 番号）の 列に 打数を 入れます。1 は ホールインワン。合計と ホールインワンの 列は 式で 出ます。'],
  [''], ['例：'], XHEAD, ['山田 太郎', 'A', 48, 1], ['佐藤 花子', 'A', 52, ''], ['鈴木 一郎', 'B', '', '']];
// 名簿の シート（入れた 順。読み込み直せる 形）。ホールごとの 大会は A1〜B8 の 列と、合計・ホールインワンは 式
const hHead=S=>Array.from({length:NH(S)}, (_,p)=>CL(Math.floor(p/S.hn))+(p%S.hn+1));
function cupRows(c){
  const S=c ? c.set : null, ms=c ? c.mem.slice().sort(bySeq) : [];
  if(!S || S.inp!=='hole') return [XHEAD].concat(ms.map(m=>[m.name, m.team, m.tot==null ? '' : m.tot, m.hio||'']));
  const N=NH(S), L=xlColLetter(N+1);   // ホールは C 列から
  return [['名前','チーム'].concat(hHead(S), ['合計','ホールインワン'])].concat(ms.map((m,i)=>{
    const r=i+2, f=holeInfo(S, m), h=m.h||[];
    return [m.name, m.team].concat(Array.from({length:N}, (_,p)=>h[p]==null ? '' : h[p]),
      f.n ? [{f:'SUM(C'+r+':'+L+r+')', v:f.sum}, {f:'COUNTIF(C'+r+':'+L+r+',1)', v:f.hio}] : [m.tot==null ? '' : m.tot, m.hio||'']);
  }));
}
const cupW=c=>c && c.set.inp==='hole' ? [16,8].concat(Array(NH(c.set)).fill(4.5), [7,12]) : W_MEIBO;
const cupInfo=c=>[['大会の 名前', c ? c.title : ''], ['日付', c && c.date ? c.date : '']].concat(c && c.set.inp==='hole' ? [['入力', inpTxt(c.set)]] : []);
const W_MEIBO=[22,12,8,14];
function tplBlob(){ const c=C(); return bookBlob([['名簿', sheetXml(cupRows(c), cupW(c), true)], ['大会', sheetXml(cupInfo(c), [14,40], false)], ['説明', sheetXml(XHELP, W_MEIBO, false)]]); }
// スコアの シート（ホールごと）：順位・名前・チーム・コースごとに ホールと 計・合計・ホールインワン
function scoreRows(c, R){
  const S=c.set;
  return [['順位','名前','チーム'].concat(...Array.from({length:S.crs}, (_,k)=>Array.from({length:S.hn}, (_,j)=>CL(k)+(j+1)).concat([CL(k)+'計'])), ['合計','ホールインワン'])]
    .concat(R.list.concat(R.pend).map((m,i)=>{ const h=m.h||[], sm=crsSums(S, m);
      return [i<R.N ? i+1 : 'まだ', m.name, m.team].concat(...Array.from({length:S.crs}, (_,k)=>Array.from({length:S.hn}, (_,j)=>{ const v=h[k*S.hn+j]; return v==null ? '' : v; }).concat([sm[k].n ? sm[k].s : ''])), [m.tot==null ? '' : pt(m), m.hio||'']); }));
}
// 競技結果：賞・順位・チーム・名簿・大会
function resBlob(){
  const c=C(), R=calc(c), avg=c.set.tmode==='avg', prz=[['賞','位','名前','チーム','合計','ホールインワン']];
  sections(c, R).forEach(s=>{
    if(s.k==='sanka'){ prz.push([s.t, R.N+'人']); return; }
    if(!s.rows.length){ prz.push([s.t, '', s.sub||'']); return; }
    s.rows.forEach(r=>{
      if(r.tm) prz.push([s.t, r.p+'位', r.mem, r.tm.name, avg ? Math.round(r.tm.score*10)/10 : r.tm.sum, r.tm.hio||'']);
      else prz.push([s.t, s.k==='hio' ? r.m.hio+'回' : r.p+'位', r.m.name, r.m.team, r.m.tot==null ? '' : pt(r.m), r.m.hio||'']);
    });
  });
  const info=cupInfo(c).concat([['参加', R.N+'人'+(R.pend.length ? '（まだ '+R.pend.length+'人）' : '')], ['ホールインワン', R.hio.times+'回'], ['賞の 決め方', RULE(c)], ['順位の 決め方', '合計の 少ない 順。同じ ときは ホールインワンの 多い 順']]);
  const hole=c.set.inp==='hole', sh=[['賞', sheetXml(prz, [18,8,26,12,8,14], true)], ['順位', sheetXml(rankRows(c, R), [8,22,12,8,14,30].concat(hole ? Array(c.set.crs).fill(7) : []), true)]];
  if(hole) sh.push(['スコア', sheetXml(scoreRows(c, R), [6,16,8].concat(...Array.from({length:c.set.crs}, ()=>Array(c.set.hn).fill(4.5).concat([6])), [7,12]), true)]);
  if(R.teams.length) sh.push(['チーム', sheetXml(teamRows(c, R, '順位', true), [8,12,6,8,14,10,44], true)]);
  sh.push(['名簿', sheetXml(cupRows(c), cupW(c), true)], ['大会', sheetXml(info, [14,60], false)]);
  return bookBlob(sh);
}
function dlBlob(blob, name){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
// 端末に 保存 か 📤 送る（送れない 端末は 保存）
async function give(blob, name, what){
  if(xlHow==='share' && canShareX()){
    try{ await navigator.share({files:[new File([blob], name, {type:XMIME})], title:name}); toastS('📤 '+what+'を 送りました'); return 'share'; }
    catch(e){ if(e && e.name==='AbortError') return ''; }
  }
  dlBlob(blob, name); toastS('⬇ '+what+'を 保存しました：'+name, 4200); return 'save';
}
// ① 名簿の ひな形（'tpl'）・③ 競技結果（'res'）
async function xlOut(kind){
  const c=C(), res=kind==='res';
  if(res && !(c && c.mem.some(m=>m.tot!=null))){ toastS('まだ 合計が 入って いません'); return null; }
  if(xlBusy) return null; xlBusy=true;
  try{
    const blob=res ? await resBlob() : await tplBlob(), d=c && okDate(c.date) ? okDate(c.date) : new Date();
    await give(blob, (res ? 'ggolf-kekka-' : 'ggolf-meibo-')+fstamp(d)+'.xlsx', res ? '競技結果の Excel' : '名簿の ひな形（Excel）');
    return blob;
  }catch(e){ toastS('Excel の ファイルに できませんでした'); return null; }
  finally{ xlBusy=false; }
}
// 📁 Excel の 窓
function openXl(){
  const c=C(), res=!!(c && c.mem.some(m=>m.tot!=null)), sh=canShareX(), how=sh ? xlHow : 'save';
  popOpen(ph('📁 Excel で 入れる・出す')+`
    <div class="gg-fcs">
      <button type="button" class="gg-fc" onclick="GGOLF.xlOut('tpl')"><b>① 📄 名簿の ひな形を 書き出す</b><small>名前・チーム・合計・ホールインワン の 表${c && c.mem.length ? '（いまの '+c.mem.length+'人も 入ります）' : ''}。Excel で 書いて、② で 読み込みます。</small></button>
      <button type="button" class="gg-fc" onclick="GGOLF.fileIn()"><b>② 📂 Excel・CSV から 読み込む</b><small>見出しが 名前・チーム・合計・ホールインワン の 表なら、列の 順は 自由です。</small></button>
      <button type="button" class="gg-fc"${res ? '' : ' disabled'} onclick="GGOLF.xlOut('res')"><b>③ 📊 競技結果を Excel に 書き出す</b><small>${res ? '賞・順位・チームの 順位・名簿・大会 の シート。' : '合計を 入れると 書き出せます。'}</small></button>
    </div>
    ${sh ? `<div class="gg-seg" role="group" aria-label="ファイルの 渡し方"><button type="button" class="${how==='save' ? 'on' : ''}" aria-pressed="${how==='save'}" onclick="GGOLF.xlHow('save')">⬇ 端末に 保存</button><button type="button" class="${how==='share' ? 'on' : ''}" aria-pressed="${how==='share'}" onclick="GGOLF.xlHow('share')">📤 送る（LINE・メール など）</button></div>` : ''}
    <p class="gg-help">名簿が 写真や 紙の ときは、AI（Claude など）に「名前・チーム・合計・ホールインワン の 列の Excel に して」と 頼むと、② で そのまま 読み込めます。</p>`, 'xl');
}
function setXlHow(h){
  if(!['save','share'].includes(h)) return; xlHow=h;
  if(pop && pop.kind==='xl') pop.el.querySelectorAll('.gg-seg button').forEach((b,i)=>{ const on=(i===0)===(h==='save'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}
/* ── 読む ── */
// 文字の ファイル：UTF-8（BOM も）で 読めなければ Shift_JIS（Excel の CSV）
function decodeText(buf){
  const u8=new Uint8Array(buf);
  try{ return new TextDecoder('utf-8', {fatal:true}).decode(u8).replace(/^﻿/,''); }catch(_){}
  try{ return new TextDecoder('shift_jis').decode(u8); }catch(_){ return new TextDecoder().decode(u8); }
}
// CSV・タブ区切り → 文字の 2次元の 表（"…" の 中の 区切り・改行・"" も）
function csvRows(text){
  const first=(String(text).split(/\r?\n/).find(l=>l.trim())||''), d=(first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length ? '\t' : ',';
  const rows=[]; let row=[], cell='', qt=false;
  for(let i=0; i<text.length; i++){
    const ch=text[i];
    if(qt){ if(ch==='"'){ if(text[i+1]==='"'){ cell+='"'; i++; } else qt=false; } else cell+=ch; continue; }
    if(ch==='"' && cell===''){ qt=true; continue; }
    if(ch===d){ row.push(cell); cell=''; continue; }
    if(ch==='\n' || ch==='\r'){ if(ch==='\r' && text[i+1]==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; if(rows.length>=MAX_M*4) break; continue; }
    cell+=ch;
  }
  if(cell!=='' || row.length){ row.push(cell); rows.push(row); }
  return rows;
}
// シートの XML → 文字の 2次元の 表
function gridOf(xml, shared){
  const rows=[], re=/<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g; let m;
  while((m=re.exec(xml))){
    const a=m[1], inner=m[3]||'', rm=/r="([A-Z]+)(\d+)"/.exec(a); if(!rm) continue;
    const c=xlColToIdx(rm[1]), r=parseInt(rm[2],10)-1; if(r<0 || c<0 || r>MAX_M*4 || c>40) continue;
    const t=(/t="([^"]+)"/.exec(a)||[])[1]||'', v=(/<v>([\s\S]*?)<\/v>/.exec(inner)||[])[1];
    const val=t==='inlineStr' ? xlsxRichText(inner) : t==='s' ? shared[parseInt(v,10)]||'' : t==='b' ? (v==='1' ? 'TRUE' : '') : v!=null ? xlUnesc(v) : '';
    (rows[r]=rows[r]||[])[c]=val;
  }
  return rows;
}
async function bookRows(buf){
  if(typeof xlsxUnzip!=='function') throw new Error('xlsx');
  const map=await xlsxUnzip(buf), names=[...map.keys()], dec=new TextDecoder(), shared=[];
  const ss=names.find(n=>/sharedStrings\.xml$/i.test(n));
  if(ss){ const x=dec.decode(map.get(ss)), re=/<si\b[^>]*>([\s\S]*?)<\/si>/g; let m; while((m=re.exec(x))) shared.push(xlsxRichText(m[1])); }
  return xlsxWorkbookSheets(map, names, dec).map(sh=>({name:sh.name, rows:gridOf(sh.xml, shared)}));
}
// 見出しの 名前（空白・かっこの 中・- は 見ない）
const XKEY={name:/^(名前|氏名|お名前|なまえ|選手名?|参加者名?|会員名?|メンバー|name)$/i, team:/^(チーム名?|班名?|組名?|グループ|所属|team)$/i,
  tot:/^(合計(打数|スコア)?|総打数|打数|スコア|成績|計|score|total)$/i, hio:/^(ホールインワン(の)?(数|回数)?|hio(数|回数)?|ホールイン|holeinone|⛳)$/i};
// ホールの 列：A1・A-1・Aコース1・A1H（コースと 番号）か、1H・1番・第1ホール・1（3つ 以上 並ぶ とき）
const HL=/^([a-z])(コース)?(\d{1,2})(h|ホール|番)?$/i, HN=/^第?(\d{1,3})(h|ホール|番|番ホール)?$/i;
function headOf(rows){
  for(let i=0; i<Math.min(rows.length, 15); i++){
    const c={}, hl=[], hn=[];
    (rows[i]||[]).forEach((v,j)=>{
      const t=String(v==null?'':v).normalize('NFKC').replace(/\s+/g,'').replace(/[(（][^)）]*[)）]/g,'').replace(/[-‐]/g,''); let used=false;
      Object.keys(XKEY).forEach(k=>{ if(!used && c[k]===undefined && XKEY[k].test(t)){ c[k]=j; used=true; } });
      let m; if(used || !t) return;
      if((m=HL.exec(t)) && +m[3]>=1) hl.push({j, k:m[1].toUpperCase().charCodeAt(0)-65, n:+m[3]});
      else if((m=HN.exec(t)) && +m[1]>=1) hn.push({j, k:0, n:+m[1]});
    });
    if(c.name===undefined) continue;
    // ホールの 並び：コースの 数と 1コースの ホール数（番号だけ なら 8ホールずつ に 分けられる ときは そう 見る）
    let hs=[], crs=0, hn2=0;
    const lh=hl.filter(x=>x.k>=0 && x.k<MAX_CRS);
    if(lh.length){   // A1〜B8：コースは 字、ホールは 番号
      crs=Math.max(...lh.map(x=>x.k))+1; hn2=Math.min(MAX_HN, Math.max(...lh.map(x=>x.n)));
      hs=lh.filter(x=>x.n<=hn2).map(x=>Object.assign(x, {p:x.k*hn2+x.n-1}));
    }else if(hn.length>=3){   // 1〜16：8ホールずつに 分けられる ときは コースに 分ける
      const all=Math.max(...hn.map(x=>x.n));
      if(all%8===0 && all>8){ crs=all/8; hn2=8; } else if(all<=MAX_HN){ crs=1; hn2=all; } else { crs=Math.ceil(all/MAX_HN); hn2=MAX_HN; }
      crs=Math.min(crs, MAX_CRS); hs=hn.filter(x=>x.n<=crs*hn2).map(x=>Object.assign(x, {p:x.n-1}));
    }
    return {i, c, hs, crs, hn:hn2};
  }
  return null;
}
// 表 → 人の 並び（見出しが ない ときは 1行を「まとめて 入れる」と 同じに 読む）
function membersOf(rows){
  const h=headOf(rows), out=[];
  if(h) rows.slice(h.i+1).forEach(r=>{
    r=r||[]; const cell=k=>h.c[k]===undefined ? '' : String(r[h.c[k]]==null ? '' : r[h.c[k]]).trim();
    const p=nameTeam(cell('name')); if(!p.name) return;
    const x={name:p.name, team:teamIn(cell('team'))||p.team}, t=cell('tot'), hv=cell('hio');
    // ホールの 打数が ある 行は それで（合計・ホールインワンの 列は 式の 答えなので 見ない）
    const hh=[]; h.hs.forEach(o=>{ const v=String(r[o.j]==null ? '' : r[o.j]).trim(); if(v!=='') hh[o.p]=stIn(v); });
    if(hh.some(v=>v!=null)){ x.h=Array.from(hh, v=>v==null ? null : v); x.hN=h.crs*h.hn; }   // hN：ファイルの ホールの 数（そろって いるか を 見る）
    else{ if(t!=='') x.tot=totIn(t); if(hv!==''){ x.hio=numIn(hv,0,MAX_HIO,0); x.hioSet=true; } }
    out.push(x);
  });
  else rows.forEach(r=>{ const line=(r||[]).map(v=>String(v==null?'':v).trim()).join('\t').replace(/\t+$/,''); if(line.trim()) out.push(...parseLines(line)); });
  return {list:out.slice(0, MAX_M), head:!!h, crs:h && h.hs.length ? h.crs : 0, hn:h && h.hs.length ? h.hn : 0};
}
function dateIn(v){
  v=String(v==null?'':v).trim().normalize('NFKC'); if(!v) return '';
  if(/^\d{5}(\.\d+)?$/.test(v) && +v>20000 && +v<80000) return ymd(new Date(1899, 11, 30+Math.floor(+v)));   // Excel の 日付の 通し番号
  const m=v.match(/^(\d{4})[-\/年.](\d{1,2})[-\/月.](\d{1,2})/); if(!m) return '';
  const s=m[1]+'-'+pad2(+m[2])+'-'+pad2(+m[3]); return okDate(s) ? s : '';
}
// ファイル → {name, sheet, list, head, title, date}
async function readFile(file){
  const buf=await file.arrayBuffer(), u8=new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  const sheets=u8[0]===0x50 && u8[1]===0x4B ? await bookRows(buf) : [{name:'', rows:csvRows(decodeText(buf))}];   // PK…＝.xlsx（ZIP）
  // 「名簿」の シート → 見出しの ある シート → はじめの シート
  const pk=sheets.find(x=>/名簿/.test(x.name)) || sheets.find(x=>headOf(x.rows)) || sheets[0];
  const r=pk ? membersOf(pk.rows) : {list:[], head:false};
  let title='', date='';
  const info=sheets.find(x=>/^大会/.test(x.name));
  if(info) info.rows.forEach(row=>{ const k=String((row||[])[0]==null ? '' : row[0]).replace(/\s+/g,''), v=(row||[])[1];
    if(/^(大会の?名前|大会名)$/.test(k)) title=oneLine(v,40); else if(/^(日付|日にち|開催日)$/.test(k)) date=dateIn(v); });
  return {name:oneLine(file.name,60), sheet:pk ? pk.name : '', list:r.list, head:r.head, title, date, crs:r.crs||0, hn:r.hn||0};
}
function fileIn(){ const i=$('ggFileIn'); if(i){ i.value=''; i.click(); } }
async function fileGot(inp){
  const f=inp && inp.files && inp.files[0]; if(!f) return null;
  if(f.size>5e6){ toastS('ファイルが 大きすぎます'); return null; }
  let r=null;
  try{ r=await readFile(f); }catch(e){ toastS('読めませんでした（Excel の .xlsx か CSV を えらんで ください）', 4200); return null; }
  showGot(r); return r;
}
// 読んだ 中身を 見せて、入れ方を えらぶ
function showGot(r){
  if(!r || !r.list.length){ toastS('名前が 見つかりませんでした（「名前」の 見出しの 列に 名前を 書いて ください）', 4600); return; }
  xlGot=r;
  const c=C(), n=r.list.length, sc=r.list.filter(x=>x.tot!=null).length, hs=r.list.filter(x=>x.h).length, hio=r.list.reduce((a,x)=>a+(x.hioSet ? x.hio : x.h ? x.h.filter(v=>v===1).length : 0), 0), teams=new Set(r.list.map(x=>x.team).filter(Boolean)).size;
  const fs={inp:'hole', crs:r.crs||1, hn:r.hn||8}, hNote=!hs ? '' : !c ? '新しい 大会は ホールごとの 入力に なります。'
    : c.set.inp!=='hole' ? '「'+c.title+'」は 合計と ホールインワン の 入力です。ぜんぶの ホールが ある 人は、合計と ホールインワンに して 入れます（ホールごとに 見る ときは ⚙ 設定で）。'
    : c.set.crs!==fs.crs || c.set.hn!==fs.hn ? '「'+c.title+'」の '+inpTxt(c.set)+' に 合わせて 入れます。' : '';
  popOpen(ph('📂 読み込む')+`
    <p class="gg-help"><b>${esc(r.name)}</b>${r.sheet ? '（'+esc(r.sheet)+' の シート）' : ''}</p>
    <p class="gg-got"><b>${n}人</b>${teams ? '・チーム '+teams : ''}${sc ? '・合計 入り '+sc+'人' : ''}${hs ? '・ホールごとの スコア '+hs+'人' : ''}${hio ? '・ホールインワン '+hio+'回' : ''}</p>
    ${hs ? `<p class="gg-help">ホールごとの スコア（${esc(inpTxt(fs).replace(/^ホールごとの スコア（|）$/g,''))}）が 入って います。${esc(hNote)}</p>` : ''}
    <ul class="gg-gl">${r.list.slice(0,6).map(x=>`<li>${esc(x.name)}${x.team ? '（'+esc(x.team)+'）' : ''}${x.tot!=null ? '　'+x.tot+'打' : ''}${x.hioSet && x.hio ? '・⛳'+x.hio : ''}</li>`).join('')}${n>6 ? `<li class="more">ほか ${n-6}人</li>` : ''}</ul>
    <div role="radiogroup" aria-label="読み込み方">
      ${c ? `<label class="gg-ck2"><input type="radio" name="ggXHow" value="add" checked onchange="GGOLF.gotHow(this.value)"> 「${esc(c.title)}」に 入れる（同じ 名前の 人には 成績を 入れる）</label>
      <label class="gg-ck2"><input type="radio" name="ggXHow" value="rep" onchange="GGOLF.gotHow(this.value)"> 「${esc(c.title)}」の 名簿を 入れかえる（いまの ${c.mem.length}人と 成績は 消す）</label>` : ''}
      <label class="gg-ck2"><input type="radio" name="ggXHow" value="new"${c ? '' : ' checked'} onchange="GGOLF.gotHow(this.value)"> 新しい 大会に する</label></div>
    <label class="gg-f" id="ggXTitleRow"${c ? ' hidden' : ''}><span>大会の 名前</span><input id="ggXTitle" type="text" maxlength="40" value="${esc(r.title||'グラウンドゴルフ大会')}"></label>
    <div class="gg-acts end"><button type="button" class="gg-b" onclick="GGOLF.close()">やめる</button><button type="button" class="gg-b pri" onclick="GGOLF.gotGo()">✓ 読み込む</button></div>`, 'got');
}
function gotHow(h){ const r=$('ggXTitleRow'); if(r) r.hidden=h!=='new'; }
function gotGo(){
  const el=document.querySelector('#ggolfOverlay input[name="ggXHow"]:checked');
  return xlGot ? importNow(xlGot, el ? el.value : 'new', val('ggXTitle')) : null;
}
// 入れる（how：add この 大会に 足す・rep 名簿を 入れかえる・new 新しい 大会）
async function importNow(r, how, title){
  let c=C();
  if(how==='rep' && c && c.mem.length && typeof appConfirm==='function'
    && !(await appConfirm('「'+c.title+'」の いまの 名簿（'+c.mem.length+'人）と 成績を 消して、読み込んだ '+r.list.length+'人に 入れかえますか？', '入れかえる', 'やめる'))) return null;
  popClose(); xlGot=null;
  const hs=r.list.some(x=>x.h), fs={inp:'hole', crs:r.crs||1, hn:r.hn||8};
  if(how==='new' || !c){ if(!newCupGo({title:oneLine(title,40)||r.title||'グラウンドゴルフ大会', date:r.date||undefined, set:hs ? fs : undefined})) return null; c=C(); }
  else if(how==='rep'){ c.mem=[]; c.ttb={}; }
  st.view='in';
  // ホールごとの 大会で コース・ホールの 数が ちがう ときは 同じ コースの 同じ ホールに 写す
  const S=c.set, list=hs && S.inp==='hole' && (S.crs!==fs.crs || S.hn!==fs.hn) ? r.list.map(x=>x.h ? Object.assign({}, x, {h:remapH(x.h, fs, S)}) : x) : r.list;
  return addMany(list);
}

/* ───────── 窓 ───────── */
const DOC=`
.gg-doc{ color:#111; background:#fff; font-family:"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif; font-size:12px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.gg-doc h1{ font-size:20px; margin:0 0 4px; } .gg-doc .meta{ font-size:12px; margin:0 0 8px; }
.gg-doc h2{ font-size:14px; margin:12px 0 4px; }
.gg-doc table{ width:100%; border-collapse:collapse; border-spacing:0; }
.gg-doc th{ background:#eef0f4; border:1px solid #333; padding:3px 5px; font-size:11.5px; }
.gg-doc td{ border:1px solid #333; padding:3px 5px; font-size:11.5px; vertical-align:top; }
.gg-doc td.nm{ font-weight:bold; } .gg-doc td.r{ text-align:right; white-space:nowrap; } .gg-doc td.c{ text-align:center; white-space:nowrap; }
.gg-doc td small{ display:block; font-weight:normal; font-size:10.5px; color:#444; } .gg-doc td.k{ font-weight:bold; white-space:nowrap; background:#f6f7fa; }
.gg-doc tr.pend td{ color:#666; } .gg-doc .note{ margin:8px 0 0; font-size:11px; color:#444; }
.gg-doc table.sc th, .gg-doc table.sc td{ padding:1px 2px; font-size:9.5px; text-align:center; } .gg-doc table.sc td.nm{ text-align:left; white-space:nowrap; font-weight:bold; }
.gg-doc table.sc .cs{ background:#f6f7fa; font-weight:bold; } .gg-doc table.sc td.hio{ font-weight:bold; text-decoration:underline; }
`;
const CSS=`
#ggolfOverlay .gg-modal{ display:flex; flex-direction:column; }
.gg-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.gg-wrap{ max-width:820px; margin:0 auto; padding-bottom:16px; }
.gg-top{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 8px; } .gg-sel{ flex:1 1 140px; min-width:0; min-height:44px; padding:0 8px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; }
.gg-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; font-family:inherit; }
.gg-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .gg-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.gg-b.sm{ min-height:38px; padding:0 10px; font-size:13.5px; flex:none; }
.gg-sum{ border-radius:14px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); padding:10px 12px; margin:0 0 8px; line-height:1.6; }
.gg-sum .h{ display:flex; flex-wrap:wrap; gap:4px 10px; align-items:baseline; } .gg-sum .h b{ font-size:17px; } .gg-sum .h span{ font-size:13px; color:var(--text-light,#666); }
.gg-sum .n{ display:flex; flex-wrap:wrap; gap:2px 12px; font-size:14.5px; } .gg-sum .n b{ font-size:18px; } .gg-sum .n .pend{ color:#b26a00; font-weight:bold; } .gg-sum .n .ok{ color:#2e7d32; font-weight:bold; }
.gg-sum .r{ display:flex; flex-wrap:wrap; align-items:center; gap:0 8px; font-size:12.5px; color:var(--text-light,#666); }
.gg-lnk{ min-height:32px; padding:0 4px; border:0; background:transparent; color:var(--acc); font-size:12.5px; font-weight:bold; cursor:pointer; font-family:inherit; }
.gg-tabs{ display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:0 0 10px; }
.gg-tabs button{ min-height:46px; padding:0 6px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; font-family:inherit; }
.gg-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .gg-tabs .wn{ font-style:normal; color:#e08a00; } .gg-tabs button.on .wn{ color:#ffd54f; }
.gg-add{ display:flex; flex-direction:column; gap:6px; margin:0 0 10px; padding:8px; border-radius:14px; border:1.5px dashed rgba(120,132,156,.55); }
.gg-add .r{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.gg-add input{ min-width:0; min-height:44px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.gg-add #ggANm{ flex:2 1 8em; } .gg-add #ggATm{ flex:1 1 5em; }
.gg-add .f{ display:inline-flex; align-items:center; gap:4px; flex:none; font-size:13px; font-weight:bold; color:var(--text-light,#666); } .gg-add .f input{ width:4em; text-align:right; } .gg-add .f em{ font-style:normal; }
.gg-add .gg-b.pri{ flex:1 0 auto; }
.gg-step{ display:inline-flex; align-items:center; flex:none; border:1px solid rgba(120,132,156,.45); border-radius:10px; overflow:hidden; background:var(--cell-bg,#fff); }
.gg-step button{ min-width:36px; min-height:40px; padding:0; border:0; background:transparent; color:var(--text,#222); font-size:18px; font-weight:bold; cursor:pointer; font-family:inherit; } .gg-step button:disabled{ opacity:.3; cursor:default; }
.gg-step .hv{ min-width:2.6em; text-align:center; font-size:14.5px; color:var(--text-light,#666); } .gg-step.on .hv{ color:#2e7d32; }
.gg-step .ic{ padding:0 0 0 6px; font-size:14px; }
.gg-add .gg-step input{ width:2.2em; min-height:40px; padding:0; border:0; border-radius:0; text-align:center; font-weight:bold; background:transparent; }
.gg-lh{ display:flex; align-items:center; gap:8px; margin:4px 0 6px; } .gg-lh b{ flex:1; font-size:15px; }
.gg-ck{ display:inline-flex; align-items:center; gap:5px; font-size:14px; cursor:pointer; } .gg-ck input{ width:20px; height:20px; margin:0; }
.gg-q{ display:block; width:100%; box-sizing:border-box; min-height:42px; margin:0 0 8px; padding:0 12px; border-radius:12px; border:1px solid rgba(120,132,156,.5); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; }
.gg-gh{ margin:12px 0 6px; font-size:15px; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; } .gg-gh small{ font-weight:normal; font-size:12.5px; color:var(--text-light,#666); }
.gg-list{ display:flex; flex-direction:column; gap:6px; }
.gg-row{ display:flex; flex-wrap:wrap; align-items:center; gap:4px 6px; padding:5px 8px; border-radius:12px; border:1px solid rgba(120,132,156,.3); border-left:5px solid #2e9d4a; background:var(--modal-bg,#fff); }
.gg-row.empty{ border-left-color:#f0a400; }
.gg-row .no{ min-width:1.4em; font-size:12px; color:var(--text-light,#666); text-align:right; }
.gg-row .nm{ flex:1 1 6.5em; min-width:0; padding:4px 0; border:0; background:transparent; color:var(--text,#222); font-size:16px; font-weight:bold; text-align:left; overflow-wrap:anywhere; cursor:pointer; font-family:inherit; }
.gg-row .nm small{ display:block; font-size:12px; font-weight:normal; color:var(--text-light,#666); }
.gg-row .ent{ display:inline-flex; align-items:center; gap:6px; flex:none; margin-left:auto; }
.gg-row .sc{ display:inline-flex; align-items:center; gap:2px; } .gg-row .sc em{ font-style:normal; font-size:12px; color:var(--text-light,#666); }
.gg-tot{ width:3.6em; min-height:42px; padding:0 6px; border-radius:10px; border:1.5px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:18px; font-weight:bold; text-align:right; box-sizing:border-box; font-family:inherit; }
.gg-tot::placeholder{ font-size:13px; font-weight:normal; } .gg-tot.bad{ border-color:#e53935; background:rgba(229,57,53,.08); }
.gg-row .hs{ display:inline-flex; align-items:baseline; gap:4px; font-size:14px; } .gg-row .hs b{ font-size:18px; } .gg-row .hs small{ font-size:12px; color:var(--text-light,#666); } .gg-row .hs i{ font-style:normal; font-size:13.5px; font-weight:bold; color:#2e7d32; }
.gg-ph b small{ font-size:13px; font-weight:normal; color:var(--text-light,#666); } .gg-esc{ flex:1 1 12em; font-size:14px !important; color:var(--text,#222) !important; }
.gg-ctop{ display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; margin:0 0 6px; } .gg-ctop .now{ font-size:15px; font-weight:bold; } .gg-ctop .tot{ margin-left:auto; font-size:14px; } .gg-ctop .tot b{ font-size:18px; }
.gg-card{ display:flex; flex-direction:column; gap:6px; margin:0 0 10px; }
.gg-cr{ display:flex; align-items:center; gap:5px; } .gg-cr .cl{ flex:none; width:1.4em; font-size:15px; font-weight:bold; text-align:center; } .gg-cr .ln{ flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.gg-cr .cells{ display:grid; grid-template-columns:repeat(var(--n), minmax(0,1fr)); gap:3px; }
.gg-cr .cs{ flex:none; width:2.4em; text-align:center; line-height:1.15; } .gg-cr .cs b{ display:block; font-size:16px; } .gg-cr .cs small{ font-size:10.5px; color:var(--text-light,#666); }
.gg-cr .hc{ display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:0; min-height:44px; padding:0; border-radius:8px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text,#222); cursor:pointer; font-family:inherit; }
.gg-cr .hc small{ font-size:10px; line-height:1; color:var(--text-light,#666); } .gg-cr .hc b{ min-height:1.2em; font-size:17px; line-height:1.2; }
.gg-cr .hc.cur{ border:2.5px solid var(--acc); } .gg-cr .hc.hio{ background:rgba(46,157,74,.14); } .gg-cr .hc.hio b{ color:#2e7d32; }
.gg-pad{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:6px; margin:0 0 4px; }
.gg-pad .pd{ min-height:52px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:22px; font-weight:bold; cursor:pointer; font-family:inherit; }
.gg-pad .pd small{ margin-left:2px; font-size:12px; } .gg-pad .pd.one{ color:#2e7d32; }
.gg-acts{ display:flex; gap:6px; flex-wrap:wrap; margin:10px 0 0; } .gg-acts .gg-b{ flex:1 1 auto; } .gg-acts.end{ justify-content:flex-end; } .gg-acts.end .gg-b{ flex:0 1 auto; }
.gg-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:10px 0 0; }
.gg-empty{ text-align:center; padding:30px 10px; } .gg-empty p{ margin:0 0 14px; line-height:1.7; }
.gg-warn{ display:flex; flex-direction:column; gap:6px; margin:0 0 10px; padding:8px 10px; border-radius:12px; border:1.5px solid #f0a400; background:rgba(240,164,0,.1); }
.gg-warn > b{ font-size:14.5px; color:#b26a00; } .gg-warn > small{ font-size:12.5px; line-height:1.5; color:var(--text-light,#666); }
.gg-warn .w{ display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; font-size:14px; } .gg-warn .w span{ flex:1 1 12em; min-width:0; overflow-wrap:anywhere; }
.gg-info{ margin:0 0 10px; padding:6px 10px 6px 26px; border-radius:12px; background:rgba(120,132,156,.1); font-size:13px; line-height:1.6; } .gg-info li{ overflow-wrap:anywhere; }
.gg-prz{ margin:0 0 12px; padding:8px 10px; border-radius:14px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); }
.gg-ph2{ display:flex; align-items:center; gap:8px; margin:0 0 2px; } .gg-ph2 > b{ flex:1; font-size:16px; }
.gg-prz .sec{ padding:6px 0; border-top:1px solid rgba(120,132,156,.2); } .gg-prz .sec:first-of-type{ border-top:0; }
.gg-prz .st{ display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px; } .gg-prz .st b{ font-size:15px; } .gg-prz .st small{ font-size:12.5px; color:var(--text-light,#666); } .gg-prz .st .ic{ font-size:16px; }
.gg-prz .pr{ display:flex; flex-wrap:wrap; align-items:baseline; gap:0 8px; padding:3px 0 3px 24px; font-size:15px; }
.gg-prz .pr .lb{ flex:none; min-width:3.6em; font-weight:bold; color:var(--text-light,#666); } .gg-prz .k-ind .pr .lb{ color:#b8860b; }
.gg-prz .pr .nm{ flex:1; min-width:0; font-weight:bold; overflow-wrap:anywhere; } .gg-prz .pr .nm small{ font-weight:normal; font-size:12.5px; color:var(--text-light,#666); }
.gg-prz .pr .sc{ flex:none; font-size:13.5px; color:var(--text-light,#666); }
.gg-prz .pr .mm{ flex:1 1 100%; padding-left:calc(3.6em + 8px); font-size:12.5px; line-height:1.5; color:var(--text-light,#666); overflow-wrap:anywhere; }
.gg-h4{ margin:14px 0 6px; font-size:15px; }
.gg-rk{ display:flex; flex-direction:column; gap:4px; }
.gg-rr{ display:flex; align-items:center; gap:8px; min-height:44px; padding:4px 8px; border-radius:10px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); box-sizing:border-box; }
.gg-rr.hot{ border-color:rgba(184,134,11,.55); background:rgba(255,193,7,.08); } .gg-rr.warn{ border:1.5px solid #f0a400; }
.gg-rr .p{ flex:none; min-width:1.8em; font-size:17px; font-weight:bold; text-align:right; }
.gg-rr .nm{ flex:1; min-width:0; overflow-wrap:anywhere; } .gg-rr .nm > b{ display:block; font-size:15.5px; }
.gg-rr .sub{ display:flex; flex-wrap:wrap; align-items:center; gap:2px 6px; margin-top:1px; } .gg-rr .sub small{ font-size:12px; color:var(--text-light,#666); }
.gg-rr .sc{ flex:none; display:inline-flex; align-items:baseline; gap:2px; } .gg-rr .sc b{ font-size:17px; } .gg-rr .sc small{ font-size:12px; color:var(--text-light,#666); } .gg-rr .sc .raw{ margin-left:6px; } .gg-rr .sc .h{ margin-left:6px; font-style:normal; font-size:13.5px; font-weight:bold; color:#2e7d32; }
.gg-rr .bd{ padding:0 7px; border-radius:10px; font-size:11.5px; line-height:1.6; font-style:normal; font-weight:bold; background:rgba(120,132,156,.16); color:var(--text,#222); white-space:nowrap; }
.gg-rr .bd.k-ind{ background:#ffe082; color:#5d4100; } .gg-rr .bd.k-team{ background:#bbdefb; color:#0d3c61; } .gg-rr .bd.k-tobi{ background:#e1bee7; color:#4a148c; }
.gg-rr .bd.k-booby, .gg-rr .bd.k-bmaker{ background:#f8bbd0; color:#880e4f; } .gg-rr .bd.tie{ background:transparent; border:1px solid rgba(120,132,156,.5); color:var(--text-light,#666); }
.gg-up{ flex:none; min-width:40px; min-height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; font-family:inherit; }
.gg-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.gg-pop{ width:100%; max-width:600px; max-height:88%; overflow:auto; box-sizing:border-box; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.gg-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .gg-ph b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.gg-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.gg-f{ display:flex; align-items:center; gap:8px; margin:8px 0; flex-wrap:wrap; } .gg-f > span{ min-width:6.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.gg-f input[type=text], .gg-f input[type=date]{ flex:1 1 140px; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.gg-f input.sm{ flex:0 0 4em; width:4em; text-align:right; } .gg-f em{ font-style:normal; font-size:12.5px; color:var(--text-light,#666); }
.gg-rad{ display:inline-flex; align-items:center; gap:5px; min-height:40px; font-size:14px; cursor:pointer; } .gg-rad input{ width:20px; height:20px; margin:0; }
.gg-ck2{ display:flex; align-items:flex-start; gap:8px; margin:10px 0 4px; font-size:14px; line-height:1.5; cursor:pointer; } .gg-ck2 input{ width:20px; height:20px; flex:none; margin:1px 0 0; }
.gg-help{ margin:6px 0; font-size:13px; line-height:1.6; color:var(--text-light,#666); } .gg-help code{ padding:0 4px; border-radius:4px; background:rgba(120,132,156,.15); color:var(--text,#222); font-family:inherit; white-space:nowrap; }
.gg-ta{ display:block; width:100%; box-sizing:border-box; min-height:9em; padding:8px 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; line-height:1.5; font-family:inherit; resize:vertical; }
.gg-sep{ height:1px; background:rgba(120,132,156,.3); margin:12px 0 4px; }
.gg-f[hidden]{ display:none; }
.gg-fcs{ display:flex; flex-direction:column; gap:8px; margin:4px 0 10px; }
.gg-fc{ display:flex; flex-direction:column; align-items:flex-start; gap:3px; width:100%; min-height:64px; padding:10px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.06); color:var(--text,#222); text-align:left; cursor:pointer; font-family:inherit; }
.gg-fc b{ font-size:15.5px; } .gg-fc small{ font-size:12.5px; line-height:1.5; color:var(--text-light,#666); } .gg-fc:disabled{ opacity:.5; cursor:default; }
.gg-seg{ display:flex; gap:6px; margin:0 0 8px; } .gg-seg button{ flex:1; min-height:42px; padding:0 8px; border-radius:21px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; font-family:inherit; }
.gg-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.gg-got{ margin:4px 0; font-size:15px; } .gg-got b{ font-size:18px; }
.gg-gl{ margin:4px 0 8px; padding:6px 10px 6px 26px; border-radius:10px; background:rgba(120,132,156,.1); font-size:13.5px; line-height:1.6; } .gg-gl li{ overflow-wrap:anywhere; } .gg-gl .more{ list-style:none; color:var(--text-light,#666); }
@media (max-width:400px){ .gg-b{ padding:0 10px; } .gg-tabs button{ font-size:14px; } .gg-prz .pr{ padding-left:4px; } }
`+DOC.replace(/\.gg-doc/g, '#printArea .gg-doc');
function ensureDom(){
  if($('ggolfOverlay')) return;
  const s=document.createElement('style'); s.id='ggStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="ggolfOverlay">
  <div class="modal vol-modal gg-modal modal-full" style="position:relative">
    <div class="modal-header"><span>⛳ グラウンドゴルフ</span><button class="modal-close" onclick="closeGgolf()" aria-label="閉じる">✕</button></div>
    <div class="gg-body" id="ggBody"></div>
    <input type="file" id="ggFileIn" accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain" hidden onchange="GGOLF.fileGot(this)">
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('ggolfOverlay'), b=$('ggBody');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  b.addEventListener('input', e=>{ const t=e.target; if(t && t.classList && t.classList.contains('gg-tot')) totFrom(t); });
  // 欄を 離れたら 入った 数で 見せる（「５０」「50打」→ 50）
  b.addEventListener('change', e=>{ const t=e.target; if(!t || !t.classList || !t.classList.contains('gg-tot')) return; const m=mOf(t.dataset.id); if(m && m.tot!=null) t.value=String(m.tot); });
  // Enter：名簿の 合計 → 次の 人・上の 欄は 名前 → チーム → 合計 → 入れる
  b.addEventListener('keydown', e=>{
    const t=e.target; if(e.key!=='Enter' || e.isComposing || !t || !t.classList) return;
    const go=id=>{ e.preventDefault(); const x=$(id); if(x) x.focus(); };
    if(t.classList.contains('gg-tot')){ e.preventDefault(); nextTot(t); }
    else if(t.id==='ggANm') go('ggATm');
    else if(t.id==='ggATm'){ if($('ggATot')) go('ggATot'); else { e.preventDefault(); quick(); } }   // ホールごと：名前 → チーム → 足して スコアへ
    else if(t.id==='ggATot' || t.id==='ggAHio'){ e.preventDefault(); quick(); }
  });
  window.addEventListener('keydown', e=>{
    if(!pop || !isDlgOpen('ggolfOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); popClose(); return; }   // 小さな窓 だけ 閉じる
    // 📝 スコアカード：パソコンの キーでも（1〜9・⌫・← →）
    if(pop.kind!=='card' || !card || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const k=e.key;
    if(/^[1-9]$/.test(k)) cset(+k); else if(k==='Backspace' || k==='Delete') cdel(); else if(k==='ArrowLeft') cpos(card.pos-1); else if(k==='ArrowRight') cpos(card.pos+1); else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); }
function openGgolf(){ ensureDom(); load(); openDlg('ggolfOverlay', cleanup); render(); }
function closeGgolf(){ if(!$('ggolfOverlay') || !isDlgOpen('ggolfOverlay')) return; closeDlg('ggolfOverlay', cleanup); }

window.GGOLF={ newCup, newGo, newCupGo, sel, view:setView, setup:openSetup, setupSave, clear:()=>clearScores(), delCup:()=>delCup(), close:popClose,
  quick:()=>quick(), aHio, hio:setHio, edit:openEdit, editSave, delM:id=>delM(id), bulk:openBulk, bulkGo, pick:()=>pick(), find, grp:setGrp, ann:setAnn,
  up, fix, tup, tfix, print:printDoc, copy, table:toTable, text, rows, html:()=>{ const c=C(); return c ? docHtml(c) : ''; },
  xl:openXl, xlOut:k=>xlOut(k), xlRes:()=>xlOut('res'), xlHow:setXlHow, fileIn, fileGot:i=>fileGot(i), gotHow, gotGo:()=>gotGo(),
  card:id=>openCard(id), cset, cdel, cbig:()=>cbig(), cpos, cnext, sInp, editCard,
  // ためす とき 用
  cardAt:()=>card ? Object.assign({}, card) : null, setSet:o=>{ const c=C(); if(c){ setSet(c, cleanSet(Object.assign({}, c.set, o))); save(); render(); } },
  state:()=>JSON.parse(JSON.stringify(st)), parse:parseLines, addMany, tplBlob, resBlob, readFile, showGot, importNow:(r,h,t)=>importNow(r,h,t), csvRows, decodeText, ids:()=>{ const c=C(); return c ? c.mem.slice().sort(bySeq).map(m=>m.id) : []; },
  result:()=>{ const c=C(); if(!c) return null; const R=calc(c);
    return {order:R.list.map(m=>m.name), at:Object.keys(R.at).map(p=>p+':'+R.at[p].map(x=>x.l).join('+')), warn:warnN(R), pend:R.pend.map(m=>m.name),
      teams:R.teams.map(t=>t.name+':'+(c.set.tmode==='avg' ? fmt1(t.score) : t.sum)), hio:R.hio.times+'/'+R.hio.need+'/'+R.hio.have, notes:notes(c, R),
      secs:sections(c, R).map(s=>s.k+'='+s.rows.map(r=>r.lab+' '+r.name).join(','))}; } };
Object.assign(window, { openGgolf, closeGgolf });
})();
