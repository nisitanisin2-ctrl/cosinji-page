/* 💼 名刺管理（v484。表電卓の道具。はじめて開いたときに読む）
   もらった名刺を入れて、あとで名前・会社・ふりがなでさがす。
   ・名刺の表・裏を写真で残す（端末の IndexedDB excalc_meishi に、長い辺 1400px の JPEG で）。
   ・名刺の文字を貼ると、名前・会社・役職・電話・メール・住所などの欄に分ける（mcParse）。
     iPhone は写真の「テキスト認識表示」、Android は Google レンズで文字をコピーして貼る。
   ・📞電話・✉メール・🌐サイト・📍地図をワンタッチ。📇スマホの連絡先に入れる（vCard）。
   ・新しい順／名前順（ふりがな）／会社ごと、★、分類（タグ）で絞る。会った日・会った所・メモ。
   ・CSV（Excel）・vCard の書き出し／読み込み（Eight などの CSV も見出しで読む）・印刷・書き出し（写真ごと）。
   ・入れたものは端末の中（excalc_meishi）だけ。📋リストのバックアップにも入る（写真は聞いてから）。 */
(function(){
const MC_KEY='excalc_meishi';
let mc=null, mcQ='', mcTag='', mcEdId=null, mcEdPic={f:undefined, b:undefined}, mcPicSide='f', mcViewId=null, mcViewBack=false;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const fmtDay=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); if(!m) return ''; const y=+m[1]; return (y===new Date().getFullYear()?'':y+'年')+(+m[2])+'月'+(+m[3])+'日'; };
const FIELDS=['name','kana','company','dept','title','tel','mobile','fax','email','url','zip','addr','note','met','metAt'];
const LIMIT={name:60,kana:60,company:80,dept:80,title:60,tel:30,mobile:30,fax:30,email:120,url:200,zip:10,addr:200,note:1000,met:10,metAt:80};

/* ── さがすための読みそろえ（カタカナ→ひらがな・全角→半角・大文字→小文字・空白や記号をとる） ── */
function mcNorm(s){
  return String(s||'').normalize('NFKC').toLowerCase()
    .replace(/株式会社|有限会社|合同会社|\(株\)|\(有\)|㈱|㈲/g,'')
    .replace(/[ァ-ヶ]/g, c=>String.fromCharCode(c.charCodeAt(0)-0x60))
    .replace(/[\s・、。,.\-ー~〜「」『』()（）]/g,'');
}
/* 並べるときの読み（ふりがながなければ名前） */
const mcSortKey=x=>String(x.kana||x.name||'').normalize('NFKC').replace(/[ァ-ヶ]/g, c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/\s/g,'');
const mcCoKey=x=>String(x.company||'').normalize('NFKC').replace(/株式会社|有限会社|合同会社|\(株\)|\(有\)|㈱|㈲/g,'').replace(/\s+/g,' ').trim();

/* ── 保存 ── */
function mcCleanItem(x){
  const o={ id:typeof x.id==='string'&&x.id?x.id.slice(0,40):uid() };
  for(const f of FIELDS) o[f]=String(x[f]==null?'':x[f]).trim().slice(0,LIMIT[f]);
  if(!/^\d{4}-\d\d-\d\d$/.test(o.met)) o.met='';
  o.tags=Array.isArray(x.tags)?[...new Set(x.tags.map(t=>String(t).trim().slice(0,20)).filter(Boolean))].slice(0,10):[];
  o.fav=!!x.fav; o.front=!!x.front; o.back=!!x.back;
  o.added=/^\d{4}-\d\d-\d\d$/.test(x.added||'')?x.added:today();
  o.updated=/^\d{4}-\d\d-\d\d$/.test(x.updated||'')?x.updated:o.added;
  o.ts=+x.ts||0;
  return o;
}
function mcClean(o){
  if(!o || typeof o!=='object' || !Array.isArray(o.items)) return { v:1, view:'new', items:[] };
  return { v:1, view:['new','name','company'].includes(o.view)?o.view:'new',
    items:o.items.filter(x=>x && typeof x==='object' && (String(x.name||'').trim() || String(x.company||'').trim())).slice(0,5000).map(mcCleanItem) };
}
function mcLoad(){ try{ mc=mcClean(JSON.parse(localStorage.getItem(MC_KEY)||'null')); }catch(_){ mc=mcClean(null); } }
function mcSave(){ try{ localStorage.setItem(MC_KEY, JSON.stringify(mc)); return true; }catch(_){ toast('端末の空きが足りず、保存できませんでした'); return false; } }
const mcLabel=x=>x.name||x.company||'（名前なし）';

/* ── 写真（IndexedDB。キーは「id_f」（表）・「id_b」（裏）） ── */
let mcDbP=null;
function mcDb(){
  if(mcDbP) return mcDbP;
  mcDbP=new Promise((res,rej)=>{ try{
    const r=indexedDB.open('excalc_meishi',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('pics');
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  }catch(e){ rej(e); } }).catch(e=>{ mcDbP=null; throw e; });
  return mcDbP;
}
async function mcPicGet(k){ try{ const db=await mcDb(); return await new Promise(r=>{ const q=db.transaction('pics').objectStore('pics').get(k); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); }catch(_){ return null; } }
async function mcPicPut(k,data){ const db=await mcDb(); return new Promise((res,rej)=>{ const t=db.transaction('pics','readwrite'); t.objectStore('pics').put(data,k); t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error); }); }
async function mcPicDel(k){ try{ const db=await mcDb(); await new Promise(r=>{ const t=db.transaction('pics','readwrite'); t.objectStore('pics').delete(k); t.oncomplete=r; t.onerror=r; }); }catch(_){} }
const mcPics={};   // 'id_f' → dataURL（一度読んだものは覚えておく）
async function mcPic(id, side){ const k=id+'_'+side; if(mcPics[k]===undefined) mcPics[k]=await mcPicGet(k); return mcPics[k]; }
function mcResize(file, max){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{ const k=Math.min(1, max/Math.max(im.naturalWidth, im.naturalHeight)); const cv=document.createElement('canvas');
      cv.width=Math.round(im.naturalWidth*k); cv.height=Math.round(im.naturalHeight*k); cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg',0.75)); };
    im.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('img')); };
    im.src=url;
  });
}

/* ── 名刺の文字を欄に分ける ──
   スマホで名刺の写真から文字をコピーしたもの（1行に1つずつのことが多い）を貼ると、
   メール・URL・電話（TEL/FAX/携帯）・郵便番号・住所・会社・部署・役職・ふりがな・名前に分ける。 */
