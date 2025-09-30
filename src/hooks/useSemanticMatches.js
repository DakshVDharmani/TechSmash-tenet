import { supabase } from "../supabaseClient";
const HF_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";

/**
 * 1️⃣ Call this once whenever a goal or roadmap title is created/edited
 *    to store its embedding.
 */
export async function upsertEmbedding({ table, id, title }) {
  const res = await fetch(HF_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(title),
  });
  if (!res.ok) throw new Error("HF embedding error");
  const embedding = await res.json();

  const { error } = await supabase
    .from(table)
    .update({ title_embedding: embedding[0] })
    .eq("id", id);
  if (error) throw error;
}

/**
 * 2️⃣ Use this hook anywhere to retrieve semantic matches.
 */
export async function getGoalMatches(goalId, limit = 10) {
  const { data, error } = await supabase
    .rpc("match_goals_to_roadmaps", { goal_id: goalId, match_count: limit });
  if (error) throw error;
  return data; // [{roadmap_id, roadmap_title, similarity, progress, time_category}]
}
