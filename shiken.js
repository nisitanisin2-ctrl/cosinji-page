/* 📝 試験報告書（v600。💧 単位水量試験・🧪 カンタブ試験 から 開く。はじめて 使うときに 読む）
   ・見出し（会社名・工事名・試験日と 時刻・試験場所・天候・気温・コンクリート温度・試験者・立会者・備考）を 入れて、
     単位水量・塩化物（カンタブ）の どちらか／両方を 1枚の 報告書に（印の 欄つき）。印刷（PDF）・画像で 保存・共有。
   ・見出しは excalc_shiken に 覚える（試験日と 時刻は その日の うちだけ。次の日は きょうに もどる）。
   ・カンタブの「🖨 結果を1ページのPDFに」「🖼 画像」（ktPdf・ktImage）も ここ。
   ・試験の 値と 計算は 表電卓の 本体（tsxReportHtml('body')・ktResult）から もらう。 */
(function(){
'use strict';
const KEY='excalc_shiken';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const numS=v=>{ const s=String(v==null?'':v).normalize('NFKC').replace(/[^0-9.\-]/g,'').slice(0,6); return /^-?\d*\.?\d*$/.test(s) ? s : ''; };
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const okD=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s+'T00:00:00').getTime());
const okT=s=>typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : '';
const WD='日月火水木金土';
const dateJa=s=>{ if(!okD(s)) return ''; const d=new Date(s+'T00:00:00'); return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）'; };
const WEATHER=['晴れ','くもり','雨','雪'];
const TEXTS=[['co','会社名',40,'例：○○生コン（株） 品質管理課'],['koji','工事名',60,'例：○○ビル 新築工事'],['place','試験場所',40,'例：現場 荷おろし地点']];
const NAMES={tsx:'💧 単位水量試験', kt:'🧪 塩化物（カンタブ）'};
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };

/* ───────── 見出し ───────── */
let H=null, inc={tsx:true, kt:false}, from='tsx';
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const today=ymd(new Date()), same=o.dateSet===today;
  H={co:oneLine(o.co,40), koji:oneLine(o.koji,60), place:oneLine(o.place,40), tester:oneLine(o.tester,20), witness:oneLine(o.witness,20),
    weather:WEATHER.includes(o.weather) ? o.weather : '', temp:numS(o.temp), ctemp:numS(o.ctemp), memo:multi(o.memo,300), hanko:o.hanko!==false,
    date:same && okD(o.date) ? o.date : today, time:same ? okT(o.time) : '', dateSet:today};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(H)); }catch(_){} }
function setH(k, v){
  if(!H) load();
  if(k==='hanko') H.hanko=!!v;
  else if(k==='weather') H.weather=WEATHER.includes(v) && H.weather!==v ? v : '';
  else if(k==='temp' || k==='ctemp') H[k]=numS(v);
  else if(k==='memo') H.memo=multi(v,300);
  else if(k==='date'){ if(okD(v)) H.date=v; }
  else if(k==='time') H.time=okT(v);
  else { const f=TEXTS.find(x=>x[0]===k); if(f) H[k]=oneLine(v,f[2]); else if(k==='tester' || k==='witness') H[k]=oneLine(v,20); else return; }
  H.dateSet=ymd(new Date()); save();
}

