import { eraPromptLines } from "./era.mjs";
import { bodyChangesLine } from "./manifest.mjs";
// ─── O Sistema (estilo manhwa) ────────────────────────────────────────
// Janela de status com pontos, missões do Sistema e loja. O Mestre concede
// pontos e missões por tags; o jogador compra na loja e o Mestre introduz o item.

const clip = (v, max) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
const sid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const SYSTEM_TAG_PATTERN = /\[SISTEMA_(PONTOS|MISSAO|MISSÃO|MISSAO_FIM|MISSÃO_FIM|RANK|ABATE):[^\]]*\]/gi;
export const stripSystemTags = (text) => String(text || "").replace(SYSTEM_TAG_PATTERN, "");

export const SYSTEM_RANKS = ["E", "D", "C", "B", "A", "S"];
export const SHOP_MAX = 90;

// ── Itens com rank mínimo ──
function normalizeShopList(list, max) {
  return (Array.isArray(list) ? list : []).map((i) => ({
    id: clip(i.id || i.name, 40), name: clip(i.name, 60), desc: clip(i.desc, 240),
    cost: Math.max(1, Math.floor(Number(i.cost) || 1)), once: Boolean(i.once),
    tier: SYSTEM_RANKS.includes(i.tier) ? i.tier : "E",
    ...(i.kind ? { kind: clip(i.kind, 20) } : {}),
  })).filter((i) => i.name).slice(0, max);
}

// ── Bônus de cada rank: desconto na loja e multiplicador de pontos ganhos ──
export const RANK_BONUS = {
  E: { discount: 0, mult: 1, label: "Sem bônus — prove seu valor." },
  D: { discount: 0.05, mult: 1.1, label: "5% de desconto · +10% de pontos" },
  C: { discount: 0.1, mult: 1.2, label: "10% de desconto · +20% de pontos" },
  B: { discount: 0.15, mult: 1.35, label: "15% de desconto · +35% de pontos" },
  A: { discount: 0.2, mult: 1.5, label: "20% de desconto · +50% de pontos" },
  S: { discount: 0.3, mult: 2, label: "30% de desconto · pontos em dobro" },
};

export function rankBonus(rank) {
  return RANK_BONUS[rank] || RANK_BONUS.E;
}

export function priceFor(item, rank) {
  return Math.max(1, Math.round((Number(item?.cost) || 1) * (1 - rankBonus(rank).discount)));
}

export function isUnlocked(item, rank) {
  return SYSTEM_RANKS.indexOf(item?.tier || "E") <= SYSTEM_RANKS.indexOf(rank || "E");
}

const boosted = (n, rank) => (n > 0 ? Math.round(n * rankBonus(rank).mult) : n);


export function normalizeSystem(sys) {
  if (!sys || typeof sys !== "object" || !sys.enabled) return null;
  return {
    enabled: true,
    name: clip(sys.name || "Sistema", 40),
    points: Math.max(0, Math.floor(Number(sys.points) || 0)),
    earned: Math.max(0, Math.floor(Number(sys.earned) || 0)),
    rank: SYSTEM_RANKS.includes(sys.rank) ? sys.rank : "E",
    level: Math.max(1, Math.floor(Number(sys.level) || 1)),
    kills: Math.max(0, Math.floor(Number(sys.kills) || 0)),
    shop: normalizeShopList(sys.shop, SHOP_MAX),
    searchResults: normalizeShopList(sys.searchResults, 8),
    cart: normalizeShopList(sys.cart, 20),
    lastSearch: clip(sys.lastSearch, 80),
    purchased: (Array.isArray(sys.purchased) ? sys.purchased : []).map((p) => ({ id: clip(p.id, 40), name: clip(p.name, 60), at: p.at || 0 })).slice(-60),
    quests: (Array.isArray(sys.quests) ? sys.quests : []).map((q) => ({
      id: q.id || sid(), text: clip(q.text, 160), reward: Math.max(0, Math.floor(Number(q.reward) || 0)), done: Boolean(q.done),
    })).filter((q) => q.text).slice(-30),
    log: (Array.isArray(sys.log) ? sys.log : []).map((l) => clip(l, 120)).slice(-20),
    chestPool: Array.isArray(sys.chestPool) ? sys.chestPool.slice(-48) : undefined,
    expandedRanks: (Array.isArray(sys.expandedRanks) ? sys.expandedRanks : []).filter((r) => SYSTEM_RANKS.includes(r)),
    lastRestockDay: sys.lastRestockDay == null || sys.lastRestockDay === "" ? null : Math.max(0, Math.floor(Number(sys.lastRestockDay) || 0)),
    lastChestDay: sys.lastChestDay == null || sys.lastChestDay === "" ? null : Math.max(0, Math.floor(Number(sys.lastChestDay) || 0)),
    generated: Boolean(sys.generated),
  };
}

// ── Nível por meta ──
// A meta conta os pontos GANHOS (não o saldo): gastar na loja nunca tira nível.
/** Total de pontos ganhos para chegar ao nível `level + 1`: 50, 150, 300, 500, 750… */
export function metaFor(level) {
  const l = Math.max(1, Math.floor(Number(level) || 1));
  return 25 * l * (l + 1);
}

