/* 📝 会議・総会の 議事録（v605。表電卓の道具。apps/gijiroku/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   町内会・PTA・役員会・職場の 会議・安全衛生委員会 などの 議事録を つくる。
   ・会議ごとに 会の 名前・会議の 名前・日時・場所・出席者（📇 名簿から・前回と 同じ 人。出席／欠席／委任）・議長・書記・議事録署名人
   ・議題ごとに 話し合ったこと・決まったこと・🗳 採決（賛成・反対・棄権 → 可決／否決）・宿題（内容・担当・期限・✓）
   ・前回からの 宿題（同じ 会の まだの もの）を 上に 出して ✓。📌 宿題 の 一覧（だれが・いつまで・過ぎたら 赤）
   ・会員の 数を 入れると 総会の 成立（出席＋委任が 過半数か）を 出す
   ・🖨 印刷・PDF（議事録の 形・署名欄）・📄 Word（.docx）・📊 Excel（.xlsx）（v609）・🖼 画像・📋 文字で コピー・📅 次回を カレンダーに・⏭ 次の 会議を 作る
   ・💾 保存（すぐ この 端末に 保存して 知らせる）・🗂 控え（.json）に 保存・送る・読む（機種変更・係の 交代。v609）
   ・📖 議事録の 例：会議の 種類（23）ごとに どんな 会議か・書く ときの コツ・議事録の 例 5つ（gijiroku-rei.js。v610）
   ・🎤 声で 書く（端末が できるとき）。ひな形：定例会・役員会／総会／職場の 会議／安全衛生委員会／白紙
   中身は excalc_gijiroku（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_gijiroku', MAX_M=300, MAX_P=200, MAX_I=40, MAX_T=40;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const multi=(v,n)=>String(v==null?'':v).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').split('\n').map(x=>x.replace(/\s+$/,'')).join('\n').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);
const okD=s=>typeof s==='string' && /^\d{4}-\d\d-\d\d$/.test(s) && !isNaN(new Date(s+'T00:00'));
const okT=s=>typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
let fixedToday=null;
const todayS=()=>fixedToday && okD(fixedToday) ? fixedToday : ymd(new Date());
const WD='日月火水木金土';
const dOf=s=>{ const a=s.split('-').map(Number); return new Date(a[0], a[1]-1, a[2]); };
const jd=(s, yr)=>{ if(!okD(s)) return ''; const d=dOf(s); return (yr || d.getFullYear()!==dOf(todayS()).getFullYear() ? d.getFullYear()+'年' : '')+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）'; };
const md=s=>{ if(!okD(s)) return ''; const d=dOf(s); return (d.getMonth()+1)+'/'+d.getDate(); };
const ST={p:'出席', a:'欠席', d:'委任'};
// 会議の ひな形：[key, 名前, 議題, まとまり, 署名欄を はじめから 出すか]（v608 で 24に ふやした。議題は「📋 テンプレートから」でも 足せる）
const TPL_G=[['chonai','🏘 町内会・自治会'],['pta','🏫 PTA・学校・子ども会'],['kanri','🏢 マンション 管理組合'],['work','💼 職場・会社・現場'],['dantai','🤝 サークル・団体'],['etc','🏠 家族・その他']];
const TPL=[
  ['teirei','📋 定例会・役員会',['前回の 議事録・宿題の 確認','報告事項','協議事項','その他'],'chonai',false],
  ['sokai','🏛 総会',['第1号議案 事業報告','第2号議案 決算報告・監査報告','第3号議案 事業計画（案）','第4号議案 予算（案）','第5号議案 役員の 選出','その他'],'chonai',true],
  ['gyoji','🎪 行事の 打ち合わせ（祭り・運動会）',['行事の 日時・場所','役割分担','準備する 物・買い物','予算・会計','当日の 流れ','雨の とき・安全の 対策','その他'],'chonai',false],
  ['bosai','🚒 防災・防犯の 会議',['防災訓練の 日程','避難場所・連絡網の 確認','備蓄品の 点検','見回り・防犯の 当番','その他'],'chonai',false],
  ['pta_un','🏫 PTA 運営委員会',['会長 あいさつ','各委員会からの 報告','学校からの 連絡','行事の 準備・役割分担','会計 報告','その他'],'pta',false],
  ['pta_sokai','🏫 PTA 総会',['第1号議案 活動報告','第2号議案 決算報告・監査報告','第3号議案 活動計画（案）','第4号議案 予算（案）','第5号議案 役員の 選出・承認','第6号議案 規約の 改正','その他'],'pta',true],
  ['kodomo','🧒 子ども会・育成会',['行事の 予定','役割分担','会費・会計','安全・見守り','その他'],'pta',false],
  ['bukatsu','⚽ 部活・スポーツ少年団の 保護者会',['大会・練習の 予定','送迎・当番','会費・会計','道具・ユニフォーム','その他'],'pta',false],
  ['kanri_riji','🏢 管理組合 理事会',['前回 議事録の 確認','管理会社からの 報告','収支・会計の 報告','修繕・点検の 予定','住民からの 要望・苦情','規約・使用細則','その他'],'kanri',true],
  ['kanri_sokai','🏢 管理組合 総会',['第1号議案 事業報告・決算報告','第2号議案 監査報告','第3号議案 事業計画・予算（案）','第4号議案 役員の 選任','第5号議案 大規模修繕','第6号議案 規約の 改正','その他'],'kanri',true],
  ['shokuba','💼 職場の 会議',['前回の 宿題の 確認','報告・共有','決めたい こと','次の 予定'],'work',false],
  ['chorei','🌅 朝礼・ミーティング',['連絡事項','今日の 予定','安全の ひとこと','困りごと・共有'],'work',false],
  ['anzen','⛑ 安全衛生委員会',['前月の 災害・ヒヤリハット','職場の 巡視の 結果','健康管理（健康診断・熱中症 など）','今月の 重点の 取り組み','その他'],'work',false],
  ['genba','🏗 現場の 打ち合わせ（工程会議）',['工程の 確認','安全の 確認','搬入・車両の 予定','品質・検査','近隣への 配慮','その他'],'work',false],
  ['eigyo','📈 営業会議',['前月の 実績','今月の 目標・見込み','案件の 進み具合','課題と 対策','その他'],'work',false],
  ['pj','🗂 プロジェクト 会議',['進み具合の 確認','課題・リスク','決める こと','宿題の 確認','次回までの 予定'],'work',false],
  ['torishimari','🏛 取締役会',['前回 議事録の 承認','業務執行の 報告','決議事項','報告事項','その他'],'work',true],
  ['circle','🎨 サークル・同好会',['活動の 予定','会費・会計','発表会・イベント','新しい 会員','その他'],'dantai',false],
  ['npo','🤝 NPO・ボランティア団体の 理事会',['活動報告','会計報告','助成金・寄付','今後の 活動計画','その他'],'dantai',true],
  ['shotenkai','🏪 商店会・組合',['前回の 確認','イベント・売り出し','会費・会計','共同の 取り組み','その他'],'dantai',false],
  ['senior','🌸 シニアクラブ（老人会）',['行事の 予定（旅行・お楽しみ会）','会費・会計','見守り・声かけ','健康づくり','その他'],'dantai',false],
  ['shobo','🚒 消防団・自主防災会',['訓練・点検の 予定','出動の 報告','器具・備品','会計','その他'],'dantai',false],
  ['kazoku','🏠 家族会議',['話し合いたい こと','家計・お金','家事の 分担','予定（旅行・行事）','決めた こと'],'etc',false],
  ['blank','📄 白紙',[],'etc',false],
];
// 「📋 テンプレートから」で 出す、どの 会議にも ある 進め方の 議題
const AG_FLOW=['🏛 会議の 進め方',['開会の あいさつ','議長の 選出','議事録署名人の 選出','定足数の 確認（成立の 宣言）','前回 議事録の 承認','会計 報告','監査 報告','質疑応答','次回の 日程','閉会の あいさつ']];
// 議題の 名前を 打つ ときの 候補（datalist）
const AG_ALL=[...new Set(AG_FLOW[1].concat(...TPL.map(t=>t[2])))];
// 「決まったこと」に 1回 押すだけで 入る ことば
const DEC_W=['原案どおり 承認','異議なく 承認','全会一致で 可決','賛成多数で 可決','報告を 了承','継続審議','次回に 持ち越し','役員会に 一任'];
// 🖨 印刷に 出す もの（会議ごと。チェックを 外すと 出さない。v608）
const PRK=[['c','議長'],['r','書記'],['s','署名人'],['sg','署名・押印の 欄']];
// pr が ない 前の 会議は、前と 同じ 見た目（署名欄は 議長・署名人の 名前が あるか 総会の とき）
function cleanPr(o, m){ const d={c:true, r:true, s:true, sg:!!(m && (m.chair || (Array.isArray(m.signs) && (m.signs[0] || m.signs[1])) || m.tpl==='sokai'))}; if(!o || typeof o!=='object') return d; const r={}; PRK.forEach(([k])=>{ r[k]=typeof o[k]==='boolean' ? o[k] : d[k]; }); return r; }

/* ───────── 中身 ───────── */
let st=null;   // {v, list:[M], ui:{tab, org, who}}
const intIn=(v,a,b)=>{ const t=String(v==null?'':v).normalize('NFKC').replace(/[,\s人名]/g,''); if(t==='') return ''; const n=Math.round(parseFloat(t)); return isFinite(n) ? Math.min(b, Math.max(a, n)) : ''; };
function cleanTodo(t){ if(!t || typeof t!=='object') return null; const x={id:okId(t.id) ? t.id : rid(), t:oneLine(t.t, 120), who:oneLine(t.who, 30), due:okD(t.due) ? t.due : '', done:t.done===true, doneAt:okD(t.doneAt) ? t.doneAt : ''}; return x.t ? x : null; }
function cleanItem(i){
  if(!i || typeof i!=='object') return null;
  const v=i.vote && typeof i.vote==='object' ? i.vote : null;
  return {id:okId(i.id) ? i.id : rid(), t:oneLine(i.t, 80), memo:multi(i.memo, 3000), dec:multi(i.dec, 1500),
    vote:v ? {y:intIn(v.y,0,99999), n:intIn(v.n,0,99999), a:intIn(v.a,0,99999)} : null,
    todos:(Array.isArray(i.todos) ? i.todos : []).map(cleanTodo).filter(Boolean).slice(0, MAX_T)};
}
function cleanM(m){
  if(!m || typeof m!=='object') return null;
  const seen=new Set();
  const ppl=(Array.isArray(m.ppl) ? m.ppl : []).map(p=>p && typeof p==='object' ? {n:oneLine(p.n, 30), s:ST[p.s] ? p.s : 'p'} : null).filter(p=>p && p.n && !seen.has(p.n) && seen.add(p.n)).slice(0, MAX_P);
  const nx=m.next && typeof m.next==='object' ? m.next : {};
  return {id:okId(m.id) ? m.id : rid(), org:oneLine(m.org, 40), t:oneLine(m.t, 60), date:okD(m.date) ? m.date : todayS(), st:okT(m.st) ? m.st : '', en:okT(m.en) ? m.en : '',
    place:oneLine(m.place, 60), chair:oneLine(m.chair, 30), rec:oneLine(m.rec, 30), signs:[0,1].map(i=>oneLine(Array.isArray(m.signs) ? m.signs[i] : '', 30)),
    members:intIn(m.members, 0, 99999), ppl, items:(Array.isArray(m.items) ? m.items : []).map(cleanItem).filter(Boolean).slice(0, MAX_I),
    next:{date:okD(nx.date) ? nx.date : '', st:okT(nx.st) ? nx.st : '', place:oneLine(nx.place, 60)}, memo:multi(m.memo, 2000), tpl:TPL.some(t=>t[0]===m.tpl) ? m.tpl : 'teirei',
    pr:cleanPr(m.pr, m), at:+m.at||Date.now(), up:+m.up||+m.at||Date.now()};
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=o && typeof o==='object' ? o : {};
  const ui=o.ui && typeof o.ui==='object' ? o.ui : {};
  st={v:1, list:(Array.isArray(o.list) ? o.list : []).map(cleanM).filter(Boolean).slice(0, MAX_M), ui:{tab:ui.tab==='todo' ? 'todo' : 'list', org:oneLine(ui.org, 40), who:oneLine(ui.who, 30)}};
}
let saveT=0;
function save(){ clearTimeout(saveT); saveT=0; try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末の 空きが 足りず、保存 できませんでした'); return false; } }
function saveSoon(){ clearTimeout(saveT); saveT=setTimeout(save, 400); }
const mOf=id=>st.list.find(m=>m.id===id)||null;
const sortKey=m=>m.date+' '+(m.st||'00:00')+' '+String(m.at).padStart(15,'0');
const ordered=()=>st.list.slice().sort((a,b)=>sortKey(b).localeCompare(sortKey(a)));
const orgs=()=>[...new Set(ordered().map(m=>m.org).filter(Boolean))];
const mTitle=m=>m.t || (m.org ? m.org+' の 会議' : '会議');
// 同じ 会で この 会議より 前の 会議（日付・時刻の 順）
const before=m=>ordered().filter(x=>x.id!==m.id && x.org===m.org && sortKey(x)<sortKey(m));
const counts=m=>({p:m.ppl.filter(x=>x.s==='p').length, a:m.ppl.filter(x=>x.s==='a').length, d:m.ppl.filter(x=>x.s==='d').length});
// 総会の 成立（出席＋委任が 会員の 過半数）
function quorum(m){ if(!m.members) return null; const c=counts(m), need=Math.floor(m.members/2)+1, have=c.p+c.d; return {need, have, ok:have>=need}; }
function voteText(v){
  if(!v || (v.y==='' && v.n==='' && v.a==='')) return '';
  const y=+v.y||0, n=+v.n||0, a=+v.a||0;
  const res=y>n ? (n===0 && a===0 ? '全会一致で 可決' : '賛成多数で 可決') : y===n ? '可否 同数' : '否決';
  return '賛成 '+y+'・反対 '+n+(a ? '・棄権 '+a : '')+' → '+res;
}
// まだの 宿題（全部の 会議から）
function openTodos(org){ const out=[]; ordered().forEach(m=>{ if(org!=null && m.org!==org) return; m.items.forEach(i=>i.todos.forEach(t=>{ if(!t.done) out.push({m, i, t}); })); }); return out; }
const late=t=>t.due && t.due<todayS();

/* ───────── 画面 ───────── */
let cur=null;   // いま 開いている 会議の id（null は 一覧）
function render(){
  const b=$('gjBody'); if(!b || !st) return;
  const top=b.scrollTop;
  b.innerHTML=`<div class="gj-wrap">${cur && mOf(cur) ? editHtml(mOf(cur)) : homeHtml()}</div>`;
  if(cur && mOf(cur)) bits(mOf(cur));
  b.scrollTop=top;
}
function homeHtml(){
  const n=openTodos().length;
  return `<div class="gj-tabs" role="tablist"><button type="button" role="tab" aria-selected="${st.ui.tab==='list'}" class="${st.ui.tab==='list'?'on':''}" onclick="GIJIROKU.tab('list')">📝 会議</button>
      <button type="button" role="tab" aria-selected="${st.ui.tab==='todo'}" class="${st.ui.tab==='todo'?'on':''}" onclick="GIJIROKU.tab('todo')">📌 宿題${n ? ' <small>'+n+'</small>' : ''}</button></div>
    ${st.ui.tab==='todo' ? todoHtml() : listHtml()}`;
}
function listHtml(){
  const os=orgs(), L=ordered().filter(m=>!st.ui.org || m.org===st.ui.org);
  return `<div class="gj-acts top"><button type="button" class="gj-b pri" onclick="GIJIROKU.add()">＋ 新しい 会議</button><button type="button" class="gj-b" onclick="GIJIROKU.rei()">📖 議事録の 例</button><button type="button" class="gj-b" onclick="GIJIROKU.saveOpen()">💾 控え（保存・読む）</button></div>
    ${os.length>1 ? `<div class="gj-chips"><button type="button" class="${st.ui.org?'':'on'}" onclick="GIJIROKU.org('')">ぜんぶ</button>${os.map(o=>`<button type="button" class="${st.ui.org===o?'on':''}" data-o="${esc(o)}" onclick="GIJIROKU.org(this.dataset.o)">${esc(o)}</button>`).join('')}</div>` : ''}
    ${L.length ? `<div class="gj-list">${L.map(m=>{ const c=counts(m), td=m.items.reduce((a,i)=>a+i.todos.length,0), left=m.items.reduce((a,i)=>a+i.todos.filter(t=>!t.done).length,0);
      return `<button type="button" class="gj-card" onclick="GIJIROKU.open('${m.id}')"><span class="d">${esc(jd(m.date))}${m.st ? ' '+m.st : ''}</span><b>${esc(mTitle(m))}</b>${m.org && m.t ? `<small>${esc(m.org)}</small>` : ''}
        <small class="s">出席 ${c.p}人${c.a ? '・欠席 '+c.a : ''}${c.d ? '・委任 '+c.d : ''}・議題 ${m.items.length}${td ? '・宿題 '+td+(left ? `（<em>のこり ${left}</em>）` : '（済み）') : ''}</small></button>`; }).join('')}</div>`
      : `<div class="gj-empty"><p>会議ごとに、出席者・議題・決まったこと・宿題を 残して、議事録の 形で 印刷・PDF・LINE に 送れます。</p><p>町内会・PTA の 役員会や 総会、職場の 会議、安全衛生委員会の ひな形が あります。</p><p>はじめての ときは「📖 議事録の 例」で、会議の 種類ごとの 議事録の 例（5つずつ）と 書き方の コツが 見られます。</p></div>`}`;
}
function todoHtml(){
  const all=openTodos(), whos=[...new Set(all.map(x=>x.t.who).filter(Boolean))];
  const L=all.filter(x=>!st.ui.who || x.t.who===st.ui.who).sort((a,b)=>(a.t.due||'9999').localeCompare(b.t.due||'9999'));
  return `${whos.length>1 ? `<div class="gj-chips"><button type="button" class="${st.ui.who?'':'on'}" onclick="GIJIROKU.who('')">みんな</button>${whos.map(w=>`<button type="button" class="${st.ui.who===w?'on':''}" data-w="${esc(w)}" onclick="GIJIROKU.who(this.dataset.w)">${esc(w)}</button>`).join('')}</div>` : ''}
    ${L.length ? `<div class="gj-todos">${L.map(x=>`<div class="gj-td${late(x.t)?' late':''}"><button type="button" class="gj-ck" aria-label="${esc(x.t.t)} を 済みに" onclick="GIJIROKU.done('${x.m.id}','${x.i.id}','${x.t.id}')">☐</button>
        <div class="tx"><b>${esc(x.t.t)}</b><small>${x.t.who ? '👤 '+esc(x.t.who)+'　' : ''}${x.t.due ? (late(x.t) ? '⚠ ' : '📅 ')+esc(md(x.t.due))+' まで' : ''}</small><small class="m">${esc(mTitle(x.m))}（${esc(md(x.m.date))}）・${esc(x.i.t||'議題')}</small></div>
        <button type="button" class="gj-b sm" onclick="GIJIROKU.open('${x.m.id}')">開く</button></div>`).join('')}</div>`
      : '<p class="gj-note">まだの 宿題は ありません。議題ごとに「＋ 宿題」で 足せます。</p>'}`;
}
const ta=(id, val, ph, rows, key)=>`<div class="gj-ta"><textarea id="${id}" rows="${rows||3}" placeholder="${esc(ph)}" oninput="GIJIROKU.set(${key}, this.value)">${esc(val)}</textarea>${voiceOk() ? `<button type="button" class="gj-mic" aria-label="声で 書く" onclick="GIJIROKU.mic(this, '${id}')">🎤</button>` : ''}</div>`;
function editHtml(m){
  const c=counts(m), q=quorum(m), prev=before(m).flatMap(x=>x.items.flatMap(i=>i.todos.filter(t=>!t.done).map(t=>({m:x, i, t}))));
  const names=m.ppl.map(p=>p.n), dl=`<datalist id="gjNames">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`;
  const K=(...a)=>esc(JSON.stringify(a));
  // 時刻は 自前の 窓で えらぶ（端末の 時刻の 窓では 決められない ことが ある。v606）
  const tfl=(lab, key, val)=>`<div class="gj-f gj-tf"><span>${lab}</span><button type="button" class="gj-tb${val ? '' : ' none'}" data-tk="${key}" onclick="GIJIROKU.time('${key}')" aria-label="${lab}の 時刻を えらぶ">${val ? '🕐 '+val : '🕐 えらぶ'}</button></div>`;
  const fld=(lab, key, val, o)=>`<label class="gj-f"><span>${lab}</span><input type="${o&&o.type||'text'}" value="${esc(val)}" ${o&&o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o&&o.list ? `list="${o.list}"` : ''} ${o&&o.im ? `inputmode="${o.im}"` : ''} oninput="GIJIROKU.set(${K(key)}, this.value)"></label>`;
  return `<div class="gj-eh"><button type="button" class="gj-b" onclick="GIJIROKU.back()">← 一覧</button><b id="gjEhT">${esc(mTitle(m))}</b><button type="button" class="gj-b gj-sv" onclick="GIJIROKU.saveOpen()">💾 保存</button></div>
    <section class="gj-sec"><h4>📌 会議</h4>
      ${fld('会の 名前', 'org', m.org, {ph:'例：○○町内会', list:'gjOrgs'})}<datalist id="gjOrgs">${orgs().map(o=>`<option value="${esc(o)}">`).join('')}</datalist>
      ${fld('会議の 名前', 't', m.t, {ph:'例：第3回 役員会'})}
      <div class="gj-row">${fld('日付', 'date', m.date, {type:'date'})}${tfl('はじめ', 'st', m.st)}${tfl('おわり', 'en', m.en)}</div>
      ${fld('場所', 'place', m.place, {ph:'例：公民館 2階'})}
    </section>
    <section class="gj-sec"><h4>👥 出席者 <small>出席 ${c.p}人${c.a ? '・欠席 '+c.a+'人' : ''}${c.d ? '・委任 '+c.d+'人' : ''}</small></h4>
      ${m.ppl.length ? `<div class="gj-ppl">${m.ppl.map((p,i)=>`<span class="gj-p s-${p.s}"><button type="button" class="nm" onclick="GIJIROKU.pst(${i})" aria-label="${esc(p.n)}：${ST[p.s]}（押すと かわる）">${esc(p.n)}<small>${ST[p.s]}</small></button><button type="button" class="x" onclick="GIJIROKU.pdel(${i})" aria-label="${esc(p.n)} を 外す">✕</button></span>`).join('')}</div>
        <p class="gj-note sm">名前を 押すと 出席 → 欠席 → 委任 と かわります。</p>` : ''}
      <div class="gj-add"><input type="text" id="gjPIn" placeholder="名前（「、」で いくつも）" enterkeyhint="done" onpaste="GIJIROKU.paste(event)" onkeydown="if(event.key==='Enter'){ event.preventDefault(); GIJIROKU.padd(); }"><button type="button" class="gj-b" onclick="GIJIROKU.padd()">＋ 足す</button></div>
      <div class="gj-acts"><button type="button" class="gj-b" onclick="GIJIROKU.pick()">📇 名簿から</button>${before(m).length && before(m)[0].ppl.length ? `<button type="button" class="gj-b" onclick="GIJIROKU.pprev()">↩ 前回と 同じ 人</button>` : ''}</div>
      ${fld('会員の 数', 'members', m.members, {im:'numeric', ph:'総会の 成立を 見る とき'})}
      <p class="gj-q" id="gjQ" hidden></p>
      ${dl}
      <div class="gj-row">${fld('議長', 'chair', m.chair, {list:'gjNames'})}${fld('書記', 'rec', m.rec, {list:'gjNames'})}</div>
      <div class="gj-row">${fld('署名人 1', 'sign0', m.signs[0], {list:'gjNames'})}${fld('署名人 2', 'sign1', m.signs[1], {list:'gjNames'})}</div>
      <div class="gj-pr" role="group" aria-label="印刷に 出す もの"><small>🖨 印刷に 出す</small>${PRK.map(([k,n])=>`<label class="gj-chk${m.pr[k] ? ' on' : ''}"><input type="checkbox" data-pr="${k}"${m.pr[k] ? ' checked' : ''} onchange="GIJIROKU.pr('${k}', this.checked)">${n}</label>`).join('')}</div>
    </section>
    ${prev.length ? `<section class="gj-sec"><h4>↩ 前回からの 宿題 <small>${prev.length}件</small></h4><div class="gj-todos">${prev.map(x=>`<div class="gj-td${late(x.t)?' late':''}"><button type="button" class="gj-ck" aria-label="${esc(x.t.t)} を 済みに" onclick="GIJIROKU.done('${x.m.id}','${x.i.id}','${x.t.id}')">☐</button>
      <div class="tx"><b>${esc(x.t.t)}</b><small>${x.t.who ? '👤 '+esc(x.t.who)+'　' : ''}${x.t.due ? (late(x.t) ? '⚠ ' : '📅 ')+esc(md(x.t.due))+' まで' : ''}　（${esc(md(x.m.date))} の ${esc(x.i.t||'議題')}）</small></div></div>`).join('')}</div></section>` : ''}
    <section class="gj-sec"><h4>🗂 議題 <small>${m.items.length}</small></h4>
      ${m.items.map((it,k)=>`<div class="gj-item"><div class="gj-ih"><span class="no">${k+1}</span><input type="text" value="${esc(it.t)}" placeholder="議題" list="gjAgL" aria-label="議題 ${k+1} の 名前" oninput="GIJIROKU.set(${K('item', it.id, 't')}, this.value)">
          <button type="button" class="gj-ib" aria-label="上へ" onclick="GIJIROKU.imove('${it.id}', -1)"${k ? '' : ' disabled'}>↑</button><button type="button" class="gj-ib" aria-label="下へ" onclick="GIJIROKU.imove('${it.id}', 1)"${k<m.items.length-1 ? '' : ' disabled'}>↓</button><button type="button" class="gj-ib" aria-label="議題を 消す" onclick="GIJIROKU.idel('${it.id}')">🗑</button></div>
        <small class="gj-lb">話し合ったこと</small>${ta('gjM_'+it.id, it.memo, '例：会場の 案を 2つ 出した。', 3, K('item', it.id, 'memo'))}
        <small class="gj-lb">決まったこと</small>${ta('gjD_'+it.id, it.dec, '例：会場は 公民館に する。', 2, K('item', it.id, 'dec'))}
        <div class="gj-dw" aria-label="決まったことに 入れる ことば">${DEC_W.map((w,j)=>`<button type="button" onclick="GIJIROKU.decAdd('${it.id}', ${j})">${w}</button>`).join('')}</div>
        ${it.vote ? `<div class="gj-vote"><span>🗳 採決</span><label>賛成<input type="text" inputmode="numeric" value="${esc(it.vote.y)}" oninput="GIJIROKU.set(${K('vote', it.id, 'y')}, this.value)"></label><label>反対<input type="text" inputmode="numeric" value="${esc(it.vote.n)}" oninput="GIJIROKU.set(${K('vote', it.id, 'n')}, this.value)"></label><label>棄権<input type="text" inputmode="numeric" value="${esc(it.vote.a)}" oninput="GIJIROKU.set(${K('vote', it.id, 'a')}, this.value)"></label><button type="button" class="gj-ib" aria-label="採決を 外す" onclick="GIJIROKU.vote('${it.id}')">✕</button><b data-vr="${it.id}">${esc(voteText(it.vote))}</b></div>` : ''}
        ${it.todos.length ? `<div class="gj-tl">${it.todos.map(t=>`<div class="gj-t${t.done?' dn':''}${late(t) && !t.done?' late':''}"><button type="button" class="gj-ck" aria-label="${esc(t.t)}：${t.done ? '済み' : 'まだ'}" onclick="GIJIROKU.tdone('${it.id}','${t.id}')">${t.done ? '☑' : '☐'}</button>
            <input type="text" value="${esc(t.t)}" aria-label="宿題" oninput="GIJIROKU.set(${K('todo', it.id, t.id, 't')}, this.value)"><input type="text" class="w" value="${esc(t.who)}" placeholder="担当" list="gjNames" aria-label="担当" oninput="GIJIROKU.set(${K('todo', it.id, t.id, 'who')}, this.value)"><input type="date" class="dd" value="${esc(t.due)}" aria-label="期限" onchange="GIJIROKU.set(${K('todo', it.id, t.id, 'due')}, this.value, 1)"><button type="button" class="gj-ib" aria-label="宿題を 消す" onclick="GIJIROKU.tdel('${it.id}','${t.id}')">✕</button></div>`).join('')}</div>` : ''}
        <div class="gj-acts sm"><button type="button" class="gj-b sm" onclick="GIJIROKU.tadd('${it.id}')">＋ 宿題</button>${it.vote ? '' : `<button type="button" class="gj-b sm" onclick="GIJIROKU.vote('${it.id}')">🗳 採決を 書く</button>`}</div></div>`).join('')}
      <div class="gj-acts"><button type="button" class="gj-b" onclick="GIJIROKU.iadd()">＋ 議題を 足す</button><button type="button" class="gj-b" onclick="GIJIROKU.agOpen()">📋 テンプレートから 足す</button><button type="button" class="gj-b" onclick="GIJIROKU.reiHere()">📖 例を 見る</button></div>
      <datalist id="gjAgL">${AG_ALL.map(t=>`<option value="${esc(t)}">`).join('')}</datalist>
    </section>
    <section class="gj-sec"><h4>📅 次回</h4>
      <div class="gj-row">${fld('日付', 'ndate', m.next.date, {type:'date'})}${tfl('時刻', 'nst', m.next.st)}</div>${fld('場所', 'nplace', m.next.place, {ph:'例：公民館'})}
      ${m.next.date ? '<div class="gj-acts"><button type="button" class="gj-b" onclick="GIJIROKU.cal()">📅 次回を カレンダーに</button></div>' : ''}</section>
    <section class="gj-sec"><h4>📎 その他</h4>${ta('gjMemo', m.memo, '例：配った 資料・連絡事項', 2, K('memo'))}</section>
    <div class="gj-out"><button type="button" class="gj-b pri" onclick="GIJIROKU.print()">🖨 印刷・PDF</button><button type="button" class="gj-b" onclick="GIJIROKU.out('docx')">📄 Word</button><button type="button" class="gj-b" onclick="GIJIROKU.out('xlsx')">📊 Excel</button><button type="button" class="gj-b" onclick="GIJIROKU.image()">🖼 画像</button><button type="button" class="gj-b" onclick="GIJIROKU.copy()">📋 文字で コピー</button>
      <button type="button" class="gj-b" onclick="GIJIROKU.saveOpen()">💾 保存・控え</button><button type="button" class="gj-b" onclick="GIJIROKU.nextMeet()">⏭ 次の 会議を 作る</button><button type="button" class="gj-b warn" onclick="GIJIROKU.del('${m.id}')">🗑 この 会議を 消す</button></div>`;
}

/* ───────── 直す ───────── */
function setF(key, v){
  const m=mOf(cur); if(!m) return;
  const k=Array.isArray(key) ? key : [key];
  const w=k[0];
  if(['org','t','place','chair','rec'].includes(w)) m[w]=oneLine(v, w==='t' ? 60 : w==='org' || w==='place' ? 60 : 30);
  else if(w==='date'){ if(okD(v)) m.date=v; }
  else if(w==='st' || w==='en'){ m[w]=okT(v) ? v : ''; }
  else if(w==='sign0' || w==='sign1') m.signs[+w.slice(-1)]=oneLine(v, 30);
  else if(w==='members') m.members=intIn(v, 0, 99999);
  else if(w==='ndate') m.next.date=okD(v) ? v : '';
  else if(w==='nst') m.next.st=okT(v) ? v : '';
  else if(w==='nplace') m.next.place=oneLine(v, 60);
  else if(w==='memo') m.memo=multi(v, 2000);
  else if(w==='item'){ const it=m.items.find(i=>i.id===k[1]); if(!it) return; if(k[2]==='t') it.t=oneLine(v, 80); else if(k[2]==='memo') it.memo=multi(v, 3000); else if(k[2]==='dec') it.dec=multi(v, 1500); }
  else if(w==='vote'){ const it=m.items.find(i=>i.id===k[1]); if(!it || !it.vote) return; it.vote[k[2]]=intIn(v, 0, 99999); }
  else if(w==='todo'){ const it=m.items.find(i=>i.id===k[1]); const t=it && it.todos.find(x=>x.id===k[2]); if(!t) return; if(k[3]==='t') t.t=oneLine(v, 120); else if(k[3]==='who') t.who=oneLine(v, 30); else if(k[3]==='due') t.due=okD(v) ? v : ''; }
  else return;
  m.up=Date.now(); saveSoon();
  if(w==='date' || w==='ndate' || (w==='todo' && k[3]==='due')){ render(); return; }   // 日付を えらんだ とき（期限の 色・次回の ボタン）
  bits(m);
}
// 組み直さずに、題・成立・採決の 字だけ 合わせる
function bits(m){
  const t=$('gjEhT'); if(t) t.textContent=mTitle(m);
  const qe=$('gjQ'), q=quorum(m), c=counts(m);
  if(qe){ qe.hidden=!q; if(q){ qe.className='gj-q '+(q.ok ? 'ok' : 'ng'); qe.textContent=(q.ok ? '✅' : '⚠')+' 会員 '+m.members+'人 → 過半数は '+q.need+'人。出席 '+c.p+'人＋委任 '+c.d+'人＝'+q.have+'人で、'+(q.ok ? '会は 成立 しています' : 'まだ 足りません')+'。'; } }
  m.items.forEach(it=>{ const b=document.querySelector('[data-vr="'+it.id+'"]'); if(b) b.textContent=voteText(it.vote); });
}
function newMeet(org, tplK, copyPpl){
  const t=TPL.find(x=>x[0]===tplK)||TPL[0];
  const prev=org ? ordered().find(x=>x.org===org) : null;
  const m=cleanM({id:rid(), org, t:'', date:todayS(), tpl:t[0], items:t[2].map(n=>({id:rid(), t:n})), ppl:copyPpl && prev ? prev.ppl.map(p=>({n:p.n, s:'p'})) : [],
    chair:copyPpl && prev ? prev.chair : '', rec:copyPpl && prev ? prev.rec : '', place:prev && prev.next.place ? prev.next.place : prev ? prev.place : '', members:prev ? prev.members : '',
    pr:prev ? Object.assign({}, prev.pr) : {c:true, r:true, s:true, sg:!!t[4]}, at:Date.now()});
  if(prev && prev.next.date) m.date=prev.next.date;
  if(prev && prev.next.st) m.st=prev.next.st;
  st.list.unshift(m); st.list=st.list.slice(0, MAX_M); save();
  return m;
}
let pop=null;
function popOpen(html){
  popClose();
  const host=document.querySelector('#gijirokuOverlay .gj-modal'); if(!host) return null;
  const el=document.createElement('div'); el.className='gj-pop-bg';
  el.innerHTML=`<div class="gj-pop" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  const me={el, rel:null}; pop=me;
  me.rel=typeof modalBack==='function' ? modalBack(()=>{ if(pop===me){ pop=null; el.remove(); if(me.onClose) me.onClose(); } }) : ()=>{};
  return el;
}
function popClose(){ if(!pop) return; const p=pop; pop=null; if(p.onClose) p.onClose(); p.rel(); p.el.remove(); }
/* 🕐 時刻を えらぶ 窓（v606）。時・分を 押して「✓ 決定」。打って 入れる（1900・19:00・7時半・午後7時）ことも できる */
const TP_TITLE={st:'はじめの 時刻', en:'おわりの 時刻', nst:'次回の 時刻'};
const TP_H=[...Array(24).keys()], TP_M=[0,5,10,15,20,25,30,35,40,45,50,55];
const toMin=s=>okT(s) ? +s.slice(0,2)*60 + +s.slice(3) : null;
const hhmm=n=>pad2(Math.floor(n/60))+':'+pad2(n%60);
function parseTime(s){
  let t=String(s||'').normalize('NFKC').replace(/\s+/g,'');
  if(!t) return null;
  const pm=/^(午後|pm)/i.test(t);
  t=t.replace(/^(午前|午後|am|pm)/i,'').replace(/時半$/,'時30分');
  let h, mi=0, x;
  if((x=/^(\d{1,2})(?::|時)(\d{1,2})?分?$/.exec(t))){ h=+x[1]; mi=x[2] ? +x[2] : 0; }
  else if(/^\d{3,4}$/.test(t)){ const n=t.padStart(4,'0'); h=+n.slice(0,2); mi=+n.slice(2); }
  else if(/^\d{1,2}$/.test(t)) h=+t;
  else return null;
  if(pm && h<12) h+=12;
  return h<24 && mi<60 ? h*60+mi : null;
}
// まだ 決めて いない ときに 出す 時刻：はじめは いまの 時刻（30分 きざみ）、おわりは はじめの 1時間 あと、次回は 今回の はじめ
function defTime(m, k){
  const now=new Date(), r=Math.floor((now.getHours()*60+now.getMinutes())/30)*30, s=toMin(m.st);
  if(k==='en') return s!=null ? Math.min(s+60, 23*60+55) : Math.min(r+60, 23*60+30);
  if(k==='nst' && s!=null) return s;
  return r;
}
function time(k){
  const m=mOf(cur); if(!m || !TP_TITLE[k]) return;
  const curV=k==='nst' ? m.next.st : m[k];
  let mins=toMin(curV); if(mins==null) mins=defTime(m, k);
  const el=popOpen(`<div class="gj-ph"><span aria-hidden="true">🕐</span><b>${TP_TITLE[k]}</b><button type="button" class="gj-x" onclick="GIJIROKU.close()" aria-label="閉じる">✕</button></div>
    <div class="gj-tpbig" id="gjTpBig" aria-live="polite"></div>
    <div class="gj-tpll">時</div><div class="gj-tpg" id="gjTpH">${TP_H.map(h=>`<button type="button" data-h="${h}">${h}</button>`).join('')}</div>
    <div class="gj-tpll">分</div><div class="gj-tpg" id="gjTpM">${TP_M.map(x=>`<button type="button" data-m="${x}">${pad2(x)}</button>`).join('')}</div>
    <div class="gj-tpfine"><button type="button" data-d="-5">−5分</button><button type="button" data-d="-1">−1分</button><button type="button" data-d="1">＋1分</button><button type="button" data-d="5">＋5分</button></div>
    <div class="gj-tpfine"><input id="gjTpIn" inputmode="numeric" autocomplete="off" placeholder="打つ：1900・19:00・7時半" aria-label="時刻を 打って 入れる"></div>
    <div class="gj-acts end">${curV ? '<button type="button" class="gj-b warn" data-x="clear">決めない</button>' : ''}<button type="button" class="gj-b" data-x="cancel">やめる</button><button type="button" class="gj-b pri" data-x="ok">✓ 決定</button></div>`);
  if(!el) return;
  const inp=$('gjTpIn');
  const show=()=>{
    $('gjTpBig').textContent=hhmm(mins);
    el.querySelectorAll('#gjTpH button').forEach(b=>b.classList.toggle('on', +b.dataset.h===Math.floor(mins/60)));
    el.querySelectorAll('#gjTpM button').forEach(b=>b.classList.toggle('on', +b.dataset.m===mins%60));
  };
  const ok=()=>{
    if(inp.value.trim()){ const v=parseTime(inp.value); if(v==null){ toastS('時刻の 形が ちがいます（例：19:00・1900・7時半）'); inp.focus(); return; } mins=v; }
    timeSet(k, hhmm(mins));
  };
  el.addEventListener('click', e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.h!=null){ mins=(+b.dataset.h)*60+mins%60; inp.value=''; show(); }
    else if(b.dataset.m!=null){ mins=Math.floor(mins/60)*60+(+b.dataset.m); inp.value=''; show(); }
    else if(b.dataset.d){ mins=(mins+(+b.dataset.d)+1440)%1440; inp.value=''; show(); }
    else if(b.dataset.x==='ok') ok();
    else if(b.dataset.x==='clear') timeSet(k, '');
    else if(b.dataset.x==='cancel') popClose();
  });
  inp.addEventListener('input', ()=>{ const v=parseTime(inp.value); if(v!=null){ mins=v; show(); } });
  inp.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); ok(); } });
  show();
}
function timeSet(k, v){
  const m=mOf(cur); if(!m || !TP_TITLE[k]) return;
  v=okT(v) ? v : '';
  if(k==='nst') m.next.st=v; else m[k]=v;
  m.up=Date.now(); save(); popClose(); render();
  if(v && (k==='st' || k==='en') && m.st && m.en && toMin(m.en)<=toMin(m.st)) toastS('⚠ おわりが はじめより 前に なって います', 3600);
  else toastS(v ? '🕐 '+TP_TITLE[k]+'を '+v+' に しました' : '🕐 '+TP_TITLE[k]+'を 決めない ことに しました');
}
let addTpl='teirei';
function add(){
  const os=orgs();
  addTpl='teirei';
  popOpen(`<div class="gj-ph"><span aria-hidden="true">📝</span><b>新しい 会議</b><button type="button" class="gj-x" onclick="GIJIROKU.close()" aria-label="閉じる">✕</button></div>
    <label class="gj-f"><span>会の 名前</span><input type="text" id="gjNewOrg" maxlength="40" value="" placeholder="例：○○町内会" list="gjOrgs2" oninput="GIJIROKU.addOrg(this.value)"></label><datalist id="gjOrgs2">${os.map(o=>`<option value="${esc(o)}">`).join('')}</datalist>
    ${os.length ? `<div class="gj-orgs"><small>前と 同じ 会なら：</small>${os.slice(0, 8).map(o=>`<button type="button" data-o="${esc(o)}" onclick="GIJIROKU.addOrg(this.dataset.o, true)">${esc(o)}</button>`).join('')}</div>` : ''}
    <label class="gj-ck2" id="gjNewCopyL" hidden><input type="checkbox" id="gjNewCopy" checked> 前回の 出席者・議長・書記・印刷の 選び方を 写す</label>
    <p class="gj-lb">ひな形（議題が 入ります。あとから「📋 テンプレートから」で 足す ことも できます）</p>
    <button type="button" class="gj-rlink" onclick="GIJIROKU.rei()">📖 どんな 会議か わからない ときは：議事録の 例を 見る</button>
    ${TPL_G.map(([g,gn])=>`<h5 class="gj-tplh">${gn}</h5><div class="gj-tpl" role="radiogroup" aria-label="${gn}">${TPL.filter(t=>t[3]===g).map(t=>`<button type="button" role="radio" aria-checked="${t[0]==='teirei'}" class="${t[0]==='teirei'?'on':''}" data-t="${t[0]}" onclick="GIJIROKU.tpl('${t[0]}')"><b>${t[1]}</b><small>${t[2].length ? esc(t[2].join('・')) : '議題なし'}</small></button>`).join('')}</div>`).join('')}
    <div class="gj-acts end gj-stick"><button type="button" class="gj-b" onclick="GIJIROKU.close()">やめる</button><button type="button" class="gj-b pri" onclick="GIJIROKU.addGo()">＋ 作る</button></div>`);
}
// 会の 名前が これまでの 会と 同じ ときだけ「前回を 写す」を 出す（ボタンで えらんだ ときは その 会の 前回の ひな形に）
function addOrg(v, pick){
  const o=oneLine(v, 40), prev=o ? ordered().find(x=>x.org===o) : null, inp=$('gjNewOrg'), lab=$('gjNewCopyL');
  if(pick && inp) inp.value=o;
  if(lab) lab.hidden=!prev;
  if(pick && prev) setTpl(prev.tpl);
}
function setTpl(k){ if(!TPL.some(t=>t[0]===k)) return; addTpl=k; document.querySelectorAll('.gj-tpl button').forEach(b=>{ const on=b.dataset.t===k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); }
function addGo(){
  const org=oneLine(($('gjNewOrg')||{}).value, 40), lab=$('gjNewCopyL'), cp=!!(lab && !lab.hidden && $('gjNewCopy') && $('gjNewCopy').checked);
  const m=newMeet(org, addTpl, cp);
  popClose(); cur=m.id; render(); const b=$('gjBody'); if(b) b.scrollTop=0;
}
// 🖨 印刷に 出す もの（会議ごと。新しい 会議は 同じ 会の 前回を 写す）
function setPr(k, v){
  const m=mOf(cur); if(!m || !PRK.some(x=>x[0]===k)) return;
  m.pr[k]=!!v; m.up=Date.now(); save();
  const l=document.querySelector('.gj-pr input[data-pr="'+k+'"]'); if(l && l.parentElement) l.parentElement.classList.toggle('on', !!v);
}
// 決まったこと に ことばを 足す（打って いる 文の 後ろに 改行して）
function decAdd(iid, j){
  const m=mOf(cur), it=m && m.items.find(x=>x.id===iid), w=DEC_W[j]; if(!it || !w) return;
  it.dec=multi(it.dec ? it.dec+'\n'+w : w, 1500); m.up=Date.now(); save();
  const t=$('gjD_'+iid); if(t) t.value=it.dec;
}
/* 📋 テンプレートから 議題を 足す（v608）：今の 会議の ひな形を いちばん 上に、ほかの 会議の 議題も。押して えらび、まとめて 足す */
let agSel=null;
function agOpen(){
  const m=mOf(cur); if(!m) return;
  agSel=[];
  const have=new Set(m.items.map(i=>i.t)), mine=TPL.find(t=>t[0]===m.tpl);
  const groups=(mine && mine[2].length ? [[mine[1]+'（この 会議）', mine[2]]] : []).concat([AG_FLOW], TPL.filter(t=>t[2].length && t!==mine).map(t=>[t[1], t[2]]));
  popOpen(`<div class="gj-ph"><span aria-hidden="true">📋</span><b>テンプレートから 議題を 足す</b><button type="button" class="gj-x" onclick="GIJIROKU.close()" aria-label="閉じる">✕</button></div>
    <input type="search" class="gj-agq" id="gjAgQ" placeholder="🔍 しぼる（例：会計・行事・修繕）" autocomplete="off" oninput="GIJIROKU.agFilter(this.value)">
    <p class="gj-note sm">押した 議題が えらばれます（もう 入って いる ものは 押せません）。</p>
    <div class="gj-agl">${groups.map(([n,items])=>`<div class="gj-agg"><h5>${esc(n)}</h5><div class="gj-agc">${items.map(t=>`<button type="button" class="gj-ag${have.has(t) ? ' have' : ''}" data-t="${esc(t)}" aria-pressed="false"${have.has(t) ? ' disabled' : ''} onclick="GIJIROKU.agToggle(this)">${esc(t)}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="gj-acts end gj-stick"><button type="button" class="gj-b" onclick="GIJIROKU.close()">やめる</button><button type="button" class="gj-b pri" id="gjAgGo" onclick="GIJIROKU.agGo()" disabled>＋ 足す</button></div>`);
}
function agToggle(b){
  if(!agSel || !b || b.disabled) return;
  const t=b.dataset.t, i=agSel.indexOf(t);
  if(i>=0) agSel.splice(i, 1); else agSel.push(t);
  document.querySelectorAll('.gj-ag').forEach(x=>{ if(x.dataset.t===t){ x.classList.toggle('on', i<0); x.setAttribute('aria-pressed', i<0); } });
  const g=$('gjAgGo'); if(g){ g.disabled=!agSel.length; g.textContent=agSel.length ? '＋ '+agSel.length+'つ 足す' : '＋ 足す'; }
}
function agFilter(q){
  const w=String(q||'').normalize('NFKC').trim();
  document.querySelectorAll('.gj-agg').forEach(g=>{ let n=0; g.querySelectorAll('.gj-ag').forEach(b=>{ const on=!w || b.dataset.t.normalize('NFKC').includes(w); b.hidden=!on; if(on) n++; }); g.hidden=!n; });
}
// 足す 場所：開会・議長の 選出 などは いちばん 上（進め方の 順）、閉会は いちばん 下、ほかは 最後の「その他」の 前
const AG_OPEN=AG_FLOW[1].slice(0, 5), AG_CLOSE='閉会の あいさつ';
function placeItem(m, t){
  const it=cleanItem({id:rid(), t});
  if(AG_OPEN.includes(t)){ let i=0; while(i<m.items.length && AG_OPEN.includes(m.items[i].t) && AG_OPEN.indexOf(m.items[i].t)<AG_OPEN.indexOf(t)) i++; m.items.splice(i, 0, it); return; }
  let i=m.items.length;
  if(t!==AG_CLOSE){ if(i && m.items[i-1].t===AG_CLOSE) i--; if(i && /^その他/.test(m.items[i-1].t)) i--; }
  m.items.splice(i, 0, it);
}
function agGo(){
  const m=mOf(cur); if(!m || !agSel || !agSel.length) return;
  let n=0;
  agSel.forEach(t=>{ if(m.items.length<MAX_I && !m.items.some(i=>i.t===t)){ placeItem(m, t); n++; } });
  m.up=Date.now(); save(); popClose(); render();
  toastS(n ? '📋 議題を '+n+'つ 足しました' : '議題は '+MAX_I+'まで です');
}
function nextMeet(){
  const m=mOf(cur); if(!m) return;
  const n=newMeet(m.org, m.tpl, true);
  cur=n.id; render(); const b=$('gjBody'); if(b) b.scrollTop=0;
  toastS('📄 次の 会議を 作りました（前回の 出席者と、まだの 宿題が 出ます）');
}
function openM(id){ if(!mOf(id)) return; save(); cur=id; render(); const b=$('gjBody'); if(b) b.scrollTop=0; }
function back(){ save(); cur=null; render(); }
async function del(id){
  const m=mOf(id); if(!m) return;
  if(typeof appConfirm==='function' && !(await appConfirm('「'+mTitle(m)+'」（'+jd(m.date)+'）を 消しますか？','消す','やめる'))) return;
  st.list=st.list.filter(x=>x.id!==id); save(); cur=null; render();
}
// 出席者
function splitNames(s){ return String(s||'').split(/[、，,\n]+/).map(x=>oneLine(x, 30)).filter(Boolean); }
function addNames(names){
  const m=mOf(cur); if(!m) return 0;
  let n=0; names.forEach(x=>{ if(m.ppl.length<MAX_P && !m.ppl.some(p=>p.n===x)){ m.ppl.push({n:x, s:'p'}); n++; } });
  if(n){ m.up=Date.now(); save(); render(); }
  return n;
}
// 1行に 1人の 名簿を 貼ると、1行の 欄では 改行が 消えて 名前が くっつく。貼る ときに「、」に かえる
function paste(e){
  const t=e && e.clipboardData ? e.clipboardData.getData('text') : ''; if(!t || !/[\r\n]/.test(t)) return;
  e.preventDefault();
  const el=e.target, v=t.split(/\r\n?|\n/).map(x=>x.trim()).filter(Boolean).join('、'), a=el.selectionStart||0, b=el.selectionEnd||0;
  el.value=el.value.slice(0, a)+v+el.value.slice(b); el.selectionStart=el.selectionEnd=a+v.length;
}
function padd(){ const el=$('gjPIn'); if(!el) return; const n=addNames(splitNames(el.value)); if(n){ const e2=$('gjPIn'); if(e2) e2.focus(); } else if(el.value.trim()) toastS('もう 入っています'); }
async function pick(){
  const m=mOf(cur); if(!m || typeof toolPickNames!=='function') return;
  const extra=[]; const pv=before(m)[0]; if(pv && pv.ppl.length) extra.push({label:'📝 前回（'+md(pv.date)+'）の 出席者', names:pv.ppl.map(p=>p.n)});
  const got=await toolPickNames(extra, {have:m.ppl.map(p=>p.n)});
  if(got && got.length){ const n=addNames(got); toastS(n+'人 足しました'); }
}
function pprev(){ const m=mOf(cur); if(!m) return; const pv=before(m)[0]; if(!pv) return; const n=addNames(pv.ppl.map(p=>p.n)); toastS(n ? n+'人 足しました' : 'もう みんな 入っています'); }
function pst(i){ const m=mOf(cur); const p=m && m.ppl[i]; if(!p) return; p.s=p.s==='p' ? 'a' : p.s==='a' ? 'd' : 'p'; m.up=Date.now(); save(); render(); }
function pdel(i){ const m=mOf(cur); if(!m || !m.ppl[i]) return; m.ppl.splice(i,1); m.up=Date.now(); save(); render(); }
// 議題・宿題
function iadd(){ const m=mOf(cur); if(!m) return; if(m.items.length>=MAX_I){ toastS('議題は '+MAX_I+'まで です'); return; } const it=cleanItem({id:rid(), t:''}); m.items.push(it); save(); render(); setTimeout(()=>{ const e=document.querySelector('.gj-item:last-of-type .gj-ih input'); if(e) e.focus(); }, 30); }
function imove(id, d){ const m=mOf(cur); if(!m) return; const i=m.items.findIndex(x=>x.id===id), j=i+d; if(i<0 || j<0 || j>=m.items.length) return; [m.items[i], m.items[j]]=[m.items[j], m.items[i]]; save(); render(); }
async function idel(id){
  const m=mOf(cur); const it=m && m.items.find(x=>x.id===id); if(!it) return;
  if((it.memo || it.dec || it.todos.length) && typeof appConfirm==='function' && !(await appConfirm('議題「'+(it.t||'（名前なし）')+'」を 消しますか？（書いた ことも 消えます）','消す','やめる'))) return;
  m.items=m.items.filter(x=>x.id!==id); save(); render();
}
function tadd(iid){ const m=mOf(cur); const it=m && m.items.find(x=>x.id===iid); if(!it) return; if(it.todos.length>=MAX_T) return; it.todos.push({id:rid(), t:'（宿題）', who:'', due:'', done:false, doneAt:''}); save(); render();
  setTimeout(()=>{ const els=document.querySelectorAll('.gj-item .gj-t input[aria-label="宿題"]'); const e=[...els].reverse().find(x=>x.value==='（宿題）'); if(e){ e.focus(); e.select(); } }, 30); }
function tdel(iid, tid){ const m=mOf(cur); const it=m && m.items.find(x=>x.id===iid); if(!it) return; it.todos=it.todos.filter(t=>t.id!==tid); save(); render(); }
function tdone(iid, tid){ const m=mOf(cur); const it=m && m.items.find(x=>x.id===iid); const t=it && it.todos.find(x=>x.id===tid); if(!t) return; t.done=!t.done; t.doneAt=t.done ? todayS() : ''; save(); render(); }
function doneAny(mid, iid, tid){ const m=mOf(mid); const it=m && m.items.find(x=>x.id===iid); const t=it && it.todos.find(x=>x.id===tid); if(!t) return; t.done=true; t.doneAt=todayS(); save(); render(); toastS('☑ 「'+t.t+'」を 済みに しました'); }
function vote(iid){ const m=mOf(cur); const it=m && m.items.find(x=>x.id===iid); if(!it) return; it.vote=it.vote ? null : {y:'', n:'', a:''}; save(); render(); }

/* ───────── 🎤 声で 書く ───────── */
const recCtor=()=>window.SpeechRecognition || window.webkitSpeechRecognition || null;
const voiceOk=()=>!!recCtor();
let rec=null;
function mic(btn, id){
  if(rec){ try{ rec.stop(); }catch(_){} return; }
  const C=recCtor(), el=$(id); if(!C || !el) return;
  rec=new C(); rec.lang='ja-JP'; rec.interimResults=false; rec.continuous=false;
  btn.classList.add('on'); btn.textContent='⏹';
  rec.onresult=e=>{ const t=[...e.results].map(r=>r[0].transcript).join('').trim(); if(t){ el.value=(el.value.trim() ? el.value.replace(/\s+$/,'')+'\n' : '')+t; el.dispatchEvent(new Event('input')); } };
  rec.onend=()=>{ rec=null; if(btn.isConnected){ btn.classList.remove('on'); btn.textContent='🎤'; } };
  rec.onerror=e=>{ if(e && e.error==='not-allowed') toastS('マイクが 使えません（端末の 設定で マイクを 許可して ください）'); };
  try{ rec.start(); }catch(_){ rec=null; btn.classList.remove('on'); btn.textContent='🎤'; }
}

/* ───────── 書き出す ───────── */
function plainText(m){
  const c=counts(m), names=s=>m.ppl.filter(p=>p.s===s).map(p=>p.n).join('、'), q=quorum(m);
  const L=['【議事録】'+mTitle(m)+(m.org && m.t ? '（'+m.org+'）' : '')];
  L.push('日時：'+jd(m.date, true)+(m.st ? ' '+m.st+(m.en ? '〜'+m.en : '') : ''));
  if(m.place) L.push('場所：'+m.place);
  if(c.p) L.push('出席：'+names('p')+'（'+c.p+'人）');
  if(c.a) L.push('欠席：'+names('a')+'（'+c.a+'人）');
  if(c.d) L.push('委任：'+names('d')+'（'+c.d+'人）');
  if(q) L.push('会員 '+m.members+'人・出席＋委任 '+q.have+'人（過半数 '+q.need+'人）→ '+(q.ok ? '成立' : '不成立'));
  const roles=[m.pr.c && m.chair ? '議長：'+m.chair : '', m.pr.r && m.rec ? '書記：'+m.rec : ''].filter(Boolean).join('　'); if(roles) L.push(roles);
  m.items.forEach((it,k)=>{
    L.push('', '■ '+(k+1)+'. '+(it.t||'議題'));
    if(it.memo) L.push(it.memo);
    if(it.dec) L.push('（決定）'+it.dec);
    const v=voteText(it.vote); if(v) L.push('（採決）'+v);
    it.todos.forEach(t=>L.push('（宿題）'+(t.done ? '☑ ' : '')+t.t+(t.who ? '：'+t.who : '')+(t.due ? '（'+md(t.due)+'まで）' : '')));
  });
  if(m.next.date) L.push('', '■ 次回：'+jd(m.next.date, true)+(m.next.st ? ' '+m.next.st : '')+(m.next.place ? '　'+m.next.place : ''));
  if(m.memo) L.push('', '■ その他', m.memo);
  return L.join('\n');
}
const DOC_CSS=`
#printArea .op-doc .gj-doc{ color:#000; font-size:12px; line-height:1.65; }
#printArea .op-doc .gj-dt{ text-align:center; font-size:22px; font-weight:bold; letter-spacing:.3em; margin:0 0 2px; }
#printArea .op-doc .gj-ds{ text-align:center; font-size:13px; margin:0 0 10px; }
#printArea .op-doc table.gj-dh{ width:100%; border-collapse:collapse; table-layout:fixed; margin:0 0 12px; }
#printArea .op-doc .gj-dh th, #printArea .op-doc .gj-dh td{ border:1px solid #555; padding:5px 8px; font-size:12px; text-align:left; vertical-align:top; overflow-wrap:anywhere; }
#printArea .op-doc .gj-dh th{ width:16%; background:#f1f3f5; font-weight:bold; }
#printArea .op-doc .gj-di{ margin:0 0 10px; break-inside:avoid; }
#printArea .op-doc .gj-dih{ font-size:13.5px; font-weight:bold; padding:2px 8px; border-left:5px solid #1f5aa6; background:#f2f5fa; margin:0 0 4px; }
#printArea .op-doc .gj-dp{ margin:2px 0 2px 10px; white-space:pre-wrap; }
#printArea .op-doc .gj-dk{ display:inline-block; min-width:4.5em; font-weight:bold; }
#printArea .op-doc table.gj-dtd{ width:calc(100% - 10px); margin:4px 0 0 10px; border-collapse:collapse; }
#printArea .op-doc .gj-dtd th, #printArea .op-doc .gj-dtd td{ border:1px solid #888; padding:3px 6px; font-size:11.5px; text-align:left; }
#printArea .op-doc .gj-dtd th{ background:#f1f3f5; }
#printArea .op-doc .gj-dsg{ margin:22px 0 0; break-inside:avoid; }
#printArea .op-doc .gj-dsg p{ margin:0 0 14px; }
#printArea .op-doc .gj-dsl{ display:flex; justify-content:flex-end; gap:8px; margin:0 0 16px; font-size:13px; }
#printArea .op-doc .gj-dsl span{ display:inline-block; width:15em; border-bottom:1px solid #000; text-align:center; }
`;
function docHtml(m){
  const c=counts(m), names=s=>m.ppl.filter(p=>p.s===s).map(p=>esc(p.n)).join('、'), q=quorum(m);
  const row=(k,v)=>v ? `<tr><th>${k}</th><td>${v}</td></tr>` : '';
  let h=`<div class="gj-dt">議 事 録</div><div class="gj-ds">${esc(mTitle(m))}${m.org && m.t ? '（'+esc(m.org)+'）' : ''}</div>
    <table class="gj-dh">${row('日時', esc(jd(m.date, true))+(m.st ? '　'+m.st+(m.en ? '〜'+m.en : '') : ''))}${row('場所', esc(m.place))}
    ${row('出席者', c.p ? names('p')+'（'+c.p+'名）' : '')}${row('欠席者', c.a ? names('a')+'（'+c.a+'名）' : '')}${row('委任', c.d ? names('d')+'（'+c.d+'名）' : '')}
    ${q ? row('成立', '会員 '+m.members+'名中　出席 '+c.p+'名・委任 '+c.d+'名　計 '+q.have+'名（過半数 '+q.need+'名）　'+(q.ok ? '<b>成立</b>' : '不成立')) : ''}
    ${m.pr.c ? row('議長', esc(m.chair)) : ''}${m.pr.r ? row('書記', esc(m.rec)) : ''}</table>`;
  m.items.forEach((it,k)=>{
    const v=voteText(it.vote);
    h+=`<div class="gj-di"><div class="gj-dih">${k+1}．${esc(it.t||'議題')}</div>
      ${it.memo ? `<div class="gj-dp">${esc(it.memo)}</div>` : ''}${it.dec ? `<div class="gj-dp"><span class="gj-dk">【決定】</span>${esc(it.dec)}</div>` : ''}${v ? `<div class="gj-dp"><span class="gj-dk">【採決】</span>${esc(v)}</div>` : ''}
      ${it.todos.length ? `<table class="gj-dtd"><tr><th>宿題</th><th style="width:22%">担当</th><th style="width:16%">期限</th><th style="width:8%">済</th></tr>${it.todos.map(t=>`<tr><td>${esc(t.t)}</td><td>${esc(t.who)}</td><td>${esc(md(t.due))}</td><td>${t.done ? '☑' : ''}</td></tr>`).join('')}</table>` : ''}</div>`;
  });
  if(m.next.date) h+=`<div class="gj-di"><div class="gj-dih">次回</div><div class="gj-dp">${esc(jd(m.next.date, true))}${m.next.st ? '　'+m.next.st : ''}${m.next.place ? '　'+esc(m.next.place) : ''}</div></div>`;
  if(m.memo) h+=`<div class="gj-di"><div class="gj-dih">その他</div><div class="gj-dp">${esc(m.memo)}</div></div>`;
  // 署名・押印の 欄（🖨 印刷に 出す で 選んだ 人だけ）
  if(m.pr.sg && (m.pr.c || m.pr.s)){
    h+=`<div class="gj-dsg"><p>${esc(signText(m))}</p>
      <div class="gj-dsl">${esc(jd(todayS(), true))}</div>
      ${m.pr.c ? `<div class="gj-dsl">議　長　<span>${esc(m.chair)}</span>　印</div>` : ''}
      ${m.pr.s ? `<div class="gj-dsl">議事録署名人　<span>${esc(m.signs[0])}</span>　印</div>
      <div class="gj-dsl">議事録署名人　<span>${esc(m.signs[1])}</span>　印</div>` : ''}</div>`;
  }
  return `<div class="op-doc"><style>${DOC_CSS}</style><div class="gj-doc">${h}</div></div>`;
}
function print(){ const m=mOf(cur); if(!m) return null; save(); const built=opBuild(docHtml(m), true); opPrint(built); return built; }
async function image(){ const m=mOf(cur); if(!m) return null; save(); const built=opBuild(docHtml(m), true); return await opImage(built, '議事録', false); }
function copy(){ const m=mOf(cur); if(!m) return; if(typeof toolCopyText==='function') toolCopyText(plainText(m), '📋 議事録を コピーしました（LINE・メールに 貼れます）'); }
function calEv(m){
  if(!m.next.date) return null;
  return {uid:'gijiroku-'+m.id+'-next', title:(m.org ? m.org+' ' : '')+'会議', date:m.next.date, start:m.next.st||'', allDay:!m.next.st, loc:m.next.place, desc:'前回：'+mTitle(m)+'（'+md(m.date)+'）', alarm:m.next.st ? 60 : 0};
}
function cal(){
  const m=mOf(cur); const ev=m && calEv(m); if(!ev){ toastS('次回の 日付を 入れて ください'); return; }
  const go=()=>HyoIcs.sheet([ev], {file:'gijiroku-next.ics', name:'議事録', title:'次回を カレンダーに', note:(ev.allDay ? '終日の 予定で' : '1時間 前に 知らせる 予定で')+' 入れます。'});
  if(window.HyoIcs){ go(); return; }
  if(typeof loadSidePart==='function') loadSidePart(['hyoics.js']).then(ok=>{ if(ok && window.HyoIcs) go(); else toastS('カレンダーの 部品を 読めませんでした'); });
}

/* ───────── 📄 Word・📊 Excel・💾 保存（v609） ─────────
   Word（.docx）・Excel（.xlsx）は 外の 部品なしで 作る（ZIP は 表電卓の xlsxZip）。中身は 印刷と 同じ（🖨 印刷に 出す の 選び方も 守る）。
   💾 保存：この 端末に すぐ 保存して 知らせる。🗂 控え（.json）は この 道具で また 読める（機種変更・係の 交代）。表電卓 全体の バックアップからも 読める。 */
const MIME={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json:'application/json'};
const XP='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
// XML に 入れる 字（XML で 使えない 字は 外す）
const xe=s=>{ let t=String(s==null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, ''); if(typeof t.toWellFormed==='function') t=t.toWellFormed(); return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
const enc8=s=>new TextEncoder().encode(s);
const fstamp=()=>{ const d=new Date(); return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+'-'+pad2(d.getHours())+pad2(d.getMinutes()); };
// ファイルの 名前：gijiroku-20261030.docx（会議の 日付。日本語の 名前は ブラウザに よっては 捨てられて 開けない ファイルに なるので 英数字）
const fname=(m, ext)=>'gijiroku-'+m.date.replace(/-/g, '')+'.'+ext;
const subTitle=m=>mTitle(m)+(m.org && m.t ? '（'+m.org+'）' : '');
const nextText=m=>m.next.date ? jd(m.next.date, true)+(m.next.st ? '　'+m.next.st : '')+(m.next.place ? '　'+m.next.place : '') : '';
const signText=m=>'以上の 議事の 経過と 結果を 明らかに するため、この 議事録を 作り、'+(m.pr.c && m.pr.s ? '議長 及び 議事録署名人' : m.pr.c ? '議長' : '議事録署名人')+'が 署名 押印する。';
const todoLine=t=>(t.done ? '☑ ' : '')+t.t+(t.who || t.due ? '（'+[t.who, t.due ? md(t.due)+' まで' : ''].filter(Boolean).join('・')+'）' : '');
// 上の 表（日時・場所・出席者…）。印刷と 同じ 行（空の 行は 出さない）
function infoRows(m){
  const c=counts(m), q=quorum(m), names=s=>m.ppl.filter(p=>p.s===s).map(p=>p.n).join('、');
  return [['日時', jd(m.date, true)+(m.st ? '　'+m.st+(m.en ? '〜'+m.en : '') : '')], ['場所', m.place],
    ['出席者', c.p ? names('p')+'（'+c.p+'名）' : ''], ['欠席者', c.a ? names('a')+'（'+c.a+'名）' : ''], ['委任', c.d ? names('d')+'（'+c.d+'名）' : ''],
    ['成立', q ? '会員 '+m.members+'名中　出席 '+c.p+'名・委任 '+c.d+'名　計 '+q.have+'名（過半数 '+q.need+'名）　'+(q.ok ? '成立' : '不成立') : ''],
    ['議長', m.pr.c ? m.chair : ''], ['書記', m.pr.r ? m.rec : '']].filter(x=>x[1]);
}
function coreXml(title){ const t=new Date().toISOString().replace(/\.\d+Z$/, 'Z'); return `${XP}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(title)}</dc:title><dc:creator>表電卓 議事録</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${t}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${t}</dcterms:modified></cp:coreProperties>`; }
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships/', CT='application/vnd.openxmlformats-';
const rels=a=>`${XP}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${a.map((x,i)=>`<Relationship Id="rId${i+1}" Type="${x[0]}" Target="${x[1]}"/>`).join('')}</Relationships>`;
const types=a=>`${XP}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="${CT}package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${a.map(x=>`<Override PartName="${x[0]}" ContentType="${x[1]}"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="${CT}package.core-properties+xml"/></Types>`;
async function zipOf(files, type){
  if(typeof xlsxZip!=='function') throw new Error('zip');
  return new Blob([await xlsxZip(files.map(([name, s])=>({name, u8:enc8(s)})))], {type});
}

// ── 📄 Word（.docx）：A4 縦。題・上の 表・議題（左に 青い 線）・決定／採決・宿題の 表・次回・その他・署名欄 ──
const W_NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const W_TW=9638, W_IND=240, W_HL=840;   // 字の 幅（A4・左右 20mm）・本文の 字下げ・【決定】の 幅（twip）
// 字の ならび（改行は 段落の 中で 行を かえる）。o:{b, sz, u}
function wR(text, o){
  o=o||{};
  const rp=(o.b ? '<w:b/><w:bCs/>' : '')+(o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : '')+(o.u ? '<w:u w:val="single"/>' : '');
  return String(text==null ? '' : text).split('\n').map((ln,i)=>`<w:r>${rp ? '<w:rPr>'+rp+'</w:rPr>' : ''}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${xe(ln)}</w:t></w:r>`).join('');
}
// 段落。o:{jc, keep（次と 離さない）, bar（議題の 見出し）, ind:[左, ぶら下げ], before, after}
function wP(runs, o){
  o=o||{};
  return `<w:p><w:pPr>${o.keep ? '<w:keepNext/>' : ''}${o.bar ? '<w:pBdr><w:left w:val="single" w:sz="36" w:space="4" w:color="1F5AA6"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F2F5FA"/>' : ''}<w:spacing w:before="${o.before||0}" w:after="${o.after||0}"/>${o.ind ? `<w:ind w:left="${o.ind[0]}"${o.ind[1] ? ` w:hanging="${o.ind[1]}"` : ''}/>` : ''}${o.jc ? `<w:jc w:val="${o.jc}"/>` : ''}</w:pPr>${runs||''}</w:p>`;
}
// 表。cols：列の 幅、rows：[[{t, b, fill, jc}]]、o:{ind, head（1行目は 見出し。ページを またぐと くり返す）}
function wTbl(cols, rows, o){
  o=o||{};
  const bd=t=>`<w:${t} w:val="single" w:sz="4" w:space="0" w:color="555555"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${cols.reduce((a,b)=>a+b, 0)}" w:type="dxa"/>${o.ind ? `<w:tblInd w:w="${o.ind}" w:type="dxa"/>` : ''}<w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(bd).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="45" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="45" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>`
    +'<w:tblGrid>'+cols.map(w=>`<w:gridCol w:w="${w}"/>`).join('')+'</w:tblGrid>'
    +rows.map((r,ri)=>`<w:tr><w:trPr><w:cantSplit/>${o.head && !ri ? '<w:tblHeader/>' : ''}</w:trPr>${r.map((c,ci)=>`<w:tc><w:tcPr><w:tcW w:w="${cols[ci]}" w:type="dxa"/>${c.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${c.fill}"/>` : ''}</w:tcPr>${wP(wR(c.t, {b:c.b}), {jc:c.jc})}</w:tc>`).join('')}</w:tr>`).join('')+'</w:tbl>';
}
// 何行かの 字は 1行ずつ 段落に（行の 中の 改行だと、両端 そろえで 字の すきまが 広がる）。lab：1行目の 頭の【決定】など（2行目からは その 幅だけ 下げる）
function wPs(text, o, lab){ return String(text==null ? '' : text).split('\n').map((ln,i)=>!lab ? wP(wR(ln), o) : i ? wP(wR(ln), Object.assign({}, o, {ind:[W_IND+W_HL], before:0})) : wP(wR(lab, {b:true})+wR(ln), o)).join(''); }
// 署名の 線：名前を まん中に、線の 長さを そろえる（全角 14字ぶん）
function signPad(n){ let w=0; for(const ch of String(n||'')) w+=ch.charCodeAt(0)>0xFF ? 1 : 0.5; const p=Math.max(1, Math.round((14-w)/2)); return '　'.repeat(p)+(n||'')+'　'.repeat(p); }
function docxXml(m){
  const L=[], head=t=>wP(wR(t, {b:true, sz:23}), {keep:true, bar:true, before:240, after:80}), F='F1F3F5';
  L.push(wP(wR('議　事　録', {b:true, sz:36}), {jc:'center', after:60}));
  L.push(wP(wR(subTitle(m), {sz:24}), {jc:'center', after:240}));
  L.push(wTbl([1540, W_TW-1540], infoRows(m).map(([k,v])=>[{t:k, b:true, fill:F}, {t:v}])));
  m.items.forEach((it,k)=>{
    L.push(head((k+1)+'．'+(it.t||'議題')));
    if(it.memo) L.push(wPs(it.memo, {ind:[W_IND]}));
    if(it.dec) L.push(wPs(it.dec, {ind:[W_IND+W_HL, W_HL], before:40}, '【決定】'));
    const v=voteText(it.vote); if(v) L.push(wP(wR('【採決】', {b:true})+wR(v), {ind:[W_IND+W_HL, W_HL], before:40}));
    if(it.todos.length){
      const tw=W_TW-W_IND, c2=Math.round(tw*.22), c3=Math.round(tw*.16), c4=Math.round(tw*.08);
      L.push(wP('', {after:40}));
      L.push(wTbl([tw-c2-c3-c4, c2, c3, c4], [[{t:'宿題', b:true, fill:F}, {t:'担当', b:true, fill:F}, {t:'期限', b:true, fill:F}, {t:'済', b:true, fill:F, jc:'center'}]]
        .concat(it.todos.map(t=>[{t:t.t}, {t:t.who}, {t:md(t.due)}, {t:t.done ? '☑' : '', jc:'center'}])), {ind:W_IND, head:true}));
    }
  });
  if(m.next.date){ L.push(head('次回')); L.push(wP(wR(nextText(m)), {ind:[W_IND]})); }
  if(m.memo){ L.push(head('その他')); L.push(wPs(m.memo, {ind:[W_IND]})); }
  // 署名・押印の 欄（🖨 印刷に 出す で 選んだ 人だけ）。ページの 途中で 分かれない ように つなげる
  if(m.pr.sg && (m.pr.c || m.pr.s)){
    const who=(m.pr.c ? [['議　長', m.chair]] : []).concat(m.pr.s ? [['議事録署名人', m.signs[0]], ['議事録署名人', m.signs[1]]] : []);
    L.push(wP(wR(signText(m)), {keep:true, before:600, after:300}));
    L.push(wP(wR(jd(todayS(), true)), {keep:true, jc:'right', after:420}));
    who.forEach(([lab, n], i)=>L.push(wP(wR(lab+'　')+wR(signPad(n), {u:true})+wR('　印'), {keep:i<who.length-1, jc:'right', after:420})));
  }
  L.push(wP(''));   // 表で 終わらない ように
  return `${XP}<w:document ${W_NS}><w:body>${L.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/><w:cols w:space="425"/></w:sectPr></w:body></w:document>`;
}
const W_STY=`${XP}<w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Yu Gothic" w:eastAsia="游ゴシック" w:hAnsi="Yu Gothic" w:cs="Yu Gothic"/><w:kern w:val="2"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="ja-JP" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
  +'<w:style w:type="paragraph" w:default="1" w:styleId="a"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:widowControl w:val="0"/><w:jc w:val="both"/></w:pPr></w:style>'
  +'<w:style w:type="table" w:default="1" w:styleId="a1"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
const W_SET=`${XP}<w:settings ${W_NS}><w:defaultTabStop w:val="840"/><w:characterSpacingControl w:val="compressPunctuation"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
function docxFiles(m){
  const W=CT+'officedocument.wordprocessingml.';
  return [['[Content_Types].xml', types([['/word/document.xml', W+'document.main+xml'], ['/word/styles.xml', W+'styles+xml'], ['/word/settings.xml', W+'settings+xml']])],
    ['_rels/.rels', rels([[REL+'officeDocument', 'word/document.xml'], ['http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml']])],
    ['docProps/core.xml', coreXml('議事録 '+subTitle(m))], ['word/document.xml', docxXml(m)],
    ['word/_rels/document.xml.rels', rels([[REL+'styles', 'styles.xml'], [REL+'settings', 'settings.xml']])], ['word/styles.xml', W_STY], ['word/settings.xml', W_SET]];
}

// ── 📊 Excel（.xlsx）：「議事録」（印刷と 同じ ならび・議題は 1行ずつ）・「宿題」（しぼり込める）・「出席者」 ──
const X_W=[10, 18, 40, 28, 16, 30];   // 議事録の シートの 列の 幅（No.と 見出し／議題／話し合ったこと／決まったこと／採決／宿題）
const X_LH=18.75;   // 1行の 高さ（游ゴシック 11）
const X_S={title:1, sub:2, lab:3, val:4, head:5, num:6, right:7, line:8, date:9, wrap:10, left:11};
const xcol=i=>String.fromCharCode(65+i);
// 折り返した ときの 行の 数（おおよそ。全角は 2字ぶん）。Excel は 開いた ときに 高さを 合わせない ので 先に 決める
function xLines(t, w){ return String(t==null ? '' : t).split('\n').reduce((a, ln)=>{ let u=0; for(const ch of ln) u+=ch.charCodeAt(0)>0xFF ? 2.05 : 1.1; return a+Math.max(1, Math.ceil(u/Math.max(4, w-1.5))); }, 0); }
const xSerial=s=>Math.round((Date.UTC(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10))-Date.UTC(1899, 11, 30))/86400000);
// 1枚の シート。rows：[{c:[{v, s, n（数）, span（右へ つなぐ 数）}|null], h}|null（空の 行）]、o:{w:列の 幅, grid:false（線を 出さない）, land（横向き）, freeze（1行目を 止める）, filter}
function xSheet(rows, o){
  const merges=[];
  const body=rows.map((r,ri)=>{
    if(!r) return '';
    const R=ri+1; let at=0, lines=1;
    const cells=r.c.map(c=>{
      const i=at; if(!c){ at++; return ''; }
      const span=c.span||1, st=c.s ? ` s="${c.s}"` : '', empty=c.v==null || c.v==='';
      at+=span;
      if(!empty && !c.n) lines=Math.max(lines, xLines(c.v, o.w.slice(i, i+span).reduce((a,b)=>a+b, 0)));
      if(span>1) merges.push(xcol(i)+R+':'+xcol(i+span-1)+R);
      let x=empty ? `<c r="${xcol(i)}${R}"${st}/>` : c.n ? `<c r="${xcol(i)}${R}"${st}><v>${+c.v}</v></c>` : `<c r="${xcol(i)}${R}"${st} t="inlineStr"><is><t xml:space="preserve">${xe(c.v)}</t></is></c>`;
      for(let k=1;k<span;k++) x+=`<c r="${xcol(i+k)}${R}"${st}/>`;
      return x;
    }).join('');
    const ht=r.h || (lines>1 ? Math.min(409, Math.ceil(lines*X_LH)+3) : 0);
    return `<row r="${R}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells}</row>`;
  }).join('');
  return `${XP}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"${o.grid===false ? ' showGridLines="0"' : ''}>${o.freeze ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : ''}</sheetView></sheetViews>`
    +`<sheetFormatPr defaultRowHeight="${X_LH}"/><cols>${o.w.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData>${o.filter ? `<autoFilter ref="${o.filter}"/>` : ''}`
    +`${merges.length ? `<mergeCells count="${merges.length}">${merges.map(x=>`<mergeCell ref="${x}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${o.land ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
function xlsxSheets(m){
  const S=X_S, R=[];
  R.push({c:[{v:'議　事　録', s:S.title, span:6}], h:30});
  R.push({c:[{v:subTitle(m), s:S.sub, span:6}], h:22});
  R.push(null);
  infoRows(m).forEach(([k,v])=>R.push({c:[{v:k, s:S.lab}, {v, s:S.val, span:5}]}));
  if(m.items.length){
    R.push(null);
    R.push({c:['No.', '議題', '話し合ったこと', '決まったこと', '採決', '宿題（担当・期限）'].map(v=>({v, s:S.head})), h:24});
    m.items.forEach((it,k)=>R.push({c:[{v:k+1, n:true, s:S.num}, {v:it.t||'議題', s:S.val}, {v:it.memo, s:S.val}, {v:it.dec, s:S.val}, {v:voteText(it.vote), s:S.val}, {v:it.todos.map(todoLine).join('\n'), s:S.val}]}));
  }
  if(m.next.date || m.memo){
    R.push(null);
    if(m.next.date) R.push({c:[{v:'次回', s:S.lab}, {v:nextText(m), s:S.val, span:5}]});
    if(m.memo) R.push({c:[{v:'その他', s:S.lab}, {v:m.memo, s:S.val, span:5}]});
  }
  if(m.pr.sg && (m.pr.c || m.pr.s)){
    R.push(null);
    R.push({c:[{v:signText(m), s:S.wrap, span:6}], h:24});
    R.push({c:[null, null, null, null, {v:jd(todayS(), true), s:S.right, span:2}], h:28});
    const line=(lab, n)=>R.push({c:[null, null, null, {v:lab, s:S.right}, {v:n, s:S.line}, {v:'印', s:S.left}], h:32});
    if(m.pr.c) line('議　長', m.chair);
    if(m.pr.s){ line('議事録署名人', m.signs[0]); line('議事録署名人', m.signs[1]); }
  }
  const sheets=[['議事録', xSheet(R, {w:X_W, grid:false, land:true})]];
  const td=m.items.flatMap((it,k)=>it.todos.map(t=>({k, it, t})));
  if(td.length){
    const T=[{c:['No.', '議題', '宿題', '担当', '期限', '済'].map(v=>({v, s:S.head})), h:24}];
    td.forEach(({k, it, t})=>T.push({c:[{v:k+1, n:true, s:S.num}, {v:it.t||'議題', s:S.val}, {v:t.t, s:S.val}, {v:t.who, s:S.val}, t.due ? {v:xSerial(t.due), n:true, s:S.date} : {v:'', s:S.val}, {v:t.done ? '☑' : '', s:S.num}]}));
    sheets.push(['宿題', xSheet(T, {w:[6, 20, 36, 14, 12, 6], freeze:true, filter:'A1:F'+T.length})]);
  }
  if(m.ppl.length){
    const c=counts(m), P=[{c:['No.', '名前', '出欠'].map(v=>({v, s:S.head})), h:24}];
    m.ppl.forEach((p,i)=>P.push({c:[{v:i+1, n:true, s:S.num}, {v:p.n, s:S.val}, {v:ST[p.s], s:S.num}]}));
    P.push(null); P.push({c:[{v:'出席 '+c.p+'人'+(c.a ? '・欠席 '+c.a+'人' : '')+(c.d ? '・委任 '+c.d+'人' : ''), s:S.left, span:3}]});
    sheets.push(['出席者', xSheet(P, {w:[6, 24, 10], freeze:true})]);
  }
  return sheets;
}
const X_FONT=(b, sz)=>`<font>${b ? '<b/>' : ''}<sz val="${sz}"/><name val="游ゴシック"/><family val="3"/><charset val="128"/></font>`;
const X_FILL=c=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`;
const X_XF=(f, fill, bd, al, num)=>`<xf numFmtId="${num||0}" fontId="${f}" fillId="${fill}" borderId="${bd}" xfId="0"${num ? ' applyNumberFormat="1"' : ''}${f ? ' applyFont="1"' : ''}${fill ? ' applyFill="1"' : ''}${bd ? ' applyBorder="1"' : ''}${al ? ` applyAlignment="1"><alignment ${al}/></xf>` : '/>'}`;
const X_THIN=`<left style="thin"><color rgb="FF808080"/></left><right style="thin"><color rgb="FF808080"/></right><top style="thin"><color rgb="FF808080"/></top><bottom style="thin"><color rgb="FF808080"/></bottom>`;
const X_XFS=[X_XF(0,0,0), X_XF(2,0,0,'horizontal="center" vertical="center"'), X_XF(3,0,0,'horizontal="center" vertical="center" wrapText="1"'), X_XF(1,2,1,'vertical="top" wrapText="1"'), X_XF(0,0,1,'vertical="top" wrapText="1"'),
  X_XF(1,3,1,'horizontal="center" vertical="center" wrapText="1"'), X_XF(0,0,1,'horizontal="center" vertical="top"'), X_XF(0,0,0,'horizontal="right" vertical="center"'), X_XF(0,0,2,'horizontal="center" vertical="center"'),
  X_XF(0,0,1,'horizontal="center" vertical="top"', 164), X_XF(0,0,0,'vertical="top" wrapText="1"'), X_XF(0,0,0,'horizontal="left" vertical="center"')];
const X_STY=`${XP}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy/m/d"/></numFmts>`
  +`<fonts count="4">${X_FONT(0,11)}${X_FONT(1,11)}${X_FONT(1,16)}${X_FONT(0,12)}</fonts>`
  +`<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${X_FILL('F1F3F5')}${X_FILL('DCE6F1')}</fills>`
  +`<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border>${X_THIN}<diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border></borders>`
  +`<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${X_XFS.length}">${X_XFS.join('')}</cellXfs><cellStyles count="1"><cellStyle name="標準" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function xlsxFiles(m){
  const sh=xlsxSheets(m), X=CT+'officedocument.spreadsheetml.';
  const wb=`${XP}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sh.map((x,i)=>`<sheet name="${xe(x[0])}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
  return [['[Content_Types].xml', types([['/xl/workbook.xml', X+'sheet.main+xml'], ...sh.map((x,i)=>['/xl/worksheets/sheet'+(i+1)+'.xml', X+'worksheet+xml']), ['/xl/styles.xml', X+'styles+xml']])],
    ['_rels/.rels', rels([[REL+'officeDocument', 'xl/workbook.xml'], ['http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml']])],
    ['docProps/core.xml', coreXml('議事録 '+subTitle(m))], ['xl/workbook.xml', wb],
    ['xl/_rels/workbook.xml.rels', rels(sh.map((x,i)=>[REL+'worksheet', 'worksheets/sheet'+(i+1)+'.xml']).concat([[REL+'styles', 'styles.xml']]))], ['xl/styles.xml', X_STY]]
    .concat(sh.map((x,i)=>['xl/worksheets/sheet'+(i+1)+'.xml', x[1]]));
}

// ── 💾 保存・送る ──
let fileHow='save', fileAll=false, busy=false;   // ⬇ 端末に 保存／📤 送る・控えに ぜんぶの 会議を 入れる か（覚えない）
function canShareAs(kind){ try{ return !!(navigator.share && navigator.canShare && navigator.canShare({files:[new File(['x'], 'a.'+kind, {type:MIME[kind]})]})); }catch(_){ return false; } }
const shareAny=()=>['docx','xlsx','json'].some(canShareAs);
function dlBlob(blob, name){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
// 端末に 保存 か 📤 送る（送れない 端末・種類は 保存に する）
async function give(blob, name, kind, what){
  if(fileHow==='share' && canShareAs(kind)){
    try{ await navigator.share({files:[new File([blob], name, {type:MIME[kind]})], title:name}); toastS('📤 '+what+'を 送りました'); return 'share'; }
    catch(e){ if(e && e.name==='AbortError') return ''; }
  }
  dlBlob(blob, name); toastS('⬇ '+what+'を 保存しました：'+name, 4200); return 'save';
}
// 📄 Word・📊 Excel に する（いま 開いている 会議）
async function out(kind){
  const m=mOf(cur); if(!m || busy) return null;
  save(); busy=true;
  try{
    const blob=await zipOf(kind==='xlsx' ? xlsxFiles(m) : docxFiles(m), MIME[kind==='xlsx' ? 'xlsx' : 'docx']);
    await give(blob, fname(m, kind==='xlsx' ? 'xlsx' : 'docx'), kind==='xlsx' ? 'xlsx' : 'docx', kind==='xlsx' ? 'Excel の ファイル' : 'Word の ファイル');
    return blob;
  }catch(e){ if(window.console) console.error(e); toastS('ファイルに できませんでした'); return null; }
  finally{ busy=false; }
}
// 🗂 控え（.json）：この 会議 か ぜんぶの 会議
function fileJson(all){ const m=mOf(cur), list=all || !m ? st.list : [m]; return JSON.stringify({app:'hyodenki', type:'gijiroku', version:1, exportedAt:new Date().toISOString(), list}); }
async function saveJson(){
  const m=mOf(cur), all=fileAll || !m;
  if(!st.list.length){ toastS('会議が ありません'); return ''; }
  save();
  return give(new Blob([fileJson(all)], {type:MIME.json}), 'gijiroku-'+fstamp()+'.json', 'json', all ? '控え（会議 '+st.list.length+'件）' : '控え（'+mTitle(m)+'）');
}
function fileHtml(ok){
  const m=mOf(cur), n=st.list.length, sh=shareAny(), how=sh ? fileHow : 'save', d=new Date();
  return `<div class="gj-ph"><span>💾</span><b>${m ? '保存' : '議事録の 控え'}</b><button type="button" class="gj-x" onclick="GIJIROKU.close()" aria-label="閉じる">✕</button></div>
    ${m ? `<p class="gj-saved${ok ? '' : ' ng'}">${ok ? '✅ この 端末に 保存しました（'+pad2(d.getHours())+':'+pad2(d.getMinutes())+'）' : '⚠ この 端末に 保存 できませんでした（空きが 足りません）'}<small>書いた ことは 自動でも 保存 されます。一覧から いつでも 開けます。</small></p>`
      : `<p class="gj-note">会議（${n}件）は この 端末に 自動で 保存 されています。控えの ファイルに すると、機種変更や 係の 交代の ときに 渡せます。</p>`}
    ${sh ? `<div class="gj-seg hw" role="group" aria-label="ファイルの 渡し方"><button type="button" class="${how==='save' ? 'on' : ''}" aria-pressed="${how==='save'}" onclick="GIJIROKU.fileHow('save')">⬇ 端末に 保存</button><button type="button" class="${how==='share' ? 'on' : ''}" aria-pressed="${how==='share'}" onclick="GIJIROKU.fileHow('share')">📤 送る（LINE・メール）</button></div>` : ''}
    ${m ? `<h5 class="gj-fh">📁 Word・Excel の ファイルに する</h5>
      <div class="gj-fk"><button type="button" class="gj-fc w" onclick="GIJIROKU.out('docx')"><b>📄 Word</b><small>.docx・文書の 形で 直せる</small></button><button type="button" class="gj-fc x" onclick="GIJIROKU.out('xlsx')"><b>📊 Excel</b><small>.xlsx・表の 形で 直せる</small></button></div>` : ''}
    <h5 class="gj-fh">🗂 議事録の 控え（.json）</h5>
    <p class="gj-note sm">この 道具で また 開けます（機種変更・係の 交代・ほかの 端末へ）。</p>
    ${m && n>1 ? `<div class="gj-seg sc" role="group" aria-label="控えに 入れる 会議"><button type="button" class="${fileAll ? '' : 'on'}" aria-pressed="${!fileAll}" onclick="GIJIROKU.fileAll(false)">この 会議</button><button type="button" class="${fileAll ? 'on' : ''}" aria-pressed="${fileAll}" onclick="GIJIROKU.fileAll(true)">ぜんぶの 会議（${n}）</button></div>` : ''}
    <div class="gj-fbtns">${n ? `<button type="button" class="gj-b" onclick="GIJIROKU.saveJson()">🗂 控えを ${how==='share' ? '送る' : '保存'}</button>` : ''}<button type="button" class="gj-b" onclick="GIJIROKU.fileIn()">📂 控えを 読む</button></div>
    <p class="gj-note sm">読むと、同じ 会議は ファイルの 内容に 置きかわり、ほかの 会議は 足されます（聞いてから）。表電卓 全体の バックアップ ファイルからも 読めます。</p>`;
}
// 💾 保存：すぐ この 端末に 保存して、ファイルにも できる 窓を 出す
function saveOpen(){ const ok=save(); popOpen(fileHtml(ok)); if(pop) pop.kind='file'; return ok; }
function popFile(){ if(!pop || pop.kind!=='file') return; const b=pop.el.querySelector('.gj-pop'); if(b) b.innerHTML=fileHtml(true); }
function setHow(h){ fileHow=h==='share' ? 'share' : 'save'; popFile(); }
function setAll(a){ fileAll=!!a; popFile(); }
// 📂 控えを 読む
function fileIn(){ const i=$('gjFileIn'); if(i){ i.value=''; i.click(); } }
async function fileGot(inp){
  const f=inp && inp.files && inp.files[0]; if(inp) inp.value=''; if(!f) return 0;
  if(f.size>8000000){ toastS('ファイルが 大きすぎます'); return 0; }
  let t=''; try{ t=await f.text(); }catch(_){ toastS('ファイルを 読めませんでした'); return 0; }
  return importText(t, f.name);
}
// 中身を 読む：議事録の 控え・この 端末の 中身の 形・表電卓 全体の バックアップ（settings.excalc_gijiroku）
async function importText(t, name){
  let o=null; try{ o=JSON.parse(String(t||'')); }catch(_){}
  if(o && o.settings && typeof o.settings.excalc_gijiroku==='string'){ try{ o=JSON.parse(o.settings.excalc_gijiroku); }catch(_){ o=null; } }
  const list=(o && typeof o==='object' && Array.isArray(o.list) && (o.type==='gijiroku' || !o.type) ? o.list : []).map(cleanM).filter(Boolean);
  list.forEach((x,i,a)=>{ if(a.findIndex(y=>y.id===x.id)<i) x.id=rid(); });
  if(!list.length){ toastS('議事録の 控えの ファイルでは ありません'); return 0; }
  const rep=list.filter(x=>st.list.some(y=>y.id===x.id)), add=list.filter(x=>!st.list.some(y=>y.id===x.id)), room=Math.max(0, MAX_M-st.list.length), over=Math.max(0, add.length-room);
  if(!rep.length && add.length<=over){ toastS('会議が いっぱいで 読めません（'+MAX_M+' まで）'); return 0; }
  const msg='「'+oneLine(name||'ファイル', 40)+'」から 会議を 読みます。'+(add.length>over ? '\n・新しく 足す 会議：'+(add.length-over)+'件' : '')+(rep.length ? '\n・同じ 会議を ファイルの 内容に 置きかえ：'+rep.length+'件' : '')+(over ? '\n・'+over+'件は 入りません（会議は '+MAX_M+' まで）' : '');
  if(typeof appConfirm==='function' && !(await appConfirm(msg, '読む', 'やめる'))) return 0;
  rep.forEach(x=>{ const i=st.list.findIndex(y=>y.id===x.id); if(i>=0) st.list[i]=x; });
  add.slice(0, add.length-over).forEach(x=>st.list.push(x));
  const n=rep.length+add.length-over;
  if(!cur){ st.ui.tab='list'; st.ui.org=''; }
  save(); popClose(); render();
  toastS('📂 '+n+'件の 会議を 読みました', 3200);
  return n;
}

/* ───────── 📖 議事録の 例（v610） ─────────
   会議の 種類ごとに「どんな 会議か・だれが・いつ・書く ときの コツ」と 議事録の 例 5つ（gijiroku-rei.js。はじめて 開いた ときに 読む）。
   例は 印刷と 同じ 形で 見せる。「この 例の 議題で 作る」で 新しい 会議に。端末の「戻る」は 1つ 前の 画面へ。 */
const REI=()=>window.GIJIROKU_REI||null;
let rei=null;   // 例の 窓：{lv:'idx'（種類の 一覧）|'type'（種類）|'ex'（例）, k:会議の 種類, i:何番目の 例, g:[戻る の しるし]}
function reiLoad(){ if(REI()) return Promise.resolve(true); return typeof loadSidePart==='function' ? loadSidePart(['gijiroku-rei.js']).then(ok=>!!(ok && REI())) : Promise.resolve(false); }
// 例の 見出し（カードの 題・会議の 名前・議題の 名前）
function reiHead(s){ const L=String(s).split('\n'), h=L[0].split('｜'); return {n:h[0]||'', t:h[2]||'', topics:L.filter(l=>l[0]==='・').map(l=>l.slice(1).split('｜')[0]).join('・')}; }
// 例の 文字列 → 会議（cleanM の 形）。人数で 書いた ときの 名前は 架空の 名前の 一覧から 順に（書き方は gijiroku-rei.js の 頭）
function reiMeet(k, i){
  const D=REI(), s=D && D.types[k] && D.types[k].x[i]; if(!s) return null;
  const L=s.split('\n').map(x=>x.trim()).filter(Boolean), h=L[0].split('｜').map(x=>x.trim()), yr=todayS().slice(0, 4);
  const day=x=>/^\d\d-\d\d$/.test(x||'') && okD(yr+'-'+x) ? yr+'-'+x : todayS();
  const when=(h[3]||'').split(' '), tm=(when[1]||'').split('-'), date=day(when[0]), ppl=[];
  if(/^\d+\/\d+\/\d+$/.test(h[5]||'')){
    const c=h[5].split('/').map(Number), N=D.names, off=(Math.max(0, TPL.findIndex(t=>t[0]===k))*7+i*11)%N.length; let j=0;
    ['p','a','d'].forEach((sx,q)=>{ for(let n=0;n<c[q];n++) ppl.push({n:N[(off+j++)%N.length], s:sx}); });
  } else (h[5]||'').split('、').map(x=>x.trim()).filter(Boolean).forEach(n=>ppl.push({n, s:'p'}));
  const P=ppl.filter(p=>p.s==='p').map(p=>p.n), br=x=>String(x||'').replace(/¶/g, '\n');
  const who=x=>/^\d+$/.test(x||'') ? (P[+x-1]||'') : (x||'');
  const due=x=>{ if(!/^\d+$/.test(x||'')) return ''; const d=dOf(date); d.setDate(d.getDate()+(+x)); return ymd(d); };
  const items=[], next={}; let memo='';
  L.slice(1).forEach(l=>{
    if(l[0]==='・'){
      const f=l.slice(1).split('｜'), v=/^\d+-\d+-\d+$/.test(f[4]||'') ? f[4].split('-').map(Number) : null;
      items.push({t:f[0], memo:br(f[1]), dec:br(f[2]), vote:v ? {y:v[0], n:v[1], a:v[2]} : null, todos:String(f[3]||'').split('；').filter(Boolean).map(x=>{ const a=x.split('@'); return {t:a[0], who:who(a[1]), due:due(a[2])}; })});
    } else if(l[0]==='>'){ const a=l.slice(1).trim().split(' '); next.date=day(a[0]); if(okT(a[1]||'')){ next.st=a[1]; next.place=a.slice(2).join(' '); } else next.place=a.slice(1).join(' '); }
    else if(l[0]==='※') memo=br(l.slice(1));
  });
  const t=TPL.find(x=>x[0]===k)||TPL[0];
  return cleanM({org:h[1], t:h[2], date, st:tm[0], en:tm[1], place:h[4], ppl, chair:P[0]||'', rec:P[1]||'', signs:[P[2]||'', P[3]||''], members:h[6]||'', items, next, memo, tpl:k, pr:{c:true, r:true, s:!!t[4], sg:!!t[4]}});
}
async function reiOpen(k, i){
  if(!(await reiLoad())){ toastS('例を 読めませんでした。インターネットに つながる ところで もう 一度 開いて ください', 4200); return false; }
  popOpen('<div class="gj-rei" id="gjRei"></div>');
  if(!pop) return false;
  rei={lv:'idx', k:null, i:0, g:[]}; pop.kind='rei'; pop.onClose=reiEnd;
  const D=REI();
  if(k && D.types[k]){ reiPush(); rei.lv='type'; rei.k=k; if(i!=null && D.types[k].x[i]){ reiPush(); rei.lv='ex'; rei.i=+i; } }
  reiDraw();
  return true;
}
// 1つ 下の 画面へ 行く ときに「戻る」の しるしを 積む（端末の「戻る」で 1つ 上へ）
function reiPush(){ const me={}; me.rel=typeof modalBack==='function' ? modalBack(()=>{ if(rei && rei.g[rei.g.length-1]===me){ rei.g.pop(); reiLvUp(); } }) : ()=>{}; rei.g.push(me); }
function reiLvUp(){ if(!rei) return; rei.lv=rei.lv==='ex' ? 'type' : 'idx'; reiDraw(); }
function reiUp(){ if(!rei) return; if(rei.lv==='idx'){ popClose(); return; } const me=rei.g.pop(); if(me) me.rel(); reiLvUp(); }
function reiEnd(){ if(!rei) return; const g=rei.g; rei=null; g.reverse().forEach(me=>me.rel()); }
function reiType(k){ if(!rei || !REI().types[k]) return; reiPush(); rei.lv='type'; rei.k=k; reiDraw(); }
function reiEx(i){ if(!rei || !rei.k || !REI().types[rei.k].x[i]) return; reiPush(); rei.lv='ex'; rei.i=+i; reiDraw(); }
function reiStep(d){ if(!rei || rei.lv!=='ex') return; const n=REI().types[rei.k].x.length; rei.i=(rei.i+d+n)%n; reiDraw(); }
function reiDraw(){
  const b=$('gjRei'); if(!b || !rei || !REI()) return;
  b.innerHTML=rei.lv==='ex' ? reiExHtml() : rei.lv==='type' ? reiTypeHtml() : reiIdxHtml();
  const p=b.closest('.gj-pop'); if(p) p.scrollTop=0;
}
const reiX='<button type="button" class="gj-x" onclick="GIJIROKU.close()" aria-label="閉じる">✕</button>';
function reiIdxHtml(){
  const D=REI(), G=D.guide;
  return `<div class="gj-ph"><span aria-hidden="true">📖</span><b>議事録の 例</b>${reiX}</div>
    <p class="gj-note">会議の 種類を えらぶと、どんな 会議か・書く ときの コツ・議事録の 例（5つずつ）が 見られます。例の 名前・数字は すべて 架空です。</p>
    <details class="gj-rg"><summary>📝 議事録って？ 何を 書けば いい？</summary><p>${esc(G.what)}</p><b>書く こと</b><ol>${G.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><b>コツ</b><ul>${G.tips.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
    ${TPL_G.map(([g, gn])=>{ const ts=TPL.filter(t=>t[3]===g && D.types[t[0]]); return ts.length ? `<h5 class="gj-tplh">${gn}</h5><div class="gj-rl">${ts.map(t=>`<button type="button" class="gj-rc" data-k="${t[0]}" onclick="GIJIROKU.reiType(this.dataset.k)"><b>${esc(t[1])}</b><small>${esc(D.types[t[0]].a)}</small><em>例 ${D.types[t[0]].x.length}</em></button>`).join('')}</div>` : ''; }).join('')}`;
}
function reiTypeHtml(){
  const D=REI(), k=rei.k, d=D.types[k], t=TPL.find(x=>x[0]===k);
  return `<div class="gj-ph"><button type="button" class="gj-b sm" onclick="GIJIROKU.reiUp()">← 会議の 種類</button><b></b>${reiX}</div>
    <h4 class="gj-rt">${esc(t[1])}</h4>
    <div class="gj-ra"><p><b>どんな 会議？</b>${esc(d.a)}</p><p><b>だれが・いつ</b>${esc(d.w)}</p></div>
    ${t[2].length ? `<h5 class="gj-fh">🗂 よく ある 議題（ひな形）</h5><div class="gj-rchips">${t[2].map(x=>`<span>${esc(x)}</span>`).join('')}</div>` : ''}
    <h5 class="gj-fh">✍ 書く ときの コツ</h5><ul class="gj-rk">${d.k.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <h5 class="gj-fh">📄 議事録の 例（${d.x.length}）</h5>
    <div class="gj-rl">${d.x.map((s,i)=>{ const h=reiHead(s); return `<button type="button" class="gj-rc ex" onclick="GIJIROKU.reiEx(${i})"><em>例 ${i+1}</em><b>${esc(h.n)}</b><small>${esc(h.t)}：${esc(h.topics)}</small></button>`; }).join('')}</div>
    <div class="gj-acts"><button type="button" class="gj-b" data-k="${k}" onclick="GIJIROKU.reiNew(this.dataset.k)">＋ この ひな形で 新しい 会議を 作る</button></div>`;
}
function reiExHtml(){
  const D=REI(), k=rei.k, d=D.types[k], t=TPL.find(x=>x[0]===k), m=reiMeet(k, rei.i), n=d.x.length;
  return `<div class="gj-ph"><button type="button" class="gj-b sm" onclick="GIJIROKU.reiUp()">← ${esc(t[1].replace(/^\S+\s/, ''))}</button><b></b>${reiX}</div>
    <div class="gj-rnav"><button type="button" onclick="GIJIROKU.reiStep(-1)" aria-label="前の 例">◀</button><span>例 ${rei.i+1} / ${n}<b>${esc(reiHead(d.x[rei.i]).n)}</b></span><button type="button" onclick="GIJIROKU.reiStep(1)" aria-label="次の 例">▶</button></div>
    <div class="gj-paper">${m ? docHtml(m) : ''}</div>
    <p class="gj-note sm">名前・数字は すべて 架空の 例です。</p>
    <div class="gj-acts"><button type="button" class="gj-b pri" onclick="GIJIROKU.reiUse()">📄 この 例の 議題で 新しい 会議を 作る</button></div>`;
}
// 例の 議題で 新しい 会議を 作る（会の 名前・出席者は 空。中身は 自分で 書く）
function reiUse(){
  if(!rei || rei.lv!=='ex') return null;
  const ex=reiMeet(rei.k, rei.i); if(!ex) return null;
  const m=newMeet('', rei.k, false);
  m.items=ex.items.map(it=>cleanItem({t:it.t})).filter(Boolean); save();
  popClose(); cur=m.id; render(); const b=$('gjBody'); if(b) b.scrollTop=0;
  toastS('📄 例の 議題で 新しい 会議を 作りました。会の 名前・日時から 入れて ください', 3800);
  return m.id;
}
// この ひな形で 作る：「＋ 新しい 会議」の 窓を、この ひな形を えらんだ 形で 開く
function reiNew(k){ popClose(); add(); setTpl(k); }

/* ───────── 窓 ───────── */
const CSS=`
#gijirokuOverlay .gj-modal{ display:flex; flex-direction:column; }
.gj-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px 0; color:var(--text,#222); font-size:15px; }
.gj-wrap{ max-width:820px; margin:0 auto; padding-bottom:80px; }
.gj-tabs{ display:flex; gap:6px; margin:0 0 10px; } .gj-tabs button{ flex:1; min-height:44px; border-radius:22px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.gj-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .gj-tabs small{ font-size:12px; }
.gj-b{ min-height:44px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.gj-b.sm{ min-height:38px; font-size:13.5px; padding:0 10px; } .gj-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .gj-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.gj-acts{ display:flex; gap:6px; flex-wrap:wrap; margin:8px 0 0; } .gj-acts.top{ margin:0 0 10px; } .gj-acts.end{ justify-content:flex-end; margin-top:14px; } .gj-acts.sm{ margin-top:6px; }
.gj-chips{ display:flex; gap:6px; flex-wrap:wrap; margin:0 0 10px; } .gj-chips button{ min-height:38px; padding:0 14px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; } .gj-chips button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.gj-list{ display:flex; flex-direction:column; gap:8px; }
.gj-card{ display:flex; flex-direction:column; gap:2px; align-items:flex-start; padding:10px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.35); border-left:6px solid #1f5aa6; background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.gj-card .d{ font-size:13px; font-weight:bold; color:var(--text-light,#666); } .gj-card b{ font-size:16px; overflow-wrap:anywhere; } .gj-card small{ font-size:12.5px; color:var(--text-light,#666); } .gj-card em{ font-style:normal; color:#e53935; font-weight:bold; }
.gj-empty p, .gj-note{ font-size:13.5px; line-height:1.7; color:var(--text-light,#666); margin:6px 0; } .gj-note.sm{ font-size:12px; margin:4px 0 0; }
.gj-todos{ display:flex; flex-direction:column; gap:6px; }
.gj-td{ display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:12px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); } .gj-td.late{ border-color:rgba(229,57,53,.6); background:rgba(229,57,53,.06); }
.gj-td .tx{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; } .gj-td .tx b{ font-size:15px; overflow-wrap:anywhere; } .gj-td .tx small{ font-size:12.5px; color:var(--text-light,#666); } .gj-td.late .tx small:first-of-type{ color:#e53935; font-weight:bold; }
.gj-ck{ min-width:42px; min-height:42px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:22px; cursor:pointer; padding:0; flex:none; }
.gj-eh{ display:flex; align-items:center; gap:10px; margin:0 0 10px; } .gj-eh b{ flex:1; min-width:0; font-size:17px; overflow-wrap:anywhere; }
.gj-sec{ margin:0 0 12px; padding:10px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.3); background:var(--modal-bg,#fff); }
.gj-sec h4{ margin:0 0 8px; font-size:15.5px; display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; } .gj-sec h4 small{ font-size:12.5px; color:var(--text-light,#666); font-weight:normal; }
.gj-f{ display:flex; align-items:center; gap:8px; margin:6px 0; flex:1; min-width:0; } .gj-f > span{ min-width:4.6em; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); line-height:1.3; }
.gj-f input, .gj-add input{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.gj-row{ display:flex; gap:8px; flex-wrap:wrap; } .gj-row .gj-f{ flex:1 1 200px; } .gj-row .gj-f:has(input[type=date]){ flex:1 1 240px; } .gj-row .gj-tf{ flex:1 1 140px; }   /* スマホでは 日付の 下に はじめ・おわりを 1行で */
.gj-ppl{ display:flex; flex-wrap:wrap; gap:6px; }
.gj-p{ display:inline-flex; align-items:stretch; border-radius:20px; border:1.5px solid #2e9d4a; overflow:hidden; background:rgba(46,157,74,.08); }
.gj-p.s-a{ border-color:rgba(120,132,156,.6); background:rgba(120,132,156,.1); opacity:.8; } .gj-p.s-d{ border-color:#f0a400; background:rgba(240,164,0,.1); }
.gj-p .nm{ display:flex; align-items:center; gap:4px; min-height:38px; padding:0 4px 0 12px; border:0; background:transparent; color:var(--text,#222); font-size:14.5px; cursor:pointer; } .gj-p .nm small{ font-size:11.5px; font-weight:bold; color:#2e7d32; } .gj-p.s-a .nm small{ color:var(--text-light,#666); } .gj-p.s-d .nm small{ color:#b26a00; }
.gj-p .x{ min-width:34px; border:0; background:transparent; color:var(--text-light,#666); font-size:13px; cursor:pointer; }
.gj-add{ display:flex; gap:6px; margin:8px 0 0; }
.gj-q{ margin:6px 0; padding:8px 10px; border-radius:10px; font-size:13.5px; line-height:1.6; } .gj-q.ok{ background:rgba(46,157,74,.12); } .gj-q.ng{ background:rgba(229,57,53,.1); color:#c62828; }
.gj-item{ margin:0 0 10px; padding:8px 10px; border-radius:12px; border:1px solid rgba(120,132,156,.3); background:rgba(120,132,156,.04); }
.gj-ih{ display:flex; align-items:center; gap:6px; } .gj-ih .no{ flex:none; width:30px; height:30px; border-radius:15px; background:#1f5aa6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; }
.gj-ih input{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; font-weight:bold; box-sizing:border-box; }
.gj-ib{ flex:none; min-width:38px; min-height:38px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:15px; cursor:pointer; padding:0; } .gj-ib:disabled{ opacity:.3; cursor:default; }
.gj-lb{ display:block; margin:8px 0 3px; font-size:12.5px; font-weight:bold; color:var(--text-light,#666); }
.gj-ta{ position:relative; } .gj-ta textarea{ width:100%; min-height:60px; padding:8px 46px 8px 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; font-family:inherit; line-height:1.6; box-sizing:border-box; resize:vertical; }
.gj-mic{ position:absolute; right:6px; top:6px; width:36px; height:36px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); font-size:17px; cursor:pointer; padding:0; } .gj-mic.on{ background:#e53935; border-color:#e53935; color:#fff; }
.gj-vote{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:8px 0 0; padding:6px 8px; border-radius:10px; background:rgba(31,90,166,.07); font-size:13.5px; }
.gj-vote span{ font-weight:bold; } .gj-vote label{ display:flex; align-items:center; gap:3px; } .gj-vote input{ width:4.2em; min-height:36px; padding:0 6px; border-radius:8px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; text-align:right; } .gj-vote b{ flex:1 1 100%; font-size:13.5px; }
.gj-tl{ display:flex; flex-direction:column; gap:5px; margin:8px 0 0; }
.gj-t{ display:flex; align-items:center; gap:5px; flex-wrap:wrap; } .gj-t.dn input{ text-decoration:line-through; opacity:.6; } .gj-t.late .dd{ border-color:#e53935; color:#e53935; }
.gj-t input{ flex:2 1 160px; min-width:0; min-height:40px; padding:0 8px; border-radius:9px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:15px; box-sizing:border-box; }
.gj-t input.w{ flex:1 1 90px; } .gj-t input.dd{ flex:0 1 150px; }
.gj-out{ display:flex; flex-wrap:wrap; gap:6px; margin:14px 0 0; }
.gj-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.gj-pop{ width:100%; max-width:640px; max-height:90%; overflow:auto; background:var(--modal-bg,#fff); color:var(--text,#222); border-radius:16px 16px 0 0; padding:12px 14px calc(16px + var(--safe-bottom,0px)); box-shadow:0 -6px 24px rgba(0,0,0,.25); }
.gj-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .gj-ph > span{ font-size:26px; line-height:1; } .gj-ph b{ flex:1; font-size:17px; }
.gj-tb{ flex:1; min-width:0; min-height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; font-weight:bold; text-align:left; cursor:pointer; font-variant-numeric:tabular-nums; font-family:inherit; }
.gj-tb.none{ color:var(--text-light,#777); font-weight:normal; }
.gj-tpbig{ margin:2px 0 8px; text-align:center; font-size:40px; font-weight:bold; font-variant-numeric:tabular-nums; color:var(--acc-text,var(--acc)); }
.gj-tpll{ font-size:12px; font-weight:bold; color:var(--text-light,#777); margin:6px 0 4px; }
.gj-tpg{ display:grid; grid-template-columns:repeat(6,1fr); gap:4px; }
.gj-tpg button{ height:40px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:16px; font-weight:bold; cursor:pointer; touch-action:manipulation; font-variant-numeric:tabular-nums; }
.gj-tpg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.gj-tpfine{ display:flex; gap:6px; margin-top:8px; } .gj-tpfine button{ flex:1; height:40px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; touch-action:manipulation; }
.gj-tpfine input{ flex:1; min-width:0; height:42px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
@media (max-height:700px){ .gj-tpbig{ font-size:30px; margin:0 0 2px; } .gj-tpg button, .gj-tpfine button{ height:34px; } }
.gj-x{ min-width:44px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.gj-tpl{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:6px; margin:8px 0; }
.gj-tpl button{ display:flex; flex-direction:column; align-items:flex-start; gap:3px; padding:8px 10px; border-radius:12px; border:1.5px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.gj-tpl button b{ font-size:14.5px; } .gj-tpl button small{ font-size:11.5px; color:var(--text-light,#666); line-height:1.4; } .gj-tpl button.on{ border-color:var(--acc); box-shadow:0 0 0 2px var(--acc) inset; background:rgba(46,157,74,.08); }
.gj-ck2{ display:flex; align-items:center; gap:8px; font-size:14px; margin:8px 0; } .gj-ck2 input{ width:22px; height:22px; } .gj-ck2[hidden]{ display:none; }
.gj-tplh{ margin:12px 0 4px; font-size:14px; } .gj-tpl{ margin:4px 0; }
.gj-orgs{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:0 0 8px; } .gj-orgs small{ font-size:12.5px; color:var(--text-light,#666); }
.gj-orgs button{ min-height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13.5px; cursor:pointer; }
.gj-stick{ position:sticky; bottom:calc(-16px - var(--safe-bottom,0px)); z-index:1; margin:12px -14px calc(-16px - var(--safe-bottom,0px)); padding:10px 14px calc(12px + var(--safe-bottom,0px)); background:var(--modal-bg,#fff); border-top:1px solid rgba(120,132,156,.25); }
.gj-pr{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:10px 0 2px; padding:8px 10px; border-radius:12px; background:rgba(120,132,156,.08); } .gj-pr small{ font-size:12.5px; font-weight:bold; color:var(--text-light,#666); margin-right:2px; }
.gj-chk{ display:inline-flex; align-items:center; gap:5px; min-height:36px; padding:0 10px; border-radius:18px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text-light,#777); font-size:13.5px; cursor:pointer; }
.gj-chk input{ width:18px; height:18px; margin:0; } .gj-chk.on{ color:var(--text,#222); font-weight:bold; border-color:var(--acc); }
.gj-dw{ display:flex; gap:5px; overflow-x:auto; margin:5px 0 0; padding:0 0 2px; scrollbar-width:thin; } .gj-dw button{ flex:none; min-height:32px; padding:0 10px; border-radius:16px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.07); color:var(--text,#222); font-size:12.5px; cursor:pointer; white-space:nowrap; }
.gj-agq{ width:100%; min-height:42px; padding:0 12px; margin:0 0 6px; border-radius:21px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; font-family:inherit; }
.gj-agg h5{ margin:10px 0 4px; font-size:13.5px; } .gj-agg[hidden]{ display:none; } .gj-agc{ display:flex; flex-wrap:wrap; gap:5px; }
.gj-ag{ min-height:38px; padding:0 12px; border-radius:19px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; } .gj-ag[hidden]{ display:none; }
.gj-ag.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; } .gj-ag.have{ opacity:.45; text-decoration:line-through; cursor:default; }
.gj-eh .gj-sv{ flex:none; }
.gj-saved{ margin:0 0 10px; padding:10px 12px; border-radius:12px; background:rgba(46,157,74,.12); font-size:14.5px; font-weight:bold; line-height:1.6; } .gj-saved small{ display:block; font-size:12.5px; font-weight:normal; color:var(--text-light,#666); } .gj-saved.ng{ background:rgba(229,57,53,.1); color:#c62828; }
.gj-seg{ display:flex; gap:6px; margin:4px 0 8px; } .gj-seg button{ flex:1; min-width:0; min-height:42px; padding:0 8px; border-radius:21px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; } .gj-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.gj-fh{ margin:14px 0 6px; font-size:14.5px; }
.gj-fk{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.gj-fc{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; min-height:76px; padding:8px; border-radius:14px; border:2px solid rgba(120,132,156,.45); background:rgba(120,132,156,.06); color:var(--text,#222); cursor:pointer; font:inherit; text-align:center; }
.gj-fc b{ font-size:18px; } .gj-fc small{ font-size:12px; color:var(--text-light,#666); line-height:1.4; } .gj-fc.w{ border-color:rgba(43,87,154,.65); } .gj-fc.x{ border-color:rgba(33,115,70,.65); }
.gj-fbtns{ display:flex; gap:8px; flex-wrap:wrap; margin:8px 0 0; } .gj-fbtns .gj-b{ flex:1 1 150px; }
.gj-rlink{ display:block; width:100%; margin:4px 0 6px; padding:8px 12px; border-radius:12px; border:1px dashed rgba(31,90,166,.6); background:rgba(31,90,166,.06); color:var(--text,#222); font:inherit; font-size:13.5px; font-weight:bold; text-align:left; cursor:pointer; }
.gj-rei .gj-ph .gj-b.sm{ flex:none; } .gj-rei .gj-ph b:empty{ flex:1; }
.gj-rg{ margin:8px 0 6px; padding:8px 12px; border-radius:12px; background:rgba(31,90,166,.07); font-size:14px; line-height:1.7; } .gj-rg summary{ font-weight:bold; cursor:pointer; min-height:32px; } .gj-rg p{ margin:6px 0; } .gj-rg ol, .gj-rg ul{ margin:4px 0 8px; padding-left:1.4em; }
.gj-rl{ display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:8px; }
.gj-rc{ position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:3px; padding:10px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.4); border-left:5px solid #1f5aa6; background:var(--modal-bg,#fff); color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
.gj-rc b{ font-size:15px; padding-right:3.4em; } .gj-rc small{ font-size:12.5px; color:var(--text-light,#666); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.gj-rc em{ position:absolute; top:9px; right:10px; font-style:normal; font-size:11.5px; font-weight:bold; color:#1f5aa6; } .gj-rc.ex em{ position:static; } .gj-rc.ex b{ padding-right:0; }
.gj-rt{ margin:4px 0 8px; font-size:18px; }
.gj-ra{ padding:10px 12px; border-radius:12px; background:rgba(46,157,74,.08); font-size:14px; line-height:1.7; } .gj-ra p{ margin:0 0 6px; } .gj-ra p:last-child{ margin:0; } .gj-ra b{ display:block; font-size:12.5px; color:var(--text-light,#666); }
.gj-rchips{ display:flex; flex-wrap:wrap; gap:5px; } .gj-rchips span{ padding:4px 10px; border-radius:14px; background:rgba(120,132,156,.12); font-size:13px; }
.gj-rk{ margin:0; padding-left:1.3em; font-size:14px; line-height:1.7; }
.gj-rnav{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .gj-rnav button{ flex:none; width:46px; min-height:44px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.gj-rnav span{ flex:1; min-width:0; text-align:center; font-size:12.5px; color:var(--text-light,#666); } .gj-rnav span b{ display:block; font-size:15px; color:var(--text,#222); overflow-wrap:anywhere; }
.gj-paper{ background:#fff; color:#000; border-radius:8px; padding:14px 12px; box-shadow:0 1px 6px rgba(0,0,0,.18); overflow-x:auto; }
`+DOC_CSS.replace(/#printArea \.op-doc/g, '.gj-paper .op-doc')+`
.gj-paper .op-doc .gj-doc{ font-size:13.5px; } .gj-paper .op-doc .gj-dh th, .gj-paper .op-doc .gj-dh td{ font-size:13px; } .gj-paper .op-doc .gj-dtd th, .gj-paper .op-doc .gj-dtd td{ font-size:12.5px; }
body.dark .gj-rc{ border-left-color:#5b8def; } body.dark .gj-rc em{ color:#9cbcff; } body.dark .gj-rg{ background:rgba(120,160,230,.12); } body.dark .gj-rlink{ border-color:rgba(120,160,230,.7); background:rgba(120,160,230,.1); }
body.dark .gj-saved.ng{ color:#ff8a80; } body.dark .gj-fc.w{ border-color:rgba(120,160,230,.7); } body.dark .gj-fc.x{ border-color:rgba(100,190,140,.7); }
body.dark .gj-p .nm small{ color:#a5d6a7; } body.dark .gj-p.s-d .nm small{ color:#ffcc80; } body.dark .gj-card em, body.dark .gj-q.ng{ color:#ff8a80; } body.dark .gj-td.late .tx small:first-of-type{ color:#ff8a80; }
@media (max-width:520px){ .gj-f > span{ min-width:3.8em; } }
`;
function ensureDom(){
  if($('gijirokuOverlay')) return;
  const s=document.createElement('style'); s.id='gjStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="gijirokuOverlay">
  <div class="modal vol-modal gj-modal modal-full" style="position:relative">
    <div class="modal-header"><span>📝 議事録</span><button class="modal-close" onclick="closeGijiroku()" aria-label="閉じる">✕</button></div>
    <div class="gj-body" id="gjBody"></div>
    <input type="file" id="gjFileIn" accept=".json,application/json" hidden onchange="GIJIROKU.fileGot(this)">
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('gijirokuOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('keydown', e=>{   // Esc は 上に 重ねた 小さな窓から 閉じる・会議を 開いて いれば 一覧に もどる
    if(e.key!=='Escape' || !isDlgOpen('gijirokuOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    if(pop){ e.preventDefault(); e.stopImmediatePropagation(); popClose(); return; }
    if(cur){ e.preventDefault(); e.stopImmediatePropagation(); back(); }
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
let backRel=null;
function cleanup(){ popClose(); if(rec){ try{ rec.abort(); }catch(_){} rec=null; } save(); cur=null; }
function openGijiroku(){ ensureDom(); load(); cur=null; openDlg('gijirokuOverlay', cleanup); render(); if(!window.HyoIcs && typeof loadSidePart==='function') loadSidePart(['hyoics.js']); }
function closeGijiroku(){ if(!$('gijirokuOverlay') || !isDlgOpen('gijirokuOverlay')) return; closeDlg('gijirokuOverlay', cleanup); }

window.GIJIROKU={ tab:k=>{ st.ui.tab=k==='todo' ? 'todo' : 'list'; save(); render(); }, org:o=>{ st.ui.org=oneLine(o, 40); save(); render(); }, who:w=>{ st.ui.who=oneLine(w, 30); save(); render(); },
  add, tpl:setTpl, addGo, addOrg, open:openM, pr:setPr, decAdd, agOpen, agToggle, agFilter, agGo, back, del, set:setF, time, padd, paste, pick, pprev, pst, pdel, iadd, imove, idel, tadd, tdel, tdone, done:doneAny, vote, mic, close:popClose,
  print, image, copy, cal, nextMeet, saveOpen, out, saveJson, fileHow:setHow, fileAll:setAll, fileIn, fileGot,
  rei:(k, i)=>reiOpen(k, i), reiHere:()=>{ const m=mOf(cur); return reiOpen(m && m.tpl!=='blank' ? m.tpl : null); }, reiType, reiEx, reiStep, reiUp, reiUse, reiNew,
  // ためす とき 用
  today:s=>{ fixedToday=s ? String(s) : null; if(st) render(); }, state:()=>JSON.parse(JSON.stringify(st)), cur:()=>cur, text:id=>{ const m=mOf(id||cur); return m ? plainText(m) : ''; },
  doc:id=>{ const m=mOf(id||cur); return m ? docHtml(m) : ''; }, newMeet:(org,tpl,cp)=>{ const m=newMeet(org, tpl, cp); return m.id; }, quorum:id=>{ const m=mOf(id||cur); return m ? quorum(m) : null; }, voteText, calEv:id=>{ const m=mOf(id||cur); return m ? calEv(m) : null; },
  parseTime, tpls:()=>TPL.map(t=>t[0]), agAll:()=>AG_ALL.slice(),
  files:(id, kind)=>{ const m=mOf(id||cur); return m ? (kind==='xlsx' ? xlsxFiles(m) : docxFiles(m)) : null; }, blob:async (id, kind)=>{ const m=mOf(id||cur); return m ? zipOf(kind==='xlsx' ? xlsxFiles(m) : docxFiles(m), MIME[kind==='xlsx' ? 'xlsx' : 'docx']) : null; },
  fname:(id, ext)=>{ const m=mOf(id||cur); return m ? fname(m, ext) : ''; }, fileJson, importText, xLines, xSerial, signPad,
  reiMeet, reiHead, reiLv:()=>rei ? [rei.lv, rei.k||'', rei.i, rei.g.length].join(':') : '', quorumOf:m=>quorum(m), openTodos:()=>openTodos().map(x=>x.t.t+'@'+(x.t.who||'')+'@'+(x.t.due||'')) };
Object.assign(window, { openGijiroku, closeGijiroku });
})();
