#!/bin/sh
# 菜園ノート（vigilant-parakeet）を、表電卓の道具「🌱 野菜」用に saien/ へ写す。
# 使い方：sh tests/sync-saien.sh [vigilant-parakeet の場所]（省略時は ../vigilant-parakeet）
# 写すのは画面に要るものだけ（service-worker・テスト・README は写さない。表電卓の service-worker がまとめてとっておく）
set -e
SRC="${1:-$(dirname "$0")/../../vigilant-parakeet}"
DST="$(dirname "$0")/../saien"
rm -rf "$DST"; mkdir -p "$DST/css" "$DST/js"
cp "$SRC/index.html" "$SRC/manifest.json" "$SRC/icon-192.png" "$SRC/icon-512.png" "$DST/"
cp "$SRC/css/style.css" "$DST/css/"
cp "$SRC"/js/*.js "$DST/js/"
( cd "$SRC" && git rev-parse --short HEAD 2>/dev/null ) > "$DST/FROM.txt" || true
echo "saien/ に写しました：$(ls "$DST"/js | tr '\n' ' ')"
