# -*- coding: utf-8 -*-
"""Excel(.xlsx/.xlsm) 取り込み

スマホ版「自治会会計」が書き出した Excel や、このアプリが「今すぐ外部フォルダへ出力」
で出した Excel（概要・残高／取引一覧／振替／科目別集計）を読み込んで帳簿に入れる。

「CSVを取り込み」(main.import_csv) と同じ考え方だが、次の3つが違う:

  1. 見出しの行を自分でさがす（表題が上に何行あってもよい）。見出しの言い方が
     違っても当てはめる（年月日／勘定科目／収入金額／支払方法 など）。
  2. 重複の判定に摘要も入れ、**同じ内容が何件あるか**で突き合わせる。
     まったく同じ内容の取引が2件ある帳面が実際にあるため、1件に丸めない
     （count_similar_transaction は摘要を見ないので、ここでは使わない）。
  3. 「概要・残高」シートがあれば期首残高も取り込む。

読み取り部（read_workbook / examine）は **Tk に依存しない**ので、
tests から直接呼べる。画面は ExcelImportMixin だけが持つ。

main.py への足しかた（3か所）:

    from excel_import import ExcelImportMixin              # import のところ

    class JichikaiApp(ReportsMixin, ExcelImportMixin):     # クラス宣言

    # _show_data_menu の「CSVを取り込み」の下
    menu.add_command(label='Excelを取り込み', command=self.import_excel)
"""

import os
import re
import unicodedata
from datetime import datetime, date, timedelta

from xlsx_helpers import excel_available


# ============================================================
# 見出しの言い方
# ============================================================
ALIASES = {
    'date':  ['日付', '年月日', '取引日', '取引年月日', '月日', '日時', '起票日', '日'],
    'acc':   ['口座', '口座名', '出どころ', '支払方法', '支払区分', '現金口座', '現金・口座',
              '預金', '金融機関', '取引口座'],
    'kind':  ['区分', '収支', '収支区分', '種別', '入出金', '入出金区分', '収入支出'],
    'cat':   ['科目', '勘定科目', '費目', '項目', '細目', '分類', '種目'],
    'note':  ['摘要', '内容', '取引内容', '明細', '品目', '相手先', '支払先', '用途', '件名'],
    'income': ['収入', '収入金額', '収入額', '入金', '入金額', '受入', '受入金額',
               '借方', '借方金額', '入'],
    'expense': ['支出', '支出金額', '支出額', '出金', '出金額', '払出', '払出金額',
                '貸方', '貸方金額', '出'],
    'amount': ['金額', '額', '合計金額', '取引金額'],
    'balance': ['残高', '差引残高', '差引', '繰越残高', '現在残高', '残'],
    'event': ['行事', '行事名', '事業', '事業名', 'イベント'],
    'memo':  ['備考', 'メモ', '注記', 'コメント'],
    'from':  ['振替元', '振替元口座', '出金元', '引出元', '移動元'],
    'to':    ['振替先', '振替先口座', '入金先', '預入先', '移動先'],
    'tramt': ['振替額', '振替金額', '移動額'],
    'opening': ['期首残高', '期首', '前期繰越', '前年度繰越'],
}
TX_FIELDS = ('date', 'acc', 'kind', 'cat', 'note', 'income', 'expense',
             'amount', 'balance', 'event', 'memo')
TR_FIELDS = ('date', 'from', 'to', 'amount', 'tramt', 'note', 'memo')

# 和暦（元号, 元年の前年）
_WAREKI = {'令和': 2018, 'r': 2018, '平成': 1988, 'h': 1988,
           '昭和': 1925, 's': 1925, '大正': 1911, 't': 1911, '明治': 1867, 'm': 1867}

MAX_ROWS = 20000          # 1シートから読む上限
MAX_COLS = 64


def _norm(s):
    """見出しをくらべる形にそろえる（全角→半角・空き・かっこを落とす）"""
    if s is None:
        return ''
    s = unicodedata.normalize('NFKC', str(s))
    s = re.sub(r'[（(].*?[)）]', '', s)
    s = re.sub(r'[\s　()\[\]【】]', '', s)
    return s.strip().lower()


