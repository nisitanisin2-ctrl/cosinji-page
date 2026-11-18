/* 🍽 食べた物 帳（v693〜v695。表電卓の道具。apps/tabeta/ から 単独の アプリとしても 開ける。はじめて 開いたときに 読む）
   食べた物を 打つか 話すだけで どんどん 記録して いく。
   ・下の 欄に「おにぎり、みそ汁」のように 打って Enter（または ＋）。「、」「,」「・」「／」・改行で 分けて 1品ずつ 入る。
     🎤 で 話したときは「おにぎりと みそ汁」の「と」でも 分ける（⚙ で 切れる）。入れたら 欄は 空に なり、そのまま 続けて 入れられる。
   ・時刻は 入れた 時。朝（4時〜）・昼（10時半〜）・間食（15時〜）・夕（17時〜）・夜食（22時〜）は 時刻から 自動。
     「いつ：いま」を 押すと きのう・ちがう日・朝昼夕・時刻を 決めて あとから まとめて 入れられる（いまに もどすまで 続く）。
   ・よく 食べる 物・さっき 入れた 物は ボタンに なり、押すだけで 入る。
   ・食べた物が 1行ずつ ずっと 並ぶ（どの 行にも 入れた 日付と 時刻。下が 新しい）。上の「もっと 前」で 前の 物を 出す（v694）。
   ・カロリー（目安）：よく ある 物 約300品は 名前から 自動（「2個」「大盛り」「半分」も 計算）。日ごとの 合計も 出す。
     わからない 物は 押して 数字を 入れると、名前ごとに おぼえて 次から 自動（st.my）。⚙ で 出さない ことも できる（v694）。
   ・押すと 直す（名前・日・時刻・食事・量や メモ・消す・もう一度 食べた）。入れた・消したは 下の 帯の ↶ で 取り消せる。
   ・🔍 さがす：その 物を 何回・最後に いつ 食べたか。
   ・⚙：📋 コピー・📤 共有（きょう・きのう・この7日・ぜんぶ）・⬇ CSV（Excel）・▦ 表に 入れる・「と」で 分ける・ぜんぶ 消す。
   ・⬆ CSV を 読み込む：⬇ CSV で 書き出した ものを もどす・ほかの 端末や アプリから うつす（同じ 日時・名前は とばす）（v695）。
   ・表電卓なしで 開く 食べた物 帳だけの アプリは tabeta-app/（⚙ →「📱 食べた物 帳だけの アプリ」に 開き方・Netlify への 置き方）（v695）。
   中身は excalc_tabeta（この端末の中だけ。📋リストの ⬇書き出しにも 入る）。 */
(function(){
'use strict';
const KEY='excalc_tabeta', MAX_E=40000, NAME_N=40, MEMO_N=80;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oneLine=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2600); };
const rid=()=>Math.random().toString(36).slice(2,10);
const okId=x=>typeof x==='string' && /^[a-z0-9]{4,12}$/.test(x);   // onclick に 入れるので 英数字だけ

/* ───────── 日付・時刻 ───────── */
const pad2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const hm=d=>d.getHours()+':'+pad2(d.getMinutes());
let fixedNow=null;   // ためす とき だけ（TABETA.now('2026-11-17T12:30')）
function now(){ return fixedNow ? new Date(fixedNow) : new Date(); }
function okDate(s){
  const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s||'')); if(!m) return null;
  const y=+m[1], mo=+m[2]-1, d=+m[3], t=new Date(y,mo,d);
  return (y>=1900 && y<=2200 && t.getMonth()===mo && t.getDate()===d) ? t : null;
}
const dayStart=d=>new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayNo=d=>Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/86400000);
const WD='日月火水木金土';
function agoText(d){ const n=dayNo(now())-dayNo(d); return n<=0 ? 'きょう' : n===1 ? 'きのう' : n===2 ? 'おととい' : n<60 ? n+'日前' : '約'+Math.round(n/30.44)+'か月前'; }

/* ───────── 食事（時刻から 自動） ───────── */
const MEALS=[['asa','🌅','朝',7*60+30],['hiru','🍱','昼',12*60],['oya','🍪','間食',15*60],['yuu','🍲','夕',19*60],['yoru','🌙','夜食',22*60+30]];
const mealDef=k=>MEALS.find(x=>x[0]===k)||MEALS[0];
function mealOf(d){ const m=d.getHours()*60+d.getMinutes(); return m>=4*60 && m<10*60+30 ? 'asa' : m>=10*60+30 && m<15*60 ? 'hiru' : m>=15*60 && m<17*60 ? 'oya' : m>=17*60 && m<22*60 ? 'yuu' : 'yoru'; }
const mealName=k=>{ const x=mealDef(k); return x[1]+' '+x[2]; };

/* ───────── カロリー（目安・1人前） ─────────
   「名前|べつの 言い方…:ふつうの 1人前のkcal[/1個・1本などの kcal]」。カタカナは ひらがなに そろえて さがすので 書かない。
   数は 日本食品標準成分表 などを もとに した ふつうの 量の おおよそ（店・量で かわる）。 */
