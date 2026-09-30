/* 🔐 サブスク管理表（v453。v464 で作りかえ。表電卓の道具。はじめて開いたときに読む）
   使っているサブスク（動画・音楽・アプリ など）の金額・支払日・支払方法と、ログインの ID・パスワードを1か所にまとめる。
   ・v464 から：開く・見る・足す・直すのにパスワードは要らない。保存したパスワード（ログインのパスワード）を
     見る・コピーするときだけ、閲覧用のパスワードを聞く（ヒントを出す）。
   ・しくみ：閲覧用のパスワードを決めたときに、鍵の組（RSA-OAEP 2048）を作る。
     「かける鍵」（公開鍵）はそのまま置き、「開ける鍵」（秘密鍵）は閲覧用のパスワードから作った鍵（PBKDF2-SHA256 → AES-GCM）で暗号にして置く。
     ログインのパスワードは、1つずつ使い捨ての鍵（AES-GCM）で暗号にし、その使い捨ての鍵を「かける鍵」で包んで置く。
     だから、パスワードを足す・書きかえるのに閲覧用のパスワードは要らず、見るときだけ要る。
   ・端末に残るのは、一覧（名前・金額・支払日・ID・メモ など）と、暗号にしたパスワードとヒント。閲覧用のパスワードそのものは残さない。
   ・閉じる・アプリを離れて決めた時間がたつ・🔒 を押すと、また鍵がかかる（パスワードは隠れる）。
   ・閲覧用のパスワードを忘れたら、保存したパスワードだけは取り出せない（一覧は残る）。
   ・v453 の形（全部を1つの暗号にしたもの）は、はじめて開いたときに、いまのパスワードを入れて新しい形に移す。 */
