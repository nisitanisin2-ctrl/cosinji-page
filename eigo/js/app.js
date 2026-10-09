'use strict';

// ── 単語高速検索マップ ──
const WORD_MAP = {};
WORDS.forEach(w => { WORD_MAP[w.w.toLowerCase()] = w; });

// ── ストレージ ──
const STORAGE_KEY = 'eitan_progress_v1';

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

// data shape: { words: {[id]: {mastery,correct,wrong,nextReview,lastSeen}}, stats: {streak,lastDate,sessions,recentMastered} }
let DATA = loadData();
if (!DATA.words) DATA.words = {};
if (!DATA.stats) DATA.stats = {streak:0,lastDate:null,sessions:0,recentMastered:[]};

// ── ストリーク更新 ──
function updateStreak() {
  const today = new Date().toDateString();
  if (DATA.stats.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    DATA.stats.streak = DATA.stats.lastDate === yesterday ? DATA.stats.streak + 1 : 1;
    DATA.stats.lastDate = today;
    DATA.stats.sessions++;
    saveData(DATA);
  }
}

// ── 単語ヘルパー ──
function getWordData(id) {
  return DATA.words[id] || {mastery:0,correct:0,wrong:0,nextReview:0,lastSeen:0};
}
function setWordData(id, d) {
  DATA.words[id] = d;
  saveData(DATA);
}
function isMastered(id) { return getWordData(id).mastery >= 4; }

function masteredCount() { return WORDS.filter(w => isMastered(w.id)).length; }
function todayLearned() {
  const today = new Date().toDateString();
  return WORDS.filter(w => {
    const d = getWordData(w.id);
    return d.lastSeen && new Date(d.lastSeen).toDateString() === today;
  }).length;
}
function totalCorrect() { return Object.values(DATA.words).reduce((s,d) => s+(d.correct||0), 0); }
function totalWrong()   { return Object.values(DATA.words).reduce((s,d) => s+(d.wrong||0), 0); }
function accuracyStr() {
  const c = totalCorrect(), w = totalWrong();
  return (c+w === 0) ? '-' : Math.round(c/(c+w)*100) + '%';
}

function reviewDue() {
  const now = Date.now();
  return WORDS.filter(w => {
    const d = getWordData(w.id);
    return d.nextReview && d.nextReview <= now && d.mastery > 0 && !isMastered(w.id);
  });
}

// SRS間隔（日数）
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];
function scheduleNext(id, rating) {
  const d = getWordData(id);
  if (rating === 3) d.mastery = Math.min(5, d.mastery + 1);
  else if (rating === 2) d.mastery = Math.max(0, d.mastery);
  else d.mastery = Math.max(0, d.mastery - 1);
  d.nextReview = Date.now() + SRS_INTERVALS[d.mastery] * 86400000;
  d.lastSeen = Date.now();
  if (d.mastery >= 4 && !DATA.stats.recentMastered.includes(id)) {
    DATA.stats.recentMastered.unshift(id);
    if (DATA.stats.recentMastered.length > 20) DATA.stats.recentMastered.pop();
  }
  setWordData(id, d);
}
function recordAnswer(id, correct) {
  const d = getWordData(id);
  if (correct) { d.correct = (d.correct||0)+1; d.mastery = Math.min(5, d.mastery+1); }
  else         { d.wrong  = (d.wrong||0)+1;  d.mastery = Math.max(0, d.mastery-1); }
  d.nextReview = Date.now() + SRS_INTERVALS[d.mastery]*86400000;
  d.lastSeen = Date.now();
  if (d.mastery >= 4 && !DATA.stats.recentMastered.includes(id)) {
    DATA.stats.recentMastered.unshift(id);
    if (DATA.stats.recentMastered.length > 20) DATA.stats.recentMastered.pop();
  }
  setWordData(id, d);
}

// ── 機能語補助辞書（WORD_MAPにない頻出語） ──
const FUNC_WORDS = {
  'a':{j:'（冠詞）',r:'ə'},'an':{j:'（冠詞）',r:'æn'},'the':{j:'（定冠詞）',r:'ðə'},
  'i':{j:'私',r:'aɪ'},'you':{j:'あなた',r:'juː'},'he':{j:'彼',r:'hiː'},
  'she':{j:'彼女',r:'ʃiː'},'it':{j:'それ',r:'ɪt'},'we':{j:'私たち',r:'wiː'},
  'they':{j:'彼ら',r:'ðeɪ'},'my':{j:'私の',r:'maɪ'},'your':{j:'あなたの',r:'jɔːr'},
  'his':{j:'彼の',r:'hɪz'},'her':{j:'彼女の',r:'hɜːr'},'our':{j:'私たちの',r:'aʊər'},
  'their':{j:'彼らの',r:'ðeər'},'its':{j:'それの',r:'ɪts'},
  'is':{j:'～です・ある',r:'ɪz'},'are':{j:'～です・ある',r:'ɑːr'},
  'was':{j:'～だった',r:'wɒz'},'were':{j:'～だった',r:'wɜːr'},
  'been':{j:'～であった',r:'biːn'},
  'in':{j:'～の中に',r:'ɪn'},'on':{j:'～の上に',r:'ɒn'},'at':{j:'～に・で',r:'æt'},
  'to':{j:'～へ・に',r:'tuː'},'of':{j:'～の',r:'ɒv'},'for':{j:'～のために',r:'fɔːr'},
  'with':{j:'～と一緒に',r:'wɪð'},'by':{j:'～によって',r:'baɪ'},
  'from':{j:'～から',r:'frɒm'},'about':{j:'～について',r:'əˈbaʊt'},
  'this':{j:'これ・この',r:'ðɪs'},'that':{j:'それ・あの',r:'ðæt'},
  'these':{j:'これら',r:'ðiːz'},'those':{j:'それら',r:'ðoʊz'},
  'not':{j:'～ではない',r:'nɒt'},'no':{j:'いいえ・ない',r:'noʊ'},
  'and':{j:'そして・と',r:'ænd'},'or':{j:'または',r:'ɔːr'},'but':{j:'しかし',r:'bʌt'},
  'if':{j:'もし～なら',r:'ɪf'},'so':{j:'だから・とても',r:'soʊ'},
  'can':{j:'できる',r:'kæn'},'will':{j:'～するだろう',r:'wɪl'},
  'would':{j:'～だろう',r:'wʊd'},'could':{j:'できた',r:'kʊd'},
  'should':{j:'～すべき',r:'ʃʊd'},'may':{j:'～かもしれない',r:'meɪ'},
  'might':{j:'～かもしれない',r:'maɪt'},'must':{j:'～しなければならない',r:'mʌst'},
  'do':{j:'する・行う',r:'duː'},'does':{j:'する（三人称）',r:'dʌz'},'did':{j:'した',r:'dɪd'},
  'have':{j:'持っている',r:'hæv'},'has':{j:'持っている（三人称）',r:'hæz'},'had':{j:'持っていた',r:'hæd'},
  'up':{j:'上に',r:'ʌp'},'out':{j:'外に',r:'aʊt'},'all':{j:'すべての',r:'ɔːl'},
  'more':{j:'もっと多く',r:'mɔːr'},'some':{j:'いくつかの',r:'sʌm'},
  'any':{j:'どんな',r:'ˈeni'},'me':{j:'私を・私に',r:'miː'},
  'him':{j:'彼を・彼に',r:'hɪm'},'us':{j:'私たちを',r:'ʌs'},'them':{j:'彼らを',r:'ðem'},
  'what':{j:'何',r:'wɒt'},'when':{j:'いつ',r:'wen'},'where':{j:'どこ',r:'weər'},
  'who':{j:'誰',r:'huː'},'how':{j:'どのように',r:'haʊ'},'why':{j:'なぜ',r:'waɪ'},
  'which':{j:'どれ・どの',r:'wɪtʃ'},
  'too':{j:'～も・すぎる',r:'tuː'},'very':{j:'とても',r:'ˈveri'},
  'here':{j:'ここに',r:'hɪər'},'there':{j:'そこに',r:'ðeər'},
  'before':{j:'～の前に',r:'bɪˈfɔːr'},'after':{j:'～の後に',r:'ˈɑːftər'},
  'than':{j:'～より',r:'ðæn'},'then':{j:'それから・その時',r:'ðen'},
  'now':{j:'今',r:'naʊ'},'just':{j:'ちょうど・ただ',r:'dʒʌst'},
  'also':{j:'～も・また',r:'ˈɔːlsoʊ'},'well':{j:'うまく・よく',r:'wel'},
  'still':{j:'まだ',r:'stɪl'},'even':{j:'さえ',r:'ˈiːvən'},
  'down':{j:'下に',r:'daʊn'},'back':{j:'戻る・後ろ',r:'bæk'},
  'every':{j:'すべての・毎',r:'ˈevri'},'much':{j:'たくさん',r:'mʌtʃ'},
  'many':{j:'多くの',r:'ˈmeni'},'most':{j:'最も',r:'moʊst'},
  'same':{j:'同じ',r:'seɪm'},'both':{j:'両方とも',r:'boʊθ'},
  'each':{j:'それぞれ',r:'iːtʃ'},'other':{j:'他の',r:'ˈʌðər'},
  'another':{j:'別の',r:'əˈnʌðər'},'few':{j:'少ない',r:'fjuː'},
  'only':{j:'だけ・唯一の',r:'ˈoʊnli'},'once':{j:'一度・かつて',r:'wʌns'},
  'again':{j:'また・再び',r:'əˈɡen'},'always':{j:'いつも',r:'ˈɔːlweɪz'},
  'never':{j:'決して～ない',r:'ˈnevər'},'often':{j:'よく',r:'ˈɒfən'},
  'already':{j:'もう・すでに',r:'ɔːlˈredi'},'yet':{j:'まだ・もう',r:'jet'},
  'such':{j:'そのような',r:'sʌtʃ'},'own':{j:'自分自身の',r:'oʊn'},
  'sure':{j:'確かな',r:'ʃʊər'},'let':{j:'させる',r:'let'},
  'like':{j:'好き・～のように',r:'laɪk'},'go':{j:'行く',r:'ɡoʊ'},
  'come':{j:'来る',r:'kʌm'},'get':{j:'得る・なる',r:'ɡet'},
  'give':{j:'与える',r:'ɡɪv'},'take':{j:'取る',r:'teɪk'},
  'make':{j:'作る・～にする',r:'meɪk'},'know':{j:'知っている',r:'noʊ'},
  'think':{j:'思う・考える',r:'θɪŋk'},'see':{j:'見る・分かる',r:'siː'},
  'look':{j:'見る',r:'lʊk'},'want':{j:'欲しい・したい',r:'wɒnt'},
  'use':{j:'使う',r:'juːz'},'find':{j:'見つける',r:'faɪnd'},
  'tell':{j:'伝える',r:'tel'},'ask':{j:'聞く・頼む',r:'æsk'},
  'keep':{j:'保つ・続ける',r:'kiːp'},'show':{j:'見せる',r:'ʃoʊ'},
  'hear':{j:'聞こえる',r:'hɪər'},'play':{j:'遊ぶ・演奏する',r:'pleɪ'},
  'run':{j:'走る',r:'rʌn'},'move':{j:'動く',r:'muːv'},
  'live':{j:'住む・生きる',r:'lɪv'},'try':{j:'試みる',r:'traɪ'},
  'call':{j:'電話する・呼ぶ',r:'kɔːl'},'put':{j:'置く',r:'pʊt'},
  'help':{j:'助ける',r:'help'},'turn':{j:'回す・変わる',r:'tɜːrn'},
  'start':{j:'始める',r:'stɑːrt'},'stop':{j:'止める',r:'stɒp'},
  'change':{j:'変える',r:'tʃeɪndʒ'},'meet':{j:'会う',r:'miːt'},
  'pay':{j:'払う',r:'peɪ'},'send':{j:'送る',r:'send'},
  'buy':{j:'買う',r:'baɪ'},'eat':{j:'食べる',r:'iːt'},
  'drink':{j:'飲む',r:'drɪŋk'},'walk':{j:'歩く',r:'wɔːk'},
  'read':{j:'読む',r:'riːd'},'write':{j:'書く',r:'raɪt'},
  'open':{j:'開ける',r:'ˈoʊpən'},'close':{j:'閉める',r:'kloʊz'},
  'wait':{j:'待つ',r:'weɪt'},'need':{j:'必要がある',r:'niːd'},
  'feel':{j:'感じる',r:'fiːl'},'say':{j:'言う',r:'seɪ'},
  'remember':{j:'覚えている',r:'rɪˈmembər'},'become':{j:'～になる',r:'bɪˈkʌm'},
  'bring':{j:'持ってくる',r:'brɪŋ'},'hold':{j:'持つ・保つ',r:'hoʊld'},
  'spend':{j:'費やす',r:'spend'},'pass':{j:'渡す・合格する',r:'pɑːs'},
  'check':{j:'確認する',r:'tʃek'},'wear':{j:'着る',r:'weər'},
  'learn':{j:'学ぶ',r:'lɜːrn'},'work':{j:'働く・機能する',r:'wɜːrk'},
  'day':{j:'日',r:'deɪ'},'time':{j:'時間',r:'taɪm'},'year':{j:'年',r:'jɪər'},
  'way':{j:'方法・道',r:'weɪ'},'people':{j:'人々',r:'ˈpiːpəl'},
  'world':{j:'世界',r:'wɜːrld'},'life':{j:'人生・生活',r:'laɪf'},
  'home':{j:'家',r:'hoʊm'},'school':{j:'学校',r:'skuːl'},
  'man':{j:'男性',r:'mæn'},'woman':{j:'女性',r:'ˈwʊmən'},
  'good':{j:'良い',r:'ɡʊd'},'new':{j:'新しい',r:'njuː'},
  'first':{j:'最初の',r:'fɜːrst'},'last':{j:'最後の',r:'lɑːst'},
  'great':{j:'素晴らしい',r:'ɡreɪt'},'long':{j:'長い',r:'lɒŋ'},
  'big':{j:'大きい',r:'bɪɡ'},'old':{j:'古い・年取った',r:'oʊld'},
  'high':{j:'高い',r:'haɪ'},'small':{j:'小さい',r:'smɔːl'},
  'hard':{j:'難しい・一生懸命',r:'hɑːrd'},'free':{j:'自由な・無料の',r:'friː'},
  'real':{j:'本当の',r:'riːl'},'best':{j:'最も良い',r:'best'},
  'right':{j:'正しい・右',r:'raɪt'},'next':{j:'次の',r:'nekst'},
  'early':{j:'早い',r:'ˈɜːrli'},'late':{j:'遅い',r:'leɪt'},
  'little':{j:'少し・小さい',r:'ˈlɪtəl'},'far':{j:'遠い',r:'fɑːr'},
  'low':{j:'低い',r:'loʊ'},'fast':{j:'速い',r:'fɑːst'},
  'hot':{j:'熱い',r:'hɒt'},'cold':{j:'冷たい・寒い',r:'koʊld'},
  'happy':{j:'幸せな',r:'ˈhæpi'},'nice':{j:'良い・素敵な',r:'naɪs'},
  'busy':{j:'忙しい',r:'ˈbɪzi'},'ready':{j:'準備ができた',r:'ˈredi'},
  'easy':{j:'易しい',r:'ˈiːzi'},'true':{j:'本当の',r:'truː'},
  'fine':{j:'良い・細い',r:'faɪn'},'clear':{j:'明確な',r:'klɪər'},
  'full':{j:'満杯の',r:'fʊl'},'strong':{j:'強い',r:'strɒŋ'},
  "i'm":{j:'私は～です',r:'aɪm'},"i've":{j:'私は～した',r:'aɪv'},
  "i'll":{j:'私は～するだろう',r:'aɪl'},"i'd":{j:'私は～だろう',r:'aɪd'},
  "don't":{j:'～しない',r:'doʊnt'},"can't":{j:'できない',r:'kɑːnt'},
  "it's":{j:'それは～です',r:'ɪts'},"let's":{j:'～しましょう',r:'lets'},
  "that's":{j:'それは～です',r:'ðæts'},"what's":{j:'何が・何は',r:'wɒts'},
  "doesn't":{j:'～しない',r:'dʌznt'},"didn't":{j:'～しなかった',r:'dɪdnt'},
  "won't":{j:'～しないだろう',r:'woʊnt'},"isn't":{j:'～ではない',r:'ɪznt'},
  "aren't":{j:'～ではない',r:'ɑːrnt'},"haven't":{j:'～していない',r:'hævnt'},
  "hasn't":{j:'～していない',r:'hæznt'},
  'into':{j:'～の中へ',r:'ˈɪntuː'},'onto':{j:'～の上へ',r:'ˈɒntuː'},
  'over':{j:'～の上に・超えて',r:'ˈoʊvər'},'under':{j:'～の下に',r:'ˈʌndər'},
  'through':{j:'～を通して',r:'θruː'},'between':{j:'～の間に',r:'bɪˈtwiːn'},
  'during':{j:'～の間',r:'ˈdjʊərɪŋ'},'without':{j:'～なしで',r:'wɪˈðaʊt'},
  'around':{j:'～の周りに',r:'əˈraʊnd'},'since':{j:'～以来',r:'sɪns'},
  'until':{j:'～まで',r:'ʌnˈtɪl'},'while':{j:'～の間',r:'waɪl'},
  'because':{j:'なぜなら',r:'bɪˈkɒz'},'although':{j:'～だけれども',r:'ɔːlˈðoʊ'},
  'however':{j:'しかしながら',r:'haʊˈevər'},'therefore':{j:'それゆえ',r:'ˈðeərfɔːr'},
  'morning':{j:'朝・午前',r:'ˈmɔːrnɪŋ'},'evening':{j:'夕方・夜',r:'ˈiːvnɪŋ'},
  'today':{j:'今日',r:'təˈdeɪ'},'tomorrow':{j:'明日',r:'təˈmɒroʊ'},
  'yesterday':{j:'昨日',r:'ˈjestərdeɪ'},
  'water':{j:'水',r:'ˈwɔːtər'},'food':{j:'食べ物',r:'fuːd'},
  'money':{j:'お金',r:'ˈmʌni'},'book':{j:'本',r:'bʊk'},
  'car':{j:'車',r:'kɑːr'},'phone':{j:'電話',r:'foʊn'},
  'room':{j:'部屋',r:'ruːm'},'name':{j:'名前',r:'neɪm'},
  'question':{j:'質問',r:'ˈkwestʃən'},'answer':{j:'答え',r:'ˈɑːnsər'},
  'idea':{j:'考え・アイデア',r:'aɪˈdɪə'},'problem':{j:'問題',r:'ˈprɒbləm'},
  'doctor':{j:'医者',r:'ˈdɒktər'},'teacher':{j:'先生',r:'ˈtiːtʃər'},
  'friend':{j:'友人',r:'frend'},'family':{j:'家族',r:'ˈfæməli'},
  'number':{j:'数',r:'ˈnʌmbər'},'point':{j:'点・ポイント',r:'pɔɪnt'},
  'price':{j:'価格',r:'praɪs'},'place':{j:'場所',r:'pleɪs'},
  'thing':{j:'もの・こと',r:'θɪŋ'},'getting':{j:'得ている',r:'ˈɡetɪŋ'},
  'going':{j:'行っている',r:'ˈɡoʊɪŋ'},'doing':{j:'している',r:'ˈduːɪŋ'},
  'having':{j:'持っている',r:'ˈhævɪŋ'},'making':{j:'作っている',r:'ˈmeɪkɪŋ'},
  'taking':{j:'取っている',r:'ˈteɪkɪŋ'},'saying':{j:'言っている',r:'ˈseɪɪŋ'},
  'looking':{j:'見ている',r:'ˈlʊkɪŋ'},'coming':{j:'来ている',r:'ˈkʌmɪŋ'},
  'working':{j:'働いている',r:'ˈwɜːrkɪŋ'},'thinking':{j:'考えている',r:'ˈθɪŋkɪŋ'},
  // ── 追加分（本文中の頻出機能語） ──
  'as':{j:'～として・～のように',r:'æz'},'across':{j:'～を横切って',r:'əˈkrɔːs'},
  'alongside':{j:'～と並んで',r:'əˌlɔːŋˈsaɪd'},'despite':{j:'～にもかかわらず',r:'dɪˈspaɪt'},
  'throughout':{j:'～の間中・至る所に',r:'θruːˈaʊt'},'toward':{j:'～の方へ',r:'tɔːrd'},
  'unlike':{j:'～と違って',r:'ʌnˈlaɪk'},'upon':{j:'～の上に',r:'əˈpɒn'},
  'within':{j:'～以内に・～の中で',r:'wɪˈðɪn'},'regardless':{j:'～にかまわず',r:'rɪˈɡɑːrdləs'},
  'whether':{j:'～かどうか',r:'ˈweðər'},'whose':{j:'誰の',r:'huːz'},
  'either':{j:'どちらか・どちらも',r:'ˈiːðər'},'enough':{j:'十分な・十分に',r:'ɪˈnʌf'},
  'ever':{j:'これまでに・かつて',r:'ˈevər'},'away':{j:'離れて・去って',r:'əˈweɪ'},
  'behind':{j:'～の後ろに',r:'bɪˈhaɪnd'},'off':{j:'離れて・切れて',r:'ɔːf'},
  'due':{j:'予定の・～のため',r:'duː'},'half':{j:'半分',r:'hæf'},
  'please':{j:'どうぞ・喜ばせる',r:'pliːz'},'shall':{j:'～しましょうか',r:'ʃæl'},
  'cannot':{j:'～できない',r:'ˈkænɒt'},'several':{j:'いくつかの',r:'ˈsevrəl'},
  'anyone':{j:'誰でも・誰か',r:'ˈeniwʌn'},'anything':{j:'何でも・何か',r:'ˈeniθɪŋ'},
  'anywhere':{j:'どこでも',r:'ˈeniweər'},'everyone':{j:'みんな',r:'ˈevriwʌn'},
  'everything':{j:'すべて',r:'ˈevriθɪŋ'},'someone':{j:'誰か',r:'ˈsʌmwʌn'},
  'something':{j:'何か',r:'ˈsʌmθɪŋ'},'sometime':{j:'いつか',r:'ˈsʌmtaɪm'},
  'nothing':{j:'何も～ない',r:'ˈnʌθɪŋ'},'others':{j:'他の人々・他のもの',r:'ˈʌðərz'},
  'himself':{j:'彼自身',r:'hɪmˈself'},'itself':{j:'それ自体',r:'ɪtˈself'},
  'myself':{j:'私自身',r:'maɪˈself'},'ourselves':{j:'私たち自身',r:'ɑːrˈselvz'},
  'themselves':{j:'彼ら自身',r:'ðəmˈselvz'},'yonder':{j:'あそこの・向こうの',r:'ˈjɒndər'},
};

