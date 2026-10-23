/* 🗓 こよみ（v568。表電卓の道具。はじめて開いたときに koyomi-data.js と いっしょに読む。apps/koyomi/ から単独のアプリとしても開ける）
   ・📅 カレンダー：六曜・旧暦・祝日・二十四節気・雑節・月の満ち欠け（月齢・月の名前）・吉日（一粒万倍日・天赦日・寅の日・巳の日・己巳の日・甲子の日）・
     凶日（不成就日・三隣亡）・土用・年中行事。日を押すと その日の くわしい説明。左右になぞると 月がかわる。
   ・🔍 吉日さがし：結婚・入籍／引っ越し／財布／開業・契約／上棟・地鎮祭／納車／お祝い／種まき（言い伝え）／葬儀（友引の日）から、これからの よい日を出す。
   ・🌾 農事のこよみ：いまの節気と これからの節気・雑節・月の満ち欠け。畑仕事の目安と 月の言い伝え。
   ・天文の時刻（二十四節気・雑節・新月・満月など）は koyomi-data.js（1899〜2101年。astronomy-engine で計算した表）。日付は日本時間。
   ・旧暦：新月の日を1日とし、冬至を含む月を11月にする。冬至から次の冬至までに13か月あるときは、中気のない最初の月を閏月にする（2033年は閏11月）。
   ・吉日・凶日は 節月（節入りの日から）と 日の干支・旧暦の月日で決める（KICHI の説明のとおり）。暦注は 言い伝えで、地域や 本で ちがうことがあります。
   ・えらんだ表示・吉日さがしの条件は excalc_koyomi（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_koyomi';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY=86400000, JST=9*3600000, WD='日月火水木金土';

/* ───────── 天文の表（koyomi-data.js）───────── */
const A=window.KOYOMI_ASTRO;
const EP=Date.UTC(1900,0,1);
function dec(p, mean){
  const w=A.w, B=Math.pow(36,w)/2, out=[EP+p[0]*60000]; let m=p[0];
  for(let i=0;i<p[1].length;i+=w){ m+=parseInt(p[1].substr(i,w),36)-B+mean; out.push(EP+m*60000); }
  return out;
}
const SUN={}; for(const L in A.sun) SUN[L]=dec(A.sun[L], A.ms);
const MOON=A.moon.map(p=>dec(p, A.mm));
const dnMs=ms=>Math.floor((ms+JST)/DAY);   // その時刻の 日本の日付（1970-01-01 からの日数）
const NM=MOON[0], NMD=NM.map(dnMs);       // 新月（朔）の時刻と日
const YMIN=1900, YMAX=2100;                // カレンダーで見られる年
function dnOf(y,m,d){ return Math.floor(Date.UTC(y,m-1,d)/DAY); }
function ymdOf(dn){ const t=new Date(dn*DAY); return {y:t.getUTCFullYear(), m:t.getUTCMonth()+1, d:t.getUTCDate(), w:(((dn+4)%7)+7)%7}; }
const sunMs=(L,y)=>{ const a=SUN[L], i=y-A.y0; return a && i>=0 && i<a.length ? a[i] : null; };
const sunDn=(L,y)=>{ const t=sunMs(L,y); return t==null ? null : dnMs(t); };
function bsLE(arr, x){ let lo=0, hi=arr.length-1, r=-1; while(lo<=hi){ const mid=(lo+hi)>>1; if(arr[mid]<=x){ r=mid; lo=mid+1; } else hi=mid-1; } return r; }
const todayDn=()=>{ const n=new Date(); return dnOf(n.getFullYear(), n.getMonth()+1, n.getDate()); };
const hhmm=ms=>{ const t=new Date(ms+JST); return t.getUTCHours()+':'+String(t.getUTCMinutes()).padStart(2,'0'); };
const md=dn=>{ const o=ymdOf(dn); return o.m+'/'+o.d; };
const mdw=dn=>{ const o=ymdOf(dn); return o.m+'/'+o.d+'（'+WD[o.w]+'）'; };
const ymdJ=dn=>{ const o=ymdOf(dn); return o.y+'年'+o.m+'月'+o.d+'日（'+WD[o.w]+'）'; };
// 和暦（改元の日から 新しい元号。2019年は 4/30 まで 平成31年・5/1 から 令和元年）
const ERAS=[[2019,5,1,'令和'],[1989,1,8,'平成'],[1926,12,25,'昭和'],[1912,7,30,'大正'],[1868,1,1,'明治']];
function warekiOf(dn){ const y=ymdOf(dn).y; for(const [ey,em,ed,n] of ERAS){ if(dn>=dnOf(ey,em,ed)){ const k=y-ey+1; return n+(k===1?'元':k)+'年'; } } return ''; }
// 月の見出し：月の中で 改元があれば 両方（1989年1月 → 昭和64年／平成元年）
function warekiMonth(y,m){ const a=warekiOf(dnOf(y,m,1)), b=warekiOf(dnOf(m===12?y+1:y, m===12?1:m+1, 1)-1); return a===b ? a : a+'／'+b; }

/* ───────── 干支 ───────── */
const JIKKAN='甲乙丙丁戊己庚辛壬癸', JUNISHI='子丑寅卯辰巳午未申酉戌亥';
const KAN_Y=['きのえ','きのと','ひのえ','ひのと','つちのえ','つちのと','かのえ','かのと','みずのえ','みずのと'];
const SHI_Y=['ね','うし','とら','う','たつ','み','うま','ひつじ','さる','とり','いぬ','い'];
const kanshi=dn=>(((dn+2440637)%60)+60)%60;   // 日の干支（0＝甲子。2000-01-01 は 戊午）
const ksName=k=>JIKKAN[k%10]+JUNISHI[k%12];
const ksYomi=k=>KAN_Y[k%10]+SHI_Y[k%12];
const yearKs=y=>(((y-4)%60)+60)%60;            // 年の干支（2026 は 丙午）

/* ───────── 二十四節気 ───────── */
// [太陽黄経, 名, よみ, どんなころ, 畑の目安（関東の平地のふつうの年）]
const SEKKI=[
  [315,'立春','りっしゅん','春のはじまり。寒さの中に 春の気配が出てくる。','種の注文・畑の土づくり（堆肥・石灰）など 春の準備。'],
  [330,'雨水','うすい','雪が雨にかわり、氷がとけはじめる。','じゃがいもの種いもの準備（芽出し）。'],
  [345,'啓蟄','けいちつ','土の中の虫が 目をさまして出てくる。','じゃがいもの植え付け・畑を耕す。'],
  [0,'春分','しゅんぶん','昼と夜が ほぼ同じ長さ。彼岸の中日。','葉物・根菜の種まきのはじまり。'],
  [15,'清明','せいめい','すべてのものが 清らかで明るい。花が咲きそろう。','夏野菜の種まき（苗づくり）。'],
  [30,'穀雨','こくう','穀物をうるおす 春の雨が降る。','種まき・苗の植え付け（遅霜に気をつける）。'],
  [45,'立夏','りっか','夏のはじまり。','トマト・なす・きゅうりなど 夏野菜の苗の植え付け本番。'],
  [60,'小満','しょうまん','草木が育ち、満ちはじめる。','支柱立て・わき芽かき・追肥。'],
  [75,'芒種','ぼうしゅ','稲や麦など 穂の出る作物の種をまくころ。田植え。','梅雨の前の手入れ・草取り。'],
  [90,'夏至','げし','一年で 昼がいちばん長い。','長雨で病気が出やすい。水はけをよくする。'],
  [105,'小暑','しょうしょ','暑さが本格的になる。梅雨明けが近い。','夏野菜の収穫・追肥。'],
  [120,'大暑','たいしょ','一年で いちばん暑いころ。','水やりは朝か夕方に。秋野菜の準備。'],
  [135,'立秋','りっしゅう','秋のはじまり（暑さは続く）。残暑見舞いは この日から。','秋冬野菜の種まき（にんじん・キャベツなどの苗づくり）。'],
  [150,'処暑','しょしょ','暑さが おさまりはじめる。台風の多いころ。','大根・白菜の種まきの準備（土づくり）。'],
  [165,'白露','はくろ','草に 露がつきはじめる。','大根・かぶ・ほうれん草の種まき。'],
  [180,'秋分','しゅうぶん','昼と夜が ほぼ同じ長さ。彼岸の中日。','玉ねぎの種まき・秋植えの球根。'],
  [195,'寒露','かんろ','露が 冷たく感じられる。','さつまいも・里いもの収穫。'],
  [210,'霜降','そうこう','霜が おりはじめる。','玉ねぎの苗の植え付け・霜よけの準備。'],
  [225,'立冬','りっとう','冬のはじまり。','冬越しの準備・落ち葉で堆肥づくり。'],
  [240,'小雪','しょうせつ','わずかに 雪が降りはじめる。','大根・白菜の収穫。'],
  [255,'大雪','たいせつ','雪が 本格的に降りはじめる。','土を深く耕して 寒さにさらす（寒起こし）。'],
  [270,'冬至','とうじ','一年で 昼がいちばん短い。ゆず湯に入り、かぼちゃを食べる。','来年の畑の計画・道具の手入れ。'],
  [285,'小寒','しょうかん','寒の入り。いちばん寒い時期のはじまり。寒中見舞いは このころから。','土づくり（堆肥・石灰をまく）。'],
  [300,'大寒','だいかん','一年で いちばん寒いころ。','寒さに強い野菜の手入れ・春の準備。']
];
const SK=new Map(SEKKI.map(s=>[s[0],s]));
const CHUKI={270:11,300:12,330:1,0:2,30:3,60:4,90:5,120:6,150:7,180:8,210:9,240:10};   // 中気 → 旧暦の月
const SETSU=[[315,1],[345,2],[15,3],[45,4],[75,5],[105,6],[135,7],[165,8],[195,9],[225,10],[255,11],[285,12]];   // 節 → 節月（1＝寅月）
// その日に 二十四節気が来るか
function sekkiOn(dn){ const y=ymdOf(dn).y; for(const s of SEKKI){ const t=sunMs(s[0],y); if(t!=null && dnMs(t)===dn) return {s, t}; } return null; }
// その日の いまの節気（入った日・次の節気の日）
function sekkiNow(dn){
  const y=ymdOf(dn).y; let best=null;
  for(const yy of [y-1,y,y+1]) for(const s of SEKKI){ const t=sunMs(s[0],yy); if(t==null) continue; const d=dnMs(t);
    if(d<=dn && (!best || d>best.d)) best={s, d, t}; }
  if(!best) return null;
  let next=null;
  for(const yy of [y,y+1]) for(const s of SEKKI){ const t=sunMs(s[0],yy); if(t==null) continue; const d=dnMs(t); if(d>best.d && (!next || d<next.d)) next={s, d, t}; }
  return Object.assign(best, {next});
}

