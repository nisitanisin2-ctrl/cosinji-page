/* 📷 レシート読み取り（v561。表電卓の道具。apps/receipt/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   レシートを撮る・写真から選ぶ と、この端末の中で文字を読み取り（vendor/ocr の Tesseract。写真はどこにも送らない）、
   店・日付・合計・消費税（8%・10%）・品目と金額 を取り出す。読み取った値は直せる。
   ・文字を読む部品（約8MB）は、はじめて読むときにだけ読み込む。端末が SIMD を使えないときは そうでない方を読む。
   ・読みにくいときは 写真を回す・✂ 範囲をえらぶ で読み直す。ほかのアプリで読んだ文字を 📋 貼って 取り出すこともできる。
   ・▦ 表に入れる（1行：日付・店・合計／品目ごと）・📋 コピー・💾 残す（📒 残したレシート：月ごとの合計・まとめて表に入れる）。
   ・残したレシートは excalc_receipt（写真は残さない。この端末の中だけ）。 */
(function(){
const RC_KEY='excalc_receipt', MAX_LIST=500, MAX_ITEMS=120, OCR_DIR='vendor/ocr/';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,n);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const yen=n=>(n<0?'−':'')+Math.abs(Math.round(n)).toLocaleString('ja-JP')+'円';
const pad=n=>String(n).padStart(2,'0');

/* ───────── 読み取った文字から取り出す ───────── */
const CJK='\\u3000-\\u303f\\u3040-\\u30ff\\u3400-\\u9fff\\uf900-\\ufaff\\uff01-\\uff60';
const CJK_GAP=new RegExp('(['+CJK+'])[ \\t]+(?=['+CJK+'])','g');
function normLines(t){
  let s=String(t||'').normalize('NFKC').replace(/\r\n?/g,'\n').replace(/[￥]/g,'¥');
  for(let i=0;i<3;i++) s=s.replace(CJK_GAP,'$1');   // 読み取りは日本語の1字ごとに空白を入れるので、つめる
  return s.split('\n').map(x=>x.replace(/[ \t]+/g,' ').trim()).filter(x=>x && !/^[\s\-=_~*・.,。、|:;'"`]+$/.test(x));
}
const K_TOTAL=/(合計|お?会計|総額|ご?請求|お?支払(い)?(金額|合計|額)|お?買上(げ)?(計|金額|合計)?|税込(合)?計)/;
const K_SUB=/小計/;
const K_TAX=/税/;
const K_PAY=/(預り|預かり|お預|釣り|釣銭|お釣|おつり|現金|クレジット|カード|電子マネー|paypay|ペイペイ|quicpay|\bid\b|suica|pasmo|交通系|waon|nanaco|楽天|d払|aupay|メルペイ|ポイント|残高|支払方法|ご利用)/i;
const K_SKIP=/(tel|電話|〒|レジ|責|no\.|登録番号|伝票|取引|担当|領収|レシート|ありがとう|ようこそ|営業時間|http|www|\.com|\.jp|点数|個数|対象(?!.*税)|お客様|会員|カード番号|有効期限|承認|端末)/i;
const K_DISC=/(値引|割引|引き|クーポン|off\b|ディスカウント)/i;
const K_QTY=/(@|単価?|単\s*\d)|[x×]\s*\d+\s*(個|コ|点)?|\d+\s*(個|コ|点)\s*[x×@]/i;
const RE_DATE=[/(20\d{2})\s*[年\/\-.]\s*(\d{1,2})\s*[月\/\-.]\s*(\d{1,2})/, /(?:令和|R)\s*(元|\d{1,2})\s*[年\/.]\s*(\d{1,2})\s*[月\/.]\s*(\d{1,2})/i, /(?:^|[^\d])(\d{2})[\/.](\d{1,2})[\/.](\d{1,2})(?:[^\d]|$)/];
function findDate(L){
  for(const l of L){
    for(let k=0;k<RE_DATE.length;k++){
      const m=RE_DATE[k].exec(l); if(!m) continue;
      let y=k===1?(m[1]==='元'?2019:2018+(+m[1])):k===2?2000+(+m[1]):+m[1];
      const mo=+m[2], d=+m[3];
      if(y>=2000&&y<=2099&&mo>=1&&mo<=12&&d>=1&&d<=31) return y+'-'+pad(mo)+'-'+pad(d);
    }
  }
  return '';
}
/* 行のおしりの金額。¥・円・税のしるし（※ * 軽 外 内）を見て、時刻・電話番号・番号は金額にしない */
function tailAmount(l){
  const s=l.replace(/[)\]}」』]+\s*$/,'').trim();
  const m=/^(.*?)([-−△▲]?)\s*([¥\\]|[Yy](?=\d))?\s*(\d{1,3}(?:[,.]\d{3})+|\d+)\s*(円)?\s*(?:[※*軽外内非]|[A-Za-z]{1,2})?\s*$/.exec(s);
  if(!m) return null;
  const head=m[1].trim(), mark=!!(m[3]||m[5]), digits=m[4];
  if(/^0\d/.test(digits)) return null;                       // 0123（番号）
  if(!mark){
    if(/[:\-\/.#]$/.test(head) || /[:\-\/.#]\s*$/.test(m[1])) return null;   // 12:34・0284-00-1234・No.12
    if(head && /\d$/.test(head) && !K_QTY.test(head)) return null;   // 2コX単98 196 は よい
    if(head && !/\s$/.test(m[1]) && /[A-Za-z]$/.test(head) && digits.length<2) return null;
  }
  const v=+digits.replace(/[,.]/g,'');
  if(!isFinite(v) || v>10000000) return null;
  return {head:head.replace(/[¥\\:：\s]+$/,'').trim(), v:m[2]?-v:v, mark};
}
function cleanName(h){
  return h.replace(/^\d{4,}\s*/,'').replace(/^[*※・\-]+\s*/,'').replace(/\s*[※*軽外内]+$/,'').replace(/\s+/g,' ').trim().slice(0,40);
}
function findStore(L){
  for(const l of L.slice(0,7)){
    if(l.length<2 || K_SKIP.test(l) || K_TOTAL.test(l) || K_PAY.test(l)) continue;
    if(RE_DATE.some(r=>r.test(l)) || /\d{1,2}:\d{2}/.test(l)) continue;
    if(/\d{2,4}-\d{2,4}-\d{3,4}/.test(l) || /[都道府県市区町村郡].*\d/.test(l)) continue;   // 電話・住所
    if(tailAmount(l)) continue;
    if(!/[A-Za-z぀-ヿ㐀-鿿]{2,}/.test(l)) continue;
    return l.replace(/^[*★☆◆◇■□●○\s]+|[*★☆◆◇■□●○\s]+$/g,'').slice(0,40);
  }
  return '';
}
function parseReceipt(text){
  const L=normLines(text), out={store:findStore(L), date:findDate(L), total:0, tax8:0, tax10:0, items:[], raw:String(text||'')};
  const totals=[], subs=[], pays={dep:0, chg:0}; let endIdx=L.length, pendingName='';
  L.forEach((l,i)=>{
    const a=tailAmount(l), lo=l.toLowerCase();
    if(K_TOTAL.test(l) && !/(点数|個数|小計|対象)/.test(l)){ if(a) totals.push(a.v); if(i<endIdx) endIdx=i; return; }
    if(K_SUB.test(l)){ if(a) subs.push(a.v); if(i<endIdx) endIdx=i; return; }
    if(K_TAX.test(l) && a && !/対象(?!.*税)/.test(l)){
      if(/10\s*%|10%/.test(l)) out.tax10+=Math.abs(a.v); else if(/8\s*%|軽/.test(l)) out.tax8+=Math.abs(a.v); else if(!out.tax10) out.tax10+=Math.abs(a.v);
      return;
    }
    if(K_PAY.test(lo)){ if(a){ if(/(預)/.test(l)) pays.dep=a.v; else if(/(釣|つり)/.test(l)) pays.chg=a.v; } return; }
    if(i>endIdx) return;                                   // 合計より下は 品目ではない
    if(K_SKIP.test(l) || RE_DATE.some(r=>r.test(l))){ pendingName=''; return; }
    if(!a){ pendingName=(/[A-Za-z぀-ヿ㐀-鿿]{2,}/.test(l) && l.length<=40)?l:''; return; }
    if(i===0 && !a.mark) return;
    let name=cleanName(a.head), v=a.v;
    if(K_QTY.test(a.head)){                                 // 2コX単100 200 のような行：上の行が品名
      const q=/(\d+)\s*(個|コ|点)/.exec(a.head);
      name=pendingName?cleanName(pendingName)+(q?' ×'+q[1]:''):name;
    }
    if(K_DISC.test(l) && v>0) v=-v;
    if(!name || /^[\d\s,.¥\\]+$/.test(name)) name=pendingName?cleanName(pendingName):'（品名なし）';
    pendingName='';
    if(out.items.length<MAX_ITEMS) out.items.push({n:name, p:v});
  });
  const itemSum=out.items.reduce((s,x)=>s+x.p,0);
  if(totals.length) out.total=Math.max(...totals);
  else if(subs.length){ const sub=Math.max(...subs); out.total=(out.tax8||out.tax10)&&L.some(l=>/外税/.test(l))?sub+out.tax8+out.tax10:sub; }
  else if(pays.dep && pays.chg>=0 && pays.dep>pays.chg) out.total=pays.dep-pays.chg;
  else out.total=Math.max(0,itemSum);
  return out;
}

/* ───────── 残したレシート ───────── */
const okDate=d=>{ const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(d||''); return !!m && +m[2]>=1 && +m[2]<=12 && +m[3]>=1 && +m[3]<=31; };
let st=null;   // {v, list:[{id,t,store,date,total,tax8,tax10,items:[{n,p}],memo}], tab}
function cleanRec(r){
  if(!r||typeof r!=='object') return null;
  const n=v=>{ const x=Math.round(+v); return isFinite(x)&&Math.abs(x)<=100000000?x:0; };
  return {id:typeof r.id==='string'&&r.id?r.id.slice(0,40):uid('r'), t:+r.t||Date.now(), store:line(r.store,40), date:okDate(r.date)?r.date:'',
    total:n(r.total), tax8:n(r.tax8), tax10:n(r.tax10), memo:line(r.memo,80),
    items:(Array.isArray(r.items)?r.items:[]).slice(0,MAX_ITEMS).map(x=>x&&typeof x==='object'?{n:line(x.n,40), p:n(x.p)}:null).filter(x=>x&&(x.n||x.p))};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(RC_KEY)||'null'); }catch(_){}
  st={v:1, list:((o&&Array.isArray(o.list))?o.list:[]).slice(0,MAX_LIST).map(cleanRec).filter(Boolean), tab:o&&o.tab==='list'?'list':'read'};
}
function save(){ try{ localStorage.setItem(RC_KEY, JSON.stringify(st)); return true; }catch(_){ toast('保存できませんでした（端末の空きが足りないかもしれません）'); return false; } }

