/* ✨ ことばで表を作る（v670。表電卓の本体から、はじめて使うときに読む）
   「3人で割り勘」「家計簿」「12か月の売上」「牛乳、卵、パンの買い物リスト」のように 打つか 話すと、
   見出し・式・合計・☑ チェック・▾ えらぶ欄・🎨 条件で色 の 付いた 表を 作る。
   インターネットも AI も 使わない（言い方の 決まりで 読む）。作る 前に 見本を 出し、↶戻る で 元に 戻せる。
   作る 表の 形（spec）：
     {name, icon, cols:[{k, h:見出し, t:'text'|'num'|'yen'|'date'|'ck'|'pk', o:[えらぶ言葉], f:'=式', tot:'sum'|'avg'|'ck'|'', d:日付の形}],
      n:行の数, init:{k:[はじめの中身…]}, extras:[{k, label, v:入れる値 | f:'=式'}], cf:[条件で色], note}
   式の 中の しるし：{r}＝その行の番号・{r-1}＝1つ上・{F}{L}＝はじめと 終わりの 行・{c:k}＝列 k の 文字・
     {T:k}＝列 k の 合計の セル・{X:k}＝下の 欄 k の 値の セル */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAXN=200;

/* ───────── ことばを そろえる ───────── */
const KD={'〇':0,'零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
function kanjiNum(s){   // 九十九 まで
  if(!/^[〇零一二三四五六七八九十]+$/.test(s)) return null;
  if(s.indexOf('十')<0) return s.length===1 ? KD[s] : null;
  const [a,b]=s.split('十');
  return (a===''?1:KD[a])*10+(b===''?0:KD[b]);
}
function norm(t){
  let s=String(t||'');
  try{ s=s.normalize('NFKC'); }catch(_){}
  s=s.replace(/[〇零一二三四五六七八九十]+(?=\s*(人|名|か月|ヶ月|ケ月|カ月|箇月|ヵ月|月分|行|件|品|日|回|週|時限|限|科目|教科|つ|個|項目|年))/g, m=>{ const v=kanjiNum(m); return v==null?m:String(v); });
  s=s.replace(/([0-9.]+)\s*万/g,(m,a)=>String(Math.round(parseFloat(a)*10000)));
  s=s.replace(/([0-9]),(?=[0-9]{3})/g,'$1');
  return s.trim();
}
/* 数の 取り出し */
function num(s, re){ const m=s.match(re); return m ? parseFloat(m[1]) : null; }
/* 「田中、佐藤、鈴木」「国語・数学・英語」のような 並び（いちばん 長いもの） */
function listOf(s){
  const t=s.replace(/[「」『』"]/g,'');
  let best=[];
  const seg=t.split(/[\s　]+/).join(' ');
  const re=/[^、,，・\/／\s]+(?:\s*[、,，・\/／]\s*[^、,，・\/／\s]+)+/g;
  let m;
  while((m=re.exec(seg))){
    const parts=m[0].split(/\s*[、,，・\/／]\s*/);
    if(parts.length>best.length) best=parts;
  }
  if(best.length<2){   // 「AとBとC」（と が 2つ 以上）
    const m2=seg.match(/([^\sと]{1,10}と){2,}[^\sと]{1,10}/);
    if(m2) best=m2[0].split('と');
  }
  if(best.length<2) return [];
  const cut=(x,first)=>{
    x=x.trim();
    if(first){ const i=Math.max(x.lastIndexOf('は'), x.lastIndexOf(':'), x.lastIndexOf('：'), x.lastIndexOf('で')); if(i>=0 && i<x.length-1) x=x.slice(i+1); }
    const j=x.search(/(の|で|を|が|に|って|から|まで|だけ)/); if(j>0) x=x.slice(0,j);
    return x.replace(/(さん|くん|ちゃん)$/,'').trim();
  };
  const out=best.map((x,i)=>cut(x, i===0)).filter(x=>x && x.length<=14 && !/^[0-9.]+$/.test(x));
  return out.length>=2 ? out.slice(0,60) : [];
}
const MONTHS=n=>Array.from({length:n},(_,i)=>(i%12+1)+'月');

/* v679：ふやした 表の 形（kw：並べた 品名などの 言葉は 見ないで、表の 種類の 言葉だけで 決める）。上から 見て、合った ものを 使う */
const TODAY=()=>(typeof todaySerial==='function') ? todaySerial() : null;
const DAYS=n=>{ const t0=TODAY(); return t0!=null ? Array.from({length:n},(_,i)=>String(t0+i)) : []; };
const WEEK=['月','火','水','木','金','土','日'];
const NEW_RECIPES=[
  { id:'invoice', kw:1, re:/請求書|見積書|見積もり書|お見積|納品書|明細書|領収書|インボイス/, build(x){
    const nm=(/見積/.test(x.raw) ? '見積書' : /納品/.test(x.raw) ? '納品書' : /領収/.test(x.raw) ? '領収書' : '請求書')+'の明細';
    return { name:nm, icon:'🧾',
      cols:[{k:'item',h:'品名'},{k:'qty',h:'数量',t:'num'},{k:'unit',h:'単位'},{k:'price',h:'単価（円）',t:'yen'},{k:'amt',h:'金額（円）',t:'yen',f:'=IF({c:price}{r}="","",{c:price}{r}*IF({c:qty}{r}="",1,{c:qty}{r}))',tot:'sum'}],
      n:x.n||Math.max(8, x.list.length), init:{item:x.list}, totLabel:'小計',
      extras:[{k:'tax',label:'消費税（10%）',f:'=ROUNDDOWN({T:amt}*0.1,0)'},{k:'all',label:'合計（税込）',f:'={T:amt}+{X:tax}'}],
      note:'数量と単価で 金額。下に 消費税（10%・切り捨て）と 税込の 合計が 出ます' };
  }},
  { id:'taxcalc', kw:1, re:/税込|税抜|消費税の?計算|価格表|値段表|料金表/, build(x){
    return { name:'税込み価格', icon:'🏷️',
      cols:[{k:'item',h:'品名'},{k:'base',h:'税抜（円）',t:'yen',tot:'sum'},{k:'rate',h:'税率',t:'pk',o:['10%','8%']},{k:'incl',h:'税込（円）',t:'yen',f:'=IF({c:base}{r}="","",ROUNDDOWN({c:base}{r}*IF({c:rate}{r}="8%",1.08,1.1),0))',tot:'sum'},
            {k:'tax',h:'消費税（円）',t:'yen',f:'=IF({c:base}{r}="","",{c:incl}{r}-{c:base}{r})',tot:'sum'}],
      n:x.n||Math.max(8, x.list.length), init:{item:x.list},
      note:'税抜の 値段を 入れると 税込（1円未満 切り捨て）。税率は ▾ で 8%（食べ物など）に できます（空なら 10%）' };
  }},
  { id:'unitprice', kw:1, re:/お得|単価比較|単価を比べ|グラム単価|1個あたり|1グラムあたり|コスパ|どっちが安い|どれが安い/, build(x){
    return { name:'どれが お得？', icon:'🔍',
      cols:[{k:'item',h:'品名'},{k:'price',h:'値段（円）',t:'yen'},{k:'amount',h:'量（数・g・ml）',t:'num'},{k:'per',h:'1あたり（円）',t:'num',f:'=IF({c:price}{r}="","",IF({c:amount}{r}="","",ROUND({c:price}{r}/{c:amount}{r},2)))'},{k:'memo',h:'メモ'}],
      n:x.n||Math.max(5, x.list.length), init:{item:x.list},
      cf:[{t:'bot',n:1,on:'per',st:{bg:'green',b:1},lab:'いちばん お得に 色'}],
      note:'値段と 量を 入れると 1あたりの 値段。いちばん 安いものが 緑に なります' };
  }},
  { id:'salesitem', kw:1, re:/商品別|品目別|売れ筋|メニュー別|ランキング/, build(x){
    return { name:'商品ごとの売上', icon:'🏆',
      cols:[{k:'item',h:'商品'},{k:'price',h:'単価（円）',t:'yen'},{k:'qty',h:'売れた数',t:'num',tot:'sum'},{k:'amt',h:'売上（円）',t:'yen',f:'=IF({c:price}{r}="","",{c:price}{r}*IF({c:qty}{r}="",0,{c:qty}{r}))',tot:'sum'},
            {k:'share',h:'割合',t:'pct',f:'=IF({c:amt}{r}="","",IF({T:amt}=0,"",ROUND({c:amt}{r}/{T:amt},3)))'}],
      n:x.n||Math.max(8, x.list.length), init:{item:x.list},
      cf:[{t:'top',n:3,on:'amt',st:{bg:'yellow',b:1}},{t:'bar',on:'share',st:{bg:'orange'}}],
      note:'単価と 売れた数で 売上と 割合。上位3つは 黄色' };
  }},
  { id:'utility', kw:1, re:/光熱費|電気代|ガス代|水道代|電気料金|ガス料金|水道料金/, not:/家計簿|かけいぼ/, build(x){
    const start=Math.max(1, Math.min(12, x.startMonth||1)), n=Math.max(1, Math.min(36, x.months||12));
    return { name:'光熱費の記録', icon:'💡',
      cols:[{k:'m',h:'月'},{k:'e',h:'電気（円）',t:'yen',tot:'sum'},{k:'g',h:'ガス（円）',t:'yen',tot:'sum'},{k:'w',h:'水道（円）',t:'yen',tot:'sum'},{k:'all',h:'合計（円）',t:'yen',f:'=IF({c:e}{r}&{c:g}{r}&{c:w}{r}="","",SUM({c:e}{r}:{c:w}{r}))',tot:'sum'}],
      n, init:{m:Array.from({length:n},(_,i)=>((start-1+i)%12+1)+'月')},
      extras:[{k:'avg',label:'1か月の平均',f:'=IF(COUNT({c:all}{F}:{c:all}{L})=0,"",ROUND(AVERAGE({c:all}{F}:{c:all}{L}),0))'}],
      cf:[{t:'scale',on:'all',st:{bg:'orange'}},{t:'above',on:'all',st:{fc:'red',b:1},lab:'平均より高い月は赤'}],
      note:'電気・ガス・水道を 入れると 月の 合計。高い 月ほど 濃い 橙、平均より 高い 月は 赤い字' };
  }},
  { id:'car', kw:1, re:/燃費|ガソリン|給油|走行距離/, build(x){
    return { name:'燃費の記録', icon:'⛽',
      cols:[{k:'day',h:'日付',t:'date'},{k:'km',h:'走った距離（km）',t:'num',tot:'sum'},{k:'l',h:'給油（L）',t:'num',tot:'sum'},{k:'yen',h:'金額（円）',t:'yen',tot:'sum'},
            {k:'kmpl',h:'燃費（km/L）',t:'num',f:'=IF({c:km}{r}="","",IF({c:l}{r}="","",ROUND({c:km}{r}/{c:l}{r},1)))'},{k:'ppl',h:'1Lの値段',t:'num',f:'=IF({c:yen}{r}="","",IF({c:l}{r}="","",ROUND({c:yen}{r}/{c:l}{r},1)))'}],
      n:x.n||20, extras:[{k:'avg',label:'平均の燃費（km/L）',f:'=IF({T:l}=0,"",ROUND({T:km}/{T:l},1))'}],
      cf:[{t:'scale',on:'kmpl',st:{bg:'green'}}],
      note:'満タンに した ときの 走った距離と 給油量で 燃費。燃費が いいほど 濃い 緑' };
  }},
  { id:'koutsuhi', kw:1, re:/交通費|経費精算|出張費|旅費精算|立て?替え?経費|立替経費/, build(x){
    const how=['電車','バス','タクシー','車','飛行機','その他'];
    return { name:'交通費の精算', icon:'🚃',
      cols:[{k:'day',h:'日付',t:'date'},{k:'dest',h:'行き先・用件'},{k:'route',h:'区間'},{k:'how',h:'手段',t:'pk',o:how},{k:'amt',h:'金額（円）',t:'yen',tot:'sum'},{k:'ck',h:'領収書',t:'ck'}],
      n:x.n||15,
      extras:how.slice(0,4).map((h,i)=>({k:'h'+i,label:h,f:'=SUMIF({c:how}{F}:{c:how}{L},"'+h+'",{c:amt}{F}:{c:amt}{L})'})),
      cf:[{t:'bar',on:'amt',st:{bg:'blue'}}],
      note:'手段は ▾ で えらべます。下に 手段ごとの 合計。領収書が ある 分は ☑' };
  }},
  { id:'loan', kw:1, re:/返済|ローン|借金|借りた|貸した|貸し借り|立て替えた/, not:/割り?勘/, build(x){
    return { name:'返済の記録', icon:'💴',
      cols:[{k:'day',h:'日付',t:'date'},{k:'memo',h:'内容'},{k:'pay',h:'返した額（円）',t:'yen',tot:'sum'},{k:'left',h:'残り（円）',t:'yen',f:'=IF({c:pay}{r}="","",{X:debt}-SUM({c:pay}{F}:{c:pay}{r}))'}],
      n:x.n||x.times||24,
      extras:[{k:'debt',label:'借りた額（はじめ）',v:x.yen||''},{k:'now',label:'いまの残り',f:'=IF({X:debt}="","",{X:debt}-{T:pay})'},{k:'cnt',label:'返した回数',f:'=COUNT({c:pay}{F}:{c:pay}{L})'}],
      cf:[{t:'bar',on:'left',st:{bg:'orange'}}],
      note:'下に 借りた額を 入れて、返すたびに 金額を 入れると 残りが へっていきます' };
  }},
  { id:'invest', kw:1, re:/投資|株式|株の|資産|NISA|ニーサ|ポートフォリオ|銘柄|投資信託|投信/i, build(x){
    return { name:'資産・投資', icon:'📊',
      cols:[{k:'name',h:'銘柄・口座'},{k:'cost',h:'買った額（円）',t:'yen',tot:'sum'},{k:'val',h:'いまの評価額（円）',t:'yen',tot:'sum'},{k:'pl',h:'損益（円）',t:'yen',f:'=IF({c:val}{r}="","",{c:val}{r}-{c:cost}{r})',tot:'sum'},
            {k:'pr',h:'損益率',t:'pct',f:'=IF({c:pl}{r}="","",IF({c:cost}{r}=0,"",ROUND({c:pl}{r}/{c:cost}{r},3)))'},{k:'share',h:'割合',t:'pct',f:'=IF({c:val}{r}="","",IF({T:val}=0,"",ROUND({c:val}{r}/{T:val},3)))'}],
      n:x.n||Math.max(6, x.list.length), init:{name:x.list},
      extras:[{k:'all',label:'全体の 損益率',f:'=IF({T:cost}=0,"",ROUND({T:pl}/{T:cost},3))'}],
      cf:[{t:'neg',on:['pl','pr'],st:{fc:'red',b:1}},{t:'gt',v:0,on:['pl','pr'],st:{fc:'green',b:1}},{t:'bar',on:'share',st:{bg:'blue'}}],
      note:'買った額と いまの 評価額で 損益と 損益率。マイナスは 赤、プラスは 緑' };
  }},
  { id:'kpi', kw:1, re:/達成率|ノルマ|進捗|KPI|実績と目標|目標と実績/i, build(x){
    return { name:'目標と実績', icon:'🎯',
      cols:[{k:'item',h:'項目'},{k:'goal',h:'目標',t:'num',tot:'sum'},{k:'act',h:'実績',t:'num',tot:'sum'},{k:'rate',h:'達成率',t:'pct',f:'=IF({c:act}{r}="","",IF({c:goal}{r}=0,"",ROUND({c:act}{r}/{c:goal}{r},3)))'},{k:'memo',h:'メモ'}],
      n:x.n||Math.max(6, x.list.length), init:{item:x.list.length ? x.list : (x.months ? MONTHS(x.months) : [])},
      extras:[{k:'all',label:'全体の 達成率',f:'=IF({T:goal}=0,"",ROUND({T:act}/{T:goal},3))'}],
      cf:[{t:'ge',v:1,on:'rate',st:{bg:'green',b:1},lab:'達成は緑'},{t:'lt',v:0.5,on:'rate',st:{fc:'red',b:1},lab:'半分より下は赤'},{t:'bar',on:'act',st:{bg:'blue'}}],
      note:'目標と 実績で 達成率。100% 以上は 緑、50% より 下は 赤い字' };
  }},
  { id:'gift', kw:1, re:/お祝い|香典|お返し|内祝い?|お中元|お歳暮|ご祝儀|贈り物|いただき物|頂き物|お見舞い|お年玉/, build(x){
    const toy=/お年玉/.test(x.raw);
    if(toy) return { name:'お年玉', icon:'🧧',
      cols:[{k:'ck',h:'渡した',t:'ck'},{k:'who',h:'名前'},{k:'age',h:'年齢',t:'num'},{k:'amt',h:'金額（円）',t:'yen',tot:'sum'},{k:'memo',h:'メモ'}],
      n:x.list.length||x.n||8, init:{who:x.list}, cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}}], note:'渡したら ☑。合計の 金額が 出ます' };
    return { name:'いただき物と お返し', icon:'🎁',
      cols:[{k:'ck',h:'お返し済',t:'ck'},{k:'day',h:'日付',t:'date'},{k:'who',h:'名前'},{k:'what',h:'いただいた物'},{k:'amt',h:'金額（円）',t:'yen',tot:'sum'},{k:'ret',h:'お返し'},{k:'half',h:'お返しの目安（半分）',t:'yen',f:'=IF({c:amt}{r}="","",ROUND({c:amt}{r}/2,-2))'}],
      n:x.list.length||x.n||15, init:{who:x.list},
      extras:[{k:'rest',label:'お返しが まだ',f:'=COUNTIF({c:who}{F}:{c:who}{L},"?*")-COUNTIF({c:ck}{F}:{c:ck}{L},1)'}],
      cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}}],
      note:'お返しが 済んだら ☑ で 灰色に。お返しの 目安は 金額の 半分（百円単位）' };
  }},
  { id:'nenga', kw:1, re:/年賀状?|喪中|住所録|宛名|暑中見舞い|寒中見舞い|クリスマスカード/, build(x){
    return { name:/住所録|宛名/.test(x.raw) ? '住所録' : '年賀状の やりとり', icon:'📮',
      cols:[{k:'sent',h:'出した',t:'ck',tot:'ck'},{k:'recv',h:'届いた',t:'ck',tot:'ck'},{k:'who',h:'名前'},{k:'zip',h:'郵便番号'},{k:'addr',h:'住所'},{k:'memo',h:'メモ'}],
      n:x.list.length||x.n||20, init:{who:x.list},
      cf:[{t:'ck',row:1,on:'sent',st:{fc:'gray'}}],
      note:'出した・届いた に ☑。合計の 行に それぞれの 数が 出ます' };
  }},
  { id:'contact', kw:1, re:/連絡先|電話帳|連絡網|緊急連絡|アドレス帳|電話番号の?一覧/, build(x){
    return { name:'連絡先', icon:'📇',
      cols:[{k:'who',h:'名前'},{k:'rel',h:'関係'},{k:'tel',h:'電話'},{k:'mail',h:'メール'},{k:'memo',h:'メモ'}],
      n:x.list.length||x.n||15, init:{who:x.list}, note:'名前・関係・電話・メールを 入れる 表です' };
  }},
  { id:'customer', kw:1, re:/顧客|お客様|得意先|取引先|名刺/, build(x){
    return { name:'お客様の一覧', icon:'🤝',
      cols:[{k:'who',h:'名前・会社'},{k:'tel',h:'電話'},{k:'mail',h:'メール'},{k:'last',h:'前回の連絡',t:'date'},{k:'next',h:'次の予定',t:'date'},{k:'memo',h:'メモ'}],
      n:x.list.length||x.n||15, init:{who:x.list},
      cf:[{t:'today',row:1,on:'next',st:{bg:'yellow',b:1}},{t:'soon',n:7,on:'next',st:{bg:'orange'}},{t:'past',on:'next',st:{fc:'red',b:1}}],
      note:'次の 予定が 今日なら 黄色、7日のうちは 橙、過ぎたら 赤い字' };
  }},
  { id:'birthday', kw:1, re:/誕生日|記念日|バースデー/, build(x){
    return { name:'誕生日・記念日', icon:'🎂',
      cols:[{k:'who',h:'名前・できごと'},{k:'day',h:'日付',t:'date'},{k:'gift',h:'プレゼント・予定'},{k:'ck',h:'連絡した',t:'ck'},{k:'memo',h:'メモ'}],
      n:x.list.length||x.n||12, init:{who:x.list}, cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray'}}], note:'名前と 日付を 入れる 一覧です' };
  }},
  { id:'iryohi', kw:1, re:/医療費|通院|病院代|医療費控除|薬代|治療費/, build(x){
    return { name:'医療費の記録', icon:'🏥',
      cols:[{k:'day',h:'日付',t:'date'},{k:'who',h:'受けた人'},{k:'where',h:'病院・薬局'},{k:'kind',h:'区分',t:'pk',o:['診療','薬','交通費','その他']},{k:'amt',h:'払った額（円）',t:'yen',tot:'sum'},{k:'hoken',h:'保険などで 出た額（円）',t:'yen',tot:'sum'}],
      n:x.n||25,
      extras:[{k:'net',label:'実際の 負担',f:'={T:amt}-{T:hoken}'},{k:'ded',label:'10万円を こえた分（医療費控除の 目安）',f:'=MAX(0,{X:net}-100000)'}],
      cf:[{t:'bar',on:'amt',st:{bg:'red'}}],
      note:'1年の 医療費を まとめる 表。10万円を こえた 分が 控除の 目安です（所得が 少ない 場合は ちがいます）' };
  }},
  { id:'medicine', kw:1, re:/薬|服薬|飲み忘れ/, build(x){
    const n=x.days||x.n||14;
    return { name:'お薬カレンダー', icon:'💊',
      cols:[{k:'day',h:'日付',t:'date',d:'wday'},{k:'m',h:'朝',t:'ck',tot:'ck'},{k:'a',h:'昼',t:'ck',tot:'ck'},{k:'e',h:'夜',t:'ck',tot:'ck'},{k:'b',h:'寝る前',t:'ck',tot:'ck'},{k:'memo',h:'メモ'}],
      n, init:{day:DAYS(n)},
      cf:[{t:'today',row:1,on:'day',st:{bg:'yellow',b:1}}],
      note:'飲んだら ☑。今日の 行は 黄色、合計の 行に 飲んだ 回数' };
  }},
  { id:'taion', kw:1, re:/体温|検温|発熱/, build(x){
    const n=x.days||x.n||14;
    return { name:'体温の記録', icon:'🌡️',
      cols:[{k:'day',h:'日付',t:'date'},{k:'am',h:'朝（℃）',t:'num',tot:'avg'},{k:'pm',h:'夜（℃）',t:'num',tot:'avg'},{k:'sym',h:'ようす'},{k:'memo',h:'メモ'}],
      n, init:{day:DAYS(n)}, totLabel:'平均',
      cf:[{t:'ge',v:37.5,on:['am','pm'],st:{bg:'red',fc:'white',b:1},lab:'37.5℃ 以上は赤'}],
      note:'37.5℃ 以上は 赤く なります' };
  }},
  { id:'sleep', kw:1, re:/睡眠|寝た時間|ねた時間|就寝|起床|ねる時間/, build(x){
    const n=x.days||x.n||14;
    return { name:'睡眠の記録', icon:'😴',
      cols:[{k:'day',h:'日付',t:'date'},{k:'bed',h:'寝た 時刻'},{k:'up',h:'起きた 時刻'},{k:'h',h:'寝た 時間（h）',t:'num',tot:'avg'},{k:'q',h:'ぐっすり度（1〜5）',t:'num',tot:'avg'},{k:'memo',h:'メモ'}],
      n, init:{day:DAYS(n)}, totLabel:'平均',
      cf:[{t:'lt',v:6,on:'h',st:{fc:'red',b:1},lab:'6時間より短いと赤'},{t:'scale',on:'q',st:{bg:'blue'}}],
      note:'6時間より 短い 日は 赤い字。いちばん下は 平均' };
  }},
  { id:'baby', kw:1, re:/授乳|ミルク|おむつ|オムツ|離乳食|育児|赤ちゃん/, build(x){
    return { name:'育児の記録', icon:'🍼',
      cols:[{k:'day',h:'日付',t:'date'},{k:'time',h:'時刻'},{k:'milk',h:'ミルク（ml）',t:'num',tot:'sum'},{k:'diaper',h:'おむつ',t:'pk',o:['おしっこ','うんち','両方']},{k:'sleep',h:'寝た（分）',t:'num',tot:'sum'},{k:'memo',h:'メモ'}],
      n:x.n||30, extras:[{k:'cnt',label:'おむつの 回数',f:'=COUNTIF({c:diaper}{F}:{c:diaper}{L},"?*")'}],
      cf:[{t:'bar',on:'milk',st:{bg:'blue'}}],
      note:'ミルクの 量と おむつ（▾ で えらぶ）・寝た 時間を 入れる 表です' };
  }},
  { id:'pet', kw:1, re:/ペット|犬|猫|散歩|エサ|えさ|水やり|植物|観葉/, build(x){
    const n=x.days||x.n||14, plant=/水やり|植物|観葉/.test(x.raw);
    return { name:plant ? '水やりの記録' : 'ペットの お世話', icon:plant ? '🪴' : '🐾',
      cols:plant ? [{k:'day',h:'日付',t:'date',d:'wday'},{k:'w',h:'水やり',t:'ck',tot:'ck'},{k:'f',h:'肥料',t:'ck',tot:'ck'},{k:'memo',h:'ようす'}]
        : [{k:'day',h:'日付',t:'date',d:'wday'},{k:'am',h:'朝ごはん',t:'ck',tot:'ck'},{k:'pm',h:'夜ごはん',t:'ck',tot:'ck'},{k:'walk',h:'散歩',t:'ck',tot:'ck'},{k:'kg',h:'体重（kg）',t:'num'},{k:'memo',h:'メモ'}],
      n, init:{day:DAYS(n)}, cf:[{t:'today',row:1,on:'day',st:{bg:'yellow',b:1}}],
      note:'済んだら ☑。今日の 行は 黄色' };
  }},
  { id:'workout', kw:1, re:/筋トレ|運動|トレーニング|ジム|ランニング|ジョギング|マラソン|ウォーキング|ストレッチ|水泳|サイクリング/, not:/歩数/, build(x){
    const kinds=x.list.length>=2 ? x.list.slice(0,10) : ['ランニング','ウォーキング','筋トレ','ストレッチ','水泳','自転車','その他'];
    return { name:'運動の記録', icon:'💪',
      cols:[{k:'day',h:'日付',t:'date'},{k:'what',h:'種目',t:'pk',o:kinds},{k:'min',h:'時間（分）',t:'num',tot:'sum'},{k:'dist',h:'距離（km）',t:'num',tot:'sum'},{k:'cnt',h:'回数',t:'num',tot:'sum'},{k:'memo',h:'メモ'}],
      n:x.n||x.days||30,
      extras:[{k:'days',label:'運動した 回数',f:'=COUNT({c:min}{F}:{c:min}{L})'},{k:'hours',label:'合計の 時間（h）',f:'=ROUND({T:min}/60,1)'}].concat(x.goal?[{k:'goal',label:'目標',v:x.goal}]:[]),
      cf:[{t:'bar',on:'min',st:{bg:'green'}}],
      note:'種目は ▾ で えらべます。時間は 棒で 分かります' };
  }},
  { id:'study', kw:1, re:/勉強時間|勉強の記録|学習時間|学習記録|練習時間|練習の?記録|勉強計画|学習計画/, build(x){
    const subj=x.list.length>=2 ? x.list.slice(0,8) : ['国語','数学','英語','理科','社会'];
    return { name:'勉強時間の記録', icon:'📚',
      cols:[{k:'day',h:'日付',t:'date'},{k:'subj',h:'科目',t:'pk',o:subj},{k:'min',h:'時間（分）',t:'num',tot:'sum'},{k:'what',h:'内容'},{k:'ck',h:'予定どおり',t:'ck'}],
      n:x.n||x.days||30,
      extras:subj.slice(0,6).map((s,i)=>({k:'s'+i,label:s+'（分）',f:'=SUMIF({c:subj}{F}:{c:subj}{L},"'+s.replace(/"/g,'')+'",{c:min}{F}:{c:min}{L})'})).concat([{k:'h',label:'合計（時間）',f:'=ROUND({T:min}/60,1)'}]),
      cf:[{t:'bar',on:'min',st:{bg:'blue'}}],
      note:'科目は ▾ で えらべます。下に 科目ごとの 合計' };
  }},
  { id:'habit', kw:1, re:/習慣|ルーティン|ルーティーン|ハビット|毎日やる|毎日の チェック|生活リズム/, build(x){
    const hb=(x.list.length>=2 ? x.list : ['早起き','運動','読書','水を2L']).slice(0,8), n=x.days||x.n||30;
    const cols=[{k:'day',h:'日付',t:'date',d:'wday'}].concat(hb.map((h,i)=>({k:'h'+i,h,t:'ck',tot:'ck'})));
    cols.push({k:'cnt',h:'できた数',t:'num',f:'=COUNTIF({c:h0}{r}:{c:h'+(hb.length-1)+'}{r},1)',tot:'sum'});
    return { name:'習慣チェック', icon:'🔁', cols, n, init:{day:DAYS(n)},
      extras:[{k:'all',label:'ぜんぶ できた 日',f:'=COUNTIF({c:cnt}{F}:{c:cnt}{L},'+hb.length+')'}],
      cf:[{t:'scale',on:'cnt',st:{bg:'green'}},{t:'today',row:1,on:'day',st:{b:1}}],
      note:'できたら ☑。できた数が 多い 日ほど 濃い 緑' };
  }},
  { id:'kids', kw:1, re:/お手伝い|おてつだい|ごほうび|ご褒美|ポイントカード|スタンプ|がんばり表|頑張り表/, build(x){
    const tasks=(x.list.length>=2 ? x.list : ['はみがき','おかたづけ','しゅくだい','おてつだい']).slice(0,6), n=x.days||x.n||14;
    const cols=[{k:'day',h:'日付',t:'date',d:'wday'}].concat(tasks.map((h,i)=>({k:'t'+i,h,t:'ck',tot:'ck'})));
    cols.push({k:'pt',h:'ポイント',t:'num',f:'=COUNTIF({c:t0}{r}:{c:t'+(tasks.length-1)+'}{r},1)',tot:'sum'});
    return { name:'がんばり表', icon:'⭐', cols, n, init:{day:DAYS(n)},
      extras:[{k:'goal',label:'ごほうびまで（ポイント）',v:x.goal||20},{k:'rest',label:'あと',f:'=MAX(0,{X:goal}-{T:pt})'}],
      cf:[{t:'scale',on:'pt',st:{bg:'yellow'}}],
      note:'できたら ☑ で 1ポイント。ごほうびまで あと いくつかが 下に 出ます' };
  }},
  { id:'kaihi', kw:1, re:/会費|集金|徴収|町内会費|部費|PTA|月謝|参加費/i, not:/割り?勘|飲み会|宴会/, build(x){
    const n=x.list.length||x.ppl||x.n||15;
    return { name:'集金の記録', icon:'💰',
      cols:[{k:'ck',h:'払った',t:'ck',tot:'ck'},{k:'who',h:'名前'},{k:'amt',h:'金額（円）',t:'yen',tot:'sum'},{k:'day',h:'受け取った日',t:'date'},{k:'memo',h:'メモ'}],
      n, init:{who:x.list, amt:x.yen ? Array.from({length:n},()=>String(x.yen)) : []},
      extras:[{k:'got',label:'集まった 額',f:'=SUMIF({c:ck}{F}:{c:ck}{L},1,{c:amt}{F}:{c:amt}{L})'},{k:'rest',label:'まだの 額',f:'={T:amt}-{X:got}'},{k:'ppl',label:'まだの 人',f:'=COUNTIF({c:who}{F}:{c:who}{L},"?*")-COUNTIF({c:ck}{F}:{c:ck}{L},1)'}],
      cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray'}}],
      note:'払ったら ☑。集まった 額と まだの 人が 下に 出ます' };
  }},
  { id:'touban', kw:1, re:/当番|役割分担|分担表|係の表|ローテーション/, build(x){
    const n=x.days||x.n||14, who=x.list.length>=2 ? x.list.slice(0,12) : [];
    return { name:'当番表', icon:'🧹',
      cols:[{k:'day',h:'日付',t:'date',d:'wday'},{k:'who',h:'当番',t:who.length ? 'pk' : 'text',o:who},{k:'what',h:'内容'},{k:'ck',h:'済',t:'ck'}],
      n, init:{day:DAYS(n), who:who.length ? Array.from({length:n},(_,i)=>who[i%who.length]) : []},
      cf:[{t:'today',row:1,on:'day',st:{bg:'yellow',b:1}},{t:'ck',row:1,on:'ck',st:{fc:'gray'}}],
      note:'名前を 並べると 順番に 入ります（▾ で 入れかえ）。今日の 行は 黄色' };
  }},
  { id:'cleaning', kw:1, re:/掃除|そうじ|大掃除|片付け|かたづけ|断捨離/, build(x){
    return { name:'掃除・片付け', icon:'🧽',
      cols:[{k:'ck',h:'済',t:'ck'},{k:'where',h:'場所'},{k:'what',h:'やること'},{k:'who',h:'担当'},{k:'due',h:'期限',t:'date'}],
      n:x.n||Math.max(10, x.list.length), init:{where:x.list.length ? x.list : ['台所','お風呂','トイレ','洗面所','玄関','窓','ベランダ','リビング']},
      extras:[{k:'done',label:'済んだ 数',f:'=COUNTIF({c:ck}{F}:{c:ck}{L},1)'},{k:'all',label:'ぜんぶ',f:'=COUNTIF({c:where}{F}:{c:where}{L},"?*")'}],
      cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}},{t:'past',row:1,on:'due',nock:'ck',st:{bg:'red'}}],
      note:'済んだら ☑ で 灰色に。期限が 過ぎると 赤' };
  }},
  { id:'gomi', kw:1, re:/ゴミ|ごみ|資源ゴミ|分別/, build(x){
    return { name:'ゴミ出しの 曜日', icon:'🗑️',
      cols:[{k:'d',h:'曜日'},{k:'kind',h:'出す もの'},{k:'time',h:'時間・場所'},{k:'memo',h:'メモ'}],
      n:7, init:{d:WEEK}, note:'曜日ごとに 出す ものを 入れる 表です' };
  }},
  { id:'trip', kw:1, re:/行程|旅程|旅のしおり|旅行の予定|旅行プラン|旅行計画|タイムスケジュール|タイムテーブル/, build(x){
    return { name:'旅の 行程', icon:'🗺️',
      cols:[{k:'day',h:'日付',t:'date',d:'wday'},{k:'time',h:'時刻'},{k:'what',h:'予定'},{k:'where',h:'場所'},{k:'cost',h:'費用（円）',t:'yen',tot:'sum'},{k:'memo',h:'メモ'}],
      n:x.n||20,
      extras:x.ppl?[{k:'ppl',label:'人数',v:x.ppl},{k:'per',label:'1人あたり',f:'=IF({X:ppl}="","",IF({T:cost}=0,"",ROUNDUP({T:cost}/{X:ppl},0)))'}]:[],
      note:'時刻と 予定・場所を 入れる 表。費用の 合計も 出ます' };
  }},
  { id:'guest', kw:1, re:/招待|ゲスト|席次|結婚式|二次会|引き出物|披露宴/, not:/割り?勘|精算/, build(x){
    return { name:'招待客の一覧', icon:'💌',
      cols:[{k:'who',h:'名前'},{k:'rel',h:'関係',t:'pk',o:['家族','親せき','友人','会社','その他']},{k:'ans',h:'出欠',t:'pk',o:['出席','欠席','未定']},{k:'gift',h:'ご祝儀（円）',t:'yen',tot:'sum'},{k:'seat',h:'席'},{k:'memo',h:'メモ'}],
      n:x.list.length||x.n||20, init:{who:x.list},
      extras:['出席','欠席','未定'].map((a,i)=>({k:'a'+i,label:a,f:'=COUNTIF({c:ans}{F}:{c:ans}{L},"'+a+'")'})),
      cf:[{t:'eq',v:'欠席',row:1,on:'ans',st:{fc:'gray'},lab:'欠席は灰色'},{t:'eq',v:'未定',row:1,on:'ans',st:{bg:'yellow'},lab:'未定は黄色'}],
      note:'出欠は ▾ で えらべます。下に 出席・欠席・未定の 人数' };
  }},
  { id:'league', kw:1, re:/対戦表?|リーグ戦?|総当たり|総当り|勝敗表|星取り?表/, build(x){
    const ps=(x.list.length>=2 ? x.list : ['Aさん','Bさん','Cさん','Dさん']).slice(0,10);
    const cols=[{k:'p',h:'名前'}].concat(ps.map((p,i)=>({k:'v'+i,h:p})));
    cols.push({k:'win',h:'勝ち',t:'num',f:'=COUNTIF({c:v0}{r}:{c:v'+(ps.length-1)+'}{r},"○")'},{k:'lose',h:'負け',t:'num',f:'=COUNTIF({c:v0}{r}:{c:v'+(ps.length-1)+'}{r},"×")'},
      {k:'pt',h:'勝ち点',t:'num',f:'={c:win}{r}*3+COUNTIF({c:v0}{r}:{c:v'+(ps.length-1)+'}{r},"△")'});
    const init={p:ps}; ps.forEach((_,j)=>{ init['v'+j]=ps.map((_,i)=>i===j ? '－' : ''); });
    return { name:'総当たりの 対戦表', icon:'🏅', cols, n:ps.length, init,
      cf:[{t:'top',n:1,on:'pt',st:{bg:'yellow',b:1}},{t:'has',v:'○',on:ps.map((_,i)=>'v'+i),st:{fc:'red',b:1},lab:'○は赤'}],
      note:'勝ちは ○、負けは ×、引き分けは △ を 入れると 勝ち・負け・勝ち点（勝ち3・引き分け1）が 出ます' };
  }},
  { id:'vote', kw:1, re:/投票|アンケート|多数決|集計表|人気投票/, build(x){
    return { name:'投票の集計', icon:'🗳️',
      cols:[{k:'opt',h:'えらんだ もの'},{k:'v',h:'票',t:'num',tot:'sum'},{k:'pct',h:'割合',t:'pct',f:'=IF({c:v}{r}="","",IF({T:v}=0,"",ROUND({c:v}{r}/{T:v},3)))'}],
      n:x.n||Math.max(5, x.list.length), init:{opt:x.list},
      cf:[{t:'top',n:1,on:'v',st:{bg:'yellow',b:1}},{t:'bar',on:'pct',st:{bg:'blue'}}],
      note:'票の 数を 入れると 割合。いちばん 多いものが 黄色' };
  }},
  { id:'recipe', kw:1, re:/レシピ|材料|分量|人分|人前/, not:/割り?勘/, build(x){
    const sv=[...x.raw.matchAll(/([0-9]+)\s*(?:人分|人前)/g)].map(m=>+m[1]);
    return { name:'材料の 分量', icon:'🍳',
      cols:[{k:'item',h:'材料'},{k:'qty',h:'元の 分量',t:'num'},{k:'unit',h:'単位'},{k:'make',h:'作る 分量',t:'num',f:'=IF({c:qty}{r}="","",ROUND({c:qty}{r}*{X:to}/{X:from},1))'},{k:'memo',h:'メモ'}],
      n:x.n||Math.max(8, x.list.length), init:{item:x.list},
      extras:[{k:'from',label:'元の 人数',v:sv[0]||2},{k:'to',label:'作る 人数',v:sv[1]||sv[0]||4}],
      note:'下の「作る 人数」を 変えると、材料の 分量が その 人数に 合わせて 変わります' };
  }},
  { id:'food', kw:1, re:/賞味期限|消費期限|冷蔵庫|冷凍庫|期限管理|食品の在庫|食品ストック|非常食|備蓄/, build(x){
    return { name:'食品と 期限', icon:'🥫',
      cols:[{k:'ck',h:'使った',t:'ck'},{k:'item',h:'品名'},{k:'qty',h:'数',t:'num'},{k:'exp',h:'期限',t:'date'},{k:'place',h:'場所',t:'pk',o:['冷蔵','冷凍','常温']}],
      n:x.n||Math.max(12, x.list.length), init:{item:x.list},
      cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}},{t:'past',row:1,on:'exp',nock:'ck',st:{bg:'red'}},{t:'soon',n:3,on:'exp',nock:'ck',st:{bg:'orange'}}],
      note:'期限が 過ぎると 赤、3日のうちは 橙。使ったら ☑' };
  }},
  { id:'kigen', kw:1, re:/保証|契約|更新日|期限の?一覧|免許|パスポート|車検|保険の?更新/, not:/持ち?物|もちもの/, build(x){
    return { name:'期限・更新日の一覧', icon:'📆',
      cols:[{k:'item',h:'名前'},{k:'day',h:'期限・更新日',t:'date'},{k:'cost',h:'費用（円）',t:'yen',tot:'sum'},{k:'memo',h:'メモ'}],
      n:x.n||Math.max(10, x.list.length), init:{item:x.list.length ? x.list : ['運転免許','車検','パスポート','火災保険','スマホの契約','家電の保証']},
      cf:[{t:'past',row:1,on:'day',st:{bg:'red'}},{t:'soon',n:30,on:'day',st:{bg:'orange'}}],
      note:'期限が 過ぎると 赤、30日のうちは 橙' };
  }},
  { id:'wish', kw:1, re:/ほしい物|欲しい物|欲しいもの|ほしいもの|ウィッシュ|買いたい物/, build(x){
    return { name:'ほしい物リスト', icon:'💝',
      cols:[{k:'ck',h:'買った',t:'ck'},{k:'item',h:'品名'},{k:'price',h:'値段（円）',t:'yen',tot:'sum'},{k:'prio',h:'優先',t:'pk',o:['高','中','低']},{k:'where',h:'お店・メモ'}],
      n:x.n||Math.max(10, x.list.length), init:{item:x.list},
      extras:[{k:'done',label:'買った 分',f:'=SUMIF({c:ck}{F}:{c:ck}{L},1,{c:price}{F}:{c:price}{L})'},{k:'rest',label:'まだの 分',f:'={T:price}-{X:done}'}],
      cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}},{t:'eq',v:'高',row:1,on:'prio',st:{bg:'orange'},lab:'優先「高」は橙'}],
      note:'優先「高」は 橙。買ったら ☑ で 灰色に' };
  }},
  { id:'reading', kw:1, re:/読書|読んだ本|本の記録|映画|見た映画|観た映画|ドラマ|アニメ|鑑賞/, build(x){
    const mv=/映画|ドラマ|アニメ|鑑賞/.test(x.raw);
    return { name:mv ? '見た 作品の 記録' : '読書の 記録', icon:mv ? '🎬' : '📖',
      cols:[{k:'day',h:'日付',t:'date'},{k:'title',h:'タイトル'},{k:'by',h:mv ? '監督・出演' : '作者'},{k:'star',h:'評価（1〜5）',t:'num',tot:'avg'},{k:'memo',h:'感想'}],
      n:x.n||20, init:{title:x.list}, totLabel:'平均',
      cf:[{t:'ge',v:5,on:'star',st:{bg:'yellow',b:1},lab:'★5 は黄色'}],
      note:'評価 5 は 黄色。いちばん下は 評価の 平均' };
  }},
  { id:'nippo', kw:1, re:/日報|作業記録|作業時間|工数|業務記録|稼働時間|作業日誌/, build(x){
    return { name:'作業の 記録', icon:'🗂️',
      cols:[{k:'day',h:'日付',t:'date'},{k:'proj',h:'案件・作業'},{k:'start',h:'開始'},{k:'end',h:'終了'},{k:'h',h:'時間（h）',t:'num',tot:'sum'},{k:'memo',h:'メモ'}],
      n:x.n||x.days||20, extras:[{k:'days',label:'記録した 日',f:'=COUNT({c:h}{F}:{c:h}{L})'}],
      cf:[{t:'bar',on:'h',st:{bg:'blue'}}],
      note:'作業ごとに 時間（1時間半なら 1.5）を 入れると 合計が 出ます' };
  }},
  { id:'seat', kw:1, re:/席替え|座席表?|席順/, build(x){
    const cols=[{k:'r',h:'列'}].concat(['A','B','C','D','E','F'].map((c,i)=>({k:'c'+i,h:c})));
    return { name:'座席表', icon:'🪑', cols, n:x.n||5, init:{r:Array.from({length:x.n||5},(_,i)=>(i+1)+'列目')}, note:'名前を 入れる 座席の 表です（前が 上）' };
  }},
];

