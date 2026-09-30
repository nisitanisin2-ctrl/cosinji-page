/* 📦 しまい場所メモ（v458。表電卓の道具。はじめて開いたときに読む）
   「あれ、どこにしまったっけ？」をなくす。
   ・「パスポートは寝室のタンスの2段目」と打つか話すと、物と場所に分けて残す（すぐ入れて「直す」を出す）。
   ・上の欄でさがす（ひらがな・カタカナ・全角半角を気にしない）。「パスポートどこ？」と話してもさがす。
   ・写真（しまった所・物）を1枚付けられる。写真は端末の IndexedDB（excalc_shimai）に小さくして入れる。
   ・場所を変えると前の場所を残す（「前は：…」）。同じ名前を入れると、場所を変えるか聞く。
   ・場所ごと／新しい順／名前順に並べる。場所のチップで絞る。印刷・CSV・書き出し／読み込み。
   ・入れたものは端末の中（excalc_shimai）だけ。📋リストのバックアップにも入る（写真は聞いてから）。 */
(function(){
const SM_KEY='excalc_shimai';
let sm=null, smQ='', smPlace='', smEdId=null, smEdPhoto=undefined, smUndo=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const fmtDay=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); if(!m) return ''; const y=+m[1]; return (y===new Date().getFullYear()?'':y+'年')+(+m[2])+'月'+(+m[3])+'日'; };

/* ── さがすための読みそろえ（カタカナ→ひらがな・全角→半角・大文字→小文字・空白や記号をとる） ── */
function smNorm(s){
  return String(s||'').normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, c=>String.fromCharCode(c.charCodeAt(0)-0x60))
    .replace(/[\s・、。,.\-ー~〜「」『』()（）]/g,'');
}

/* ── 保存 ── */
function smClean(o){
  if(!o || typeof o!=='object' || !Array.isArray(o.items)) return { v:1, view:'new', items:[] };
  return { v:1, view:['new','place','name'].includes(o.view)?o.view:'new',
    items:o.items.filter(x=>x && typeof x==='object' && String(x.name||'').trim()).slice(0,3000).map(x=>({
      id:typeof x.id==='string'?x.id:uid(), name:String(x.name).trim().slice(0,60), place:String(x.place||'').trim().slice(0,80),
      note:String(x.note||'').slice(0,500), photo:!!x.photo, added:String(x.added||today()).slice(0,10), updated:String(x.updated||x.added||today()).slice(0,10), ts:+x.ts||0,
      hist:Array.isArray(x.hist)?x.hist.filter(h=>h && h.place).slice(-5).map(h=>({place:String(h.place).slice(0,80), until:String(h.until||'').slice(0,10)})):[] })) };
}
function smLoad(){ try{ sm=smClean(JSON.parse(localStorage.getItem(SM_KEY)||'null')); }catch(_){ sm=smClean(null); } }
function smSave(){ try{ localStorage.setItem(SM_KEY, JSON.stringify(sm)); return true; }catch(_){ toast('端末の空きが足りず、保存できませんでした'); return false; } }

/* ── 写真（IndexedDB。長い辺 900px の JPEG にして入れる） ── */
let smDbP=null;
function smDb(){
  if(smDbP) return smDbP;
  smDbP=new Promise((res,rej)=>{ try{
    const r=indexedDB.open('excalc_shimai',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('pics');
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  }catch(e){ rej(e); } }).catch(e=>{ smDbP=null; throw e; });
  return smDbP;
}
async function smPicGet(id){ try{ const db=await smDb(); return await new Promise(r=>{ const q=db.transaction('pics').objectStore('pics').get(id); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); }catch(_){ return null; } }
async function smPicPut(id,data){ const db=await smDb(); return new Promise((res,rej)=>{ const t=db.transaction('pics','readwrite'); t.objectStore('pics').put(data,id); t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error); }); }
async function smPicDel(id){ try{ const db=await smDb(); await new Promise(r=>{ const t=db.transaction('pics','readwrite'); t.objectStore('pics').delete(id); t.oncomplete=r; t.onerror=r; }); }catch(_){} }
const smThumbs={};   // id → dataURL（一度読んだものは覚えておく）
function smResize(file, max){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{ const k=Math.min(1, max/Math.max(im.naturalWidth, im.naturalHeight)); const cv=document.createElement('canvas');
      cv.width=Math.round(im.naturalWidth*k); cv.height=Math.round(im.naturalHeight*k); cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg',0.72)); };
    im.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('img')); };
    im.src=url;
  });
}

/* ── 文から物と場所に分ける ──
   「パスポートは寝室のタンスの2段目」「印鑑を仏壇の引き出しにしまった」「冬タイヤ→物置」
   「保険証の場所は財布」「延長コード：押し入れ」 → {name, place}。分けられなければ place は '' */