/* ───────── 文字を読む部品 ───────── */
let worker=null, workerP=null, busy=false;
const SIMD_TEST=new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]);
function loadScript(src){
  return new Promise((res,rej)=>{ if(window.Tesseract) return res(); const sc=document.createElement('script'); sc.src=src; sc.onload=()=>res(); sc.onerror=()=>{ sc.remove(); rej(new Error('script')); }; document.head.appendChild(sc); });
}
function getWorker(){
  if(worker) return Promise.resolve(worker);
  if(workerP) return workerP;
  workerP=(async()=>{
    await loadScript(OCR_DIR+'tesseract.min.js');
    let simd=false; try{ simd=WebAssembly.validate(SIMD_TEST); }catch(_){}
    const w=await window.Tesseract.createWorker('jpn', 1, {
      workerPath:OCR_DIR+'worker.min.js', corePath:OCR_DIR+'tesseract-core-'+(simd?'simd-':'')+'lstm.js', langPath:OCR_DIR.replace(/\/$/,''),
      workerBlobURL:false, cacheMethod:'none', gzip:true,
      logger:m=>progress(m), errorHandler:e=>{ console.warn('ocr', e); } });
    try{ await w.setParameters({ tessedit_pageseg_mode:'6', preserve_interword_spaces:'1' }); }catch(_){}   // 1つのかたまりとして読む（右はしの金額の列も同じ行に入る）
    worker=w; return w;
  })();
  workerP.catch(()=>{ workerP=null; });
  return workerP;
}
function stopWorker(){ const w=worker; worker=null; workerP=null; if(w) try{ w.terminate(); }catch(_){} }
const STAGE={'loading tesseract core':'文字を読む部品を読み込んでいます','initializing tesseract':'準備しています','loading language traineddata':'日本語のデータを読み込んでいます','loading language traineddata (from cache)':'日本語のデータを読み込んでいます','initializing api':'準備しています','recognizing text':'文字を読み取っています'};
function progress(m){
  const b=$('rcProg'); if(!b||!m) return;
  const lab=STAGE[m.status]||'準備しています', p=Math.max(0,Math.min(1,+m.progress||0));
  b.hidden=false; b.querySelector('i').style.width=Math.round(p*100)+'%'; b.querySelector('span').textContent=lab+(p>0&&p<1?' '+Math.round(p*100)+'%':'')+'…';
}

