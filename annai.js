/* 🏨 お客様向け案内ページ（v455。表電卓の道具。はじめて開いたときに読む）
   旅館・民宿が、お客様のスマホで見てもらう案内ページを作る。
   ・宿の名前・電話と、「館内のご案内」「ゲレンデ（冬）」「夏のあそび」「周辺のお店」などの項目を入れる。
     項目ごとに 通年／冬だけ／夏だけ を決めると、ページは今の季節の項目を先に見せる（切りかえもできる）。
   ・本文は1行ずつ。「・」で始めると箇条書き、電話番号は押すとかけられ、https:// は押すと開く、
     「地図:〇〇」は地図アプリで〇〇をさがす。
   ・📱 で、お客様のスマホの大きさで見た目をたしかめる。⬇ で1つの HTML ファイルに書き出す
     （Netlify などに置くと、お客様が見られるアドレスになる）。置いたアドレスを入れると、客室に置く QR コードのカードを印刷できる。
   ・v456：🌐 英語・中国語（簡体・繁体）・韓国語・タイ語で見られる。訳は項目ごとに入れ、ページの右上で言語を切りかえる。
     ❓ で Netlify に置く方法を見られる。
   ・v457：右上の ❓ ヘルプ（作り方・外国語・Netlify の開設・置き方・名前・置き直し・設定・困ったとき）。
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

/* ── 外国語（v456） ──
   お客様のページは 日本語＋選んだ言語 で出す。訳は宿の方が項目ごとに入れる（Google 翻訳を開くボタンで下書きできる）。
   訳のない項目は日本語のまま出し、ページに「Google で自動翻訳」のボタンを出す。
   訳には、訳したときの日本語のしるし（src）を付けておき、日本語を直したのに訳が古いままなら ⚠ で知らせる。 */
