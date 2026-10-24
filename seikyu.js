/* 📃 請求書づくり（v575。表電卓の道具。はじめて開いたときに読む。apps/seikyu/ から単独のアプリとしても開ける）
   金額は 上から 順に 決める（どの段で いくらに なったかを 画面に 出す）：
   ① 品物と定価：品名・定価（1つの値段）・数量・単位（いくつでも）→ 定価の合計
   ② 値引き：なし／割引率（○％引き）／掛け率（○掛け。8 なら 8掛け＝定価の80％）／値引き額（円）／この金額にする（売る値段から 逆算）／
      基準額から（原価・仕入れ値などの 基準額に ○％ か ○円 上乗せした 値段にする）→ 定価の合計からの 値引き額が 決まる
   ③ オプション：つけたものを 足す（✓ で つける・外す）
   ④ 条件で 値下げ：数量の合計・オプションの数・オプションの金額・定価の合計・定価＋オプション が ○以上、または 手で ✓ したとき、
      定価を ○円（1つにつき。数量の合計を かける）か ○％ 下げる。条件は 値下げの前の数で 見る。満たしていないときは「あと ○」を 出す。
   ⑤ 消費税：10％・8％・なし。1円未満は 切り捨て／四捨五入／切り上げ。→ 合計（税込）
   ⑥ 請求額：端数を省いた 金額（税込）を 入れる（百円・千円・1万円・10万円 未満を 切り捨てる ボタンも）と、その金額の
      消費税額＝請求額×税率÷(100＋税率)（1円未満は ⑤と同じ）・本体価格＝請求額−消費税額 を 出す。
      ⑤の合計との 差は「端数値引き」として 明細に 入れるので、紙の 小計・消費税・合計が そろう。
   ⑦ 請求書の形（A4）で 見る・印刷（PDF に 保存も）・文字で コピー。見積書・納品書にも 切りかえられる。
   ・自分の会社（名前・住所・電話・メール・登録番号・振込先・角印）・よく使う品物／オプション／条件・取引先は 覚えておく。
   ・作った書類は「💾 残す」で 一覧に 入る（開いて 直す・複製・消す。200 まで）。ぜんぶ excalc_seikyu（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_seikyu';
const KINDS=[['seikyu','請求書'],['mitsumori','見積書'],['nohin','納品書']];
const DISC=[['none','なし'],['rate','割引率（％引き）'],['kake','掛け率（○掛け）'],['yen','値引き額（円）'],['target','この金額にする'],['base','基準額から']];
const CONDS=[['qty','数量の合計が'],['optn','オプションの数が'],['opty','オプションの金額が'],['teika','定価の合計が'],['sum','定価＋オプションが'],['manual','手で ✓ を入れたとき']];
const REDS=[['yen','定価を ○円 下げる（1つにつき）'],['pct','定価を ○％ 下げる']];
const TAXR=[[10,'10％'],[8,'8％（軽減）'],[0,'なし']];
const RNDS=[['floor','切り捨て'],['round','四捨五入'],['ceil','切り上げ']];
const HONS=[['御中','御中'],['様','様'],['','なし']];
const CUTS=[[100,'百円未満'],[1000,'千円未満'],[10000,'1万円未満'],[100000,'10万円未満']];
const MAX_ITEMS=30, MAX_OPTS=30, MAX_RULES=12, MAX_INV=200, MAX_PROD=100, MAX_OPTM=100, MAX_RULEM=30, MAX_CLI=200;
const MAX_YEN=99999999999, MAX_QTY=999999;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const toastS=m=>{ if(typeof toast==='function') toast(m, 3200); };
const rid=()=>Math.random().toString(36).slice(2,10);
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const dateOk=s=>/^\d{4}-\d\d-\d\d$/.test(s||'') && !isNaN(new Date(s+'T00:00:00').getTime()) ? s : '';
const jdate=s=>{ s=dateOk(s); if(!s) return ''; const [y,m,d]=s.split('-').map(Number); return y+'年'+m+'月'+d+'日'; };
const fmt=n=>Math.round(n).toLocaleString('ja-JP');
const sgn=n=>n<0 ? '−'+fmt(-n) : fmt(n);
const yen=n=>sgn(n)+'円';
const fmtQ=q=>Number(q).toLocaleString('ja-JP', {maximumFractionDigits:3});
const fmtP=p=>Number(p).toLocaleString('ja-JP', {maximumFractionDigits:2});
const RND={floor:x=>Math.floor(x+1e-9), round:x=>Math.round(x), ceil:x=>Math.ceil(x-1e-9)};
const yenOf=x=>Math.round(x);   // 金額は 1円単位（1円未満は 四捨五入）
// 打った数を 読む（全角・カンマ・円・¥ も よい）
function numIn(s, a, b, dflt, dec){
  const t=String(s==null?'':s).normalize('NFKC').replace(/[,，円¥￥\s]/g,'').replace(/^−/,'-');
  if(t==='') return dflt;
  const v=parseFloat(t); if(!isFinite(v)) return dflt;
  const r=dec ? Math.round(v*1000)/1000 : Math.round(v);
  return Math.max(a, Math.min(b, r));
}
const endOfNextMonth=s=>{ const d=new Date((dateOk(s)||ymd(new Date()))+'T00:00:00'); return ymd(new Date(d.getFullYear(), d.getMonth()+2, 0)); };

/* ───────── 状態 ───────── */
let st=null, dirty=false, saveT=0;
const newItem=()=>({name:'', price:0, qty:1, unit:'式'});
const newOpt=()=>({name:'', price:0, qty:1, on:true});
const newRule=()=>({id:rid(), name:'', on:true, c:'optn', th:3, ok:false, red:'yen', rv:0});
function cleanItem(x){ if(!x || typeof x!=='object') return null; return {name:oneLine(x.name,40), price:numIn(x.price,0,MAX_YEN,0), qty:numIn(x.qty,0,MAX_QTY,1,true), unit:oneLine(x.unit,6)}; }
function cleanOpt(x){ if(!x || typeof x!=='object') return null; return {name:oneLine(x.name,40), price:numIn(x.price,0,MAX_YEN,0), qty:numIn(x.qty,0,MAX_QTY,1,true), on:x.on!==false}; }
function cleanRule(x){
  if(!x || typeof x!=='object') return null;
  return {id:/^[a-z0-9]{4,12}$/.test(x.id) ? x.id : rid(), name:oneLine(x.name,40), on:x.on!==false, c:CONDS.some(c=>c[0]===x.c) ? x.c : 'optn',
    th:numIn(x.th,0,MAX_YEN,0), ok:!!x.ok, red:REDS.some(r=>r[0]===x.red) ? x.red : 'yen', rv:numIn(x.rv,0,MAX_YEN,0,true)};
}
function cleanInv(v){
  if(!v || typeof v!=='object') return null;
  const d=(v.disc && typeof v.disc==='object') ? v.disc : {}, t=(v.tax && typeof v.tax==='object') ? v.tax : {}, to=(v.to && typeof v.to==='object') ? v.to : {};
  const date=dateOk(v.date)||ymd(new Date());
  return {id:/^[a-z0-9]{4,12}$/.test(v.id) ? v.id : rid(), kind:KINDS.some(k=>k[0]===v.kind) ? v.kind : 'seikyu', no:oneLine(v.no,24), date, due:v.due==='' ? '' : (dateOk(v.due)||endOfNextMonth(date)),
    to:{name:oneLine(to.name,50), hon:HONS.some(h=>h[0]===to.hon) ? to.hon : '御中'}, subject:oneLine(v.subject,60), memo:multi(v.memo,400),
    items:(Array.isArray(v.items) ? v.items : []).map(cleanItem).filter(Boolean).slice(0,MAX_ITEMS),
    disc:{m:DISC.some(x=>x[0]===d.m) ? d.m : 'none', v:numIn(d.v,-MAX_YEN,MAX_YEN,0,true), base:numIn(d.base,0,MAX_YEN,0), up:numIn(d.up,-MAX_YEN,MAX_YEN,0,true), upm:d.upm==='yen' ? 'yen' : '%'},
    opts:(Array.isArray(v.opts) ? v.opts : []).map(cleanOpt).filter(Boolean).slice(0,MAX_OPTS),
    rules:(Array.isArray(v.rules) ? v.rules : []).map(cleanRule).filter(Boolean).slice(0,MAX_RULES),
    tax:{rate:TAXR.some(r=>r[0]===+t.rate) ? +t.rate : 10, rnd:RNDS.some(r=>r[0]===t.rnd) ? t.rnd : 'floor'},
    final:numIn(v.final,0,MAX_YEN,0), saved:numIn(v.saved,0,8.64e15,0)};
}
function cleanMaster(m){
  m=(m && typeof m==='object') ? m : {};
  const me=(m.me && typeof m.me==='object') ? m.me : {}, df=(m.def && typeof m.def==='object') ? m.def : {};
  const seq={}; if(m.seq && typeof m.seq==='object') Object.keys(m.seq).filter(k=>/^\d{8}$/.test(k)).sort().slice(-60).forEach(k=>{ seq[k]=numIn(m.seq[k],0,999,0); });
  return {
    me:{name:oneLine(me.name,50), person:oneLine(me.person,40), zip:oneLine(me.zip,10), addr:oneLine(me.addr,80), tel:oneLine(me.tel,20), mail:oneLine(me.mail,60),
      reg:oneLine(me.reg,14), bank:multi(me.bank,200), seal:!!me.seal, sealTx:oneLine(me.sealTx,12)},
    prods:(Array.isArray(m.prods) ? m.prods : []).map(cleanItem).filter(x=>x && x.name).slice(0,MAX_PROD),
    optm:(Array.isArray(m.optm) ? m.optm : []).map(cleanOpt).filter(x=>x && x.name).slice(0,MAX_OPTM),
    rulem:(Array.isArray(m.rulem) ? m.rulem : []).map(cleanRule).filter(Boolean).slice(0,MAX_RULEM),
    clis:(Array.isArray(m.clis) ? m.clis : []).filter(c=>c && typeof c==='object').map(c=>({name:oneLine(c.name,50), hon:HONS.some(h=>h[0]===c.hon) ? c.hon : '御中'})).filter(c=>c.name).slice(0,MAX_CLI),
    seq, def:{note:multi(df.note,400), adj:oneLine(df.adj,20)||'端数値引き'}};
}
function nextNo(date){
  const k=(dateOk(date)||ymd(new Date())).replace(/-/g,''); const n=(st.m.seq[k]||0)+1; st.m.seq[k]=n;
  const ks=Object.keys(st.m.seq).sort(); while(ks.length>60) delete st.m.seq[ks.shift()];
  return k+'-'+pad2(n);
}
function freshInv(){
  const date=ymd(new Date());
  return cleanInv({kind:'seikyu', date, due:endOfNextMonth(date), items:[newItem()], opts:[], rules:[], memo:st.m.def.note, to:{hon:'御中'}});
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  st={m:cleanMaster(o.m), invs:(Array.isArray(o.invs) ? o.invs : []).map(cleanInv).filter(Boolean).slice(0,MAX_INV), cur:null};
  st.cur=cleanInv(o.cur)||null;
  if(!st.cur){ st.cur=freshInv(); st.cur.no=nextNo(st.cur.date); }
  dirty=!!o.dirty;
}
function save(){ clearTimeout(saveT); saveT=0; try{ localStorage.setItem(KEY, JSON.stringify({m:st.m, invs:st.invs, cur:st.cur, dirty})); }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); } }
function saveSoon(){ clearTimeout(saveT); saveT=setTimeout(save, 350); }
function touch(){ dirty=true; saveSoon(); }

