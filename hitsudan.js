/* 🗣 筆談ボード（v569。表電卓の道具。はじめて開いたときに読む。apps/hitsudan/ から単独のアプリとしても開ける）
   ・耳の遠い人と話すとき：🎤 話すと 声が 大きな文字になる（ブラウザの音声認識。Android の Chrome・パソコンの Chrome・iPhone の Safari など）。
     ひと区切りずつ（話しおわるたびに）文字にして、聞きつづける。読み上げのあいだは 聞くのを休む（自分の声を 拾わないように）。
   ・⌨ 打った字も その場で 大きく出し、🔈 で読み上げる（声は 表電卓の「🔈 読み上げの声」と同じ。hyovoice.js）。
   ・⭐ よく使う言葉は 1回 押すだけで 大きく出る（足す・直す・並べかえ・消す。押したら読み上げる も えらべる）。
   ・✍ 手で書く板：指で書いて 見せる（1画もどす・ぜんぶ消す・線の太さ）。
   ・大きな字を押すと 画面いっぱいに出す。「↻ 相手向き」で さかさまにして 向かいの人に見せる。端末の「戻る」で もどる。
   ・文字の大きさ・色の組み合わせ・よく使う言葉などは excalc_hitsudan（この端末の中だけ）。
     話した・打った言葉の記録（🕘 さっきの言葉）は 残さない（閉じると消える）。 */
