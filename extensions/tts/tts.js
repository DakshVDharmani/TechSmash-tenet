// tts/tts.js
export function speak(text) {
  if (!('speechSynthesis' in window)) {
    console.error("Speech synthesis not supported");
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 1;   // adjust speed
  utter.pitch = 1;  // adjust pitch

  // Optional: pick an English voice if available
  const voice = window.speechSynthesis.getVoices()
               .find(v => v.lang.startsWith("en"));
  if (voice) utter.voice = voice;

  window.speechSynthesis.speak(utter);
}
