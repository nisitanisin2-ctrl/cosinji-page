/* ════════════════════════════════════════════════════════════════
   🎯 きょうの ミッション・🏅 メダル ずかん・👾 学年の ボス（v4）
   ここは きまり（データ）だけ。数えるのと 画面は app.js
   ・ミッションは 毎日 3つ（日づけから 決まる）。ev は 数える できごと、n は めあての 数
   ・メダルは f(c) が true に なったら もらえる（c は app.js の medalCtx）
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU;

S.MISSIONS = [
  {id: 'solve10', ev: 'solve', n: 10, t: '問題を 10問 とく'},
  {id: 'solve20', ev: 'solve', n: 20, t: '問題を 20問 とく'},
  {id: 'clean5', ev: 'clean', n: 5, t: 'ヒントなしで 5問 せいかい'},
  {id: 'combo5', ev: 'combo', n: 5, t: '5問 れんぞくで せいかい'},
  {id: 'stage1', ev: 'stage', n: 1, t: 'ステージを 1つ クリア（★1 いじょう）'},
  {id: 'voice3', ev: 'voice', n: 3, t: '🎤 声で 3問 答える', need: 'voice'},
  {id: 'ta1', ev: 'ta', n: 1, t: '⏱ タイムアタックに ちょうせん'},
  {id: 'guide3', ev: 'guide', n: 3, t: '🤝 ヒントの □ を 3つ うめる'},
  {id: 'card5', ev: 'card', n: 5, t: '🃏 カードで 5問 せいかい'},
  {id: 'rev3', ev: 'rev', n: 3, t: '📝 ふくしゅうを 3問', need: 'rev'},
  {id: 'new1', ev: 'newunit', n: 1, t: '✨ はじめての 単元を 1問 とく'},
  {id: 'mix1', ev: 'mix', n: 1, t: '🎲 ミックスを さいごまで'},
];
S.MISSION_XP = 20; S.MISSION_ALL_XP = 30;
/* その 日の ミッション 3つ（日づけで 決まる）。avail(id) が false の ものは えらばない */
S.pickMissions = (day, avail) => {
  let h = 2166136261; for(const ch of String(day)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rng = S.mkRng(h || 1), pool = S.MISSIONS.filter(m => !avail || avail(m));
  const solve = pool.filter(m => m.ev === 'solve'), rest = pool.filter(m => m.ev !== 'solve');
  const out = [solve[Math.floor(rng() * solve.length)]];
  while(out.length < 3 && rest.length){ const k = Math.floor(rng() * rest.length); out.push(rest.splice(k, 1)[0]); }
  return out.filter(Boolean).map(m => m.id);
};

S.MEDALS = [
  {id: 'ok1', ic: '🌱', t: 'はじめの 一歩', d: 'はじめて せいかい', f: c => c.ok >= 1},
  {id: 'ok10', ic: '🍀', t: '10問 クリア', d: '10問 せいかい', f: c => c.ok >= 10},
  {id: 'ok100', ic: '🌳', t: '100問 クリア', d: '100問 せいかい', f: c => c.ok >= 100},
  {id: 'ok500', ic: '🏔', t: '500問 クリア', d: '500問 せいかい', f: c => c.ok >= 500},
  {id: 'ok1000', ic: '🌋', t: '1000問 クリア', d: '1000問 せいかい', f: c => c.ok >= 1000},
  {id: 'star3', ic: '⭐', t: 'はじめての ★3', d: 'どれかの 単元で ★3', f: c => c.units3 >= 1},
  {id: 'star3x10', ic: '🌟', t: '★3 コレクター', d: '★3 の 単元が 10こ', f: c => c.units3 >= 10},
  {id: 'stars50', ic: '💫', t: '★ 50こ', d: '★ を あわせて 50こ', f: c => c.stars >= 50},
  {id: 'stars150', ic: '🌌', t: '★ 150こ', d: '★ を あわせて 150こ', f: c => c.stars >= 150},
  {id: 'day3', ic: '🔥', t: '3日 れんぞく', d: '3日 つづけて 学ぶ', f: c => c.best >= 3},
  {id: 'day7', ic: '📅', t: '1週間 れんぞく', d: '7日 つづけて 学ぶ', f: c => c.best >= 7},
  {id: 'day30', ic: '🗓', t: '30日 れんぞく', d: '30日 つづけて 学ぶ', f: c => c.best >= 30},
  {id: 'combo10', ic: '⚡', t: 'れんぞく 10', d: '10問 れんぞくで せいかい', f: c => c.combo >= 10},
  {id: 'combo25', ic: '🌩', t: 'れんぞく 25', d: '25問 れんぞくで せいかい', f: c => c.combo >= 25},
  {id: 'ta10', ic: '⏱', t: 'スピード 10', d: 'タイムアタックで 10問', f: c => c.ta >= 10},
  {id: 'ta20', ic: '🚀', t: 'スピード 20', d: 'タイムアタックで 20問', f: c => c.ta >= 20},
  {id: 'voice10', ic: '🎤', t: '声の 名人', d: '声で 10問 せいかい', f: c => c.voice >= 10},
  {id: 'voice100', ic: '🎙', t: '声の たつじん', d: '声で 100問 せいかい', f: c => c.voice >= 100},
  {id: 'guide10', ic: '🤝', t: 'いっしょに とく', d: 'ヒントの □ を 10こ うめる', f: c => c.guide >= 10},
  {id: 'card50', ic: '🃏', t: 'カード 名人', d: 'カードで 50問 せいかい', f: c => c.card >= 50},
  {id: 'rev10', ic: '📝', t: 'ふくしゅう 名人', d: 'ふくしゅうで 10問 おぼえる', f: c => c.mastered >= 10},
  {id: 'mis1', ic: '🎯', t: 'ミッション クリア', d: '1日の ミッションを ぜんぶ', f: c => c.msday >= 1},
  {id: 'mis7', ic: '🏹', t: 'ミッション マスター', d: 'ミッション ぜんぶを 7日', f: c => c.msday >= 7},
  {id: 'boss1', ic: '⚔️', t: 'ボス たいじ', d: 'はじめて ボスに かつ', f: c => c.bossWins >= 1},
  {id: 'boss3', ic: '🛡', t: '3学年の ボス', d: '3つの 学年の ボスに かつ', f: c => c.bossGrades >= 3},
  {id: 'boss9', ic: '👑', t: 'ボス ぜんぶ', d: '9つの 学年 ぜんぶの ボスに かつ', f: c => c.bossGrades >= 9},
  {id: 'lv5', ic: '🐦', t: 'Lv.5', d: 'レベル 5 に なる', f: c => c.lv >= 5},
  {id: 'lv12', ic: '🦉', t: 'Lv.12', d: 'レベル 12 に なる', f: c => c.lv >= 12},
  {id: 'hard10', ic: '💪', t: 'むずかしい に ちょうせん', d: '「むずかしい」で 10問 せいかい', f: c => c.hard >= 10},
  {id: 'early', ic: '🌅', t: 'あさの べんきょう', d: 'あさ 7時より 前に せいかい', f: c => c.early >= 1},
  {id: 'elem1', ic: '🎒', t: '小学校 ぜんぶ ★1', d: '小学校の 単元 ぜんぶで ★1', f: c => c.elemAll},
  {id: 'jhs1', ic: '🎓', t: '中学校 ぜんぶ ★1', d: '中学校の 単元 ぜんぶで ★1', f: c => c.jhsAll},
];

/* 学年の ボス（15問・ハート 3つ） */
S.BOSS_N = 15; S.BOSS_HEARTS = 3; S.BOSS_XP = 50;
S.BOSSES = [
  {ic: '👾', t: 'かぞえスライム'}, {ic: '🐙', t: 'くくダコ'}, {ic: '🦖', t: 'ワリザウルス'},
  {ic: '🤖', t: 'カクドロボ'}, {ic: '🐉', t: 'ブンスウドラゴン'}, {ic: '🧙', t: 'ヒノまほうつかい'},
  {ic: '👹', t: 'セイフおに'}, {ic: '🦑', t: 'レンリツイカ'}, {ic: '👑', t: 'スウガク大魔王'},
];
})();