export function rankForLevel(level) {
  const l = Math.max(1, Number(level) || 1);
  return l >= 30 ? "S" : l >= 20 ? "A" : l >= 15 ? "B" : l >= 10 ? "C" : l >= 5 ? "D" : "E";
}

/** Mantido para saves antigos: rank a partir dos pontos ganhos. */
export function rankFor(earned) {
  let level = 1;
  while (earned >= metaFor(level) && level < 99) level++;
  return rankForLevel(level);
}

/** Progresso da meta atual (para a barra). */
export function metaProgress(sys) {
  const s = normalizeSystem(sys);
  if (!s) return null;
  const prev = s.level > 1 ? metaFor(s.level - 1) : 0;
  const next = metaFor(s.level);
  const done = Math.max(0, s.earned - prev);
  const need = next - prev;
  return { level: s.level, earned: s.earned, next, done, need, pct: Math.min(100, (done / need) * 100), left: Math.max(0, next - s.earned) };
}

const KILL_POINTS = { comum: 10, fraco: 5, forte: 25, elite: 40, chefe: 80, boss: 80 };

/** Lê as tags do Sistema numa resposta do Mestre. Devolve { system, events }. */
export function applySystemTags(text, sys) {
  const s = normalizeSystem(sys);
  if (!s) return { system: sys || null, events: [] };
  const events = [];
  const raw = String(text || "");
  for (const m of raw.matchAll(/\[SISTEMA_PONTOS:\s*([+-]?\d+)\s*(?:\|([^\]]*))?\]/gi)) {
    const n = boosted(Math.max(-500, Math.min(500, parseInt(m[1], 10) || 0)), s.rank);
    if (!n) continue;
    s.points = Math.max(0, s.points + n);
    if (n > 0) s.earned += n;
    const why = clip(m[2], 80);
    s.log.push(`${n > 0 ? "+" : ""}${n} ${why}`.trim());
    events.push({ type: "points", amount: n, reason: why });
  }
  for (const m of raw.matchAll(/\[SISTEMA_ABATE:([^\]|]+)(?:\|\s*([^\]|]+))?(?:\|[^\]]*)?\]/gi)) {
    const who = clip(m[1], 60);
    const tier = String(m[2] || "comum").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const n = boosted(KILL_POINTS[tier] || (/^\d+$/.test(tier) ? Math.min(150, Number(tier)) : KILL_POINTS.comum), s.rank);
    s.points += n;
    s.earned += n;
    s.kills += 1;
    s.log.push(`+${n} abate: ${who}`);
    events.push({ type: "kill", amount: n, who, tier });
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
    const reward = boosted(q.reward, s.rank);
    s.points += reward;
    s.earned += reward;
    s.log.push(`+${reward} missão: ${clip(q.text, 60)}`);
    events.push({ type: "quest_done", quest: { ...q, reward } });
  }
  // Bateu a meta → sobe de nível (pode subir mais de um de uma vez).
  while (s.earned >= metaFor(s.level) && s.level < 99) {
    s.level += 1;
    events.push({ type: "level", level: s.level });
  }
  const before = s.rank;
  const byLevel = rankForLevel(s.level);
  if (SYSTEM_RANKS.indexOf(byLevel) > SYSTEM_RANKS.indexOf(s.rank)) s.rank = byLevel;
  if (s.rank !== before) events.push({ type: "rank", rank: s.rank });
  s.log = s.log.slice(-20);
  s.quests = s.quests.slice(-30);
  return { system: s, events };
}

/** Compra um item da loja. Devolve { ok, system, item, error }. */
export function buyItem(sys, itemId, now = Date.now()) {
  const s = normalizeSystem(sys);
  if (!s) return { ok: false, error: "Sistema desligado." };
  const item = s.shop.find((i) => i.id === itemId) || s.searchResults.find((i) => i.id === itemId) || s.cart.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Item não existe." };
  if (!isUnlocked(item, s.rank)) return { ok: false, error: `Requer Rank ${item.tier}.` };
  if (item.once && s.purchased.some((p) => p.id === item.id)) return { ok: false, error: "Você já comprou isso." };
  const price = priceFor(item, s.rank);
  if (s.points < price) return { ok: false, error: `Faltam ${price - s.points} pontos.` };
  s.points -= price;
  s.purchased.push({ id: item.id, name: item.name, at: now });
  s.log.push(`-${price} loja: ${item.name}`);
  s.log = s.log.slice(-20);
  // Item achado na busca passa a ficar na loja; comprado sai do carrinho.
  if (!s.shop.some((i) => i.id === item.id)) s.shop = [...s.shop, item].slice(-SHOP_MAX);
  s.cart = s.cart.filter((i) => i.id !== item.id);
  return { ok: true, system: s, item: { ...item, paid: price } };
}