(function(){
'use strict';
const KEY='excalc_hitsudan', MAX_PH=40, MAX_HIST=30;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const toastH=m=>{ if(typeof toast==='function') toast(m, 3500); };
const DEF_PH=['はい','いいえ','ありがとうございます','少々 お待ちください','もう一度 お願いします','ゆっくり 話しますね','ここに 書いてください','わかりました','お名前を 教えてください','どうしましたか？','大丈夫ですか？','お大事に'];
const SCALES=[['l','大',64],['xl','特大',110],['max','最大',220]];          // [記号, 名前, いちばん大きい字の大きさ(px)]
const COLORS=[['wb','白地に黒'],['by','黒地に黄'],['bw','黒地に白'],['nb','紺地に白']];
const PENS=[['m','ふつう',5],['b','太い',10]];
const SRC={talk:'🎤 聞こえた言葉', type:'⌨ 打った言葉', ph:'⭐ よく使う言葉'};

/* ───────── 状態 ───────── */
let st=null, cur={t:'', src:''}, hist=[], mode='talk', editPh=false;
let rec=null, listening=false, interim='', pauseForSay=false, quietN=0, recCtor=null, sayN=0;
let fullRel=null, flip=false, strokes=[], drawing=null, fitT=0;
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const ph=Array.isArray(o.phrases) ? o.phrases.map(p=>oneLine(p,60)).filter(Boolean).slice(0,MAX_PH) : DEF_PH.slice();
  st={scale:SCALES.some(s=>s[0]===o.scale)?o.scale:'xl', color:COLORS.some(c=>c[0]===o.color)?o.color:'wb', yomu:o.yomu===true,
    pen:PENS.some(p=>p[0]===o.pen)?o.pen:'m', phrases:ph};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }
const capPx=()=>(SCALES.find(s=>s[0]===st.scale)||SCALES[1])[2];

/* ───────── 大きな字（箱に入る いちばん大きい字に）───────── */
function fitText(box, el, cap){
  const W=box.clientWidth-24, H=box.clientHeight-(box.querySelector('.hd-src:not(:empty)')?44:24);
  if(W<=0 || H<=0) return;
  let lo=14, hi=Math.max(14, Math.round(cap)), best=lo;
  while(lo<=hi){ const mid=(lo+hi)>>1; el.style.fontSize=mid+'px'; if(el.scrollWidth<=W+1 && el.scrollHeight<=H+1){ best=mid; lo=mid+1; } else hi=mid-1; }
  el.style.fontSize=best+'px';
}
function paintBig(){
  const box=$('hdBig'), el=$('hdTxt'); if(!box || !el) return;
  box.className='hd-big '+st.color+(mode==='write'?' w':'');
  const live=listening && interim, t=live ? interim : cur.t;
  $('hdSrc').textContent=mode==='write' ? '' : (live ? '🎤 聞いています…' : (cur.t ? SRC[cur.src]||'' : ''));
  el.classList.toggle('ph', !t); el.classList.toggle('live', !!live);
  el.textContent=t || (mode==='talk' ? (listening ? '話してください…' : '「🎤 話す」を押して 話すと、ここに 大きく 出ます') : mode==='type' ? '下に 打つと、ここに 大きく 出ます' : '');
  if(t) fitText(box, el, capPx()); else el.style.fontSize='';
  paintFull();
}
function show(t, src){
  t=String(t==null?'':t).slice(0,1000);
  cur={t, src}; interim='';
  if(t && src!=='type') addHist(t, src);
  paintBig();
}
function addHist(t, src){
  if(hist[0] && hist[0].t===t && hist[0].src===src) return;
  const d=new Date(); hist.unshift({t, src, at:d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')});
  if(hist.length>MAX_HIST) hist.length=MAX_HIST;
  paintHist();
}

/* ───────── 🎤 話す（音声認識）───────── */
function ctor(){ return typeof speechRecCtor==='function' ? speechRecCtor() : (window.SpeechRecognition||window.webkitSpeechRecognition||null); }
function micToggle(){ if(listening) micStop(); else micStart(); }
function micStart(){
  const C=ctor();
  if(!C){ toastH('この端末では 声を 文字にできません。「⌨ 打つ」か「✍ 書く」を 使ってください'); return; }
  recCtor=C; listening=true; interim=''; quietN=0; pauseForSay=false;
  if(mode!=='talk'){ mode='talk'; render(); } else { paintPanel(); paintBig(); }
  startRec();
}
function micStop(){
  listening=false; interim=''; pauseForSay=false;
  stopRec();
  paintPanel(); paintBig();
}
function stopRec(){ if(rec){ rec.__byUs=true; try{ rec.abort(); }catch(_){} rec=null; } }
function startRec(){
  if(!listening || rec || !recCtor) return;
  let r;
  try{ r=new recCtor(); }catch(_){ micStop(); toastH('声を 聞き取れませんでした'); return; }
  r.lang='ja-JP'; r.continuous=false; r.interimResults=true; r.maxAlternatives=1;
  let got=false;
  r.onresult=e=>{
    let fin='', mid='';
    for(const x of e.results){ if(x.isFinal) fin+=x[0].transcript; else mid+=x[0].transcript; }
    if(fin.trim()){ got=true; quietN=0; show(fin.trim(), 'talk'); }
    else { interim=mid.trim(); paintBig(); }
  };
  r.onerror=e=>{
    const er=e && e.error;
    if(er==='not-allowed' || er==='service-not-allowed'){ listening=false; toastH('マイクが 使えません。ブラウザ（端末）の設定で マイクを 許可してください。iPhone は Safari で開くと 使えることがあります'); }
    else if(er==='audio-capture'){ listening=false; toastH('マイクが 見つかりません'); }
    else if(er==='network'){ listening=false; toastH('声を文字にするには インターネットが 要ることがあります'); }
  };
  r.onend=()=>{
    if(rec===r) rec=null;
    if(r.__byUs) return;
    if(interim && !got){ show(interim, 'talk'); }   // 区切りの前に 終わったときは 聞こえたところまで
    interim='';
    if(!listening){ paintPanel(); paintBig(); return; }
    if(!got) quietN++;
    if(quietN>=40){ listening=false; toastH('しばらく 声が なかったので 聞くのを やめました'); paintPanel(); paintBig(); return; }
    setTimeout(startRec, 250);   // 話しおわるたびに 聞き直す（ずっと聞きつづける）
  };
  rec=r;
  try{ r.start(); }catch(_){ rec=null; micStop(); }
}

/* ───────── 🔈 読み上げ ───────── */
function say(t){
  t=String(t==null?cur.t:t).trim();
  if(!t){ toastH('読み上げる 文字が ありません'); return; }
  const my=++sayN, resume=()=>{ if(my!==sayN) return; if(pauseForSay){ pauseForSay=false; if(listening) startRec(); } };   // 前の読み上げの 知らせでは 戻らない
  if(listening){ pauseForSay=true; stopRec(); }   // 自分の声を 拾わないように 休む
  try{
    if(window.HyoVoice && HyoVoice.available) HyoVoice.speak(t, {lang:'ja', onend:resume});
    else if(window.speechSynthesis && window.SpeechSynthesisUtterance){ const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; u.onend=resume; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    else { toastH('この端末では 読み上げが 使えません'); resume(); return; }
  }catch(_){ resume(); return; }
  setTimeout(resume, Math.max(3000, t.length*250));   // 終わりの知らせが 来ない端末のため
}

/* ───────── ⌨ 打つ ───────── */
function typed(v){ cur={t:String(v||'').slice(0,1000), src:'type'}; interim=''; paintBig(); }
function typeNew(){
  const ta=$('hdIn'); if(ta && ta.value.trim()) addHist(ta.value.trim(), 'type');
  if(ta){ ta.value=''; ta.focus(); }
  typed('');
}
function typeKeep(){
  const ta=$('hdIn'), t=oneLine(ta?ta.value:'', 60);
  if(!t){ toastH('残す言葉を 打ってください'); return; }
  addPhrase(t);
}

/* ───────── ⭐ よく使う言葉 ───────── */
function phrase(i){
  const t=st.phrases[i]; if(t==null) return;
  if(mode==='write'){ mode='talk'; render(); }
  show(t, 'ph');
  if(st.yomu) say(t);
}
async function addPhrase(t){
  if(t==null){ t=typeof appPrompt==='function' ? await appPrompt('よく使う言葉を 足す（例：お薬は 飲みましたか？）', '') : prompt('よく使う言葉', ''); if(t==null) return; }
  t=oneLine(t,60); if(!t) return;
  if(st.phrases.length>=MAX_PH){ toastH('よく使う言葉は '+MAX_PH+'個まで です'); return; }
  if(st.phrases.includes(t)){ toastH('もう あります：'+t); return; }
  st.phrases.push(t); save(); paintPh(); toastH('⭐ よく使う言葉に 足しました');
}
async function editPhrase(i){
  const p=st.phrases[i]; if(p==null) return;
  const v=typeof appPrompt==='function' ? await appPrompt('言葉を 直す', p) : prompt('言葉を 直す', p);
  if(v==null) return; const t=oneLine(v,60); if(!t) return;
  st.phrases[i]=t; save(); paintPh();
}
async function delPhrase(i){
  const p=st.phrases[i]; if(p==null) return;
  if(typeof appConfirm==='function' && !await appConfirm('「'+p+'」を 消しますか？', '消す', 'やめる')) return;
  st.phrases.splice(i,1); save(); paintPh();
}
function movePhrase(i, d){
  const j=i+d; if(i<0 || j<0 || i>=st.phrases.length || j>=st.phrases.length) return;
  const a=st.phrases; [a[i],a[j]]=[a[j],a[i]]; save(); paintPh();
}
async function resetPhrases(){
  if(typeof appConfirm==='function' && !await appConfirm('よく使う言葉を はじめの '+DEF_PH.length+'個に 戻しますか？（足した言葉は 消えます）', '戻す', 'やめる')) return;
  st.phrases=DEF_PH.slice(); save(); paintPh();
}
function toggleEditPh(){ editPh=!editPh; paintPh(); }

/* ───────── ✍ 書く ───────── */
const penW=()=>(PENS.find(p=>p[0]===st.pen)||PENS[0])[2];
function padSize(){
  const c=$('hdPad'), box=$('hdBig'); if(!c || !box) return null;
  const w=box.clientWidth, h=box.clientHeight, dpr=Math.min(3, window.devicePixelRatio||1);
  if(c.width!==Math.round(w*dpr) || c.height!==Math.round(h*dpr)){ c.width=Math.round(w*dpr); c.height=Math.round(h*dpr); c.style.width=w+'px'; c.style.height=h+'px'; }
  return {c, w, h, dpr};
}
function inkColor(){ return st.color==='wb' ? '#111' : st.color==='by' ? '#ffd600' : '#fff'; }
function padDraw(){
  const s=padSize(); if(!s) return;
  const g=s.c.getContext('2d'); g.setTransform(s.dpr,0,0,s.dpr,0,0); g.clearRect(0,0,s.w,s.h);
  g.lineCap='round'; g.lineJoin='round'; g.strokeStyle=inkColor();
  for(const k of strokes){
    g.lineWidth=k.w; g.beginPath();
    k.p.forEach(([x,y],i)=>{ const X=x*s.w, Y=y*s.h; if(i) g.lineTo(X,Y); else { g.moveTo(X,Y); g.lineTo(X+0.01,Y); } });
    g.stroke();
  }
}
function bindPad(){
  const c=$('hdPad'); if(!c || c.dataset.b) return; c.dataset.b='1';
  const pt=e=>{ const r=c.getBoundingClientRect(); return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)), Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))]; };
  c.addEventListener('pointerdown', e=>{ if(mode!=='write') return; e.preventDefault(); drawing={w:penW(), p:[pt(e)]}; strokes.push(drawing); try{ c.setPointerCapture(e.pointerId); }catch(_){} padDraw(); });
  c.addEventListener('pointermove', e=>{ if(!drawing) return; e.preventDefault(); drawing.p.push(pt(e)); padDraw(); });
  ['pointerup','pointercancel'].forEach(t=>c.addEventListener(t, ()=>{ drawing=null; paintPanel(); }));
}
function padUndo(){ strokes.pop(); padDraw(); paintPanel(); }
function padClear(){ strokes=[]; padDraw(); paintPanel(); }

