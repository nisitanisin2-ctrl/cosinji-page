/* 🎵 音の道具（v668。表電卓の道具。はじめて 開いたときに 読む）
   ・🥁 メトロノーム：テンポ（20〜260）・拍子・1拍の 刻み・強い 拍・音の 種類・タップで テンポ。先読みで 鳴らすので ずれない
   ・🎸 チューナー：マイクで 音の 高さを 見る（ド〜シ・C4 など・セント・Hz）。ギター・ウクレレ・バイオリンの 弦・基準の A（430〜450Hz）・お手本の 音
   ・🎹 落ちてくる 音ゲー：上から 落ちて くる 音符に 合わせて 下の ボタンを 押すと、選んだ 音色で メロディーに なる
   ・🌈 光る ボタンの 音ゲー：色が 付いた ボタンを 押すと メロディーに なる（光る 輪が しぼんだ ときが ちょうど）
   ・曲は どれも 作者が 亡くなって 長い 年月が たった 曲（クラシック）や 昔から 伝わる 曲（民謡・わらべうた）の メロディーだけ。歌詞は 入れない
   ・音は Web Audio で その場で 作る（音の ファイルは 使わない）。中身は excalc_oto（この端末の中だけ）。 */
(function(){
'use strict';
const KEY='excalc_oto';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const toastS=(m,ms)=>{ if(typeof toast==='function') toast(m, ms||2400); };

/* ── 音の 名前 ── */
const PC_JA=['ド','ド♯','レ','レ♯','ミ','ファ','ファ♯','ソ','ソ♯','ラ','ラ♯','シ'];
const PC_EN=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const PC_COL=['#e53935','#f4511e','#fb8c00','#f9a825','#fdd835','#7cb342','#43a047','#00897b','#039be5','#1e88e5','#5e35b1','#8e24aa'];
function noteToMidi(s){   // "C4" "D#5" "Bb3"
  const m=/^([A-G])([#b]?)(-?\d)$/.exec(String(s).trim()); if(!m) return null;
  const base={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);
  return (+m[3]+1)*12+base;
}
const midiFreq=(n,a4)=>(a4||440)*Math.pow(2,(n-69)/12);
const midiName=n=>PC_EN[((n%12)+12)%12]+(Math.floor(n/12)-1);
const midiJa=n=>PC_JA[((n%12)+12)%12];

/* ── 曲（メロディーだけ。作者が 亡くなって 70年 より 長く たった 曲・昔から 伝わる 曲）──
   書き方：「音:長さ」を 空白で 区切る。長さは 拍（1＝4分音符）。R は 休み。 */
const SONGS=[
  {id:'kira', k:'C', t:'きらきら星', by:'フランスの 古い 歌', bpm:100, lv:1,
   n:'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2'},
  {id:'mary', k:'C', t:'メリーさんのひつじ', by:'アメリカの 古い 歌', bpm:110, lv:1,
   n:'E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:2 E4:1 G4:1 G4:2 E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:1 E4:1 D4:1 D4:1 E4:1 D4:1 C4:4'},
  {id:'kaeru', k:'C', t:'かえるの合唱', by:'ドイツの 古い 歌', bpm:110, lv:1,
   n:'C4:1 D4:1 E4:1 F4:1 E4:1 D4:1 C4:2 E4:1 F4:1 G4:1 A4:1 G4:1 F4:1 E4:2 C4:2 C4:2 C4:2 C4:2 C4:0.5 C4:0.5 D4:0.5 D4:0.5 E4:0.5 E4:0.5 F4:0.5 F4:0.5 E4:1 D4:1 C4:2'},
  {id:'chou', k:'C', t:'ちょうちょう', by:'ドイツの 古い 歌', bpm:120, lv:2,
   n:'G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 D4:1 E4:1 F4:1 G4:1 G4:1 G4:2 G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 E4:1 G4:1 G4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:1 D4:1 D4:1 E4:1 F4:2 E4:1 E4:1 E4:1 E4:1 E4:1 F4:1 G4:2 G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 E4:1 G4:1 G4:1 C4:4'},
  {id:'london', k:'C', t:'ロンドン橋', by:'イギリスの 古い 歌', bpm:110, lv:2,
   n:'G4:1.5 A4:0.5 G4:1 F4:1 E4:1 F4:1 G4:2 D4:1 E4:1 F4:2 E4:1 F4:1 G4:2 G4:1.5 A4:0.5 G4:1 F4:1 E4:1 F4:1 G4:2 D4:2 G4:2 E4:1 C4:3'},
  {id:'joy', k:'C', t:'よろこびの歌（第九）', by:'ベートーヴェン（1827年 没）', bpm:110, lv:2,
   n:'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2 D4:1 D4:1 E4:1 C4:1 D4:1 E4:0.5 F4:0.5 E4:1 C4:1 D4:1 E4:0.5 F4:0.5 E4:1 D4:1 C4:1 D4:1 G3:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2'},
  {id:'jingle', k:'C', t:'ジングルベル', by:'ピアポント（1893年 没）', bpm:130, lv:2,
   n:'G3:1 E4:1 D4:1 C4:1 G3:3 G3:0.5 G3:0.5 G3:1 E4:1 D4:1 C4:1 A3:4 A3:1 F4:1 E4:1 D4:1 B3:4 G4:1 G4:1 F4:1 D4:1 E4:4 G3:1 E4:1 D4:1 C4:1 G3:4 G3:1 E4:1 D4:1 C4:1 A3:3 A3:1 A3:1 F4:1 E4:1 D4:1 G4:1 G4:1 G4:1 G4:1 A4:1 G4:1 F4:1 D4:1 C4:3 R:1 E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 F4:1 F4:1 F4:1.5 F4:0.5 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2 E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 F4:1 F4:1 F4:1 F4:1 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 G4:1 G4:1 F4:1 D4:1 C4:4'},
  {id:'saints', k:'C', p:3, t:'聖者の行進', by:'アメリカの 古い 歌', bpm:120, lv:2,
   n:'C4:1 E4:1 F4:1 G4:4 R:1 C4:1 E4:1 F4:1 G4:4 R:1 C4:1 E4:1 F4:1 G4:2 E4:2 C4:2 E4:2 D4:4 R:1 E4:1 E4:1 D4:1 C4:3 C4:1 E4:2 G4:2 G4:1 F4:3 R:1 E4:1 F4:1 G4:2 E4:2 C4:2 D4:2 C4:4'},
  {id:'grace', k:'C', bar:3, p:1, t:'アメイジング・グレイス', by:'イギリスの 古い 歌', bpm:80, lv:2,
   n:'G3:1 C4:2 E4:0.5 C4:0.5 E4:2 D4:1 C4:2 A3:1 G3:2 G3:1 C4:2 E4:0.5 C4:0.5 E4:2 D4:1 G4:5 E4:1 G4:1.5 E4:0.5 G4:0.5 E4:0.5 C4:2 G3:1 A3:1.5 C4:0.5 C4:0.5 A3:0.5 G3:2 G3:1 C4:2 E4:0.5 C4:0.5 E4:2 D4:1 C4:3'},
  {id:'elise', k:'A', mi:true, bar:3, p:1, t:'エリーゼのために（はじめ）', by:'ベートーヴェン（1827年 没）', bpm:70, lv:3,
   n:'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 G#4:0.5 B4:0.5 C5:1.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 C5:0.5 B4:0.5 A4:1.5 B4:0.5 C5:0.5 D5:0.5 E5:1.5 G4:0.5 F5:0.5 E5:0.5 D5:1.5 F4:0.5 E5:0.5 D5:0.5 C5:1.5 E4:0.5 D5:0.5 C5:0.5 B4:1.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 G#4:0.5 B4:0.5 C5:1.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 C5:0.5 B4:0.5 A4:2'},
  {id:'minuet', k:'G', bar:3, t:'メヌエット ト長調', by:'ペツォールト（1733年 没）', bpm:110, lv:3,
   n:'D5:1 G4:0.5 A4:0.5 B4:0.5 C5:0.5 D5:1 G4:1 G4:1 E5:1 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 G5:1 G4:1 G4:1 C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 B4:1 C5:0.5 B4:0.5 A4:0.5 G4:0.5 F#4:1 G4:0.5 A4:0.5 B4:0.5 G4:0.5 A4:3 D5:1 G4:0.5 A4:0.5 B4:0.5 C5:0.5 D5:1 G4:1 G4:1 E5:1 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 G5:1 G4:1 G4:1 C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 B4:1 C5:0.5 B4:0.5 A4:0.5 G4:0.5 A4:1 B4:0.5 A4:0.5 G4:0.5 F#4:0.5 G4:3 B5:1 G5:0.5 A5:0.5 B5:0.5 G5:0.5 A5:1 D5:0.5 E5:0.5 F#5:0.5 D5:0.5 G5:1 E5:0.5 F#5:0.5 G5:0.5 D5:0.5 C#5:1 B4:0.5 C#5:0.5 A4:1 A4:0.5 B4:0.5 C#5:0.5 D5:0.5 E5:0.5 F#5:0.5 G5:1 F#5:1 E5:1 F#5:1 A4:1 C#5:1 D5:3 D5:1 G4:0.5 F#4:0.5 G4:1 E5:1 G4:0.5 F#4:0.5 G4:1 D5:1 C5:1 B4:1 A4:0.5 G4:0.5 F#4:0.5 G4:0.5 A4:1 D4:0.5 E4:0.5 F#4:0.5 G4:0.5 A4:0.5 B4:0.5 C5:1 B4:1 A4:1 B4:0.5 D5:0.5 G4:1 F#4:1 G4:3'},
  /* v673：ふやした 曲 */
  {id:'row', k:'C', bar:3, t:'こげこげボート', by:'アメリカの 古い 歌', bpm:100, lv:1,
   n:'C4:1.5 C4:1.5 C4:1 D4:0.5 E4:1.5 E4:1 D4:0.5 E4:1 F4:0.5 G4:3 C5:0.5 C5:0.5 C5:0.5 G4:0.5 G4:0.5 G4:0.5 E4:0.5 E4:0.5 E4:0.5 C4:0.5 C4:0.5 C4:0.5 G4:1 F4:0.5 E4:1 D4:0.5 C4:3'},
  {id:'frere', k:'C', t:'フレール・ジャック', by:'フランスの 古い 歌', bpm:110, lv:1,
   n:'C4:1 D4:1 E4:1 C4:1 C4:1 D4:1 E4:1 C4:1 E4:1 F4:1 G4:2 E4:1 F4:1 G4:2 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 C4:1 G3:1 C4:2 C4:1 G3:1 C4:2'},
  {id:'oldmac', k:'G', t:'マクドナルドじいさん', by:'アメリカの 古い 歌', bpm:120, lv:1,
   n:'G4:1 G4:1 G4:1 D4:1 E4:1 E4:1 D4:2 B4:1 B4:1 A4:1 A4:1 G4:3 D4:1 G4:1 G4:1 G4:1 D4:1 E4:1 E4:1 D4:2 B4:1 B4:1 A4:1 A4:1 G4:3 D4:0.5 D4:0.5 G4:1 G4:1 G4:1 D4:0.5 D4:0.5 G4:1 G4:1 G4:2 G4:0.5 G4:0.5 G4:1 G4:0.5 G4:0.5 G4:1 G4:0.5 G4:0.5 G4:0.5 G4:0.5 G4:1 G4:1 G4:1 G4:1 G4:1 D4:1 E4:1 E4:1 D4:2 B4:1 B4:1 A4:1 A4:1 G4:4'},
  {id:'bday', k:'C', bar:3, p:1, t:'ハッピーバースデー', by:'ヒル姉妹（1916年・1946年 没）', bpm:100, lv:1,
   n:'G4:0.75 G4:0.25 A4:1 G4:1 C5:1 B4:2 G4:0.75 G4:0.25 A4:1 G4:1 D5:1 C5:2 G4:0.75 G4:0.25 G5:1 E5:1 C5:1 B4:1 A4:2 F5:0.75 F5:0.25 E5:1 C5:1 D5:1 C5:3'},
  {id:'sakura', k:'A', mi:true, t:'さくらさくら', by:'日本の 古い 歌', bpm:80, lv:2,
   n:'A4:1 A4:1 B4:2 A4:1 A4:1 B4:2 A4:1 B4:1 C5:1 B4:1 A4:1 B4:0.5 A4:0.5 F4:2 E4:1 C4:1 E4:1 F4:1 E4:1 E4:0.5 C4:0.5 B3:2 A4:1 B4:1 C5:1 B4:1 A4:1 B4:0.5 A4:0.5 F4:2 E4:1 C4:1 E4:1 F4:1 E4:1 E4:0.5 C4:0.5 B3:2 A4:1 A4:1 B4:2 A4:1 A4:1 B4:2 E4:1 F4:1 B4:0.5 A4:0.5 F4:1 E4:4'},
  {id:'hotaru', k:'F', p:1, t:'蛍の光', by:'スコットランドの 古い 歌', bpm:90, lv:2,
   n:'C4:1 F4:1.5 F4:0.5 F4:1 A4:1 G4:1.5 F4:0.5 G4:1 A4:0.5 G4:0.5 F4:1.5 F4:0.5 A4:1 C5:1 D5:3 D5:1 C5:1.5 A4:0.5 A4:1 F4:1 G4:1.5 F4:0.5 G4:1 A4:0.5 G4:0.5 F4:1.5 D4:0.5 D4:1 C4:1 F4:3'},
  {id:'ieji', k:'C', t:'家路（新世界より）', by:'ドヴォルザーク（1904年 没）', bpm:60, lv:2,
   n:'E4:1.5 G4:0.5 G4:2 E4:1.5 D4:0.5 C4:2 D4:1 E4:1 G4:1 E4:1 D4:4 E4:1.5 G4:0.5 G4:2 E4:1.5 D4:0.5 C4:2 D4:1 E4:1 D4:1.5 C4:0.5 C4:4'},
  {id:'brahms', k:'C', bar:3, p:1, t:'ブラームスの子守歌', by:'ブラームス（1897年 没）', bpm:80, lv:2,
   n:'E4:0.5 E4:0.5 G4:2 E4:0.5 E4:0.5 G4:2 E4:0.5 G4:0.5 C5:1 B4:1.5 A4:0.5 A4:1 G4:1 D4:0.5 E4:0.5 F4:1 D4:1 D4:0.5 E4:0.5 F4:2 D4:0.5 F4:0.5 B4:0.5 A4:0.5 G4:1 B4:1 C5:2 C4:0.5 C4:0.5 C5:2 A4:0.5 F4:0.5 G4:2 E4:0.5 C4:0.5 F4:1 G4:1 A4:1 G4:2 C4:0.5 C4:0.5 C5:2 A4:0.5 F4:0.5 G4:2 E4:0.5 C4:0.5 F4:1 E4:1 D4:1 C4:2'},
  {id:'joyworld', k:'C', t:'もろびとこぞりて', by:'ヘンデル（1759年 没）', bpm:100, lv:2,
   n:'C5:2 B4:1.5 A4:0.5 G4:3 F4:1 E4:2 D4:2 C4:3 G4:1 A4:3 A4:1 B4:3 B4:1 C5:3 C5:1 C5:1 B4:1 A4:1 G4:1 G4:1.5 F4:0.5 E4:1 C5:1 C5:1 B4:1 A4:1 G4:1 G4:1.5 F4:0.5 E4:1 E4:1 E4:1 E4:1 E4:1 E4:0.5 F4:0.5 G4:3 F4:0.5 E4:0.5 D4:1 D4:1 D4:1 D4:0.5 E4:0.5 F4:3 E4:0.5 D4:0.5 C4:1 C5:2 A4:1 G4:1.5 F4:0.5 E4:1 F4:1 E4:2 D4:2 C4:4'},
  {id:'canon', k:'D', t:'カノン（はじめ）', by:'パッヘルベル（1706年 没）', bpm:80, lv:2,
   n:'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2 D4:1 F#4:1 A4:1 G4:1 F#4:1 D4:1 F#4:1 E4:1 D4:1 B3:1 D4:1 A4:1 G4:1 B4:1 A4:1 G4:1'},
  {id:'turkish', k:'A', mi:true, p:1, t:'トルコ行進曲（はじめ）', by:'モーツァルト（1791年 没）', bpm:90, lv:3,
   n:'B4:0.25 A4:0.25 G#4:0.25 A4:0.25 C5:0.5 R:0.5 D5:0.25 C5:0.25 B4:0.25 C5:0.25 E5:0.5 R:0.5 F5:0.25 E5:0.25 D#5:0.25 E5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 C6:1 A5:0.5 C6:0.5 B5:0.5 A5:0.5 G5:0.5 A5:0.5 B5:0.5 A5:0.5 G5:0.5 A5:0.5 B5:0.5 A5:0.5 G5:0.5 F#5:0.5 E5:1 B4:0.25 A4:0.25 G#4:0.25 A4:0.25 C5:0.5 R:0.5 D5:0.25 C5:0.25 B4:0.25 C5:0.25 E5:0.5 R:0.5 F5:0.25 E5:0.25 D#5:0.25 E5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 C6:1 A5:0.5 B5:0.5 C6:0.5 B5:0.5 A5:0.5 G#5:0.5 A5:0.5 E5:0.5 F5:0.5 D5:0.5 C5:1 B4:0.75 A4:0.25 A4:1'}
];
/* ⚡ ゲーム用の オリジナル曲（v675。この アプリの ために Claude が 作った 曲）──
   曲は 16拍（4小節）の まとまり（P）を form の 順に つなぐ。まとまりごとに コード（ch：1小節に 1つ）・なぞる ときの 形（sh）・伴奏の リズム（dr）を 決める。
   形：circle（まわる）・eight（∞）・star（星）・wave（波）・zig（ジグザグ）・spiral（うず）・heart（ハート）。
   リズム：beat（4つ打ち）・pop（はずむ）・drive（全力）・build（もり上げ）・half（ゆったり）・waltz（3拍子） */
const ORIG=[
  {id:'cdash', t:'スターダッシュ', bpm:148, lv:2, key:'ハ長調',
   P:{
    i:{n:'C5:0.5 G4:0.5 E4:0.5 G4:0.5 C5:0.5 G4:0.5 E5:1 D5:0.5 B4:0.5 G4:0.5 B4:0.5 D5:0.5 B4:0.5 G5:1 C5:0.5 A4:0.5 E4:0.5 A4:0.5 C5:0.5 A4:0.5 E5:1 F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:1 G4:1', ch:'C G Am G', sh:'circle', dr:'beat'},
    a:{n:'E4:1 G4:1 C5:1.5 B4:0.5 A4:1 G4:1 E4:2 F4:1 A4:1 D5:1.5 C5:0.5 B4:1 G4:1 R:1 G4:0.5 G4:0.5', ch:'C Am F G', sh:'wave', dr:'pop'},
    a2:{n:'E4:1 G4:1 C5:1.5 D5:0.5 E5:1 D5:1 C5:2 A4:1 C5:1 F5:1.5 E5:0.5 D5:1 B4:0.5 G4:0.5 C5:2', ch:'C Em F G', sh:'wave', dr:'pop'},
    b:{n:'A4:0.5 C5:0.5 E5:0.5 A4:0.5 C5:0.5 E5:0.5 A5:1 G4:0.5 B4:0.5 D5:0.5 G4:0.5 B4:0.5 D5:0.5 G5:1 F4:0.5 A4:0.5 C5:0.5 F5:0.5 E4:0.5 G4:0.5 C5:0.5 E5:0.5 D5:0.5 E5:0.5 F5:0.5 G5:0.5 A5:0.5 B5:0.5 C6:1', ch:'Am G F G', sh:'zig', dr:'build'},
    c:{n:'C6:1 G5:0.5 E5:1 G5:0.5 A5:1 G5:1 E5:0.5 C5:0.5 D5:1 E5:1 A5:1 G5:0.5 F5:1 E5:0.5 D5:1 G5:1.5 F5:0.5 E5:1 D5:1', ch:'C Am F G', sh:'star', dr:'drive'},
    c2:{n:'C6:1 G5:0.5 E5:1 G5:0.5 A5:1 G5:1 E5:0.5 C5:0.5 D5:1 E5:1 F5:1 A5:0.5 G5:1 F5:0.5 E5:1 D5:0.5 E5:0.5 D5:0.5 B4:0.5 C5:2', ch:'C Am F G', sh:'star', dr:'drive'},
    d:{n:'A4:2 C5:1 E5:1 D5:2 C5:1 B4:1 C5:2 A4:1 F4:1 G4:3 R:1', ch:'Am Em F G', sh:'spiral', dr:'half'},
    d2:{n:'A4:2 C5:1 E5:1 G5:2 F5:1 E5:1 F5:1 E5:1 D5:1 C5:1 B4:0.5 C5:0.5 D5:0.5 E5:0.5 F5:0.5 G5:0.5 A5:0.5 B5:0.5', ch:'Am Em F G', sh:'spiral', dr:'build'},
    o:{n:'C6:0.5 G5:0.5 E5:0.5 C5:0.5 G5:0.5 E5:0.5 C5:0.5 G4:0.5 A4:0.5 C5:0.5 F5:0.5 A5:0.5 G5:0.5 B5:0.5 D6:1 C6:4', ch:'C F C', sh:'circle', dr:'drive'}},
   form:'i a a2 b c c2 d d2 b c c2 o'},
  {id:'cneon', t:'ネオンシティ・ラン', bpm:132, lv:3, key:'イ短調',
   P:{
    i:{n:'A4:0.5 A4:0.5 R:0.5 A4:0.5 C5:0.5 R:0.5 E5:1 D5:0.5 D5:0.5 R:0.5 D5:0.5 F5:0.5 R:0.5 A5:1 G5:0.5 G5:0.5 R:0.5 G5:0.5 E5:0.5 R:0.5 C5:1 B4:0.5 C5:0.5 D5:0.5 E5:0.5 G#5:2', ch:'Am Dm C E', sh:'zig', dr:'beat'},
    a:{n:'A4:1 C5:0.5 E5:1 D5:0.5 C5:1 B4:1 G4:0.5 B4:1 D5:0.5 E5:1 F5:1 E5:0.5 D5:1 C5:0.5 A4:1 B4:1.5 C5:0.5 D5:1 E5:1', ch:'Am G F E', sh:'eight', dr:'pop'},
    a2:{n:'A4:1 C5:0.5 E5:1 D5:0.5 C5:1 B4:1 G4:0.5 B4:1 D5:0.5 G5:1 F5:0.5 E5:0.5 D5:0.5 C5:0.5 D5:1 E5:1 A4:3 R:1', ch:'Am G F Am', sh:'eight', dr:'pop'},
    b:{n:'F5:0.5 E5:0.5 F5:0.5 A5:0.5 G5:1 E5:1 F5:0.5 E5:0.5 F5:0.5 A5:0.5 C6:2 B5:0.5 A5:0.5 G5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:0.5 E5:1 G#5:1 B5:2', ch:'F C Dm E', sh:'wave', dr:'build'},
    c:{n:'A5:1.5 E5:0.5 A5:1 C6:1 B5:1.5 G5:0.5 E5:1 D5:1 C5:0.5 D5:0.5 E5:1 F5:0.5 E5:0.5 D5:1 E5:1 A5:1 G#5:1 B5:1', ch:'Am G F E', sh:'star', dr:'drive'},
    c2:{n:'A5:1.5 E5:0.5 A5:1 C6:1 D6:1.5 C6:0.5 B5:1 G5:1 A5:0.5 G5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:0.5 G#4:0.5 A4:4', ch:'Am G E Am', sh:'heart', dr:'drive'},
    d:{n:'E5:0.25 E5:0.25 E5:0.5 R:0.5 E5:0.5 D5:0.5 C5:0.5 A4:1 E5:0.25 E5:0.25 E5:0.5 R:0.5 E5:0.5 G5:0.5 A5:0.5 E5:1 C5:0.25 C5:0.25 C5:0.5 R:0.5 C5:0.5 D5:0.5 E5:0.5 G5:1 B4:0.25 B4:0.25 B4:0.5 R:0.5 B4:0.5 D5:0.5 E5:0.5 G#5:1', ch:'Am Am F E', sh:'circle', dr:'half'},
    o:{n:'A5:0.5 E5:0.5 C5:0.5 A4:0.5 A5:0.5 E5:0.5 C5:0.5 A4:0.5 F5:0.5 C5:0.5 A4:0.5 F4:0.5 G5:0.5 D5:0.5 B4:0.5 G4:0.5 A4:1 C5:1 E5:1 A5:1 A5:4', ch:'Am F Am Am', sh:'spiral', dr:'drive'}},
   form:'i a a2 b c c2 d b c c2 c c2 o'},
  {id:'cwaltz', t:'そよかぜワルツ', bpm:150, lv:1, bar:3, key:'ハ長調・3拍子',
   P:{
    a:{n:'E4:2 G4:1 C5:2 B4:1 A4:2 G4:1 E4:3 F4:2 A4:1 D5:2 C5:1 B4:2 A4:1 G4:3', ch:'C Em F C F Dm G G', sh:'wave', dr:'waltz'},
    a2:{n:'E4:2 G4:1 C5:2 B4:1 A4:2 C5:1 E5:3 D5:2 C5:1 B4:2 A4:1 G4:2 B4:1 C5:3', ch:'C Em F Am Dm G G C', sh:'wave', dr:'waltz'},
    b:{n:'A4:1 C5:1 E5:1 A5:2 G5:1 F5:1 E5:1 D5:1 E5:3 F4:1 A4:1 C5:1 F5:2 E5:1 D5:1 C5:1 B4:1 C5:2 G4:1', ch:'Am Am Dm Am F F G C', sh:'circle', dr:'waltz'},
    b2:{n:'A4:1 C5:1 E5:1 A5:2 G5:1 F5:1 E5:1 D5:1 E5:1 F5:1 G5:1 A5:1 G5:1 F5:1 E5:1 D5:1 C5:1 D5:2 B4:1 C5:3', ch:'Am Am Dm C F C G C', sh:'heart', dr:'waltz'}},
   form:'a a2 b b2 a a2 b b2 a2'},
  {id:'cdragon', t:'ドラゴンビート', bpm:160, lv:3, key:'ニ短調',
   P:{
    i:{n:'D5:0.5 D5:0.5 A4:0.5 D5:0.5 F5:0.5 D5:0.5 A5:1 C5:0.5 C5:0.5 G4:0.5 C5:0.5 E5:0.5 C5:0.5 G5:1 Bb4:0.5 Bb4:0.5 F4:0.5 Bb4:0.5 D5:0.5 Bb4:0.5 F5:1 A4:0.5 C#5:0.5 E5:0.5 A5:0.5 G5:0.5 E5:0.5 C#5:1', ch:'Dm C Bb A', sh:'zig', dr:'beat'},
    a:{n:'D5:1 F5:0.5 A5:0.5 G5:1 F5:1 E5:0.5 D5:0.5 C5:1 D5:1 A4:1 Bb4:1 D5:0.5 F5:0.5 E5:1 D5:1 C#5:1 E5:1 A5:2', ch:'Dm C Bb A', sh:'wave', dr:'pop'},
    a2:{n:'D5:1 F5:0.5 A5:0.5 G5:1 F5:1 E5:0.5 F5:0.5 G5:1 A5:1 C6:1 Bb5:0.5 A5:0.5 G5:0.5 F5:0.5 E5:0.5 D5:0.5 C#5:0.5 E5:0.5 D5:4', ch:'Dm C A Dm', sh:'eight', dr:'pop'},
    b:{n:'D5:0.25 E5:0.25 F5:0.25 G5:0.25 A5:0.5 F5:0.5 D5:0.5 A4:0.5 D5:1 C5:0.25 D5:0.25 E5:0.25 F5:0.25 G5:0.5 E5:0.5 C5:0.5 G4:0.5 C5:1 Bb4:0.25 C5:0.25 D5:0.25 E5:0.25 F5:0.5 D5:0.5 Bb4:0.5 F4:0.5 Bb4:1 A4:0.25 B4:0.25 C#5:0.25 D5:0.25 E5:0.5 F5:0.5 G5:0.5 A5:0.5 C#6:1', ch:'Dm C Bb A', sh:'spiral', dr:'build'},
    c:{n:'A5:1 F5:0.5 D5:0.5 A5:1 Bb5:1 A5:1 G5:0.5 F5:0.5 E5:1 C5:1 D5:0.5 F5:0.5 Bb5:1 A5:0.5 G5:0.5 F5:1 E5:1 C#5:0.5 E5:0.5 A5:2', ch:'Dm C Bb A', sh:'star', dr:'drive'},
    c2:{n:'A5:1 F5:0.5 D5:0.5 A5:1 Bb5:1 C6:1 Bb5:0.5 A5:0.5 G5:1 E5:1 F5:0.5 G5:0.5 A5:0.5 Bb5:0.5 A5:0.5 G5:0.5 F5:0.5 E5:0.5 D5:2 D6:2', ch:'Dm C Gm Dm', sh:'star', dr:'drive'},
    d:{n:'D5:2 A4:2 C5:2 G4:2 Bb4:2 F4:2 A4:1 C#5:1 E5:1 G5:1', ch:'Dm C Bb A', sh:'circle', dr:'half'},
    o:{n:'D5:0.25 F5:0.25 A5:0.25 D6:0.25 A5:0.25 F5:0.25 D5:0.25 A4:0.25 D5:0.25 F5:0.25 A5:0.25 D6:0.25 A5:0.25 F5:0.25 D5:0.25 A4:0.25 Bb4:0.5 D5:0.5 F5:0.5 Bb5:0.5 A4:0.5 C#5:0.5 E5:0.5 A5:0.5 D6:4', ch:'Dm Bb Dm', sh:'heart', dr:'drive'}},
   form:'i a a2 b c c2 d a a2 b c c2 o'},
  /* v677：ふやした 10曲 */
  {id:'csakura', t:'桜ふぶきロード', bpm:138, lv:2, key:'ニ短調・和風',
   P:{
    i:{n:'D5:0.5 A4:0.5 D5:0.5 F5:0.5 G5:1 F5:0.5 D5:0.5 C5:0.5 A4:0.5 C5:0.5 D5:0.5 F5:1 D5:1 A4:0.5 G4:0.5 A4:0.5 C5:0.5 D5:1 C5:0.5 A4:0.5 G4:1 A4:1 D5:2', ch:'Dm C F Dm', sh:'circle', dr:'taiko'},
    a:{n:'D4:1 F4:1 G4:1.5 A4:0.5 C5:1 A4:1 G4:2 F4:1 G4:1 A4:1 C5:1 A4:3 R:1', ch:'Dm C F Am', sh:'wave', dr:'taiko'},
    a2:{n:'D4:1 F4:1 G4:1.5 A4:0.5 C5:1 D5:1 F5:2 D5:1 C5:1 A4:1 G4:0.5 F4:0.5 D4:3 R:1', ch:'Dm F C Dm', sh:'wave', dr:'taiko'},
    b:{n:'A4:0.5 C5:0.5 D5:1 A4:0.5 C5:0.5 D5:1 F5:0.5 G5:0.5 F5:0.5 D5:0.5 C5:2 A4:0.5 C5:0.5 D5:1 A4:0.5 C5:0.5 D5:1 G5:0.5 A5:0.5 G5:0.5 F5:0.5 D5:1 C5:1', ch:'Bb C Dm C', sh:'zig', dr:'build'},
    c:{n:'D5:1 F5:1 G5:1 A5:1 C6:1.5 A5:0.5 G5:2 F5:1 G5:0.5 A5:0.5 G5:1 F5:1 D5:1.5 C5:0.5 D5:2', ch:'Dm F C Dm', sh:'star', dr:'drive'},
    c2:{n:'D5:1 F5:1 G5:1 A5:1 D6:1.5 C6:0.5 A5:2 G5:0.5 A5:0.5 G5:0.5 F5:0.5 D5:1 C5:1 D5:4', ch:'Dm Bb C Dm', sh:'heart', dr:'drive'},
    d:{n:'A4:2 G4:1 F4:1 G4:2 A4:2 C5:2 D5:1 C5:1 A4:4', ch:'Dm C Bb Am', sh:'spiral', dr:'half'},
    o:{n:'D5:0.5 F5:0.5 G5:0.5 A5:0.5 C6:0.5 A5:0.5 G5:0.5 F5:0.5 D5:0.5 C5:0.5 A4:0.5 G4:0.5 A4:1 C5:1 D5:4', ch:'Dm C Dm', sh:'circle', dr:'drive'}},
   form:'i a a2 b c c2 d a2 b c c2 o'},
  {id:'cpico', t:'ピコピコ・アドベンチャー', bpm:156, lv:2, key:'ハ長調・ゲーム風',
   P:{
    i:{n:'C5:0.5 E5:0.5 G5:0.5 C6:0.5 G5:0.5 E5:0.5 C5:1 D5:0.5 F5:0.5 A5:0.5 D6:0.5 A5:0.5 F5:0.5 D5:1 E5:0.5 G5:0.5 B5:0.5 E6:0.5 D6:0.5 B5:0.5 G5:1 C6:2 R:2', ch:'C Dm G C', sh:'zig', dr:'beat'},
    a:{n:'G4:0.5 G4:0.5 C5:1 E5:0.5 D5:0.5 C5:1 A4:0.5 A4:0.5 D5:1 F5:0.5 E5:0.5 D5:1 B4:0.5 B4:0.5 E5:1 G5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:1 G4:1 C5:2', ch:'C Dm G C', sh:'wave', dr:'pop'},
    a2:{n:'G4:0.5 G4:0.5 C5:1 E5:0.5 D5:0.5 C5:1 A4:0.5 A4:0.5 F5:1 A5:0.5 G5:0.5 F5:1 E5:0.5 F5:0.5 G5:0.5 E5:0.5 D5:0.5 E5:0.5 D5:0.5 B4:0.5 C5:2 R:2', ch:'C F G C', sh:'wave', dr:'pop'},
    b:{n:'A4:1 C5:0.5 E5:0.5 A5:1 G5:1 F5:1 A4:0.5 C5:0.5 F5:1 E5:1 D5:0.5 E5:0.5 F5:0.5 G5:0.5 A5:0.5 B5:0.5 C6:0.5 D6:0.5 B5:1 G5:1 D5:2', ch:'Am F G G', sh:'circle', dr:'build'},
    c:{n:'E6:1 C6:0.5 G5:0.5 E6:1 D6:1 C6:1 A5:0.5 F5:0.5 C6:1 B5:1 A5:0.5 B5:0.5 C6:0.5 A5:0.5 G5:0.5 A5:0.5 G5:0.5 E5:0.5 D5:1 E5:0.5 F5:0.5 G5:2', ch:'C F Am G', sh:'star', dr:'drive'},
    c2:{n:'E6:1 C6:0.5 G5:0.5 E6:1 D6:1 C6:1 A5:0.5 F5:0.5 C6:1 D6:1 E6:0.5 D6:0.5 C6:0.5 B5:0.5 A5:0.5 G5:0.5 F5:0.5 D5:0.5 C5:2 C6:2', ch:'C F G C', sh:'star', dr:'drive'},
    d:{n:'C5:0.25 D5:0.25 E5:0.25 F5:0.25 G5:0.5 G5:0.5 E5:0.25 F5:0.25 G5:0.25 A5:0.25 B5:0.5 B5:0.5 C6:0.5 G5:0.5 E5:0.5 C5:0.5 D5:1 G4:1 A4:0.25 B4:0.25 C5:0.25 D5:0.25 E5:0.5 E5:0.5 F5:0.25 E5:0.25 D5:0.25 C5:0.25 B4:0.5 G4:0.5 C5:1 E5:1 G5:1 C6:1', ch:'C G Am C', sh:'eight', dr:'beat'},
    o:{n:'G5:0.5 E5:0.5 C5:0.5 E5:0.5 G5:0.5 C6:0.5 E6:1 D6:0.5 B5:0.5 G5:0.5 B5:0.5 D6:1 G5:1 C6:4', ch:'C G C', sh:'spiral', dr:'drive'}},
   form:'i a a2 b c c2 d a2 b c c2 o'},
  {id:'cumi', t:'マリンブルー', bpm:116, lv:1, key:'ト長調',
   P:{
    a:{n:'B4:1 D5:1 G5:2 F#5:1 E5:1 D5:2 C5:1 E5:1 A5:2 G5:1 F#5:1 E5:1 D5:1', ch:'G D Am D', sh:'wave', dr:'latin'},
    a2:{n:'B4:1 D5:1 G5:2 F#5:1 E5:1 D5:2 C5:1 B4:1 A4:1 F#4:1 G4:3 R:1', ch:'G D D G', sh:'wave', dr:'latin'},
    b:{n:'E5:1.5 D5:0.5 C5:1 B4:1 A4:1.5 B4:0.5 C5:2 D5:1.5 C5:0.5 B4:1 A4:1 G4:1 A4:1 B4:2', ch:'C Am D G', sh:'circle', dr:'latin'},
    b2:{n:'E5:1.5 D5:0.5 C5:1 B4:1 A4:1.5 B4:0.5 C5:2 D5:1 E5:1 F#5:1 A5:1 G5:4', ch:'C Am D G', sh:'circle', dr:'latin'},
    c:{n:'G5:1.5 G5:0.5 A5:1 G5:1 E5:1.5 D5:0.5 D5:2 C5:1.5 C5:0.5 E5:1 D5:1 B4:1.5 A4:0.5 B4:2', ch:'C G Am Em', sh:'heart', dr:'pop'},
    c2:{n:'G5:1.5 G5:0.5 A5:1 G5:1 E5:1.5 D5:0.5 D5:2 C5:1 E5:1 D5:1 F#5:1 G5:4', ch:'C G D G', sh:'heart', dr:'pop'},
    o:{n:'D5:1 G5:1 B5:2 A5:1 F#5:1 D5:2 G5:4', ch:'G D G', sh:'spiral', dr:'half'}},
   form:'a a2 b b2 c c2 a a2 b b2 c c2 o'},
  {id:'crobot', t:'ロボット・ファンク', bpm:108, lv:3, key:'ホ短調',
   P:{
    i:{n:'E4:0.25 E4:0.25 R:0.5 E5:0.5 E4:0.25 E4:0.25 R:0.5 D5:0.5 B4:0.5 G4:0.5 E4:0.25 E4:0.25 R:0.5 E5:0.5 E4:0.25 E4:0.25 R:0.5 G5:0.5 F#5:0.5 D5:0.5 C5:0.25 C5:0.25 R:0.5 C5:0.5 D5:0.5 E5:0.5 G5:0.5 E5:0.5 D5:0.5 B4:0.5 D5:0.5 F#5:0.5 A5:0.5 B5:1 R:1', ch:'Em Em C B', sh:'zig', dr:'beat'},
    a:{n:'G4:0.5 B4:0.5 R:0.5 E5:0.5 R:0.5 D5:0.5 B4:0.5 A4:0.5 G4:0.5 A4:0.5 B4:0.5 E4:1.5 R:1 G4:0.5 B4:0.5 R:0.5 E5:0.5 R:0.5 G5:0.5 F#5:0.5 E5:0.5 D5:0.75 B4:0.75 A4:0.5 B4:2', ch:'Em Em C Bm', sh:'eight', dr:'pop'},
    a2:{n:'G4:0.5 B4:0.5 R:0.5 E5:0.5 R:0.5 D5:0.5 B4:0.5 A4:0.5 G4:0.5 A4:0.5 B4:0.5 D5:1.5 R:1 C5:0.5 E5:0.5 R:0.5 G5:0.5 F#5:0.5 E5:0.5 D5:0.5 B4:0.5 E5:3 R:1', ch:'Em G C Em', sh:'eight', dr:'pop'},
    b:{n:'A4:0.25 C5:0.25 E5:0.5 A5:0.5 G5:0.5 E5:0.5 C5:0.5 A4:1 B4:0.25 D5:0.25 F#5:0.5 B5:0.5 A5:0.5 F#5:0.5 D5:0.5 B4:1 C5:0.25 E5:0.25 G5:0.5 C6:0.5 B5:0.5 G5:0.5 E5:0.5 C5:1 B4:0.5 D#5:0.5 F#5:0.5 A5:0.5 B5:2', ch:'Am Bm C B', sh:'spiral', dr:'build'},
    c:{n:'E5:0.75 E5:0.75 G5:0.5 B5:1 A5:0.5 G5:0.5 F#5:0.75 F#5:0.75 A5:0.5 D6:1 C6:0.5 B5:0.5 C6:0.75 B5:0.75 A5:0.5 G5:0.5 F#5:0.5 E5:0.5 D5:0.5 E5:1 B4:1 E5:2', ch:'Em D Am Em', sh:'star', dr:'drive'},
    c2:{n:'E5:0.75 E5:0.75 G5:0.5 B5:1 A5:0.5 G5:0.5 F#5:0.75 F#5:0.75 A5:0.5 D6:1 E6:0.5 D6:0.5 C6:0.5 B5:0.5 A5:0.5 G5:0.5 F#5:0.5 G5:0.5 A5:0.5 B5:0.5 E6:2 E5:2', ch:'Em D C Em', sh:'heart', dr:'drive'},
    d:{n:'E4:0.5 R:0.5 E4:0.5 R:0.5 G4:0.5 R:0.5 A4:0.5 R:0.5 B4:0.25 B4:0.25 B4:0.25 B4:0.25 A4:0.5 G4:0.5 E4:2 E4:0.5 R:0.5 E4:0.5 R:0.5 G4:0.5 R:0.5 B4:0.5 R:0.5 D5:0.25 D5:0.25 D5:0.25 D5:0.25 C5:0.5 B4:0.5 A4:1 B4:1', ch:'Em Em Em D', sh:'zig', dr:'half'},
    o:{n:'E5:0.25 G5:0.25 B5:0.25 E6:0.25 B5:0.25 G5:0.25 E5:0.25 B4:0.25 E5:0.25 G5:0.25 B5:0.25 E6:0.25 B5:0.5 R:0.5 D6:0.5 B5:0.5 A5:0.5 F#5:0.5 G5:0.5 E5:0.5 F#5:0.5 D#5:0.5 E5:4', ch:'Em B Em', sh:'circle', dr:'drive'}},
   form:'i a a2 b c c2 d a a2 b c c2 o'},
  {id:'cstar', t:'流れ星のセレナーデ', bpm:138, lv:2, bar:3, key:'ヘ長調・3拍子',
   P:{
    a:{n:'C5:2 F5:1 A5:2 G5:1 F5:1 E5:1 D5:1 C5:3 Bb4:2 D5:1 G5:2 F5:1 E5:1 D5:1 E5:1 F5:3', ch:'F F Dm F Bb Gm C F', sh:'circle', dr:'waltz'},
    a2:{n:'C5:2 F5:1 A5:2 G5:1 F5:1 G5:1 A5:1 C6:3 D6:1 C6:1 Bb5:1 A5:1 G5:1 F5:1 G5:2 E5:1 F5:3', ch:'F F F F Bb F C F', sh:'circle', dr:'waltz'},
    b:{n:'A5:1 G5:0.5 F5:0.5 E5:1 G5:1 F5:0.5 E5:0.5 D5:1 F5:1 E5:0.5 D5:0.5 C5:1 E5:2 C5:1 D5:0.5 E5:0.5 F5:1 D5:1 G5:0.5 A5:0.5 Bb5:1 G5:1 A5:1 C6:1 Bb5:0.5 G5:0.5 A5:3', ch:'F Gm Dm C Bb Gm C F', sh:'wave', dr:'waltz'},
    b2:{n:'A5:1 G5:0.5 F5:0.5 E5:1 G5:1 F5:0.5 E5:0.5 D5:1 F5:1 E5:0.5 D5:0.5 C5:1 E5:2 C5:1 D5:0.5 E5:0.5 F5:1 D5:1 G5:0.5 A5:0.5 Bb5:1 G5:1 E5:1 G5:1 C6:1 F5:3', ch:'F Gm Dm C Bb Gm C F', sh:'wave', dr:'waltz'},
    c:{n:'F5:0.5 G5:0.5 A5:0.5 C6:0.5 F6:1 E6:0.5 D6:0.5 C6:0.5 Bb5:0.5 A5:1 D6:0.5 C6:0.5 Bb5:0.5 A5:0.5 G5:1 C6:3 Bb5:0.5 A5:0.5 G5:0.5 F5:0.5 E5:1 A5:0.5 G5:0.5 F5:0.5 E5:0.5 D5:1 G5:1 E5:1 C5:1 F5:3', ch:'F C Bb C Gm Dm C F', sh:'star', dr:'waltz'},
    o:{n:'C5:1 F5:1 A5:1 C6:3 A5:1 C6:1 F6:1 F6:3', ch:'F F F F', sh:'spiral', dr:'waltz'}},
   form:'a a2 b b2 c a2 b2 c o'},
  {id:'cfire', t:'ファイアーダンス', bpm:168, lv:3, key:'イ短調・スペイン風',
   P:{
    i:{n:'A4:0.5 B4:0.5 C5:0.5 D5:0.5 E5:0.5 F5:0.5 G#5:0.5 A5:0.5 G#5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:0.5 A4:1 E5:0.5 E5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:1 A4:0.5 C5:0.5 E5:0.5 A5:0.5 G#5:2', ch:'Am Dm E E', sh:'spiral', dr:'beat'},
    a:{n:'A5:1 E5:0.5 E5:0.5 F5:0.5 E5:0.5 D5:1 C5:1 A4:0.5 A4:0.5 B4:0.5 C5:0.5 D5:1 E5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:0.5 C5:0.5 D5:0.5 E5:3 R:1', ch:'Am Am E E', sh:'zig', dr:'pop'},
    a2:{n:'A5:1 E5:0.5 E5:0.5 F5:0.5 E5:0.5 D5:1 C5:1 A4:0.5 A4:0.5 B4:0.5 C5:0.5 D5:1 E5:0.5 D5:0.5 C5:0.5 B4:0.5 G#4:0.5 B4:0.5 E5:0.5 G#4:0.5 A4:3 R:1', ch:'Am Dm E Am', sh:'zig', dr:'pop'},
    b:{n:'D5:0.5 F5:0.5 A5:0.5 F5:0.5 D5:1 A4:1 C5:0.5 E5:0.5 A5:0.5 E5:0.5 C5:1 A4:1 B4:0.5 D5:0.5 F5:0.5 G#5:0.5 B5:1 G#5:1 E5:0.25 F5:0.25 G#5:0.25 A5:0.25 B5:0.25 C6:0.25 D6:0.25 E6:0.25 E6:2', ch:'Dm Am E E', sh:'eight', dr:'build'},
    c:{n:'A5:0.5 A5:0.5 C6:1 B5:0.5 A5:0.5 G#5:1 F5:0.5 F5:0.5 A5:1 G#5:0.5 F5:0.5 E5:1 D5:0.5 E5:0.5 F5:0.5 G#5:0.5 A5:0.5 B5:0.5 C6:0.5 D6:0.5 E6:1.5 D6:0.5 C6:1 B5:1', ch:'Am Dm E E', sh:'star', dr:'drive'},
    c2:{n:'A5:0.5 A5:0.5 C6:1 B5:0.5 A5:0.5 G#5:1 F5:0.5 F5:0.5 A5:1 G#5:0.5 F5:0.5 E5:1 D5:0.5 C5:0.5 B4:0.5 C5:0.5 D5:0.5 E5:0.5 G#5:0.5 B5:0.5 A5:2 A4:2', ch:'Am Dm E Am', sh:'heart', dr:'drive'},
    d:{n:'E5:1.5 F5:0.5 E5:1 D5:1 C5:1.5 D5:0.5 C5:1 B4:1 A4:0.5 B4:0.5 C5:0.5 D5:0.5 E5:1 F5:1 E5:4', ch:'Am G F E', sh:'circle', dr:'half'},
    o:{n:'A5:0.25 G#5:0.25 F5:0.25 E5:0.25 D5:0.25 C5:0.25 B4:0.25 A4:0.25 E5:0.25 D5:0.25 C5:0.25 B4:0.25 A4:0.25 G#4:0.25 F4:0.25 E4:0.25 E4:0.5 G#4:0.5 B4:0.5 E5:0.5 G#5:0.5 B5:0.5 D6:1 A5:4', ch:'Am E Am', sh:'star', dr:'drive'}},
   form:'i a a2 b c c2 d d a2 b c c2 o'},
  {id:'cmatsuri', t:'おまつりビート', bpm:140, lv:1, key:'ハ長調・和風',
   P:{
    a:{n:'C5:1 C5:1 D5:1 E5:1 G5:2 E5:2 D5:1 C5:1 D5:1 E5:1 D5:4', ch:'C C G G', sh:'wave', dr:'taiko'},
    a2:{n:'C5:1 C5:1 D5:1 E5:1 G5:2 A5:2 G5:1 E5:1 D5:1 E5:1 C5:4', ch:'C F G C', sh:'wave', dr:'taiko'},
    b:{n:'A5:1 A5:1 G5:2 E5:1 G5:1 A5:2 C6:1 A5:1 G5:1 E5:1 D5:4', ch:'F C Am G', sh:'circle', dr:'taiko'},
    b2:{n:'A5:1 A5:1 G5:2 E5:1 G5:1 A5:2 G5:1 E5:1 D5:1 E5:1 C5:4', ch:'F C G C', sh:'circle', dr:'taiko'},
    c:{n:'C5:0.5 C5:0.5 E5:1 G5:0.5 G5:0.5 E5:1 A5:0.5 A5:0.5 G5:1 E5:1 D5:1 C5:0.5 C5:0.5 E5:1 G5:0.5 G5:0.5 C6:1 A5:1 G5:1 C6:2', ch:'C Am C F', sh:'star', dr:'drive'},
    c2:{n:'C5:0.5 C5:0.5 E5:1 G5:0.5 G5:0.5 E5:1 A5:0.5 A5:0.5 G5:1 E5:1 D5:1 E5:1 G5:1 D5:1 E5:1 C5:4', ch:'C Am G C', sh:'star', dr:'drive'},
    o:{n:'C6:1 A5:1 G5:1 E5:1 D5:1 E5:1 G5:1 D5:1 C5:4', ch:'Am G C', sh:'heart', dr:'taiko'}},
   form:'a a2 b b2 c c2 a2 b b2 c c2 o'},
  {id:'csky', t:'スカイハイ', bpm:150, lv:2, key:'ニ長調',
   P:{
    i:{n:'D5:0.5 A4:0.5 D5:0.5 F#5:0.5 A5:1 F#5:1 G5:0.5 D5:0.5 G5:0.5 B5:0.5 D6:1 B5:1 A5:0.5 E5:0.5 A5:0.5 C#6:0.5 E6:1 C#6:1 D6:2 A5:2', ch:'D G A D', sh:'circle', dr:'beat'},
    a:{n:'F#4:1 A4:1 D5:1 F#5:1 E5:1.5 D5:0.5 B4:2 G4:1 B4:1 E5:1 G5:1 F#5:1.5 E5:0.5 C#5:2', ch:'D Bm G A', sh:'wave', dr:'pop'},
    a2:{n:'F#4:1 A4:1 D5:1 F#5:1 E5:1.5 D5:0.5 B4:2 G4:1 B4:1 E5:1 C#5:1 D5:3 R:1', ch:'D Bm A D', sh:'wave', dr:'pop'},
    b:{n:'B4:0.5 C#5:0.5 D5:1 F#5:1 E5:1 D5:0.5 E5:0.5 F#5:1 A5:1 G5:1 F#5:0.5 G5:0.5 A5:1 B5:1 C#6:1 D6:1 C#6:1 B5:1 A5:1', ch:'Bm D G A', sh:'zig', dr:'build'},
    c:{n:'D6:1.5 A5:0.5 A5:1 B5:1 A5:1.5 F#5:0.5 F#5:2 G5:1 A5:1 B5:1 G5:1 A5:1.5 E5:0.5 E5:2', ch:'D F#m G A', sh:'star', dr:'drive'},
    c2:{n:'D6:1.5 A5:0.5 A5:1 B5:1 A5:1.5 F#5:0.5 F#5:1 D5:1 G5:1 B5:1 A5:1 C#6:1 D6:4', ch:'D Bm A D', sh:'eight', dr:'drive'},
    d:{n:'D5:0.25 E5:0.25 F#5:0.25 G5:0.25 A5:0.5 D5:0.5 B4:0.25 C#5:0.25 D5:0.25 E5:0.25 F#5:0.5 B4:0.5 G4:0.25 A4:0.25 B4:0.25 C#5:0.25 D5:0.5 G5:0.5 A4:0.25 B4:0.25 C#5:0.25 D5:0.25 E5:0.5 A5:0.5 F#5:0.5 D5:0.5 A4:0.5 D5:0.5 G5:0.5 E5:0.5 B4:0.5 E5:0.5 A5:1 C#6:1 E6:2', ch:'D G D A', sh:'spiral', dr:'beat'},
    o:{n:'D6:0.5 A5:0.5 F#5:0.5 D5:0.5 A5:0.5 F#5:0.5 D5:0.5 A4:0.5 G5:0.5 B5:0.5 D6:0.5 G5:0.5 A5:0.5 C#6:0.5 E6:1 D6:4', ch:'D G D', sh:'heart', dr:'drive'}},
   form:'i a a2 b c c2 d a2 b c c2 o'},
  {id:'cninja', t:'にんじゃ ラッシュ', bpm:172, lv:3, key:'イ短調・和風',
   P:{
    i:{n:'E5:0.5 E5:0.5 R:0.5 E5:0.5 F5:0.5 E5:0.5 C5:1 B4:0.5 B4:0.5 R:0.5 B4:0.5 C5:0.5 B4:0.5 A4:1 E4:0.5 F4:0.5 A4:0.5 B4:0.5 C5:0.5 B4:0.5 A4:0.5 F4:0.5 E4:2 R:2', ch:'Am E F E', sh:'zig', dr:'taiko'},
    a:{n:'E4:0.5 A4:0.5 B4:0.5 C5:0.5 B4:1 A4:1 E4:0.5 A4:0.5 B4:0.5 C5:0.5 E5:1 C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 F4:1 A4:1 B4:3 R:1', ch:'Am Am Dm E', sh:'zig', dr:'pop'},
    a2:{n:'E4:0.5 A4:0.5 B4:0.5 C5:0.5 B4:1 A4:1 E4:0.5 A4:0.5 B4:0.5 C5:0.5 E5:1 F5:1 E5:0.5 C5:0.5 B4:0.5 A4:0.5 B4:0.5 F4:0.5 E4:1 A4:3 R:1', ch:'Am Am E Am', sh:'zig', dr:'pop'},
    b:{n:'F5:0.25 E5:0.25 C5:0.25 B4:0.25 A4:0.5 C5:0.5 F5:0.25 E5:0.25 C5:0.25 B4:0.25 A4:0.5 E5:0.5 F5:0.25 E5:0.25 C5:0.25 B4:0.25 A4:0.5 C5:0.5 E5:1 B4:1 D5:0.25 C5:0.25 A4:0.25 F4:0.25 E4:0.5 A4:0.5 D5:0.25 C5:0.25 A4:0.25 F4:0.25 E4:0.5 B4:0.5 E5:0.5 F5:0.5 E5:0.5 C5:0.5 B4:2', ch:'F F Dm E', sh:'star', dr:'build'},
    c:{n:'A5:1 E5:0.5 F5:0.5 E5:1 C5:1 B4:0.5 C5:0.5 E5:1 F5:1 E5:1 A5:1 B5:0.5 C6:0.5 B5:1 A5:1 F5:0.5 E5:0.5 C5:0.5 B4:0.5 E5:2', ch:'Am E F E', sh:'spiral', dr:'drive'},
    c2:{n:'A5:1 E5:0.5 F5:0.5 E5:1 C5:1 B4:0.5 C5:0.5 E5:1 F5:1 A5:1 C6:0.5 B5:0.5 A5:0.5 F5:0.5 E5:0.5 C5:0.5 B4:0.5 C5:0.5 A4:2 A5:2', ch:'Am E F Am', sh:'star', dr:'drive'},
    d:{n:'E5:1 R:1 E5:1 R:1 F5:0.5 E5:0.5 C5:1 B4:2 A4:1 R:1 A4:1 R:1 B4:0.5 C5:0.5 E5:1 F5:2', ch:'Am E F E', sh:'circle', dr:'taiko'},
    o:{n:'E5:0.25 F5:0.25 A5:0.25 B5:0.25 C6:0.25 B5:0.25 A5:0.25 F5:0.25 E5:0.25 F5:0.25 A5:0.25 B5:0.25 C6:0.5 B5:0.5 A5:0.5 F5:0.5 E5:0.5 C5:0.5 B4:0.5 C5:0.5 E5:1 A5:4', ch:'Am E Am', sh:'eight', dr:'drive'}},
   form:'i a a2 b c c2 d b c c2 a2 b c c2 o'},
  {id:'cfinal', t:'ファイナル・ステージ', bpm:164, lv:3, key:'ハ短調',
   P:{
    i:{n:'C5:1 G4:0.5 C5:0.5 Eb5:1 D5:1 C5:1 G4:0.5 C5:0.5 F5:1 Eb5:1 D5:0.5 Eb5:0.5 F5:0.5 G5:0.5 Ab5:1 G5:1 B4:0.5 D5:0.5 F5:0.5 Ab5:0.5 G5:2', ch:'Cm Fm Bb G', sh:'star', dr:'beat'},
    a:{n:'G4:1 C5:1 Eb5:1.5 D5:0.5 C5:1 Bb4:1 Ab4:2 F4:1 Ab4:1 C5:1.5 Bb4:0.5 G4:3 R:1', ch:'Cm Ab Fm G', sh:'wave', dr:'pop'},
    a2:{n:'G4:1 C5:1 Eb5:1.5 F5:0.5 G5:1 F5:1 Eb5:2 D5:1 Eb5:1 F5:1.5 D5:0.5 C5:3 R:1', ch:'Cm Eb Bb Cm', sh:'wave', dr:'pop'},
    b:{n:'Ab4:0.5 C5:0.5 Eb5:0.5 Ab5:0.5 G5:1 Eb5:1 Bb4:0.5 D5:0.5 F5:0.5 Bb5:0.5 Ab5:1 F5:1 G4:0.5 B4:0.5 D5:0.5 G5:0.5 F5:0.5 D5:0.5 B4:0.5 D5:0.5 G5:0.25 Ab5:0.25 B5:0.25 C6:0.25 D6:0.25 Eb6:0.25 F6:0.25 G6:0.25 G6:2', ch:'Ab Bb G G', sh:'zig', dr:'build'},
    c:{n:'C6:1.5 G5:0.5 Eb5:1 G5:1 Ab5:1.5 G5:0.5 F5:1 Eb5:1 D5:0.5 Eb5:0.5 F5:0.5 G5:0.5 Ab5:1 Bb5:1 G5:3 B4:1', ch:'Cm Fm Bb G', sh:'star', dr:'drive'},
    c2:{n:'C6:1.5 G5:0.5 Eb5:1 G5:1 Ab5:1.5 Bb5:0.5 C6:1 D6:1 Eb6:0.5 D6:0.5 C6:0.5 Bb5:0.5 Ab5:0.5 G5:0.5 F5:0.5 D5:0.5 C5:2 C6:2', ch:'Cm Bb G Cm', sh:'heart', dr:'drive'},
    d:{n:'Eb5:2 D5:1 C5:1 D5:2 Bb4:2 C5:2 Ab4:1 F4:1 G4:4', ch:'Cm Bb Ab G', sh:'spiral', dr:'half'},
    d2:{n:'C5:0.5 C5:0.5 C5:0.5 C5:0.5 Eb5:0.5 Eb5:0.5 Eb5:0.5 Eb5:0.5 D5:0.5 D5:0.5 D5:0.5 D5:0.5 F5:0.5 F5:0.5 F5:0.5 F5:0.5 Eb5:0.5 Eb5:0.5 G5:0.5 G5:0.5 Ab5:0.5 Ab5:0.5 Bb5:0.5 Bb5:0.5 B5:0.25 B5:0.25 B5:0.25 B5:0.25 B5:0.25 B5:0.25 B5:0.25 B5:0.25 D6:1 G6:1', ch:'Cm Bb Ab G', sh:'circle', dr:'build'},
    o:{n:'C6:0.5 G5:0.5 Eb5:0.5 C5:0.5 G5:0.5 Eb5:0.5 C5:0.5 G4:0.5 Ab4:0.5 C5:0.5 F5:0.5 Ab5:0.5 G5:0.5 B5:0.5 D6:1 C6:4', ch:'Cm Fm Cm', sh:'star', dr:'drive'}},
   form:'i a a2 b c c2 d d2 b c c2 o'}
];
ORIG.forEach(s=>{   // まとまりを つないで 1曲に（n：ふつうの 曲と 同じ 書き方・secs：まとまりの 場所）
  const toks=[], secs=[]; let b=0;
  s.form.split(' ').forEach(k=>{ const p=s.P[k], len=p.n.split(/\s+/).reduce((a,t)=>a+(parseFloat(t.split(':')[1])||1),0); secs.push({beat:b, len, ch:p.ch.split(' '), sh:p.sh, dr:p.dr, k}); toks.push(p.n); b+=len; });
  s.n=toks.join(' '); s.secs=secs; s.orig=1; s.by='Claude 作曲（この アプリの ための 曲）・'+s.key;
});
const MAXMY=30;   // 自分の 曲は 30曲まで
const pcOf=m=>((m%12)+12)%12;
/* ボタンの 並べ方（v673）：note＝音の 名前ごと（7つまで。それより 多い 曲は 高さで 7つに まとめる）・four＝4つ（かんたん） */
const LANE4=[{name:'①',col:'#1e88e5'},{name:'②',col:'#43a047'},{name:'③',col:'#fb8c00'},{name:'④',col:'#e53935'}];
function buildLanes(notes, how){
  const pcs=[...new Set(notes.map(x=>pcOf(x.midi)))].sort((a,b)=>a-b);
  if(how!=='four' && pcs.length<=7) return {lanes:pcs.map(pc=>({name:PC_JA[pc], col:PC_COL[pc], pc})), of:m=>pcs.indexOf(pcOf(m))};
  if(how!=='four' && pcs.length<=9){   // v677：8〜9音は いちばん 少ない 音（♯ など）を となりの 音の ボタンに まとめる（ドレミの ボタンの まま）
    const cnt={}; notes.forEach(x=>{ const c=pcOf(x.midi); cnt[c]=(cnt[c]||0)+x.len; });
    const map={}; let keep=pcs.slice();
    while(keep.length>7){
      const x=keep.reduce((a,b)=>(cnt[b]<cnt[a] ? b : a)), i=keep.indexOf(x), L=keep[i-1], R=keep[i+1];
      const to=L==null ? R : R==null ? L : (x-L<R-x ? L : R-x<x-L ? R : (cnt[L]>=cnt[R] ? L : R));
      map[x]=to; Object.keys(map).forEach(k=>{ if(map[k]===x) map[k]=to; }); keep=keep.filter(y=>y!==x);
    }
    const f=pc=>map[pc]!=null ? map[pc] : pc;
    return {lanes:keep.map(pc=>({name:PC_JA[pc], col:PC_COL[pc], pc})), of:m=>keep.indexOf(f(pcOf(m)))};
  }
  const ms=[...new Set(notes.map(x=>x.midi))].sort((a,b)=>a-b);
  const K=Math.max(1, Math.min(how==='four' ? 4 : 7, ms.length));
  const li=i=>Math.min(K-1, Math.floor(i*K/ms.length));
  const lanes=Array.from({length:K},(_,j)=>{ const g=ms.filter((_,i)=>li(i)===j), lo=g[0], hi=g[g.length-1];
    return how==='four' ? Object.assign({pc:pcOf(lo)}, LANE4[j]) : {name:lo===hi ? midiJa(lo) : midiJa(lo)+'〜', col:PC_COL[pcOf(lo)], pc:pcOf(lo)}; });
  return {lanes, of:m=>li(ms.indexOf(m))};
}
function parseSong(s){
  const out=[]; let t=0;
  for(const tok of String(s.n).split(/\s+/)){
    const [p, d]=tok.split(':'), len=parseFloat(d)||1;
    if(p!=='R'){ const m=noteToMidi(p); if(m!=null) out.push({beat:t, len, midi:m}); }
    t+=len;
  }
  return {notes:out, beats:t};
}
/* 音の 並び（ボタン）：曲に 出る 音の 名前（ド・レ…）を 低い 順に。高さが ちがっても 同じ 名前は 同じ ボタン */
function lanesOf(notes){
  const pcs=[...new Set(notes.map(x=>((x.midi%12)+12)%12))].sort((a,b)=>a-b);
  return pcs;
}

/* ── 昔の 曲を 長く（v677）──
   テーマ（なるべく 曲の 全部の メロディー）を まず 弾き、そのあと Claude が 作った 変奏で 展開する（同じ くり返しに しない）：
   pass＝あいだを 8分音符で つなぐ／dot＝はずむ リズム（付点）／arp＝のばす 音を 和音の 分散に／echo＝のばす 音の あとに 1オクターブ 上の こだま／oct＝1オクターブ 上で しめくくり。
   伴奏の コードは 小節ごとに メロディーに 合う 和音を 自動で えらぶ（k＝調・mi＝短調・bar＝1小節の 拍・p＝アウフタクトの 拍） */
const PNAME=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const KEYPC={C:0, 'C#':1, D:2, Eb:3, E:4, F:5, 'F#':6, G:7, Ab:8, A:9, Bb:10, B:11};
function scaleOf(k, mi){ const t=KEYPC[k]||0; return (mi ? [0,2,3,5,7,8,11] : [0,2,4,5,7,9,11]).map(x=>(x+t)%12); }
function stepFrom(m, dir, sc){ let x=m; for(let i=0;i<3;i++){ x+=dir; if(sc.includes(pcOf(x))) return x; } return m+dir*2; }
function chordsDia(k, mi){
  const t=KEYPC[k]||0, L=mi ? [[0,1,.35],[3,0,.08],[5,1,.2],[7,0,.25],[8,0,.12],[10,0,.05]] : [[0,0,.35],[2,1,.08],[4,1,0],[5,0,.2],[7,0,.25],[9,1,.1]];
  return L.map(([d,m,pr])=>{ const r=(t+d)%12; return {r, pr, pcs:[r, (r+(m ? 3 : 4))%12, (r+7)%12], name:PNAME[r]+(m ? 'm' : '')}; });
}
function harmonize(toks, s, total){
  const bar=s.bar||4, p=s.p||0, C=chordsDia(s.k, s.mi), ev=[], out=[]; let b=0;
  toks.forEach(x=>{ if(x.m!=null) ev.push({b, e:b+x.len, pc:pcOf(x.m)}); b+=x.len; });
  for(let B=p; B<total-1e-6; B+=bar){
    let best=C[0], bs=-1e9;
    for(const c of C){ let sc=c.pr*bar; for(const n of ev){ const ov=Math.min(n.e, B+bar)-Math.max(n.b, B); if(ov<=0) continue; sc+=ov*(Math.abs(n.b-B)<1e-6 ? 1.5 : 1)*(c.pcs.includes(n.pc) ? 1 : -0.4); } if(sc>bs){ bs=sc; best=c; } }
    out.push(best);
  }
  if(out.length){ out[0]=C[0]; out[out.length-1]=C[0]; }   // はじめと おわりは 主和音
  return out;
}
const cp=t=>t.map(x=>({m:x.m, len:x.len}));
function varPass(t, sc){ const out=[]; t.forEach((x,i)=>{ const nx=t[i+1]; if(x.m!=null && x.len>=1 && nx && nx.m!=null){ let pt=nx.m>x.m ? stepFrom(nx.m,-1,sc) : nx.m<x.m ? stepFrom(nx.m,1,sc) : stepFrom(x.m,1,sc); if(pt===x.m) pt=stepFrom(x.m, nx.m>x.m ? -1 : 1, sc); out.push({m:x.m, len:x.len-0.5}, {m:pt, len:0.5}); } else out.push({m:x.m, len:x.len}); }); return out; }
function varDot(t, p){ const out=cp(t); let b=0; for(let i=0;i<out.length;i++){ const x=out[i], nx=out[i+1], pos=b-p; if(x.m!=null && nx && nx.m!=null && x.len===1 && nx.len===1 && Math.abs(pos/2-Math.round(pos/2))<1e-6){ x.len=1.5; nx.len=0.5; b+=2; i++; continue; } b+=x.len; } return out; }
function varArp(t, chs, s){ const bar=s.bar||4, p=s.p||0, out=[]; let b=0;
  t.forEach(x=>{ if(x.m!=null && x.len>=2 && Math.abs(x.len*2-Math.round(x.len*2))<1e-6){ const c=chs[clamp(Math.floor((b-p)/bar),0,chs.length-1)], ups=[x.m]; for(let j=1;j<3;j++){ let y=ups[j-1]+1; while(!c.pcs.includes(pcOf(y)) && y<ups[j-1]+12) y++; ups.push(Math.min(96,y)); } const k=Math.round(x.len*2), pat=[0,1,2,1]; for(let j=0;j<k;j++) out.push({m:ups[pat[j%4]], len:0.5}); } else out.push({m:x.m, len:x.len}); b+=x.len; });
  return out; }
function varEcho(t){ const out=[]; t.forEach(x=>{ if(x.m!=null && x.len>=1.5) out.push({m:x.m, len:x.len-0.5}, {m:Math.min(96, x.m+12), len:0.5}); else out.push({m:x.m, len:x.len}); }); return out; }
function varOct(t, sc){ const hi=Math.max(...t.filter(x=>x.m!=null).map(x=>x.m)), sh=hi+12<=88 ? 12 : 0; return varPass(t.map(x=>({m:x.m==null ? null : x.m+sh, len:x.len})), sc); }
function buildPD(s){
  if(s.secs) return;
  const theme=nToNotes(s.n), bar=s.bar||4, p=s.p||0, sc=scaleOf(s.k||'C', s.mi);
  let L=theme.reduce((a,x)=>a+x.len, 0); const pad=(bar-(L%bar))%bar; if(pad>1e-6){ theme[theme.length-1].len+=pad; L+=pad; }   // 小節に そろえる
  const T=L*60/s.bpm; let n=Math.min(6, Math.max(1, Math.ceil(60/T))); while(n>1 && n*T>125) n--;
  const plan={1:['theme'], 2:['theme','pass'], 3:['theme','dot','oct'], 4:['theme','pass','dot','oct'], 5:['theme','pass','arp','dot','oct'], 6:['theme','pass','arp','dot','echo','oct']}[n];
  const ch0=harmonize(theme, s, L), key0=notesToN(theme), make=v=>v==='pass' ? varPass(theme, sc) : v==='dot' ? varDot(theme, p) : v==='arp' ? varArp(theme, ch0, s) : v==='echo' ? varEcho(theme) : v==='oct' ? varOct(theme, sc) : cp(theme);
  const SH=['wave','circle','zig','eight','star','heart'], DR={theme:'pop', pass:'beat', dot:'pop', arp:'half', echo:'pop', oct:'drive'};
  const secs=[], toks=[], used=new Set(); let beat=0;
  plan.forEach((v,i)=>{
    let t=make(v);
    if(v!=='theme' && notesToN(t)===key0){ const alt=['pass','arp','echo','dot','oct'].find(a=>!used.has(a) && !plan.includes(a) && notesToN(make(a))!==key0); if(alt){ v=alt; t=make(alt); } }   // 変わらない 変奏は 別の 変奏に
    used.add(v);
    secs.push({beat, len:L, ch:harmonize(t, s, L).map(c=>c.name), sh:SH[i%SH.length], dr:bar===3 ? 'waltz' : DR[v], off:p, v});
    toks.push(...t); beat+=L;
  });
  s.theme=s.n; s.n=notesToN(toks); s.secs=secs; s.vars=secs.map(x=>x.v);
  if(!/Claude/.test(s.by)) s.by+='・Claude 編曲（変奏・伴奏）';
}
SONGS.forEach(buildPD);

/* ── 保存 ── */
const DEF={ inst:'piano', vol:0.8, speed:'mid', song:'kira', mode:'fall', helper:false, wait:false, lanes:'note', my:[], diff:3, fx:'ultra', beat:true, lisCenter:true,
  met:{bpm:100, beats:4, sub:1, accent:true, snd:'click'}, tun:{a4:440, set:'chrom'}, best:{} };
let st=JSON.parse(JSON.stringify(DEF));
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  st=JSON.parse(JSON.stringify(DEF));
  if(!o || typeof o!=='object') return;
  if(INST.some(x=>x.id===o.inst)) st.inst=o.inst;
  if(typeof o.vol==='number') st.vol=clamp(o.vol,0,1);
  if(SPEED[o.speed]) st.speed=o.speed;
  if(Array.isArray(o.my)) o.my.slice(0,MAXMY).forEach(x=>{ const c=cleanMy(x); if(c) st.my.push(c); });   // 自分の 曲（v673）
  if(allSongs().some(x=>x.id===o.song)) st.song=o.song;
  st.wait=!!o.wait;
  if(o.lanes==='four') st.lanes='four';
  if(o.mode==='fall' || o.mode==='glow' || o.mode==='slide') st.mode=o.mode;
  if([1,2,3,4,5].includes(+o.diff)) st.diff=+o.diff;
  st.helper=!!o.helper;
  if(FXL.some(x=>x.id===o.fx)) st.fx=o.fx;   // 演出の 強さ（v675）
  if(o.beat===false) st.beat=false;   // 🥁 伴奏（v675）
  if(o.lisCenter===false) st.lisCenter=false;   // 🎤 聞き取りの 高さ（v676）
  const m=o.met||{};
  st.met.bpm=clamp(Math.round(+m.bpm||100),20,260);
  st.met.beats=[1,2,3,4,5,6,7,8,9,12].includes(+m.beats) ? +m.beats : 4;
  st.met.sub=[1,2,3,4].includes(+m.sub) ? +m.sub : 1;
  st.met.accent=m.accent!==false;
  st.met.snd=MSND.some(x=>x.id===m.snd) ? m.snd : 'click';
  const tu=o.tun||{};
  st.tun.a4=clamp(Math.round(+tu.a4||440),430,450);
  st.tun.set=TSET.some(x=>x.id===tu.set) ? tu.set : 'chrom';
  if(o.best && typeof o.best==='object') for(const k in o.best){ if(/^[a-z0-9]+:(fall|glow|slide):(slow|mid|fast)(:4)?(:d[1-5])?$/.test(k) && isFinite(+o.best[k])) st.best[k]=Math.max(0,Math.round(+o.best[k])); }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){ toastS('保存できませんでした（端末の 空きが 少ない かも しれません）'); } }
/* 自分の 曲：{id:'u…', t:曲名, bpm, n:'C4:1 R:1 …'} */
function cleanMy(x){
  if(!x || typeof x!=='object' || !/^u[0-9a-z]{1,16}$/.test(String(x.id))) return null;
  const n=String(x.n||'').slice(0,12000).split(/\s+/).filter(tok=>/^(R|[A-G][#b]?-?\d):\d+(\.\d+)?$/.test(tok)).join(' ');
  if(!n) return null;
  return {id:String(x.id), t:String(x.t||'自分の 曲').slice(0,30), bpm:clamp(Math.round(+x.bpm||100),30,240), n, by:'自分の 曲', lv:0, my:1};
}
function allSongs(){ return ORIG.concat(SONGS, st.my); }

/* ── 音を 作る（Web Audio）── */
let AC=null, master=null;
function ac(){
  if(!AC){
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
    AC=new C(); const comp=AC.createDynamicsCompressor(); master=AC.createGain(); master.gain.value=st.vol;
    master.connect(comp); comp.connect(AC.destination);
  }
  if(AC.state==='suspended') AC.resume();
  return AC;
}
const INST=[
  {id:'piano', n:'🎹 ピアノ'}, {id:'orgel', n:'🎶 オルゴール'}, {id:'xylo', n:'🪵 木琴'}, {id:'bell', n:'🔔 ベル'},
  {id:'chip', n:'👾 ピコピコ'}, {id:'flute', n:'🪈 笛'}, {id:'guitar', n:'🎸 ギター'}, {id:'organ', n:'⛪ オルガン'},
  /* v675：ふやした 音色 */
  {id:'synth', n:'🎛 シンセ'}, {id:'epiano', n:'✨ エレピ'}, {id:'brass', n:'🎺 ラッパ'}, {id:'strings', n:'🎻 ストリングス'},
  {id:'kalimba', n:'🎐 カリンバ'}, {id:'koto', n:'🎏 こと'}, {id:'steel', n:'🛢 スチールドラム'}, {id:'choir', n:'🎤 コーラス'}
];
const FXL=[{id:'calm', n:'ひかえめ'}, {id:'norm', n:'ふつう'}, {id:'ultra', n:'🎆 ド派手'}, {id:'mega', n:'🌈 ドド派手'}];   // 当たった ときの 演出の 強さ（v675。ド派手カウンターと 同じ しくみ）
function env(g, t, a, peak, d, sus, rel, end){
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t+a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak*sus), t+a+d);
  g.gain.setValueAtTime(Math.max(0.0001, peak*sus), end);
  g.gain.exponentialRampToValueAtTime(0.0001, end+rel);
}
function osc(type, f, t, stop, dest, det){ const o=AC.createOscillator(); o.type=type; o.frequency.setValueAtTime(f, t); if(det) o.detune.value=det; o.connect(dest); o.start(t); o.stop(stop); return o; }
function playNote(midi, when, dur, inst){
  if(!ac()) return;
  const t=Math.max(when||AC.currentTime, AC.currentTime), f=midiFreq(midi, 440), d=Math.max(0.08, dur||0.4), id=inst||st.inst;
  const g=AC.createGain(); g.connect(master);
  if(id==='piano'){
    const end=t+Math.min(d,1.6); env(g,t,0.006,0.5,0.35,0.25,0.35,end);
    const g2=AC.createGain(); g2.gain.value=0.35; g2.connect(g);
    osc('triangle',f,t,end+0.4,g); osc('sine',f*2,t,end+0.4,g2); osc('sine',f*3,t,end+0.4,(()=>{ const x=AC.createGain(); x.gain.value=0.12; x.connect(g); return x; })());
  }else if(id==='orgel'){
    const end=t+0.05; env(g,t,0.003,0.45,1.4,0.02,0.6,end+1.2);
    osc('sine',f*2,t,end+2,g); const g2=AC.createGain(); g2.gain.value=0.25; g2.connect(g); osc('sine',f*4,t,end+2,g2);
  }else if(id==='xylo'){
    env(g,t,0.002,0.6,0.25,0.01,0.1,t+0.3);
    osc('sine',f*2,t,t+0.6,g); const g2=AC.createGain(); g2.gain.value=0.2; g2.connect(g); osc('sine',f*8,t,t+0.15,g2);
  }else if(id==='bell'){
    env(g,t,0.004,0.4,1.8,0.02,0.5,t+0.1);
    [[1,1],[2.76,0.45],[5.4,0.25],[8.93,0.12]].forEach(([k,v])=>{ const x=AC.createGain(); x.gain.value=v; x.connect(g); osc('sine',f*2*k,t,t+2.4,x); });
  }else if(id==='chip'){
    const end=t+d*0.9; env(g,t,0.004,0.16,0.05,0.8,0.04,end);
    osc('square',f,t,end+0.1,g);
  }else if(id==='flute'){
    const end=t+d*0.95; env(g,t,0.06,0.45,0.1,0.8,0.12,end);
    const o=osc('sine',f,t,end+0.2,g); const lfo=AC.createOscillator(), lg=AC.createGain(); lfo.frequency.value=5.2; lg.gain.value=f*0.006; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t+0.15); lfo.stop(end+0.2);
    const n=AC.createGain(); n.gain.value=0.05; n.connect(g); osc('sine',f*2,t,end+0.2,n);
  }else if(id==='guitar'){
    env(g,t,0.003,0.55,1.2,0.05,0.3,t+Math.min(d,1.2));
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(f*8,t); lp.frequency.exponentialRampToValueAtTime(f*1.5,t+0.6); lp.Q.value=0.7; lp.connect(g);
    osc('sawtooth',f,t,t+1.8,lp); osc('triangle',f,t,t+1.8,lp,4);
  }else if(id==='synth'){   // のこぎり波 2つ＋フィルターが ひらいて 閉じる
    const end=t+d*0.92; env(g,t,0.005,0.2,0.15,0.6,0.12,end);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=6; lp.frequency.setValueAtTime(f*12,t); lp.frequency.exponentialRampToValueAtTime(f*2.5,t+0.25); lp.connect(g);
    osc('sawtooth',f,t,end+0.2,lp,-7); osc('sawtooth',f,t,end+0.2,lp,7); osc('square',f/2,t,end+0.2,(()=>{ const x=AC.createGain(); x.gain.value=0.3; x.connect(lp); return x; })());
  }else if(id==='epiano'){   // FM の エレクトリック ピアノ
    env(g,t,0.004,0.45,1.1,0.08,0.4,t+Math.min(d,1.4));
    const c=osc('sine',f,t,t+2.2,g), m=AC.createOscillator(), mg=AC.createGain(); m.frequency.value=f; mg.gain.setValueAtTime(f*1.6,t); mg.gain.exponentialRampToValueAtTime(f*0.1,t+0.9); m.connect(mg); mg.connect(c.frequency); m.start(t); m.stop(t+2.2);
    const tine=AC.createGain(); tine.gain.setValueAtTime(0.12,t); tine.gain.exponentialRampToValueAtTime(0.0001,t+0.25); tine.connect(g); osc('sine',f*7,t,t+0.3,tine);
  }else if(id==='brass'){   // 吹くと 明るく なる
    const end=t+d*0.92; env(g,t,0.035,0.32,0.1,0.75,0.1,end);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=1.5; lp.frequency.setValueAtTime(f*1.2,t); lp.frequency.exponentialRampToValueAtTime(f*7,t+0.07); lp.frequency.exponentialRampToValueAtTime(f*3.5,t+0.3); lp.connect(g);
    const o=osc('sawtooth',f,t,end+0.2,lp); osc('sawtooth',f,t,end+0.2,lp,5);
    const lfo=AC.createOscillator(), lg=AC.createGain(); lfo.frequency.value=5.5; lg.gain.value=f*0.004; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t+0.2); lfo.stop(end+0.2);
  }else if(id==='strings'){   // 弦の 重なり（ゆっくり 立ち上がる）
    const end=t+Math.max(d*0.98, 0.25); env(g,t,0.09,0.2,0.2,0.85,0.25,end);
    const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=f*4.5; lp.Q.value=0.5; lp.connect(g);
    [-9,0,9].forEach(dt=>{ const o=osc('sawtooth',f,t,end+0.4,lp,dt); const lfo=AC.createOscillator(), lg=AC.createGain(); lfo.frequency.value=5+dt*0.03; lg.gain.value=f*0.005; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(end+0.4); });
  }else if(id==='kalimba'){   // 親指ピアノ：ポロン
    env(g,t,0.002,0.55,0.9,0.02,0.25,t+0.08);
    osc('sine',f,t,t+1.4,g); const x=AC.createGain(); x.gain.setValueAtTime(0.35,t); x.gain.exponentialRampToValueAtTime(0.0001,t+0.12); x.connect(g); osc('sine',f*5.95,t,t+0.15,x);
    const y=AC.createGain(); y.gain.value=0.12; y.connect(g); osc('triangle',f*2,t,t+0.5,y);
  }else if(id==='koto'){   // 弦を はじく（少し 音が 上がって 落ちつく）
    env(g,t,0.002,0.5,0.8,0.08,0.3,t+Math.min(d,1));
    const bp=AC.createBiquadFilter(); bp.type='lowpass'; bp.frequency.setValueAtTime(f*10,t); bp.frequency.exponentialRampToValueAtTime(f*2,t+0.5); bp.Q.value=2; bp.connect(g);
    const o=osc('sawtooth',f*0.985,t,t+1.6,bp); o.frequency.exponentialRampToValueAtTime(f,t+0.06); osc('triangle',f*2,t,t+1.2,(()=>{ const x=AC.createGain(); x.gain.value=0.25; x.connect(bp); return x; })());
  }else if(id==='steel'){   // スチールドラム：カーン と 明るく
    env(g,t,0.003,0.45,0.7,0.12,0.3,t+Math.min(d,0.8));
    [[1,1],[2,0.55],[3.01,0.22],[4.2,0.1]].forEach(([k,v])=>{ const x=AC.createGain(); x.gain.value=v; x.connect(g); const o=osc('sine',f*k,t,t+1.6,x); o.frequency.exponentialRampToValueAtTime(f*k*0.995,t+0.4); });
  }else if(id==='choir'){   // 声の「アー」（2つの 共鳴を 通す）
    const end=t+Math.max(d*0.96, 0.25); env(g,t,0.1,0.5,0.2,0.85,0.25,end);
    [[800,1],[1150,0.6],[2900,0.18]].forEach(([fq,v])=>{ const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=fq; bp.Q.value=6; const x=AC.createGain(); x.gain.value=v*1.8; bp.connect(x); x.connect(g);
      [-6,6].forEach(dt=>{ const o=osc('sawtooth',f,t,end+0.4,bp,dt); const lfo=AC.createOscillator(), lg=AC.createGain(); lfo.frequency.value=5.2; lg.gain.value=f*0.006; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t+0.1); lfo.stop(end+0.4); }); });
  }else{   // organ
    const end=t+d*0.95; env(g,t,0.02,0.22,0.05,0.9,0.08,end);
    [[1,1],[2,0.5],[3,0.3],[4,0.2]].forEach(([k,v])=>{ const x=AC.createGain(); x.gain.value=v; x.connect(g); osc('sine',f*k,t,end+0.2,x); });
  }
}