/* ───────── 写真 ───────── */
let img=null, imgUrl='', rot=0, crop=null, cropOn=false, cur=null;   // cur＝いま直しているレシート
function setImage(file){
  if(!file) return;
  if(!/^image\//.test(file.type||'image/')){ toast('写真のファイルを選んでください'); return; }
  if(imgUrl) URL.revokeObjectURL(imgUrl);
  imgUrl=URL.createObjectURL(file);
  const im=new Image();
  im.onload=()=>{ img=im; rot=0; crop=null; cropOn=false; drawPreview(); $('rcImgBox').hidden=false; read(); };
  im.onerror=()=>toast('写真を開けませんでした');
  im.src=imgUrl;
}
function srcSize(){ const w=img.naturalWidth, h=img.naturalHeight; return rot%2?{w:h,h:w}:{w,h}; }
/* 回した写真を、決めた大きさで描く（region＝回したあとの写真の中の範囲） */
function drawRot(cv, scale, region){
  const S=srcSize(), r=region||{x:0,y:0,w:S.w,h:S.h};
  cv.width=Math.max(1,Math.round(r.w*scale)); cv.height=Math.max(1,Math.round(r.h*scale));
  const x=cv.getContext('2d'); x.save(); x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height);
  x.scale(scale,scale); x.translate(-r.x,-r.y);
  x.translate(S.w/2,S.h/2); x.rotate(rot*Math.PI/2); x.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2); x.restore();
  return cv;
}
function drawPreview(){
  const cv=$('rcCv'); if(!cv||!img) return;
  const S=srcSize(), maxW=Math.min(640, ($('rcImgBox').clientWidth||340)), sc=Math.min(1, maxW/S.w, 520/S.h);
  drawRot(cv, sc); cv.dataset.sc=sc;
  showCrop();
}
function showCrop(){
  const box=$('rcCrop'), cv=$('rcCv'); if(!box||!cv) return;
  const sc=+cv.dataset.sc||1;
  box.hidden=!crop;
  if(crop){ Object.assign(box.style,{left:crop.x*sc+'px', top:crop.y*sc+'px', width:crop.w*sc+'px', height:crop.h*sc+'px'}); }
  $('rcCropBtn').textContent=cropOn?'✓ 範囲を決めた':(crop?'✂ 範囲をやめる':'✂ 範囲をえらぶ');
  $('rcCv').classList.toggle('cropping', cropOn);
}
function cropToggle(){
  if(cropOn){ cropOn=false; showCrop(); if(crop) read(); return; }
  if(crop){ crop=null; showCrop(); read(); return; }
  cropOn=true; showCrop(); toast('写真の上を なぞって、読む範囲をかこみます', 3000);
}
function bindCrop(){
  const cv=$('rcCv'); let p0=null;
  const pt=e=>{ const r=cv.getBoundingClientRect(), sc=(+cv.dataset.sc||1)*(r.width/cv.width||1), S=srcSize(); return {x:Math.max(0,Math.min(S.w,(e.clientX-r.left)/sc)), y:Math.max(0,Math.min(S.h,(e.clientY-r.top)/sc))}; };
  cv.addEventListener('pointerdown', e=>{ if(!cropOn||!img) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); p0=pt(e); crop={x:p0.x,y:p0.y,w:1,h:1}; showCrop(); });
  cv.addEventListener('pointermove', e=>{ if(!p0) return; const p=pt(e); crop={x:Math.min(p0.x,p.x), y:Math.min(p0.y,p.y), w:Math.abs(p.x-p0.x), h:Math.abs(p.y-p0.y)}; showCrop(); });
  const end=()=>{ if(!p0) return; p0=null; if(crop && (crop.w<20||crop.h<20)) crop=null; showCrop(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}
function rotate(d){ if(!img||busy) return; rot=(rot+d+4)%4; crop=null; cropOn=false; drawPreview(); read(); }
/* 読みやすくする：大きさをそろえ、白黒にして、明るさの幅を広げる */
function ocrCanvas(){
  const S=srcSize(), r=crop||{x:0,y:0,w:S.w,h:S.h}, long=Math.max(r.w,r.h);
  const sc=Math.min(2.5, Math.max(1000/long, Math.min(1, 2400/long)));
  const cv=drawRot(document.createElement('canvas'), sc, r), x=cv.getContext('2d');
  const d=x.getImageData(0,0,cv.width,cv.height), a=d.data, hist=new Uint32Array(256);
  for(let i=0;i<a.length;i+=4){ const g=(a[i]*299+a[i+1]*587+a[i+2]*114)/1000|0; a[i]=g; hist[g]++; }
  const n=cv.width*cv.height; let lo=0, hi=255, c=0;
  for(;lo<255;lo++){ c+=hist[lo]; if(c>n*0.02) break; } c=0;
  for(;hi>0;hi--){ c+=hist[hi]; if(c>n*0.02) break; }
  const k=hi>lo+10?255/(hi-lo):1;
  for(let i=0;i<a.length;i+=4){ const v=Math.max(0,Math.min(255,(a[i]-lo)*k)); a[i]=a[i+1]=a[i+2]=v; }
  x.putImageData(d,0,0);
  return cv;
}
async function read(){
  if(!img||busy) return;
  if(location.protocol==='file:'){ toast('ファイルから開いているときは 写真の文字を読めません。「📋 文字を貼る」をつかってください', 5000); return; }
  busy=true; setBusy(true); progress({status:'loading tesseract core', progress:0});
  try{
    const w=await getWorker();
    progress({status:'recognizing text', progress:0});
    const cv=ocrCanvas();
    let text=((await w.recognize(cv)).data||{}).text||'', p=parseReceipt(text);
    if(score(p)<3){   // うまく取り出せないときは、段組みを自動で見る読み方でも ためして、よい方にする
      try{
        await w.setParameters({ tessedit_pageseg_mode:'3' });
        const t2=((await w.recognize(cv)).data||{}).text||'', p2=parseReceipt(t2);
        if(score(p2)>score(p)){ text=t2; p=p2; }
      }finally{ try{ await w.setParameters({ tessedit_pageseg_mode:'6' }); }catch(_){} }
    }
    if(!text.trim()) toast('文字が見つかりませんでした。明るいところで まっすぐ撮り直してみてください', 4500);
    else if(!p.total && !p.items.length) toast('合計や品目が見つかりませんでした。写真を回す・範囲をえらぶ で読み直せます', 4500);
    showForm(Object.assign(p, {id:null}));
  }catch(e){
    console.warn(e);
    toast('文字を読む部品を読み込めませんでした。インターネットにつながるところで、もう一度ためしてください', 5000);
  }finally{ busy=false; setBusy(false); }
}
const score=p=>(p.total?2:0)+Math.min(5,p.items.length)+(p.date?1:0)+(p.store?1:0);
function setBusy(on){
  const b=$('rcProg'); if(b) b.hidden=!on;
  document.querySelectorAll('#receiptOverlay .rc-lock').forEach(x=>x.disabled=on);
}

/* ───────── 直す画面 ───────── */
function showForm(p){
  cur={id:p.id||null, store:p.store||'', date:p.date||'', total:p.total||0, tax8:p.tax8||0, tax10:p.tax10||0, items:(p.items||[]).map(x=>({n:x.n, p:x.p})), memo:p.memo||'', raw:p.raw||''};
  renderForm(); $('rcForm').hidden=false;
  setTimeout(()=>{ const f=$('rcForm'); if(f&&f.scrollIntoView) f.scrollIntoView({block:'start', behavior:'smooth'}); }, 50);
}
function renderForm(){
  const b=$('rcForm'); if(!b||!cur) return;
  b.innerHTML=`<h4>${cur.id?'✏️ 残したレシートを直す':'🧾 読み取った中身'} <small>（押して直せます）</small></h4>
    <div class="rc-grid">
      <label class="w">店<input data-c="store" value="${esc(cur.store)}" maxlength="40" placeholder="店の名前"></label>
      <label>日付<input type="date" data-c="date" value="${esc(cur.date)}"></label>
      <label>合計<span><input data-c="total" inputmode="numeric" value="${cur.total||''}" placeholder="0"><small>円</small></span></label>
      <label>うち消費税 8%<span><input data-c="tax8" inputmode="numeric" value="${cur.tax8||''}" placeholder="0"><small>円</small></span></label>
      <label>うち消費税 10%<span><input data-c="tax10" inputmode="numeric" value="${cur.tax10||''}" placeholder="0"><small>円</small></span></label>
    </div>
    <div class="rc-ih"><b>品目（${cur.items.length}）</b><button class="rc-mini" onclick="RC.itemAdd()">＋ 品目</button></div>
    <div class="rc-items">${cur.items.map((x,i)=>`<div class="rc-it"><input data-i="${i}" data-f="n" value="${esc(x.n)}" maxlength="40" placeholder="品名"><input data-i="${i}" data-f="p" inputmode="numeric" value="${x.p}" class="p"><button class="rc-x" onclick="RC.itemDel(${i})" aria-label="この品目を消す">✕</button></div>`).join('')||'<div class="rc-tip">品目は見つかりませんでした（合計だけでも使えます）。</div>'}</div>
    <div id="rcCheck"></div>
    <label class="rc-memo">メモ<input data-c="memo" value="${esc(cur.memo)}" maxlength="80" placeholder="例：食費・会社の分"></label>
    ${cur.raw?`<details class="rc-raw"><summary>読み取った文字を見る・直す</summary><textarea id="rcRaw" rows="8">${esc(cur.raw)}</textarea><button class="rc-b" onclick="RC.reparse()">↻ この文字から取り出し直す</button></details>`:''}
    <div class="rc-acts"><button class="pri" onclick="RC.keep()">💾 ${cur.id?'直して残す':'残す'}</button><button onclick="RC.toTable()">▦ 表に入れる</button><button onclick="RC.copy()">📋 コピー</button></div>`;
  b.querySelectorAll('input,textarea').forEach(el=>el.addEventListener('keydown', e=>e.stopPropagation()));
  renderCheck();
}
const itemSum=()=>cur?cur.items.reduce((s,x)=>s+(+x.p||0),0):0;
function renderCheck(){
  const b=$('rcCheck'); if(!b||!cur) return;
  const s=itemSum(), t=cur.total, tax=cur.tax8+cur.tax10;
  if(!cur.items.length||!t){ b.innerHTML=''; return; }
  b.innerHTML=(s===t||s+tax===t)?`<div class="rc-ok">✓ 品目の合計 ${yen(s)}${s!==t?`＋消費税 ${yen(tax)}`:''} が 合計と合っています</div>`
    :`<div class="rc-ng">⚠ 品目の合計は ${yen(s)}、合計は ${yen(t)}（差 ${yen(t-s)}）。読みまちがいがあるかもしれません。</div>`;
}
function onFormInput(e){
  const el=e.target; if(!cur) return;
  if(el.dataset.c){ const k=el.dataset.c; if(k==='store'||k==='memo') cur[k]=line(el.value,k==='store'?40:80); else if(k==='date') cur.date=okDate(el.value)?el.value:''; else { const v=toolNum(el.value); cur[k]=isFinite(v)?Math.round(v):0; } renderCheck(); return; }
  if(el.dataset.f){ const it=cur.items[+el.dataset.i]; if(!it) return; if(el.dataset.f==='n') it.n=line(el.value,40); else { const v=toolNum(el.value); it.p=isFinite(v)?Math.round(v):0; } renderCheck(); }
}
function itemAdd(){ if(!cur) return; if(cur.items.length>=MAX_ITEMS) return; cur.items.push({n:'', p:0}); renderForm(); const els=document.querySelectorAll('#rcForm .rc-it input[data-f="n"]'); if(els.length) els[els.length-1].focus(); }
function itemDel(i){ if(!cur) return; cur.items.splice(i,1); renderForm(); }
function reparse(){ const t=$('rcRaw'); if(!t||!cur) return; const id=cur.id, memo=cur.memo; showForm(Object.assign(parseReceipt(t.value), {id, memo})); toast('取り出し直しました'); }
async function paste(){
  let t='';
  try{ if(navigator.clipboard&&navigator.clipboard.readText) t=await navigator.clipboard.readText(); }catch(_){}
  const v=await appPrompt('レシートの文字を貼ってください（ほかのアプリで読み取った文字 など）', t||'', true);
  if(v==null||!v.trim()) return;
  showForm(Object.assign(parseReceipt(v), {id:null}));
}
const dateSlash=d=>d?d.replace(/^(\d{4})-0?(\d+)-0?(\d+)$/,'$1/$2/$3'):'';
function recText(r){
  const L=['🧾 '+(r.store||'（店名なし）')+(r.date?'　'+dateSlash(r.date):'')];
  r.items.forEach(x=>L.push('・'+(x.n||'（品名なし）')+'　'+yen(x.p)));
  const tax=[r.tax8?'8% '+yen(r.tax8):'', r.tax10?'10% '+yen(r.tax10):''].filter(Boolean).join('・');
  L.push('合計 '+yen(r.total)+(tax?'（うち消費税 '+tax+'）':''));
  if(r.memo) L.push('メモ：'+r.memo);
  return L.join('\n');
}
function copy(){ if(!cur) return; toolCopyText(recText(cur), 'レシートの中身をコピーしました'); }
function keep(){
  if(!cur) return;
  if(!cur.total && !cur.items.length){ toast('合計か品目を入れてください'); return; }
  const r=cleanRec(Object.assign({}, cur, {id:cur.id||uid('r'), t:cur.id?((st.list.find(x=>x.id===cur.id)||{}).t||Date.now()):Date.now()}));
  const i=st.list.findIndex(x=>x.id===r.id);
  if(i>=0) st.list[i]=r; else { if(st.list.length>=MAX_LIST){ toast('残せるのは '+MAX_LIST+'枚までです。古いものを消してください'); return; } st.list.unshift(r); }
  if(!save()) return;
  cur.id=r.id; renderForm(); renderTabs();
  toast((i>=0?'直しました':'残しました')+'（📒 残したレシート：'+st.list.length+'枚）');
}
function toTable(){
  if(!cur) return;
  popOpen(`<b>▦ 表に入れる</b><div class="rc-tip">表で選んでいるセルから 右下へ入れます（↶戻る で元に戻せます）。</div>
    <div class="rc-pick"><button class="rc-b" onclick="RC.toTableGo('one')">1行で（日付・店・合計）</button><button class="rc-b" onclick="RC.toTableGo('items')">品目ごと（品名・金額）</button></div>
    <div class="rc-pop-acts"><button class="rc-b" onclick="RC.popClose()">やめる</button></div>`);
}
function rowsOne(r){ return [dateSlash(r.date), r.store, r.total, r.tax8||'', r.tax10||'', r.memo||'']; }
function toTableGo(kind){
  popClose(); if(!cur) return;
  const rows=kind==='items'?[['日付','店','品目','金額']].concat(cur.items.map(x=>[dateSlash(cur.date), cur.store, x.n, x.p]), [['','','合計', cur.total]])
    :[rowsOne(cur).slice(0, cur.memo?6:(cur.tax10?5:(cur.tax8?4:3)))];
  toolPasteRows(rows, 'レシート', closeReceipt);
}

/* ───────── 残したレシートの一覧 ───────── */
let listMonth='';
function renderList(){
  const b=$('rcList'); if(!b) return;
  const months=[...new Set(st.list.map(r=>(r.date||'').slice(0,7)).filter(Boolean))].sort().reverse();
  if(listMonth && !months.includes(listMonth)) listMonth='';
  const rows=st.list.filter(r=>!listMonth||(r.date||'').slice(0,7)===listMonth).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.t-a.t);
  const sum=rows.reduce((s,r)=>s+r.total,0);
  b.innerHTML=st.list.length?`<div class="rc-lh"><select onchange="RC.month(this.value)" aria-label="月"><option value="">ぜんぶ（${st.list.length}枚）</option>${months.map(m=>`<option value="${m}"${m===listMonth?' selected':''}>${+m.slice(0,4)}年${+m.slice(5)}月</option>`).join('')}</select><div class="rc-lsum">合計 <b>${yen(sum)}</b><small>${rows.length}枚</small></div></div>
    <div class="rc-rows">${rows.map(r=>`<button class="rc-row" onclick="RC.openRec('${esc(r.id)}')"><span class="d">${r.date?+r.date.slice(5,7)+'/'+(+r.date.slice(8)):'－'}</span><span class="s">${esc(r.store||'（店名なし）')}${r.memo?`<small>${esc(r.memo)}</small>`:''}</span><span class="a">${yen(r.total)}</span></button>`).join('')}</div>
    <div class="rc-acts"><button onclick="RC.listTable()">▦ ${listMonth?'この月を':'ぜんぶ'}表に入れる</button><button onclick="RC.listCopy()">📋 コピー</button><button onclick="RC.listDel()">🗑 ${listMonth?'この月を':'ぜんぶ'}消す</button></div>`
    :`<div class="rc-empty">まだありません。「📷 読み取る」で読んだレシートを「💾 残す」と、ここにたまります（月ごとの合計も出ます）。</div>`;
}
const listRows=()=>st.list.filter(r=>!listMonth||(r.date||'').slice(0,7)===listMonth).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.t-b.t);
function listTable(){ const rs=listRows(); if(!rs.length) return; toolPasteRows([['日付','店','合計','消費税8%','消費税10%','メモ']].concat(rs.map(rowsOne)), 'レシートの一覧', closeReceipt); }
function listCopy(){ const rs=listRows(); if(!rs.length) return; toolCopyText(rs.map(r=>dateSlash(r.date)+'　'+(r.store||'（店名なし）')+'　'+yen(r.total)).join('\n')+'\n合計 '+yen(rs.reduce((s,r)=>s+r.total,0)), '一覧をコピーしました'); }
async function listDel(){
  const rs=listRows(); if(!rs.length) return;
  if(!await appConfirm((listMonth?+listMonth.slice(5)+'月の ':'')+rs.length+'枚 を消しますか？ もとに戻せません。', '消す', 'やめる')) return;
  const ids=new Set(rs.map(r=>r.id)); st.list=st.list.filter(r=>!ids.has(r.id)); save(); renderList(); renderTabs();
}
function openRec(id){ const r=st.list.find(x=>x.id===id); if(!r) return; setTab('read'); showForm(Object.assign({}, r, {raw:''})); }
async function delCur(){
  if(!cur||!cur.id) return;
  if(!await appConfirm('このレシートを 残したものから消しますか？', '消す', 'やめる')) return;
  st.list=st.list.filter(r=>r.id!==cur.id); save(); cur.id=null; renderForm(); renderTabs();
}

