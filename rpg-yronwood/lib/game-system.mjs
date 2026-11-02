// ─── O Sistema (estilo manhwa) ────────────────────────────────────────
// Janela de status com pontos, missões do Sistema e loja. O Mestre concede
// pontos e missões por tags; o jogador compra na loja e o Mestre introduz o item.

const clip = (v, max) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
const sid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const SYSTEM_TAG_PATTERN = /\[SISTEMA_(PONTOS|MISSAO|MISSÃO|MISSAO_FIM|MISSÃO_FIM|RANK):[^\]]*\]/gi;
export const stripSystemTags = (text) => String(text || "").replace(SYSTEM_TAG_PATTERN, "");

export const SYSTEM_RANKS = ["E", "D", "C", "B", "A", "S"];

export function normalizeSystem(sys) {
  if (!sys || typeof sys !== "object" || !sys.enabled) return null;
  return {
    enabled: true,
    name: clip(sys.name || "Sistema", 40),
    points: Math.max(0, Math.floor(Number(sys.points) || 0)),
    earned: Math.max(0, Math.floor(Number(sys.earned) || 0)),
    rank: SYSTEM_RANKS.includes(sys.rank) ? sys.rank : "E",
    shop: (Array.isArray(sys.shop) ? sys.shop : []).map((i) => ({
      id: clip(i.id || i.name, 40), name: clip(i.name, 60), desc: clip(i.desc, 240), cost: Math.max(1, Math.floor(Number(i.cost) || 1)), once: Boolean(i.once), ...(i.kind ? { kind: clip(i.kind, 20) } : {}),
    })).filter((i) => i.name).slice(0, 20),
    purchased: (Array.isArray(sys.purchased) ? sys.purchased : []).map((p) => ({ id: clip(p.id, 40), name: clip(p.name, 60), at: p.at || 0 })).slice(-60),
    quests: (Array.isArray(sys.quests) ? sys.quests : []).map((q) => ({
      id: q.id || sid(), text: clip(q.text, 160), reward: Math.max(0, Math.floor(Number(q.reward) || 0)), done: Boolean(q.done),
    })).filter((q) => q.text).slice(-30),
    log: (Array.isArray(sys.log) ? sys.log : []).map((l) => clip(l, 120)).slice(-20),
    chestPool: Array.isArray(sys.chestPool) ? sys.chestPool.slice(0, 12) : undefined,
    lastChestDay: sys.lastChestDay == null || sys.lastChestDay === "" ? null : Math.max(0, Math.floor(Number(sys.lastChestDay) || 0)),
    generated: Boolean(sys.generated),
  };
}

/** Rank sobe com o total de pontos já ganhos. */
export function rankFor(earned) {
  const steps = [0, 50, 150, 350, 700, 1200];
  let r = 0;
  steps.forEach((min, i) => { if (earned >= min) r = i; });
  return SYSTEM_RANKS[r];
}

/** Lê as tags do Sistema numa resposta do Mestre. Devolve { system, events }. */
export function applySystemTags(text, sys) {
  const s = normalizeSystem(sys);
  if (!s) return { system: sys || null, events: [] };
  const events = [];
  const raw = String(text || "");
  for (const m of raw.matchAll(/\[SISTEMA_PONTOS:\s*([+-]?\d+)\s*(?:\|([^\]]*))?\]/gi)) {
    const n = Math.max(-500, Math.min(500, parseInt(m[1], 10) || 0));
    if (!n) continue;
    s.points = Math.max(0, s.points + n);
    if (n > 0) s.earned += n;
    const why = clip(m[2], 80);
    s.log.push(`${n > 0 ? "+" : ""}${n} ${why}`.trim());
    events.push({ type: "points", amount: n, reason: why });
  }
  for (const m of raw.matchAll(/\[SISTEMA_MISS(?:A|Ã)O:([^\]|]+)(?:\|\s*(\d+))?\]/gi)) {
    const t = clip(m[1], 160);
    if (!t || s.quests.some((q) => q.text.toLowerCase() === t.toLowerCase())) continue;
    const quest = { id: sid(), text: t, reward: Math.min(500, parseInt(m[2], 10) || 10), done: false };
    s.quests.push(quest);
    events.push({ type: "quest", quest });
  }
  for (const m of raw.matchAll(/\[SISTEMA_MISS(?:A|Ã)O_FIM:([^\]]+)\]/gi)) {
    const t = clip(m[1], 160).toLowerCase();
    const q = s.quests.find((x) => !x.done && (x.text.toLowerCase().includes(t) || t.includes(x.text.toLowerCase())));
    if (!q) continue;
    q.done = true;
    s.points += q.reward;
    s.earned += q.reward;
    s.log.push(`+${q.reward} missão: ${clip(q.text, 60)}`);
    events.push({ type: "quest_done", quest: q });
  }
  const before = s.rank;
  s.rank = SYSTEM_RANKS.indexOf(rankFor(s.earned)) > SYSTEM_RANKS.indexOf(s.rank) ? rankFor(s.earned) : s.rank;
  if (s.rank !== before) events.push({ type: "rank", rank: s.rank });
  s.log = s.log.slice(-20);
  s.quests = s.quests.slice(-30);
  return { system: s, events };
}

