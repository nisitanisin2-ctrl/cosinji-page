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
   n:'D5:1 G4:0.5 A4:0.5 B4:0.5 C5:0.5 D5:1 G4:1 G4:1 E5:1 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 G5:1 G4:1 G4:1 C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 B4:1 C5:0.5 B4:0.5 A4:0.5 G4:0.5 F#4:1 G4:0.5 A4:0.5 B4:0.5 G4:0.5 A4:3'}
];
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
const DEF={ inst:'piano', vol:0.8, speed:'mid', song:'kira', mode:'fall', helper:false,
  met:{bpm:100, beats:4, sub:1, accent:true, snd:'click'}, tun:{a4:440, set:'chrom'}, best:{} };
let st=JSON.parse(JSON.stringify(DEF));
function load(){
  let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(_){}
  st=JSON.parse(JSON.stringify(DEF));
  if(!o || typeof o!=='object') return;
  if(INST.some(x=>x.id===o.inst)) st.inst=o.inst;
  if(typeof o.vol==='number') st.vol=clamp(o.vol,0,1);
  if(SPEED[o.speed]) st.speed=o.speed;
  if(SONGS.some(x=>x.id===o.song)) st.song=o.song;
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
  if(o.best && typeof o.best==='object') for(const k in o.best){ if(/^[a-z]+:(fall|glow):(slow|mid|fast)$/.test(k) && isFinite(+o.best[k])) st.best[k]=Math.max(0,Math.round(+o.best[k])); }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(_){} }

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
function songOf(){ return SONGS.find(x=>x.id===st.song)||SONGS[0]; }
function newGame(){
  const s=songOf(), p=parseSong(s), lanes=lanesOf(p.notes), sp=SPEED[st.speed], spb=60/(s.bpm*sp.k);
  return {song:s, lanes, spb, fall:sp.fall, notes:p.notes.map(x=>({t:x.beat*spb, len:x.len*spb, midi:x.midi, lane:lanes.indexOf(((x.midi%12)+12)%12), res:null})),
    end:p.beats*spb, t0:0, raf:0, score:0, combo:0, max:0, cnt:{perfect:0, good:0, miss:0}, playing:false, over:false};
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
    game.cnt[best.res]++; game.combo++; game.max=Math.max(game.max, game.combo);
    game.score+=(best.res==='perfect' ? 100 : 60)+Math.min(game.combo,50)*2;
    playNote(best.midi, AC.currentTime, best.len*0.95);
    flash(lane, best.res);
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
  if(b){ b.classList.remove('hit','p','g'); void b.offsetWidth; b.classList.add('hit', res==='perfect' ? 'p' : res==='good' ? 'g' : 'f'); }
  hud();
}
function hud(){
  const s=$('ogScore'), c=$('ogCombo');
  if(s) s.textContent=game ? game.score : 0;
  if(c) c.textContent=game && game.combo>=3 ? game.combo+' コンボ' : '';
}
function gameLoop(){
  if(!game || !game.playing) return;
  const t=nowT();
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
function laneCol(i){ return PC_COL[game.lanes[i]]; }
function drawFall(t){
  const cv=$('ogCv'); if(!cv) return;
  const r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1, W=Math.round(r.width), H=Math.round(r.height);
  if(cv.width!==W*dpr || cv.height!==H*dpr){ cv.width=W*dpr; cv.height=H*dpr; }
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,H);
  const L=game.lanes.length, lw=W/L, hitY=H-14, pps=(hitY)/game.fall;
  for(let i=0;i<L;i++){ x.fillStyle=i%2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.06)'; x.fillRect(i*lw,0,lw,H); }
  x.fillStyle='rgba(255,255,255,.75)'; x.fillRect(0,hitY-2,W,4);
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
    x.fillText(f.res==='perfect' ? 'ぴったり' : f.res==='good' ? 'いいね' : 'ミス', f.lane*lw+lw/2, y-(1-a)*24);
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
  const k=game.song.id+':'+st.mode+':'+st.speed, prev=st.best[k]||0, newBest=game.score>prev;
  if(newBest){ st.best[k]=game.score; save(); }
  const tot=game.notes.length, rate=tot ? (game.cnt.perfect+game.cnt.good*0.6)/tot : 0;
  game.rank=rate>=0.95 ? 'S' : rate>=0.85 ? 'A' : rate>=0.7 ? 'B' : rate>=0.5 ? 'C' : 'D';
  game.newBest=newBest; game.rate=rate;
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
function htmlGame(){
  const s=songOf(), k=s.id+':'+st.mode+':'+st.speed, best=st.best[k]||0;
  if(game && (game.playing)) return htmlPlay();
  const res=game && game.over ? '<div class="og-res"><div class="og-rank r'+game.rank+'">'+game.rank+'</div><div><b>'+game.score+' 点</b>'+(game.newBest?'<em>自己ベスト！</em>':'')
    +'<small>ぴったり '+game.cnt.perfect+' ・ いいね '+game.cnt.good+' ・ ミス '+game.cnt.miss+' ・ 最大 '+game.max+' コンボ</small></div></div>' : '';
  return '<div class="og">'+res
    +'<h4>あそび方</h4>'+seg('あそび方',[{id:'fall',n:'⬇ 落ちてくる'},{id:'glow',n:'🌈 光る ボタン'}],st.mode,'mode')
    +'<p class="oo-note">'+(st.mode==='fall' ? '上から 落ちて くる 音符が 下の 線に 来たら、同じ 色の ボタンを 押します。合うと その 音が 鳴って メロディーに なります。' : '色が 付いて 輪が しぼんだ ボタンを 押します。合うと その 音が 鳴って メロディーに なります。')+'</p>'
    +'<h4>曲</h4><div class="og-songs">'+SONGS.map(x=>{ const b=st.best[x.id+':'+st.mode+':'+st.speed]; return '<button type="button" class="'+(x.id===s.id?'on':'')+'" onclick="OTO.song(\''+x.id+'\')"><b>'+esc(x.t)+'</b><small>'+'★'.repeat(x.lv)+'　'+esc(x.by)+(b?'　🏆'+b:'')+'</small></button>'; }).join('')+'</div>'
    +'<h4>音色</h4>'+seg('音色',INST,st.inst,'inst')
    +'<h4>速さ</h4>'+seg('速さ',Object.keys(SPEED).map(id=>({id,n:SPEED[id].n})),st.speed,'speed')
    +'<label class="oo-chk"><input type="checkbox" '+(st.helper?'checked':'')+' onchange="OTO.helper()"> 押しそこねた 音も 鳴らす（メロディーが とぎれない）</label>'
    +'<div class="om-row"><button type="button" class="om-go" onclick="OTO.start()">▶ あそぶ'+(best?'（ベスト '+best+'）':'')+'</button><button type="button" class="om-tap" onclick="OTO.listen()">👂 お手本</button></div>'
    +'<p class="oo-note">曲は どれも 作者が 亡くなって 長い 年月が たった 曲や、昔から 伝わる 曲の メロディーです（歌詞は 入れて いません）。</p>'
    +'</div>';
}
function htmlPlay(){
  const L=game.lanes, keys=L.map((pc,i)=>'<button type="button" class="og-key" data-l="'+i+'" style="--c:'+PC_COL[pc]+'" onpointerdown="OTO.hit('+i+',event)">'+PC_JA[pc]+'<small>'+(KEYS[i]||'').toUpperCase()+'</small></button>').join('');
  const top='<div class="og-hud"><span>'+esc(game.song.t)+'</span><b id="ogScore">0</b><em id="ogCombo"></em><button type="button" onclick="OTO.quit()">やめる</button></div>';
  if(st.mode==='fall') return '<div class="og-play">'+top+'<canvas id="ogCv" class="og-cv"></canvas><div class="og-keys" style="--n:'+L.length+'">'+keys+'</div></div>';
  const pads=L.map((pc,i)=>'<button type="button" class="og-pad" data-l="'+i+'" style="--c:'+PC_COL[pc]+'" onpointerdown="OTO.hit('+i+',event)"><span>'+PC_JA[pc]+'</span></button>').join('');
  return '<div class="og-play">'+top+'<div class="og-glow"><canvas id="ogFx" class="og-fx"></canvas><div class="og-cnt" id="ogCnt"></div><div class="og-pads n'+L.length+'">'+pads+'</div></div></div>';
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
`;
function ensureDom(){
  if($('otoOverlay')) return;
  const s=document.createElement('style'); s.id='otoStyle'; s.textContent=CSS; document.head.appendChild(s);
  const box=document.createElement('div');
  box.innerHTML=`<div class="modal-overlay" id="otoOverlay">
  <div class="modal vol-modal oo-modal modal-full" style="position:relative">
    <div class="modal-header"><span>🎵 音の道具</span><button class="modal-close" onclick="closeOto()" aria-label="閉じる">✕</button></div>
    <div class="oo-tabs" role="tablist"><button type="button" role="tab" data-t="met" onclick="OTO.tab('met')">🥁 メトロノーム</button><button type="button" role="tab" data-t="tun" onclick="OTO.tab('tun')">🎸 チューナー</button><button type="button" role="tab" data-t="game" onclick="OTO.tab('game')">🎮 音ゲー</button></div>
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
function cleanup(){ metStop(); tunStop(); refStop(); gameStop(); game=null; }
function setTab(t){ if(t!=='met') metStop(); if(t!=='tun'){ tunStop(); refStop(); } if(t!=='game'){ gameStop(); game=null; } tab=t; render(); }
function openOto(t){ ensureDom(); load(); if(t) tab=t; openDlg('otoOverlay', cleanup); render(); }
function closeOto(){ if(!$('otoOverlay') || !isDlgOpen('otoOverlay')) return; closeDlg('otoOverlay', cleanup); }

window.OTO={ tab:setTab, met:metToggle, tap:metTap, setBpm, bpm:d=>setBpm(st.met.bpm+d), beats:v=>setMet('beats',v), sub:v=>setMet('sub',v), snd:v=>setMet('snd',v), accent:()=>setMet('accent'),
  mic:()=>tun.on ? (tunStop(), render()) : tunStart(), tset:v=>setTun('set',v), a4:d=>setTun('a4',d), ref:refTone,
  mode:v=>{ st.mode=v; save(); game=null; render(); }, song:v=>{ st.song=v; save(); game=null; render(); }, inst:v=>{ st.inst=v; save(); render(); const s=parseSong(songOf()).notes; if(s[0]) playNote(s[0].midi, 0, 0.5); },
  speed:v=>{ st.speed=v; save(); game=null; render(); }, helper:()=>{ st.helper=!st.helper; save(); }, start:gameStart, listen, quit:()=>{ gameStop(); game=null; render(); },
  hit:(i,e)=>{ if(e){ e.preventDefault(); } judge(i); },
  // ためす とき 用
  songs:()=>SONGS.map(s=>{ const p=parseSong(s); return {id:s.id, t:s.t, n:p.notes.length, lanes:lanesOf(p.notes).length, beats:p.beats}; }),
  state:()=>JSON.parse(JSON.stringify(st)), detect, noteToMidi, midiName, midiJa, parseSong, lanesOf,
  game:()=>game ? {playing:game.playing, over:game.over, score:game.score, cnt:Object.assign({},game.cnt), lanes:game.lanes.slice(), rank:game.rank, n:game.notes.length} : null,
  autoplay:()=>{ if(!game) return; for(const n of game.notes){ n.res='perfect'; game.cnt.perfect++; game.combo++; game.max=Math.max(game.max,game.combo); game.score+=100+Math.min(game.combo,50)*2; } game.end=-1; },
  time:()=>game && AC ? AC.currentTime-game.t0 : null, met_on:()=>met.on, tun_on:()=>tun.on, showPitch };
Object.assign(window, { openOto, closeOto });
})();
