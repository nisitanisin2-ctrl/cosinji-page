/* 🏨 お客様向け案内ページ（v455。表電卓の道具。はじめて開いたときに読む）
   旅館・民宿が、お客様のスマホで見てもらう案内ページを作る。
   ・宿の名前・電話と、「館内のご案内」「ゲレンデ（冬）」「夏のあそび」「周辺のお店」などの項目を入れる。
     項目ごとに 通年／冬だけ／夏だけ を決めると、ページは今の季節の項目を先に見せる（切りかえもできる）。
   ・本文は1行ずつ。「・」で始めると箇条書き、電話番号は押すとかけられ、https:// は押すと開く、
     「地図:〇〇」は地図アプリで〇〇をさがす。
   ・📱 で、お客様のスマホの大きさで見た目をたしかめる。⬇ で1つの HTML ファイルに書き出す
     （Netlify などに置くと、お客様が見られるアドレスになる）。置いたアドレスを入れると、客室に置く QR コードのカードを印刷できる。
   ・作ったものは端末の中（excalc_annai）だけ。書き出したページには、入れたことがそのまま載る（Wi-Fi のパスワードなどは載せてよいか考えて入れる）。 */
(function(){
const AN_KEY='excalc_annai';
const AN_SEASONS={all:'通年', winter:'冬', summer:'夏'};
const AN_ICONS=['🏨','🛁','🍽','📶','🕐','⛷','🎿','🚡','🏔','🥾','🚣','🎣','🌻','🍜','🛍','🚌','🚗','🗺','☎','🚨','♨','🅿','🧺','🐾','🎁','ℹ'];
let an=null, anEdId=null;

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };

/* はじめの見本（旅館の方が自分のものに書きかえる） */
function anDefault(){
  const S=(icon,title,season,body)=>({id:uid(), icon, title, season, body, open:false});
  return { v:1, name:'（宿の名前）', tagline:'ようこそお越しくださいました', tel:'', color:'#1b5e8f', url:'', updated:today(),
    sections:[
      S('🏨','館内のご案内','all','チェックイン　15:00〜\nチェックアウト　10:00まで\n・ご夕食　18:00〜（1階 食事処）\n・ご朝食　7:30〜9:00\n・門限はございません。遅くなるときはお電話ください'),
      S('♨','お風呂','all','・大浴場　15:00〜23:00／6:00〜9:00\n・男湯と女湯は毎朝入れかわります\n・タオルはお部屋のものをお持ちください'),
      S('📶','Wi-Fi','all','ネットワーク名　（ここに入れる）\nパスワード　（ここに入れる）'),
      S('⛷','ゲレンデ・リフト','winter','・ゲレンデまで歩いて5分\n・リフト券はフロントで割引券をお渡しします\n・スキー・ボードは玄関横の乾燥室へ（ブーツは乾燥機にかけられます）\n・ゲレンデ情報 https://example.com'),
      S('🎿','レンタル','winter','・板・ブーツ・ウェア・ヘルメットを貸し出しています\n・前日の夜までにフロントへお申し付けください'),
      S('🥾','夏のあそび','summer','・トレッキング（初心者向けコースあり）\n・ラフティング・カヌー（予約制）\n・夜の星空観察（晴れた日の20時〜）\n・お申し込みはフロントへ'),
      S('🍜','周辺のお店','all','・〇〇食堂（そば・定食）　歩いて3分　地図:〇〇食堂\n・コンビニ　歩いて8分'),
      S('🚌','送迎・交通','all','・最寄り駅から送迎します（前日までにご予約ください）\n・バス停「〇〇」まで歩いて2分'),
      S('🚨','緊急のとき','all','・フロント（夜間もつながります）\n・消防・救急 119　警察 110\n・近くの病院　〇〇診療所 0000-00-0000'),
    ] };
}
function anClean(o){
  const d=anDefault();
  if(!o || typeof o!=='object' || !Array.isArray(o.sections)) return d;
  return { v:1, name:String(o.name||'').slice(0,60), tagline:String(o.tagline||'').slice(0,120), tel:String(o.tel||'').slice(0,30),
    color:/^#[0-9a-f]{6}$/i.test(o.color)?o.color:d.color, url:String(o.url||'').slice(0,400), updated:String(o.updated||today()).slice(0,10),
    sections:o.sections.filter(s=>s && typeof s==='object').slice(0,40).map(s=>({ id:typeof s.id==='string'?s.id:uid(), icon:String(s.icon||'ℹ').slice(0,4),
      title:String(s.title||'').slice(0,40), season:AN_SEASONS[s.season]?s.season:'all', body:String(s.body||'').slice(0,4000), open:!!s.open })) };
}
function anLoad(){ try{ an=anClean(JSON.parse(localStorage.getItem(AN_KEY)||'null')); }catch(_){ an=anDefault(); } }
function anSave(){ an.updated=today(); try{ localStorage.setItem(AN_KEY, JSON.stringify(an)); }catch(_){ toast('端末の空きが足りず、保存できませんでした'); } }

/* ── 本文を HTML に（1行ずつ。箇条書き・電話・リンク・地図） ── */
function anLine(t){
  let h=esc(t);
  h=h.replace(/(https?:\/\/[^\s<]+)/g, u=>`<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//,'').replace(/\/$/,'')}</a>`);
  h=h.replace(/地図[:：]\s*([^\s　<]+)/g, (m,q)=>`<a class="map" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(q.replace(/&amp;/g,'&'))}" target="_blank" rel="noopener">📍地図</a>`);
  h=h.replace(/(^|[^\d\-])(0\d{1,4}-\d{1,4}-\d{3,4}|1[01]9|110)(?![\d\-])/g, (m,p,n)=>`${p}<a class="tel" href="tel:${n.replace(/-/g,'')}">${n}</a>`);
  return h;
}
function anBodyHtml(body){
  const lines=String(body||'').split('\n'), out=[]; let ul=false;
  for(const raw of lines){
    const t=raw.trim();
    if(!t){ if(ul){ out.push('</ul>'); ul=false; } continue; }
    if(/^[・\-•]/.test(t)){ if(!ul){ out.push('<ul>'); ul=true; } out.push('<li>'+anLine(t.replace(/^[・\-•]\s*/,''))+'</li>'); }
    else { if(ul){ out.push('</ul>'); ul=false; } out.push('<p>'+anLine(t)+'</p>'); }
  }
  if(ul) out.push('</ul>');
  return out.join('');
}

/* ── お客様が見るページ（1つの HTML。外のものは何も読まない） ── */
function anPageHtml(d){
  d=d||an;
  const c=d.color;
  const secs=d.sections.map(s=>`<details class="sec" data-s="${s.season}"${s.open?' open':''}><summary><span class="ic">${esc(s.icon)}</span><span class="tt">${esc(s.title)}</span>${s.season!=='all'?`<span class="sz ${s.season}">${AN_SEASONS[s.season]}</span>`:''}</summary><div class="bd">${anBodyHtml(s.body)}</div></details>`).join('');
  const hasW=d.sections.some(s=>s.season==='winter'), hasS=d.sections.some(s=>s.season==='summer');
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(d.name)}｜ご案内</title><meta name="theme-color" content="${c}">
<style>
:root{--c:${c};--bg:#f5f6f8;--card:#fff;--ink:#222;--sub:#6b7280;--line:#e3e6ea}
@media (prefers-color-scheme:dark){:root{--bg:#15171a;--card:#1f2226;--ink:#eceef1;--sub:#9aa1ab;--line:#30343a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;line-height:1.7;-webkit-text-size-adjust:100%}
header{background:var(--c);color:#fff;padding:calc(18px + env(safe-area-inset-top)) 18px 16px}
header h1{margin:0;font-size:22px;line-height:1.35}header p{margin:4px 0 0;opacity:.92;font-size:14px}
.call{display:inline-block;margin-top:10px;background:#fff;color:var(--c);font-weight:bold;text-decoration:none;border-radius:20px;padding:6px 14px;font-size:14px}
nav{position:sticky;top:0;z-index:2;display:flex;gap:6px;padding:10px 12px;background:var(--bg);border-bottom:1px solid var(--line)}
nav button{flex:1;min-width:0;height:38px;padding:0 4px;border-radius:19px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:14px;font-weight:bold;white-space:nowrap}
nav button.on{background:var(--c);border-color:var(--c);color:#fff}
main{max-width:640px;margin:0 auto;padding:12px 12px calc(28px + env(safe-area-inset-bottom))}
.sec{background:var(--card);border:1px solid var(--line);border-radius:14px;margin:0 0 10px;overflow:hidden}
.sec[hidden]{display:none}
summary{display:flex;align-items:center;gap:10px;padding:14px 14px;font-size:17px;font-weight:bold;cursor:pointer;list-style:none}
summary::-webkit-details-marker{display:none}summary::after{content:"＋";margin-left:auto;color:var(--sub);font-weight:normal}
details[open] summary::after{content:"−"}
.ic{font-size:22px;width:28px;text-align:center}.tt{flex:1;min-width:0}
.sz{font-size:11px;padding:1px 8px;border-radius:10px;color:#fff;font-weight:bold}.sz.winter{background:#1e88e5}.sz.summer{background:#43a047}
.bd{padding:0 16px 14px 16px;font-size:15.5px;overflow-wrap:anywhere}.bd p{margin:4px 0}.bd ul{margin:4px 0;padding-left:1.2em}.bd li{margin:3px 0}
a{color:var(--c)}@media (prefers-color-scheme:dark){a{color:#8ab4f8}}
a.tel,a.map{font-weight:bold}
footer{text-align:center;color:var(--sub);font-size:12px;padding:8px 0 20px}
</style></head><body>
<header><h1>${esc(d.name)}</h1>${d.tagline?`<p>${esc(d.tagline)}</p>`:''}${d.tel?`<a class="call" href="tel:${esc(d.tel.replace(/[^\d+]/g,''))}">☎ フロントに電話 ${esc(d.tel)}</a>`:''}</header>
${hasW||hasS?`<nav id="nav"><button data-v="now">今の季節</button>${hasW?'<button data-v="winter">❄ 冬</button>':''}${hasS?'<button data-v="summer">☀ 夏</button>':''}<button data-v="all">全部</button></nav>`:''}
<main id="main">${secs}</main>
<footer>最終更新 ${esc(d.updated)}</footer>
<script>
(function(){var m=new Date().getMonth()+1,now=(m>=12||m<=4)?'winter':'summer';
function show(v){var s=v==='now'?now:v;[].forEach.call(document.querySelectorAll('.sec'),function(e){var x=e.getAttribute('data-s');e.hidden=!(s==='all'||x==='all'||x===s);});
[].forEach.call(document.querySelectorAll('nav button'),function(b){b.className=b.getAttribute('data-v')===v?'on':'';});}
var n=document.getElementById('nav');if(n){n.addEventListener('click',function(e){var b=e.target.closest('button');if(b)show(b.getAttribute('data-v'));});show('now');}})();
</script></body></html>`;
}

/* ── 作る画面 ── */
const AN_CSS=`
#annaiOverlay .an-modal{ display:flex; flex-direction:column; }
.an-body{ flex:1; min-height:0; overflow:auto; padding:10px 12px calc(16px + var(--safe-bottom,0px)); }
.an-f{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:7px 0; }
.an-f input,.an-f select,.an-f textarea{ display:block; width:100%; box-sizing:border-box; margin-top:4px; min-height:40px; padding:6px 10px; font-size:16px;
  border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
.an-f textarea{ min-height:180px; resize:vertical; line-height:1.6; }
.an-row{ display:flex; gap:8px; align-items:flex-end; } .an-row > *{ flex:1; min-width:0; }
.an-row .an-col{ flex:none; width:64px; }
.an-sec{ font-size:13px; font-weight:bold; margin:16px 0 6px; padding-bottom:3px; border-bottom:1px solid rgba(120,132,156,.3); }
.an-item{ display:flex; align-items:center; gap:8px; padding:9px 8px; margin-bottom:6px; border:1px solid rgba(120,132,156,.3); border-radius:10px; cursor:pointer; background:var(--modal-bg,#fff); }
.an-item .ic{ font-size:20px; width:26px; text-align:center; }
.an-item .tt{ flex:1; min-width:0; font-weight:bold; font-size:14.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.an-item .tt small{ display:block; font-weight:normal; font-size:11.5px; color:var(--text-light,#888); overflow:hidden; text-overflow:ellipsis; }
.an-item .sz{ font-size:11px; padding:1px 7px; border-radius:9px; color:#fff; background:#78909c; flex:none; }
.an-item .sz.winter{ background:#1e88e5; } .an-item .sz.summer{ background:#43a047; }
.an-item button{ flex:none; width:32px; height:32px; border-radius:8px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#333); cursor:pointer; }
.an-btn{ display:block; width:100%; height:44px; margin:8px 0 0; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; }
.an-btn.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.an-btn.del{ background:transparent; color:#d32f2f; border:1px solid rgba(211,47,47,.45); }
.an-note{ font-size:12px; color:var(--text-light,#888); line-height:1.65; margin:6px 0; }
.an-icons{ display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
.an-icons button{ width:36px; height:36px; font-size:19px; border-radius:8px; border:1px solid rgba(120,132,156,.3); background:transparent; cursor:pointer; }
.an-icons button.on{ border:2px solid var(--acc); background:rgba(33,115,70,.10); }
.an-seg{ display:flex; gap:6px; margin-top:4px; }
.an-seg button{ flex:1; height:36px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-weight:bold; cursor:pointer; }
.an-seg button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.an-prev{ display:block; width:100%; max-width:390px; height:min(70vh,700px); margin:6px auto; border:8px solid #222; border-radius:26px; background:#fff; }
.an-qr{ text-align:center; } .an-qr svg{ width:220px; height:220px; background:#fff; padding:6px; border-radius:8px; }
.an-warn{ background:#fff8e1; color:#5d4037; border-radius:8px; padding:8px 10px; font-size:12.5px; margin:6px 0; line-height:1.6; }
body.dark .an-warn{ background:#3e3420; color:#ffe0a3; }
#printArea .an-card{ display:grid; grid-template-columns:1fr 1fr; gap:8mm; }
#printArea .an-card > div{ border:1px dashed #999; border-radius:4mm; padding:6mm; text-align:center; font-family:sans-serif; color:#000; break-inside:avoid; }
#printArea .an-card h2{ font-size:16pt; margin:0 0 2mm; } #printArea .an-card p{ font-size:10.5pt; margin:1mm 0; }
#printArea .an-card svg{ width:45mm; height:45mm; margin:2mm auto; display:block; }
`;
function anEnsureDom(){
  if($('annaiOverlay')) return;
  const st=document.createElement('style'); st.id='anStyle'; st.textContent=AN_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="annaiOverlay">
  <div class="modal vol-modal an-modal">
    <div class="modal-header"><span>🏨 お客様向け案内ページ</span><button class="modal-close" onclick="closeAnnai()" aria-label="閉じる">✕</button></div>
    <div class="an-body" id="anBody"></div>
  </div>
</div>
<div class="modal-overlay" id="anEdOverlay" onclick="if(event.target===this)anCloseEd()">
  <div class="modal"><div class="modal-header"><span id="anEdHdr">項目</span><button class="modal-close" onclick="anCloseEd()" aria-label="閉じる">✕</button></div>
    <div class="an-body" id="anEdBody"></div></div>
</div>
<div class="modal-overlay" id="anPvOverlay" onclick="if(event.target===this)anClosePv()">
  <div class="modal"><div class="modal-header"><span id="anPvHdr">📱 お客様のスマホでの見え方</span><button class="modal-close" onclick="anClosePv()" aria-label="閉じる">✕</button></div>
    <div class="an-body" id="anPvBody"></div></div>
</div>
<input type="file" id="anFileIn" accept=".json,application/json" hidden onchange="anImport(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof bindNpToolSwipe==='function') bindNpToolSwipe('annaiOverlay');
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openAnnai(){ anEnsureDom(); anLoad(); openDlg('annaiOverlay'); anRender(); }
function closeAnnai(){ if(!isDlgOpen('annaiOverlay')) return; anCloseEd(); anClosePv(); closeDlg('annaiOverlay'); }

function anRender(){
  const b=$('anBody'), st=b.scrollTop;
  b.innerHTML=`
    <div class="an-note">お客様が客室の QR コードをスマホで読むと見られる案内ページを作ります。下の項目を自分の宿のことに書きかえて、<b>📱 見え方</b>でたしかめ、<b>⬇ 書き出す</b>でページのファイルを作ります。</div>
    <div class="an-sec">宿のこと</div>
    <label class="an-f">宿の名前<input id="anName" maxlength="60" value="${esc(an.name)}" onchange="anSetTop('name',this.value)"></label>
    <label class="an-f">ひとこと（名前の下に出ます）<input id="anTag" maxlength="120" value="${esc(an.tagline)}" onchange="anSetTop('tagline',this.value)"></label>
    <div class="an-row"><label class="an-f">フロントの電話（押すとかけられます）<input id="anTel" type="tel" maxlength="30" value="${esc(an.tel)}" onchange="anSetTop('tel',this.value)" placeholder="例：0260-00-0000"></label>
      <label class="an-f an-col">色<input id="anColor" type="color" value="${esc(an.color)}" onchange="anSetTop('color',this.value)" style="padding:2px"></label></div>
    <div class="an-sec">項目（上から順に出ます）</div>
    ${an.sections.map((s,i)=>`<div class="an-item" onclick="anEdit('${s.id}')"><span class="ic">${esc(s.icon)}</span>
      <span class="tt">${esc(s.title||'（見出しなし）')}<small>${esc(String(s.body).split('\n')[0]||'')}</small></span>
      <span class="sz ${s.season}">${AN_SEASONS[s.season]}</span>
      <button onclick="event.stopPropagation();anMove('${s.id}',-1)" ${i===0?'disabled':''} aria-label="上へ">↑</button><button onclick="event.stopPropagation();anMove('${s.id}',1)" ${i===an.sections.length-1?'disabled':''} aria-label="下へ">↓</button></div>`).join('')}
    <button class="an-btn sub" onclick="anEdit(null)">＋ 項目を足す</button>
    <div class="an-note">本文は1行ずつ書きます。「<b>・</b>」で始めると箇条書き、<b>電話番号</b>（0260-00-0000）は押すとかけられ、<b>https://</b> で始まるアドレスは押すと開き、「<b>地図:〇〇</b>」は地図で〇〇をさがすボタンになります。<br>冬・夏の項目は、お客様のページで<b>いまの季節のものだけ</b>先に出ます（12〜4月は冬、5〜11月は夏。ボタンで切りかえられます）。</div>
    <div class="an-sec">たしかめる・書き出す</div>
    <button class="an-btn" onclick="anPreview()">📱 お客様のスマホでの見え方</button>
    <button class="an-btn sub" onclick="anExportHtml()">⬇ ページを書き出す（index.html）</button>
    <div class="an-note">書き出した <b>index.html</b> を、Netlify（app.netlify.com の Deploy manually）などに置くと、お客様が見られるアドレスになります。項目を直したら、書き出して置き直してください。<br>
      <b>ページに書いたことは、アドレスを知っている人なら誰でも見られます。</b>Wi-Fi のパスワードなどを載せるかは、よく考えて入れてください。</div>
    <div class="an-sec">客室に置く QR コード</div>
    <label class="an-f">ページを置いたアドレス<input id="anUrl" type="url" value="${esc(an.url)}" placeholder="https://〇〇.netlify.app/" onchange="anSetTop('url',this.value)" autocapitalize="off" spellcheck="false"></label>
    <button class="an-btn sub" onclick="anShowQr()">🔳 QR コードを出す・印刷する</button>
    <div class="an-sec">そのほか</div>
    <button class="an-btn sub" onclick="anExportJson()">💾 作りかけを保存（.json）</button>
    <button class="an-btn sub" onclick="document.getElementById('anFileIn').click()">📂 保存したものを開く</button>
    <button class="an-btn del" onclick="anReset()">↺ 見本に戻す</button>`;
  b.scrollTop=st;
}
function anSetTop(k,v){
  v=String(v).trim();
  if(k==='url' && v && !/^https?:\/\//i.test(v)) v='https://'+v;
  an[k]=v; anSave();
  if(k==='url'){ const e=$('anUrl'); if(e) e.value=v; }
}
function anMove(id,dir){ const i=an.sections.findIndex(s=>s.id===id), j=i+dir; if(i<0||j<0||j>=an.sections.length) return; [an.sections[i],an.sections[j]]=[an.sections[j],an.sections[i]]; anSave(); anRender(); }

function anEdit(id){
  const s=id ? an.sections.find(x=>x.id===id) : {id:'', icon:'ℹ', title:'', season:'all', body:'', open:false};
  if(!s) return;
  anEdId=id;
  $('anEdHdr').textContent=id?'項目を直す':'項目を足す';
  $('anEdBody').innerHTML=`
    <label class="an-f">見出し<input id="anETitle" maxlength="40" value="${esc(s.title)}" placeholder="例：お風呂・ゲレンデ・周辺のお店"></label>
    <div class="an-f">しるし<div class="an-icons" id="anEIcons">${AN_ICONS.map(ic=>`<button type="button" class="${ic===s.icon?'on':''}" onclick="document.querySelectorAll('#anEIcons button').forEach(x=>x.classList.toggle('on',x===this))">${ic}</button>`).join('')}</div></div>
    <div class="an-f">出す季節<div class="an-seg" id="anESeason">${Object.entries(AN_SEASONS).map(([k,l])=>`<button type="button" data-s="${k}" class="${k===s.season?'on':''}" onclick="document.querySelectorAll('#anESeason button').forEach(x=>x.classList.toggle('on',x===this))">${k==='winter'?'❄ ':k==='summer'?'☀ ':''}${l}</button>`).join('')}</div></div>
    <label class="an-f">本文（1行ずつ。「・」で箇条書き）<textarea id="anEBody" maxlength="4000">${esc(s.body)}</textarea></label>
    <label class="an-f" style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text,#333)"><input type="checkbox" id="anEOpen" style="width:22px;min-height:22px;margin:0"${s.open?' checked':''}> はじめから開いておく（大事な項目に）</label>
    <button class="an-btn" onclick="anEdSave()">保存する</button>
    ${id?'<button class="an-btn del" onclick="anEdDelete()">🗑 この項目を消す</button>':''}
    <button class="an-btn sub" onclick="anCloseEd()">やめる</button>`;
  openDlg('anEdOverlay', ()=>{ anEdId=null; });
  if(!id) setTimeout(()=>{ const e=$('anETitle'); if(e) e.focus(); }, 60);
}
function anEdSave(){
  const title=$('anETitle').value.trim();
  if(!title){ toast('見出しを入れてください'); $('anETitle').focus(); return; }
  const s={ id:anEdId||uid(), title, icon:(document.querySelector('#anEIcons button.on')||{}).textContent||'ℹ',
    season:(document.querySelector('#anESeason button.on')||{}).dataset?.s||'all', body:$('anEBody').value, open:$('anEOpen').checked };
  const i=an.sections.findIndex(x=>x.id===s.id);
  if(i>=0) an.sections[i]=s; else an.sections.push(s);
  anSave(); anCloseEd(); anRender(); toast('保存しました');
}
async function anEdDelete(){
  const s=an.sections.find(x=>x.id===anEdId); if(!s) return;
  if(!await appConfirm('「'+s.title+'」の項目を消しますか？','消す','やめる')) return;
  an.sections=an.sections.filter(x=>x.id!==s.id); anSave(); anCloseEd(); anRender();
}
function anCloseEd(){ closeDlg('anEdOverlay', ()=>{ anEdId=null; }); }

/* 見え方（お客様のスマホの大きさで） */
function anPreview(){
  $('anPvHdr').textContent='📱 お客様のスマホでの見え方';
  $('anPvBody').innerHTML='<iframe class="an-prev" id="anPvFrame" title="案内ページの見え方"></iframe><div class="an-note" style="text-align:center">項目を押すと開きます。上の季節のボタンも押せます。</div>';
  openDlg('anPvOverlay');
  $('anPvFrame').srcdoc=anPageHtml();
}
function anClosePv(){ closeDlg('anPvOverlay'); }
function anDownload(name, text, type){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([text],{type})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function anExportHtml(){ anDownload('index.html', anPageHtml(), 'text/html;charset=utf-8'); toast('index.html を書き出しました。Netlify などに置くと、お客様が見られます', 4000); }
function anExportJson(){ anDownload('案内ページ_'+today()+'.json', JSON.stringify({app:'hyodenki', type:'annai', version:1, data:an}), 'application/json'); }
async function anImport(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  let o=null; try{ o=JSON.parse(await f.text()); }catch(_){}
  const d=o && (o.type==='annai' ? o.data : o.annai);
  if(!d || !Array.isArray(d.sections)){ toast('案内ページのファイルではありません'); return; }
  if(!await appConfirm('いま作っている案内ページと置きかえますか？','置きかえる','やめる')) return;
  an=anClean(d); anSave(); anRender(); toast('開きました');
}
async function anReset(){
  if(!await appConfirm('いま作っている案内ページを消して、見本に戻しますか？','見本に戻す','やめる')) return;
  an=anDefault(); anSave(); anRender();
}

/* QR コード（表電卓の qrEncode を使う）。SVG で出して、客室に置くカードを印刷できる */
function anQrSvg(text){
  const q=typeof qrEncode==='function' ? qrEncode(text,'M') : null; if(!q) return '';
  const n=q.size+8; let p='';
  for(let y=0;y<q.size;y++) for(let x=0;x<q.size;x++) if(q.modules[y][x]) p+=`M${x+4} ${y+4}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${p}" fill="#000"/></svg>`;
}
function anShowQr(){
  const u=(an.url||'').trim();
  if(!/^https?:\/\/\S+\.\S+/.test(u)){ toast('先に、ページを置いたアドレス（https://〜）を入れてください'); const e=$('anUrl'); if(e) e.focus(); return; }
  const svg=anQrSvg(u);
  $('anPvHdr').textContent='🔳 客室に置く QR コード';
  $('anPvBody').innerHTML=`<div class="an-qr">${svg}<div class="an-note" style="text-align:center;overflow-wrap:anywhere">${esc(u)}</div></div>
    ${/localhost|127\.0|192\.168\./.test(u)?'<div class="an-warn">このアドレスはこの端末の中だけのものです。インターネットに置いたアドレスを入れてください。</div>':''}
    <div class="an-note">スマホのカメラで読んで、ページが開くかたしかめてから印刷してください。</div>
    <button class="an-btn" onclick="anPrintCards()">🖨 カードを印刷（A4 に4枚）</button>`;
  openDlg('anPvOverlay');
}
function anPrintCards(){
  const u=an.url, svg=anQrSvg(u);
  const card=`<div><h2>${esc(an.name)}</h2><p>スマホのカメラで読み取ると<br><b>館内のご案内</b>がご覧いただけます</p>${svg}<p style="font-size:9pt">Wi-Fi・お風呂・お食事・周辺のご案内</p></div>`;
  const html=`<div class="an-card">${card.repeat(4)}</div>`;
  if(typeof opBuild==='function' && typeof opPrint==='function') opPrint(opBuild(html, true)); else window.print();
}

Object.assign(window, { openAnnai, closeAnnai, anSetTop, anMove, anEdit, anEdSave, anEdDelete, anCloseEd, anPreview, anClosePv,
  anExportHtml, anExportJson, anImport, anReset, anShowQr, anPrintCards, anPageHtml, anBodyHtml, anState:()=>an, anQrSvg });
})();