def _field_of(header, allow):
    n = _norm(header)
    if not n:
        return None
    for f in allow:                                    # まず、ぴったり同じ言い方
        if any(_norm(a) == n for a in ALIASES.get(f, [])):
            return f
    for f in allow:                                    # つぎに、含んでいるもの
        if any(len(_norm(a)) >= 2 and _norm(a) in n for a in ALIASES.get(f, [])):
            return f
    return None


# ============================================================
# 値の読み取り（Tk に依存しない）
# ============================================================
def parse_date_cell(v, fiscal_year=None):
    """セルの値を 'YYYY-MM-DD' にする。読めなければ ''"""
    if v is None or v == '':
        return ''
    if isinstance(v, datetime):
        return v.strftime('%Y-%m-%d')
    if isinstance(v, date):
        return v.strftime('%Y-%m-%d')
    if isinstance(v, (int, float)):
        n = float(v)
        if 20000 <= n <= 80000:                        # Excel の日付（1899-12-30 からの日数）
            return (datetime(1899, 12, 30) + timedelta(days=int(n))).strftime('%Y-%m-%d')
        if 19000101 <= n <= 21001231:                  # 20260405 のような8けた
            s = str(int(n))
            return _ymd(s[0:4], s[4:6], s[6:8])
        return ''
    s = unicodedata.normalize('NFKC', str(v)).strip()
    m = re.match(r'^(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})', s)
    if m:
        return _ymd(m.group(1), m.group(2), m.group(3))
    m = re.match(r'^(令和|平成|昭和|大正|明治|[RrHhSsTtMm])\s*(\d{1,2}|元)'
                 r'[-/年.](\d{1,2})[-/月.](\d{1,2})', s)
    if m:
        base = _WAREKI.get(m.group(1).lower())
        if base:
            yy = 1 if m.group(2) == '元' else int(m.group(2))
            return _ymd(base + yy, m.group(3), m.group(4))
    m = re.match(r'^(\d{1,2})[-/月.](\d{1,2})', s)      # 年のない「4/5」は年度から補う
    if m and fiscal_year:
        mo = int(m.group(1))
        return _ymd(fiscal_year if mo >= 4 else fiscal_year + 1, mo, m.group(2))
    return ''


def _ymd(y, m, d):
    try:
        return date(int(y), int(m), int(d)).strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        return ''


def parse_amount_cell(v):
    """セルの値を整数(円)にする。8,800 / ¥8,800 / ▲5,000 / (5,000) / 全角 に対応"""
    if v is None or v == '':
        return 0
    if isinstance(v, (int, float)):
        return int(round(float(v)))
    s = unicodedata.normalize('NFKC', str(v))
    s = re.sub(r'[,\s　¥円]', '', s)
    sign = 1
    if re.match(r'^[(（].*[)）]$', s):
        sign, s = -1, s[1:-1]
    if re.match(r'^[▲△−–—-]', s):
        sign, s = -1, re.sub(r'^[▲△−–—-]', '', s)
    try:
        return int(round(float(s))) * sign
    except ValueError:
        return 0


def parse_kind_cell(v):
    """「収入」「支出」などの区分欄を 'in' / 'out' にする"""
    s = _norm(v)
    if not s:
        return None
    if re.search(r'収入|入金|受入|借方|収|入|\+', s):
        return 'in'
    if re.search(r'支出|出金|払出|貸方|支|出|-|▲|△', s):
        return 'out'
    return None


def fiscal_year_of(date_str):
    """年度は4月はじまり（1〜3月は前の年の年度）"""
    m = re.match(r'^(\d{4})-(\d{2})', date_str or '')
    if not m:
        return None
    y, mo = int(m.group(1)), int(m.group(2))
    return y if mo >= 4 else y - 1


# ============================================================
# シートを読む
# ============================================================
def _grid(ws):
    return [list(r) for r in ws.iter_rows(
        min_row=1, max_row=min(ws.max_row or 0, MAX_ROWS),
        max_col=min(ws.max_column or 0, MAX_COLS), values_only=True)]


