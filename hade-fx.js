/* 🎆 ど派手の演出（v575。⏱ ど派手タイマー・🎉 ど派手カウンター で 使う。はじめて開いたときに読む）
   ・光の粒・紙ふぶき・絵文字・広がる輪・打ち上げ花火 を canvas に描く（粒は 多くても 900 まで。重くならないように）。
   ・背景（テーマ）：🎆 花火（夜空と町）・🌌 宇宙（星が 流れる。速さを 変えられる）・🌈 ネオン（光る道と 夕日）・
     🏮 お祭り（ちょうちんと 桜）・🔥 炎（強さを 変えられる）・🫧 ゆめかわ（色が かわる空と あわ）。
   ・音は WebAudio で その場で 作る（音のファイルは 使わない）。振動は 対応している端末だけ。
   ・演出の強さ：ひかえめ（粒を 少なく・画面の ゆれと 点滅なし）・ふつう・派手・ド派手・ドド派手（v576）。
     ド派手は 粒 1.6倍（多くて 1500）・背景に 回る 光のすじ・遠くの花火と 紙ふぶきが ふえる・ふちが 色に 光る。
     ドド派手は 粒 2.4倍（多くて 2200）・さらに 流れ星・光の輪・虹色に まわる ふち・大きな ゆれ。
     重くなったら（1こまが 45ミリ秒を こえる）粒の 上限を 自動で 下げる。
     画面の 点滅は やわらかく、1秒に 2回まで（まぶしすぎないように。どの強さでも）。
   ・⏰ 時間が 来た ときの 音（v580。ど派手タイマー）：🎺 ファンファーレ・⏰ 目覚まし（ジリリリ）・📟 ピピピ・🔔 チャイム（キーンコーン）・
     🎵 オルゴール（きらきら星）・🕊 はと時計（ポッポー）・🥁 太鼓（ドンドン カッ）・🎮 ゲーム（クリアの 音）・🐤 小鳥（チュンチュン）。
     1つの 音は 自分の 音の 道（bus）を 通すので、止める ときや 次の 音で すぐ 消せる。
   ・🎉 押した ときの 音（v583。ど派手カウンター）：🎈 ポン・🪙 チャリン・🥁 ドン・🎮 ピコッ・🔔 チーン・🎹 木琴（ドレミで 上がる）・
     👏 パチッ・💧 ぽちゃ・⚡ ピュン。どれも 短く、つづけて 押すと 音が 上がる ものも ある。
   ・👆 押した ところの 演出（v583）：✨ きらきら・🎲 サイコロ・🎆 花火・⭐ 星・💖 ハート・🫧 あわ・💥 どかん・🪙 コイン・🌸 花びら・🎊 紙ふぶき（E.tapFx）。
   ・🔊 演出の 音の セット（v583。ど派手タイマー）：🎆 花火（いままで）・🥁 和（太鼓・拍子木・鈴・笛）・🎮 ゲーム（ピコピコ）・🎹 楽器（木琴・ベル・ハープ）・
     🐤 自然（小鳥・水・風・かえる）・🚀 宇宙（ピュン・ビヨーン）・🔔 やさしい（ポン・チーン）。ドーン・パチパチ・のこり10秒の 音 などを セットごとに かえる（setSnd）。
   ・⏱ 1秒ごとの 音（v583）：🕰 チクタク・📟 ピッ・🥁 トン・🎹 ドレミ（だんだん 上がる）・💧 ぽちゃ（tickSnd）。 */
