// ── Recursos de mesa: refazer resposta, registro de erros, combate e grupo ──

const clip = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// ════════════════════════ Refazer a última resposta ════════════════════════
export const REDO_STYLES = [
  { id: "outra", label: "Outra versão", icon: "ti-refresh", note: "Escreva uma versão diferente da cena: outra abordagem, outros detalhes, outro gancho no fim." },
  { id: "tensa", label: "Mais tensa", icon: "ti-flame", note: "Mais tensão e perigo: frases mais curtas, ameaça mais perto, consequência mais dura." },
  { id: "curta", label: "Mais curta", icon: "ti-scissors", note: "Metade do tamanho: só o essencial da consequência e o gancho." },
  { id: "dialogo", label: "Mais diálogo", icon: "ti-message-dots", note: "Mais falas das pessoas presentes, cada uma com o próprio jeito de falar e com subtexto." },
  { id: "detalhada", label: "Mais detalhada", icon: "ti-zoom-in", note: "Mais camadas: o lugar reagindo, as intenções das pessoas, um detalhe que importa para a trama." },
];

/** Nota interna para a nova versão (não aparece para o jogador). */
export function redoNote(styleId, previousText = "") {
  const style = REDO_STYLES.find((s) => s.id === styleId) || REDO_STYLES[0];
  const prev = clip(previousText, 260);
  return `REFAZER A ÚLTIMA RESPOSTA (${style.label}): o jogador pediu outra versão desta mesma cena. ${style.note} A ação do jogador é a mesma e os fatos anteriores continuam valendo. Não repita a versão descartada${prev ? `, que começava assim: "${prev}"` : ""}.`;
}

// ════════════════════════ Registro de erros ════════════════════════
export const ERROR_LOG_KEY = "rpg-error-log";
const ERROR_LOG_MAX = 60;

export function readErrorLog(storage) {
  try {
    const list = JSON.parse(storage?.getItem(ERROR_LOG_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Guarda um erro (sem dados pessoais: só tipo, código, mensagem e onde). */
export function recordError(storage, entry = {}, now = Date.now()) {
  if (!storage) return null;
  const item = {
    at: now,
    kind: clip(entry.kind || "erro", 20),
    code: clip(entry.code || "", 40),
    message: clip(String(entry.message || "").replace(/key=[\w-]+/gi, "key=***").replace(/Bearer\s+[\w.-]+/gi, "Bearer ***"), 300),
    where: clip(entry.where || "", 80),
    stack: clip(String(entry.stack || "").split("\n").slice(0, 4).join(" | "), 400),
  };
  if (!item.message && !item.code) return null;
  const list = readErrorLog(storage);
  // O mesmo erro repetido em sequência vira um contador, não 50 linhas iguais.
  const last = list[list.length - 1];
  if (last && last.message === item.message && last.code === item.code && now - last.at < 60000) {
    last.count = (last.count || 1) + 1;
    last.at = now;
  } else list.push(item);
  try { storage.setItem(ERROR_LOG_KEY, JSON.stringify(list.slice(-ERROR_LOG_MAX))); } catch {}
  return item;
}

export function clearErrorLog(storage) {
  try { storage?.removeItem(ERROR_LOG_KEY); } catch {}
}

/** Texto para o jogador copiar e mandar (o relatório que eu leio para consertar). */
export function errorReport(list = [], meta = {}) {
  const lines = [
    "RELATÓRIO DE PROBLEMAS — RPG",
    `Gerado em: ${new Date(meta.now || Date.now()).toLocaleString("pt-BR")}`,
    meta.version ? `Versão: ${meta.version}` : "",
    meta.agent ? `Aparelho: ${clip(meta.agent, 160)}` : "",
    meta.campaign ? `Campanha: ${clip(meta.campaign, 80)}` : "",
    `Erros registrados: ${list.length}`,
    "",
    ...list.slice(-40).map((e) => `[${new Date(e.at).toLocaleString("pt-BR")}] ${e.kind}${e.code ? ` ${e.code}` : ""}${e.count > 1 ? ` (x${e.count})` : ""}${e.where ? ` @ ${e.where}` : ""}: ${e.message}${e.stack ? `\n    ${e.stack}` : ""}`),
  ];
  return lines.filter((l, i) => l || i === 6).join("\n");
}

// ════════════════════════ Combate ════════════════════════
export const ENEMY_STATUSES = {
  pronto: { label: "pronto", tone: "ready" },
  ferido: { label: "ferido", tone: "hurt" },
  "muito ferido": { label: "muito ferido", tone: "badly" },
  caido: { label: "caído", tone: "down" },
  fugindo: { label: "fugindo", tone: "flee" },
  rendido: { label: "rendido", tone: "down" },
  morto: { label: "morto", tone: "down" },
};
const STATUS_ALIASES = { "caído": "caido", inconsciente: "caido", derrotado: "caido", "gravemente ferido": "muito ferido", machucado: "ferido", ileso: "pronto", "fugiu": "fugindo", rendeu: "rendido", "se rendeu": "rendido", morreu: "morto" };
const OUT = new Set(["caido", "fugindo", "rendido", "morto"]);

const statusOf = (raw) => {
  const n = norm(raw);
  const key = STATUS_ALIASES[n] || STATUS_ALIASES[raw] || n;
  return ENEMY_STATUSES[key] ? key : "pronto";
};

export function asCombat(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.enemies)) return null;
  const enemies = value.enemies
    .map((e) => ({ name: clip(e?.name, 40), status: statusOf(e?.status) }))
    .filter((e) => e.name)
    .slice(0, 8);
  return enemies.length ? { enemies, since: Math.max(0, Math.floor(Number(value.since) || 0)), quiet: Math.max(0, Math.floor(Number(value.quiet) || 0)) } : null;
}

/** Lê [INIMIGO:nome|estado] e [COMBATE_FIM]; devolve o novo estado do combate (ou null). */
export function applyCombatTags(current, text = "", turn = 0) {
  const raw = String(text || "");
  if (/\[COMBATE_FIM\]/i.test(raw)) return null;
  let state = asCombat(current);
  const tags = [...raw.matchAll(/\[INIMIGO:\s*([^\]|]+?)\s*(?:\|\s*([^\]]*))?\]/gi)];
  if (!tags.length) {
    if (!state) return null;
    // Sem notícia dos inimigos por duas respostas e ninguém de pé: a luta acabou.
    const quiet = state.quiet + 1;
    const standing = state.enemies.some((e) => !OUT.has(e.status));
    return quiet >= 2 && !standing ? null : quiet >= 3 ? null : { ...state, quiet };
  }
  state = state || { enemies: [], since: turn, quiet: 0 };
  const enemies = [...state.enemies];
  for (const [, name, status] of tags) {
    const n = clip(name, 40);
    const i = enemies.findIndex((e) => norm(e.name) === norm(n));
    const entry = { name: n, status: statusOf(status || "pronto") };
    if (i >= 0) enemies[i] = entry;
    else enemies.push(entry);
  }
  return { enemies: enemies.slice(-8), since: state.since, quiet: 0 };
}