const SM_VERB=/(?:に|へ|で)?(?:しまっ(?:た|てある|ておいた|てあります|ています|てる)|しまいました|しまう|入れ(?:た|ました|てある|ておいた|てあります|てる)|いれ(?:た|てある|ておいた)|置い(?:た|てある|ておいた|てあります|てる)|置きました|おい(?:た|てある|ておいた)|片[付づ]け(?:た|ました|てある)|かたづけ(?:た|てある)|保管(?:した|してある|しています|中)?|収納(?:した|してある)?|ある|あります|です|だよ)$/;
function smParse(text){
  let t=String(text||'').trim().replace(/[。．.！!]+$/,'').trim();
  if(!t) return {name:'', place:''};
  let verb=false;
  const v=t.replace(SM_VERB,''); if(v!==t && v.trim()){ t=v.trim(); verb=true; }
  let name='', place='';
  let m=/^(.+?)\s*(?:→|⇒|->|:|：)\s*(.+)$/.exec(t);
  if(m){ name=m[1]; place=m[2]; }
  if(!name){ m=/^(.+?)(?:の(?:場所|置き場|しまい場所|在りか|ありか))(?:は|、)\s*(.+)$/.exec(t); if(m){ name=m[1]; place=m[2]; } }
  if(!name && verb){ m=/^(.+?)を\s*(.+)$/.exec(t); if(m){ name=m[1]; place=m[2]; } }
  if(!name){
    // 「は」で分ける。名前の中の「は」（はさみ・おはし）で切らないよう、いまある物の名前に合うところを先に
    const cands=[]; for(let i=1;i<t.length-1;i++) if(t[i]==='は') cands.push(i);
    const known=new Set((sm?sm.items:[]).map(x=>smNorm(x.name)));
    let at=cands.find(i=>known.has(smNorm(t.slice(0,i))));
    if(at==null) at=cands.find(i=>!/^[しさすせそたちつてと]/.test(t.slice(i+1)) || i>=t.length-2);
    if(at==null) at=cands[0];
    if(at!=null){ name=t.slice(0,at); place=t.slice(at+1); }
  }
  if(!name){ m=/^(.+?)を\s*(.+)$/.exec(t); if(m){ name=m[1]; place=m[2]; } }
  if(!name && verb){ m=/^(.+?)(?:、|\s)\s*(.+)$/.exec(t); if(m){ name=m[1]; place=m[2]; } }
  if(!name) return {name:t.slice(0,60), place:''};
  name=name.replace(/[、,\s]+$/,'').trim(); place=place.replace(/^[、,\s]+/,'').replace(/(?:の中)?(?:に|へ)$/,'').trim();
  return {name:name.slice(0,60), place:place.slice(0,80)};
}
/* 「パスポートどこ？」「印鑑はどこにしまったっけ」 → さがす言葉（どこを聞いていなければ null） */
function smAskWhere(text){
  const t=String(text||'').trim().replace(/[？?。！!]+$/,'');
  const m=/^(.+?)(?:は|って|の場所は|の場所|、)?\s*(?:どこ|何処|どちら)(?:.*)$/.exec(t);
  return m ? m[1].replace(/(?:は|って|の)$/,'').trim() : null;
}

/* ── さがす（名前・場所・メモ・前の場所）。名前に合うものを先に ── */
function smSearch(q, list){
  const n=smNorm(q); list=list||sm.items;
  if(!n) return list.slice();
  const words=String(q).trim().split(/[\s　]+/).map(smNorm).filter(Boolean);
  const score=x=>{ const nm=smNorm(x.name), pl=smNorm(x.place), no=smNorm(x.note)+smNorm(x.hist.map(h=>h.place).join(''));
    let s=0; for(const w of words){ if(nm===w) s+=100; else if(nm.startsWith(w)) s+=60; else if(nm.includes(w)) s+=40; else if(pl.includes(w)) s+=20; else if(no.includes(w)) s+=8; else return 0; } return s; };
  return list.map(x=>[x,score(x)]).filter(a=>a[1]>0).sort((a,b)=>b[1]-a[1]).map(a=>a[0]);
}
function smPlaces(){
  const c={}; sm.items.forEach(x=>{ const p=x.place||'（場所なし）'; c[p]=(c[p]||0)+1; });
  return Object.entries(c).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'ja'));
}