(function(){
'use strict';
if(window.HADE_FX) return;
const THEMES=[['hanabi','🎆 花火'],['uchu','🌌 宇宙'],['neon','🌈 ネオン'],['matsuri','🏮 お祭り'],['honoo','🔥 炎'],['yume','🫧 ゆめかわ']];
const LEVELS=[['calm','ひかえめ'],['norm','ふつう'],['max','派手'],['ultra','ド派手'],['mega','ドド派手']];
const PAL={
  hanabi:['#ff3b6b','#ffd23f','#3ee8ff','#9dff5c','#ff8a3d','#ffffff','#c77dff'],
  uchu:['#9fd8ff','#ffffff','#c7a6ff','#6cf0ff','#ffd6f5','#7aa2ff'],
  neon:['#ff2bd6','#00f0ff','#fffb00','#7cff00','#ff6a00','#b026ff'],
  matsuri:['#ff4040','#ffcc33','#ffffff','#ff8fb1','#ff7a00','#ffe9a8'],
  honoo:['#fff1a8','#ffd000','#ff8a00','#ff4500','#ff2d55','#ffffff'],
  yume:['#ff9ad5','#b9a3ff','#8fe8ff','#fff59a','#a8ffcf','#ffffff'],
};
// 大きな数字の 色（上・下）と 光の色
const INK={
  hanabi:['#ffffff','#ffd23f','#ff9f43'], uchu:['#ffffff','#9fd8ff','#6c8cff'], neon:['#e9fbff','#00f0ff','#ff2bd6'],
  matsuri:['#fff6e0','#ffcc33','#ff4040'], honoo:['#fff8d0','#ffb000','#ff4500'], yume:['#ffffff','#ffb3e6','#b28dff'],
};
const MUL={calm:0.35, norm:0.7, max:1, ultra:1.6, mega:2.4};
const CAP={calm:500, norm:700, max:900, ultra:1500, mega:2200};   // 粒の 上限（重いときは 自動で 下げる）
const TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const hasTheme=t=>THEMES.some(x=>x[0]===t), hasLevel=l=>LEVELS.some(x=>x[0]===l);

/* ───────── 音（WebAudio。押したときに 鳴らせるように する）───────── */
let AC=null, OUT=null, NOISE=null, BUS=null, vol=0.8, muted=false;   // BUS：いま 鳴らす 音の 道（時間が 来た 音。v580）
const played=[];   // 鳴らした音（たしかめ用。新しい 40 個）
function ctx(){
  if(!AC){
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
    try{ AC=new C(); OUT=AC.createGain(); OUT.gain.value=vol; OUT.connect(AC.destination); }catch(_){ AC=null; return null; }
  }
  if(AC.state==='suspended'){ try{ AC.resume(); }catch(_){} }
  return AC;
}
function note(name){ played.push(name); if(played.length>40) played.shift(); }
function env(g, t0, a, d, peak){ g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak), t0+a); g.gain.exponentialRampToValueAtTime(0.0001, t0+a+d); }
function osc(type, f, t0, dur, peak, f2){
  const a=ctx(); if(!a) return;
  try{ const o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.setValueAtTime(f, t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t0+dur);
    env(g, t0, 0.008, dur, peak); o.connect(g); g.connect(BUS||OUT); o.start(t0); o.stop(t0+dur+0.05); }catch(_){}
}
function noiseBuf(a){
  if(NOISE) return NOISE;
  const n=Math.floor(a.sampleRate*0.6), b=a.createBuffer(1, n, a.sampleRate), ch=b.getChannelData(0);
  for(let i=0;i<n;i++) ch[i]=Math.random()*2-1;
  return (NOISE=b);
}
function nz(t0, dur, peak, type, f, f2, q){
  const a=ctx(); if(!a) return;
  try{ const s=a.createBufferSource(); s.buffer=noiseBuf(a); s.loop=true;
    const fl=a.createBiquadFilter(); fl.type=type||'lowpass'; fl.frequency.setValueAtTime(f||1200, t0); if(f2) fl.frequency.exponentialRampToValueAtTime(f2, t0+dur); fl.Q.value=q||0.8;
    const g=a.createGain(); env(g, t0, 0.005, dur, peak); s.connect(fl); fl.connect(g); g.connect(BUS||OUT); s.start(t0); s.stop(t0+dur+0.05); }catch(_){}
}
const T0=()=>{ const a=ctx(); return a ? a.currentTime+0.01 : 0; };
const midi=m=>440*Math.pow(2, (m-69)/12);
const PENTA=[0,2,4,7,9];
// 音を 鳴らす（鳴らさない設定でも 記録だけは 残す）
const S=(name, fn)=>function(...a){ note(name); if(muted) return; const t=T0(); if(!AC) return; fn(t, ...a); };
const SND={
  tick:S('tick', t=>{ nz(t, 0.03, 0.22, 'bandpass', 4200, null, 6); }),
  beep:S('beep', (t, f, d)=>{ osc('sine', f||880, t, d||0.12, 0.32); osc('triangle', (f||880)*2, t, (d||0.12)*0.6, 0.06); }),
  pop:S('pop', (t, i)=>{ const k=Math.max(0, i|0), m=72+PENTA[k%5]+12*Math.min(2, Math.floor(k/5)); osc('triangle', midi(m), t, 0.13, 0.36, midi(m)*1.45); nz(t, 0.035, 0.12, 'highpass', 2600); }),
  down:S('down', t=>{ osc('sine', 560, t, 0.2, 0.3, 240); }),
  whoosh:S('whoosh', t=>{ nz(t, 0.65, 0.32, 'bandpass', 280, 3400, 1.3); }),
  boom:S('boom', t=>{ nz(t, 0.95, 0.55, 'lowpass', 1100, 70); osc('sine', 95, t, 0.7, 0.55, 38); }),
  crackle:S('crackle', t=>{ for(let i=0;i<12;i++) nz(t+Math.random()*0.55, 0.02, 0.2, 'highpass', 3200); }),
  heart:S('heart', t=>{ osc('sine', 72, t, 0.13, 0.75, 48); osc('sine', 66, t+0.19, 0.15, 0.6, 44); }),
  taiko:S('taiko', t=>{ osc('sine', 120, t, 0.42, 0.85, 52); nz(t, 0.09, 0.42, 'lowpass', 700); }),
  coin:S('coin', t=>{ osc('square', midi(83), t, 0.08, 0.14); osc('square', midi(88), t+0.08, 0.32, 0.14); }),
  level:S('level', t=>{ [72,76,79,84,88].forEach((m,i)=>osc('triangle', midi(m), t+i*0.06, 0.16, 0.3)); }),
  whistle:S('whistle', t=>{ osc('sine', 2300, t, 0.32, 0.22, 2650); osc('sine', 2450, t+0.34, 0.45, 0.2, 2200); }),
  chime:S('chime', t=>{ osc('sine', midi(88), t, 0.9, 0.22); osc('sine', midi(84), t+0.22, 1.1, 0.2); }),
  alarm:S('alarm', t=>{ for(let i=0;i<3;i++){ osc('square', 880, t+i*0.32, 0.13, 0.12); osc('square', 660, t+i*0.32+0.15, 0.13, 0.12); } }),
  fanfare:S('fanfare', t=>{
    const q=0.12, seq=[[67,0,1],[67,1,1],[67,2,1],[72,3,3],[64,6,1],[67,7,1],[72,8,6]];
    seq.forEach(([m,at,len])=>{ osc('square', midi(m), t+at*q, len*q, 0.12); osc('triangle', midi(m), t+at*q, len*q+0.05, 0.22); });
    [60,64,67,72].forEach(m=>{ osc('triangle', midi(m), t+8*q, 1.1, 0.14); });
    nz(t+8*q, 0.5, 0.18, 'highpass', 5000);
  }),
  drum:S('drum', (t, n)=>{ const k=Math.max(4, Math.min(40, n|0||16)); for(let i=0;i<k;i++) nz(t+i*0.045, 0.04, 0.12+0.2*i/k, 'bandpass', 1800, null, 1.2); }),
  poyon:S('poyon', (t, k)=>{ const f=(k|0)>1 ? 330 : 400; osc('sine', f*1.4, t, 0.1, 0.3, f*0.6); osc('sine', f, t+0.09, 0.12, 0.22, f*0.66); osc('sine', f*0.86, t+0.2, 0.15, 0.14, f*0.64); osc('triangle', f*2.8, t, 0.05, 0.05, f*1.3); }),   // ぽよよん（🫧 ぽよん の 着地。v589）
  pecha:S('pecha', t=>{ nz(t, 0.1, 0.24, 'bandpass', 1500, 360, 1.4); osc('sine', 230, t, 0.08, 0.14, 110); }),   // ぺちゃ（🫧 ぽよん の 数字が つぶれる。v589）
};
/* ───────── ⏰ 時間が 来た ときの 音（v580。ど派手タイマー）───────── */
const TONES=[['fanfare','🎺 ファンファーレ'],['bell','⏰ 目覚まし'],['pipi','📟 ピピピ'],['chime','🔔 チャイム'],['orgel','🎵 オルゴール'],['hato','🕊 はと時計'],['taiko','🥁 太鼓'],['game','🎮 ゲーム'],['tori','🐤 小鳥']];
const TONE_PER={fanfare:2.6, bell:2.4, pipi:1.4, chime:7.2, orgel:6, hato:3.4, taiko:2.8, game:3.2, tori:2.8};   // くり返す 間（秒）
function bellHit(f, t0, k){ osc('sine', f, t0, 0.11, 0.07*k); osc('sine', f*1.48, t0, 0.08, 0.035*k); osc('sine', f*2.62, t0, 0.05, 0.018*k); }   // 目覚ましの ベルを 1回 たたく
function church(f, t0, dur){ osc('sine', f, t0, dur, 0.2); osc('sine', f*2, t0, dur*0.55, 0.07); osc('sine', f*3.01, t0, dur*0.3, 0.035); osc('sine', f*0.5, t0, dur*1.15, 0.05); }   // 鐘
function mbox(f, t0, k){ k=k||1; osc('sine', f, t0, 0.95, 0.15*k); osc('sine', f*4.02, t0, 0.14, 0.03*k); osc('triangle', f*2, t0, 0.35, 0.025*k); }   // オルゴールの 1音
function pipe(f, t0, dur){ osc('sine', f, t0, dur, 0.24); osc('triangle', f, t0, dur*0.9, 0.05); nz(t0, dur*0.7, 0.025, 'bandpass', f*2, null, 4); }   // はと時計の 笛
function don(t0, k){ osc('sine', 128, t0, 0.5, 0.85*k, 54); nz(t0, 0.11, 0.42*k, 'lowpass', 780); }   // 太鼓の ドン
function ka(t0){ nz(t0, 0.045, 0.3, 'bandpass', 2700, null, 5); osc('square', 1500, t0, 0.025, 0.05); }   // 太鼓の ふちの カッ
function chirp(t0, k){ osc('sine', 3200+k*250, t0, 0.06, 0.15, 5300+k*200); osc('sine', 5200, t0+0.06, 0.05, 0.08, 3700); }   // 小鳥の チュン
const TSND={
  bell:S('tBell', t=>{ for(let i=0;i<36;i++) bellHit(i%2 ? 2420 : 2750, t+i*0.042, i<3 ? 0.6+i*0.15 : 1); nz(t, 1.5, 0.035, 'bandpass', 3200, null, 2.5); }),
  pipi:S('tPipi', t=>{ for(let i=0;i<4;i++){ osc('square', 2050, t+i*0.14, 0.075, 0.06); osc('sine', 2050, t+i*0.14, 0.085, 0.2); } }),
  chime:S('tChime', t=>{ [76,72,74,67,67,74,76,72].forEach((m,i)=>church(midi(m), t+i*0.62, i===3 || i===7 ? 2.2 : 1.5)); }),
  orgel:S('tOrgel', t=>{ const q=0.3; [84,84,91,91,93,93,91,0,89,89,88,88,86,86,84].forEach((m,i)=>{ if(m) mbox(midi(m), t+i*q); }); [60,64,67,64,65,64,62,60].forEach((m,i)=>mbox(midi(m+12), t+i*q*2, 0.45)); }),
  hato:S('tHato', t=>{ for(let i=0;i<3;i++){ const at=t+i*0.95; pipe(midi(81), at, 0.2); pipe(midi(77), at+0.28, 0.42); } }),
  taiko:S('tTaiko', t=>{ [[0,1],[0.42,1],[0.84,0.75],[1.02,1]].forEach(([at,k])=>don(t+at, k)); ka(t+1.44); ka(t+1.62); don(t+1.86, 1); }),
  game:S('tGame', t=>{ const q=0.075; [[60,64,67,72],[62,65,69,74],[64,67,71,76]].forEach((row,j)=>row.forEach((m,i)=>osc('square', midi(m+12), t+(j*4+i)*q, q*0.9, 0.06)));
    [72,76,79,84].forEach(m=>{ osc('square', midi(m+12), t+12*q, 0.5, 0.045); osc('triangle', midi(m), t+12*q, 0.6, 0.08); }); osc('triangle', midi(48), t, 12*q, 0.12); }),
  tori:S('tTori', t=>{ [0,0.2,0.85,1.03,1.21].forEach((at,i)=>chirp(t+at, i%2)); }),
};
let tbus=null;
function toneStop(){ const b=tbus; tbus=null; if(b && AC){ try{ const n=AC.currentTime; b.gain.cancelScheduledValues(n); b.gain.setValueAtTime(b.gain.value, n); b.gain.linearRampToValueAtTime(0.0001, n+0.08); setTimeout(()=>{ try{ b.disconnect(); }catch(_){} }, 300); }catch(_){} } }
// first：はじめの 1回（ファンファーレは ファンファーレ、ほかは 同じ 音）・それ以外は くり返しの 音
function tone(k, first){
  toneStop();
  const a=ctx();
  if(a && !muted){ try{ tbus=a.createGain(); tbus.gain.value=1; tbus.connect(OUT); }catch(_){ tbus=null; } }
  BUS=tbus;
  try{ if(TSND[k]) TSND[k](); else (first ? SND.fanfare : SND.alarm)(); } finally { BUS=null; }
}
const tonePer=k=>TONE_PER[k]||2.6;
/* ───────── 🎉 押した ときの 音（v583。ど派手カウンター）───────── */
const TAPS=[['pop','🎈 ポン'],['coin','🪙 チャリン'],['taiko','🥁 ドン'],['piko','🎮 ピコッ'],['bell','🔔 チーン'],['mokkin','🎹 木琴'],['clap','👏 パチッ'],['water','💧 ぽちゃ'],['laser','⚡ ピュン']];
const SCALE=[0,2,4,5,7,9,11,12];   // ドレミファソラシド
const TAP_SND={
  pop:i=>SND.pop(i),
  coin:S('kCoin', (t, i)=>{ const u=Math.min(7, i|0); osc('square', midi(83+u), t, 0.05, 0.1); osc('square', midi(88+u), t+0.05, 0.17, 0.1); }),
  taiko:S('kTaiko', (t, i)=>{ if((i|0)%4===3) ka(t); else don(t, 0.8); }),   // 4回目ごとに カッ
  piko:S('kPiko', (t, i)=>{ const k=Math.max(0, i|0), m=72+PENTA[k%5]+12*Math.min(2, Math.floor(k/5)); osc('square', midi(m), t, 0.07, 0.075, midi(m+12)); }),
  bell:S('kBell', (t, i)=>{ const f=midi(84+PENTA[Math.max(0, i|0)%5]); osc('sine', f, t, 0.6, 0.17); osc('sine', f*2.76, t, 0.24, 0.05); osc('sine', f*5.4, t, 0.1, 0.02); }),
  mokkin:S('kMokkin', (t, i)=>{ const k=Math.max(0, i|0), f=midi(72+SCALE[k%8]+12*Math.min(1, Math.floor(k/8))); osc('sine', f, t, 0.26, 0.32); osc('sine', f*3.99, t, 0.04, 0.08); osc('triangle', f*2, t, 0.07, 0.05); }),
  clap:S('kClap', t=>{ [0, 0.011, 0.024].forEach((dl, j)=>nz(t+dl, 0.03+j*0.02, 0.3, 'bandpass', 1400, null, 1.2)); nz(t+0.03, 0.12, 0.06, 'bandpass', 1100, null, 0.8); }),
  water:S('kWater', (t, i)=>{ const f=380+(Math.max(0, i|0)%5)*55; osc('sine', f, t, 0.09, 0.34, f*2.8); osc('sine', f*1.6, t+0.035, 0.06, 0.09, f*3.4); }),
  laser:S('kLaser', t=>{ osc('sawtooth', 2000, t, 0.18, 0.05, 240); osc('sine', 1800, t, 0.16, 0.13, 220); }),
};
const hasTap=k=>TAPS.some(x=>x[0]===k);
function tapSnd(k, i){ (TAP_SND[k]||TAP_SND.pop)(i); }
/* ───────── 🔊 演出の 音の セット（v583。ど派手タイマー）─────────
   花火の 音（boom・crackle）・のこり10秒（heart・beep）・区切り（whoosh・level・coin・whistle・taiko・chime・drum・down・pop・tick）を セットごとに かえる */
