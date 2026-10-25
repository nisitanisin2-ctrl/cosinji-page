/* 🎲 くじ・あみだ・班分け（v561。表電卓の道具。apps/kuji/ から単独のアプリとしても開ける。はじめて開いたときに読む）
   名前を入れて（📅当番表の名簿・📇連絡帳のグループからも入れられる）、
   ・🎯 当たり：何人かを選ぶ（前に当たった人を外して、全員に回るまで続けることもできる）
   ・🔢 順番：全員の順番
   ・👥 班分け：班の数か 1班の人数で分ける（人数の差は1人まで。班長も決められる）
   ・🪜 あみだ：横線をひいたあみだくじ。上の名前を押すと線をたどる。下に書くこと（当たり・数・自分で書く）は選べる。
     作ると ⛶ 全画面（v585）：画面いっぱいに あみだ全体が おさまる（人数が 多いと 名前は 縦書き。横向きに すると 大きく なる）。
     全画面でも 名前を押すと たどる・🔓 ぜんぶ開ける・📋 コピー。「✕ 閉じる」・端末の「戻る」・Esc で もどる。
     下の 答えは 線が 下に 着いてから 出す（v586。ぜんぶ開ける も いっしょに 線を 引いてから）
   くじは端末の乱数（crypto.getRandomValues）で、かたよりなく決める。休みの人は 名前を押すと外せる。
   結果は 📋コピー・📤共有・▦表に入れる。名前の組（クラス・部 など）は保存して呼び出せる。
   中身は excalc_kuji（この端末の中だけ）。 */