def _detect_header(grid, allow, need):
    """見出しの行と、どの列が何かを当てる。戻り: (行番号, {項目: 列番号}, 手ごたえ)"""
    best = (-1, {}, 0)
    for r in range(min(len(grid), 30)):
        mapping, used, score = {}, set(), 0
        for c, cell in enumerate(grid[r]):
            if cell is None or cell == '' or isinstance(cell, (int, float)):
                continue                               # 数字の行は見出しではない
            f = _field_of(cell, allow)
            if f and f not in mapping and c not in used:
                mapping[f] = c
                used.add(c)
                score += 1
        s = score + (10 if need(mapping) else 0)
        if s > best[2]:
            best = (r, mapping, s)
    return best


def _need_tx(m):
    return 'date' in m and ('income' in m or 'expense' in m or 'amount' in m)


def _need_tr(m):
    return 'date' in m and 'from' in m and 'to' in m and ('tramt' in m or 'amount' in m)


def _cell(row, mapping, field):
    c = mapping.get(field)
    return None if c is None or c >= len(row) else row[c]


def _text(row, mapping, field):
    v = _cell(row, mapping, field)
    return '' if v is None else str(v).strip()


def read_transactions(grid, header_row, mapping, fiscal_year=None):
    """取引の表 → ([{date, account, category, details, income, expense, event, memo}], 読み飛ばし)"""
    out, skipped = [], []
    for r in range(header_row + 1, len(grid)):
        row = grid[r]
        if not any(c is not None and c != '' for c in row):
            continue
        d = parse_date_cell(_cell(row, mapping, 'date'), fiscal_year)
        inc = parse_amount_cell(_cell(row, mapping, 'income')) if 'income' in mapping else 0
        exp = parse_amount_cell(_cell(row, mapping, 'expense')) if 'expense' in mapping else 0
        if inc <= 0 and exp <= 0 and 'amount' in mapping:
            a = parse_amount_cell(_cell(row, mapping, 'amount'))
            k = parse_kind_cell(_cell(row, mapping, 'kind')) if 'kind' in mapping else None
            if a:
                if k == 'out' or (k is None and a < 0):
                    exp = abs(a)
                else:
                    inc = abs(a)
        elif 'kind' in mapping and (inc > 0 or exp > 0):
            k = parse_kind_cell(_cell(row, mapping, 'kind'))
            if k == 'out' and inc > 0:
                inc, exp = 0, inc
            elif k == 'in' and exp > 0:
                inc, exp = exp, 0
        if not d:
            skipped.append((r + 1, '日付が読めません'))
            continue
        if inc <= 0 and exp <= 0:
            skipped.append((r + 1, '金額がありません'))
            continue
        out.append({'date': d,
                    'account':  _text(row, mapping, 'acc'),
                    'category': _text(row, mapping, 'cat'),
                    'details':  _text(row, mapping, 'note'),
                    'income':   max(inc, 0),
                    'expense':  max(exp, 0),
                    'event':    _text(row, mapping, 'event'),
                    'memo':     _text(row, mapping, 'memo'),
                    'row': r + 1})
    return out, skipped


def read_transfers(grid, header_row, mapping, fiscal_year=None):
    """振替の表 → ([{date, from_account, to_account, amount, details, memo}], 読み飛ばし)"""
    out, skipped = [], []
    for r in range(header_row + 1, len(grid)):
        row = grid[r]
        if not any(c is not None and c != '' for c in row):
            continue
        d = parse_date_cell(_cell(row, mapping, 'date'), fiscal_year)
        amt = abs(parse_amount_cell(
            _cell(row, mapping, 'tramt') if 'tramt' in mapping else _cell(row, mapping, 'amount')))
        fr, to = _text(row, mapping, 'from'), _text(row, mapping, 'to')
        if not d:
            skipped.append((r + 1, '日付が読めません'))
            continue
        if not amt or not fr or not to:
            skipped.append((r + 1, '振替元・振替先・金額がそろっていません'))
            continue
        out.append({'date': d, 'from_account': fr, 'to_account': to, 'amount': amt,
                    'details': _text(row, mapping, 'note'),
                    'memo': _text(row, mapping, 'memo'), 'row': r + 1})
    return out, skipped