/* ── 画面 ── */
const SM_CSS=`
#shimaiOverlay .sm-modal{ display:flex; flex-direction:column; }
.sm-top{ padding:10px 12px 6px; border-bottom:1px solid rgba(120,132,156,.25); }
.sm-find{ display:flex; gap:6px; align-items:center; }
.sm-find input{ flex:1; min-width:0; height:44px; padding:0 12px; font-size:17px; border:2px solid var(--acc); border-radius:22px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.sm-ib{ flex:none; width:44px; height:44px; border-radius:22px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:19px; cursor:pointer; }
.sm-ib.on{ background:#e53935; border-color:#e53935; color:#fff; animation:smPulse 1s infinite; }
@keyframes smPulse{ 50%{ opacity:.6; } }
.sm-bar{ display:flex; gap:6px; align-items:center; margin-top:8px; overflow-x:auto; scrollbar-width:none; }
.sm-bar::-webkit-scrollbar{ display:none; }
.sm-chip{ flex:none; height:30px; padding:0 11px; border-radius:15px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.sm-chip.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.sm-chip small{ font-weight:normal; opacity:.8; margin-left:3px; }
.sm-list{ flex:1; min-height:0; overflow:auto; padding:8px 12px 12px; }
.sm-grp{ font-size:13px; font-weight:bold; color:var(--acc); margin:12px 2px 5px; display:flex; align-items:center; gap:6px; }
.sm-grp span{ font-weight:normal; color:var(--text-light,#888); font-size:12px; }
.sm-it{ display:flex; align-items:center; gap:10px; padding:9px 10px; margin-bottom:6px; border:1px solid rgba(120,132,156,.3); border-radius:12px; background:var(--modal-bg,#fff); cursor:pointer; }
.sm-it .ph{ flex:none; width:46px; height:46px; border-radius:8px; background:rgba(120,132,156,.14) center/cover no-repeat; display:flex; align-items:center; justify-content:center; font-size:20px; }
.sm-it .tx{ flex:1; min-width:0; }
.sm-it .nm{ font-weight:bold; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sm-it .pl{ font-size:14px; color:var(--text,#333); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sm-it .pl b{ color:var(--acc); }
.sm-it .dt{ font-size:11px; color:var(--text-light,#888); }
.sm-it.hit{ border:2px solid var(--acc); }
.sm-it.hit .pl{ font-size:16px; white-space:normal; }
.sm-empty{ text-align:center; color:var(--text-light,#888); padding:28px 12px; line-height:1.8; font-size:14px; }
.sm-empty b{ color:var(--text,#333); }
.sm-add{ padding:8px 12px calc(10px + var(--safe-bottom,0px)); border-top:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); }
.sm-add .row{ display:flex; gap:6px; align-items:center; }
.sm-add input{ flex:1; min-width:0; height:44px; padding:0 12px; font-size:16px; border:1px solid rgba(120,132,156,.5); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.sm-add .go{ flex:none; height:44px; padding:0 14px; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; }
.sm-hint{ font-size:11.5px; color:var(--text-light,#888); margin-top:4px; }
.sm-snack{ position:absolute; left:12px; right:12px; bottom:calc(84px + var(--safe-bottom,0px)); z-index:5; display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:12px; background:#323232; color:#fff; font-size:14px; box-shadow:0 2px 10px rgba(0,0,0,.3); }
.sm-snack[hidden]{ display:none; }
.sm-snack span{ flex:1; min-width:0; overflow-wrap:anywhere; }
.sm-snack button{ flex:none; background:transparent; border:1px solid rgba(255,255,255,.5); color:#fff; border-radius:8px; height:32px; padding:0 10px; font-weight:bold; cursor:pointer; }
.sm-body{ padding:10px 12px calc(16px + var(--safe-bottom,0px)); overflow:auto; }
.sm-f{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:8px 0; }
.sm-f input,.sm-f textarea{ display:block; width:100%; box-sizing:border-box; margin-top:4px; min-height:44px; padding:6px 10px; font-size:16px; border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
.sm-f textarea{ min-height:70px; resize:vertical; }
.sm-pc{ display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
.sm-pc button{ height:30px; padding:0 10px; border-radius:15px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:12.5px; cursor:pointer; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sm-photo{ display:flex; gap:10px; align-items:center; margin:8px 0; }
.sm-photo .pv{ width:96px; height:96px; border-radius:10px; background:rgba(120,132,156,.14) center/cover no-repeat; display:flex; align-items:center; justify-content:center; font-size:30px; flex:none; cursor:pointer; }
.sm-photo .bt{ display:flex; flex-direction:column; gap:6px; flex:1; }
.sm-btn{ display:block; width:100%; height:44px; margin:8px 0 0; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; }
.sm-btn.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.sm-btn.del{ background:transparent; color:#d32f2f; border:1px solid rgba(211,47,47,.45); }
.sm-photo .bt .sm-btn{ margin:0; height:38px; font-size:14px; }
.sm-hist{ font-size:12.5px; color:var(--text-light,#888); line-height:1.7; margin:4px 0; }
.sm-note{ font-size:12px; color:var(--text-light,#888); line-height:1.65; margin:6px 0; }
.sm-big{ display:block; max-width:100%; max-height:70vh; margin:0 auto; border-radius:10px; }
#printArea .sm-pr{ font-family:sans-serif; color:#000; }
#printArea .sm-pr h1{ font-size:17pt; margin:0 0 3mm; } #printArea .sm-pr h2{ font-size:12.5pt; margin:5mm 0 1.5mm; border-bottom:1px solid #999; }
#printArea .sm-pr table{ width:100%; border-collapse:collapse; font-size:10.5pt; } #printArea .sm-pr td{ border-bottom:1px solid #ddd; padding:1.4mm 2mm; vertical-align:top; }
#printArea .sm-pr td:first-child{ width:40%; font-weight:bold; }
`;
function smEnsureDom(){
  if($('shimaiOverlay')) return;
  const st=document.createElement('style'); st.id='smStyle'; st.textContent=SM_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="shimaiOverlay">
  <div class="modal vol-modal sm-modal" style="position:relative">
    <div class="modal-header"><span>📦 しまい場所メモ</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="hdr-btn" onclick="smOpenMenu()" title="印刷・書き出しなど">⚙ 設定</button>
      <button class="modal-close" onclick="closeShimai()" aria-label="閉じる">✕</button></span></div>
    <div class="sm-top">
      <div class="sm-find"><input id="smFind" type="search" placeholder="🔍 さがす（例：パスポート・タンス）" autocomplete="off" oninput="smSetQ(this.value)" enterkeyhint="search">
        <button class="sm-ib" id="smFindMic" onclick="smListen('find')" aria-label="声でさがす" title="声でさがす（「パスポートどこ？」）">🎤</button></div>
      <div class="sm-bar" id="smBar"></div>
    </div>
    <div class="sm-list" id="smList"></div>
    <div class="sm-add">
      <div class="row"><input id="smAddIn" placeholder="＋ しまった物と場所" autocomplete="off" enterkeyhint="done" onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();smAddText(this.value);}">
        <button class="sm-ib" id="smAddMic" onclick="smListen('add')" aria-label="声で入れる" title="声で入れる">🎤</button>
        <button class="go" onclick="smAddText(document.getElementById('smAddIn').value)">入れる</button></div>
      <div class="sm-hint">例：「パスポートは寝室のタンスの2段目」「印鑑を仏壇の引き出しにしまった」</div>
    </div>
    <div class="sm-snack" id="smSnack" hidden></div>
  </div>