const KCAL_SRC=`ごはん|ご飯|白米|ライス|白ごはん|白飯|米:234/234
玄米|玄米ごはん:228/228
雑穀米|雑穀ごはん|麦ごはん|麦飯:230/230
おにぎり|お握り|おむすび|握り飯:180/180
焼きおにぎり:200/200
炊き込みご飯|炊き込みごはん|五目ご飯|五目ごはん|まぜご飯|混ぜご飯:300
赤飯|お赤飯:290
卵かけご飯|卵かけごはん|たまごかけご飯|たまごかけごはん|玉子かけご飯:330
お茶漬け|茶漬け|おちゃづけ:250
おかゆ|お粥|かゆ|粥:110
雑炊|ぞうすい|おじや:250
チャーハン|炒飯|焼き飯|焼飯:650
オムライス:700
チキンライス:600
タコライス|ガパオライス|ガパオ:650
カレーライス|カレー|カレーご飯|ライスカレー:750
ハヤシライス:700
ドライカレー|キーマカレー:650
カレーうどん:500
カレーパン:320/320
カツカレー|かつカレー:950
牛丼|ぎゅうどん:700
豚丼:750
親子丼|おやこどん:650
カツ丼|かつ丼|かつどん:900
天丼|てんどん:800
海鮮丼:600
鉄火丼|まぐろ丼:550
中華丼:650
他人丼|開化丼:650
ビビンバ:600
ロコモコ:800
うな重|うな丼|うなぎ:750
ちらし寿司|ちらしずし:550
寿司|すし|にぎり寿司|握り寿司|お寿司:500/50
回転寿司:600/60
巻き寿司|太巻き|恵方巻き|恵方巻:450
細巻き|かっぱ巻き|鉄火巻き|納豆巻き:180
手巻き寿司|手巻き:200/200
いなり寿司|いなりずし|おいなりさん|いなり:220/110
食パン|パン:160/160
トースト:160/160
バタートースト|バターパン:230/230
ジャムトースト:220/220
ピザトースト:300/300
フレンチトースト:350
ロールパン|バターロール:190/95
クロワッサン:180/180
メロンパン:380/380
あんパン|あんぱん:280/280
クリームパン:300/300
ジャムパン:290/290
チョココロネ:330/330
菓子パン:350/350
惣菜パン|調理パン:330/330
焼きそばパン:400/400
コッペパン:270/270
フランスパン|バゲット:160
ベーグル:250/250
マフィン|イングリッシュマフィン:230/230
サンドイッチ|サンド|サンドウィッチ:350
たまごサンド|卵サンド:350
ハムサンド:300
カツサンド:500
ハンバーガー|バーガー:300/300
チーズバーガー:350/350
てりやきバーガー|照り焼きバーガー:480/480
ビッグマック:520/520
フィッシュバーガー:330/330
ホットドッグ:350/350
ピザ:500/250
うどん|かけうどん|素うどん|釜揚げうどん|ざるうどん:350
きつねうどん:450
たぬきうどん:400
天ぷらうどん|天ぷらうどん:500
肉うどん:500
月見うどん:420
焼きうどん:550
鍋焼きうどん:500
そば|蕎麦|かけそば|ざるそば|もりそば|日本そば:330
天ぷらそば|天そば|天ざる:500
きつねそば:430
月見そば:400
焼きそば|やきそば|ソース焼きそば:550
あんかけ焼きそば|かた焼きそば:650
ラーメン|らーめん|拉麺|中華そば|醤油ラーメン|しょうゆラーメン:500
味噌ラーメン|みそラーメン:550
とんこつラーメン|豚骨ラーメン:600
塩ラーメン:480
つけ麺|つけめん:650
担々麺|担担麺|タンタンメン:650
タンメン:500
ちゃんぽん|長崎ちゃんぽん:650
冷やし中華:550
カップラーメン|カップ麺|カップヌードル|インスタントラーメン:350
カップうどん|カップそば|カップ焼きそば:450
そうめん|素麺|冷や麦|ひやむぎ:300
にゅうめん:300
パスタ|スパゲッティ|スパゲティ|スパゲッティー:600
ナポリタン:650
ミートソース|ミートスパゲッティ|ボロネーゼ:650
カルボナーラ:800
ペペロンチーノ:550
たらこスパゲッティ|たらこパスタ|明太子パスタ:550
和風パスタ:550
グラタン|マカロニグラタン:500
ドリア:600
ラザニア:600
お好み焼き|おこのみやき:550
もんじゃ焼き|もんじゃ:400
たこ焼き|たこやき:380/48
焼きもち|もち|お餅|餅|切り餅:236/118
お雑煮|雑煮|ぞうに|おぞうに:250
きなこもち|きなこ餅|安倍川もち:260
シリアル|コーンフレーク:180
グラノーラ|フルーツグラノーラ:230
オートミール:150
みそ汁|味噌汁|おみそ汁|お味噌汁|みそしる:40
しじみ汁|あさり汁|わかめスープ:30
豚汁|とん汁|ぶた汁:150
けんちん汁:100
すまし汁|お吸い物|吸い物:20
スープ|コンソメスープ|野菜スープ|中華スープ:50
コーンスープ|コーンポタージュ|ポタージュ:120
クラムチャウダー:180
ミネストローネ:100
卵焼き|玉子焼き|たまごやき|だし巻き卵|だし巻き|厚焼き卵:100
目玉焼き|めだまやき:100/100
ゆで卵|ゆでたまご|ゆで玉子|茹で卵|半熟卵|温泉卵|温玉:80/80
卵|たまご|玉子|生卵:80/80
スクランブルエッグ|いり卵|炒り卵:150
オムレツ:200
茶碗蒸し:80
納豆|なっとう:100/100
冷奴|ひややっこ|冷ややっこ|冷やっこ|湯豆腐|豆腐|とうふ:80
揚げ出し豆腐:200
麻婆豆腐|マーボー豆腐:300
麻婆なす|マーボーなす|麻婆茄子:300
厚揚げ:150
焼き魚|やきざかな:150
鮭|焼き鮭|塩鮭|鮭の塩焼き|しゃけ|さけ:130/130
鮭のムニエル:200
さば|鯖|さばの塩焼き:250
さばの味噌煮|さば味噌|鯖の味噌煮:300
さんま|秋刀魚|さんまの塩焼き:300
あじ|鯵|あじの開き|あじの干物:170
あじフライ:250/125
ぶり|鰤|ぶりの照り焼き|ぶり照り|ぶり大根:270
ほっけ|ほっけの開き:250
煮魚|かれいの煮付け|カレイの煮付け:150
いわし|鰯:200
うなぎの蒲焼き|蒲焼き:300
刺身|お刺身|刺し身|お造り|さしみ|おさしみ:150
まぐろ|マグロ|まぐろの刺身:120
サーモン:180
えび|海老:60
いか|イカ:80
たこ|タコ:70
しらす|しらす干し|ちりめんじゃこ:20
ツナ|ツナ缶|シーチキン:150
焼肉|焼き肉|やきにく:500
生姜焼き|しょうが焼き|しょうがやき|豚の生姜焼き|豚肉の生姜焼き:400
とんかつ|豚カツ|トンカツ|ロースカツ|ヒレカツ:450
チキンカツ:400
牛カツ:450
からあげ|唐揚げ|から揚げ|鶏の唐揚げ|鶏の からあげ|ザンギ:300/60
フライドチキン|ケンタッキー:240/240
チキンナゲット|ナゲット:250/50
焼き鳥|焼きとり|やきとり|焼鳥:240/80
照り焼きチキン|チキンの照り焼き|鶏の照り焼き:350
チキンソテー|鶏肉のソテー:350
蒸し鶏|サラダチキン:120
ハンバーグ:400
ステーキ|ビーフステーキ:500
ローストビーフ:200
ポークソテー|豚肉のソテー:400
エビフライ|海老フライ:270/90
カキフライ|牡蠣フライ:300/60
コロッケ|ポテトコロッケ|クリームコロッケ:170/170
メンチカツ:300/300
天ぷら|てんぷら|天麩羅:400
かき揚げ:350/350
肉じゃが|にくじゃが:300
筑前煮|がめ煮:200
煮物|野菜の煮物|かぼちゃの煮物|里芋の煮物:150
ぶり大根:300
野菜炒め|肉野菜炒め:250
もやし炒め:150
ゴーヤチャンプルー|チャンプルー:300
八宝菜:300
回鍋肉|ホイコーロー:400
青椒肉絲|チンジャオロース|チンジャオロース:300
エビチリ|えびチリ|エビのチリソース:250
エビマヨ:350
酢豚:450
油淋鶏|ユーリンチー:450
ギョーザ|餃子|ぎょうざ|ギョウザ|焼き餃子|焼きギョーザ:240/40
水餃子:200/40
シューマイ|焼売|しゅうまい:200/50
春巻き|はるまき:200/100
肉まん|豚まん:250/250
あんまん:280/280
小籠包:200/50
おでん:300
すき焼き|すきやき:700
しゃぶしゃぶ:450
鍋|寄せ鍋|鍋料理|水炊き|ちゃんこ鍋|キムチ鍋|もつ鍋:350
シチュー|クリームシチュー|ホワイトシチュー:400
ビーフシチュー:450
ロールキャベツ:250
ポトフ:250
ポテトサラダ|ポテサラ:200
マカロニサラダ:200
春雨サラダ:120
サラダ|野菜サラダ|グリーンサラダ|生野菜|千切りキャベツ|キャベツ:60
シーザーサラダ:200
コールスロー:120
トマト|ミニトマト|プチトマト:30
きゅうり:15
漬物|つけもの|お新香|おしんこ|たくあん|浅漬け|ぬか漬け|キムチ|しば漬け:20
梅干し|うめぼし:10/10
ひじき|ひじきの煮物|ひじき煮:80
きんぴら|きんぴらごぼう:100
おひたし|お浸し|ほうれん草のおひたし|ほうれん草:30
ごま和え|胡麻和え|白和え:80
酢の物|もずく|もずく酢|めかぶ:30
切り干し大根:80
冷しゃぶ:300
ウインナー|ソーセージ|ウィンナー:160/40
ベーコン:80/40
ハム:40/20
ハムエッグ|ベーコンエッグ:200
焼き豚|チャーシュー:150
枝豆:120
冷凍食品:300
コンビニ弁当|弁当|お弁当|べんとう|おべんとう:700
幕の内弁当|幕の内:750
のり弁|のり弁当:700
唐揚げ弁当|からあげ弁当:850
焼肉弁当:800
しゃけ弁|鮭弁当:650
りんご|林檎:140/140
バナナ:90/90
みかん|蜜柑:45/45
いちご|苺:35/5
ぶどう|葡萄|巨峰|シャインマスカット:90
キウイ|キウイフルーツ:50/50
梨|洋梨:110/110
柿:100/100
もも|桃:80/80
メロン:50
すいか|西瓜:80
パイナップル|パイン:50
オレンジ:60/60
グレープフルーツ:70
さくらんぼ|チェリー:60
ブルーベリー:30
フルーツ|果物|くだもの:80
牛乳|ぎゅうにゅう|ミルク:135/135
低脂肪乳:95/95
コーヒー牛乳|フルーツ牛乳|いちごミルク:140
ヨーグルト|プレーンヨーグルト:80/80
飲むヨーグルト:130
チーズ|プロセスチーズ|スライスチーズ:70/70
豆乳|調整豆乳:110
コーヒー|珈琲|ブラックコーヒー|ホットコーヒー|アイスコーヒー:8
缶コーヒー:70/70
カフェオレ|カフェラテ|ラテ|カフェ・オレ:120
カプチーノ:100
抹茶ラテ:200
紅茶|ストレートティー:2
アイスティー|アイスティ:30
抹茶:5
ミルクティー|ロイヤルミルクティー:100
レモンティー:80
お茶|緑茶|麦茶|ほうじ茶|ウーロン茶|烏龍茶|煎茶|番茶|玄米茶|ジャスミン茶|水|お水|白湯|炭酸水|ミネラルウォーター|お湯:0
ジュース|オレンジジュース|りんごジュース|アップルジュース|ぶどうジュース|グレープジュース|果汁:90/90
野菜ジュース|トマトジュース:70/70
コーラ|サイダー|炭酸飲料|ジンジャーエール|ファンタ:160/160
スポーツドリンク|ポカリスエット|ポカリ|アクエリアス:120/120
乳酸菌飲料|ヤクルト|カルピス:50/50
ココア:150
甘酒|あまざけ:150
エナジードリンク|栄養ドリンク|レッドブル|モンスター:100/100
プロテイン:110
スムージー:150
ビール|生ビール|生中:140/140
発泡酒|第三のビール|ノンアルコールビール:140/140
日本酒|お酒|おさけ|冷酒|熱燗:180/180
焼酎|焼酎の水割り|焼酎のお湯割り:120/120
ワイン|赤ワイン|白ワイン:90/90
ハイボール|ウイスキー|ウィスキー:100/100
チューハイ|酎ハイ|サワー|レモンサワー|缶チューハイ|ストロング:180/180
梅酒:120/120
ケーキ|ショートケーキ|いちごケーキ:350/350
チーズケーキ:300/300
チョコレートケーキ|チョコケーキ|ガトーショコラ:380/380
モンブラン:350/350
ロールケーキ:250/250
シュークリーム:230/230
エクレア:250/250
プリン:150/150
ゼリー|コーヒーゼリー|フルーツゼリー:80/80
杏仁豆腐:150
パフェ:450
アイス|アイスクリーム|ソフトクリーム|バニラアイス|ジェラート:200/200
かき氷:150
チョコ|チョコレート:100
板チョコ:280/280
クッキー|ビスケット|サブレ:150/50
クラッカー:100
ポテトチップス|ポテチ|ポテトチップ:330/330
スナック菓子|お菓子|おかし:250
ポップコーン:300
えびせん|かっぱえびせん:250
せんべい|煎餅|おせんべい|おせんべ|揚げせんべい|あられ|おかき:150/75
大福|豆大福|いちご大福:230/230
団子|だんご|みたらし団子|あんこ団子|串団子:260/130
どら焼き|どらやき:230/230
まんじゅう|饅頭|おまんじゅう:150/150
羊羹|ようかん:170/170
カステラ:160/160
たい焼き|たいやき|今川焼き|大判焼き:230/230
おはぎ|ぼたもち:230/230
桜餅|柏餅|わらび餅|くず餅:150/150
和菓子:200/200
ドーナツ|ドーナッツ:250/250
パンケーキ|ホットケーキ:400
ワッフル:200/200
バームクーヘン:200/200
マドレーヌ|フィナンシェ:130/130
タルト|フルーツタルト:350/350
アップルパイ|パイ:350/350
焼き芋|やきいも|焼きいも|さつまいも|ふかし芋:250
大学芋|大学いも:300
フライドポテト|ポテト|マックフライポテト:350
ナッツ|ミックスナッツ|アーモンド|くるみ|ピーナッツ|落花生:150
ドライフルーツ|干し柿|レーズン:100
グミ:100
飴|キャンディ|キャンディー|あめ玉|のど飴:20/20
ガム:10/10
干し芋:150
プロテインバー|シリアルバー|カロリーメイト|ソイジョイ:200/100
ゼリー飲料|ウイダーインゼリー|インゼリー:180/180
バター:70
マヨネーズ:70
ジャム:40
はちみつ|蜂蜜:60
`;
const KC=new Map();   // ひらがなの 名前 → {k:1人前, u:1個など, name}
const hira=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s・「」『』()（）\[\]【】、。,.!！?？〜~]/g, '');
KCAL_SRC.trim().split('\n').forEach(line=>{
  const m=/^(.+):(\d+)(?:\/(\d+))?$/.exec(line.trim()); if(!m) return;
  const names=m[1].split('|'), v={k:+m[2], u:m[3] ? +m[3] : 0, name:names[0]};
  names.forEach(n=>{ const h=hira(n); if(h && !KC.has(h)) KC.set(h, v); });
});
const KC_KEYS=[...KC.keys()];
// 量の ことば：「2個」「3本」「一人前」「ふたつ」「大盛り」「半分」…
const NUMK={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'半':0.5,'ひと':1,'ふた':2,'みっ':3,'よっ':4};
const QTY_RE=/(\d+(?:\.\d+)?|[一二三四五六七八九十半])\s*(個|こ|杯|はい|ぱい|枚|まい|本|ほん|ぽん|ぼん|切れ|きれ|切|皿|人前|人分|つ|玉|パック|缶|袋|粒|貫|膳|カップ|尾|匹|房|丁|片|かけ|斤|束|ピース|切れ分|つぶ)|(ひと|ふた|みっ|よっ)つ/;
const MULT=[[/特盛り?|メガ盛り?|超大盛り?/,2],[/大盛り?|おおもり|大きめ|多め|おおめ/,1.5],[/小盛り?|少なめ|すくなめ|少し|すこし|ちょっと|ちょこっと|小さめ|ミニ/,0.6],[/ひと口|一口|ひとくち|ひとかけ/,0.2],[/半分|はんぶん|1\/2|半人前/,0.5],[/2倍|二倍/,2]];
function qtyOf(text){   // → {cnt:数（なければ null）, mult:かける 数, rest:量の ことばを 取った 文}
  let s=String(text||'').normalize('NFKC'), cnt=null, mult=1;
  for(const [re, v] of MULT){ if(re.test(s)){ mult*=v; s=s.replace(re, ' '); } }
  const m=QTY_RE.exec(s);
  if(m){ const v=m[3] ? NUMK[m[3]] : /^\d/.test(m[1]) ? parseFloat(m[1]) : NUMK[m[1]]; if(v>0 && v<=50){ cnt=v; s=s.replace(m[0], ' '); } }
  return {cnt, mult, rest:s.replace(/\s+/g,' ').trim()};
}
function baseOf(n){ return hira(qtyOf(n).rest); }
const NOKC=new Set(['朝ごはん','昼ごはん','夜ごはん','晩ごはん','朝ご飯','昼ご飯','夜ご飯','晩ご飯','夕ご飯','夕ごはん','朝食','昼食','夕食','夜食','夕飯','晩飯','間食','おやつ','ごちそう','外食','まかない','給食','手料理','残り物','あまり物'].map(hira));   // 中身が わからない 言葉
function kcLook(h){   // ひらがなの 名前 → 表の 1つ（ぴったり → おわりが 合う → 長く 合う）
  if(!h || NOKC.has(h)) return null;
  if(KC.has(h)) return KC.get(h);
  const hp=h.replace(/(を|は)$/,''); if(hp!==h && hp.length>=2 && KC.has(hp)) return KC.get(hp);   // 「おにぎりを」
  let best=null, bs=-1;
  for(const k of KC_KEYS){
    if(k.length<2 && !h.endsWith(k)) continue;
    const at=h.lastIndexOf(k); if(at<0) continue;
    const sc=(at+k.length===h.length ? 1e6 : 0)+k.length*1000+at;   // 日本語は おわりの 言葉が 本体（焼きギョーザ → ギョーザ）
    if(sc>bs){ bs=sc; best=KC.get(k); }
  }
  return best;
}
const kcCache=new Map();
function kcAuto(n, q){   // → {k, by:'表'|'自分', name} か null
  const key=n+'\t'+q+'\t'+(st && st.my ? Object.keys(st.my).length : 0);
  if(kcCache.has(key)) return kcCache.get(key);
  const a=qtyOf(n), b=qtyOf(q), cnt=a.cnt!=null ? a.cnt : b.cnt, mult=a.mult*b.mult, h=baseOf(n);
  let r=null;
  const my=st && st.my && Object.prototype.hasOwnProperty.call(st.my, h) ? st.my[h] : null;
  if(my!=null) r={k:Math.round(my*(cnt!=null ? cnt : 1)*mult), by:'自分', name:qtyOf(n).rest||n};
  else { const v=kcLook(h); if(v) r={k:Math.round((cnt!=null ? cnt*(v.u||v.k) : v.k)*mult), by:'表', name:v.name}; }
  if(kcCache.size>20000) kcCache.clear();
  kcCache.set(key, r); return r;
}
function kcalOf(x){ if(x.k!=null) return x.k; const a=kcAuto(x.n, x.q); return a ? a.k : null; }
function learnKcal(x, k){   // 自分で 入れた カロリーを 名前ごとに おぼえる（次から 自動）
  const a=qtyOf(x.n), b=qtyOf(x.q), per=k/((a.cnt!=null ? a.cnt : b.cnt!=null ? b.cnt : 1)*a.mult*b.mult), h=baseOf(x.n);
  if(!h || !isFinite(per)) return;
  st.my=st.my||{}; st.my[h]=Math.round(per);
  const ks=Object.keys(st.my); if(ks.length>3000) delete st.my[ks[0]];
  kcCache.clear();
}
const kcText=k=>k==null ? '' : Math.round(k).toLocaleString()+'kcal';