/* ───────── 旧暦 ───────── */
const lunIdx=dn=>bsLE(NMD, dn);
const monthCache=new Map();
function hasChuki(k){
  const s=NMD[k], e=NMD[k+1]-1, ys=new Set([ymdOf(s).y, ymdOf(e).y]);
  for(const L in CHUKI) for(const yy of ys){ const c=sunDn(+L,yy); if(c!=null && c>=s && c<=e) return true; }
  return false;
}
// 冬至を含む月 a（Y年の冬至）から 次の冬至を含む月の前までの 月の番号
function monthTable(a, Y){
  if(monthCache.has(a)) return monthCache.get(a);
  const w2=sunDn(270, Y+1); if(w2==null) return null;
  const b=lunIdx(w2), out=[];
  let leapK=-1; if(b-a===13){ for(let k=a+1;k<b;k++){ if(!hasChuki(k)){ leapK=k; break; } } }
  let m=11, yr=Y;
  for(let k=a;k<b;k++){
    if(k===a){ out.push({m:11, leap:false, y:Y}); continue; }
    if(k===leapK){ const p=out[out.length-1]; out.push({m:p.m, leap:true, y:p.y}); continue; }
    m=m%12+1; if(m===1) yr=Y+1;
    out.push({m, leap:false, y:yr});
  }
  monthCache.set(a, out); return out;
}
function lunar(dn){
  const i=lunIdx(dn); if(i<0 || i>=NMD.length-1) return null;
  const y=ymdOf(dn).y;
  for(const yy of [y, y-1]){
    const w=sunDn(270, yy); if(w==null) continue;
    const a=lunIdx(w); if(a>i) continue;
    const t=monthTable(a, yy); if(!t || !t[i-a]) return null;
    const e=t[i-a]; return {y:e.y, m:e.m, leap:e.leap, d:dn-NMD[i]+1};
  }
  return null;
}
const lunStr=l=>l ? (l.leap?'閏':'')+l.m+'月'+l.d+'日' : '';

/* ───────── 六曜 ───────── */
const RK=['大安','赤口','先勝','友引','先負','仏滅'];
const RK_Y={'大安':'たいあん','赤口':'しゃっこう','先勝':'せんしょう','友引':'ともびき','先負':'せんぶ','仏滅':'ぶつめつ'};
const RK_TXT={
  '大安':'何をするにも よい日。結婚式・引っ越し・お祝いに よく選ばれる。',
  '赤口':'正午ごろ（11時〜13時）だけ吉、ほかは凶とされる。火や刃物に気をつける日。',
  '先勝':'「先んずれば勝つ」。急ぐこと・用事は 午前に。午前は吉、午後は凶とされる。',
  '友引':'朝と夕方は吉、昼は凶。祝い事によい（幸せを分ける）。葬儀は「友を引く」として避け、火葬場が休みのことも多い。',
  '先負':'「先んずれば負ける」。急がず 静かに過ごす日。午前は凶、午後は吉とされる。',
  '仏滅':'何事も凶とされ、祝い事は 避けることが多い（物事を 新しく始めるには よいという説も）。'};
const rokuyo=l=>l ? RK[(l.m+l.d)%6] : '';

/* ───────── 吉日・凶日（KICHI）─────────
   一粒万倍日：節月ごとの日の十二支（1月 丑・午／2月 酉・寅／3月 子・卯／4月 卯・辰／5月 巳・午／6月 酉・午／7月 子・未／8月 卯・申／9月 酉・午／10月 酉・戌／11月 亥・子／12月 卯・子）
   天赦日：春（節月1〜3）戊寅・夏（4〜6）甲午・秋（7〜9）戊申・冬（10〜12）甲子
   寅の日・巳の日：日の十二支。己巳の日・甲子の日：日の干支（60日に1度）
   不成就日：旧暦の月ごとの日（1・7月 3・11・19・27日／2・8月 2・10・18・26日／3・9月 1・9・17・25日／4・10月 4・12・20・28日／5・11月 5・13・21・29日／6・12月 6・14・22・30日）
   三隣亡：節月 1・4・7・10月は亥の日、2・5・8・11月は寅の日、3・6・9・12月は午の日 */
const ICHIRYU={1:'丑午',2:'酉寅',3:'子卯',4:'卯辰',5:'巳午',6:'酉午',7:'子未',8:'卯申',9:'酉午',10:'酉戌',11:'亥子',12:'卯子'};
const TENSHA=['戊寅','甲午','戊申','甲子'];
const FUJOJU={1:[3,11,19,27],2:[2,10,18,26],3:[1,9,17,25],4:[4,12,20,28],5:[5,13,21,29],6:[6,14,22,30]};
const SANRIN=['亥','寅','午'];
const KICHI_TXT={
  tensha:['天赦日','てんしゃにち','天が すべてを ゆるす日。暦の上で いちばんの吉日（年に5〜6回）。何かを始めるのに よいとされる。'],
  ichiryu:['一粒万倍日','いちりゅうまんばいび','一粒の籾が 万倍に実る日。始めること（開業・財布・種まき）や お金を出すことに よい。借金・人から借りることは 増えるので避ける。'],
  tora:['寅の日','とらのひ','「虎は千里行って 千里帰る」。出たお金が戻るとされ、財布や旅行に よい日（結婚は 出戻るとして避ける説も）。'],
  mi:['巳の日','みのひ','金運・芸事の神様 弁財天の縁日。財布・お金のことに よい日。'],
  tsuchinotomi:['己巳の日','つちのとみのひ','60日に1度の 巳の日。弁財天の縁日の中でも 金運の いちばんよい日とされる。'],
  kinoene:['甲子の日','きのえねのひ','干支の はじまりの日（60日に1度）。新しいことを始めるのに よい。大黒天の縁日。'],
  fujoju:['不成就日','ふじょうじゅび','何事も 成就しないとされる日。願い事や 新しく始めることは 避けることが多い（ほかの吉日の よさも弱める）。'],
  sanrin:['三隣亡','さんりんぼう','建築の大凶日。この日に建てると 向こう三軒両隣まで 滅ぼすとされ、上棟・地鎮祭・着工は 避ける（建築の仕事で 気にされる）。']
};
// 節月（節入りの日から）
function setsuMonth(dn){
  const y=ymdOf(dn).y; let best=null, bm=0;
  for(const yy of [y-1,y]) for(const [L,m] of SETSU){ const d=sunDn(L,yy); if(d!=null && d<=dn && (best==null || d>best)){ best=d; bm=m; } }
  return bm;
}
function kichiOf(dn, l, ks, sm){
  const br=JUNISHI[ks%12], nm=ksName(ks), g=[], b=[];
  if(sm && nm===TENSHA[Math.floor((sm-1)/3)]) g.push('tensha');
  if(sm && ICHIRYU[sm].includes(br)) g.push('ichiryu');
  if(br==='寅') g.push('tora');
  if(nm==='己巳') g.push('tsuchinotomi'); else if(br==='巳') g.push('mi');
  if(nm==='甲子') g.push('kinoene');
  if(l && (FUJOJU[(l.m-1)%6+1]||[]).includes(l.d)) b.push('fujoju');
  if(sm && SANRIN[(sm-1)%3]===br) b.push('sanrin');
  return {g, b};
}
const KC_S={tensha:'天', ichiryu:'万', tora:'寅', mi:'巳', tsuchinotomi:'己', kinoene:'甲', fujoju:'不', sanrin:'隣'};

