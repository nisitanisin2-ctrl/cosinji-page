/* 🧮 そろばん（v568。表電卓の道具。はじめて開いたときに読む。apps/soroban/ から単独のアプリとしても開ける）
   ・珠をはじいて計算：下の珠（1つ1）は 押すと 梁（はり）まで上がり、上がっている珠を押すと 下がる。上の珠（5）は 押すたびに 下りる／上がる。
   ・🧹 ご破算（ぜんぶ 払う）・🔢 数を入れると そろばんに置く・👁 いまの数を 出す／かくす・桁（9・11・13）・🔈 珠の音。
   ・答え合わせで まちがえたら「🧮 そろばんで 見る」で 正しい答えの珠の形を見せる。表で えらんでいるセルの数も置ける。
   ・🎯 練習：見取り算（数を見て 足し引き）・読み上げ算（「願いましては 〜円なり 〜円では」と 声で読む）。答えを そろばんに置いて「答え合わせ」。
     レベル：桁（1〜4けた）・口数（3〜10口）・引き算あり／なし（とちゅうで マイナスにならない）。読む速さ。
   ・読み上げの声は 表電卓の「🔈 読み上げの声」と同じ（hyovoice.js）。
   ・桁・レベル・記録は excalc_soroban（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_soroban';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ja-JP');
const toastS=m=>{ if(typeof toast==='function') toast(m, 3000); };

/* ───────── 状態 ───────── */
let st=null, dg=[], pr=null, speakT=0, actx=null, readSeq=0;   // dg：桁ごとの数（左から）。pr：練習中の問題。readSeq：読み上げの番号（止めたら ふやす）
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const lv=(o.lv && typeof o.lv==='object') ? o.lv : {};
  st={rods:[9,11,13].includes(o.rods)?o.rods:(window.innerWidth>=600?13:9), show:o.show!==false, snd:o.snd!==false,
    mode:o.mode==='yomi'?'yomi':'mitori',
    lv:{keta:[1,2,3,4].includes(lv.keta)?lv.keta:2, kuchi:[3,5,7,10].includes(lv.kuchi)?lv.kuchi:5, hiki:!!lv.hiki, speed:['slow','mid','fast'].includes(lv.speed)?lv.speed:'mid'},
    rec:{n:Math.max(0,+((o.rec||{}).n)||0), ok:Math.max(0,+((o.rec||{}).ok)||0), best:Math.max(0,+((o.rec||{}).best)||0), run:Math.max(0,+((o.rec||{}).run)||0)}};
  if(dg.length!==st.rods) dg=Array(st.rods).fill(0);
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }
const value=()=>dg.reduce((v,d)=>v*10+d, 0);
function setValue(n){
  n=Math.max(0, Math.floor(+n||0));
  const s=String(n); if(s.length>st.rods) return false;
  dg=Array(st.rods).fill(0); [...s].reverse().forEach((c,i)=>{ dg[st.rods-1-i]=+c; });
  return true;
}

/* ───────── 珠の音 ───────── */
function click(){
  if(!st.snd) return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    if(!actx) actx=new AC();
    const t=actx.currentTime, o=actx.createOscillator(), g=actx.createGain();
    o.type='square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(600, t+0.03);
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.05);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+0.06);
  }catch(_){}
}

/* ───────── そろばん（SVG）─────────
   1本の桁：上の珠（5）は 梁の上・下の珠（1）は 梁の下に4つ。梁に 寄っている珠が 数になる。
   定位点（梁の ・）は 右から 1・4・7・10・13 本目（いちばん右が 一の位） */