/* ───────── 画面 ───────── */
let pop=null;
function popOpen(html){
  popClose();
  const el=document.createElement('div'); el.className='rc-pop-bg';
  el.innerHTML=`<div class="rc-pop" role="dialog">${html}</div>`;
  el.addEventListener('mousedown', e=>{ if(e.target===el) popClose(); });
  $('receiptOverlay').appendChild(el);
  pop={el, rel:modalBack(()=>popClose(true))};
}
function popClose(fromBack){ if(!pop) return; const p=pop; pop=null; if(!fromBack) p.rel(); p.el.remove(); }
function renderTabs(){
  const b=$('rcTabs'); if(!b) return;
  b.innerHTML=[['read','📷 読み取る'],['list','📒 残したレシート'+(st.list.length?'（'+st.list.length+'）':'')]].map(t=>`<button class="${st.tab===t[0]?'on':''}" onclick="RC.tab('${t[0]}')">${t[1]}</button>`).join('');
  $('rcRead').hidden=st.tab!=='read'; $('rcList').hidden=st.tab!=='list';
}
function setTab(t){ st.tab=t==='list'?'list':'read'; save(); renderTabs(); if(st.tab==='list') renderList(); }
const RC_CSS=`
#receiptOverlay .rc-modal{ display:flex; flex-direction:column; }
.rc-body{ flex:1; min-height:0; overflow:auto; padding:10px 12px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.rc-wrap{ max-width:720px; margin:0 auto; }
.rc-tabs{ display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px; }
.rc-tabs button{ min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); color:var(--text,#333); font-size:14.5px; font-weight:bold; cursor:pointer; }
.rc-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.rc-src{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.rc-big{ min-height:76px; border-radius:14px; border:2px solid var(--acc); background:var(--acc-weak,rgba(33,115,70,.12)); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; touch-action:manipulation; }
.rc-big b{ font-size:26px; line-height:1; } .rc-big:disabled{ opacity:.5; }
.rc-tip{ margin:8px 0; font-size:12.5px; color:var(--text-light,#777); line-height:1.6; }
.rc-warn{ margin:8px 0; padding:8px 10px; border-radius:8px; background:rgba(255,152,0,.16); border-left:4px solid #fb8c00; font-size:13px; line-height:1.6; }
.rc-sec{ margin:10px 0; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); }
.rc-sec h4{ margin:0 0 8px; font-size:15px; color:var(--acc-text,var(--acc)); } .rc-sec h4 small{ font-weight:normal; color:var(--text-light,#777); font-size:12px; }
.rc-img{ position:relative; display:flex; justify-content:center; background:rgba(120,132,156,.12); border-radius:10px; overflow:hidden; }
#rcCv{ display:block; max-width:100%; height:auto; touch-action:pan-y; } #rcCv.cropping{ touch-action:none; cursor:crosshair; outline:3px solid #fb8c00; }
.rc-crop{ position:absolute; border:2px dashed #fb8c00; background:rgba(251,140,0,.12); pointer-events:none; }
.rc-imgbar{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.rc-b{ min-height:40px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; touch-action:manipulation; } .rc-b:disabled{ opacity:.45; }
.rc-mini{ padding:4px 10px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--acc-text,var(--acc)); font-size:13px; font-weight:bold; cursor:pointer; }
#rcProg{ margin:10px 0; } #rcProg .rc-bar{ height:10px; border-radius:5px; background:rgba(120,132,156,.2); overflow:hidden; } #rcProg .rc-bar i{ display:block; height:100%; width:0; background:var(--acc); transition:width .2s; }
#rcProg span{ display:block; margin-top:4px; font-size:13px; color:var(--text-light,#666); }
.rc-grid{ display:grid; grid-template-columns:1fr 1fr; gap:4px 10px; } .rc-grid>*{ min-width:0; } .rc-grid .w{ grid-column:1 / -1; }
.rc-grid label,.rc-memo{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#777); margin:4px 0; }
.rc-grid label span{ display:flex; align-items:center; gap:3px; } .rc-grid small{ flex:none; font-size:12px; }
.rc-grid input,.rc-memo input{ display:block; width:100%; min-width:0; box-sizing:border-box; margin-top:3px; height:42px; padding:0 8px; font-size:16.5px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.rc-grid input[inputmode]{ text-align:right; font-weight:bold; font-variant-numeric:tabular-nums; } .rc-grid input[data-c="total"]{ font-size:19px; }
.rc-ih{ display:flex; justify-content:space-between; align-items:center; margin:10px 0 4px; font-size:13.5px; }
.rc-items{ display:flex; flex-direction:column; gap:4px; }
.rc-it{ display:flex; gap:4px; } .rc-it input{ flex:1; min-width:0; height:38px; padding:0 8px; font-size:15px; border:1px solid rgba(120,132,156,.4); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.rc-it input.p{ flex:none; width:96px; text-align:right; font-variant-numeric:tabular-nums; font-weight:bold; }
.rc-x{ flex:none; width:38px; border-radius:8px; border:1px solid rgba(120,132,156,.3); background:transparent; color:var(--text-light,#888); cursor:pointer; }
.rc-ok{ margin:8px 0; padding:7px 10px; border-radius:8px; background:var(--acc-weak,rgba(33,115,70,.12)); font-size:13px; }
.rc-ng{ margin:8px 0; padding:7px 10px; border-radius:8px; background:rgba(255,152,0,.16); border-left:4px solid #fb8c00; font-size:13px; line-height:1.55; }
.rc-raw{ margin:8px 0; } .rc-raw summary{ cursor:pointer; font-size:13px; font-weight:bold; color:var(--acc-text,var(--acc)); padding:4px 0; }
.rc-raw textarea{ display:block; width:100%; box-sizing:border-box; margin:6px 0; padding:8px; font-size:14px; line-height:1.5; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
.rc-acts{ display:flex; gap:6px; margin-top:12px; } .rc-acts button{ flex:1; min-height:44px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.rc-acts button.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.rc-lh{ display:flex; gap:8px; align-items:center; margin-bottom:8px; } .rc-lh select{ flex:1; min-width:0; height:42px; padding:0 8px; font-size:15px; font-weight:bold; border:1px solid rgba(120,132,156,.5); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.rc-lsum{ text-align:right; font-size:13px; } .rc-lsum b{ display:block; font-size:19px; } .rc-lsum small{ color:var(--text-light,#777); }
.rc-rows{ display:flex; flex-direction:column; gap:4px; }
.rc-row{ display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:9px 10px; border-radius:10px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; }
.rc-row .d{ flex:none; width:42px; font-size:13px; color:var(--text-light,#777); font-variant-numeric:tabular-nums; } .rc-row .s{ flex:1; min-width:0; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .rc-row .s small{ display:block; font-weight:normal; font-size:12px; color:var(--text-light,#777); }
.rc-row .a{ flex:none; font-weight:bold; font-variant-numeric:tabular-nums; }
.rc-empty{ padding:18px 8px; text-align:center; color:var(--text-light,#888); font-size:13.5px; line-height:1.7; }
.rc-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; padding-top:10vh; }
.rc-pop{ width:min(420px,92%); box-sizing:border-box; padding:16px; border-radius:14px; background:var(--panel,var(--modal-bg,#fff)); color:var(--text,#222); box-shadow:0 10px 40px rgba(0,0,0,.35); }
.rc-pop>b{ display:block; font-size:16px; margin-bottom:6px; } .rc-pick{ display:flex; flex-direction:column; gap:6px; margin-top:8px; } .rc-pick .rc-b{ min-height:46px; text-align:left; }
.rc-pop-acts{ display:flex; justify-content:flex-end; margin-top:12px; }
@media (max-width:380px){ .rc-body{ padding:8px 8px calc(16px + var(--safe-bottom,0px)); } .rc-sec{ padding:8px 9px 10px; } .rc-big{ font-size:13.5px; min-height:68px; } .rc-acts button{ font-size:13px; } .rc-it input.p{ width:84px; } }
`;
function ensureDom(){
  if($('receiptOverlay')) return;
  const stl=document.createElement('style'); stl.id='rcStyle'; stl.textContent=RC_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="receiptOverlay">
  <div class="modal vol-modal rc-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📷 レシート読み取り</span><button class="modal-close" onclick="closeReceipt()" aria-label="閉じる">✕</button></div>
    <div class="rc-body"><div class="rc-wrap">
      <div class="rc-tabs" id="rcTabs"></div>
      <div id="rcRead">
        <div class="rc-src">
          <button class="rc-big rc-lock" onclick="RC.cam()"><b>📷</b>撮る</button>
          <button class="rc-big rc-lock" onclick="RC.pick()"><b>🖼</b>写真から</button>
          <button class="rc-big rc-lock" onclick="RC.paste()"><b>📋</b>文字を貼る</button>
        </div>
        <input type="file" id="rcCam" accept="image/*" capture="environment" hidden>
        <input type="file" id="rcFile" accept="image/*" hidden>
        <div id="rcFileWarn"></div>
        <div class="rc-tip">レシートを平らにして、明るいところで まっすぐ上から撮ると よく読めます。写真はこの端末の中で読み取り、どこにも送りません。</div>
        <div class="rc-sec" id="rcImgBox" hidden>
          <div class="rc-img"><canvas id="rcCv" width="10" height="10"></canvas><div class="rc-crop" id="rcCrop" hidden></div></div>
          <div class="rc-imgbar"><button class="rc-b rc-lock" onclick="RC.rotate(-1)" aria-label="左に回す">↺</button><button class="rc-b rc-lock" onclick="RC.rotate(1)" aria-label="右に回す">↻</button><button class="rc-b rc-lock" id="rcCropBtn" onclick="RC.crop()">✂ 範囲をえらぶ</button><button class="rc-b rc-lock" onclick="RC.read()">🔍 もう一度読む</button></div>
        </div>
        <div id="rcProg" hidden><div class="rc-bar"><i></i></div><span></span></div>
        <div class="rc-sec" id="rcForm" hidden></div>
      </div>
      <div id="rcList" hidden></div>
    </div></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const onFile=e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(f) setImage(f); };
  $('rcCam').addEventListener('change', onFile); $('rcFile').addEventListener('change', onFile);
  $('rcForm').addEventListener('input', onFormInput);
  bindCrop();
  window.addEventListener('resize', ()=>{ if(isDlgOpen('receiptOverlay') && img) drawPreview(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function pickFile(id){
  if(location.protocol==='file:'){ toast('ファイルから開いているときは 写真の文字を読めません。「📋 文字を貼る」をつかってください', 5000); return; }
  $(id).click();
}
function openReceipt(){
  ensureDom(); load();
  openDlg('receiptOverlay', ()=>{ popClose(); stopWorker(); });
  $('rcFileWarn').innerHTML=location.protocol==='file:'?'<div class="rc-warn">いまはファイルから開いているので、写真の文字は読めません（インターネットの表電卓から開くと読めます）。ほかのアプリで読んだ文字を「📋 文字を貼る」で入れることはできます。</div>':'';
  renderTabs(); if(st.tab==='list') renderList();
}
function closeReceipt(){ if(!$('receiptOverlay')||!isDlgOpen('receiptOverlay')) return; popClose(); stopWorker(); closeDlg('receiptOverlay'); }

window.RC={ cam:()=>pickFile('rcCam'), pick:()=>pickFile('rcFile'), paste, rotate, crop:cropToggle, read, itemAdd, itemDel, reparse, keep, toTable, toTableGo, copy, popClose:()=>popClose(),
  tab:setTab, month:m=>{ listMonth=m; renderList(); }, openRec, delCur, listTable, listCopy, listDel,
  parse:parseReceipt, norm:normLines, tail:tailAmount, setImage, state:()=>JSON.parse(JSON.stringify(st)), cur:()=>cur&&JSON.parse(JSON.stringify(cur)), show:p=>showForm(Object.assign({id:null},p)), stopWorker };
Object.assign(window, { openReceipt, closeReceipt });
})();
