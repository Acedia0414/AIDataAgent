import { config } from "dotenv";
config();

import { invokeLLM } from "./_core/llm";

async function main() {
  try {
    console.log("ENV.llmApiUrl =", process.env.LLM_API_URL);
    console.log("ENV.llmApiKey =", (process.env.LLM_API_KEY || "").slice(0, 5) + "...");

    const response = await invokeLLM({
      provider: "laisky", // or "openai"
      model: "gpt-4.1-mini",
      messages: [
        { role: "user", content: "Hello from test-llm.ts" }
      ],
    });

    console.log("\n--- LLM RESPONSE ---");
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("\n--- ERROR ---");
    console.error(err);
  }
}

main();