const W=40, BH=22, GAP=4, TOP=12, HEAVEN=2*BH+GAP*2, BEAM=10, EARTH=5*BH+GAP*4;
const Y_BEAM=TOP+HEAVEN, Y_EARTH=Y_BEAM+BEAM, H=Y_EARTH+EARTH+12;
function beadPath(cx, cy){ const w=W*0.44, h=BH/2; return `M${cx-w},${cy} L${cx-w*0.55},${cy-h} L${cx+w*0.55},${cy-h} L${cx+w},${cy} L${cx+w*0.55},${cy+h} L${cx-w*0.55},${cy+h} Z`; }
function heavenY(on){ return on ? Y_BEAM-BH/2-1 : TOP+BH/2; }
function earthY(k, on){ return on ? Y_EARTH+BH/2+1+(k-1)*BH : Y_EARTH+BH/2+1+k*BH+GAP*3-(k===4?0:0); }
function sorobanSvg(){
  const n=st.rods, w=n*W+16;
  let rods='', dots='';
  for(let i=0;i<n;i++){
    const cx=8+W*i+W/2, d=dg[i], up5=d>=5, c1=d%5;
    rods+=`<line x1="${cx}" y1="${TOP-4}" x2="${cx}" y2="${H-8}" class="rod"/>`;
    rods+=`<path d="${beadPath(cx, heavenY(up5))}" class="bd h${up5?' on':''}" data-r="${i}" data-b="h"/>`;
    for(let k=1;k<=4;k++) rods+=`<path d="${beadPath(cx, earthY(k, k<=c1))}" class="bd${k<=c1?' on':''}" data-r="${i}" data-b="${k}"/>`;
    if((n-1-i)%3===0) dots+=`<circle cx="${cx}" cy="${Y_BEAM+BEAM/2}" r="2.2" class="dot"/>`;
  }
  return `<svg viewBox="0 0 ${w} ${H}" class="sb-svg" id="sbSvg" role="img" aria-label="そろばん">
    <rect x="1" y="1" width="${w-2}" height="${H-2}" rx="8" class="frame"/>
    <rect x="8" y="${TOP-6}" width="${w-16}" height="${H-TOP-2}" rx="3" class="inner"/>
    ${rods}<rect x="6" y="${Y_BEAM}" width="${w-12}" height="${BEAM}" class="beam"/>${dots}
  </svg>`;
}
// 押した珠を動かす（下の珠：上がっていれば その珠から下を下げる・下がっていれば その珠まで上げる）
function tapBead(r, b){
  r=+r; if(!(r>=0 && r<st.rods)) return;
  const d=dg[r], h=d>=5?5:0, c=d%5;
  if(b==='h') dg[r]=d>=5 ? d-5 : d+5;
  else { const k=+b; if(!(k>=1 && k<=4)) return; dg[r]=h+(k<=c ? k-1 : k); }
  click(); paintSoroban();
}
function paintSoroban(){
  const box=$('sbBox'); if(!box) return;
  box.innerHTML=sorobanSvg();
  const v=value();
  const vb=$('sbVal'); if(vb) vb.innerHTML=shown() ? `<b>${fmt(v)}</b>` : '<span class="hid">（数は かくしています）</span>';
}
function bindTap(){
  const box=$('sbBox'); if(!box || box.dataset.b) return; box.dataset.b='1';
  // 珠の近くを押しても 動くように（いちばん近い珠）
  box.addEventListener('pointerdown', e=>{
    const svg=$('sbSvg'); if(!svg) return;
    const t=e.target.closest && e.target.closest('[data-b]');
    if(t){ e.preventDefault(); tapBead(t.dataset.r, t.dataset.b); return; }
    const r=svg.getBoundingClientRect(), sc=(st.rods*W+16)/r.width, x=(e.clientX-r.left)*sc, y=(e.clientY-r.top)*sc;
    const i=Math.floor((x-8)/W); if(i<0 || i>=st.rods) return;
    const d=dg[i], c=d%5, cands=[['h', heavenY(d>=5)]].concat([1,2,3,4].map(k=>[String(k), earthY(k, k<=c)]));
    let best=null; cands.forEach(([b,yy])=>{ const dd=Math.abs(yy-y); if(!best || dd<best[1]) best=[b,dd]; });
    if(best && best[1]<BH){ e.preventDefault(); tapBead(i, best[0]); }
  });
}

