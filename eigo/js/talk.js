/* ════════════════════════════════════════════════════════════════
   💬 英会話レッスン（表電卓 v533）：マイクで話して、相手（店員さん・友だちなど）と会話する
   ・相手の英語は読み上げ（🔊 で何度でも）。下に「言うこと」（日本語）が出るので、🎤 で英語で答える
   ・答えは「伝わったか」で見る（決まった言い方でなくてよい。大事な語が入っていれば伝わる）。
     伝わると相手が反応して次へ（頼んだ飲み物・サイズなどは、相手があとで言い返してくれる）
   ・2回伝わらないと お手本を出す。⏭ でとばせる。⌨️ で文字でも答えられる（マイクが使えないとき）
   ・終わると「伝わった数」と「はっきり度（音声認識の自信）」、お手本の一覧
   ════════════════════════════════════════════════════════════════ */
'use strict';
/* ── 場面（turns の1つ＝相手の1言と、それへの自分の答え）
   ok：伝わったとみなす言い方（どれかが入っていればよい）、any：何でも n 語以上なら伝わった
   save：答えから覚える語（あとの {名前} に入る）、ack：答えに合わせた相手のひとこと
   alt：{名前} が分からなかったときの相手の言葉、end：最後の1言 ── */
const SIZE1 = /^ (s|m|l|xl|xs|em|el|ell)( size)?( please)? $/;   // S・M・L だけを言ったとき（"I'm" の m などとまちがえない）
const TALK_DATA = [
  { key: 'cafe', icon: '☕', title: 'カフェで注文', level: '初級', who: '🧑‍🍳', desc: '飲み物とサイズを注文して、支払いまで',
    turns: [
      { bot: 'Hi there! What can I get for you today?', ja: 'いらっしゃいませ。ご注文は何にしますか？',
        you: '飲み物を1つ注文する（例：コーヒー）', model: 'Can I have a coffee, please?',
        ok: [/\b(coffee|latte|tea|cappuccino|espresso|mocha|americano|chocolate|cocoa|juice|water|smoothie|frappuccino|macchiato|chai)\b/],
        save: { drink: /\b(iced coffee|iced latte|iced tea|hot chocolate|green tea|coffee|latte|tea|cappuccino|espresso|mocha|americano|chocolate|cocoa|orange juice|juice|water|smoothie|frappuccino|macchiato|chai latte|chai)\b/ } },
      { bot: 'Sure! What size would you like? We have small, medium, and large.', ja: 'かしこまりました。サイズは？ S・M・L があります。',
        you: 'サイズを答える（例：M サイズ）', model: 'Medium, please.',
        ok: [/\b(small|medium|large|regular|tall|short|grande|venti|big)\b/, SIZE1],
        save: { size: /\b(small|medium|large|regular|tall|grande|venti)\b/ },
        ack: [[/\b(large|big|venti)\b/, 'Large it is!'], [/\b(small|short)\b/, 'A small one, got it.'], [/./, 'Okay.']] },
      { bot: 'Would you like it hot or iced?', ja: 'ホットとアイス、どちらにしますか？',
        you: 'ホットかアイスかを答える', model: 'Hot, please.',
        ok: [/\b(hot|iced|ice|cold|warm)\b/] },
      { bot: 'Anything else? We have fresh blueberry muffins today.', ja: 'ほかにご注文は？ 今日は焼きたてのブルーベリーマフィンがあります。',
        you: '「それで全部です」と答える（マフィンを頼んでもよい）', model: "No, that's all. Thank you.",
        ok: [/\b(no|nope|that's all|that is all|nothing|i'm good|i am good|i'm fine|muffin|yes|sure|okay|cookie|cake|sandwich|bagel|scone|one)\b/],
        ack: [[/\b(muffin|yes|sure|okay|one)\b/, 'Great, one muffin too.'], [/./, 'Okay!']] },
      { bot: 'For here or to go?', ja: '店内でお召し上がりですか？ お持ち帰りですか？',
        you: '店内で飲むか、持ち帰るかを答える', model: 'For here, please.',
        ok: [/\b(here|to go|take out|takeout|takeaway|take away|eat in|stay|go)\b/] },
      { bot: 'That will be five dollars. How would you like to pay?', ja: '5ドルです。お支払いはどうしますか？',
        you: 'カードで払うと言う', model: 'By card, please.',
        ok: [/\b(card|cash|credit|debit|phone|pay|apple pay|smartphone|money|dollars?)\b/] },
      { bot: 'Thank you! Your {size} {drink} will be ready in a minute.', alt: 'Thank you! Your drink will be ready in a minute.', ja: 'ありがとうございます。すぐにご用意します。', end: true },
    ] },
  { key: 'intro', icon: '🙋', title: '自己紹介', level: '初級', who: '👩', desc: '名前・出身・仕事・趣味を伝える',
    turns: [
      { bot: "Hi! I'm Emma. What's your name?", ja: 'こんにちは！ エマです。お名前は？',
        you: '自分の名前を言う', model: "Hi, I'm Ken. Nice to meet you.",
        ok: [/\b(i'm|i am|my name|name's|call me|it's)\b/], any: 1,
        save: { name: 'name' },
        ack: [[/./, 'Nice to meet you, {name}!']], ackAlt: 'Nice to meet you!' },
      { bot: 'Where are you from?', ja: 'どこの出身ですか？',
        you: '出身を言う（例：日本の大阪）', model: "I'm from Osaka, Japan.",
        ok: [/\b(from|japan|tokyo|osaka|kyoto|live|born|grew up|city|town)\b/], any: 3,
        ack: [[/\b(japan|tokyo|osaka|kyoto|hokkaido|okinawa)\b/, "Oh, Japan! I'd love to visit someday."], [/./, 'Oh, nice!']] },
      { bot: 'What do you do?', ja: 'お仕事は何をしていますか？',
        you: '仕事か学校を言う（例：会社員・学生）', model: "I work for a company.",
        ok: [/\b(work|student|teacher|engineer|nurse|job|school|company|office|retired|homemaker|housewife|doctor|farmer|designer|i'm a|i am a|i'm an|i am an|university|college)\b/], any: 3 },
      { bot: 'What do you like to do in your free time?', ja: 'ひまなときは何をするのが好きですか？',
        you: '趣味を言う（例：映画を見ること）', model: 'I like watching movies.',
        ok: [/\b(like|love|enjoy|play|watch|read|cook|travel|listen|hobby|go|walk|run|swim|draw|sing)\b/], any: 3,
        ack: [[/./, 'That sounds fun!']] },
      { bot: 'How long have you been studying English?', ja: '英語はどのくらい勉強していますか？',
        you: '勉強している期間を言う（例：1年くらい）', model: 'For about a year.',
        ok: [/\b(year|years|month|months|week|weeks|since|just started|started|long|school|[0-9]+)\b/], any: 3,
        ack: [[/./, 'Wow, keep it up!']] },
      { bot: 'It was really nice talking with you, {name}. See you!', alt: 'It was really nice talking with you. See you!', ja: 'お話しできてよかったです。またね！', end: true },
    ] },
  { key: 'shop', icon: '🛍️', title: '洋服を買う', level: '初級', who: '🧑‍💼', desc: 'ほしい物・色・サイズ・試着・支払い',
    turns: [
      { bot: 'Hello! Are you looking for anything in particular?', ja: 'いらっしゃいませ。何かお探しですか？',
        you: 'Tシャツを探していると言う', model: "I'm looking for a T-shirt.",
        ok: [/\b(looking for|shirt|t-shirt|t shirt|tshirt|jacket|shoes|bag|dress|pants|jeans|sweater|hat|coat|skirt|just looking|browsing)\b/],
        save: { item: /\b(t-shirt|t shirt|tshirt|shirt|jacket|shoes|bag|dress|pants|jeans|sweater|hat|coat|skirt)\b/ },
        ack: [[/\b(just looking|browsing)\b/, 'Sure, take your time.']] },
      { bot: 'What color are you thinking of?', ja: '何色がいいですか？',
        you: '色を言う（例：青）', model: 'Blue, please.',
        ok: [/\b(black|white|blue|red|green|yellow|gray|grey|pink|brown|navy|purple|orange|beige|dark|light)\b/],
        save: { color: /\b(black|white|blue|red|green|yellow|gray|grey|pink|brown|navy|purple|orange|beige)\b/ } },
      { bot: 'We have this one in {color}. What size are you?', alt: 'We have this one. What size are you?', ja: 'こちらがございます。サイズは？',
        you: 'サイズを言う（例：M）', model: "I'm a medium.",
        ok: [/\b(small|medium|large|extra|size|xl|xs)\b/, SIZE1] },
      { bot: 'Would you like to try it on?', ja: '試着してみますか？',
        you: '試着したいと答える', model: "Yes, please. Where's the fitting room?",
        ok: [/\b(yes|sure|please|fitting room|try|okay|no|yeah)\b/],
        ack: [[/\b(no|not)\b/, 'No problem.'], [/./, 'The fitting room is right over there.']] },
      { bot: 'How was it?', ja: 'いかがでしたか？',
        you: 'ぴったりなので買うと言う', model: "It fits perfectly. I'll take it.",
        ok: [/\b(fit|fits|take it|buy|perfect|good|great|like it|love it|nice|small|big|tight|loose)\b/] },
      { bot: "Great choice! That's twenty-five dollars.", ja: 'お目が高い！ 25ドルです。',
        you: 'カードで払えるか聞く', model: 'Can I pay by card?',
        ok: [/\b(card|cash|pay|credit|debit|phone)\b/] },
      { bot: 'Of course. Thank you for shopping with us!', ja: 'もちろんです。お買い上げありがとうございます！', end: true },
    ] },
  { key: 'way', icon: '🗺️', title: '道をたずねる', level: '初級', who: '🧔', desc: '駅への行き方・かかる時間・お礼',
    turns: [
      { bot: 'Hi, you look a little lost. Can I help you?', ja: '道に迷っているみたいですね。お手伝いしましょうか？',
        you: '駅への行き方をたずねる', model: 'Yes, how do I get to the station?',
        ok: [/\b(station|how do i get|how can i get|where is|where's|way to|looking for|get to|subway|train)\b/] },
      { bot: 'Go straight down this street and turn left at the second corner.', ja: 'この道をまっすぐ行って、2つ目の角を左に曲がってください。',
        you: '「2つ目の角を左ですね？」と確かめる', model: 'Turn left at the second corner?',
        ok: [/\b(left|second|corner|turn|straight|2nd)\b/] },
      { bot: "That's right. Then you'll see it on your right.", ja: 'そうです。そうすると右側に見えます。',
        you: '歩いてどのくらいかかるかたずねる', model: 'How long does it take on foot?',
        ok: [/\b(how long|how far|minutes|walk|on foot|take|far)\b/] },
      { bot: 'About ten minutes.', ja: '歩いて10分くらいです。',
        you: 'お礼を言う', model: 'Thank you so much!',
        ok: [/\b(thank|thanks|appreciate|helpful|kind)\b/] },
      { bot: "You're welcome. Have a nice day!", ja: 'どういたしまして。よい一日を！', end: true },
    ] },
  { key: 'hotel', icon: '🏨', title: 'ホテルのチェックイン', level: '中級', who: '🧑‍💼', desc: '予約の名前・泊数・Wi-Fi・チェックアウト',
    turns: [
      { bot: 'Good evening. Welcome to the Grand Hotel. How can I help you?', ja: 'こんばんは。グランドホテルへようこそ。ご用件をうかがいます。',
        you: 'チェックインしたいと言う', model: "Hi, I'd like to check in, please.",
        ok: [/\b(check in|check-in|checking in|checkin|reservation|booked|booking|room)\b/] },
      { bot: 'Certainly. May I have your name, please?', ja: 'かしこまりました。お名前をお願いします。',
        you: '予約の名前を言う', model: "It's under Tanaka.",
        ok: [/\b(under|name|i'm|i am|it's|it is)\b/], any: 1,
        save: { name: 'name' } },
      { bot: "Thank you, {name}. You're staying for two nights, is that correct?", alt: "Thank you. You're staying for two nights, is that correct?", ja: '2泊でおまちがいないですか？',
        you: '「はい、そうです」と答える', model: "Yes, that's right.",
        ok: [/\b(yes|right|correct|yeah|exactly|that's it|no|three|one)\b/] },
      { bot: 'Here is your key. Breakfast is served from seven to ten.', ja: 'こちらが鍵です。朝食は7時から10時までです。',
        you: 'Wi-Fi のパスワードをたずねる', model: "What's the Wi-Fi password?",
        ok: [/\b(wi-fi|wifi|wi fi|password|internet)\b/] },
      { bot: "It's written on the card in your key holder.", ja: '鍵のケースのカードに書いてあります。',
        you: 'チェックアウトの時間をたずねる', model: 'What time is check-out?',
        ok: [/\b(check out|check-out|checkout|leave|what time)\b/] },
      { bot: 'Check-out is at eleven. Enjoy your stay!', ja: 'チェックアウトは11時です。ごゆっくりどうぞ！', end: true },
    ] },
  { key: 'restaurant', icon: '🍽️', title: 'レストラン', level: '中級', who: '🧑‍🍳', desc: '人数・飲み物・おすすめ・感想・お会計',
    turns: [
      { bot: 'Good evening! How many people?', ja: 'こんばんは。何名様ですか？',
        you: '2人と答える', model: 'Two, please.',
        ok: [/\b(one|two|three|four|five|six|[0-9]+|people|of us|just me|party|table)\b/] },
      { bot: 'Right this way. Here is the menu. Can I get you something to drink?', ja: 'こちらへどうぞ。メニューです。お飲み物はいかがですか？',
        you: '水を頼む', model: 'Just water, please.',
        ok: [/\b(water|tea|coffee|beer|wine|juice|coke|soda|drink|lemonade|sparkling)\b/] },
      { bot: 'Are you ready to order?', ja: 'ご注文はお決まりですか？',
        you: 'おすすめをたずねる', model: 'What do you recommend?',
        ok: [/\b(recommend|suggest|popular|special|best|good|favorite)\b/] },
      { bot: 'The grilled salmon is very popular.', ja: 'サーモンのグリルが人気です。',
        you: 'それにすると言う', model: "I'll have the grilled salmon, please.",
        ok: [/\b(i'll have|i will have|salmon|i'd like|i would like|that|please|take|sounds good|same)\b/] },
      { bot: 'Excellent choice. ... How was everything?', ja: 'かしこまりました。……（食事のあと）お味はいかがでしたか？',
        you: 'おいしかったと言う', model: 'It was delicious, thank you.',
        ok: [/\b(delicious|good|great|nice|tasty|excellent|amazing|loved|wonderful|perfect|fantastic)\b/] },
      { bot: "I'm glad you enjoyed it. Would you like the check?", ja: 'お気に召してよかったです。お会計にしますか？',
        you: 'お会計をお願いする', model: 'Yes, could we have the check, please?',
        ok: [/\b(check|bill|yes|please|pay)\b/] },
      { bot: "Sure, I'll be right back with it.", ja: 'かしこまりました。すぐにお持ちします。', end: true },
    ] },
  { key: 'airport', icon: '✈️', title: '空港の入国審査', level: '中級', who: '👮', desc: '目的・期間・滞在先・申告',
    turns: [
      { bot: 'Good morning. May I see your passport, please?', ja: 'おはようございます。パスポートを見せてください。',
        you: 'パスポートを渡す（「はい、どうぞ」）', model: 'Here you are.',
        ok: [/\b(here|sure|yes|okay|of course|passport)\b/] },
      { bot: 'What is the purpose of your visit?', ja: '旅行の目的は何ですか？',
        you: '観光と答える', model: 'Sightseeing.',
        ok: [/\b(sightseeing|vacation|holiday|business|tour|travel|visit|study|conference|meeting|family|friend|trip)\b/] },
      { bot: 'How long are you going to stay?', ja: 'どのくらい滞在しますか？',
        you: '1週間と答える', model: 'For one week.',
        ok: [/\b(week|weeks|day|days|month|months|night|nights|for|[0-9]+)\b/] },
      { bot: 'Where will you be staying?', ja: 'どこに泊まりますか？',
        you: 'ホテルに泊まると答える', model: 'At a hotel downtown.',
        ok: [/\b(hotel|friend|house|airbnb|hostel|at the|at a|stay|apartment|home)\b/] },
      { bot: 'Do you have anything to declare?', ja: '申告するものはありますか？',
        you: '「いいえ、ありません」と答える', model: 'No, nothing.',
        ok: [/\b(no|nothing|none|yes|not)\b/] },
      { bot: 'All right. Enjoy your trip!', ja: 'わかりました。よい旅を！', end: true },
    ] },
  { key: 'phone', icon: '📞', title: '電話でお店を予約', level: '中級', who: '🧑‍💼', desc: '日時・人数・名前・希望の席',
    turns: [
      { bot: 'Hello, Bella Italia. How may I help you?', ja: 'お電話ありがとうございます。ベラ・イタリアです。',
        you: '予約したいと言う', model: "Hi, I'd like to make a reservation.",
        ok: [/\b(reservation|reserve|book|booking|table)\b/] },
      { bot: 'Sure. For what day and time?', ja: 'かしこまりました。何日の何時ですか？',
        you: '土曜日の7時と言う', model: 'This Saturday at seven, please.',
        ok: [/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight|today|at|o'clock|oclock|pm|p\.m|[0-9]+|six|seven|eight)\b/] },
      { bot: 'How many people will be joining?', ja: '何名様ですか？',
        you: '4人と答える', model: 'Four people.',
        ok: [/\b(one|two|three|four|five|six|seven|eight|[0-9]+|people|of us)\b/] },
      { bot: 'May I have your name and phone number?', ja: 'お名前とお電話番号をお願いします。',
        you: '名前と電話番号を言う', model: "It's Sato, and my number is 090-1234-5678.",
        ok: [/\b(name|number|it's|my|[0-9]+)\b/], any: 2 },
      { bot: 'Thank you. Do you have any special requests?', ja: 'ありがとうございます。何かご要望はありますか？',
        you: '窓ぎわの席をお願いする', model: 'Could we have a table by the window?',
        ok: [/\b(window|no|nothing|birthday|quiet|seat|table|corner|outside|terrace|cake)\b/] },
      { bot: 'No problem. We look forward to seeing you!', ja: 'かしこまりました。お待ちしております！', end: true },
    ] },
  { key: 'smalltalk', icon: '😊', title: '友だちと雑談', level: '中級', who: '🧑', desc: '調子・週末の予定・映画・食べ物',
    turns: [
      { bot: "Hey! How's it going?", ja: 'やあ、調子はどう？',
        you: '元気だと答えて、相手にもたずねる', model: 'Pretty good, thanks. How about you?',
        ok: [/\b(good|fine|great|okay|not bad|well|tired|busy|alright|so so)\b/], any: 2,
        ack: [[/\b(how about you|what about you|and you|how are you|yourself)\b/, "I'm great, thanks for asking!"], [/./, 'Good to hear!']] },
      { bot: 'Do you have any plans for the weekend?', ja: '週末の予定はある？',
        you: '予定を言う（例：友だちと映画）', model: "I'm going to see a movie with my friends.",
        ok: [/\b(going to|gonna|will|plan|planning|movie|shopping|stay|relax|nothing|work|visit|go|meet|family)\b/], any: 3 },
      { bot: 'Nice! Have you seen any good movies lately?', ja: 'いいね！ 最近いい映画見た？',
        you: '見た映画について言う', model: 'Yes, I saw a great action movie last week.',
        ok: [/\b(saw|seen|watched|yes|no|not|movie|film)\b/], any: 2,
        ack: [[/./, "Oh, I've heard good things about it."]] },
      { bot: 'What kind of food do you like?', ja: 'どんな食べ物が好き？',
        you: '好きな食べ物を言う', model: 'I love sushi and ramen.',
        ok: [/\b(like|love|favorite|enjoy|sushi|ramen|pizza|curry|food)\b/], any: 2 },
      { bot: 'We should grab lunch sometime.', ja: '今度ランチでも行こうよ。',
        you: '「いいね」と答えて、日にちを提案する', model: 'Sounds great! How about next Friday?',
        ok: [/\b(sure|great|sounds|yes|good idea|love to|okay|let's|why not|how about|yeah)\b/] },
      { bot: 'Perfect. See you then!', ja: 'いいね。じゃあそのときに！', end: true },
    ] },
  { key: 'doctor', icon: '🏥', title: '病院で症状を伝える', level: '中級', who: '🧑‍⚕️', desc: '症状・いつから・熱・アレルギー・薬',
    turns: [
      { bot: 'Hello. What seems to be the problem?', ja: 'こんにちは。どうされましたか？',
        you: '頭が痛いと言う', model: 'I have a headache.',
        ok: [/\b(headache|head|stomach|stomachache|fever|cold|cough|sore throat|throat|hurt|hurts|pain|sick|feel|dizzy|tired|ache)\b/] },
      { bot: 'I see. How long have you had it?', ja: 'わかりました。いつからですか？',
        you: '昨日からと答える', model: 'Since yesterday.',
        ok: [/\b(since|yesterday|day|days|hour|hours|morning|last night|week|ago|two|three|today)\b/] },
      { bot: 'Do you have a fever?', ja: '熱はありますか？',
        you: '少しあると答える', model: 'Yes, a little.',
        ok: [/\b(yes|no|little|bit|high|degrees|slight|[0-9]+)\b/] },
      { bot: 'Are you allergic to any medicine?', ja: '薬のアレルギーはありますか？',
        you: '「いいえ、ありません」と答える', model: "No, I'm not.",
        ok: [/\b(no|not|none|yes|allergic|penicillin|aspirin)\b/] },
      { bot: 'Okay. Take this medicine three times a day after meals.', ja: 'わかりました。この薬を1日3回、食後に飲んでください。',
        you: '「1日3回、食後ですね」と確かめる', model: 'Three times a day after meals, right?',
        ok: [/\b(three|times|day|after|meals|right|okay|got it|understood|thank)\b/] },
      { bot: "That's right. Get well soon!", ja: 'そうです。お大事に！', end: true },
    ] },
];

window.Talk = (function () {
  const $ = id => document.getElementById(id);
  const KEY = 'eigo_talk_v1', JA_KEY = 'eigo_talk_ja';
  let S = null;   // いまの会話 { sc, i, tries, slots, res, ctl, done }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function loadRec() { try { const o = JSON.parse(localStorage.getItem(KEY)); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  // 答えを見やすくそろえる（小文字・記号なし。' は残す）
  const normT = t => ' ' + String(t || '').toLowerCase().replace(/[‘’`´]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const nWords = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  function understood(turn, text) {
    const t = normT(text);
    if ((turn.ok || []).some(re => re.test(t))) return true;
    return !!turn.any && nWords(text) >= turn.any;
  }
  // 名前：「I'm Ken」「It's under Tanaka」「Ken.」などから
  const NOT_NAME = new Set(("a an the from in at so very fine good great okay ok not here sorry just glad happy nice pleased japanese student called "
    + "under name is it its it's i i'm am my me mr mrs ms miss for reservation reserved booked booking please yes yeah hello hi hey this that "
    + "and to you your thank thanks meet").split(' '));
  function pickName(nt) {
    const m = /\b(?:my name is|my name's|name is|name's|i'm|i am|call me|it's|it is|under|this is)\s+(.*)$/.exec(nt);
    const ws = (m ? m[1] : nWords(nt) <= 2 ? nt : '').trim().split(' ');
    const w = ws.find(x => /^[a-z]{2,}$/.test(x) && !NOT_NAME.has(x));
    return w ? w[0].toUpperCase() + w.slice(1) : '';
  }
  function fill(s) {
    let bad = false;
    const out = String(s).replace(/\{(\w+)\}/g, (_, k) => { const v = S.slots[k]; if (!v) { bad = true; return ''; } return v; });
    return bad ? null : out.replace(/\s+/g, ' ').trim();
  }

  /* ── 場面をえらぶ ── */
  function list() {
    const rec = loadRec(), box = $('talk-cat-grid');
    box.innerHTML = TALK_DATA.map(sc => {
      const r = rec[sc.key], n = sc.turns.filter(t => !t.end).length;
      return '<button class="talk-cat-btn" type="button" data-talk="' + sc.key + '"><span class="tc-icon">' + sc.icon + '</span>'
        + '<span class="tc-name">' + esc(sc.title) + '</span><span class="tc-desc">' + esc(sc.desc) + '</span>'
        + '<span class="tc-meta">' + sc.level + '・' + n + '回話す' + (r ? '・<b>ベスト ' + r.best + '/' + n + '</b>' : '') + '</span></button>';
    }).join('');
    $('talk-nosr').hidden = !!window.ES && ES.supported;
    App.modalShow('talk-modal');
  }
  function closeList() { App.modalHide('talk-modal'); }

  /* ── 会話 ── */
  function start(key) {
    const sc = TALK_DATA.find(x => x.key === key); if (!sc) return;
    closeList(); stopAll();
    S = { sc, i: 0, tries: 0, slots: {}, res: [], ctl: null, done: false };
    $('talk-title').textContent = sc.icon + ' ' + sc.title;
    $('talk-log').innerHTML = '';
    $('talk-panel').hidden = false;
    applyJa();
    App.showScreen('talk');
    botTurn('');
  }
  function addBot(text, ja, end) {
    const d = document.createElement('div'); d.className = 'tb bot' + (end ? ' end' : '');
    d.innerHTML = '<span class="tb-av" aria-hidden="true">' + S.sc.who + '</span><div class="tb-body"><div class="tb-en">' + esc(text) + '</div>'
      + (ja ? '<div class="tb-ja">' + esc(ja) + '</div>' : '') + '</div><button class="tb-say" type="button" aria-label="もう一度聞く">🔊</button>';
    d.querySelector('.tb-say').addEventListener('click', () => ES.say(text));
    $('talk-log').appendChild(d); scrollLog();
    return d;
  }
  function addMe(text, ok, conf, typed) {
    const d = document.createElement('div'); d.className = 'tb me ' + (ok ? 'ok' : 'ng');
    d.innerHTML = '<div class="tb-body"><div class="tb-en">' + esc(text) + '</div><div class="tb-mark">'
      + (ok ? '✓ 伝わった' : '？ 伝わらなかった') + (conf && !typed ? '・はっきり度 ' + Math.round(conf * 100) + '%' : typed ? '・文字で' : '') + '</div></div>';
    $('talk-log').appendChild(d); scrollLog();
  }
  function scrollLog() { const l = $('talk-log'); l.scrollTop = l.scrollHeight; }
  function botTurn(ack) {
    S.wait = false;
    const t = S.sc.turns[S.i];
    let line = fill(t.bot);
    if (line == null) line = t.alt || t.bot.replace(/\{\w+\}/g, '').replace(/\s+/g, ' ');
    const said = (ack ? ack + ' ' : '') + line;
    addBot(said, t.ja, !!t.end);
    if (t.end) { S.done = true; setPanel(null); saveRec(); const me = S; ES.say(said).then(() => { if (S === me) summary(); }); return; }
    setPanel(t);
    ES.say(said);
  }
  function setPanel(t) {
    $('talk-model').hidden = true; $('talk-live').textContent = '';
    if (!t) { $('talk-panel').hidden = true; return; }
    $('talk-panel').hidden = false;
    $('talk-task').innerHTML = '<b>' + (S.res.length + 1) + '</b> 🎯 ' + esc(t.you);
    $('talk-mic').hidden = !ES.supported;
    if (!ES.supported) $('talk-type').hidden = false;
    setMic(false);
    scrollLog();
  }
  function setMic(on) { const b = $('talk-mic'); b.classList.toggle('on', on); b.textContent = on ? '⏹ 止める' : '🎤 話す'; }
  function showModel() {
    const t = S.sc.turns[S.i]; if (!t || t.end) return;
    const m = $('talk-model');
    m.innerHTML = 'お手本：<b>' + esc(t.model) + '</b> <button type="button" class="tb-say" id="talk-model-say" aria-label="お手本を聞く">🔊</button>';
    m.hidden = false;
    $('talk-model-say').addEventListener('click', () => ES.say(t.model, { rate: 0.85 }));
    scrollLog();   // 下の欄が高くなった分、会話を下まで送る
  }
  // 自分の答え（候補のうち伝わるものをえらぶ）
  function answer(alts, typed) {
    if (!S || S.done || S.wait) return;
    const t = S.sc.turns[S.i];
    const hit = alts.find(a => understood(t, a.t)), a = hit || alts[0];
    if (!a || !a.t.trim()) return;
    addMe(a.t, !!hit, a.c, typed);
    if (hit) {
      const nt = normT(a.t);
      Object.keys(t.save || {}).forEach(k => {
        const re = t.save[k], v = re === 'name' ? pickName(nt) : ((re.exec(nt) || [])[1] || (re.exec(nt) || [])[0] || '').trim();
        if (v) S.slots[k] = v;
      });
      let ack = '';
      if (t.ack) { const x = t.ack.find(p => p[0].test(nt)); if (x) { ack = fill(x[1]); if (ack == null) ack = t.ackAlt || ''; } }
      S.res.push({ you: t.you, said: a.t, ok: true, conf: typed ? 0 : a.c, model: t.model, tries: S.tries });
      S.i++; S.tries = 0; S.wait = true;
      $('talk-model').hidden = true; $('talk-task').textContent = '…';
      const me = S;
      setTimeout(() => { if (S === me) botTurn(ack); }, 450);
    } else {
      S.tries++;
      const again = S.tries >= 2, msg = again ? 'No worries. You could say, "' + t.model + '"' : "Sorry, I didn't catch that. Could you say it again?";
      addBot(msg, again ? 'こう言ってみましょう（お手本をまねして言ってみてください）' : 'すみません、もう一度言ってもらえますか？');
      ES.say(msg);
      if (again) showModel();
    }
  }
  function listen() {
    if (!S || S.done || S.wait) return;
    if (S.ctl) { S.ctl.stop(); return; }
    setMic(true); $('talk-live').textContent = '聞いています… 英語で話してください';
    S.ctl = ES.listen({
      onInterim: t => { if (t) $('talk-live').textContent = '「' + t + '」'; },
      onEnd: (res, err) => {
        if (!S) return;
        S.ctl = null; setMic(false);
        if (!res) { $('talk-live').textContent = ES.errMsg(err); if (err === 'perm' || err === 'unsupported') $('talk-type').hidden = false; return; }
        $('talk-live').textContent = '';
        answer(res.alts, false);
      },
    });
  }
  function typed() {
    const inp = $('talk-input'), v = inp.value.trim(); if (!v || !S || S.done || S.wait) return;
    inp.value = '';
    answer([{ t: v, c: 0 }], true);
  }
  function skip() {
    if (!S || S.done || S.wait) return;
    const t = S.sc.turns[S.i];
    stopAll();
    S.res.push({ you: t.you, said: '', ok: false, conf: 0, model: t.model, skip: true });
    S.i++; S.tries = 0;
    botTurn('No worries.');
  }
  function saveRec() {
    const ok = S.res.filter(r => r.ok).length, rec = loadRec(), prev = rec[S.sc.key];
    rec[S.sc.key] = { best: Math.max(ok, prev ? prev.best : 0), plays: (prev ? prev.plays : 0) + 1, at: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {}
  }
  function summary() {
    if (S.sum) return; S.sum = true;
    const n = S.res.length, ok = S.res.filter(r => r.ok).length;
    const cs = S.res.filter(r => r.ok && r.conf > 0).map(r => r.conf);
    const d = document.createElement('div'); d.className = 'talk-sum';
    d.innerHTML = '<div class="ts-title">' + (ok === n ? '🎉 ぜんぶ伝わりました！' : ok >= n / 2 ? '👍 よく話せました' : '💪 もう一度やってみよう') + '</div>'
      + '<div class="ts-score">伝わった <b>' + ok + '</b> / ' + n + (cs.length ? '　はっきり度（平均）<b>' + Math.round(cs.reduce((x, y) => x + y, 0) / cs.length * 100) + '%</b>' : '') + '</div>'
      + '<ol class="ts-list">' + S.res.map((r, i) => '<li class="' + (r.ok ? 'ok' : 'ng') + '"><span class="ts-you">' + (r.ok ? '✓' : r.skip ? '⏭' : '？') + ' ' + esc(r.you) + '</span>'
        + (r.said ? '<span class="ts-said">あなた：' + esc(r.said) + '</span>' : '')
        + '<span class="ts-model">お手本：' + esc(r.model) + ' <button type="button" class="tb-say" data-i="' + i + '" aria-label="お手本を聞く">🔊</button></span></li>').join('') + '</ol>'
      + '<div class="ts-btns"><button type="button" class="btn-primary" id="ts-again">🔁 もう一度</button><button type="button" class="btn-secondary" id="ts-other">💬 ほかの場面</button></div>';
    $('talk-log').appendChild(d); scrollLog();
    d.querySelectorAll('.tb-say').forEach(b => b.addEventListener('click', () => ES.say(S.res[+b.dataset.i].model, { rate: 0.85 })));
    const key = S.sc.key;
    $('ts-again').addEventListener('click', () => start(key));
    $('ts-other').addEventListener('click', () => { list(); });
  }
  function stopAll() { if (S && S.ctl) { S.ctl = null; } if (window.ES) { ES.stopListen(); ES.hush(); } if (S) setMic(false); }
  function leave() { stopAll(); S = null; }
  function applyJa() {
    let on = true; try { on = localStorage.getItem(JA_KEY) !== '0'; } catch (e) {}
    $('talk-log').classList.toggle('no-ja', !on);
    $('talk-ja-btn').setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function init() {
    if (!$('screen-talk')) return;
    $('talk-cat-grid').addEventListener('click', e => { const b = e.target.closest('[data-talk]'); if (b) start(b.dataset.talk); });
    $('talk-cancel').addEventListener('click', closeList);
    $('talk-mic').addEventListener('click', listen);
    $('talk-hint').addEventListener('click', () => { if (!S || S.done || S.wait) return; showModel(); ES.say(S.sc.turns[S.i].model, { rate: 0.85 }); });
    $('talk-skip').addEventListener('click', skip);
    $('talk-kbd').addEventListener('click', () => { const tp = $('talk-type'); tp.hidden = !tp.hidden; scrollLog(); if (!tp.hidden) $('talk-input').focus(); });
    $('talk-send').addEventListener('click', typed);
    $('talk-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); typed(); } });
    $('talk-back').addEventListener('click', () => { leave(); App.goHome(); list(); });
    $('talk-ja-btn').addEventListener('click', () => {
      const on = $('talk-ja-btn').getAttribute('aria-pressed') !== 'true';
      try { localStorage.setItem(JA_KEY, on ? '1' : '0'); } catch (e) {}
      applyJa();
    });
    $('talk-open').addEventListener('click', list);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S && S.ctl) { stopAll(); $('talk-live').textContent = ''; }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { list, closeList, start, leave, understood, answer, state: () => S, data: TALK_DATA };
})();