/* ───────── 土用・雑節 ───────── */
const DOYO=[[297,315,'冬','寅卯巳'],[27,45,'春','巳午酉'],[117,135,'夏','卯辰申'],[207,225,'秋','未酉亥']];   // [入り, 明けの次の節, 季節, 間日]
function doyoOf(dn){
  const y=ymdOf(dn).y;
  for(const [a,b,s,mabi] of DOYO){ const s0=sunDn(a,y), e0=sunDn(b,y); if(s0!=null && e0!=null && dn>=s0 && dn<e0) return {s, start:s0, end:e0-1, mabi}; }
  return null;
}
// 社日：春分・秋分に いちばん近い戊の日（ちょうど中間の 癸の日なら、春分・秋分の瞬間が 午前は前の戊・午後は後の戊）
function shanichi(y, L){
  const t=sunMs(L,y); if(t==null) return null;
  const d=dnMs(t), off=(4-kanshi(d)%10+10)%10;
  if(off===0) return d;
  const fwd=d+off, back=fwd-10;
  if(off<5) return fwd; if(off>5) return back;
  return new Date(t+JST).getUTCHours()<12 ? back : fwd;
}
const ZS_TXT={
  '節分':'立春の前の日。豆まきをして 鬼（災い）を はらい、福を呼ぶ。恵方巻は 今年の恵方を向いて 食べる。',
  '彼岸':'春分・秋分を中日に 前後3日の7日間。お墓参りをする。「暑さ寒さも彼岸まで」。種まきの目安にも。',
  '社日':'春分・秋分に いちばん近い戊（つちのえ）の日。土地の神様（産土神）をまつり、畑仕事を休む日とされる。',
  '八十八夜':'立春から88日目。「八十八夜の別れ霜」—— 霜の心配が なくなるころで、茶摘み・種まきの目安。',
  '入梅':'暦の上の 梅雨入り（ほんとうの梅雨入りは 気象庁の発表）。',
  '半夏生':'田植えを終える目安。この日は 天から毒が降るとして 畑仕事を休む言い伝えがある。関西では タコを食べる。',
  '土用':'立春・立夏・立秋・立冬の前の 約18日間。土を動かすこと（土いじり・草取り・基礎工事）は 避ける言い伝えがある。間日（まび）は 大丈夫とされる。',
  '土用の丑の日':'土用の間の 丑の日。夏は うなぎを食べて 暑さに負けないようにする。',
  '二百十日':'立春から210日目。台風が来やすい 農家の厄日（稲の花のころ）。',
  '二百二十日':'立春から220日目。二百十日と並ぶ 台風の厄日。'
};
function zassetsuOf(dn){
  const y=ymdOf(dn).y, out=[];
  const rs=sunDn(315,y), sb=sunDn(0,y), ab=sunDn(180,y);
  if(rs!=null && dn===rs-1) out.push(['節分','節分']);
  for(const [c,nm] of [[sb,'春'],[ab,'秋']]){ if(c==null) continue;
    if(dn===c-3) out.push([nm+'の彼岸入り','彼岸']); else if(dn===c) out.push(['彼岸の中日','彼岸']); else if(dn===c+3) out.push([nm+'の彼岸明け','彼岸']); }
  if(dn===shanichi(y,0)) out.push(['春の社日','社日']);
  if(dn===shanichi(y,180)) out.push(['秋の社日','社日']);
  if(rs!=null && dn===rs+87) out.push(['八十八夜','八十八夜']);
  if(dn===sunDn(80,y)) out.push(['入梅','入梅']);
  if(dn===sunDn(100,y)) out.push(['半夏生','半夏生']);
  for(const [a,,s] of DOYO){ if(dn===sunDn(a,y)) out.push([s+'の土用の入り','土用']); }
  if(rs!=null && dn===rs+209) out.push(['二百十日','二百十日']);
  if(rs!=null && dn===rs+219) out.push(['二百二十日','二百二十日']);
  return out;
}
const higanOf=dn=>{ const y=ymdOf(dn).y; for(const [L,nm] of [[0,'春'],[180,'秋']]){ const c=sunDn(L,y); if(c!=null && dn>=c-3 && dn<=c+3) return nm; } return ''; };

/* ───────── 祝日（1949年〜。振替休日は1973年4月12日から・国民の休日は1986年から）───────── */
const holCache=new Map();
function holidays(y){
  if(holCache.has(y)) return holCache.get(y);
  const P=new Map(), add=(m,d,n)=>P.set(dnOf(y,m,d), n), set=(dn,n)=>{ if(dn!=null) P.set(dn,n); };
  const nthMon=(m,n)=>{ const f=dnOf(y,m,1), w=ymdOf(f).w; return f+(1-w+7)%7+7*(n-1); };
  if(y>=1949){
    add(1,1,'元日');
    if(y>=2000) set(nthMon(1,2),'成人の日'); else add(1,15,'成人の日');
    if(y>=1967) add(2,11,'建国記念の日');
    if(y>=2020) add(2,23,'天皇誕生日');
    set(sunDn(0,y),'春分の日');
    add(4,29, y>=2007?'昭和の日':y>=1989?'みどりの日':'天皇誕生日');
    add(5,3,'憲法記念日'); if(y>=2007) add(5,4,'みどりの日'); add(5,5,'こどもの日');
    if(y===2020) add(7,23,'海の日'); else if(y===2021) add(7,22,'海の日'); else if(y>=2003) set(nthMon(7,3),'海の日'); else if(y>=1996) add(7,20,'海の日');
    if(y===2020) add(8,10,'山の日'); else if(y===2021) add(8,8,'山の日'); else if(y>=2016) add(8,11,'山の日');
    if(y>=2003) set(nthMon(9,3),'敬老の日'); else if(y>=1966) add(9,15,'敬老の日');
    set(sunDn(180,y),'秋分の日');
    if(y===2020) add(7,24,'スポーツの日'); else if(y===2021) add(7,23,'スポーツの日'); else if(y>=2020) set(nthMon(10,2),'スポーツの日');
    else if(y>=2000) set(nthMon(10,2),'体育の日'); else if(y>=1966) add(10,10,'体育の日');
    add(11,3,'文化の日'); add(11,23,'勤労感謝の日');
    if(y>=1989 && y<=2018) add(12,23,'天皇誕生日');
    ({1959:[[4,10,'皇太子明仁親王の結婚の儀']], 1989:[[2,24,'昭和天皇の大喪の礼']], 1990:[[11,12,'即位礼正殿の儀']], 1993:[[6,9,'皇太子徳仁親王の結婚の儀']],
      2019:[[5,1,'天皇の即位の日'],[10,22,'即位礼正殿の儀']]}[y]||[]).forEach(a=>add(a[0],a[1],a[2]));
  }
  const H=new Map(P);
  // 振替休日：祝日が日曜なら 次の日（2007年からは 次の祝日でない日）
  for(const [dn] of P){ if(ymdOf(dn).w!==0 || dn<dnOf(1973,4,12)) continue;
    if(y>=2007){ let d=dn+1; while(P.has(d)) d++; if(!H.has(d)) H.set(d,'振替休日'); }
    else if(!P.has(dn+1)) H.set(dn+1,'振替休日'); }
  // 国民の休日：前の日と次の日が祝日の日
  if(y>=1986) for(let dn=dnOf(y,1,2); dn<dnOf(y,12,31); dn++){
    if(P.has(dn) || !P.has(dn-1) || !P.has(dn+1)) continue;
    if(y<2007 && (ymdOf(dn).w===0 || H.has(dn))) continue;
    if(!H.has(dn)) H.set(dn,'国民の休日'); }
  holCache.set(y,H); return H;
}
const holiday=dn=>holidays(ymdOf(dn).y).get(dn)||'';