const SSETS=[['hanabi','🎆 花火'],['wa','🥁 和'],['game','🎮 ゲーム'],['gakki','🎹 楽器'],['shizen','🐤 自然'],['uchu','🚀 宇宙'],['yasashi','🔔 やさしい']];
function mar(f, t0, k){ k=k||1; osc('sine', f, t0, 0.45, 0.28*k); osc('sine', f*3.99, t0, 0.05, 0.06*k); osc('triangle', f*2, t0, 0.08, 0.04*k); }   // 木琴の 1音
const kot=(f, t0, k)=>{ k=k||1; osc('triangle', f, t0, 0.5, 0.24*k); osc('sine', f*2, t0, 0.25, 0.06*k); nz(t0, 0.02, 0.05*k, 'highpass', 3000); };   // 琴の 1音
const SET_DEF={
  wa:{   // 太鼓・拍子木・鈴・笛・琴
    boom:t=>{ don(t, 1); don(t+0.13, 0.6); }, crackle:t=>{ ka(t); }, whoosh:t=>{ osc('sine', 900, t, 0.32, 0.12, 1700); nz(t, 0.3, 0.05, 'bandpass', 2000, null, 2); },
    beep:(t, f, d)=>{ nz(t, 0.03, 0.45, 'bandpass', 2600, null, 9); osc('triangle', (f||880)*1.5, t, 0.05, 0.12); }, heart:t=>{ don(t, 0.6); },
    level:t=>{ for(let i=0;i<6;i++) bellHit(3100+i*90, t+i*0.035, 0.9); }, coin:t=>{ bellHit(3000, t, 1); bellHit(3600, t+0.05, 0.8); },
    whistle:t=>{ pipe(midi(86), t, 0.28); pipe(midi(89), t+0.3, 0.4); }, tick:t=>{ ka(t); }, taiko:t=>{ don(t, 1); ka(t+0.26); },
    chime:t=>{ church(midi(55), t, 2.6); }, drum:(t, n)=>{ const k=Math.max(4, Math.min(40, n|0||16)); for(let i=0;i<k;i++) don(t+i*0.07, 0.25+0.5*i/k); },
    down:t=>{ don(t, 0.5); }, pop:(t, i)=>{ kot(midi(67+PENTA[Math.max(0, i|0)%5]), t); },
  },
  game:{   // ピコピコ（8ビット）
    boom:t=>{ osc('square', 110, t, 0.3, 0.12, 40); nz(t, 0.45, 0.3, 'lowpass', 3000, 300); }, crackle:t=>{ for(let i=0;i<4;i++) osc('square', midi(84+i*4), t+i*0.04, 0.03, 0.05); },
    whoosh:t=>{ osc('square', 200, t, 0.3, 0.06, 1600); }, beep:(t, f, d)=>{ osc('square', f||880, t, d||0.1, 0.09); }, heart:t=>{ osc('square', 196, t, 0.08, 0.08); osc('square', 165, t+0.1, 0.08, 0.08); },
    level:t=>{ [72,76,79,84,88,91].forEach((m,i)=>osc('square', midi(m), t+i*0.05, 0.06, 0.07)); }, coin:t=>{ osc('square', midi(83), t, 0.05, 0.1); osc('square', midi(88), t+0.05, 0.2, 0.1); },
    whistle:t=>{ osc('square', 400, t, 0.25, 0.06, 2000); }, tick:t=>{ osc('square', 1760, t, 0.02, 0.04); }, taiko:t=>{ osc('triangle', 110, t, 0.2, 0.3, 55); },
    chime:t=>{ [79,84,88,91].forEach((m,i)=>osc('square', midi(m), t+i*0.12, 0.2, 0.06)); }, drum:(t, n)=>{ const k=Math.max(4, Math.min(40, n|0||16)); for(let i=0;i<k;i++) osc('square', midi(60+(i%8)*2), t+i*0.045, 0.04, 0.05); },
    down:t=>{ osc('square', 600, t, 0.25, 0.07, 150); }, pop:(t, i)=>{ const m=72+PENTA[Math.max(0, i|0)%5]; osc('square', midi(m), t, 0.07, 0.07, midi(m+12)); },
  },
  gakki:{   // 木琴・ベル・ハープ・ティンパニ
    boom:t=>{ [48,55,64].forEach(m=>mar(midi(m), t, 1)); osc('sine', 98, t, 0.6, 0.35, 90); }, crackle:t=>{ [96,100,103].forEach((m,i)=>osc('sine', midi(m), t+i*0.05, 0.25, 0.06)); },
    whoosh:t=>{ [60,64,67,72,76,79,84].forEach((m,i)=>osc('triangle', midi(m), t+i*0.035, 0.35, 0.1)); }, beep:(t, f, d)=>{ mar(f||880, t, 0.9); }, heart:t=>{ mar(midi(48), t, 0.8); },
    level:t=>{ [72,76,79,84,88].forEach((m,i)=>{ mar(midi(m), t+i*0.07, 0.7); osc('sine', midi(m+12), t+i*0.07, 0.4, 0.04); }); }, coin:t=>{ osc('sine', midi(88), t, 0.45, 0.16); osc('sine', midi(88)*2.76, t, 0.15, 0.04); },
    whistle:t=>{ pipe(midi(84), t, 0.25); pipe(midi(88), t+0.25, 0.35); }, tick:t=>{ osc('sine', 1200, t, 0.04, 0.2); nz(t, 0.015, 0.06, 'bandpass', 2400, null, 4); }, taiko:t=>{ osc('sine', 98, t, 0.6, 0.6, 90); nz(t, 0.08, 0.2, 'lowpass', 600); },
    chime:t=>{ church(midi(76), t, 1.6); church(midi(72), t+0.4, 1.8); }, drum:(t, n)=>{ const k=Math.max(4, Math.min(40, n|0||16)); for(let i=0;i<k;i++) mar(midi(60+SCALE[i%8]+12*Math.floor(i/8%2)), t+i*0.05, 0.4); },
    down:t=>{ mar(midi(55), t, 0.6); mar(midi(48), t+0.12, 0.6); }, pop:(t, i)=>{ mar(midi(72+SCALE[Math.max(0, i|0)%8]), t, 0.8); },
  },
  shizen:{   // 小鳥・水・風・かえる・ししおどし
    boom:t=>{ nz(t, 0.9, 0.3, 'lowpass', 1500, 200); nz(t+0.05, 0.6, 0.12, 'bandpass', 700, 300, 1); }, crackle:t=>{ for(let i=0;i<3;i++){ const at=t+i*0.09+Math.random()*0.04, f=500+Math.random()*500; osc('sine', f, at, 0.07, 0.2, f*2.6); } },
    whoosh:t=>{ nz(t, 0.8, 0.22, 'bandpass', 400, 1200, 2); }, beep:(t, f, d)=>{ chirp(t, (f||880)>1000 ? 1 : 0); }, heart:t=>{ osc('square', 180, t, 0.08, 0.08, 140); osc('square', 200, t+0.1, 0.08, 0.06, 150); },
    level:t=>{ [0,0.12,0.24,0.5].forEach((d,i)=>chirp(t+d, i%2)); }, coin:t=>{ osc('sine', 500, t, 0.08, 0.3, 1400); },
    whistle:t=>{ osc('sine', 2000, t, 0.25, 0.15, 3000); osc('sine', 3000, t+0.28, 0.3, 0.12, 2200); }, tick:t=>{ osc('sine', 4200, t, 0.03, 0.05); osc('sine', 4200, t+0.05, 0.03, 0.05); },
    taiko:t=>{ osc('sine', 260, t, 0.25, 0.4, 200); nz(t, 0.05, 0.25, 'bandpass', 800, null, 3); }, chime:t=>{ [0,0.15,0.3,0.7,0.85,1.0].forEach((d,i)=>chirp(t+d, i%2)); },
    drum:(t, n)=>{ const k=Math.max(4, Math.min(40, n|0||16)); for(let i=0;i<k;i++){ const f=600+Math.random()*900; osc('sine', f, t+i*0.04+Math.random()*0.02, 0.04, 0.08, f*1.8); } },
    down:t=>{ osc('sine', 900, t, 0.2, 0.25, 300); }, pop:(t, i)=>{ const f=400+PENTA[Math.max(0, i|0)%5]*40; osc('sine', f, t, 0.08, 0.3, f*2.6); },
  },
  uchu:{   // ピュン・ビヨーン・ソナー
    boom:t=>{ osc('sawtooth', 1200, t, 0.5, 0.07, 60); nz(t, 0.6, 0.28, 'lowpass', 2000, 100); }, crackle:t=>{ for(let i=0;i<3;i++) osc('square', 2400-i*400, t+i*0.06, 0.05, 0.04, 800); },
    whoosh:t=>{ osc('sine', 150, t, 0.6, 0.2, 1800); osc('sine', 153, t, 0.6, 0.1, 1830); }, beep:(t, f, d)=>{ osc('sine', f||880, t, d||0.1, 0.25); osc('sine', f||880, t+0.12, d||0.1, 0.08); }, heart:t=>{ osc('sine', 880, t, 0.4, 0.15); },
    level:t=>{ osc('sine', 300, t, 0.5, 0.2, 2400); osc('triangle', 600, t, 0.5, 0.08, 4800); }, coin:t=>{ osc('square', 1800, t, 0.1, 0.06, 900); },
    whistle:t=>{ osc('sine', 2400, t, 0.3, 0.15, 400); }, tick:t=>{ osc('sine', 2400, t, 0.03, 0.08); }, taiko:t=>{ osc('sine', 80, t, 0.5, 0.6, 30); },
    chime:t=>{ [72,79,84,91].forEach((m,i)=>osc('sine', midi(m), t+i*0.18, 1.2, 0.1)); }, drum:(t, n)=>{ const k=Math.max(4, Math.min(40, n|0||16)); for(let i=0;i<k;i++) osc('sine', 300+i*60, t+i*0.04, 0.035, 0.08); },
    down:t=>{ osc('sine', 1200, t, 0.35, 0.18, 150); }, pop:(t, i)=>{ const f=midi(76+PENTA[Math.max(0, i|0)%5]); osc('sine', f, t, 0.1, 0.2, f*2); },
  },
  yasashi:{   // ポン・チーン（小さめ・やわらかい）
    boom:t=>{ osc('sine', 220, t, 0.45, 0.3, 160); }, crackle:t=>{ osc('sine', midi(96), t, 0.2, 0.05); }, whoosh:t=>{ nz(t, 0.4, 0.08, 'bandpass', 600, 1800, 1); },
    beep:(t, f, d)=>{ osc('sine', (f||880)*0.75, t, (d||0.1)*1.5, 0.18); }, heart:t=>{ osc('sine', 330, t, 0.2, 0.15); },
    level:t=>{ [72,76,79,84].forEach((m,i)=>osc('sine', midi(m), t+i*0.09, 0.5, 0.12)); }, coin:t=>{ osc('sine', midi(84), t, 0.5, 0.14); },
    whistle:t=>{ osc('sine', midi(79), t, 0.25, 0.12); osc('sine', midi(84), t+0.2, 0.35, 0.12); }, tick:t=>{ osc('sine', 1000, t, 0.03, 0.05); }, taiko:t=>{ osc('sine', 165, t, 0.4, 0.3, 120); },
    chime:t=>{ osc('sine', midi(84), t, 1.2, 0.12); osc('sine', midi(79), t+0.3, 1.4, 0.12); }, drum:(t, n)=>{ const k=Math.max(4, Math.min(40, n|0||16)); for(let i=0;i<k;i++) osc('sine', 1000+i*20, t+i*0.06, 0.03, 0.04); },
    down:t=>{ osc('sine', 440, t, 0.3, 0.15, 330); }, pop:(t, i)=>{ osc('sine', midi(72+PENTA[Math.max(0, i|0)%5]), t, 0.18, 0.2); },
  },
};
const SET_SND={};
Object.keys(SET_DEF).forEach(k=>{ SET_SND[k]={}; Object.keys(SET_DEF[k]).forEach(n=>{ SET_SND[k][n]=S(k+':'+n, SET_DEF[k][n]); }); });
const hasSset=k=>SSETS.some(x=>x[0]===k);
// セットの 音を 鳴らす（花火 や セットに ない 音は いつもの 音）
function setSnd(set, name, ...a){ const m=SET_SND[set], f=m && m[name]; if(f) f(...a); else if(SND[name]) SND[name](...a); }
/* ───────── ⏱ 1秒ごとの 音（v583。ど派手タイマー）───────── */
const TICKS=[['none','なし'],['tiktak','🕰 チクタク'],['pi','📟 ピッ'],['ton','🥁 トン'],['doremi','🎹 ドレミ'],['pochi','💧 ぽちゃ']];
const TICK_SND={
  tiktak:S('s:tiktak', (t, n)=>{ const hi=(n|0)%2===0; nz(t, 0.02, 0.18, 'bandpass', hi ? 3400 : 2500, null, 7); osc('sine', hi ? 2200 : 1700, t, 0.02, 0.05); }),
  pi:S('s:pi', t=>{ osc('sine', 1760, t, 0.05, 0.1); }),
  ton:S('s:ton', t=>{ osc('sine', 180, t, 0.12, 0.35, 120); nz(t, 0.03, 0.08, 'lowpass', 900); }),
  doremi:S('s:doremi', (t, n)=>{ const k=Math.max(0, n|0)%14, m=60+SCALE[k<=7 ? k : 14-k]; mar(midi(m+12), t, 0.7); }),   // ドレミ…ド、シラソ…レ と 上って 下りる
  pochi:S('s:pochi', t=>{ osc('sine', 420, t, 0.07, 0.25, 1100); }),
};
const hasTick=k=>TICKS.some(x=>x[0]===k);
function tickSnd(k, n){ const f=TICK_SND[k]; if(f) f(n); }
function setVol(v){ vol=Math.max(0, Math.min(1, +v||0)); if(OUT) try{ OUT.gain.value=vol; }catch(_){} }
function setMute(b){ muted=!!b; }
function unlock(){ const a=ctx(); if(a && a.state!=='running'){ try{ a.resume(); }catch(_){} } }
function vib(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(_){} }