def read_opening_balances(grid):
    """「口座／期首残高」の表 → {口座名: 金額}。見つからなければ {}"""
    for r in range(min(len(grid), 40)):
        row = grid[r]
        if len(row) < 2:
            continue
        if _field_of(row[0], ['acc']) == 'acc' and _field_of(row[1], ['opening']) == 'opening':
            out = {}
            for k in range(r + 1, len(grid)):
                rr = grid[k]
                name = '' if not rr or rr[0] is None else str(rr[0]).strip()
                if not name or _norm(name) == '合計':
                    break
                out[name] = parse_amount_cell(rr[1] if len(rr) > 1 else 0)
            return out
    return {}


# ============================================================
# ブック全体を読む
# ============================================================
class ImportPlan:
    """読み取った中身と、入れたときにどうなるかの見立て"""

    def __init__(self):
        self.transactions = []
        self.transfers = []
        self.openings = {}
        self.skipped = []          # [(取引|振替, 行番号, 理由)]
        self.fiscal_years = set()
        self.new_categories = []
        self.new_accounts = []
        self.dup_transactions = 0
        self.dup_transfers = 0
        self.locked_years = []     # 確定済みで入れられない年度

    @property
    def add_transactions(self):
        return len(self.transactions) - self.dup_transactions

    @property
    def add_transfers(self):
        return len(self.transfers) - self.dup_transfers


def read_workbook(path, fiscal_year=None):
    """.xlsx/.xlsm を読んで ImportPlan を返す（重複の数は examine() で入る）"""
    if not excel_available():
        raise RuntimeError('openpyxl が入っていないため、Excel を読み込めません。')
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    plan = ImportPlan()
    tx_best = (None, -1)
    tr_best = (None, -1)
    try:
        for ws in wb.worksheets:
            grid = _grid(ws)
            if not grid:
                continue
            hr, mp, sc = _detect_header(grid, TX_FIELDS, _need_tx)
            if _need_tx(mp) and sc > tx_best[1]:
                tx_best = ((grid, hr, mp), sc)
            hr2, mp2, sc2 = _detect_header(grid, TR_FIELDS, _need_tr)
            if _need_tr(mp2) and sc2 > tr_best[1]:
                tr_best = ((grid, hr2, mp2), sc2)
            if not plan.openings:
                plan.openings = read_opening_balances(grid)
    finally:
        wb.close()

    if tx_best[0]:
        grid, hr, mp = tx_best[0]
        rows, sk = read_transactions(grid, hr, mp, fiscal_year)
        plan.transactions = rows
        plan.skipped += [('取引', r, w) for r, w in sk]
    if tr_best[0]:
        grid, hr, mp = tr_best[0]
        rows, sk = read_transfers(grid, hr, mp, fiscal_year)
        plan.transfers = rows
        plan.skipped += [('振替', r, w) for r, w in sk]
    for t in plan.transactions + plan.transfers:
        y = fiscal_year_of(t['date'])
        if y is not None:
            plan.fiscal_years.add(y)
    return plan


# ============================================================
# いまの帳簿とくらべる
# ============================================================
def _tx_key(t):
    return (t['date'], (t.get('account') or '').strip(), (t.get('category') or '').strip(),
            (t.get('details') or '').strip(),
            int(t.get('income') or 0), int(t.get('expense') or 0))


def _tr_key(t):
    return (t['date'], (t.get('from_account') or '').strip(),
            (t.get('to_account') or '').strip(), int(t.get('amount') or 0))