/* ── 🥁 メトロノーム ── */
const MSND=[{id:'click',n:'カチッ'},{id:'wood',n:'ウッド'},{id:'beep',n:'ピッ'},{id:'bell',n:'チーン'}];
const TEMPO_NAME=[[40,'グラーヴェ（重く）'],[60,'ラルゴ（ゆったり）'],[66,'ラルゲット（やや ゆったり）'],[76,'アダージョ（ゆっくり）'],[108,'アンダンテ（歩く 速さ）'],[120,'モデラート（中くらい）'],[156,'アレグロ（速く）'],[176,'ヴィヴァーチェ（いきいき）'],[200,'プレスト（とても 速く）'],[999,'プレスティッシモ（いちばん 速く）']];   // その テンポ より 下の 名前
const tempoName=b=>{ for(const [m,n] of TEMPO_NAME) if(b<m) return n; return ''; };
let met={on:false, timer:null, next:0, tick:0, marks:[]};
function clickAt(t, strong, weak){
  const id=st.met.snd, g=AC.createGain(); g.connect(master);
  const f=strong ? 1.5 : weak ? 0.7 : 1, v=strong ? 0.9 : weak ? 0.35 : 0.6;
  if(id==='wood'){
    const len=Math.floor(AC.sampleRate*0.05), buf=AC.createBuffer(1,len,AC.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,4);
    const s=AC.createBufferSource(); s.buffer=buf; const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1800*f; bp.Q.value=4;
    s.connect(bp); bp.connect(g); g.gain.value=v*2.2; s.start(t);
  }else if(id==='beep'){
    env(g,t,0.002,v*0.5,0.04,0.6,0.02,t+0.06); osc('square',880*f,t,t+0.1,g);
  }else if(id==='bell'){
    env(g,t,0.002,v*0.5,0.4,0.05,0.2,t+0.05); osc('sine',1320*f,t,t+0.7,g); const x=AC.createGain(); x.gain.value=0.3; x.connect(g); osc('sine',1320*f*2.76,t,t+0.4,x);
  }else{
    env(g,t,0.001,v*0.8,0.025,0.01,0.01,t+0.03); osc('triangle',1600*f,t,t+0.06,g);
  }
}
function metSched(){
  if(!met.on || !AC) return;
  const spb=60/st.met.bpm, step=spb/st.met.sub;
  while(met.next < AC.currentTime+0.12){
    const beat=Math.floor(met.tick/st.met.sub), inBeat=met.tick%st.met.sub, bar=beat%st.met.beats;
    clickAt(met.next, inBeat===0 && bar===0 && st.met.accent && st.met.beats>1, inBeat!==0);
    if(inBeat===0) met.marks.push({t:met.next, bar});
    met.next+=step; met.tick++;
  }
}
function metDraw(){
  if(!met.on || !AC) return;
  const now=AC.currentTime;
  while(met.marks.length && met.marks[0].t<=now){
    const m=met.marks.shift(), dots=document.querySelectorAll('#otoBody .om-dot');
    dots.forEach((d,i)=>d.classList.toggle('on', i===m.bar));
    const p=$('omPulse'); if(p){ p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit', m.bar===0 && st.met.accent ? 'acc' : 'x'); if(!(m.bar===0 && st.met.accent)) p.classList.remove('acc'); }
    const b=$('omBeatNo'); if(b) b.textContent=String(m.bar+1);
  }
  requestAnimationFrame(metDraw);
}
function metStart(){
  if(!ac()){ toastS('この ブラウザーでは 音を 出せません'); return; }
  met.on=true; met.tick=0; met.marks=[]; met.next=AC.currentTime+0.08;
  clearInterval(met.timer); met.timer=setInterval(metSched, 25); metSched(); requestAnimationFrame(metDraw);
  renderMetBtn();
}
function metStop(){ met.on=false; clearInterval(met.timer); met.timer=null; met.marks=[]; renderMetBtn(); document.querySelectorAll('#otoBody .om-dot').forEach(d=>d.classList.remove('on')); }
function metToggle(){ met.on ? metStop() : metStart(); }
function renderMetBtn(){ const b=$('omGo'); if(b){ b.textContent=met.on ? '■ とめる' : '▶ スタート'; b.classList.toggle('on', met.on); } }
let taps=[];
function metTap(){
  const n=performance.now(); taps=taps.filter(x=>n-x<2500); taps.push(n);
  if(taps.length>=2){ const iv=(taps[taps.length-1]-taps[0])/(taps.length-1); setBpm(Math.round(60000/iv)); }
  const b=$('omTap'); if(b){ b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
}
function setBpm(v){
  st.met.bpm=clamp(Math.round(+v||100),20,260); save();
  const r=$('omBpmR'); if(r && +r.value!==st.met.bpm) r.value=st.met.bpm;
  const n=$('omBpm'); if(n) n.textContent=st.met.bpm;
  const t=$('omName'); if(t) t.textContent=tempoName(st.met.bpm);
}
function setMet(k, v){
  if(k==='beats') st.met.beats=+v; else if(k==='sub') st.met.sub=+v; else if(k==='accent') st.met.accent=!st.met.accent; else if(k==='snd') st.met.snd=v;
  save(); const was=met.on; if(was){ met.tick=0; met.marks=[]; met.next=AC.currentTime+0.06; } render();
  if(k==='snd' && !was && ac()) clickAt(AC.currentTime+0.02, true);
}

/* ── 🎸 チューナー ── */
const TSET=[
  {id:'chrom', n:'すべての 音', s:null},
  {id:'guitar', n:'ギター', s:['E2','A2','D3','G3','B3','E4']},
  {id:'ukulele', n:'ウクレレ', s:['G4','C4','E4','A4']},
  {id:'violin', n:'バイオリン', s:['G3','D4','A4','E5']},
  {id:'bass', n:'ベース', s:['E1','A1','D2','G2']}
];
let tun={on:false, stream:null, src:null, an:null, buf:null, raf:0, hist:[], ref:null, refMidi:null};
async function tunStart(){
  if(!ac()){ toastS('この ブラウザーでは 音を 扱えません'); return; }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toastS('この 画面では マイクを 使えません（https の ページで 開いて ください）', 4200); return; }
  try{
    tun.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}});
  }catch(e){ toastS('マイクを 使えませんでした。ブラウザーの マイクの 許可を ご確認ください', 4600); return; }
  tun.src=AC.createMediaStreamSource(tun.stream); tun.an=AC.createAnalyser(); tun.an.fftSize=4096;
  tun.buf=new Float32Array(tun.an.fftSize); tun.src.connect(tun.an);
  tun.on=true; tun.hist=[]; render(); tunLoop();
}
function tunStop(){
  tun.on=false; cancelAnimationFrame(tun.raf);
  try{ if(tun.src) tun.src.disconnect(); }catch(_){}
  if(tun.stream) tun.stream.getTracks().forEach(t=>t.stop());
  tun.stream=null; tun.src=null; tun.an=null;
}
/* 音の 高さを 見つける（自己相関。ノイズの 多い ときは 出さない） */
function detect(buf, rate){
  const n=buf.length; let rms=0; for(let i=0;i<n;i++) rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/n);
  if(rms<0.008) return null;
  let a=0, b=n-1; const th=0.2; for(let i=0;i<n/2;i++){ if(Math.abs(buf[i])<th){ a=i; break; } } for(let i=1;i<n/2;i++){ if(Math.abs(buf[n-i])<th){ b=n-i; break; } }
  const x=buf.slice(a,b), m=x.length; if(m<64) return null;
  const c=new Float32Array(m); for(let i=0;i<m;i++){ let s=0; for(let j=0;j<m-i;j++) s+=x[j]*x[j+i]; c[i]=s; }
  let d=0; while(d<m-1 && c[d]>c[d+1]) d++;
  let mx=-1, p=-1; for(let i=d;i<m;i++){ if(c[i]>mx){ mx=c[i]; p=i; } }
  if(p<=0 || mx<c[0]*0.5) return null;
  const x1=c[p-1]||c[p], x2=c[p], x3=c[p+1]||c[p], aa=(x1+x3-2*x2)/2, bb=(x3-x1)/2;
  const t0=aa ? p-bb/(2*aa) : p, f=rate/t0;
  return (f>25 && f<4200) ? f : null;
}
function tunLoop(){
  if(!tun.on || !tun.an) return;
  tun.an.getFloatTimeDomainData(tun.buf);
  const f=detect(tun.buf, AC.sampleRate);
  if(f){ tun.hist.push(f); if(tun.hist.length>5) tun.hist.shift(); } else if(tun.hist.length) tun.hist.shift();
  showPitch(tun.hist.length>=2 ? tun.hist.slice().sort((a,b)=>a-b)[tun.hist.length>>1] : null);
  tun.raf=requestAnimationFrame(tunLoop);
}
function showPitch(f){
  const box=$('otNote'); if(!box) return;
  const ndl=$('otNdl'), cent=$('otCent'), hz=$('otHz'), en=$('otEn'), hint=$('otHint');
  if(!f){ box.classList.add('idle'); box.classList.remove('ok'); if(hint) hint.textContent=tun.on ? '音を 鳴らして ください' : ''; return; }
  const set=TSET.find(x=>x.id===st.tun.set), a4=st.tun.a4;
  const m=12*Math.log2(f/a4)+69; let target=Math.round(m);
  if(set.s){ const ts=set.s.map(noteToMidi); target=ts.reduce((b,x)=>Math.abs(x-m)<Math.abs(b-m)?x:b, ts[0]); }
  const c=Math.round((m-target)*100), ok=Math.abs(c)<=5;
  box.classList.remove('idle'); box.classList.toggle('ok', ok);
  box.firstChild.textContent=midiJa(target);
  if(en) en.textContent=midiName(target)+(set.s ? '（'+(set.s.length-set.s.map(noteToMidi).indexOf(target))+'弦）' : '');
  if(hz) hz.textContent=f.toFixed(1)+' Hz';
  if(cent) cent.textContent=(c>0?'+':'')+c+' セント';
  if(ndl) ndl.style.transform='translateX(-50%) rotate('+clamp(c,-50,50)*0.9+'deg)';
  if(hint) hint.textContent=ok ? 'ぴったり！' : c<0 ? (set.s ? '低い：弦を 少し しめる' : '低い ↑') : (set.s ? '高い：弦を 少し ゆるめる' : '高い ↓');
  document.querySelectorAll('#otoBody .ot-str').forEach(b=>b.classList.toggle('on', +b.dataset.m===target));
}
function refTone(midi){
  if(!ac()) return;
  if(tun.ref){ try{ tun.ref.o.stop(); }catch(_){} const was=tun.refMidi; tun.ref=null; tun.refMidi=null; render(); if(was===midi) return; }
  const g=AC.createGain(); g.gain.value=0.0001; g.connect(master); g.gain.exponentialRampToValueAtTime(0.25, AC.currentTime+0.05);
  const o=AC.createOscillator(); o.type='sine'; o.frequency.value=midiFreq(midi, st.tun.a4); o.connect(g); o.start();
  tun.ref={o,g}; tun.refMidi=midi; render();
}
function refStop(){ if(tun.ref){ try{ tun.ref.o.stop(); }catch(_){} tun.ref=null; tun.refMidi=null; } }
function setTun(k, v){ if(k==='a4') st.tun.a4=clamp(st.tun.a4+(+v),430,450); else if(k==='set') st.tun.set=v; save(); refStop(); render(); }