(function(){
const SB_KEY='excalc_subsc';
const SB_ITER=250000;
const SB_CYCLES={m:'毎月', y:'毎年', w:'毎週'};
let sbData=null, sbOld=null, sbPriv=null, sbPwCache={}, sbEdId=null, sbEdPwFilled=false, sbQ='', sbShowPw={},
    sbLockTimer=null, sbHiddenAt=0, sbFails=0, sbWaitUntil=0, sbPwThen=null;

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b64=u8=>{ u8=new Uint8Array(u8); let s=''; u8.forEach(b=>s+=String.fromCharCode(b)); return btoa(s); };
const unb64=s=>Uint8Array.from(atob(s), c=>c.charCodeAt(0));
const yen=n=>(Math.round(+n||0)).toLocaleString('ja-JP')+'円';
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>isoOf(new Date());
const isDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isStr=s=>typeof s==='string' && s.length>0 && s.length<20000;
const newId=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ── 暗号 ── */
const RSA={name:'RSA-OAEP', hash:'SHA-256'};
async function sbDerive(pw, salt, iter){
  const base=await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function aesEnc(key, bytes){ const iv=crypto.getRandomValues(new Uint8Array(12)); return {iv:b64(iv), ct:b64(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, bytes))}; }
async function aesDec(key, o){ return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(o.iv)}, key, unb64(o.ct))); }
/* 閲覧用のパスワードを決める：鍵の組を作り、開ける鍵をパスワードで暗号にする */
async function sbMakeKeys(pw){
  const kp=await crypto.subtle.generateKey({...RSA, modulusLength:2048, publicExponent:new Uint8Array([1,0,1])}, true, ['encrypt','decrypt']);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const k=await sbDerive(pw, salt, SB_ITER);
  const priv=await aesEnc(k, await crypto.subtle.exportKey('pkcs8', kp.privateKey));
  return { salt:b64(salt), iter:SB_ITER, pub:b64(await crypto.subtle.exportKey('spki', kp.publicKey)), priv, privKey:kp.privateKey };
}
/* 閲覧用のパスワードで「開ける鍵」を取り出す（ちがえば AES-GCM の確かめで失敗する） */
async function sbOpenPriv(pw, d){
  const k=await sbDerive(pw, unb64(d.salt), +d.iter||SB_ITER);
  const raw=await aesDec(k, d.priv);
  return crypto.subtle.importKey('pkcs8', raw, RSA, false, ['decrypt']);
}
/* ログインのパスワードを暗号にする（かける鍵だけで足りる） */
async function sbSeal(text){
  const pub=await crypto.subtle.importKey('spki', unb64(sbData.pub), RSA, false, ['encrypt']);
  const k=await crypto.subtle.generateKey({name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
  const body=await aesEnc(k, new TextEncoder().encode(text));
  const ek=b64(await crypto.subtle.encrypt(RSA, pub, await crypto.subtle.exportKey('raw', k)));
  return {ek, iv:body.iv, ct:body.ct};
}
async function sbUnseal(sec){
  const raw=new Uint8Array(await crypto.subtle.decrypt(RSA, sbPriv, unb64(sec.ek)));
  const k=await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  return new TextDecoder().decode(await aesDec(k, sec));
}

/* ── 保存（v2：{v:2, items, lockMin, hint, salt, iter, pub, priv}） ── */
function sbRaw(){ try{ return JSON.parse(localStorage.getItem(SB_KEY)||'null'); }catch(_){ return null; } }
const sbIsOld=o=>!!(o && o.v!==2 && isStr(o.ct) && isStr(o.salt) && isStr(o.iv));
function sbCleanItem(x){
  const sec=x.sec && isStr(x.sec.ek) && isStr(x.sec.iv) && isStr(x.sec.ct) ? {ek:x.sec.ek, iv:x.sec.iv, ct:x.sec.ct} : null;
  return { id:String(x.id||newId()), name:String(x.name||'').slice(0,80), price:Math.max(0, Math.min(1e9, +x.price||0)),
    cycle:SB_CYCLES[x.cycle]?x.cycle:'m', next:isDate(x.next)?x.next:'', pay:String(x.pay||'').slice(0,60), cat:String(x.cat||'').slice(0,30),
    uid:String(x.uid||'').slice(0,200), url:String(x.url||'').slice(0,400), memo:String(x.memo||'').slice(0,2000),
    stop:!!x.stop, upd:+x.upd||0, sec };
}
function sbClean(d){
  d=d&&typeof d==='object'?d:{};
  const keys=isStr(d.pub) && isStr(d.salt) && d.priv && isStr(d.priv.iv) && isStr(d.priv.ct);
  return { v:2, items:(Array.isArray(d.items)?d.items:[]).filter(x=>x && typeof x==='object').slice(0,500).map(sbCleanItem),
    lockMin:[0,1,5,15].includes(+d.lockMin) ? +d.lockMin : 5, hint:String(d.hint||'').slice(0,100),
    salt:keys?d.salt:'', iter:keys?(+d.iter||SB_ITER):SB_ITER, pub:keys?d.pub:'', priv:keys?{iv:d.priv.iv, ct:d.priv.ct}:null, upd:+d.upd||0 };
}
function sbLoad(){ const o=sbRaw(); sbOld=sbIsOld(o)?o:null; sbData=sbOld?null:sbClean(o); }
function sbSave(){
  if(!sbData) return false;
  sbData.upd=Date.now();
  try{ localStorage.setItem(SB_KEY, JSON.stringify(sbData)); return true; }
  catch(_){ toast('端末の空きが足りず、保存できませんでした'); return false; }
}
const sbHasKeys=()=>!!(sbData && sbData.pub && sbData.priv);

/* ── 画面 ── */
const SB_CSS=`
#subscOverlay .sb-modal{ display:flex; flex-direction:column; max-width:520px; }
.sb-body{ flex:1; min-height:0; overflow:auto; padding:12px 12px calc(16px + var(--safe-bottom,0px)); }
.sb-lock{ max-width:360px; margin:10px auto; text-align:center; }
.sb-lock .sb-ic{ font-size:44px; margin:8px 0 4px; }
.sb-hint{ background:#fff8e1; color:#5d4037; border-radius:10px; padding:10px 12px; margin:10px 0; font-size:14px; text-align:left; overflow-wrap:anywhere; }
body.dark .sb-hint{ background:#3e3420; color:#ffe0a3; }
.sb-f{ display:block; text-align:left; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:8px 0; }
.sb-f input,.sb-f select,.sb-f textarea{ display:block; width:100%; box-sizing:border-box; margin-top:4px; min-height:42px; padding:6px 10px; font-size:16px;
  border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
.sb-f textarea{ min-height:64px; resize:vertical; }
.sb-row2{ display:flex; gap:8px; } .sb-row2 > *{ flex:1; min-width:0; }
.sb-pwrow{ display:flex; gap:6px; align-items:stretch; margin-top:4px; }
.sb-pwrow input{ margin-top:0 !important; flex:1; min-width:0; }
.sb-pwrow button{ flex:none; min-width:44px; border-radius:8px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.10); color:var(--text,#222); font-size:15px; cursor:pointer; }
.sb-btn{ display:block; width:100%; height:46px; margin:10px 0 0; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:16px; font-weight:bold; cursor:pointer; }
.sb-btn.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.sb-btn.del{ background:transparent; color:#d32f2f; border:1px solid rgba(211,47,47,.45); }
.sb-err{ color:#d32f2f; font-size:13px; min-height:1.4em; margin-top:6px; }
.sb-note{ font-size:12px; color:var(--text-light,#888); line-height:1.6; margin:8px 0; text-align:left; }
.sb-sum{ display:flex; gap:8px; margin-bottom:10px; }
.sb-sum div{ flex:1; background:rgba(33,115,70,.10); border-radius:10px; padding:8px 6px; text-align:center; }
.sb-sum b{ display:block; font-size:18px; color:var(--acc-text,#217346); }
body.dark .sb-sum b{ color:#8fd4ab; }
.sb-sum small{ font-size:11px; color:var(--text-light,#888); }
.sb-tool{ display:flex; gap:8px; margin-bottom:10px; }
.sb-tool input{ flex:1; min-width:0; height:40px; padding:0 10px; font-size:16px; border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.sb-tool button{ flex:none; height:40px; padding:0 14px; border:none; border-radius:8px; background:var(--acc); color:#fff; font-weight:bold; font-size:14px; cursor:pointer; }
.sb-card{ border:1px solid rgba(120,132,156,.30); border-radius:12px; padding:10px 12px; margin-bottom:8px; background:var(--modal-bg,#fff); cursor:pointer; }
.sb-card.stop{ opacity:.55; }
.sb-card.soon{ border-color:#f0ad4e; box-shadow:0 0 0 2px rgba(240,173,78,.25); }
.sb-top{ display:flex; align-items:baseline; gap:8px; }
.sb-name{ flex:1; min-width:0; font-weight:bold; font-size:15px; overflow-wrap:anywhere; }
.sb-price{ flex:none; font-weight:bold; font-size:15px; }
.sb-price small{ font-weight:normal; font-size:11px; color:var(--text-light,#888); margin-left:2px; }
.sb-meta{ font-size:12px; color:var(--text-light,#888); margin-top:3px; overflow-wrap:anywhere; }
.sb-meta .due{ color:#e65100; font-weight:bold; }
.sb-cred{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.sb-cred span{ display:inline-flex; align-items:center; gap:4px; max-width:100%; font-size:12.5px; background:rgba(120,132,156,.10); border-radius:8px; padding:3px 4px 3px 8px; }
.sb-cred span i{ font-style:normal; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:170px; }
.sb-cred button{ border:none; background:transparent; font-size:13px; padding:2px 5px; cursor:pointer; color:var(--text,#333); }
.sb-empty{ text-align:center; color:var(--text-light,#888); padding:30px 10px; font-size:14px; line-height:1.8; }
.sb-sec{ font-size:13px; font-weight:bold; margin:16px 0 4px; padding-bottom:3px; border-bottom:1px solid rgba(120,132,156,.3); }
.sb-seg{ display:flex; gap:6px; flex-wrap:wrap; }
.sb-seg button{ height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-weight:bold; font-size:13px; cursor:pointer; }
.sb-seg button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
/* 保存したパスワード（v464）：鍵がかかっているあいだは 🔒 を添える */
.sb-cred .sb-lk{ font-size:11px; font-weight:normal; opacity:.75; }
.sb-hdrbtn{ background:rgba(255,255,255,.18); color:#fff; border:none; border-radius:8px; height:32px; padding:0 9px; font-size:15px; cursor:pointer; }
`;
function sbEnsureDom(){
  if($('subscOverlay')) return;
  const st=document.createElement('style'); st.id='sbStyle'; st.textContent=SB_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="subscOverlay">
  <div class="modal sb-modal">
    <div class="modal-header"><span>🔐 サブスク管理表</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="hdr-btn" id="sbLockBtn" onclick="sbLockNow()" aria-label="パスワードを隠す（鍵をかける）" title="パスワードを隠す（鍵をかける）" hidden>🔒</button>
      <button class="hdr-btn" id="sbSetBtn" onclick="sbOpenSet()" title="設定">⚙ 設定</button>
      <button class="modal-close" onclick="closeSubsc()" aria-label="閉じる">✕</button></span></div>
    <div class="sb-body" id="sbBody"></div>
  </div>
</div>
<div class="modal-overlay" id="sbEdOverlay" onclick="if(event.target===this)sbCloseEd()">
  <div class="modal sb-modal"><div class="modal-header"><span id="sbEdHdr">サブスクを足す</span><button class="modal-close" onclick="sbCloseEd()" aria-label="閉じる">✕</button></div>
    <div class="sb-body" id="sbEdBody"></div></div>
</div>
<div class="modal-overlay" id="sbSetOverlay" onclick="if(event.target===this)sbCloseSet()">
  <div class="modal sb-modal"><div class="modal-header"><span>⚙ サブスク管理表の設定</span><button class="modal-close" onclick="sbCloseSet()" aria-label="閉じる">✕</button></div>
    <div class="sb-body" id="sbSetBody"></div></div>
</div>
<div class="modal-overlay" id="sbPwOverlay" onclick="if(event.target===this)sbClosePw()">
  <div class="modal sb-modal"><div class="modal-header"><span id="sbPwHdr">🔓 パスワードを見る</span><button class="modal-close" onclick="sbClosePw()" aria-label="閉じる">✕</button></div>
    <div class="sb-body" id="sbPwBody"></div></div>
</div>
<input type="file" id="sbFileIn" accept=".json,application/json" hidden onchange="sbImportFile(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ sbHiddenAt=Date.now(); return; }
    // アプリに戻ったとき、決めた時間より長く離れていたら鍵をかける（パスワードを隠す）
    if(sbPriv && sbData && sbData.lockMin && sbHiddenAt && Date.now()-sbHiddenAt > sbData.lockMin*60000) sbLockNow(true);
    sbHiddenAt=0;
  });
  ['pointerdown','keydown'].forEach(t=>$('subscOverlay').addEventListener(t, sbTouch, true));
}
/* さわっていないまま決めた時間がたったら鍵をかける */
function sbTouch(){
  clearTimeout(sbLockTimer);
  if(!sbPriv || !sbData || !sbData.lockMin) return;
  sbLockTimer=setTimeout(()=>{ if(sbPriv) sbLockNow(true); }, sbData.lockMin*60000);
}