</div>
<div class="modal-overlay" id="smEdOverlay" onclick="if(event.target===this)smCloseEd()">
  <div class="modal"><div class="modal-header"><span id="smEdHdr">しまった物</span><button class="modal-close" onclick="smCloseEd()" aria-label="閉じる">✕</button></div>
    <div class="sm-body" id="smEdBody"></div></div>
</div>
<div class="modal-overlay" id="smSubOverlay" onclick="if(event.target===this)smCloseSub()">
  <div class="modal"><div class="modal-header"><span id="smSubHdr"></span><button class="modal-close" onclick="smCloseSub()" aria-label="閉じる">✕</button></div>
    <div class="sm-body" id="smSubBody"></div></div>
</div>
<input type="file" id="smPicIn" accept="image/*" hidden onchange="smPickPhoto(this)">
<input type="file" id="smFileIn" accept=".json,application/json" hidden onchange="smImport(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof bindNpToolSwipe==='function') bindNpToolSwipe('shimaiOverlay');
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openShimai(q){
  smEnsureDom(); smLoad(); smPlace='';
  smQ=typeof q==='string'?q:''; $('smFind').value=smQ;
  openDlg('shimaiOverlay'); smRender();
}
function closeShimai(){
  if(!isDlgOpen('shimaiOverlay')) return;
  smStopListen(); smCloseEd(); smCloseSub(); smHideSnack(); closeDlg('shimaiOverlay');
}
function smSetQ(v){ smQ=v; smRender(); }
function smSetView(v){ sm.view=v; smSave(); smRender(); }
function smSetPlace(p){ smPlace=smPlace===p?'':p; smRender(); }

function smRender(){
  if(!$('smList')) return;
  const places=smPlaces();
  if(smPlace && !places.some(p=>p[0]===smPlace)) smPlace='';
  $('smBar').innerHTML=[['new','🕘 新しい順'],['place','📍 場所ごと'],['name','あ 名前順']].map(([k,l])=>`<button class="sm-chip${sm.view===k?' on':''}" onclick="smSetView('${k}')">${l}</button>`).join('')
    +(places.length>1?'<span style="flex:none;width:1px;height:20px;background:rgba(120,132,156,.4)"></span>'+places.slice(0,30).map(([p,n])=>`<button class="sm-chip${smPlace===p?' on':''}" onclick="smSetPlace(${esc(JSON.stringify(p))})">${esc(p)}<small>${n}</small></button>`).join(''):'');
  let list=sm.items;
  if(smPlace) list=list.filter(x=>(x.place||'（場所なし）')===smPlace);
  const L=$('smList');
  if(!sm.items.length){
    L.innerHTML=`<div class="sm-empty">📦<br><b>しまった物と場所を入れておくと、<br>あとで「どこだっけ？」をすぐさがせます。</b><br><br>下の欄に<br>「<b>パスポートは寝室のタンスの2段目</b>」<br>のように打つか、🎤で話してください。<br>写真も付けられます。</div>`;
    return;
  }
  if(smQ.trim()){
    const r=smSearch(smQ, list);
    if(!r.length){ L.innerHTML=`<div class="sm-empty">「<b>${esc(smQ)}</b>」は見つかりませんでした。<br>別の呼び方（ひらがな・短く）でもさがしてみてください。<br><br><button class="sm-btn sub" style="max-width:280px;margin:0 auto" onclick="smAddAs(${esc(JSON.stringify(smQ.trim()))})">＋「${esc(smQ.trim())}」のしまい場所を入れる</button></div>`; return; }
    L.innerHTML=`<div class="sm-grp">見つかった物<span>${r.length}件</span></div>`+r.map((x,i)=>smItemHtml(x, i===0)).join('');
  } else if(sm.view==='place' && !smPlace){
    L.innerHTML=places.map(([p,n])=>`<div class="sm-grp">📍 ${esc(p)}<span>${n}件</span></div>`+sm.items.filter(x=>(x.place||'（場所なし）')===p).sort((a,b)=>a.name.localeCompare(b.name,'ja')).map(x=>smItemHtml(x)).join('')).join('');
  } else {
    const s=list.slice().sort(sm.view==='name' ? (a,b)=>a.name.localeCompare(b.name,'ja') : (a,b)=>(b.updated.localeCompare(a.updated)) || ((b.ts||0)-(a.ts||0)) || b.id.localeCompare(a.id));
    L.innerHTML=(smPlace?`<div class="sm-grp">📍 ${esc(smPlace)}<span>${s.length}件</span></div>`:'')+s.map(x=>smItemHtml(x)).join('');
  }
  smFillThumbs();
}
function smItemHtml(x, hit){
  return `<div class="sm-it${hit?' hit':''}" data-id="${x.id}" onclick="smEdit('${x.id}')"><span class="ph" data-ph="${x.photo?x.id:''}">${x.photo?'':'📦'}</span>
    <span class="tx"><div class="nm">${esc(x.name)}</div><div class="pl">📍 <b>${esc(x.place||'（場所をまだ入れていません）')}</b></div><div class="dt">${fmtDay(x.updated)}${x.hist.length?'　前は：'+esc(x.hist[x.hist.length-1].place):''}</div></span></div>`;
}
async function smFillThumbs(){
  for(const el of document.querySelectorAll('#smList .ph[data-ph]')){
    const id=el.dataset.ph; if(!id) continue;
    let d=smThumbs[id]; if(d===undefined){ d=await smPicGet(id); smThumbs[id]=d; }
    if(d){ el.style.backgroundImage=`url("${d}")`; el.textContent=''; } else el.textContent='📦';
  }
}