/* ── 🎮 音ゲー（落ちてくる・光る）── */
const SPEED={slow:{n:'ゆっくり', k:0.75, fall:2.6}, mid:{n:'ふつう', k:1, fall:2.0}, fast:{n:'はやい', k:1.25, fall:1.5}};
const WIN={perfect:0.085, good:0.17, miss:0.22};
/* むずかしさ ★1〜★5（v674）：grid＝その 細かさの 音だけ 残す・win＝判定の 幅・k＝速さ・orn＝飾りの 音を 足す */
const DIFF=[null,
  {n:'★1', d:'やさしい：1拍ごとの 音だけ・判定 ゆるめ', win:1.4, k:0.9, grid:1},
  {n:'★2', d:'少し やさしい：半拍より 細かい 音は まとめる', win:1.18, k:1, grid:0.5},
  {n:'★3', d:'ふつう：曲の まま', win:1, k:1, grid:0},
  {n:'★4', d:'むずかしい：速く・判定 きびしめ', win:0.85, k:1.12, grid:0},
  {n:'★5', d:'達人：飾りの 音が ふえて もっと 速く・判定 きびしい', win:0.72, k:1.22, grid:0, orn:true}];
/* 曲を 1〜2分に（v674）：組みこみの 曲は 1分を こえるまで くり返す（2分まで）。くり返しの 2回目ごとに 1オクターブ 上（入らなければ 下）で 変化を つける */
function arrange(s, p){
  if(s.my || s.secs || !p.notes.length) return Object.assign({reps:1}, p);   // v677：組みこみの 曲は 変奏で のばすので くり返さない
  const sec=p.beats*60/s.bpm; if(sec>=60) return Object.assign({reps:1}, p);
  const reps=Math.max(1, Math.min(Math.ceil(60/sec), Math.max(1, Math.floor(120/(sec+60/s.bpm)))));
  const ms=p.notes.map(n=>n.midi), lo=Math.min(...ms), hi=Math.max(...ms);
  const notes=[]; let off=0;
  for(let k=0;k<reps;k++){
    const tr=(k%2===1) ? (hi+12<=88 ? 12 : lo-12>=43 ? -12 : 0) : 0;
    p.notes.forEach(n=>notes.push({beat:n.beat+off, len:n.len, midi:n.midi+tr}));
    off+=p.beats+(k<reps-1 ? 1 : 0);   // くり返しの 間に 1拍 休む
  }
  return {notes, beats:off, reps};
}
function applyDiff(p, d){
  const D=DIFF[d]||DIFF[3]; let notes=p.notes.map(n=>Object.assign({},n));
  if(D.grid){ const out=[]; for(const n of notes){ const q=n.beat/D.grid, on=Math.abs(q-Math.round(q))<1e-6; if(on || !out.length) out.push(n); else out[out.length-1].len+=n.len; } notes=out; }
  if(D.orn){ const out=[]; notes.forEach((n,i)=>{ const nx=notes[i+1]; if(n.len>=1 && nx && nx.midi!==n.midi){ const h=n.len/2; out.push({beat:n.beat, len:h, midi:n.midi}, {beat:n.beat+h, len:h, midi:n.midi+(nx.midi>n.midi ? 2 : -1)}); } else out.push(n); }); notes=out; }
  return {notes, beats:p.beats, reps:p.reps};
}
function songSec(s){ const p=arrange(s, parseSong(s)); return p.beats*60/s.bpm; }
const fmtSec=x=>{ x=Math.round(x); return x>=60 ? Math.floor(x/60)+'分'+(x%60 ? (x%60)+'秒' : '') : x+'秒'; };
let game=null;   // {song, notes:[{t,midi,lane,len,done,res}], lanes, t0, spb, fall, raf, score, combo, max, cnt}
function songOf(){ return allSongs().find(x=>x.id===st.song)||SONGS[0]; }
function bestKey(id){ return (id||songOf().id)+':'+st.mode+':'+st.speed+(st.lanes==='four' ? ':4' : '')+':d'+st.diff; }
function newGame(){
  const s=songOf(), D=DIFF[st.diff]||DIFF[3], p=applyDiff(arrange(s, parseSong(s)), st.diff), L=buildLanes(p.notes, st.lanes), sp=SPEED[st.speed], spb=60/(s.bpm*sp.k*D.k);
  const g={song:s, lanes:L.lanes, spb, fall:sp.fall*(st.diff>=4 ? 0.85 : 1), notes:p.notes.map(x=>({t:x.beat*spb, beat:x.beat, len:x.len*spb, midi:x.midi, lane:L.of(x.midi), res:null})),
    win:{perfect:WIN.perfect*D.win, good:WIN.good*D.win, miss:WIN.miss*D.win}, diff:st.diff, reps:p.reps||1,
    end:p.beats*spb, beats:p.beats, t0:0, raf:0, score:0, combo:0, max:0, fever:false, beams:[], missA:0, cnt:{perfect:0, good:0, miss:0}, early:0, late:0, wait:!!st.wait, playing:false, over:false};
  if(st.mode==='slide') slideSetup(g);
  return g;
}
function gameStart(){
  if(!ac()){ toastS('この ブラウザーでは 音を 出せません'); return; }
  gameStop(); game=newGame(); game.playing=true; game.t0=AC.currentTime+(st.mode==='fall' ? game.fall+0.4 : 2.4);
  if(st.beat && !game.wait) bkStart(backEvents(game.song, game.beats), game.t0, game.spb);   // 🥁 伴奏（待って くれる 練習では 鳴らさない）
  render(); if(st.mode==='slide') slideBind(); fxInit(); game.raf=requestAnimationFrame(gameLoop);
}
function gameStop(){ bkStop(true); if(game){ cancelAnimationFrame(game.raf); game.playing=false; } }
function listen(){   // お手本：曲を ぜんぶ 鳴らす
  if(!ac()) return;
  const g=newGame(), t=AC.currentTime+0.15;
  g.notes.forEach(n=>playNote(n.midi, t+n.t, n.len));
  if(st.beat) bkStart(backEvents(g.song, g.beats), t, g.spb);
  toastS('「'+g.song.t+'」の お手本を 鳴らします（'+Math.round(g.end)+'秒）');
}
const nowT=()=>AC ? AC.currentTime-game.t0 : 0;
function judge(lane){
  if(!game || !game.playing) return;
  const t=nowT();
  let best=null, bd=1e9;
  const W=game.win;
  for(const n of game.notes){ if(n.res || n.lane!==lane) continue; const d=Math.abs(n.t-t); if(d<bd){ bd=d; best=n; } if(n.t-t>W.miss) break; }
  if(best && bd<=W.good){
    const r=scoreHit(best, bd<=W.perfect ? 'perfect' : 'good', t<best.t);
    flash(lane, r); const pt=lanePt(lane); if(pt) hitFx(pt[0], pt[1], laneCol(lane), r, lane);
  }else{
    // 合わない ときも その 列の 音を 小さく 鳴らす（自由に 弾いても よい）
    const m=game.notes.find(n=>n.lane===lane); if(m) playNote(m.midi, AC.currentTime, 0.25);
    flash(lane, 'free'); const pt=lanePt(lane); if(pt) hitFx(pt[0], pt[1], laneCol(lane), 'free', lane);
  }
}
/* 当たった ときの 点・コンボ・音（v674：なぞる と 同じ） */
function scoreHit(n, res, early){
  n.res=res;
  if(res==='good'){ if(early) game.early++; else game.late++; }   // はやい／おそい（v673）
  game.cnt[res]++; game.combo++; game.max=Math.max(game.max, game.combo);
  game.score+=Math.round(((res==='perfect' ? 100 : 60)+Math.min(game.combo,50)*2+(game.diff-3)*10)*(game.fever ? 1.5 : 1));   // 🔥 フィーバー中は 1.5倍（v675）
  playNote(n.midi, AC.currentTime, n.len*0.95);
  if(res==='perfect' && st.fx!=='calm') shan(AC.currentTime);   // ぴったりは「シャン」を 重ねて 気持ちよく
  if(!game.fever && game.combo>=FEVER){ game.fever=true; feverFx(true); }
  return res==='good' ? (early ? 'early' : 'late') : res;
}
let fx=[];   // 出た 判定の 文字
function flash(lane, res){
  fx.push({lane, res, t:performance.now()});
  const b=document.querySelector('#otoBody .og-key[data-l="'+lane+'"]')||document.querySelector('#otoBody .og-pad[data-l="'+lane+'"]');
  if(b){ b.classList.remove('hit','p','g'); void b.offsetWidth; b.classList.add('hit', res==='perfect' ? 'p' : (res==='good'||res==='early'||res==='late') ? 'g' : 'f'); }
  hud();
}
function hud(){
  const s=$('ogScore'), c=$('ogCombo');
  if(s) s.textContent=game ? game.score : 0;
  if(c){ c.textContent=game && game.combo>=3 ? (game.fever ? '🔥' : '')+game.combo+' コンボ' : ''; c.classList.toggle('fev', !!(game && game.fever)); }
}
function gameLoop(){
  if(!game || !game.playing) return;
  let t=nowT();
  // 待って くれる 練習（v673）：つぎの 音符が 線に 来たら、正しい ボタンを 押すまで 時間を 止める
  if(game.wait){ const nx=game.notes.find(n=>!n.res); if(nx && t>=nx.t){ game.t0=AC.currentTime-nx.t; t=nx.t; game.waiting=nx.lane; } else game.waiting=-1; }
  if(st.mode==='slide') slideJudge(t);
  // 通りすぎた 音符は ミス（「手伝い」なら 自動で 鳴らす）
  for(const n of game.notes){
    if(n.res) continue;
    if(n.t>t-game.win.miss) break;
    n.res='miss'; game.cnt.miss++; game.combo=0; if(game.fever){ game.fever=false; feverFx(false); }
    if(st.helper) playNote(n.midi, AC.currentTime, n.len*0.9, st.inst);
    fx.push({lane:n.lane, res:'miss', t:performance.now()}); if(st.mode==='slide') slideMiss(n); else { const pt=lanePt(n.lane); if(pt) hitFx(pt[0], pt[1], '#90a4ae', 'miss', n.lane); } hud();
  }
  if(st.mode==='fall') drawFall(t); else if(st.mode==='slide') drawSlide(t); else drawGlow(t);
  fxFrame();
  if(t>game.end+0.8){ finish(); return; }
  game.raf=requestAnimationFrame(gameLoop);
}
function laneCol(i){ return game.lanes[i].col; }
function drawFall(t){
  const cv=$('ogCv'); if(!cv) return;
  const r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1, W=Math.round(r.width), H=Math.round(r.height);
  if(cv.width!==W*dpr || cv.height!==H*dpr){ cv.width=W*dpr; cv.height=H*dpr; }
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,H);
  const L=game.lanes.length, lw=W/L, hitY=H-14, pps=(hitY)/game.fall;
  for(let i=0;i<L;i++){ x.fillStyle=i%2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.06)'; x.fillRect(i*lw,0,lw,H); }
  // 当たった 列に 光の 柱（v675）
  const pn=performance.now(); game.beams=game.beams.filter(b=>pn-b.t<(b.big ? 320 : 220));
  for(const b of game.beams){ const k=1-(pn-b.t)/(b.big ? 320 : 220), gr=x.createLinearGradient(0,hitY,0,hitY-H*(b.big ? 0.95 : 0.55)); gr.addColorStop(0, b.col); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.globalAlpha=k*(b.big ? 0.75 : 0.45); x.fillStyle=gr; x.fillRect(b.lane*lw+2, 0, lw-4, hitY); x.globalAlpha=1; }
  if(game.fever){ const h=(pn/8)%360; for(let i=0;i<L;i++){ x.fillStyle='hsla('+((h+i*40)%360)+',90%,60%,.07)'; x.fillRect(i*lw,0,lw,H); } }
  x.fillStyle=game.fever ? 'hsl('+((pn/4)%360)+',95%,75%)' : 'rgba(255,255,255,.75)'; x.fillRect(0,hitY-2,W,4);
  if(game.wait && game.waiting>=0){ x.fillStyle='rgba(255,255,255,.16)'; x.fillRect(game.waiting*lw,0,lw,H); x.fillStyle='#fff'; x.font='800 13px system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='top'; x.fillText('押して！', game.waiting*lw+lw/2, 6); }
  for(const n of game.notes){
    const y=hitY-(n.t-t)*pps; if(y<-40) break; if(n.res && n.res!=='miss') continue; if(y>H+30) continue;
    const h=Math.max(16, Math.min(n.len*pps*0.85, 120)), c=laneCol(n.lane);
    x.globalAlpha=n.res==='miss' ? 0.25 : 1; x.fillStyle=c;
    const rx=n.lane*lw+5, rw=lw-10, ry=y-h;
    x.beginPath(); if(x.roundRect) x.roundRect(rx, ry, rw, h, 8); else x.rect(rx, ry, rw, h); x.fill();
    x.fillStyle='rgba(255,255,255,.92)'; x.font='700 '+Math.min(16, lw*0.32)+'px system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='bottom';
    x.fillText(midiJa(n.midi), rx+rw/2, y-4);
    x.globalAlpha=1;
  }
  drawFx(x, lw, hitY-20);
  if(t<0){ x.fillStyle='rgba(255,255,255,.9)'; x.font='800 44px system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(String(Math.ceil(-t*game.song.bpm*SPEED[st.speed].k/60)||''), W/2, H*0.38); }
}
function drawFx(x, lw, y){
  const now=performance.now(); fx=fx.filter(f=>now-f.t<550);
  for(const f of fx){
    if(f.res==='free' || (game && game.fe)) continue;   // ド派手の 演出が ある ときは そちらで 出す
    const a=1-(now-f.t)/550; x.globalAlpha=a; x.textAlign='center'; x.textBaseline='middle'; x.font='800 15px system-ui, sans-serif';
    x.fillStyle=f.res==='perfect' ? '#ffe082' : f.res==='good' ? '#a5d6a7' : '#ef9a9a';
    x.fillStyle=f.res==='perfect' ? '#ffe082' : (f.res==='miss') ? '#ef9a9a' : '#a5d6a7';
    x.fillText(f.res==='perfect' ? 'ぴったり' : f.res==='early' ? 'いいね・はやい' : f.res==='late' ? 'いいね・おそい' : f.res==='good' ? 'いいね' : 'ミス', f.lane*lw+lw/2, y-(1-a)*24);
  }
  x.globalAlpha=1;
}
function drawGlow(t){
  const lead=0.9;
  document.querySelectorAll('#otoBody .og-pad').forEach(p=>{
    const lane=+p.dataset.l; let k=0;
    for(const n of game.notes){ if(n.lane!==lane || n.res) continue; const d=n.t-t; if(d>lead) break; if(d<-game.win.good) continue; k=Math.max(k, 1-Math.max(0,d)/lead); }
    p.style.setProperty('--k', k.toFixed(3));
    p.classList.toggle('lit', k>0);
    p.classList.toggle('now', k>0.88);
  });
  const c=$('ogCnt');
  if(c) c.textContent=t<0 ? String(Math.ceil(-t*game.song.bpm*SPEED[st.speed].k/60)||'') : '';
  const cv=$('ogFx'); if(cv){ const r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1; if(cv.width!==Math.round(r.width*dpr)){ cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); } const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,r.width,r.height); drawFx(x, r.width/game.lanes.length, 18); }
}

