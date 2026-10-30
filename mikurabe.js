/* 📸 ビフォー・アフター 見比べ（v605。表電卓の道具。apps/mikurabe/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   施工の 前後・掃除・庭・模様替え・ダイエット などを、前と 後の 2枚で 見比べる。
   ・↔ スライダー（指で 境目を 動かす）・⇆ 並べる（左右／上下）・👻 透かす（重ねて 薄く）
   ・🎯 位置合わせ：後の 写真を 動かす・大きさ・かたむき（どの 見せ方にも、画像・印刷にも 効く）
   ・👻 前に 合わせて 撮る：カメラに 前の 写真を 薄く 重ねて、同じ 向き・同じ 大きさで 撮れる（カメラが 使えない ときは ふつうに 撮る）
   ・🖼 並べた 画像で 保存・送る（名前・日付・あいだの 日数 入り）・🖨 印刷（1組）・🖨 写真帳（いくつかの 組を まとめて）
   中身は excalc_mikurabe、写真は IndexedDB（excalc_mikurabe。長い辺 1600px と 小さい 見本）。この端末の中だけ。 */
(function(){
'use strict';
const KEY='excalc_mikurabe', MAX_P=200, PIC_PX=1600, TH_PX=360;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);
const okPic=x=>typeof x==='string' && /^[pt][a-z0-9]{6,20}$/.test(x);
const okD=s=>typeof s==='string' && /^\d{4}-\d\d-\d\d$/.test(s);
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const dOf=s=>{ const a=s.split('-').map(Number); return new Date(a[0], a[1]-1, a[2]); };
const jd=s=>okD(s) ? dOf(s).getFullYear()+'年'+(dOf(s).getMonth()+1)+'月'+dOf(s).getDate()+'日' : '';
const sd=s=>okD(s) ? (dOf(s).getFullYear()!==new Date().getFullYear() ? dOf(s).getFullYear()+'/' : '')+(dOf(s).getMonth()+1)+'/'+dOf(s).getDate() : '';
const gap=(a,b)=>okD(a) && okD(b) ? Math.round((dOf(b)-dOf(a))/86400000) : null;
const clamp=(v,a,b)=>Math.min(b, Math.max(a, v));
const MODES=[['slide','↔ スライダー'],['side','⇆ 並べる'],['fade','👻 透かす']];

/* ───────── 中身 ───────── */
let st=null;
function cleanSlot(o){ if(!o || typeof o!=='object' || !okPic(o.pic)) return null; return {pic:o.pic, thumb:okPic(o.thumb) ? o.thumb : '', d:okD(o.d) ? o.d : '', w:Math.max(1, Math.round(+o.w)||4), h:Math.max(1, Math.round(+o.h)||3)}; }
function cleanTf(o){ o=o && typeof o==='object' ? o : {}; return {x:clamp(+o.x||0, -60, 60), y:clamp(+o.y||0, -60, 60), s:clamp(+o.s||1, 0.5, 2.5), r:clamp(+o.r||0, -30, 30)}; }
function cleanP(p){
  if(!p || typeof p!=='object') return null;
  return {id:okId(p.id) ? p.id : rid(), t:oneLine(p.t, 40), place:oneLine(p.place, 60), memo:multi(p.memo, 400), a:cleanSlot(p.a), b:cleanSlot(p.b), tf:cleanTf(p.tf), at:+p.at||Date.now()};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=o && typeof o==='object' ? o : {};
  const u=o.ui && typeof o.ui==='object' ? o.ui : {};
  st={v:1, list:(Array.isArray(o.list) ? o.list : []).map(cleanP).filter(Boolean).slice(0, MAX_P),
    ui:{mode:MODES.some(m=>m[0]===u.mode) ? u.mode : 'slide', dir:u.dir==='v' ? 'v' : 'h', fade:clamp(Math.round(+u.fade||50), 0, 100), pos:clamp(Math.round(+u.pos||50), 0, 100)}};
}
let saveT=0;
function save(){ clearTimeout(saveT); saveT=0; try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末の 空きが 足りず、保存 できませんでした'); return false; } }
function saveSoon(){ clearTimeout(saveT); saveT=setTimeout(save, 400); }
const pOf=id=>st.list.find(p=>p.id===id)||null;
const pTitle=p=>p.t || '見比べ';

/* ───────── 写真（IndexedDB） ───────── */
let dbP=null;
function db(){
  if(dbP) return dbP;
  dbP=new Promise((res,rej)=>{ try{ const r=indexedDB.open('excalc_mikurabe',1); r.onupgradeneeded=()=>r.result.createObjectStore('pics'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e); } }).catch(e=>{ dbP=null; throw e; });
  return dbP;
}
const cache=new Map();
async function picGet(id){ if(cache.has(id)) return cache.get(id); try{ const d=await db(); const u=await new Promise(r=>{ const q=d.transaction('pics').objectStore('pics').get(id); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); if(u && cache.size<12) cache.set(id, u); return u; }catch(_){ return null; } }
async function picPut(id, data){ const d=await db(); await new Promise((res,rej)=>{ const t=d.transaction('pics','readwrite'); t.objectStore('pics').put(data,id); t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error); }); cache.delete(id); return true; }
async function picDel(id){ if(!okPic(id)) return; cache.delete(id); try{ const d=await db(); await new Promise(r=>{ const t=d.transaction('pics','readwrite'); t.objectStore('pics').delete(id); t.oncomplete=r; t.onerror=r; }); }catch(_){} }
const okData=u=>typeof u==='string' && /^data:image\/(jpeg|png|webp);base64,/.test(u);
function fillPics(root){ (root||document).querySelectorAll('img[data-pic]').forEach(im=>{ const id=im.dataset.pic; if(im.getAttribute('src')) return; picGet(id).then(u=>{ if(okData(u) && im.dataset.pic===id) im.src=u; }); }); }
function loadImg(src){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('img')); im.src=src; }); }
// 写真（Image か canvas か video）から 大きい 写真と 小さい 見本を 作って しまう
async function storeFrom(src, sw, sh){
  const mk=max=>{ const k=Math.min(1, max/Math.max(sw, sh)), c=document.createElement('canvas'); c.width=Math.max(1, Math.round(sw*k)); c.height=Math.max(1, Math.round(sh*k));
    const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(src, 0, 0, c.width, c.height); return c; };
  const big=mk(PIC_PX), th=mk(TH_PX), k=rid()+rid().slice(0,4);
  fresh.add('p'+k); fresh.add('t'+k);
  await picPut('p'+k, big.toDataURL('image/jpeg', 0.85)); await picPut('t'+k, th.toDataURL('image/jpeg', 0.72));
  return {pic:'p'+k, thumb:'t'+k, w:big.width, h:big.height};
}
async function slotFromFile(file){
  if(!file || !/^image\//.test(file.type||'')){ toastS('写真を えらんで ください'); return null; }
  const url=URL.createObjectURL(file);
  try{ const im=await loadImg(url); const s=await storeFrom(im, im.naturalWidth, im.naturalHeight); const lm=file.lastModified ? new Date(file.lastModified) : new Date(); s.d=ymd(isNaN(lm) ? new Date() : lm); return s; }
  catch(_){ toastS('写真を 読めませんでした'); return null; }
  finally{ URL.revokeObjectURL(url); }
}
async function slotFromData(data, d){
  if(!okData(data)) return null;
  try{ const im=await loadImg(data); const s=await storeFrom(im, im.naturalWidth, im.naturalHeight); s.d=okD(d) ? d : ymd(new Date()); return s; }catch(_){ return null; }
}
function dropSlot(s){ if(s){ picDel(s.pic); picDel(s.thumb); } }
// どの 組も 使って いない 写真を 消す（開いた ときに 1回。設定の 読み込みで 中身が かわった ときの 残り など）。
// 作って 組に 入れる までの 写真（fresh）は さわらない
const fresh=new Set();
async function gc(){
  try{
    const d=await db();
    const keys=await new Promise(r=>{ const q=d.transaction('pics').objectStore('pics').getAllKeys(); q.onsuccess=()=>r(q.result||[]); q.onerror=()=>r([]); });
    const used=new Set(); st.list.forEach(p=>[p.a, p.b].forEach(x=>{ if(x){ used.add(x.pic); if(x.thumb) used.add(x.thumb); } }));
    for(const k of keys) if(typeof k==='string' && !used.has(k) && !fresh.has(k)) await picDel(k);
  }catch(_){}
}

/* ───────── 画面 ───────── */
let cur=null;
function render(){
  const b=$('mkBody'); if(!b || !st) return;
  const top=b.scrollTop;
  b.innerHTML=`<div class="mk-wrap">${cur && pOf(cur) ? viewHtml(pOf(cur)) : listHtml()}</div>`;
  b.scrollTop=top;
  fillPics(b);
  if(cur) bindCmp();
}
function listHtml(){
  const L=st.list.slice().sort((a,b)=>b.at-a.at);
  const th=s=>s ? `<img data-pic="${s.thumb||s.pic}" alt="">` : '<span class="mk-noimg" aria-hidden="true">？</span>';
  return `<div class="mk-acts top"><button type="button" class="mk-b pri" onclick="MIKURABE.add()">＋ 新しい 見比べ</button>${L.some(p=>p.a && p.b) ? '<button type="button" class="mk-b" onclick="MIKURABE.book()">🖨 写真帳（まとめて 印刷）</button>' : ''}</div>
    ${L.length ? `<div class="mk-list">${L.map(p=>{ const g=gap(p.a && p.a.d, p.b && p.b.d);
      return `<button type="button" class="mk-card" onclick="MIKURABE.open('${p.id}')"><span class="mk-ths">${th(p.a)}<i aria-hidden="true">▶</i>${th(p.b)}</span>
        <span class="mk-ct"><b>${esc(pTitle(p))}</b>${p.place ? `<small>📍 ${esc(p.place)}</small>` : ''}<small>${p.a ? '前 '+esc(sd(p.a.d)) : '前 まだ'}　→　${p.b ? '後 '+esc(sd(p.b.d)) : '後 まだ'}${g!=null && g>0 ? '（'+g+'日）' : ''}</small></span></button>`; }).join('')}</div>`
      : `<div class="mk-empty"><p>前と 後の 写真を 1組に して、境目を 動かして 見比べたり、並べた 画像で 送ったり できます。</p>
        <p>例：施工の 前後（床・外壁・配管）・掃除や 片づけ・庭・模様替え・ダイエット・植物の 育ち</p>
        <p>「👻 前に 合わせて 撮る」で、前の 写真を 薄く 重ねながら 同じ 向きで 撮れます。</p></div>`}`;
}
function cmpHtml(p){
  const u=st.ui, a=p.a, b=p.b, ar=a ? a.w+' / '+a.h : '4 / 3';
  const lab=(s,k)=>`<span class="mk-lab ${k}">${k==='l' ? '前' : '後'}${s && s.d ? ' '+esc(sd(s.d)) : ''}</span>`;
  const bt=`transform:translate(${p.tf.x}%, ${p.tf.y}%) rotate(${p.tf.r}deg) scale(${p.tf.s})`;
  if(u.mode==='side') return `<div class="mk-side ${u.dir}"><figure>${'<img data-pic="'+a.pic+'" alt="前の 写真">'}${lab(a,'l')}</figure><figure class="ab"><div class="mk-clip" style="aspect-ratio:${ar}"><img data-pic="${b.pic}" alt="後の 写真" style="${bt}"></div>${lab(b,'r')}</figure></div>`;
  return `<div class="mk-cmp ${u.mode}${adj ? ' adj' : ''}" id="mkCmp" style="aspect-ratio:${ar};width:min(100%, calc(68vh * ${(a.w/a.h).toFixed(4)}))">
    <img class="mk-ia" data-pic="${a.pic}" alt="前の 写真">
    <div class="mk-bw" id="mkBw" style="${u.mode==='slide' ? 'clip-path:inset(0 0 0 '+u.pos+'%)' : 'opacity:'+(u.fade/100)}"><img class="mk-ib" id="mkB" data-pic="${b.pic}" alt="後の 写真" style="${bt}"></div>
    ${u.mode==='slide' ? `<div class="mk-line" id="mkLine" style="left:${u.pos}%"><span class="mk-knob" id="mkKnob" role="slider" tabindex="0" aria-label="前と 後の 境目" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${u.pos}">⇔</span></div>` : ''}
    ${lab(a,'l')}${lab(b,'r')}<button type="button" class="mk-fsb" onclick="MIKURABE.full()" aria-label="全画面で 見る" title="全画面で 見る">⛶</button></div>`;
}
let adj=false;   // 🎯 位置合わせ 中
function viewHtml(p){
  const u=st.ui, both=p.a && p.b, g=gap(p.a && p.a.d, p.b && p.b.d);
  const slot=(k)=>{ const s=p[k], nm=k==='a' ? '前' : '後';
    return `<div class="mk-slot"><div class="mk-sh"><b>${nm}</b>${s ? `<input type="date" value="${esc(s.d)}" aria-label="${nm}の 日付" onchange="MIKURABE.date('${k}', this.value)">` : ''}</div>
      ${s ? `<div class="mk-stw"><img data-pic="${s.thumb||s.pic}" alt="${nm}の 写真" class="mk-st"><button type="button" class="mk-rm" onclick="MIKURABE.unset('${k}')" aria-label="${nm}の 写真を 外す">✕</button></div>` : `<div class="mk-st none">${nm}の 写真が まだ です</div>`}
      <div class="mk-acts sm"><button type="button" class="mk-b sm" onclick="document.getElementById('mkIn_${k}c').click()">📷 撮る</button><button type="button" class="mk-b sm" onclick="document.getElementById('mkIn_${k}').click()">🖼 えらぶ</button>
        ${k==='b' && p.a ? '<button type="button" class="mk-b sm pri" onclick="MIKURABE.cam()">👻 前に 合わせて 撮る</button>' : ''}</div>
      <input type="file" id="mkIn_${k}c" accept="image/*" capture="environment" hidden onchange="MIKURABE.pick('${k}', this)"><input type="file" id="mkIn_${k}" accept="image/*" hidden onchange="MIKURABE.pick('${k}', this)"></div>`; };
  return `<div class="mk-eh"><button type="button" class="mk-b" onclick="MIKURABE.back()">← 一覧</button><b id="mkTitle">${esc(pTitle(p))}</b></div>
    ${both ? `<div class="mk-modes" role="tablist">${MODES.map(([k,n])=>`<button type="button" role="tab" aria-selected="${u.mode===k}" class="${u.mode===k?'on':''}" onclick="MIKURABE.mode('${k}')">${n}</button>`).join('')}</div>
      ${cmpHtml(p)}
      <div class="mk-ctl">${u.mode==='side' ? `<div class="mk-seg"><button type="button" class="${u.dir==='h'?'on':''}" onclick="MIKURABE.dir('h')">◧ 左右</button><button type="button" class="${u.dir==='v'?'on':''}" onclick="MIKURABE.dir('v')">⬒ 上下</button></div>`
        : u.mode==='fade' ? `<label class="mk-rng"><span>後の 濃さ</span><input type="range" min="0" max="100" value="${u.fade}" aria-label="後の 写真の 濃さ" oninput="MIKURABE.fade(this.value)"></label>`
        : '<small class="mk-hint">境目を 指で 左右に 動かして 見比べます</small>'}
        <button type="button" class="mk-b sm${adj ? ' pri' : ''}" onclick="MIKURABE.adjust()">🎯 位置合わせ${adj ? '（おわる）' : ''}</button><button type="button" class="mk-b sm" onclick="MIKURABE.full()">⛶ 全画面</button></div>
      ${adj ? `<div class="mk-adj"><p>写真を 指で 動かすと 後の 写真が 動きます。前の 写真に 重なる ように 合わせて ください。</p>
        <label class="mk-rng"><span>大きさ</span><input type="range" min="50" max="250" value="${Math.round(p.tf.s*100)}" aria-label="後の 写真の 大きさ" oninput="MIKURABE.tf('s', this.value/100)"></label>
        <label class="mk-rng"><span>かたむき</span><input type="range" min="-30" max="30" step="0.5" value="${p.tf.r}" aria-label="後の 写真の かたむき" oninput="MIKURABE.tf('r', this.value)"></label>
        <div class="mk-acts sm"><button type="button" class="mk-b sm" onclick="MIKURABE.tfReset()">↺ もとに もどす</button></div></div>` : ''}
      <p class="mk-gap">${g!=null ? (g>0 ? '前から 後まで <b>'+g+'日</b>' : g===0 ? '同じ 日' : '日付が 前後 しています') : ''}</p>`
    : `<p class="mk-note">前と 後の 両方の 写真が そろうと、ここで 見比べられます。</p>`}
    <div class="mk-slots">${slot('a')}${slot('b')}</div>
    <section class="mk-sec"><label class="mk-f"><span>名前</span><input type="text" maxlength="40" value="${esc(p.t)}" placeholder="例：浴室の 床（張りかえ）" oninput="MIKURABE.set('t', this.value)"></label>
      <label class="mk-f"><span>場所</span><input type="text" maxlength="60" value="${esc(p.place)}" placeholder="例：○○様邸 1階" oninput="MIKURABE.set('place', this.value)"></label>
      <label class="mk-f top"><span>メモ</span><textarea rows="2" maxlength="400" placeholder="例：古い タイルを はがして 防水を やりなおし" oninput="MIKURABE.set('memo', this.value)">${esc(p.memo)}</textarea></label></section>
    <div class="mk-out">${both ? `<button type="button" class="mk-b pri" onclick="MIKURABE.shot()">🖼 並べた 画像（保存・送る）</button><button type="button" class="mk-b" onclick="MIKURABE.print()">🖨 印刷・PDF</button>` : ''}
      ${p.a || p.b ? '<button type="button" class="mk-b" onclick="MIKURABE.swap()">⇄ 前と 後を 入れかえ</button>' : ''}<button type="button" class="mk-b warn" onclick="MIKURABE.del(\''+p.id+'\')">🗑 この 組を 消す</button></div>`;
}

/* 境目・位置合わせ（指・マウス・キー） */
function bindCmp(){
  const box=$('mkCmp'); if(!box) return;
  const p=pOf(cur); if(!p) return;
  let drag=null;
  box.addEventListener('pointerdown', e=>{
    if(e.button!==undefined && e.button>0) return;
    if(e.target.closest('button')) return;   // ⛶ は 押せる ように
    const r=box.getBoundingClientRect();
    if(adj){ drag={x:e.clientX, y:e.clientY, tx:p.tf.x, ty:p.tf.y, w:r.width, h:r.height}; }
    else if(st.ui.mode==='slide'){ drag={slide:true, r}; setPos((e.clientX-r.left)/r.width*100); }
    else return;
    try{ box.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
  });
  box.addEventListener('pointermove', e=>{
    if(!drag) return;
    if(drag.slide){ setPos((e.clientX-drag.r.left)/drag.r.width*100); return; }
    p.tf.x=clamp(drag.tx+(e.clientX-drag.x)/drag.w*100, -60, 60); p.tf.y=clamp(drag.ty+(e.clientY-drag.y)/drag.h*100, -60, 60); applyTf(p);
  });
  const end=()=>{ if(drag){ drag=null; saveSoon(); } };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  const k=$('mkKnob');
  if(k) k.addEventListener('keydown', e=>{ const d=e.key==='ArrowLeft' ? -2 : e.key==='ArrowRight' ? 2 : 0; if(d){ e.preventDefault(); setPos(st.ui.pos+d); saveSoon(); } });
}
function setPos(v){ st.ui.pos=Math.round(clamp(v, 0, 100)); paintPos(st.ui.pos); }
// 境目を 描く（全画面の 方も。自動で 動かす ときは 小数で なめらかに）
function paintPos(v){
  [['mkBw','mkLine','mkKnob'], ['mkFsBw','mkFsLine','mkFsKnob']].forEach(([a,b,c])=>{
    const bw=$(a), ln=$(b), k=$(c);
    if(bw && st.ui.mode==='slide') bw.style.clipPath='inset(0 0 0 '+v+'%)';
    if(ln) ln.style.left=v+'%';
    if(k) k.setAttribute('aria-valuenow', Math.round(v));
  });
}
function applyTf(p){ const t='translate('+p.tf.x+'%, '+p.tf.y+'%) rotate('+p.tf.r+'deg) scale('+p.tf.s+')'; document.querySelectorAll('#mkB, .mk-side .ab img').forEach(im=>{ im.style.transform=t; }); }

/* ───────── 操作 ───────── */
function add(){
  if(st.list.length>=MAX_P){ toastS('見比べは '+MAX_P+'組まで です。古い ものを 消して ください'); return; }
  const p=cleanP({id:rid(), t:'', at:Date.now()}); st.list.unshift(p); save();
  adjOff(); cur=p.id; render(); const b=$('mkBody'); if(b) b.scrollTop=0;
}
function openP(id){ if(!pOf(id)) return; adjOff(); cur=id; render(); const b=$('mkBody'); if(b) b.scrollTop=0; }
function back(){ fsClose(false, true); camStop(); adjOff(); save(); cur=null; render(); }
function setF(k, v){ const p=pOf(cur); if(!p) return; if(k==='t') p.t=oneLine(v, 40); else if(k==='place') p.place=oneLine(v, 60); else if(k==='memo') p.memo=multi(v, 400); else return; saveSoon(); const t=$('mkTitle'); if(t) t.textContent=pTitle(p); }
async function putSlot(k, s){
  const p=pOf(cur); if(!p || !s) return false;
  const old=p[k], oldTf=p.tf; p[k]=s; p.tf=cleanTf(null);   // 新しい 写真は 位置合わせを もとに
  if(!save()){ p[k]=old; p.tf=oldTf; dropSlot(s); return false; }
  fresh.delete(s.pic); fresh.delete(s.thumb);   // もう 組に 入った ので、片づけの 対象に もどす
  dropSlot(old); render(); return true;
}
async function pick(k, input){
  const f=input && input.files && input.files[0]; if(input) input.value=''; if(!f || !cur) return;
  const s=await slotFromFile(f); if(s) await putSlot(k, s);
}
async function unset(k){
  const p=pOf(cur); if(!p || !p[k]) return;
  if(typeof appConfirm==='function' && !(await appConfirm((k==='a' ? '前' : '後')+'の 写真を 外しますか？','外す','やめる'))) return;
  const old=p[k]; p[k]=null; save(); dropSlot(old); render();
}
function date(k, v){ const p=pOf(cur); if(!p || !p[k] || !okD(v)) return; p[k].d=v; save(); render(); }
function swap(){ const p=pOf(cur); if(!p) return; [p.a, p.b]=[p.b, p.a]; p.tf=cleanTf(null); save(); render(); toastS('⇄ 前と 後を 入れかえました'); }
async function del(id){
  const p=pOf(id); if(!p) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+pTitle(p)+'」（写真 '+((p.a?1:0)+(p.b?1:0))+'枚）を 消しますか？','消す','やめる'))) return;
  adjOff(); st.list=st.list.filter(x=>x.id!==id); save(); dropSlot(p.a); dropSlot(p.b); cur=null; render();
}
function setMode(m){ if(!MODES.some(x=>x[0]===m)) return; st.ui.mode=m; adj=false; adjPrev=''; save(); render(); }
function setDir(d){ st.ui.dir=d==='v' ? 'v' : 'h'; save(); render(); }
function setFade(v){ st.ui.fade=clamp(Math.round(+v||0), 0, 100); ['mkBw','mkFsBw'].forEach(id=>{ const bw=$(id); if(bw && st.ui.mode==='fade') bw.style.opacity=st.ui.fade/100; }); saveSoon(); }
let adjPrev='';   // 位置合わせの 前の 見せ方（おわったら もどす）
function adjOff(){ if(adj && adjPrev && st) st.ui.mode=adjPrev; adj=false; adjPrev=''; }
function adjust(){
  if(adj){ adjOff(); save(); render(); return; }
  adj=true; adjPrev=st.ui.mode; st.ui.mode='fade'; if(st.ui.fade<25 || st.ui.fade>75) st.ui.fade=50;
  save(); render(); toastS('👻 透かした 後の 写真を 指で 動かして、前の 写真に 重ねます', 3600);
}
function setTf(k, v){ const p=pOf(cur); if(!p) return; if(k==='s') p.tf.s=clamp(+v||1, 0.5, 2.5); else if(k==='r') p.tf.r=clamp(+v||0, -30, 30); else if(k==='x' || k==='y') p.tf[k]=clamp(+v||0, -60, 60); else return; applyTf(p); saveSoon(); }
function tfReset(){ const p=pOf(cur); if(!p) return; p.tf=cleanTf(null); save(); render(); }

/* ───────── ⛶ 全画面で 見比べる（v606）─────────
   画面いっぱいに 前と 後を 出す（端末の 全画面も 使う。使えない 端末では 道具の 画面いっぱい）。
   ↔ 境目は 画面の どこを なぞっても 動く・← → キー。▶ で 境目が 自動で 行ったり 来たり（お客さんに 見せる とき）。
   ⇆ 並べるは 縦持ちなら 上下、横持ちなら 左右（大きく 見える 方）。端末の「戻る」・Esc・✕ で もどる */
let fs=null;   // {el, rel, anim, dimT, onResize, onFull, wasFull}
const FS_MODES=[['slide','↔ 境目'],['side','⇆ 並べる'],['fade','👻 透かす']];
function fsOpen(){
  const p=pOf(cur); if(!p || !p.a || !p.b) return;
  fsClose(false, true); camStop(); popClose(); adjOff();
  const host=document.querySelector('#mikurabeOverlay .mk-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='mk-fs'; el.tabIndex=-1;
  el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','全画面で 見比べる');
  host.appendChild(el);
  const me={el, rel:null, anim:0, dimT:0, wasFull:false}; fs=me;
  me.rel=typeof modalBack==='function' ? modalBack(()=>{ if(fs===me) fsClose(true); }) : ()=>{};
  fsRender();
  let drag=null;
  el.addEventListener('pointerdown', e=>{
    fsWake();
    if(e.target.closest('button, input, label')) return;
    if((e.button!==undefined && e.button>0) || st.ui.mode!=='slide') return;
    fsStop();
    const f=$('mkFsF'); if(!f) return;
    drag={r:f.getBoundingClientRect()}; setPos((e.clientX-drag.r.left)/drag.r.width*100);
    try{ el.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
  });
  el.addEventListener('pointermove', e=>{ if(drag) setPos((e.clientX-drag.r.left)/drag.r.width*100); });
  const end=()=>{ if(drag){ drag=null; saveSoon(); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', e=>{
    fsWake();
    if(st.ui.mode==='slide' && (e.key==='ArrowLeft' || e.key==='ArrowRight')){ e.preventDefault(); fsStop(); setPos(st.ui.pos+(e.key==='ArrowLeft' ? -2 : 2)); saveSoon(); }
  });
  me.onResize=()=>fsLayout();
  window.addEventListener('resize', me.onResize);
  me.onFull=()=>{
    if(fs!==me) return;
    const fe=document.fullscreenElement||document.webkitFullscreenElement;
    if(fe===el) me.wasFull=true; else if(me.wasFull){ fsClose(); return; }   // 端末の 全画面を 外したら（戻る・Esc）もどる
    setTimeout(fsLayout, 60);
  };
  document.addEventListener('fullscreenchange', me.onFull); document.addEventListener('webkitfullscreenchange', me.onFull);
  try{ const rq=el.requestFullscreen||el.webkitRequestFullscreen; if(rq){ const r=rq.call(el, {navigationUI:'hide'}); if(r && r.catch) r.catch(()=>{}); } }catch(_){}
  try{ el.focus({preventScroll:true}); }catch(_){}
  fsWake();
}
function fsRender(){
  if(!fs) return;
  const p=pOf(cur); if(!p || !p.a || !p.b){ fsClose(); return; }
  const u=st.ui, a=p.a, b=p.b, g=gap(a.d, b.d);
  const lab=(s,k)=>`<span class="mk-lab ${k}">${k==='l' ? '前' : '後'}${s && s.d ? ' '+esc(sd(s.d)) : ''}</span>`;
  const bt=`transform:translate(${p.tf.x}%, ${p.tf.y}%) rotate(${p.tf.r}deg) scale(${p.tf.s})`;
  const frames=u.mode==='side'
    ? `<div class="mk-fsf"><img data-pic="${a.pic}" alt="前の 写真">${lab(a,'l')}</div><div class="mk-fsf"><div class="mk-bw"><img data-pic="${b.pic}" alt="後の 写真" style="${bt}"></div>${lab(b,'r')}</div>`
    : `<div class="mk-fsf" id="mkFsF"><img data-pic="${a.pic}" alt="前の 写真"><div class="mk-bw" id="mkFsBw" style="${u.mode==='slide' ? 'clip-path:inset(0 0 0 '+u.pos+'%)' : 'opacity:'+(u.fade/100)}"><img data-pic="${b.pic}" alt="後の 写真" style="${bt}"></div>
        ${u.mode==='slide' ? `<div class="mk-line" id="mkFsLine" style="left:${u.pos}%"><span class="mk-knob" id="mkFsKnob" role="slider" tabindex="0" aria-label="前と 後の 境目" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${u.pos}">⇔</span></div>` : ''}${lab(a,'l')}${lab(b,'r')}</div>`;
  fs.el.innerHTML=`<div class="mk-fss" id="mkFsS">${frames}</div>
    <div class="mk-fst">${esc(pTitle(p))}${g!=null && g>0 ? '　'+g+'日' : ''}</div>
    ${u.mode==='fade' ? `<label class="mk-fsr"><span>後の 濃さ</span><input type="range" min="0" max="100" value="${u.fade}" aria-label="後の 写真の 濃さ" oninput="MIKURABE.fade(this.value)"></label>` : ''}
    <div class="mk-fsbar" id="mkFsBar"><button type="button" onclick="MIKURABE.fullClose()" aria-label="全画面を 閉じる">✕</button>${FS_MODES.map(([k,n])=>`<button type="button" class="${u.mode===k?'on':''}" aria-pressed="${u.mode===k}" onclick="MIKURABE.fullMode('${k}')">${n}</button>`).join('')}${u.mode==='slide' ? `<button type="button" id="mkFsPlay" onclick="MIKURABE.play()" aria-label="${fs.anim ? '止める' : '境目を 自動で 動かす'}">${fs.anim ? '⏸' : '▶'}</button>` : ''}</div>`;
  fillPics(fs.el); fsLayout();
}
// 写真の 形の まま、画面に 入る いちばん 大きい 大きさに。並べる ときは 左右と 上下の 大きく 見える 方
function fsLayout(){
  if(!fs) return;
  const p=pOf(cur), stg=$('mkFsS'); if(!p || !p.a || !stg) return;
  const W=stg.clientWidth, H=stg.clientHeight, R=p.a.w/p.a.h, G=6, fr=[...stg.querySelectorAll('.mk-fsf')];
  if(!W || !H) return;
  let w;
  if(st.ui.mode==='side'){
    const wRow=Math.min((W-G)/2, H*R), wCol=Math.min(W, (H-G)/2*R), row=wRow>=wCol;
    stg.classList.toggle('col', !row); w=row ? wRow : wCol;
  } else { stg.classList.remove('col'); w=Math.min(W, H*R); }
  fr.forEach(f=>{ f.style.width=Math.floor(w)+'px'; f.style.height=Math.floor(w/R)+'px'; });
}
function fsMode(m){ if(!fs || !FS_MODES.some(x=>x[0]===m)) return; fsStop(); st.ui.mode=m; save(); fsRender(); fsWake(); }
// ▶ 境目を 自動で 行ったり 来たり（5秒で 1往復）。指で さわると 止まる
function fsPlay(on){
  if(!fs) return;
  if(on==null) on=!fs.anim;
  fsStop();
  if(on){
    if(st.ui.mode!=='slide'){ st.ui.mode='slide'; save(); fsRender(); }
    const t0=performance.now(), ph=Math.asin(clamp((st.ui.pos-50)/45, -1, 1)), me=fs;
    const loop=t=>{ if(fs!==me || !me.anim) return; const v=50+45*Math.sin(ph+(t-t0)/5000*2*Math.PI); st.ui.pos=Math.round(v); paintPos(+v.toFixed(2)); me.anim=requestAnimationFrame(loop); };
    me.anim=requestAnimationFrame(loop);
  }
  fsPlayBtn();
}
function fsStop(){ if(!fs || !fs.anim) return; cancelAnimationFrame(fs.anim); fs.anim=0; paintPos(st.ui.pos); saveSoon(); fsPlayBtn(); }
function fsPlayBtn(){ const b=$('mkFsPlay'); if(b && fs){ b.textContent=fs.anim ? '⏸' : '▶'; b.setAttribute('aria-label', fs.anim ? '止める' : '境目を 自動で 動かす'); } }
// 下の ボタンは しばらく さわらないと 薄く する
function fsWake(){
  if(!fs) return; clearTimeout(fs.dimT);
  const b=$('mkFsBar'); if(b) b.classList.remove('dim');
  fs.dimT=setTimeout(()=>{ const x=$('mkFsBar'); if(x) x.classList.add('dim'); }, 3000);
}
function fsClose(fromBack, noRender){
  if(!fs) return; const f=fs; fs=null;
  if(f.anim) cancelAnimationFrame(f.anim);
  clearTimeout(f.dimT);
  window.removeEventListener('resize', f.onResize);
  document.removeEventListener('fullscreenchange', f.onFull); document.removeEventListener('webkitfullscreenchange', f.onFull);
  try{ const fe=document.fullscreenElement||document.webkitFullscreenElement; if(fe===f.el){ const ex=document.exitFullscreen||document.webkitExitFullscreen; if(ex){ const r=ex.call(document); if(r && r.catch) r.catch(()=>{}); } } }catch(_){}
  if(!fromBack && f.rel) f.rel();
  f.el.remove(); save();
  if(!noRender) render();
}

/* ───────── 👻 前に 合わせて 撮る（カメラに 前の 写真を 薄く 重ねる） ───────── */
let cam=null;   // {el, stream, facing, rel}
async function camOpen(){
  const p=pOf(cur); if(!p || !p.a) return;
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toastS('この 端末では 重ねて 撮れません。ふつうに 撮ります'); const i=$('mkIn_bc'); if(i) i.click(); return; }
  camStop();
  const host=document.querySelector('#mikurabeOverlay .mk-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='mk-cam'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','前に 合わせて 撮る');
  const R=(p.a.w/p.a.h).toFixed(4);   // 前の 写真と 同じ 形の 枠に 映す（見比べの 画面と 同じ 切り取り方に なる）
  el.innerHTML=`<div class="mk-camv"><div class="mk-camf" style="width:min(100cqw, calc(100cqh * ${R}));height:min(100cqh, calc(100cqw / ${R}))"><video id="mkVid" playsinline autoplay muted></video><img id="mkGhost" data-pic="${p.a.pic}" alt="" style="opacity:.4"></div></div>
    <div class="mk-camui"><label class="mk-rng"><span>前の 写真</span><input type="range" min="0" max="90" value="40" aria-label="前の 写真の 濃さ" oninput="document.getElementById('mkGhost').style.opacity=this.value/100"></label>
      <div class="mk-cambar"><button type="button" class="mk-b" onclick="MIKURABE.camClose()">✕ やめる</button><button type="button" class="mk-shut" onclick="MIKURABE.camShot()" aria-label="撮る">📸</button><button type="button" class="mk-b" onclick="MIKURABE.camFlip()" aria-label="カメラを 切りかえる">🔄</button></div></div>`;
  host.appendChild(el); fillPics(el);
  const sh=el.querySelector('.mk-shut'); if(sh) sh.focus();
  cam={el, stream:null, facing:'environment', rel:typeof modalBack==='function' ? modalBack(()=>{ camStop(true); }) : ()=>{}};
  await camStart();
}
async function camStart(){
  if(!cam) return;
  try{
    if(cam.stream) cam.stream.getTracks().forEach(t=>t.stop());
    cam.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:cam.facing}, width:{ideal:1920}, height:{ideal:1440}}, audio:false});
    const v=$('mkVid'); if(v){ v.srcObject=cam.stream; try{ await v.play(); }catch(_){} }
  }catch(e){
    camStop(); toastS('カメラを 使えませんでした（許可が ない など）。「📷 撮る」で ふつうに 撮れます', 4200);
  }
}
function camStop(fromBack){
  if(!cam) return;
  const c=cam; cam=null;
  if(c.stream) c.stream.getTracks().forEach(t=>t.stop());
  if(!fromBack && c.rel) c.rel();
  c.el.remove();
}
function camFlip(){ if(!cam) return; cam.facing=cam.facing==='environment' ? 'user' : 'environment'; camStart(); }
async function camShot(){
  const v=$('mkVid'); if(!cam || !v || !v.videoWidth){ toastS('まだ カメラの 用意が できて いません'); return; }
  const s=await storeFrom(v, v.videoWidth, v.videoHeight); s.d=ymd(new Date());
  camStop();
  if(await putSlot('b', s)) toastS('📸 後の 写真を 撮りました');
}

/* ───────── 🖼 並べた 画像 ───────── */
// 1枚の 絵に（W：横幅。dir：h 左右・v 上下）
function drawPair(p, A, B, W, dir){
  const pad=Math.round(W*0.03), tf=W*0.038, pf=W*0.024, hd=Math.round(p.place ? tf*1.25+pf*1.6 : tf*1.4), lb=Math.round(W*0.05), ft=Math.round(W*0.05);
  const ar=A.naturalWidth/A.naturalHeight, cw=dir==='h' ? (W-pad*3)/2 : W-pad*2, ch=cw/ar;
  const H=Math.round(pad+hd+(dir==='h' ? ch+lb : (ch+lb)*2+pad)+ft+pad);
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  g.fillStyle='#ffffff'; g.fillRect(0,0,W,H);
  const F=(sz,b)=>(b ? 'bold ' : '')+Math.round(sz)+'px "Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif';
  g.fillStyle='#111'; g.textBaseline='middle'; g.font=F(tf, true); g.fillText(pTitle(p), pad, pad+tf*0.6, W-pad*2);
  if(p.place){ g.font=F(pf); g.fillStyle='#555'; g.fillText('📍 '+p.place, pad, pad+tf*1.25+pf*0.6, W-pad*2); }
  const cell=(im, x, y, s, k, tf)=>{
    g.save(); g.beginPath(); g.rect(x, y, cw, ch); g.clip();
    const sc=Math.max(cw/im.naturalWidth, ch/im.naturalHeight);   // 枠いっぱいに（はみ出しは 切る）
    g.translate(x+cw/2+(tf ? tf.x/100*cw : 0), y+ch/2+(tf ? tf.y/100*ch : 0)); if(tf){ g.rotate(tf.r*Math.PI/180); g.scale(tf.s, tf.s); }
    g.drawImage(im, -im.naturalWidth*sc/2, -im.naturalHeight*sc/2, im.naturalWidth*sc, im.naturalHeight*sc); g.restore();
    g.strokeStyle='#999'; g.lineWidth=Math.max(1, W/700); g.strokeRect(x, y, cw, ch);
    g.fillStyle=k==='a' ? '#455a64' : '#2e7d32'; g.fillRect(x, y+ch, cw, lb);
    g.fillStyle='#fff'; g.font=F(lb*0.5, true); g.textAlign='center'; g.fillText((k==='a' ? '前' : '後')+(s.d ? '　'+jd(s.d) : ''), x+cw/2, y+ch+lb/2); g.textAlign='left';
  };
  const y0=pad+hd;
  if(dir==='h'){ cell(A, pad, y0, p.a, 'a', null); cell(B, pad*2+cw, y0, p.b, 'b', p.tf); }
  else { cell(A, pad, y0, p.a, 'a', null); cell(B, pad, y0+ch+lb+pad, p.b, 'b', p.tf); }
  const g2=gap(p.a.d, p.b.d), fy=H-pad-ft/2;
  g.fillStyle='#333'; g.font=F(ft*0.42);
  const foot=[g2!=null && g2>0 ? '前から 後まで '+g2+'日' : '', p.memo ? p.memo.split('\n')[0] : ''].filter(Boolean).join('　／　');
  if(foot) g.fillText(foot, pad, fy, W-pad*2);
  return c;
}
async function pairImgs(p){ const [ua, ub]=await Promise.all([picGet(p.a.pic), picGet(p.b.pic)]); if(!okData(ua) || !okData(ub)) return null; const [A, B]=await Promise.all([loadImg(ua), loadImg(ub)]); return {A, B}; }
async function shot(){
  const p=pOf(cur); if(!p || !p.a || !p.b) return;
  const im=await pairImgs(p); if(!im){ toastS('写真を 読めませんでした'); return; }
  const dir=st.ui.mode==='side' ? st.ui.dir : (p.a.w>=p.a.h ? 'v' : 'h');
  const build=w=>drawPair(p, im.A, im.B, Math.max(600, Math.min(2000, w||1400)), dir);
  if(typeof openShotPreview==='function') openShotPreview(build, '見比べ');
}

/* ───────── 🖨 印刷・写真帳 ───────── */
const DOC_CSS=`
#printArea .op-doc .mk-doc{ color:#000; font-size:12px; }
#printArea .op-doc .mk-dp{ margin:0 0 14px; break-inside:avoid; page-break-inside:avoid; }
#printArea .op-doc .mk-dt{ font-size:16px; font-weight:bold; margin:0 0 2px; }
#printArea .op-doc .mk-ds{ font-size:11.5px; color:#333; margin:0 0 6px; }
#printArea .op-doc .mk-dg{ display:grid; gap:8px; } #printArea .op-doc .mk-dg.h{ grid-template-columns:1fr 1fr; } #printArea .op-doc .mk-dg.v{ grid-template-columns:1fr; }
#printArea .op-doc .mk-dg figure{ margin:0; } #printArea .op-doc .mk-dc{ overflow:hidden; border:1px solid #888; }
#printArea .op-doc .mk-dc img{ display:block; width:100%; height:100%; object-fit:cover; }
#printArea .op-doc .mk-dg figcaption{ text-align:center; font-weight:bold; font-size:12px; color:#fff; padding:2px 0; }
#printArea .op-doc .mk-dg .a figcaption{ background:#455a64; } #printArea .op-doc .mk-dg .b figcaption{ background:#2e7d32; }
#printArea .op-doc .mk-dm{ margin:6px 0 0; white-space:pre-wrap; font-size:11.5px; }
#printArea .op-doc .mk-dh{ text-align:center; font-size:19px; font-weight:bold; letter-spacing:.1em; margin:0 0 10px; }
`;
// dir：v 上下（1組だけ・横長の 写真）・h 左右。maxH：上下の ときの 1枚の 高さ（mm）
async function pairBlock(p, dir, maxH){
  const [ua, ub]=await Promise.all([picGet(p.a.pic), picGet(p.b.pic)]);
  if(!okData(ua) || !okData(ub)) return '';
  const ar=p.a.w+' / '+p.a.h, g=gap(p.a.d, p.b.d);
  const box='aspect-ratio:'+ar, fs=dir==='v' ? ' style="width:min(100%, calc('+maxH+'mm * '+(p.a.w/p.a.h).toFixed(4)+'));margin:0 auto"' : '';
  const cap=(k,s)=>(k==='a' ? '前' : '後')+(s.d ? '　'+jd(s.d) : '');
  const t='transform:translate('+p.tf.x+'%, '+p.tf.y+'%) rotate('+p.tf.r+'deg) scale('+p.tf.s+')';
  return `<div class="mk-dp"><div class="mk-dt">${esc(pTitle(p))}</div><div class="mk-ds">${p.place ? '📍 '+esc(p.place)+'　' : ''}${g!=null && g>0 ? '前から 後まで '+g+'日' : ''}</div>
    <div class="mk-dg ${dir}"><figure class="a"${fs}><div class="mk-dc" style="${box}"><img src="${ua}" alt=""></div><figcaption>${esc(cap('a', p.a))}</figcaption></figure>
      <figure class="b"${fs}><div class="mk-dc" style="${box}"><img src="${ub}" alt="" style="${t}"></div><figcaption>${esc(cap('b', p.b))}</figcaption></figure></div>
    ${p.memo ? `<div class="mk-dm">${esc(p.memo)}</div>` : ''}</div>`;
}
async function docHtml(ids, title){
  const L=ids.map(pOf).filter(p=>p && p.a && p.b);
  let h=title ? `<div class="mk-dh">${esc(title)}</div>` : '';
  for(const p of L) h+=await pairBlock(p, L.length>1 || p.a.w<p.a.h ? 'h' : 'v', 112);   // 写真帳は 左右に 並べて 1ページに 2〜3組
  return `<div class="op-doc"><style>${DOC_CSS}</style><div class="mk-doc">${h}</div></div>`;
}
async function printIds(ids, title){
  const html=await docHtml(ids, title);
  if(!/mk-dp/.test(html)){ toastS('前と 後の 写真が そろった 組が ありません'); return null; }
  const built=opBuild(html, true);
  if(typeof opWaitImages==='function') await opWaitImages(built.box);
  opPrint(built); return built;
}
function print(){ const p=pOf(cur); if(!p) return null; save(); return printIds([p.id], ''); }
let bookSel=null;
function book(){
  const L=st.list.slice().sort((a,b)=>b.at-a.at).filter(p=>p.a && p.b);
  if(!L.length){ toastS('前と 後の 写真が そろった 組が ありません'); return; }
  bookSel=new Set(L.map(p=>p.id));
  popOpen(`<div class="mk-ph"><span aria-hidden="true">🖨</span><b>写真帳（まとめて 印刷）</b><button type="button" class="mk-x" onclick="MIKURABE.close()" aria-label="閉じる">✕</button></div>
    <label class="mk-f"><span>題</span><input type="text" id="mkBookT" maxlength="40" value="施工 前後 写真" placeholder="例：○○邸 改修工事 施工前後 写真"></label>
    <div class="mk-bk">${L.map(p=>`<label class="mk-bkr"><input type="checkbox" checked onchange="MIKURABE.bookSel('${p.id}', this.checked)"><img data-pic="${p.a.thumb||p.a.pic}" alt=""><img data-pic="${p.b.thumb||p.b.pic}" alt=""><span>${esc(pTitle(p))}<small>${esc(sd(p.a.d))} → ${esc(sd(p.b.d))}</small></span></label>`).join('')}</div>
    <div class="mk-acts end"><button type="button" class="mk-b" onclick="MIKURABE.close()">やめる</button><button type="button" class="mk-b pri" onclick="MIKURABE.bookGo()">🖨 印刷・PDF</button></div>`);
}
function bookGo(){
  const ids=[...(bookSel||[])], t=oneLine(($('mkBookT')||{}).value, 40);
  if(!ids.length){ toastS('印刷する 組に ✓ を つけて ください'); return; }
  popClose(); return printIds(st.list.filter(p=>ids.includes(p.id)).sort((a,b)=>b.at-a.at).map(p=>p.id), t);
}

/* ───────── 小さな 窓 ───────── */
let pop=null;
function popOpen(html){
  popClose();
  const host=document.querySelector('#mikurabeOverlay .mk-modal'); if(!host) return null;
  const el=document.createElement('div'); el.className='mk-pop-bg';
  el.innerHTML=`<div class="mk-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  const me={el, rel:null}; pop=me;
  me.rel=typeof modalBack==='function' ? modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } }) : ()=>{};
  fillPics(el);
  return el;
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }

