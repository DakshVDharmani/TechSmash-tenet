import { exec } from "child_process";

export function classifyUrl(url, goals) {
  return new Promise((resolve) => {
    const prompt = `User goals: ${JSON.stringify(goals)}.
    Classify this url "${url}" as one of: aligned, distracted, irrelevant.`;

    exec(`ollama run mistral "${prompt}"`, (err, stdout) => {
      if (err) {
        console.error("Ollama error:", err);
        resolve("irrelevant");
      } else {
        resolve(stdout.trim().toLowerCase());
      }
    });
  });
}