/* ───────── 画面いっぱい ───────── */
function openFull(){
  if(mode==='write') return;
  if(!cur.t && !(listening && interim)){ toastH('まだ 文字が ありません'); return; }
  if($('hdFull')) return;
  const el=document.createElement('div'); el.id='hdFull'; el.className='hd-full '+st.color; el.setAttribute('role','dialog'); el.setAttribute('aria-label','大きな文字');
  el.innerHTML=`<div class="hd-fbox${flip?' flip':''}" id="hdFBox" onclick="HITSUDAN.closeFull()"><div class="hd-ftxt" id="hdFTxt"></div></div>
    <div class="hd-fbar"><button type="button" onclick="HITSUDAN.flip()">↻ 相手向き</button><button type="button" onclick="HITSUDAN.say()">🔈 読む</button><button type="button" onclick="HITSUDAN.closeFull()">✕ もどる</button></div>`;
  document.body.appendChild(el);
  fullRel=typeof modalBack==='function' ? modalBack(()=>closeFull(true)) : null;
  window.addEventListener('keydown', fullKey, true);
  paintFull();
}
function fullKey(e){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); closeFull(); } }
function closeFull(byBack){
  const el=$('hdFull'); if(!el) return;
  el.remove(); window.removeEventListener('keydown', fullKey, true);
  if(fullRel && !byBack) fullRel(); fullRel=null;
}
function paintFull(){
  const el=$('hdFull'); if(!el) return;
  el.className='hd-full '+st.color;
  const box=$('hdFBox'), tx=$('hdFTxt'), t=(listening && interim) ? interim : cur.t;
  box.classList.toggle('flip', flip);
  tx.textContent=t;
  const W=box.clientWidth-30, H=box.clientHeight-30;
  let lo=16, hi=Math.max(16, Math.round(Math.max(capPx(), 120)*2.2)), best=lo;
  while(lo<=hi){ const mid=(lo+hi)>>1; tx.style.fontSize=mid+'px'; if(tx.scrollWidth<=W+1 && tx.scrollHeight<=H+1){ best=mid; lo=mid+1; } else hi=mid-1; }
  tx.style.fontSize=best+'px';
}
function toggleFlip(){ flip=!flip; paintFull(); }

