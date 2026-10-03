/* 🛍 即売レジ（v500。表電卓の道具。apps/regi/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   フリマ・お祭り・即売会で使う、かんたんなレジ。
   ・商品（写真・名前・値段・在庫）を登録 → レジの画面で商品を押すと1つずつ足す → 合計・値引き →
     預かった金額を入れるとお釣り → 「会計する」で販売の記録に残し、在庫を減らす。
   ・履歴：会計ごとの一覧・取り消し（在庫を戻す）・売上のまとめ・商品ごとの売れた数。
   ・Excel（.xlsx）に書き出す：販売履歴（1行＝1品目）・会計ごと・商品別・まとめ。
   ・商品は書き出して、ほかの端末で読み込める（写真ごと）。
   ・値引き（v500）：会計ぜんたいの円引き・％引き・端数を切る、品ごとに1つあたりの値段を変える（半額・−10%など）。
   ・写真は選んだあと四角に切り取る（指で位置、つまみ・2本指で大きさ）。横向きでは左に商品・右に会計。
   ・入れたものは端末の中だけ（excalc_regi）。写真は小さくして保存する。 */
(function(){
const RG_KEY='excalc_regi';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen=n=>'¥'+Math.round(+n||0).toLocaleString('ja-JP');
const P2=n=>String(n).padStart(2,'0');
const stamp=t=>{ const d=new Date(t); return `${d.getFullYear()}/${P2(d.getMonth()+1)}/${P2(d.getDate())} ${P2(d.getHours())}:${P2(d.getMinutes())}`; };
const hm=t=>{ const d=new Date(t); return P2(d.getHours())+':'+P2(d.getMinutes()); };
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let rg={ev:{name:'',date:''}, items:[], sales:[], no:1}, cart=[], od={t:'yen',v:0}, rgEdit=null, rgPhoto=null, rgCrop=null;
function rgLoad(){
  try{ const o=JSON.parse(localStorage.getItem(RG_KEY)||'null')||{};
    const items=Array.isArray(o.items)?o.items.filter(x=>x&&typeof x.name==='string').slice(0,300).map(x=>({id:String(x.id||uid()), name:x.name.slice(0,40), price:Math.max(0,Math.round(+x.price||0)), stock0:Math.max(0,Math.round(+x.stock0||0)), stock:Math.round(+x.stock||0), photo:typeof x.photo==='string'&&x.photo.startsWith('data:image/')?x.photo:'', noStock:!!x.noStock})):[];
    const sales=Array.isArray(o.sales)?o.sales.filter(s=>s&&Array.isArray(s.lines)).slice(-5000):[];
    rg={ev:{name:String(o.ev&&o.ev.name||'').slice(0,40), date:String(o.ev&&o.ev.date||'').slice(0,10)}, items, sales, no:Math.max(1,+o.no||sales.length+1)};
  }catch(_){ rg={ev:{name:'',date:''}, items:[], sales:[], no:1}; }
}
function rgSave(){ try{ localStorage.setItem(RG_KEY, JSON.stringify(rg)); return true; }catch(_){ toast('保存できませんでした。端末の空きが足りないかもしれません（写真を減らすと入ります）', 4000); return false; } }
const itemOf=id=>rg.items.find(x=>x.id===id);
const cartQty=id=>{ const l=cart.find(c=>c.id===id); return l?l.qty:0; };
const subTotal=()=>cart.reduce((s,l)=>s+l.price*l.qty,0);          // 品ごとの値引きのあと
const origTotal=()=>cart.reduce((s,l)=>s+(l.orig==null?l.price:l.orig)*l.qty,0);
const lineDisc=()=>origTotal()-subTotal();
const orderDisc=()=>{ const s=subTotal(); if(!od.v) return 0; return Math.min(s, od.t==='pct'?Math.floor(s*od.v/100):od.v); };
const total=()=>Math.max(0, subTotal()-orderDisc());
const odReset=()=>{ od={t:'yen',v:0}; };

/* ───────── レジ ───────── */
function rgRenderGrid(){
  const g=$('rgGrid'); if(!g) return;
  const list=rg.items;
  if(!list.length){ g.innerHTML=`<div class="rg-empty">まだ商品がありません。<br><button class="rg-btn pri" onclick="rgOpenItems();rgEditItem()">＋ 商品を登録する</button></div>`; return; }
  g.innerHTML=list.map(it=>{ const q=cartQty(it.id), left=it.noStock?null:it.stock-q, out=!it.noStock&&left<=0;
    return `<button class="rg-tile${q?' in':''}${out?' out':''}" data-id="${it.id}" onclick="rgAdd('${it.id}')">
      <span class="ph">${it.photo?`<img src="${it.photo}" alt="">`:`<span class="noph">${esc(it.name.slice(0,2))}</span>`}</span>
      <span class="nm">${esc(it.name)}</span><span class="pr">${yen(it.price)}</span>
      ${it.noStock?'':`<span class="st${left<=3?' low':''}">${out?'売り切れ':'残り '+left}</span>`}${q?`<span class="q">${q}</span>`:''}</button>`; }).join('');
}
function rgRenderCart(){
  const b=$('rgCart'); if(!b) return;
  const tot=total();
  $('rgCartList').innerHTML=cart.length?cart.map(l=>`<div class="rg-line${l.price<l.orig?' dc':''}"><span class="n">${esc(l.name)}</span><span class="u">${l.price<l.orig?`<s>${yen(l.orig)}</s>`:''}${yen(l.price)}</span>
      <button onclick="rgQty('${l.id}',-1)">−</button><b>${l.qty}</b><button onclick="rgQty('${l.id}',1)">＋</button><span class="a">${yen(l.price*l.qty)}</span></div>`).join('')
    :'<div class="rg-hint">商品を押すと、ここに入ります（押すたびに1つずつ）</div>';
  $('rgTotal').innerHTML=rgTotalHtml();
  const paid=rgPaid(); const ch=paid-tot;
  $('rgChange').innerHTML=!cart.length?'':paid?(ch>=0?`お釣り <b>${yen(ch)}</b>`:`<span class="short">あと ${yen(-ch)} たりません</span>`):'<span class="dim">預かった金額を入れるとお釣りが出ます</span>';
  $('rgPayBtn').disabled=!cart.length || (paid>0 && paid<tot);
  b.classList.toggle('empty', !cart.length);
}
function rgTotalHtml(){
  const ld=lineDisc(), dd=orderDisc();
  return `${ld||dd?`<small>小計 ${yen(origTotal())}${ld?`　品の値引き −${yen(ld)}`:''}${dd?`　値引き${od.t==='pct'?`（${od.v}%）`:''} −${yen(dd)}`:''}</small>`:''}合計 <b>${yen(total())}</b><small>${cart.reduce((s,l)=>s+l.qty,0)}点</small>`;
}
function rgPaid(){ const e=$('rgPaid'); const n=parseInt(String(e&&e.value||'').normalize('NFKC').replace(/[^\d]/g,''),10); return isFinite(n)?n:0; }
function rgRefresh(){ rgRenderGrid(); rgRenderCart(); }
function rgAdd(id){
  const it=itemOf(id); if(!it) return;
  if(!it.noStock && it.stock-cartQty(id)<=0 && !confirm(`「${it.name}」は在庫が0です。それでも足しますか？（在庫はマイナスになります）`)) return;
  const l=cart.find(c=>c.id===id); if(l) l.qty++; else cart.push({id, name:it.name, price:it.price, orig:it.price, qty:1});
  if(navigator.vibrate) try{ navigator.vibrate(15); }catch(_){}
  rgRefresh();
}
function rgQty(id,d){ const l=cart.find(c=>c.id===id); if(!l) return; if(d>0){ rgAdd(id); return; } l.qty+=d; if(l.qty<=0) cart=cart.filter(c=>c!==l); if(!cart.length){ odReset(); } rgRefresh(); }
function rgClearCart(){ if(cart.length && !confirm('いまの注文を消しますか？')) return; cart=[]; odReset(); $('rgPaid').value=''; rgRefresh(); }
function rgSetPaid(v){ const e=$('rgPaid'); e.value=v==='just'?String(total()):String(v); rgRenderCart(); }
/* 値引き：会計ぜんたい（円・％）と、品ごと（1つあたりの値段を変える） */
const toN=v=>Math.max(0,parseInt(String(v==null?'':v).normalize('NFKC').replace(/[^\d]/g,''),10)||0);
function rgDisc(){ if(!cart.length){ toast('先に商品を入れてください'); return; } rgRenderDisc(); if(!isDlgOpen('rgDiscOverlay')) openDlg('rgDiscOverlay', ()=>rgRenderCart()); }
function rgRenderDisc(){
  const b=$('rgDiscBody'); if(!b) return; const pct=od.t==='pct';
  b.innerHTML=`<h4 style="margin-top:2px">会計ぜんたいの値引き</h4>
  <div class="rg-dtype"><button class="${pct?'':'on'}" onclick="rgOdType('yen')">円引き</button><button class="${pct?'on':''}" onclick="rgOdType('pct')">％引き</button></div>
  <div class="rg-payrow"><input id="rgOdV" inputmode="numeric" value="${od.v||''}" placeholder="0" oninput="rgOdSet(this.value)"><span class="un">${pct?'％引き':'円引き'}</span></div>
  <div class="rg-quick">${(pct?[5,10,20,30,50]:[50,100,300,500,1000]).map(n=>`<button onclick="rgOdSet(${n},1)">${pct?n+'%':'¥'+n.toLocaleString('ja-JP')}</button>`).join('')}<button onclick="rgOdRound()">端数を切る</button><button onclick="rgOdSet(0,1)">なし</button></div>
  <h4>品ごとの値引き（1つあたりの値段）</h4>
  ${cart.map(l=>`<div class="rg-dline"><div class="t"><b>${esc(l.name)}</b> ×${l.qty}<small>定価 ${yen(l.orig)}</small></div>
    <div class="c"><span>¥</span><input inputmode="numeric" id="rgLp_${l.id}" value="${l.price}" oninput="rgLinePrice('${l.id}',this.value)"><button onclick="rgLineQuick('${l.id}','half')">半額</button><button onclick="rgLineQuick('${l.id}',10)">−10%</button><button onclick="rgLineQuick('${l.id}',50)">−¥50</button><button onclick="rgLineQuick('${l.id}','reset')">戻す</button></div></div>`).join('')}
  <div class="rg-total" id="rgDiscTot"></div>
  <button class="rg-btn pri wide" onclick="closeDlg('rgDiscOverlay')">✓ これで決定</button>`;
  rgDiscTot();
}
function rgDiscTot(){ const e=$('rgDiscTot'); if(e) e.innerHTML=rgTotalHtml(); rgRenderCart(); }
function rgOdType(t){ if(od.t!==t) od={t, v:0}; rgRenderDisc(); }
function rgOdSet(v, chip){ let n=toN(v); if(od.t==='pct') n=Math.min(100,n); od.v=n; if(chip){ const e=$('rgOdV'); if(e) e.value=n||''; } rgDiscTot(); }
function rgOdRound(){ const s=subTotal(), r=s%100||s%10; if(!r){ toast('端数はありません'); return; } od={t:'yen', v:r}; rgRenderDisc(); }
function rgLinePrice(id, v){ const l=cart.find(c=>c.id===id); if(!l) return; l.price=Math.min(l.orig, toN(v)); rgDiscTot(); }
function rgLineQuick(id, k){
  const l=cart.find(c=>c.id===id); if(!l) return;
  l.price=k==='reset'?l.orig:k==='half'?Math.round(l.orig/2):k===10?Math.round(l.price*0.9):Math.max(0,l.price-50);
  const e=$('rgLp_'+id); if(e) e.value=l.price; rgDiscTot();
}
function rgPay(){
  if(!cart.length) return; const tot=total(); let paid=rgPaid();
  if(!paid) paid=tot;   // 預かりを入れていなければ、ちょうどとして記録
  if(paid<tot){ toast('預かった金額がたりません'); return; }
  const ld=lineDisc();
  const sale={id:uid(), no:rg.no++, t:Date.now(), lines:cart.map(l=>Object.assign({id:l.id, name:l.name, price:l.price, qty:l.qty}, l.orig>l.price?{orig:l.orig}:{})), sub:subTotal(), disc:orderDisc(), total:tot, paid, change:paid-tot};
  if(ld) sale.ldisc=ld;
  rg.sales.push(sale);
  sale.lines.forEach(l=>{ const it=itemOf(l.id); if(it && !it.noStock) it.stock-=l.qty; });
  rgSave();
  cart=[]; odReset(); $('rgPaid').value='';
  $('rgDoneBody').innerHTML=`<div class="rg-done-c">お釣り</div><div class="rg-done-v">${yen(sale.change)}</div><div class="rg-done-s">合計 ${yen(sale.total)}　お預かり ${yen(sale.paid)}<br>会計 No.${sale.no}（${hm(sale.t)}）を記録しました</div>`;
  openDlg('rgDoneOverlay');
  rgRefresh();
}
function rgDoneClose(){ if(isDlgOpen('rgDoneOverlay')) closeDlg('rgDoneOverlay'); }

/* ───────── 商品 ───────── */
function rgOpenItems(){ rgRenderItems(); if(!isDlgOpen('rgItemsOverlay')) openDlg('rgItemsOverlay', ()=>rgRefresh()); }
function rgRenderItems(){
  const b=$('rgItemsBody'); if(!b) return;
  b.innerHTML=`<div class="rg-form rg-grid2"><label>イベントの名前<input id="rgEvName" value="${esc(rg.ev.name)}" placeholder="例：秋祭り" oninput="rgEvSet()"></label><label>日付<input id="rgEvDate" type="date" value="${esc(rg.ev.date)}" oninput="rgEvSet()"></label></div>
  <button class="rg-btn pri wide" onclick="rgEditItem()">＋ 商品を登録する</button>
  <div class="rg-items">${rg.items.map((it,i)=>`<div class="rg-item"><span class="ph">${it.photo?`<img src="${it.photo}" alt="">`:'📦'}</span>
    <span class="tx"><b>${esc(it.name)}</b><small>${yen(it.price)}　${it.noStock?'在庫を数えない':`在庫 ${it.stock} / ${it.stock0}`}</small></span>
    <span class="bt"><button onclick="rgMove(${i},-1)" ${i?'':'disabled'}>↑</button><button onclick="rgMove(${i},1)" ${i<rg.items.length-1?'':'disabled'}>↓</button><button onclick="rgEditItem('${it.id}')">直す</button></span></div>`).join('')||'<div class="rg-hint">「＋ 商品を登録する」で、写真・名前・値段・在庫を入れます。</div>'}</div>
  <h4>イベントが終わったら・次のイベント</h4>
  <button class="rg-btn wide" onclick="rgExportXlsx()">📊 売上を Excel に書き出す</button>
  <button class="rg-btn wide" onclick="rgNewEvent()">🔄 新しいイベントを始める（履歴を消して在庫を入れ直す）</button>
  <h4>ほかの端末へ商品をうつす</h4>
  <div class="rg-row"><button class="rg-btn" onclick="rgExportItems()">⬇ 商品を書き出す</button><button class="rg-btn" onclick="$rg('rgItemsFile').click()">⬆ 商品を読み込む</button></div>
  <input type="file" id="rgItemsFile" accept=".json,application/json" style="display:none" onchange="rgImportItems(event)">
  <div class="rg-note">入れたものはこの端末の中だけに残ります。写真は小さくして保存しています。</div>`;
}
function rgEvSet(){ rg.ev.name=$('rgEvName').value.slice(0,40); rg.ev.date=$('rgEvDate').value; rgSave(); rgHeader(); }
function rgMove(i,d){ const j=i+d; if(j<0||j>=rg.items.length) return; [rg.items[i],rg.items[j]]=[rg.items[j],rg.items[i]]; rgSave(); rgRenderItems(); }
function rgEditItem(id){
  const it=id?itemOf(id):null; rgEdit=it?it.id:null; rgPhoto=it?it.photo:'';
  $('rgEditHdr').textContent=it?'商品を直す':'商品を登録する';
  $('rgEditBody').innerHTML=`<div class="rg-ephoto" id="rgEPhoto">${rgPhoto?`<img src="${rgPhoto}" alt="">`:'<span>写真なし</span>'}</div>
    <div class="rg-row"><button class="rg-btn" onclick="$rg('rgCam').click()">📷 撮る</button><button class="rg-btn" onclick="$rg('rgPick').click()">🖼 選ぶ</button><button class="rg-btn" onclick="rgPhotoClear()">写真を消す</button></div>
    <input type="file" id="rgCam" accept="image/*" capture="environment" style="display:none" onchange="rgPhotoIn(event)"><input type="file" id="rgPick" accept="image/*" style="display:none" onchange="rgPhotoIn(event)">
    <div class="rg-form"><label>名前<input id="rgEName" value="${esc(it?it.name:'')}" placeholder="例：手作りクッキー"></label>
    <div class="rg-grid2"><label>値段（円）<input id="rgEPrice" inputmode="numeric" value="${it?it.price:''}" placeholder="300"></label><label>${it?'いまの在庫':'在庫（個数）'}<input id="rgEStock" inputmode="numeric" value="${it?it.stock:''}" placeholder="20"></label></div>
    <label class="rg-sw"><input type="checkbox" id="rgENoStock" ${it&&it.noStock?'checked':''}> 在庫を数えない（ドリンクの量り売りなど）</label></div>
    <div class="rg-row"><button class="rg-btn pri" onclick="rgSaveItem()">✓ 保存</button>${it?`<button class="rg-btn danger" onclick="rgDelItem()">🗑 消す</button>`:''}</div>`;
  if(!isDlgOpen('rgEditOverlay')) openDlg('rgEditOverlay');
  setTimeout(()=>{ const n=$('rgEName'); if(n && !it) n.focus(); },120);
}
function rgPhotoIn(e){
  const f=e.target.files&&e.target.files[0]; if(!f) return; e.target.value='';
  const url=URL.createObjectURL(f); const im=new Image();
  im.onload=()=>{ URL.revokeObjectURL(url); rgCrop={im, w:im.naturalWidth||im.width, h:im.naturalHeight||im.height, z:1, cx:0, cy:0, pts:new Map()};
    rgCrop.cx=rgCrop.w/2; rgCrop.cy=rgCrop.h/2; $('rgCropZ').value=1;
    if(!isDlgOpen('rgCropOverlay')) openDlg('rgCropOverlay', ()=>{ rgCrop=null; }); rgCropDraw(); };
  im.onerror=()=>{ URL.revokeObjectURL(url); toast('写真を読み込めませんでした'); };
  im.src=url;
}
/* 四角の切り取り：見えている四角（canvas 全体）が写真のどこかを cx,cy（中心）と z（大きさ）で持つ */
const CV=560;
function rgCropFit(){ const c=rgCrop; c.z=Math.min(6,Math.max(1,c.z)); const s=CV/Math.min(c.w,c.h)*c.z, half=CV/2/s; c.cx=Math.min(c.w-half,Math.max(half,c.cx)); c.cy=Math.min(c.h-half,Math.max(half,c.cy)); return {s,half}; }
function rgCropDraw(){
  const c=rgCrop, cv=$('rgCropCv'); if(!c||!cv) return; const {half}=rgCropFit();
  const x=cv.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,CV,CV);
  x.drawImage(c.im, c.cx-half, c.cy-half, half*2, half*2, 0, 0, CV, CV);
  x.strokeStyle='rgba(255,255,255,.55)'; x.lineWidth=2; x.beginPath(); [1,2].forEach(i=>{ x.moveTo(CV*i/3,0); x.lineTo(CV*i/3,CV); x.moveTo(0,CV*i/3); x.lineTo(CV,CV*i/3); }); x.stroke();
}
function rgCropZoom(v){ if(!rgCrop) return; rgCrop.z=+v||1; rgCropDraw(); }
function rgCropBind(){
  const cv=$('rgCropCv'); if(!cv||cv._b) return; cv._b=1;
  const k=()=>CV/cv.getBoundingClientRect().width;
  const dist=()=>{ const p=[...rgCrop.pts.values()]; return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y); };
  cv.addEventListener('pointerdown',e=>{ if(!rgCrop) return; try{ cv.setPointerCapture(e.pointerId); }catch(_){} rgCrop.pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); rgCrop.d0=dist(); rgCrop.z0=rgCrop.z; });
  cv.addEventListener('pointermove',e=>{ const c=rgCrop; if(!c||!c.pts.has(e.pointerId)) return; const p=c.pts.get(e.pointerId);
    if(c.pts.size>=2){ p.x=e.clientX; p.y=e.clientY; const d=dist(); if(c.d0>10){ c.z=c.z0*d/c.d0; rgCropFit(); $('rgCropZ').value=c.z; } rgCropDraw(); return; }
    const {s}=rgCropFit(); c.cx-=(e.clientX-p.x)*k()/s; c.cy-=(e.clientY-p.y)*k()/s; p.x=e.clientX; p.y=e.clientY; rgCropDraw(); });
  const up=e=>{ if(rgCrop){ rgCrop.pts.delete(e.pointerId); rgCrop.d0=dist(); rgCrop.z0=rgCrop.z; } };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{ if(!rgCrop) return; e.preventDefault(); rgCrop.z*=Math.exp(-e.deltaY*0.0015); rgCropFit(); $('rgCropZ').value=rgCrop.z; rgCropDraw(); },{passive:false});
}
function rgCropOk(){
  const c=rgCrop; if(!c) return; const {half}=rgCropFit(); const M=320;
  const o=document.createElement('canvas'); o.width=M; o.height=M; o.getContext('2d').drawImage(c.im, c.cx-half, c.cy-half, half*2, half*2, 0, 0, M, M);
  rgPhoto=o.toDataURL('image/jpeg',0.72); $('rgEPhoto').innerHTML=`<img src="${rgPhoto}" alt="">`; closeDlg('rgCropOverlay');
}
function rgPhotoClear(){ rgPhoto=''; $('rgEPhoto').innerHTML='<span>写真なし</span>'; }
function rgSaveItem(){
  const name=$('rgEName').value.trim(); if(!name){ toast('名前を入れてください'); return; }
  const num=v=>Math.max(0,parseInt(String(v).normalize('NFKC').replace(/[^\d]/g,''),10)||0);
  const price=num($('rgEPrice').value), st=parseInt(String($('rgEStock').value).normalize('NFKC').replace(/[^\d-]/g,''),10)||0, noStock=$('rgENoStock').checked;
  if(rgEdit){ const it=itemOf(rgEdit); if(!it) return; const sold=it.stock0-it.stock; Object.assign(it,{name:name.slice(0,40), price, photo:rgPhoto||'', noStock}); if(st!==it.stock){ it.stock=st; it.stock0=Math.max(st+sold, st); } cart.forEach(l=>{ if(l.id===it.id){ const full=l.price===l.orig; l.name=it.name; l.orig=it.price; if(full||l.price>l.orig) l.price=it.price; } }); }
  else rg.items.push({id:uid(), name:name.slice(0,40), price, stock0:Math.max(0,st), stock:st, photo:rgPhoto||'', noStock});
  if(!rgSave()) return;
  closeDlg('rgEditOverlay'); rgRenderItems(); rgRefresh(); toast('保存しました');
}
function rgDelItem(){ const it=itemOf(rgEdit); if(!it||!confirm(`「${it.name}」を消しますか？（販売の記録は残ります）`)) return; rg.items=rg.items.filter(x=>x!==it); cart=cart.filter(l=>l.id!==it.id); rgSave(); closeDlg('rgEditOverlay'); rgRenderItems(); rgRefresh(); }
function rgNewEvent(){
  if(!confirm('販売の履歴を消して、在庫を「最初の数」に戻しますか？\n（先に「📊 Excel に書き出す」で売上を残しておくのがおすすめです）')) return;
  rg.sales=[]; rg.no=1; rg.items.forEach(it=>{ it.stock=it.stock0; }); cart=[]; odReset(); rg.ev.date=''; rgSave(); rgRenderItems(); rgRefresh(); toast('新しいイベントを始めました');
}
function rgDownload(blob, name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }
function rgExportItems(){
  const data={type:'excalc-regi-items', v:1, items:rg.items.map(it=>({name:it.name, price:it.price, stock0:it.stock0, stock:it.stock0, photo:it.photo, noStock:it.noStock}))};
  rgDownload(new Blob([JSON.stringify(data)],{type:'application/json'}), `regi_items_${new Date().toISOString().slice(0,10)}.json`);
}
function rgImportItems(e){
  const f=e.target.files&&e.target.files[0]; if(!f) return; e.target.value='';
  f.text().then(t=>{ const o=JSON.parse(t); if(!o||o.type!=='excalc-regi-items'||!Array.isArray(o.items)) throw 0;
    const add=o.items.filter(x=>x&&typeof x.name==='string').slice(0,300);
    if(!confirm(`${add.length}個の商品を足しますか？（同じ名前の商品は、値段・在庫・写真を入れかえます）`)) return;
    add.forEach(x=>{ const it={name:x.name.slice(0,40), price:Math.max(0,Math.round(+x.price||0)), stock0:Math.max(0,Math.round(+x.stock0||0)), stock:Math.round(+x.stock||+x.stock0||0), photo:typeof x.photo==='string'&&x.photo.startsWith('data:image/')?x.photo:'', noStock:!!x.noStock};
      const old=rg.items.find(y=>y.name===it.name); if(old) Object.assign(old,it); else rg.items.push(Object.assign({id:uid()},it)); });
    rgSave(); rgRenderItems(); rgRefresh(); toast('商品を読み込みました');
  }).catch(()=>toast('商品のファイルを読めませんでした'));
}