(function(){
const KJ_KEY='excalc_kuji', MAX_N=200, MAX_LISTS=20, MAX_HIST=15, MAX_AMIDA=30;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,n);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const MODES=[['pick','🎯 当たり'],['order','🔢 順番'],['team','👥 班分け'],['amida','🪜 あみだ']];
const COLORS=['#e53935','#1e88e5','#43a047','#fb8c00','#8e24aa','#00897b','#d81b60','#6d4c41','#3949ab','#7cb342','#f4511e','#00acc1'];
const ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZ';

let st=null, editing=false, anim=0, pop=null, full=null;   // full：あみだの 全画面（v585）
// 線を 引いている あいだ（v586）：番号 → 引きはじめた 時刻。線が 下に 着くまで 下の 答えは「？」の まま
const DRAW_MS=1100, reveal=new Map(), popped=new Set();
const noAnim=()=>!!window.KJ_NO_ANIM || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const shownOpen=a=>a.open.filter(i=>!reveal.has(i));   // 答えまで 出して よい 人

/* ───────── 乱数（かたよりなく） ───────── */
function rnd(n){
  if(n<=1) return 0;
  const a=new Uint32Array(1), lim=Math.floor(0x100000000/n)*n;
  let x; do{ crypto.getRandomValues(a); x=a[0]; }while(x>=lim);
  return x%n;
}
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/* ───────── 読み書き ───────── */
function defaults(){ return {v:1, names:[], off:[], mode:'pick', pickN:1, excl:false, won:[], teamBy:'n', teamN:2, teamSize:4, leader:false, teamLabel:'num', prizeKind:'hit', hitN:1, prizes:'', lists:[], hist:[], amida:null, last:null}; }
const int=(v,lo,hi,d)=>{ const n=Math.round(+v); return isFinite(n)?Math.max(lo,Math.min(hi,n)):d; };
const strs=(a,n,len)=>(Array.isArray(a)?a:[]).map(x=>line(x,len)).filter(Boolean).slice(0,n);
function uniq(names){
  const seen=new Map(), out=[];
  names.forEach(n=>{ let k=n, i=1; while(seen.has(k)){ i++; k=n+'('+i+')'; } seen.set(k,1); out.push(k); });
  return out;
}
function clean(o){
  const d=defaults(); if(!o||typeof o!=='object') return d;
  d.names=uniq(strs(o.names,MAX_N,24));
  d.off=strs(o.off,MAX_N,30).filter(n=>d.names.includes(n));
  d.mode=MODES.some(m=>m[0]===o.mode)?o.mode:'pick';
  d.pickN=int(o.pickN,1,MAX_N,1); d.excl=o.excl===true; d.won=strs(o.won,MAX_N,30);
  d.teamBy=o.teamBy==='size'?'size':'n'; d.teamN=int(o.teamN,2,50,2); d.teamSize=int(o.teamSize,1,MAX_N,4);
  d.leader=o.leader===true; d.teamLabel=o.teamLabel==='abc'?'abc':'num';
  d.prizeKind=['hit','num','own'].includes(o.prizeKind)?o.prizeKind:'hit'; d.hitN=int(o.hitN,1,MAX_AMIDA,1); d.prizes=String(o.prizes||'').slice(0,2000);
  (Array.isArray(o.lists)?o.lists:[]).slice(0,MAX_LISTS).forEach(l=>{ if(!l||typeof l!=='object') return; const name=line(l.name,30), names=uniq(strs(l.names,MAX_N,24)); if(name&&names.length) d.lists.push({id:typeof l.id==='string'&&l.id?l.id.slice(0,40):uid('l'), name, names}); });
  (Array.isArray(o.hist)?o.hist:[]).slice(0,MAX_HIST).forEach(h=>{ if(h&&typeof h.text==='string'&&MODES.some(m=>m[0]===h.mode)) d.hist.push({t:+h.t||0, mode:h.mode, text:h.text.slice(0,3000)}); });
  const a=o.amida;
  if(a&&Array.isArray(a.names)&&Array.isArray(a.rungs)&&a.names.length>=2&&a.names.length<=MAX_AMIDA&&a.rungs.length<=200){
    const n=a.names.length, names=strs(a.names,MAX_AMIDA,30);
    if(names.length===n){
      const prizes=(Array.isArray(a.prizes)?a.prizes:[]).slice(0,n).map(x=>line(x,20)); while(prizes.length<n) prizes.push('');
      const rungs=a.rungs.map(r=>Array.from({length:n-1},(_,c)=>!!(Array.isArray(r)&&r[c]===true)));
      rungs.forEach(r=>{ for(let c=1;c<r.length;c++) if(r[c]&&r[c-1]) r[c]=false; });
      d.amida={names, prizes, rungs, open:[...new Set((Array.isArray(a.open)?a.open:[]).map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<n))]};
    }
  }
  if(o.last&&typeof o.last==='object'&&MODES.some(m=>m[0]===o.last.mode)&&o.last.mode!=='amida'){
    const L=o.last, keep=v=>strs(v,MAX_N,30);
    if(L.mode==='team'&&Array.isArray(L.teams)) d.last={mode:'team', t:+L.t||0, teams:L.teams.slice(0,50).map(keep), labels:strs(L.labels,50,10), leader:L.leader===true};
    else if(Array.isArray(L.list)) d.last={mode:L.mode, t:+L.t||0, list:keep(L.list), reset:L.reset===true};
  }
  return d;
}
function load(){ let o=null; try{ o=JSON.parse(localStorage.getItem(KJ_KEY)||'null'); }catch(_){} st=clean(o); }
function save(){ try{ localStorage.setItem(KJ_KEY, JSON.stringify(st)); }catch(_){ toast('保存できませんでした（端末の空きが足りないかもしれません）'); } }
const active=()=>st.names.filter(n=>!st.off.includes(n));
const when=t=>{ const d=new Date(t||Date.now()); return (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+String(d.getMinutes()).padStart(2,'0'); };

/* ───────── 決める ───────── */
function doPick(){
  const act=active(); let reset=false;
  let pool=st.excl?act.filter(n=>!st.won.includes(n)):act;
  const k=Math.min(st.pickN, act.length);
  if(st.excl && pool.length<k){ st.won=st.won.filter(n=>!act.includes(n)); pool=act; reset=true; }   // 全員に回ったので はじめから
  const list=shuffle(pool).slice(0,k);
  if(st.excl) st.won=st.won.concat(list).slice(-MAX_N);
  return {mode:'pick', t:Date.now(), list, reset};
}
function doOrder(){ return {mode:'order', t:Date.now(), list:shuffle(active())}; }
function teamCount(n){ return st.teamBy==='size' ? Math.max(1, Math.ceil(n/Math.max(1,st.teamSize))) : Math.max(1, Math.min(n, st.teamN)); }
function teamLabels(k){ return Array.from({length:k},(_,i)=>st.teamLabel==='abc'?(ABC[i]||String(i+1))+'班':(i+1)+'班'); }
function doTeam(){
  const act=shuffle(active()), k=teamCount(act.length);
  const teams=Array.from({length:k},()=>[]);
  const order=shuffle(teams.map((_,i)=>i));   // 人数が多くなる班も くじで決める
  act.forEach((n,i)=>teams[order[i%k]].push(n));
  return {mode:'team', t:Date.now(), teams, labels:teamLabels(k), leader:st.leader};
}
function prizeList(n){
  if(st.prizeKind==='num') return Array.from({length:n},(_,i)=>String(i+1));
  if(st.prizeKind==='own'){
    const a=String(st.prizes||'').split(/\r?\n/).map(x=>line(x,20)).filter(Boolean).slice(0,n);
    while(a.length<n) a.push('はずれ');
    return a;
  }
  const h=Math.min(st.hitN, n);
  return Array.from({length:n},(_,i)=>i<h?'当たり':'はずれ');
}
function makeAmida(names, prizes){
  const n=names.length, levels=Math.max(10, Math.min(36, n*3+4));
  const rungs=[];
  for(let l=0;l<levels;l++){ const row=Array(n-1).fill(false); for(let c=0;c<n-1;c++){ if(c>0&&row[c-1]) continue; if(rnd(100)<40) row[c]=true; } rungs.push(row); }
  for(let c=0;c<n-1;c++) if(!rungs.some(r=>r[c])){   // どのとなりにも 1本は横線を
    for(let t=0;t<80;t++){ const l=rnd(levels); if(!(c>0&&rungs[l][c-1]) && !rungs[l][c+1]){ rungs[l][c]=true; break; } }
  }
  return {names:names.slice(), prizes:shuffle(prizes), rungs, open:[]};
}
function trace(a, i){
  let c=i; const pts=[[c,-1]];
  a.rungs.forEach((row,l)=>{
    if(row[c]){ pts.push([c,l]); c++; pts.push([c,l]); }
    else if(c>0&&row[c-1]){ pts.push([c,l]); c--; pts.push([c,l]); }
  });
  pts.push([c,a.rungs.length]);
  return {pts, end:c};
}

async function go(){
  if(editing) namesDone();
  const act=active();
  if(st.mode==='amida'){
    if(act.length<2){ toast('あみだは 2人から作れます'); return; }
    if(act.length>MAX_AMIDA){ toast('あみだは '+MAX_AMIDA+'人までです（班分けか順番をつかってください）', 4000); return; }
    if(st.amida && st.amida.open.length && st.amida.open.length<st.amida.names.length && !await appConfirm('いまのあみだは まだ開けていない人がいます。新しく作り直しますか？', '作り直す', 'やめる')) return;
    reveal.clear(); popped.clear();
    st.amida=makeAmida(act, prizeList(act.length)); save(); renderRes();
    setFull(true);   // 作ったら 全画面で 全体を 見せる（v585。上に「名前を押すと たどります」が 出る）
    if(!full) toast('あみだを作りました。上の名前を押すと たどります');
    return;
  }
  if(!act.length){ toast('先に名前を入れてください'); return; }
  if(st.mode==='team' && act.length<2){ toast('班分けは 2人から できます'); return; }
  const res=st.mode==='pick'?doPick():st.mode==='order'?doOrder():doTeam();
  st.last=res;
  st.hist.unshift({t:res.t, mode:res.mode, text:resultText(res)}); st.hist=st.hist.slice(0,MAX_HIST);
  save();
  await shuffleShow(act);
  renderRes(true); renderHist(); renderOpt();
  if(res.reset) toast('全員に回ったので、はじめからにしました', 3500);
  try{ if(navigator.vibrate) navigator.vibrate(40); }catch(_){}
}
/* 決まるまでの「くるくる」（動きをへらす設定の端末では出さない） */
function shuffleShow(names){
  const b=$('kjRes');
  if(!b || names.length<2 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || window.KJ_NO_ANIM) return Promise.resolve();
  clearInterval(anim);
  b.innerHTML=`<div class="kj-spin" id="kjSpin">${esc(names[0])}</div>`;
  const go=$('kjGo'); if(go) go.disabled=true;
  return new Promise(res=>{
    let i=0;
    anim=setInterval(()=>{ i++; const s=$('kjSpin'); if(s) s.textContent=names[rnd(names.length)]; if(i>=12){ clearInterval(anim); anim=0; if(go) go.disabled=false; res(); } }, 70);
  });
}

/* ───────── 結果の文 ───────── */
function resultText(r){
  r=r||st.last; if(!r) return '';
  if(r.mode==='pick') return '🎯 当たり（'+r.list.length+'人・'+when(r.t)+'）\n'+r.list.map((n,i)=>(r.list.length>1?(i+1)+'. ':'')+n).join('\n');
  if(r.mode==='order') return '🔢 順番（'+when(r.t)+'）\n'+r.list.map((n,i)=>(i+1)+'. '+n).join('\n');
  if(r.mode==='team') return '👥 班分け（'+r.teams.length+'班・'+when(r.t)+'）\n'+r.teams.map((t,i)=>r.labels[i]+'（'+t.length+'人）：'+t.map((n,j)=>(r.leader&&j===0?'★':'')+n).join('・')).join('\n')+(r.leader?'\n★＝班長':'');
  return '';
}
function amidaText(){
  const a=st.amida; if(!a) return '';
  return '🪜 あみだくじ（'+when(Date.now())+'）\n'+a.names.map((n,i)=>n+' → '+a.prizes[trace(a,i).end]).join('\n');
}
function curText(){ return st.mode==='amida' ? amidaText() : resultText(); }
function amidaReady(){ const a=st.amida; if(!a){ toast('先に「🪜 あみだを作る」を押してください'); return false; } if(a.open.length<a.names.length){ toast('「🔓 ぜんぶ開ける」で 全員の結果を出してから使えます', 3500); return false; } return true; }
function copy(){ if(st.mode==='amida'&&!amidaReady()) return; const t=curText(); if(!t){ toast('まだ結果がありません'); return; } toolCopyText(t, '結果をコピーしました（LINE などに貼れます）'); }
function share(){ if(st.mode==='amida'&&!amidaReady()) return; const t=curText(); if(!t){ toast('まだ結果がありません'); return; } toolShareText('くじの結果', t); }
function tableRows(){
  if(st.mode==='amida'){ const a=st.amida; return [['名前','結果']].concat(a.names.map((n,i)=>[n, a.prizes[trace(a,i).end]])); }
  const r=st.last; if(!r) return [];
  if(r.mode==='pick') return [['','当たり']].concat(r.list.map((n,i)=>[i+1, n]));
  if(r.mode==='order') return [['順番','名前']].concat(r.list.map((n,i)=>[i+1, n]));
  const h=Math.max(...r.teams.map(t=>t.length));
  return [r.labels.slice()].concat(Array.from({length:h},(_,j)=>r.teams.map(t=>t[j]?(r.leader&&j===0?'★':'')+t[j]:'')));
}
function toTable(){
  if(st.mode==='amida'&&!amidaReady()) return;
  if(st.mode!=='amida' && (!st.last || st.last.mode!==st.mode)){ toast('まだ結果がありません'); return; }
  toolPasteRows(tableRows(), 'くじの結果', closeKuji);
}

/* ───────── 画面 ───────── */
function render(){ renderNames(); renderTabs(); renderOpt(); renderRes(); renderHist(); }
function renderNames(){
  const b=$('kjNames'); if(!b) return;
  const act=active().length, off=st.names.length-act;
  $('kjCnt').textContent=st.names.length?`（${act}人${off?`・休み ${off}人`:''}）`:'';
  if(editing || !st.names.length){
    b.innerHTML=`<textarea id="kjText" rows="6" placeholder="1行に1人ずつ書きます（「、」で区切っても入ります）&#10;例）&#10;田中&#10;鈴木&#10;佐藤">${esc(st.names.join('\n'))}</textarea>
      <div class="kj-row"><button class="kj-b pri" onclick="KJ.namesDone()">✓ できた</button><button class="kj-b" onclick="KJ.names()">📇 名簿から</button><button class="kj-b" onclick="KJ.lists()">📂 名前の組</button>${st.names.length?`<button class="kj-b" onclick="KJ.clear()">🧹 空に</button>`:''}</div>`;
    const t=$('kjText'); t.addEventListener('keydown', e=>e.stopPropagation());
    if(!st.names.length){ editing=true; }
    return;
  }
  b.innerHTML=`<div class="kj-chips">${st.names.map((n,i)=>`<button class="kj-chip${st.off.includes(n)?' off':''}" onclick="KJ.toggle(${i})" aria-pressed="${!st.off.includes(n)}">${esc(n)}</button>`).join('')}</div>
    <div class="kj-tip">名前を押すと「休み」にして、くじから外せます。</div>
    <div class="kj-row"><button class="kj-b" onclick="KJ.edit()">✏️ 名前を直す</button><button class="kj-b" onclick="KJ.names()">📇 名簿から</button><button class="kj-b" onclick="KJ.lists()">📂 名前の組</button></div>`;
}
function renderTabs(){
  const b=$('kjTabs'); if(!b) return;
  b.innerHTML=MODES.map(m=>`<button class="${st.mode===m[0]?'on':''}" onclick="KJ.mode('${m[0]}')">${m[1]}</button>`).join('');
}
const stepper=(key,v,lo,hi,unit)=>`<span class="kj-step"><button onclick="KJ.step('${key}',-1)" aria-label="へらす"${v<=lo?' disabled':''}>−</button><b>${v}</b><small>${unit}</small><button onclick="KJ.step('${key}',1)" aria-label="ふやす"${v>=hi?' disabled':''}>＋</button></span>`;
function renderOpt(){
  const b=$('kjOpt'), g=$('kjGo'); if(!b) return;
  const n=active().length;
  if(st.mode==='pick'){
    const wonAct=st.won.filter(x=>active().includes(x));
    b.innerHTML=`<div class="kj-line"><span>何人 選ぶ</span>${stepper('pickN',Math.min(st.pickN,Math.max(1,n)),1,Math.max(1,n),'人')}</div>
      <label class="kj-sw"><input type="checkbox" ${st.excl?'checked':''} onchange="KJ.set('excl',this.checked)"> 前に当たった人は外す（全員に回るまで）</label>
      ${st.excl&&wonAct.length?`<div class="kj-tip">当たった人：${esc(wonAct.join('・'))}（${wonAct.length}人） <button class="kj-mini" onclick="KJ.wonReset()">🔄 はじめから</button></div>`:''}`;
    g.textContent='🎲 '+Math.min(st.pickN,Math.max(1,n))+'人を選ぶ';
  } else if(st.mode==='order'){
    b.innerHTML=`<div class="kj-tip">${n?n+'人の':'全員の'}順番を、くじで決めます（発表の順・当番の順 など）。</div>`;
    g.textContent='🎲 順番を決める';
  } else if(st.mode==='team'){
    const k=teamCount(n), base=n?Math.floor(n/k):0, extra=n?n%k:0;
    b.innerHTML=`<div class="kj-seg">${[['n','班の数で'],['size','1班の人数で']].map(o=>`<button class="${st.teamBy===o[0]?'on':''}" onclick="KJ.set('teamBy','${o[0]}')">${o[1]}</button>`).join('')}</div>
      <div class="kj-line">${st.teamBy==='n'?`<span>班の数</span>${stepper('teamN',st.teamN,2,Math.max(2,Math.min(50,n||2)),'班')}`:`<span>1班の人数</span>${stepper('teamSize',st.teamSize,1,Math.max(1,n||1),'人')}`}</div>
      ${n?`<div class="kj-tip">${k}班に分けます（${extra?`${base+1}人の班が${extra}つ・${base}人の班が${k-extra}つ`:`どの班も ${base}人`}）</div>`:''}
      <div class="kj-seg sm"><span>班の名前</span>${[['num','1班・2班'],['abc','A班・B班']].map(o=>`<button class="${st.teamLabel===o[0]?'on':''}" onclick="KJ.set('teamLabel','${o[0]}')">${o[1]}</button>`).join('')}</div>
      <label class="kj-sw"><input type="checkbox" ${st.leader?'checked':''} onchange="KJ.set('leader',this.checked)"> 班長も決める（★）</label>`;
    g.textContent='🎲 班に分ける';
  } else {
    b.innerHTML=`<div class="kj-seg sm"><span>下に書くこと</span>${[['hit','当たり'],['num','1〜'+(n||'n')+'の数'],['own','自分で書く']].map(o=>`<button class="${st.prizeKind===o[0]?'on':''}" onclick="KJ.set('prizeKind','${o[0]}')">${o[1]}</button>`).join('')}</div>
      ${st.prizeKind==='hit'?`<div class="kj-line"><span>当たりの数</span>${stepper('hitN',Math.min(st.hitN,Math.max(1,n)),1,Math.max(1,n),'本')}</div>`:''}
      ${st.prizeKind==='own'?`<textarea id="kjPrizes" rows="4" placeholder="1行に1つ（例：司会・書記・会計）。足りない分は「はずれ」になります" oninput="KJ.prizes(this.value)">${esc(st.prizes)}</textarea>`:''}`;
    const p=$('kjPrizes'); if(p) p.addEventListener('keydown', e=>e.stopPropagation());
    g.textContent=st.amida?'🪜 あみだを作り直す':'🪜 あみだを作る';
  }
}
function renderRes(fresh){
  const b=$('kjRes'); if(!b) return;
  if(st.mode==='amida'){ renderAmida(); return; }
  const r=st.last;
  if(!r || r.mode!==st.mode){ b.innerHTML=`<div class="kj-empty">上のボタンを押すと、ここに結果が出ます。</div>`; return; }
  const acts=`<div class="kj-acts"><button onclick="KJ.copy()">📋 コピー</button><button onclick="KJ.share()">📤 共有</button><button onclick="KJ.toTable()">▦ 表に入れる</button></div>`;
  const head=`<div class="kj-res-h">${MODES.find(m=>m[0]===r.mode)[1]} <small>${when(r.t)}</small></div>`;
  if(r.mode==='pick') b.innerHTML=head+`<div class="kj-hits${fresh?' pop':''}">${r.list.map((n,i)=>`<div class="kj-hit">${r.list.length>1?`<i>${i+1}</i>`:''}🎉 ${esc(n)}</div>`).join('')}</div>`+acts;
  else if(r.mode==='order') b.innerHTML=head+`<ol class="kj-order${fresh?' pop':''}">${r.list.map(n=>`<li>${esc(n)}</li>`).join('')}</ol>`+acts;
  else b.innerHTML=head+`<div class="kj-teams${fresh?' pop':''}">${r.teams.map((t,i)=>`<div class="kj-team" style="--c:${COLORS[i%COLORS.length]}"><b>${esc(r.labels[i])}<small>${t.length}人</small></b>${t.map((n,j)=>`<span>${r.leader&&j===0?'★ ':''}${esc(n)}</span>`).join('')}</div>`).join('')}</div>`+acts;
}
function renderHist(){
  const b=$('kjHist'); if(!b) return;
  if(!st.hist.length){ b.hidden=true; return; }
  b.hidden=false;
  const open=b.open;
  b.innerHTML=`<summary>🕘 これまでの結果（${st.hist.length}件）</summary>${st.hist.map(h=>`<pre>${esc(h.text)}</pre>`).join('')}<button class="kj-mini" onclick="KJ.histClear()">🗑 消す</button>`;
  b.open=open;
}

/* ───────── あみだの絵 ───────── */
function amidaGeom(a){
  const n=a.names.length, box=$('kjRes'), W=Math.max(280, (box&&box.clientWidth)||340);
  const dx=Math.max(46, Math.floor((W-12)/n)), w=dx*n, rowH=n>12?14:16, top=50, bot=top+(a.rungs.length+1)*rowH;
  return {n, dx, w, rowH, top, bot, h:bot+44, x:i=>dx/2+i*dx, y:l=>top+(l+1)*rowH};
}
const short=(s,k)=>{ const a=[...s]; return a.length>k?a.slice(0,k-1).join('')+'…':s; };
function renderAmida(){
  const b=$('kjRes'), a=st.amida;
  if(!a){ b.innerHTML=`<div class="kj-empty">「🪜 あみだを作る」を押すと、あみだくじができます。<br>名前の数だけ たて線ができます（${MAX_AMIDA}人まで）。</div>`; return; }
  const G=amidaGeom(a), k=G.dx>=70?5:4;
  const ends=new Map(shownOpen(a).map(i=>[trace(a,i).end, i]));
  let svg=`<svg class="kj-amida" viewBox="0 0 ${G.w} ${G.h}" width="${G.w}" height="${G.h}" role="img" aria-label="あみだくじ">`;
  for(let i=0;i<G.n;i++) svg+=`<line x1="${G.x(i)}" y1="${G.top}" x2="${G.x(i)}" y2="${G.bot}" class="v"/>`;
  a.rungs.forEach((r,l)=>r.forEach((on,c)=>{ if(on) svg+=`<line x1="${G.x(c)}" y1="${G.y(l)}" x2="${G.x(c+1)}" y2="${G.y(l)}" class="h"/>`; }));
  a.open.forEach(i=>{ const t=trace(a,i); svg+=`<polyline class="path" data-i="${i}" style="--c:${COLORS[i%COLORS.length]}" points="${t.pts.map(([c,l])=>G.x(c)+','+(l<0?G.top:l>=a.rungs.length?G.bot:G.y(l))).join(' ')}"/>`; });
  a.names.forEach((n,i)=>{ const op=a.open.includes(i);
    svg+=`<g class="nm${op?' on':''}" onclick="KJ.open(${i})" style="--c:${COLORS[i%COLORS.length]}"><rect x="${G.x(i)-G.dx/2+3}" y="4" width="${G.dx-6}" height="38" rx="8"/><text x="${G.x(i)}" y="28">${esc(short(n,k))}</text></g>`; });
  a.prizes.forEach((p,c)=>{ const who=ends.get(c), shown=who!=null;
    svg+=`<g class="pz${shown?' on':''}${shown && popped.has(who)?' pop':''}"${shown?` style="--c:${COLORS[who%COLORS.length]}"`:''}><rect x="${G.x(c)-G.dx/2+3}" y="${G.bot+4}" width="${G.dx-6}" height="34" rx="8"/><text x="${G.x(c)}" y="${G.bot+26}">${shown?esc(short(p,k)):'？'}</text></g>`; });
  svg+='</svg>';
  const all=a.open.length>=a.names.length && !reveal.size, so=shownOpen(a);
  b.innerHTML=`<div class="kj-res-h">🪜 あみだ <small>上の名前を押すと たどります</small></div>
    <div class="kj-amida-wrap">${svg}</div>
    ${so.length?`<div class="kj-alist">${so.map(i=>`<span style="--c:${COLORS[i%COLORS.length]}"><b>${esc(a.names[i])}</b> → ${esc(a.prizes[trace(a,i).end])}</span>`).join('')}</div>`:''}
    <div class="kj-acts"><button class="kj-fullbtn" onclick="KJ.full(true)">⛶ 全画面で 見る</button>${all?`<button onclick="KJ.copy()">📋 コピー</button><button onclick="KJ.share()">📤 共有</button><button onclick="KJ.toTable()">▦ 表に入れる</button>`:`<button onclick="KJ.openAll()">🔓 ぜんぶ開ける</button>`}</div>`;
  drawAnim(b);
}
// 線を 引く（描きなおしても とちゅうから つづける）。ease は CSS の ease-in-out に 近い
const easeIO=k=>k<0.5 ? 2*k*k : 1-Math.pow(-2*k+2, 2)/2;
function drawAnim(root){
  if(!root || !reveal.size) return;
  const now=performance.now();
  root.querySelectorAll('polyline.path[data-i]').forEach(p=>{
    const t0=reveal.get(+p.dataset.i); if(t0==null || !p.getTotalLength) return;
    const L=p.getTotalLength(), k=Math.min(1, Math.max(0, (now-t0)/DRAW_MS)), left=Math.max(0, DRAW_MS-(now-t0));
    p.style.transition='none'; p.style.strokeDasharray=L; p.style.strokeDashoffset=L*(1-easeIO(k));
    p.getBoundingClientRect();
    p.style.transition='stroke-dashoffset '+Math.round(left)+'ms '+(k>0.02 ? 'ease-out' : 'ease-in-out'); p.style.strokeDashoffset='0';
  });
}
// 線を 引きはじめる → 下に 着いたら 答えを 出す（ぽんと）
function startDraw(list){
  if(!list.length || noAnim()) return;
  const t0=performance.now();
  list.forEach(i=>reveal.set(i, t0));
  setTimeout(()=>{
    const done=list.filter(i=>reveal.get(i)===t0); if(!done.length) return;
    done.forEach(i=>{ reveal.delete(i); popped.add(i); });
    renderAmida(); renderFull(); popped.clear();
  }, DRAW_MS+60);
}

/* ───────── ⛶ あみだの 全画面（v585）：画面いっぱいに 全体が おさまる ───────── */
function fullGeom(a, W, H){
  const n=a.names.length, colW=W/n, L=a.rungs.length, len=x=>[...String(x)].length;
  const nmax=Math.max(1, ...a.names.map(len)), pmax=Math.max(1, ...a.prizes.map(len));
  const vert=colW<58;   // せまい ときは 縦書き
  const fs=vert ? Math.max(9, Math.min(19, colW*0.6)) : Math.max(11, Math.min(20, (colW-10)/Math.min(nmax, 5)));
  const ch=fs*1.08;
  const nameH=vert ? Math.min(H*0.3, Math.min(nmax, 7)*ch+14) : fs*1.5+16;
  const pzH=vert ? Math.min(H*0.24, Math.min(pmax, 5)*ch+14) : fs*1.5+14;
  const top=nameH+10, bot=H-pzH-10, rowH=Math.max(3, (bot-top)/(L+1));
  return {n, W, H, colW, vert, fs, ch, nameH, pzH, top, bot, rowH, x:i=>colW*(i+0.5), y:l=>top+(l+1)*rowH};
}
// 字を 入れる（横書きは 1行・縦書きは 1字ずつ 下へ）
function boxText(G, s, cx, y0, h){
  if(!G.vert){ const k=Math.max(2, Math.floor((G.colW-8)/(G.fs*0.98))); return `<text x="${cx.toFixed(1)}" y="${(y0+h/2+G.fs*0.36).toFixed(1)}" style="font-size:${G.fs.toFixed(1)}px">${esc(short(String(s), k))}</text>`; }
  const max=Math.max(1, Math.floor((h-10)/G.ch)); let c=[...String(s)]; if(c.length>max) c=c.slice(0, Math.max(1, max-1)).concat(['︙']);
  const y1=y0+(h-c.length*G.ch)/2+G.fs*0.9;
  return `<text x="${cx.toFixed(1)}" y="${y1.toFixed(1)}" style="font-size:${G.fs.toFixed(1)}px">${c.map((x,i)=>`<tspan x="${cx.toFixed(1)}" dy="${i ? G.ch.toFixed(1) : 0}">${esc(/^[ー－\-―〜~]$/.test(x) ? '｜' : x)}</tspan>`).join('')}</text>`;
}
function fullSvg(a, G){
  const ends=new Map(shownOpen(a).map(i=>[trace(a,i).end, i])), pw=Math.max(3, Math.min(7, G.colW*0.14)).toFixed(1), r=Math.min(8, G.colW*0.18).toFixed(1);
  let s=`<svg class="kj-amida full" viewBox="0 0 ${G.W} ${G.H}" width="${G.W}" height="${G.H}" role="img" aria-label="あみだくじ（全画面）">`;
  for(let i=0;i<G.n;i++) s+=`<line x1="${G.x(i).toFixed(1)}" y1="${G.top.toFixed(1)}" x2="${G.x(i).toFixed(1)}" y2="${G.bot.toFixed(1)}" class="v"/>`;
  a.rungs.forEach((row,l)=>row.forEach((on,c)=>{ if(on) s+=`<line x1="${G.x(c).toFixed(1)}" y1="${G.y(l).toFixed(1)}" x2="${G.x(c+1).toFixed(1)}" y2="${G.y(l).toFixed(1)}" class="h"/>`; }));
  a.open.forEach(i=>{ const t=trace(a,i); s+=`<polyline class="path" data-i="${i}" style="--c:${COLORS[i%COLORS.length]};stroke-width:${pw}px" points="${t.pts.map(([c,l])=>G.x(c).toFixed(1)+','+(l<0?G.top:l>=a.rungs.length?G.bot:G.y(l)).toFixed(1)).join(' ')}"/>`; });
  a.names.forEach((n,i)=>{ const op=a.open.includes(i), x0=G.x(i)-G.colW/2+2;
    s+=`<g class="nm${op?' on':''}" onclick="KJ.open(${i})" style="--c:${COLORS[i%COLORS.length]}"><rect x="${x0.toFixed(1)}" y="2" width="${(G.colW-4).toFixed(1)}" height="${G.nameH.toFixed(1)}" rx="${r}"/>${boxText(G, n, G.x(i), 2, G.nameH)}</g>`; });
  a.prizes.forEach((p,c)=>{ const who=ends.get(c), shown=who!=null, x0=G.x(c)-G.colW/2+2, y0=G.bot+8;
    s+=`<g class="pz${shown?' on':''}${shown && popped.has(who)?' pop':''}"${shown?` style="--c:${COLORS[who%COLORS.length]}"`:''}><rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(G.colW-4).toFixed(1)}" height="${G.pzH.toFixed(1)}" rx="${r}"/>${boxText(G, shown?p:'？', G.x(c), y0, G.pzH)}</g>`; });
  return s+'</svg>';
}
function renderFull(){
  if(!full) return;
  const a=st.amida; if(!a){ setFull(false); return; }
  const box=$('kjFullBox'), bar=$('kjFullBar'), tip=$('kjFullTip'); if(!box) return;
  // 上と 下の 字・ボタンを 先に 入れてから 大きさを はかる（あみだが 下に はみ出さない ように）
  const all=a.open.length>=a.names.length && !reveal.size, port=window.innerWidth<window.innerHeight;
  if(tip) tip.textContent=all ? 'ぜんぶ 開けました' : (a.names.length>12 && port ? '名前を押すと たどります（横向きに すると 大きく 見えます）' : '名前を押すと たどります');
  if(bar) bar.innerHTML=(all ? `<button type="button" onclick="KJ.copy()">📋 コピー</button>` : `<button type="button" onclick="KJ.openAll()">🔓 ぜんぶ開ける</button>`)+`<button type="button" class="pri" onclick="KJ.full(false)">✕ 閉じる</button>`;
  box.innerHTML='';
  const W=Math.max(120, box.clientWidth), H=Math.max(160, box.clientHeight), G=fullGeom(a, W, H);
  box.innerHTML=fullSvg(a, G);
  drawAnim(box);
}
function fullKey(e){ if(full && e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); setFull(false); } }
function setFull(on){
  if(on){
    if(!st || !st.amida) return;
    if(full){ renderFull(); return; }
    const el=document.createElement('div'); el.className='kj-full'; el.id='kjFull';
    el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','あみだくじ（全画面）');
    el.innerHTML=`<div class="kj-full-top"><b>🪜 あみだくじ</b><small id="kjFullTip"></small></div><div class="kj-full-box" id="kjFullBox"></div><div class="kj-full-bar" id="kjFullBar"></div>`;
    document.body.appendChild(el);
    full={el, rel:null};
    const me=full; full.rel=typeof modalBack==='function' ? modalBack(()=>{ if(full===me) setFull(false); }) : null;   // 端末の「戻る」で 全画面だけ 閉じる
    window.addEventListener('keydown', fullKey, true);
    renderFull();
  } else if(full){
    const f=full; full=null;
    window.removeEventListener('keydown', fullKey, true);
    f.el.remove(); if(f.rel) f.rel();
  }
}
function openOne(i){
  const a=st.amida; if(!a||i<0||i>=a.names.length||a.open.includes(i)) return;
  a.open.push(i); save(); startDraw([i]); renderAmida(); renderFull();   // 線を 引いて、下に 着いたら 答え（v586）
  if(a.open.length===a.names.length){ st.hist.unshift({t:Date.now(), mode:'amida', text:amidaText()}); st.hist=st.hist.slice(0,MAX_HIST); save(); renderHist(); }
}
function openAll(){
  const a=st.amida; if(!a) return;
  const add=a.names.map((_,i)=>i).filter(i=>!a.open.includes(i));
  add.forEach(i=>a.open.push(i));
  st.hist.unshift({t:Date.now(), mode:'amida', text:amidaText()}); st.hist=st.hist.slice(0,MAX_HIST);
  save(); startDraw(add); renderAmida(); renderHist(); renderFull();   // ぜんぶ いっしょに 線を 引いて から 答え（v586）
}