/** Compra um item da loja. Devolve { ok, system, item, error }. */
export function buyItem(sys, itemId, now = Date.now()) {
  const s = normalizeSystem(sys);
  if (!s) return { ok: false, error: "Sistema desligado." };
  const item = s.shop.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Item não existe." };
  if (item.once && s.purchased.some((p) => p.id === item.id)) return { ok: false, error: "Você já comprou isso." };
  if (s.points < item.cost) return { ok: false, error: `Faltam ${item.cost - s.points} pontos.` };
  s.points -= item.cost;
  s.purchased.push({ id: item.id, name: item.name, at: now });
  s.log.push(`-${item.cost} loja: ${item.name}`);
  s.log = s.log.slice(-20);
  return { ok: true, system: s, item };
}

/** Nota interna para o Mestre introduzir a compra na cena seguinte. */
export function purchaseNote(item) {
  return `O jogador acabou de comprar na loja do Sistema: "${item.name}" — ${item.desc}. O item já está no inventário (ou, se for habilidade, já está na ficha do jogador). Na próxima resposta, mostre a notificação do Sistema e introduza o efeito de forma coerente com a época e a cena, sem resolver a situação de graça. O Sistema, a loja e o baú são invisíveis para todos: nenhum personagem vê a tela, as notificações ou o item surgindo do nada. O item aparece de forma discreta e plausível (já está na bolsa, no bolso ou à mão quando o jogador procura), e ninguém comenta a origem. Uma habilidade se manifesta como talento do próprio jogador.`;
}

export function systemPromptLines(c = {}, { short = false } = {}) {
  const s = normalizeSystem(c.gameSystem);
  if (!s) return [];
  const open = s.quests.filter((q) => !q.done).map((q) => `${q.text} (+${q.reward})`);
  const lines = [
    `O SISTEMA: só o jogador vê uma interface chamada "${s.name}", no estilo de manhwa (Solo Leveling). Quando algo importante acontecer, mostre uma notificação curta numa linha própria começando com 【${s.name}】, em tom frio e objetivo. Ninguém mais no mundo vê ou ouve o Sistema: a tela, a loja, as missões e o baú existem só para o jogador. NPCs nunca reagem à interface nem sabem que ela existe; itens comprados aparecem de forma discreta e plausível, e habilidades parecem talento natural. Se o jogador falar do Sistema em voz alta, os outros só ouvem alguém falando sozinho.`,
    `Estado: Rank ${s.rank}, ${s.points} pontos. Missões abertas: ${open.length ? open.join(" | ") : "nenhuma"}. Itens já comprados: ${s.purchased.map((p) => p.name).join(", ") || "nenhum"}.`,
    "Tags ocultas: conceda pontos por feitos reais com [SISTEMA_PONTOS:+n|motivo] (5–40; nunca por andar ou conversar à toa). Ofereça uma missão do Sistema de vez em quando com [SISTEMA_MISSAO:objetivo concreto|recompensa] (10–100), no máximo duas abertas. Ao cumprir: [SISTEMA_MISSAO_FIM:objetivo]. Missões podem ter prazo e penalidade narrativa, mas nunca obrigam o jogador.",
    "O Sistema não resolve a história: dá vantagens pequenas e cobra caro. Mantenha a tensão da época e as consequências reais.",
    systemSkillsLine(c),
  ].filter(Boolean);
  return short ? [lines.join(" ")] : lines;
}