/* ───────── 粒と背景 ───────── */
function Engine(cv){
  this.cv=cv; this.g=cv.getContext('2d'); this.ps=[]; this.later=[];
  this.theme='hanabi'; this.level='max'; this.W=1; this.H=1; this.d=1; this.t=0; this.dt=0;
  this.warp=0; this.heat=0; this.pulse=0; this.amb=0;   // 宇宙の速さ・炎の強さ・ネオンの明るさ（0〜1）・背景の 小さな花火など
  this.shake=0; this.flashA=0; this.flashCol='#ffffff'; this.lastFlash=-9; this.noFlash=false; this.cap=CAP.max; this.avg=0.016;
  this.stars=[]; this.petals=[]; this.blobs=[]; this.bubbles=[]; this.cityCv=null;
  this.resize();
}
const E=Engine.prototype;
E.resize=function(){
  const r=this.cv.getBoundingClientRect(), d=Math.min(2, window.devicePixelRatio||1);
  const W=Math.max(1, Math.round((r.width||this.cv.clientWidth||1)*d)), H=Math.max(1, Math.round((r.height||this.cv.clientHeight||1)*d));
  if(W!==this.cv.width || H!==this.cv.height){ this.cv.width=W; this.cv.height=H; }
  const same=W===this.W && H===this.H && this.stars.length;
  this.W=W; this.H=H; this.d=d;
  if(!same) this.initBg();
};
E.setTheme=function(t){ if(hasTheme(t)) this.theme=t; };
E.setLevel=function(l){ if(hasLevel(l) && l!==this.level){ this.level=l; this.cap=CAP[l]; } };
E.k=function(){ return MUL[this.level]||1; };
E.boost=function(){ return this.level==='mega' ? 2 : this.level==='ultra' ? 1 : 0; };   // ド派手 1・ドド派手 2
E.n=function(n){ return Math.max(1, Math.round(n*this.k())); };
E.pal=function(){ return PAL[this.theme]||PAL.hanabi; };
E.ink=function(){ return INK[this.theme]||INK.hanabi; };
E.count=function(){ return this.ps.length; };
E.clear=function(){ this.ps.length=0; this.later.length=0; this.shake=0; this.flashA=0; };
E.add=function(p){ if(this.ps.length>=this.cap) return null; this.ps.push(p); return p; };
E.after=function(sec, fn){ this.later.push([this.t+sec, fn]); };
// 光の粒（x,y は canvas の点。速さは 点／秒）
E.spark=function(x, y, vx, vy, col, o){
  o=o||{};
  return this.add({k:'s', x, y, px:x, py:y, vx, vy, col, life:o.life||rnd(0.7,1.4), age:0, sz:(o.sz||rnd(1.6,3.2))*this.d,
    gr:o.gr!=null ? o.gr*this.d : 120*this.d, dr:o.dr||0.985, tr:!!o.tr, fl:!!o.fl});
};
E.burst=function(x, y, o){
  o=o||{}; const n=this.n(o.n||40), pal=o.pal||this.pal(), sp=(o.sp||320)*this.d;
  for(let i=0;i<n;i++){ const a=rnd(0,TAU), v=sp*rnd(0.25,1); this.spark(x, y, Math.cos(a)*v, Math.sin(a)*v, o.col||pick(pal), {life:rnd(0.5,1.1)*(o.life||1), gr:o.gr!=null?o.gr:200, tr:o.tr, sz:o.sz}); }
  if(o.ring!==false) this.ring(x, y, o.col||pick(pal), o.rs||1);
};
// 吸いこまれる 粒（へったとき）
E.implode=function(x, y, o){
  o=o||{}; const n=this.n(o.n||24), r0=(o.r||120)*this.d, pal=o.pal||this.pal();
  for(let i=0;i<n;i++){ const a=rnd(0,TAU), r=r0*rnd(0.6,1.2), T=rnd(0.3,0.5);
    this.spark(x+Math.cos(a)*r, y+Math.sin(a)*r, -Math.cos(a)*r/T, -Math.sin(a)*r/T, o.col||pick(pal), {life:T, gr:0, dr:1, sz:rnd(1.4,2.6)}); }
};
E.ring=function(x, y, col, s){ return this.add({k:'r', x, y, r:6*this.d, vr:(s||1)*520*this.d, w:(s||1)*7*this.d, col, life:0.55, age:0}); };
E.glow=function(x, y, r, col, life){ return this.add({k:'g', x, y, r:r*this.d, col, life:life||0.5, age:0}); };
E.text=function(x, y, s, o){ o=o||{}; return this.add({k:'t', x, y, vy:(o.vy!=null?o.vy:-90)*this.d, s:String(s), sz:(o.sz||28)*this.d, col:o.col||'#ffffff', grad:o.grad||null, rot:o.rot||0, pop:!!o.pop, life:o.life||1.1, age:0}); };
// 回る 光の すじ（まん中から）
E.beams=function(x, y, o){ o=o||{}; return this.add({k:'b', x, y, n:o.n||12, rot:o.rot||rnd(0,TAU), vr:o.vr!=null ? o.vr : 1.6, len:o.len||Math.hypot(this.W, this.H)*0.6, col:o.col||'#ffffff', life:o.life||1.1, age:0}); };
// 絵文字の 雨（上から 降る）
E.rain=function(ch, n, o){
  o=o||{}; n=this.n(n||16);
  for(let i=0;i<n;i++) this.add({k:'e', x:rnd(0,this.W), y:-rnd(20,this.H*0.4), vx:rnd(-40,40)*this.d, vy:rnd(140,320)*this.d, ch:Array.isArray(ch)?pick(ch):ch, sz:(o.sz||rnd(26,46))*this.d, rot:rnd(-0.6,0.6), vr:rnd(-3,3), gr:260*this.d, life:rnd(2.2,3.2), age:0});
};
// 流れ星（ななめに 光が 走る）
E.meteor=function(o){
  o=o||{}; const d=this.d, x=rnd(this.W*0.25,this.W*1.1), y=rnd(-this.H*0.08,this.H*0.35), v=rnd(900,1300)*d, an=Math.PI*rnd(0.68,0.78), vx=Math.cos(an)*v, vy=Math.sin(an)*v, col=o.col||'#e6f2ff';
  for(let i=0;i<10;i++) this.spark(x-vx*0.007*i, y-vy*0.007*i, vx, vy, i ? col : '#ffffff', {life:rnd(0.55,0.8), gr:0, dr:1, sz:2.8-i*0.18, tr:i===0});
};
// 光の うず（まわりながら 広がる 粒）
E.spiral=function(x, y, R, o){
  o=o||{}; const n=this.n(o.n||48), pal=o.pal||this.pal(), d=this.d;
  for(let i=0;i<n;i++){ const an=TAU*i/n*2, r=R*(0.3+0.7*i/n), v=rnd(220,360)*d;
    this.spark(x+Math.cos(an)*r, y+Math.sin(an)*r, -Math.sin(an)*v+Math.cos(an)*60*d, Math.cos(an)*v+Math.sin(an)*60*d, pick(pal), {life:rnd(0.6,1.0), gr:0, dr:0.97, sz:rnd(1.8,3), tr:true}); }
};
E.emoji=function(x, y, ch, o){
  o=o||{}; const n=this.n(o.n||8), sp=(o.sp||380)*this.d;
  for(let i=0;i<n;i++){ const a=o.up ? rnd(-Math.PI*0.88,-Math.PI*0.12) : rnd(0,TAU), v=sp*rnd(0.35,1);
    this.add({k:'e', x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, ch:Array.isArray(ch)?pick(ch):ch, sz:(o.sz||rnd(22,40))*this.d, rot:rnd(-0.6,0.6), vr:rnd(-4,4), gr:520*this.d, life:rnd(1.0,1.8), age:0}); }
};
// 紙ふぶき：x を 決めると そこから 上へ 吹き上げる。決めないと 上から 降る
E.confetti=function(n, o){
  o=o||{}; n=this.n(n||120); const pal=o.pal||this.pal();
  for(let i=0;i<n;i++){
    const fromPt=o.x!=null, x=fromPt ? o.x : rnd(0,this.W), y=fromPt ? o.y : rnd(-this.H*0.35, -10*this.d);
    const a=fromPt ? rnd(-Math.PI*0.92, -Math.PI*0.08) : Math.PI/2, v=fromPt ? rnd(380,980)*this.d : rnd(40,140)*this.d;
    this.add({k:'c', x, y, vx:Math.cos(a)*v+rnd(-40,40)*this.d, vy:Math.sin(a)*v, w:rnd(6,12)*this.d, h:rnd(10,18)*this.d, rot:rnd(0,TAU), vr:rnd(-9,9), sw:rnd(0,TAU),
      col:pick(pal), gr:300*this.d, life:o.life||rnd(3.2,5.2), age:0});
  }
};
// 打ち上げ花火：下から 上がって、高いところで 開く
const KINDS=['peony','peony','ring','willow','heart','double','crackle','star'];
E.shell=function(x, o){
  o=o||{}; const W=this.W, H=this.H, d=this.d;
  const tx=x!=null ? x : rnd(W*0.15, W*0.85), ty=o.y!=null ? o.y : rnd(H*0.12, H*0.42);
  const sx=tx+rnd(-40,40)*d, T=rnd(0.75,1.1), g=320*d, vy=((ty-H)-0.5*g*T*T)/T;
  return this.add({k:'h', x:sx, y:H+8*d, px:sx, py:H+8*d, vx:(tx-sx)/T, vy, gr:g, life:T, age:0, col:o.col||pick(this.pal()), kind:o.kind||pick(KINDS), sc:o.sc||1});
};
E.explode=function(x, y, col, kind, sc){
  const s=(sc||1)*this.d, pal=this.pal(), n=this.n(kind==='willow'?64:kind==='heart'?70:88), c2=pick(pal);
  this.glow(x, y, 110*(sc||1), col, 0.4);
  for(let i=0;i<n;i++){
    const a=TAU*i/n+rnd(-0.03,0.03); let v=rnd(170,260)*s, vx=Math.cos(a)*v, vy=Math.sin(a)*v, c=col, life=rnd(1.0,1.6), gr=90, tr=false, fl=false;
    if(kind==='ring'){ v=235*s; vx=Math.cos(a)*v; vy=Math.sin(a)*v*0.55; }
    else if(kind==='heart'){ const hx=16*Math.pow(Math.sin(a),3), hy=-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a)); vx=hx*13*s; vy=hy*13*s; c=i%3 ? '#ff5f9e' : '#ffd1e6'; gr=40; }
    else if(kind==='willow'){ c=i%4 ? '#ffd27a' : '#fff1c9'; life=rnd(2.0,2.8); gr=150; tr=true; vx*=0.85; vy*=0.85; }
    else if(kind==='double'){ c=i%2 ? col : c2; }
    else if(kind==='crackle'){ fl=true; }
    else if(kind==='star'){ const f=0.45+0.55*Math.abs(Math.cos(2.5*a)); vx*=f; vy*=f; }
    this.spark(x, y, vx, vy, c, {life, gr, tr, fl, dr:0.975, sz:rnd(2,3.4)});
  }
  if(kind==='crackle'){
    this.after(0.7, ()=>{ for(let j=0;j<this.n(18);j++) this.spark(x+rnd(-110,110)*s, y+rnd(-80,110)*s, 0, 0, '#ffffff', {life:0.22, gr:0, sz:rnd(1.6,2.6)}); if(this.onCrackle) this.onCrackle(); });
  }
};
// 👆 押した ところの 演出（v583。o：col 色・pal・emo 絵文字・combo）
const TAP_FX=[['kira','✨ きらきら'],['dice','🎲 サイコロ'],['hanabi','🎆 花火'],['star','⭐ 星'],['heart','💖 ハート'],['awa','🫧 あわ'],['dokan','💥 どかん'],['coin','🪙 コイン'],['hana','🌸 花びら'],['kami','🎊 紙ふぶき']];
const hasTapFx=k=>TAP_FX.some(x=>x[0]===k);
E.fly=function(x, y, ch, o){   // 絵文字を 1つ（向き・速さ・重さを 決めて）
  const d=this.d, a=o.a!=null ? o.a : rnd(-Math.PI*0.85, -Math.PI*0.15), v=(o.v!=null ? o.v : rnd(260,520))*d;
  return this.add({k:'e', x:x+(o.dx||0)*d, y:y+(o.dy||0)*d, vx:Math.cos(a)*v+(o.vx||0)*d, vy:Math.sin(a)*v+(o.vy||0)*d, ch:Array.isArray(ch) ? pick(ch) : ch, sz:(o.sz||30)*d, rot:o.rot!=null ? o.rot : rnd(-0.6,0.6), vr:o.vr!=null ? o.vr : rnd(-4,4), gr:(o.gr!=null ? o.gr : 520)*d, life:o.life||rnd(1.0,1.6), age:0});
};
E.tapFx=function(k, x, y, o){
  o=o||{}; const c=Math.max(1, o.combo||1), col=o.col||pick(this.pal()), big=c>=10 ? 2 : c>=5 ? 1 : 0;
  if(k==='dice'){   // サイコロが ころがる
    for(let i=0;i<this.n(2+big);i++) this.fly(x, y, '🎲', {v:rnd(280,560), sz:rnd(30,44), vr:rnd(-12,12), gr:900, life:rnd(1.0,1.5)});
    this.burst(x, y, {n:10, sp:260, pal:['#ffffff','#ff4040','#ffffff'], rs:0.7});
  } else if(k==='hanabi'){   // 押した ところで 花火が ひらく
    this.explode(x, y, col, pick(['peony','ring','star','double','crackle']), 0.62+Math.min(0.4, c*0.02));
  } else if(k==='star'){
    this.emoji(x, y, ['⭐','🌟','✨'], {n:4+big, sp:560, sz:30});
    this.burst(x, y, {n:16, sp:420, pal:['#fff36b','#ffd23f','#ffffff'], ring:false});
  } else if(k==='heart'){
    this.explode(x, y, '#ff5f9e', 'heart', 0.4+Math.min(0.3, c*0.015));
    for(let i=0;i<this.n(3);i++) this.fly(x, y, ['💖','💗','💕'], {a:-Math.PI/2, v:rnd(120,220), dx:rnd(-30,30), vx:rnd(-50,50), sz:rnd(24,36), vr:rnd(-1,1), gr:-30, life:rnd(1.1,1.6)});
  } else if(k==='awa'){   // あわが のぼる
    for(let i=0;i<this.n(6+2*big);i++) this.fly(x, y, '🫧', {a:-Math.PI/2, v:rnd(90,240), dx:rnd(-40,40), dy:rnd(-10,20), vx:rnd(-40,40), sz:rnd(18,40), rot:0, vr:rnd(-0.6,0.6), gr:-40, life:rnd(1.2,2.0)});
    this.ring(x, y, '#9fe8ff', 0.6);
  } else if(k==='dokan'){   // 衝撃の 輪
    this.ring(x, y, '#ffffff', 1.5); this.ring(x, y, col, 1.0); this.after(0.08, ()=>this.ring(x, y, '#ffb000', 1.9));
    this.glow(x, y, 140, '#ffd27a', 0.35); this.fly(x, y, '💥', {a:-Math.PI/2, v:40, sz:64, vr:0, gr:0, life:0.5});
    this.burst(x, y, {n:22, sp:620, pal:['#ffffff','#ffb000','#ff4500'], ring:false}); this.kick(0.25);
  } else if(k==='coin'){   // コインが 飛び出して 落ちる
    for(let i=0;i<this.n(4+big);i++) this.fly(x, y, '🪙', {a:rnd(-Math.PI*0.8,-Math.PI*0.2), v:rnd(360,640), sz:rnd(24,34), rot:0, vr:rnd(-14,14), gr:1100, life:rnd(1.0,1.4)});
    this.burst(x, y, {n:12, sp:300, pal:['#ffd23f','#fff3c4','#ffb000'], rs:0.6});
  } else if(k==='hana'){   // 花びらが 舞う
    for(let i=0;i<this.n(5+2*big);i++) this.fly(x, y, ['🌸','🌸','💮','🌼'], {a:rnd(0,TAU), v:rnd(80,260), vy:-80, sz:rnd(18,30), vr:rnd(-3,3), gr:120, life:rnd(1.4,2.2)});
    this.burst(x, y, {n:8, sp:200, pal:['#ffd1e6','#ffffff','#ff9ad5'], ring:false});
  } else if(k==='kami'){   // 紙ふぶきが 吹き上がる
    this.confetti(big ? 40 : 24, {x, y, life:2.2});
  } else {   // ✨ きらきら（いつもの）
    this.burst(x, y, {n:12+Math.min(48, c*2), sp:300+Math.min(400, c*12), pal:o.pal||[col,'#ffffff',col,this.pal()[0]], rs:0.8+Math.min(1, c/30)});
    this.emoji(x, y, o.emo||'✨', {n:big===2 ? 4 : big ? 2 : 1, sp:420, up:true, sz:34});
  }
};
// 画面を ゆらす・光らせる（ひかえめ・点滅なし では しない）
E.kick=function(s){ if(this.level!=='calm') this.shake=Math.min(1.2+0.4*this.boost(), this.shake+(s||0.5)*(1+0.25*this.boost())); };
E.flash=function(col, a){
  if(this.level==='calm' || this.noFlash) return false;
  if(this.t-this.lastFlash<0.5) return false;   // 1秒に 2回まで
  this.lastFlash=this.t; this.flashCol=col||'#ffffff'; this.flashA=Math.min(0.55, a||0.4); return true;
};
E.offset=function(){ if(this.shake<=0) return [0,0]; const m=this.shake*14*this.d*(1+0.35*this.boost()); return [rnd(-m,m), rnd(-m,m)]; };

