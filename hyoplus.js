/* 📊 表を強くする（v563。表電卓の本体から、はじめて使うときに読む）
   表に出す側（☑・▾・条件の色・隠す行・SUMIF などの式）は index.html の「表を強くする」にあり、ここは決める窓だけ。
   ・☑ チェック欄・📋 えらぶだけの列 … 列ごとに決める（cellStyles._ct）。☑ した行だけの合計を表に入れられる。
   ・🎨 条件で色 … 「マイナスは赤」「期限が過ぎたら黄色（行ぜんぶ）」「上から3つを太字」など（cellStyles._cf）。
   ・🔎 しぼり込み・並べかえ … 列の見出しの ▾ から。えらぶ・数（日付）の範囲・字を含む（cellStyles._flt）。
     しぼると右上の合計も しぼった分だけになる。いちばん下の =SUM(…) の合計の行は SUBTOTAL にして しぼった分の合計にする。
   ・📑 項目ごとの合計 … 「食費・日用品…」ごとの合計（件数・平均）を、新しいシートに SUMIF の式でまとめる（もとを直すと変わる）。
   ・📊 グラフ … えらんだ範囲（なければ まわりの表）を 棒・折れ線・円に。画像で保存・共有・印刷。表で見る も。
   変える前に pushSnapshot を積むので、↶戻る 1回で元に戻せる（しぼり込みは 見せ方なので 戻るには積まない）。 */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const MAXOPT=40;
let view='';     // いま開いている窓：menu・kind・cf・filter・pivot・chart
let st={};       // 窓の中で決めかけている値

/* ───────── 窓 ───────── */
const HP_CSS=`
#hpOverlay .modal.hp-modal{ max-width:460px; max-height:86vh; }
#hpOverlay .modal.hp-modal.hp-wide{ max-width:760px; width:96%; }
#hpOverlay .modal-header{ gap:8px; }
.hp-body{ padding:12px 14px calc(14px + var(--safe-bottom,0px)); overflow:auto; color:var(--text); font-size:14px; line-height:1.55; }
.hp-lead{ margin:0 0 10px; font-size:13.5px; color:var(--text-sub); }
.hp-sec{ margin:14px 0 6px; font-size:12.5px; font-weight:bold; color:var(--text-sub); }
.hp-sec:first-child{ margin-top:0; }
.hp-b{ min-height:40px; padding:6px 12px; border-radius:var(--r-btn); border:1px solid var(--save-item-border); background:var(--cell-hover); color:var(--text); font-size:14px; font-weight:bold; cursor:pointer; }
.hp-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.hp-b.del{ color:var(--danger); }
.hp-b.ghost{ background:transparent; }
.hp-b:disabled{ opacity:.45; cursor:default; }
.hp-acts{ display:flex; gap:6px; justify-content:flex-end; flex-wrap:wrap; margin-top:14px; }
.hp-acts .left{ margin-right:auto; }
.hp-row{ display:flex; gap:6px; flex-wrap:wrap; }
.hp-row>.hp-b{ flex:1; }
.hp-menu{ display:flex; flex-direction:column; gap:6px; }
.hp-mi{ display:flex; align-items:center; gap:10px; width:100%; min-height:52px; padding:8px 12px; border-radius:var(--r-card); border:1px solid var(--save-item-border); background:transparent; color:var(--text); text-align:left; cursor:pointer; }
.hp-mi>span{ flex:none; font-size:22px; width:30px; text-align:center; }
.hp-mi b{ display:block; font-size:15px; } .hp-mi small{ display:block; font-size:12px; color:var(--text-sub); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hp-mi>div{ min-width:0; }
.hp-kinds{ display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
.hp-kind{ padding:9px 6px; border-radius:var(--r-card); border:2px solid var(--save-item-border); background:transparent; color:var(--text); cursor:pointer; text-align:center; }
.hp-kind b{ display:block; font-size:14px; white-space:nowrap; } .hp-kind small{ display:block; font-size:11px; color:var(--text-sub); margin-top:2px; line-height:1.35; }
.hp-kind.on{ border-color:var(--acc); background:var(--acc-weak); }
.hp-f{ display:block; margin:10px 0 0; font-size:12.5px; font-weight:bold; color:var(--text-sub); }
.hp-f input[type=text],.hp-f input[type=number],.hp-f input[type=date],.hp-f select,.hp-f textarea{ display:block; width:100%; box-sizing:border-box; margin-top:4px; min-height:40px; padding:6px 9px; border-radius:var(--r-btn); border:1px solid var(--formula-border); background:var(--formula-bg); color:var(--text); font-size:16px; font-weight:normal; font-family:inherit; }
.hp-f textarea{ min-height:84px; resize:vertical; }
.hp-inl{ display:flex; align-items:center; gap:8px; margin:10px 0 0; font-size:13.5px; cursor:pointer; }
.hp-inl input[type=checkbox]{ width:20px; height:20px; flex:none; accent-color:var(--acc); }
.hp-inl input[type=number]{ width:72px; min-height:36px; padding:4px 6px; border-radius:var(--r-btn); border:1px solid var(--formula-border); background:var(--formula-bg); color:var(--text); font-size:16px; }
.hp-chips{ display:flex; gap:5px; flex-wrap:wrap; margin-top:6px; }
.hp-chip{ min-height:34px; padding:3px 11px; border-radius:var(--r-pill); border:1px solid var(--save-item-border); background:transparent; color:var(--text); font-size:13px; cursor:pointer; }
.hp-chip.on{ border-color:var(--acc); background:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.hp-note{ margin:10px 0 0; padding:7px 10px; border-radius:var(--r-btn); background:var(--acc-weak); font-size:12.5px; color:var(--text); }
.hp-warn{ margin:10px 0 0; padding:7px 10px; border-radius:var(--r-btn); background:rgba(230,126,34,.14); font-size:12.5px; color:var(--text); }
.hp-sum{ margin-top:8px; padding:9px 11px; border-radius:var(--r-btn); border:1px solid var(--save-item-border); font-size:13.5px; }
.hp-sum b{ font-size:17px; font-variant-numeric:tabular-nums; }
/* 条件で色 */
.hp-rules{ display:flex; flex-direction:column; gap:6px; }
.hp-rule{ display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:var(--r-btn); border:1px solid var(--save-item-border); }
.hp-rule.off{ opacity:.5; }
.hp-rule .t{ flex:1; min-width:0; font-size:13px; line-height:1.4; } .hp-rule .t small{ display:block; color:var(--text-sub); font-size:12px; }
.hp-rule button{ flex:none; width:34px; height:34px; border-radius:var(--r-btn); border:1px solid var(--save-item-border); background:transparent; color:var(--text); font-size:15px; cursor:pointer; padding:0; }
.hp-sw{ flex:none; display:inline-flex; align-items:center; justify-content:center; min-width:44px; height:28px; padding:0 6px; border-radius:6px; border:1px solid var(--save-item-border); font-size:13px; background:var(--cell-bg); color:var(--text); }
.hp-tpls{ display:grid; grid-template-columns:1fr 1fr; gap:6px; }
.hp-tpl{ min-height:46px; padding:6px 9px; border-radius:var(--r-btn); border:1px dashed var(--save-item-border); background:transparent; color:var(--text); font-size:13px; text-align:left; cursor:pointer; line-height:1.35; }
.hp-tpl b{ display:block; font-size:13.5px; }
.hp-colors{ display:flex; gap:5px; flex-wrap:wrap; align-items:center; margin-top:5px; }
.hp-colors>span{ font-size:12px; color:var(--text-sub); width:36px; flex:none; }
.hp-col{ width:36px; height:32px; border-radius:6px; border:2px solid var(--save-item-border); cursor:pointer; padding:0; font-size:13px; font-weight:bold; background:var(--cell-bg); color:var(--text); }
.hp-col.on{ border-color:var(--acc); box-shadow:0 0 0 2px var(--acc-weak); }
.hp-prev{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; font-size:13px; }
/* しぼり込み */
.hp-tabs{ display:flex; gap:4px; margin:12px 0 0; border-bottom:1px solid var(--save-item-border); }
.hp-tab{ flex:1; min-height:38px; border:none; border-bottom:3px solid transparent; background:transparent; color:var(--text-sub); font-size:13.5px; font-weight:bold; cursor:pointer; }
.hp-tab.on{ color:var(--text); border-bottom-color:var(--acc); }
.hp-vals{ max-height:min(40vh,320px); overflow:auto; margin-top:6px; border:1px solid var(--save-item-border); border-radius:var(--r-btn); }
.hp-v{ display:flex; align-items:center; gap:9px; min-height:40px; padding:4px 10px; border-bottom:1px solid var(--save-item-border); cursor:pointer; font-size:14.5px; }
.hp-v:last-child{ border-bottom:none; }
.hp-v input{ width:20px; height:20px; flex:none; accent-color:var(--acc); }
.hp-v span{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hp-v small{ flex:none; color:var(--text-sub); font-variant-numeric:tabular-nums; }
.hp-v.all{ font-weight:bold; background:var(--cell-hover); }
.hp-rng{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
/* まとめ表・表で見る */
.hp-tbl{ width:100%; border-collapse:collapse; margin-top:8px; font-size:13.5px; }
.hp-tbl th,.hp-tbl td{ border:1px solid var(--save-item-border); padding:5px 7px; }
.hp-tbl th{ background:var(--cell-hover); font-size:12px; text-align:left; }
.hp-tbl td.n{ text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
.hp-tbl tr.sum td{ font-weight:bold; background:var(--cell-hover); }
.hp-tblwrap{ max-height:min(40vh,340px); overflow:auto; }
/* グラフ */
.hp-ch-top{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.hp-seg{ display:flex; border:1px solid var(--save-item-border); border-radius:var(--r-btn); overflow:hidden; }
.hp-seg button{ min-height:38px; padding:4px 12px; border:none; border-right:1px solid var(--save-item-border); background:transparent; color:var(--text); font-size:13.5px; font-weight:bold; cursor:pointer; }
.hp-seg button:last-child{ border-right:none; }
.hp-seg button.on{ background:var(--acc); color:var(--on-acc,#fff); }
.hp-ch-title{ display:block; width:100%; box-sizing:border-box; margin:10px 0 0; min-height:38px; padding:5px 9px; border-radius:var(--r-btn); border:1px solid var(--formula-border); background:var(--formula-bg); color:var(--text); font-size:15px; font-weight:bold; }
.hp-ch-box{ position:relative; margin-top:8px; border-radius:var(--r-card); border:1px solid var(--save-item-border); background:var(--modal-bg); overflow:hidden; touch-action:pan-y; }
.hp-ch-box svg{ display:block; width:100%; height:auto; }
.hp-tip{ position:absolute; z-index:2; pointer-events:none; min-width:110px; max-width:220px; padding:7px 9px; border-radius:8px; background:var(--modal-bg); color:var(--text); border:1px solid var(--save-item-border); box-shadow:var(--elev-1); font-size:12px; line-height:1.45; }
.hp-tip .h{ font-weight:bold; margin-bottom:3px; color:var(--text-sub); }
.hp-tip .r{ display:flex; align-items:center; gap:6px; }
.hp-tip .r i{ flex:none; width:12px; height:3px; border-radius:2px; }
.hp-tip .r b{ font-size:13.5px; font-variant-numeric:tabular-nums; }
.hp-tip .r span{ color:var(--text-sub); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hp-ch-note{ margin-top:6px; font-size:12px; color:var(--text-sub); }
.hp-ch-empty{ padding:30px 12px; text-align:center; color:var(--text-sub); font-size:13.5px; }
@media print{ #printArea .hp-pc{ width:100%; } #printArea .hp-pc svg{ width:100%; height:auto; } #printArea .hp-pt{ margin-top:10px; } }
@media (max-width:380px){ .hp-body{ padding:10px 10px calc(12px + var(--safe-bottom,0px)); } .hp-tpls{ grid-template-columns:1fr; } .hp-kind small{ display:none; } .hp-kind b{ font-size:13px; } .hp-colors>span{ width:100%; } .hp-col{ width:34px; } }
`;
function ensureDom(){
  if($('hpOverlay')) return;
  const stl=document.createElement('style'); stl.id='hpStyle'; stl.textContent=HP_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="hpOverlay">
  <div class="modal hp-modal" role="dialog" aria-modal="true" aria-labelledby="hpTitle">
    <div class="modal-header"><span id="hpTitle"></span><button class="modal-close" onclick="HP.close()" aria-label="閉じる">✕</button></div>
    <div class="hp-body" id="hpBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof bindBackdropClose==='function') bindBackdropClose('hpOverlay', ()=>close());
  // 窓の中の入力は テンキー（表の打ち込み）に渡さない
  $('hpOverlay').addEventListener('keydown', e=>{ if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) e.stopPropagation(); });
}
function show(name, title, html, wide){
  ensureDom();
  view=name;
  $('hpTitle').textContent=title;
  $('hpBody').innerHTML=html;
  $('hpOverlay').querySelector('.modal').classList.toggle('hp-wide', !!wide);
  if(!isDlgOpen('hpOverlay')) openDlg('hpOverlay', ()=>{ view=''; tipHide(); });
  $('hpBody').scrollTop=0;
}
function close(){ if($('hpOverlay')) closeDlg('hpOverlay', ()=>{ view=''; tipHide(); }); }