/* ───────── 画面 ───────── */
function setMode(m){
  if(!['talk','type','write'].includes(m)) return;
  if(m!=='talk' && listening) micStop();
  mode=m; render();
  if(m==='type'){ const ta=$('hdIn'); if(ta){ ta.value=cur.src==='type'?cur.t:''; if(cur.src!=='type') typed(''); } }
}
function paintPanel(){
  const b=$('hdPanel'); if(!b) return;
  if(mode==='talk'){
    const ok=!!ctor();
    b.innerHTML=`<button type="button" class="hd-mic${listening?' on':''}" onclick="HITSUDAN.mic()">${listening?'⏹ 聞くのを やめる<small>聞いています… 話しおわるたびに 文字になります</small>':'🎤 話す<small>押してから 話すと、声が 大きな文字に なります</small>'}</button>
      ${ok?'':'<p class="hd-note">この端末（ブラウザ）では 声を文字にできないようです。「⌨ 打つ」「✍ 書く」と ⭐ よく使う言葉は 使えます。</p>'}
      <div class="hd-acts"><button type="button" class="hd-b" onclick="HITSUDAN.say()">🔈 読み上げる</button><button type="button" class="hd-b" onclick="HITSUDAN.full()">⛶ 画面いっぱい</button></div>`;
  } else if(mode==='type'){
    const keep=$('hdIn') ? $('hdIn').value : (cur.src==='type'?cur.t:'');
    b.innerHTML=`<textarea id="hdIn" class="hd-in" rows="3" maxlength="1000" placeholder="ここに 打つと 上に 大きく 出ます" oninput="HITSUDAN.typed(this.value)"></textarea>
      <div class="hd-acts"><button type="button" class="hd-b pri" onclick="HITSUDAN.say()">🔈 読み上げる</button><button type="button" class="hd-b" onclick="HITSUDAN.full()">⛶ 画面いっぱい</button>
        <button type="button" class="hd-b" onclick="HITSUDAN.typeNew()">🆕 新しく</button><button type="button" class="hd-b" onclick="HITSUDAN.typeKeep()">⭐ 残す</button></div>`;
    $('hdIn').value=keep;
    $('hdIn').addEventListener('keydown', e=>{ if(e.key!=='Escape') e.stopPropagation(); });
  } else {
    b.innerHTML=`<div class="hd-acts"><button type="button" class="hd-b" onclick="HITSUDAN.padUndo()" ${strokes.length?'':'disabled'}>↩ 1画もどす</button><button type="button" class="hd-b" onclick="HITSUDAN.padClear()" ${strokes.length?'':'disabled'}>🧹 ぜんぶ消す</button></div>
      <div class="hd-opt"><span>線</span>${PENS.map(([k,n])=>`<button type="button" class="${st.pen===k?'on':''}" onclick="HITSUDAN.pen('${k}')">${n}</button>`).join('')}</div>
      <p class="hd-note">上の板に 指で書いて 見せます。相手にも 書いてもらえます。</p>`;
  }
}
function paintPh(){
  const b=$('hdPh'); if(!b) return;
  const P=st.phrases;
  b.innerHTML=(editPh
    ? `<div class="hd-phe">${P.map((p,i)=>`<div class="r"><span class="t">${esc(p)}</span><button type="button" onclick="HITSUDAN.movePh(${i},-1)" ${i?'':'disabled'} aria-label="上へ">↑</button><button type="button" onclick="HITSUDAN.movePh(${i},1)" ${i<P.length-1?'':'disabled'} aria-label="下へ">↓</button><button type="button" onclick="HITSUDAN.editPh(${i})" aria-label="直す">✏️</button><button type="button" onclick="HITSUDAN.delPh(${i})" aria-label="消す">🗑</button></div>`).join('')||'<p class="hd-note">言葉が ありません。</p>'}</div>`
    : `<div class="hd-ph">${P.map((p,i)=>`<button type="button" onclick="HITSUDAN.phrase(${i})">${esc(p)}</button>`).join('')||'<p class="hd-note">「＋ 足す」で 言葉を 足せます。</p>'}</div>`)
    +`<div class="hd-acts sm"><button type="button" class="hd-b" onclick="HITSUDAN.addPh()">＋ 足す</button><button type="button" class="hd-b" onclick="HITSUDAN.editMode()">${editPh?'✓ 直しおわり':'✏️ 直す・並べかえ'}</button>${editPh?'<button type="button" class="hd-b" onclick="HITSUDAN.resetPh()">はじめに戻す</button>':''}</div>`;
}
function paintHist(){
  const b=$('hdHist'); if(!b) return;
  b.innerHTML=hist.length
    ? hist.map((h,i)=>`<button type="button" class="hd-h" onclick="HITSUDAN.again(${i})"><span class="s">${h.src==='talk'?'🎤':h.src==='type'?'⌨':'⭐'}</span><span class="t">${esc(h.t)}</span><span class="at">${h.at}</span></button>`).join('')
      +'<div class="hd-acts sm"><button type="button" class="hd-b" onclick="HITSUDAN.clearHist()">🧹 記録を消す</button></div>'
    : '<p class="hd-note">話した・打った・押した言葉が ここに 並びます（押すと もう一度 大きく 出ます）。閉じると 消えます。</p>';
}
function render(){
  const b=$('hdBody'); if(!b) return;
  b.innerHTML=`<div class="hd-wrap">
    <div class="hd-big ${st.color}" id="hdBig" onclick="HITSUDAN.full()"><div class="hd-src" id="hdSrc"></div><div class="hd-txt" id="hdTxt"></div><canvas id="hdPad" class="hd-pad"></canvas></div>
    <div class="hd-modes" role="tablist">${[['talk','🎤 話す'],['type','⌨ 打つ'],['write','✍ 書く']].map(([k,n])=>`<button type="button" role="tab" aria-selected="${mode===k}" class="${mode===k?'on':''}" onclick="HITSUDAN.mode('${k}')">${n}</button>`).join('')}</div>
    <div id="hdPanel" class="hd-panel"></div>
    <div class="hd-sec"><h4>⭐ よく使う言葉<small>押すと 大きく 出ます</small></h4><div id="hdPh"></div></div>
    <div class="hd-sec"><h4>🕘 さっきの言葉</h4><div id="hdHist"></div></div>
    <div class="hd-sec"><h4>⚙ 見た目</h4>
      <div class="hd-opt"><span>文字</span>${SCALES.map(([k,n])=>`<button type="button" class="${st.scale===k?'on':''}" onclick="HITSUDAN.scale('${k}')">${n}</button>`).join('')}</div>
      <div class="hd-opt"><span>色</span>${COLORS.map(([k,n])=>`<button type="button" class="c-${k}${st.color===k?' on':''}" onclick="HITSUDAN.color('${k}')">${n}</button>`).join('')}</div>
      <div class="hd-opt"><span>⭐を押したら</span>${[[false,'出すだけ'],[true,'読み上げも']].map(([v,n])=>`<button type="button" class="${st.yomu===v?'on':''}" onclick="HITSUDAN.yomu(${v})">${n}</button>`).join('')}</div>
      <p class="hd-note">大きな字を押すと 画面いっぱいに 出ます。「↻ 相手向き」で さかさまにすると、向かいの人が 読めます。</p></div>
  </div>`;
  const pad=$('hdPad'); pad.hidden=mode!=='write';
  paintPanel(); paintPh(); paintHist(); paintBig(); bindPad();
  if(mode==='write') padDraw();
}
function setScale(k){ if(!SCALES.some(s=>s[0]===k)) return; st.scale=k; save(); render(); }
function setColor(k){ if(!COLORS.some(c=>c[0]===k)) return; st.color=k; save(); render(); }
function setYomu(b){ st.yomu=!!b; save(); render(); }
function setPen(k){ if(!PENS.some(p=>p[0]===k)) return; st.pen=k; save(); paintPanel(); }