/* ───────── 試験の 結果 ───────── */
function tsxBody(){ return typeof tsxReportHtml==='function' ? tsxReportHtml('body') : null; }
function ktR(){ return typeof ktResult==='function' ? ktResult() : null; }
const fmt=(x,n)=>typeof tsFmt==='function' ? tsFmt(x,n) : Number(x).toFixed(n);
const KT_J={ok:'合格', warn:'要注意', ng:'不合格(管理値超過)'};
function summary(k){
  if(k==='tsx'){ const b=tsxBody(); return b && b.ok ? 'W '+fmt(b.W, tsDp[3])+' kg/m³・'+TS_JUDGE_TEXT[b.judge] : 'まだ 結果が ありません'; }
  const R=ktR(); return R && R.avg!=null ? fmt(R.avg,3)+' kg/m³・'+KT_J[R.judge] : 'まだ 結果が ありません';
}
const hasRes=k=>k==='tsx' ? !!(tsxBody()||{}).ok : (ktR()||{}).avg!=null;
// 🧪 カンタブの 中身（表と めやす）
function ktParts(){
  const R=ktR(); if(!R) return null;
  const rows=R.rows.map(r=>{
    const rd=r.r===null ? '—' : esc(String(r.raw));
    const c=r.st==='out' ? '範囲外' : r.conc!=null ? fmt(r.conc, KT_CONC_DP)+(r.exact ? '' : ' *') : '—';
    const q=r.cl!=null ? fmt(r.cl,3) : '—';
    return `<tr><td class="c">${r.mark}</td><td>${rd}</td><td>${esc(c)}</td><td><b>${esc(q)}</b></td></tr>`;
  }).join('');
  const notes=[R.nInterp ? '* は 換算表の 間を 直線で おぎなった 値です' : '', R.nOut ? '範囲外の '+R.nOut+'回は 平均に 入れていません' : ''].filter(Boolean).join('　');
  const big=R.avg!=null
    ? `<div class="vp-big">塩化物含有量（${R.n}回の 平均） ＝ <b>${esc(fmt(R.avg,3))} kg/m³</b>　／　判定 <b class="vp-j-${R.judge}">${esc(KT_J[R.judge])}</b></div>`
    : `<div class="vp-big">単位水量と 読み値が 足りないため、結果は 出ていません</div>`;
  const tbl=`<div class="vp-box"><div class="vp-h">測定値（単位水量 W ＝ ${R.W!=null ? esc(fmt(R.W,1).replace(/\.0$/,''))+' kg/m³' : '—'}）</div>
    <table class="sk-kt"><thead><tr><th></th><th>読み値</th><th>塩化物イオン 濃度（%）</th><th>塩化物含有量（kg/m³）</th></tr></thead>
    <tbody>${rows}<tr class="avg"><td class="c">平均</td><td></td><td></td><td><b>${R.avg!=null ? esc(fmt(R.avg,3)) : '—'}</b></td></tr></tbody></table>
    ${notes ? `<div class="sk-n">${esc(notes)}</div>` : ''}</div>`;
  const rule=`<div class="vp-box"><div class="vp-h">判定の めやす</div><table class="vp-tbl">
    <tr><td class="vp-k">合格</td><td><b>${esc(fmt(ktWarn,2))} kg/m³</b> 以下</td></tr>
    <tr><td class="vp-k">要注意</td><td>${esc(fmt(ktWarn,2))} を こえ <b>${esc(fmt(ktLimit,2))} kg/m³</b> まで</td></tr>
    <tr><td class="vp-k">不合格</td><td>${esc(fmt(ktLimit,2))} kg/m³ を こえる（管理値 超過）</td></tr></table></div>`;
  return {R, big, tbl, rule};
}