const MC_CO_RE=/(株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|社会福祉法人|医療法人|学校法人|NPO法人|特定非営利活動法人|\(株\)|（株）|㈱|\(有\)|（有）|㈲|Co\.,?\s*Ltd|Inc\.?|Corporation|Corp\.|K\.K\.|商店|商会|工業|建設|工務店|製作所|事務所|研究所|病院|医院|クリニック|銀行|信用金庫|農協|組合|協会|市役所|町役場|村役場|県庁)/i;
const MC_TITLE_RE=/(代表取締役(?:社長|会長)?|取締役(?:社長|会長|副社長|専務|常務)?|社長|会長|副社長|専務|常務|執行役員|監査役|理事長|理事|部長|副部長|次長|課長|課長代理|係長|主任|主査|主幹|室長|所長|支店長|店長|工場長|課員|担当|マネージャー|マネジャー|リーダー|チーフ|ディレクター|プロデューサー|エンジニア|コンサルタント|営業|院長|教授|准教授|講師|税理士|弁護士|司法書士|行政書士|社会保険労務士|一級建築士|技術士|代表|オーナー|CEO|CTO|CFO|COO|Manager|Director|President)/i;
const MC_TITLE_END_RE=new RegExp('(?:'+MC_TITLE_RE.source+')$','i');
const MC_DEPT_RE=/(本部|部|課|室|グループ|チーム|センター|支店|営業所|事業所|出張所|工場|係|局|Division|Dept\.?|Department|Section)$/i;
const MC_PREF=/(北海道|東京都|京都府|大阪府|[^\s]{2,3}県)/;
function mcHalf(s){ return String(s||'').normalize('NFKC'); }
function mcPhone(s){ return mcHalf(s).replace(/[^\d+\-()]/g,'').replace(/^\((\d+)\)/,'$1-').replace(/\(/g,'').replace(/\)/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''); }
function mcIsKana(s){ return /^[ぁ-ゖァ-ヺー・\s　]+$/.test(s) && /[ぁ-ゖァ-ヺ]/.test(s); }
function mcIsLatinName(s){ return /^[A-Za-z][A-Za-z.\-']*(?:\s+[A-Za-z][A-Za-z.\-']*){1,3}$/.test(s.trim()); }
function mcParse(text){
  const out={}; FIELDS.forEach(f=>out[f]='');
  let lines=String(text||'').replace(/\r/g,'').split(/\n|\s{3,}/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
  const rest=[];
  for(let raw of lines){
    let l=raw;
    const h=mcHalf(l);
    // メール
    const em=/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/.exec(h);
    if(em && !out.email){ out.email=em[0]; l=mcHalf(l).replace(em[0],'').replace(/^(?:e-?mail|mail|メール)\s*[:：]?\s*/i,'').trim(); if(!l) continue; }
    // URL
    const ur=/(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.(?:com|co\.jp|jp|net|org|or\.jp|ne\.jp|ac\.jp|go\.jp|lg\.jp|info|biz|io)(?:\/[^\s]*)?/i.exec(mcHalf(l));
    if(ur && !out.url && !/@/.test(mcHalf(l))){ out.url=ur[0]; l=mcHalf(l).replace(ur[0],'').replace(/^(?:url|web|ホームページ|hp)\s*[:：]?\s*/i,'').trim(); if(!l) continue; }
    // 電話（1行に TEL と FAX が並ぶこともある）
    const hl=mcHalf(l);
    const telRe=/(TEL|Tel|tel|電話|Phone|PHONE|ＴＥＬ|FAX|Fax|fax|ファックス|ファクス|携帯|Mobile|MOBILE|Mob|Cell|直通|代表|T|F|M)?\s*[.:：]?\s*(\+?81[\s\-]?\(?0?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{3,4}|\(?0\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{3,4})/g;
    let tm, found=false, leftover=hl;
    while((tm=telRe.exec(hl))){
      const lab=(tm[1]||'').toLowerCase(), num=mcPhone(tm[2]);
      if(num.replace(/\D/g,'').length<9) continue;
      found=true; leftover=leftover.replace(tm[0],' ');
      const isFax=/fax|ファ|^f$/.test(lab), isMob=/携帯|mob|cell|^m$/.test(lab) || /^(?:\+?81-?)?0?[789]0/.test(num.replace(/^0/,'0'));
      if(isFax){ if(!out.fax) out.fax=num; }
      else if(isMob && /^(?:\+?81-?)?0?[789]0/.test(num)){ if(!out.mobile) out.mobile=num; else if(!out.tel) out.tel=num; }
      else if(!out.tel) out.tel=num; else if(!out.mobile && /^0[789]0/.test(num)) out.mobile=num; else if(!out.fax) out.fax=num;
    }
    if(found){ l=leftover.replace(/\s+/g,' ').trim(); if(!l || /^[\s/|・,、]*$/.test(l)) continue; }
    // 郵便番号・住所
    const zp=/(?:〒|郵便番号\s*)?\s*(\d{3})\s*[-－ー‐]\s*(\d{4})/.exec(mcHalf(l));
    if(zp && !out.zip){ out.zip=zp[1]+'-'+zp[2]; l=mcHalf(l).replace(zp[0],'').replace(/^〒/,'').trim(); if(!l) continue; }
    if(MC_PREF.test(l) && /[市区町村郡]|丁目|番地|\d+-\d+/.test(l) && !out.addr){ out.addr=l.replace(/^(?:住所|所在地)\s*[:：]?\s*/,''); continue; }
    if(out.addr && !out.addr.endsWith(' ') && /^(?:[^\s]*ビル|[^\s]*(?:階|F)$|\d+F$)/.test(l) && rest.indexOf(raw)<0 && !MC_CO_RE.test(l)){ out.addr+=' '+l; continue; }
    rest.push(l);
  }
  // 会社・部署・役職・ふりがな・名前
  const rest2=[];
  for(let l of rest){
    if(!out.company && MC_CO_RE.test(l) && !MC_TITLE_RE.test(l.replace(MC_CO_RE,''))){ out.company=l; continue; }
    if(!out.company && MC_CO_RE.test(l)){
      // 「株式会社〇〇 営業部 部長」のように1行に並んでいる
      const parts=l.split(/\s+/); const ci=parts.findIndex(p=>MC_CO_RE.test(p));
      if(ci>=0){ out.company=parts.slice(0,ci+1).join(' '); const r=parts.slice(ci+1).join(' '); if(r) rest2.push(r); continue; }
    }
    rest2.push(l);
  }
  const rest3=[];
  for(let l of rest2){
    // 「営業部 部長」「営業部部長」→ 部署と役職（役職は行の終わりにあるものを取る）
    const tm=MC_TITLE_END_RE.exec(l);
    if(tm && l.length<=40 && /^[A-Za-z][A-Za-z .&\-]*$/.test(l)){ if(!out.title){ out.title=l; continue; } }   // 英語の役職（Sales Manager）はまるごと
    if(tm && l.length<=40){
      const before=l.slice(0,tm.index).trim(), after=l.slice(tm.index).trim();
      if(!out.title){ out.title=after; }
      if(before){ if(!out.dept) out.dept=before; else rest3.push(before); }
      continue;
    }
    if(!out.dept && MC_DEPT_RE.test(l) && l.length<=40 && !/\s{1}\S+\s/.test(l)){ out.dept=l; continue; }
    rest3.push(l);
  }
  // ふりがな（かなだけの行）と名前（短い行）
  const rest4=[];
  for(let l of rest3){
    const nk0=/^(.+?)\s*[（(]([ぁ-ゖァ-ヺー\s　]+)[)）]$/.exec(l);   // 「鈴木 花子（すずき はなこ）」
    if(nk0 && !out.name){ out.name=nk0[1].replace(/　/g,' ').trim(); if(!out.kana) out.kana=nk0[2].replace(/　/g,' ').trim(); continue; }
    if(!out.kana && mcIsKana(l) && l.replace(/\s/g,'').length<=16){ out.kana=l.replace(/　/g,' '); continue; }
    rest4.push(l);
  }
  const isNameish=l=>{ const s=l.replace(/\s/g,''); return s.length>=2 && s.length<=10 && /^[\u3400-\u9fff々〆ヵヶぁ-ゖァ-ヺー]+$/.test(s); };
  let ni=out.name ? -2 : rest4.findIndex(l=>/\s/.test(l.trim()) && isNameish(l));   // 「山田 太郎」のように空白で分かれているもの
  if(ni===-1) ni=rest4.findIndex(isNameish);
  if(ni===-1) ni=rest4.findIndex(mcIsLatinName);
  if(ni>=0){ out.name=rest4[ni].replace(/　/g,' '); rest4.splice(ni,1); }
  if(!out.company){ const ci=rest4.findIndex(l=>/[A-Za-z]{3,}|[\u3400-\u9fff]{2,}/.test(l) && l.length<=40); if(ci>=0 && rest4.length>1){ out.company=rest4[ci]; rest4.splice(ci,1); } }
  if(rest4.length) out.note=rest4.join('\n');
  // ふりがなを「名前（ふりがな）」の形から拾う
  const nk=/^(.+?)[（(]([ぁ-ゖァ-ヺー\s　]+)[)）]$/.exec(out.name);
  if(nk){ out.name=nk[1].trim(); if(!out.kana) out.kana=nk[2].trim(); }
  for(const f of FIELDS) out[f]=String(out[f]||'').slice(0,LIMIT[f]);
  return out;
}

/* ── さがす（名前・ふりがな・会社・部署・役職・メモ・電話・メール・分類・会った所） ── */
function mcSearch(q, list){
  const n=mcNorm(q); list=list||mc.items;
  if(!n) return list.slice();
  const words=String(q).trim().split(/[\s　]+/).map(mcNorm).filter(Boolean);
  const digits=String(q).normalize('NFKC').replace(/\D/g,'');
  const score=x=>{
    const nm=mcNorm(x.name), kn=mcNorm(x.kana), co=mcNorm(x.company), other=mcNorm([x.dept,x.title,x.note,x.email,x.addr,x.metAt,x.url,(x.tags||[]).join(' ')].join(' '));
    let s=0;
    for(const w of words){
      if(nm===w||kn===w) s+=100; else if(nm.startsWith(w)||kn.startsWith(w)) s+=60; else if(nm.includes(w)||kn.includes(w)) s+=45;
      else if(co.includes(w)) s+=30; else if(other.includes(w)) s+=10; else return 0;
    }
    return s;
  };
  const telHit=x=>digits.length>=4 && [x.tel,x.mobile,x.fax].some(t=>String(t).replace(/\D/g,'').includes(digits));
  return list.map(x=>[x, Math.max(score(x), telHit(x)?50:0)]).filter(a=>a[1]>0).sort((a,b)=>b[1]-a[1]).map(a=>a[0]);
}
function mcTags(){
  const c={}; mc.items.forEach(x=>(x.tags||[]).forEach(t=>{ c[t]=(c[t]||0)+1; }));
  return Object.entries(c).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'ja'));
}

/* ── 画面 ── */
const MC_CSS=`
#meishiOverlay .mc-modal{ display:flex; flex-direction:column; }
.mc-top{ padding:10px 12px 6px; border-bottom:1px solid rgba(120,132,156,.25); }
.mc-find input{ width:100%; box-sizing:border-box; height:44px; padding:0 12px; font-size:17px; border:2px solid var(--acc); border-radius:22px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.mc-bar{ display:flex; gap:6px; align-items:center; margin-top:8px; overflow-x:auto; scrollbar-width:none; }
.mc-bar::-webkit-scrollbar{ display:none; }
.mc-chip{ flex:none; height:32px; padding:0 11px; border-radius:16px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.mc-chip.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.mc-chip small{ font-weight:normal; opacity:.8; margin-left:3px; }
.mc-sep{ flex:none; width:1px; height:20px; background:rgba(120,132,156,.4); }
.mc-list{ flex:1; min-height:0; overflow:auto; padding:8px 12px 12px; }
.mc-grp{ font-size:13px; font-weight:bold; color:var(--acc); margin:12px 2px 5px; display:flex; align-items:center; gap:6px; }
.mc-grp span{ font-weight:normal; color:var(--text-light,#888); font-size:12px; }
.mc-it{ display:flex; align-items:center; gap:10px; padding:9px 10px; margin-bottom:6px; border:1px solid rgba(120,132,156,.3); border-radius:12px; background:var(--modal-bg,#fff); cursor:pointer; }
.mc-it .ph{ flex:none; width:74px; height:44px; border-radius:6px; background:rgba(120,132,156,.14) center/cover no-repeat; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:bold; color:var(--acc); }
.mc-it .tx{ flex:1; min-width:0; }
.mc-it .nm{ font-weight:bold; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mc-it .nm small{ font-weight:normal; font-size:11px; color:var(--text-light,#888); margin-left:6px; }
.mc-it .co{ font-size:13.5px; color:var(--text,#333); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mc-it .dt{ font-size:11px; color:var(--text-light,#888); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mc-it .fv{ flex:none; color:#f9a825; font-size:16px; }
.mc-it.hit{ border:2px solid var(--acc); }
.mc-empty{ text-align:center; color:var(--text-light,#888); padding:28px 12px; line-height:1.8; font-size:14px; }
.mc-empty b{ color:var(--text,#333); }
.mc-add{ display:flex; gap:6px; padding:8px 12px calc(10px + var(--safe-bottom,0px)); border-top:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); }
.mc-add button{ flex:1; height:48px; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; }
.mc-add button.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.mc-body{ padding:10px 12px calc(16px + var(--safe-bottom,0px)); overflow:auto; }
.mc-f{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:8px 0; }
.mc-f input,.mc-f textarea{ display:block; width:100%; box-sizing:border-box; margin-top:4px; min-height:44px; padding:6px 10px; font-size:16px; border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
.mc-f textarea{ min-height:70px; resize:vertical; }
.mc-2{ display:grid; grid-template-columns:1fr 1fr; gap:0 8px; }
.mc-sec{ font-size:13px; font-weight:bold; color:var(--acc); margin:14px 0 2px; border-top:1px solid rgba(120,132,156,.25); padding-top:10px; }
.mc-photos{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:6px 0 4px; }
.mc-pv{ aspect-ratio:91/55; border-radius:8px; border:1px dashed rgba(120,132,156,.6); background:rgba(120,132,156,.08) center/contain no-repeat; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font-size:13px; color:var(--text-light,#888); cursor:pointer; position:relative; }
.mc-pv.has{ border-style:solid; }
.mc-pv .x{ position:absolute; top:4px; right:4px; width:28px; height:28px; border-radius:14px; border:none; background:rgba(0,0,0,.55); color:#fff; font-size:14px; cursor:pointer; }
.mc-tagrow{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.mc-tagrow button{ height:32px; padding:0 11px; border-radius:16px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13px; cursor:pointer; }
.mc-tagrow button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.mc-btn{ display:block; width:100%; min-height:44px; margin:8px 0 0; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; }
.mc-btn.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.mc-btn.del{ background:transparent; color:#d32f2f; border:1px solid rgba(211,47,47,.45); }
.mc-note{ font-size:12px; color:var(--text-light,#888); line-height:1.65; margin:6px 0; }
.mc-card{ width:100%; aspect-ratio:91/55; border-radius:10px; background:rgba(120,132,156,.1) center/contain no-repeat; display:flex; align-items:center; justify-content:center; color:var(--text-light,#888); font-size:13px; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.15); }
.mc-flip{ text-align:center; font-size:12px; color:var(--text-light,#888); margin:4px 0 8px; }
.mc-who{ text-align:center; margin:6px 0 10px; }
.mc-who .k{ font-size:12px; color:var(--text-light,#888); }
.mc-who .n{ font-size:22px; font-weight:bold; }
.mc-who .c{ font-size:14px; margin-top:2px; }
.mc-acts{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin:8px 0; }
.mc-acts a,.mc-acts button{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:58px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:12px; font-weight:bold; text-decoration:none; cursor:pointer; }
.mc-acts span{ font-size:20px; }
.mc-acts .off{ opacity:.35; pointer-events:none; }
.mc-rows{ border-top:1px solid rgba(120,132,156,.25); margin-top:6px; }
.mc-row{ display:flex; gap:8px; padding:8px 2px; border-bottom:1px solid rgba(120,132,156,.18); font-size:14.5px; }
.mc-row b{ flex:none; width:5.5em; font-size:12px; color:var(--text-light,#888); padding-top:2px; }
.mc-row span{ flex:1; min-width:0; overflow-wrap:anywhere; white-space:pre-wrap; }
.mc-row a{ color:var(--acc); }
.mc-big{ display:block; max-width:100%; max-height:75vh; margin:0 auto; border-radius:10px; }
.mc-paste{ width:100%; box-sizing:border-box; min-height:150px; font-size:15px; padding:8px 10px; border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
#printArea .mc-pr{ font-family:sans-serif; color:#000; }
#printArea .mc-pr h1{ font-size:17pt; margin:0 0 3mm; } #printArea .mc-pr h2{ font-size:12pt; margin:5mm 0 1.5mm; border-bottom:1px solid #999; }
#printArea .mc-pr table{ width:100%; border-collapse:collapse; font-size:9.5pt; } #printArea .mc-pr td{ border-bottom:1px solid #ddd; padding:1.2mm 1.6mm; vertical-align:top; }
`;
function mcEnsureDom(){
  if($('meishiOverlay')) return;
  const st=document.createElement('style'); st.id='mcStyle'; st.textContent=MC_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="meishiOverlay">
  <div class="modal vol-modal mc-modal" style="position:relative">
    <div class="modal-header"><span>💼 名刺管理</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="hdr-btn" onclick="mcOpenMenu()" title="印刷・書き出し・読み込みなど">⚙ 設定</button>
      <button class="modal-close" onclick="closeMeishi()" aria-label="閉じる">✕</button></span></div>
    <div class="mc-top">
      <div class="mc-find"><input id="mcFind" type="search" placeholder="🔍 さがす（名前・ふりがな・会社・電話）" autocomplete="off" oninput="mcSetQ(this.value)" enterkeyhint="search"></div>
      <div class="mc-bar" id="mcBar"></div>
    </div>
    <div class="mc-list" id="mcList"></div>
    <div class="mc-add">
      <button id="mcAddPhoto" onclick="mcAddPhoto()">📷 名刺を撮って入れる</button>
      <button class="sub" id="mcAddHand" onclick="mcEdit(null)">✏ 手で入れる</button>
    </div>
  </div>
</div>
<div class="modal-overlay" id="mcViewOverlay" onclick="if(event.target===this)mcCloseView()">
  <div class="modal"><div class="modal-header"><span id="mcViewHdr">名刺</span><button class="modal-close" onclick="mcCloseView()" aria-label="閉じる">✕</button></div>
    <div class="mc-body" id="mcViewBody"></div></div>
</div>
<div class="modal-overlay" id="mcEdOverlay" onclick="if(event.target===this)mcCloseEd()">
  <div class="modal"><div class="modal-header"><span id="mcEdHdr">名刺</span><button class="modal-close" onclick="mcCloseEd()" aria-label="閉じる">✕</button></div>
    <div class="mc-body" id="mcEdBody"></div></div>
</div>
<div class="modal-overlay" id="mcSubOverlay" onclick="if(event.target===this)mcCloseSub()">
  <div class="modal"><div class="modal-header"><span id="mcSubHdr"></span><button class="modal-close" onclick="mcCloseSub()" aria-label="閉じる">✕</button></div>
    <div class="mc-body" id="mcSubBody"></div></div>
</div>
<input type="file" id="mcPicIn" accept="image/*" hidden onchange="mcPickPhoto(this)">
<input type="file" id="mcCamIn" accept="image/*" capture="environment" hidden onchange="mcPickPhoto(this)">
<input type="file" id="mcFileIn" accept=".json,.csv,.vcf,application/json,text/csv,text/vcard,text/x-vcard" hidden onchange="mcImport(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openMeishi(q){
  mcEnsureDom(); mcLoad(); mcTag='';
  mcQ=typeof q==='string'?q:''; $('mcFind').value=mcQ;
  openDlg('meishiOverlay'); mcRender();
}
function closeMeishi(){
  if(!$('meishiOverlay') || !isDlgOpen('meishiOverlay')) return;
  mcCloseEd(); mcCloseView(); mcCloseSub(); closeDlg('meishiOverlay');
}
function mcSetQ(v){ mcQ=v; mcRender(); }
function mcSetView(v){ mc.view=v; mcSave(); mcRender(); }
function mcSetTag(t){ mcTag=mcTag===t?'':t; mcRender(); }

function mcRender(){
  if(!$('mcList')) return;
  const tags=mcTags();
  if(mcTag && mcTag!=='★' && !tags.some(t=>t[0]===mcTag)) mcTag='';
  const nf=mc.items.filter(x=>x.fav).length;
  $('mcBar').innerHTML=[['new','🕘 新しい順'],['name','あ 名前順'],['company','🏢 会社ごと']].map(([k,l])=>`<button class="mc-chip${mc.view===k?' on':''}" onclick="mcSetView('${k}')">${l}</button>`).join('')
    +((nf||tags.length)?'<span class="mc-sep"></span>':'')
    +(nf?`<button class="mc-chip${mcTag==='★'?' on':''}" onclick="mcSetTag('★')">★<small>${nf}</small></button>`:'')
    +tags.slice(0,30).map(([t,n])=>`<button class="mc-chip${mcTag===t?' on':''}" onclick="mcSetTag(${esc(JSON.stringify(t))})">${esc(t)}<small>${n}</small></button>`).join('');
  let list=mc.items;
  if(mcTag==='★') list=list.filter(x=>x.fav);
  else if(mcTag) list=list.filter(x=>(x.tags||[]).includes(mcTag));
  const L=$('mcList');
  if(!mc.items.length){
    L.innerHTML=`<div class="mc-empty">💼<br><b>もらった名刺を入れておくと、<br>名前・会社・ふりがなで すぐさがせます。</b><br><br>下の「<b>📷 名刺を撮って入れる</b>」で表を撮り、<br>名前や会社を入れてください。<br>名刺の文字をコピーして貼ると、<br>名前・電話・メールなどの欄に分けます。</div>`;
    return;
  }
  if(mcQ.trim()){
    const r=mcSearch(mcQ, list);
    if(!r.length){ L.innerHTML=`<div class="mc-empty">「<b>${esc(mcQ)}</b>」は見つかりませんでした。<br>ふりがな・会社名の一部・電話番号の一部でも さがせます。</div>`; return; }
    L.innerHTML=`<div class="mc-grp">見つかった名刺<span>${r.length}件</span></div>`+r.map((x,i)=>mcItemHtml(x, i===0 && r.length<=3)).join('');
  } else if(mc.view==='company'){
    const g={}; list.forEach(x=>{ const k=mcCoKey(x)||'（会社なし）'; (g[k]=g[k]||[]).push(x); });
    L.innerHTML=Object.keys(g).sort((a,b)=>a==='（会社なし）'?1:b==='（会社なし）'?-1:a.localeCompare(b,'ja')).map(k=>`<div class="mc-grp">🏢 ${esc(k)}<span>${g[k].length}人</span></div>`
      +g[k].sort((a,b)=>mcSortKey(a).localeCompare(mcSortKey(b),'ja')).map(x=>mcItemHtml(x)).join('')).join('');
  } else {
    const s=list.slice().sort(mc.view==='name' ? (a,b)=>mcSortKey(a).localeCompare(mcSortKey(b),'ja') : (a,b)=>((b.met||b.added).localeCompare(a.met||a.added)) || ((b.ts||0)-(a.ts||0)) || b.id.localeCompare(a.id));
    L.innerHTML=(mcTag?`<div class="mc-grp">${mcTag==='★'?'★ よく使う':'🏷 '+esc(mcTag)}<span>${s.length}件</span></div>`:'')+s.map(x=>mcItemHtml(x)).join('');
  }
  mcFillThumbs();
}
function mcItemHtml(x, hit){
  const ini=esc(String(x.name||x.company||'？').trim().charAt(0));
  const co=[x.company, x.dept, x.title].filter(Boolean).join(' ');
  const sub=[x.met?'🤝 '+fmtDay(x.met):'', x.metAt, x.tel||x.mobile].filter(Boolean).join('　');
  return `<div class="mc-it${hit?' hit':''}" data-id="${x.id}" onclick="mcView('${x.id}')"><span class="ph" data-ph="${x.front?x.id:''}">${x.front?'':ini}</span>
    <span class="tx"><div class="nm">${esc(mcLabel(x))}${x.kana?`<small>${esc(x.kana)}</small>`:''}</div><div class="co">${esc(x.name?co:[x.dept,x.title].filter(Boolean).join(' '))}</div><div class="dt">${esc(sub)}</div></span>${x.fav?'<span class="fv">★</span>':''}</div>`;
}
async function mcFillThumbs(){
  for(const el of document.querySelectorAll('#mcList .ph[data-ph]')){
    const id=el.dataset.ph; if(!id) continue;
    const d=await mcPic(id,'f');
    if(d){ el.style.backgroundImage=`url("${d}")`; el.textContent=''; }
  }
}
function mcFlash(id){ const e=document.querySelector(`#mcList .mc-it[data-id="${id}"]`); if(e){ e.scrollIntoView({block:'nearest'}); e.style.transition='background .2s'; e.style.background='rgba(255,213,79,.45)'; setTimeout(()=>{ e.style.background=''; }, 1600); } }

/* ── 見る（名刺の写真・電話・メールなど） ── */
const telHref=t=>'tel:'+String(t).replace(/[^\d+]/g,'');
const urlHref=u=>/^https?:\/\//i.test(u)?u:'https://'+u;
const mapHref=x=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([x.addr, x.addr?'':x.company].filter(Boolean).join(' '));
function mcView(id){
  const x=mc.items.find(i=>i.id===id); if(!x) return;
  mcViewId=id; mcViewBack=false;
  $('mcViewHdr').textContent='💼 '+mcLabel(x);
  const row=(l,v,href)=>v?`<div class="mc-row"><b>${l}</b><span>${href?`<a href="${esc(href)}" target="_blank" rel="noopener">${esc(v)}</a>`:esc(v)}</span></div>`:'';
  const act=(ic,l,href,on)=>on?`<a href="${esc(href)}" target="_blank" rel="noopener"><span>${ic}</span>${l}</a>`:`<a class="off"><span>${ic}</span>${l}</a>`;
  const same=x.company?mc.items.filter(i=>i.id!==x.id && mcCoKey(i) && mcCoKey(i)===mcCoKey(x)):[];
  $('mcViewBody').innerHTML=`
    ${(x.front||x.back)?`<div class="mc-card" id="mcCardPic" onclick="mcFlipOrBig()"></div><div class="mc-flip">${x.back?'押すと裏・表が入れかわります（長く押すと大きく）':'押すと大きく見られます'}</div>`:''}
    <div class="mc-who">${x.kana?`<div class="k">${esc(x.kana)}</div>`:''}<div class="n">${esc(x.name||'（名前なし）')}${x.fav?' <span style="color:#f9a825">★</span>':''}</div>
      <div class="c">${esc([x.company,x.dept,x.title].filter(Boolean).join(' '))}</div></div>
    <div class="mc-acts">
      ${act('📞','電話',telHref(x.tel||x.mobile),!!(x.tel||x.mobile))}
      ${x.mobile && x.tel?act('📱','携帯',telHref(x.mobile),true):act('✉','メール','mailto:'+x.email,!!x.email)}
      ${x.mobile && x.tel?act('✉','メール','mailto:'+x.email,!!x.email):act('🌐','サイト',urlHref(x.url),!!x.url)}
      ${act('📍','地図',mapHref(x),!!(x.addr||x.company))}
    </div>
    <div class="mc-rows">
      ${row('電話',x.tel,telHref(x.tel))}${row('携帯',x.mobile,telHref(x.mobile))}${row('FAX',x.fax)}
      ${row('メール',x.email,'mailto:'+x.email)}${row('サイト',x.url,x.url?urlHref(x.url):'')}
      ${row('住所',[x.zip?'〒'+x.zip:'',x.addr].filter(Boolean).join(' '),x.addr?mapHref(x):'')}
      ${row('会った日',x.met?fmtDay(x.met):'')}${row('会った所',x.metAt)}
      ${row('分類',(x.tags||[]).join('・'))}${row('メモ',x.note)}
    </div>
    ${same.length?`<div class="mc-sec">🏢 同じ会社の人（${same.length}）</div>`+same.slice(0,10).map(i=>`<button class="mc-btn sub" style="text-align:left;padding:0 12px" onclick="mcView('${i.id}')">${esc(mcLabel(i))}${i.title?'　<small>'+esc(i.title)+'</small>':''}</button>`).join(''):''}
    <button class="mc-btn" onclick="mcEdit('${x.id}')">✏ 直す</button>
    <button class="mc-btn sub" onclick="mcToggleFav('${x.id}')">${x.fav?'☆ よく使うから外す':'★ よく使う'}</button>
    <button class="mc-btn sub" onclick="mcContact('${x.id}')">📇 スマホの連絡先に入れる</button>
    <button class="mc-btn sub" onclick="mcShare('${x.id}')">📤 送る（LINE・メールなど）</button>
    <button class="mc-btn del" onclick="mcRemove('${x.id}')">🗑 消す</button>
    <div class="mc-note">入れた日 ${fmtDay(x.added)}${x.updated!==x.added?'　直した日 '+fmtDay(x.updated):''}</div>`;
  if(!isDlgOpen('mcViewOverlay')) openDlg('mcViewOverlay', ()=>{ mcViewId=null; });
  else $('mcViewBody').scrollTop=0;
  mcShowCard();
  const c=$('mcCardPic');
  if(c){ let t=null; c.addEventListener('pointerdown',()=>{ t=setTimeout(()=>{ t=null; c.dataset.long='1'; mcShowBig(); }, 550); });
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>c.addEventListener(ev,()=>{ if(t){ clearTimeout(t); t=null; } })); }
}
async function mcShowCard(){
  const x=mc.items.find(i=>i.id===mcViewId), c=$('mcCardPic'); if(!x || !c) return;
  const side=(mcViewBack && x.back) || (!x.front && x.back) ? 'b' : 'f';
  const d=await mcPic(x.id, side);
  c.style.backgroundImage=d?`url("${d}")`:''; c.textContent=d?'':'（写真を読めませんでした）';
}
function mcFlipOrBig(){
  const c=$('mcCardPic'); if(c && c.dataset.long){ delete c.dataset.long; return; }
  const x=mc.items.find(i=>i.id===mcViewId); if(!x) return;
  if(x.front && x.back){ mcViewBack=!mcViewBack; mcShowCard(); } else mcShowBig();
}
async function mcShowBig(){
  const x=mc.items.find(i=>i.id===mcViewId); if(!x) return;
  const side=(mcViewBack && x.back) || (!x.front && x.back) ? 'b' : 'f';
  const d=await mcPic(x.id, side); if(!d) return;
  $('mcSubHdr').textContent='📷 '+(side==='b'?'裏':'表'); $('mcSubBody').innerHTML=`<img class="mc-big" src="${d}" alt="名刺の写真">`; openDlg('mcSubOverlay');
}
function mcCloseView(){ if($('mcViewOverlay') && isDlgOpen('mcViewOverlay')) closeDlg('mcViewOverlay', ()=>{ mcViewId=null; }); }
function mcToggleFav(id){ const x=mc.items.find(i=>i.id===id); if(!x) return; x.fav=!x.fav; mcSave(); mcRender(); mcView(id); }

/* ── 入れる・直す ── */
function mcAddPhoto(){ mcEdit(null); mcPicSide='f'; setTimeout(()=>$('mcCamIn').click(), 120); }
function mcEdit(id, pre){
  const x=id ? mc.items.find(i=>i.id===id) : Object.assign(mcCleanItem({}), {met:today()}, pre||{});
  if(!x) return;
  mcEdId=id; mcEdPic={f:undefined, b:undefined};
  $('mcEdHdr').textContent=id?'💼 名刺を直す':'💼 名刺を入れる';
  const tags=mcTags().map(t=>t[0]); ['取引先','お客様','仕入先','協力会社','社内'].forEach(t=>{ if(!tags.includes(t)) tags.push(t); });
  const cur=x.tags||[];
  cur.forEach(t=>{ if(!tags.includes(t)) tags.push(t); });
  const f=(k,l,ph,type,extra)=>`<label class="mc-f">${l}<input id="mcE_${k}" ${type?`type="${type}"`:''} maxlength="${LIMIT[k]}" value="${esc(x[k])}" placeholder="${esc(ph||'')}" ${extra||''}></label>`;
  $('mcEdBody').innerHTML=`
    <div class="mc-photos">
      <div class="mc-pv" id="mcPvF" onclick="mcPickSide('f')">📷<span>表を撮る・選ぶ</span></div>
      <div class="mc-pv" id="mcPvB" onclick="mcPickSide('b')">📷<span>裏（あれば）</span></div>
    </div>
    <button type="button" class="mc-btn sub" onclick="mcOpenPaste()">📋 名刺の文字を貼って欄に分ける</button>
    <div class="mc-note">iPhone は写真の<b>テキスト認識表示</b>、Android は <b>Google レンズ</b>で名刺の文字をコピーして貼ると、名前・会社・電話・メールなどの欄に分けて入れます。</div>
    ${f('name','名前','例：山田 太郎')}${f('kana','ふりがな','例：やまだ たろう')}
    ${f('company','会社','例：株式会社〇〇')}
    <div class="mc-2">${f('dept','部署','例：営業部')}${f('title','役職','例：課長')}</div>
    <div class="mc-sec">連絡先</div>
    <div class="mc-2">${f('tel','電話','03-1234-5678','tel')}${f('mobile','携帯','090-1234-5678','tel')}</div>
    <div class="mc-2">${f('fax','FAX','','tel')}${f('zip','郵便番号','100-0001','text','inputmode="numeric"')}</div>
    ${f('email','メール','taro@example.co.jp','email')}${f('url','サイト','www.example.co.jp','url')}
    ${f('addr','住所','例：東京都千代田区…')}
    <div class="mc-sec">会ったとき</div>
    <div class="mc-2">${f('met','会った日','','date')}${f('metAt','会った所','例：展示会・〇〇の会議')}</div>
    <label class="mc-f">分類（押すと付く・外れる）</label>
    <div class="mc-tagrow" id="mcETags">${tags.map(t=>`<button type="button" class="${cur.includes(t)?'on':''}" onclick="this.classList.toggle('on')">${esc(t)}</button>`).join('')}<button type="button" onclick="mcNewTag()">＋ 分類を足す</button></div>
    <label class="mc-f">メモ<textarea id="mcE_note" maxlength="${LIMIT.note}" placeholder="例：〇〇の件で紹介してもらった。ゴルフ好き">${esc(x.note)}</textarea></label>
    <label class="mc-f" style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text,#222)"><input type="checkbox" id="mcE_fav" ${x.fav?'checked':''} style="width:22px;height:22px;min-height:0;margin:0"> ★ よく使う</label>
    <button class="mc-btn" onclick="mcEdSave()">保存する</button>
    <button class="mc-btn sub" onclick="mcCloseEd()">やめる</button>`;
  openDlg('mcEdOverlay', ()=>{ mcEdId=null; });
  mcEdPv(x);
}
async function mcEdPv(x){
  x=x||mc.items.find(i=>i.id===mcEdId)||{};
  for(const side of ['f','b']){
    const pv=$(side==='f'?'mcPvF':'mcPvB'); if(!pv) continue;
    let d=mcEdPic[side];
    if(d===undefined) d=(x.id && x[side==='f'?'front':'back']) ? await mcPic(x.id, side) : null;
    pv.classList.toggle('has', !!d);
    pv.style.backgroundImage=d?`url("${d}")`:'';
    pv.innerHTML=d?`<button type="button" class="x" onclick="event.stopPropagation();mcClearPic('${side}')" aria-label="写真を外す">✕</button>`:`📷<span>${side==='f'?'表を撮る・選ぶ':'裏（あれば）'}</span>`;
  }
}
async function mcPickSide(side){
  mcPicSide=side;
  const pick=await mcAsk3('📷 名刺の'+(side==='f'?'表':'裏'), 'どちらで入れますか？', '📷 カメラで撮る', '🖼 写真から選ぶ', 'やめる');
  if(pick===0) $('mcCamIn').click(); else if(pick===1) $('mcPicIn').click();
}
async function mcPickPhoto(inp){
  const fl=inp.files && inp.files[0]; inp.value=''; if(!fl) return;
  try{ mcEdPic[mcPicSide]=await mcResize(fl, 1400); mcEdPv(); }catch(_){ toast('写真を読めませんでした'); }
}
function mcClearPic(side){ mcEdPic[side]=null; mcEdPv(); }
async function mcNewTag(){
  const t=(await appPrompt('分類の名前（例：取引先・展示会2026）',''))||''; const v=t.trim().slice(0,20); if(!v) return;
  const row=$('mcETags'); if(!row) return;
  const ex=[...row.querySelectorAll('button')].find(b=>b.textContent===v);
  if(ex){ ex.classList.add('on'); return; }
  const b=document.createElement('button'); b.type='button'; b.className='on'; b.textContent=v; b.onclick=()=>b.classList.toggle('on');
  row.insertBefore(b, row.lastElementChild);
}
function mcFormVals(){
  const o={}; for(const k of FIELDS){ const e=$('mcE_'+k); if(e) o[k]=e.value.trim(); }
  o.tags=[...document.querySelectorAll('#mcETags button.on')].map(b=>b.textContent).filter(t=>!t.startsWith('＋'));
  o.fav=!!($('mcE_fav') && $('mcE_fav').checked);
  return o;
}
/* 同じ人（メール・携帯が同じ／名前と会社が同じ） */
function mcFindSame(v, notId){
  const n=mcNorm(v.name), c=mcNorm(v.company), em=String(v.email||'').toLowerCase(), mo=String(v.mobile||'').replace(/\D/g,'');
  return mc.items.find(i=>i.id!==notId && ((em && String(i.email).toLowerCase()===em) || (mo.length>=10 && String(i.mobile).replace(/\D/g,'')===mo) || (n && mcNorm(i.name)===n && mcNorm(i.company)===c)));
}
async function mcEdSave(){
  const v=mcFormVals();
  if(!v.name && !v.company){ toast('名前か会社を入れてください'); $('mcE_name').focus(); return; }
  if(v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)){ toast('メールの形が正しくないようです'); $('mcE_email').focus(); return; }
  let x=mcEdId ? mc.items.find(i=>i.id===mcEdId) : null;
  if(!x){
    const old=mcFindSame(v, null);
    if(old){
      const r=await mcAsk3('💼 名刺管理', '「'+mcLabel(old)+'」（'+(old.company||'会社なし')+'）がもう入っています。\n新しい名刺で上書きしますか？（役職や電話が変わったとき。空けた欄は前のまま）', '上書きする', '別の人として足す', 'やめる');
      if(r===2) return;
      if(r===0){ x=old; for(const k of FIELDS) if(!v[k]) delete v[k]; v.tags=[...new Set((old.tags||[]).concat(v.tags))]; v.fav=old.fav||v.fav; }
    }
    if(!x){ x=mcCleanItem({}); x.added=today(); mc.items.push(x); }
  }
  Object.assign(x, mcCleanItem(Object.assign({}, x, v, {id:x.id, front:x.front, back:x.back, added:x.added})));
  x.updated=today(); x.ts=Date.now();
  for(const side of ['f','b']){
    const p=mcEdPic[side], key=side==='f'?'front':'back'; if(p===undefined) continue;
    if(p){ try{ await mcPicPut(x.id+'_'+side, p); x[key]=true; mcPics[x.id+'_'+side]=p; }catch(_){ toast('写真を入れられませんでした（端末の空きを見てください）'); } }
    else { x[key]=false; mcPicDel(x.id+'_'+side); delete mcPics[x.id+'_'+side]; }
  }
  if(!mcSave()) return;
  const id=x.id; mcCloseEd(); mcQ=''; if($('mcFind')) $('mcFind').value=''; mcRender(); mcFlash(id);
  if(isDlgOpen('mcViewOverlay')) mcView(id);
  toast('保存しました');
}
function mcCloseEd(){ if($('mcEdOverlay') && isDlgOpen('mcEdOverlay')) closeDlg('mcEdOverlay', ()=>{ mcEdId=null; }); }
function mcCloseSub(){ if($('mcSubOverlay') && isDlgOpen('mcSubOverlay')) closeDlg('mcSubOverlay'); }
async function mcRemove(id){
  const x=mc.items.find(i=>i.id===id); if(!x) return;
  if(!await appConfirm('「'+mcLabel(x)+'」の名刺を消しますか？（写真も消えます）','消す','やめる')) return;
  mc.items=mc.items.filter(i=>i.id!==id); mcSave();
  for(const s of ['f','b']){ mcPicDel(id+'_'+s); delete mcPics[id+'_'+s]; }
  mcCloseView(); mcRender(); toast('消しました');
}
/* 3つから選ぶ（0/1/2。閉じたら 2） */
function mcAsk3(hdr, msg, a, b, c){
  return new Promise(res=>{
    $('mcSubHdr').textContent=hdr;
    $('mcSubBody').innerHTML=`<div style="white-space:pre-wrap;font-size:15px;line-height:1.7;margin:4px 0 8px">${esc(msg)}</div>
      <button class="mc-btn" data-r="0">${esc(a)}</button><button class="mc-btn sub" data-r="1">${esc(b)}</button><button class="mc-btn sub" data-r="2">${esc(c)}</button>`;
    let done=false; const fin=r=>{ if(done) return; done=true; res(r); };
    $('mcSubBody').querySelectorAll('button').forEach(x=>x.onclick=()=>{ fin(+x.dataset.r); mcCloseSub(); });
    openDlg('mcSubOverlay', ()=>fin(2));
  });
}