/* ───────── 表の読み取り ───────── */
const txt=(r,c)=>String(getCellDisplay(r,c)==null?'':getCellDisplay(r,c)).trim();
const filled=(r,c)=>data[r] && data[r][c]!=='' && data[r][c]!=null;
/* (r,c) を含む「ひとかたまりの表」（まわりを空の行・列で囲まれた範囲。Excel の Ctrl+A と同じ） */
function region(r,c){
  let r1=r, r2=r, c1=c, c2=c, grew=true;
  const rowHas=(rr,a,b)=>{ if(rr<0||rr>=ROWS) return false; for(let x=Math.max(0,a);x<=Math.min(COLS-1,b);x++) if(filled(rr,x)) return true; return false; };
  const colHas=(cc,a,b)=>{ if(cc<0||cc>=COLS) return false; for(let y=Math.max(0,a);y<=Math.min(ROWS-1,b);y++) if(filled(y,cc)) return true; return false; };
  while(grew){
    grew=false;
    if(rowHas(r1-1,c1-1,c2+1)){ r1--; grew=true; }
    if(rowHas(r2+1,c1-1,c2+1)){ r2++; grew=true; }
    if(colHas(c1-1,r1-1,r2+1)){ c1--; grew=true; }
    if(colHas(c2+1,r1-1,r2+1)){ c2++; grew=true; }
  }
  for(let y=r1;y<=r2;y++) for(let x=c1;x<=c2;x++) if(filled(y,x)) return {r1,c1,r2,c2};
  return null;
}
/* 列 c を含む表（えらんでいるセルの表、なければ その列の いちばん上の中身の表） */
function tableAround(c){
  if(selR>=0 && filled(selR, selC) && (c==null || c===selC)) return region(selR, selC);
  const cc=(c==null) ? selC : c;
  if(selR>=0 && filled(selR, cc)) return region(selR, cc);
  for(let r=0;r<ROWS;r++) if(filled(r,cc)) return region(r,cc);
  return null;
}
/* 見出しの行か（字だけが並んでいて、下に行がある） */
function isHeaderRow(r, rg){
  if(r<0 || rg.r2<=r) return false;
  let t=0, n=0;
  for(let c=rg.c1;c<=rg.c2;c++){ const x=hpCellVal(r,c); if(x.e) continue; if(x.n!=null) n++; else t++; }
  return t>0 && n===0;
}
function headerOf(rg){ return (rg && isHeaderRow(rg.r1, rg)) ? rg.r1 : (rg ? rg.r1-1 : -1); }
/* 列の中身の種類：num（数）・date（日付）・text（字）・ck（チェック欄） */
function colKind(c, rows){
  const k=hpKindAt(rows.length?rows[0]:0, c);
  if(k && k.k==='ck') return 'ck';
  let n=0, d=0, t=0;
  rows.forEach(r=>{ const x=hpCellVal(r,c); if(x.e) return; if(x.d!=null) d++; else if(x.n!=null) n++; else t++; });
  if(!n && !d && !t) return '';
  if(d>=n && d>=t) return 'date';
  if(n>0 && n>=t) return 'num';
  return 'text';
}
/* 下の合計の行を除いた データの行 */
function dataRows(rg, h){
  const out=[];
  for(let r=Math.max(rg.r1, h+1); r<=rg.r2; r++) out.push(r);
  while(out.length>1 && hpIsTotalRow(out[out.length-1])) out.pop();
  return out;
}
const nf=v=>{
  if(v==null || !isFinite(v)) return '';
  const a=Math.abs(v), d=a>=100 ? 0 : a>=1 ? 2 : 3;
  return withCommas(String(parseFloat(v.toFixed(d))));
};
const colName=(c,h)=>hpHeadName(c,h);
/* 前に戻せる形で、表を書きかえ終えたあとの片づけ */
function afterEdit(){
  buildSheet();
  recalcAll();
  if(selR>=ROWS || selC>=COLS) sel(Math.min(selR,ROWS-1), Math.min(selC,COLS-1)); else sel(selR, selC);
  persistModes(); if(typeof saveSheets==='function') saveSheets();
}

/* ───────── 入口（セルの長押し） ───────── */
function menu(){
  const r=selR, c=selC, v=txt(r,c), f=hpFlt();
  const h=f ? (f.h|0) : guessHeader(c);
  const items=[
    ['chart','📊','グラフにする', (rangeR1>=0?'えらんだ範囲':'まわりの表')+'を 棒・折れ線・円に'],
    ['cf','🎨','条件で色をつける','マイナスは赤・期限が過ぎたら黄色 など'],
    (v!=='' && r>h) ? ['quick','🔎','「'+v+'」だけを出す', ALPHA[c]+'列が これと同じ行だけにしぼる'] : null,
    ['filter','🔎','しぼり込み・並べかえ', ALPHA[c]+'列（'+colName(c,h)+'）で'],
    ['kind','☑','チェック欄・えらぶだけの列', ALPHA[c]+'列を ☑ や「現金／カード」に'],
    ['pivot','📑','項目ごとの合計','食費・日用品… ごとの合計を まとめ表に'],
  ].filter(Boolean);
  show('menu','📊 表を強くする','<div class="hp-menu">'+items.map(([a,ic,t,s])=>
    `<button type="button" class="hp-mi" onclick="HP.go('${a}')"><span>${ic}</span><div><b>${esc(t)}</b><small>${esc(s)}</small></div></button>`).join('')+'</div>');
}
function go(a){
  if(a==='quick'){ close(); quick(selR, selC); return; }
  if(HP[a]) HP[a](selC);
}

/* ───────── ☑ チェック欄・📋 えらぶだけの列 ───────── */
const PK_PRESETS=[['現金','カード'],['済','未'],['○','△','×'],['高','中','低'],['食費','日用品','光熱費','交通費','その他']];
function parseOpts(s){
  const out=[];
  String(s||'').split(/[\n、，,／\/]/).map(x=>x.replace(/[\u0000-\u001F]/g,'').trim().slice(0,30)).forEach(x=>{ if(x && out.indexOf(x)<0) out.push(x); });
  return out.slice(0,MAXOPT);
}
function suggestOpts(c, r1){
  const seen=[];
  for(let r=r1;r<ROWS;r++){
    const raw=data[r][c]; if(raw==='' || raw==null || String(raw).startsWith('=')) continue;
    const t=String(raw).trim(); if(!isNaN(t)) continue;
    if(seen.indexOf(t)<0) seen.push(t);
    if(seen.length>12) return ['現金','カード'];
  }
  return seen.length>=2 ? seen : ['現金','カード'];
}
function headRowOfCol(c){
  const rg=tableAround(c);
  if(rg) return headerOf(rg);
  const t=String(data[0][c]==null?'':data[0][c]).trim();
  return (t!=='' && isNaN(t)) ? 0 : -1;
}
function kind(c){
  if(c==null || c<0) c=selC;
  const o=hpKinds()||{}, k=o[c]||null;
  const h=k ? (k.r1|0)-1 : headRowOfCol(c);
  st={c, k:k?k.k:'', r1:Math.max(0,h+1), opts:(k && k.k==='pk' && Array.isArray(k.o)) ? k.o.slice() : suggestOpts(c, Math.max(0,h+1)), sum:nearNumCol(c, h)};
  kindRender();
}
function nearNumCol(c, h){
  const rows=[]; for(let r=h+1;r<ROWS && rows.length<200;r++) if(!hpRowBlank(r,-1)) rows.push(r);
  let best=-1, dist=99;
  for(let x=0;x<COLS;x++){ if(x===c) continue; if(colKind(x,rows)==='num' && Math.abs(x-c)<dist){ best=x; dist=Math.abs(x-c); } }
  return best;
}
function kindRender(){
  const c=st.c, h=st.r1-1, nm=colName(c,h);
  const opts=esc(st.opts.join('\n'));
  let html=`<p class="hp-lead">${esc(ALPHA[c])}列「${esc(nm)}」を どう使いますか？</p>
  <div class="hp-kinds">
    <button type="button" class="hp-kind${st.k===''?' on':''}" onclick="HP.kSet('')"><b>▦ ふつう</b><small>数や字を自由に</small></button>
    <button type="button" class="hp-kind${st.k==='ck'?' on':''}" onclick="HP.kSet('ck')"><b>☑ チェック</b><small>押すたびに ☑⇄☐</small></button>
    <button type="button" class="hp-kind${st.k==='pk'?' on':''}" onclick="HP.kSet('pk')"><b>📋 えらぶ</b><small>決めた言葉から</small></button>
  </div>`;
  if(st.k==='pk'){
    html+=`<label class="hp-f">えらぶ言葉（1行に1つ。「、」で区切っても）<textarea id="hpKo" rows="4" maxlength="1200">${opts}</textarea></label>
    <div class="hp-chips">${PK_PRESETS.map((p,i)=>`<button type="button" class="hp-chip" onclick="HP.kPreset(${i})">${esc(p.join('／'))}</button>`).join('')}</div>
    <div class="hp-note">セルを押すと、決めた言葉が並んだ窓が出ます。ほかの字を入れたいときは「✏️ ほかの字」で。</div>`;
  }
  if(st.k){
    html+=`<label class="hp-inl">はじまりの行 <input type="number" id="hpKr" min="1" max="${ROWS}" value="${st.r1+1}" inputmode="numeric"> 行目から下</label><div class="hp-ch-note">上の行は 見出しとして そのまま残します</div>`;
  }
  if(st.k==='ck'){
    html+=`<div class="hp-note">押すたびに ☑ ⇄ ☐。中身は ☑＝1・☐＝空 で、<b>=COUNTIF(${ALPHA[c]}${st.r1+1}:${ALPHA[c]}${ROWS},1)</b> で ☑ の数、<b>=SUMIF(…,1,…)</b> で ☑ の行だけの合計が出せます。「済」「○」と書いてあったセルは ☑ にします。</div>`;
    html+=kindSumHtml();
  }
  if(st.k==='' && (hpKinds()||{})[c]) html+=`<div class="hp-note">ふつうの列に戻します。入っている中身（☑＝1 など）は そのまま残ります。</div>`;
  html+=`<div class="hp-acts"><button type="button" class="hp-b" onclick="HP.close()">やめる</button><button type="button" class="hp-b pri" onclick="HP.kOk()">決める</button></div>`;
  show('kind','☑ チェック欄・えらぶだけの列', html);
}
/* ☑ した行だけの合計（見るだけ・表に入れる） */
function kindSumHtml(){
  const c=st.c, rows=[];
  for(let r=st.r1;r<ROWS;r++) if(!hpRowBlank(r,-1) && !hpIsTotalRow(r)) rows.push(r);   // 合計の行は数えない
  const nums=[]; for(let x=0;x<COLS;x++) if(x!==c && colKind(x,rows)==='num') nums.push(x);
  if(!nums.length) return '';
  if(nums.indexOf(st.sum)<0) st.sum=nums[0];
  let on=0, onN=0, offS=0, offN=0;
  rows.forEach(r=>{
    const raw=String(data[r][c]==null?'':data[r][c]); if(raw.startsWith('=')) return;
    const s=hpCkState(raw), v=hpCellVal(r,st.sum).n; if(s==null || v==null) return;
    if(s){ on+=v; onN++; } else { offS+=v; offN++; }
  });
  return `<div class="hp-sec">☑ した行だけの合計</div>
  <label class="hp-f">合計する列<select id="hpKs" onchange="HP.kSum(+this.value)">${nums.map(x=>`<option value="${x}"${x===st.sum?' selected':''}>${esc(ALPHA[x]+'列 '+colName(x,st.r1-1))}</option>`).join('')}</select></label>
  <div class="hp-sum">☑ の行：<b>${nf(on)}</b>（${onN}行）　☐ の行：${nf(offS)}（${offN}行）</div>
  <div class="hp-row" style="margin-top:6px"><button type="button" class="hp-b" onclick="HP.kSumPut()">▦ ☑ の合計を 表のいちばん下に入れる（式）</button></div>`;
}
function kSet(k){ kindKeep(); st.k=k; kindRender(); }
function kPreset(i){ st.opts=PK_PRESETS[i].slice(); kindRender(); }
function kSum(x){ kindKeep(); st.sum=x; kindRender(); }
function kindKeep(){
  const o=$('hpKo'); if(o) st.opts=parseOpts(o.value);
  const r=$('hpKr'); if(r){ const v=parseInt(r.value,10); if(v>=1) st.r1=clamp(v-1,0,ROWS-1); }
}
/* 決める：列の種類を書きかえる（チェック欄にするときは 済・○ を ☑(1) に、0・☐ を 空に そろえる） */
function kindApply(){
  kindKeep();
  const c=st.c, o=Object.assign({}, hpKinds()||{}), was=o[c];
  if(st.k==='pk' && !st.opts.length){ toast('えらぶ言葉を1つ以上入れてください'); return false; }
  pushSnapshot(st.k==='ck'?'チェック欄にする':st.k==='pk'?'えらぶだけの列にする':'ふつうの列に戻す');
  let fixed=0;
  if(!st.k) delete o[c];
  else if(st.k==='ck'){
    o[c]={k:'ck', r1:st.r1};
    for(let r=st.r1;r<MAXROWS;r++){
      const v=data[r][c]; if(v==='' || v==null || String(v).startsWith('=') || isLockedCell(r,c)) continue;
      const s=hpCkState(v);
      if(s===1 && v!=='1'){ data[r][c]='1'; fixed++; }
      else if(s===0){ data[r][c]=''; fixed++; }
    }
  }
  else o[c]={k:'pk', r1:st.r1, o:st.opts.slice(0,MAXOPT)};
  if(Object.keys(o).length) cellStyles._ct=o; else delete cellStyles._ct;
  afterEdit();
  toast(!st.k ? (ALPHA[c]+'列を ふつうの列に戻しました') :
        st.k==='ck' ? (ALPHA[c]+'列を ☑ チェック欄にしました'+(fixed?'（'+fixed+'個の 済・○ などを そろえました）':'')+'。押すたびに ☑⇄☐') :
        (ALPHA[c]+'列を えらぶだけの列にしました（'+st.opts.slice(0,3).join('／')+(st.opts.length>3?'…':'')+'）'), 3600);
  return !!was || true;
}
function kOk(){ if(kindApply()!==false) close(); }
/* ☑ の合計を、表のいちばん下の次の行に SUMIF の式で入れる */
function kSumPut(){
  kindKeep();
  const c=st.c, sc=st.sum;
  if(!(sc>=0)){ toast('合計する列がありません'); return; }
  const cur=(hpKinds()||{})[c];
  if(!cur || cur.k!=='ck' || cur.r1!==st.r1){ st.k='ck'; if(kindApply()===false) return; }
  let last=-1; for(let r=ROWS-1;r>=st.r1;r--) if(!hpRowBlank(r,-1)){ last=r; break; }
  if(last<st.r1){ toast('まだ行がありません'); return; }
  let tr=last+1;
  if(tr>=MAXROWS){ toast('これ以上 行を増やせません'); return; }
  const ref=(x)=>`${ALPHA[x]}${st.r1+1}:${ALPHA[x]}${last+1}`;
  pushSnapshot('☑ の合計を入れる');
  if(tr>=ROWS){ ROWS=tr+1; localStorage.setItem('excalc_rows',ROWS); if(typeof syncRowColLabels==='function') syncRowColLabels(); }
  data[tr][sc]=`=SUMIF(${ref(c)},1,${ref(sc)})`;
  const lc=(sc>0 && sc-1!==c && data[tr][sc-1]==='') ? sc-1 : (data[tr][c]==='' ? c : -1);
  if(lc>=0) data[tr][lc]='☑の合計';
  close();
  afterEdit();
  sel(tr, sc);
  toast(ALPHA[sc]+(tr+1)+' に ☑ の行だけの合計を入れました（☑ を付けたり外したりすると変わります）', 3800);
}

