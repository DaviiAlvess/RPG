// ─── Livro da aventura ────────────────────────────────────────────────
// Monta o HTML imprimível com capa, capítulos, final e apêndices.
// Todo texto vindo do jogo ou da IA passa por escape: nada vira HTML executável.

import { asClueList, asChoiceList } from "./story-progress.mjs";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

const para = (text) => escapeHtml(text).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
const safeUrl = (url) => (/^https:\/\//.test(String(url || "")) ? escapeHtml(url) : "");

function section(title, items) {
  if (!items.length) return "";
  return `<section class="apx"><h3>${escapeHtml(title)}</h3><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul></section>`;
}

/** Divide o histórico visível em capítulos (separadores do tipo "chapter"). */
export function splitChapters(disp = []) {
  const chapters = [{ title: "", entries: [] }];
  for (const m of Array.isArray(disp) ? disp : []) {
    if (m?.type === "chapter") chapters.push({ title: String(m.text || ""), entries: [] });
    else if (m?.type === "gm" || m?.type === "user" || m?.type === "auto") chapters[chapters.length - 1].entries.push(m);
  }
  return chapters.filter((c, i) => c.entries.length || (i > 0 && c.title));
}

export function buildBookHtml(camp = {}, { disp = camp.disp || [], missions = camp.missions || [] } = {}) {
  const name = camp.charName || "Aventureiro";
  const chapters = splitChapters(disp);
  const body = chapters.map((ch, i) => {
    const heading = `<h2 class="chapter"><span>Capítulo ${i + 1}</span>${escapeHtml(ch.title || (i === 0 ? "O começo" : ""))}</h2>`;
    const text = ch.entries.map((m) => (m.type === "gm"
      ? `<p>${para(m.text)}</p>`
      : `<p class="player">— ${para(m.text)}</p>`)).join("");
    return `<article>${heading}${text}</article>`;
  }).join("");

  const e = camp.ending;
  const endingHtml = e ? `<section class="ending"><div class="eyebrow">${escapeHtml(name)} ganhou o título</div><h2>${escapeHtml(e.title)}</h2>${e.epilogue ? `<p>${para(e.epilogue)}</p>` : ""}</section>` : "";
  const choices = (e?.choices?.length ? e.choices : asChoiceList(camp.choices).map((c) => c.text)).map(escapeHtml);
  const clues = asClueList(camp.clues).map((c) => escapeHtml(c.text));
  const rel = Object.entries(camp.relationships || {}).map(([n, a]) => `<strong>${escapeHtml(n)}</strong>: ${escapeHtml(a)}`);
  const done = (missions || []).map((m) => `${m.completed ? "✓" : "◦"} ${escapeHtml(m.text)}`);
  const portrait = safeUrl(camp.portraitUrl);

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>As Crônicas de ${escapeHtml(name)}</title>
<style>
body{font-family:Georgia,serif;color:#111;background:#fff;max-width:760px;margin:0 auto;padding:40px;line-height:1.85;font-size:16px}
.cover{text-align:center;margin:40px 0 90px;page-break-after:always}
.cover img{width:180px;height:180px;object-fit:cover;border-radius:12px;margin-bottom:28px}
.cover h1{font-size:38px;letter-spacing:2px;margin:0 0 10px}.cover h2{font-weight:normal;color:#555;font-size:20px}
.rule{width:80px;height:2px;background:#111;margin:24px auto}
.chapter{font-weight:normal;font-size:26px;margin:70px 0 28px;page-break-before:always;text-align:center}
.chapter span{display:block;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#777;margin-bottom:8px}
article p{text-align:justify;margin:0 0 20px}.player{text-align:right!important;font-style:italic;color:#444}
.ending{text-align:center;margin:80px 0;page-break-before:always}.ending h2{font-size:32px;font-weight:normal;margin:8px 0 16px}
.eyebrow{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#777}
.apx{margin:36px 0;border-top:1px solid #ccc;padding-top:16px;font-size:14px}.apx h3{font-size:13px;letter-spacing:3px;color:#555}
.apx ul{padding-left:18px}
@media print{body{padding:0}@page{margin:2cm}}
</style></head><body>
<div class="cover">${portrait ? `<img src="${portrait}" alt=""/>` : ""}<h1>AS CRÔNICAS DE<br/>${escapeHtml(name.toUpperCase())}</h1><h2>${escapeHtml(camp.world || "")}</h2><div class="rule"></div></div>
${body}
${endingHtml}
${section("Escolhas que marcaram", choices)}
${section("Pistas descobertas", clues)}
${section("Pessoas", rel)}
${section("Missões", done)}
<p style="text-align:center;margin-top:60px"><strong>FIM.</strong></p>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
}