/* ───────── 状態 ───────── */
let st=null;          // {e:[{i,t,n,m,q,k?}] 古い 順（k＝自分で 入れた kcal）, split:true, cal:true, my:{ひらがなの 名前:1人前の kcal}}
let when=null;        // あとから 入れる ときの「いつ」 {day:'YYYY-MM-DD', meal:'asa'|null, time:'HH:MM'|null}（null＝いま）
let q='';             // さがす
const SHOW_N=200;     // はじめに 出す 品数（新しい ほうから）
let shown=SHOW_N;     // 出して いる 品数（上の「もっと 前」で ふやす）
function cleanE(x){
  if(!x || typeof x!=='object') return null;
  const n=oneLine(x.n, NAME_N), t=+x.t; if(!n || !isFinite(t) || t<0) return null;
  const m=MEALS.some(y=>y[0]===x.m) ? x.m : mealOf(new Date(t));
  const o={i:okId(x.i) ? x.i : rid(), t:Math.round(t), n, m, q:oneLine(x.q, MEMO_N)}, k=+x.k;
  if(x.k!=null && x.k!=='' && isFinite(k) && k>=0 && k<=20000) o.k=Math.round(k);
  return o;
}
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  o=(o && typeof o==='object') ? o : {};
  const seen=new Set(), e=(Array.isArray(o.e) ? o.e : []).map(cleanE).filter(Boolean).filter(x=>{ if(seen.has(x.i)) x.i=rid(); seen.add(x.i); return true; });
  e.sort((a,b)=>a.t-b.t);
  const my={}; if(o.my && typeof o.my==='object') Object.keys(o.my).slice(-3000).forEach(h=>{ const v=+o.my[h], hh=hira(h).slice(0, NAME_N); if(hh && isFinite(v) && v>=0 && v<=20000) my[hh]=Math.round(v); });
  st={e:e.slice(-MAX_E), split:o.split!==false, cal:o.cal!==false, my}; kcCache.clear();
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); return true; }catch(_){ toastS('端末に しまえませんでした（空きが 少ない かも しれません。⚙ の ⬇ CSV で 残して、古い 記録を 消して ください）', 5200); return false; } }
const eOf=id=>st.e.find(x=>x.i===id)||null;
function insertSorted(x){ let k=st.e.length; while(k>0 && st.e[k-1].t>x.t) k--; st.e.splice(k, 0, x); }