/* ───────── 練習 ───────── */
const SPEED={slow:[0.85,1300], mid:[1.0,800], fast:[1.2,400]};   // [読む速さ, 口と口の あいだ(ms)]
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function makeProblem(){
  const {keta, kuchi, hiki}=st.lv, lo=Math.pow(10,keta-1), hi=Math.pow(10,keta)-1, nums=[];
  let sum=0;
  for(let i=0;i<kuchi;i++){
    let n=rnd(lo,hi), minus=false;
    if(hiki && i>0 && sum>=lo && Math.random()<0.4){ n=rnd(lo, Math.min(hi, sum)); minus=true; }   // とちゅうで マイナスにならない
    nums.push(minus?-n:n); sum+=minus?-n:n;
  }
  return {nums, ans:sum, done:false, ok:null, reading:false, idx:-1};
}
function startPractice(){
  stopSpeak();
  pr=makeProblem(); dg=Array(st.rods).fill(0);
  if(String(Math.abs(pr.ans)).length>st.rods || pr.nums.some(n=>String(Math.abs(n)).length>st.rods)){ st.rods=13; save(); dg=Array(13).fill(0); }
  render();
  if(st.mode==='yomi') readAloud();
}
function stopSpeak(){ readSeq++; clearTimeout(speakT); speakT=0; try{ if(window.HyoVoice) HyoVoice.cancel(); else if(window.speechSynthesis) speechSynthesis.cancel(); }catch(_){} if(pr) pr.reading=false; }
function say(text, rate, done){
  let fired=false, ft=0; const fin=()=>{ if(fired) return; fired=true; clearTimeout(ft); done&&done(); };
  const est=Math.max(900, text.length*170/rate);   // onend が来ない端末のために
  try{
    if(window.HyoVoice && HyoVoice.available) HyoVoice.speak(text, {lang:'ja', rate, onend:fin});
    else if(window.speechSynthesis && window.SpeechSynthesisUtterance){ const u=new SpeechSynthesisUtterance(text); u.lang='ja-JP'; u.rate=rate; u.onend=fin; speechSynthesis.speak(u); }
    else { setTimeout(fin, 400); return; }
  }catch(_){ setTimeout(fin, 400); return; }
  ft=setTimeout(fin, est+1500);
}
// 「願いましては、325円なり、引いては 48円なり、…、73円では」
function readAloud(){
  if(!pr) return; stopSpeak();
  const [rate, gap]=SPEED[st.lv.speed], N=pr.nums.length, my=readSeq;
  const alive=()=>my===readSeq && pr && pr.reading;   // 止めたあとや 次の問題に 前の読み上げの続きが 混ざらないように
  pr.reading=true; pr.idx=-1; paintPr();
  const step=i=>{
    if(!alive()) return;
    if(i>=N){ pr.reading=false; pr.idx=N; paintPr(); return; }
    pr.idx=i; paintPr();
    const n=pr.nums[i], t=(n<0?'引いては、':'')+Math.abs(n)+'円'+(i===N-1?'では。':'なり。');
    say(t, rate, ()=>{ if(alive()) speakT=setTimeout(()=>step(i+1), gap); });
  };
  say('願いましては。', rate, ()=>{ if(alive()) speakT=setTimeout(()=>step(0), gap); });
}
function check(){
  if(!pr || pr.done) return;
  stopSpeak();
  const v=value(), ok=v===pr.ans;
  pr.done=true; pr.ok=ok; pr.v=v;
  st.rec.n++; if(ok){ st.rec.ok++; st.rec.run++; st.rec.best=Math.max(st.rec.best, st.rec.run); } else st.rec.run=0;
  save(); render();
}
function paintPr(){ const b=$('sbPr'); if(b) b.innerHTML=prHtml(); }
function prHtml(){
  if(!pr) return `<div class="sb-start"><p>${st.mode==='yomi'?'「▶ はじめる」を押すと 声で数を読みます。聞きながら そろばんで 足し引きして、最後に「答え合わせ」を押します。':'「▶ はじめる」を押すと 数が出ます。そろばんで 足し引きして、最後に「答え合わせ」を押します。'}</p>
    <button type="button" class="sb-b pri" onclick="SOROBAN.start()">▶ はじめる（${st.lv.keta}けた・${st.lv.kuchi}口${st.lv.hiki?'・引き算あり':''}）</button></div>`;
  const N=pr.nums.length;
  const list=st.mode==='mitori' || pr.done
    ? `<div class="sb-mitori">${pr.nums.map((n,i)=>`<div class="r${pr.idx===i?' cur':''}"><span class="no">${i+1}</span><span class="n${n<0?' m':''}">${n<0?'−':''}${fmt(Math.abs(n))}</span></div>`).join('')}<div class="r tot"><span class="no">答</span><span class="n">${pr.done?fmt(pr.ans):'？'}</span></div></div>`
    : `<div class="sb-yomi">${pr.reading ? (pr.idx<0?'🔈 願いましては…':`🔈 ${pr.idx+1} / ${N} 口目`) : pr.idx>=N ? '🔈 では。そろばんの答えを たしかめて「答え合わせ」を押してください。' : '🔈 読み上げの準備…'}</div>`;
  const res=pr.done ? `<div class="sb-res ${pr.ok?'ok':'ng'}">${pr.ok?'⭕ 正解！':'❌ ざんねん'}<small>${pr.ok?'':'そろばん：'+fmt(pr.v)+' ・ '}答え：${fmt(pr.ans)}</small></div>` : '';
  const acts=pr.done
    ? `<button type="button" class="sb-b pri" onclick="SOROBAN.start()">▶ 次の問題</button>${pr.ok?'':'<button type="button" class="sb-b" onclick="SOROBAN.showAns()">🧮 そろばんで 見る</button>'}`
    : `<button type="button" class="sb-b pri" onclick="SOROBAN.check()">✅ 答え合わせ</button>${st.mode==='yomi'?`<button type="button" class="sb-b" onclick="SOROBAN.again()">🔁 もう一度 読む</button>`:''}<button type="button" class="sb-b" onclick="SOROBAN.giveup()">答えを見る</button>`;
  return list+res+`<div class="sb-acts">${acts}</div>`;
}
// 答えを そろばんに置いて見せる（数も出す）
function showAns(){
  if(!pr || !pr.done) return;
  if(!setValue(pr.ans)){ st.rods=13; save(); dg=Array(13).fill(0); setValue(pr.ans); }
  prShow=true; click(); render();
  const b=$('sbBox'); if(b && b.scrollIntoView) b.scrollIntoView({block:'nearest', behavior:'smooth'});
}
function giveup(){ if(!pr || pr.done) return; stopSpeak(); pr.done=true; pr.ok=false; pr.v=value(); st.rec.n++; st.rec.run=0; save(); render(); }

