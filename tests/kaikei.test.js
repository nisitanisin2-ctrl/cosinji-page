/* 自治会会計（kaikei/）の固定テスト。
   いちばん大事なのは「パソコン版とやりとりしても、伝票が二重にならない・消えない・
   金額が別の列に入らない」ところ。実物のパソコン版が出す形をまねた見本で確かめる。 */
'use strict';

/* 日付と金額の読み取り（[入れるもの, 期待する答え]） */
const PARSE_DATE = [
  ['2026/4/5',        '2026-04-05'],
  ['2026-04-05',      '2026-04-05'],
  ['2026年4月5日',    '2026-04-05'],
  ['R8.6.1',          '2026-06-01'],   // 令和8年 = 2026年
  ['令和8年6月1日',   '2026-06-01'],
  ['平成31年4月30日', '2019-04-30'],
  ['46117',           '2026-04-05'],   // Excel の日付（1899-12-30 からの日数）
  ['20260405',        '2026-04-05'],   // 8けたの数字
  ['',                ''],
  ['ごうけい',        ''],             // 合計行などは読み飛ばす
];
const PARSE_MONEY = [
  ['12,000',   12000],
  ['¥3,240',   3240],
  ['3240円',   3240],
  ['１２０００', 12000],               // 全角
  ['▲5,000',  -5000],
  ['(5,000)',  -5000],
  ['',         0],
  ['—',        0],
];

/* ── パソコン版が出す Excel の見本 ──────────────────────────
   実物に合わせてある：
   ・表題が1行あって、見出しは2行目
   ・日付は「文字」として入っている（Excelの日付ではない）
   ・口座は名前（現金・農協・信用金庫…）で、収入と支出は別の列
   ・空のセルも <c … /> として書かれ、「/」の前に空きがある
     （ここを取りちがえると、支出の金額が収入の列に入ってしまう）
   ・まったく同じ内容の行が2つある（実際にあった。1件に丸めてはいけない）
   ・伝票番号の列は無い                                                  */
