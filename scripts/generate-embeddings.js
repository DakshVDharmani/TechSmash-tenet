// scripts/generate-embeddings.js
import 'dotenv/config';
import { HfInference } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

/* -----------------------------------------------------------
   🔴  LOCAL TEST ONLY — hard-code your own keys below
   ----------------------------------------------------------- */

// 1️⃣  Replace these strings with YOUR real values
//     (from Supabase → Settings → API and HuggingFace → Settings → Access Tokens)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

// 🔑 Your Supabase **service role key** (from Settings → API → Service Role)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// 🔑 Your Hugging Face API key, e.g. "hf_xxxxxxxxxxxxxxxxx"
const HF_API_KEY = process.env.HF_API_KEY;

/* -----------------------------------------------------------
   Create Supabase + Hugging Face clients
   ----------------------------------------------------------- */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const hf       = new HfInference(HF_API_KEY);

/* -----------------------------------------------------------
   Helper to embed any table that has:
      • id (uuid)
      • title (text)
      • title_embedding (vector(384))
   ----------------------------------------------------------- */
async function embedTable(table) {
  // Fetch rows that still have NULL embeddings
  const { data: rows, error } = await supabase
    .from(table)
    .select("id, title")
    .is("title_embedding", null);

  if (error) throw error;
  if (!rows?.length) {
    console.log(`ℹ️  No new rows to embed in ${table}`);
    return;
  }

  for (const r of rows) {
    console.log(`▶ Embedding ${table} row: ${r.id} "${r.title}"`);

    // Get the sentence embedding from Hugging Face
    const emb = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: r.title,
    });

    // ✅ Flatten to a simple 1-D array of numbers
    let vector;
    if (Array.isArray(emb[0])) {
      vector = emb[0];        // usual case: [[…384 floats…]]
    } else if (Array.isArray(emb)) {
      vector = emb;           // already 1-D
    } else {
      throw new Error("Unexpected embedding format from Hugging Face");
    }
    vector = vector.map(Number);

    // Update the row with the vector
    const { error: updateError } = await supabase
      .from(table)
      .update({ title_embedding: vector })
      .eq("id", r.id);

    if (updateError) {
      console.error(`❌ Failed to update ${table} row ${r.id}`, updateError);
    } else {
      console.log(`✅ Embedded ${table} row ${r.id}`);
    }
  }
}

/* -----------------------------------------------------------
   Run for both tables
   ----------------------------------------------------------- */
await embedTable("objectives");
await embedTable("roadmaps");
console.log("🎉 All embeddings updated");