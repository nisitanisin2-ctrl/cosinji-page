# -*- coding: utf-8 -*-
"""excel_import の固定テスト

    python -m unittest tests.test_excel_import -v

CLAUDE.md のとおり、ルートの kaikei.db は使わず :memory: で試す。
openpyxl が無い環境では丸ごとスキップする。
"""
import os
import tempfile
import unittest
from datetime import date

from db import Database, YearLockedError
from xlsx_helpers import excel_available

import excel_import as EI


def make_book(path, with_event=True, title_rows=True):
    """スマホ版／このアプリが出すのと同じ形の Excel を作る

    ・表題の行が1行あって、見出しは2行目
    ・まったく同じ内容の取引が2件（実際にある。1件に丸めてはいけない）
    ・下に合計行（読み飛ばされること）
    """
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = '概要・残高'
    for r in [['2026年度　○○区会計サマリー'], ['出力日時: 2026年09月05日 21:14'], [],
              ['■ 口座残高'], ['口座', '期首残高', '収入', '支出', '現在残高'],
              ['現金', 120698, 3250, 26868, 181650],
              ['農協', 915473, 0, 3440, 812033],
              ['合計', 1036171, 3250, 30308, 993683]]:
        ws.append(r)

    ws2 = wb.create_sheet('取引一覧')
    head = ['日付', '口座', '科目', '摘要', '収入', '支出', '行事', '備考']
    if not with_event:
        head.remove('行事')
    if title_rows:
        ws2.append(['2026年度　取引一覧'])
    ws2.append(head)
    rows = [
        ['2026-04-06', '農協', '雑収入', '自販機', 3250, None, '', ''],
        ['2026-04-08', '現金', '備品・消耗品費', 'コンパネ', None, 2068, '', ''],
        ['2026-04-27', '農協', '水道光熱費', '上水道 3月分', None, 1720, '', ''],
        ['2026-04-27', '農協', '水道光熱費', '上水道 3月分', None, 1720, '', ''],
        ['2026-05-18', '現金', '行事費', '景品代', None, 24800, '秋祭り', '3'],
    ]
    for r in rows:
        ws2.append(r if with_event else [v for i, v in enumerate(r) if i != 6])
    ws2.append([])
    ws2.append(['合計', '', '', '', 3250, 30308])

    ws3 = wb.create_sheet('振替')
    if title_rows:
        ws3.append(['2026年度　口座間振替'])
    ws3.append(['日付', '振替元', '振替先', '金額', '摘要', '備考'])
    ws3.append(['2026-05-11', '農協', '現金', 100000, '', ''])
    ws3.append(['2026-07-15', '現金', '農協', 12180, '繰入', ''])
    wb.save(path)


