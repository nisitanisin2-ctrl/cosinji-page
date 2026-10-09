/* ✍️かきじゅん帳：手書きの字を、常用漢字の筆順データと照らし合わせて候補を出す（app.js より先に読む） */
/* 手書き漢字認識（ストローク照合型）
   - 入力ストロークと各漢字の筆順データを、Hungarian 法で最適対応づけして距離を計算
   - 書き順・書く向きが違っても候補に出るよう、順序と向きは小さな減点にとどめる */
(function (G) {
  'use strict';
  var NP = 12;            // 1画あたりの再標本化点数
  var REV_PEN = 0.07;     // 逆向きに書いたときの減点
  var SKIP = 0.22;        // 画の過不足の基本減点
  var SKIP_LEN = 0.35;    // 過不足の画の長さに比例する減点
  var ORDER_W = 0.05;     // 書き順ちがいの減点（最大）
  var ASPECT_W = 0.04;

  function parsePath(d) {
    var t = d.match(/[MmCcSsLlHhVvQqTtZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
    var i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lcx = null, lcy = null, pts = [];
    function n() { return parseFloat(t[i++]); }
    function cubic(x0, y0, x1, y1, x2, y2, x3, y3) {
      for (var k = 1; k <= 8; k++) {
        var s = k / 8, m = 1 - s;
        pts.push([m * m * m * x0 + 3 * m * m * s * x1 + 3 * m * s * s * x2 + s * s * s * x3,
                  m * m * m * y0 + 3 * m * m * s * y1 + 3 * m * s * s * y2 + s * s * s * y3]);
      }
    }
    while (i < t.length) {
      var tk = t[i];
      if (/[A-Za-z]/.test(tk)) {
        cmd = tk; i++;
        if (cmd === 'Z' || cmd === 'z') { x = sx; y = sy; pts.push([x, y]); }
        continue;
      }
      var x1, y1, x2, y2, x3, y3;
      switch (cmd) {
        case 'M': x = n(); y = n(); sx = x; sy = y; pts.push([x, y]); cmd = 'L'; lcx = null; break;
        case 'm': x += n(); y += n(); sx = x; sy = y; pts.push([x, y]); cmd = 'l'; lcx = null; break;
        case 'L': x = n(); y = n(); pts.push([x, y]); lcx = null; break;
        case 'l': x += n(); y += n(); pts.push([x, y]); lcx = null; break;
        case 'H': x = n(); pts.push([x, y]); lcx = null; break;
        case 'h': x += n(); pts.push([x, y]); lcx = null; break;
        case 'V': y = n(); pts.push([x, y]); lcx = null; break;
        case 'v': y += n(); pts.push([x, y]); lcx = null; break;
        case 'C': x1 = n(); y1 = n(); x2 = n(); y2 = n(); x3 = n(); y3 = n();
          cubic(x, y, x1, y1, x2, y2, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; break;
        case 'c': x1 = x + n(); y1 = y + n(); x2 = x + n(); y2 = y + n(); x3 = x + n(); y3 = y + n();
          cubic(x, y, x1, y1, x2, y2, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; break;
        case 'S': x1 = lcx === null ? x : 2 * x - lcx; y1 = lcx === null ? y : 2 * y - lcy;
          x2 = n(); y2 = n(); x3 = n(); y3 = n();
          cubic(x, y, x1, y1, x2, y2, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; break;
        case 's': x1 = lcx === null ? x : 2 * x - lcx; y1 = lcx === null ? y : 2 * y - lcy;
          x2 = x + n(); y2 = y + n(); x3 = x + n(); y3 = y + n();
          cubic(x, y, x1, y1, x2, y2, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; break;
        case 'Q': x1 = n(); y1 = n(); x3 = n(); y3 = n();
          cubic(x, y, x + 2 / 3 * (x1 - x), y + 2 / 3 * (y1 - y), x3 + 2 / 3 * (x1 - x3), y3 + 2 / 3 * (y1 - y3), x3, y3);
          lcx = null; x = x3; y = y3; break;
        case 'q': x1 = x + n(); y1 = y + n(); x3 = x + n(); y3 = y + n();
          cubic(x, y, x + 2 / 3 * (x1 - x), y + 2 / 3 * (y1 - y), x3 + 2 / 3 * (x1 - x3), y3 + 2 / 3 * (y1 - y3), x3, y3);
          lcx = null; x = x3; y = y3; break;
        default: i++;
      }
    }
    return pts;
  }

  function polyLen(p) {
    var L = 0;
    for (var i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return L;
  }

  // 弧長で等間隔に n 点へ再標本化
  function resample(p, n) {
    var out = [];
    if (!p.length) return out;
    var total = polyLen(p);
    if (total < 1e-9 || p.length === 1) { for (var k = 0; k < n; k++) out.push([p[0][0], p[0][1]]); return out; }
    var step = total / (n - 1), acc = 0, j = 1, prev = p[0];
    out.push([p[0][0], p[0][1]]);
    var target = step;
    var segStart = p[0];
    while (out.length < n - 1 && j < p.length) {
      var q = p[j];
      var seg = Math.hypot(q[0] - segStart[0], q[1] - segStart[1]);
      if (acc + seg >= target && seg > 0) {
        var r = (target - acc) / seg;
        var np = [segStart[0] + r * (q[0] - segStart[0]), segStart[1] + r * (q[1] - segStart[1])];
        out.push(np);
        acc = target; segStart = np; target += step;
      } else {
        acc += seg; segStart = q; j++;
      }
    }
    while (out.length < n) out.push([p[p.length - 1][0], p[p.length - 1][1]]);
    return out;
  }

  // 全ストロークの外接矩形で正規化（縦横比は保持）
  function normalize(strokes, frame) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach(function (s) { s.forEach(function (p) {
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }); });
    var w = maxX - minX, h = maxY - minY;
    var sc = Math.max(w, h, frame * 0.25);
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var feats = strokes.map(function (s) {
      var r = resample(s, NP), f = new Float64Array(NP * 2);
      for (var k = 0; k < NP; k++) { f[2 * k] = (r[k][0] - cx) / sc; f[2 * k + 1] = (r[k][1] - cy) / sc; }
      return f;
    });
    var lens = strokes.map(function (s) { return polyLen(s) / sc; });
    return { f: feats, len: lens, aspect: Math.log((Math.max(w, frame * 0.05)) / (Math.max(h, frame * 0.05))) };
  }

  function dist(a, b, rev) {
    var s = 0;
    for (var k = 0; k < NP; k++) {
      var kb = rev ? NP - 1 - k : k;
      var dx = a[2 * k] - b[2 * kb], dy = a[2 * k + 1] - b[2 * kb + 1];
      s += Math.sqrt(dx * dx + dy * dy);
    }
    return s / NP;
  }

  // Hungarian 法（正方行列・最小化）
  function hungarian(c, K) {
    var INF = 1e18, u = new Float64Array(K + 1), v = new Float64Array(K + 1);
    var p = new Int32Array(K + 1), way = new Int32Array(K + 1);
    for (var i = 1; i <= K; i++) {
      p[0] = i; var j0 = 0;
      var minv = new Float64Array(K + 1).fill(INF), used = new Uint8Array(K + 1);
      do {
        used[j0] = 1; var i0 = p[j0], delta = INF, j1 = 0;
        for (var j = 1; j <= K; j++) if (!used[j]) {
          var cur = c[(i0 - 1) * K + (j - 1)] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (var jj = 0; jj <= K; jj++) {
          if (used[jj]) { u[p[jj]] += delta; v[jj] -= delta; } else minv[jj] -= delta;
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do { var jx = way[j0]; p[j0] = p[jx]; j0 = jx; } while (j0);
    }
    var match = new Int32Array(K); // match[row] = col
    for (var jy = 1; jy <= K; jy++) match[p[jy] - 1] = jy - 1;
    return match;
  }

  function compare(inp, ref) {
    var n = inp.f.length, m = ref.f.length, K = Math.max(n, m);
    var c = new Float64Array(K * K);
    for (var i = 0; i < K; i++) for (var j = 0; j < K; j++) {
      var v;
      if (i < n && j < m) v = Math.min(dist(inp.f[i], ref.f[j], false), dist(inp.f[i], ref.f[j], true) + REV_PEN);
      else if (i >= n && j < m) v = SKIP + SKIP_LEN * ref.len[j];
      else if (i < n) v = SKIP + SKIP_LEN * inp.len[i];
      else v = 0;
      c[i * K + j] = v < 1e6 ? v : 10;   // NaN 対策
    }
    var mt = hungarian(c, K), total = 0, seq = [];
    for (var r = 0; r < K; r++) { total += c[r * K + mt[r]]; if (r < n && mt[r] < m) seq.push(mt[r]); }
    var inv = 0, pairs = seq.length * (seq.length - 1) / 2;
    for (var a = 0; a < seq.length; a++) for (var b = a + 1; b < seq.length; b++) if (seq[a] > seq[b]) inv++;
    return total / K + (pairs ? ORDER_W * inv / pairs : 0) + ASPECT_W * Math.abs(inp.aspect - ref.aspect);
  }

  var CK = [0, Math.floor(NP / 2), NP - 1];
  function cdist(a, b) {
    var s1 = 0, s2 = 0;
    for (var q = 0; q < 3; q++) {
      var k = CK[q], kb = CK[2 - q];
      var dx = a[2 * k] - b[2 * k], dy = a[2 * k + 1] - b[2 * k + 1];
      s1 += Math.sqrt(dx * dx + dy * dy);
      dx = a[2 * k] - b[2 * kb]; dy = a[2 * k + 1] - b[2 * kb + 1];
      s2 += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.min(s1, s2 + REV_PEN * 3) / 3;
  }
  // 対称な最近傍距離（順序・対応の一意性は無視）
  function coarse(inp, ref) {
    var n = inp.f.length, m = ref.f.length, s = 0, i, j, best;
    var colBest = new Float64Array(m).fill(1e9);
    for (i = 0; i < n; i++) {
      best = 1e9;
      for (j = 0; j < m; j++) {
        var d = cdist(inp.f[i], ref.f[j]);
        if (d < best) best = d;
        if (d < colBest[j]) colBest[j] = d;
      }
      s += best;
    }
    for (j = 0; j < m; j++) s += colBest[j];
    return s / (n + m) + ASPECT_W * Math.abs(inp.aspect - ref.aspect);
  }

  function Recognizer(records) {
    this.refs = records.map(function (r) {
      var strokes = r.paths.map(parsePath);
      var nf = normalize(strokes, 109);
      nf.c = r.c; nf.n = strokes.length;
      return nf;
    });
  }
  Recognizer.prototype.recognize = function (strokes, frame, limit) {
    strokes = strokes.filter(function (s) { return s.length > 0; });
    if (!strokes.length) return [];
    var inp = normalize(strokes, frame || 300), n = strokes.length;
    var tol = n <= 3 ? 1 : n <= 9 ? 2 : 3;
    // 1段目：粗い照合（始点・中点・終点の最近傍距離）で候補を絞る
    var pre = [];
    for (var i = 0; i < this.refs.length; i++) {
      var ref = this.refs[i];
      if (Math.abs(ref.n - n) > tol) continue;
      pre.push([coarse(inp, ref) + 0.03 * Math.abs(ref.n - n), i]);
    }
    pre.sort(function (a, b) { return a[0] - b[0]; });
    // 2段目：Hungarian 法で精密に照合
    var res = [];
    for (var q = 0; q < Math.min(pre.length, 240); q++) {
      var rf = this.refs[pre[q][1]];
      res.push([compare(inp, rf) + 0.03 * Math.abs(rf.n - n), rf.c]);
    }
    res.sort(function (a, b) { return a[0] - b[0]; });
    return res.slice(0, limit || 12).map(function (x) { return { c: x[1], score: x[0] }; });
  };

  G.KRecog = { Recognizer: Recognizer, parsePath: parsePath, resample: resample, polyLen: polyLen };
})(typeof window !== 'undefined' ? window : globalThis);