/* ───────── 名前 ───────── */
function parseNames(t){ return String(t||'').split(/\r?\n|[、,，\t]/).map(x=>line(x,24)).filter(Boolean); }
function setNames(names){
  const prevOff=st.off;
  st.names=uniq(names).slice(0,MAX_N);
  st.off=prevOff.filter(n=>st.names.includes(n));
  save();
}
function namesDone(){
  const t=$('kjText'); if(!t){ editing=false; return; }
  const names=parseNames(t.value);
  if(names.length>MAX_N) toast(MAX_N+'人までにしました');
  setNames(names); editing=false;
  renderNames(); renderOpt();
}
function edit(){ editing=true; renderNames(); const t=$('kjText'); if(t){ t.focus(); } }
async function clear(){ if(!await appConfirm('名前をぜんぶ消しますか？（📂 名前の組 に保存したものは残ります）', '消す', 'やめる')) return; setNames([]); editing=true; renderNames(); renderOpt(); }
function toggle(i){ const n=st.names[i]; if(n==null) return; st.off=st.off.includes(n)?st.off.filter(x=>x!==n):st.off.concat(n); save(); renderNames(); renderOpt(); }
async function names(){
  if(editing){ const t=$('kjText'); if(t) setNames(parseNames(t.value)); }
  const got=await toolPickNames(st.lists.map(l=>({label:'📂 '+l.name, names:l.names})));
  if(!got||!got.length) return;
  let how='add';
  if(st.names.length){
    how=await choose('いまの名前（'+st.names.length+'人）に、この'+got.length+'人を…', [['add','＋ 足す'],['set','入れかえる']]);
    if(!how) return;
  }
  setNames(how==='set'?got:st.names.concat(got.filter(n=>!st.names.includes(n)))); editing=false; renderNames(); renderOpt();
  toast(st.names.length+'人になりました');
}

