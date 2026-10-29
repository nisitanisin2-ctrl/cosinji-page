/* 📖 読みものの しおり・最近 見た・読み上げ（v601。📜 マナー帳・📒 会計の手引き・🧭 くらしの便利帳 と いっしょに 読む）
   ・🔖 つづきから：さいごに 読んで いた ページと 位置（どこまで 読んだか）を 覚えて、一覧の 上に 出す。
   ・🕘 最近 見た：開いた ページ（新しい 順に 12まで）。
   ・🔈 読み上げ：ページの 文を 上から 1まとまりずつ 読む（読んで いる ところに 色を つけ、画面も ついて いく）。
     もう一度 押すと 止める。声は 表電卓の「🔈 読み上げの声」（hyovoice.js）。
   ・覚える ものは excalc_yomi（道具ごと。{manner:{recent:[{id,t,at}], last:{id,t,top,at}}, …}）。 */
(function(){
'use strict';
const KEY='excalc_yomi', MAX_RECENT=12;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const okId=x=>typeof x==='string' && /^[\w-]{1,40}$/.test(x);
const okTool=x=>/^[a-z]{2,12}$/.test(x);
const toastY=m=>{ if(typeof toast==='function') toast(m, 2600); };
let D=null, sT=0;
function load(){
  if(D) return D;
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  D={};
  if(o && typeof o==='object') for(const k of Object.keys(o)) if(okTool(k) && o[k] && typeof o[k]==='object'){
    const t=o[k];
    D[k]={recent:(Array.isArray(t.recent) ? t.recent : []).filter(x=>x && okId(x.id)).slice(0,MAX_RECENT).map(x=>({id:x.id, t:String(x.t||'').slice(0,60), at:+x.at||0})),
      last:t.last && okId(t.last.id) ? {id:t.last.id, t:String(t.last.t||'').slice(0,60), top:Math.max(0, Math.round(+t.last.top)||0), at:+t.last.at||0} : null};
  }
  return D;
}
function save(){ clearTimeout(sT); try{ localStorage.setItem(KEY, JSON.stringify(D)); }catch(_){} }
function T(tool){ load(); if(!D[tool]) D[tool]={recent:[], last:null}; return D[tool]; }
// ページを 開いた（同じ ページなら 読んだ 位置は そのまま）
function visit(tool, id, title){
  if(!okTool(tool) || !okId(id)) return;
  const t=T(tool), now=Date.now(); title=String(title||'').slice(0,60);
  t.recent=[{id, t:title, at:now}].concat(t.recent.filter(x=>x.id!==id)).slice(0, MAX_RECENT);
  t.last={id, t:title, top:t.last && t.last.id===id ? t.last.top : 0, at:now};
  save();
}
function scroll(tool, id, top){ const t=T(tool); if(!t.last || t.last.id!==id) return; t.last.top=Math.max(0, Math.round(top||0)); clearTimeout(sT); sT=setTimeout(save, 400); }
function last(tool){ const t=T(tool); return t.last ? {...t.last} : null; }
function recent(tool){ return T(tool).recent.map(x=>({...x})); }
// 本文の 位置を 見張る
function watch(el, tool, getId){
  if(!el || el.dataset.yomi) return; el.dataset.yomi='1';
  el.addEventListener('scroll', ()=>{ const id=getId(); if(id) scroll(tool, id, el.scrollTop); }, {passive:true});
}
// 一覧の 上：🔖 つづきから・🕘 最近 見た（pages：[{id,t}]・fn：開く 関数の 名前・body：本文の 欄の id）
function topHtml(tool, pages, fn, body){
  const name=id=>{ const p=pages.find(x=>x.id===id); return p ? String(p.t).replace(/^🧮\s*/,'') : ''; };
  const L=last(tool), hasL=L && name(L.id), R=recent(tool).filter(x=>name(x.id) && !(hasL && x.id===L.id)).slice(0,8);
  if(!hasL && !R.length) return '';
  return `<div class="yomi-top">${hasL ? `<button type="button" class="yomi-cont" onclick="YOMIMONO.resume('${tool}','${fn}','${body}')"><span>🔖 つづきから</span><b>${esc(name(L.id))}</b>${L.top>40 ? '<small>前に 読んで いた ところから</small>' : ''}</button>` : ''}
    ${R.length ? `<div class="yomi-rec"><span>🕘 最近 見た</span>${R.map(x=>`<button type="button" onclick="${fn}('${x.id}')">${esc(name(x.id))}</button>`).join('')}</div>` : ''}</div>`;
}
function resume(tool, fn, body){
  const L=last(tool); if(!L || typeof window[fn]!=='function') return;
  window[fn](L.id);
  const go=()=>{ const el=document.getElementById(body); if(el) el.scrollTop=L.top; T(tool).last.top=L.top; save(); };
  requestAnimationFrame(()=>requestAnimationFrame(go));
}

/* ───────── 🔈 読み上げ ───────── */
const BLK='h1,h2,h3,h4,h5,p,li,tr,caption,dt,dd,blockquote,pre,.mn-ex-b,.kr-ex-b,.bk-ex-b,.mn-note,.kr-note,.bk-note';
const SKIP='button,input,select,textarea,.pg-nav,.mn-acts,.kr-acts,.bk-acts,.mn-form,.kr-form,.bk-form,script,style,[hidden],[aria-hidden="true"]';
let R=null, seq=0;
const say=e=>{ const c=e.cloneNode(true); c.querySelectorAll('button,input,select,textarea,script,style').forEach(x=>x.remove());
  if(e.tagName==='TR') return [...c.children].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(Boolean).join('、');
  return c.textContent.replace(/\s+/g,' ').trim(); };
// 読む まとまり（いちばん 外側の かたまり。長い ものは 「。」で 分ける）
function blocks(root){
  const out=[];
  [...root.querySelectorAll(BLK)].filter(e=>!e.closest(SKIP) && !(e.parentElement && e.parentElement.closest(BLK))).forEach(el=>{
    const t=say(el); if(!t) return;
    if(t.length<=220){ out.push({el, t}); return; }
    let buf=''; (t.match(/[^。！？!?]+[。！？!?]*/g)||[t]).forEach(s=>{ if((buf+s).length>220 && buf){ out.push({el, t:buf}); buf=''; } buf+=s; }); if(buf) out.push({el, t:buf});   // 古い iPhone でも 動く 書き方（後読みを 使わない）
  });
  return out;
}
function btnUi(b, on){ if(b && b.isConnected) b.textContent=on ? '⏹ 止める' : '🔈 読み上げ'; if(b) b.classList.toggle('yomi-on', !!on); }
function mark(el){ document.querySelectorAll('.yomi-now').forEach(x=>x.classList.remove('yomi-now')); if(el){ el.classList.add('yomi-now'); try{ el.scrollIntoView({block:'center', behavior:'smooth'}); }catch(_){} } }
function speak(t, done){
  let fin=false; const end=()=>{ if(fin) return; fin=true; clearTimeout(to); done(); };
  const to=setTimeout(end, Math.max(4000, t.length*300));   // 終わりの 知らせが 来ない 端末の ため
  try{
    if(window.HyoVoice && HyoVoice.available) HyoVoice.speak(t, {lang:'ja', onend:end});
    else if(window.speechSynthesis && window.SpeechSynthesisUtterance){ const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; u.onend=end; u.onerror=end; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    else { clearTimeout(to); toastY('この 端末では 読み上げが 使えません'); stop(); }
  }catch(_){ end(); }
}
function next(){
  if(!R) return;
  const my=R.my;
  if(R.i>=R.list.length || !R.list[R.i].el.isConnected){ stop(); return; }
  const b=R.list[R.i]; mark(b.el); R.said.push(b.t); if(R.said.length>50) R.said.shift();
  speak(b.t, ()=>{ if(!R || R.my!==my) return; R.i++; next(); });
}
// 押すと 読む・もう一度 押すと 止める（btn：押した ボタン・body：本文の 欄の id）
function read(btn, body){
  if(R){ const same=R.btn===btn; stop(); if(same) return; }
  const root=document.getElementById(body); if(!root) return;
  const list=blocks(root); if(!list.length){ toastY('読み上げる 文が ありません'); return; }
  R={btn, root, list, i:0, my:++seq, said:[]}; lastSaid=R.said;
  btnUi(btn, true); next();
}
let lastSaid=[];
function stop(){
  if(!R) return;
  const r=R; R=null; seq++;
  try{ if(window.HyoVoice && HyoVoice.cancel) HyoVoice.cancel(); else if(window.speechSynthesis) speechSynthesis.cancel(); }catch(_){}
  btnUi(r.btn, false); mark(null);
}

const CSS=`
.yomi-top{ margin:0 0 10px; display:flex; flex-direction:column; gap:8px; }
.yomi-cont{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; width:100%; padding:10px 14px; border-radius:14px; border:2px solid #f0b400; background:#fff8e1; color:#3e2c00; text-align:left; cursor:pointer; font:inherit; }
.yomi-cont span{ font-size:12.5px; font-weight:bold; color:#8a6400; } .yomi-cont b{ font-size:16px; } .yomi-cont small{ font-size:12px; color:#6d5a2a; }
.yomi-rec{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; } .yomi-rec > span{ font-size:12.5px; font-weight:bold; color:var(--text-light,#666); margin-right:2px; }
.yomi-rec button{ max-width:100%; min-height:36px; padding:0 12px; border-radius:18px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
body.dark .yomi-cont{ background:#3e3420; color:#ffe7b0; border-color:#c99400; } body.dark .yomi-cont span, body.dark .yomi-cont small{ color:#ffd773; }
.yomi-now{ background:rgba(255,213,79,.42) !important; border-radius:4px; box-shadow:0 0 0 3px rgba(255,213,79,.42); }
tr.yomi-now > td, tr.yomi-now > th{ background:rgba(255,213,79,.42) !important; }
button.yomi-on{ background:#c62828 !important; border-color:#c62828 !important; color:#fff !important; }
`;
if(!document.getElementById('yomiStyle')){ const s=document.createElement('style'); s.id='yomiStyle'; s.textContent=CSS; document.head.appendChild(s); }

window.YOMIMONO={ visit, scroll, last, recent, watch, topHtml, resume, read, stop, reading:()=>!!R, said:()=>lastSaid.slice(), blocks:id=>{ const r=document.getElementById(id); return r ? blocks(r).map(b=>b.t) : []; } };
})();