/* ───────── 入れる ───────── */
// 1回に 入れた 言葉を 1品ずつに 分ける。「、」「,」「・」「／」・改行。声の ときは「と」でも（さとう・おべんとう・とうふ は 分けない）
function splitFoods(text, voice){
  let parts=String(text||'').normalize('NFKC').split(/[、,，・\/\n。]+/).map(s=>s.trim()).filter(Boolean);
  if(voice && st.split) parts=parts.flatMap(p=>splitTo(p));
  return parts.map(p=>oneLine(p.replace(/^(それから|あとは)\s*/,'').replace(/^あと\s+/,'').replace(/(を食べた|食べた|を食べました|食べました|です)$/,''), NAME_N)).filter(Boolean);   // 頭の「それから」「あとは」・おわりの「食べた」は 落とす
}
function splitTo(p){
  for(let i=2;i<p.length-1;i++){
    if(p[i]!=='と') continue;
    const L=p.slice(0,i).trim(), R=p.slice(i+1).trim();
    if(L.length<2 || R.length<2 || /^[うぅ]/.test(R)) continue;   // さとう・おべんとう・とうふ・いとこ煮 は 1つ
    return [L].concat(splitTo(R));
  }
  return [p];
}
function whenTime(){   // 入れる 時刻（いま か「いつ」で 決めた 時）
  const n=now();
  if(!when) return {t:n.getTime(), m:mealOf(n)};
  const d=okDate(when.day)||dayStart(n);
  let mins;
  if(when.time && /^\d{1,2}:\d\d$/.test(when.time)){ const [h,mi]=when.time.split(':').map(Number); mins=h*60+mi; }
  else if(when.meal) mins=mealDef(when.meal)[3];
  else mins=n.getHours()*60+n.getMinutes();
  const t=new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(mins/60), mins%60, 0).getTime()+(when.seq=(when.seq||0)+1)*1000;   // 同じ 時刻でも 入れた 順に 並ぶ
  return {t, m:when.meal || mealOf(new Date(t))};
}
function addFoods(names, how){
  if(!names.length) return [];
  if(st.e.length+names.length>MAX_E){ toastS('記録は '+MAX_E.toLocaleString()+' 品まで です。⚙ の ⬇ CSV で 残して、古い 記録を 消して ください', 5200); return []; }
  const added=[]; let base=null;
  names.forEach((n, k)=>{ const w=whenTime(); if(base==null) base=w.t; const x={i:rid(), t:when ? w.t : base+k, n, m:w.m, q:''}; insertSorted(x); added.push(x); });
  if(!save()){ added.forEach(x=>{ const k=st.e.indexOf(x); if(k>=0) st.e.splice(k,1); }); return []; }
  showUndo((added.length===1 ? '「'+added[0].n+'」' : added.length+'品（'+added.map(x=>x.n).join('・').slice(0,40)+'）')+'を 入れました'+(when ? '（'+whenText()+'）' : ''), ()=>{ added.forEach(x=>{ const k=st.e.indexOf(x); if(k>=0) st.e.splice(k,1); }); save(); render(); });
  return added;
}
function addText(text, voice){
  const names=splitFoods(text, voice); if(!names.length) return [];
  const a=addFoods(names, voice ? 'voice' : 'text'); if(a.length){ q=''; render(true); }
  return a;
}
function addGo(){
  const inp=$('tbIn'); if(!inp) return;
  const v=inp.value; if(!v.trim()){ toastS('食べた物を 入れて ください（例：おにぎり、みそ汁）'); try{ inp.focus(); }catch(_){} return; }
  if(addText(v, false).length){ inp.value=''; try{ inp.focus(); }catch(_){} }
}
function chip(i){ const n=chipList()[+i]; if(!n) return; addFoods([n], 'chip'); q=''; render(true); }

