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
  AZUKE:['預けたら','預けると','預けて','運用したら','運用すると','運用して','複利','単利','で','だと','なら','後','たったら','経ったら','置いたら','複利で','単利で','複利だと','単利だと'],
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
  HYOJUN:['標準体重','適正体重','理想体重','美容体重','標準の体重'],
};
const P_UNIT_LISTS=['NU','LU','HU','WU','WU2','SPDU','LENU','QU','LITER'];
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
   f:g=>{ const a=pn(g.a), v=a-a/taxF(); return pOut(v,'円',{pre:'消費税 ', sayPre:'消費税は ', f:fmtU(a,'円')+' − '+fmtU(a,'円')+' ÷ '+fmt(taxF())}); }},
  {c:'税・源泉', p:['{a}円?(の|に)?<ZEIGAKU2>','{a}円?(に|の)(かかる|つく|付く)(消費税|税金|税)'],
   f:g=>{ const a=pn(g.a), v=a*(taxF()-1); return pOut(v,'円',{pre:'消費税 ', sayPre:'消費税は ', f:fmtU(a,'円')+' × '+settings.tax+'%'}); }},
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
  {c:'年齢・和暦・時刻', p:['{a}<SAI>(は|って|の人は|の人|なら|だと)?(<NAN>年|いつ)?(の)?<UMARE>'],
   f:g=>{ const a=pn(g.a), y=today().getFullYear()-a; return pOut(y,'年',{a:y+'年生まれ（誕生日の前なら '+(y-1)+'年）', say:y+'年生まれ です。今年の誕生日がまだなら '+(y-1)+'年 です', f:today().getFullYear()+' − '+a}); }},
  {c:'年齢・和暦・時刻', p:['(?<ap>午前|午後)?{h}時({m}分|(?<half>半))?(の|から)({dh}時間)?({dm}分)?<NOCHI@w>(は)?(<NAN>時)?'],
   f:g=>{ if(!g.dh && !g.dm) return null; let H=pn(g.h); if(g.ap==='午後'&&H<12) H+=12; const start=H*60+(g.m?pn(g.m):(g.half?30:0));
     const dmin=(g.dh?pn(g.dh)*60:0)+(g.dm?pn(g.dm):0), sign=g.w==='前'?-1:1; let x=start+sign*dmin, day='';
     while(x<0){ x+=1440; day='前の日の '; } while(x>=1440){ x-=1440; day='次の日の '; }
     const hh=Math.floor(x/60), mm=Math.round(x-hh*60), s=day+hh+'時'+(mm?mm+'分':'');
     return R_ok(s+' です', s, fmtClock(start)+(sign>0?' ＋ ':' − ')+durSay(dmin), {dv:x/60}); }},   // dv：表電卓の表示に出す数（16時15分 → 16.25）
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
  if((m=t.match(/^(?:華氏|かし)(?<f>-?\d+(?:\.\d+)?)(?:度|°F)(?:は|って|を)?(?:摂氏|せっし)?(?:で)?(?:何|なん)?(?:度)?(?:に|で)?(?:直すと|すると)?$/))){
    const f=+m.groups.f, v=(f-32)*5/9; return R_ok('摂氏 '+fmt(v,1)+'度 です', '摂氏 '+fmt(v,1)+'℃', '('+fmt(f)+' − 32) × 5/9', {v, u:'℃'});
  }
  return null;
}
/* お金を数える：「100円玉が23枚と10円玉が15枚」 */
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
  /(?:は|って|が)?(?:いくら|いくつ|どのくらい|どれくらい|どれだけ|どのぐらい|どれぐらい|なんぼ|何|なに)$/, /(?:は|って)$/];
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
root.KoePhrase={ norm, match, stats:phraseStats, evalSimple, version:'v6' };
})(typeof window!=='undefined' ? window : globalThis);