// ── Busca na loja: o Mestre cria opções para o que o jogador procurou ──
const KIND_WORDS = { habilidade: "HABILIDADES (talentos, técnicas, magias, poderes, sentidos — nada que seja objeto)", arma: "ARMAS", equipamento: "EQUIPAMENTOS (armaduras, roupas, ferramentas, montarias)", item: "ITENS (consumíveis, documentos, dinheiro, objetos)" };

export function shopSearchRequest(camp = {}, query = "", kind = "todos") {
  const s = normalizeSystem(camp.gameSystem) || { rank: "E", level: 1 };
  const next = SYSTEM_RANKS[Math.min(SYSTEM_RANKS.length - 1, SYSTEM_RANKS.indexOf(s.rank) + 1)];
  return {
    systemPrompt: `Você é a loja do 'Sistema' (estilo manhwa Solo Leveling) de um RPG. O jogador procurou um item. Crie de 5 a 6 opções variadas que combinem com a busca e pertençam a ESTE mundo e época (nada anacrônico, a não ser que o mundo permita). Responda só com JSON válido: {"items":[{"name":"","desc":"","cost":0,"tier":"E|D|C|B|A|S","kind":"arma|habilidade|equipamento|item","once":false}]}. O jogador está no nível ${s.level}, Rank ${s.rank}. Faça a maioria das opções do Rank ${s.rank} ou abaixo, com uma versão mais forte do Rank ${next} (trancada, para ele ver o que vem). Quanto maior o rank, mais forte o efeito e mais caro: E 10–40, D 30–70, C 60–120, B 100–200, A 180–320, S 300–600 pontos. Descrições de uma frase com o efeito e um limite claro. Em português. Se a busca pedir uma habilidade, técnica, magia ou poder, crie HABILIDADES (kind "habilidade"), não objetos. Se a busca for impossível neste mundo, ofereça o equivalente mais próximo.${KIND_WORDS[kind] ? ` O jogador filtrou: crie SOMENTE ${KIND_WORDS[kind]}, com kind "${kind}".` : ""}`,
    content: JSON.stringify({ busca: clip(query, 80), epoca: eraPromptLines(camp, { short: true })[0] || "", mundo: camp.world, contexto: String(camp.worldBg || "").slice(0, 800), personagem: camp.charName }),
  };
}

export function parseShopSearch(text, prefix = "busca", kind = "todos") {
  try {
    const cleaned = String(text || "").replace(/```json\s*/gi, "").replace(/```/g, "");
    const json = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
    const stamp = Date.now().toString(36);
    return normalizeShopList((json.items || []).map((i, n) => ({
      ...i,
      id: `${prefix}-${stamp}-${n}`,
      cost: Math.min(600, Math.max(5, Math.floor(Number(i.cost) || 20))),
      kind: POOL_KINDS.includes(kind) ? kind : POOL_KINDS.includes(i.kind) ? i.kind : undefined,
    })).filter((i) => i.name && i.desc), 8);
  } catch {
    return [];
  }
}

/** Pedido para a loja (e o baú) ganharem coisas novas do rank do jogador. */
export function shopExpandRequest(camp = {}, rank = "D") {
  const sys = camp.gameSystem || {};
  return {
    systemPrompt: `Você é a loja do 'Sistema' (estilo manhwa Solo Leveling) de um RPG. O jogador está no Rank ${rank}. Crie 6 itens NOVOS para a loja do Rank ${rank}, mais fortes que os de ranks abaixo, que pertençam a ESTE mundo e época: 2 habilidades, 2 armas ou equipamentos, 2 itens. Crie também 4 recompensas do Rank ${rank} para o BAÚ semanal grátis (coisas boas e raras, um pouco melhores que um item comum da loja desse rank). Responda só com JSON válido: {"items":[{"name":"","desc":"","cost":0,"tier":"${rank}","kind":"arma|habilidade|equipamento|item","once":false}],"chest":[{"name":"","desc":"","tier":"${rank}","kind":"arma|habilidade|equipamento|item"}]}. Custos da loja: E 10–40, D 30–70, C 60–120, B 100–200, A 180–320, S 300–600 pontos. Descrições de uma frase com efeito e limite claro. Nada repetido da lista atual. Em português.`,
    content: JSON.stringify({ epoca: eraPromptLines(camp, { short: true })[0] || "", mundo: camp.world, contexto: String(camp.worldBg || "").slice(0, 800), itensAtuais: [...(sys.shop || []), ...(sys.chestPool || [])].map((i) => i.name).slice(-60) }),
  };
}

/** Recompensas do baú vindas da resposta de expansão. */
export function parseChestRewards(text, rank = "E") {
  try {
    const cleaned = String(text || "").replace(/```json\s*/gi, "").replace(/```/g, "");
    const json = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
    return (json.chest || []).map((i) => ({ name: clip(i.name, 60), desc: clip(i.desc, 240), kind: POOL_KINDS.includes(i.kind) ? i.kind : "item", tier: SYSTEM_RANKS.includes(i.tier) ? i.tier : rank })).filter((i) => i.name && i.desc).slice(0, 6);
  } catch {
    return [];
  }
}