/* ───────── 画面 ───────── */
let tab='free', prShow=false;   // 練習のときは 数を かくして始める（自由にの 出す／かくす は そのまま）
const shown=()=>tab==='free' ? st.show : prShow;
function render(){
  const b=$('sbBody'); if(!b) return;
  const rec=st.rec, pct=rec.n?Math.round(rec.ok/rec.n*100):0;
  b.innerHTML=`<div class="sb-wrap">
    <div class="sb-tabs">${[['free','🧮 自由に'],['mitori','👀 見取り算'],['yomi','🔈 読み上げ算']].map(([k,n])=>`<button type="button" class="${tab===k?'on':''}" onclick="SOROBAN.tab('${k}')">${n}</button>`).join('')}</div>
    ${tab!=='free'?`<div id="sbPr" class="sb-pr">${prHtml()}</div>`:''}
    <div class="sb-val" id="sbVal"></div>
    <div class="sb-box" id="sbBox"></div>
    <div class="sb-tools"><button type="button" class="sb-b" onclick="SOROBAN.clear()">🧹 ご破算</button>
      ${tab==='free'?'<button type="button" class="sb-b" onclick="SOROBAN.put()">🔢 数を置く</button>':''}
      <button type="button" class="sb-b" onclick="SOROBAN.toggleShow()">${shown()?'🙈 数をかくす':'👁 数を出す'}</button></div>
    ${tab==='free' ? (()=>{ const c=cellNum(); return c ? `<button type="button" class="sb-cell" onclick="SOROBAN.putCell()">▦ 表のセル ${esc(c.lab)} の <b>${fmt(c.n)}</b> を そろばんに置く</button>` : ''; })() : ''}
    ${tab!=='free'?`<div class="sb-sec"><h4>🎯 レベル</h4>
      <div class="sb-opt"><span>けた</span>${[1,2,3,4].map(v=>`<button type="button" class="${st.lv.keta===v?'on':''}" onclick="SOROBAN.lv('keta',${v})">${v}</button>`).join('')}</div>
      <div class="sb-opt"><span>口数</span>${[3,5,7,10].map(v=>`<button type="button" class="${st.lv.kuchi===v?'on':''}" onclick="SOROBAN.lv('kuchi',${v})">${v}</button>`).join('')}</div>
      <div class="sb-opt"><span>引き算</span>${[[false,'なし'],[true,'あり']].map(([v,n])=>`<button type="button" class="${st.lv.hiki===v?'on':''}" onclick="SOROBAN.lv('hiki',${v})">${n}</button>`).join('')}</div>
      ${tab==='yomi'?`<div class="sb-opt"><span>読む速さ</span>${[['slow','ゆっくり'],['mid','ふつう'],['fast','はやい']].map(([v,n])=>`<button type="button" class="${st.lv.speed===v?'on':''}" onclick="SOROBAN.lv('speed','${v}')">${n}</button>`).join('')}</div>`:''}
      <div class="sb-rec">これまで ${rec.n}問・正解 ${rec.ok}問（${pct}%）・いま ${rec.run}問 連続・いちばん ${rec.best}問 連続</div></div>`:''}
    <div class="sb-sec"><h4>⚙ そろばん</h4>
      <div class="sb-opt"><span>桁</span>${[9,11,13].map(v=>`<button type="button" class="${st.rods===v?'on':''}" onclick="SOROBAN.rods(${v})">${v}けた</button>`).join('')}</div>
      <div class="sb-opt"><span>珠の音</span>${[[true,'鳴らす'],[false,'鳴らさない']].map(([v,n])=>`<button type="button" class="${st.snd===v?'on':''}" onclick="SOROBAN.snd(${v})">${n}</button>`).join('')}</div>
      <p class="sb-note">下の珠（1）は 押すと 梁（はり）まで上がり、上がっている珠を押すと 下がります。上の珠（5）は 押すたびに 下りる／上がる。いちばん右の桁が 一の位です（梁の ・ は 3けたごと）。</p></div>
  </div>`;
  paintSoroban(); bindTap();
}
function setTab(k){ if(!['free','mitori','yomi'].includes(k)) return; stopSpeak(); tab=k; prShow=false; if(k!=='free'){ st.mode=k; save(); pr=null; } render(); }
async function put(){
  const v=typeof appPrompt==='function' ? await appPrompt('そろばんに置く数（0〜'+'9'.repeat(st.rods)+'）', String(value())) : prompt('数', String(value()));
  if(v==null) return;
  const n=String(v).normalize('NFKC').replace(/[,，\s円]/g,'');
  if(!/^\d+$/.test(n)){ toastS('0以上の 整数を入れてください'); return; }
  if(!setValue(+n)){ toastS(st.rods+'けたまでの数です（⚙ で桁をふやせます）'); return; }
  click(); paintSoroban();
}
// 表電卓で えらんでいるセルの数（計算の答えなど）。0以上の整数のときだけ（道具だけのアプリでは 出さない）
function cellNum(){
  if(window.APP_TOOL || typeof getCellDisplay!=='function' || typeof selR!=='number' || typeof selC!=='number') return null;
  let t=''; try{ t=String(getCellDisplay(selR, selC)); }catch(_){ return null; }
  const n=t.normalize('NFKC').replace(/[,，\s円]/g,'');
  if(!/^\d+$/.test(n) || n.length>13) return null;
  return {lab:(typeof xlColLetter==='function' ? xlColLetter(selC) : '')+(selR+1), n:+n};
}
function putCell(){
  const c=cellNum(); if(!c){ toastS('表の えらんだセルに 0以上の整数が ありません'); return; }
  if(!setValue(c.n)){ st.rods=13; save(); dg=Array(13).fill(0); setValue(c.n); }
  click(); render();
}
function clearAll(){ dg=Array(st.rods).fill(0); click(); paintSoroban(); }
function toggleShow(){ if(tab==='free'){ st.show=!st.show; save(); } else prShow=!prShow; render(); }
function setLv(k, v){ if(!(k in st.lv)) return; st.lv[k]=v; save(); pr=null; stopSpeak(); render(); }
function setRods(n){ if(![9,11,13].includes(n)) return; const v=value(); st.rods=n; save(); dg=Array(n).fill(0); if(!setValue(v)) dg=Array(n).fill(0); render(); }
function setSnd(b){ st.snd=!!b; save(); render(); }

