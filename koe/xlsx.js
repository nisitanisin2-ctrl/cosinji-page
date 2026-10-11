/* ════════════════════════════════════════════════════════════════
   📊 Excel（.xlsx）を作る（声の計算帳 v22）
   外部の部品なし。.xlsx は ZIP の中に XML を入れたものなので、ブラウザにある圧縮
   （CompressionStream。なければ圧縮しないで入れる）と、自分で書いた ZIP で作る。
   数は数のまま入れ、式（合計・残りなど）は計算した値もいっしょに入れておく
   （式を計算しないで開くアプリでも、値が見えるように）。
   使い方：KoeXlsx.build([{name, cols:[幅…], rows:[[セル…]…], merges:['A1:F1'], freeze:3}]) → Promise<Blob>
          セル：null（空）・数・文字・{v:値, f:'式（=なし）', s:'見た目の名前'}
   ════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  // 見た目（cellXfs の並び）。名前で指す
  const STYLE = { '': 0, title: 1, sub: 2, head: 3, yen: 4, yen2: 5, pct: 6, tot: 7, totYen: 8, totNum: 9, rest: 10, memo: 11, bold: 12, boldYen: 13, num: 14 };
  const STYLES = XML + '<styleSheet xmlns="' + NS + '">'
    + '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0;[Red]-#,##0"/></numFmts>'
    + '<fonts count="4">'
    + '<font><sz val="11"/><name val="游ゴシック"/><family val="3"/><charset val="128"/></font>'
    + '<font><b/><sz val="11"/><name val="游ゴシック"/><family val="3"/><charset val="128"/></font>'
    + '<font><b/><sz val="14"/><name val="游ゴシック"/><family val="3"/><charset val="128"/></font>'
    + '<font><sz val="10"/><color rgb="FF63746F"/><name val="游ゴシック"/><family val="3"/><charset val="128"/></font>'
    + '</fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
    + '<fill><patternFill patternType="solid"><fgColor rgb="FFDCEDEA"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>'
    + '<border><left/><right/><top/><bottom style="thin"><color rgb="FF8FB3AD"/></bottom><diagonal/></border>'
    + '<border><left/><right/><top style="thin"><color rgb="FF8FB3AD"/></top><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="15">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
    + '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>'
    + '<xf numFmtId="3" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>'
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>'
    + '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right"/></xf>'
    + '</cellXfs>'
    + '<cellStyles count="1"><cellStyle name="標準" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';

  // A, B, … Z, AA …
  function col(i) { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  // XML に入れられない文字を除いて、記号を置きかえる
  function esc(s) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function cellXml(ref, c) {
    if (c == null || c === '') return '';
    const o = (typeof c === 'object') ? c : { v: c };
    const s = STYLE[o.s || ''] || 0, sa = s ? ' s="' + s + '"' : '';
    if (o.f) {   // 式：計算した値もいっしょに
      const f = '<f>' + esc(o.f) + '</f>';
      if (typeof o.v === 'number' && isFinite(o.v)) return '<c r="' + ref + '"' + sa + '>' + f + '<v>' + o.v + '</v></c>';
      if (o.v != null && o.v !== '') return '<c r="' + ref + '"' + sa + ' t="str">' + f + '<v>' + esc(o.v) + '</v></c>';
      return '<c r="' + ref + '"' + sa + '>' + f + '</c>';
    }
    if (typeof o.v === 'number') return isFinite(o.v) ? '<c r="' + ref + '"' + sa + '><v>' + o.v + '</v></c>' : '';
    if (o.v == null || o.v === '') return s ? '<c r="' + ref + '"' + sa + '/>' : '';
    return '<c r="' + ref + '"' + sa + ' t="inlineStr"><is><t xml:space="preserve">' + esc(o.v) + '</t></is></c>';
  }
  function sheetXml(sh, idx) {
    const rows = sh.rows || [];
    const fr = sh.freeze || 0;
    const view = '<sheetViews><sheetView' + (idx ? '' : ' tabSelected="1"') + ' workbookViewId="0">'
      + (fr ? '<pane ySplit="' + fr + '" topLeftCell="A' + (fr + 1) + '" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A' + (fr + 1) + '" sqref="A' + (fr + 1) + '"/>' : '')
      + '</sheetView></sheetViews>';
    const cols = (sh.cols && sh.cols.length) ? '<cols>' + sh.cols.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' : '';
    const body = rows.map((r, ri) => {
      const cells = (r || []).map((c, ci) => cellXml(col(ci) + (ri + 1), c)).join('');
      const ht = (sh.heights && sh.heights[ri]) ? ' ht="' + sh.heights[ri] + '" customHeight="1"' : '';
      return '<row r="' + (ri + 1) + '"' + ht + '>' + cells + '</row>';
    }).join('');
    const merges = (sh.merges && sh.merges.length) ? '<mergeCells count="' + sh.merges.length + '">' + sh.merges.map(m => '<mergeCell ref="' + m + '"/>').join('') + '</mergeCells>' : '';
    return XML + '<worksheet xmlns="' + NS + '" xmlns:r="' + NS_R + '">'
      + '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
      + view + '<sheetFormatPr defaultRowHeight="18.75"/>' + cols
      + '<sheetData>' + body + '</sheetData>' + merges
      + '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
      + '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>'
      + '</worksheet>';
  }
  // シートの名前：Excel で使えない文字を除いて31文字まで
  function sheetName(s, i) { const n = String(s || '').replace(/[\\\/\?\*\[\]:]/g, '').slice(0, 31); return n || ('Sheet' + (i + 1)); }

  /* ── ZIP ── */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const u16 = n => [n & 0xFF, (n >> 8) & 0xFF];
  const u32 = n => { n >>>= 0; return [n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]; };
  async function deflate(u8) {
    if (typeof CompressionStream === 'undefined') return { data: u8, method: 0 };
    try {
      const cs = new CompressionStream('deflate-raw');
      const buf = await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer();
      return { data: new Uint8Array(buf), method: 8 };
    } catch (e) { return { data: u8, method: 0 }; }
  }
  async function zip(files) {
    const enc = new TextEncoder(), d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const parts = [], central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), raw = enc.encode(f.text), crc = crc32(raw);
      const { data, method } = await deflate(raw);
      parts.push(new Uint8Array([].concat(u32(0x04034b50), u16(20), u16(0), u16(method), u16(time), u16(date), u32(crc), u32(data.length), u32(raw.length), u16(name.length), u16(0))), name, data);
      central.push({ name, crc, comp: data.length, raw: raw.length, method, offset });
      offset += 30 + name.length + data.length;
    }
    const cd = []; let cdSize = 0;
    for (const c of central) {
      cd.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(c.method), u16(time), u16(date), u32(c.crc), u32(c.comp), u32(c.raw), u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset))), c.name);
      cdSize += 46 + c.name.length;
    }
    const end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(cdSize), u32(offset), u16(0)));
    return new Blob([...parts, ...cd, end], { type: MIME });
  }

  async function build(sheets) {
    const names = sheets.map((s, i) => sheetName(s.name, i));
    const wb = XML + '<workbook xmlns="' + NS + '" xmlns:r="' + NS_R + '"><bookViews><workbookView/></bookViews><sheets>'
      + names.map((n, i) => '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('')
      + '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>';
    const wbRels = XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + names.map((n, i) => '<Relationship Id="rId' + (i + 1) + '" Type="' + NS_R + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
      + '<Relationship Id="rId' + (names.length + 1) + '" Type="' + NS_R + '/styles" Target="styles.xml"/></Relationships>';
    const rootRels = XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="' + NS_R + '/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    const ct = XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + names.map((n, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
    const files = [{ name: '[Content_Types].xml', text: ct }, { name: '_rels/.rels', text: rootRels }, { name: 'xl/workbook.xml', text: wb },
      { name: 'xl/_rels/workbook.xml.rels', text: wbRels }, { name: 'xl/styles.xml', text: STYLES }];
    sheets.forEach((s, i) => files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: sheetXml(s, i) }));
    return zip(files);
  }

  root.KoeXlsx = { build, col, MIME, _sheetXml: sheetXml };
})(typeof window !== 'undefined' ? window : globalThis);
