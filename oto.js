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
  {id:'kira', t:'きらきら星', by:'フランスの 古い 歌', bpm:100, lv:1,
   n:'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2'},
  {id:'mary', t:'メリーさんのひつじ', by:'アメリカの 古い 歌', bpm:110, lv:1,
   n:'E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:2 E4:1 G4:1 G4:2 E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:1 E4:1 D4:1 D4:1 E4:1 D4:1 C4:4'},
  {id:'kaeru', t:'かえるの合唱', by:'ドイツの 古い 歌', bpm:110, lv:1,
   n:'C4:1 D4:1 E4:1 F4:1 E4:1 D4:1 C4:2 E4:1 F4:1 G4:1 A4:1 G4:1 F4:1 E4:2 C4:2 C4:2 C4:2 C4:2 C4:0.5 C4:0.5 D4:0.5 D4:0.5 E4:0.5 E4:0.5 F4:0.5 F4:0.5 E4:1 D4:1 C4:2'},
  {id:'chou', t:'ちょうちょう', by:'ドイツの 古い 歌', bpm:120, lv:2,
   n:'G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 D4:1 E4:1 F4:1 G4:1 G4:1 G4:2 G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 E4:1 G4:1 G4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:1 D4:1 D4:1 E4:1 F4:2 E4:1 E4:1 E4:1 E4:1 E4:1 F4:1 G4:2 G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 E4:1 G4:1 G4:1 C4:4'},
  {id:'london', t:'ロンドン橋', by:'イギリスの 古い 歌', bpm:110, lv:2,
   n:'G4:1.5 A4:0.5 G4:1 F4:1 E4:1 F4:1 G4:2 D4:1 E4:1 F4:2 E4:1 F4:1 G4:2 G4:1.5 A4:0.5 G4:1 F4:1 E4:1 F4:1 G4:2 D4:2 G4:2 E4:1 C4:3'},
  {id:'joy', t:'よろこびの歌（第九）', by:'ベートーヴェン（1827年 没）', bpm:110, lv:2,
   n:'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2 D4:1 D4:1 E4:1 C4:1 D4:1 E4:0.5 F4:0.5 E4:1 C4:1 D4:1 E4:0.5 F4:0.5 E4:1 D4:1 C4:1 D4:1 G3:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2'},
  {id:'jingle', t:'ジングルベル', by:'ピアポント（1893年 没）', bpm:130, lv:2,
   n:'E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 F4:1 F4:1 F4:1.5 F4:0.5 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2 E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 F4:1 F4:1 F4:1 F4:1 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 G4:1 G4:1 F4:1 D4:1 C4:4'},
  {id:'saints', t:'聖者の行進', by:'アメリカの 古い 歌', bpm:120, lv:2,
   n:'C4:1 E4:1 F4:1 G4:4 R:1 C4:1 E4:1 F4:1 G4:4 R:1 C4:1 E4:1 F4:1 G4:2 E4:2 C4:2 E4:2 D4:4 R:1 E4:1 E4:1 D4:1 C4:3 C4:1 E4:2 G4:2 G4:1 F4:3 R:1 E4:1 F4:1 G4:2 E4:2 C4:2 D4:2 C4:4'},
  {id:'grace', t:'アメイジング・グレイス', by:'イギリスの 古い 歌', bpm:80, lv:2,
   n:'G3:1 C4:2 E4:0.5 C4:0.5 E4:2 D4:1 C4:2 A3:1 G3:2 G3:1 C4:2 E4:0.5 C4:0.5 E4:2 D4:1 G4:5 E4:1 G4:1.5 E4:0.5 G4:0.5 E4:0.5 C4:2 G3:1 A3:1.5 C4:0.5 C4:0.5 A3:0.5 G3:2 G3:1 C4:2 E4:0.5 C4:0.5 E4:2 D4:1 C4:3'},
  {id:'elise', t:'エリーゼのために（はじめ）', by:'ベートーヴェン（1827年 没）', bpm:70, lv:3,
   n:'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 G#4:0.5 B4:0.5 C5:1.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 C5:0.5 B4:0.5 A4:2'},
  {id:'minuet', t:'メヌエット ト長調', by:'ペツォールト（1733年 没）', bpm:110, lv:3,
   n:'D5:1 G4:0.5 A4:0.5 B4:0.5 C5:0.5 D5:1 G4:1 G4:1 E5:1 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 G5:1 G4:1 G4:1 C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 B4:1 C5:0.5 B4:0.5 A4:0.5 G4:0.5 F#4:1 G4:0.5 A4:0.5 B4:0.5 G4:0.5 A4:3'},
  /* v673：ふやした 曲 */
  {id:'row', t:'こげこげボート', by:'アメリカの 古い 歌', bpm:100, lv:1,
   n:'C4:1.5 C4:1.5 C4:1 D4:0.5 E4:1.5 E4:1 D4:0.5 E4:1 F4:0.5 G4:3 C5:0.5 C5:0.5 C5:0.5 G4:0.5 G4:0.5 G4:0.5 E4:0.5 E4:0.5 E4:0.5 C4:0.5 C4:0.5 C4:0.5 G4:1 F4:0.5 E4:1 D4:0.5 C4:3'},
  {id:'frere', t:'フレール・ジャック', by:'フランスの 古い 歌', bpm:110, lv:1,
   n:'C4:1 D4:1 E4:1 C4:1 C4:1 D4:1 E4:1 C4:1 E4:1 F4:1 G4:2 E4:1 F4:1 G4:2 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 C4:1 G3:1 C4:2 C4:1 G3:1 C4:2'},
  {id:'oldmac', t:'マクドナルドじいさん', by:'アメリカの 古い 歌', bpm:120, lv:1,
   n:'G4:1 G4:1 G4:1 D4:1 E4:1 E4:1 D4:2 B4:1 B4:1 A4:1 A4:1 G4:3 D4:1 G4:1 G4:1 G4:1 D4:1 E4:1 E4:1 D4:2 B4:1 B4:1 A4:1 A4:1 G4:3'},
  {id:'bday', t:'ハッピーバースデー', by:'ヒル姉妹（1916年・1946年 没）', bpm:100, lv:1,
   n:'G4:0.75 G4:0.25 A4:1 G4:1 C5:1 B4:2 G4:0.75 G4:0.25 A4:1 G4:1 D5:1 C5:2 G4:0.75 G4:0.25 G5:1 E5:1 C5:1 B4:1 A4:2 F5:0.75 F5:0.25 E5:1 C5:1 D5:1 C5:3'},
  {id:'sakura', t:'さくらさくら', by:'日本の 古い 歌', bpm:80, lv:2,
   n:'A4:1 A4:1 B4:2 A4:1 A4:1 B4:2 A4:1 B4:1 C5:1 B4:1 A4:1 B4:0.5 A4:0.5 F4:2 E4:1 C4:1 E4:1 F4:1 E4:1 E4:0.5 C4:0.5 B3:2 A4:1 B4:1 C5:1 B4:1 A4:1 B4:0.5 A4:0.5 F4:2 E4:1 C4:1 E4:1 F4:1 E4:1 E4:0.5 C4:0.5 B3:2 A4:1 A4:1 B4:2 A4:1 A4:1 B4:2 E4:1 F4:1 B4:0.5 A4:0.5 F4:1 E4:4'},
  {id:'hotaru', t:'蛍の光', by:'スコットランドの 古い 歌', bpm:90, lv:2,
   n:'C4:1 F4:1.5 F4:0.5 F4:1 A4:1 G4:1.5 F4:0.5 G4:1 A4:0.5 G4:0.5 F4:1.5 F4:0.5 A4:1 C5:1 D5:3 D5:1 C5:1.5 A4:0.5 A4:1 F4:1 G4:1.5 F4:0.5 G4:1 A4:0.5 G4:0.5 F4:1.5 D4:0.5 D4:1 C4:1 F4:3'},
  {id:'ieji', t:'家路（新世界より）', by:'ドヴォルザーク（1904年 没）', bpm:60, lv:2,
   n:'E4:1.5 G4:0.5 G4:2 E4:1.5 D4:0.5 C4:2 D4:1 E4:1 G4:1 E4:1 D4:4 E4:1.5 G4:0.5 G4:2 E4:1.5 D4:0.5 C4:2 D4:1 E4:1 D4:1.5 C4:0.5 C4:4'},
  {id:'brahms', t:'ブラームスの子守歌', by:'ブラームス（1897年 没）', bpm:80, lv:2,
   n:'E4:0.5 E4:0.5 G4:2 E4:0.5 E4:0.5 G4:2 E4:0.5 G4:0.5 C5:1 B4:1.5 A4:0.5 A4:1 G4:1 D4:0.5 E4:0.5 F4:1 D4:1 D4:0.5 E4:0.5 F4:2 D4:0.5 F4:0.5 B4:0.5 A4:0.5 G4:1 B4:1 C5:3'},
  {id:'joyworld', t:'もろびとこぞりて', by:'ヘンデル（1759年 没）', bpm:100, lv:2,
   n:'C5:2 B4:1.5 A4:0.5 G4:3 F4:1 E4:2 D4:2 C4:3 G4:1 A4:3 A4:1 B4:3 B4:1 C5:4'},
  {id:'canon', t:'カノン（はじめ）', by:'パッヘルベル（1706年 没）', bpm:80, lv:2,
   n:'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2'},
  {id:'turkish', t:'トルコ行進曲（はじめ）', by:'モーツァルト（1791年 没）', bpm:90, lv:3,
   n:'B4:0.25 A4:0.25 G#4:0.25 A4:0.25 C5:1 D5:0.25 C5:0.25 B4:0.25 C5:0.25 E5:1 F5:0.25 E5:0.25 D#5:0.25 E5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 B5:0.25 A5:0.25 G#5:0.25 A5:0.25 C6:2'}
];
const MAXMY=30;   // 自分の 曲は 30曲まで
const pcOf=m=>((m%12)+12)%12;
/* ボタンの 並べ方（v673）：note＝音の 名前ごと（7つまで。それより 多い 曲は 高さで 7つに まとめる）・four＝4つ（かんたん） */
const LANE4=[{name:'①',col:'#1e88e5'},{name:'②',col:'#43a047'},{name:'③',col:'#fb8c00'},{name:'④',col:'#e53935'}];
function buildLanes(notes, how){
  const pcs=[...new Set(notes.map(x=>pcOf(x.midi)))].sort((a,b)=>a-b);
  if(how!=='four' && pcs.length<=7) return {lanes:pcs.map(pc=>({name:PC_JA[pc], col:PC_COL[pc], pc})), of:m=>pcs.indexOf(pcOf(m))};
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

/* ── 保存 ── */
const DEF={ inst:'piano', vol:0.8, speed:'mid', song:'kira', mode:'fall', helper:false, wait:false, lanes:'note', my:[],
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
  if(o.mode==='fall' || o.mode==='glow') st.mode=o.mode;
  st.helper=!!o.helper;
  const m=o.met||{};
  st.met.bpm=clamp(Math.round(+m.bpm||100),20,260);
  st.met.beats=[1,2,3,4,5,6,7,8,9,12].includes(+m.beats) ? +m.beats : 4;
  st.met.sub=[1,2,3,4].includes(+m.sub) ? +m.sub : 1;
  st.met.accent=m.accent!==false;
  st.met.snd=MSND.some(x=>x.id===m.snd) ? m.snd : 'click';
  const tu=o.tun||{};
  st.tun.a4=clamp(Math.round(+tu.a4||440),430,450);
  st.tun.set=TSET.some(x=>x.id===tu.set) ? tu.set : 'chrom';
  if(o.best && typeof o.best==='object') for(const k in o.best){ if(/^[a-z0-9]+:(fall|glow):(slow|mid|fast)(:4)?$/.test(k) && isFinite(+o.best[k])) st.best[k]=Math.max(0,Math.round(+o.best[k])); }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){ toastS('保存できませんでした（端末の 空きが 少ない かも しれません）'); } }