/* ───────── 年中行事 ───────── */
const GYOJI={'1-7':'七草','1-11':'鏡開き','1-15':'小正月','3-3':'桃の節句（ひな祭り）','5-5':'端午の節句','7-7':'七夕','8-13':'お盆（迎え火）','8-14':'お盆','8-15':'お盆','8-16':'お盆（送り火）',
  '9-9':'重陽の節句','11-15':'七五三','12-13':'正月事始め','12-31':'大晦日'};
function gyojiOf(dn, l){
  const o=ymdOf(dn), out=[]; const g=GYOJI[o.m+'-'+o.d]; if(g) out.push(g);
  const nthSun=(m,n)=>{ const f=dnOf(o.y,m,1), w=ymdOf(f).w; return f+(7-w)%7+7*(n-1); };
  if(o.m===5 && dn===nthSun(5,2)) out.push('母の日');
  if(o.m===6 && dn===nthSun(6,3)) out.push('父の日');
  if(l && !l.leap && l.m===8 && l.d===15) out.push('中秋の名月（十五夜）');
  if(l && !l.leap && l.m===9 && l.d===13) out.push('十三夜');
  if(l && !l.leap && l.m===1 && l.d===1) out.push('旧正月');
  return out;
}
const gyIcon=g=>/十五夜|十三夜/.test(g)?'🎑':/七夕/.test(g)?'🎋':/ひな/.test(g)?'🎎':/端午/.test(g)?'🎏':/七五三/.test(g)?'👘':/お盆/.test(g)?'🏮'
  :/大晦日/.test(g)?'🔔':/正月|七草|鏡開き|事始め/.test(g)?'🎍':/母の日/.test(g)?'💐':/父の日/.test(g)?'👔':/重陽/.test(g)?'🌼':'📌';

/* ───────── 月 ───────── */
const MQ=['新月','上弦の月','満月','下弦の月'], MQ_I=['🌑','🌓','🌕','🌗'];
const MOON_NAME={1:'新月（朔）',2:'二日月',3:'三日月',7:'上弦のころ',8:'上弦のころ',13:'十三夜',14:'小望月（待宵）',15:'十五夜（望月）',16:'十六夜（いざよい）',17:'立待月',18:'居待月',19:'寝待月',20:'更待月',22:'下弦のころ',23:'二十三夜',26:'二十六夜',29:'晦日（つごもり）',30:'晦日（つごもり）'};
const moonIcon=age=>['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][Math.round(age/29.530589*8)%8];
function moonOf(dn){
  const noon=dn*DAY+3*3600000, i=bsLE(NM, noon), age=i>=0 ? (noon-NM[i])/DAY : null;
  let q=-1, qt=null; const end=(dn+1)*DAY-JST-1;
  for(let k=0;k<4;k++){ const a=MOON[k], j=bsLE(a, end); if(j>=0 && dnMs(a[j])===dn){ q=k; qt=a[j]; } }
  return {age, q, qt};
}
const MOON_TIP={
  up:'新月から満月へ 月が満ちていく間は、水分を吸い上げる力が強いとされ、葉物・実もの（地上にできる野菜）の 種まき・植え付けに よいとされる。',
  full:'満月のころは 発芽がそろうとされ、種まきに よいという言い伝えがある。収穫した物は みずみずしい（保存には 向かないとも）。',
  down:'満月から新月へ 欠けていく間は、根菜（大根・にんじん・じゃがいも）の種まき・植え付け、剪定・草取り、保存する物の収穫に よいとされる。',
  note:'昔からの言い伝えで、科学で たしかめられたものでは ありません。'
};
const moonStage=age=>age==null ? '' : (Math.abs(age-14.77)<=1.5 ? 'full' : age<14.77 ? 'up' : 'down');

/* ───────── 1日ぶん ───────── */
function dayInfo(dn){
  const o=ymdOf(dn), l=lunar(dn), ks=kanshi(dn), sm=setsuMonth(dn), kc=kichiOf(dn, l, ks, sm);
  return Object.assign(o, {dn, lun:l, rk:rokuyo(l), ks, sm, kc, hol:holiday(dn), sk:sekkiOn(dn), zs:zassetsuOf(dn), gy:gyojiOf(dn, l),
    moon:moonOf(dn), doyo:doyoOf(dn), higan:higanOf(dn)});
}

/* ───────── 吉日さがし ───────── */
// g：よい点・b：よくない点（六曜は rk:大安 など。月は moonUp（満ちていく間）・full（満月のころ）。土用は doyo（間日をのぞく））
const PURPOSES=[
  {k:'kekkon', n:'💍 結婚・入籍', s:'結納・顔合わせ', g:{大安:4, tensha:4, ichiryu:2, 友引:2, 先勝:1, kinoene:1}, b:{仏滅:3, 赤口:2, fujoju:3},
    why:'大安・天赦日が いちばん。一粒万倍日（幸せが増える）・友引（幸せを分ける）も。仏滅・赤口・不成就日は 避けることが多い。'},
  {k:'hikkoshi', n:'🏠 引っ越し', s:'入居・新居', g:{大安:4, tensha:4, ichiryu:2, 先勝:1, 友引:1}, b:{仏滅:2, 赤口:2, fujoju:3, sanrin:3},
    why:'大安・天赦日。一粒万倍日も。三隣亡・仏滅・不成就日は 避けることが多い。'},
  {k:'saifu', n:'👛 財布', s:'買う・使いはじめ', g:{tora:3, mi:3, tsuchinotomi:4, ichiryu:3, tensha:4, 大安:1, kinoene:1}, b:{fujoju:3},
    why:'寅の日（出たお金が戻る）・巳の日／己巳の日（金運）・一粒万倍日・天赦日。重なる日ほど よいとされる。'},
  {k:'kaigyo', n:'🏪 開業・契約', s:'宝くじ・新しく始める', g:{ichiryu:4, tensha:4, 大安:3, kinoene:2, tora:1}, b:{fujoju:3, 仏滅:2},
    why:'一粒万倍日（始めたことが 大きく実る）・天赦日・大安・甲子の日。'},
  {k:'jotou', n:'🏗 上棟・地鎮祭', s:'着工・家を建てる', g:{大安:4, tensha:3, 先勝:2, 友引:2, ichiryu:1}, b:{sanrin:6, 仏滅:3, 赤口:2, fujoju:2},
    why:'大安が いちばん。三隣亡は 建築の大凶日なので 避ける。仏滅・赤口も 避けることが多い。'},
  {k:'nousha', n:'🚗 納車', s:'車のおはらい', g:{大安:4, tensha:3, 友引:2, 先勝:2, ichiryu:1}, b:{仏滅:3, 赤口:2, fujoju:2},
    why:'大安・友引・先勝（午前）。仏滅・赤口は 避けることが多い。'},
  {k:'iwai', n:'🎎 お祝い', s:'お宮参り・七五三', g:{大安:4, tensha:3, 友引:2, 先勝:1, ichiryu:1}, b:{仏滅:2, 赤口:1},
    why:'大安・天赦日・友引。'},
  {k:'tane', n:'🌱 種まき・植え付け', s:'言い伝え', g:{ichiryu:2, moonUp:2, full:2}, b:{doyo:3},
    why:'一粒万倍日（一粒が万倍に実る）・月が満ちていく間・満月のころ（言い伝え）。土用は 土を動かすのを避ける（間日は 大丈夫）。'},
  {k:'soshiki', n:'🕯️ 葬儀・告別式', s:'友引の日を見る', avoid:true,
    why:'友引は「友を引く」として 葬儀を避け、火葬場が休みのことも多い。下は 友引の日です（地域や火葬場で ちがうことがあります）。'}
];
const isOff=i=>i.w===0 || i.w===6 || !!i.hol;
function score(i, P){
  const tags=[], warn=[]; let s=0;
  const has=k=>{
    if(RK.includes(k)) return i.rk===k;
    if(k==='moonUp') return moonStage(i.moon.age)==='up';
    if(k==='full') return moonStage(i.moon.age)==='full';
    if(k==='doyo') return !!i.doyo && !i.doyo.mabi.includes(JUNISHI[i.ks%12]);
    return i.kc.g.includes(k) || i.kc.b.includes(k);
  };
  const lab=k=>RK.includes(k) ? k : k==='moonUp' ? '月が満ちていく間' : k==='full' ? '満月のころ' : k==='doyo' ? '土用' : KICHI_TXT[k][0];
  for(const k in (P.g||{})) if(has(k)){ s+=P.g[k]; tags.push(lab(k)); }
  for(const k in (P.b||{})) if(has(k)){ s-=P.b[k]; warn.push(lab(k)); }
  return {s, tags, warn};
}
function search(pk, fromDn, days, offOnly){
  const P=PURPOSES.find(p=>p.k===pk) || PURPOSES[0], out=[];
  for(let dn=fromDn; dn<fromDn+days; dn++){
    if(dn>dnOf(YMAX,12,31)) break;
    const i=dayInfo(dn);
    if(offOnly && !isOff(i)) continue;
    if(P.avoid){ if(i.rk==='友引') out.push({i, s:0, tags:['友引'], warn:[]}); continue; }
    const r=score(i, P);
    if(r.s>=3 && !r.warn.some(w=>w==='三隣亡' || w==='不成就日')) out.push(Object.assign({i}, r));
  }
  return out;
}
const stars=s=>s>=7?'★★★':s>=5?'★★':'★';

/* ───────── 状態 ───────── */
const SHOW_KEYS=[['rk','六曜'],['kc','吉日'],['kyo','凶日'],['moon','月'],['ev','節気・雑節・行事']];
let st=null, sel=null, view=null;   // view：表示している {y, m}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const sh={}; SHOW_KEYS.forEach(([k])=>{ sh[k]=!(o.show && o.show[k]===false); });
  st={tab:['cal','kichi','noji'].includes(o.tab)?o.tab:'cal', show:sh, pk:PURPOSES.some(p=>p.k===o.pk)?o.pk:'kekkon',
    span:[90,180,365].includes(o.span)?o.span:180, off:!!o.off, sort:o.sort==='good'?'good':'date'};
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }

/* ───────── 画面 ───────── */
const TABS=[['cal','📅 カレンダー'],['kichi','🔍 吉日さがし'],['noji','🌾 農事のこよみ']];
function render(){
  if(!$('kyBody')) return;
  $('kyTabs').innerHTML=TABS.map(([k,n])=>`<button type="button" role="tab" class="${st.tab===k?'on':''}" aria-selected="${st.tab===k}" onclick="KOYOMI.tab('${k}')">${n}</button>`).join('');
  $('kyMain').innerHTML=st.tab==='cal' ? calHtml() : st.tab==='kichi' ? kichiHtml() : nojiHtml();
}
function tab(k){ if(!TABS.some(t=>t[0]===k)) return; st.tab=k; save(); render(); const b=$('kyBody'); if(b) b.scrollTop=0; }

/* カレンダー */
function cellHtml(dn){
  const i=dayInfo(dn), sh=st.show, cls=['ky-c'];
  if(i.m!==view.m) cls.push('out');
  if(i.w===0 || i.hol) cls.push('sun'); else if(i.w===6) cls.push('sat');
  if(dn===todayDn()) cls.push('today');
  if(dn===sel) cls.push('sel');
  if(i.doyo) cls.push('doyo');
  const mk=[];
  if(sh.kc) i.kc.g.forEach(k=>mk.push(`<i class="k-${k}">${KC_S[k]}</i>`));
  if(sh.kyo) i.kc.b.forEach(k=>mk.push(`<i class="k-${k}">${KC_S[k]}</i>`));
  let ev='';
  if(sh.ev) ev=i.hol || (i.sk && i.sk.s[1]) || (i.zs[0] && i.zs[0][0].replace(/^(春|秋|夏|冬)の/,'')) || i.gy[0] || '';
  const mi=sh.moon && i.moon.q>=0 ? `<span class="mi" title="${MQ[i.moon.q]}">${MQ_I[i.moon.q]}</span>` : '';
  return `<button type="button" class="${cls.join(' ')}" data-dn="${dn}" onclick="KOYOMI.pick(${dn})" aria-label="${esc(ymdJ(dn)+(i.hol?' '+i.hol:'')+(i.rk?' '+i.rk:''))}">`
    +`<span class="d">${i.d}${mi}</span>${sh.rk && i.rk?`<span class="rk r-${i.rk}">${i.rk}</span>`:''}${mk.length?`<span class="mk">${mk.join('')}</span>`:''}${ev?`<span class="ev">${esc(ev)}</span>`:''}</button>`;
}
function calHtml(){
  const {y, m}=view, f=dnOf(y,m,1), w0=ymdOf(f).w, start=f-w0, last=dnOf(m===12?y+1:y, m===12?1:m+1, 1)-1;
  const weeks=Math.ceil((last-start+1)/7);
  const l1=lunar(f), l2=lunar(last), yk=yearKs(y);
  let cells=''; for(let k=0;k<weeks*7;k++) cells+=cellHtml(start+k);
  const leg=[st.show.kc?'<span><i class="k-ichiryu">万</i>一粒万倍日</span><span><i class="k-tensha">天</i>天赦日</span><span><i class="k-tora">寅</i>寅の日</span><span><i class="k-mi">巳</i>巳の日</span><span><i class="k-tsuchinotomi">己</i>己巳の日</span><span><i class="k-kinoene">甲</i>甲子の日</span>':'',
    st.show.kyo?'<span><i class="k-fujoju">不</i>不成就日</span><span><i class="k-sanrin">隣</i>三隣亡</span>':'', st.show.moon?'<span>🌑🌓🌕🌗 月の満ち欠け</span>':'', '<span class="dy">土用</span>'].join('');
  return `<div class="ky-nav"><button type="button" class="ky-nb" onclick="KOYOMI.go(-1)" aria-label="前の月">‹</button>
      <button type="button" class="ky-ym" onclick="KOYOMI.ask()"><b>${y}年 ${m}月</b><small>${warekiMonth(y,m)}・${ksName(yk)}（${ksYomi(yk)}）年${l1&&l2?'・旧暦 '+(l1.leap?'閏':'')+l1.m+'月〜'+(l2.leap?'閏':'')+l2.m+'月':''}</small></button>
      <button type="button" class="ky-nb" onclick="KOYOMI.go(1)" aria-label="次の月">›</button>
      <button type="button" class="ky-today" onclick="KOYOMI.today()">今日</button></div>
    <div class="ky-wk">${[...WD].map((d,i)=>`<span class="${i===0?'sun':i===6?'sat':''}">${d}</span>`).join('')}</div>
    <div class="ky-grid" id="kyGrid">${cells}</div>
    <div class="ky-leg">${leg}</div>
    <div class="ky-show">${SHOW_KEYS.map(([k,n])=>`<button type="button" class="${st.show[k]?'on':''}" onclick="KOYOMI.show('${k}')">${n}</button>`).join('')}</div>
    <div id="kyDay">${dayHtml(sel)}</div>
    ${monthListHtml(y, m)}`;
}
function row(ic, t, body){ return `<div class="ky-row"><span class="ic">${ic}</span><div><b>${t}</b>${body?`<p>${body}</p>`:''}</div></div>`; }
function dayHtml(dn){
  if(dn==null) return '';
  const i=dayInfo(dn), l=i.lun, rows=[];
  const td=dn===todayDn(), diff=dn-todayDn();
  if(i.hol) rows.push(row('🎌', esc(i.hol), ''));
  if(i.rk) rows.push(row('📿', `六曜：${i.rk}<small>（${RK_Y[i.rk]}）</small>`, esc(RK_TXT[i.rk])));
  i.kc.g.forEach(k=>rows.push(row('✨', `吉日：${KICHI_TXT[k][0]}<small>（${KICHI_TXT[k][1]}）</small>`, esc(KICHI_TXT[k][2]))));
  i.kc.b.forEach(k=>rows.push(row('⚠️', `凶日：${KICHI_TXT[k][0]}<small>（${KICHI_TXT[k][1]}）</small>`, esc(KICHI_TXT[k][2]))));
  if(i.sk){ const s=i.sk.s; rows.push(row('🌾', `二十四節気：${s[1]}<small>（${s[2]}）${hhmm(i.sk.t)}</small>`, esc(s[3])+'<br>【畑】'+esc(s[4]))); }
  i.zs.forEach(([n,k])=>rows.push(row(k==='節分'?'👹':'🍃', `雑節：${esc(n)}`, esc(ZS_TXT[k])+(k==='節分'?` <button type="button" class="ky-link" onclick="KOYOMI.ehou()">⛩ 今年の恵方を見る</button>`:''))));
  if(i.doyo){ const br=JUNISHI[i.ks%12], ma=i.doyo.mabi.includes(br);
    rows.push(row('🟫', `${i.doyo.s}の土用<small>（${md(i.doyo.start)}〜${md(i.doyo.end)}）</small>${br==='丑'?'・土用の丑の日':''}`, (ma?'<b>今日は 間日（まび）</b>：土を動かしても よいとされる日。':'土を動かす作業は 避ける言い伝え（間日は '+[...i.doyo.mabi].join('・')+'の日）。')+(br==='丑'?' '+esc(ZS_TXT['土用の丑の日']):''))); }
  if(i.higan && !i.zs.some(z=>z[1]==='彼岸')) rows.push(row('🍃', `${i.higan}の彼岸`, ''));
  i.gy.forEach(g=>rows.push(row(gyIcon(g), esc(g), '')));
  const mo=i.moon, mn0=l ? MOON_NAME[l.d] : '', mn=mn0 && !i.gy.some(g=>g.includes(mn0.replace(/（.*$/,''))) ? mn0 : '';
  if(mo.age!=null){
    const stg=moonStage(mo.age);
    rows.push(row(mo.q>=0?MQ_I[mo.q]:moonIcon(mo.age), `月：${mo.q>=0?MQ[mo.q]+'<small>（'+hhmm(mo.qt)+'）</small>・':''}月齢 ${mo.age.toFixed(1)}${mn?'・'+esc(mn):''}`,
      stg ? '<span class="ky-tip">🌱 '+esc(MOON_TIP[stg])+'（言い伝え）</span>' : ''));
  }
  return `<div class="ky-day"><div class="ky-dh"><b>${ymdJ(dn)}</b>${td?'<span class="ky-now">今日</span>':diff>0?`<small>${diff}日後</small>`:`<small>${-diff}日前</small>`}</div>
    <div class="ky-dsub">${warekiOf(dn)}・旧暦 ${l?(l.leap?'閏':'')+l.m+'月'+l.d+'日':'—'}・${ksName(i.ks)}（${ksYomi(i.ks)}）の日</div>
    ${rows.join('')||'<div class="ky-row"><span class="ic">📅</span><div>とくに 暦の行事は ありません。</div></div>'}
    <div class="ky-acts"><button type="button" class="ky-b" onclick="KOYOMI.copy(${dn})">📋 コピー</button></div></div>`;
}
function monthListHtml(y, m){
  const f=dnOf(y,m,1), last=dnOf(m===12?y+1:y, m===12?1:m+1, 1)-1, it=[];
  for(let dn=f; dn<=last; dn++){
    const i=dayInfo(dn);
    if(i.sk) it.push([dn, '🌾 '+i.sk.s[1]]);
    i.zs.forEach(z=>it.push([dn, '🍃 '+z[0]]));
    if(i.moon.q>=0) it.push([dn, MQ_I[i.moon.q]+' '+MQ[i.moon.q]]);
    if(i.kc.g.includes('tensha')) it.push([dn, '✨ 天赦日']);
    if(i.hol) it.push([dn, '🎌 '+i.hol]);
    i.gy.forEach(g=>it.push([dn, gyIcon(g)+' '+g]));
  }
  if(!it.length) return '';
  return `<div class="ky-sec"><h4>${m}月の 暦</h4>${it.map(([dn,t])=>`<button type="button" class="ky-li" onclick="KOYOMI.pick(${dn})"><span class="d">${mdw(dn)}</span><span>${esc(t)}</span></button>`).join('')}</div>`;
}
function pick(dn){
  if(dn==null || isNaN(dn)) return;
  sel=+dn; const o=ymdOf(sel);
  if(o.y!==view.y || o.m!==view.m){ view={y:o.y, m:o.m}; if(st.tab!=='cal'){ st.tab='cal'; save(); } render(); }
  else { document.querySelectorAll('#kyGrid .ky-c.sel').forEach(e=>e.classList.remove('sel')); const c=document.querySelector(`#kyGrid .ky-c[data-dn="${sel}"]`); if(c) c.classList.add('sel'); $('kyDay').innerHTML=dayHtml(sel); }
  const d=$('kyDay'); if(d && d.scrollIntoView) d.scrollIntoView({block:'nearest', behavior:'smooth'});
}
function go(n){
  let {y, m}=view; m+=n; while(m>12){ m-=12; y++; } while(m<1){ m+=12; y--; }
  if(y<YMIN || y>YMAX){ toastK(YMIN+'年〜'+YMAX+'年の こよみが 見られます'); return; }
  view={y, m}; const o=ymdOf(sel); if(o.y!==y || o.m!==m) sel=dnOf(y,m,1);
  if(y===ymdOf(todayDn()).y && m===ymdOf(todayDn()).m) sel=todayDn();
  render();
}
function goToday(){ sel=todayDn(); const o=ymdOf(sel); view={y:o.y, m:o.m}; if(st.tab!=='cal'){ st.tab='cal'; save(); } render(); }
async function ask(){
  const v=typeof appPrompt==='function' ? await appPrompt('見たい年月（例：2027/4・令和9年4月）', view.y+'/'+view.m) : prompt('見たい年月', view.y+'/'+view.m);
  if(v==null) return;
  const s=String(v).normalize('NFKC').trim();
  let y=null, m=1, r;
  if((r=/^(令和|平成|昭和)(\d+|元)\s*年?\s*(\d{1,2})?/.exec(s))){ const n=r[2]==='元'?1:+r[2]; y=(r[1]==='令和'?2018:r[1]==='平成'?1988:1925)+n; m=r[3]?+r[3]:1; }
  else if((r=/^(\d{4})\s*[\/\-年.]?\s*(\d{1,2})?/.exec(s))){ y=+r[1]; m=r[2]?+r[2]:1; }
  if(!y || m<1 || m>12 || y<YMIN || y>YMAX){ toastK('年月が わかりませんでした（'+YMIN+'〜'+YMAX+'年）'); return; }
  view={y, m}; sel=dnOf(y,m,1); render();
}
function show(k){ if(!(k in st.show)) return; st.show[k]=!st.show[k]; save(); render(); }
function dayText(dn){
  const i=dayInfo(dn), l=i.lun, t=[ymdJ(dn)+(i.hol?' '+i.hol:''), '旧暦 '+lunStr(l)+'・'+ksName(i.ks)+'の日'+(i.rk?'・'+i.rk:'')];
  if(i.kc.g.length) t.push('吉日：'+i.kc.g.map(k=>KICHI_TXT[k][0]).join('・'));
  if(i.kc.b.length) t.push('凶日：'+i.kc.b.map(k=>KICHI_TXT[k][0]).join('・'));
  if(i.sk) t.push('二十四節気：'+i.sk.s[1]);
  i.zs.forEach(z=>t.push('雑節：'+z[0]));
  if(i.doyo) t.push(i.doyo.s+'の土用');
  i.gy.forEach(g=>t.push(g));
  if(i.moon.age!=null) t.push('月齢 '+i.moon.age.toFixed(1)+(i.moon.q>=0?'・'+MQ[i.moon.q]:''));
  return t.join('\n');
}
function copy(dn){
  const t=dayText(+dn);
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(()=>toastK('コピーしました'), ()=>toastK(t));
  else toastK(t);
}
const toastK=m=>{ if(typeof toast==='function') toast(m, 3000); };
// 節分の日の「⛩ 今年の恵方を見る」：方位と恵方を こよみの上に開く（先に開いて閉じた方位の画面が 下に隠れないように いちばん後ろへ）
async function ehou(){ if(typeof openHoi!=='function') return; await openHoi(); const el=$('hoiOverlay'); if(el && isDlgOpen('hoiOverlay')) document.body.appendChild(el); }