/* ───────── 窓 ───────── */
const CSS=`
#mikurabeOverlay .mk-modal{ display:flex; flex-direction:column; }
.mk-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.mk-wrap{ max-width:860px; margin:0 auto; padding-bottom:80px; }
.mk-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.mk-b.sm{ min-height:38px; font-size:13.5px; padding:0 10px; } .mk-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .mk-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.mk-acts{ display:flex; gap:6px; flex-wrap:wrap; margin:8px 0 0; } .mk-acts.top{ margin:0 0 10px; } .mk-acts.end{ justify-content:flex-end; margin-top:14px; } .mk-acts.sm{ margin-top:6px; }
.mk-list{ display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:8px; }
.mk-card{ display:flex; flex-direction:column; gap:6px; padding:8px; border-radius:14px; border:1px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.mk-ths{ display:flex; align-items:center; gap:6px; } .mk-ths img, .mk-noimg{ flex:1; min-width:0; height:110px; object-fit:cover; border-radius:10px; background:rgba(120,132,156,.12); display:flex; align-items:center; justify-content:center; font-size:26px; color:var(--text-light,#888); }
.mk-ths i{ font-style:normal; color:var(--text-light,#888); font-size:14px; }
.mk-ct{ display:flex; flex-direction:column; gap:2px; } .mk-ct b{ font-size:15.5px; overflow-wrap:anywhere; } .mk-ct small{ font-size:12.5px; color:var(--text-light,#666); }
.mk-empty p, .mk-note{ font-size:13.5px; line-height:1.7; color:var(--text-light,#666); margin:6px 0; }
.mk-eh{ display:flex; align-items:center; gap:10px; margin:0 0 10px; } .mk-eh b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.mk-modes{ display:flex; gap:6px; margin:0 0 8px; } .mk-modes button{ flex:1; min-height:42px; border-radius:21px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.mk-modes button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.mk-cmp{ position:relative; width:100%; margin:0 auto; overflow:hidden; border-radius:12px; background:#000; touch-action:none; user-select:none; -webkit-user-select:none; }
.mk-cmp img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; pointer-events:none; -webkit-user-drag:none; }
.mk-bw{ position:absolute; inset:0; overflow:hidden; } .mk-cmp.adj{ cursor:move; } .mk-cmp.adj::after{ content:''; position:absolute; inset:0; border:3px dashed #ffca28; border-radius:12px; pointer-events:none; }
.mk-line{ position:absolute; top:0; bottom:0; width:0; border-left:3px solid #fff; box-shadow:0 0 6px rgba(0,0,0,.6); }
.mk-knob{ position:absolute; top:50%; left:-24px; width:44px; height:44px; margin-top:-22px; border-radius:22px; background:#fff; color:#222; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,.45); cursor:ew-resize; }
.mk-lab{ position:absolute; top:8px; padding:2px 10px; border-radius:12px; font-size:13px; font-weight:bold; color:#fff; pointer-events:none; } .mk-lab.l{ left:8px; background:rgba(55,71,79,.85); } .mk-lab.r{ right:8px; background:rgba(46,125,50,.9); }
.mk-side{ display:grid; gap:6px; } .mk-side.h{ grid-template-columns:1fr 1fr; } .mk-side.v{ grid-template-columns:1fr; }
.mk-side figure{ position:relative; margin:0; border-radius:10px; overflow:hidden; background:#000; } .mk-side figure > img{ display:block; width:100%; } .mk-side .mk-clip{ overflow:hidden; } .mk-side .mk-clip img{ display:block; width:100%; height:100%; object-fit:cover; }
.mk-ctl{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:8px 0 0; } .mk-hint{ flex:1; font-size:12.5px; color:var(--text-light,#666); }
.mk-seg{ display:flex; flex:1; } .mk-seg button{ flex:1; min-height:40px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; } .mk-seg button:first-child{ border-radius:20px 0 0 20px; } .mk-seg button:last-child{ border-radius:0 20px 20px 0; border-left:0; } .mk-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.mk-rng{ display:flex; align-items:center; gap:8px; flex:1; font-size:13px; } .mk-rng span{ white-space:nowrap; font-weight:bold; color:var(--text-light,#666); } .mk-rng input{ flex:1; min-width:120px; }
.mk-adj{ margin:8px 0 0; padding:8px 10px; border-radius:12px; background:rgba(255,202,40,.14); } .mk-adj p{ margin:0 0 6px; font-size:13px; }
.mk-gap{ margin:6px 0 0; font-size:13.5px; color:var(--text-light,#666); }
.mk-slots{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0; }
.mk-slot{ padding:8px; border-radius:12px; border:1px solid rgba(120,132,156,.35); background:var(--modal-bg,#fff); }
.mk-sh{ display:flex; align-items:center; gap:6px; margin:0 0 6px; } .mk-sh b{ font-size:16px; } .mk-sh input{ flex:1; min-width:0; min-height:36px; padding:0 6px; border-radius:8px; border:1px solid rgba(120,132,156,.5); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:14px; }
.mk-stw{ position:relative; } .mk-st{ display:block; width:100%; height:140px; object-fit:cover; border-radius:8px; }
.mk-rm{ position:absolute; top:6px; right:6px; width:36px; height:36px; border-radius:18px; border:0; background:rgba(0,0,0,.55); color:#fff; font-size:16px; cursor:pointer; } .mk-st.none{ display:flex; align-items:center; justify-content:center; background:rgba(120,132,156,.1); font-size:13px; color:var(--text-light,#666); }
.mk-sec{ padding:8px 10px; border-radius:12px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); }
.mk-f{ display:flex; align-items:center; gap:8px; margin:6px 0; } .mk-f.top{ align-items:flex-start; } .mk-f > span{ min-width:3.2em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.mk-f input, .mk-f textarea{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; } .mk-f textarea{ padding:8px 10px; resize:vertical; }
.mk-out{ display:flex; gap:6px; flex-wrap:wrap; margin:12px 0 0; }
.mk-fsb{ position:absolute; right:8px; bottom:8px; width:44px; height:44px; border-radius:22px; border:0; background:rgba(0,0,0,.55); color:#fff; font-size:22px; line-height:1; cursor:pointer; z-index:2; }
.mk-fs{ position:absolute; inset:0; z-index:40; background:#000; color:#fff; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; outline:none; }
.mk-fs:fullscreen{ width:100%; height:100%; }
.mk-fss{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; gap:6px; }
.mk-fss.col{ flex-direction:column; }
.mk-fsf{ position:relative; flex:none; overflow:hidden; background:#111; }
.mk-fsf img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; pointer-events:none; -webkit-user-drag:none; }
.mk-fst{ position:absolute; top:calc(10px + env(safe-area-inset-top, 0px)); left:0; right:0; margin:0 auto; width:max-content; max-width:60%; padding:4px 12px; border-radius:14px; background:rgba(0,0,0,.5); font-size:14px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none; }
.mk-fsbar{ position:absolute; left:0; right:0; margin:0 auto; width:max-content; bottom:calc(12px + env(safe-area-inset-bottom, 0px)); display:flex; flex-wrap:wrap; justify-content:center; gap:6px; padding:6px; border-radius:30px; background:rgba(0,0,0,.6); transition:opacity .4s; max-width:calc(100% - 16px); box-sizing:border-box; }
.mk-fsbar.dim{ opacity:.3; }
.mk-fsbar button{ min-width:46px; height:46px; padding:0 12px; border-radius:23px; border:1px solid rgba(255,255,255,.45); background:rgba(255,255,255,.12); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.mk-fsbar button.on{ background:#fff; color:#111; border-color:#fff; }
.mk-fsr{ position:absolute; left:50%; transform:translateX(-50%); bottom:calc(76px + env(safe-area-inset-bottom, 0px)); width:min(86%, 440px); display:flex; align-items:center; gap:10px; padding:8px 14px; border-radius:22px; background:rgba(0,0,0,.6); font-size:13px; font-weight:bold; box-sizing:border-box; }
.mk-fsr input{ flex:1; min-width:0; }
.mk-cam{ position:absolute; inset:0; z-index:30; background:#000; display:flex; flex-direction:column; }
.mk-camv{ position:relative; flex:1; min-height:0; container-type:size; display:flex; align-items:center; justify-content:center; }
.mk-camf{ position:relative; overflow:hidden; width:100%; height:100%; } .mk-camf video, .mk-camf img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; } .mk-camf img{ pointer-events:none; }
.mk-camui{ padding:8px 12px calc(12px + var(--safe-bottom,0px)); color:#fff; } .mk-camui .mk-rng span{ color:#ddd; }
.mk-cambar{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin:8px 0 0; } .mk-cambar .mk-b{ background:rgba(255,255,255,.12); color:#fff; border-color:rgba(255,255,255,.5); }
.mk-shut{ width:76px; height:76px; border-radius:38px; border:5px solid #fff; background:rgba(255,255,255,.25); font-size:30px; cursor:pointer; }
.mk-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.mk-pop{ width:100%; max-width:640px; max-height:90%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.mk-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .mk-ph > span{ font-size:26px; line-height:1; } .mk-ph b{ flex:1; font-size:17px; }
.mk-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.mk-bk{ display:flex; flex-direction:column; gap:6px; margin:8px 0; } .mk-bkr{ display:flex; align-items:center; gap:8px; padding:4px; border-radius:10px; border:1px solid rgba(120,132,156,.3); }
.mk-bkr input{ width:22px; height:22px; flex:none; } .mk-bkr img{ width:54px; height:42px; object-fit:cover; border-radius:6px; flex:none; } .mk-bkr span{ display:flex; flex-direction:column; font-size:14px; min-width:0; } .mk-bkr small{ font-size:12px; color:var(--text-light,#666); }
@media (max-width:520px){ .mk-list{ grid-template-columns:1fr; } .mk-slots{ grid-template-columns:1fr 1fr; gap:6px; } .mk-st{ height:110px; } }
`;
function ensureDom(){
  if($('mikurabeOverlay')) return;
  const s=document.createElement('style'); s.id='mkStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="mikurabeOverlay">
  <div class="modal vol-modal mk-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📸 見比べ</span><button class="modal-close" onclick="closeMikurabe()" aria-label="閉じる">✕</button></div>
    <div class="mk-body" id="mkBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('mikurabeOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('keydown', e=>{   // Esc：全画面 → カメラ → 小さな 窓 → 組の 画面（一覧へ）の 順に 閉じる
    if(e.key!=='Escape' || !isDlgOpen('mikurabeOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    if(fs){ e.preventDefault(); e.stopImmediatePropagation(); fsClose(); return; }
    if(cam){ e.preventDefault(); e.stopImmediatePropagation(); camStop(); return; }
    if(pop){ e.preventDefault(); e.stopImmediatePropagation(); popClose(); return; }
    if(cur){ e.preventDefault(); e.stopImmediatePropagation(); back(); }
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ fsClose(false, true); camStop(); popClose(); adjOff(); save(); cur=null; }
function openMikurabe(){ ensureDom(); load(); cur=null; adj=false; adjPrev=''; openDlg('mikurabeOverlay', cleanup); render(); gc(); }
function closeMikurabe(){ if(!$('mikurabeOverlay') || !isDlgOpen('mikurabeOverlay')) return; closeDlg('mikurabeOverlay', cleanup); }

window.MIKURABE={ add, open:openP, back, set:setF, pick, unset, date, swap, del, mode:setMode, dir:setDir, fade:setFade, adjust, tf:setTf, tfReset, cam:camOpen, camClose:()=>camStop(), camShot, camFlip,
  full:fsOpen, fullClose:()=>fsClose(), fullMode:fsMode, play:fsPlay, fsOn:()=>!!fs, playing:()=>!!(fs && fs.anim),
  shot, print, book, bookSel:(id,on)=>{ if(!bookSel) return; if(on) bookSel.add(id); else bookSel.delete(id); }, bookGo, close:popClose,
  // ためす とき 用
  state:()=>JSON.parse(JSON.stringify(st)), cur:()=>cur, pos:v=>{ if(v!=null){ setPos(v); saveSoon(); } return st.ui.pos; }, adj:()=>adj, camOn:()=>!!cam,
  putData:async(k, data, d)=>{ const s=await slotFromData(data, d); return s ? putSlot(k, s) : false; },
  pairCanvas:async(dir, w)=>{ const p=pOf(cur); if(!p || !p.a || !p.b) return null; const im=await pairImgs(p); if(!im) return null; const c=drawPair(p, im.A, im.B, w||1000, dir||'h'); return {w:c.width, h:c.height, url:c.toDataURL('image/jpeg', 0.6)}; },
  doc:ids=>docHtml(ids||[cur], ''), gc, picIds:()=>new Promise(r=>{ db().then(d=>{ const q=d.transaction('pics').objectStore('pics').getAllKeys(); q.onsuccess=()=>r(q.result||[]); q.onerror=()=>r([]); }).catch(()=>r([])); }) };
Object.assign(window, { openMikurabe, closeMikurabe });
})();