/* ───────── 報告書の 中身 ───────── */
const DOC_CSS=`
#printArea .op-doc .sk-doc{ color:#000; }
#printArea .op-doc .sk-t{ text-align:center; font-size:21px; font-weight:bold; letter-spacing:.14em; margin:0; }
#printArea .op-doc .sk-s{ text-align:center; font-size:11px; color:#444; margin:2px 0 8px; }
#printArea .op-doc .sk-co{ text-align:right; font-size:12.5px; margin:0 0 6px; }
#printArea .op-doc table.sk-hd{ width:100%; border-collapse:collapse; margin:0 0 10px; table-layout:fixed; }
#printArea .op-doc .sk-hd th, #printArea .op-doc .sk-hd td{ border:1px solid #555; padding:5px 7px; font-size:12px; text-align:left; vertical-align:middle; overflow-wrap:anywhere; }
#printArea .op-doc .sk-hd th{ width:17%; background:#f1f3f5; font-weight:bold; }
#printArea .op-doc .sk-sec{ font-size:14px; font-weight:bold; margin:12px 0 6px; padding:3px 8px; border-left:5px solid #2e7d32; background:#f3f7f3; break-after:avoid; }
#printArea .op-doc .sk-sub{ font-size:11px; color:#444; margin:2px 0 6px; }
#printArea .op-doc table.sk-kt{ width:100%; border-collapse:collapse; }
#printArea .op-doc .sk-kt th, #printArea .op-doc .sk-kt td{ border:1px solid #999; padding:3px 6px; font-size:11.5px; text-align:right; }
#printArea .op-doc .sk-kt th{ background:#f1f3f5; text-align:center; font-weight:bold; } #printArea .op-doc .sk-kt td.c{ text-align:center; }
#printArea .op-doc .sk-kt tr.avg td{ background:#f7f7f7; }
#printArea .op-doc .sk-n{ font-size:10.5px; color:#444; margin-top:4px; }
#printArea .op-doc .sk-memo{ border:1px solid #555; min-height:30px; padding:5px 7px; font-size:12px; white-space:pre-wrap; overflow-wrap:anywhere; }
#printArea .op-doc .sk-hanko{ display:flex; justify-content:flex-end; margin-top:12px; break-inside:avoid; }
#printArea .op-doc .sk-hanko div{ width:27mm; border:1px solid #555; text-align:center; }
#printArea .op-doc .sk-hanko div + div{ border-left:none; }
#printArea .op-doc .sk-hanko b{ display:block; font-size:11px; border-bottom:1px solid #555; padding:3px 0; }
#printArea .op-doc .sk-hanko i{ display:block; height:23mm; font-style:normal; }
`;
function headTable(){
  const c=(k,lb,v)=>`<th>${lb}</th><td>${v ? esc(v) : ''}</td>`;
  const dt=dateJa(H.date)+(H.time ? '　'+H.time : '');
  return `<table class="sk-hd"><tbody>
    <tr><th>工事名</th><td colspan="3">${esc(H.koji)}</td></tr>
    <tr>${c('d','試験日', dt)}${c('w','天候', H.weather)}</tr>
    <tr>${c('p','試験場所', H.place)}${c('t','気温', H.temp!=='' ? H.temp+' ℃' : '')}</tr>
    <tr>${c('s','試験者', H.tester)}${c('ct','コンクリート温度', H.ctemp!=='' ? H.ctemp+' ℃' : '')}</tr>
    <tr><th>立会者</th><td colspan="3">${esc(H.witness)}</td></tr>
  </tbody></table>`;
}
function reportHtml(w){
  if(!H) load();
  const both=w.tsx && w.kt;
  const title=both ? 'コンクリート 試験報告書' : w.tsx ? '単位水量試験 報告書' : '塩化物含有量試験 報告書';
  const sub=both ? '単位水量（土研法 エアメータ法）・塩化物含有量（カンタブ）' : w.tsx ? '土研法 エアメータ法　W＝W1＋0.7×(γ1−γ2)' : 'カンタブ（試験紙）による 塩化物イオン量の 測定';
  let h=`<div class="sk-t">${title}</div><div class="sk-s">${esc(sub)}</div>${H.co ? `<div class="sk-co">${esc(H.co)}</div>` : ''}${headTable()}`;
  if(w.tsx){
    const b=tsxBody();
    if(b){
      const nm=[b.mix ? '配合 '+b.mix : '', b.air ? 'エアメータ '+b.air : ''].filter(Boolean).join('　／　');
      h+=`<div class="sk-sec">💧 単位水量試験（エアメータ法）</div>${nm ? `<div class="sk-sub">${esc(nm)}</div>` : ''}${b.big}<div class="vp-cols">${b.boxes}</div>`;
    }
  }
  if(w.kt){
    const k=ktParts();
    if(k) h+=`<div class="sk-sec">🧪 塩化物含有量試験（カンタブ）</div>${k.big}<div class="vp-cols">${k.tbl}${k.rule}</div>`;
  }
  if(H.memo) h+=`<div class="sk-sec">備考</div><div class="sk-memo">${esc(H.memo)}</div>`;
  if(H.hanko) h+=`<div class="sk-hanko"><div><b>試験者</b><i></i></div><div><b>立会者</b><i></i></div></div>`;
  h+=`<div class="vp-foot">${w.tsx ? '単位水量：配合は kg/m³、質量は g、容積は cc で 入れた 値。' : ''}${w.kt ? '塩化物：換算表は お使いの カンタブの 表（⚙ 設定）。' : ''}（表電卓 ${typeof APP_VERSION!=='undefined' ? APP_VERSION : ''}）</div>`;
  return `<div class="op-doc" id="skRepBox"><style>${DOC_CSS}</style><div class="sk-doc">${h}</div></div>`;
}
// 🧪 カンタブだけの 1ページ（単位水量の「🖨 結果を1ページのPDFに」と 同じ 形）
function ktReportHtml(){
  const k=ktParts(); if(!k) return '';
  const t=new Date(), stamp=t.getFullYear()+'/'+(t.getMonth()+1)+'/'+t.getDate()+' '+pad2(t.getHours())+':'+pad2(t.getMinutes());
  return `<div class="op-doc" id="ktRepBox"><style>${DOC_CSS}</style><div class="vp-head"><div class="vp-title">🧪 カンタブ試験（塩化物含有量） 報告書</div>
    <div class="vp-sub">読み値 → 換算表で 塩化物イオン 濃度（%）→ 単位水量を 掛けて kg/m³　／　${esc(stamp)}</div>${k.big}</div>
    <div class="vp-cols">${k.tbl}${k.rule}</div>
    <div class="vp-foot">換算表は お使いの カンタブの 表（⚙ 設定）から 引いて います。　（表電卓 ${typeof APP_VERSION!=='undefined' ? APP_VERSION : ''}）</div></div>`;
}

