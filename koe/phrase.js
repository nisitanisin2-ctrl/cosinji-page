/* ════════════════════════════════════════════════════════════════
   声の計算帳・表電卓（電卓モードの声）で共通に使う「いろいろな言い方」の読み取り（v6）
   KoePhrase.norm(文字)            … 話し言葉をそろえる（漢数字・札や玉・「2時間半」など）
   KoePhrase.match(文字, {tax, today, normed})
                                   … 決まった言い回し（型）に合えば {say, a, f, v, u, cls} を返す。合わなければ null
                                     式として読めるもの（「8と3の差」など）は toks も付ける（声の計算帳が言い直しに使う）
   KoePhrase.stats()               … 型の数と、数字・単位の付け方を除いた言い回しの数
   ここを直すと、声の計算帳と表電卓の両方に効く。
   ════════════════════════════════════════════════════════════════ */
(function(root){
'use strict';
let OPT={tax:10, today:()=>new Date()};
const settings={ get tax(){ return OPT.tax; } };
const taxF=()=>1+(+OPT.tax)/100;
/* 消費税の1円未満（表電卓の電卓から round を渡されたときだけ 円にそろえる。声の計算帳では そのまま）v565 */
const TAX_RN={down:'切り捨て', round:'四捨五入', up:'切り上げ'};
const taxYen=v=>{ const m=OPT.round; if(!TAX_RN[m]) return v; const y=+Math.abs(v).toFixed(6), r=m==='up'?Math.ceil(y):m==='round'?Math.round(y):Math.floor(y); return (v<0&&r)?-r:r; };
const taxYenF=()=>TAX_RN[OPT.round]?'（1円未満は'+TAX_RN[OPT.round]+'）':'';
const today=()=>OPT.today();
const WARI=(m1,m2)=>(+m1)/10+(m2?(+m2)/100:0);
const WD='日月火水木金土';
function ymdStr(d){ return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）'; }
function durSay(min){ const h=Math.floor(min/60), m=Math.round(min-h*60); return (h?h+'時間':'')+(m?m+'分':(h?'':'0分')); }
function R_ok(say,a,f,extra){ return Object.assign({say, a:a||say, f:f||'', cls:'ok'}, extra||{}); }
function R_err(say){ return {say, a:say, f:'', cls:'err'}; }
function R_info(say,a,f){ return {say, a:a||say, f:f||'', cls:'info'}; }
function fmt(v, dp){
  if(v==null || !isFinite(v)) return '—';
  const d=(dp==null)?4:dp, p=Math.pow(10,d);
  const r=Math.round(v*p)/p;
  return (Object.is(r,-0)?0:r).toLocaleString('ja-JP',{maximumFractionDigits:d});
}
/* 単位つき。お金は1円未満があれば2けたまで */
function fmtU(v,u){
  if(v==null || !isFinite(v)) return '—';
  if(u==='円') return fmt(v, Math.abs(v-Math.round(v))<1e-9?0:2)+'円';
  return fmt(v)+(u||'');
}
/* 読み上げ用。お金は1円に丸めて「約」を付ける。だいたいのときは上2けた */
function sayU(v,u,rough){
  if(v==null || !isFinite(v)) return 'けいさんできません';
  let x=v, pre='';
  if(rough){ const r=roughly(v); if(r!==v){ x=r; pre='約'; } }
  if(u==='円' && Math.abs(x-Math.round(x))>1e-9){ x=Math.round(x); pre='約'; }
  return pre+fmt(x).replace(/,/g,'')+(u||'');
}
/* だいたい（上から2けたに丸める） */
function roughly(v){
  if(!v || !isFinite(v)) return v;
  const e=Math.floor(Math.log10(Math.abs(v)))-1, p=Math.pow(10,e);
  return Math.round(Math.round(v/p)*p*1e6)/1e6;
}

/* ── 話し言葉をそろえる ──────────────────────────────
   端末によって「二百五十」「250」「２５０」などと形が違うので、ここで数字にそろえる */
const KANJI_DIGIT={〇:0,零:0,一:1,壱:1,二:2,弐:2,三:3,参:3,四:4,五:5,六:6,七:7,八:8,九:9};
const KANJI_SMALL={十:10,百:100,千:1000};
const KANJI_BIG={万:10000,億:100000000,兆:1000000000000};
function kanjiRunToNumber(run){
  let total=0, section=0, digit=0, seen=false;
  for(const ch of run){
    if(ch in KANJI_DIGIT){ digit=KANJI_DIGIT[ch]; seen=true; }
    else if(ch>='0'&&ch<='9'){ digit=digit*10+Number(ch); seen=true; }
    else if(ch in KANJI_SMALL){ section+=(digit||1)*KANJI_SMALL[ch]; digit=0; seen=true; }
    else if(ch in KANJI_BIG){ total+=(section+digit)*KANJI_BIG[ch]; section=0; digit=0; seen=true; }
    else return null;
  }
  return seen ? total+section+digit : null;
}
function kanjiNumsToDigits(t){
  return t.replace(/[〇零一壱二弐三参四五六七八九十百千万億兆0-9]{1,24}/g, run=>{
    if(!/[〇零一壱二弐三参四五六七八九十百千万億兆]/.test(run)) return run;
    const n=kanjiRunToNumber(run);
    return n===null ? run : String(n);
  });
}
const KANA_COUNT=[['ひとつ','1つ'],['ふたつ','2つ'],['みっつ','3つ'],['よっつ','4つ'],['いつつ','5つ'],['むっつ','6つ'],
  ['ななつ','7つ'],['やっつ','8つ'],['ここのつ','9つ'],['ひとり','1人'],['ふたり','2人']];
const KEEP_WORDS=['四捨五入','九九','一緒','一番','一度','一回','一つずつ','一人ずつ','十分','一応','一旦','百均'];
function norm(raw){
  let t=String(raw||'').normalize('NFKC');
  t=t.replace(/([\d〇一二三四五六七八九十百千万億])[\s　]+(?=[\d〇一二三四五六七八九])/g,'$1、');                  // 「50万 5年」「40 3時間」の数どうしはつなげない（v18）
  t=t.replace(/[\s　]+/g,'');
  t=t.replace(/[。．！!]+$/,'').replace(/[「」『』]/g,'');
  t=t.replace(/(\d),(?=\d{3}(?!\d))/g,'$1');                 // 1,280 → 1280
  t=t.replace(/[,，]/g,'、');
  t=t.replace(/(一万|1万|10000)円札/g,'10000円').replace(/(五千|5千|5000)円札/g,'5000円')
     .replace(/(二千|2千|2000)円札/g,'2000円').replace(/(千|1千|1000)円札/g,'1000円')
     .replace(/(五百|500)円玉/g,'500円').replace(/(百|100)円玉/g,'100円');
  for(const [a,b] of KANA_COUNT) t=t.split(a).join(b);
  t=t.replace(/(\d)(点|てん)(\d)/g,'$1.$3');
  t=t.replace(/(\d{1,2}):(\d{2})/g,(m,h,mm)=>h+'時'+(+mm)+'分');
  // 漢数字と「3万2000」のような混ざり方を数字に（小数の「1.5万」は先に）
  t=t.replace(/(\d+\.\d+)(万|億)/g,(m,a,u)=>String(Math.round(parseFloat(a)*(u==='万'?1e4:1e8)*1e4)/1e4));
  // 数字にしてはいけない言葉（四捨五入・九九 など）は、いったん印に置きかえて守る
  KEEP_WORDS.forEach((w,i)=>{ t=t.split(w).join('\uE000'+i+'\uE001'); });
  t=kanjiNumsToDigits(t);
  t=t.replace(/\uE000(\d+)\uE001/g,(m,i)=>KEEP_WORDS[+i]);
  t=t.replace(/(\d+)(個|本|枚|袋|時間|キロ|kg|m|メートル|リットル|杯|箱)半/g,(m,a,u)=>(+a+0.5)+u);
  t=t.replace(/^(えーと|えっと|えー|あのー|あの|ええと|じゃあ|では|はい)、?/,'');
  t=t.replace(/(ください|下さい|お願いします|おねがい|してね|して|を教えて|教えて|は何ですか|はなんですか)$/,'');
  return t;
}

/* ════════════ いろいろな言い方（v5） ════════════
   「8と3の差」「半径3の円の面積」「5キロは何メートル」「昭和55年は西暦何年」のような
   決まった言い回しを「型」で読む。型に合わなかったものは、これまでどおり式として読む。
   型の書き方：
     {a}      … 数（a という名前で受け取る）     {*L} … 「3と5と7」「3、5、10」のような2つ以上の数
     <名前>   … 同じ意味の言葉のまとまり（PW）   <名前@x> … その言葉を x として受け取る
     (あ|い)  … どれか                           (…)? や <名前>? … なくてもよい
   数字を除いた言い回しが何通りあるかも、型から数えられる（phraseStats）。 */
const PW={
  NU:['円','個','つ','人','本','枚','回','点','歳','才','cm','センチ','m','メートル','km','キロ','kg','g','グラム','リットル','ml','日','時間','分','秒','%','度','ページ','冊','箱','台','件','匹','杯','袋'],
  TASU:['足す','たす','足','加え','合計','合算','合わせ','足して','たして','足すと','足したら','足した数','足した答え','加える','加えて','加えると','加えたら','プラスする','プラスして','プラスすると','合わせる','合わせて','合わせると','あわせて','あわせると','合計する','合計して','合計すると','合算する','合算すると'],
  WA:['和','合計','総和','合計数','総計','合算','トータル','足し算'],
  HIKU:['引く','ひく','差し引','減ら','引いて','ひいて','引くと','引いたら','引いた数','引いた答え','差し引く','差し引いて','差し引くと','差し引いたら','マイナスする','マイナスすると','減らす','減らすと','減らしたら'],
  SA:['差','ちがい','違い','差額','開き','引き算'],
  KAKERU:['かける','掛ける','掛け合わせ','かけ合わせ','かけて','掛けて','かけると','掛けると','かけたら','掛けたら','かけた数','掛けた数','かけた答え','掛け合わせる','掛け合わせて','掛け合わせると','かけ合わせる','かけ合わせると','乗じる','乗じると'],
  SEKI:['積','かけ算','掛け算','かけた数'],
  SHOU:['商','割り算','割った数','割った答え'],
  WARU:['割る','わる','割って','わって','割ると','わると','割ったら','わったら','割り算する','割り算すると','割り算'],
  WATTA:['割った','わった','割る','割ると','割ったら','わると','わったら'],
  AMARI:['余り','あまり','余る数','あまる数','剰余'],
  HEIKIN:['平均','平均値','平均点','平均額','平均金額','平均の数','アベレージ'],
  OOKII:['大きい','多い','上','高い','長い','重い','遅い'],
  CHIISAI:['小さい','少ない','下','低い','短い','軽い','早い'],
  NO:['の','で','の中で','のうち','では','の中では','で一番'],
  MAX:['最大','最大値','一番大きい','いちばん大きい','1番大きい','一番大きいの','一番多い','大きいほう','大きい方','いちばん多い'],
  MIN:['最小','最小値','一番小さい','いちばん小さい','1番小さい','一番小さいの','一番少ない','小さいほう','小さい方','いちばん少ない'],
  DOCCHI:['どっち','どちら','どっちが','どちらが','どっちの方が','どちらの方が','どっちのほうが'],
  NANBAI:['何倍','なんばい'],
  PCT:['%','パーセント','パー'],
  NAN:['何','なん'],
  UP:['上がったら','上がると','上がった','上がって','増えたら','増えると','増えた','増えて','なったら','なると','なった','値上がりしたら','値上がりすると','値上がりした'],
  DOWN:['下がったら','下がると','下がった','下がって','減ったら','減ると','減った','減って','値下がりしたら','値下がりすると','値下がりした','安くなったら','安くなった'],
  UPW:['アップ','増','増し','上がった','増えた','の増加','増加','上昇','高い','高くなった','値上がり'],
  DOWNW:['ダウン','減','減った','下がった','引き','の減少','減少','オフ','安い','安くなった','値下がり','引いた'],
  CHG:[],
  CHGW:[],
  BIKI:['引き','引','びき','オフ','安い','安く','ダウン','減','値引き'],
  ZENTAI:['全体','もと','元','100%','全部','元の数','全体の数','もとの数','総数'],
  YASUKU:['安く','得','お得','値引き額','値引き','引かれる','割引額','割引き額','割引','いくら安く','いくら得','いくらお得','何円安く','何円得'],
  POINT:['ポイント','ポイント還元','還元','のポイント','ポイントバック','キャッシュバック','のポイント還元'],
  ZEIGAKU:['消費税','税額','税金','消費税額','消費税分','税','消費税の額','税の額','消費税だけ','税だけ'],
  ZEIGAKU2:['消費税額','消費税分','税額','税の額','消費税の額','税金の額','消費税だけ','税だけ','にかかる消費税','にかかる税金','の消費税額'],
  GENSEN:['源泉徴収','源泉','源泉所得税','源泉徴収税','源泉徴収額','源泉税'],
  TEDORI:['手取り','手取り額','受け取る額','受取額','振込額','もらえる額'],
  RMETH:['四捨五入','切り上げ','切り捨て','切上げ','切捨て','切り上げる','切り捨てる'],
  LENU:['キロ','km','キロメートル','メートル','m'],
  SPDU:['キロ','km','キロメートル','メートル','m'],
  HASHIRU:['走る','走ると','走ったら','走って','走った','歩く','歩くと','歩いたら','歩いて','進む','進むと','進んだら','行く','行くと','行ったら','移動すると','移動したら','かかる','運転すると','で走ると'],
  NENPI:['燃費','燃費は','燃費が'],
  LITER:['リットル','L','l','リッター','ℓ'],
  VOL:['リットル','L','l','リッター','ℓ','ミリリットル','ml','mL','cc','ミリ'],   // 薄める（v17）
  GENEKI:['原液','薬','薬剤','農薬','液肥','洗剤','肥料'],
  NANML:['何ml','何cc','何ミリ','何ミリリットル','何リットル','何L','どれだけ','どのくらい','どれくらい','いくら','何','なんミリ'],
  USUME:['希釈','に希釈','に薄める','に薄めて','に薄めた','に薄めるには','に薄めたい','に薄めるなら','液','希釈液','に薄めて作る'],
  TSUKURU:['作る','作りたい','つくる','つくりたい','作ります','作るには','作るなら','作りたいとき','作る時','作るとき','分','ぶん','作成'],
  IRU:['いる','要る','必要','入れる','入れればいい','入れたらいい','ですか','か'],
  WARIKAN:['割り勘','わりかん','割る','割ると','割ったら','分ける','分けると','分けたら','で割ると','で割ったら','を割ると'],
  CUR:['ドル','ユーロ','元','ウォン','ポンド','バーツ','台湾ドル','豪ドル','香港ドル','ペソ'],
  GAS:['ガソリン','燃料','軽油','灯油'],
  TSUKAU:['使ったら','使った','使って','入った','入れた','入れたら','消費したら','消費した','かかったら','かかった','で','給油したら','給油した'],
  GASDAI:['ガソリン代','燃料代','ガス代','燃料費','ガソリン費'],
  PERL:['リッター','1リットル','リットル','1L','1リッター'],
  IRERU:['入れたら','入れると','給油したら','給油すると','だと','なら','入れて','給油して'],
  NENSHU:['年収','年間','1年分','1年で','年間の収入','年の収入','1年間','年間収入'],
  GESSHU:['月収','月給','1か月','ひと月','月あたり','1ヶ月','1か月分','毎月','月々'],
  HATARAKU:['働く','働いて','働くと','働いたら','分','間','勤務','勤務すると','勤務したら','出勤','出勤すると','出勤したら'],
  FREQ:['毎日','1日','毎週','週','毎月','月','月々','ひと月','毎年','年','1年'],
  CHOKIN:['貯金','貯める','ためる','貯めたら','ためたら','貯めると','ためると','積み立て','積立','積み立てる','積み立てると','積み立てたら','貯蓄','貯金する','貯金すると','貯金したら','貯めて','ためて','預金','預金すると'],
  RIRITSU:['年利','金利','利率','年率','利回り','年利率','運用利回り'],
  AZUKE:['預けたら','預けると','預けて','運用したら','運用すると','運用して','複利','単利','で','だと','なら','後','たったら','経ったら','置いたら','複利で','単利で','複利だと','単利だと','預ける','ほったらかし','ほったらかすと','置いておく','置いておくと','置いとく','寝かせる','寝かせると','運用','貯める','ためる',
    '管理','管理したら','管理すると','管理して','預金','預金したら','預金すると','預金して','置いておいたら','放っておいたら','ほっといたら','寝かせたら','運用したらいくら'],
  KARI:['ローン','返済','で借りたら','借りたら','借りて','借りると','で借りると','の住宅ローン','の車のローン','のローン','借入','借り入れ','ローンで','ローンを組むと','ローンを組んだら'],
  HENSAI:['返済','返済額','支払い','払い','支払額','返済金額','支払い額','払う額','返す額'],
  MAITSUKI:['毎月','月々','1か月','月','1ヶ月','ひと月','毎月の','月々の','月の'],
  BUNKATSU:['払い','払いで','で払う','で払うと','に分けて','に分けると','に分けたら','で分割','分割','分割払い','の分割','の分割払い','分割で','分割にすると','払いにすると','払いだと'],
  TAI:['対',':'],
  WAKERU:['分ける','分けて','分けると','分けたら','配分','配分する','配分すると','分配','分配する','分配すると','分割','山分け','山分けすると','按分','按分すると'],
  QU:['個','つ','本','枚','袋','箱','パック','缶','セット','台','冊','着','足','玉','束','組','切れ','杯','人前','ロール','巻'],
  ATARI:['あたり','当たり','につき','の値段','の単価','単価','の金額','いくら','は'],
  WU:['グラム','g','キロ','kg','ミリリットル','ml','cc','リットル','L','メートル','m','センチ','cm'],
  RIEKIRITSU:['利益率','粗利率','マージン率','値入れ率','利幅率'],
  RIEKI:['利益','粗利','もうけ','儲け','利幅','マージン','差益','粗利益'],
  GENKARITSU:['原価率'],
  URINE:['売値','売価','売り値','定価','販売価格','売る値段'],
  ERA:['明治','大正','昭和','平成','令和'],
  SAI:['歳','才','さい'],
  UMARE:['生まれ','生','生まれの人','生まれの人は','生まれは','生まれって','生まれの'],
  NOCHI:['後','あと','たったら','経ったら','前'],
  LU:['cm','センチ','m','メートル','mm','ミリ','km','キロ'],
  MENSEKI:['面積','広さ'],
  EN:['円','円形'],
  ENSHU:['円周','周り','まわり','周の長さ','円周の長さ','周囲','周囲の長さ'],
  CHOHO:['長方形','4角形','4角','部屋','土地','四角','長方形の土地','敷地'],
  TAISEKI:['体積','容積','容量'],
  HU:['センチ','cm','メートル','m'],
  WU2:['キロ','kg','キログラム'],
  BMI:['BMI','ビーエムアイ','肥満度','BMI値'],
  HYOJUN:['標準体重','適正体重','理想体重','美容体重','標準の体重','体重','適正な体重','理想の体重','平均体重','ちょうどいい体重'],
};
const P_UNIT_LISTS=['NU','LU','HU','WU','WU2','SPDU','LENU','QU','LITER','VOL','CUR'];
PW.CHG=PW.UP.concat(PW.DOWN); PW.CHGW=PW.UPW.concat(PW.DOWNW);
function phraseEsc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
const PNUM='\\d+(?:\\.\\d+)?';
const PLIST_SEP='(?:と|、|,)';
/* 型を正規表現にして、数字を除いた言い回しの数も数える（入れ子の（…）も読む） */
const PTIME_RE='\\d+(?:\\.\\d+)?時間(?:\\d+(?:\\.\\d+)?分)?|\\d+(?:\\.\\d+)?分(?:\\d+(?:\\.\\d+)?秒)?|\\d+(?:\\.\\d+)?秒';
function phraseCompile(p){
  const alt=arr=>arr.slice().sort((a,b)=>b.length-a.length).map(phraseEsc).join('|');
  function seq(i){
    let re='', count=1;
    while(i<p.length && p[i]!==')' && p[i]!=='|'){
      const c=p[i];
      if(c==='{'){
        const j=p.indexOf('}',i), nm=p.slice(i+1,j);
        if(nm[0]==='*'){ const nu='(?:'+alt(PW.NU)+')?'; re+='(?<![\\d.])(?<'+nm.slice(1)+'>'+PNUM+nu+'(?:'+PLIST_SEP+PNUM+nu+')+)'; count*=2; }
        else if(nm[0]==='%'){ re+='(?<'+nm.slice(1)+'>'+PTIME_RE+')'; count*=4; }
        else if(nm[0]==='&'){ re+='(?<'+nm.slice(1)+'>[0-9A-Za-z]+)'; }
        else if(nm[0]==='~'){ re+='(?<'+nm.slice(1)+'>[^\\d、]{0,12}?)'; }   // 品名（なくてもよい）
        else re+='(?<![\\d.])(?<'+nm+'>'+PNUM+')(?![\\d.])';
        i=j+1; continue;
      }
      if(c==='<'){
        const j=p.indexOf('>',i), [ls,nm]=p.slice(i+1,j).split('@'), arr=PW[ls];
        if(!arr) throw new Error('言葉のまとまりがありません: '+ls);
        const opt=p[j+1]==='?';
        re+=(nm?'(?<'+nm+'>':'(?:')+alt(arr)+')'+(opt?'?':'');
        if(!P_UNIT_LISTS.includes(ls)) count*=arr.length+(opt?1:0);   // 数に付ける単位の付け方は数えない
        i=j+1+(opt?1:0); continue;
      }
      if(c==='('){
        let name=null, k=i+1;
        if(p.startsWith('(?<',i)){ const e=p.indexOf('>',i); name=p.slice(i+3,e); k=e+1; }
        const alts=[];
        for(;;){ const r=seq(k); alts.push(r); k=r.i; if(p[k]==='|'){ k++; continue; } break; }
        // p[k] は ')'
        const opt=p[k+1]==='?';
        re+=(name?'(?<'+name+'>':'(?:')+alts.map(a=>a.re).join('|')+')'+(opt?'?':'');
        count*=alts.reduce((n,a)=>n+a.count,0)+(opt?1:0);
        i=k+1+(opt?1:0); continue;
      }
      re+=phraseEsc(c); i++;
      if(p[i]==='?'){ re+='?'; count*=2; i++; }
    }
    return {re, count, i};
  }
  const r=seq(0);
  return {re:new RegExp('^'+r.re+'$'), count:r.count};
}
const pn=x=>parseFloat(x);
const pList=s=>(s.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
const pUnitOf=s=>{ const m=String(s||'').match(/\d(円)/); return m?'円':''; };
function pOut(v,u,opt){
  opt=opt||{};
  if(typeof v==='number' && isFinite(v) && v!==0) v=+v.toPrecision(15);   // 1.9549999999999998 → 1.955
  const a=opt.a||((opt.pre||'')+fmtU(v,u));
  const say=opt.say||((opt.sayPre||'')+sayU(v,u)+' です');
  return R_ok(say, a, opt.f||'', {v, u:u||''});
}
function pRound(x,unit,m){
  const q=x/unit;
  const r=/四捨/.test(m)?Math.round(q+(q>=0?1e-9:-1e-9)):/上/.test(m)?Math.ceil(q-1e-9):Math.floor(q+1e-9);
  return +(r*unit).toFixed(10);
}
const gcd=(a,b)=>{ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b,a%b]; } return a; };
const isInt=x=>Number.isInteger(x);
const ERA_BASE={明治:1868, 大正:1912, 昭和:1926, 平成:1989, 令和:2019};
const ERA_END={明治:1912, 大正:1926, 昭和:1989, 平成:2019, 令和:9999};
function toEra(y){
  const e=['令和','平成','昭和','大正','明治'].find(k=>y>=ERA_BASE[k]);
  return e ? {e, n:y-ERA_BASE[e]+1} : null;
}
const eraStr=o=>o.e+(o.n===1?'元':o.n)+'年';
/* 改元の日（v24）。月・日まで言ったときは、その日で 元号を決める（平成は 1989年1月8日から） */
const ERA_START={明治:[1868,1,25], 大正:[1912,7,30], 昭和:[1926,12,25], 平成:[1989,1,8], 令和:[2019,5,1]};
const ERA_LIST=['令和','平成','昭和','大正','明治'];
const ymdK=(y,m,d)=>y*10000+m*100+d;
const ymdTxt=(y,mo,d)=>y+'年'+(mo?mo+'月':'')+(mo&&d?d+'日':'');
const eraTxt=(e,n,mo,d)=>e+(n===1?'元':n)+'年'+(mo?mo+'月':'')+(mo&&d?d+'日':'');
function eraOfYMD(y, mo, d){
  const k=ymdK(y, mo, d||1), e=ERA_LIST.find(x=>k>=ymdK(...ERA_START[x]));
  return e ? {e, n:y-ERA_BASE[e]+1} : null;
}
/* 和暦 → 西暦の年。その元号に ない年・日なら err */
function eraToY(e, n, mo, d){
  const y=ERA_BASE[e]+n-1;
  if(!(n>=1) || y>ERA_END[e]) return {err:e+n+'年はありません'};
  if(mo){
    if(mo<1 || mo>12 || (d!=null && (d<1 || d>31))) return {err:'月日が読めませんでした'};
    const k=ymdK(y, mo, d||1), st=ERA_START[e], i=ERA_LIST.indexOf(e), nx=i>0 ? ERA_START[ERA_LIST[i-1]] : null;
    if(k<ymdK(...st) && !(d==null && y===st[0] && mo===st[1])) return {err:e+'は '+st[0]+'年'+st[1]+'月'+st[2]+'日から です'};
    if(nx && k>=ymdK(...nx)) return {err:eraTxt(e,n,mo,d)+'は ありません（'+nx[0]+'年'+nx[1]+'月'+nx[2]+'日から '+ERA_LIST[i-1]+'）'};
  }
  return {y};
}
/* 和暦 → 西暦（「昭和24年」「昭和52年3月」「昭和22年6月29日」） */
function fromEraOut(e, n, mo, d){
  const r=eraToY(e, n, mo, d); if(r.err) return R_err(r.err);
  const s=ymdTxt(r.y, mo, d);
  return pOut(r.y,'年',{a:'西暦 '+s, say:'西暦 '+s+' です', f:eraTxt(e,n,mo,d)+' → '+ERA_BASE[e]+' ＋ '+(n-1)});
}
/* 西暦 → 和暦（月まで言ったら 改元の日で決める。改元の月で 日を言わなかったら「〜日からは」も添える） */
function toEraOut(y, mo, d){
  if(!mo){ const o=toEra(y); if(!o) return R_err('明治より前は分かりません'); const s=eraStr(o); return pOut(o.n,'年',{a:s, say:s+' です', f:y+'年 → '+s}); }
  if(mo<1 || mo>12) return R_err('月が読めませんでした');
  const o=eraOfYMD(y, mo, d); if(!o) return R_err('明治より前は分かりません');
  const s=eraTxt(o.e, o.n, mo, d);
  let note='';
  if(d==null){ const nx=ERA_LIST.find(x=>{ const st=ERA_START[x]; return st[0]===y && st[1]===mo && st[2]>1; }); if(nx && nx!==o.e) note=mo+'月'+ERA_START[nx][2]+'日からは '+nx+'元年'; }
  return pOut(o.n,'年',{a:s+(note?'（'+note+'）':''), say:s+' です'+(note?'。'+note+' です':''), f:ymdTxt(y,mo,d)+' → '+s});
}
/* いま何歳か（月・日を言わなければ 今年の誕生日で） */
function ageOut(y, mo, d){
  const now=today(), age=now.getFullYear()-y;
  if(age<0 || age>150) return R_err('生まれた年が読めませんでした');
  if(mo){ const had=(now.getMonth()+1>mo)||((now.getMonth()+1===mo)&&now.getDate()>=(d||1)); const a=had?age:age-1;
    return pOut(a,'歳',{a:a+'歳', say:'いま '+a+'歳 です', f:ymdTxt(y,mo,d)+'生まれ → '+ymdStr(now)}); }
  return pOut(age,'歳',{a:'今年 '+age+'歳', say:'今年の誕生日で '+age+'歳 です（誕生日の前なら '+(age-1)+'歳）', f:now.getFullYear()+' − '+y});
}
/* 言った年（和暦なら 西暦に）。{y, mo, d, s:言った形} か {err} */
function pYMD(e, y, mo, d){
  y=pn(y); mo=mo!=null?pn(mo):null; d=d!=null?pn(d):null;
  if(e){ const r=eraToY(e, y, mo, d); if(r.err) return r; return {y:r.y, mo, d, s:eraTxt(e,y,mo,d)}; }
  return {y, mo, d, s:ymdTxt(y,mo,d)};
}
/* 2つの年月（日）の あいだ（v24）：「2026年10月引く2014年6月」「2014年6月から2026年10月まで」→ 12年4か月 */
function ymDiffOut(a, b){
  const hasD=a.d!=null && b.d!=null;
  const [p, q]=ymdK(a.y,a.mo,hasD?a.d:1)>=ymdK(b.y,b.mo,hasD?b.d:1) ? [a,b] : [b,a];
  let Y=p.y-q.y, M=p.mo-q.mo, D=hasD ? p.d-q.d : 0;
  if(D<0){ M--; D+=new Date(p.y, p.mo-1, 0).getDate(); }   // 前の月の日数を かりる
  if(M<0){ Y--; M+=12; }
  const parts=[]; if(Y) parts.push(Y+'年'); if(M) parts.push(M+'か月'); if(hasD && D) parts.push(D+'日');
  const txt=parts.join('')||(hasD?'0日':'0か月'), f=p.s+' − '+q.s;
  if(hasD){ const days=Math.round((Date.UTC(p.y,p.mo-1,p.d)-Date.UTC(q.y,q.mo-1,q.d))/864e5);
    return pOut(days,'日',{a:txt+'（'+fmt(days)+'日）', say:txt+' です。日数では '+days+'日 です', f}); }
  const mm=Y*12+M;
  return pOut(mm,'か月',{a:txt+(Y&&M?'（'+mm+'か月）':''), say:txt+' です', f});
}
/* 速さ：秒速 m/s にそろえる */
function speedMps(kind,v,u){
  const km=/^(キロ|km|キロメートル)$/.test(u||'') || (!u && kind==='時速');
  const d=km?v*1000:v;
  return kind==='時速'?d/3600:kind==='分速'?d/60:d;
}
function pTimeSec(s){
  let m, sec=0;
  if((m=s.match(/(\d+(?:\.\d+)?)時間/))) sec+=(+m[1])*3600;
  if((m=s.match(/(\d+(?:\.\d+)?)分/))) sec+=(+m[1])*60;
  if((m=s.match(/(\d+(?:\.\d+)?)秒/))) sec+=(+m[1]);
  return sec;
}
const lenM=(v,u)=>/^(キロ|km|キロメートル)$/.test(u)?v*1000:/^(mm|ミリ)$/.test(u)?v/1000:/^(cm|センチ)$/.test(u)?v/100:v;
const areaU=u=>/^(cm|センチ)$/.test(u||'')?'cm²':/^(m|メートル)$/.test(u||'')?'㎡':/^(mm|ミリ)$/.test(u||'')?'mm²':/^(km|キロ)$/.test(u||'')?'km²':'';
const volU=u=>/^(cm|センチ)$/.test(u||'')?'cm³':/^(m|メートル)$/.test(u||'')?'㎥':/^(mm|ミリ)$/.test(u||'')?'mm³':'';
const volMl=(v,u)=>/^(リットル|L|l|リッター|ℓ)$/.test(u||'')?v*1000:v;
const fmtVol=ml=>ml>=1000?fmt(+(ml/1000).toPrecision(12))+'L':fmt(+ml.toPrecision(12))+'ml';
const sayVol=ml=>ml>=1000?fmt(+(ml/1000).toPrecision(12))+'リットル':fmt(+ml.toPrecision(12))+'ミリリットル';
const lenU=u=>/^(cm|センチ)$/.test(u||'')?'cm':/^(m|メートル)$/.test(u||'')?'m':/^(mm|ミリ)$/.test(u||'')?'mm':/^(km|キロ)$/.test(u||'')?'km':'';
// 図形の長さをそろえる：辺ごとに単位がちがう（1.7m と 50cm など）ときは、言った中でいちばん大きい単位に直す。
// 単位を言わなかった辺は、前（なければ後ろ）の辺の単位とみなす。→ {v:[数…], u:単位}
const LEN_F={mm:0.001,cm:0.01,m:1,km:1000};
const lenKey=u=>/^(mm|ミリ)$/.test(u||'')?'mm':/^(cm|センチ)$/.test(u||'')?'cm':/^(m|メートル)$/.test(u||'')?'m':/^(km|キロ)$/.test(u||'')?'km':'';
function dimsU(pairs){
  const ks=pairs.map(p=>lenKey(p[1]));
  for(let i=1;i<ks.length;i++) if(!ks[i]) ks[i]=ks[i-1];
  for(let i=ks.length-2;i>=0;i--) if(!ks[i]) ks[i]=ks[i+1];
  let T=''; ks.forEach(k=>{ if(k && (!T || LEN_F[k]>LEN_F[T])) T=k; });
  const v=pairs.map((p,i)=>{ const x=pn(p[0]); return T&&ks[i]&&ks[i]!==T ? +(x*LEN_F[ks[i]]/LEN_F[T]).toPrecision(12) : x; });
  return {v, u:T};
}
function tokArith(a,op,b,ua,ub){
  return {toks:[{t:'num',v:a,u:ua||''},{t:'op',op},{t:'num',v:b,u:ub||''}]};
}

/* 型の一覧。c：分類  p：型（いくつでも）  f：答えを作る（g は受け取った数と言葉、t は言葉全体）
   item：足し上げ・予算のときは使わない（品物として受け取る）
   dt：表電卓だけで使う（声の計算帳は同じ言い方を式として読み、言い直しもできるため） */
const PHRASES=[
  // ── 四則 ──
  {c:'四則', p:['{a}<NU@ua>?と{b}<NU@ub>?(を)?<TASU>','{a}<NU@ua>?に{b}<NU@ub>?を<TASU>','{a}<NU@ua>?と{b}<NU@ub>?の<WA>'],
   f:g=>tokArith(pn(g.a),'+',pn(g.b),g.ua,g.ub)},
  {c:'四則', p:['{*L}(を)?<TASU>','{*L}(を|の)<WA>','{*L}(を)?全部<TASU>'],
   f:g=>{ const xs=pList(g.L), u=pUnitOf(g.L); const toks=[]; xs.forEach((x,i)=>{ if(i) toks.push({t:'op',op:'+'}); toks.push({t:'num',v:x,u}); }); return {toks}; }},
  {c:'四則', p:['{a}<NU@ua>?から{b}<NU@ub>?(を)?<HIKU>'], f:g=>tokArith(pn(g.a),'-',pn(g.b),g.ua,g.ub)},
  {c:'四則', p:['{a}<NU@ua>?と{b}<NU@ub>?の<SA>','{a}<NU@ua>?と{b}<NU@ub>?(は|って|では)?(いくつ|どれだけ|どのくらい|どれくらい|いくら|何)?(違う|ちがう|差がある|離れている|離れてる)'],
   f:g=>{ const a=pn(g.a), b=pn(g.b), u=g.ua==='円'||g.ub==='円'?'円':''; return tokArith(Math.max(a,b),'-',Math.min(a,b),u,u); }},
  {c:'四則', p:['{a}<NU@ua>?より{b}<NU@ub>?<OOKII>(数|の|もの|値|のは)?'], f:g=>tokArith(pn(g.a),'+',pn(g.b),g.ua,g.ub)},
  {c:'四則', p:['{a}<NU@ua>?より{b}<NU@ub>?<CHIISAI>(数|の|もの|値|のは)?'], f:g=>tokArith(pn(g.a),'-',pn(g.b),g.ua,g.ub)},
  {c:'四則', p:['{a}<NU@ua>?と{b}<NU@ub>?(を)?<KAKERU>','{a}<NU@ua>?と{b}<NU@ub>?の<SEKI>'], f:g=>tokArith(pn(g.a),'*',pn(g.b),g.ua,g.ub)},
  {c:'四則', p:['{*L}(を)?<KAKERU>','{*L}の<SEKI>'],
   f:g=>{ const xs=pList(g.L); const toks=[]; xs.forEach((x,i)=>{ if(i) toks.push({t:'op',op:'*'}); toks.push({t:'num',v:x,u:''}); }); return {toks}; }},
  {c:'四則', p:['{a}<NU@ua>?と{b}<NU@ub>?の<SHOU>'], f:g=>tokArith(pn(g.a),'/',pn(g.b),g.ua,g.ub)},
  {c:'四則', p:['{a}<NU@ua>?(は|って)?{b}<NU@ub>?の<NANBAI>','{a}<NU@ua>?(は|って)?{b}<NU@ub>?(を)?(何|なん)倍(したもの|した数|したら|すると)'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(!b) return R_err('0 の何倍かは出せません'); return pOut(a/b,'',{a:fmt(a/b)+'倍', say:fmt(a/b)+'倍 です', f:fmt(a)+' ÷ '+fmt(b)}); }},
  {c:'四則', p:['{a}<NU@ua>?を{b}<NU@ub>?で<WARU>'], f:g=>tokArith(pn(g.a),'/',pn(g.b),g.ua,g.ub)},
  {c:'四則', p:['{a}<NU@ua>?の{b}倍','{a}<NU@ua>?を{b}倍(に|して|すると|したら|にすると)?'], f:g=>tokArith(pn(g.a),'*',pn(g.b),g.ua,'')},
  {c:'四則', dt:1, p:['{a}の(平方根|ルート|へいほうこん)','(ルート|√){a}'], f:g=>pOut(Math.sqrt(pn(g.a)),'',{f:'√'+fmt(pn(g.a))})},
  {c:'四則', dt:1, p:['{a}<NU@ua>?の{b}分の{c}'], f:g=>{ const b=pn(g.b); if(!b) return R_err('0分の…は出せません'); const v=pn(g.a)*pn(g.c)/b; return pOut(v,g.ua==='円'?'円':'',{f:fmt(pn(g.a))+' × '+g.c+'/'+g.b}); }},
  {c:'割合', p:['{a}<NU@ua>?(は|って){b}<NU@ub>?の<NAN>(?<w>パーセント|%|割|パー)'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(!b) return R_err('0 の何パーセントかは出せません'); const p=a/b*100;
     return g.w==='割' ? pOut(p/10,'割',{f:fmt(a)+' ÷ '+fmt(b)+' × 10'}) : pOut(p,'%',{f:fmt(a)+' ÷ '+fmt(b)+' × 100'}); }},
  {c:'割合', dt:1, p:['{a}<NU@ua>?(の|を|から){p}(?<w>割|%|パーセント|パー)({q}分)?<BIKI>(は|で|だと|にすると|すると|したら)?','{a}<NU@ua>?(の|を){p}(?<w>割|%|パーセント|パー)({q}分)?(?<up>増し|アップ|増|乗せ|高く|上げ)(は|で|だと|にすると|すると|したら)?'],
   f:g=>{ const r=g.w==='割'?WARI(g.p,g.q):pn(g.p)/100, a=pn(g.a), v=g.up?a*(1+r):a*(1-r);
     return pOut(v,g.ua==='円'?'円':'',{f:fmtU(a,g.ua==='円'?'円':'')+' × '+fmt(g.up?1+r:1-r)+'（'+g.p+(g.w==='割'?'割'+(g.q?g.q+'分':''):'%')+(g.up?'増し':'引き')+'）'}); }},
  {c:'四捨五入', dt:1, p:['{a}<NU@ua>?を{u}円?単位(で|に)?<RMETH@m>(して|する|すると|したら)?'],
   f:g=>{ const u=pn(g.u); if(!u) return R_err('0 単位にはできません'); const v=pRound(pn(g.a),u,g.m); return pOut(v,g.ua==='円'?'円':'',{f:fmt(pn(g.a))+' → '+fmt(u)+'単位で'+rmName(g.m)}); }},
  {c:'余り', p:['{a}(を)?{b}で<WATTA>(時の|ときの|とき|の)?<AMARI>','{a}(割る|わる|÷|/){b}の<AMARI>','{a}を{b}で<WATTA>(時|とき)?(の)?<AMARI>(は|って)?(いくつ)?'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(!b) return R_err('0 では割れません'); const q=Math.floor(a/b+1e-9), r=+(a-q*b).toFixed(10);
     return pOut(r,'',{a:'余り '+fmt(r), say:'余りは '+fmt(r)+' です', f:fmt(a)+' ÷ '+fmt(b)+' ＝ '+q+' 余り '+fmt(r)}); }},
  {c:'余り', p:['{a}(を)?{b}で<WATTA>(時の|ときの|とき|の)?(商と余り|答えと余り|商とあまり|答えとあまり)','{a}(割る|わる|÷|/){b}(の|は)?(商と余り|答えと余り|余りも|あまりも|余りを出して|余りあり|余りつき)'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(!b) return R_err('0 では割れません'); const q=Math.floor(a/b+1e-9), r=+(a-q*b).toFixed(10);
     return pOut(q,'',{a:fmt(q)+' 余り '+fmt(r), say:fmt(q)+' 余り '+fmt(r)+' です', f:fmt(a)+' ÷ '+fmt(b)+' ＝ '+q+' 余り '+fmt(r)}); }},
  // ── 合計・平均・大小 ──
  {c:'平均・大小', p:['{*L}(の)<HEIKIN>','{*L}(を)?(平均|平均する|平均すると|平均して|平均したら|ならす|ならすと)'],
   f:g=>{ const xs=pList(g.L), u=pUnitOf(g.L), s=xs.reduce((a,b)=>a+b,0), v=s/xs.length;
     return pOut(v,u,{pre:'平均 ', sayPre:'平均は ', f:'('+xs.map(x=>fmt(x)).join(' ＋ ')+') ÷ '+xs.length}); }},
  {c:'平均・大小', p:['{*L}<NO><MAX>(数|の|もの|値|のは)?','{*L}(の)?(最大|最大値)'],
   f:g=>{ const xs=pList(g.L), v=Math.max(...xs); return pOut(v,pUnitOf(g.L),{pre:'いちばん大きいのは ', sayPre:'いちばん大きいのは ', f:xs.map(x=>fmt(x)).join('・')}); }},
  {c:'平均・大小', p:['{*L}<NO><MIN>(数|の|もの|値|のは)?','{*L}(の)?(最小|最小値)'],
   f:g=>{ const xs=pList(g.L), v=Math.min(...xs); return pOut(v,pUnitOf(g.L),{pre:'いちばん小さいのは ', sayPre:'いちばん小さいのは ', f:xs.map(x=>fmt(x)).join('・')}); }},
  {c:'平均・大小', p:['{a}<NU@ua>?と{b}<NU@ub>?(は|では|って)?<DOCCHI>(が)?(大きい|多い|上|高い|長い|重い)'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(a===b) return pOut(a,g.ua||'',{a:'同じです', say:'どちらも同じです'}); const v=Math.max(a,b);
     return pOut(v,g.ua||'',{pre:'大きいのは ', sayPre:'大きいのは ', f:fmt(a)+(a>b?' ＞ ':' ＜ ')+fmt(b)}); }},
  {c:'平均・大小', p:['{a}<NU@ua>?と{b}<NU@ub>?(は|では|って)?<DOCCHI>(が)?(小さい|少ない|下|低い|短い|軽い)'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(a===b) return pOut(a,g.ua||'',{a:'同じです', say:'どちらも同じです'}); const v=Math.min(a,b);
     return pOut(v,g.ua||'',{pre:'小さいのは ', sayPre:'小さいのは ', f:fmt(a)+(a>b?' ＞ ':' ＜ ')+fmt(b)}); }},
  // ── 累乗・根・整数 ──
  {c:'累乗・根・整数', p:['{a}の{b}乗根','{a}の{b}じょう根'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(!b) return R_err('0乗根は出せません'); return pOut(Math.pow(a,1/b),'',{f:fmt(a)+' の '+fmt(b)+'乗根'}); }},
  {c:'累乗・根・整数', p:['{a}の(立方根|3乗根)','(立方根|3乗根){a}'], f:g=>pOut(Math.cbrt(pn(g.a)),'',{f:'∛'+fmt(pn(g.a))})},
  {c:'累乗・根・整数', p:['{a}の(階乗|かいじょう)','{a}(の)?!'],
   f:g=>{ const a=pn(g.a); if(!isInt(a) || a<0 || a>170) return R_err('階乗は 0〜170 の整数で出せます'); let v=1; for(let i=2;i<=a;i++) v*=i; return pOut(v,'',{f:a+'!'}); }},
  {c:'累乗・根・整数', p:['{a}の(逆数|ぎゃくすう)'], f:g=>{ const a=pn(g.a); if(!a) return R_err('0 の逆数はありません'); return pOut(1/a,'',{f:'1 ÷ '+fmt(a)}); }},
  {c:'累乗・根・整数', p:['{*L}の(最大公約数|公約数の最大|最大の公約数|GCD|gcd)'],
   f:g=>{ const xs=pList(g.L); if(!xs.every(isInt)) return R_err('整数で言ってください'); const v=xs.reduce(gcd); return pOut(v,'',{f:'最大公約数（'+xs.join('・')+'）'}); }},
  {c:'累乗・根・整数', p:['{*L}の(最小公倍数|公倍数の最小|最小の公倍数|LCM|lcm)'],
   f:g=>{ const xs=pList(g.L); if(!xs.every(isInt)||xs.some(x=>!x)) return R_err('0 でない整数で言ってください'); const v=xs.reduce((a,b)=>a/gcd(a,b)*b); return pOut(v,'',{f:'最小公倍数（'+xs.join('・')+'）'}); }},
  {c:'累乗・根・整数', p:['{a}(は|って)(素数|そすう)(ですか|か|なの|かな)?'],
   f:g=>{ const a=pn(g.a); if(!isInt(a)||a<1||a>1e12) return R_err('1 以上の整数で言ってください');
     let d=0; if(a>1){ for(let i=2;i*i<=a;i++){ if(a%i===0){ d=i; break; } } }
     if(a>1 && !d) return R_info(a+' は素数です', a+' は素数です');
     return R_info(a+' は素数ではありません'+(d?'。'+d+' で割り切れます':''), a+' は素数ではありません', d?a+' ＝ '+d+' × '+(a/d):''); }},
  {c:'累乗・根・整数', p:['{a}の(約数|やくすう)(は|を全部|全部)?'],
   f:g=>{ const a=pn(g.a); if(!isInt(a)||a<1||a>1e9) return R_err('1 以上の整数で言ってください'); const lo=[], hi=[];
     for(let i=1;i*i<=a;i++){ if(a%i===0){ lo.push(i); if(i*i!==a) hi.unshift(a/i); } } const xs=lo.concat(hi);
     return R_info(a+' の約数は '+xs.length+'個。'+xs.join('、')+' です', xs.join(', '), xs.length+'個'); }},
  {c:'累乗・根・整数', p:['{a}を{b}進数(に|で|へ)?(すると|直すと|直して|変換|変換すると|にする|表すと)?','10進数の{a}を{b}進数(に|で|へ)?(すると|直すと|直して|変換|変換すると|にする|表すと)?'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(!isInt(a)||a<0||b<2||b>36||!isInt(b)) return R_err('0 以上の整数と、2〜36 進数で言ってください');
     const s=a.toString(b).toUpperCase(); return R_ok(b+'進数で '+s.split('').join(' ')+' です', s, fmt(a)+' → '+b+'進数'); }},
  {c:'累乗・根・整数', p:['{b}進数の{&x}を{c}進数(に|で|へ)?(すると|直すと|直して|変換|変換すると|にする|表すと)?'],
   f:g=>{ const b=pn(g.b), c=pn(g.c), v=parseInt(g.x,b); if(!isFinite(v)||b<2||b>36||c<2||c>36) return R_err('その数は読めませんでした');
     const s=v.toString(c).toUpperCase(); return R_ok(c+'進数で '+s.split('').join(' ')+' です', s, g.x.toUpperCase()+'（'+b+'進数） → '+c+'進数', c===10?{v, u:''}:{}); }},
  // ── 割合 ──
  {c:'割合', p:['{a}<NU@ua>?(から|が){b}<NU@ub>?(に|へ|まで)?<CHG>?(は|って|で)?<NAN><PCT><CHGW>?',
          '{a}<NU@ua>?(から|が){b}<NU@ub>?(に|へ|まで)?(の)?(増加率|減少率|変化率|伸び率|上昇率|下落率|値上がり率|値下がり率)'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(!a) return R_err('0 からの割合は出せません'); const p=(b-a)/a*100, up=p>=0;
     return pOut(Math.abs(p),'%',{a:fmt(Math.abs(p),2)+'% '+(up?'アップ':'ダウン'), say:fmt(Math.abs(p),2)+'パーセント '+(up?'上がりました':'下がりました'), f:'('+fmt(b)+' − '+fmt(a)+') ÷ '+fmt(a)+' × 100'}); }},
  {c:'割合', p:['(定価)?{a}<NU@ua>?(から|で|が|の)?(売値|売価)?{b}<NU@ub>?(に|へ|まで)?(なったら|なると|なった|は|だと|なら|って)?<NAN>割<BIKI>?','(定価)?{a}<NU@ua>?(から|で|が|の)?(売値|売価)?{b}<NU@ub>?(に|へ|まで)?<DOWN>?(は|って|で)?<NAN>割<BIKI>?'],
   f:g=>{ const a=pn(g.a), b=pn(g.b); if(!a) return R_err('0 からの割合は出せません'); const w=(a-b)/a*10;
     return pOut(Math.abs(w),'割',{a:fmt(Math.abs(w),2)+'割'+(w>=0?'引き':'増し'), say:fmt(Math.abs(w),2)+'割'+(w>=0?'引き':'増し')+' です', f:'('+fmt(a)+' − '+fmt(b)+') ÷ '+fmt(a)+' × 10'}); }},
  {c:'割合', p:['{p}<PCT>が{a}<NU@ua>?(なら|だと|のとき|とすると|の時)?<ZENTAI>(は|って)?','{a}<NU@ua>?が(全体の)?{p}<PCT>(に当たる|にあたる|なら|だと|のとき|の時)?(とき|時)?(の)?<ZENTAI>(は|って)?'],
   f:g=>{ const p=pn(g.p), a=pn(g.a); if(!p) return R_err('0% からは出せません'); return pOut(a/(p/100),g.ua||'',{pre:'全体 ', sayPre:'全体は ', f:fmt(a)+' ÷ '+fmt(p/100)}); }},
  {c:'割合', p:['{p}割({q}分)?が{a}<NU@ua>?(なら|だと|のとき|とすると|の時)?<ZENTAI>(は|って)?','{a}<NU@ua>?が(全体の)?{p}割({q}分)?(に当たる|にあたる|なら|だと|のとき|の時)?(とき|時)?(の)?<ZENTAI>(は|って)?'],
   f:g=>{ const r=WARI(g.p,g.q), a=pn(g.a); if(!r) return R_err('0割からは出せません'); return pOut(a/r,g.ua||'',{pre:'全体 ', sayPre:'全体は ', f:fmt(a)+' ÷ '+fmt(r)}); }},
  {c:'割合', p:['{p}<PCT>(は|って)<NAN>割','{p}<PCT>を割(に|で)(すると|直すと|直して)?'],
   f:g=>{ const v=pn(g.p)/10; return pOut(v,'割',{f:fmt(pn(g.p))+'% ÷ 10'}); }},
  {c:'割合', p:['{p}割({q}分)?({r}厘)?(は|って)<NAN><PCT>','{p}割({q}分)?({r}厘)?を<PCT>(に|で)(すると|直すと|直して)?'],
   f:g=>{ const v=pn(g.p)*10+(g.q?pn(g.q):0)+(g.r?pn(g.r)/10:0); return pOut(v,'%',{f:g.p+'割'+(g.q?g.q+'分':'')+(g.r?g.r+'厘':'')+' × 10'}); }},
  {c:'割合', p:['{a}<NU@ua>?の{p}(?<w>割|%|パーセント|パー)<BIKI>(は|で|だと|の|すると|したら)?<YASUKU>(に)?(なる|なります|する)?','{a}<NU@ua>?の(商品|もの|品|服|やつ)?を{p}(?<w>割|%|パーセント|パー)<BIKI>?で(買う|買った|買え|買い)(と|ば|たら)?(いくら|何円)?(得|お得|安い|安く|安くなる|得する)'],
   f:g=>{ const a=pn(g.a), w=g.w==='割'?pn(g.p)/10:pn(g.p)/100; const v=a*w;
     return pOut(v,'円',{pre:'値引き ', sayPre:sayU(v,'円')+' 安くなります。値引きのあとは '+sayU(a-v,'円')+' です', say:sayU(v,'円')+' 安くなります。値引きのあとは '+sayU(a-v,'円')+' です', f:fmtU(a,'円')+' × '+fmt(w)+'　値引きのあと '+fmtU(a-v,'円')}); }},
  {c:'割合', p:['{a}<NU@ua>?(の|で|につき)?{p}<PCT><POINT>','{a}<NU@ua>?(の|で)<POINT>(が|は)?{p}<PCT>','{a}<NU@ua>?(の|で){p}<PCT>(分)?(の)?<POINT>'],
   f:g=>{ const a=pn(g.a), p=pn(g.p), v=a*p/100; return pOut(v,'',{a:fmt(Math.floor(v+1e-9))+'ポイント', say:fmt(Math.floor(v+1e-9))+'ポイント です', f:fmtU(a,'円')+' × '+fmt(p)+'%'}); }},
  // ── 税・源泉 ──
  {c:'税・源泉', p:['(税込み|税込|税込価格){a}円?(の|に含まれる|のうちの|のうち)<ZEIGAKU>','{a}円?(は|が|って)?(税込み|税込)(の|で|だと)(うち|うちの)?<ZEIGAKU>'],
   f:g=>{ const a=pn(g.a), v=taxYen(a-a/taxF()); return pOut(v,'円',{pre:'消費税 ', sayPre:'消費税は ', f:fmtU(a,'円')+' − '+fmtU(a,'円')+' ÷ '+fmt(taxF())+taxYenF()}); }},
  {c:'税・源泉', p:['{a}円?(の|に)?<ZEIGAKU2>','{a}円?(に|の)(かかる|つく|付く)(消費税|税金|税)'],
   f:g=>{ const a=pn(g.a), v=taxYen(a*(taxF()-1)); return pOut(v,'円',{pre:'消費税 ', sayPre:'消費税は ', f:fmtU(a,'円')+' × '+settings.tax+'%'+taxYenF()}); }},
  {c:'税・源泉', p:['{a}円?(の|から|に)?<GENSEN>(は|って)?','{a}円?(の|の報酬の|の原稿料の)<GENSEN>(額|分)?'],
   f:g=>{ const a=pn(g.a), v=Math.floor(gensen(a)+1e-9); return pOut(v,'円',{pre:'源泉徴収 ', sayPre:'源泉徴収は ', f:gensenF(a)}); }},
  {c:'税・源泉', p:['{a}円?(の|から)?<GENSEN>(後|を引いた|を引くと|引き後|差し引き後|を差し引いた|を引いたら)(の)?<TEDORI>?','{a}円?(の|から)?<GENSEN>(された|を引かれた|引かれた)(あと|後)?(の)?<TEDORI>','{a}円?(の)?<TEDORI>(は)?(源泉徴収後|源泉後)'],
   f:g=>{ const a=pn(g.a), v=a-Math.floor(gensen(a)+1e-9); return pOut(v,'円',{pre:'手取り ', sayPre:'手取りは ', f:fmtU(a,'円')+' − 源泉徴収 '+fmtU(Math.floor(gensen(a)+1e-9),'円')}); }},
  // ── 四捨五入 ──
  {c:'四捨五入', p:['{a}を{pl}の位(で|を)<RMETH@m>(して|する|すると|したら)?'],
   f:g=>{ const pl=pn(g.pl); if(![1,10,100,1000,10000,100000].includes(pl)) return R_err('一の位・十の位・百の位… で言ってください'); const v=pRound(pn(g.a),pl*10,g.m);
     return pOut(v,'',{f:fmt(pn(g.a))+' → '+placeName(pl)+'を'+rmName(g.m)}); }},
  {c:'四捨五入', p:['{a}を{pl}の位まで(の)?(概数|がいすう)?(に|で)?<RMETH@m>?(して|する|すると|したら|にする|にすると)?'],
   f:g=>{ const pl=pn(g.pl); if(![1,10,100,1000,10000,100000].includes(pl)) return R_err('一の位・十の位・百の位… で言ってください'); const m=g.m||'四捨五入', v=pRound(pn(g.a),pl,m);
     return pOut(v,'',{f:fmt(pn(g.a))+' → '+placeName(pl)+'まで（'+rmName(m)+'）'}); }},
  {c:'四捨五入', p:['{a}を小数(第|点第|点以下第)?{d}位(で|を)<RMETH@m>(して|する|すると|したら)?'],
   f:g=>{ const d=pn(g.d); if(!isInt(d)||d<1||d>8) return R_err('小数第1位〜第8位で言ってください'); const v=pRound(pn(g.a),Math.pow(10,1-d),g.m);
     return pOut(v,'',{f:fmt(pn(g.a),8)+' → 小数第'+d+'位を'+rmName(g.m)}); }},
  {c:'四捨五入', p:['{a}を小数(第|点第|点以下第|点以下)?{d}位まで(で|に)?<RMETH@m>?(して|する|すると|したら|にする|にすると|求める|出す|出して|表す|表すと)?'],
   f:g=>{ const d=pn(g.d); if(!isInt(d)||d<0||d>8) return R_err('小数第1位〜第8位で言ってください'); const m=g.m||'四捨五入', v=pRound(pn(g.a),Math.pow(10,-d),m);
     return pOut(v,'',{a:v.toFixed(d), f:fmt(pn(g.a),8)+' → 小数第'+d+'位まで（'+rmName(m)+'）'}); }},
  // ── 速さ・燃費 ──
  {c:'速さ・燃費', p:['(?<sp>時速|分速|秒速){s}<SPDU@su>?(で)?{%tm}<HASHIRU>?(と|たら)?((は|で)?<NAN><LENU@to>)?'],
   f:g=>{ const mps=speedMps(g.sp,pn(g.s),g.su), sec=pTimeSec(g.tm), m=mps*sec; const km=g.to?/^(キロ|km|キロメートル)$/.test(g.to):(g.sp==='時速'||/^(キロ|km|キロメートル)$/.test(g.su||''));
     const v=km?m/1000:m, u=km?'km':'m'; return pOut(v,u,{pre:'道のり ', sayPre:'道のりは ', f:g.sp+fmt(pn(g.s))+(g.su||(g.sp==='時速'?'km':'m'))+' × '+g.tm}); }},
  {c:'速さ・燃費', p:['(?<sp>時速|分速|秒速){s}<SPDU@su>?(で)?{d}<LENU@du>(を)?<HASHIRU>?(と|のに|には|たら)?((は|で)?<NAN>(時間|分|秒))?','{d}<LENU@du>(を)?(?<sp>時速|分速|秒速){s}<SPDU@su>?(で)<HASHIRU>?(と|のに|には|たら)?((は|で)?<NAN>(時間|分|秒))?'],
   f:g=>{ const mps=speedMps(g.sp,pn(g.s),g.su), m=lenM(pn(g.d),g.du); if(!mps) return R_err('速さが 0 です'); const sec=m/mps, min=sec/60;
     const inMin=/分$/.test(g.__m)||min<60;
     return pOut(inMin?min:sec/3600,inMin?'分':'時間',{a:durSay(Math.round(min*100)/100)+(min<60?'':'（'+fmt(sec/3600,2)+'時間）'), say:'かかる時間は '+durSay(Math.round(min))+' です', f:fmt(pn(g.d))+g.du+' ÷ '+g.sp+fmt(pn(g.s))+(g.su||'')}); }},
  {c:'速さ・燃費', p:['{d}<LENU@du>(を)?{%tm}(で)<HASHIRU>?(と|たら)?(ときの|時の|の)?(速さ|速度|スピード)?(は)?((?<to>時速|分速|秒速)<NAN>?<SPDU@tu>?)?'],
   f:g=>{ const m=lenM(pn(g.d),g.du), sec=pTimeSec(g.tm); if(!sec) return R_err('時間が 0 です'); const mps=m/sec, to=g.to||'時速';
     const km=g.tu?/^(キロ|km|キロメートル)$/.test(g.tu):to==='時速'; const per=to==='時速'?3600:to==='分速'?60:1; const v=mps*per/(km?1000:1);
     return pOut(v,km?'km':'m',{pre:to+' ', sayPre:to+' ', f:fmt(pn(g.d))+g.du+' ÷ '+g.tm}); }},
  {c:'速さ・燃費', p:['{d}(キロ|km)(を)?(走って|走ったら|走った|で|走ると)<GAS>?{l}<LITER><TSUKAU>?(の)?(時の|ときの|なら|だと)?(燃費)?(は)?'],
   f:g=>{ const d=pn(g.d), l=pn(g.l); if(!l) return R_err('0リットルでは出せません'); return pOut(d/l,'km/L',{pre:'燃費 ', sayPre:'燃費は 1リットルあたり ', say:'燃費は 1リットルあたり '+fmt(d/l,2)+'キロ です', f:fmt(d)+'km ÷ '+fmt(l)+'L'}); }},
  {c:'速さ・燃費', p:['<NENPI>?{e}(キロ|km)(の車)?(で){d}(キロ|km)(を)?<HASHIRU>?(と|には|のに|たら)?<GAS>?(は)?(<NAN><LITER>|<NAN><LITER>いる|<NAN><LITER>必要)?'],
   f:g=>{ const e=pn(g.e), d=pn(g.d); if(!e) return R_err('燃費が 0 です'); return pOut(d/e,'L',{pre:'ガソリン ', sayPre:'ガソリンは ', f:fmt(d)+'km ÷ '+fmt(e)+'km/L'}); }},
  {c:'速さ・燃費', p:['<NENPI>?{e}(キロ|km)(の車)?(で){d}(キロ|km)(を)?<HASHIRU>?(と|の|なら|たら)?<GASDAI>(は)?(、)?<PERL>(あたり)?{p}円(なら|だと|で)?'],
   f:g=>{ const e=pn(g.e), d=pn(g.d), p=pn(g.p); if(!e) return R_err('燃費が 0 です'); const v=d/e*p; return pOut(v,'円',{pre:'ガソリン代 ', sayPre:'ガソリン代は ', f:fmt(d)+'km ÷ '+fmt(e)+'km/L × '+fmtU(p,'円')}); }},
  {c:'速さ・燃費', p:['<GAS>?<PERL>(あたり)?{p}円(で|なら|だと)?{l}<LITER><IRERU>?','<GAS>?{l}<LITER>(を)?<PERL>(あたり)?{p}円(で|なら|だと)?<IRERU>?'],
   f:g=>tokArith(pn(g.p),'*',pn(g.l),'円','リットル')},
  // ── お金・給料 ──
  {c:'お金', p:['月給{a}円?(の|だと|なら|で)?<NENSHU>','月給{a}円?(で|と)?(ボーナス|賞与)(が)?{m}(か月|ヶ月|カ月)(分)?(の|だと|なら|で)?<NENSHU>'],
   f:g=>{ const a=pn(g.a), m=g.m?pn(g.m):0; return pOut(a*(12+m),'円',{pre:'年収 ', sayPre:'年収は ', f:fmtU(a,'円')+' × '+(12+m)+'か月'}); }},
  {c:'お金', p:['年収{a}円?(の|だと|なら|で)?<GESSHU>','年収{a}円?(を)?12(か月|ヶ月|で)(で割ると|割り|で割って)?'],
   f:g=>{ const a=pn(g.a); return pOut(a/12,'円',{pre:'1か月 ', sayPre:'1か月あたり ', f:fmtU(a,'円')+' ÷ 12'}); }},
  {c:'お金', p:['日給{a}円?(で|を|が)?{d}日<HATARAKU>?(で|と|だと|なら|したら)?'], f:g=>tokArith(pn(g.a),'*',pn(g.d),'円','日')},
  {c:'お金', p:['時給{w}円?(で|の)?(1日)?{h}時間(働いて|を|で|、)?(月|1か月|週|ひと月|月に|週に)?{d}日<HATARAKU>?(で|と|だと|なら|したら)?'],
   f:g=>{ const w=pn(g.w), h=pn(g.h), d=pn(g.d); return pOut(w*h*d,'円',{f:fmtU(w,'円')+' × '+fmt(h)+'時間 × '+fmt(d)+'日'}); }},
  {c:'お金', p:['<FREQ@fq>{a}円?(を|ずつ)?{y}(?<yu>年|か月|ヶ月|カ月|週間|日)(間)?(で)?<CHOKIN>'],
   f:g=>{ const a=pn(g.a), y=pn(g.y), days=g.yu==='年'?y*365:/月/.test(g.yu)?y*365/12:g.yu==='週間'?y*7:y;
     const per=/日/.test(g.fq)?1:/週/.test(g.fq)?7:/月/.test(g.fq)?365/12:365; let n=days/per; if(Math.abs(n-Math.round(n))<0.02) n=Math.round(n);
     if(g.yu==='年' && /週/.test(g.fq)) n=52*y; if(/月/.test(g.yu) && /月/.test(g.fq)) n=y; if(g.yu==='年' && /月/.test(g.fq)) n=12*y;
     return pOut(a*n,'円',{pre:'合計 ', sayPre:'合わせて ', f:fmtU(a,'円')+' × '+fmt(n)+'回'}); }},
  {c:'お金', p:['{P}円?(を)?<RIRITSU>{r}<PCT>(で)?{y}年(間)?<AZUKE>?(で)?(複利|単利)?(で)?(預けたら|預けると|運用したら|運用すると)?'],
   f:(g,t)=>{ const P=pn(g.P), r=pn(g.r)/100, y=pn(g.y), tan=/単利/.test(t); const v=tan?P*(1+r*y):P*Math.pow(1+r,y);
     return pOut(v,'円',{pre:(tan?'単利':'複利')+'で ', sayPre:(tan?'単利':'複利')+'で ', say:(tan?'単利':'複利')+'で '+sayU(v,'円')+'、利息は '+sayU(v-P,'円')+' です',
       f:tan?fmtU(P,'円')+' × (1 ＋ '+fmt(r)+' × '+fmt(y)+')':fmtU(P,'円')+' × '+fmt(1+r)+' ^ '+fmt(y)}); }},
  {c:'お金', p:['{P}円?(を)?<RIRITSU>{r}<PCT>(で)?{y}年(間)?<KARI>?(の|で|だと|したら|すると)?<MAITSUKI>?(の)?<HENSAI>(額)?','{P}円?(を)?{y}年(間)?(で)?<RIRITSU>{r}<PCT>(の|で)?<KARI>?(の|で|だと)?<MAITSUKI>?(の)?<HENSAI>(額)?'],
   f:g=>{ const P=pn(g.P), r=pn(g.r)/100/12, n=Math.round(pn(g.y)*12); const v=r?P*r/(1-Math.pow(1+r,-n)):P/n;
     return pOut(v,'円',{pre:'毎月 ', sayPre:'毎月の返済は ', say:'毎月の返済は '+sayU(v,'円')+'、払う合計は '+sayU(v*n,'円')+' です', f:'元利均等 '+n+'回（利息の合計 '+fmtU(Math.round(v*n-P),'円')+'）'}); }},
  {c:'お金', p:['{a}円?(を|の)?{n}回<BUNKATSU>(の|で|だと|すると)?(月々|1回|毎月|1回あたり|1回分|ひと月)?'],
   f:g=>{ const a=pn(g.a), n=pn(g.n); if(!n) return R_err('0回には分けられません'); return pOut(a/n,'円',{pre:'1回 ', sayPre:'1回あたり ', f:fmtU(a,'円')+' ÷ '+fmt(n)+'回'}); }},
  {c:'お金', p:['{a}<NU@ua>?を{p}<TAI>{q}(<TAI>{r})?(で|に|の割合で|の比で)<WAKERU>(と|たら)?'],
   f:g=>{ const a=pn(g.a), xs=[pn(g.p),pn(g.q)].concat(g.r?[pn(g.r)]:[]), s=xs.reduce((x,y)=>x+y,0); if(!s) return R_err('比が 0 です'); const u=g.ua||'';
     const parts=xs.map(x=>a*x/s); return pOut(parts[0],u,{a:parts.map(x=>fmtU(x,u)).join(' ： '), say:parts.map(x=>sayU(x,u)).join('、')+' です', f:fmtU(a,u)+' を '+xs.join(' ： ')}); }},
  {c:'お金', p:['{a}<TAI>{b}(は|=|イコール|が){c}<TAI>(<NAN>|いくつ|x|X|エックス)','{a}<TAI>{b}の{c}<TAI>(<NAN>|いくつ)?'],
   f:g=>{ const a=pn(g.a), b=pn(g.b), c=pn(g.c); if(!a) return R_err('0 の比は出せません'); return pOut(c*b/a,'',{f:fmt(a)+' ： '+fmt(b)+' ＝ '+fmt(c)+' ： x'}); }},
  {c:'お金', p:['{n}<QU@q>(で|が|、|入り|入りで)?{p}円(なら|だと|の|で|は|の時|のとき)?(1<QU>|ひとつ|単価)<ATARI>?','{p}円(で|の|が)?{n}<QU@q>(入り|なら|だと|の|で|は)?(1<QU>|ひとつ|単価)<ATARI>?','{n}<QU@q>(で|が)?{p}円(の|なら|だと)?(あたり|当たり)(の値段|の単価|単価)?'],
   f:g=>{ const n=pn(g.n), p=pn(g.p); if(!n) return R_err('0個では割れません'); return pOut(p/n,'円',{pre:'1'+g.q+' ', sayPre:'1'+g.q+'あたり ', f:fmtU(p,'円')+' ÷ '+fmt(n)+g.q}); }},
  {c:'お金', item:1, p:['{~nm}{n}<QU@q>(で|が|、|入り|入りで)?{p}円','{~nm}{p}円(で|の)?{n}<QU@q>(入り)?'],
   f:g=>{ const n=pn(g.n), p=pn(g.p); if(!n) return null; const nm=(g.nm||'').replace(/(は|が|を|の|、)+$/,''); return pOut(p,'円',{pre:'', a:(nm?nm+' ':'')+fmt(n)+g.q+'で '+fmtU(p,'円')+'（1'+g.q+' '+fmtU(Math.round(p/n*100)/100,'円')+'）', say:fmt(n)+g.q+'で '+sayU(p,'円')+'、1'+g.q+'あたり '+sayU(p/n,'円')+' です', f:fmtU(p,'円')+' ÷ '+fmt(n)+g.q}); }},
  {c:'お金', p:['{n}<WU@u>(で|が|、|入り)?{p}円(の|なら|だと|で|は)?{m}<WU@u2>(あたり|当たり|分|の値段|なら|だと|では)','{p}円(で|の)?{n}<WU@u>(の|なら|だと|で|は)?{m}<WU@u2>(あたり|当たり|分|の値段|なら|だと)'],
   f:g=>{ let bu=null, bu2=null; for(const x of convCands(g.u)) for(const y of convCands(g.u2)) if(!bu && x[0]===y[0]){ bu=x; bu2=y; } if(!bu) return R_err('量の単位がそろっていません'); const q=pn(g.n)*bu[2], q2=pn(g.m)*bu2[2]; if(!q) return R_err('量が 0 です');
     const v=pn(g.p)/q*q2; return pOut(v,'円',{pre:fmt(pn(g.m))+g.u2+'あたり ', sayPre:fmt(pn(g.m))+g.u2+'あたり ', f:fmtU(pn(g.p),'円')+' ÷ '+fmt(pn(g.n))+g.u+' × '+fmt(pn(g.m))+g.u2}); }},
  {c:'お金', p:['原価{c}円?(で|、|の|に対して)?<URINE>{s}円?(の|で|だと|なら|は|の時の|のときの|の場合の)?<RIEKIRITSU>','<URINE>{s}円?(で|、|の)?原価{c}円?(の|で|だと|なら|は|の時の|のときの|の場合の)?<RIEKIRITSU>'],
   f:g=>{ const c=pn(g.c), s=pn(g.s); if(!s) return R_err('売値が 0 です'); const v=(s-c)/s*100; return pOut(v,'%',{pre:'利益率 ', sayPre:'利益率は ', f:'('+fmtU(s,'円')+' − '+fmtU(c,'円')+') ÷ '+fmtU(s,'円')}); }},
  {c:'お金', p:['原価{c}円?(で|、|の|に対して)?<URINE>{s}円?(の|で|だと|なら|は|の時の|のときの|の場合の)?<RIEKI>','<URINE>{s}円?(で|、|の)?原価{c}円?(の|で|だと|なら|は|の時の|のときの|の場合の)?<RIEKI>'],
   f:g=>{ const c=pn(g.c), s=pn(g.s); return tokArith(s,'-',c,'円','円'); }},
  {c:'お金', p:['原価{c}円?(で|、|の|に対して)?<URINE>{s}円?(の|で|だと|なら|は|の時の|のときの|の場合の)?<GENKARITSU>','<URINE>{s}円?(で|、|の)?原価{c}円?(の|で|だと|なら|は|の時の|のときの|の場合の)?<GENKARITSU>'],
   f:g=>{ const c=pn(g.c), s=pn(g.s); if(!s) return R_err('売値が 0 です'); return pOut(c/s*100,'%',{pre:'原価率 ', sayPre:'原価率は ', f:fmtU(c,'円')+' ÷ '+fmtU(s,'円')}); }},
  // ── 年齢・和暦・時刻 ──
  {c:'年齢・和暦・時刻', p:['<ERA@e>{n}年(は|って)?西暦(で|だと|では)?(<NAN>年)?','<ERA@e>{n}年(を)?西暦(に|で)(すると|直すと|直して|変換)?'],
   f:g=>{ const n=pn(g.n), y=ERA_BASE[g.e]+n-1; if(n<1||y>ERA_END[g.e]) return R_err(g.e+n+'年はありません'); return pOut(y,'年',{a:'西暦 '+y+'年', say:'西暦 '+y+'年 です', f:g.e+(n===1?'元':n)+'年 → '+ERA_BASE[g.e]+' ＋ '+(n-1)}); }},
  {c:'年齢・和暦・時刻', p:['(西暦)?{y}年(は|って)?<ERA@e>(で|だと|では)?(<NAN>年)?','(西暦)?{y}年(を)?<ERA@e>(に|で)(すると|直すと|直して|変換)?'],
   f:g=>{ const y=pn(g.y), n=y-ERA_BASE[g.e]+1; if(n<1||y>ERA_END[g.e]) return R_err(y+'年は'+g.e+'ではありません'); return pOut(n,'年',{a:g.e+(n===1?'元':n)+'年', say:g.e+(n===1?'元':n)+'年 です', f:y+' − '+ERA_BASE[g.e]+' ＋ 1'}); }},
  {c:'年齢・和暦・時刻', p:['(西暦)?{y}年(は|って)?(和暦|元号)(で|だと|では)?(<NAN>年)?','(西暦)?{y}年(を)?(和暦|元号)(に|で)(すると|直すと|直して|変換)?'],
   f:g=>{ const y=pn(g.y), o=toEra(y); if(!o) return R_err('明治より前は分かりません'); const s=eraStr(o); return pOut(o.n,'年',{a:s, say:s+' です', f:y+'年 → '+s}); }},
  {c:'年齢・和暦・時刻', p:['<ERA@e>?{y}年({mo}月({d}日)?)?<UMARE>(は|の人は|の人|って)?(今|今年|いま)?(<NAN>|いくつ)?<SAI>?(になる)?'],
   f:g=>{ let y=pn(g.y); if(g.e){ if(y<1) return R_err('年が読めませんでした'); y=ERA_BASE[g.e]+y-1; }
     const now=today(), age=now.getFullYear()-y;
     if(g.mo){ const mo=pn(g.mo), d=g.d?pn(g.d):1; const had=(now.getMonth()+1>mo)||((now.getMonth()+1===mo)&&now.getDate()>=d); const a=had?age:age-1;
       return pOut(a,'歳',{a:a+'歳', say:'いま '+a+'歳 です', f:y+'年'+mo+'月'+(g.d?d+'日':'')+'生まれ → '+ymdStr(now)}); }
     return pOut(age,'歳',{a:'今年 '+age+'歳', say:'今年の誕生日で '+age+'歳 です（誕生日の前なら '+(age-1)+'歳）', f:now.getFullYear()+' − '+y}); }},
  // ── 和暦⇔西暦・年齢・年月の あいだ（v24：月・日つき・「生まれ」なし・「何年」だけ・数だけ）──
  {c:'年齢・和暦・時刻', p:['<ERA@e>{n}年({mo}月({d}日)?)?(<UMARE>)?(は|って|の)?西暦(は|で|だと|では|に|にすると|に直すと)?(<NAN>年)?(<NAN>月)?(<NAN>日)?',
     '<ERA@e>{n}年({mo}月({d}日)?)?(<UMARE>)?(は|って)?<NAN>年(<NAN>月)?(<NAN>日)?', '<ERA@e>{n}(年)?({mo}月({d}日)?)?'],
   f:g=>fromEraOut(g.e, pn(g.n), g.mo!=null?pn(g.mo):null, g.d!=null?pn(g.d):null)},
  {c:'年齢・和暦・時刻', p:['(西暦)?{y}年(({mo}月({d}日)?)?)?(<UMARE>)?(は|って|の)?(西暦)?(和暦|元号)(で|だと|では|に|にすると|に直すと)?(は)?(<NAN>年)?(<NAN>月)?(<NAN>日)?'],
   f:g=>toEraOut(pn(g.y), g.mo!=null?pn(g.mo):null, g.d!=null?pn(g.d):null)},
  {c:'年齢・和暦・時刻', p:['(西暦)?{y}年{mo}月({d}日)?(<UMARE>)?(は|って|の)?<ERA@e>(で|だと|では)?(<NAN>年)?(<NAN>月)?'],
   f:g=>{ const y=pn(g.y), n=y-ERA_BASE[g.e]+1; if(n<1||y>ERA_END[g.e]) return R_err(y+'年は'+g.e+'ではありません'); const s=eraTxt(g.e,n,pn(g.mo),g.d!=null?pn(g.d):null); return pOut(n,'年',{a:s, say:s+' です', f:ymdTxt(y,pn(g.mo),g.d!=null?pn(g.d):null)+' → '+s}); }},
  {c:'年齢・和暦・時刻', p:['<ERA@e>?{y}年({mo}月({d}日)?)?(<UMARE>)?(の人)?(は|って)?(今|今年|いま)?(<NAN><SAI>|いくつ)(になる|になった)?'],
   f:g=>{ const r=pYMD(g.e, g.y, g.mo, g.d); if(r.err) return R_err(r.err); return ageOut(r.y, r.mo, r.d); }},
  {c:'年齢・和暦・時刻', p:['<ERA@e1>?{y1}年{m1}月({d1}日)?(-|−)?(から)?<HIKU>?<ERA@e2>?{y2}年{m2}月({d2}日)?(を)?<HIKU>?(の)?(期間|年数|月数|差)?',
     '<ERA@e1>?{y1}年{m1}月({d1}日)?(から|より)<ERA@e2>?{y2}年{m2}月({d2}日)?(まで|までは|までの)?(の)?(期間|年数|月数|日数|何年|何年間|何か月|何ヶ月|何年何か月|何年何ヶ月|何日|どれくらい|どのくらい)?'],
   f:g=>{ const a=pYMD(g.e1, g.y1, g.m1, g.d1), b=pYMD(g.e2, g.y2, g.m2, g.d2); if(a.err) return R_err(a.err); if(b.err) return R_err(b.err); return ymDiffOut(a, b); }},
  {c:'年齢・和暦・時刻', p:['<ERA@e>?{y}年({mo}月({d}日)?)?(-|−|から|<HIKU>)(-|−|から|<HIKU>)?{n}'],
   f:g=>{ const n=pn(g.n), r=pYMD(g.e, g.y, g.mo, g.d); if(r.err) return R_err(r.err);
     if(n>=1000 && Number.isInteger(n)){ const b={y:n, mo:r.mo||1, d:null, s:n+'年'+(r.mo?r.mo+'月':'')}; const o=ymDiffOut(Object.assign({}, r, {mo:r.mo||1, d:null}), b); if(!r.mo) o.a=Math.abs(r.y-n)+'年'; return o; }
     return Object.assign(R_info('引く年月を 最後まで 言ってください', '「'+r.s+'」から 引く年月を 最後まで 言ってください', '例：「'+r.s+' 引く 2014年6月」'), {hint:r.s+'引く2014年6月'}); }},
  {c:'年齢・和暦・時刻', p:['<ERA@e>?{y}年({mo}月({d}日)?)?(から|まで)'],
   f:g=>{ const r=pYMD(g.e, g.y, g.mo, g.d); if(r.err) return R_err(r.err);
     const o=g.e ? ymdTxt(r.y, r.mo, r.d) : (r.mo ? (eraOfYMD(r.y, r.mo, r.d) ? eraTxt(eraOfYMD(r.y,r.mo,r.d).e, eraOfYMD(r.y,r.mo,r.d).n, r.mo, r.d) : '') : (toEra(r.y) ? eraStr(toEra(r.y)) : ''));
     return Object.assign(R_info(r.s+(o?' は '+o+' です':'')+'。いつまでかも 言うと、あいだの 年月を出します',
       r.s+(o?' ＝ '+o:''), '例：「'+r.s+'から'+(r.y+1)+'年3月まで」'), {v:g.e?r.y:undefined}); }},
  {c:'年齢・和暦・時刻', p:['{a}<SAI>(は|って|の人は|の人|なら|だと)?(<NAN>年|いつ)?(の)?<UMARE>'],
   f:g=>{ const a=pn(g.a), y=today().getFullYear()-a; return pOut(y,'年',{a:y+'年生まれ（誕生日の前なら '+(y-1)+'年）', say:y+'年生まれ です。今年の誕生日がまだなら '+(y-1)+'年 です', f:today().getFullYear()+' − '+a}); }},
  {c:'年齢・和暦・時刻', p:['(?<ap>午前|午後)?{h}時({m}分|(?<half>半))?(の|から)({dh}時間)?({dm}分)?<NOCHI@w>(は)?(<NAN>時)?'],
   f:g=>{ if(!g.dh && !g.dm) return null; let H=pn(g.h); if(g.ap==='午後'&&H<12) H+=12; const start=H*60+(g.m?pn(g.m):(g.half?30:0));
     const dmin=(g.dh?pn(g.dh)*60:0)+(g.dm?pn(g.dm):0), sign=g.w==='前'?-1:1; let x=start+sign*dmin, day='';
     while(x<0){ x+=1440; day='前の日の '; } while(x>=1440){ x-=1440; day='次の日の '; }
     const hh=Math.floor(x/60), mm=Math.round(x-hh*60), s=day+hh+'時'+(mm?mm+'分':'');
     return R_ok(s+' です', s, fmtClock(start)+(sign>0?' ＋ ':' − ')+durSay(dmin), {dv:x/60}); }},   // dv：表電卓の表示に出す数（16時15分 → 16.25）
  // ── 薄める（v17）：「100倍で4L」＝ 4L 作るのに原液はいくら ──
  {c:'薄める', p:['<GENEKI>?(を)?{n}倍<USUME>?(で|を|の|にして|には|なら|するには|にするには)?(、)?(水)?{v}<VOL@u>(を|に)?<TSUKURU>?(には|なら|とき|場合|だと|の|で)?(、)?<GENEKI>?(は|が|を)?<NANML>?<IRU>?',
                  '{v}<VOL@u>(を|に|で)?<TSUKURU>?(の|には|なら|で)?(、)?<GENEKI>?(を)?{n}倍<USUME>?(で|には|なら|だと|にするには|にするなら|にするとき)?(、)?<GENEKI>?(は|が|を)?<NANML>?<IRU>?',
                  '水{v}<VOL@u>(に|で|を)(、)?<GENEKI>?(を)?{n}倍<USUME>?(で|には|なら|だと|にするには)?(、)?<GENEKI>?(は|が|を)?<NANML>?<IRU>?'],
   f:g=>{ const n=pn(g.n), ml=volMl(pn(g.v),g.u); if(!(n>1)) return null; const x=ml/n;
     return pOut(x,'ml',{a:'原液 '+fmtVol(x)+'（水 '+fmtVol(ml-x)+'）', say:'原液は '+sayVol(x)+'、水は '+sayVol(ml-x)+' です', f:fmtVol(ml)+' ÷ '+fmt(n)+'倍'}); }},
  // ── 割り勘・等分（v17）──
  {c:'割り勘', p:['{n}人で{a}円(を)?<WARIKAN>(すると|したら|して|で)?(1人|ひとり)?(あたり)?(いくら|何円)?'],
   f:g=>{ const n=pn(g.n), a=pn(g.a); if(!n) return R_err('0人では割れません'); return pOut(a/n,'円',{pre:'1人あたり ', sayPre:'ひとり ', f:fmtU(a,'円')+' ÷ '+fmt(n)+'人'}); }},
  {c:'割り勘', p:['{a}<WU@u>?(を)?{n}(等分|とうぶん|つに分ける|つに分けると|つに分けたら|個に分ける|個に分けると|人分に分ける)(すると|したら|して|で)?(1つ|ひとつ|1個|1人)?(あたり|分|ぶん)?(は)?(いくら|何|どれだけ)?','{a}円(を)?{n}(等分|とうぶん)(すると|したら|して|で)?(1つ|ひとつ|1人)?(あたり|分)?(は)?(いくら)?'],
   f:g=>{ const n=pn(g.n), a=pn(g.a); if(!n) return R_err('0 には分けられません'); const u=g.u||(/円/.test(g.__m)?'円':''); return pOut(a/n,u,{pre:'1つ ', sayPre:'ひとつ ', f:fmtU(a,u)+' ÷ '+fmt(n)}); }},
  // ── 値段（v17）：「1個120円のを15個」「3個で450円なら5個」「100gあたり198円で350g」──
  {c:'お金', p:['{~nm}1<QU@q>{p}円(の|のを|を|のもの|のものを|の物を|のやつを|のやつ|で)?{n}<QU>(で|だと|なら|買うと|買ったら|買う|分)?(は)?(いくら|何円|合計|全部で|ぜんぶで)?'],
   f:g=>{ const n=pn(g.n), p=pn(g.p); return pOut(p*n,'円',{f:fmtU(p,'円')+' × '+fmt(n)+g.q}); }},
  {c:'お金', p:['{~nm}{m}<QU@q>(で|が)?{p}円(なら|だと|の|で|のとき|の時)(、)?{n}<QU>(は|だと|なら|で|買うと|買ったら|分)?(いくら|何円)?'],
   f:g=>{ const m=pn(g.m), n=pn(g.n), p=pn(g.p); if(!m) return R_err('0個では割れません'); return pOut(p/m*n,'円',{pre:fmt(n)+g.q+' ', sayPre:fmt(n)+g.q+'で ', f:fmtU(p,'円')+' ÷ '+fmt(m)+g.q+' × '+fmt(n)+g.q}); }},
  {c:'お金', p:['{~nm}{b}<WU@u>(あたり|当たり|につき|で)?{p}円(で|なら|だと|の|のを|を)(、)?{q}<WU@u2>(は|だと|なら|で|買うと|買ったら|分)?(いくら|何円)?'],
   f:g=>{ let bu=null, bu2=null; for(const x of convCands(g.u)) for(const y of convCands(g.u2)) if(!bu && x[0]===y[0]){ bu=x; bu2=y; } if(!bu) return null;
     const b=pn(g.b)*bu[2], q=pn(g.q)*bu2[2]; if(!b) return R_err('0 では割れません'); const v=pn(g.p)/b*q;
     return pOut(v,'円',{pre:fmt(pn(g.q))+g.u2+' ', sayPre:fmt(pn(g.q))+g.u2+'で ', f:fmtU(pn(g.p),'円')+' ÷ '+fmt(pn(g.b))+g.u+' × '+fmt(pn(g.q))+g.u2}); }},
  // ── 両替（v17）：レートを言ったときだけ ──
  {c:'お金', p:['1<CUR@c>(が|=|イコール|は)?{r}円(で|なら|だと|のとき|の時)(、)?{a}<CUR>(は)?(何円|いくら|日本円で|円で|円)?(いくら)?','{a}<CUR@c>(を|は)?(、)?1<CUR>{r}円(で|なら|だと)(何円|いくら|日本円で|円に)?(すると|したら|なる)?'],
   f:g=>{ const r=pn(g.r), a=pn(g.a); return pOut(a*r,'円',{f:fmt(a)+g.c+' × '+fmtU(r,'円')}); }},
  {c:'お金', p:['1<CUR@c>(が|=|イコール|は)?{r}円(で|なら|だと|のとき|の時)(、)?{a}円(は|を|で)?(何|なん)<CUR>(になる|ですか)?','{a}円(を|は)?(、)?1<CUR@c>{r}円(で|なら|だと)(何|なん)<CUR>(になる|ですか)?'],
   f:g=>{ const r=pn(g.r), a=pn(g.a); if(!r) return R_err('レートが 0 です'); const v=a/r; return pOut(v,g.c,{a:fmt(v,2)+g.c, say:fmt(v,2)+g.c+' です', f:fmtU(a,'円')+' ÷ '+fmtU(r,'円')}); }},
  {c:'お金', p:['{a}円(は|を|って)?(何|なん)<CUR@c>(になる|ですか|に両替すると|に替えると)?'],
   f:g=>Object.assign(R_err('1'+g.c+'が何円かも言ってください'), {a:'1'+g.c+'が何円かも言ってください（「1'+g.c+'150円で'+fmt(pn(g.a))+'円は何'+g.c+'」）'})},
  // ── 時間を分に（v17）──
  {c:'時間', p:['{h}時間{m}分(は|を|って)?(何分|なんぷん|分に|分で|分に直すと|分にすると)(ですか)?'],
   f:g=>{ const v=pn(g.h)*60+pn(g.m); return pOut(v,'分',{f:fmt(pn(g.h))+'時間 × 60 ＋ '+fmt(pn(g.m))+'分'}); }},
  // ── 利息（v17）：年利を先に言う言い方 ──
  {c:'お金', p:['<RIRITSU>{r}<PCT>(で)?(、)?{P}円?(を)?{y}年(間)?<AZUKE>?(で)?(複利|単利)?(で)?(預けたら|預けると|運用したら|運用すると)?(いくら)?(になる)?'],
   f:g=>{ const P=pn(g.P), r=pn(g.r)/100, y=pn(g.y), tan=/単利/.test(g.__m); const v=tan?P*(1+r*y):P*Math.pow(1+r,y);
     return pOut(v,'円',{pre:(tan?'単利':'複利')+'で ', sayPre:(tan?'単利':'複利')+'で ', say:(tan?'単利':'複利')+'で '+sayU(v,'円')+'、利息は '+sayU(v-P,'円')+' です', f:fmtU(P,'円')+(tan?' × (1 ＋ '+fmt(r*100)+'% × '+fmt(y)+'年)':' × (1 ＋ '+fmt(r*100)+'%)^'+fmt(y))}); }},
  // ── 図形 ──
  {c:'図形', p:['(半径|はんけい){r}<LU@u>?(の)?<EN>?(の)?<MENSEKI>'], f:g=>{ const r=pn(g.r); return pOut(Math.PI*r*r,areaU(g.u),{pre:'面積 ', sayPre:'面積は ', f:'π × '+fmt(r)+'²'}); }},
  {c:'図形', p:['(直径|ちょっけい){d}<LU@u>?(の)?<EN>?(の)?<MENSEKI>'], f:g=>{ const r=pn(g.d)/2; return pOut(Math.PI*r*r,areaU(g.u),{pre:'面積 ', sayPre:'面積は ', f:'π × '+fmt(r)+'²'}); }},
  {c:'図形', p:['(半径|はんけい){r}<LU@u>?(の)?<EN>?(の)?<ENSHU>'], f:g=>{ const r=pn(g.r); return pOut(2*Math.PI*r,lenU(g.u),{pre:'円周 ', sayPre:'円周は ', f:'2 × π × '+fmt(r)}); }},
  {c:'図形', p:['(直径|ちょっけい){d}<LU@u>?(の)?<EN>?(の)?<ENSHU>'], f:g=>{ const d=pn(g.d); return pOut(Math.PI*d,lenU(g.u),{pre:'円周 ', sayPre:'円周は ', f:'π × '+fmt(d)}); }},
  {c:'図形', p:['(縦|たて){a}<LU@ua>?(、)?(横|よこ){b}<LU@ub>?(の)?<CHOHO>?(の)?<MENSEKI>','(横|よこ){b}<LU@ub>?(、)?(縦|たて){a}<LU@ua>?(の)?<CHOHO>?(の)?<MENSEKI>'],
   f:g=>{ const D=dimsU([[g.a,g.ua],[g.b,g.ub]]), [a,b]=D.v; return pOut(a*b,areaU(D.u),{pre:'面積 ', sayPre:'面積は ', f:fmt(a)+' × '+fmt(b)}); }},
  {c:'図形', p:['(1辺|1辺が|1辺の長さが|1辺の長さ){a}<LU@u>?(の)?(正方形)(の)?<MENSEKI>','{a}<LU@u>?(4方|四方)(の)?<MENSEKI>?'],
   f:g=>{ const a=pn(g.a); return pOut(a*a,areaU(g.u),{pre:'面積 ', sayPre:'面積は ', f:fmt(a)+' × '+fmt(a)}); }},
  {c:'図形', p:['底辺{a}<LU@ua>?(、)?高さ{b}<LU@ub>?(の)?(3角形|3角)?(の)?<MENSEKI>'], f:g=>{ const D=dimsU([[g.a,g.ua],[g.b,g.ub]]), [a,b]=D.v; return pOut(a*b/2,areaU(D.u),{pre:'面積 ', sayPre:'面積は ', f:fmt(a)+' × '+fmt(b)+' ÷ 2'}); }},
  {c:'図形', p:['上底{a}<LU@ua>?(、)?下底{b}<LU@ub>?(、)?高さ{h}<LU@uh>?(の)?(台形)?(の)?<MENSEKI>'], f:g=>{ const D=dimsU([[g.a,g.ua],[g.b,g.ub],[g.h,g.uh]]), [a,b,h]=D.v; return pOut((a+b)*h/2,areaU(D.u),{pre:'面積 ', sayPre:'面積は ', f:'('+fmt(a)+' ＋ '+fmt(b)+') × '+fmt(h)+' ÷ 2'}); }},
  {c:'図形', p:['(縦|たて){a}<LU@ua>?(、)?(横|よこ){b}<LU@ub>?(、)?(高さ|奥行き|奥行){c}<LU@uc>?(の)?(直方体|箱|部屋|水槽)?(の)?<TAISEKI>'], f:g=>{ const D=dimsU([[g.a,g.ua],[g.b,g.ub],[g.c,g.uc]]), [a,b,c]=D.v; return pOut(a*b*c,volU(D.u),{pre:'体積 ', sayPre:'体積は ', f:fmt(a)+' × '+fmt(b)+' × '+fmt(c)}); }},
  {c:'図形', p:['底辺{a}<LU@ua>?(、)?高さ{b}<LU@ub>?(、)?(奥行き|奥行|長さ|厚さ|深さ){c}<LU@uc>?(の)?(3角柱)(の)?<TAISEKI>'],
   f:g=>{ const D=dimsU([[g.a,g.ua],[g.b,g.ub],[g.c,g.uc]]), [a,b,c]=D.v; return pOut(a*b/2*c,volU(D.u),{pre:'体積 ', sayPre:'体積は ', f:fmt(a)+' × '+fmt(b)+' ÷ 2 × '+fmt(c)}); }},
  {c:'図形', p:['(3角形|3角|3角柱|3角すい|3角錐)(の)?(<TAISEKI>|<MENSEKI>)'],
   f:(g,t)=>{ const men=/面積|広さ/.test(t), chu=/柱/.test(t);
     return Object.assign(R_info(men ? '底辺と高さを 言ってください' : '長さを 言ってください',
       men ? '三角形の面積は 底辺 × 高さ ÷ 2 です。底辺と高さを 言ってください' : (chu ? '三角柱の体積は 底辺 × 高さ ÷ 2 × 奥行き です。3つの長さを 言ってください' : '三角形は 平らなので 体積は ありません。三角柱なら 底辺 × 高さ ÷ 2 × 奥行き、三角形の面積なら 底辺 × 高さ ÷ 2 です'),
       men ? '例：「底辺6高さ4の三角形の面積」' : '例：「底辺6m高さ4m奥行き10mの三角柱の体積」「底辺6高さ4の三角形の面積」'),
       {ideas:men ? [{t:'底辺6高さ4の三角形の面積'},{t:'底辺6m高さ4m奥行き10mの三角柱の体積'}] : [{t:'底辺6m高さ4m奥行き10mの三角柱の体積'},{t:'底辺6高さ4の三角形の面積'}]}); }},
  {c:'図形', p:['(1辺|1辺が|1辺の長さが){a}<LU@u>?(の)?(立方体|サイコロ)(の)?<TAISEKI>'], f:g=>{ const a=pn(g.a); return pOut(a*a*a,volU(g.u),{pre:'体積 ', sayPre:'体積は ', f:fmt(a)+'³'}); }},
  {c:'図形', p:['(半径){r}<LU@u>?(の)?(球|ボール)(の)?<TAISEKI>'], f:g=>{ const r=pn(g.r); return pOut(4/3*Math.PI*r*r*r,volU(g.u),{pre:'体積 ', sayPre:'体積は ', f:'4/3 × π × '+fmt(r)+'³'}); }},
  {c:'図形', p:['(半径){r}<LU@u>?(の)?(球|ボール)(の)?(表面積)'], f:g=>{ const r=pn(g.r); return pOut(4*Math.PI*r*r,areaU(g.u),{pre:'表面積 ', sayPre:'表面積は ', f:'4 × π × '+fmt(r)+'²'}); }},
  {c:'図形', p:['(半径){r}<LU@ur>?(、)?(高さ){h}<LU@uh>?(の)?(円柱|円筒|缶)(の)?<TAISEKI>'], f:g=>{ const D=dimsU([[g.r,g.ur],[g.h,g.uh]]), [r,h]=D.v; return pOut(Math.PI*r*r*h,volU(D.u),{pre:'体積 ', sayPre:'体積は ', f:'π × '+fmt(r)+'² × '+fmt(h)}); }},
  {c:'図形', p:['(半径){r}<LU@ur>?(、)?(高さ){h}<LU@uh>?(の)?(円すい|円錐)(の)?<TAISEKI>'], f:g=>{ const D=dimsU([[g.r,g.ur],[g.h,g.uh]]), [r,h]=D.v; return pOut(Math.PI*r*r*h/3,volU(D.u),{pre:'体積 ', sayPre:'体積は ', f:'π × '+fmt(r)+'² × '+fmt(h)+' ÷ 3'}); }},
  {c:'図形', p:['(縦|たて){a}<LU@ua>?(、)?(横|よこ){b}<LU@ub>?(の)?(長方形の)?(対角線)(の長さ)?','(直角を挟む|直角をはさむ)?(2辺が)?{a}<LU@ua>?と{b}<LU@ub>?(の)?(直角3角形の)?(斜辺)(の長さ)?'],
   f:g=>{ const D=dimsU([[g.a,g.ua],[g.b,g.ub]]), [a,b]=D.v; return pOut(Math.hypot(a,b),lenU(D.u),{f:'√('+fmt(a)+'² ＋ '+fmt(b)+'²)'}); }},
  // ── からだ ──
  {c:'からだ', p:['身長{h}<HU@hu>?(、|で)?体重{w}<WU2>?(の|で|だと|なら|の人の)?<BMI>'],
   f:g=>{ let h=pn(g.h); if(/^(センチ|cm)$/.test(g.hu||'')||h>3) h/=100; const w=pn(g.w); if(!h) return R_err('身長が 0 です'); const v=w/(h*h);
     const c=v<18.5?'低体重':v<25?'普通体重':v<30?'肥満（1度）':v<35?'肥満（2度）':v<40?'肥満（3度）':'肥満（4度）';
     return pOut(v,'',{a:'BMI '+fmt(v,1)+'（'+c+'）', say:'BMI は '+fmt(v,1)+'、'+c+' です', f:fmt(w)+'kg ÷ '+fmt(h,2)+'m²'}); }},
  {c:'からだ', p:['身長{h}<HU@hu>?(の|で|だと|なら|の人の)?<HYOJUN@k>'],
   f:g=>{ let h=pn(g.h); if(/^(センチ|cm)$/.test(g.hu||'')||h>3) h/=100; const k=/美容/.test(g.k)?20:22, v=k*h*h;
     return pOut(v,'kg',{pre:(k===20?'美容体重 ':'標準体重 '), sayPre:(k===20?'美容体重は ':'標準体重は '), f:fmt(h,2)+'m² × '+k}); }},
];
/* ════════════ くらし・買い物・お金（v7。1000種類へ 向けた 1回目）════════════
   K(分類, 型, 数→[答え, 単位, 見出し, 式]) で 短く 書く。n には 型の {a} などが 数で 入る（g は もとの 文字）。
   画面の 早見表には 出さない（読める だけ）。前からの 型が 先に 当たるので、前の 答えは 変わらない。 */
const yen=v=>fmtU(v,'円');
function K(c,p,fn){ return {c, p, f:(g,t)=>{ const n={}; for(const k in g) if(k!=='__m' && /^\d/.test(g[k]||'')) n[k]=pn(g[k]);
  const r=fn(n,g,t); if(!r) return null; if(r.cls) return r; const v=r[0], u=r[1], lb=r[2];
  if(v==null || !isFinite(v)) return R_err('計算できませんでした');
  return pOut(v,u,{pre:lb?lb+' ':'', sayPre:lb?lb+'は ':'', f:r[3]||''}); }}; }
const PMT=(P,r,y)=>{ const i=r/100/12, m=Math.round(y*12); return i?P*i/(1-Math.pow(1+i,-m)):P/m; };
function incomeTax(a){ const T=[[1950000,.05,0],[3300000,.10,97500],[6950000,.20,427500],[9000000,.23,636000],[18000000,.33,1536000],[40000000,.40,2796000],[Infinity,.45,4796000]];
  for(const [lim,r,d] of T) if(a<=lim) return {v:Math.max(0,a*r-d), r, d}; }
const SPOON={砂糖:9,上白糖:9,グラニュー糖:12,塩:18,食塩:18,醤油:18,しょうゆ:18,しょう油:18,味噌:18,みそ:18,みりん:18,酒:15,料理酒:15,酢:15,お酢:15,水:15,牛乳:15,油:12,サラダ油:12,ごま油:12,オリーブオイル:12,バター:12,マヨネーズ:12,ケチャップ:15,はちみつ:21,蜂蜜:21,小麦粉:9,薄力粉:9,強力粉:9,片栗粉:9,パン粉:3,粉チーズ:6,ソース:18,ウスターソース:18,めんつゆ:18,ポン酢:18,生クリーム:15,ジャム:21,ごま:9,ココア:6,重曹:12,ベーキングパウダー:12,コンソメ:9,だしの素:9,カレー粉:6};
PW.SPOON=Object.keys(SPOON);
PW.WATT=['ワット','W','w'];
PW.KWH=['キロワットアワー','キロワット時','kWh','kwh','KWH'];
PW.GMU=['グラム','g','ml','ミリリットル','cc','個','本','枚','杯','カップ','リットル','L','キロ','kg','合','束','袋','缶','切れ','片','丁','玉','尾','匹'];
PW.CNT=['個','つ','枚','本','錠','粒','回','回分','ml','ミリリットル','グラム','g','杯','袋','包','滴','ページ','キロ','kg','リットル','L'];
PW.KCAL=['キロカロリー','カロリー','kcal','Kcal','KCAL'];
PW.DENKI=['電気代','電気料金','電気の料金','電気代の目安'];
PW.MOTO=['元が取れる','元を取れる','元がとれる','元をとれる','元を取る','元取れる','得','お得','得になる','ペイする','ペイできる'];
PW.OTSURI=['お釣り','おつり','釣り銭','つり銭','釣り','お返し'];
PW.NOKORI=['残り','のこり','残額','残金','残高','余り','あまり'];
PW.TSUKAU2=['使ったら','使うと','使った','使って','払ったら','払うと','払った','払って','買ったら','買うと','買った','買って','引いたら','引くと','出したら','出すと'];
PW.RISOKU=['利息','利子','金利','利息額','利子額','受取利息','金利分'];
PW.ZEIGO=['税引き後','税引後','税引き後の手取り','税引き後の金額','手取り','税引き'];
PW.SOGAKU=['総額','総支払額','総返済額','支払総額','返済総額','払う総額','返す総額','支払いの合計','返済の合計','合計'];
PW.RISOKUG=['利息の合計','利息総額','利息の総額','利息','利子','利子の合計','金利負担','払う利息'];
PW.KABU=['株','かぶ'];
PW.SONEKI=['利益','損益','もうけ','儲け','損得','差益','売却益','儲かる','もうかる'];
PW.RIMAWARI=['利回り','表面利回り','配当利回り','年利回り','利回りは'];
PW.TANKA=['単価','平均単価','平均取得単価','取得単価','平均価格','平均取得価格','平均','平均の値段'];
PW.URIAGE=['売上','売り上げ','売上高','売上げ','年商','月商'];
PW.GENKA=['原価','仕入れ','仕入','仕入れ値','仕入値','コスト','仕入れ価格'];
PW.BAIKA=['売値','売価','売り値','販売価格','定価','値段','価格','売る値段'];
PW.YACHIN=['家賃','賃料','家賃の','部屋代'];
PW.MEYASU=['目安','めやす','上限','適正','相場','適正額','上限額'];
PW.TEDORI2=['手取り','手取','月収','給料','月給','収入'];
PW.SHUNYU=['収入','給料','月収','手取り','売上','収入が','もらって'];
PW.SHISHUTSU=['支出','出費','生活費','経費','支払い','使ったお金','使った額','コスト','費用'];
PW.SHUSHI=['残り','収支','貯金','黒字','余り','残る額','貯金できる額','手元に残る額','利益','差し引き','差引'];
PW.JIKYU=['時給','時間給','時間単価','1時間あたり','時間あたり','1時間いくら'];
PW.ZANGYO=['残業','残業代','時間外','時間外労働','残業手当','時間外手当'];
PW.SHINYA=['深夜','深夜労働','深夜勤務','夜勤','深夜手当','深夜残業'];
PW.KYUJITSU=['休日','休日出勤','休日労働','休出','休日手当','休日勤務'];
PW.HIWARI=['日割り','日割','日割り計算','日割り家賃','日割りで','日割り額'];
PW.TESURYO=['手数料','マージン','仲介料','紹介料','サービス料','決済手数料','中間マージン','コミッション','歩合'];
PW.KAZEI=['課税所得','課税される所得','課税所得金額','課税対象','所得'];
PW.KAERU=['買える','買えます','買えますか','買えるか','買えるの','買える数','買えるだけ買うと','買うと'];
PW.MOTSU=['もつ','持つ','もちます','持ちます','分','ぶん','使える','足りる','続く','飲める','食べられる','でなくなる','で無くなる','でなくなりますか','もつか'];
PW.KAKARU2=['かかる','かかった','かけた','かけて','かかって','で','で終わる','で終わった','働いた','働いて','作業','作業した'];
PW.MAITSUKI2=['毎月','月々','月','ひと月','1か月','1ヶ月','月に'];
PW.TSUMITATE=['積み立て','積立','積み立てる','積み立てると','積み立てたら','積立て','つみたて','積み立てて','積立投資','投資','投資すると','投資したら','運用','運用すると','運用したら','貯めると','貯めたら','貯金すると','貯金したら'];
PW.TAMERU=['貯める','ためる','貯めたい','ためたい','貯めるには','ためるには','貯金する','貯金したい','貯金するには','用意する','用意したい','用意するには','作る','作りたい','作るには','貯めるなら'];
PW.KARIRARERU=['借りられる','借りられる額','借りれる','借りれる額','借入可能額','借りられる金額','借入できる額','ローンが組める','組めるローン','借りることができる'];
PW.INFURE=['インフレ','物価上昇','物価が上がると','インフレ率','物価上昇率','値上がり'];
PW.SORYO=['送料','配送料','運賃','手数料','代引き手数料','配達料','送料込み'];
PW.KUPON=['クーポン','割引券','値引き券','割引クーポン','ポイント','ポイント利用','ポイントを使う','ポイントを使って','値引き','引き','引','オフ'];
PW.JISSHITSU=['実質','実質価格','実質負担','実質の値段','実質いくら','実質負担額','実質の金額','実質で'];
PW.TSUBO=['坪単価','坪あたり','1坪あたり','1坪','坪当たり'];
PW.HEIBEI=['平米','㎡','平方メートル','m2','へいべい'];
PW.NINBUN=['人分','人前','人ぶん','人用','人'];
PHRASES.push(
  // ── 買い物 ──
  K('買い物',['{a}円?(で|の|に|を)?{p}<PCT>(の)?(ポイント)?還元(の|だと|なら|で|は)?<JISSHITSU>','<JISSHITSU>(は)?{a}円?(で|の)?{p}<PCT>(ポイント)?還元(だと|なら|で)?'], n=>[n.a*(1-n.p/100),'円','実質',yen(n.a)+' × '+fmt(1-n.p/100)]),
  K('買い物',['{a}円?(で|の|に)?{b}(ポイント|円分のポイント|円のポイント)(が|は|の|で|だと)?(付く|つく|もらえる|貯まる|たまる)?(と|なら)?(何<PCT>還元|還元率|ポイント還元率|何<PCT>)'], n=>n.a?[n.b/n.a*100,'%','還元率',fmt(n.b)+' ÷ '+yen(n.a)]:R_err('金額が 0 です')),
  K('買い物',['{a}円?(で|の|に)?ポイント{k}倍(、|で|の|だと|なら)?(通常|基本|ふだん|普段|もともと)?(は)?{p}<PCT>(還元)?(のポイント|だと|なら)?','{a}円?(の|で)?{p}<PCT>(還元)?(の)?ポイント{k}倍(だと|なら|で)?'], n=>[n.a*n.p/100*n.k,'ポイント','',yen(n.a)+' × '+fmt(n.p)+'% × '+fmt(n.k)+'倍']),
  K('買い物',['年会費{a}円?(は|を|の|で|なら)?(、)?{p}<PCT>還元(で|なら|だと|の)?(いくら使えば|いくら使うと|何円使えば|いくらで|何円で|いくら買えば)?<MOTO>','{p}<PCT>還元(で|の)?年会費{a}円?(は|を)?(いくら使えば|いくら使うと|何円使えば|いくらで|何円で)?<MOTO>'], n=>n.p?[n.a/(n.p/100),'円','元が取れる金額',yen(n.a)+' ÷ '+fmt(n.p)+'%']:R_err('還元が 0% です')),
  K('買い物',['{a}円?(の|で)?(定期|定期券|パス|年パス|年間パス|回数券|会員|会費|サブスク|フリーパス|入会金|もの)?(は|を|で|、)?1回{b}円?(なら|だと|で|の|のところ)?(何回|なんかい)(で|使えば|行けば|乗れば|通えば|利用すれば)?<MOTO>'], n=>n.b?[Math.ceil(n.a/n.b-1e-9),'回','元が取れる回数',yen(n.a)+' ÷ '+yen(n.b)]:R_err('1回の値段が 0 です')),
  K('買い物',['{a}円?(が|の|で|は)?2(個|つ|点|枚|本|着|足)目(が|は)?半額(だと|なら|で|の|のとき)?(2(個|つ|点|枚|本|着|足))?(で|は|買うと|の合計)?','2(個|つ|点)目半額(で|の)?{a}円?(を|の)?(2(個|つ|点))?(買うと|で)?'], n=>[n.a*1.5,'円','2つで',yen(n.a)+' ＋ '+yen(n.a/2)+'（1つあたり '+yen(n.a*0.75)+'）']),
  K('買い物',['{a}円?(が|の|で|は)?2(個|つ|点|枚|本|着|足)目(が|は)?{p}<PCT>(引き|オフ|引|off|OFF)(だと|なら|で|の)?(2(個|つ|点|枚|本|着|足))?(で|は|買うと|の合計)?'], n=>[n.a*(2-n.p/100),'円','2つで',yen(n.a)+' ＋ '+yen(n.a*(1-n.p/100))]),
  K('買い物',['{a}円?(が|の|を|で)?{k}(個|つ|点|枚|本|着|足)(買うと|以上で|で|まとめ買いで|セットで)(、)?{p}<PCT>(引き|オフ|引|off|OFF)(だと|なら|で|の)?(合計|全部で)?'], n=>[n.a*n.k*(1-n.p/100),'円','合計',yen(n.a)+' × '+fmt(n.k)+' × '+fmt(1-n.p/100)]),
  K('買い物',['{a}円?(から|に|で|の)?{c}円?(の|分の)?<KUPON>(を使うと|を使ったら|で|だと|なら|を引くと|使用で|利用で)?','<KUPON>{c}円?(で|を使って|を使うと)?{a}円?(のもの|の買い物|を買うと)?'], n=>[n.a-n.c,'円','',yen(n.a)+' − '+yen(n.c)]),
  K('買い物',['{a}円?(に|と|、|で|の|プラス|足す)?<SORYO>{s}円?(で|を足すと|を入れると|込みで|込み|だと|なら|の合計|を合わせると)?','<SORYO>{s}円?(と|、|で|に)?(本体|商品|品物|代金)?{a}円?(で|の合計|を合わせると)?'], n=>[n.a+n.s,'円','合計',yen(n.a)+' ＋ '+yen(n.s)]),
  K('買い物',['{a}円?(以上)?(で|から|以上で)<SORYO>無料(、|で|の|だと|なら|のとき)?(今|いま|現在|カートに|合計)?{b}円?(だと|なら|で|の|のとき|入っている|入ってる)?(あと|残り)?','<SORYO>無料(まで|は|の)?{a}円?(以上)?(、|で|から)?(今|いま|現在)?{b}円?(だと|なら|で)?(あと|残り)?'], n=>[Math.max(0,n.a-n.b),'円','あと',yen(n.a)+' − '+yen(n.b)]),
  K('買い物',['(予算|手持ち|持ち金|所持金|お小遣い|おこづかい)?{a}円?(で|あって|あると|持っていて|の予算で)(、)?(1(個|つ|本|枚|冊|袋))?{p}円?(の|のもの|のを|のものは|のものを|のお菓子|のりんご|のパン)?(は|を|が)?(何(個|つ|本|枚|冊|袋)|いくつ|なんこ)<KAERU>?'], n=>{ if(!n.p) return R_err('値段が 0 です'); const k=Math.floor(n.a/n.p+1e-9); return pOut(k,'個',{a:fmt(k)+'個（余り '+yen(n.a-k*n.p)+'）', say:fmt(k)+'個 買えて、'+sayU(n.a-k*n.p,'円')+' 余ります', f:yen(n.a)+' ÷ '+yen(n.p)}); }),
  K('買い物',['{a}円?(の)?{p}<PCT>(引き|オフ|引|off|OFF)(から|の|に|で)(さらに|更に|もう|また)(、)?{q}<PCT>(引き|オフ|引|off|OFF)(だと|なら|で|すると|は)?','{a}円?(を)?{p}<PCT>(引き|オフ)(して|にして)(さらに|更に)?{q}<PCT>(引き|オフ)(だと|すると|にすると)?'], n=>[n.a*(1-n.p/100)*(1-n.q/100),'円','',yen(n.a)+' × '+fmt(1-n.p/100)+' × '+fmt(1-n.q/100)]),
  K('買い物',['{p}<PCT>(引き|オフ|引|off|OFF)(の|から|に|で)(さらに|更に|もう|また)(、)?{q}<PCT>(引き|オフ|引|off|OFF)(は|って|だと|なら|で)?(実質|合わせて|合計|結局|全部で)?(何<PCT>|なん<PCT>)(引き|オフ|引)?'], n=>[(1-(1-n.p/100)*(1-n.q/100))*100,'%','実質の割引','1 − '+fmt(1-n.p/100)+' × '+fmt(1-n.q/100)]),
  K('買い物',['{a}円?(で|の|のとき|は|なら|だと)?(、)?{p}<PCT>(引き|オフ|引)(と|か|、){c}円(引き|オフ|引)(は|の|で|では|だと|なら)?<DOCCHI>(得|お得|安い|安く|いい)?(か|なる|ですか)?','{a}円?(で|の|は)?{c}円(引き|オフ|引)(と|か|、){p}<PCT>(引き|オフ|引)(は|の|で|では)?<DOCCHI>(得|お得|安い|安く|いい)?(か|なる|ですか)?'], n=>{ const x=n.a*n.p/100, y=n.c, w=x>y?fmt(n.p)+'%引き':x<y?yen(y)+'引き':'同じ'; return pOut(Math.max(x,y),'円',{a:(w==='同じ'?'どちらも同じ（':w+' が得（')+fmt(n.p)+'%引きは '+yen(x)+' 引き）', say:(w==='同じ'?'どちらも同じです':w+' のほうが得です'), f:yen(n.a)+' × '+fmt(n.p)+'% ＝ '+yen(x)}); }),
  K('買い物',['{a}円?(で|から|出して|払って|札で|を出して|を払って|渡して|を渡して)(、)?{b}円?(の|を)?(買い物|もの|会計|お会計|支払い|品物|商品)?(の|で|を|をしたら|したら|すると|をすると|だと|なら|買ったら|買うと|払ったら|払うと)?(の)?<OTSURI>','<OTSURI>(は)?{a}円?(で|から|出して|払って)(、)?{b}円?(の買い物|のもの|の会計)?'], n=>[n.a-n.b,'円','お釣り',yen(n.a)+' − '+yen(n.b)]),
  K('買い物',['{a}円?(あって|持っていて|持ってて|から|あると|あるうち|のうち|もらって|もらった|の予算で|の予算から)(、)?{b}円?(を)?<TSUKAU2>(、)?(ら|時の|ときの|あとの|後の)?(の)?<NOKORI>?','{a}円?(から|あって)(、)?{b}円?(と|、){c}円?(を)?<TSUKAU2>(ら|時の|ときの|あとの)?(の)?<NOKORI>?'], n=>[n.a-n.b-(n.c||0),'円','残り',yen(n.a)+' − '+yen(n.b)+(n.c?' − '+yen(n.c):'')]),
  K('買い物',['{a}円?(のもの|の商品|の品|の服|の家電|のチケット)?(を|が|は|で)?{k}回(使う|使った|使うと|使ったら|着る|着た|着ると|着たら|乗る|乗ると|行く|行くと|通う|通うと|利用|利用すると)(と|ら|なら)?(、)?(1回|ひと回|一回)(あたり|当たり|分)?'], n=>n.k?[n.a/n.k,'円','1回あたり',yen(n.a)+' ÷ '+fmt(n.k)+'回']:R_err('0回では割れません')),
  K('買い物',['1人{a}円?(を|ずつ|で|の|の会費を|の参加費を)?{k}人(から|で|分|ぶん|が)?(集めると|集めたら|集金すると|集金|集める|払うと|参加すると|集まると|だと|なら)?(合計|全部で)?','{k}人(から|で|が)?1人{a}円?(ずつ)?(を)?(集めると|集めたら|集金すると|集金|集める|払うと|出すと|出し合うと)?(合計|全部で)?'], n=>[n.a*n.k,'円','合計',yen(n.a)+' × '+fmt(n.k)+'人']),
  K('買い物',['{a}円?(を|の会計を|のお会計を)?大人{k}人(と|、)?(子ども|子供|こども){m}人(で|の)?(、)?(子ども|子供|こども)(は)?半額(で|だと|なら|の|にして|として)?(割ると|割り勘|分けると|割ったら)?(大人)?(1人)?'], n=>{ const u=n.k+n.m/2; if(!u) return R_err('人数が 0 です'); const x=n.a/u; return pOut(x,'円',{a:'大人 '+yen(x)+' ／ 子ども '+yen(x/2), say:'大人は '+sayU(x,'円')+'、子どもは '+sayU(x/2,'円')+' です', f:yen(n.a)+' ÷ ('+fmt(n.k)+' ＋ '+fmt(n.m)+' ÷ 2)'}); }),
  K('買い物',['{g}(ギガ|GB|ギガバイト|gb)(で|が|、|の)?(月)?{p}円?(の|なら|だと|は|で)?(1(ギガ|GB|ギガバイト))(あたり|当たり|の値段|の単価|いくら)?','(月)?{p}円?(で|の)?{g}(ギガ|GB|ギガバイト|gb)(の|なら|だと|は)?(1(ギガ|GB|ギガバイト))(あたり|当たり|の値段|の単価|いくら)?'], n=>n.g?[n.p/n.g,'円','1ギガあたり',yen(n.p)+' ÷ '+fmt(n.g)+'ギガ']:R_err('0ギガでは割れません')),
  // ── くらしの お金（1日・1か月・1年に 直す）──
  K('くらし',['(1日|毎日|日に|1日に){a}円?(は|を|だと|なら|ずつ|使うと|かかると|で|の)?(、)?(1か月|1ヶ月|ひと月|月|月に|月で|30日|月間|毎月)(で|だと|に直すと|にすると|分|あたり|では)?','(1か月|1ヶ月|ひと月|30日)(で|に)?(1日|毎日){a}円?(ずつ)?(使うと|だと|なら|で)?'], n=>[n.a*30,'円','1か月（30日）',yen(n.a)+' × 30日']),
  K('くらし',['(1日|毎日|日に|1日に){a}円?(は|を|だと|なら|ずつ|使うと|かかると|で|の)?(、)?(1年|年|年間|年に|年で|365日|1年間)(で|だと|に直すと|にすると|分|あたり|では)?','(1年|年間|1年間|365日)(で|に)?(1日|毎日){a}円?(ずつ)?(使うと|だと|なら|で)?'], n=>[n.a*365,'円','1年',yen(n.a)+' × 365日']),
  K('くらし',['(月|毎月|月々|月額|1か月|1ヶ月|ひと月|月に){a}円?(は|を|だと|なら|ずつ|使うと|かかると|で|の)?(、)?(1年|年|年間|年に|年で|12か月|1年間|年額)(で|だと|に直すと|にすると|分|あたり|では)?','(1年|年間|1年間)(で|に)?(毎月|月々|月){a}円?(ずつ)?(使うと|払うと|だと|なら|で)?','年額(は)?(月|月額|毎月|月々){a}円?(だと|なら|で|の)?'], n=>[n.a*12,'円','1年',yen(n.a)+' × 12か月']),
  K('くらし',['(月|毎月|月々|月額|1か月|1ヶ月|ひと月|月に){a}円?(は|を|だと|なら|の|で)?(、)?(1日|日|1日あたり|日割りで|1日に直すと|日あたり|1日当たり)(で|だと|に直すと|にすると|分|あたり|では)?'], n=>[n.a/30,'円','1日あたり（30日）',yen(n.a)+' ÷ 30日']),
  K('くらし',['(年|毎年|年額|年間|1年|1年で|年に){a}円?(は|を|だと|なら|の|で)?(、)?(1か月|1ヶ月|ひと月|月|月額|月々|毎月|月あたり|月に直すと)(で|だと|に直すと|にすると|分|あたり|では)?','月額(は)?(年|年額|年間){a}円?(だと|なら|で|の)?'], n=>[n.a/12,'円','1か月あたり',yen(n.a)+' ÷ 12か月']),
  K('くらし',['(年|毎年|年額|年間|1年|1年で|年に){a}円?(は|を|だと|なら|の|で)?(、)?(1日|日|1日あたり|日あたり|1日当たり|1日に直すと)(で|だと|に直すと|にすると|分|あたり|では)?'], n=>[n.a/365,'円','1日あたり',yen(n.a)+' ÷ 365日']),
  K('くらし',['(週|毎週|1週間|週に|1週間に){a}円?(は|を|だと|なら|ずつ|使うと|で|の)?(、)?(1か月|1ヶ月|ひと月|月|月に|月で|月間|毎月)(で|だと|に直すと|にすると|分|あたり|では)?'], n=>[n.a*52/12,'円','1か月（52週÷12）',yen(n.a)+' × 52 ÷ 12']),
  K('くらし',['(週|毎週|1週間|週に|1週間に){a}円?(は|を|だと|なら|ずつ|使うと|で|の)?(、)?(1年|年|年間|年に|年で|1年間|52週)(で|だと|に直すと|にすると|分|あたり|では)?'], n=>[n.a*52,'円','1年（52週）',yen(n.a)+' × 52週']),
  K('くらし',['(月額|月|毎月|月々){a}円?(の|を|で)?(サブスク|会費|定額|料金|保険|保険料|ジム|習い事|月謝)?(を|は|で|に)?{y}年(間)?(続けると|続けたら|払うと|払ったら|使うと|使ったら|契約すると|契約したら|で|分|だと|入ると|通うと)?(合計|総額|全部で)?'], n=>[n.a*12*n.y,'円','合計',yen(n.a)+' × 12か月 × '+fmt(n.y)+'年']),
  K('くらし',['1(箱|個|本|杯|缶|袋|枚|回|食){p}円?(を|の|のを|のものを|で)?(1日|毎日|日に)(に)?{k}(箱|個|本|杯|缶|袋|枚|回|食)(ずつ)?(だと|なら|で|買うと|飲むと|吸うと|食べると|使うと)?(、)?(?<per>1か月|1ヶ月|ひと月|月|月に|30日|1年|年|年間|年に|365日|1年間|1週間|週|7日)(で|だと|では|に|分)?'], (n,g)=>{ const d=/年|365/.test(g.per)?365:/週|7日/.test(g.per)?7:30; return [n.p*n.k*d,'円',d===365?'1年':d===7?'1週間':'1か月（30日）',yen(n.p)+' × '+fmt(n.k)+' × '+d+'日']; }),
  K('くらし',['{a}<CNT@u>(を|が|あって|入りを|入りで|の)?(、)?(1日|毎日|日に|1日に){k}<CNT>(ずつ)?(使うと|使ったら|飲むと|飲んだら|食べると|食べたら|で|だと|なら|減ると|減る|使う|飲む|食べる)?(、)?(何日|なんにち|いつまで|何日間|何日分)<MOTSU>?'], n=>n.k?[n.a/n.k,'日','',fmt(n.a)+' ÷ '+fmt(n.k)]:R_err('1日の量が 0 です')),
  K('くらし',['(1日|毎日|日に|1日に){k}<CNT@u>(ずつ)?(を|で|使うと|飲むと|食べると|だと|なら)?(、)?{d}(?<du>日|週間|か月|ヶ月|カ月|年)(間|分|ぶん)?(で|だと|では|に|使うと|続けると)?(必要|いる|要る|何<CNT>)?'], (n,g)=>{ const m=g.du==='日'?1:g.du==='週間'?7:g.du==='年'?365:30; return [n.k*n.d*m,g.u,'',fmt(n.k)+g.u+' × '+fmt(n.d*m)+'日']; }),
  // ── 家計 ──
  K('家計',['<TEDORI2>{a}円?(の|で|だと|なら|の人の|のときの)?<YACHIN>(の)?<MEYASU>','<YACHIN>(の)?<MEYASU>(は)?<TEDORI2>{a}円?(だと|なら|で|の)?'], n=>[n.a/3,'円','家賃の目安（手取りの3分の1）',yen(n.a)+' ÷ 3']),
  K('家計',['年収{a}円?(の|で|だと|なら|の人の|のときの)?<YACHIN>(の)?<MEYASU>'], n=>[n.a*0.25/12,'円','家賃の目安（年収の25%）',yen(n.a)+' × 25% ÷ 12']),
  K('家計',['<TEDORI2>{a}円?(で|の|のうち|から|、)?(毎月|月|月に|月々)?{b}円?(を)?(貯金|貯蓄|貯める|貯めると|貯金すると|貯金したら|貯めたら|積み立て|積立)(する|して|した|している)?(と|ら|の|ときの|場合の)?(貯蓄率|貯金率|何<PCT>|割合)','(貯蓄率|貯金率)(は)?<TEDORI2>{a}円?(で|の|のうち)?{b}円?(を)?(貯金|貯蓄)(だと|なら)?'], n=>n.a?[n.b/n.a*100,'%','貯蓄率',yen(n.b)+' ÷ '+yen(n.a)]:R_err('収入が 0 です')),
  K('家計',['食費{a}円?(で|、|の|が)?<SHISHUTSU>{b}円?(の|で|だと|なら|のとき|のときの)?エンゲル係数','エンゲル係数(は)?(、)?食費{a}円?(で|、|の)?<SHISHUTSU>{b}円?(だと|なら|で|の)?'], n=>n.b?[n.a/n.b*100,'%','エンゲル係数',yen(n.a)+' ÷ '+yen(n.b)]:R_err('支出が 0 です')),
  K('家計',['<SHUNYU>{a}円?(で|、|の|が|から|あって)?<SHISHUTSU>{b}円?(の|で|だと|なら|のとき|のときの|を引くと|を引いた|引くと)?<SHUSHI>?','<SHISHUTSU>{b}円?(で|、|の)?<SHUNYU>{a}円?(の|で|だと|なら|のとき|のときの)?<SHUSHI>?'], n=>[n.a-n.b,'円','収支',yen(n.a)+' − '+yen(n.b)]),
  K('家計',['食費(が|は|を)?(月|1か月|ひと月|月に|毎月)?{a}円?(は|だと|なら|の|で)?(、)?(1日|1日あたり|日あたり|1日当たり)(で|だと|に直すと|あたり|は)?'], n=>[n.a/30,'円','1日あたり（30日）',yen(n.a)+' ÷ 30日']),
  K('家計',['食費(が|は|を)?(月|1か月|ひと月|月に|毎月)?{a}円?(は|だと|なら|の|で)?(、)?(1食|1食あたり|1食当たり|ひと食)(で|だと|に直すと|あたり|は)?','(1日|毎日)3食(で|、|の)?(月|1か月|ひと月)?{a}円?(は|だと|なら|の)?(1食|1食あたり)'], n=>[n.a/90,'円','1食あたり（1日3食・30日）',yen(n.a)+' ÷ 90食']),
  K('家計',['{a}円?(を|まで)?<TAMERU>(のに|ために|には|なら|と)?(、)?<MAITSUKI2>{b}円?(ずつ)?(で|だと|なら|貯めると|貯めたら|貯金すると|貯金して|貯金で)?(、)?(何か月|何ヶ月|何カ月|なんかげつ|どのくらい|どれくらい|何年|いつ)(かかる|で貯まる|で達成|必要|で届く)?','<MAITSUKI2>{b}円?(ずつ)?(貯めると|貯めたら|貯金すると|貯金して|貯金で|で)(、)?{a}円?(まで|に|貯まるまで|を貯めるまで|貯めるのに|になるまで)?(は)?(何か月|何ヶ月|何カ月|なんかげつ|どのくらい|どれくらい|何年|いつ)(かかる|で貯まる|で達成|必要)?'], n=>{ if(!n.b) return R_err('毎月の額が 0 です'); const m=Math.ceil(n.a/n.b-1e-9); return pOut(m,'か月',{a:fmt(m)+'か月'+(m>=12?'（'+Math.floor(m/12)+'年'+(m%12?m%12+'か月':'')+'）':''), say:fmt(m)+'か月 かかります', f:yen(n.a)+' ÷ '+yen(n.b)}); }),
  K('家計',['{a}円?(を|まで)?{k}(?<ku>年|か月|ヶ月|カ月)(間)?(で|以内に|の間に)<TAMERU>(のに|ために|には|なら|と)?(、)?(<MAITSUKI2>|1か月に)?(いくら|何円)?(ずつ)?(必要|貯めれば|貯めればいい|貯金すれば|貯金すればいい|貯める)?','{k}(?<ku>年|か月|ヶ月|カ月)(間)?(で|以内に){a}円?(を)?<TAMERU>(のに|ために|には|なら|と)?(、)?<MAITSUKI2>?(いくら|何円)?(ずつ)?(必要|貯めれば|貯めればいい|貯金すれば)?'], (n,g)=>{ const m=g.ku==='年'?n.k*12:n.k; return m?[n.a/m,'円','毎月',yen(n.a)+' ÷ '+fmt(m)+'か月']:R_err('期間が 0 です'); }),
  K('家計',['<YACHIN>{a}円?(の|を|で|は|が)?(、)?{d}日(分|ぶん|間)?(の)?<HIWARI>','<YACHIN>{a}円?(の|を|で|は)?<HIWARI>(で|は|を)?{d}日(分|ぶん|間)?','{a}円?(の|を)?<HIWARI>(で|は|を)?{d}日(分|ぶん|間)?'], n=>[n.a/30*n.d,'円','日割り（1か月を30日として）',yen(n.a)+' ÷ 30日 × '+fmt(n.d)+'日']),
  K('家計',['{a}円?(を|の)?{m}日(中|のうち|の月で|ある月の|の月の){d}日(分|ぶん|間)?(の)?<HIWARI>?','<YACHIN>?{a}円?(を|の)?<HIWARI>(で|は)?{m}日(中|のうち|の月で){d}日(分|ぶん)?'], n=>n.m?[n.a/n.m*n.d,'円','日割り',yen(n.a)+' ÷ '+fmt(n.m)+'日 × '+fmt(n.d)+'日']:R_err('月の日数が 0 です')),
  K('家計',['<YACHIN>{a}円?(で|、|の|に)?敷金{s}(か月|ヶ月|カ月)(分)?(、|と|で)?礼金{r}(か月|ヶ月|カ月)(分)?(の|で|だと|なら|のとき|のときの)?(初期費用|最初にかかるお金|最初の費用|契約金|入居費用|契約時の費用)?'], n=>[n.a*(n.s+n.r+1),'円','初期費用（敷金＋礼金＋前家賃1か月）',yen(n.a)+' × ('+fmt(n.s)+' ＋ '+fmt(n.r)+' ＋ 1)']),
  K('家計',['片道{a}円?(を|で|の|の交通費で|の電車賃で|のバス代で)?(月|1か月|ひと月|月に|週|週に)?{d}(日|回)(間)?(往復|通う|通うと|通ったら|通勤|通勤すると|通学|通学すると|行くと|行ったら|往復すると|往復で|で)?(の)?(交通費|電車賃|運賃|バス代)?','往復{w}円?(を|で|の)?(月|1か月|ひと月|月に|週|週に)?{d}(日|回)(間)?(通う|通うと|通ったら|通勤|通勤すると|通学|行くと|で)?(の)?(交通費|電車賃|運賃|バス代)?'], n=>n.a!=null?[n.a*2*n.d,'円','交通費（往復）',yen(n.a)+' × 2 × '+fmt(n.d)+'日']:[n.w*n.d,'円','交通費',yen(n.w)+' × '+fmt(n.d)+'日']),
  // ── 給料・時給 ──
  K('給料',['(月給|月収|給料|手取り){a}円?(で|を|の|が|、)?(月|1か月|ひと月|月に)?{h}時間(働くと|働いたら|働いて|勤務で|勤務すると|労働で|だと|なら|の|で)?(の)?<JIKYU>(換算|に直すと|は)?','<JIKYU>(換算)?(は)?(月給|月収|給料){a}円?(で|を|の)?(月)?{h}時間(だと|なら|で)?'], n=>n.h?[n.a/n.h,'円','時給',yen(n.a)+' ÷ '+fmt(n.h)+'時間']:R_err('0時間では割れません')),
  K('給料',['日給{a}円?(で|を|の|が|、)?(1日)?{h}時間(働くと|働いたら|働いて|勤務で|勤務すると|労働で|だと|なら|の|で)?(の)?<JIKYU>(換算|に直すと|は)?'], n=>n.h?[n.a/n.h,'円','時給',yen(n.a)+' ÷ '+fmt(n.h)+'時間']:R_err('0時間では割れません')),
  K('給料',['年収{a}円?(の|を|で|だと|なら|は)?<JIKYU>(換算|に直すと|は)?','年収{a}円?(で|を|の|、)?(年|年間|1年|1年で)?{h}時間(働くと|働いたら|働いて|勤務で|労働で|だと|なら|の|で)?(の)?<JIKYU>(換算|に直すと|は)?'], n=>{ const h=n.h||2000; return [n.a/h,'円',n.h?'時給':'時給（年2,000時間として）',yen(n.a)+' ÷ '+fmt(h)+'時間']; }),
  K('給料',['<JIKYU>{w}円?(の|で|だと|なら|の人の)?<ZANGYO>(を|が|で|は)?{h}時間(した|すると|したら|分|ぶん|だと|なら|で|の)?(の)?(残業代|手当|割増|割増賃金|賃金)?','<ZANGYO>{h}時間(の|を|で|、)?<JIKYU>{w}円?(だと|なら|で|の)?(の)?(残業代|手当|割増|賃金)?'], n=>[n.w*1.25*n.h,'円','残業代（25%増し）',yen(n.w)+' × 1.25 × '+fmt(n.h)+'時間']),
  K('給料',['<JIKYU>{w}円?(の|で|だと|なら|の人の)?<SHINYA>(を|が|で|は|に)?{h}時間(した|すると|したら|働くと|働いたら|分|ぶん|だと|なら|で|の)?(の)?(手当|割増|割増賃金|賃金|給料)?'], n=>[n.w*1.25*n.h,'円','深夜（25%増し）',yen(n.w)+' × 1.25 × '+fmt(n.h)+'時間']),
  K('給料',['<JIKYU>{w}円?(の|で|だと|なら|の人の)?<KYUJITSU>(を|が|で|は|に)?{h}時間(した|すると|したら|働くと|働いたら|分|ぶん|だと|なら|で|の)?(の)?(手当|割増|割増賃金|賃金|給料)?'], n=>[n.w*1.35*n.h,'円','休日（35%増し）',yen(n.w)+' × 1.35 × '+fmt(n.h)+'時間']),
  K('給料',['<JIKYU>{w}円?(の|で|だと|なら)?(の)?(深夜残業|深夜の残業|残業が深夜)(を|が|で|は)?{h}時間(した|すると|したら|分|ぶん|だと|なら|で|の)?'], n=>[n.w*1.5*n.h,'円','深夜残業（50%増し）',yen(n.w)+' × 1.5 × '+fmt(n.h)+'時間']),
  K('給料',['{k}人(で|が|を|、)?(1人)?{h}時間(ずつ)?(、|で|働いて|働くと|作業して|作業すると)?<JIKYU>{w}円?(の|だと|なら|で)?(人件費|費用|賃金|給料|合計|コスト)?','<JIKYU>{w}円?(で|の人が|の人を|、)?{k}人(で|が|を|、)?{h}時間(ずつ)?(働くと|働いたら|使うと|雇うと|作業すると|の|で)?(人件費|費用|賃金|給料|合計|コスト)?'], n=>[n.k*n.h*n.w,'円','人件費',fmt(n.k)+'人 × '+fmt(n.h)+'時間 × '+yen(n.w)]),
  K('給料',['{a}円?(の|のお|で|を)?(仕事|作業|案件|報酬|バイト|アルバイト|依頼)?(を|に|が|で|は)?{h}時間<KAKARU2>(と|ら|なら|場合)?(の)?<JIKYU>(換算|に直すと|は)?','報酬{a}円?(で|を|の)?{h}時間(の|で|だと|なら)?<JIKYU>(換算|は)?'], n=>n.h?[n.a/n.h,'円','時給',yen(n.a)+' ÷ '+fmt(n.h)+'時間']:R_err('0時間では割れません')),
  K('給料',['<JIKYU>{w}円?(で|の|を|が)?(1日)?{h}時間(を|で|働いて|、)?(週|週に|1週間に|毎週){d}(日|回)(働くと|働いたら|働いて|勤務で|勤務すると|だと|なら|で|の)?(の)?(月収|月給|1か月|月|ひと月|月の給料|月の収入)'], n=>[n.w*n.h*n.d*52/12,'円','月収（52週÷12）',yen(n.w)+' × '+fmt(n.h)+'時間 × '+fmt(n.d)+'日 × 52 ÷ 12']),
  K('給料',['<JIKYU>{w}円?(で|の|を|が)?(1日)?{h}時間(を|で|働いて|、)?(週|週に|1週間に|毎週){d}(日|回)(働くと|働いたら|働いて|勤務で|勤務すると|だと|なら|で|の)?(の)?(年収|1年|年間|年|年の収入|年間の収入)'], n=>[n.w*n.h*n.d*52,'円','年収（52週）',yen(n.w)+' × '+fmt(n.h)+'時間 × '+fmt(n.d)+'日 × 52週']),
  K('給料',['<JIKYU>{w}円?(で|の|だと|なら)?(、)?(月|月に|1か月に|ひと月に|月収)?{a}円?(稼ぐ|稼ぎたい|もらう|もらいたい|ほしい|欲しい|かせぐ|稼ぐには|にする|にしたい|になる|必要)(には|なら|ためには|のに|と)?(、)?(何時間|なんじかん)(働く|働けば|働けばいい|必要|勤務|働くと)?','{a}円?(稼ぐ|稼ぎたい|かせぐ|ほしい|欲しい|もらう)(には|なら|ためには|のに)(、)?<JIKYU>{w}円?(で|だと|なら)(、)?(何時間|なんじかん)(働く|働けば|働けばいい|必要)?'], n=>n.w?[n.a/n.w,'時間','',yen(n.a)+' ÷ '+yen(n.w)]:R_err('時給が 0 です')),
  K('給料',['(年間|年に|年)?(?<kabe>1030000|1300000|1060000|1500000|1600000|1780000)円?の壁(は|を|で|って|まで)?(、)?<JIKYU>{w}円?(だと|なら|で|の)?(、)?(月|月に|1か月|週|週に)?(何時間|なんじかん)(まで)?(働ける|働けます|働けますか)?','<JIKYU>{w}円?(で|だと|なら)(、)?(年間|年に|年)?(?<kabe>1030000|1300000|1060000|1500000|1600000|1780000)円?(の壁)?(まで|以内|におさめる|に収める|を超えない)(には|なら|ように)?(、)?(月|月に|1か月|週|週に)?(何時間|なんじかん)(まで)?(働ける|働けます|働けますか)?'], (n,g,t)=>{ if(!n.w) return R_err('時給が 0 です'); const y=n.kabe/n.w, wk=/週/.test(t); return pOut(wk?y/52:y/12,'時間',{pre:wk?'週 ':'月 ', sayPre:wk?'週に ':'月に ', f:fmt(n.kabe/10000)+'万円 ÷ '+yen(n.w)+' ÷ '+(wk?'52週':'12か月')+'（年 '+fmt(y,1)+'時間）'}); }),
  // ── 電気 ──
  K('電気',['{w}<WATT>(を|で|の|の家電を|のものを|の電気を|のエアコンを|のヒーターを|のドライヤーを|のレンジを)?(1日)?{h}時間(使うと|使ったら|つけると|つけたら|つけっぱなしで|動かすと|使用で|だと|なら|で|の|分の)?(の)?<DENKI>','<DENKI>(は)?{w}<WATT>(を|で|の)?{h}時間(使うと|使ったら|だと|なら|で)?'], n=>[n.w/1000*n.h*31,'円','電気代（1kWh 31円の目安）',fmt(n.w)+'W ÷ 1000 × '+fmt(n.h)+'時間 × 31円']),
  K('電気',['{w}<WATT>(を|で|の|の家電を|のエアコンを|のヒーターを)?(1日|毎日|日に|1日に){h}時間(、|で|を|ずつ)?(1か月|1ヶ月|ひと月|月|月に|30日|月間)(使うと|使ったら|つけると|つけたら|だと|なら|で|の|分の)?(の)?<DENKI>','(1か月|1ヶ月|ひと月|月)(の)?<DENKI>(は)?{w}<WATT>(を|で|の)?(1日|毎日){h}時間(使うと|だと|なら|で)?'], n=>[n.w/1000*n.h*30*31,'円','1か月の電気代（1kWh 31円の目安）',fmt(n.w)+'W ÷ 1000 × '+fmt(n.h)+'時間 × 30日 × 31円']),
  K('電気',['{w}<WATT>(を|で|の)?(1日|毎日|日に|1日に){h}時間(、|で|を|ずつ)?(1年|年間|年|365日|1年間)(使うと|使ったら|つけると|だと|なら|で|の|分の)?(の)?<DENKI>'], n=>[n.w/1000*n.h*365*31,'円','1年の電気代（1kWh 31円の目安）',fmt(n.w)+'W ÷ 1000 × '+fmt(n.h)+'時間 × 365日 × 31円']),
  K('電気',['(1<KWH>|<KWH>単価|電気の単価|単価|1キロワット)(が|は|=)?{p}円?(で|なら|だと|のとき|として)(、)?{w}<WATT>(を|で|の)?{h}時間(使うと|使ったら|だと|なら|で|の|分の)?(の)?<DENKI>?','{w}<WATT>(を|で|の)?{h}時間(使うと|使ったら|、|で|を)?(1<KWH>|<KWH>単価|単価|1キロワット){p}円?(で|なら|だと|の)?(の)?<DENKI>?'], n=>[n.w/1000*n.h*n.p,'円','電気代',fmt(n.w)+'W ÷ 1000 × '+fmt(n.h)+'時間 × '+yen(n.p)]),
  K('電気',['{w}<WATT>(を|で|の)?{h}時間(使うと|使ったら|は|で|だと|なら)?(、)?(何|なん)<KWH>','{w}<WATT>(を|で|の)?{h}時間(の|使ったときの|使うときの)?(消費電力量|電力量|使用電力量|電気の量)'], n=>[n.w/1000*n.h,'kWh','',fmt(n.w)+'W ÷ 1000 × '+fmt(n.h)+'時間']),
  K('電気',['{k}<KWH>(の|は|を|使うと|使ったら|だと|なら|で)?(の)?<DENKI>','{k}<KWH>(を|で|が|、)?(1<KWH>|単価){p}円?(で|なら|だと|の)?(の)?<DENKI>?'], n=>[n.k*(n.p||31),'円',n.p?'電気代':'電気代（1kWh 31円の目安）',fmt(n.k)+'kWh × '+yen(n.p||31)]),
  K('電気',['{w}<WATT>(は|って|を|の|で|だと)?(何|なん)(アンペア|A)','{w}<WATT>(の|を)?(アンペア|電流)(数)?'], n=>[n.w/100,'A','（100V として）',fmt(n.w)+'W ÷ 100V']),
  K('電気',['{a}(アンペア|A)(は|って|を|の|で|だと|まで)?(何|なん)<WATT>(まで)?(使える)?','{a}(アンペア|A)(の|で|契約で|契約だと)?(使える)?(ワット数|ワット|電力|上限)'], n=>[n.a*100,'W','（100V として）',fmt(n.a)+'A × 100V']),
  K('電気',['{w}<WATT>(で|の|だと)?{m}(?<tu>分|秒)(の|は|を|かかる|かかるもの|のもの|のレシピ|のところ)?(は|を|、)?{v}<WATT>(で|だと|なら|では|のレンジで|のレンジだと|の場合)(何分|何秒|なんぷん|なんびょう|どのくらい|どれくらい)?'], (n,g)=>{ if(!n.v) return R_err('ワット数が 0 です'); const s=(g.tu==='分'?n.m*60:n.m)*n.w/n.v, mm=Math.floor(s/60), ss=Math.round(s-mm*60); return pOut(s/60,'分',{a:(mm?mm+'分':'')+(ss||!mm?ss+'秒':''), say:(mm?mm+'分':'')+(ss||!mm?ss+'秒':'')+' です', f:fmt(n.m)+g.tu+' × '+fmt(n.w)+'W ÷ '+fmt(n.v)+'W'}); }),
  // ── 利息・ローン・積立 ──
  K('金融',['{P}円?(を|の|に)?<RIRITSU>{r}<PCT>(で|の)?{y}年(間)?(預けた|預けると|預けたら|借りた|借りると|借りたら|の|で|分の)?(ときの|時の|場合の)?(の)?<RISOKU>','<RISOKU>(は)?{P}円?(を|の)?<RIRITSU>{r}<PCT>(で)?{y}年(間)?(だと|なら|で)?'], n=>[n.P*n.r/100*n.y,'円','利息（単利）',yen(n.P)+' × '+fmt(n.r)+'% × '+fmt(n.y)+'年']),
  K('金融',['{P}円?(を|の|に)?<RIRITSU>{r}<PCT>(で|の)?{m}(か月|ヶ月|カ月)(間)?(預けた|預けると|預けたら|借りた|借りると|借りたら|の|で|分の)?(ときの|時の|場合の)?(の)?<RISOKU>'], n=>[n.P*n.r/100*n.m/12,'円','利息',yen(n.P)+' × '+fmt(n.r)+'% × '+fmt(n.m)+' ÷ 12']),
  K('金融',['{P}円?(を|の|に)?<RIRITSU>{r}<PCT>(で|の)?{d}日(間)?(預けた|預けると|預けたら|借りた|借りると|借りたら|の|で|分の)?(ときの|時の|場合の)?(の)?<RISOKU>'], n=>[n.P*n.r/100*n.d/365,'円','利息',yen(n.P)+' × '+fmt(n.r)+'% × '+fmt(n.d)+' ÷ 365']),
  K('金融',['<RISOKU>{a}円?(の|から|で|に)?(税金を引いた|税を引いた|税金を引くと)?<ZEIGO>','{a}円?の<RISOKU>(の|から)?<ZEIGO>','配当(金)?{a}円?(の|から)?<ZEIGO>'], n=>[n.a*(1-0.20315),'円','税引き後（20.315%）',yen(n.a)+' × (1 − 0.20315)']),
  K('金融',['<RISOKU>{a}円?(の|に|にかかる|から引かれる)(税金|税|源泉|源泉徴収|税額)','配当(金)?{a}円?(の|に|にかかる|から引かれる)(税金|税|源泉|源泉徴収|税額)'], n=>[n.a*0.20315,'円','税金（20.315%）',yen(n.a)+' × 20.315%']),
  K('金融',['<RIRITSU>{r}<PCT>(で|だと|なら|の複利で|の)?(お金が|元本が|資産が)?(2倍|倍|二倍)(になる|にする|になるまで|になるのは|になるには)(のは|まで|には)?(何年|なんねん|どのくらい|どれくらい)?(かかる|後)?','72の法則(で)?<RIRITSU>?{r}<PCT>(だと|なら|は|で)?'], n=>n.r?[72/n.r,'年','2倍になるまで（72の法則）','72 ÷ '+fmt(n.r)]:R_err('利率が 0 です')),
  K('金融',['{y}年(で|間で)(お金を|元本を|資産を)?(2倍|倍|二倍)(にする|になる)(には|ためには|のに)(、)?(必要な)?(<RIRITSU>|何<PCT>)(は|が)?(何<PCT>)?(必要)?'], n=>n.y?[72/n.y,'%','必要な年利（72の法則）','72 ÷ '+fmt(n.y)+'年']:R_err('年数が 0 です')),
  K('金融',['<MAITSUKI2>{a}円?(を|ずつ)?(、)?<RIRITSU>{r}<PCT>(で|の|の複利で)?{y}年(間)?<TSUMITATE>?(と|ら|で|の|ときの|場合の)?(いくら|合計|総額|元利合計|資産)?','<MAITSUKI2>{a}円?(を|ずつ)?{y}年(間)?(、)?<RIRITSU>{r}<PCT>(で|の|の複利で)?<TSUMITATE>(と|ら|で|の)?','<RIRITSU>{r}<PCT>(で|の)?<MAITSUKI2>{a}円?(を|ずつ)?{y}年(間)?<TSUMITATE>(と|ら|で|の)?'], n=>{ const i=n.r/100/12, m=Math.round(n.y*12), v=i?n.a*(Math.pow(1+i,m)-1)/i:n.a*m; return pOut(v,'円',{pre:'積立の合計 ', say:'積み立てた合計は '+sayU(v,'円')+'、うち 元本は '+sayU(n.a*m,'円')+' です', f:yen(n.a)+' × '+m+'回（元本 '+yen(n.a*m)+'・ふえた分 '+yen(Math.round(v-n.a*m))+'）'}); }),
  K('金融',['{F}円?(を|まで)?{y}年(間)?(で|以内に)<TAMERU>(のに|ために|には|なら|と)?(、)?<RIRITSU>{r}<PCT>(で|なら|だと|の運用で|で運用して|で運用すると)(、)?<MAITSUKI2>?(いくら|何円)?(ずつ)?(積み立て|積立|必要|積み立てれば|積み立てればいい)?','<RIRITSU>{r}<PCT>(で|の運用で)(、)?{y}年(間)?(で|以内に){F}円?(を)?<TAMERU>(のに|ために|には|なら|と)?(、)?<MAITSUKI2>?(いくら|何円)?(ずつ)?(積み立て|積立|必要)?'], n=>{ const i=n.r/100/12, m=Math.round(n.y*12); if(!m) return R_err('年数が 0 です'); return [i?n.F*i/(Math.pow(1+i,m)-1):n.F/m,'円','毎月の積立',yen(n.F)+' を '+m+'回で（年利 '+fmt(n.r)+'%）']; }),
  K('金融',['{P}円?(を)?<RIRITSU>{r}<PCT>(で)?{y}年(間)?<KARI>?(の|で|だと|したら|すると|ときの|場合の)?(の)?<SOGAKU>','{P}円?(を)?{y}年(間)?(で)?<RIRITSU>{r}<PCT>(の|で)?<KARI>?(の|で|だと|ときの)?(の)?<SOGAKU>'], n=>{ const v=PMT(n.P,n.r,n.y)*Math.round(n.y*12); return [v,'円','払う総額','毎月 '+yen(Math.round(PMT(n.P,n.r,n.y)))+' × '+Math.round(n.y*12)+'回']; }),
  K('金融',['{P}円?(を)?<RIRITSU>{r}<PCT>(で)?{y}年(間)?<KARI>(の|で|だと|したら|すると|ときの|場合の)?(の)?<RISOKUG>','{P}円?(を)?{y}年(間)?(で)?<RIRITSU>{r}<PCT>(の|で)?<KARI>(の|で|だと|ときの)?(の)?<RISOKUG>'], n=>{ const v=PMT(n.P,n.r,n.y)*Math.round(n.y*12)-n.P; return [v,'円','利息の合計','払う総額 '+yen(Math.round(v+n.P))+' − 元金 '+yen(n.P)]; }),
  K('金融',['<MAITSUKI2>{m}円?(を|ずつ|の返済で|返済で|返すと|払うと|の支払いで|払えると|返せると|なら|だと|で)?(、)?<RIRITSU>{r}<PCT>(で|の)?{y}年(間)?(の)?(ローンで|ローン|返済で|返済)?(だと|なら|で)?(、)?(いくら)?<KARIRARERU>','<RIRITSU>{r}<PCT>(で|の)?{y}年(間)?(の)?(ローンで|ローン|返済で|返済)?(、)?<MAITSUKI2>{m}円?(を|ずつ|の返済|返済|払えると|返せると|なら|だと)?(で)?(、)?(いくら)?<KARIRARERU>'], n=>{ const i=n.r/100/12, k=Math.round(n.y*12); return [i?n.m*(1-Math.pow(1+i,-k))/i:n.m*k,'円','借りられる額',yen(n.m)+' × '+k+'回（年利 '+fmt(n.r)+'%）']; }),
  K('金融',['{a}円?(の|で)?(家|物件|マンション|車|住宅|土地|もの|買い物)?(に|で|を買うとき|を|の)?頭金(を|が|は)?{b}円?(入れると|入れたら|払うと|払ったら|だと|なら|で|の|入れた)?(ときの|場合の)?(の)?(ローン|借入|借入額|借り入れ|残り|残額|借りる額|ローン額|ローンの額)','頭金{b}円?(で|を入れて|、)?{a}円?(の|で)?(家|物件|マンション|車|住宅|土地|もの)?(を買うと|の)?(ローン|借入|借入額|借り入れ|残り|残額|借りる額|ローン額)'], n=>[n.a-n.b,'円','借りる額',yen(n.a)+' − '+yen(n.b)]),
  K('金融',['<RIRITSU>{r}<PCT>(は|の|を|って)?(月利|月の利率|1か月の利率|月あたり|1か月あたり)(に直すと|で|は|何<PCT>)?'], n=>[n.r/12,'%','月利',fmt(n.r)+'% ÷ 12']),
  K('金融',['月利{r}<PCT>(は|の|を|って)?(年利|年率|年の利率|1年|年に直すと)(に直すと|で|は|何<PCT>)?'], n=>[n.r*12,'%','年利',fmt(n.r)+'% × 12']),
  K('金融',['<RIRITSU>{r}<PCT>(は|の|を|って)?(日歩|1日の利率|1日あたり|日割り|日利)(に直すと|で|は|何<PCT>)?'], n=>[n.r/365,'%','1日あたり',fmt(n.r)+'% ÷ 365']),
  K('金融',['{a}円?(は|の|を|って|が)?(、)?(年)?{p}<PCT>(の)?<INFURE>(で|が|だと|なら|が続くと|のとき)?(、)?{y}年(後|たつと|経つと|後に|後には|で)(の)?(価値|実質|実質価値|の値打ち|いくらの価値|何円の価値)?','<INFURE>(率)?(が)?(年)?{p}<PCT>(で|だと|なら|のとき)(、)?{a}円?(は|の)?{y}年(後|たつと|経つと|後に|後には)(の)?(価値|実質|実質価値|の値打ち)?'], n=>[n.a/Math.pow(1+n.p/100,n.y),'円','今の価値に直すと',yen(n.a)+' ÷ '+fmt(1+n.p/100)+' ^ '+fmt(n.y)]),
  K('金融',['(今|いま|現在)?{a}円?(のもの|の物|の品|の商品|のランチ|の家賃)(は|が)?(、)?(年|毎年)?{p}<PCT>(ずつ)?(値上がり|値上げ|上がる|上がると|上がったら|上昇|のインフレ|インフレ)(すると|したら|で|だと|なら|して|が続くと)?(、)?{y}年(後|たつと|経つと|後に|後には|で)(は|に)?(いくら)?'], n=>[n.a*Math.pow(1+n.p/100,n.y),'円',fmt(n.y)+'年後',yen(n.a)+' × '+fmt(1+n.p/100)+' ^ '+fmt(n.y)]),
  // ── 株・外貨 ──
  K('投資',['(株価|1株)?{p}円?(で|、|の株で|の株が|の株の)?(1株)?配当(金)?(が|は)?{d}円?(の|で|だと|なら|のとき|のときの)?<RIMAWARI>','<RIMAWARI>(は)?(、)?(株価)?{p}円?(で|、)?配当(金)?{d}円?(だと|なら|で|の)?'], n=>n.p?[n.d/n.p*100,'%','配当利回り',yen(n.d)+' ÷ '+yen(n.p)]:R_err('株価が 0 です')),
  K('投資',['{k}<KABU>(で|を|、|持っていて|もっていて|保有で|の)?(1株)?(あたり)?(配当|配当金)?{d}円?(の配当|の配当金|配当)(だと|なら|で|の|が出ると|もらえると)?(の)?(配当金|配当|合計|受取額|もらえる額)?','1株(あたり)?(配当|配当金)?{d}円?(の配当|配当)?(で|、|を)?{k}<KABU>(持っていると|持ってると|保有で|だと|なら|で|の|分)?(の)?(配当金|配当|合計|受取額)?'], n=>[n.k*n.d,'円','配当金',fmt(n.k)+'株 × '+yen(n.d)+'（税引き後 '+yen(Math.round(n.k*n.d*(1-0.20315)))+'）']),
  K('投資',['株価{p}円?(で|、|の)?(1株利益|EPS|eps|1株あたり利益|1株純利益)(が|は)?{e}円?(の|で|だと|なら|のとき|のときの)?(PER|per|株価収益率)','(PER|per|株価収益率)(は)?(、)?株価{p}円?(で|、)?(1株利益|EPS|eps){e}円?(だと|なら|で|の)?'], n=>n.e?[n.p/n.e,'倍','PER',yen(n.p)+' ÷ '+yen(n.e)]:R_err('1株利益が 0 です')),
  K('投資',['株価{p}円?(で|、|の)?(1株純資産|BPS|bps|1株あたり純資産)(が|は)?{b}円?(の|で|だと|なら|のとき|のときの)?(PBR|pbr|株価純資産倍率)','(PBR|pbr|株価純資産倍率)(は)?(、)?株価{p}円?(で|、)?(1株純資産|BPS|bps){b}円?(だと|なら|で|の)?'], n=>n.b?[n.p/n.b,'倍','PBR',yen(n.p)+' ÷ '+yen(n.b)]:R_err('1株純資産が 0 です')),
  K('投資',['{a}円?で(買って|買い|買った株を|買った株が|買ったものを|買ったものが|仕入れて|仕入れたものを)(、)?{b}円?(で|に)(売った|売る|売ると|売ったら|売却|売却すると|売れた|売れたら|なった|なったら|なると|上がった|上がったら|下がった|下がったら)(ら|とき|ときの|場合|場合の)?(、)?(の)?{k}<KABU>(分)?(の)?<SONEKI>?','{k}<KABU>(を)?{a}円?で(買って|買い)(、)?{b}円?で(売った|売る|売ると|売ったら|売却)(ら|とき|ときの|場合の)?(の)?<SONEKI>?'], n=>[(n.b-n.a)*n.k,'円','損益','('+yen(n.b)+' − '+yen(n.a)+') × '+fmt(n.k)+'株']),
  K('投資',['{a}円?で(買って|買い|買った株が|買ったものが|買った株を|買ったものを|仕入れて)(、)?{b}円?(で|に)(売った|売る|売ると|売ったら|売却|売れた|売れたら|なった|なったら|なると|上がった|上がったら|下がった|下がったら)(ら|とき|場合)?(、)?(は)?(何<PCT>|なん<PCT>|騰落率|上昇率|下落率|利益率|損益率|リターン)(の)?(利益|損|上昇|下落|アップ|ダウン|増|減|儲け|もうけ)?'], n=>n.a?[(n.b-n.a)/n.a*100,'%','騰落率','('+yen(n.b)+' − '+yen(n.a)+') ÷ '+yen(n.a)]:R_err('買値が 0 です')),
  K('投資',['{p}円?(で|を|の株を|のを)?{k}<KABU>(と|、|に|買って|買い|買ったあと){q}円?(で|を|の株を|のを)?{m}<KABU>(買った|買うと|買ったら|を買った|買い増し|買い増した|買い増すと)?(とき|ときの|場合の|ら)?(の)?<TANKA>','<TANKA>(は)?{p}円?(で|を)?{k}<KABU>(と|、){q}円?(で|を)?{m}<KABU>(だと|なら|で)?'], n=>(n.k+n.m)?[(n.p*n.k+n.q*n.m)/(n.k+n.m),'円','平均の単価','('+yen(n.p)+' × '+fmt(n.k)+' ＋ '+yen(n.q)+' × '+fmt(n.m)+') ÷ '+fmt(n.k+n.m)+'株']:R_err('株数が 0 です')),
  K('投資',['1<CUR@c>{a}円?で(買って|買い|買った<CUR>を|買った<CUR>が|両替して|替えて)(、)?(1<CUR>)?{b}円?(で|に)(売った|売る|売ると|売ったら|なった|なったら|なると|戻した|戻すと|戻したら|円に戻すと|両替すると)(ら|とき|場合)?(、)?(の)?{k}<CUR>(分)?(の)?<SONEKI>?','{k}<CUR@c>(を)?1<CUR>{a}円?で(買って|買い|両替して)(、)?(1<CUR>)?{b}円?(で|に)(売った|売る|売ると|売ったら|なった|なったら|なると|戻すと)(ら|とき|ときの|場合の)?(の)?<SONEKI>?'], n=>[(n.b-n.a)*n.k,'円','為替の損益','('+yen(n.b)+' − '+yen(n.a)+') × '+fmt(n.k)]),
  K('投資',['{k}<CUR@c>(を|に|へ)?(両替|替える|換える|交換|買う)?(するのに|すると|したら|と|のに|には)?(、)?1<CUR>{r}円?(で|、|に)?(1<CUR>(あたり)?)?<TESURYO>(が)?(1<CUR>(あたり)?)?{f}円?(だと|なら|で|の|かかると|のとき)?(いくら|何円|必要)?'], n=>[n.k*(n.r+n.f),'円','必要な円',fmt(n.k)+' × ('+yen(n.r)+' ＋ '+yen(n.f)+')']),
  K('投資',['(物件|物件価格|マンション|アパート|購入価格|価格|家)?{p}円?(の物件|の家|のマンション|のアパート)?(で|、|を買って|の)?(月|毎月|月々|月額)?(の)?<YACHIN>(が|は|収入が|収入)?(月|毎月|月々|月額)?{r}円?(の|で|だと|なら|のとき|のときの|入ると)?<RIMAWARI>'], n=>n.p?[n.r*12/n.p*100,'%','表面利回り',yen(n.r)+' × 12 ÷ '+yen(n.p)]:R_err('物件の値段が 0 です')),
  // ── 手数料・チップ・サービス料 ──
  K('お金',['{a}円?(の|に|にかかる|に対する|から引かれる|の売上の|を売ったときの)?<TESURYO>(が|は)?{p}<PCT>(だと|なら|で|の|のとき|のときの|は)?(いくら|何円|の額|の金額)?','<TESURYO>{p}<PCT>(で|の|だと|なら)?(、)?{a}円?(の|を|だと|なら|に対して|にかかる)?(<TESURYO>|額|金額)?'], n=>[n.a*n.p/100,'円','手数料',yen(n.a)+' × '+fmt(n.p)+'%']),
  K('お金',['{a}円?(から|の|で)?<TESURYO>(が|は|を)?{p}<PCT>(を|が|分を)?(引くと|引いたら|引かれると|引かれたら|引いた|引かれた|取られると|取られたら|差し引くと|差し引いた)(残り|手取り|受け取り|受取額|入金額|振込額|の残り|あとの額|後の額)?','{a}円?(の|から)?<TESURYO>{p}<PCT>(を)?(引いた|引かれた|差し引いた)(あと|後)?(の)?(残り|手取り|受け取り|受取額|入金額|振込額)'], n=>[n.a*(1-n.p/100),'円','受け取る額',yen(n.a)+' × '+fmt(1-n.p/100)]),
  K('お金',['{a}円?(を|の)?(振り込む|振込|振り込み|送金|送る|振り込むと|送金すると|送ると)(と|ときの|のに|には)?(、)?(振込)?<TESURYO>(が|は)?{f}円?(だと|なら|で|かかると|の|のとき)?(合計|全部で|いくら|の合計)?','(振込)?<TESURYO>{f}円?(で|、|が|がかかって)?{a}円?(を)?(振り込む|振込|振り込み|送金|送る)(と|ときの)?(合計|全部で)?'], n=>[n.a+n.f,'円','合計',yen(n.a)+' ＋ '+yen(n.f)]),
  K('お金',['{a}円?(の|に|で)?チップ(を|が|は)?{p}<PCT>(だと|なら|で|の|払うと|つけると|付けると|渡すと|のとき)?(のチップ|の額|いくら|は)?','チップ{p}<PCT>(で|の|だと|なら)?(、)?{a}円?(の|だと|なら|に対して)?(チップ)?'], n=>[n.a*n.p/100,'円','チップ',yen(n.a)+' × '+fmt(n.p)+'%（合計 '+yen(n.a*(1+n.p/100))+'）']),
  K('お金',['{a}円?(に|と|の)?チップ{p}<PCT>(を足すと|を入れると|込みで|込み|を合わせると|を加えると|を足した|込みの)(合計|全部で|金額|額)?'], n=>[n.a*(1+n.p/100),'円','チップ込み',yen(n.a)+' × '+fmt(1+n.p/100)]),
  K('お金',['{a}円?(に|と|の|で)?サービス料{p}<PCT>(と|、|に|プラス)(消費税|税)(を足すと|を入れると|込みで|込み|を合わせると|がかかると|で|だと|なら)?(合計|全部で|金額|額)?'], n=>[n.a*(1+n.p/100)*taxF(),'円','サービス料・税込み',yen(n.a)+' × '+fmt(1+n.p/100)+' × '+fmt(taxF())]),
  // ── 商売 ──
  K('商売',['<GENKA>{c}円?(で|に|の|のものを|のものに|の商品を|の商品に)?(、)?(利益率|粗利率|マージン率)(を|が|は)?{p}<PCT>(に|で|の|取る|とる|確保|にする|にしたい|取りたい|とりたい|にするには|取るには|にするなら)?(する|すると|した|したい)?(には|なら|ときの|ための|場合の)?(、)?(の)?<BAIKA>?','(利益率|粗利率){p}<PCT>(で|に|を取るには|にするには)(、)?<GENKA>{c}円?(の|だと|なら)?(の)?<BAIKA>?'], n=>n.p<100?[n.c/(1-n.p/100),'円','売値',yen(n.c)+' ÷ (1 − '+fmt(n.p)+'%)']:R_err('利益率は 100% より 小さく してください')),
  K('商売',['<GENKA>{c}円?(に|の|のものに|の商品に)?(、)?{p}<PCT>(の)?(利益|もうけ|儲け|マージン|粗利|値入れ|値入)(を)?(乗せ|のせ|上乗せ|足し|つけ|付け|とっ|取っ|乗せる|のせる|上乗せする|足す|つける|付ける)(て|た|ると|たら|と)?(、)?(の)?<BAIKA>?','<GENKA>{c}円?(に|を)?{p}<PCT>(乗せ|のせ|上乗せ|増し|アップ)(の|で|した|する|すると|て)?<BAIKA>'], n=>[n.c*(1+n.p/100),'円','売値',yen(n.c)+' × '+fmt(1+n.p/100)]),
  K('商売',['<URIAGE>{s}円?(で|、|の|に対して|から)?<GENKA>{c}円?(の|で|だと|なら|のとき|のときの|を引いた|を引くと)?(粗利|粗利益|売上総利益|利益|もうけ|儲け)(額)?','(粗利|粗利益)(は)?<URIAGE>{s}円?(で|、)?<GENKA>{c}円?(だと|なら|で|の)?'], n=>[n.s-n.c,'円','粗利',yen(n.s)+' − '+yen(n.c)]),
  K('商売',['<URIAGE>{s}円?(で|、|の|に対して)?<GENKA>{c}円?(の|で|だと|なら|のとき|のときの)?(粗利率|粗利益率|売上総利益率|利益率)','(粗利率|粗利益率)(は)?<URIAGE>{s}円?(で|、)?<GENKA>{c}円?(だと|なら|で|の)?'], n=>n.s?[(n.s-n.c)/n.s*100,'%','粗利率','('+yen(n.s)+' − '+yen(n.c)+') ÷ '+yen(n.s)]:R_err('売上が 0 です')),
  K('商売',['<URIAGE>{s}円?(で|、|の|に対して)?(経費|費用|コスト|支出|出費|諸経費){c}円?(の|で|だと|なら|のとき|のときの|を引いた|を引くと)?(利益|もうけ|儲け|営業利益|黒字|純利益|手残り)','<URIAGE>{s}円?(で|、|の)?(経費|費用|コスト|支出){c}円?(の|で|だと|なら)?(利益率|営業利益率)'], (n,g,t)=>/率/.test(t)?(n.s?[(n.s-n.c)/n.s*100,'%','利益率','('+yen(n.s)+' − '+yen(n.c)+') ÷ '+yen(n.s)]:R_err('売上が 0 です')):[n.s-n.c,'円','利益',yen(n.s)+' − '+yen(n.c)]),
  K('商売',['固定費{f}円?(で|、|の|が)?(変動費率|原価率)(が|は)?{p}<PCT>(の|で|だと|なら|のとき|のときの)?(損益分岐点|損益分岐点売上高|損益分岐|採算ライン|損益分岐点の売上)','(損益分岐点|損益分岐)(は)?固定費{f}円?(で|、)?(変動費率|原価率){p}<PCT>(だと|なら|で|の)?'], n=>n.p<100?[n.f/(1-n.p/100),'円','損益分岐点の売上',yen(n.f)+' ÷ (1 − '+fmt(n.p)+'%)']:R_err('変動費率は 100% より 小さく してください')),
  K('商売',['固定費{f}円?(で|、|の|が)?(単価|売値|販売単価|1個){p}円?(で|、|の|が)?(変動費|原価|1個の原価|1個あたりの原価|仕入れ){v}円?(の|で|だと|なら|のとき|のときの)?(損益分岐点|損益分岐|採算ライン|何個売れば|何個で|損益分岐点の個数|損益分岐点販売数)(元が取れる|黒字|黒字になる|いい)?'], n=>n.p>n.v?[Math.ceil(n.f/(n.p-n.v)-1e-9),'個','損益分岐点',yen(n.f)+' ÷ ('+yen(n.p)+' − '+yen(n.v)+')']:R_err('単価が 原価より 高く ないと 利益が 出ません')),
  K('商売',['<URIAGE>{s}円?(で|、|の|が)?(客数|お客|お客さん|来店|来客|客|来店数|来客数)(が|は)?{k}(人|組|名)(の|で|だと|なら|のとき|のときの)?(客単価|1人あたり|1人当たり|平均単価|1人あたりの売上)','(客単価)(は)?<URIAGE>{s}円?(で|、)?(客数|お客|客){k}(人|組|名)(だと|なら|で|の)?'], n=>n.k?[n.s/n.k,'円','客単価',yen(n.s)+' ÷ '+fmt(n.k)+'人']:R_err('客数が 0 です')),
  K('商売',['(客単価|単価|1人){p}円?(で|、|の|が|の客が)?(客数|お客|お客さん|来店|来客|客)?(が|は)?{k}(人|組|名)(来ると|来たら|入ると|入ったら|の|で|だと|なら|のとき|のときの)?(の)?<URIAGE>'], n=>[n.p*n.k,'円','売上',yen(n.p)+' × '+fmt(n.k)+'人']),
  K('商売',['(1日|毎日|日商|1日の売上|日に){a}円?(の)?(売上|売り上げ|売れると|売れたら|売ると)?(で|が|を|、|の)?(月|1か月|ひと月)?{d}日(営業|営業すると|営業で|開けると|働くと|で|間|分)(の)?(月商|売上|売り上げ|1か月の売上|合計)?'], n=>[n.a*n.d,'円','売上',yen(n.a)+' × '+fmt(n.d)+'日']),
  K('商売',['{k}(個|本|枚|台|冊|点|セット|袋|箱|食|杯)(仕入れて|作って|用意して|仕入れ|作り)(、)?{m}(個|本|枚|台|冊|点|セット|袋|箱|食|杯)(売れた|売れると|売れたら|売った|売ると|売ったら|出た|出ると)(ら|とき|ときの|場合の)?(の)?(売れた割合|販売率|消化率|売れ行き|何<PCT>|何<PCT>売れた|ロス率|廃棄率|売れ残り率)'], (n,g,t)=>{ if(!n.k) return R_err('仕入れが 0 です'); const loss=/ロス|廃棄|残り/.test(t); return [(loss?(n.k-n.m):n.m)/n.k*100,'%',loss?'ロス率':'売れた割合',(loss?'('+fmt(n.k)+' − '+fmt(n.m)+')':fmt(n.m))+' ÷ '+fmt(n.k)]; }),
  // ── 不動産 ──
  K('不動産',['{a}円?(で|、|の|の土地が|の家が|の物件が|の土地で|の家で)?{t}坪(の|で|だと|なら|のとき|のときの)?<TSUBO>(の値段|の単価|単価|いくら)?'], n=>n.t?[n.a/n.t,'円','坪単価',yen(n.a)+' ÷ '+fmt(n.t)+'坪']:R_err('0坪では割れません')),
  K('不動産',['<TSUBO>{p}円?(で|の|、|の土地が|の土地を|の家が|の家を|で建てると)?{t}坪(の|で|だと|なら|買うと|買ったら|建てると|建てたら|分|ぶん)?(の)?(値段|価格|土地代|建築費|総額|合計|いくら)?','{t}坪(を|で|の|、)?<TSUBO>{p}円?(で|の|だと|なら)?(買うと|建てると)?(の)?(値段|価格|土地代|建築費|総額|合計)?'], n=>[n.p*n.t,'円','合計',yen(n.p)+' × '+fmt(n.t)+'坪']),
  K('不動産',['{a}円?(で|、|の|の部屋が|の物件が|のマンションが)?{m}<HEIBEI>(の|で|だと|なら|のとき|のときの)?(平米単価|㎡単価|1平米あたり|1㎡あたり|平米あたり|1平方メートルあたり|m2単価)(の値段|いくら)?'], n=>n.m?[n.a/n.m,'円','1㎡あたり',yen(n.a)+' ÷ '+fmt(n.m)+'㎡']:R_err('0㎡では割れません')),
  K('不動産',['(平米単価|㎡単価|1平米|1㎡|1平方メートル)(あたり)?{p}円?(で|の|、)?{m}<HEIBEI>(の|で|だと|なら|買うと|分|ぶん)?(の)?(値段|価格|総額|合計|いくら)?'], n=>[n.p*n.m,'円','合計',yen(n.p)+' × '+fmt(n.m)+'㎡']),
  K('不動産',['<YACHIN>{a}円?(の|を|で|は|が|だと|なら)?(、)?(1年|年間|年|12か月|1年分|年額|1年間)(で|だと|に直すと|にすると|分|の合計|では)?(の)?(合計|総額|いくら)?','<YACHIN>{a}円?(を|で|に)?{y}年(間)?(住むと|住んだら|払うと|払ったら|借りると|借りたら|で|分|だと)(の)?(合計|総額|いくら)?'], n=>[n.a*12*(n.y||1),'円',n.y?fmt(n.y)+'年分':'1年分',yen(n.a)+' × 12か月'+(n.y?' × '+fmt(n.y)+'年':'')]),
  K('不動産',['<YACHIN>{a}円?(で|、|の|に)?(管理費|共益費|管理費共益費)(が|は)?{b}円?(の|で|だと|なら|を足すと|を入れると|込みで|込み|を合わせると)?(の)?(合計|月額|毎月|月々|総額|1か月)?(の支払い)?'], n=>[n.a+n.b,'円','毎月',yen(n.a)+' ＋ '+yen(n.b)]),
  K('不動産',['<YACHIN>{a}円?(の|で|だと|なら|の部屋の|の物件の)?(仲介手数料|仲介料)(は|の上限|の目安)?'], n=>[n.a*taxF(),'円','仲介手数料（家賃1か月＋税の上限）',yen(n.a)+' × '+fmt(taxF())]),
  K('不動産',['<YACHIN>{a}円?(の|で|だと|なら)?(更新料|更新費用)(が|は)?{k}(か月|ヶ月|カ月)(分)?(だと|なら|で|の)?(いくら|の額)?','(更新料|更新費用)(は)?<YACHIN>{a}円?(の|で)?{k}(か月|ヶ月|カ月)(分)?(だと|なら)?'], n=>[n.a*n.k,'円','更新料',yen(n.a)+' × '+fmt(n.k)+'か月']),
  // ── 税 ──
  K('税',['<KAZEI>{a}円?(の|で|だと|なら|の人の|のときの|にかかる)?所得税(額|の額|はいくら)?','所得税(は)?<KAZEI>{a}円?(だと|なら|で|の)?'], n=>{ const x=incomeTax(n.a); return [x.v,'円','所得税（復興税は別）',yen(n.a)+' × '+fmt(x.r*100)+'%'+(x.d?' − '+yen(x.d):'')]; }),
  K('税',['<KAZEI>{a}円?(の|で|だと|なら|の人の|のときの|にかかる)?住民税(額|の額|はいくら)?(の所得割)?','住民税(は)?<KAZEI>{a}円?(だと|なら|で|の)?'], n=>[n.a*0.1,'円','住民税の所得割（10%）',yen(n.a)+' × 10%']),
  K('税',['<KAZEI>{a}円?(の|で|だと|なら|の人の|のときの)?(税率|所得税率|所得税の税率)(は)?(何<PCT>)?'], n=>[incomeTax(n.a).r*100,'%','所得税の税率','']),
  K('税',['(法定)?相続人(が|は)?{k}人(の|で|だと|なら|のとき|のときの|の場合の)?(相続税の)?基礎控除(額)?','(相続税の)?基礎控除(額)?(は)?(、)?(法定)?相続人(が|は)?{k}人(だと|なら|で|の)?'], n=>[30000000+6000000*n.k,'円','相続税の基礎控除','3,000万円 ＋ 600万円 × '+fmt(n.k)+'人']),
  K('税',['{a}円?(の|を)?(贈与|もらった|もらうと|もらったら|贈与された|贈与されると|あげると|あげたら|渡すと)(で|と|ときの|のとき|の場合|ら)?(の)?(課税|課税される|課税対象|税金がかかる|贈与税がかかる)(額|金額|分|のは|部分)?','贈与{a}円?(の|で|だと|なら)?(課税|課税される|課税対象)(額|金額|分)?'], n=>[Math.max(0,n.a-1100000),'円','課税される額（基礎控除110万円）',yen(n.a)+' − 110万円']),
  K('税',['{a}円?(の|で|だと|なら|に対して|にかかる)?(軽減税率|8<PCT>の消費税|消費税8<PCT>)(で|の|だと|なら|は)?(税込み|税込|込み)(で|だと|の値段|価格|は)?','{a}円?(の)?(食品|食料品|お弁当|テイクアウト|持ち帰り|新聞)(の|は|で)?(税込み|税込)(で|だと|の値段|価格|は)?'], n=>[n.a*1.08,'円','税込み（8%）',yen(n.a)+' × 1.08']),
  K('税',['{a}円?(の)?(店内|イートイン|外食|お酒|酒類)(の|は|で|だと)?(税込み|税込)(で|だと|の値段|価格|は)?'], n=>[n.a*1.1,'円','税込み（10%）',yen(n.a)+' × 1.1']),
  K('税',['(税込み|税込)(で)?{a}円?(で|の|のうち|は|、)?(8<PCT>|軽減税率)(の|で|だと|対象で)?(消費税|税|税額|本体|本体価格|税抜き|税抜)(は|額)?'], (n,g,t)=>/本体|税抜/.test(t)?[n.a/1.08,'円','税抜き（8%）',yen(n.a)+' ÷ 1.08']:[n.a-n.a/1.08,'円','消費税（8%）',yen(n.a)+' − '+yen(n.a)+' ÷ 1.08']),
  // ── 料理 ──
  K('料理',['{k}<NINBUN>(で|が|の|に)?(、)?{a}<GMU@u>(の|を|は|なら|だと|のレシピを|のところ|のとき|、)(、)?{m}<NINBUN>(だと|では|に|なら|で|にすると|に直すと|分だと|作ると|作るなら|作るには)?(は)?(何<GMU>|どのくらい|どれくらい|いくつ)?','{a}<GMU@u>(が|で|は)?{k}<NINBUN>(の|なら|だと|のとき|、)(、)?{m}<NINBUN>(だと|では|に|なら|で|にすると|分だと|作ると|作るなら)?(は)?(何<GMU>|どのくらい|どれくらい|いくつ)?'], (n,g)=>n.k?[n.a*n.m/n.k,g.u,fmt(n.m)+'人分',fmt(n.a)+g.u+' × '+fmt(n.m)+' ÷ '+fmt(n.k)]:R_err('0人分では割れません')),
  K('料理',['<SPOON@s>(の)?大さじ{k}(杯)?(は|って|の重さ|の重さは)?(何グラム|何g|なんグラム|重さ|グラム|何gですか)?','大さじ{k}(杯)?の<SPOON@s>(は|って)?(何グラム|何g|なんグラム|重さ|グラム)?'], (n,g)=>[SPOON[g.s]*n.k,'g',g.s+' 大さじ'+fmt(n.k),'大さじ1 ＝ '+SPOON[g.s]+'g（目安）']),
  K('料理',['<SPOON@s>(の)?小さじ{k}(杯)?(は|って|の重さ|の重さは)?(何グラム|何g|なんグラム|重さ|グラム|何gですか)?','小さじ{k}(杯)?の<SPOON@s>(は|って)?(何グラム|何g|なんグラム|重さ|グラム)?'], (n,g)=>[SPOON[g.s]/3*n.k,'g',g.s+' 小さじ'+fmt(n.k),'小さじ1 ＝ '+fmt(SPOON[g.s]/3)+'g（目安）']),
  K('料理',['<SPOON@s>{a}(グラム|g)(は|って|を)?(大さじ|おおさじ)(何杯|なんばい|いくつ|で何杯|だと何杯|で|だと)?'], (n,g)=>[n.a/SPOON[g.s],'杯','大さじ',fmt(n.a)+'g ÷ '+SPOON[g.s]+'g（目安）']),
  K('料理',['<SPOON@s>{a}(グラム|g)(は|って|を)?(小さじ|こさじ)(何杯|なんばい|いくつ|で何杯|だと何杯|で|だと)?'], (n,g)=>[n.a/(SPOON[g.s]/3),'杯','小さじ',fmt(n.a)+'g ÷ '+fmt(SPOON[g.s]/3)+'g（目安）']),
  K('料理',['大さじ{k}(杯)?(は|って|を)?(何ml|何cc|何ミリリットル|何ミリ|なんミリ|何シーシー|ミリリットルで|ccで|mlで)(ですか)?'], n=>[n.k*15,'ml','','大さじ1 ＝ 15ml']),
  K('料理',['小さじ{k}(杯)?(は|って|を)?(何ml|何cc|何ミリリットル|何ミリ|なんミリ|何シーシー|ミリリットルで|ccで|mlで)(ですか)?'], n=>[n.k*5,'ml','','小さじ1 ＝ 5ml']),
  K('料理',['(計量)?カップ{k}(杯)?(は|って|を)?(何ml|何cc|何ミリリットル|何ミリ|なんミリ|何シーシー|ミリリットルで|ccで|mlで)(ですか)?','{k}カップ(は|って|を)?(何ml|何cc|何ミリリットル|何ミリ|なんミリ)(ですか)?'], n=>[n.k*200,'ml','','1カップ ＝ 200ml']),
  K('料理',['大さじ{k}(杯)?(は|って|を)?小さじ(何杯|なんばい|いくつ|で何杯|だと何杯|で|だと)'], n=>[n.k*3,'杯','小さじ','大さじ1 ＝ 小さじ3']),
  K('料理',['小さじ{k}(杯)?(は|って|を)?大さじ(何杯|なんばい|いくつ|で何杯|だと何杯|で|だと)'], n=>[n.k/3,'杯','大さじ','小さじ3 ＝ 大さじ1']),
  K('料理',['{a}(ml|cc|ミリリットル|ミリ)(は|って|を)?大さじ(何杯|なんばい|いくつ|で何杯|だと何杯|で|だと)'], n=>[n.a/15,'杯','大さじ',fmt(n.a)+'ml ÷ 15ml']),
  K('料理',['{a}(ml|cc|ミリリットル|ミリ)(は|って|を)?小さじ(何杯|なんばい|いくつ|で何杯|だと何杯|で|だと)'], n=>[n.a/5,'杯','小さじ',fmt(n.a)+'ml ÷ 5ml']),
  K('料理',['{a}(ml|cc|ミリリットル|ミリ)(は|って|を)?(計量)?カップ(何杯|なんばい|いくつ|で何杯|だと何杯|で|だと)'], n=>[n.a/200,'杯','カップ',fmt(n.a)+'ml ÷ 200ml']),
  K('料理',['(お米|米|白米)?{k}合(は|って|の|のお米は|の米は)?(何グラム|何g|なんグラム|重さ|グラム|何キロ)','(お米|米|白米){k}合の重さ'], n=>[n.k*150,'g','お米 '+fmt(n.k)+'合','1合 ＝ 150g']),
  K('料理',['(お米|米|白米){a}(?<wu>キロ|kg|グラム|g)(は|って|で)?(何合|なんごう)(炊ける|分|ぶん|ある)?'], (n,g)=>[(/キロ|kg/.test(g.wu)?n.a*1000:n.a)/150,'合','',fmt(n.a)+g.wu+' ÷ 150g']),
  K('料理',['(お米|米|白米)?{k}合(を|は|って|で|炊くと|炊いたら)?(ご飯|ごはん|お茶碗|茶碗|ライス)(で)?(何杯|なんばい|何膳|何人分|何人前)(分|ぶん)?','(お米|米|白米)?{k}合(は|で|炊くと)?(何人分|何人前|何杯分|何膳)'], n=>[n.k*330/150,'杯','お茶碗（1杯 150g）',fmt(n.k)+'合 × 330g ÷ 150g']),
  K('料理',['(お米|米|白米)?{k}合(を|の|は|って)?(炊く|炊くと|炊いたら|炊き上がり|炊きあがり|炊くとき)(と|は|の|で)?(何グラム|何g|なんグラム|重さ|グラム)(のご飯|のごはん)?','(お米|米)?{k}合の(ご飯|ごはん)(は|の重さ)?(何グラム|何g|重さ)?'], n=>[n.k*330,'g','炊き上がり','1合 → 約330g']),
  K('料理',['(お米|米|白米)?{k}合(を|の|は|で)?(炊く|炊くとき|炊くときの|炊く時の)?(の)?(水|水加減|水の量)(は|の量|の量は)?(何ml|何cc|何ミリ|どのくらい|どれくらい)?'], n=>[n.k*200,'ml','水（目安）','1合 → 200ml']),
  K('料理',['水{w}(?<wu>ml|cc|ミリリットル|ミリ|リットル|L)(に|へ|で)(、)?(塩|食塩|砂糖|塩分)(を)?{s}(グラム|g)(入れた|入れると|入れたら|溶かした|溶かすと|溶かしたら|を入れた|の|で)(ときの|時の|場合の)?(の)?(濃度|塩分濃度|塩分|何<PCT>|糖度)'], (n,g)=>{ const w=/リットル|L/.test(g.wu)?n.w*1000:n.w; return (w+n.s)?[n.s/(w+n.s)*100,'%','濃度',fmt(n.s)+'g ÷ ('+fmt(w)+'g ＋ '+fmt(n.s)+'g)']:R_err('量が 0 です'); }),
  K('料理',['水{w}(?<wu>ml|cc|ミリリットル|ミリ|リットル|L)(に|で|を|の)(、)?(塩分|濃度|塩分濃度)?{p}<PCT>(の)?(塩水|食塩水|塩分|濃度|砂糖水)(にする|を作る|にしたい|を作りたい|に|で)?(には|なら|のに|とき)?(、)?(の)?(塩|食塩|砂糖)?(は|の量|は何グラム|何グラム|の量は)?','{p}<PCT>の(塩水|食塩水|砂糖水)(を)?水{w}(?<wu2>ml|cc|ミリリットル|ミリ|リットル|L)(で|から)(作る|作るには|作るとき|作るときの)(、)?(の)?(塩|食塩|砂糖)?(は|の量)?'], (n,g)=>{ const w=/リットル|L/.test(g.wu||g.wu2||'')?n.w*1000:n.w; return n.p<100?[w*n.p/(100-n.p),'g','入れる量',fmt(w)+'g × '+fmt(n.p)+' ÷ (100 − '+fmt(n.p)+')']:R_err('濃度は 100% より 小さく してください'); }),
  K('料理',['{g}(グラム|g)(で|が|あたり|当たり)?{k}<KCAL>(の|のものを|のを|なら|だと|のとき|、)(、)?{m}(グラム|g)(は|だと|なら|で|食べると|食べたら|分|ぶん)?(何<KCAL>)?','100(グラム|g)(あたり|当たり)?{k}<KCAL>(の|のものを|のを|なら|だと|、)(、)?{m}(グラム|g)(は|だと|なら|で|食べると|食べたら|分)?(何<KCAL>)?'], n=>{ const g0=n.g||100; return [n.k*n.m/g0,'kcal','',fmt(n.k)+'kcal × '+fmt(n.m)+'g ÷ '+fmt(g0)+'g']; }),
  K('料理',['(たんぱく質|タンパク質|蛋白質|プロテイン){p}(グラム|g)(、|と|で)?(脂質|脂肪|あぶら){f}(グラム|g)(、|と|で)?(炭水化物|糖質){c}(グラム|g)(の|で|だと|なら)?(<KCAL>|エネルギー|熱量)(は|数)?','(PFC|pfc)(が|は)?{p}(、|と|対|:){f}(、|と|対|:){c}(の|で|だと|なら)?(<KCAL>|エネルギー)'], n=>[n.p*4+n.f*9+n.c*4,'kcal','',fmt(n.p)+' × 4 ＋ '+fmt(n.f)+' × 9 ＋ '+fmt(n.c)+' × 4']),
  K('料理',['(1個|1つ|1枚|1本|1杯|1切れ|1食|1袋){k}<KCAL>(の|のものを|のを|を|、|で)?{m}(個|つ|枚|本|杯|切れ|食|袋)(食べると|食べたら|飲むと|飲んだら|で|だと|なら|分|ぶん)?(何<KCAL>)?'], n=>[n.k*n.m,'kcal','',fmt(n.k)+'kcal × '+fmt(n.m)]),
  K('料理',['{a}に対して{b}(の割合)?(なら|だと|で|のとき|の割合で|、)(、)?{c}(に対して|には|だと|なら|では)(は)?(いくつ|どのくらい|どれくらい|何)?','{a}<GMU@u>?に{b}<GMU@v>?(の割合)?(で|なら|だと)(、)?{c}<GMU>?(に|には|なら|だと)(は)?(何<GMU>|いくつ|どのくらい|どれくらい)'], (n,g)=>n.a?[n.b*n.c/n.a,g.v||'','',fmt(n.b)+' × '+fmt(n.c)+' ÷ '+fmt(n.a)]:R_err('0 に対しては 出せません')),
  K('料理',['{t}(?<tu>分|時間)(で|に)?{k}(個|枚|本|人分|皿|食|杯|セット)(作れる|できる|焼ける|作る|焼く|包める|さばける|仕上がる)(と|なら|ペースで|ので|ペースだと)?(、)?{m}(個|枚|本|人分|皿|食|杯|セット)(は|だと|なら|で|作るのに|作るには|焼くのに|焼くには)?(何分|何時間|なんぷん|なんじかん|どのくらい|どれくらい)(かかる|必要)?'], (n,g)=>n.k?[n.t*n.m/n.k,g.tu,'',fmt(n.t)+g.tu+' × '+fmt(n.m)+' ÷ '+fmt(n.k)]:R_err('0個では割れません'))
);
/* ════════════ 学校の算数・数学・理科（v8。1000種類へ 向けた 2回目）════════════
   書き方は v7 と 同じ（K）。文字の 答えは T(読み上げ, 画面, 式)。早見表・文例には 出さない。 */
const T=(say,a,f)=>R_info(say, a, f||'');
const PI=Math.PI, RT=x=>Math.sqrt(x);
const AU=g=>areaU(g.u), VU=g=>volU(g.u), LNU=g=>lenU(g.u);
const fact=n=>{ let r=1; for(let i=2;i<=n;i++) r*=i; return r; };
const nPr=(n,r)=>{ let x=1; for(let i=0;i<r;i++) x*=n-i; return x; };
const nCr=(n,r)=>{ r=Math.min(r,n-r); let x=1; for(let i=1;i<=r;i++) x=x*(n-r+i)/i; return Math.round(x); };
const okN=(...xs)=>xs.every(x=>isInt(x) && x>=0 && x<=170);
function pfac(a){ const out=[]; let x=a; for(let p=2;p*p<=x;p++){ let k=0; while(x%p===0){ x/=p; k++; } if(k) out.push([p,k]); } if(x>1) out.push([x,1]); return out; }
function divs(a){ const lo=[], hi=[]; for(let i=1;i*i<=a;i++){ if(a%i===0){ lo.push(i); if(i*i!==a) hi.unshift(a/i); } } return lo.concat(hi); }
const SUP=k=>String(k).split('').map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
function fracRed(n,d){ const k=gcd(n,d)||1; return [n/k, d/k]; }
function toFrac(x){ let h1=1,h0=0,k1=0,k0=1,b=Math.abs(x); for(let i=0;i<30;i++){ const a=Math.floor(b), h2=a*h1+h0, k2=a*k1+k0; if(k2>100000) break; h0=h1; h1=h2; k0=k1; k1=k2; if(Math.abs(h1/k1-Math.abs(x))<1e-12) break; const f=b-a; if(f<1e-12) break; b=1/f; } return [x<0?-h1:h1, k1]; }
const stat=xs=>{ const n=xs.length, m=xs.reduce((a,b)=>a+b,0)/n, v=xs.reduce((a,b)=>a+(b-m)*(b-m),0)/n; return {n,m,v,sd:Math.sqrt(v)}; };
PW.SHUI=['周り','まわり','周の長さ','周囲','周囲の長さ','周長','まわりの長さ','周りの長さ','外周'];
PW.HYOMEN=['表面積','ひょうめんせき','表面の面積','全表面積'];
PW.SOKUMEN=['側面積','そくめんせき','側面の面積'];
PW.TAIKAKU=['対角線','たいかくせん','対角線の長さ'];
PW.NANTORI=['何通り','なんとおり','何とおり','いくつ','何種類','何パターン','通り','とおり'];
PW.KAKURITSU=['確率','かくりつ','確率は','可能性'];
PW.NOUDO=['濃度','のうど','何%','何パーセント','濃さ','濃度は'];
PW.SHIO=['食塩水','塩水','しょくえんすい','砂糖水','水溶液','溶液'];
PW.MAZERU=['混ぜる','混ぜると','混ぜたら','まぜる','まぜると','まぜたら','合わせる','合わせると','合わせたら','混ぜた','混合','混合すると','足すと','加えると'];
PW.TASUMIZU=['足す','足すと','足したら','加える','加えると','加えたら','入れる','入れると','入れたら','足した','加えた','入れた'];
PW.CHUO=['中央値','ちゅうおうち','メジアン','メディアン','真ん中の値','まんなかの値'];
PW.SAIHIN=['最頻値','さいひんち','モード','一番多い値','いちばん多い値'];
PW.HANI=['範囲','レンジ','はんい','散らばりの範囲'];
PW.BUNSAN=['分散','ぶんさん'];
PW.SD=['標準偏差','ひょうじゅんへんさ','SD','sd'];
PW.DOWA=['和','合計','総和','足した数','足した答え','たした数'];
PW.KOU=['項','番目','項目','こう','ばんめ'];
PW.SIN=['sin','サイン','正弦','SIN','Sin'];
PW.COS=['cos','コサイン','余弦','COS','Cos'];
PW.TAN=['tan','タンジェント','正接','TAN','Tan'];
PW.DENATSU=['電圧','でんあつ'];
PW.DENRYU=['電流','でんりゅう'];
PW.TEIKO=['抵抗','ていこう','抵抗値'];
PW.VOLT=['ボルト','V','v'];
PW.AMP=['アンペア','A'];
PW.OHM=['オーム','Ω'];
PW.KG2=['キロ','kg','キログラム','キロの物体','kgの物体','キロのもの'];
PW.MTR=['メートル','m'];
PW.BYO=['秒','秒間','びょう'];
PW.NEWTON=['ニュートン','N'];
PHRASES.push(
  // ── 図形：平面 ──
  K('図形2',['(1辺|1辺が|1辺の長さが|1辺の長さ){a}<LU@u>?(の)?正方形(の)?<SHUI>'], (n,g)=>[n.a*4,LNU(g),'周りの長さ',fmt(n.a)+' × 4']),
  K('図形2',['(縦|たて){a}<LU@u>?(、|で|と)?(横|よこ){b}<LU>?(の)?<CHOHO>?(の)?<SHUI>'], (n,g)=>[(n.a+n.b)*2,LNU(g),'周りの長さ','('+fmt(n.a)+' ＋ '+fmt(n.b)+') × 2']),
  K('図形2',['(1辺|1辺が|1辺の長さが|1辺の長さ){a}<LU@u>?(の)?正方形(の)?<TAIKAKU>'], (n,g)=>[n.a*RT(2),LNU(g),'対角線',fmt(n.a)+' × √2']),
  K('図形2',['<MENSEKI>(が)?{s}(<LU@u>|平方センチ|平方メートル|㎡|cm2|m2)?(の)?正方形(の)?(1辺|1辺の長さ|辺の長さ|辺)'], n=>[RT(n.s),'','1辺','√'+fmt(n.s)]),
  K('図形2',['<MENSEKI>(が)?{s}(平方センチ|平方メートル|㎡|cm2|m2)?(で|、|の)?(縦|たて|横|よこ)(が)?{a}<LU@u>?(の)?<CHOHO>?(の)?(横|よこ|縦|たて)(の長さ)?'], (n,g)=>n.a?[n.s/n.a,LNU(g),'',fmt(n.s)+' ÷ '+fmt(n.a)]:R_err('0 では割れません')),
  K('図形2',['3辺(が|の長さが)?{a}<LU@u>?(、|と){b}<LU>?(、|と){c}<LU>?(の)?3角形(の)?<MENSEKI>','(辺が)?{a}<LU@u>?(、|と){b}<LU>?(、|と){c}<LU>?の3辺(の|を持つ|をもつ)?3角形(の)?<MENSEKI>'], (n,g)=>{ const s=(n.a+n.b+n.c)/2, q=s*(s-n.a)*(s-n.b)*(s-n.c); return q>0?[RT(q),AU(g),'面積（ヘロンの公式）','s ＝ '+fmt(s)]:R_err('その 3辺では 三角形に なりません'); }),
  K('図形2',['(1辺|1辺が|1辺の長さが|1辺の長さ){a}<LU@u>?(の)?正3角形(の)?<MENSEKI>'], (n,g)=>[RT(3)/4*n.a*n.a,AU(g),'面積','√3 ÷ 4 × '+fmt(n.a)+'²']),
  K('図形2',['(1辺|1辺が|1辺の長さが|1辺の長さ){a}<LU@u>?(の)?正3角形(の)?高さ'], (n,g)=>[RT(3)/2*n.a,LNU(g),'高さ','√3 ÷ 2 × '+fmt(n.a)]),
  K('図形2',['(直角をはさむ)?(2辺|2つの辺)?(が|の長さが)?{a}<LU@u>?(と|、){b}<LU>?(の)?直角3角形(の)?(斜辺|しゃへん)(の長さ)?','底辺{a}<LU@u>?(、|で|と)?高さ{b}<LU>?(の)?直角3角形(の)?(斜辺|しゃへん)(の長さ)?','(3平方の定理で)?{a}<LU@u>?と{b}<LU>?の(斜辺|しゃへん)'], (n,g)=>[Math.hypot(n.a,n.b),LNU(g),'斜辺','√('+fmt(n.a)+'² ＋ '+fmt(n.b)+'²)']),
  K('図形2',['(斜辺|しゃへん)(が)?{c}<LU@u>?(で|、|と)?(1辺|もう1辺|他の辺|底辺|高さ)(が)?{a}<LU>?(の)?直角3角形(の)?(もう1辺|残りの辺|他の辺|のこりの辺|高さ|底辺|もう1つの辺)(の長さ)?'], (n,g)=>n.c>n.a?[RT(n.c*n.c-n.a*n.a),LNU(g),'','√('+fmt(n.c)+'² − '+fmt(n.a)+'²)']:R_err('斜辺が いちばん 長く ないと いけません')),
  K('図形2',['底辺{a}<LU@u>?(、|で|と)?高さ{b}<LU>?(の)?(平行4辺形)(の)?<MENSEKI>'], (n,g)=>[n.a*n.b,AU(g),'面積',fmt(n.a)+' × '+fmt(n.b)]),
  K('図形2',['<TAIKAKU>(が)?{a}<LU@u>?(と|、){b}<LU>?(の)?(ひし形|菱形|ひしがた)(の)?<MENSEKI>'], (n,g)=>[n.a*n.b/2,AU(g),'面積',fmt(n.a)+' × '+fmt(n.b)+' ÷ 2']),
  K('図形2',['<MENSEKI>(が)?{s}(平方センチ|平方メートル|㎡|cm2|m2)?(の)?<EN>(の)?(半径|はんけい)'], n=>[RT(n.s/PI),'','半径','√('+fmt(n.s)+' ÷ π)']),
  K('図形2',['<ENSHU>(が)?{c}<LU@u>?(の)?<EN>(の)?(半径|はんけい)'], (n,g)=>[n.c/(2*PI),LNU(g),'半径',fmt(n.c)+' ÷ 2π']),
  K('図形2',['<ENSHU>(が)?{c}<LU@u>?(の)?<EN>(の)?(直径|ちょっけい)'], (n,g)=>[n.c/PI,LNU(g),'直径',fmt(n.c)+' ÷ π']),
  K('図形2',['<ENSHU>(が)?{c}<LU@u>?(の)?<EN>(の)?<MENSEKI>'], (n,g)=>[n.c*n.c/(4*PI),AU(g),'面積',fmt(n.c)+'² ÷ 4π']),
  K('図形2',['(半径|はんけい){r}<LU@u>?(、|で|と)?中心角{t}度(の)?(おうぎ形|扇形|おうぎがた|扇型)(の)?<MENSEKI>'], (n,g)=>[PI*n.r*n.r*n.t/360,AU(g),'面積','π × '+fmt(n.r)+'² × '+fmt(n.t)+' ÷ 360']),
  K('図形2',['(半径|はんけい){r}<LU@u>?(、|で|と)?中心角{t}度(の)?(おうぎ形|扇形|おうぎがた|扇型)?(の)?(弧|こ|弧の長さ)(の長さ)?'], (n,g)=>[2*PI*n.r*n.t/360,LNU(g),'弧の長さ','2π × '+fmt(n.r)+' × '+fmt(n.t)+' ÷ 360']),
  K('図形2',['(半径|はんけい){r}<LU@u>?(、|で|と)?中心角{t}度(の)?(おうぎ形|扇形|おうぎがた|扇型)(の)?<SHUI>'], (n,g)=>[2*PI*n.r*n.t/360+2*n.r,LNU(g),'周りの長さ','弧 ＋ 半径 × 2']),
  K('図形2',['(半径|はんけい){r}<LU@u>?(の)?半円(の)?<MENSEKI>'], (n,g)=>[PI*n.r*n.r/2,AU(g),'面積','π × '+fmt(n.r)+'² ÷ 2']),
  K('図形2',['(半径|はんけい){r}<LU@u>?(の)?半円(の)?<SHUI>'], (n,g)=>[PI*n.r+2*n.r,LNU(g),'周りの長さ','π × '+fmt(n.r)+' ＋ '+fmt(n.r)+' × 2']),
  K('図形2',['正?{k}角形(の)?内角の(和|合計)'], n=>n.k>=3?[180*(n.k-2),'度','内角の和','180 × ('+fmt(n.k)+' − 2)']:R_err('3角形から 上で 言ってください')),
  K('図形2',['正{k}角形(の)?(1つの|ひとつの)?内角(の大きさ)?'], n=>n.k>=3?[180*(n.k-2)/n.k,'度','1つの内角','180 × ('+fmt(n.k)+' − 2) ÷ '+fmt(n.k)]:R_err('3角形から 上で 言ってください')),
  K('図形2',['正{k}角形(の)?(1つの|ひとつの)?外角(の大きさ)?'], n=>n.k>=3?[360/n.k,'度','1つの外角','360 ÷ '+fmt(n.k)]:R_err('3角形から 上で 言ってください')),
  K('図形2',['正?{k}角形(の)?<TAIKAKU>(の)?(本数|数|は何本|何本)'], n=>n.k>=3?[n.k*(n.k-3)/2,'本','対角線',fmt(n.k)+' × ('+fmt(n.k)+' − 3) ÷ 2']:R_err('3角形から 上で 言ってください')),
  K('図形2',['(1辺|1辺が|1辺の長さが|1辺の長さ){a}<LU@u>?(の)?正6角形(の)?<MENSEKI>'], (n,g)=>[3*RT(3)/2*n.a*n.a,AU(g),'面積','3√3 ÷ 2 × '+fmt(n.a)+'²']),
  K('図形2',['(2つの角|2角|角)(が)?{a}度(と|、){b}度(の)?3角形(の)?(残り|のこり|もう1つ|もうひとつ|3つ目|あと1つ)(の)?(角|角度)?'], n=>[180-n.a-n.b,'度','残りの角','180 − '+fmt(n.a)+' − '+fmt(n.b)]),
  K('図形2',['(長半径|長い半径)(が)?{a}<LU@u>?(、|で|と)?(短半径|短い半径)(が)?{b}<LU>?(の)?(楕円|だ円|だえん)(の)?<MENSEKI>'], (n,g)=>[PI*n.a*n.b,AU(g),'面積','π × '+fmt(n.a)+' × '+fmt(n.b)]),
  K('図形2',['(外側の半径|外の半径|外径|外側)(が)?{R}<LU@u>?(、|で|と)?(内側の半径|内の半径|内径|内側)(が)?{r}<LU>?(の)?(ドーナツ|円環|輪|リング|ドーナツ形)(の)?<MENSEKI>'], (n,g)=>[PI*(n.R*n.R-n.r*n.r),AU(g),'面積','π × ('+fmt(n.R)+'² − '+fmt(n.r)+'²)']),
  K('図形2',['{a}度(は|って|を)?(何|なん)?(ラジアン|rad)(に直すと|で|に)?'], n=>[n.a*PI/180,'rad','',fmt(n.a)+' × π ÷ 180']),
  K('図形2',['{a}(ラジアン|rad)(は|って|を)?(何度|なんど|度に直すと|度で)'], n=>[n.a*180/PI,'度','',fmt(n.a)+' × 180 ÷ π']),
  K('図形2',['<SIN>{a}度?'], n=>[+Math.sin(n.a*PI/180).toFixed(12),'','','sin '+fmt(n.a)+'°']),
  K('図形2',['<COS>{a}度?'], n=>[+Math.cos(n.a*PI/180).toFixed(12),'','','cos '+fmt(n.a)+'°']),
  K('図形2',['<TAN>{a}度?'], n=>Math.abs(n.a%180)===90?R_err('tan 90° は 決まりません'):[+Math.tan(n.a*PI/180).toFixed(12),'','','tan '+fmt(n.a)+'°']),
  K('図形2',['高さ{h}<LU@u>?(で|、|と)?(距離|底辺|水平距離|横|よこ)(が)?{d}<LU>?(の)?(角度|傾き|仰角|勾配の角度|傾斜角|傾斜)'], n=>n.d?[Math.atan(n.h/n.d)*180/PI,'度','角度','atan('+fmt(n.h)+' ÷ '+fmt(n.d)+')']:R_err('距離が 0 です')),
  K('図形2',['縮尺{k}分の1(の地図|の図面|の模型)?(で|の|上で|上の)?{a}(センチ|cm)(は|の)?(実際|本当|ほんとう|実物|現地)(は|の長さは|の距離は|では|だと)?(何メートル|何キロ|どのくらい|の長さ|の距離)?'], n=>{ const m=n.a*n.k/100; return pOut(m,'m',{a:m>=1000?fmt(m/1000)+'km':fmt(m)+'m', say:(m>=1000?fmt(m/1000)+'キロ':fmt(m)+'メートル')+' です', f:fmt(n.a)+'cm × '+fmt(n.k)}); }),
  K('図形2',['(実際|本当|実物)?(の)?{a}(?<du>メートル|m|キロ|km)(は|を)?縮尺{k}分の1(の地図|の図面|の模型)?(で|では|だと|にすると|に書くと)(何センチ|何cm|どのくらい)?'], (n,g)=>n.k?[(/キロ|km/.test(g.du)?n.a*100000:n.a*100)/n.k,'cm','地図の上で',fmt(n.a)+g.du+' ÷ '+fmt(n.k)]:R_err('縮尺が 0 です')),
  K('図形2',['点{a}、{b}(と|、)点{c}、{d}(の|を結ぶ)?(間の)?(距離|長さ|線分の長さ)','2点{a}、{b}(と|、){c}、{d}(の|を結ぶ)?(間の)?(距離|長さ)'], n=>[Math.hypot(n.c-n.a,n.d-n.b),'','2点の距離','√(('+fmt(n.c)+' − '+fmt(n.a)+')² ＋ ('+fmt(n.d)+' − '+fmt(n.b)+')²)']),
  K('図形2',['点{a}、{b}(と|、)点{c}、{d}を(通る|結ぶ)直線の傾き','2点{a}、{b}(と|、){c}、{d}を(通る|結ぶ)直線の傾き'], n=>n.c!==n.a?[(n.d-n.b)/(n.c-n.a),'','傾き','('+fmt(n.d)+' − '+fmt(n.b)+') ÷ ('+fmt(n.c)+' − '+fmt(n.a)+')']:R_err('縦の 直線なので 傾きは 決まりません')),
  K('図形2',['点{a}、{b}(と|、)点{c}、{d}の中点','2点{a}、{b}(と|、){c}、{d}の中点'], n=>T('中点は '+fmt((n.a+n.c)/2)+'、'+fmt((n.b+n.d)/2)+' です','（'+fmt((n.a+n.c)/2)+', '+fmt((n.b+n.d)/2)+'）','それぞれの 平均')),
  K('図形2',['{h}時{m}分(の|のとき|のときの)?(時計の)?(長針と短針|短針と長針|針)(の|が作る|がつくる|の間の|のなす)?(間の)?(角度|角)','時計(が|の)?{h}時{m}分(のとき|のときの|の)?(長針と短針|針)?(の|が作る)?(角度|角)'], n=>{ let d=Math.abs(30*(n.h%12)-5.5*n.m)%360; if(d>180) d=360-d; return [d,'度','針の角度','|30 × '+fmt(n.h)+' − 5.5 × '+fmt(n.m)+'|']; }),
  // ── 図形：立体 ──
  K('図形2',['(1辺|1辺が|1辺の長さが|1辺の長さ){a}<LU@u>?(の)?(立方体|サイコロ)(の)?<HYOMEN>'], (n,g)=>[6*n.a*n.a,AU(g),'表面積','6 × '+fmt(n.a)+'²']),
  K('図形2',['(1辺|1辺が|1辺の長さが|1辺の長さ){a}<LU@u>?(の)?(立方体|サイコロ)(の)?<TAIKAKU>'], (n,g)=>[n.a*RT(3),LNU(g),'対角線',fmt(n.a)+' × √3']),
  K('図形2',['<TAISEKI>(が)?{v}(立方センチ|立方メートル|cm3|m3|㎥)?(の)?(立方体|サイコロ)(の)?(1辺|1辺の長さ|辺の長さ|辺)'], n=>[Math.cbrt(n.v),'','1辺','∛'+fmt(n.v)]),
  K('図形2',['(縦|たて){a}<LU@u>?(、|で|と)?(横|よこ){b}<LU>?(、|で|と)?(高さ|奥行き|奥行){c}<LU>?(の)?(直方体|箱|部屋)?(の)?<HYOMEN>'], (n,g)=>[2*(n.a*n.b+n.b*n.c+n.c*n.a),AU(g),'表面積','2 × ('+fmt(n.a)+'×'+fmt(n.b)+' ＋ '+fmt(n.b)+'×'+fmt(n.c)+' ＋ '+fmt(n.c)+'×'+fmt(n.a)+')']),
  K('図形2',['(縦|たて){a}<LU@u>?(、|で|と)?(横|よこ){b}<LU>?(、|で|と)?(高さ|奥行き|奥行){c}<LU>?(の)?(直方体|箱|部屋)?(の)?<TAIKAKU>'], (n,g)=>[RT(n.a*n.a+n.b*n.b+n.c*n.c),LNU(g),'対角線','√('+fmt(n.a)+'² ＋ '+fmt(n.b)+'² ＋ '+fmt(n.c)+'²)']),
  K('図形2',['(半径){r}<LU@u>?(、|で|と)?(高さ){h}<LU>?(の)?(円柱|円筒|缶)(の)?<HYOMEN>'], (n,g)=>[2*PI*n.r*n.r+2*PI*n.r*n.h,AU(g),'表面積','2π × '+fmt(n.r)+'² ＋ 2π × '+fmt(n.r)+' × '+fmt(n.h)]),
  K('図形2',['(半径){r}<LU@u>?(、|で|と)?(高さ){h}<LU>?(の)?(円柱|円筒|缶)(の)?<SOKUMEN>'], (n,g)=>[2*PI*n.r*n.h,AU(g),'側面積','2π × '+fmt(n.r)+' × '+fmt(n.h)]),
  K('図形2',['(半径){r}<LU@u>?(、|で|と)?(母線|ぼせん)(が)?{l}<LU>?(の)?(円すい|円錐)(の)?<HYOMEN>'], (n,g)=>[PI*n.r*n.r+PI*n.r*n.l,AU(g),'表面積','π × '+fmt(n.r)+'² ＋ π × '+fmt(n.r)+' × '+fmt(n.l)]),
  K('図形2',['(半径){r}<LU@u>?(、|で|と)?(母線|ぼせん)(が)?{l}<LU>?(の)?(円すい|円錐)(の)?<SOKUMEN>'], (n,g)=>[PI*n.r*n.l,AU(g),'側面積','π × '+fmt(n.r)+' × '+fmt(n.l)]),
  K('図形2',['(半径){r}<LU@u>?(、|で|と)?(高さ){h}<LU>?(の)?(円すい|円錐)(の)?(母線|ぼせん)(の長さ)?'], (n,g)=>[Math.hypot(n.r,n.h),LNU(g),'母線','√('+fmt(n.r)+'² ＋ '+fmt(n.h)+'²)']),
  K('図形2',['底面積(が)?{s}(平方センチ|平方メートル|㎡|cm2|m2)?(、|で|と)?高さ(が)?{h}<LU@u>?(の)?(角すい|角錐|すい体|錐体|ピラミッド|4角すい|4角錐|3角すい|3角錐|円すい|円錐)(の)?<TAISEKI>'], n=>[n.s*n.h/3,'','体積',fmt(n.s)+' × '+fmt(n.h)+' ÷ 3']),
  K('図形2',['底面積(が)?{s}(平方センチ|平方メートル|㎡|cm2|m2)?(、|で|と)?高さ(が)?{h}<LU@u>?(の)?(角柱|柱|柱体|円柱|4角柱|3角柱|立体)(の)?<TAISEKI>'], n=>[n.s*n.h,'','体積',fmt(n.s)+' × '+fmt(n.h)]),
  K('図形2',['(底面が)?(1辺|1辺が){a}<LU@u>?(の正方形)?(で|、|と)?高さ(が)?{h}<LU>?(の)?(正4角すい|正4角錐|4角すい|4角錐|ピラミッド)(の)?<TAISEKI>'], (n,g)=>[n.a*n.a*n.h/3,VU(g),'体積',fmt(n.a)+'² × '+fmt(n.h)+' ÷ 3']),
  K('図形2',['(直径|ちょっけい){d}<LU@u>?(の)?(球|ボール)(の)?<TAISEKI>'], (n,g)=>[4/3*PI*Math.pow(n.d/2,3),VU(g),'体積','4 ÷ 3 × π × '+fmt(n.d/2)+'³']),
  K('図形2',['(直径|ちょっけい){d}<LU@u>?(の)?(球|ボール)(の)?<HYOMEN>'], (n,g)=>[PI*n.d*n.d,AU(g),'表面積','π × '+fmt(n.d)+'²']),
  K('図形2',['(直径|ちょっけい){d}<LU@u>?(、|で|と)?(高さ){h}<LU>?(の)?(円柱|円筒|缶)(の)?<TAISEKI>'], (n,g)=>[PI*n.d*n.d/4*n.h,VU(g),'体積','π × '+fmt(n.d/2)+'² × '+fmt(n.h)]),
  K('図形2',['(半径){r}<LU@u>?(の)?半球(の)?<TAISEKI>'], (n,g)=>[2/3*PI*Math.pow(n.r,3),VU(g),'体積','2 ÷ 3 × π × '+fmt(n.r)+'³']),
  // ── 数の性質 ──
  K('数',['(マイナス|-|−){a}の絶対値','{a}の絶対値'], n=>[Math.abs(n.a),'','絶対値','']),
  K('数',['{a}の倍数(を|で|は)?(小さい方から|小さい順に|小さいほうから|はじめから|最初から)?{k}(個|つ)(書くと|言うと|あげると|挙げると)?'], n=>{ if(!isInt(n.k)||n.k<1||n.k>50) return R_err('50個までで 言ってください'); const xs=[]; for(let i=1;i<=n.k;i++) xs.push(fmt(n.a*i)); return T(fmt(n.a)+' の倍数は '+xs.join('、')+' です', xs.join(', '), fmt(n.a)+' × 1〜'+fmt(n.k)); }),
  K('数',['{a}から{b}まで(の間|の中|の整数)?(に|で|の|のうち)?(、)?{k}の倍数(は)?(何個|いくつ|何こ)(ある|あります|ありますか)?','{a}から{b}まで(に|で)?{k}で割り切れる(数|整数)(は)?(何個|いくつ)(ある)?'], n=>n.k?[Math.floor(n.b/n.k)-Math.floor((n.a-1)/n.k),'個','',fmt(n.k)+' の倍数']:R_err('0 の倍数は ありません')),
  K('数',['{a}(は|って){b}の倍数(ですか|か|なの|かな)?','{a}(は|って){b}で割り切れ(る|ます)(か|ますか|の|かな)?'], n=>{ if(!n.b) return R_err('0 では 割れません'); const ok=Math.abs(n.a/n.b-Math.round(n.a/n.b))<1e-12; return T(ok?'はい、'+fmt(n.a)+' は '+fmt(n.b)+' の倍数です':'いいえ、'+fmt(n.a)+' は '+fmt(n.b)+' の倍数ではありません', ok?'倍数です（'+fmt(n.a/n.b)+'倍）':'倍数ではありません（余り '+fmt(n.a%n.b)+'）', fmt(n.a)+' ÷ '+fmt(n.b)); }),
  K('数',['{a}(は|って)(偶数|奇数)(ですか|か|なの|かな|どっち)?','{a}(は|って)偶数(か)?奇数(か)?(どっち|どちら)?(ですか)?'], n=>isInt(n.a)?T(fmt(n.a)+' は '+(n.a%2?'奇数':'偶数')+' です', n.a%2?'奇数':'偶数', fmt(n.a)+' ÷ 2 の余り '+(n.a%2)):R_err('整数で 言ってください')),
  K('数',['{a}(の|を)素因数分解(すると|して|は)?'], n=>{ if(!isInt(n.a)||n.a<2||n.a>1e12) return R_err('2 以上の整数で 言ってください'); const f=pfac(n.a); return T(fmt(n.a)+' は '+f.map(([p,k])=>p+(k>1?'の'+k+'乗':'')).join(' かける ')+' です', f.map(([p,k])=>p+(k>1?SUP(k):'')).join(' × '), '素因数分解'); }),
  K('数',['{a}の約数の(個数|数)(は)?','{a}の約数は(何個|いくつ)(ある|ありますか)?'], n=>(isInt(n.a)&&n.a>=1&&n.a<=1e9)?[divs(n.a).length,'個','約数の個数','']:R_err('1 以上の整数で 言ってください')),
  K('数',['{a}の約数の(和|合計|総和)'], n=>(isInt(n.a)&&n.a>=1&&n.a<=1e9)?[divs(n.a).reduce((x,y)=>x+y,0),'','約数の和',divs(n.a).join(' ＋ ')]:R_err('1 以上の整数で 言ってください')),
  K('数',['{a}と{b}の公約数(は|を全部|全部|をすべて)?'], n=>{ const g0=gcd(n.a,n.b); if(!isInt(n.a)||!isInt(n.b)||!g0) return R_err('整数で 言ってください'); const xs=divs(g0); return T('公約数は '+xs.join('、')+' です', xs.join(', '), '最大公約数 '+g0+' の約数'); }),
  K('数',['{a}と{b}の公倍数(を|は)?(小さい方から|小さい順に|小さいほうから)?{k}(個|つ)','{a}と{b}の公倍数(は|を)?'], n=>{ const g0=gcd(n.a,n.b); if(!isInt(n.a)||!isInt(n.b)||!g0) return R_err('整数で 言ってください'); const l=n.a*n.b/g0, k=Math.min(n.k||3,30), xs=[]; for(let i=1;i<=k;i++) xs.push(fmt(l*i)); return T('公倍数は '+xs.join('、')+' です', xs.join(', ')+(n.k?'':' …'), '最小公倍数 '+fmt(l)+' の倍数'); }),
  K('数',['{a}番目の奇数','{a}個目の奇数'], n=>[2*n.a-1,'','','2 × '+fmt(n.a)+' − 1']),
  K('数',['{a}番目の偶数','{a}個目の偶数'], n=>[2*n.a,'','','2 × '+fmt(n.a)]),
  K('数',['{a}番目の(3角数|さんかくすう)'], n=>[n.a*(n.a+1)/2,'','',fmt(n.a)+' × ('+fmt(n.a)+' ＋ 1) ÷ 2']),
  K('数',['{a}番目の(平方数|4角数)'], n=>[n.a*n.a,'','',fmt(n.a)+'²']),
  K('数',['(フィボナッチ|フィボナッチ数列)(の)?(第)?{a}<KOU>'], n=>{ if(!isInt(n.a)||n.a<1||n.a>78) return R_err('1〜78 番目で 言ってください'); let a=1,b=1; for(let i=3;i<=n.a;i++){ [a,b]=[b,a+b]; } return [b,'','フィボナッチ数列の '+n.a+'番目','1, 1, 2, 3, 5, 8 …']; }),
  K('数',['{a}以下の素数(は|を全部|全部)?(何個|いくつ)?','{a}までの素数(は|を全部|全部)?(何個|いくつ)?'], n=>{ if(!isInt(n.a)||n.a<2||n.a>10000) return R_err('2〜10000 で 言ってください'); const xs=[]; for(let i=2;i<=n.a;i++){ let p=true; for(let j=2;j*j<=i;j++) if(i%j===0){ p=false; break; } if(p) xs.push(i); } return pOut(xs.length,'個',{a:xs.length+'個（'+(xs.length>30?xs.slice(0,30).join(', ')+' …':xs.join(', '))+'）', say:xs.length+'個 あります', f:n.a+' 以下の素数'}); }),
  K('数',['{a}の次の素数','{a}より大きい(最小の|いちばん小さい|一番小さい)?素数'], n=>{ if(!isInt(n.a)||n.a<0||n.a>1e9) return R_err('整数で 言ってください'); for(let x=Math.max(2,n.a+1);;x++){ let p=true; for(let j=2;j*j<=x;j++) if(x%j===0){ p=false; break; } if(p) return [x,'','次の素数','']; } }),
  // ── 和・数列 ──
  K('数列',['1から{k}まで(の整数|の数|の自然数)?(の|を)?(全部)?<DOWA>','1から{k}まで(を)?(全部)?(足す|足すと|足したら|たす|たすと|足して)'], n=>[n.k*(n.k+1)/2,'','',fmt(n.k)+' × ('+fmt(n.k)+' ＋ 1) ÷ 2']),
  K('数列',['{a}から{b}まで(の整数|の数)?(の|を)?(全部)?<DOWA>','{a}から{b}まで(を)?(全部)?(足す|足すと|足したら|たす|たすと|足して)'], n=>n.b>=n.a?[(n.a+n.b)*(n.b-n.a+1)/2,'','','('+fmt(n.a)+' ＋ '+fmt(n.b)+') × '+fmt(n.b-n.a+1)+' ÷ 2']:R_err('小さい 数から 言ってください')),
  K('数列',['1から{k}まで(の)?偶数(の|を)?(全部)?(<DOWA>|足すと|足す)'], n=>{ const m=Math.floor(n.k/2); return [m*(m+1),'','偶数の和','2 ＋ 4 ＋ … ＋ '+fmt(2*m)]; }),
  K('数列',['1から{k}まで(の)?奇数(の|を)?(全部)?(<DOWA>|足すと|足す)'], n=>{ const m=Math.ceil(n.k/2); return [m*m,'','奇数の和','1 ＋ 3 ＋ … ＋ '+fmt(2*m-1)]; }),
  K('数列',['1から{k}まで(の)?(2乗|平方)(の)?<DOWA>'], n=>[n.k*(n.k+1)*(2*n.k+1)/6,'','2乗の和','n(n＋1)(2n＋1) ÷ 6']),
  K('数列',['1から{k}まで(の)?(3乗|立方)(の)?<DOWA>'], n=>[Math.pow(n.k*(n.k+1)/2,2),'','3乗の和','(n(n＋1) ÷ 2)²']),
  K('数列',['1から{k}まで(の整数|の数)?(の|を)?(全部)?(積|かけた数|掛けた数|かけると|掛けると|かけ算)'], n=>okN(n.k)?[fact(n.k),'','',fmt(n.k)+'!']:R_err('170 までの 整数で 言ってください')),
  K('数列',['初項(が)?{a}(、|で|と)?公差(が)?(?<neg>マイナス|-|−)?{d}(の)?(等差数列)?(の)?(第)?{k}<KOU>'], (n,g)=>{ const d=g.neg?-n.d:n.d; return [n.a+(n.k-1)*d,'','第'+fmt(n.k)+'項',fmt(n.a)+' ＋ ('+fmt(n.k)+' − 1) × '+fmt(d)]; }),
  K('数列',['初項(が)?{a}(、|で|と)?公差(が)?(?<neg>マイナス|-|−)?{d}(の)?(等差数列)?(の)?(初項から)?(第)?{k}<KOU>まで(の)?<DOWA>','初項(が)?{a}(、|で|と)?公差(が)?(?<neg>マイナス|-|−)?{d}(の)?(等差数列)?(の)?(はじめの|最初の)?{k}(項|個)(の)?<DOWA>'], (n,g)=>{ const d=g.neg?-n.d:n.d; return [n.k*(2*n.a+(n.k-1)*d)/2,'','和',fmt(n.k)+' × (2 × '+fmt(n.a)+' ＋ ('+fmt(n.k)+' − 1) × '+fmt(d)+') ÷ 2']; }),
  K('数列',['初項(が)?{a}(、|で|と)?(末項|最後の項)(が)?{l}(、|で|と)?項数(が)?{k}(の)?(等差数列)?(の)?<DOWA>'], n=>[n.k*(n.a+n.l)/2,'','和',fmt(n.k)+' × ('+fmt(n.a)+' ＋ '+fmt(n.l)+') ÷ 2']),
  K('数列',['初項(が)?{a}(、|で|と)?公比(が)?{r}(の)?(等比数列)?(の)?(第)?{k}<KOU>'], n=>[n.a*Math.pow(n.r,n.k-1),'','第'+fmt(n.k)+'項',fmt(n.a)+' × '+fmt(n.r)+' ^ '+fmt(n.k-1)]),
  K('数列',['初項(が)?{a}(、|で|と)?公比(が)?{r}(の)?(等比数列)?(の)?(初項から)?(第)?{k}<KOU>まで(の)?<DOWA>','初項(が)?{a}(、|で|と)?公比(が)?{r}(の)?(等比数列)?(の)?(はじめの|最初の)?{k}(項|個)(の)?<DOWA>'], n=>[n.r===1?n.a*n.k:n.a*(Math.pow(n.r,n.k)-1)/(n.r-1),'','和',fmt(n.a)+' × ('+fmt(n.r)+' ^ '+fmt(n.k)+' − 1) ÷ ('+fmt(n.r)+' − 1)']),
  K('数列',['{a}(、|と){b}(、|と){c}(と)?(続く|つづく|と続く|とつづく)(等差)?数列(の)?(第)?{k}<KOU>'], n=>Math.abs((n.b-n.a)-(n.c-n.b))<1e-9?[n.a+(n.k-1)*(n.b-n.a),'','第'+fmt(n.k)+'項','公差 '+fmt(n.b-n.a)]:((n.a&&n.b&&Math.abs(n.b/n.a-n.c/n.b)<1e-9)?[n.a*Math.pow(n.b/n.a,n.k-1),'','第'+fmt(n.k)+'項','公比 '+fmt(n.b/n.a)]:R_err('等差でも 等比でも ない 並びです'))),
  // ── 場合の数・確率 ──
  K('場合の数',['{a}(個|人|つ|枚|本|冊|色|種類|チーム)?(の中|のうち)?から{r}(個|人|つ|枚|本|冊|色|種類)?(を)?(選んで|取って|とって|選び)?(1列に|一列に|順に|順番に)?(並べる|並べた|ならべる)(ときの)?(順列|並べ方|ならべ方|方法|場合の数)?(は|の数は)?<NANTORI>?','{a}(P|ピー){r}','順列{a}(の|から|P){r}'], n=>(okN(n.a,n.r)&&n.r<=n.a)?[nPr(n.a,n.r),'通り','',fmt(n.a)+'P'+fmt(n.r)]:R_err('数が 合いません')),
  K('場合の数',['{a}(個|人|つ|枚|本|冊|色|種類|チーム)?(の中|のうち)?から{r}(個|人|つ|枚|本|冊|色|種類)?(を)?(選ぶ|選んだ|取る|とる|取り出す|とり出す|選び出す)(ときの)?(組み合わせ|組合せ|選び方|方法|場合の数|取り方|とり方)?(は|の数は)?<NANTORI>?','{a}(C|シー|コンビネーション){r}','組み合わせ{a}(の|から|C){r}'], n=>(okN(n.a,n.r)&&n.r<=n.a)?[nCr(n.a,n.r),'通り','',fmt(n.a)+'C'+fmt(n.r)]:R_err('数が 合いません')),
  K('場合の数',['{a}(人|個|つ|枚|冊|本|文字|色)(を|が|の)?(全員|全部|すべて)?(1列に|一列に|横1列に|順番に|順に)?(並ぶ|並べる|ならぶ|ならべる)(ときの)?(並び方|並べ方|方法|順番|場合の数)?(は|の数は)?<NANTORI>?','{a}(人|個|つ|枚|冊|本|文字|色)の(並び方|並べ方|並び順|順番)(は)?<NANTORI>?'], n=>okN(n.a)?[fact(n.a),'通り','',fmt(n.a)+'!']:R_err('170 までで 言ってください')),
  K('場合の数',['{a}(人|個)(が|を|の)?(円卓|円形|輪|まるく|丸く|円|丸テーブル)(に|で|の形に|になって)?(座る|すわる|並ぶ|並べる|ならぶ)(ときの)?(座り方|並び方|並べ方|方法|場合の数)?(は)?<NANTORI>?','{a}(人|個)の円順列'], n=>(okN(n.a)&&n.a>=1)?[fact(n.a-1),'通り','円順列','('+fmt(n.a)+' − 1)!']:R_err('数が 合いません')),
  K('場合の数',['{a}(チーム|人|校|組|クラス)(の|で|が)?(総当たり|総当り|リーグ戦|総あたり)(戦)?(の|をすると|すると|だと)?(試合数|試合|何試合|対戦数)(は)?'], n=>okN(n.a)?[nCr(n.a,2),'試合','総当たり',fmt(n.a)+'C2']:R_err('数が 合いません')),
  K('場合の数',['{a}(チーム|人|校|組|クラス)(の|で|が)?(トーナメント|勝ち抜き|勝ち抜き戦|トーナメント戦)(の|をすると|すると|だと)?(試合数|試合|何試合|対戦数)(は)?'], n=>[Math.max(0,n.a-1),'試合','トーナメント',fmt(n.a)+' − 1']),
  K('場合の数',['{a}人(全員)?(が|で)?(全員と|お互いに|たがいに|互いに|みんなと)?(1回ずつ)?握手(する|をする|すると|したら)(と)?(何回|回数|の回数)?'], n=>okN(n.a)?[nCr(n.a,2),'回','握手',fmt(n.a)+'C2']:R_err('数が 合いません')),
  K('場合の数',['(サイコロ|さいころ)(を)?{k}(個|回|つ)(振る|ふる|投げる|振った|ふった|投げた|振って|ふって|投げて)(ときの|時の|と)?(目の)?(出方|出かた|場合の数)(は)?<NANTORI>?'], n=>[Math.pow(6,n.k),'通り','','6 ^ '+fmt(n.k)]),
  K('場合の数',['(コイン|硬貨|10円玉|100円玉)(を)?{k}(枚|回|個)(投げる|投げた|投げて|ふる)(ときの|時の|と)?(表裏の|表と裏の|裏表の)?(出方|出かた|場合の数)(は)?<NANTORI>?'], n=>[Math.pow(2,n.k),'通り','','2 ^ '+fmt(n.k)]),
  K('場合の数',['{a}(種類|通り|色|個|枚|着)(と|、|の上着と|のシャツと){b}(種類|通り|色|個|枚|着)(と|、)?({c}(種類|通り|色|個|枚|着))?(の|を)?(組み合わせ|組合せ|選び方|コーディネート|組み合わせ方)(は)?<NANTORI>?'], n=>[n.a*n.b*(n.c||1),'通り','',fmt(n.a)+' × '+fmt(n.b)+(n.c?' × '+fmt(n.c):'')]),
  K('確率',['(コイン|硬貨)(を)?{k}(回|枚)(投げて|投げたとき|投げると|ふって)(、)?(全部|すべて|ぜんぶ|毎回|{k2}(回|枚)とも)?(表|裏)(が出る|になる|の)?<KAKURITSU>'], n=>pOut(Math.pow(0.5,n.k)*100,'%',{a:'1/'+fmt(Math.pow(2,n.k))+'（'+fmt(Math.pow(0.5,n.k)*100)+'%）', say:fmt(Math.pow(2,n.k))+'分の1 です', f:'(1/2) ^ '+fmt(n.k)})),
  K('確率',['(サイコロ|さいころ)(を)?{k}(回|個)(振って|ふって|投げて|振ったとき|振ると)(、)?(全部|すべて|ぜんぶ|毎回|続けて|連続で)?(同じ目|{j}|{j2}の目)(が出る|になる|が続く|の)?<KAKURITSU>'], (n,g)=>{ const same=/同じ目/.test(g.__m), e=same?n.k-1:n.k; return pOut(Math.pow(1/6,e)*100,'%',{a:'1/'+fmt(Math.pow(6,e))+'（'+fmt(Math.pow(1/6,e)*100)+'%）', say:fmt(Math.pow(6,e))+'分の1 です', f:'(1/6) ^ '+fmt(e)}); }),
  K('確率',['(サイコロ|さいころ)(を)?(2個|2つ|2回)(振って|ふって|投げて|振ったとき|振ると)?(、)?(出た)?(目の)?(和|合計)(が)?{s}(になる|の|である)?<KAKURITSU>','2(個|つ)の(サイコロ|さいころ)の(目の)?(和|合計)が{s}(になる|の)?<KAKURITSU>'], n=>{ let c=0; for(let i=1;i<=6;i++) for(let j=1;j<=6;j++) if(i+j===n.s) c++; const [p,q]=fracRed(c,36); return pOut(c/36*100,'%',{a:(c?p+'/'+q:'0')+'（'+fmt(c/36*100)+'%）', say:c?q+'分の'+p+' です':'0 です', f:c+'通り ÷ 36通り'}); }),
  K('確率',['{a}(本|枚|個|人|回)(中|のうち|の中に|の中で){k}(本|枚|個|人|回)(が|は)?(当たり|あたり|当選|アタリ)(の|が入った)?(くじ|クジ|抽選|ガチャ|福引)?(を|で|から)?(1本|1枚|1個|1回)?(引いて|ひいて|引くと|引いたとき)?(当たる|あたる|当選する|の)?<KAKURITSU>'], n=>n.a?pOut(n.k/n.a*100,'%',{a:fracRed(n.k,n.a).join('/')+'（'+fmt(n.k/n.a*100)+'%）', say:fmt(n.k/n.a*100)+'パーセント です', f:fmt(n.k)+' ÷ '+fmt(n.a)}):R_err('0 では割れません')),
  K('確率',['(確率)?{p}<PCT>(のもの|のこと|のガチャ|のくじ|の当たり|のアタリ)?(を|が|で)?{k}回(引いて|ひいて|引くと|やって|やると|回して|回すと|試して|試すと|挑戦して|挑戦すると|で)(、)?(少なくとも|最低)?(1回|1度|一度)(は|以上)?(当たる|あたる|出る|起こる|成功する|引ける)(の)?<KAKURITSU>','{p}<PCT>(を|が)?{k}回(で|引いて|やって)(1回も|一度も)(当たらない|出ない|外れる|起こらない)<KAKURITSU>'], (n,g,t)=>{ const miss=Math.pow(1-n.p/100,n.k), no=/1回も|一度も/.test(t); return [(no?miss:1-miss)*100,'%',no?'1回も 当たらない 確率':'少なくとも 1回 当たる 確率',no?'(1 − '+fmt(n.p)+'%) ^ '+fmt(n.k):'1 − (1 − '+fmt(n.p)+'%) ^ '+fmt(n.k)]; }),
  K('確率',['{a}円?が(確率)?{p}<PCT>(の確率)?(で)?(当たる|あたる|もらえる|出る)(くじ|クジ|ゲーム|ガチャ|抽選|賭け|かけ)?(の)?(期待値|きたいち)','(期待値|きたいち)(は)?(確率)?{p}<PCT>で{a}円?(だと|なら|の)?'], n=>[n.a*n.p/100,'円','期待値',yen(n.a)+' × '+fmt(n.p)+'%']),
  K('確率',['{a}人(の)?クラス(で|に|の中に)?(同じ)?誕生日(が同じ|の同じ)?(人|2人|ペア)(が)?(いる|いる確率|がいる確率)(確率)?','{a}人(で|の中に|いて)(同じ)?誕生日が(同じ|かぶる|重なる)(人がいる)?<KAKURITSU>'], n=>{ if(!isInt(n.a)||n.a<1) return R_err('人数を 整数で 言ってください'); let q=1; for(let i=0;i<Math.min(n.a,366);i++) q*=(365-i)/365; if(n.a>365) q=0; return [(1-q)*100,'%','同じ誕生日の人がいる確率','1 − 365P'+n.a+' ÷ 365^'+n.a]; }),
  // ── 分数・小数・比 ──
  K('分数',['{d}分の{k}(を|は|って)?(小数|しょうすう)(に|で|では)?(すると|直すと|直して|なおすと|表すと|する|いくつ)?'], n=>n.d?[n.k/n.d,'','',fmt(n.k)+' ÷ '+fmt(n.d)]:R_err('分母が 0 です')),
  K('分数',['{d}分の{k}(を|は|って)?(何<PCT>|百分率|100分率|パーセントで|パーセントに直すと|%で|%に直すと)(ですか)?'], n=>n.d?[n.k/n.d*100,'%','',fmt(n.k)+' ÷ '+fmt(n.d)+' × 100']:R_err('分母が 0 です')),
  K('分数',['{d}分の{k}(を|の)?約分(すると|して|する)?'], n=>{ if(!isInt(n.d)||!isInt(n.k)||!n.d) return R_err('整数で 言ってください'); const [p,q]=fracRed(n.k,n.d); return T(q===1?fmt(p)+' です':q+'分の'+p+' です', q===1?fmt(p):p+'/'+q, '最大公約数 '+gcd(n.k,n.d)+' で割る'); }),
  K('分数',['{d}分の{k}(を|は)?帯分数(に|で)?(すると|直すと|直して|する)?'], n=>{ if(!isInt(n.d)||!isInt(n.k)||!n.d) return R_err('整数で 言ってください'); const w=Math.floor(n.k/n.d), r=n.k-w*n.d; return T(r?(w?w+'と':'')+n.d+'分の'+r+' です':fmt(w)+' です', r?(w?w+'と ':'')+r+'/'+n.d:fmt(w), fmt(n.k)+' ÷ '+fmt(n.d)+' ＝ '+w+' 余り '+r); }),
  K('分数',['{w}と{d}分の{k}(を|は)?仮分数(に|で)?(すると|直すと|直して|する)?'], n=>T(n.d+'分の'+(n.w*n.d+n.k)+' です', (n.w*n.d+n.k)+'/'+n.d, fmt(n.w)+' × '+fmt(n.d)+' ＋ '+fmt(n.k))),
  K('分数',['{x}(を|は|って)?分数(に|で|では)?(すると|直すと|直して|なおすと|表すと|する)?'], n=>{ const [p,q]=toFrac(n.x); return T(q===1?fmt(p)+' です':q+'分の'+p+' です', q===1?fmt(p):p+'/'+q, fmt(n.x)); }),
  K('分数',['{d}分の{k}と{e}分の{j}(は|では|の)?<DOCCHI>(が)?(大きい|小さい)(ですか|か)?'], (n,g,t)=>{ const a=n.k/n.d, b=n.j/n.e, big=!/小さい/.test(t), w=(a===b)?null:((a>b)===big?n.d+'分の'+n.k:n.e+'分の'+n.j); return T(w?w+' のほうが '+(big?'大きい':'小さい')+' です':'同じ大きさです', w?w.replace(/(\d+)分の(\d+)/,'$2/$1')+'（'+fmt(a)+' と '+fmt(b)+'）':'同じ', fmt(a)+' と '+fmt(b)); }),
  K('分数',['{d}分の{k}と{e}分の{j}(を|の)?通分(すると|して|する)?'], n=>{ if(![n.d,n.k,n.e,n.j].every(isInt)||!n.d||!n.e) return R_err('整数で 言ってください'); const l=n.d*n.e/gcd(n.d,n.e); return T(l+'分の'+(n.k*l/n.d)+' と '+l+'分の'+(n.j*l/n.e)+' です', (n.k*l/n.d)+'/'+l+' と '+(n.j*l/n.e)+'/'+l, '分母を '+l+' に そろえる'); }),
  K('分数',['{x}(を|は|って)?(何<PCT>|百分率で|100分率で|パーセントで|パーセントに直すと|%に直すと)(ですか)?'], n=>n.x<=20?[n.x*100,'%','',fmt(n.x)+' × 100']:null),
  K('分数',['{p}<PCT>(を|は|って)?(小数|しょうすう)(に|で|では)?(すると|直すと|直して|なおすと|表すと|する)?'], n=>[n.p/100,'','',fmt(n.p)+' ÷ 100']),
  K('分数',['{p}<PCT>(を|は|って)?分数(に|で|では)?(すると|直すと|直して|なおすと|表すと|する)?'], n=>{ const [a,b]=toFrac(n.p/100); return T(b+'分の'+a+' です', a+'/'+b, fmt(n.p)+' ÷ 100'); }),
  K('分数',['{x}(を|は|って)?歩合(に|で|では)?(すると|直すと|直して|表すと|する)?'], n=>{ const v=Math.round(n.x*1000), w=Math.floor(v/100), b=Math.floor(v%100/10), r=v%10; return T((w?w+'割':'')+(b?b+'分':'')+(r?r+'厘':'')+' です', (w?w+'割':'')+(b?b+'分':'')+(r?r+'厘':'')||'0', fmt(n.x)); }),
  K('分数',['{a}(対|:){b}(を|の比を)?(もっとも|最も|いちばん|一番)?(簡単な|かんたんな)(整数の)?比(に|で)?(すると|直すと|直して|する)?','{a}(対|:){b}(を|の)?(約分|簡単に)(すると|して|する)?'], n=>{ let a=n.a, b=n.b, k=1; while((!isInt(a*k)||!isInt(b*k)) && k<1e6) k*=10; a=Math.round(a*k); b=Math.round(b*k); const g0=gcd(a,b)||1; return T((a/g0)+' 対 '+(b/g0)+' です', (a/g0)+' : '+(b/g0), '最大公約数で割る'); }),
  K('分数',['{a}(対|:){b}(の)?比の値'], n=>n.b?[n.a/n.b,'','比の値',fmt(n.a)+' ÷ '+fmt(n.b)]:R_err('0 では割れません')),
  K('分数',['{a}(人|個|点|問|本|枚|回|台|件|票)(中|のうち|の中で|の中の){b}(人|個|点|問|本|枚|回|台|件|票)(は|って|が)?(全体の)?(何<PCT>|何割|割合|の割合)(ですか)?'], (n,g,t)=>n.a?(/何割/.test(t)?[n.b/n.a*10,'割','',fmt(n.b)+' ÷ '+fmt(n.a)]:[n.b/n.a*100,'%','',fmt(n.b)+' ÷ '+fmt(n.a)]):R_err('0 では割れません')),
  K('分数',['{a}打数{b}安打(の)?(打率)?'], n=>n.a?pOut(n.b/n.a,'',{a:'打率 '+(n.b/n.a).toFixed(3).replace(/^0/,''), say:'打率は '+(n.b/n.a).toFixed(3)+' です', f:fmt(n.b)+' ÷ '+fmt(n.a)}):R_err('0打数です')),
  K('分数',['{w}勝{l}敗({d}(分|引き分け|分け))?(の)?(勝率)'], n=>(n.w+n.l)?pOut(n.w/(n.w+n.l),'',{a:'勝率 '+(n.w/(n.w+n.l)).toFixed(3).replace(/^0/,''), say:'勝率は '+(n.w/(n.w+n.l)).toFixed(3)+' です', f:fmt(n.w)+' ÷ ('+fmt(n.w)+' ＋ '+fmt(n.l)+')'}):R_err('試合が ありません')),
  K('分数',['{a}問(中|のうち){b}問(正解|せいかい|合って|あって|できた|できて)(の|で|した|だと|いたら)?(正答率|正解率|得点率|何<PCT>|何点)?','(正答率|正解率)(は)?{a}問(中|のうち){b}問(正解)?'], n=>n.a?[n.b/n.a*100,'%','正答率',fmt(n.b)+' ÷ '+fmt(n.a)]:R_err('0問です')),
  K('分数',['1問{p}点(で|の|、)?{k}問(正解|せいかい|合って|できた|できて)(すると|したら|だと|の|で|いたら)?(何点|の得点|得点|点数)?','{k}問(正解|せいかい)(で|、)?1問{p}点(だと|なら|の)?(何点|の得点|得点|点数)?'], n=>[n.p*n.k,'点','',fmt(n.p)+'点 × '+fmt(n.k)+'問']),
  // ── 文章題 ──
  K('文章題',['(鶴|つる|ツル)と(亀|かめ|カメ)(が)?(合わせて|あわせて|全部で|合計)?{k}(匹|羽|頭|ひき)?(いて|で|、|いる)?(、)?足(の数|の本数)?(が|は)?(全部で|合わせて|合計)?{f}本(のとき|だと|なら|ある)?(、)?(鶴|つる|亀|かめ)?(は)?(それぞれ)?(何匹|何羽|何頭)?','(鶴亀算|つるかめ算)(で)?(頭|頭数|合わせて)?{k}(匹|羽|頭)?(、|で)?足(が)?{f}本'], n=>{ const kame=(n.f-2*n.k)/2, tsuru=n.k-kame; return (isInt(kame)&&kame>=0&&tsuru>=0)?pOut(kame,'匹',{a:'亀 '+fmt(kame)+'匹 ／ 鶴 '+fmt(tsuru)+'羽', say:'亀は '+fmt(kame)+'匹、鶴は '+fmt(tsuru)+'羽 です', f:'('+fmt(n.f)+' − 2 × '+fmt(n.k)+') ÷ 2'}):R_err('その 数では 合いません'); }),
  K('文章題',['(和|合計|足した数)が{s}(で|、)?(差|ちがい|違い|引いた数)が{d}(の|になる|である)?(2つの数|2数|2つの整数|ふたつの数)(は)?','(和差算)(で)?(和|合計)(が)?{s}(、|で)?(差)(が)?{d}'], n=>pOut((n.s+n.d)/2,'',{a:fmt((n.s+n.d)/2)+' と '+fmt((n.s-n.d)/2), say:fmt((n.s+n.d)/2)+' と '+fmt((n.s-n.d)/2)+' です', f:'('+fmt(n.s)+' ± '+fmt(n.d)+') ÷ 2'})),
  K('文章題',['(和|合計)が{s}(で|、)?(積|かけた数|掛けた数)が{p}(の|になる|である)?(2つの数|2数|2つの整数|ふたつの数)(は)?'], n=>{ const q=n.s*n.s-4*n.p; if(q<0) return R_err('そのような 実数は ありません'); const a=(n.s+RT(q))/2, b=(n.s-RT(q))/2; return pOut(a,'',{a:fmt(a)+' と '+fmt(b), say:fmt(a)+' と '+fmt(b)+' です', f:'x² − '+fmt(n.s)+'x ＋ '+fmt(n.p)+' ＝ 0'}); }),
  K('文章題',['{l}<MTR>(の道|の道路|の直線|の間|の道の片側)?(に|で)?(、)?{d}<MTR>(おき|ごと|間隔|間かく)(に|で)?(木|旗|はた|くい|杭|電柱|街灯|花|ポール|苗)?(を)?(両端にも|端から端まで|はしからはしまで)?(植える|立てる|たてる|置く|並べる|うえる)(と|には|とき)?(、)?(木|旗|くい|電柱)?(は)?(何本|なんぼん|本数|何個|いくつ)(必要|いる)?','植木算(で)?{l}<MTR>(に|を)?{d}<MTR>(おき|ごと|間隔)'], n=>n.d?[n.l/n.d+1,'本','両端にも 植える',fmt(n.l)+' ÷ '+fmt(n.d)+' ＋ 1']:R_err('間隔が 0 です')),
  K('文章題',['(周り|まわり|1周|周囲|円周)(が)?{l}<MTR>(の)?(池|公園|円|グラウンド|土地|広場|花だん|花壇|湖)(の)?(周り|まわり|周囲)?(に|で)?(、)?{d}<MTR>(おき|ごと|間隔|間かく)(に|で)?(木|旗|はた|くい|杭|電柱|街灯|花|ポール|苗)?(を)?(植える|立てる|たてる|置く|並べる|うえる)(と|には|とき)?(、)?(木|旗|くい)?(は)?(何本|なんぼん|本数|何個|いくつ)(必要|いる)?'], n=>n.d?[n.l/n.d,'本','周りに 植える',fmt(n.l)+' ÷ '+fmt(n.d)]:R_err('間隔が 0 です')),
  K('文章題',['(1人で|ひとりで)?{a}(?<tu>日|時間|分)(かかる|で終わる|でできる|でおわる)?(人|仕事)?(と|、){b}(日|時間|分)(かかる|で終わる|でできる|でおわる)(人|仕事|作業)?(が|を)?(2人|ふたり|二人|一緒|いっしょ|協力)(で|に|して)?(やると|すると|したら|やったら|仕事をすると|働くと|作業すると)?(何日|何時間|何分)?(かかる|で終わる)?','仕事算(で)?{a}(?<tu>日|時間|分)と{b}(日|時間|分)'], (n,g)=>(n.a+n.b)?[n.a*n.b/(n.a+n.b),g.tu,'2人で',fmt(n.a)+' × '+fmt(n.b)+' ÷ ('+fmt(n.a)+' ＋ '+fmt(n.b)+')']:R_err('0 では割れません')),
  K('文章題',['{d}(?<du>キロ|km|メートル|m)(離れた|はなれた)(2人|ふたり|2地点から|2つの地点から|所から)(が)?(、)?(?<sp>時速|分速|秒速){a}(キロ|km|メートル|m)?(と|、)(時速|分速|秒速)?{b}(キロ|km|メートル|m)?(で)?(向かい合って|むかいあって|近づくと|近づいて|お互いに向かって|同時に出発して|同時に向かい合って)?(進むと|歩くと|進んで|歩いて|出発すると|出発して)?(、)?(出会う|会う|であう)(のは|まで)?(何時間後|何分後|何秒後|いつ|何時間|何分)?'], (n,g)=>(n.a+n.b)?[n.d/(n.a+n.b),g.sp==='時速'?'時間':g.sp==='分速'?'分':'秒','出会うまで',fmt(n.d)+' ÷ ('+fmt(n.a)+' ＋ '+fmt(n.b)+')']:R_err('速さが 0 です')),
  K('文章題',['{d}(?<du>キロ|km|メートル|m)(先|前|さき)(を|に|の)(?<sp>時速|分速|秒速){a}(キロ|km|メートル|m)?(で)?(進む|歩く|走る|行く)(人|弟|妹|相手|子)?(を|に)(、)?(時速|分速|秒速)?{b}(キロ|km|メートル|m)?(で)?(追いかける|おいかける|追う)(と)?(、)?(追いつく|おいつく)?(のは|まで)?(何時間後|何分後|何秒後|いつ|何時間|何分)?'], (n,g)=>n.b>n.a?[n.d/(n.b-n.a),g.sp==='時速'?'時間':g.sp==='分速'?'分':'秒','追いつくまで',fmt(n.d)+' ÷ ('+fmt(n.b)+' − '+fmt(n.a)+')']:R_err('追いかける ほうが 速く ないと 追いつけません')),
  K('文章題',['(行き|往き|いき)(は|が)?(時速)?{a}(キロ|km)?(、|で)?(帰り|かえり)(は|が)?(時速)?{b}(キロ|km)?(の|のとき|のときの|で往復したときの)?(平均の速さ|平均時速|平均速度|往復の平均|平均)'], n=>(n.a+n.b)?[2*n.a*n.b/(n.a+n.b),'km/時','平均の速さ','2 × '+fmt(n.a)+' × '+fmt(n.b)+' ÷ ('+fmt(n.a)+' ＋ '+fmt(n.b)+')']:R_err('速さが 0 です')),
  K('文章題',['(静水時|静水|静水での|船|ボート)(の速さ)?(が|は)?(時速)?{v}(キロ|km)?(、|で)?(川|流れ|川の流れ)(の速さ)?(が|は)?(時速)?{c}(キロ|km)?(の|のとき|のときの)?(?<dir>上り|下り|のぼり|くだり)(の速さ|の時速)?'], (n,g)=>{ const up=/上|のぼ/.test(g.dir); return [up?n.v-n.c:n.v+n.c,'km/時',up?'上りの速さ':'下りの速さ',fmt(n.v)+(up?' − ':' ＋ ')+fmt(n.c)]; }),
  K('文章題',['(長さ)?{l}<MTR>の(電車|列車|新幹線)(が)?(、)?(?<sp>秒速|時速){v}(メートル|m|キロ|km)?(で)?(、)?(長さ)?{b}<MTR>の(鉄橋|橋|トンネル|ホーム)(を)?(渡る|わたる|通る|通過する|通り抜ける|ぬける|抜ける)(のに|には|とき)?(かかる時間|何秒|何秒かかる|時間)?'], (n,g)=>{ const v=g.sp==='時速'?n.v*1000/3600:n.v; return v?[(n.l+n.b)/v,'秒','通過する時間','('+fmt(n.l)+' ＋ '+fmt(n.b)+') ÷ '+fmt(v)]:R_err('速さが 0 です'); }),
  K('文章題',['1人(に)?{a}個(ずつ)?(配る|くばる|分ける|わける)と{x}個(余り|あまり|余って|あまって|余る|あまる)(、|で)?(1人(に)?)?{b}個(ずつ)?(配る|くばる|分ける|わける|だ)?と{y}個(足りない|たりない|不足|足りなく|不足する)(なる)?(とき|ときの|。)?(、)?(人数|何人|個数|何個)?(は)?'], n=>{ if(n.b<=n.a) return R_err('数が 合いません'); const p=(n.x+n.y)/(n.b-n.a); return pOut(p,'人',{a:fmt(p)+'人 ／ '+fmt(n.a*p+n.x)+'個', say:'人数は '+fmt(p)+'人、個数は '+fmt(n.a*p+n.x)+'個 です', f:'('+fmt(n.x)+' ＋ '+fmt(n.y)+') ÷ ('+fmt(n.b)+' − '+fmt(n.a)+')'}); }),
  K('文章題',['(今|いま|現在)?(父|お父さん|母|お母さん|親)(は|が)?{a}(歳|才)(、|で)?(子|子ども|子供|こども|息子|娘|私|ぼく|僕)(は|が)?{b}(歳|才)(のとき|です|で|。)?(、)?(父|お父さん|母|お母さん|親)(の年齢)?が(子|子ども|子供|こども|息子|娘|私|ぼく|僕)(の年齢)?の{k}倍(になる|だった|である)(のは)?(何年後|何年前|いつ)?'], n=>{ if(n.k===1) return R_err('1倍には なりません'); const x=(n.a-n.k*n.b)/(n.k-1); return pOut(Math.abs(x),'年',{a:fmt(Math.abs(x))+(x>=0?'年後':'年前'), say:fmt(Math.abs(x))+(x>=0?'年後':'年前')+' です', f:'('+fmt(n.a)+' − '+fmt(n.k)+' × '+fmt(n.b)+') ÷ ('+fmt(n.k)+' − 1)'}); }),
  K('文章題',['{k}(人|回|個|科目|教科|日|試合)の(平均|平均点)(が|は)?{a}(点|円|個|キロ|kg|センチ|cm|回)?(のとき|の|だと|なら)?(の)?(合計|合計点|総和|全部で)(は)?'], n=>[n.k*n.a,'','合計',fmt(n.a)+' × '+fmt(n.k)]),
  K('文章題',['{k}(人|回|個|科目|教科)の(平均|平均点)(が|は)?{a}点?(で|、)?{m}(人|回|個|科目|教科)の(平均|平均点)(が|は)?{b}点?(のとき|の|だと|なら)?(の)?(全体|全員|合わせた|全部)(の)?(平均|平均点)(は)?'], n=>(n.k+n.m)?[(n.k*n.a+n.m*n.b)/(n.k+n.m),'','全体の平均','('+fmt(n.a)+' × '+fmt(n.k)+' ＋ '+fmt(n.b)+' × '+fmt(n.m)+') ÷ '+fmt(n.k+n.m)]:R_err('0 では割れません')),
  K('文章題',['{k}(回|科目|教科|試合)の(平均|平均点)(が|は)?{a}点?(で|、)?(次|つぎ|もう1回|あと1回|{j}回目|次のテスト)(に|で|は)?{b}点?(を)?(取る|とる|取った|とった|だ)(と|ら|とき)(の)?(平均|平均点)(は)?'], n=>[(n.k*n.a+n.b)/(n.k+1),'','平均','('+fmt(n.a)+' × '+fmt(n.k)+' ＋ '+fmt(n.b)+') ÷ '+fmt(n.k+1)]),
  K('文章題',['{k}(回|科目|教科|試合)の(平均|平均点)(が|は)?{a}点?(で|、)?(次|つぎ|もう1回|あと1回|次のテスト)(で|に)?(平均|平均点)(を)?{t}点?(に|以上に)?(する|したい|上げる|あげる|なる)(には|ためには|のに)(、)?(何点)?(取れば|とれば|必要|取ればいい)?'], n=>[n.t*(n.k+1)-n.a*n.k,'点','必要な点',fmt(n.t)+' × '+fmt(n.k+1)+' − '+fmt(n.a)+' × '+fmt(n.k)]),
  K('文章題',['y(は)?xに比例(し|して|する)(、)?x(が|=|イコール)?{a}のときy(が|=|イコール)?{b}(、|で|。|です)?x(が|=|イコール)?{c}のとき(の)?y(は|の値は|の値)?','比例(で|の関係で)?x(が)?{a}(のとき)?y(が)?{b}(、|で)?x(が)?{c}(のとき)?(の)?y'], n=>n.a?[n.b*n.c/n.a,'','y','y ＝ '+fmt(n.b/n.a)+'x']:R_err('x が 0 です')),
  K('文章題',['y(は)?xに反比例(し|して|する)(、)?x(が|=|イコール)?{a}のときy(が|=|イコール)?{b}(、|で|。|です)?x(が|=|イコール)?{c}のとき(の)?y(は|の値は|の値)?','反比例(で|の関係で)?x(が)?{a}(のとき)?y(が)?{b}(、|で)?x(が)?{c}(のとき)?(の)?y'], n=>n.c?[n.a*n.b/n.c,'','y','y ＝ '+fmt(n.a*n.b)+' ÷ x']:R_err('x が 0 です')),
  K('文章題',['傾き(が)?(?<na>マイナス|-|−)?{a}(、|で|と)?切片(が)?(?<nb>マイナス|-|−)?{b}(の)?(直線|1次関数|グラフ|式)?(で|の|において)?(、)?x(が|=|イコール)?(?<nc>マイナス|-|−)?{c}のとき(の)?y(は|の値は|の値)?'], (n,g)=>{ const a=g.na?-n.a:n.a, b=g.nb?-n.b:n.b, c=g.nc?-n.c:n.c; return [a*c+b,'','y','y ＝ '+fmt(a)+'x '+(b<0?'− '+fmt(-b):'＋ '+fmt(b))]; }),
  K('文章題',['(2次方程式)?(a|A|エー)(が|=|は)?(?<na>マイナス|-|−)?{a}(、|で|と)?(b|B|ビー)(が|=|は)?(?<nb>マイナス|-|−)?{b}(、|で|と)?(c|C|シー)(が|=|は)?(?<nc>マイナス|-|−)?{c}(の)?(判別式|はんべつしき|D)'], (n,g)=>{ const a=g.na?-n.a:n.a, b=g.nb?-n.b:n.b, c=g.nc?-n.c:n.c, d=b*b-4*a*c; return pOut(d,'',{a:'D ＝ '+fmt(d)+'（'+(d>0?'実数の解が 2つ':d===0?'重解':'実数の解なし')+'）', say:'判別式は '+fmt(d)+' です', f:'b² − 4ac'}); }),
  // ── 統計 ──
  K('統計',['{*L}(の)<CHUO>'], (n,g)=>{ const xs=pList(g.L).sort((a,b)=>a-b), m=xs.length; return [m%2?xs[(m-1)/2]:(xs[m/2-1]+xs[m/2])/2,'','中央値',xs.join(', ')]; }),
  K('統計',['{*L}(の)<SAIHIN>'], (n,g)=>{ const xs=pList(g.L), c={}; xs.forEach(x=>c[x]=(c[x]||0)+1); const mx=Math.max(...Object.values(c)), ms=Object.keys(c).filter(k=>c[k]===mx).map(Number).sort((a,b)=>a-b); return mx===1?T('どの値も 1回ずつなので、最頻値は ありません','最頻値なし',xs.join(', ')):pOut(ms[0],'',{a:ms.map(x=>fmt(x)).join(', ')+'（'+mx+'回）', say:'最頻値は '+ms.map(x=>fmt(x)).join('、')+' です', f:xs.join(', ')}); }),
  K('統計',['{*L}(の)<HANI>'], (n,g)=>{ const xs=pList(g.L); return [Math.max(...xs)-Math.min(...xs),'','範囲',fmt(Math.max(...xs))+' − '+fmt(Math.min(...xs))]; }),
  K('統計',['{*L}(の)<BUNSAN>'], (n,g)=>{ const s=stat(pList(g.L)); return [s.v,'','分散','平均 '+fmt(s.m)+' からの ずれの 2乗の 平均']; }),
  K('統計',['{*L}(の)<SD>'], (n,g)=>{ const s=stat(pList(g.L)); return [s.sd,'','標準偏差','√分散（分散 '+fmt(s.v)+'）']; }),
  K('統計',['(平均|平均点)(が|は)?{m}点?(、|で|と)?<SD>(が|は)?{s}点?(で|のとき|の|のテストで|、)?(、)?{x}点(の|を取ったときの|のときの|だと|なら)?(偏差値|へんさち)','(偏差値|へんさち)(は)?{x}点(で|、)?(平均|平均点){m}点?(、|で)?<SD>{s}'], n=>n.s?[50+10*(n.x-n.m)/n.s,'','偏差値','50 ＋ 10 × ('+fmt(n.x)+' − '+fmt(n.m)+') ÷ '+fmt(n.s)]:R_err('標準偏差が 0 です')),
  K('統計',['(偏差値|へんさち){z}(は|って|の|だと)?(、)?(平均|平均点)(が)?{m}点?(、|で)?<SD>(が)?{s}点?(のとき|なら|だと|で)?(何点|の点数|点数)'], n=>[n.m+(n.z-50)/10*n.s,'点','',fmt(n.m)+' ＋ ('+fmt(n.z)+' − 50) ÷ 10 × '+fmt(n.s)]),
  K('統計',['{*L}(の)(合計と平均|平均と合計)'], (n,g)=>{ const xs=pList(g.L), s=xs.reduce((a,b)=>a+b,0); return pOut(s/xs.length,'',{a:'合計 '+fmt(s)+' ／ 平均 '+fmt(s/xs.length), say:'合計は '+fmt(s)+'、平均は '+fmt(s/xs.length)+' です', f:xs.join(' ＋ ')}); }),
  K('統計',['人口(が)?{p}人?(で|、|の)?面積(が)?{s}(平方キロ|平方キロメートル|km2|k㎡|㎢)(の)?(人口密度)','(人口密度)(は)?人口{p}人?(で|、)?面積{s}(平方キロ|平方キロメートル|km2)'], n=>n.s?[n.p/n.s,'人/km²','人口密度',fmt(n.p)+' ÷ '+fmt(n.s)]:R_err('面積が 0 です')),
  // ── 濃度 ──
  K('濃度',['{p}<PCT>の<SHIO>{w}(グラム|g)(に|の中に|の中の)?(含まれる|含まれている|入っている|溶けている|とけている|ふくまれる)?(食塩|塩|砂糖|溶質)(の量|の重さ)?(は)?(何グラム|何g)?'], n=>[n.w*n.p/100,'g','',fmt(n.w)+' × '+fmt(n.p)+'%']),
  K('濃度',['(食塩|塩|砂糖){s}(グラム|g)(を|が)?水{w}(グラム|g)(に|へ)?(溶かす|とかす|溶かした|とかした|溶かすと|とかすと|入れる|入れた|入れると|溶けている)(と|ら|ときの|時の)?(の)?(<SHIO>の)?<NOUDO>'], n=>(n.s+n.w)?[n.s/(n.s+n.w)*100,'%','濃度',fmt(n.s)+' ÷ ('+fmt(n.s)+' ＋ '+fmt(n.w)+')']:R_err('量が 0 です')),
  K('濃度',['{p}<PCT>の<SHIO>?{a}(グラム|g)(と|に|へ)(、)?{q}<PCT>の<SHIO>?{b}(グラム|g)(を)?<MAZERU>(と|ら|ときの)?(の)?<NOUDO>?'], n=>(n.a+n.b)?[(n.a*n.p+n.b*n.q)/(n.a+n.b),'%','濃度','('+fmt(n.a)+' × '+fmt(n.p)+' ＋ '+fmt(n.b)+' × '+fmt(n.q)+') ÷ '+fmt(n.a+n.b)]:R_err('量が 0 です')),
  K('濃度',['{p}<PCT>の<SHIO>{a}(グラム|g)に(、)?水(を)?{b}(グラム|g)(を)?<TASUMIZU>(と|ら|ときの)?(の)?<NOUDO>?'], n=>[n.a*n.p/(n.a+n.b),'%','濃度',fmt(n.a)+' × '+fmt(n.p)+' ÷ ('+fmt(n.a)+' ＋ '+fmt(n.b)+')']),
  K('濃度',['{p}<PCT>の<SHIO>{a}(グラム|g)(から|の)(、)?水(を|が)?{b}(グラム|g)(蒸発|じょうはつ|飛ばす|とばす)(させる|する|した|させた|すると|させると|したら)?(と|ら|ときの)?(の)?<NOUDO>?'], n=>n.a>n.b?[n.a*n.p/(n.a-n.b),'%','濃度',fmt(n.a)+' × '+fmt(n.p)+' ÷ ('+fmt(n.a)+' − '+fmt(n.b)+')']:R_err('水が 残りません')),
  K('濃度',['{p}<PCT>の<SHIO>{a}(グラム|g)に(、)?(食塩|塩|砂糖)(を)?{b}(グラム|g)(を)?<TASUMIZU>(と|ら|ときの)?(の)?<NOUDO>?'], n=>[(n.a*n.p/100+n.b)/(n.a+n.b)*100,'%','濃度','('+fmt(n.a*n.p/100)+' ＋ '+fmt(n.b)+') ÷ ('+fmt(n.a)+' ＋ '+fmt(n.b)+')']),
  K('濃度',['{p}<PCT>の<SHIO>{a}(グラム|g)を{q}<PCT>に(する|薄める|うすめる|したい)(には|ためには|のに)(、)?水(を|は)?(何グラム|何g|どれだけ|どのくらい)?(足す|加える|入れる|必要|足せばいい|加えればいい)?'], n=>(n.q&&n.q<n.p)?[n.a*n.p/n.q-n.a,'g','足す水',fmt(n.a)+' × '+fmt(n.p)+' ÷ '+fmt(n.q)+' − '+fmt(n.a)]:R_err('薄める ときは 濃度を 下げて ください')),
  // ── 理科：力・電気・熱 ──
  K('理科',['<DENATSU>(が)?{v}<VOLT>?(、|で|と)?<TEIKO>(が)?{r}<OHM>?(の|のとき|のときの|に流れる)?<DENRYU>','{v}<VOLT>(で|の電圧で|を)(、)?{r}<OHM>(の抵抗)?(に|の)?(流れる)?<DENRYU>'], n=>n.r?[n.v/n.r,'A','電流',fmt(n.v)+'V ÷ '+fmt(n.r)+'Ω']:R_err('抵抗が 0 です')),
  K('理科',['<DENRYU>(が)?{i}<AMP>?(、|で|と)?<TEIKO>(が)?{r}<OHM>?(の|のとき|のときの|にかかる)?<DENATSU>','{r}<OHM>(の抵抗)?に{i}<AMP>(流れる|流す|流した|の電流)(と|ときの|とき)?(の)?<DENATSU>'], n=>[n.i*n.r,'V','電圧',fmt(n.i)+'A × '+fmt(n.r)+'Ω']),
  K('理科',['<DENATSU>(が)?{v}<VOLT>?(、|で|と)?<DENRYU>(が)?{i}<AMP>?(の|のとき|のときの)?<TEIKO>','{v}<VOLT>(で|の電圧で)(、)?{i}<AMP>(流れる|流れた|の電流)(とき|ときの)?(の)?<TEIKO>'], n=>n.i?[n.v/n.i,'Ω','抵抗',fmt(n.v)+'V ÷ '+fmt(n.i)+'A']:R_err('電流が 0 です')),
  K('理科',['<DENATSU>(が)?{v}<VOLT>?(、|で|と)?<DENRYU>(が)?{i}<AMP>?(の|のとき|のときの)?(電力|消費電力|でんりょく|ワット数)','{v}<VOLT>(で|の電圧で)(、)?{i}<AMP>(流れる|流れた|の電流)(とき|ときの)?(の)?(電力|消費電力)'], n=>[n.v*n.i,'W','電力',fmt(n.v)+'V × '+fmt(n.i)+'A']),
  K('理科',['{a}<OHM>(と|、){b}<OHM>(の抵抗)?(を|の)?直列(に|で)?(つなぐ|つないだ|接続|つなぐと|つないだとき)?(の|ときの)?(合成抵抗|全体の抵抗|抵抗)?'], n=>[n.a+n.b,'Ω','直列の合成抵抗',fmt(n.a)+' ＋ '+fmt(n.b)]),
  K('理科',['{a}<OHM>(と|、){b}<OHM>(の抵抗)?(を|の)?並列(に|で)?(つなぐ|つないだ|接続|つなぐと|つないだとき)?(の|ときの)?(合成抵抗|全体の抵抗|抵抗)?'], n=>(n.a+n.b)?[n.a*n.b/(n.a+n.b),'Ω','並列の合成抵抗',fmt(n.a)+' × '+fmt(n.b)+' ÷ ('+fmt(n.a)+' ＋ '+fmt(n.b)+')']:R_err('抵抗が 0 です')),
  K('理科',['{w}<WATT>(を|の電力を|の電気器具を)?{t}<BYO>(使う|使った|使うと|使ったら|流す|流した)(と|ら|ときの)?(の)?(電力量|熱量|発熱量|ジュール|エネルギー|何ジュール)'], n=>[n.w*n.t,'J','',fmt(n.w)+'W × '+fmt(n.t)+'秒']),
  K('理科',['水{m}(グラム|g)(を|の温度を)?{t}度(上げる|あげる|上昇させる|温める|あたためる|上げた|温めた)(のに|ときの|とき|には)?(必要な)?(熱量|ねつりょう|エネルギー|ジュール|何ジュール)','水{m}(グラム|g)(を)?{a}度から{b}度(に|まで)(上げる|あげる|温める|あたためる|する)(のに|ときの|には)?(必要な)?(熱量|エネルギー|ジュール)'], n=>{ const t=n.t!=null?n.t:(n.b-n.a); return [4.2*n.m*t,'J','熱量','4.2 × '+fmt(n.m)+'g × '+fmt(t)+'℃']; }),
  K('理科',['(質量|重さ)?{m}<KG2>(の|は)?(物体|もの)?(にはたらく|に働く|の|にかかる)?(重力|重さ)(の大きさ)?(は)?(何ニュートン|なんニュートン|ニュートンで)','{m}<KG2>(は|って)?(何ニュートン|なんニュートン)'], n=>[n.m*9.8,'N','重力',fmt(n.m)+'kg × 9.8']),
  K('理科',['(力)?{f}<NEWTON>(の力)?(で|を加えて|をかけて)(、)?{d}<MTR>(動かす|動かした|移動させる|移動させた|持ち上げる|持ち上げた|引く|引いた|押す|押した)(と|ら|ときの|とき)?(の)?(仕事|しごと|仕事量|何ジュール)'], n=>[n.f*n.d,'J','仕事',fmt(n.f)+'N × '+fmt(n.d)+'m']),
  K('理科',['(仕事)?{w}(ジュール|J)(を|の仕事を)?{t}<BYO>(で|間で|かけて)(した|する|行う|行った|すると)?(ときの|とき|の)?(仕事率|しごとりつ|何ワット)'], n=>n.t?[n.w/n.t,'W','仕事率',fmt(n.w)+'J ÷ '+fmt(n.t)+'秒']:R_err('時間が 0 です')),
  K('理科',['(力)?{f}<NEWTON>(の力)?(が|を)?(面積)?{s}(平方メートル|㎡|m2)(に|の面に)?(かかる|加わる|はたらく|かけた|加えた)?(ときの|とき|の)?(圧力|あつりょく|何パスカル)'], n=>n.s?[n.f/n.s,'Pa','圧力',fmt(n.f)+'N ÷ '+fmt(n.s)+'㎡']:R_err('面積が 0 です')),
  K('理科',['(質量|重さ)?{m}(グラム|g)(、|で|の|と)?<TAISEKI>(が)?{v}(立方センチ|立方センチメートル|cm3|cc|㎤)(の|のとき|のときの)?(物体|もの|物質)?(の)?(密度|みつど)'], n=>n.v?[n.m/n.v,'g/cm³','密度',fmt(n.m)+'g ÷ '+fmt(n.v)+'cm³']:R_err('体積が 0 です')),
  K('理科',['(密度|みつど)(が)?{d}(グラム毎立方センチ|g/cm3)?(で|、|の)?<TAISEKI>(が)?{v}(立方センチ|立方センチメートル|cm3|cc|㎤)(の|のとき|のときの)?(物体|もの|物質)?(の)?(質量|重さ)'], n=>[n.d*n.v,'g','質量',fmt(n.d)+' × '+fmt(n.v)+'cm³']),
  K('理科',['(質量|重さ)?{m}<KG2>(、|で|の|と)?(速さ|速度)(が)?(秒速)?{v}(メートル毎秒|メートル|m/s|m)?(の|のとき|のときの)?(物体|もの)?(の)?運動エネルギー'], n=>[n.m*n.v*n.v/2,'J','運動エネルギー','1/2 × '+fmt(n.m)+' × '+fmt(n.v)+'²']),
  K('理科',['(質量|重さ)?{m}<KG2>(、|で|の|と|を)?高さ(が)?{h}<MTR>(の|にある|に置いた|のところにある|のとき|のときの)?(物体|もの)?(の)?位置エネルギー'], n=>[n.m*9.8*n.h,'J','位置エネルギー',fmt(n.m)+' × 9.8 × '+fmt(n.h)]),
  K('理科',['{t}<BYO>(自由落下|落下|落ちる|落ちた|落とす|落とした)(する|した|すると|したら|と|ら)?(ときの|とき|の)?(落ちる|落下)?(距離|きょり|高さ|何メートル)','(自由落下|落下)(で|して)?{t}<BYO>(後|たつと|経つと)?(の)?(落ちた|落下)?(距離|何メートル)'], n=>[4.9*n.t*n.t,'m','落ちる距離','1/2 × 9.8 × '+fmt(n.t)+'²']),
  K('理科',['{t}<BYO>(自由落下|落下|落ちる|落ちた)(する|した|すると|したら|と|ら)?(ときの|とき|の|後の)?(速さ|速度|スピード)','(自由落下|落下)(で|して)?{t}<BYO>後の(速さ|速度)'], n=>[9.8*n.t,'m/s','速さ','9.8 × '+fmt(n.t)]),
  K('理科',['高さ{h}<MTR>(から|の所から|のところから)(物|もの|物体|ボール|石)?(を)?(落とす|落とした|落下させる|落ちる|自由落下する|自由落下させる)(と|ら|とき)?(、)?(地面に|下に)?(着く|つく|届く|落ちる)?(まで)?(の)?(時間|何秒|何秒かかる)'], n=>[RT(2*n.h/9.8),'秒','落ちるまで','√(2 × '+fmt(n.h)+' ÷ 9.8)']),
  K('理科',['(振動数|周波数|しんどうすう)(が)?{f}(ヘルツ|Hz|hz)(、|で|と)?(波長|はちょう)(が)?{l}<MTR>(の)?(波|音|音波)?(の)?(速さ|速度|伝わる速さ)'], n=>[n.f*n.l,'m/s','波の速さ',fmt(n.f)+'Hz × '+fmt(n.l)+'m']),
  K('理科',['(雷|かみなり|稲妻|花火)(が|の)?(光って|光ってから|光が見えて|見えてから)?(から)?{t}<BYO>(後|あと|で|たって|経って)(に)?(音|おと)(が)?(聞こえた|聞こえる|届いた|した)(とき|ときの|ら|場合)?(の)?(距離|きょり|何メートル|どのくらい離れて)?','音(が|は)?{t}<BYO>(で|間に)(進む|伝わる|届く)(距離|きょり)'], n=>[340*n.t,'m','距離（音の速さ 340m/秒）','340 × '+fmt(n.t)]),
  K('理科',['(分子量|式量|モル質量)(が)?{M}(の|で)?(物質|もの)?(が|を)?{m}(グラム|g)(は|って|の)?(何モル|なんモル|物質量)','{m}(グラム|g)(で|、|の)(分子量|式量|モル質量)(が)?{M}(は|の|だと)?(何モル|なんモル|物質量)'], n=>n.M?[n.m/n.M,'mol','',fmt(n.m)+'g ÷ '+fmt(n.M)]:R_err('分子量が 0 です')),
  K('理科',['{k}(モル|mol)(を|の物質を|の溶質を)?{v}(リットル|L|l)(の水|の溶液)?(に|へ)?(溶かす|とかす|溶かした|とかした|溶かすと|した)?(と|ら|ときの|とき)?(の)?(モル濃度|濃度)'], n=>n.v?[n.k/n.v,'mol/L','モル濃度',fmt(n.k)+'mol ÷ '+fmt(n.v)+'L']:R_err('体積が 0 です')),
  K('理科',['(溶質|とけているもの)(が)?{a}(グラム|g)(、|で|と)?(溶液|水溶液|全体)(が)?{b}(グラム|g)(の|のとき|のときの)?(質量パーセント濃度|質量%濃度|濃度|パーセント濃度)'], n=>n.b?[n.a/n.b*100,'%','質量パーセント濃度',fmt(n.a)+' ÷ '+fmt(n.b)]:R_err('溶液が 0 です')),
  K('理科',['(倍率)?(接眼レンズ|接眼)(が)?{a}倍(、|で|と)?(対物レンズ|対物)(が)?{b}倍(の|のとき|のときの)?(顕微鏡)?(の)?(倍率|ばいりつ)'], n=>[n.a*n.b,'倍','顕微鏡の倍率',fmt(n.a)+' × '+fmt(n.b)]),
  K('理科',['(湿度|しつど)(は)?(、)?(飽和水蒸気量|ほうわすいじょうきりょう)(が)?{s}(グラム|g)?(で|、|と)?(水蒸気量|水蒸気|空気中の水蒸気)(が)?{a}(グラム|g)?(の|のとき|のときの)?(湿度)?','(水蒸気量|水蒸気)(が)?{a}(グラム|g)?(で|、|と)?(飽和水蒸気量)(が)?{s}(グラム|g)?(の|のとき|のときの)?(湿度|しつど)'], n=>n.s?[n.a/n.s*100,'%','湿度',fmt(n.a)+' ÷ '+fmt(n.s)]:R_err('飽和水蒸気量が 0 です')),
  // ── 対数・指数 ──
  K('数',['(log|ログ){b}の{x}','(底|てい)(が)?{b}(の|で)?{x}の対数','{b}を底とする{x}の対数'], n=>(n.b>0&&n.b!==1&&n.x>0)?[+(Math.log(n.x)/Math.log(n.b)).toFixed(12),'','','log'+fmt(n.b)+' '+fmt(n.x)]:R_err('底は 1 でない 正の数、真数は 正の数で 言ってください')),
  K('数',['{x}の(常用対数|じょうようたいすう)','(log10|ログ10)の{x}'], n=>n.x>0?[+Math.log10(n.x).toFixed(12),'','','log10 '+fmt(n.x)]:R_err('正の数で 言ってください')),
  K('数',['{x}の(自然対数|しぜんたいすう)','(ln|エルエヌ)(の)?{x}'], n=>n.x>0?[Math.log(n.x),'','','ln '+fmt(n.x)]:R_err('正の数で 言ってください')),
  K('数',['{a}の(マイナス|-|−){b}乗'], n=>n.a?[Math.pow(n.a,-n.b),'','',fmt(n.a)+' ^ −'+fmt(n.b)]:R_err('0 の マイナス乗は 決まりません')),
  K('数',['{a}の{d}分の{k}乗'], n=>n.d?[Math.pow(n.a,n.k/n.d),'','',fmt(n.a)+' ^ ('+fmt(n.k)+'/'+fmt(n.d)+')']:R_err('分母が 0 です')),
  K('数',['{a}は{b}の何乗','{b}を何乗(すると|したら|で){a}(になる)?'], n=>(n.b>0&&n.b!==1&&n.a>0)?[+(Math.log(n.a)/Math.log(n.b)).toFixed(12),'乗','','log'+fmt(n.b)+' '+fmt(n.a)]:R_err('正の数で 言ってください')),
  K('数',['{a}(けた|桁)の(整数|数|自然数)(は)?(全部で)?(何個|いくつ)(ある|ありますか)?'], n=>(isInt(n.a)&&n.a>=1&&n.a<=15)?[9*Math.pow(10,n.a-1),'個','','9 × 10 ^ '+fmt(n.a-1)]:R_err('1〜15 けたで 言ってください')),
  K('数',['2の{a}乗(は|って)?何(けた|桁)','{b}の{a}乗(は|って)?何(けた|桁)'], n=>{ const b=n.b||2; return b>0?[Math.floor(n.a*Math.log10(b))+1,'けた','',fmt(b)+' ^ '+fmt(n.a)]:R_err('正の数で 言ってください'); }),
  K('数',['{a}の(各位|各けた|各桁|それぞれの位)(の数|の数字)?の(和|合計)','{a}の(数字|けた|桁)(を)?(全部)?足(す|した|して)(と|ら|数)?'], (n,g)=>{ const ds=String(g.a).replace(/\D/g,'').split('').map(Number); return [ds.reduce((x,y)=>x+y,0),'','各位の和',ds.join(' ＋ ')]; }),
  K('数',['{a}を(逆|ぎゃく|反対)(から|に|さま)(読む|読んだ|読むと|並べる|並べた|並べると|した|すると|にすると)(数)?'], (n,g)=>{ const s=String(g.a).split('').reverse().join(''); return T(s+' です', s, '逆から 読む'); })
);
/* ════════════ 仕事・現場・単位・日付・からだ・くるま・畑（v9。1000種類へ 向けた 3回目）════════════
   書き方は v7・v8 と 同じ（K・T）。目安の 数（比重・生コン車・鉄筋の 重さ など）は 式に 出す。早見表・文例には 出さない。 */
const LENM=(v,u)=>{ const k=lenKey(u); return k ? v*LEN_F[k] : v; };          // 長さを m に
const durHM=h=>{ const m=Math.round(h*60), hh=Math.floor(m/60), mm=m-hh*60; return (hh?hh+'時間':'')+(mm||!hh?mm+'分':''); };
const WDJ='日月火水木金土';
const ymdJ=d=>d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WDJ[d.getDay()]+'）';
const dOnly=d=>new Date(d.getFullYear(), d.getMonth(), d.getDate());
const okYMD=(y,m,d)=>{ const t=new Date(y,m-1,d); return (t.getFullYear()===y && t.getMonth()===m-1 && t.getDate()===d) ? t : null; };
const dayDiff=(a,b)=>Math.round((dOnly(b)-dOnly(a))/864e5);
function workDays(a,b){ let n=0; const s=dOnly(a<b?a:b), e=dOnly(a<b?b:a); for(let t=new Date(s); t<=e; t.setDate(t.getDate()+1)){ const w=t.getDay(); if(w && w!==6) n++; } return n; }
const REBAR={D6:0.249,D10:0.560,D13:0.995,D16:1.56,D19:2.25,D22:3.04,D25:3.98,D29:5.04,D32:6.23,D35:7.51};
const DENS={コンクリート:2.3,生コン:2.3,鉄筋コンクリート:2.4,土:1.8,残土:1.8,砂:1.7,砂利:1.8,砕石:1.9,アスファルト:2.35,水:1.0,鉄:7.85,鋼材:7.85,鉄板:7.85,アルミ:2.7,ステンレス:7.93,銅:8.96,杉:0.38,檜:0.41,ヒノキ:0.41,石:2.6,雪:0.3};
PW.ZAI=Object.keys(DENS);
PW.REB=Object.keys(REBAR);
PW.KONKURI=['コンクリート','生コン','土間','土間コン','基礎','スラブ','モルタル','コンクリ'];
PW.RYUBEI=['何立米','何㎥','何立方メートル','量','体積','何リューベ','何りゅうべ','立米'];
PW.KOUBAI=['勾配','こうばい','傾き','傾斜','水勾配'];
PW.NANDO=['何度','なんど','角度','の角度'];
PW.OMOSA=['重さ','重量','何キロ','何トン','何kg','重さは','トン数','何t'];
PW.HONSU=['本','ほん'];
PW.NINKU=['人工','にんく','人工数'];
PW.TOGYO=['日数','何日','工期','なんにち','何日かかる','日'];
PW.TASSEI=['達成率','達成度','進み具合','進捗率','進捗','何%達成'];
PW.ZENNEN=['前年比','前年同月比','前月比','前期比','昨年比','去年比','前回比','前日比','前週比'];
PW.KADO=['稼働率','かどうりつ','稼動率','利用率','使用率','回転率'];
PW.FURYO=['不良率','不良品率','エラー率','ミス率','欠陥率'];
PW.BUDOMARI=['歩留まり','歩留り','ぶどまり','良品率','合格率','収率'];
PW.KOSEI=['構成比','割合','シェア','占める割合','比率','占有率'];
PW.YOUBI=['何曜日','なんようび','曜日','何曜','なに曜日'];
PW.KYO=['今日','きょう','本日'];
PW.HEIJITSU=['営業日','平日','稼働日','出勤日'];
PW.METS=['ウォーキング','散歩','早歩き','ジョギング','ランニング','自転車','サイクリング','水泳','ヨガ','筋トレ','掃除','階段','階段のぼり','ゴルフ','テニス','登山','ダンス','なわとび','縄跳び'];
const METS={ウォーキング:3.5,散歩:3,早歩き:4.3,ジョギング:7,ランニング:9.8,自転車:6.8,サイクリング:6.8,水泳:8.3,ヨガ:2.5,筋トレ:5,掃除:3.3,階段:8,階段のぼり:8,ゴルフ:4.8,テニス:7.3,登山:6.5,ダンス:5,なわとび:12.3,縄跳び:12.3};
PW.SEI=['男','男性','おとこ','女','女性','おんな'];
PHRASES.push(
  // ── 現場：コンクリート・土・重さ ──
  K('現場',['(縦|長さ){a}<LU@ua>?(、|×|で|と)?(横|幅){b}<LU@ub>?(、|×|で|と)?(厚さ|厚み|深さ|高さ){c}<LU@uc>?(の)?<KONKURI>(は|の量は|の量)?<RYUBEI>?','<KONKURI>(は)?(縦|長さ){a}<LU@ua>?(、|×)?(横|幅){b}<LU@ub>?(、|×)?(厚さ|厚み|深さ){c}<LU@uc>?'], (n,g)=>{ const v=LENM(n.a,g.ua||'m')*LENM(n.b,g.ub||g.ua||'m')*LENM(n.c,g.uc||'cm'); return pOut(v,'㎥',{a:fmt(v,3)+'㎥（生コン車 4.25㎥ で '+Math.ceil(v/4.25-1e-9)+'台・重さ 約'+fmt(v*2.3,1)+'t）', say:fmt(v,2)+' 立米 です', f:'縦 × 横 × 厚さ（m に そろえて）'}); }),
  K('現場',['{v}(立米|㎥|立方メートル)(の)?<KONKURI>(を|は|なら)?(生コン車|ミキサー車|アジテーター車|生コン)(で)?(何台|台数)?','{v}(立米|㎥)(を)?{k}(立米|㎥)(積み|積)?の(生コン車|ミキサー車)(で)?(何台)?'], n=>{ const k=n.k||4.25; return [Math.ceil(n.v/k-1e-9),'台','生コン車（1台 '+fmt(k)+'㎥）',fmt(n.v)+' ÷ '+fmt(k)+' を 切り上げ']; }),
  K('現場',['{v}(立米|㎥|立方メートル)(の)?<ZAI@z>(の)?<OMOSA>','<ZAI@z>{v}(立米|㎥|立方メートル)(の)?<OMOSA>?'], (n,g)=>[n.v*DENS[g.z],'t',g.z+'（比重 '+DENS[g.z]+' の 目安）',fmt(n.v)+'㎥ × '+DENS[g.z]]),
  K('現場',['{w}(トン|t)(の)?<ZAI@z>(は)?(何立米|何㎥|体積|何立方メートル)'], (n,g)=>[n.w/DENS[g.z],'㎥',g.z+'（比重 '+DENS[g.z]+' の 目安）',fmt(n.w)+'t ÷ '+DENS[g.z]]),
  K('現場',['{v}(立米|㎥)(の)?(土|残土|砂|砂利|砕石)(を)?{t}(トン|t)ダンプ(で)?(何台|台数|何回)?(運ぶと|で運ぶと|必要)?'], (n,g,t)=>{ const z=(t.match(/土|残土|砂利|砕石|砂/)||['土'])[0], w=n.v*DENS[z]; return [Math.ceil(w/n.t-1e-9),'台','ダンプ（'+z+' 比重 '+DENS[z]+'）',fmt(n.v)+'㎥ × '+DENS[z]+' ＝ '+fmt(w,1)+'t ÷ '+fmt(n.t)+'t']; }),
  K('現場',['(厚さ|板厚){t}(ミリ|mm)(、|で|の)?(縦|長さ){a}<LU@ua>?(、|×)?(横|幅){b}<LU@ub>?(の)?(鉄板|鋼板|鉄|ステンレス板|ステンレス|アルミ板|アルミ)(の)?<OMOSA>?','(縦|長さ){a}<LU@ua>?(、|×)?(横|幅){b}<LU@ub>?(、|×)?(厚さ|板厚){t}(ミリ|mm)(の)?(鉄板|鋼板|鉄|ステンレス板|ステンレス|アルミ板|アルミ)(の)?<OMOSA>?'], (n,g,t)=>{ const d=/ステンレス/.test(t)?7.93:/アルミ/.test(t)?2.7:7.85, v=LENM(n.a,g.ua||'m')*LENM(n.b,g.ub||g.ua||'m')*n.t/1000; return [v*d*1000,'kg','重さ（比重 '+d+'）',fmt(v,6)+'㎥ × '+d+' × 1000']; }),
  K('現場',['<REB@d>(の|を|が)?(長さ)?{L}(メートル|m)(を|で|が|の)?{k}<HONSU>(の)?<OMOSA>?','<REB@d>(の|を)?{k}<HONSU>(で|の|、)?(長さ)?{L}(メートル|m)(ずつ|もの|の)?<OMOSA>?','<REB@d>(の|を)?{L}(メートル|m)(の)?<OMOSA>'], (n,g)=>{ const k=n.k||1; return [REBAR[g.d]*n.L*k,'kg',g.d+'（1m '+REBAR[g.d]+'kg）',REBAR[g.d]+'kg × '+fmt(n.L)+'m'+(n.k?' × '+fmt(k)+'本':'')]; }),
  K('現場',['<REB@d>(は)?(1メートル|1m)(あたり|で)?(何キロ|重さ|何kg|単位重量)'], (n,g)=>[REBAR[g.d],'kg',g.d+' 1mの 重さ','']),
  K('現場',['(縦|長さ){a}<LU@ua>?(、|×|で|と)?(横|幅){b}<LU@ub>?(、|×|で|と)?(深さ|高さ){c}<LU@uc>?(を|の)?(掘る|掘ると|掘削|穴|掘ったら)(の)?(土|残土|土量)?(は)?<RYUBEI>?'], (n,g)=>{ const v=LENM(n.a,g.ua||'m')*LENM(n.b,g.ub||g.ua||'m')*LENM(n.c,g.uc||g.ub||g.ua||'m'); return pOut(v,'㎥',{a:fmt(v,3)+'㎥（ほぐすと 約'+fmt(v*1.2,2)+'㎥・重さ 約'+fmt(v*1.8,1)+'t）', say:fmt(v,2)+' 立米 です', f:'縦 × 横 × 深さ（ほぐし率 1.2・比重 1.8 の 目安）'}); }),
  // ── 現場：勾配・角度・階段 ──
  K('現場',['{k}寸勾配(は|の|って)?<NANDO>'], n=>[Math.atan(n.k/10)*180/PI,'度','角度','atan('+fmt(n.k)+' ÷ 10)']),
  K('現場',['{d}度(は|の勾配は|って)?(何寸|なんずん)(勾配)?'], n=>[Math.tan(n.d*PI/180)*10,'寸','勾配','tan '+fmt(n.d)+'° × 10']),
  K('現場',['{k}寸勾配(は|の|って)?(何<PCT>|パーセント)'], n=>[n.k*10,'%','勾配','']),
  K('現場',['{k}寸勾配(の)?(伸び率|のび率|伸び|斜めの長さの率)','{k}寸勾配(で|の)(横|水平|水平距離){L}<LU@u>?(の)?(斜め|屋根|流れ)(の長さ)?'], (n,g)=>{ const r=Math.sqrt(1+(n.k/10)**2); return n.L!=null ? [n.L*r,lenU(g.u),'斜めの 長さ',fmt(n.L)+' × '+fmt(r,4)] : [r,'','伸び率','√(1 ＋ ('+fmt(n.k)+'/10)²)']; }),
  K('現場',['<KOUBAI>{p}<PCT>(は|って)?<NANDO>','{p}<PCT>(の)?<KOUBAI>(は|って)?<NANDO>'], n=>[Math.atan(n.p/100)*180/PI,'度','角度','atan('+fmt(n.p)+'%)']),
  K('現場',['{d}度(は|の勾配は|って)?(何<PCT>|パーセント)(の勾配)?'], n=>[Math.tan(n.d*PI/180)*100,'%','勾配','tan '+fmt(n.d)+'° × 100']),
  K('現場',['{n}分の1(の)?<KOUBAI>(は)?(何<PCT>|パーセント)?','1/{n}(の)?<KOUBAI>(は)?(何<PCT>)?'], n=>n.n?[100/n.n,'%','勾配','1 ÷ '+fmt(n.n)]:R_err('0 では割れません')),
  K('現場',['{L}<LU@ul>(で|の間で|の距離で|進んで)?{h}<LU@uh>(上がる|下がる|あがる|さがる|の高低差|の差|上がると|下がると|上がったら|下がったら)(の|ときの)?<KOUBAI>?(は)?(何<PCT>)?'], (n,g)=>{ const L=LENM(n.L,g.ul||'m'), h=LENM(n.h,g.uh||g.ul||'m'); return L?[h/L*100,'%','勾配','高さ ÷ 距離（'+fmt(h)+'m ÷ '+fmt(L)+'m）']:R_err('距離が 0 です'); }),
  K('現場',['{L}<LU@ul>(の)?(長さ|距離)?(で|に|を)?<KOUBAI>{p}<PCT>(だと|なら|の|で|とると|つけると)?(の)?(高低差|高さの差|落差|何センチ|下がり|上がり)'], (n,g)=>{ const L=LENM(n.L,g.ul||'m'); return pOut(L*n.p/100*100,'cm',{a:fmt(L*n.p,1)+'cm（'+fmt(L*n.p/100,3)+'m）', say:fmt(L*n.p,1)+' センチ です', f:fmt(L)+'m × '+fmt(n.p)+'%'}); }),
  K('現場',['(階高|かいだか|高さ){h}<LU@u>?(を|で)?{k}段(で|に|にすると|の階段)?(の)?(蹴上げ|けあげ|1段の高さ|段の高さ)'], (n,g)=>[n.h/n.k,lenU(g.u)||'mm','蹴上げ',fmt(n.h)+' ÷ '+fmt(n.k)+'段']),
  K('現場',['(高さ){h}<LU@uh>(、|で|と)?(長さ|横|水平|水平距離){L}<LU@ul>?(の)?(スロープ|坂|斜面|傾斜|屋根)(の)?(斜めの長さ|斜辺|長さ)'], (n,g)=>{ const h=LENM(n.h,g.uh||'m'), L=LENM(n.L,g.ul||g.uh||'m'); return [Math.hypot(h,L),'m','斜めの 長さ','√('+fmt(h)+'² ＋ '+fmt(L)+'²)']; }),
  // ── 現場：材料の 数・人工・工期 ──
  K('現場',['{s}(平米|㎡|平方メートル)(に|を|の床に|の壁に)?{a}(センチ|cm|ミリ|mm)角(の)?(タイル|板|パネル|ブロック|床材|石)(は|を貼ると|で|を)?(何枚|枚数)?(必要)?(、)?(ロス{p}<PCT>)?'], (n,g,t)=>{ const a=/ミリ|mm/.test(t)?n.a/1000:n.a/100, b=n.s/(a*a), p=n.p||0; return [Math.ceil(b*(1+p/100)-1e-9),'枚','枚数'+(p?'（ロス '+p+'%）':''),fmt(n.s)+'㎡ ÷ '+fmt(a*a,6)+'㎡'+(p?' × '+fmt(1+p/100):'')]; }),
  K('現場',['{s}(平米|㎡)(を|の壁を|の床を)?(1平米あたり|1㎡あたり|平米あたり|1平米)?{k}(キロ|kg|リットル|L|l)(で|の塗料で|ずつ)?{c}回(塗り|塗ると|塗る|塗)?(の|で)?(塗料|ペンキ|量|必要量)?','{s}(平米|㎡)(を)?{c}回(塗り|塗る|塗ると)(で|、)?(1平米あたり|平米あたり|塗布量){k}(キロ|kg|リットル|L)'], (n,g,t)=>[n.s*n.k*n.c,/リットル|L|l/.test(t)?'L':'kg','塗料',fmt(n.s)+'㎡ × '+fmt(n.k)+' × '+fmt(n.c)+'回']),
  K('現場',['{q}(平米|㎡|メートル|m|立米|㎥|個|本|枚|箇所)(を)?(1人|ひとり)(1日|が1日)(に|で)?{r}(平米|㎡|メートル|m|立米|㎥|個|本|枚|箇所)(なら|だと|の作業で|ずつ|できるとして|できると|の歩掛で|で)?(、)?(何)?<NINKU>'], n=>n.r?[n.q/n.r,'人工','',fmt(n.q)+' ÷ '+fmt(n.r)]:R_err('1日の 量が 0 です')),
  K('現場',['{q}(平米|㎡|メートル|m|立米|㎥|個|本|枚|箇所)(を)?{k}人(で)?(、)?(1人|ひとり)(1日|が1日)(に|で)?{r}(平米|㎡|メートル|m|立米|㎥|個|本|枚|箇所)(なら|だと|ずつ|できるとして|できると|で)?(、)?<TOGYO>?'], n=>(n.k*n.r)?pOut(Math.ceil(n.q/(n.k*n.r)-1e-9),'日',{a:Math.ceil(n.q/(n.k*n.r)-1e-9)+'日（ちょうどは '+fmt(n.q/(n.k*n.r),2)+'日）', say:Math.ceil(n.q/(n.k*n.r)-1e-9)+'日 です', f:fmt(n.q)+' ÷ ('+fmt(n.k)+'人 × '+fmt(n.r)+')'}):R_err('0 では割れません')),
  K('現場',['{k}<NINKU>(で|を)?(1人工|1人工あたり|人工単価|単価){p}円?(なら|だと|で|の)?(人件費|労務費|費用|金額|いくら)?','{k}<NINKU>(×|かける){p}円'], n=>[n.k*n.p,'円','労務費',fmt(n.k)+'人工 × '+fmt(n.p)+'円']),
  K('現場',['{L}<LU@u>(を|に)?{a}<LU@ua>(ピッチ|間隔|おき|ごと)(で|に)?(並べると|入れると|配筋|打つと|立てると)?(の)?(本数|何本|数|個数|何個)(は)?(両端)?','{L}<LU@u>(の)?(長さ|間)(に)?{a}<LU@ua>(ピッチ|間隔|おき)(で)?(両端含めて|両端も)?(何本)'], (n,g)=>{ const L=LENM(n.L,g.u||'m'), a=LENM(n.a,g.ua||g.u||'m'); return a?[Math.floor(L/a+1e-9)+1,'本','本数（両端を 含む）',fmt(L)+'m ÷ '+fmt(a)+'m ＋ 1']:R_err('間隔が 0 です'); }),
  K('現場',['(セメント){c}(キロ|kg)(に|で|、)?(水|水の量){w}(キロ|kg|リットル|L)?(の)?(水セメント比|W/C|水セメ比)','(水セメント比|W/C){p}<PCT>(で)?(セメント){c}(キロ|kg)(なら|だと|の)?(水|水の量)(は)?'], (n,g,t)=>n.p!=null ? [n.c*n.p/100,'kg','水',fmt(n.c)+'kg × '+fmt(n.p)+'%'] : (n.c?[n.w/n.c*100,'%','水セメント比',fmt(n.w)+' ÷ '+fmt(n.c)]:R_err('セメントが 0 です'))),
  K('現場',['(セメント|セメ){a}(対|:)(砂){b}(対|:)(砂利|砕石){c}(の|で)?(配合)?(で)?(、)?{v}(立米|㎥)(の)?(コンクリート|生コン|モルタル)?(を作ると|作るには|だと|なら|の)?(セメント)?(は)?(何キロ|量)?'], n=>{ const s=n.a+n.b+n.c, cem=n.v*1.55*n.a/s*1500; return pOut(cem,'kg',{a:'セメント 約'+fmt(cem,0)+'kg（'+fmt(cem/25,1)+'袋）／砂 '+fmt(n.v*1.55*n.b/s,2)+'㎥／砂利 '+fmt(n.v*1.55*n.c/s,2)+'㎥', say:'セメントは 約'+fmt(cem,0)+'キロ です', f:'容積比・空げき 1.55 倍・セメント 1500kg/㎥ の 目安'}); }),
  K('現場',['(管|パイプ|配管|ホース)?(の)?(内径){d}(ミリ|mm|センチ|cm)(で|、|の)?(長さ){L}(メートル|m)(の)?(管|パイプ|配管|ホース)?(の)?(水量|中の水|容量|体積|何リットル)'], (n,g,t)=>{ const r=(/ミリ|mm/.test(t.slice(0,t.indexOf('長さ')))?n.d/1000:n.d/100)/2, v=PI*r*r*n.L*1000; return [v,'L','中の 水','π × '+fmt(r,4)+'² × '+fmt(n.L)+'m']; }),
  K('現場',['(木材|材木|角材|木|板)?(の)?(断面)?{a}(センチ|cm|ミリ|mm)(角|×|かける|、)({b}(センチ|cm|ミリ|mm))?(で|、|の)?(長さ)?{L}(メートル|m)(の)?(木材|角材|材木|板)?(を)?({k}本)?(の)?(材積|体積|石数|何石|何立米)'], (n,g,t)=>{ const mm=/ミリ|mm/.test(t), a=mm?n.a/1000:n.a/100, b=n.b!=null?(mm?n.b/1000:n.b/100):a, k=n.k||1, v=a*b*n.L*k; return pOut(v,'㎥',{a:fmt(v,4)+'㎥（'+fmt(v/0.27826,3)+'石）', say:fmt(v,4)+' 立米 です', f:fmt(a)+'m × '+fmt(b)+'m × '+fmt(n.L)+'m'+(n.k?' × '+k+'本':'')+'（1石 ＝ 0.278㎥）'}); }),
  // ── 仕事：割合・生産 ──
  K('仕事',['(目標|ノルマ|予算){a}(円|件|個|人|台|万円)?(に対して|で|、|のところ)?(実績|結果|売上|達成|今)?{b}(円|件|個|人|台|万円)?(の|で|だと|なら)?<TASSEI>','<TASSEI>(は)?(、)?(目標|予算){a}(円|件|個)?(で|、)?(実績){b}'], n=>n.a?[n.b/n.a*100,'%','達成率',fmt(n.b)+' ÷ '+fmt(n.a)]:R_err('目標が 0 です')),
  K('仕事',['(前年|去年|昨年|前月|先月|前回|前期|前日|先週){a}(円|件|個|人|台|万円)?(で|、|に対して)?(今年|今月|今回|今期|今日|今週|本年){b}(円|件|個|人|台|万円)?(の|で|だと|なら)?<ZENNEN>'], n=>n.a?pOut(n.b/n.a*100,'%',{a:fmt(n.b/n.a*100,1)+'%（'+(n.b>=n.a?'＋':'−')+fmt(Math.abs(n.b/n.a*100-100),1)+'%）', say:fmt(n.b/n.a*100,1)+'パーセント です', f:fmt(n.b)+' ÷ '+fmt(n.a)}):R_err('前の 数が 0 です')),
  K('仕事',['{a}(時間|日|分|台|回)(の)?(うち|中|のうち){b}(時間|日|分|台|回)(動いた|稼働|使った|使用|動いて|動いたら|使われた)(ら|時の|ときの|の|で)?<KADO>'], n=>n.a?[n.b/n.a*100,'%','稼働率',fmt(n.b)+' ÷ '+fmt(n.a)]:R_err('0 では割れません')),
  K('仕事',['{a}(個|台|件|本|枚|点)(作って|作った|生産して|検査して|中|のうち)(、)?{b}(個|台|件|本|枚|点)(が)?(不良|NG|だめ|ダメ|エラー|不合格)(の|で|だと|なら)?(とき|ときの|の)?<FURYO>?'], n=>n.a?[n.b/n.a*100,'%','不良率',fmt(n.b)+' ÷ '+fmt(n.a)]:R_err('0 では割れません')),
  K('仕事',['{a}(個|台|件|本|枚|点)(作って|作った|生産して|検査して|投入して|中|のうち)(、)?{b}(個|台|件|本|枚|点)(が)?(良品|OK|合格|使える)(の|で|だと|なら)?(とき|ときの|の)?<BUDOMARI>?'], n=>n.a?[n.b/n.a*100,'%','歩留まり',fmt(n.b)+' ÷ '+fmt(n.a)]:R_err('0 では割れません')),
  K('仕事',['(全体|合計|総数|全部){a}(円|件|個|人|台|万円)?(のうち|中|で|の中で)?{b}(円|件|個|人|台|万円)?(の|は|が)?<KOSEI>'], n=>n.a?[n.b/n.a*100,'%','構成比',fmt(n.b)+' ÷ '+fmt(n.a)]:R_err('全体が 0 です')),
  K('仕事',['{k}(個|台|件|枚|本)(を)?{h}(?<tu>時間|分)(で|に)(作る|作った|できる|できた|処理|処理する|生産|仕上げる)(と|なら|ときの|の)?(1時間あたり|時間あたり|1時間に|時間に|1分あたり|分あたり)(何個|何件|いくつ|生産性)?'], (n,g,t)=>{ const perMin=/1分|分あたり/.test(t.slice(t.lastIndexOf(String(g.tu)))), hrs=g.tu==='分'?n.h/60:n.h; return hrs?(perMin?[n.k/(hrs*60),'個','1分あたり',fmt(n.k)+' ÷ '+fmt(hrs*60)+'分']:[n.k/hrs,'個','1時間あたり',fmt(n.k)+' ÷ '+fmt(hrs)+'時間']):R_err('時間が 0 です'); }),
  K('仕事',['(在庫|在庫が|在庫数){a}(個|本|枚|台|箱|ケース|袋)?(で|、|あって)?(1日|日に|毎日)(の出荷|に|で)?{b}(個|本|枚|台|箱|ケース|袋)?(ずつ)?(出る|出荷|売れる|使う|減る|出ると|売れると|使うと)?(する|すると|したら|して)?(と|なら)?(、)?(何日|在庫日数|何日分|あと何日)(もつ|分|持つ)?'], n=>n.b?[n.a/n.b,'日','在庫日数',fmt(n.a)+' ÷ '+fmt(n.b)]:R_err('1日の 量が 0 です')),
  K('仕事',['(数量)?{q}(個|台|式|本|枚|m|メートル|平米|㎡)?(×|かける|で)(単価)?{p}円(に|、|で)?(諸経費|経費|管理費|一般管理費){r}<PCT>(を足すと|を乗せると|込みで|込み|の見積|だと|で)?(見積|合計|総額|いくら)?'], n=>{ const a=n.q*n.p; return pOut(a*(1+n.r/100),'円',{a:yen(a*(1+n.r/100))+'（直接費 '+yen(a)+' ＋ 諸経費 '+yen(a*n.r/100)+'）', say:'合わせて '+sayU(a*(1+n.r/100),'円')+' です', f:fmt(n.q)+' × '+yen(n.p)+' × '+fmt(1+n.r/100)}); }),
  K('仕事',['{p}<PCT>(から|が){q}<PCT>(に|へ)(上がる|下がる|上がった|下がった|なる|なった|増える|減る)(と|ら|のは)?(何ポイント|何%ポイント|ポイント|差)'], n=>[n.q-n.p,'ポイント','差',fmt(n.q)+'% − '+fmt(n.p)+'%']),
  // ── 時間・日付 ──
  K('時間',['{h1}時({m1}分|(?<a1>半))?から{h2}時({m2}分|(?<a2>半))?まで(、)?(休憩{r}(?<ru>時間|分))?(の|は|で)?(勤務|働く|働いて|作業|会議|実働|仕事)?(時間|何時間|何分|は何時間)?','{h1}時({m1}分|(?<a1>半))?(〜|～|-|−){h2}時({m2}分|(?<a2>半))?(、)?(休憩{r}(?<ru>時間|分))?'], (n,g)=>{ const s=n.h1*60+(n.m1||0)+(g.a1?30:0), e0=n.h2*60+(n.m2||0)+(g.a2?30:0), e=e0<=s?e0+1440:e0, rest=n.r?(g.ru==='時間'?n.r*60:n.r):0, m=e-s-rest; return m>=0?pOut(m/60,'時間',{a:durHM(m/60)+'（'+fmt(m/60,2)+'時間）', say:durHM(m/60)+' です', f:(rest?'休憩 '+durHM(rest/60)+' を 引く':'')}):R_err('休憩が 長すぎます'); }),
  K('時間',['{h}時間{m}分(は|って|を)?(何時間|小数|時間に直すと|時間で|時間にすると)'], n=>[n.h+n.m/60,'時間','',fmt(n.h)+' ＋ '+fmt(n.m)+' ÷ 60']),
  K('時間',['{x}時間(は|って|を)?(何時間何分|時間と分|何時間と何分)'], n=>T(durHM(n.x)+' です', durHM(n.x), fmt(n.x)+'時間')),
  K('時間',['{d}日{h}時間(は|って|を)?(何時間)'], n=>[n.d*24+n.h,'時間','',fmt(n.d)+' × 24 ＋ '+fmt(n.h)]),
  K('時間',['(1日){h}時間(を|で|、)?(週|1週間に|週に){d}日(働くと|勤務|で)?(の)?(週|1週間)?(の)?(労働時間|勤務時間|何時間)'], n=>[n.h*n.d,'時間','1週間',fmt(n.h)+' × '+fmt(n.d)]),
  K('時間',['(1日){h}時間(を|で|、)?(月|1か月|ひと月|月に){d}日(働くと|勤務|で)?(の)?(月|1か月)?(の)?(労働時間|勤務時間|何時間)'], n=>[n.h*n.d,'時間','1か月',fmt(n.h)+' × '+fmt(n.d)]),
  K('時間',['(月|1か月|ひと月)?(の)?(労働時間|勤務時間|働いた時間){a}時間(で|、|のうち)?(所定|定時|規定|基準){b}時間(を超えた|を超える|超え|の超過)?(分|残業|残業時間)?(は)?'], n=>[Math.max(0,n.a-n.b),'時間','残業時間',fmt(n.a)+' − '+fmt(n.b)]),
  K('時間',['{y}年{mo}月{d}日(は|って)?<YOUBI>','{mo}月{d}日(は|って)?<YOUBI>'], n=>{ const y=n.y||today().getFullYear(), t=okYMD(y,n.mo,n.d); return t?T(ymdJ(t)+' です', ymdJ(t), ''):R_err('その 日は ありません'); }),
  Object.assign(K('時間',['<KYO>(から)?{k}日(後|あと|先|たったら|後は)(は)?(いつ|何日|何月何日|何曜日)?','<KYO>(から)?{k}日(前)(は)?(いつ|何日|何月何日|何曜日)?'], (n,g,t)=>{ const back=/前/.test(t), d=dOnly(today()); d.setDate(d.getDate()+(back?-n.k:n.k)); return T(ymdJ(d)+' です', ymdJ(d), '今日（'+ymdJ(today())+'）'+(back?'の ':'から ')+fmt(n.k)+'日'+(back?'前':'後')); }), {dt:1}),
  Object.assign(K('時間',['{y}年{mo}月{d}日(から|の){k}日(後|あと|先|前)(は)?(いつ|何日|何月何日|何曜日)?','{mo}月{d}日(から|の){k}日(後|あと|先|前)(は)?(いつ|何日|何月何日|何曜日)?'], (n,g,t)=>{ const y=n.y||today().getFullYear(), s=okYMD(y,n.mo,n.d); if(!s) return R_err('その 日は ありません'); const back=/日前/.test(t), d=new Date(s); d.setDate(d.getDate()+(back?-n.k:n.k)); return T(ymdJ(d)+' です', ymdJ(d), ymdJ(s)+(back?'の ':'から ')+fmt(n.k)+'日'+(back?'前':'後')); }), {dt:1}),
  Object.assign(K('時間',['{y}年{mo}月{d}日まで(あと|残り)?(何日|なんにち|日数)','{mo}月{d}日まで(あと|残り)?(何日|なんにち|日数)'], n=>{ const t0=dOnly(today()); let y=n.y||t0.getFullYear(), d=okYMD(y,n.mo,n.d); if(!d) return R_err('その 日は ありません'); if(!n.y && d<t0) d=okYMD(y+1,n.mo,n.d)||d; const k=dayDiff(t0,d); return pOut(k,'日',{a:'あと '+k+'日（'+ymdJ(d)+'）', say:'あと '+k+'日 です', f:'今日（'+ymdJ(t0)+'）から'}); }), {dt:1}),
  K('時間',['{y1}年{m1}月{d1}日から{y2}年{m2}月{d2}日まで(の)?<HEIJITSU>(は)?(何日|日数)?','{m1}月{d1}日から{m2}月{d2}日まで(の)?<HEIJITSU>(は)?(何日|日数)?'], n=>{ const y=today().getFullYear(), a=okYMD(n.y1||y,n.m1,n.d1), b=okYMD(n.y2||n.y1||y,n.m2,n.d2); if(!a||!b) return R_err('その 日は ありません'); const k=workDays(a,b); return [k,'日','平日（土日を 除く。祝日は 数えて います）',ymdJ(a)+' 〜 '+ymdJ(b)]; }),
  K('時間',['{m1}月{d1}日から{m2}月{d2}日まで(は|の)?(何日|日数|何日間|なんにち)'], n=>{ const y=today().getFullYear(), a=okYMD(y,n.m1,n.d1); let b=okYMD(y,n.m2,n.d2); if(!a||!b) return R_err('その 日は ありません'); if(b<a) b=okYMD(y+1,n.m2,n.d2)||b; const k=dayDiff(a,b); return pOut(k,'日',{a:k+'日（その日も 入れると '+(k+1)+'日間）', say:k+'日 です', f:ymdJ(a)+' 〜 '+ymdJ(b)}); }),
  K('時間',['{y}年(は|って)?(うるう年|閏年|うるうどし)(ですか|か|なの|かな)?'], n=>{ const y=n.y, l=(y%4===0 && y%100!==0) || y%400===0; return T(y+'年は うるう年'+(l?'です':'では ありません'), l?'うるう年（366日）':'うるう年では ない（365日）', '4で割れて、100で割れない（400で割れれば うるう年）'); }),
  K('時間',['{y}年{mo}月(は|って)?(何日まで|何日ある|何日間|日数)'], n=>(n.mo>=1&&n.mo<=12)?[new Date(n.y,n.mo,0).getDate(),'日',n.y+'年'+n.mo+'月','']:R_err('月は 1〜12 です')),
  K('時間',['{mo}月(は|って)?(何日まで|何日ある|何日間)'], n=>(n.mo>=1&&n.mo<=12)?[new Date(today().getFullYear(),n.mo,0).getDate(),'日',today().getFullYear()+'年'+n.mo+'月','']:R_err('月は 1〜12 です')),
  K('時間',['{y}年{mo}月{d}日(は|って)?(その年|年)?(の)?(何日目|何番目の日)'], n=>{ const t=okYMD(n.y,n.mo,n.d); return t?[dayDiff(new Date(n.y,0,1),t)+1,'日目','',n.y+'年1月1日から']:R_err('その 日は ありません'); }),
  K('時間',['{y}年{mo}月{d}日(は|って)?(第何週|何週目)'], n=>{ const t=okYMD(n.y,n.mo,n.d); if(!t) return R_err('その 日は ありません'); const f=new Date(n.y,n.mo-1,1).getDay(); return [Math.ceil((n.d+f)/7),'週目',n.mo+'月の','日曜はじまり']; }),
  K('時間',['{a}分(は|って|を)?(何時間|時間に直すと|時間で|何時間何分)'], n=>pOut(n.a/60,'時間',{a:durHM(n.a/60)+'（'+fmt(n.a/60,3)+'時間）', say:durHM(n.a/60)+' です', f:fmt(n.a)+' ÷ 60'})),
  K('時間',['{a}秒(は|って|を)?(何分|分に直すと|何分何秒)'], n=>{ const m=Math.floor(n.a/60), s=+(n.a-m*60).toFixed(3); return pOut(n.a/60,'分',{a:(m?m+'分':'')+(s||!m?s+'秒':''), say:(m?m+'分':'')+(s||!m?s+'秒':'')+' です', f:fmt(n.a)+' ÷ 60'}); }),
  K('時間',['(起きる|起床|起きたい)(のが|時間が|時刻が|は)?{h}時({m}分|(?<a>半))?(なら|だと|の場合|で)(、)?(何時に|いつ)?(寝る|寝れば|寝たら|寝ると|眠る)(と)?(いい|良い)?','{h}時({m}分|(?<a>半))?に(起きる|起きたい)(なら|には|ためには)(、)?(何時に)?(寝れば|寝る|寝たら)(いい)?'], (n,g)=>{ const w=n.h*60+(n.m||0)+(g.a?30:0), xs=[6,5,4].map(c=>{ let t=(w-c*90-15+1440)%1440; return Math.floor(t/60)+'時'+String(t%60).padStart(2,'0')+'分（'+c*1.5+'時間）'; }); return T('寝る 時刻の 目安は '+xs[0]+' か '+xs[1]+' です', xs.join(' ／ '), '眠りの ひと区切り 90分 × 回数 ＋ 寝つき 15分（目安）'); }),
  // ── からだ ──
  K('からだ',['(体重)?{w}(キロ|kg)(の人|の人が)?(が|で|の)?<METS@a>(を)?{t}(?<tu>時間|分)(すると|したら|して|で|の|やると|やったら)?(の)?(消費カロリー|消費|カロリー|何キロカロリー|kcal)?','<METS@a>{t}(?<tu>時間|分)(で|の)?(体重)?{w}(キロ|kg)(の人)?(の)?(消費カロリー|カロリー)'], (n,g)=>{ const h=g.tu==='分'?n.t/60:n.t, m=METS[g.a]; return [m*n.w*h*1.05,'kcal',g.a+'（'+m+'メッツ）',m+' × '+fmt(n.w)+'kg × '+fmt(h,3)+'時間 × 1.05']; }),
  K('からだ',['(身長){h}(センチ|cm)(の人|で|、)?(の)?(歩幅)','(身長){h}(センチ|cm)(で|の人が|、)?{k}歩(歩くと|歩いたら|で|は)?(何キロ|何メートル|距離|どのくらい)?'], n=>{ const st=n.h*0.45/100; return n.k ? pOut(st*n.k,'m',{a:st*n.k>=1000?fmt(st*n.k/1000,2)+'km':fmt(st*n.k,0)+'m', say:(st*n.k>=1000?fmt(st*n.k/1000,2)+'キロ':fmt(st*n.k,0)+'メートル')+' です', f:'歩幅 '+fmt(st*100,1)+'cm（身長 × 0.45）× '+fmt(n.k)+'歩'}) : [st*100,'cm','歩幅（身長 × 0.45 の 目安）','']; }),
  K('からだ',['{k}歩(は|って|歩くと|で)?(何キロ|何メートル|距離|どのくらい)(歩いた|歩く|進む)?'], n=>pOut(n.k*0.7,'m',{a:fmt(n.k*0.7/1000,2)+'km', say:fmt(n.k*0.7/1000,2)+'キロ です', f:'歩幅 70cm の 目安 × '+fmt(n.k)+'歩'})),
  K('からだ',['{a}(歳|才)(の人|で)?(の)?(最大心拍数|最大心拍)','{a}(歳|才)(の人|で)?(の)?(目標心拍数|脂肪燃焼|脂肪燃焼の心拍数|目標心拍)(は)?(安静時(心拍)?{r})?'], (n,g,t)=>{ const mx=220-n.a; if(/最大/.test(t)) return [mx,'拍/分','最大心拍数（目安）','220 − '+fmt(n.a)]; const r=n.r||65; return pOut(r+(mx-r)*0.6,'拍/分',{a:fmt(r+(mx-r)*0.5,0)+'〜'+fmt(r+(mx-r)*0.7,0)+' 拍/分', say:fmt(r+(mx-r)*0.5,0)+'から'+fmt(r+(mx-r)*0.7,0)+' です', f:'カルボーネン法 50〜70%（安静時 '+r+'）'}); }),
  K('からだ',['(体重){w}(キロ|kg)(の人|で|、)?(の)?(1日の)?(水分|飲む水|水分量|必要な水)(は)?','(体重){w}(キロ|kg)(の人)?(は)?(1日)?(何リットル)(水を)?(飲めば|飲む)'], n=>[n.w*35/1000,'L','1日の 水分（35ml × 体重 の 目安）',fmt(n.w)+'kg × 35ml']),
  K('からだ',['<SEI@s>(性)?(、|で)?{a}(歳|才)(、|で)?(身長){h}(センチ|cm)(、|で)?(体重){w}(キロ|kg)(の)?(基礎代謝|基礎代謝量)','(身長){h}(センチ|cm)(、|で)?(体重){w}(キロ|kg)(、|で)?{a}(歳|才)(の)?<SEI@s>(性)?(の)?(基礎代謝|基礎代謝量)'], (n,g)=>{ const man=/男|おとこ/.test(g.s), v=man ? 13.397*n.w+4.799*n.h-5.677*n.a+88.362 : 9.247*n.w+3.098*n.h-4.33*n.a+447.593; return [v,'kcal','基礎代謝（ハリス・ベネディクトの 式。目安）','']; }),
  K('からだ',['(体重){w}(キロ|kg)(で|、)?(体脂肪率|体脂肪){p}<PCT>(の)?(体脂肪量|脂肪の量|脂肪|除脂肪体重|筋肉など)'], (n,g,t)=>/除脂肪|筋肉/.test(t)?[n.w*(1-n.p/100),'kg','除脂肪体重',fmt(n.w)+' × (1 − '+fmt(n.p)+'%)']:[n.w*n.p/100,'kg','体脂肪量',fmt(n.w)+' × '+fmt(n.p)+'%']),
  K('からだ',['(体重を|体重)?{k}(キロ|kg)(減らす|やせる|痩せる|落とす)(には|のに|ため)?(、)?(何キロカロリー|カロリー|何kcal)?','脂肪{k}(キロ|kg)(は|って)?(何キロカロリー|カロリー|何kcal)'], n=>[n.k*7200,'kcal','脂肪 1kg ＝ 7200kcal の 目安',fmt(n.k)+' × 7200']),
  // ── くるま ──
  K('くるま',['(時速)?{v}(キロ|km)(で走る|で走っている|で走ってる|の)?(車|くるま)?(の)?(停止距離|止まるまでの距離|ブレーキ|止まれる距離)'], n=>{ const a=n.v/3.6*0.75, b=n.v*n.v/(254*0.7); return pOut(a+b,'m',{a:fmt(a+b,0)+'m（空走 '+fmt(a,0)+'m ＋ 制動 '+fmt(b,0)+'m）', say:'約'+fmt(a+b,0)+'メートル です', f:'反応 0.75秒・乾いた 道（摩擦 0.7）の 目安'}); }),
  K('くるま',['(時速)?{v}(キロ|km)(の)?(とき|時)?(の)?(車間距離|車間)'], n=>[n.v/3.6*2,'m','2秒 あける 目安',fmt(n.v)+' ÷ 3.6 × 2秒']),
  K('くるま',['(燃費)?{k}(キロ|km)(パー|/|毎)(リットル|L)(は)?(100キロ|100km)(あたり|で)?(何リットル)?','(リッター){k}(キロ|km)(は)?(100キロ|100km)(あたり|で)(何リットル)'], n=>n.k?[100/n.k,'L','100kmあたり','100 ÷ '+fmt(n.k)]:R_err('燃費が 0 です')),
  K('くるま',['(100キロ|100km)(あたり|で){l}(リットル|L)(は|の燃費は|の)?(リッター|1リットルで)?(何キロ|燃費)'], n=>n.l?[100/n.l,'km/L','燃費','100 ÷ '+fmt(n.l)]:R_err('0 では割れません')),
  K('くるま',['{w}/{a}R{d}(の)?(タイヤ)?(の)?(外径|直径|大きさ|外周)','タイヤ{w}/{a}R{d}(の)?(外径|直径|外周)'], (n,g,t)=>{ const D=n.d*25.4+2*n.w*n.a/100; return /外周/.test(t) ? [D*PI,'mm','外周',fmt(D,1)+'mm × π'] : [D,'mm','外径',fmt(n.d)+'インチ × 25.4 ＋ 2 × '+fmt(n.w)+' × '+fmt(n.a)+'%']; }),
  K('くるま',['(年間|1年に|年){k}(キロ|km)(走る|走って|走ると|乗る|乗って)?(、|で)?(燃費){e}(キロ|km)(で|、)?(ガソリン|レギュラー|ハイオク|軽油)?(1リットル|リッター)?{p}円(なら|だと|の)?(年間)?(の)?(ガソリン代|燃料代|ガソリン)?'], n=>n.e?[n.k/n.e*n.p,'円','1年の ガソリン代',fmt(n.k)+'km ÷ '+fmt(n.e)+' × '+yen(n.p)]:R_err('燃費が 0 です')),
  // ── 畑 ──
  K('畑',['{s}(平米|㎡)(に|を|の畑に)?(株間|かぶま){a}(センチ|cm)(、|で|と)?(条間|うね幅|畝幅|列の間){b}(センチ|cm)(で)?(植えると|植える|植えたら)?(の)?(株数|何株|苗の数|何本)?'], n=>(n.a&&n.b)?[Math.floor(n.s/((n.a/100)*(n.b/100))),'株','株数',fmt(n.s)+'㎡ ÷ ('+fmt(n.a/100)+'m × '+fmt(n.b/100)+'m)']:R_err('間が 0 です')),
  K('畑',['(10アール|10a|1反)(あたり|に)?{k}(キロ|kg)(の)?(肥料|堆肥|石灰|種|農薬)?(を|で)?(、)?{s}(平米|㎡)(に|では|なら|だと)?(は)?(何キロ|何グラム|量)?','{s}(平米|㎡)(に)?(10アール|10a|1反)(あたり){k}(キロ|kg)'], n=>pOut(n.k*n.s/1000,'kg',{a:n.k*n.s/1000<1?fmt(n.k*n.s,0)+'g':fmt(n.k*n.s/1000,2)+'kg', say:(n.k*n.s/1000<1?fmt(n.k*n.s,0)+'グラム':fmt(n.k*n.s/1000,2)+'キロ')+' です', f:fmt(n.k)+'kg ÷ 1000㎡ × '+fmt(n.s)+'㎡'})),
  K('畑',['(1平米|1㎡|平米)(あたり|に){k}(グラム|g)(の)?(肥料|石灰|堆肥|種)?(を|で)?(、)?(10アール|10a|1反)(あたり|では|なら|だと|に)?(は)?(何キロ|量)?'], n=>[n.k,'kg','10aあたり（'+fmt(n.k)+'g × 1000㎡）','']),
  K('畑',['{s}(平米|㎡)(で|から)?{k}(キロ|kg)(とれた|収穫|採れた|取れた)(と|ら|とき)?(の)?(10アール|10a|1反)(あたり|に直すと|では)?(の)?(収量|収穫量|何キロ)?'], n=>n.s?[n.k/n.s*1000,'kg','10aあたりの 収量',fmt(n.k)+' ÷ '+fmt(n.s)+' × 1000']:R_err('広さが 0 です'))
);
/* ── v9 の 2つめ：材料の 数・会社の 計算・時差・学年・干支・星座・長寿の お祝い ── */
const TZ={ニューヨーク:-14,ワシントン:-14,ロサンゼルス:-17,サンフランシスコ:-17,シアトル:-17,シカゴ:-15,ハワイ:-19,ホノルル:-19,ロンドン:-9,パリ:-8,ベルリン:-8,ローマ:-8,マドリード:-8,モスクワ:-6,ドバイ:-5,インド:-3.5,デリー:-3.5,バンコク:-2,ハノイ:-2,ジャカルタ:-2,シンガポール:-1,北京:-1,上海:-1,香港:-1,台北:-1,台湾:-1,ソウル:0,韓国:0,シドニー:1,グアム:1,ニュージーランド:3,オークランド:3};
PW.TZ=Object.keys(TZ);
const ETO='子丑寅卯辰巳午未申酉戌亥', ETO_Y='ね・うし・とら・う・たつ・み・うま・ひつじ・さる・とり・いぬ・い'.split('・'), ETO_A='ねずみ・うし・とら・うさぎ・たつ・へび・うま・ひつじ・さる・とり・いぬ・いのしし'.split('・');
const JIKKAN='甲乙丙丁戊己庚辛壬癸';
const SEIZA=[[1,20,'やぎ座'],[2,19,'みずがめ座'],[3,21,'うお座'],[4,20,'おひつじ座'],[5,21,'おうし座'],[6,22,'ふたご座'],[7,23,'かに座'],[8,23,'しし座'],[9,23,'おとめ座'],[10,24,'てんびん座'],[11,23,'さそり座'],[12,22,'いて座'],[13,1,'やぎ座']];
const CHOJU=[[60,'還暦'],[70,'古希'],[77,'喜寿'],[80,'傘寿'],[88,'米寿'],[90,'卒寿'],[99,'白寿'],[100,'百寿']];
PW.CHOJU=CHOJU.map(x=>x[1]);
PW.BOARD=['合板','ベニヤ','コンパネ','石膏ボード','ボード','構造用合板','板'];
PHRASES.push(
  K('現場',['{s}(平米|㎡)(に|を|の床に|の壁に)?(サブロク|3×6|3x6|さぶろく)?(の)?<BOARD>(は|を張ると|を貼ると|で)?(何枚|枚数)'], n=>[Math.ceil(n.s/(0.91*1.82)-1e-9),'枚','3×6（910×1820）','面積 ÷ 1.656㎡ を 切り上げ']),
  K('現場',['{s}(平米|㎡)(に|を)?(砂利|砕石|砂|土)(を)?(厚さ|厚み|深さ){t}(センチ|cm)(で)?(敷く|敷くと|入れると|まくと|敷いたら)?(と)?(の)?(量|何立米|体積|何トン|重さ)?'], (n,g,t)=>{ const z=(t.match(/砂利|砕石|砂|土/)||['砂利'])[0], v=n.s*n.t/100; return pOut(v,'㎥',{a:fmt(v,3)+'㎥（約'+fmt(v*DENS[z],2)+'t）', say:fmt(v,2)+' 立米、約'+fmt(v*DENS[z],1)+'トン です', f:fmt(n.s)+'㎡ × '+fmt(n.t/100)+'m（'+z+' 比重 '+DENS[z]+'）'}); }),
  K('現場',['{v}(立米|㎥)(の)?(砂|砂利|砕石|土|セメント|モルタル)(は|を)?{k}(キロ|kg)(袋|入りの袋)(で)?(何袋)?'], (n,g,t)=>{ const z=(t.match(/砂利|砕石|砂|土/)||[''])[0], d=z?DENS[z]:1.5; return [Math.ceil(n.v*d*1000/n.k-1e-9),'袋',(z||'材料')+'（比重 '+d+'）',fmt(n.v)+'㎥ × '+d+' × 1000 ÷ '+fmt(n.k)+'kg']; }),
  K('現場',['(長さ){L}(メートル|m)(、|で)?(高さ){h}(センチ|cm|メートル|m)(の)?(ブロック塀|ブロック|ブロックの壁)(は|の)?(ブロック)?(何個|何枚|個数|数)?'], (n,g,t)=>{ const h=/センチ|cm/.test(t)?n.h/100:n.h; return [Math.ceil(n.L/0.4-1e-9)*Math.ceil(h/0.2-1e-9),'個','ブロック（1個 400×200 の 目安）','長さ ÷ 0.4 × 高さ ÷ 0.2']; }),
  K('仕事',['{a}円(の|を|で買った)?(機械|車|パソコン|設備|もの)?(を|の|で)?(、)?耐用年数{y}年(で|の)?(定額法)?(の|で)?(減価償却|償却)(費)?(は)?(1年|年間|毎年)?(いくら)?'], n=>n.y?[n.a/n.y,'円','1年の 減価償却費（定額法・残りを 0 と して）',yen(n.a)+' ÷ '+fmt(n.y)+'年']:R_err('年数が 0 です')),
  K('仕事',['{k}(キロ|km)(を|の)?(1キロあたり|1kmあたり|キロあたり|キロ){p}円(で)?(の)?(精算|ガソリン代|交通費|手当)?(すると|は|なら)?'], n=>[n.k*n.p,'円','精算',fmt(n.k)+'km × '+yen(n.p)]),
  K('仕事',['{y}年{mo}月(に)?(入社|就職|勤め始め|勤めはじめ|入った)(で|なら|だと|の人は|して)?(、)?(今|いま)?(勤続|勤めて)?(何年|何年目|年数)?'], n=>{ const t=today(); let m=(t.getFullYear()-n.y)*12+(t.getMonth()+1-n.mo); if(m<0) return R_err('まだ 先の 日です'); return pOut(m/12,'年',{a:'勤続 '+Math.floor(m/12)+'年'+(m%12?m%12+'か月':'')+'（'+(Math.floor(m/12)+1)+'年目）', say:Math.floor(m/12)+'年'+(m%12?m%12+'か月':'')+' です', f:n.y+'年'+n.mo+'月 から 今月まで'}); }),
  K('時差',['(日本|東京|日本時間)(が|で)?{h}時({m}分)?(の|のとき|なら|だと|の時)(、)?<TZ@c>(は|って|では)?(何時|なんじ|いつ)?'], (n,g)=>{ const off=TZ[g.c]; let t=n.h*60+(n.m||0)+off*60; const day=t<0?'前の日の ':t>=1440?'次の日の ':''; t=((t%1440)+1440)%1440; const s=day+Math.floor(t/60)+'時'+(t%60?t%60+'分':''); return T(g.c+'は '+s+' です（夏時間は 入れて いません）', s, '日本との 時差 '+(off>0?'＋':'')+off+'時間'); }),
  K('時差',['<TZ@c>(が|で)?{h}時({m}分)?(の|のとき|なら|だと|の時)(、)?(日本|東京)(は|って|では)?(何時|なんじ|いつ)?'], (n,g)=>{ const off=TZ[g.c]; let t=n.h*60+(n.m||0)-off*60; const day=t<0?'前の日の ':t>=1440?'次の日の ':''; t=((t%1440)+1440)%1440; const s=day+Math.floor(t/60)+'時'+(t%60?t%60+'分':''); return T('日本は '+s+' です（夏時間は 入れて いません）', s, '日本との 時差 '+(off>0?'＋':'')+off+'時間'); }),
  K('時差',['(日本|東京)と<TZ@c>(の)?時差','<TZ@c>(と|の)(日本|東京)(の|との)?時差'], (n,g)=>{ const o=TZ[g.c]; return T(g.c+'は 日本より '+Math.abs(o)+'時間 '+(o<0?'遅れて':'進んで')+'います（夏時間は 入れて いません）', (o>0?'＋':o<0?'−':'')+Math.abs(o)+'時間', ''); }),
  K('こよみ',['{y}年(の|は)?(干支|えと)','{y}年生まれ(の人)?(の)?(干支|えと)'], n=>{ const i=((n.y-4)%12+12)%12, j=((n.y-4)%10+10)%10; return T(n.y+'年は '+JIKKAN[j]+ETO[i]+'、'+ETO_A[i]+'どし です', JIKKAN[j]+ETO[i]+'（'+ETO_Y[i]+'・'+ETO_A[i]+'）', ''); }),
  K('こよみ',['{mo}月{d}日(生まれ)?(の人)?(の|は)?(星座)'], n=>{ if(!okYMD(2000,n.mo,n.d)) return R_err('その 日は ありません'); let z=''; for(const [m,d,s] of SEIZA){ if(n.mo<m || (n.mo===m && n.d<d)){ z=s; break; } } return T(n.mo+'月'+n.d+'日 生まれは '+z+' です', z, '星占いの 区切り（年に よって 1日 ずれる ことが あります）'); }),
  K('こよみ',['{y}年{mo}月{d}日(生まれ)(の人|の子|の子ども)?(は)?(今|いま)?(何年生|学年|何年|何歳児)'], n=>{ const b=okYMD(n.y,n.mo,n.d); if(!b) return R_err('その 日は ありません'); const t=today(), sy=t.getMonth()+1>=4 ? t.getFullYear() : t.getFullYear()-1, ent=n.y+6+((n.mo>4 || (n.mo===4 && n.d>=2)) ? 1 : 0), g=sy-ent+1;
    const s=g<1 ? 'まだ 小学校の 前（'+(ent-sy)+'年後の 4月に 小学1年生）' : g<=6 ? '小学'+g+'年生' : g<=9 ? '中学'+(g-6)+'年生' : g<=12 ? '高校'+(g-9)+'年生' : g<=16 ? '大学'+(g-12)+'年生（にあたる 学年）' : '学校を 出た 年ごろ';
    return T(s+' です', s, '日本の 学年（4月2日〜翌年4月1日 生まれが 同じ 学年）'); }),
  K('こよみ',['{y}年生まれ(の人)?(の)?<CHOJU@k>(は)?(いつ|何年|何歳)?','<CHOJU@k>(は)?(何歳|なんさい)'], (n,g)=>{ const a=CHOJU.find(x=>x[1]===g.k)[0]; return n.y!=null ? T(g.k+'（'+a+'歳）は '+(n.y+a)+'年 です', (n.y+a)+'年（'+a+'歳）', '満年齢の 目安（還暦 以外は 数え年で 祝う ことも あります）') : [a,'歳',g.k,'']; }),
  K('時間',['{n}日(は|って)?(何週間|何週|何週と何日|何週間と何日)'], n=>{ const w=Math.floor(n.n/7), d=n.n-w*7; return pOut(n.n/7,'週',{a:w+'週間'+(d?d+'日':''), say:w+'週間'+(d?d+'日':'')+' です', f:fmt(n.n)+' ÷ 7'}); }),
  K('時間',['(誕生日|記念日|結婚記念日)(が|は)?{mo}月{d}日(なら|だと|で)?(、)?(あと|まで)?(あと)?(何日|なんにち)'], n=>{ const t0=dOnly(today()); let d=okYMD(t0.getFullYear(),n.mo,n.d); if(!d) return R_err('その 日は ありません'); if(d<t0) d=okYMD(t0.getFullYear()+1,n.mo,n.d)||d; const k=dayDiff(t0,d); return pOut(k,'日',{a:k?'あと '+k+'日（'+ymdJ(d)+'）':'今日です！', say:k?'あと '+k+'日 です':'今日です', f:'今日（'+ymdJ(t0)+'）から'}); })
);
function placeName(pl){ return ({1:'一の位',10:'十の位',100:'百の位',1000:'千の位',10000:'一万の位',100000:'十万の位'})[pl]||pl+'の位'; }
function rmName(m){ return /四捨/.test(m)?'四捨五入':/上/.test(m)?'切り上げ':'切り捨て'; }
function fmtClock(min){ const h=Math.floor(min/60), m=min-h*60; return h+'時'+(m?m+'分':''); }
/* 源泉徴収（報酬・料金）：100万円までは 10.21%、こえた分は 20.42% */
function gensen(a){ return a<=1e6 ? a*0.1021 : 1e6*0.1021+(a-1e6)*0.2042; }
function gensenF(a){ return a<=1e6 ? fmtU(a,'円')+' × 10.21%' : '100万円 × 10.21% ＋ '+fmtU(a-1e6,'円')+' × 20.42%'; }

/* ── 単位の換算：「5キロは何メートル」「30坪は何平米」「90分は何時間」 ── */
const CONV=[
  // [分類, 名前, 基準に対する大きさ, 言い方…]
  ['長さ','mm',0.001,['mm','ミリ','ミリメートル','㎜']], ['長さ','cm',0.01,['cm','センチ','センチメートル','㎝']], ['長さ','m',1,['m','メートル','メーター']],
  ['長さ','km',1000,['km','キロ','キロメートル','㎞']], ['長さ','インチ',0.0254,['インチ']], ['長さ','フィート',0.3048,['フィート','フット']], ['長さ','ヤード',0.9144,['ヤード']],
  ['長さ','マイル',1609.344,['マイル']], ['長さ','寸',1/33,['寸']], ['長さ','尺',10/33,['尺']], ['長さ','間',60/33,['間']], ['長さ','里',12960/3.3,['里']], ['長さ','海里',1852,['海里','カイリ']],
  ['重さ','mg',0.001,['mg','ミリグラム']], ['重さ','g',1,['g','グラム']], ['重さ','kg',1000,['kg','キロ','キログラム','㎏']], ['重さ','トン',1e6,['t','トン']],
  ['重さ','ポンド',453.59237,['ポンド','lb']], ['重さ','オンス',28.349523125,['オンス','oz']], ['重さ','貫',3750,['貫','貫目']], ['重さ','斤',600,['斤']], ['重さ','匁',3.75,['匁','もんめ']],
  ['広さ','cm²',1e-4,['平方センチ','平方センチメートル','㎠','cm2']], ['広さ','㎡',1,['平米','平方メートル','㎡','m2','へいべい']], ['広さ','km²',1e6,['平方キロ','平方キロメートル','㎢','km2']],
  ['広さ','アール',100,['アール']], ['広さ','ヘクタール',1e4,['ヘクタール','ha']], ['広さ','坪',400/121,['坪','つぼ']], ['広さ','畳',1.62,['畳','じょう']],
  ['広さ','畝',3000/121,['畝']], ['広さ','反',300*400/121,['反','反歩']], ['広さ','町',3000*400/121,['町','町歩']], ['広さ','エーカー',4046.8564224,['エーカー']],
  ['かさ','ml',1,['ml','ミリリットル','mL','cc','シーシー','ミリ']], ['かさ','dl',100,['dl','デシリットル','dL']], ['かさ','L',1000,['L','l','リットル','リッター','ℓ']],
  ['かさ','㎥',1e6,['立米','立方メートル','㎥','m3']], ['かさ','合',180.39,['合']], ['かさ','升',1803.9,['升']], ['かさ','斗',18039,['斗']], ['かさ','ガロン',3785.41,['ガロン']],
  ['かさ','カップ',200,['カップ','計量カップ']], ['かさ','大さじ',15,['大さじ','大匙']], ['かさ','小さじ',5,['小さじ','小匙']],
  ['時間','秒',1,['秒']], ['時間','分',60,['分']], ['時間','時間',3600,['時間']], ['時間','日',86400,['日']], ['時間','週',604800,['週間','週']],
  ['時間','か月',86400*365/12,['か月','ヶ月','カ月','ヵ月']], ['時間','年',86400*365,['年']],
  ['データ','バイト',1,['バイト','B']], ['データ','KB',1024,['KB','キロバイト']], ['データ','MB',1024**2,['MB','メガ','メガバイト']], ['データ','GB',1024**3,['GB','ギガ','ギガバイト']], ['データ','TB',1024**4,['TB','テラ','テラバイト']],
];
/* v9：圧力・エネルギー・仕事率・カラット など */
CONV.push(
  ['長さ','μm',1e-6,['μm','ミクロン','マイクロメートル']], ['長さ','光年',9.4607e15,['光年']], ['長さ','ノット距離',1852,['ノットマイル']],
  ['重さ','カラット',0.2,['カラット','ct']], ['重さ','μg',1e-6,['μg','マイクログラム']],
  ['圧力','Pa',1,['Pa','パスカル']], ['圧力','hPa',100,['hPa','ヘクトパスカル']], ['圧力','kPa',1000,['kPa','キロパスカル']], ['圧力','MPa',1e6,['MPa','メガパスカル']],
  ['圧力','気圧',101325,['気圧','atm']], ['圧力','mmHg',133.322,['mmHg','ミリ水銀']], ['圧力','bar',1e5,['bar','バール']], ['圧力','psi',6894.76,['psi','PSI']], ['圧力','kgf/cm²',98066.5,['kgf/cm2','キロ毎平方センチ']],
  ['エネルギー','J',1,['J','ジュール']], ['エネルギー','kJ',1000,['kJ','キロジュール']], ['エネルギー','cal',4.184,['cal','カロリー']], ['エネルギー','kcal',4184,['kcal','キロカロリー']],
  ['エネルギー','Wh',3600,['Wh','ワットアワー','ワット時']], ['エネルギー','kWh',3.6e6,['kWh','キロワットアワー','キロワット時']],
  ['仕事率','W',1,['W','ワット']], ['仕事率','kW',1000,['kW','キロワット']], ['仕事率','馬力',735.5,['馬力','PS']],
  ['データ','ビット',0.125,['ビット','bit']], ['データ','PB',1024**5,['PB','ペタバイト']]
);
const CONV_WORDS=[].concat(...CONV.map(c=>c[3])).filter((w,i,a)=>a.indexOf(w)===i).sort((a,b)=>b.length-a.length);
function convCands(w){ return CONV.filter(c=>c[3].includes(w)); }
function convBase(w){ const c=convCands(w)[0]; return c?{k:c[0], f:c[2], n:c[1]}:null; }
const CONV_ALT='(?:'+CONV_WORDS.map(phraseEsc).join('|')+')';
const CONV_PATS=[
  '^(?<a>'+PNUM+')(?<f>'+CONV_ALT+')(?:は|って|が|を|だと|なら)?(?:何|なん)(?<t>'+CONV_ALT+')(?:に|で|くらい|ぐらい)?(?:なる|なります)?$',
  '^(?<a>'+PNUM+')(?<f>'+CONV_ALT+')を(?<t>'+CONV_ALT+')(?:に|で|へ)(?:直す|直して|直すと|直|換算|換算すると|変換|変換すると|すると|したら|なおすと|なおして)?$',
  '^(?<a>'+PNUM+')(?<f>'+CONV_ALT+')(?:は|って)?(?<t>'+CONV_ALT+')(?:で|だと|では|に直すと|にすると)(?:何|なん|いくつ|いくら|どれくらい|どのくらい)?$',
].map(s=>new RegExp(s));
function hConvert(t){
  t=t.replace(/(大さじ|大匙|小さじ|小匙|カップ|計量カップ)(\d+(?:\.\d+)?)杯?/,'$2$1').replace(/(\d+(?:\.\d+)?)(カップ)杯/,'$1$2');
  for(const re of CONV_PATS){
    const m=t.match(re); if(!m) continue;
    const a=+m.groups.a, F=convCands(m.groups.f), T=convCands(m.groups.t);
    let pair=null;
    for(const f of F){ for(const x of T){ if(f[0]===x[0] && f[1]!==x[1]){ pair=[f,x]; break; } } if(pair) break; }
    if(!pair) return R_err(m.groups.f+' と '+m.groups.t+' は換算できません');
    const [f,x]=pair, v=a*f[2]/x[2];
    const say=(x[0]==='時間' && x[1]==='時間' && Math.abs(v-Math.round(v))>1e-9) ? durSay(Math.round(v*60))+'（'+fmt(v,2)+'時間）' : fmt(v)+m.groups.t;
    return R_ok(fmt(a)+m.groups.f+' は '+say+' です', fmt(v)+m.groups.t+(x[1]==='時間'&&Math.abs(v-Math.round(v))>1e-9?'（'+durSay(Math.round(v*60))+'）':''),
      fmt(a)+m.groups.f+' × '+fmt(f[2]/x[2],6)+(f[0]==='データ'?'（1024 で計算）':'')+(x[1]==='畳'||f[1]==='畳'?'（1畳＝1.62㎡）':''), {v, u:m.groups.t});
  }
  return null;
}
/* 速さの換算・温度 */
function hConvertSpecial(t){
  let m;
  if((m=t.match(/^(?<sp>時速|分速|秒速)(?<s>\d+(?:\.\d+)?)(?<su>キロ|km|キロメートル|メートル|m)?(?:は|って|を)?(?<to>時速|分速|秒速)(?:で)?(?:何|なん)?(?<tu>キロ|km|キロメートル|メートル|m)?(?:に|で)?(?:直すと|すると|直して)?$/)) ||
     (m=t.match(/^(?<sp>時速|分速|秒速)(?<s>\d+(?:\.\d+)?)(?<su>キロ|km|キロメートル|メートル|m)?(?:は|って|を)?(?:何|なん)?(?<to>ノット|マッハ)(?:に|で)?(?:直すと|すると)?$/)) ||
     (m=t.match(/^(?<s>\d+(?:\.\d+)?)(?<sp>ノット)(?:は|って|を)?(?<to>時速|分速|秒速)(?:で)?(?:何|なん)?(?<tu>キロ|km|キロメートル|メートル|m)?$/))){
    const g=m.groups;
    const mps=g.sp==='ノット'?(+g.s)*1852/3600:speedMps(g.sp,+g.s,g.su);
    let v, u;
    if(g.to==='ノット'){ v=mps*3600/1852; u='ノット'; }
    else if(g.to==='マッハ'){ v=mps/340; u=''; }
    else { const km=g.tu?/^(キロ|km|キロメートル)$/.test(g.tu):g.to==='時速'; v=mps*(g.to==='時速'?3600:g.to==='分速'?60:1)/(km?1000:1); u=km?'km':'m'; }
    const lab=g.to==='マッハ'?'マッハ '+fmt(v,2):g.to==='ノット'?fmt(v,2)+'ノット':g.to+' '+fmtU(v,u);
    return R_ok(lab+' です', lab, (g.sp==='ノット'?g.s+'ノット':g.sp+g.s+(g.su||''))+' → 秒速 '+fmt(mps,4)+'m'+(g.to==='マッハ'?'（音の速さ 340m/秒）':''), {v, u});
  }
  if((m=t.match(/^(?:摂氏|せっし)?(?<c>-?\d+(?:\.\d+)?)(?:度|℃|°C)(?:は|って|を)?(?:華氏|かし)(?:で)?(?:何|なん)?(?:度)?(?:に|で)?(?:直すと|すると)?$/))){
    const c=+m.groups.c, v=c*9/5+32; return R_ok('華氏 '+fmt(v,1)+'度 です', '華氏 '+fmt(v,1)+'°F', fmt(c)+' × 9/5 ＋ 32', {v, u:'°F'});
  }
  if((m=t.match(/^(?:華氏|かし)?(?<f>-?\d+(?:\.\d+)?)(?:度F|°F|F)(?:は|って|を)?(?:摂氏|せっし)?(?:で)?(?:何|なん)?(?:度|℃)?(?:に|で)?(?:直すと|すると)?$/))){
    const f=+m.groups.f, v=(f-32)*5/9; return R_ok('摂氏 '+fmt(v,1)+'度 です', '摂氏 '+fmt(v,1)+'℃', '('+fmt(f)+' − 32) × 5/9', {v, u:'℃'});
  }
  if((m=t.match(/^(?:華氏|かし)(?<f>-?\d+(?:\.\d+)?)(?:度|°F)(?:は|って|を)?(?:摂氏|せっし)?(?:で)?(?:何|なん)?(?:度)?(?:に|で)?(?:直すと|すると)?$/))){
    const f=+m.groups.f, v=(f-32)*5/9; return R_ok('摂氏 '+fmt(v,1)+'度 です', '摂氏 '+fmt(v,1)+'℃', '('+fmt(f)+' − 32) × 5/9', {v, u:'℃'});
  }
  return null;
}
/* お金を数える：「100円玉が23枚と10円玉が15枚」 */
/* 縦・横・高さ・幅・奥行き などを 好きな順で 言ったとき（v24）：3つで体積・2つで面積。
   「横を1.5m」のような 助詞も よい。体積なのに 2つしかない・数のない言葉（「幅」）が 残ったら、何がいるかを 言う */
const DIM_LABEL='横幅|よこはば|縦|たて|横|よこ|高さ|たかさ|幅|はば|奥行き|奥行|おくゆき|深さ|ふかさ|長さ|ながさ|厚さ|厚み|あつさ';
const DIM_RE=new RegExp('('+DIM_LABEL+')(?:は|が|を|:)?(?:('+PNUM+')(cm|センチ|mm|ミリ|km|キロ|m|メートル)?)?','g');
const DIM_SEP=/^(?:、|と|で|の|×|かける|が|を|は|,)*$/;
function hDims(s){
  if(!new RegExp('^(?:'+DIM_LABEL+')').test(s)) return null;
  const dims=[]; let miss=null, pos=0, m;
  DIM_RE.lastIndex=0;
  while((m=DIM_RE.exec(s))){
    if(!m[0]){ DIM_RE.lastIndex++; continue; }
    if(m.index>pos && !DIM_SEP.test(s.slice(pos, m.index))) return null;
    if(m[2]==null){ if(miss) return null; miss=m[1]; }
    else dims.push({l:m[1], v:m[2], u:m[3]||''});
    pos=DIM_RE.lastIndex;
  }
  const tail=s.slice(pos).replace(/^(?:、|と|で|の|が|を|は)+/,'');
  const k=tail.match(/^(?:(直方体|箱|部屋|水槽|立方体|タンク|プール|穴|コンテナ)(?:の)?)?(体積|容積|容量|面積|広さ|立米|大きさ)?(?:は|って)?$/);
  if(!k || !dims.length || dims.length>3 || (miss && dims.length!==2)) return null;
  const want=k[2]||'', vol=/体積|容積|容量|立米/.test(want);
  const D=dimsU(dims.map(x=>[x.v, x.u])), lbl=dims.map((x,i)=>x.l+fmt(D.v[i])+(D.u||''));
  if(dims.length===3){
    const v=D.v[0]*D.v[1]*D.v[2], L=D.u==='m'?v*1000:D.u==='cm'?v/1000:null;
    return pOut(v,volU(D.u),{pre:'体積 ', sayPre:'体積は ', a:'体積 '+fmtU(v,volU(D.u))+(L!=null?'（'+fmt(L)+'リットル）':''), f:D.v.map(x=>fmt(x)).join(' × ')});
  }
  if(dims.length===1) return null;   // 1つだけ（「高さ25cm」）は 声の計算帳が 前の答えに つなげる
  const area=D.v[0]*D.v[1], au=areaU(D.u);
  if(miss || vol){
    const w=miss ? '「'+miss+'」の長さ' : 'あと1つ（高さ・奥行き など）の長さ';
    return Object.assign(R_info(w+'も 言ってください', w+'が ありません。'+lbl.join(' × ')+' の面積は '+fmtU(area,au)+' です', '続けて「'+(miss||'高さ')+'30cm」のように言うと 体積にします'),
      {v:area, u:au});
  }
  return pOut(area,au,{pre:'面積 ', sayPre:'面積は ', f:fmt(D.v[0])+' × '+fmt(D.v[1])});
}
/* 「1時間03」「1時間3分」だけ（v24。声の計算帳・表電卓の電卓）：分と時間に直す。「1時間031.03」のように 数が続いたら 候補を出す */
function hHourMin(s){
  let m=s.match(/^(\d+)時間(\d{2})(\d+(?:\.\d+)?)?$/);
  if(m && +m[2]<60){
    const h=+m[1], mi=+m[2], tot=h*60+mi, base=h+'時間'+mi+'分';
    if(m[3]==null) return pOut(tot,'分',{a:tot+'分（'+fmt(tot/60,2)+'時間）', say:base+' は '+tot+'分 です', f:fmt(h)+'時間 × 60 ＋ '+mi+'分'});
    return Object.assign(R_info('「'+m[3]+'」の 使い方が 分かりませんでした', '「'+h+'時間'+m[2]+'」は '+base+'（'+tot+'分）と 読みました。「'+m[3]+'」を どう使うか 分かりませんでした', 'えらんでください'),
      {ideas:[{t:base+m[3]+'秒は何分'},{t:base+'を'+m[3]+'倍'},{t:base+'は何分'}]});
  }
  m=s.match(/^(\d+(?:\.\d+)?)時間(\d+(?:\.\d+)?)分(?:(\d+(?:\.\d+)?)秒)?(?:を|の)(\d+(?:\.\d+)?)倍(?:に|して|すると|したら)?$/);
  if(m){ const tot=(+m[1])*60+(+m[2])+(m[3]?(+m[3])/60:0), k=+m[4], v=tot*k;
    const h=Math.floor(v/60), mi=Math.floor(v-h*60), se=Math.round((v-h*60-mi)*60*10)/10;
    return pOut(v,'分',{a:fmt(v,2)+'分（'+(h?h+'時間':'')+mi+'分'+(se?fmt(se,1)+'秒':'')+'）', say:(h?h+'時間':'')+mi+'分'+(se?fmt(se,0)+'秒':'')+' です', f:fmt(tot,2)+'分 × '+fmt(k)}); }
  m=s.match(/^(\d+(?:\.\d+)?)時間(\d+(?:\.\d+)?)分(?:(\d+(?:\.\d+)?)秒)?(?:(?:は|って|を)?(?:何|なん)(分|時間|秒)(?:に)?)?$/);
  if(m){ const tot=(+m[1])*60+(+m[2])+(m[3]?(+m[3])/60:0), f=fmt(+m[1])+'時間 × 60 ＋ '+fmt(+m[2])+'分'+(m[3]?' ＋ '+fmt(+m[3])+'秒 ÷ 60':'');
    if(m[4]==='時間') return pOut(tot/60,'時間',{a:fmt(tot/60,3)+'時間（'+fmt(tot,2)+'分）', say:fmt(tot/60,3)+'時間 です', f:'('+f+') ÷ 60'});
    if(m[4]==='秒') return pOut(tot*60,'秒',{a:fmt(tot*60,2)+'秒', say:fmt(tot*60,2)+'秒 です', f:'('+f+') × 60'});
    return pOut(tot,'分',{a:fmt(tot,2)+'分（'+fmt(tot/60,3)+'時間）', say:fmt(tot,2)+'分 です', f}); }
  return null;
}
function hCoins(t){
  if(!/^(?:\d+円(?:玉|札)?(?:が|を|×|x)?\d+(?:枚|個|本)?(?:と|、)?)+$/.test(t) || !/(玉|札|枚)/.test(t)) return null;
  const parts=[...t.matchAll(/(\d+)円(?:玉|札)?(?:が|を|×|x)?(\d+)(?:枚|個|本)?/g)];
  if(parts.length===1) return {toks:[{t:'num',v:+parts[0][1],u:'円'},{t:'op',op:'*'},{t:'num',v:+parts[0][2],u:'枚'}]};   // 1種類だけは式として（言い直しできる）
  const v=parts.reduce((a,p)=>a+(+p[1])*(+p[2]),0);
  return pOut(v,'円',{pre:'合計 ', sayPre:'合わせて ', f:parts.map(p=>fmtU(+p[1],'円')+' × '+p[2]+'枚').join(' ＋ ')});
}

let PHRASE_C=null;
function phraseCompiled(){
  if(!PHRASE_C) PHRASE_C=PHRASES.map(ph=>({c:ph.c, f:ph.f, dt:!!ph.dt, item:!!ph.item, ps:ph.p.map(phraseCompile)}));
  return PHRASE_C;
}
/* 語尾（「〜はいくら」「〜は何ですか」「〜を求めて」）を外す */
const P_TAIL=[/(?:を)?(?:計算|けいさん|求め(?:て|る|たい)?|出す|出|知りたい|教え(?:て)?)$/,
  /(?:ですか|でしょうか|でしょう|ですかね|ますか|かな|になりますか|になります|になる|です|だ|か)$/, /(?:が)?(?:かかる|かかります|かかりますか|必要)$/, /[?？]$/,
  /(?:は|って|が)?(?:いくら|いくつ|どのくらい|どれくらい|どれだけ|どのぐらい|どれぐらい|なんぼ|何|なに)$/, /(?:は|って)$/,
  /(?:進む|すすむ|進みます|進める|進んだ|行ける|行く|いける|走れる|歩ける|動く|になる|なる|ある|あります)$/];   // 「何km 進む」（v666）
const P_TAIL_WORDS=['かかる','必要','を計算','を求めて','を出す','を知りたい','ですか','でしょうか','になりますか','になる','です','？','はいくら','はいくつ','はどのくらい','はどれくらい','はどれだけ','はなんぼ','は何','はなに','いくら','は','って'];
function phraseTail(t){
  let s=t;
  for(let i=0;i<5;i++){ const b=s; for(const re of P_TAIL) s=s.replace(re,''); if(s===b||!s) break; }
  return s||t;
}
function hPhrase(t0){
  const t=t0.replace(/元年/g,'1年');
  let res;
  const tries=[t, phraseTail(t)].filter((x,i,a)=>x && a.indexOf(x)===i);
  for(const s of tries){
    if((res=hConvertSpecial(s))) return res;
    if((res=hConvert(s))) return res;
    if((res=hCoins(s))) return res;
    if((res=hHourMin(s))) return res;
    for(const ph of phraseCompiled()){
      if(ph.dt && OPT.app==='koe') continue;
      if(ph.item && OPT.mode && OPT.mode!=='normal') continue;   // 足し上げ・予算では品物として受け取る    // 声の計算帳は、これらを式として読む（言い直しができる）
      for(const p of ph.ps){
        const m=s.match(p.re); if(!m) continue;
        const g=Object.assign({__m:m[0]}, m.groups||{});
        const r=ph.f(g,t0);
        if(r) return r;
      }
    }
    if((res=hDims(s))) return res;   // 型に合わなかった 縦・横・高さ（v24）
  }
  return null;
}
/* 何通りの言い回しに対応しているか（数字は除く） */
function phraseStats(){
  const byC={}; let types=0, forms=0;
  for(const ph of phraseCompiled()){
    const n=ph.ps.reduce((a,p)=>a+p.count,0);
    types+=ph.ps.length; forms+=n;
    byC[ph.c]=byC[ph.c]||{types:0, forms:0}; byC[ph.c].types+=ph.ps.length; byC[ph.c].forms+=n;
  }
  // 単位の換算：同じ分類の中で、ちがう単位どうしの言い方の組み合わせ × 型の数（3）× 助詞など
  let pairs=0;
  const cats=[...new Set(CONV.map(c=>c[0]))];
  for(const k of cats){
    const us=CONV.filter(c=>c[0]===k);
    for(const a of us) for(const b of us) if(a!==b) pairs+=a[3].length*b[3].length;
  }
  const convForms=pairs*(7*2+ 1*11 + 3*6);   // 型ごとの助詞・語尾の組み合わせ
  byC['単位の換算']={types:3, forms:convForms};
  const spForms=3*4*3*2*4*3 + 3*4*2*2 + 2*1*2*4, tempForms=2*3*2*2*3*3*2*2;
  byC['速さ・温度の換算']={types:5, forms:spForms+tempForms};
  byC['お金を数える']={types:1, forms:4*4*3*2};
  types+=3+5+1; forms+=convForms+spForms+tempForms+96;
  return {types, forms, byC, tails:P_TAIL_WORDS.length};
}

/* 式として読んだもの（toks）を左から計算する（表電卓では、これで答えを出す） */
const SYM={'+':'＋','-':'−','*':'×','/':'÷'};
function evalSimple(toks){
  let v=null, u='', f='', pend=null;
  for(const k of toks){
    if(k.t==='op'){ pend=k.op; continue; }
    if(k.u==='円') u='円';
    const s=fmt(k.v)+(k.u==='円'?'円':'');
    if(v===null){ v=k.v; f=s; continue; }
    const op=pend||'+'; pend=null;
    v= op==='+'?v+k.v : op==='-'?v-k.v : op==='*'?v*k.v : (k.v===0?NaN:v/k.v);
    f+=' '+SYM[op]+' '+s;
  }
  return {v, u, f};
}
function match(text, opt){
  OPT=Object.assign({tax:10, today:()=>new Date()}, opt||{});
  const t=(opt && opt.normed) ? String(text||'') : norm(text);
  if(!t) return null;
  const r=hPhrase(t);
  if(r && r.toks){
    const e=evalSimple(r.toks);
    if(e.v==null || !isFinite(e.v)) return R_err(/÷/.test(e.f)?'0 では割れません':'計算できませんでした');
    Object.assign(r, {v:e.v, u:e.u, f:e.f, a:fmtU(e.v,e.u), say:sayU(e.v,e.u)+' です', cls:'ok'});   // f は式だけ（「＝ 答え」は付けない）
  }
  return r;
}
root.KoePhrase={ norm, match, stats:phraseStats, evalSimple, version:'v9' };
})(typeof window!=='undefined' ? window : globalThis);