/* ───────── 表の 形の 決まり（上から 見て、合った ものを 使う）───────── */
const RECIPES0=[
  { id:'shop', re:/買い?物|買物|かいもの|おつかい|お使い|ショッピング|スーパー|ドラッグストア/, build(x){
    const items=x.list;
    return { name:'買い物リスト', icon:'🛒',
      cols:[{k:'ck',h:'買った',t:'ck',tot:'ck'},{k:'item',h:'品名'},{k:'price',h:'単価（円）',t:'yen'},{k:'qty',h:'個数',t:'num'},
            {k:'sub',h:'小計（円）',t:'yen',f:'=IF({c:price}{r}="","",{c:price}{r}*IF({c:qty}{r}="",1,{c:qty}{r}))',tot:'sum'}],
      n:x.n||Math.max(8, items.length), init:{item:items},
      extras:[{k:'done',label:'買った分',f:'=SUMIF({c:ck}{F}:{c:ck}{L},1,{c:sub}{F}:{c:sub}{L})'},{k:'rest',label:'まだの分',f:'={T:sub}-{X:done}'}].concat(x.budget?[{k:'bud',label:'予算',v:x.budget},{k:'left',label:'予算の残り',f:'={X:bud}-{T:sub}'}]:[]),
      cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}}].concat(x.budget?[{t:'neg',ex:'left',st:{fc:'red',b:1}}]:[]),
      note:'単価と個数を入れると小計と合計。☑ を付けると 行が灰色になり「買った分」に入ります' };
  }},
  { id:'kotei', re:/固定費|サブスク|毎月の支払|定期の支払|月額|年会費/, build(x){
    return { name:'毎月の支払い', icon:'💳',
      cols:[{k:'ck',h:'見直す',t:'ck'},{k:'item',h:'項目'},{k:'mon',h:'月額（円）',t:'yen',tot:'sum'},{k:'yr',h:'1年で（円）',t:'yen',f:'=IF({c:mon}{r}="","",{c:mon}{r}*12)',tot:'sum'},{k:'memo',h:'メモ'}],
      n:x.n||Math.max(8,x.list.length), init:{item:x.list},
      extras:[{k:'cut',label:'見直すと 1年で',f:'=SUMIF({c:ck}{F}:{c:ck}{L},1,{c:yr}{F}:{c:yr}{L})'}],
      cf:[{t:'bar',on:'yr',st:{bg:'orange'}},{t:'ck',row:1,on:'ck',st:{bg:'yellow'}}],
      note:'月額を入れると 1年分。☑ を付けた（見直す）分が 下に 出ます' };
  }},
  { id:'sales', re:/売上|売り上げ|収支|収入と支出|月ごと|月別|毎月の|年間|利益|経費/, not:/家計簿|かけいぼ/, build(x){
    const inc=/収支|収入|支出/.test(x.raw);
    const start=Math.max(1, Math.min(12, x.startMonth||1));
    const n=Math.max(1, Math.min(36, x.months||12));
    const months=Array.from({length:n},(_,i)=>((start-1+i)%12+1)+'月');
    const A=inc?'収入':'売上', B=inc?'支出':'経費', C=inc?'差額':'利益';
    return { name:inc?'月ごとの収支':'月ごとの売上', icon:'📈',
      cols:[{k:'m',h:'月'},{k:'a',h:A+'（円）',t:'yen',tot:'sum'},{k:'b',h:B+'（円）',t:'yen',tot:'sum'},{k:'c',h:C+'（円）',t:'yen',f:'=IF({c:a}{r}&{c:b}{r}="","",{c:a}{r}-{c:b}{r})',tot:'sum'},
            {k:'r',h:C+'率',t:'pct',f:'=IF({c:a}{r}="","",IF({c:a}{r}=0,"",ROUND({c:c}{r}/{c:a}{r},3)))'}],
      n, init:{m:months},
      extras:[{k:'avg',label:'1か月の平均（'+C+'）',f:'=IF(COUNT({c:c}{F}:{c:c}{L})=0,"",ROUND(AVERAGE({c:c}{F}:{c:c}{L}),0))'}],
      cf:[{t:'scale',on:'a',st:{bg:'green'}},{t:'neg',on:['c','r'],st:{fc:'red',b:1}}],
      note:A+'と'+B+'を入れると '+C+'と'+C+'率。'+A+'は 大きいほど 濃い緑、マイナスは 赤い字' };
  }},
  { id:'kakei', re:/家計簿|かけいぼ|支出|出費|おこづかい|お小遣い|小遣い帳|生活費の記録/, build(x){
    const cats=(x.list.length>=2 ? x.list : ['食費','日用品','光熱費','交通費','通信費','医療費','その他']).slice(0,10);
    return { name:'家計簿', icon:'📒',
      cols:[{k:'day',h:'日付',t:'date'},{k:'cat',h:'項目',t:'pk',o:cats},{k:'memo',h:'内容'},{k:'amt',h:'金額（円）',t:'yen',tot:'sum'}],
      n:x.n||20,
      extras:cats.slice(0,7).map((c,i)=>({k:'c'+i, label:c, f:'=SUMIF({c:cat}{F}:{c:cat}{L},"'+c.replace(/"/g,'')+'",{c:amt}{F}:{c:amt}{L})'}))
        .concat(x.budget?[{k:'bud',label:'予算',v:x.budget},{k:'left',label:'予算の残り',f:'={X:bud}-{T:amt}'}]:[]),
      cf:[{t:'bar',on:'amt',st:{bg:'blue'}}].concat(x.budget?[{t:'neg',ex:'left',st:{fc:'red',b:1}}]:[]),
      note:'項目は ▾ から えらべます。下に 項目ごとの合計が 出ます。金額は 棒で 大きさが 分かります' };
  }},
  { id:'warikan', re:/割り?勘|割勘|わりかん|精算|立て替え|立替|折半|飲み会|宴会|食事会|打ち上げ/, build(x){
    if(x.list.length>=2){
      return { name:'割り勘の精算', icon:'🤝',
        cols:[{k:'who',h:'名前'},{k:'paid',h:'払った金額（円）',t:'yen',tot:'sum'},{k:'diff',h:'精算（＋もらう／−払う）',t:'yen',f:'=IF({c:who}{r}="","",IF({X:per}="","",IF({c:paid}{r}="",0,{c:paid}{r})-{X:per}))'}],
        n:x.list.length, init:{who:x.list},
        extras:[{k:'ppl',label:'人数',f:'=COUNTIF({c:who}{F}:{c:who}{L},"?*")'},{k:'per',label:'1人あたり',f:'=IF({X:ppl}=0,"",IF({T:paid}=0,"",ROUNDUP({T:paid}/{X:ppl},0)))'}],
        cf:[{t:'neg',on:'diff',st:{fc:'red',b:1}},{t:'gt',v:0,on:'diff',st:{fc:'green',b:1}}],
        note:'それぞれ 払った金額を入れると、だれが いくら もらう／払う かが 出ます（1円未満は 切り上げ）' };
    }
    return { name:'割り勘', icon:'🤝',
      cols:[{k:'item',h:'項目'},{k:'amt',h:'金額（円）',t:'yen',tot:'sum'}],
      n:x.n && x.n<=MAXN && !x.ppl ? x.n : 6,
      extras:[{k:'ppl',label:'人数',v:x.ppl||''},{k:'per',label:'1人あたり',f:'=IF({X:ppl}="","",IF({T:amt}=0,"",ROUNDUP({T:amt}/{X:ppl},0)))'},{k:'over',label:'集めすぎ（おつり）',f:'=IF({X:per}="","",{X:per}*{X:ppl}-{T:amt})'}],
      note:'金額を入れると 合計と 1人あたり（切り上げ）が 出ます' };
  }},
  { id:'todo', re:/やること|やる事|todo|to do|タスク|宿題|課題|締め?切|〆切/i, build(x){
    return { name:'やること', icon:'✅',
      cols:[{k:'ck',h:'済',t:'ck'},{k:'task',h:'やること'},{k:'due',h:'期限',t:'date'},{k:'memo',h:'メモ'}],
      n:x.n||Math.max(10, x.list.length), init:{task:x.list},
      extras:[{k:'done',label:'済んだ数',f:'=COUNTIF({c:ck}{F}:{c:ck}{L},1)'},{k:'all',label:'ぜんぶ',f:'=COUNTIF({c:task}{F}:{c:task}{L},"?*")'},{k:'rest',label:'のこり',f:'={X:all}-{X:done}'}],
      cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}},{t:'past',row:1,on:'due',nock:'ck',st:{bg:'red'}},{t:'today',row:1,on:'due',nock:'ck',st:{bg:'yellow',b:1}},{t:'soon',n:3,on:'due',nock:'ck',st:{bg:'orange'}}],
      note:'期限が過ぎると 赤、今日は 黄色、3日のうちは 橙。☑ を付けると 灰色になります' };
  }},
  { id:'yosan', re:/予算|見積|費用|旅費/, build(x){
    return { name:'予算と実際', icon:'🧾',
      cols:[{k:'item',h:'項目'},{k:'plan',h:'予算（円）',t:'yen',tot:'sum'},{k:'act',h:'実際（円）',t:'yen',tot:'sum'},{k:'diff',h:'残り（円）',t:'yen',f:'=IF({c:plan}{r}&{c:act}{r}="","",{c:plan}{r}-{c:act}{r})',tot:'sum'}],
      n:x.n||Math.max(8,x.list.length), init:{item:x.list},
      extras:x.ppl?[{k:'ppl',label:'人数',v:x.ppl},{k:'per',label:'1人あたり（実際）',f:'=IF({X:ppl}="","",IF({T:act}=0,"",ROUNDUP({T:act}/{X:ppl},0)))'}]:[],
      cf:[{t:'neg',on:'diff',st:{fc:'red',b:1}},{t:'bar',on:'act',st:{bg:'blue'}}],
      note:'予算を こえた 項目は 残りが 赤い字に なります' };
  }},
  { id:'motimono', re:/持ち?物|もちもの|忘れ物|準備するもの|チェックリスト|旅行|キャンプ|遠足|入院/, build(x){
    return { name:'持ち物チェック', icon:'🎒',
      cols:[{k:'ck',h:'入れた',t:'ck'},{k:'item',h:'持ち物'},{k:'qty',h:'数',t:'num'},{k:'memo',h:'メモ'}],
      n:x.n||Math.max(12, x.list.length), init:{item:x.list},
      extras:[{k:'done',label:'入れた数',f:'=COUNTIF({c:ck}{F}:{c:ck}{L},1)'},{k:'all',label:'ぜんぶ',f:'=COUNTIF({c:item}{F}:{c:item}{L},"?*")'},{k:'rest',label:'のこり',f:'={X:all}-{X:done}'}],
      cf:[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}}],
      note:'☑ を付けると 灰色になり、のこりの数が へります' };
  }},
  { id:'attend', re:/出欠|出席|参加者|名簿|点呼|欠席|参加表/, build(x){
    const k=Math.max(1, Math.min(10, x.times||1));
    const cols=[{k:'who',h:'名前'}];
    for(let i=0;i<k;i++) cols.push({k:'a'+i, h:k>1?(i+1)+'回目':'出席', t:'ck', tot:'ck'});
    if(k>1) cols.push({k:'cnt', h:'出席の数', t:'num', f:'=IF({c:who}{r}="","",COUNTIF({c:a0}{r}:{c:a'+(k-1)+'}{r},1))', tot:'sum'});
    cols.push({k:'memo', h:'メモ'});
    return { name:'出欠表', icon:'🙋', cols, n:x.list.length||x.ppl||x.n||10, init:{who:x.list},
      extras:[{k:'all',label:'人数',f:'=COUNTIF({c:who}{F}:{c:who}{L},"?*")'}],
      cf:k>1?[{t:'scale',on:'cnt',st:{bg:'green'}}]:[],
      note:'出席は ☑ を 押すだけ。合計の行に ☑ の数が 出ます' };
  }},
  { id:'score', re:/成績|点数|テスト|試験|得点|スコア|通知表/, build(x){
    const SUBJ=/国語|算数|数学|英語|理科|社会|音楽|体育|図工|美術|家庭|技術|保健|道徳|生活|地理|歴史|公民|物理|化学|生物|リスニング|リーディング|筆記|実技|面接|小論文|[0-9]+回/;
    const subj=x.list.filter(s=>SUBJ.test(s));
    const subjects=subj.length>=2 ? subj : (x.list.length>=2 && !subj.length && /科目|教科/.test(x.raw) ? x.list : ['国語','数学','英語']);
    const names=(subj.length>=2 || /科目|教科/.test(x.raw)) ? [] : x.list;
    const cols=[{k:'who',h:'名前'}];
    subjects.slice(0,12).forEach((s,i)=>cols.push({k:'s'+i,h:s,t:'num',tot:'avg'}));
    const a=cols[1].k, b=cols[cols.length-1].k;
    cols.push({k:'sum',h:'合計',t:'num',f:'=IF(COUNT({c:'+a+'}{r}:{c:'+b+'}{r})=0,"",SUM({c:'+a+'}{r}:{c:'+b+'}{r}))',tot:'avg'});
    cols.push({k:'avg',h:'平均',t:'num',f:'=IF(COUNT({c:'+a+'}{r}:{c:'+b+'}{r})=0,"",ROUND(AVERAGE({c:'+a+'}{r}:{c:'+b+'}{r}),1))',tot:'avg'});
    const pass=x.pass!=null ? x.pass : 60;
    return { name:'成績表', icon:'📝', cols, n:names.length||x.ppl||x.n||10, init:{who:names}, totLabel:'平均',
      cf:[{t:'lt',v:pass,on:cols.slice(1,1+Math.min(12,subjects.length)).map(c=>c.k),st:{fc:'red',b:1}},{t:'top',n:3,on:'sum',st:{bg:'yellow',b:1}}],
      note:pass+'点より下は 赤い字、合計の 上位3人は 黄色。いちばん下の行は 平均です' };
  }},
  { id:'jikanwari', re:/時間割/, build(x){
    const days=/土/.test(x.raw) ? ['月','火','水','木','金','土'] : ['月','火','水','木','金'];
    const cols=[{k:'p',h:'時限'}].concat(days.map((d,i)=>({k:'d'+i,h:d})));
    const n=Math.max(1, Math.min(10, x.periods||6));
    return { name:'時間割', icon:'🏫', cols, n, init:{p:Array.from({length:n},(_,i)=>(i+1)+'時間目')}, note:'科目を入れるだけの 表です' };
  }},
  { id:'chokin', re:/貯金|貯蓄|積立|積み立て|残高|通帳|入出金|入金/, build(x){
    return { name:'貯金の記録', icon:'🐷',
      cols:[{k:'day',h:'日付',t:'date'},{k:'memo',h:'内容'},{k:'in',h:'入れた（円）',t:'yen',tot:'sum'},{k:'out',h:'出した（円）',t:'yen',tot:'sum'},
            {k:'bal',h:'残高（円）',t:'yen',f:'=IF({c:in}{r}&{c:out}{r}="","",SUM({c:in}{F}:{c:in}{r})-SUM({c:out}{F}:{c:out}{r}))'}],
      n:x.n||20,
      extras:[{k:'now',label:'いまの残高',f:'={T:in}-{T:out}'}].concat(x.goal?[{k:'goal',label:'目標',v:x.goal},{k:'left',label:'目標まで あと',f:'=IF({X:goal}="","",{X:goal}-{X:now})'}]:[]),
      cf:[{t:'bar',on:'bal',st:{bg:'green'}}],
      note:'入れた・出した を 入れると 残高が 出ます。残高は 棒で 増え方が 分かります' };
  }},
  { id:'zaiko', re:/在庫|ストック|備品|発注|仕入/, build(x){
    return { name:'在庫', icon:'📦',
      cols:[{k:'item',h:'品名'},{k:'now',h:'いまの数',t:'num'},{k:'min',h:'これより少ないと注文',t:'num'},{k:'st',h:'状態',f:'=IF({c:now}{r}="","",IF({c:now}{r}<{c:min}{r},"注文する","OK"))'},{k:'memo',h:'メモ'}],
      n:x.n||Math.max(10,x.list.length), init:{item:x.list},
      extras:[{k:'need',label:'注文する数',f:'=COUNTIF({c:st}{F}:{c:st}{L},"注文する")'}],
      cf:[{t:'eq',v:'注文する',row:1,on:'st',st:{bg:'red',b:1}}],
      note:'いまの数が 決めた数より 少ないと「注文する」と出て 行が 赤くなります' };
  }},
  { id:'kintai', re:/勤務|シフト|バイト|アルバイト|時給|給料|労働時間|働いた時間|パート/, build(x){
    return { name:'働いた時間と給料', icon:'⏱️',
      cols:[{k:'day',h:'日付',t:'date'},{k:'h',h:'時間（h）',t:'num',tot:'sum'},{k:'pay',h:'給料（円）',t:'yen',f:'=IF({c:h}{r}="","",ROUNDDOWN({c:h}{r}*{X:wage},0))',tot:'sum'},{k:'memo',h:'メモ'}],
      n:x.n||x.days||20,
      extras:[{k:'wage',label:'時給（円）',v:x.wage||''},{k:'days',label:'働いた日',f:'=COUNT({c:h}{F}:{c:h}{L})'}],
      cf:[{t:'bar',on:'h',st:{bg:'blue'}}],
      note:'時給を下に入れて、働いた時間（1時間半なら 1.5）を入れると 給料が 出ます' };
  }},
  { id:'kenko', re:/体重|ダイエット|血圧|歩数|体温|睡眠|記録表?|日記/, build(x){
    const n=x.days||x.n||(x.months?Math.min(MAXN, x.months*30):14);
    const t0=(typeof todaySerial==='function') ? todaySerial() : null;
    const days=t0!=null ? Array.from({length:n},(_,i)=>String(t0+i)) : [];
    if(/血圧/.test(x.raw)) return { name:'血圧の記録', icon:'🩺',
      cols:[{k:'day',h:'日付',t:'date'},{k:'hi',h:'最高',t:'num',tot:'avg'},{k:'lo',h:'最低',t:'num',tot:'avg'},{k:'pulse',h:'脈拍',t:'num',tot:'avg'},{k:'memo',h:'メモ'}],
      n, init:{day:days}, totLabel:'平均',
      cf:[{t:'ge',v:135,on:'hi',st:{fc:'red',b:1}},{t:'ge',v:85,on:'lo',st:{fc:'red',b:1}}],
      note:'最高135・最低85 以上は 赤い字（家で はかる ときの 目安）。いちばん下は 平均です' };
    if(/歩数/.test(x.raw)) return { name:'歩数の記録', icon:'🚶',
      cols:[{k:'day',h:'日付',t:'date'},{k:'v',h:'歩数',t:'num',tot:'sum'},{k:'memo',h:'メモ'}],
      n, init:{day:days}, extras:[{k:'avg',label:'1日の平均',f:'=IF(COUNT({c:v}{F}:{c:v}{L})=0,"",ROUND(AVERAGE({c:v}{F}:{c:v}{L}),0))'}],
      cf:[{t:'bar',on:'v',st:{bg:'green'}},{t:'above',on:'v',st:{b:1}}],
      note:'歩数は 棒で、平均より 多い日は 太字に なります' };
    if(/体重|ダイエット/.test(x.raw)) return { name:'体重の記録', icon:'⚖️',
      cols:[{k:'day',h:'日付',t:'date'},{k:'v',h:'体重（kg）',t:'num',tot:'avg'},{k:'diff',h:'前の日との差',t:'num',f:'=IF({c:v}{r}="","",IF({c:v}{r-1}="","",ROUND({c:v}{r}-{c:v}{r-1},1)))',first:''},{k:'memo',h:'メモ'}],
      n, init:{day:days}, totLabel:'平均',
      extras:x.goal?[{k:'goal',label:'目標（kg）',v:x.goal}]:[],
      cf:[{t:'neg',on:'diff',st:{fc:'green',b:1}},{t:'gt',v:0,on:'diff',st:{fc:'red'}}],
      note:'へった日は 緑、ふえた日は 赤い字。いちばん下は 平均です' };
    return { name:'記録', icon:'🗓️',
      cols:[{k:'day',h:'日付',t:'date'},{k:'what',h:'内容'},{k:'v',h:'数',t:'num',tot:'sum'},{k:'memo',h:'メモ'}],
      n, init:{day:days}, cf:[{t:'bar',on:'v',st:{bg:'blue'}}], note:'日付は 今日から 入れてあります' };
  }},
  { id:'kondate', re:/献立|こんだて|メニュー表|食事の予定|弁当/, build(x){
    const days=['月','火','水','木','金','土','日'];
    return { name:'1週間の献立', icon:'🍱',
      cols:[{k:'d',h:'曜日'},{k:'a',h:'朝'},{k:'b',h:'昼'},{k:'c',h:'夜'},{k:'buy',h:'買う物'}],
      n:7, init:{d:days}, note:'献立と 買う物を 入れる 表です' };
  }},
  { id:'sched', re:/日程|スケジュール|予定表|予定|カレンダー|週間/, build(x){
    const n=x.days||x.n||(/週間/.test(x.raw) ? (num(x.raw,/([0-9]+)\s*週間/)||1)*7 : 14);
    const t0=(typeof todaySerial==='function') ? todaySerial() : null;
    return { name:'予定表', icon:'📅',
      cols:[{k:'day',h:'日付',t:'date',d:'wday'},{k:'what',h:'予定'},{k:'where',h:'場所・メモ'}],
      n:Math.min(MAXN,n), init:{day:t0!=null?Array.from({length:Math.min(MAXN,n)},(_,i)=>String(t0+i)):[]},
      cf:[{t:'today',row:1,on:'day',st:{bg:'yellow',b:1}},{t:'past',row:1,on:'day',st:{fc:'gray'}}],
      note:'日付は 今日から（曜日つき）。今日の行は 黄色、過ぎた日は 灰色の字' };
  }},
  { id:'hikaku', re:/比較|比べ|くらべ|検討/, build(x){
    const opts=x.list.length>=2 ? x.list.slice(0,8) : ['A案','B案','C案'];
    const cols=[{k:'item',h:'くらべる点'}].concat(opts.map((o,i)=>({k:'o'+i,h:o,t:'num',tot:'sum'})));
    return { name:'くらべる表', icon:'⚖️', cols, n:x.n||6, init:{item:['値段','使いやすさ','見た目','大きさ','長持ち','そのほか']}, totLabel:'点数の合計',
      cf:[{t:'top',n:1,on:opts.map((o,i)=>'o'+i),st:{bg:'green',b:1}}],
      note:'それぞれ 点数（例 1〜5）を 入れると 合計で くらべられます。行ごとの いちばんは 緑' };
  }},
];