export const stripCombatTags = (text) => String(text || "").replace(/\[(INIMIGO:[^\]]*|COMBATE_FIM)\]/gi, "");

// Por que a luta acabou (aparece na barra como "Fora de combate").
export const COMBAT_END_LABELS = {
  vitoria: "Inimigos vencidos",
  fugiram: "Os inimigos fugiram",
  fora: "Ninguém mais de pé para lutar",
  fuga: "Você escapou da luta",
  cena: "A cena mudou",
  sumiu: "A luta ficou para trás",
  fim: "A luta acabou",
};
const FLEE_INTENT = /\b(recu[oa]r?|fujo|fugir|fuga|corro|escapo|escapar|me afasto|bato em retirada|saio correndo)\b/;
const ESCAPED_CUE = /\b(escapa|escapou|escapam|escaparam|despista|despistou|ficam? para tras|ficaram para tras|perdem? (voce|voces|o rastro)|consegue fugir|conseguiu fugir|longe do alcance|em seguranca)\b/;
const OVER_CUE = /\b((a|essa|esta) (luta|briga|batalha)|(o|esse|este) (combate|confronto|duelo)) (acabou|acaba|termina|terminou|chega ao fim|chegou ao fim|esta encerrad[oa]|se encerra|foi vencid[oa])\b|\bfim da (luta|briga|batalha)\b/;

function endReason(enemies) {
  if (!enemies.length) return "fim";
  if (enemies.every((e) => e.status === "fugindo")) return "fugiram";
  if (enemies.every((e) => ["caido", "morto", "rendido"].includes(e.status))) return "vitoria";
  return "fora";
}

/**
 * Combate depois de uma resposta do Mestre. Além do novo estado, diz se a luta
 * acabou agora e por quê, para a tela mostrar que o personagem saiu do combate.
 */
