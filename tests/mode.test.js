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

/* v306 で直したバグ：通常モードのままひな形を読むと、モードとしては通常のままなので
   「▦通常」を押しても何も起きず、画面はひな形のまま＝「通常に戻らない」に見えていた。
   聞いたうえで、ひな形を入れる前の大きさのまっさらな表へ戻す。 */
const TMPL_BACK_TO_PLAIN = {
  name: '通常→ひな形→通常でまっさらな表に戻る',
  steps: [
    { do: "setCellVal(0,0,'もとの表')" },
    { do: "applyTemplateObj(CALC_TEMPLATES[0], ()=>{})" },
    { check: 'data[0][0]===CALC_TEMPLATES[0].rows[0][0]', is: true },
    { check: 'COLS', is: 2 },
    { do: "switchMode('normal')", expect: { ws:'normal', tm:'normal' } },
    { check: 'data[0][0]', is: '' },              // ひな形の中身が消えている
    { check: 'COLS', is: 3 },                     // ひな形を入れる前の大きさに戻る
    { check: 'ROWS', is: 15 },
    { check: 'Object.keys(cellStyles).length', is: 0 },
    { check: "typeof currentTemplate!=='function' || currentTemplate()===null", is: true },
    { do: "undoLast()" },                         // ↶戻る でひな形に戻せる
    { check: 'data[0][0]===CALC_TEMPLATES[0].rows[0][0]', is: true },
    { do: "switchMode('normal')" },               // 戻したあとも、もう一度まっさらにできる
    { check: 'data[0][0]', is: '' },
    { check: 'COLS', is: 3 },
  ]
};

/* ひな形でない普通の表では、「通常」を押しても中身を消してはいけない */
const TMPL_KEEPS_PLAIN = {
  name: '普通の表で通常を押しても消えない',
  steps: [
    { do: "setCellVal(0,0,'たいせつな表')" },
    { do: "switchMode('normal')" },
    { check: 'data[0][0]', is: 'たいせつな表' },
  ]
};

/* 別モードでひな形を読んだときは今までどおり（通常へ移ると通常の表が出る） */
const TMPL_FROM_OTHER_MODE = {
  name: '買物→ひな形→通常',
  steps: [
    { do: "switchMode('shopping')" },
    { do: "applyTemplateObj(CALC_TEMPLATES[0], ()=>{})" },
    { do: "switchMode('normal')", expect: { ws:'normal', tm:'normal' } },
    { check: 'data[0][0]', is: '' },
    { check: "typeof currentTemplate!=='function' || currentTemplate()===null", is: true },
  ]
};

/* v307 で直したバグ：ひな形を入れた状態でモードを押すと、ひな形の表だけが残り、
   「通常」でも「↶戻る」でも元に戻せなくなっていた。
   （ひな形の印がモード切替で消え、取り消し履歴もモード切替で捨てられていたため） */
const TMPL_MODE_ROUNDTRIP = {
  name: 'ひな形→モード→通常で元に戻せる',
  steps: [
    { do: "setCellVal(0,0,'もとの表'); setCellVal(1,0,'たいせつなメモ')" },
    { do: "applyTemplateObj(CALC_TEMPLATES[0], ()=>{})" },
    { do: "switchMode('shopping')", expect: { ws:'shopping', tm:'shopping' } },
    { do: "switchMode('normal')",   expect: { ws:'normal',   tm:'normal'   } },
    { check: "typeof currentTemplate==='function' && currentTemplate()!==null", is: true },      // ひな形の表だと分かる
    { check: 'history.length>0', is: true },              // 取り消し履歴も戻っている
    { do: "undoLast()" },                                 // ↶戻る で元の表に戻れる
    { check: 'data[0][0]', is: 'もとの表' },
    { check: 'data[1][0]', is: 'たいせつなメモ' },
    { check: 'COLS', is: 3 },
    { check: 'ROWS', is: 15 },
  ]
};

/* ひな形を入れてモードを往復したあと、「通常」でまっさらな表にも戻せる */
const TMPL_MODE_THEN_PLAIN = {
  name: 'ひな形→モード→通常→通常でまっさらに',
  steps: [
    { do: "applyTemplateObj(CALC_TEMPLATES[0], ()=>{})" },
    { do: "switchMode('warikan')" },
    { do: "switchMode('normal')" },
    { do: "switchMode('normal')" },                       // 2回目でまっさらな表へ
    { check: 'data[0][0]', is: '' },
    { check: 'COLS', is: 3 },
    { check: "typeof currentTemplate!=='function' || currentTemplate()===null", is: true },
  ]
};

/* モードごとの取り消し履歴は混ざらない（v304 のバグを戻さないための確認） */
const HISTORY_PER_MODE = {
  name: 'モードごとの履歴は混ざらない',
  steps: [
    { do: "switchMode('youseki'); setCellVal(1,0,'99')" },
    { do: "switchMode('normal'); setCellVal(0,0,'つうじょう')" },
    { do: "undoLast()" },
    { check: 'data[0][0]', is: '' },                      // 通常の取り消しは通常の中だけ
    { do: "undoLast()" },
    { check: "tableMode", is: 'normal' },                 // 容積の履歴には手が届かない
    { do: "switchMode('youseki')" },
    { check: 'data[1][0]', is: '99' },
    { check: 'history.length>0', is: true },              // 容積に戻れば容積の履歴が返る
    { do: "undoLast()" },
    { check: 'data[1][0]', is: '' },
  ]
};

module.exports = { MODES, ROUNDTRIP, STUCK_SCENARIO, HISTORY_CLEARED, UNDO_WITHIN_MODE,
                   TMPL_BACK_TO_PLAIN, TMPL_KEEPS_PLAIN, TMPL_FROM_OTHER_MODE,
                   TMPL_MODE_ROUNDTRIP, TMPL_MODE_THEN_PLAIN, HISTORY_PER_MODE };
