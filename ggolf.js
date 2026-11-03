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
   ・中身は excalc_ggolf（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_ggolf', MAX_C=40, MAX_M=300, MAX_TOT=999, MAX_HIO=99;
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

/* ───────── 状態 ───────── */
// 賞の 決め方。ind：個人賞（上位 何人）・team：チーム賞（上位 いくつ）・tmode：チームの 成績（sum 合計／avg 平均）・
// tobi：とび賞の 位・booby：ブービー賞・bmaker：ブービーメーカー賞・hio：ホールインワン賞の 用意（0＝見ない）・hone：1人 1つ まで
const DEF={ind:5, team:1, tmode:'sum', tobi:[10,15,20,25], booby:true, bmaker:false, hio:15, hone:false};
function tobiList(v){ return [...new Set(String(Array.isArray(v) ? v.join(',') : v==null ? '' : v).normalize('NFKC').split(/[^0-9]+/).filter(Boolean).map(Number).filter(n=>n>=2 && n<=MAX_M))].sort((a,b)=>a-b).slice(0,20); }
function cleanSet(x){
  x=(x && typeof x==='object') ? x : {};
  return {ind:numIn(x.ind,0,30,DEF.ind), team:numIn(x.team,0,10,DEF.team), tmode:x.tmode==='avg' ? 'avg' : 'sum',
    tobi:x.tobi===undefined ? DEF.tobi.slice() : tobiList(x.tobi), booby:x.booby===undefined ? DEF.booby : !!x.booby, bmaker:!!x.bmaker,
    hio:numIn(x.hio,0,999,DEF.hio), hone:!!x.hone};
}
// 人：tot 合計（null＝まだ）・hio ホールインワンの 数・tb／tg 同じ 成績の 中で 決めた 順と その ときの 成績（tg が いまと ちがえば 決めなおし）・s 入れた 順
function cleanM(x){
  if(!x || typeof x!=='object') return null;
  const name=oneLine(x.name,24); if(!name) return null;
  return {id:okId(x.id) ? x.id : rid(), name, team:teamIn(x.team), tot:x.tot==null || x.tot==='' ? null : totIn(x.tot), hio:numIn(x.hio,0,MAX_HIO,0),
    tb:numIn(x.tb,0,MAX_M,0), tg:oneLine(x.tg,20), s:numIn(x.s,0,1e9,-1)};
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
  return {id:okId(x.id) ? x.id : rid(), title:oneLine(x.title,40)||'グラウンドゴルフ大会', date:okDate(x.date) ? x.date : '', set:cleanSet(x.set), mem, ttb};
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
const keyM=m=>m.tot+'|'+m.hio;
const fixed=m=>m.tb>0 && m.tg===keyM(m);
// 合計の 少ない 順 → ホールインワンの 多い 順 → 決めた 順 → 入れた 順
function cmpM(a,b){ return a.tot-b.tot || b.hio-a.hio || (fixed(a) ? a.tb : 1e6)-(fixed(b) ? b.tb : 1e6) || a.s-b.s; }
function teamsOf(c){
  const by=new Map();
  c.mem.slice().sort(bySeq).forEach(m=>{
    if(!m.team) return;
    let t=by.get(m.team); if(!t){ t={name:m.team, mem:[], n:0, sum:0, hio:0, miss:0, s:m.s}; by.set(m.team, t); }
    t.mem.push(m); if(m.tot==null){ t.miss++; return; } t.n++; t.sum+=m.tot; t.hio+=m.hio;
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
const scTxt=m=>m.tot==null ? 'まだ' : m.tot+'打'+(m.hio ? '・⛳'+m.hio : '');
const tScTxt=(c,t)=>(c.set.tmode==='avg' ? '平均 '+fmt1(t.score)+'打' : '合計 '+t.sum+'打')+'（'+t.n+'人）'+(t.hio ? '・⛳'+t.hio : '');
const posTxt=(a,b)=>b-a===1 ? a+'位・'+b+'位' : a+'〜'+b+'位';
function hioSub(c, H){
  const S=c.set;
  if(!H.times) return 'まだ 出て いません'+(S.hio ? '（用意 '+S.hio+'個）' : '');
  return (S.hone ? H.who.length+'人（1人 1つ）' : H.times+'回')+(S.hio ? ' ／ 用意 '+S.hio+'個'+(H.need<=S.hio ? '・のこり '+(S.hio-H.need)+'個' : '・'+(H.need-S.hio)+'個 たりない') : '');
}
// 賞の 一覧（ふだんの 順）。rows：lab 位・name・team・sc 成績・mem チームの 人
function sections(c, R){
  const S=c.set, L=R.list, out=[], medal=['🥇','🥈','🥉'];
  const row=(p, lab)=>{ const m=L[p-1]; return {lab:lab||p+'位', name:m.name, team:m.team, sc:scTxt(m)}; };
  const ind=Math.min(S.ind, R.N);
  if(ind) out.push({k:'ind', ic:'🥇', t:'個人賞', rows:Array.from({length:ind}, (_,i)=>row(i+1, (medal[i]||'')+(i+1)+'位'))});
  if(R.tN) out.push({k:'team', ic:'👥', t:'チーム賞', rows:R.teams.slice(0, R.tN).map((t,i)=>({lab:(i+1)+'位', name:t.name, team:'', sc:tScTxt(c, t), mem:t.mem.map(m=>m.name).join('・')}))});
  if(R.tobi.length) out.push({k:'tobi', ic:'🎯', t:'とび賞', rows:R.tobi.map(p=>row(p))});
  if(R.booby) out.push({k:'booby', ic:'🎈', t:'ブービー賞', rows:[row(R.booby)]});
  if(R.bmaker) out.push({k:'bmaker', ic:'🎈', t:'ブービーメーカー賞', rows:[row(R.bmaker)]});
  out.push({k:'hio', ic:'⛳', t:'ホールインワン賞', sub:hioSub(c, R.hio), rows:R.hio.who.map(m=>({lab:m.hio+'回', name:m.name, team:m.team, sc:''}))});
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
  S.booby ? 'ブービー' : '', S.bmaker ? 'ブービーメーカー' : '', 'ホールインワン'+(S.hio ? ' '+S.hio+'個' : '')].filter(Boolean).join('・'); };
function sumN(c, R){
  return `<span>入れた <b>${R.N}</b>／${c.mem.length}人</span><span>⛳ ホールインワン <b>${R.hio.times}</b>回</span>`
    +(R.pend.length ? `<span class="pend">まだ ${R.pend.length}人</span>` : c.mem.length ? '<span class="ok">ぜんぶ 入りました ✓</span>' : '');
}
function render(){
  const b=$('ggBody'); if(!b) return;
  const c=C(), top=b.scrollTop;
  if(!c){
    b.innerHTML=`<div class="gg-wrap"><div class="gg-empty"><p>グラウンドゴルフの 大会の 成績を まとめます。<br>1人ずつ <b>合計</b>と <b>ホールインワンの 数</b>を 入れるだけで、順位と 賞（個人賞・チーム賞・とび賞・ブービー賞・ホールインワン賞）が 出ます。</p>
      <button type="button" class="gg-b pri" onclick="GGOLF.newCup()">＋ 新しい 大会を 作る</button></div></div>`;
    return;
  }
  const R=calc(c), wn=warnN(R);
  b.innerHTML=`<div class="gg-wrap">
    <div class="gg-top"><select class="gg-sel" aria-label="大会を えらぶ" onchange="GGOLF.sel(this.value)">${st.cups.map(x=>`<option value="${x.id}"${x.id===c.id ? ' selected' : ''}>${esc(x.title)}${x.date ? '（'+md(x.date)+'）' : ''}</option>`).join('')}</select>
      <button type="button" class="gg-b" onclick="GGOLF.newCup()">＋ 新しい 大会</button><button type="button" class="gg-b" onclick="GGOLF.setup()" aria-label="大会と 賞の 設定">⚙ 設定</button></div>
    <div class="gg-sum"><div class="h"><b>${esc(c.title)}</b>${c.date ? `<span>📅 ${esc(jd(c.date))}</span>` : ''}</div>
      <div class="n" id="ggSumN">${sumN(c, R)}</div>
      <div class="r"><span>賞：${esc(RULE(c))}</span><button type="button" class="gg-lnk" onclick="GGOLF.setup()">⚙ かえる</button></div></div>
    <div class="gg-tabs" role="tablist">${[['in','✏ 成績を 入れる'],['res','🏆 順位・賞']].map(([v,t])=>`<button type="button" role="tab" aria-selected="${st.view===v}" class="${st.view===v ? 'on' : ''}" onclick="GGOLF.view('${v}')">${t}${v==='res' && wn ? ' <i class="wn">⚠</i>' : ''}</button>`).join('')}</div>
    ${st.view==='res' ? resHtml(c, R) : inHtml(c)}</div>`;
  b.scrollTop=top;
}
// ✏ 成績を 入れる
function inHtml(c){
  const teams=[...new Set(c.mem.slice().sort(bySeq).map(m=>m.team).filter(Boolean))];
  const add=`<div class="gg-add">
    <div class="r"><input id="ggANm" type="text" maxlength="24" placeholder="名前" aria-label="足す 人の 名前" enterkeyhint="next" autocomplete="off"><input id="ggATm" type="text" maxlength="16" placeholder="チーム" aria-label="足す 人の チーム（なくても よい）" enterkeyhint="next" list="ggTeams" autocomplete="off" value="${esc(addTeam)}"></div>
    <div class="r"><label class="f"><span>合計</span><input id="ggATot" type="text" inputmode="numeric" enterkeyhint="done" aria-label="足す 人の 合計（打数）" autocomplete="off"><em>打</em></label>
      <span class="gg-step" role="group" aria-label="足す 人の ホールインワン"><b class="ic" aria-hidden="true">⛳</b><button type="button" onclick="GGOLF.aHio(-1)" aria-label="ホールインワンを 1つ 減らす">−</button><input id="ggAHio" type="text" inputmode="numeric" enterkeyhint="done" value="0" aria-label="足す 人の ホールインワンの 数" autocomplete="off"><button type="button" onclick="GGOLF.aHio(1)" aria-label="ホールインワンを 1つ 増やす">＋</button></span>
      <button type="button" class="gg-b pri" onclick="GGOLF.quick()">＋ 入れる</button></div>
    <datalist id="ggTeams">${teams.map(t=>`<option value="${esc(t)}"></option>`).join('')}</datalist></div>`;
  const list=c.mem.length ? `<div class="gg-lh"><b>名簿（${c.mem.length}人）</b>${teams.length ? `<label class="gg-ck"><input type="checkbox" ${st.grp ? 'checked' : ''} onchange="GGOLF.grp(this.checked)"> チームごと</label>` : ''}</div>
    ${c.mem.length>=12 ? `<input class="gg-q" id="ggQ" type="search" placeholder="🔎 名前・チームで さがす" aria-label="名前・チームで さがす" value="${esc(q)}" oninput="GGOLF.find(this.value)" autocomplete="off">` : ''}
    <div id="ggListBox">${listHtml(c)}</div>`
    : '<p class="gg-note">まだ だれも いません。上の 欄で 1人ずつ 足すか、下の「📝 まとめて 入れる」「📇 名簿から」で 名簿を 入れてください。</p>';
  return add+list+`<div class="gg-acts"><button type="button" class="gg-b" onclick="GGOLF.bulk()">📝 まとめて 入れる</button><button type="button" class="gg-b" onclick="GGOLF.pick()">📇 名簿から</button></div>
    <p class="gg-note">合計（打数）と ホールインワンの 数を 入れると「🏆 順位・賞」に 順位と 賞が 出ます。合計を 打って Enter で 次の 人へ 進みます。名前を 押すと 直す・消す が できます。</p>`;
}
function listHtml(c){
  if(c.mem.length<12) q='';   // 🔎 が 出ない ときは しぼらない
  const k=norm(q), all=c.mem.slice().sort(bySeq), no=new Map(all.map((m,i)=>[m.id, i+1]));
  const ms=all.filter(m=>!k || norm(m.name).includes(k) || norm(m.team).includes(k));
  if(!ms.length) return '<p class="gg-note">当てはまる 人は いません。</p>';
  if(!st.grp || !c.mem.some(m=>m.team)) return `<div class="gg-list">${ms.map(m=>rowHtml(m, no.get(m.id))).join('')}</div>`;
  const keys=[...new Set(ms.map(m=>m.team))].sort((a,b)=>a==='' ? 1 : b==='' ? -1 : a.localeCompare(b,'ja',{numeric:true}));
  return keys.map(t=>`<h5 class="gg-gh" data-team="${esc(t)}">${esc(t||'チームなし')}<small>${esc(grpSub(c, t))}</small></h5><div class="gg-list">${ms.filter(m=>m.team===t).map(m=>rowHtml(m, no.get(m.id))).join('')}</div>`).join('');
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
  const w=R.ties.filter(t=>t.hot.length && !t.ok).map(t=>`<div class="w"><span>${posTxt(t.from, t.to)}：${t.ms.map(m=>esc(m.name)).join('・')}（${t.ms[0].tot}打${t.ms[0].hio ? '・⛳'+t.ms[0].hio : ''}）</span><button type="button" class="gg-b sm" onclick="GGOLF.fix('${t.ms[0].id}')">✓ この 順で 決める</button></div>`)
    .concat(R.tties.filter(t=>t.hot && !t.ok).map(t=>`<div class="w"><span>チーム ${posTxt(t.from, t.to)}：${t.ts.map(x=>esc(x.name)).join('・')}</span><button type="button" class="gg-b sm" onclick="GGOLF.tfix(${t.from})">✓ この 順で 決める</button></div>`));
  const nt=notes(c, R);
  let secs=sections(c, R); if(st.ann) secs=annOrder(secs);
  return (w.length ? `<div class="gg-warn" role="status"><b>⚠ 同じ 成績で 賞が かわる 人が います</b>${w.join('')}<small>じゃんけん・年上 など 大会の 決まりで 決めて、下の 順位の ▲ で 並べかえてから「✓ この 順で 決める」を 押します。</small></div>` : '')
    +(nt.length ? `<ul class="gg-info">${nt.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : '')
    +`<div class="gg-prz"><div class="gg-ph2"><b>🏆 賞</b><label class="gg-ck"><input type="checkbox" ${st.ann ? 'checked' : ''} onchange="GGOLF.ann(this.checked)"> 🎤 発表の 順</label></div>
      ${secs.map(s=>`<div class="sec k-${s.k}"><div class="st"><span class="ic" aria-hidden="true">${s.ic}</span><b>${s.t}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</div>`
        +s.rows.map(r=>`<div class="pr"><span class="lb">${esc(r.lab)}</span><span class="nm">${esc(r.name)}${r.team ? `<small>（${esc(r.team)}）</small>` : ''}</span>${r.sc ? `<span class="sc">${esc(r.sc)}</span>` : ''}${r.mem ? `<small class="mm">${esc(r.mem)}</small>` : ''}</div>`).join('')+'</div>').join('')}</div>`
    +rankHtml(R)+teamHtml(c, R)
    +`<div class="gg-acts"><button type="button" class="gg-b" onclick="GGOLF.print()">🖨 印刷</button><button type="button" class="gg-b" onclick="GGOLF.copy()">📋 コピー</button><button type="button" class="gg-b" onclick="GGOLF.table()">▦ 表に 入れる</button></div>
    <p class="gg-note">順位は 合計の 少ない 順、同じ ときは ホールインワンの 多い 順です。それも 同じ 人には「同点」と 出ます。</p>`;
}
function rankHtml(R){
  const tie=new Map(); R.ties.forEach(t=>t.ms.forEach((m,i)=>tie.set(m.id, {t, i})));
  return `<h4 class="gg-h4">📋 順位（${R.N}人）</h4><div class="gg-rk">${R.list.map((m,i)=>{
    const p=i+1, pz=R.at[p]||[], ti=tie.get(m.id), n=esc(m.name);
    const sub=(m.team ? `<small>${esc(m.team)}</small>` : '')+pz.map(x=>`<i class="bd k-${x.k}">${x.l}</i>`).join('')+(ti ? '<i class="bd tie">同点</i>' : '');
    return `<div class="gg-rr${pz.length ? ' hot' : ''}${ti && ti.t.hot.length && !ti.t.ok ? ' warn' : ''}" data-id="${m.id}"><span class="p">${p}</span><span class="nm"><b>${n}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</span>
      <span class="sc"><b>${m.tot}</b><small>打</small>${m.hio ? `<i class="h">⛳${m.hio}</i>` : ''}</span>${ti && ti.i>0 ? `<button type="button" class="gg-up" onclick="GGOLF.up('${m.id}')" aria-label="${n}を 同点の 中で 1つ 上へ">▲</button>` : ''}</div>`; }).join('')}</div>`;
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
  const nc=cleanC({title:oneLine(o.title,40)||'グラウンドゴルフ大会', date:o.date===undefined ? ymd(new Date()) : (okDate(o.date) ? o.date : ''), set:prev ? prev.set : undefined, mem:[]});
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
    <label class="gg-f"><span>個人賞</span><em>上位</em><input id="ggSInd" class="sm" type="text" inputmode="numeric" value="${S.ind}"><em>人まで（0＝なし）</em></label>
    <label class="gg-f"><span>チーム賞</span><em>上位</em><input id="ggSTeam" class="sm" type="text" inputmode="numeric" value="${S.team}"><em>チームまで（0＝なし）</em></label>
    <div class="gg-f" role="radiogroup" aria-label="チームの 成績"><span>チームの 成績</span><label class="gg-rad"><input type="radio" name="ggSTm" value="sum"${S.tmode==='sum' ? ' checked' : ''}> 合計</label><label class="gg-rad"><input type="radio" name="ggSTm" value="avg"${S.tmode==='avg' ? ' checked' : ''}> 平均（人数が ちがう とき）</label></div>
    <label class="gg-f"><span>とび賞</span><input id="ggSTobi" type="text" inputmode="numeric" value="${S.tobi.join('、')}" placeholder="例：10、15、20、25（空＝なし）"><em>位</em></label>
    <label class="gg-ck2"><input id="ggSBooby" type="checkbox"${S.booby ? ' checked' : ''}> ブービー賞（下から 2番め）</label>
    <label class="gg-ck2"><input id="ggSBmaker" type="checkbox"${S.bmaker ? ' checked' : ''}> ブービーメーカー賞（いちばん 下）</label>
    <label class="gg-f"><span>ホールインワン賞</span><em>用意</em><input id="ggSHio" class="sm" type="text" inputmode="numeric" value="${S.hio}"><em>個（たりるか 見ます。0＝見ない）</em></label>
    <label class="gg-ck2"><input id="ggSHone" type="checkbox"${S.hone ? ' checked' : ''}> ホールインワン賞は 1人 1つ まで（何回 出ても）</label>
    <div class="gg-acts end"><button type="button" class="gg-b" onclick="GGOLF.close()">やめる</button><button type="button" class="gg-b pri" onclick="GGOLF.setupSave()">✓ 保存</button></div>
    <div class="gg-sep"></div>
    <div class="gg-acts"><button type="button" class="gg-b" onclick="GGOLF.clear()">🧹 成績を 空に する（名簿は 残す）</button><button type="button" class="gg-b warn" onclick="GGOLF.delCup()">🗑 この 大会を 消す</button></div>`, 'setup');
}
function setupSave(){
  const c=C(); if(!c) return;
  const ck=k=>{ const e=$(k); return !!(e && e.checked); }, tm=document.querySelector('#ggolfOverlay input[name="ggSTm"]:checked');
  c.title=oneLine(val('ggSTitle'),40)||c.title; c.date=okDate(val('ggSDate')) ? val('ggSDate') : '';
  c.set=cleanSet({ind:val('ggSInd'), team:val('ggSTeam'), tmode:tm ? tm.value : 'sum', tobi:val('ggSTobi'), booby:ck('ggSBooby'), bmaker:ck('ggSBmaker'), hio:val('ggSHio'), hone:ck('ggSHone')});
  save(); popClose(); render(); toastS('✓ 保存しました');
}
async function clearScores(){
  const c=C(); if(!c) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+c.title+'」の 合計と ホールインワンを ぜんぶ 空に しますか？（名簿と チームは 残ります）', '空に する', 'やめる'))) return;
  c.mem.forEach(m=>{ m.tot=null; m.hio=0; m.tb=0; m.tg=''; }); c.ttb={}; save(); popClose(); render();
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
    <label class="gg-f"><span>合計</span><input id="ggETot" type="text" inputmode="numeric" value="${m.tot==null ? '' : m.tot}" placeholder="まだ"><em>打</em></label>
    <label class="gg-f"><span>ホールインワン</span><input id="ggEHio" type="text" inputmode="numeric" value="${m.hio}"><em>回</em></label>
    <div class="gg-acts end"><button type="button" class="gg-b warn" onclick="GGOLF.delM('${m.id}')">🗑 消す</button><button type="button" class="gg-b" onclick="GGOLF.close()">やめる</button><button type="button" class="gg-b pri" onclick="GGOLF.editSave('${m.id}')">✓ 保存</button></div>`, 'edit', id);
}
function editSave(id){
  const c=C(), m=mOf(id); if(!c || !m) return;
  const name=oneLine(val('ggEName'),24); if(!name){ toastS('名前を 入れてください'); return; }
  const raw=String(val('ggETot')).trim(), tot=raw==='' ? null : totIn(raw);
  if(raw!=='' && tot==null){ toastS('合計は 1〜'+MAX_TOT+' の 数で 入れてください'); return; }
  m.name=name; m.team=teamIn(val('ggETeam')); m.tot=tot; m.hio=numIn(val('ggEHio'),0,MAX_HIO,0);
  save(); popClose(); render();
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
    for(let k=0; k<2; k++){   // うしろの 数（合計・ホールインワン）。名前に くっついた 数（佐藤2 など）は 名前の まま
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
    if(nums.length){ x.tot=totIn(nums[0]); if(nums.length>1){ x.hio=numIn(nums[1],0,MAX_HIO,0); x.hioSet=true; } }
    out.push(x);
  });
  return out;
}
function nameTeam(s){ const m=/^(.*?)[／/](.*)$/.exec(String(s||'')); return m ? {name:oneLine(m[1],24), team:teamIn(m[2])} : {name:oneLine(s,24), team:''}; }
// 同じ 名前（空白・全角半角の ちがいは 見ない。チームを 書いた ときは 同じ チームか チームなし）の 人
function findM(c, name, team){ const k=nk(name); return c.mem.find(m=>nk(m.name)===k && (!team || !m.team || m.team===team))||null; }
// いれば 成績を 入れる（'upd'）・いなければ 足す（'add'）・いっぱい（'full'）
function putM(c, x){
  const m=findM(c, x.name, x.team);
  if(m){ if(x.team) m.team=x.team; if(x.tot!=null) m.tot=x.tot; if(x.hioSet) m.hio=x.hio; return 'upd'; }
  if(c.mem.length>=MAX_M) return 'full';
  const n=cleanM({name:x.name, team:x.team, tot:x.tot, hio:x.hio||0, s:nextS(c)}); if(!n) return 'full';
  c.mem.push(n); return 'add';
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
  const rk=R.list.map((m,i)=>`<tr><td class="c">${i+1}</td><td class="nm">${esc(m.name)}</td><td>${esc(m.team)}</td><td class="r">${m.tot}</td><td class="c">${m.hio||''}</td><td>${(R.at[i+1]||[]).map(x=>x.l).join('・')}</td></tr>`).join('')
    +R.pend.map(m=>`<tr class="pend"><td class="c">—</td><td class="nm">${esc(m.name)}</td><td>${esc(m.team)}</td><td class="r">まだ</td><td class="c">${m.hio||''}</td><td></td></tr>`).join('');
  const tm=R.teams.length ? `<h2>チームの 順位（${avg ? '平均' : '合計'}）</h2><table><thead><tr><th>順位</th><th>チーム</th><th>人数</th><th>${avg ? '平均' : '合計'}</th><th>⛳</th><th>賞</th><th>メンバー</th></tr></thead><tbody>`
    +R.teams.map((t,i)=>`<tr><td class="c">${i+1}</td><td class="nm">${esc(t.name)}</td><td class="c">${t.n}${t.miss ? '（まだ '+t.miss+'）' : ''}</td><td class="r">${avg ? fmt1(t.score) : t.sum}</td><td class="c">${t.hio||''}</td><td>${i<R.tN ? 'チーム賞' : ''}</td><td>${esc(t.mem.map(m=>m.name).join('・'))}</td></tr>`).join('')+'</tbody></table>' : '';
  return `<div class="gg-doc"><h1>⛳ ${esc(c.title)}</h1>
    <div class="meta">${esc([jd(c.date), '参加 '+R.N+'人', 'ホールインワン '+R.hio.times+'回', R.pend.length ? 'まだ '+R.pend.length+'人' : ''].filter(Boolean).join('　'))}</div>
    <h2>賞</h2><table class="prz"><thead><tr><th>賞</th><th>位</th><th>名前</th><th>チーム</th><th>成績</th></tr></thead><tbody>${prz}</tbody></table>
    <h2>順位</h2><table><thead><tr><th>順位</th><th>名前</th><th>チーム</th><th>合計</th><th>⛳</th><th>賞</th></tr></thead><tbody>${rk}</tbody></table>
    ${tm}<div class="note">順位は 合計の 少ない 順、同じ ときは ホールインワンの 多い 順。</div></div>`;
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
  if(R.N){ out.push('', '📋 順位'); R.list.forEach((m,i)=>out.push((i+1)+'. '+m.name+(m.team ? '（'+m.team+'）' : '')+'　'+scTxt(m))); }
  if(R.teams.length){ out.push('', '👥 チームの 順位'); R.teams.forEach((t,i)=>out.push((i+1)+'. '+t.name+'　'+tScTxt(c, t))); }
  return out.join('\n');
}
function copy(){ if(!C()){ toastS('大会が ありません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 コピーしました（LINE などに 貼れます）'); }
function rows(){
  const c=C(); if(!c) return [];
  const R=calc(c), avg=c.set.tmode==='avg', r=[['順位','名前','チーム','合計','ホールインワン','賞']];
  R.list.forEach((m,i)=>r.push([i+1, m.name, m.team, m.tot, m.hio||'', (R.at[i+1]||[]).map(x=>x.l).concat(m.hio ? ['ホールインワン賞'] : []).join('・')]));
  R.pend.forEach(m=>r.push(['まだ', m.name, m.team, '', m.hio||'', m.hio ? 'ホールインワン賞' : '']));
  if(R.teams.length){
    r.push(['','','','','',''], ['チーム順位','チーム','人数', avg ? '平均' : '合計','ホールインワン','賞']);
    R.teams.forEach((t,i)=>r.push([i+1, t.name, t.n, avg ? Math.round(t.score*10)/10 : t.sum, t.hio||'', i<R.tN ? 'チーム賞' : '']));
  }
  return r;
}
function toTable(){ const c=C(); if(!c || !c.mem.some(m=>m.tot!=null)){ toastS('まだ 合計が 入って いません'); return; } if(typeof toolPasteRows==='function') toolPasteRows(rows(), 'グラウンドゴルフ', closeGgolf); }

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
.gg-rr .sc{ flex:none; display:inline-flex; align-items:baseline; gap:2px; } .gg-rr .sc b{ font-size:17px; } .gg-rr .sc small{ font-size:12px; color:var(--text-light,#666); } .gg-rr .sc .h{ margin-left:6px; font-style:normal; font-size:13.5px; font-weight:bold; color:#2e7d32; }
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
    else if(t.id==='ggATm') go('ggATot');
    else if(t.id==='ggATot' || t.id==='ggAHio'){ e.preventDefault(); quick(); }
  });
  window.addEventListener('keydown', e=>{
    if(e.key!=='Escape' || !pop || !isDlgOpen('ggolfOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();   // 小さな窓 だけ 閉じる
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); }
function openGgolf(){ ensureDom(); load(); openDlg('ggolfOverlay', cleanup); render(); }
function closeGgolf(){ if(!$('ggolfOverlay') || !isDlgOpen('ggolfOverlay')) return; closeDlg('ggolfOverlay', cleanup); }

window.GGOLF={ newCup, newGo, newCupGo, sel, view:setView, setup:openSetup, setupSave, clear:()=>clearScores(), delCup:()=>delCup(), close:popClose,
  quick:()=>quick(), aHio, hio:setHio, edit:openEdit, editSave, delM:id=>delM(id), bulk:openBulk, bulkGo, pick:()=>pick(), find, grp:setGrp, ann:setAnn,
  up, fix, tup, tfix, print:printDoc, copy, table:toTable, text, rows, html:()=>{ const c=C(); return c ? docHtml(c) : ''; },
  // ためす とき 用
  state:()=>JSON.parse(JSON.stringify(st)), parse:parseLines, addMany, ids:()=>{ const c=C(); return c ? c.mem.slice().sort(bySeq).map(m=>m.id) : []; },
  result:()=>{ const c=C(); if(!c) return null; const R=calc(c);
    return {order:R.list.map(m=>m.name), at:Object.keys(R.at).map(p=>p+':'+R.at[p].map(x=>x.l).join('+')), warn:warnN(R), pend:R.pend.map(m=>m.name),
      teams:R.teams.map(t=>t.name+':'+(c.set.tmode==='avg' ? fmt1(t.score) : t.sum)), hio:R.hio.times+'/'+R.hio.need+'/'+R.hio.have, notes:notes(c, R),
      secs:sections(c, R).map(s=>s.k+'='+s.rows.map(r=>r.lab+' '+r.name).join(','))}; } };
Object.assign(window, { openGgolf, closeGgolf });
})();