const RECIPES=NEW_RECIPES.concat(RECIPES0);

/* ふつうの表（並びが あれば 見出しに）：「名前・電話・住所の表」「品名と値段と数」 */
const NUMH=/金額|円|価格|値段|料金|代|費|額|数|量|点|時間|kg|キロ|グラム|g$|cm|m$|個|本|枚|回|歩|売上|残高|合計|単価|年齢|才|歳|%|率/;
function generic(x){
  if(x.list.length<2) return null;
  const cols=[];
  if(x.check) cols.push({k:'ck',h:'☑',t:'ck',tot:'ck'});
  x.list.slice(0,20).forEach((h,i)=>{
    const isNum=NUMH.test(h), isDate=/日付|日にち|月日|期限|締切/.test(h);
    cols.push({k:'g'+i, h, t:isDate?'date':isNum?(/円|金額|価格|値段|料金|代|費|額|売上|残高|単価/.test(h)?'yen':'num'):'text', tot:(isNum && !/年齢|才|歳|%|率|単価/.test(h))?'sum':''});
  });
  const sp={ name:'表', icon:'▦', cols, n:x.n||10, note:'見出しの 下に 入れていく 表です（数の列は 合計が 出ます）' };
  if(x.check) sp.cf=[{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}}];
  return sp;
}

