import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function loadGmHandler() {
  const sourcePath = new URL("../pages/api/gm.js", import.meta.url);
  const keysHref = pathToFileURL(fileURLToPath(new URL("../lib/gemini-keys.mjs", import.meta.url))).href;
  const source = (await readFile(sourcePath, "utf8")).replaceAll("../../lib/gemini-keys.mjs", keysHref);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}
