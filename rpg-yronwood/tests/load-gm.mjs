import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function loadGmHandler() {
  const sourcePath = new URL("../pages/api/gm.js", import.meta.url);
  const keysHref = pathToFileURL(fileURLToPath(new URL("../lib/gemini-keys.mjs", import.meta.url))).href;
  const authHref = pathToFileURL(fileURLToPath(new URL("../lib/verify-id-token.mjs", import.meta.url))).href;
  const source = (await readFile(sourcePath, "utf8"))
    .replaceAll("../../lib/gemini-keys.mjs", keysHref)
    .replaceAll("../../lib/verify-id-token.mjs", authHref);
  // Estes testes cobrem o Gemini; o login tem testes próprios (verify-id-token.test.mjs).
  if (process.env.GM_REQUIRE_AUTH === undefined) process.env.GM_REQUIRE_AUTH = "0";
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}