const SB_CSS=`
#sorobanOverlay .sb-modal{ display:flex; flex-direction:column; }
.sb-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.sb-wrap{ max-width:820px; margin:0 auto; }
.sb-tabs{ display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin:0 0 10px; }
.sb-tabs button{ min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); color:var(--text,#333); font-size:14px; font-weight:bold; cursor:pointer; }
.sb-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.sb-val{ text-align:right; min-height:40px; padding:0 6px; font-variant-numeric:tabular-nums; } .sb-val b{ font-size:32px; letter-spacing:.02em; } .sb-val .hid{ font-size:13px; color:var(--text-light,#777); }
.sb-box{ touch-action:manipulation; user-select:none; -webkit-user-select:none; }
.sb-svg{ display:block; width:100%; height:auto; max-height:56vh; }
.sb-svg .frame{ fill:#6d4c2f; } .sb-svg .inner{ fill:#f3e3c7; } body.dark .sb-svg .inner{ fill:#3a2e22; }
.sb-svg .rod{ stroke:#8d6e63; stroke-width:2; } .sb-svg .beam{ fill:#5d4037; } .sb-svg .dot{ fill:#f3e3c7; }
.sb-svg .bd{ fill:#4e342e; stroke:#2e1d17; stroke-width:.8; cursor:pointer; transition:d .12s ease; } .sb-svg .bd.on{ fill:#3e2723; }
body.dark .sb-svg .bd{ fill:#8d6e63; stroke:#d7ccc8; } body.dark .sb-svg .bd.on{ fill:#a1887f; }
.sb-cell{ display:block; width:100%; min-height:40px; margin:0 0 10px; padding:4px 10px; border-radius:12px; border:1px dashed rgba(120,132,156,.6); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.sb-tools{ display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:10px 0; }
.sb-b{ min-height:46px; padding:0 8px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; touch-action:manipulation; }
.sb-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-size:15.5px; }
.sb-pr{ margin:0 0 8px; padding:10px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.sb-start p{ margin:0 0 8px; font-size:13.5px; line-height:1.6; } .sb-start .sb-b{ width:100%; }
.sb-mitori{ display:inline-flex; flex-direction:column; min-width:60%; margin:0 auto 6px; font-variant-numeric:tabular-nums; }
.sb-pr{ text-align:center; }
.sb-mitori .r{ display:flex; justify-content:space-between; gap:14px; padding:2px 8px; font-size:22px; border-bottom:1px solid rgba(120,132,156,.18); }
.sb-mitori .r.cur{ background:rgba(200,150,30,.18); }
.sb-mitori .no{ font-size:12px; color:var(--text-light,#777); align-self:center; } .sb-mitori .n{ font-weight:bold; } .sb-mitori .n.m{ color:#c62828; } body.dark .sb-mitori .n.m{ color:#ef9a9a; }
.sb-mitori .tot{ border-top:2px solid var(--text,#333); border-bottom:0; }
.sb-yomi{ font-size:17px; font-weight:bold; padding:10px 0; }
.sb-res{ font-size:22px; font-weight:bold; margin:6px 0; } .sb-res small{ display:block; font-size:14px; font-weight:normal; color:var(--text,#333); }
.sb-res.ok{ color:#2e7d32; } .sb-res.ng{ color:#c62828; } body.dark .sb-res.ok{ color:#81c784; } body.dark .sb-res.ng{ color:#ef9a9a; }
.sb-acts{ display:flex; flex-wrap:wrap; gap:6px; justify-content:center; } .sb-acts .sb-b{ flex:1 1 30%; }
.sb-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.sb-sec h4{ margin:0 0 6px; font-size:15px; }
.sb-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:5px 0; } .sb-opt span{ min-width:4.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.sb-opt button{ min-height:36px; min-width:44px; padding:0 10px; border-radius:18px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; }
.sb-opt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.sb-rec{ font-size:12.5px; color:var(--text-light,#555); margin-top:6px; }
.sb-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; }
`;
function ensureDom(){
  if($('sorobanOverlay')) return;
  const stl=document.createElement('style'); stl.id='sbStyle'; stl.textContent=SB_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="sorobanOverlay">
  <div class="modal vol-modal sb-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🧮 そろばん</span><button class="modal-close" onclick="closeSoroban()" aria-label="閉じる">✕</button></div>
    <div class="sb-body" id="sbBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  $('sorobanOverlay').addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openSoroban(){
  ensureDom(); load(); tab='free'; pr=null; prShow=false;
  openDlg('sorobanOverlay', ()=>stopSpeak());
  render();
}
function closeSoroban(){ if(!$('sorobanOverlay')||!isDlgOpen('sorobanOverlay')) return; closeDlg('sorobanOverlay', ()=>stopSpeak()); }

window.SOROBAN={ tab:setTab, tap:tapBead, clear:clearAll, put:()=>{ put(); }, toggleShow, lv:setLv, rods:setRods, snd:setSnd,
  start:startPractice, check, again:readAloud, giveup, showAns, putCell,
  value, set:n=>{ const ok=setValue(n); paintSoroban(); return ok; }, digits:()=>dg.slice(), problem:()=>pr?JSON.parse(JSON.stringify(pr)):null, state:()=>JSON.parse(JSON.stringify(st)) };
Object.assign(window, { openSoroban, closeSoroban });
})();