/* ── 開く・閉じる・鍵 ── */
function openSubsc(){
  sbEnsureDom(); sbLoad();
  openDlg('subscOverlay', ()=>sbForget());
  sbRender();
}
function closeSubsc(){
  if(!isDlgOpen('subscOverlay')) return;
  sbCloseEd(); sbCloseSet(); sbClosePw();
  closeDlg('subscOverlay', ()=>sbForget());
}
/* 開ける鍵と、見せたパスワードを忘れる */
function sbForgetKey(){ sbPriv=null; sbPwCache={}; sbShowPw={}; clearTimeout(sbLockTimer); }
function sbForget(){ sbForgetKey(); sbQ=''; const b=$('sbBody'); if(b) b.innerHTML=''; }
function sbLockNow(auto){
  const was=!!sbPriv;
  sbForgetKey();
  if(sbEdId!=null || isDlgOpen('sbEdOverlay')) sbCloseEd();
  if(isDlgOpen('subscOverlay')) sbRender();
  if(auto && was) toast('しばらく使わなかったので、パスワードを隠しました');
}
function sbRender(){
  if(!$('sbBody')) return;
  $('sbLockBtn').hidden=!sbPriv; $('sbSetBtn').hidden=!sbData;
  if(sbOld) sbRenderMigrate(); else sbRenderList();
}