/* ───────── 履歴・まとめ ───────── */
function rgStats(){
  const ok=rg.sales.filter(s=>!s.void);
  const by={}; ok.forEach(s=>s.lines.forEach(l=>{ const k=l.id+'|'+l.price; (by[k]=by[k]||{id:l.id,name:l.name,price:l.price,qty:0,amt:0}); by[k].qty+=l.qty; by[k].amt+=l.qty*l.price; }));
  return {count:ok.length, total:ok.reduce((s,x)=>s+x.total,0), disc:ok.reduce((s,x)=>s+(x.disc||0)+(x.ldisc||0),0), qty:ok.reduce((s,x)=>s+x.lines.reduce((a,l)=>a+l.qty,0),0), by:Object.values(by).sort((a,b)=>b.amt-a.amt), voids:rg.sales.length-ok.length};
}
function rgOpenHist(){ rgRenderHist(); if(!isDlgOpen('rgHistOverlay')) openDlg('rgHistOverlay'); }
function rgRenderHist(){
  const b=$('rgHistBody'); if(!b) return; const st=rgStats();
  b.innerHTML=`<div class="rg-sum"><div><small>売上</small><b>${yen(st.total)}</b></div><div><small>会計</small><b>${st.count}件</b></div><div><small>売れた数</small><b>${st.qty}個</b></div></div>
  ${st.disc?`<div class="rg-hint">値引きの合計 ${yen(st.disc)}${st.voids?`・取り消し ${st.voids}件`:''}</div>`:st.voids?`<div class="rg-hint">取り消し ${st.voids}件</div>`:''}
  <button class="rg-btn pri wide" onclick="rgExportXlsx()">📊 Excel に書き出す</button>
  <h4>商品ごと</h4>
  <table class="rg-t"><tr><th>商品</th><th>売れた</th><th>売上</th><th>残り</th></tr>${st.by.map(x=>{ const it=itemOf(x.id); return `<tr><td>${esc(x.name)}<small>${yen(x.price)}</small></td><td>${x.qty}</td><td>${yen(x.amt)}</td><td>${it&&!it.noStock?it.stock:'—'}</td></tr>`; }).join('')||'<tr><td colspan="4">まだ売れていません</td></tr>'}</table>
  <h4>会計の記録（新しい順）</h4>
  <div class="rg-sales">${rg.sales.slice().reverse().map(s=>`<div class="rg-sale${s.void?' void':''}"><div class="h"><b>No.${s.no}</b><span>${stamp(s.t)}</span><b class="t">${yen(s.total)}</b></div>
    <div class="l">${s.lines.map(l=>`${esc(l.name)} ×${l.qty}${l.orig>l.price?`（${yen(l.orig)}→${yen(l.price)}）`:''}`).join('、')}${s.disc?`（値引き −${yen(s.disc)}）`:''}</div>
    <div class="f">預かり ${yen(s.paid)}・お釣り ${yen(s.change)}${s.void?'　<b>取り消し済み</b>':`<button onclick="rgVoid('${s.id}')">取り消す</button>`}</div></div>`).join('')||'<div class="rg-hint">まだ会計はありません</div>'}</div>`;
}
function rgVoid(id){
  const s=rg.sales.find(x=>x.id===id); if(!s||s.void) return;
  if(!confirm(`No.${s.no}（${yen(s.total)}）の会計を取り消しますか？在庫は元に戻ります（記録には「取り消し」と残ります）。`)) return;
  s.void=true; s.lines.forEach(l=>{ const it=itemOf(l.id); if(it && !it.noStock) it.stock+=l.qty; }); rgSave(); rgRenderHist(); rgRefresh(); toast('取り消しました');
}
/* Excel（.xlsx）。数は数として入れる（あとで合計できるように） */
function rgSheetXml(rows, widths){
  const Pz='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const cols='<cols>'+widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols>';
  const body=rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((v,ci)=>{
    if(v==null||v==='') return ''; const ref=xlColLetter(ci)+(ri+1), s=ri===0?' s="1"':(typeof v==='number'&&Math.abs(v)>=1000&&Number.isInteger(v)?' s="2"':'');
    if(typeof v==='number' && isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xlEsc(String(v))}</t></is></c>`;
  }).join('')+'</row>').join('');
  return `${Pz}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${body}</sheetData></worksheet>`;
}
function rgXlsxSheets(){
  const st=rgStats();
  const det=[['会計No.','日時','商品','単価','個数','小計','定価','品の値引き','会計の合計','全体の値引き','預かり','お釣り','取り消し']];
  rg.sales.forEach(s=>s.lines.forEach((l,i)=>{ const o=l.orig>l.price?l.orig:l.price; det.push([s.no, stamp(s.t), l.name, l.price, l.qty, l.price*l.qty, o, (o-l.price)*l.qty, i?'':s.total, i?'':(s.disc||0), i?'':s.paid, i?'':s.change, s.void?'○':'']); }));
  const per=[['会計No.','日時','点数','定価の合計','品の値引き','全体の値引き','合計','預かり','お釣り','取り消し']].concat(rg.sales.map(s=>[s.no, stamp(s.t), s.lines.reduce((a,l)=>a+l.qty,0), s.sub+(s.ldisc||0), s.ldisc||0, s.disc||0, s.total, s.paid, s.change, s.void?'○':'']));
  const prod=[['商品','単価','最初の在庫','売れた数','売上','残り']];
  rg.items.forEach(it=>{ const rows=st.by.filter(x=>x.id===it.id); const q=rows.reduce((a,x)=>a+x.qty,0), amt=rows.reduce((a,x)=>a+x.amt,0); prod.push([it.name, it.price, it.noStock?'':it.stock0, q, amt, it.noStock?'':it.stock]); });
  st.by.filter(x=>!itemOf(x.id)).forEach(x=>prod.push([x.name+'（消した商品）', x.price, '', x.qty, x.amt, '']));
  const sum=[['項目','値'],['イベント',rg.ev.name||''],['日付',rg.ev.date||''],['売上の合計',st.total],['会計の件数',st.count],['売れた個数',st.qty],['値引きの合計',st.disc],['取り消した会計',st.voids],['書き出した日時',stamp(Date.now())]];
  return [['販売履歴', rgSheetXml(det,[8,17,22,8,6,9,8,10,11,11,9,8,8])], ['会計ごと', rgSheetXml(per,[8,17,6,10,10,11,9,9,8,8])], ['商品別', rgSheetXml(prod,[24,8,10,9,10,7])], ['まとめ', rgSheetXml(sum,[16,22])]];
}
async function rgBuildXlsx(){
  const enc=new TextEncoder(), Pz='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const sheets=rgXlsxSheets();
  const styles=`${Pz}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3E0"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const wb=`${Pz}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((x,i)=>`<sheet name="${xlEsc(x[0])}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
  const wbRels=`${Pz}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((x,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const rootRels=`${Pz}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const ct=`${Pz}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((x,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const files=[{name:'[Content_Types].xml', u8:enc.encode(ct)}, {name:'_rels/.rels', u8:enc.encode(rootRels)}, {name:'xl/workbook.xml', u8:enc.encode(wb)}, {name:'xl/_rels/workbook.xml.rels', u8:enc.encode(wbRels)}, {name:'xl/styles.xml', u8:enc.encode(styles)}];
  sheets.forEach((x,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`, u8:enc.encode(x[1])}));
  return await xlsxZip(files);
}
async function rgExportXlsx(){
  if(!rg.sales.length && !confirm('まだ会計がありません。商品と在庫だけを書き出しますか？')) return;
  try{ const blob=await rgBuildXlsx(); const d=new Date(); const nm=(rg.ev.name||'即売レジ').replace(/[\\/:*?"<>|]/g,'')+'_'+d.getFullYear()+P2(d.getMonth()+1)+P2(d.getDate())+'.xlsx';
    const file=new File([blob], nm, {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    if(navigator.canShare && navigator.canShare({files:[file]}) && confirm('Excel ファイルを共有（メール・LINE・ドライブなど）しますか？\n「キャンセル」で端末に保存します。')){ navigator.share({files:[file], title:nm}).catch(()=>{}); return; }
    rgDownload(blob, nm); toast('Excel に書き出しました：'+nm, 3000);
  }catch(e){ console.error(e); toast('書き出せませんでした'); }
}

/* ───────── 画面 ───────── */
const RG_CSS=`
#regiOverlay .rg-modal{ display:flex; flex-direction:column; }
.rg-top{ display:flex; gap:6px; padding:6px 10px; align-items:center; border-bottom:1px solid rgba(120,132,156,.25); }
.rg-top .ev{ flex:1; font-size:13px; font-weight:bold; color:var(--text-light,#777); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.rg-top button{ height:36px; padding:0 11px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.rg-main{ flex:1; min-height:0; display:flex; flex-direction:column; }
.rg-gridwrap{ flex:1; min-height:0; overflow:auto; padding:8px; }
#rgGrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); gap:8px; }
.rg-tile{ position:relative; display:flex; flex-direction:column; align-items:stretch; padding:0 0 6px; border-radius:12px; border:2px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; overflow:hidden; text-align:center; touch-action:manipulation; }
.rg-tile:active{ transform:scale(.97); }
.rg-tile.in{ border-color:#fb8c00; box-shadow:0 0 0 2px rgba(251,140,0,.25); }
.rg-tile .ph{ position:relative; display:block; height:0; padding-top:100%; overflow:hidden; background:rgba(120,132,156,.12); } .rg-tile .ph img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.rg-tile .noph{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:bold; color:var(--text-light,#999); }
.rg-tile .nm{ font-size:13px; font-weight:bold; padding:4px 4px 0; line-height:1.3; max-height:2.6em; overflow:hidden; }
.rg-tile .pr{ font-size:15px; font-weight:bold; color:#e65100; }
.rg-tile .st{ font-size:11px; color:var(--text-light,#777); } .rg-tile .st.low{ color:#d32f2f; font-weight:bold; }
.rg-tile .q{ position:absolute; top:6px; right:6px; min-width:28px; height:28px; padding:0 6px; border-radius:14px; background:#fb8c00; color:#fff; font-size:16px; font-weight:bold; line-height:28px; box-shadow:0 1px 3px rgba(0,0,0,.3); }
.rg-tile.out{ opacity:.55; } .rg-tile.out .ph{ filter:grayscale(1); }
.rg-cart{ border-top:2px solid #fb8c00; background:var(--modal-bg,#fff); padding:6px 10px calc(8px + var(--safe-bottom,0px)); max-height:52%; display:flex; flex-direction:column; }
.rg-cart-list{ overflow:auto; min-height:0; max-height:26vh; }
.rg-line{ display:flex; align-items:center; gap:6px; padding:4px 0; border-bottom:1px solid rgba(120,132,156,.15); font-size:14px; }
.rg-line .u s{ display:block; font-size:11px; line-height:1; } .rg-line.dc .u{ color:#d32f2f; font-weight:bold; }
.rg-line .n{ flex:1; font-weight:bold; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; } .rg-line .u{ font-size:12px; color:var(--text-light,#888); } .rg-line .a{ min-width:70px; text-align:right; font-weight:bold; }
.rg-line button{ width:34px; height:34px; border-radius:50%; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:18px; font-weight:bold; cursor:pointer; } .rg-line b{ min-width:20px; text-align:center; font-size:16px; }
.rg-hint{ font-size:12.5px; color:var(--text-light,#888); padding:6px 2px; }
.rg-total{ display:flex; align-items:baseline; justify-content:flex-end; gap:8px; flex-wrap:wrap; font-size:15px; margin-top:4px; } .rg-total b{ font-size:28px; color:#e65100; } .rg-total small{ font-size:12px; color:var(--text-light,#888); }
.rg-total small:first-child:not(:last-child){ flex-basis:100%; text-align:right; line-height:1.4; } #rgDiscTot{ border-top:1px solid rgba(120,132,156,.25); padding-top:6px; }
.rg-payrow{ display:flex; gap:6px; align-items:center; margin-top:4px; } .rg-payrow input{ flex:1; min-width:0; height:44px; font-size:20px; text-align:right; padding:0 10px; border:2px solid rgba(120,132,156,.45); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.rg-quick{ display:flex; gap:5px; overflow-x:auto; margin-top:5px; scrollbar-width:none; } .rg-quick::-webkit-scrollbar{ display:none; }
.rg-quick button{ flex:none; height:34px; padding:0 10px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; }
.rg-change{ text-align:right; font-size:15px; margin-top:4px; min-height:24px; } .rg-change b{ font-size:24px; color:#1e88e5; } .rg-change .short{ color:#d32f2f; font-weight:bold; } .rg-change .dim{ font-size:12px; color:var(--text-light,#999); }
.rg-acts{ display:flex; gap:6px; margin-top:6px; }
.rg-btn{ height:44px; padding:0 14px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.rg-btn.pri{ background:#fb8c00; border-color:#fb8c00; color:#fff; } .rg-btn.pri:disabled{ opacity:.45; } .rg-btn.danger{ color:#d32f2f; border-color:rgba(211,47,47,.4); }
.rg-btn.wide{ display:block; width:100%; margin:8px 0; } .rg-btn.big{ flex:1; height:52px; font-size:18px; }
.rg-cart.empty .rg-payrow,.rg-cart.empty .rg-quick,.rg-cart.empty .rg-change,.rg-cart.empty .rg-acts,.rg-cart.empty .rg-total{ display:none; }
.rg-empty{ text-align:center; padding:40px 12px; color:var(--text-light,#888); line-height:2; }
.rg-body{ padding:10px 14px calc(16px + var(--safe-bottom,0px)); overflow:auto; font-size:14px; line-height:1.6; color:var(--text,#222); }
.rg-body h4{ font-size:14px; color:#e65100; margin:16px 0 6px; border-left:4px solid #fb8c00; padding-left:8px; }
.rg-form label{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:6px 0; }
.rg-form input:not([type=checkbox]){ display:block; width:100%; box-sizing:border-box; margin-top:3px; height:44px; padding:0 10px; font-size:17px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.rg-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:0 10px; } .rg-grid2>*{ min-width:0; }
.rg-form label.rg-sw{ display:flex; align-items:center; gap:8px; color:var(--text,#222); font-size:13.5px; } .rg-sw input{ width:20px; height:20px; }
.rg-row{ display:flex; gap:6px; margin:8px 0; } .rg-row .rg-btn{ flex:1; }
.rg-items{ margin:6px 0; } .rg-item{ display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid rgba(120,132,156,.2); }
.rg-item .ph{ width:52px; height:52px; flex:none; border-radius:8px; overflow:hidden; background:rgba(120,132,156,.12); display:flex; align-items:center; justify-content:center; font-size:22px; } .rg-item .ph img{ width:100%; height:100%; object-fit:cover; }
.rg-item .tx{ flex:1; min-width:0; } .rg-item .tx b{ display:block; } .rg-item .tx small{ color:var(--text-light,#888); }
.rg-item .bt{ display:flex; gap:4px; } .rg-item .bt button{ height:34px; min-width:34px; padding:0 8px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; } .rg-item .bt button:disabled{ opacity:.3; }
.rg-ephoto{ width:150px; height:150px; margin:4px auto 8px; border-radius:12px; overflow:hidden; background:rgba(120,132,156,.12); display:flex; align-items:center; justify-content:center; color:var(--text-light,#999); } .rg-ephoto img{ width:100%; height:100%; object-fit:cover; }
.rg-note{ margin:10px 0; padding:8px 10px; border-radius:8px; background:rgba(120,132,156,.1); font-size:12.5px; }
.rg-sum{ display:grid; grid-template-columns:repeat(3,1fr); gap:6px; } .rg-sum div{ padding:8px; border-radius:10px; background:rgba(251,140,0,.1); text-align:center; } .rg-sum small{ display:block; font-size:12px; color:var(--text-light,#888); } .rg-sum b{ font-size:19px; }
.rg-t{ width:100%; border-collapse:collapse; font-size:13.5px; } .rg-t th,.rg-t td{ border-bottom:1px solid rgba(120,132,156,.25); padding:6px 4px; text-align:right; } .rg-t th:first-child,.rg-t td:first-child{ text-align:left; } .rg-t td small{ display:block; color:var(--text-light,#888); font-size:11.5px; }
.rg-sale{ padding:8px 6px; border-bottom:1px solid rgba(120,132,156,.25); } .rg-sale .h{ display:flex; gap:8px; align-items:baseline; } .rg-sale .h span{ flex:1; font-size:12.5px; color:var(--text-light,#888); } .rg-sale .t{ font-size:16px; }
.rg-sale .l{ font-size:13px; margin:2px 0; } .rg-sale .f{ font-size:12px; color:var(--text-light,#888); display:flex; align-items:center; gap:8px; } .rg-sale .f button{ margin-left:auto; height:30px; padding:0 10px; border-radius:8px; border:1px solid rgba(211,47,47,.4); background:transparent; color:#d32f2f; font-weight:bold; cursor:pointer; }
.rg-sale.void .h,.rg-sale.void .l{ text-decoration:line-through; opacity:.55; }
/* 横向き：左に商品、右に会計 */
@media (orientation:landscape) and (min-width:560px){
  .rg-main{ flex-direction:row; }
  .rg-cart{ flex:0 0 min(42%,440px); max-height:none; min-height:0; overflow:auto; border-top:0; border-left:2px solid #fb8c00; padding-top:8px; box-sizing:border-box; }
  .rg-cart-list{ flex:1 1 60px; max-height:none; min-height:48px; }
  .rg-top{ padding:4px 10px; } .rg-top button{ height:32px; }
  #rgGrid{ grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); }
  .rg-change{ min-height:0; } .rg-change .dim{ display:none; } .rg-payrow input{ height:40px; } .rg-btn.big{ height:46px; } .rg-total b{ font-size:24px; }
}
.rg-dtype{ display:flex; gap:0; margin:4px 0; } .rg-dtype button{ flex:1; height:38px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.rg-dtype button:first-child{ border-radius:10px 0 0 10px; } .rg-dtype button:last-child{ border-radius:0 10px 10px 0; } .rg-dtype button.on{ background:#fb8c00; border-color:#fb8c00; color:#fff; }
.rg-payrow .un{ font-size:14px; font-weight:bold; white-space:nowrap; }
.rg-dline{ padding:6px 0; border-bottom:1px solid rgba(120,132,156,.2); } .rg-dline .t small{ margin-left:8px; color:var(--text-light,#888); }
.rg-dline .c{ display:flex; align-items:center; gap:4px; margin-top:4px; flex-wrap:wrap; } .rg-dline .c input{ width:84px; height:38px; font-size:17px; text-align:right; padding:0 8px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.rg-dline .c button{ height:34px; padding:0 9px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; }
.rg-cropbox{ width:min(280px,72vw); aspect-ratio:1/1; margin:4px auto 8px; } #rgCropCv{ width:100%; height:100%; display:block; border-radius:10px; touch-action:none; cursor:grab; }
.rg-cropz{ display:flex; align-items:center; gap:8px; font-size:13px; } .rg-cropz input{ flex:1; }
#rgDoneOverlay .modal{ text-align:center; } .rg-done-c{ font-size:16px; color:var(--text-light,#888); margin-top:10px; } .rg-done-v{ font-size:48px; font-weight:bold; color:#1e88e5; line-height:1.2; } .rg-done-s{ font-size:13.5px; color:var(--text-light,#777); margin:8px 0 14px; line-height:1.7; }
`;
function rgEnsureDom(){
  if($('regiOverlay')) return;
  const st=document.createElement('style'); st.id='rgStyle'; st.textContent=RG_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="regiOverlay">
  <div class="modal vol-modal rg-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🛍 即売レジ</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center"><button class="modal-close" onclick="closeRegi()" aria-label="閉じる">✕</button></span></div>
    <div class="rg-top"><span class="ev" id="rgEv"></span><button onclick="rgOpenHist()">📋 履歴・売上</button><button onclick="rgOpenItems()">📦 商品</button></div>
    <div class="rg-main">
    <div class="rg-gridwrap"><div id="rgGrid"></div></div>
    <div class="rg-cart empty" id="rgCart">
      <div class="rg-cart-list" id="rgCartList"></div>
      <div class="rg-total" id="rgTotal"></div>
      <div class="rg-payrow"><span style="font-size:13px;font-weight:bold">お預かり</span><input id="rgPaid" inputmode="numeric" placeholder="0" oninput="rgCartRender()"></div>
      <div class="rg-quick"><button onclick="rgSetPaid('just')">ちょうど</button><button onclick="rgSetPaid(1000)">¥1,000</button><button onclick="rgSetPaid(2000)">¥2,000</button><button onclick="rgSetPaid(3000)">¥3,000</button><button onclick="rgSetPaid(5000)">¥5,000</button><button onclick="rgSetPaid(10000)">¥10,000</button></div>
      <div class="rg-change" id="rgChange"></div>
      <div class="rg-acts"><button class="rg-btn" onclick="rgClearCart()">✕ 取り消し</button><button class="rg-btn" id="rgDiscBtn" onclick="rgDisc()">🏷 値引き</button><button class="rg-btn pri big" id="rgPayBtn" onclick="rgPay()">✓ 会計する</button></div>
    </div>
    </div>
  </div>
</div>
<div class="modal-overlay" id="rgItemsOverlay" onclick="if(event.target===this)closeDlg('rgItemsOverlay')"><div class="modal"><div class="modal-header"><span>📦 商品とイベント</span><button class="modal-close" onclick="closeDlg('rgItemsOverlay')" aria-label="閉じる">✕</button></div><div class="rg-body" id="rgItemsBody"></div></div></div>
<div class="modal-overlay" id="rgEditOverlay" onclick="if(event.target===this)closeDlg('rgEditOverlay')"><div class="modal"><div class="modal-header"><span id="rgEditHdr"></span><button class="modal-close" onclick="closeDlg('rgEditOverlay')" aria-label="閉じる">✕</button></div><div class="rg-body" id="rgEditBody"></div></div></div>
<div class="modal-overlay" id="rgHistOverlay" onclick="if(event.target===this)closeDlg('rgHistOverlay')"><div class="modal"><div class="modal-header"><span>📋 履歴・売上</span><button class="modal-close" onclick="closeDlg('rgHistOverlay')" aria-label="閉じる">✕</button></div><div class="rg-body" id="rgHistBody"></div></div></div>
<div class="modal-overlay" id="rgDiscOverlay" onclick="if(event.target===this)closeDlg('rgDiscOverlay')"><div class="modal"><div class="modal-header"><span>🏷 値引き</span><button class="modal-close" onclick="closeDlg('rgDiscOverlay')" aria-label="閉じる">✕</button></div><div class="rg-body" id="rgDiscBody"></div></div></div>
<div class="modal-overlay" id="rgCropOverlay"><div class="modal"><div class="modal-header"><span>✂ 四角に切り取る</span><button class="modal-close" onclick="closeDlg('rgCropOverlay')" aria-label="閉じる">✕</button></div><div class="rg-body">
  <div class="rg-cropbox"><canvas id="rgCropCv" width="560" height="560"></canvas></div>
  <div class="rg-cropz"><span>小</span><input type="range" id="rgCropZ" min="1" max="6" step="0.01" value="1" oninput="rgCropZoom(this.value)"><span>大</span></div>
  <div class="rg-hint">指で動かして位置を合わせます。つまみ（2本指）で大きくできます。</div>
  <div class="rg-row"><button class="rg-btn" onclick="closeDlg('rgCropOverlay')">やめる</button><button class="rg-btn pri" id="rgCropOkBtn" onclick="rgCropOk()">✓ この四角で使う</button></div></div></div></div>
<div class="modal-overlay" id="rgDoneOverlay" onclick="if(event.target===this)rgDoneClose()"><div class="modal"><div class="modal-header"><span>✓ 会計しました</span><button class="modal-close" onclick="rgDoneClose()" aria-label="閉じる">✕</button></div><div class="rg-body"><div id="rgDoneBody"></div><button class="rg-btn pri wide" onclick="rgDoneClose()">次のお客さん</button></div></div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  rgCropBind();
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function rgHeader(){ const e=$('rgEv'); if(e) e.textContent=(rg.ev.name||'イベント名なし')+(rg.ev.date?'（'+rg.ev.date.replace(/-/g,'/')+'）':'')+`・売上 ${yen(rgStats().total)}`; }
function openRegi(){
  rgEnsureDom(); rgLoad(); cart=[]; odReset();
  openDlg('regiOverlay'); rgRefresh(); rgHeader();
}
function closeRegi(){ if(!$('regiOverlay')||!isDlgOpen('regiOverlay')) return; if(cart.length && !confirm('会計していない注文があります。閉じますか？（注文は消えます）')) return; ['rgDoneOverlay','rgCropOverlay','rgDiscOverlay','rgEditOverlay','rgItemsOverlay','rgHistOverlay'].forEach(id=>{ if(isDlgOpen(id)) closeDlg(id); }); closeDlg('regiOverlay'); }
const _ref=rgRefresh; rgRefresh=function(){ _ref(); rgHeader(); };

Object.assign(window, { openRegi, closeRegi, rgAdd, rgQty, rgClearCart, rgSetPaid, rgDisc, rgOdType, rgOdSet, rgOdRound, rgLinePrice, rgLineQuick, rgCropZoom, rgCropOk, rgPay, rgDoneClose, rgCartRender:rgRenderCart,
  rgOpenItems, rgEditItem, rgSaveItem, rgDelItem, rgPhotoIn, rgPhotoClear, rgMove, rgEvSet, rgNewEvent, rgExportItems, rgImportItems,
  rgOpenHist, rgVoid, rgExportXlsx, $rg:$,
  rgState:()=>JSON.parse(JSON.stringify({rg, cart, od, disc:orderDisc(), ldisc:lineDisc(), total:total(), crop:rgCrop?{w:rgCrop.w,h:rgCrop.h,z:rgCrop.z,cx:rgCrop.cx,cy:rgCrop.cy}:null})), rgXlsxRows:()=>rgXlsxSheets().map(x=>x[0]), rgBuildXlsx });
})();
