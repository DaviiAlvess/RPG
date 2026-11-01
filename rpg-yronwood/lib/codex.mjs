// ─── Códice, ideias de ação e conquistas ──────────────────────────────
// Tudo calculado do estado da campanha, sem chamadas à IA.

import { asClueList, asChoiceList, asChapterList, clampTension } from "./story-progress.mjs";
import { asPlotList } from "./plots.mjs";

const clip = (v, max) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);

// ── Lugares visitados ──
export function asPlaceList(value) {
  return Array.isArray(value) ? value.map((p) => (p && p.name ? { name: clip(p.name, 120), turn: p.turn || 0 } : null)).filter(Boolean) : [];
}

/** Acrescenta o local atual à lista de lugares, sem repetir. */
export function trackPlace(places = [], location = "", turn = 0) {
  const list = asPlaceList(places);
  const name = clip(location, 120);
  if (!name || list.some((p) => p.name.toLowerCase() === name.toLowerCase())) return list;
  return [...list, { name, turn }].slice(-60);
}

// ── Ideias de ação ──
function lastScene(c) {
  const disp = Array.isArray(c.disp) ? c.disp : [];
  for (let i = disp.length - 1; i >= 0; i--) if (disp[i]?.type === "gm") return String(disp[i].text || "");
  return "";
}

/**
 * Até 4 sugestões a partir da cena: quem está presente, a trama ativa, a última pista,
 * promessas e o estado do corpo. Cada ideia preenche o campo de texto; nada é enviado sozinho.
 */
export function suggestActions(c = {}) {
  const scene = lastScene(c);
  const lower = scene.toLowerCase();
  const rel = c.relationships || {};
  const names = [...new Set([...Object.keys(c.worldState?.npcs || {}), ...Object.keys(rel)])];
  const present = names.filter((n) => n && lower.includes(n.toLowerCase())).slice(0, 2);
  const ideas = [];

  for (const n of present) {
    const attitude = rel[n];
    if (attitude === "Hostil" || attitude === "Suspeito") ideas.push({ label: `Pressionar ${n}`, text: `Encaro ${n} e digo: "` });
    else ideas.push({ label: `Falar com ${n}`, text: `Me aproximo de ${n} e pergunto: "` });
  }
  const clues = asClueList(c.clues);
  if (clues.length) ideas.push({ label: "Seguir a última pista", text: `Sigo a pista: ${clues[clues.length - 1].text.toLowerCase()}. ` });
  const plot = asPlotList(c.plots).find((p) => p.status !== "encerrada");
  if (plot && ideas.length < 4) ideas.push({ label: `Investigar: ${clip(plot.title, 28)}`, text: `Procuro algo que me ajude com isto: ${plot.title.toLowerCase()}. ` });
  const promise = (c.worldState?.promises || []).slice(-1)[0];
  if (promise && ideas.length < 4) ideas.push({ label: "Cumprir uma promessa", text: `Vou atrás do que prometi: ${clip(promise, 120)}. ` });
  if (Number(c.hp) > 0 && Number(c.hp) <= 35 && ideas.length < 4) ideas.push({ label: "Cuidar dos ferimentos", text: "Paro num canto seguro e cuido dos ferimentos. " });
  if (ideas.length < 4) ideas.push({ label: "Observar em volta", text: "Paro e observo com atenção: " });
  if (ideas.length < 4) ideas.push({ label: "Agir", text: "Tento " });
  return ideas.slice(0, 4);
}

// ── Conquistas ──
const relCount = (c, attitude) => Object.values(c.relationships || {}).filter((a) => a === attitude).length;

export const ACHIEVEMENTS = [
  { id: "primeira-pista", icon: "ti-search", title: "Primeira pista", desc: "Descobriu algo que ninguém contou.", check: (c) => asClueList(c.clues).length >= 1 },
  { id: "detetive", icon: "ti-zoom-question", title: "Detetive", desc: "Juntou cinco pistas.", check: (c) => asClueList(c.clues).length >= 5 },
  { id: "decisao", icon: "ti-git-fork", title: "Escolhas pesam", desc: "Tomou três decisões que mudaram a história.", check: (c) => asChoiceList(c.choices).length >= 3 },
  { id: "palavra", icon: "ti-hand-finger", title: "Palavra dada", desc: "Fez uma promessa.", check: (c) => (c.worldState?.promises || []).length >= 1 },
  { id: "pagina", icon: "ti-bookmark", title: "Virando a página", desc: "Fechou o primeiro capítulo.", check: (c) => asChapterList(c.chapters).length >= 1 },
  { id: "saga", icon: "ti-books", title: "Saga", desc: "Viveu cinco capítulos.", check: (c) => asChapterList(c.chapters).length >= 5 },
  { id: "explorador", icon: "ti-map-2", title: "Pés na estrada", desc: "Passou por cinco lugares.", check: (c) => asPlaceList(c.places).length >= 5 },
  { id: "aliados", icon: "ti-users", title: "Rede de aliados", desc: "Três pessoas ao seu lado.", check: (c) => relCount(c, "Amigável") >= 3 },
  { id: "inimigo", icon: "ti-swords", title: "Inimigo jurado", desc: "Alguém quer você longe.", check: (c) => relCount(c, "Hostil") >= 1 },
  { id: "por-um-fio", icon: "ti-heart-broken", title: "Por um fio", desc: "Sobreviveu com quase nada de vida.", check: (c) => Number(c.hp) > 0 && Number(c.hp) <= 15 },
  { id: "ponto-sem-volta", icon: "ti-flame", title: "Ponto sem volta", desc: "A tensão chegou ao máximo.", check: (c) => clampTension(c.tension) >= 3 },
  { id: "veterano", icon: "ti-star", title: "Veterano", desc: "Chegou ao nível 5.", check: (c) => Number(c.level) >= 5 },
  { id: "fim", icon: "ti-crown", title: "Fim da história", desc: "Levou a trama principal até o fim.", check: (c) => Boolean(c.ending) },
];

export function asAchievementList(value) {
  return Array.isArray(value) ? value.filter((a) => a && a.id).map((a) => ({ id: String(a.id), at: a.at || 0 })) : [];
}

/** Conquistas recém-liberadas pelo estado atual. */
export function newAchievements(c = {}, now = Date.now()) {
  const have = new Set(asAchievementList(c.achievements).map((a) => a.id));
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(c)).map((a) => ({ id: a.id, at: now }));
}

export function achievementView(c = {}) {
  const have = new Map(asAchievementList(c.achievements).map((a) => [a.id, a.at]));
  return ACHIEVEMENTS.map(({ check, ...a }) => ({ ...a, unlocked: have.has(a.id), at: have.get(a.id) || 0 }));
}