/* ───────── ことばを 読む ───────── */
function parse(text){
  const raw=norm(text);
  if(!raw) return null;
  const x={raw, list:listOf(raw)};
  x.ppl=num(raw,/([0-9]+)\s*(?:人|名)/);
  x.n=num(raw,/([0-9]+)\s*(?:行|件|品|項目|つ|個分)/);
  x.months=num(raw,/([0-9]+)\s*(?:か月|ヶ月|ケ月|カ月|箇月|ヵ月|月分)/) || (/1年|一年|年間|12ヶ月/.test(raw) ? 12 : /半年/.test(raw) ? 6 : null);
  x.startMonth=num(raw,/([0-9]+)\s*月\s*(?:から|始まり|はじまり|スタート)/);
  x.days=num(raw,/([0-9]+)\s*日(?:分|間)?(?!付)/) || ((num(raw,/([0-9]+)\s*週間/))||0)*7 || null;
  x.times=num(raw,/([0-9]+)\s*回/);
  x.periods=num(raw,/([0-9]+)\s*(?:時限|限|時間目)/);
  x.budget=num(raw,/予算\s*(?:は|が)?\s*([0-9.]+)\s*円?/) || num(raw,/([0-9.]+)\s*円\s*(?:まで|以内)/);
  x.goal=num(raw,/目標\s*(?:は|が)?\s*([0-9.]+)/);
  x.wage=num(raw,/時給\s*(?:は|が)?\s*([0-9]+)/);
  x.pass=num(raw,/([0-9]+)\s*点\s*(?:未満|より下|以下|で赤)/);
  x.check=/チェック|☑|✓|済み?|できた/.test(raw);
  x.yen=num(raw,/([0-9.]+)\s*円/);
  { let k=raw; x.list.slice().sort((a,b)=>b.length-a.length).forEach(it=>{ k=k.split(it).join(' '); }); x.key=k; }   // 並べた 言葉を 外した 文（v679）
  if(x.n!=null) x.n=Math.max(1, Math.min(MAXN, Math.round(x.n)));
  // 名前の 並びなら 人数にも
  if(!x.ppl && x.list.length>=2 && /人|名前|メンバー|みんな|割り?勘|出欠|出席/.test(raw)) x.ppl=x.list.length;
  for(const rc of RECIPES){
    if(rc.re.test(rc.kw ? x.key : raw) && !(rc.not && rc.not.test(raw))){
      const sp=rc.build(x);
      if(sp){ sp.id=rc.id; return addMods(sp, x); }
    }
  }
  const g=generic(x);
  return g ? Object.assign(g,{id:'generic'}) : null;
}
/* 言い方の おまけ：「チェック付き」なのに ☑ が 無ければ 先頭に 足す */
function addMods(sp, x){
  if(x.check && !sp.cols.some(c=>c.t==='ck') && !/チェックリスト/.test(x.raw)){
    sp.cols.unshift({k:'ck',h:'☑',t:'ck',tot:sp.cols.some(c=>c.tot)?'ck':''});
    sp.cf=(sp.cf||[]).concat([{t:'ck',row:1,on:'ck',st:{fc:'gray',s:1}}]);
  }
  sp.n=Math.max(1, Math.min(MAXN, sp.n|0 || 10));
  return sp;
}

