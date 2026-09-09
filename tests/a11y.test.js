/* 読み上げ・キーボード操作の固定テスト。
   見た目を変えない直しなので、目で見ても崩れに気づけない。数で押さえる。 */
'use strict';

/* 開いて中を確かめるダイアログ */
const DIALOGS = ['showSaveList()','openVolume()','openKantab()','openPhotoMemo()','openTansui()',
  'openTsSettings()','exportPDF()','openHelp()','openModeMenu()','openCellFmt()','openFindDlg()',
  'toggleSettings()','openMoreMenu()','openCalcTmpl()','openLinkList()'];

/* すべて「0件であること」「全部そろっていること」で見る */
const EXPECT = {
  名前の取れないボタン: 0,          // メイン画面
  ダイアログの中の名前なし: 0,      // 上のダイアログを開いたとき
  記号だけで読み方の無いボタン: 0,
  ダイアログにrole: 'すべて',
  ダイアログにaria_modal: 'すべて',
  ダイアログに見出しの結びつき: 'すべて',
  Tabがダイアログの外へ出た回数: 0,
};

module.exports = { DIALOGS, EXPECT };