const AN_LANGS=[
  {k:'en', n:'English', j:'英語', s:'EN', g:'en'},
  {k:'zh-Hans', n:'简体中文', j:'中国語（簡体字）', s:'简', g:'zh-CN'},
  {k:'zh-Hant', n:'繁體中文', j:'中国語（繁体字）', s:'繁', g:'zh-TW'},
  {k:'ko', n:'한국어', j:'韓国語', s:'한', g:'ko'},
  {k:'th', n:'ไทย', j:'タイ語', s:'ไทย', g:'th'},
];
const AN_LK=AN_LANGS.map(l=>l.k);
const anLang=k=>AN_LANGS.find(l=>l.k===k);
/* お客様のページの決まった言葉 */
const AN_UI={
  ja:{guide:'ご案内', now:'今の季節', nw:'❄ 冬', ns:'☀ 夏', all:'全部', w:'冬', s:'夏', call:'フロントに電話', upd:'最終更新', map:'📍地図', mt:'', mtb:'', scan:''},
  en:{guide:'Guest Information', now:'Now', nw:'❄ Winter', ns:'☀ Summer', all:'All', w:'Winter', s:'Summer', call:'Call the front desk', upd:'Last updated', map:'📍Map',
    mt:'Some parts are only in Japanese.', mtb:'Translate this page automatically (Google)', scan:'Scan for guest information'},
  'zh-Hans':{guide:'入住指南', now:'当季', nw:'❄ 冬季', ns:'☀ 夏季', all:'全部', w:'冬季', s:'夏季', call:'致电前台', upd:'最后更新', map:'📍地图',
    mt:'部分内容只有日文。', mtb:'用 Google 自动翻译本页', scan:'扫码查看入住指南'},
  'zh-Hant':{guide:'住宿指南', now:'當季', nw:'❄ 冬季', ns:'☀ 夏季', all:'全部', w:'冬季', s:'夏季', call:'致電櫃台', upd:'最後更新', map:'📍地圖',
    mt:'部分內容只有日文。', mtb:'用 Google 自動翻譯本頁', scan:'掃碼查看住宿指南'},
  ko:{guide:'이용 안내', now:'지금', nw:'❄ 겨울', ns:'☀ 여름', all:'전체', w:'겨울', s:'여름', call:'프런트에 전화', upd:'최종 업데이트', map:'📍지도',
    mt:'일부 내용은 일본어로만 되어 있습니다.', mtb:'Google로 이 페이지 자동 번역', scan:'스캔하여 이용 안내 보기'},
  th:{guide:'ข้อมูลสำหรับผู้เข้าพัก', now:'ฤดูนี้', nw:'❄ ฤดูหนาว', ns:'☀ ฤดูร้อน', all:'ทั้งหมด', w:'ฤดูหนาว', s:'ฤดูร้อน', call:'โทรหาแผนกต้อนรับ', upd:'อัปเดตล่าสุด', map:'📍แผนที่',
    mt:'บางส่วนมีเฉพาะภาษาญี่ปุ่น', mtb:'แปลหน้านี้อัตโนมัติ (Google)', scan:'สแกนเพื่อดูข้อมูลสำหรับผู้เข้าพัก'},
};
/* 日本語のしるし（訳が古くなっていないか見るため） */
function anSig(s){ s=String(s||''); let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
const anSecSig=s=>anSig(s.title+'\u0001'+s.body);
/* 訳の状態：'ok' 訳あり／'old' 日本語が直されて古い／'' 訳なし */
function anTrState(s,k){ const t=s.tr && s.tr[k]; if(!t || !(t.title||t.body)) return ''; return t.src===anSecSig(s)?'ok':'old'; }
function anTopState(k){ const t=an.tr && an.tr[k]; if(!t || !(t.name||t.tagline)) return ''; return (!an.tagline || t.src===anSig(an.tagline))?'ok':'old'; }

/* はじめの見本（旅館の方が自分のものに書きかえる。外国語の訳も見本として入れておく） */
function anDefault(){
  const S=(icon,title,season,body,tr)=>{ const s={id:uid(), icon, title, season, body, open:false, tr:{}}; const sg=anSecSig(s);
    for(const k in tr) s.tr[k]={title:tr[k][0], body:tr[k][1], src:sg}; return s; };
  const tag='ようこそお越しくださいました';
  return { v:1, name:'（宿の名前）', tagline:tag, tel:'', color:'#1b5e8f', url:'', updated:today(), langs:['en','zh-Hans','zh-Hant','ko'],
    tr:{ en:{name:'', tagline:'Welcome! Thank you for staying with us.', src:anSig(tag)}, 'zh-Hans':{name:'', tagline:'欢迎光临', src:anSig(tag)},
      'zh-Hant':{name:'', tagline:'歡迎光臨', src:anSig(tag)}, ko:{name:'', tagline:'어서 오세요', src:anSig(tag)} },
    sections:[
      S('🏨','館内のご案内','all','チェックイン　15:00〜\nチェックアウト　10:00まで\n・ご夕食　18:00〜（1階 食事処）\n・ご朝食　7:30〜9:00\n・門限はございません。遅くなるときはお電話ください', {
        en:['Inn Information','Check-in　from 15:00\nCheck-out　by 10:00\n・Dinner　from 18:00 (dining room, 1F)\n・Breakfast　7:30–9:00\n・There is no curfew. Please call us if you will be late.'],
        'zh-Hans':['馆内指南','入住　15:00起\n退房　10:00前\n・晚餐　18:00起（1楼餐厅）\n・早餐　7:30〜9:00\n・没有门禁时间。晚归时请来电告知。'],
        'zh-Hant':['館內指南','入住　15:00起\n退房　10:00前\n・晚餐　18:00起（1樓餐廳）\n・早餐　7:30〜9:00\n・沒有門禁時間。晚歸時請來電告知。'],
        ko:['관내 안내','체크인　15:00〜\n체크아웃　10:00까지\n・저녁 식사　18:00〜（1층 식당）\n・아침 식사　7:30〜9:00\n・통금 시간은 없습니다. 늦으실 때는 전화 주세요.'] }),
      S('♨','お風呂','all','・大浴場　15:00〜23:00／6:00〜9:00\n・男湯と女湯は毎朝入れかわります\n・タオルはお部屋のものをお持ちください', {
        en:['Baths','・Large bath　15:00–23:00 / 6:00–9:00\n・The men\'s and women\'s baths switch every morning\n・Please bring the towels from your room'],
        'zh-Hans':['浴场','・大浴场　15:00〜23:00／6:00〜9:00\n・男汤和女汤每天早上交换\n・请携带房间里的毛巾'],
        'zh-Hant':['浴場','・大浴場　15:00〜23:00／6:00〜9:00\n・男湯和女湯每天早上交換\n・請攜帶房間裡的毛巾'],
        ko:['목욕탕','・대욕장　15:00〜23:00／6:00〜9:00\n・남탕과 여탕은 매일 아침 바뀝니다\n・수건은 객실에 있는 것을 가져가 주세요'] }),
      S('📶','Wi-Fi','all','ネットワーク名　（ここに入れる）\nパスワード　（ここに入れる）', {
        en:['Wi-Fi','Network name　(enter here)\nPassword　(enter here)'], 'zh-Hans':['Wi-Fi','网络名称　（在此填写）\n密码　（在此填写）'],
        'zh-Hant':['Wi-Fi','網路名稱　（在此填寫）\n密碼　（在此填寫）'], ko:['Wi-Fi','네트워크 이름　（여기에 입력）\n비밀번호　（여기에 입력）'] }),
      S('⛷','ゲレンデ・リフト','winter','・ゲレンデまで歩いて5分\n・リフト券はフロントで割引券をお渡しします\n・スキー・ボードは玄関横の乾燥室へ（ブーツは乾燥機にかけられます）\n・ゲレンデ情報 https://example.com', {
        en:['Ski Slopes & Lifts','・5-minute walk to the slopes\n・Discount vouchers for lift tickets are available at the front desk\n・Please leave skis and snowboards in the drying room next to the entrance (boots can go in the dryer)\n・Slope information https://example.com'],
        'zh-Hans':['雪场・缆车','・步行5分钟到雪场\n・前台提供缆车票优惠券\n・滑雪板请放在玄关旁的烘干室（雪靴可以放进烘干机）\n・雪场信息 https://example.com'],
        'zh-Hant':['雪場・纜車','・步行5分鐘到雪場\n・櫃台提供纜車票優惠券\n・滑雪板請放在玄關旁的烘乾室（雪靴可以放進烘乾機）\n・雪場資訊 https://example.com'],
        ko:['스키장・리프트','・스키장까지 걸어서 5분\n・리프트권 할인권은 프런트에서 드립니다\n・스키・보드는 현관 옆 건조실에 두세요（부츠는 건조기에 넣을 수 있습니다）\n・스키장 정보 https://example.com'] }),
      S('🎿','レンタル','winter','・板・ブーツ・ウェア・ヘルメットを貸し出しています\n・前日の夜までにフロントへお申し付けください', {
        en:['Rentals','・We rent out skis, boards, boots, wear and helmets\n・Please ask at the front desk by the evening before'],
        'zh-Hans':['租借','・提供滑雪板、雪靴、滑雪服、头盔租借\n・请在前一天晚上之前告知前台'],
        'zh-Hant':['租借','・提供滑雪板、雪靴、滑雪服、安全帽租借\n・請在前一天晚上之前告知櫃台'],
        ko:['렌탈','・스키・보드・부츠・웨어・헬멧을 빌려 드립니다\n・전날 밤까지 프런트에 말씀해 주세요'] }),
      S('🥾','夏のあそび','summer','・トレッキング（初心者向けコースあり）\n・ラフティング・カヌー（予約制）\n・夜の星空観察（晴れた日の20時〜）\n・お申し込みはフロントへ', {
        en:['Summer Activities','・Trekking (beginner courses available)\n・Rafting and canoeing (reservation required)\n・Stargazing at night (from 20:00 on clear days)\n・Please sign up at the front desk'],
        'zh-Hans':['夏季活动','・徒步（有适合初学者的路线）\n・漂流・皮划艇（需预约）\n・夜间观星（晴天20:00起）\n・请在前台报名'],
        'zh-Hant':['夏季活動','・健行（有適合初學者的路線）\n・泛舟・獨木舟（需預約）\n・夜間觀星（晴天20:00起）\n・請在櫃台報名'],
        ko:['여름 액티비티','・트레킹（초보자 코스 있음）\n・래프팅・카누（예약제）\n・밤하늘 별 관찰（맑은 날 20시〜）\n・신청은 프런트에서 해 주세요'] }),
      S('🍜','周辺のお店','all','・〇〇食堂（そば・定食）　歩いて3分　地図:〇〇食堂\n・コンビニ　歩いて8分', {
        en:['Nearby Shops & Restaurants','・〇〇 Shokudo (soba, set meals)　3-minute walk　Map:〇〇食堂\n・Convenience store　8-minute walk'],
        'zh-Hans':['周边店铺','・〇〇食堂（荞麦面・套餐）　步行3分钟　地图:〇〇食堂\n・便利店　步行8分钟'],
        'zh-Hant':['周邊店家','・〇〇食堂（蕎麥麵・套餐）　步行3分鐘　地圖:〇〇食堂\n・便利商店　步行8分鐘'],
        ko:['주변 가게','・〇〇식당（소바・정식）　걸어서 3분　지도:〇〇食堂\n・편의점　걸어서 8분'] }),
      S('🚌','送迎・交通','all','・最寄り駅から送迎します（前日までにご予約ください）\n・バス停「〇〇」まで歩いて2分', {
        en:['Shuttle & Transport','・We offer pick-up from the nearest station (please book by the day before)\n・2-minute walk to the "〇〇" bus stop'],
        'zh-Hans':['接送・交通','・可从最近的车站接送（请在前一天之前预约）\n・步行2分钟到「〇〇」巴士站'],
        'zh-Hant':['接送・交通','・可從最近的車站接送（請在前一天之前預約）\n・步行2分鐘到「〇〇」公車站'],
        ko:['송영・교통','・가장 가까운 역에서 송영해 드립니다（전날까지 예약해 주세요）\n・「〇〇」 버스 정류장까지 걸어서 2분'] }),
      S('🚨','緊急のとき','all','・フロント（夜間もつながります）\n・消防・救急 119　警察 110\n・近くの病院　〇〇診療所 0000-00-0000', {
        en:['Emergencies','・Front desk (available at night too)\n・Fire / Ambulance 119　Police 110\n・Nearby clinic　〇〇 Clinic 0000-00-0000'],
        'zh-Hans':['紧急情况','・前台（夜间也能联系）\n・消防・急救 119　警察 110\n・附近的医院　〇〇诊所 0000-00-0000'],
        'zh-Hant':['緊急情況','・櫃台（夜間也能聯繫）\n・消防・救護 119　警察 110\n・附近的醫院　〇〇診所 0000-00-0000'],
        ko:['긴급 시','・프런트（야간에도 연결됩니다）\n・소방・구급 119　경찰 110\n・가까운 병원　〇〇진료소 0000-00-0000'] }),
    ] };
}
function anCleanTr(o, a, b, lim){
  const out={}; if(!o || typeof o!=='object') return out;
  for(const k of AN_LK){ const t=o[k]; if(!t || typeof t!=='object') continue;
    out[k]={ [a]:String(t[a]||'').slice(0,lim[0]), [b]:String(t[b]||'').slice(0,lim[1]), src:String(t.src||'').slice(0,20) }; }
  return out;
}
function anClean(o){
  const d=anDefault();
  if(!o || typeof o!=='object' || !Array.isArray(o.sections)) return d;
  return { v:1, name:String(o.name||'').slice(0,60), tagline:String(o.tagline||'').slice(0,120), tel:String(o.tel||'').slice(0,30),
    color:/^#[0-9a-f]{6}$/i.test(o.color)?o.color:d.color, url:String(o.url||'').slice(0,400), updated:String(o.updated||today()).slice(0,10),
    // v455 までのもの（langs なし）は、英・中・韓を出す
    langs:Array.isArray(o.langs) ? AN_LK.filter(k=>o.langs.includes(k)) : d.langs.slice(),
    tr:anCleanTr(o.tr,'name','tagline',[60,120]),
    sections:o.sections.filter(s=>s && typeof s==='object').slice(0,40).map(s=>({ id:typeof s.id==='string'?s.id:uid(), icon:String(s.icon||'ℹ').slice(0,4),
      title:String(s.title||'').slice(0,40), season:AN_SEASONS[s.season]?s.season:'all', body:String(s.body||'').slice(0,4000), open:!!s.open,
      tr:anCleanTr(s.tr,'title','body',[80,6000]) })) };
}
function anLoad(){ try{ an=anClean(JSON.parse(localStorage.getItem(AN_KEY)||'null')); }catch(_){ an=anDefault(); } }
function anSave(){ an.updated=today(); try{ localStorage.setItem(AN_KEY, JSON.stringify(an)); }catch(_){ toast('端末の空きが足りず、保存できませんでした'); } }

/* ── 本文を HTML に（1行ずつ。箇条書き・電話・リンク・地図）。lang は地図のボタンの言葉 ── */
function anLine(t, lang){
  let h=esc(t);
  const ml=(AN_UI[lang]||AN_UI.ja).map;
  h=h.replace(/(https?:\/\/[^\s<]+)/g, u=>`<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//,'').replace(/\/$/,'')}</a>`);
  h=h.replace(/(?:地図|地图|地圖|지도|แผนที่|[Mm]ap)[:：]\s*([^\s　<]+)/g, (m,q)=>`<a class="map" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(q.replace(/&amp;/g,'&'))}" target="_blank" rel="noopener">${ml}</a>`);
  h=h.replace(/(^|[^\d\-])(0\d{1,4}-\d{1,4}-\d{3,4}|1[01]9|110)(?![\d\-])/g, (m,p,n)=>`${p}<a class="tel" href="tel:${n.replace(/-/g,'')}">${n}</a>`);
  return h;
}
function anBodyHtml(body, lang){
  const lines=String(body||'').split('\n'), out=[]; let ul=false;
  for(const raw of lines){
    const t=raw.trim();
    if(!t){ if(ul){ out.push('</ul>'); ul=false; } continue; }
    if(/^[・\-•]/.test(t)){ if(!ul){ out.push('<ul>'); ul=true; } out.push('<li>'+anLine(t.replace(/^[・\-•]\s*/,''), lang)+'</li>'); }
    else { if(ul){ out.push('</ul>'); ul=false; } out.push('<p>'+anLine(t, lang)+'</p>'); }
  }
  if(ul) out.push('</ul>');
  return out.join('');
}

/* ── お客様が見るページ（1つの HTML。外のものは何も読まない） ──
   訳は .i18n の中に言語ごとに並べておき、選んだ言語のものだけ出す（訳がなければ日本語）。 */
function anPageHtml(d){
  d=d||an;
  const c=d.color, langs=['ja'].concat((d.langs||[]).filter(k=>AN_UI[k])), multi=langs.length>1;
  const tag=(el,cls,ja,trs,f)=>`<${el} class="i18n${cls?' '+cls:''}"><${el==='div'?'div':'span'} lang="ja">${f(ja,'ja')}</${el==='div'?'div':'span'}>`+
    langs.slice(1).filter(k=>trs[k]!=null && String(trs[k]).trim()!=='').map(k=>`<${el==='div'?'div':'span'} lang="${k}" hidden>${f(trs[k],k)}</${el==='div'?'div':'span'}>`).join('')+`</${el}>`;
  const pick=(o,f)=>{ const r={}; for(const k in (o||{})) r[k]=o[k][f]; return r; };
  const txt=s=>esc(s);
  const secs=d.sections.map(s=>`<details class="sec" data-s="${s.season}"${s.open?' open':''}><summary><span class="ic">${esc(s.icon)}</span>${tag('span','tt',s.title,pick(s.tr,'title'),txt)}${s.season!=='all'?`<span class="sz ${s.season}" data-k="${s.season==='winter'?'w':'s'}">${AN_SEASONS[s.season]}</span>`:''}</summary>${tag('div','bd',s.body,pick(s.tr,'body'),anBodyHtml)}</details>`).join('');
  const hasW=d.sections.some(s=>s.season==='winter'), hasS=d.sections.some(s=>s.season==='summer');
  const ui={}, gl={}; for(const k of langs){ ui[k]=AN_UI[k]; gl[k]=(anLang(k)||{}).g||k; }
  const js=JSON.stringify({ui, gl, langs, name:d.name, tn:pick(d.tr,'name')}).replace(/</g,'\\u003c');
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(d.name)}｜ご案内</title><meta name="theme-color" content="${c}">
<style>
:root{--c:${c};--bg:#f5f6f8;--card:#fff;--ink:#222;--sub:#6b7280;--line:#e3e6ea}
@media (prefers-color-scheme:dark){:root{--bg:#15171a;--card:#1f2226;--ink:#eceef1;--sub:#9aa1ab;--line:#30343a}}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP","Noto Sans SC","Noto Sans TC","Noto Sans KR",sans-serif;line-height:1.7;-webkit-text-size-adjust:100%}
header{position:relative;background:var(--c);color:#fff;padding:calc(18px + env(safe-area-inset-top)) 18px 16px}
header h1{margin:0;font-size:22px;line-height:1.35}header p{margin:4px 0 0;opacity:.92;font-size:14px}
${multi?'header h1,header p{padding-right:96px}':''}
.lang{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top));display:flex;align-items:center;gap:2px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.55);border-radius:18px;padding:0 4px 0 9px;height:34px;font-size:15px}
.lang select{appearance:none;-webkit-appearance:none;background:transparent;border:0;color:#fff;font-size:14px;font-weight:bold;padding:0 6px;height:32px;max-width:92px;font-family:inherit}
.lang select option{color:#222}
.call{display:inline-block;margin-top:10px;background:#fff;color:var(--c);font-weight:bold;text-decoration:none;border-radius:20px;padding:6px 14px;font-size:14px}
nav{position:sticky;top:0;z-index:2;display:flex;gap:6px;padding:10px 12px;background:var(--bg);border-bottom:1px solid var(--line)}
nav button{flex:1;min-width:0;height:38px;padding:0 4px;border-radius:19px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:14px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
nav button.on{background:var(--c);border-color:var(--c);color:#fff}
main{max-width:640px;margin:0 auto;padding:12px 12px calc(28px + env(safe-area-inset-bottom))}
.mt{background:#fff8e1;color:#5d4037;border-radius:12px;padding:9px 12px;margin:0 0 10px;font-size:13.5px;line-height:1.55}
.mt a{display:inline-block;margin-top:4px;font-weight:bold}
@media (prefers-color-scheme:dark){.mt{background:#3e3420;color:#ffe0a3}}
.sec{background:var(--card);border:1px solid var(--line);border-radius:14px;margin:0 0 10px;overflow:hidden}
summary{display:flex;align-items:center;gap:10px;padding:14px 14px;font-size:17px;font-weight:bold;cursor:pointer;list-style:none}
summary::-webkit-details-marker{display:none}summary::after{content:"＋";margin-left:auto;color:var(--sub);font-weight:normal}
details[open] summary::after{content:"−"}
.ic{font-size:22px;width:28px;text-align:center}.tt{flex:1;min-width:0}
.sz{font-size:11px;padding:1px 8px;border-radius:10px;color:#fff;font-weight:bold;white-space:nowrap}.sz.winter{background:#1e88e5}.sz.summer{background:#43a047}
.bd{padding:0 16px 14px 16px;font-size:15.5px;overflow-wrap:anywhere}.bd p{margin:4px 0}.bd ul{margin:4px 0;padding-left:1.2em}.bd li{margin:3px 0}
a{color:var(--c)}@media (prefers-color-scheme:dark){a{color:#8ab4f8}}
a.tel,a.map{font-weight:bold}
footer{text-align:center;color:var(--sub);font-size:12px;padding:8px 0 20px}
</style></head><body>
<header>${multi?`<label class="lang" aria-label="Language">🌐<select id="lang">${langs.map(k=>`<option value="${k}">${k==='ja'?'日本語':esc(anLang(k).n)}</option>`).join('')}</select></label>`:''}
<h1>${tag('span','',d.name,pick(d.tr,'name'),txt)}</h1>${d.tagline?`<p>${tag('span','',d.tagline,pick(d.tr,'tagline'),txt)}</p>`:''}${d.tel?`<a class="call" href="tel:${esc(d.tel.replace(/[^\d+]/g,''))}">☎ <span data-k="call">フロントに電話</span> ${esc(d.tel)}</a>`:''}</header>
${hasW||hasS?`<nav id="nav"><button data-v="now" data-k="now">今の季節</button>${hasW?'<button data-v="winter" data-k="nw">❄ 冬</button>':''}${hasS?'<button data-v="summer" data-k="ns">☀ 夏</button>':''}<button data-v="all" data-k="all">全部</button></nav>`:''}
<main id="main">${multi?'<div class="mt" id="mt" hidden><span data-k="mt"></span><br><a id="mtA" target="_blank" rel="noopener" data-k="mtb"></a></div>':''}${secs}</main>
<footer><span data-k="upd">最終更新</span> ${esc(d.updated)}</footer>
<script>
(function(){var m=new Date().getMonth()+1,now=(m>=12||m<=4)?'winter':'summer';
function show(v){var s=v==='now'?now:v;[].forEach.call(document.querySelectorAll('.sec'),function(e){var x=e.getAttribute('data-s');e.hidden=!(s==='all'||x==='all'||x===s);});
[].forEach.call(document.querySelectorAll('nav button'),function(b){b.className=b.getAttribute('data-v')===v?'on':'';});}
var n=document.getElementById('nav');if(n){n.addEventListener('click',function(e){var b=e.target.closest('button');if(b)show(b.getAttribute('data-v'));});show('now');}
var D=${js};
function setLang(l){if(D.langs.indexOf(l)<0)l='ja';var fb=false;document.documentElement.lang=l;
[].forEach.call(document.querySelectorAll('.i18n'),function(u){var c=u.children,has=null,ja=null,i;for(i=0;i<c.length;i++){if(c[i].lang===l)has=c[i];if(c[i].lang==='ja')ja=c[i];}
var on=has||ja;if(!has&&l!=='ja'&&!u.closest('h1'))fb=true;for(i=0;i<c.length;i++)c[i].hidden=c[i]!==on;});
var U=D.ui[l]||D.ui.ja;[].forEach.call(document.querySelectorAll('[data-k]'),function(e){var t=U[e.getAttribute('data-k')];if(t!=null)e.textContent=t;});
document.title=((D.tn[l]||'').trim()||D.name)+'｜'+U.guide;
var mt=document.getElementById('mt');if(mt){var a=document.getElementById('mtA'),web=/^https?:$/.test(location.protocol);mt.hidden=!(fb&&l!=='ja');
if(web)a.href='https://translate.google.com/translate?sl=ja&tl='+encodeURIComponent(D.gl[l]||'en')+'&u='+encodeURIComponent(location.href);a.hidden=!web;}
var sel=document.getElementById('lang');if(sel)sel.value=l;}
function first(){try{var s=localStorage.getItem('annai_lang');if(s&&D.langs.indexOf(s)>=0)return s;}catch(e){}
var nl=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'ja'];
for(var i=0;i<nl.length;i++){var x=String(nl[i]).toLowerCase(),c=x.indexOf('ja')===0?'ja':/^zh-(tw|hk|mo|hant)/.test(x)?'zh-Hant':x.indexOf('zh')===0?'zh-Hans':x.indexOf('ko')===0?'ko':x.indexOf('th')===0?'th':x.indexOf('en')===0?'en':'';
if(c&&D.langs.indexOf(c)>=0)return c;}
return String(nl[0]).toLowerCase().indexOf('ja')===0||D.langs.indexOf('en')<0?'ja':'en';}
var sel=document.getElementById('lang');if(sel)sel.addEventListener('change',function(){try{localStorage.setItem('annai_lang',sel.value);}catch(e){}setLang(sel.value);});
setLang(D.langs.length>1?first():'ja');window.setAnnaiLang=setLang;})();
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
.an-lgs{ display:flex; gap:3px; margin-top:3px; flex-wrap:wrap; }
.an-lgs i{ font-style:normal; font-size:10.5px; font-weight:bold; padding:0 5px; border-radius:6px; background:rgba(120,132,156,.16); color:var(--text-light,#999); }
.an-lgs i.ok{ background:rgba(46,125,50,.16); color:#2e7d32; } .an-lgs i.old{ background:rgba(239,108,0,.18); color:#e65100; }
body.dark .an-lgs i.ok{ color:#81c784; } body.dark .an-lgs i.old{ color:#ffb74d; }
.an-chips{ display:flex; flex-wrap:wrap; gap:6px; margin:6px 0; }
.an-chips button{ height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13.5px; font-weight:bold; cursor:pointer; }
.an-chips button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.an-seg.lg{ flex-wrap:wrap; } .an-seg.lg button{ flex:1 1 auto; min-width:64px; padding:0 8px; font-size:13px; }
.an-ja{ font-size:12.5px; line-height:1.6; white-space:pre-wrap; background:rgba(120,132,156,.10); border-radius:8px; padding:6px 9px; margin:4px 0; max-height:120px; overflow:auto; color:var(--text,#333); }
.an-mini{ display:inline-block; margin-left:6px; height:28px; padding:0 10px; border-radius:14px; border:1px solid var(--acc); background:transparent; color:var(--acc); font-size:12.5px; font-weight:bold; cursor:pointer; vertical-align:middle; }
.an-steps{ margin:4px 0 8px; padding-left:1.5em; font-size:14px; line-height:1.7; } .an-steps li{ margin:5px 0; }
.an-steps a{ color:var(--acc); font-weight:bold; overflow-wrap:anywhere; }
.an-h{ font-size:15px; font-weight:bold; margin:14px 0 4px; }
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
    <div class="modal-header"><span>🏨 お客様向け案内ページ</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button id="anHelpBtn" class="hdr-btn" onclick="anHelp()" title="ヘルプ">❓ ヘルプ</button>
      <button class="modal-close" onclick="closeAnnai()" aria-label="閉じる">✕</button></span></div>
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
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openAnnai(){ anEnsureDom(); anLoad(); openDlg('annaiOverlay'); anRender(); }
function closeAnnai(){ if(!isDlgOpen('annaiOverlay')) return; if(isDlgOpen('anHelpOverlay')) anCloseHelp(); anCloseEd(); anClosePv(); closeDlg('annaiOverlay'); }

function anRender(){
  const b=$('anBody'), st=b.scrollTop;
  b.innerHTML=`
    <div class="an-note">はじめての方は、右上の <b>❓ヘルプ</b> に、作り方と Netlify（ページを置く場所）の開設・置き方がまとめてあります。<br>お客様が客室の QR コードをスマホで読むと見られる案内ページを作ります。下の項目を自分の宿のことに書きかえて、<b>📱 見え方</b>でたしかめ、<b>⬇ 書き出す</b>でページのファイルを作ります。</div>
    <div class="an-sec">宿のこと</div>
    <label class="an-f">宿の名前<input id="anName" maxlength="60" value="${esc(an.name)}" onchange="anSetTop('name',this.value)"></label>
    <label class="an-f">ひとこと（名前の下に出ます）<input id="anTag" maxlength="120" value="${esc(an.tagline)}" onchange="anSetTop('tagline',this.value)"></label>
    <div class="an-row"><label class="an-f">フロントの電話（押すとかけられます）<input id="anTel" type="tel" maxlength="30" value="${esc(an.tel)}" onchange="anSetTop('tel',this.value)" placeholder="例：0260-00-0000"></label>
      <label class="an-f an-col">色<input id="anColor" type="color" value="${esc(an.color)}" onchange="anSetTop('color',this.value)" style="padding:2px"></label></div>
    <div class="an-sec">項目（上から順に出ます）</div>
    ${an.sections.map((s,i)=>`<div class="an-item" onclick="anEdit('${s.id}')"><span class="ic">${esc(s.icon)}</span>
      <span class="tt">${esc(s.title||'（見出しなし）')}<small>${esc(String(s.body).split('\n')[0]||'')}</small>${an.langs.length?`<span class="an-lgs">${an.langs.map(k=>{ const st=anTrState(s,k); return `<i class="${st}" title="${esc(anLang(k).j)}：${st==='ok'?'訳あり':st==='old'?'日本語が直されています':'訳なし'}">${esc(anLang(k).s)}${st==='old'?'⚠':''}</i>`; }).join('')}</span>`:''}</span>
      <span class="sz ${s.season}">${AN_SEASONS[s.season]}</span>
      <button onclick="event.stopPropagation();anMove('${s.id}',-1)" ${i===0?'disabled':''} aria-label="上へ">↑</button><button onclick="event.stopPropagation();anMove('${s.id}',1)" ${i===an.sections.length-1?'disabled':''} aria-label="下へ">↓</button></div>`).join('')}
    <button class="an-btn sub" onclick="anEdit(null)">＋ 項目を足す</button>
    <div class="an-note">本文は1行ずつ書きます。「<b>・</b>」で始めると箇条書き、<b>電話番号</b>（0260-00-0000）は押すとかけられ、<b>https://</b> で始まるアドレスは押すと開き、「<b>地図:〇〇</b>」は地図で〇〇をさがすボタンになります。<br>冬・夏の項目は、お客様のページで<b>いまの季節のものだけ</b>先に出ます（12〜4月は冬、5〜11月は夏。ボタンで切りかえられます）。</div>
    <div class="an-sec">🌐 外国語で見られるようにする</div>
    <div class="an-note">お客様のページの右上に <b>🌐 言語の切りかえ</b> が出ます。お客様のスマホの言語に合わせて、はじめから切りかわります。<br>
      訳は項目ごとに入れます（項目を押して、上の言語を選ぶ。<b>🔤 Google 翻訳</b>のボタンで下書きを作れます）。上の項目の <b>EN 简 繁 한</b> は、緑＝訳あり、<b>⚠</b>＝日本語を直したので訳も直す、灰色＝訳なし。訳のない項目は日本語のまま出て、ページに「Google で自動翻訳」のボタンが出ます。</div>
    <div class="an-chips" id="anLangs">${AN_LANGS.map(l=>`<button type="button" class="${an.langs.includes(l.k)?'on':''}" onclick="anToggleLang('${l.k}')">${an.langs.includes(l.k)?'✓ ':''}${esc(l.j)}</button>`).join('')}</div>
    ${an.langs.length?`<button class="an-btn sub" onclick="anTopTr()">🌐 宿の名前・ひとことの訳${an.langs.some(k=>anTopState(k)==='old')?' ⚠':''}</button>`:''}
    <div class="an-sec">たしかめる・書き出す</div>
    <button class="an-btn" onclick="anPreview()">📱 お客様のスマホでの見え方</button>
    <button class="an-btn sub" onclick="anExportHtml()">⬇ ページを書き出す（index.html）</button>
    <button class="an-btn sub" onclick="anHelp('anh-nf')">❓ Netlify の開設・置き方・設定（ヘルプ）</button>
    <div class="an-note">書き出した <b>index.html</b> を Netlify に置くと、お客様が見られるアドレスになります。項目を直したら、書き出して置き直してください。<br>
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
  if(k==='tagline' && an.langs.length && $('anBody')) anRender();   // ひとことの訳の ⚠ を出しなおす
}
function anMove(id,dir){ const i=an.sections.findIndex(s=>s.id===id), j=i+dir; if(i<0||j<0||j>=an.sections.length) return; [an.sections[i],an.sections[j]]=[an.sections[j],an.sections[i]]; anSave(); anRender(); }

/* 項目を直す。言語を切りかえると、見出しと本文をその言語の訳に入れかえる（しるし・季節は共通） */
let anEdW=null, anEdL='ja';
function anEdit(id){
  const s=id ? an.sections.find(x=>x.id===id) : {id:'', icon:'ℹ', title:'', season:'all', body:'', open:false, tr:{}};
  if(!s) return;
  anEdId=id; anEdL='ja';
  anEdW={ ja:{title:s.title, body:s.body} };
  for(const k of AN_LK){ const t=(s.tr||{})[k]||{title:'', body:'', src:''}; anEdW[k]={ title:t.title, body:t.body, src:t.src, t0:t.title+'\u0001'+t.body, ok:false }; }
  $('anEdHdr').textContent=id?'項目を直す':'項目を足す';
  $('anEdBody').innerHTML=`
    ${an.langs.length?`<div class="an-f">言語<div class="an-seg lg" id="anELang">${['ja'].concat(an.langs).map(k=>`<button type="button" data-l="${k}" class="${k==='ja'?'on':''}" onclick="anEdLang('${k}')">${k==='ja'?'日本語':esc(anLang(k).n)}${k!=='ja'&&anTrState(s,k)==='old'?' ⚠':''}</button>`).join('')}</div></div>`:''}
    <div id="anETxt"></div>
    <div class="an-f">しるし<div class="an-icons" id="anEIcons">${AN_ICONS.map(ic=>`<button type="button" class="${ic===s.icon?'on':''}" onclick="document.querySelectorAll('#anEIcons button').forEach(x=>x.classList.toggle('on',x===this))">${ic}</button>`).join('')}</div></div>
    <div class="an-f">出す季節<div class="an-seg" id="anESeason">${Object.entries(AN_SEASONS).map(([k,l])=>`<button type="button" data-s="${k}" class="${k===s.season?'on':''}" onclick="document.querySelectorAll('#anESeason button').forEach(x=>x.classList.toggle('on',x===this))">${k==='winter'?'❄ ':k==='summer'?'☀ ':''}${l}</button>`).join('')}</div></div>
    <label class="an-f" style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text,#333)"><input type="checkbox" id="anEOpen" style="width:22px;min-height:22px;margin:0"${s.open?' checked':''}> はじめから開いておく（大事な項目に）</label>
    <button class="an-btn" onclick="anEdSave()">保存する</button>
    ${id?'<button class="an-btn del" onclick="anEdDelete()">🗑 この項目を消す</button>':''}
    <button class="an-btn sub" onclick="anCloseEd()">やめる</button>`;
  anEdTxt();
  openDlg('anEdOverlay', ()=>{ anEdId=null; });
  if(!id) setTimeout(()=>{ const e=$('anETitle'); if(e) e.focus(); }, 60);
}
function anEdTxt(){
  const k=anEdL, w=anEdW[k], ja=anEdW.ja, box=$('anETxt');
  if(k==='ja'){
    box.innerHTML=`<label class="an-f">見出し<input id="anETitle" maxlength="40" value="${esc(w.title)}" placeholder="例：お風呂・ゲレンデ・周辺のお店"></label>
    <label class="an-f">本文（1行ずつ。「・」で箇条書き）<textarea id="anEBody" maxlength="4000">${esc(w.body)}</textarea></label>`;
    return;
  }
  const L=anLang(k), stale=!w.ok && w.src && (w.title||w.body) && w.src!==anSig(ja.title.trim()+'\u0001'+ja.body);
  box.innerHTML=`<div class="an-f">日本語（訳のもと）<div class="an-ja">${esc(ja.title)}${ja.body?'\n'+esc(ja.body):''}</div></div>
    ${stale?`<div class="an-warn">⚠ 日本語が直されています。この訳も合わせて直してください。<button type="button" class="an-mini" onclick="anEdOk()">訳はこのままでよい</button></div>`:''}
    <div class="an-f">見出し（${esc(L.j)}）<button type="button" class="an-mini" onclick="anGTSec('title')">🔤 Google 翻訳</button><input id="anETitle" maxlength="80" value="${esc(w.title)}" placeholder="${esc(ja.title)}" lang="${k}"></div>
    <div class="an-f">本文（${esc(L.j)}）<button type="button" class="an-mini" onclick="anGTSec('body')">🔤 Google 翻訳</button><textarea id="anEBody" maxlength="6000" lang="${k}" placeholder="空のままなら、お客様のページには日本語が出ます">${esc(w.body)}</textarea></div>
    <div class="an-note">🔤 を押すと Google 翻訳が開きます。訳をコピーして、ここに貼ってください。「・」の箇条書きや電話番号・https:// はそのまま使えます。「地図:」の後ろのお店の名前は<b>日本語のまま</b>にしておくと、地図でさがせます。</div>`;
}
function anEdStash(){ const w=anEdW[anEdL], t=$('anETitle'), b=$('anEBody'); if(t) w.title=t.value; if(b) w.body=b.value; }
function anEdLang(k){
  anEdStash(); anEdL=k;
  document.querySelectorAll('#anELang button').forEach(x=>x.classList.toggle('on', x.dataset.l===k));
  anEdTxt();
}
function anEdOk(){ anEdStash(); anEdW[anEdL].ok=true; anEdTxt(); }
/* Google 翻訳を開く（訳の下書き用。訳した文はコピーして貼ってもらう） */
function anGT(k, text){
  text=String(text||'').trim();
  if(!text){ toast('先に日本語を入れてください'); return; }
  if(text.length>1500){ text=text.slice(0,1500); toast('長いので、はじめの1500文字だけ訳します', 3000); }
  window.open('https://translate.google.com/?sl=ja&tl='+encodeURIComponent((anLang(k)||{}).g||'en')+'&text='+encodeURIComponent(text)+'&op=translate', '_blank', 'noopener');
}
function anGTSec(f){ anEdStash(); anGT(anEdL, anEdW.ja[f]); }
function anEdSave(){
  anEdStash();
  const ja=anEdW.ja, title=ja.title.trim();
  if(!title){ toast('日本語の見出しを入れてください'); if(anEdL!=='ja') anEdLang('ja'); $('anETitle').focus(); return; }
  const sg=anSig(title+'\u0001'+ja.body), tr={};
  for(const k of AN_LK){
    const w=anEdW[k], t=w.title.trim();
    if(!t && !w.body.trim()) continue;
    const changed=(w.title+'\u0001'+w.body)!==w.t0;
    tr[k]={ title:t, body:w.body, src:(changed||w.ok||!w.src)?sg:w.src };
  }
  const s={ id:anEdId||uid(), title, icon:(document.querySelector('#anEIcons button.on')||{}).textContent||'ℹ',
    season:(document.querySelector('#anESeason button.on')||{}).dataset?.s||'all', body:ja.body, open:$('anEOpen').checked, tr };
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

/* 出す言語を選ぶ */
function anToggleLang(k){
  if(!anLang(k)) return;
  an.langs=an.langs.includes(k) ? an.langs.filter(x=>x!==k) : AN_LK.filter(x=>x===k || an.langs.includes(x));
  anSave(); anRender();
}
/* 宿の名前・ひとことの訳 */
let anTopOk={};
function anTopTr(){
  anTopOk={};
  $('anPvHdr').textContent='🌐 宿の名前・ひとことの訳';
  $('anPvBody').innerHTML=`<div class="an-note">名前は、ローマ字やその国での呼び方を入れます（空のままなら日本語の名前が出ます）。ひとことは 🔤 で Google 翻訳が開くので、訳をコピーして貼ってください。</div>
    <div class="an-f">日本語<div class="an-ja">${esc(an.name)}${an.tagline?'\n'+esc(an.tagline):''}</div></div>
    ${an.langs.map(k=>{ const L=anLang(k), t=(an.tr||{})[k]||{}; return `<div class="an-h">${esc(L.j)}</div>
      <div id="anTW_${k}">${anTopState(k)==='old'?`<div class="an-warn">⚠ 日本語のひとことが直されています。訳も合わせて直してください。<button type="button" class="an-mini" onclick="anTopMarkOk('${k}');this.parentNode.remove()">このままでよい</button></div>`:''}</div>
      <label class="an-f">名前<input id="anTN_${k}" maxlength="60" value="${esc(t.name||'')}" placeholder="${esc(an.name)}" lang="${k}"></label>
      <div class="an-f">ひとこと<button type="button" class="an-mini" onclick="anGT('${k}', anState().tagline)">🔤 Google 翻訳</button><input id="anTT_${k}" maxlength="120" value="${esc(t.tagline||'')}" placeholder="${esc(an.tagline)}" lang="${k}"></div>`; }).join('')}
    <button class="an-btn" onclick="anTopTrSave()">保存する</button>`;
  openDlg('anPvOverlay');
}
function anTopMarkOk(k){ anTopOk[k]=1; }
function anTopTrSave(){
  an.tr=an.tr||{};
  for(const k of an.langs){
    const n=($('anTN_'+k)||{}).value, tg=($('anTT_'+k)||{}).value; if(n==null || tg==null) continue;
    const old=an.tr[k]||{name:'', tagline:'', src:''}, name=n.trim(), tagline=tg.trim();
    if(!name && !tagline){ delete an.tr[k]; continue; }
    const changed=name!==old.name || tagline!==old.tagline;
    an.tr[k]={ name, tagline, src:(changed||anTopOk[k]||!old.src)?anSig(an.tagline):old.src };
  }
  anSave(); anClosePv(); anRender(); toast('保存しました');
}

/* ── ❓ ヘルプ（v457） ──
   案内ページの作り方と、Netlify の開設（アカウントを作る）・置き方・設定を、目次から読めるようにまとめる。
   Netlify の画面は写真を撮れないので、ボタンの名前と並びを絵（.nf-mock）でまねして見せる。 */
const AN_HELP_TOC=[
  ['anh-flow','🗺 全体の流れ'], ['anh-write','✏ 項目の書き方'], ['anh-lang','🌐 外国語'],
  ['anh-nf','☁ Netlify とは'], ['anh-signup','🆕 アカウントを作る'], ['anh-first','⬆ はじめて置く'],
  ['anh-name','🏷 アドレスの名前'], ['anh-update','🔁 直したとき'], ['anh-qr','🔳 QR コード'],
  ['anh-more','⚙ 設定いろいろ'], ['anh-phone','📱 スマホだけで'], ['anh-trouble','🆘 困ったとき'], ['anh-safe','🔒 大事なこと'],
];
const nfBar=u=>`<div class="nf-bar">🔒 ${u}</div>`;
const nfN=n=>`<i class="an-n">${n}</i>`;
function anHelpHtml(){
  return `<div class="anh-toc">${AN_HELP_TOC.map(([id,t])=>`<button type="button" onclick="anHelpJump('${id}')">${t}</button>`).join('')}</div>

<section id="anh-flow"><h4>🗺 全体の流れ</h4>
<ol class="an-steps">
  <li>見本の項目を、<b>自分の宿のこと</b>に書きかえます（宿の名前・電話・お風呂・Wi-Fi など）。</li>
  <li>外国のお客様が来るなら、<b>🌐 外国語</b>の訳を入れます（入れなくても使えます）。</li>
  <li><b>📱 見え方</b>で、お客様のスマホでどう見えるかをたしかめます。</li>
  <li><b>⬇ ページを書き出す</b>で、<b>index.html</b> という1つのファイルを作ります。</li>
  <li>そのファイルを <b>Netlify</b>（無料でホームページを置ける場所）に置くと、<b>https://〇〇.netlify.app</b> のアドレスができます。</li>
  <li>アドレスを入れて <b>🔳 QR コード</b>のカードを印刷し、客室やフロントに置きます。</li>
  <li>あとで内容が変わったら、書き出して Netlify に<b>置き直す</b>だけです。QR コードはそのまま使えます。</li>
</ol>
<div class="an-note">Netlify を使うのがはじめてなら、<a onclick="anHelpJump('anh-nf')">☁ Netlify とは</a> → <a onclick="anHelpJump('anh-signup')">🆕 アカウントを作る</a> → <a onclick="anHelpJump('anh-first')">⬆ はじめて置く</a> の順に読んでください。</div>
</section>

<section id="anh-write"><h4>✏ 項目の書き方</h4>
<ul class="an-steps">
  <li>項目を押すと直せます。<b>↑↓</b> で並びを変え、<b>＋ 項目を足す</b> で増やせます。</li>
  <li>本文は<b>1行ずつ</b>書きます。「<b>・</b>」で始めると箇条書きになります。</li>
  <li><b>電話番号</b>（0260-00-0000 のように - を入れる）と 110・119 は、押すと電話をかけられます。</li>
  <li><b>https://</b> で始まるアドレスは、押すとそのページが開きます。</li>
  <li>「<b>地図:〇〇食堂</b>」と書くと、押すと地図アプリで〇〇食堂をさがすボタンになります。</li>
  <li><b>出す季節</b>を「冬」「夏」にすると、お客様のページではその季節（冬＝12〜4月、夏＝5〜11月）に先に出ます。</li>
  <li><b>はじめから開いておく</b>にすると、ページを開いたときに中身が見えています（チェックインの時間など大事なものに）。</li>
</ul>
</section>

<section id="anh-lang"><h4>🌐 外国語</h4>
<ol class="an-steps">
  <li>「🌐 外国語で見られるようにする」で、出す言語を選びます（英語・中国語の簡体字と繁体字・韓国語・タイ語）。</li>
  <li>項目を押して、上の <b>English</b> などを押すと、その言語の見出しと本文を入れる欄になります。</li>
  <li><b>🔤 Google 翻訳</b>を押すと、日本語を訳した画面が開きます。訳をコピーして、欄に貼ります。</li>
  <li>「宿の名前・ひとことの訳」で、名前をローマ字などにできます（空なら日本語の名前が出ます）。</li>
</ol>
<div class="an-note">お客様のページは、スマホの言語に合わせて自動で切りかわります。右上の <b>🌐</b> でも選べます。訳のない項目は日本語で出て、「Google で自動翻訳」のボタンが出ます。日本語を直すと、古くなった訳に <b>⚠</b> が付きます。</div>
</section>

<section id="anh-nf"><h4>☁ Netlify とは</h4>
<div class="an-note" style="font-size:13.5px;color:inherit">Netlify（ネットリファイ）は、ホームページを<b>無料</b>で置けるアメリカの会社のサービスです。画面は英語ですが、使うボタンは少しだけです。</div>
<ul class="an-steps">
  <li>いるもの：<b>メールアドレス</b>だけ。クレジットカードはいりません。</li>
  <li>料金：案内ページくらいなら<b>無料のまま</b>で足ります。「Upgrade」などお金のかかるボタンは押さなくてだいじょうぶです。</li>
  <li>パソコンでするのがかんたんです（<a onclick="anHelpJump('anh-phone')">スマホだけでも</a>できます）。</li>
  <li>表電卓を Netlify に置いているなら、<b>同じアカウント</b>を使えます。ただし<b>案内ページは別のプロジェクト（サイト）</b>にします。</li>
</ul>
<div class="an-warn">表電卓のプロジェクトに案内ページを置くと、<b>表電卓が案内ページに入れかわってしまいます</b>。案内ページは、かならず新しいプロジェクトにしてください。</div>
</section>

<section id="anh-signup"><h4>🆕 アカウントを作る（開設。1回だけ）</h4>
<div class="an-note">もう Netlify のアカウントがある人は、<a onclick="anHelpJump('anh-first')">⬆ はじめて置く</a> へ進んでください。</div>
<div class="nf-mock">${nfBar('app.netlify.com/signup')}<div class="nf-in" style="text-align:center">
  <div style="font-size:15px;font-weight:bold;margin:2px 0 8px">Sign up</div>
  <div class="nf-wide">GitHub</div><div class="nf-wide">GitLab</div><div class="nf-wide">Bitbucket</div>
  <div class="nf-wide nf-hl">${nfN(2)}Sign up with Email</div></div></div>
<ol class="an-steps">
  <li><a href="https://app.netlify.com/signup" target="_blank" rel="noopener">app.netlify.com/signup</a> を開きます。</li>
  <li><b>Sign up with Email</b>（メールで作る）を押します。GitHub などのアカウントを持っている人は、そのボタンでも作れます。</li>
  <li><b>メールアドレス</b>と、新しく決めた<b>パスワード</b>を入れて <b>Sign up</b> を押します。パスワードは紙などに控えておきます。</li>
  <li>Netlify からメールが届きます。メールの中の <b>Verify email</b>（メールをたしかめる）を押します。</li>
  <li>はじめに「どんな仕事か」「何に使うか」などの質問が出ることがあります。あてはまるものを選ぶか、<b>Skip</b>・<b>Continue</b> で進みます。料金の画面が出たら <b>Free</b>（無料）を選びます。</li>
  <li>「Projects」（プロジェクトの一覧）の画面が出たら、できあがりです。</li>
</ol>
<div class="an-note">メールが届かないときは、迷惑メールのフォルダも見てください。</div>
</section>

<section id="anh-first"><h4>⬆ はじめて置く（1回だけ）</h4>
<ol class="an-steps">
  <li>案内ページの <b>⬇ ページを書き出す</b> を押して、<b>index.html</b> を保存します。</li>
  <li><a href="https://app.netlify.com/" target="_blank" rel="noopener">app.netlify.com</a> を開いて、ログインします（<b>Log in</b>）。</li>
  <li>Projects の画面で <b>Add new project</b> を押し、出てきた中から <b>Deploy manually</b>（手で置く）を押します。</li>
</ol>
<div class="nf-mock">${nfBar('app.netlify.com/teams/〇〇/projects')}<div class="nf-in">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>Projects</b><span class="nf-btn nf-hl">${nfN(3)}Add new project ▾</span></div>
  <div class="nf-menu"><div>Import an existing project</div><div>Start from a template</div><div class="nf-hl">Deploy manually</div></div></div></div>
<ol class="an-steps" start="4">
  <li>点線の枠が出ます。<b>index.html</b> をマウスで引っぱって、枠の中に落とします。スマホは枠の中の <b>browse to upload</b> を押して index.html を選びます。</li>
</ol>
<div class="nf-mock">${nfBar('app.netlify.com › Deploy manually')}<div class="nf-in"><div class="nf-drop nf-hl">${nfN(4)}Drag and drop your project output folder here.<br>Or, <u>browse to upload</u>.<div style="margin-top:6px;font-size:18px">📄 index.html</div></div></div></div>
<ol class="an-steps" start="5">
  <li>数秒で、案内ページの画面（<b>Project overview</b>）になり、<b>https://〇〇〇.netlify.app</b> のアドレスが出ます。押すと、お客様が見るページが開きます。</li>
</ol>
<div class="nf-mock">${nfBar('app.netlify.com/projects/〇〇〇/overview')}<div class="nf-in">
  <div style="font-size:14px;font-weight:bold">glittering-cupcake-1a2b3c</div>
  <div class="nf-hl" style="display:inline-block;margin:4px 0;color:#0b7a78">${nfN(5)}https://glittering-cupcake-1a2b3c.netlify.app</div>
  <div class="nf-tabs"><span>Project overview</span><span>Deploys</span><span>…</span><span>Project configuration</span></div></div></div>
<div class="an-note">はじめのアドレスは、でたらめな英語の名前です。QR コードを印刷する前に、<a onclick="anHelpJump('anh-name')">🏷 アドレスの名前</a>をわかりやすく変えておきます。</div>
</section>

<section id="anh-name"><h4>🏷 アドレスの名前を変える</h4>
<ol class="an-steps">
  <li>案内ページのプロジェクトを開いて、<b>Project configuration</b>（プロジェクトの設定）を押します。</li>
  <li><b>General</b> → <b>Project details</b> の <b>Change project name</b> を押します。</li>
  <li>新しい名前を入れて <b>Save</b> を押します。使える文字は<b>英語の小文字・数字・ -（ハイフン）</b>です。</li>
</ol>
<div class="nf-mock">${nfBar('Project configuration › General')}<div class="nf-in">
  <b>Project details</b><div style="margin:6px 0 4px">Project name: glittering-cupcake-1a2b3c</div>
  <span class="nf-btn nf-ghost nf-hl">${nfN(2)}Change project name</span>
  <div class="nf-field">shirakaba-annai<span style="color:#888">.netlify.app</span></div><span class="nf-btn">Save</span></div></div>
<div class="an-note">例：<b>shirakaba-annai</b> にすると、アドレスは <b>https://shirakaba-annai.netlify.app</b> になります。ほかの人が使っている名前はえらべません（そのときは「-yuzawa」などを足します）。<br>
<b>名前を変えると前のアドレスは使えなくなります。</b>QR コードを印刷したあとに変えたら、新しいアドレスで刷り直してください。</div>
</section>

<section id="anh-update"><h4>🔁 項目を直したとき（置き直す）</h4>
<ol class="an-steps">
  <li>案内ページで項目を直して、<b>⬇ ページを書き出す</b> で新しい index.html を作ります。</li>
  <li>Netlify で案内ページのプロジェクトを開いて、<b>Deploys</b> を押します。</li>
  <li>下のほうの点線の枠に、新しい <b>index.html</b> を落とします（スマホは browse to upload）。</li>
</ol>
<div class="nf-mock">${nfBar('app.netlify.com/projects/shirakaba-annai/deploys')}<div class="nf-in">
  <div class="nf-tabs"><span>Project overview</span><span class="nf-hl">${nfN(2)}Deploys</span><span>…</span></div>
  <div class="nf-row">Published　Production: … 3 days ago</div>
  <div class="nf-drop nf-hl">${nfN(3)}Need to update your project?<br>Drag and drop your project output folder here</div></div></div>
<div class="an-note">数秒で新しい内容になります。<b>アドレスは変わらないので、QR コードは刷り直さなくてだいじょうぶ</b>です。お客様のスマホに古いものが出るときは、ページを下に引っぱって読み直してもらいます。<br>
書き出したファイルが「index (1).html」のような名前になっていたら、<b>index.html</b> に名前を直してから置きます。</div>
</section>

<section id="anh-qr"><h4>🔳 QR コードとカード</h4>
<ol class="an-steps">
  <li>案内ページの「<b>ページを置いたアドレス</b>」に、Netlify のアドレス（https://〇〇.netlify.app）を入れます。</li>
  <li><b>🔳 QR コードを出す・印刷する</b> を押します。</li>
  <li>自分のスマホのカメラで QR コードを読んで、案内ページが開くかたしかめます。</li>
  <li><b>🖨 カードを印刷</b>で、A4 の紙に4枚のカードを印刷します。切って客室・フロント・食事処などに置きます。</li>
</ol>
</section>

<section id="anh-more"><h4>⚙ Netlify の設定いろいろ</h4>
<div class="an-h">前の内容に戻したい</div>
<ol class="an-steps">
  <li>プロジェクトの <b>Deploys</b> を押すと、今まで置いたものが新しい順に並んでいます。</li>
  <li>戻したいもの（日時を見て）を押して、<b>Publish deploy</b> を押します。すぐにその内容に戻ります。</li>
</ol>
<div class="an-h">案内ページをやめる（消す）</div>
<ol class="an-steps">
  <li>プロジェクトの <b>Project configuration</b> → <b>General</b> を開き、いちばん下の <b>Delete project</b> を押します。</li>
  <li>たしかめる画面が出たら、書いてあるとおりに入れて（プロジェクトの名前など）消します。<b>アドレスも QR コードも使えなくなります</b>（元に戻せません）。</li>
</ol>
<div class="an-h">〇〇.jp のような自分のアドレスにしたい</div>
<div class="an-note" style="font-size:13.5px">ドメイン（〇〇.jp など）を別に買って、<b>Domain management</b> → <b>Add a domain</b> から設定します。ドメインは年に千〜数千円かかり、設定も少しむずかしいので、ふつうは <b>〇〇.netlify.app</b> のままで十分です。</div>
<div class="an-h">パスワードを忘れた</div>
<div class="an-note" style="font-size:13.5px">ログインの画面の <b>Forgot password?</b> を押して、メールアドレスを入れます。届いたメールから新しいパスワードを決めます。</div>
<div class="an-h">作りかけを残す・別の端末で続ける</div>
<div class="an-note" style="font-size:13.5px">案内ページの <b>💾 作りかけを保存（.json）</b> で保存しておくと、別のスマホやパソコンの表電卓で <b>📂 保存したものを開く</b> から続きを作れます。📋リストのバックアップにも入ります。</div>
</section>

<section id="anh-phone"><h4>📱 スマホだけでするとき</h4>
<ul class="an-steps">
  <li>Safari や Chrome で <b>app.netlify.com</b> を開いて、同じようにログインします（アプリを入れる必要はありません）。</li>
  <li>⬇ で書き出した index.html は、iPhone は「<b>ファイル</b>」アプリの「ダウンロード」、Android は「<b>ダウンロード</b>」に入ります。</li>
  <li>点線の枠の中の <b>browse to upload</b> を押すと、ファイルを選ぶ画面になります。index.html を選びます。</li>
  <li>画面がせまくてボタンが見つからないときは、横向きにするか、ブラウザのメニューの「<b>PC 版サイトを表示</b>」を使います。</li>
</ul>
</section>

<section id="anh-trouble"><h4>🆘 困ったとき</h4>
<dl class="anh-qa">
  <dt>「Page not found」と出る</dt><dd>置いたファイルの名前が <b>index.html</b> になっていないときです。名前を index.html に直して、Deploys に置き直します。</dd>
  <dt>表電卓が開かなくなった／案内ページが出る</dt><dd>表電卓のプロジェクトに置いてしまったときです。表電卓のプロジェクトの Deploys に、<b>表電卓の zip</b>（を展開したフォルダ）を置き直すと戻ります。案内ページは新しいプロジェクトに置き直します。</dd>
  <dt>直したのに古いまま</dt><dd>置き直したのが別のプロジェクトでないか、たしかめます。スマホではページを下に引っぱって読み直します。</dd>
  <dt>置いたページが消えた</dt><dd>ログインしないで置いたページは、しばらくすると消えます。ログインしてから置き直してください。</dd>
  <dt>QR コードを読んでも開かない</dt><dd>「ページを置いたアドレス」がまちがっていないか（https:// から最後まで）、名前を変えたあとの新しいアドレスか、たしかめます。</dd>
  <dt>メールが届かない</dt><dd>迷惑メールのフォルダを見ます。アドレスの打ちまちがいなら、もう一度 Sign up からやり直します。</dd>
  <dt>英語の画面がわからない</dt><dd>Chrome なら、画面を長押し（パソコンは右クリック）して「<b>日本語に翻訳</b>」を選ぶと、日本語で読めます。</dd>
</dl>
</section>

<section id="anh-safe"><h4>🔒 大事なこと</h4>
<ul class="an-steps">
  <li>Netlify に置いたページは、<b>アドレスを知っている人なら誰でも見られます</b>。Wi-Fi のパスワードや、見せたくないことを載せるかはよく考えてください。</li>
  <li>作っている内容は、この端末の中（表電卓）にだけ入っています。<b>💾 作りかけを保存</b> や 📋リストのバックアップで残しておくと安心です。</li>
  <li>Netlify のパスワードは、ほかの人に教えないでください。</li>
</ul>
</section>
<div class="an-note" style="text-align:center;margin-top:14px">Netlify の画面は、ときどき見た目や言葉が少し変わります。この説明と少しちがっていても、同じ名前のボタンをさがしてください。</div>`;
}
const AN_HELP_CSS=`
.anh-toc{ display:flex; flex-wrap:wrap; gap:6px; margin:2px 0 8px; }
.anh-toc button{ height:34px; padding:0 10px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13px; font-weight:bold; cursor:pointer; }
#anHelpBody section{ padding-top:6px; scroll-margin-top:4px; }
#anHelpBody h4{ font-size:16.5px; margin:16px 0 6px; padding:6px 10px; border-radius:8px; background:rgba(33,115,70,.10); }
#anHelpBody .an-note a, .anh-qa a{ color:var(--acc); font-weight:bold; cursor:pointer; text-decoration:underline; }
.anh-qa dt{ font-weight:bold; margin:10px 0 2px; font-size:14px; } .anh-qa dt::before{ content:"Q. "; color:var(--acc); }
.anh-qa dd{ margin:0 0 4px 1.3em; font-size:13.5px; line-height:1.7; }
.nf-mock{ position:relative; border:1px solid #cfd6dd; border-radius:10px; overflow:hidden; margin:8px 0 12px; background:#fff; color:#1f2937; font-family:-apple-system,"Segoe UI",sans-serif; font-size:12.5px; line-height:1.5; box-shadow:0 1px 4px rgba(0,0,0,.08); }
.nf-bar{ background:#eef1f4; padding:4px 9px; font-size:11px; color:#555; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.nf-in{ padding:10px 12px 12px; }
.nf-btn{ display:inline-block; position:relative; padding:5px 11px; border-radius:6px; background:#05bdba; color:#0b1d26; font-weight:bold; margin:3px 0; }
.nf-btn.nf-ghost{ background:#fff; border:1px solid #9aa5b1; }
.nf-wide{ position:relative; margin:5px auto; max-width:230px; padding:6px; border:1px solid #9aa5b1; border-radius:6px; font-weight:bold; }
.nf-menu{ margin:6px 0 0 auto; width:max-content; max-width:100%; border:1px solid #cfd6dd; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,.12); padding:3px 0; }
.nf-menu div{ position:relative; padding:4px 12px; }
.nf-drop{ position:relative; border:2px dashed #9aa5b1; border-radius:8px; padding:14px 10px; text-align:center; color:#555; margin-top:6px; }
.nf-tabs{ display:flex; gap:10px; flex-wrap:wrap; border-bottom:1px solid #dde2e7; margin-top:6px; padding-bottom:3px; color:#555; }
.nf-tabs span{ position:relative; }
.nf-row{ margin:6px 0; padding:5px 8px; background:#f4f6f8; border-radius:6px; }
.nf-field{ margin:6px 0; padding:5px 8px; border:1px solid #9aa5b1; border-radius:6px; overflow-wrap:anywhere; }
.nf-hl{ outline:3px solid #e53935; outline-offset:2px; border-radius:6px; }
.an-n{ display:inline-block; width:20px; height:20px; line-height:20px; border-radius:50%; background:#e53935; color:#fff; font:bold 12px sans-serif; font-style:normal; text-align:center; margin-right:5px; vertical-align:1px; }
`;
function anHelp(id){
  anEnsureDom();
  if(!$('anHelpOverlay')){
    const st=document.createElement('style'); st.id='anHelpStyle'; st.textContent=AN_HELP_CSS; document.head.appendChild(st);
    const box=document.createElement('div');
    box.innerHTML=`<div class="modal-overlay" id="anHelpOverlay" onclick="if(event.target===this)anCloseHelp()">
  <div class="modal vol-modal an-modal"><div class="modal-header"><span>❓ 案内ページのヘルプ</span><button class="modal-close" onclick="anCloseHelp()" aria-label="閉じる">✕</button></div>
    <div class="an-body" id="anHelpBody"></div></div></div>`;
    document.body.appendChild(box.firstElementChild);
    if(typeof applyNpToolFull==='function') applyNpToolFull();
  }
  $('anHelpBody').innerHTML=anHelpHtml();
  if(!isDlgOpen('anHelpOverlay')) openDlg('anHelpOverlay');
  $('anHelpBody').scrollTop=0;
  if(id) setTimeout(()=>anHelpJump(id), 30);
}
function anHelpJump(id){
  const b=$('anHelpBody'), e=document.getElementById(id); if(!b || !e) return;
  b.scrollTop += e.getBoundingClientRect().top - b.getBoundingClientRect().top - 4;
}
function anCloseHelp(){ closeDlg('anHelpOverlay'); }
/* 前の版の「❓ Netlify に置く方法」は、ヘルプの「はじめて置く」を開く */
function anNetlifyHelp(){ anHelp('anh-first'); }

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
  const card=`<div><h2>${esc(an.name)}</h2><p>スマホのカメラで読み取ると<br><b>館内のご案内</b>がご覧いただけます</p>${svg}<p style="font-size:9pt">Wi-Fi・お風呂・お食事・周辺のご案内</p>${an.langs.length?`<p style="font-size:8pt;line-height:1.35">${an.langs.map(k=>esc(AN_UI[k].scan)).join('<br>')}</p>`:''}</div>`;
  const html=`<div class="an-card">${card.repeat(4)}</div>`;
  if(typeof opBuild==='function' && typeof opPrint==='function') opPrint(opBuild(html, true)); else window.print();
}

Object.assign(window, { openAnnai, closeAnnai, anSetTop, anMove, anEdit, anEdSave, anEdDelete, anCloseEd, anPreview, anClosePv,
  anExportHtml, anExportJson, anImport, anReset, anShowQr, anPrintCards, anPageHtml, anBodyHtml, anState:()=>an, anQrSvg,
  anEdLang, anEdOk, anGT, anGTSec, anToggleLang, anTopTr, anTopTrSave, anNetlifyHelp, anHelp, anHelpJump, anCloseHelp, anSig, anTrState, anTopState, anTopMarkOk });
})();