/* 名前の組（クラス・部 など）を保存して呼ぶ */
function popOpen(html){
  popClose();
  const el=document.createElement('div'); el.className='kj-pop-bg';
  el.innerHTML=`<div class="kj-pop" role="dialog">${html}</div>`;
  el.addEventListener('mousedown', e=>{ if(e.target===el) popClose(); });
  $('kujiOverlay').appendChild(el);
  pop={el, rel:modalBack(()=>popClose(true))};
}
function popClose(fromBack){ if(!pop) return; const p=pop; pop=null; if(!fromBack) p.rel(); p.el.remove(); if(p.done) p.done(null); }
/* いくつかのうちから選ぶ（やめたら null） */
function choose(msg, opts){
  return new Promise(res=>{
    popOpen(`<b>${esc(msg)}</b><div class="kj-pick">${opts.map(o=>`<button class="kj-b" data-v="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div><div class="kj-pop-acts"><button class="kj-b" data-v="">やめる</button></div>`);
    const p=pop; p.done=res;
    p.el.addEventListener('click', e=>{ const b=e.target.closest('button[data-v]'); if(!b) return; p.done=null; popClose(); res(b.dataset.v||null); });
  });
}
function lists(){
  if(editing){ const t=$('kjText'); if(t) setNames(parseNames(t.value)); }
  popOpen(`<b>📂 名前の組</b>
    ${st.lists.length?`<div class="kj-lists">${st.lists.map(l=>`<div class="kj-li"><button class="kj-b" onclick="KJ.listLoad('${esc(l.id)}')"><b>${esc(l.name)}</b><small>${l.names.length}人：${esc(l.names.slice(0,5).join('、'))}${l.names.length>5?' …':''}</small></button><button class="kj-x" onclick="KJ.listDel('${esc(l.id)}')" aria-label="消す">🗑</button></div>`).join('')}</div>`:`<div class="kj-tip">まだありません。クラス・部・班 などの名前を保存しておくと、次からすぐ呼び出せます。</div>`}
    ${st.names.length?`<div class="kj-save"><input id="kjListName" maxlength="30" placeholder="名前（例：3年2組）"><button class="kj-b pri" onclick="KJ.listSave()">💾 いまの${st.names.length}人を保存</button></div>`:''}
    <div class="kj-pop-acts"><button class="kj-b" onclick="KJ.popClose()">閉じる</button></div>`);
  const i=$('kjListName'); if(i) i.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); listSave(); } });
}
function listSave(){
  const name=line($('kjListName').value,30); if(!name){ toast('組の名前を入れてください'); return; }
  const same=st.lists.find(l=>l.name===name);
  if(same) same.names=st.names.slice();
  else { if(st.lists.length>=MAX_LISTS){ toast('名前の組は '+MAX_LISTS+'個までです'); return; } st.lists.unshift({id:uid('l'), name, names:st.names.slice()}); }
  save(); popClose(); toast('「'+name+'」に保存しました（'+st.names.length+'人）');
}
function listLoad(id){
  const l=st.lists.find(x=>x.id===id); if(!l) return;
  setNames(l.names); st.off=[]; save(); editing=false; popClose(); renderNames(); renderOpt();
  toast('「'+l.name+'」の'+l.names.length+'人にしました');
}
async function listDel(id){
  const l=st.lists.find(x=>x.id===id); if(!l) return;
  if(!await appConfirm('名前の組「'+l.name+'」を消しますか？', '消す', 'やめる')) return;
  st.lists=st.lists.filter(x=>x.id!==id); save(); lists();
}

