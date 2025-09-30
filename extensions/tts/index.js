// tts/index.js
import { getMotivation } from "./ollama.js";
import { speak } from "./tts.js";

export async function runTTS(userId) {
  try {
    const text = await getMotivation(userId);
    console.log("Ollama text:", text);
    speak(text);           // 🔊 speak the mentor’s text
  } catch (e) {
    console.error("TTS error:", e);
  }
}
