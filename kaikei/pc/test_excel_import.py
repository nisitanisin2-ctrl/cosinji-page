#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""excel_import.py の固定テスト。

パソコン版の main.py は要らない。テーブルの作りだけ同じものをここで作って試す。

    python3 kaikei/pc/test_excel_import.py

openpyxl が要る（パソコン版の Excel 出力でも使っているもの）。
"""
import os
import sqlite3
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import excel_import as EI                                    # noqa: E402

try:
    import openpyxl
except ImportError:
    print('openpyxl が要ります: pip install openpyxl')
    sys.exit(2)

# パソコン版（main.py の Database._create_tables）と同じ作り
SCHEMA = """
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, fiscal_year INTEGER NOT NULL,
    date TEXT NOT NULL, account_type TEXT NOT NULL, category TEXT NOT NULL,
    details TEXT DEFAULT '', income REAL DEFAULT 0, expense REAL DEFAULT 0,
    memo TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS fiscal_years (
    year INTEGER PRIMARY KEY, balance_cash REAL DEFAULT 0, balance_ja REAL DEFAULT 0,
    balance_tanshin REAL DEFAULT 0, is_closed INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, sort_order INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, sort_order INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS account_balances (
    fiscal_year INTEGER NOT NULL, account_name TEXT NOT NULL, balance REAL DEFAULT 0,
    PRIMARY KEY (fiscal_year, account_name));
CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, fiscal_year INTEGER NOT NULL, date TEXT NOT NULL,
    from_account TEXT NOT NULL, to_account TEXT NOT NULL, amount REAL NOT NULL,
    details TEXT DEFAULT '', memo TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
"""


class FakeDb:
    """excel_import が使うところだけの、パソコン版の Database の代わり"""

    def __init__(self, path, with_event=False):
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        if with_event:                                       # 新しい版には「行事」の列がある
            self.conn.execute("ALTER TABLE transactions ADD COLUMN event TEXT DEFAULT ''")
        self.conn.commit()

    def get_transactions(self, fy, sort_by='date'):
        return [dict(r) for r in self.conn.execute(
            'SELECT * FROM transactions WHERE fiscal_year=? ORDER BY date,id', (fy,))]

    def get_transfers(self, fy):
        return [dict(r) for r in self.conn.execute(
            'SELECT * FROM transfers WHERE fiscal_year=? ORDER BY date,id', (fy,))]

    def get_category_names(self):
        return [r[0] for r in self.conn.execute('SELECT name FROM categories')]

    def get_account_names(self):
        return [r[0] for r in self.conn.execute('SELECT name FROM accounts')]

    def get_opening_balances(self, year):
        return {r[0]: r[1] for r in self.conn.execute(
            'SELECT account_name,balance FROM account_balances WHERE fiscal_year=?', (year,))}


PASS = FAILED = 0


def check(name, got, want):
    global PASS, FAILED
    if str(got) == str(want):
        PASS += 1
        print(f'  ok  {name}')
    else:
        FAILED += 1
        print(f'  NG  {name}\n        出た : {got}\n        期待 : {want}')


def make_book(path, with_event=True):
    """スマホ版／パソコン版が出すのと同じ形の Excel を作る"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = '概要・残高'
    for r in [['2026年度　○○区会計サマリー'], ['出力日時: 2026年09月05日 21:14'], [],
              ['■ 口座残高'], ['口座', '期首残高', '収入', '支出', '現在残高'],
              ['現金', 120698, 3250, 26868, 181650], ['農協', 915473, 0, 3440, 812033],
              ['合計', 1036171, 3250, 30308, 993683]]:
        ws.append(r)
    ws2 = wb.create_sheet('取引一覧')
    head = ['日付', '口座', '科目', '摘要', '収入', '支出', '行事', '備考']
    if not with_event:
        head = [h for h in head if h != '行事']
    ws2.append(['2026年度　取引一覧'])
    ws2.append(head)
    rows = [
        ['2026-04-06', '農協', '雑収入', '自販機', 3250, None, '', ''],
        ['2026-04-08', '現金', '備品・消耗品費', 'コンパネ', None, 2068, '', ''],
        # まったく同じ内容が2件（実際にある。1件に丸めてはいけない）
        ['2026-04-27', '農協', '水道光熱費', '上水道 3月分', None, 1720, '', ''],
        ['2026-04-27', '農協', '水道光熱費', '上水道 3月分', None, 1720, '', ''],
        ['2026-05-18', '現金', '行事費', '景品代', None, 24800, '秋祭り', '3'],
    ]
    for r in rows:
        ws2.append(r if with_event else [v for i, v in enumerate(r) if i != 6])
    ws2.append([])
    ws2.append(['合計', '', '', '', 3250, 30308])
    ws3 = wb.create_sheet('振替')
    ws3.append(['2026年度　口座間振替'])
    ws3.append(['日付', '振替元', '振替先', '金額', '摘要', '備考'])
    ws3.append(['2026-05-11', '農協', '現金', 100000, '', ''])
    ws3.append(['2026-07-15', '現金', '農協', 12180, '繰入', ''])
    wb.save(path)


def main():
    tmp = tempfile.mkdtemp()
    book = os.path.join(tmp, 'book.xlsx')
    make_book(book)

    print('── はじめて取り込む ──')
    db = FakeDb(os.path.join(tmp, 'a.db'), with_event=True)
    plan = EI.read_workbook(book, 2026)
    EI.examine(db, plan)
    check('取引を読む', len(plan.transactions), 5)
    check('振替を読む', len(plan.transfers), 2)
    check('期首残高を読む', plan.openings, {'現金': 120698, '農協': 915473})
    check('合計行は読み飛ばす', len(plan.skipped), 1)
    check('年度が分かる', sorted(plan.fiscal_years), [2026])
    check('新しい口座を見つける', sorted(plan.new_accounts), ['現金', '農協'])
    res = EI.apply_plan(db, plan)
    check('取引が入る', res['transactions'], 5)
    check('振替が入る', res['transfers'], 2)
    check('期首残高が入る', db.get_opening_balances(2026), {'現金': 120698.0, '農協': 915473.0})
    check('行事も入る', [r['event'] for r in db.get_transactions(2026) if r['event']], ['秋祭り'])
    check('備考も入る', [r['memo'] for r in db.get_transactions(2026) if r['memo']], ['3'])

    print('\n── 同じものをもう一度取り込む（二重に入らない）──')
    plan2 = EI.read_workbook(book, 2026)
    EI.examine(db, plan2)
    check('追加なし', plan2.add_transactions, 0)
    check('重複として数える', plan2.dup_transactions, 5)
    EI.apply_plan(db, plan2)
    check('件数は変わらない', len(db.get_transactions(2026)), 5)
    check('同じ内容の2件は2件のまま',
          len([r for r in db.get_transactions(2026) if r['details'] == '上水道 3月分']), 2)

    print('\n── 1件だけ足された Excel を取り込む ──')
    wb = openpyxl.load_workbook(book)
    wb['取引一覧'].insert_rows(7)
    for c, v in enumerate(['2026-06-01', '現金', '雑費', '新しい分', None, 500, '', ''], start=1):
        wb['取引一覧'].cell(row=7, column=c, value=v)
    book2 = os.path.join(tmp, 'book2.xlsx')
    wb.save(book2)
    plan3 = EI.read_workbook(book2, 2026)
    EI.examine(db, plan3)
    check('足された1件だけ入る', plan3.add_transactions, 1)
    EI.apply_plan(db, plan3)
    check('DBは6件になる', len(db.get_transactions(2026)), 6)

    print('\n── 古い版（行事の列が無い）でも入る ──')
    db2 = FakeDb(os.path.join(tmp, 'b.db'), with_event=False)
    book3 = os.path.join(tmp, 'book3.xlsx')
    make_book(book3, with_event=True)
    plan4 = EI.read_workbook(book3, 2026)
    EI.examine(db2, plan4)
    r4 = EI.apply_plan(db2, plan4)
    check('行事の列が無くても入る', r4['transactions'], 5)
    check('行事は落ちるだけ', 'event' in db2.get_transactions(2026)[0], False)

    print('\n── よその形（見出し違い・和暦・表題2行）──')
    p = os.path.join(tmp, 'foreign.xlsx')
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = '現金出納帳'
    for r in [['令和8年度　○○区　現金出納帳'], [],
              ['No', '年月日', '勘定科目', '摘要', '収入金額', '支出金額', '差引残高', '支払方法', '備考'],
              [1, '2026/4/5', '会費', '4月分 会費', 12000, '', 262000, '現金', ''],
              [2, 'R8.5.10', '会議費', '総会 お茶代', '', '3,240', 258760, '農協', '領収書あり'],
              [], ['合計', '', '', '', 12000, 3240]]:
        ws.append(r)
    wb.save(p)
    db3 = FakeDb(os.path.join(tmp, 'c.db'))
    plan5 = EI.read_workbook(p, 2026)
    EI.examine(db3, plan5)
    check('よその見出しでも読める', len(plan5.transactions), 2)
    check('和暦を読む', plan5.transactions[1]['date'], '2026-05-10')
    check('カンマつき金額を読む', plan5.transactions[1]['expense'], 3240)
    check('口座を読む', plan5.transactions[1]['account'], '農協')
    check('合計行は読み飛ばす', len(plan5.skipped), 1)

    print('\n── 途中で失敗したら、ぜんぶ取り消す ──')
    before = len(db3.get_transactions(2026))
    EI.apply_plan(db3, plan5)
    after = len(db3.get_transactions(2026))
    plan6 = EI.read_workbook(p, 2026)
    EI.examine(db3, plan6)
    plan6.transactions[0]['dup'] = False
    plan6.transactions[0]['date'] = None            # わざと壊す
    try:
        EI.apply_plan(db3, plan6)
        check('失敗したら例外が出る', '出なかった', '出る')
    except Exception:
        check('失敗しても中途半端に入らない', len(db3.get_transactions(2026)), after)

    print('\n── 日付と金額の読み取り ──')
    for v, want in [('2026/4/5', '2026-04-05'), ('R8.6.1', '2026-06-01'),
                    ('令和8年6月1日', '2026-06-01'), ('平成31年4月30日', '2019-04-30'),
                    (46117, '2026-04-05'), (20260405, '2026-04-05'), ('4/7', '2026-04-07'),
                    ('', ''), ('ごうけい', '')]:
        check(f'日付 {v!r}', EI.parse_date(v, 2026), want)
    for v, want in [('12,000', 12000), ('¥3,240', 3240), ('３２４０', 3240), ('▲5,000', -5000),
                    ('(5,000)', -5000), ('', 0), ('—', 0)]:
        check(f'金額 {v!r}', EI.parse_money(v), want)

    print('\n' + '─' * 50)
    print(f'合計 {PASS + FAILED} 件 : 通った {PASS} / 通らなかった {FAILED}')
    return 1 if FAILED else 0


if __name__ == '__main__':
    sys.exit(main())