/* ── 🥁 伴奏（v675）：ドラム・ベース・和音。オリジナル曲は まとまりごとの リズムと コード、ほかの 曲は かるい 4つ打ち ──
   先読みで AC の 時刻に 合わせて 鳴らすので、メロディーと ずれない。止める ときは 音の 道（bus）ごと 消す */
let bk={timer:0, ev:[], i:0, t0:0, spb:0.5, bus:null};
function chordOf(name){ const m=/^([A-G])([#b]?)(m?)/.exec(String(name||'')); if(!m) return null; const r={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#' ? 1 : m[2]==='b' ? -1 : 0); return {root:((r%12)+12)%12, minor:!!m[3]}; }
function backEvents(s, beats){
  const ev=[], bar=s.bar||4, P=(k,b,o)=>ev.push(Object.assign({k, b}, o||{}));
  for(let b=-Math.min(4, bar===3 ? 3 : 4); b<0; b++) P('stick', b);   // カウント
  if(!s.secs){   // ふつうの 曲：かるい 4つ打ち＋裏で ハイハット
    for(let b=0; b<beats; b++){ P('kick', b, {v:0.55}); P('hat', b+0.5, {v:0.7}); }
    return ev;
  }
  s.secs.forEach((sc, si)=>{
    const nb=sc.off!=null ? sc.ch.length : Math.max(1, Math.round(sc.len/bar)), dr=bar===3 ? 'waltz' : sc.dr;
    for(let i=0;i<nb;i++){
      const b0=sc.beat+(sc.off||0)+i*bar, c=chordOf(sc.ch[i%sc.ch.length]), last=i===nb-1, R=c ? 36+c.root+(c.root>=7 ? -12 : 0)+12 : 48;   // ベースは C2〜F#3 くらい
      const tri=c ? [48+c.root, 48+c.root+(c.minor ? 3 : 4), 48+c.root+7].map(m=>m>=60 ? m-12 : m) : [];
      const at=(k,b,o)=>P(k, b0+b, o);
      if(i===0 && (dr==='drive' || si===0)) at('crash', 0);
      if(dr==='taiko'){ at('tom',0); at('tom',1.5,{v:0.7}); at('tom',2); at('rim',3); at('rim',3.5,{v:0.7}); at('hat',1,{v:0.5}); at('bass',0,{m:R, len:2}); at('bass',2,{m:R+7, len:2}); continue; }   // 和太鼓（v677）
      if(dr==='latin'){ at('kick',0); at('kick',2); [0,1.5,3].forEach(q=>at('rim',q,{v:0.8})); [1,2.5].forEach(q=>at('rim',q,{v:0.5})); for(let q=0;q<8;q++) at('hat',q/2,{v:0.5});
        at('bass',0,{m:R, len:1.5}); at('bass',1.5,{m:R+7, len:0.5}); at('bass',2,{m:R, len:1.5}); at('bass',3.5,{m:R+7, len:0.5}); at('pad',0,{ms:tri, len:3.8}); continue; }   // ボサノバ風（v677）
      if(dr==='waltz'){ at('kick',0); at('hat',1); at('hat',2); at('bass',0,{m:R, len:1}); at('pad',1,{ms:tri, len:0.8}); at('pad',2,{ms:tri, len:0.8}); continue; }
      if(dr==='half'){ at('kick',0); at('snare',2,{v:0.8}); for(let q=0;q<4;q++) at('hat',q,{v:0.8}); at('bass',0,{m:R, len:4}); at('pad',0,{ms:tri, len:4}); continue; }
      if(dr==='beat'){ for(let q=0;q<4;q++){ at('kick',q); at('hat',q+0.5); at('bass',q,{m:R, len:0.45}); at('bass',q+0.5,{m:R+12, len:0.4}); } continue; }
      if(dr==='pop'){ at('kick',0); at('kick',1.5); at('kick',2); at('snare',1); at('snare',3); for(let q=0;q<8;q++) at('hat',q/2,{v:q%2 ? 1 : 0.6});
        at('bass',0,{m:R, len:1}); at('bass',1.5,{m:R, len:0.5}); at('bass',2,{m:R+7, len:1}); at('bass',3,{m:R, len:0.5}); at('bass',3.5,{m:R+12, len:0.5}); continue; }
      if(dr==='build'){ for(let q=0;q<4;q++){ at('kick',q); at('hat',q+0.5); }
        if(last){ for(let q=0;q<16;q++) at('snare',q/4,{v:0.35+q/16*0.7}); at('rise',0,{len:4}); } else { at('snare',1); at('snare',3); }
        for(let q=0;q<8;q++) at('bass',q/2,{m:R+(q%2 ? 12 : 0), len:0.45}); continue; }
      // drive（サビ）：4つ打ち・手拍子・裏の オープンハイハット・8分の ベース・和音の きざみ
      for(let q=0;q<4;q++){ at('kick',q); at('ohat',q+0.5); at('hat',q,{v:0.6}); }
      at('clap',1); at('clap',3); at('snare',1,{v:0.6}); at('snare',3,{v:0.6});
      for(let q=0;q<8;q++) at('bass',q/2,{m:R+(q%2 ? 12 : 0), len:0.42});
      at('pad',0,{ms:tri, len:0.4}); at('pad',1.5,{ms:tri, len:0.4}); at('pad',2.5,{ms:tri, len:0.9});
    }
  });
  return ev.sort((a,b)=>a.b-b.b);
}
let NZ=null;
function noiseBuf(){ if(!NZ){ const n=AC.sampleRate; NZ=AC.createBuffer(1, n, n); const d=NZ.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; } return NZ; }
function nzHit(t, dur, v, type, f, q, dest, f2){
  const s=AC.createBufferSource(); s.buffer=noiseBuf(); const fl=AC.createBiquadFilter(); fl.type=type; fl.frequency.setValueAtTime(f, t); if(f2) fl.frequency.exponentialRampToValueAtTime(f2, t+dur); if(q) fl.Q.value=q;
  const g=AC.createGain(); g.gain.setValueAtTime(Math.max(0.0002, v), t); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  s.connect(fl); fl.connect(g); g.connect(dest||master); s.start(t); s.stop(t+dur+0.02);
}
function shan(t){ if(AC) nzHit(t, 0.07, 0.07, 'highpass', 6500, 0, master); }   // ぴったりの「シャン」
function drum(e, t){
  const B=bk.bus, v=e.v||1, spb=bk.spb;
  if(e.k==='kick'){ const o=AC.createOscillator(), g=AC.createGain(); o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(42, t+0.13); g.gain.setValueAtTime(0.95*v, t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.32); o.connect(g); g.connect(B); o.start(t); o.stop(t+0.34); nzHit(t, 0.012, 0.25*v, 'highpass', 3000, 0, B); }
  else if(e.k==='snare'){ nzHit(t, 0.17, 0.42*v, 'highpass', 1500, 0, B); const o=AC.createOscillator(), g=AC.createGain(); o.type='triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(150, t+0.08); g.gain.setValueAtTime(0.3*v, t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.1); o.connect(g); g.connect(B); o.start(t); o.stop(t+0.12); }
  else if(e.k==='clap'){ [0,0.011,0.022].forEach(d=>nzHit(t+d, 0.1, 0.3*v, 'bandpass', 1500, 1.4, B)); }
  else if(e.k==='hat') nzHit(t, 0.035, 0.13*v, 'highpass', 8500, 0, B);
  else if(e.k==='ohat') nzHit(t, 0.17, 0.1*v, 'highpass', 7800, 0, B);
  else if(e.k==='crash') nzHit(t, 1.5, 0.2*v, 'highpass', 4800, 0, B);
  else if(e.k==='tom'){ const o=AC.createOscillator(), g=AC.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(68, t+0.25); g.gain.setValueAtTime(0.9*v, t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.45); o.connect(g); g.connect(B); o.start(t); o.stop(t+0.5); nzHit(t, 0.05, 0.25*v, 'lowpass', 900, 0, B); }
  else if(e.k==='rim') nzHit(t, 0.03, 0.32*v, 'bandpass', 3200, 6, B);
  else if(e.k==='stick') nzHit(t, 0.04, 0.4, 'bandpass', 2700, 5, B);
  else if(e.k==='rise') nzHit(t, e.len*spb, 0.16, 'bandpass', 400, 3, B, 7000);
  else if(e.k==='bass'){ const f=midiFreq(e.m, 440), d=Math.max(0.08, e.len*spb), g=AC.createGain(), lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t+d); lp.Q.value=5; lp.connect(g); g.connect(B);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42, t+0.006); g.gain.exponentialRampToValueAtTime(0.15, t+d*0.8); g.gain.exponentialRampToValueAtTime(0.0001, t+d+0.05);
    osc('sawtooth', f, t, t+d+0.08, lp); osc('sine', f/2, t, t+d+0.08, (()=>{ const x=AC.createGain(); x.gain.value=0.6; x.connect(g); return x; })()); }
  else if(e.k==='pad'){ const d=Math.max(0.15, e.len*spb), g=AC.createGain(); g.connect(B); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t+Math.min(0.06, d/3)); g.gain.setValueAtTime(0.09, t+d*0.7); g.gain.exponentialRampToValueAtTime(0.0001, t+d+0.12);
    (e.ms||[]).forEach(m=>{ osc('triangle', midiFreq(m, 440), t, t+d+0.15, g); osc('sawtooth', midiFreq(m, 440), t, t+d+0.15, (()=>{ const x=AC.createGain(); x.gain.value=0.18; x.connect(g); return x; })(), 6); }); }
}
function bkTick(){
  if(!AC || !bk.bus) return;
  const now=AC.currentTime, lim=now+0.15;
  while(bk.i<bk.ev.length){ const e=bk.ev[bk.i], t=bk.t0+e.b*bk.spb; if(t>lim) break; bk.i++; if(t<now-0.02) continue; try{ drum(e, t); }catch(_){} }
  if(bk.i>=bk.ev.length){ clearInterval(bk.timer); bk.timer=0; }
}
function bkStart(ev, t0, spb){
  bkStop(true); if(!ac()) return;
  const bus=AC.createGain(); bus.gain.value=0.62; bus.connect(master);
  bk={timer:setInterval(bkTick, 25), ev, i:0, t0, spb, bus}; bkTick();
}
function bkStop(quick){
  clearInterval(bk.timer); bk.timer=0; const b=bk.bus; bk.bus=null; bk.ev=[]; bk.i=0;
  if(b && AC){ try{ const n=AC.currentTime; b.gain.cancelScheduledValues(n); b.gain.setValueAtTime(b.gain.value, n); b.gain.linearRampToValueAtTime(0.0001, n+(quick ? 0.06 : 1.2)); setTimeout(()=>{ try{ b.disconnect(); }catch(_){} }, quick ? 200 : 1500); }catch(_){} }
}

/* ── 🎆 当たった ときの 演出（v675。ド派手カウンターの hade-fx.js を 使う）──
   いいね＝小さな 粒／ぴったり＝大きな 粒・光・輪・「ぴったり！」が はずむ／10コンボごと＝まん中に 大きな 文字・光のすじ・紙ふぶき・ゆれ（50ごとは もっと）。
   30コンボで 🔥 フィーバー（点 1.5倍・ふちが 虹色・うしろで 花火）。ミスは 赤く ふちが くもる。強さは ひかえめ〜ドド派手 */
const FEVER=30;
function fxInit(){
  const cv=$('ogFxL'); if(!cv || !game || !window.HADE_FX || !HADE_FX.Engine) return;
  try{ const e=new HADE_FX.Engine(cv); e.setTheme('neon'); e.setLevel(st.fx); e.amb=0; game.fe=e; game.fts=performance.now(); }catch(_){ game.fe=null; }
}
function lanePt(lane){
  if(!game) return null;
  if(st.mode==='fall'){ const cv=$('ogCv'); if(!cv) return null; const r=cv.getBoundingClientRect(); return [r.left+(lane+0.5)*r.width/game.lanes.length, r.top+r.height-14]; }
  const p=document.querySelector('#otoBody .og-pad[data-l="'+lane+'"]'); if(!p) return null; const r=p.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2];
}
function vib(ms){ if(st.fx==='calm') return; try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(_){} }
function hitFx(cx, cy, col, res, lane){
  if(!game) return;
  const big=res==='perfect', good=res==='good' || res==='early' || res==='late';
  if(lane>=0 && st.mode==='fall' && (big || good)) game.beams.push({lane, t:performance.now(), col, big});
  if(big || good) vib(big ? 14 : 7);
  const e=game.fe; if(!e) return;
  const r=e.cv.getBoundingClientRect(), d=e.d, x=(cx-r.left)*d, y=(cy-r.top)*d, tx=clamp(x, 72*d, e.W-72*d);   // 文字は 画面の 端で 切れない ように
  if(res==='free'){ e.burst(x, y, {n:4, sp:140, pal:[col,'#ffffff'], ring:false, life:0.4}); return; }
  if(res==='miss'){ e.text(tx, y-26*d, 'ミス', {sz:18, col:'#b0bec5', life:0.55, vy:40}); game.missA=1; return; }
  const pal=game.fever ? e.pal() : [col, '#ffffff', col];
  if(big){
    e.burst(x, y, {n:26, sp:480, pal, rs:1.1, life:0.85, gr:260, tr:true});
    e.glow(x, y, 80, col, 0.3); e.ring(x, y, '#ffffff', 0.65);
    e.text(tx, y-40*d, 'ぴったり！', {sz:28, pop:true, grad:['#ffffff','#fff59d','#ffb300'], life:0.62, vy:-80});
  }else{
    e.burst(x, y, {n:10, sp:250, pal, rs:0.55, life:0.55, gr:300});
    e.text(tx, y-34*d, res==='early' ? 'いいね・はやい' : res==='late' ? 'いいね・おそい' : 'いいね', {sz:17, col:'#b9f6ca', life:0.5, vy:-60});
  }
  const c=game.combo; if(c>0 && c%10===0) comboFx(c);
}
function comboFx(c){
  const e=game.fe; if(!e) return; const W=e.W, H=e.H, mega=c%50===0;
  e.text(W/2, H*0.34, c+' コンボ！', {sz:mega ? 64 : 46, pop:true, grad:mega ? ['#ffffff','#7cff00','#00f0ff','#ff2bd6'] : ['#ffffff','#ffd23f','#ff2bd6'], life:1.15, vy:-26});
  e.beams(W/2, H*0.4, {n:mega ? 18 : 10, col:mega ? '#fffb00' : '#ffffff', life:mega ? 1.4 : 0.9, vr:1.6});
  e.confetti(mega ? 90 : 34); e.kick(mega ? 0.8 : 0.3);
  if(mega){ e.spiral(W/2, H*0.4, Math.min(W,H)*0.35, {n:56}); e.flash('#ffffff', 0.28); }
  try{ [0,4,7,12].concat(mega ? [16,19,24] : []).forEach((k,i)=>playNote(84+k, AC.currentTime+i*0.045, 0.25, 'bell')); }catch(_){}
  vib(mega ? [30,40,30] : 20);
}
function feverFx(on){
  const e=game && game.fe;
  if(e) e.amb=on ? 0.6 : 0;
  if(!on || !e) return;
  e.text(e.W/2, e.H*0.5, '🔥 フィーバー！ 点 1.5倍', {sz:34, pop:true, grad:['#fff8d0','#ffb000','#ff4500'], life:1.4, vy:-20});
  e.beams(e.W/2, e.H*0.5, {n:16, col:'#ffb000', life:1.4, vr:-1.2}); e.flash('#ffd27a', 0.25); e.kick(0.5);
  if(AC) nzHit(AC.currentTime, 0.6, 0.12, 'bandpass', 500, 2, master, 8000);
}
function fxFrame(){
  const e=game && game.fe; if(!e || !e.cv.isConnected) return;
  const ts=performance.now(), dt=(ts-game.fts)/1000; game.fts=ts;
  e.resize(); e.step(dt); const g=e.g; g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,e.W,e.H);
  if(game.missA>0){   // ミス：ふちが 赤く くもる
    const gr=g.createRadialGradient(e.W/2, e.H/2, Math.min(e.W,e.H)*0.35, e.W/2, e.H/2, Math.max(e.W,e.H)*0.7); gr.addColorStop(0,'rgba(255,0,0,0)'); gr.addColorStop(1,'rgba(255,40,40,'+(0.32*game.missA).toFixed(3)+')');
    g.fillStyle=gr; g.fillRect(0,0,e.W,e.H); game.missA=Math.max(0, game.missA-dt*3);
  }
  if(game.fever && st.fx!=='calm'){   // フィーバー：虹色の ふち
    const lw=6*e.d, h=(ts/6)%360; g.save(); g.lineWidth=lw;
    if(g.createConicGradient){ const cg=g.createConicGradient(ts/600, e.W/2, e.H/2); for(let i=0;i<=6;i++) cg.addColorStop(i/6, 'hsl('+((h+i*60)%360)+',100%,60%)'); g.strokeStyle=cg; } else g.strokeStyle='hsl('+h+',100%,60%)';
    g.globalAlpha=0.65+0.3*Math.sin(ts/120); g.strokeRect(lw/2, lw/2, e.W-lw, e.H-lw); g.restore();
  }
  e.drawFx();
  const [ox, oy]=e.offset(), m=$('ogCv')||$('ogSl')||document.querySelector('#otoBody .og-glow');
  if(m) m.style.transform=(ox||oy) ? 'translate('+(ox/e.d).toFixed(1)+'px,'+(oy/e.d).toFixed(1)+'px)' : '';
}
/* 終わった ときの お祝い（S・A・フルコンボ・自己ベスト）：画面いっぱいに 花火と 紙ふぶき（4秒） */
function finale(big){
  const ov=$('otoOverlay'); if(!ov || !window.HADE_FX || !HADE_FX.Engine) return;
  const old=$('ogFin'); if(old) old.remove();
  const cv=document.createElement('canvas'); cv.id='ogFin'; cv.className='og-fin'; ov.appendChild(cv);
  let e; try{ e=new HADE_FX.Engine(cv); e.lightBg=!document.body.classList.contains('dark'); e.setTheme('hanabi'); e.setLevel(st.fx); e.finale({shells:big ? 12 : 6, conf:big ? 170 : 90, emo:big ? ['⭐','🎵','✨','🎉'] : ['🎵','✨']}); }catch(_){ cv.remove(); return; }
  try{ [0,4,7,12,7,12,16].forEach((k,i)=>playNote(72+k, AC.currentTime+0.05+i*(i<4 ? 0.09 : 0.14), i===6 ? 0.9 : 0.2, 'brass')); }catch(_){}
  let t0=performance.now(), last=t0;
  const step=ts=>{ if(!cv.isConnected) return; const dt=(ts-last)/1000; last=ts; e.resize(); e.step(dt); e.g.setTransform(1,0,0,1,0,0); e.g.clearRect(0,0,e.W,e.H); e.drawFx(); if(ts-t0<4200) requestAnimationFrame(step); else cv.remove(); };
  requestAnimationFrame(step);
}