def examine(db, plan):
    """重複の数・新しい科目や口座・確定済み年度を数える

    同じ内容の取引が2件ある帳面があるので、「いくつあるか」で突き合わせる。
    すでに1件あって Excel に2件あるなら、足りない1件だけを入れる。
    """
    from collections import Counter
    have_tx, have_tr = Counter(), Counter()
    for y in sorted(plan.fiscal_years):
        for r in db.get_transactions(y):
            have_tx[_tx_key({'date': r['date'], 'account': r['account_type'],
                             'category': r['category'], 'details': r['details'],
                             'income': r['income'], 'expense': r['expense']})] += 1
        for r in db.get_transfers(y):
            have_tr[_tr_key({'date': r['date'], 'from_account': r['from_account'],
                             'to_account': r['to_account'], 'amount': r['amount']})] += 1

    plan.dup_transactions = plan.dup_transfers = 0
    for t in plan.transactions:
        k = _tx_key(t)
        t['dup'] = have_tx[k] > 0
        if t['dup']:
            have_tx[k] -= 1
            plan.dup_transactions += 1
    for t in plan.transfers:
        k = _tr_key(t)
        t['dup'] = have_tr[k] > 0
        if t['dup']:
            have_tr[k] -= 1
            plan.dup_transfers += 1

    # 新しい科目・口座（CSV取り込みと同じく、口座は年度で絞らず全部と見くらべる）
    cats = set(db.get_category_names())
    accs = set(db.get_account_names())
    new_cats, new_accs = [], []
    for t in plan.transactions:
        if t.get('dup'):
            continue
        c = (t.get('category') or '').strip()
        if c and c not in cats and c not in new_cats:
            new_cats.append(c)
        a = (t.get('account') or '').strip()
        if a and a not in accs and a not in new_accs:
            new_accs.append(a)
    for t in plan.transfers:
        if t.get('dup'):
            continue
        for a in ((t.get('from_account') or '').strip(), (t.get('to_account') or '').strip()):
            if a and a not in accs and a not in new_accs:
                new_accs.append(a)
    for a in plan.openings:
        if a and a not in accs and a not in new_accs:
            new_accs.append(a)
    plan.new_categories = new_cats
    plan.new_accounts = new_accs

    plan.locked_years = [y for y in sorted(plan.fiscal_years) if db.is_year_closed(y)]
    return plan


# ============================================================
# 帳簿に入れる
# ============================================================
def apply_plan(db, plan, take_openings=True):
    """まとめて入れる。途中で失敗したらぜんぶ取り消す

    db.add_transaction / add_transfer をそのまま使うので、確定済み年度の判定
    （Database._assert_open）と変更履歴（audit_log）はアプリと同じように働く。
    commit=False で積んで、最後に1回だけ commit する。
    """
    added_tx = added_tr = 0
    prev_prefix = getattr(db, '_log_prefix', '')
    try:
        db._log_prefix = 'Excel取込: '
    except Exception:
        pass
    try:
        for name in plan.new_categories:
            try:
                db.add_category(name, commit=False)
            except Exception:
                pass                                   # すでにある等は気にしない
        for name in plan.new_accounts:
            try:
                db.add_account(name, commit=False)
            except Exception:
                pass
        for y in sorted(plan.fiscal_years):
            db.get_or_create_fiscal_year(y, commit=False)

        for t in plan.transactions:
            if t.get('dup'):
                continue
            db.add_transaction(fiscal_year_of(t['date']), t['date'], t['account'],
                               t['category'], t['details'], t['income'], t['expense'],
                               t['memo'], t['event'], commit=False)
            added_tx += 1
        for t in plan.transfers:
            if t.get('dup'):
                continue
            db.add_transfer(fiscal_year_of(t['date']), t['date'], t['from_account'],
                            t['to_account'], t['amount'], t['details'], t['memo'],
                            commit=False)
            added_tr += 1
        db.conn.commit()
    except Exception:
        db.conn.rollback()
        try:
            db._log_prefix = prev_prefix
        except Exception:
            pass
        raise

    # 期首残高は set_opening_balances 自身が commit するので、本体のあとに入れる
    # （変更履歴の前置きは、ここまで付けたままにする）
    opened = 0
    try:
        if take_openings and plan.openings:
            for y in sorted(plan.fiscal_years):
                try:
                    db.set_opening_balances(y, plan.openings)
                    opened += 1
                except Exception:
                    pass                               # 確定済み年度などは飛ばす
    finally:
        try:
            db._log_prefix = prev_prefix
        except Exception:
            pass
    return {'transactions': added_tx, 'transfers': added_tr,
            'dup_transactions': plan.dup_transactions, 'dup_transfers': plan.dup_transfers,
            'new_categories': plan.new_categories, 'new_accounts': plan.new_accounts,
            'opening_years': opened}


