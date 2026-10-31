// ─── Bastidores do Mestre ─────────────────────────────────────────────
// Verdade escondida de uma história pronta: o jogador nunca vê na interface.
// Fica fora de worldState.secrets de propósito, porque aquela lista aparece no diário do jogador.

const text = (v, max) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v, maxItems, maxLen) => (Array.isArray(v) ? v.map((x) => text(x, maxLen)).filter(Boolean).slice(0, maxItems) : []);

export function normalizeGmBrief(brief) {
  if (!brief || typeof brief !== "object") return null;
  const agendas = brief.agendas && typeof brief.agendas === "object"
    ? Object.fromEntries(Object.entries(brief.agendas).map(([k, v]) => [text(k, 60), text(v, 260)]).filter(([k, v]) => k && v).slice(0, 6))
    : {};
  const out = {
    truth: text(brief.truth, 700),
    clues: list(brief.clues, 5, 220),
    escalation: list(brief.escalation, 4, 220),
    twist: text(brief.twist, 400),
    agendas,
  };
  return out.truth || out.clues.length || out.escalation.length ? out : null;
}

/** Linhas para o prompt do Mestre. `short` corta para o modo economia. */
export function gmBriefLines(c = {}, { short = false } = {}) {
  const b = normalizeGmBrief(c.gmBrief);
  if (!b) return [];
  const lines = [
    "BASTIDORES DO MESTRE (o jogador não vê): esta é a verdade por trás da história. Nunca a revele de uma vez nem por narração — entregue por pistas concretas, ações de NPCs e consequências. Se o jogador seguir outro caminho, adapte, mas mantenha a verdade coerente. Não copie estas frases na narração.",
  ];
  if (b.truth) lines.push(`- Verdade: ${b.truth}`);
  if (b.clues.length) lines.push(`- Pistas que podem ser achadas (uma por vez, ganhas por ação ou teste): ${b.clues.join(" | ")}`);
  if (b.escalation.length) lines.push(`- Relógio — se o jogador hesitar, ignorar ou demorar, o mundo avança nesta ordem, um passo por vez e só quando fizer sentido: ${b.escalation.map((s, i) => `${i + 1}) ${s}`).join(" ")}`);
  if (!short && b.twist) lines.push(`- Virada (só no meio da história, depois de pistas suficientes): ${b.twist}`);
  const agendaEntries = Object.entries(b.agendas);
  if (agendaEntries.length) lines.push(`- O que cada um quer de verdade: ${agendaEntries.map(([n, a]) => `${n}: ${a}`).join(" | ")}`);
  return short ? [lines.join(" ")] : lines;
}
