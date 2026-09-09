/* Excel（.xlsx）の読み書きの固定テスト。
   対応外の関数がどう扱われるか、往復で式や書式が保たれるかを見る。 */
'use strict';

/* 読み込ませる .xlsx の中身（テスト内で組み立てる）。
   kept=式のまま／toValue=値に変換／unsupported=#NAME? になる、の3種を混ぜてある。 */
const IMPORT_SHEET = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1"><v>10</v></c><c r="B1"><v>20</v></c></row>
<row r="2"><c r="A2"><f>SUM(A1:B1)</f><v>30</v></c><c r="B2"><f>SUMIF(A1:B1,"&gt;5")</f><v>30</v></c></row>
<row r="3"><c r="A3"><f>TODAY()</f></c><c r="B3"><f>AVERAGE(A1:B1)</f><v>15</v></c></row>
<row r="4"><c r="A4"><f>STDEV(A1:B1)</f><v>7.07</v></c><c r="B4"><f>MAX(A1:B1)</f><v>20</v></c></row>
</sheetData></worksheet>`;

const IMPORT_EXPECT = {
  cells: [                       // [行, 列, 表に入る中身, 画面の表示]
    [0,0,'10','10'], [0,1,'20','20'],
    [1,0,'=SUM(A1:B1)','30'],    // 対応 → 式のまま
    [1,1,'30','30'],             // SUMIF は未対応 → Excel の答えの値に
    [2,0,'=TODAY()','#NAME?'],   // 未対応で答えの値も無い
    [2,1,'=AVERAGE(A1:B1)','15'],
    [3,0,'7.07','7.07'],         // STDEV は未対応 → 値に
    [3,1,'=MAX(A1:B1)','20'],
  ],
  report: {
    kept: ['A2','B3','B4'],
    toValue: ['B2','A4'],
    unsupported: ['A3'],
    funcs: ['SUMIF','TODAY','STDEV'],
  }
};

/* 書き出し：エラーの式は 0 ではなく t="e" でエラーのまま書く */
const EXPORT_CASES = [
  { name: 'ふつうの式は式と答えの両方を書く',
    cells: [[0,0,'10'],[1,0,'20'],[0,1,'=A1+A2']],
    contains: ['<f>A1+A2</f>'], notContains: [] },
  { name: 'エラーの式は t="e" でエラーのまま書く（0では書かない）',
    cells: [[0,0,'10'],[1,0,'0'],[0,1,'=A1/A2']],
    contains: ['t="e"', '#DIV/0!'], notContains: [] },
];

module.exports = { IMPORT_SHEET, IMPORT_EXPECT, EXPORT_CASES };