// ── 不規則変化形辞書 {b:原形, t:変化種別} ──
const IRREGULAR_FORMS = {
  // 不規則動詞過去形/過去分詞
  'went':{'b':'go','t':'過去形'},'gone':{'b':'go','t':'過去分詞'},
  'saw':{'b':'see','t':'過去形'},'seen':{'b':'see','t':'過去分詞'},
  'came':{'b':'come','t':'過去形'},
  'got':{'b':'get','t':'過去形'},'gotten':{'b':'get','t':'過去分詞'},
  'made':{'b':'make','t':'過去形/過去分詞'},
  'knew':{'b':'know','t':'過去形'},'known':{'b':'know','t':'過去分詞'},
  'thought':{'b':'think','t':'過去形/過去分詞'},
  'took':{'b':'take','t':'過去形'},'taken':{'b':'take','t':'過去分詞'},
  'said':{'b':'say','t':'過去形/過去分詞'},
  'gave':{'b':'give','t':'過去形'},'given':{'b':'give','t':'過去分詞'},
  'found':{'b':'find','t':'過去形/過去分詞'},
  'told':{'b':'tell','t':'過去形/過去分詞'},
  'became':{'b':'become','t':'過去形'},
  'left':{'b':'leave','t':'過去形/過去分詞'},
  'felt':{'b':'feel','t':'過去形/過去分詞'},
  'brought':{'b':'bring','t':'過去形/過去分詞'},
  'began':{'b':'begin','t':'過去形'},'begun':{'b':'begin','t':'過去分詞'},
  'kept':{'b':'keep','t':'過去形/過去分詞'},
  'held':{'b':'hold','t':'過去形/過去分詞'},
  'wrote':{'b':'write','t':'過去形'},'written':{'b':'write','t':'過去分詞'},
  'stood':{'b':'stand','t':'過去形/過去分詞'},
  'heard':{'b':'hear','t':'過去形/過去分詞'},
  'meant':{'b':'mean','t':'過去形/過去分詞'},
  'met':{'b':'meet','t':'過去形/過去分詞'},
  'ran':{'b':'run','t':'過去形'},
  'paid':{'b':'pay','t':'過去形/過去分詞'},
  'sat':{'b':'sit','t':'過去形/過去分詞'},
  'spoke':{'b':'speak','t':'過去形'},'spoken':{'b':'speak','t':'過去分詞'},
  'led':{'b':'lead','t':'過去形/過去分詞'},
  'grew':{'b':'grow','t':'過去形'},'grown':{'b':'grow','t':'過去分詞'},
  'lost':{'b':'lose','t':'過去形/過去分詞'},
  'fell':{'b':'fall','t':'過去形'},'fallen':{'b':'fall','t':'過去分詞'},
  'sent':{'b':'send','t':'過去形/過去分詞'},
  'built':{'b':'build','t':'過去形/過去分詞'},
  'broke':{'b':'break','t':'過去形'},'broken':{'b':'break','t':'過去分詞'},
  'spent':{'b':'spend','t':'過去形/過去分詞'},
  'rose':{'b':'rise','t':'過去形'},'risen':{'b':'rise','t':'過去分詞'},
  'drove':{'b':'drive','t':'過去形'},'driven':{'b':'drive','t':'過去分詞'},
  'bought':{'b':'buy','t':'過去形/過去分詞'},
  'wore':{'b':'wear','t':'過去形'},'worn':{'b':'wear','t':'過去分詞'},
  'chose':{'b':'choose','t':'過去形'},'chosen':{'b':'choose','t':'過去分詞'},
  'taught':{'b':'teach','t':'過去形/過去分詞'},
  'caught':{'b':'catch','t':'過去形/過去分詞'},
  'fought':{'b':'fight','t':'過去形/過去分詞'},
  'won':{'b':'win','t':'過去形/過去分詞'},
  'drew':{'b':'draw','t':'過去形'},'drawn':{'b':'draw','t':'過去分詞'},
  'ate':{'b':'eat','t':'過去形'},'eaten':{'b':'eat','t':'過去分詞'},
  'flew':{'b':'fly','t':'過去形'},'flown':{'b':'fly','t':'過去分詞'},
  'sang':{'b':'sing','t':'過去形'},'sung':{'b':'sing','t':'過去分詞'},
  'swam':{'b':'swim','t':'過去形'},'swum':{'b':'swim','t':'過去分詞'},
  'threw':{'b':'throw','t':'過去形'},'thrown':{'b':'throw','t':'過去分詞'},
  'forgot':{'b':'forget','t':'過去形'},'forgotten':{'b':'forget','t':'過去分詞'},
  'forgave':{'b':'forgive','t':'過去形'},'forgiven':{'b':'forgive','t':'過去分詞'},
  'hid':{'b':'hide','t':'過去形'},'hidden':{'b':'hide','t':'過去分詞'},
  'shot':{'b':'shoot','t':'過去形/過去分詞'},
  'slept':{'b':'sleep','t':'過去形/過去分詞'},
  'stole':{'b':'steal','t':'過去形'},'stolen':{'b':'steal','t':'過去分詞'},
  'woke':{'b':'wake','t':'過去形'},'woken':{'b':'wake','t':'過去分詞'},
  'understood':{'b':'understand','t':'過去形/過去分詞'},
  'bore':{'b':'bear','t':'過去形'},'borne':{'b':'bear','t':'過去分詞'},'born':{'b':'bear','t':'過去分詞'},
  'bound':{'b':'bind','t':'過去形/過去分詞'},
  'bit':{'b':'bite','t':'過去形'},'bitten':{'b':'bite','t':'過去分詞'},
  'blew':{'b':'blow','t':'過去形'},'blown':{'b':'blow','t':'過去分詞'},
  'froze':{'b':'freeze','t':'過去形'},'frozen':{'b':'freeze','t':'過去分詞'},
  'rode':{'b':'ride','t':'過去形'},'ridden':{'b':'ride','t':'過去分詞'},
  'rang':{'b':'ring','t':'過去形'},'rung':{'b':'ring','t':'過去分詞'},
  'shone':{'b':'shine','t':'過去形/過去分詞'},
  'sprang':{'b':'spring','t':'過去形'},'sprung':{'b':'spring','t':'過去分詞'},
  'struck':{'b':'strike','t':'過去形/過去分詞'},
  'swept':{'b':'sweep','t':'過去形/過去分詞'},
  'swung':{'b':'swing','t':'過去形/過去分詞'},
  'tore':{'b':'tear','t':'過去形'},'torn':{'b':'tear','t':'過去分詞'},
  'wove':{'b':'weave','t':'過去形'},'woven':{'b':'weave','t':'過去分詞'},
  'withdrew':{'b':'withdraw','t':'過去形'},'withdrawn':{'b':'withdraw','t':'過去分詞'},
  'lay':{'b':'lie','t':'過去形'},'lain':{'b':'lie','t':'過去分詞'},
  'proved':{'b':'prove','t':'過去形'},'proven':{'b':'prove','t':'過去分詞'},
  // 不規則複数形
  'children':{'b':'child','t':'複数形'},
  'men':{'b':'man','t':'複数形'},
  'women':{'b':'woman','t':'複数形'},
  'teeth':{'b':'tooth','t':'複数形'},
  'feet':{'b':'foot','t':'複数形'},
  'mice':{'b':'mouse','t':'複数形'},
  'geese':{'b':'goose','t':'複数形'},
  'phenomena':{'b':'phenomenon','t':'複数形'},
  'criteria':{'b':'criterion','t':'複数形'},
  'analyses':{'b':'analysis','t':'複数形'},
  'bases':{'b':'basis','t':'複数形'},
  'crises':{'b':'crisis','t':'複数形'},
  'hypotheses':{'b':'hypothesis','t':'複数形'},
  'theses':{'b':'thesis','t':'複数形'},
  'indices':{'b':'index','t':'複数形'},
  'matrices':{'b':'matrix','t':'複数形'},
  'stimuli':{'b':'stimulus','t':'複数形'},
  // 形容詞不規則比較級/最上級
  'better':{'b':'good','t':'比較級'},
  'best':{'b':'good','t':'最上級'},
  'worse':{'b':'bad','t':'比較級'},
  'worst':{'b':'bad','t':'最上級'},
  'less':{'b':'little','t':'比較級'},
  'least':{'b':'little','t':'最上級'},
  'further':{'b':'far','t':'比較級'},
  'furthest':{'b':'far','t':'最上級'},
  'farther':{'b':'far','t':'比較級'},
  'farthest':{'b':'far','t':'最上級'},
  'elder':{'b':'old','t':'比較級'},
  'eldest':{'b':'old','t':'最上級'},
  'latter':{'b':'late','t':'比較級'},
};