/* ── 入れる ── */
function smFind(name){ const n=smNorm(name); return sm.items.find(x=>smNorm(x.name)===n); }
async function smAddText(text){
  text=String(text||'').trim(); if(!text) { $('smAddIn').focus(); return; }
  const w=smAskWhere(text);
  if(w){ $('smAddIn').value=''; $('smFind').value=w; smSetQ(w); return; }   // 「〇〇どこ？」はさがす
  const p=smParse(text);
  if(!p.name){ toast('物の名前を入れてください'); return; }
  $('smAddIn').value='';
  if(!p.place){ smEdit(null, p); return; }                          // 場所が分からなければ入力画面で
  const old=smFind(p.name);
  if(old){
    if(smNorm(old.place)===smNorm(p.place)){ toast('「'+old.name+'」は もう「'+old.place+'」で入っています'); smFlash(old.id); return; }
    const r=await smAsk3('「'+old.name+'」はもう入っています（いまは「'+(old.place||'場所なし')+'」）。\nしまい場所を「'+p.place+'」に変えますか？','場所を変える','別の物として足す','やめる');
    if(r===0) return smMove(old.id, p.place, true);
    if(r!==1) return;
  }
  const it={id:uid(), name:p.name, place:p.place, note:'', photo:false, added:today(), updated:today(), ts:Date.now(), hist:[]};
  sm.items.push(it); if(!smSave()) return;
  smQ=''; $('smFind').value=''; smRender(); smFlash(it.id);
  smSnack(`📦 <b>${esc(it.name)}</b> → ${esc(it.place)}`, [['直す',()=>smEdit(it.id)],['取り消し',()=>smRemove(it.id,true)]]);
}
function smAddAs(name){ smQ=''; $('smFind').value=''; smRender(); smEdit(null, {name, place:''}); }
function smMove(id, place, snack){
  const x=sm.items.find(i=>i.id===id); if(!x) return;
  const before=JSON.stringify(x);
  if(x.place && smNorm(x.place)!==smNorm(place)) x.hist=x.hist.concat([{place:x.place, until:today()}]).slice(-5);
  x.place=place; x.updated=today(); x.ts=Date.now(); smSave(); smRender(); smFlash(id);
  if(snack) smSnack(`📦 <b>${esc(x.name)}</b> の場所を変えました → ${esc(place)}`, [['元に戻す',()=>{ const i=sm.items.findIndex(y=>y.id===id); if(i>=0){ sm.items[i]=JSON.parse(before); smSave(); smRender(); smHideSnack(); } }]]);
}
async function smRemove(id, quiet){
  const x=sm.items.find(i=>i.id===id); if(!x) return;
  if(!quiet && !await appConfirm('「'+x.name+'」を消しますか？','消す','やめる')) return;
  sm.items=sm.items.filter(i=>i.id!==id); smSave(); if(x.photo){ smPicDel(id); delete smThumbs[id]; }
  smHideSnack(); smRender(); if(!quiet) toast('消しました');
}
function smFlash(id){ const e=document.querySelector(`#smList .sm-it[data-id="${id}"]`); if(e){ e.scrollIntoView({block:'nearest'}); e.style.transition='background .2s'; e.style.background='rgba(255,213,79,.45)'; setTimeout(()=>{ e.style.background=''; }, 1600); } }
let smSnackT=null;
function smSnack(html, acts){
  const s=$('smSnack'); if(!s) return;
  s.innerHTML=`<span>${html}</span>`+acts.map((a,i)=>`<button data-i="${i}">${esc(a[0])}</button>`).join('');
  s.querySelectorAll('button').forEach(b=>b.onclick=()=>{ smHideSnack(); acts[+b.dataset.i][1](); });
  s.hidden=false; clearTimeout(smSnackT); smSnackT=setTimeout(smHideSnack, 6000);
}
function smHideSnack(){ const s=$('smSnack'); if(s) s.hidden=true; clearTimeout(smSnackT); }
/* 3つから選ぶ（appConfirm は2つなので、小さな窓を出す）。0/1/2 を返す（閉じたら 2） */
function smAsk3(msg, a, b, c){
  return new Promise(res=>{
    $('smSubHdr').textContent='📦 しまい場所メモ';
    $('smSubBody').innerHTML=`<div style="white-space:pre-wrap;font-size:15px;line-height:1.7;margin:4px 0 8px">${esc(msg)}</div>
      <button class="sm-btn" data-r="0">${esc(a)}</button><button class="sm-btn sub" data-r="1">${esc(b)}</button><button class="sm-btn sub" data-r="2">${esc(c)}</button>`;
    let done=false; const fin=r=>{ if(done) return; done=true; res(r); };
    $('smSubBody').querySelectorAll('button').forEach(x=>x.onclick=()=>{ fin(+x.dataset.r); smCloseSub(); });
    openDlg('smSubOverlay', ()=>fin(2));
  });
}