/* ── 🌀 なぞる（v674）──
   画面に 散らばった マークへ 指を すべらせて、輪が ちぢんで 重なる ときに 指が 上に あれば 音が 鳴る。
   マークは 曲の 流れに そって なめらかに 並べる（高い 音ほど 上へ・間が 長いほど 遠く）。同じ 曲なら いつも 同じ 並び */
function slideSetup(g){
  let h=2166136261; for(const c of String(g.song.id)+':'+g.diff) h=Math.imul(h^c.charCodeAt(0), 16777619);
  const rnd=()=>{ h=(h+0x6D2B79F5)|0; let t=h; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; };
  let x=0.5, y=0.55, a=rnd()*Math.PI*2;
  const secs=g.song.secs;
  g.notes.forEach((n,i)=>{
    if(secs){   // オリジナル曲：まとまりごとに 決めた 形（まわる・星・ハート…）を 拍に そって なぞる（v675）
      let k=0; while(k+1<secs.length && secs[k+1].beat<=n.beat+1e-6) k++;
      const sc=secs[k], q=(SHAPES[sc.sh]||SHAPES.circle)(n.beat-sc.beat, k, sc.len);
      n.x=clamp(q[0],0.1,0.9); n.y=clamp(q[1],0.14,0.86); n.sh=sc.sh; return;
    }
    if(i>0){
      const pv=g.notes[i-1], gap=n.t-pv.t, d=clamp(0.09+0.2*gap, 0.08, 0.34);
      a+=(rnd()-0.5)*1.5;
      let nx=x+Math.cos(a)*d, ny=y+Math.sin(a)*d-(n.midi-pv.midi)*0.012;
      if(nx<0.12 || nx>0.88){ a=Math.PI-a; nx=x+Math.cos(a)*d; }
      if(ny<0.16 || ny>0.84){ a=-a; ny=y+Math.sin(a)*d; }
      x=clamp(nx,0.12,0.88); y=clamp(ny,0.16,0.84);
    }
    n.x=x; n.y=y;
  });
  g.ptr={x:-1, y:-1, on:false, trail:[]};
  g.parts=[]; g.rings=[]; g.pops=[]; g.pulse=0; g.lead=[0,1.5,1.35,1.15,0.95,0.82][g.diff]||1.15;
  g.rk=[0,1.25,1.12,1,0.92,0.84][g.diff]||1;
}
/* なぞる 形（b＝まとまりの 中の 拍・k＝何番目の まとまり・L＝まとまりの 長さ）→ [x, y]（0〜1） */
const SHAPES={
  circle:(b,k)=>{ const a=(k%2 ? -1 : 1)*b*Math.PI/2-Math.PI/2; return [0.5+0.33*Math.cos(a), 0.5+0.27*Math.sin(a)]; },   // 1小節で 1まわり
  eight:b=>{ const a=b*Math.PI/4; return [0.5+0.34*Math.sin(a), 0.5+0.24*Math.sin(2*a)]; },   // ∞（2小節で 1まわり）
  star:(b,k)=>{ const V=[0,2,4,1,3].map(i=>{ const a=-Math.PI/2+i*2*Math.PI/5+(k%2 ? Math.PI/5 : 0); return [0.5+0.36*Math.cos(a), 0.52+0.3*Math.sin(a)]; }), u=b/2, i=Math.floor(u)%5, f=u-Math.floor(u), p=V[i], q=V[(i+1)%5]; return [p[0]+(q[0]-p[0])*f, p[1]+(q[1]-p[1])*f]; },   // 星（2拍で 1辺）
  wave:b=>{ const u=(b/8)%2, x=u<1 ? u : 2-u; return [0.14+0.72*x, 0.5+0.24*Math.sin(b*Math.PI/2)]; },
  zig:b=>{ const P=[[0.2,0.22],[0.8,0.36],[0.2,0.5],[0.8,0.64],[0.2,0.78],[0.8,0.64],[0.2,0.5],[0.8,0.36]], u=b/2, i=Math.floor(u)%P.length, f=u-Math.floor(u), p=P[i], q=P[(i+1)%P.length]; return [p[0]+(q[0]-p[0])*f, p[1]+(q[1]-p[1])*f]; },
  spiral:(b,k,L)=>{ const pr=b/Math.max(1,L), r=0.07+0.29*pr, a=b*Math.PI/2*(k%2 ? -1 : 1); return [0.5+r*Math.cos(a)*1.15, 0.5+r*Math.sin(a)]; },
  heart:b=>{ const a=b*Math.PI/4, X=16*Math.pow(Math.sin(a),3), Y=13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a); return [0.5+X/16*0.36, 0.47-Y/17*0.32]; }
};
function slideBind(){
  const cv=$('ogSl'); if(!cv || !game) return;
  const pos=e=>{ const r=cv.getBoundingClientRect(); game.ptr.x=e.clientX-r.left; game.ptr.y=e.clientY-r.top; game.ptr.trail.push({x:game.ptr.x, y:game.ptr.y, t:performance.now()}); };
  cv.addEventListener('pointerdown', e=>{ if(!game) return; e.preventDefault(); try{ cv.setPointerCapture(e.pointerId); }catch(_){} game.ptr.on=true; game.ptr.touch=e.pointerType!=='mouse'; pos(e); });
  cv.addEventListener('pointermove', e=>{ if(!game) return; if(e.pointerType==='mouse'){ game.ptr.on=true; game.ptr.touch=false; } if(game.ptr.on) pos(e); });
  const up=e=>{ if(!game) return; if(e.pointerType!=='mouse') game.ptr.on=false; game.ptr.trail.push({x:game.ptr.x, y:game.ptr.y, t:performance.now(), cut:true}); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', e=>{ if(game && e.pointerType==='mouse') game.ptr.on=false; });
}
function slideGeo(){ const cv=$('ogSl'); if(!cv) return null; const r=cv.getBoundingClientRect(); const R=Math.max(30, Math.min(r.width, r.height)*0.085)*game.rk; return {W:r.width, H:r.height, R}; }
function slideIn(n, G){ const p=game.ptr; if(!p.on || p.x<0) return false; const dx=p.x-n.x*G.W, dy=p.y-n.y*G.H; return dx*dx+dy*dy<=(G.R*1.25)*(G.R*1.25); }
function slideJudge(t){
  const G=slideGeo(); if(!G) return; const W=game.win;
  for(const n of game.notes){
    if(n.res) continue;
    const d=t-n.t; if(d<-W.good) break;
    if(d>W.good){ if(n.wasIn){ slideBoom(n, scoreHit(n, 'good', true), G); } continue; }   // 早めに 来て 通りすぎた → いいね・はやい
    if(slideIn(n, G)){
      if(d>=-W.perfect) slideBoom(n, scoreHit(n, d<=W.perfect ? 'perfect' : 'good', false), G);
      else n.wasIn=true;
    }
  }
}
function slideBoom(n, res, G){
  const x=n.x*G.W, y=n.y*G.H, col=PC_COL[pcOf(n.midi)], now=performance.now(), big=res==='perfect';
  if(game.fe){ const r=$('ogSl').getBoundingClientRect(); hitFx(r.left+x, r.top+y, col, res, -1); game.rings.push({x, y, col, t:now, r0:G.R}); game.pulse=Math.min(1, game.pulse+(big ? 0.55 : 0.3)); hud(); return; }
  const k=big ? 16 : 9;
  for(let i=0;i<k;i++){ const a=Math.random()*Math.PI*2, v=(big ? 160 : 100)+Math.random()*180; game.parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, col, t:now, life:420+Math.random()*260, r:2+Math.random()*3.5}); }
  game.rings.push({x, y, col, t:now, r0:G.R});
  game.pops.push({x, y, t:now, res});
  game.pulse=Math.min(1, game.pulse+(big ? 0.55 : 0.3));
  if(game.parts.length>400) game.parts.splice(0, game.parts.length-400);
  hud();
}
function slideMiss(n){ const G=slideGeo(); if(!G) return; if(game.fe){ const r=$('ogSl').getBoundingClientRect(); hitFx(r.left+n.x*G.W, r.top+n.y*G.H, '#90a4ae', 'miss', -1); } else game.pops.push({x:n.x*G.W, y:n.y*G.H, t:performance.now(), res:'miss'}); }
function drawSlide(t){
  const cv=$('ogSl'); if(!cv) return;
  const r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1, W=Math.round(r.width), H=Math.round(r.height);
  if(cv.width!==W*dpr || cv.height!==H*dpr){ cv.width=W*dpr; cv.height=H*dpr; }
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0);
  const now=performance.now(), G={W, H, R:Math.max(30, Math.min(W,H)*0.085)*game.rk};
  // 背景（当てると ふわっと 明るく）
  game.pulse*=0.93;
  const bg=x.createRadialGradient(W/2, H*0.45, 10, W/2, H*0.45, Math.max(W,H)*0.75);
  bg.addColorStop(0, 'rgba('+Math.round(40+90*game.pulse)+','+Math.round(46+60*game.pulse)+','+Math.round(70+110*game.pulse)+',1)'); bg.addColorStop(1, '#0d1014');
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  // これから 来る マーク（遠い 順に 描く）
  const up=[]; for(const n of game.notes){ if(n.res) continue; const d=n.t-t; if(d>game.lead) break; if(d<-game.win.miss) continue; up.push(n); }
  // つぎへの 道しるべ
  x.lineWidth=3; x.setLineDash([6,8]); x.strokeStyle='rgba(255,255,255,.18)';
  x.beginPath(); up.slice(0,4).forEach((n,i)=>{ const px=n.x*W, py=n.y*H; if(i) x.lineTo(px,py); else x.moveTo(px,py); }); x.stroke(); x.setLineDash([]);
  for(let i=up.length-1;i>=0;i--){
    const n=up[i], d=n.t-t, px=n.x*W, py=n.y*H, col=PC_COL[pcOf(n.midi)], a=clamp(1-d/game.lead*0.85, 0.15, 1);
    x.globalAlpha=a;
    // ちぢむ 輪
    if(d>0){ x.strokeStyle=col; x.lineWidth=3; x.beginPath(); x.arc(px, py, G.R*(1+2.2*d/game.lead), 0, Math.PI*2); x.stroke(); }
    const gr=x.createRadialGradient(px, py-G.R*0.3, 2, px, py, G.R);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, col); gr.addColorStop(1, col);
    x.fillStyle=gr; x.beginPath(); x.arc(px, py, G.R, 0, Math.PI*2); x.fill();
    x.lineWidth=n.wasIn ? 5 : 3; x.strokeStyle=n.wasIn ? '#fff' : 'rgba(255,255,255,.85)'; x.stroke();
    x.fillStyle='#fff'; x.font='900 '+Math.round(G.R*0.62)+'px system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle';
    x.shadowColor='rgba(0,0,0,.45)'; x.shadowBlur=4; x.fillText(midiJa(n.midi), px, py+1); x.shadowBlur=0;
    if(game.wait && game.waiting>=0 && n===up[0] && d<=0){ x.font='800 13px system-ui, sans-serif'; x.fillText('ここへ！', px, py-G.R-14); }
    x.globalAlpha=1;
  }
  // はじける 輪と 粒
  game.rings=game.rings.filter(g=>now-g.t<420);
  for(const g of game.rings){ const k=(now-g.t)/420; x.globalAlpha=1-k; x.strokeStyle=g.col; x.lineWidth=6*(1-k)+1; x.beginPath(); x.arc(g.x, g.y, g.r0*(1+k*1.6), 0, Math.PI*2); x.stroke(); }
  game.parts=game.parts.filter(p=>now-p.t<p.life);
  for(const p of game.parts){ const k=(now-p.t)/1000, life=(now-p.t)/p.life; x.globalAlpha=1-life; x.fillStyle=p.col; x.beginPath(); x.arc(p.x+p.vx*k, p.y+p.vy*k+120*k*k, p.r*(1-life*0.5), 0, Math.PI*2); x.fill(); }
  x.globalAlpha=1;
  // 指の 光の すじ
  const tr=game.ptr.trail=game.ptr.trail.filter(q=>now-q.t<260);
  if(tr.length>1){ x.lineCap='round'; x.lineJoin='round'; x.shadowColor='#9fe7ff'; x.shadowBlur=14;
    for(let i=1;i<tr.length;i++){ if(tr[i].cut) continue; const k=1-(now-tr[i].t)/260; x.strokeStyle='rgba(200,245,255,'+k.toFixed(3)+')'; x.lineWidth=2+9*k; x.beginPath(); x.moveTo(tr[i-1].x, tr[i-1].y); x.lineTo(tr[i].x, tr[i].y); x.stroke(); }
    x.shadowBlur=0; }
  if(game.ptr.on && game.ptr.x>=0){ x.fillStyle='rgba(255,255,255,.9)'; x.beginPath(); x.arc(game.ptr.x, game.ptr.y, 7, 0, Math.PI*2); x.fill(); }
  // 判定の 文字
  game.pops=game.pops.filter(p=>now-p.t<600);
  for(const p of game.pops){ const k=(now-p.t)/600; x.globalAlpha=1-k; x.font='900 '+(p.res==='perfect' ? 18 : 15)+'px system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle';
    x.fillStyle=p.res==='perfect' ? '#ffe082' : p.res==='miss' ? '#ef9a9a' : '#a5d6a7';
    x.fillText(p.res==='perfect' ? 'ぴったり！' : p.res==='early' ? 'いいね・はやい' : p.res==='late' ? 'いいね・おそい' : p.res==='miss' ? 'ミス' : 'いいね', p.x, p.y-G.R-10-k*26); }
  x.globalAlpha=1;
  // 大きな コンボ
  if(game.combo>=5){ const big=game.combo%25===0 ? 1.25 : 1; x.globalAlpha=0.16+Math.min(0.3, game.pulse*0.4); x.fillStyle='#fff'; x.font='900 '+Math.round(Math.min(W,H)*0.2*big)+'px system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(String(game.combo), W/2, H/2); x.globalAlpha=1; }
  if(t<0){ x.fillStyle='rgba(255,255,255,.92)'; x.font='800 46px system-ui, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(String(Math.ceil(-t/game.spb)||''), W/2, H*0.4);
    x.font='700 14px system-ui, sans-serif'; x.fillText('指を おいて、光る マークへ すべらせよう', W/2, H*0.4+40); }
}
function finish(){
  game.playing=false; game.over=true; cancelAnimationFrame(game.raf);
  bkStop(false); const fe=$('ogFxL'); if(fe) fe.remove();
  const k=bestKey(game.song.id), prev=st.best[k]||0, newBest=!game.wait && game.score>prev;   // 待って くれる 練習は ベストに しない
  if(newBest){ st.best[k]=game.score; save(); }
  const tot=game.notes.length, rate=tot ? (game.cnt.perfect+game.cnt.good*0.6)/tot : 0;
  game.rank=rate>=0.95 ? 'S' : rate>=0.85 ? 'A' : rate>=0.7 ? 'B' : rate>=0.5 ? 'C' : 'D';
  game.newBest=newBest; game.rate=rate; game.fc=game.cnt.miss===0 && tot>0;
  render();
  if(game.rank==='S' || game.rank==='A' || game.fc || newBest) finale(game.rank==='S' || game.fc);
}