/* ───────── 形 → セルの 中身 ───────── */
function layout(sp){
  const A=i=>ALPHA[i];
  const ci={}; sp.cols.forEach((c,i)=>ci[c.k]=i);
  const n=sp.n, F=2, L=n+1;
  const hasTot=sp.cols.some(c=>c.tot);
  const totR=hasTot ? n+1 : -1;              // 0 から 数えた 行
  const ex=(sp.extras||[]).filter(Boolean);
  const exR0=(hasTot ? n+2 : n+1) + (ex.length ? 1 : 0);   // 1行 あけて 下の 欄
  const lc=sp.cols.findIndex(c=>c.t!=='ck'); const labC=lc<0?0:lc;
  const valC=Math.max(labC+1, (()=>{ for(let i=sp.cols.length-1;i>=0;i--) if(/yen|num|pct/.test(sp.cols[i].t||'') ) return i; return labC+1; })());
  const exRow={}; ex.forEach((e,i)=>exRow[e.k]=exR0+i);
  const totalRows=ex.length ? exR0+ex.length : (hasTot ? n+2 : n+1);
  const ncols=Math.max(sp.cols.length, valC+1, 2);
  const sub=(f, r)=>String(f)
    .replace(/\{r-1\}/g, String(r))            // r は 0 から。{r} は r+1、{r-1} は r
    .replace(/\{r\}/g, String(r+1))
    .replace(/\{F\}/g, String(F)).replace(/\{L\}/g, String(L))
    .replace(/\{c:([a-z0-9]+)\}/g, (m,k)=>ci[k]!=null ? A(ci[k]) : 'A')
    .replace(/\{T:([a-z0-9]+)\}/g, (m,k)=>ci[k]!=null && totR>=0 ? A(ci[k])+(totR+1) : '0')
    .replace(/\{X:([a-z0-9]+)\}/g, (m,k)=>exRow[k]!=null ? A(valC)+(exRow[k]+1) : '0');
  const grid=Array.from({length:totalRows}, ()=>Array(ncols).fill(''));
  const styles={};
  const H={bold:true, bg:'#d5e8d4', color:'#1e5631', align:'center'};
  sp.cols.forEach((c,i)=>{
    grid[0][i]=c.h; styles['0,'+i]=Object.assign({},H);
    const init=(sp.init && sp.init[c.k]) || [];
    for(let r=1;r<=n;r++){
      let v='';
      if(c.f!=null){ v=(r===1 && c.first!=null) ? c.first : sub(c.f, r); }
      else if(init[r-1]!=null) v=String(init[r-1]);
      grid[r][i]=v;
      const s={};
      if(c.t==='yen') s.nf='comma';
      if(c.t==='pct') s.nf='pct';
      if(c.t==='date') s.dfmt=c.d||'md';
      if(c.t==='ck') s.align='center';
      if(Object.keys(s).length) styles[r+','+i]=s;
    }
  });
  if(totR>=0){
    const R=totR, rng=k=>A(ci[k])+F+':'+A(ci[k])+L;
    grid[R][labC]=sp.totLabel||'合計';
    for(let i=0;i<ncols;i++) styles[R+','+i]={bold:true, bg:'#fff2cc', color:'#7d4e00'};
    sp.cols.forEach((c,i)=>{
      if(!c.tot || i===labC) return;
      const g=rng(c.k);
      grid[R][i]= c.tot==='sum' ? '=SUM('+g+')' : c.tot==='avg' ? '=IF(COUNT('+g+')=0,"",ROUND(AVERAGE('+g+'),1))' : c.tot==='ck' ? '="☑"&COUNTIF('+g+',1)' : '';
      if(c.t==='yen') styles[R+','+i].nf='comma';
      if(c.tot==='ck') styles[R+','+i].align='center';
    });
  }
  ex.forEach(e=>{
    const R=exRow[e.k];
    grid[R][labC]=e.label; styles[R+','+labC]={bold:true, align:'left'};
    if(labC+1<valC){ styles[R+','+labC].merge={rs:1, cs:valC-labC}; for(let x=labC+1;x<valC;x++) styles[R+','+x]={cover:R+','+labC}; }
    if(e.f!=null){ grid[R][valC]=sub(e.f, R); styles[R+','+valC]={bold:true, bg:'#fff2cc', color:'#7d4e00', nf:'comma'}; }
    else { grid[R][valC]=e.v==null?'':String(e.v); styles[R+','+valC]={bg:'#ddeefc', color:'#12324f', nf:'comma'}; }
  });
  const ct={};
  sp.cols.forEach((c,i)=>{
    if(c.t==='ck') ct[i]={k:'ck', r1:1, r2:n, rg:1};
    if(c.t==='pk') ct[i]={k:'pk', r1:1, r2:n, rg:1, o:(c.o||[]).slice(0,40)};
  });
  const cf=[];
  (sp.cf||[]).forEach(q=>{
    const ru=Object.assign({}, q); delete ru.on; delete ru.ex; delete ru.lab;
    ru.st=Object.assign({}, q.st||{});
    if(!Object.keys(ru.st).length) return;
    if(q.ex){ const R=exRow[q.ex]; if(R==null) return; Object.assign(ru,{r1:R, r2:R, c1:valC, c2:valC}); cf.push(ru); return; }
    const ons=Array.isArray(q.on) ? q.on : [q.on];
    const idx=ons.map(k=>ci[k]).filter(v=>v!=null);
    if(!idx.length) return;
    if(q.nock!=null){ if(ci[q.nock]!=null) ru.nock=ci[q.nock]; else delete ru.nock; }
    if(q.row){ Object.assign(ru,{r1:1, r2:n, c1:0, c2:sp.cols.length-1, kc:idx[0]}); cf.push(ru); return; }
    if(ru.t==='top' && idx.length>1){   // 行ごとの いちばん（くらべる表）
      for(let r=1;r<=n;r++) cf.push(Object.assign({}, ru, {r1:r, r2:r, c1:Math.min(...idx), c2:Math.max(...idx)}));
      return;
    }
    const lo=Math.min(...idx), hi=Math.max(...idx);
    if(hi-lo+1===idx.length) cf.push(Object.assign(ru,{r1:1, r2:n, c1:lo, c2:hi}));
    else idx.forEach(c=>cf.push(Object.assign({}, ru, {r1:1, r2:n, c1:c, c2:c})));
  });
  return {grid, styles, ct, cf, rows:totalRows, cols:ncols, firstInput:[1, sp.cols.findIndex(c=>c.f==null && c.t!=='ck' && !(sp.init&&sp.init[c.k]&&sp.init[c.k].length))], totR, n};
}