/* ───────── 🎨 条件で色 ───────── */
const CF_TYPES=[
  ['数', [['neg','マイナスのとき'],['gt','○○より大きい'],['ge','○○以上'],['lt','○○より小さい'],['le','○○以下'],['bt','○○から○○まで'],['eq','○○と同じ']]],
  ['字', [['has','○○を含む'],['blank','空のとき']]],
  ['日付', [['past','期限が過ぎた（今日より前）'],['today','今日'],['soon','今日から○日のうち']]],
  ['順位', [['top','大きいほうから○つ'],['bot','小さいほうから○つ'],['dup','同じものが ほかにもある']]],
  ['チェック', [['ck','☑ が付いている'],['unck','☐ （付いていない）']]],
];
const CF_LABEL={}; CF_TYPES.forEach(g=>g[1].forEach(([k,l])=>CF_LABEL[k]=l));
const FC_NAMES=[['','なし'],['red','赤'],['blue','青'],['green','緑'],['orange','橙'],['gray','灰']];
const BG_NAMES=[['','なし'],['yellow','黄'],['red','赤'],['green','緑'],['blue','青'],['orange','橙'],['gray','灰']];
function cfRuleText(ru){
  const rng=(ru.r2==null || ru.r2>=MAXROWS-1) ? ((ru.c1===ru.c2 ? ALPHA[ru.c1] : ALPHA[ru.c1]+'〜'+ALPHA[ru.c2])+'列の'+(ru.r1+1)+'行目から下') : `${ALPHA[ru.c1]}${ru.r1+1}:${ALPHA[ru.c2]}${ru.r2+1}`;
  let cond=CF_LABEL[ru.t]||'';
  const v=String(ru.v==null?'':ru.v), v2=String(ru.v2==null?'':ru.v2);
  cond=cond.replace('○○から○○まで', v+'から'+v2+'まで').replace('○○', '「'+v+'」').replace('○日', (ru.n||3)+'日').replace('○つ', (ru.n||3)+'つ');
  if(ru.row) cond=ALPHA[ru.kc]+'列が '+cond+' → 行ぜんぶ';
  return {rng, cond};
}
function cfStyleText(s){
  const a=[];
  if(s.fc) a.push((FC_NAMES.find(x=>x[0]===s.fc)||[])[1]+'い字'.replace('いい','い'));
  if(s.bg) a.push('背景 '+(BG_NAMES.find(x=>x[0]===s.bg)||[])[1]);
  if(s.b) a.push('太字');
  if(s.s) a.push('取り消し線');
  return a.join('・')||'見た目なし';
}
function swatchStyle(s){
  return (s.fc?`color:var(--hpf-${s.fc});`:'')+(s.bg?`background:var(--hpb-${s.bg});`:'')+(s.b?'font-weight:bold;':'')+(s.s?'text-decoration:line-through;':'');
}
function checkCols(){ const o=hpKinds()||{}; return Object.keys(o).map(Number).filter(x=>o[x] && o[x].k==='ck' && x<COLS); }
function cf(c){
  if(c==null || c<0) c=selC;
  st={c, mode:'list'};
  cfList();
}
function cfList(){
  const rules=hpRules()||[];
  const c=st.c;
  let html='<p class="hp-lead">決まりに合うセルに、自動で色が付きます（中身を直すと すぐ変わります）。上にある決まりほど強く効きます。</p>';
  if(rules.length){
    html+='<div class="hp-rules">'+rules.map((ru,i)=>{
      const t=cfRuleText(ru), s=hpStPick(ru.st)||{};
      return `<div class="hp-rule${ru.off?' off':''}"><span class="hp-sw" style="${swatchStyle(s)}">1,234</span>
        <div class="t">${esc(t.cond)}<small>${esc(t.rng)}・${esc(cfStyleText(s))}</small></div>
        <button type="button" onclick="HP.cfMove(${i},-1)" ${i?'':'disabled'} aria-label="上へ" title="上へ（強く）">↑</button>
        <button type="button" onclick="HP.cfEdit(${i})" aria-label="直す" title="直す">✎</button>
        <button type="button" onclick="HP.cfDel(${i})" aria-label="消す" title="消す">🗑</button></div>`;
    }).join('')+'</div>';
  }
  const hasCk=checkCols().length>0;
  const tpls=[
    ['neg','マイナスは赤い字', ALPHA[c]+'列'],
    ['past','期限が過ぎたら黄色', ALPHA[c]+'列の日付で 行ぜんぶ'],
    ['top','大きいほうから3つを太字', ALPHA[c]+'列'],
    ['ge','○○以上は 赤い背景', ALPHA[c]+'列'],
    hasCk ? ['ck','☑ の行を灰色に', '行ぜんぶ・取り消し線'] : ['dup','同じものが2つ以上', ALPHA[c]+'列・橙の背景'],
    ['custom','自分で決める…','どの決まりでも'],
  ];
  html+=`<div class="hp-sec">＋ 決まりを足す（${esc(ALPHA[c])}列「${esc(colName(c,headRowOfCol(c)))}」）</div><div class="hp-tpls">`+
    tpls.map(([k,t,s])=>`<button type="button" class="hp-tpl" onclick="HP.cfNew('${k}')"><b>${esc(t)}</b>${esc(s)}</button>`).join('')+'</div>';
  if(!rules.length) html+='<div class="hp-note">例：家計簿の「金額」列に「マイナスは赤い字」、やること表の「期限」列に「期限が過ぎたら黄色」、売上の列に「大きいほうから3つを太字」。</div>';
  html+=`<div class="hp-acts">${rules.length?'<button type="button" class="hp-b del left" onclick="HP.cfClearAll()">🗑 決まりを全部消す</button>':''}<button type="button" class="hp-b" onclick="HP.close()">とじる</button></div>`;
  show('cf','🎨 条件で色をつける', html);
}
/* 新しい決まりの たたき台 */
function cfNew(k){
  const c=st.c, h=headRowOfCol(c), rg=tableAround(c);
  const ru={r1:h+1, r2:MAXROWS-1, c1:c, c2:c, t:'neg', st:{fc:'red'}};
  if(k==='past'){
    let dc=c;
    if(!colIsDate(c)){ const d=findDateCol(rg); if(d>=0) dc=d; }
    Object.assign(ru,{t:'past', st:{bg:'yellow'}, row:1, kc:dc, c1:rg?rg.c1:c, c2:rg?rg.c2:c});
    const ck=checkCols(); if(ck.length) ru.nock=ck[0];
  }
  else if(k==='top') Object.assign(ru,{t:'top', n:3, st:{b:1}});
  else if(k==='ge') Object.assign(ru,{t:'ge', v:'', st:{bg:'red'}});
  else if(k==='dup') Object.assign(ru,{t:'dup', st:{bg:'orange'}});
  else if(k==='ck'){ const kc=checkCols()[0]; Object.assign(ru,{t:'ck', row:1, kc, c1:rg?rg.c1:0, c2:rg?rg.c2:COLS-1, st:{fc:'gray', s:1}}); }
  else if(k==='custom') Object.assign(ru,{t:'gt', v:'', st:{bg:'yellow'}});
  st.mode='edit'; st.idx=-1; st.ru=ru;
  st.where=(ru.row || ru.c1!==ru.c2) ? 'keep' : 'col';
  cfEditRender();
}
function colIsDate(c){ const rows=[]; for(let r=0;r<ROWS && rows.length<80;r++) if(filled(r,c)) rows.push(r); return colKind(c,rows)==='date'; }
function findDateCol(rg){ if(!rg) return -1; for(let x=rg.c1;x<=rg.c2;x++) if(colIsDate(x)) return x; return -1; }
function cfEdit(i){
  const ru=(hpRules()||[])[i]; if(!ru) return;
  st.mode='edit'; st.idx=i; st.ru=JSON.parse(JSON.stringify(ru)); st.where='keep';
  cfEditRender();
}
function cfEditRender(){
  const ru=st.ru, c=st.c, rg=tableAround(c);
  const g=(rangeR1>=0) ? selRect() : null, hasSel=!!(g && (g.r1!==g.r2 || g.c1!==g.c2));
  const h=headRowOfCol(c);
  const keepTxt=cfRuleText(ru).rng;
  const opts=[];
  if(st.where==='keep' || st.idx>=0) opts.push(['keep','いまの範囲（'+keepTxt+'）']);
  opts.push(['col', ALPHA[c]+'列（'+(h+2)+'行目から下ぜんぶ）']);
  if(hasSel) opts.push(['sel','えらんだ範囲 '+ALPHA[g.c1]+(g.r1+1)+':'+ALPHA[g.c2]+(g.r2+1)]);
  if(rg) opts.push(['tbl','表ぜんぶ（'+ALPHA[rg.c1]+'〜'+ALPHA[rg.c2]+'列の'+(headerOf(rg)+2)+'行目から下）']);
  const sel1=(k)=>k===st.where?' selected':'';
  const need=(ru.t==='gt'||ru.t==='ge'||ru.t==='lt'||ru.t==='le'||ru.t==='eq'||ru.t==='has'||ru.t==='bt');
  const needN=(ru.t==='top'||ru.t==='bot'||ru.t==='soon');
  const ckc=checkCols();
  let html=`<label class="hp-f">どこに<select id="hpCw" onchange="HP.cfWhere(this.value)">${opts.map(([k,l])=>`<option value="${k}"${sel1(k)}>${esc(l)}</option>`).join('')}</select></label>
  <label class="hp-inl"><input type="checkbox" id="hpCrow" ${ru.row?'checked':''} onchange="HP.cfRow(this.checked)"> 行ぜんぶに色をつける（${esc(ALPHA[ru.row?ru.kc:c])}列を見て、表の横いっぱい）</label>
  <label class="hp-f">決まり<select id="hpCt" onchange="HP.cfType(this.value)">${CF_TYPES.map(([g,list])=>`<optgroup label="${esc(g)}">${list.map(([k,l])=>`<option value="${k}"${k===ru.t?' selected':''}>${esc(l)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
  if(need){
    const isText=(ru.t==='has'||(ru.t==='eq' && isNaN(String(ru.v||'').replace(/,/g,'')) && ru.v!==''));
    html+=`<div class="${ru.t==='bt'?'hp-rng':''}"><label class="hp-f">${ru.t==='bt'?'いくつから':ru.t==='has'?'含む字':ru.t==='eq'?'同じもの（数か字）':'いくつ'}<input type="${isText||ru.t==='has'||ru.t==='eq'?'text':'text'}" id="hpCv" value="${esc(ru.v==null?'':ru.v)}" inputmode="${ru.t==='has'||ru.t==='eq'?'text':'decimal'}" autocomplete="off" oninput="HP.cfPrev()"></label>`
      +(ru.t==='bt'?`<label class="hp-f">いくつまで<input type="text" id="hpCv2" value="${esc(ru.v2==null?'':ru.v2)}" inputmode="decimal" autocomplete="off" oninput="HP.cfPrev()"></label>`:'')+`</div>`;
  }
  if(needN) html+=`<label class="hp-inl">${ru.t==='soon'?'今日から':'いくつ'} <input type="number" id="hpCn" min="1" max="999" value="${ru.n||3}" inputmode="numeric" oninput="HP.cfPrev()"> ${ru.t==='soon'?'日のうち':'つ'}</label>`;
  if(ru.t==='past'||ru.t==='today'||ru.t==='soon') html+='<div class="hp-note">日付として入れたセル（例 10/25・2026/10/25）を見ます。日がかわると自動で塗り直します。</div>';
  html+=`<div class="hp-sec">色・かざり</div>
  <div class="hp-colors"><span>文字</span>${FC_NAMES.map(([k,l])=>`<button type="button" class="hp-col${(ru.st.fc||'')===k?' on':''}" style="${k?`color:var(--hpf-${k})`:''}" onclick="HP.cfSt('fc','${k}')" aria-label="文字の色 ${l}">${k?'あ':'なし'}</button>`).join('')}</div>
  <div class="hp-colors"><span>背景</span>${BG_NAMES.map(([k,l])=>`<button type="button" class="hp-col${(ru.st.bg||'')===k?' on':''}" style="${k?`background:var(--hpb-${k})`:''}" onclick="HP.cfSt('bg','${k}')" aria-label="背景 ${l}">${k?'':'なし'}</button>`).join('')}</div>
  <div class="hp-chips" style="margin-top:8px"><button type="button" class="hp-chip${ru.st.b?' on':''}" onclick="HP.cfSt('b')">太字</button><button type="button" class="hp-chip${ru.st.s?' on':''}" onclick="HP.cfSt('s')">取り消し線</button></div>`;
  if(ckc.length && ru.t!=='ck' && ru.t!=='unck') html+=`<label class="hp-inl"><input type="checkbox" id="hpCnock" ${ru.nock!=null?'checked':''} onchange="HP.cfNock(this.checked)"> ☑ が付いた行には つけない（${esc(ALPHA[ru.nock!=null?ru.nock:ckc[0]])}列）</label>`;
  html+=`<div class="hp-prev">見本 <span class="hp-sw" id="hpCsw" style="${swatchStyle(ru.st)}">1,234</span><span id="hpCcnt"></span></div>
  <div class="hp-acts">${st.idx>=0?'<button type="button" class="hp-b del left" onclick="HP.cfDel('+st.idx+')">🗑 消す</button>':''}<button type="button" class="hp-b" onclick="HP.cfBack()">もどる</button><button type="button" class="hp-b pri" onclick="HP.cfSave()">決める</button></div>`;
  show('cf', st.idx>=0?'🎨 決まりを直す':'🎨 決まりを足す', html);
  cfPrev();
}
function cfKeep(){
  const ru=st.ru; if(!ru) return;
  const v=$('hpCv'); if(v) ru.v=v.value.trim();
  const v2=$('hpCv2'); if(v2) ru.v2=v2.value.trim();
  const n=$('hpCn'); if(n){ const x=parseInt(n.value,10); if(x>=1) ru.n=Math.min(999,x); }
}
/* 「どこに」の範囲を決まりに入れる */
function cfRange(ru){
  const c=st.c, h=headRowOfCol(c), rg=tableAround(c);
  if(st.where==='col'){ ru.r1=h+1; ru.r2=MAXROWS-1; if(ru.row){ ru.c1=rg?rg.c1:c; ru.c2=rg?rg.c2:c; } else { ru.c1=ru.c2=c; } }
  else if(st.where==='sel'){ const g=selRect(); ru.r1=g.r1; ru.r2=g.r2; ru.c1=g.c1; ru.c2=g.c2; }
  else if(st.where==='tbl' && rg){ ru.r1=headerOf(rg)+1; ru.r2=MAXROWS-1; ru.c1=rg.c1; ru.c2=rg.c2; }
  if(ru.row && (ru.kc==null || ru.kc<0)) ru.kc=c;
}
function cfWhere(w){ cfKeep(); st.where=w; cfRange(st.ru); cfEditRender(); }
function cfRow(on){ cfKeep(); const ru=st.ru; if(on){ ru.row=1; if(ru.kc==null||ru.kc<0) ru.kc=(ru.c1===ru.c2)?ru.c1:st.c; const rg=tableAround(st.c); if(rg && st.where!=='sel'){ ru.c1=Math.min(rg.c1,ru.kc); ru.c2=Math.max(rg.c2,ru.kc); } } else { delete ru.row; if(st.where!=='sel' && st.where!=='tbl'){ ru.c1=ru.c2=(ru.kc!=null?ru.kc:st.c); } delete ru.kc; } cfEditRender(); }
function cfType(t){ cfKeep(); st.ru.t=t; if((t==='ck'||t==='unck')){ const kc=checkCols()[0]; if(kc!=null){ st.ru.row=1; st.ru.kc=kc; const rg=tableAround(kc); if(rg){ st.ru.c1=rg.c1; st.ru.c2=rg.c2; } } delete st.ru.nock; } cfEditRender(); }
function cfSt(k,v){
  cfKeep();
  const s=st.ru.st=Object.assign({}, st.ru.st);
  if(k==='b'||k==='s'){ if(s[k]) delete s[k]; else s[k]=1; }
  else if(v) s[k]=v; else delete s[k];
  cfEditRender();
}
function cfNock(on){ cfKeep(); if(on) st.ru.nock=checkCols()[0]; else delete st.ru.nock; cfEditRender(); }
/* 見本と「いま何セルに付くか」 */
function cfPrev(){
  cfKeep();
  const ru=st.ru, cnt=$('hpCcnt'); if(!ru || !cnt) return;
  const sw=$('hpCsw'); if(sw) sw.setAttribute('style', swatchStyle(ru.st));
  if(!hpStPick(ru.st)){ cnt.textContent='色・かざりを えらんでください'; return; }
  const save=cellStyles._cf;
  let n=0;
  try{ cellStyles._cf=[ru]; n=hpCfCompute().size; } finally { if(save===undefined) delete cellStyles._cf; else cellStyles._cf=save; }
  cnt.textContent='いま '+n+' セルに付きます';
}
function cfSave(){
  cfKeep();
  const ru=st.ru;
  if(!hpStPick(ru.st)){ toast('色か かざり（太字など）を えらんでください'); return; }
  if(['gt','ge','lt','le','bt'].indexOf(ru.t)>=0){
    const ok=x=>x!=null && String(x).trim()!=='' && !isNaN(String(x).replace(/,/g,''));
    if(!ok(ru.v) || (ru.t==='bt' && !ok(ru.v2))){ toast('数を入れてください'); return; }
  }
  if((ru.t==='has'||ru.t==='eq') && String(ru.v||'').trim()===''){ toast('比べる字か数を入れてください'); return; }
  if((ru.t==='ck'||ru.t==='unck') && !(ru.kc>=0 || ru.c1>=0)){ toast('☑ チェック欄の列がありません'); return; }
  if(st.where!=='keep') cfRange(ru);
  const rules=(hpRules()||[]).slice();
  const clean=Object.assign({}, ru, {st:hpStPick(ru.st)});
  ['v','v2'].forEach(k=>{ if(clean[k]==='' || clean[k]==null) delete clean[k]; });
  if(!(['top','bot','soon'].indexOf(clean.t)>=0)) delete clean.n;
  pushSnapshot(st.idx>=0?'条件で色を直す':'条件で色を足す');
  if(st.idx>=0) rules[st.idx]=clean; else rules.unshift(clean);
  cellStyles._cf=rules;
  hpCfRefresh(); persistModes(); if(typeof saveSheets==='function') saveSheets();
  toast(st.idx>=0?'決まりを直しました':'決まりを足しました（'+hpCfMap.size+'セルに色が付いています）');
  st.mode='list'; cfList();
}
function cfBack(){ st.mode='list'; cfList(); }
function cfMove(i,d){
  const rules=(hpRules()||[]).slice(), j=i+d; if(j<0||j>=rules.length) return;
  pushSnapshot('条件で色の順番');
  const t=rules[i]; rules[i]=rules[j]; rules[j]=t;
  cellStyles._cf=rules; hpCfRefresh(); persistModes(); cfList();
}
function cfDel(i){
  const rules=(hpRules()||[]).slice(); if(!rules[i]) return;
  pushSnapshot('条件で色を消す');
  rules.splice(i,1);
  if(rules.length) cellStyles._cf=rules; else delete cellStyles._cf;
  hpCfRefresh(); persistModes(); if(typeof saveSheets==='function') saveSheets();
  toast('決まりを消しました（↶戻る で元に戻せます）');
  st.mode='list'; cfList();
}
async function cfClearAll(){
  if(!await appConfirm('このシートの「条件で色」の決まりを全部消しますか？（↶戻る で元に戻せます）','全部消す','やめる')) return;
  pushSnapshot('条件で色を全部消す');
  delete cellStyles._cf;
  hpCfRefresh(); persistModes(); if(typeof saveSheets==='function') saveSheets();
  cfList();
}

/* ───────── 🔎 しぼり込み・並べかえ ───────── */
function guessHeader(c){
  const f=hpFlt(); if(f) return f.h==null?0:f.h|0;
  const rg=tableAround(c);
  return rg ? headerOf(rg) : 0;
}
/* しぼり込みを始める。いちばん下が =SUM(範囲) だけの合計の行なら、しぼった分の合計（SUBTOTAL）にする */
function fltStart(c){
  const h=guessHeader(c);
  cellStyles._flt={h, cond:{}, hid:[]};
  const g=hpFltRegion(hpFlt());
  const ents=[], MAP={SUM:9, AVERAGE:1, AVG:1, COUNT:2, MAX:4, MIN:5};
  if(g.tot>=0){
    let last=g.tot; for(let r=ROWS-1;r>g.tot;r--) if(!hpRowBlank(r,-1)){ last=r; break; }
    for(let r=g.tot;r<=last;r++) for(let x=0;x<COLS;x++){
      const v=String(data[r][x]==null?'':data[r][x]);
      const m=/^=\s*(SUM|AVERAGE|AVG|COUNT|MAX|MIN)\s*\(\s*([A-Za-z]{1,2})\$?(\d+)\s*:\s*\$?([A-Za-z]{1,2})\$?(\d+)\s*\)\s*$/i.exec(v);
      if(!m || isLockedCell(r,x)) continue;
      const a=+m[3]-1, b=+m[5]-1;
      if(Math.min(a,b)<h+1-1 || Math.max(a,b)>=g.tot) continue;   // しぼる行の中を足している式だけ
      ents.push({r, c:x, val:v, nv:`=SUBTOTAL(${MAP[m[1].toUpperCase()]},${m[2].toUpperCase()}${m[3]}:${m[4].toUpperCase()}${m[5]})`});
    }
  }
  if(ents.length){
    pushHistory(ents.map(e=>({r:e.r, c:e.c, val:e.val})), 'しぼった分の合計にする');
    ents.forEach(e=>{ data[e.r][e.c]=e.nv; });
  }
  hpAfterBuild(); recalcAll();
  persistModes(); if(typeof saveSheets==='function') saveSheets();
  return ents;
}
function filter(c){
  if(c==null || c<0) c=selC;
  let note='';
  if(!hpFlt()){
    const ents=fltStart(c);
    if(ents.length) note=ents.map(e=>ALPHA[e.c]+(e.r+1)).join('・')+' の合計を、しぼった分だけの合計（SUBTOTAL）にしました。';
    else toast('しぼり込みを始めました。列の見出しの ▾ で条件をえらべます');
  }
  st={c, tab:'v', note, q:''};
  const f=hpFlt(), cd=(f.cond||{})[c];
  if(cd){ if(cd.lo!=null||cd.hi!=null) st.tab='n'; else if(cd.q) st.tab='q'; }
  fltRender();
}
function fltData(){
  const f=hpFlt(), c=st.c, g=hpFltRegion(f);
  const rows=[]; for(let r=g.r1;r<=g.r2;r++) rows.push(r);
  const map=new Map();
  let nNum=0, nDate=0, nTxt=0;
  rows.forEach(r=>{
    const t=txt(r,c); map.set(t,(map.get(t)||0)+1);
    const x=hpCellVal(r,c); if(x.e) return; if(x.d!=null) nDate++; else if(x.n!=null) nNum++; else nTxt++;
  });
  const isNum=(nNum+nDate)>0 && (nNum+nDate)>=nTxt, isDate=nDate>0 && nDate>=nNum;
  const vals=[...map.entries()].map(([k,n])=>({k,n}));
  const numOf=k=>{ const s=String(k).replace(/,/g,''); return (s!=='' && !isNaN(s)) ? Number(s) : null; };
  vals.sort((a,b)=>{
    if(a.k==='' || b.k==='') return a.k==='' ? 1 : -1;
    const na=numOf(a.k), nb=numOf(b.k);
    if(na!=null && nb!=null) return na-nb;
    if(na!=null || nb!=null) return na!=null ? -1 : 1;
    return a.k.localeCompare(b.k,'ja');
  });
  return {f, g, rows, vals, isNum, isDate};
}
const serialToIso=s=>{ if(s==null) return ''; const d=serialToYMD(s); return d ? `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}` : ''; };
function fltRender(){
  const c=st.c, D=fltData(), f=D.f, cd=(f.cond||{})[c]||null;
  st.vals=D.vals; st.isDate=D.isDate;
  const h=f.h==null?0:f.h|0;
  const nm=colName(c,h);
  let html=st.note?`<div class="hp-note">${esc(st.note)}</div>`:'';
  html+=`<div class="hp-sec">並べかえ（${esc(ALPHA[c])}列「${esc(nm)}」で）</div>
  <div class="hp-row"><button type="button" class="hp-b" onclick="HP.sortBy(${c},false)">↑ ${D.isNum?'小さい順':'あいうえお順'}</button><button type="button" class="hp-b" onclick="HP.sortBy(${c},true)">↓ ${D.isNum?'大きい順':'逆の順'}</button></div>`;
  html+=`<div class="hp-tabs" role="tablist"><button type="button" class="hp-tab${st.tab==='v'?' on':''}" onclick="HP.fTab('v')">えらぶ</button>`
    +(D.isNum?`<button type="button" class="hp-tab${st.tab==='n'?' on':''}" onclick="HP.fTab('n')">${D.isDate?'日付で':'数で'}</button>`:'')
    +`<button type="button" class="hp-tab${st.tab==='q'?' on':''}" onclick="HP.fTab('q')">字で</button></div>`;
  if(st.tab==='v'){
    const sel=cd && Array.isArray(cd.v) ? new Set(cd.v) : null;
    if(D.vals.length>10) html+=`<label class="hp-f"><input type="text" id="hpFq" placeholder="さがす（例 スーパー）" autocomplete="off" oninput="HP.fFind(this.value)" value="${esc(st.q||'')}"></label>`;
    html+=`<div class="hp-vals" id="hpFv"><label class="hp-v all"><input type="checkbox" id="hpFall" ${!sel?'checked':''} onchange="HP.fAll(this.checked)"><span>（すべて）</span><small>${D.rows.length}</small></label>`
      +D.vals.map((v,i)=>`<label class="hp-v" data-k="${esc(v.k.toLowerCase())}"><input type="checkbox" data-i="${i}" ${(!sel||sel.has(v.k))?'checked':''} onchange="HP.fOne()"><span>${v.k===''?'（空）':esc(v.k)}</span><small>${v.n}</small></label>`).join('')+'</div>';
  } else if(st.tab==='n'){
    const lo=cd&&cd.lo!=null?cd.lo:'', hi=cd&&cd.hi!=null?cd.hi:'';
    if(D.isDate) html+=`<div class="hp-rng"><label class="hp-f">いつから<input type="date" id="hpFlo" value="${esc(serialToIso(lo===''?null:lo))}"></label><label class="hp-f">いつまで<input type="date" id="hpFhi" value="${esc(serialToIso(hi===''?null:hi))}"></label></div><div class="hp-note">片方だけでもかまいません（「いつから」だけ＝その日から あと全部）。</div>`;
    else html+=`<div class="hp-rng"><label class="hp-f">いくつ以上<input type="text" id="hpFlo" value="${esc(lo)}" inputmode="decimal" placeholder="例 10000" autocomplete="off"></label><label class="hp-f">いくつ以下<input type="text" id="hpFhi" value="${esc(hi)}" inputmode="decimal" placeholder="なくても よい" autocomplete="off"></label></div><div class="hp-note">「1万円以上だけ」なら いくつ以上に 10000。1万・1.2万 のようにも書けます。</div>`;
  } else {
    html+=`<label class="hp-f">この字を含む行だけ<input type="text" id="hpFt" value="${esc(cd&&cd.q?cd.q:'')}" placeholder="例 スーパー" autocomplete="off"></label>`;
  }
  const g=D.g;
  const notes=[];
  if(h>=0) notes.push((h+1)+'行目は見出し（いつも出します）');
  if(g.tot>=0) notes.push((g.tot+1)+'行目から下は 合計の行（いつも出します）');
  if(notes.length) html+=`<div class="hp-ch-note">${esc(notes.join('・'))}</div>`;
  html+=`<div class="hp-acts"><button type="button" class="hp-b del left" onclick="HP.fOff()">✕ しぼり込みをやめる</button>${cd?'<button type="button" class="hp-b" onclick="HP.fClear()">この列の条件を消す</button>':''}<button type="button" class="hp-b pri" onclick="HP.fOk()">しぼる</button></div>`;
  show('filter','🔎 しぼり込み・並べかえ', html);
}
function fTab(t){ st.tab=t; fltRender(); }
function fAll(on){ document.querySelectorAll('#hpFv input[data-i]').forEach(x=>{ if(x.closest('.hp-v').style.display!=='none') x.checked=on; }); }
function fOne(){ const all=[...document.querySelectorAll('#hpFv input[data-i]')]; const a=$('hpFall'); if(a) a.checked=all.every(x=>x.checked); }
function fFind(q){
  st.q=q; const s=String(q||'').trim().toLowerCase();
  document.querySelectorAll('#hpFv .hp-v[data-k]').forEach(el=>{ el.style.display=(!s || el.dataset.k.indexOf(s)>=0)?'':'none'; });
}
function fNum(s){
  const t=String(s==null?'':s).trim(); if(!t) return null;
  const n=(typeof toolNum==='function') ? toolNum(t) : Number(t.replace(/,/g,''));
  return isFinite(n) ? n : NaN;
}
function fOk(){
  const f=hpFlt(); if(!f){ close(); return; }
  const c=st.c;
  let cd=null;
  if(st.tab==='v'){
    const boxes=[...document.querySelectorAll('#hpFv input[data-i]')];
    const finding=!!String(st.q||'').trim();   // さがしているときは、見えているものだけ（Excel と同じ）
    const on=boxes.filter(x=>x.checked && (!finding || x.closest('.hp-v').style.display!=='none')).map(x=>st.vals[+x.dataset.i].k);
    if(!on.length){ toast('1つ以上 えらんでください'); return; }
    if(on.length<boxes.length) cd={v:on};
  } else if(st.tab==='n'){
    const a=$('hpFlo'), b=$('hpFhi');
    let lo, hi;
    if(st.isDate){
      const p=v=>{ if(!v) return null; const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v); return m ? mkSerial(+m[1],+m[2],+m[3]) : null; };
      lo=p(a&&a.value); hi=p(b&&b.value);
    } else { lo=fNum(a&&a.value); hi=fNum(b&&b.value); }
    if(Number.isNaN(lo) || Number.isNaN(hi)){ toast('数を入れてください'); return; }
    if(lo!=null && hi!=null && lo>hi){ const t=lo; lo=hi; hi=t; }
    if(lo!=null || hi!=null){ cd={}; if(lo!=null) cd.lo=lo; if(hi!=null) cd.hi=hi; if(st.isDate) cd.dt=1; }
  } else {
    const q=($('hpFt')&&$('hpFt').value||'').trim().slice(0,40);
    if(q) cd={q};
  }
  const cond=Object.assign({}, f.cond||{});
  if(cd) cond[c]=cd; else delete cond[c];
  cellStyles._flt=Object.assign({}, f, {cond});
  hpFltApply();
  close();
  fltToast();
}
function fltToast(){
  const f=hpFlt(); if(!f) return;
  const g=hpFltRegion(f), all=g.r2-g.r1+1, hid=(f.hid||[]).length;
  toast(hid ? ('しぼり込みました：'+all+'行のうち '+(all-hid)+'行を出しています（右上の合計も この分だけ）') : '全部の行を出しています', 3600);
}
function fClear(){
  const f=hpFlt(); if(!f) return;
  const cond=Object.assign({}, f.cond||{}); delete cond[st.c];
  cellStyles._flt=Object.assign({}, f, {cond});
  hpFltApply(); close(); fltToast();
}
function fOff(){ close(); hpFltOff(); }
/* 「○○」だけを出す */
function quick(r,c){
  if(!hpFlt()) fltStart(c);
  const f=hpFlt(), h=f.h==null?0:f.h|0;
  if(r<=h){ toast('見出しより下のセルで使えます'); return; }
  const v=txt(r,c);
  cellStyles._flt=Object.assign({}, f, {cond:Object.assign({}, f.cond||{}, {[c]:{v:[v]}})});
  hpFltApply();
  fltToast();
}
/* 並べかえ：見出しの下から 合計の行の上までを、この列の値で。数 → 字 の順、空はいつも下。↶戻る で元に戻せる */
function sortBy(c, desc){
  let f=hpFlt();
  const h=f ? (f.h==null?0:f.h|0) : guessHeader(c);
  const g=hpFltRegion(f||{h});
  if(g.r2<=g.r1){ toast('並べかえる行がありません'); return; }
  for(let r=g.r1;r<=g.r2;r++) for(let x=0;x<COLS;x++){ const s=cellStyles[r+','+x]; if(s && (s.merge||s.cover)){ toast('結合したセルがあるので並べかえられません（結合を外してから）'); return; } }
  const rows=[]; for(let r=g.r1;r<=g.r2;r++){ const x=hpCellVal(r,c); rows.push({r, n:x.n, s:x.e?'':txt(r,c), e:x.e}); }
  const cmp=(a,b)=>{
    if(a.e || b.e) return a.e===b.e ? a.r-b.r : (a.e?1:-1);   // 空はいつも下
    let k;
    if(a.n!=null && b.n!=null) k=a.n-b.n;
    else if(a.n!=null || b.n!=null) k=a.n!=null ? -1 : 1;
    else k=a.s.localeCompare(b.s,'ja');
    if(desc) k=-k;
    return k || (a.r-b.r);
  };
  const sorted=rows.slice().sort(cmp);
  if(sorted.every((x,i)=>x.r===rows[i].r)){ close(); toast('もう その順に並んでいます'); return; }
  pushSnapshot('並べかえ');
  const oldData=rows.map(x=>data[x.r].slice());
  const oldSt={}, oldH={};
  rows.forEach(x=>{ for(let cc=0;cc<MAXCOLS;cc++){ const k=x.r+','+cc; if(cellStyles[k]){ oldSt[k]=cellStyles[k]; delete cellStyles[k]; } } if(rowHeights[x.r]!=null){ oldH[x.r]=rowHeights[x.r]; delete rowHeights[x.r]; } });
  const to={};   // もとの行 → 新しい行
  sorted.forEach((x,i)=>{
    const nr=g.r1+i, src=oldData[x.r-g.r1];
    to[x.r]=nr;
    data[nr]=src.map(v=>(typeof v==='string' && v.startsWith('=')) ? adjustFormula(v, nr-x.r, 0) : v);
    for(let cc=0;cc<MAXCOLS;cc++){ const s=oldSt[x.r+','+cc]; if(s) cellStyles[nr+','+cc]=s; }
    if(oldH[x.r]!=null) rowHeights[nr]=oldH[x.r];
  });
  f=hpFlt();
  if(f && Array.isArray(f.hid)) cellStyles._flt=Object.assign({}, f, {hid:f.hid.map(r=>to[r]!=null?to[r]:r).sort((a,b)=>a-b)});
  close();
  afterEdit();
  if(typeof saveSheetSizes==='function') saveSheetSizes();
  toast(ALPHA[c]+'列の'+(desc?'大きい':'小さい')+'順に並べかえました（↶戻る で元に戻せます）', 3200);
}

/* ───────── 📑 項目ごとの合計 ───────── */
function pivot(c){
  if(c==null || c<0) c=selC;
  const rg=tableAround(c);
  if(!rg){ toast('表が見つかりません。表の中のセルを えらんでから 使ってください'); return; }
  const h=headerOf(rg), rows=dataRows(rg,h);
  const kinds={};
  for(let x=rg.c1;x<=rg.c2;x++) kinds[x]=colKind(x,rows);
  const cats=Object.keys(kinds).map(Number).filter(x=>kinds[x]==='text'||kinds[x]==='date');
  const nums=Object.keys(kinds).map(Number).filter(x=>kinds[x]==='num');
  if(!cats.length || !nums.length){ toast('項目（字）の列と、数の列がある表で使えます'); return; }
  st={rg, h, rows, cats, nums, cat:cats.indexOf(c)>=0?c:cats[0], vals:(nums.indexOf(c)>=0?[c]:nums.slice(0,3)), fn:'sum', order:'desc', pct:false, out:null};
  pivotRender();
}
function pivotCalc(){
  const groups=new Map();
  st.rows.forEach(r=>{
    if(hpRowBlank(r,-1)) return;
    const k=txt(r,st.cat);
    let g=groups.get(k); if(!g){ g={k, n:0, s:st.vals.map(()=>0), c:st.vals.map(()=>0), first:r}; groups.set(k,g); }
    g.n++;
    st.vals.forEach((x,i)=>{ const v=hpCellVal(r,x).n; if(v!=null){ g.s[i]+=v; g.c[i]++; } });
  });
  let list=[...groups.values()];
  const val=(g,i)=>st.fn==='cnt' ? g.n : st.fn==='avg' ? (g.c[i]?g.s[i]/g.c[i]:null) : g.s[i];
  if(st.order==='desc') list.sort((a,b)=>(val(b,0)||0)-(val(a,0)||0) || a.first-b.first);
  else if(st.order==='abc') list.sort((a,b)=>a.k===''?1:b.k===''?-1:a.k.localeCompare(b.k,'ja'));
  else list.sort((a,b)=>a.first-b.first);
  return {list, val};
}
const FN_L={sum:'合計', cnt:'件数', avg:'平均'};
function pivotHeads(){
  const h=st.h;
  if(st.fn==='cnt') return ['件数'];
  return st.vals.map(x=>colName(x,h)+'の'+FN_L[st.fn]);
}
function pivotRender(){
  const {list, val}=pivotCalc();
  st.out=list;
  const h=st.h, heads=pivotHeads();
  const nCols=st.fn==='cnt' ? 1 : st.vals.length;
  const tot=[]; for(let i=0;i<nCols;i++) tot.push(list.reduce((a,g)=>a+(val(g,i)||0),0));
  const showPct=st.pct && st.fn!=='avg' && nCols===1;
  let html=`<label class="hp-f">項目の列（まとめる もと）<select onchange="HP.pv('cat',+this.value)">${st.cats.map(x=>`<option value="${x}"${x===st.cat?' selected':''}>${esc(ALPHA[x]+'列 '+colName(x,h))}</option>`).join('')}</select></label>`;
  html+=`<div class="hp-sec">計算</div><div class="hp-chips">${['sum','cnt','avg'].map(k=>`<button type="button" class="hp-chip${st.fn===k?' on':''}" onclick="HP.pv('fn','${k}')">${FN_L[k]}</button>`).join('')}</div>`;
  if(st.fn!=='cnt') html+=`<div class="hp-sec">${FN_L[st.fn]}を出す列</div><div class="hp-chips">${st.nums.map(x=>`<button type="button" class="hp-chip${st.vals.indexOf(x)>=0?' on':''}" onclick="HP.pv('val',${x})">${esc(colName(x,h))}</button>`).join('')}</div>`;
  html+=`<div class="hp-sec">並び</div><div class="hp-chips">${[['desc','多い順'],['first','出てきた順'],['abc','あいうえお順']].map(([k,l])=>`<button type="button" class="hp-chip${st.order===k?' on':''}" onclick="HP.pv('order','${k}')">${l}</button>`).join('')}`
    +(st.fn!=='avg' && nCols===1 ? `<button type="button" class="hp-chip${st.pct?' on':''}" onclick="HP.pv('pct')">割合％も出す</button>` : '')+'</div>';
  html+=`<div class="hp-tblwrap"><table class="hp-tbl"><thead><tr><th>${esc(colName(st.cat,h))}</th>${heads.map(x=>`<th>${esc(x)}</th>`).join('')}${showPct?'<th>割合％</th>':''}</tr></thead><tbody>`
    +list.map(g=>`<tr><td>${g.k===''?'（空）':esc(g.k)}</td>${heads.map((_,i)=>`<td class="n">${nf(val(g,i))}</td>`).join('')}${showPct?`<td class="n">${tot[0]?nf(Math.round(val(g,0)/tot[0]*1000)/10):'0'}</td>`:''}</tr>`).join('')
    +(st.fn!=='avg'?`<tr class="sum"><td>合計</td>${tot.map(v=>`<td class="n">${nf(v)}</td>`).join('')}${showPct?'<td class="n">100</td>':''}</tr>`:'')
    +'</tbody></table></div>';
  html+=`<div class="hp-ch-note">${list.length}項目・${st.rows.length}行から（${esc(ALPHA[st.rg.c1]+(st.rows[0]+1)+':'+ALPHA[st.rg.c2]+(st.rows[st.rows.length-1]+1))}）。合計の行は入れていません。</div>`;
  html+=`<div class="hp-acts"><button type="button" class="hp-b left" onclick="HP.pvCopy()">📋 コピー</button><button type="button" class="hp-b" onclick="HP.pvChart()">📊 グラフで見る</button><button type="button" class="hp-b pri" onclick="HP.pvMake()">📑 新しいシートに作る</button></div>
  <div class="hp-note">新しいシートには <b>SUMIF</b> などの式で入れるので、もとの表を直すと まとめ表の合計も自動で変わります（項目がふえたときは もう一度作ってください）。</div>`;
  show('pivot','📑 項目ごとの合計', html);
}
function pv(k,v){
  if(k==='cat') st.cat=v;
  else if(k==='fn') st.fn=v;
  else if(k==='order') st.order=v;
  else if(k==='pct') st.pct=!st.pct;
  else if(k==='val'){ const i=st.vals.indexOf(v); if(i>=0){ if(st.vals.length>1) st.vals.splice(i,1); } else if(st.vals.length<6) st.vals.push(v); st.vals.sort((a,b)=>a-b); }
  pivotRender();
}
function pivotRows(){
  const {list, val}=pivotCalc(), h=st.h, heads=pivotHeads();
  const nCols=st.fn==='cnt' ? 1 : st.vals.length;
  const out=[[colName(st.cat,h), ...heads]];
  list.forEach(g=>out.push([g.k===''?'（空）':g.k, ...heads.map((_,i)=>{ const v=val(g,i); return v==null?'':String(parseFloat(v.toFixed(6))); })]));
  if(st.fn!=='avg'){ const t=[]; for(let i=0;i<nCols;i++) t.push(String(parseFloat(list.reduce((a,g)=>a+(val(g,i)||0),0).toFixed(6)))); out.push(['合計', ...t]); }
  return out;
}
function pvCopy(){ toolCopyText(pivotRows().map(r=>r.join('\t')).join('\n'), '表をコピーしました（Excel・メモに貼れます）'); }
function pvChart(){
  const rows=pivotRows(), body=rows.slice(1, st.fn!=='avg' ? -1 : undefined);
  const model={cats:body.map(r=>r[0]), series:rows[0].slice(1).map((nm,i)=>({name:nm, vals:body.map(r=>r[i+1]===''?null:Number(r[i+1]))})), title:colName(st.cat,st.h)+'ごとの'+FN_L[st.fn], fromPivot:true};
  chartOpen(model, (st.fn==='sum' && model.series.length===1 && model.cats.length<=6) ? 'pie' : 'bar');
}
/* 新しいシートに、SUMIF・COUNTIF・AVERAGEIF の式で作る */
function pvMake(){
  if(typeof sheets==='undefined' || !Array.isArray(sheets)){ toast('シートを作れませんでした'); return; }
  if(sheets.length>=30){ toast('シートがいっぱいです（最大30）。📋 コピー で貼ってください'); return; }
  const src=sheets[curSheet] ? sheets[curSheet].name : 'シート1';
  const literal=src.indexOf("'")>=0;   // ' の入った名前は式で指せないので、そのときは値で入れる
  const {list, val}=pivotCalc(), h=st.h, heads=pivotHeads();
  const r1=st.rows[0]+1, r2=st.rows[st.rows.length-1]+1;
  const pre=`'${src}'!`;
  const rng=x=>`${pre}${ALPHA[x]}${r1}:${ALPHA[x]}${r2}`;
  const catName=colName(st.cat,h);
  const nCols=st.fn==='cnt' ? 1 : st.vals.length;
  const showPct=st.pct && st.fn!=='avg' && nCols===1;
  const grid=[[catName, ...heads, ...(showPct?['割合％']:[])]];
  const n=list.length, totR=n+2;   // 合計の行（1から数えた番号）
  list.forEach((g,i)=>{
    const rr=i+2, crit=g.k==='' ? '""' : `A${rr}`;
    const row=[g.k===''?'（空）':g.k];
    for(let j=0;j<nCols;j++){
      if(literal){ const v=val(g,j); row.push(v==null?'':String(parseFloat(v.toFixed(6)))); continue; }
      if(st.fn==='cnt') row.push(`=COUNTIF(${rng(st.cat)},${crit})`);
      else if(st.fn==='avg') row.push(`=AVERAGEIF(${rng(st.cat)},${crit},${rng(st.vals[j])})`);
      else row.push(`=SUMIF(${rng(st.cat)},${crit},${rng(st.vals[j])})`);
    }
    if(showPct) row.push(`=IF(B${totR}=0,0,ROUND(B${rr}/B${totR}*100,1))`);
    grid.push(row);
  });
  if(st.fn!=='avg'){
    const t=['合計']; for(let j=0;j<nCols;j++){ const L=ALPHA[1+j]; t.push(`=SUM(${L}2:${L}${n+1})`); }
    if(showPct) t.push('100');
    grid.push(t);
  }
  const names=new Set(sheets.map(s=>s.name));
  let name=('まとめ（'+catName+'）').slice(0,20), k=2;
  while(names.has(name)){ name=('まとめ（'+catName+'）').slice(0,17)+k; k++; }
  Object.assign(sheets[curSheet], captureCurrentSheet());   // 今のシートを退避
  const sh=freshSheet(name);
  const ms=sh.store.states.normal;
  grid.forEach((row,i)=>row.forEach((v,j)=>{ ms.data[i][j]=v; }));
  ms.cols=Math.max(2, grid[0].length);
  sh.store.rows=Math.max(grid.length+1, 5);
  const sty={};
  grid[0].forEach((_,j)=>{ sty['0,'+j]={bold:true, bg:'#e6e6e6'}; });
  if(st.fn!=='avg') grid[0].forEach((_,j)=>{ sty[(grid.length-1)+','+j]={bold:true}; });
  ms.styles=sty;
  sh.colWidths={0:110};
  sheets.push(sh);
  curSheet=sheets.length-1;
  loadSheetStore(sh);
  applyActiveSheet();
  saveSheets();
  close();
  toast('「'+name+'」シートを作りました。'+(literal?'（もとのシート名に \' があるので、数で入れました）':'もとの表を直すと、ここの合計も変わります'), 4200);
}

/* ───────── 📊 グラフ ───────── */
const PAL_L=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#4a3aa7','#e34948'];
const PAL_D=['#3987e5','#d95926','#199e70','#c98500','#d55181','#008300','#9085e9','#e66767'];
const INK_L={surface:'#ffffff', primary:'#0b0b0b', secondary:'#52514e', muted:'#7a7873', grid:'#e1e0d9', base:'#b9b8ae', hover:'rgba(11,11,11,.06)'};
const INK_D={surface:'#1e2a45', primary:'#ffffff', secondary:'#c3c2b7', muted:'#a3abbe', grid:'#2f3c5a', base:'#56627e', hover:'rgba(255,255,255,.07)'};
const FONT='system-ui,-apple-system,"Hiragino Sans","Noto Sans JP","Yu Gothic UI","Meiryo","Segoe UI",sans-serif';
const MAX_CATS=100, MAX_SER=8;
/* 文字のだいたいの幅（SVG に置く前に はみ出さないかを見る） */
function tw(s, size){ let w=0; for(const ch of String(s)){ const cp=ch.codePointAt(0); w+= cp>0x2E7F ? size : (cp>=48&&cp<=57) ? size*0.6 : size*0.58; } return w; }
function cut(s, size, max){ s=String(s); if(tw(s,size)<=max) return s; let o=''; for(const ch of s){ if(tw(o+ch+'…',size)>max) break; o+=ch; } return o+'…'; }
/* 目盛り：0・1万・2万 のように切りのよい数 */
function niceTicks(lo, hi, n){
  if(lo===hi){ hi=lo+1; lo=lo-1; }
  const span=hi-lo, raw=span/Math.max(1,n), p=Math.pow(10, Math.floor(Math.log10(raw))), f=raw/p;
  const step=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p;
  const a=Math.floor(lo/step)*step, b=Math.ceil(hi/step)*step, out=[];
  for(let v=a; v<=b+step*0.001; v+=step) out.push(parseFloat(v.toFixed(10)));
  return out;
}
function axisLabel(v){
  const a=Math.abs(v);
  if(a>=1e8) return parseFloat((v/1e8).toFixed(a>=1e9?0:1))+'億';
  if(a>=1e4) return parseFloat((v/1e4).toFixed(a>=1e5?0:1))+'万';
  return withCommas(String(parseFloat(v.toFixed(2))));
}
/* 表から グラフのもとを取り出す：{rg, h, rows, lcs:項目にできる列, scs:数の列, notes, at} */
function chartSource(c, onlyCol, useSel){
  let rg=null, bySel=false;
  if(useSel && rangeR1>=0){ const g=selRect(); if(g.r1!==g.r2 || g.c1!==g.c2){ rg=g; bySel=true; } }
  if(!rg) rg=tableAround(c);
  if(!rg) return null;
  const h=headerOf(rg), notes=[];
  let rows=[]; for(let r=Math.max(rg.r1,h+1); r<=rg.r2; r++){ if(hpHidRow(r)) continue; rows.push(r); }
  const before=rows.length; while(rows.length>1 && hpIsTotalRow(rows[rows.length-1])) rows.pop();
  if(rows.length<before) notes.push('いちばん下の合計の行は 入れていません');
  if(hpHidSet()) notes.push('しぼり込みで隠した行は 入れていません');
  const lcs=[], scs=[];
  for(let x=rg.c1;x<=rg.c2;x++){ const k=colKind(x,rows); if(k==='text'||k==='date') lcs.push(x); else if(k==='num') scs.push(x); }
  const src={rg, h, rows, lcs, scs, notes, bySel, at:ALPHA[rg.c1]+(rg.r1+1)+':'+ALPHA[rg.c2]+(rg.r2+1)};
  // はじめに出す列：えらんだ範囲なら全部。そうでなければ 大きさが近い列だけ（ちがいすぎる列は ぺちゃんこになるので外す）
  let on;
  if(onlyCol!=null && scs.indexOf(onlyCol)>=0) on=[onlyCol];
  else if(bySel) on=scs.slice(0,MAX_SER);
  else {
    const mx=x=>Math.max(0,...rows.map(r=>Math.abs(hpCellVal(r,x).n||0)));
    const base=scs.indexOf(c)>=0 ? c : scs[0];
    const bm=base!=null ? mx(base) : 0;
    on=scs.filter(x=>{ if(x===base) return true; const m=mx(x); return bm>0 && m>0 && m/bm<=10 && bm/m<=10; }).slice(0,MAX_SER);
    if(on.length<scs.length) src.hint='大きさがちがう列は 外しています（下のボタンで足せます）';
  }
  src.on=on;
  src.lc=lcs.length ? lcs[0] : -1;
  return src;
}
/* 日付の見出しは、同じ年なら 10/1 のように短く */
function catLabel(src, r, lc){
  if(lc<0) return (r+1)+'行目';
  const x=hpCellVal(r,lc);
  if(x.d!=null && src.sameYear){ const d=serialToYMD(x.d); return d.m+'/'+d.d; }
  return txt(r,lc)||'（空）';
}
/* もとと えらんだ列から {cats, series} を作る */
function chartBuild(src, lc, on){
  const notes=src.notes.slice();
  let rows=src.rows.filter(r=>on.some(x=>hpCellVal(r,x).n!=null));
  if(rows.length>MAX_CATS){ notes.push('はじめの '+MAX_CATS+'行だけです'); rows=rows.slice(0,MAX_CATS); }
  const ys=new Set(); let allDate=lc>=0;
  rows.forEach(r=>{ const x=lc>=0?hpCellVal(r,lc):null; if(x && x.d!=null) ys.add(serialToYMD(x.d).y); else allDate=false; });
  src.sameYear=allDate && ys.size===1;
  const cats=rows.map(r=>catLabel(src,r,lc));
  const series=on.map(x=>({name:(src.h>=0 ? txt(src.h,x) : '')||(ALPHA[x]+'列'), vals:rows.map(r=>hpCellVal(r,x).n), col:x}));
  return {cats, series, notes, at:src.at, dateLabels:allDate};
}
function flipModel(m){
  return {cats:m.series.map(s=>s.name), series:m.cats.slice(0,MAX_SER).map((nm,i)=>({name:nm, vals:m.series.map(s=>s.vals[i])})), notes:m.notes, at:m.at};
}
function chart(c){
  const fromCol=(c!=null && c>=0 && view!=='menu');   // 列の見出しの長押しから：その列だけ（数の列のとき）
  const cc=(c==null||c<0)?selC:c;
  if(fromCol){   // 字の列（費目など）なら、同じものごとの合計のグラフ
    const m=catChart(cc);
    if(m){ chartOpen(m, (m.cats.length<=6 && m.series[0].vals.every(v=>v>0)) ? 'pie' : 'bar'); return; }
  }
  const src=chartSource(cc, fromCol ? cc : null, !fromCol);
  if(!src){ toast('表が見つかりません。グラフにしたい表の中のセル（または範囲）を えらんでから 使ってください'); return; }
  st={src, model:null, lc:src.lc, on:src.on.slice(), flip:false, pieSer:0, table:false, title:'', titled:false};
  const m=chartBuild(src, st.lc, st.on);
  const many=m.cats.length>12, timey=m.dateLabels || m.cats.some(s=>/^\d{1,2}月$|^\d{1,2}\/\d{1,2}$|^\d{4}[\/年]/.test(String(s)));
  st.type=(timey||many) ? 'line' : 'bar';
  st.title=chartTitle(m);
  chartRender();
}
/* 字の列から：同じものごとの合計（📑 項目ごとの合計 と同じ）。同じものが無い列や 数の列が無いときは null */
function catChart(c){
  const rg=tableAround(c); if(!rg) return null;
  const h=headerOf(rg), rows=dataRows(rg,h).filter(r=>!hpHidRow(r));
  if(colKind(c,rows)!=='text') return null;
  const keys=rows.map(r=>txt(r,c));
  if(new Set(keys).size===keys.length) return null;
  let vc=-1, dist=99;
  for(let x=rg.c1;x<=rg.c2;x++){ if(x!==c && colKind(x,rows)==='num' && Math.abs(x-c)<dist){ vc=x; dist=Math.abs(x-c); } }
  if(vc<0) return null;
  const g=new Map();
  rows.forEach(r=>{ const k=txt(r,c)||'（空）', v=hpCellVal(r,vc).n; if(!g.has(k)) g.set(k,0); if(v!=null) g.set(k, g.get(k)+v); });
  const list=[...g.entries()].sort((a,b)=>b[1]-a[1]);
  const vn=colName(vc,h), cn=colName(c,h);
  const notes=['同じ'+cn+'は 合計しています（📑 項目ごとの合計 と同じ）'];
  if(hpHidSet()) notes.push('しぼり込みで隠した行は 入れていません');
  return {cats:list.map(x=>x[0]), series:[{name:vn+'の合計', vals:list.map(x=>x[1])}], title:cn+'ごとの'+vn, notes, at:ALPHA[rg.c1]+(rg.r1+1)+':'+ALPHA[rg.c2]+(rg.r2+1)};
}
function chartTitle(m){
  return m.series.length===1 ? m.series[0].name : ((typeof sheets!=='undefined' && sheets[curSheet] && sheets[curSheet].name)||'グラフ');
}
/* まとめ表などから、中身を直接わたして開く */
function chartOpen(model, type){
  st={src:null, model, type, flip:false, pieSer:0, table:false, title:model.title||chartTitle(model), titled:true};
  chartRender();
}
function chartModel(){
  const m=st.src ? chartBuild(st.src, st.lc, st.on) : st.model;
  return st.flip ? flipModel(m) : m;
}
function chartRender(){
  const m=chartModel(), src=st.src;
  const types=[['bar','📊 棒'],['line','📈 折れ線'],['pie','🥧 円']];
  let html=`<div class="hp-ch-top"><div class="hp-seg" role="group" aria-label="グラフの形">${types.map(([k,l])=>`<button type="button" class="${st.type===k?'on':''}" onclick="HP.chType('${k}')" aria-pressed="${st.type===k}">${l}</button>`).join('')}</div>`
    +(src && m.series.length && m.cats.length && st.type!=='pie' ? `<label class="hp-inl" style="margin:0"><input type="checkbox" ${st.flip?'checked':''} onchange="HP.chFlip(this.checked)"> 行と列を入れかえる</label>` : '')+`</div>`;
  if(src && src.scs.length>1) html+=`<div class="hp-chips" role="group" aria-label="グラフにする列">${src.scs.map(x=>`<button type="button" class="hp-chip${st.on.indexOf(x)>=0?' on':''}" onclick="HP.chSer(${x})" aria-pressed="${st.on.indexOf(x)>=0}">${st.on.indexOf(x)>=0?'✓ ':''}${esc(src.h>=0&&txt(src.h,x)?txt(src.h,x):ALPHA[x]+'列')}</button>`).join('')}</div>`;
  if(src && src.lcs.length>1) html+=`<label class="hp-f">項目（横に並べるもの）<select onchange="HP.chLc(+this.value)">${src.lcs.map(x=>`<option value="${x}"${x===st.lc?' selected':''}>${esc(ALPHA[x]+'列 '+(src.h>=0&&txt(src.h,x)?txt(src.h,x):''))}</option>`).join('')}<option value="-1"${st.lc<0?' selected':''}>行の番号</option></select></label>`;
  if(st.type==='pie' && m.series.length>1) html+=`<label class="hp-f">円にする列<select onchange="HP.chPie(+this.value)">${m.series.map((s,i)=>`<option value="${i}"${i===st.pieSer?' selected':''}>${esc(s.name)}</option>`).join('')}</select></label>`;
  html+=`<input class="hp-ch-title" id="hpChT" value="${esc(st.title)}" aria-label="グラフの題" maxlength="40" oninput="HP.chTitle(this.value)">`;
  html+=`<div class="hp-ch-box" id="hpChBox"></div><div class="hp-ch-note" id="hpChNote"></div>`;
  html+=`<div class="hp-acts"><button type="button" class="hp-b left" onclick="HP.chTable()">${st.table?'📊 グラフだけ':'📋 表で見る'}</button><button type="button" class="hp-b" onclick="HP.chSave(false)">🖼 画像で保存</button>${navigator.share?'<button type="button" class="hp-b" onclick="HP.chSave(true)">📤 共有</button>':''}<button type="button" class="hp-b" onclick="HP.chPrint()">🖨 印刷</button></div>`;
  html+=`<div id="hpChTbl"${st.table?'':' hidden'}></div>`;
  show('chart','📊 表からグラフ', html, true);
  chartDraw();
}
function chartDraw(){
  const box=$('hpChBox'); if(!box) return;
  tipHide();   // 前の図の吹き出しは捨てる（描き直すと 中身ごと入れかわるため）
  const m=chartModel();
  const notes=(m.notes||[]).slice();
  if(!m.series.length || !m.cats.length){ box.innerHTML='<div class="hp-ch-empty">数の入った列がありません。<br>グラフにしたい表（見出しの行＋項目の列＋数の列）の中を えらんでから 開いてください。</div>'; $('hpChNote').textContent=''; $('hpChTbl').innerHTML=''; return; }
  const W=Math.max(280, Math.min(740, box.clientWidth||320)), dark=document.body.classList.contains('dark');
  const out=chartSvg(m, st.type, W, dark, {pieSer:st.pieSer});
  box.innerHTML=out.svg;
  if(out.notes) notes.push(...out.notes);
  if(m.at) notes.unshift(m.at+' から');
  if(st.src && st.src.hint && st.on.length<st.src.scs.length) notes.push(st.src.hint);
  $('hpChNote').textContent=notes.join('・');
  chartHover(box, out.hit);
  const tb=$('hpChTbl'); if(tb){ tb.innerHTML=st.table ? tableHtml(m) : ''; tb.hidden=!st.table; }
}
function tableHtml(m){
  return `<div class="hp-tblwrap"><table class="hp-tbl"><thead><tr><th></th>${m.series.map(s=>`<th>${esc(s.name)}</th>`).join('')}</tr></thead><tbody>`
    +m.cats.map((c,i)=>`<tr><td>${esc(c)}</td>${m.series.map(s=>`<td class="n">${s.vals[i]==null?'':nf(s.vals[i])}</td>`).join('')}</tr>`).join('')+'</tbody></table></div>';
}
/* 円グラフの中身：大きい順に5つ＋その他（マイナス・0は入れない） */
function pieParts(m, si){
  const s=m.series[Math.min(si, m.series.length-1)];
  let parts=m.cats.map((c,i)=>({name:c, v:s.vals[i]})).filter(p=>p.v!=null && p.v>0);
  const dropped=m.cats.length-parts.length;
  parts.sort((a,b)=>b.v-a.v);
  if(parts.length>6){ const rest=parts.slice(5); parts=parts.slice(0,5); parts.push({name:'その他（'+rest.length+'）', v:rest.reduce((a,p)=>a+p.v,0), other:true}); }
  return {parts, dropped, name:s.name};
}
/* SVG を組み立てる。hit は ふれたときの吹き出し用（x の帯ごと／円の切れごと） */
function chartSvg(m, type, W, dark, o){
  const P=dark?PAL_D:PAL_L, K=dark?INK_D:INK_L;
  const notes=[];
  const head=o.title ? 28 : 0;
  const titleSvg=o.title ? `<text x="12" y="20" font-size="15" font-weight="bold" fill="${K.primary}">${esc(o.title)}</text>` : '';
  if(type==='pie'){
    const pp=pieParts(m, o.pieSer||0), parts=pp.parts, sum=parts.reduce((a,p)=>a+p.v,0);
    if(pp.dropped) notes.push('0・マイナス・空の '+pp.dropped+'つは 円に入れていません');
    if(parts.length<3) notes.push('2つまでなら、円より 数字か棒のほうが 比べやすいです');
    if(!parts.length || !sum) return {svg:`<svg viewBox="0 0 ${W} 120" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="120" fill="${K.surface}"/><text x="${W/2}" y="64" text-anchor="middle" font-size="13" fill="${K.secondary}" font-family='${FONT}'>円にできる数（0より大きい）がありません</text></svg>`, hit:null, notes};
    const side=W>=440;
    const legW=side ? Math.min(280, Math.max(180, W*0.42)) : W-24;
    const D=side ? Math.min(240, W-legW-56) : Math.min(230, W-40);
    const gx=side ? Math.max(8, (W-(D+32+legW))/2) : 0;   // 円と見本を まとめて まん中に
    const legH=parts.length*24+8;
    const H=head+(side ? Math.max(D+24, legH+16) : D+24+legH+8);
    const cx=side ? gx+D/2 : W/2, cy=head+12+D/2, R=D/2;
    let a0=-Math.PI/2, segs='', labels='', hit=[];
    parts.forEach((p,i)=>{
      const frac=p.v/sum, a1=a0+frac*Math.PI*2, col=p.other?(dark?'#6b7387':'#a8a7a0'):P[i];
      const large=(a1-a0)>Math.PI?1:0;
      const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0), x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
      const d=parts.length===1 ? `M ${cx-R} ${cy} A ${R} ${R} 0 1 1 ${cx+R} ${cy} A ${R} ${R} 0 1 1 ${cx-R} ${cy} Z` : `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
      segs+=`<path d="${d}" fill="${col}" stroke="${K.surface}" stroke-width="2" stroke-linejoin="round" data-i="${i}"/>`;
      if(frac>=0.08){
        const am=(a0+a1)/2, lx=cx+R*0.64*Math.cos(am), ly=cy+R*0.64*Math.sin(am);
        const lum=lumOf(col), fc=lum>0.5?'#0b0b0b':'#ffffff';
        labels+=`<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="bold" fill="${fc}">${Math.round(frac*100)}%</text>`;
      }
      hit.push({name:p.name, rows:[{c:col, v:p.v, s:Math.round(frac*1000)/10+'%'}], a0, a1});
      a0=a1;
    });
    let leg='';
    const lx0=side ? gx+D+32 : 12, ly0=side ? head+Math.max(12, (D+24-legH)/2) : head+D+28;
    parts.forEach((p,i)=>{
      const y=ly0+i*24, col=p.other?(dark?'#6b7387':'#a8a7a0'):P[i];
      const pct=Math.round(p.v/sum*1000)/10;
      const val=nf(p.v)+'（'+pct+'%）', vw=tw(val,12);
      leg+=`<rect x="${lx0}" y="${y+3}" width="12" height="12" rx="2" fill="${col}"/>`
        +`<text x="${lx0+18}" y="${y+13}" font-size="12.5" fill="${K.primary}">${esc(cut(p.name,12.5,legW-vw-30))}</text>`
        +`<text x="${lx0+legW}" y="${y+13}" font-size="12" text-anchor="end" fill="${K.secondary}">${esc(val)}</text>`;
    });
    const svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc((o.title||pp.name)+'の円グラフ。'+parts.map(p=>p.name+' '+nf(p.v)).join('、'))}" font-family='${FONT}'>`
      +`<rect width="${W}" height="${H}" fill="${K.surface}"/>${titleSvg}${segs}${labels}${leg}</svg>`;
    return {svg, hit:{type:'pie', cx, cy, R, parts:hit, W, H}, notes};
  }
  // ── 棒・折れ線 ──
  const S=m.series, N=m.cats.length, multi=S.length>1;
  const all=[]; S.forEach(s=>s.vals.forEach(v=>{ if(v!=null && isFinite(v)) all.push(v); }));
  let lo=Math.min(...all), hi=Math.max(...all);
  if(type==='bar'){ lo=Math.min(0,lo); hi=Math.max(0,hi); }
  else if(lo>=0 && lo<hi*0.35) lo=0;
  const ticks=niceTicks(lo, hi, 4), y0v=ticks[0], y1v=ticks[ticks.length-1];
  const legH=multi ? 24 : 0;
  const tickW=Math.max(...ticks.map(t=>tw(axisLabel(t),11)));
  const endLab=type==='line' && S.length<=4;
  let right=12;
  if(endLab){
    const lastIdx=s=>{ for(let i=s.vals.length-1;i>=0;i--) if(s.vals[i]!=null) return i; return -1; };
    const lens=S.map(s=>{ const i=lastIdx(s); return i<0?0:tw((multi?cut(s.name,11,70)+' ':'')+nf(s.vals[i]),11); });
    right=Math.min(W*0.32, Math.max(...lens)+14);
  }
  const L=tickW+14, T=head+legH+12, B=26, PH=Math.max(150, Math.min(300, Math.round(W*0.5)));
  const H=T+PH+B, PW=W-L-right;
  const band=PW/N;
  const yAt=v=>T+PH-(v-y0v)/(y1v-y0v)*PH;
  let g='';
  ticks.forEach(t=>{ const y=yAt(t).toFixed(1); g+=`<line x1="${L}" x2="${L+PW}" y1="${y}" y2="${y}" stroke="${t===0?K.base:K.grid}" stroke-width="1"/>`
    +`<text x="${L-6}" y="${(+y+4).toFixed(1)}" text-anchor="end" font-size="11" fill="${K.muted}" style="font-variant-numeric:tabular-nums">${esc(axisLabel(t))}</text>`; });
  // x の見出し（重ならないよう 間引く・長いものは …）
  const maxLab=Math.max(...m.cats.map(c=>tw(String(c),11)));
  const fitW=Math.max(28, band*2.6);
  const every=Math.max(1, Math.ceil(Math.min(maxLab, fitW)/Math.max(1,band*0.95)));
  let xl='';
  m.cats.forEach((c,i)=>{ if(i%every && i!==N-1) return; if(i!==N-1 && N-1-i<every && (N-1)%every) return;
    const x=L+band*(i+0.5); xl+=`<text x="${x.toFixed(1)}" y="${T+PH+17}" text-anchor="middle" font-size="11" fill="${K.muted}">${esc(cut(c,11,Math.max(26,band*every*0.92)))}</text>`; });
  if(every>1) notes.push('下の見出しは '+every+'つおきに出しています');
  let marks='', lab='';
  if(type==='bar'){
    const n=S.length, gw=band*0.78, bw=Math.max(2, Math.min(24, (gw-2*(n-1))/n)), tot=n*bw+2*(n-1);
    const base=yAt(Math.max(y0v, Math.min(0, y1v)));
    let maxI=null;
    S.forEach((s,si)=>s.vals.forEach((v,i)=>{
      if(v==null || !isFinite(v)) return;
      const x=L+band*i+(band-tot)/2+si*(bw+2), y=yAt(v), r=Math.min(4, bw/2, Math.abs(base-y));
      const top=Math.min(y,base), bot=Math.max(y,base);
      const d=v>=0
        ? `M${x.toFixed(2)} ${bot.toFixed(2)} L${x.toFixed(2)} ${(top+r).toFixed(2)} Q${x.toFixed(2)} ${top.toFixed(2)} ${(x+r).toFixed(2)} ${top.toFixed(2)} L${(x+bw-r).toFixed(2)} ${top.toFixed(2)} Q${(x+bw).toFixed(2)} ${top.toFixed(2)} ${(x+bw).toFixed(2)} ${(top+r).toFixed(2)} L${(x+bw).toFixed(2)} ${bot.toFixed(2)} Z`
        : `M${x.toFixed(2)} ${top.toFixed(2)} L${x.toFixed(2)} ${(bot-r).toFixed(2)} Q${x.toFixed(2)} ${bot.toFixed(2)} ${(x+r).toFixed(2)} ${bot.toFixed(2)} L${(x+bw-r).toFixed(2)} ${bot.toFixed(2)} Q${(x+bw).toFixed(2)} ${bot.toFixed(2)} ${(x+bw).toFixed(2)} ${(bot-r).toFixed(2)} L${(x+bw).toFixed(2)} ${top.toFixed(2)} Z`;
      marks+=`<path d="${d}" fill="${P[si]}"/>`;
      if(!multi && (maxI==null || v>s.vals[maxI])) maxI=i;
    }));
    if(!multi && maxI!=null){   // いちばん大きい棒にだけ 数を出す（全部に出すと読めない）
      const v=S[0].vals[maxI], x=L+band*(maxI+0.5), y=yAt(v);
      lab+=`<text x="${x.toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="bold" fill="${K.primary}">${esc(nf(v))}</text>`;
      const mn=Math.min(...S[0].vals.filter(x=>x!=null));
      if(mn<0){ const i=S[0].vals.indexOf(mn); lab+=`<text x="${(L+band*(i+0.5)).toFixed(1)}" y="${(yAt(mn)+14).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="bold" fill="${K.primary}">${esc(nf(mn))}</text>`; }
    }
  } else {
    const dots=N<=24;
    const ends=[];
    S.forEach((s,si)=>{
      let d='', pen=false, last=-1;
      s.vals.forEach((v,i)=>{ if(v==null||!isFinite(v)){ pen=false; return; } const x=L+band*(i+0.5), y=yAt(v); d+=(pen?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)+' '; pen=true; last=i; });
      marks+=`<path d="${d}" fill="none" stroke="${P[si]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      s.vals.forEach((v,i)=>{ if(v==null||!isFinite(v)) return; if(!dots && i!==last) return; const x=L+band*(i+0.5), y=yAt(v);
        marks+=`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="${P[si]}" stroke="${K.surface}" stroke-width="2"/>`; });
      if(last>=0) ends.push({si, y:yAt(s.vals[last]), x:L+band*(last+0.5), v:s.vals[last], name:s.name});
    });
    if(endLab && ends.length){
      const ys=ends.map(e=>e.y).sort((a,b)=>a-b), crowd=ys.some((y,i)=>i && y-ys[i-1]<13);
      if(!crowd) ends.forEach(e=>{ lab+=`<text x="${(e.x+8).toFixed(1)}" y="${(e.y+4).toFixed(1)}" font-size="11" fill="${K.primary}"><tspan font-weight="bold">${esc(nf(e.v))}</tspan>${multi?`<tspan fill="${K.secondary}"> ${esc(cut(e.name,11,70))}</tspan>`:''}</text>`; });
      else notes.push('線の名前は 上の見本で見分けてください');
    }
  }
  let leg='';
  if(multi){
    let x=L;
    S.forEach((s,si)=>{
      const nm=cut(s.name,12,140), w=tw(nm,12)+26;
      if(x+w>W-8) return;
      leg+=(type==='line' ? `<line x1="${x}" x2="${x+14}" y1="${head+12}" y2="${head+12}" stroke="${P[si]}" stroke-width="3" stroke-linecap="round"/>` : `<rect x="${x}" y="${head+6}" width="12" height="12" rx="2" fill="${P[si]}"/>`)
        +`<text x="${x+18}" y="${head+16}" font-size="12" fill="${K.primary}">${esc(nm)}</text>`;
      x+=w+6;
    });
  }
  const svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc((o.title||'')+'の'+(type==='bar'?'棒':'折れ線')+'グラフ（'+S.map(s=>s.name).join('・')+'）')}" font-family='${FONT}'>`
    +`<rect width="${W}" height="${H}" fill="${K.surface}"/>${titleSvg}${leg}${g}<rect id="hpHov" x="0" y="${T}" width="0" height="${PH}" fill="${K.hover}"/>${marks}${lab}${xl}</svg>`;
  const hit={type, L, T, PW, PH, band, N, W, H, rows:m.cats.map((c,i)=>({name:c, rows:S.map((s,si)=>({c:P[si], v:s.vals[i], s:s.name}))}))};
  return {svg, hit, notes};
}
function lumOf(hex){ const n=parseInt(hex.slice(1),16), f=x=>{ x/=255; return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4); }; return 0.2126*f(n>>16&255)+0.7152*f(n>>8&255)+0.0722*f(n&255); }
/* ふれた所の数を吹き出しで出す（棒・線は x の帯ごと、円は切れごと） */
let tipEl=null;
function tipHide(){ if(tipEl){ tipEl.remove(); tipEl=null; } const h=document.getElementById('hpHov'); if(h) h.setAttribute('width','0'); }
function chartHover(box, hit){
  if(!hit) return;
  const svg=box.querySelector('svg'); if(!svg) return;
  const at=(e)=>{
    const rc=svg.getBoundingClientRect(), k=hit.W/rc.width;
    const x=(e.clientX-rc.left)*k, y=(e.clientY-rc.top)*k;
    let item=null;
    if(hit.type==='pie'){
      const dx=x-hit.cx, dy=y-hit.cy; if(dx*dx+dy*dy>hit.R*hit.R*1.1) return tipHide();
      let a=Math.atan2(dy,dx); if(a<-Math.PI/2) a+=Math.PI*2;
      item=hit.parts.find(p=>a>=p.a0 && a<p.a1)||null;
    } else {
      if(x<hit.L-4 || x>hit.L+hit.PW+4 || y<hit.T-20 || y>hit.T+hit.PH+24) return tipHide();
      const i=clamp(Math.floor((x-hit.L)/hit.band),0,hit.N-1);
      item=hit.rows[i];
      const hv=document.getElementById('hpHov');
      if(hv){ hv.setAttribute('x',(hit.L+hit.band*i).toFixed(1)); hv.setAttribute('width',hit.band.toFixed(1)); }
    }
    if(!item) return tipHide();
    if(!tipEl){ tipEl=document.createElement('div'); tipEl.className='hp-tip'; box.appendChild(tipEl); }
    tipEl.textContent='';
    const hd=document.createElement('div'); hd.className='h'; hd.textContent=item.name; tipEl.appendChild(hd);
    item.rows.forEach(rw=>{
      if(rw.v==null) return;
      const d=document.createElement('div'); d.className='r';
      const i=document.createElement('i'); i.style.background=rw.c; d.appendChild(i);
      const b=document.createElement('b'); b.textContent=nf(rw.v); d.appendChild(b);
      const s=document.createElement('span'); s.textContent=rw.s||''; d.appendChild(s);
      tipEl.appendChild(d);
    });
    const br=box.getBoundingClientRect(), tw2=tipEl.offsetWidth, th=tipEl.offsetHeight;
    let lx=e.clientX-br.left+12, ly=e.clientY-br.top-th-10;
    if(lx+tw2>br.width-4) lx=e.clientX-br.left-tw2-12;
    if(ly<4) ly=e.clientY-br.top+14;
    tipEl.style.left=clamp(lx,4,Math.max(4,br.width-tw2-4))+'px'; tipEl.style.top=clamp(ly,4,Math.max(4,br.height-th-4))+'px';
  };
  svg.addEventListener('pointermove', at);
  svg.addEventListener('pointerdown', at);
  svg.addEventListener('pointerleave', e=>{ if(e.pointerType==='mouse') tipHide(); });
}
function chType(t){ st.type=t; if(t==='pie') st.flip=false; chartRender(); }
function chFlip(on){ st.flip=!!on; st.pieSer=0; chartRender(); }
function chSer(x){
  const i=st.on.indexOf(x);
  if(i>=0){ if(st.on.length<2){ toast('1つは えらんでください'); return; } st.on.splice(i,1); }
  else { if(st.on.length>=MAX_SER){ toast(MAX_SER+'つまでです'); return; } st.on.push(x); st.on.sort((a,b)=>a-b); }
  st.pieSer=0;
  if(!st.titled) st.title=chartTitle(chartBuild(st.src, st.lc, st.on));
  chartRender();
}
function chLc(x){ st.lc=x; chartRender(); }
function chPie(i){ st.pieSer=i; chartDraw(); }
function chTitle(v){ st.title=String(v||'').slice(0,40); st.titled=true; }
function chTable(){ st.table=!st.table; chartRender(); }
/* 画像・印刷は いつも白い紙の色で、題も入れる */
function exportSvg(W){
  return chartSvg(chartModel(), st.type, W, false, {pieSer:st.pieSer, title:st.title||''}).svg;
}
function chSave(share){
  const W=800, svg=exportSvg(W);
  const m=/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg), H=m?+m[2]:480;
  const img=new Image();
  img.onload=()=>{
    const k=2, cv=document.createElement('canvas'); cv.width=W*k; cv.height=Math.round(H*k);
    const x=cv.getContext('2d'); x.fillStyle='#ffffff'; x.fillRect(0,0,cv.width,cv.height); x.scale(k,k); x.drawImage(img,0,0,W,H);
    cv.toBlob(async blob=>{
      if(!blob){ toast('画像を作れませんでした'); return; }
      const fname='hyo-graph_'+(typeof shotStamp==='function'?shotStamp():Date.now())+'.png';
      if(share && typeof shotShareBlob==='function' && await shotShareBlob(blob, fname)) return;
      const url=URL.createObjectURL(blob);
      const a=Object.assign(document.createElement('a'),{href:url, download:fname}); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(_){} }, 1500);
      toast(share?'共有できないので、画像として保存しました':'グラフを画像で保存しました');
    }, 'image/png');
  };
  img.onerror=()=>toast('画像を作れませんでした');
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function chPrint(){
  const m=chartModel();
  let pa=document.getElementById('printArea');
  if(!pa){ pa=document.createElement('div'); pa.id='printArea'; document.body.appendChild(pa); }
  pa.innerHTML=`<div class="hp-pc">${exportSvg(900)}</div><div class="hp-pt">${tableHtml(m).replace(/class="hp-tblwrap"/,'')}</div>`;
  pa.querySelectorAll('.hp-tbl').forEach(t=>{ t.setAttribute('style','border-collapse:collapse;width:100%;margin-top:10px;font-size:11px;'); t.querySelectorAll('th,td').forEach(c=>c.setAttribute('style','border:1px solid #888;padding:3px 6px;'+(c.classList.contains('n')?'text-align:right;':''))); });
  let dyn=document.getElementById('printDynamicStyle');
  if(!dyn){ dyn=document.createElement('style'); dyn.id='printDynamicStyle'; document.head.appendChild(dyn); }
  dyn.textContent='@page{ size: A4 landscape; margin: 10mm; }';
  toast('印刷の画面から「PDFに保存」も選べます', 3600);
  setTimeout(()=>{ try{ window.print(); }catch(e){ alert('印刷を開けませんでした'); } }, 250);
}
window.addEventListener('resize', ()=>{ if(view==='chart') { clearTimeout(chartDraw.t); chartDraw.t=setTimeout(chartDraw,150); } });

window.HP={ close, menu, go, kind, kSet, kPreset, kSum, kOk, kSumPut, cf, cfNew, cfEdit, cfWhere, cfRow, cfType, cfSt, cfNock, cfPrev, cfSave, cfBack, cfMove, cfDel, cfClearAll,
  filter, fTab, fAll, fOne, fFind, fOk, fClear, fOff, quick, sortBy, pivot, pv, pvCopy, pvChart, pvMake,
  chart, chartOpen, chType, chFlip, chSer, chLc, chPie, chTitle, chTable, chSave, chPrint,
  /* テスト用 */ region, chartSource, chartBuild, chartModel:()=>chartModel(), chartSvg, pieParts, niceTicks, parseOpts, pivotRows:()=>pivotRows(), state:()=>st, view:()=>view };
})();