/* ── 文字を貼って欄に分ける ── */
function mcOpenPaste(){
  $('mcSubHdr').textContent='📋 名刺の文字を貼る';
  $('mcSubBody').innerHTML=`<div class="mc-note">名刺の写真から文字をコピーして、下に貼ってください。<br>
      <b>iPhone</b>：カメラや写真で名刺を写し、右下の <b>テキスト認識表示</b>（□の中に線）→ <b>すべてをコピー</b><br>
      <b>Android</b>：カメラや Google フォトの <b>レンズ</b> → <b>テキスト</b> → <b>すべて選択</b> → <b>コピー</b></div>
    <textarea class="mc-paste" id="mcPasteIn" placeholder="ここに貼る（長押し → ペースト）"></textarea>
    <button class="mc-btn" onclick="mcApplyPaste()">欄に分けて入れる</button>
    <button class="mc-btn sub" onclick="mcCloseSub()">やめる</button>`;
  openDlg('mcSubOverlay');
  setTimeout(()=>{ const t=$('mcPasteIn'); if(t) t.focus(); }, 80);
}
function mcApplyPaste(){
  const t=$('mcPasteIn') && $('mcPasteIn').value; if(!String(t||'').trim()){ toast('文字を貼ってください'); return; }
  const p=mcParse(t); let n=0;
  for(const k of FIELDS){ if(k==='met') continue; const e=$('mcE_'+k); if(!e || !p[k]) continue;
    if(k==='note' && e.value.trim()){ e.value=e.value.trim()+'\n'+p[k]; } else e.value=p[k];
    n++; }
  mcCloseSub();
  toast(n?n+'つの欄に入れました。まちがいがないか見てください':'うまく分けられませんでした。手で入れてください', 3600);
}