const HD_CSS=`
#hitsudanOverlay .hd-modal{ display:flex; flex-direction:column; }
.hd-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.hd-wrap{ max-width:820px; margin:0 auto; }
.hd-big{ position:relative; height:40vh; min-height:190px; max-height:520px; border-radius:16px; display:flex; align-items:center; justify-content:center; padding:12px; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 2px rgba(120,132,156,.35); user-select:text; }
.hd-big.w{ cursor:crosshair; height:50vh; }
.hd-big.wb{ background:#fff; color:#111; } .hd-big.by{ background:#111; color:#ffd600; } .hd-big.bw{ background:#111; color:#fff; } .hd-big.nb{ background:#0d2c6c; color:#fff; }
.hd-src{ position:absolute; left:12px; top:8px; font-size:13px; font-weight:bold; opacity:.7; }
.hd-txt{ width:100%; text-align:center; font-weight:bold; line-height:1.22; white-space:pre-wrap; overflow-wrap:anywhere; }
.hd-txt.ph{ font-size:16px !important; font-weight:normal; opacity:.6; }
.hd-txt.live{ opacity:.82; }
.hd-big.w .hd-txt, .hd-big.w .hd-src{ display:none; }
.hd-pad{ position:absolute; inset:0; touch-action:none; }
.hd-pad[hidden]{ display:none; }
.hd-modes{ display:grid; grid-template-columns:repeat(3,1fr); gap:5px; margin:10px 0 8px; }
.hd-modes button{ min-height:48px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:var(--modal-bg,#fff); color:var(--text,#222); font-size:16px; font-weight:bold; cursor:pointer; }
.hd-modes button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.hd-panel{ margin:0 0 10px; }
.hd-mic{ display:block; width:100%; min-height:72px; border-radius:16px; border:0; background:var(--acc); color:var(--on-acc,#fff); font-size:22px; font-weight:bold; cursor:pointer; padding:8px; }
.hd-mic small{ display:block; font-size:12.5px; font-weight:normal; opacity:.92; margin-top:2px; }
.hd-mic.on{ background:#c62828; animation:hdPulse 1.4s ease-in-out infinite; }
@keyframes hdPulse{ 0%,100%{ box-shadow:0 0 0 0 rgba(198,40,40,.45); } 50%{ box-shadow:0 0 0 8px rgba(198,40,40,0); } }
.hd-in{ display:block; width:100%; box-sizing:border-box; min-height:86px; padding:10px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font:inherit; font-size:20px; line-height:1.45; resize:vertical; }
.hd-acts{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; } .hd-acts .hd-b{ flex:1 1 auto; white-space:nowrap; }
.hd-acts.sm .hd-b{ min-height:38px; font-size:13.5px; flex:0 1 auto; }
.hd-b{ min-height:46px; padding:0 12px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.hd-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.hd-b:disabled{ opacity:.45; cursor:default; }
.hd-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.hd-sec h4{ margin:0 0 8px; font-size:15px; } .hd-sec h4 small{ font-weight:normal; font-size:12px; color:var(--text-light,#666); margin-left:8px; }
.hd-ph{ display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:6px; }
.hd-ph button{ min-height:52px; padding:6px 8px; border-radius:12px; border:1px solid rgba(200,150,30,.55); background:rgba(200,150,30,.10); color:var(--text,#222); font-size:15px; font-weight:bold; line-height:1.3; cursor:pointer; text-align:center; word-break:keep-all; overflow-wrap:anywhere; }   /* 言葉の切れ目（空白）で 折る */
.hd-phe .r{ display:flex; align-items:center; gap:4px; padding:4px 0; border-bottom:1px solid rgba(120,132,156,.18); }
.hd-phe .t{ flex:1; min-width:0; font-size:15px; overflow-wrap:anywhere; }
.hd-phe button{ min-width:40px; min-height:38px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; }
.hd-phe button:disabled{ opacity:.3; }
.hd-h{ display:flex; align-items:baseline; gap:8px; width:100%; padding:8px 4px; border:0; border-bottom:1px solid rgba(120,132,156,.18); background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.hd-h .t{ flex:1; min-width:0; font-size:16px; overflow-wrap:anywhere; } .hd-h .at{ font-size:12px; color:var(--text-light,#666); font-variant-numeric:tabular-nums; }
.hd-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:6px 0; } .hd-opt span{ min-width:5.4em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.hd-opt button{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.hd-opt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.hd-opt button.c-wb:not(.on){ background:#fff; color:#111; } .hd-opt button.c-by:not(.on){ background:#111; color:#ffd600; } .hd-opt button.c-bw:not(.on){ background:#111; color:#fff; } .hd-opt button.c-nb:not(.on){ background:#0d2c6c; color:#fff; }
.hd-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:6px 0 0; }
.hd-full{ position:fixed; inset:0; z-index:99990; display:flex; flex-direction:column; }
.hd-full.wb{ background:#fff; color:#111; } .hd-full.by{ background:#111; color:#ffd600; } .hd-full.bw{ background:#111; color:#fff; } .hd-full.nb{ background:#0d2c6c; color:#fff; }
.hd-fbox{ flex:1; min-height:0; display:flex; align-items:center; justify-content:center; padding:15px; overflow:hidden; transition:transform .25s ease; }
.hd-fbox.flip{ transform:rotate(180deg); }
.hd-ftxt{ width:100%; text-align:center; font-weight:bold; line-height:1.2; white-space:pre-wrap; overflow-wrap:anywhere; }
.hd-fbar{ display:flex; gap:6px; padding:8px 10px calc(8px + var(--safe-bottom,0px)); background:rgba(0,0,0,.08); }
.hd-full.by .hd-fbar, .hd-full.bw .hd-fbar, .hd-full.nb .hd-fbar{ background:rgba(255,255,255,.12); }
.hd-fbar button{ flex:1; min-height:48px; border-radius:12px; border:1px solid currentColor; background:transparent; color:inherit; font-size:16px; font-weight:bold; cursor:pointer; }
`;
function ensureDom(){
  if($('hitsudanOverlay')) return;
  const stl=document.createElement('style'); stl.id='hdStyle'; stl.textContent=HD_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="hitsudanOverlay">
  <div class="modal vol-modal hd-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🗣 筆談ボード</span><button class="modal-close" onclick="closeHitsudan()" aria-label="閉じる">✕</button></div>
    <div class="hd-body" id="hdBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  $('hitsudanOverlay').addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('resize', ()=>{ clearTimeout(fitT); fitT=setTimeout(()=>{ if(!isDlgOpen('hitsudanOverlay')) return; paintBig(); if(mode==='write') padDraw(); }, 150); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ listening=false; interim=''; stopRec(); closeFull(); hist=[]; strokes=[]; cur={t:'', src:''}; }
function openHitsudan(){
  ensureDom(); load(); mode='talk'; editPh=false; flip=false;
  openDlg('hitsudanOverlay', cleanup);
  render();
}
function closeHitsudan(){ if(!$('hitsudanOverlay')||!isDlgOpen('hitsudanOverlay')) return; closeDlg('hitsudanOverlay', cleanup); }

window.HITSUDAN={ mode:setMode, mic:micToggle, micStop, say:t=>{ say(typeof t==='string'?t:undefined); }, typed, typeNew, typeKeep, phrase,
  addPh:t=>{ addPhrase(typeof t==='string'?t:undefined); }, editPh:i=>{ editPhrase(i); }, delPh:i=>{ delPhrase(i); }, movePh:movePhrase, resetPh:()=>{ resetPhrases(); }, editMode:toggleEditPh,
  again:i=>{ const h=hist[i]; if(h){ if(mode==='write'){ mode='talk'; render(); } cur={t:h.t, src:h.src}; interim=''; paintBig(); } }, clearHist:()=>{ hist=[]; paintHist(); },
  full:openFull, closeFull:()=>closeFull(), flip:toggleFlip, padUndo, padClear, pen:setPen, scale:setScale, color:setColor, yomu:setYomu,
  show:(t,src)=>show(t, SRC[src]?src:'type'), state:()=>JSON.parse(JSON.stringify(st)), cur:()=>({t:cur.t, src:cur.src, interim, listening, mode}), hist:()=>hist.map(h=>h.src+':'+h.t),
  strokes:()=>strokes.length, fontPx:()=>parseFloat(($('hdTxt')||{}).style.fontSize)||0 };
Object.assign(window, { openHitsudan, closeHitsudan });
})();