/* ── 入力画面（足す・直す） ── */
function smEdit(id, pre){
  const x=id ? sm.items.find(i=>i.id===id) : {id:'', name:(pre&&pre.name)||'', place:(pre&&pre.place)||'', note:'', photo:false, hist:[], added:today(), updated:today()};
  if(!x) return;
  smHideSnack();
  smEdId=id; smEdPhoto=undefined;
  $('smEdHdr').textContent=id?'📦 しまった物':'📦 しまった物を入れる';
  const recent=[]; sm.items.slice().sort((a,b)=>b.updated.localeCompare(a.updated)).forEach(i=>{ if(i.place && !recent.includes(i.place)) recent.push(i.place); });
  $('smEdBody').innerHTML=`
    <label class="sm-f">物の名前<input id="smEName" maxlength="60" value="${esc(x.name)}" placeholder="例：パスポート・印鑑・冬タイヤ"></label>
    <label class="sm-f">しまった場所<input id="smEPlace" maxlength="80" value="${esc(x.place)}" placeholder="例：寝室のタンスの2段目"></label>
    ${recent.length?`<div class="sm-pc">${recent.slice(0,10).map(p=>`<button type="button" onclick="document.getElementById('smEPlace').value=${esc(JSON.stringify(p))}">${esc(p)}</button>`).join('')}</div>`:''}
    ${x.hist.length?`<div class="sm-hist">前にあった場所：${x.hist.slice().reverse().map(h=>esc(h.place)+(h.until?'（'+fmtDay(h.until)+'まで）':'')).join('、')}</div>`:''}
    <div class="sm-photo"><div class="pv" id="smEPv" onclick="smShowBig()">📷</div><div class="bt">
      <button type="button" class="sm-btn sub" onclick="document.getElementById('smPicIn').click()">📷 写真を撮る・選ぶ</button>
      <button type="button" class="sm-btn sub" id="smEPicDel" onclick="smClearPhoto()" ${x.photo?'':'hidden'}>写真を外す</button></div></div>
    <label class="sm-f">メモ（あれば）<textarea id="smENote" maxlength="500" placeholder="例：青い箱の中。鍵は赤いキーホルダー">${esc(x.note)}</textarea></label>
    <button class="sm-btn" onclick="smEdSave()">保存する</button>
    ${id?`<button class="sm-btn sub" onclick="smShare('${id}')">📤 家族に送る</button><button class="sm-btn del" onclick="smRemove('${id}')">🗑 消す（もう使わない・捨てた）</button>`:''}
    <button class="sm-btn sub" onclick="smCloseEd()">やめる</button>
    ${id?`<div class="sm-note">入れた日 ${fmtDay(x.added)}　場所を変えた日 ${fmtDay(x.updated)}</div>`:''}`;
  openDlg('smEdOverlay', ()=>{ smEdId=null; });
  smEdPv(x);
  setTimeout(()=>{ const e=x.name?$('smEPlace'):$('smEName'); if(e && !x.place) e.focus(); }, 80);
}
async function smEdPv(x){
  const pv=$('smEPv'); if(!pv) return;
  let d=smEdPhoto;
  if(d===undefined){ x=x||sm.items.find(i=>i.id===smEdId); d=(x && x.photo) ? (smThumbs[x.id]!==undefined?smThumbs[x.id]:await smPicGet(x.id)) : null; }
  pv.style.backgroundImage=d?`url("${d}")`:''; pv.textContent=d?'':'📷';
  const del=$('smEPicDel'); if(del) del.hidden=!d;
}
async function smPickPhoto(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  try{ smEdPhoto=await smResize(f, 900); smEdPv(); }catch(_){ toast('写真を読めませんでした'); }
}
async function smEdSave(){
  const name=$('smEName').value.trim(), place=$('smEPlace').value.trim(), note=$('smENote').value;
  if(!name){ toast('物の名前を入れてください'); $('smEName').focus(); return; }
  let x=smEdId ? sm.items.find(i=>i.id===smEdId) : null;
  if(!x){
    const old=smFind(name);
    if(old && !await appConfirm('「'+old.name+'」はもう入っています（「'+(old.place||'場所なし')+'」）。別の物として足しますか？','足す','やめる')) return;
    x={id:uid(), name, place:'', note:'', photo:false, added:today(), updated:today(), ts:Date.now(), hist:[]}; sm.items.push(x);
  }
  if(x.place && smNorm(x.place)!==smNorm(place)){ x.hist=x.hist.concat([{place:x.place, until:today()}]).slice(-5); x.updated=today(); }
  if(!x.place && place) x.updated=today();
  x.name=name.slice(0,60); x.place=place.slice(0,80); x.note=note.slice(0,500); x.ts=Date.now();
  if(smEdPhoto!==undefined){
    if(smEdPhoto){ try{ await smPicPut(x.id, smEdPhoto); x.photo=true; smThumbs[x.id]=smEdPhoto; }catch(_){ toast('写真を入れられませんでした（端末の空きを見てください）'); } }
    else { x.photo=false; smPicDel(x.id); delete smThumbs[x.id]; }
  }
  if(!smSave()) return;
  const id=x.id; smCloseEd(); smRender(); smFlash(id); toast('保存しました');
}
function smClearPhoto(){ smEdPhoto=null; smEdPv(); }
function smCloseEd(){ closeDlg('smEdOverlay', ()=>{ smEdId=null; }); }
function smCloseSub(){ closeDlg('smSubOverlay'); }
function smShowBig(){
  const pv=$('smEPv'), m=/url\("(.+)"\)/.exec(pv && pv.style.backgroundImage || ''); if(!m){ $('smPicIn').click(); return; }
  $('smSubHdr').textContent='📷 写真'; $('smSubBody').innerHTML=`<img class="sm-big" src="${m[1]}" alt="写真">`; openDlg('smSubOverlay');
}
function smShare(id){
  const x=sm.items.find(i=>i.id===id); if(!x) return;
  const t=`📦 ${x.name}\n📍 ${x.place||'（場所なし）'}${x.note?'\n'+x.note:''}`;
  if(navigator.share) navigator.share({text:t}).catch(()=>{});
  else if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast('コピーしました。LINE などに貼って送れます'),()=>toast(t));
  else toast(t);
}