/* ── 連絡先（vCard 3.0）・送る ── */
const vEsc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/([,;])/g,'\\$1');
function mcSplitName(n){ const p=String(n||'').trim().split(/[\s　]+/); return p.length>1 ? [p[0], p.slice(1).join(' ')] : [p[0]||'', '']; }
function mcVcard(x){
  const [fam,giv]=mcSplitName(x.name), [kf,kg]=mcSplitName(x.kana);
  const L=['BEGIN:VCARD','VERSION:3.0',
    'N:'+vEsc(fam)+';'+vEsc(giv)+';;;', 'FN:'+vEsc(x.name||x.company)];
  if(x.kana){ L.push('X-PHONETIC-LAST-NAME:'+vEsc(kf)); if(kg) L.push('X-PHONETIC-FIRST-NAME:'+vEsc(kg)); L.push('SORT-STRING:'+vEsc(x.kana)); }
  if(x.company||x.dept) L.push('ORG:'+vEsc(x.company)+(x.dept?';'+vEsc(x.dept):''));
  if(x.title) L.push('TITLE:'+vEsc(x.title));
  if(x.tel) L.push('TEL;TYPE=WORK,VOICE:'+x.tel);
  if(x.mobile) L.push('TEL;TYPE=CELL:'+x.mobile);
  if(x.fax) L.push('TEL;TYPE=WORK,FAX:'+x.fax);
  if(x.email) L.push('EMAIL;TYPE=INTERNET,WORK:'+x.email);
  if(x.url) L.push('URL:'+vEsc(urlHref(x.url)));
  if(x.addr||x.zip) L.push('ADR;TYPE=WORK:;;'+vEsc(x.addr)+';;;'+vEsc(x.zip)+';');
  const note=[x.met?'会った日 '+x.met:'', x.metAt?'会った所 '+x.metAt:'', x.note].filter(Boolean).join('\n');
  if(note) L.push('NOTE:'+vEsc(note));
  if((x.tags||[]).length) L.push('CATEGORIES:'+x.tags.map(vEsc).join(','));
  L.push('END:VCARD');
  return L.join('\r\n');
}
function mcDownload(name, text, type){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([text],{type})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const mcFileName=s=>String(s||'名刺').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,40);
async function mcContact(id){
  const x=mc.items.find(i=>i.id===id); if(!x) return;
  const v=mcVcard(x)+'\r\n', name=mcFileName(mcLabel(x))+'.vcf';
  try{
    const file=new File([v], name, {type:'text/vcard'});
    if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:mcLabel(x)}); return; }
  }catch(e){ if(e && e.name==='AbortError') return; }
  mcDownload(name, v, 'text/vcard;charset=utf-8');
  toast('連絡先のファイル（.vcf）を作りました。開くと連絡先に入れられます', 4000);
}
function mcShareText(x){
  return [x.company, [x.dept,x.title].filter(Boolean).join(' '), x.name+(x.kana?'（'+x.kana+'）':''),
    x.tel?'TEL '+x.tel:'', x.mobile?'携帯 '+x.mobile:'', x.fax?'FAX '+x.fax:'', x.email, x.url, [x.zip?'〒'+x.zip:'', x.addr].filter(Boolean).join(' ')].filter(s=>String(s).trim()).join('\n');
}
function mcShare(id){
  const x=mc.items.find(i=>i.id===id); if(!x) return;
  const t=mcShareText(x);
  if(navigator.share) navigator.share({text:t}).catch(()=>{});
  else if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast('コピーしました。LINE などに貼って送れます'),()=>toast(t));
  else toast(t);
}