const PC_TX_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" s="0" t="inlineStr"><is><t>2026年度　取引一覧</t></is></c></row>
<row r="2"><c r="A2" s="4" t="inlineStr"><is><t>日付</t></is></c><c r="B2" s="4" t="inlineStr"><is><t>口座</t></is></c><c r="C2" s="4" t="inlineStr"><is><t>科目</t></is></c><c r="D2" s="4" t="inlineStr"><is><t>摘要</t></is></c><c r="E2" s="4" t="inlineStr"><is><t>収入</t></is></c><c r="F2" s="4" t="inlineStr"><is><t>支出</t></is></c><c r="G2" s="4" t="inlineStr"><is><t>行事</t></is></c><c r="H2" s="4" t="inlineStr"><is><t>備考</t></is></c></row>
<row r="3"><c r="A3" s="9" t="inlineStr"><is><t>2026-04-06</t></is></c><c r="B3" s="5" t="inlineStr"><is><t>信用金庫</t></is></c><c r="C3" s="5" t="inlineStr"><is><t>雑収入</t></is></c><c r="D3" s="5" t="inlineStr"><is><t>自販機</t></is></c><c r="E3" s="6" t="n"><v>3250</v></c><c r="F3" s="6" t="n" /><c r="G3" s="5" t="inlineStr" /><c r="H3" s="5" t="inlineStr" /></row>
<row r="4"><c r="A4" s="9" t="inlineStr"><is><t>2026-04-08</t></is></c><c r="B4" s="5" t="inlineStr"><is><t>現金</t></is></c><c r="C4" s="5" t="inlineStr"><is><t>備品・消耗品費</t></is></c><c r="D4" s="5" t="inlineStr"><is><t>コンパネ</t></is></c><c r="E4" s="6" t="n" /><c r="F4" s="6" t="n"><v>2068</v></c><c r="G4" s="5" t="inlineStr" /><c r="H4" s="5" t="inlineStr" /></row>
<row r="5"><c r="A5" s="9" t="inlineStr"><is><t>2026-04-27</t></is></c><c r="B5" s="5" t="inlineStr"><is><t>農協</t></is></c><c r="C5" s="5" t="inlineStr"><is><t>水道光熱費</t></is></c><c r="D5" s="5" t="inlineStr"><is><t>上水道 3月分</t></is></c><c r="E5" s="6" t="n" /><c r="F5" s="6" t="n"><v>1720</v></c><c r="G5" s="5" t="inlineStr" /><c r="H5" s="5" t="inlineStr" /></row>
<row r="6"><c r="A6" s="9" t="inlineStr"><is><t>2026-04-27</t></is></c><c r="B6" s="5" t="inlineStr"><is><t>農協</t></is></c><c r="C6" s="5" t="inlineStr"><is><t>水道光熱費</t></is></c><c r="D6" s="5" t="inlineStr"><is><t>上水道 3月分</t></is></c><c r="E6" s="6" t="n" /><c r="F6" s="6" t="n"><v>1720</v></c><c r="G6" s="5" t="inlineStr" /><c r="H6" s="5" t="inlineStr" /></row>
<row r="7"><c r="A7" s="9" t="inlineStr"><is><t>2026-05-18</t></is></c><c r="B7" s="5" t="inlineStr"><is><t>現金</t></is></c><c r="C7" s="5" t="inlineStr"><is><t>行事費</t></is></c><c r="D7" s="5" t="inlineStr"><is><t>景品代</t></is></c><c r="E7" s="6" t="n" /><c r="F7" s="6" t="n"><v>24800</v></c><c r="G7" s="5" t="inlineStr"><is><t>秋祭り</t></is></c><c r="H7" s="5" t="inlineStr"><is><t>3</t></is></c></row>
<row r="9"><c r="A9" s="4" t="inlineStr"><is><t>合計</t></is></c><c r="E9" s="6" t="n"><v>3250</v></c><c r="F9" s="6" t="n"><v>30308</v></c></row>
</sheetData></worksheet>`;

const PC_TR_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" s="0" t="inlineStr"><is><t>2026年度　口座間振替</t></is></c></row>
<row r="2"><c r="A2" s="4" t="inlineStr"><is><t>日付</t></is></c><c r="B2" s="4" t="inlineStr"><is><t>振替元</t></is></c><c r="C2" s="4" t="inlineStr"><is><t>振替先</t></is></c><c r="D2" s="4" t="inlineStr"><is><t>金額</t></is></c><c r="E2" s="4" t="inlineStr"><is><t>摘要</t></is></c><c r="F2" s="4" t="inlineStr"><is><t>備考</t></is></c></row>
<row r="3"><c r="A3" s="9" t="inlineStr"><is><t>2026-05-11</t></is></c><c r="B3" s="5" t="inlineStr"><is><t>農協</t></is></c><c r="C3" s="5" t="inlineStr"><is><t>現金</t></is></c><c r="D3" s="6" t="n"><v>100000</v></c><c r="E3" s="5" t="inlineStr" /><c r="F3" s="5" t="inlineStr" /></row>
<row r="4"><c r="A4" s="9" t="inlineStr"><is><t>2026-07-15</t></is></c><c r="B4" s="5" t="inlineStr"><is><t>現金</t></is></c><c r="C4" s="5" t="inlineStr"><is><t>信用金庫</t></is></c><c r="D4" s="6" t="n"><v>12180</v></c><c r="E4" s="5" t="inlineStr"><is><t>繰入</t></is></c><c r="F4" s="5" t="inlineStr" /></row>
</sheetData></worksheet>`;