/* ── 声（1回聞く。さがす／入れる） ── */
let smRec=null;
function smStopListen(){ if(smRec){ try{ smRec.abort(); }catch(_){} smRec=null; } document.querySelectorAll('#smFindMic,#smAddMic').forEach(b=>b.classList.remove('on')); }
function smListen(mode){
  if(smRec){ smStopListen(); return; }
  const C=typeof speechRecCtor==='function' ? speechRecCtor() : (window.SpeechRecognition||window.webkitSpeechRecognition);
  if(!C){ toast('この端末では声を聞き取れません。文字で入れてください'); return; }
  const r=new C(); r.lang='ja-JP'; r.interimResults=true; r.maxAlternatives=1;
  const inp=$(mode==='find'?'smFind':'smAddIn'), btn=$(mode==='find'?'smFindMic':'smAddMic');
  let text='';
  r.onresult=e=>{ text=[...e.results].map(x=>x[0].transcript).join(''); inp.value=text; if(mode==='find') smSetQ(text); };
  r.onerror=e=>{ if(e.error==='not-allowed') toast('マイクを使えません。ブラウザの設定でマイクを許可してください'); };
  r.onend=()=>{ smRec=null; btn.classList.remove('on'); smHeard(mode, text); };
  smRec=r; btn.classList.add('on');
  try{ r.start(); }catch(_){ smStopListen(); }
}
function smHeard(mode, text){
  text=String(text||'').trim(); if(!text) return;
  const w=smAskWhere(text);
  if(mode==='find'){ const q=w||text.replace(/[？?。]+$/,''); $('smFind').value=q; smSetQ(q); return; }
  smAddText(text);
}