/* 吉日さがし */
function kichiHtml(){
  const P=PURPOSES.find(p=>p.k===st.pk)||PURPOSES[0], from=todayDn();
  let res=search(P.k, from, st.span, st.off);
  if(st.sort==='good' && !P.avoid) res=res.slice().sort((a,b)=>b.s-a.s || a.i.dn-b.i.dn);
  const list=res.slice(0,80).map(r=>{ const i=r.i;
    return `<button type="button" class="ky-res${isOff(i)?' off':''}" onclick="KOYOMI.pick(${i.dn})"><span class="d">${mdw(i.dn)}${i.hol?'<small>'+esc(i.hol)+'</small>':''}<small>${i.dn-from===0?'今日':(i.dn-from)+'日後'}</small></span>`
      +`<span class="w">${P.avoid?'':`<b class="st">${stars(r.s)}</b>`}${r.tags.map(t=>`<em>${esc(t)}</em>`).join('')}${r.warn.map(t=>`<em class="bad">${esc(t)}</em>`).join('')}</span></button>`; }).join('');
  return `<div class="ky-pp">${PURPOSES.map(p=>`<button type="button" class="${p.k===P.k?'on':''}" onclick="KOYOMI.purpose('${p.k}')">${p.n}${p.s?'<small>'+p.s+'</small>':''}</button>`).join('')}</div>
    <div class="ky-why">${esc(P.why)}</div>
    <div class="ky-opt"><span>${[[90,'3か月'],[180,'半年'],[365,'1年']].map(([v,n])=>`<button type="button" class="${st.span===v?'on':''}" onclick="KOYOMI.span(${v})">${n}</button>`).join('')}</span>
      <label><input type="checkbox" ${st.off?'checked':''} onchange="KOYOMI.off(this.checked)"> 土日・祝日だけ</label>
      ${P.avoid?'':`<span>${[['date','日付順'],['good','よい順']].map(([v,n])=>`<button type="button" class="${st.sort===v?'on':''}" onclick="KOYOMI.sort('${v}')">${n}</button>`).join('')}</span>`}</div>
    <div class="ky-cnt">${res.length ? `これから${st.span===365?'1年':st.span===180?'半年':'3か月'}で <b>${res.length}</b>日${res.length>80?'（はじめの80日）':''}` : '見つかりませんでした（期間を長くするか、「土日・祝日だけ」を外してください）'}</div>
    <div class="ky-rl">${list}</div>
    <div class="ky-note">★ は 重なっている吉日の多さの目安です。暦注は 言い伝えで、地域・家・お寺や神社で 考え方が ちがうことがあります。</div>`;
}
function purpose(k){ if(!PURPOSES.some(p=>p.k===k)) return; st.pk=k; save(); render(); }
function span(v){ if(![90,180,365].includes(v)) return; st.span=v; save(); render(); }
function off(b){ st.off=!!b; save(); render(); }
function sortBy(v){ st.sort=v==='good'?'good':'date'; save(); render(); }

