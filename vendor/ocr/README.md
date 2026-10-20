# vendor/ocr — 📷 レシート読み取りで使う「文字を読む部品」

表電卓の道具「📷 レシート読み取り」（`receipt.js`）が、はじめて文字を読むときにだけ読み込みます。
写真はこの端末の中で読み取り、どこにも送りません。表電卓のほかの画面では読み込みません。

| ファイル | もと | ライセンス |
|---|---|---|
| `tesseract.min.js` `worker.min.js`（と `*.LICENSE.txt`） | npm `tesseract.js@7.0.0` の `dist/` | Apache-2.0（同梱の小さな部品は MIT・BSD-3-Clause。`*.LICENSE.txt` を参照） |
| `tesseract-core-simd-lstm.js/.wasm` `tesseract-core-lstm.js/.wasm` | npm `tesseract.js-core@7.0.0` | Apache-2.0（Tesseract OCR・Leptonica などを含む） |
| `jpn.traineddata.gz` | npm `@tesseract.js-data/jpn@1.0.0` の `4.0.0_best_int/`（Tesseract の日本語データ） | Apache-2.0（データ）・MIT（パッケージ） |
| `LICENSE` | `tesseract.js` / `tesseract.js-core` の Apache License 2.0 | — |

- どのファイルも、npm の配布物（tarball）の中身をそのまま置いています（書きかえていません）。
  取ってきた tarball の SHA-1 は npm の記録と同じでした：
  `tesseract.js-7.0.0.tgz` 4106fb6245efab40c57b94bc1798368807526be8、
  `tesseract.js-core-7.0.0.tgz` 596aa1ab5c130adab12f21059e6aa1a1cecc0bab、
  `jpn-1.0.0.tgz` 1ca0f67185d138d61ab3316175383b412aaca868。
- `.wasm` は 端末が SIMD を使えるときは `simd-lstm`、使えないときは `lstm` の方だけを読みます。
- service-worker.js は この フォルダを 版上げで消さない別の控え（`hyo-ocr-v1`）に入れます。部品を入れかえるときは、その名前の数字を上げます。