/* ───────── 計算 ───────── */
function kakeOf(v){ v=+v||0; if(v>0 && v<=1) return v; if(v>1 && v<=10) return v/10; if(v>10 && v<=100) return v/100; return null; }
function baseSell(d){ return d.upm==='yen' ? d.base+yenOf(d.up) : yenOf(d.base*(1+d.up/100)); }
function condVal(c, pre){ return pre[c]; }
function autoName(r){
  const lab={qty:'数量', optn:'オプション', opty:'オプション', teika:'定価の合計', sum:'定価＋オプション'}[r.c];
  const th=r.c==='optn' ? fmtQ(r.th)+'つ' : r.c==='qty' ? fmtQ(r.th) : fmt(r.th)+'円';
  const red=r.red==='yen' ? '定価 '+fmt(r.rv)+'円 値下げ' : '定価 '+fmtP(r.rv)+'％ 値下げ';
  return r.c==='manual' ? '条件の 値下げ（'+red+'）' : lab+' '+th+'以上で '+red;
}
const ruleName=r=>r.name||autoName(r);
function calc(v){
  const warn=[];
  const items=v.items.filter(it=>it.name || it.price), qty=items.reduce((a,it)=>a+it.qty, 0);
  const A=items.reduce((a,it)=>a+yenOf(it.price*it.qty), 0);
  const opts=v.opts.filter(o=>o.on && (o.name || o.price)), O=opts.reduce((a,o)=>a+yenOf(o.price*o.qty), 0), optN=opts.length;
  // ② 値引き
  const d=v.disc; let D=0, dl='お値引き', how='';
  if(d.m==='rate'){ D=yenOf(A*d.v/100); dl='お値引き（'+fmtP(d.v)+'％引き）'; how='定価の合計 '+fmt(A)+'円 の '+fmtP(d.v)+'％'; }
  else if(d.m==='kake'){ const k=kakeOf(d.v); if(k==null){ if(d.v) warn.push('掛け率は 8（8掛け）・0.8・80 の ように 入れてください'); }
    else { const S=yenOf(A*k); D=A-S; dl='お値引き（定価の '+fmtP(k*100)+'％で）'; how='定価の合計 × '+fmtP(k*100)+'％ ＝ '+fmt(S)+'円'; } }
  else if(d.m==='yen'){ D=yenOf(d.v); how=fmt(D)+'円 引く'; }
  else if(d.m==='target'){ if(d.v>0 || A===0){ D=A-yenOf(d.v); how=fmt(d.v)+'円に する'; } }
  else if(d.m==='base'){ if(d.base>0){ const S=baseSell(d); D=A-S; how='基準額 '+fmt(d.base)+'円 '+(d.upm==='yen' ? (d.up<0 ? '−' : '＋')+fmt(Math.abs(d.up))+'円' : (d.up<0 ? '−' : '＋')+fmtP(Math.abs(d.up))+'％')+' ＝ '+fmt(S)+'円'; } }
  if(D<0){ warn.push('決めた 値段が 定価の合計より 高いので、値引きは 0円に しました'); D=0; }
  if(D>A){ warn.push('値引きが 定価の合計より 大きいので、定価の合計までに しました'); D=A; }
  const B=A-D;
  // ④ 条件で 値下げ（値下げの前の 数で 見る）
  const pre={qty, optn:optN, opty:O, teika:A, sum:A+O};
  let Rs=0; const rr=[];
  v.rules.forEach(r=>{
    if(!r.on){ rr.push({r, use:false, met:false, need:0, amt:0}); return; }
    const met=r.c==='manual' ? !!r.ok : condVal(r.c, pre)>=r.th, need=met || r.c==='manual' ? 0 : r.th-condVal(r.c, pre);
    let amt=0; if(met) amt=r.red==='yen' ? yenOf(r.rv*qty) : yenOf(A*r.rv/100);
    const room=B+O-Rs; if(amt>room){ warn.push('「'+ruleName(r)+'」の 値下げが 大きすぎるので、0円までに しました'); amt=Math.max(0, room); }
    Rs+=amt; rr.push({r, use:true, met, need, amt});
  });
  const E=B+O-Rs, R=v.tax.rate, rf=RND[v.tax.rnd]||RND.floor, T=rf(E*R/100), F=E+T;
  // ⑥ 端数を省いた 請求額 → 本体価格と 消費税額
  const G=v.final>0 ? v.final : F, t=rf(G*R/(100+R)), b=G-t, adj=b-E;
  if(v.final>0 && v.final>F) warn.push('請求額が 合計（'+fmt(F)+'円）より 多いので、差は「端数調整」として 足します');
  return {qty, A, O, optN, D, dl, how, B, pre, rr, Rs, E, R, T, F, G, t, b, adj, warn, items, opts};
}
function lines(v, c){
  const L=[];
  c.items.forEach(it=>L.push({name:it.name||'品物', qty:it.qty, unit:it.unit, price:it.price, amt:yenOf(it.price*it.qty)}));
  if(c.D>0) L.push({name:c.dl, amt:-c.D});
  c.opts.forEach(o=>L.push({name:o.name||'オプション', qty:o.qty, unit:'', price:o.price, amt:yenOf(o.price*o.qty)}));
  c.rr.filter(x=>x.use && x.met && x.amt>0).forEach(x=>L.push({name:ruleName(x.r), amt:-x.amt}));
  if(c.adj) L.push({name:c.adj<0 ? st.m.def.adj : '端数調整', amt:c.adj});
  return L;
}