/* ── 画面 ── */
let tab='met';
function seg(name, opts, cur, fn){ return '<div class="oo-seg" role="group" aria-label="'+esc(name)+'">'+opts.map(o=>'<button type="button" class="'+(String(o.id)===String(cur)?'on':'')+'" aria-pressed="'+(String(o.id)===String(cur))+'" onclick="OTO.'+fn+'(\''+o.id+'\')">'+esc(o.n)+'</button>').join('')+'</div>'; }
function render(){
  const b=$('otoBody'); if(!b) return;
  document.querySelectorAll('#otoOverlay .oo-tabs button').forEach(x=>{ const on=x.dataset.t===tab; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  if(tab==='met') b.innerHTML=htmlMet();
  else if(tab==='tun') b.innerHTML=htmlTun();
  else if(tab==='make'){ b.innerHTML=htmlMake(); renderRoll(); }
  else b.innerHTML=htmlGame();
  if(tab==='met') setBpm(st.met.bpm);
  if(tab==='game' && game && game.playing){ hud(); }
}
function htmlMet(){
  const dots=Array.from({length:st.met.beats},(_,i)=>'<span class="om-dot'+(i===0 && st.met.accent ? ' acc' : '')+'"></span>').join('');
  return '<div class="om">'
    +'<div class="om-pulse" id="omPulse"><b id="omBeatNo">1</b></div>'
    +'<div class="om-dots">'+dots+'</div>'
    +'<div class="om-bpm"><button type="button" onclick="OTO.bpm(-1)" aria-label="1 おそく">−</button><div><b id="omBpm">'+st.met.bpm+'</b><small>BPM（1分に '+st.met.bpm+'拍）</small><span id="omName"></span></div><button type="button" onclick="OTO.bpm(1)" aria-label="1 はやく">＋</button></div>'
    +'<input type="range" id="omBpmR" min="20" max="260" value="'+st.met.bpm+'" oninput="OTO.setBpm(this.value)" aria-label="テンポ">'
    +'<div class="om-row"><button type="button" class="om-go'+(met.on?' on':'')+'" id="omGo" onclick="OTO.met()">'+(met.on?'■ とめる':'▶ スタート')+'</button><button type="button" class="om-tap" id="omTap" onpointerdown="OTO.tap()">👆 タップで テンポ</button></div>'
    +'<h4>拍子</h4>'+seg('拍子',[1,2,3,4,5,6,7,8,9,12].map(x=>({id:x,n:x===1?'なし':x+'拍子'})),st.met.beats,'beats')
    +'<h4>1拍の 刻み</h4>'+seg('刻み',[{id:1,n:'♩ 4分'},{id:2,n:'♪♪ 8分'},{id:3,n:'3連'},{id:4,n:'16分'}],st.met.sub,'sub')
    +'<h4>音</h4>'+seg('音',MSND,st.met.snd,'snd')
    +'<label class="oo-chk"><input type="checkbox" '+(st.met.accent?'checked':'')+' onchange="OTO.accent()"> 1拍目を 強く（高い 音）</label>'
    +'<div class="om-pre">'+[60,80,100,120,140,160].map(v=>'<button type="button" onclick="OTO.setBpm('+v+')">'+v+'</button>').join('')+'</div>'
    +'</div>';
}
function htmlTun(){
  const set=TSET.find(x=>x.id===st.tun.set);
  const strs=set.s ? '<div class="ot-strs">'+set.s.map((s,i)=>{ const m=noteToMidi(s); return '<button type="button" class="ot-str'+(tun.refMidi===m?' play':'')+'" data-m="'+m+'" onclick="OTO.ref('+m+')"><b>'+(set.s.length-i)+'弦</b>'+midiJa(m)+'<small>'+midiName(m)+'</small></button>'; }).join('')+'</div>'
    : '<div class="ot-strs ot-ch">'+[60,62,64,65,67,69,71,72].map(m=>'<button type="button" class="ot-str'+(tun.refMidi===m?' play':'')+'" data-m="'+m+'" onclick="OTO.ref('+m+')">'+midiJa(m)+'<small>'+midiName(m)+'</small></button>').join('')+'</div>';
  return '<div class="ot">'
    +'<div class="ot-meter"><div class="ot-scale"><span>−50</span><span>0</span><span>+50</span></div><div class="ot-ndl" id="otNdl"></div></div>'
    +'<div class="ot-note idle" id="otNote">ー<small id="otEn"></small></div>'
    +'<div class="ot-sub"><span id="otCent"></span><span id="otHz"></span></div>'
    +'<div class="ot-hint" id="otHint">'+(tun.on ? '音を 鳴らして ください' : '')+'</div>'
    +'<button type="button" class="om-go'+(tun.on?' on':'')+'" onclick="OTO.mic()">'+(tun.on ? '■ マイクを とめる' : '🎤 マイクで はかる')+'</button>'
    +'<h4>合わせる もの</h4>'+seg('楽器',TSET,st.tun.set,'tset')
    +'<h4>お手本の 音（押すと 鳴る・もう一度で 止まる）</h4>'+strs
    +'<div class="ot-a4"><span>基準の ラ（A4）</span><button type="button" onclick="OTO.a4(-1)">−</button><b>'+st.tun.a4+' Hz</b><button type="button" onclick="OTO.a4(1)">＋</button></div>'
    +'<p class="oo-note">マイクの 音は この 端末の 中だけで 使い、どこにも 送りません。まわりが うるさいと はかれない ことが あります。</p>'
    +'</div>';
}
function songBtn(x, cur){
  const b=st.best[bestKey(x.id)];
  return '<button type="button" class="'+(x.id===cur?'on':'')+'" onclick="OTO.song(\''+x.id+'\')"><b>'+esc(x.t)+'</b><small>'+(x.orig ? ['','🌱 やさしい・','🌿 ふつう・','🌳 むずかしい・'][x.lv]||'' : '')+'⏱ '+fmtSec(songSec(x))+'　'+(x.my ? '🎼 自分の曲・'+parseSong(x).notes.length+'音' : esc(x.by))+(b?'　🏆'+b:'')+'</small></button>';
}
function htmlGame(){
  const s=songOf(), best=st.best[bestKey()]||0;
  if(game && (game.playing)) return htmlPlay();
  const res=game && game.over ? '<div class="og-res"><div class="og-rank r'+game.rank+'">'+game.rank+'</div><div><b>'+game.score+' 点</b><em class="df">'+(DIFF[game.diff]||DIFF[3]).n+'</em>'+(game.newBest?'<em>自己ベスト！</em>':'')+(game.fc?'<em class="fc">フルコンボ！</em>':'')+(game.wait?'<em class="pr">練習</em>':'')
    +'<small>正確さ '+Math.round(game.rate*100)+'％ ・ ぴったり '+game.cnt.perfect+' ・ いいね '+game.cnt.good+'（はやい '+game.early+'・おそい '+game.late+'） ・ ミス '+game.cnt.miss+' ・ 最大 '+game.max+' コンボ</small>'
    +(game.early+game.late>=3 ? '<small class="og-tip">'+(game.early>game.late*1.5 ? '💡 少し 早めに 押す くせが あります。線に 来るまで 待ってみましょう' : game.late>game.early*1.5 ? '💡 少し 遅れぎみです。音符を 見て 先に 指を 用意しましょう' : '💡 早い・遅いが まざって います。メトロノームで テンポを 体に 入れると 合いやすく なります')+'</small>' : '')
    +'</div></div>' : '';
  const groups=[[1,'🌱 やさしい 曲'],[2,'🌿 ふつうの 曲'],[3,'🌳 むずかしい 曲']].map(([lv,name])=>{ const l=SONGS.filter(x=>x.lv===lv); return '<div class="og-gname">'+name+'</div>'+l.map(x=>songBtn(x, s.id)).join(''); }).join('');
  const orig='<div class="og-gname">⚡ ゲーム用 オリジナル曲（伴奏つき）</div>'+ORIG.map(x=>songBtn(x, s.id)).join('');
  const mine='<div class="og-gname">🎼 自分の曲'+(st.my.length ? '（'+st.my.length+'）' : '')+'</div>'+(st.my.length ? st.my.map(x=>songBtn(x, s.id)).join('') : '<div class="og-none">まだ ありません。上の「🎼 曲をつくる」で 作れます</div>');
  return '<div class="og">'+res
    +'<h4>あそび方</h4>'+seg('あそび方',[{id:'fall',n:'⬇ 落ちてくる'},{id:'glow',n:'🌈 光る ボタン'},{id:'slide',n:'🌀 なぞる'}],st.mode,'mode')
    +'<p class="oo-note">'+(st.mode==='fall' ? '上から 落ちて くる 音符が 下の 線に 来たら、同じ 色の ボタンを 押します。合うと その 音が 鳴って メロディーに なります。' : st.mode==='slide' ? '画面に 指を おいた まま、光る マークへ すべらせます。まわりの 輪が ちぢんで マークに 重なる ときに 指が 上に あると 音が 鳴ります（パソコンは マウスを 動かすだけ）。' : '色が 付いて 輪が しぼんだ ボタンを 押します。合うと その 音が 鳴って メロディーに なります。')+'</p>'
    +'<h4>むずかしさ</h4>'+seg('むずかしさ',DIFF.slice(1).map((x,i)=>({id:i+1,n:x.n})),st.diff,'diff')
    +'<p class="oo-note">'+esc((DIFF[st.diff]||DIFF[3]).d)+'</p>'
    +'<h4>曲</h4><div class="og-songs">'+orig+groups+mine+'</div>'
    +'<h4>ボタン</h4>'+seg('ボタン',[{id:'note',n:'🎹 音ごと（ド・レ・ミ…）'},{id:'four',n:'4️⃣ 4つだけ（かんたん）'}],st.lanes,'lanes')
    +'<h4>音色</h4>'+seg('音色',INST,st.inst,'inst')
    +'<h4>速さ</h4>'+seg('速さ',Object.keys(SPEED).map(id=>({id,n:SPEED[id].n})),st.speed,'speed')
    +'<h4>当たった ときの 演出</h4>'+seg('演出',FXL,st.fx,'fx')
    +'<p class="oo-note">'+(st.fx==='calm' ? '光の 粒を 少なく、画面の ゆれ・点滅・ふるえ（振動）なし。' : st.fx==='norm' ? '粒と 光で 知らせます。10コンボごとに お祝い。' : st.fx==='ultra' ? 'ぴったりで 大きく はじけ、10コンボごとに 光の すじと 紙ふぶき・画面が ゆれます。30コンボで 🔥 フィーバー（点 1.5倍）。' : 'さらに 粒が 多く、流れ星や 光の 輪も。とても 激しいので、光や ゆれが 苦手な 方は ご注意ください。')+'</p>'
    +'<label class="oo-chk"><input type="checkbox" '+(st.beat?'checked':'')+' onchange="OTO.beat()"> 🥁 伴奏を 鳴らす（ドラム。⚡ オリジナル曲は ベースと 和音も）</label>'
    +'<label class="oo-chk"><input type="checkbox" '+(st.wait?'checked':'')+' onchange="OTO.wait()"> 🐢 待って くれる 練習（音符が 線で 止まり、正しい ボタンを 押すまで 進まない。点は ベストに 入れません）</label>'
    +'<label class="oo-chk"><input type="checkbox" '+(st.helper?'checked':'')+' onchange="OTO.helper()"> 押しそこねた 音も 鳴らす（メロディーが とぎれない）</label>'
    +'<div class="om-row"><button type="button" class="om-go" onclick="OTO.start()">▶ あそぶ'+(best?'（ベスト '+best+'）':'')+'</button><button type="button" class="om-tap" onclick="OTO.listen()">👂 お手本</button></div>'
    +(s.my ? '<div class="om-row"><button type="button" class="om-tap" onclick="OTO.edit(\''+s.id+'\')">✏ この曲を なおす</button></div>' : '')
    +'<p class="oo-note">⚡ オリジナル曲は この アプリの ために Claude が 作った 曲です（なぞる ときは 星・ハート・うず などの 形に 並びます）。ほかの 曲は 作者が 亡くなって 長い 年月が たった 曲や、昔から 伝わる 曲の メロディーです（歌詞は 入れて いません）。</p>'
    +'</div>';
}
function htmlPlay(){
  const L=game.lanes, keys=L.map((ln,i)=>'<button type="button" class="og-key" data-l="'+i+'" style="--c:'+ln.col+'" onpointerdown="OTO.hit('+i+',event)">'+esc(ln.name)+'<small>'+(KEYS[i]||'').toUpperCase()+'</small></button>').join('');
  const top='<div class="og-hud"><span>'+esc(game.song.t)+'　'+(DIFF[game.diff]||DIFF[3]).n+(game.wait?'（練習）':'')+'</span><b id="ogScore">0</b><em id="ogCombo"></em><button type="button" onclick="OTO.quit()">やめる</button></div>';
  const fl='<canvas id="ogFxL" class="og-fxl" aria-hidden="true"></canvas>';   // 演出の 重ね（v675）
  if(st.mode==='slide') return '<div class="og-play">'+top+'<canvas id="ogSl" class="og-sl"></canvas>'+fl+'</div>';
  if(st.mode==='fall') return '<div class="og-play">'+top+'<canvas id="ogCv" class="og-cv"></canvas><div class="og-keys" style="--n:'+L.length+'">'+keys+'</div>'+fl+'</div>';
  const pads=L.map((ln,i)=>'<button type="button" class="og-pad" data-l="'+i+'" style="--c:'+ln.col+'" onpointerdown="OTO.hit('+i+',event)"><span>'+esc(ln.name)+'</span></button>').join('');
  return '<div class="og-play">'+top+'<div class="og-glow"><canvas id="ogFx" class="og-fx"></canvas><div class="og-cnt" id="ogCnt"></div><div class="og-pads n'+L.length+'">'+pads+'</div></div>'+fl+'</div>';
}

/* ── 🎼 曲を つくる（v673）──
   鍵盤を 押して 1音ずつ 入れる・ドレミの 文字で 入れる・ピアノを 弾いて 録音する。作った 曲は 音ゲーで あそべる。
   文字の 書き方：ド レ ミ ファ ソ ラ シ（ひらがなでも）。♯ は「ド#」、♭ は「レb」。高い 音は「ド↑」（↑ か ' か ^）、低い 音は「ド↓」（↓ か _）。
   長さは 1拍が もと。「ドー」で 2拍、「ド2」「ド:2」で 2拍、「ド:0.5」で 半分。休みは「休」「R」「ン」。C4:1 の 書き方も 読める */
const ED_LENS=[{id:4,n:'4拍'},{id:2,n:'2拍'},{id:1,n:'1拍'},{id:0.5,n:'½拍'},{id:0.25,n:'¼拍'}];
const MAXNOTES=1000;
let ed=null;
function newEd(){ return {id:null, t:'', bpm:100, notes:[], len:1, dot:false, oct:4, sel:-1, rec:false, recs:[], timers:[], playIdx:-1, dirty:false}; }
const KANA={'ド':0,'レ':2,'ミ':4,'ファ':5,'ソ':7,'ラ':9,'シ':11};
function hira2kata(s){ return String(s).replace(/[ぁ-ゖ]/g, c=>String.fromCharCode(c.charCodeAt(0)+0x60)); }
/* 文字 → [{m:midi|null, len}]（読めない 字は とばす） */
function parseText(str){
  let s=hira2kata(String(str||'')); try{ s=s.normalize('NFKC'); }catch(_){}
  s=s.replace(/♯/g,'#').replace(/♭/g,'b');
  const out=[], re=/(R|休|ン)|([A-G][#b]?-?\d)|(ファ|ド|レ|ミ|ソ|ラ|シ)([#b])?([↑'^’]*)([↓_]*)/y;
  let i=0;
  while(i<s.length && out.length<MAXNOTES){
    re.lastIndex=i; const m=re.exec(s);
    if(!m){ i++; continue; }
    i=re.lastIndex;
    let midi=null;
    if(m[2]) midi=noteToMidi(m[2]);
    else if(m[3]){ midi=60+KANA[m[3]]+(m[4]==='#'?1:m[4]==='b'?-1:0)+12*((m[5]||'').length-(m[6]||'').length); }
    // 長さ：「:2」「2」「ー」
    let len=1;
    const lm=/^:?(\d+(?:\.\d+)?|\.\d+)/.exec(s.slice(i));
    if(lm && !(m[2] && !s.slice(i).startsWith(':'))){ len=parseFloat(lm[1]); i+=lm[0].length; }
    while(s[i]==='ー' || s[i]==='-'){ len+=1; i++; }
    len=clamp(Math.round(len*4)/4 || 0.25, 0.25, 16);
    if(m[2] && midi==null) continue;
    if(midi!=null) midi=clamp(midi, 36, 96);
    out.push({m:midi, len});
  }
  return out;
}
/* [{m,len}] → ドレミの 文字 */
function noteText(n){
  if(n.m==null) return '休'+(n.len!==1 ? ':'+n.len : '');
  const o=Math.floor(n.m/12)-1-4;
  return PC_JA[pcOf(n.m)].replace('♯','#')+(o>0 ? '↑'.repeat(o) : o<0 ? '↓'.repeat(-o) : '')+(n.len!==1 ? ':'+n.len : '');
}
function toText(notes){ return notes.map(noteText).join(' '); }
function notesToN(notes){ return notes.map(n=>(n.m==null ? 'R' : midiName(n.m).replace('♯','#'))+':'+n.len).join(' '); }
function nToNotes(nstr){ const out=[]; String(nstr).split(/\s+/).forEach(tok=>{ const [p,d]=tok.split(':'); const len=parseFloat(d)||1; if(p==='R') out.push({m:null,len}); else { const m=noteToMidi(p); if(m!=null) out.push({m,len}); } }); return out; }
function shareText(){ return '🎵'+(ed.t||'自分の曲')+'｜'+ed.bpm+'｜'+toText(ed.notes); }
function curLen(){ return ed.len*(ed.dot ? 1.5 : 1); }
function edPut(n){
  if(ed.notes.length>=MAXNOTES){ toastS('1曲 '+MAXNOTES+'音までです'); return; }
  const at=ed.sel>=0 ? ed.sel+1 : ed.notes.length;
  ed.notes.splice(at, 0, n); ed.sel=at; ed.dirty=true; renderRoll();
}
function edKey(m, e){
  if(e) e.preventDefault();
  playNote(m, 0, Math.min(1.2, curLen()*60/ed.bpm));
  const k=document.querySelector('#otoBody .ok-key[data-m="'+m+'"]'); if(k){ k.classList.remove('hit'); void k.offsetWidth; k.classList.add('hit'); }
  if(ed.rec){ ed.recs.push({m, at:performance.now()}); const c=$('okRecN'); if(c) c.textContent=ed.recs.length+'音'; return; }
  edPut({m, len:curLen()});
}
function edRest(){ if(ed.rec) return; edPut({m:null, len:curLen()}); }
function edDel(){
  if(!ed.notes.length) return;
  const i=ed.sel>=0 ? ed.sel : ed.notes.length-1;
  ed.notes.splice(i,1); ed.sel=Math.min(i-1, ed.notes.length-1); ed.dirty=true; renderRoll();
}
function edSel(i){
  if(ed.sel===i){ // もう一度 押すと いまの 長さに する
    const n=ed.notes[i]; if(n && n.len!==curLen()){ n.len=curLen(); ed.dirty=true; renderRoll(); return; }
    ed.sel=-1; renderRoll(); return;
  }
  ed.sel=i; const n=ed.notes[i]; if(n && n.m!=null) playNote(n.m, 0, Math.min(1.2, n.len*60/ed.bpm)); renderRoll();
}
/* 録音：押した 時間の 間を テンポで 拍に して ¼拍に そろえる */
function edRec(){
  if(!ed.rec){ edStop(); ed.rec=true; ed.recs=[]; render(); toastS('🔴 録音中：鍵盤を 弾いて ください。もう一度 押すと 曲に 入れます', 3200); return; }
  ed.rec=false;
  const r=ed.recs, spb=60/ed.bpm;
  if(r.length){
    const add=r.map((x,i)=>{ const dt=i<r.length-1 ? (r[i+1].at-x.at)/1000 : spb; return {m:x.m, len:clamp(Math.round(dt/spb*4)/4, 0.25, 8)}; });
    const at=ed.sel>=0 ? ed.sel+1 : ed.notes.length;
    ed.notes.splice(at, 0, ...add.slice(0, MAXNOTES-ed.notes.length)); ed.sel=at+add.length-1; ed.dirty=true;
    toastS(add.length+'音を 入れました（テンポ '+ed.bpm+' で 長さを そろえました）');
  }
  ed.recs=[]; render();
}
/* ── 🎤 マイクで 聞き取る（v676）──
   鼻歌・口笛・1つの 楽器の メロディーを マイクで 聞いて、音の 高さと 長さに 分けて 曲に する。
   1こまごとに 高さ（チューナーと 同じ しくみ）と 大きさを 記録 → 止めたら まとめて 音に 分ける：
   ・高さは 前後 5こまの まん中の 値で ならす（ゆれ・とびを おさえる）
   ・同じ 半音が 3こま（約50ミリ秒）つづいたら 音の はじまり。別の 半音に 3こま 変われば 次の 音
   ・同じ 高さでも 音が 小さく なって また 大きく なれば 2つの 音（同じ 音の くり返し）
   ・80ミリ秒より 短い 音は 雑音と して 消す。1オクターブ だけ 一瞬 とんだ ときは もとの 音に まとめる
   ・テンポで ¼拍に そろえ、半拍 以上 あいたら 休みを 入れる。高さは 真ん中の ド あたりに そろえる（入り切り）
   マイクの 音は この 端末の 中だけで 使い、どこにも 送らない。 */
const LIS_MAX=180;   // 3分まで
let lis={on:false, stream:null, src:null, an:null, buf:null, raf:0, frames:[], t0:0, live:[], lastLive:0};
function median(a){ const b=a.slice().sort((x,y)=>x-y); return b.length ? b[b.length>>1] : null; }
/* frames：[{t:秒, f:Hz|null, v:大きさ}] → 音の 列 [{m, on, off}]（秒） */
function segNotes(frames){
  const n=frames.length; if(!n) return [];
  const raw=frames.map(x=>x.f ? 12*Math.log2(x.f/440)+69 : null);
  const sm=raw.map((m,i)=>{ if(m==null) return null; const w=[]; for(let k=i-2;k<=i+2;k++) if(k>=0 && k<n && raw[k]!=null) w.push(raw[k]); return w.length>=3 ? median(w) : m; });
  const notes=[]; let cur=null, cand=null, candN=0, quiet=0, peak=0, dip=false;
  const close=(i)=>{ if(cur){ cur.off=frames[Math.max(0,i-1)].t; notes.push(cur); } cur=null; };
  for(let i=0;i<n;i++){
    const m=sm[i], v=frames[i].v||0, s=m==null ? null : Math.round(m);
    if(s==null){ quiet++; if(cur && quiet>=3) close(i-quiet+1); cand=null; candN=0; continue; }
    quiet=0;
    if(cur && s===cur.m){
      cand=null; candN=0;
      // 同じ 音の くり返し：いったん 小さく なって（山の 4割 以下）また 大きく
      if(v<peak*0.4) dip=true; else if(dip && v>peak*0.75){ close(i); cur={m:s, on:frames[i].t, ms:[m]}; peak=v; dip=false; continue; }
      peak=Math.max(peak, v); cur.ms.push(m); continue;
    }
    if(s===cand) candN++; else { cand=s; candN=1; }
    if(candN>=3){ close(i-2); cur={m:s, on:frames[i-2].t, ms:[m]}; peak=v; dip=false; cand=null; candN=0; }
  }
  close(n);
  // 短すぎる 音は 消す・1オクターブの 一瞬の とびは まとめる
  let out=notes.filter(x=>x.off-x.on>=0.08).map(x=>({m:Math.round(median(x.ms)), on:x.on, off:x.off}));
  for(let i=1;i<out.length;i++){ const a=out[i-1], b=out[i]; if(Math.abs(b.m-a.m)===12 && b.off-b.on<0.15 && b.on-a.off<0.06){ a.off=b.off; out.splice(i,1); i--; } }
  return out;
}
/* 音の 列 → 曲の 音（{m, len}。休みは m:null）。拍は bpm、¼拍に そろえる。center＝高さを 真ん中に そろえる */
function quantize(ns, bpm, center){
  if(!ns.length) return [];
  const spb=60/bpm, t0=ns[0].on, q=x=>Math.round((x-t0)/spb*4)/4;
  let sh=0;
  if(center){ const md=median(ns.map(x=>x.m)); sh=Math.round((66-md)/12)*12; }   // 真ん中は ファ♯4 あたり
  const out=[]; let cursor=0;
  ns.forEach((x,i)=>{
    const s=Math.max(cursor, q(x.on)), nx=ns[i+1];
    if(s>cursor && out.length) out[out.length-1].len+=s-cursor;   // 少しの ずれは 前の 音に たす
    let len, rest=0;
    if(nx){ const tot=Math.max(0.25, Math.max(s+0.25, q(nx.on))-s), gap=(nx.on-x.off)/spb;
      rest=gap>=0.5 ? Math.round(gap*2)/2 : 0; if(rest>tot-0.25) rest=Math.max(0, tot-0.25); len=tot-rest; }   // 半拍 以上 あいたら 休み（½拍に そろえる）
    else len=Math.max(0.25, Math.round((x.off-x.on)/spb*2)/2);   // さいごの 音は ½拍に
    out.push({m:clamp(x.m+sh, 36, 96), len:clamp(len, 0.25, 16)});
    if(rest>0) out.push({m:null, len:clamp(rest, 0.25, 16)});
    cursor=s+len+rest;
  });
  return out.slice(0, MAXNOTES);
}
async function lisStart(){
  if(lis.on) return;
  if(!ac()){ toastS('この ブラウザーでは 音を 扱えません'); return; }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toastS('この 画面では マイクを 使えません（https の ページで 開いて ください）', 4200); return; }
  edStop(); if(ed.rec){ ed.rec=false; ed.recs=[]; }
  try{ lis.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}}); }
  catch(e){ toastS('マイクを 使えませんでした。ブラウザーの マイクの 許可を ご確認ください', 4600); return; }
  lis.src=AC.createMediaStreamSource(lis.stream); lis.an=AC.createAnalyser(); lis.an.fftSize=2048;
  lis.buf=new Float32Array(lis.an.fftSize); lis.src.connect(lis.an);
  lis.on=true; lis.frames=[]; lis.live=[]; lis.t0=AC.currentTime; lis.lastLive=0;
  render(); lisLoop();
}
function lisLoop(){
  if(!lis.on || !lis.an) return;
  lis.an.getFloatTimeDomainData(lis.buf);
  let r=0; for(let i=0;i<lis.buf.length;i++) r+=lis.buf[i]*lis.buf[i]; r=Math.sqrt(r/lis.buf.length);
  const f=detect(lis.buf, AC.sampleRate), t=AC.currentTime-lis.t0;
  lis.frames.push({t, f:(f && f>60 && f<2100) ? f : null, v:r});
  if(t-lis.lastLive>0.25){ lis.lastLive=t; lis.live=segNotes(lis.frames); lisShow(f); }
  else lisNow(f);
  if(t>=LIS_MAX){ lisStop(true); toastS('3分に なったので 止めました'); return; }
  lis.raf=requestAnimationFrame(lisLoop);
}
function lisNow(f){
  const b=$('okLisNow'); if(!b) return;
  if(!f){ b.textContent='…'; b.style.color=''; return; }
  const m=Math.round(12*Math.log2(f/440)+69); b.textContent=midiJa(m); b.style.color=PC_COL[pcOf(m)];
}
function lisShow(f){
  lisNow(f);
  const s=$('okLisRoll'); if(s) s.innerHTML=lis.live.slice(-24).map(x=>'<span style="--c:'+PC_COL[pcOf(x.m)]+'">'+esc(midiJa(x.m))+'</span>').join('') || '<em>音を 鳴らして ください</em>';
  const c=$('okLisT'); if(c){ const t=lis.frames.length ? lis.frames[lis.frames.length-1].t : 0; c.textContent=Math.floor(t)+'秒・'+lis.live.length+'音'; }
}
function lisRelease(){ cancelAnimationFrame(lis.raf); try{ if(lis.src) lis.src.disconnect(); }catch(_){} if(lis.stream) lis.stream.getTracks().forEach(t=>t.stop()); lis.stream=null; lis.src=null; lis.an=null; }
/* keep＝曲に 入れる（false は すてる） */
function lisStop(keep){
  if(!lis.on) return;
  lis.on=false; lisRelease();
  if(keep) lisApply(lis.frames);
  lis.frames=[]; lis.live=[]; render();
}
function lisApply(frames){
  const add=quantize(segNotes(frames), ed.bpm, st.lisCenter!==false);
  if(!add.some(n=>n.m!=null)){ toastS('音を 聞き取れませんでした。マイクの 近くで、1つずつ はっきり 鳴らして ください', 4200); return 0; }
  const room=MAXNOTES-ed.notes.length, at=ed.sel>=0 ? ed.sel+1 : ed.notes.length, list=add.slice(0, room);
  ed.notes.splice(at, 0, ...list); ed.sel=at+list.length-1; ed.dirty=true;
  toastS('🎤 '+list.filter(n=>n.m!=null).length+'音を 聞き取って 入れました（テンポ '+ed.bpm+' で 長さを そろえました）。ちがう 音は 押して なおせます', 4200);
  return list.length;
}
function htmlLis(){
  if(!lis.on) return '';
  return '<div class="ok-lis"><div class="ok-lis-top"><span class="ok-lis-dot"></span><b>聞き取り中</b><small id="okLisT">0秒・0音</small></div>'
    +'<div class="ok-lis-now" id="okLisNow">…</div>'
    +'<div class="ok-lis-roll" id="okLisRoll"><em>音を 鳴らして ください</em></div>'
    +'<div class="om-row"><button type="button" class="om-go" onclick="OTO.lisStop(true)">■ 止めて 曲に 入れる</button><button type="button" class="om-tap" onclick="OTO.lisStop(false)">✕ やめる</button></div>'
    +'<p class="oo-note">鼻歌・口笛・ピアノなど、1つの メロディーだけが いちばん よく 聞き取れます（歌と 伴奏が まざった 曲は むずかしい）。同じ スマホで 流す 音は 取れないので、別の 機械から 流して ください。</p></div>';
}

