/* 🧳 旅のしおり（v579。表電卓の道具。apps/shiori/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   旅行ごとに、日程・持ち物・お金（予算と 使った お金）・お土産・宿と 連絡先・外貨の 換算 を 1つに まとめる。
   ・🗓 日程：出発日〜帰る日の 1日ずつに 時刻と 予定（場所・メモ）。済んだら ✓。日にちを かえても 予定は 消えない（「日にちの 外」に 出る）。
   ・🎒 持ち物：分け（貴重品・衣類・洗面と 薬・電子機器・そのほか）ごとに ✓。国内／海外の 見本から 入れる。✓ を ぜんぶ 外して 使い回しも。
   ・💴 お金：予算と 使った お金（円・外貨）の 合計と 残り。分け（交通・宿・食事・観光・お土産・そのほか）ごとの 合計。
   ・🎁 お土産：だれに・何を・いくら。買ったら ✓。
   ・🏨 宿・連絡先：宿・交通・連絡先。電話は 押すと かけられる・住所は 地図で 開ける・予約番号・チェックインの 時刻 など。
   ・💱 換算：通貨と レート（1 USD = 150 円 など 自分で 入れる。ネットには つながない）で 外貨 ⇄ 円。使った お金の 外貨も 円に。
   ・📋 文字で コピー（LINE で 共有）・🖨 印刷（A4 の しおり）。中身は excalc_shiori（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_shiori', MAX_T=30, MAX_DAYS=30, MAX_PLAN=300, MAX_PACK=200, MAX_SP=500, MAX_GIFT=200, MAX_STAY=50, MAX_YEN=999999999;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);   // onclick に 入れるので 英数字だけ
const fmt=n=>Math.round(n).toLocaleString('ja-JP');
const fmt2=n=>Number(n).toLocaleString('ja-JP', {maximumFractionDigits:2});
// 数：全角・カンマ・円・1万2千 も（表電卓の toolNum）。dec は 小数の けた
function numIn(v, a, b, dflt, dec){
  const s=String(v==null?'':v).trim(); if(s==='') return dflt;
  let n=typeof toolNum==='function' ? toolNum(s) : NaN;
  if(!isFinite(n)) n=parseFloat(s.normalize('NFKC').replace(/[,円¥￥\s$€]/g,''));
  if(!isFinite(n)) return dflt;
  const k=Math.pow(10, dec||0); return Math.min(b, Math.max(a, Math.round(n*k)/k));
}
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
function okDate(s){
  const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s||'')); if(!m) return null;
  const y=+m[1], mo=+m[2]-1, d=+m[3], t=new Date(y,mo,d);
  return (y>=1900 && y<=2200 && t.getMonth()===mo && t.getDate()===d) ? t : null;
}
const okTime=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s||'')) ? s : '';
let fixedToday=null;   // ためす とき だけ（SHIORI.today('2026-10-24')）
function today(){ const t=fixedToday ? okDate(fixedToday) : null, d=t||new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
const dayNo=d=>Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/86400000);
const diff=(a,b)=>dayNo(a)-dayNo(b);
const addDays=(d,n)=>new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
const WD='日月火水木金土';
const mdw=d=>(d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）';
const mdS=s=>{ const d=okDate(s); return d ? mdw(d) : ''; };

/* ───────── 分け・見本 ───────── */
const PCATS=[['kicho','💳 貴重品'],['irui','👕 衣類'],['senmen','🪥 洗面・薬'],['denshi','🔌 電子機器'],['hoka','🎒 そのほか']];
const PACK_JP=[['財布','kicho'],['スマホ','kicho'],['保険証','kicho'],['切符・チケット','kicho'],['宿の 予約メモ','kicho'],
  ['着替え','irui'],['下着・靴下','irui'],['パジャマ','irui'],['上着','irui'],
  ['歯ブラシ','senmen'],['タオル','senmen'],['化粧品','senmen'],['常備薬','senmen'],['めがね・コンタクト','senmen'],['マスク','senmen'],
  ['充電器','denshi'],['モバイルバッテリー','denshi'],['イヤホン','denshi'],
  ['傘','hoka'],['エコバッグ','hoka'],['ティッシュ','hoka'],['ハンカチ','hoka']];
const PACK_INTL=[['パスポート','kicho'],['航空券（eチケット）','kicho'],['クレジットカード','kicho'],['外貨','kicho'],['海外旅行保険の 書類','kicho'],['ビザ・入国の 書類','kicho'],
  ['変換プラグ','denshi'],['SIM・Wi-Fi','denshi'],['ボールペン（入国カード用）','hoka']];
const SCATS=[['kotsu','🚃 交通'],['yado','🏨 宿'],['shoku','🍴 食事'],['kanko','📷 観光'],['miyage','🎁 お土産'],['hoka','💡 そのほか']];
const KINDS=[['yado','🏨 宿'],['kotsu','🚃 交通'],['tel','📞 連絡先']];
const TABS=[['plan','🗓 日程'],['pack','🎒 持ち物'],['money','💴 お金'],['gift','🎁 お土産'],['stay','🏨 宿・連絡先'],['fx','💱 換算']];
const EMOS=['🧳','✈','🚄','🚗','🏖','♨','⛰','🏯','🎡','🗼','🌸','🍁'];
const keyOk=(list,k,d)=>list.some(x=>x[0]===k) ? k : d;
const nameOf=(list,k)=>(list.find(x=>x[0]===k)||list[list.length-1])[1];