/** Loja padrão para aventuras criadas do zero com o Sistema ligado. */
export const DEFAULT_SYSTEM_SHOP = [
  { id: "lingua", name: "Língua Universal", desc: "Entende e fala qualquer idioma deste mundo como nativo.", cost: 25, once: true },
  { id: "saber", name: "Fragmento de Conhecimento", desc: "Um fato preciso sobre um lugar, pessoa ou objeto.", cost: 15 },
  { id: "cura", name: "Poção de Recuperação", desc: "Fecha ferimentos leves e recupera o fôlego.", cost: 25 },
  { id: "hostil", name: "Olhar de Hostilidade", desc: "Por uma cena, você sabe quem quer ferir você.", cost: 20 },
  { id: "tecnica", name: "Técnica de Combate Básica", desc: "O corpo aprende a lutar com a arma mais comum deste mundo.", cost: 40, once: true },
  { id: "moedas", name: "Bolsa de Moedas", desc: "Dinheiro local suficiente para alguns dias.", cost: 30 },
];

export function defaultSystem() {
  return { enabled: true, name: "Sistema", points: 0, shop: DEFAULT_SYSTEM_SHOP.map((i) => ({ ...i })) };
}

// ── Baú semanal (semana do CALENDÁRIO DO JOGO, não da vida real) ──
export const CHEST_INTERVAL_DAYS = 7;

export const DEFAULT_CHEST_POOL = [
  { name: "Lâmina Afiada do Viajante", desc: "Uma arma simples e muito bem feita, comum neste mundo.", kind: "arma" },
  { name: "Reflexos Aguçados", desc: "Por uma cena por dia, você reage antes dos outros.", kind: "habilidade" },
  { name: "Pele Resistente", desc: "Cortes e pancadas leves doem menos e fecham mais rápido.", kind: "habilidade" },
  { name: "Armadura Leve Reforçada", desc: "Proteção discreta que não atrapalha os movimentos.", kind: "equipamento" },
  { name: "Instinto de Perigo", desc: "Um arrepio avisa quando há uma armadilha por perto.", kind: "habilidade" },
  { name: "Frasco de Cura Maior", desc: "Cura um ferimento grave uma única vez.", kind: "item" },
];

const POOL_KINDS = ["arma", "habilidade", "equipamento", "item"];

/** `day` = dias corridos na história (gameTime.totalDaysElapsed). */
export function chestStatus(sys, day = 0) {
  const s = normalizeSystem(sys);
  if (!s) return { ready: false, daysLeft: 0 };
  const today = Math.max(0, Math.floor(Number(day) || 0));
  const last = sys?.lastChestDay;
  if (last == null || last === "") return { ready: true, daysLeft: 0 };
  const daysLeft = Math.max(0, Number(last) + CHEST_INTERVAL_DAYS - today);
  return { ready: daysLeft === 0, daysLeft };
}

export function formatWaitDays(days) {
  return days === 1 ? "1 dia" : `${days} dias`;
}

function chestPool(sys) {
  const pool = (Array.isArray(sys?.chestPool) ? sys.chestPool : [])
    .map((i) => ({ name: clip(i.name, 60), desc: clip(i.desc, 240), kind: POOL_KINDS.includes(i.kind) ? i.kind : "item" }))
    .filter((i) => i.name);
  return pool.length ? pool : DEFAULT_CHEST_POOL;
}

/** Abre o baú: sorteia uma recompensa (evitando repetir) e marca o dia do jogo. */
export function openChest(sys, day = 0, rnd = Math.random, now = Date.now()) {
  const s = normalizeSystem(sys);
  if (!s) return { ok: false, error: "Sistema desligado." };
  const status = chestStatus(sys, day);
  if (!status.ready) return { ok: false, error: `O próximo baú abre em ${formatWaitDays(status.daysLeft)} na história.` };
  const pool = chestPool(sys);
  const got = new Set(s.purchased.map((p) => p.name));
  const fresh = pool.filter((i) => !got.has(i.name));
  const list = fresh.length ? fresh : pool;
  const reward = list[Math.floor(rnd() * list.length) % list.length];
  s.purchased.push({ id: `bau-${now.toString(36)}`, name: reward.name, at: now });
  s.log.push(`baú (dia ${Math.floor(Number(day) || 0)}): ${reward.name}`);
  s.log = s.log.slice(-20);
  return { ok: true, system: { ...s, lastChestDay: Math.floor(Number(day) || 0) }, reward };
}

export function chestNote(reward) {
  return `O jogador abriu o baú semanal do Sistema e ganhou de graça: "${reward.name}" (${reward.kind}) — ${reward.desc}. A recompensa já foi guardada no inventário (ou nas habilidades, se for habilidade). Na próxima resposta, mostre a notificação do Sistema e faça a recompensa aparecer de forma coerente com o mundo e a cena. O Sistema, a loja e o baú são invisíveis para todos: nenhum personagem vê a tela, as notificações ou o item surgindo do nada. O item aparece de forma discreta e plausível (já está na bolsa, no bolso ou à mão quando o jogador procura), e ninguém comenta a origem. Uma habilidade se manifesta como talento do próprio jogador.`;
}

