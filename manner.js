/* 📜 マナー帳（v488。表電卓の道具。はじめて開いたときに読む）
   冠婚葬祭の礼儀・あいさつ、手紙と封筒の書き方、敬語などの一般常識を、さがして読めるようにまとめる。
   ・言葉でさがす（ひらがな・カタカナ・全角半角を気にしない）。分類のチップ・★よく見る。
   ・道具：金額を大字に（ご祝儀・香典の中袋）、宛名書きの見本（縦書きの封筒）、法要の日・長寿祝いの年、時候の挨拶（いまの月）。
   ・文例は 📋 でコピー、ページは 🖨 で印刷。
   ・中身は一般的な目安。地域・宗派・家のしきたりで違うことがあるので、迷ったら身近な人や式場・お寺に確かめる。
   ・覚えるのは ★ だけ（excalc_manner）。 */
(function(){
const MN_KEY='excalc_manner';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mn={fav:[]}, mnQ='', mnCat='', mnCur=null;
function mnLoad(){ try{ const o=JSON.parse(localStorage.getItem(MN_KEY)||'null'); mn={fav:Array.isArray(o&&o.fav)?o.fav.filter(x=>typeof x==='string').slice(0,200):[]}; }catch(_){ mn={fav:[]}; } }
function mnSave(){ try{ localStorage.setItem(MN_KEY, JSON.stringify(mn)); }catch(_){} }
function mnNorm(s){
  return String(s||'').normalize('NFKC').toLowerCase()
    .replace(/<[^>]+>/g,' ')
    .replace(/[ァ-ヶ]/g, c=>String.fromCharCode(c.charCodeAt(0)-0x60))
    .replace(/[\s・、。,.\-ー~〜「」『』()（）]/g,'');
}
/* 表を作る（1行目は見出し） */
const T=(rows, cls)=>`<table class="mn-t${cls?' '+cls:''}">`+rows.map((r,i)=>'<tr>'+r.map(c=>i?`<td>${c}</td>`:`<th>${c}</th>`).join('')+'</tr>').join('')+'</table>';
/* 文例（📋 でコピーできる） */
const EX=(title, text)=>`<div class="mn-ex"><div class="mn-ex-h">${title}<button class="mn-cp" onclick="mnCopy(this)">📋 コピー</button></div><div class="mn-ex-b">${esc(text).replace(/\n/g,'<br>')}</div></div>`;
const NOTE=t=>`<div class="mn-note">${t}</div>`;
const OK=t=>`<div class="mn-ok">⭕ ${t}</div>`, NG=t=>`<div class="mn-ng">✖ ${t}</div>`;

const CATS=[ ['wed','💒 結婚'], ['fun','🕯 葬儀・法事'], ['gift','🎁 贈り物・お祝い'], ['season','🎍 季節のあいさつ'], ['letter','✉ 手紙'], ['env','📮 封筒・はがき・のし袋'], ['keigo','🙇 敬語・あいさつ'], ['act','🪑 ふるまい'], ['tool','🧮 道具'] ];
const P=[];   // ページ {id, cat, t:題, k:さがす言葉, h:中身（関数でもよい）}

/* ───────── 💒 結婚 ───────── */
P.push({id:'wed-gift', cat:'wed', t:'ご祝儀の金額と包み方', k:'結婚式 祝儀 相場 いくら 新札 ふくさ 袱紗 祝儀袋 水引 寿 奇数 偶数 お札の向き',
h:()=>`<p>披露宴に出るときのご祝儀の目安です（料理・引き出物の分も考えた金額）。</p>
${T([['相手との間がら','目安'],['友人・同僚・部下','3万円'],['兄弟・姉妹','5万〜10万円'],['いとこ・おい・めい','3万〜5万円'],['上司として出る','3万〜5万円'],['夫婦で出る','5万〜7万円'],['式に出ずにお祝いだけ','1万円前後（品物でも）']])}
<h4>数のきまり</h4>
${OK('1・3・5 など<b>割り切れない奇数</b>（「別れない」）。2万円は「ペア」として許されることも多い')}
${NG('4（死）・9（苦）は避ける。お札の枚数が偶数にならないよう、2万円なら1万円札1枚＋5千円札2枚にすることも')}
<h4>お札</h4>
<p><b>新札</b>を用意します（「この日を楽しみに準備していた」の意味）。銀行の窓口・両替機で替えられます。中袋には、お札の<b>肖像（顔）が表・上</b>になるように入れます。</p>
<h4>祝儀袋</h4>
<p>水引は<b>紅白か金銀の結び切り・あわじ結び</b>（ほどけない＝一度きり）。表書きは「寿」「御結婚御祝」、下にフルネーム。金額にあった格の袋を（3万円なら中くらいの豪華さ）。</p>
<p>上包みの裏の折り返しは、<b>下側を上に重ねる</b>（幸せを受け止める）。弔事と逆です。</p>
<h4>ふくさの包み方（つめ付き）</h4>
<p>ふくさをひし形に置き、真ん中より<b>少し左</b>に祝儀袋を置いて、<b>左 → 上 → 下 → 右</b>の順にたたみます。色は赤・オレンジ・紫など（紫は慶弔どちらにも使えます）。</p>
<h4>渡し方</h4>
<p>受付で「本日はおめでとうございます」と言い、ふくさから出して、<b>相手から字が読める向き</b>にして両手で渡します。</p>`});
P.push({id:'wed-reply', cat:'wed', t:'招待状の返信はがきの書き方', k:'結婚式 招待状 返信 はがき 出席 欠席 御芳名 御住所 二重線 寿 行 様',
h:()=>`<p>受け取ってから<b>2〜3日以内</b>（遅くとも1週間）に出します。</p>
<h4>表（宛名）</h4>
<p>「〇〇 <b>行</b>」「〇〇 <b>宛</b>」を二重線で消し、横に「<b>様</b>」と書きます（会社あてなら「御中」）。縦書きは縦の二重線、横書きは横の二重線。</p>
<h4>裏（出席のとき）</h4>
${T([['書いてあるもの','直し方'],['御出席','「御」を消し、「出席」を〇で囲み、下に「させていただきます」'],['御欠席','全部を二重線で消す'],['御住所','「御」を消す'],['御芳名','「御芳」を消す（「名」だけ残す）']])}
<p>余白に一言：「ご結婚おめでとうございます。お招きいただきありがとうございます。喜んで出席させていただきます」</p>
<p>二重線のかわりに「<b>寿</b>」の字で消すと、よりお祝いの気持ちが伝わります。</p>
<h4>欠席のとき</h4>
<p>「御出席」を消し、「御欠席」の「御」を消して「欠席」を〇で囲みます。理由はくわしく書かず「<b>やむを得ない事情により</b>」とします（身内の不幸・病気は書かない）。できれば先に電話で伝え、お祝いの品やご祝儀（1万円前後）を送ります。</p>
${EX('欠席の一言','ご結婚おめでとうございます。\nせっかくお招きいただきましたのに、やむを得ない事情により出席できず、誠に申し訳ございません。\nお二人の末永いお幸せを心よりお祈りしております。')}`});
P.push({id:'wed-words', cat:'wed', t:'結婚式の忌み言葉と言いかえ', k:'忌み言葉 結婚式 スピーチ 重ね言葉 切る 別れる 終わる 言いかえ お開き 入刀',
h:()=>`<h4>使わない言葉</h4>
<p><b>別れ・終わりを思わせる言葉</b>：別れる、切れる、離れる、終わる、壊れる、割れる、去る、冷える、戻る、出る、破れる、最後</p>
<p><b>くり返し（再婚）を思わせる言葉</b>：重ね重ね、たびたび、ますます、いろいろ、くれぐれも、再び、再度、繰り返す、またまた</p>
<h4>言いかえ</h4>
${T([['使いがちな言葉','言いかえ'],['ケーキを切る','ケーキに入刀'],['最後に','結びに'],['終わる・閉会','お開き'],['ますます','いっそう・さらに'],['いろいろ','たくさん・さまざま'],['重ね重ね','あわせて・どうぞ'],['（料理を）取り分ける','（料理を）おとりする']])}
${NOTE('気にしすぎると話しにくくなります。スピーチ原稿を作ったら一度だけ見直す、くらいで十分です。')}`});
P.push({id:'wed-dress', cat:'wed', t:'結婚式の服装', k:'結婚式 服装 ドレス 白 黒 スーツ ネクタイ 毛皮 アニマル柄 招待客',
h:()=>`<h4>女性</h4>
${NG('<b>白</b>（花嫁の色）。白っぽいベージュ・薄いグレーも写真で白く見えることがある')}
${NG('全身黒だけ（喪服に見える）。黒を着るときは明るい小物で華やかに')}
${NG('毛皮・アニマル柄・革（殺生を思わせる）、露出の多い服')}
${OK('昼の式は光る素材をひかえめに、夜は少し華やかでもよい')}
<h4>男性</h4>
${OK('ブラックスーツか、濃い色（紺・グレー）のスーツ')}
${OK('白か淡い色のシャツ、白・シルバー・淡い色のネクタイ、黒の革靴')}
${NG('黒いネクタイ（弔事の色）、派手すぎる柄、スニーカー')}`});
P.push({id:'wed-speech', cat:'wed', t:'結婚式のスピーチの組み立て', k:'スピーチ 結婚式 友人代表 上司 祝辞 文例 3分',
h:()=>`<p>長さは<b>3分ほど</b>（原稿用紙2〜3枚）。</p>
${T([['順番','言うこと'],['1 お祝い','「〇〇さん、△△さん、ご結婚おめでとうございます」両家へも'],['2 自己紹介','新郎（新婦）とのかかわり'],['3 エピソード','人柄が伝わる話を1つ（暴露話・昔の恋人の話はしない）'],['4 はなむけ','二人へのことば・願い'],['5 結び','「本日は誠におめでとうございます」']])}
${EX('友人代表の文例','〇〇さん、△△さん、ご結婚おめでとうございます。ご両家の皆さま、心よりお祝い申し上げます。\nただいまご紹介にあずかりました、新婦の大学時代からの友人の□□と申します。\n〇〇さんは、困っている人がいると真っ先に声をかける人です。……\nこれからは二人で力を合わせ、笑顔あふれる家庭を築いてください。\n本日は誠におめでとうございます。')}`});

/* ───────── 🕯 葬儀・法事 ───────── */
P.push({id:'fun-koden', cat:'fun', t:'香典の金額と包み方', k:'香典 相場 いくら 不祝儀袋 新札 薄墨 お札の向き ふくさ 袱紗 通夜 葬儀 告別式',
h:()=>`<p>地域・年齢・付き合いで変わります。自分が20〜30代なら少なめ、40代以上なら多めが目安です。</p>
${T([['亡くなった方','目安'],['両親（義理も）','5万〜10万円'],['兄弟・姉妹','3万〜5万円'],['祖父母','1万〜5万円'],['おじ・おば・ほかの親族','1万〜3万円'],['友人・知人・近所','5千円〜1万円'],['職場の人・その家族','5千円〜1万円']])}
${NG('4・9のつく金額。偶数（とくに2万円）も避けることが多い')}
<h4>お札</h4>
<p><b>新札は避けます</b>（用意していたように見えるため）。新札しかなければ、一度折り目を付けて入れます。中袋にはお札の<b>肖像を裏・下</b>にして入れるのが一般的です。</p>
<h4>不祝儀袋</h4>
<p>水引は<b>黒白か双銀の結び切り</b>。5千円ほどなら水引が印刷された袋、1万円以上なら実物の水引の袋を。蓮の花の柄は<b>仏式だけ</b>。表書きは<b>薄墨</b>の筆ペンで（「涙で墨が薄くなった」の意味）。</p>
<p>上包みの裏は、<b>上側の折り返しを下にかぶせる</b>（悲しみで頭を下げる）。慶事と逆です。</p>
<h4>ふくさ</h4>
<p>紺・グレー・紫などの寒色。真ん中より<b>少し右</b>に袋を置き、<b>右 → 下 → 上 → 左</b>の順にたたみます。</p>
<h4>渡し方</h4>
<p>受付で「このたびはご愁傷さまでございます」と小さな声で言い、ふくさから出して相手から読める向きで両手で渡します。</p>`});
P.push({id:'fun-omote', cat:'fun', t:'香典の表書き（宗教ごと）', k:'表書き 御霊前 御仏前 御香典 御香料 浄土真宗 神式 御玉串料 御榊料 キリスト教 御花料 宗教 わからない',
h:()=>`${T([['宗教','表書き'],['仏式（多くの宗派）','御霊前（四十九日まで）・御香典・御香料'],['仏式・浄土真宗','<b>御仏前</b>（亡くなってすぐ仏になると考える）・御香典'],['仏式・四十九日のあとの法要','御仏前・御供物料'],['神式','御玉串料・御榊料・御神前'],['キリスト教','御花料（カトリックは御ミサ料も）'],['宗教がわからない','<b>御香典</b>（どの仏式にも使える）・御霊前']])}
<p>名前は水引の下に<b>フルネーム</b>。連名は3人まで（右が目上）。4人以上は「〇〇一同」と書き、中に全員の名前を書いた紙を入れます。</p>
<p>中袋：表に金額（「金 壱萬圓」など。<a href="#" onclick="mnOpen('tool-daiji');return false">大字にする道具</a>）、裏に住所と名前。</p>`});
P.push({id:'fun-words', cat:'fun', t:'お悔やみの言葉と忌み言葉', k:'お悔やみ 言葉 ご愁傷様 忌み言葉 重ね言葉 逝去 生前 冥福 浄土真宗 成仏',
h:()=>`<h4>かける言葉</h4>
${EX('受付・遺族に','このたびはご愁傷さまでございます。心よりお悔やみ申し上げます。')}
${EX('急なことだったとき','突然のことで、言葉もございません。')}
<p>長話をしない・<b>亡くなった理由を聞かない</b>・遺族を引き止めない。</p>
<h4>使わない言葉</h4>
<p><b>重ね言葉</b>（不幸が重なる）：重ね重ね、たびたび、くれぐれも、ますます、いよいよ、再三、またまた</p>
<p><b>続くことを思わせる言葉</b>：追って、再び、続いて、引き続き</p>
<p><b>直接すぎる言葉</b>：「死ぬ・死亡」→「ご逝去・ご永眠」、「生きていたとき」→「ご生前・お元気なころ」</p>
${NOTE('「ご冥福をお祈りします」「成仏」「供養」は仏教の言葉。神式・キリスト教では使いません。浄土真宗では「冥福」も使わず「哀悼の意を表します」などにします。')}`});
P.push({id:'fun-shoko', cat:'fun', t:'焼香・玉串・献花のしかた', k:'焼香 回数 作法 抹香 数珠 合掌 玉串奉奠 二礼二拍手一礼 しのび手 献花 キリスト教 神式',
h:()=>`<h4>仏式：立って焼香する（立礼焼香）</h4>
<ol><li>順番が来たら、遺族と僧侶に一礼</li><li>焼香台の前で遺影に一礼・合掌</li>
<li>右手の親指・人差し指・中指で抹香をつまみ、<b>額の高さに押しいただき</b>、香炉へ落とす</li>
<li>回数は宗派で1〜3回。わからなければ<b>心をこめて1回</b>でよい</li><li>合掌・一礼、遺族に一礼して席へ</li></ol>
${NOTE('浄土真宗は押しいただかずに、そのまま香炉へ。数珠は左手にかけます（貸し借りはしない）。')}
<h4>神式：玉串奉奠</h4>
<p>玉串を受け取り、根元を自分に向けて時計まわりに回し、根元を祭壇に向けて供えます。<b>二礼・二拍手・一礼</b>。拍手は<b>音を立てない「しのび手」</b>です。</p>
<h4>キリスト教：献花</h4>
<p>花を右、茎を左にして受け取り、祭壇の前で時計まわりに回して<b>茎を祭壇に向けて</b>供え、黙とう（または一礼）。</p>`});
P.push({id:'fun-dress', cat:'fun', t:'葬儀・通夜の服装', k:'喪服 服装 通夜 葬儀 ブラックフォーマル 真珠 ネクタイ 靴 ストッキング 平服',
h:()=>`${OK('喪服（ブラックフォーマル）。通夜に急いで行くときは、地味な色の平服でもよい（「取り急ぎ駆けつけた」）')}
${OK('女性：黒のワンピースかスーツ、黒のストッキング、光らない黒の靴とバッグ。アクセサリーは結婚指輪と<b>一連の真珠</b>まで')}
${OK('男性：黒のスーツ、白無地のシャツ、黒のネクタイ・靴下・靴')}
${NG('二連・三連のネックレス（不幸が重なる）、光る金具、毛皮・革の小物、派手な髪色やネイル')}`});
P.push({id:'fun-hoyo', cat:'fun', t:'法要の年と日（四十九日・一周忌・三回忌…）', k:'法要 法事 四十九日 百か日 一周忌 三回忌 七回忌 十三回忌 三十三回忌 回忌 数え方 年忌',
h:()=>`${T([['法要','いつ'],['初七日','亡くなった日を1日目として7日目'],['四十九日（七七日）','49日目。忌明け。納骨することが多い'],['百か日','100日目'],['一周忌','<b>満1年</b>'],['三回忌','<b>満2年</b>（亡くなった年を1回目と数える）'],['七回忌','満6年'],['十三回忌','満12年'],['十七回忌','満16年'],['二十三回忌','満22年'],['二十七回忌','満26年'],['三十三回忌','満32年。ここで「弔い上げ」とする家が多い'],['五十回忌','満49年']])}
${NOTE('関西など、亡くなる前日から数える地域もあります。法要は当日より前の土日にすることが多いです。')}
<p><a href="#" onclick="mnOpen('tool-hoyo');return false">🧮 命日から法要の日を出す</a></p>`});
P.push({id:'fun-kaeshi', cat:'fun', t:'香典返し', k:'香典返し 半返し 志 満中陰志 忌明け 当日返し 黄白',
h:()=>`<p>もらった香典の<b>3分の1〜半分</b>の品を、<b>四十九日（忌明け）のあと</b>1か月以内に送ります。葬儀の日に渡す「当日返し」も増えています。</p>
<p>表書きは「<b>志</b>」（全国）、関西では「<b>満中陰志</b>」。水引は黒白か黄白の結び切り。お茶・海苔・タオル・洗剤など<b>使ってなくなるもの</b>がよいとされます。</p>`});

/* ───────── 🎁 贈り物・お祝い ───────── */
P.push({id:'gift-mizuhiki', cat:'gift', t:'水引とのしの使い分け', k:'水引 蝶結び 結び切り あわじ結び のし 熨斗 内のし 外のし 表書き 連名 一同',
h:()=>`${T([['水引','意味','使うとき'],['蝶結び（花結び）','何度あってもうれしい','出産・入学・お中元・お歳暮・お礼・新築'],['結び切り','一度きりでよい','結婚・お見舞い・快気祝い・弔事'],['あわじ結び','一度きり・末長く','結婚・弔事（地域によりいろいろなお祝いにも）']])}
<h4>のし（右上の飾り）</h4>
${OK('お祝い・お礼の贈り物に付ける')}
${NG('弔事・お見舞いには付けない。生の魚・肉を贈るときも付けないことが多い（のしはもともと鮑だったため）')}
<p><b>外のし</b>（包装紙の上）＝手渡しで目的をはっきり見せたいとき。<b>内のし</b>（包装紙の下）＝配送や、控えめにしたいとき。</p>
<h4>表書きと名前</h4>
<p>水引の上に目的（御祝・御礼など）、下に名前（フルネーム）。連名は3人まで、<b>右が目上</b>。4人以上は「〇〇一同」。</p>`});
P.push({id:'gift-kotobuki', cat:'gift', t:'長寿祝い（還暦・古希・喜寿・米寿…）', k:'長寿 還暦 古希 喜寿 傘寿 米寿 卒寿 白寿 百寿 紀寿 色 赤 紫 黄 数え年 満年齢',
h:()=>`${T([['名前','年齢','色','いわれ'],['還暦','60歳','赤','干支が一回りして生まれた年に還る'],['古希','70歳','紫','「人生七十古来稀なり」'],['喜寿','77歳','紫','「喜」の草書体が七十七'],['傘寿','80歳','黄・金茶','「傘」の略字が八十'],['米寿','88歳','黄・金茶','「米」が八十八'],['卒寿','90歳','白・紫','「卒」の略字「卆」が九十'],['白寿','99歳','白','「百」から一を引くと「白」'],['百寿（紀寿）','100歳','白・桃','百年＝一世紀']])}
${NOTE('むかしは数え年で祝いましたが、いまは満年齢で祝うことが多いです（還暦は満60歳）。')}
<p><a href="#" onclick="mnOpen('tool-age');return false">🧮 生まれた年から、長寿祝いの年を出す</a></p>`});
P.push({id:'gift-money', cat:'gift', t:'お祝い・お年玉の金額の目安', k:'出産祝い 入学祝い 就職祝い 新築祝い 結婚祝い お年玉 相場 いくら 金額',
h:()=>`${T([['お祝い','友人・知人','親族'],['出産祝い','5千円〜1万円','1万〜3万円'],['入学祝い（小・中・高）','5千円〜1万円','1万〜3万円（祖父母はもっと多いことも）'],['就職祝い','5千円〜1万円','1万〜3万円'],['新築・引っ越し祝い','5千円〜1万円','1万〜3万円'],['結婚祝い（式に出ない）','1万円前後','3万〜5万円']])}
<h4>お年玉</h4>
${T([['年れい','目安'],['小学校に入る前','5百円〜1千円'],['小学1〜3年','1千円〜3千円'],['小学4〜6年','3千円〜5千円'],['中学生','5千円'],['高校生','5千円〜1万円']])}
${NOTE('きょうだい・親せきの間で金額をそろえておくと気まずくなりません。目上の人の子には「お年玉」ではなく「文具料」「御年賀」とします。')}`});
P.push({id:'gift-mimai', cat:'gift', t:'お見舞いのマナー', k:'お見舞い 病院 花 鉢植え 菊 シクラメン 椿 表書き 御見舞 現金 面会 時間',
h:()=>`<p>表書きは「<b>御見舞</b>」。のしは付けず、紅白の結び切りか、白い封筒にします（入院が長い・重い病気のときは白封筒が無難）。</p>
${NG('鉢植え（根付く＝寝付く）、菊・白い花（弔事）、シクラメン（死・苦）、椿（首から落ちる）、香りの強い花。病院によっては生花そのものがだめ')}
${OK('食べ物は相手の食事制限を確かめてから。本・雑誌・タオル・ちょっとしたおしゃれ用品なども')}
<p>面会は<b>15〜20分</b>で切り上げます。病状をくわしく聞かない。</p>`});
P.push({id:'gift-uchi', cat:'gift', t:'内祝い・お返しの目安', k:'内祝い お返し 半返し 出産内祝い 結婚内祝い 快気祝い 快気内祝い 時期',
h:()=>`${T([['お返し','目安','時期・表書き'],['結婚内祝い','半返し','式から1か月以内。「内祝」・紅白結び切り'],['出産内祝い','3分の1〜半分','生まれて1か月ごろ。「内祝」と赤ちゃんの名前・紅白蝶結び'],['快気祝い','3分の1〜半分','退院して10日〜1か月。「快気祝」・紅白結び切り・消えもの'],['香典返し','3分の1〜半分','四十九日のあと。「志」']])}
${NOTE('目上の人からの高額なお祝いには、半返しにこだわらず、気持ちの伝わる品とお礼状で十分です。')}`});

/* ───────── 🎍 季節のあいさつ ───────── */
P.push({id:'season-chugen', cat:'season', t:'お中元・お歳暮の時期', k:'お中元 お歳暮 時期 いつ 暑中御見舞 残暑御見舞 御年賀 寒中御見舞 喪中 関東 関西 相場',
h:()=>`${T([['','関東','関西など'],['お中元','7月初め〜7月15日','7月中旬〜8月15日'],['お歳暮','12月初め〜12月20日ごろ（11月下旬からも）','同じ']])}
<h4>時期を過ぎたら表書きを変える</h4>
${T([['いつ','表書き（目上の人には）'],['お中元の時期のあと〜立秋（8月7日ごろ）','暑中御見舞（暑中御伺）'],['立秋〜8月末','残暑御見舞（残暑御伺）'],['お歳暮を年内に出せなかった','御年賀（松の内まで）'],['松の内のあと〜立春（2月4日ごろ）','寒中御見舞（寒中御伺）']])}
<p>目安は<b>3千〜5千円</b>。どちらか一方だけなら、1年のお礼のお歳暮を。<b>喪中</b>でも贈ってよく、そのときは紅白の水引をやめて無地の短冊にします。</p>`});
P.push({id:'season-nenga', cat:'season', t:'年賀状の書き方とまちがい', k:'年賀状 賀詞 謹賀新年 賀正 迎春 元旦 元日 句読点 出す時期 投函 松の内',
h:()=>`<h4>賀詞（はじめのおめでたい言葉）</h4>
${OK('目上の人へ：「謹賀新年」「恭賀新年」「謹んで新年のお慶びを申し上げます」')}
${NG('目上の人へ「賀正」「迎春」「新春」（1〜2文字の賀詞は略した形で、目下・友人向き）')}
<h4>まちがいやすいもの</h4>
${NG('「新年あけましておめでとうございます」→「新年」と「明け」が重なるとされる。「あけましておめでとうございます」か「新年おめでとうございます」')}
${NG('「一月一日 元旦」→「元旦」は1月1日の朝のこと。「令和〇年 元旦」でよい')}
${NG('「去年」→「去る」を避けて「昨年」・「旧年」')}
${NOTE('年賀状には句読点（、。）を付けないのがならわしです（区切りを付けない）。')}
<p>元日に届けるなら<b>12月15日〜25日</b>に出します。返事は<b>松の内</b>（関東1月7日、関西1月15日）まで。過ぎたら寒中見舞いにします。</p>`});
P.push({id:'season-mochu', cat:'season', t:'喪中はがきと寒中見舞い', k:'喪中はがき 年賀欠礼 いつまで 出す時期 範囲 寒中見舞い 文例 喪中見舞い',
h:()=>`<p>1年以内に近い身内（父母・配偶者・子・兄弟姉妹・祖父母、配偶者の父母など）を亡くしたとき、年賀状のかわりに出します。相手が年賀状を書く前、<b>11月中〜12月初め</b>に届くように。</p>
${EX('喪中はがきの文例','喪中につき年末年始のご挨拶を失礼させていただきます\n本年〇月に 父 〇〇が〇〇歳にて永眠いたしました\nここに本年中に賜りましたご厚情に深謝いたしますとともに\n明年も変わらぬご厚誼のほどお願い申し上げます\n令和〇年十二月')}
<h4>喪中はがきを受け取ったら</h4>
<p>年賀状は出さず、<b>寒中見舞い</b>（1月8日ごろ〜2月4日ごろ）を出します。年内なら「喪中見舞い」でも。</p>
${EX('寒中見舞いの文例','寒中お見舞い申し上げます\nご服喪中と伺い 年頭のご挨拶は控えさせていただきました\n寒さ厳しき折 どうぞご自愛くださいませ')}`});
P.push({id:'season-jiko', cat:'season', t:'時候の挨拶（月ごと）', k:'時候の挨拶 季語 拝啓 候 1月 2月 3月 4月 5月 6月 7月 8月 9月 10月 11月 12月 手紙 書き出し',
h:()=>{ const m=new Date().getMonth();
 const D=[['1月','新春の候・初春の候・厳寒の候','寒さ厳しき折から'],['2月','立春の候・余寒の候・向春の候','立春とは名ばかりの寒さが続いております'],['3月','早春の候・浅春の候・春暖の候（下旬）','日ごとに春めいてまいりました'],['4月','陽春の候・桜花の候・春暖の候','桜の便りが聞かれるころとなりました'],['5月','新緑の候・若葉の候・薫風の候','若葉の緑がまぶしい季節となりました'],['6月','梅雨の候・初夏の候・向暑の候','梅雨空の続くこのごろ'],['7月','盛夏の候・猛暑の候・大暑の候（下旬）','暑さ厳しき折'],['8月','残暑の候・晩夏の候・立秋の候','暦の上では秋とはいえ、暑い日が続いております'],['9月','初秋の候・新秋の候・爽秋の候','朝夕はめっきり涼しくなりました'],['10月','秋冷の候・錦秋の候・紅葉の候','秋も深まってまいりました'],['11月','晩秋の候・向寒の候・落葉の候','木枯らしの吹く季節となりました'],['12月','師走の候・初冬の候・歳晩の候','今年も残りわずかとなりました']];
 return `<p>「拝啓」のすぐあとに書きます。<b>「〇〇の候」</b>は改まった手紙、右の言い方はやわらかい手紙向き。</p>`
  +`<table class="mn-t">`+'<tr><th>月</th><th>「〜の候」</th><th>やわらかい言い方</th></tr>'+D.map((r,i)=>`<tr class="${i===m?'mn-now':''}"><td>${r[0]}${i===m?'<br><small>いま</small>':''}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')+'</table>'
  +EX('いまの月の書き出し（例）','拝啓 '+D[m][1].split('・')[0]+'、皆様にはますますご清祥のこととお喜び申し上げます。');
}});

/* ───────── ✉ 手紙 ───────── */
P.push({id:'letter-kozo', cat:'letter', t:'手紙の組み立て', k:'手紙 書き方 構成 前文 主文 末文 後付け 副文 追伸 拝啓 敬具 お礼状',
h:()=>`${T([['かたまり','書くこと'],['前文','頭語（拝啓）→ 時候の挨拶 → 相手の安否 → お礼・おわび'],['主文','「さて」「ところで」で用件'],['末文','結びの挨拶（相手の健康を願う）→ 結語（敬具）'],['後付け','日付 → 自分の名前 → 相手の名前（様）'],['副文','追伸。目上の人・弔事・お祝いの手紙には書かない']])}
${EX('お世話になったお礼の手紙','拝啓 新緑の候、〇〇様にはますますご清祥のこととお喜び申し上げます。\nさて、先日は大変お世話になり、誠にありがとうございました。おかげさまで……。\nこれからもご指導のほど、よろしくお願い申し上げます。\n季節の変わり目でございますので、どうぞご自愛くださいませ。\n敬具\n令和〇年〇月〇日\n山田 太郎\n〇〇 〇〇 様')}
${EX('贈り物へのお礼（はがき）','拝啓 このたびは結構なお品をお送りいただき、誠にありがとうございました。\n家族一同、おいしくいただいております。\nいつもながらのお心遣いに、心より感謝申し上げます。\n暑さ厳しき折、皆様どうぞお元気でお過ごしください。\n敬具')}`});
P.push({id:'letter-togo', cat:'letter', t:'頭語と結語の組み合わせ', k:'頭語 結語 拝啓 敬具 謹啓 謹白 前略 草々 拝復 急啓 再啓 かしこ 組み合わせ',
h:()=>`${T([['手紙','頭語','結語'],['ふつう','拝啓','敬具'],['とても丁寧','謹啓','謹白・謹言・敬白'],['返事','拝復','敬具'],['前文を省く（目上には使わない）','前略','草々'],['急ぎ','急啓','草々'],['続けて出す','再啓','敬具'],['女性のやわらかい手紙','（拝啓・なしでも）','かしこ']])}
${NOTE('お悔やみの手紙は、頭語・時候の挨拶を書かずに、いきなりお悔やみの言葉から始めます。')}`});
P.push({id:'letter-keisho', cat:'letter', t:'敬称（様・殿・御中・各位）の使い分け', k:'敬称 様 殿 御中 各位 先生 役職 会社 部署 宛名 併用 行 宛',
h:()=>`${T([['敬称','使うとき','例'],['様','個人あて（いちばん広く使える）','山田 太郎 様'],['御中','会社・部署・団体あて','株式会社〇〇 総務部 御中'],['各位','大勢に同じことを伝える','関係者各位・お客様各位'],['先生','先生・医師・議員・弁護士など','山田 太郎 先生'],['殿','公用の書類・目下（個人の手紙には今は「様」が多い）','']])}
${NG('「株式会社〇〇 御中 山田太郎様」→ 御中と様は一緒に使わない。人の名前があれば「様」だけ')}
${NG('「各位様」「山田部長様」→ 敬称が重なる。「営業部長 山田太郎様」のように役職は名前の前に')}
<p>返信用の封筒の「〇〇 <b>行</b>」「〇〇 <b>宛</b>」は二重線で消して、個人なら「様」、会社なら「御中」に。</p>`});
P.push({id:'letter-okuyami', cat:'letter', t:'お悔やみ状・弔電の文例と、亡くなった方の呼び方', k:'お悔やみ状 弔電 文例 ご尊父 ご母堂 ご令室 ご令息 ご令嬢 呼び方 敬称 喪主',
h:()=>`${T([['亡くなった方（喪主から見て）','呼び方'],['父','ご尊父様・お父様'],['母','ご母堂様・お母様'],['夫','ご主人様・旦那様'],['妻','ご令室様・奥様'],['息子','ご令息様・ご子息様'],['娘','ご令嬢様・ご息女様'],['祖父・祖母','ご祖父様・ご祖母様']])}
${EX('弔電の文例','ご尊父様のご逝去の報に接し、謹んでお悔やみ申し上げます。\n在りし日のお姿を偲び、心よりご冥福をお祈りいたします。')}
${EX('お悔やみ状（参列できないとき）','このたびはご母堂様ご逝去の報に接し、驚いております。\n本来ならば参上してお悔やみを申し上げるべきところ、遠方のためかなわず、誠に申し訳ございません。\n心ばかりのものを同封いたしましたので、ご霊前にお供えくださいますようお願い申し上げます。\nご家族の皆様もどうぞご自愛くださいませ。\n合掌')}
${NOTE('弔電は<b>喪主あて</b>に、告別式の前日（遅くとも当日の始まる前）までに届くように。神式・キリスト教では「冥福」「合掌」は使いません。')}`});
P.push({id:'letter-mail', cat:'letter', t:'仕事のメールの型とクッション言葉', k:'ビジネスメール 書き方 件名 宛名 お世話になっております 署名 クッション言葉 恐れ入りますが お手数ですが',
h:()=>`${EX('メールの型','件名：【ご確認のお願い】〇月〇日の打ち合わせ資料\n\n株式会社〇〇\n営業部 山田様\n\nいつもお世話になっております。株式会社△△の佐藤です。\n\n〇月〇日の打ち合わせの資料をお送りいたします。\nお手数をおかけしますが、ご確認のほどよろしくお願いいたします。\n\n――――――――――\n株式会社△△ 総務部 佐藤花子\nTEL 03-0000-0000')}
<h4>クッション言葉（お願い・断りをやわらかく）</h4>
${T([['言葉','使うとき'],['恐れ入りますが','お願い全般'],['お手数をおかけしますが','手間をかけさせるお願い'],['差し支えなければ','聞きにくいことを聞く'],['あいにく','断る・できないとき'],['せっかくですが','誘いを断るとき'],['ご多用のところ恐縮ですが','忙しい人へのお願い']])}`});

/* ───────── 📮 封筒・はがき・のし袋 ───────── */
P.push({id:'env-tate', cat:'env', t:'縦書きの封筒（表）の書き方', k:'封筒 書き方 表 縦書き 住所 宛名 漢数字 郵便番号 切手 位置 親展 在中 会社 部署',
h:()=>`<p><a href="#" onclick="mnOpen('tool-atena');return false">🧮 名前と住所を入れて見本を見る</a></p>
<ol><li><b>郵便番号</b>を枠に。</li>
<li><b>住所</b>は右側。郵便番号の枠の右はしから<b>1文字ほど下げて</b>書き始める。数字は<b>漢数字</b>（一二三、〇）。番地の「-」は「ー」でも「の」でも。</li>
<li>建物名・部屋番号は2行目に、1行目より<b>少し下げて</b>。</li>
<li><b>宛名</b>は真ん中に、住所より大きく。敬称（様）も同じ大きさで。</li>
<li>会社あては、宛名の右に会社名・部署を少し小さく。会社名は（株）と略さず「株式会社」。</li>
<li><b>切手は左上</b>。</li>
<li>「親展」「〇〇在中」は<b>左下</b>に、少し大きめに（赤字や四角で囲むと目立つ）。</li></ol>`});
P.push({id:'env-ura', cat:'env', t:'封筒の裏の書き方と封じ目', k:'封筒 裏 差出人 住所 名前 日付 封じ目 〆 封 緘 寿 継ぎ目',
h:()=>`<p><b>差出人</b>は、封筒の継ぎ目の<b>右に住所、左に名前</b>。継ぎ目が左にある封筒なら、左側にまとめて書きます。日付は左上に小さく。</p>
<p><b>封じ目</b>：ふつうは「〆」、改まった手紙は「封」「緘」、お祝いは「寿」「賀」。のりでしっかり閉じます（テープ・ホチキスは避ける）。</p>`});
P.push({id:'env-yoko', cat:'env', t:'横書きの封筒・はがき', k:'横書き 封筒 洋封筒 はがき 算用数字 招待状 住所 宛名',
h:()=>`<p>住所は左上から、<b>数字は算用数字</b>（1・2・3）。宛名は真ん中に大きく。切手は<b>右上</b>（縦長の向きで左上だった位置）。</p>
${NOTE('招待状など、洋封筒を横長に使うときは、表は横書き・裏の差出人は下の方に書きます。')}`});
P.push({id:'env-noshi', cat:'env', t:'のし袋・中袋の書き方（大字）', k:'のし袋 祝儀袋 不祝儀袋 中袋 中包み 金額 大字 壱 弐 参 萬 圓 也 書き方 筆ペン 薄墨',
h:()=>`<p><a href="#" onclick="mnOpen('tool-daiji');return false">🧮 金額を入れて大字に直す</a></p>
<h4>表書き</h4>
<p>水引の上に目的、下にフルネームを、<b>筆ペン</b>で。お祝いは濃い墨、お悔やみは<b>薄墨</b>。</p>
<h4>中袋（中包み）</h4>
<p>表の真ん中に金額を<b>大字</b>（書きかえられない漢字）で、裏の左下に住所と名前。金額欄が裏に印刷されていれば、そこに書きます。</p>
${T([['ふつう','一','二','三','五','十','千','万','円'],['大字','壱','弐','参','伍','拾','阡（仟）','萬','圓']])}
<p>例：1万円 →「金 壱萬圓」、3万円 →「金 参萬圓」、5千円 →「金 伍阡圓」。最後の「也」はあってもなくてもよい。</p>`});
P.push({id:'env-hagaki', cat:'env', t:'はがきの書き方（宛名面）', k:'はがき 宛名 書き方 郵便番号 差出人 往復はがき 返信',
h:()=>`<p>宛名は真ん中に大きく、住所は右側。差出人は<b>切手の下・左側</b>に、宛名より小さく。差出人の郵便番号は、はがきの左下の小さな枠に。</p>
<p>往復はがきで返信するときは、往信の部分を切り離し、返信面の「<b>行</b>」を消して「様」に（<a href="#" onclick="mnOpen('wed-reply');return false">返信はがきの書き方</a>）。</p>`});

/* ───────── 🙇 敬語・あいさつ ───────── */
P.push({id:'keigo-table', cat:'keigo', t:'尊敬語・謙譲語の早見表', k:'敬語 尊敬語 謙譲語 丁寧語 言う 行く 来る いる 見る 食べる 知る する 会う もらう 聞く おっしゃる 申す 伺う 参る 拝見',
h:()=>`<p><b>尊敬語</b>は相手を高める（相手の動作）、<b>謙譲語</b>は自分をへりくだる（自分の動作）。</p>
${T([['ふつう','尊敬語（相手が）','謙譲語（自分が）'],['言う','おっしゃる','申す・申し上げる'],['行く','いらっしゃる・お越しになる','伺う・参る'],['来る','いらっしゃる・お見えになる・お越しになる','参る'],['いる','いらっしゃる','おる'],['見る','ご覧になる','拝見する'],['食べる・飲む','召し上がる','いただく'],['知っている','ご存じだ','存じている・存じ上げる'],['する','なさる','いたす'],['会う','お会いになる','お目にかかる'],['もらう','お受け取りになる','いただく・頂戴する'],['聞く','お聞きになる','伺う・拝聴する'],['与える','くださる','差し上げる'],['思う','お思いになる','存じる']])}`});
P.push({id:'keigo-ng', cat:'keigo', t:'まちがいやすい敬語', k:'二重敬語 まちがい 敬語 おっしゃられる 拝見させていただく 了解しました ご苦労様 よろしかったでしょうか なります バイト敬語',
h:()=>`${T([['まちがい','正しくは'],['おっしゃられる','おっしゃる（二重敬語）'],['お越しになられる','お越しになる'],['拝見させていただく','拝見する'],['了解しました（目上に）','承知しました・かしこまりました'],['ご苦労様です（目上に）','お疲れ様です'],['よろしかったでしょうか','よろしいでしょうか'],['こちらコーヒーになります','こちらコーヒーでございます'],['参考になりました（目上に）','勉強になりました'],['お名前様','お名前'],['〇〇部長様','〇〇部長・部長の〇〇様']])}
${NOTE('「とんでもございません」は本来「とんでもないことでございます」ですが、今は広く使われ、許容されています。')}`});
P.push({id:'keigo-aisatsu', cat:'keigo', t:'場面ごとのひとこと', k:'あいさつ 訪問 手土産 心ばかり 帰る 引っ越し 挨拶 御挨拶 異動 退職 お祝い ひとこと',
h:()=>`${T([['場面','ひとこと'],['訪問したとき','本日はお時間をいただき、ありがとうございます'],['手土産を渡す','心ばかりの品ですが、皆さまでどうぞ'],['帰るとき','長居をいたしました。本日はありがとうございました'],['お祝い','このたびはおめでとうございます'],['お礼','先日は大変お世話になりました'],['退職・異動','在職中は大変お世話になりました'],['頼みごとを断る','あいにくですが、今回は見送らせてください']])}
<h4>引っ越しのあいさつ</h4>
<p>引っ越す前日〜当日に。<b>500〜1000円</b>ほどの品（タオル・洗剤・お菓子）に「<b>御挨拶</b>」ののし（紅白蝶結び）。一戸建ては向かい3軒と両隣（向こう三軒両隣）、マンションは両隣と上下の部屋が目安。</p>`});

/* ───────── 🪑 ふるまい ───────── */
P.push({id:'act-seat', cat:'act', t:'上座と下座（部屋・車・エレベーター）', k:'上座 下座 席次 部屋 和室 床の間 車 タクシー 助手席 エレベーター 新幹線 会議室',
h:()=>`${T([['場所','上座（目上の人）','下座'],['部屋・会議室','入口から<b>いちばん遠い奥</b>の席','入口にいちばん近い席'],['和室','床の間の前','入口の近く'],['タクシー・運転手のいる車','<b>運転席のうしろ</b>','助手席'],['持ち主が運転する車','<b>助手席</b>','後ろの席の真ん中'],['エレベーター','入って<b>左奥</b>','操作ボタンの前（ボタンを押す役）'],['新幹線・電車','進む向きの窓側','通路側・うしろ向き']])}`});
P.push({id:'act-visit', cat:'act', t:'よそのお宅を訪ねるとき', k:'訪問 マナー 時間 靴 向き コート 手土産 渡し方 長居',
h:()=>`<ol><li>約束の時間<b>ちょうどか2〜3分あと</b>に（早すぎると準備中で迷惑）。</li>
<li>コートは<b>玄関の外で脱ぐ</b>（ほこりを持ちこまない）。</li>
<li>靴は前を向いたまま上がり、ひざをついて<b>つま先を外に向けてそろえ</b>、端に寄せる。</li>
<li>手土産は部屋で挨拶をすませてから、紙袋から出して相手に向けて渡す（紙袋は持ち帰るか、たたんで渡す）。</li>
<li>長居をしない（食事どきを避ける・1〜2時間）。</li></ol>`});
P.push({id:'act-rokuyo', cat:'act', t:'六曜（大安・友引・仏滅…）', k:'六曜 大安 友引 仏滅 先勝 先負 赤口 結婚式 葬儀 日取り 吉 凶',
h:()=>`${T([['六曜','意味','よく気にされること'],['大安','一日中よい','結婚式・お祝いにいちばん好まれる'],['友引','朝・夕はよく、昼は凶','<b>葬儀は避ける</b>（友を引く）。お祝いはよい'],['先勝','午前がよい','急ぐことは午前に'],['先負','午後がよい','急がず控えめに'],['赤口','正午ごろだけよい','お祝いは避ける人も'],['仏滅','一日中よくないとされる','結婚式などを避ける人も']])}
${NOTE('仏教とは関係のない暦の考え方です。気にしない人も多いですが、年配の人や地域によっては大事にされます。')}`});

/* よみがなでもさがせるように（ひらがな・カタカナで打っても見つかる） */
const YOMI={香典:'こうでん',祝儀:'しゅうぎ ごしゅうぎ',返信:'へんしん',御中:'おんちゅう',敬語:'けいご',封筒:'ふうとう',年賀状:'ねんがじょう',喪中:'もちゅう',焼香:'しょうこう',
  時候:'じこう',表書き:'おもてがき',水引:'みずひき',大字:'だいじ',宛名:'あてな',上座:'かみざ',下座:'しもざ',法要:'ほうよう ほうじ',長寿:'ちょうじゅ',中元:'ちゅうげん',歳暮:'せいぼ',
  忌み言葉:'いみことば',弔電:'ちょうでん',還暦:'かんれき',米寿:'べいじゅ',喜寿:'きじゅ',古希:'こき',頭語:'とうご',結語:'けつご',拝啓:'はいけい',敬具:'けいぐ',御霊前:'ごれいぜん',御仏前:'ごぶつぜん',
  袱紗:'ふくさ',数珠:'じゅず',四十九日:'しじゅうくにち',一周忌:'いっしゅうき',三回忌:'さんかいき',内祝い:'うちいわい',見舞い:'みまい',六曜:'ろくよう',大安:'たいあん',友引:'ともびき',仏滅:'ぶつめつ',
  手紙:'てがみ',挨拶:'あいさつ',服装:'ふくそう',喪服:'もふく',香典返し:'こうでんがえし',寒中見舞い:'かんちゅうみまい',暑中見舞い:'しょちゅうみまい',訪問:'ほうもん',席次:'せきじ',招待状:'しょうたいじょう'};

/* ───────── 🧮 道具 ───────── */
const DAIJI=['','壱','弐','参','肆','伍','陸','漆','捌','玖'], KAN=['','一','二','三','四','五','六','七','八','九'];
function mnUnder1e4(n, D, big){
  const u=big?['阡','百','拾','']:['千','百','十',''];
  let s=''; const ds=[Math.floor(n/1000)%10, Math.floor(n/100)%10, Math.floor(n/10)%10, n%10];
  ds.forEach((d,i)=>{ if(!d) return; if(i<3 && d===1 && !big) s+=u[i]; else s+=D[d]+u[i]; });
  return s;
}
/* 金額を大字に（「金 参萬圓」） */
function mnDaiji(n, big){
  n=Math.floor(+n); if(!(n>0) || n>=1e8) return '';
  const D=big?DAIJI:KAN, man=Math.floor(n/10000), rest=n%10000;
  return (man?mnUnder1e4(man,D,big)+(big?'萬':'万'):'')+(rest?mnUnder1e4(rest,D,big):'')+(big?'圓':'円');
}
/* 住所の数字を縦書きの漢数字に（123 → 一二三、1-2-3 → 一ー二ー三） */
function mnKanAddr(s){
  return String(s||'').normalize('NFKC').replace(/(\d)\s*[-‐－ー―−]\s*(?=\d)/g,'$1ー').replace(/\d/g,d=>'〇一二三四五六七八九'[+d]);
}
function mnWareki(y, m, d){
  const t=y*10000+(m||12)*100+(d||31);
  if(t>=20190501) return '令和'+(y===2019?'元':y-2018)+'年';
  if(t>=19890108) return '平成'+(y===1989?'元':y-1988)+'年';
  if(t>=19261225) return '昭和'+(y===1926?'元':y-1925)+'年';
  if(t>=19120730) return '大正'+(y===1912?'元':y-1911)+'年';
  return '明治'+(y-1867)+'年';
}
const WD='日月火水木金土';
function mnYmd(d){ return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WD[d.getDay()]+'）'; }

P.push({id:'tool-daiji', cat:'tool', t:'🧮 金額を大字に（ご祝儀・香典の中袋）', k:'大字 金額 漢数字 壱萬圓 中袋 中包み 祝儀 香典 変換',
h:()=>`<p>金額を入れると、中袋に書く形にします。</p>
<div class="mn-form"><label>金額（円）<input type="number" id="mnDjIn" inputmode="numeric" min="1" max="99999999" value="30000" oninput="mnDaijiRun()"></label>
<div class="mn-chips">${[5000,10000,20000,30000,50000,100000].map(v=>`<button onclick="document.getElementById('mnDjIn').value=${v};mnDaijiRun()">${v.toLocaleString()}円</button>`).join('')}</div></div>
<div id="mnDjOut"></div>`, init:()=>mnDaijiRun()});
P.push({id:'tool-atena', cat:'tool', t:'🧮 宛名書きの見本（縦書きの封筒）', k:'宛名 見本 封筒 縦書き 漢数字 住所 書き方 プレビュー 練習',
h:()=>`<p>入れると、縦書きの封筒の見本を出します（数字は漢数字に直します）。書くときの手本にしてください。</p>
<div class="mn-form">
<label>郵便番号<input id="mnAZip" inputmode="numeric" placeholder="1000001" oninput="mnAtenaRun()"></label>
<label>住所（1行目）<input id="mnAAd1" placeholder="東京都千代田区千代田1-2-3" oninput="mnAtenaRun()"></label>
<label>住所（2行目・建物）<input id="mnAAd2" placeholder="サンプルビル5階" oninput="mnAtenaRun()"></label>
<label>会社・部署（あれば）<input id="mnACo" placeholder="株式会社〇〇 総務部" oninput="mnAtenaRun()"></label>
<label>名前<input id="mnAName" placeholder="山田 太郎" oninput="mnAtenaRun()"></label>
<div class="mn-chips" id="mnAKei">${['様','御中','先生','殿'].map((v,i)=>`<button class="${i?'':'on'}" onclick="mnAtenaKei(this)">${v}</button>`).join('')}</div>
</div>
<div id="mnAOut"></div>`, init:()=>mnAtenaRun()});
P.push({id:'tool-hoyo', cat:'tool', t:'🧮 命日から法要の日を出す', k:'法要 計算 命日 四十九日 一周忌 三回忌 七回忌 いつ 何年 日付',
h:()=>`<div class="mn-form"><label>亡くなった日<input type="date" id="mnHyIn" oninput="mnHoyoRun()"></label></div><div id="mnHyOut"></div>${NOTE('亡くなった日を1日目として数えます。法要は当日より前の土日にすることが多いです。')}`,
init:()=>{ const i=$('mnHyIn'); if(i && !i.value){ const d=new Date(); i.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); } mnHoyoRun(); }});
P.push({id:'tool-age', cat:'tool', t:'🧮 生まれた年から長寿祝いの年を出す', k:'長寿 計算 還暦 古希 喜寿 米寿 何年 いつ 生まれ年 和暦',
h:()=>`<div class="mn-form"><label>生まれた年（西暦）<input type="number" id="mnAgIn" inputmode="numeric" min="1900" max="2100" value="1965" oninput="mnAgeRun()"></label></div><div id="mnAgOut"></div>`, init:()=>mnAgeRun()});

function mnDaijiRun(){
  const o=$('mnDjOut'); if(!o) return;
  const n=Math.floor(+$('mnDjIn').value||0);
  if(!(n>0) || n>=1e8){ o.innerHTML='<div class="mn-note">1円〜9999万円で入れてください</div>'; return; }
  const big=mnDaiji(n,true), kan=mnDaiji(n,false);
  const lead=String(n).replace(/0+$/,'')[0];
  o.innerHTML=`<div class="mn-dj"><div class="mn-dj-v">金 ${big}</div><div class="mn-dj-s">中袋の表・真ん中に縦に<br><small>（「金 ${big}也」でもよい）</small></div></div>
    <p>ふつうの漢数字：<b>金 ${kan}</b>　<button class="mn-cp" onclick="navigator.clipboard&&navigator.clipboard.writeText('金 ${big}').then(()=>toast('コピーしました'))">📋 大字をコピー</button></p>`
    +((lead==='4'||lead==='9')?'<div class="mn-ng">✖ 4・9 は「死・苦」に通じるので、ご祝儀・香典では避けることが多い金額です</div>':'')
    +((String(n).match(/^[2468]/) && n>=10000)?'<div class="mn-note">偶数の金額です。ご祝儀は2万円なら許されることも。香典では偶数を避けることが多いです。</div>':'');
}
let mnKei='様';
function mnAtenaKei(b){ document.querySelectorAll('#mnAKei button').forEach(x=>x.classList.toggle('on',x===b)); mnKei=b.textContent; mnAtenaRun(); }
function mnAtenaRun(){
  const o=$('mnAOut'); if(!o) return;
  const v=id=>($(id)&&$(id).value||'').trim();
  const zip=v('mnAZip').normalize('NFKC').replace(/\D/g,'').slice(0,7);
  const a1=mnKanAddr(v('mnAAd1')||'東京都千代田区千代田1-2-3'), a2=mnKanAddr(v('mnAAd2'));
  const co=v('mnACo'), nm=v('mnAName')||(co&&mnKei==='御中'?'':'山田 太郎');
  const kei=mnKei==='御中' ? '' : mnKei;
  const boxes=Array.from({length:7},(_,i)=>`<span class="${i===3?'gap':''}">${zip[i]||''}</span>`).join('');
  o.innerHTML=`<div class="mn-env"><div class="mn-env-stamp">切手</div><div class="mn-env-zip">${boxes}</div>
    <div class="mn-env-right"><div>${esc(a1)}</div>${a2?`<div class="l2">${esc(a2)}</div>`:''}${co?`<div class="co">${esc(co)}${mnKei==='御中'?'<b>　御中</b>':''}</div>`:''}</div>
    ${nm||kei?`<div class="mn-env-name">${esc(nm.replace(/\s+/g,'　'))}${kei?'　'+esc(kei):''}</div>`:''}</div>`
    +(mnKei==='御中' && nm ? '<div class="mn-ng">✖ 人の名前があるときは「御中」ではなく「様」にします</div>':'')
    +'<div class="mn-note">住所は右、宛名は真ん中に大きく。数字は漢数字にしています。</div>';
}
function mnHoyoRun(){
  const o=$('mnHyOut'); if(!o) return;
  const s=$('mnHyIn').value; const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||''); if(!m){ o.innerHTML=''; return; }
  const y=+m[1], mo=+m[2]-1, d=+m[3], base=new Date(y,mo,d), now=new Date(); now.setHours(0,0,0,0);
  const add=n=>{ const t=new Date(y,mo,d); t.setDate(t.getDate()+n); return t; };
  const yr=n=>new Date(y+n,mo,d);
  const L=[['初七日',add(6)],['四十九日',add(48)],['百か日',add(99)],['一周忌',yr(1)],['三回忌',yr(2)],['七回忌',yr(6)],['十三回忌',yr(12)],['十七回忌',yr(16)],['二十三回忌',yr(22)],['二十七回忌',yr(26)],['三十三回忌',yr(32)],['五十回忌',yr(49)]];
  const nx=L.find(r=>r[1]>=now);
  o.innerHTML=`<table class="mn-t"><tr><th>法要</th><th>日</th><th></th></tr>`+L.map(r=>{ const days=Math.round((r[1]-now)/86400000);
    return `<tr class="${r===nx?'mn-now':''}"><td>${r[0]}</td><td>${mnYmd(r[1])}<br><small>${mnWareki(r[1].getFullYear(),r[1].getMonth()+1,r[1].getDate())}</small></td><td><small>${days<0?'すんだ':days===0?'今日':'あと'+days+'日'}</small></td></tr>`; }).join('')+'</table>';
}
function mnAgeRun(){
  const o=$('mnAgOut'); if(!o) return;
  const y=Math.floor(+$('mnAgIn').value||0); if(y<1900||y>2100){ o.innerHTML=''; return; }
  const ny=new Date().getFullYear();
  const L=[['還暦',60,'赤'],['古希',70,'紫'],['喜寿',77,'紫'],['傘寿',80,'黄・金茶'],['米寿',88,'黄・金茶'],['卒寿',90,'白・紫'],['白寿',99,'白'],['百寿',100,'白・桃']];
  o.innerHTML=`<p>${y}年（${mnWareki(y)}）生まれの方</p><table class="mn-t"><tr><th>お祝い</th><th>満年齢で祝う年</th><th>数え年で祝う年</th></tr>`
    +L.map(([n,a,c])=>{ const ym=y+a, yk=y+a-1, k=ym-ny; return `<tr class="${ym>=ny && L.find(r=>y+r[1]>=ny)[0]===n?'mn-now':''}"><td><b>${n}</b>（${a}歳）<br><small>${c}</small></td><td>${ym}年<br><small>${mnWareki(ym)}${k>0?'・あと'+k+'年':k===0?'・<b>今年</b>':''}</small></td><td>${yk}年<br><small>${mnWareki(yk)}</small></td></tr>`; }).join('')+'</table>';
}

/* 道具のページも入れてから、よみがなを足す */
P.forEach(p=>{ const all=p.t+' '+p.k; for(const w in YOMI) if(all.includes(w)) p.k+=' '+YOMI[w]; });

/* ── 画面 ── */
const MN_CSS=`
#mannerOverlay .mn-modal{ display:flex; flex-direction:column; }
.mn-top{ padding:10px 12px 6px; border-bottom:1px solid rgba(120,132,156,.25); }
.mn-top input{ width:100%; box-sizing:border-box; height:44px; padding:0 12px; font-size:17px; border:2px solid var(--acc); border-radius:22px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.mn-bar{ display:flex; gap:6px; margin-top:8px; overflow-x:auto; scrollbar-width:none; }
.mn-bar::-webkit-scrollbar{ display:none; }
.mn-chip{ flex:none; height:32px; padding:0 11px; border-radius:16px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:13px; font-weight:bold; cursor:pointer; white-space:nowrap; }
.mn-chip.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.mn-list{ flex:1; min-height:0; overflow:auto; padding:6px 12px 16px; }
.mn-grp{ font-size:14px; font-weight:bold; color:var(--acc); margin:14px 2px 6px; }
.mn-it{ display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:12px; margin-bottom:6px; border:1px solid rgba(120,132,156,.3); border-radius:12px; background:var(--modal-bg,#fff); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.mn-it span{ flex:1; }
.mn-it small{ display:block; font-weight:normal; font-size:12px; color:var(--text-light,#888); margin-top:2px; }
.mn-it .fv{ flex:none; color:#f9a825; }
.mn-empty{ text-align:center; color:var(--text-light,#888); padding:28px 12px; line-height:1.8; }
.mn-body{ padding:10px 14px calc(16px + var(--safe-bottom,0px)); overflow:auto; font-size:15px; line-height:1.75; color:var(--text,#222); }
.mn-body h4{ font-size:15px; color:var(--acc); margin:16px 0 6px; border-left:4px solid var(--acc); padding-left:8px; }
.mn-body p{ margin:6px 0; } .mn-body ol{ padding-left:1.4em; margin:6px 0; } .mn-body li{ margin:3px 0; }
.mn-body a{ color:var(--acc); font-weight:bold; }
.mn-t{ width:100%; border-collapse:collapse; margin:8px 0; font-size:14px; }
.mn-t th,.mn-t td{ border:1px solid rgba(120,132,156,.35); padding:6px 7px; vertical-align:top; text-align:left; }
.mn-t th{ background:rgba(120,132,156,.12); font-size:13px; }
.mn-t tr.mn-now td{ background:rgba(255,213,79,.28); }
.mn-ok,.mn-ng{ margin:5px 0; padding:6px 10px; border-radius:8px; font-size:14px; }
.mn-ok{ background:rgba(46,125,50,.1); } .mn-ng{ background:rgba(211,47,47,.09); }
.mn-note{ margin:8px 0; padding:8px 10px; border-radius:8px; background:rgba(120,132,156,.1); font-size:13px; color:var(--text,#333); }
.mn-ex{ margin:8px 0; border:1px solid rgba(120,132,156,.35); border-radius:10px; overflow:hidden; }
.mn-ex-h{ display:flex; align-items:center; gap:8px; padding:6px 10px; background:rgba(120,132,156,.1); font-size:13px; font-weight:bold; }
.mn-ex-h .mn-cp{ margin-left:auto; }
.mn-ex-b{ padding:8px 12px; font-size:14px; line-height:1.8; }
.mn-cp{ height:32px; padding:0 10px; border-radius:8px; border:1px solid rgba(120,132,156,.4); background:var(--modal-bg,#fff); color:var(--text,#222); font-size:12.5px; font-weight:bold; cursor:pointer; }
.mn-acts{ display:flex; gap:6px; margin:14px 0 4px; }
.mn-acts button{ flex:1; height:44px; border-radius:10px; border:1px solid rgba(120,132,156,.35); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:14px; font-weight:bold; cursor:pointer; }
.mn-warn{ font-size:12px; color:var(--text-light,#888); margin-top:10px; }
.mn-form label{ display:block; font-size:12.5px; font-weight:bold; color:var(--text-light,#888); margin:8px 0; }
.mn-form input{ display:block; width:100%; box-sizing:border-box; margin-top:4px; height:44px; padding:0 10px; font-size:17px; border:1px solid rgba(120,132,156,.5); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text,#222); }
.mn-chips{ display:flex; flex-wrap:wrap; gap:6px; margin:6px 0; }
.mn-chips button{ height:36px; padding:0 12px; border-radius:18px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#333); font-size:14px; font-weight:bold; cursor:pointer; }
.mn-chips button.on{ background:var(--acc); border-color:var(--acc); color:#fff; }
.mn-dj{ display:flex; align-items:center; gap:14px; margin:10px 0; }
.mn-dj-v{ writing-mode:vertical-rl; font-family:"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif CJK JP","Noto Serif JP","Hiragino Sans","Noto Sans CJK JP","Noto Sans JP","Yu Gothic","Meiryo","IPAGothic",serif; font-size:28px; letter-spacing:.12em; line-height:1.2; padding:14px 10px; border:1px solid #aaa; background:#fff; color:#111; min-height:180px; }
.mn-dj-s{ font-size:13px; color:var(--text-light,#888); }
/* 縦書きは縦の字形を持つ日本語の書体を名前で選ぶ（ない書体に落ちると字が重なることがある） */
.mn-env{ font-family:"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif CJK JP","Noto Serif JP","Hiragino Sans","Noto Sans CJK JP","Noto Sans JP","Yu Gothic","Meiryo","IPAGothic",serif; position:relative; width:min(260px,72vw); aspect-ratio:120/235; margin:10px auto; background:#fffdf7; border:1px solid #bbb; box-shadow:0 2px 8px rgba(0,0,0,.12); color:#111; }
.mn-env-stamp{ position:absolute; left:7%; top:4%; width:22%; aspect-ratio:3/4; border:1px dashed #c33; color:#c33; font-size:11px; display:flex; align-items:center; justify-content:center; font-family:sans-serif; }
.mn-env-zip{ position:absolute; right:6%; top:5%; display:flex; gap:2px; }
.mn-env-zip span{ width:15px; height:21px; border:1px solid #d33; font-size:13px; text-align:center; line-height:21px; font-family:sans-serif; }
.mn-env-zip span.gap{ margin-left:4px; }
.mn-env-right{ position:absolute; right:8%; top:15%; bottom:5%; writing-mode:vertical-rl; line-height:1.35; }
.mn-env-right div{ font-size:min(15px,4.2vw); letter-spacing:.06em; }
.mn-env-right .l2{ margin-top:2em; }
.mn-env-right .co{ margin-top:4.5em; margin-right:.4em; font-size:min(13px,3.6vw); }
.mn-env-name{ position:absolute; left:50%; transform:translateX(-50%); top:24%; bottom:7%; writing-mode:vertical-rl; font-size:min(26px,7vw); letter-spacing:.2em; font-weight:bold; white-space:nowrap; }
#printArea .mn-pr{ font-family:sans-serif; color:#000; font-size:10.5pt; line-height:1.7; }
#printArea .mn-pr h1{ font-size:16pt; margin:0 0 3mm; } #printArea .mn-pr h4{ font-size:11.5pt; margin:4mm 0 1.5mm; }
#printArea .mn-pr table{ width:100%; border-collapse:collapse; } #printArea .mn-pr th, #printArea .mn-pr td{ border:1px solid #999; padding:1.2mm 2mm; text-align:left; vertical-align:top; }
#printArea .mn-pr .mn-cp{ display:none; }
`;
function mnEnsureDom(){
  if($('mannerOverlay')) return;
  const st=document.createElement('style'); st.id='mnStyle'; st.textContent=MN_CSS; document.head.appendChild(st);
  const box=document.createElement('div');
  box.innerHTML=`
<div class="modal-overlay" id="mannerOverlay">
  <div class="modal vol-modal mn-modal" style="position:relative">
    <div class="modal-header"><span>📜 マナー帳</span><span class="hdr-right" style="display:flex;gap:6px;align-items:center">
      <button class="modal-close" onclick="closeManner()" aria-label="閉じる">✕</button></span></div>
    <div class="mn-top"><input id="mnFind" type="search" placeholder="🔍 さがす（例：香典・返信はがき・御中・時候）" autocomplete="off" oninput="mnSetQ(this.value)" enterkeyhint="search">
      <div class="mn-bar" id="mnBar"></div></div>
    <div class="mn-list" id="mnList"></div>
  </div>
</div>
<div class="modal-overlay" id="mnViewOverlay" onclick="if(event.target===this)mnCloseView()">
  <div class="modal"><div class="modal-header"><span id="mnViewHdr">📜</span><button class="modal-close" onclick="mnCloseView()" aria-label="閉じる">✕</button></div>
    <div class="mn-body" id="mnViewBody"></div></div>
</div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function openManner(q){
  mnEnsureDom(); mnLoad(); mnCat='';
  mnQ=typeof q==='string'?q:''; $('mnFind').value=mnQ;
  openDlg('mannerOverlay'); mnRender();
}
function closeManner(){ if(!$('mannerOverlay') || !isDlgOpen('mannerOverlay')) return; mnCloseView(); closeDlg('mannerOverlay'); }
function mnSetQ(v){ mnQ=v; mnRender(); }
function mnSetCat(c){ mnCat=mnCat===c?'':c; mnRender(); }
const pageText=p=>{ if(p._tx==null){ const h=typeof p.h==='function'?p.h():p.h; p._tx=mnNorm(h); } return p._tx; };
function mnSearch(q){
  const words=String(q).trim().split(/[\s　]+/).map(mnNorm).filter(Boolean); if(!words.length) return P.slice();
  const score=p=>{ const t=mnNorm(p.t), k=mnNorm(p.k), b=pageText(p); let s=0;
    for(const w of words){ if(t.includes(w)) s+=50; else if(k.includes(w)) s+=25; else if(b.includes(w)) s+=5; else return 0; } return s; };
  return P.map(p=>[p,score(p)]).filter(a=>a[1]>0).sort((a,b)=>b[1]-a[1]).map(a=>a[0]);
}
function mnItem(p){
  const c=CATS.find(x=>x[0]===p.cat);
  return `<button class="mn-it" data-id="${p.id}" onclick="mnOpen('${p.id}')"><span>${esc(p.t)}<small>${c?c[1]:''}</small></span>${mn.fav.includes(p.id)?'<span class="fv">★</span>':''}</button>`;
}
function mnRender(){
  if(!$('mnList')) return;
  const nf=mn.fav.filter(id=>P.some(p=>p.id===id)).length;
  $('mnBar').innerHTML=(nf?`<button class="mn-chip${mnCat==='★'?' on':''}" onclick="mnSetCat('★')">★ よく見る</button>`:'')
    +CATS.map(([k,l])=>`<button class="mn-chip${mnCat===k?' on':''}" onclick="mnSetCat('${k}')">${l}</button>`).join('');
  const L=$('mnList');
  if(mnQ.trim()){
    let r=mnSearch(mnQ); if(mnCat==='★') r=r.filter(p=>mn.fav.includes(p.id)); else if(mnCat) r=r.filter(p=>p.cat===mnCat);
    L.innerHTML=r.length ? `<div class="mn-grp">見つかったページ（${r.length}）</div>`+r.map(mnItem).join('')
      : `<div class="mn-empty">「<b>${esc(mnQ)}</b>」は見つかりませんでした。<br>短い言葉（例：香典・封筒・敬語）でさがしてみてください。</div>`;
    return;
  }
  if(mnCat==='★'){ L.innerHTML='<div class="mn-grp">★ よく見る</div>'+mn.fav.map(id=>P.find(p=>p.id===id)).filter(Boolean).map(mnItem).join(''); return; }
  L.innerHTML=CATS.filter(c=>!mnCat||c[0]===mnCat).map(([k,l])=>`<div class="mn-grp">${l}</div>`+P.filter(p=>p.cat===k).map(mnItem).join('')).join('')
    +'<div class="mn-note" style="margin-top:14px">ここにあるのは一般的な目安です。地域・宗派・家のしきたりで違うことがあります。迷ったときは、身近な年長の人や式場・お寺・葬儀社に確かめてください。</div>';
}
function mnOpen(id){
  const p=P.find(x=>x.id===id); if(!p) return;
  mnCur=id;
  $('mnViewHdr').textContent='📜 '+p.t.replace(/^🧮\s*/,'');
  const fav=mn.fav.includes(id);
  $('mnViewBody').innerHTML=(typeof p.h==='function'?p.h():p.h)
    +`<div class="mn-acts"><button onclick="mnToggleFav('${id}')">${fav?'★ よく見るから外す':'☆ よく見る'}</button><button onclick="mnPrint('${id}')">🖨 印刷</button></div>`
    +(p.cat==='tool'?'':'<div class="mn-warn">一般的な目安です。地域・宗派・家のしきたりで違うことがあります。</div>');
  if(!isDlgOpen('mnViewOverlay')) openDlg('mnViewOverlay', ()=>{ mnCur=null; }); else $('mnViewBody').scrollTop=0;
  if(p.init) try{ p.init(); }catch(_){}
}
function mnCloseView(){ if($('mnViewOverlay') && isDlgOpen('mnViewOverlay')) closeDlg('mnViewOverlay', ()=>{ mnCur=null; }); }
function mnToggleFav(id){
  const i=mn.fav.indexOf(id); if(i>=0) mn.fav.splice(i,1); else mn.fav.push(id); mnSave();
  const b=[...document.querySelectorAll('#mnViewBody .mn-acts button')][0]; if(b) b.textContent=mn.fav.includes(id)?'★ よく見るから外す':'☆ よく見る';
  mnRender(); toast(mn.fav.includes(id)?'★ よく見るに入れました':'外しました');
}
function mnCopy(btn){
  const t=btn.closest('.mn-ex').querySelector('.mn-ex-b').innerText;
  if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast('コピーしました'),()=>toast('コピーできませんでした'));
}
function mnPrint(id){
  const p=P.find(x=>x.id===id); if(!p) return;
  const body=$('mnViewBody').cloneNode(true); body.querySelectorAll('.mn-acts,.mn-form,.mn-cp').forEach(e=>e.remove());
  const html=`<div class="mn-pr"><h1>${esc(p.t.replace(/^🧮\s*/,''))}</h1>${body.innerHTML}</div>`;
  if(typeof opBuild==='function' && typeof opPrint==='function') opPrint(opBuild(html, true)); else window.print();
}

Object.assign(window, { openManner, closeManner, mnSetQ, mnSetCat, mnOpen, mnCloseView, mnToggleFav, mnCopy, mnPrint,
  mnDaijiRun, mnAtenaRun, mnAtenaKei, mnHoyoRun, mnAgeRun, mnDaiji, mnKanAddr, mnWareki, mnSearch, mnPages:()=>P.map(p=>({id:p.id,cat:p.cat,t:p.t})), mnState:()=>({fav:mn.fav.slice(), cur:mnCur}) });
})();
