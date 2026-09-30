/* 🔐 サブスク管理表（v453。表電卓の道具。はじめて開いたときに読む）
   使っているサブスク（動画・音楽・アプリ など）の金額・支払日・支払方法と、ログインの ID・パスワードを1か所にまとめる。
   ・中身はすべて、自分で決めたパスワードから作った鍵で暗号化して端末に置く（PBKDF2-SHA256 → AES-GCM）。
     端末に残るのは暗号にしたものとヒントだけで、パスワードそのものは残さない。
   ・開くときはヒントを見せ、パスワードが合えば中身を出す。合わなければ開かない（AES-GCM の確かめで分かる）。
   ・閉じる・アプリを離れて決めた時間がたつ・🔒 を押すと、鍵を忘れて閉じた状態に戻る。
   ・パスワードを忘れると中身は取り出せない（作った人にも戻せない）。 */
(function(){
const SB_KEY='excalc_subsc';
const SB_ITER=250000;
const SB_CYCLES={m:'毎月', y:'毎年', w:'毎週'};
let sbKey=null, sbSalt=null, sbData=null, sbEdId=null, sbQ='', sbShowPw={}, sbLockTimer=null, sbHiddenAt=0, sbFails=0, sbWaitUntil=0;

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b64=u8=>{ let s=''; u8.forEach(b=>s+=String.fromCharCode(b)); return btoa(s); };
const unb64=s=>Uint8Array.from(atob(s), c=>c.charCodeAt(0));
const yen=n=>(Math.round(+n||0)).toLocaleString('ja-JP')+'円';
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>isoOf(new Date());
const isDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/* ── 暗号（保存するもの：{v, hint, salt, iter, iv, ct}） ── */
function sbStored(){ try{ const o=JSON.parse(localStorage.getItem(SB_KEY)||'null'); return (o && o.ct && o.salt && o.iv) ? o : null; }catch(_){ return null; } }
async function sbDerive(pw, salt, iter){
  const base=await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function sbEncrypt(obj, key){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(obj))));
  return {iv:b64(iv), ct:b64(ct)};
}
async function sbDecrypt(st, key){
  const pt=await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(st.iv)}, key, unb64(st.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
/* 変えるたびに暗号にし直して保存する */
async function sbSave(hint){
  if(!sbKey || !sbData) return false;
  const st=sbStored()||{};
  if(typeof hint==='string') st.hint=hint;
  const enc=await sbEncrypt(sbData, sbKey);
  const o={v:1, hint:st.hint||'', salt:b64(sbSalt), iter:st.iter||SB_ITER, iv:enc.iv, ct:enc.ct, upd:Date.now()};
  try{ localStorage.setItem(SB_KEY, JSON.stringify(o)); return true; }
  catch(_){ toast('端末の空きが足りず、保存できませんでした'); return false; }
}
function sbClean(d){
  const items=(d && Array.isArray(d.items)) ? d.items : [];
  return {v:1, items:items.filter(x=>x && typeof x==='object').map(x=>({
    id:String(x.id||('s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6))),
    name:String(x.name||'').slice(0,80), price:Math.max(0, Math.min(1e9, +x.price||0)),
    cycle:SB_CYCLES[x.cycle]?x.cycle:'m', next:isDate(x.next)?x.next:'', pay:String(x.pay||'').slice(0,60), cat:String(x.cat||'').slice(0,30),
    uid:String(x.uid||'').slice(0,200), pw:String(x.pw||'').slice(0,200), url:String(x.url||'').slice(0,400), memo:String(x.memo||'').slice(0,2000),
    stop:!!x.stop, upd:+x.upd||0 })),
    lockMin:[0,1,5,15].includes(+((d||{}).lockMin)) ? +d.lockMin : 5 };
}

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
      <button class="hdr-btn" id="sbLockBtn" onclick="sbLockNow()" aria-label="鍵をかける" title="鍵をかける" hidden>🔒</button>
      <button class="hdr-btn" id="sbSetBtn" onclick="sbOpenSet()" title="設定" hidden>⚙ 設定</button>
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
<input type="file" id="sbFileIn" accept=".json,application/json" hidden onchange="sbImportFile(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof bindNpToolSwipe==='function') bindNpToolSwipe('subscOverlay');
  if(typeof applyNpToolFull==='function') applyNpToolFull();
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ sbHiddenAt=Date.now(); return; }
    // アプリに戻ったとき、決めた時間より長く離れていたら鍵をかける
    if(sbKey && sbData && sbData.lockMin && sbHiddenAt && Date.now()-sbHiddenAt > sbData.lockMin*60000) sbLockNow(true);
    sbHiddenAt=0;
  });
  ['pointerdown','keydown'].forEach(t=>$('subscOverlay').addEventListener(t, sbTouch, true));
}
/* さわっていないまま決めた時間がたったら鍵をかける */
function sbTouch(){
  clearTimeout(sbLockTimer);
  if(!sbKey || !sbData || !sbData.lockMin) return;
  sbLockTimer=setTimeout(()=>{ if(sbKey) sbLockNow(true); }, sbData.lockMin*60000);
}