/* ───────── 出す ───────── */
function closeFrom(){ if(from==='kt'){ if(typeof closeKantab==='function') closeKantab(); } else if(typeof closeTansui==='function') closeTansui(); }
function chosen(){ if(!inc.tsx && !inc.kt){ toastS('入れる 試験を えらんで ください'); return null; } return {tsx:inc.tsx, kt:inc.kt}; }
function shikenPrint(){
  const w=chosen(); if(!w) return null;
  const built=prnBuild('shiken', reportHtml(w));
  closeShikenRep(); closeFrom();
  opPrint(built);
  return built.k;
}
async function shikenImage(share){
  const w=chosen(); if(!w) return null;
  const built=prnBuild('shiken', reportHtml(w));
  const blob=await opImage(built, '試験報告書', share);
  if(blob){ closeShikenRep(); closeFrom(); }
  return blob;
}
function ktPdf(){
  const built=prnBuild('kt', ktReportHtml());
  if(typeof closeKantab==='function') closeKantab();
  opPrint(built);
  return built.k;
}
async function ktImage(share){
  const built=prnBuild('kt', ktReportHtml());
  const blob=await opImage(built, 'カンタブ試験', share);
  if(blob && typeof closeKantab==='function') closeKantab();
  return blob;
}

/* ───────── 窓 ───────── */
const CSS=`
#shikenOverlay .sk-modal{ max-width:560px; }
.sk-body{ font-size:14.5px; }
.sk-sec2{ margin:4px 0 6px; font-size:13px; font-weight:bold; color:var(--text-light,#666); }
.sk-sec2 + .sk-sec2, .sk-inc + .sk-sec2{ margin-top:12px; }
.sk-inc{ display:grid; grid-template-columns:1fr 1fr; gap:6px; }
.sk-ib{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-height:56px; padding:6px 10px; border-radius:12px; border:2px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; }
.sk-ib b{ font-size:14px; } .sk-ib small{ font-size:12px; color:var(--text-light,#666); }
.sk-ib.on{ border-color:var(--acc); background:rgba(120,132,156,.1); } .sk-ib.on b::before{ content:'✓ '; color:var(--acc); }
.sk-f{ display:flex; align-items:center; gap:8px; margin:6px 0; min-width:0; } .sk-f > span{ flex:none; min-width:5.2em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.sk-f input, .sk-f textarea{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.sk-f textarea{ padding:8px 10px; resize:vertical; min-height:60px; } .sk-f.top{ align-items:flex-start; } .sk-f em{ font-style:normal; font-size:13px; color:var(--text-light,#666); }
.sk-f2{ display:grid; grid-template-columns:1fr 1fr; gap:0 10px; }
@media (min-width:421px){ .sk-f2 .sk-f > span{ min-width:3.4em; } }
.sk-seg{ display:flex; flex-wrap:wrap; gap:5px; } .sk-seg button{ min-height:40px; padding:0 13px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.sk-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.sk-ck{ display:flex; align-items:center; gap:8px; margin:10px 0 4px; font-size:14px; cursor:pointer; } .sk-ck input{ width:22px; height:22px; }
.sk-acts{ display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 6px; } .sk-acts button{ flex:1 1 30%; min-height:46px; padding:0 8px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.sk-acts button.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.sk-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:8px 0 0; }
@media (max-width:420px){ .sk-f2{ grid-template-columns:1fr; } }
`;
function ensureDom(){
  if($('shikenOverlay')) return;
  const s=document.createElement('style'); s.id='skStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="shikenOverlay" onclick="if(event.target===this)closeShikenRep()">
  <div class="modal sk-modal">
    <div class="modal-header"><span>📝 試験報告書</span><button class="modal-close" onclick="closeShikenRep()" aria-label="閉じる">✕</button></div>
    <div class="modal-body sk-body" id="skBody"></div>
  </div></div>`;
  document.body.appendChild(box.firstElementChild);
  const b=$('skBody');
  const on=e=>{ const el=e.target.closest('[data-k]'); if(!el) return; setH(el.dataset.k, el.type==='checkbox' ? el.checked : el.value); };
  b.addEventListener('input', on); b.addEventListener('change', on);
  $('shikenOverlay').addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の 電卓キーに 届かないように
}
function render(){
  const b=$('skBody'); if(!b) return;
  const top=b.scrollTop;
  const inp=(k,lb,max,ph,extra)=>`<label class="sk-f"><span>${lb}</span><input type="text" data-k="${k}" maxlength="${max}" value="${esc(H[k])}" placeholder="${esc(ph||'')}" autocomplete="off"${extra||''}></label>`;
  b.innerHTML=`<div class="sk-sec2">入れる 試験</div>
    <div class="sk-inc">${['tsx','kt'].map(k=>`<button type="button" class="sk-ib${inc[k] ? ' on' : ''}" aria-pressed="${inc[k]}" onclick="SHIKEN.inc('${k}')"><b>${NAMES[k]}</b><small>${esc(summary(k))}</small></button>`).join('')}</div>
    <div class="sk-sec2">見出し（この 端末に 覚えます）</div>
    ${TEXTS.map(([k,lb,max,ph])=>inp(k,lb,max,ph)).join('')}
    <div class="sk-f2"><label class="sk-f"><span>試験日</span><input type="date" data-k="date" value="${esc(H.date)}"></label><label class="sk-f"><span>時刻</span><input type="time" data-k="time" value="${esc(H.time)}"></label></div>
    <div class="sk-f"><span>天候</span><div class="sk-seg">${WEATHER.map(x=>`<button type="button" class="${H.weather===x ? 'on' : ''}" onclick="SHIKEN.weather('${x}')">${x}</button>`).join('')}</div></div>
    <div class="sk-f2">${inp('temp','気温',6,'例 18',' inputmode="decimal"').replace('</label>','<em>℃</em></label>')}${inp('ctemp','コンクリート温度',6,'例 20',' inputmode="decimal"').replace('</label>','<em>℃</em></label>')}</div>
    <div class="sk-f2">${inp('tester','試験者',20,'')}${inp('witness','立会者',20,'')}</div>
    <label class="sk-f top"><span>備考</span><textarea data-k="memo" maxlength="300" rows="2" placeholder="例：スランプ 18.0cm・空気量 4.5%">${esc(H.memo)}</textarea></label>
    <label class="sk-ck"><input type="checkbox" data-k="hanko"${H.hanko ? ' checked' : ''}> 印（はんこ）の 欄を 出す（試験者・立会者）</label>
    <div class="sk-acts"><button type="button" class="pri" onclick="SHIKEN.print()">🖨 印刷・PDF</button><button type="button" onclick="SHIKEN.image(false)">🖼 画像で 保存</button><button type="button" onclick="SHIKEN.image(true)">📤 画像を 共有</button></div>
    <button class="prn-open" onclick="openPrn('shiken')">🖨 印刷のしかた（文字の大きさ・1枚に収める など）</button>
    <p class="sk-note">💧 単位水量と 🧪 塩化物（カンタブ）は、それぞれの 道具に いま 入って いる 値を 使います。両方 えらぶと 1枚に まとめます。</p>`;
  b.scrollTop=top;
}
function openShikenRep(which){
  ensureDom(); load();
  from=which==='kt' ? 'kt' : 'tsx';
  inc={tsx:from==='tsx', kt:from==='kt'};
  openDlg('shikenOverlay');
  render();
}
function closeShikenRep(){ if(!$('shikenOverlay') || !isDlgOpen('shikenOverlay')) return; closeDlg('shikenOverlay'); }

window.SHIKEN={ inc:k=>{ if(!(k in inc)) return; inc[k]=!inc[k]; render(); }, weather:v=>{ setH('weather', v); render(); }, set:(k,v)=>{ setH(k,v); render(); },
  print:()=>shikenPrint(), image:s=>shikenImage(!!s), html:w=>reportHtml(w||inc), ktHtml:ktReportHtml, head:()=>JSON.parse(JSON.stringify(H||{})), chosen:()=>Object.assign({}, inc), summary };
Object.assign(window, { openShikenRep, closeShikenRep, shikenPrint, shikenImage, ktPdf, ktImage });
})();