export function mergeChestPool(sys, rewards = [], rank = null) {
  const s = normalizeSystem(sys);
  if (!s) return sys;
  const base = chestPool(s, { withDefaults: false });
  const names = new Set(base.map((i) => i.name.toLowerCase()));
  const fresh = rewards.filter((i) => i && i.name && !names.has(i.name.toLowerCase()));
  const expandedRanks = rank && !s.expandedRanks.includes(rank) ? [...s.expandedRanks, rank] : s.expandedRanks;
  return { ...s, chestPool: [...base, ...fresh].slice(-48), expandedRanks };
}

/** O rank atual ainda não ganhou itens próprios do mundo (loja e baú)? */
export function needsRankExpansion(sys) {
  const s = normalizeSystem(sys);
  if (!s || s.rank === "E") return false;
  return !s.expandedRanks.includes(s.rank);
}

export function mergeShopItems(sys, items = []) {
  const s = normalizeSystem(sys);
  if (!s) return sys;
  const names = new Set(s.shop.map((i) => i.name.toLowerCase()));
  const fresh = normalizeShopList(items, 12).filter((i) => !names.has(i.name.toLowerCase()));
  return { ...s, shop: [...s.shop, ...fresh].slice(-SHOP_MAX) };
}

/** Nota interna para o Mestre introduzir a compra na cena seguinte. */
export function purchaseNote(item, manifestation = null, boostText = "") {
  const base = `O jogador acabou de comprar na loja do Sistema: "${item.name}" — ${item.desc}. Já está na ficha (habilidade) ou no inventário (item). O Sistema, a loja e o baú são invisíveis para todos: ninguém vê a tela, as notificações ou algo surgindo do nada.`;
  if (rewardKind(item) === "habilidade") {
    const body = manifestation
      ? ` MANIFESTAÇÃO FÍSICA (obrigatória, nesta resposta): ${manifestation.change}. Descreva a transformação acontecendo no corpo — ossos, músculos, pele, o que for — com sensação e detalhe; roupas podem ficar apertadas ou curtas. Os NPCs presentes PERCEBEM a mudança na hora e reagem (espanto, medo, cobiça, desconfiança, piada nervosa), buscando explicação da época. A mudança é permanente.`
      : " A habilidade se manifesta JÁ nesta resposta: mostre a primeira vez que o jogador sente ou usa esse poder na cena atual, com uma demonstração pequena e concreta. Se o efeito for perceptível, quem estiver perto nota algo estranho, mas acha que é talento do próprio jogador.";
    const stats = boostText ? ` A FICHA SUBIU (${boostText}): daqui em diante o personagem age nesse nível — um espadachim luta como espadachim, com técnica e postura que quem entende de luta reconhece. Mostre isso na cena.` : "";
    return `${base}${body}${stats} Não resolva a situação de graça.`;
  }
  return `${base} Na próxima resposta, mostre a notificação do Sistema. O item aparece de forma discreta e plausível (já está na bolsa, no bolso ou à mão quando o jogador procura), e ninguém comenta a origem.`;
}