/* 農事のこよみ */
function nojiHtml(){
  const t=todayDn(), now=sekkiNow(t), it=[];
  for(let dn=t; dn<t+75; dn++){
    const i=dayInfo(dn);
    if(i.sk) it.push([dn, '🌾 '+i.sk.s[1], i.sk.s[4]]);
    i.zs.forEach(([n,k])=>it.push([dn, '🍃 '+n, ZS_TXT[k]]));
    if(i.moon.q===0) it.push([dn, '🌑 新月', '月が満ちていく間は 葉物・実ものの種まきに よいとされる（言い伝え）。']);
    if(i.moon.q===2) it.push([dn, '🌕 満月', '満月のころは 発芽がそろうとされる。このあと欠けていく間は 根菜・剪定・草取り（言い伝え）。']);
  }
  const s=now && now.s;
  return `${s?`<div class="ky-now-sk"><div class="t">いまは <b>${s[1]}</b><small>（${s[2]}）</small></div>
      <div class="p">${md(now.d)}〜${now.next?md(now.next.d-1):''}${now.next?`・次の「${now.next.s[1]}」まで あと${now.next.d-t}日`:''}</div>
      <p>${esc(s[3])}</p><p class="farm">【畑】${esc(s[4])}</p></div>`:''}
    <div class="ky-sec"><h4>これからの 暦と 畑の目安<small>（75日ぶん）</small></h4>
      ${it.map(([dn,n,tx])=>`<button type="button" class="ky-li tall" onclick="KOYOMI.pick(${dn})"><span class="d">${mdw(dn)}<small>${dn===t?'今日':(dn-t)+'日後'}</small></span><span><b>${esc(n)}</b><small>${esc(tx||'')}</small></span></button>`).join('')}</div>
    <div class="ky-sec"><h4>🌙 月と 畑の言い伝え</h4>
      <p class="ky-p">🌒 <b>満ちていく間</b>（新月→満月）：${esc(MOON_TIP.up)}</p>
      <p class="ky-p">🌕 <b>満月のころ</b>：${esc(MOON_TIP.full)}</p>
      <p class="ky-p">🌘 <b>欠けていく間</b>（満月→新月）：${esc(MOON_TIP.down)}</p>
      <p class="ky-note">${esc(MOON_TIP.note)} 畑の目安は 関東の平地の ふつうの年のものです。地域・その年の天気・品種で ずれます。</p></div>`;
}