export function resolveCombat(current, gmText = "", turn = 0, { playerText = "", sceneChange = false, moved = false } = {}) {
  const before = asCombat(current);
  const raw = String(gmText || "");
  const hasTags = /\[INIMIGO:/i.test(raw);
  if (!before && !hasTags) return { combat: null, ended: null };
  const tagged = hasTags ? applyCombatTags(current, raw.replace(/\[COMBATE_FIM\]/gi, ""), turn) : before;
  const enemies = (tagged || before)?.enemies || [];
  const allOut = enemies.length > 0 && enemies.every((e) => OUT.has(e.status));
  const fled = FLEE_INTENT.test(norm(playerText));
  const said = norm(stripCombatTags(raw));
  const ended = (reason) => ({
    combat: null,
    ended: { reason, label: COMBAT_END_LABELS[reason], enemies: enemies.map((e) => ({ name: e.name, status: e.status })), at: Math.max(0, Math.floor(Number(turn) || 0)) },
  });
  if (sceneChange) return ended("cena");
  if (/\[COMBATE_FIM\]/i.test(raw)) return ended(allOut ? endReason(enemies) : fled ? "fuga" : "fim");
  // Todos caídos, rendidos ou em fuga: a luta acabou mesmo sem a tag de fim.
  if (allOut) return ended(endReason(enemies));
  if (!hasTags) {
    if (fled && (ESCAPED_CUE.test(said) || moved)) return ended("fuga");
    if (OVER_CUE.test(said)) return ended("fim");
  }
  const next = applyCombatTags(current, raw, turn);
  return next ? { combat: next, ended: null } : ended("sumiu");
}

/** Aviso de fim de luta ainda válido para este turno (ou null). */
export function asCombatEnded(value, turn) {
  if (!value || typeof value !== "object" || !COMBAT_END_LABELS[value.reason]) return null;
  if (turn != null && Math.floor(Number(value.at) || 0) !== Math.floor(Number(turn) || 0)) return null;
  const enemies = (Array.isArray(value.enemies) ? value.enemies : [])
    .map((e) => ({ name: clip(e?.name, 40), status: statusOf(e?.status) }))
    .filter((e) => e.name)
    .slice(0, 8);
  return { reason: value.reason, label: COMBAT_END_LABELS[value.reason], enemies, at: Math.floor(Number(value.at) || 0) };
}

export function combatPromptLines(camp = {}, { short = false } = {}) {
  const state = asCombat(camp.combat);
  if (!state) {
    return short ? [] : ["COMBATE: quando uma luta começar, emita uma tag oculta [INIMIGO:nome|pronto] para cada oponente (nomes curtos: 'Bandido de capuz', 'Lobo grande'). Sem luta, não use."];
  }
  const list = state.enemies.map((e) => `${e.name} (${ENEMY_STATUSES[e.status].label})`).join(", ");
  return [
    short
      ? `COMBATE EM CURSO — inimigos: ${list}. Atualize quem mudou com [INIMIGO:nome|estado]; se a luta acabou, emita [COMBATE_FIM].`
      : `COMBATE EM CURSO — inimigos: ${list}. A cada resposta, atualize com [INIMIGO:nome|estado] quem mudou (estados: pronto, ferido, muito ferido, caído, fugindo, rendido, morto). Assim que a luta acabar — inimigos vencidos, rendidos ou em fuga, o personagem escapou, houve trégua ou a cena mudou —, emita [COMBATE_FIM] na mesma resposta. Não deixe a luta aberta depois que ela terminou.`,
    short ? "" : "No combate: o inimigo age também (ataca, cerca, foge, pede ajuda); cada golpe tem peso e posição; nada de coreografia longa — uma troca por resposta.",
  ].filter(Boolean);
}

/** Ações rápidas de combate (preenchem a caixa de texto; o jogador ainda pode editar). */
export function combatActions(camp = {}, target = "") {
  const state = asCombat(camp.combat);
  if (!state) return [];
  const standing = state.enemies.filter((e) => !OUT.has(e.status));
  const alvo = target || standing[0]?.name || "o inimigo";
  return [
    { id: "atacar", label: "Atacar", icon: "ti-sword", text: `Ataco ${alvo}` },
    { id: "defender", label: "Defender", icon: "ti-shield", text: `Fico na defensiva e aparo o próximo golpe de ${alvo}` },
    { id: "manobra", label: "Manobra", icon: "ti-arrows-shuffle", text: `Tento mudar de posição para ganhar vantagem sobre ${alvo}` },
    { id: "analisar", label: "Analisar", icon: "ti-eye", text: `Observo ${alvo} procurando um ponto fraco` },
    { id: "recuar", label: "Recuar", icon: "ti-run", text: "Recuo e procuro uma saída" },
  ];
}

// ════════════════════════ Grupo no mesmo aparelho ════════════════════════
export function asParty(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((p, i) => ({ id: String(p?.id || `p${i}`), name: clip(p?.name, 40), concept: clip(p?.concept, 200) }))
    .filter((p) => p.name)
    .slice(0, 5);
}

/** Quem joga: o personagem principal e os companheiros, em ordem. */
export function partyRoster(camp = {}) {
  const main = { id: "main", name: clip(camp.charName, 60) || "Jogador 1", concept: clip(camp.charTitle, 200) };
  return [main, ...asParty(camp.party)];
}

export function partyActor(camp = {}) {
  const roster = partyRoster(camp);
  if (roster.length < 2) return roster[0];
  const i = Math.max(0, Math.floor(Number(camp.partyTurn) || 0)) % roster.length;
  return roster[i];
}

export const nextPartyTurn = (camp = {}) => {
  const n = partyRoster(camp).length;
  return n < 2 ? 0 : ((Math.max(0, Math.floor(Number(camp.partyTurn) || 0)) + 1) % n);
};

/** Ação marcada com quem está agindo (ex.: "[Rafa] abro a porta"). */
export function actorPrefix(camp = {}, text = "") {
  const roster = partyRoster(camp);
  if (roster.length < 2) return text;
  const actor = partyActor(camp);
  return `[${actor.name}] ${String(text || "").replace(/^\[[^\]]{1,60}\]\s*/, "")}`;
}

/** Quem chegou, voltou ou saiu da mesa online desde a última cena. */
export function roomArrivalLines(camp = {}) {
  const list = Array.isArray(camp.roomArrivals) ? camp.roomArrivals.filter((a) => a?.name) : [];
  if (!list.length) return [];
  const told = list.map((a) => (a.kind === "saiu" ? `${a.name} saiu da mesa` : a.kind === "volta" ? `${a.name} voltou à mesa` : `${a.name} acabou de entrar na mesa`)).join("; ");
  return [`MUDANÇAS NA MESA DESDE A ÚLTIMA CENA: ${told}. Encaixe isso na cena atual com naturalidade: quem entrou ou voltou aparece onde a história está agora (sem recomeçar nada); quem saiu se afasta de um jeito plausível e pode voltar depois.`];
}

export function partyPromptLines(camp = {}) {
  const roster = partyRoster(camp);
  if (roster.length < 2) return roomArrivalLines(camp);
  const actor = partyActor(camp);
  // Mesa online: o próximo é o do assento seguinte (a mesma ordem que o servidor usa para passar a vez).
  const seats = Array.isArray(camp.roomMembers) ? [...camp.roomMembers].sort((a, b) => a.seat - b.seat) : [];
  const after = seats.length > 1 ? seats[(seats.findIndex((m) => m.uid === camp.roomTurnUid) + 1) % seats.length] : null;
  const next = after ? { name: after.name } : roster[nextPartyTurn(camp)];
  return [
    `GRUPO DE JOGADORES NA MESMA MESA (${roster.length}): ${roster.map((p) => `${p.name}${p.concept ? ` — ${p.concept}` : ""}`).join("; ")}.`,
    `Cada jogador controla SÓ o próprio personagem; o Mestre nunca fala, decide ou sente por nenhum deles. A ação deste turno é de ${actor.name} (vem marcada como [${actor.name}]). Narre a consequência para ${actor.name}, chame cada um pelo nome (não use "você" ambíguo), mostre como a cena toca os outros presentes e termine abrindo espaço para ${next.name}, que joga em seguida.`,
    ...roomArrivalLines(camp),
  ];
}

// ════════════════════════ Pessoas da campanha: quando foram vistas ════════════════════════
const TITLE_WORDS = new Set(['sor', 'lorde', 'lady', 'rei', 'rainha', 'principe', 'princesa', 'mestre', 'meistre', 'capitao', 'sargento', 'padre', 'irmao', 'irma', 'senhor', 'senhora', 'dona', 'dom', 'velha', 'velho', 'tia', 'tio', 'cabo', 'tenente', 'doutor', 'dr.', 'sra.', 'sr.', 'cidadao', 'centuriao', 'monge', 'jarl', 'capita']);
/** Atualiza quem apareceu nesta resposta: { nome: { turn, place } }. */
export function updateNpcSeen(camp = {}, text = "", turn = 0) {
  const seen = { ...(camp.npcSeen || {}) };
  const names = [...new Set([...Object.keys(camp.worldState?.npcs || {}), ...Object.keys(camp.relationships || {})])];
  const body = norm(text);
  if (!body) return seen;
  for (const name of names) {
    const n = norm(name);
    if (!n || n.length < 3) continue;
    // Nome próprio sem o título ("Sor Hosman" → "hosman"): basta ele aparecer.
    const given = n.split(/\s+/).find((w) => w.length >= 4 && !TITLE_WORDS.has(w)) || "";
    const hit = body.includes(n) || (given && new RegExp(`\\b${given.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(body));
    if (hit) seen[name] = { turn, place: clip(camp.worldState?.location, 80) };
  }
  return seen;
}
