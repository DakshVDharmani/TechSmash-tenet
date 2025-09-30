// tts/ollama.js
import { createClient } from "@supabase/supabase-js";

let supabase;   // we will initialise it after fetching env.json

async function initSupabase() {
  if (supabase) return supabase; // reuse if already created

  // 1. load env.json
  const res = await fetch(chrome.runtime.getURL("env.json"));
  if (!res.ok) throw new Error("Cannot load env.json");
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await res.json();

  // 2. create Supabase client
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

export async function getMotivation(userId) {
  const sb = await initSupabase();

  // 1️⃣ get user rows from Supabase
  const { data: objectives, error } = await sb
    .from("objectives")
    .select("title, description, progress")
    .eq("user_id", userId);

  if (error) throw error;

  // 2️⃣ build prompt for Ollama
  const prompt = `
You are a mentor.
User's objectives:
${JSON.stringify(objectives, null, 2)}

Give a short 4–5 sentence piece of advice and finish with a single inspiring quote.
Format exactly:
Advice: [your advice]
Quote: "[quote]" – [Author]
`;

  // 3️⃣ send to local Ollama server
  const response = await fetch("http://localhost:3001/api/ollama/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral:latest",
      prompt,
      stream: false
    })
  });

  if (!response.ok) throw new Error("Ollama request failed");
  const result = await response.json();
  return result.response || result.output || "";
}
