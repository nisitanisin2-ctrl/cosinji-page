/* 📇 連絡帳（v542。表電卓の道具。はじめて開いたときに読む）
   スマホの電話帳（連絡先）から書き出したファイル（vCard .vcf・CSV）を読んで、見やすく整理する。
   ・Android（Google の「連絡帳」・Galaxy など）・iPhone・Google コンタクトの書き出し、ガラケーの Shift_JIS も読む。
     古い Android の書き方（QUOTED-PRINTABLE・行の折り返し）、iPhone の自分で付けたラベル（実家など）も。
     電話・メール・住所はいくつでも持てる。知らない項目も捨てずに持っておき、書き出すときにそのまま戻す。
   ・よみ順（あかさたな の索引）・グループごと・会社ごと・新しい順。さがす（よみ・番号の一部・🎤 声）。★・グループで絞る。
     もうすぐ誕生日の人。同じ人の重なりを見つけて いっしょにする。まとめて選んでグループに入れる・書き出す・消す。
   ・自分好みに：グループ（絵文字）・自分の項目（間柄・年賀状など。文字で入れる／選ぶ）・一覧に出すもの・文字の大きさ。
   ・vCard（.vcf）で書き出してスマホに戻す（ぜんぶ・いま出ている人・選んだ人・前に書き出したあとに 入れた・直した人）。
     自分の項目はメモ欄に「［間柄］叔父」の形でも書くので、スマホを通っても消えない（読むときに項目へ戻す）。
   ・CSV（Excel）・印刷（あいうえお順の電話一覧）。Android の Chrome は「スマホの連絡先から選んで入れる」も。
   ・スマホの連絡先を直接書きかえることはできない（ブラウザのアプリの決まり）。ファイルでやりとりする。
   ・入れたものは端末の中だけ（excalc_renraku。写真は IndexedDB excalc_renraku）。📋リストのバックアップにも入る。
   ・🎨 色分け（v544）：12色から色をえらんで人を押すと、その色になる（一覧の左の帯・うすい地の色）。色で絞る・色ごとに並べる。
     色には名前を付けられる（赤＝要連絡 など）。スマホに戻すときは X-HYO-COLOR と メモ欄の「［色分け］赤」で持っていく。
   ・📋 表で直す（v544）：全員を表にして、マスを押すと その場で直せる（Enter で下の人・Tab で右へ）。出す列をえらぶ・列で並べかえ・↶ 戻す。
     （v545）名前の列と見出しは 表の本体とは別に置く（position:sticky を使わない。Android の Chrome で消えたり重なったりしたため）。
     （v546）入りきらない字は 枠に合わせて小さく・2行に。見出しの右の端 ‖ で列の幅を変える（2回押すと中身に合わせる）。一覧の名前も2行まで。
   ・📞 電話（v547）：⚙ 設定で かけられる・かける前に聞く・かけない（番号は文字だけ）を選べる（rk.call）。
   ・あ よみ（v548）：よみを ひらがな／カタカナに そろえる。よみのない人に 名前の漢字から ふつうの読みを入れる（辞書は renraku-yomi.js。使うときに読む）。
     入れた人は 表で見なおせる。↶ で戻せる。新しく入れるよみの字（rk.ykana）。直す画面の「📝 名前から よみを入れる」・「よみなし」の絞りこみ・表からも。
   ・🔢 色の No.（v549）：色に No. を振って 並ぶ順番を決める（rk.corder。↑↓・No. をえらぶ）。「🎨 色」の一覧は 上から／下から（rk.cdir）。
     No. を 色の札・見出し・表にも出せる（rk.cno）。スマホに戻す・CSV には No. を書かない（読みなおしで色がわかるように）。
   ・（v550）並べ方のボタン（よみ順・グループ・会社・色・新しい）の順番（rk.vorder）。えらんだ並べ方の右に 小さい ⇅（上から／下から。rk.vdir・色は rk.cdir）と
     🔢（色の No.・グループの順番）。電話番号だけ大きく（rk.telSize）。色の名前を グループにも入れる（rk.cgrp）。横持ちでは 一覧を左・ほかは右に。
     写真のかわりに 🙂 アイコン（renraku-icons.js。人・会社 70こ）。連絡帳だけのアプリ（renraku-app/）からも読む（window.RK_BASE）。
   ・（v551）下のボタン（＋入れる・🎨色分け・☑えらぶ・📇スマホに戻す）は ふだん 右下の ◀ に たたむ。◀ で出し、バーの右端の ▶ で たたむ
     （▶ を押すまで 出したまま。開くたびに たたんで はじまる。rk.addbar：fold／show）。
   ・（v552）🎨 色を 24色に。背景（無地・ストライプ・水玉・グラデーション・チェック・波）と組み合わせる（item.color は 'red'・'red+dot'）。
     名前を付けた色（色＋背景）だけが 🔢 No.・並ぶ順番・自分好みの色の一覧に出る（名前のない色は そのあとに 色の順）。
   ・（v553）端末の「戻る」：🎨 色分け・☑ えらぶ の あいだは その動きだけ おわる。🧩 自分好みにする から開いた 🔢 色の No. は 🧩 に戻る。
   ・（v554）名前を付けた色は、あとから 色・背景だけを変えられる（名前・No.・その色の人は そのまま。ほかの名前の色をえらぶと 入れかえ）。
     一覧の右はしに 色の名前のグループのアイコン（🎨）は 出さない（色の札と同じなので）。
   ・（v555）ふりがな（よみ）を 出す／一覧では出さない／出さない（rk.furi）。名前を押した画面の 電話番号を大きく。
     その画面の「✏ 直す」の上に 📝 メモ欄（x.note。その場で書ける）。書いたメモは 一覧の 電話番号の下にも出す（rk.lmemo）。
   ・（v556）🎤 声でさがす は ふりがな（よみ）を先に：聞き取った字を よみの辞書で よみに直し（候補もいくつか）、人の よみと くらべる。
     小さい字・にごり・のばす音の ちがい・1〜2字の 聞きまちがいも ゆるく見て、「見つかった人」のあとに「よみの近い人（候補）」も出す。
   ・（v566）同じ人を いっしょにするとき、名前（姓・名・表示名）は ひとまとまりで どちらか片方から もらう（前は 空いた欄を うめて「山田太郎 太郎」になることがあった）。
     ちがう名前は メモに「別の名前：」。🔍 同じ人の画面で 名前が ちがう組は「のこす名前」を えらべる。
     🧹 整理（上の札の いちばん左）：絞りこみ（📵 電話もメールもない・❓ 名前のない・🗂 まだ仕分けていない・🗑 消す候補）・🗂 1人ずつ仕分ける（rkSortOverlay。
     ✓ 残す・🗑 消す候補・⏭ あとで・グループ・色・★・✏・↶・続きから。x.seen・x.del・rk.soAt）・🏢 会社ごとに グループを作る。 */
(function(){
const RK_KEY='excalc_renraku', RK_MAX=5000;
let rkVoice=null;   // 🎤 声でさがした とき（v556）：{q:さがす欄の字, texts:聞き取りの候補, reads:[{s,l}] よみ, sc:Map 人ごとの点}
let rk=null, rkQ='', rkGrp='', rkCol='', rkSel=null, rkPaint=null, rkT=null, rkViewId=null, rkEd=null, rkScrClean=null, rkDupCache=[], rkDupNm={}, rkRec=null, rkIO=null, rkYUndo=null, rkYLast=null, rkIconRes=null, rkIconCat='ym', rkAddOpen=false;
const $=id=>document.getElementById(id);
const RK_BASE=(typeof window.RK_BASE==='string')?window.RK_BASE:'';   // 辞書・アイコンの場所（連絡帳だけのアプリから ../ を読むとき。v550）
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const ymdOk=s=>/^\d{4}-\d\d-\d\d$/.test(s||'');
const fmtDay=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); if(!m) return ''; return (+m[1]===new Date().getFullYear()?'':m[1]+'年')+(+m[2])+'月'+(+m[3])+'日'; };
/* さがす・並べるための読みそろえ（カタカナ・半角カナ→ひらがな、全角→半角、空白や記号をとる） */
const hira=s=>String(s||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const rkNorm=s=>hira(s).toLowerCase().replace(/[\s・、。,.\-ー~〜「」『』()（）]/g,'');
const digits=s=>String(s||'').normalize('NFKC').replace(/\D/g,'');
const CTRL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const line=(v,n)=>String(v==null?'':v).replace(CTRL,'').replace(/[\r\n]+/g,' ').trim().slice(0,n);
const text=(v,n)=>String(v==null?'':v).replace(CTRL,'').replace(/\r\n?/g,'\n').trim().slice(0,n);
const arr=a=>Array.isArray(a)?a:[];

const TEL_T=[['cell','携帯'],['home','自宅'],['work','勤務先'],['main','代表'],['fax','FAX'],['other','その他']];
const MAIL_T=[['home','自宅'],['work','勤務先'],['cell','携帯'],['other','その他']];
const ADR_T=[['home','自宅'],['work','勤務先'],['other','その他']];
const tName=(T,x)=>(x&&x.l) || (T.find(a=>a[0]===(x&&x.t))||T[T.length-1])[1];
const okKey=(T,t)=>T.some(a=>a[0]===t);
const GROUP_ICONS=['👪','🏠','👴','👵','🧒','🧑‍🤝‍🧑','💼','🏗','🌾','🏘','🏫','🏥','🛒','🍶','⚽','🎵','⛩','⭐','❤️','📌'];
const GROUP_PRESETS=[['家族','👪'],['親戚','🏠'],['友だち','🧑‍🤝‍🧑'],['仕事','💼'],['ご近所','🏘'],['学校','🏫'],['病院・お店','🏥']];
const FIELD_PRESETS=[['間柄','text',[]],['年賀状','pick',['送る','もらう','やりとり','喪中','やめた']],['子どもの名前','text',[]],['連絡のしかた','pick',['電話','LINE','メール','手紙']],['好きなもの','text',[]]];
/* 🎨 色分けの色（v544。v552 で 24色に）。はじめの 12色は 前のまま（No. の はじめの順・書き出しの名前も 同じ） */
const PAL=[['red','赤','#e53935'],['orange','だいだい','#f57c00'],['yellow','黄','#fbc02d'],['lime','黄緑','#7cb342'],['green','緑','#2e7d32'],['teal','青緑','#00897b'],
  ['sky','水色','#29b6f6'],['blue','青','#1e5fd0'],['purple','紫','#8e24aa'],['pink','ピンク','#ec407a'],['brown','茶','#8d6e63'],['gray','灰色','#78909c'],
  ['maroon','えんじ','#8e1b2e'],['salmon','サーモン','#ff8a65'],['lemon','レモン','#fff176'],['wakakusa','若草','#aed581'],['olive','オリーブ','#827717'],['mint','ミント','#80cbc4'],
  ['sora','空色','#90caf9'],['navy','紺','#1a237e'],['lavender','ラベンダー','#b39ddb'],['sakura','さくら','#f8bbd0'],['choco','こげ茶','#5d4037'],['black','黒','#263238']];
const PAL_KEYS=PAL.map(p=>p[0]);
/* 背景（v552）：色に重ねる 柄。'' は 無地 */
const PAT=[['','無地'],['st','ストライプ'],['dot','水玉'],['gr','グラデーション'],['ck','チェック'],['wv','波']];
const PAT_KEYS=PAT.map(p=>p[0]);
/* 色分けの しるし（item.color・rk.colors・rk.corder のキー）：'red'（赤）・'red+dot'（赤・水玉） */
const ckSplit=k=>{ const t=String(k||''), i=t.indexOf('+'); return i<0 ? [t,''] : [t.slice(0,i), t.slice(i+1)]; };
const ckOk=k=>{ if(typeof k!=='string' || !k) return false; const [c,q]=ckSplit(k); return PAL_KEYS.includes(c) && PAT_KEYS.includes(q) && (q!=='' || !k.includes('+')); };
const ckMake=(c,q)=>PAL_KEYS.includes(c) ? ((q && PAT_KEYS.includes(q)) ? c+'+'+q : c) : '';
const ckRank0=k=>{ const [c,q]=ckSplit(k); return PAL_KEYS.indexOf(c)*PAT.length+PAT_KEYS.indexOf(q); };   // はじめの順（色の順 → 背景の順）
const palOf=k=>PAL.find(p=>p[0]===ckSplit(k)[0]);
const patOf=k=>ckSplit(k)[1];
const patName=q=>(PAT.find(p=>p[0]===q)||['',''])[1];
const colHex=k=>ckOk(k) ? palOf(k)[2] : '';
const colBase=k=>ckOk(k) ? palOf(k)[1]+(patOf(k)?'・'+patName(patOf(k)):'') : '';   // 「赤」「赤・水玉」
const colLabel=k=>ckOk(k) ? ((rk && rk.colors[k]) || colBase(k)) : '';   // 名前を付けていれば その名前
const colFull=k=>{ if(!ckOk(k)) return ''; const l=rk && rk.colors[k]; return l ? colBase(k)+'（'+l+'）' : colBase(k); };
/* 🔢 色の No.（v549。v552 から 名前を付けた色だけ）：No. の順は rk.corder（ないものは はじめの順）。名前のない色に No. はない。
   No. を出すときは「No.1 要連絡」（colLabelD・colFullD は 画面に出す用。書き出しは colFull のまま） */
const cNamed=()=>(rk && rk.colors) ? Object.keys(rk.colors).filter(k=>ckOk(k) && rk.colors[k]) : [];
const cOrd=()=>{ const n=cNamed(), o=(rk && Array.isArray(rk.corder)) ? rk.corder.filter((k,i,a)=>n.includes(k) && a.indexOf(k)===i) : [];
  return o.concat(n.filter(k=>!o.includes(k)).sort((a,b)=>ckRank0(a)-ckRank0(b))); };
const cNo=k=>cOrd().indexOf(k)+1;   // 0 は No. なし（名前のない色）
const cSortKeys=ks=>{ const o=cOrd(), r=k=>{ const i=o.indexOf(k); return i>=0 ? i : 1000+ckRank0(k); }; return ks.slice().sort((a,b)=>r(a)-r(b)); };   // 名前のある色（No. 順）→ ない色（はじめの順）
const noP=k=>(rk && rk.cno && cNo(k)) ? 'No.'+cNo(k)+' ' : '';
const colLabelD=k=>noP(k)+colLabel(k);
const colFullD=k=>noP(k)+colFull(k);
/* 並べ方（v550）：ボタンの順番は rk.vorder。上から／下から は rk.vdir（色は rk.cdir） */
const VIEWS=[['kana','あ よみ順'],['group','🏷 グループ'],['org','🏢 会社'],['color','🎨 色'],['new','🕘 新しい']];
const VIEW_KEYS=VIEWS.map(v=>v[0]);
const vOrd=()=>(rk && Array.isArray(rk.vorder) && rk.vorder.length===VIEWS.length) ? rk.vorder : VIEW_KEYS;
const vDir=v=>v==='color' ? (rk.cdir==='down'?'down':'up') : ((rk.vdir && rk.vdir[v]==='down') ? 'down' : 'up');
/* 色の上の文字：白で読めるなら白、むりなら黒 */
const colInk=k=>{ const h=colHex(k); if(!h) return '#fff';
  const v=[1,3,5].map(i=>parseInt(h.substr(i,2),16)/255).map(c=>c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)), L=0.2126*v[0]+0.7152*v[1]+0.0722*v[2];
  return 1.05/(L+0.05)>=3 ? '#fff' : '#1a1a1a'; };
/* 背景の 柄（v552）：クラス（pt-st など）と、ぬりつぶした色の上に重ねる 柄の色（暗い色には 白っぽく、明るい色には 黒っぽく） */
const ptCls=k=>(ckOk(k) && patOf(k)) ? ' pt-'+patOf(k) : '';
const swSt=k=>`--rkc:${colHex(k)};--rki:${colInk(k)};--rkp:${colInk(k)==='#fff'?'rgba(255,255,255,.5)':'rgba(0,0,0,.22)'}`;
const dotH=(k,big)=>ckOk(k) ? `<i class="rk-dot${big?' big':''}${ptCls(k)}" style="${swSt(k)}"></i>` : '';
const COL_CF='色分け';   // スマホのメモ欄・CSV では「［色分け］赤（要連絡）」「［色分け］赤・水玉（年賀状）」
/* 「赤」「赤・水玉」「赤（要連絡）」「要連絡」「red」「red+dot」→ 色。learn のときは、まだ名前のない色に（ ）の名前を付ける */
function rkColorFrom(s, learn){
  const t=line(s,40); if(!t) return '';
  const m=/^(.+?)(?:[（(]([^（）()]{1,12})[)）])?$/.exec(t), nm=(m?m[1]:t).trim(), lb=m&&m[2]?m[2].trim():'';
  let k=ckOk(nm.toLowerCase()) ? nm.toLowerCase() : '';
  if(!k){ const [a,b,z]=nm.split(/[・･]/).map(y=>y.trim()), c=(PAL.find(p=>p[1]===a)||[])[0], q=b===undefined ? '' : (PAT.find(p=>p[0] && p[1]===b)||[])[0];
    if(c && q!==undefined && z===undefined) k=ckMake(c,q); }
  if(!k && rk) k=Object.keys(rk.colors).find(c=>ckOk(c) && rk.colors[c]===t) || '';
  if(k && lb && learn && rk && !rk.colors[k] && !Object.values(rk.colors).includes(lb)) rk.colors[k]=lb;
  return k||'';
}

/* ── 名前・よみ ── */
const isLatin=s=>/^[A-Za-z]/.test(String(s||'').trim());
function rkName(x){
  if(x.fn) return x.fn;
  if(x.fam||x.giv) return (isLatin(x.fam||x.giv) ? [x.giv,x.fam] : [x.fam,x.giv]).filter(Boolean).join(' ');
  return x.org||x.nick||(x.tels[0]&&x.tels[0].v)||(x.mails[0]&&x.mails[0].v)||'（名前なし）';
}
const rkYomi=x=>[x.famK,x.givK].filter(Boolean).join(' ');
const rkSortKey=x=>hira(rkYomi(x)||rkName(x)).replace(/[\s　]/g,'');
const cmpKana=(a,b)=>rkSortKey(a).localeCompare(rkSortKey(b),'ja') || rkName(a).localeCompare(rkName(b),'ja');
const ROWS=['あ','か','さ','た','な','は','ま','や','ら','わ','A','他'];
function rkRow(x){
  const c=rkSortKey(x).charAt(0), k=c.charCodeAt(0);
  if((k>=0x3041&&k<=0x304A)||k===0x3094) return 'あ';
  if((k>=0x304B&&k<=0x3054)||k===0x3095||k===0x3096) return 'か';
  if(k>=0x3055&&k<=0x305E) return 'さ';
  if(k>=0x305F&&k<=0x3069) return 'た';
  if(k>=0x306A&&k<=0x306E) return 'な';
  if(k>=0x306F&&k<=0x307D) return 'は';
  if(k>=0x307E&&k<=0x3082) return 'ま';
  if(k>=0x3083&&k<=0x3088) return 'や';
  if(k>=0x3089&&k<=0x308D) return 'ら';
  if(k>=0x308E&&k<=0x3093) return 'わ';
  if(/[a-z]/i.test(c)) return 'A';
  return '他';
}
const noYomi=x=>!x.famK && !x.givK && /[\u3400-\u9fff]/.test(rkName(x));
const AV_COLORS=['#4f6fb3','#3f8f6b','#b5654a','#8a5bb0','#3d8fa6','#a8603d','#5c7d3a','#b04a6f'];
const rkColor=x=>{ let h=0; for(const c of String(x.id)) h=(h*31+c.charCodeAt(0))>>>0; return AV_COLORS[h%AV_COLORS.length]; };
const rkInitial=x=>{ const n=rkName(x).trim(); return n.charAt(0)==='（'?'？':Array.from(n)[0]||'？'; };
/* 電話番号のそろえ（+81 → 0、数字だけ、下10けた） */
function rkTelKey(v){ let d=digits(v); if(/^81\d{9,10}$/.test(d)) d='0'+d.slice(2); return d.length>=9 ? d.slice(-10) : ''; }
const rkNameKey=x=>{ const k=rkNorm(rkName(x)); return k.length>=2 && !/^\d+$/.test(k) ? k : ''; };
function rkAdrText(a){ return [a.region,a.city,a.street,a.ext].filter(Boolean).join(' ')+(a.country&&!/^(日本|japan|jp|jpn)$/i.test(a.country)?' '+a.country:''); }

/* ── 保存 ── */
const LIM={fam:40,giv:40,famK:60,givK:60,fn:80,nick:40,org:80,dept:80,title:60};
function rkCleanItem(x){
  x=(x&&typeof x==='object')?x:{};
  const o={id:safeId(x.id, uid)};
  for(const k in LIM) o[k]=line(x[k], LIM[k]);
  o.note=text(x.note, 3000);
  const nx=(x.nx&&typeof x.nx==='object')?{m:line(x.nx.m,40),p:line(x.nx.p,20),s:line(x.nx.s,20)}:null;
  o.nx=(nx&&(nx.m||nx.p||nx.s))?nx:null;
  o.tels=arr(x.tels).map(t=>({t:okKey(TEL_T,t&&t.t)?t.t:'other', l:line(t&&t.l,20), v:line(t&&t.v,40), p:!!(t&&t.p)})).filter(t=>t.v).slice(0,12);
  o.mails=arr(x.mails).map(t=>({t:okKey(MAIL_T,t&&t.t)?t.t:'other', l:line(t&&t.l,20), v:line(t&&t.v,120), p:!!(t&&t.p)})).filter(t=>t.v).slice(0,8);
  o.adrs=arr(x.adrs).map(a=>({t:okKey(ADR_T,a&&a.t)?a.t:'other', l:line(a&&a.l,20), pob:line(a&&a.pob,40), ext:line(a&&a.ext,100), street:line(a&&a.street,200),
    city:line(a&&a.city,80), region:line(a&&a.region,40), zip:line(a&&a.zip,12), country:line(a&&a.country,40), p:!!(a&&a.p)}))
    .filter(a=>a.pob||a.ext||a.street||a.city||a.region||a.zip||a.country).slice(0,6);
  o.urls=arr(x.urls).map(u=>line(u,300)).filter(Boolean).slice(0,6);
  o.groups=[...new Set(arr(x.groups).map(g=>line(g,20)).filter(Boolean))].slice(0,20);
  o.cf={};
  if(x.cf && typeof x.cf==='object') for(const k of Object.keys(x.cf).slice(0,40)) if(/^f[0-9a-z]{1,10}$/.test(k)){ const v=line(x.cf[k],200); if(v) o.cf[k]=v; }
  o.bday=/^(\d{4}|-)-\d\d-\d\d$/.test(x.bday||'')?x.bday:'';
  o.bdayLine=o.bday?line(x.bdayLine,200):'';
  o.raw=arr(x.raw).map(l=>String(l==null?'':l).replace(/[\r\n]+/g,'')).filter(l=>l.length<=6000 && /^[A-Za-z0-9.\-]+[;:]/.test(l) && !/^(BEGIN|END|VERSION)[;:]/i.test(l)).slice(0,40);
  o.fav=!!x.fav; o.photo=!!x.photo; o.color=ckOk(x.color)?x.color:'';
  o.added=ymdOk(x.added)?x.added:today(); o.updated=ymdOk(x.updated)?x.updated:o.added;
  o.ts=Math.max(0, +x.ts||0);
  if(x.del) o.del=true; if(x.seen) o.seen=true;   // 🧹 整理（v566）：🗑 消す候補・🗂 1人ずつ仕分けで 見おわった人（この連絡帳の中の しるし。書き出さない・「直した日」も変えない）
  return o;
}
const rkHasAny=x=>!!(x.fam||x.giv||x.fn||x.org||x.nick||x.tels.length||x.mails.length);
/* 表で直す の列（名前のほか） */
const TCOL_RE=/^(yomi|color|fav|cell|tel|mail|org|dept|title|nick|zip|adr|bday|groups|note|cf:f[0-9a-z]{1,10})$/;
const TW_MIN=60, TW_MAX=480;   // 表の列の幅（押して動かしたもの）
function rkDefaults(){ return { v:1, view:'kana', groups:[], fields:[], sub:'tel', big:false, noteCf:true, call:'on', ykana:'', corder:[], cdir:'up', cno:false, vorder:VIEW_KEYS.slice(), vdir:{}, telSize:0, cgrp:false, furi:'', lmemo:true, addbar:'fold', tipFold:false, lastExp:0, notDup:[], colors:{}, pc:'red', thide:['dept','title','nick','zip'], tw:{}, soAt:'', items:[] }; }
function rkClean(o){
  const d=rkDefaults(); if(!o || typeof o!=='object') return d;
  d.view=['kana','group','org','color','new'].includes(o.view)?o.view:'kana';
  if(o.colors && typeof o.colors==='object') for(const k of Object.keys(o.colors).slice(0,400)) if(ckOk(k)){ const l=line(o.colors[k],12); if(l && !Object.values(d.colors).includes(l)) d.colors[k]=l; }   // 色（＋背景）の名前。同じ名前は 1つだけ
  d.pc=ckOk(o.pc)?o.pc:'red';
  if(Array.isArray(o.thide)) d.thide=[...new Set(o.thide.filter(k=>typeof k==='string' && TCOL_RE.test(k)))].slice(0,60);
  if(o.tw && typeof o.tw==='object') for(const k of Object.keys(o.tw).slice(0,60)) if(k==='name' || TCOL_RE.test(k)){ const v=Math.round(+o.tw[k]); if(v>=TW_MIN && v<=TW_MAX) d.tw[k]=v; }
  d.groups=arr(o.groups).map(g=>({n:line(g&&g.n,20), ic:line(g&&g.ic,8)})).filter(g=>g.n).filter((g,i,a)=>a.findIndex(h=>h.n===g.n)===i).slice(0,60);
  d.fields=arr(o.fields).map(f=>({id:/^f[0-9a-z]{1,10}$/.test(f&&f.id)?f.id:'', n:line(f&&f.n,20), ty:(f&&f.ty==='pick')?'pick':'text',
    op:arr(f&&f.op).map(x=>line(x,20)).filter(Boolean).slice(0,12)})).filter(f=>f.id&&f.n).filter((f,i,a)=>a.findIndex(h=>h.id===f.id)===i).slice(0,30);
  d.sub=(typeof o.sub==='string' && /^(tel|org|group|note|none|cf:f[0-9a-z]{1,10})$/.test(o.sub))?o.sub:'tel';
  d.big=!!o.big; d.noteCf=o.noteCf!==false; d.lastExp=Math.max(0,+o.lastExp||0);
  d.call=['on','ask','off'].includes(o.call)?o.call:'on';   // 📞 電話をかける：かけられる・かける前に聞く・かけない（v547）
  d.ykana=['hira','kata'].includes(o.ykana)?o.ykana:'';     // 新しく入れる よみの字（v548。'' は いま多いほう）
  d.corder=arr(o.corder).filter((k,i,a)=>ckOk(k) && a.indexOf(k)===i && d.colors[k]).slice(0,400);   // 🔢 色の No. の順（v549。v552 から 名前を付けた色だけ。ないものは はじめの順）
  d.cdir=o.cdir==='down'?'down':'up'; d.cno=!!o.cno;
  { const vo=arr(o.vorder).filter((k,i,a)=>VIEW_KEYS.includes(k) && a.indexOf(k)===i); d.vorder=vo.concat(VIEW_KEYS.filter(k=>!vo.includes(k))); }   // 並べ方のボタンの順番（v550）
  if(o.vdir && typeof o.vdir==='object') ['kana','group','org','new'].forEach(k=>{ if(o.vdir[k]==='down') d.vdir[k]='down'; });   // 上から／下から（色は cdir）
  d.telSize=[0,1,2].includes(o.telSize)?o.telSize:0; d.cgrp=!!o.cgrp;   // 電話番号の大きさ・色の名前をグループにも（v550）
  d.furi=['list','off'].includes(o.furi)?o.furi:''; d.lmemo=o.lmemo!==false;   // ふりがな：出す／一覧では出さない／出さない・メモを一覧にも出す（v555）
  d.addbar=o.addbar==='show'?'show':'fold'; d.tipFold=!!o.tipFold;   // 下のボタン：右下に たたむ／いつも出す・たたんだ案内を出した（v551）
  d.notDup=arr(o.notDup).filter(p=>typeof p==='string' && /^[A-Za-z0-9_-]{1,80}\|[A-Za-z0-9_-]{1,80}$/.test(p)).slice(0,3000);
  d.soAt=(typeof o.soAt==='string' && /^[A-Za-z0-9_-]{1,80}$/.test(o.soAt))?o.soAt:'';   // 🗂 1人ずつ仕分ける の つづき（最後に 仕分けた人。v566）
  d.items=arr(o.items).filter(x=>x && typeof x==='object').slice(0,RK_MAX).map(rkCleanItem).filter(rkHasAny);
  const seen=new Set(); d.items.forEach(x=>{ while(seen.has(x.id)) x.id=uid(); seen.add(x.id); });
  d.items.forEach(x=>x.groups.forEach(g=>{ if(!d.groups.some(h=>h.n===g)) d.groups.push({n:g, ic:''}); }));
  return d;
}
function rkLoad(){ rkSaveFlush(); try{ rk=rkClean(JSON.parse(localStorage.getItem(RK_KEY)||'null')); }catch(_){ rk=rkClean(null); } }
function rkSave(){ if(rkSaveT){ clearTimeout(rkSaveT); rkSaveT=0; } try{ localStorage.setItem(RK_KEY, JSON.stringify(rk)); return true; }catch(_){ toast('端末の空きが足りず、保存できませんでした（写真を外す・ほかの保存を減らしてください）', 4500); return false; } }
/* 色をぬる・表で直す ときは、続けて押すので 少しまとめて保存する（閉じる・裏に回るときは すぐ） */
let rkSaveT=0;
function rkSaveSoon(){ clearTimeout(rkSaveT); rkSaveT=setTimeout(()=>{ rkSaveT=0; rkSave(); }, 300); }
function rkSaveFlush(){ if(rkSaveT && rk) rkSave(); }
const rkFind=id=>rk.items.find(x=>x.id===id);
function rkSyncGroups(){ rk.items.forEach(x=>x.groups.forEach(g=>{ if(!rk.groups.some(h=>h.n===g)) rk.groups.push({n:g, ic:''}); })); }
const gIcon=n=>{ const g=rk.groups.find(h=>h.n===n); return g?g.ic:''; };
function rkFieldByName(n, make){
  n=line(n,20); if(!n) return null;
  let f=rk.fields.find(y=>y.n===n);
  if(!f && make && rk.fields.length<30){ f={id:rkNewFieldId(), n, ty:'text', op:[]}; rk.fields.push(f); }
  return f||null;
}
function rkNewFieldId(){ let i=1; while(rk.fields.some(f=>f.id==='f'+i.toString(36))) i++; return 'f'+i.toString(36); }

/* ── 写真（IndexedDB excalc_renraku。キーは人の id） ── */
let rkDbP=null;
function rkDb(){
  if(rkDbP) return rkDbP;
  rkDbP=new Promise((res,rej)=>{ try{
    const r=indexedDB.open('excalc_renraku',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('pics');
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  }catch(e){ rej(e); } }).catch(e=>{ rkDbP=null; throw e; });
  return rkDbP;
}
async function rkPicGet(k){ try{ const db=await rkDb(); return await new Promise(r=>{ const q=db.transaction('pics').objectStore('pics').get(k); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); }catch(_){ return null; } }
async function rkPicPut(k,data){ const db=await rkDb(); return new Promise((res,rej)=>{ const t=db.transaction('pics','readwrite'); t.objectStore('pics').put(data,k); t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error); }); }
async function rkPicDel(k){ try{ const db=await rkDb(); await new Promise(r=>{ const t=db.transaction('pics','readwrite'); t.objectStore('pics').delete(k); t.oncomplete=r; t.onerror=r; }); }catch(_){} }
const rkPics={};   // id → dataURL（一度読んだものは覚えておく）
async function rkPic(id){ if(rkPics[id]===undefined) rkPics[id]=await rkPicGet(id); return rkPics[id]; }
function rkResizeSrc(src, max, q){
  return new Promise((res,rej)=>{ const im=new Image();
    im.onload=()=>{ const k=Math.min(1, max/Math.max(im.naturalWidth||1, im.naturalHeight||1)); const cv=document.createElement('canvas');
      cv.width=Math.max(1,Math.round(im.naturalWidth*k)); cv.height=Math.max(1,Math.round(im.naturalHeight*k)); cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
      res(cv.toDataURL('image/jpeg', q||0.8)); };
    im.onerror=()=>rej(new Error('img')); im.src=src; });
}
async function rkFilePic(file){ const url=URL.createObjectURL(file); try{ return safeImg(await rkResizeSrc(url, 480, 0.8)); }finally{ URL.revokeObjectURL(url); } }
/* 読み込んだ写真：写真の形のものだけ。大きいものは小さくする */
async function rkFitPic(d){ if(!safeImg(d)) return ''; if(d.length<=160000) return d; try{ return safeImg(await rkResizeSrc(d, 480, 0.8)); }catch(_){ return ''; } }

/* ── vCard を読む ──
   1行目から順に：折り返し（行頭の空白）と QUOTED-PRINTABLE の「=」での行の続きをつなぐ → 項目名・パラメータ・値に分ける。
   文字コードは、ファイル全体が UTF-8 でなければ Shift_JIS（ガラケー）。QUOTED-PRINTABLE は CHARSET に合わせて読む。 */
function rkCharset(cs){
  cs=String(cs||'utf-8').toLowerCase().replace(/^x-/,'');
  if(/^(shift[_-]?jis|sjis|cp932|windows-31j|ms932|ms_kanji)$/.test(cs)) return 'shift_jis';
  if(/euc-?jp/.test(cs)) return 'euc-jp';
  if(/iso-2022-jp|^jis$/.test(cs)) return 'iso-2022-jp';
  return /^utf-?8$/.test(cs)?'utf-8':cs;
}
function rkDecode(bytes, cs){ try{ return new TextDecoder(rkCharset(cs)).decode(bytes); }catch(_){ return new TextDecoder('utf-8').decode(bytes); } }
function rkFileText(buf){
  const u=new Uint8Array(buf);
  if(u[0]===0xFF && u[1]===0xFE) return new TextDecoder('utf-16le').decode(u).replace(/^\uFEFF/,'');
  if(u[0]===0xFE && u[1]===0xFF) return new TextDecoder('utf-16be').decode(u).replace(/^\uFEFF/,'');
  try{ return new TextDecoder('utf-8',{fatal:true}).decode(u).replace(/^\uFEFF/,''); }catch(_){}
  return rkDecode(u,'shift_jis');
}
function rkQP(s, cs){
  const b=[], enc=new TextEncoder();
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(c==='=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i+1,2))){ b.push(parseInt(s.substr(i+1,2),16)); i+=2; }
    else if(c==='=' && i===s.length-1){}
    else { const k=c.charCodeAt(0); if(k<0x80) b.push(k); else enc.encode(c).forEach(x=>b.push(x)); }
  }
  return rkDecode(new Uint8Array(b), cs);
}
const isQPHead=s=>/(^|;)(ENCODING=)?QUOTED-PRINTABLE(;|$)/i.test(String(s).split(':')[0]);
function rkLines(t){
  const L=String(t).replace(/\r\n?/g,'\n').split('\n'), out=[];
  for(let i=0;i<L.length;i++){
    let s=L[i];
    if(/^[ \t]/.test(s) && out.length){ out[out.length-1]+=s.slice(1); continue; }
    if(isQPHead(s)) while(s.endsWith('=') && i+1<L.length) s=s.slice(0,-1)+L[++i];
    out.push(s);
  }
  return out;
}
/* 「\」で守られていない区切りで分ける */
function rkSplit(v, sep){ const out=[]; let cur=''; for(let i=0;i<v.length;i++){ const c=v[i]; if(c==='\\' && i+1<v.length){ cur+=c+v[i+1]; i++; continue; } if(c===sep){ out.push(cur); cur=''; } else cur+=c; } out.push(cur); return out; }
const un=s=>String(s==null?'':s).replace(/\\(.)/g,(m,c)=>(c==='n'||c==='N')?'\n':c);
function rkProp(ln){
  let q=false, i=0;
  for(; i<ln.length; i++){ const c=ln[i]; if(c==='"') q=!q; else if(c===':' && !q) break; }
  if(i>=ln.length) return null;
  const head=ln.slice(0,i), value=ln.slice(i+1);
  const parts=[]; let cur='', qq=false, par=0;
  for(const c of head){ if(c==='"') qq=!qq; if(c==='(') par++; if(c===')') par=Math.max(0,par-1); if(c===';' && !qq && !par){ parts.push(cur); cur=''; } else cur+=c; }
  parts.push(cur);
  let name=parts[0].trim(), group='';
  const dot=name.indexOf('.'); if(dot>0){ group=name.slice(0,dot); name=name.slice(dot+1); }
  name=name.toUpperCase();
  if(!/^[A-Z0-9-]+$/.test(name)) return null;
  const params={}, types=[]; let custom='';
  for(const p0 of parts.slice(1)){
    const p=p0.trim(); if(!p) continue;
    const cx=/^X-CUSTOM\((.*)\)$/i.exec(p);   // Android：TEL;X-CUSTOM(CHARSET=UTF-8,ENCODING=QUOTED-PRINTABLE,=E5=AE=9F=E5=AE=B6)
    if(cx){ const a=cx[1].split(','), lab=a[a.length-1]||''; const csm=/CHARSET=([^,]+)/i.exec(cx[1]); custom=/QUOTED-PRINTABLE/i.test(cx[1])?rkQP(lab, csm?csm[1]:'utf-8'):lab; continue; }
    const eq=p.indexOf('=');
    if(eq<0){ const u=p.toUpperCase(); if(u==='QUOTED-PRINTABLE'||u==='BASE64'||u==='B') params.ENCODING=u; else types.push(u); continue; }
    const k=p.slice(0,eq).toUpperCase(), v=p.slice(eq+1).replace(/^"|"$/g,'');
    if(k==='TYPE') v.split(',').forEach(t=>{ t=t.trim().toUpperCase(); if(t) types.push(t); });
    else if(k==='PREF') types.push('PREF');
    else params[k]=v;
  }
  return {ln, head, group, name, params, types, custom, value, qp:String(params.ENCODING||'').toUpperCase()==='QUOTED-PRINTABLE'};
}
const rkVal=p=>p.qp ? rkQP(p.value, p.params.CHARSET||'utf-8') : p.value;
/* 知らない項目はそのまま持つ（QUOTED-PRINTABLE だったものは、読める文字にして持つ） */
function rkRaw(p, v){
  if(!p.qp) return p.ln;
  const head=[(p.group?p.group+'.':'')+p.name].concat(rkSplit(p.head,';').slice(1).filter(x=>!/^(ENCODING=)?QUOTED-PRINTABLE$/i.test(x.trim()) && !/^CHARSET=/i.test(x.trim()))).join(';');
  return head+':'+String(v).replace(/\r?\n/g,'\\n');
}
const SYS_LABEL={MOBILE:'cell',IPHONE:'cell',HOME:'home',WORK:'work',MAIN:'main',HOMEFAX:'fax',WORKFAX:'fax',OTHERFAX:'fax',OTHER:'other',PAGER:'other'};
function rkLabelType(T, types, label){
  const lab=String(label||'').trim();
  if(lab){
    const m=/^_\$!<(.+)>!\$_$/.exec(lab);   // iPhone の決まったラベル（_$!<Mobile>!$_ など）
    if(m){ const k=SYS_LABEL[m[1].toUpperCase().replace(/[^A-Z]/g,'')]; if(k && okKey(T,k)) return {t:k}; return {t:'other'}; }
    return {t:'other', l:lab.slice(0,20)};
  }
  const has=t=>types.includes(t);
  if(okKey(T,'fax') && has('FAX')) return {t:'fax'};
  if(has('CELL')||has('MOBILE')||has('IPHONE')) return okKey(T,'cell')?{t:'cell'}:{t:'other'};
  if(okKey(T,'main') && has('MAIN')) return {t:'main'};
  if(has('HOME')) return {t:'home'};
  if(has('WORK')) return {t:'work'};
  if(has('PAGER')) return {t:'other', l:'ポケベル'};
  const x=types.find(t=>/^X-./.test(t) && !/^X-(INTERNET|VOICE)$/.test(t)); if(x) return {t:'other', l:x.slice(2).slice(0,20)};
  return {t:'other'};
}
const rkMd=(mm,dd)=>+mm>=1 && +mm<=12 && +dd>=1 && +dd<=31;
function rkDate(v){
  v=String(v||'').trim(); let m;
  if((m=/^--(\d\d)-?(\d\d)/.exec(v))) return rkMd(m[1],m[2]) ? '--'+m[1]+'-'+m[2] : '';
  if((m=/^(\d{4})-?(\d\d)-?(\d\d)/.exec(v))) return rkMd(m[2],m[3]) ? (+m[1]<=1604?'--':m[1]+'-')+m[2]+'-'+m[3] : '';   // iPhone は年がないとき 1604 年
  if((m=/^(\d{4})[\/.年](\d{1,2})[\/.月](\d{1,2})/.exec(v))) return rkMd(m[2],m[3]) ? m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]) : '';
  if((m=/^(\d{1,2})[\/月](\d{1,2})日?$/.exec(v))) return rkMd(m[1],m[2]) ? '--'+pad(+m[1])+'-'+pad(+m[2]) : '';
  return '';
}
function rkPhoto(p, v){
  const s=String(v||'').trim();
  if(/^data:image\//i.test(s)) return safeImg(s.replace(/\s+/g,'')) || '';
  const enc=String(p.params.ENCODING||'').toUpperCase();
  if(enc==='B'||enc==='BASE64'||p.types.includes('BASE64')){
    let t=(p.types.find(x=>/^(IMAGE\/)?(JPEG|JPG|PNG|GIF|WEBP)$/.test(x))||'JPEG').toLowerCase().replace(/^image\//,'').replace('jpg','jpeg');
    if(!/^(jpeg|png|gif|webp)$/.test(t)) t='jpeg';
    return safeImg('data:image/'+t+';base64,'+s.replace(/[^A-Za-z0-9+/=]/g,'')) || '';
  }
  return '';
}
/* 自分の項目：メモ欄の「［間柄］叔父」の行を、項目に戻す */
function rkNoteCf(x){
  if(!x.note) return;
  const keep=[]; x._cfn=x._cfn||{};
  for(const ln of String(x.note).split('\n')){ const m=/^\s*［([^］]{1,20})］(.*)$/.exec(ln); if(m) x._cfn[m[1]]=m[2].trim(); else keep.push(ln); }
  x.note=keep.join('\n').trim();
}
const blank=()=>({fam:'',giv:'',famK:'',givK:'',fn:'',nick:'',org:'',dept:'',title:'',note:'',bday:'',bdayLine:'',nx:null,tels:[],mails:[],adrs:[],urls:[],groups:[],cf:{},raw:[],fav:false,color:'',_cfn:{}});
function rkFromProps(props){
  const x=blank(); let pic='';
  const lab={}, rawGroups=new Set(), labLines=[];
  props.forEach(p=>{ if(p.name==='X-ABLABEL' && p.group){ lab[p.group.toLowerCase()]=un(rkVal(p)); labLines.push(p); } });
  const keepRaw=(p,v)=>{ x.raw.push(rkRaw(p,v)); if(p.group) rawGroups.add(p.group.toLowerCase()); };
  for(const p of props){
    const v=rkVal(p), L=(p.group && lab[p.group.toLowerCase()]) || p.custom;
    switch(p.name){
      case 'BEGIN': case 'END': case 'VERSION': case 'PRODID': case 'REV': case 'LABEL': case 'NAME': case 'SOURCE': case 'PROFILE': case 'X-ABLABEL': case 'X-ABADR': break;
      case 'N': { const a=rkSplit(v,';').map(un); x.fam=(a[0]||'').trim(); x.giv=(a[1]||'').trim(); if(a[2]||a[3]||a[4]) x.nx={m:a[2]||'',p:a[3]||'',s:a[4]||''}; break; }
      case 'FN': x.fn=un(v).trim(); break;
      case 'X-PHONETIC-LAST-NAME': x.famK=un(v).trim(); break;
      case 'X-PHONETIC-FIRST-NAME': x.givK=un(v).trim(); break;
      case 'SOUND':
        if(p.types.includes('X-IRMC-N')){ const a=rkSplit(v,';').map(s=>un(s).normalize('NFKC').trim()); if(!x.famK) x.famK=a[0]||''; if(!x.givK) x.givK=a[1]||''; }
        else keepRaw(p,v);
        break;
      case 'SORT-STRING': if(!x.famK && !x.givK){ const sp=un(v).trim().split(/[\s　]+/); x.famK=sp[0]||''; x.givK=sp.slice(1).join(' '); } break;
      case 'NICKNAME': x.nick=un(rkSplit(v,',')[0]).trim(); break;
      case 'ORG': { const a=rkSplit(v,';').map(s=>un(s).trim()); x.org=a[0]||''; x.dept=a.slice(1).filter(Boolean).join(' '); break; }
      case 'TITLE': x.title=un(v).trim(); break;
      case 'TEL': { const n=un(v).replace(/^tel:/i,'').trim(); if(n) x.tels.push(Object.assign({v:n, p:p.types.includes('PREF')}, rkLabelType(TEL_T, p.types, L))); break; }
      case 'EMAIL': { const n=un(v).replace(/^mailto:/i,'').trim(); if(n) x.mails.push(Object.assign({v:n, p:p.types.includes('PREF')}, rkLabelType(MAIL_T, p.types.filter(t=>t!=='INTERNET'), L))); break; }
      case 'ADR': { const a=rkSplit(v,';').map(s=>un(s).trim()); const o={pob:a[0]||'',ext:a[1]||'',street:a[2]||'',city:a[3]||'',region:a[4]||'',zip:a[5]||'',country:a[6]||''};
        if(Object.values(o).some(Boolean)) x.adrs.push(Object.assign(o, {p:p.types.includes('PREF')}, rkLabelType(ADR_T, p.types, L))); break; }
      case 'URL': { const u=un(v).trim(); if(u) x.urls.push(u); break; }
      case 'NOTE': x.note=(x.note?x.note+'\n':'')+un(v); break;
      case 'BDAY': { const d=rkDate(un(v)); if(d){ x.bday=d; x.bdayLine=rkRaw(p,v); } else keepRaw(p,v); break; }
      case 'CATEGORIES': rkSplit(v,',').map(s=>un(s).trim()).filter(Boolean).forEach(g=>{
          if(/^starred$/i.test(g)) x.fav=true; else if(!/^(my ?contacts|system group:.*|contacts|imported on .*)$/i.test(g)) x.groups.push(g); }); break;
      case 'PHOTO': { const d=rkPhoto(p,v); if(d) pic=d; else if(!/^data:/i.test(String(v).trim()) && !/^(B|BASE64)$/i.test(p.params.ENCODING||'')) keepRaw(p,v); break; }
      case 'X-ANDROID-CUSTOM': { const a=rkSplit(v,';').map(un); if(/nickname$/.test(a[0]||'') && a[1] && !x.nick){ x.nick=a[1].trim(); break; } keepRaw(p,v); break; }
      case 'X-HYO-FAV': if(/^1|true$/i.test(String(v).trim())) x.fav=true; break;
      case 'X-HYO-COLOR': { const k=String(v).trim().toLowerCase(); if(ckOk(k)) x.color=k; break; }
      default: keepRaw(p,v);
    }
  }
  labLines.forEach(p=>{ if(rawGroups.has(p.group.toLowerCase())) x.raw.push(rkRaw(p, rkVal(p))); });   // 知らない項目に付いていたラベルは、いっしょに持つ
  // FN だけのとき（「山田 太郎」）は姓・名に分ける。N から作れる名前と同じ FN は持たない
  if(!x.fam && !x.giv && x.fn){ const sp=x.fn.split(/[\s　]+/); if(sp.length===2 && !/[,，、]/.test(x.fn)){ x.fam=sp[0]; x.giv=sp[1]; } }
  if(x.fn && (x.fam||x.giv)){   // スマホで見えていた名前（FN）が、姓・名から作る名前と同じなら持たない（ちがえば FN のまま見せる）
    const disp=(isLatin(x.fam||x.giv)?[x.giv,x.fam]:[x.fam,x.giv]).filter(Boolean).join(' ');
    if(x.fn===disp || (!isLatin(x.fn) && x.fn.replace(/[\s　]/g,'')===(x.fam+x.giv))) x.fn=''; }
  // 「よく使う」を先に
  const pf=a=>a.sort((p,q)=>(q.p?1:0)-(p.p?1:0));
  pf(x.tels); pf(x.mails); pf(x.adrs);
  rkNoteCf(x);
  x._pic=pic;
  return x;
}
function rkParseVcf(t){
  const L=rkLines(t), items=[]; let cur=null, depth=0, cards=0;
  for(const ln of L){
    if(/^BEGIN:VCARD\s*$/i.test(ln)){ depth++; if(depth===1){ cur=[]; cards++; } continue; }
    if(/^END:VCARD\s*$/i.test(ln)){ depth=Math.max(0,depth-1); if(depth===0 && cur){ const x=rkFromProps(cur); if(rkHasAny(rkCleanItem(x))) items.push(x); cur=null; } continue; }
    if(cur && depth===1 && ln.trim()){ const p=rkProp(ln); if(p) cur.push(p); }
  }
  return {items, cards};
}

/* ── vCard を書く（3.0・UTF-8。1行 75 バイトで折り返す） ── */
const vE=s=>String(s==null?'':s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/([,;])/g,'\\$1');
function rkFold(ln){
  const enc=new TextEncoder(); if(enc.encode(ln).length<=75) return ln;
  const out=[]; let cur='', n=0;
  for(const ch of ln){ const b=enc.encode(ch).length; if(n+b>75){ out.push(cur); cur=' '; n=1; } cur+=ch; n+=b; }
  out.push(cur); return out.join('\r\n');
}
const TEL_V={cell:'CELL',home:'HOME,VOICE',work:'WORK,VOICE',main:'MAIN',fax:'FAX',other:'OTHER'};
const MAIL_V={home:'HOME',work:'WORK',cell:'CELL',other:'OTHER'};
const ADR_V={home:'HOME',work:'WORK',other:'OTHER'};
function rkVcard(x, opt){
  opt=opt||{};
  const L=['BEGIN:VCARD','VERSION:3.0'], nx=x.nx||{};
  L.push('N:'+[x.fam,x.giv,nx.m,nx.p,nx.s].map(vE).join(';'));
  L.push('FN:'+vE(rkName(x)));
  if(x.famK) L.push('X-PHONETIC-LAST-NAME:'+vE(x.famK));
  if(x.givK) L.push('X-PHONETIC-FIRST-NAME:'+vE(x.givK));
  if(x.nick) L.push('NICKNAME:'+vE(x.nick));
  if(x.org||x.dept) L.push('ORG:'+vE(x.org)+(x.dept?';'+vE(x.dept):''));
  if(x.title) L.push('TITLE:'+vE(x.title));
  // 自分で付けたラベルは iPhone と同じ形（item1.TEL と item1.X-ABLabel）。持っている項目の itemN とぶつからない番号から
  let gi=0; x.raw.forEach(l=>{ const m=/^item(\d+)\./i.exec(l); if(m) gi=Math.max(gi,+m[1]); });
  const lab=(prop, label)=>{ const g='item'+(++gi)+'.'; L.push(g+prop); L.push(g+'X-ABLabel:'+vE(label)); };
  for(const t of x.tels){ const pr=t.p?',PREF':''; if(t.l) lab('TEL;TYPE=VOICE'+pr+':'+vE(t.v), t.l); else L.push('TEL;TYPE='+(TEL_V[t.t]||'OTHER')+pr+':'+vE(t.v)); }
  for(const m of x.mails){ const pr=m.p?',PREF':''; if(m.l) lab('EMAIL;TYPE=INTERNET'+pr+':'+vE(m.v), m.l); else L.push('EMAIL;TYPE=INTERNET,'+(MAIL_V[m.t]||'OTHER')+pr+':'+vE(m.v)); }
  for(const a of x.adrs){ const v=[a.pob,a.ext,a.street,a.city,a.region,a.zip,a.country].map(vE).join(';'), pr=a.p?',PREF':''; if(a.l) lab('ADR;TYPE=OTHER'+pr+':'+v, a.l); else L.push('ADR;TYPE='+(ADR_V[a.t]||'OTHER')+pr+':'+v); }
  if(x.bday){ const m=x.bdayLine && /^[^:]*:(.*)$/.exec(x.bdayLine); L.push(m && rkDate(m[1])===x.bday ? x.bdayLine : 'BDAY:'+x.bday); }
  x.urls.forEach(u=>L.push('URL:'+vE(u)));
  const cfl=(opt.noteCf===false)?[]:rk.fields.filter(f=>x.cf[f.id]).map(f=>'［'+f.n+'］'+x.cf[f.id]).concat(x.color?['［'+COL_CF+'］'+colFull(x.color)]:[]);
  const note=[x.note].concat(cfl).filter(Boolean).join('\n');
  if(note) L.push('NOTE:'+vE(note));
  if(x.groups.length) L.push('CATEGORIES:'+x.groups.map(vE).join(','));
  if(x.fav) L.push('X-HYO-FAV:1');
  if(x.color) L.push('X-HYO-COLOR:'+x.color);
  if(opt.pic){ const m=/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/.exec(opt.pic); if(m) L.push('PHOTO;ENCODING=b;TYPE='+(m[1]==='jpeg'?'JPEG':m[1].toUpperCase())+':'+m[2]); }
  x.raw.forEach(l=>L.push(l));
  L.push('END:VCARD');
  return L.map(rkFold).join('\r\n');
}

/* ── CSV（Excel）。表電卓の CSV・Google の CSV（新しい形・古い形）・Outlook の CSV を見出しで読む ── */
function rkCsvRows(t){
  t=String(t).replace(/^\uFEFF/,''); const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=c; continue; }
    if(c==='"') q=true; else if(c===','){ row.push(cell); cell=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&t[i+1]==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; } else cell+=c;
  }
  if(cell!=='' || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r=>r.some(c=>String(c).trim()));
}
function rkGLabel(lab, T){
  const raw=String(lab||'').trim(), p=/^\*/.test(raw), s=raw.replace(/^\*\s*/,'').trim();
  const map={mobile:'cell',cell:'cell','携帯':'cell',home:'home','自宅':'home',work:'work','勤務先':'work','仕事':'work',main:'main','代表':'main','home fax':'fax','work fax':'fax',fax:'fax','other fax':'fax',other:'other','その他':'other'};
  const k=map[s.toLowerCase()];
  if(k && okKey(T,k)) return {t:k, p};
  if(!s || k) return {t:'other', p};
  return {t:'other', l:s.slice(0,20), p};
}
function rkFromCsv(textIn){
  const rows=rkCsvRows(textIn); if(rows.length<2) return null;
  const H=rows[0].map(h=>String(h).replace(/^\uFEFF/,'').trim());
  const col=re=>H.findIndex(h=>re.test(h));
  const cols=re=>H.map((h,i)=>re.test(h)?i:-1).filter(i=>i>=0);
  const M={
    fam:col(/^(姓|苗字|名字|last ?name|family ?name|surname)$/i), giv:col(/^(名|first ?name|given ?name)$/i),
    famK:col(/^(せい|セイ|姓[（(]?(ふりがな|フリガナ|よみ|ヨミ|カナ)[)）]?|phonetic last name|family name yomi|surname yomi)$/i),
    givK:col(/^(めい|メイ|名[（(]?(ふりがな|フリガナ|よみ|ヨミ|カナ)[)）]?|phonetic first name|given name yomi|given yomi)$/i),
    full:col(/^(氏名|名前|お名前|表示名|name|full ?name|display ?name)$/i), fullK:col(/^(ふりがな|フリガナ|よみ|ヨミ|読み|yomi name)$/i),
    nick:col(/^(ニックネーム|あだ名|nickname)$/i), org:col(/^(会社|会社名|勤務先名|organization ?name|company)$/i),
    dept:col(/^(部署|organization ?department|department)$/i), title:col(/^(役職|肩書き?|organization ?title|job ?title|title)$/i),
    note:col(/^(メモ|備考|notes?)$/i), bday:col(/^(誕生日|birthday)$/i), groups:col(/^(グループ|分類|labels|group membership|categories)$/i),
    fav:col(/^(よく使う|お気に入り|★)$/), color:col(/^(色分け|色)$/), site:col(/^(サイト|url|ホームページ|web ?page)$/i), zip:col(/^(郵便番号|〒)$/), adr:col(/^住所$/),
  };
  const telCols=[['cell',/^(携帯|携帯電話|mobile phone|mobile)$/i],['home',/^(自宅|自宅電話|home phone( 2)?)$/i],['work',/^(勤務先|勤務先電話|business phone( 2)?|work phone)$/i],
    ['main',/^(代表|company main phone|primary phone)$/i],['fax',/^(fax|ファックス|business fax|home fax|other fax)$/i],['other',/^(その他の電話|電話|電話番号|other phone|phone|car phone)$/i]].map(([t,re])=>[t, cols(re)]);
  const mailCols=cols(/^(メール\d*|メールアドレス\d*|e-?mail( address)?|e-?mail \d address)$/i);
  const num=kind=>{ const out=[]; H.forEach((h,i)=>{ const m=new RegExp('^'+kind+' (\\d+) - (Label|Type|Value|Formatted|Street|City|Region|Postal Code|Country|PO Box|Extended Address|Name|Title|Department|Yomi Name)$','i').exec(h);
    if(m){ const n=+m[1]; (out[n]=out[n]||{})[m[2].toLowerCase()]=i; } }); return out.filter(Boolean); };
  const gPh=num('Phone'), gEm=num('E-mail'), gAd=num('Address'), gWeb=num('Website'), gOrg=num('Organization');
  const cfCols=H.map((h,i)=>{ const m=/^［([^］]{1,20})］$/.exec(h); return m?[m[1],i]:null; }).filter(Boolean);
  if([M.fam,M.giv,M.full,M.org].every(i=>i<0) && !telCols.some(c=>c[1].length) && !gPh.length && !mailCols.length && !gEm.length) return null;
  const v=(r,i)=>(i!=null && i>=0)?String(r[i]==null?'':r[i]).trim():'';
  const multi=s=>String(s||'').split(/\s*:::\s*|\s+\/\s+/).map(s=>s.trim()).filter(Boolean);
  const out=[];
  for(const r of rows.slice(1)){
    const x=blank();
    Object.assign(x, {fam:v(r,M.fam), giv:v(r,M.giv), famK:v(r,M.famK), givK:v(r,M.givK), nick:v(r,M.nick), org:v(r,M.org), dept:v(r,M.dept), title:v(r,M.title), note:v(r,M.note), bday:rkDate(v(r,M.bday)), fav:!!v(r,M.fav)});
    if(!x.fam && !x.giv){ const full=v(r,M.full); if(full){ const sp=full.split(/[\s　]+/); if(sp.length===2){ x.fam=sp[0]; x.giv=sp[1]; } else x.fn=full; } }
    if(!x.famK && !x.givK){ const fk=v(r,M.fullK); if(fk){ const sp=fk.split(/[\s　]+/); x.famK=sp[0]; x.givK=sp.slice(1).join(' '); } }
    telCols.forEach(([t,is])=>is.forEach(i=>multi(v(r,i)).forEach(s=>{ const m=/^(.{1,20}?)[：:]\s*(\+?[\d\-()\s]{6,})$/.exec(s); if(m) x.tels.push({t:'other', l:m[1].trim(), v:m[2].trim()}); else x.tels.push({t, v:s}); })));
    mailCols.forEach(i=>multi(v(r,i)).forEach(s=>x.mails.push({t:'other', v:s})));
    gPh.forEach(g=>{ const lb=v(r, g.label!=null?g.label:g.type); multi(v(r,g.value)).forEach(s=>x.tels.push(Object.assign({v:s}, rkGLabel(lb, TEL_T)))); });
    gEm.forEach(g=>{ const lb=v(r, g.label!=null?g.label:g.type); multi(v(r,g.value)).forEach(s=>x.mails.push(Object.assign({v:s}, rkGLabel(lb, MAIL_T)))); });
    gAd.forEach(g=>{ const a={zip:v(r,g['postal code']), region:v(r,g.region), city:v(r,g.city), street:v(r,g.street), ext:v(r,g['extended address']), pob:v(r,g['po box']), country:v(r,g.country)};
      if(!a.street && !a.city && !a.region) a.street=v(r,g.formatted).replace(/\s*\n\s*/g,' ');
      if(Object.values(a).some(Boolean)) x.adrs.push(Object.assign(a, rkGLabel(v(r, g.label!=null?g.label:g.type), ADR_T))); });
    gWeb.forEach(g=>multi(v(r,g.value)).forEach(u=>x.urls.push(u)));
    if(gOrg[0]){ const g=gOrg[0]; if(!x.org) x.org=v(r,g.name); if(!x.title) x.title=v(r,g.title); if(!x.dept) x.dept=v(r,g.department); }
    if(M.adr>=0 || M.zip>=0){ const t=v(r,M.adr), z=v(r,M.zip); if(t||z) x.adrs.unshift({t:'home', zip:z, street:t}); }
    if(M.site>=0) multi(v(r,M.site)).forEach(u=>x.urls.push(u));
    if(M.groups>=0) multi(v(r,M.groups)).forEach(g=>{ const s=g.replace(/^\*\s*/,'').trim(); if(/^starred$/i.test(s)) x.fav=true; else if(s && !/^my ?contacts$/i.test(s)) x.groups.push(s); });
    rkNoteCf(x);
    cfCols.forEach(([n,i])=>{ const val=v(r,i); if(val) x._cfn[n]=val; });
    if(M.color>=0 && v(r,M.color)) x._cfn[COL_CF]=v(r,M.color);
    if(rkHasAny(rkCleanItem(x))) out.push(x);
  }
  return out;
}

/* ── 同じ人 ──
   携帯（070・080・090）とメールは その人だけのもの → 同じなら同じ人。
   自宅・会社などの電話は 家族や同じ会社の人で同じことがある → 名前も同じときだけ同じ人。 */
const isMobileKey=k=>/^[789]0\d{8}$/.test(k);
function rkIndex(list){
  const ix={t:new Map(), m:new Map(), n:new Map()};
  list.forEach(x=>rkIndexAdd(ix,x)); return ix;
}
function rkIndexAdd(ix, x){
  const put=(map,k)=>{ if(!k) return; if(!map.has(k)) map.set(k,[]); const a=map.get(k); if(!a.includes(x)) a.push(x); };
  x.tels.forEach(t=>put(ix.t, rkTelKey(t.v)));
  x.mails.forEach(m=>put(ix.m, m.v.trim().toLowerCase()));
  put(ix.n, rkNameKey(x));
}
/* 読み込むとき・手で入れるときの「同じ人」 */
function rkMatchIdx(c, ix){
  const nk=rkNameKey(c), sameName=y=>!!nk && rkNameKey(y)===nk, nameless=y=>!nk || !rkNameKey(y);
  for(const t of c.tels){ const k=rkTelKey(t.v); if(!k || !ix.t.has(k)) continue;
    const ys=ix.t.get(k), y=isMobileKey(k) ? ys[0] : (ys.find(sameName) || ys.find(nameless)); if(y) return y; }
  for(const m of c.mails){ const k=m.v.trim().toLowerCase(); if(k && ix.m.has(k)) return ix.m.get(k)[0]; }
  if(nk && ix.n.has(nk)){ const y=ix.n.get(nk).find(y=>!c.tels.length || !y.tels.length); if(y) return y; }
  return null;
}
const rkMatch=(c, list)=>rkMatchIdx(c, rkIndex(list));
const UNIQ_RAW=/^(item\d+\.)?(UID|X-ABUID|KIND|X-ABSHOWAS)[;:]/i;
/* 名前（v566）：姓・名・表示名（fn）は ひとまとまり。2人を いっしょにするとき、片方の名前に もう片方の名前を足さない
   （前は 空いている欄を 1つずつ うめたので、姓に「山田太郎」・名に「太郎」が入って「山田太郎 太郎」になることがあった） */
const rkPerNm=x=>x.fn || ((x.fam||x.giv) ? (isLatin(x.fam||x.giv)?[x.giv,x.fam]:[x.fam,x.giv]).filter(Boolean).join(' ') : '');   // 人の名前だけ（会社・番号は入れない）
const rkNmSc=x=>(x.fam&&x.giv?2:0)+(x.fam||x.giv?1:0);
/* どちらの名前を残すか：名前のない方は もう片方・同じ名前なら 姓と名に分かれている方・片方が もう片方を含むなら 長い方（「山田」と「山田 太郎」）・ちがう名前なら a */
function rkNameFrom(a, b){
  const na=rkNorm(rkPerNm(a)), nb=rkNorm(rkPerNm(b));
  if(!nb) return a; if(!na) return b;
  if(na===nb) return rkNmSc(b)>rkNmSc(a) ? b : a;
  return (nb.length>na.length && nb.includes(na)) ? b : a;
}
/* よみも 名前に合わせる：同じ名前なら 多く入っている方。ちがう名前なら 名前の方の よみ（空いていれば 姓・名が同じ所だけ もう片方から） */
function rkYomiFrom(s, o){
  const y={famK:s.famK, givK:s.givK}, n=v=>(v.famK?1:0)+(v.givK?1:0);
  if(!n(o)) return y;
  if(rkNorm(rkPerNm(s))===rkNorm(rkPerNm(o))) return n(o)>n(y) ? {famK:o.famK, givK:o.givK} : y;
  if(!y.famK && o.famK && s.fam && rkNorm(s.fam)===rkNorm(o.fam)) y.famK=o.famK;
  if(!y.givK && o.givK && s.giv && rkNorm(s.giv)===rkNorm(o.giv)) y.givK=o.givK;
  return y;
}
/* a に b を足す。keep のときは a の名前のまま（同じ人をさがす画面で 残す名前を えらんだとき） */
function rkMergeInto(a, b, keep){
  const before=JSON.stringify(a);
  const addU=(to, from, key)=>{ const ks=new Set(to.map(key)); from.forEach(it=>{ const k=key(it); if(k && !ks.has(k)){ ks.add(k); to.push(JSON.parse(JSON.stringify(it))); } }); };
  addU(a.tels, b.tels, t=>rkTelKey(t.v)||digits(t.v)||t.v);
  addU(a.mails, b.mails, m=>m.v.trim().toLowerCase());
  addU(a.adrs, b.adrs, x=>rkNorm(rkAdrText(x)+x.zip));
  addU(a.urls, b.urls, u=>u.trim().toLowerCase());
  const s=keep ? a : rkNameFrom(a, b), o=s===a ? b : a, on=rkPerNm(o);
  const nm={fam:s.fam, giv:s.giv, fn:s.fn}, yo=rkYomiFrom(s, o);
  Object.assign(a, nm, yo);
  for(const k of ['nick','org','dept','title']) if(!a[k] && b[k]) a[k]=b[k];
  if(!a.bday && b.bday){ a.bday=b.bday; a.bdayLine=b.bdayLine; }
  if(b.note && !a.note.includes(b.note)) a.note=(a.note?a.note+'\n':'')+b.note;
  if(on && !rkNorm(rkPerNm(a)).includes(rkNorm(on))){ const l='別の名前：'+on; if(!a.note.split('\n').includes(l)) a.note=(a.note?a.note+'\n':'')+l; }   // ちがう名前は 消さずに メモに
  a.groups=[...new Set(a.groups.concat(b.groups))];
  for(const k in b.cf) if(!a.cf[k]) a.cf[k]=b.cf[k];
  const rs=new Set(a.raw), has=re=>a.raw.some(l=>re.test(l));
  b.raw.forEach(l=>{ if(rs.has(l)) return; const m=UNIQ_RAW.exec(l); if(m && has(new RegExp('^(item\\d+\\.)?'+m[2]+'[;:]','i'))) return; rs.add(l); a.raw.push(l); });
  a.fav=a.fav||b.fav;
  if(!a.color && b.color) a.color=b.color;
  Object.assign(a, rkCleanItem(Object.assign({}, a)));
  const changed=JSON.stringify(a)!==before;
  if(changed){ a.updated=today(); a.ts=Date.now(); }
  return changed;
}
function rkDupGroups(){
  const par={}; const f=a=>{ while(par[a]!==a){ par[a]=par[par[a]]; a=par[a]; } return a; }; const u=(a,b)=>{ a=f(a); b=f(b); if(a!==b) par[b]=a; };
  rk.items.forEach(x=>{ par[x.id]=x.id; });
  const first={}; const link=(k,id)=>{ if(!k) return; if(first[k]) u(first[k], id); else first[k]=id; };
  for(const x of rk.items){
    x.tels.forEach(t=>{ const k=rkTelKey(t.v); if(k && isMobileKey(k)) link('t'+k, x.id); });   // 固定電話は家族で同じことがあるので見ない（名前が同じなら下で見つかる）
    x.mails.forEach(m=>{ const k=m.v.trim().toLowerCase(); if(k) link('m'+k, x.id); });
    const nk=rkNameKey(x); if(nk) link('n'+nk, x.id);
  }
  const G={}; rk.items.forEach(x=>{ const r=f(x.id); (G[r]=G[r]||[]).push(x.id); });
  const not=new Set(rk.notDup), pk=(a,b)=>[a,b].sort().join('|');
  return Object.values(G).filter(ids=>{ if(ids.length<2) return false;
    for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++) if(!not.has(pk(ids[i],ids[j]))) return true;
    return false; });
}
const rkInfoScore=x=>x.tels.length*3+x.mails.length*2+x.adrs.length*2+(x.famK||x.givK?2:0)+(x.photo?2:0)+(x.org?1:0)+(x.bday?1:0)+(x.note?1:0)+x.groups.length+Object.keys(x.cf).length;

/* ── さがす（名前・よみ・ニックネーム・会社・メモ・グループ・自分の項目・メール・住所・番号の一部） ── */
function rkSearch(q, list){
  const words=String(q).trim().split(/[\s　]+/).map(w=>w.normalize('NFKC')).filter(Boolean);
  if(!words.length) return list.slice();
  const res=[];
  for(const x of list){
    const nm=rkNorm(rkName(x)), kn=rkNorm(rkYomi(x)), nn=rkNorm(x.nick), co=rkNorm([x.org,x.dept,x.title].join(' '));
    let other=null, s=0, ok=true;
    for(const w0 of words){
      if(/^\+?[\d\-]{3,}$/.test(w0)){ const d=digits(w0); if(d.length>=3 && x.tels.some(t=>digits(t.v).includes(d))){ s+=50; continue; } ok=false; break; }
      const w=rkNorm(w0); if(!w) continue;
      if(nm===w||kn===w||nn===w) s+=100; else if(nm.startsWith(w)||kn.startsWith(w)) s+=60; else if(nm.includes(w)||kn.includes(w)||nn.includes(w)) s+=45;
      else if(co.includes(w)) s+=30;
      else {
        if(other===null) other=rkNorm([x.note, x.groups.join(' '), Object.values(x.cf).join(' '), x.color?colFull(x.color):'', x.mails.map(m=>m.v).join(' '), x.adrs.map(a=>rkAdrText(a)+' '+a.zip).join(' '), x.tels.map(t=>t.l).join(' ')].join(' '));
        if(other.includes(w)) s+=10; else { ok=false; break; }
      }
    }
    if(ok && s>0) res.push([x,s]);
  }
  return res.sort((a,b)=>b[1]-a[1] || cmpKana(a[0],b[0])).map(a=>a[0]);
}
/* 声で「山田さんの電話番号を教えて」→「山田」 */
function rkVoiceQ(t){
  return String(t||'').trim().replace(/[？?。、！!]+$/,'').replace(/^(えー*と|ええと|あの[ーう]*|えー+|あー+|うーん|えっと)[、。\s]*/,'')
    .replace(/(の|は|に|へ)?(電話番号|でんわばんごう|電話|でんわ|携帯|けいたい|番号|ばんごう|メールアドレス|メール|住所|じゅうしょ|連絡先|れんらくさき)(を|は|が)?(教えて|おしえて|出して|だして|見せて|みせて|どこ|何番|なんばん|かけて|かける|して)?(ください)?$/,'')
    .replace(/(さん|さま|様|くん|君|ちゃん|先生|せんせい)$/,'')
    .trim();
}

/* ── 🎤 声でさがす（v556）：ふりがな（よみ）を先に。聞き取った字を よみに直し、よみの近い人も 候補に出す ── */
const RK_SMALL={'ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','っ':'つ','ゃ':'や','ゅ':'ゆ','ょ':'よ','ゎ':'わ','ゕ':'か','ゖ':'け'};
const RK_VOW=(()=>{ const m={}; [['a','あかさたなはまやらわ'],['i','いきしちにひみり'],['u','うくすつぬふむゆる'],['e','えけせてねへめれ'],['o','おこそとのほもよろ']].forEach(([v,t])=>{ for(const c of t) m[c]=v; }); return m; })();
const RK_KJ=/[一-鿿㐀-䶿々]/;
/* ゆるい よみ：小さい字・にごり・まる・のばす音（おう・えい・ー）を そろえる（きょうこ＝きよこ・さいとう＝さいと・ひさじ＝ひさし） */
function rkLoose(t0){
  let t=rkNorm(t0).replace(/[ぁぃぅぇぉっゃゅょゎゕゖ]/g,c=>RK_SMALL[c]).replace(/ぢ/g,'じ').replace(/づ/g,'ず').replace(/ゐ/g,'い').replace(/ゑ/g,'え').replace(/を/g,'お').replace(/ゔ/g,'ぶ');
  t=t.normalize('NFD').replace(/[\u3099\u309A]/g,'').normalize('NFC');
  let o='', pv='';
  for(const c of t){
    if(pv && ((c==='う' && (pv==='o'||pv==='u')) || (c==='い' && (pv==='e'||pv==='i')) || (c==='あ' && pv==='a') || (c==='え' && pv==='e') || (c==='お' && pv==='o'))) continue;
    o+=c; pv=RK_VOW[c]||'';
  }
  return o;
}
/* 2つの よみの ちがう字の数（lim を こえたら そこで やめる） */
function rkLev(a, b, lim){
  a=Array.from(a); b=Array.from(b);
  if(Math.abs(a.length-b.length)>lim) return lim+1;
  let p=Array.from({length:b.length+1},(_,j)=>j);
  for(let i=1;i<=a.length;i++){
    const c=[i]; let mn=i;
    for(let j=1;j<=b.length;j++){ c[j]=Math.min(p[j]+1, c[j-1]+1, p[j-1]+(a[i-1]===b[j-1]?0:1)); if(c[j]<mn) mn=c[j]; }
    if(mn>lim) return lim+1;
    p=c;
  }
  return p[b.length];
}
/* 人の よみ（名字・名前・ぜんぶ・ニックネーム・会社）。よみのない人は 辞書で 名前から作る（辞書を読んでから） */
const rkVRCache=new Map();
function rkReadsOf(x){
  const key=[x.fam,x.giv,x.fn,x.famK,x.givK,x.nick,x.org,!!window.rkYomiGuess].join('|');
  const c=rkVRCache.get(x.id); if(c && c.key===key) return c.r;
  let fk=x.famK, gk=x.givK;
  if(!fk && !gk && window.rkYomiGuess){ try{ const g=rkYGuess(x); if(g){ fk=g.famK; gk=g.givK; } }catch(_){} }
  const r=[], add=(t,w)=>{ const s=rkNorm(t); if(s && !r.some(o=>o.s===s)) r.push({s, l:rkLoose(s), w}); };
  add(fk,1); add(gk,1); if(fk && gk) add(fk+gk,1);
  const nm=rkName(x); if(!RK_KJ.test(nm)) add(nm,1);   // かなの名前（ダイゴ・ふれあいセンター）は そのまま
  if(x.nick) add(RK_KJ.test(x.nick) ? (window.rkYomiOf ? window.rkYomiOf(x.nick,'mei') : '') : x.nick, 0.9);
  if(x.org) add(RK_KJ.test(x.org) ? (window.rkYomiOf ? window.rkYomiOf(x.org,'org') : '') : x.org, 0.8);
  rkVRCache.set(x.id, {key, r});
  return r;
}
/* 聞き取った字の よみ（かなは そのまま。漢字は 辞書で 候補をいくつか。空白で区切って言ったら 1つずつも）。
   r は よさそうな順（0 が いちばん。聞き取りの 2つめの候補は 1 から） */
function rkVoiceReads(texts){
  const out=[], add=(v,r)=>{ const t=rkNorm(v); if(!t) return; const o=out.find(o=>o.s===t); if(o){ if(r<o.r) o.r=r; } else out.push({s:t, l:rkLoose(t), r}); };
  const alts=w=>RK_KJ.test(w) ? (window.rkYomiAlts ? window.rkYomiAlts(w, 8) : []) : [w];
  texts.forEach((t,ti)=>{
    alts(t).forEach((v,i)=>add(v, ti+i));
    const ws=t.trim().split(/[\s　]+/); if(ws.length>1) ws.forEach(w=>alts(w).slice(0,4).forEach((v,i)=>add(v, ti+i+1)));
  });
  return out.sort((a,b)=>a.r-b.r).slice(0,24);
}
/* 字で 当たった人（前の さがし方。名前が同じ・はじめが同じ・中にある・ほかの欄） */
function rkVoiceHits(list, V){
  const m=new Map(), put=(id,v)=>{ if(!(m.get(id)>=v)) m.set(id,v); };
  for(const t of V.texts){
    const tn=rkNorm(t); if(!tn) continue;
    for(const x of rkSearch(t, list)){ const nm=rkNorm(rkName(x)); put(x.id, nm===tn ? 98 : nm.startsWith(tn) ? 88 : nm.includes(tn) ? 76 : 58); }
  }
  return m;
}
/* 人ごとの点：よみが 同じ 100・ゆるく同じ 92・はじめが同じ 84/78・中にある 66/60・1〜2字ちがい 30〜42。字で当たれば その点。
   ありそうにない読み（r が大きい）は、同じ・はじめが同じ だけ見る（候補が ふえすぎないように） */
function rkVoiceScore(x, V, hit){
  let best=hit.get(x.id)||0;
  for(const c of rkReadsOf(x)){
    for(const q of V.reads){
      const n=Array.from(q.l).length; if(!n) continue;
      let sc=0;
      if(c.s===q.s) sc=100; else if(c.l===q.l) sc=92;
      else if(n>=2 && q.r<=3 && c.s.startsWith(q.s)) sc=84; else if(n>=2 && q.r<=3 && c.l.startsWith(q.l)) sc=78;
      else if(n>=2 && q.r<=1 && c.s.includes(q.s)) sc=66; else if(n>=3 && q.r<=1 && c.l.includes(q.l)) sc=60;
      else if(n>=3 && q.r<=1){
        const lim=n<=3?1:n<=6?2:3, cl=Array.from(c.l);
        let d=rkLev(q.l, c.l, lim); if(d>lim && cl.length>n) d=rkLev(q.l, cl.slice(0,n).join(''), lim);
        if(d<=lim) sc=Math.max(30, 54-d*12);
      }
      sc*=c.w; if(sc>best) best=sc;
    }
  }
  return best;
}
function rkVoiceSearch(list, V){
  const hit=rkVoiceHits(list, V), res=[];
  V.sc=new Map();
  for(const x of list){ const v=rkVoiceScore(x, V, hit); if(v>=28){ res.push([x,v]); V.sc.set(x.id, v); } }
  return res.sort((a,b)=>b[1]-a[1] || cmpKana(a[0],b[0])).map(a=>a[0]);
}
const rkVoiceOn=()=>!!(rkVoice && rkQ.trim() && rkVoice.q===rkQ);
function rkVoiceNote(){
  const rs=rkVoice.reads.map(r=>r.s).filter(r=>r!==rkNorm(rkVoice.q)).slice(0,3);
  return `<div class="rk-vnote">🎤「<b>${esc(rkVoice.q)}</b>」${rs.length?`（よみ：${esc(rs.join('・'))}）`:''}で さがしました。よみの近い人も 出しています。</div>`;
}
/* 声のあと：さがす欄に 名前を入れ、よみで さがす（辞書が まだなら 読んでから もう一度） */
async function rkVoiceGo(heard, alts){
  const q=rkVoiceQ(heard); if(!q) return;
  const texts=[...new Set([q].concat((alts||[]).map(rkVoiceQ)).filter(Boolean))].slice(0,5);
  $('rkFind').value=q; rkQ=q;
  rkVoice={q, texts, reads:rkVoiceReads(texts), sc:new Map()};
  rkRender(); if($('rkList')) $('rkList').scrollTop=0;
  if(!window.rkYomiAlts && await rkYLoad() && rkVoice && rkVoice.q===q && rkQ===q){ rkVoice.reads=rkVoiceReads(texts); rkRender(); }
}

/* ── 画面 ── */
const RK_CSS=`
#renrakuOverlay .rk-modal{ display:flex; flex-direction:column; }
.rk-top{ padding:10px 12px 6px; border-bottom:1px solid rgba(120,132,156,.25); }
.rk-find{ display:flex; gap:6px; align-items:center; }
.rk-find input{ flex:1; min-width:0; box-sizing:border-box; height:44px; padding:0 12px; font-size:17px; border:2px solid var(--acc); border-radius:22px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.rk-ib{ flex:none; width:44px; height:44px; border-radius:22px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:19px; cursor:pointer; }
.rk-ib.on{ background:#e53935; border-color:#e53935; color:#fff; }
.rk-bar{ display:flex; gap:6px; align-items:center; margin-top:8px; overflow-x:auto; scrollbar-width:none; }
.rk-bar::-webkit-scrollbar{ display:none; }
.rk-chip{ flex:none; height:32px; padding:0 11px; border-radius:16px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.rk-chip.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.rk-chip small{ font-weight:normal; opacity:.85; margin-left:3px; }
.rk-sep{ flex:none; width:1px; height:20px; background:rgba(120,132,156,.4); }
.rk-wrap{ flex:1; min-height:0; position:relative; display:flex; }
.rk-list{ flex:1; min-width:0; overflow:auto; padding:0 28px 12px 12px; }
.rk-list.noidx{ padding-right:12px; }
.rk-idx{ position:absolute; right:2px; top:6px; bottom:6px; width:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:0; touch-action:none; user-select:none; -webkit-user-select:none; }
.rk-idx button{ border:none; background:transparent; color:var(--acc-text,var(--acc)); font-size:12px; font-weight:bold; padding:3px 0; width:24px; cursor:pointer; line-height:1.1; }
.rk-grp{ position:sticky; top:0; z-index:1; font-size:13px; font-weight:bold; color:var(--acc-text,var(--acc)); margin:0 -4px 4px; padding:7px 6px 4px; display:flex; align-items:center; gap:6px; background:var(--modal-bg,#fff); }
.rk-grp span{ font-weight:normal; color:var(--text-light,#888); font-size:12px; }
.rk-it{ display:flex; align-items:center; gap:10px; padding:8px 10px; margin-bottom:5px; border:1px solid rgba(120,132,156,.3); border-radius:12px; background:var(--modal-bg,#fff); color:var(--text,#222); cursor:pointer; }
.rk-it .av,.rk-who .av{ flex:none; border-radius:50%; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#fff; }
.rk-it .av{ width:40px; height:40px; font-size:17px; }
.rk-it .tx{ flex:1; min-width:0; }
.rk-it .nm{ font-weight:bold; font-size:16px; line-height:1.3; overflow:hidden; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; word-break:keep-all; overflow-wrap:anywhere; }   /* 長い名前は2行まで（v546） */
.rk-it .nm small{ font-weight:normal; font-size:11px; color:var(--text-light,#888); margin-left:6px; }
.rk-it .sb{ font-size:13px; color:var(--text-sub,#555); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rk-vnote{ margin:8px 0 2px; padding:7px 10px; border-radius:10px; background:rgba(33,115,70,.09); font-size:13px; line-height:1.5; color:var(--text,#222); }
.rk-it .mm{ font-size:13px; line-height:1.4; color:var(--text-sub,#555); margin-top:1px; white-space:pre-line; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.rk-it .gi{ flex:none; font-size:14px; }
.rk-it .fv{ flex:none; color:#f9a825; font-size:16px; }
.rk-it .ck{ flex:none; width:24px; height:24px; box-sizing:border-box; border-radius:6px; border:2px solid rgba(120,132,156,.6); color:transparent; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; }
.rk-it.sel{ border:2px solid var(--acc); }
.rk-it.sel .ck{ background:var(--acc); border-color:var(--acc); color:#fff; }
.rk-big .rk-it .nm{ font-size:20px; } .rk-big .rk-it .sb{ font-size:16px; } .rk-big .rk-it .mm{ font-size:15.5px; } .rk-big .rk-it .av{ width:48px; height:48px; font-size:20px; }
.rk-big .rk-row{ font-size:17.5px; } .rk-big .rk-who .n{ font-size:27px; } .rk-big .rk-grp{ font-size:15px; }
.rk-empty{ text-align:center; color:var(--text-light,#888); padding:22px 12px; line-height:1.8; font-size:14px; }
.rk-empty b{ color:var(--text,#333); }
.rk-empty .big{ font-size:40px; line-height:1.2; }
.rk-emptybtns{ max-width:360px; margin:12px auto 0; }
.rk-bd{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin:8px 0 4px; font-size:13px; font-weight:bold; color:var(--text,#333); }
.rk-bd button{ min-height:30px; padding:2px 10px; border-radius:15px; border:1px solid rgba(249,168,37,.6); background:rgba(249,168,37,.14); color:var(--text,#333); font-size:12.5px; cursor:pointer; }
.rk-add{ padding:8px 12px calc(10px + var(--safe-bottom,0px)); border-top:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); color:var(--text,#222); }
.rk-addbtns,.rk-selbtns{ display:flex; gap:6px; }
.rk-addbtns button,.rk-selbtns button{ flex:1; min-height:46px; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; padding:0 4px; }
.rk-selbtns button{ font-size:13px; }
.rk-addbtns button.sub,.rk-selbtns button.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.rk-selbtns button.del{ background:transparent; color:#d32f2f; border:1px solid rgba(211,47,47,.5); }
body.dark .rk-selbtns button.del{ color:#ef9a9a; }
.rk-selinfo{ display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:6px; }
.rk-selinfo button{ margin-left:auto; height:30px; padding:0 10px; border-radius:15px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:12px; cursor:pointer; }
.rk-body{ padding:10px 12px calc(16px + var(--safe-bottom,0px)); overflow:auto; color:var(--text,#222); }
.rk-f{ display:block; font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:8px 0; }
.rk-f input,.rk-f textarea,.rk-line input,.rk-line select{ display:block; width:100%; box-sizing:border-box; margin-top:4px; min-height:44px; padding:6px 10px; font-size:16px; border:1px solid rgba(120,132,156,.45); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; }
.rk-f textarea{ min-height:80px; resize:vertical; }
.rk-2{ display:grid; grid-template-columns:1fr 1fr; gap:0 8px; }
.rk-edtop{ display:flex; gap:10px; align-items:flex-start; }
.rk-edtop .grow{ flex:1; min-width:0; }
.rk-pv{ flex:none; width:72px; height:72px; margin-top:12px; border-radius:50%; border:1px dashed rgba(120,132,156,.6); background:rgba(120,132,156,.08) center/cover no-repeat; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:20px; color:var(--text-light,#888); cursor:pointer; }
.rk-pv span{ font-size:11px; }
.rk-pv.has{ border-style:solid; }
.rk-sec{ font-size:13px; font-weight:bold; color:var(--acc-text,var(--acc)); margin:14px 0 2px; border-top:1px solid rgba(120,132,156,.25); padding-top:10px; }
.rk-line{ display:flex; gap:6px; align-items:center; margin:6px 0; }
.rk-line select{ flex:none; width:7.2em; margin:0; padding:6px 4px; font-size:14px; }
.rk-line input{ flex:1; min-width:0; margin:0; }
.rk-line input.zip{ flex:none; width:6.4em; }
.rk-line .x{ flex:none; width:36px; height:36px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); cursor:pointer; }
.rk-adr{ border:1px solid rgba(120,132,156,.25); border-radius:10px; padding:2px 8px; margin:6px 0; }
.rk-addline{ min-height:36px; padding:0 12px; border-radius:18px; border:1px dashed rgba(120,132,156,.6); background:transparent; color:var(--acc-text,var(--acc)); font-size:13px; font-weight:bold; cursor:pointer; margin:2px 0 4px; }
.rk-tagrow{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.rk-tagrow button{ min-height:34px; padding:0 11px; border-radius:17px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13.5px; cursor:pointer; }
.rk-tagrow button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.rk-chk{ display:flex; align-items:center; gap:8px; font-size:14px; color:var(--text,#222); margin:8px 0; }
.rk-chk input{ width:22px; height:22px; margin:0; flex:none; }
.rk-radio{ display:flex; align-items:center; gap:8px; font-size:15px; padding:9px 4px; border-bottom:1px solid rgba(120,132,156,.18); color:var(--text,#222); }
.rk-radio input{ width:22px; height:22px; margin:0; flex:none; }
.rk-btn{ display:block; width:100%; min-height:44px; margin:8px 0 0; border:none; border-radius:10px; background:var(--acc); color:#fff; font-size:15px; font-weight:bold; cursor:pointer; padding:6px 10px; }
.rk-btn.sub{ background:rgba(120,132,156,.14); color:var(--text,#222); border:1px solid rgba(120,132,156,.35); }
.rk-btn.del{ background:transparent; color:#d32f2f; border:1px solid rgba(211,47,47,.45); }
body.dark .rk-btn.del{ color:#ef9a9a; }
.rk-link{ border:none; background:transparent; color:var(--acc-text,var(--acc)); font-size:13px; font-weight:bold; text-decoration:underline; cursor:pointer; padding:6px 0; }
.rk-note{ font-size:12px; color:var(--text-light,#888); line-height:1.65; margin:6px 0; }
.rk-msg{ white-space:pre-wrap; font-size:15px; line-height:1.7; margin:4px 0 8px; }
.rk-who{ text-align:center; margin:4px 0 10px; }
.rk-who .av{ width:84px; height:84px; margin:0 auto 6px; font-size:34px; }
.rk-who .k{ font-size:12px; color:var(--text-light,#888); }
.rk-who .n{ font-size:22px; font-weight:bold; overflow-wrap:anywhere; }
.rk-who .c{ font-size:14px; margin-top:2px; }
.rk-who .fvc{ color:#f9a825; }
.rk-acts{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin:8px 0; }
.rk-acts a{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:58px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:12px; font-weight:bold; text-decoration:none; cursor:pointer; }
.rk-acts span{ font-size:20px; }
.rk-acts .off{ opacity:.35; pointer-events:none; }
.rk-rows{ border-top:1px solid rgba(120,132,156,.25); margin-top:6px; }
.rk-row{ display:flex; gap:8px; padding:8px 2px; border-bottom:1px solid rgba(120,132,156,.18); font-size:14.5px; }
.rk-row b{ flex:none; width:6.3em; font-size:12px; color:var(--text-light,#888); padding-top:2px; overflow-wrap:anywhere; }
.rk-row span{ flex:1; min-width:0; overflow-wrap:anywhere; white-space:pre-wrap; }
.rk-row a{ color:var(--acc-text,var(--acc)); }
.rk-row a.rk-mini{ text-decoration:none; margin-left:8px; }
/* 名前を押した画面の 電話番号は 大きく（v555。⇧ 電話番号だけ 大きく／もっと大きく で さらに） */
.rk-row.tel{ align-items:center; }
.rk-row.tel > span{ font-size:22px; font-weight:bold; letter-spacing:.02em; line-height:1.35; }
.rk-row.tel a.rk-mini{ font-size:20px; vertical-align:middle; }
/* 📝 メモ欄（v555） */
.rk-vmemo{ margin:10px 0 2px; }
.rk-vmemo label{ display:flex; align-items:baseline; gap:8px; font-size:13px; font-weight:bold; color:var(--text-light,#888); margin-bottom:4px; }
.rk-vmemo label small{ font-weight:normal; font-size:11.5px; }
.rk-vmemo textarea{ display:block; width:100%; box-sizing:border-box; min-height:58px; max-height:40vh; resize:none; overflow:auto; padding:9px 10px; border:1.5px solid rgba(120,132,156,.45); border-radius:10px;
  background:var(--modal-bg,#fff); color:var(--text,#222); font-family:inherit; font-size:16px; line-height:1.5; }
.rk-vmemo textarea:focus{ outline:none; border-color:var(--acc); box-shadow:0 0 0 3px rgba(33,115,70,.18); }
.rk-cus{ display:flex; align-items:center; gap:6px; padding:6px 2px; border-bottom:1px solid rgba(120,132,156,.18); }
.rk-cus .nm{ flex:1; min-width:0; font-size:15px; overflow-wrap:anywhere; }
.rk-cus .nm small{ display:block; font-size:11.5px; color:var(--text-light,#888); }
.rk-cus button{ flex:none; height:36px; min-width:36px; padding:0 8px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:14px; cursor:pointer; }
.rk-cus .ic{ font-size:20px; width:44px; }
.rk-emo{ display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin:6px 0; }
.rk-emo button{ height:46px; font-size:24px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:transparent; cursor:pointer; }
.rk-dup{ border:1px solid rgba(120,132,156,.35); border-radius:12px; padding:8px 10px; margin:10px 0; }
.rk-dupone{ padding:4px 0; border-bottom:1px dashed rgba(120,132,156,.3); }
.rk-dupone small{ color:var(--text-light,#888); }
.rk-dupbtns{ display:grid; grid-template-columns:1fr 1fr; gap:6px; }
.rk-help h3{ font-size:15px; margin:14px 0 4px; color:var(--acc-text,var(--acc)); }
.rk-help p,.rk-help li{ font-size:14px; line-height:1.7; }
.rk-help ol{ padding-left:1.3em; margin:4px 0; }
/* 🎨 色分け（v544）：左の帯と うすい地の色。色の名前は小さな札で */
.rk-it.col{ box-shadow:inset 7px 0 0 var(--rkc); padding-left:15px; border-color:color-mix(in srgb, var(--rkc) 50%, transparent); background-color:color-mix(in srgb, var(--rkc) 12%, var(--modal-bg,#fff));
  --rkp:color-mix(in srgb, var(--rkc) 30%, transparent); --pw:5px; --pd:3px; --ps:16px; }
.rk-it.col.pt-ck{ --rkp:color-mix(in srgb, var(--rkc) 18%, transparent); }   /* チェックは 2枚重ねなので うすく */
.rk-it.col.pt-gr{ --rkp:color-mix(in srgb, var(--rkc) 40%, transparent); }
body.dark .rk-it.col{ box-shadow:inset 7px 0 0 var(--rkc), inset 8px 0 0 rgba(255,255,255,.3); --rkp:color-mix(in srgb, var(--rkc) 20%, transparent); }   /* 紺・黒などの暗い色も 夜の色で見えるように・柄は うすめ（字が読めるように） */
body.dark .rk-it.col.pt-ck{ --rkp:color-mix(in srgb, var(--rkc) 12%, transparent); }
body.dark .rk-it.col.pt-gr{ --rkp:color-mix(in srgb, var(--rkc) 30%, transparent); }
.rk-it.sel.col{ border-color:var(--acc); }
.rk-it .cl.n{ max-width:10em; }   /* No. つき（v549） */
.rk-it .cl{ flex:none; max-width:6.5em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; font-weight:bold; padding:2px 7px; border-radius:9px; background:var(--rkc); color:var(--rki,#fff); }
.rk-dot{ display:inline-block; flex:none; width:12px; height:12px; border-radius:50%; background:var(--rkc); box-shadow:0 0 0 1px rgba(0,0,0,.22); margin-right:5px; vertical-align:-1px; }
body.dark .rk-dot{ box-shadow:0 0 0 1px rgba(255,255,255,.35); }
.rk-dot.big{ width:22px; height:22px; margin:0 4px 0 2px; }
.rk-grp .rk-dot{ margin-right:0; }
.rk-cpill{ display:inline-block; margin-top:4px; padding:3px 12px; border-radius:12px; background:var(--rkc); color:var(--rki,#fff); font-size:13px; font-weight:bold; }
.rk-tabs button{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; min-height:52px; font-size:12.5px; line-height:1.2; padding:3px 2px; white-space:nowrap; }
.rk-tabs button span{ font-size:19px; line-height:1.15; }
.rk-tabs button:disabled{ opacity:.4; cursor:default; }
.rk-tabs button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.rk-pinfo{ display:flex; align-items:center; gap:4px; font-size:13.5px; min-height:30px; }
.rk-pinfo b{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; flex:0 1 auto; }
.rk-pinfo .n{ flex:none; white-space:nowrap; color:var(--text-light,#888); font-size:12px; margin-left:2px; }
.rk-pinfo .hint{ flex:1 1 0; color:var(--text-light,#888); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; margin-left:4px; }
.rk-pinfo button{ margin-left:auto; flex:none; height:30px; padding:0 10px; border-radius:15px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:12px; cursor:pointer; }
.rk-pal{ display:grid; grid-template-columns:repeat(8,1fr); gap:6px; margin:6px 2px 8px; }   /* 24色（v552）：8つずつ 3段 */
@media (min-width:640px){ .rk-pal{ grid-template-columns:repeat(12,1fr); } }
.rk-pal:not(.lab) .rk-sw{ height:30px; border-radius:10px; font-size:15px; }
.rk-sw{ height:38px; min-width:0; border-radius:19px; border:none; background:var(--rkc); color:var(--rki,#fff); box-shadow:inset 0 0 0 1px rgba(0,0,0,.15); cursor:pointer; font-size:18px; font-weight:bold; padding:0; font-family:inherit; }
.rk-sw.on{ box-shadow:0 0 0 3px var(--modal-bg,#fff), 0 0 0 5px var(--text,#333); }
.rk-sw.on::after{ content:'✓'; }
.rk-pal.lab{ grid-template-columns:repeat(4,1fr); gap:7px; }
.rk-pal.lab .rk-sw{ height:42px; border-radius:10px; font-size:13px; padding:0 3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rk-pal.lab .rk-sw.on::after{ content:' ✓'; }
.rk-sw.none{ background:transparent; color:var(--text,#333); box-shadow:inset 0 0 0 1px rgba(120,132,156,.6); }
.rk-cgrid{ display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:6px 0; }
.rk-cgrid button{ display:flex; align-items:center; gap:4px; min-height:40px; padding:2px 8px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13.5px; cursor:pointer; text-align:left; font-family:inherit; }
.rk-cgrid button span{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rk-cgrid button small{ flex:none; color:var(--text-light,#888); font-size:11.5px; }
/* 📋 表で直す（v544）：名前の列と見出しは動かない。マスを押すと その場で入れる */
#rkTblOverlay .rk-modal{ display:flex; flex-direction:column; }
.rk-tb{ flex:none; height:44px; padding:0 12px; border-radius:22px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#333); font-size:14px; font-weight:bold; cursor:pointer; white-space:nowrap; font-family:inherit; }
#rkTUndo:disabled,#rkSoUndo:disabled{ opacity:.45; }
.rk-tinfo{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:13px; margin-top:7px; color:var(--text,#222); }
.rk-tinfo .hint{ color:var(--text-light,#888); font-size:12px; }
.rk-tinfo button{ height:28px; padding:0 10px; border-radius:14px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:12px; cursor:pointer; }
.rk-tv{ --rh:42px; --nw:138px; flex:1; min-height:0; display:flex; flex-direction:column; font-size:14px; color:var(--text,#222); border-top:1px solid rgba(120,132,156,.3); }
.rk-big .rk-tv{ --rh:48px; font-size:16.5px; }
/* 見出し：左（#・名前）は動かない。右は 下の本体の横の動きに合わせる。position:sticky は使わない
   （Android の Chrome で、表のマスを sticky にすると 名前の列・見出しが消えたり 字が重なったりした。v545） */
.rk-thd{ flex:none; display:flex; background:var(--modal-bg,#fff); background:color-mix(in srgb, var(--modal-bg,#fff) 86%, #78849c); border-bottom:1px solid rgba(120,132,156,.35); }
.rk-thd .rk-tc{ position:relative; height:38px; line-height:38px; font-size:12px; font-weight:bold; color:var(--text-sub,#555); background:transparent; border-bottom:none; user-select:none; -webkit-user-select:none; padding-right:18px; }
.rk-thd .rk-tc.c-no{ padding:0; }
/* 幅を変えるつまみ（見出しの右の端）。指でもつかめるように広めに */
.rk-rs{ position:absolute; top:0; right:0; width:22px; height:100%; cursor:col-resize; touch-action:none; z-index:1; }
.rk-rs::after{ content:''; position:absolute; top:10px; bottom:10px; right:5px; width:4px; border-left:2px solid rgba(120,132,156,.55); border-right:2px solid rgba(120,132,156,.55); }
.rk-rs.on::after{ border-color:var(--acc); }
.rk-thc{ flex:1; min-width:0; overflow:hidden; }
.rk-twrap{ flex:1; min-height:0; overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; }
.rk-tcols{ display:flex; align-items:flex-start; }
.rk-tl{ flex:none; box-sizing:border-box; width:calc(var(--nw) + 40px); border-right:2px solid rgba(120,132,156,.45); }
.rk-tx{ flex:1; min-width:0; overflow-x:auto; overflow-y:hidden; overscroll-behavior-x:contain; }
.rk-tg,#rkTHr{ width:var(--tw); }
.rk-tr{ display:grid; height:var(--rh); }
.rk-tl .rk-tr{ grid-template-columns:38px var(--nw); }
.rk-tg .rk-tr,#rkTHr{ grid-template-columns:var(--tcols); }
#rkTHL,#rkTHr{ height:38px; }
.rk-tc{ box-sizing:border-box; min-width:0; height:var(--rh); line-height:var(--rh); padding:0 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left; cursor:pointer;
  border-right:1px solid rgba(120,132,156,.22); border-bottom:1px solid rgba(120,132,156,.22); background:var(--modal-bg,#fff); }
.rk-tc.c-no{ padding:0; text-align:center; color:var(--text-light,#888); font-size:11px; }
.rk-tc.c-name{ font-weight:bold; border-right:none; }
.rk-tr.col .rk-tc{ background-color:color-mix(in srgb, var(--rkc) 10%, var(--modal-bg,#fff)); }
.rk-tl .rk-tr.col .c-name{ box-shadow:inset 6px 0 0 var(--rkc); padding-left:13px; }
.rk-tr.draft .rk-tc{ background:color-mix(in srgb, var(--acc) 9%, var(--modal-bg,#fff)); }
.rk-tr.fl .rk-tc{ background:color-mix(in srgb, #ffd54f 45%, var(--modal-bg,#fff)); }
.rk-tc.ed{ padding:0; }
/* 長くて入りきらない字：小さくし（style で font-size）、それでも入らなければ 2行に（f2） */
.rk-tc.f2{ display:flex; align-items:center; white-space:normal; line-height:1.3; }
.rk-tc.f2 .t2{ display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; word-break:keep-all; overflow-wrap:anywhere; }   /* なるべく空白で行を変える */
.rk-tv .ph{ color:var(--text-light,#999); font-weight:normal; }
.rk-tv .lb{ color:var(--text-light,#888); font-size:11px; margin-right:4px; }
.rk-tv .mo{ color:var(--acc-text,var(--acc)); font-size:11px; font-weight:bold; margin-left:5px; }
.rk-tv .fv{ color:#f9a825; font-size:16px; }
.rk-tc[data-c="fav"],.rk-tc[data-c="color"]{ text-align:center; }
.rk-tmore{ padding:10px 12px 16px; text-align:center; font-size:13px; color:var(--text-light,#888); }
.rk-tmore:empty{ display:none; }
.rk-tin{ display:block; width:100%; height:100%; box-sizing:border-box; margin:0; border:2px solid var(--acc); border-radius:0; padding:0 6px; font-size:16px; line-height:normal; font-family:inherit; background:var(--modal-bg,#fff); color:var(--text,#222); outline:none; }
/* 🔢 色の No.・並ぶ順番（v549） */
.rk-cord{ border-top:1px solid rgba(120,132,156,.25); margin:6px 0; }
.rk-co{ display:flex; align-items:center; gap:6px; padding:5px 2px; border-bottom:1px solid rgba(120,132,156,.18); transition:background-color .3s; }
.rk-co.fl{ background:color-mix(in srgb, #ffd54f 35%, transparent); }
.rk-co .no{ flex:none; min-width:60px; height:36px; border-radius:18px; border:1px solid var(--acc); background:transparent; color:var(--acc-text,var(--acc)); font-weight:bold; font-size:14px; cursor:pointer; font-family:inherit; }
.rk-co .nm{ flex:1; min-width:0; display:flex; align-items:center; gap:4px; min-height:40px; border:none; background:transparent; color:var(--text,#222); font-size:15px; text-align:left; cursor:pointer; padding:0 2px; font-family:inherit; }
.rk-co .nm span{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rk-co .nm small{ margin-left:6px; font-size:12px; color:var(--text-light,#888); }
.rk-co .nm em{ flex:none; font-style:normal; font-size:12px; color:var(--text-light,#888); }
.rk-co .mv{ flex:none; width:40px; height:36px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:16px; cursor:pointer; }
.rk-co .mv:disabled{ opacity:.3; cursor:default; }
.rk-nogrid{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin:4px 0 8px; }
.rk-nogrid button{ display:flex; align-items:center; justify-content:center; gap:6px; min-height:44px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:14px; cursor:pointer; font-family:inherit; }
.rk-nogrid button.on{ border:2px solid var(--acc); }
.rk-nogrid .rk-dot{ margin:0; }
.rk-cgrid .no{ font-size:11.5px; color:var(--acc-text,var(--acc)); }
/* ⇅・🔢 小さいボタン（v550） */
.rk-mini{ flex:none; width:30px; height:30px; margin-left:-2px; padding:0; border-radius:15px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#333); font-size:15px; line-height:1; cursor:pointer; font-family:inherit; }
.rk-mini.on{ background:var(--acc-weak,rgba(33,115,70,.12)); border-color:var(--acc); color:var(--acc-text,var(--acc)); font-weight:bold; }
/* 📞 電話番号だけ大きく（v550） */
.rk-tel1 .rk-it .sb.tel{ font-size:18px; font-weight:bold; color:var(--text,#222); letter-spacing:.02em; }
.rk-tel2 .rk-it .sb.tel{ font-size:22px; font-weight:bold; color:var(--text,#222); letter-spacing:.02em; }
.rk-tel1 .rk-row.tel > span{ font-size:25px; font-weight:bold; } .rk-tel2 .rk-row.tel > span{ font-size:28px; font-weight:bold; }
/* 🙂 アイコンをえらぶ（v550） */
.rk-icgrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(72px,1fr)); gap:8px; margin:10px 0; }
.rk-icgrid button{ padding:0; border:2px solid transparent; border-radius:50%; background:transparent; cursor:pointer; aspect-ratio:1/1; overflow:hidden; }
.rk-icgrid button:active,.rk-icgrid button:focus-visible{ border-color:var(--acc); }
.rk-icgrid svg{ display:block; width:100%; height:100%; border-radius:50%; }
/* 下のボタン（v551）：ふだんは 右下に ◀ だけ。押すと ＋入れる・🎨色分け・☑えらぶ・📇スマホに戻す が 右から出る（▶ で たたむ） */
.rk-add.fold{ position:absolute; right:0; bottom:calc(16px + var(--safe-bottom,0px)); z-index:6; display:flex; align-items:stretch; gap:6px; padding:0; border:none; background:transparent; pointer-events:none; }
.rk-add.fold > *{ pointer-events:auto; }
.rk-fold{ flex:none; position:relative; width:40px; min-height:56px; margin:0; padding:0 0 0 3px; border:none; border-radius:16px 0 0 16px; background:var(--acc); color:#fff; font-size:17px; line-height:1; cursor:pointer;
  box-shadow:-2px 2px 10px rgba(0,0,0,.28); touch-action:manipulation; font-family:inherit; -webkit-tap-highlight-color:transparent; }
.rk-fold::before{ content:''; position:absolute; inset:-8px 0 -8px -10px; }   /* 押せる所を すこし広く */
.rk-fold:active{ filter:brightness(1.12); }
.rk-add.fold.open{ pointer-events:auto; left:6px; padding:7px 0 7px 6px; background:var(--modal-bg,#fff); border:1px solid rgba(120,132,156,.35); border-right:none; border-radius:16px 0 0 16px;
  box-shadow:-2px 3px 16px rgba(0,0,0,.3); animation:rkFoldIn .16s ease-out; }
.rk-add.fold.open .rk-addbtns{ flex:1; min-width:0; }
/* せまい画面では「スマホに／戻す」の所で 2行に（字の途中では切らない） */
.rk-add.fold.open .rk-tabs button{ font-size:clamp(11.5px,3.05vw,12.5px); white-space:normal; word-break:keep-all; }
.rk-add.fold.open .rk-fold{ width:34px; min-height:0; border-radius:12px 0 0 12px; box-shadow:none; }
@keyframes rkFoldIn{ from{ transform:translateX(28px); opacity:.25; } to{ transform:none; opacity:1; } }
@media (prefers-reduced-motion:reduce){ .rk-add.fold.open{ animation:none; } }
#renrakuOverlay.rk-folded .rk-list{ padding-bottom:calc(84px + var(--safe-bottom,0px)); }   /* いちばん下の人も ◀ の上まで 送れるように */
#renrakuOverlay.rk-folded .rk-idx{ bottom:calc(84px + var(--safe-bottom,0px)); }
/* 横持ち（v550）：一覧を左いっぱいに。見出し・さがす・並べ方・下のボタンは 右に */
@media (orientation:landscape) and (max-height:600px){
  #renrakuOverlay .rk-modal{ display:grid; grid-template-columns:minmax(0,1fr) minmax(250px,36%); grid-template-rows:auto minmax(0,1fr) auto; }
  #renrakuOverlay .rk-modal > .modal-header{ grid-column:2; grid-row:1; padding-left:12px; }
  #renrakuOverlay .rk-top{ grid-column:2; grid-row:2; overflow:auto; border-bottom:none; }
  #renrakuOverlay .rk-wrap{ grid-column:1; grid-row:1 / span 3; border-right:1px solid rgba(120,132,156,.3); }
  #renrakuOverlay .rk-list{ padding-left:calc(12px + var(--safe-left,0px)); }
  #renrakuOverlay .rk-add{ grid-column:2; grid-row:3; border-top:1px solid rgba(120,132,156,.25); }
  #renrakuOverlay .rk-bar{ flex-wrap:wrap; overflow:visible; }
  #renrakuOverlay .rk-addbtns,#renrakuOverlay .rk-selbtns{ display:grid; grid-template-columns:1fr 1fr; }
  #renrakuOverlay .rk-addbtns button,#renrakuOverlay .rk-selbtns button{ min-height:40px; }
  #renrakuOverlay .rk-modal > .modal-header > span:not(.hdr-right){ display:none; }   /* 「📇 連絡帳」の字は 右の欄では はぶく（ボタンが入るように） */
  #renrakuOverlay .rk-modal > .modal-header{ justify-content:flex-end; gap:6px; }
  #renrakuOverlay .rk-pal{ grid-template-columns:repeat(8,1fr); }
  #renrakuOverlay .rk-selbtns.rk-p3{ grid-template-columns:repeat(3,1fr); }   /* 色分けの 3つ（外す・戻す・おわる）は 1段に */
  #renrakuOverlay .rk-add:not(.fold){ max-height:calc(100vh - 60px - var(--safe-top,0px)); overflow-y:auto; }   /* 高すぎるときは 送れるように */
  /* 下のボタン（v551）：右の欄の いちばん下に ◀。出すと 2つずつ 2段 */
  #renrakuOverlay .rk-add.fold{ position:static; grid-column:2; grid-row:3; justify-content:flex-end; padding:4px 0 calc(10px + var(--safe-bottom,0px)); border-top:none; }
  #renrakuOverlay .rk-add.fold.open{ padding:8px 0 calc(10px + var(--safe-bottom,0px)) 10px; border:none; border-top:1px solid rgba(120,132,156,.25); border-radius:0; box-shadow:none; animation:none; }
  #renrakuOverlay .rk-add.fold.open .rk-tabs button{ min-height:44px; }
  #renrakuOverlay.rk-folded .rk-list{ padding-bottom:12px; }
  #renrakuOverlay.rk-folded .rk-idx{ bottom:6px; }
}
/* あ よみ（v548） */
.rk-btn:disabled{ opacity:.45; cursor:default; }
.rk-ycnt{ display:flex; flex-wrap:wrap; gap:4px 12px; font-size:13.5px; margin:4px 0 2px; color:var(--text,#222); }
.rk-ylist{ max-height:46vh; overflow:auto; margin:8px 0; border:1px solid rgba(120,132,156,.3); border-radius:10px; }
.rk-yrow{ display:flex; gap:10px; align-items:baseline; padding:7px 10px; border-bottom:1px solid rgba(120,132,156,.15); font-size:14px; color:var(--text,#222); }
.rk-yrow:last-child{ border-bottom:none; }
.rk-yrow .nm{ flex:1; min-width:0; font-weight:bold; overflow-wrap:anywhere; }
.rk-yrow .yo{ flex:1; min-width:0; color:var(--acc-text,var(--acc)); overflow-wrap:anywhere; }
.rk-ybar{ display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; margin:8px 0 6px; padding:8px 10px; border-radius:10px; background:rgba(120,132,156,.1); font-size:13px; color:var(--text,#222); }
.rk-ybar button{ min-height:34px; padding:0 12px; border-radius:17px; border:none; background:var(--acc); color:#fff; font-size:13.5px; font-weight:bold; cursor:pointer; }
.rk-yfill{ display:block; margin:0 0 2px auto; font-size:12.5px; padding:2px 0; }
.rk-tinfo button.yf{ border-color:var(--acc); color:var(--acc-text,var(--acc)); font-weight:bold; }
#printArea .rk-pr{ font-family:sans-serif; color:#000; }
#printArea .rk-pr h1{ font-size:17pt; margin:0 0 3mm; } #printArea .rk-pr h2{ font-size:12pt; margin:4mm 0 1.2mm; border-bottom:1px solid #999; }
#printArea .rk-pr table{ width:100%; border-collapse:collapse; font-size:9.5pt; } #printArea .rk-pr td{ border-bottom:1px solid #ddd; padding:1mm 1.6mm; vertical-align:top; }
/* 🎨 背景の 柄（v552）：--rkp（柄の色）を 色の上に重ねる。--pw（しまの太さ）・--pd（水玉の半径）・--ps（くり返しの大きさ） */
.pt-st{ background-image:repeating-linear-gradient(-45deg, var(--rkp) 0 var(--pw,4px), transparent var(--pw,4px) calc(var(--pw,4px)*2.2)); }
.pt-dot{ background-image:radial-gradient(circle, var(--rkp) 0 var(--pd,2.6px), transparent calc(var(--pd,2.6px) + .7px)), radial-gradient(circle, var(--rkp) 0 var(--pd,2.6px), transparent calc(var(--pd,2.6px) + .7px));
  background-size:var(--ps,11px) var(--ps,11px); background-position:0 0, calc(var(--ps,11px)/2) calc(var(--ps,11px)/2); }
.pt-gr{ background-image:linear-gradient(100deg, transparent 10%, var(--rkp) 95%); }
.pt-ck{ background-image:linear-gradient(90deg, var(--rkp) 50%, transparent 50%), linear-gradient(var(--rkp) 50%, transparent 50%); background-size:var(--ps,11px) var(--ps,11px); }
.pt-wv{ background-image:radial-gradient(circle at 50% 100%, transparent calc(var(--ps,11px)*.3), var(--rkp) calc(var(--ps,11px)*.3 + .6px) calc(var(--ps,11px)*.48), transparent calc(var(--ps,11px)*.48 + .6px));
  background-size:var(--ps,11px) calc(var(--ps,11px)*.5); }
.rk-dot{ --pw:2px; --pd:1.3px; --ps:5px; } .rk-dot.big{ --pw:3px; --pd:2px; --ps:8px; }
.rk-cpill{ --pw:4px; --pd:2.4px; --ps:10px; }
.rk-cpill > span,.rk-sw > span{ display:inline-block; max-width:100%; box-sizing:border-box; padding:1px 7px; border-radius:9px; background:var(--rkc); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle; }   /* 柄の上でも 名前が読めるように */
body.dark .rk-sw:not(.on):not(.none){ box-shadow:inset 0 0 0 1px rgba(255,255,255,.3); }
/* 🎨 色分けの 下の帯（v552）：名前を付けた色（横に送る）・24色・背景 */
.rk-pnamed{ display:flex; gap:6px; overflow-x:auto; padding:3px 2px 5px; margin:4px 0 0; scrollbar-width:none; }
.rk-pnamed::-webkit-scrollbar{ display:none; }
.rk-pnamed .rk-sw{ flex:none; height:34px; max-width:11em; padding:0 5px; border-radius:17px; font-size:13px; }
.rk-pats{ display:grid; grid-template-columns:repeat(6,1fr); gap:3px; margin:2px 2px 8px; }
.rk-pats button{ display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:2px; min-width:0; padding:3px 0 2px; border:1px solid transparent; border-radius:10px; background:transparent;
  color:var(--text,#333); font-size:10px; line-height:1.15; cursor:pointer; font-family:inherit; word-break:keep-all; overflow-wrap:anywhere; text-align:center; }   /* せまい所では 2行に（はみ出さない） */
.rk-pats button.on{ border-color:var(--acc); background:var(--acc-weak,rgba(33,115,70,.12)); font-weight:bold; }
.rk-pats .rk-sw{ display:block; width:calc(100% - 4px); height:22px; border-radius:7px; pointer-events:none; }
@media (max-width:359px){ .rk-pats button{ font-size:9.5px; } }
.rk-pats .rk-sw::after{ content:none; }
/* 🎨 色と背景を えらぶ所（直す画面・色をえらぶ窓） */
.rk-cp{ margin:4px 0 6px; }
.rk-cpnow{ display:flex; align-items:center; gap:6px; min-height:34px; font-size:14.5px; color:var(--text,#222); }
.rk-cpnow b{ min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rk-cpoff{ margin-left:auto; flex:none; height:32px; padding:0 10px; border-radius:16px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#333); font-size:12.5px; cursor:pointer; font-family:inherit; }
.rk-cpt{ font-size:12px; font-weight:bold; color:var(--text-light,#888); margin:8px 2px 0; }
.rk-cp .rk-pal{ margin-top:4px; }
.rk-cpn .rk-sw{ font-weight:bold; }
/* 🔍 同じ人：のこす名前（v566） */
.rk-dupnm{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:8px 0; font-size:12.5px; color:var(--text-light,#888); }
.rk-dupnm > span{ font-weight:bold; }
.rk-dupnm button{ min-height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#333); font-size:14px; cursor:pointer; font-family:inherit; }
.rk-dupnm button.on{ background:var(--acc); border-color:var(--acc); color:#fff; font-weight:bold; }
.rk-dupnm button.on::before{ content:'✓ '; }
.rk-dupnm small{ flex-basis:100%; font-size:11.5px; }
/* 🧹 整理（v566） */
.rk-it.del{ opacity:.6; }
.rk-it .dl{ flex:none; font-size:14px; }
.rk-chip.rk-tidy{ border-color:var(--acc); color:var(--acc-text,var(--acc)); }
.rk-spbar small{ flex-basis:100%; font-size:12px; color:var(--text-light,#888); line-height:1.5; }
.rk-spbar button.sub{ background:transparent; color:var(--text,#222); border:1px solid rgba(120,132,156,.5); }
.rk-spbar button.del{ background:#d32f2f; }
.rk-tdlist{ display:flex; flex-direction:column; gap:6px; margin:6px 0; }
.rk-tdrow{ display:flex; align-items:center; gap:10px; min-height:52px; padding:6px 12px; border-radius:12px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.06); color:var(--text,#222); font-size:15px; text-align:left; cursor:pointer; font-family:inherit; }
.rk-tdrow:disabled{ opacity:.5; cursor:default; }
.rk-tdrow .ic{ flex:none; font-size:22px; }
.rk-tdrow .l{ flex:1; min-width:0; font-weight:bold; }
.rk-tdrow .l small{ display:block; font-weight:normal; font-size:12px; color:var(--text-light,#888); }
.rk-tdrow b{ font-size:20px; color:var(--acc-text,var(--acc)); }
.rk-tdrow > small{ font-size:12px; color:var(--text-light,#888); }
.rk-sobar{ height:10px; border-radius:5px; background:rgba(120,132,156,.2); overflow:hidden; margin:8px 0 2px; }
.rk-sobar i{ display:block; height:100%; background:var(--acc); border-radius:5px; transition:width .25s; }
.rk-orglist{ margin:6px 0; border-top:1px solid rgba(120,132,156,.2); }
.rk-orgrow{ margin:0; padding:9px 2px; border-bottom:1px solid rgba(120,132,156,.18); }
.rk-orgrow span{ flex:1; min-width:0; font-weight:bold; overflow-wrap:anywhere; }
.rk-orgrow small{ flex:none; color:var(--text-light,#888); font-size:12px; }
#rkSortOverlay .rk-modal{ display:flex; flex-direction:column; }
.rk-so-prog{ padding:6px 12px; border-bottom:1px solid rgba(120,132,156,.25); }
.rk-so-prog .rk-sobar{ margin:2px 0 4px; }
.rk-so-cnt{ display:flex; justify-content:space-between; gap:4px 8px; flex-wrap:wrap; font-size:12.5px; color:var(--text-light,#888); }
.rk-so-cnt b{ font-size:16px; color:var(--text,#222); }
.rk-so-body{ flex:1; min-height:0; }
.rk-so-card{ border:1px solid rgba(120,132,156,.35); border-radius:14px; padding:10px 12px 4px; animation:rkSoIn .18s ease-out; }
.rk-so-card.del{ border-color:rgba(211,47,47,.55); background:rgba(211,47,47,.05); }
@keyframes rkSoIn{ from{ opacity:0; transform:translateX(14px); } to{ opacity:1; transform:none; } }
@media (prefers-reduced-motion:reduce){ .rk-so-card{ animation:none; } }
.rk-so-flags{ display:flex; flex-wrap:wrap; justify-content:center; gap:6px; margin:0 0 6px; }
.rk-so-flags .f{ font-size:12.5px; font-weight:bold; padding:3px 10px; border-radius:12px; background:rgba(120,132,156,.14); color:var(--text,#222); }
.rk-so-flags .f.del{ background:rgba(211,47,47,.14); color:#c62828; }
.rk-so-flags .f.ok{ background:rgba(46,125,50,.14); color:#2e7d32; }
.rk-so-flags .f.warn{ background:rgba(249,168,37,.2); }
body.dark .rk-so-flags .f.del{ color:#ef9a9a; }
body.dark .rk-so-flags .f.ok{ color:#a5d6a7; }
.rk-sec small{ font-weight:normal; color:var(--text-light,#888); margin-left:8px; font-size:11.5px; }
.rk-tagrow button.add{ border-style:dashed; color:var(--acc-text,var(--acc)); font-weight:bold; }
.rk-so-cols{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.rk-so-cols .rk-sw{ flex:none; height:36px; max-width:11em; padding:0 6px; border-radius:18px; font-size:13px; }
.rk-so-cb{ display:inline-flex; align-items:center; min-height:36px; padding:0 12px; border-radius:18px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#333); font-size:13.5px; cursor:pointer; font-family:inherit; }
.rk-so-mini{ display:grid; grid-template-columns:1fr 1.6fr; gap:6px; margin:12px 0 4px; }
.rk-so-mini button{ min-height:44px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14.5px; font-weight:bold; cursor:pointer; font-family:inherit; }
.rk-so-mini button.on{ color:#a85f00; border-color:rgba(249,168,37,.7); background:rgba(249,168,37,.14); }
body.dark .rk-so-mini button.on{ color:#ffd54f; }
.rk-so-foot{ padding:8px 12px calc(10px + var(--safe-bottom,0px)); border-top:1px solid rgba(120,132,156,.25); background:var(--modal-bg,#fff); }
.rk-so-btns button{ min-height:58px; font-size:14px; }
.rk-so-btns button.keep{ flex:1.5; }
.rk-so-end{ text-align:center; padding:18px 6px; font-size:15px; }
.rk-so-end .big{ font-size:44px; line-height:1.3; }
.rk-so-end .rk-btn{ max-width:420px; margin-left:auto; margin-right:auto; }
`;
function rkEnsureDom(){
  if($('renrakuOverlay')) return;
  const st=document.createElement('style'); st.id='rkStyle'; st.textContent=RK_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="renrakuOverlay">
  <div class="modal vol-modal rk-modal" style="position:relative">
    <div class="modal-header"><span>📇 連絡帳</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="hdr-btn" id="rkTblBtn" onclick="RK.table()" title="全員を表にして、その場で直す">📋 表で直す</button>
      <button class="hdr-btn" onclick="RK.menu()" title="読み込む・スマホに戻す・自分好みにする など">⚙ 設定</button>
      <button class="modal-close" onclick="closeRenraku()" aria-label="閉じる">✕</button></span></div>
    <div class="rk-top">
      <div class="rk-find"><input id="rkFind" type="search" placeholder="🔍 さがす（名前・よみ・番号の一部）" autocomplete="off" oninput="RK.setQ(this.value)" enterkeyhint="search">
        <button class="rk-ib" id="rkFindMic" onclick="RK.listen()" aria-label="声でさがす" title="声でさがす（「山田さんの電話」）">🎤</button></div>
      <div class="rk-bar" id="rkBar"></div>
    </div>
    <div class="rk-wrap"><div class="rk-list" id="rkList"></div><div class="rk-idx" id="rkIdx"></div></div>
    <div class="rk-add" id="rkAdd"></div>
  </div>
</div>
<div id="rkModeGuard" hidden></div>
<div class="modal-overlay" id="rkTblOverlay">
  <div class="modal vol-modal rk-modal">
    <div class="modal-header"><span>📋 表で直す</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="hdr-btn" id="rkTUndo" onclick="RK.tUndo()" disabled title="直したところを ひとつ戻す">↶ 戻す</button>
      <button class="modal-close" onclick="RK.closeTbl()" aria-label="閉じる">✕</button></span></div>
    <div class="rk-top">
      <div class="rk-find"><input id="rkTFind" type="search" placeholder="🔍 さがす（名前・よみ・番号の一部）" autocomplete="off" oninput="RK.tQ(this.value)" enterkeyhint="search">
        <button class="rk-tb" onclick="RK.tAdd()" title="人を足す（いちばん上に行ができます）">＋ 足す</button>
        <button class="rk-tb" onclick="RK.tCols()" title="表に出す列をえらぶ">☰ 列</button></div>
      <div class="rk-tinfo" id="rkTInfo"></div>
    </div>
    <div class="rk-tv" id="rkTV">
      <div class="rk-thd" id="rkTHd"><div class="rk-tl"><div class="rk-tr" id="rkTHL"></div></div><div class="rk-thc" id="rkTHc"><div class="rk-tr" id="rkTHr"></div></div></div>
      <div class="rk-twrap" id="rkTWrap"><div class="rk-tcols"><div class="rk-tl" id="rkTL"></div><div class="rk-tx" id="rkTX"><div class="rk-tg" id="rkTBody"></div></div></div><div class="rk-tmore" id="rkTMore"></div></div>
    </div>
  </div>
</div>
<div class="modal-overlay" id="rkSortOverlay">
  <div class="modal vol-modal rk-modal">
    <div class="modal-header"><span>🗂 1人ずつ仕分ける</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="hdr-btn" id="rkSoUndo" onclick="RK.soUndo()" disabled title="前の人に戻って、仕分けを 取り消す">↶ ひとつ戻る</button>
      <button class="modal-close" onclick="RK.soClose()" aria-label="閉じる">✕</button></span></div>
    <div class="rk-so-prog" id="rkSoProg"></div>
    <div class="rk-body rk-so-body" id="rkSoBody"></div>
    <div class="rk-so-foot" id="rkSoFoot"></div>
  </div>
</div>
${['View','Ed','Sub','Scr','Ask'].map(k=>`<div class="modal-overlay" id="rk${k}Overlay" onclick="if(event.target===this)RK.close${k}()">
  <div class="modal"><div class="modal-header"><span id="rk${k}Hdr"></span><button class="modal-close" onclick="RK.close${k}()" aria-label="閉じる">✕</button></div>
    <div class="rk-body" id="rk${k}Body"></div></div></div>`).join('')}
<input type="file" id="rkFileIn" hidden onchange="RK.importFile(this)">
<input type="file" id="rkPicIn" accept="image/*" hidden onchange="RK.edPicked(this)">
<input type="file" id="rkCamIn" accept="image/*" capture="environment" hidden onchange="RK.edPicked(this)">`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
  rkBindIdx();
  $('rkTV').addEventListener('click', rkTClick);
  $('rkTHd').addEventListener('pointerdown', rkRsDown); $('rkTHd').addEventListener('pointermove', rkRsMove);
  ['pointerup','pointercancel'].forEach(t=>$('rkTHd').addEventListener(t, rkRsUp));
  $('rkTX').addEventListener('scroll', ()=>{ $('rkTHc').scrollLeft=$('rkTX').scrollLeft; }, {passive:true});   // 見出しを本体の横の動きに合わせる
  window.addEventListener('resize', ()=>{ if(rkT) rkTSync(); });
  // 表のマスに入れているときの Enter・Tab・Esc は、ここで先に受ける（表電卓の「Esc で閉じる」「Tab で回る」より先に）
  window.addEventListener('keydown', rkTKey, true);
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') rkSaveFlush(); });
  window.addEventListener('pagehide', rkSaveFlush);
}
function openRenraku(q){
  rkEnsureDom(); rkLoad(); rkGrp=''; rkCol=''; rkSel=null; rkPaint=null; rkAddOpen=false; rkVoice=null;
  rkQ=typeof q==='string'?q:''; $('rkFind').value=rkQ;
  openDlg('renrakuOverlay', ()=>{ rkSel=null; rkPaint=null; rkStopListen(); rkSaveFlush(); });
  rkRender(); $('rkList').scrollTop=0;
  if(!rk.tipFold && $('rkAdd').classList.contains('fold')){   // 下のボタンを たたんだことを 1回だけ 知らせる（v551。読み込んだ知らせとは 重ねない）
    rk.tipFold=true; rkSave();
    setTimeout(()=>{ if(isDlgOpen('renrakuOverlay')) toast('下のボタンは 右下の ◀ に たたみました。◀ を押すと「入れる・色分け・えらぶ・スマホに戻す」が出て、右端の ▶ で また たたみます', 5500); }, 600);
  }
}
const closeIf=(id,cb)=>{ if($(id) && isDlgOpen(id)) closeDlg(id, cb); };
function closeRenraku(){
  if(!$('renrakuOverlay') || !isDlgOpen('renrakuOverlay')) return;
  rkCloseAsk(); rkCloseScr(); rkCloseSub(); rkCloseEd(); rkCloseView(); rkCloseSort(); rkCloseTbl(); rkStopListen(); closeIf('rkModeGuard');
  closeDlg('renrakuOverlay', ()=>{ rkSel=null; rkPaint=null; rkSaveFlush(); });
}
function rkCloseView(){ closeIf('rkViewOverlay', ()=>{ rkViewId=null; }); }
function rkCloseEd(){ closeIf('rkEdOverlay', ()=>{ rkEd=null; }); }
function rkCloseSub(){ closeIf('rkSubOverlay'); }
function rkCloseScr(){ rkScrUpClear(); const c=rkScrClean; rkScrClean=null; closeIf('rkScrOverlay', ()=>{ if(c) c(); }); }
/* 画面の中で 次の画面へ進んだとき（🧩 自分好みにする → 🔢 色の No. など）：端末の「戻る」で 前の画面に戻る（v553） */
let rkScrUp=[];   // 前の画面を出しなおす関数（下から）
function rkScrDeeper(reopen){
  const id='rkScrUp'+rkScrUp.length; let el=$(id);
  if(!el){ el=document.createElement('div'); el.id=id; el.hidden=true; document.body.appendChild(el); }
  rkScrUp.push(reopen);
  openDlg(id, ()=>{ if(rkScrUp[rkScrUp.length-1]===reopen) rkScrUp.pop(); if(isDlgOpen('rkScrOverlay')) reopen(); });
}
/* ボタンで 前の画面に戻るとき（「できあがり」など）：いちばん上の分を はずす */
function rkScrUpPop(){ if(!rkScrUp.length) return; rkScrUp.pop(); closeIf('rkScrUp'+rkScrUp.length); }
function rkScrUpClear(){ while(rkScrUp.length) rkScrUpPop(); }
function rkCloseAsk(){ closeIf('rkAskOverlay'); }
function rkScr(hdr, html, onClose){
  $('rkScrHdr').textContent=hdr; $('rkScrBody').innerHTML=html; $('rkScrBody').scrollTop=0;
  if(onClose!==undefined) rkScrClean=onClose;
  if(!isDlgOpen('rkScrOverlay')) openDlg('rkScrOverlay', ()=>{ const c=rkScrClean; rkScrClean=null; if(c) c(); });
}
let rkAskFin=null;
/* いくつかから選ぶ（押したボタンの番号。閉じたら -1） */
function rkAsk(hdr, msg, btns, html){
  return new Promise(res=>{
    if(rkAskFin) rkAskFin(-1);
    let done=false; const fin=r=>{ if(done) return; done=true; if(rkAskFin===fin) rkAskFin=null; res(r); };
    rkAskFin=fin;
    $('rkAskHdr').textContent=hdr;
    $('rkAskBody').innerHTML=(msg?`<div class="rk-msg">${esc(msg)}</div>`:'')+(html||'')+btns.map((b,i)=>`<button class="rk-btn${i?' sub':''}" data-r="${i}">${esc(b)}</button>`).join('');
    $('rkAskBody').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ fin(+b.dataset.r); rkCloseAsk(); });
    $('rkAskBody').scrollTop=0;
    if(!isDlgOpen('rkAskOverlay')) openDlg('rkAskOverlay', ()=>{ if(rkAskFin) rkAskFin(-1); });
  });
}

/* ── 一覧 ── */
/* グループ・★・よみなし・色 で絞った人（さがす前） */
function rkFiltered(){
  let list=rk.items;
  if(rkGrp==='★') list=list.filter(x=>x.fav);
  else if(rkGrp==='?') list=list.filter(noYomi);
  else if(RK_SP[rkGrp]) list=list.filter(RK_SP[rkGrp][2]);   // 🧹 整理の 絞りこみ（v566）
  else if(rkGrp) list=list.filter(x=>x.groups.includes(rkGrp));
  if(rkCol) list=list.filter(x=>rkCol==='-' ? !x.color : x.color===rkCol);
  return list;
}
function rkVisible(){ const list=rkFiltered(); return rkVoiceOn() ? rkVoiceSearch(list, rkVoice) : rkQ.trim() ? rkSearch(rkQ, list) : list; }
function rkRender(){
  if(!$('rkList')) return;
  $('renrakuOverlay').classList.toggle('rk-big', !!rk.big);
  $('renrakuOverlay').classList.toggle('rk-tel1', rk.telSize===1); $('renrakuOverlay').classList.toggle('rk-tel2', rk.telSize===2);
  $('rkTblBtn').hidden=!rk.items.length;
  rkRenderBar(); rkRenderAdd();
  if(rkIO){ rkIO.disconnect(); }
  const L=$('rkList'), I=$('rkIdx');
  if(!rk.items.length){ L.innerHTML=rkEmptyHtml(); I.innerHTML=''; L.classList.add('noidx'); return; }
  const list=rkVisible();
  if(rkVoiceOn()){
    I.innerHTML=''; L.classList.add('noidx');
    const sc=rkVoice.sc, a=list.filter(x=>sc.get(x.id)>=70), b=list.filter(x=>!(sc.get(x.id)>=70));
    L.innerHTML=rkVoiceNote()+(a.length?`<div class="rk-grp">見つかった人<span>${a.length}人</span></div>`+a.map(rkItemHtml).join(''):'')
      +(b.length?`<div class="rk-grp">よみの近い人（候補）<span>${b.length}人</span></div>`+b.map(rkItemHtml).join(''):'')
      +(list.length?'':`<div class="rk-empty">「<b>${esc(rkQ)}</b>」は見つかりませんでした。<br>名字だけ・名前だけで もう一度 言ってみてください（「にしたに」「ひさじ」）。</div>`);
  } else if(rkQ.trim()){
    I.innerHTML=''; L.classList.add('noidx');
    L.innerHTML=list.length ? `<div class="rk-grp">見つかった人<span>${list.length}人</span></div>`+list.map(rkItemHtml).join('')
      : `<div class="rk-empty">「<b>${esc(rkQ)}</b>」は見つかりませんでした。<br>よみ（ひらがな）・番号の一部・会社名・メモの言葉でも さがせます。</div>`;
  } else {
    L.innerHTML=(rkGrp==='?'?rkYBarHtml():'')+(RK_SP[rkGrp]?rkSpBarHtml(list.length):'')+rkBdayHtml()+rkSectionsHtml(list);
  }
  rkObserveThumbs();
}
function rkSectionsHtml(list){
  const I=$('rkIdx'), L=$('rkList'); let secs=[];
  if(!list.length){ I.innerHTML=''; L.classList.add('noidx'); return '<div class="rk-empty">ここには まだ だれもいません。</div>'; }
  if(rk.view==='kana'){
    const by={}; for(const x of list){ const r=rkRow(x); (by[r]=by[r]||[]).push(x); }
    secs=ROWS.filter(r=>by[r]).map(r=>[r, r==='A'?'ABC':r, by[r].sort(cmpKana)]);
    if(vDir('kana')==='down'){ secs.reverse(); secs.forEach(s=>s[2].reverse()); }   // 下から：ん→あ
  } else if(rk.view==='group'){
    const by={}, none=[];
    for(const x of list){ if(!x.groups.length) none.push(x); x.groups.forEach(g=>(by[g]=by[g]||[]).push(x)); }
    secs=rk.groups.filter(g=>by[g.n]).map(g=>['g:'+g.n, (g.ic?g.ic+' ':'')+g.n, by[g.n].sort(cmpKana)]);
    if(none.length) secs.push(['g:', 'グループなし', none.sort(cmpKana)]);
    if(vDir('group')==='down') secs.reverse();   // 下から：No.1 のグループが いちばん下
  } else if(rk.view==='color'){
    const by={}, none=[];
    for(const x of list){ if(x.color) (by[x.color]=by[x.color]||[]).push(x); else none.push(x); }
    secs=cSortKeys(Object.keys(by)).map(k=>['c:'+k, colFullD(k), by[k].sort(cmpKana), k]);   // 名前のある色（No. 順）→ ない色
    if(none.length) secs.push(['c:', '色なし', none.sort(cmpKana)]);
    if(rk.cdir==='down') secs.reverse();   // 下から：No.1 が いちばん下（色なしは いちばん上）
  } else if(rk.view==='org'){
    const by={}; for(const x of list){ const k=x.org.trim(); (by[k]=by[k]||[]).push(x); }
    const ok=o=>hira(String(o).replace(/株式会社|有限会社|合同会社|合資会社|一般社団法人|一般財団法人|医療法人|社会福祉法人|\(株\)|（株）|㈱|\(有\)|（有）|㈲/g,'')).replace(/\s/g,'');   // 「株式会社」などは並びに入れない
    secs=Object.keys(by).sort((a,b)=>a===''?1:b===''?-1:ok(a).localeCompare(ok(b),'ja')).map(k=>['o:'+k, k?'🏢 '+k:'会社なし', by[k].sort(cmpKana)]);
    if(vDir('org')==='down') secs.reverse();
  } else {
    secs=[['n','🕘 新しく入れた・直した順', list.slice().sort((a,b)=>(b.ts||0)-(a.ts||0) || b.updated.localeCompare(a.updated) || cmpKana(a,b))]];
    if(vDir('new')==='down'){ secs[0][1]='🕘 前に入れた・直した順（古い順）'; secs[0][2].reverse(); }
  }
  const kana=rk.view==='kana';
  I.innerHTML=kana ? secs.map(s=>`<button type="button" data-sec="${esc(s[0])}" aria-label="${esc(s[1])}の行へ">${esc(s[0])}</button>`).join('') : '';
  L.classList.toggle('noidx', !kana);
  return secs.map(([k,label,items,ck])=>`<div class="rk-grp" data-sec="${esc(k)}">${ck?dotH(ck):''}${esc(label)}<span>${items.length}人</span></div>`+items.map(rkItemHtml).join('')).join('');
}
/* 一覧に出す 📝 メモ（v555）：はじめの2行。「名前の下に出すもの」が メモのときは 重ねて出さない */
function rkListMemo(x){
  if(!rk.lmemo || rk.sub==='note' || !x.note) return '';
  return x.note.split('\n').map(t=>t.trim()).filter(Boolean).slice(0,2).join('\n');
}
function rkSubLine(x){
  const s=rk.sub;
  if(s==='none') return '';
  if(s==='org') return [x.org,x.dept,x.title].filter(Boolean).join(' ');
  if(s==='group') return x.groups.map(g=>(gIcon(g)?gIcon(g)+' ':'')+g).join('・');
  if(s==='note') return (x.note.split('\n')[0]||'');
  if(s.startsWith('cf:')){ const f=rk.fields.find(f=>f.id===s.slice(3)); return f && x.cf[f.id] ? f.n+'：'+x.cf[f.id] : ''; }
  const t=x.tels.find(t=>t.p) || x.tels.find(t=>t.t==='cell') || x.tels[0];
  return t ? tName(TEL_T,t)+' '+t.v : (x.mails[0]?x.mails[0].v:'');
}
function rkItemHtml(x){
  const on=rkSel && rkSel.has(x.id), sub=rkSubLine(x);
  const hex=colHex(x.color), no=x.color && rk.cno ? cNo(x.color) : 0, cn=x.color ? (rk.colors[x.color]||'') : '';
  const gi=x.groups.filter(g=>g!==cn).map(gIcon).filter(Boolean).join('');   // 色の名前のグループ（🎨）は 色の札と同じなので 右はしに出さない（v554）
  const mm=rkListMemo(x);   // 📝 メモ（v555）：電話番号などの下に 2行まで
  return `<div class="rk-it${on?' sel':''}${hex?' col'+ptCls(x.color):''}${x.del?' del':''}" data-id="${x.id}"${hex?` style="--rkc:${hex}"`:''} onclick="RK.tap('${x.id}')">${rkSel?'<span class="ck">✓</span>':''}<span class="av" data-ph="${x.photo?x.id:''}" style="background-color:${rkColor(x)}">${esc(rkInitial(x))}</span>`
    +`<span class="tx"><div class="nm">${esc(rkName(x))}${(rkYomi(x) && !rk.furi)?`<small>${esc(rkYomi(x))}</small>`:''}</div>${sub?`<div class="sb${(rk.sub==='tel' && x.tels.length)?' tel':''}">${esc(sub)}</div>`:''}${mm?`<div class="mm">📝 ${esc(mm)}</div>`:''}</span>`
    +`${(no||cn)?`<span class="cl${no?' n':''}" style="--rki:${colInk(x.color)}">${no?`<b>No.${no}</b>${cn?' ':''}`:''}${esc(cn)}</span>`:''}${gi?`<span class="gi">${esc(gi)}</span>`:''}${x.fav?'<span class="fv">★</span>':''}${x.del?'<span class="dl" title="消す候補">🗑</span>':''}</div>`;
}
/* 色をぬった人だけ 書きなおす（一覧は動かさない） */
function rkRepaint(id){
  const x=rkFind(id); if(!x) return;
  document.querySelectorAll(`#rkList .rk-it[data-id="${id}"]`).forEach(e=>{
    const t=document.createElement('div'); t.innerHTML=rkItemHtml(x); const n=t.firstElementChild; e.replaceWith(n);
    const av=n.querySelector('.av[data-ph]'); if(av && av.dataset.ph) rkFillThumb(av);
  });
}
function rkObserveThumbs(){
  const els=[...document.querySelectorAll('#rkList .av[data-ph]')].filter(e=>e.dataset.ph);
  if(!els.length) return;
  if(!('IntersectionObserver' in window)){ els.forEach(rkFillThumb); return; }
  if(!rkIO) rkIO=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ rkIO.unobserve(e.target); rkFillThumb(e.target); } }), {root:$('rkList'), rootMargin:'300px'});
  els.forEach(e=>rkIO.observe(e));
}
async function rkFillThumb(el){ const d=await rkPic(el.dataset.ph); if(d && safeImg(d) && el.isConnected){ el.style.backgroundImage=`url("${d}")`; el.textContent=''; } }
function rkBdayHtml(){
  if(rkGrp || rkCol || rkSel || rkPaint) return '';
  const now=new Date(); now.setHours(0,0,0,0);
  const soon=[];
  for(const x of rk.items){ const m=/(\d\d)-(\d\d)$/.exec(x.bday||''); if(!m) continue;
    let d=new Date(now.getFullYear(), +m[1]-1, +m[2]); if(d<now) d=new Date(now.getFullYear()+1, +m[1]-1, +m[2]);
    const days=Math.round((d-now)/86400000); if(days<=14) soon.push([x,days,d]); }
  if(!soon.length) return '';
  soon.sort((a,b)=>a[1]-b[1] || cmpKana(a[0],b[0]));
  return `<div class="rk-bd">🎂 もうすぐ誕生日 ${soon.slice(0,4).map(([x,days,d])=>{ const y=/^\d{4}/.test(x.bday)?d.getFullYear()-(+x.bday.slice(0,4)):0;
    return `<button type="button" onclick="RK.view('${x.id}')">${esc(rkName(x))}　${d.getMonth()+1}/${d.getDate()}（${days?'あと'+days+'日':'今日'}${y?'・'+y+'歳':''}）</button>`; }).join('')}</div>`;
}
function rkRenderBar(){
  const cnt={}, cc={}; rk.items.forEach(x=>{ x.groups.forEach(g=>{ cnt[g]=(cnt[g]||0)+1; }); if(x.color) cc[x.color]=(cc[x.color]||0)+1; });
  const nf=rk.items.filter(x=>x.fav).length, ny=rk.items.filter(noYomi).length, nc=rk.items.length-Object.values(cc).reduce((s,n)=>s+n,0);
  if(rkGrp && !(RK_SP[rkGrp]?rkSpCount(rkGrp):rkGrp==='★'?nf:rkGrp==='?'?ny:cnt[rkGrp])) rkGrp='';
  if(rkCol && !rkPaint && !(rkCol==='-'?nc:cc[rkCol])) rkCol='';   // ぬっている間は、絞りを外さない（一覧が急に変わらないように）
  const chip=(k,l,n)=>`<button class="rk-chip${rkGrp===k?' on':''}" onclick="RK.setGrp(${esc(JSON.stringify(k))})">${esc(l)}<small>${n}</small></button>`;
  const cchip=(k,l,n)=>`<button class="rk-chip${rkCol===k?' on':''}" onclick="RK.setCol('${k}')">${k!=='-'?dotH(k):''}${esc(l)}<small>${n}</small></button>`;
  const used=cSortKeys(Object.keys(cc).concat(ckOk(rkCol) && !cc[rkCol] ? [rkCol] : []));   // 使っている色（名前のある色は No. 順）
  const sp=RK_SP[rkGrp];   // 🧹 整理（v566）は いちばん左に。その絞りこみを えらんでいれば その札も
  $('rkBar').innerHTML=(rk.items.length?'<button class="rk-chip rk-tidy" id="rkTidyChip" onclick="RK.tidy()" title="同じ人・要らない人・1人ずつ仕分け・会社でグループ">🧹 整理</button>'+(sp?chip(rkGrp, sp[0]+' '+sp[1], rkSpCount(rkGrp)):'')+'<span class="rk-sep"></span>':'')
    +vOrd().map(k=>{ const l=VIEWS.find(v=>v[0]===k)[1]; return `<button class="rk-chip${rk.view===k?' on':''}" data-view="${k}" onclick="RK.setView('${k}')">${l}</button>`+(rk.view===k?rkMiniHtml(k):''); }).join('')
    +((nf||ny||rk.groups.length||used.length)?'<span class="rk-sep"></span>':'')
    +(nf?chip('★','★ よく使う',nf):'')
    +rk.groups.filter(g=>cnt[g.n]).map(g=>chip(g.n,(g.ic?g.ic+' ':'')+g.n,cnt[g.n])).join('')
    +(ny?chip('?','よみなし',ny):'')
    +used.map(k=>cchip(k, colLabelD(k), cc[k]||0)).join('')
    +(used.length && (nc || rkCol==='-') ? cchip('-','色なし',nc) : '');
}
function rkRenderAdd(){
  const A=$('rkAdd');
  // ふだんは 右下に ◀ だけ（v551）。色分け・えらぶ の帯と、まだ人がいないときの 読み込むボタンは そのまま出す。
  // 出したかどうか（rkAddOpen）は ◀・▶ だけで変わる（色分け・えらぶ を おえたら もとのとおり）
  const fold=!rkPaint && !rkSel && rk.items.length>0 && rk.addbar!=='show';
  if(!rk.items.length) rkAddOpen=false;
  A.classList.toggle('fold', fold); A.classList.toggle('open', fold && rkAddOpen); $('renrakuOverlay').classList.toggle('rk-folded', fold);
  if(isDlgOpen('renrakuOverlay')) rkModeSync();
  if(rkPaint){
    const c=rkPaint.c, n=c?rk.items.filter(x=>x.color===c).length:0, [bc,bq]=ckSplit(c||rk.pc||'red'), named=cOrd();
    A.innerHTML=`<div class="rk-pinfo">${c?`${dotH(c,true)}<b>${esc(colFullD(c))}</b><span class="n">${n}人</span><span class="hint">押した人を この色に</span>`
        :'<b>✕ 色を外す</b><span class="hint">押した人の色を外します</span>'}
      ${c?`<button type="button" onclick="RK.colEdit('${c}')">✏ ${rk.colors[c]?'直す':'名前を付ける'}</button>`:''}</div>
      ${named.length?`<div class="rk-pnamed" id="rkPNamed">${named.map(k=>`<button type="button" class="rk-sw${ptCls(k)}${c===k?' on':''}" data-c="${k}" style="${swSt(k)}" onclick="RK.paintPick('${k}')"><span>${esc(colLabelD(k))}</span></button>`).join('')}</div>`:''}
      <div class="rk-pal" id="rkPal">${PAL.map(([b])=>{ const kk=ckMake(b,bq); return `<button type="button" class="rk-sw${ptCls(kk)}${(c && bc===b)?' on':''}" data-b="${b}" data-c="${kk}" style="${swSt(kk)}" onclick="RK.paintBase('${b}')" aria-label="${esc(colBase(kk))}" title="${esc(colBase(kk))}"></button>`; }).join('')}</div>
      ${rkPatsHtml(c?bq:null, bc, 'RK.paintPat', 'rkPPats')}
      <div class="rk-selbtns rk-tabs rk-p3"><button class="sub${c?'':' on'}" onclick="RK.paintPick('')"><span>✕</span>色を外す</button><button class="sub" onclick="RK.paintUndo()" ${rkPaint.undo.length?'':'disabled'}><span>↶</span>ひとつ戻す</button><button onclick="RK.paintEnd()"><span>✓</span>おわる</button></div>`;
    return;
  }
  if(rkSel){
    A.innerHTML=`<div class="rk-selinfo"><span><b id="rkSelN">${rkSel.size}</b>人 えらんでいます</span><button type="button" onclick="RK.selAll()">いま出ている人をぜんぶ</button></div>
      <div class="rk-selbtns rk-tabs"><button onclick="RK.selGroup()"><span>🏷</span>グループ</button><button onclick="RK.selColor()"><span>🎨</span>色</button><button onclick="RK.openExport('sel')"><span>📇</span>書き出す</button><button class="del" onclick="RK.selDel()"><span>🗑</span>消す</button><button class="sub" onclick="RK.selEnd()"><span>✕</span>やめる</button></div>`;
    return;
  }
  if(!rk.items.length){ A.innerHTML=`<div class="rk-addbtns"><button onclick="RK.importClick()">⬆ スマホの連絡先を読み込む</button><button class="sub" onclick="RK.edit(null)">＋ 手で入れる</button></div>`; return; }
  const btns=`<div class="rk-addbtns rk-tabs"><button onclick="RK.edit(null)"><span>＋</span>入れる</button><button class="sub" onclick="RK.paintStart()"><span>🎨</span>色分け</button><button class="sub" onclick="RK.selStart()"><span>☑</span>えらぶ</button><button class="sub" onclick="RK.openExport()"><span>📇</span>スマホに<wbr>戻す</button></div>`;
  if(!fold){ A.innerHTML=btns; return; }
  A.innerHTML=rkAddOpen
    ? btns+'<button type="button" class="rk-fold" id="rkFold" onclick="RK.addFold(false)" aria-expanded="true" aria-label="ボタンを たたむ" title="たたむ">▶</button>'
    : '<button type="button" class="rk-fold" id="rkFold" onclick="RK.addFold(true)" aria-expanded="false" aria-label="ボタンを出す（入れる・色分け・えらぶ・スマホに戻す）" title="入れる・色分け・えらぶ・スマホに戻す">◀</button>';
}
/* 🎨 色分け・☑ えらぶ の あいだは、端末の「戻る」で その動きだけ おわる（連絡帳ごと 表電卓へ戻らない。v553） */
function rkModeSync(){
  if(!$('rkModeGuard')) return;
  const on=!!(rkPaint||rkSel);
  if(on && !isDlgOpen('rkModeGuard')) openDlg('rkModeGuard', ()=>{
    const p=!!rkPaint; if(!rkPaint && !rkSel) return;
    rkPaint=null; rkSel=null; rkSave(); rkRender(); toast(p?'🎨 色分けを おわりました':'☑ えらぶのを やめました');
  });
  else if(!on && isDlgOpen('rkModeGuard')) closeDlg('rkModeGuard');
}
/* 右下の ◀：押すと ボタンを出す・バーの右端の ▶ で たたむ（v551） */
function rkAddFold(open){
  rkAddOpen=!!open; rkRenderAdd();
  if(rkAddOpen){ const t=document.getElementById('appToast'); if(t) t.classList.remove('show'); }   // 出したボタンに お知らせが かぶらないように
}
function rkSetAddBar(v){
  rk.addbar=v==='show'?'show':'fold'; rkAddOpen=false; rkSave(); rkRender();
  document.querySelectorAll('#rkBarSet [data-ab]').forEach(b=>b.classList.toggle('on', b.dataset.ab===rk.addbar));
}
const rkCanPick=()=>!!(navigator.contacts && typeof navigator.contacts.select==='function');
function rkEmptyHtml(){
  return `<div class="rk-empty"><div class="big">📇</div><b>スマホの連絡先を読み込むと、<br>よみ順・グループで 見やすく整理できます。</b><br><br>
    スマホの連絡帳アプリで、連絡先を<b>ファイルに書き出し</b>（.vcf）、<br>下の「<b>⬆ スマホの連絡先を読み込む</b>」で そのファイルを選びます。<br>
    直したら「<b>📇 スマホに戻す</b>」で、またスマホに入れられます。
    <div class="rk-emptybtns"><button class="rk-btn sub" onclick="RK.help()">❓ スマホからの出し方・戻し方</button>${rkCanPick()?'<button class="rk-btn sub" onclick="RK.pick()">📱 スマホの連絡先から選んで入れる</button>':''}</div></div>`;
}
/* 「あかさたな」の索引：押す・なぞるとその行へ */
function rkJump(sec){ const h=[...document.querySelectorAll('#rkList .rk-grp[data-sec]')].find(g=>g.dataset.sec===sec); if(h){ const L=$('rkList'); L.scrollTop=h.offsetTop-L.offsetTop; } }
function rkBindIdx(){
  const bar=$('rkIdx'); if(!bar || bar.dataset.b) return; bar.dataset.b='1';
  let on=false, last='';
  const go=e=>{ const el=document.elementFromPoint(e.clientX, e.clientY), b=el && el.closest && el.closest('#rkIdx button'); if(b && b.dataset.sec!==last){ last=b.dataset.sec; rkJump(last); } };
  bar.addEventListener('pointerdown', e=>{ on=true; last=''; try{ bar.setPointerCapture(e.pointerId); }catch(_){} go(e); });
  bar.addEventListener('pointermove', e=>{ if(on) go(e); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>bar.addEventListener(t, ()=>{ on=false; }));
  bar.addEventListener('click', e=>{ const b=e.target.closest('button'); if(b) rkJump(b.dataset.sec); });
}
function rkFlash(id){ const e=document.querySelector(`#rkList .rk-it[data-id="${id}"]`); if(e){ e.scrollIntoView({block:'nearest'}); e.style.transition='background .2s'; e.style.background='rgba(255,213,79,.45)'; setTimeout(()=>{ e.style.background=''; }, 1600); } }
function rkTap(id){
  if(rkPaint){ rkPaintTap(id); return; }
  if(!rkSel){ rkView(id); return; }
  if(rkSel.has(id)) rkSel.delete(id); else rkSel.add(id);
  document.querySelectorAll(`#rkList .rk-it[data-id="${id}"]`).forEach(e=>e.classList.toggle('sel', rkSel.has(id)));
  const n=$('rkSelN'); if(n) n.textContent=rkSel.size;
}

/* ── 見る ── */
const rkTelHref=v=>'tel:'+String(v).normalize('NFKC').replace(/[^\d+#*]/g,'');
const rkSmsHref=v=>'sms:'+String(v).normalize('NFKC').replace(/[^\d+]/g,'');
const rkMailOk=v=>/^[^\s@"'<>()\\,;:]+@[^\s@"'<>()\\,;:]+\.[^\s@"'<>()\\,;:]+$/.test(String(v).trim());
const rkUrlOk=u=>/^(https?:\/\/|www\.)[^\s"'<>\\]+$/i.test(String(u).trim());
const rkUrlHref=u=>/^https?:\/\//i.test(String(u).trim())?String(u).trim():'https://'+String(u).trim();
const rkMapHref=t=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(t);
function rkBdayText(b){
  const m=/^(\d{4}|-)-(\d\d)-(\d\d)$/.exec(b||''); if(!m) return '';
  const md=(+m[2])+'月'+(+m[3])+'日'; if(m[1]==='-') return md;
  const now=new Date(); let age=now.getFullYear()-(+m[1]); if(now.getMonth()+1<+m[2] || (now.getMonth()+1===+m[2] && now.getDate()<+m[3])) age--;
  return m[1]+'年'+md+(age>=0&&age<130?'（'+age+'歳）':'');
}
function rkView(id){
  const x=rkFind(id); if(!x) return;
  rkViewId=id;
  $('rkViewHdr').textContent='📇 '+rkName(x);
  const row=(l,html,cls)=>`<div class="rk-row${cls?' '+cls:''}"><b>${esc(l)}</b><span>${html}</span></div>`;
  const rows=[];
  // 📞 電話：かけない → 番号は文字だけ。かける前に聞く → 押すと たずねてから（v547）
  const telA=(v,inner)=>rk.call==='off' ? '' : `<a href="${esc(rkTelHref(v))}" data-num="${esc(v)}"${rk.call==='ask'?' onclick="RK.telAsk(event,this)"':''}>${inner}</a>`;
  x.tels.forEach(t=>rows.push(row(tName(TEL_T,t), (rk.call==='off' ? `<span class="rk-num">${esc(t.v)}</span>` : telA(t.v, esc(t.v)))+(t.t==='cell'?`<a class="rk-mini" href="${esc(rkSmsHref(t.v))}" aria-label="SMS">💬</a>`:''), 'tel')));
  x.mails.forEach(m=>rows.push(row(tName(MAIL_T,m), rkMailOk(m.v)?`<a href="${esc('mailto:'+m.v.trim())}">${esc(m.v)}</a>`:esc(m.v))));
  x.adrs.forEach(a=>{ const t=rkAdrText(a); rows.push(row(tName(ADR_T,a), (a.zip?'〒'+esc(a.zip)+' ':'')+(t?`<a href="${esc(rkMapHref(t))}" target="_blank" rel="noopener">${esc(t)}</a>`:''))); });
  if(x.bday) rows.push(row('誕生日', esc(rkBdayText(x.bday))));
  x.urls.forEach(u=>rows.push(row('サイト', rkUrlOk(u)?`<a href="${esc(rkUrlHref(u))}" target="_blank" rel="noopener">${esc(u)}</a>`:esc(u))));
  if(x.nick) rows.push(row('ニックネーム', esc(x.nick)));
  rk.fields.forEach(f=>{ if(x.cf[f.id]) rows.push(row(f.n, esc(x.cf[f.id]))); });
  if(x.groups.length) rows.push(row('グループ', esc(x.groups.map(g=>(gIcon(g)?gIcon(g)+' ':'')+g).join('・'))));
  const t0=x.tels.find(t=>t.t!=='fax'), c0=x.tels.find(t=>t.t==='cell'), m0=x.mails.find(m=>rkMailOk(m.v)), a0=x.adrs.find(a=>rkAdrText(a));
  const act=(ic,l,href,blank)=>href?`<a href="${esc(href)}"${blank?' target="_blank" rel="noopener"':''}><span>${ic}</span>${l}</a>`:`<a class="off"><span>${ic}</span>${l}</a>`;
  $('rkViewBody').innerHTML=`
    <div class="rk-who"><span class="av" id="rkViewAv" style="background-color:${rkColor(x)}">${esc(rkInitial(x))}</span>
      ${(rkYomi(x) && rk.furi!=='off')?`<div class="k">${esc(rkYomi(x))}</div>`:''}<div class="n">${esc(rkName(x))}${x.fav?' <span class="fvc">★</span>':''}</div>
      ${(x.org||x.dept||x.title)?`<div class="c">${esc([x.org,x.dept,x.title].filter(Boolean).join(' '))}</div>`:''}
      ${x.color?`<span class="rk-cpill${ptCls(x.color)}" style="${swSt(x.color)}"><span>${esc(colFullD(x.color))}</span></span>`:''}</div>
    <div class="rk-acts">${(t0 && rk.call!=='off') ? telA(t0.v, '<span>📞</span>電話') : act('📞','電話','')}${act('💬','SMS',c0?rkSmsHref(c0.v):'')}${act('✉','メール',m0?'mailto:'+m0.v.trim():'')}${act('📍','地図',a0?rkMapHref(rkAdrText(a0)):'',true)}</div>
    ${rk.call==='off' && x.tels.length ? '<div class="rk-note rk-calloff">📞 電話は「かけない」にしています（番号を押しても かかりません。⚙ 設定で変えられます）</div>' : ''}
    <div class="rk-rows">${rows.join('')}</div>
    <div class="rk-vmemo"><label for="rkViewMemo">📝 メモ<small>${esc(rkMemoHint())}</small></label>
      <textarea id="rkViewMemo" rows="2" maxlength="3000" placeholder="ここに書けます（例：午後は不在・〇〇の件）" oninput="RK.viewMemo(this)">${esc(x.note)}</textarea></div>
    <button class="rk-btn" onclick="RK.edit('${x.id}')">✏ 直す</button>
    <button class="rk-btn sub" onclick="RK.fav('${x.id}')">${x.fav?'☆ よく使うから外す':'★ よく使う'}</button>
    <button class="rk-btn sub" onclick="RK.viewColor('${x.id}')">🎨 色分け${x.color?'（いま：'+esc(colFullD(x.color))+'）':''}</button>
    <button class="rk-btn sub" onclick="RK.share('${x.id}')">📤 送る（LINE・メールなど）</button>
    <button class="rk-btn sub" onclick="RK.oneVcf('${x.id}')">📇 この人の連絡先ファイル（.vcf）</button>
    <button class="rk-btn del" onclick="RK.remove('${x.id}')">🗑 消す</button>
    <div class="rk-note">${x.raw.length?'スマホの項目のまま持っているもの '+x.raw.length+'件（ここには出ませんが、書き出すとそのまま戻ります）<br>':''}入れた日 ${fmtDay(x.added)}${x.updated!==x.added?'　直した日 '+fmtDay(x.updated):''}</div>`;
  const VO=$('rkViewOverlay'); VO.classList.toggle('rk-big', !!rk.big); VO.classList.toggle('rk-tel1', rk.telSize===1); VO.classList.toggle('rk-tel2', rk.telSize===2);
  if(!isDlgOpen('rkViewOverlay')) openDlg('rkViewOverlay', ()=>{ rkViewId=null; }); else $('rkViewBody').scrollTop=0;
  rkMemoGrow($('rkViewMemo'));
  if(x.photo) rkPic(x.id).then(d=>{ const a=$('rkViewAv'); if(a && d && safeImg(d) && rkViewId===x.id){ a.style.backgroundImage=`url("${d}")`; a.textContent=''; } });
}
/* 📝 メモ欄（v555）：書いたら そのまま覚える（x.note。スマホに戻すと メモ欄に入る）。一覧の その人の行も 書きなおす */
const rkMemoHint=()=>!rk.lmemo ? '' : rk.sub==='note' ? '1行目が 一覧の 名前の下にも出ます' : '一覧の 電話番号の下にも出ます';
function rkMemoGrow(el){ if(!el) return; el.style.height='auto'; el.style.height=Math.min(el.scrollHeight+2, Math.round(window.innerHeight*0.4))+'px'; }
let rkMemoT=0;
function rkViewMemo(el){
  const x=rkViewId ? rkFind(rkViewId) : null; if(!x || !el) return;
  rkMemoGrow(el);
  const v=String(el.value||'').slice(0,3000);
  if(v===x.note) return;
  x.note=v; x.updated=today(); x.ts=Date.now();
  rkSaveSoon();
  clearTimeout(rkMemoT); const id=x.id;
  rkMemoT=setTimeout(()=>{ rkMemoT=0; rkRepaint(id); if(rkT) rkTRowRe(id); }, 250);
}
/* かける前に聞く：「○○ 090-… に電話をかけますか？」→ かける */
async function rkTelAsk(ev, a){
  if(ev) ev.preventDefault();
  const href=a.getAttribute('href')||''; if(!/^tel:/.test(href)) return;
  const x=rkViewId?rkFind(rkViewId):null;
  if(!await appConfirm((x?'「'+rkName(x)+'」\n':'')+(a.dataset.num||href.slice(4))+' に電話をかけますか？','📞 かける','やめる')) return;
  rkGoTel(href);
}
function rkGoTel(href){ const a=document.createElement('a'); a.href=href; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); }
function rkSetCall(v){
  rk.call=['on','ask','off'].includes(v)?v:'on'; rkSave();
  document.querySelectorAll('#rkCallSet [data-call]').forEach(b=>b.classList.toggle('on', b.dataset.call===rk.call));
  toast(rk.call==='off'?'電話は「かけない」にしました（番号を押しても かかりません）':rk.call==='ask'?'電話は「かける前に聞く」にしました':'電話は「かけられる」にしました', 3000);
  if(rkViewId && isDlgOpen('rkViewOverlay')) rkView(rkViewId);
}
function rkFav(id){ const x=rkFind(id); if(!x) return; x.fav=!x.fav; x.updated=today(); x.ts=Date.now(); rkSave(); rkRender(); rkTRowRe(id); if(isDlgOpen('rkViewOverlay')) rkView(id); }
async function rkViewColor(id){
  const x=rkFind(id); if(!x) return;
  const k=await rkPickColor('🎨 '+rkName(x)+' の色', x.color); if(k===null || !rkFind(id)) return;
  x.color=k; rkCGrpSync(x); rkSave(); rkRender(); rkTRowRe(id); if(isDlgOpen('rkViewOverlay')) rkView(id);
}
async function rkRemove(id){
  const x=rkFind(id); if(!x) return;
  if(!await appConfirm('「'+rkName(x)+'」を この連絡帳から消しますか？\n（スマホの連絡先は消えません）','消す','やめる')) return;
  rkDrop(x);
  rkSave(); rkCloseView(); rkRender(); toast('消しました');
}
function rkDrop(x){
  rk.items=rk.items.filter(i=>i!==x); if(x.photo){ rkPicDel(x.id); delete rkPics[x.id]; }
  if(rkT){ const k=rkT.rows.indexOf(x); if(k>=0){ rkT.rows.splice(k,1); if(k<rkT.shown) rkT.shown--; } else rkT.nNew=Math.max(0,rkT.nNew-1);
    rkT.undo=rkT.undo.filter(u=>u.id!==x.id); rkTRowDel(x.id); rkTInfo(); }
}
function rkShareText(x){
  return [rkName(x)+(rkYomi(x)?'（'+rkYomi(x)+'）':''), [x.org,x.dept,x.title].filter(Boolean).join(' '),
    ...x.tels.map(t=>tName(TEL_T,t)+' '+t.v), ...x.mails.map(m=>m.v), ...x.adrs.map(a=>[a.zip?'〒'+a.zip:'', rkAdrText(a)].filter(Boolean).join(' '))].filter(s=>String(s).trim()).join('\n');
}
function rkShare(id){
  const x=rkFind(id); if(!x) return; const t=rkShareText(x);
  if(navigator.share) navigator.share({text:t}).catch(()=>{});
  else if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast('コピーしました。LINE などに貼って送れます'),()=>toast(t));
  else toast(t);
}
function rkDownload(name, data, type){
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([data],{type})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
const rkStamp=()=>today().replace(/-/g,'');
async function rkOneVcf(id){
  const x=rkFind(id); if(!x) return;
  const v=rkVcard(x, {pic:x.photo?await rkPic(x.id):null, noteCf:rk.noteCf})+'\r\n', name='contact-'+rkStamp()+'.vcf';
  try{ const file=new File([v], name, {type:'text/vcard'}); if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:rkName(x)}); return; } }catch(e){ if(e && e.name==='AbortError') return; }
  rkDownload(name, v, 'text/vcard;charset=utf-8');
  toast('連絡先のファイル（.vcf）を作りました。開くとスマホの連絡先に入れられます', 4000);
}

/* ── 入れる・直す ── */
function rkEdit(id){
  const x=id?rkFind(id):null; if(id && !x) return;
  rkEd=JSON.parse(JSON.stringify(x||rkCleanItem({})));
  rkEd._id=id||null; rkEd._pic=undefined; rkEd._fam0=rkEd.fam; rkEd._giv0=rkEd.giv;
  rkEd.adrs.forEach(a=>{ a._txt=rkAdrText(a); });
  if(!id && rkGrpIsName(rkGrp)) rkEd.groups=[rkGrp];   // グループで絞っていたら、そのグループに
  if(!id && rkGrp==='★') rkEd.fav=true;
  if(!id && rkCol && rkCol!=='-') rkEd.color=rkCol;   // 色で絞っていたら、その色に
  if(!rkEd.tels.length) rkEd.tels.push({t:'cell',l:'',v:'',p:false});
  $('rkEdHdr').textContent=id?'📇 直す':'📇 新しく入れる';
  rkEdRender();
  if(!isDlgOpen('rkEdOverlay')) openDlg('rkEdOverlay', ()=>{ rkEd=null; });
  $('rkEdBody').scrollTop=0;
  rkEdPv();
}
function rkEdRender(){
  const e=rkEd; if(!e) return;
  rkCP={c:e.color, last:e.color||rk.pc||'red', el:'rkECol', set:k=>{ if(rkEd) rkEd.color=k; }};   // 🎨 色分け（色と背景）
  const f=(k,l,ph,attrs)=>`<label class="rk-f">${l}<input id="rkE_${k}" value="${esc(e[k])}" placeholder="${esc(ph||'')}" maxlength="${LIM[k]||80}" ${attrs||''}></label>`;
  const sel=(T,k,i,it)=>`<select data-k="${k}" data-i="${i}" onchange="RK.edType(this)" aria-label="種類">${T.map(([v,l])=>`<option value="${v}"${!it.l&&it.t===v?' selected':''}>${l}</option>`).join('')}${it.l?`<option value="=" selected>${esc(it.l)}</option>`:''}<option value="+">（名前を付ける…）</option></select>`;
  const del=(k,i)=>`<button type="button" class="x" onclick="RK.edDel('${k}',${i})" aria-label="消す">✕</button>`;
  const tels=e.tels.map((t,i)=>`<div class="rk-line">${sel(TEL_T,'tels',i,t)}<input type="tel" data-k="tels" data-i="${i}" value="${esc(t.v)}" placeholder="090-1234-5678" maxlength="40">${del('tels',i)}</div>`).join('');
  const mails=e.mails.map((m,i)=>`<div class="rk-line">${sel(MAIL_T,'mails',i,m)}<input type="email" data-k="mails" data-i="${i}" value="${esc(m.v)}" placeholder="taro@example.jp" maxlength="120">${del('mails',i)}</div>`).join('');
  const adrs=e.adrs.map((a,i)=>`<div class="rk-adr"><div class="rk-line">${sel(ADR_T,'adrs',i,a)}<input class="zip" data-k="adrs" data-i="${i}" data-f="zip" value="${esc(a.zip)}" placeholder="〒" inputmode="numeric" maxlength="12">${del('adrs',i)}</div>
    <div class="rk-line"><input data-k="adrs" data-i="${i}" data-f="_txt" value="${esc(a._txt!=null?a._txt:rkAdrText(a))}" placeholder="例：東京都千代田区千代田1-1" maxlength="300"></div></div>`).join('');
  const urls=e.urls.map((u,i)=>`<div class="rk-line"><input type="url" data-k="urls" data-i="${i}" value="${esc(u)}" placeholder="https://" maxlength="300">${del('urls',i)}</div>`).join('');
  const groups=rk.groups.map(g=>`<button type="button" class="${e.groups.includes(g.n)?'on':''}" data-g="${esc(g.n)}" onclick="this.classList.toggle('on')">${esc((g.ic?g.ic+' ':'')+g.n)}</button>`).join('')
    +`<button type="button" onclick="RK.edNewGroup()">＋ グループを作る</button>`;
  const cfs=rk.fields.map(fl=>fl.ty==='pick'
    ? `<div class="rk-f">${esc(fl.n)}<div class="rk-tagrow">${fl.op.map((o,j)=>`<button type="button" class="${e.cf[fl.id]===o?'on':''}" onclick="RK.edPick('${fl.id}',${j})">${esc(o)}</button>`).join('')}</div></div>`
    : `<label class="rk-f">${esc(fl.n)}<input data-cf="${fl.id}" value="${esc(e.cf[fl.id]||'')}" maxlength="200"></label>`).join('');
  const bd=/^(\d{4}|-)-(\d\d)-(\d\d)$/.exec(e.bday||'');
  $('rkEdBody').innerHTML=`
    <div class="rk-edtop"><div class="rk-pv" id="rkPv" onclick="RK.edPhoto()" role="button" aria-label="写真">📷<span>写真</span></div>
      <div class="grow"><div class="rk-2">${f('fam','姓','山田')}${f('giv','名','太郎')}</div><div class="rk-2">${f('famK','せい（よみ）','やまだ')}${f('givK','めい（よみ）','たろう')}</div><button type="button" class="rk-link rk-yfill" onclick="RK.edYomi()">📝 名前から よみを入れる</button></div></div>
    <div class="rk-2">${f('org','会社','')}${f('dept','部署','')}</div>
    <div class="rk-2">${f('title','役職','')}${f('nick','ニックネーム','')}</div>
    <div class="rk-sec">📞 電話</div>${tels}<button type="button" class="rk-addline" onclick="RK.edAdd('tels')">＋ 電話を足す</button>
    <div class="rk-sec">✉ メール</div>${mails}<button type="button" class="rk-addline" onclick="RK.edAdd('mails')">＋ メールを足す</button>
    <div class="rk-sec">🏠 住所</div>${adrs}<button type="button" class="rk-addline" onclick="RK.edAdd('adrs')">＋ 住所を足す</button>
    <div class="rk-sec">🎂 誕生日</div><div class="rk-line"><input type="date" id="rkE_bday" value="${bd?(bd[1]==='-'?'2000':bd[1])+'-'+bd[2]+'-'+bd[3]:''}" aria-label="誕生日"><label class="rk-chk" style="margin:0;flex:none"><input type="checkbox" id="rkE_noyear" ${bd&&bd[1]==='-'?'checked':''}> 年はわからない</label></div>
    <div class="rk-sec">🏷 グループ</div><div class="rk-tagrow" id="rkEGroups">${groups}</div>
    <div class="rk-sec">🎨 色分け</div><div class="rk-cp" id="rkECol">${rkCPHtml()}</div>
    ${rk.fields.length?`<div class="rk-sec">🧩 自分の項目</div>${cfs}`:''}
    <button type="button" class="rk-link" onclick="RK.custom()">🧩 グループ・自分の項目・色の名前を作る・直す</button>
    <div class="rk-sec">🌐 サイト</div>${urls}<button type="button" class="rk-addline" onclick="RK.edAdd('urls')">＋ サイトを足す</button>
    <label class="rk-f">メモ<textarea id="rkE_note" maxlength="3000">${esc(e.note)}</textarea></label>
    <label class="rk-chk"><input type="checkbox" id="rkE_fav" ${e.fav?'checked':''}> ★ よく使う</label>
    <button class="rk-btn" onclick="RK.edSave()">保存する</button>
    <button class="rk-btn sub" onclick="RK.closeEd()">やめる</button>
    ${e.raw.length?`<div class="rk-note">スマホの項目のまま持っているもの ${e.raw.length}件（ここには出ませんが、書き出すとそのまま戻ります）</div>`:''}`;
}
function rkEdSync(){
  const e=rkEd; if(!e || !$('rkEdBody')) return;
  for(const k of ['fam','giv','famK','givK','org','dept','title','nick']){ const el=$('rkE_'+k); if(el) e[k]=el.value; }
  const nt=$('rkE_note'); if(nt) e.note=nt.value;
  const fv=$('rkE_fav'); if(fv) e.fav=fv.checked;
  document.querySelectorAll('#rkEdBody input[data-k]').forEach(inp=>{ const a=e[inp.dataset.k], i=+inp.dataset.i; if(!a || a[i]===undefined) return;
    if(inp.dataset.k==='urls') a[i]=inp.value; else a[i][inp.dataset.f||'v']=inp.value; });
  document.querySelectorAll('#rkEdBody input[data-cf]').forEach(inp=>{ e.cf[inp.dataset.cf]=inp.value; });
  const bd=$('rkE_bday'), ny=$('rkE_noyear');
  if(bd){ const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(bd.value); e.bday=m?((ny && ny.checked)?'--'+m[2]+'-'+m[3]:bd.value):''; }
  const gr=$('rkEGroups'); if(gr) e.groups=[...gr.querySelectorAll('button.on')].map(b=>b.dataset.g).filter(Boolean);
}
function rkEdRe(){ const b=$('rkEdBody'), y=b?b.scrollTop:0; rkEdRender(); if(b) b.scrollTop=y; rkEdPv(); }
async function rkEdType(s){
  rkEdSync(); const it=rkEd[s.dataset.k][+s.dataset.i]; if(!it) return;
  if(s.value==='+'){ const l=line(await appPrompt('この'+(s.dataset.k==='tels'?'電話':s.dataset.k==='mails'?'メール':'住所')+'の名前（例：実家・妻の携帯・会社の直通）', it.l||''),20); if(l){ it.l=l; it.t='other'; } rkEdRe(); return; }
  if(s.value==='=') return;
  it.t=s.value; it.l='';
}
function rkEdAdd(k){
  rkEdSync(); const e=rkEd;
  if(k==='tels') e.tels.push({t:e.tels.some(t=>t.t==='cell')?'home':'cell', l:'', v:'', p:false});
  else if(k==='mails') e.mails.push({t:'home', l:'', v:'', p:false});
  else if(k==='adrs') e.adrs.push({t:'home', l:'', zip:'', _txt:'', pob:'', ext:'', street:'', city:'', region:'', country:'', p:false});
  else e.urls.push('');
  rkEdRe();
  const ins=document.querySelectorAll(`#rkEdBody input[data-k="${k}"]`); const last=ins[ins.length-1]; if(last){ last.scrollIntoView({block:'center'}); last.focus(); }
}
function rkEdDel(k,i){ rkEdSync(); rkEd[k].splice(i,1); rkEdRe(); }
function rkEdCol(k){ if(!rkEd) return; rkEd.color=ckOk(k)?k:''; if(rkCP && rkCP.el==='rkECol'){ rkCP.c=rkEd.color; if(rkEd.color) rkCP.last=rkEd.color; rkCPRe(); } }
function rkEdPick(fid, j){ rkEdSync(); const f=rk.fields.find(x=>x.id===fid); if(!f) return; const v=f.op[j]; rkEd.cf[fid]=rkEd.cf[fid]===v?'':v; rkEdRe(); }
async function rkEdNewGroup(){
  rkEdSync(); const n=line(await appPrompt('グループの名前（例：家族・町内会・野球部）',''),20); if(!n) return;
  if(!rk.groups.some(g=>g.n===n)){ rk.groups.push({n, ic:''}); rkSave(); }
  if(!rkEd.groups.includes(n)) rkEd.groups.push(n);
  rkEdRe();
}
async function rkEdPv(){
  const pv=$('rkPv'); if(!pv || !rkEd) return;
  let d=rkEd._pic; if(d===undefined) d=(rkEd._id && rkEd.photo) ? await rkPic(rkEd._id) : null;
  if(!rkEd || $('rkPv')!==pv) return;
  pv.classList.toggle('has', !!d); pv.style.backgroundImage=d?`url("${d}")`:''; pv.innerHTML=d?'':'📷<span>写真</span>';
}
async function rkEdPhoto(){
  const has=rkEd && (rkEd._pic || (rkEd._pic===undefined && rkEd.photo));
  const r=await rkAsk('📷 写真', '', ['📷 カメラで撮る','🖼 写真から選ぶ','🙂 アイコンからえらぶ（人・会社）'].concat(has?['写真を外す']:[]).concat(['やめる']));
  if(r===0) $('rkCamIn').click(); else if(r===1) $('rkPicIn').click();
  else if(r===2){ const id=await rkIconPick(); if(!id || !rkEd) return; const d=await rkIconPhoto(id); if(!d){ toast('アイコンを入れられませんでした'); return; } if(!rkEd) return; rkEd._pic=d; rkEdPv(); toast('アイコンを入れました（保存すると 写真になります）'); }
  else if(has && r===3){ rkEd._pic=null; rkEdPv(); }
}
async function rkEdPicked(inp){
  const fl=inp.files && inp.files[0]; inp.value=''; if(!fl || !rkEd) return;
  try{ const d=await rkFilePic(fl); if(d){ rkEd._pic=d; rkEdPv(); } else toast('写真を読めませんでした'); }catch(_){ toast('写真を読めませんでした'); }
}
async function rkEdSave(){
  rkEdSync(); const e=rkEd; if(!e) return;
  e.adrs=e.adrs.map(a=>{ const t=String(a._txt==null?'':a._txt).trim(); return t!==rkAdrText(a).trim() ? Object.assign({}, a, {street:t, region:'', city:'', ext:''}) : a; });
  e.tels=e.tels.filter(t=>String(t.v).trim()); e.mails=e.mails.filter(m=>String(m.v).trim()); e.urls=e.urls.filter(u=>String(u).trim());
  const c0=rkCleanItem(e);
  if(!rkHasAny(c0)){ toast('名前か電話番号を入れてください'); const n=$('rkE_fam'); if(n) n.focus(); return; }
  const bad=c0.mails.find(m=>!rkMailOk(m.v)); if(bad){ toast('メールの形が正しくないようです：'+bad.v, 3500); return; }
  if(e.fam!==e._fam0 || e.giv!==e._giv0) e.fn='';
  let x=e._id ? rkFind(e._id) : null;
  const c=rkCleanItem(Object.assign({}, e, {id:x?x.id:uid(), photo:x?x.photo:false, added:x?x.added:today(), updated:today(), ts:Date.now()}));
  if(x) Object.assign(x, c);
  else {
    const same=rkMatch(c, rk.items);
    if(same){
      const r=await rkAsk('📇 連絡帳', '「'+rkName(same)+'」がもう入っています（同じ電話・メール・名前）。\nいっしょにしますか？', ['いっしょにする（足りない所を足す）','別の人として入れる','やめる']);
      if(r!==0 && r!==1) return;
      if(r===0){ rkMergeInto(same, c); x=same; }
    }
    if(!x){ rk.items.push(c); x=c; }
  }
  if(e._pic!==undefined){
    if(e._pic){ try{ await rkPicPut(x.id, e._pic); rkPics[x.id]=e._pic; x.photo=true; }catch(_){ toast('写真を入れられませんでした（端末の空きを見てください）'); } }
    else { x.photo=false; rkPicDel(x.id); delete rkPics[x.id]; }
  }
  rkCGrpSync(x); rkSyncGroups();
  if(!rkSave()) return;
  const id=x.id; rkCloseEd(); rkRender(); rkFlash(id); rkTRowRe(id);
  if(isDlgOpen('rkViewOverlay')) rkView(id);
  if(rkSo && isDlgOpen('rkSortOverlay')) rkSoRender();
  toast('保存しました');
}

/* ── まとめて選ぶ ── */
function rkSelStart(){ rkSel=new Set(); rkRender(); }
function rkSelEnd(){ rkSel=null; rkRender(); }
function rkSelAll(){ if(!rkSel) return; rkVisible().forEach(x=>rkSel.add(x.id)); rkRender(); }
async function rkSelGroup(){
  if(!rkSel || !rkSel.size){ toast('先に人を押して えらんでください'); return; }
  const ids=[...rkSel], xs=ids.map(rkFind).filter(Boolean);
  const opts=rk.groups.map(g=>{ const all=xs.every(x=>x.groups.includes(g.n)); return [g.n, all]; });
  const r=await rkAsk('🏷 グループ', 'えらんだ '+xs.length+'人を…', opts.map(([n,all])=>all?'「'+n+'」から外す':'「'+n+'」に入れる').concat(['＋ 新しいグループを作って入れる','やめる']));
  if(r<0 || r===opts.length+1) return;
  let n, out=false;
  if(r===opts.length){ n=line(await appPrompt('グループの名前（例：家族・町内会・野球部）',''),20); if(!n) return; if(!rk.groups.some(g=>g.n===n)) rk.groups.push({n, ic:''}); }
  else { n=opts[r][0]; out=opts[r][1]; }
  xs.forEach(x=>{ const had=x.groups.includes(n); if(out && had) x.groups=x.groups.filter(g=>g!==n); else if(!out && !had) x.groups.push(n); else return; x.updated=today(); x.ts=Date.now(); });
  rkSave(); rkRender(); toast(out?'「'+n+'」から外しました':'「'+n+'」に入れました（'+xs.length+'人）');
}
async function rkSelDel(){
  if(!rkSel || !rkSel.size){ toast('先に人を押して えらんでください'); return; }
  const n=rkSel.size;
  if(!await appConfirm('えらんだ '+n+'人を この連絡帳から消しますか？\n（スマホの連絡先は消えません）','消す','やめる')) return;
  rk.items.filter(x=>rkSel.has(x.id) && x.photo).forEach(x=>{ rkPicDel(x.id); delete rkPics[x.id]; });
  rk.items=rk.items.filter(x=>!rkSel.has(x.id)); rkSel=null; rkSave(); rkRender(); toast(n+'人 消しました');
}
async function rkSelColor(){
  if(!rkSel || !rkSel.size){ toast('先に人を押して えらんでください'); return; }
  const xs=[...rkSel].map(rkFind).filter(Boolean);
  const k=await rkPickColor('🎨 えらんだ '+xs.length+'人の色', ''); if(k===null) return;
  xs.forEach(x=>{ x.color=k; rkCGrpSync(x); });
  rkSave(); rkRender(); toast(k?'「'+colFullD(k)+'」にしました（'+xs.length+'人）':'色を外しました（'+xs.length+'人）');
}

/* ── 🎨 色分け（v544）：色をえらんで、人を押すと その色。もう一度押すと外れる ──
   色は この連絡帳の中の整理なので、「直した日」「前に書き出したあとで直した人」には入れない（スマホで同じ人が増えないように） */
/* ── 🎨 色と背景を えらぶ所（v552。直す画面・色をえらぶ窓）──
   上に 名前を付けた色（No. 順）、その下に 24色と 背景（無地・ストライプ・水玉・グラデーション・チェック・波）。窓では 名前の色は 押すと すぐ決まる */
let rkCP=null;   // {c:いまの色（''＝なし）, last:前にえらんだ色, el:入れ物の id, set:えらんだときに呼ぶ, dlg:窓のとき}
function rkCPHtml(){
  if(!rkCP) return '';
  const c=rkCP.c, [bc,bq]=ckSplit(c||rkCP.last||'red'), named=rkCP.nonamed ? [] : cOrd();
  return `<div class="rk-cpnow">${c?dotH(c,true)+`<b>${esc(colFullD(c))}</b>`:'<b>色なし</b>'}${(!rkCP.dlg && c)?'<button type="button" class="rk-cpoff" onclick="RK.cpPick(\'\')">✕ 色を外す</button>':''}</div>`
    +(named.length?`<div class="rk-cpt">名前を付けた色</div><div class="rk-pal lab rk-cpn">${named.map(k=>`<button type="button" class="rk-sw${ptCls(k)}${c===k?' on':''}" data-c="${k}" style="${swSt(k)}" onclick="RK.cpPick('${k}',1)"><span>${esc(colLabelD(k))}</span></button>`).join('')}</div>`:'')
    +`<div class="rk-cpt">色</div><div class="rk-pal rk-cpb">${PAL.map(([b])=>{ const kk=ckMake(b,bq); return `<button type="button" class="rk-sw${ptCls(kk)}${(c && bc===b)?' on':''}" data-b="${b}" data-c="${kk}" style="${swSt(kk)}" onclick="RK.cpBase('${b}')" aria-label="${esc(colBase(kk))}" title="${esc(colBase(kk))}"></button>`; }).join('')}</div>`
    +`<div class="rk-cpt">背景</div>${rkPatsHtml(c?bq:null, bc, 'RK.cpPat')}`;
}
/* 背景の 6つ（いまの色で 見本を出す。on はえらんでいる背景・null は なし） */
function rkPatsHtml(on, bc, fn, id){
  return `<div class="rk-pats"${id?` id="${id}"`:''}>${PAT.map(([q,nm])=>{ const kk=ckMake(bc,q); return `<button type="button" class="${on===q?'on':''}" data-p="${q}" onclick="${fn}('${q}')" aria-label="${esc(nm)}"><i class="rk-sw${ptCls(kk)}" style="${swSt(kk)}"></i><span>${q==='gr'?'グラデー<wbr>ション':q==='st'?'スト<wbr>ライプ':esc(nm)}</span></button>`; }).join('')}</div>`;
}
function rkCPRe(){
  if(!rkCP) return; const e=$(rkCP.el); if(e) e.innerHTML=rkCPHtml();
  if(rkCP.dlg){ const ok=document.querySelector('#rkAskBody [data-r="0"]'); if(ok) ok.disabled=!rkCP.c; }   // 「この色にする」は 色をえらんでから
}
function rkCPPick(k, named){
  if(!rkCP) return;
  rkCP.c=ckOk(k)?k:''; if(rkCP.c) rkCP.last=rkCP.c;
  if(rkCP.set) rkCP.set(rkCP.c);
  if(named && rkCP.dlg){ const f=rkAskFin; if(f){ f(0); rkCloseAsk(); } return; }
  rkCPRe();
}
function rkCPBase(b){ if(rkCP) rkCPPick(ckMake(b, ckSplit(rkCP.c||rkCP.last||'')[1])); }
function rkCPPat(q){ if(rkCP) rkCPPick(ckMake(ckSplit(rkCP.c||rkCP.last||'red')[0]||'red', q)); }
/* 色をえらぶ小さな窓。えらんだ色（色なしは ''）。やめたら null。
   recolor（名前を付けた色の 色・背景を変える。v554）のときは「色なし」と 名前を付けた色を 出さない */
async function rkPickColor(hdr, cur, recolor){
  const prev=rkCP, c0=ckOk(cur)?cur:'';
  rkCP={c:c0, last:c0||rk.pc||'red', el:'rkCPBox', dlg:true, nonamed:!!recolor};
  const pr=rkAsk(hdr, recolor ? '色と背景をえらんで「この色にする」を押します。名前・No.・この色の人は そのままです。' : '',
    recolor ? ['この色にする','やめる'] : ['この色にする','色なし（外す）','やめる'], `<div class="rk-cp" id="rkCPBox">${rkCPHtml()}</div>`);
  rkCPRe();
  const r=await pr, c=rkCP?rkCP.c:'';
  rkCP=prev; if(prev) rkCPRe();
  return r===0 ? c : (r===1 && !recolor) ? '' : null;
}
function rkPaintStart(){ if(!rk.items.length) return; rkSel=null; rkPaint={c:rk.pc||'red', undo:[]}; rkRender(); }
function rkPaintEnd(){ rkPaint=null; rkSave(); rkRender(); }
function rkPaintPick(k){ if(!rkPaint) return; rkPaint.c=ckOk(k)?k:''; if(rkPaint.c){ rk.pc=rkPaint.c; rkSaveSoon(); } rkRenderAdd(); }
function rkPaintBase(b){ if(rkPaint) rkPaintPick(ckMake(b, ckSplit(rkPaint.c||rk.pc||'')[1])); }
function rkPaintPat(q){ if(rkPaint) rkPaintPick(ckMake(ckSplit(rkPaint.c||rk.pc||'red')[0]||'red', q)); }
function rkPaintTap(id){
  const x=rkFind(id); if(!x) return;
  const c=rkPaint.c, next=(c && x.color!==c) ? c : '';
  if(x.color===next) return;
  rkPaint.undo.push([id, x.color]); if(rkPaint.undo.length>300) rkPaint.undo.shift();
  x.color=next; rkCGrpSync(x); rkSaveSoon(); rkRepaint(id); rkRenderBar(); rkRenderAdd();
}
function rkPaintUndo(){
  if(!rkPaint) return; const u=rkPaint.undo.pop(); if(!u) return;
  const x=rkFind(u[0]); if(x){ x.color=u[1]; rkCGrpSync(x); rkSaveSoon(); rkRepaint(x.id); rkFlash(x.id); }
  rkRenderBar(); rkRenderAdd();
}
async function rkColName(k, back){
  if(!ckOk(k)) return;
  const v=await appPrompt('「'+colBase(k)+'」に名前を付けます（例：要連絡・年賀状・町内会）。\n名前を付けた色は 🔢 No.・並ぶ順番・自分好みの色の一覧に出ます。空にすると名前を外します', rk.colors[k]||'');
  if(v==null) return;
  const old=rk.colors[k]||'', n=line(v,12);
  if(n && n!==old){ const o=Object.keys(rk.colors).find(c=>c!==k && rk.colors[c]===n); if(o){ toast('「'+n+'」は もう「'+colBase(o)+'」の名前です（ちがう名前にしてください）', 3800); return; } }
  if(n){ rk.colors[k]=n; if(!old && rk.corder.length && !rk.corder.includes(k)) rk.corder.push(k); }   // 順番を決めていたら 新しく名前を付けた色は いちばん下に
  else { delete rk.colors[k]; rk.corder=rk.corder.filter(c=>c!==k); }
  if(rk.cgrp && n && n!==old) rkCGrpRename(old, n, k);
  rkSave(); rkRender(); if(rkT) rkTRender();
  if(back==='order') rkCOrderOpen(); else if(back) rkOpenCustom();
}
/* ＋ 色に名前を付ける：色と背景をえらんでから 名前 */
async function rkCAddName(back){
  const k=await rkPickColor('🎨 名前を付ける色（色と背景）をえらぶ', ''); if(!k) return;
  await rkColName(k, back);
}
/* 名前を付けた色を押したとき：🎨 色・背景を変える／✏ 名前を直す（v554）。名前のない色は 名前を付ける */
async function rkColEdit(k, back){
  if(!ckOk(k)) return;
  if(!rk.colors[k]) return rkColName(k, back);
  const n=rk.items.filter(x=>x.color===k).length;
  const r=await rkAsk('🎨「'+rk.colors[k]+'」', '', ['🎨 色・背景を変える','✏ 名前を直す','やめる'],
    `<div class="rk-cpnow">${dotH(k,true)}<b>${esc(colFullD(k))}</b><span class="n">${n}人</span></div><div class="rk-note" style="margin-top:0">名前・No.・この色の人は そのままで、色と背景だけを 変えられます。</div>`);
  if(r===0) return rkColRecolor(k, back);
  if(r===1) return rkColName(k, back);
}
/* 🎨 名前を付けた色の 色・背景を変える（v554）：名前・No.・その色の人は そのまま、色と背景だけ 付けかえる。
   えらんだ色に ほかの名前があれば 入れかえる。名前のない その色の人がいれば、その人たちも この名前に まとめる */
async function rkColRecolor(k, back){
  const nm=rk.colors[k]; if(!ckOk(k) || !nm) return;
  const k2=await rkPickColor('🎨「'+nm+'」の 色と背景をえらぶ', k, true);
  if(!ckOk(k2) || k2===k) return;
  const cnt=c=>rk.items.filter(x=>x.color===c).length, n1=cnt(k), n2=cnt(k2), nm2=rk.colors[k2]||'';
  if(nm2){
    if(await rkAsk('🎨 色を 入れかえますか？', '「'+colBase(k2)+'」は もう「'+nm2+'」の色です。「'+nm+'」と「'+nm2+'」の 色を 入れかえます（名前・No.・人は そのまま）。', ['入れかえる','やめる'])!==0) return;
  } else if(n2){
    if(await rkAsk('🎨 まとめますか？', '名前のない「'+colBase(k2)+'」の人が '+n2+'人 います。その人たちも「'+nm+'」に なります。', ['まとめる','やめる'])!==0) return;
  }
  const sw=c=>c===k ? k2 : (nm2 && c===k2) ? k : c;   // 付けかえ（入れかえのときは 相手も）
  const ord=cOrd(), was=rk.corder.length;               // No. は 名前に付いたまま（色の順で決まっていたときも 前の No. のまま）
  const c0=rk.colors; rk.colors={}; for(const c of Object.keys(c0)) rk.colors[sw(c)]=c0[c];
  rk.corder=ord.map(sw);
  if(!was && !cCust()) rk.corder=[];                     // 色の順と同じなら 決めていないまま（あとで名前を付けた色も 色の順に入る）
  rk.items.forEach(x=>{ if(x.color) x.color=sw(x.color); });
  if(rk.pc) rk.pc=sw(rk.pc);
  if(rkPaint){ if(rkPaint.c) rkPaint.c=sw(rkPaint.c); rkPaint.undo.forEach(u=>{ if(u[1]) u[1]=sw(u[1]); }); }
  if(rkCol && rkCol!=='-') rkCol=sw(rkCol);
  if(rk.cgrp) rk.items.forEach(x=>{ if(x.color===k || x.color===k2) rkCGrpSync(x); });
  rkSave(); rkRender(); if(rkT) rkTRender();
  toast(nm2 ? '「'+nm+'」と「'+nm2+'」の 色を 入れかえました' : '「'+nm+'」を '+colBase(k2)+' に しました（'+(n1+n2)+'人）', 3200);
  if(back==='order') rkCOrderOpen(); else if(back) rkOpenCustom();
}

/* ── 🔢 色の No.・並ぶ順番（v549）：色に No. を振る（↑↓・No. をえらぶ）。「🎨 色」の一覧は 上から／下から ── */
let rkCBack=false;
function rkCRows(){
  const cc={}; rk.items.forEach(x=>{ if(x.color) cc[x.color]=(cc[x.color]||0)+1; });
  const o=cOrd();
  if(!o.length) return '<div class="rk-note" id="rkCNone">名前を付けた色が まだありません。下の「＋ 色に名前を付ける」で 色と背景をえらんで 名前を付けると、ここに出て No. を振れます。</div>';
  return o.map((k,i)=>`<div class="rk-co" data-c="${k}"><button type="button" class="no" onclick="RK.cNoPick('${k}')" title="No. をえらぶ">No.${i+1}</button>`
      +`<button type="button" class="nm" onclick="RK.colEdit('${k}','order')" title="名前・色を直す">${dotH(k,true)}<span>${esc(rk.colors[k])}<small>${esc(colBase(k))}</small></span><em>${cc[k]||0}人</em></button>`
      +`<button type="button" class="mv" onclick="RK.cMove('${k}',-1)" aria-label="上へ" ${i?'':'disabled'}>↑</button><button type="button" class="mv" onclick="RK.cMove('${k}',1)" aria-label="下へ" ${i<o.length-1?'':'disabled'}>↓</button></div>`).join('');
}
const cCust=()=>cOrd().join()!==cNamed().sort((a,b)=>ckRank0(a)-ckRank0(b)).join();   // No. を はじめの順から 変えているか
function rkCOrderOpen(back){
  const deeper=back===true && !rkCBack && isDlgOpen('rkScrOverlay');   // 🧩 自分好みにする から開いた
  if(back!==undefined) rkCBack=!!back;
  rkScr('🔢 色の No.・並ぶ順番', `<div class="rk-note" style="margin-top:0">名前を付けた色に No. を振ります。No.1 から順に、「🎨 色」の一覧・上の色の札・色をえらぶ所に並びます（名前のない色は そのあとに 色の順）。<b>↑↓</b> で動かすか、<b>No.</b> を押して 番号をえらびます。名前を押すと 直せます。</div>
    <div class="rk-cord" id="rkCOrd">${rkCRows()}</div>
    <button class="rk-btn sub" onclick="RK.cAddName('order')">＋ 色に名前を付ける（色と背景をえらぶ）</button>
    <div class="rk-sec">「🎨 色」の一覧の並び</div>
    <div class="rk-tagrow" id="rkCDir">${[['up','⬇ 上から（No.1 が いちばん上）'],['down','⬆ 下から（No.1 が いちばん下）']].map(([v,l])=>`<button type="button" data-d="${v}" class="${rk.cdir===v?'on':''}" onclick="RK.cDir('${v}')">${l}</button>`).join('')}</div>
    <label class="rk-chk"><input type="checkbox" id="rkCNo" ${rk.cno?'checked':''} onchange="RK.cNoShow(this.checked)"> No. を 色の札・見出し・表にも出す（例：No.1 要連絡）</label>
    <button class="rk-btn sub" id="rkCReset" onclick="RK.cReset()" ${cCust()?'':'disabled'}>No. を はじめの順（色の順）に戻す</button>
    <button class="rk-btn" onclick="RK.cDone()">できあがり</button>`);
  if(deeper) rkScrDeeper(()=>{ rkCBack=false; rkOpenCustom(); });   // 端末の「戻る」で 🧩 に戻る
}
/* No. を変えたあと：保存して 一覧・表・この画面を出しなおす（動かした色は 少し光らせる） */
/* えらんでいる並べ方の右の 小さいボタン：⇅ 上から／下から・🔢 色の No.・グループの順番（v550） */
const VDIR_TIP={kana:['あ→ん（上から）','ん→あ（下から）'], group:['No.1 のグループが上（上から）','No.1 のグループが下（下から）'], org:['あ→ん（上から）','ん→あ（下から）'],
  color:['No.1 の色が上（上から）','No.1 の色が下（下から）'], new:['新しい順（上から）','古い順（下から）']};
function rkMiniHtml(k){
  const d=vDir(k)==='down', tip=VDIR_TIP[k][d?1:0];
  return `<button type="button" class="rk-mini${d?' on':''}" data-vd="${k}" onclick="RK.vDir('${k}')" title="${esc(tip)}・押すと 上下を入れかえ" aria-label="並びの上下を入れかえる（いま ${esc(tip)}）">⇅</button>`
    +(k==='color'?`<button type="button" class="rk-mini" data-ord="color" onclick="RK.cOrder()" title="色の No.・順番" aria-label="色の No.・順番">🔢</button>`:'')
    +(k==='group' && rk.groups.length>1?`<button type="button" class="rk-mini" data-ord="group" onclick="RK.gOrder()" title="グループの順番" aria-label="グループの順番">🔢</button>`:'');
}
function rkSetVDir(k){
  if(!VIEW_KEYS.includes(k)) return;
  if(k==='color') rk.cdir=rk.cdir==='down'?'up':'down';
  else { rk.vdir=Object.assign({}, rk.vdir); if(vDir(k)==='down') delete rk.vdir[k]; else rk.vdir[k]='down'; }
  rkSave(); rkRender(); if($('rkList')) $('rkList').scrollTop=0;
  document.querySelectorAll('#rkCDir [data-d]').forEach(b=>b.classList.toggle('on', b.dataset.d===rk.cdir));
  document.querySelectorAll('#rkGDir [data-d]').forEach(b=>b.classList.toggle('on', b.dataset.d===vDir('group')));
  toast(VDIR_TIP[k][vDir(k)==='down'?1:0]+'に しました');
}
/* 並べ方のボタンの順番（🧩 自分好みにする） */
function rkVMove(k, d){ const o=vOrd().slice(), i=o.indexOf(k), j=i+d; if(i<0 || j<0 || j>=o.length) return; [o[i],o[j]]=[o[j],o[i]]; rk.vorder=o; rkSave(); rkRender(); rkOpenCustom(); }
/* 🔢 グループの順番（No.1 から 上の札・「🏷 グループ」の一覧・グループをえらぶ所に並ぶ） */
function rkGRows(){
  const cnt={}; rk.items.forEach(x=>x.groups.forEach(g=>{ cnt[g]=(cnt[g]||0)+1; }));
  const n=rk.groups.length;
  return rk.groups.map((g,i)=>`<div class="rk-co" data-g="${i}"><button type="button" class="no" onclick="RK.gNoPick(${i})" title="No. をえらぶ">No.${i+1}</button>`
    +`<span class="nm"><span>${esc((g.ic?g.ic+' ':'')+g.n)}</span><em>${cnt[g.n]||0}人</em></span>`
    +`<button type="button" class="mv" onclick="RK.gMv(${i},-1)" aria-label="上へ" ${i?'':'disabled'}>↑</button><button type="button" class="mv" onclick="RK.gMv(${i},1)" aria-label="下へ" ${i<n-1?'':'disabled'}>↓</button></div>`).join('');
}
function rkGOrderOpen(){
  if(!rk.groups.length){ toast('グループが まだありません（⚙ → 🧩 自分好みにする で作れます）'); return; }
  rkScr('🔢 グループの順番', `<div class="rk-note" style="margin-top:0">グループに No. を振ります。No.1 から順に、「🏷 グループ」の一覧・上の札・グループをえらぶ所に並びます。<b>↑↓</b> で動かすか、<b>No.</b> を押して 番号をえらびます。</div>
    <div class="rk-cord" id="rkGOrd">${rkGRows()}</div>
    <div class="rk-sec">「🏷 グループ」の一覧の並び</div>
    <div class="rk-tagrow" id="rkGDir">${[['up','⬇ 上から（No.1 が いちばん上）'],['down','⬆ 下から（No.1 が いちばん下）']].map(([v,l])=>`<button type="button" data-d="${v}" class="${vDir('group')===v?'on':''}" onclick="RK.gDir('${v}')">${l}</button>`).join('')}</div>
    <button class="rk-btn" onclick="RK.closeScr()">できあがり</button>`);
}
function rkGChanged(i){
  rkSave(); rkRender(); if(rkT) rkTReRender();
  const R=$('rkGOrd'); if(!R) return; R.innerHTML=rkGRows();
  const e=R.querySelector(`[data-g="${i}"]`); if(e){ e.classList.add('fl'); setTimeout(()=>e.classList.remove('fl'), 900); }
}
function rkGMv(i, d){ const j=i+d; if(!rk.groups[i] || j<0 || j>=rk.groups.length) return; const t=rk.groups[i]; rk.groups[i]=rk.groups[j]; rk.groups[j]=t; rkGChanged(j); }
async function rkGNoPick(i){
  const g=rk.groups[i]; if(!g) return;
  const html=`<div class="rk-nogrid">${rk.groups.map((h,k)=>`<button type="button" data-r="${100+k}" class="${k===i?'on':''}"><b>No.${k+1}</b></button>`).join('')}</div>`;
  const r=await rkAsk('🔢 「'+g.n+'」の No.', 'えらんだ No. に入れて、ほかのグループは ひとつずつ ずらします。', ['やめる'], html);
  if(r<100 || r-100===i || !rk.groups[r-100] || rk.groups[i]!==g) return;
  rk.groups.splice(i,1); rk.groups.splice(r-100,0,g); rkGChanged(r-100);
  toast('「'+g.n+'」を No.'+(r-99)+' にしました');
}
function rkSetGDir(v){
  rk.vdir=Object.assign({}, rk.vdir); if(v==='down') rk.vdir.group='down'; else delete rk.vdir.group;
  rkSave(); rkRender();
  document.querySelectorAll('#rkGDir [data-d]').forEach(b=>b.classList.toggle('on', b.dataset.d===vDir('group')));
}
/* 📞 電話番号の大きさ（一覧・見る画面。名前の大きさとは別に） */
function rkSetTelSize(n){ rk.telSize=[0,1,2].includes(n)?n:0; rkSave(); rkRender(); document.querySelectorAll('#rkTelSet [data-ts]').forEach(b=>b.classList.toggle('on', +b.dataset.ts===rk.telSize)); }
/* 🎨→🏷 色の名前を グループにも（rk.cgrp）：色の名前のグループに入れ、ほかの色の名前のグループからは出す（直したら true） */
function rkCGrpSync(x){
  if(!rk || !rk.cgrp || !x || !Array.isArray(x.groups)) return false;
  const names=cNamed().map(k=>rk.colors[k]);
  const want=(x.color && rk.colors[x.color]) || '', before=x.groups.join('\n');
  x.groups=x.groups.filter(g=>g===want || !names.includes(g));
  if(want && !x.groups.includes(want)) x.groups.push(want);
  if(x.groups.join('\n')===before) return false;
  if(want && !rk.groups.some(g=>g.n===want)) rk.groups.push({n:want, ic:'🎨'});
  x.updated=today(); x.ts=Date.now();
  return true;
}
/* 色の名前を変えたら、前の名前のグループも 新しい名前に */
function rkCGrpRename(old, n, k){
  if(old && old!==n){
    const g=rk.groups.find(h=>h.n===old);
    if(g){ if(rk.groups.some(h=>h.n===n)) rk.groups=rk.groups.filter(h=>h!==g); else g.n=n; }
    rk.items.forEach(x=>{ if(x.groups.includes(old)){ x.groups=[...new Set(x.groups.map(y=>y===old?n:y))]; x.updated=today(); x.ts=Date.now(); } });
    if(rkGrp===old) rkGrp=n;
  }
  rk.items.forEach(x=>{ if(x.color===k) rkCGrpSync(x); });
}
function rkSetCGrp(on){
  rk.cgrp=!!on; let n=0;
  if(rk.cgrp) rk.items.forEach(x=>{ if(rkCGrpSync(x)) n++; });
  rkSave(); rkRender(); if(rkT) rkTReRender();
  toast(rk.cgrp ? (n ? n+'人を 色の名前のグループに入れました' : '色を付けると その色の名前のグループにも入ります（色に名前があるときだけ）') : '色の名前を グループに入れるのを やめました（入っているグループは そのまま）', 3800);
}
/* 🙂 写真のかわりの アイコン（renraku-icons.js を 使うときに読む） */
let rkILoading=null;
function rkILoad(){
  if(window.rkIcons) return Promise.resolve(true);
  if(!rkILoading) rkILoading=new Promise(res=>{
    const sc=document.createElement('script'); sc.src=RK_BASE+'renraku-icons.js';
    sc.onload=()=>{ rkILoading=null; res(!!window.rkIcons); };
    sc.onerror=()=>{ rkILoading=null; sc.remove(); res(false); };
    document.head.appendChild(sc);
  });
  return rkILoading;
}
/* えらんだアイコンの id（やめたら ''） */
async function rkIconPick(){
  if(!await rkILoad()){ toast('アイコンを読み込めませんでした。インターネットにつながるところで、もう一度 押してください', 4500); return ''; }
  if(rkIconRes){ const r=rkIconRes; rkIconRes=null; r(''); }
  return new Promise(res=>{ rkIconRes=res; rkIconRender(true); });
}
function rkIconRender(first){
  const I=window.rkIcons; if(!I) return;
  const cat=I.cats.find(c=>c.k===rkIconCat)||I.cats[0];
  const html=`<div class="rk-tagrow" id="rkIcCats">${I.cats.map(c=>`<button type="button" data-k="${c.k}" class="${c.k===cat.k?'on':''}" onclick="RK.icCat('${c.k}')">${esc(c.n)}</button>`).join('')}</div>
    <div class="rk-icgrid" id="rkIcGrid">${cat.items.map(id=>`<button type="button" data-ic="${id}" onclick="RK.icPick('${id}')" title="${esc(I.label(id))}" aria-label="${esc(I.label(id))}">${I.svg(id,true)}</button>`).join('')}</div>
    <div class="rk-note">えらんだ アイコンは、その人の写真として入ります（スマホに戻すときも 写真として持っていけます）。あとで「写真を外す」で外せます。</div>
    <button class="rk-btn sub" onclick="RK.icPick('')">やめる</button>`;
  if(first) rkScr('🙂 アイコンをえらぶ', html, ()=>{ const r=rkIconRes; rkIconRes=null; if(r) r(''); });
  else { $('rkScrBody').innerHTML=html; }
}
function rkIconChoose(id){
  const r=rkIconRes; rkIconRes=null;
  rkCloseScr();
  if(r) r(window.rkIcons && window.rkIcons.svg(id) ? id : '');
}
/* アイコンを 写真（320×320 の JPEG）に */
async function rkIconPhoto(id){
  const svg=window.rkIcons && window.rkIcons.svg(id); if(!svg) return '';
  try{ return safeImg(await rkResizeSrc('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg), 320, 0.92)) || ''; }catch(_){ return ''; }
}

function rkCChanged(k){
  rkSave(); rkRender(); if(rkT) rkTReRender();
  const R=$('rkCOrd'); if(!R) return;
  R.innerHTML=rkCRows();
  const rs=$('rkCReset'); if(rs) rs.disabled=!cCust();
  if(k){ const e=R.querySelector(`[data-c="${k}"]`); if(e){ e.classList.add('fl'); setTimeout(()=>e.classList.remove('fl'), 900); } }
}
function rkCMove(k, d){
  const o=cOrd().slice(), i=o.indexOf(k), j=i+d; if(i<0 || j<0 || j>=o.length) return;
  [o[i],o[j]]=[o[j],o[i]]; rk.corder=o; rkCChanged(k);
}
/* No. をえらぶ：その No. に入れて、ほかの色は ひとつずつ ずらす */
async function rkCNoPick(k){
  if(!rk.colors[k]) return;
  const o=cOrd(), cur=o.indexOf(k);
  const html=`<div class="rk-nogrid">${o.map((c,i)=>`<button type="button" data-r="${100+i}" class="${i===cur?'on':''}"><b>No.${i+1}</b>${dotH(c)}</button>`).join('')}</div>`;
  const r=await rkAsk('🔢 「'+rk.colors[k]+'」の No.', 'えらんだ No. に入れて、ほかの色は ひとつずつ ずらします（● は いま その No. の色）。', ['やめる'], html);
  if(r<100 || r-100===cur || !o[r-100]) return;
  const n=o.filter(c=>c!==k); n.splice(r-100, 0, k); rk.corder=n; rkCChanged(k);
  toast('「'+rk.colors[k]+'」を No.'+(r-99)+' にしました');
}
function rkCReset(){ rk.corder=[]; rkCChanged(); toast('No. を はじめの順（色の順）に戻しました'); }
function rkSetCDir(v){
  rk.cdir=v==='down'?'down':'up'; rkSave(); rkRender(); if($('rkList')) $('rkList').scrollTop=0;
  document.querySelectorAll('#rkCDir [data-d]').forEach(b=>b.classList.toggle('on', b.dataset.d===rk.cdir));
}
function rkCNoShow(on){ rk.cno=!!on; rkSave(); rkRender(); if(rkT) rkTReRender(); const c=$('rkCNo'); if(c) c.checked=rk.cno; }
function rkCDone(){ if(rkCBack){ rkCBack=false; rkScrUpPop(); rkOpenCustom(); } else rkCloseScr(); }

/* ── 📋 表で直す（v544）：全員を表にして、マスを押すと その場で直せる ──
   名前・よみ・電話・メール・会社・住所・誕生日などは その場で入れる（Enter で下の人、Tab で右へ、Esc でやめる）。
   色・★・グループ・えらぶ項目・メモは 小さな窓で。直したら すぐ保存し、「↶ 戻す」で 1つずつ戻せる。
   電話・メール・住所が いくつもある人は、表には はじめの1つ（＋2 などと出す）。ほかは 行の番号を押して「くわしく直す」で。 */
const TCOLS=[['yomi','よみ',122],['color','🎨 色',96],['fav','★',44],['cell','携帯',136],['tel','電話',158],['mail','メール',196],['org','会社',140],['dept','部署',110],
  ['title','役職',96],['nick','ニックネーム',112],['zip','〒',92],['adr','住所',236],['bday','誕生日',106],['groups','グループ',140],['note','メモ',220]];
const RK_TCHUNK=120;
const tAllCols=()=>TCOLS.slice(0,-1).concat(rk.fields.map(f=>['cf:'+f.id, f.n, 126])).concat([TCOLS[TCOLS.length-1]]);
const tSlot=(x,c)=>c==='cell' ? x.tels.findIndex(t=>t.t==='cell') : x.tels.findIndex(t=>t.t!=='cell' && t.t!=='fax');
const tPop=c=>c==='color'||c==='fav'||c==='groups'||c==='note'||(c.startsWith('cf:') && (rk.fields.find(f=>f.id===c.slice(3))||{}).ty==='pick');
const tHead=c=>c==='name'?'名前':((tAllCols().find(a=>a[0]===c)||[])[1]||'');
/* 1人の行は、左（#・名前）と右（ほかの列）の2つに分かれている */
const rkTRows=id=>{ const f=el=>el ? [...el.children].find(r=>r.dataset.id===id)||null : null; return {l:f($('rkTL')), c:f($('rkTBody'))}; };
const rkTCellEl=(id,c)=>{ const R=rkTRows(id), row=(c==='no'||c==='name') ? R.l : R.c; return row ? [...row.children].find(e=>e.dataset.c===c)||null : null; };
const rkTLeftRows=()=>[...$('rkTL').children].filter(r=>r.dataset.id);
function rkTBday(b){ const m=/^(\d{4}|-)-(\d\d)-(\d\d)$/.exec(b||''); return m ? (m[1]==='-'?'':m[1]+'/')+(+m[2])+'/'+(+m[3]) : ''; }
/* そのマスの文字（直しはじめの文字） */
function rkTVal(x,c){
  switch(c){
    case 'name': return (x.fam||x.giv) ? (isLatin(x.fam||x.giv)?[x.giv,x.fam]:[x.fam,x.giv]).filter(Boolean).join(' ') : x.fn;
    case 'yomi': return rkYomi(x);
    case 'cell': case 'tel': { const i=tSlot(x,c); return i>=0 ? x.tels[i].v : ''; }
    case 'mail': return x.mails[0] ? x.mails[0].v : '';
    case 'zip': return x.adrs[0] ? x.adrs[0].zip : '';
    case 'adr': return x.adrs[0] ? rkAdrText(x.adrs[0]) : '';
    case 'bday': return rkTBday(x.bday);
    case 'note': return x.note;
    case 'org': case 'dept': case 'title': case 'nick': return x[c];
    default: return c.startsWith('cf:') ? (x.cf[c.slice(3)]||'') : '';
  }
}
/* そのマスに見せるもの */
function rkTCell(x,c){
  const more=n=>n>0?`<small class="mo">＋${n}</small>`:'';
  switch(c){
    case 'name': return (x.fam||x.giv||x.fn) ? esc(rkName(x)) : `<span class="ph">${esc(rkName(x))}</span>`;
    case 'color': return x.color ? `${dotH(x.color)}${esc((noP(x.color)+(rk.colors[x.color]||'')).trim())}` : '<span class="ph">－</span>';
    case 'fav': return x.fav ? '<span class="fv">★</span>' : '<span class="ph">☆</span>';
    case 'cell': return esc(rkTVal(x,c))+more(x.tels.filter(t=>t.t==='cell').length-1);
    case 'tel': { const i=tSlot(x,c), n=x.tels.filter(t=>t.t!=='cell').length; if(i<0) return more(n); const t=x.tels[i]; return `<small class="lb">${esc(tName(TEL_T,t))}</small>${esc(t.v)}`+more(n-1); }
    case 'mail': return esc(rkTVal(x,c))+more(x.mails.length-1);
    case 'adr': return esc(rkTVal(x,c))+more(x.adrs.length-1);
    case 'groups': return esc(x.groups.map(g=>(gIcon(g)?gIcon(g)+' ':'')+g).join('・'));
    case 'note': { const ls=x.note.split('\n'); return esc(ls[0])+(ls.length>1?' …':''); }
    default: return esc(rkTVal(x,c));
  }
}
const rkTRowAttr=(x,draft)=>{ const hex=draft?'':colHex(x.color); return `class="rk-tr${hex?' col':''}${draft?' draft':''}" data-id="${x.id}"${hex?` style="--rkc:${hex}"`:''}`; };
/* 長くて入りきらない字は、枠に合わせて小さくする。それでも入らなければ 2行に（v546） */
const T_FIT=new Set(['name','yomi','org','dept','title','nick','mail','adr','groups','note']);
let rkTCv=null, rkTFont='';
function rkTMeasure(t, px, bold){
  if(!rkTCv) rkTCv=document.createElement('canvas').getContext('2d');
  if(!rkTFont) rkTFont=getComputedStyle($('rkTV')||document.body).fontFamily||'sans-serif';
  rkTCv.font=(bold?'bold ':'')+px+'px '+rkTFont;
  return rkTCv.measureText(t).width;
}
/* そのマスに出す字（ものさし用。＋1 の札などは べつ） */
function rkTText(x,c){
  switch(c){
    case 'name': return rkName(x);
    case 'groups': return x.groups.map(g=>(gIcon(g)?gIcon(g)+' ':'')+g).join('・');
    case 'note': { const ls=x.note.split('\n'); return ls[0]+(ls.length>1?' …':''); }
    default: return rkTVal(x,c);
  }
}
const rkTBase=()=>rk.big?16.5:14;
/* [足す class, style] */
function rkTFit(x, c, w){
  if(!(T_FIT.has(c) || c.startsWith('cf:'))) return ['',''];
  const t=rkTText(x,c); if(!t) return ['',''];
  const extra=(c==='mail'&&x.mails.length>1)||(c==='adr'&&x.adrs.length>1) ? 26 : 0;
  const px=rkTBase(), avail=(w-18-(c==='name'&&x.color?5:0)-extra)*0.95, tw=rkTMeasure(t, px, c==='name');   // 見積もりには少しゆとりを
  if(tw<=avail || avail<20) return ['',''];
  const min1=rk.big?13.5:11.5, s1=Math.floor(px*avail/tw*2)/2;
  if(s1>=min1) return ['', `font-size:${s1}px`];
  const s2=Math.max(rk.big?12:10, Math.min(min1, Math.floor(px*avail*2*0.88/tw*2)/2));
  return [' f2', `font-size:${s2}px`];
}
function rkTCellHtml(x, c, w, cls){
  const [f,st]=rkTFit(x,c,w), h=rkTCell(x,c);
  return `<div class="rk-tc${cls||''}${f}" data-c="${esc(c)}"${st?` style="${st}"`:''}>${f?`<span class="t2">${h}</span>`:h}</div>`;
}
const rkTNameW=()=>rk.tw.name||138;
/* 左の行（番号・名前） */
function rkTRowL(x, draft, n){
  return `<div ${rkTRowAttr(x,draft)}><div class="rk-tc c-no" data-c="no" title="${draft?'この行をやめる':'くわしく直す・消す'}">${draft?'✕':n}</div>`
    +(draft&&!rkHasAny(x) ? '<div class="rk-tc c-name" data-c="name"><span class="ph">名前を入れる</span></div>' : rkTCellHtml(x,'name',rkTNameW(),' c-name'))+'</div>';
}
/* 右の行（よみ・色・電話…） */
function rkTRowC(x, draft){ return `<div ${rkTRowAttr(x,draft)}>${rkT.cols.map(([c,,w])=>rkTCellHtml(x,c,w)).join('')}</div>`; }
function rkTList(){
  const list=rkT.only ? rk.items.filter(x=>rkT.only.has(x.id)) : rkFiltered(), s=rkT.sort;   // only：よみを入れた人だけ（v548）
  if(!s.c) return rkT.q.trim() ? rkSearch(rkT.q, list) : rkSortedKana(list);
  const base=rkT.q.trim() ? rkSearch(rkT.q, list) : list;
  const key=x=>{
    if(s.c==='color'){ if(!x.color) return ''; const i=cOrd().indexOf(x.color); return String(i>=0 ? i : 1000+ckRank0(x.color)).padStart(5,'0'); }   // No. の順（名前のない色は そのあと）
    if(s.c==='fav') return x.fav ? '0' : '';
    if(s.c==='bday'){ const m=/(\d\d)-(\d\d)$/.exec(x.bday||''); return m?m[1]+m[2]:''; }
    if(s.c==='groups'){ const ix=x.groups.map(g=>rk.groups.findIndex(h=>h.n===g)).filter(i=>i>=0).sort((a,b)=>a-b)[0]; return ix==null?'':String(ix).padStart(3,'0'); }
    return rkTVal(x,s.c).trim();
  };
  if(s.c==='name' || s.c==='yomi'){ const a=rkSortedKana(base); return s.d>0 ? a : a.reverse(); }
  const ks=new Map(base.map(x=>[x, key(x)]));
  return base.slice().sort((a,b)=>{ const ka=ks.get(a), kb=ks.get(b); if(!ka!==!kb) return ka?-1:1; return (ka.localeCompare(kb,'ja',{numeric:true})*s.d) || cmpKana(a,b); });   // 入っていない人は いつも下
}
function rkTRender(){
  if(!rkT || !$('rkTV')) return;
  rkT.cols=tAllCols().filter(([c])=>!rk.thide.includes(c)).map(([c,l,w])=>[c,l,rk.tw[c]||w]);
  rkT.rows=rkTList(); rkT.shown=0; rkT.nNew=0;
  const arrow=c=>rkT.sort.c===c?(rkT.sort.d>0?' ▲':' ▼'):'', rs=c=>`<span class="rk-rs" data-rs="${esc(c)}" title="動かすと 幅が変わります（2回押すと 中身に合わせる）"></span>`;
  rkTWidths();
  $('rkTHL').innerHTML=`<div class="rk-tc c-no" data-h="" title="よみ順にもどす">#</div><div class="rk-tc c-name" data-h="name" title="押すと 名前で並べかえ">名前${arrow('name')}${rs('name')}</div>`;
  $('rkTHr').innerHTML=rkT.cols.map(([c,l])=>`<div class="rk-tc" data-h="${esc(c)}" title="押すと この列で並べかえ">${esc(l)}${arrow(c)}${rs(c)}</div>`).join('');
  $('rkTL').innerHTML=rkT.draft ? rkTRowL(rkT.draft,true,'') : '';
  $('rkTBody').innerHTML=rkT.draft ? rkTRowC(rkT.draft,true) : '';
  rkTMore(); rkTInfo();
}
/* 出したあとで 本当にはみ出していないか見る（字の幅の見積もりは 端末の字体で少しずれる）。はみ出していたら 2行に */
function rkTFixOverflow(rows){
  const over=[];
  for(const r of rows) for(const c of r.children){
    const k=c.dataset.c; if(!k || c.classList.contains('f2') || c.classList.contains('ed') || !(T_FIT.has(k) || k.startsWith('cf:'))) continue;
    if(c.scrollWidth>c.clientWidth+1) over.push(c);
  }
  const min1=rk.big?13.5:11.5;
  over.map(c=>[c, Math.min(parseFloat(getComputedStyle(c).fontSize)||min1, min1)]).forEach(([c,px])=>{
    c.classList.add('f2'); c.style.fontSize=px+'px'; c.innerHTML='<span class="t2">'+c.innerHTML+'</span>'; });
}
/* 列の幅を 画面に出す（名前の列は --nw、右の列は --tcols・--tw） */
function rkTWidths(){
  const V=$('rkTV'); if(!V || !rkT) return;
  V.style.setProperty('--nw', rkTNameW()+'px');
  V.style.setProperty('--tcols', rkT.cols.length ? rkT.cols.map(c=>c[2]+'px').join(' ') : 'none');
  V.style.setProperty('--tw', rkT.cols.reduce((s,c)=>s+c[2],0)+'px');
}
/* 幅を変えたあと：同じところを見たまま 描きなおす（字の大きさを合わせなおす） */
function rkTReRender(){
  if(!rkT) return; rkTCommit();
  const W=$('rkTWrap'), X=$('rkTX'), st=W.scrollTop, sl=X.scrollLeft, n=rkT.shown, d=rkT.draft;
  rkT.draft=null; rkTRender();
  while(rkT.shown<n && rkT.shown<rkT.rows.length) rkTMore();
  if(d){ rkT.draft=d; $('rkTL').insertAdjacentHTML('afterbegin', rkTRowL(d, true, '')); $('rkTBody').insertAdjacentHTML('afterbegin', rkTRowC(d, true)); }
  W.scrollTop=st; X.scrollLeft=sl; rkTSync();
}
/* 列の幅を決める（ふつうの幅なら 覚えたものを消す） */
function rkTSetW(c, w){
  const def=c==='name'?138:((tAllCols().find(a=>a[0]===c)||[])[2]||120);
  w=Math.max(TW_MIN, Math.min(TW_MAX, Math.round(w)));
  if(w===def) delete rk.tw[c]; else rk.tw[c]=w;
  rkSave(); rkTReRender();
}
/* 中身に合わせた幅（いちばん長い字が入る幅。せますぎ・広すぎにはしない） */
function rkTFitW(c){
  const px=rkTBase(), more=n=>n>1?26:0;
  const need=x=>{ let w=rkTMeasure(rkTText(x,c)||'', px, c==='name')+(c==='name'&&x.color?24:18);
    if(c==='mail') w+=more(x.mails.length); else if(c==='adr') w+=more(x.adrs.length);
    else if(c==='cell') w+=more(x.tels.filter(t=>t.t==='cell').length);
    else if(c==='tel'){ const i=tSlot(x,'tel'); if(i>=0) w+=rkTMeasure(tName(TEL_T,x.tels[i]),11,false)+4; w+=more(x.tels.filter(t=>t.t!=='cell').length); }
    return w; };
  let m=rkTMeasure(c==='name'?'名前':tHead(c), 12, true)+30;
  for(const x of rkT.rows) m=Math.max(m, need(x));
  return Math.min(c==='name'?300:360, Math.ceil(m));
}
/* 見出しの右の端（つまみ）を 指・マウスで動かす。2回押すと 中身に合わせる */
let rkRs=null, rkRsTap={c:'', t:0};
function rkRsDown(ev){
  const h=ev.target.closest('.rk-rs'); if(!h || !rkT) return;
  ev.preventDefault(); ev.stopPropagation(); rkTCommit();
  const c=h.dataset.rs, w0=c==='name'?rkTNameW():((rkT.cols.find(a=>a[0]===c)||[])[2]||120);
  rkRs={c, x0:ev.clientX, w0, w:w0, moved:false, id:ev.pointerId, h}; h.classList.add('on');
  try{ h.setPointerCapture(ev.pointerId); }catch(_){}
}
function rkRsMove(ev){
  if(!rkRs || ev.pointerId!==rkRs.id) return;
  ev.preventDefault();
  const dx=ev.clientX-rkRs.x0; if(Math.abs(dx)>4) rkRs.moved=true; if(!rkRs.moved) return;
  rkRs.w=Math.max(TW_MIN, Math.min(TW_MAX, Math.round(rkRs.w0+dx)));
  if(rkRs.c==='name') $('rkTV').style.setProperty('--nw', rkRs.w+'px');
  else { const col=rkT.cols.find(a=>a[0]===rkRs.c); if(col){ col[2]=rkRs.w; rkTWidths(); } }
}
function rkRsUp(ev){
  if(!rkRs || ev.pointerId!==rkRs.id) return;
  const r=rkRs; rkRs=null; r.h.classList.remove('on');
  if(r.moved){ rkRsTap={c:'', t:0}; rkTSetW(r.c, r.w); return; }
  const now=Date.now();
  if(rkRsTap.c===r.c && now-rkRsTap.t<450){ rkRsTap={c:'', t:0}; rkTSetW(r.c, rkTFitW(r.c)); toast('「'+tHead(r.c)+'」の幅を 中身に合わせました'); }
  else rkRsTap={c:r.c, t:now};
}
/* 続きの人を出す（はじめは 120人。下まで動かす・Enter で下へ・「つづきを出す」で） */
function rkTMore(){
  const L=$('rkTL'), B=$('rkTBody'); if(!L || !rkT) return;
  const end=Math.min(rkT.rows.length, rkT.shown+RK_TCHUNK); let n=L.querySelectorAll('.rk-tr:not(.draft)').length, hl='', hc='';
  for(let i=rkT.shown;i<end;i++){ const x=rkT.rows[i]; hl+=rkTRowL(x,false,++n); hc+=rkTRowC(x,false); }
  const nl=L.children.length, nb=B.children.length;
  L.insertAdjacentHTML('beforeend', hl); B.insertAdjacentHTML('beforeend', hc); rkT.shown=end;
  rkTFixOverflow([...L.children].slice(nl).concat([...B.children].slice(nb)));
  rkTMoreBar(); rkTSync();
}
function rkTMoreBar(){
  const M=$('rkTMore'); if(!M || !rkT) return;
  const rest=rkT.rows.length-rkT.shown;
  M.innerHTML=rest>0 ? `<button type="button" class="rk-link" onclick="RK.tMore()">つづきを出す（あと ${rest}人）</button>`
    : (!rkT.rows.length && !rkT.draft && !rkT.nNew) ? (rkT.q.trim() ? '「'+esc(rkT.q.trim())+'」は見つかりませんでした' : 'ここには まだ だれもいません') : '';
  if(rest>0 && 'IntersectionObserver' in window){
    if(!rkT.io){ rkT.io=new IntersectionObserver(es=>{ if(rkT && es.some(e=>e.isIntersecting) && rkT.shown<rkT.rows.length) rkTMore(); }, {root:$('rkTWrap'), rootMargin:'300px'}); rkT.io.observe(M); }
    else { rkT.io.unobserve(M); rkT.io.observe(M); }   // まだ見えるところにあれば、もう一度知らせてもらう
  }
}
/* 見出しの右側を 本体と同じだけ横に動かす（パソコンの縦のスクロールバーの分もそろえる） */
function rkTSync(){
  const W=$('rkTWrap'), H=$('rkTHd'); if(!W || !H) return;
  H.style.paddingRight=Math.max(0, W.offsetWidth-W.clientWidth)+'px';
  $('rkTHc').scrollLeft=$('rkTX').scrollLeft;
}
/* 行の番号を 上から 1, 2, 3… に付けなおす（消した・足したあと） */
function rkTRenum(){
  let n=0; for(const r of $('rkTL').children){ if(r.classList.contains('draft')) continue; n++; const c=r.firstElementChild; if(c && c.textContent!==String(n)) c.textContent=n; }
}
function rkTInfo(){
  const I=$('rkTInfo'); if(!I || !rkT) return;
  const f=[];
  if(rkT.only) f.push('よみを入れた人');
  else { if(rkGrp) f.push(rkGrp==='★'?'★ よく使う':rkGrp==='?'?'よみなし':RK_SP[rkGrp]?RK_SP[rkGrp][0]+' '+RK_SP[rkGrp][1]:'🏷 '+rkGrp); if(rkCol) f.push(rkCol==='-'?'色なし':'🎨 '+colLabelD(rkCol)); }
  const ny=rkT.rows.filter(noYomi).length;
  I.innerHTML=`<span><b>${rkT.rows.length+rkT.nNew}</b>人${f.length?'（'+esc(f.join('・'))+' だけ）':''}</span>${f.length?'<button type="button" onclick="RK.tAllF()">ぜんぶ出す</button>':''}${ny?`<button type="button" class="yf" onclick="RK.yFillT()">📝 よみなし ${ny}人に よみを入れる</button>`:''}<span class="hint">マスを押すと その場で直せます。Enter で下の人へ。見出しの右の ‖ を動かすと 幅が変わります</span>`;
  const u=$('rkTUndo'); if(u) u.disabled=!rkT.undo.length;
}
function rkOpenTbl(only){
  if(!rk.items.length){ toast('入っている人はいません'); return; }
  rkCloseSub(); rkSel=null; rkPaint=null;
  only=(only instanceof Set && only.size)?only:null;
  rkT={q:only?'':rkQ, sort:{c:'',d:1}, undo:[], ed:null, draft:null, rows:[], shown:0, nNew:0, cols:[], io:null, only};
  $('rkTFind').value=rkT.q;
  $('rkTblOverlay').classList.toggle('rk-big', !!rk.big);
  openDlg('rkTblOverlay', rkTEnd);
  rkTRender(); $('rkTWrap').scrollTop=0; $('rkTX').scrollLeft=0; rkTSync();
  rkRender();
}
function rkCloseTbl(){ closeIf('rkTblOverlay', rkTEnd); }
function rkTEnd(){ if(rkT){ rkTCommit(); if(rkT.io) rkT.io.disconnect(); } rkT=null; rkSaveFlush(); if($('rkList')) rkRender(); }
function rkTClick(ev){
  if(!rkT) return;
  if(ev.target.closest('.rk-rs')) return;   // 幅のつまみ
  const th=ev.target.closest('[data-h]'); if(th){ rkTSort(th.dataset.h); return; }
  const td=ev.target.closest('.rk-tc[data-c]'); if(!td || ev.target.closest('.rk-tin')) return;
  const tr=td.parentElement; if(!tr || !tr.dataset.id) return;
  if(td.dataset.c==='no') rkTRowMenu(tr.dataset.id); else rkTEdit(tr.dataset.id, td.dataset.c);
}
function rkTSort(c){
  rkTCommit(); const s=rkT.sort;
  if(!c){ s.c=''; s.d=1; } else if(s.c!==c){ s.c=c; s.d=1; } else if(s.d>0) s.d=-1; else { s.c=''; s.d=1; }
  rkTRender(); $('rkTWrap').scrollTop=0;
}
const rkTItem=id=>(rkT && rkT.draft && rkT.draft.id===id) ? rkT.draft : rkFind(id);
/* マスに入れる（typed：形がちがって戻ってきた文字） */
function rkTEdit(id, c, typed){
  if(!rkT) return;
  rkTCommit();
  const draft=!!(rkT.draft && rkT.draft.id===id), x=rkTItem(id); if(!x) return;
  if(c!=='name' && !TCOL_RE.test(c)) return;
  if(tPop(c)){ if(draft){ toast('先に 名前か電話を入れてください'); return; } rkTPopup(id, c); return; }
  const td=rkTCellEl(id, c); if(!td) return;
  const v=rkTVal(x,c);
  td.classList.add('ed');
  td.innerHTML=`<input class="rk-tin" type="${c==='cell'||c==='tel'?'tel':c==='mail'?'email':'text'}" enterkeyhint="enter" autocomplete="off" maxlength="${c==='adr'?300:c==='mail'?120:c==='name'?81:200}">`;
  const inp=td.firstElementChild; inp.value=typed!=null?typed:v; inp.setAttribute('aria-label', tHead(c));
  if(c==='bday') inp.placeholder='1960/4/1・4/1';
  rkT.ed={id, c, inp, v0:v};
  inp.addEventListener('blur', ()=>setTimeout(()=>{ if(rkT && rkT.ed && rkT.ed.inp===inp) rkTCommit(); }, 0));
  td.scrollIntoView({block:'nearest', inline:'nearest'});
  inp.focus({preventScroll:true});
  try{ inp.setSelectionRange(inp.value.length, inp.value.length); }catch(_){}
}
/* 入れていたマスを決める。形がちがうときは知らせて false（そのマスは元のまま） */
function rkTCommit(cancel){
  const e=rkT && rkT.ed; if(!e) return true;
  rkT.ed=null;
  const ok=(cancel || e.inp.value===e.v0) ? true : rkTSetVal(e.id, e.c, e.inp.value);
  rkTRowRe(e.id);
  return ok;
}
function rkTKey(ev){
  const e=rkT && rkT.ed; if(!e || ev.target!==e.inp || ev.isComposing || ev.keyCode===229) return;
  if(ev.key==='Enter'){ ev.preventDefault(); ev.stopPropagation(); rkTGo(e.id, e.c, ev.shiftKey?-1:1, 0); }
  else if(ev.key==='Tab'){ ev.preventDefault(); ev.stopPropagation(); rkTGo(e.id, e.c, 0, ev.shiftKey?-1:1); }
  else if(ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); rkTCommit(true); }
}
function rkTGo(id, c, dr, dc){
  const typed=rkT.ed ? rkT.ed.inp.value : null;
  if(!rkTCommit()){ rkTEdit(id, c, typed); return; }   // 形がちがう：そのマスで直してもらう
  let R=rkTLeftRows(), ri=R.findIndex(r=>r.dataset.id===id); if(ri<0) return;
  const cols=['name'].concat(rkT.cols.map(a=>a[0])).filter(k=>!tPop(k));
  let ci=Math.max(0, cols.indexOf(c));
  if(dc){ ci+=dc; if(ci>=cols.length){ ci=0; ri++; } else if(ci<0){ ci=cols.length-1; ri--; } }
  ri+=dr;
  if(ri>=R.length && rkT.shown<rkT.rows.length){ rkTMore(); R=rkTLeftRows(); }
  if(ri<0 || ri>=R.length) return;   // いちばん上・下
  rkTEdit(R[ri].dataset.id, cols[ci]);
}
/* 1人の行を書きなおす（左右とも。番号はそのまま。足しかけの行が入ったときは 番号を付けなおす） */
function rkTRowRe(id){
  if(!rkT) return; const R=rkTRows(id); if(!R.l && !R.c) return;
  const draft=!!(rkT.draft && rkT.draft.id===id), x=rkTItem(id);
  if(!x){ rkTRowDel(id); return; }
  const was=!!(R.l && R.l.classList.contains('draft')), n=R.l && R.l.firstElementChild ? R.l.firstElementChild.textContent : '';
  const t=document.createElement('div'); t.innerHTML=rkTRowL(x, draft, n)+rkTRowC(x, draft);
  const nl=t.firstElementChild, nc=t.lastElementChild;
  if(R.l) R.l.replaceWith(nl); if(R.c) R.c.replaceWith(nc);
  rkTFixOverflow([nl, nc]);
  if(was!==draft) rkTRenum();
}
function rkTRowDel(id){ const R=rkTRows(id); if(R.l) R.l.remove(); if(R.c) R.c.remove(); rkTRenum(); rkTMoreBar(); }
function rkTFlash(id){ const R=rkTRows(id); [R.l,R.c].forEach(r=>{ if(r) r.classList.add('fl'); }); setTimeout(()=>{ const Q=rkTRows(id); [Q.l,Q.c].forEach(r=>{ if(r) r.classList.remove('fl'); }); }, 900); }
function rkTPush(id, before){ rkT.undo.push({id, before}); if(rkT.undo.length>100) rkT.undo.shift(); rkTInfo(); }
/* 文字をそのマスの所に入れる。だめなときは 知らせる文を返す */
function rkTPut(x, c, v){
  switch(c){
    case 'name': {
      if(x.fn && !x.fam && !x.giv){ x.fn=v; break; }   // 表示名だけの人（「母」など）は そのまま
      const sp=v.split(/[\s　]+/).filter(Boolean);
      if(isLatin(v)){ x.giv=sp[0]||''; x.fam=sp.slice(1).join(' '); } else { x.fam=sp[0]||''; x.giv=sp.slice(1).join(' '); }
      x.fn=''; break; }
    case 'yomi': { const sp=v.split(/[\s　]+/).filter(Boolean); x.famK=sp[0]||''; x.givK=sp.slice(1).join(' '); break; }
    case 'cell': case 'tel': {
      if(v && digits(v).length<3) return '電話番号は 数字で入れてください';
      const i=tSlot(x,c);
      if(i>=0){ if(v) x.tels[i].v=v; else x.tels.splice(i,1); }
      else if(v){ if(x.tels.length>=12) return '電話は 12 までです'; x.tels.push({t:c==='cell'?'cell':'home', l:'', v, p:false}); }
      break; }
    case 'mail': {
      if(v && !rkMailOk(v)) return 'メールの形が正しくないようです：'+v;
      if(x.mails[0]){ if(v) x.mails[0].v=v; else x.mails.splice(0,1); }
      else if(v) x.mails.push({t:'home', l:'', v, p:false});
      break; }
    case 'zip': case 'adr': {
      let a=x.adrs[0];
      if(!a){ if(!v) break; a={t:'home', l:'', pob:'', ext:'', street:'', city:'', region:'', zip:'', country:'', p:false}; x.adrs.unshift(a); }
      if(c==='zip') a.zip=v;
      else if(v!==rkAdrText(a).trim()){ if(a.country && !/^(日本|japan|jp|jpn)$/i.test(a.country)) a.country=''; a.street=v; a.region=''; a.city=''; a.ext=''; }
      if(!a.pob && !a.ext && !a.street && !a.city && !a.region && !a.zip && !a.country) x.adrs.shift();
      break; }
    case 'bday': {
      if(!v){ x.bday=''; x.bdayLine=''; break; }
      const d=rkDate(v.normalize('NFKC').replace(/\s/g,''));
      if(!d) return '誕生日は「1960/4/1」や「4/1」の形で入れてください';
      x.bday=d; break; }
    case 'org': case 'dept': case 'title': case 'nick': x[c]=v; break;
    default: if(c.startsWith('cf:')){ const f=c.slice(3); if(v) x.cf[f]=v; else delete x.cf[f]; }
  }
  return '';
}
function rkTSetVal(id, c, val){
  const draft=!!(rkT.draft && rkT.draft.id===id), x=rkTItem(id); if(!x) return true;
  const v=String(val==null?'':val).replace(CTRL,'').trim(), before=JSON.stringify(x);
  const err=rkTPut(x, c, v);
  if(err){ toast(err, 3500); return false; }
  Object.assign(x, rkCleanItem(Object.assign({}, x)));
  if(JSON.stringify(x)===before) return true;
  if(draft){   // 足した行：名前か電話が入ったら 連絡帳に入れる
    if(!rkHasAny(x)) return true;
    if(rk.items.length>=RK_MAX){ toast('入れられるのは '+RK_MAX+'人までです'); return false; }
    x.added=today(); x.updated=today(); x.ts=Date.now();
    rk.items.push(x); rkT.draft=null; rkT.nNew++; rkT.undo.push({id:x.id, add:true}); rkSyncGroups(); rkSaveSoon(); rkTInfo();
    return true;
  }
  if(!rkHasAny(x)){ Object.assign(x, JSON.parse(before)); toast('名前か電話番号は 残してください'); return false; }
  rkTPush(id, before); x.updated=today(); x.ts=Date.now(); rkSaveSoon();
  return true;
}
/* 小さな窓で直すもの（色・★・グループ・えらぶ項目・メモ） */
function rkTApply(id, fn, soft){
  const x=rkFind(id); if(!x) return;
  const before=JSON.stringify(x); fn(x);
  Object.assign(x, rkCleanItem(Object.assign({}, x)));
  if(JSON.stringify(x)!==before){ if(!soft){ x.updated=today(); x.ts=Date.now(); } rkTPush(id, before); rkSyncGroups(); rkSaveSoon(); }
  rkTRowRe(id); rkTFlash(id);
}
async function rkTPopup(id, c){
  const x=rkFind(id); if(!x) return;
  if(c==='fav'){ rkTApply(id, y=>{ y.fav=!y.fav; }); return; }
  if(c==='color'){ const k=await rkPickColor('🎨 '+rkName(x)+' の色', x.color); if(k!==null) rkTApply(id, y=>{ y.color=k; rkCGrpSync(y); }, true); return; }
  if(c==='note'){ const v=await appPrompt('📝 '+rkName(x)+' のメモ', x.note, true); if(v!=null) rkTApply(id, y=>{ y.note=String(v); }); return; }
  if(c==='groups'){
    const html=`<div class="rk-tagrow" id="rkAskGr">${rk.groups.map(g=>`<button type="button" class="${x.groups.includes(g.n)?'on':''}" data-g="${esc(g.n)}" onclick="this.classList.toggle('on')">${esc((g.ic?g.ic+' ':'')+g.n)}</button>`).join('')}</div>`;
    const r=await rkAsk('🏷 '+rkName(x)+' のグループ', rk.groups.length?'押して えらび、「できた」を押してください':'まだグループがありません', ['できた','＋ 新しいグループを作って入れる','やめる'], html);
    const on=[...document.querySelectorAll('#rkAskGr button.on')].map(b=>b.dataset.g);
    if(r===0) rkTApply(id, y=>{ y.groups=on; });
    else if(r===1){ const n=line(await appPrompt('グループの名前（例：家族・町内会・野球部）',''),20); if(!n) return; if(!rk.groups.some(g=>g.n===n)) rk.groups.push({n, ic:''}); rkTApply(id, y=>{ y.groups=[...new Set(on.concat([n]))]; }); }
    return;
  }
  if(c.startsWith('cf:')){
    const f=rk.fields.find(f=>f.id===c.slice(3)); if(!f) return;
    const r=await rkAsk('🧩 '+rkName(x)+' の「'+f.n+'」', '', f.op.concat(['（なし）','やめる']));
    if(r>=0 && r<=f.op.length) rkTApply(id, y=>{ if(r<f.op.length) y.cf[f.id]=f.op[r]; else delete y.cf[f.id]; });
  }
}
function rkTUndo(){
  if(!rkT) return; rkTCommit(true);
  const u=rkT.undo.pop(); if(!u){ toast('戻すものはありません'); return; }
  const x=rkFind(u.id);
  if(u.add){ if(x){ rk.items=rk.items.filter(i=>i!==x); const k=rkT.rows.indexOf(x); if(k>=0){ rkT.rows.splice(k,1); if(k<rkT.shown) rkT.shown--; } else rkT.nNew=Math.max(0,rkT.nNew-1); rkTRowDel(u.id); } }
  else if(x){ const b=JSON.parse(u.before); for(const k of Object.keys(x)) if(!(k in b)) delete x[k]; Object.assign(x, b); rkTRowRe(u.id); rkTFlash(u.id); }
  rkSyncGroups(); rkSaveSoon(); rkTInfo();
  toast('ひとつ戻しました'+(x?'（'+rkName(x)+'）':''));
}
function rkTAdd(){
  if(!rkT) return; rkTCommit();
  if(!rkT.draft){
    const d=rkCleanItem({}); if(rkGrpIsName(rkGrp)) d.groups=[rkGrp]; if(rkGrp==='★') d.fav=true; if(rkCol && rkCol!=='-') d.color=rkCol;
    rkT.draft=d; $('rkTL').insertAdjacentHTML('afterbegin', rkTRowL(d, true, '')); $('rkTBody').insertAdjacentHTML('afterbegin', rkTRowC(d, true)); rkTMoreBar();
  }
  $('rkTWrap').scrollTop=0; $('rkTX').scrollLeft=0;
  rkTEdit(rkT.draft.id, 'name');
}
async function rkTRowMenu(id){
  if(!rkT) return; rkTCommit();
  if(rkT.draft && rkT.draft.id===id){ rkT.draft=null; rkTRowDel(id); return; }   // 足しかけの行をやめる
  const x=rkFind(id); if(!x) return;
  const r=await rkAsk('📇 '+rkName(x), '', ['✏ くわしく直す（電話を足す・写真 など）','📞 見る（電話をかける など）','🗑 この人を消す','やめる']);
  if(r===0) rkEdit(id);
  else if(r===1) rkView(id);
  else if(r===2){ if(!await appConfirm('「'+rkName(x)+'」を この連絡帳から消しますか？\n（スマホの連絡先は消えません）','消す','やめる')) return; rkDrop(x); rkSave(); toast('消しました'); }
}
async function rkTColsPick(){
  if(!rkT) return; rkTCommit();
  const nw=rkTNameW(), NW=[[110,'せまく'],[138,'ふつう'],[190,'ひろく'],[260,'もっと ひろく']];
  const html='<div class="rk-note" style="margin-top:0">名前の列の幅（見出しの右の端 ‖ を指で動かしても変えられます）</div>'
    +`<div class="rk-tagrow" style="margin-bottom:6px">${NW.map(([w,l])=>`<button type="button" data-nw="${w}" class="${nw===w?'on':''}" onclick="RK.tNameW(${w})">${l}</button>`).join('')}</div>`
    +'<div class="rk-tagrow" style="margin-bottom:10px"><button type="button" onclick="RK.tWFit()">↔ ぜんぶの幅を 中身に合わせる</button><button type="button" onclick="RK.tWReset()">幅を もとに戻す</button></div>'
    +'<div class="rk-note">表に出す列（名前は いつも出ます）</div>'+tAllCols().map(([k,l])=>`<label class="rk-chk"><input type="checkbox" data-tc="${esc(k)}" ${rk.thide.includes(k)?'':'checked'}> ${esc(l)}</label>`).join('');
  const r=await rkAsk('☰ 出す列', '', ['できた','やめる'], html);
  if(r!==0 || !rkT) return;
  rk.thide=[...document.querySelectorAll('#rkAskBody input[data-tc]')].filter(i=>!i.checked).map(i=>i.dataset.tc);
  rkSave(); rkTRender();
}

/* ── あ よみ（v548）：ひらがな／カタカナに そろえる・よみのない人に 名前の漢字から よみを入れる ──
   よみの辞書（renraku-yomi.js・約110KB）は、よみを入れるときに はじめて読む。そろえる・戻すは辞書なしで。 */
const toHiraY=s=>String(s||'').normalize('NFKC').replace(/[ァ-ヴヽヾ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/ヵ/g,'か').replace(/ヶ/g,'け');
const toKataY=s=>String(s||'').normalize('NFKC').replace(/[ぁ-ゖゝゞ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
/* よみの字：hira ひらがな・kata カタカナ・half 半角カナ・mix まざっている・etc 英字など・''（よみなし） */
function rkYKind(x){
  const s=(x.famK||'')+(x.givK||''); if(!s.trim()) return '';
  const h=/[ぁ-ゖゝゞ]/.test(s), k=/[ァ-ヺヽヾ]/.test(s), w=/[ｦ-ﾟ]/.test(s);
  return h&&(k||w) ? 'mix' : w ? 'half' : k ? 'kata' : h ? 'hira' : 'etc';
}
/* そろえたときの よみ（変わらないときは null） */
function rkYConv(x, to){
  if(!x.famK && !x.givK) return null;
  const f=to==='kata'?toKataY:toHiraY, a=line(f(x.famK),LIM.famK), b=line(f(x.givK),LIM.givK);
  return (a===x.famK && b===x.givK) ? null : [a,b];
}
function rkYCounts(){
  const c={hira:0,kata:0,half:0,mix:0,etc:0,none:0,toHira:0,toKata:0};
  for(const x of rk.items){ const k=rkYKind(x); if(!k){ if(noYomi(x)) c.none++; continue; } c[k]++; if(rkYConv(x,'hira')) c.toHira++; if(rkYConv(x,'kata')) c.toKata++; }
  return c;
}
/* 新しく入れる よみの字（えらんでいなければ、いま多いほう） */
function rkYStyle(){
  if(rk.ykana) return rk.ykana;
  let h=0, k=0; for(const x of rk.items){ const t=rkYKind(x); if(t==='hira') h++; else if(t==='kata'||t==='half') k++; }
  return k>h?'kata':'hira';
}
const rkYOut=(s,st)=>line((st||rkYStyle())==='kata'?toKataY(s):s, 60);
let rkYLoading=null;
function rkYLoad(){
  if(window.rkYomiGuess) return Promise.resolve(true);
  if(!rkYLoading) rkYLoading=new Promise(res=>{
    const sc=document.createElement('script'); sc.src=RK_BASE+'renraku-yomi.js';
    sc.onload=()=>{ rkYLoading=null; res(!!window.rkYomiGuess); };
    sc.onerror=()=>{ rkYLoading=null; sc.remove(); res(false); };
    document.head.appendChild(sc);
  });
  return rkYLoading;
}
const rkYGuess=x=>window.rkYomiGuess({fam:x.fam, giv:x.giv, fn:x.fn, org:x.org, nick:x.nick});
const rkYSnap=x=>({id:x.id, famK:x.famK, givK:x.givK, updated:x.updated, ts:x.ts});
function rkYPut(x, a, b){ x.famK=a; x.givK=b; x.updated=today(); x.ts=Date.now(); }
function rkYAfter(){ rkSave(); rkRender(); if(rkT) rkTReRender(); }
function rkYOpen(){
  const c=rkYCounts(), st=rkYStyle();
  const kinds=[['hira','ひらがな'],['kata','カタカナ'],['half','半角カナ'],['mix','まざっている'],['etc','英字など']].filter(([k])=>c[k] || k==='hira' || k==='kata');
  const al=(to,l,n)=>`<button class="rk-btn" data-ya="${to}" onclick="RK.yAlign('${to}')" ${n?'':'disabled'}>${l}${n?'（'+n+'人を直す）':'（そろっています）'}</button>`;
  rkScr('あ よみ', `<div class="rk-note" style="margin-top:0">いまの よみの字（${rk.items.length}人）</div>
    <div class="rk-ycnt" id="rkYCnt">${kinds.map(([k,l])=>`<span data-k="${k}">${l} <b>${c[k]}</b>人</span>`).join('')}<span data-k="none">よみなし <b>${c.none}</b>人</span></div>
    ${al('hira','あ　ひらがなに そろえる',c.toHira)}${al('kata','ア　カタカナに そろえる',c.toKata)}
    <div class="rk-note">「やまだ」⇔「ヤマダ」のように 字の形だけを かえます（読みは そのまま）。半角の ｶﾀｶﾅ も ふつうの字に なります。</div>
    <div class="rk-sec">よみが入っていない人</div>
    ${c.none?`<button class="rk-btn" id="rkYFillBtn" onclick="RK.yFill()">📝 名前から よみを入れる（${c.none}人）</button>`:'<div class="rk-note">よみが入っていない人は いません。</div>'}
    <div class="rk-note">名前の漢字から ふつうの読み方を入れます（山田 太郎 → やまだ たろう・佐々木 → ささき・田中工務店 → たなかこうむてん）。めずらしい読みは ちがうことがあるので、入れたあと「📋 表で見なおす」で直してください。1人ずつは「直す」画面の「📝 名前から よみを入れる」でも入れられます。</div>
    <div class="rk-note">入れる よみの字</div>
    <div class="rk-tagrow" id="rkYStyle">${[['hira','あ ひらがなで'],['kata','ア カタカナで']].map(([v,l])=>`<button type="button" data-yk="${v}" class="${st===v?'on':''}" onclick="RK.yStyle('${v}')">${l}</button>`).join('')}</div>
    ${rkYUndo?`<button class="rk-btn sub" id="rkYUndoBtn" onclick="RK.yUndo()">↶ 戻す（さっき ${esc(rkYUndo.what)} ${rkYUndo.list.length}人）</button>`:''}
    <button class="rk-btn sub" onclick="RK.closeScr()">とじる</button>`);
}
function rkYAlign(to){
  to=to==='kata'?'kata':'hira';
  const ch=[];
  for(const x of rk.items){ const v=rkYConv(x,to); if(!v) continue; ch.push(rkYSnap(x)); rkYPut(x, v[0], v[1]); }
  rk.ykana=to;
  const l=to==='kata'?'カタカナ':'ひらがな';
  if(ch.length){ rkYUndo={what:l+'に そろえた', list:ch}; rkYAfter(); toast(ch.length+'人の よみを '+l+'に しました'); }
  else { rkSave(); toast('よみは もう '+l+'に そろっています'); }
  rkYOpen();
}
/* よみのない人に 名前から よみを入れる（list：この人たちの中で。なければ ぜんぶ） */
async function rkYFill(list){
  const todo=(Array.isArray(list)?list:rk.items).filter(noYomi);
  if(!todo.length){ toast('よみが入っていない人は いません'); return; }
  if(!await rkYLoad()){ toast('よみの辞書を読み込めませんでした。インターネットにつながるところで、もう一度 押してください', 4500); return; }
  const st=rkYStyle(), done=[], fail=[], ch=[];
  for(const x of todo){
    if(!noYomi(x)) continue;   // 読みこむ間に 入った人（2回押したときなど）
    const g=rkYGuess(x), a=g?rkYOut(g.famK,st):'', b=g?rkYOut(g.givK,st):'';
    if(!a && !b){ fail.push(x); continue; }
    ch.push(rkYSnap(x)); rkYPut(x, a, b); done.push(x);
  }
  if(ch.length){ rkYUndo={what:'よみを入れた', list:ch}; rkYLast=done.map(x=>x.id); rkYAfter(); }
  rkYResult(done, fail);
}
function rkYResult(done, fail){
  const M=200;
  rkScr('📝 よみを入れました', `<div class="rk-msg"><b>${done.length}</b>人に よみを入れました。${fail.length?'\n入れられなかった人が '+fail.length+'人 います（下）。':''}</div>
    <div class="rk-note" style="margin-top:0">名前の漢字から ふつうの読み方を入れています。めずらしい読みの人は ちがうことがあるので、見て 直してください。</div>
    ${done.length?`<button class="rk-btn" onclick="RK.yTbl()">📋 入れた人を 表で見なおす・直す</button>
    <div class="rk-ylist" id="rkYList">${done.slice(0,M).map(x=>`<div class="rk-yrow"><span class="nm">${esc(rkName(x))}</span><span class="yo">${esc(rkYomi(x))}</span></div>`).join('')}</div>
    ${done.length>M?`<div class="rk-note">ほか ${done.length-M}人（表で見られます）</div>`:''}`:''}
    ${fail.length?`<div class="rk-note" id="rkYFail">入れられなかった人（辞書にない字がある・英字だけ など）：${esc(fail.slice(0,30).map(rkName).join('、'))}${fail.length>30?' ほか '+(fail.length-30)+'人':''}</div>`:''}
    ${done.length?'<button class="rk-btn sub" onclick="RK.yUndo()">↶ 入れる前に 戻す</button>':''}
    <button class="rk-btn sub" onclick="RK.closeScr()">一覧を見る</button>`);
}
/* 入れた人を 表で（よみの列を出して） */
function rkYTbl(){
  const ids=(rkYLast||[]).filter(id=>rkFind(id)); if(!ids.length){ toast('見なおす人は いません'); return; }
  rkCloseScr();
  if(rk.thide.includes('yomi')){ rk.thide=rk.thide.filter(c=>c!=='yomi'); rkSave(); }
  if(rkT){ rkTCommit(); rkT.only=new Set(ids); rkT.q=''; $('rkTFind').value=''; rkTRender(); $('rkTWrap').scrollTop=0; $('rkTX').scrollLeft=0; rkTSync(); }
  else rkOpenTbl(new Set(ids));
}
function rkYUndoDo(){
  const u=rkYUndo; if(!u){ toast('戻すものは ありません'); return; }
  rkYUndo=null; let n=0;
  for(const b of u.list){ const x=rkFind(b.id); if(!x) continue; x.famK=b.famK; x.givK=b.givK; x.updated=b.updated; x.ts=b.ts; n++; }
  if(u.what==='よみを入れた') rkYLast=null;
  rkYAfter(); toast(n+'人の よみを もとに戻しました');
  if(isDlgOpen('rkScrOverlay')) rkYOpen();
}
function rkYSetStyle(v){
  rk.ykana=v==='kata'?'kata':'hira'; rkSave();
  document.querySelectorAll('#rkYStyle [data-yk]').forEach(b=>b.classList.toggle('on', b.dataset.yk===rk.ykana));
}
/* 一覧で「よみなし」に絞ったときの上の帯 */
function rkYBarHtml(){
  const n=rk.items.filter(noYomi).length;
  return n ? `<div class="rk-ybar"><span>よみが入っていない人 <b>${n}</b>人</span><button type="button" onclick="RK.yFill()">📝 名前から よみを入れる</button></div>` : '';
}
/* 直す画面：空いている よみの欄に 名前から入れる */
async function rkEdYomi(){
  rkEdSync(); const e0=rkEd; if(!e0) return;
  const named=!!(e0.fam.trim() || e0.giv.trim());
  const need=named ? !!((!e0.famK.trim() && e0.fam.trim()) || (!e0.givK.trim() && e0.giv.trim())) : !(e0.famK.trim() || e0.givK.trim());
  if(!need){ toast('よみは もう入っています（消してから押すと 入れなおします）', 3000); return; }
  if(!await rkYLoad()){ toast('よみの辞書を読み込めませんでした。インターネットにつながるところで、もう一度 押してください', 4500); return; }
  const e=rkEd; if(!e) return;
  rkEdSync();
  const g=rkYGuess(e); let n=0;
  if(g){
    if(e.fam.trim() || e.giv.trim()){
      if(!e.famK.trim() && g.famK){ e.famK=rkYOut(g.famK); n++; }
      if(!e.givK.trim() && g.givK){ e.givK=rkYOut(g.givK); n++; }
    } else if(!e.famK.trim() && !e.givK.trim()){ e.famK=rkYOut(g.famK); e.givK=rkYOut(g.givK); n++; }
  }
  if(!n){ toast((e.fam||e.giv||e.fn||e.org||e.nick) ? '名前から よみを作れませんでした' : '先に 名前を入れてください', 3000); return; }
  rkEdRe(); toast('名前から よみを入れました。ちがっていたら 直してください', 3000);
}

/* ── ⚙ 設定 ── */
function rkOpenMenu(){
  const n=rk.items.length, np=rk.items.filter(x=>x.photo).length;
  $('rkSubHdr').textContent='⚙ 連絡帳';
  $('rkSubBody').innerHTML=`<div class="rk-note">いま <b>${n}</b>人（写真 ${np}人・グループ ${rk.groups.length}）。入れたものは この端末の中だけにあります。</div>
    <button class="rk-btn" onclick="RK.importClick()">⬆ スマホの連絡先を読み込む（.vcf・CSV）</button>
    ${rkCanPick()?'<button class="rk-btn sub" onclick="RK.pick()">📱 スマホの連絡先から選んで入れる</button>':''}
    <button class="rk-btn" onclick="RK.openExport()">📇 スマホに戻す（vCard で書き出す）</button>
    <button class="rk-btn sub" onclick="RK.table()">📋 表で直す（全員を 表のまま その場で直す）</button>
    <button class="rk-btn sub" onclick="RK.closeSub();RK.paintStart()">🎨 色分け（色をえらんで 人を押す）</button>
    <button class="rk-btn sub" onclick="RK.yomi()">あ よみ（ひらがな／カタカナに そろえる・名前から よみを入れる）</button>
    <button class="rk-btn sub" onclick="RK.custom()">🧩 自分好みにする（グループ・自分の項目・色の名前・一覧の出し方）</button>
    <div class="rk-sec">📞 連絡帳から 電話をかける</div>
    <div class="rk-tagrow" id="rkCallSet">${[['on','📞 かけられる'],['ask','❓ かける前に聞く'],['off','🚫 かけない']].map(([v,l])=>`<button type="button" data-call="${v}" class="${rk.call===v?'on':''}" onclick="RK.setCall('${v}')">${l}</button>`).join('')}</div>
    <div class="rk-note">「かけない」にすると、見る画面の番号や 📞 を押しても 電話はかかりません（番号は見られます・コピーもできます）。「かける前に聞く」は、押したあとに たずねてから かけます。</div>
    <button class="rk-btn sub" onclick="RK.dups()">🔍 同じ人をさがして いっしょにする</button>
    <button class="rk-btn sub" onclick="RK.tidy()">🧹 整理する（要らない人を見つける・1人ずつ仕分ける・会社でグループ）</button>
    <button class="rk-btn sub" onclick="RK.csv()">📄 CSV（Excel）で書き出す</button>
    <button class="rk-btn sub" onclick="RK.print()">🖨 あいうえお順の電話一覧を印刷</button>
    <button class="rk-btn sub" onclick="RK.help()">❓ スマホからの出し方・戻し方</button>
    <button class="rk-btn sub" onclick="RK.appHelp()">📱 連絡帳だけのアプリ（ホーム画面に・Netlify に置く）</button>
    <button class="rk-btn sub" onclick="RK.backup()">⬇ この連絡帳を書き出す（写真ごと・機種変えのときに）</button>
    <div class="rk-note">「⬆ 読み込む」では、ここで書き出したファイル（.json）も読めます。${document.documentElement.classList.contains('rk-solo')?'':'📋リストの ⬇書き出し（全体のバックアップ）にも入ります。'}</div>
    <button class="rk-btn del" onclick="RK.wipe()">🗑 ぜんぶ消す</button>`;
  if(!isDlgOpen('rkSubOverlay')) openDlg('rkSubOverlay'); else $('rkSubBody').scrollTop=0;
}
function rkHelp(){
  rkScr('❓ スマホからの出し方・戻し方', `<div class="rk-help">
    <h3>📱 → 📇 スマホの連絡先を読み込む</h3>
    <p><b>Android</b>（Google の「連絡帳」アプリ）</p>
    <ol><li>連絡帳アプリの下の「<b>修正と管理</b>」→「<b>ファイルにエクスポート</b>」</li><li>できた .vcf のファイルを、ここの「<b>⬆ スマホの連絡先を読み込む</b>」で選ぶ</li></ol>
    <p>Galaxy などは、連絡先アプリの ≡ →「連絡先を管理」→「連絡先をインポート/エクスポート」→「エクスポート」。</p>
    <p><b>iPhone</b></p>
    <ol><li>連絡先アプリの左上「<b>リスト</b>」→「<b>すべての連絡先</b>」を長く押す →「<b>書き出す</b>」→「"ファイル"に保存」</li><li>保存した .vcf を、ここの「⬆ 読み込む」で選ぶ</li></ol>
    ${rkCanPick()?'<p>この端末なら「<b>📱 スマホの連絡先から選んで入れる</b>」でも入れられます（選んだ人だけ）。</p>':''}
    <p>Google コンタクトの CSV、Excel の CSV も読めます。</p>
    <h3>📇 → 📱 スマホに戻す</h3>
    <ol><li>「<b>📇 スマホに戻す</b>」で .vcf を作る（ぜんぶ・いま出ている人・選んだ人・前に書き出したあとで直した人から選べます）</li>
      <li><b>Android</b>：連絡帳アプリ →「修正と管理」→「<b>ファイルからインポート</b>」→ 作った .vcf<br><b>iPhone</b>：「ファイル」アプリで .vcf を開く →「<b>すべての連絡先を追加</b>」</li></ol>
    <p>⚠ スマホに読み込むと「<b>足す</b>」になります。同じ人が2人になることがあります。Android は「修正と管理」→「<b>統合と修正</b>」で重なった人をまとめられます。直した人だけを戻すときは「前に書き出したあとで 入れた・直した人」を選ぶと重なりが少なくなります。</p>
    <p>スマホの連絡先をまるごと入れかえたいときは、スマホの連絡先を書き出して取っておいてから、スマホの連絡先を消して読み込みます。</p>
    <h3>ℹ 知っておくこと</h3>
    <p>ブラウザのアプリは、スマホの連絡先を直接書きかえられません。ファイル（.vcf）でやりとりします。</p>
    <p>自分で作った項目（間柄・年賀状など）は、メモ欄に「［間柄］叔父」の形でも書くので、スマホを通っても消えません（ここで読むと項目に戻ります）。</p>
    <p>アプリや機種によって、ボタンの名前が少しちがうことがあります。</p></div>`);
}
/* 📱 連絡帳だけのアプリ（v550。renraku-app/）：ホーム画面に足す・Netlify に置く */
function rkAppHelp(){
  const solo=document.documentElement.classList.contains('rk-solo');
  rkScr('📱 連絡帳だけのアプリ', `<div class="rk-help" id="rkAppHelp">
    <p>表電卓を開かずに、<b>連絡帳だけ</b>を ひとつのアプリとして使えます（できることは 同じです）。</p>
    ${solo?'<p>いま開いているのが <b>連絡帳だけのアプリ</b>です。</p>'
      :'<p><a href="renraku-app/" target="_blank" rel="noopener" id="rkAppLink">📇 連絡帳だけのアプリを開く</a>（同じサイトなら、入れたものは この連絡帳と同じです）</p>'}
    <h3>🏠 ホーム画面に足す</h3>
    <ol><li><b>iPhone</b>：Safari で開いて 共有（□↑）→「<b>ホーム画面に追加</b>」</li><li><b>Android</b>：Chrome で開いて ⋮ →「<b>ホーム画面に追加</b>」（または「アプリをインストール」）</li></ol>
    <p>アイコンから 連絡帳だけが すぐ開きます。電波がないときも 前に開いたものが使えます。</p>
    <h3>🌐 Netlify に置く</h3>
    <ol><li>1つのフォルダに、<b>renraku-app</b> フォルダの<b>中身</b>（index.html・manifest.json・sw.js・アイコン）と、<b>renraku.js</b>・<b>renraku-yomi.js</b>・<b>renraku-icons.js</b> を入れる</li>
      <li>app.netlify.com にログイン →「<b>Add new project</b>」→「<b>Deploy manually</b>」に そのフォルダを落とす</li>
      <li>できたアドレス（〜.netlify.app）を スマホで開いて、ホーム画面に足す</li></ol>
    <p>あとで新しくするときは、Netlify のその場所の「Deploys」に 新しいフォルダを落とします。</p>
    <h3>⚠ 中身をうつすとき</h3>
    <p>ちがうサイト（Netlify と 表電卓など）の連絡帳は、中身が<b>別々</b>です。うつすときは、前の方の ⚙ →「<b>⬇ この連絡帳を書き出す</b>」で .json を作り、新しい方の ⚙ →「<b>⬆ 読み込む</b>」で その .json を選びます（写真ごと うつります）。</p>
    <p class="rk-note">よみの辞書（renraku-yomi.js）の 1字ずつの読みは KANJIDIC2（© EDRDG, CC BY-SA 4.0）にもとづきます。</p></div>`);
}

/* ── 読み込む ── */
function rkImportClick(){ $('rkFileIn').click(); }
async function rkImportFile(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  if(f.size>40*1024*1024){ toast('ファイルが大きすぎます（40MB まで）'); return; }
  let buf; try{ buf=await f.arrayBuffer(); }catch(_){ toast('ファイルを読めませんでした'); return; }
  const t=rkFileText(buf);
  if(/^\s*[\[{]/.test(t)){
    let o=null; try{ o=JSON.parse(t); }catch(_){}
    const d=o && (o.type==='renraku' ? o.data : o.renraku), pics=o && (o.type==='renraku' ? o.pics : o.renrakuPics);
    if(d && Array.isArray(d.items)){ const r=await rkMerge(d, pics); rkCloseSub(); rkRender(); toast('読み込みました（足した '+r.add+'人・新しくした '+r.upd+'人）', 3500); return; }
    toast('連絡帳のファイルではありません'); return;
  }
  let list, kind;
  if(/BEGIN:VCARD/i.test(t)){ list=rkParseVcf(t).items; kind='vCard'; }
  else { list=rkFromCsv(t); kind='CSV'; if(!list){ toast('連絡先のファイル（.vcf）か CSV ではないようです'); return; } }
  await rkImportList(list, kind);
}
async function rkImportList(list, kind){
  if(!list || !list.length){ toast('読める連絡先がありませんでした'); return null; }
  const np=list.filter(x=>x._pic).length;
  let mode='add';
  if(rk.items.length){
    const r=await rkAsk('⬆ 読み込む', kind+'から '+list.length+'人 読みました'+(np?'（写真 '+np+'人）':'')+'。\nいま '+rk.items.length+'人 入っています。どうしますか？',
      ['まとめて足す（同じ人は いっしょにする）','入れかえる（いまの '+rk.items.length+'人は消す）','やめる']);
    if(r===0) mode='merge';
    else if(r===1){ if(!await appConfirm('いまの '+rk.items.length+'人を消して、読んだ '+list.length+'人に入れかえます。よろしいですか？\n（元に戻せません。自分の項目・グループの作りは残ります）','入れかえる','やめる')) return null; mode='replace'; }
    else return null;
  }
  const res=await rkCommit(list, mode);
  rkCloseSub(); rkQ=''; if($('rkFind')) $('rkFind').value=''; rkGrp=''; rkSel=null; rkRender(); $('rkList').scrollTop=0;
  rkShowResult(res);
  return res;
}
async function rkCommit(list, mode){
  if(mode==='replace'){ for(const x of rk.items) if(x.photo) rkPicDel(x.id); rk.items=[]; for(const k in rkPics) delete rkPics[k]; }
  const ix=rkIndex(rk.items); let add=0, mrg=0, pics=0, over=0;
  for(const src of list){
    const c=rkCleanItem(Object.assign({}, src, {id:uid(), added:today(), updated:today(), ts:0, photo:false}));
    for(const [n,v] of Object.entries(src._cfn||{})){
      if(n===COL_CF){ const k=rkColorFrom(v, true); if(k && !c.color) c.color=k; continue; }   // メモ欄・CSV の「［色分け］赤」は色に戻す
      const f=rkFieldByName(n, true); if(f && v) c.cf[f.id]=line(v,200); }
    if(!rkHasAny(c)) continue;
    const target=mode==='merge' ? rkMatchIdx(c, ix) : null;
    const pic=src._pic ? await rkFitPic(src._pic) : '';
    if(target){
      if(rkMergeInto(target, c)) mrg++;
      if(pic && !target.photo){ try{ await rkPicPut(target.id, pic); rkPics[target.id]=pic; target.photo=true; pics++; }catch(_){} }
      rkIndexAdd(ix, target); continue;
    }
    if(rk.items.length>=RK_MAX){ over++; continue; }
    rk.items.push(c); rkIndexAdd(ix, c); add++;
    if(pic){ try{ await rkPicPut(c.id, pic); rkPics[c.id]=pic; c.photo=true; pics++; }catch(_){} }
  }
  rkSyncGroups(); rkSave();
  return {add, mrg, pics, over};
}
function rkShowResult(res){
  const dups=rkDupGroups().length, ny=rk.items.filter(noYomi).length;
  rkScr('⬆ 読み込みました', `<div class="rk-msg"><b>${res.add}</b>人 足しました${res.mrg?'・<b>'+res.mrg+'</b>人 いっしょにしました':''}${res.pics?'（写真 '+res.pics+'人）':''}。${res.over?'\n入れられる人数（'+RK_MAX+'人）を超えた '+res.over+'人は入れませんでした。':''}</div>
    ${dups?`<button class="rk-btn sub" onclick="RK.dups()">🔍 同じ人かもしれない組が ${dups}組 あります → 見る</button>`:''}
    ${ny?`<div class="rk-note">よみが入っていない人が ${ny}人 います（よみ順では最後の「他」に並びます）。名前の漢字から ふつうの読みを入れられます。</div><button class="rk-btn sub" onclick="RK.yFill()">📝 名前から よみを入れる（${ny}人）</button>`:''}
    ${rk.items.length>=30?`<button class="rk-btn sub" onclick="RK.tidy()">🧹 整理する（要らない人を見つける・1人ずつ仕分ける・会社でグループ）</button>`:''}
    <div class="rk-note">直したら「📇 スマホに戻す」で、またスマホに入れられます。</div>
    <button class="rk-btn" onclick="RK.closeScr()">一覧を見る</button>`);
}
/* Android の Chrome：スマホの連絡先から選んで入れる（Contact Picker） */
async function rkPick(){
  if(!rkCanPick()){ toast('この端末・ブラウザでは使えません。連絡帳アプリで書き出したファイルを読み込んでください', 4000); return; }
  let props=['name','tel','email','address','icon'];
  try{ const av=await navigator.contacts.getProperties(); props=props.filter(p=>av.includes(p)); }catch(_){}
  let res; try{ res=await navigator.contacts.select(props, {multiple:true}); }catch(_){ toast('えらべませんでした'); return; }
  if(!res || !res.length) return;
  const list=[];
  for(const r of res){
    const x=blank(); const nm=String((r.name||[])[0]||'').trim(), sp=nm.split(/[\s　]+/);
    if(sp.length===2){ x.fam=sp[0]; x.giv=sp[1]; } else x.fn=nm;
    (r.tel||[]).forEach(t=>{ const v=String(t||'').trim(); if(v) x.tels.push({t:/^(\+81[\s-]?|0)[789]0/.test(v.normalize('NFKC').replace(/[\s-]/g,''))?'cell':'other', v}); });
    (r.email||[]).forEach(m=>{ const v=String(m||'').trim(); if(v) x.mails.push({t:'other', v}); });
    (r.address||[]).forEach(a=>{ if(!a) return; x.adrs.push({t:'home', zip:a.postalCode||'', region:a.region||'', city:a.city||'', street:(a.addressLine||[]).join(' '), country:a.country||''}); });
    const ic=(r.icon||[])[0];
    if(ic){ try{ const url=URL.createObjectURL(ic); try{ x._pic=await rkResizeSrc(url, 480, 0.8); }finally{ URL.revokeObjectURL(url); } }catch(_){} }
    list.push(x);
  }
  await rkImportList(list, 'スマホの連絡先');
}

/* ── スマホに戻す（vCard）・CSV・印刷・書き出し ── */
/* メモ欄にも書くもの（自分の項目・色分け） */
const rkNoteWhat=()=>[rk.fields.length?'自分の項目':'', rk.items.some(x=>x.color)?'色分け':''].filter(Boolean).join('・');
const rkCanShareFile=()=>{ try{ return !!(navigator.canShare && navigator.canShare({files:[new File(['x'],'a.vcf',{type:'text/vcard'})]})); }catch(_){ return false; } };
function rkOpenExport(scope){
  const all=rk.items.length; if(!all){ toast('入っている人はいません'); return; }
  const shown=rkVisible().length, sel=rkSel?rkSel.size:0, chg=rk.items.filter(x=>x.ts>rk.lastExp).length, np=rk.items.filter(x=>x.photo).length;
  const filt=!!((rkQ.trim()||rkGrp||rkCol) && shown<all);
  scope=(scope==='sel' && sel)?'sel':(filt?'shown':(scope==='chg'?'chg':'all'));
  const opt=(v,l,n)=>`<label class="rk-radio"><input type="radio" name="rkExpScope" value="${v}" ${scope===v?'checked':''}> ${l}（${n}人）</label>`;
  rkScr('📇 スマホに戻す（vCard .vcf）', `<div class="rk-note" style="margin-top:0">どの人を書き出しますか</div>
    ${opt('all','ぜんぶ',all)}${filt?opt('shown','いま出ている人',shown):''}${sel?opt('sel','えらんだ人',sel):''}${opt('chg','前に書き出したあとで 入れた・直した人',chg)}
    ${np?`<label class="rk-chk"><input type="checkbox" id="rkExpPic" checked> 写真も入れる（写真のある人 ${np}人）</label>`:''}
    ${rkNoteWhat()?`<label class="rk-chk"><input type="checkbox" id="rkExpCf" ${rk.noteCf?'checked':''}> ${rkNoteWhat()}をメモ欄にも書く（スマホを通っても消えない）</label>`:''}
    <button class="rk-btn" onclick="RK.doExport('save')">⬇ ファイルに保存（contacts-${rkStamp()}.vcf）</button>
    ${rkCanShareFile()?`<button class="rk-btn sub" onclick="RK.doExport('share')">📤 共有で渡す（連絡帳アプリで開く）</button>`:''}
    <div class="rk-note"><b>スマホへの入れ方</b>　Android：連絡帳アプリ →「修正と管理」→「ファイルからインポート」→ このファイル。iPhone：「ファイル」アプリで このファイルを開く →「すべての連絡先を追加」。<br>
    ⚠ スマホでは「足す」になるので、同じ人が2人になることがあります。直した人だけ戻すときは「前に書き出したあとで…」を選ぶと重なりが少なくなります。</div>
    <button class="rk-link" onclick="RK.help()">くわしい説明</button>`);
}
async function rkDoExport(how){
  const r=document.querySelector('input[name=rkExpScope]:checked'), scope=r?r.value:'all';
  const withPic=!!($('rkExpPic') && $('rkExpPic').checked);
  if($('rkExpCf')) rk.noteCf=$('rkExpCf').checked;
  const list=scope==='shown'?rkVisible():scope==='sel'?rk.items.filter(x=>rkSel && rkSel.has(x.id)):scope==='chg'?rk.items.filter(x=>x.ts>rk.lastExp):rk.items;
  if(!list.length){ toast('書き出す人がいません'); return; }
  const parts=[]; for(const x of rkSortedKana(list)) parts.push(rkVcard(x, {pic:(withPic && x.photo)?await rkPic(x.id):null, noteCf:rk.noteCf}));
  const data=parts.join('\r\n')+'\r\n', name='contacts-'+rkStamp()+'.vcf';
  let done=false;
  if(how==='share'){ try{ await navigator.share({files:[new File([data], name, {type:'text/vcard'})], title:'連絡先'}); done=true; }catch(e){ if(e && e.name==='AbortError') return; } }
  if(!done) rkDownload(name, data, 'text/vcard;charset=utf-8');
  rk.lastExp=Date.now(); rkSave();
  toast('書き出しました（'+list.length+'人）。スマホの連絡帳アプリで読み込んでください', 4500);
}
const rkSortedKana=list=>list.slice().sort((a,b)=>{ const ra=ROWS.indexOf(rkRow(a)), rb=ROWS.indexOf(rkRow(b)); return ra-rb || cmpKana(a,b); });
function rkCsv(){
  if(!rk.items.length){ toast('入っている人はいません'); return; }
  const H=['姓','名','せい','めい','表示名','ニックネーム','会社','部署','役職','携帯','自宅','勤務先','代表','FAX','その他の電話','メール1','メール2','メール3','郵便番号','住所','誕生日','サイト','グループ','よく使う','色分け','メモ'].concat(rk.fields.map(f=>'［'+f.n+'］'));
  const q=v=>'"'+csvSafe(v).replace(/"/g,'""')+'"';
  const tel=(x,t)=>x.tels.filter(a=>a.t===t && !a.l).map(a=>a.v).join(' / ');
  const rows=[H].concat(rkSortedKana(rk.items).map(x=>[x.fam,x.giv,x.famK,x.givK,x.fn,x.nick,x.org,x.dept,x.title,tel(x,'cell'),tel(x,'home'),tel(x,'work'),tel(x,'main'),tel(x,'fax'),
    x.tels.filter(a=>a.t==='other'||a.l).map(a=>(a.l?a.l+'：':'')+a.v).join(' / '),(x.mails[0]||{}).v||'',(x.mails[1]||{}).v||'',(x.mails[2]||{}).v||'',(x.adrs[0]||{}).zip||'',x.adrs[0]?rkAdrText(x.adrs[0]):'',
    x.bday.replace(/^--/,''),x.urls.join(' / '),x.groups.join(' / '),x.fav?'★':'',x.color?colFull(x.color):'',x.note].concat(rk.fields.map(f=>x.cf[f.id]||''))));
  const data='\uFEFF'+rows.map(r=>r.map(q).join(',')).join('\r\n');
  rkDownload('contacts-'+rkStamp()+'.csv', data, 'text/csv;charset=utf-8');
  toast('CSV で書き出しました（'+rk.items.length+'人）。Excel で開けます');
}
function rkPrint(){
  const list=rkVisible(); if(!list.length){ toast('印刷する人がいません'); return; }
  const by={}; list.forEach(x=>{ const r=rkRow(x); (by[r]=by[r]||[]).push(x); });
  const fl=[rkGrpIsName(rkGrp) ? rkGrp : RK_SP[rkGrp] ? RK_SP[rkGrp][1] : '', rkCol && rkCol!=='-' ? colLabelD(rkCol) : ''].filter(Boolean).join('・');
  const html=`<div class="rk-pr"><h1>📇 連絡帳${fl?'（'+esc(fl)+'）':''}</h1><div style="font-size:9pt;color:#555">${fmtDay(today())} 現在・${list.length}人</div>`
    +ROWS.filter(r=>by[r]).map(r=>`<h2>${r==='A'?'ABC':r}</h2><table>${by[r].sort(cmpKana).map(x=>`<tr><td style="width:32%"><b>${esc(rkName(x))}</b>${rkYomi(x)?'<br><small>'+esc(rkYomi(x))+'</small>':''}</td>`
      +`<td>${x.tels.map(t=>esc(tName(TEL_T,t)+' '+t.v)).join('<br>')}</td><td style="width:34%">${x.adrs[0]?esc((x.adrs[0].zip?'〒'+x.adrs[0].zip+' ':'')+rkAdrText(x.adrs[0])):''}</td></tr>`).join('')}</table>`).join('')+'</div>';
  rkCloseSub();
  if(typeof opBuild==='function' && typeof opPrint==='function') opPrint(opBuild(html, true)); else window.print();
}
async function rkPicsAll(){ const o={}; for(const x of rk.items) if(x.photo){ const d=await rkPic(x.id); if(d) o[x.id]=d; } return o; }
async function rkBackup(){
  const pics=await rkPicsAll();
  rkDownload('renraku-'+rkStamp()+'.json', JSON.stringify({app:'hyodenki', type:'renraku', version:1, data:rk, pics}), 'application/json');
  toast('書き出しました（'+rk.items.length+'人・写真 '+Object.keys(pics).length+'枚）');
}
/* 書き出したもの（JSON）を合わせる：同じ id は新しい方、ないものは足す。グループ・自分の項目の作りも合わせる */
async function rkMerge(d, pics){
  const inc=rkClean(d); let add=0, upd=0;
  for(const k of Object.keys(inc.colors)) if(!rk.colors[k] && inc.colors[k] && !Object.values(rk.colors).includes(inc.colors[k])) rk.colors[k]=inc.colors[k];   // 色（＋背景）の名前
  inc.groups.forEach(g=>{ const h=rk.groups.find(y=>y.n===g.n); if(!h) rk.groups.push(g); else if(!h.ic && g.ic) h.ic=g.ic; });
  const remap={};
  inc.fields.forEach(f=>{ const same=rk.fields.find(y=>y.n===f.n); if(same){ remap[f.id]=same.id; return; }
    if(rk.fields.length>=30) return; const id=rk.fields.some(y=>y.id===f.id)?rkNewFieldId():f.id; rk.fields.push(Object.assign({}, f, {id})); remap[f.id]=id; });
  for(const x of inc.items){
    const cf={}; for(const k in x.cf) if(remap[k]) cf[remap[k]]=x.cf[k]; x.cf=cf;
    const i=rk.items.findIndex(y=>y.id===x.id);
    if(i<0){ if(rk.items.length>=RK_MAX) continue; rk.items.push(x); add++; }
    else if(x.updated>rk.items[i].updated || (x.updated===rk.items[i].updated && x.ts>rk.items[i].ts)){ rk.items[i]=x; upd++; }
    else { if(!rk.items[i].color && x.color) rk.items[i].color=x.color; continue; }   // 色をぬっても「直した日」は変えないので、色だけは足す
    const p=pics && pics[x.id];
    if(typeof p==='string' && safeImg(p)){ try{ await rkPicPut(x.id, p); rkPics[x.id]=p; x.photo=true; }catch(_){} }
    else if(x.photo && !(await rkPicGet(x.id))) x.photo=false;
  }
  rkSyncGroups(); rkSave(); return {add, upd};
}
async function rkMergeStored(d, pics){ rkLoad(); const r=await rkMerge(d, pics); if($('renrakuOverlay') && isDlgOpen('renrakuOverlay')) rkRender(); return r; }
async function rkWipe(){
  if(!rk.items.length){ toast('入っている人はいません'); return; }
  if(!await appConfirm('この連絡帳の '+rk.items.length+'人を ぜんぶ消しますか？（写真も）\nスマホの連絡先は消えません。グループ・自分の項目の作りは残ります。','ぜんぶ消す','やめる')) return;
  for(const x of rk.items) if(x.photo) rkPicDel(x.id);
  rk.items=[]; rk.notDup=[]; for(const k in rkPics) delete rkPics[k]; rkSel=null; rkSave(); rkCloseSub(); rkRender(); toast('消しました');
}

/* ── 同じ人をさがす ── */
function rkOpenDups(){
  const G=rkDupGroups(); rkDupCache=G;
  const back=rkScrUp.length ? '<button class="rk-btn sub" onclick="RK.tidyBack()">← 🧹 整理に もどる</button>' : '';   // 🧹 整理 から開いたとき（v566）
  const one=x=>`<div class="rk-dupone"><b>${esc(rkName(x))}</b>${rkYomi(x)?'<small>　'+esc(rkYomi(x))+'</small>':''}<div class="rk-note" style="margin:2px 0">${esc([...x.tels.map(t=>t.v), ...x.mails.map(m=>m.v), x.org].filter(Boolean).join('　'))||'（電話・メールなし）'}</div></div>`;
  rkScr('🔍 同じ人をさがす', G.length
    ? `<div class="rk-msg">同じ電話・メール・名前の人が <b>${G.length}</b>組 あります。\n「いっしょにする」と、電話やメールを1人にまとめます（足りない所を足す）。名前は どちらか1つにします（足しません）。</div>
       ${G.length>1?`<button class="rk-btn sub" onclick="RK.dupAll()">ぜんぶ いっしょにする（${G.length}組）</button>`:''}
       ${G.map((ids,gi)=>`<div class="rk-dup" data-dg="${gi}">${ids.map(rkFind).filter(Boolean).map(one).join('')}${rkDupNmHtml(ids)}<div class="rk-dupbtns"><button class="rk-btn" onclick="RK.dupMerge(${gi})">いっしょにする</button><button class="rk-btn sub" onclick="RK.dupSkip(${gi})">別の人</button></div></div>`).join('')}${back}`
    : '<div class="rk-msg">同じ人は見つかりませんでした。</div>'+(back||'<button class="rk-btn" onclick="RK.closeScr()">とじる</button>'));
}
/* 名前が ちがう組は「のこす名前」を えらべる（v566。はじめは 姓と名に分かれた・長い方。ほかの名前は メモに「別の名前：」で残る） */
function rkDupNmHtml(ids){
  const xs=ids.map(rkFind).filter(Boolean), nms=[];
  xs.forEach(x=>{ const k=rkNorm(rkPerNm(x)); if(k && !nms.some(n=>n.k===k)) nms.push({k, id:x.id, l:rkPerNm(x)}); });
  if(nms.length<2) return '';
  const cur=rkFind(rkDupNameId(xs)), ck=cur ? rkNorm(rkPerNm(cur)) : '';
  return `<div class="rk-dupnm"><span>のこす名前</span>${nms.map(n=>`<button type="button" class="${n.k===ck?'on':''}" data-nm="${n.id}" onclick="RK.dupNm(${esc(JSON.stringify(ids.join(',')))},'${n.id}')">${esc(n.l)}</button>`).join('')}<small>ほかの名前は メモに残ります</small></div>`;
}
function rkDupNmSet(key, id){
  rkDupNm[key]=id;
  const gi=rkDupCache.findIndex(ids=>ids.join(',')===key), box=document.querySelector(`#rkScrBody .rk-dup[data-dg="${gi}"]`); if(!box) return;
  const k=rkNorm(rkPerNm(rkFind(id)||{}));
  box.querySelectorAll('[data-nm]').forEach(b=>{ const x=rkFind(b.dataset.nm); b.classList.toggle('on', !!x && rkNorm(rkPerNm(x))===k); });
}
/* いっしょにしたときに残る名前（その人の id）：のこす名前を えらんでいれば それ */
const rkDupBase=xs=>xs.slice().sort((a,b)=>rkInfoScore(b)-rkInfoScore(a))[0];
function rkDupNameId(xs){
  const want=rkDupNm[xs.map(x=>x.id).join(',')];
  if(want && xs.some(x=>x.id===want)) return want;
  const base=rkDupBase(xs); let cur=base;
  xs.forEach(x=>{ if(x!==base && rkNameFrom(cur, x)===x) cur=x; });
  return cur.id;
}
async function rkDupMergeIds(ids){
  const xs=ids.map(rkFind).filter(Boolean); if(xs.length<2) return;
  const base=rkDupBase(xs), want=rkDupNm[ids.join(',')], pick=want ? xs.find(x=>x.id===want) : null;
  delete rkDupNm[ids.join(',')];
  if(pick && pick!==base){   // えらんだ名前（と よみ）を 先に もらう。いままでの名前は 下の rkMergeInto で メモに
    const old={fam:base.fam, giv:base.giv, fn:base.fn, famK:base.famK, givK:base.givK};
    Object.assign(base, {fam:pick.fam, giv:pick.giv, fn:pick.fn}, rkYomiFrom(pick, old));
    const on=rkPerNm(old); if(on && !rkNorm(rkPerNm(base)).includes(rkNorm(on))){ const l='別の名前：'+on; if(!base.note.split('\n').includes(l)) base.note=(base.note?base.note+'\n':'')+l; }
  }
  for(const x of xs){ if(x===base) continue;
    rkMergeInto(base, x, !!pick);
    if(x.photo){ if(!base.photo){ const d=await rkPic(x.id); if(d){ try{ await rkPicPut(base.id, d); rkPics[base.id]=d; base.photo=true; }catch(_){} } } rkPicDel(x.id); delete rkPics[x.id]; }
    rk.items=rk.items.filter(i=>i!==x);
  }
  base.updated=today(); base.ts=Date.now();
}
async function rkDupMerge(gi){ const ids=rkDupCache[gi]; if(!ids) return; await rkDupMergeIds(ids); rkSave(); rkRender(); rkOpenDups(); toast('いっしょにしました'); }
function rkDupSkip(gi){ const ids=rkDupCache[gi]; if(!ids) return; for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){ const k=[ids[i],ids[j]].sort().join('|'); if(!rk.notDup.includes(k)) rk.notDup.push(k); } rkSave(); rkOpenDups(); }
async function rkDupAll(){
  const G=rkDupCache.slice(); if(!G.length) return;
  if(!await appConfirm(G.length+'組を ぜんぶ いっしょにしますか？\n（電話・メール・メモなどは足し合わせます）','いっしょにする','やめる')) return;
  for(const ids of G) await rkDupMergeIds(ids);
  rkSave(); rkRender(); rkOpenDups(); toast(G.length+'組を いっしょにしました');
}

/* ── 🧹 整理（v566）：1000人ほどの連絡帳を 早く片づける ──
   ・絞りこみ（rkGrp）：'!none' 📵 電話もメールもない人・'!noname' ❓ 名前のない人（番号・会社だけ）・'!todo' 🗂 まだ仕分けていない人・'!trash' 🗑 消す候補。
     一覧の上の帯から「1人ずつ見る」「ぜんぶ 消す候補に」「ぜんぶ えらぶ」（消す候補は「ぜんぶ消す」「ぜんぶ もどす」「書き出して控え」）。
   ・🗂 1人ずつ仕分ける：1人ずつ大きく出し、「✓ 残す」「🗑 消す候補」「⏭ あとで」・グループ・色・★ を押すだけ。↶ ひとつ戻る・続きから（rk.soAt）。
     x.seen（見おわった）・x.del（消す候補）は この連絡帳の中の しるし。消す候補は すぐには消さず、あとで まとめて消す。
   ・🏢 会社ごとに グループを作る：会社名が同じ 2人以上を、会社の名前の グループ（🏢）に入れる。「株式会社」などは 取って そろえる。 */
const RK_SP={ '!none':['📵','電話もメールもない人', x=>!x.tels.length && !x.mails.length],
  '!noname':['❓','名前のない人', x=>!rkPerNm(x) && !x.nick],
  '!todo':['🗂','まだ仕分けていない人', x=>!x.seen && !x.del],
  '!trash':['🗑','消す候補', x=>!!x.del] };
const rkSpCount=k=>RK_SP[k] ? rk.items.filter(RK_SP[k][2]).length : 0;
const rkGrpIsName=g=>!!g && g!=='★' && g!=='?' && !RK_SP[g];
const RK_SP_WHY={'!none':'住所・メモだけの人や、番号を消した人です。要らなければ 消す候補に。',
  '!noname':'電話番号・会社名だけで 名前のない人です。✏ 直す で名前を入れるか、要らなければ 消す候補に。',
  '!todo':'「🗂 1人ずつ仕分ける」で まだ見ていない人です。',
  '!trash':'仕分けで「消す候補」にした人です。まだ消えていません（スマホの連絡先も そのままです）。'};
/* 一覧で 🧹 の絞りこみを えらんだときの 上の帯 */
function rkSpBarHtml(n){
  const sp=RK_SP[rkGrp]; if(!sp) return '';
  const b=(fn,l,cls)=>`<button type="button"${cls?` class="${cls}"`:''} onclick="${fn}">${l}</button>`;
  const btns=rkGrp==='!trash'
    ? b('RK.trashDel()','🗑 ぜんぶ消す','del')+b('RK.trashBack()','↩ ぜんぶ もどす','sub')+b("RK.openExport()",'📇 消す前に 書き出して控え','sub')
    : b("RK.soStart('list')",'▶ 1人ずつ 見る')+(rkGrp!=='!todo'?b('RK.spTrash()','🗑 ぜんぶ 消す候補に','sub'):'')+b('RK.spSel()','☑ ぜんぶ えらぶ','sub');
  return `<div class="rk-ybar rk-spbar"><span>${sp[0]} ${esc(sp[1])} <b>${n}</b>人</span>${btns}<small>${esc(RK_SP_WHY[rkGrp])}</small></div>`;
}
function rkSpGo(k){
  if(!RK_SP[k]) return;
  rkCloseScr(); rkSel=null; rkPaint=null; rkVoice=null;
  rkGrp=k; rkCol=''; rkQ=''; if($('rkFind')) $('rkFind').value='';
  rkRender(); if($('rkList')) $('rkList').scrollTop=0;
}
function rkSpTrash(){
  const xs=rkVisible().filter(x=>!x.del); if(!xs.length){ toast('みんな もう 消す候補です'); return; }
  xs.forEach(x=>{ x.del=true; x.seen=true; });
  rkSave(); rkRender();
  toast(xs.length+'人を 消す候補にしました（まだ消えていません。🧹 整理 の「🗑 消す候補」で まとめて消す／もどす が できます）', 5000);
}
function rkSpSel(){ rkPaint=null; rkSel=new Set(rkVisible().map(x=>x.id)); rkRender(); }
async function rkTrashDel(){
  const xs=rk.items.filter(x=>x.del); if(!xs.length){ toast('消す候補は いません'); return false; }
  if(!await appConfirm('消す候補の '+xs.length+'人を この連絡帳から消しますか？\n（スマホの連絡先は消えません。心配なら 先に「📇 書き出して控え」を作っておくと 戻せます）','消す','やめる')) return false;
  const ids=new Set(xs.map(x=>x.id));
  xs.forEach(x=>{ if(x.photo){ rkPicDel(x.id); delete rkPics[x.id]; } });
  rk.items=rk.items.filter(x=>!ids.has(x.id));
  if(rkSel) ids.forEach(id=>rkSel.delete(id));
  rkSave(); rkRender(); if(rkSo && isDlgOpen('rkSortOverlay')) rkSoRender();
  toast(xs.length+'人 消しました'); return true;
}
function rkTrashBack(){
  const xs=rk.items.filter(x=>x.del); if(!xs.length) return;
  xs.forEach(x=>{ delete x.del; x.seen=true; });
  rkSave(); rkRender(); toast(xs.length+'人を 消す候補から もどしました（残す人に なります）', 3500);
}
/* 🧹 整理の画面 */
function rkOpenTidy(){
  const n=rk.items.length; if(!n){ toast('入っている人はいません'); return; }
  rkCloseSub(); rkScrUpClear();
  const dups=rkDupGroups().length, done=rk.items.filter(x=>x.seen||x.del).length, todo=n-done, pct=Math.round(done/n*100);
  const shown=rkVisible().length, filt=!!(rkQ.trim()||rkGrp||rkCol) && shown>0 && shown<n, orgs=rkOrgGroups().length;
  const row=k=>{ const [ic,l]=RK_SP[k], c=rkSpCount(k);
    return `<button type="button" class="rk-tdrow" data-sp="${k}" onclick="RK.spGo('${k}')" ${c?'':'disabled'}><span class="ic">${ic}</span><span class="l">${esc(l)}${k==='!noname'?'<small>番号・会社だけ</small>':''}</span><b>${c}</b><small>人</small></button>`; };
  rkScr('🧹 連絡帳を整理する', `<div class="rk-msg">いま <b>${n}</b>人。①から順に やると 早く片づきます。</div>
    <div class="rk-sec">① 同じ人を まとめる</div>
    ${dups?`<button class="rk-btn" onclick="RK.tidyGo('dups')">🔍 同じ人かもしれない組 ${dups}組 → 見る</button>`:'<div class="rk-note">✓ 同じ人は 見つかりませんでした。</div>'}
    <div class="rk-sec">② 要らなそうな人を 見つける</div>
    <div class="rk-note">押すと 一覧が その人だけに なります。上の帯から「1人ずつ見る」「ぜんぶ 消す候補に」「ぜんぶ えらぶ」が できます。</div>
    <div class="rk-tdlist">${row('!none')}${row('!noname')}${row('!trash')}</div>
    <div class="rk-sec">③ 1人ずつ 仕分ける</div>
    <div class="rk-sobar" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <div class="rk-note" style="margin-top:4px" id="rkTdProg">仕分けた <b>${done}</b> ／ ${n}人${todo?'（あと '+todo+'人）':'　🎉 ぜんぶ 見おわりました'}</div>
    ${todo?`<button class="rk-btn" onclick="RK.soStart('todo')">▶ ${done?'続きから':'はじめから'} 仕分ける（あと ${todo}人）</button>`:''}
    ${filt?`<button class="rk-btn sub" onclick="RK.soStart('list')">いま 一覧に出ている ${shown}人を 仕分ける</button>`:''}
    ${todo && done?`<button class="rk-btn sub" onclick="RK.spGo('!todo')">🗂 まだ仕分けていない人を 一覧で見る（${todo}人）</button>`:''}
    <div class="rk-note">1人ずつ 大きく出します。「✓ 残す」「🗑 消す候補」・グループ・色を 押すだけで 分けられます。消す候補は すぐには消えず、あとで まとめて 消せます。</div>
    ${done?`<button class="rk-btn sub" onclick="RK.soReset()">↺ 仕分けを はじめから やりなおす</button>`:''}
    <div class="rk-sec">④ 会社ごとに グループを作る</div>
    ${orgs?`<button class="rk-btn sub" onclick="RK.tidyGo('org')">🏢 会社ごとに グループを作る（2人以上の会社 ${orgs}社）</button>`:'<div class="rk-note">2人以上いる会社は ありません（会社名が同じ人が 2人以上いると グループを作れます）。</div>'}
    <button class="rk-btn" onclick="RK.closeScr()">とじる</button>`);
}
/* 🧹 から 次の画面へ（端末の「戻る」で 🧹 に戻る） */
function rkTidyGo(k){ rkScrDeeper(rkOpenTidy); if(k==='org') rkOpenOrgGroups(); else rkOpenDups(); }
async function rkSoReset(){
  if(!await appConfirm('仕分けた しるしを 消して、はじめから やりなおしますか？\n（消す候補・グループ・色は そのままです）','やりなおす','やめる')) return;
  rk.items.forEach(x=>{ delete x.seen; }); rk.soAt=''; rkSave(); rkRender(); rkOpenTidy(); toast('はじめから 仕分けられます');
}

/* ── 🏢 会社ごとに グループを作る ── */
const RK_LEGAL=/株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|医療法人社団|医療法人財団|医療法人|社会福祉法人|学校法人|宗教法人|特定非営利活動法人|NPO法人|\((株|有|同|医|社|財)\)/g;
const rkOrgName=o=>String(o||'').normalize('NFKC').replace(RK_LEGAL,' ').replace(/\s+/g,' ').trim();
let rkOrgL=[];
/* 2人以上いる会社（人の多い順）。グループの名前は いちばん多い書き方（「株式会社」などを取る・20字まで） */
function rkOrgGroups(){
  const by=new Map();
  for(const x of rk.items){ const nm=rkOrgName(x.org), k=rkNorm(nm); if(!k) continue;
    if(!by.has(k)) by.set(k, {nm:{}, xs:[]}); const o=by.get(k); o.xs.push(x); o.nm[nm]=(o.nm[nm]||0)+1; }
  return [...by.values()].filter(o=>o.xs.length>=2)
    .map(o=>({n:line(Object.keys(o.nm).sort((a,b)=>o.nm[b]-o.nm[a] || a.length-b.length)[0], 20), xs:o.xs}))
    .sort((a,b)=>b.xs.length-a.xs.length || a.n.localeCompare(b.n,'ja'));
}
function rkOpenOrgGroups(){
  const L=rkOrgL=rkOrgGroups(); if(!L.length){ toast('2人以上いる会社は ありません'); return; }
  let room=Math.max(0, 60-rk.groups.length);
  const rows=L.map((o,i)=>{ const has=rk.groups.some(g=>g.n===o.n), all=o.xs.every(x=>x.groups.includes(o.n));
    const on=!all && (has || room>0); if(on && !has) room--;
    return `<label class="rk-chk rk-orgrow"><input type="checkbox" data-oi="${i}" ${on?'checked':''} ${all?'disabled':''}><span>🏢 ${esc(o.n)}</span><small>${o.xs.length}人${all?'・もう入っています':has?'・あるグループに入れる':''}</small></label>`; }).join('');
  rkScr('🏢 会社ごとに グループを作る', `<div class="rk-msg">会社名が同じ人を、会社の名前の グループに入れます（「株式会社」などは 取って そろえます）。</div>
    <div class="rk-note">グループは 60まで 作れます（いま ${rk.groups.length}）。作ったグループは 🧩 自分好みにする で 名前を直したり 消したり できます。</div>
    <div class="rk-tagrow"><button type="button" onclick="RK.orgAll(true)">ぜんぶ えらぶ</button><button type="button" onclick="RK.orgAll(false)">ぜんぶ 外す</button></div>
    <div class="rk-orglist">${rows}</div>
    <button class="rk-btn" onclick="RK.orgDo()">えらんだ会社の グループを作る</button>
    ${rkScrUp.length?'<button class="rk-btn sub" onclick="RK.tidyBack()">← 🧹 整理に もどる</button>':''}`);
}
function rkOrgAll(on){ document.querySelectorAll('#rkScrBody [data-oi]').forEach(c=>{ if(!c.disabled) c.checked=!!on; }); }
function rkOrgDo(){
  const on=[...document.querySelectorAll('#rkScrBody [data-oi]')].filter(c=>c.checked && !c.disabled).map(c=>rkOrgL[+c.dataset.oi]).filter(Boolean);
  if(!on.length){ toast('会社を えらんでください'); return; }
  const add=on.filter(o=>!rk.groups.some(g=>g.n===o.n));
  if(rk.groups.length+add.length>60){ toast('グループは 60まで です。あと '+Math.max(0,60-rk.groups.length)+' だけ 作れます（えらぶ会社を へらしてください）', 4500); return; }
  add.forEach(o=>rk.groups.push({n:o.n, ic:'🏢'}));
  let n=0;
  on.forEach(o=>o.xs.forEach(x=>{ if(!rkFind(x.id) || x.groups.includes(o.n) || x.groups.length>=20) return; x.groups.push(o.n); x.updated=today(); x.ts=Date.now(); n++; }));
  rkSave(); rkRender();
  if(rkScrUp.length){ rkScrUpPop(); rkOpenTidy(); } else rkCloseScr();
  toast(on.length+'社の グループに '+n+'人 入れました（「🏷 グループ」の並べ方で 見られます）', 4000);
}

/* ── 🗂 1人ずつ仕分ける ── */
let rkSo=null;   // {ids:仕分ける人（はじめに決める）, i:いまの人, undo:[{i,id,del,seen,at,a}], keep, del, later, scope:'todo'|'list'}
function rkSoStart(scope){
  if(!rk.items.length) return;
  let xs;
  if(scope==='list') xs=rkSortedKana(rkVisible());
  else { scope='todo';
    const all=rkSortedKana(rk.items), at=rk.soAt ? all.findIndex(x=>x.id===rk.soAt) : -1;   // 続きから：前に 最後に仕分けた人の 次から（ぐるっと回る）
    xs=all.slice(at+1).concat(all.slice(0,at+1)).filter(x=>!x.seen && !x.del); }
  if(!xs.length){ toast(scope==='list'?'一覧に だれも いません':'🎉 ぜんぶ 仕分けおわっています'); return; }
  rkCloseScr(); rkCloseSub(); rkSel=null; rkPaint=null;
  rkSo={ids:xs.map(x=>x.id), i:0, undo:[], keep:0, del:0, later:0, scope};
  const O=$('rkSortOverlay'); O.classList.toggle('rk-big', !!rk.big); O.classList.toggle('rk-tel1', rk.telSize===1); O.classList.toggle('rk-tel2', rk.telSize===2);
  openDlg('rkSortOverlay', rkSoEnd);
  rkSoRender();
}
function rkCloseSort(){ closeIf('rkSortOverlay', rkSoEnd); }
function rkSoEnd(){ rkSo=null; rkSave(); if($('rkList') && isDlgOpen('renrakuOverlay')) rkRender(); }
const rkSoCur=()=>{ if(!rkSo) return null; while(rkSo.i<rkSo.ids.length && !rkFind(rkSo.ids[rkSo.i])) rkSo.i++; return rkSo.i<rkSo.ids.length ? rkFind(rkSo.ids[rkSo.i]) : null; };
function rkSoRender(){
  if(!rkSo) return;
  const x=rkSoCur(), N=rkSo.ids.length, P=$('rkSoProg'), B=$('rkSoBody'), F=$('rkSoFoot');
  $('rkSoUndo').disabled=!rkSo.undo.length;
  const at=Math.min(rkSo.i, N);
  P.innerHTML=`<div class="rk-sobar" aria-hidden="true"><i style="width:${Math.round(at/N*100)}%"></i></div>
    <div class="rk-so-cnt"><span><b>${x?at+1:N}</b> ／ ${N}人</span><span>✓ 残す ${rkSo.keep}・🗑 消す候補 ${rkSo.del}・⏭ あとで ${rkSo.later}</span></div>`;
  if(!x){
    const nt=rk.items.filter(y=>y.del).length, todo=rk.items.filter(RK_SP['!todo'][2]).length;
    B.innerHTML=`<div class="rk-so-end"><div class="big">🎉</div><b>${rkSo.scope==='todo'&&!todo?'ぜんぶ 仕分けおわりました':'ここまで 仕分けました'}</b>
      <div class="rk-note">✓ 残す ${rkSo.keep}人・🗑 消す候補 ${rkSo.del}人・⏭ あとで ${rkSo.later}人</div>
      ${nt?`<button class="rk-btn del" onclick="RK.trashDel()">🗑 消す候補を まとめて消す（${nt}人）</button><button class="rk-btn sub" onclick="RK.soTrashList()">🗑 消す候補を 一覧で見る（もどす・書き出して控え）</button>`:''}
      ${todo?`<button class="rk-btn sub" onclick="RK.soStart('todo')">▶ まだ仕分けていない人を 続けて（${todo}人）</button>`:''}
      <button class="rk-btn" onclick="RK.soClose()">一覧に もどる</button></div>`;
    F.innerHTML=''; F.hidden=true; B.scrollTop=0; return;
  }
  F.hidden=false;
  B.innerHTML=rkSoCardHtml(x); B.scrollTop=0;
  F.innerHTML=`<div class="rk-selbtns rk-tabs rk-so-btns"><button class="del" onclick="RK.soDel()"><span>🗑</span>消す候補</button><button class="sub" onclick="RK.soLater()"><span>⏭</span>あとで</button><button class="keep" onclick="RK.soKeep()"><span>✓</span>残す（次へ）</button></div>`;
  if(x.photo) rkPic(x.id).then(d=>{ const a=$('rkSoAv'); if(a && d && safeImg(d) && rkSoCur()===x){ a.style.backgroundImage=`url("${d}")`; a.textContent=''; } });
}
function rkSoCardHtml(x){
  const row=(l,v,cls)=>`<div class="rk-row${cls?' '+cls:''}"><b>${esc(l)}</b><span>${v}</span></div>`, rows=[];
  x.tels.forEach(t=>rows.push(row(tName(TEL_T,t), esc(t.v), 'tel')));
  x.mails.forEach(m=>rows.push(row(tName(MAIL_T,m), esc(m.v))));
  x.adrs.forEach(a=>rows.push(row(tName(ADR_T,a), esc((a.zip?'〒'+a.zip+' ':'')+rkAdrText(a)))));
  if(x.bday) rows.push(row('誕生日', esc(rkBdayText(x.bday))));
  if(x.nick) rows.push(row('ニックネーム', esc(x.nick)));
  rk.fields.forEach(f=>{ if(x.cf[f.id]) rows.push(row(f.n, esc(x.cf[f.id]))); });
  if(x.note) rows.push(row('メモ', esc(x.note.split('\n').slice(0,4).join('\n'))));
  const flags=[x.del?'<span class="f del">🗑 消す候補</span>':'', (x.seen && !x.del)?'<span class="f ok">✓ 仕分けずみ</span>':'',
    (!rkPerNm(x) && !x.nick)?'<span class="f warn">❓ 名前なし</span>':'', (!x.tels.length && !x.mails.length)?'<span class="f warn">📵 電話・メールなし</span>':''].join('');
  const named=cOrd(), c=x.color;
  return `<div class="rk-so-card${x.del?' del':''}">
    <div class="rk-who"><span class="av" id="rkSoAv" style="background-color:${rkColor(x)}">${esc(rkInitial(x))}</span>
      ${rkYomi(x)?`<div class="k">${esc(rkYomi(x))}</div>`:''}<div class="n">${esc(rkName(x))}${x.fav?' <span class="fvc">★</span>':''}</div>
      ${(x.org||x.dept||x.title)?`<div class="c">${esc([x.org,x.dept,x.title].filter(Boolean).join(' '))}</div>`:''}
      ${c?`<span class="rk-cpill${ptCls(c)}" style="${swSt(c)}"><span>${esc(colFullD(c))}</span></span>`:''}</div>
    ${flags?`<div class="rk-so-flags">${flags}</div>`:''}
    <div class="rk-rows">${rows.join('')||'<div class="rk-note">（電話・メール・住所は 入っていません）</div>'}</div>
    <div class="rk-note" style="text-align:right">入れた日 ${fmtDay(x.added)}</div></div>
    <div class="rk-sec">🏷 グループ<small>押すと 入る／外れる</small></div>
    <div class="rk-tagrow" id="rkSoGrp">${rk.groups.map((g,i)=>`<button type="button" class="${x.groups.includes(g.n)?'on':''}" onclick="RK.soGrp(${i})">${esc((g.ic?g.ic+' ':'')+g.n)}</button>`).join('')}<button type="button" class="add" onclick="RK.soNewGrp()">＋ 新しく</button></div>
    <div class="rk-sec">🎨 色</div>
    <div class="rk-so-cols">${named.map(k=>`<button type="button" class="rk-sw${ptCls(k)}${c===k?' on':''}" data-c="${k}" style="${swSt(k)}" onclick="RK.soCol('${k}')"><span>${esc(colLabelD(k))}</span></button>`).join('')}
      <button type="button" class="rk-so-cb" onclick="RK.soColPick()">${c && !named.includes(c)?dotH(c)+esc(colFullD(c)):'🎨 ほかの色'}</button>${c?'<button type="button" class="rk-so-cb" onclick="RK.soCol(\'\')">✕ 色を外す</button>':''}</div>
    <div class="rk-so-mini"><button type="button" class="${x.fav?'on':''}" onclick="RK.soFav()">${x.fav?'★ よく使う':'☆ よく使う'}</button><button type="button" onclick="RK.soEdit()">✏ 直す（名前・電話など）</button></div>`;
}
/* 残す・消す候補・あとで → 次の人へ */
function rkSoNext(a){
  const x=rkSoCur(); if(!x) return;
  rkSo.undo.push({i:rkSo.i, id:x.id, del:!!x.del, seen:!!x.seen, at:rk.soAt, a});
  if(a==='keep'){ delete x.del; x.seen=true; rkSo.keep++; }
  else if(a==='del'){ x.del=true; x.seen=true; rkSo.del++; }
  else rkSo.later++;
  if(rkSo.scope==='todo') rk.soAt=x.id;
  rkSo.i++; rkSaveSoon(); rkSoRender();
}
function rkSoUndo(){
  if(!rkSo || !rkSo.undo.length) return;
  const u=rkSo.undo.pop(), x=rkFind(u.id);
  if(x){ if(u.del) x.del=true; else delete x.del; if(u.seen) x.seen=true; else delete x.seen; }
  if(u.a==='keep') rkSo.keep--; else if(u.a==='del') rkSo.del--; else rkSo.later--;
  if(rkSo.scope==='todo') rk.soAt=u.at;
  rkSo.i=u.i; rkSaveSoon(); rkSoRender();
  toast('ひとつ戻しました'+(x?'（'+rkName(x)+'）':''));
}
function rkSoGrp(i){
  const x=rkSoCur(), g=rk.groups[i]; if(!x || !g) return;
  if(x.groups.includes(g.n)) x.groups=x.groups.filter(y=>y!==g.n);
  else { if(x.groups.length>=20){ toast('グループは 1人 20まで です'); return; } x.groups.push(g.n); }
  x.updated=today(); x.ts=Date.now(); rkSaveSoon();
  document.querySelectorAll('#rkSoGrp button[onclick^="RK.soGrp("]').forEach((b,j)=>{ const h=rk.groups[j]; if(h) b.classList.toggle('on', x.groups.includes(h.n)); });
}
async function rkSoNewGrp(){
  const x=rkSoCur(); if(!x) return;
  const n=line(await appPrompt('グループの名前（例：家族・町内会・仕事）',''),20); if(!n || !rkSo) return;
  if(!rk.groups.some(g=>g.n===n)){ if(rk.groups.length>=60){ toast('グループは 60まで です'); return; } rk.groups.push({n, ic:''}); }
  if(!x.groups.includes(n) && x.groups.length<20){ x.groups.push(n); x.updated=today(); x.ts=Date.now(); }
  rkSave(); rkSoRender();
}
/* 色（名前を付けた色は 押すだけ。もう一度押すと 外れる）。色は「直した日」を 変えない（🎨 色分け と同じ） */
function rkSoCol(k){
  const x=rkSoCur(); if(!x) return;
  x.color=(k && x.color!==k && ckOk(k)) ? k : ''; rkCGrpSync(x); rkSaveSoon(); rkSoRender();
}
async function rkSoColPick(){
  const x=rkSoCur(); if(!x) return;
  const k=await rkPickColor('🎨 '+rkName(x)+' の色', x.color); if(k===null || !rkSo || rkSoCur()!==x) return;
  x.color=k; rkCGrpSync(x); rkSave(); rkSoRender();
}
function rkSoFav(){ const x=rkSoCur(); if(!x) return; x.fav=!x.fav; x.updated=today(); x.ts=Date.now(); rkSaveSoon(); rkSoRender(); }

/* ── 🎨 自分好みにする（グループ・自分の項目・一覧の出し方・文字の大きさ） ── */
function rkOpenCustom(){
  const cnt={}, ccnt={}; rk.items.forEach(x=>{ x.groups.forEach(g=>{ cnt[g]=(cnt[g]||0)+1; }); if(x.color) ccnt[x.color]=(ccnt[x.color]||0)+1; });
  const gRows=rk.groups.map((g,i)=>`<div class="rk-cus"><button class="ic" onclick="RK.gIcon(${i})" aria-label="絵文字をえらぶ">${esc(g.ic||'＋')}</button><span class="nm">${esc(g.n)}<small>${cnt[g.n]||0}人</small></span>`
    +`<button onclick="RK.gRen(${i})">名前</button><button onclick="RK.gMove(${i},-1)" aria-label="上へ" ${i?'':'disabled'}>↑</button><button onclick="RK.gMove(${i},1)" aria-label="下へ" ${i<rk.groups.length-1?'':'disabled'}>↓</button><button onclick="RK.gDel(${i})" aria-label="消す">🗑</button></div>`).join('');
  const gPre=GROUP_PRESETS.filter(([n])=>!rk.groups.some(g=>g.n===n));
  const fRows=rk.fields.map((f,i)=>`<div class="rk-cus"><span class="nm">${esc(f.n)}<small>${f.ty==='pick'?'えらぶ：'+esc(f.op.join('・')):'文字で入れる'}</small></span>`
    +`<button onclick="RK.fRen(${i})">直す</button><button onclick="RK.fMove(${i},-1)" aria-label="上へ" ${i?'':'disabled'}>↑</button><button onclick="RK.fMove(${i},1)" aria-label="下へ" ${i<rk.fields.length-1?'':'disabled'}>↓</button><button onclick="RK.fDel(${i})" aria-label="消す">🗑</button></div>`).join('');
  const fPre=FIELD_PRESETS.map((p,i)=>[p,i]).filter(([p])=>!rk.fields.some(f=>f.n===p[0]));
  const subs=[['tel','電話番号'],['org','会社・役職'],['group','グループ'],['note','メモの1行目']].concat(rk.fields.map(f=>['cf:'+f.id, f.n])).concat([['none','出さない']]);
  rkScr('🧩 自分好みにする', `
    <div class="rk-sec" style="border:0;margin-top:0;padding-top:0">🏷 グループ</div>
    ${gRows||'<div class="rk-note">まだありません。</div>'}
    <button class="rk-btn sub" onclick="RK.gAdd()">＋ グループを作る</button>
    ${gPre.length?`<div class="rk-note">よく使うグループ（押すと作ります）</div><div class="rk-tagrow">${gPre.map(([n,ic])=>`<button type="button" onclick="RK.gPreset(${esc(JSON.stringify(n))},${esc(JSON.stringify(ic))})">${esc(ic+' '+n)}</button>`).join('')}</div>`:''}
    <div class="rk-sec">🧩 自分の項目</div>
    <div class="rk-note">スマホの連絡先にない項目を足せます（間柄・年賀状など）。「えらぶ」にすると、押すだけで入れられます。</div>
    ${fRows||''}
    <button class="rk-btn sub" onclick="RK.fAdd()">＋ 項目を作る</button>
    ${fPre.length?`<div class="rk-note">よく使う項目（押すと作ります）</div><div class="rk-tagrow">${fPre.map(([p,i])=>`<button type="button" onclick="RK.fPreset(${i})">${esc(p[0])}</button>`).join('')}</div>`:''}
    <div class="rk-sec">🎨 色分けの色（名前・No.・並ぶ順番）</div>
    <div class="rk-note">色（24色）と 背景（無地・ストライプ・水玉・グラデーション・チェック・波）を組み合わせて 名前を付けると、ここと 🔢 No.・並ぶ順番に出ます（例：赤＝要連絡、緑・水玉＝年賀状）。押すと 名前を直したり、名前はそのままで 色・背景を変えたり できます。</div>
    ${cOrd().length?`<div class="rk-cgrid">${cOrd().map(k=>`<button type="button" data-c="${k}" onclick="RK.colEdit('${k}',true)">${dotH(k,true)}<span><b class="no">No.${cNo(k)}</b> ${esc(rk.colors[k])}</span><small>${ccnt[k]||0}人</small></button>`).join('')}</div>`:'<div class="rk-note">まだ 名前を付けた色は ありません。</div>'}
    <button class="rk-btn sub" onclick="RK.cAddName(true)">＋ 色に名前を付ける（色と背景をえらぶ）</button>
    <button class="rk-btn sub" onclick="RK.cOrder(true)">🔢 色の No.・並ぶ順番を決める（上から／下から）</button>
    <label class="rk-chk"><input type="checkbox" id="rkCGrp" ${rk.cgrp?'checked':''} onchange="RK.setCGrp(this.checked)"> 色の名前を グループにも入れる（色を付けると その色の名前のグループに入り、ほかの色の名前のグループからは 外れます）</label>
    <div class="rk-sec">📋 並べ方のボタンの順番</div>
    <div class="rk-note">上の「あ よみ順・🏷 グループ・🏢 会社・🎨 色・🕘 新しい」の順番を変えられます。えらんでいる並べ方の右の <b>⇅</b> を押すと、上から／下から が入れかわります。</div>
    ${vOrd().map((k,i,a)=>`<div class="rk-cus" data-vo="${k}"><span class="nm">${esc(VIEWS.find(v=>v[0]===k)[1])}</span><button onclick="RK.vMove('${k}',-1)" aria-label="上へ" ${i?'':'disabled'}>↑</button><button onclick="RK.vMove('${k}',1)" aria-label="下へ" ${i<a.length-1?'':'disabled'}>↓</button></div>`).join('')}
    <div class="rk-sec">📋 一覧の 名前の下に出すもの</div>
    <div class="rk-tagrow">${subs.map(([v,l])=>`<button type="button" class="${rk.sub===v?'on':''}" onclick="RK.setSub(${esc(JSON.stringify(v))})">${esc(l)}</button>`).join('')}</div>
    <label class="rk-chk"><input type="checkbox" id="rkLMemo" ${rk.lmemo?'checked':''} onchange="RK.setLMemo(this.checked)"> 📝 メモも その下に出す（名前を押した画面の メモ。2行まで）</label>
    <div class="rk-sec">あ ふりがな（よみ）</div>
    <div class="rk-tagrow" id="rkFuriSet">${[['','出す'],['list','一覧では 出さない'],['off','出さない（名前を押した画面も）']].map(([v,l])=>`<button type="button" data-fu="${v}" class="${rk.furi===v?'on':''}" onclick="RK.setFuri('${v}')">${l}</button>`).join('')}</div>
    <div class="rk-note" style="margin-top:2px">出さなくても、よみで さがしたり あいうえお順に 並べたりは できます。</div>
    <div class="rk-sec">🔠 文字の大きさ</div>
    <div class="rk-note" style="margin-bottom:0">名前</div>
    <div class="rk-tagrow" id="rkBigSet"><button type="button" class="${rk.big?'':'on'}" onclick="RK.setBig(false)">ふつう</button><button type="button" class="${rk.big?'on':''}" onclick="RK.setBig(true)">大きく</button></div>
    <div class="rk-note" style="margin-bottom:0">電話番号だけ（一覧の名前の下・見る画面）</div>
    <div class="rk-tagrow" id="rkTelSet">${[[0,'ふつう'],[1,'大きく'],[2,'もっと大きく']].map(([v,l])=>`<button type="button" data-ts="${v}" class="${rk.telSize===v?'on':''}" onclick="RK.setTelSize(${v})">${l}</button>`).join('')}</div>
    <div class="rk-sec">⬇ 下のボタン（入れる・色分け・えらぶ・スマホに戻す）</div>
    <div class="rk-tagrow" id="rkBarSet">${[['fold','◀ 右下に たたむ（押すと出る）'],['show','いつも出す']].map(([v,l])=>`<button type="button" data-ab="${v}" class="${rk.addbar===v?'on':''}" onclick="RK.setAddBar('${v}')">${l}</button>`).join('')}</div>
    <div class="rk-sec">📇 スマホに戻すとき</div>
    <label class="rk-chk"><input type="checkbox" ${rk.noteCf?'checked':''} onchange="RK.setNoteCf(this.checked)"> 自分の項目・色分けをメモ欄にも書く（「［間柄］叔父」「［色分け］赤」の形。スマホを通っても消えない）</label>
    <button class="rk-btn" onclick="RK.closeScr()">できあがり</button>`, ()=>{ rkRender(); if(rkEd && $('rkEdBody') && isDlgOpen('rkEdOverlay')){ rkEdRe(); } });
}
const rkCustomRe=()=>{ rkSave(); rkOpenCustom(); };
async function rkGAdd(){ const n=line(await appPrompt('グループの名前（例：家族・町内会・野球部）',''),20); if(!n) return; if(rk.groups.some(g=>g.n===n)){ toast('「'+n+'」はもうあります'); return; } rk.groups.push({n, ic:''}); rkCustomRe(); }
function rkGPreset(n, ic){ if(!rk.groups.some(g=>g.n===n)) rk.groups.push({n:line(n,20), ic:line(ic,8)}); rkCustomRe(); }
async function rkGRen(i){
  const g=rk.groups[i]; if(!g) return;
  const n=line(await appPrompt('グループの新しい名前', g.n),20); if(!n || n===g.n) return;
  if(rk.groups.some(h=>h.n===n)){ toast('「'+n+'」はもうあります'); return; }
  rk.items.forEach(x=>{ x.groups=x.groups.map(y=>y===g.n?n:y); });
  if(rkGrp===g.n) rkGrp=n;
  g.n=n; rkCustomRe();
}
async function rkGIcon(i){
  const g=rk.groups[i]; if(!g) return;
  const html=`<div class="rk-emo">${GROUP_ICONS.map((e,j)=>`<button type="button" data-r="${100+j}">${e}</button>`).join('')}</div>`;
  const r=await rkAsk('🏷 「'+g.n+'」の絵文字', '', ['絵文字なし','やめる'], html);
  if(r>=100 && GROUP_ICONS[r-100]) g.ic=GROUP_ICONS[r-100];
  else if(r===0) g.ic='';
  else return;
  rkCustomRe();
}
async function rkGMove(i, d){ const j=i+d; if(j<0 || j>=rk.groups.length) return; const t=rk.groups[i]; rk.groups[i]=rk.groups[j]; rk.groups[j]=t; rkCustomRe(); }
async function rkGDel(i){
  const g=rk.groups[i]; if(!g) return; const n=rk.items.filter(x=>x.groups.includes(g.n)).length;
  if(!await appConfirm('グループ「'+g.n+'」を消しますか？'+(n?'\n（'+n+'人は、このグループから外れるだけで、消えません）':''),'消す','やめる')) return;
  rk.items.forEach(x=>{ x.groups=x.groups.filter(y=>y!==g.n); }); rk.groups.splice(i,1); if(rkGrp===g.n) rkGrp=''; rkCustomRe();
}
async function rkFAsk(f){
  const n=line(await appPrompt('項目の名前（例：間柄・年賀状・子どもの名前）', f?f.n:''),20); if(!n) return null;
  if(rk.fields.some(y=>y.n===n && y!==f)){ toast('「'+n+'」はもうあります'); return null; }
  const r=await rkAsk('🧩 「'+n+'」の入れ方', '', ['文字で入れる','えらぶ（選択肢から押す）','やめる']);
  if(r!==0 && r!==1) return null;
  let op=[];
  if(r===1){ const s=await appPrompt('選択肢を「・」か「,」で区切って入れてください（例：送る・もらう・喪中）', f&&f.op.length?f.op.join('・'):''); op=String(s||'').split(/[・,，、\/]/).map(v=>line(v,20)).filter(Boolean).slice(0,12); if(!op.length){ toast('選択肢を入れてください'); return null; } }
  return {n, ty:r===1?'pick':'text', op};
}
async function rkFAdd(){ if(rk.fields.length>=30){ toast('項目は30まで作れます'); return; } const v=await rkFAsk(null); if(!v) return; rk.fields.push(Object.assign({id:rkNewFieldId()}, v)); rkCustomRe(); }
function rkFPreset(i){ const p=FIELD_PRESETS[i]; if(!p || rk.fields.some(f=>f.n===p[0]) || rk.fields.length>=30) return; rk.fields.push({id:rkNewFieldId(), n:p[0], ty:p[1], op:p[2].slice()}); rkCustomRe(); }
async function rkFRen(i){ const f=rk.fields[i]; if(!f) return; const v=await rkFAsk(f); if(!v) return; Object.assign(f, v); rkCustomRe(); }
function rkFMove(i, d){ const j=i+d; if(j<0 || j>=rk.fields.length) return; const t=rk.fields[i]; rk.fields[i]=rk.fields[j]; rk.fields[j]=t; rkCustomRe(); }
async function rkFDel(i){
  const f=rk.fields[i]; if(!f) return; const n=rk.items.filter(x=>x.cf[f.id]).length;
  if(!await appConfirm('項目「'+f.n+'」を消しますか？'+(n?'\n（'+n+'人に入れた「'+f.n+'」も消えます）':''),'消す','やめる')) return;
  rk.items.forEach(x=>{ delete x.cf[f.id]; }); rk.fields.splice(i,1); if(rk.sub==='cf:'+f.id) rk.sub='tel'; rkCustomRe();
}
function rkSetSub(v){ rk.sub=v; rkCustomRe(); }
function rkSetBig(b){ rk.big=!!b; rkCustomRe(); }
/* ふりがな（よみ）を 出す／一覧では出さない／出さない（v555） */
function rkSetFuri(v){
  rk.furi=['list','off'].includes(v)?v:''; rkSave(); rkRender(); if(rkViewId && isDlgOpen('rkViewOverlay')) rkView(rkViewId);
  document.querySelectorAll('#rkFuriSet [data-fu]').forEach(b=>b.classList.toggle('on', b.dataset.fu===rk.furi));
  toast(rk.furi==='off' ? 'ふりがなを 出さないように しました' : rk.furi==='list' ? '一覧では ふりがなを 出さないように しました' : 'ふりがなを 出すように しました');
}
/* 📝 メモを 一覧にも出す（v555） */
function rkSetLMemo(on){ rk.lmemo=!!on; rkSave(); rkRender(); }
function rkSetNoteCf(b){ rk.noteCf=!!b; rkSave(); }

/* ── 🎤 声でさがす ── */
function rkStopListen(){ if(rkRec){ try{ rkRec.abort(); }catch(_){} rkRec=null; } const b=$('rkFindMic'); if(b) b.classList.remove('on'); }
function rkListen(){
  if(rkRec){ rkStopListen(); return; }
  const C=typeof speechRecCtor==='function' ? speechRecCtor() : (window.SpeechRecognition||window.webkitSpeechRecognition);
  if(!C){ toast('この端末では声を聞き取れません。文字で入れてください'); return; }
  rkYLoad();   // よみの辞書（声を よみに直して さがす。v556）を 話しているあいだに読む
  const r=new C(); r.lang='ja-JP'; r.interimResults=true; r.maxAlternatives=5;
  let heard='', alts=[];
  r.onresult=e=>{ const R=[...e.results]; heard=R.map(x=>x[0].transcript).join('');
    const n=Math.max(1, ...R.map(x=>x.length)); alts=[]; for(let i=1;i<n;i++) alts.push(R.map(x=>(x[i]||x[0]).transcript).join(''));   // 聞き取りの ほかの候補
    $('rkFind').value=heard; };
  r.onerror=e=>{ if(e.error==='not-allowed') toast('マイクを使えません。ブラウザの設定でマイクを許可してください'); };
  r.onend=()=>{ rkRec=null; const b=$('rkFindMic'); if(b) b.classList.remove('on'); rkVoiceGo(heard, alts); };
  rkRec=r; $('rkFindMic').classList.add('on');
  try{ r.start(); }catch(_){ rkStopListen(); }
}

window.RK={ menu:rkOpenMenu, setQ:v=>{ rkQ=String(v||''); if(rkVoice && rkVoice.q!==rkQ) rkVoice=null; rkRender(); }, setView:v=>{ rk.view=v; rkSave(); rkRender(); $('rkList').scrollTop=0; },
  setGrp:g=>{ rkGrp=rkGrp===g?'':g; rkRender(); $('rkList').scrollTop=0; }, setCol:c=>{ rkCol=rkCol===c?'':c; rkRender(); $('rkList').scrollTop=0; }, tap:rkTap, view:rkView, idx:rkJump,
  closeView:rkCloseView, closeEd:rkCloseEd, closeSub:rkCloseSub, closeScr:rkCloseScr, closeAsk:rkCloseAsk,
  edit:rkEdit, edType:rkEdType, edAdd:rkEdAdd, edDel:rkEdDel, edPick:rkEdPick, edNewGroup:rkEdNewGroup, edPhoto:rkEdPhoto, edPicked:rkEdPicked, edSave:rkEdSave,
  fav:rkFav, remove:rkRemove, share:rkShare, oneVcf:rkOneVcf, viewColor:rkViewColor, edCol:rkEdCol,
  selStart:()=>{ rkPaint=null; rkSelStart(); }, selEnd:rkSelEnd, selAll:rkSelAll, selGroup:rkSelGroup, selDel:rkSelDel, selColor:rkSelColor,
  paintStart:rkPaintStart, paintEnd:rkPaintEnd, paintPick:rkPaintPick, paintBase:rkPaintBase, paintPat:rkPaintPat, paintUndo:rkPaintUndo, colName:rkColName, colEdit:rkColEdit, colRecolor:rkColRecolor, cAddName:rkCAddName,
  cpPick:rkCPPick, cpBase:rkCPBase, cpPat:rkCPPat,
  table:rkOpenTbl, closeTbl:rkCloseTbl, tQ:v=>{ if(!rkT) return; rkTCommit(); rkT.q=String(v||''); rkTRender(); $('rkTWrap').scrollTop=0; }, tAdd:rkTAdd, tCols:rkTColsPick, tUndo:rkTUndo,
  tNameW:w=>{ if(!rkT) return; rkTSetW('name', w); document.querySelectorAll('#rkAskBody [data-nw]').forEach(b=>b.classList.toggle('on', +b.dataset.nw===rkTNameW())); },
  tWFit:()=>{ if(!rkT) return; rkTCommit(); ['name'].concat(rkT.cols.map(a=>a[0])).forEach(c=>{ const w=rkTFitW(c), def=c==='name'?138:((tAllCols().find(a=>a[0]===c)||[])[2]||120); if(w>def) rk.tw[c]=Math.min(TW_MAX,w); else delete rk.tw[c]; }); rkSave(); rkTReRender();
    document.querySelectorAll('#rkAskBody [data-nw]').forEach(b=>b.classList.toggle('on', +b.dataset.nw===rkTNameW())); toast('幅を 中身に合わせました'); },
  tWReset:()=>{ if(!rkT) return; rk.tw={}; rkSave(); rkTReRender(); document.querySelectorAll('#rkAskBody [data-nw]').forEach(b=>b.classList.toggle('on', +b.dataset.nw===138)); toast('幅を もとに戻しました'); },
  tMore:rkTMore, tAllF:()=>{ if(!rkT) return; rkTCommit(); rkGrp=''; rkCol=''; rkT.only=null; rkTRender(); },
  importClick:rkImportClick, importFile:rkImportFile, pick:rkPick, openExport:rkOpenExport, doExport:rkDoExport, csv:rkCsv, print:rkPrint, backup:rkBackup, wipe:rkWipe, help:rkHelp, appHelp:rkAppHelp,
  dups:rkOpenDups, dupMerge:rkDupMerge, dupSkip:rkDupSkip, dupAll:rkDupAll, dupNm:rkDupNmSet,
  tidy:rkOpenTidy, tidyGo:rkTidyGo, tidyBack:()=>{ rkScrUpPop(); rkOpenTidy(); }, spGo:rkSpGo, spTrash:rkSpTrash, spSel:rkSpSel, trashDel:()=>{ rkTrashDel(); }, trashBack:rkTrashBack,
  orgGroups:rkOpenOrgGroups, orgAll:rkOrgAll, orgDo:rkOrgDo,
  soStart:rkSoStart, soClose:rkCloseSort, soKeep:()=>rkSoNext('keep'), soDel:()=>rkSoNext('del'), soLater:()=>rkSoNext('later'), soUndo:rkSoUndo, soGrp:rkSoGrp, soNewGrp:()=>{ rkSoNewGrp(); },
  soCol:rkSoCol, soColPick:()=>{ rkSoColPick(); }, soFav:rkSoFav, soEdit:()=>{ const x=rkSoCur(); if(x) rkEdit(x.id); }, soReset:()=>{ rkSoReset(); }, soTrashList:()=>{ rkCloseSort(); rkSpGo('!trash'); },
  custom:()=>{ if(rkEd && isDlgOpen('rkEdOverlay')) rkEdSync(); rkOpenCustom(); }, gAdd:rkGAdd, gPreset:rkGPreset, gRen:rkGRen, gIcon:rkGIcon, gMove:rkGMove, gDel:rkGDel, fAdd:rkFAdd, fPreset:rkFPreset, fRen:rkFRen, fMove:rkFMove, fDel:rkFDel,
  setSub:rkSetSub, setBig:rkSetBig, setFuri:rkSetFuri, setLMemo:rkSetLMemo, viewMemo:rkViewMemo, setNoteCf:rkSetNoteCf, setCall:rkSetCall, telAsk:(ev,a)=>{ rkTelAsk(ev,a); }, listen:rkListen,
  yomi:rkYOpen, yAlign:rkYAlign, yFill:()=>{ rkYFill(); }, yFillT:()=>{ if(!rkT) return; rkTCommit(); rkYFill(rkT.rows); }, yStyle:rkYSetStyle, yUndo:rkYUndoDo, yTbl:rkYTbl, edYomi:()=>{ rkEdYomi(); },
  cOrder:b=>{ rkCOrderOpen(!!b); }, cMove:rkCMove, cNoPick:k=>{ rkCNoPick(k); }, cReset:rkCReset, cDir:rkSetCDir, cNoShow:rkCNoShow, cDone:rkCDone,
  vDir:rkSetVDir, vMove:rkVMove, gOrder:rkGOrderOpen, gMv:rkGMv, gNoPick:i=>{ rkGNoPick(i); }, gDir:rkSetGDir, setTelSize:rkSetTelSize, setCGrp:rkSetCGrp, addFold:rkAddFold, setAddBar:rkSetAddBar,
  icCat:k=>{ rkIconCat=k; rkIconRender(false); }, icPick:rkIconChoose };
Object.assign(window, { openRenraku, closeRenraku, rkMergeStored, rkPicsAll, rkMergeIntoTest:(a,b,k)=>rkMergeInto(a,b,k), rkOrgGroupsTest:()=>rkOrgGroups().map(o=>[o.n, o.xs.length]),
  rkState:()=>rk, rkCleanTest:o=>rkClean(o), rkParseVcf, rkColorFromTest:s=>rkColorFrom(s), rkSaveFlushTest:()=>rkSaveFlush(), rkVcard:(x,o)=>rkVcard(x,o), rkFromCsv, rkVoiceQ, rkVoiceGo, rkLoose, rkCleanItem, rkImportList, rkDupGroupsTest:()=>rkDupGroups(), rkSearchTest:q=>rkSearch(q, rk.items).map(rkName), rkNameOf:rkName,
  rkYKindTest:x=>rkYKind(x), rkToHira:toHiraY, rkToKata:toKataY, rkYLoadTest:()=>rkYLoad(), rkILoadTest:()=>rkILoad(), rkIconPhotoTest:id=>rkIconPhoto(id) });
})();