/* ───────── 窓 ───────── */
const EXAMPLES=['3人で割り勘','家計簿','牛乳、卵、パン、バナナの買い物リスト','12か月の売上','4月から1年間の収支','やること（期限つき）',
  '田中、佐藤、鈴木の出欠表 4回','国語、数学、英語、理科の成績表 5人','旅行の持ち物','1か月の体重の記録','時給1100円のバイトの給料','在庫の表','貯金 目標30万','サブスクの月額','名前・電話・住所の表',
  '請求書の明細','税込の価格表','どっちがお得','光熱費の記録','燃費の記録','交通費の精算','投資の損益','お祝いのお返し','年賀状','医療費控除','薬の飲み忘れ','睡眠の記録','筋トレの記録','勉強時間','習慣チェック 早起き、運動、読書','お手伝いのがんばり表','町内会費の集金 1000円','田中、佐藤、鈴木の掃除当番','旅行の行程','結婚式の招待客','田中、佐藤、鈴木、高橋の総当たり','カレーのレシピ 2人分を5人分','賞味期限','更新日の一覧','欲しい物リスト','読書の記録','作業日報'];
const CSS=`
#hgOverlay .modal.mk-modal{ max-width:520px; max-height:90vh; display:flex; flex-direction:column; }
.mk-body{ padding:12px 14px calc(14px + var(--safe-bottom,0px)); overflow:auto; color:var(--text); font-size:14px; line-height:1.55; }
.mk-in{ display:flex; gap:6px; }
.mk-in input{ flex:1; min-width:0; min-height:46px; padding:8px 12px; font-size:16px; border-radius:var(--r-btn); border:1px solid var(--save-item-border); background:var(--cell-bg); color:var(--text); }
.mk-in button{ flex:none; min-width:46px; min-height:46px; border-radius:var(--r-btn); border:1px solid var(--save-item-border); background:var(--cell-hover); color:var(--text); font-size:18px; cursor:pointer; }
.mk-in button.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-size:14px; font-weight:bold; padding:0 12px; }
.mk-in button.rec{ background:var(--danger); border-color:var(--danger); color:#fff; }
.mk-lead{ margin:0 0 8px; font-size:13px; color:var(--text-sub); }
.mk-ex{ display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
.mk-ex button{ min-height:34px; padding:4px 10px; border-radius:999px; border:1px solid var(--save-item-border); background:transparent; color:var(--text); font-size:13px; cursor:pointer; }
.mk-sec{ margin:14px 0 6px; font-size:12.5px; font-weight:bold; color:var(--text-sub); }
.mk-pv{ overflow:auto; border:1px solid var(--save-item-border); border-radius:var(--r-card); max-height:42vh; }
.mk-pv table{ border-collapse:collapse; font-size:12.5px; min-width:100%; }
.mk-pv td{ border:1px solid var(--save-item-border); padding:3px 6px; white-space:nowrap; height:24px; color:#222; background:#fff; }
body.dark .mk-pv td{ color:var(--text); background:var(--cell-bg); }
.mk-pv td.h{ font-weight:bold; text-align:center; background:#d5e8d4; color:#1e5631; }
.mk-pv td.t{ font-weight:bold; background:#fff2cc; color:#7d4e00; }
.mk-pv td.f{ color:#7d4e00; font-style:italic; }
.mk-pv td.i{ background:#ddeefc; color:#12324f; }
.mk-pv td.ck{ text-align:center; } .mk-pv td.dot{ text-align:center; color:var(--text-sub); }
.mk-feat{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.mk-feat span{ font-size:12.5px; padding:3px 8px; border-radius:6px; background:var(--cell-hover); color:var(--text); }
.mk-note{ margin-top:8px; font-size:13px; color:var(--text-sub); }
.mk-none{ padding:10px; border-radius:var(--r-card); background:var(--cell-hover); font-size:13.5px; }
.mk-acts{ display:flex; gap:6px; justify-content:flex-end; flex-wrap:wrap; margin-top:14px; }
.mk-acts button{ min-height:42px; padding:6px 14px; border-radius:var(--r-btn); border:1px solid var(--save-item-border); background:var(--cell-hover); color:var(--text); font-size:14px; font-weight:bold; cursor:pointer; }
.mk-acts button.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.mk-acts .left{ margin-right:auto; }
`;
let cur=null, rec=null;
function ensureDom(){
  if($('hgOverlay')) return;
  const stl=document.createElement('style'); stl.id='hgStyle'; stl.textContent=CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="hgOverlay">
  <div class="modal mk-modal" role="dialog" aria-modal="true" aria-labelledby="hgTitle">
    <div class="modal-header"><span id="hgTitle">✨ ことばで表を作る</span><button class="modal-close" onclick="HG.close()" aria-label="閉じる">✕</button></div>
    <div class="mk-body">
      <p class="mk-lead">作りたい表を ことばで 書くか 🎤 で 話してください。見出し・式・合計・☑・色の決まりまで 入れた 表に します。</p>
      <div class="mk-in"><input id="hgQ" type="text" enterkeyhint="go" autocomplete="off" placeholder="例：3人で割り勘・家計簿・12か月の売上"><button type="button" id="hgMic" onclick="HG.mic()" aria-label="話して入れる" title="話して入れる">🎤</button><button type="button" class="pri" onclick="HG.go()">見本</button></div>
      <div id="hgOut"></div>
    </div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof bindBackdropClose==='function') bindBackdropClose('hgOverlay', ()=>close());
  const q=$('hgQ');
  q.addEventListener('keydown', e=>{ e.stopPropagation(); if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); go(); } });
  q.addEventListener('input', ()=>{ clearTimeout(q._t); q._t=setTimeout(()=>{ if(q.value.trim()) go(true); else exList(); }, 450); });
}
function exList(){
  cur=null;
  $('hgOut').innerHTML='<div class="mk-sec">たとえば（押すと 見本が 出ます）</div><div class="mk-ex">'+EXAMPLES.map((e,i)=>`<button type="button" onclick="HG.ex(${i})">${esc(e)}</button>`).join('')+'</div>';
}
function open(q){
  ensureDom();
  const inp=$('hgQ'); inp.value=q||'';
  if(!isDlgOpen('hgOverlay')) openDlg('hgOverlay', ()=>{ micStop(); });
  if(q) go(); else exList();
  if(!q) setTimeout(()=>{ try{ inp.focus({preventScroll:true}); }catch(_){} }, 60);
}
function close(){ micStop(); if($('hgOverlay')) closeDlg('hgOverlay'); }
function ex(i){ const q=$('hgQ'); q.value=EXAMPLES[i]||''; go(); }
function feats(sp, lay){
  const a=[];
  const ck=sp.cols.filter(c=>c.t==='ck').length, pk=sp.cols.find(c=>c.t==='pk');
  const fx=sp.cols.filter(c=>c.f!=null).map(c=>c.h);
  if(fx.length) a.push('ƒx '+fx.join('・')+' は 式');
  if(lay.totR>=0) a.push('Σ '+(sp.totLabel||'合計')+'の行');
  if(ck) a.push('☑ チェック'+(ck>1?'×'+ck:''));
  if(pk) a.push('▾ '+pk.h+'は えらぶ（'+pk.o.slice(0,3).join('／')+(pk.o.length>3?'…':'')+'）');
  const CFN={neg:'マイナスは赤',ck:'☑ は灰色',past:'期限切れは赤',today:'今日は黄色',soon:'もうすぐは橙',scale:'色の濃さ',bar:'棒',top:'上位に色',bot:'小さいものに色',lt:'低い点は赤',ge:'高いと赤',gt:'プラスに色',eq:'注文は赤',has:'字に色',above:'平均より上',below:'平均より下',unck:''};
  const cs=[...new Set((sp.cf||[]).map(q=>q.lab||CFN[q.t]).filter(Boolean))];
  if(cs.length) a.push('🎨 '+cs.join('・'));
  if(sp.extras && sp.extras.length) a.push('下に '+sp.extras.map(e=>e.label).slice(0,4).join('・')+(sp.extras.length>4?' など':''));
  return a;
}
function preview(sp, lay){
  const show=Math.min(lay.n, 5);
  const rowsIdx=[0]; for(let r=1;r<=show;r++) rowsIdx.push(r);
  const more=lay.n>show;
  const cells=(r)=>lay.grid[r].map((v,c)=>{
    const s=lay.styles[r+','+c]||{};
    if(s.cover) return '';
    const col=sp.cols[c]||{};
    let t=String(v==null?'':v), cls='';
    if(r===0) cls='h';
    else if(r===lay.totR) cls='t';
    else if(r>lay.n){ cls=t.startsWith('=')?'t':(c>0 && t===''?'i':''); }
    if(r>0 && r<=lay.n && col.t==='ck'){ t='☐'; cls='ck'; }
    else if(r>0 && r<=lay.n && col.t==='pk' && t===''){ t='▾'; cls='dot'; }
    else if(r>0 && r<=lay.n && col.t==='date' && /^[0-9]+$/.test(t) && typeof formatDate==='function'){ t=formatDate(Number(t), col.d||'md'); }
    if(t.startsWith('=')){ t=(r===lay.totR||r>lay.n)?'（計算）':'（式）'; if(r<=lay.n) cls='f'; }
    const sp2=s.merge ? ` colspan="${s.merge.cs}"` : '';
    return `<td class="${cls}"${sp2}>${esc(t)}</td>`;
  }).join('');
  let h='<table>';
  rowsIdx.forEach(r=>{ h+='<tr>'+cells(r)+'</tr>'; });
  if(more) h+='<tr>'+lay.grid[0].map(()=>'<td class="dot">⋮</td>').join('')+'</tr>';
  for(let r=lay.n+1;r<lay.rows;r++){ if(lay.grid[r].every(v=>v==='')) continue; h+='<tr>'+cells(r)+'</tr>'; }
  return h+'</table>';
}
function go(quiet){
  const q=$('hgQ').value.trim();
  if(!q){ exList(); return; }
  const sp=parse(q);
  const out=$('hgOut');
  if(!sp){
    cur=null;
    if(quiet && out.querySelector('.mk-pv')) return;   // 打っている 途中は 前の 見本を 残す
    out.innerHTML=`<div class="mk-sec">見本</div><div class="mk-none">「${esc(q)}」から 表の形が 分かりませんでした。<br>「家計簿」「割り勘」「買い物」「やること」「成績」のような ことばか、「名前・電話・住所の表」のように 見出しを「・」や「、」で 区切って 入れてください。</div>`
      +'<div class="mk-ex" style="margin-top:8px">'+EXAMPLES.slice(0,8).map((e,i)=>`<button type="button" onclick="HG.ex(${i})">${esc(e)}</button>`).join('')+'</div>';
    return;
  }
  const lay=layout(sp);
  cur={sp, lay, q};
  const empty=(typeof isSheetEmpty==='function') ? isSheetEmpty() : false;
  out.innerHTML=`<div class="mk-sec">見本：${esc(sp.icon||'')} ${esc(sp.name)}（${lay.n}行${lay.n>5?'。ここでは はじめの 5行':''}）</div>
    <div class="mk-pv">${preview(sp, lay)}</div>
    <div class="mk-feat">${feats(sp, lay).map(f=>`<span>${esc(f)}</span>`).join('')}</div>
    ${sp.note?`<div class="mk-note">${esc(sp.note)}</div>`:''}
    <div class="mk-acts">
      <button type="button" class="left" onclick="HG.ex(-1)">↺ ほかの例</button>
      <button type="button" ${empty?'':'class="pri"'} onclick="HG.make('new')">＋ 新しいシートに作る</button>
      <button type="button" ${empty?'class="pri"':''} onclick="HG.make('here')">${empty?'この表に作る':'いまの表を 入れかえる'}</button>
    </div>
    ${empty?'':'<div class="mk-note">「いまの表を 入れかえる」は、前の表を ↶戻る で 元に 戻せます。</div>'}`;
}
function uniqName(base){
  const names=(typeof sheets!=='undefined' && sheets) ? sheets.map(s=>s.name) : [];
  if(names.indexOf(base)<0) return base;
  for(let i=2;i<100;i++){ const n=base+i; if(names.indexOf(n)<0) return n; }
  return base;
}
/* 作る：where＝'new'（新しいシート）・'here'（いまのシート） */
function make(where){
  if(!cur) return;
  const {sp, lay}=cur;
  close();
  setTimeout(()=>apply(sp, lay, where), 0);
}
function apply(sp, lay, where){
  if(where==='new' && typeof addSheet==='function' && typeof sheets!=='undefined'){
    if(sheets.length>=30){ toast('シートは これ以上 ふやせません（30まで）。「いまの表を 入れかえる」で 作れます'); return; }
    addSheet();
    sheets[curSheet].name=uniqName(sp.name).slice(0,20);
  } else {
    pushSnapshot('ことばで表を作る「'+sp.name+'」');
    if(typeof sheets!=='undefined' && sheets[curSheet] && /^シート[0-9]+$/.test(sheets[curSheet].name||'')) sheets[curSheet].name=uniqName(sp.name).slice(0,20);   // 名前を 付けて いない シートは 表の 名前に
  }
  if(typeof captureMode==='function') captureMode(tableMode);
  tableMode='normal';
  document.body.classList.remove('simple-mode');
  for(let r=0;r<MAXROWS;r++) for(let c=0;c<MAXCOLS;c++) data[r][c]='';
  cellStyles={};
  lay.grid.forEach((row,r)=>row.forEach((v,c)=>{ if(r<MAXROWS && c<MAXCOLS) data[r][c]=v; }));
  for(const k in lay.styles) cellStyles[k]=lay.styles[k];
  if(Object.keys(lay.ct).length) cellStyles._ct=lay.ct;
  if(lay.cf.length) cellStyles._cf=lay.cf;
  colWidths={}; rowHeights={}; if(typeof saveSheetSizes==='function') saveSheetSizes();
  ROWS=Math.max(2, Math.min(MAXROWS, lay.rows));
  COLS=Math.max(2, Math.min(MAXCOLS, lay.cols));
  try{ localStorage.setItem('excalc_rows',ROWS); localStorage.setItem('excalc_cols',COLS); }catch(_){}
  if(typeof hideAllBars==='function') hideAllBars();
  syncRowColLabels();
  buildSheet();
  if(typeof recalcAll==='function') recalcAll();
  const fc=lay.firstInput[1];
  sel(1, fc>=0 ? fc : 0);
  if(typeof updateModeButton==='function') updateModeButton();
  if(typeof renderSheetBar==='function') renderSheetBar();
  persistModes();
  if(typeof saveSheets==='function') saveSheets();
  // 新しい 画面で まだ 一覧に ない 表なら、表の 名前（例「家計簿」）で 一覧に 残す（Book1 に しない）
  try{
    if(typeof ui2On!=='undefined' && ui2On && currentSaveId==null && typeof autoRecSave==='function'){
      const used=new Set(getSaves().map(x=>String(x.name).trim()));
      autoRecSave(used.has(sp.name) ? nextCopyName(sp.name, getSaves()) : sp.name);
    }
  }catch(_){}
  toast('✨「'+sp.name+'」を作りました'+(where==='new'?'（新しいシート）':'（前の表は ↶戻る で戻せます）'), 3600);
}