/* ── v453 の形から移す（いまのパスワードで中身を開いて、新しい形にする） ── */
function sbRenderMigrate(){
  $('sbBody').innerHTML=`<div class="sb-lock">
    <div class="sb-ic">🔐</div><b>サブスク管理表が新しくなりました</b>
    <div class="sb-note">これからは<b>パスワードを入れなくても</b>一覧を見たり足したりできます。保存したパスワード（ログインのパスワード）を<b>見るときだけ</b>、パスワードを聞きます。<br>
      新しい形に移すため、<b>一度だけ</b>いつものパスワードを入れてください。</div>
    <div class="sb-hint"><b>💡 ヒント</b><br>${esc(sbOld.hint||'（ヒントはありません）')}</div>
    <form onsubmit="event.preventDefault(); sbMigrate();">
      <label class="sb-f">いつものパスワード<input type="password" id="sbPwIn" autocomplete="current-password"></label>
      <div class="sb-err" id="sbErr"></div>
      <button class="sb-btn" type="submit" id="sbOpenBtn">新しい形に移す</button>
    </form>
    <div class="sb-note" style="margin-top:22px">パスワードを忘れたときは、中身を取り出すことはできません。<br>
      <a href="#" onclick="event.preventDefault(); sbWipe();">全部消して、はじめからやり直す</a></div></div>`;
  setTimeout(()=>{ const e=$('sbPwIn'); if(e) e.focus(); }, 60);
}
async function sbMigrate(){
  const pw=$('sbPwIn').value; if(!pw){ $('sbErr').textContent='パスワードを入れてください'; return; }
  if(Date.now()<sbWaitUntil){ $('sbErr').textContent='まちがいが続いたので、'+Math.ceil((sbWaitUntil-Date.now())/1000)+'秒待ってください'; return; }
  $('sbOpenBtn').disabled=true; $('sbErr').textContent='たしかめています…';
  let old=null;
  try{
    const k=await sbDerive(pw, unb64(sbOld.salt), +sbOld.iter||SB_ITER);
    old=JSON.parse(new TextDecoder().decode(await aesDec(k, sbOld)));
  }catch(_){
    sbFails++; if(sbFails>=5){ sbWaitUntil=Date.now()+30000; sbFails=0; }
    $('sbErr').textContent='パスワードがちがいます'; $('sbOpenBtn').disabled=false; $('sbPwIn').value=''; $('sbPwIn').focus(); return;
  }
  $('sbErr').textContent='新しい形にしています…';
  const keys=await sbMakeKeys(pw);
  sbData=sbClean({ items:[], lockMin:(old||{}).lockMin, hint:sbOld.hint, salt:keys.salt, iter:keys.iter, pub:keys.pub, priv:keys.priv });
  for(const x of ((old||{}).items||[])){
    const it=sbCleanItem(x);
    if(x.pw) it.sec=await sbSeal(String(x.pw).slice(0,200));
    sbData.items.push(it);
  }
  if(!sbSave()){ sbLoad(); return; }
  sbOld=null; sbPriv=keys.privKey; sbFails=0;
  sbRollNext(); sbTouch(); sbRender(); toast('新しい形にしました。これからは開くときにパスワードは要りません');
}
async function sbWipe(){
  if(!await appConfirm('サブスク管理表の中身を全部消して、はじめからやり直しますか？\n（消したものは戻せません）','全部消す','やめる')) return;
  localStorage.removeItem(SB_KEY); sbForget(); sbCloseSet(); sbLoad(); sbRender(); toast('消しました');
}

/* ── 閲覧用のパスワード：聞く（ヒントを出す）・はじめて決める ──
   then は開けた（決めた）あとにすること */
function sbNeedKey(then){
  if(sbPriv){ then(); return; }
  if(!sbHasKeys()){ toast('保存したパスワードはありません'); return; }
  sbPwThen=then;
  $('sbPwHdr').textContent='🔓 パスワードを見る';
  $('sbPwBody').innerHTML=`<div class="sb-lock">
    <div class="sb-ic">🔒</div><b>閲覧用のパスワードを入れてください</b>
    <div class="sb-hint"><b>💡 ヒント</b><br>${esc(sbData.hint||'（ヒントはありません）')}</div>
    <form onsubmit="event.preventDefault(); sbUnlock();">
      <label class="sb-f">閲覧用のパスワード<input type="password" id="sbPwIn" autocomplete="current-password"></label>
      <div class="sb-err" id="sbErr"></div>
      <button class="sb-btn" type="submit" id="sbOpenBtn">見る</button>
    </form>
    <div class="sb-note" style="margin-top:18px">一覧を見る・足す・直すのには要りません。保存したパスワードを<b>見る・コピーする</b>ときだけ聞きます。<br>
      忘れたときは ⚙ 設定 の「保存したパスワードだけ消す」で、はじめから決め直せます（一覧は残ります）。</div></div>`;
  openDlg('sbPwOverlay', ()=>{ sbPwThen=null; });
  setTimeout(()=>{ const e=$('sbPwIn'); if(e) e.focus(); }, 60);
}
async function sbUnlock(){
  const now=Date.now();
  if(now<sbWaitUntil){ $('sbErr').textContent='まちがいが続いたので、'+Math.ceil((sbWaitUntil-now)/1000)+'秒待ってください'; return; }
  const pw=$('sbPwIn').value; if(!pw){ $('sbErr').textContent='パスワードを入れてください'; return; }
  $('sbOpenBtn').disabled=true; $('sbErr').textContent='たしかめています…';
  try{ sbPriv=await sbOpenPriv(pw, sbData); }
  catch(_){
    sbFails++; if(sbFails>=5){ sbWaitUntil=Date.now()+30000; sbFails=0; }
    const e=$('sbErr'); if(e) e.textContent='パスワードがちがいます';
    const b=$('sbOpenBtn'); if(b) b.disabled=false;
    const i=$('sbPwIn'); if(i){ i.value=''; i.focus(); }
    return;
  }
  sbFails=0; const then=sbPwThen; sbPwThen=null;
  sbClosePw(); sbTouch(); $('sbLockBtn').hidden=false;
  if(then) await then();
}
/* はじめてパスワードを保存するとき：閲覧用のパスワードとヒントを決める */
function sbAskCreate(then){
  sbPwThen=then;
  $('sbPwHdr').textContent='🔐 閲覧用のパスワードを決める';
  $('sbPwBody').innerHTML=`<div class="sb-lock">
    <div class="sb-ic">🔐</div><b>保存したパスワードを守る、閲覧用のパスワードを決めます</b>
    <div class="sb-note">ログインのパスワードは、これで<b>暗号にして端末の中だけ</b>に残します。見るときだけ、このパスワードを聞きます（一覧を見る・足すのには要りません）。<br>
      <b>忘れると、保存したパスワードは見られません</b>（作った人にも戻せません）。思い出せるヒントを付けてください。</div>
    <label class="sb-f">閲覧用のパスワード（4文字以上）<input type="password" id="sbNew1" autocomplete="new-password"></label>
    <label class="sb-f">もう一度<input type="password" id="sbNew2" autocomplete="new-password"></label>
    <label class="sb-f">ヒント（見るときに出ます。パスワードそのものは書かないでください）<input type="text" id="sbHintIn" maxlength="100" placeholder="例：最初に飼った犬の名前＋誕生月"></label>
    <div class="sb-err" id="sbErr"></div>
    <button class="sb-btn" id="sbCreateBtn" onclick="sbCreate()">決めて保存する</button></div>`;
  openDlg('sbPwOverlay', ()=>{ sbPwThen=null; });
  setTimeout(()=>{ const e=$('sbNew1'); if(e) e.focus(); }, 60);
}
async function sbCreate(){
  const p1=$('sbNew1').value, p2=$('sbNew2').value, hint=$('sbHintIn').value.trim();
  const err=m=>{ $('sbErr').textContent=m; };
  if(p1.length<4) return err('パスワードは4文字以上にしてください');
  if(p1!==p2) return err('2回入れたパスワードがちがいます');
  if(!hint) return err('ヒントを入れてください（忘れたときの手がかりになります）');
  if(hint.includes(p1)) return err('ヒントにパスワードそのものを入れないでください');
  $('sbCreateBtn').disabled=true; err('鍵を作っています…');
  const keys=await sbMakeKeys(p1);
  Object.assign(sbData, {hint, salt:keys.salt, iter:keys.iter, pub:keys.pub, priv:keys.priv});
  if(!sbSave()) return;
  sbPriv=keys.privKey; sbTouch();
  const then=sbPwThen; sbPwThen=null;
  sbClosePw(); $('sbLockBtn').hidden=false;
  toast('閲覧用のパスワードを決めました');
  if(then) await then();
}
function sbClosePw(){ closeDlg('sbPwOverlay', ()=>{ sbPwThen=null; }); const b=$('sbPwBody'); if(b) b.innerHTML=''; }

