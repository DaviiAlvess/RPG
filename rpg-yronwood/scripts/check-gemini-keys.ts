import { Agent, CursorAgentError } from "@cursor/sdk";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const prompt = `Read lib/gemini-keys.mjs and pages/api/gm.js only. Do not edit any files.

The Gemini pool has 7 keys (GEMINI_API_KEY_1 through GEMINI_API_KEY_7, plus aliases). Report whether any rule in those two files can mark all 7 keys as waiting/blocked at the same time.

Cover:
- cooldown / 429 / daily token budget / allResting
- CONTENT_BLOCKED vs key health (does a content block take a key out of rotation?)
- conditions where nextGeminiKey returns allResting: true for a 7-key pool
- whether a single HTTP or content-block path can exhaust or wait-state the entire pool

Answer with a clear yes/no, then the exact code paths. Analysis only.`;

function printResult(result: unknown) {
  if (result == null) return;
  if (typeof result === "string") {
    console.log(result);
    return;
  }
  if (typeof result === "object" && "text" in result && typeof (result as { text: unknown }).text === "string") {
    console.log((result as { text: string }).text);
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("CURSOR_API_KEY is required. Set it before running npm run check:keys.");
    process.exit(1);
  }

  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: "composer-2.5" },
      local: { cwd },
    });

    if (result.status === "error") {
      console.error("run failed: " + result.id);
      process.exit(2);
    }

    console.log("status:", result.status);
    printResult(result.result);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error("startup failed: " + err.message + ", retryable=" + err.isRetryable);
      process.exit(1);
    }
    throw err;
  }
}

void main();
