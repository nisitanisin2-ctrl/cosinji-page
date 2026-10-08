/* 単元の 並び（学年ごと、教科書の 順に だいたい 合わせる）と、名前を かえた 単元（前の きろくを 引き継ぐ）。
   ここに ない 単元は、学年の さいごに 書いた 順で 並ぶ */
(function(){
'use strict';
const S = window.SANSU;
S.UNIT_RENAME = {'g6-speed': 'g5-speed'};   // v2：速さは 今の 教科書では 小5
const ORDER = [
  'g1-add10', 'g1-sub10', 'g1-carry', 'g1-borrow', 'g1-blank',
  'g2-add2', 'g2-sub2', 'g2-time', 'g2-length', 'g2-add3', 'g2-kuku', 'g2-kukublank',
  'g3-div', 'g3-divrem', 'g3-mul1', 'g3-unit', 'g3-dec', 'g3-frac', 'g3-mul22',
  'g4-div1', 'g4-angle', 'g4-div2', 'g4-order', 'g4-round', 'g4-area', 'g4-decmul', 'g4-mixed',
  'g5-volume', 'g5-decmul', 'g5-decdiv', 'g5-angsum', 'g5-gcdlcm', 'g5-reduce', 'g5-fracadd', 'g5-average', 'g5-speed', 'g5-areatri', 'g5-percent', 'g5-fracint', 'g5-circum',
  'g6-moji', 'g6-fracmul', 'g6-fracdiv', 'g6-ratio', 'g6-circle', 'g6-cases',
  'j1-addsub', 'j1-muldiv', 'j1-moji', 'j1-eq', 'j1-prop', 'j1-sector',
  'j2-poly', 'j2-simul', 'j2-linear', 'j2-angles', 'j2-prob',
  'j3-expand', 'j3-factor', 'j3-sqrt', 'j3-quad', 'j3-yax2', 'j3-similar', 'j3-pythag',
];
const pos = id => { const i = ORDER.indexOf(id); return i < 0 ? 1e6 : i; };
const k0 = new Map(S.UNITS.map((u, i) => [u, i]));
S.UNITS.sort((a, b) => a.g - b.g || pos(a.id) - pos(b.id) || k0.get(a) - k0.get(b));
})();