@unittest.skipUnless(excel_available(), 'openpyxl が無いので飛ばす')
class TestExcelImport(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.book = os.path.join(self.tmp, 'book.xlsx')
        make_book(self.book)
        self.db = Database(':memory:')
        self.db.set_operator('テスト担当')

    def tearDown(self):
        self.db.close()

    # ---- 読み取り ----
    def test_read_workbook(self):
        plan = EI.read_workbook(self.book, 2026)
        self.assertEqual(len(plan.transactions), 5)
        self.assertEqual(len(plan.transfers), 2)
        self.assertEqual(plan.openings, {'現金': 120698, '農協': 915473})
        self.assertEqual(sorted(plan.fiscal_years), [2026])
        self.assertEqual(len(plan.skipped), 1)            # 合計行だけ
        t = plan.transactions[4]
        self.assertEqual((t['date'], t['account'], t['category'], t['details'],
                          t['expense'], t['event'], t['memo']),
                         ('2026-05-18', '現金', '行事費', '景品代', 24800, '秋祭り', '3'))

    def test_amounts_are_int(self):
        plan = EI.read_workbook(self.book, 2026)
        for t in plan.transactions:
            self.assertIsInstance(t['income'], int)
            self.assertIsInstance(t['expense'], int)

    # ---- 入れる ----
    def test_apply(self):
        plan = EI.read_workbook(self.book, 2026)
        EI.examine(self.db, plan)
        # 「現金」は DEFAULT_ACCOUNTS にあるので、新しいのは「農協」だけ
        self.assertEqual(plan.new_accounts, ['農協'])
        res = EI.apply_plan(self.db, plan)
        self.assertEqual(res['transactions'], 5)
        self.assertEqual(res['transfers'], 2)
        self.assertEqual(len(self.db.get_transactions(2026)), 5)
        self.assertEqual(len(self.db.get_transfers(2026)), 2)
        self.assertEqual(self.db.get_opening_balances(2026),
                         {'現金': 120698, '農協': 915473})
        self.assertIn('農協', self.db.get_account_names())
        self.assertIn('行事費', self.db.get_category_names())

    def test_event_and_memo_saved(self):
        plan = EI.read_workbook(self.book, 2026)
        EI.examine(self.db, plan)
        EI.apply_plan(self.db, plan)
        rows = self.db.get_transactions(2026)
        self.assertEqual([r['event'] for r in rows if r['event']], ['秋祭り'])
        self.assertEqual([r['memo'] for r in rows if r['memo']], ['3'])

    # ---- 二重に入れない ----
    def test_second_import_adds_nothing(self):
        for _ in range(2):
            plan = EI.read_workbook(self.book, 2026)
            EI.examine(self.db, plan)
            EI.apply_plan(self.db, plan)
        self.assertEqual(len(self.db.get_transactions(2026)), 5)
        self.assertEqual(len(self.db.get_transfers(2026)), 2)

    def test_identical_rows_are_kept(self):
        """まったく同じ内容の取引が2件あるとき、1件に丸めない"""
        plan = EI.read_workbook(self.book, 2026)
        EI.examine(self.db, plan)
        EI.apply_plan(self.db, plan)
        same = [r for r in self.db.get_transactions(2026) if r['details'] == '上水道 3月分']
        self.assertEqual(len(same), 2)

    def test_only_new_rows_added(self):
        plan = EI.read_workbook(self.book, 2026)
        EI.examine(self.db, plan)
        EI.apply_plan(self.db, plan)
        # 1件だけ足した Excel を作って読ませる
        import openpyxl
        wb = openpyxl.load_workbook(self.book)
        wb['取引一覧'].append(['2026-06-01', '現金', '雑費', '新しい分', None, 500, '', ''])
        book2 = os.path.join(self.tmp, 'book2.xlsx')
        wb.save(book2)
        plan2 = EI.read_workbook(book2, 2026)
        EI.examine(self.db, plan2)
        self.assertEqual(plan2.add_transactions, 1)
        EI.apply_plan(self.db, plan2)
        self.assertEqual(len(self.db.get_transactions(2026)), 6)

    # ---- 変更履歴 ----
    def test_audit_log(self):
        plan = EI.read_workbook(self.book, 2026)
        EI.examine(self.db, plan)
        EI.apply_plan(self.db, plan)
        log = self.db.get_audit_log(2026)
        self.assertTrue(log)
        self.assertTrue(all(r['summary'].startswith('Excel取込: ') for r in log))
        self.assertTrue(all(r['operator'] == 'テスト担当' for r in log))
        # 取り込みのあとは前置きを戻す（ふつうの入力に残らない）
        self.assertEqual(getattr(self.db, '_log_prefix', ''), '')

    # ---- 確定済み年度 ----
    def test_closed_year_is_refused(self):
        self.db.get_or_create_fiscal_year(2026)
        self.db.conn.execute('UPDATE fiscal_years SET is_closed=1 WHERE year=2026')
        self.db.conn.commit()
        plan = EI.read_workbook(self.book, 2026)
        EI.examine(self.db, plan)
        self.assertEqual(plan.locked_years, [2026])
        with self.assertRaises(YearLockedError):
            EI.apply_plan(self.db, plan)
        self.assertEqual(len(self.db.get_transactions(2026)), 0)

    # ---- 途中で失敗したら取り消す ----
    def test_rollback_on_error(self):
        plan = EI.read_workbook(self.book, 2026)
        EI.examine(self.db, plan)
        plan.transactions[3]['date'] = None            # わざと壊す
        with self.assertRaises(Exception):
            EI.apply_plan(self.db, plan)
        self.assertEqual(len(self.db.get_transactions(2026)), 0)
        self.assertEqual(len(self.db.get_transfers(2026)), 0)

    # ---- よその形の帳面 ----
    def test_foreign_layout(self):
        import openpyxl
        p = os.path.join(self.tmp, 'foreign.xlsx')
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = '現金出納帳'
        for r in [['令和8年度　○○区　現金出納帳'], [],
                  ['No', '年月日', '勘定科目', '摘要', '収入金額', '支出金額',
                   '差引残高', '支払方法', '備考'],
                  [1, '2026/4/5', '会費', '4月分 会費', 12000, '', 262000, '現金', ''],
                  [2, 'R8.5.10', '会議費', '総会 お茶代', '', '3,240', 258760, '農協', '領収書あり'],
                  [], ['合計', '', '', '', 12000, 3240]]:
            ws.append(r)
        wb.save(p)
        plan = EI.read_workbook(p, 2026)
        self.assertEqual(len(plan.transactions), 2)
        self.assertEqual(plan.transactions[1]['date'], '2026-05-10')     # 和暦
        self.assertEqual(plan.transactions[1]['expense'], 3240)          # カンマつき
        self.assertEqual(plan.transactions[1]['account'], '農協')
        self.assertEqual(plan.transactions[1]['memo'], '領収書あり')
        self.assertEqual(len(plan.skipped), 1)                           # 合計行


class TestValueParsing(unittest.TestCase):
    """日付と金額の読み取り（openpyxl が無くても動く）"""

    def test_parse_date_cell(self):
        cases = [
            ('2026/4/5', '2026-04-05'), ('2026-04-05', '2026-04-05'),
            ('2026年4月5日', '2026-04-05'), ('R8.6.1', '2026-06-01'),
            ('令和8年6月1日', '2026-06-01'), ('平成31年4月30日', '2019-04-30'),
            (46117, '2026-04-05'),        # Excel の日付
            (20260405, '2026-04-05'),     # 8けた
            ('4/7', '2026-04-07'),        # 年は年度から補う
            (date(2026, 4, 5), '2026-04-05'),
            ('', ''), ('ごうけい', ''), ('2026-13-45', ''),
        ]
        for v, want in cases:
            with self.subTest(v=v):
                self.assertEqual(EI.parse_date_cell(v, 2026), want)

    def test_parse_amount_cell(self):
        cases = [('12,000', 12000), ('¥3,240', 3240), ('3240円', 3240),
                 ('１２０００', 12000), ('▲5,000', -5000), ('(5,000)', -5000),
                 ('', 0), ('—', 0), (3250.0, 3250)]
        for v, want in cases:
            with self.subTest(v=v):
                self.assertEqual(EI.parse_amount_cell(v), want)

    def test_fiscal_year_of(self):
        self.assertEqual(EI.fiscal_year_of('2026-03-31'), 2025)
        self.assertEqual(EI.fiscal_year_of('2026-04-01'), 2026)
        self.assertIsNone(EI.fiscal_year_of(''))


if __name__ == '__main__':
    unittest.main(verbosity=2)