/* ───────── よく 食べる 物・さっき 入れた 物（ボタン） ───────── */
function chipList(){
  const lim=now().getTime()-90*86400000, cnt=new Map(), last=new Map();
  for(const x of st.e){ if(x.t<lim) continue; cnt.set(x.n, (cnt.get(x.n)||0)+1); last.set(x.n, x.t); }
  const recent=[...last.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  const top=[...cnt.entries()].sort((a,b)=>b[1]-a[1] || (last.get(b[0])-last.get(a[0]))).map(x=>x[0]);
  return [...new Set(recent.concat(top))].slice(0,18);
}

/* ───────── 取り消し（下の 帯） ───────── */
let undo=null, undoT=0;
function showUndo(msg, fn){
  undo=fn; const u=$('tbUndo'); if(!u) return;
  u.innerHTML='<span>'+esc(msg)+'</span><button type="button" onclick="TABETA.undo()">↶ 取り消す</button>';
  u.classList.add('on'); clearTimeout(undoT); undoT=setTimeout(()=>{ u.classList.remove('on'); undo=null; }, 6000);
}
function undoDo(){ const f=undo; undo=null; clearTimeout(undoT); const u=$('tbUndo'); if(u) u.classList.remove('on'); if(f){ f(); toastS('取り消しました'); } }

/* ───────── 画面 ───────── */
function whenText(){
  if(!when) return '';
  const d=okDate(when.day)||dayStart(now()), n=dayNo(now())-dayNo(d);
  const dt=n===0 ? 'きょう' : n===1 ? 'きのう' : n===2 ? 'おととい' : (d.getMonth()+1)+'/'+d.getDate();
  return dt+(when.meal ? 'の '+mealName(when.meal) : '')+(when.time ? ' '+when.time : '');
}
function dateText(d){   // 11/17（火）・年が ちがえば 2025/11/17（月）
  return (d.getFullYear()!==now().getFullYear() ? d.getFullYear()+'/' : '')+(d.getMonth()+1)+'/'+d.getDate()+'（'+WD[d.getDay()]+'）';
}
function dayTotals(){   // 日ごとの カロリー 合計（わからない 物の 数も）
  const m=new Map();
  for(const x of st.e){ const k=ymd(new Date(x.t)), o=m.get(k)||{s:0, u:0, n:0}, c=kcalOf(x); o.n++; if(c==null) o.u++; else o.s+=c; m.set(k, o); }
  return m;
}
function dsumHtml(d, o){
  if(!o || o.u===o.n) return '';
  return '<div class="tb-dsum">'+dateText(d)+'の 合計 <b>約'+kcText(o.s)+'</b>'+(o.u ? '<small>（わからない 物 '+o.u+'品は 入って いません）</small>' : '')+'</div>';
}
function rowsHtml(list, totals){   // 食べた物を 1行ずつ（入れた 日付・時刻つき・カロリー）。日が かわる 所に 線
  const tk=ymd(now()), cal=st.cal, tot=cal && totals ? dayTotals() : null; let prev='';
  return '<div class="tb-list">'+list.map((x, i)=>{
    const d=new Date(x.t), k=ymd(d), nd=k!==prev; prev=k;
    const c=cal ? kcalOf(x) : null, nx=list[i+1], last=!nx || ymd(new Date(nx.t))!==k;
    return '<button type="button" class="tb-row'+(nd ? ' nd' : '')+(k===tk ? ' td' : '')+'" onclick="TABETA.open(\''+x.i+'\')"><span class="tb-dt">'+dateText(d)+'<b>'+hm(d)+'</b></span><span class="tb-nm">'+esc(x.n)+(x.q ? '<small>'+esc(x.q)+'</small>' : '')+'</span>'
      +(c!=null ? '<span class="tb-kc'+(x.k!=null ? ' my' : '')+'">'+Math.round(c).toLocaleString()+'<small>kcal</small></span>' : '')+'</button>'
      +(tot && last ? dsumHtml(d, tot.get(k)) : '');
  }).join('')+'</div>';
}
function render(toBottom){
  const b=$('tbBody'); if(!b) return;
  const keepBottom=toBottom || (b.scrollHeight-b.scrollTop-b.clientHeight<40);
  const qq=q.trim().normalize('NFKC').toLowerCase();
  let html='';
  if(qq){
    const hit=st.e.filter(x=>x.n.normalize('NFKC').toLowerCase().includes(qq)||x.q.normalize('NFKC').toLowerCase().includes(qq));
    if(!hit.length) html='<p class="tb-note">「'+esc(q.trim())+'」は まだ ありません。</p>';
    else {
      const names=new Map(); hit.forEach(x=>{ const o=names.get(x.n)||{n:0, last:0}; o.n++; o.last=Math.max(o.last, x.t); names.set(x.n, o); });
      html='<div class="tb-sum">'+[...names.entries()].sort((a,b)=>b[1].n-a[1].n).slice(0,8).map(([n,o])=>'<div><b>'+esc(n)+'</b> '+o.n+'回・最後 '+(new Date(o.last).getMonth()+1)+'月'+new Date(o.last).getDate()+'日（'+agoText(new Date(o.last))+'）</div>').join('')+'</div>'
        +rowsHtml(hit.slice(-300), false)+(hit.length>300 ? '<p class="tb-note">新しい 300件を 出して います（ぜんぶで '+hit.length+'件）</p>' : '');
    }
  } else if(!st.e.length){
    html='<div class="tb-empty"><div class="e" aria-hidden="true">🍽</div><p>食べた物を 下の 欄に 打つか 🎤 で 話して ください。<br>入れた 物が 1行ずつ ずっと 並んで いきます。<br>「おにぎり、みそ汁、卵焼き」のように まとめて 入れると 1品ずつ 入ります。</p><p>入れた <b>日付と 時刻は 自動で</b> つきます。あとから 入れる ときは「いつ：いま」を 押して 日を えらびます。</p></div>';
  } else {
    const list=st.e.slice(-shown), older=st.e.length-list.length;
    html=(older ? '<button type="button" class="tb-more" onclick="TABETA.more()">▲ もっと 前を 見る（あと '+older.toLocaleString()+'品）</button>' : '')
      +rowsHtml(list, true)+'<p class="tb-count">ぜんぶで '+st.e.length.toLocaleString()+'品</p>';
  }
  b.innerHTML='<div class="tb-wrap">'+html+'</div>';
  renderDock();
  if(keepBottom && !qq) b.scrollTop=b.scrollHeight;
}
function renderDock(){
  const w=$('tbWhen'), c=$('tbChips'); if(!w || !c) return;
  const nm=mealName(mealOf(now()));
  w.innerHTML=when ? '🕘 '+esc(whenText())+'<b>✕</b>' : '🕘 いつ：いま（'+nm+'）';
  w.classList.toggle('set', !!when);
  const ch=chipList();
  c.innerHTML=ch.length ? ch.map((n,i)=>'<button type="button" onclick="TABETA.chip('+i+')">＋ '+esc(n)+'</button>').join('') : '<span class="tb-hint">よく 食べる 物は ここに ボタンで 出ます</span>';
}

/* ───────── 小さな窓（直す・いつ・メニュー） ───────── */
let pop=null;
function popOpen(html, kind, id){
  popClose();
  const host=document.querySelector('#tabetaOverlay .tb-modal'); if(!host) return;
  const el=document.createElement('div'); el.className='tb-pop-bg';
  el.innerHTML='<div class="tb-pop" role="dialog" aria-modal="true">'+html+'</div>';
  el.addEventListener('mousedown', ev=>{ if(ev.target===el) popClose(); });
  host.appendChild(el);
  pop={el, kind, id, rel:()=>{}};
  const me=pop; if(typeof modalBack==='function') pop.rel=modalBack(()=>{ if(pop===me){ pop=null; el.remove(); } });   // 端末の「戻る」は この窓だけ 閉じる
}
function popClose(){ if(!pop) return; const p=pop; pop=null; p.rel(); p.el.remove(); }
const ph=t=>'<div class="tb-ph"><b>'+t+'</b><button type="button" class="tb-x" onclick="TABETA.close()" aria-label="閉じる">✕</button></div>';
function openItem(id){
  const x=eOf(id); if(!x) return;
  const d=new Date(x.t), au=kcAuto(x.n, x.q);
  popOpen(ph('✏ 直す')
    +'<label class="tb-f"><span>食べた物</span><input id="tbEN" type="text" maxlength="'+NAME_N+'" value="'+esc(x.n)+'"></label>'
    +'<label class="tb-f"><span>量・メモ</span><input id="tbEQ" type="text" maxlength="'+MEMO_N+'" value="'+esc(x.q)+'" placeholder="例：大盛り・半分・外食"></label>'
    +'<label class="tb-f"><span>カロリー</span><input id="tbEK" type="number" inputmode="numeric" min="0" max="20000" step="1" value="'+(x.k!=null ? x.k : '')+'" placeholder="'+(au ? String(au.k) : 'わからない')+'"><em>kcal</em></label>'
    +'<p class="tb-note" id="tbEKn">'+(au ? (au.by==='自分' ? '前に 自分で 入れた 値から' : '「'+esc(au.name)+'」として')+' 約'+kcText(au.k)+'（目安）。' : 'この 物の カロリーは 自動では わかりません。')+'数字を 入れると その 値に なり、次から 同じ 名前は その 値で 入ります。空に すると 自動に もどります。</p>'
    +'<label class="tb-f"><span>日</span><input id="tbED" type="date" value="'+ymd(d)+'"></label>'
    +'<label class="tb-f"><span>時刻</span><input id="tbET" type="time" value="'+pad2(d.getHours())+':'+pad2(d.getMinutes())+'"></label>'
    +'<div class="tb-f"><span>食事</span><div class="tb-seg" id="tbEM">'+MEALS.map(m=>'<button type="button" data-m="'+m[0]+'" class="'+(x.m===m[0]?'on':'')+'" onclick="TABETA.pickMeal(this)">'+m[1]+' '+m[2]+'</button>').join('')+'</div></div>'
    +'<div class="tb-acts"><button type="button" class="tb-b pri" onclick="TABETA.saveItem(\''+x.i+'\')">✓ 直す</button><button type="button" class="tb-b" onclick="TABETA.again(\''+x.i+'\')">🔁 もう一度 食べた（いま 入れる）</button><button type="button" class="tb-b warn" onclick="TABETA.del(\''+x.i+'\')">🗑 消す</button></div>', 'item', x.i);
}
function pickMeal(btn){ btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b===btn)); }
function saveItem(id){
  const x=eOf(id); if(!x) return popClose();
  const n=oneLine(($('tbEN')||{}).value, NAME_N); if(!n){ toastS('食べた物を 入れて ください'); return; }
  const d=okDate(($('tbED')||{}).value)||dayStart(new Date(x.t)), tm=String(($('tbET')||{}).value||'');
  const mm=/^(\d{1,2}):(\d\d)$/.exec(tm), H=mm ? +mm[1] : new Date(x.t).getHours(), M=mm ? +mm[2] : new Date(x.t).getMinutes();
  const onBtn=document.querySelector('#tbEM button.on'), old=Object.assign({}, x), oldMy=Object.assign({}, st.my||{});
  const kr=String(($('tbEK')||{}).value||'').trim(), kv=kr==='' ? null : Math.round(+kr);
  if(kv!=null && !(isFinite(kv) && kv>=0 && kv<=20000)){ toastS('カロリーは 0〜20000 の 数で 入れて ください'); return; }
  x.n=n; x.q=oneLine(($('tbEQ')||{}).value, MEMO_N);
  if(kv==null){ if(old.k!=null){ delete x.k; if(st.my) delete st.my[baseOf(x.n)]; kcCache.clear(); } }
  else if(kv!==old.k || n!==old.n || x.q!==old.q){ x.k=kv; learnKcal(x, kv); } x.t=new Date(d.getFullYear(), d.getMonth(), d.getDate(), H, M, new Date(old.t).getSeconds()).getTime(); x.m=onBtn ? onBtn.dataset.m : mealOf(new Date(x.t));
  st.e.splice(st.e.indexOf(x), 1); insertSorted(x); save(); popClose(); render();
  showUndo('「'+x.n+'」を 直しました', ()=>{ delete x.k; Object.assign(x, old); st.my=oldMy; kcCache.clear(); st.e.splice(st.e.indexOf(x), 1); insertSorted(x); save(); render(); });
}
function delItem(id){
  const x=eOf(id); if(!x) return; const k=st.e.indexOf(x);
  st.e.splice(k, 1); save(); popClose(); render();
  showUndo('「'+x.n+'」を 消しました', ()=>{ insertSorted(x); save(); render(); });
}
function again(id){ const x=eOf(id); if(!x) return; popClose(); const w=when; when=null; addFoods([x.n], 'again'); when=w; render(true); }
function openWhen(){
  const T=dayStart(now()), cur=when||{day:ymd(T), meal:null, time:null};
  const dayBtn=(n,t)=>{ const d=new Date(T.getFullYear(), T.getMonth(), T.getDate()-n), k=ymd(d); return '<button type="button" class="'+(cur.day===k?'on':'')+'" onclick="TABETA.setWhen(\'day\',\''+k+'\')">'+t+'</button>'; };
  popOpen(ph('🕘 いつ 食べた？')
    +'<p class="tb-note">あとから 入れる ときに。決めた 日・食事で、もどすまで 続けて 入れられます。</p>'
    +'<div class="tb-f"><span>日</span><div class="tb-seg">'+dayBtn(0,'きょう')+dayBtn(1,'きのう')+dayBtn(2,'おととい')+'</div></div>'
    +'<label class="tb-f"><span></span><input id="tbWD" type="date" value="'+esc(cur.day)+'" max="'+ymd(T)+'" onchange="TABETA.setWhen(\'day\',this.value)"></label>'
    +'<div class="tb-f"><span>食事</span><div class="tb-seg">'+MEALS.map(m=>'<button type="button" class="'+(cur.meal===m[0]?'on':'')+'" onclick="TABETA.setWhen(\'meal\',\''+m[0]+'\')">'+m[1]+' '+m[2]+'</button>').join('')+'</div></div>'
    +'<label class="tb-f"><span>時刻</span><input id="tbWT" type="time" value="'+esc(cur.time||'')+'" onchange="TABETA.setWhen(\'time\',this.value)"><em>（なくても よい）</em></label>'
    +'<div class="tb-acts"><button type="button" class="tb-b pri" onclick="TABETA.close()">✓ これで 入れる</button><button type="button" class="tb-b" onclick="TABETA.setWhen(\'now\')">🕘 いまに もどす</button></div>', 'when');
}
function setWhen(k, v){
  const T=dayStart(now());
  if(k==='now'){ when=null; popClose(); renderDock(); toastS('いまの 時刻で 入れます'); return; }
  const w=when||{day:ymd(T), meal:null, time:null};
  if(k==='day'){ const d=okDate(v); if(!d || dayNo(d)>dayNo(T)) return; w.day=ymd(d); }
  else if(k==='meal'){ w.meal=MEALS.some(m=>m[0]===v) ? v : null; w.time=null; }
  else if(k==='time'){ w.time=/^\d{1,2}:\d\d$/.test(String(v)) ? String(v) : null; if(w.time) w.meal=mealOf(new Date(2000,0,1,+w.time.split(':')[0],+w.time.split(':')[1])); }
  w.seq=0; when=w; renderDock();
  if(pop && pop.kind==='when') openWhen();
}
function whenTap(){ if(when){ when=null; renderDock(); toastS('いまの 時刻で 入れます'); } else openWhen(); }
function openMenu(){
  const n=st.e.length, days=new Set(st.e.map(x=>ymd(new Date(x.t)))).size;
  popOpen(ph('⚙ 食べた物 帳')
    +'<p class="tb-note">いま <b>'+n.toLocaleString()+'</b>品（'+days+'日ぶん）。入れた ものは この 端末の 中だけに あります'+(solo() ? '。⬇ CSV で 控えを 残せます。' : '（📋リストの ⬇書き出しにも 入ります）。')+'</p>'
    +'<h5>コピー・共有（LINE・メールに 貼れます）</h5>'
    +'<div class="tb-seg wide">'+[['today','きょう'],['yday','きのう'],['week','この7日'],['all','ぜんぶ']].map(([k,t])=>'<button type="button" onclick="TABETA.out(\'copy\',\''+k+'\')">📋 '+t+'</button>').join('')+'</div>'
    +'<div class="tb-seg wide">'+[['today','きょう'],['week','この7日']].map(([k,t])=>'<button type="button" onclick="TABETA.out(\'share\',\''+k+'\')">📤 '+t+'を 送る</button>').join('')+'</div>'
    +'<h5>ほかの 形で</h5>'
    +'<div class="tb-acts col"><button type="button" class="tb-b" onclick="TABETA.csv()">⬇ CSV（Excel）で 保存（ぜんぶ）</button>'+(typeof toolPasteRows==='function' ? '<button type="button" class="tb-b" onclick="TABETA.out(\'table\',\'week\')">▦ この7日を 表に 入れる</button>' : '')
      +'<button type="button" class="tb-b" onclick="TABETA.importClick()">⬆ CSV を 読み込む（足す）</button><button type="button" class="tb-b" onclick="TABETA.appHelp()">📱 食べた物 帳だけの アプリ'+(solo() ? '（いま 開いて います）' : '')+'</button></div>'
    +'<h5>入れ方</h5>'
    +'<label class="tb-chk"><input type="checkbox" '+(st.cal ? 'checked' : '')+' onchange="TABETA.setCal(this.checked)"> 🔥 カロリー（目安）を 出す（よく ある 物は 自動。わからない 物は 押して 数字を 入れると、次から 同じ 名前は 自動）</label>'
    +'<label class="tb-chk"><input type="checkbox" '+(st.split ? 'checked' : '')+' onchange="TABETA.setSplit(this.checked)"> 🎤 で 話した ときは「と」でも 分ける（おにぎりと みそ汁 → 2品）</label>'
    +'<div class="tb-acts col"><button type="button" class="tb-b warn" onclick="TABETA.wipe()">🗑 ぜんぶ 消す</button></div>', 'menu');
}
function setSplit(v){ st.split=!!v; save(); }
function setCal(v){ st.cal=!!v; save(); render(); }
function rangeOf(k){
  const T=dayStart(now()).getTime(), D=86400000;
  if(k==='today') return {from:T, to:T+D, title:'きょう'};
  if(k==='yday') return {from:T-D, to:T, title:'きのう'};
  if(k==='week') return {from:T-6*D, to:T+D, title:'この7日'};
  return {from:0, to:Infinity, title:'ぜんぶ'};
}
function text(k){
  const r=rangeOf(k||'today'), list=st.e.filter(x=>x.t>=r.from && x.t<r.to);
  if(!list.length) return '';
  const cal=st.cal, tot=cal ? dayTotals() : null; let all=0;
  const lines=list.map((x, i)=>{ const d=new Date(x.t), k=ymd(d), c=cal ? kcalOf(x) : null, nx=list[i+1];
    let l=dateText(d)+' '+hm(d)+'　'+x.n+(x.q ? '（'+x.q+'）' : '')+(c!=null ? '　'+kcText(c) : '');
    if(cal && (!nx || ymd(new Date(nx.t))!==k)){ const o=tot.get(k); if(o && o.u<o.n){ l+='\n　→ '+dateText(d)+'の 合計 約'+kcText(o.s)+(o.u ? '（わからない 物 '+o.u+'品を のぞく）' : ''); all+=o.s; } }
    return l; });
  return '🍽 食べた物（'+r.title+'・'+list.length+'品）\n'+lines.join('\n')+(cal && r.title!=='きょう' && r.title!=='きのう' && all ? '\n\nカロリー 合計 約'+kcText(all)+'（目安）' : '');
}
function rows(k){
  const r=rangeOf(k||'week'), list=st.e.filter(x=>x.t>=r.from && x.t<r.to);
  return [['日付','時刻','食事','食べた物','量・メモ','カロリー(kcal)']].concat(list.map(x=>{ const d=new Date(x.t), c=kcalOf(x); return [ymd(d), hm(d), mealDef(x.m)[2], x.n, x.q, c==null ? '' : Math.round(c)]; }));
}
function out(kind, k){
  const t=text(k), r=rangeOf(k);
  if(!t){ toastS(r.title+'の 記録が ありません'); return; }
  popClose();
  if(kind==='copy'){ if(typeof toolCopyText==='function') toolCopyText(t, '📋 '+r.title+'の 食べた物を コピーしました（LINE などに 貼れます）'); return; }
  if(kind==='share'){ if(typeof toolShareText==='function') toolShareText('食べた物（'+r.title+'）', t); return; }
  if(kind==='table'){ if(typeof toolPasteRows==='function') toolPasteRows(rows(k), '食べた物 帳', closeTabeta); }
}
function csv(){
  if(!st.e.length){ toastS('記録が ありません'); return; }
  const cs=v=>typeof csvSafe==='function' ? csvSafe(v) : String(v);
  const body='﻿'+rows('all').map(r=>r.map(v=>'"'+cs(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const n=now(), name='tabeta_'+n.getFullYear()+pad2(n.getMonth()+1)+pad2(n.getDate())+'.csv';
  const a=Object.assign(document.createElement('a'), {href:URL.createObjectURL(new Blob([body], {type:'text/csv;charset=utf-8'})), download:name});
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  popClose(); toastS('⬇ CSV を 保存しました（Excel で 開けます）');
}
async function wipe(){
  if(!st.e.length){ toastS('記録が ありません'); return; }
  const ok=typeof appConfirm==='function' ? await appConfirm('食べた物の 記録 '+st.e.length+'品を ぜんぶ 消します。よろしいですか？（先に ⬇ CSV で 残せます）') : confirm('ぜんぶ 消しますか？');
  if(!ok) return;
  const keep=st.e; st.e=[]; save(); popClose(); render();
  showUndo('ぜんぶ 消しました', ()=>{ st.e=keep; save(); render(true); });
}
/* ───────── ⬆ CSV を 読み込む（⬇ CSV で 書き出した ものを もどす・ほかの 端末や アプリから うつす） ───────── */
function parseCsv(t){
  const rows=[]; let row=[], f='', qt=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(qt){ if(c==='"'){ if(t[i+1]==='"'){ f+='"'; i++; } else qt=false; } else f+=c; }
    else if(c==='"') qt=true;
    else if(c===','){ row.push(f); f=''; }
    else if(c==='\n' || c==='\r'){ if(c==='\r' && t[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=''; }
    else f+=c;
  }
  if(f!=='' || row.length){ row.push(f); rows.push(row); }
  return rows.filter(r=>r.some(v=>String(v).trim()!==''));
}
function importText(text){   // → {add, skip, bad} か null（食べた物の CSV では ない）
  const rows=parseCsv(String(text||'').replace(/^﻿/, ''));
  if(!rows.length) return null;
  const hd=rows[0].map(v=>String(v).trim()), col=w=>hd.findIndex(h=>h.includes(w));
  const cD=col('日付'), cT=col('時刻'), cM=col('食事'), cN=col('食べた'), cQ=col('量'), cK=col('カロリー');
  if(cD<0 || cN<0) return null;
  const unq=v=>String(v==null?'':v).replace(/^'(?=[=+\-@])/, '');   // 書き出しで 頭に 足した「'」を とる
  const have=new Set(st.e.map(x=>Math.floor(x.t/60000)+'\t'+x.n));
  const add=[]; let skip=0, bad=0;
  rows.slice(1).forEach((r, k)=>{
    const dm=/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(String(r[cD]||'').trim()), n=oneLine(unq(r[cN]), NAME_N);
    if(!dm || !n){ bad++; return; }
    const d=okDate(dm[1]+'-'+pad2(+dm[2])+'-'+pad2(+dm[3])); if(!d){ bad++; return; }
    const tm=/^(\d{1,2}):(\d{2})/.exec(String(cT>=0 ? r[cT] : '').trim()), H=tm ? Math.min(23, +tm[1]) : 12, M=tm ? Math.min(59, +tm[2]) : 0;
    const t=new Date(d.getFullYear(), d.getMonth(), d.getDate(), H, M).getTime()+(k%60)*10;   // 同じ 分の ものは 書いて ある 順に
    const key=Math.floor(t/60000)+'\t'+n; if(have.has(key)){ skip++; return; } have.add(key);
    const mn=cM>=0 ? String(r[cM]||'').trim() : '', mk=(MEALS.find(m=>m[2]===mn || m[0]===mn)||[])[0];
    const x={i:rid(), t, n, m:mk || mealOf(new Date(t)), q:oneLine(cQ>=0 ? unq(r[cQ]) : '', MEMO_N)};
    const kv=cK>=0 && String(r[cK]||'').trim()!=='' ? Math.round(+String(r[cK]).replace(/[^\d.]/g,'')) : null;
    if(kv!=null && isFinite(kv) && kv>=0 && kv<=20000){ const a=kcAuto(x.n, x.q); if(!a || a.k!==kv){ x.k=kv; learnKcal(x, kv); } }
    add.push(x);
  });
  if(st.e.length+add.length>MAX_E){ toastS('記録は '+MAX_E.toLocaleString()+' 品まで です（いま '+st.e.length.toLocaleString()+'品・読む '+add.length.toLocaleString()+'品）', 5200); return {add:0, skip, bad, over:true}; }
  if(add.length){
    st.e=st.e.concat(add).sort((a,b)=>a.t-b.t); kcCache.clear();
    if(!save()){ const ids=new Set(add.map(x=>x.i)); st.e=st.e.filter(x=>!ids.has(x.i)); return {add:0, skip, bad}; }
    const ids=new Set(add.map(x=>x.i));
    showUndo(add.length.toLocaleString()+'品を 読み込みました', ()=>{ st.e=st.e.filter(x=>!ids.has(x.i)); save(); render(true); });
    q=''; const fd=$('tbFind'); if(fd) fd.value=''; render(true);
  }
  return {add:add.length, skip, bad};
}
function importClick(){ const f=$('tbFileIn'); if(f) f.click(); }
async function importFile(inp){
  const f=inp.files && inp.files[0]; inp.value=''; if(!f) return;
  if(f.size>20*1024*1024){ toastS('ファイルが 大きすぎます（20MB まで）'); return; }
  let buf; try{ buf=await f.arrayBuffer(); }catch(_){ toastS('ファイルを 読めませんでした'); return; }
  let t=new TextDecoder('utf-8').decode(buf);
  if(/�/.test(t)){ try{ t=new TextDecoder('shift_jis').decode(buf); }catch(_){} }   // Excel で 保存し直した CSV（Shift_JIS）
  const r=importText(t);
  if(!r){ toastS('食べた物 帳の CSV では ありません（1行目に「日付」「食べた物」の 列が いります）', 5200); return; }
  popClose(); render(true);
  if(!r.over) toastS(r.add ? '⬆ '+r.add.toLocaleString()+'品を 読み込みました'+(r.skip ? '（もう ある '+r.skip+'品は とばしました）' : '') : 'あたらしい ものは ありませんでした'+(r.skip ? '（もう ある '+r.skip+'品）' : ''), 4200);
}
/* ───────── 📱 食べた物 帳だけの アプリ（tabeta-app/） ───────── */
const solo=()=>document.documentElement.classList.contains('tb-solo');
function appHelp(){
  popOpen(ph('📱 食べた物 帳だけの アプリ')+'<div class="tb-help" id="tbAppHelp">'
    +'<p>表電卓を 開かずに、<b>食べた物 帳だけ</b>を ひとつの アプリとして 使えます（できる ことは 同じです。▦ 表に 入れる だけは 表電卓の 中で）。</p>'
    +(solo() ? '<p>いま 開いて いるのが <b>食べた物 帳だけの アプリ</b>です。</p>'
      : '<p><a href="tabeta-app/" target="_blank" rel="noopener" id="tbAppLink">🍽 食べた物 帳だけの アプリを 開く</a>（同じ サイトなら、入れた ものは この 食べた物 帳と 同じです）</p>')
    +'<h5>🏠 ホーム画面に 足す</h5><ol><li><b>iPhone</b>：Safari で 開いて 共有（□↑）→「<b>ホーム画面に追加</b>」</li><li><b>Android</b>：Chrome で 開いて ⋮ →「<b>ホーム画面に追加</b>」（または「アプリをインストール」）</li></ol>'
    +'<p>アイコンから 食べた物 帳だけが すぐ 開きます。電波が ない ときも 前に 開いた ものが 使えます。</p>'
    +'<h5>🌐 Netlify に 置く</h5><ol><li>1つの フォルダに、<b>tabeta-app</b> フォルダの <b>中身</b>（index.html・manifest.json・sw.js・アイコン）と <b>tabeta.js</b> を 入れる（zip「tabeta-netlify-…」を 開いた フォルダが この 形です）</li>'
    +'<li>app.netlify.com に ログイン →「<b>Add new project</b>」→「<b>Deploy manually</b>」に その フォルダを 落とす</li><li>できた アドレス（〜.netlify.app）を スマホで 開いて、ホーム画面に 足す</li></ol>'
    +'<p>あとで 新しく する ときは、Netlify の その 場所の「Deploys」に 新しい フォルダを 落とします。</p>'
    +'<h5>⚠ 中身を うつす とき</h5><p>ちがう サイト（Netlify と 表電卓 など）の 食べた物 帳は、中身が <b>別々</b>です。うつす ときは、前の 方の ⚙ →「<b>⬇ CSV（Excel）で 保存</b>」で ファイルを 作り、新しい 方の ⚙ →「<b>⬆ CSV を 読み込む</b>」で その ファイルを 選びます。同じ 物は 2回 入りません。自分で 入れた カロリーも うつります。</p>'
    +'<div class="tb-acts"><button type="button" class="tb-b pri" onclick="TABETA.close()">✓ わかった</button></div></div>', 'app');
}
function more(){ const b=$('tbBody'), h=b ? b.scrollHeight : 0; shown+=300; render(); if(b) b.scrollTop=b.scrollHeight-h; }
function find(v){ q=String(v||''); render(!q); }

/* ───────── 🎤 声 ───────── */
let rec=null;
function micStop(){ if(rec){ try{ rec.abort(); }catch(_){} rec=null; } const m=$('tbMic'); if(m) m.classList.remove('on'); }
function mic(){
  if(rec){ micStop(); return; }
  const C=typeof speechRecCtor==='function' ? speechRecCtor() : (window.SpeechRecognition||window.webkitSpeechRecognition);
  if(!C){ toastS('この 端末では 声を 聞き取れません。キーボードの マイクか 文字で 入れて ください'); return; }
  const r=new C(); r.lang='ja-JP'; r.interimResults=true; r.maxAlternatives=1;
  const inp=$('tbIn'), btn=$('tbMic'); let said='';
  r.onresult=e=>{ said=[...e.results].map(x=>x[0].transcript).join(''); if(inp) inp.value=said; };
  r.onerror=e=>{ if(e.error==='not-allowed') toastS('マイクを 使えません。ブラウザの 設定で マイクを 許可して ください'); };
  r.onend=()=>{ rec=null; if(btn) btn.classList.remove('on'); heard(said); };
  rec=r; if(btn) btn.classList.add('on');
  try{ r.start(); }catch(_){ micStop(); }
}
function heard(t){ t=String(t||'').trim(); if(!t) return; const a=addText(t, true); const inp=$('tbIn'); if(a.length && inp) inp.value=''; }

/* ───────── 見た目 ───────── */
const CSS=`
#tabetaOverlay .tb-modal{ display:flex; flex-direction:column; }
.tb-top{ display:flex; gap:6px; padding:8px 10px 6px; border-bottom:1px solid rgba(120,132,156,.25); }
.tb-top input{ flex:1; min-width:0; min-height:42px; padding:0 12px; border-radius:21px; border:1px solid rgba(120,132,156,.45); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; }
.tb-top button{ min-width:46px; min-height:42px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:18px; cursor:pointer; }
.tb-body{ flex:1; min-height:0; overflow:auto; padding:6px 10px 10px; color:var(--text,#222); font-size:15px; overscroll-behavior:contain; }
.tb-wrap{ max-width:760px; margin:0 auto; }
.tb-list{ display:flex; flex-direction:column; }
#tabetaOverlay .tb-row{ display:flex; justify-content:flex-start; align-items:baseline; gap:10px; width:100%; min-height:44px; padding:11px 6px; border:0; border-bottom:1px solid rgba(120,132,156,.22); background:transparent; color:var(--text,#222); text-align:left; cursor:pointer; font:inherit; }
#tabetaOverlay .tb-row.nd{ border-top:2px solid rgba(120,132,156,.55); } #tabetaOverlay .tb-row.nd:first-child{ border-top:0; }
.tb-row:active{ background:rgba(120,132,156,.12); }
.tb-dt{ flex:none; min-width:8.3em; font-size:13px; color:var(--text-light,#666); white-space:nowrap; font-variant-numeric:tabular-nums; } .tb-dt b{ display:inline-block; min-width:2.9em; margin-left:4px; text-align:right; font-weight:normal; }
.tb-row.td .tb-dt{ color:var(--acc-text,var(--acc)); font-weight:bold; } .tb-row.td .tb-dt b{ font-weight:bold; }
.tb-nm{ flex:1; min-width:0; text-align:left; font-size:16px; overflow-wrap:anywhere; } .tb-nm small{ margin-left:8px; font-size:12.5px; color:var(--text-light,#666); }
.tb-kc{ flex:none; margin-left:auto; padding-left:6px; font-size:14px; font-weight:bold; color:#bf360c; white-space:nowrap; font-variant-numeric:tabular-nums; } .tb-kc small{ margin-left:1px; font-size:11px; font-weight:normal; } .tb-kc.my{ color:#6a1b9a; }
body.dark .tb-kc{ color:#ffab91; } body.dark .tb-kc.my{ color:#ce93d8; }
.tb-dsum{ padding:6px 6px 8px; text-align:right; font-size:13.5px; color:var(--text,#222); border-bottom:1px solid rgba(120,132,156,.22); } .tb-dsum b{ color:#bf360c; font-size:15px; } body.dark .tb-dsum b{ color:#ffab91; } .tb-dsum small{ display:block; font-size:11.5px; color:var(--text-light,#666); }
.tb-count{ margin:8px 0 2px; text-align:right; font-size:12.5px; color:var(--text-light,#666); }
.tb-more{ display:block; width:100%; min-height:42px; margin:4px 0 6px; border-radius:12px; border:1px dashed rgba(120,132,156,.6); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.tb-note{ font-size:13px; color:var(--text-light,#666); line-height:1.6; margin:8px 0; }
.tb-sum{ margin:6px 0 8px; padding:8px 10px; border-radius:12px; background:var(--acc-weak,rgba(33,115,70,.12)); font-size:14px; line-height:1.7; }
.tb-empty{ text-align:center; padding:30px 8px; } .tb-empty .e{ font-size:56px; } .tb-empty p{ font-size:14.5px; line-height:1.8; color:var(--text,#222); }
.tb-dock{ flex:none; border-top:1px solid rgba(120,132,156,.3); padding:6px 8px calc(8px + var(--safe-bottom,0px)); background:var(--modal-bg,#fff); }
.tb-when{ min-height:34px; padding:0 12px; border-radius:17px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:13.5px; cursor:pointer; }
.tb-when.set{ background:#fff3e0; border-color:#fb8c00; color:#7a3f00; font-weight:bold; } .tb-when b{ margin-left:8px; }
.tb-chips{ display:flex; gap:5px; overflow-x:auto; padding:6px 0; scrollbar-width:none; } .tb-chips::-webkit-scrollbar{ display:none; }
.tb-chips button{ flex:none; min-height:36px; padding:0 12px; border-radius:18px; border:1px solid var(--acc); background:var(--acc-weak,rgba(33,115,70,.12)); color:var(--text,#222); font-size:14px; cursor:pointer; white-space:nowrap; }
.tb-hint{ font-size:12.5px; color:var(--text-light,#666); padding:8px 2px; }
.tb-in{ display:flex; gap:6px; align-items:center; }
.tb-in input{ flex:1; min-width:0; min-height:48px; padding:0 14px; border-radius:24px; border:2px solid var(--acc); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:17px; }
.tb-in button{ flex:none; min-width:52px; min-height:48px; border-radius:24px; border:0; font-size:20px; font-weight:bold; cursor:pointer; }
.tb-in .mic{ background:rgba(120,132,156,.15); color:var(--text,#222); } .tb-in .mic.on{ background:#e53935; color:#fff; animation:tbPulse 1s infinite; }
.tb-in .add{ background:var(--acc); color:var(--on-acc,#fff); padding:0 16px; font-size:16px; }
@keyframes tbPulse{ 50%{ box-shadow:0 0 0 8px rgba(229,57,53,.25); } }
.tb-undo{ display:none; align-items:center; gap:10px; margin:6px 10px 0; padding:10px 12px; border-radius:12px; background:#263238; color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.3); font-size:14px; }
.tb-undo.on{ display:flex; } .tb-undo span{ flex:1; min-width:0; overflow-wrap:anywhere; } .tb-undo button{ flex:none; min-height:38px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.5); background:transparent; color:#fff; font-size:14px; font-weight:bold; cursor:pointer; }
.tb-pop-bg{ position:absolute; inset:0; z-index:20; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; justify-content:center; }
.tb-pop{ width:100%; max-width:560px; max-height:88%; overflow:auto; padding:10px 14px calc(14px + var(--safe-bottom,0px)); border-radius:16px 16px 0 0; background:var(--modal-bg,#fff); color:var(--text,#222); box-shadow:0 -6px 24px rgba(0,0,0,.3); }
.tb-ph{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .tb-ph b{ flex:1; font-size:17px; }
.tb-x{ width:40px; height:40px; border-radius:10px; border:1px solid rgba(120,132,156,.4); background:transparent; color:var(--text,#222); font-size:18px; cursor:pointer; }
.tb-pop h5{ margin:12px 0 6px; font-size:14px; color:var(--acc-text,var(--acc)); }
.tb-f{ display:flex; align-items:center; gap:8px; margin:0 0 8px; } .tb-f > span{ flex:none; width:4.6em; font-size:13.5px; font-weight:bold; }
.tb-f input{ flex:1; min-width:0; min-height:44px; padding:0 10px; border-radius:10px; border:1px solid rgba(120,132,156,.55); background:var(--cell-bg,#fff); color:var(--text,#222); font-size:16px; box-sizing:border-box; }
.tb-f em{ font-style:normal; font-size:12.5px; color:var(--text-light,#666); white-space:nowrap; }
.tb-seg{ flex:1; display:flex; flex-wrap:wrap; gap:5px; } .tb-seg.wide{ margin:0 0 6px; }
.tb-seg button{ min-height:40px; padding:0 12px; border-radius:20px; border:1px solid rgba(120,132,156,.45); background:transparent; color:var(--text,#222); font-size:14px; cursor:pointer; }
.tb-seg button.on{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); font-weight:bold; }
.tb-acts{ display:flex; flex-wrap:wrap; gap:6px; margin:10px 0 0; } .tb-acts.col{ flex-direction:column; }
.tb-b{ min-height:46px; padding:0 14px; border-radius:12px; border:1px solid rgba(120,132,156,.45); background:rgba(120,132,156,.08); color:var(--text,#222); font-size:15px; font-weight:bold; cursor:pointer; }
.tb-b.pri{ background:var(--acc); border-color:var(--acc); color:var(--on-acc,#fff); } .tb-b.warn{ color:#e53935; border-color:rgba(229,57,53,.5); background:transparent; }
.tb-help{ font-size:14.5px; line-height:1.75; } .tb-help ol{ margin:4px 0 8px; padding-left:1.4em; } .tb-help a{ color:var(--acc-text,var(--acc)); font-weight:bold; }
.tb-chk{ display:flex; gap:8px; align-items:flex-start; font-size:14px; line-height:1.5; margin:4px 0; } .tb-chk input{ width:22px; height:22px; flex:none; }
body.dark .tb-when.set{ background:#4e342e; color:#ffe0b2; }
`;
function ensureDom(){
  if($('tabetaOverlay')) return;
  const s=document.createElement('style'); s.id='tbStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="tabetaOverlay">
  <div class="modal vol-modal tb-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🍽 食べた物 帳</span><button class="modal-close" onclick="closeTabeta()" aria-label="閉じる">✕</button></div>
    <div class="tb-top"><input id="tbFind" type="search" placeholder="🔍 さがす（例：カレー）" aria-label="食べた物を さがす" autocomplete="off" oninput="TABETA.find(this.value)"><button type="button" onclick="TABETA.menu()" aria-label="コピー・CSV・設定">⚙</button></div>
    <div class="tb-body" id="tbBody"></div>
    <div class="tb-undo" id="tbUndo" role="status"></div>
    <div class="tb-dock">
      <button type="button" class="tb-when" id="tbWhen" onclick="TABETA.whenTap()"></button>
      <div class="tb-chips" id="tbChips"></div>
      <div class="tb-in"><input id="tbIn" type="text" enterkeyhint="send" maxlength="300" autocomplete="off" placeholder="食べた物（例：おにぎり、みそ汁）" aria-label="食べた物"
        onkeydown="if(event.key==='Enter' && !event.isComposing){ event.preventDefault(); TABETA.go(); }"><button type="button" class="mic" id="tbMic" onclick="TABETA.mic()" aria-label="声で 入れる">🎤</button><button type="button" class="add" onclick="TABETA.go()">＋ 入れる</button></div>
    </div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('tabetaOverlay');
  const fi=document.createElement('input'); fi.type='file'; fi.id='tbFileIn'; fi.accept='.csv,text/csv,text/comma-separated-values'; fi.hidden=true; fi.addEventListener('change', ()=>importFile(fi)); ov.appendChild(fi);
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });   // 表の 電卓キーに 届かないように
  window.addEventListener('keydown', e=>{   // Esc は 上に 重ねた 小さな窓から 閉じる
    if(e.key!=='Escape' || !pop || !isDlgOpen('tabetaOverlay') || (typeof appModalOpen!=='undefined' && appModalOpen)) return;
    if(typeof a11yTopDialog==='function' && a11yTopDialog()!==ov) return;
    e.preventDefault(); e.stopImmediatePropagation(); popClose();
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ popClose(); micStop(); clearTimeout(undoT); undo=null; const u=$('tbUndo'); if(u) u.classList.remove('on'); }
function openTabeta(){ ensureDom(); load(); q=''; shown=SHOW_N; const f=$('tbFind'); if(f) f.value=''; openDlg('tabetaOverlay', cleanup); render(true); }
function closeTabeta(){ if(!$('tabetaOverlay') || !isDlgOpen('tabetaOverlay')) return; closeDlg('tabetaOverlay', cleanup); }

window.TABETA={ go:addGo, chip, undo:undoDo, open:openItem, close:popClose, pickMeal, saveItem, del:delItem, again, whenTap, setWhen, openWhen, menu:openMenu, out, csv, wipe, setSplit, setCal, more, importClick, importFile, importText, appHelp, find, mic,
  // ためす とき 用
  now:s=>{ fixedNow=s ? String(s) : null; if(st) render(true); }, add:(t, voice)=>addText(t, !!voice).length, state:()=>JSON.parse(JSON.stringify(st)), split:(t, v)=>splitFoods(t, v!==false), mealOf:s=>mealOf(new Date(s)),
  text, rows, chips:chipList, clean:cleanE, heard, kcal:(n, q)=>{ const a=kcAuto(String(n||''), String(q||'')); return a ? a.k : null; }, kcalOf:id=>{ const x=eOf(id); return x ? kcalOf(x) : null; }, qty:t=>qtyOf(t), when:()=>when ? Object.assign({}, when) : null };
Object.assign(window, { openTabeta, closeTabeta });
})();