/* ───────── 見た目 ───────── */
const KY_CSS=`
#koyomiOverlay .ky-modal{ display:flex; flex-direction:column; }
.ky-body{ flex:1; min-height:0; overflow:auto; padding:10px 10px calc(20px + var(--safe-bottom,0px)); color:var(--text,#222); font-size:15px; }
.ky-wrap{ max-width:760px; margin:0 auto; }
.ky-tabs{ display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin:0 0 10px; }
.ky-tabs button{ min-height:44px; padding:0 2px; border-radius:12px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); color:var(--text,#333); font-size:14px; font-weight:bold; cursor:pointer; }
.ky-tabs button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.ky-nav{ display:flex; align-items:center; gap:6px; margin:0 0 6px; }
.ky-nb{ flex:none; width:44px; height:44px; border-radius:22px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:24px; line-height:1; cursor:pointer; }
.ky-ym{ flex:1; min-width:0; border:0; background:transparent; color:var(--text,#222); cursor:pointer; text-align:center; padding:2px; }
.ky-ym b{ display:block; font-size:19px; } .ky-ym small{ display:block; font-size:11.5px; color:var(--text-light,#666); }
.ky-today{ flex:none; height:36px; padding:0 12px; border-radius:18px; border:1px solid var(--acc); background:transparent; color:var(--acc-text,var(--acc)); font-weight:bold; font-size:13px; cursor:pointer; }
.ky-wk{ display:grid; grid-template-columns:repeat(7,1fr); text-align:center; font-size:12px; font-weight:bold; color:var(--text-light,#666); margin:0 0 3px; }
.ky-wk .sun, .ky-c.sun .d{ color:#d32f2f; } .ky-wk .sat, .ky-c.sat .d{ color:#1565c0; }
body.dark .ky-wk .sun, body.dark .ky-c.sun .d{ color:#ef9a9a; } body.dark .ky-wk .sat, body.dark .ky-c.sat .d{ color:#90caf9; }
.ky-grid{ display:grid; grid-template-columns:repeat(7,1fr); gap:2px; touch-action:pan-y; }
.ky-c{ position:relative; display:flex; flex-direction:column; align-items:stretch; min-width:0; min-height:66px; padding:2px 2px 3px; border-radius:8px; border:1px solid rgba(120,132,156,.22); background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; font:inherit; text-align:left; overflow:hidden; }
.ky-c.out{ opacity:.42; }
.ky-c.today{ border:2px solid var(--acc); }
.ky-c.sel{ background:var(--acc-weak,rgba(33,115,70,.13)); box-shadow:inset 0 0 0 2px var(--acc); }
.ky-c.doyo{ border-bottom:3px solid rgba(141,110,99,.75); }
.ky-c .d{ display:flex; justify-content:space-between; align-items:center; font-size:15px; font-weight:bold; line-height:1.15; }
.ky-c .mi{ font-size:12px; }
.ky-c .rk{ font-size:10.5px; line-height:1.2; color:var(--text-light,#666); }
.ky-c .rk.r-大安{ color:#c62828; font-weight:bold; } .ky-c .rk.r-仏滅{ color:#78909c; }
body.dark .ky-c .rk.r-大安{ color:#ef9a9a; }
.ky-c .mk{ display:flex; flex-wrap:wrap; gap:1px; margin-top:1px; }
.ky-c .ev{ margin-top:auto; font-size:9.5px; line-height:1.2; color:var(--acc-text,var(--acc)); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-all; }
.ky-c.sun .ev{ color:#d32f2f; } body.dark .ky-c.sun .ev{ color:#ef9a9a; }
.ky-c i, .ky-leg i{ display:inline-flex; align-items:center; justify-content:center; width:15px; height:15px; border-radius:4px; font-style:normal; font-size:10px; font-weight:bold; color:#fff; line-height:1; }
.k-ichiryu{ background:#c8961e; } .k-tensha{ background:#7b1fa2; } .k-tora{ background:#ef6c00; } .k-mi{ background:#00897b; } .k-tsuchinotomi{ background:#00695c; } .k-kinoene{ background:#2e7d32; }
.k-fujoju{ background:#78909c; } .k-sanrin{ background:#6d4c41; }
.ky-leg{ display:flex; flex-wrap:wrap; gap:4px 10px; margin:6px 2px; font-size:11.5px; color:var(--text-light,#666); }
.ky-leg span{ display:inline-flex; align-items:center; gap:3px; } .ky-leg .dy{ border-bottom:3px solid rgba(141,110,99,.75); }
.ky-show{ display:flex; flex-wrap:wrap; gap:5px; margin:4px 0 10px; }
.ky-show button{ min-height:32px; padding:0 10px; border-radius:16px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text-light,#666); font-size:12.5px; cursor:pointer; }
.ky-show button.on{ border-color:var(--acc); color:var(--acc-text,var(--acc)); font-weight:bold; background:var(--acc-weak,rgba(33,115,70,.1)); }
.ky-day,.ky-sec,.ky-now-sk{ margin:0 0 10px; padding:10px 12px 12px; border-radius:14px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); }
.ky-dh{ display:flex; align-items:baseline; gap:8px; } .ky-dh b{ font-size:17px; } .ky-dh small{ color:var(--text-light,#666); font-size:12.5px; }
.ky-now{ padding:1px 8px; border-radius:10px; background:var(--acc); color:var(--on-acc,#fff); font-size:12px; font-weight:bold; }
.ky-dsub{ font-size:13px; color:var(--text-light,#555); margin:2px 0 6px; }
.ky-row{ display:flex; gap:8px; padding:7px 0; border-top:1px solid rgba(120,132,156,.16); }
.ky-row .ic{ flex:none; width:24px; text-align:center; font-size:17px; }
.ky-row b{ font-size:14.5px; } .ky-row b small{ font-weight:normal; font-size:12px; color:var(--text-light,#666); }
.ky-row p{ margin:2px 0 0; font-size:13px; line-height:1.6; color:var(--text,#333); }
.ky-tip{ display:block; font-size:12.5px; color:var(--text-light,#555); }
.ky-link{ display:inline-block; margin-top:4px; min-height:32px; padding:0 10px; border-radius:16px; border:1px solid var(--acc); background:transparent; color:var(--acc-text,var(--acc)); font-weight:bold; font-size:12.5px; cursor:pointer; }
.ky-acts{ display:flex; justify-content:flex-end; margin-top:6px; }
.ky-b{ height:38px; padding:0 12px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:13px; font-weight:bold; cursor:pointer; }
.ky-sec h4{ margin:0 0 6px; font-size:15.5px; } .ky-sec h4 small{ font-weight:normal; font-size:12px; color:var(--text-light,#777); }
.ky-li{ display:flex; gap:10px; width:100%; text-align:left; padding:7px 2px; border:0; border-top:1px solid rgba(120,132,156,.16); background:transparent; color:var(--text,#222); font:inherit; font-size:14px; cursor:pointer; }
.ky-li .d{ flex:none; width:6.6em; font-weight:bold; font-variant-numeric:tabular-nums; } .ky-li .d small{ display:block; font-weight:normal; font-size:11.5px; color:var(--text-light,#777); }
.ky-li.tall span small{ display:block; font-size:12.5px; color:var(--text-light,#555); line-height:1.55; margin-top:1px; }
.ky-pp{ display:grid; grid-template-columns:1fr 1fr; gap:5px; margin:0 0 8px; }
.ky-pp button{ min-height:44px; padding:4px 6px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; font-weight:bold; cursor:pointer; text-align:left; line-height:1.3; }
.ky-pp button small{ display:block; font-size:11px; font-weight:normal; opacity:.75; }
.ky-pp button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); }
.ky-why{ padding:8px 10px; border-radius:10px; background:var(--acc-weak,rgba(33,115,70,.1)); font-size:13px; line-height:1.6; margin:0 0 8px; }
.ky-opt{ display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; margin:0 0 8px; font-size:13.5px; }
.ky-opt span{ display:inline-flex; gap:3px; }
.ky-opt button{ min-height:34px; padding:0 10px; border-radius:17px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13px; cursor:pointer; }
.ky-opt button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.ky-opt label{ display:inline-flex; align-items:center; gap:5px; } .ky-opt input{ width:20px; height:20px; margin:0; }
.ky-cnt{ font-size:13px; color:var(--text-light,#555); margin:0 0 6px; }
.ky-res{ display:flex; gap:10px; width:100%; text-align:left; padding:8px 10px; margin:0 0 5px; border-radius:10px; border:1px solid rgba(120,132,156,.28); background:var(--modal-bg,#fff); color:var(--text,#222); font:inherit; cursor:pointer; }
.ky-res.off{ border-color:rgba(211,47,47,.35); }
.ky-res .d{ flex:none; width:7.2em; font-weight:bold; font-size:14.5px; font-variant-numeric:tabular-nums; } .ky-res .d small{ display:block; font-weight:normal; font-size:11.5px; color:var(--text-light,#666); }
.ky-res .w{ flex:1; min-width:0; display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
.ky-res .st{ color:#c8961e; font-size:13px; margin-right:2px; }
.ky-res em{ font-style:normal; font-size:12px; padding:1px 7px; border-radius:9px; background:rgba(200,150,30,.15); color:var(--text,#333); }
.ky-res em.bad{ background:rgba(120,144,156,.2); color:var(--text-light,#555); text-decoration:line-through; }
.ky-note{ font-size:12px; color:var(--text-light,#666); line-height:1.6; margin:6px 2px; }
.ky-now-sk .t{ font-size:15px; } .ky-now-sk .t b{ font-size:22px; } .ky-now-sk .t small{ color:var(--text-light,#666); }
.ky-now-sk .p{ font-size:13px; color:var(--text-light,#555); margin:2px 0 4px; }
.ky-now-sk p{ margin:4px 0 0; font-size:14px; line-height:1.6; } .ky-now-sk .farm{ font-weight:bold; }
.ky-p{ font-size:13.5px; line-height:1.65; margin:6px 0; }
@media (max-width:360px){ .ky-c{ min-height:60px; } .ky-c .d{ font-size:14px; } .ky-c .rk{ font-size:9.5px; } .ky-c i{ width:13px; height:13px; font-size:9px; } .ky-pp button{ font-size:12.5px; } }
`;
function ensureDom(){
  if($('koyomiOverlay')) return;
  const stl=document.createElement('style'); stl.id='kyStyle'; stl.textContent=KY_CSS; document.head.appendChild(stl);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="koyomiOverlay">
  <div class="modal vol-modal ky-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🗓 こよみ（吉日・月・農事）</span><button class="modal-close" onclick="closeKoyomi()" aria-label="閉じる">✕</button></div>
    <div class="ky-body" id="kyBody"><div class="ky-wrap">
      <div class="ky-tabs" id="kyTabs" role="tablist"></div>
      <div id="kyMain"></div>
    </div></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('koyomiOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の電卓キーに 届かないように
  // 左右になぞると 月をかえる（カレンダーのとき）
  if(typeof bindHSwipe==='function') bindHSwipe($('kyMain'), dir=>{ if(st.tab==='cal' && $('kyGrid')) go(dir); });   // dir：1＝次の月（左へ払う）・-1＝前の月
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openKoyomi(t){
  ensureDom(); load();
  if(TABS.some(x=>x[0]===t)) st.tab=t;
  sel=todayDn(); const o=ymdOf(sel); view={y:o.y, m:o.m};
  openDlg('koyomiOverlay');
  render();
}
function closeKoyomi(){ if(!$('koyomiOverlay')||!isDlgOpen('koyomiOverlay')) return; closeDlg('koyomiOverlay'); }

window.KOYOMI={ tab, pick, go, today:goToday, ask:()=>{ ask(); }, show, copy, ehou:()=>ehou(), purpose, span, off, sort:sortBy,
  info:(y,m,d)=>{ const i=dayInfo(dnOf(y,m,d)); return {y:i.y, m:i.m, d:i.d, w:i.w, lun:i.lun, rk:i.rk, ks:ksName(i.ks), sm:i.sm, kichi:i.kc.g.map(k=>KICHI_TXT[k][0]), kyo:i.kc.b.map(k=>KICHI_TXT[k][0]),
    hol:i.hol, sekki:i.sk?i.sk.s[1]:'', zs:i.zs.map(z=>z[0]), gy:i.gy, doyo:i.doyo?i.doyo.s:'', age:i.moon.age, q:i.moon.q}; },
  holidays:y=>[...holidays(y)].sort((a,b)=>a[0]-b[0]).map(([dn,n])=>{ const o=ymdOf(dn); return o.m+'/'+o.d+' '+n; }),
  sekki:y=>SEKKI.map(s=>{ const dn=sunDn(s[0],y); return s[1]+' '+(dn==null?'':md(dn)); }),
  search:(pk,y,m,d,days,offOnly)=>search(pk, dnOf(y,m,d), days, !!offOnly).map(r=>{ const o=r.i; return o.m+'/'+o.d+(r.tags.length?' '+r.tags.join('・'):'')+(r.warn.length?' ×'+r.warn.join('・'):''); }),
  ehouYear:y=>{ const s=sunDn(315,y); return s==null?'':md(s); }, risshun:y=>{ const s=sunDn(315,y); return s==null?null:ymdOf(s); },
  dayText:(y,m,d)=>dayText(dnOf(y,m,d)), state:()=>JSON.parse(JSON.stringify(st)), view:()=>Object.assign({}, view, {sel:sel==null?'':md(sel)}) };
Object.assign(window, { openKoyomi, closeKoyomi });
})();