// ── Loja gerada para o mundo ──
export function systemGenRequest(camp = {}) {
  return {
    systemPrompt: "Você cria a loja e o baú de recompensas do 'Sistema' (estilo manhwa Solo Leveling) para uma aventura de RPG. Responda só com JSON válido, sem texto fora dele, no formato {\"shop\":[{\"name\":\"\",\"desc\":\"\",\"cost\":0,\"once\":false,\"kind\":\"arma|habilidade|equipamento|item\"}],\"chest\":[{\"name\":\"\",\"desc\":\"\",\"kind\":\"arma|habilidade|equipamento|item\"}]}. Seis itens em cada lista, em português. Tudo deve pertencer a ESTE mundo e época (armas, magias, tecnologia, moedas e costumes locais). Vantagens pequenas e com limite claro; nada que resolva a história. Custos de 10 a 60. Descrições de uma frase.",
    content: JSON.stringify({ mundo: camp.world, contexto: String(camp.worldBg || "").slice(0, 1500), personagem: camp.charName, habilidades: camp.charSkills }),
  };
}

export function parseGeneratedSystem(text) {
  try {
    const cleaned = String(text || "").replace(/```json\s*/gi, "").replace(/```/g, "");
    const json = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
    const shop = (json.shop || []).map((i, n) => ({ id: `w${n}-${clip(i.name, 20).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: clip(i.name, 60), desc: clip(i.desc, 240), cost: Math.min(80, Math.max(5, Math.floor(Number(i.cost) || 20))), once: Boolean(i.once), kind: POOL_KINDS.includes(i.kind) ? i.kind : undefined })).filter((i) => i.name && i.desc).slice(0, 8);
    const chest = (json.chest || []).map((i) => ({ name: clip(i.name, 60), desc: clip(i.desc, 240), kind: POOL_KINDS.includes(i.kind) ? i.kind : "item" })).filter((i) => i.name && i.desc).slice(0, 8);
    return shop.length >= 3 ? { shop, chest } : null;
  } catch {
    return null;
  }
}

// ── Recompensas vão direto para o inventário ou para as habilidades ──
const SKILL_HINT = /(por uma cena|uma vez por|aprende|t[ée]cnica|habilidade|olhar|sabe |entende|fala |lembra|move-se|reage|corre |prende a respira|nunca escorrega|detecta|percebe|enxerga|ningu[ée]m lembra|reflexos|instinto|pele resistente|sorte)/i;

/** "habilidade" ou "item" (arma, equipamento e item vão para o inventário). */
export function rewardKind(reward = {}) {
  if (reward.kind === "habilidade") return "habilidade";
  if (["arma", "equipamento", "item"].includes(reward.kind)) return "item";
  return SKILL_HINT.test(`${reward.name} ${reward.desc}`) ? "habilidade" : "item";
}

export function asSystemSkills(value) {
  return Array.isArray(value)
    ? value.filter((s) => s && s.name).map((s) => ({ name: clip(s.name, 60), desc: clip(s.desc, 240), source: clip(s.source || "Sistema", 30) })).slice(0, 40)
    : [];
}

/** Patch da campanha com a recompensa já guardada no lugar certo. */
export function grantReward(camp = {}, reward = {}, source = "Sistema") {
  const kind = rewardKind(reward);
  if (kind === "habilidade") {
    const skills = asSystemSkills(camp.systemSkills);
    if (skills.some((s) => s.name.toLowerCase() === String(reward.name).toLowerCase())) return { kind, patch: {}, duplicate: true };
    return { kind, patch: { systemSkills: [...skills, { name: reward.name, desc: reward.desc, source }] } };
  }
  const items = Array.isArray(camp.items) ? camp.items : [];
  return { kind, patch: { items: [...items, reward.name] } };
}

export function systemSkillsLine(camp = {}) {
  const skills = asSystemSkills(camp.systemSkills);
  return skills.length
    ? `HABILIDADES DO SISTEMA que o jogador já tem (valem como talento dele, invisíveis aos outros): ${skills.map((s) => `${s.name} — ${s.desc}`).join(" | ")}. Respeite os limites descritos.`
    : "";
}