/* ───────── 状態 ───────── */
let st=null;
function cleanT(x){
  if(!x || typeof x!=='object') return null;
  const s=okDate(x.start)||today(); let e=okDate(x.end)||s;
  if(diff(e,s)<0) e=s; if(diff(e,s)>MAX_DAYS-1) e=addDays(s, MAX_DAYS-1);
  const arr=(v,f,n)=>(Array.isArray(v) ? v : []).map(f).filter(Boolean).slice(0,n);
  const fx=(x.fx && typeof x.fx==='object') ? x.fx : {};
  return {id:okId(x.id) ? x.id : rid(), title:oneLine(x.title,40)||'旅行', emo:oneLine(x.emo,8)||'🧳', start:ymd(s), end:ymd(e), memo:multi(x.memo,300),
    plan:arr(x.plan, p=>p && typeof p==='object' && okDate(p.d) && oneLine(p.what,40) ? {id:okId(p.id) ? p.id : rid(), d:p.d, t:okTime(p.t), what:oneLine(p.what,40), place:oneLine(p.place,40), memo:oneLine(p.memo,100), ok:!!p.ok} : null, MAX_PLAN),
    pack:arr(x.pack, p=>p && typeof p==='object' && oneLine(p.name,30) ? {id:okId(p.id) ? p.id : rid(), name:oneLine(p.name,30), cat:keyOk(PCATS,p.cat,'hoka'), ok:!!p.ok} : null, MAX_PACK),
    budget:numIn(x.budget,0,MAX_YEN,0),
    spend:arr(x.spend, p=>p && typeof p==='object' && oneLine(p.what,30) ? {id:okId(p.id) ? p.id : rid(), d:okDate(p.d) ? p.d : ymd(s), what:oneLine(p.what,30), amt:numIn(p.amt,0,MAX_YEN,0,2), fx:!!p.fx, cat:keyOk(SCATS,p.cat,'hoka')} : null, MAX_SP),
    gift:arr(x.gift, p=>p && typeof p==='object' && (oneLine(p.to,20) || oneLine(p.what,30)) ? {id:okId(p.id) ? p.id : rid(), to:oneLine(p.to,20), what:oneLine(p.what,30), price:numIn(p.price,0,MAX_YEN,0), ok:!!p.ok} : null, MAX_GIFT),
    stay:arr(x.stay, p=>p && typeof p==='object' && oneLine(p.name,40) ? {id:okId(p.id) ? p.id : rid(), kind:keyOk(KINDS,p.kind,'yado'), name:oneLine(p.name,40), tel:oneLine(p.tel,20).replace(/[^0-9+\-() ]/g,''), addr:oneLine(p.addr,80), no:oneLine(p.no,30), when:oneLine(p.when,40), memo:oneLine(p.memo,100)} : null, MAX_STAY),
    fx:{code:oneLine(fx.code,6).toUpperCase()||'USD', rate:numIn(fx.rate,0,100000,0,4)}};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const trips=(Array.isArray(o.trips) ? o.trips : []).map(cleanT).filter(Boolean).slice(0,MAX_T);
  trips.forEach((t,i,a)=>{ if(a.findIndex(y=>y.id===t.id)<i) t.id=rid(); });
  st={trips, cur:trips.some(t=>t.id===o.cur) ? o.cur : (trips[0] ? trips[0].id : ''), tab:keyOk(TABS,o.tab,'plan')};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません）'); return false; } }
const T=()=>st.trips.find(t=>t.id===st.cur)||null;
function days(t){ const s=okDate(t.start), n=diff(okDate(t.end), s)+1; return Array.from({length:n}, (_,i)=>addDays(s,i)); }
function when(t){
  const s=okDate(t.start), e=okDate(t.end), n=diff(e,s), d=diff(s, today()), de=diff(e, today());
  const span=n===0 ? '日帰り' : n+'泊'+(n+1)+'日';
  const rel=d>0 ? 'あと '+d+'日' : de>=0 ? '旅の '+(1-d)+'日目' : 'おわりました';
  return {span, rel, text:mdw(s)+(n ? '〜'+mdw(e) : '')};
}
const jpy=(t,p)=>p.fx ? Math.round(p.amt*(t.fx.rate||0)) : Math.round(p.amt);
function money(t){
  const by={}; SCATS.forEach(c=>{ by[c[0]]=0; });
  let used=0; t.spend.forEach(p=>{ const y=jpy(t,p); used+=y; by[p.cat]+=y; });
  return {used, by, left:t.budget-used, noRate:t.spend.some(p=>p.fx) && !t.fx.rate};
}

/* ───────── 画面 ───────── */
function render(){
  const b=$('soBody'); if(!b) return;
  const t=T(), top=b.scrollTop;
  if(!t){
    b.innerHTML=`<div class="so-wrap"><div class="so-empty"><p>🧳 旅行ごとに、日程・持ち物・お金・お土産・宿と 連絡先・外貨の 換算 を 1つに まとめます。</p>
      <button type="button" class="so-b pri" onclick="SHIORI.newTrip()">＋ 新しい 旅を 作る</button></div></div>`;
    return;
  }
  const w=when(t);
  b.innerHTML=`<div class="so-wrap">
    <div class="so-top"><select class="so-sel" aria-label="旅を えらぶ" onchange="SHIORI.sel(this.value)">${st.trips.map(x=>`<option value="${x.id}"${x.id===t.id?' selected':''}>${esc(x.emo)} ${esc(x.title)}</option>`).join('')}</select>
      <button type="button" class="so-b" onclick="SHIORI.newTrip()">＋ 新しい 旅</button><button type="button" class="so-b" onclick="SHIORI.setup()">⚙ 旅の 設定</button></div>
    <div class="so-head"><span class="e" aria-hidden="true">${esc(t.emo)}</span><div><b>${esc(t.title)}</b><small>📅 ${esc(w.text)}・${w.span}・<b class="rel">${w.rel}</b></small></div></div>
    <div class="so-tabs" role="tablist">${TABS.map(([k,n])=>`<button type="button" role="tab" aria-selected="${st.tab===k}" class="${st.tab===k?'on':''}" onclick="SHIORI.tab('${k}')">${n}</button>`).join('')}</div>
    <div id="soMain">${({plan:planHtml, pack:packHtml, money:moneyHtml, gift:giftHtml, stay:stayHtml, fx:fxHtml}[st.tab])(t)}</div>
    <div class="so-acts"><button type="button" class="so-b" onclick="SHIORI.copy()">📋 しおりを コピー</button><button type="button" class="so-b" onclick="SHIORI.print()">🖨 印刷</button></div>
    <p class="so-note">中身は この端末の中だけに 残ります（設定の バックアップに 入ります）。外貨の レートは 自分で 入れます（ネットには つながりません）。</p>
  </div>`;
  b.scrollTop=top;
}
// 🗓 日程
function planHtml(t){
  const ds=days(t), inR=new Set(ds.map(ymd)), out=t.plan.filter(p=>!inR.has(p.d));
  const sortP=a=>a.slice().sort((x,y)=>(x.t||'99:99').localeCompare(y.t||'99:99'));
  const item=p=>`<div class="so-pl${p.ok?' ok':''}"><label class="ck"><input type="checkbox" ${p.ok?'checked':''} aria-label="済んだ" onchange="SHIORI.planOk('${p.id}', this.checked)"></label>
      <span class="tm">${esc(p.t||'—')}</span><span class="tx"><b>${esc(p.what)}</b>${p.place ? `<small>📍 ${esc(p.place)}</small>` : ''}${p.memo ? `<small>${esc(p.memo)}</small>` : ''}</span>
      <button type="button" class="so-ic" onclick="SHIORI.planEdit('${p.id}')" aria-label="${esc(p.what)}を 直す">✏</button></div>`;
  return ds.map((d,i)=>{ const k=ymd(d), L=sortP(t.plan.filter(p=>p.d===k)), isT=diff(d,today())===0;
    return `<div class="so-day${isT?' today':''}"><h5>${i+1}日目 <span>${mdw(d)}</span>${isT ? '<em>きょう</em>' : ''}</h5>
      ${L.map(item).join('')||'<p class="so-none">まだ 予定が ありません</p>'}
      <button type="button" class="so-add" onclick="SHIORI.planAdd('${k}')">＋ 予定を 足す</button></div>`; }).join('')
    +(out.length ? `<div class="so-day out"><h5>日にちの 外 <span>（旅の 日にちを かえたため）</span></h5>${sortP(out).map(p=>item(p).replace('<span class="tm">', '<span class="tm">'+esc(mdS(p.d))+' ')).join('')}</div>` : '');
}
// 🎒 持ち物
function packHtml(t){
  const n=t.pack.length, ok=t.pack.filter(p=>p.ok).length;
  return `<div class="so-prog"><b>${ok}</b> ／ ${n} 入れた<span class="bar" aria-hidden="true"><i style="width:${n ? Math.round(ok/n*100) : 0}%"></i></span></div>
    ${PCATS.map(([k,nm])=>{ const L=t.pack.filter(p=>p.cat===k); return L.length ? `<h5 class="so-h">${nm}<small>${L.filter(p=>p.ok).length}／${L.length}</small></h5>
      <div class="so-pk">${L.map(p=>`<label class="${p.ok?'ok':''}"><input type="checkbox" ${p.ok?'checked':''} onchange="SHIORI.packOk('${p.id}', this.checked)"><span>${esc(p.name)}</span><button type="button" onclick="event.preventDefault(); SHIORI.packDel('${p.id}')" aria-label="${esc(p.name)}を 消す">🗑</button></label>`).join('')}</div>` : ''; }).join('')}
    ${!n ? '<p class="so-none">下の 見本から 入れるか、自分で 足してください。</p>' : ''}
    <div class="so-form"><input id="soPkName" type="text" maxlength="30" placeholder="持ち物（例：カメラ）" aria-label="持ち物">
      <select id="soPkCat" aria-label="分け">${PCATS.map(([k,nm])=>`<option value="${k}">${nm}</option>`).join('')}</select><button type="button" class="so-b pri" onclick="SHIORI.packAdd()">＋ 足す</button></div>
    <div class="so-acts"><button type="button" class="so-b" onclick="SHIORI.packPreset('jp')">🗾 国内の 見本を 入れる</button><button type="button" class="so-b" onclick="SHIORI.packPreset('intl')">🌏 海外の 見本を 足す</button>${ok ? '<button type="button" class="so-b" onclick="SHIORI.packClear()">✓ を ぜんぶ 外す</button>' : ''}</div>`;
}
// 💴 お金
function moneyHtml(t){
  const m=money(t), T0=today(), s=okDate(t.start), e=okDate(t.end), dflt=diff(T0,s)>=0 && diff(e,T0)>=0 ? ymd(T0) : t.start;
  const max=Math.max(1, ...Object.values(m.by));
  return `<label class="so-f"><span>予算</span><input type="text" inputmode="numeric" value="${t.budget ? fmt(t.budget) : ''}" placeholder="0" aria-label="予算" onchange="SHIORI.budget(this.value)"><em>円</em></label>
    <div class="so-msum"><div>使った <b>${fmt(m.used)}円</b>${t.budget ? ` ／ 予算 ${fmt(t.budget)}円` : ''}</div>
      ${t.budget ? `<div class="${m.left<0?'over':'left'}">${m.left<0 ? '⚠ 予算を '+fmt(-m.left)+'円 こえています' : '残り <b>'+fmt(m.left)+'円</b>'}</div><span class="bar${m.left<0?' over':''}" aria-hidden="true"><i style="width:${Math.min(100, Math.round(m.used/t.budget*100))}%"></i></span>` : ''}
      ${m.noRate ? '<div class="over">⚠ 外貨の レートが ありません（💱 換算で 入れてください）</div>' : ''}</div>
    <div class="so-cats">${SCATS.map(([k,nm])=>`<div><span>${nm}</span><span class="bar" aria-hidden="true"><i style="width:${Math.round(m.by[k]/max*100)}%"></i></span><b>${fmt(m.by[k])}円</b></div>`).join('')}</div>
    <h5 class="so-h">使った お金を 入れる</h5>
    <div class="so-form wrap"><input id="soSpWhat" type="text" maxlength="30" placeholder="何に（例：昼ごはん）" aria-label="何に">
      <input id="soSpAmt" type="text" inputmode="decimal" placeholder="金額" aria-label="金額">
      <span class="so-seg"><button type="button" id="soSpJpy" class="on" onclick="SHIORI.spCur(false)">円</button><button type="button" id="soSpFx" onclick="SHIORI.spCur(true)">${esc(t.fx.code)}</button></span>
      <select id="soSpCat" aria-label="分け">${SCATS.map(([k,nm])=>`<option value="${k}">${nm}</option>`).join('')}</select>
      <input id="soSpDate" type="date" value="${dflt}" aria-label="日付"><button type="button" class="so-b pri" onclick="SHIORI.spAdd()">＋ 入れる</button></div>
    ${t.spend.length ? `<div class="so-list">${t.spend.slice().sort((a,b)=>b.d.localeCompare(a.d)).map(p=>`<div class="so-sp"><span class="d">${esc(mdS(p.d))}</span><span class="tx"><b>${esc(p.what)}</b><small>${nameOf(SCATS,p.cat)}</small></span>
      <span class="a">${p.fx ? `<small>${fmt2(p.amt)} ${esc(t.fx.code)}</small>` : ''}<b>${fmt(jpy(t,p))}円</b></span><button type="button" class="so-ic" onclick="SHIORI.spDel('${p.id}')" aria-label="${esc(p.what)}を 消す">🗑</button></div>`).join('')}</div>` : '<p class="so-none">まだ ありません</p>'}`;
}
// 🎁 お土産
function giftHtml(t){
  const n=t.gift.length, ok=t.gift.filter(g=>g.ok), sum=t.gift.reduce((a,g)=>a+g.price,0), sumOk=ok.reduce((a,g)=>a+g.price,0);
  return `<div class="so-prog"><b>${ok.length}</b> ／ ${n} 買った${sum ? `<small>　予定 ${fmt(sum)}円・買った ${fmt(sumOk)}円</small>` : ''}</div>
    ${n ? `<div class="so-list">${t.gift.map(g=>`<div class="so-gf${g.ok?' ok':''}"><label class="ck"><input type="checkbox" ${g.ok?'checked':''} aria-label="買った" onchange="SHIORI.giftOk('${g.id}', this.checked)"></label>
      <span class="tx"><b>${esc(g.to||'—')}</b><small>${esc(g.what)}</small></span><span class="a">${g.price ? fmt(g.price)+'円' : ''}</span><button type="button" class="so-ic" onclick="SHIORI.giftDel('${g.id}')" aria-label="消す">🗑</button></div>`).join('')}</div>` : '<p class="so-none">まだ ありません</p>'}
    <div class="so-form wrap"><input id="soGfTo" type="text" maxlength="20" placeholder="だれに（例：会社）" aria-label="だれに"><input id="soGfWhat" type="text" maxlength="30" placeholder="何を（例：おまんじゅう）" aria-label="何を">
      <input id="soGfPrice" type="text" inputmode="numeric" placeholder="予算（円）" aria-label="予算"><button type="button" class="so-b pri" onclick="SHIORI.giftAdd()">＋ 足す</button></div>`;
}
// 🏨 宿・連絡先
function stayHtml(t){
  return (t.stay.length ? `<div class="so-list">${t.stay.map(c=>`<div class="so-st"><div class="h"><span>${nameOf(KINDS,c.kind)}</span><b>${esc(c.name)}</b><button type="button" class="so-ic" onclick="SHIORI.stayEdit('${c.id}')" aria-label="${esc(c.name)}を 直す">✏</button></div>
      ${c.when ? `<div>🕒 ${esc(c.when)}</div>` : ''}${c.no ? `<div>🔖 予約番号 <b>${esc(c.no)}</b></div>` : ''}
      ${c.tel ? `<div>📞 <a href="tel:${esc(c.tel.replace(/[^0-9+]/g,''))}">${esc(c.tel)}</a></div>` : ''}
      ${c.addr ? `<div>📍 ${esc(c.addr)} <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.addr)}" target="_blank" rel="noopener">地図</a></div>` : ''}
      ${c.memo ? `<div class="m">${esc(c.memo)}</div>` : ''}</div>`).join('')}</div>` : '<p class="so-none">宿・乗り物・連絡先を 入れておくと、電話や 地図が すぐ 開けます。</p>')
    +`<div class="so-acts"><button type="button" class="so-b pri" onclick="SHIORI.stayAdd()">＋ 宿・連絡先を 足す</button></div>`;
}
// 💱 換算
function fxHtml(t){
  const r=t.fx.rate, Q=[1,5,10,20,50,100,500,1000];
  return `<div class="so-f"><span>通貨</span><input type="text" maxlength="6" value="${esc(t.fx.code)}" aria-label="通貨" onchange="SHIORI.fx('code', this.value)" style="flex:0 1 7em"></div>
    <label class="so-f"><span>レート</span><em>1 ${esc(t.fx.code)} ＝</em><input type="text" inputmode="decimal" value="${r||''}" placeholder="例：150.25" aria-label="レート" onchange="SHIORI.fx('rate', this.value)"><em>円</em></label>
    ${r ? `<div class="so-conv"><label><input id="soFxA" type="text" inputmode="decimal" placeholder="0" aria-label="外貨" oninput="SHIORI.conv('a')"><em>${esc(t.fx.code)}</em></label><span aria-hidden="true">⇄</span>
      <label><input id="soFxY" type="text" inputmode="numeric" placeholder="0" aria-label="円" oninput="SHIORI.conv('y')"><em>円</em></label></div>
      <table class="so-tbl"><tbody>${Q.map(q=>`<tr><td>${fmt2(q)} ${esc(t.fx.code)}</td><td>${fmt(q*r)} 円</td></tr>`).join('')}</tbody></table>` : '<p class="so-none">レートを 入れると、外貨 ⇄ 円の 換算と 早見表が 出ます。使った お金の 外貨も 円に なります。</p>'}
    <p class="so-note">レートは 両替所や カード会社の 表示を 見て 入れてください（手数料で 少し ちがいます）。</p>`;
}

/* ───────── 小さな窓 ───────── */
let pop=null;
function popOpen(html, kind){
  popClose();
  const host=document.querySelector('#shioriOverlay .so-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='so-pop-bg';
  el.innerHTML=`<div class="so-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  pop={el, kind, rel:null};
  const me=pop; pop.rel=modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } });
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }
const ph=t=>`<div class="so-ph"><b>${t}</b><button type="button" class="so-x" onclick="SHIORI.close()" aria-label="閉じる">✕</button></div>`;
const val=id=>($(id)||{}).value;
function openSetup(isNew){
  const t=isNew ? null : T(), s=t ? t.start : ymd(addDays(today(),7)), e=t ? t.end : ymd(addDays(today(),8));
  popOpen(ph(isNew ? '＋ 新しい 旅' : '⚙ 旅の 設定')+`
    <label class="so-f"><span>名前</span><input id="soTTitle" type="text" maxlength="40" value="${esc(t ? t.title : '')}" placeholder="例：箱根 温泉"></label>
    <div class="so-f"><span>絵</span><div class="so-emos">${EMOS.map(x=>`<button type="button" class="${(t ? t.emo : '🧳')===x?'on':''}" onclick="SHIORI.emo(this,'${x}')" aria-label="絵 ${x}">${x}</button>`).join('')}</div><input id="soTEmo" type="hidden" value="${esc(t ? t.emo : '🧳')}"></div>
    <label class="so-f"><span>行く日</span><input id="soTStart" type="date" value="${s}"></label>
    <label class="so-f"><span>帰る日</span><input id="soTEnd" type="date" value="${e}"></label>
    <label class="so-f top"><span>メモ</span><textarea id="soTMemo" rows="2" maxlength="300" placeholder="例：集合は 8時 東京駅">${esc(t ? t.memo : '')}</textarea></label>
    <div class="so-acts end">${t ? '<button type="button" class="so-b warn" onclick="SHIORI.delTrip()">🗑 この旅を 消す</button>' : ''}<button type="button" class="so-b pri" onclick="SHIORI.setupSave(${isNew?'true':'false'})">✓ ${isNew ? '作る' : '決める'}</button></div>`, 'setup');
}
function emoPick(btn, e){ const h=$('soTEmo'); if(h) h.value=e; if(btn && btn.parentElement) btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b===btn)); }
function setupSave(isNew){
  const s=okDate(val('soTStart')), e=okDate(val('soTEnd'));
  if(!s || !e){ toastS('行く日と 帰る日を 入れてください'); return; }
  if(diff(e,s)<0){ toastS('帰る日が 行く日より 前です'); return; }
  if(diff(e,s)>MAX_DAYS-1){ toastS('旅の 日数は '+MAX_DAYS+'日 まで です'); return; }
  const f={title:oneLine(val('soTTitle'),40)||'旅行', emo:oneLine(val('soTEmo'),8)||'🧳', start:ymd(s), end:ymd(e), memo:multi(val('soTMemo'),300)};
  if(isNew){
    if(st.trips.length>=MAX_T){ toastS('旅は '+MAX_T+' まで です。古い 旅を 消してください'); return; }
    const t=cleanT(Object.assign(f, {fx:T() ? T().fx : null})); st.trips.push(t); st.cur=t.id; st.tab='plan';
  } else { const t=T(); if(!t) return; Object.assign(t, f); }
  save(); popClose(); render(); if(isNew) toastS(f.emo+'「'+f.title+'」を 作りました');
}
async function delTrip(){
  const t=T(); if(!t) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+t.title+'」を 消しますか？（日程・持ち物・お金・お土産・宿も 消えます）', '消す', 'やめる'))) return;
  st.trips.splice(st.trips.indexOf(t),1); st.cur=st.trips[0] ? st.trips[0].id : ''; save(); popClose(); render();
}
function planForm(t, p, d){
  const ds=days(t).map(ymd), cur=p ? p.d : d;
  popOpen(ph(p ? '✏ 予定を 直す' : '＋ 予定')+`
    <label class="so-f"><span>日</span><select id="soPD">${ds.map((k,i)=>`<option value="${k}"${k===cur?' selected':''}>${i+1}日目 ${mdS(k)}</option>`).join('')}${p && !ds.includes(p.d) ? `<option value="${p.d}" selected>${mdS(p.d)}</option>` : ''}</select></label>
    <label class="so-f"><span>時刻</span><input id="soPT" type="time" value="${esc(p ? p.t : '')}"></label>
    <label class="so-f"><span>予定</span><input id="soPW" type="text" maxlength="40" value="${esc(p ? p.what : '')}" placeholder="例：東京駅 出発（のぞみ 3号）"></label>
    <label class="so-f"><span>場所</span><input id="soPP" type="text" maxlength="40" value="${esc(p ? p.place : '')}" placeholder="例：箱根湯本駅"></label>
    <label class="so-f"><span>メモ</span><input id="soPM" type="text" maxlength="100" value="${esc(p ? p.memo : '')}" placeholder="例：指定席 7号車"></label>
    <div class="so-acts end">${p ? `<button type="button" class="so-b warn" onclick="SHIORI.planDel('${p.id}')">🗑 消す</button>` : ''}<button type="button" class="so-b pri" onclick="SHIORI.planSave('${p ? p.id : ''}')">✓ ${p ? '直す' : '足す'}</button></div>`, 'plan');
  const w=$('soPW'); if(w && !p) setTimeout(()=>{ try{ w.focus(); }catch(_){} }, 60);
}
function planSave(id){
  const t=T(); if(!t) return;
  const what=oneLine(val('soPW'),40); if(!what){ toastS('予定を 入れてください'); return; }
  const f={d:okDate(val('soPD')) ? val('soPD') : t.start, t:okTime(val('soPT')), what, place:oneLine(val('soPP'),40), memo:oneLine(val('soPM'),100)};
  const p=id ? t.plan.find(x=>x.id===id) : null;
  if(p) Object.assign(p, f); else { if(t.plan.length>=MAX_PLAN){ toastS('予定は '+MAX_PLAN+' まで です'); return; } t.plan.push(Object.assign({id:rid(), ok:false}, f)); }
  save(); popClose(); render();
}
function stayForm(c){
  popOpen(ph(c ? '✏ 宿・連絡先' : '＋ 宿・連絡先')+`
    <div class="so-f"><span>種類</span><select id="soCK">${KINDS.map(([k,n])=>`<option value="${k}"${c && c.kind===k?' selected':''}>${n}</option>`).join('')}</select></div>
    <label class="so-f"><span>名前</span><input id="soCN" type="text" maxlength="40" value="${esc(c ? c.name : '')}" placeholder="例：〇〇旅館・JR 予約・会社の 緊急連絡先"></label>
    <label class="so-f"><span>時刻など</span><input id="soCW" type="text" maxlength="40" value="${esc(c ? c.when : '')}" placeholder="例：チェックイン 15:00／アウト 10:00"></label>
    <label class="so-f"><span>予約番号</span><input id="soCNo" type="text" maxlength="30" value="${esc(c ? c.no : '')}"></label>
    <label class="so-f"><span>電話</span><input id="soCT" type="tel" maxlength="20" value="${esc(c ? c.tel : '')}" placeholder="0460-00-0000"></label>
    <label class="so-f"><span>住所</span><input id="soCA" type="text" maxlength="80" value="${esc(c ? c.addr : '')}" placeholder="地図で 開けます"></label>
    <label class="so-f"><span>メモ</span><input id="soCM" type="text" maxlength="100" value="${esc(c ? c.memo : '')}" placeholder="例：夕食 18:30・駐車場 あり"></label>
    <div class="so-acts end">${c ? `<button type="button" class="so-b warn" onclick="SHIORI.stayDel('${c.id}')">🗑 消す</button>` : ''}<button type="button" class="so-b pri" onclick="SHIORI.staySave('${c ? c.id : ''}')">✓ ${c ? '直す' : '足す'}</button></div>`, 'stay');
}
function staySave(id){
  const t=T(); if(!t) return;
  const name=oneLine(val('soCN'),40); if(!name){ toastS('名前を 入れてください'); return; }
  const f={kind:keyOk(KINDS,val('soCK'),'yado'), name, when:oneLine(val('soCW'),40), no:oneLine(val('soCNo'),30), tel:oneLine(val('soCT'),20).replace(/[^0-9+\-() ]/g,''), addr:oneLine(val('soCA'),80), memo:oneLine(val('soCM'),100)};
  const c=id ? t.stay.find(x=>x.id===id) : null;
  if(c) Object.assign(c, f); else { if(t.stay.length>=MAX_STAY){ toastS(MAX_STAY+' まで です'); return; } t.stay.push(Object.assign({id:rid()}, f)); }
  save(); popClose(); render();
}

/* ───────── 入れる・かえる ───────── */
async function delOf(listName, id, what){
  const t=T(); if(!t) return; const L=t[listName], x=L.find(y=>y.id===id); if(!x) return;
  if(what && typeof appConfirm==='function' && !(await appConfirm('「'+what(x)+'」を 消しますか？', '消す', 'やめる'))) return;
  L.splice(L.indexOf(x),1); save(); popClose(); render();
}
function setOk(listName, id, on){ const t=T(); if(!t) return; const x=t[listName].find(y=>y.id===id); if(!x) return; x.ok=!!on; save(); render(); }
function packAdd(){
  const t=T(); if(!t) return; const name=oneLine(val('soPkName'),30); if(!name){ toastS('持ち物を 入れてください'); return; }
  if(t.pack.some(p=>p.name===name)){ toastS('「'+name+'」は もう あります'); return; }
  if(t.pack.length>=MAX_PACK){ toastS(MAX_PACK+' まで です'); return; }
  t.pack.push({id:rid(), name, cat:keyOk(PCATS,val('soPkCat'),'hoka'), ok:false}); save(); render();
  const n=$('soPkName'); if(n) try{ n.focus(); }catch(_){}
}
function packPreset(k){
  const t=T(); if(!t) return; const src=k==='intl' ? PACK_INTL : PACK_JP; let n=0;
  src.forEach(([name,cat])=>{ if(t.pack.length<MAX_PACK && !t.pack.some(p=>p.name===name)){ t.pack.push({id:rid(), name, cat, ok:false}); n++; } });
  save(); render(); toastS(n ? (k==='intl' ? '🌏 海外' : '🗾 国内')+'の 持ち物を '+n+'こ 入れました' : 'もう ぜんぶ 入っています');
}
function packClear(){ const t=T(); if(!t) return; t.pack.forEach(p=>{ p.ok=false; }); save(); render(); toastS('✓ を ぜんぶ 外しました'); }
let spFx=false;
function spCur(on){ spFx=!!on; const a=$('soSpJpy'), b=$('soSpFx'); if(a) a.classList.toggle('on', !spFx); if(b) b.classList.toggle('on', spFx); }
function spAdd(){
  const t=T(); if(!t) return; const what=oneLine(val('soSpWhat'),30), amt=numIn(val('soSpAmt'),0,MAX_YEN,NaN,spFx ? 2 : 0);
  if(!what){ toastS('何に 使ったかを 入れてください'); return; }
  if(!isFinite(amt) || amt<=0){ toastS('金額を 入れてください'); return; }
  if(t.spend.length>=MAX_SP){ toastS(MAX_SP+' まで です'); return; }
  t.spend.push({id:rid(), d:okDate(val('soSpDate')) ? val('soSpDate') : t.start, what, amt, fx:spFx, cat:keyOk(SCATS,val('soSpCat'),'hoka')});
  if(spFx && !t.fx.rate) toastS('💱 換算で レートを 入れると 円に なります', 3200);
  save(); const keepFx=spFx; render(); spCur(keepFx);
}
function giftAdd(){
  const t=T(); if(!t) return; const to=oneLine(val('soGfTo'),20), what=oneLine(val('soGfWhat'),30);
  if(!to && !what){ toastS('だれに・何を を 入れてください'); return; }
  if(t.gift.length>=MAX_GIFT){ toastS(MAX_GIFT+' まで です'); return; }
  t.gift.push({id:rid(), to, what, price:numIn(val('soGfPrice'),0,MAX_YEN,0), ok:false}); save(); render();
}
function setBudget(v){ const t=T(); if(!t) return; t.budget=numIn(v,0,MAX_YEN,0); save(); render(); }
function setFx(k, v){
  const t=T(); if(!t) return;
  if(k==='code') t.fx.code=oneLine(v,6).toUpperCase()||'USD'; else if(k==='rate') t.fx.rate=numIn(v,0,100000,0,4); else return;
  save(); render();
}
function conv(from){
  const t=T(); if(!t || !t.fx.rate) return;
  const a=$('soFxA'), y=$('soFxY'); if(!a || !y) return;
  if(from==='a'){ const n=numIn(a.value,0,1e9,NaN,2); y.value=isFinite(n) ? fmt(n*t.fx.rate) : ''; }
  else { const n=numIn(y.value,0,1e12,NaN,0); a.value=isFinite(n) ? fmt2(Math.round(n/t.fx.rate*100)/100) : ''; }
}
function setTab(k){ st.tab=keyOk(TABS,k,'plan'); save(); render(); const b=$('soBody'); if(b) b.scrollTop=0; }
function sel(id){ if(!st.trips.some(t=>t.id===id)) return; st.cur=id; save(); render(); const b=$('soBody'); if(b) b.scrollTop=0; }

/* ───────── 文字・印刷 ───────── */
function text(){
  const t=T(); if(!t) return '';
  const w=when(t), out=[t.emo+' '+t.title, '📅 '+w.text+'（'+w.span+'）'];
  if(t.memo) out.push(t.memo);
  days(t).forEach((d,i)=>{ const L=t.plan.filter(p=>p.d===ymd(d)).sort((x,y)=>(x.t||'99:99').localeCompare(y.t||'99:99'));
    if(L.length){ out.push('', '■ '+(i+1)+'日目 '+mdw(d)); L.forEach(p=>out.push((p.t ? p.t+' ' : '・')+p.what+(p.place ? '（'+p.place+'）' : '')+(p.memo ? '　'+p.memo : ''))); } });
  if(t.stay.length){ out.push('', '■ 宿・連絡先'); t.stay.forEach(c=>out.push('・'+c.name+[c.when, c.no ? '予約番号 '+c.no : '', c.tel ? '☎ '+c.tel : '', c.addr].filter(Boolean).map(x=>'　'+x).join(''))); }
  const left=t.pack.filter(p=>!p.ok);
  if(t.pack.length) out.push('', '■ 持ち物（'+(t.pack.length-left.length)+'／'+t.pack.length+'）', t.pack.map(p=>(p.ok ? '☑' : '□')+p.name).join('　'));
  const m=money(t); if(t.budget || t.spend.length) out.push('', '■ お金：使った '+fmt(m.used)+'円'+(t.budget ? '／予算 '+fmt(t.budget)+'円（'+(m.left<0 ? fmt(-m.left)+'円 こえ' : '残り '+fmt(m.left)+'円')+'）' : ''));
  if(t.gift.length) out.push('', '■ お土産', ...t.gift.map(g=>(g.ok ? '☑' : '□')+(g.to ? g.to+'：' : '')+g.what+(g.price ? '（'+fmt(g.price)+'円）' : '')));
  return out.join('\n');
}
function copy(){ if(!T()){ toastS('旅が ありません'); return; } if(typeof toolCopyText==='function') toolCopyText(text(), '📋 しおりを コピーしました（LINE などに 貼れます）'); }
function docHtml(t){
  const w=when(t), m=money(t);
  const dayH=days(t).map((d,i)=>{ const L=t.plan.filter(p=>p.d===ymd(d)).sort((x,y)=>(x.t||'99:99').localeCompare(y.t||'99:99'));
    return `<h3>${i+1}日目　${mdw(d)}</h3>${L.length ? `<table><tbody>${L.map(p=>`<tr><td class="tm">${esc(p.t)}</td><td><b>${esc(p.what)}</b>${p.place ? '　📍'+esc(p.place) : ''}${p.memo ? '<br><small>'+esc(p.memo)+'</small>' : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="none">（予定なし）</p>'}`; }).join('');
  return `<div class="so-doc"><h1>${esc(t.emo)} ${esc(t.title)}</h1><div class="meta">📅 ${esc(w.text)}（${w.span}）</div>${t.memo ? `<div class="memo">${esc(t.memo).replace(/\n/g,'<br>')}</div>` : ''}
    <h2>🗓 日程</h2>${dayH}
    ${t.stay.length ? `<h2>🏨 宿・連絡先</h2><table><tbody>${t.stay.map(c=>`<tr><td class="k">${nameOf(KINDS,c.kind)}</td><td><b>${esc(c.name)}</b>${[c.when, c.no ? '予約番号 '+c.no : '', c.tel ? '☎ '+c.tel : '', c.addr, c.memo].filter(Boolean).map(x=>'<br>'+esc(x)).join('')}</td></tr>`).join('')}</tbody></table>` : ''}
    ${t.pack.length ? `<h2>🎒 持ち物</h2><div class="pk">${t.pack.map(p=>`<span>${p.ok ? '☑' : '□'} ${esc(p.name)}</span>`).join('')}</div>` : ''}
    ${t.gift.length ? `<h2>🎁 お土産</h2><div class="pk">${t.gift.map(g=>`<span>${g.ok ? '☑' : '□'} ${esc(g.to ? g.to+'：' : '')}${esc(g.what)}${g.price ? '（'+fmt(g.price)+'円）' : ''}</span>`).join('')}</div>` : ''}
    ${t.budget || t.spend.length ? `<h2>💴 お金</h2><p>使った ${fmt(m.used)}円${t.budget ? '／予算 '+fmt(t.budget)+'円（'+(m.left<0 ? fmt(-m.left)+'円 こえ' : '残り '+fmt(m.left)+'円')+'）' : ''}</p>` : ''}</div>`;
}
function printDoc(){
  const t=T(); if(!t){ toastS('旅が ありません'); return; }
  let pa=$('printArea'); if(!pa){ pa=document.createElement('div'); pa.id='printArea'; document.body.appendChild(pa); }
  pa.innerHTML=docHtml(t);
  let dyn=$('printDynamicStyle'); if(!dyn){ dyn=document.createElement('style'); dyn.id='printDynamicStyle'; document.head.appendChild(dyn); }
  dyn.textContent='@page{ size: A4 portrait; margin: 12mm; }';
  const old=document.title; document.title=('旅のしおり_'+t.title).replace(/[\\/:*?"<>|]/g,'_');
  setTimeout(()=>{ try{ window.print(); }catch(_){ toastS('印刷を 開けませんでした'); } setTimeout(()=>{ document.title=old; }, 1500); }, 250);
}

/* ───────── 窓 ───────── */
const DOC=`
.so-doc{ color:#111; background:#fff; font-family:"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif; font-size:12.5px; line-height:1.55; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.so-doc h1{ font-size:22px; margin:0 0 4px; } .so-doc .meta{ font-size:13px; margin:0 0 6px; } .so-doc .memo{ border:1px solid #999; border-radius:6px; padding:5px 8px; margin:0 0 6px; }
.so-doc h2{ font-size:15px; margin:12px 0 4px; border-bottom:2px solid #333; padding-bottom:2px; } .so-doc h3{ font-size:13px; margin:8px 0 3px; }
.so-doc table{ width:100%; border-collapse:collapse; border-spacing:0; } .so-doc td{ border:1px solid #bbb; padding:3px 6px; vertical-align:top; font-size:12px; }
.so-doc td.tm{ width:4.5em; white-space:nowrap; text-align:center; } .so-doc td.k{ width:6em; white-space:nowrap; } .so-doc .none{ margin:0; color:#666; }
.so-doc .pk{ display:flex; flex-wrap:wrap; gap:2px 14px; } .so-doc small{ color:#444; }
`;
const CSS=`
#shioriOverlay .so-modal{ display:flex; flex-direction:column; }
.so-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.so-wrap{ max-width:760px; margin:0 auto; padding-bottom:16px; }
.so-top{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 8px; } .so-sel{ flex:1 1 180px; min-width:0; min-height:44px; padding:0 8px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; }
.so-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; }
.so-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .so-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.so-head{ display:flex; align-items:center; gap:10px; margin:0 0 8px; } .so-head .e{ font-size:34px; line-height:1; } .so-head div{ display:flex; flex-direction:column; min-width:0; }
.so-head b{ font-size:18px; overflow-wrap:anywhere; } .so-head small{ font-size:13px; color:var(--text-light,#666); } .so-head small b.rel{ font-size:13px; color:var(--text,#222); white-space:nowrap; }
.so-tabs{ display:grid; grid-template-columns:repeat(6,1fr); gap:4px; margin:0 0 10px; }
.so-tabs button{ min-height:44px; padding:0 4px; border-radius:10px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; }
.so-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.so-day{ border-radius:14px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); padding:8px 10px; margin:0 0 8px; } .so-day.today{ border:2px solid var(--acc); } .so-day.out{ border-style:dashed; }
.so-day h5, .so-h{ margin:0 0 6px; font-size:15px; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; } .so-day h5 span, .so-h small{ font-weight:normal; font-size:13px; color:var(--text-light,#666); }
.so-day h5 em{ font-style:normal; font-size:12px; padding:1px 8px; border-radius:10px; background:var(--acc); color:var(--on-acc,#fff); }
.so-h{ margin:12px 0 6px; }
.so-pl{ display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px dashed rgba(120,132,156,.3); } .so-pl.ok .tx b{ text-decoration:line-through; opacity:.6; }
.so-pl .tm{ min-width:3.6em; font-weight:bold; font-variant-numeric:tabular-nums; font-size:14px; } .so-pl .tx{ flex:1; min-width:0; display:flex; flex-direction:column; } .so-pl .tx small{ font-size:12.5px; color:var(--text-light,#666); }
.ck input, .so-pk input{ width:22px; height:22px; } .so-none{ margin:4px 0; font-size:13.5px; color:var(--text-light,#666); }
.so-add{ margin-top:6px; min-height:38px; padding:0 12px; border-radius:10px; border:1px dashed rgba(120,132,156,.6); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.so-ic{ min-width:40px; min-height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; flex:none; }
.so-prog{ font-size:15px; margin:0 0 6px; } .so-prog b{ font-size:20px; } .so-prog small{ color:var(--text-light,#666); font-size:13px; }
.bar{ display:block; height:8px; border-radius:4px; background:rgba(120,132,156,.2); overflow:hidden; margin-top:4px; } .bar i{ display:block; height:100%; background:#2e9d4a; } .bar.over i{ background:#e53935; }
.so-pk{ display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:4px; }
.so-pk label{ display:flex; align-items:center; gap:6px; min-height:42px; padding:0 4px 0 8px; border-radius:10px; border:1px solid rgba(120,132,156,.3); cursor:pointer; } .so-pk label.ok span{ text-decoration:line-through; opacity:.6; }
.so-pk span{ flex:1; min-width:0; font-size:14.5px; overflow-wrap:anywhere; } .so-pk button{ min-width:34px; min-height:34px; border:0; background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.so-form{ display:flex; gap:6px; margin:10px 0 0; } .so-form.wrap{ flex-wrap:wrap; }
.so-form input, .so-form select{ min-height:44px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; min-width:0; }
.so-form input[type=text]{ flex:1 1 140px; } .so-form select{ flex:0 1 auto; } .so-form input[type=date]{ flex:0 1 auto; }
.so-seg{ display:inline-flex; border:1px solid rgba(120,132,156,.45); border-radius:10px; overflow:hidden; } .so-seg button{ min-width:52px; min-height:42px; border:0; background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; } .so-seg button.on{ background:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.so-f{ display:flex; align-items:center; gap:8px; margin:8px 0; flex-wrap:wrap; } .so-f.top{ align-items:flex-start; } .so-f > span{ min-width:4.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.so-f input, .so-f select, .so-f textarea{ flex:1 1 140px; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.so-f textarea{ padding:8px 10px; resize:vertical; } .so-f em{ font-style:normal; font-size:13px; color:var(--text-light,#666); }
.so-msum{ border-radius:12px; background:rgba(120,132,156,.1); padding:10px 12px; font-size:14.5px; line-height:1.7; } .so-msum b{ font-size:19px; } .so-msum .left b{ color:#2e7d32; } .so-msum .over{ color:#e53935; font-weight:bold; }
.so-cats{ display:flex; flex-direction:column; gap:4px; margin:10px 0 0; } .so-cats div{ display:grid; grid-template-columns:6.6em 1fr 6.2em; gap:8px; align-items:center; font-size:13.5px; } .so-cats .bar{ margin:0; } .so-cats b{ text-align:right; font-variant-numeric:tabular-nums; }
.so-list{ display:flex; flex-direction:column; gap:5px; margin:8px 0 0; }
.so-sp, .so-gf{ display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:10px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); }
.so-sp .d{ font-size:12.5px; color:var(--text-light,#666); min-width:5.4em; } .so-sp .tx, .so-gf .tx{ flex:1; min-width:0; display:flex; flex-direction:column; } .so-sp .tx small, .so-gf .tx small{ font-size:12.5px; color:var(--text-light,#666); }
.so-sp .a, .so-gf .a{ display:flex; flex-direction:column; align-items:flex-end; font-variant-numeric:tabular-nums; } .so-sp .a small{ font-size:12px; color:var(--text-light,#666); }
.so-gf.ok .tx{ opacity:.6; text-decoration:line-through; }
.so-st{ border-radius:12px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); padding:8px 10px; font-size:14px; line-height:1.7; }
.so-st .h{ display:flex; align-items:center; gap:8px; } .so-st .h span{ font-size:13px; color:var(--text-light,#666); } .so-st .h b{ flex:1; min-width:0; font-size:16px; overflow-wrap:anywhere; }
.so-st a{ color:var(--acc); font-weight:bold; } .so-st .m{ color:var(--text-light,#666); font-size:13px; }
.so-conv{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:10px 0; } .so-conv label{ display:flex; align-items:center; gap:6px; flex:1 1 140px; }
.so-conv input{ flex:1; min-width:0; min-height:48px; padding:0 10px; border-radius:10px; border:2px solid var(--acc); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:20px; font-weight:bold; text-align:right; box-sizing:border-box; }
.so-conv em{ font-style:normal; font-size:14px; font-weight:bold; } .so-conv > span{ font-size:20px; }
.so-tbl{ width:100%; border-collapse:collapse; margin:4px 0 0; } .so-tbl td{ padding:6px 10px; border-bottom:1px solid rgba(120,132,156,.25); font-size:15px; font-variant-numeric:tabular-nums; } .so-tbl td:last-child{ text-align:right; font-weight:bold; }
.so-acts{ display:flex; gap:6px; flex-wrap:wrap; margin:12px 0 0; } .so-acts .so-b{ flex:1 1 auto; } .so-acts.end{ justify-content:flex-end; } .so-acts.end .so-b{ flex:0 1 auto; }
.so-note{ font-size:12.5px; color:var(--text-light,#666); line-height:1.6; margin:10px 0 0; }
.so-empty{ text-align:center; padding:30px 10px; } .so-empty p{ margin:0 0 14px; }
.so-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.so-pop{ width:100%; max-width:600px; max-height:90%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.so-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .so-ph b{ flex:1; min-width:0; font-size:17px; }
.so-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.so-emos{ display:flex; flex-wrap:wrap; gap:4px; flex:1; } .so-emos button{ width:42px; height:42px; border-radius:10px; border:1px solid rgba(120,132,156,.3); background:transparent; font-size:21px; cursor:pointer; padding:0; } .so-emos button.on{ border:2px solid var(--acc); background:rgba(120,132,156,.12); }
@media (max-width:520px){ .so-tabs{ grid-template-columns:repeat(3,1fr); } .so-conv{ flex-direction:column; align-items:stretch; } .so-conv > span{ align-self:center; transform:rotate(90deg); } .so-cats div{ grid-template-columns:6.2em 1fr 5.6em; } }
`+DOC.replace(/\.so-doc/g, '#printArea .so-doc');
function ensureDom(){
  if($('shioriOverlay')) return;
  const s=document.createElement('style'); s.id='soStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="shioriOverlay">
  <div class="modal vol-modal so-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🧳 旅のしおり</span><button class="modal-close" onclick="closeShiori()" aria-label="閉じる">✕</button></div>
    <div class="so-body" id="soBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('shioriOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('keydown', e=>{
    if(e.key!=='Escape' || !pop || !isDlgOpen('shioriOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); }
function openShiori(){ ensureDom(); load(); spFx=false; openDlg('shioriOverlay', cleanup); render(); }
function closeShiori(){ if(!$('shioriOverlay') || !isDlgOpen('shioriOverlay')) return; closeDlg('shioriOverlay', cleanup); }

window.SHIORI={ newTrip:()=>openSetup(true), setup:()=>openSetup(false), setupSave, emo:emoPick, delTrip:()=>delTrip(), sel, tab:setTab, close:popClose,
  planAdd:d=>{ const t=T(); if(t) planForm(t, null, d); }, planEdit:id=>{ const t=T(), p=t && t.plan.find(x=>x.id===id); if(p) planForm(t, p); }, planSave, planDel:id=>{ delOf('plan', id, p=>p.what); }, planOk:(id,on)=>setOk('plan',id,on),
  packAdd, packPreset, packClear, packOk:(id,on)=>setOk('pack',id,on), packDel:id=>{ delOf('pack', id); },
  budget:setBudget, spCur, spAdd, spDel:id=>{ delOf('spend', id, p=>p.what); },
  giftAdd, giftOk:(id,on)=>setOk('gift',id,on), giftDel:id=>{ delOf('gift', id, g=>(g.to ? g.to+'：' : '')+g.what); },
  stayAdd:()=>stayForm(null), stayEdit:id=>{ const t=T(), c=t && t.stay.find(x=>x.id===id); if(c) stayForm(c); }, staySave, stayDel:id=>{ delOf('stay', id, c=>c.name); },
  fx:setFx, conv, copy, text, print:printDoc, html:()=>{ const t=T(); return t ? docHtml(t) : ''; },
  // ためす とき 用
  today:s=>{ fixedToday=s ? String(s) : null; if(st) render(); }, state:()=>JSON.parse(JSON.stringify(st)), clean:cleanT,
  money:()=>{ const t=T(); return t ? money(t) : null; }, when:()=>{ const t=T(); return t ? when(t) : null; }, delOf };
Object.assign(window, { openShiori, closeShiori });
})();