/* ── ⚙ メニュー（印刷・CSV・書き出し・読み込み・全部消す） ── */
function smOpenMenu(){
  const n=sm.items.length, np=sm.items.filter(x=>x.photo).length;
  $('smSubHdr').textContent='⚙ しまい場所メモ';
  $('smSubBody').innerHTML=`<div class="sm-note">いま <b>${n}</b> 件（写真つき ${np} 件）。入れたものはこの端末の中だけにあります。</div>
    <button class="sm-btn sub" onclick="smPrint()">🖨 場所ごとの一覧を印刷（家族に配る・冷蔵庫に貼る）</button>
    <button class="sm-btn sub" onclick="smCsv()">📄 CSV（Excel）で書き出す</button>
    <button class="sm-btn sub" onclick="smExport()">⬇ 書き出す（写真ごと。機種変えのときに）</button>
    <button class="sm-btn sub" onclick="document.getElementById('smFileIn').click()">⬆ 読み込む</button>
    <div class="sm-note">📋リストの ⬇書き出し（全体のバックアップ）にも入ります。写真は、そのとき入れるか聞きます。</div>
    <button class="sm-btn del" onclick="smWipe()">🗑 ぜんぶ消す</button>`;
  openDlg('smSubOverlay');
}
function smPrint(){
  const places=smPlaces();
  const html=`<div class="sm-pr"><h1>📦 しまい場所の一覧</h1><div style="font-size:9pt;color:#555">${fmtDay(today())} 現在・${sm.items.length}件</div>`
    +places.map(([p,n])=>`<h2>📍 ${esc(p)}（${n}）</h2><table>${sm.items.filter(x=>(x.place||'（場所なし）')===p).sort((a,b)=>a.name.localeCompare(b.name,'ja')).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.note)}</td></tr>`).join('')}</table>`).join('')+'</div>';
  smCloseSub();
  if(typeof opBuild==='function' && typeof opPrint==='function') opPrint(opBuild(html, true)); else window.print();
}
function smDownload(name, text, type){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([text],{type})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function smCsv(){
  const q=s=>'"'+String(s==null?'':s).replace(/"/g,'""')+'"';
  const rows=[['物','場所','メモ','前の場所','場所を変えた日']].concat(sm.items.map(x=>[x.name,x.place,x.note,x.hist.map(h=>h.place).join(' / '),x.updated]));
  smDownload('しまい場所_'+today()+'.csv', '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}
async function smPicsAll(){
  const o={}; for(const x of sm.items) if(x.photo){ const d=smThumbs[x.id]!==undefined?smThumbs[x.id]:await smPicGet(x.id); if(d) o[x.id]=d; }
  return o;
}
async function smExport(){
  const pics=await smPicsAll();
  smDownload('しまい場所_'+today()+'.json', JSON.stringify({app:'hyodenki', type:'shimai', version:1, data:sm, pics}), 'application/json');
  toast('書き出しました（写真 '+Object.keys(pics).length+'枚）');
}
/* 読み込み：同じ id は新しい方、ないものは足す（置きかえずに合わせる） */
async function smMerge(d, pics){
  const inc=smClean(d); let add=0, upd=0;
  for(const x of inc.items){
    const i=sm.items.findIndex(y=>y.id===x.id);
    if(i<0){ sm.items.push(x); add++; }
    else if(x.updated>sm.items[i].updated){ sm.items[i]=x; upd++; }
    else continue;
    if(pics && typeof pics[x.id]==='string' && /^data:image\//.test(pics[x.id])){ try{ await smPicPut(x.id, pics[x.id]); smThumbs[x.id]=pics[x.id]; x.photo=true; }catch(_){} }
    else if(x.photo && !(await smPicGet(x.id))) x.photo=false;
  }
  smSave(); return {add, upd};
}
async function smImport(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  let o=null; try{ o=JSON.parse(await f.text()); }catch(_){}
  const d=o && (o.type==='shimai' ? o.data : o.shimai), pics=o && (o.type==='shimai' ? o.pics : o.shimaiPics);
  if(!d || !Array.isArray(d.items)){ toast('しまい場所メモのファイルではありません'); return; }
  const r=await smMerge(d, pics); smCloseSub(); smRender();
  toast('読み込みました（足した '+r.add+'件・新しくした '+r.upd+'件）');
}
async function smWipe(){
  if(!sm.items.length){ toast('入っているものはありません'); return; }
  if(!await appConfirm('しまい場所メモを ぜんぶ（'+sm.items.length+'件・写真も）消しますか？\n元に戻せません。','ぜんぶ消す','やめる')) return;
  for(const x of sm.items) if(x.photo) smPicDel(x.id);
  sm.items=[]; for(const k in smThumbs) delete smThumbs[k]; smSave(); smCloseSub(); smRender(); toast('消しました');
}
/* 表電卓の📋リストの読み込みから（開いていなくても、保存してあるものに合わせる） */
async function smMergeStored(d, pics){ smLoad(); const r=await smMerge(d, pics); if($('shimaiOverlay') && isDlgOpen('shimaiOverlay')) smRender(); return r; }
function smReload(){ if($('shimaiOverlay') && isDlgOpen('shimaiOverlay')){ smLoad(); smRender(); } }

Object.assign(window, { openShimai, closeShimai, smSetQ, smSetView, smSetPlace, smAddText, smAddAs, smEdit, smEdSave, smCloseEd, smCloseSub, smRemove,
  smPickPhoto, smShowBig, smShare, smListen, smOpenMenu, smPrint, smCsv, smExport, smImport, smWipe, smReload, smMerge, smMergeStored, smPicsAll,
  smParse, smAskWhere, smSearch, smNorm, smHeard, smState:()=>sm, smClearPhoto, smEdPv });
})();