# ============================================================
# 画面（JichikaiApp に混ぜる）
# ============================================================
class ExcelImportMixin:
    """「データ ▼ → Excelを取り込み」"""

    def import_excel(self):
        from tkinter import filedialog, messagebox

        if not self._year_editable(what='Excelの取り込み'):
            return
        if not excel_available():
            messagebox.showerror(
                'Excel取込',
                'openpyxl が入っていないため、Excel を読み込めません。', parent=self.root)
            return

        path = filedialog.askopenfilename(
            title='取り込むExcelファイルを選択',
            filetypes=[('Excel ブック', '*.xlsx *.xlsm'), ('すべてのファイル', '*.*')],
            parent=self.root)
        if not path:
            return

        try:
            plan = read_workbook(path, self.current_fy.get())
        except Exception as e:
            messagebox.showerror(
                'Excel取込',
                'ファイルを読み込めませんでした。\n\n'
                '.xlsx か .xlsm を選んでください。\n'
                '（.xls のときは Excel で開いて .xlsx で保存しなおしてください）\n\n'
                f'{e}', parent=self.root)
            return

        if not plan.transactions and not plan.transfers:
            messagebox.showinfo(
                'Excel取込',
                '取り込める有効な行がありませんでした。\n\n'
                '「日付」と「収入・支出（または金額）」の見出しがある表を入れてください。',
                parent=self.root)
            return

        examine(self.db, plan)

        if plan.locked_years:
            messagebox.showwarning(
                '確定済みの年度',
                f'{"、".join(f"{y}年度" for y in plan.locked_years)}は確定済みのため、'
                '取り込めません。\n\n「年度 ▼」→「確定を解除する」で解除してから'
                '操作してください。', parent=self.root)
            return

        years = '、'.join(f'{y}年度' for y in sorted(plan.fiscal_years))
        msg = f'{os.path.basename(path)}\n\n'
        if years:
            msg += f'{years} のデータです。\n'
        msg += f'取引 {plan.add_transactions}件、振替 {plan.add_transfers}件 を取り込みます。\n'
        if plan.dup_transactions or plan.dup_transfers:
            msg += (f'（すでにある 取引 {plan.dup_transactions}件、'
                    f'振替 {plan.dup_transfers}件 はスキップ）\n')
        if plan.skipped:
            msg += f'（{len(plan.skipped)}件は形式不正のためスキップ）\n'
        if plan.new_categories:
            msg += f'新しい科目を追加: {"、".join(plan.new_categories)}\n'
        if plan.new_accounts:
            msg += f'新しい口座を追加: {"、".join(plan.new_accounts)}\n'
        if plan.openings:
            msg += ('期首残高も取り込みます: '
                    + '、'.join(f'{k} {v:,}' for k, v in plan.openings.items()) + '\n')
        msg += ('\n重複（同一日付・口座・科目・摘要・金額）は自動でスキップします。\n'
                '念のため取込前のバックアップを推奨します。\n\n続けますか？')
        if not messagebox.askyesno('Excel取込の確認', msg, parent=self.root):
            return

        try:
            res = apply_plan(self.db, plan)
        except Exception as e:
            messagebox.showerror(
                'Excel取込',
                f'取込中にエラーが発生したため、すべて取り消しました。\n\n{e}',
                parent=self.root)
            return

        added = res['transactions'] + res['transfers']
        for name in ('refresh_category_combos', 'refresh_account_combos', '_update_fy_list',
                     '_update_cmp_combo', 'refresh_list', 'refresh_balance', 'refresh_summary',
                     'refresh_cash_book', 'refresh_budget'):
            fn = getattr(self, name, None)
            if callable(fn):
                try:
                    fn()
                except Exception:
                    pass
        if hasattr(self, '_set_status'):
            self._set_status(f'✓ Excel取込: {added}件追加')

        extra = ''
        if res['new_categories']:
            extra += f'\n新しい科目を追加: {"、".join(res["new_categories"])}'
        if res['new_accounts']:
            extra += f'\n新しい口座を追加: {"、".join(res["new_accounts"])}'
        if res['opening_years']:
            extra += '\n期首残高を取り込みました'
        skipped = res['dup_transactions'] + res['dup_transfers']
        messagebox.showinfo(
            'Excel取込完了',
            f'{added}件を取り込みました。\n重複スキップ: {skipped}件'
            + (f'\n形式不正スキップ: {len(plan.skipped)}件' if plan.skipped else '')
            + extra, parent=self.root)