const PC_SUM_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" s="0" t="inlineStr"><is><t>2026年度　○○区会計サマリー</t></is></c></row>
<row r="4"><c r="A4" s="0" t="inlineStr"><is><t>■ 口座残高</t></is></c></row>
<row r="5"><c r="A5" s="4" t="inlineStr"><is><t>口座</t></is></c><c r="B5" s="4" t="inlineStr"><is><t>期首残高</t></is></c><c r="C5" s="4" t="inlineStr"><is><t>収入</t></is></c><c r="D5" s="4" t="inlineStr"><is><t>支出</t></is></c><c r="E5" s="4" t="inlineStr"><is><t>現在残高</t></is></c></row>
<row r="6"><c r="A6" s="5" t="inlineStr"><is><t>現金</t></is></c><c r="B6" s="6" t="n"><v>120698</v></c><c r="C6" s="6" t="n"><v>0</v></c><c r="D6" s="6" t="n"><v>26868</v></c><c r="E6" s="6" t="n"><v>181650</v></c></row>
<row r="7"><c r="A7" s="5" t="inlineStr"><is><t>農協</t></is></c><c r="B7" s="6" t="n"><v>915473</v></c><c r="C7" s="6" t="n"><v>0</v></c><c r="D7" s="6" t="n"><v>3440</v></c><c r="E7" s="6" t="n"><v>812033</v></c></row>
<row r="8"><c r="A8" s="5" t="inlineStr"><is><t>信用金庫</t></is></c><c r="B8" s="6" t="n"><v>1243299</v></c><c r="C8" s="6" t="n"><v>3250</v></c><c r="D8" s="6" t="n"><v>0</v></c><c r="E8" s="6" t="n"><v>1258729</v></c></row>
<row r="9"><c r="A9" s="5" t="inlineStr"><is><t>定期預金</t></is></c><c r="B9" s="6" t="n"><v>2100779</v></c><c r="C9" s="6" t="n"><v>0</v></c><c r="D9" s="6" t="n"><v>0</v></c><c r="E9" s="6" t="n"><v>2100779</v></c></row>
<row r="10"><c r="A10" s="4" t="inlineStr"><is><t>合計</t></is></c><c r="B10" s="6" t="n"><v>4380249</v></c><c r="C10" s="6" t="n"><v>3250</v></c><c r="D10" s="6" t="n"><v>30308</v></c><c r="E10" s="6" t="n"><v>4353191</v></c></row>
</sheetData></worksheet>`;

/* 上の見本を読んだとき、こうなってほしい */
const PC_EXPECT = {
  headerRow: 1,                                   // 2行目が見出し
  fields: ['date','acc','cat','note','in','out','event','memo'],
  items: [
    // [日付, 区分, 口座, 科目, 摘要, 金額, 行事, 備考]
    ['2026-04-06','in', '信用金庫','雑収入',        '自販機',     3250,  '',      ''],
    ['2026-04-08','out','現金',    '備品・消耗品費','コンパネ',   2068,  '',      ''],
    ['2026-04-27','out','農協',    '水道光熱費',    '上水道 3月分',1720, '',      ''],
    ['2026-04-27','out','農協',    '水道光熱費',    '上水道 3月分',1720, '',      ''],
    ['2026-05-18','out','現金',    '行事費',        '景品代',     24800, '秋祭り','3'],
  ],
  skipped: 1,                                     // 合計行だけ読み飛ばす
  transfers: [
    ['2026-05-11','農協','現金',      100000, ''],
    ['2026-07-15','現金','信用金庫',  12180,  '繰入'],
  ],
  accounts: [['現金',120698],['農協',915473],['信用金庫',1243299],['定期預金',2100779]],
  /* 口座ごとの残高（期首 ＋ 収入 − 支出 ± 振替）。パソコン版の「現在残高」と同じ数え方 */
  balances: [
    ['現金',      120698 + 0    - 26868 + 100000 - 12180],
    ['農協',      915473 + 0    - 3440  - 100000],
    ['信用金庫', 1243299 + 3250 - 0     + 12180],
    ['定期預金', 2100779],
  ],
};

/* スマホ側にある伝票（ここへ上の Excel を読み込む） */
const MINE = [
  {id:'aa1-k-1', date:'2026-04-06', kind:'in',  cat:'雑収入',        note:'自販機',   amt:3250, acc:'信用金庫', event:'', memo:'', ts:1000},
  {id:'aa1-k-2', date:'2026-04-08', kind:'out', cat:'備品・消耗品費', note:'コンパネ', amt:2068, acc:'現金',     event:'', memo:'', ts:1000},
];

/* 食い違ったときの決めごと。パソコン側で金額が 2068→4000 に直されている場合。 */
const POLICY_CASES = [
  { policy:'newer',    incomingTs:9000, want:{added:0, updated:1, same:1}, wantAmt:4000 },
  { policy:'newer',    incomingTs:500,  want:{added:0, updated:0, same:2}, wantAmt:2068 },
  { policy:'incoming', incomingTs:500,  want:{added:0, updated:1, same:1}, wantAmt:4000 },
  { policy:'keep',     incomingTs:9000, want:{added:0, updated:0, same:2}, wantAmt:2068 },
];

module.exports = { PARSE_DATE, PARSE_MONEY, PC_TX_XML, PC_TR_XML, PC_SUM_XML, PC_EXPECT, MINE, POLICY_CASES };