/* ── 一覧 ── */
function sbPerMonth(it){ return it.stop ? 0 : it.cycle==='y' ? it.price/12 : it.cycle==='w' ? it.price*52/12 : it.price; }
function sbDaysTo(iso){ if(!isDate(iso)) return null; const a=new Date(today()+'T00:00'), b=new Date(iso+'T00:00'); return Math.round((b-a)/86400000); }
function sbAddCycle(iso, cycle){
  const d=new Date(iso+'T00:00');
  if(cycle==='w') d.setDate(d.getDate()+7);
  else { const day=+iso.slice(8,10), m=d.getMonth()+(cycle==='y'?12:1); d.setDate(1); d.setMonth(m); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth()+1, 0).getDate())); }
  return isoOf(d);
}
/* 支払日が過ぎていたら、次の支払日へ進めておく */
function sbRollNext(){
  let ch=false; const t=today();
  sbData.items.forEach(it=>{ if(it.stop || !isDate(it.next)) return; let n=0; while(it.next<t && n++<600){ it.next=sbAddCycle(it.next, it.cycle); ch=true; } });
  if(ch) sbSave();
}
function sbRenderList(){
  if(!sbData) return;
  sbRollNext();
  const items=sbData.items, act=items.filter(x=>!x.stop);
  const mon=act.reduce((s,x)=>s+sbPerMonth(x),0);
  const q=sbQ.normalize('NFKC').toLowerCase();
  const list=items.filter(x=>!q || [x.name,x.pay,x.cat,x.memo,x.uid,x.url].some(v=>String(v||'').normalize('NFKC').toLowerCase().includes(q)))
    .sort((a,b)=>(a.stop-b.stop) || ((a.next||'9')<(b.next||'9')?-1:(a.next||'9')>(b.next||'9')?1:0) || a.name.localeCompare(b.name,'ja'));
  const keepQ=document.activeElement && document.activeElement.id==='sbQ';
  $('sbBody').innerHTML=`<div class="sb-sum"><div><b>${yen(mon)}</b><small>月あたり</small></div><div><b>${yen(mon*12)}</b><small>年あたり</small></div><div><b>${act.length}件</b><small>契約中</small></div></div>
    <div class="sb-tool"><input type="search" id="sbQ" placeholder="🔍 さがす" value="${esc(sbQ)}" aria-label="サブスクをさがす" oninput="sbQ=this.value;sbRenderList()"><button onclick="sbEdit(null)">＋ 足す</button></div>
    ${list.length ? list.map(sbCardHtml).join('') : `<div class="sb-empty">${items.length?'見つかりません':'まだありません。<br>「＋ 足す」で使っているサブスクを入れてください'}</div>`}
    <div class="sb-note">金額は「月あたり」に直して合計しています（年払いは12で割る・週払いは52週÷12）。止めたものは合計に入りません。支払日が過ぎると、次の支払日へ自動で進みます。<br>
      🔒 保存したパスワード（PW）は、👁 で<b>見るとき</b>・📋 で<b>コピーするとき</b>だけ、閲覧用のパスワードを聞きます。</div>`;
  if(keepQ){ const e=$('sbQ'); e.focus(); try{ e.setSelectionRange(e.value.length, e.value.length); }catch(_){} }
}
function sbCardHtml(it){
  const d=sbDaysTo(it.next), soon=!it.stop && d!=null && d<=7;
  const when=it.stop ? '止めた' : !it.next ? '支払日 未設定' : `次は ${+it.next.slice(5,7)}/${+it.next.slice(8,10)}`+(d===0?' <span class="due">今日</span>':d!=null&&d<=7?` <span class="due">あと${d}日</span>`:'');
  const show=!!sbShowPw[it.id] && sbPwCache[it.id]!=null;
  const parts=[];
  if(it.uid) parts.push(`<span>ID <i>${esc(it.uid)}</i><button onclick="sbCopy('${it.id}','uid')" aria-label="IDをコピー">📋</button></span>`);
  if(it.sec) parts.push(`<span class="sb-pw">PW <i>${show?esc(sbPwCache[it.id]):'••••••••'}</i>${sbPriv?'':'<b class="sb-lk" aria-hidden="true">🔒</b>'}<button onclick="sbTogglePw('${it.id}')" aria-label="パスワードを${show?'隠す':'見る'}">${show?'🙈':'👁'}</button><button onclick="sbCopy('${it.id}','pw')" aria-label="パスワードをコピー">📋</button></span>`);
  if(it.url) parts.push(`<span><i>${esc(it.url.replace(/^https?:\/\//,''))}</i><button onclick="sbOpenUrl('${it.id}')" aria-label="サイトを開く">↗</button></span>`);
  return `<div class="sb-card${it.stop?' stop':''}${soon?' soon':''}" data-id="${it.id}" onclick="sbEdit('${it.id}')">
    <div class="sb-top"><span class="sb-name">${esc(it.name||'（名前なし）')}</span><span class="sb-price">${yen(it.price)}<small>/${SB_CYCLES[it.cycle].slice(1)}</small></span></div>
    <div class="sb-meta">${when}${it.pay?' ・ '+esc(it.pay):''}${it.cat?' ・ '+esc(it.cat):''}</div>${parts.length?`<div class="sb-cred" onclick="event.stopPropagation()">${parts.join('')}</div>`:''}</div>`;
}
function sbItem(id){ return sbData && sbData.items.find(x=>x.id===id); }
async function sbReveal(id){
  const it=sbItem(id); if(!it || !it.sec) return null;
  if(sbPwCache[id]==null){ try{ sbPwCache[id]=await sbUnseal(it.sec); }catch(_){ toast('このパスワードは開けませんでした'); return null; } }
  return sbPwCache[id];
}
function sbTogglePw(id){
  if(sbShowPw[id]){ sbShowPw[id]=false; sbRenderList(); return; }
  sbNeedKey(async ()=>{ if(await sbReveal(id)!=null){ sbShowPw[id]=true; sbTouch(); } sbRenderList(); });
}
async function sbCopy(id, f){
  const it=sbItem(id); if(!it) return;
  const put=async v=>{
    try{ await navigator.clipboard.writeText(v); toast((f==='pw'?'パスワード':'ID')+'をコピーしました'); }
    catch(_){ toast('コピーできませんでした（長押しで選んでコピーしてください）'); if(f==='pw'){ sbShowPw[id]=true; sbRenderList(); } }
  };
  if(f==='uid'){ if(it.uid) await put(it.uid); return; }
  if(!it.sec) return;
  sbNeedKey(async ()=>{ const v=await sbReveal(id); if(v!=null) await put(v); sbRenderList(); });
}
function sbOpenUrl(id){
  const it=sbItem(id); if(!it || !it.url) return;
  const u=/^https?:\/\//i.test(it.url) ? it.url : 'https://'+it.url;
  window.open(u, '_blank', 'noopener');
}

