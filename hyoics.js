/* 📅 カレンダーに 入れる（v595。表電卓の 共通部品。使う 道具が 開いたときに 読む）
   予定を .ics（iCalendar。iPhone・Android・パソコンの カレンダー・Outlook・Google カレンダーが 読める 形）に して
   ・📥 ファイルに 保存（開くと カレンダーに 入る）・📤 送る（メール・LINE など。端末が できるとき）
   ・🗓 Google カレンダーで 開く（1件の とき。「予定を作る」画面に 入った 状態で 開く）
   を えらぶ 小さな 窓を 出す。🔁 前にやった日 帳（yatta.js）・📔 業務手帳（techo.js）が 使う。
   予定：{uid, title, date:'YYYY-MM-DD', allDay, start:'HH:MM', endTime:'HH:MM', end:'YYYY-MM-DD'（終日の 最後の 日）,
          desc, loc, rrule:'FREQ=…', ex:['YYYY-MM-DD'], alarm:分（＋は 前・−は あと。終日は その日の 0時から）}
   時刻は 端末の 時刻の まま（タイムゾーンを 付けない）。文字の 決まり（\ ; , 改行）と 1行 75バイトの 折り返しは ここで。 */
(function(){
'use strict';
const pad2=n=>String(n).padStart(2,'0');
const enc=new TextEncoder();
const okD=s=>typeof s==='string' && /^\d{4}-\d\d-\d\d$/.test(s);
const okT=s=>typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const d8=s=>okD(s) ? s.replace(/-/g,'') : '';
const t6=s=>s.replace(':','')+'00';
const dOf=s=>{ const a=s.split('-').map(Number); return new Date(a[0], a[1]-1, a[2]); };
const iso=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const addDay=(s,n)=>{ const d=dOf(s); d.setDate(d.getDate()+n); return iso(d); };
const addMin=(t,n)=>{ const a=t.split(':').map(Number), m=Math.min(23*60+59, a[0]*60+a[1]+n); return pad2(Math.floor(m/60))+':'+pad2(m%60); };
// 文字の 決まり：\ ; , と 改行を 印に
const esc=s=>String(s==null?'':s).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n');
// 1行は 75バイトまで（こえたら 改行＋空白で つづける。字の 途中では 切らない）
function fold(line){
  const out=[]; let cur='', n=0;
  for(const ch of line){ const b=enc.encode(ch).length; if(n+b>75){ out.push(cur); cur=' '; n=1; } cur+=ch; n+=b; }
  out.push(cur); return out.join('\r\n');
}
const uidOk=s=>String(s==null?'':s).replace(/[^A-Za-z0-9._-]/g,'-').slice(0,80)||Math.random().toString(36).slice(2,12);
const allDayOf=e=>!!e.allDay || !okT(e.start);
function stamp(){ return new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'); }
// おわりの 時刻（はじまりより 前なら 次の 日）
function endOf(e){ const et=okT(e.endTime) ? e.endTime : addMin(e.start, 60); return [et>e.start ? e.date : addDay(e.date, 1), et]; }
function build(evs, o){
  o=o||{};
  const st=stamp(), L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//hyodentaku//calendar//JA','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  if(o.name) L.push('X-WR-CALNAME:'+esc(o.name));
  (evs||[]).forEach(e=>{
    if(!e || !okD(e.date)) return;
    const ad=allDayOf(e), title=esc(e.title||'予定');
    L.push('BEGIN:VEVENT', 'UID:'+uidOk(e.uid)+'@hyodentaku', 'DTSTAMP:'+st);
    if(ad) L.push('DTSTART;VALUE=DATE:'+d8(e.date), 'DTEND;VALUE=DATE:'+d8(addDay(okD(e.end) && e.end>=e.date ? e.end : e.date, 1)));
    else { const [ed, et]=endOf(e); L.push('DTSTART:'+d8(e.date)+'T'+t6(e.start), 'DTEND:'+d8(ed)+'T'+t6(et)); }
    L.push('SUMMARY:'+title);
    if(e.desc) L.push('DESCRIPTION:'+esc(e.desc));
    if(e.loc) L.push('LOCATION:'+esc(e.loc));
    if(e.rrule && /^FREQ=[A-Z]+(;[A-Z]+=[A-Z0-9,T]+)*$/.test(e.rrule)) L.push('RRULE:'+e.rrule);
    const ex=(Array.isArray(e.ex) ? e.ex : []).filter(okD);
    if(e.rrule && ex.length) L.push((ad ? 'EXDATE;VALUE=DATE:' : 'EXDATE:')+ex.map(x=>d8(x)+(ad ? '' : 'T'+t6(e.start))).join(','));
    if(e.alarm!=null && isFinite(e.alarm)){ const a=Math.round(e.alarm); L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:'+title, 'TRIGGER:'+(a>=0 ? '-PT'+a+'M' : 'PT'+(-a)+'M'), 'END:VALARM'); }
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n')+'\r\n';
}
// くり返しの 決まり（f：d 毎日・wd 平日・w 毎週・w2 隔週・m 毎月・y 毎年、until：最後の 日、時刻つきは 最後の 日の おわりまで）
function rrule(f, date, until, timed){
  const W=['SU','MO','TU','WE','TH','FR','SA'], d=okD(date) ? dOf(date) : null;
  const r={d:'FREQ=DAILY', wd:'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', w:'FREQ=WEEKLY'+(d ? ';BYDAY='+W[d.getDay()] : ''), w2:'FREQ=WEEKLY;INTERVAL=2'+(d ? ';BYDAY='+W[d.getDay()] : ''),
    m:'FREQ=MONTHLY'+(d ? ';BYMONTHDAY='+d.getDate() : ''), y:'FREQ=YEARLY'}[f];
  if(!r) return '';
  return r+(okD(until) ? ';UNTIL='+d8(until)+(timed ? 'T235959' : '') : '');
}
// Google カレンダーの「予定を作る」（1件）
function gcal(e){
  if(!e || !okD(e.date)) return '';
  const ad=allDayOf(e);
  let dates;
  if(ad) dates=d8(e.date)+'/'+d8(addDay(okD(e.end) && e.end>=e.date ? e.end : e.date, 1));
  else { const [ed, et]=endOf(e); dates=d8(e.date)+'T'+t6(e.start)+'/'+d8(ed)+'T'+t6(et); }
  const p=new URLSearchParams({action:'TEMPLATE', text:e.title||'予定', dates});
  if(e.desc) p.set('details', e.desc);
  if(e.loc) p.set('location', e.loc);
  if(e.rrule) p.set('recur', 'RRULE:'+e.rrule);
  return 'https://calendar.google.com/calendar/render?'+p.toString();
}
const canShare=()=>{ try{ return !!(navigator.share && navigator.canShare && navigator.canShare({files:[new File(['x'], 'a.ics', {type:'text/calendar'})]})); }catch(_){ return false; } };
let last=null;   // たしかめ用：さいごに 作った もの
async function save(text, name, how, title){
  last={text, name, how};
  const file=new File([text], name, {type:'text/calendar'});
  if(how==='share'){
    try{ if(canShare()){ await navigator.share({files:[file], title:title||name}); return 'share'; } }catch(e){ if(e && e.name==='AbortError') return 'cancel'; }
  }
  const url=URL.createObjectURL(file), a=document.createElement('a');
  a.href=url; a.download=name; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
  return 'download';
}
const WD='日月火水木金土';
const when=e=>{ const d=dOf(e.date); return (d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）'+(allDayOf(e) ? '' : ' '+e.start.replace(/^0/,'')+(okT(e.endTime) ? '〜'+e.endTime.replace(/^0/,'') : '')); };
const h=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CSS=`.hics-bg{ position:fixed; inset:0; z-index:99995; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:12px; }
.hics{ width:360px; max-width:100%; max-height:92vh; overflow:auto; box-sizing:border-box; padding:16px; border-radius:14px; background:var(--modal-bg,#fff); color:var(--text,#222); box-shadow:0 10px 40px rgba(0,0,0,.35); font-size:15px; }
.hics h4{ margin:0 0 8px; font-size:17px; } .hics ul{ margin:0 0 10px; padding:8px 10px 8px 26px; border-radius:10px; background:rgba(120,132,156,.1); font-size:13.5px; line-height:1.6; max-height:9.5em; overflow:auto; }
.hics ul li b{ font-weight:bold; } .hics .more{ list-style:none; margin-left:-16px; color:var(--text-light,#666); }
.hics button{ display:block; width:100%; min-height:46px; margin-top:7px; padding:6px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.1); color:var(--text,#222); font-size:15.5px; font-weight:bold; cursor:pointer; text-align:left; }
.hics button small{ display:block; font-weight:normal; font-size:12px; color:var(--text-light,#666); }
.hics button.pri{ background:var(--acc,#1e88e5); border-color:var(--acc,#1e88e5); color:var(--on-acc,#fff); } .hics button.pri small{ color:inherit; opacity:.85; }
.hics button.no{ text-align:center; border:0; background:none; font-weight:normal; color:var(--text-light,#777); min-height:40px; }
.hics p{ margin:8px 0 0; font-size:12.5px; line-height:1.6; color:var(--text-light,#666); }`;
let cur=null;
// Esc は この 窓だけ 閉じる・Tab は 窓の 中を まわる（下の 道具の 窓より 先に 受ける）
function onKey(e){
  if(!cur) return;
  if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
  if(e.key!=='Tab') return;
  const f=[...cur.el.querySelectorAll('button')]; if(!f.length) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const i=f.indexOf(document.activeElement), n=i<0 ? 0 : (i+(e.shiftKey ? -1 : 1)+f.length)%f.length;
  try{ f[n].focus(); }catch(_){}
}
function drop(){ const c=cur; cur=null; window.removeEventListener('keydown', onKey, true); if(typeof appModalOpen!=='undefined') appModalOpen=false; return c; }
function close(){ if(!cur) return; const c=drop(); c.rel(); c.el.remove(); }
// 窓を 出す：evs（予定）・o.file（ファイル名。英数字）・o.name（カレンダーの 名前）・o.title（窓の 見出し）・o.note
function sheet(evs, o){
  o=o||{}; evs=(evs||[]).filter(e=>e && okD(e.date));
  if(!evs.length){ if(typeof toast==='function') toast('カレンダーに 入れる 予定が ありません', 2600); return null; }
  close();
  if(!document.getElementById('hicsStyle')){ const s=document.createElement('style'); s.id='hicsStyle'; s.textContent=CSS; document.head.appendChild(s); }
  const one=evs.length===1, sh=canShare(), text=build(evs, {name:o.name}), file=/^[\w.-]+\.ics$/.test(o.file||'') ? o.file : 'calendar.ics';
  const el=document.createElement('div'); el.className='hics-bg';
  el.innerHTML=`<div class="hics" role="dialog" aria-modal="true" aria-label="カレンダーに 入れる"><h4>📅 ${h(o.title||'カレンダーに 入れる')}</h4>
    <ul>${evs.slice(0,6).map(e=>`<li>${h(when(e))} <b>${h(e.title||'予定')}</b>${e.rrule ? ' 🔁' : ''}</li>`).join('')}${evs.length>6 ? `<li class="more">ほか ${evs.length-6}件（ぜんぶで ${evs.length}件）</li>` : ''}</ul>
    <button type="button" class="pri" data-a="dl">📥 カレンダーの ファイルを 保存<small>保存した ファイル（.ics）を 開くと カレンダーに 入ります</small></button>
    ${sh ? `<button type="button" data-a="share">📤 送る（メール・LINE など）<small>パソコンの カレンダーや 家族に</small></button>` : ''}
    ${one ? `<button type="button" data-a="g">🗓 Google カレンダーで 開く<small>入れる 前の 画面が 開きます（インターネットが いります）</small></button>` : ''}
    <button type="button" class="no" data-a="no">やめる</button>
    <p>${o.note ? h(o.note)+' ' : ''}iPhone は 保存した ファイルを 開いて「すべてを追加」。Android の Google カレンダーには「Google カレンダーで 開く」が かんたんです${one ? '' : '（1件ずつ）'}。</p></div>`;
  const rel=(typeof modalBack==='function') ? modalBack(()=>{ if(cur && cur.el===el){ drop(); el.remove(); } }) : ()=>{};   // 端末の「戻る」も この 窓だけ
  cur={el, rel};
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('click', async ev=>{
    const b=ev.target.closest('button[data-a]');
    if(!b){ if(ev.target===el) close(); return; }
    const a=b.dataset.a;
    if(a==='no'){ close(); return; }
    if(a==='g'){ const u=gcal(evs[0]); last={text, name:file, how:'gcal', url:u}; close(); try{ window.open(u, '_blank', 'noopener'); }catch(_){} return; }
    close();
    const r=await save(text, file, a, o.title);
    if(typeof toast==='function' && r!=='cancel') toast(r==='share' ? '📤 送りました' : '📥 保存しました。ファイルを 開くと カレンダーに 入ります', 3600);
  });
  el.addEventListener('keydown', ev=>{ if(ev.key!=='Tab') ev.stopPropagation(); });   // 表の 電卓キーに 届かないように
  if(typeof appModalOpen!=='undefined') appModalOpen=true;
  document.body.appendChild(el);
  const f=el.querySelector('button.pri'); if(f) try{ f.focus({preventScroll:true}); }catch(_){}
  return el;
}
window.HyoIcs={ build, rrule, gcal, save, sheet, close, esc, fold, canShare, last:()=>last, isOpen:()=>!!cur };
})();