/* ───────── 書類（A4）───────── */
const KN=k=>(KINDS.find(x=>x[0]===k)||KINDS[0])[1];
function sealSvg(text){
  const ch=Array.from(oneLine(text,12)).filter(c=>c.trim()); const n=ch.length; if(!n) return '';
  const rows=n<=2 ? n : n<=6 ? (n<=4 ? 2 : 3) : n<=9 ? 3 : 4, cols=Math.ceil(n/rows), S=100, pd=9, cw=(S-2*pd)/cols, chh=(S-2*pd)/rows, fs=Math.min(cw, chh)*0.9;
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="sk-seal" aria-label="印"><rect x="3" y="3" width="94" height="94" rx="5" fill="none" stroke="#d3201f" stroke-width="4.5"/>';
  ch.forEach((c,i)=>{ const col=Math.floor(i/rows), row=i%rows, x=S-pd-cw*(col+0.5), y=pd+chh*(row+0.5);
    s+='<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="'+fs.toFixed(1)+'" text-anchor="middle" dominant-baseline="central" fill="#d3201f" font-family="\'Hiragino Mincho ProN\',\'Yu Mincho\',\'Noto Serif JP\',\'Noto Serif CJK JP\',serif" font-weight="bold">'+esc(c)+'</text>'; });
  return s+'</svg>';
}
function docHtml(v, c){
  const me=st.m.me, kind=KN(v.kind), L=lines(v, c);
  const lead=v.kind==='mitsumori' ? '下記のとおり 御見積 申し上げます。' : v.kind==='nohin' ? '下記のとおり 納品いたしました。' : '下記のとおり ご請求 申し上げます。';
  const amtLab=v.kind==='mitsumori' ? '御見積金額' : v.kind==='nohin' ? '合計金額' : 'ご請求金額', dueLab=v.kind==='mitsumori' ? '有効期限' : 'お支払期限';
  const sealT=me.sealTx || me.name;
  const rows=L.map(l=>`<tr class="${l.amt<0?'neg':''}"><td class="nm">${esc(l.name)}</td><td class="r">${l.qty!=null ? fmtQ(l.qty) : ''}</td><td class="c">${esc(l.unit||'')}</td><td class="r">${l.price!=null ? fmt(l.price) : ''}</td><td class="r">${sgn(l.amt)}</td></tr>`).join('')
    +Array.from({length:Math.max(0, 8-L.length)}, ()=>'<tr class="blank"><td class="nm">&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('');
  return `<div class="sk-doc">
  <div class="sk-h1">${esc(Array.from(kind).join(' '))}</div>
  <div class="sk-meta"><div>No. ${esc(v.no)}</div><div>${v.kind==='nohin' ? '納品日' : '発行日'}　${esc(jdate(v.date))}</div></div>
  <div class="sk-top">
    <div class="sk-left">
      <div class="sk-to"><span class="n">${esc(v.to.name||'　　　　　　　　')}</span><span class="h">${esc(v.to.hon)}</span></div>
      ${v.subject ? `<div class="sk-subj">件名：${esc(v.subject)}</div>` : ''}
      <p class="sk-lead">${lead}</p>
      <div class="sk-amt"><span class="l">${amtLab}</span><span class="v">¥${fmt(c.G)}-</span><span class="s">（税込）</span></div>
      ${v.kind!=='nohin' && v.due ? `<div class="sk-due">${dueLab}：${esc(jdate(v.due))}</div>` : ''}
    </div>
    <div class="sk-right">
      <div class="sk-me">${me.name ? `<b>${esc(me.name)}</b>` : '<b class="none">（⚙ 自分の会社で 名前を 入れてください）</b>'}${me.person ? `<div>${esc(me.person)}</div>` : ''}${me.zip || me.addr ? `<div>${me.zip ? '〒'+esc(me.zip)+' ' : ''}${esc(me.addr)}</div>` : ''}${me.tel ? `<div>TEL ${esc(me.tel)}</div>` : ''}${me.mail ? `<div>${esc(me.mail)}</div>` : ''}${me.reg ? `<div>登録番号 ${esc(me.reg)}</div>` : ''}</div>
      ${me.seal && sealT ? `<div class="sk-sealbox">${sealSvg(sealT)}</div>` : ''}
    </div>
  </div>
  <table class="sk-tbl"><thead><tr><th class="nm">品名</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="4" class="r">小計（税抜）</td><td class="r">${fmt(c.b)}</td></tr>
      <tr><td colspan="4" class="r">消費税（${c.R}％）</td><td class="r">${fmt(c.t)}</td></tr>
      <tr class="tot"><td colspan="4" class="r">合計（税込）</td><td class="r">${fmt(c.G)}</td></tr></tfoot></table>
  <div class="sk-taxbox">${c.R ? c.R+'％対象 '+fmt(c.b)+'円　消費税 '+fmt(c.t)+'円' : '消費税の 対象外 '+fmt(c.b)+'円'}</div>
  ${v.kind==='seikyu' && me.bank ? `<div class="sk-bank"><b>お振込先</b><div>${esc(me.bank).replace(/\n/g,'<br>')}</div></div>` : ''}
  ${v.memo ? `<div class="sk-memo"><b>備考</b><div>${esc(v.memo).replace(/\n/g,'<br>')}</div></div>` : ''}
</div>`;
}
function docText(v, c){
  const me=st.m.me, L=lines(v, c), kind=KN(v.kind);
  const out=[kind+'　No.'+v.no+'　'+jdate(v.date), (v.to.name ? v.to.name+' '+v.to.hon : '')];
  if(v.subject) out.push('件名：'+v.subject);
  out.push((v.kind==='mitsumori' ? '御見積金額' : v.kind==='nohin' ? '合計金額' : 'ご請求金額')+'：'+fmt(c.G)+'円（税込）', '');
  L.forEach(l=>out.push('・'+l.name+(l.qty!=null ? '　'+fmtQ(l.qty)+(l.unit||'')+' × '+fmt(l.price) : '')+'　'+sgn(l.amt)+'円'));
  out.push('', '小計（税抜） '+fmt(c.b)+'円', '消費税（'+c.R+'％） '+fmt(c.t)+'円', '合計（税込） '+fmt(c.G)+'円');
  if(v.kind!=='nohin' && v.due) out.push((v.kind==='mitsumori' ? '有効期限' : 'お支払期限')+'：'+jdate(v.due));
  if(v.kind==='seikyu' && me.bank) out.push('お振込先：'+me.bank.replace(/\n/g,' '));
  if(v.memo) out.push('備考：'+v.memo.replace(/\n/g,' '));
  if(me.name) out.push('', me.name+(me.reg ? '（登録番号 '+me.reg+'）' : ''));
  return out.filter((x,i)=>x!=='' || i>0).join('\n').replace(/^\n+/,'');
}

/* ───────── 画面 ───────── */
const V=()=>st.cur;
function secDoc(v){
  return `<div class="sk-kinds" role="tablist">${KINDS.map(([k,n])=>`<button type="button" role="tab" aria-selected="${v.kind===k}" class="${v.kind===k?'on':''}" onclick="SEIKYU.doc('kind','${k}')">${n}</button>`).join('')}</div>
  <div class="sk-sec"><h4>📄 宛先・日付</h4>
    <label class="sk-f"><span>宛先</span><input id="skTo" type="text" list="skCliList" maxlength="50" value="${esc(v.to.name)}" placeholder="例：株式会社 〇〇" oninput="SEIKYU.doc('to', this.value)"></label>
    <div class="sk-opt"><span>敬称</span>${HONS.map(([h,n])=>`<button type="button" class="${v.to.hon===h?'on':''}" onclick='SEIKYU.doc("hon", ${JSON.stringify(h)})'>${n}</button>`).join('')}</div>
    <label class="sk-f"><span>件名</span><input type="text" maxlength="60" value="${esc(v.subject)}" placeholder="例：〇〇工事 一式" oninput="SEIKYU.doc('subject', this.value)"></label>
    <div class="sk-row3"><label class="sk-f"><span>番号</span><input type="text" maxlength="24" value="${esc(v.no)}" oninput="SEIKYU.doc('no', this.value)"></label>
      <label class="sk-f"><span>${v.kind==='nohin' ? '納品日' : '発行日'}</span><input type="date" value="${esc(v.date)}" onchange="SEIKYU.doc('date', this.value)"></label>
      ${v.kind!=='nohin' ? `<label class="sk-f"><span>${v.kind==='mitsumori' ? '有効期限' : '支払期限'}</span><input type="date" value="${esc(v.due)}" onchange="SEIKYU.doc('due', this.value)"></label>` : ''}</div>
  </div>`;
}
function secItems(v){
  return `<div class="sk-sec"><h4><i class="sk-n">1</i> 品物と 定価<small>定価は 1つの 値段</small></h4>
    ${v.items.map((it,i)=>`<div class="sk-line">
      <input class="nm" type="text" list="skProdList" maxlength="40" value="${esc(it.name)}" placeholder="品名" aria-label="品名" oninput="SEIKYU.it(${i},'name',this.value)" onchange="SEIKYU.itPick(${i})">
      <label><small>定価</small><input type="text" inputmode="numeric" data-yen="1" value="${it.price ? fmt(it.price) : ''}" placeholder="0" aria-label="定価" oninput="SEIKYU.it(${i},'price',this.value)"></label>
      <label class="q"><small>数量</small><input type="text" inputmode="decimal" value="${fmtQ(it.qty)}" aria-label="数量" oninput="SEIKYU.it(${i},'qty',this.value)"></label>
      <label class="u"><small>単位</small><input type="text" maxlength="6" value="${esc(it.unit)}" aria-label="単位" oninput="SEIKYU.it(${i},'unit',this.value)"></label>
      <span class="bt"><button type="button" title="よく使う品物に 残す" aria-label="よく使う品物に 残す" onclick="SEIKYU.keepProd(${i})">⭐</button><button type="button" aria-label="消す" onclick="SEIKYU.delIt(${i})">✕</button></span>
      <div class="sum" id="skItS${i}"></div></div>`).join('')}
    <div class="sk-acts sm"><button type="button" class="sk-b" onclick="SEIKYU.addIt()">＋ 品物を 足す</button>${st.m.prods.length ? `<select class="sk-sel" aria-label="よく使う品物から" onchange="SEIKYU.addProd(this.value); this.value=''"><option value="">⭐ よく使う品物から…</option>${st.m.prods.map((p,i)=>`<option value="${i}">${esc(p.name)}（${fmt(p.price)}円）</option>`).join('')}</select>` : ''}</div>
    <div class="sk-res" id="skA"></div></div>`;
}
function secDisc(v){
  const d=v.disc;
  let inp='';
  if(d.m==='rate') inp=`<label class="sk-f"><span>割引率</span><input type="text" inputmode="decimal" value="${d.v||''}" placeholder="10" oninput="SEIKYU.dv('v',this.value)"><em>％引き</em></label>`;
  else if(d.m==='kake') inp=`<label class="sk-f"><span>掛け率</span><input type="text" inputmode="decimal" value="${d.v||''}" placeholder="8" oninput="SEIKYU.dv('v',this.value)"><em>掛け（8・0.8・80 どれでも）</em></label>`;
  else if(d.m==='yen') inp=`<label class="sk-f"><span>値引き額</span><input type="text" inputmode="numeric" data-yen="1" value="${d.v ? fmt(d.v) : ''}" placeholder="0" oninput="SEIKYU.dv('v',this.value)"><em>円</em></label>`;
  else if(d.m==='target') inp=`<label class="sk-f"><span>この金額に</span><input type="text" inputmode="numeric" data-yen="1" value="${d.v ? fmt(d.v) : ''}" placeholder="売る値段（税抜）" oninput="SEIKYU.dv('v',this.value)"><em>円（税抜）</em></label>`;
  else if(d.m==='base') inp=`<label class="sk-f"><span>基準額</span><input type="text" inputmode="numeric" data-yen="1" value="${d.base ? fmt(d.base) : ''}" placeholder="原価・仕入れ値など" oninput="SEIKYU.dv('base',this.value)"><em>円</em></label>
      <label class="sk-f"><span>上乗せ</span><input type="text" inputmode="decimal" value="${d.up||''}" placeholder="15" oninput="SEIKYU.dv('up',this.value)">
        <span class="sk-seg">${[['%','％'],['yen','円']].map(([k,n])=>`<button type="button" class="${d.upm===k?'on':''}" onclick="SEIKYU.dv('upm','${k}')">${n}</button>`).join('')}</span></label>`;
  return `<div class="sk-sec"><h4><i class="sk-n">2</i> 値引き<small>定価の合計から</small></h4>
    <div class="sk-opt wrap">${DISC.map(([k,n])=>`<button type="button" class="${d.m===k?'on':''}" onclick="SEIKYU.dv('m','${k}')">${n}</button>`).join('')}</div>${inp}
    <div class="sk-res" id="skD"></div></div>`;
}
function secOpts(v){
  return `<div class="sk-sec"><h4><i class="sk-n">3</i> オプション<small>✓ を つけた 分を 足す</small></h4>
    ${v.opts.map((o,i)=>`<div class="sk-line op${o.on?'':' off'}">
      <label class="ck"><input type="checkbox" ${o.on?'checked':''} aria-label="つける" onchange="SEIKYU.op(${i},'on',this.checked)"></label>
      <input class="nm" type="text" list="skOptList" maxlength="40" value="${esc(o.name)}" placeholder="オプションの 名前" aria-label="オプションの 名前" oninput="SEIKYU.op(${i},'name',this.value)" onchange="SEIKYU.opPick(${i})">
      <label class="p"><small>金額</small><input type="text" inputmode="numeric" data-yen="1" value="${o.price ? fmt(o.price) : ''}" placeholder="0" aria-label="金額" oninput="SEIKYU.op(${i},'price',this.value)"></label>
      <label class="q"><small>数量</small><input type="text" inputmode="decimal" value="${fmtQ(o.qty)}" aria-label="数量" oninput="SEIKYU.op(${i},'qty',this.value)"></label>
      <span class="bt"><button type="button" aria-label="よく使うオプションに 残す" onclick="SEIKYU.keepOpt(${i})">⭐</button><button type="button" aria-label="消す" onclick="SEIKYU.delOp(${i})">✕</button></span></div>`).join('')}
    <div class="sk-acts sm"><button type="button" class="sk-b" onclick="SEIKYU.addOp()">＋ オプションを 足す</button>${st.m.optm.length ? `<select class="sk-sel" aria-label="よく使うオプションから" onchange="SEIKYU.addOptm(this.value); this.value=''"><option value="">⭐ よく使うオプションから…</option>${st.m.optm.map((p,i)=>`<option value="${i}">${esc(p.name)}（${fmt(p.price)}円）</option>`).join('')}</select>` : ''}</div>
    <div class="sk-res" id="skO"></div></div>`;
}
function secRules(v){
  return `<div class="sk-sec"><h4><i class="sk-n">4</i> 条件で 値下げ<small>条件を 満たすと 定価を 下げる</small></h4>
    ${v.rules.map((r,i)=>`<div class="sk-rule${r.on?'':' off'}">
      <div class="hd"><label class="ck"><input type="checkbox" ${r.on?'checked':''} onchange="SEIKYU.ru(${i},'on',this.checked)"> 使う</label>
        <input class="nm" type="text" maxlength="40" value="${esc(r.name)}" placeholder="${esc(autoName(r))}" aria-label="名前" oninput="SEIKYU.ru(${i},'name',this.value)">
        <span class="bt"><button type="button" aria-label="よく使う条件に 残す" onclick="SEIKYU.keepRule(${i})">⭐</button><button type="button" aria-label="消す" onclick="SEIKYU.delRu(${i})">✕</button></span></div>
      <div class="sk-f"><span>条件</span><select aria-label="条件" onchange="SEIKYU.ru(${i},'c',this.value)">${CONDS.map(([k,n])=>`<option value="${k}"${r.c===k?' selected':''}>${n}</option>`).join('')}</select>
        ${r.c==='manual' ? `<label class="ck big"><input type="checkbox" ${r.ok?'checked':''} onchange="SEIKYU.ru(${i},'ok',this.checked)"> 満たした</label>` : `<input type="text" inputmode="decimal" value="${r.th||''}" placeholder="0" aria-label="これ以上" oninput="SEIKYU.ru(${i},'th',this.value)"><em>${r.c==='optn' ? 'つ以上' : r.c==='qty' ? '以上' : '円以上'}</em>`}</div>
      <div class="sk-f"><span>値下げ</span><select aria-label="値下げの しかた" onchange="SEIKYU.ru(${i},'red',this.value)">${REDS.map(([k,n])=>`<option value="${k}"${r.red===k?' selected':''}>${n}</option>`).join('')}</select>
        <input type="text" inputmode="decimal" value="${r.rv||''}" placeholder="0" aria-label="下げる 量" oninput="SEIKYU.ru(${i},'rv',this.value)"><em>${r.red==='yen' ? '円' : '％'}</em></div>
      <div class="st" id="skRu${i}"></div></div>`).join('')}
    <div class="sk-acts sm"><button type="button" class="sk-b" onclick="SEIKYU.addRu()">＋ 条件を 足す</button>${st.m.rulem.length ? `<select class="sk-sel" aria-label="よく使う条件から" onchange="SEIKYU.addRulem(this.value); this.value=''"><option value="">⭐ よく使う条件から…</option>${st.m.rulem.map((r,i)=>`<option value="${i}">${esc(ruleName(r))}</option>`).join('')}</select>` : ''}</div>
    <div class="sk-res" id="skR"></div></div>`;
}
function secTax(v){
  return `<div class="sk-sec"><h4><i class="sk-n">5</i> 消費税</h4>
    <div class="sk-opt"><span>税率</span>${TAXR.map(([k,n])=>`<button type="button" class="${v.tax.rate===k?'on':''}" onclick="SEIKYU.tax('rate',${k})">${n}</button>`).join('')}</div>
    <div class="sk-opt"><span>1円未満</span>${RNDS.map(([k,n])=>`<button type="button" class="${v.tax.rnd===k?'on':''}" onclick="SEIKYU.tax('rnd','${k}')">${n}</button>`).join('')}</div>
    <div class="sk-res" id="skT"></div></div>`;
}
function secFinal(v){
  return `<div class="sk-sec sk-fin"><h4><i class="sk-n">6</i> 請求額<small>端数を 省いた 金額（税込）を 入れる</small></h4>
    <label class="sk-big"><input id="skFinal" type="text" inputmode="numeric" data-yen="1" value="${v.final ? fmt(v.final) : ''}" placeholder="合計のまま" oninput="SEIKYU.fin(this.value)"><em>円（税込）</em></label>
    <div class="sk-acts sm">${CUTS.map(([u,n])=>`<button type="button" class="sk-b" onclick="SEIKYU.cut(${u})">${n}を 切り捨て</button>`).join('')}<button type="button" class="sk-b" onclick="SEIKYU.fin('')">端数そのまま</button></div>
    <div class="sk-res big" id="skG"></div></div>`;
}
function secMemo(v){
  return `<div class="sk-sec"><h4>📝 備考</h4><textarea class="sk-ta" rows="2" maxlength="400" placeholder="例：お振込手数料は 貴社ご負担にて お願いいたします。" oninput="SEIKYU.doc('memo', this.value)">${esc(v.memo)}</textarea></div>`;
}
function secMe(){
  const me=st.m.me, f=(k, lab, ph, im)=>`<label class="sk-f"><span>${lab}</span><input type="text" ${im?`inputmode="${im}"`:''} value="${esc(me[k])}" placeholder="${ph}" oninput="SEIKYU.me('${k}', this.value)"></label>`;
  const regBad=me.reg && !/^T\d{13}$/.test(me.reg);
  return `<details class="sk-sec sk-me"${me.name ? '' : ' open'}><summary>⚙ 自分の会社・振込先<small>書類の 右上と 下に 出ます</small></summary>
    ${f('name','会社・屋号','例：〇〇工業 株式会社')}${f('person','担当','例：山田 太郎')}${f('zip','郵便番号','123-4567','numeric')}${f('addr','住所','例：〇〇県〇〇市…')}
    ${f('tel','電話','03-1234-5678','tel')}${f('mail','メール','')}${f('reg','登録番号','T から始まる 13けた')}
    ${regBad ? '<p class="sk-warn">登録番号は「T」と 数字13けた（例：T1234567890123）です</p>' : ''}
    <label class="sk-f top"><span>振込先</span><textarea class="sk-ta" rows="2" maxlength="200" placeholder="例：〇〇銀行 〇〇支店 普通 1234567 カ）〇〇" oninput="SEIKYU.me('bank', this.value)">${esc(me.bank)}</textarea></label>
    <div class="sk-opt"><span>角印</span>${[[true,'押す'],[false,'押さない']].map(([k,n])=>`<button type="button" class="${me.seal===k?'on':''}" onclick="SEIKYU.me('seal', ${k})">${n}</button>`).join('')}</div>
    ${me.seal ? f('sealTx','印の 文字','空なら 会社の名前（12字まで）') : ''}
    <label class="sk-f top"><span>いつもの 備考</span><textarea class="sk-ta" rows="2" maxlength="400" placeholder="新しく 作るときに 入れる 備考" oninput="SEIKYU.def('note', this.value)">${esc(st.m.def.note)}</textarea></label>
    <label class="sk-f"><span>端数の 名前</span><input type="text" maxlength="20" value="${esc(st.m.def.adj)}" oninput="SEIKYU.def('adj', this.value)"></label>
  </details>`;
}
function secList(){
  const list=st.invs.slice().sort((a,b)=>b.saved-a.saved);
  return `<details class="sk-sec"><summary>📂 残した 書類<small>${st.invs.length} 件</small></summary>
    ${list.length ? list.map(v=>{ const c=calc(v), i=st.invs.indexOf(v); return `<div class="sk-li${v.id===V().id?' on':''}"><div class="t"><b>${esc(KN(v.kind))}</b> ${esc(v.no)}　${esc(jdate(v.date))}<br><span>${esc(v.to.name||'（宛先なし）')} ${esc(v.to.hon)}</span>　<b class="g">${fmt(c.G)}円</b></div>
      <span class="bt"><button type="button" onclick="SEIKYU.openInv(${i})">開く</button><button type="button" onclick="SEIKYU.dupInv(${i})">複製</button><button type="button" onclick="SEIKYU.delInv(${i})" aria-label="消す">🗑</button></span></div>`; }).join('') : '<p class="sk-note">「💾 残す」で ここに 入ります。</p>'}
  </details>`;
}
function datalists(){
  return `<datalist id="skProdList">${st.m.prods.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>
    <datalist id="skOptList">${st.m.optm.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>
    <datalist id="skCliList">${st.m.clis.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>`;
}
function render(){
  const b=$('skBody'); if(!b) return;
  const v=V(), top=b.scrollTop;
  b.innerHTML=`<div class="sk-wrap">${datalists()}
    <div class="sk-acts top"><button type="button" class="sk-b" onclick="SEIKYU.fresh()">＋ 新しく</button><button type="button" class="sk-b" onclick="SEIKYU.keep()">💾 残す</button><button type="button" class="sk-b pri" onclick="SEIKYU.view()">📃 ${esc(KN(v.kind))}を 見る</button></div>
    ${secDoc(v)}${secItems(v)}${secDisc(v)}${secOpts(v)}${secRules(v)}${secTax(v)}${secFinal(v)}
    <div class="sk-warns" id="skWarn"></div>
    ${secMemo(v)}${secMe()}${secList()}
    <p class="sk-note">金額は ①→⑥ の 順に 決まります。条件の値下げは 値下げの前の 数で 見ます。消費税は「請求額 × 税率 ÷（100＋税率）」の 1円未満を 決めた しかたで まるめ、本体価格は 請求額から 消費税を 引いた 金額です。中身は この端末の中だけに 残ります（設定のバックアップに 入ります）。</p>
  </div>
  <div class="sk-foot" id="skFoot"></div>`;
  b.scrollTop=top;
  recalc();
}
function recalc(){
  const v=V(), c=calc(v), set=(id, h)=>{ const e=$(id); if(e && e.innerHTML!==h) e.innerHTML=h; };
  v.items.forEach((it,i)=>set('skItS'+i, it.price||it.name ? `${fmt(it.price)} × ${fmtQ(it.qty)}${esc(it.unit)} ＝ <b>${fmt(yenOf(it.price*it.qty))}円</b>` : ''));
  set('skA', `定価の合計 <b>${fmt(c.A)}円</b>（数量 ${fmtQ(c.qty)}）`);
  set('skD', c.D>0 ? `${esc(c.how)} → 値引き <b>−${fmt(c.D)}円</b>　値引きのあと <b>${fmt(c.B)}円</b>` : (v.disc.m==='none' ? '値引き なし' : (c.how ? esc(c.how)+' → 値引き 0円' : '値引き 0円')));
  set('skO', `オプション ${c.optN}つ <b>＋${fmt(c.O)}円</b>　ここまで <b>${fmt(c.B+c.O)}円</b>`);
  c.rr.forEach((x,i)=>set('skRu'+i, !x.use ? '<span class="off">使わない</span>'
    : x.met ? `<span class="ok">✓ クリア！ 定価を 値下げ −${fmt(x.amt)}円</span>`
    : x.r.c==='manual' ? '<span class="ng">「満たした」に ✓ で 値下げ</span>'
    : `<span class="ng">あと ${x.r.c==='optn' ? fmtQ(x.need)+'つ' : x.r.c==='qty' ? fmtQ(x.need) : fmt(x.need)+'円'} で 値下げ</span>`));
  set('skR', c.Rs>0 ? `値下げの 合計 <b>−${fmt(c.Rs)}円</b>　税抜の 小計 <b>${fmt(c.E)}円</b>` : `税抜の 小計 <b>${fmt(c.E)}円</b>`);
  set('skT', `税抜 ${fmt(c.E)}円 ＋ 消費税（${c.R}％）${fmt(c.T)}円 ＝ <b class="big">${fmt(c.F)}円</b>（税込）`);
  set('skG', `<div class="g"><span>請求額</span><b>${fmt(c.G)}円</b></div><div class="g2"><span>本体価格 <b>${fmt(c.b)}円</b></span><span>消費税 <b>${fmt(c.t)}円</b></span></div>`
    +(c.adj ? `<div class="g3">合計 ${fmt(c.F)}円 との 差 ${sgn(c.G-c.F)}円 → 明細に「${esc(c.adj<0 ? st.m.def.adj : '端数調整')}」${sgn(c.adj)}円（税抜）</div>` : '<div class="g3">端数の 調整は ありません</div>'));
  set('skWarn', c.warn.map(w=>`<p class="sk-warn">⚠ ${esc(w)}</p>`).join(''));
  set('skFoot', `<div class="t"><small>${esc(KN(v.kind))}${dirty ? ' ・ <span class="dt">残していない 変更あり</span>' : ''}</small><b>${fmt(c.G)}円</b><small>（本体 ${fmt(c.b)}円・税 ${fmt(c.t)}円）</small></div><button type="button" class="sk-b pri" onclick="SEIKYU.view()">📃 見る</button>`);
  return c;
}

/* ───────── 入れる・かえる ───────── */
function setDoc(k, val){
  const v=V();
  if(k==='kind'){ if(!KINDS.some(x=>x[0]===val)) return; v.kind=val; touch(); render(); return; }
  if(k==='hon'){ if(!HONS.some(h=>h[0]===val)) return; v.to.hon=val; touch(); render(); return; }
  if(k==='to'){ v.to.name=oneLine(val,50); const cl=st.m.clis.find(c=>c.name===v.to.name); if(cl && cl.hon!==v.to.hon){ v.to.hon=cl.hon; touch(); render(); return; } }
  else if(k==='subject') v.subject=oneLine(val,60);
  else if(k==='no') v.no=oneLine(val,24);
  else if(k==='date'){ const d=dateOk(val); if(!d) return; v.date=d; touch(); render(); return; }
  else if(k==='due'){ v.due=dateOk(val); }
  else if(k==='memo') v.memo=multi(val,400);
  else return;
  touch(); recalc();
}
function setIt(i, k, val){
  const it=V().items[i]; if(!it) return;
  if(k==='name') it.name=oneLine(val,40); else if(k==='price') it.price=numIn(val,0,MAX_YEN,0); else if(k==='qty') it.qty=numIn(val,0,MAX_QTY,0,true); else if(k==='unit') it.unit=oneLine(val,6); else return;
  touch(); recalc();
}
function itPick(i){ const it=V().items[i]; if(!it) return; const p=st.m.prods.find(x=>x.name===it.name); if(p && !it.price){ it.price=p.price; it.unit=p.unit; touch(); render(); } }
function addIt(){ const v=V(); if(v.items.length>=MAX_ITEMS){ toastS('品物は '+MAX_ITEMS+' まで です'); return; } v.items.push(newItem()); touch(); render(); }
function delIt(i){ const v=V(); v.items.splice(i,1); if(!v.items.length) v.items.push(newItem()); touch(); render(); }
function keepProd(i){
  const it=V().items[i]; if(!it || !it.name){ toastS('品名を 入れてから 残してください'); return; }
  const ps=st.m.prods, j=ps.findIndex(p=>p.name===it.name), p={name:it.name, price:it.price, qty:1, unit:it.unit};
  if(j>=0) ps[j]=p; else { if(ps.length>=MAX_PROD){ toastS('よく使う品物は '+MAX_PROD+' まで です'); return; } ps.push(p); }
  save(); toastS('⭐「'+it.name+'」（'+fmt(it.price)+'円）を 残しました'); render();
}
function addProd(j){ const p=st.m.prods[+j]; if(!p) return; const v=V(); const blank=v.items.findIndex(x=>!x.name && !x.price); const it={name:p.name, price:p.price, qty:1, unit:p.unit};
  if(blank>=0) v.items[blank]=it; else { if(v.items.length>=MAX_ITEMS){ toastS('品物は '+MAX_ITEMS+' まで です'); return; } v.items.push(it); } touch(); render(); }
function setOp(i, k, val){
  const o=V().opts[i]; if(!o) return;
  if(k==='on'){ o.on=!!val; touch(); render(); return; }
  if(k==='name') o.name=oneLine(val,40); else if(k==='price') o.price=numIn(val,0,MAX_YEN,0); else if(k==='qty') o.qty=numIn(val,0,MAX_QTY,0,true); else return;
  touch(); recalc();
}
function opPick(i){ const o=V().opts[i]; if(!o) return; const p=st.m.optm.find(x=>x.name===o.name); if(p && !o.price){ o.price=p.price; touch(); render(); } }
function addOp(){ const v=V(); if(v.opts.length>=MAX_OPTS){ toastS('オプションは '+MAX_OPTS+' まで です'); return; } v.opts.push(newOpt()); touch(); render(); }
function delOp(i){ V().opts.splice(i,1); touch(); render(); }
function keepOpt(i){
  const o=V().opts[i]; if(!o || !o.name){ toastS('名前を 入れてから 残してください'); return; }
  const ps=st.m.optm, j=ps.findIndex(p=>p.name===o.name), p={name:o.name, price:o.price, qty:1, on:true};
  if(j>=0) ps[j]=p; else { if(ps.length>=MAX_OPTM){ toastS('よく使うオプションは '+MAX_OPTM+' まで です'); return; } ps.push(p); }
  save(); toastS('⭐「'+o.name+'」を 残しました'); render();
}
function addOptm(j){ const p=st.m.optm[+j]; if(!p) return; const v=V(); if(v.opts.length>=MAX_OPTS){ toastS('オプションは '+MAX_OPTS+' まで です'); return; } v.opts.push({name:p.name, price:p.price, qty:1, on:true}); touch(); render(); }
function setRu(i, k, val){
  const r=V().rules[i]; if(!r) return;
  if(k==='on' || k==='ok'){ r[k]=!!val; touch(); render(); return; }
  if(k==='c'){ if(!CONDS.some(c=>c[0]===val)) return; r.c=val; touch(); render(); return; }
  if(k==='red'){ if(!REDS.some(c=>c[0]===val)) return; r.red=val; touch(); render(); return; }
  if(k==='name') r.name=oneLine(val,40); else if(k==='th') r.th=numIn(val,0,MAX_YEN,0,true); else if(k==='rv') r.rv=numIn(val,0,r.red==='pct' ? 100 : MAX_YEN,0,true); else return;
  touch(); recalc();
}
function addRu(){ const v=V(); if(v.rules.length>=MAX_RULES){ toastS('条件は '+MAX_RULES+' まで です'); return; } v.rules.push(newRule()); touch(); render(); }
function delRu(i){ V().rules.splice(i,1); touch(); render(); }
function keepRule(i){
  const r=V().rules[i]; if(!r) return;
  const ps=st.m.rulem, nm=ruleName(r), j=ps.findIndex(p=>ruleName(p)===nm), p=Object.assign({}, r, {id:rid(), ok:false, on:true});
  if(j>=0) ps[j]=p; else { if(ps.length>=MAX_RULEM){ toastS('よく使う条件は '+MAX_RULEM+' まで です'); return; } ps.push(p); }
  save(); toastS('⭐「'+nm+'」を 残しました'); render();
}
function addRulem(j){ const p=st.m.rulem[+j]; if(!p) return; const v=V(); if(v.rules.length>=MAX_RULES){ toastS('条件は '+MAX_RULES+' まで です'); return; } v.rules.push(Object.assign({}, p, {id:rid(), ok:false, on:true})); touch(); render(); }
function setDv(k, val){
  const d=V().disc;
  if(k==='m'){ if(!DISC.some(x=>x[0]===val)) return; d.m=val; touch(); render(); return; }
  if(k==='upm'){ d.upm=val==='yen' ? 'yen' : '%'; touch(); render(); return; }
  if(k==='v') d.v=numIn(val,-MAX_YEN,MAX_YEN,0,true); else if(k==='base') d.base=numIn(val,0,MAX_YEN,0); else if(k==='up') d.up=numIn(val,-MAX_YEN,MAX_YEN,0,true); else return;
  touch(); recalc();
}
function setTax(k, val){ const t=V().tax; if(k==='rate'){ if(!TAXR.some(r=>r[0]===+val)) return; t.rate=+val; } else if(k==='rnd'){ if(!RNDS.some(r=>r[0]===val)) return; t.rnd=val; } else return; touch(); render(); }
function setFin(val){ V().final=numIn(val,0,MAX_YEN,0); touch(); const e=$('skFinal'); if(e && document.activeElement!==e) e.value=V().final ? fmt(V().final) : ''; recalc(); }
function cut(u){ const c=calc(Object.assign({}, V(), {final:0})); const g=Math.floor(c.F/u)*u; if(g<=0){ toastS('合計が '+fmt(u)+'円より 少ないので 切り捨てられません'); return; } V().final=g; touch(); const e=$('skFinal'); if(e) e.value=fmt(g); recalc(); }
// 金額の 欄：打っているあいだは カンマなし、はなれたら カンマつき
function yenFocus(e){ const t=e.target; if(t && t.dataset && t.dataset.yen) t.value=String(t.value).replace(/,/g,''); }
function yenBlur(e){ const t=e.target; if(!t || !t.dataset || !t.dataset.yen) return; const n=numIn(t.value, -MAX_YEN, MAX_YEN, null); if(n!=null && n!==0) t.value=fmt(n); }
function setMe(k, val){
  const me=st.m.me;
  if(k==='seal'){ me.seal=val===true || val==='true'; save(); render(); return; }
  if(k==='bank') me.bank=multi(val,200); else if(k==='reg') me.reg=oneLine(String(val).normalize('NFKC').toUpperCase().replace(/[\s-]/g,''),14);
  else if(['name','person','zip','addr','tel','mail','sealTx'].includes(k)) me[k]=oneLine(val, {name:50, person:40, zip:10, addr:80, tel:20, mail:60, sealTx:12}[k]);
  else return;
  saveSoon();
}
function setDef(k, val){ if(k==='note') st.m.def.note=multi(val,400); else if(k==='adj') st.m.def.adj=oneLine(val,20)||'端数値引き'; else return; saveSoon(); recalc(); }

/* ───────── 残す・開く ───────── */
function keep(){
  const v=V(); v.saved=Date.now();
  const i=st.invs.findIndex(x=>x.id===v.id), copy=JSON.parse(JSON.stringify(v));
  if(i>=0) st.invs[i]=copy; else { if(st.invs.length>=MAX_INV){ toastS('残せる 書類は '+MAX_INV+' まで です。古いものを 消してください'); return; } st.invs.push(copy); }
  if(v.to.name){ const cs=st.m.clis, j=cs.findIndex(c=>c.name===v.to.name); if(j>=0) cs[j].hon=v.to.hon; else if(cs.length<MAX_CLI) cs.push({name:v.to.name, hon:v.to.hon}); }
  dirty=false; save(); toastS('💾 '+KN(v.kind)+'（'+v.no+'）を 残しました'); render();
}
async function fresh(){
  if(dirty && typeof appConfirm==='function' && !(await appConfirm('いまの '+KN(V().kind)+' は 残していない 変更が あります。新しく 作りますか？\n（いまのものは 消えます）', '新しく 作る', 'やめる'))) return;
  const v=freshInv(); v.kind=V().kind; v.tax=Object.assign({}, V().tax); v.no=nextNo(v.date); st.cur=v; dirty=false; save(); render();
  const b=$('skBody'); if(b) b.scrollTop=0;
}
async function openInv(i){
  const v=st.invs[i]; if(!v) return;
  if(dirty && V().id!==v.id && typeof appConfirm==='function' && !(await appConfirm('いまの '+KN(V().kind)+' は 残していない 変更が あります。開きますか？', '開く', 'やめる'))) return;
  st.cur=cleanInv(JSON.parse(JSON.stringify(v))); dirty=false; save(); render(); const b=$('skBody'); if(b) b.scrollTop=0;
}
function dupInv(i){
  const v=st.invs[i]; if(!v) return;
  const n=cleanInv(JSON.parse(JSON.stringify(v))); n.id=rid(); n.date=ymd(new Date()); n.due=n.kind==='nohin' ? '' : endOfNextMonth(n.date); n.no=nextNo(n.date); n.saved=0;
  st.cur=n; dirty=true; save(); render(); toastS('📄 複製しました（番号と 日付は 新しく）'); const b=$('skBody'); if(b) b.scrollTop=0;
}
async function delInv(i){
  const v=st.invs[i]; if(!v) return;
  if(typeof appConfirm==='function' && !(await appConfirm('残した '+KN(v.kind)+'（'+v.no+'）を 消しますか？', '消す', 'やめる'))) return;
  st.invs.splice(i,1); save(); render();
}

/* ───────── 見る・印刷 ───────── */
function view(){
  const v=V(), c=calc(v);
  if(!c.items.length && !c.opts.length){ toastS('品物を 入れてください'); return; }
  const b=$('skDocBody'); if(!b) return;
  zoom=false;
  b.innerHTML=`<div class="sk-paperwrap" id="skPW"><div class="sk-paper" id="skPaper">${docHtml(v, c)}</div></div>
    <div class="sk-docbar"><button type="button" class="sk-b pri" onclick="SEIKYU.print()">🖨 印刷・PDF</button><button type="button" class="sk-b" id="skZoom" onclick="SEIKYU.zoom()">🔍 大きく</button><button type="button" class="sk-b" onclick="SEIKYU.copy()">📋 文字で コピー</button><button type="button" class="sk-b" onclick="SEIKYU.keep()">💾 残す</button><button type="button" class="sk-b" onclick="closeDlg('seikyuDocOverlay')">← 戻る</button></div>
    ${c.warn.length ? c.warn.map(w=>`<p class="sk-warn">⚠ ${esc(w)}</p>`).join('') : ''}`;
  $('skDocTitle').textContent='📃 '+KN(v.kind)+'を 見る';
  openDlg('seikyuDocOverlay');
  fitPaper();
}
let zoom=false;
function fitPaper(){
  const w=$('skPW'), p=$('skPaper'); if(!w || !p) return;
  const k=zoom ? 1 : Math.min(1, (w.clientWidth-2)/794);
  w.classList.toggle('zoom', zoom); p.style.transform='scale('+k+')'; w.style.height=Math.ceil(p.offsetHeight*k)+'px';
  const z=$('skZoom'); if(z) z.textContent=zoom ? '🔍 全体' : '🔍 大きく';
}
function printDoc(){
  const v=V(), c=calc(v);
  let pa=document.getElementById('printArea'); if(!pa){ pa=document.createElement('div'); pa.id='printArea'; document.body.appendChild(pa); }
  pa.innerHTML=docHtml(v, c);
  let dyn=document.getElementById('printDynamicStyle'); if(!dyn){ dyn=document.createElement('style'); dyn.id='printDynamicStyle'; document.head.appendChild(dyn); }
  dyn.textContent='@page{ size: A4 portrait; margin: 12mm; }';
  const old=document.title; document.title=KN(v.kind)+'_'+(v.no||'').replace(/[\\/:*?"<>|]/g,'_');   // PDF に 保存するときの 名前
  setTimeout(()=>{ try{ window.print(); }catch(_){ toastS('印刷を 開けませんでした'); } setTimeout(()=>{ document.title=old; }, 1500); }, 250);
}
function copyDoc(){
  const t=docText(V(), calc(V()));
  try{ navigator.clipboard.writeText(t).then(()=>toastS('📋 文字で コピーしました'), ()=>toastS('コピーできませんでした')); }catch(_){ toastS('コピーできませんでした'); }
  return t;
}

/* ───────── 窓 ───────── */
// 書類の 見た目（画面の 見本と 印刷で 同じ。紙は 白なので 色は 決め打ち）
const DOC_RULES=`
.sk-doc{ width:100%; box-sizing:border-box; color:#111; background:#fff; font-family:"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Noto Serif CJK JP",serif; font-size:13px; line-height:1.55; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sk-doc .sk-h1{ text-align:center; font-size:30px; font-weight:bold; letter-spacing:.35em; padding:2px 0 6px; border-bottom:3px double #111; margin:0 0 10px; }
.sk-doc .sk-meta{ text-align:right; font-size:12.5px; margin:0 0 10px; }
.sk-doc .sk-top{ display:flex; gap:18px; justify-content:space-between; align-items:flex-start; margin:0 0 14px; }
.sk-doc .sk-left{ flex:1.25; min-width:0; } .sk-doc .sk-right{ flex:1; min-width:0; position:relative; padding-top:4px; }
.sk-doc .sk-to{ font-size:19px; border-bottom:1.5px solid #111; padding:0 4px 3px; display:flex; gap:10px; align-items:baseline; } .sk-doc .sk-to .n{ flex:1; font-weight:bold; overflow-wrap:anywhere; } .sk-doc .sk-to .h{ font-size:16px; }
.sk-doc .sk-subj{ margin:8px 0 0; font-size:13.5px; }
.sk-doc .sk-lead{ margin:10px 0 6px; font-size:13px; }
.sk-doc .sk-amt{ display:flex; align-items:baseline; gap:10px; border:2px solid #111; padding:7px 12px; margin:4px 0 6px; } .sk-doc .sk-amt .l{ font-weight:bold; font-size:14px; } .sk-doc .sk-amt .v{ font-size:26px; font-weight:bold; letter-spacing:.02em; } .sk-doc .sk-amt .s{ font-size:12px; }
.sk-doc .sk-due{ font-size:13px; }
.sk-doc .sk-me{ font-size:12.5px; line-height:1.6; position:relative; z-index:1; } .sk-doc .sk-me b{ font-size:16px; display:block; margin-bottom:2px; } .sk-doc .sk-me b.none{ font-size:12px; color:#b00; font-weight:normal; }
.sk-doc .sk-sealbox{ position:absolute; right:4px; top:2px; width:68px; height:68px; opacity:.82; mix-blend-mode:multiply; z-index:2; } .sk-doc .sk-seal{ width:100%; height:100%; display:block; }
.sk-doc .sk-tbl{ width:100%; border-collapse:collapse; border-spacing:0; margin:6px 0 8px; font-size:12.5px; }
.sk-doc .sk-tbl th{ background:#eef0f4; border:1px solid #333; padding:5px 6px; font-weight:bold; text-align:center; }
.sk-doc .sk-tbl td{ border:1px solid #333; padding:4px 7px; vertical-align:top; font-size:12.5px; }
.sk-doc .sk-tbl td.nm{ width:46%; overflow-wrap:anywhere; } .sk-doc .sk-tbl td.r{ text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; } .sk-doc .sk-tbl td.c{ text-align:center; }
.sk-doc .sk-tbl tr.neg td{ color:#b3001b; } .sk-doc .sk-tbl tr.blank td{ height:1.55em; }
.sk-doc .sk-tbl tfoot td{ font-weight:bold; } .sk-doc .sk-tbl tfoot tr.tot td{ font-size:15px; background:#f6f7fa; }
.sk-doc .sk-taxbox{ font-size:12px; text-align:right; margin:0 0 10px; }
.sk-doc .sk-bank, .sk-doc .sk-memo{ border:1px solid #333; padding:6px 10px; margin:0 0 8px; font-size:12.5px; } .sk-doc .sk-bank b, .sk-doc .sk-memo b{ display:block; font-size:12px; margin-bottom:2px; }
`;
const SK_CSS=`
#seikyuOverlay .sk-modal, #seikyuDocOverlay .sk-modal{ display:flex; flex-direction:column; }
.sk-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; position:relative; }
.sk-wrap{ max-width:820px; margin:0 auto; padding-bottom:12px; }
.sk-kinds{ display:grid; grid-template-columns:repeat(3,1fr); gap:5px; margin:0 0 8px; }
.sk-kinds button{ min-height:46px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:var(--modal-bg,#fff); color:var(--text,#222); font-size:16px; font-weight:bold; cursor:pointer; }
.sk-kinds button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.sk-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.sk-sec h4{ margin:0 0 8px; font-size:15.5px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; } .sk-sec h4 small, .sk-sec summary small{ font-weight:normal; font-size:12px; color:var(--text-light,#666); margin-left:4px; }
.sk-sec summary{ font-size:15.5px; font-weight:bold; cursor:pointer; padding:2px 0; }
.sk-n{ display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:12px; background:var(--acc); color:var(--on-acc,#fff); font-style:normal; font-size:14px; }
.sk-f{ display:flex; align-items:center; gap:8px; margin:6px 0; flex-wrap:wrap; } .sk-f.top{ align-items:flex-start; } .sk-f > span{ min-width:5em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.sk-f input, .sk-f select, .sk-ta, .sk-line input, .sk-rule input, .sk-sel{ min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; }
.sk-f input{ flex:1; min-width:0; } .sk-f select{ flex:1 1 180px; min-width:0; } .sk-f em{ font-style:normal; font-size:13px; color:var(--text-light,#666); }
.sk-ta{ display:block; width:100%; padding:8px 10px; font:inherit; font-size:15px; line-height:1.5; resize:vertical; flex:1; }
.sk-row3{ display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:0 10px; }
.sk-row3 .sk-f > span{ min-width:3.2em; }
.sk-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:6px 0; } .sk-opt > span{ min-width:5em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.sk-opt button, .sk-seg button{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.sk-opt button.on, .sk-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.sk-seg{ display:inline-flex; gap:4px; }
.sk-line{ display:grid; grid-template-columns:1fr 7.2em 4.6em 3.6em auto; gap:6px; align-items:end; padding:8px 0; border-bottom:1px dashed rgba(120,132,156,.3); }
.sk-line.op{ grid-template-columns:auto 1fr 7.2em 4.6em auto; } .sk-line.off .nm, .sk-line.off label{ opacity:.5; }
.sk-line label{ display:flex; flex-direction:column; gap:1px; min-width:0; } .sk-line label small{ font-size:11px; color:var(--text-light,#666); } .sk-line label input{ width:100%; text-align:right; }
.sk-line label.u input{ text-align:center; padding:0 4px; } .sk-line .nm{ min-width:0; width:100%; }
.sk-line .ck{ align-self:center; } .sk-line .ck input, .sk-rule .ck input{ width:22px; height:22px; min-height:0; }
.sk-line .sum{ grid-column:1/-1; font-size:13px; color:var(--text-light,#666); text-align:right; } .sk-line .sum:empty{ display:none; }
.bt{ display:inline-flex; gap:4px; } .bt button{ min-width:38px; min-height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; }
@media (max-width:520px){ .sk-line{ grid-template-columns:1.7fr 0.9fr 0.8fr auto; } .sk-line label input{ padding:0 6px; } .sk-line .nm{ grid-column:1/-1; } .sk-line.op{ grid-template-columns:2em 1fr 1fr auto; } .sk-line.op .nm{ grid-column:2/-1; } .sk-line.op label.p{ grid-column:1/3; } }
.sk-rule{ border:1px solid rgba(120,132,156,.35); border-radius:12px; padding:8px 10px; margin:0 0 8px; background:rgba(120,132,156,.05); }
.sk-rule.off{ opacity:.6; } .sk-rule .hd{ display:flex; gap:8px; align-items:center; } .sk-rule .hd .nm{ flex:1; min-width:0; }
.sk-rule .ck{ display:inline-flex; align-items:center; gap:4px; font-size:13.5px; font-weight:bold; white-space:nowrap; } .sk-rule .ck.big{ font-size:15px; }
.sk-rule .sk-f input{ flex:0 1 8em; text-align:right; }
.sk-rule .st{ font-size:14px; font-weight:bold; margin-top:4px; } .st .ok{ color:#1b7a3a; } .st .ng{ color:#9a6a00; } .st .off{ color:var(--text-light,#666); font-weight:normal; }
.sk-res{ margin-top:8px; padding:8px 10px; border-radius:10px; background:rgba(120,132,156,.10); font-size:14px; line-height:1.6; } .sk-res b{ font-size:15.5px; } .sk-res b.big{ font-size:19px; }
.sk-res.big .g{ display:flex; align-items:baseline; gap:10px; } .sk-res.big .g b{ font-size:28px; } .sk-res.big .g2{ display:flex; gap:16px; flex-wrap:wrap; font-size:15px; } .sk-res.big .g2 b{ font-size:19px; } .sk-res.big .g3{ font-size:12.5px; color:var(--text-light,#666); margin-top:4px; }
.sk-big{ display:flex; align-items:center; gap:8px; } .sk-big input{ flex:1; min-width:0; min-height:56px; font-size:28px; font-weight:bold; text-align:right; padding:0 12px; border-radius:12px; border:2px solid var(--acc); background:var(--cell-bg,#fff); color:var(--text,#222); box-sizing:border-box; } .sk-big em{ font-style:normal; font-size:14px; white-space:nowrap; }
.sk-fin{ border:2px solid var(--acc); }
.sk-acts{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; } .sk-acts.top{ margin:0 0 8px; } .sk-acts.top .sk-b{ flex:1 1 auto; }
.sk-b{ min-height:44px; padding:0 12px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.sk-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.sk-acts.sm .sk-b{ min-height:38px; font-size:13.5px; } .sk-sel{ min-height:38px; font-size:14px; max-width:100%; }
.sk-warn{ margin:6px 0; padding:6px 10px; border-radius:10px; background:rgba(255,170,0,.14); color:var(--text,#222); font-size:13.5px; }
.sk-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; }
.sk-li{ display:flex; gap:8px; align-items:center; padding:8px 0; border-bottom:1px solid rgba(120,132,156,.2); } .sk-li.on{ background:rgba(120,132,156,.08); border-radius:8px; }
.sk-li .t{ flex:1; min-width:0; font-size:13.5px; line-height:1.5; } .sk-li .t span{ color:var(--text-light,#666); } .sk-li .t .g{ font-size:15px; }
.sk-li .bt button{ min-width:44px; font-size:13.5px; }
.sk-foot{ position:sticky; bottom:0; display:flex; align-items:center; gap:10px; margin:0 -10px; padding:8px 12px calc(8px + var(--safe-bottom,0px)); background:var(--modal-bg,#fff); border-top:1px solid rgba(120,132,156,.35); box-shadow:0 -4px 12px rgba(0,0,0,.08); z-index:2; }
.sk-foot .t{ flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.25; } .sk-foot .t b{ font-size:22px; font-variant-numeric:tabular-nums; } .sk-foot .t small{ font-size:12px; color:var(--text-light,#666); } .sk-foot .dt{ color:#c06000; font-weight:bold; }
.sk-docbody{ flex:1; min-height:0; overflow:auto; padding:10px; background:#8a8f99; }
.sk-paperwrap{ max-width:820px; margin:0 auto; overflow:hidden; } .sk-paperwrap.zoom{ overflow-x:auto; }
.sk-paper{ width:794px; min-height:1123px; box-sizing:border-box; padding:40px 44px; background:#fff; transform-origin:top left; box-shadow:0 4px 18px rgba(0,0,0,.35); }
.sk-docbar{ display:flex; flex-wrap:wrap; gap:6px; max-width:820px; margin:10px auto 0; padding-bottom:calc(10px + var(--safe-bottom,0px)); } .sk-docbar .sk-b{ flex:1 1 auto; background:#fff; color:#222; } .sk-docbar .sk-b.pri{ background:var(--acc); color:var(--on-acc,#fff); }
.sk-docbody .sk-warn{ max-width:820px; margin:8px auto 0; background:#fff3cd; color:#222; }
`+DOC_RULES.replace(/\.sk-doc/g, '.sk-paper .sk-doc')+DOC_RULES.replace(/\.sk-doc/g, '#printArea .sk-doc');
function ensureDom(){
  if($('seikyuOverlay')) return;
  const stl=document.createElement('style'); stl.id='skStyle'; stl.textContent=SK_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="seikyuOverlay">
  <div class="modal vol-modal sk-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📃 請求書づくり</span><button class="modal-close" onclick="closeSeikyu()" aria-label="閉じる">✕</button></div>
    <div class="sk-body" id="skBody"></div>
  </div></div>
  <div class="modal-overlay" id="seikyuDocOverlay">
  <div class="modal vol-modal sk-modal modal-full" style="position:relative">
    <div class="modal-header"><span id="skDocTitle">📃 請求書を 見る</span><button class="modal-close" onclick="closeDlg('seikyuDocOverlay')" aria-label="閉じる">✕</button></div>
    <div class="sk-docbody" id="skDocBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  ['seikyuOverlay','seikyuDocOverlay'].forEach(id=>$(id).addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); }));
  $('seikyuOverlay').addEventListener('focusin', yenFocus); $('seikyuOverlay').addEventListener('focusout', yenBlur);
  window.addEventListener('resize', ()=>{ if($('seikyuDocOverlay') && isDlgOpen('seikyuDocOverlay')) fitPaper(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ save(); if($('seikyuDocOverlay') && isDlgOpen('seikyuDocOverlay')) closeDlg('seikyuDocOverlay'); }
function openSeikyu(){ ensureDom(); load(); openDlg('seikyuOverlay', cleanup); render(); }
function closeSeikyu(){ if(!$('seikyuOverlay') || !isDlgOpen('seikyuOverlay')) return; closeDlg('seikyuOverlay', cleanup); }

window.SEIKYU={ doc:setDoc, it:setIt, itPick, addIt, delIt, keepProd, addProd, op:setOp, opPick, addOp, delOp, keepOpt, addOptm,
  ru:setRu, addRu, delRu, keepRule, addRulem, dv:setDv, tax:setTax, fin:setFin, cut, me:setMe, def:setDef,
  keep, fresh:()=>{ fresh(); }, openInv:i=>{ openInv(i); }, dupInv, delInv:i=>{ delInv(i); }, view, print:printDoc, copy:copyDoc, zoom:()=>{ zoom=!zoom; fitPaper(); },
  calc:()=>{ const c=calc(V()); return {A:c.A, qty:c.qty, D:c.D, B:c.B, O:c.O, optN:c.optN, Rs:c.Rs, rules:c.rr.map(x=>x.use ? (x.met ? 'ok:'+x.amt : 'ng:'+x.need) : 'off'), E:c.E, T:c.T, F:c.F, G:c.G, t:c.t, b:c.b, adj:c.adj, warn:c.warn.slice(), dl:c.dl}; },
  lines:()=>lines(V(), calc(V())).map(l=>l.name+'='+l.amt), text:()=>docText(V(), calc(V())), html:()=>docHtml(V(), calc(V())),
  state:()=>{ save(); return JSON.parse(JSON.stringify(st)); }, dirty:()=>dirty, kake:kakeOf };
Object.assign(window, { openSeikyu, closeSeikyu });
})();