/* ───────── 🎤 話して 入れる ───────── */
function micStop(){ if(rec){ try{ rec.abort(); }catch(_){} rec=null; } const b=$('hgMic'); if(b) b.classList.remove('rec'); }
function mic(){
  if(rec){ micStop(); return; }
  const SR=window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ toast('この ブラウザでは 声で 入れられません（Chrome で 使えます）'); return; }
  const r=new SR(); rec=r;
  r.lang='ja-JP'; r.interimResults=true; r.maxAlternatives=1;
  const b=$('hgMic'); if(b) b.classList.add('rec');
  r.onresult=e=>{
    let t=''; for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript;
    const q=$('hgQ'); if(q) q.value=t.replace(/[。．]$/,'');
    if(e.results[e.results.length-1].isFinal){ micStop(); go(); }
  };
  r.onerror=e=>{ micStop(); if(e && e.error==='not-allowed') toast('マイクが 使えません（ブラウザの 設定で マイクを 許可してください）'); };
  r.onend=()=>{ if(rec===r){ micStop(); if($('hgQ') && $('hgQ').value.trim()) go(); } };
  try{ r.start(); }catch(_){ micStop(); }
}

window.HG={ open, close, go, ex:(i)=>{ if(i<0){ const q=$('hgQ'); q.value=EXAMPLES[Math.floor(Math.random()*EXAMPLES.length)]; go(); } else ex(i); }, make, mic,
  /* テスト用 */ parse, layout, norm, listOf, apply:(q,where)=>{ const sp=parse(q); if(!sp) return false; apply(sp, layout(sp), where||'here'); return true; }, examples:EXAMPLES, cur:()=>cur };
})();
