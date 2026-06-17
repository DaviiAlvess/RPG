import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "pages", "index.js");
let content = fs.readFileSync(file, "utf8");
const marker = "\n// ─── Styles ───────────────────────────────────────────";
const idx = content.indexOf(marker);
if (idx > 0) {
  content = content.slice(0, idx) + "\n";
  fs.writeFileSync(file, content, "utf8");
  console.log("Removed inline styles from index.js");
} else {
  console.log("Marker not found");
}