/* 自分の 曲：{id:'u…', t:曲名, bpm, n:'C4:1 R:1 …'} */
function cleanMy(x){
  if(!x || typeof x!=='object' || !/^u[0-9a-z]{1,16}$/.test(String(x.id))) return null;
  const n=String(x.n||'').slice(0,12000).split(/\s+/).filter(tok=>/^(R|[A-G][#b]?-?\d):\d+(\.\d+)?$/.test(tok)).join(' ');
  if(!n) return null;
  return {id:String(x.id), t:String(x.t||'自分の 曲').slice(0,30), bpm:clamp(Math.round(+x.bpm||100),30,240), n, by:'自分の 曲', lv:0, my:1};
}
function allSongs(){ return SONGS.concat(st.my); }

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
  {id:'chip', n:'👾 ピコピコ'}, {id:'flute', n:'🪈 笛'}, {id:'guitar', n:'🎸 ギター'}, {id:'organ', n:'⛪ オルガン'}
];
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
let game=null;   // {song, notes:[{t,midi,lane,len,done,res}], lanes, t0, spb, fall, raf, score, combo, max, cnt}
function songOf(){ return allSongs().find(x=>x.id===st.song)||SONGS[0]; }
function bestKey(id){ return (id||songOf().id)+':'+st.mode+':'+st.speed+(st.lanes==='four' ? ':4' : ''); }
function newGame(){
  const s=songOf(), p=parseSong(s), L=buildLanes(p.notes, st.lanes), sp=SPEED[st.speed], spb=60/(s.bpm*sp.k);
  return {song:s, lanes:L.lanes, spb, fall:sp.fall, notes:p.notes.map(x=>({t:x.beat*spb, len:x.len*spb, midi:x.midi, lane:L.of(x.midi), res:null})),
    end:p.beats*spb, t0:0, raf:0, score:0, combo:0, max:0, cnt:{perfect:0, good:0, miss:0}, early:0, late:0, wait:!!st.wait, playing:false, over:false};
}
function gameStart(){
  if(!ac()){ toastS('この ブラウザーでは 音を 出せません'); return; }
  gameStop(); game=newGame(); game.playing=true; game.t0=AC.currentTime+(st.mode==='fall' ? game.fall+0.4 : 2.2);
  render(); game.raf=requestAnimationFrame(gameLoop);
}
function gameStop(){ if(game){ cancelAnimationFrame(game.raf); game.playing=false; } }
function listen(){   // お手本：曲を ぜんぶ 鳴らす
  if(!ac()) return;
  const g=newGame(), t=AC.currentTime+0.15;
  g.notes.forEach(n=>playNote(n.midi, t+n.t, n.len));
  toastS('「'+g.song.t+'」の お手本を 鳴らします（'+Math.round(g.end)+'秒）');
}
const nowT=()=>AC ? AC.currentTime-game.t0 : 0;
function judge(lane){
  if(!game || !game.playing) return;
  const t=nowT();
  let best=null, bd=1e9;
  for(const n of game.notes){ if(n.res || n.lane!==lane) continue; const d=Math.abs(n.t-t); if(d<bd){ bd=d; best=n; } if(n.t-t>WIN.miss) break; }
  if(best && bd<=WIN.good){
    best.res=bd<=WIN.perfect ? 'perfect' : 'good';
    if(best.res==='good'){ if(t<best.t) game.early++; else game.late++; }   // はやい／おそい（v673）
    game.cnt[best.res]++; game.combo++; game.max=Math.max(game.max, game.combo);
    game.score+=(best.res==='perfect' ? 100 : 60)+Math.min(game.combo,50)*2;
    playNote(best.midi, AC.currentTime, best.len*0.95);
    flash(lane, best.res==='good' ? (t<best.t ? 'early' : 'late') : best.res);
  }else{
    // 合わない ときも その 列の 音を 小さく 鳴らす（自由に 弾いても よい）
    const m=game.notes.find(n=>n.lane===lane); if(m) playNote(m.midi, AC.currentTime, 0.25);
    flash(lane, 'free');
  }
}
let fx=[];   // 出た 判定の 文字
function flash(lane, res){
  fx.push({lane, res, t:performance.now()});
  const b=document.querySelector('#otoBody .og-key[data-l="'+lane+'"]');
  if(b){ b.classList.remove('hit','p','g'); void b.offsetWidth; b.classList.add('hit', res==='perfect' ? 'p' : (res==='good'||res==='early'||res==='late') ? 'g' : 'f'); }
  hud();
}
function hud(){
  const s=$('ogScore'), c=$('ogCombo');
  if(s) s.textContent=game ? game.score : 0;
  if(c) c.textContent=game && game.combo>=3 ? game.combo+' コンボ' : '';
}
function gameLoop(){
  if(!game || !game.playing) return;
  let t=nowT();
  // 待って くれる 練習（v673）：つぎの 音符が 線に 来たら、正しい ボタンを 押すまで 時間を 止める
  if(game.wait){ const nx=game.notes.find(n=>!n.res); if(nx && t>=nx.t){ game.t0=AC.currentTime-nx.t; t=nx.t; game.waiting=nx.lane; } else game.waiting=-1; }
  // 通りすぎた 音符は ミス（「手伝い」なら 自動で 鳴らす）
  for(const n of game.notes){
    if(n.res) continue;
    if(n.t>t-WIN.miss) break;
    n.res='miss'; game.cnt.miss++; game.combo=0;
    if(st.helper) playNote(n.midi, AC.currentTime, n.len*0.9, st.inst);
    fx.push({lane:n.lane, res:'miss', t:performance.now()}); hud();
  }
  if(st.mode==='fall') drawFall(t); else drawGlow(t);
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
  x.fillStyle='rgba(255,255,255,.75)'; x.fillRect(0,hitY-2,W,4);
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
    if(f.res==='free') continue;
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
    for(const n of game.notes){ if(n.lane!==lane || n.res) continue; const d=n.t-t; if(d>lead) break; if(d<-WIN.good) continue; k=Math.max(k, 1-Math.max(0,d)/lead); }
    p.style.setProperty('--k', k.toFixed(3));
    p.classList.toggle('lit', k>0);
    p.classList.toggle('now', k>0.88);
  });
  const c=$('ogCnt');
  if(c) c.textContent=t<0 ? String(Math.ceil(-t*game.song.bpm*SPEED[st.speed].k/60)||'') : '';
  const cv=$('ogFx'); if(cv){ const r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1; if(cv.width!==Math.round(r.width*dpr)){ cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); } const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,r.width,r.height); drawFx(x, r.width/game.lanes.length, 18); }
}
function finish(){
  game.playing=false; game.over=true; cancelAnimationFrame(game.raf);
  const k=bestKey(game.song.id), prev=st.best[k]||0, newBest=!game.wait && game.score>prev;   // 待って くれる 練習は ベストに しない
  if(newBest){ st.best[k]=game.score; save(); }
  const tot=game.notes.length, rate=tot ? (game.cnt.perfect+game.cnt.good*0.6)/tot : 0;
  game.rank=rate>=0.95 ? 'S' : rate>=0.85 ? 'A' : rate>=0.7 ? 'B' : rate>=0.5 ? 'C' : 'D';
  game.newBest=newBest; game.rate=rate; game.fc=game.cnt.miss===0 && tot>0;
  render();
  if(game.rank==='S' || newBest){ try{ if(window.HADE_FX && HADE_FX.burst) HADE_FX.burst(); }catch(_){} }
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
  return '<button type="button" class="'+(x.id===cur?'on':'')+'" onclick="OTO.song(\''+x.id+'\')"><b>'+esc(x.t)+'</b><small>'+(x.my ? '🎼 自分の曲・'+parseSong(x).notes.length+'音' : '★'.repeat(x.lv)+'　'+esc(x.by))+(b?'　🏆'+b:'')+'</small></button>';
}
function htmlGame(){
  const s=songOf(), best=st.best[bestKey()]||0;
  if(game && (game.playing)) return htmlPlay();
  const res=game && game.over ? '<div class="og-res"><div class="og-rank r'+game.rank+'">'+game.rank+'</div><div><b>'+game.score+' 点</b>'+(game.newBest?'<em>自己ベスト！</em>':'')+(game.fc?'<em class="fc">フルコンボ！</em>':'')+(game.wait?'<em class="pr">練習</em>':'')
    +'<small>正確さ '+Math.round(game.rate*100)+'％ ・ ぴったり '+game.cnt.perfect+' ・ いいね '+game.cnt.good+'（はやい '+game.early+'・おそい '+game.late+'） ・ ミス '+game.cnt.miss+' ・ 最大 '+game.max+' コンボ</small>'
    +(game.early+game.late>=3 ? '<small class="og-tip">'+(game.early>game.late*1.5 ? '💡 少し 早めに 押す くせが あります。線に 来るまで 待ってみましょう' : game.late>game.early*1.5 ? '💡 少し 遅れぎみです。音符を 見て 先に 指を 用意しましょう' : '💡 早い・遅いが まざって います。メトロノームで テンポを 体に 入れると 合いやすく なります')+'</small>' : '')
    +'</div></div>' : '';
  const groups=[[1,'★ かんたん'],[2,'★★ ふつう'],[3,'★★★ むずかしい']].map(([lv,name])=>{ const l=SONGS.filter(x=>x.lv===lv); return '<div class="og-gname">'+name+'</div>'+l.map(x=>songBtn(x, s.id)).join(''); }).join('');
  const mine='<div class="og-gname">🎼 自分の曲'+(st.my.length ? '（'+st.my.length+'）' : '')+'</div>'+(st.my.length ? st.my.map(x=>songBtn(x, s.id)).join('') : '<div class="og-none">まだ ありません。上の「🎼 曲をつくる」で 作れます</div>');
  return '<div class="og">'+res
    +'<h4>あそび方</h4>'+seg('あそび方',[{id:'fall',n:'⬇ 落ちてくる'},{id:'glow',n:'🌈 光る ボタン'}],st.mode,'mode')
    +'<p class="oo-note">'+(st.mode==='fall' ? '上から 落ちて くる 音符が 下の 線に 来たら、同じ 色の ボタンを 押します。合うと その 音が 鳴って メロディーに なります。' : '色が 付いて 輪が しぼんだ ボタンを 押します。合うと その 音が 鳴って メロディーに なります。')+'</p>'
    +'<h4>曲</h4><div class="og-songs">'+groups+mine+'</div>'
    +'<h4>ボタン</h4>'+seg('ボタン',[{id:'note',n:'🎹 音ごと（ド・レ・ミ…）'},{id:'four',n:'4️⃣ 4つだけ（かんたん）'}],st.lanes,'lanes')
    +'<h4>音色</h4>'+seg('音色',INST,st.inst,'inst')
    +'<h4>速さ</h4>'+seg('速さ',Object.keys(SPEED).map(id=>({id,n:SPEED[id].n})),st.speed,'speed')
    +'<label class="oo-chk"><input type="checkbox" '+(st.wait?'checked':'')+' onchange="OTO.wait()"> 🐢 待って くれる 練習（音符が 線で 止まり、正しい ボタンを 押すまで 進まない。点は ベストに 入れません）</label>'
    +'<label class="oo-chk"><input type="checkbox" '+(st.helper?'checked':'')+' onchange="OTO.helper()"> 押しそこねた 音も 鳴らす（メロディーが とぎれない）</label>'
    +'<div class="om-row"><button type="button" class="om-go" onclick="OTO.start()">▶ あそぶ'+(best?'（ベスト '+best+'）':'')+'</button><button type="button" class="om-tap" onclick="OTO.listen()">👂 お手本</button></div>'
    +(s.my ? '<div class="om-row"><button type="button" class="om-tap" onclick="OTO.edit(\''+s.id+'\')">✏ この曲を なおす</button></div>' : '')
    +'<p class="oo-note">曲は どれも 作者が 亡くなって 長い 年月が たった 曲や、昔から 伝わる 曲の メロディーです（歌詞は 入れて いません）。</p>'
    +'</div>';
}
function htmlPlay(){
  const L=game.lanes, keys=L.map((ln,i)=>'<button type="button" class="og-key" data-l="'+i+'" style="--c:'+ln.col+'" onpointerdown="OTO.hit('+i+',event)">'+esc(ln.name)+'<small>'+(KEYS[i]||'').toUpperCase()+'</small></button>').join('');
  const top='<div class="og-hud"><span>'+esc(game.song.t)+(game.wait?'（練習）':'')+'</span><b id="ogScore">0</b><em id="ogCombo"></em><button type="button" onclick="OTO.quit()">やめる</button></div>';
  if(st.mode==='fall') return '<div class="og-play">'+top+'<canvas id="ogCv" class="og-cv"></canvas><div class="og-keys" style="--n:'+L.length+'">'+keys+'</div></div>';
  const pads=L.map((ln,i)=>'<button type="button" class="og-pad" data-l="'+i+'" style="--c:'+ln.col+'" onpointerdown="OTO.hit('+i+',event)"><span>'+esc(ln.name)+'</span></button>').join('');
  return '<div class="og-play">'+top+'<div class="og-glow"><canvas id="ogFx" class="og-fx"></canvas><div class="og-cnt" id="ogCnt"></div><div class="og-pads n'+L.length+'">'+pads+'</div></div></div>';
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
    +'<div class="ok-tools"><button type="button" onclick="OTO.edelNote()">⌫ 消す</button><button type="button" onclick="OTO.erest()">休み</button><button type="button" class="'+(ed.rec?'rec':'')+'" onclick="OTO.erec()">'+(ed.rec ? '⏺ 録音を 終える（<span id="okRecN">'+ed.recs.length+'音</span>）' : '🔴 弾いて 録音')+'</button></div>'
    +'<div class="ok-lens">'+seg('長さ',ED_LENS,ed.len,'elen')+'<label class="oo-chk ok-dot"><input type="checkbox" '+(ed.dot?'checked':'')+' onchange="OTO.edot()"> 付点（1.5倍）</label></div>'
    +'<div class="ok-octs"><button type="button" onclick="OTO.eoct(-1)" '+(ed.oct<=2?'disabled':'')+'>◀ 低く</button><span>'+(ed.oct===4 ? 'まん中の ド から' : ed.oct>4 ? (ed.oct-4)+'つ 高い ド から' : (4-ed.oct)+'つ 低い ド から')+'</span><button type="button" onclick="OTO.eoct(1)" '+(ed.oct>=6?'disabled':'')+'>高く ▶</button></div>'
    +pianoHtml()
    +'<p class="oo-note">鍵盤を 押すと いまの 長さで 音が 入ります。並んだ 音を 押すと 選べて、その うしろに 入ります（もう一度 押すと いまの 長さに 変わります）。「🔴 弾いて 録音」は 弾いた 間の 長さを テンポに 合わせて 入れます。</p>'
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
.og-play{ display:flex; flex-direction:column; height:100%; min-height:420px; margin:-10px -14px -18px; background:#14181c; color:#fff; }
.og-hud{ display:flex; align-items:center; gap:10px; padding:8px 12px; font-size:13px; }
.og-hud span{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.8; }
.og-hud b{ font-size:22px; font-variant-numeric:tabular-nums; } .og-hud em{ font-style:normal; color:#ffe082; font-weight:800; min-width:4.5em; }
.og-hud button{ padding:6px 12px; border:1px solid rgba(255,255,255,.3); border-radius:16px; background:none; color:#fff; font:inherit; cursor:pointer; }
.og-cv{ flex:1; min-height:0; width:100%; display:block; }
.og-keys{ display:grid; grid-template-columns:repeat(var(--n),1fr); gap:4px; padding:6px 4px 8px; }
.og-key{ min-height:76px; border:0; border-radius:12px; background:color-mix(in srgb, var(--c) 55%, #14181c); color:#fff; font:inherit; font-size:18px; font-weight:900; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; cursor:pointer; touch-action:none; user-select:none; -webkit-user-select:none; }
.og-key small{ font-size:10px; opacity:.55; }
.og-key.hit{ animation:ogK .18s ease-out; } .og-key.hit.p{ animation:ogKP .25s ease-out; }
@keyframes ogK{ from{ background:var(--c); transform:scale(.94); } } @keyframes ogKP{ from{ background:#fff; color:var(--c); transform:scale(.92); } }
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
.og-pad.hit{ animation:ogKP .25s ease-out; }
body.dark .om-pulse{ background:rgba(67,160,71,.18); }
/* v673：曲の まとまり・結果・曲を つくる */
.oo-tabs button{ font-size:13px; padding:9px 2px; white-space:nowrap; }
@media (max-width:400px){ .oo-tabs{ padding:6px 6px 0; gap:2px; } .oo-tabs button{ font-size:12px; letter-spacing:-.02em; } }
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
.ok-tools{ display:flex; gap:6px; } .ok-tools button{ flex:1; min-height:40px; border:1px solid var(--cell-border,#ccc); border-radius:10px; background:var(--modal-bg,#fff); color:var(--text); font:inherit; font-size:13.5px; font-weight:800; cursor:pointer; }
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
function cleanup(){ metStop(); tunStop(); refStop(); gameStop(); game=null; if(ed){ edStop(); if(ed.rec){ ed.rec=false; ed.recs=[]; } } }
function setTab(t){ if(t!=='met') metStop(); if(t!=='tun'){ tunStop(); refStop(); } if(t!=='game'){ gameStop(); game=null; } if(t!=='make' && ed){ edStop(); if(ed.rec){ ed.rec=false; ed.recs=[]; } } tab=t; render(); }
function openOto(t){ ensureDom(); load(); if(t) tab=t; openDlg('otoOverlay', cleanup); render(); }
function closeOto(){ if(!$('otoOverlay') || !isDlgOpen('otoOverlay')) return; closeDlg('otoOverlay', cleanup); }

window.OTO={ tab:setTab, met:metToggle, tap:metTap, setBpm, bpm:d=>setBpm(st.met.bpm+d), beats:v=>setMet('beats',v), sub:v=>setMet('sub',v), snd:v=>setMet('snd',v), accent:()=>setMet('accent'),
  mic:()=>tun.on ? (tunStop(), render()) : tunStart(), tset:v=>setTun('set',v), a4:d=>setTun('a4',d), ref:refTone,
  mode:v=>{ st.mode=v; save(); game=null; render(); }, song:v=>{ st.song=v; save(); game=null; render(); }, inst:v=>{ st.inst=v; save(); render(); const s=parseSong(songOf()).notes; if(s[0]) playNote(s[0].midi, 0, 0.5); },
  speed:v=>{ st.speed=v; save(); game=null; render(); }, helper:()=>{ st.helper=!st.helper; save(); }, start:gameStart, listen, quit:()=>{ gameStop(); game=null; render(); },
  hit:(i,e)=>{ if(e){ e.preventDefault(); } judge(i); },
  wait:()=>{ st.wait=!st.wait; save(); }, lanes:v=>{ st.lanes=v==='four' ? 'four' : 'note'; save(); game=null; render(); },
  // 🎼 曲を つくる（v673）
  ek:edKey, erest:edRest, edelNote:edDel, esel:edSel, erec:edRec, eplay:()=>{ if(ed.timers.length) edStop(); else edPlay(ed.sel>=0 ? ed.sel : 0); }, esave:()=>edSave(false), enew:edNew, egame:edGame,
  eimport:edImport, ecopy:edCopy, edit:edLoad, edelSong:edDelSong, play_my:id=>{ st.song=id; save(); tab='game'; game=null; render(); gameStart(); },
  elen:v=>{ ed.len=+v; render(); }, edot:()=>{ ed.dot=!ed.dot; }, eoct:d=>{ ed.oct=clamp(ed.oct+d,2,6); render(); }, ebpm:d=>{ ed.bpm=clamp(ed.bpm+d,30,240); ed.dirty=true; const b=$('okBpm'); if(b) b.textContent=ed.bpm; renderRoll(); },
  etitle:v=>{ ed.t=String(v).slice(0,30); ed.dirty=true; },
  parseText, toText, ed:()=>ed ? JSON.parse(JSON.stringify({id:ed.id, t:ed.t, bpm:ed.bpm, notes:ed.notes, sel:ed.sel, rec:ed.rec})) : null, shareText:()=>shareText(),
  // ためす とき 用
  songs:()=>allSongs().map(s=>{ const p=parseSong(s); return {id:s.id, t:s.t, n:p.notes.length, lanes:buildLanes(p.notes,'note').lanes.length, pcs:lanesOf(p.notes).length, beats:p.beats, my:!!s.my}; }),
  state:()=>JSON.parse(JSON.stringify(st)), detect, noteToMidi, midiName, midiJa, parseSong, lanesOf,
  game:()=>game ? {playing:game.playing, over:game.over, score:game.score, cnt:Object.assign({},game.cnt), lanes:game.lanes.map(l=>l.pc), names:game.lanes.map(l=>l.name), rank:game.rank, n:game.notes.length, early:game.early, late:game.late, wait:game.wait, waiting:game.waiting, fc:game.fc, rate:game.rate, newBest:game.newBest} : null,
  autoplay:()=>{ if(!game) return; for(const n of game.notes){ n.res='perfect'; game.cnt.perfect++; game.combo++; game.max=Math.max(game.max,game.combo); game.score+=100+Math.min(game.combo,50)*2; } game.end=-1; },
  time:()=>game && AC ? AC.currentTime-game.t0 : null, met_on:()=>met.on, tun_on:()=>tun.on, showPitch };
Object.assign(window, { openOto, closeOto });
})();