export function systemPromptLines(c = {}, { short = false } = {}) {
  const s = normalizeSystem(c.gameSystem);
  if (!s) return [];
  const open = s.quests.filter((q) => !q.done).map((q) => `${q.text} (+${q.reward})`);
  const lines = [
    `O SISTEMA: só o jogador vê uma interface chamada "${s.name}", no estilo de manhwa (Solo Leveling). Quando algo importante acontecer, mostre uma notificação curta numa linha própria começando com 【${s.name}】, em tom frio e objetivo. Ninguém mais no mundo vê ou ouve o Sistema: a tela, a loja, as missões e o baú existem só para o jogador. NPCs nunca reagem à interface nem sabem que ela existe; itens comprados aparecem de forma discreta e plausível, e habilidades parecem talento natural. Mas se uma habilidade MUDA O CORPO (altura, músculos, olhos, pele, voz), todos veem a mudança — só não sabem a causa. Se o jogador falar do Sistema em voz alta, os outros só ouvem alguém falando sozinho.`,
    `Estado: Nível ${s.level} (meta: ${metaFor(s.level)} pontos ganhos; já ganhou ${s.earned}), Rank ${s.rank} (bônus: ${rankBonus(s.rank).label}), ${s.points} pontos para gastar, ${s.kills} abates. Missões abertas: ${open.length ? open.join(" | ") : "nenhuma"}. Itens já comprados: ${s.purchased.map((p) => p.name).join(", ") || "nenhum"}.`,
    "ABATES: toda vez que o jogador matar ou derrotar de vez um inimigo (pessoa, monstro, fera hostil), emita [SISTEMA_ABATE:quem foi|comum] — use comum, forte, elite ou chefe conforme o perigo. Um abate por inimigo; nunca por inimigo que fugiu, foi poupado ou apenas ferido.",
    "AÇÕES: conceda pontos por ações e feitos reais (vencer um desafio, salvar alguém, enganar um poderoso, descobrir algo grande) com [SISTEMA_PONTOS:+n|motivo] (5–40; nunca por andar ou conversar à toa). Os pontos são do jogador para gastar na loja como quiser; o nível sobe sozinho quando os pontos GANHOS batem a meta.",
    "Tags ocultas: Ofereça uma missão do Sistema de vez em quando com [SISTEMA_MISSAO:objetivo concreto|recompensa] (10–100), no máximo duas abertas. Ao cumprir: [SISTEMA_MISSAO_FIM:objetivo]. Missões podem ter prazo e penalidade narrativa, mas nunca obrigam o jogador.",
    "O Sistema não resolve a história: dá vantagens pequenas e cobra caro. Mantenha a tensão da época e as consequências reais.",
    systemSkillsLine(c),
    bodyChangesLine(c),
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
  { id: "furtivo", name: "Passos Sem Som", desc: "Por uma cena, você se move sem fazer nenhum barulho.", cost: 45, tier: "D", kind: "habilidade" },
  { id: "arma-boa", name: "Arma de Mestre Artesão", desc: "Uma arma excelente deste mundo, que nunca perde o fio.", cost: 65, tier: "D", kind: "arma" },
  { id: "regen", name: "Regeneração Lenta", desc: "Ferimentos leves fecham sozinhos depois de uma noite de sono.", cost: 110, tier: "C", kind: "habilidade", once: true },
  { id: "inventario", name: "Inventário Dimensional", desc: "Um bolso que só você acessa, onde cabe o equivalente a um baú.", cost: 120, tier: "C", kind: "habilidade", once: true },
  { id: "aura", name: "Aura de Intimidação", desc: "Inimigos comuns hesitam antes de atacar você. Não funciona em chefes.", cost: 170, tier: "B", kind: "habilidade", once: true },
  { id: "armadura-rara", name: "Armadura Lendária Leve", desc: "Proteção de um herói antigo, leve como roupa comum.", cost: 190, tier: "B", kind: "equipamento" },
  { id: "tempo", name: "Percepção Acelerada", desc: "Uma vez por dia, o mundo desacelera por alguns segundos para você.", cost: 280, tier: "A", kind: "habilidade", once: true },
  { id: "mapa", name: "Mapa da Região", desc: "Um mapa fiel dos arredores, com trilhas e esconderijos.", cost: 20, kind: "item" },
  { id: "racao", name: "Provisões do Viajante", desc: "Comida e água para uma semana na estrada.", cost: 10, kind: "item" },
  { id: "faca", name: "Faca Bem Equilibrada", desc: "Lâmina curta de bom aço, fácil de esconder.", cost: 18, kind: "arma" },
  { id: "manto", name: "Manto Discreto", desc: "Roupa comum da região que faz você passar despercebido na multidão.", cost: 22, kind: "equipamento" },
  { id: "folego", name: "Fôlego de Corredor", desc: "Corre o dobro do normal antes de cansar.", cost: 35, kind: "habilidade", once: true },
  { id: "antidoto", name: "Antídoto Simples", desc: "Neutraliza um veneno comum, uma vez.", cost: 28, tier: "D", kind: "item" },
  { id: "esgrima", name: "Esgrima do Duelista", desc: "Você luta com espada como um duelista treinado.", cost: 60, tier: "D", kind: "habilidade", once: true },
  { id: "escudo", name: "Escudo Reforçado", desc: "Aguenta golpes que partiriam um escudo comum.", cost: 55, tier: "D", kind: "equipamento" },
  { id: "memoria", name: "Memória Perfeita", desc: "Lembra de tudo o que viu ou ouviu no último dia.", cost: 95, tier: "C", kind: "habilidade", once: true },
  { id: "arco", name: "Arco do Caçador Real", desc: "Arco potente e preciso, que acerta a grande distância.", cost: 90, tier: "C", kind: "arma" },
  { id: "elixir", name: "Elixir de Vigor", desc: "Cura um ferimento grave e tira o cansaço de um dia.", cost: 80, tier: "C", kind: "item" },
  { id: "forca", name: "Força Sobre-humana", desc: "Músculos mais densos: levanta e golpeia como três homens.", cost: 160, tier: "B", kind: "habilidade", once: true },
  { id: "cavalo", name: "Montaria de Guerra", desc: "Um animal de montaria forte e leal, treinado para combate.", cost: 140, tier: "B", kind: "equipamento" },
  { id: "lamina-a", name: "Lâmina que Corta Aço", desc: "Uma arma que atravessa armaduras comuns como pano.", cost: 260, tier: "A", kind: "arma" },
  { id: "imortal", name: "Corpo Indomável", desc: "Uma vez por semana, um golpe mortal deixa você de pé com 1 de vida.", cost: 300, tier: "A", kind: "habilidade", once: true },
  { id: "rei", name: "Presença de Rei", desc: "Pessoas comuns obedecem uma ordem simples sua sem pensar. Não funciona em quem tem vontade forte.", cost: 480, tier: "S", kind: "habilidade", once: true },
  { id: "invocar", name: "Invocar Sombra Leal", desc: "Uma vez por dia, uma sombra de um inimigo abatido luta ao seu lado por uma cena.", cost: 520, tier: "S", kind: "habilidade", once: true },
];

export function defaultSystem() {
  return { enabled: true, name: "Sistema", points: 0, shop: DEFAULT_SYSTEM_SHOP.map((i) => ({ ...i })) };
}

// ── Baú semanal (semana do CALENDÁRIO DO JOGO, não da vida real) ──
export const CHEST_INTERVAL_DAYS = 7;

export const DEFAULT_CHEST_POOL = [
  { name: "Lâmina Afiada do Viajante", desc: "Uma arma simples e muito bem feita, comum neste mundo.", kind: "arma", tier: "E" },
  { name: "Reflexos Aguçados", desc: "Por uma cena por dia, você reage antes dos outros.", kind: "habilidade", tier: "E" },
  { name: "Pele Resistente", desc: "Cortes e pancadas leves doem menos e fecham mais rápido.", kind: "habilidade", tier: "E" },
  { name: "Armadura Leve Reforçada", desc: "Proteção discreta que não atrapalha os movimentos.", kind: "equipamento", tier: "E" },
  { name: "Instinto de Perigo", desc: "Um aviso no corpo quando há uma armadilha por perto.", kind: "habilidade", tier: "E" },
  { name: "Frasco de Cura Maior", desc: "Cura um ferimento grave uma única vez.", kind: "item", tier: "E" },
  { name: "Espada de Aço Temperado", desc: "Arma de soldado veterano, que não lasca nem entorta.", kind: "arma", tier: "D" },
  { name: "Golpe Preciso", desc: "Uma vez por cena, seu ataque acerta exatamente onde você mira.", kind: "habilidade", tier: "D" },
  { name: "Botas do Caminhante", desc: "Andar o dia todo não cansa nem machuca seus pés.", kind: "equipamento", tier: "D" },
  { name: "Cota de Malha Leve", desc: "Protege o tronco de cortes sem fazer barulho.", kind: "equipamento", tier: "C" },
  { name: "Visão Noturna", desc: "Você enxerga no escuro como se fosse fim de tarde.", kind: "habilidade", tier: "C" },
  { name: "Lança do Veterano", desc: "Lança equilibrada que mantém três inimigos à distância.", kind: "arma", tier: "C" },
  { name: "Regeneração Acelerada", desc: "Ferimentos graves fecham em dois dias em vez de semanas.", kind: "habilidade", tier: "B" },
  { name: "Lâmina Rúnica", desc: "Uma arma marcada que fere até criaturas que o aço comum não fere.", kind: "arma", tier: "B" },
  { name: "Armadura de Campeão", desc: "Armadura completa e leve que só um mestre armeiro faria.", kind: "equipamento", tier: "B" },
  { name: "Passo Relâmpago", desc: "Uma vez por cena, você cruza dez passos num piscar de olhos.", kind: "habilidade", tier: "A" },
  { name: "Arma Lendária do Mundo", desc: "Uma arma famosa deste mundo, que todos acham perdida.", kind: "arma", tier: "A" },
  { name: "Elixir da Segunda Vida", desc: "Traz você de volta de um ferimento mortal, uma única vez.", kind: "item", tier: "A" },
  { name: "Domínio das Sombras", desc: "Sua sombra se move sozinha e luta ao seu lado por uma cena por dia.", kind: "habilidade", tier: "S" },
  { name: "Arma do Monarca", desc: "Uma arma que cresce em poder junto com você.", kind: "arma", tier: "S" },
  { name: "Corpo do Monarca", desc: "Corpo mais alto e forte; venenos e doenças comuns não pegam mais em você.", kind: "habilidade", tier: "S" },
];

/** Pontos extras que vêm no baú, por rank. */
export const CHEST_BONUS_POINTS = { E: 0, D: 10, C: 25, B: 50, A: 90, S: 150 };

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

function chestPool(sys, { withDefaults = true } = {}) {
  const pool = (Array.isArray(sys?.chestPool) ? sys.chestPool : [])
    .map((i) => ({ name: clip(i.name, 60), desc: clip(i.desc, 240), kind: POOL_KINDS.includes(i.kind) ? i.kind : "item", tier: SYSTEM_RANKS.includes(i.tier) ? i.tier : "E" }))
    .filter((i) => i.name);
  if (!withDefaults) return pool;
  return pool.length ? pool : DEFAULT_CHEST_POOL;
}

/** Sorteia uma recompensa do rank do jogador: primeiro do mundo, depois a padrão do rank, depois a do rank abaixo. */
export function pickChestReward(sys, rnd = Math.random) {
  const s = normalizeSystem(sys);
  const rank = s?.rank || "E";
  const got = new Set((s?.purchased || []).map((p) => p.name));
  const world = chestPool(sys, { withDefaults: false });
  const defaults = DEFAULT_CHEST_POOL;
  const pick = (list) => list[Math.floor(rnd() * list.length) % list.length];
  const of = (list, tier) => list.filter((i) => i.tier === tier && !got.has(i.name));
  const order = SYSTEM_RANKS.slice(0, SYSTEM_RANKS.indexOf(rank) + 1).reverse();
  for (const tier of order) {
    const fromWorld = of(world, tier);
    if (fromWorld.length) return pick(fromWorld);
    const fromDefault = of(defaults, tier);
    if (fromDefault.length) return pick(fromDefault);
  }
  const any = [...world, ...defaults].filter((i) => SYSTEM_RANKS.indexOf(i.tier || "E") <= SYSTEM_RANKS.indexOf(rank));
  return pick(any.length ? any : defaults);
}

/** Abre o baú: recompensa do rank atual (evitando repetir), pontos extras e marca o dia do jogo. */
export function openChest(sys, day = 0, rnd = Math.random, now = Date.now()) {
  const s = normalizeSystem(sys);
  if (!s) return { ok: false, error: "Sistema desligado." };
  const status = chestStatus(sys, day);
  if (!status.ready) return { ok: false, error: `O próximo baú abre em ${formatWaitDays(status.daysLeft)} na história.` };
  const reward = { ...pickChestReward(sys, rnd) };
  reward.tier = reward.tier || "E";
  const bonus = CHEST_BONUS_POINTS[s.rank] || 0;
  if (bonus) { s.points += bonus; reward.bonusPoints = bonus; }
  s.purchased.push({ id: `bau-${now.toString(36)}`, name: reward.name, at: now });
  s.log.push(`baú Rank ${s.rank} (dia ${Math.floor(Number(day) || 0)}): ${reward.name}${bonus ? ` +${bonus} pts` : ""}`);
  s.log = s.log.slice(-20);
  return { ok: true, system: { ...s, lastChestDay: Math.floor(Number(day) || 0) }, reward };
}

export function chestNote(reward) {
  return `O jogador abriu o baú semanal do Sistema (Rank ${reward.tier || "E"}) e ganhou de graça: "${reward.name}" (${reward.kind}) — ${reward.desc}.${reward.bonusPoints ? ` Também ganhou ${reward.bonusPoints} pontos do Sistema.` : ""} A recompensa já foi guardada no inventário (ou nas habilidades, se for habilidade). Na próxima resposta, mostre a notificação do Sistema e faça a recompensa aparecer de forma coerente com o mundo e a cena. O Sistema, a loja e o baú são invisíveis para todos: nenhum personagem vê a tela, as notificações ou o item surgindo do nada. O item aparece de forma discreta e plausível (já está na bolsa, no bolso ou à mão quando o jogador procura), e ninguém comenta a origem. Uma habilidade se manifesta como talento do próprio jogador.`;
}

// ── Loja gerada para o mundo ──
export function systemGenRequest(camp = {}) {
  return {
    systemPrompt: "Você cria a loja e o baú de recompensas do 'Sistema' (estilo manhwa Solo Leveling) para uma aventura de RPG. Responda só com JSON válido, sem texto fora dele, no formato {\"shop\":[{\"name\":\"\",\"desc\":\"\",\"cost\":0,\"tier\":\"E\",\"once\":false,\"kind\":\"arma|habilidade|equipamento|item\"}],\"chest\":[{\"name\":\"\",\"desc\":\"\",\"tier\":\"E\",\"kind\":\"arma|habilidade|equipamento|item\"}]}. A loja tem 14 itens: 6 do Rank E (10–40 pontos), 4 do Rank D (30–70), 2 do Rank C (60–120), 1 do Rank B (100–200) e 1 do Rank A (180–320), misturando habilidades, armas, equipamentos e itens. O baú tem 8 recompensas: 3 do Rank E, 2 do D, 2 do C e 1 do B. Em português. Tudo deve pertencer a ESTE mundo e época (armas, magias, tecnologia, moedas e costumes locais). Vantagens com limite claro, mais fortes quanto maior o rank; nada que resolva a história. Descrições de uma frase.",
    content: JSON.stringify({ epoca: eraPromptLines(camp, { short: true })[0] || "", mundo: camp.world, contexto: String(camp.worldBg || "").slice(0, 1500), personagem: camp.charName, habilidades: camp.charSkills }),
  };
}

export function parseGeneratedSystem(text) {
  try {
    const cleaned = String(text || "").replace(/```json\s*/gi, "").replace(/```/g, "");
    const json = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
    const tierOf = (i) => (SYSTEM_RANKS.includes(String(i.tier || "").toUpperCase()) ? String(i.tier).toUpperCase() : "E");
    const shop = (json.shop || []).map((i, n) => ({ id: `w${n}-${clip(i.name, 20).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: clip(i.name, 60), desc: clip(i.desc, 240), cost: Math.min(600, Math.max(5, Math.floor(Number(i.cost) || 20))), once: Boolean(i.once), tier: tierOf(i), kind: POOL_KINDS.includes(i.kind) ? i.kind : undefined })).filter((i) => i.name && i.desc).slice(0, 16);
    const chest = (json.chest || []).map((i) => ({ name: clip(i.name, 60), desc: clip(i.desc, 240), kind: POOL_KINDS.includes(i.kind) ? i.kind : "item", tier: tierOf(i) })).filter((i) => i.name && i.desc).slice(0, 10);
    return shop.length >= 3 ? { shop, chest } : null;
  } catch {
    return null;
  }
}

// ── Recompensas vão direto para o inventário ou para as habilidades ──
const SKILL_HINT = /(por uma cena|uma vez por|aprende|t[ée]cnica|habilidade|olhar|sabe |entende|fala |lembra|move-se|reage|corre |prende a respira|nunca escorrega|detecta|percebe|enxerga|ningu[ée]m lembra|reflexos|instinto|pele resistente|sorte|cresce|mais alto|altura|m[úu]scul|corpo de|olhos de|voz de|beleza|aura|rejuvenesc)/i;

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

// ── Carrinho: guardar itens para comprar depois ──
export function addToCart(sys, itemId) {
  const s = normalizeSystem(sys);
  if (!s) return { ok: false, error: "Sistema desligado." };
  if (s.cart.some((i) => i.id === itemId)) return { ok: false, error: "Já está no carrinho." };
  const item = s.shop.find((i) => i.id === itemId) || s.searchResults.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Item não existe." };
  if (s.cart.length >= 20) return { ok: false, error: "O carrinho está cheio (20 itens)." };
  return { ok: true, system: { ...s, cart: [...s.cart, item] }, item };
}

export function removeFromCart(sys, itemId) {
  const s = normalizeSystem(sys);
  if (!s) return sys;
  return { ...s, cart: s.cart.filter((i) => i.id !== itemId) };
}

/** Total do carrinho com o desconto do rank (só itens liberados e não comprados). */
export function cartSummary(sys) {
  const s = normalizeSystem(sys);
  if (!s) return { items: [], total: 0, buyable: [] };
  const owned = new Set(s.purchased.map((p) => p.id));
  const buyable = s.cart.filter((i) => isUnlocked(i, s.rank) && !(i.once && owned.has(i.id)));
  const total = buyable.reduce((sum, i) => sum + priceFor(i, s.rank), 0);
  return { items: s.cart, buyable, total, enough: s.points >= total };
}

// ── Ajuste direto (pedido no "Falar com o Mestre") ──
export const RANK_MIN_LEVEL = { E: 1, D: 5, C: 10, B: 15, A: 20, S: 30 };

/**
 * Ajusta pontos, nível do Sistema e/ou rank mantendo tudo coerente:
 * pontos ganhos ↔ meta ↔ nível ↔ rank. Devolve { system, levelsGained, rankBefore, rankAfter }.
 */
export function adjustSystem(sys, { points = 0, levels = 0, rank = null } = {}) {
  const s = normalizeSystem(sys);
  if (!s) return null;
  const rankBefore = s.rank;
  const levelBefore = s.level;
  if (points) {
    s.points = Math.max(0, s.points + points);
    if (points > 0) s.earned += points;
  }
  if (levels > 0) s.earned = Math.max(s.earned, metaFor(s.level + levels - 1));
  if (levels < 0) {
    s.level = Math.max(1, s.level + levels);
    s.earned = Math.min(s.earned, metaFor(s.level) - 1);
  }
  const target = SYSTEM_RANKS.includes(rank) ? rank : null;
  if (target && SYSTEM_RANKS.indexOf(target) > SYSTEM_RANKS.indexOf(s.rank)) {
    s.earned = Math.max(s.earned, metaFor(RANK_MIN_LEVEL[target] - 1));
  } else if (target && SYSTEM_RANKS.indexOf(target) < SYSTEM_RANKS.indexOf(s.rank)) {
    const nextRank = SYSTEM_RANKS[SYSTEM_RANKS.indexOf(target) + 1];
    const maxLevel = RANK_MIN_LEVEL[nextRank] - 1;
    s.level = Math.min(s.level, maxLevel);
    s.earned = Math.min(s.earned, metaFor(s.level) - 1);
    s.rank = target;
  }
  while (s.earned >= metaFor(s.level) && s.level < 99) s.level += 1;
  const byLevel = rankForLevel(s.level);
  if (!target || SYSTEM_RANKS.indexOf(target) >= SYSTEM_RANKS.indexOf(rankBefore)) {
    if (SYSTEM_RANKS.indexOf(byLevel) > SYSTEM_RANKS.indexOf(s.rank)) s.rank = byLevel;
  }
  const parts = [];
  if (points) parts.push(`${points > 0 ? "+" : ""}${points} pontos`);
  if (s.level !== levelBefore) parts.push(`nível ${s.level}`);
  if (s.rank !== rankBefore) parts.push(`Rank ${s.rank}`);
  s.log = [...s.log, `Mestre: ${parts.join(", ") || "ajuste"}`].slice(-20);
  return { system: s, levelsGained: s.level - levelBefore, rankBefore, rankAfter: s.rank };
}
