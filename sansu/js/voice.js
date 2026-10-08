/* ════════════════════════════════════════════════════════════════
   声：聞き取り（ブラウザの 音声認識）と 読み上げ
   S.voice.listen({onStart, onInterim(文字), onFinal([候補…]), onEnd, onError(わけ)})
   S.voice.speak(文字, おわったら) ／ stop() ／ stopSpeak()
   聞き取りは Chrome（Android・パソコン）と Safari（iPhone）で 使える。Chrome は インターネットが 要る
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = window.SANSU;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, on = false, jaVoice = null;
function pickVoice(){ try { jaVoice = speechSynthesis.getVoices().find(v => /^ja[-_]JP/i.test(v.lang)) || jaVoice; } catch(_){} }
if('speechSynthesis' in window){ try { speechSynthesis.onvoiceschanged = pickVoice; } catch(_){} }
const V = S.voice = {
  supported: !!SR,
  listening: () => on,
  listen(h){
    h = h || {};
    if(!SR){ if(h.onError) h.onError('unsupported'); return false; }
    V.stop(); V.stopSpeak();
    try {
      rec = new SR(); rec.lang = 'ja-JP'; rec.interimResults = true; rec.maxAlternatives = 5; rec.continuous = false;
      rec.onstart = () => { on = true; if(h.onStart) h.onStart(); };
      rec.onresult = e => {
        let interim = '';
        for(let i = e.resultIndex; i < e.results.length; i++){
          const r = e.results[i];
          if(r.isFinal){ const alts = []; for(let j = 0; j < r.length; j++) alts.push(String(r[j].transcript || '')); if(h.onFinal) h.onFinal(alts); }
          else interim += r[0].transcript;
        }
        if(interim && h.onInterim) h.onInterim(interim);
      };
      rec.onerror = e => { if(h.onError) h.onError(e.error || 'error'); };
      rec.onend = () => { on = false; rec = null; if(h.onEnd) h.onEnd(); };
      rec.start();
      return true;
    } catch(_){ on = false; rec = null; if(h.onError) h.onError('start'); return false; }
  },
  stop(){ try { if(rec) rec.abort(); } catch(_){} on = false; rec = null; },
  speak(text, done){
    const fin = () => { if(done){ const d = done; done = null; d(); } };
    if(!('speechSynthesis' in window) || !text){ fin(); return; }
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'; u.rate = 0.95; if(!jaVoice) pickVoice(); if(jaVoice) u.voice = jaVoice;
      u.onend = fin; u.onerror = fin; speechSynthesis.speak(u); } catch(_){ fin(); }
  },
  stopSpeak(){ try { speechSynthesis.cancel(); } catch(_){} },
};
/* うまく いかなかった わけを、子どもにも わかる 言葉で */
S.voiceErrMsg = code => ({
  unsupported: 'この 端末では 声で 答えられません（スマホの Chrome や Safari で 使えます）',
  'not-allowed': 'マイクが 使えません。ブラウザの 設定で マイクを 許可してね', 'service-not-allowed': 'マイクが 使えません。ブラウザの 設定で マイクを 許可してね',
  network: '声の 聞き取りには インターネットが 必要です', 'no-speech': '聞こえなかったよ。もう一度 🎤 を おしてね',
  'audio-capture': 'マイクが 見つかりません', start: '声の 聞き取りを 始められませんでした',
})[code] || '';
})();