function edPlay(from){
  edStop(); if(!ed.notes.length || !ac()) return;
  const spb=60/ed.bpm; let t=0;
  const start=(from!=null && from>=0) ? from : 0;
  for(let i=start;i<ed.notes.length;i++){
    const n=ed.notes[i], at=t;
    ed.timers.push(setTimeout(()=>{ if(n.m!=null) playNote(n.m, 0, n.len*spb*0.95); ed.playIdx=i; markPlay(); }, at*1000));
    t+=n.len*spb;
  }
  ed.timers.push(setTimeout(()=>{ ed.playIdx=-1; markPlay(); renderPlayBtn(false); }, t*1000+100));
  renderPlayBtn(true);
}
function edStop(){ if(!ed) return; ed.timers.forEach(clearTimeout); ed.timers=[]; ed.playIdx=-1; markPlay(); renderPlayBtn(false); }
function markPlay(){ document.querySelectorAll('#okRoll .ok-n').forEach(b=>b.classList.toggle('pl', +b.dataset.i===ed.playIdx)); const b=document.querySelector('#okRoll .ok-n.pl'); if(b) try{ b.scrollIntoView({block:'nearest', inline:'nearest'}); }catch(_){} }
function renderPlayBtn(on){ const b=$('okPlay'); if(b){ b.textContent=on ? '■ とめる' : '▶ 聞く'; b.classList.toggle('on', on); } }
function edSave(silent){
  if(!ed.notes.some(n=>n.m!=null)){ toastS('音を 1つ 以上 入れて ください'); return false; }
  const t=(ed.t||'').trim() || ('自分の曲 '+(st.my.length+1));
  const rec=cleanMy({id:ed.id || ('u'+Date.now().toString(36)), t, bpm:ed.bpm, n:notesToN(ed.notes)});
  if(!rec){ toastS('保存できませんでした'); return false; }
  const i=st.my.findIndex(x=>x.id===rec.id);
  if(i<0 && st.my.length>=MAXMY){ toastS('自分の 曲は '+MAXMY+'曲までです。いらない 曲を 消して ください'); return false; }
  if(i>=0) st.my[i]=rec; else st.my.unshift(rec);
  ed.id=rec.id; ed.t=t; ed.dirty=false; save();
  if(!silent){ toastS('「'+t+'」を 保存しました（音ゲーの「🎼 自分の曲」で あそべます）', 3200); render(); }
  return true;
}
async function edNew(){
  if(ed && ed.dirty && ed.notes.length && typeof appConfirm==='function' && !await appConfirm('保存して いない 音が あります。新しく 作りますか？', '新しく', 'やめる')) return;
  edStop(); ed=newEd(); render();
}
function edLoad(id){
  const x=st.my.find(y=>y.id===id); if(!x) return;
  edStop(); ed=newEd(); Object.assign(ed, {id:x.id, t:x.t, bpm:x.bpm, notes:nToNotes(x.n)});
  gameStop(); game=null; tab='make'; render();
}
async function edDelSong(id){
  const x=st.my.find(y=>y.id===id); if(!x) return;
  if(typeof appConfirm==='function' && !await appConfirm('「'+x.t+'」を 消しますか？（元に 戻せません）', '消す', 'やめる')) return;
  st.my=st.my.filter(y=>y.id!==id);
  Object.keys(st.best).forEach(k=>{ if(k.startsWith(id+':')) delete st.best[k]; });
  if(st.song===id) st.song=SONGS[0].id;
  if(ed && ed.id===id){ ed.id=null; ed.dirty=true; }
  save(); render(); toastS('「'+x.t+'」を 消しました');
}
function edGame(){
  if(!edSave(true)) return;
  edStop(); st.song=ed.id; save(); tab='game'; game=null; render(); gameStart();
}
function edImport(){
  const ta=$('okText'); if(!ta) return;
  let txt=ta.value.trim(); if(!txt){ toastS('文字を 入れて ください'); return; }
  const h=/^🎵([^｜|]*)[｜|]\s*(\d+)\s*[｜|]([\s\S]*)$/.exec(txt);
  if(h){ ed.t=h[1].trim().slice(0,30); ed.bpm=clamp(+h[2]||100,30,240); txt=h[3]; }
  const ns=parseText(txt);
  if(!ns.some(n=>n.m!=null)){ toastS('音が 見つかりませんでした（例：ド レ ミー ソ↑）', 3200); return; }
  ed.notes=ns; ed.sel=-1; ed.dirty=true; render(); toastS(ns.length+'音を 入れました');
}
function edCopy(){
  const txt=shareText();
  const done=()=>toastS('曲を 文字で コピーしました（メール・LINE に 貼れます。受け取った 人は「文字で 入れる」に 貼ると 同じ 曲に なります）', 3600);
  try{ if(typeof toolCopyText==='function'){ toolCopyText(txt, '曲を 文字で コピーしました'); return; } navigator.clipboard.writeText(txt).then(done, ()=>{ const ta=$('okText'); if(ta){ ta.value=txt; ta.select(); } }); }catch(_){ const ta=$('okText'); if(ta){ ta.value=txt; ta.select(); } }
}
function lenLabel(l){ return l===0.25 ? '¼' : l===0.5 ? '½' : l===0.75 ? '¾' : l===1.5 ? '1½' : String(l); }
function rollHtml(){
  if(!ed.notes.length) return '<div class="ok-empty">下の 鍵盤を 押すと ここに 音が 並びます</div>';
  return ed.notes.map((n,i)=>{ const o=n.m==null ? 0 : Math.floor(n.m/12)-5;
    return '<button type="button" class="ok-n'+(n.m==null?' rest':'')+(i===ed.sel?' on':'')+'" data-i="'+i+'" style="--c:'+(n.m==null?'#90a4ae':PC_COL[pcOf(n.m)])+';--w:'+Math.max(34, Math.min(120, 22+n.len*22))+'px" onclick="OTO.esel('+i+')">'+(n.m==null ? '休' : esc(PC_JA[pcOf(n.m)])+(o>0?'<sup>'+'↑'.repeat(o)+'</sup>':o<0?'<sub>'+'↓'.repeat(-o)+'</sub>':''))+'<small>'+lenLabel(n.len)+'</small></button>'; }).join('');
}
function renderRoll(){
  const r=$('okRoll'); if(r){ r.innerHTML=rollHtml(); const b=r.querySelector('.ok-n.on'); if(b) try{ b.scrollIntoView({block:'nearest', inline:'nearest'}); }catch(_){} }
  const c=$('okCnt'); if(c){ const beats=ed.notes.reduce((a,n)=>a+n.len,0); c.textContent=ed.notes.length+'音・'+beats+'拍・約'+Math.round(beats*60/ed.bpm)+'秒'; }
  const tx=$('okText'); if(tx && document.activeElement!==tx) tx.value=ed.notes.length ? toText(ed.notes) : '';
}
function pianoHtml(){
  const base=(ed.oct+1)*12, W=[0,2,4,5,7,9,11,12], B=[[1,0],[3,1],[6,3],[8,4],[10,5]];
  const wk=W.map(d=>{ const m=base+d; return '<button type="button" class="ok-key w" data-m="'+m+'" style="--c:'+PC_COL[pcOf(m)]+'" onpointerdown="OTO.ek('+m+',event)"><span>'+midiJa(m)+'</span></button>'; }).join('');
  const bk=B.map(([d,i])=>{ const m=base+d; return '<button type="button" class="ok-key b" data-m="'+m+'" style="left:calc('+(i+1)*12.5+'% - 4.5%)" onpointerdown="OTO.ek('+m+',event)"></button>'; }).join('');
  return '<div class="ok-piano">'+wk+bk+'</div>';
}
function htmlMake(){
  if(!ed) ed=newEd();
  const mine=st.my.length ? st.my.map(x=>'<div class="ok-my'+(ed.id===x.id?' on':'')+'"><b>'+esc(x.t)+'</b><small>'+nToNotes(x.n).length+'音・テンポ '+x.bpm+'</small><button type="button" onclick="OTO.edit(\''+x.id+'\')">✏ なおす</button><button type="button" onclick="OTO.play_my(\''+x.id+'\')">🎮</button><button type="button" class="del" onclick="OTO.edelSong(\''+x.id+'\')" aria-label="消す">🗑</button></div>').join('') : '<div class="og-none">まだ ありません</div>';
  return '<div class="ok">'
    +'<div class="ok-top"><input type="text" id="okTitle" maxlength="30" placeholder="曲名（例：わたしの うた）" value="'+esc(ed.t)+'" oninput="OTO.etitle(this.value)">'
    +'<div class="ok-bpm"><button type="button" onclick="OTO.ebpm(-5)" aria-label="おそく">−</button><span><b id="okBpm">'+ed.bpm+'</b><small>テンポ</small></span><button type="button" onclick="OTO.ebpm(5)" aria-label="はやく">＋</button></div></div>'
    +'<div class="ok-rollw"><div class="ok-roll" id="okRoll">'+rollHtml()+'</div><div class="ok-cnt" id="okCnt"></div></div>'
    +'<div class="ok-tools"><button type="button" onclick="OTO.edelNote()">⌫ 消す</button><button type="button" onclick="OTO.erest()">休み</button><button type="button" class="'+(ed.rec?'rec':'')+'" onclick="OTO.erec()">'+(ed.rec ? '⏺ 録音を 終える（<span id="okRecN">'+ed.recs.length+'音</span>）' : '🔴 弾いて 録音')+'</button><button type="button" class="'+(lis.on?'rec':'')+'" onclick="OTO.lis()">🎤 マイクで 聞き取る</button></div>'
    +htmlLis()
    +'<label class="oo-chk"><input type="checkbox" '+(st.lisCenter!==false?'checked':'')+' onchange="OTO.lisCenter()"> 🎤 聞き取った 高さを 真ん中の ド あたりに そろえる（低い 声・高い 口笛でも 弾きやすく）</label>'
    +'<div class="ok-lens">'+seg('長さ',ED_LENS,ed.len,'elen')+'<label class="oo-chk ok-dot"><input type="checkbox" '+(ed.dot?'checked':'')+' onchange="OTO.edot()"> 付点（1.5倍）</label></div>'
    +'<div class="ok-octs"><button type="button" onclick="OTO.eoct(-1)" '+(ed.oct<=2?'disabled':'')+'>◀ 低く</button><span>'+(ed.oct===4 ? 'まん中の ド から' : ed.oct>4 ? (ed.oct-4)+'つ 高い ド から' : (4-ed.oct)+'つ 低い ド から')+'</span><button type="button" onclick="OTO.eoct(1)" '+(ed.oct>=6?'disabled':'')+'>高く ▶</button></div>'
    +pianoHtml()
    +'<p class="oo-note">鍵盤を 押すと いまの 長さで 音が 入ります。並んだ 音を 押すと 選べて、その うしろに 入ります（もう一度 押すと いまの 長さに 変わります）。「🔴 弾いて 録音」は 弾いた 間の 長さを テンポに 合わせて 入れます。「🎤 マイクで 聞き取る」は 鼻歌や 楽器の メロディーを 聞いて 音に します（先に テンポを 合わせて おくと 長さが そろいやすい）。</p>'
    +'<div class="om-row"><button type="button" class="om-tap" id="okPlay" onclick="OTO.eplay()">▶ 聞く</button><button type="button" class="om-go" onclick="OTO.egame()">🎮 この曲で あそぶ</button></div>'
    +'<div class="om-row"><button type="button" class="om-tap" onclick="OTO.esave()">💾 保存</button><button type="button" class="om-tap" onclick="OTO.enew()">🆕 新しく</button><button type="button" class="om-tap" onclick="OTO.ecopy()">📋 文字で コピー</button></div>'
    +'<details class="ok-txt"'+(ed.notes.length?'':' open')+'><summary>✍ 文字で 入れる（ドレミで 書く・もらった 曲を 貼る）</summary>'
    +'<textarea id="okText" rows="4" placeholder="例：ド ド ソ ソ ラ ラ ソー ファ ファ ミ ミ レ レ ドー">'+esc(ed.notes.length ? toText(ed.notes) : '')+'</textarea>'
    +'<div class="oo-note">ド レ ミ ファ ソ ラ シ（ひらがなでも）。「ソー」で 2拍、「ド:0.5」で 半分、「ド↑」で 高い ド、「シ↓」で 低い シ、「ド#」で ♯、休みは「休」。</div>'
    +'<button type="button" class="om-tap ok-imp" onclick="OTO.eimport()">📥 この 文字で 入れる（いまの 音と 入れかえ）</button></details>'
    +'<h4>🎼 自分の曲（'+st.my.length+'／'+MAXMY+'）</h4><div class="ok-mys">'+mine+'</div>'
    +'</div>';
}
const KEYS=['s','d','f','g','h','j','k'];