E.step=function(dt){
  dt=Math.min(0.05, Math.max(0, dt||0)); this.t+=dt; this.dt=dt;
  if(dt>0){ this.avg=this.avg*0.95+dt*0.05; const top=CAP[this.level]||900;   // 重いときは 粒の 上限を 下げる・軽くなったら もどす
    if(this.avg>0.045 && this.cap>400) this.cap=Math.max(400, Math.round(this.cap*0.97)); else if(this.avg<0.024 && this.cap<top) this.cap=Math.min(top, this.cap+6); }
  if(this.later.length){ const now=this.t, due=this.later.filter(x=>x[0]<=now); this.later=this.later.filter(x=>x[0]>now); due.forEach(x=>{ try{ x[1](); }catch(_){} }); }
  this.ambient(dt);
  const ps=this.ps; let j=0;
  for(let i=0;i<ps.length;i++){
    const p=ps[i]; p.age+=dt;
    if(p.k==='h'){
      if(p.age>=p.life){ this.explode(p.x, p.y, p.col, p.kind, p.sc); if(this.onBoom) this.onBoom(p); continue; }
      p.px=p.x; p.py=p.y; p.vy+=p.gr*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
      if(Math.random()<0.7) this.spark(p.x, p.y, rnd(-18,18)*this.d, rnd(20,70)*this.d, '#ffcf8a', {life:0.35, gr:30, sz:1.3});
      ps[j++]=p; continue;
    }
    if(p.age>=p.life) continue;
    if(p.k==='s'){ const f=Math.pow(p.dr, dt*60); p.px=p.x; p.py=p.y; p.vx*=f; p.vy=p.vy*f+p.gr*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; }
    else if(p.k==='c'){ p.vx*=Math.pow(0.97, dt*60); p.vy=Math.min(p.vy*Math.pow(0.985, dt*60)+p.gr*dt, 170*this.d); p.sw+=dt*4; p.x+=p.vx*dt+Math.sin(p.sw)*28*this.d*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt; if(p.y>this.H+40*this.d) continue; }
    else if(p.k==='e'){ p.vy+=p.gr*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt; if(p.y>this.H+60*this.d) continue; }
    else if(p.k==='r'){ p.r+=p.vr*dt; p.vr*=Math.pow(0.9, dt*60); }
    else if(p.k==='t'){ p.y+=p.vy*dt; p.vy*=Math.pow(0.95, dt*60); }
    else if(p.k==='b'){ p.rot+=p.vr*dt; }
    ps[j++]=p;
  }
  ps.length=j;
  this.shake=Math.max(0, this.shake-dt*2.2); this.flashA=Math.max(0, this.flashA-dt*2.4); this.pulse=Math.max(0, this.pulse-dt*1.8);
};
// 背景の 小さな 動き（花火の テーマの 遠くの花火・炎の 火の粉・ゆめかわの きらきら）
E.ambient=function(dt){
  const a=this.amb*this.k(); if(a<=0) return;
  const b=this.boost();
  if(b>=1){   // ド派手：回る 光のすじ・遠くの花火・紙ふぶきが ちらちら
    this.beamT=(this.beamT||0)-dt;
    if(this.beamT<=0){ this.beamT=3.2; this.beams(this.W/2, this.H*0.47, {n:10+4*b, col:pick(this.pal()), life:3.4, vr:(Math.random()<0.5 ? -1 : 1)*0.6}); }
    if(Math.random()<dt*0.9*b*this.amb) this.shell(null, {sc:rnd(0.6,0.9)});
    if(Math.random()<dt*5*b) this.confetti(1);
  }
  if(b>=2){   // ドド派手：さらに 流れ星・光の輪
    this.ringT=(this.ringT||0)-dt;
    if(this.ringT<=0){ this.ringT=1.4; this.ring(rnd(this.W*0.1,this.W*0.9), rnd(this.H*0.1,this.H*0.6), pick(this.pal()), 1.3); }
    if(Math.random()<dt*1.6) this.meteor();
  }
  if(this.theme==='hanabi' && Math.random()<dt*0.9*a) this.shell(null, {sc:0.55, y:rnd(this.H*0.1, this.H*0.3)});
  else if(this.theme==='honoo' && Math.random()<dt*(10+30*this.heat)*a) this.spark(rnd(0,this.W), this.H+4*this.d, rnd(-30,30)*this.d, -rnd(90,260)*this.d*(0.6+this.heat), pick(['#ffb000','#ff6a00','#ffd36b']), {life:rnd(1,2.2), gr:-30, sz:rnd(1.2,2.4), dr:0.99});
  else if(this.theme==='yume' && Math.random()<dt*6*a) this.spark(rnd(0,this.W), rnd(0,this.H), 0, -20*this.d, '#ffffff', {life:0.8, gr:0, sz:rnd(1.4,2.8), fl:true});
  else if(this.theme==='uchu' && Math.random()<dt*0.25*a){ const x=rnd(0,this.W), y=rnd(0,this.H*0.5); for(let i=0;i<8;i++) this.spark(x-i*10*this.d, y-i*4*this.d, 900*this.d, 360*this.d, '#e6f2ff', {life:0.5, gr:0, dr:1, sz:2.2-i*0.2}); }
  else if(this.theme==='matsuri' && Math.random()<dt*0.35*a) this.shell(null, {sc:0.5, y:rnd(this.H*0.25, this.H*0.45), kind:pick(['peony','willow'])});
};
E.initBg=function(){
  const W=this.W, H=this.H, d=this.d;
  this.stars=Array.from({length:150}, ()=>({x:rnd(-1,1), y:rnd(-1,1), z:rnd(0.05,1), tw:rnd(0,TAU)}));
  this.petals=Array.from({length:28}, ()=>({x:rnd(0,W), y:rnd(0,H), s:rnd(5,10)*d, r:rnd(0,TAU), vr:rnd(-2,2), vx:rnd(-20,30)*d, vy:rnd(30,70)*d, ph:rnd(0,TAU)}));
  this.blobs=Array.from({length:36}, (_,i)=>({x:(i+rnd(0,1))/36, s:rnd(0.6,1.4), ph:rnd(0,1), sp:rnd(0.6,1.2)}));
  this.bubbles=Array.from({length:24}, ()=>({x:rnd(0,W), y:rnd(0,H), r:rnd(8,26)*d, vy:rnd(14,40)*d, ph:rnd(0,TAU), kind:pick(['o','o','♥','★'])}));
  // 町の影（花火の背景。窓の明かり）は 1枚に 描いておく
  try{
    const c=document.createElement('canvas'); c.width=W; c.height=Math.max(1, Math.round(H*0.2)); const g=c.getContext('2d'), h=c.height;
    let x=0; g.fillStyle='#05060f';
    const bs=[]; while(x<W){ const w=rnd(30,90)*d, bh=rnd(0.3,1)*h; bs.push([x,w,bh]); g.fillRect(x, h-bh, w+1, bh); x+=w; }
    g.fillStyle='rgba(255,214,120,.6)';
    bs.forEach(([bx,w,bh])=>{ for(let yy=h-bh+8*d; yy<h-6*d; yy+=13*d) for(let xx=bx+6*d; xx<bx+w-8*d; xx+=11*d) if(Math.random()<0.28) g.fillRect(xx, yy, 4*d, 6*d); });
    this.cityCv=c;
  }catch(_){ this.cityCv=null; }
};
function lg(g, x0, y0, x1, y1, stops){ const gr=g.createLinearGradient(x0,y0,x1,y1); stops.forEach((c,i)=>gr.addColorStop(i/(stops.length-1), c)); return gr; }
E.drawBg=function(){
  const g=this.g, W=this.W, H=this.H, d=this.d, t=this.t, dt=this.dt||0.016, th=this.theme, pu=this.pulse;
  g.save(); g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='source-over'; g.globalAlpha=1;
  if(th==='hanabi'){
    g.fillStyle=lg(g,0,0,0,H,['#03061a','#121541','#2b1b4c']); g.fillRect(0,0,W,H);
    g.fillStyle='#ffffff';
    for(const s of this.stars){ const a=(0.35+0.35*Math.sin(t*2+s.tw))*s.z; if(a<=0.02) continue; g.globalAlpha=a; g.fillRect((s.x*0.5+0.5)*W, (s.y*0.5+0.5)*H*0.75, 1.6*d, 1.6*d); }
    g.globalAlpha=1; if(this.cityCv) g.drawImage(this.cityCv, 0, H-this.cityCv.height);
  } else if(th==='uchu'){
    g.fillStyle='#02030c'; g.fillRect(0,0,W,H);
    g.globalCompositeOperation='lighter';
    for(const [cx,cy,r,c] of [[0.3+0.08*Math.sin(t*0.13), 0.35, 0.7, 'rgba(120,60,210,0.28)'], [0.72, 0.62+0.06*Math.cos(t*0.11), 0.6, 'rgba(40,110,230,0.24)']]){
      const R=Math.max(W,H)*r, gr=g.createRadialGradient(cx*W, cy*H, 0, cx*W, cy*H, R); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,W,H);
    }
    const sp=0.06+this.warp*1.5, f=Math.min(W,H)*0.55, cx=W/2, cy=H/2;
    g.strokeStyle='#dfefff'; g.fillStyle='#ffffff';
    for(const s of this.stars){
      const z0=s.z; s.z-=sp*dt; if(s.z<=0.03){ s.z=1; s.x=rnd(-1,1); s.y=rnd(-1,1); continue; }
      const x=cx+s.x*f/s.z, y=cy+s.y*f/s.z; if(x<-20||x>W+20||y<-20||y>H+20){ s.z=1; s.x=rnd(-1,1); s.y=rnd(-1,1); continue; }
      const a=Math.min(1, (1-s.z)*1.4); g.globalAlpha=a;
      if(this.warp>0.25){ const x0=cx+s.x*f/Math.min(1,z0+sp*0.08), y0=cy+s.y*f/Math.min(1,z0+sp*0.08); g.lineWidth=(1-s.z)*2.6*d; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x,y); g.stroke(); }
      else { const r=(1-s.z)*2.2*d+0.4; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); }
    }
  } else if(th==='neon'){
    const hz=H*0.58;
    g.fillStyle=lg(g,0,0,0,hz,['#080014','#24004a','#4d0066']); g.fillRect(0,0,W,hz);
    const R=Math.min(W,H)*0.24, sx=W/2, sy=hz-R*0.25;
    g.save(); g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.clip();
    g.fillStyle=lg(g,0,sy-R,0,sy+R,['#fff36b','#ff8a3d','#ff2bd6']); g.fillRect(sx-R, sy-R, 2*R, 2*R);
    g.fillStyle='#24004a'; for(let i=0;i<6;i++){ const yy=sy+R*0.1+i*R*0.16+((t*18*d)%(R*0.16)), hh=R*0.025*(i+1); g.fillRect(sx-R, yy, 2*R, hh); }
    g.restore();
    g.fillStyle='#07000f'; g.fillRect(0, hz, W, H-hz);
    g.globalCompositeOperation='lighter';
    const glowA=0.55+0.45*pu;
    g.strokeStyle='#ff2bd6'; g.lineWidth=Math.max(1, 2*d);
    const N=12, ph=(t*0.55*(1+pu))%1;
    for(let k=0;k<N;k++){ const u=(k+ph)/N, y=hz+(H-hz)*u*u; g.globalAlpha=glowA*Math.min(1, u*2.5); g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
    g.strokeStyle='#00f0ff';
    for(let j=-10;j<=10;j++){ g.globalAlpha=glowA*0.75; g.beginPath(); g.moveTo(W/2+j*W*0.03, hz); g.lineTo(W/2+j*W*0.22, H); g.stroke(); }
    g.globalAlpha=0.5*glowA; g.strokeStyle='#ff9bf0'; g.lineWidth=3*d; g.beginPath(); g.moveTo(0,hz); g.lineTo(W,hz); g.stroke();
  } else if(th==='matsuri'){
    g.fillStyle=lg(g,0,0,0,H,['#12081f','#2a0b25','#43101c']); g.fillRect(0,0,W,H);
    const n=Math.max(3, Math.round(W/(110*d))), y0=H*0.09, amp=0.12+0.25*pu;
    g.strokeStyle='rgba(255,255,255,.25)'; g.lineWidth=1.5*d; g.beginPath();
    for(let i=0;i<=40;i++){ const x=W*i/40, y=y0+Math.sin(Math.PI*i/40)*H*0.035; if(i) g.lineTo(x,y); else g.moveTo(x,y); } g.stroke();
    for(let i=0;i<n;i++){
      const x=W*(i+0.5)/n, y=y0+Math.sin(Math.PI*(i+0.5)/n)*H*0.035, ang=amp*Math.sin(t*1.7+i*0.9), L=26*d, rw=22*d, rh=30*d;
      g.save(); g.translate(x,y); g.rotate(ang);
      g.strokeStyle='rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(0,0); g.lineTo(0,L); g.stroke();
      g.globalCompositeOperation='lighter'; const gl=g.createRadialGradient(0, L+rh, 0, 0, L+rh, rh*2.6); gl.addColorStop(0,'rgba(255,120,60,.45)'); gl.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gl; g.fillRect(-rh*2.6, L+rh-rh*2.6, rh*5.2, rh*5.2);
      g.globalCompositeOperation='source-over';
      const bg=g.createLinearGradient(-rw,0,rw,0); bg.addColorStop(0,'#a3121b'); bg.addColorStop(0.5,'#ff4b3a'); bg.addColorStop(1,'#a3121b'); g.fillStyle=bg;
      g.beginPath(); g.ellipse(0, L+rh, rw, rh, 0, 0, TAU); g.fill();
      g.fillStyle='#1b1b1b'; g.fillRect(-rw*0.55, L+2*d, rw*1.1, 5*d); g.fillRect(-rw*0.55, L+2*rh-6*d, rw*1.1, 5*d);
      g.fillStyle='rgba(255,236,200,.9)'; g.font='bold '+Math.round(rh*0.75)+'px serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(i%2?'祭':'寿', 0, L+rh);
      g.restore();
    }
    g.fillStyle='#ffb7cf';
    for(const p of this.petals){
      p.x+=p.vx*dt+Math.sin(t*1.5+p.ph)*16*d*dt; p.y+=p.vy*dt*(1+pu); p.r+=p.vr*dt;
      if(p.y>H+12*d){ p.y=-10*d; p.x=rnd(0,W); } if(p.x>W+12*d) p.x=-10*d; if(p.x<-12*d) p.x=W+10*d;
      g.save(); g.translate(p.x,p.y); g.rotate(p.r); g.globalAlpha=0.85; g.beginPath(); g.ellipse(0,0,p.s,p.s*0.55,0,0,TAU); g.fill(); g.restore();
    }
  } else if(th==='honoo'){
    g.fillStyle=lg(g,0,0,0,H,['#060000','#1a0300','#3d0800']); g.fillRect(0,0,W,H);
    g.globalCompositeOperation='lighter';
    const ht=H*(0.32+0.45*this.heat), M=Math.min(W,H);
    for(const b of this.blobs){
      const ph=(t*0.55*b.sp*(1+this.heat)+b.ph)%1, x=b.x*W+Math.sin(t*2+b.ph*9)*16*d, y=H-ph*ht, r=(1-ph)*M*0.13*b.s*(0.75+this.heat*0.6);
      if(r<=1) continue;
      const c=ph<0.25 ? 'rgba(255,240,170,' : ph<0.55 ? 'rgba(255,150,30,' : 'rgba(255,60,20,';
      const gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0, c+(0.5*(1-ph))+')'); gr.addColorStop(1, c+'0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,2*r,2*r);
    }
  } else {   // yume
    const h=(t*12)%360;
    g.fillStyle=lg(g,0,0,W,H,['hsl('+h+',85%,84%)','hsl('+((h+60)%360)+',75%,80%)','hsl('+((h+140)%360)+',70%,82%)']); g.fillRect(0,0,W,H);
    g.font='bold '+Math.round(22*d)+'px sans-serif'; g.textAlign='center'; g.textBaseline='middle';
    for(const b of this.bubbles){
      b.y-=b.vy*dt*(1+pu); b.x+=Math.sin(t*1.2+b.ph)*12*d*dt; if(b.y<-30*d){ b.y=H+30*d; b.x=rnd(0,W); }
      g.globalAlpha=0.55;
      if(b.kind==='o'){ g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=2*d; g.beginPath(); g.arc(b.x,b.y,b.r,0,TAU); g.stroke(); g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.arc(b.x-b.r*0.35,b.y-b.r*0.35,b.r*0.25,0,TAU); g.fill(); }
      else { g.fillStyle='rgba(255,255,255,.85)'; g.fillText(b.kind, b.x, b.y); }
    }
  }
  const bo=this.boost();
  if(bo>=1){
    const h=(t*(bo>=2 ? 140 : 40))%360, a=(bo>=2 ? 0.26 : 0.14)+0.18*pu, gr=g.createRadialGradient(W/2, H/2, Math.min(W,H)*0.32, W/2, H/2, Math.max(W,H)*0.72);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'hsla('+h.toFixed(0)+',100%,60%,'+a.toFixed(3)+')');
    g.globalCompositeOperation='lighter'; g.globalAlpha=1; g.fillStyle=gr; g.fillRect(0, 0, W, H);
    if(bo>=2){ g.lineWidth=7*d; g.globalAlpha=0.55+0.3*pu; for(let i=0;i<4;i++){ g.strokeStyle='hsl('+((h+i*90)%360).toFixed(0)+',100%,60%)'; g.beginPath(); if(i===0){ g.moveTo(0,3*d); g.lineTo(W,3*d); } else if(i===1){ g.moveTo(W-3*d,0); g.lineTo(W-3*d,H); } else if(i===2){ g.moveTo(W,H-3*d); g.lineTo(0,H-3*d); } else { g.moveTo(3*d,H); g.lineTo(3*d,0); } g.stroke(); } }
  }
  g.restore();
};
// lightBg（v589）：明るい 地（🫧 ぽよん）では 光を 足さずに 色の まま 重ねる（白く とばない ように）
E.drawFx=function(){
  const g=this.g, d=this.d, ADD=this.lightBg ? 'source-over' : 'lighter', soft=this.lightBg ? 0.5 : 1, CLR=this.lightBg ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)';   // 明るい 地は 白へ ぼかす（にごらない ように）
  g.save();
  for(const p of this.ps){
    const a=Math.max(0, 1-p.age/p.life);
    if(p.k==='s'){
      g.globalCompositeOperation=ADD; g.globalAlpha=p.fl ? (Math.random()<0.5 ? a : a*0.15) : a; g.fillStyle=p.col;
      if(p.tr){ g.strokeStyle=p.col; g.lineWidth=p.sz*0.7; g.beginPath(); g.moveTo(p.px-(p.x-p.px)*4, p.py-(p.y-p.py)*4); g.lineTo(p.x,p.y); g.stroke(); }
      g.beginPath(); g.arc(p.x, p.y, p.sz*(0.55+0.45*a), 0, TAU); g.fill();
    } else if(p.k==='h'){
      g.globalCompositeOperation=ADD; g.globalAlpha=1; g.fillStyle=this.lightBg ? '#ff9f43' : '#fff3c4'; g.beginPath(); g.arc(p.x, p.y, 3*d, 0, TAU); g.fill();
    } else if(p.k==='g'){
      g.globalCompositeOperation=ADD; const r=p.r*(1+p.age/p.life*0.7), gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r); gr.addColorStop(0, p.col); gr.addColorStop(1, CLR);
      g.globalAlpha=a*0.8*soft; g.fillStyle=gr; g.fillRect(p.x-r, p.y-r, 2*r, 2*r);
    } else if(p.k==='r'){
      g.globalCompositeOperation=ADD; g.globalAlpha=a; g.strokeStyle=p.col; g.lineWidth=p.w*a+1; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.stroke();
    } else if(p.k==='c'){
      g.globalCompositeOperation='source-over'; g.globalAlpha=Math.min(1, a*2.5); g.fillStyle=p.col;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.cos(p.sw*1.6)||0.05); g.fillRect(-p.w/2, -p.h/2, p.w, p.h); g.restore();
    } else if(p.k==='e'){
      g.globalCompositeOperation='source-over'; g.globalAlpha=Math.min(1, a*2);
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.font=Math.round(p.sz)+'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(p.ch, 0, 0); g.restore();
    } else if(p.k==='t'){
      g.globalCompositeOperation='source-over'; g.globalAlpha=Math.min(1, a*1.6);
      const k=p.pop ? (p.age<0.14 ? 0.35+p.age/0.14*0.95 : 1.3-Math.min(0.3, (p.age-0.14)*1.5)) : 1+0.3*Math.max(0, 1-p.age*5), sz=Math.round(p.sz*k);
      g.save(); g.translate(p.x, p.y); if(p.rot) g.rotate(p.rot);
      g.font=(p.pop ? '900 ' : 'bold ')+sz+'px "Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif'; g.textAlign='center'; g.textBaseline='middle';
      g.lineJoin='round'; g.lineWidth=sz*(p.pop ? 0.2 : 0.16); g.strokeStyle=p.pop ? 'rgba(25,0,45,.88)' : 'rgba(0,0,0,.6)'; g.strokeText(p.s, 0, 0);
      let fill=p.col; if(p.grad){ const gr=g.createLinearGradient(0, -sz*0.5, 0, sz*0.5); p.grad.forEach((c,i)=>gr.addColorStop(i/Math.max(1, p.grad.length-1), c)); fill=gr; }
      g.fillStyle=fill; g.fillText(p.s, 0, 0); g.restore();
    } else if(p.k==='b'){
      g.globalCompositeOperation=ADD; g.globalAlpha=Math.sin(Math.PI*Math.min(1, p.age/p.life))*0.55*soft;
      const gr=g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.len); gr.addColorStop(0, p.col); gr.addColorStop(1, CLR); g.fillStyle=gr;
      const w=Math.PI/p.n*0.42; g.beginPath();
      for(let i=0;i<p.n;i++){ const an=p.rot+TAU*i/p.n; g.moveTo(p.x, p.y); g.arc(p.x, p.y, p.len, an-w, an+w); g.closePath(); }
      g.fill();
    }
  }
  g.restore();
  if(this.flashA>0){ g.save(); g.globalCompositeOperation='source-over'; g.globalAlpha=this.flashA; g.fillStyle=this.flashCol; g.fillRect(0,0,this.W,this.H); g.restore(); }
};
// まとめて ど派手に（終わったとき・目標を こえたとき）
E.finale=function(o){
  o=o||{}; const n=o.shells||10, dur=o.dur||3.2;
  for(let i=0;i<this.n(n);i++) this.after(rnd(0, dur), ()=>this.shell(null, {sc:rnd(0.9,1.3)}));
  this.confetti(o.conf||170);
  if(o.emo) this.emoji(this.W/2, this.H*0.95, o.emo, {n:16, up:true, sp:900, sz:40});
  this.kick(1); this.flash(o.flash||'#ffffff', 0.5);
  const b=this.boost();
  if(b>=1){ this.spiral(this.W/2, this.H*0.47, Math.min(this.W,this.H)*0.4, {n:70}); this.beams(this.W/2, this.H*0.47, {n:16, col:'#ffffff', life:2.2, vr:1.4}); this.after(0.8, ()=>this.confetti(o.conf||170)); }
  if(b>=2){ for(let i=0;i<8;i++) this.after(i*0.25, ()=>this.meteor()); if(o.emo) this.rain(o.emo, 24); this.after(1.6, ()=>{ for(let i=0;i<6;i++) this.shell(this.W*(0.1+0.8*i/5), {sc:1.3}); }); }
};

window.HADE_FX={ THEMES, LEVELS, PAL, INK, Engine, snd:SND, setVol, setMute, unlock, vib, played:()=>played.slice(), hasTheme, hasLevel,
  TONES, tone, toneStop, tonePer, TAPS, tapSnd, hasTap, TAP_FX, hasTapFx, SSETS, setSnd, hasSset, TICKS, tickSnd, hasTick,
  ctx:()=>!!ctx() };
})();
