import activeWin from "active-win";
import { supabase } from "./supabaseClient.js";
import { classifyUrl } from "./ai.js";

let lastUrl = null;
let lastStart = Date.now();

async function monitor(goals) {
  setInterval(async () => {
    const win = await activeWin();
    const url = win?.url || win?.owner?.name;

    if (!url) return;

    if (url !== lastUrl) {
      // log previous
      if (lastUrl) {
        const duration = Math.floor((Date.now() - lastStart) / 1000);
        await supabase.from("activity_logs").insert({
          user_id: "USER_ID", // inject logged in user
          url: lastUrl,
          duration,
          classification: await classifyUrl(lastUrl, goals)
        });
      }
      // reset
      lastUrl = url;
      lastStart = Date.now();
    }
  }, 5000);
}

export { monitor };