const CSS=`
#otoOverlay .oo-modal{ display:flex; flex-direction:column; }
.oo-tabs{ display:flex; gap:4px; padding:8px 12px 0; border-bottom:1px solid var(--cell-border,#ddd); }
.oo-tabs button{ flex:1; padding:9px 4px; border:0; border-bottom:3px solid transparent; background:none; color:var(--text-light); font:inherit; font-size:14px; font-weight:800; cursor:pointer; }
.oo-tabs button.on{ color:var(--acc-text,var(--acc)); border-bottom-color:var(--acc); }
.oo-body{ flex:1; min-height:0; overflow:auto; padding:10px 14px 18px; }
.oo-body h4{ margin:14px 0 6px; font-size:13px; color:var(--text-light); }
.oo-seg{ display:flex; flex-wrap:wrap; gap:6px; }
.oo-seg button{ padding:8px 11px; border:1px solid var(--cell-border,#ccc); border-radius:20px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:14px; cursor:pointer; }
.oo-seg button.on{ background:var(--acc); border-color:var(--acc); color:#fff; font-weight:800; }
.oo-chk{ display:flex; align-items:center; gap:8px; margin:12px 0 4px; font-size:14px; }
.oo-chk input{ width:20px; height:20px; }
.oo-note{ margin:10px 0 0; font-size:12.5px; color:var(--text-light); line-height:1.6; }
.om{ display:flex; flex-direction:column; align-items:stretch; }
.om-pulse{ align-self:center; width:120px; height:120px; border-radius:50%; display:grid; place-items:center; background:var(--acc-weak,#e4f2ea); margin:6px 0 10px; }
.om-pulse b{ font-size:46px; font-weight:900; color:var(--acc-text,var(--acc)); font-variant-numeric:tabular-nums; }
.om-pulse.hit{ animation:omP .25s ease-out; } .om-pulse.hit.acc{ animation:omPA .3s ease-out; }
@keyframes omP{ from{ transform:scale(1.12); background:var(--acc); } }
@keyframes omPA{ from{ transform:scale(1.2); background:#ff7a2f; } }
.om-dots{ display:flex; justify-content:center; gap:10px; margin-bottom:12px; }
.om-dot{ width:16px; height:16px; border-radius:50%; background:var(--cell-border,#ccc); transition:background .08s; }
.om-dot.acc{ box-shadow:0 0 0 2px #ff7a2f inset; } .om-dot.on{ background:var(--acc); } .om-dot.acc.on{ background:#ff7a2f; }
.om-bpm{ display:flex; align-items:center; justify-content:center; gap:14px; }
.om-bpm > div{ display:flex; flex-direction:column; align-items:center; min-width:150px; }
.om-bpm b{ font-size:48px; font-weight:900; line-height:1; font-variant-numeric:tabular-nums; }
.om-bpm small{ font-size:12px; color:var(--text-light); } .om-bpm span{ font-size:13px; font-weight:700; color:var(--acc-text,var(--acc)); min-height:1.3em; }
.om-bpm button{ width:52px; height:52px; border-radius:50%; border:1px solid var(--cell-border,#ccc); background:var(--modal-bg,#fff); color:var(--text); font-size:26px; font-weight:800; cursor:pointer; touch-action:manipulation; }
#omBpmR{ width:100%; margin:12px 0 6px; accent-color:var(--acc); }
.om-row{ display:flex; gap:8px; margin-top:8px; }
.om-go{ flex:2; min-height:52px; border:0; border-radius:14px; background:var(--acc); color:#fff; font:inherit; font-size:18px; font-weight:900; cursor:pointer; touch-action:manipulation; }
.om-go.on{ background:#c0392b; }
.om-tap{ flex:1; min-height:52px; border:1px solid var(--cell-border,#ccc); border-radius:14px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:14px; font-weight:800; cursor:pointer; touch-action:manipulation; }
.om-tap.hit{ animation:omP .2s ease-out; }
.om-pre{ display:flex; gap:6px; margin-top:12px; } .om-pre button{ flex:1; padding:8px 0; border:1px solid var(--cell-border,#ccc); border-radius:10px; background:none; color:var(--text); font:inherit; font-weight:700; cursor:pointer; }
.ot{ display:flex; flex-direction:column; }
.ot-meter{ position:relative; height:110px; margin:4px auto 0; width:min(320px,100%); overflow:hidden; }
.ot-scale{ position:absolute; left:0; right:0; bottom:0; display:flex; justify-content:space-between; font-size:11px; color:var(--text-light); padding:0 4px; }
.ot-meter::before{ content:''; position:absolute; left:50%; bottom:14px; width:220px; height:220px; transform:translateX(-50%); border-radius:50%; border:3px solid var(--cell-border,#ccc); border-bottom-color:transparent; border-left-color:transparent; border-right-color:transparent; }
.ot-meter::after{ content:''; position:absolute; left:50%; top:4px; width:4px; height:14px; transform:translateX(-50%); background:#43a047; border-radius:2px; }
.ot-ndl{ position:absolute; left:50%; bottom:14px; width:4px; height:96px; background:#e53935; border-radius:2px; transform-origin:50% 100%; transform:translateX(-50%) rotate(0deg); transition:transform .08s linear; }
.ot-note{ align-self:center; display:flex; flex-direction:column; align-items:center; min-width:150px; padding:6px 18px; border-radius:16px; font-size:52px; font-weight:900; line-height:1.1; }
.ot-note small{ font-size:15px; font-weight:700; color:var(--text-light); }
.ot-note.ok{ background:rgba(67,160,71,.16); color:#2e7d32; } .ot-note.idle{ color:var(--text-light); opacity:.6; }
.ot-sub{ display:flex; justify-content:center; gap:16px; font-size:14px; font-variant-numeric:tabular-nums; color:var(--text-light); min-height:1.4em; }
.ot-hint{ text-align:center; font-weight:800; min-height:1.5em; margin:4px 0 10px; color:var(--acc-text,var(--acc)); }
.ot-strs{ display:grid; grid-template-columns:repeat(auto-fit,minmax(64px,1fr)); gap:6px; }
.ot-str{ display:flex; flex-direction:column; align-items:center; gap:1px; padding:8px 4px; border:1px solid var(--cell-border,#ccc); border-radius:12px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:17px; font-weight:800; cursor:pointer; }
.ot-str b{ font-size:11px; color:var(--text-light); } .ot-str small{ font-size:11px; color:var(--text-light); font-weight:600; }
.ot-str.on{ border-color:#43a047; box-shadow:0 0 0 2px #43a047 inset; } .ot-str.play{ background:var(--acc); color:#fff; } .ot-str.play small, .ot-str.play b{ color:#fff; }
.ot-a4{ display:flex; align-items:center; gap:10px; margin-top:14px; font-size:14px; } .ot-a4 b{ min-width:70px; text-align:center; font-variant-numeric:tabular-nums; }
.ot-a4 button{ width:40px; height:36px; border:1px solid var(--cell-border,#ccc); border-radius:10px; background:none; color:var(--text); font-size:18px; cursor:pointer; }
.og-songs{ display:flex; flex-direction:column; gap:6px; }
.og-songs button{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:9px 12px; border:1px solid var(--cell-border,#ccc); border-radius:12px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; text-align:left; cursor:pointer; }
.og-songs button b{ font-size:15px; } .og-songs button small{ font-size:11.5px; color:var(--text-light); }
.og-songs button.on{ border-color:var(--acc); box-shadow:0 0 0 2px var(--acc) inset; }
.og-res{ display:flex; align-items:center; gap:14px; padding:12px; border-radius:14px; background:var(--acc-weak,#e4f2ea); margin-bottom:6px; }
.og-res b{ display:block; font-size:22px; } .og-res em{ margin-left:8px; font-style:normal; font-weight:800; color:#d84315; } .og-res small{ display:block; font-size:12.5px; color:var(--text-light); margin-top:2px; }
.og-rank{ width:58px; height:58px; border-radius:50%; display:grid; place-items:center; font-size:32px; font-weight:900; color:#fff; background:#78909c; flex:none; }
.og-rank.rS{ background:linear-gradient(135deg,#ffb300,#e65100); } .og-rank.rA{ background:#43a047; } .og-rank.rB{ background:#1e88e5; } .og-rank.rC{ background:#8e24aa; }
.og-play{ position:relative; overflow:hidden; display:flex; flex-direction:column; height:100%; min-height:420px; margin:-10px -14px -18px; background:#14181c; color:#fff; }
.og-fxl{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:5; }
.og-fin{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:30; }
.og-hud em.fev{ color:#ffb000; text-shadow:0 0 8px #ff4500; }
.og-hud{ display:flex; align-items:center; gap:10px; padding:8px 12px; font-size:13px; }
.og-hud span{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.8; }
.og-hud b{ font-size:22px; font-variant-numeric:tabular-nums; } .og-hud em{ font-style:normal; color:#ffe082; font-weight:800; min-width:4.5em; }
.og-hud button{ padding:6px 12px; border:1px solid rgba(255,255,255,.3); border-radius:16px; background:none; color:#fff; font:inherit; cursor:pointer; }
.og-cv{ flex:1; min-height:0; width:100%; display:block; }
.og-keys{ display:grid; grid-template-columns:repeat(var(--n),1fr); gap:4px; padding:6px 4px 8px; }
.og-key{ min-height:76px; border:0; border-radius:12px; background:color-mix(in srgb, var(--c) 55%, #14181c); color:#fff; font:inherit; font-size:18px; font-weight:900; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; cursor:pointer; touch-action:none; user-select:none; -webkit-user-select:none; }
.og-key small{ font-size:10px; opacity:.55; }
.og-key.hit{ animation:ogK .18s ease-out; } .og-key.hit.p{ animation:ogKP .3s ease-out; }
@keyframes ogK{ from{ background:var(--c); transform:scale(.94); box-shadow:0 0 14px var(--c); } } @keyframes ogKP{ 0%{ background:#fff; color:var(--c); transform:scale(.88); box-shadow:0 0 0 3px #fff, 0 0 30px 6px var(--c); } 60%{ transform:scale(1.05); } }
.og-glow{ position:relative; flex:1; min-height:0; display:flex; align-items:center; justify-content:center; padding:12px; }
.og-fx{ position:absolute; left:0; right:0; top:0; height:60px; width:100%; pointer-events:none; }
.og-cnt{ position:absolute; top:30%; left:0; right:0; text-align:center; font-size:48px; font-weight:900; pointer-events:none; z-index:2; }
.og-pads{ display:grid; gap:12px; width:100%; max-width:440px; grid-template-columns:repeat(3,1fr); }
.og-pads.n1, .og-pads.n2{ grid-template-columns:repeat(2,1fr); } .og-pads.n4{ grid-template-columns:repeat(2,1fr); } .og-pads.n7, .og-pads.n8{ grid-template-columns:repeat(4,1fr); gap:9px; }
.og-pad{ --k:0; position:relative; aspect-ratio:1; border:0; border-radius:22px; background:#262c33; color:rgba(255,255,255,.55); font:inherit; font-size:22px; font-weight:900; cursor:pointer; touch-action:none; user-select:none; -webkit-user-select:none; overflow:hidden; }
.og-pad::before{ content:''; position:absolute; inset:calc((1 - var(--k)) * 40%); border-radius:50%; border:4px solid var(--c); opacity:calc(var(--k) * 1.2); transition:none; }
.og-pad.lit{ background:color-mix(in srgb, var(--c) calc(var(--k) * 70%), #262c33); color:#fff; }
.og-pad.now{ box-shadow:0 0 0 4px #fff inset, 0 0 22px var(--c); }
.og-pad span{ position:relative; z-index:1; }
.og-pad.hit{ animation:ogKP .3s ease-out; }
body.dark .om-pulse{ background:rgba(67,160,71,.18); }
/* v673：曲の まとまり・結果・曲を つくる */
.oo-tabs button{ font-size:13px; padding:9px 2px; white-space:nowrap; }
@media (max-width:400px){ .oo-tabs{ padding:6px 6px 0; gap:2px; } .oo-tabs button{ font-size:12px; letter-spacing:-.02em; } }
.og-sl{ flex:1; min-height:0; width:100%; display:block; touch-action:none; user-select:none; -webkit-user-select:none; cursor:crosshair; }
.og-res em.df{ color:#f9a825; }
.og-gname{ margin:8px 0 2px; font-size:12.5px; font-weight:800; color:var(--text-light); }
.og-none{ padding:8px 10px; border-radius:10px; background:var(--cell-hover,#f3f3f3); font-size:12.5px; color:var(--text-light); }
.og-res em.fc{ color:#e65100; } .og-res em.pr{ color:#1e88e5; }
.og-res small.og-tip{ margin-top:6px; color:var(--text); font-weight:700; }
.ok{ display:flex; flex-direction:column; gap:8px; }
.ok-top{ display:flex; gap:8px; align-items:center; }
.ok-top input{ flex:1; min-width:0; min-height:42px; padding:6px 10px; border:1px solid var(--cell-border,#ccc); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:15px; }
.ok-bpm{ display:flex; align-items:center; gap:4px; }
.ok-bpm span{ display:flex; flex-direction:column; align-items:center; min-width:46px; line-height:1.1; } .ok-bpm b{ font-size:18px; font-variant-numeric:tabular-nums; } .ok-bpm small{ font-size:10.5px; color:var(--text-light); }
.ok-bpm button{ width:36px; height:36px; border-radius:50%; border:1px solid var(--cell-border,#ccc); background:var(--modal-bg,#fff); color:var(--text); font-size:18px; font-weight:800; cursor:pointer; }
.ok-rollw{ border:1px solid var(--cell-border,#ccc); border-radius:12px; background:var(--cell-hover,#f6f7f8); padding:6px; }
.ok-roll{ display:flex; flex-wrap:wrap; gap:4px; max-height:150px; overflow:auto; min-height:46px; align-content:flex-start; }
.ok-n{ position:relative; width:var(--w); min-height:40px; padding:2px 4px; border:0; border-radius:8px; background:var(--c); color:#fff; font:inherit; font-size:14px; font-weight:900; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.05; cursor:pointer; text-shadow:0 1px 1px rgba(0,0,0,.25); }
.ok-n small{ font-size:10px; font-weight:700; opacity:.9; } .ok-n sup, .ok-n sub{ font-size:9px; }
.ok-n.rest{ background:repeating-linear-gradient(135deg,#b0bec5 0 6px,#cfd8dc 6px 12px); color:#37474f; text-shadow:none; }
.ok-n.on{ outline:3px solid var(--text); outline-offset:1px; } .ok-n.pl{ transform:translateY(-3px); box-shadow:0 0 0 3px #ffd54f; }
.ok-empty{ font-size:12.5px; color:var(--text-light); padding:10px 4px; }
.ok-cnt{ font-size:11.5px; color:var(--text-light); text-align:right; margin-top:4px; font-variant-numeric:tabular-nums; }
.ok-tools{ display:flex; flex-wrap:wrap; gap:6px; } .ok-tools button{ flex:1; min-height:40px; border:1px solid var(--cell-border,#ccc); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:13.5px; font-weight:800; cursor:pointer; }
.ok-tools button.rec{ background:#c62828; border-color:#c62828; color:#fff; flex:2; }
.ok-lens{ display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; } .ok-lens .oo-seg button{ padding:6px 10px; } .ok-dot{ margin:0; }
.ok-octs{ display:flex; align-items:center; justify-content:space-between; gap:6px; font-size:12.5px; color:var(--text-light); }
.ok-octs button{ padding:6px 10px; border:1px solid var(--cell-border,#ccc); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:13px; font-weight:700; cursor:pointer; } .ok-octs button:disabled{ opacity:.4; }
.ok-piano{ position:relative; display:flex; height:150px; user-select:none; -webkit-user-select:none; touch-action:none; }
.ok-key{ border:0; padding:0; cursor:pointer; touch-action:none; }
.ok-key.w{ flex:1; margin:0 1px; border-radius:0 0 10px 10px; background:#fff; border:1px solid #b0b7bd; display:flex; align-items:flex-end; justify-content:center; padding-bottom:8px; box-shadow:inset 0 -6px 0 var(--c); }
.ok-key.w span{ font-size:14px; font-weight:900; color:#333; }
.ok-key.b{ position:absolute; top:0; width:9%; height:58%; border-radius:0 0 7px 7px; background:#263238; z-index:2; }
.ok-key.hit.w{ background:color-mix(in srgb, var(--c) 35%, #fff); } .ok-key.hit.b{ background:#607d8b; }
.ok-txt{ border:1px solid var(--cell-border,#ccc); border-radius:12px; padding:8px 10px; } .ok-txt summary{ font-weight:800; font-size:14px; cursor:pointer; }
.ok-txt textarea{ width:100%; box-sizing:border-box; margin-top:8px; padding:8px; border:1px solid var(--cell-border,#ccc); border-radius:8px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:15px; }
.ok-imp{ width:100%; margin-top:6px; min-height:44px; }
.ok-lis{ margin-top:8px; padding:10px 12px; border-radius:14px; background:#14181c; color:#fff; }
.ok-lis-top{ display:flex; align-items:center; gap:8px; } .ok-lis-top small{ margin-left:auto; opacity:.75; font-variant-numeric:tabular-nums; }
.ok-lis-dot{ width:12px; height:12px; border-radius:50%; background:#e53935; animation:okLD 1s infinite; } @keyframes okLD{ 50%{ opacity:.25; } }
.ok-lis-now{ text-align:center; font-size:46px; font-weight:900; line-height:1.2; min-height:1.2em; }
.ok-lis-roll{ display:flex; flex-wrap:wrap; gap:4px; min-height:30px; } .ok-lis-roll span{ padding:3px 8px; border-radius:8px; background:color-mix(in srgb, var(--c) 70%, #14181c); font-weight:800; font-size:14px; } .ok-lis-roll em{ opacity:.6; font-style:normal; font-size:13px; }
.ok-lis .oo-note{ color:rgba(255,255,255,.7); }
.ok-mys{ display:flex; flex-direction:column; gap:6px; }
.ok-my{ display:grid; grid-template-columns:1fr auto auto auto; grid-template-rows:auto auto; align-items:center; gap:0 6px; padding:8px 10px; border:1px solid var(--cell-border,#ccc); border-radius:12px; }
.ok-my.on{ border-color:var(--acc); box-shadow:0 0 0 2px var(--acc) inset; }
.ok-my b{ grid-column:1; font-size:14.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .ok-my small{ grid-column:1; grid-row:2; font-size:11.5px; color:var(--text-light); }
.ok-my button{ grid-row:1 / span 2; min-height:38px; padding:4px 10px; border:1px solid var(--cell-border,#ccc); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.ok-my button.del{ color:#c62828; }
body.dark .ok-key.w{ background:#e9edf0; }
`;
function ensureDom(){
  if($('otoOverlay')) return;
  const s=document.createElement('style'); s.id='otoStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="otoOverlay">
  <div class="modal vol-modal oo-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🎵 音の道具</span><button class="modal-close" onclick="closeOto()" aria-label="閉じる">✕</button></div>
    <div class="oo-tabs" role="tablist"><button type="button" role="tab" data-t="met" onclick="OTO.tab('met')">🥁 メトロノーム</button><button type="button" role="tab" data-t="tun" onclick="OTO.tab('tun')">🎸 チューナー</button><button type="button" role="tab" data-t="game" onclick="OTO.tab('game')">🎮 音ゲー</button><button type="button" role="tab" data-t="make" onclick="OTO.tab('make')">🎼 曲をつくる</button></div>
    <div class="oo-body" id="otoBody"></div>
  </div></div>`;
  while(box.firstElementChild) document.body.appendChild(box.firstElementChild);
  const ov=$('otoOverlay');
  ov.addEventListener('keydown', e=>{ if(e.key!=='Escape' && e.key!=='Tab') e.stopPropagation(); });
  window.addEventListener('keydown', e=>{
    if(!isDlgOpen('otoOverlay') || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if(tab==='game' && game && game.playing){ const i=KEYS.indexOf(e.key.toLowerCase()); if(i>=0 && i<game.lanes.length){ e.preventDefault(); e.stopImmediatePropagation(); judge(i); } return; }
    if(tab==='met' && e.key===' ' && !(e.target && /INPUT|BUTTON/.test(e.target.tagName))){ e.preventDefault(); metToggle(); }
  }, true);
  if(typeof applyNpToolFull==='function') applyNpToolFull();
}
function cleanup(){ metStop(); tunStop(); refStop(); gameStop(); game=null; if(lis.on){ lis.on=false; lisRelease(); lis.frames=[]; } if(ed){ edStop(); if(ed.rec){ ed.rec=false; ed.recs=[]; } } }
function setTab(t){ if(t!=='met') metStop(); if(t!=='tun'){ tunStop(); refStop(); } if(t!=='game'){ gameStop(); game=null; } if(t!=='make' && lis.on){ lis.on=false; lisRelease(); lis.frames=[]; } if(t!=='make' && ed){ edStop(); if(ed.rec){ ed.rec=false; ed.recs=[]; } } tab=t; render(); }
function openOto(t){ ensureDom(); load(); if(t) tab=t; openDlg('otoOverlay', cleanup); render(); }
function closeOto(){ if(!$('otoOverlay') || !isDlgOpen('otoOverlay')) return; closeDlg('otoOverlay', cleanup); }

window.OTO={ tab:setTab, met:metToggle, tap:metTap, setBpm, bpm:d=>setBpm(st.met.bpm+d), beats:v=>setMet('beats',v), sub:v=>setMet('sub',v), snd:v=>setMet('snd',v), accent:()=>setMet('accent'),
  mic:()=>tun.on ? (tunStop(), render()) : tunStart(), tset:v=>setTun('set',v), a4:d=>setTun('a4',d), ref:refTone,
  mode:v=>{ st.mode=['fall','glow','slide'].includes(v) ? v : 'fall'; save(); game=null; render(); }, diff:v=>{ st.diff=clamp(Math.round(+v)||3,1,5); save(); game=null; render(); }, song:v=>{ st.song=v; save(); game=null; render(); }, inst:v=>{ st.inst=v; save(); render(); const s=parseSong(songOf()).notes; if(s[0]) playNote(s[0].midi, 0, 0.5); },
  speed:v=>{ st.speed=v; save(); game=null; render(); }, helper:()=>{ st.helper=!st.helper; save(); }, start:gameStart, listen, quit:()=>{ gameStop(); game=null; render(); },
  hit:(i,e)=>{ if(e){ e.preventDefault(); } judge(i); },
  wait:()=>{ st.wait=!st.wait; save(); }, fx:v=>{ st.fx=FXL.some(x=>x.id===v) ? v : 'ultra'; save(); render(); }, beat:()=>{ st.beat=!st.beat; save(); },
  back:()=>({on:!!bk.bus, n:bk.ev.length, i:bk.i, kinds:[...new Set(bk.ev.map(e=>e.k))].sort().join(',')}), backOf:id=>{ const s=allSongs().find(x=>x.id===id); if(!s) return null; const p=parseSong(s), ev=backEvents(s, p.beats); return {n:ev.length, kinds:[...new Set(ev.map(e=>e.k))].sort().join(',')}; },
  theme:id=>{ const x=SONGS.find(y=>y.id===id); return x ? (x.theme||x.n) : ''; },
  pd:()=>SONGS.map(s=>({id:s.id, sec:Math.round(parseSong(s).beats*60/s.bpm), vars:(s.vars||[]).join('+'), ch:(s.secs&&s.secs[0] ? s.secs[0].ch.join(' ') : '')})),
  fxOn:()=>!!(game && game.fe), fever:()=>!!(game && game.fever), orig:()=>ORIG.map(s=>({id:s.id, t:s.t, sec:Math.round(parseSong(s).beats*60/s.bpm), secs:s.secs.length, shapes:[...new Set(s.secs.map(x=>x.sh))].join(',')})), insts:()=>INST.map(x=>x.id),
  hitTest:(i)=>{ if(!game || !game.playing) return null; const n=game.notes.find(x=>!x.res && x.lane===i); if(!n) return null; game.t0=AC.currentTime-n.t; judge(i); return n.res; }, lanes:v=>{ st.lanes=v==='four' ? 'four' : 'note'; save(); game=null; render(); },
  // 🎼 曲を つくる（v673）
  ek:edKey, erest:edRest, edelNote:edDel, esel:edSel, erec:edRec, eplay:()=>{ if(ed.timers.length) edStop(); else edPlay(ed.sel>=0 ? ed.sel : 0); }, esave:()=>edSave(false), enew:edNew, egame:edGame,
  lis:()=>lis.on ? lisStop(true) : lisStart(), lisStop, lisCenter:()=>{ st.lisCenter=st.lisCenter===false; save(); }, lisOn:()=>lis.on, lisFrames:()=>lis.frames.length, segNotes, quantize, lisApply:fr=>lisApply(fr),
  eimport:edImport, ecopy:edCopy, edit:edLoad, edelSong:edDelSong, play_my:id=>{ st.song=id; save(); tab='game'; game=null; render(); gameStart(); },
  elen:v=>{ ed.len=+v; render(); }, edot:()=>{ ed.dot=!ed.dot; }, eoct:d=>{ ed.oct=clamp(ed.oct+d,2,6); render(); }, ebpm:d=>{ ed.bpm=clamp(ed.bpm+d,30,240); ed.dirty=true; const b=$('okBpm'); if(b) b.textContent=ed.bpm; renderRoll(); },
  etitle:v=>{ ed.t=String(v).slice(0,30); ed.dirty=true; },
  parseText, toText, ed:()=>ed ? JSON.parse(JSON.stringify({id:ed.id, t:ed.t, bpm:ed.bpm, notes:ed.notes, sel:ed.sel, rec:ed.rec})) : null, shareText:()=>shareText(),
  // ためす とき 用
  songs:()=>allSongs().map(s=>{ const p=parseSong(s); return {id:s.id, t:s.t, n:p.notes.length, lanes:buildLanes(p.notes,'note').lanes.length, pcs:lanesOf(p.notes).length, beats:p.beats, my:!!s.my}; }),
  state:()=>JSON.parse(JSON.stringify(st)), detect, noteToMidi, midiName, midiJa, parseSong, lanesOf,
  game:()=>game ? {playing:game.playing, over:game.over, score:game.score, cnt:Object.assign({},game.cnt), lanes:game.lanes.map(l=>l.pc), names:game.lanes.map(l=>l.name), rank:game.rank, n:game.notes.length, early:game.early, late:game.late, wait:game.wait, waiting:game.waiting, fc:game.fc, rate:game.rate, newBest:game.newBest} : null,
  autoplay:()=>{ if(!game) return; for(const n of game.notes){ n.res='perfect'; game.cnt.perfect++; game.combo++; game.max=Math.max(game.max,game.combo); game.score+=100+Math.min(game.combo,50)*2; } game.end=-1; },
  time:()=>game && AC ? AC.currentTime-game.t0 : null,
  slide:()=>game && game.notes[0] && game.notes[0].x!=null ? {pts:game.notes.map(n=>[+n.x.toFixed(3), +n.y.toFixed(3)]), lead:game.lead} : null,
  ptr:(x,y,on)=>{ if(game && game.ptr){ const G=slideGeo(); game.ptr.x=x*(G?G.W:1); game.ptr.y=y*(G?G.H:1); game.ptr.on=on!==false; game.ptr.trail.push({x:game.ptr.x, y:game.ptr.y, t:performance.now()}); } },
  arranged:id=>{ const s=allSongs().find(x=>x.id===id); if(!s) return null; const p=arrange(s, parseSong(s)); return {reps:p.reps, sec:Math.round(p.beats*60/s.bpm), n:p.notes.length}; },
  diffNotes:(id,d)=>{ const s=allSongs().find(x=>x.id===id); return s ? applyDiff(arrange(s, parseSong(s)), d).notes.length : 0; }, met_on:()=>met.on, tun_on:()=>tun.on, showPitch };
Object.assign(window, { openOto, closeOto });
})();