/* ── 足す・直す（パスワードは要らない。保存したパスワードの中を見るときだけ聞く） ── */
function sbEdit(id){
  const it=id ? sbItem(id) : {name:'', price:'', cycle:'m', next:'', pay:'', cat:'', uid:'', url:'', memo:'', stop:false, sec:null};
  if(!it) return;
  sbEdId=id; sbEdPwFilled=false;
  const known=it.sec && sbPwCache[id]!=null;
  if(known) sbEdPwFilled=true;
  $('sbEdHdr').textContent=id?'サブスクを直す':'サブスクを足す';
  $('sbEdBody').innerHTML=`
    <label class="sb-f">サービス名<input type="text" id="sbEName" maxlength="80" value="${esc(it.name)}" placeholder="例：動画配信・音楽・クラウド"></label>
    <div class="sb-row2"><label class="sb-f">金額（円）<input type="number" inputmode="decimal" id="sbEPrice" min="0" value="${esc(it.price)}"></label>
      <label class="sb-f">支払い<select id="sbECycle">${Object.entries(SB_CYCLES).map(([k,l])=>`<option value="${k}"${it.cycle===k?' selected':''}>${l}</option>`).join('')}</select></label></div>
    <div class="sb-row2"><label class="sb-f">次の支払日<input type="date" id="sbENext" value="${esc(it.next)}"></label>
      <label class="sb-f">支払方法<input type="text" id="sbEPay" maxlength="60" value="${esc(it.pay)}" placeholder="例：カード・口座"></label></div>
    <label class="sb-f">分類<input type="text" id="sbECat" maxlength="30" value="${esc(it.cat)}" placeholder="例：動画・仕事・家族"></label>
    <label class="sb-f">ID（メールアドレスなど）<input type="text" id="sbEUid" maxlength="200" value="${esc(it.uid)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <label class="sb-f">パスワード<div class="sb-pwrow"><input type="password" id="sbEPw" maxlength="200" value="${known?esc(sbPwCache[id]):''}" autocomplete="new-password" autocapitalize="off" spellcheck="false"
        placeholder="${it.sec&&!known?'🔒 保存してあります':''}">
      <button type="button" onclick="const e=document.getElementById('sbEPw'); e.type=e.type==='password'?'text':'password'; this.textContent=e.type==='password'?'👁':'🙈';" aria-label="見る・隠す">👁</button>
      <button type="button" onclick="sbGenPw()" aria-label="パスワードを作る" title="強いパスワードを作る">🎲</button></div></label>
    ${it.sec&&!known?`<button type="button" class="sb-btn sub" id="sbEShow" onclick="sbEdShowPw()">🔓 保存してあるパスワードを見る</button>`:''}
    ${it.sec?`<label class="sb-f" style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text,#333)"><input type="checkbox" id="sbEPwDel" style="width:20px;min-height:20px;margin:0"> 保存してあるパスワードを消す</label>`:''}
    <label class="sb-f">サイトのアドレス<input type="url" id="sbEUrl" maxlength="400" value="${esc(it.url)}" placeholder="https://" autocapitalize="off" spellcheck="false"></label>
    <label class="sb-f">メモ<textarea id="sbEMemo" maxlength="2000" placeholder="解約のしかた・無料期間の終わり など">${esc(it.memo)}</textarea></label>
    <label class="sb-f" style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text,#333)"><input type="checkbox" id="sbEStop" style="width:22px;min-height:22px;margin:0"${it.stop?' checked':''}> 止めた（解約した・休んでいる。合計に入れない）</label>
    <button class="sb-btn" onclick="sbEdSave()">保存する</button>
    ${id?`<button class="sb-btn del" onclick="sbEdDelete()">🗑 消す</button>`:''}
    <button class="sb-btn sub" onclick="sbCloseEd()">やめる</button>`;
  openDlg('sbEdOverlay', ()=>{ sbEdId=null; });
  if(!id) setTimeout(()=>{ const e=$('sbEName'); if(e) e.focus(); }, 60);
}
function sbEdShowPw(){
  const id=sbEdId;
  sbNeedKey(async ()=>{
    const v=await sbReveal(id); if(v==null || sbEdId!==id) return;
    const e=$('sbEPw'); if(e && !e.value){ e.value=v; e.type='text'; e.placeholder=''; sbEdPwFilled=true; }
    const b=$('sbEShow'); if(b) b.remove();
    sbTouch(); sbRenderList();
  });
}
function sbGenPw(){
  const cs='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#%+-=?@';
  const r=crypto.getRandomValues(new Uint32Array(16));
  const e=$('sbEPw'); e.value=Array.from(r, v=>cs[v%cs.length]).join(''); e.type='text';
  toast('強いパスワードを作りました（サイトのほうも同じに変えてください）');
}
async function sbEdSave(){
  const name=$('sbEName').value.trim();
  if(!name){ toast('サービス名を入れてください'); $('sbEName').focus(); return; }
  const old=sbEdId ? sbItem(sbEdId) : null;
  const pw=$('sbEPw').value, del=$('sbEPwDel') && $('sbEPwDel').checked;
  const it=sbCleanItem({ id:sbEdId||newId(), name, price:Math.max(0, +$('sbEPrice').value||0), cycle:$('sbECycle').value,
    next:$('sbENext').value, pay:$('sbEPay').value.trim(), cat:$('sbECat').value.trim(), uid:$('sbEUid').value.trim(),
    url:$('sbEUrl').value.trim(), memo:$('sbEMemo').value, stop:$('sbEStop').checked, upd:Date.now(), sec:old?old.sec:null });
  const put=async ()=>{
    if(del || (sbEdPwFilled && !pw)){ it.sec=null; delete sbPwCache[it.id]; }       // 消す（見えていた欄を空にしたときも）
    else if(pw && !(old && old.sec && sbPwCache[it.id]===pw)){                        // 新しく入れた・書きかえた（かける鍵だけで暗号にできる）
      it.sec=await sbSeal(pw.slice(0,200));
      if(sbPriv) sbPwCache[it.id]=pw; else delete sbPwCache[it.id];
    }
    const i=sbData.items.findIndex(x=>x.id===it.id);
    if(i>=0) sbData.items[i]=it; else sbData.items.push(it);
    if(sbSave()){ sbCloseEd(); sbRenderList(); toast('保存しました'); }
  };
  // はじめてパスワードを保存するときは、先に閲覧用のパスワードを決める
  if(pw && !del && !sbHasKeys()){ sbAskCreate(put); return; }
  await put();
}
async function sbEdDelete(){
  const it=sbItem(sbEdId); if(!it) return;
  if(!await appConfirm('「'+(it.name||'このサブスク')+'」を消しますか？','消す','やめる')) return;
  sbData.items=sbData.items.filter(x=>x.id!==it.id); delete sbPwCache[it.id];
  if(sbSave()){ sbCloseEd(); sbRenderList(); toast('消しました'); }
}
function sbCloseEd(){ closeDlg('sbEdOverlay', ()=>{ sbEdId=null; }); const b=$('sbEdBody'); if(b) b.innerHTML=''; }

/* ── 設定 ── */
function sbOpenSet(){
  if(!sbData) return;
  const has=sbHasKeys(), n=sbData.items.filter(x=>x.sec).length;
  $('sbSetBody').innerHTML=`
    <div class="sb-note" style="margin-top:0">🔒 閲覧用のパスワード：${has?`<b>決めてあります</b>（保存したパスワード ${n}件）`:'<b>まだ決めていません</b>（はじめてパスワードを保存するときに決めます）'}</div>
    ${has?`<div class="sb-sec">自動でパスワードを隠す</div>
    <div class="sb-seg">${[[1,'1分'],[5,'5分'],[15,'15分'],[0,'隠さない']].map(([m,l])=>`<button class="${sbData.lockMin===m?'on':''}" onclick="sbSetLock(${m})">${l}</button>`).join('')}</div>
    <div class="sb-note">パスワードを見たあと、さわらないまま・アプリを離れたまま この時間がたつと、また鍵をかけて隠します。閉じたときは、いつも隠します。</div>
    <div class="sb-sec">ヒント</div>
    <label class="sb-f">見るときに出すヒント<input type="text" id="sbSHint" maxlength="100" value="${esc(sbData.hint||'')}"></label>
    <button class="sb-btn sub" onclick="sbSaveHint()">ヒントを変える</button>
    <div class="sb-sec">閲覧用のパスワードを変える</div>
    <label class="sb-f">いまのパスワード<input type="password" id="sbSOld" autocomplete="current-password"></label>
    <label class="sb-f">新しいパスワード（4文字以上）<input type="password" id="sbSNew1" autocomplete="new-password"></label>
    <label class="sb-f">もう一度<input type="password" id="sbSNew2" autocomplete="new-password"></label>
    <div class="sb-err" id="sbSErr"></div>
    <button class="sb-btn sub" onclick="sbChangePw()">パスワードを変える</button>`:''}
    <div class="sb-sec">書き出す・読み込む</div>
    <button class="sb-btn sub" onclick="sbExport()">⬇ 書き出す（.json。パスワードは暗号のまま）</button>
    <button class="sb-btn sub" onclick="document.getElementById('sbFileIn').click()">⬆ 読み込む（いまの中身と置きかえ）</button>
    <button class="sb-btn sub" onclick="sbCsv()">📄 一覧を CSV で（パスワードは入れない）</button>
    <div class="sb-note">書き出したファイルでも、パスワードは暗号のままです（見るには、そのときの閲覧用のパスワードが要ります）。一覧（名前・金額・ID など）は暗号にしていません。📋リストの ⬇書き出し（全体のバックアップ）にも入ります。</div>
    ${has?`<div class="sb-sec">閲覧用のパスワードを忘れたとき</div>
    <button class="sb-btn del" onclick="sbForgotPw()">🔑 保存したパスワードだけ消す（一覧は残す）</button>
    <div class="sb-note">保存したパスワードは取り出せなくなります。そのあと、パスワードを保存するときに閲覧用のパスワードを決め直します。</div>`:''}
    <div class="sb-sec">消す</div>
    <button class="sb-btn del" onclick="sbWipe()">🗑 全部消して、はじめからやり直す</button>`;
  openDlg('sbSetOverlay');
}
function sbCloseSet(){ closeDlg('sbSetOverlay'); const b=$('sbSetBody'); if(b) b.innerHTML=''; }
function sbSetLock(m){ sbData.lockMin=m; sbSave(); sbTouch(); document.querySelectorAll('#sbSetBody .sb-seg button').forEach((b,i)=>b.classList.toggle('on', [1,5,15,0][i]===m)); toast(m?m+'分で隠します':'自動では隠しません'); }
function sbSaveHint(){
  const h=$('sbSHint').value.trim(); if(!h){ toast('ヒントを入れてください'); return; }
  sbData.hint=h; sbSave(); toast('ヒントを変えました');
}
async function sbChangePw(){
  const err=m=>{ $('sbSErr').textContent=m; };
  const old=$('sbSOld').value, n1=$('sbSNew1').value, n2=$('sbSNew2').value;
  if(n1.length<4) return err('新しいパスワードは4文字以上にしてください');
  if(n1!==n2) return err('新しいパスワードが2回でちがいます');
  if((sbData.hint||'').includes(n1)) return err('ヒントに新しいパスワードが入っています。先にヒントを変えてください');
  let raw=null;
  try{ raw=await aesDec(await sbDerive(old, unb64(sbData.salt), +sbData.iter||SB_ITER), sbData.priv); }catch(_){ return err('いまのパスワードがちがいます'); }
  const salt=crypto.getRandomValues(new Uint8Array(16));
  sbData.priv=await aesEnc(await sbDerive(n1, salt, SB_ITER), raw); sbData.salt=b64(salt); sbData.iter=SB_ITER;
  if(sbSave()){ ['sbSOld','sbSNew1','sbSNew2'].forEach(i=>$(i).value=''); err(''); toast('閲覧用のパスワードを変えました'); }
}
async function sbForgotPw(){
  if(!await appConfirm('保存したパスワードを全部消しますか？\n（一覧・金額・ID・メモは残ります。消したパスワードは戻せません）','パスワードだけ消す','やめる')) return;
  sbData.items.forEach(x=>{ x.sec=null; });
  Object.assign(sbData, {salt:'', pub:'', priv:null, hint:''});
  sbForgetKey(); sbSave(); sbCloseSet(); sbRender(); toast('保存したパスワードを消しました');
}
function sbDownload(name, text, type){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([text],{type})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function sbExport(){
  if(!sbData) return;
  sbDownload('サブスク管理表_'+today()+'.json', JSON.stringify({app:'hyodenki', type:'subsc', version:2, exportedAt:Date.now(), data:sbData}), 'application/json');
}
async function sbImportFile(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  let o=null; try{ o=JSON.parse(await f.text()); }catch(_){}
  const st=o && (o.type==='subsc' ? o.data : o.subsc);
  if(!st || !(sbIsOld(st) || (st.v===2 && Array.isArray(st.items)))){ toast('サブスク管理表のファイルではありません'); return; }
  if(!await appConfirm('読み込むと、いまのサブスク管理表と置きかわります。読み込みますか？','読み込む','やめる')) return;
  localStorage.setItem(SB_KEY, JSON.stringify(sbIsOld(st)?st:sbClean(st))); sbCloseSet(); sbForgetKey(); sbLoad(); sbRender();
  toast(sbOld?'読み込みました。前の形なので、いつものパスワードを入れて移してください':'読み込みました');
}
function sbCsv(){
  if(!sbData) return;
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const rows=[['サービス名','金額','支払い','月あたり','次の支払日','支払方法','分類','ID','サイト','状態','メモ']].concat(
    sbData.items.map(x=>[x.name, x.price, SB_CYCLES[x.cycle], Math.round(sbPerMonth(x)), x.next, x.pay, x.cat, x.uid, x.url, x.stop?'止めた':'契約中', x.memo]));
  sbDownload('サブスク一覧_'+today()+'.csv', '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'), 'text/csv');
}

/* 表電卓の本体から呼ぶもの */
Object.assign(window, { openSubsc, closeSubsc, sbLockNow, sbOpenSet, sbCloseSet, sbCreate, sbUnlock, sbMigrate, sbWipe, sbEdit, sbEdSave, sbEdDelete, sbCloseEd,
  sbEdShowPw, sbGenPw, sbTogglePw, sbCopy, sbOpenUrl, sbSetLock, sbSaveHint, sbChangePw, sbForgotPw, sbExport, sbImportFile, sbCsv, sbRenderList, sbClosePw,
  sbState:()=>({ locked:!sbPriv, old:!!sbOld, keys:sbHasKeys(), items:sbData?sbData.items.length:null }) });
Object.defineProperty(window, 'sbQ', { get:()=>sbQ, set:v=>{ sbQ=String(v||''); }, configurable:true });
})();