// ── 画面遷移 ──
const App = (() => {
  let currentScreen = 'home';

  function showScreen(name) {
    if (name !== 'sentence-fc') sfcAutoStop();
    // 🎤 発音チェックの窓・💬 英会話は、ほかの画面へ行くときに止める（v533）
    if (window.ES) ES.close();
    if (name !== 'talk' && window.Talk) Talk.leave();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+name).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.s === name);
    });
    currentScreen = name;
    if (name === 'home') history.replaceState({screen:'home'}, '');
    else                 history.pushState({screen:name}, '');
    if (name === 'home')  renderHome();
    if (name === 'words') renderWordList();
    if (name === 'stats') renderStats();
  }

  function goHome() { showScreen('home'); }

  // ── ホーム ──
  function renderHome() {
    updateStreak();
    document.getElementById('streak-num').textContent = DATA.stats.streak;
    document.getElementById('home-mastered').textContent = masteredCount();
    document.getElementById('home-today').textContent = todayLearned();
    document.getElementById('home-accuracy').textContent = accuracyStr();
    const pct = Math.round(masteredCount()/WORDS.length*100);
    document.getElementById('home-progress-bar').style.width = pct+'%';
    document.getElementById('home-progress-text').textContent = `${masteredCount()} / ${WORDS.length}`;
    const awc = document.getElementById('all-words-count');
    if (awc) awc.textContent = WORDS.length;
    const due = reviewDue();
    const rb = document.getElementById('review-box');
    if (due.length > 0) {
      rb.style.display = 'flex';
      document.getElementById('review-count').textContent = due.length;
    } else { rb.style.display = 'none'; }
  }

  // ── 学習モード共通 ──
  function pickStudyWords(n=15) {
    // 優先度: 復習期限>未学習>習得中
    const due = reviewDue();
    const unseen = WORDS.filter(w => getWordData(w.id).mastery === 0);
    const learning = WORDS.filter(w => { const d=getWordData(w.id); return d.mastery>0 && !isMastered(w.id); });
    let pool = [...due];
    if (pool.length < n) pool = pool.concat(unseen.slice(0, n-pool.length));
    if (pool.length < n) pool = pool.concat(learning.slice(0, n-pool.length));
    if (pool.length < n) pool = pool.concat(WORDS.filter(w=>!pool.includes(w)).slice(0,n-pool.length));
    return shuffle(pool).slice(0, n);
  }

  function shuffle(arr) {
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }

  function startReview() { startMode('flashcard', reviewDue()); }

  // ── フラッシュカード ──
  let fcWords=[], fcIdx=0, fcFlipped=false;

  function startMode(mode, customWords=null) {
    const words = customWords || pickStudyWords(15);
    if (mode==='flashcard') startFlashcard(words);
    if (mode==='quiz')      startQuiz(words);
    if (mode==='typing')    startTyping(words);
    if (mode==='listen')    startListen(words);
  }

  let fcAllWordsMode = false;
  let fcFreqMode = false;
  let fcFreqGroupIdx = -1;
  let fcFreqLen = -1;
  let fcHSMode = false;
  let fcHSGrade = 0;
  let fcHSSub = 0;
  let fcUnmasteredFirst = false;
  let fcBaseWords = [];
  let awFilterLevel = 0;
  let awFilterGenre = '';
  let awFilteredBase = [];

  const AW_GENRE_LABELS = {
    '': '', 'verb': '動詞', 'noun': '名詞', 'adj': '形容詞', 'adv': '副詞',
    'history': '歴史', 'academic': '学術', 'nature': '自然', 'business': 'ビジネス',
    'tech': 'テック', 'country-place': '国・地名', 'food': '食べ物',
    'body': '身体', 'emotion': '感情', 'animal': '動物', 'other': 'その他',
  };

  const HS_GRADE_LABELS = ['高1', '高2', '高3'];
  const HS_SUB_LABELS   = ['基礎', '標準', '発展'];
  const HS_GRADE_COLORS = ['#16a34a', '#2563eb', '#ea580c'];

  function startFlashcard(words) {
    fcWords = words; fcIdx = 0;
    fcAllWordsMode = false; fcFreqMode = false; fcHSMode = false;
    fcUnmasteredFirst = false; fcBaseWords = [];
    document.getElementById('all-words-toolbar').style.display = 'none';
    document.getElementById('freq-fc-toolbar').style.display = 'none';
    document.getElementById('hs-fc-toolbar').style.display = 'none';
    document.getElementById('rating-area').style.display = 'none';
    showScreen('flashcard');
    loadFC();
  }

  // ── 全単語フラッシュカード ──
  function startAllWords() {
    openAWFilterModal();
  }

  function openAWFilterModal() {
    awFilterLevel = 0;
    awFilterGenre = '';
    updateAWFilterUI();
    updateAWFilterCount();
    document.getElementById('aw-filter-modal').style.display = 'flex';
  }

  function closeAWFilterModal() {
    document.getElementById('aw-filter-modal').style.display = 'none';
  }

  function setAWFilterLevel(lv) {
    awFilterLevel = parseInt(lv);
    updateAWFilterUI();
    updateAWFilterCount();
  }

  function setAWFilterGenre(genre) {
    awFilterGenre = genre;
    updateAWFilterUI();
    updateAWFilterCount();
  }

  function updateAWFilterUI() {
    document.querySelectorAll('.aw-filter-lv-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.lv) === awFilterLevel);
    });
    document.querySelectorAll('.aw-filter-genre-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.genre === awFilterGenre);
    });
  }

  function getAWFilteredWords() {
    let words = [...WORDS];
    if (awFilterLevel > 0) words = words.filter(w => w.l === awFilterLevel);
    if (awFilterGenre) {
      if (awFilterGenre === 'country-place') {
        words = words.filter(w => ['country', 'city', 'place'].includes(w.c));
      } else if (awFilterGenre === 'other') {
        const main = ['verb','noun','adj','adv','history','academic','nature','business','tech','country','city','place','food','body','emotion','animal'];
        words = words.filter(w => !main.includes(w.c));
      } else {
        words = words.filter(w => w.c === awFilterGenre);
      }
    }
    return words;
  }

  function updateAWFilterCount() {
    const count = getAWFilteredWords().length;
    const el = document.getElementById('aw-filter-count');
    if (el) el.textContent = count + ' 語';
  }

  function startAllWordsWithFilter() {
    const filtered = getAWFilteredWords();
    if (filtered.length === 0) {
      alert('該当する単語がありません。条件を変更してください。');
      return;
    }
    closeAWFilterModal();
    awFilteredBase = filtered;
    fcAllWordsMode = true; fcFreqMode = false; fcHSMode = false;
    fcUnmasteredFirst = false; fcBaseWords = [];
    fcWords = sortAllWordsList(awFilteredBase, 'level');
    fcIdx = 0;
    document.getElementById('all-words-toolbar').style.display = 'flex';
    document.getElementById('freq-fc-toolbar').style.display = 'none';
    document.getElementById('hs-fc-toolbar').style.display = 'none';
    document.getElementById('aw-sort').value = 'level';
    document.getElementById('rating-area').style.display = 'none';
    const ub = document.getElementById('aw-unmastered-btn');
    if (ub) ub.classList.remove('fc-unmastered-on');
    showScreen('flashcard');
    loadFC();
  }

  function sortAllWordsList(arr, key) {
    const a = [...arr];
    if (key === 'level')  a.sort((x, y) => x.l - y.l || x.id - y.id);
    if (key === 'id')     a.sort((x, y) => x.id - y.id);
    if (key === 'alpha')  a.sort((x, y) => x.w.localeCompare(y.w));
    if (key === 'random') a.sort(() => Math.random() - 0.5);
    return a;
  }

  function sortAllWords(key) {
    return sortAllWordsList(WORDS, key);
  }

  // ── 頻度順フラッシュ ──
  function getFreqGroups() {
    const sorted = [...WORDS].sort((a, b) => a.l - b.l || a.id - b.id);
    const groups = [];
    for (let i = 0; i < sorted.length; i += 100) {
      const chunk = sorted.slice(i, i + 100);
      chunk.sort((a, b) => a.w.length - b.w.length || a.w.localeCompare(b.w));
      groups.push(chunk);
    }
    return groups;
  }

  function startFreqMode() {
    fcFreqMode = false; fcFreqGroupIdx = -1; fcFreqLen = -1;
    showFreqGroups();
    showScreen('freq');
  }

  function showFreqGroups() {
    document.getElementById('freq-view-groups').style.display = 'block';
    document.getElementById('freq-view-lengths').style.display = 'none';
    const groups = getFreqGroups();
    const container = document.getElementById('freq-groups');
    if (!container) return;
    container.innerHTML = groups.map((g, i) => {
      const total = g.length;
      const mastered = g.filter(w => isMastered(w.id)).length;
      const pct = Math.round(mastered / total * 100);
      const minLen = g[0].w.length;
      const maxLen = g[g.length - 1].w.length;
      return `
        <button class="freq-group-btn" onclick="App.showFreqLengths(${i})">
          <div class="freq-group-header">
            <span class="freq-group-num">グループ ${i + 1}</span>
            <span class="freq-group-len">${minLen}〜${maxLen}文字</span>
          </div>
          <div class="freq-group-progress">
            <div class="freq-prog-bar"><div class="freq-prog-fill" style="width:${pct}%"></div></div>
            <span class="freq-prog-text">${mastered}/${total}</span>
          </div>
        </button>`;
    }).join('');
  }

  function showFreqLengths(idx) {
    fcFreqGroupIdx = idx;
    const groups = getFreqGroups();
    const g = groups[idx];
    document.getElementById('freq-view-groups').style.display = 'none';
    document.getElementById('freq-view-lengths').style.display = 'block';
    document.getElementById('freq-detail-title').textContent = `グループ ${idx + 1}`;

    const totalMastered = g.filter(w => isMastered(w.id)).length;
    const totalPct = Math.round(totalMastered / g.length * 100);
    document.getElementById('freq-all-wrap').innerHTML = `
      <button class="freq-group-btn freq-all-entry" onclick="App.startFreqGroupAll(${idx})">
        <div class="freq-group-header">
          <span class="freq-group-num">すべて</span>
          <span class="freq-group-len">${g.length}語</span>
        </div>
        <div class="freq-group-progress">
          <div class="freq-prog-bar"><div class="freq-prog-fill" style="width:${totalPct}%"></div></div>
          <span class="freq-prog-text">${totalMastered}/${g.length}</span>
        </div>
      </button>`;

    const lenMap = {};
    g.forEach(w => { (lenMap[w.w.length] = lenMap[w.w.length] || []).push(w); });
    const lengths = Object.keys(lenMap).map(Number).sort((a, b) => a - b);
    document.getElementById('freq-lengths').innerHTML = lengths.map(len => {
      const words = lenMap[len];
      const mastered = words.filter(w => isMastered(w.id)).length;
      const pct = Math.round(mastered / words.length * 100);
      return `
        <button class="freq-group-btn" onclick="App.startFreqGroupLen(${idx}, ${len})">
          <div class="freq-group-header">
            <span class="freq-group-num">${len}文字</span>
            <span class="freq-group-len">${words.length}語</span>
          </div>
          <div class="freq-group-progress">
            <div class="freq-prog-bar"><div class="freq-prog-fill" style="width:${pct}%"></div></div>
            <span class="freq-prog-text">${mastered}/${words.length}</span>
          </div>
        </button>`;
    }).join('');
  }

  function startFreqGroupAll(idx) {
    const groups = getFreqGroups();
    if (idx < 0 || idx >= groups.length) return;
    fcFreqMode = true; fcFreqGroupIdx = idx; fcFreqLen = -1;
    fcAllWordsMode = false; fcHSMode = false;
    fcUnmasteredFirst = false; fcBaseWords = [];
    fcWords = [...groups[idx]];
    fcIdx = 0;
    document.getElementById('all-words-toolbar').style.display = 'none';
    document.getElementById('freq-fc-toolbar').style.display = 'flex';
    document.getElementById('hs-fc-toolbar').style.display = 'none';
    document.getElementById('rating-area').style.display = 'none';
    const ub = document.getElementById('freq-unmastered-btn');
    if (ub) ub.classList.remove('fc-unmastered-on');
    showScreen('flashcard');
    loadFC();
  }

  function startFreqGroupLen(idx, len) {
    const groups = getFreqGroups();
    if (idx < 0 || idx >= groups.length) return;
    fcFreqMode = true; fcFreqGroupIdx = idx; fcFreqLen = len;
    fcAllWordsMode = false; fcHSMode = false;
    fcUnmasteredFirst = false; fcBaseWords = [];
    fcWords = groups[idx].filter(w => w.w.length === len);
    fcIdx = 0;
    document.getElementById('all-words-toolbar').style.display = 'none';
    document.getElementById('freq-fc-toolbar').style.display = 'flex';
    document.getElementById('hs-fc-toolbar').style.display = 'none';
    document.getElementById('rating-area').style.display = 'none';
    const ub = document.getElementById('freq-unmastered-btn');
    if (ub) ub.classList.remove('fc-unmastered-on');
    showScreen('flashcard');
    loadFC();
  }

  function startFreqGroup(idx) { showFreqLengths(idx); }

  function goFreqBack() {
    if (fcFreqGroupIdx >= 0) {
      showFreqLengths(fcFreqGroupIdx);
      showScreen('freq');
    } else {
      startFreqMode();
    }
  }

  // ── 高校英語レベル別 ──
  function getHSGroups() {
    const lv1 = WORDS.filter(w => w.l === 1).sort((a, b) => a.id - b.id);
    const lv2 = WORDS.filter(w => w.l === 2).sort((a, b) => a.id - b.id);
    const lv3 = WORDS.filter(w => w.l >= 3).sort((a, b) => a.l - b.l || a.id - b.id);
    function split3(arr) {
      const s = Math.ceil(arr.length / 3);
      return [arr.slice(0, s), arr.slice(s, s * 2), arr.slice(s * 2)];
    }
    return [split3(lv1), split3(lv2), split3(lv3)];
  }

  function startHSMode() {
    fcHSMode = false;
    showScreen('highschool');
    renderHSGrid();
  }

  function renderHSGrid() {
    const container = document.getElementById('hs-level-grid');
    if (!container) return;
    const groups = getHSGroups();
    container.innerHTML = groups.map((grade, gi) => {
      const subs = grade.map((words, si) => {
        const total    = words.length;
        const mastered = words.filter(w => isMastered(w.id)).length;
        const pct      = total ? Math.round(mastered / total * 100) : 0;
        return `
          <button class="hs-level-btn" onclick="App.startHSLevel(${gi},${si})">
            <div class="hs-sub-label" style="color:${HS_GRADE_COLORS[gi]}">${HS_SUB_LABELS[si]}</div>
            <div class="hs-word-count">${total}語</div>
            <div class="freq-group-progress">
              <div class="freq-prog-bar"><div class="freq-prog-fill" style="width:${pct}%"></div></div>
              <span class="freq-prog-text">${mastered}/${total}</span>
            </div>
          </button>`;
      }).join('');
      return `
        <div class="hs-grade-section">
          <div class="hs-grade-header" style="background:${HS_GRADE_COLORS[gi]}">${HS_GRADE_LABELS[gi]}</div>
          <div class="hs-sub-row">${subs}</div>
        </div>`;
    }).join('');
  }

  function startHSLevel(grade, sub) {
    const groups = getHSGroups();
    fcHSMode = true; fcHSGrade = grade; fcHSSub = sub;
    fcAllWordsMode = false; fcFreqMode = false;
    fcUnmasteredFirst = false; fcBaseWords = [];
    fcWords = [...groups[grade][sub]];
    fcIdx = 0;
    document.getElementById('all-words-toolbar').style.display = 'none';
    document.getElementById('freq-fc-toolbar').style.display = 'none';
    document.getElementById('hs-fc-toolbar').style.display = 'flex';
    document.getElementById('rating-area').style.display = 'none';
    const ub = document.getElementById('hs-unmastered-btn');
    if (ub) ub.classList.remove('fc-unmastered-on');
    showScreen('flashcard');
    loadFC();
  }

  function goHSBack() {
    startHSMode();
  }

  function hsToggleUnmastered() {
    const currentId = fcWords[fcIdx].id;
    fcUnmasteredFirst = !fcUnmasteredFirst;
    const btn = document.getElementById('hs-unmastered-btn');
    if (btn) btn.classList.toggle('fc-unmastered-on', fcUnmasteredFirst);
    if (fcUnmasteredFirst) {
      fcBaseWords = [...fcWords];
      fcWords = applyUnmasteredFirst(fcBaseWords);
    } else {
      fcWords = fcBaseWords.length ? [...fcBaseWords] : fcWords;
      fcBaseWords = [];
    }
    fcIdx = fcWords.findIndex(w => w.id === currentId);
    if (fcIdx < 0) fcIdx = 0;
    loadFC();
  }

  // ── 高校英語 長文リスニング ──
  const RD_SPEEDS    = [0.5, 0.7, 0.8, 1.0, 1.2, 1.5, 2.0];
  const RD_PAUSES    = [0, 100, 200, 300, 500, 700, 1000, 1500];
  const RD_SPEED_KEY = 'rd_speed_idx';
  const RD_PAUSE_KEY = 'rd_pause_idx';
  let rdPassages = [], rdPassageIdx = 0, rdPassage = null;
  let rdTokens = [], rdWords = [], rdWordIdx = 0;
  let rdPlaying = false, rdBulkPlaying = false, rdTimer = null;
  let rdShowJa = false;
  let rdSpeedIdx = parseInt(localStorage.getItem(RD_SPEED_KEY) || '3', 10);
  let rdSpeed = RD_SPEEDS[rdSpeedIdx] || 1.0;
  let rdPauseIdx = parseInt(localStorage.getItem(RD_PAUSE_KEY) || '3', 10);
  let rdPause = RD_PAUSES[rdPauseIdx] ?? 300;
  let rdGrade = 0, rdSub = 0;

  function startRDMode() {
    rdCleanup();
    showScreen('reading-select');
    renderRDSelectGrid();
  }

  function renderRDSelectGrid() {
    const container = document.getElementById('rd-select-grid');
    if (!container) return;
    container.innerHTML = [0, 1, 2].map(gi => {
      const subs = [0, 1, 2].map(si => {
        const ps = (typeof PASSAGES !== 'undefined' ? PASSAGES : []).filter(p => p.grade === gi && p.sub === si);
        return `
          <button class="hs-level-btn" onclick="App.startRDLevel(${gi},${si})">
            <div class="hs-sub-label" style="color:${HS_GRADE_COLORS[gi]}">${HS_SUB_LABELS[si]}</div>
            <div class="hs-word-count">${ps.length}文章</div>
          </button>`;
      }).join('');
      return `
        <div class="hs-grade-section">
          <div class="hs-grade-header" style="background:${HS_GRADE_COLORS[gi]}">${HS_GRADE_LABELS[gi]}</div>
          <div class="hs-sub-row">${subs}</div>
        </div>`;
    }).join('');
  }

  function startRDLevel(grade, sub) {
    rdGrade = grade; rdSub = sub;
    rdPassages = (typeof PASSAGES !== 'undefined' ? PASSAGES : []).filter(p => p.grade === grade && p.sub === sub);
    rdPassageIdx = 0;
    showScreen('reading');
    loadRDPassage();
  }

  function loadRDPassage() {
    rdCleanup();
    rdPassage = rdPassages[rdPassageIdx] || null;
    if (!rdPassage) return;
    rdWordIdx = 0;
    rdTokens = tokenizeRD(rdPassage.text);
    rdWords = rdTokens.map((t, i) => t.isWord ? { text: t.text, tokenIdx: i } : null).filter(Boolean);
    renderRDPassage();
    renderRDJaPassage();
    updateRDTitle();
    updateRDInfo();
    highlightRDWord(0);
    updateRDPlayBtn();
    updateRDBulkBtn();
    updateRDSpeedDisplay();
    updateRDPauseDisplay();
    updateRDPassBtns();
  }

  function tokenizeRD(text) {
    const parts = text.match(/[a-zA-Z']+|[^a-zA-Z']+/g) || [];
    let wi = 0;
    return parts.map(t => {
      const isWord = /^[a-zA-Z']/.test(t);
      return { text: t, isWord, wordIdx: isWord ? wi++ : -1 };
    });
  }

  function renderRDPassage() {
    const area = document.getElementById('rd-passage');
    if (!area) return;
    area.innerHTML = rdTokens.map(t => {
      if (t.isWord) {
        return `<span class="rd-word" data-wi="${t.wordIdx}" onclick="App.rdClickWord(${t.wordIdx})">${t.text}</span>`;
      }
      return `<span class="rd-space">${t.text.replace(/\n/g, '<br>')}</span>`;
    }).join('');
  }

  function rdClickWord(wi) {
    if (rdBulkPlaying) {
      updateRDWordCard(wi < rdWords.length ? rdWords[wi].text : null);
      return;
    }
    rdCleanup();
    rdPlaying = false;
    rdWordIdx = wi;
    highlightRDWord(wi);
    updateRDPlayBtn();
  }

  function highlightRDWord(wi) {
    document.querySelectorAll('#rd-passage .rd-current').forEach(el => el.classList.remove('rd-current'));
    const el = document.querySelector(`#rd-passage .rd-word[data-wi="${wi}"]`);
    if (el) {
      el.classList.add('rd-current');
      const area = document.getElementById('rd-passage-area');
      if (area) {
        const aTop = area.getBoundingClientRect().top;
        const aBtm = area.getBoundingClientRect().bottom;
        const eTop = el.getBoundingClientRect().top;
        const eBtm = el.getBoundingClientRect().bottom;
        if (eTop < aTop + 20 || eBtm > aBtm - 20) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    updateRDWordCard(wi < rdWords.length ? rdWords[wi].text : null);
    updateRDInfo();
  }

  function updateRDWordCard(word) {
    const wordEl    = document.getElementById('rd-word-display');
    const readingEl = document.getElementById('rd-word-reading');
    const baseEl    = document.getElementById('rd-word-base');
    const posEl     = document.getElementById('rd-word-pos');
    const jaEl      = document.getElementById('rd-word-ja');
    if (!word) {
      if (wordEl)    wordEl.textContent    = '---';
      if (readingEl) readingEl.textContent = '';
      if (baseEl)    baseEl.textContent    = '';
      if (posEl)     posEl.textContent     = '';
      if (jaEl)      jaEl.textContent      = '';
      return;
    }
    const result = lookupRDWord(word);
    const info   = result ? result.entry : null;
    if (wordEl)    wordEl.textContent    = word;
    if (readingEl) readingEl.textContent = info?.r ? `/${info.r}/` : '';
    if (baseEl)    baseEl.textContent    = result?.baseWord ? `← ${result.baseWord} の${result.inflType}` : '';
    if (posEl)     posEl.textContent     = info ? (POS_LABELS[info.p] || '') : '';
    if (jaEl)      jaEl.textContent      = info?.j || '（辞書にない語）';
  }

  // Returns {entry, baseWord, inflType} or null
  function lookupRDWord(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return null;

    // 1. 完全一致
    let entry = WORD_MAP[w];
    if (entry) return { entry, baseWord: null, inflType: null };
    entry = FUNC_WORDS[w];
    if (entry) return { entry, baseWord: null, inflType: null };

    // 2. 不規則変化形
    const irreg = IRREGULAR_FORMS[w];
    if (irreg) {
      entry = WORD_MAP[irreg.b] || FUNC_WORDS[irreg.b];
      if (entry) return { entry, baseWord: irreg.b, inflType: irreg.t };
    }

    // 3. 規則変化（WORD_MAPのみ対象）
    const rules = [
      { re: /ies$/,  fn: s => s.replace(/ies$/, 'y'),   label: '複数形/三単現' },
      { re: /ves$/,  fn: s => s.replace(/ves$/, 'f'),   label: '複数形' },
      { re: /ves$/,  fn: s => s.replace(/ves$/, 'fe'),  label: '複数形' },
      { re: /([bcdfghjklmnpqrstvwxyz])\1ing$/, fn: s => s.replace(/([bcdfghjklmnpqrstvwxyz])\1ing$/, '$1'), label: '現在分詞/動名詞' },
      { re: /ying$/, fn: s => s.replace(/ying$/, 'ie'), label: '現在分詞/動名詞' },
      { re: /ing$/,  fn: s => s.replace(/ing$/, ''),    label: '現在分詞/動名詞' },
      { re: /ing$/,  fn: s => s.replace(/ing$/, 'e'),   label: '現在分詞/動名詞' },
      { re: /ied$/,  fn: s => s.replace(/ied$/, 'y'),   label: '過去形/過去分詞' },
      { re: /([bcdfghjklmnpqrstvwxyz])\1ed$/, fn: s => s.replace(/([bcdfghjklmnpqrstvwxyz])\1ed$/, '$1'), label: '過去形/過去分詞' },
      { re: /ed$/,   fn: s => s.replace(/ed$/, ''),     label: '過去形/過去分詞' },
      { re: /ed$/,   fn: s => s.replace(/ed$/, 'e'),    label: '過去形/過去分詞' },
      { re: /ier$/,  fn: s => s.replace(/ier$/, 'y'),   label: '比較級' },
      { re: /iest$/, fn: s => s.replace(/iest$/, 'y'),  label: '最上級' },
      { re: /([bcdfghjklmnpqrstvwxyz])\1er$/,  fn: s => s.replace(/([bcdfghjklmnpqrstvwxyz])\1er$/, '$1'),  label: '比較級' },
      { re: /([bcdfghjklmnpqrstvwxyz])\1est$/, fn: s => s.replace(/([bcdfghjklmnpqrstvwxyz])\1est$/, '$1'), label: '最上級' },
      { re: /er$/,   fn: s => s.replace(/er$/, ''),     label: '比較級' },
      { re: /er$/,   fn: s => s.replace(/er$/, 'e'),    label: '比較級' },
      { re: /est$/,  fn: s => s.replace(/est$/, ''),    label: '最上級' },
      { re: /est$/,  fn: s => s.replace(/est$/, 'e'),   label: '最上級' },
      { re: /ily$/,  fn: s => s.replace(/ily$/, 'y'),   label: '副詞形' },
      { re: /ly$/,   fn: s => s.replace(/ly$/, ''),     label: '副詞形' },
      { re: /es$/,   fn: s => s.replace(/es$/, ''),     label: '複数形/三単現' },
      { re: /s$/,    fn: s => s.replace(/s$/, ''),      label: '複数形/三単現' },
    ];

    for (const { re, fn, label } of rules) {
      if (!re.test(w)) continue;
      const base = fn(w);
      if (!base || base === w || base.length < 2) continue;
      entry = WORD_MAP[base];
      if (entry) return { entry, baseWord: base, inflType: label };
    }

    return null;
  }

  function updateRDTitle() {
    const titleEl = document.getElementById('rd-passage-title');
    if (titleEl) titleEl.textContent = `${HS_GRADE_LABELS[rdGrade]} ${HS_SUB_LABELS[rdSub]}｜${rdPassage?.title || ''}`;
    const navEl = document.getElementById('rd-passage-nav');
    if (navEl) navEl.textContent = rdPassages.length > 1 ? `${rdPassageIdx + 1}/${rdPassages.length}` : '';
  }

  function updateRDInfo() {
    const el = document.getElementById('rd-info');
    if (el) el.textContent = `${rdWordIdx + 1} / ${rdWords.length} 語`;
  }

  function updateRDPlayBtn() {
    const btn = document.getElementById('rd-play-btn');
    if (btn) btn.textContent = rdPlaying ? '⏸ 停止' : '▶ 再生';
    if (btn) btn.classList.toggle('rd-playing', rdPlaying);
  }

  function updateRDPassBtns() {
    const prev = document.getElementById('rd-prev-pass-btn');
    const next = document.getElementById('rd-next-pass-btn');
    if (prev) prev.disabled = rdPassageIdx === 0;
    if (next) next.disabled = rdPassageIdx >= rdPassages.length - 1;
  }

  function updateRDSpeedDisplay() {
    const el = document.getElementById('rd-speed-val');
    if (el) el.textContent = rdSpeed.toFixed(1) + 'x';
  }

  function rdTogglePlay() {
    if (rdPlaying) {
      rdPlaying = false;
      clearRDTimer();
      speechSynthesis.cancel();
      updateRDPlayBtn();
    } else {
      rdPlaying = true;
      updateRDPlayBtn();
      rdAdvance();
    }
  }

  function rdAdvance() {
    if (!rdPlaying || rdWordIdx >= rdWords.length) {
      rdPlaying = false;
      updateRDPlayBtn();
      return;
    }
    highlightRDWord(rdWordIdx);
    const word = rdWords[rdWordIdx].text;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = rdSpeed;
    const next = () => {
      if (!rdPlaying) return;
      rdTimer = setTimeout(() => { rdWordIdx++; rdAdvance(); }, rdPause);
    };
    utt.onend = next;
    utt.onerror = next;
    speechSynthesis.speak(utt);
  }

  function clearRDTimer() {
    if (rdTimer) { clearTimeout(rdTimer); rdTimer = null; }
  }

  // 🎤 発音チェックを始める前に、長文などの再生・一括再生を止める（v533）
  function stopAudio() {
    rdCleanup(); jhCleanup(); sfcRDCleanup();
    updateRDPlayBtn(); updateRDBulkBtn(); updateJHPlayBtn(); updateJHBulkBtn(); updateSFCPlayBtn(); updateSFCBulkBtn();
  }

  function rdCleanup() {
    rdPlaying = false;
    rdBulkPlaying = false;
    clearRDTimer();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  function rdPrevWord() {
    rdCleanup();
    if (rdWordIdx > 0) rdWordIdx--;
    highlightRDWord(rdWordIdx);
    updateRDPlayBtn();
  }

  function rdNextWord() {
    rdCleanup();
    if (rdWordIdx < rdWords.length - 1) rdWordIdx++;
    highlightRDWord(rdWordIdx);
    updateRDPlayBtn();
  }

  function rdPrevPassage() {
    if (rdPassageIdx > 0) { rdPassageIdx--; loadRDPassage(); updateRDPassBtns(); }
  }

  function rdNextPassage() {
    if (rdPassageIdx < rdPassages.length - 1) { rdPassageIdx++; loadRDPassage(); updateRDPassBtns(); }
  }

  function rdSpeedDown() {
    if (rdSpeedIdx > 0) {
      rdSpeedIdx--;
      rdSpeed = RD_SPEEDS[rdSpeedIdx];
      localStorage.setItem(RD_SPEED_KEY, rdSpeedIdx);
      updateRDSpeedDisplay();
    }
  }

  function rdSpeedUp() {
    if (rdSpeedIdx < RD_SPEEDS.length - 1) {
      rdSpeedIdx++;
      rdSpeed = RD_SPEEDS[rdSpeedIdx];
      localStorage.setItem(RD_SPEED_KEY, rdSpeedIdx);
      updateRDSpeedDisplay();
    }
  }

  function updateRDPauseDisplay() {
    const el = document.getElementById('rd-pause-val');
    if (el) el.textContent = rdPause < 1000 ? rdPause + 'ms' : (rdPause / 1000).toFixed(1) + 's';
  }

  function rdPauseDown() {
    if (rdPauseIdx > 0) {
      rdPauseIdx--;
      rdPause = RD_PAUSES[rdPauseIdx];
      localStorage.setItem(RD_PAUSE_KEY, rdPauseIdx);
      updateRDPauseDisplay();
    }
  }

  function rdPauseUp() {
    if (rdPauseIdx < RD_PAUSES.length - 1) {
      rdPauseIdx++;
      rdPause = RD_PAUSES[rdPauseIdx];
      localStorage.setItem(RD_PAUSE_KEY, rdPauseIdx);
      updateRDPauseDisplay();
    }
  }

  function renderRDJaPassage() {
    const el = document.getElementById('rd-passage-ja');
    if (!el) return;
    el.textContent = rdPassage?.ja || '';
    el.style.display = rdShowJa ? 'block' : 'none';
  }

  function rdToggleJa() {
    rdShowJa = !rdShowJa;
    const el = document.getElementById('rd-passage-ja');
    if (el) el.style.display = rdShowJa ? 'block' : 'none';
    const btn = document.getElementById('rd-ja-btn');
    if (btn) { btn.textContent = rdShowJa ? '訳を隠す' : '訳を表示'; btn.classList.toggle('rd-ja-on', rdShowJa); }
  }

  function rdBulkPlay() {
    if (rdBulkPlaying) {
      rdBulkPlaying = false;
      speechSynthesis.cancel();
      updateRDBulkBtn();
      return;
    }
    if (rdPlaying) {
      rdPlaying = false;
      clearRDTimer();
      speechSynthesis.cancel();
      updateRDPlayBtn();
    }
    if (!rdPassage) return;
    rdBulkPlaying = true;
    updateRDBulkBtn();
    const utt = new SpeechSynthesisUtterance(rdPassage.text);
    utt.lang = 'en-US';
    utt.rate = rdSpeed;
    const done = () => { rdBulkPlaying = false; updateRDBulkBtn(); };
    utt.onend = done;
    utt.onerror = done;
    speechSynthesis.speak(utt);
  }

  function updateRDBulkBtn() {
    const btn = document.getElementById('rd-bulk-btn');
    if (!btn) return;
    btn.textContent = rdBulkPlaying ? '⏹ 停止' : '⏩ 一括再生';
    btn.classList.toggle('rd-playing', rdBulkPlaying);
  }

  function rdGoBack() {
    rdCleanup();
    startRDMode();
  }

  // ── 日本史リスニングモード ──
  const JH_SPEED_KEY = 'jh_speed_idx';
  const JH_PAUSE_KEY = 'jh_pause_idx';
  let jhPassages = [], jhPassageIdx = 0, jhPassage = null;
  let jhTokens = [], jhWords = [], jhWordIdx = 0;
  let jhPlaying = false, jhBulkPlaying = false, jhTimer = null;
  let jhShowJa = false;
  let jhSpeedIdx = parseInt(localStorage.getItem(JH_SPEED_KEY) || '3', 10);
  let jhSpeed = RD_SPEEDS[jhSpeedIdx] || 1.0;
  let jhPauseIdx = parseInt(localStorage.getItem(JH_PAUSE_KEY) || '3', 10);
  let jhPause = RD_PAUSES[jhPauseIdx] ?? 300;
  let jhCurrentEra = 0;

  function startJHMode() {
    jhCleanup();
    showScreen('jh-menu');
    renderJHEraGrid();
  }

  function renderJHEraGrid() {
    const container = document.getElementById('jh-era-grid');
    if (!container) return;
    container.innerHTML = JH_ERA_LABELS.map((label, era) => {
      const count = JH_PASSAGES.filter(p => p.era === era).length;
      return `<button class="jh-era-btn" onclick="App.startJHEra(${era})">
        <div class="jh-era-num">第${era + 1}章</div>
        <div class="jh-era-name">${label}</div>
        <div class="jh-era-period">${JH_ERA_PERIODS[era]}</div>
        <div class="jh-era-count">${count}本</div>
      </button>`;
    }).join('');
  }

  function startJHEra(era) {
    jhCurrentEra = era;
    jhPassages = JH_PASSAGES.filter(p => p.era === era);
    jhPassageIdx = 0;
    showScreen('jh');
    loadJHPassage();
  }

  function loadJHPassage() {
    jhCleanup();
    jhPassage = jhPassages[jhPassageIdx] || null;
    if (!jhPassage) return;
    jhWordIdx = 0;
    jhTokens = tokenizeRD(jhPassage.text);
    jhWords = jhTokens.map((t, i) => t.isWord ? { text: t.text, tokenIdx: i } : null).filter(Boolean);
    renderJHPassage();
    renderJHJaPassage();
    updateJHTitle();
    updateJHInfo();
    highlightJHWord(0);
    updateJHPlayBtn();
    updateJHBulkBtn();
    updateJHSpeedDisplay();
    updateJHPauseDisplay();
    updateJHPassBtns();
  }

  function renderJHPassage() {
    const area = document.getElementById('jh-passage');
    if (!area) return;
    area.innerHTML = jhTokens.map(t => {
      if (t.isWord) {
        return `<span class="rd-word" data-wi="${t.wordIdx}" onclick="App.jhClickWord(${t.wordIdx})">${t.text}</span>`;
      }
      return `<span class="rd-space">${t.text.replace(/\n/g, '<br>')}</span>`;
    }).join('');
  }

  function jhClickWord(wi) {
    if (jhBulkPlaying) {
      updateJHWordCard(wi < jhWords.length ? jhWords[wi].text : null);
      return;
    }
    jhCleanup();
    jhPlaying = false;
    jhWordIdx = wi;
    highlightJHWord(wi);
    updateJHPlayBtn();
  }

  function highlightJHWord(wi) {
    document.querySelectorAll('#jh-passage .rd-current').forEach(el => el.classList.remove('rd-current'));
    const el = document.querySelector(`#jh-passage .rd-word[data-wi="${wi}"]`);
    if (el) {
      el.classList.add('rd-current');
      const area = document.getElementById('jh-passage-area');
      if (area) {
        const aTop = area.getBoundingClientRect().top;
        const aBtm = area.getBoundingClientRect().bottom;
        const eTop = el.getBoundingClientRect().top;
        const eBtm = el.getBoundingClientRect().bottom;
        if (eTop < aTop + 20 || eBtm > aBtm - 20) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    updateJHWordCard(wi < jhWords.length ? jhWords[wi].text : null);
    updateJHInfo();
  }

  function updateJHWordCard(word) {
    const wordEl    = document.getElementById('jh-word-display');
    const readingEl = document.getElementById('jh-word-reading');
    const baseEl    = document.getElementById('jh-word-base');
    const posEl     = document.getElementById('jh-word-pos');
    const jaEl      = document.getElementById('jh-word-ja');
    if (!word) {
      if (wordEl)    wordEl.textContent    = '---';
      if (readingEl) readingEl.textContent = '';
      if (baseEl)    baseEl.textContent    = '';
      if (posEl)     posEl.textContent     = '';
      if (jaEl)      jaEl.textContent      = '';
      return;
    }
    const result = lookupRDWord(word);
    const info   = result ? result.entry : null;
    if (wordEl)    wordEl.textContent    = word;
    if (readingEl) readingEl.textContent = info?.r ? `/${info.r}/` : '';
    if (baseEl)    baseEl.textContent    = result?.baseWord ? `← ${result.baseWord} の${result.inflType}` : '';
    if (posEl)     posEl.textContent     = info ? (POS_LABELS[info.p] || '') : '';
    if (jaEl)      jaEl.textContent      = info?.j || '（辞書にない語）';
  }

  function updateJHTitle() {
    const titleEl = document.getElementById('jh-passage-title');
    if (titleEl) titleEl.textContent = `${JH_ERA_LABELS[jhCurrentEra]}｜${jhPassage?.title || ''}`;
    const navEl = document.getElementById('jh-passage-nav');
    if (navEl) navEl.textContent = jhPassages.length > 1 ? `${jhPassageIdx + 1}/${jhPassages.length}` : '';
  }

  function updateJHInfo() {
    const el = document.getElementById('jh-info');
    if (el) el.textContent = `${jhWordIdx + 1} / ${jhWords.length} 語`;
  }

  function updateJHPlayBtn() {
    const btn = document.getElementById('jh-play-btn');
    if (btn) btn.textContent = jhPlaying ? '⏸ 停止' : '▶ 再生';
    if (btn) btn.classList.toggle('rd-playing', jhPlaying);
  }

  function updateJHPassBtns() {
    const prev = document.getElementById('jh-prev-pass-btn');
    const next = document.getElementById('jh-next-pass-btn');
    if (prev) prev.disabled = jhPassageIdx === 0;
    if (next) next.disabled = jhPassageIdx >= jhPassages.length - 1;
  }

  function updateJHSpeedDisplay() {
    const el = document.getElementById('jh-speed-val');
    if (el) el.textContent = jhSpeed.toFixed(1) + 'x';
  }

  function updateJHPauseDisplay() {
    const el = document.getElementById('jh-pause-val');
    if (el) el.textContent = jhPause < 1000 ? jhPause + 'ms' : (jhPause / 1000).toFixed(1) + 's';
  }

  function jhTogglePlay() {
    if (jhPlaying) {
      jhPlaying = false;
      clearJHTimer();
      speechSynthesis.cancel();
      updateJHPlayBtn();
    } else {
      jhPlaying = true;
      updateJHPlayBtn();
      jhAdvance();
    }
  }

  function jhAdvance() {
    if (!jhPlaying || jhWordIdx >= jhWords.length) {
      jhPlaying = false;
      updateJHPlayBtn();
      return;
    }
    highlightJHWord(jhWordIdx);
    const word = jhWords[jhWordIdx].text;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = jhSpeed;
    const next = () => {
      if (!jhPlaying) return;
      jhTimer = setTimeout(() => { jhWordIdx++; jhAdvance(); }, jhPause);
    };
    utt.onend = next;
    utt.onerror = next;
    speechSynthesis.speak(utt);
  }

  function clearJHTimer() {
    if (jhTimer) { clearTimeout(jhTimer); jhTimer = null; }
  }

  function jhCleanup() {
    jhPlaying = false;
    jhBulkPlaying = false;
    clearJHTimer();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  function jhPrevWord() {
    jhCleanup();
    if (jhWordIdx > 0) jhWordIdx--;
    highlightJHWord(jhWordIdx);
    updateJHPlayBtn();
  }

  function jhNextWord() {
    jhCleanup();
    if (jhWordIdx < jhWords.length - 1) jhWordIdx++;
    highlightJHWord(jhWordIdx);
    updateJHPlayBtn();
  }

  function jhPrevPassage() {
    if (jhPassageIdx > 0) { jhPassageIdx--; loadJHPassage(); updateJHPassBtns(); }
  }

  function jhNextPassage() {
    if (jhPassageIdx < jhPassages.length - 1) { jhPassageIdx++; loadJHPassage(); updateJHPassBtns(); }
  }

  function jhSpeedDown() {
    if (jhSpeedIdx > 0) {
      jhSpeedIdx--;
      jhSpeed = RD_SPEEDS[jhSpeedIdx];
      localStorage.setItem(JH_SPEED_KEY, jhSpeedIdx);
      updateJHSpeedDisplay();
    }
  }

  function jhSpeedUp() {
    if (jhSpeedIdx < RD_SPEEDS.length - 1) {
      jhSpeedIdx++;
      jhSpeed = RD_SPEEDS[jhSpeedIdx];
      localStorage.setItem(JH_SPEED_KEY, jhSpeedIdx);
      updateJHSpeedDisplay();
    }
  }

  function jhPauseDown() {
    if (jhPauseIdx > 0) {
      jhPauseIdx--;
      jhPause = RD_PAUSES[jhPauseIdx];
      localStorage.setItem(JH_PAUSE_KEY, jhPauseIdx);
      updateJHPauseDisplay();
    }
  }

  function jhPauseUp() {
    if (jhPauseIdx < RD_PAUSES.length - 1) {
      jhPauseIdx++;
      jhPause = RD_PAUSES[jhPauseIdx];
      localStorage.setItem(JH_PAUSE_KEY, jhPauseIdx);
      updateJHPauseDisplay();
    }
  }

  function renderJHJaPassage() {
    const el = document.getElementById('jh-passage-ja');
    if (!el) return;
    el.textContent = jhPassage?.ja || '';
    el.style.display = jhShowJa ? 'block' : 'none';
  }

  function jhToggleJa() {
    jhShowJa = !jhShowJa;
    const el = document.getElementById('jh-passage-ja');
    if (el) el.style.display = jhShowJa ? 'block' : 'none';
    const btn = document.getElementById('jh-ja-btn');
    if (btn) { btn.textContent = jhShowJa ? '訳を隠す' : '訳を表示'; btn.classList.toggle('rd-ja-on', jhShowJa); }
  }

  function jhBulkPlay() {
    if (jhBulkPlaying) {
      jhBulkPlaying = false;
      speechSynthesis.cancel();
      updateJHBulkBtn();
      return;
    }
    if (jhPlaying) {
      jhPlaying = false;
      clearJHTimer();
      speechSynthesis.cancel();
      updateJHPlayBtn();
    }
    if (!jhPassage) return;
    jhBulkPlaying = true;
    updateJHBulkBtn();
    const utt = new SpeechSynthesisUtterance(jhPassage.text);
    utt.lang = 'en-US';
    utt.rate = jhSpeed;
    const done = () => { jhBulkPlaying = false; updateJHBulkBtn(); };
    utt.onend = done;
    utt.onerror = done;
    speechSynthesis.speak(utt);
  }

  function updateJHBulkBtn() {
    const btn = document.getElementById('jh-bulk-btn');
    if (!btn) return;
    btn.textContent = jhBulkPlaying ? '⏹ 停止' : '⏩ 一括再生';
    btn.classList.toggle('rd-playing', jhBulkPlaying);
  }

  function jhGoBack() {
    jhCleanup();
    startJHMode();
  }

  // ── 覚えたチェック ──
  function toggleMastered() {
    const w = fcWords[fcIdx];
    const wasMastered = isMastered(w.id);
    const d = getWordData(w.id);
    if (wasMastered) {
      d.mastery = 3;
    } else {
      d.mastery = 4;
      if (!DATA.stats.recentMastered.includes(w.id)) {
        DATA.stats.recentMastered.unshift(w.id);
        if (DATA.stats.recentMastered.length > 20) DATA.stats.recentMastered.pop();
      }
    }
    d.lastSeen = Date.now();
    d.nextReview = Date.now() + SRS_INTERVALS[d.mastery] * 86400000;
    setWordData(w.id, d);

    // フィルター中に覚えた→即リストから除外
    if (fcUnmasteredFirst && !wasMastered) {
      fcWords.splice(fcIdx, 1);
      if (fcWords.length === 0) {
        if (fcHSMode) { goHSBack(); return; }
        goHome(); return;
      }
      if (fcIdx >= fcWords.length) fcIdx = fcWords.length - 1;
      loadFC();
      return;
    }
    updateMasteredBtn();
  }

  function updateMasteredBtn() {
    if (!fcWords[fcIdx]) return;
    const mastered = isMastered(fcWords[fcIdx].id);
    const btn = document.getElementById('fc-mastered-btn');
    if (btn) btn.classList.toggle('fc-mastered-on', mastered);
    const label = document.getElementById('fc-mastered-label');
    if (label) label.textContent = mastered ? '✅ 覚えた' : '☐ 覚えた';
  }

  function applyUnmasteredFirst(words) {
    const unmastered = words.filter(w => !isMastered(w.id));
    return unmastered.length ? unmastered : words;
  }

  function awSort(key) {
    const currentWord = fcWords[fcIdx];
    fcUnmasteredFirst = false;
    fcBaseWords = [];
    const ub = document.getElementById('aw-unmastered-btn');
    if (ub) ub.classList.remove('fc-unmastered-on');
    const sortEl = document.getElementById('aw-sort');
    if (sortEl) sortEl.value = key;
    fcWords = sortAllWordsList(awFilteredBase.length ? awFilteredBase : WORDS, key);
    if (key === 'random') {
      fcIdx = 0;
    } else {
      fcIdx = fcWords.findIndex(w => w.id === currentWord.id);
      if (fcIdx < 0) fcIdx = 0;
    }
    loadFC();
  }

  function awToggleUnmastered() {
    const currentId = fcWords[fcIdx].id;
    fcUnmasteredFirst = !fcUnmasteredFirst;
    const btn = document.getElementById('aw-unmastered-btn');
    if (btn) btn.classList.toggle('fc-unmastered-on', fcUnmasteredFirst);
    if (fcUnmasteredFirst) {
      fcBaseWords = [...fcWords];
      fcWords = applyUnmasteredFirst(fcBaseWords);
    } else {
      const base = awFilteredBase.length ? awFilteredBase : WORDS;
      fcWords = fcBaseWords.length ? [...fcBaseWords] : sortAllWordsList(base, document.getElementById('aw-sort').value || 'level');
      fcBaseWords = [];
    }
    fcIdx = fcWords.findIndex(w => w.id === currentId);
    if (fcIdx < 0) fcIdx = 0;
    loadFC();
  }

  function freqToggleUnmastered() {
    const currentId = fcWords[fcIdx].id;
    fcUnmasteredFirst = !fcUnmasteredFirst;
    const btn = document.getElementById('freq-unmastered-btn');
    if (btn) btn.classList.toggle('fc-unmastered-on', fcUnmasteredFirst);
    if (fcUnmasteredFirst) {
      fcBaseWords = [...fcWords];
      fcWords = applyUnmasteredFirst(fcBaseWords);
    } else {
      fcWords = fcBaseWords.length ? [...fcBaseWords] : fcWords;
      fcBaseWords = [];
    }
    fcIdx = fcWords.findIndex(w => w.id === currentId);
    if (fcIdx < 0) fcIdx = 0;
    loadFC();
  }

  function fcPrev() {
    if (fcIdx > 0) { fcIdx--; loadFC(); }
  }

  function fcNext() {
    if (fcIdx < fcWords.length - 1) { fcIdx++; loadFC(); }
  }

  function loadFC() {
    const w = fcWords[fcIdx];
    const d = document.getElementById('flashcard');
    d.style.transition = 'none';
    d.classList.remove('flipped');
    void d.offsetWidth;
    d.style.transition = '';
    fcFlipped = false;
    document.getElementById('fc-badge').textContent = LEVEL_LABELS[w.l] || '';
    document.getElementById('fc-pos-front').textContent = POS_LABELS[w.p] || '';
    document.getElementById('fc-pos-back').textContent  = POS_LABELS[w.p] || '';
    document.getElementById('fc-japanese').textContent = w.j;
    document.getElementById('fc-word').textContent    = w.w;
    document.getElementById('fc-reading').textContent = w.r ? '/'+w.r+'/' : '';
    document.getElementById('fc-example').textContent = w.ex ? `${w.ex}\n${w.exj||''}` : '';
    const exWrap = document.getElementById('fc-example-wrap');
    if (exWrap) exWrap.style.display = w.ex ? 'block' : 'none';
    document.getElementById('fc-idx').textContent   = fcIdx+1;
    document.getElementById('fc-total').textContent = fcWords.length;
    document.getElementById('rating-area').style.display = 'none';
    const againBtn = document.getElementById('fc-again-btn');
    if (againBtn) againBtn.style.display = 'none';
    if (fcAllWordsMode) {
      const prevBtn = document.querySelector('.aw-prev-btn');
      const nextBtn = document.querySelector('.aw-next-btn');
      if (prevBtn) prevBtn.disabled = (fcIdx === 0);
      if (nextBtn) nextBtn.disabled = (fcIdx === fcWords.length - 1);
      const filterInfoEl = document.getElementById('aw-filter-info');
      if (filterInfoEl) {
        const lvLabel = awFilterLevel ? `Lv.${awFilterLevel}` : '全レベル';
        const genreLabel = AW_GENRE_LABELS[awFilterGenre] || '';
        const parts = [lvLabel];
        if (genreLabel) parts.push(genreLabel);
        filterInfoEl.textContent = parts.join(' ｜ ');
      }
    }
    if (fcFreqMode) {
      const prevBtn = document.querySelector('.freq-prev-btn');
      const nextBtn = document.querySelector('.freq-next-btn');
      if (prevBtn) prevBtn.disabled = (fcIdx === 0);
      if (nextBtn) nextBtn.disabled = (fcIdx === fcWords.length - 1);
      const infoEl = document.getElementById('freq-fc-info');
      if (infoEl) {
        const lenLabel = fcFreqLen >= 0 ? `${fcFreqLen}文字` : `${fcWords[fcIdx].w.length}文字`;
        infoEl.textContent = `グループ${fcFreqGroupIdx + 1}｜${lenLabel}`;
      }
    }
    if (fcHSMode) {
      const prevBtn = document.querySelector('.hs-prev-btn');
      const nextBtn = document.querySelector('.hs-next-btn');
      if (prevBtn) prevBtn.disabled = (fcIdx === 0);
      if (nextBtn) nextBtn.disabled = (fcIdx === fcWords.length - 1);
      const infoEl = document.getElementById('hs-fc-info');
      if (infoEl) infoEl.textContent = `${HS_GRADE_LABELS[fcHSGrade]}｜${HS_SUB_LABELS[fcHSSub]}`;
    }
    updateMasteredBtn();
    const backHint = document.getElementById('fc-back-hint');
    if (backHint) {
      backHint.textContent = (fcAllWordsMode || fcFreqMode || fcHSMode)
        ? '← 日本語に戻る｜次へ →'
        : '← 日本語に戻る';
    }
  }

  function clickCard(event) {
    const card = document.getElementById('flashcard');
    const rect = card.getBoundingClientRect();
    const isRight = event.clientX >= rect.left + rect.width / 2;

    if (!fcFlipped) {
      if (isRight) flipCard();
      return;
    }
    // 裏面表示中
    if (isRight) {
      if (fcAllWordsMode || fcFreqMode || fcHSMode) fcNext();
    } else {
      flipBack();
    }
  }

  function flipCard() {
    if (fcFlipped) return;
    fcFlipped = true;
    document.getElementById('flashcard').classList.add('flipped');
    if (!fcAllWordsMode && !fcFreqMode && !fcHSMode) {
      document.getElementById('rating-area').style.display = 'block';
    }
    const againBtn = document.getElementById('fc-again-btn');
    if (againBtn) againBtn.style.display = '';
    speak(fcWords[fcIdx].w);
  }

  function flipBack() {
    const card = document.getElementById('flashcard');
    card.style.transition = 'none';
    card.classList.remove('flipped');
    void card.offsetWidth;
    card.style.transition = '';
    fcFlipped = false;
    document.getElementById('rating-area').style.display = 'none';
    const againBtn = document.getElementById('fc-again-btn');
    if (againBtn) againBtn.style.display = 'none';
  }

  function rate(r) {
    scheduleNext(fcWords[fcIdx].id, r);
    fcIdx++;
    if (fcIdx >= fcWords.length) {
      showModal('🎉','フラッシュカード完了！', `${fcWords.length}枚のカードを学習しました。`);
    } else { loadFC(); }
  }

  function speak(word) {
    const w = word || (fcWords[fcIdx] && fcWords[fcIdx].w);
    if (!w) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(w);
      u.lang = 'en-US'; u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }

  function speakExample() {
    const ex = fcWords[fcIdx] && fcWords[fcIdx].ex;
    if (!ex) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(ex);
      u.lang = 'en-US'; u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  }

  // ── クイズ ──
  let qzWords=[], qzIdx=0, qzCorrect=0, qzDone=0, qzAnswered=false, qzAnswer=0;

  function startQuiz(words) {
    qzWords=words; qzIdx=0; qzCorrect=0; qzDone=0;
    showScreen('quiz');
    loadQuiz();
  }

  function loadQuiz() {
    if (qzIdx >= qzWords.length) {
      showModal('🎯','クイズ完了！',`${qzWords.length}問中 ${qzCorrect}問正解\n正解率: ${Math.round(qzCorrect/qzWords.length*100)}%`);
      return;
    }
    qzAnswered = false;
    document.getElementById('quiz-correct').textContent = qzCorrect;
    document.getElementById('quiz-done').textContent    = qzDone;
    document.getElementById('quiz-fb').style.display   = 'none';

    const w = qzWords[qzIdx];
    // 英→日 or 日→英 交互
    const enToJa = qzIdx % 2 === 0;
    document.getElementById('quiz-type-label').textContent = enToJa ? '英語 → 日本語' : '日本語 → 英語';
    document.getElementById('quiz-q').textContent = enToJa ? w.w : w.j;

    // 選択肢: 正解1+ランダム3
    const others = shuffle(WORDS.filter(x=>x.id!==w.id)).slice(0,3);
    const opts = shuffle([w, ...others]);
    qzAnswer = opts.indexOf(w);

    for (let i=0;i<4;i++) {
      const btn = document.getElementById('qopt'+i);
      btn.textContent = enToJa ? opts[i].j : opts[i].w;
      btn.className = 'quiz-opt';
      btn.disabled = false;
    }
  }

  function pickOpt(i) {
    if (qzAnswered) return;
    qzAnswered = true;
    const correct = i === qzAnswer;
    qzDone++;
    if (correct) qzCorrect++;
    recordAnswer(qzWords[qzIdx].id, correct);

    for (let j=0;j<4;j++) {
      const btn=document.getElementById('qopt'+j);
      btn.disabled=true;
      if (j===qzAnswer) btn.classList.add('correct');
      else if (j===i && !correct) btn.classList.add('wrong');
    }
    const fb = document.getElementById('quiz-fb');
    const msg = document.getElementById('quiz-fb-msg');
    msg.className = 'fb-msg ' + (correct?'ok':'bad');
    const w = qzWords[qzIdx];
    msg.textContent = correct
      ? `✅ 正解！ ${w.w} = ${w.j}`
      : `❌ 不正解。正解: ${w.w} = ${w.j}`;
    fb.style.display = 'block';
  }

  function nextQuiz() { qzIdx++; loadQuiz(); }

  // ── タイピング ──
  let tpWords=[], tpIdx=0, tpCorrect=0, tpDone=0, tpAnswered=false;

  function startTyping(words) {
    tpWords=words; tpIdx=0; tpCorrect=0; tpDone=0;
    showScreen('typing');
    loadTyping();
  }

  function loadTyping() {
    if (tpIdx >= tpWords.length) {
      showModal('⌨️','スペル練習完了！',`${tpWords.length}問中 ${tpCorrect}問正解\n正解率: ${Math.round(tpCorrect/tpWords.length*100)}%`);
      return;
    }
    tpAnswered = false;
    document.getElementById('type-correct').textContent = tpCorrect;
    document.getElementById('type-done').textContent    = tpDone;
    document.getElementById('type-fb').style.display   = 'none';

    const w = tpWords[tpIdx];
    document.getElementById('typing-q').textContent = w.j;
    document.getElementById('typing-q-reading').textContent = w.r ? '/'+w.r+'/' : '';
    const inp = document.getElementById('type-input');
    inp.value = ''; inp.className = 'type-input'; inp.focus();
    document.getElementById('type-correct').textContent = tpCorrect;
    document.getElementById('type-done').textContent    = tpDone;
  }

  function checkType() {
    if (tpAnswered) { nextType(); return; }
    const inp = document.getElementById('type-input');
    const answer = inp.value.trim().toLowerCase();
    const w = tpWords[tpIdx];
    const correct = answer === w.w.toLowerCase();
    tpAnswered = true; tpDone++;
    if (correct) tpCorrect++;
    recordAnswer(w.id, correct);
    inp.className = 'type-input ' + (correct?'correct':'wrong');
    const fb  = document.getElementById('type-fb');
    const msg = document.getElementById('type-fb-msg');
    msg.className = 'fb-msg ' + (correct?'ok':'bad');
    msg.textContent = correct
      ? `✅ 正解！ "${w.w}"`
      : `❌ 不正解。正解: "${w.w}"（${w.j}）`;
    fb.style.display = 'block';
  }

  function skipType() {
    if (tpAnswered) return;
    const w = tpWords[tpIdx];
    // ヒント: 最初の文字を表示
    const inp = document.getElementById('type-input');
    if (inp.value === '') {
      inp.value = w.w[0];
      inp.focus();
    } else {
      // 全部表示してスキップ
      tpAnswered = true; tpDone++;
      recordAnswer(w.id, false);
      inp.value = w.w; inp.className = 'type-input wrong';
      const fb  = document.getElementById('type-fb');
      const msg = document.getElementById('type-fb-msg');
      msg.className = 'fb-msg bad';
      msg.textContent = `スキップ。正解: "${w.w}"（${w.j}）`;
      fb.style.display = 'block';
    }
  }

  function nextType() { tpIdx++; loadTyping(); }

  // ── リスニング ──
  let lsWords=[], lsIdx=0, lsCorrect=0, lsDone=0, lsAnswered=false, lsNeedsRetry=false;

  function startListen(words) {
    lsWords=words; lsIdx=0; lsCorrect=0; lsDone=0;
    showScreen('listen');
    loadListen();
  }

  function loadListen() {
    if (lsIdx >= lsWords.length) {
      showModal('🔊','リスニング完了！',`${lsWords.length}問中 ${lsCorrect}問正解\n正解率: ${Math.round(lsCorrect/lsWords.length*100)}%`);
      return;
    }
    lsAnswered = false;
    lsNeedsRetry = false;
    document.getElementById('listen-correct').textContent = lsCorrect;
    document.getElementById('listen-done').textContent    = lsDone;
    document.getElementById('listen-fb').style.display   = 'none';
    const nextBtn = document.getElementById('listen-next-btn');
    if (nextBtn) nextBtn.style.display = '';
    const inp = document.getElementById('listen-input');
    inp.value = ''; inp.className = 'type-input'; inp.readOnly = false; inp.focus();
    // 自動再生
    setTimeout(() => speak(lsWords[lsIdx].w), 400);
  }

  function playListen() { speak(lsWords[lsIdx].w); }

  function checkListen() {
    const inp = document.getElementById('listen-input');
    const w   = lsWords[lsIdx];

    // 再入力モード：正しいスペルを入力するまで次へ進めない
    if (lsNeedsRetry) {
      const answer = inp.value.trim().toLowerCase();
      if (answer === w.w.toLowerCase()) {
        lsNeedsRetry = false;
        inp.className = 'type-input correct';
        const msg = document.getElementById('listen-fb-msg');
        const nextBtn = document.getElementById('listen-next-btn');
        msg.className = 'fb-msg ok';
        msg.textContent = `✅ 正しく入力できました！ "${w.w}"（${w.j}）`;
        if (nextBtn) nextBtn.style.display = '';
      } else {
        inp.className = 'type-input wrong';
        inp.select();
      }
      return;
    }

    if (lsAnswered) { nextListen(); return; }

    const answer = inp.value.trim().toLowerCase();
    const correct = answer === w.w.toLowerCase();
    lsAnswered = true; lsDone++;
    if (correct) lsCorrect++;
    recordAnswer(w.id, correct);

    const fb  = document.getElementById('listen-fb');
    const msg = document.getElementById('listen-fb-msg');
    const nextBtn = document.getElementById('listen-next-btn');

    if (correct) {
      inp.className = 'type-input correct';
      msg.className = 'fb-msg ok';
      msg.textContent = `✅ 正解！ "${w.w}"（${w.j}）`;
      if (nextBtn) nextBtn.style.display = '';
      fb.style.display = 'block';
    } else {
      // 不正解 → 再入力モードへ
      lsNeedsRetry = true;
      inp.value = ''; inp.className = 'type-input'; inp.readOnly = false;
      msg.className = 'fb-msg bad';
      msg.innerHTML = `❌ 不正解。正解は <strong>${w.w}</strong>（${w.j}）<br><small>↑ を見ながら正しいスペルを入力して確認してください</small>`;
      if (nextBtn) nextBtn.style.display = 'none';
      fb.style.display = 'block';
      inp.focus();
    }
  }

  function skipListen() {
    const inp = document.getElementById('listen-input');
    const w   = lsWords[lsIdx];

    // 再入力モード中はcheckListenと同じ動作
    if (lsNeedsRetry) {
      const answer = inp.value.trim().toLowerCase();
      if (answer === w.w.toLowerCase()) {
        lsNeedsRetry = false;
        inp.className = 'type-input correct';
        const msg = document.getElementById('listen-fb-msg');
        const nextBtn = document.getElementById('listen-next-btn');
        msg.className = 'fb-msg ok';
        msg.textContent = `✅ 正しく入力できました！ "${w.w}"（${w.j}）`;
        if (nextBtn) nextBtn.style.display = '';
      } else {
        inp.className = 'type-input wrong';
        inp.select();
      }
      return;
    }

    if (lsAnswered) { nextListen(); return; }

    // スキップ → 不正解として記録して再入力モードへ
    lsAnswered = true; lsDone++;
    recordAnswer(w.id, false);
    lsNeedsRetry = true;
    inp.value = ''; inp.className = 'type-input'; inp.readOnly = false;

    const fb  = document.getElementById('listen-fb');
    const msg = document.getElementById('listen-fb-msg');
    const nextBtn = document.getElementById('listen-next-btn');
    msg.className = 'fb-msg bad';
    msg.innerHTML = `スキップ。正解は <strong>${w.w}</strong>（${w.j}）<br><small>↑ を見ながら正しいスペルを入力して確認してください</small>`;
    if (nextBtn) nextBtn.style.display = 'none';
    fb.style.display = 'block';
    inp.focus();
  }

  function nextListen() { lsIdx++; loadListen(); }

  // ── 単語一覧 ──
  let filteredWords = [...WORDS];

  function renderWordList() {
    filterWords();
  }

  function searchWords(q) {
    const lq = q.toLowerCase();
    const lv = parseInt(document.getElementById('lv-filter').value)||0;
    const ps = document.getElementById('ps-filter').value;
    const st = document.getElementById('status-filter').value;
    filteredWords = WORDS.filter(w => {
      if (lv && w.l !== lv) return false;
      if (ps && w.p !== ps) return false;
      if (st === 'mastered' && !isMastered(w.id)) return false;
      if (st === 'learning') { const d=getWordData(w.id); if(d.mastery===0||isMastered(w.id)) return false; }
      if (st === 'new' && getWordData(w.id).mastery > 0) return false;
      if (q && !w.w.toLowerCase().includes(lq) && !w.j.includes(q)) return false;
      return true;
    });
    renderWL();
  }

  function filterWords() {
    searchWords(document.getElementById('word-search').value);
  }

  function renderWL() {
    document.getElementById('words-count').textContent = `${filteredWords.length}語を表示中`;
    const list = document.getElementById('word-list');

    if (filteredWords.length === 0) {
      list.innerHTML = '<div class="wl-empty">該当する単語が見つかりません</div>';
      return;
    }

    const rows = filteredWords.map(w => {
      const d = getWordData(w.id);
      const correct = d.correct || 0;
      const wrong   = d.wrong   || 0;
      const total   = correct + wrong;
      let statusIcon, statusClass;
      if (total === 0) {
        statusIcon = '—'; statusClass = 'st-new';
      } else if (isMastered(w.id)) {
        statusIcon = '✅'; statusClass = 'st-mastered';
      } else if (correct > 0 && wrong === 0) {
        statusIcon = '⭕'; statusClass = 'st-ok';
      } else if (correct > wrong) {
        statusIcon = '△'; statusClass = 'st-partial';
      } else {
        statusIcon = '❌'; statusClass = 'st-wrong';
      }
      const accuracy = total > 0 ? Math.round(correct/total*100) : null;
      const accStr   = accuracy !== null ? `${correct}/${total}` : '-';

      return `<tr class="wl-row ${statusClass}">
        <td class="wl-status"><span class="status-icon">${statusIcon}</span></td>
        <td class="wl-en">
          <span class="wl-word">${w.w}</span>
          <span class="wl-reading">${w.r ? '/'+w.r+'/' : ''}</span>
        </td>
        <td class="wl-ja">${w.j}</td>
        <td class="wl-pos"><span class="pos-badge">${POS_LABELS[w.p]||w.p}</span></td>
        <td class="wl-lv">${LEVEL_LABELS[w.l]||''}</td>
        <td class="wl-acc">${accStr}</td>
        <td class="wl-snd"><button onclick="App.speak('${w.w}')">🔊</button></td>
      </tr>`;
    }).join('');

    list.innerHTML = `
      <table class="word-table">
        <thead>
          <tr>
            <th class="th-status">状態</th>
            <th class="th-en">英単語</th>
            <th class="th-ja">意味</th>
            <th class="th-pos">品詞</th>
            <th class="th-lv">Lv</th>
            <th class="th-acc">正解</th>
            <th class="th-snd"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── 統計 ──
  function renderStats() {
    document.getElementById('st-mastered').textContent = masteredCount();
    document.getElementById('st-streak').textContent   = DATA.stats.streak;
    document.getElementById('st-accuracy').textContent = accuracyStr();
    document.getElementById('st-sessions').textContent = DATA.stats.sessions;

    // レベル別
    const bars = document.getElementById('lv-bars');
    bars.innerHTML = '';
    [1,2,3,4,5].forEach(lv => {
      const total   = WORDS.filter(w=>w.l===lv).length;
      const mastered = WORDS.filter(w=>w.l===lv && isMastered(w.id)).length;
      const pct = total ? Math.round(mastered/total*100) : 0;
      bars.innerHTML += `
        <div class="lv-bar-row">
          <div class="lv-bar-label"><span>レベル${lv}</span><span>${mastered}/${total} (${pct}%)</span></div>
          <div class="lv-bar-track"><div class="lv-bar-fill lv${lv}-fill" style="width:${pct}%"></div></div>
        </div>`;
    });

    // 最近覚えた
    const rl = document.getElementById('recent-list');
    rl.innerHTML = '';
    const ids = DATA.stats.recentMastered.slice(0,10);
    if (ids.length === 0) { rl.innerHTML = '<div style="color:#94a3b8;font-size:14px">まだ習得した単語はありません</div>'; }
    else ids.forEach(id => {
      const w = WORDS.find(x=>x.id===id);
      if (w) rl.innerHTML += `<div class="recent-word"><strong>${w.w}</strong> — ${w.j}</div>`;
    });
    // 表示モードボタンの選択状態を同期
    const currentMode = localStorage.getItem(LAYOUT_MODE_KEY) || '';
    document.querySelectorAll('.lm-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lm === currentMode);
    });
  }

  // ── モーダル ──
  function showModal(emoji, title, body) {
    document.getElementById('modal-emoji').textContent = emoji;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent  = body;
    document.getElementById('session-modal').style.display = 'flex';
  }
  function closeModal() {
    document.getElementById('session-modal').style.display = 'none';
    goHome();
  }

  // ── リセット ──
  function resetAll() {
    if (!confirm('すべての進捗をリセットしますか？この操作は元に戻せません。')) return;
    DATA = {words:{}, stats:{streak:0,lastDate:null,sessions:0,recentMastered:[]}};
    saveData(DATA);
    renderHome();
    renderStats();
    alert('リセットしました。');
  }

  // ── 文章ワードフラッシュ / 名作ストーリー（リスニング形式） ──
  let sfcSentences = [], sfcPassageIdx = 0, sfcModeLabel = '', sfcSourceMode = 'sfc';
  let sfcTokens = [], sfcWordsRD = [], sfcWordIdx = 0;
  let sfcPlaying = false, sfcBulkPlaying = false, sfcTimer = null;
  let sfcShowJa = false;
  const SFC_RD_SPEED_KEY = 'sfc_rd_speed_idx';
  const SFC_RD_PAUSE_KEY = 'sfc_rd_pause_idx';
  let sfcSpeedIdx = parseInt(localStorage.getItem(SFC_RD_SPEED_KEY) || '3', 10);
  let sfcSpeed = RD_SPEEDS[sfcSpeedIdx] || 1.0;
  let sfcPauseIdx = parseInt(localStorage.getItem(SFC_RD_PAUSE_KEY) || '3', 10);
  let sfcPause = RD_PAUSES[sfcPauseIdx] ?? 300;

  function sfcAutoStop() { sfcRDCleanup(); }

  function sfcRDCleanup() {
    sfcPlaying = false;
    sfcBulkPlaying = false;
    if (sfcTimer) { clearTimeout(sfcTimer); sfcTimer = null; }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  function loadSFCPassage() {
    sfcRDCleanup();
    const passage = sfcSentences[sfcPassageIdx] || null;
    if (!passage) return;
    sfcWordIdx = 0;
    sfcTokens = tokenizeRD(passage.en);
    sfcWordsRD = sfcTokens.map(t => t.isWord ? { text: t.text } : null).filter(Boolean);
    renderSFCRDPassage();
    renderSFCRDJa();
    updateSFCRDTitle();
    updateSFCRDInfo();
    highlightSFCWord(0);
    updateSFCPlayBtn();
    updateSFCBulkBtn();
    updateSFCSpeedDisplay();
    updateSFCPauseDisplay();
    updateSFCPassBtns();
  }

  function renderSFCRDPassage() {
    const area = document.getElementById('sfc-rd-passage');
    if (!area) return;
    area.innerHTML = sfcTokens.map(t => {
      if (t.isWord) {
        return `<span class="rd-word" data-wi="${t.wordIdx}" onclick="App.sfcClickWord(${t.wordIdx})">${t.text}</span>`;
      }
      return `<span class="rd-space">${t.text.replace(/\n/g, '<br>')}</span>`;
    }).join('');
  }

  function sfcClickWord(wi) {
    if (sfcBulkPlaying) {
      updateSFCWordCard(wi < sfcWordsRD.length ? sfcWordsRD[wi].text : null);
      return;
    }
    sfcRDCleanup();
    sfcPlaying = false;
    sfcWordIdx = wi;
    highlightSFCWord(wi);
    updateSFCPlayBtn();
  }

  function highlightSFCWord(wi) {
    document.querySelectorAll('#sfc-rd-passage .rd-current').forEach(el => el.classList.remove('rd-current'));
    const el = document.querySelector(`#sfc-rd-passage .rd-word[data-wi="${wi}"]`);
    if (el) {
      el.classList.add('rd-current');
      const area = document.getElementById('sfc-rd-passage-area');
      if (area) {
        const aTop = area.getBoundingClientRect().top;
        const aBtm = area.getBoundingClientRect().bottom;
        const eTop = el.getBoundingClientRect().top;
        const eBtm = el.getBoundingClientRect().bottom;
        if (eTop < aTop + 20 || eBtm > aBtm - 20) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    updateSFCWordCard(wi < sfcWordsRD.length ? sfcWordsRD[wi].text : null);
    updateSFCRDInfo();
  }

  function updateSFCWordCard(word) {
    const wordEl    = document.getElementById('sfc-rd-word');
    const readingEl = document.getElementById('sfc-rd-reading');
    const baseEl    = document.getElementById('sfc-rd-base');
    const posEl     = document.getElementById('sfc-rd-pos');
    const jaEl      = document.getElementById('sfc-rd-ja');
    if (!word) {
      if (wordEl)    wordEl.textContent    = '---';
      if (readingEl) readingEl.textContent = '';
      if (baseEl)    baseEl.textContent    = '';
      if (posEl)     posEl.textContent     = '';
      if (jaEl)      jaEl.textContent      = '';
      return;
    }
    const result = lookupRDWord(word);
    const info   = result ? result.entry : null;
    if (wordEl)    wordEl.textContent    = word;
    if (readingEl) readingEl.textContent = info?.r ? `/${info.r}/` : '';
    if (baseEl)    baseEl.textContent    = result?.baseWord ? `← ${result.baseWord} の${result.inflType}` : '';
    if (posEl)     posEl.textContent     = info ? (POS_LABELS[info.p] || '') : '';
    if (jaEl)      jaEl.textContent      = info?.j || '（辞書にない語）';
  }

  function updateSFCRDTitle() {
    const titleEl = document.getElementById('sfc-rd-title');
    if (titleEl) titleEl.textContent = sfcModeLabel;
    const navEl = document.getElementById('sfc-rd-nav');
    if (navEl) navEl.textContent = sfcSentences.length > 1 ? `${sfcPassageIdx + 1}/${sfcSentences.length}` : '';
  }

  function updateSFCRDInfo() {
    const el = document.getElementById('sfc-rd-info');
    if (el) el.textContent = `${sfcWordIdx + 1} / ${sfcWordsRD.length} 語`;
  }

  function updateSFCPlayBtn() {
    const btn = document.getElementById('sfc-rd-play-btn');
    if (btn) btn.textContent = sfcPlaying ? '⏸ 停止' : '▶ 再生';
    if (btn) btn.classList.toggle('rd-playing', sfcPlaying);
  }

  function updateSFCBulkBtn() {
    const btn = document.getElementById('sfc-rd-bulk-btn');
    if (!btn) return;
    btn.textContent = sfcBulkPlaying ? '⏹ 停止' : '⏩ 一括再生';
    btn.classList.toggle('rd-playing', sfcBulkPlaying);
  }

  function updateSFCPassBtns() {
    const prev = document.getElementById('sfc-rd-prev-btn');
    const next = document.getElementById('sfc-rd-next-btn');
    if (prev) prev.disabled = sfcPassageIdx === 0;
    if (next) next.disabled = sfcPassageIdx >= sfcSentences.length - 1;
  }

  function updateSFCSpeedDisplay() {
    const el = document.getElementById('sfc-rd-speed-val');
    if (el) el.textContent = sfcSpeed.toFixed(1) + 'x';
  }

  function updateSFCPauseDisplay() {
    const el = document.getElementById('sfc-rd-pause-val');
    if (el) el.textContent = sfcPause < 1000 ? sfcPause + 'ms' : (sfcPause / 1000).toFixed(1) + 's';
  }

  function sfcTogglePlay() {
    if (sfcPlaying) {
      sfcPlaying = false;
      if (sfcTimer) { clearTimeout(sfcTimer); sfcTimer = null; }
      speechSynthesis.cancel();
      updateSFCPlayBtn();
    } else {
      sfcPlaying = true;
      updateSFCPlayBtn();
      sfcRDAdvance();
    }
  }

  function sfcRDAdvance() {
    if (!sfcPlaying || sfcWordIdx >= sfcWordsRD.length) {
      sfcPlaying = false;
      updateSFCPlayBtn();
      return;
    }
    highlightSFCWord(sfcWordIdx);
    const word = sfcWordsRD[sfcWordIdx].text;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = sfcSpeed;
    const next = () => {
      if (!sfcPlaying) return;
      sfcTimer = setTimeout(() => { sfcWordIdx++; sfcRDAdvance(); }, sfcPause);
    };
    utt.onend = next;
    utt.onerror = next;
    speechSynthesis.speak(utt);
  }

  function sfcPrevWord() {
    sfcRDCleanup();
    if (sfcWordIdx > 0) sfcWordIdx--;
    highlightSFCWord(sfcWordIdx);
    updateSFCPlayBtn();
  }

  function sfcNextWord() {
    sfcRDCleanup();
    if (sfcWordIdx < sfcWordsRD.length - 1) sfcWordIdx++;
    highlightSFCWord(sfcWordIdx);
    updateSFCPlayBtn();
  }

  function sfcPrevPassage() {
    if (sfcPassageIdx > 0) { sfcPassageIdx--; loadSFCPassage(); updateSFCPassBtns(); }
  }

  function sfcNextPassage() {
    if (sfcPassageIdx < sfcSentences.length - 1) { sfcPassageIdx++; loadSFCPassage(); updateSFCPassBtns(); }
  }

  function sfcBulkPlay() {
    if (sfcBulkPlaying) {
      sfcBulkPlaying = false;
      speechSynthesis.cancel();
      updateSFCBulkBtn();
      return;
    }
    if (sfcPlaying) {
      sfcPlaying = false;
      if (sfcTimer) { clearTimeout(sfcTimer); sfcTimer = null; }
      speechSynthesis.cancel();
      updateSFCPlayBtn();
    }
    const passage = sfcSentences[sfcPassageIdx];
    if (!passage) return;
    sfcBulkPlaying = true;
    updateSFCBulkBtn();
    const utt = new SpeechSynthesisUtterance(passage.en);
    utt.lang = 'en-US';
    utt.rate = sfcSpeed;
    const done = () => { sfcBulkPlaying = false; updateSFCBulkBtn(); };
    utt.onend = done;
    utt.onerror = done;
    speechSynthesis.speak(utt);
  }

  function sfcSpeedDown() {
    if (sfcSpeedIdx > 0) {
      sfcSpeedIdx--;
      sfcSpeed = RD_SPEEDS[sfcSpeedIdx];
      localStorage.setItem(SFC_RD_SPEED_KEY, sfcSpeedIdx);
      updateSFCSpeedDisplay();
    }
  }

  function sfcSpeedUp() {
    if (sfcSpeedIdx < RD_SPEEDS.length - 1) {
      sfcSpeedIdx++;
      sfcSpeed = RD_SPEEDS[sfcSpeedIdx];
      localStorage.setItem(SFC_RD_SPEED_KEY, sfcSpeedIdx);
      updateSFCSpeedDisplay();
    }
  }

  function sfcPauseDown() {
    if (sfcPauseIdx > 0) {
      sfcPauseIdx--;
      sfcPause = RD_PAUSES[sfcPauseIdx];
      localStorage.setItem(SFC_RD_PAUSE_KEY, sfcPauseIdx);
      updateSFCPauseDisplay();
    }
  }

  function sfcPauseUp() {
    if (sfcPauseIdx < RD_PAUSES.length - 1) {
      sfcPauseIdx++;
      sfcPause = RD_PAUSES[sfcPauseIdx];
      localStorage.setItem(SFC_RD_PAUSE_KEY, sfcPauseIdx);
      updateSFCPauseDisplay();
    }
  }

  function renderSFCRDJa() {
    const el = document.getElementById('sfc-rd-passage-ja');
    if (!el) return;
    const passage = sfcSentences[sfcPassageIdx];
    el.textContent = passage?.ja || '';
    el.style.display = sfcShowJa ? 'block' : 'none';
  }

  function sfcToggleJa() {
    sfcShowJa = !sfcShowJa;
    const el = document.getElementById('sfc-rd-passage-ja');
    if (el) el.style.display = sfcShowJa ? 'block' : 'none';
    const btn = document.getElementById('sfc-rd-ja-btn');
    if (btn) { btn.textContent = sfcShowJa ? '訳を隠す' : '訳を表示'; btn.classList.toggle('rd-ja-on', sfcShowJa); }
  }

  function sfcGoBack() {
    sfcRDCleanup();
    if (sfcSourceMode === 'story') startStory();
    else startSFC();
  }

  // ── 名作ストーリーモード ──
  function startStory() {
    const listEl = document.getElementById('story-list');
    if (listEl) {
      listEl.innerHTML = STORIES.map(s =>
        `<button class="story-btn" onclick="App.startStoryWith('${s.key}')">
          <span class="story-icon">${s.icon}</span>
          <span class="story-info">
            <span class="story-title">${s.title}</span>
            <span class="story-author">${s.author}</span>
            <span class="story-count">${s.sentences.length}文</span>
          </span>
        </button>`
      ).join('');
    }
    document.getElementById('story-modal').style.display = 'flex';
  }

  function closeStoryModal() {
    document.getElementById('story-modal').style.display = 'none';
  }

  function startStoryWith(key) {
    closeStoryModal();
    const story = STORIES.find(s => s.key === key);
    if (!story) return;
    sfcRDCleanup();
    sfcSentences = story.sentences.slice();
    sfcPassageIdx = 0;
    sfcModeLabel = story.icon + ' ' + story.title;
    sfcSourceMode = 'story';
    sfcShowJa = false;
    showScreen('sentence-fc');
    loadSFCPassage();
  }

  // ── 日常チャンクモード ──
  let chantPhrases = [];
  let chantIdx = 0;
  let chantRevealed = false;

  function startChant() {
    const grid = document.getElementById('chant-cat-grid');
    if (grid) {
      const total = CHANT_DATA.reduce((n, cat) => n + cat.phrases.length, 0);
      grid.innerHTML = CHANT_DATA.map(cat =>
        `<button class="chant-cat-btn" onclick="App.startChantWith('${cat.key}')">
          <span class="chant-cat-icon">${cat.icon}</span>
          <span class="chant-cat-name">${cat.label}</span>
          <span class="chant-cat-count">${cat.phrases.length}フレーズ</span>
        </button>`
      ).join('') +
        `<button class="chant-cat-btn" onclick="App.startChantWith('random')">
          <span class="chant-cat-icon">🔀</span>
          <span class="chant-cat-name">ランダム</span>
          <span class="chant-cat-count">全${total}フレーズ</span>
        </button>`;
    }
    document.getElementById('chant-modal').style.display = 'flex';
  }

  function closeChantModal() {
    document.getElementById('chant-modal').style.display = 'none';
  }

  function startChantWith(key) {
    closeChantModal();
    let icon, label, phrases;
    if (key === 'random') {
      phrases = CHANT_DATA.flatMap(c => c.phrases);
      for (let i = phrases.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [phrases[i], phrases[j]] = [phrases[j], phrases[i]];
      }
      icon = '🔀'; label = 'ランダム';
    } else {
      const cat = CHANT_DATA.find(c => c.key === key);
      if (!cat) return;
      phrases = cat.phrases.slice();
      icon = cat.icon; label = cat.label;
    }
    chantPhrases = phrases;
    chantIdx = 0;
    chantRevealed = false;
    document.getElementById('chant-cat-label').textContent = icon + ' ' + label;
    showScreen('chant');
    renderChant();
  }

  function renderChant() {
    const phrase = chantPhrases[chantIdx];
    document.getElementById('chant-ja').textContent = phrase.ja;
    document.getElementById('chant-en').textContent = phrase.en;
    document.getElementById('chant-idx').textContent = chantIdx + 1;
    document.getElementById('chant-total').textContent = chantPhrases.length;
    chantSetRevealed(false);
  }

  function chantSetRevealed(revealed) {
    chantRevealed = revealed;
    const enEl   = document.getElementById('chant-en');
    const hintEl = document.getElementById('chant-hint');
    const revHintEl = document.getElementById('chant-reveal-hint');
    if (revealed) {
      enEl.style.opacity = '1';
      hintEl.style.display = 'none';
      revHintEl.textContent = 'カードをタップするたびに音声が流れます';
    } else {
      enEl.style.opacity = '0';
      hintEl.style.display = 'block';
      revHintEl.textContent = 'カードをタップすると英語が表示されます';
    }
  }

  function chantReveal() {
    if (!chantRevealed) chantSetRevealed(true);
    const phrase = chantPhrases[chantIdx];
    if (window.speechSynthesis) {
      const utt = new SpeechSynthesisUtterance(phrase.en);
      utt.lang = 'en-US'; utt.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    }
  }

  function chantNext() {
    chantIdx = (chantIdx < chantPhrases.length - 1) ? chantIdx + 1 : 0;
    renderChant();
  }

  function chantPrev() {
    chantIdx = (chantIdx > 0) ? chantIdx - 1 : chantPhrases.length - 1;
    renderChant();
  }

  function chantGoBack() {
    window.speechSynthesis && window.speechSynthesis.cancel();
    startChant();
  }

  function startSFC() {
    document.getElementById('sfc-scene-modal').style.display = 'flex';
  }

  function closeSFCSceneModal() {
    document.getElementById('sfc-scene-modal').style.display = 'none';
  }

  function startSFCWithScene(sceneKey) {
    sfcRDCleanup();
    closeSFCSceneModal();
    const pool = [];
    if (sceneKey === 'all') {
      WORDS.forEach(w => { if (w.ex) pool.push({en: w.ex, ja: w.exj || ''}); });
      Object.values(SFC_SCENES).forEach(sc => pool.push(...sc.sentences));
    } else if (SFC_SCENES[sceneKey]) {
      pool.push(...SFC_SCENES[sceneKey].sentences);
    }
    sfcSentences = shuffle(pool);
    sfcPassageIdx = 0;
    if (sceneKey === 'all') sfcModeLabel = '🌐 すべて';
    else if (SFC_SCENES[sceneKey]) sfcModeLabel = SFC_SCENES[sceneKey].icon + ' ' + SFC_SCENES[sceneKey].label;
    else sfcModeLabel = '';
    sfcSourceMode = 'sfc';
    sfcShowJa = false;
    showScreen('sentence-fc');
    loadSFCPassage();
  }

  // ── 表示モード ──
  const LAYOUT_MODE_KEY = 'layout_mode';
  const LAYOUT_MODE_IDS = ['lm-pc','lm-tablet','lm-lg','lm-std','lm-xs'];

  function applyLayoutMode(id) {
    LAYOUT_MODE_IDS.forEach(m => document.documentElement.classList.remove(m));
    if (id) document.documentElement.classList.add(id);
    localStorage.setItem(LAYOUT_MODE_KEY, id || '');
    document.querySelectorAll('.lm-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lm === id);
    });
  }

  // 初期化
  function init() {
    const savedMode = localStorage.getItem(LAYOUT_MODE_KEY);
    if (savedMode) applyLayoutMode(savedMode);
    updateStreak();
    renderHome();
    history.replaceState({screen:'home'}, '');

    // Android ハードウェア戻るボタン対応
    window.addEventListener('popstate', function() {
      // 🎤 発音チェックの窓が開いていれば、まずそれを閉じる（v533）
      if (window.ES && ES.close()) { history.pushState({screen: currentScreen}, ''); return; }
      // モーダルが開いていれば閉じて再スタック
      const modalIds = ['aw-filter-modal','sfc-scene-modal','story-modal','chant-modal','talk-modal','session-modal'];
      for (const id of modalIds) {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none') {
          el.style.display = 'none';
          history.pushState({screen: currentScreen}, '');
          return;
        }
      }
      // 画面別の戻り先
      if (currentScreen === 'reading')  { rdGoBack();  return; }
      if (currentScreen === 'jh')       { jhGoBack();  return; }
      if (currentScreen === 'reading-select') { goHome(); return; }
      if (currentScreen === 'jh-menu')  { goHome();   return; }
      goHome();
    });

    document.addEventListener('keydown', function(e) {
      if (document.activeElement.tagName === 'INPUT') return;
      if (currentScreen === 'sentence-fc') {
        if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); sfcNextWord(); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); sfcPrevWord(); return; }
      }
      if (e.key === 'Enter' && currentScreen === 'quiz' && qzAnswered) nextQuiz();
    });
  }

  init();

  return { showScreen, goHome, startMode, startReview,
           clickCard, flipCard, flipBack, rate, speak, speakExample,
           pickOpt, nextQuiz,
           checkType, skipType, nextType,
           playListen, checkListen, skipListen, nextListen,
           searchWords, filterWords,
           startAllWords, openAWFilterModal, closeAWFilterModal,
           setAWFilterLevel, setAWFilterGenre, startAllWordsWithFilter,
           fcPrev, fcNext, awSort, awToggleUnmastered, freqToggleUnmastered,
           startFreqMode, startFreqGroup, showFreqGroups, showFreqLengths,
           startFreqGroupAll, startFreqGroupLen, goFreqBack,
           startHSMode, startHSLevel, goHSBack, hsToggleUnmastered,
           startRDMode, startRDLevel, rdGoBack, rdTogglePlay,
           rdPrevWord, rdNextWord, rdPrevPassage, rdNextPassage,
           rdSpeedDown, rdSpeedUp, rdPauseDown, rdPauseUp, rdClickWord,
           rdBulkPlay, rdToggleJa,
           startJHMode, startJHEra, jhGoBack, jhTogglePlay,
           jhPrevWord, jhNextWord, jhPrevPassage, jhNextPassage,
           jhSpeedDown, jhSpeedUp, jhPauseDown, jhPauseUp, jhClickWord,
           jhBulkPlay, jhToggleJa,
           toggleMastered, applyLayoutMode,
           startStory, closeStoryModal, startStoryWith,
           startChant, closeChantModal, startChantWith,
           chantReveal, chantNext, chantPrev, chantGoBack,
           startSFC, startSFCWithScene, closeSFCSceneModal,
           sfcGoBack, sfcClickWord, sfcTogglePlay, sfcPrevWord, sfcNextWord,
           sfcPrevPassage, sfcNextPassage, sfcBulkPlay, sfcToggleJa,
           sfcSpeedDown, sfcSpeedUp, sfcPauseDown, sfcPauseUp,
           closeModal, resetAll, stopAudio };
})();
