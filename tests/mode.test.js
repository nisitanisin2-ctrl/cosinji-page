/* モードの行き来の固定テスト。
   v304 で直したバグ：容積モードでテンプレートを読み、通常へ移ってから取り消すと、
   容積の見た目が通常のシートに書き込まれ、そのシートが容積を覚えてしまい、
   「通常」を何度押しても容積の表示から抜けられなくなっていた。
   モードは表の中身そのものが別なので、往復して必ず元に戻れることを毎回確かめる。 */
'use strict';

const MODES = ['normal','simple','shopping','warikan','zei','wariai','youseki','yosan','jikan','dentaku'];

/* 往復しても workspaceMode と tableMode がずれないこと */
const ROUNDTRIP = { modes: MODES, back: 'normal' };

/* 直したバグそのものの手順 */
const STUCK_SCENARIO = {
  name: '容積→テンプレ→通常→取り消す→通常',
  steps: [
    { do: "switchMode('youseki')" },
    { do: "setCellVal(1,0,'2'); setCellVal(1,1,'3'); setCellVal(1,2,'4'); recalcMode();" },
    { do: "applyTemplateObj(CALC_TEMPLATES[0], ()=>{})" },
    { do: "switchMode('normal')", expect: { ws:'normal', tm:'normal' } },
    { do: "undoLast()",           expect: { ws:'normal', tm:'normal' } },   // またいだ取り消しは効かない
    { do: "switchMode('youseki')", expect: { ws:'youseki', tm:'youseki' } },
    { do: "switchMode('normal')",  expect: { ws:'normal', tm:'normal' } },
  ]
};

/* モードを変えたら取り消しの履歴は切る（またいで戻せると何が戻るのか分からないため） */
const HISTORY_CLEARED = {
  name: 'モードを変えると履歴が切れる',
  steps: [
    { do: "switchMode('youseki')" },
    { do: "setCellVal(1,0,'9')" },
    { check: 'history.length', min: 1 },
    { do: "switchMode('normal')" },
    { check: 'history.length', is: 0 },
  ]
};

/* 同じモードの中では今までどおり取り消せる */
const UNDO_WITHIN_MODE = {
  name: '同じモードの中の取り消しは効く',
  steps: [
    { do: "switchMode('shopping')" },
    { do: "setCellVal(1,0,'りんご'); setCellVal(1,1,'120'); setCellVal(1,2,'3'); recalcMode();" },
    { do: "setCellVal(1,0,'みかん')" },
    { do: "undoLast()" },
    { check: 'data[1][0]', is: 'りんご' },
  ]
};

module.exports = { MODES, ROUNDTRIP, STUCK_SCENARIO, HISTORY_CLEARED, UNDO_WITHIN_MODE };