/* ── 開く・閉じる・鍵 ── */
function openSubsc(){
  sbEnsureDom();
  openDlg('subscOverlay', ()=>sbForget());
  sbRender();
}
function closeSubsc(){
  if(!isDlgOpen('subscOverlay')) return;
  sbCloseEd(); sbCloseSet();
  closeDlg('subscOverlay', ()=>sbForget());
}
/* 鍵と中身を忘れる（画面にも残さない） */
function sbForget(){
  sbKey=null; sbSalt=null; sbData=null; sbShowPw={}; sbQ=''; clearTimeout(sbLockTimer);
  const b=$('sbBody'); if(b) b.innerHTML='';
}
function sbLockNow(auto){
  sbCloseEd(); sbCloseSet();
  sbForget();
  if(isDlgOpen('subscOverlay')) sbRender();
  if(auto) toast('しばらく使わなかったので、鍵をかけました');
}
function sbRender(){
  const locked=!sbKey || !sbData;
  $('sbLockBtn').hidden=locked; $('sbSetBtn').hidden=locked;
  if(locked){ sbStored() ? sbRenderLock() : sbRenderFirst(); }
  else sbRenderList();
}
/* はじめて：パスワードとヒントを決める */
function sbRenderFirst(){
  $('sbBody').innerHTML=`<div class="sb-lock">
    <div class="sb-ic">🔐</div><b>はじめに、開くためのパスワードを決めます</b>
    <div class="sb-note">サブスクの ID・パスワードは、このパスワードで<b>暗号にして端末の中だけ</b>に残します。<br>
      <b>パスワードを忘れると中身は開けません</b>（作った人にも戻せません）。思い出せるヒントを付けてください。</div>
    <label class="sb-f">パスワード（4文字以上）<input type="password" id="sbNew1" autocomplete="new-password"></label>
    <label class="sb-f">もう一度<input type="password" id="sbNew2" autocomplete="new-password"></label>
    <label class="sb-f">ヒント（開くときに出ます。パスワードそのものは書かないでください）<input type="text" id="sbHintIn" maxlength="100" placeholder="例：最初に飼った犬の名前＋誕生月"></label>
    <div class="sb-err" id="sbErr"></div>
    <button class="sb-btn" onclick="sbCreate()">決めて始める</button></div>`;
  setTimeout(()=>{ const e=$('sbNew1'); if(e) e.focus(); }, 60);
}
async function sbCreate(){
  const p1=$('sbNew1').value, p2=$('sbNew2').value, hint=$('sbHintIn').value.trim();
  const err=m=>{ $('sbErr').textContent=m; };
  if(p1.length<4) return err('パスワードは4文字以上にしてください');
  if(p1!==p2) return err('2回入れたパスワードがちがいます');
  if(!hint) return err('ヒントを入れてください（忘れたときの手がかりになります）');
  if(hint.includes(p1)) return err('ヒントにパスワードそのものを入れないでください');
  sbSalt=crypto.getRandomValues(new Uint8Array(16));
  sbKey=await sbDerive(p1, sbSalt, SB_ITER);
  sbData=sbClean({items:[]});
  if(!await sbSave(hint)){ sbForget(); return; }
  toast('パスワードを決めました。サブスクを足してください');
  sbTouch(); sbRender();
}
/* 鍵がかかっているとき：ヒントを出してパスワードを聞く */
function sbRenderLock(){
  const st=sbStored();
  $('sbBody').innerHTML=`<div class="sb-lock">
    <div class="sb-ic">🔒</div><b>パスワードを入れて開いてください</b>
    <div class="sb-hint"><b>💡 ヒント</b><br>${esc(st.hint||'（ヒントはありません）')}</div>
    <form onsubmit="event.preventDefault(); sbUnlock();">
      <label class="sb-f">パスワード<input type="password" id="sbPwIn" autocomplete="current-password"></label>
      <div class="sb-err" id="sbErr"></div>
      <button class="sb-btn" type="submit" id="sbOpenBtn">開く</button>
    </form>
    <div class="sb-note" style="margin-top:22px">パスワードを忘れたときは、中身を取り出すことはできません。<br>
      <a href="#" onclick="event.preventDefault(); sbWipe();">全部消して、はじめからやり直す</a></div></div>`;
  setTimeout(()=>{ const e=$('sbPwIn'); if(e) e.focus(); }, 60);
}
async function sbUnlock(){
  const st=sbStored(); if(!st) return sbRender();
  const now=Date.now();
  if(now<sbWaitUntil){ $('sbErr').textContent='まちがいが続いたので、'+Math.ceil((sbWaitUntil-now)/1000)+'秒待ってください'; return; }
  const pw=$('sbPwIn').value; if(!pw){ $('sbErr').textContent='パスワードを入れてください'; return; }
  $('sbOpenBtn').disabled=true; $('sbErr').textContent='たしかめています…';
  try{
    const salt=unb64(st.salt), key=await sbDerive(pw, salt, +st.iter||SB_ITER);
    const d=await sbDecrypt(st, key);
    sbKey=key; sbSalt=salt; sbData=sbClean(d); sbFails=0;
    sbRollNext(); sbTouch(); sbRender();
  }catch(_){
    sbFails++;
    if(sbFails>=5){ sbWaitUntil=Date.now()+30000; sbFails=0; }
    const e=$('sbErr'); if(e) e.textContent='パスワードがちがいます';
    const b=$('sbOpenBtn'); if(b) b.disabled=false;
    const i=$('sbPwIn'); if(i){ i.value=''; i.focus(); }
  }
}
async function sbWipe(){
  if(!await appConfirm('サブスク管理表の中身を全部消して、はじめからやり直しますか？\n（消したものは戻せません）','全部消す','やめる')) return;
  localStorage.removeItem(SB_KEY); sbForget(); sbRender(); toast('消しました。新しいパスワードを決めてください');
}

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
  const items=sbData.items, act=items.filter(x=>!x.stop);
  const mon=act.reduce((s,x)=>s+sbPerMonth(x),0);
  const q=sbQ.normalize('NFKC').toLowerCase();
  const list=items.filter(x=>!q || [x.name,x.pay,x.cat,x.memo,x.uid,x.url].some(v=>String(v||'').normalize('NFKC').toLowerCase().includes(q)))
    .sort((a,b)=>(a.stop-b.stop) || ((a.next||'9')<(b.next||'9')?-1:(a.next||'9')>(b.next||'9')?1:0) || a.name.localeCompare(b.name,'ja'));
  const keepQ=document.activeElement && document.activeElement.id==='sbQ';
  $('sbBody').innerHTML=`<div class="sb-sum"><div><b>${yen(mon)}</b><small>月あたり</small></div><div><b>${yen(mon*12)}</b><small>年あたり</small></div><div><b>${act.length}件</b><small>契約中</small></div></div>
    <div class="sb-tool"><input type="search" id="sbQ" placeholder="🔍 さがす" value="${esc(sbQ)}" aria-label="サブスクをさがす" oninput="sbQ=this.value;sbRenderList()"><button onclick="sbEdit(null)">＋ 足す</button></div>
    ${list.length ? list.map(sbCardHtml).join('') : `<div class="sb-empty">${items.length?'見つかりません':'まだありません。<br>「＋ 足す」で使っているサブスクを入れてください'}</div>`}
    <div class="sb-note">金額は「月あたり」に直して合計しています（年払いは12で割る・週払いは52週÷12）。止めたものは合計に入りません。支払日が過ぎると、次の支払日へ自動で進みます。</div>`;
  if(keepQ){ const e=$('sbQ'); e.focus(); try{ e.setSelectionRange(e.value.length, e.value.length); }catch(_){} }
}
function sbCardHtml(it){
  const d=sbDaysTo(it.next), soon=!it.stop && d!=null && d<=7;
  const when=it.stop ? '止めた' : !it.next ? '支払日 未設定' : `次は ${+it.next.slice(5,7)}/${+it.next.slice(8,10)}`+(d===0?' <span class="due">今日</span>':d!=null&&d<=7?` <span class="due">あと${d}日</span>`:'');
  const show=!!sbShowPw[it.id];
  const cred=(it.uid||it.pw) ? `<div class="sb-cred" onclick="event.stopPropagation()">
      ${it.uid?`<span>ID <i>${esc(it.uid)}</i><button onclick="sbCopy('${it.id}','uid')" aria-label="IDをコピー">📋</button></span>`:''}
      ${it.pw?`<span>PW <i>${show?esc(it.pw):'••••••••'}</i><button onclick="sbTogglePw('${it.id}')" aria-label="パスワードを${show?'隠す':'見る'}">${show?'🙈':'👁'}</button><button onclick="sbCopy('${it.id}','pw')" aria-label="パスワードをコピー">📋</button></span>`:''}
      ${it.url?`<span><i>${esc(it.url.replace(/^https?:\/\//,''))}</i><button onclick="sbOpenUrl('${it.id}')" aria-label="サイトを開く">↗</button></span>`:''}
    </div>` : (it.url?`<div class="sb-cred" onclick="event.stopPropagation()"><span><i>${esc(it.url.replace(/^https?:\/\//,''))}</i><button onclick="sbOpenUrl('${it.id}')" aria-label="サイトを開く">↗</button></span></div>`:'');
  return `<div class="sb-card${it.stop?' stop':''}${soon?' soon':''}" onclick="sbEdit('${it.id}')">
    <div class="sb-top"><span class="sb-name">${esc(it.name||'（名前なし）')}</span><span class="sb-price">${yen(it.price)}<small>/${SB_CYCLES[it.cycle].slice(1)}</small></span></div>
    <div class="sb-meta">${when}${it.pay?' ・ '+esc(it.pay):''}${it.cat?' ・ '+esc(it.cat):''}</div>${cred}</div>`;
}
function sbItem(id){ return sbData && sbData.items.find(x=>x.id===id); }
function sbTogglePw(id){ sbShowPw[id]=!sbShowPw[id]; sbRenderList(); }
async function sbCopy(id, f){
  const it=sbItem(id); if(!it || !it[f]) return;
  try{ await navigator.clipboard.writeText(it[f]); toast((f==='pw'?'パスワード':'ID')+'をコピーしました'); }
  catch(_){ toast('コピーできませんでした（長押しで選んでコピーしてください）'); sbShowPw[id]=true; sbRenderList(); }
}
function sbOpenUrl(id){
  const it=sbItem(id); if(!it || !it.url) return;
  const u=/^https?:\/\//i.test(it.url) ? it.url : 'https://'+it.url;
  window.open(u, '_blank', 'noopener');
}

/* ── 足す・直す ── */
function sbEdit(id){
  const it=id ? sbItem(id) : {name:'', price:'', cycle:'m', next:'', pay:'', cat:'', uid:'', pw:'', url:'', memo:'', stop:false};
  if(!it) return;
  sbEdId=id;
  $('sbEdHdr').textContent=id?'サブスクを直す':'サブスクを足す';
  $('sbEdBody').innerHTML=`
    <label class="sb-f">サービス名<input type="text" id="sbEName" maxlength="80" value="${esc(it.name)}" placeholder="例：動画配信・音楽・クラウド"></label>
    <div class="sb-row2"><label class="sb-f">金額（円）<input type="number" inputmode="decimal" id="sbEPrice" min="0" value="${esc(it.price)}"></label>
      <label class="sb-f">支払い<select id="sbECycle">${Object.entries(SB_CYCLES).map(([k,l])=>`<option value="${k}"${it.cycle===k?' selected':''}>${l}</option>`).join('')}</select></label></div>
    <div class="sb-row2"><label class="sb-f">次の支払日<input type="date" id="sbENext" value="${esc(it.next)}"></label>
      <label class="sb-f">支払方法<input type="text" id="sbEPay" maxlength="60" value="${esc(it.pay)}" placeholder="例：カード・口座"></label></div>
    <label class="sb-f">分類<input type="text" id="sbECat" maxlength="30" value="${esc(it.cat)}" placeholder="例：動画・仕事・家族"></label>
    <label class="sb-f">ID（メールアドレスなど）<input type="text" id="sbEUid" maxlength="200" value="${esc(it.uid)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <label class="sb-f">パスワード<div class="sb-pwrow"><input type="password" id="sbEPw" maxlength="200" value="${esc(it.pw)}" autocomplete="new-password" autocapitalize="off" spellcheck="false">
      <button type="button" onclick="const e=document.getElementById('sbEPw'); e.type=e.type==='password'?'text':'password'; this.textContent=e.type==='password'?'👁':'🙈';" aria-label="見る・隠す">👁</button>
      <button type="button" onclick="sbGenPw()" aria-label="パスワードを作る" title="強いパスワードを作る">🎲</button></div></label>
    <label class="sb-f">サイトのアドレス<input type="url" id="sbEUrl" maxlength="400" value="${esc(it.url)}" placeholder="https://" autocapitalize="off" spellcheck="false"></label>
    <label class="sb-f">メモ<textarea id="sbEMemo" maxlength="2000" placeholder="解約のしかた・無料期間の終わり など">${esc(it.memo)}</textarea></label>
    <label class="sb-f" style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text,#333)"><input type="checkbox" id="sbEStop" style="width:22px;min-height:22px;margin:0"${it.stop?' checked':''}> 止めた（解約した・休んでいる。合計に入れない）</label>
    <button class="sb-btn" onclick="sbEdSave()">保存する</button>
    ${id?`<button class="sb-btn del" onclick="sbEdDelete()">🗑 消す</button>`:''}
    <button class="sb-btn sub" onclick="sbCloseEd()">やめる</button>`;
  openDlg('sbEdOverlay', ()=>{ sbEdId=null; });
  if(!id) setTimeout(()=>{ const e=$('sbEName'); if(e) e.focus(); }, 60);
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
  const it={ id:sbEdId||('s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)), name, price:Math.max(0, +$('sbEPrice').value||0), cycle:$('sbECycle').value,
    next:$('sbENext').value, pay:$('sbEPay').value.trim(), cat:$('sbECat').value.trim(), uid:$('sbEUid').value.trim(), pw:$('sbEPw').value,
    url:$('sbEUrl').value.trim(), memo:$('sbEMemo').value, stop:$('sbEStop').checked, upd:Date.now() };
  const i=sbData.items.findIndex(x=>x.id===it.id);
  if(i>=0) sbData.items[i]=sbClean({items:[it]}).items[0]; else sbData.items.push(sbClean({items:[it]}).items[0]);
  sbRollNext();
  if(await sbSave()){ sbCloseEd(); sbRenderList(); toast('保存しました'); }
}
async function sbEdDelete(){
  const it=sbItem(sbEdId); if(!it) return;
  if(!await appConfirm('「'+(it.name||'このサブスク')+'」を消しますか？','消す','やめる')) return;
  sbData.items=sbData.items.filter(x=>x.id!==it.id);
  if(await sbSave()){ sbCloseEd(); sbRenderList(); toast('消しました'); }
}
function sbCloseEd(){ closeDlg('sbEdOverlay', ()=>{ sbEdId=null; }); const b=$('sbEdBody'); if(b) b.innerHTML=''; }

/* ── 設定 ── */
function sbOpenSet(){
  if(!sbKey) return;
  const st=sbStored()||{};
  $('sbSetBody').innerHTML=`
    <div class="sb-sec">自動で鍵をかける</div>
    <div class="sb-seg">${[[1,'1分'],[5,'5分'],[15,'15分'],[0,'かけない']].map(([m,l])=>`<button class="${sbData.lockMin===m?'on':''}" onclick="sbSetLock(${m})">${l}</button>`).join('')}</div>
    <div class="sb-note">さわらないまま・アプリを離れたまま、この時間がたつと鍵をかけます。閉じたときは、いつも鍵がかかります。</div>
    <div class="sb-sec">ヒント</div>
    <label class="sb-f">開くときに出すヒント<input type="text" id="sbSHint" maxlength="100" value="${esc(st.hint||'')}"></label>
    <button class="sb-btn sub" onclick="sbSaveHint()">ヒントを変える</button>
    <div class="sb-sec">パスワードを変える</div>
    <label class="sb-f">いまのパスワード<input type="password" id="sbSOld" autocomplete="current-password"></label>
    <label class="sb-f">新しいパスワード（4文字以上）<input type="password" id="sbSNew1" autocomplete="new-password"></label>
    <label class="sb-f">もう一度<input type="password" id="sbSNew2" autocomplete="new-password"></label>
    <div class="sb-err" id="sbSErr"></div>
    <button class="sb-btn sub" onclick="sbChangePw()">パスワードを変える</button>
    <div class="sb-sec">書き出す・読み込む</div>
    <button class="sb-btn sub" onclick="sbExport()">⬇ 暗号のまま書き出す（.json）</button>
    <button class="sb-btn sub" onclick="document.getElementById('sbFileIn').click()">⬆ 読み込む（いまの中身と置きかえ）</button>
    <button class="sb-btn sub" onclick="sbCsv()">📄 一覧を CSV で（ID・パスワードは入れない）</button>
    <div class="sb-note">書き出したファイルも暗号のままなので、開くにはそのときのパスワードが要ります。📋リストの ⬇書き出し（全体のバックアップ）にも、暗号のまま入ります。</div>
    <div class="sb-sec">消す</div>
    <button class="sb-btn del" onclick="sbCloseSet(); sbWipe();">🗑 全部消して、はじめからやり直す</button>`;
  openDlg('sbSetOverlay');
}
function sbCloseSet(){ closeDlg('sbSetOverlay'); const b=$('sbSetBody'); if(b) b.innerHTML=''; }
async function sbSetLock(m){ sbData.lockMin=m; await sbSave(); sbTouch(); sbOpenSetRefresh(); toast(m?m+'分で鍵をかけます':'自動では鍵をかけません'); }
function sbOpenSetRefresh(){ document.querySelectorAll('#sbSetBody .sb-seg button').forEach((b,i)=>b.classList.toggle('on', [1,5,15,0][i]===sbData.lockMin)); }
function sbSaveHint(){
  const h=$('sbSHint').value.trim(); if(!h){ toast('ヒントを入れてください'); return; }
  const st=sbStored(); if(!st) return;
  st.hint=h; localStorage.setItem(SB_KEY, JSON.stringify(st)); toast('ヒントを変えました');
}
async function sbChangePw(){
  const st=sbStored(), err=m=>{ $('sbSErr').textContent=m; };
  const old=$('sbSOld').value, n1=$('sbSNew1').value, n2=$('sbSNew2').value;
  if(n1.length<4) return err('新しいパスワードは4文字以上にしてください');
  if(n1!==n2) return err('新しいパスワードが2回でちがいます');
  if((st.hint||'').includes(n1)) return err('ヒントに新しいパスワードが入っています。先にヒントを変えてください');
  try{ await sbDecrypt(st, await sbDerive(old, unb64(st.salt), +st.iter||SB_ITER)); }catch(_){ return err('いまのパスワードがちがいます'); }
  sbSalt=crypto.getRandomValues(new Uint8Array(16));
  sbKey=await sbDerive(n1, sbSalt, SB_ITER);
  st.iter=SB_ITER; localStorage.setItem(SB_KEY, JSON.stringify(st));
  if(await sbSave()){ ['sbSOld','sbSNew1','sbSNew2'].forEach(i=>$(i).value=''); err(''); toast('パスワードを変えました'); }
}
function sbDownload(name, text, type){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([text],{type})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function sbExport(){
  const st=sbStored(); if(!st) return;
  sbDownload('サブスク管理表_'+today()+'.json', JSON.stringify({app:'hyodenki', type:'subsc', version:1, exportedAt:Date.now(), data:st}), 'application/json');
}
async function sbImportFile(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  let o=null; try{ o=JSON.parse(await f.text()); }catch(_){}
  const st=o && (o.type==='subsc' ? o.data : o.subsc);
  if(!st || !st.ct || !st.salt || !st.iv){ toast('サブスク管理表のファイルではありません'); return; }
  if(!await appConfirm('読み込むと、いまのサブスク管理表と置きかわります。\n開くには、書き出したときのパスワードが要ります。読み込みますか？','読み込む','やめる')) return;
  localStorage.setItem(SB_KEY, JSON.stringify(st)); sbCloseSet(); sbForget(); sbRender(); toast('読み込みました。パスワードを入れて開いてください');
}
function sbCsv(){
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const rows=[['サービス名','金額','支払い','月あたり','次の支払日','支払方法','分類','サイト','状態','メモ']].concat(
    sbData.items.map(x=>[x.name, x.price, SB_CYCLES[x.cycle], Math.round(sbPerMonth(x)), x.next, x.pay, x.cat, x.url, x.stop?'止めた':'契約中', x.memo]));
  sbDownload('サブスク一覧_'+today()+'.csv', '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'), 'text/csv');
}

/* 表電卓の本体から呼ぶもの */
Object.assign(window, { openSubsc, closeSubsc, sbLockNow, sbOpenSet, sbCloseSet, sbCreate, sbUnlock, sbWipe, sbEdit, sbEdSave, sbEdDelete, sbCloseEd,
  sbGenPw, sbTogglePw, sbCopy, sbOpenUrl, sbSetLock, sbSaveHint, sbChangePw, sbExport, sbImportFile, sbCsv, sbRenderList,
  sbState:()=>({ locked:!sbKey, items:sbData?sbData.items.length:null }) });
Object.defineProperty(window, 'sbQ', { get:()=>sbQ, set:v=>{ sbQ=String(v||''); }, configurable:true });
})();