/* ── ⚙ メニュー（印刷・CSV・vCard・書き出し・読み込み・全部消す） ── */
function mcOpenMenu(){
  const n=mc.items.length, np=mc.items.filter(x=>x.front||x.back).length;
  $('mcSubHdr').textContent='⚙ 名刺管理';
  $('mcSubBody').innerHTML=`<div class="mc-note">いま <b>${n}</b> 枚（写真つき ${np} 枚）。入れたものはこの端末の中だけにあります。</div>
    <button class="mc-btn sub" onclick="mcPrint()">🖨 会社ごとの一覧を印刷</button>
    <button class="mc-btn sub" onclick="mcCsv()">📄 CSV（Excel）で書き出す</button>
    <button class="mc-btn sub" onclick="mcVcfAll()">📇 連絡先のファイル（vCard）でまとめて書き出す</button>
    <button class="mc-btn sub" onclick="mcExport()">⬇ 書き出す（写真ごと。機種変えのときに）</button>
    <button class="mc-btn sub" onclick="document.getElementById('mcFileIn').click()">⬆ 読み込む（書き出したファイル・CSV・vCard）</button>
    <div class="mc-note">CSV は「氏名・会社名・電話・メール」などの見出しで読みます（Eight などから書き出した CSV も読めます）。📋リストの ⬇書き出し（全体のバックアップ）にも入ります。写真は、そのとき入れるか聞きます。</div>
    <button class="mc-btn del" onclick="mcWipe()">🗑 ぜんぶ消す</button>`;
  openDlg('mcSubOverlay');
}
function mcPrint(){
  const g={}; mc.items.forEach(x=>{ const k=mcCoKey(x)||'（会社なし）'; (g[k]=g[k]||[]).push(x); });
  const html=`<div class="mc-pr"><h1>💼 名刺の一覧</h1><div style="font-size:9pt;color:#555">${fmtDay(today())} 現在・${mc.items.length}枚</div>`
    +Object.keys(g).sort((a,b)=>a.localeCompare(b,'ja')).map(k=>`<h2>🏢 ${esc(k)}（${g[k].length}）</h2><table>${g[k].sort((a,b)=>mcSortKey(a).localeCompare(mcSortKey(b),'ja')).map(x=>
      `<tr><td><b>${esc(x.name)}</b>${x.kana?'<br><small>'+esc(x.kana)+'</small>':''}</td><td>${esc([x.dept,x.title].filter(Boolean).join(' '))}</td><td>${esc([x.tel,x.mobile].filter(Boolean).join(' / '))}</td><td>${esc(x.email)}</td></tr>`).join('')}</table>`).join('')+'</div>';
  mcCloseSub();
  if(typeof opBuild==='function' && typeof opPrint==='function') opPrint(opBuild(html, true)); else window.print();
}
const CSV_HEAD=['氏名','ふりがな','会社名','部署','役職','電話','携帯','FAX','メール','URL','郵便番号','住所','会った日','会った所','分類','メモ','よく使う'];
function mcCsv(){
  const q=s=>'"'+String(s==null?'':s).replace(/"/g,'""')+'"';
  const rows=[CSV_HEAD].concat(mc.items.map(x=>[x.name,x.kana,x.company,x.dept,x.title,x.tel,x.mobile,x.fax,x.email,x.url,x.zip,x.addr,x.met,x.metAt,(x.tags||[]).join('・'),x.note,x.fav?'★':'']));
  mcDownload('名刺_'+today()+'.csv', '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}
function mcVcfAll(){
  if(!mc.items.length){ toast('入っている名刺はありません'); return; }
  mcDownload('名刺_'+today()+'.vcf', mc.items.map(mcVcard).join('\r\n')+'\r\n', 'text/vcard;charset=utf-8');
  toast('vCard で書き出しました（'+mc.items.length+'人）');
}
async function mcPicsAll(){
  const o={}; for(const x of mc.items) for(const s of ['f','b']) if(x[s==='f'?'front':'back']){ const d=await mcPic(x.id,s); if(d) o[x.id+'_'+s]=d; }
  return o;
}
async function mcExport(){
  const pics=await mcPicsAll();
  mcDownload('名刺_'+today()+'.json', JSON.stringify({app:'hyodenki', type:'meishi', version:1, data:mc, pics}), 'application/json');
  toast('書き出しました（写真 '+Object.keys(pics).length+'枚）');
}
/* 読み込み：同じ id は新しい方、ないものは足す（置きかえずに合わせる） */
async function mcMerge(d, pics){
  const inc=mcClean(d); let add=0, upd=0;
  for(const x of inc.items){
    const i=mc.items.findIndex(y=>y.id===x.id);
    if(i<0){ mc.items.push(x); add++; }
    else if(x.updated>mc.items[i].updated || (x.updated===mc.items[i].updated && (x.ts||0)>(mc.items[i].ts||0))){ mc.items[i]=x; upd++; }
    else continue;
    for(const s of ['f','b']){
      const key=s==='f'?'front':'back', k=x.id+'_'+s, p=pics && pics[k];
      if(typeof p==='string' && /^data:image\//.test(p)){ try{ await mcPicPut(k, p); mcPics[k]=p; x[key]=true; }catch(_){} }
      else if(x[key] && !(await mcPicGet(k))) x[key]=false;
    }
  }
  mcSave(); return {add, upd};
}
/* CSV を読む（" で囲んだ中の改行・カンマも） */
function mcCsvRows(t){
  t=String(t).replace(/^\uFEFF/,''); const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=c; continue; }
    if(c==='"') q=true; else if(c===','){ row.push(cell); cell=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&t[i+1]==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; } else cell+=c;
  }
  if(cell!=='' || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r=>r.some(c=>String(c).trim()));
}
const CSV_MAP=[ ['name',/^(氏名|名前|お名前|フルネーム|name|full ?name)$/i], ['fam',/^(姓|苗字|last ?name|family ?name)$/i], ['giv',/^(名|first ?name|given ?name)$/i],
  ['kana',/^(ふりがな|フリガナ|よみ|ヨミ|読み|氏名(ふりがな|フリガナ|カナ)|カナ)$/i], ['kfam',/^(姓(ふりがな|フリガナ|カナ)|せい|セイ)$/], ['kgiv',/^(名(ふりがな|フリガナ|カナ)|めい|メイ)$/],
  ['company',/^(会社|会社名|企業名|所属|company|organization)$/i], ['dept',/^(部署|部署名|部門|department)$/i], ['title',/^(役職|肩書|肩書き|title|job ?title)$/i],
  ['tel',/^(電話|電話番号|tel|tel会社|tel部門|tel直通|会社電話|phone|work phone)$/i], ['mobile',/^(携帯|携帯電話|携帯番号|mobile|cell|mobile phone)$/i], ['fax',/^(fax|ファックス|fax番号)$/i],
  ['email',/^(メール|メールアドレス|e-?mail|mail)$/i], ['url',/^(url|ホームページ|hp|web|website)$/i], ['zip',/^(郵便番号|〒|zip|postal ?code)$/i], ['addr',/^(住所|所在地|address)$/i],
  ['met',/^(会った日|名刺交換日|交換日|日付|date)$/i], ['metAt',/^(会った所|場所|交換場所)$/i], ['tags',/^(分類|タグ|グループ|tags?|category)$/i], ['note',/^(メモ|備考|note|notes)$/i], ['fav',/^(よく使う|お気に入り|★)$/] ];
function mcFromCsv(text){
  const rows=mcCsvRows(text); if(rows.length<2) return [];
  const hd=rows[0].map(h=>String(h).trim().replace(/\s+/g,' '));
  const col={}; hd.forEach((h,i)=>{ const m=CSV_MAP.find(([,re])=>re.test(h)); if(m && col[m[0]]==null) col[m[0]]=i; });
  if(col.name==null && col.fam==null && col.company==null) return null;
  const g=(r,k)=>col[k]==null?'':String(r[col[k]]||'').trim();
  return rows.slice(1).map(r=>{
    const o={}; for(const k of FIELDS) o[k]=g(r,k);
    if(!o.name) o.name=[g(r,'fam'),g(r,'giv')].filter(Boolean).join(' ');
    if(!o.kana) o.kana=[g(r,'kfam'),g(r,'kgiv')].filter(Boolean).join(' ');
    const m=/^(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/.exec(o.met); o.met=m?m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]):'';
    o.tags=g(r,'tags').split(/[・,、;\/]/).map(s=>s.trim()).filter(Boolean); o.fav=!!g(r,'fav');
    o.id=uid(); o.added=today();
    return o;
  }).filter(o=>o.name||o.company);
}
/* vCard を読む（よくある項目だけ） */
function mcFromVcf(text){
  const t=String(text).replace(/\r\n[ \t]/g,'').replace(/\n[ \t]/g,'');
  const un=s=>String(s||'').replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1');
  const out=[];
  for(const blk of t.split(/BEGIN:VCARD/i).slice(1)){
    const o={tags:[]}; FIELDS.forEach(f=>o[f]='');
    let fam='', giv='', kf='', kg='';
    for(const line of blk.split(/\r?\n/)){
      const m=/^(?:item\d+\.)?([A-Za-z\-]+)((?:;[^:]*)?):(.*)$/.exec(line); if(!m) continue;
      const key=m[1].toUpperCase(), prm=m[2].toUpperCase(); let v=m[3];
      if(/ENCODING=QUOTED-PRINTABLE/.test(prm)){ try{ v=decodeURIComponent(v.replace(/=([0-9A-F]{2})/gi,'%$1')); }catch(_){} }
      if(key==='FN') o.name=un(v);
      else if(key==='N'){ const p=v.split(';'); fam=un(p[0]); giv=un(p[1]); }
      else if(key==='X-PHONETIC-LAST-NAME') kf=un(v); else if(key==='X-PHONETIC-FIRST-NAME') kg=un(v);
      else if(key==='SORT-STRING' && !o.kana) o.kana=un(v);
      else if(key==='ORG'){ const p=v.split(/(?<!\\);/); o.company=un(p[0]); if(p[1]) o.dept=un(p[1]); }
      else if(key==='TITLE') o.title=un(v);
      else if(key==='TEL'){ const n=un(v); if(/FAX/.test(prm)) o.fax=o.fax||n; else if(/CELL|MOBILE/.test(prm)) o.mobile=o.mobile||n; else if(!o.tel) o.tel=n; else if(!o.mobile) o.mobile=n; }
      else if(key==='EMAIL' && !o.email) o.email=un(v);
      else if(key==='URL' && !o.url) o.url=un(v);
      else if(key==='ADR' && !o.addr){ const p=v.split(/(?<!\\);/).map(un); o.zip=(p[5]||'').trim(); o.addr=[p[4],p[3],p[2]].filter(Boolean).join(' ').trim(); }
      else if(key==='NOTE') o.note=un(v);
      else if(key==='CATEGORIES') o.tags=un(v).split(',').map(s=>s.trim()).filter(Boolean);
    }
    if(!o.name) o.name=[fam,giv].filter(Boolean).join(' ');
    if(kf||kg) o.kana=[kf,kg].filter(Boolean).join(' ');
    if(fam && giv && o.name.replace(/\s/g,'')===(fam+giv)) o.name=fam+' '+giv;
    o.id=uid(); o.added=today();
    if(o.name||o.company) out.push(o);
  }
  return out;
}
/* CSV・vCard から読んだものを足す（同じ人はとばす） */
function mcAddMany(list){
  let add=0, skip=0;
  for(const v of list){
    const c=mcCleanItem(v);
    if(mcFindSame(c, null)){ skip++; continue; }
    c.updated=c.added; c.ts=Date.now(); mc.items.push(c); add++;
  }
  mcSave(); return {add, skip};
}
async function mcImport(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  let text=''; try{ text=await f.text(); }catch(_){ toast('ファイルを読めませんでした'); return; }
  if(/BEGIN:VCARD/i.test(text)){
    const r=mcAddMany(mcFromVcf(text)); mcCloseSub(); mcRender();
    toast('vCard から '+r.add+'人 足しました'+(r.skip?'（同じ人 '+r.skip+'人はとばしました）':'')); return;
  }
  let o=null; try{ o=JSON.parse(text); }catch(_){}
  if(o){
    const d=o.type==='meishi' ? o.data : o.meishi, pics=o.type==='meishi' ? o.pics : o.meishiPics;
    if(!d || !Array.isArray(d.items)){ toast('名刺管理のファイルではありません'); return; }
    const r=await mcMerge(d, pics); mcCloseSub(); mcRender();
    toast('読み込みました（足した '+r.add+'枚・新しくした '+r.upd+'枚）'); return;
  }
  const list=mcFromCsv(text);
  if(!list){ toast('CSV の見出し（氏名・会社名など）が見つかりませんでした'); return; }
  const r=mcAddMany(list); mcCloseSub(); mcRender();
  toast('CSV から '+r.add+'枚 足しました'+(r.skip?'（同じ人 '+r.skip+'人はとばしました）':''));
}
async function mcWipe(){
  if(!mc.items.length){ toast('入っている名刺はありません'); return; }
  if(!await appConfirm('名刺を ぜんぶ（'+mc.items.length+'枚・写真も）消しますか？\n元に戻せません。','ぜんぶ消す','やめる')) return;
  for(const x of mc.items) for(const s of ['f','b']) mcPicDel(x.id+'_'+s);
  mc.items=[]; for(const k in mcPics) delete mcPics[k]; mcSave(); mcCloseSub(); mcRender(); toast('消しました');
}
/* 表電卓の📋リストの読み込みから（開いていなくても、保存してあるものに合わせる） */
async function mcMergeStored(d, pics){ mcLoad(); const r=await mcMerge(d, pics); if($('meishiOverlay') && isDlgOpen('meishiOverlay')) mcRender(); return r; }

Object.assign(window, { openMeishi, closeMeishi, mcSetQ, mcSetView, mcSetTag, mcView, mcCloseView, mcFlipOrBig, mcShowBig, mcToggleFav,
  mcAddPhoto, mcEdit, mcEdSave, mcCloseEd, mcCloseSub, mcRemove, mcPickSide, mcPickPhoto, mcClearPic, mcNewTag, mcOpenPaste, mcApplyPaste,
  mcContact, mcShare, mcOpenMenu, mcPrint, mcCsv, mcVcfAll, mcExport, mcImport, mcWipe, mcMerge, mcMergeStored, mcPicsAll,
  mcParse, mcSearch, mcNorm, mcVcard, mcFromCsv, mcFromVcf, mcAddMany, mcFindSameTest:v=>mcFindSame(v,null), mcState:()=>mc });
})();