/* ───────── 設定 ───────── */
function setMode(m){ if(!MODES.some(x=>x[0]===m)) return; if(editing) namesDone(); st.mode=m; save(); renderTabs(); renderOpt(); renderRes(); }
function set(k,v){ st[k]=v; save(); renderOpt(); if(k==='prizeKind'||k==='teamLabel'||k==='leader') renderRes(); }
function step(k,d){
  const n=active().length;
  const lim={pickN:[1,Math.max(1,n)], teamN:[2,Math.max(2,Math.min(50,n||2))], teamSize:[1,Math.max(1,n||1)], hitN:[1,Math.max(1,Math.min(MAX_AMIDA,n||1))]}[k]; if(!lim) return;
  st[k]=Math.max(lim[0], Math.min(lim[1], (k==='pickN'||k==='hitN'?Math.min(st[k],lim[1]):st[k])+d)); save(); renderOpt();
}
function prizes(v){ st.prizes=String(v||'').slice(0,2000); save(); }
function wonReset(){ st.won=[]; save(); renderOpt(); toast('当たった人を はじめからにしました'); }
async function histClear(){ if(!await appConfirm('これまでの結果を消しますか？', '消す', 'やめる')) return; st.hist=[]; save(); renderHist(); }

/* ───────── 見た目 ───────── */
const KJ_CSS=`
#kujiOverlay .kj-modal{ display:flex; flex-direction:column; }
.kj-body{ flex:1; min-height:0; overflow:auto; padding:10px 12px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.kj-wrap{ max-width:720px; margin:0 auto; }
.kj-sec{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); }
.kj-sec h4{ margin:0 0 8px; font-size:15px; color:var(--acc-text,var(--acc)); } .kj-sec h4 small{ color:var(--text-light,#777); font-weight:normal; font-size:12.5px; }
.kj-chips{ display:flex; flex-wrap:wrap; gap:6px; }
.kj-chip{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:var(--acc-weak,rgba(33,115,70,.12)); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; touch-action:manipulation; }
.kj-chip.off{ background:transparent; color:var(--text-light,#999); text-decoration:line-through; border-style:dashed; }
#kjText,#kjPrizes{ display:block; width:100%; box-sizing:border-box; padding:8px 10px; font-size:16px; line-height:1.5; border:1px solid rgba(120,132,156,.5); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text,#222); resize:vertical; font-family:inherit; }
#kjPrizes{ margin-top:8px; }
.kj-row{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.kj-b{ min-height:40px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; touch-action:manipulation; }
.kj-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-mini{ margin-left:4px; padding:3px 9px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:12px; cursor:pointer; }
.kj-tip{ margin-top:6px; font-size:12.5px; color:var(--text-light,#777); line-height:1.6; }
.kj-tabs{ display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin:0 0 10px; }
.kj-tabs button{ min-height:46px; padding:0 2px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); color:var(--text,#333); font-size:13.5px; font-weight:bold; cursor:pointer; }
.kj-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-line{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin:4px 0; font-weight:bold; }
.kj-step{ display:inline-flex; align-items:center; gap:6px; } .kj-step b{ min-width:34px; text-align:center; font-size:22px; font-variant-numeric:tabular-nums; } .kj-step small{ font-size:12px; color:var(--text-light,#777); margin-left:-4px; }
.kj-step button{ width:44px; height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:20px; font-weight:bold; cursor:pointer; } .kj-step button:disabled{ opacity:.35; }
.kj-sw{ display:flex; align-items:center; gap:8px; margin:8px 0 2px; font-size:14px; } .kj-sw input{ width:20px; height:20px; flex:none; }
.kj-seg{ display:flex; flex-wrap:wrap; align-items:center; gap:4px; margin:2px 0 8px; } .kj-seg span{ font-size:12.5px; font-weight:bold; color:var(--text-light,#777); margin-right:4px; }
.kj-seg button{ min-height:36px; padding:0 12px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13.5px; font-weight:bold; cursor:pointer; }
.kj-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-go{ display:block; width:100%; height:58px; margin:0 0 10px; border:none; border-radius:16px; background:linear-gradient(135deg,#ff7043,#e53935); color:#fff; font-size:20px; font-weight:bold; letter-spacing:.04em; box-shadow:0 4px 14px rgba(229,57,53,.35); cursor:pointer; touch-action:manipulation; }
.kj-go:active{ transform:scale(.98); } .kj-go:disabled{ opacity:.7; }
.kj-empty{ padding:16px 6px; text-align:center; color:var(--text-light,#888); font-size:13.5px; line-height:1.7; }
.kj-spin{ padding:26px 6px; text-align:center; font-size:34px; font-weight:bold; color:#e53935; } body.dark .kj-spin{ color:#ff8a80; }
.kj-res-h{ font-weight:bold; color:var(--acc-text,var(--acc)); margin-bottom:8px; } .kj-res-h small{ color:var(--text-light,#777); font-weight:normal; font-size:12px; margin-left:4px; }
.kj-hits{ display:flex; flex-direction:column; gap:6px; }
.kj-hit{ padding:12px 14px; border-radius:14px; background:rgba(255,193,7,.22); border:2px solid #ffb300; font-size:24px; font-weight:bold; text-align:center; word-break:break-all; }
.kj-hit i{ font-style:normal; font-size:14px; margin-right:6px; color:#e65100; } body.dark .kj-hit i{ color:#ffb74d; }
.kj-order{ margin:0; padding-left:2.2em; font-size:18px; line-height:1.9; font-weight:bold; } .kj-order li::marker{ color:var(--acc-text,var(--acc)); }
.kj-teams{ display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:8px; }
.kj-team{ padding:8px 10px; border-radius:12px; border:2px solid var(--c); background:color-mix(in srgb, var(--c) 9%, transparent); }
.kj-team b{ display:flex; justify-content:space-between; align-items:baseline; color:var(--c); font-size:16px; margin-bottom:4px; } body.dark .kj-team b{ color:color-mix(in srgb, var(--c) 55%, #fff); }
.kj-team b small{ font-size:12px; color:var(--text-light,#777); } .kj-team span{ display:block; font-size:15px; font-weight:bold; padding:2px 0; word-break:break-all; }
.pop{ animation:kjPop .35s ease-out; } @keyframes kjPop{ 0%{ transform:scale(.85); opacity:0; } 100%{ transform:scale(1); opacity:1; } }
@media (prefers-reduced-motion: reduce){ .pop{ animation:none; } }
.kj-acts{ display:flex; gap:6px; margin-top:12px; } .kj-acts button{ flex:1; height:44px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.kj-amida-wrap{ overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:4px; }
.kj-full{ position:fixed; inset:0; z-index:5000; display:flex; flex-direction:column; background:var(--modal-bg,#fff); color:var(--text,#222); padding:calc(6px + var(--safe-top,0px)) 8px calc(8px + var(--safe-bottom,0px)); box-sizing:border-box; }
.kj-full-top{ display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; padding:4px 6px 6px; } .kj-full-top b{ font-size:17px; } .kj-full-top small{ font-size:13px; color:var(--text-light,#666); }
.kj-full-box{ flex:1; min-height:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.kj-full-box .kj-amida{ display:block; margin:0; }
.kj-full-bar{ display:flex; gap:8px; padding-top:8px; } .kj-full-bar button{ flex:1; min-height:48px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.kj-full-bar button.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.kj-amida{ display:block; margin:0 auto; touch-action:pan-x pan-y; }
.kj-amida line.v{ stroke:rgba(120,132,156,.85); stroke-width:3; } .kj-amida line.h{ stroke:rgba(120,132,156,.85); stroke-width:3; stroke-linecap:round; }
.kj-amida .path{ fill:none; stroke:var(--c); stroke-width:6; stroke-linejoin:round; stroke-linecap:round; opacity:.9; }
.kj-amida g.nm{ cursor:pointer; } .kj-amida g rect{ fill:var(--modal-bg,#fff); stroke:rgba(120,132,156,.6); stroke-width:1.5; }
.kj-amida g.nm rect{ fill:var(--acc-weak,rgba(33,115,70,.12)); stroke:var(--acc); }
.kj-amida g.nm.on rect,.kj-amida g.pz.on rect{ fill:var(--c); stroke:var(--c); }
.kj-amida text{ text-anchor:middle; font-size:13px; font-weight:bold; fill:var(--text,#222); pointer-events:none; }
.kj-amida g.on text{ fill:#fff; }
.kj-amida g.pz.pop{ transform-box:fill-box; transform-origin:center; animation:kjPz .5s cubic-bezier(.2,.9,.3,1.3); }
@keyframes kjPz{ 0%{ transform:scale(.4); opacity:.3; } 60%{ transform:scale(1.18); opacity:1; } 100%{ transform:scale(1); } }
.kj-alist{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; } .kj-alist span{ padding:4px 10px; border-radius:14px; border:2px solid var(--c); font-size:14px; }
.kj-hist{ margin:0 0 10px; padding:8px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.25); }
.kj-hist summary{ cursor:pointer; font-weight:bold; color:var(--acc-text,var(--acc)); padding:4px 0; }
.kj-hist pre{ margin:6px 0; padding:8px 10px; border-radius:8px; background:rgba(120,132,156,.08); font-size:13px; line-height:1.55; white-space:pre-wrap; word-break:break-all; font-family:inherit; }
.kj-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; padding-top:9vh; }
.kj-pop{ width:min(440px,92%); max-height:80%; overflow:auto; box-sizing:border-box; padding:16px; border-radius:14px; background:var(--panel,var(--modal-bg,#fff)); color:var(--text,#222); box-shadow:0 10px 40px rgba(0,0,0,.35); }
.kj-pop>b{ display:block; font-size:16px; margin-bottom:8px; }
.kj-lists{ display:flex; flex-direction:column; gap:6px; } .kj-li{ display:flex; gap:6px; } .kj-li .kj-b{ flex:1; min-width:0; text-align:left; padding:6px 10px; } .kj-li .kj-b small{ display:block; font-weight:normal; font-size:12px; color:var(--text-light,#777); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kj-x{ flex:none; width:44px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:transparent; cursor:pointer; }
.kj-save{ display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; } .kj-save input{ flex:1; min-width:140px; height:42px; padding:0 10px; font-size:16px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.kj-pop-acts{ display:flex; justify-content:flex-end; margin-top:12px; }
.kj-pick{ display:flex; flex-direction:column; gap:6px; margin-top:6px; } .kj-pick .kj-b{ min-height:46px; font-size:15px; }
@media (max-width:380px){ .kj-body{ padding:8px 8px calc(16px + var(--safe-bottom,0px)); } .kj-sec{ padding:8px 9px 10px; } .kj-tabs button{ font-size:12.5px; } .kj-b{ padding:0 9px; font-size:13px; } .kj-hit{ font-size:21px; } }
`;
function ensureDom(){
  if($('kujiOverlay')) return;
  const stl=document.createElement('style'); stl.id='kjStyle'; stl.textContent=KJ_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="kujiOverlay">
  <div class="modal vol-modal kj-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🎲 くじ・班分け</span><button class="modal-close" onclick="closeKuji()" aria-label="閉じる">✕</button></div>
    <div class="kj-body"><div class="kj-wrap">
      <section class="kj-sec"><h4>👥 名前 <small id="kjCnt"></small></h4><div id="kjNames"></div></section>
      <div class="kj-tabs" id="kjTabs" role="tablist"></div>
      <section class="kj-sec" id="kjOpt"></section>
      <button class="kj-go" id="kjGo" onclick="KJ.go()">🎲 決める</button>
      <section class="kj-sec" id="kjRes"></section>
      <details class="kj-hist" id="kjHist" hidden></details>
    </div></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  window.addEventListener('resize', ()=>{ if(isDlgOpen('kujiOverlay') && st && st.mode==='amida') renderAmida(); renderFull(); });
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openKuji(){
  ensureDom(); load(); editing=false;
  openDlg('kujiOverlay', ()=>{ popClose(); setFull(false); clearInterval(anim); anim=0; });
  render();
}
function closeKuji(){ if(!$('kujiOverlay')||!isDlgOpen('kujiOverlay')) return; if(editing) namesDone(); popClose(); setFull(false); clearInterval(anim); anim=0; closeDlg('kujiOverlay'); }

window.KJ={ go, mode:setMode, set, step, prizes, wonReset, histClear, toggle, edit, namesDone, clear, names, lists, listSave, listLoad, listDel, open:openOne, openAll, copy, share, toTable, popClose:()=>popClose(), full:setFull, isFull:()=>!!full, drawing:()=>[...reveal.keys()],
  state:()=>JSON.parse(JSON.stringify(st)), setNames:a=>{ setNames(a); editing=false; render(); }, text:curText, rows:tableRows, rnd, shuffle, trace:(i)=>trace(st.amida,i), clean, makeAmida };
Object.assign(window, { openKuji, closeKuji });
})();
