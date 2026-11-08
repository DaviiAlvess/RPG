// ── Diretor de drama ──
// Dá forma de HISTÓRIA à campanha: uma ameaça que avança sozinha, atos com virada,
// e momentos marcados (dilema, passado do personagem, segredo vazando, promessa cobrada).
// Cada turno recebe no máximo UM momento extra, para o prompt não virar uma lista de tarefas.

const clip = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

// ── Ameaça com relógio ──
export const THREAT_STAGES = [
  null,
  { label: "Sinais", show: "só sinais: um boato, um rastro, alguém com medo de falar o nome" },
  { label: "Movimento", show: "a ameaça age em público: alguém some, um lugar cai, um aliado é pressionado" },
  { label: "Golpe", show: "a ameaça atinge algo que o jogador valoriza ou de que depende — um preço real" },
  { label: "Hora final", show: "o plano está quase completo: o confronto não pode mais ser adiado" },
];
export const THREAT_EVERY = 8;

export function asThreat(value) {
  if (!value || typeof value !== "object" || !String(value.name || "").trim()) return null;
  return {
    name: clip(value.name, 60),
    goal: clip(value.goal, 160),
    stage: Math.max(1, Math.min(4, Math.floor(Number(value.stage) || 1))),
    lastTurn: Math.max(0, Math.floor(Number(value.lastTurn) || 0)),
    defeated: Boolean(value.defeated),
  };
}

/** Lê [AMEACA:quem|o que quer], [AMEACA_RECUA] e [AMEACA_VENCIDA]. */
export function parseThreatTags(text, current = null, turn = 0) {
  let threat = asThreat(current);
  const raw = String(text || "");
  const set = raw.match(/\[AMEA[CÇ]A:\s*([^\]|]+)(?:\|([^\]]*))?\]/i);
  if (set) {
    const name = clip(set[1], 60);
    const goal = clip(set[2], 160);
    if (!threat || threat.defeated) threat = { name, goal, stage: 1, lastTurn: turn, defeated: false };
    else threat = { ...threat, name: name || threat.name, goal: goal || threat.goal };
  }
  if (threat && /\[AMEA[CÇ]A_RECUA\]/i.test(raw)) threat = { ...threat, stage: Math.max(1, threat.stage - 1), lastTurn: turn };
  if (threat && /\[AMEA[CÇ]A_VENCIDA\]/i.test(raw)) threat = { ...threat, defeated: true };
  return threat;
}

export const stripDramaTags = (text) => String(text || "").replace(/\[AMEA[CÇ]A(?:_RECUA|_VENCIDA)?(?::[^\]]*)?\]/gi, "");

/** A ameaça avança neste turno? (o jogador passou várias cenas sem freá-la) */
export function threatDue(camp = {}) {
  const t = asThreat(camp.threat);
  if (!t || t.defeated || t.stage >= 4 || camp.ending) return false;
  return (Number(camp.turn) || 0) - t.lastTurn >= THREAT_EVERY;
}

/** Estado depois da resposta: se era a vez de avançar e o jogador não freou, sobe um estágio. */
export function advanceThreat(camp = {}, threatAfterTags, turn) {
  const t = asThreat(threatAfterTags);
  if (!t || t.defeated) return t;
  const before = asThreat(camp.threat);
  const pushedBack = before && t.stage < before.stage;
  if (threatDue(camp) && !pushedBack) return { ...t, stage: Math.min(4, t.stage + 1), lastTurn: turn };
  return t;
}

function threatLines(camp, { short }) {
  const t = asThreat(camp.threat);
  const turn = Number(camp.turn) || 0;
  if (!t) {
    if (turn < 3 || camp.ending) return [];
    return [`AMEAÇA CENTRAL: a história ainda não tem um opositor claro. Nas próximas cenas, revele QUEM ou O QUE se opõe ao jogador (pessoa, facção, força) e o que quer, e emita [AMEACA:quem|o que quer] uma única vez. Em universo conhecido, use um conflito real da obra.`];
  }
  if (t.defeated) return [];
  const st = THREAT_STAGES[t.stage];
  const due = threatDue(camp);
  const base = `AMEAÇA: ${t.name}${t.goal ? ` — quer ${t.goal}` : ""}. Estágio ${t.stage}/4 (${st.label}).`;
  const rules = short ? "" : " Ela age mesmo sem o jogador olhar. Se o jogador atrapalhar o plano de verdade, emita [AMEACA_RECUA]; se for derrotada de vez, [AMEACA_VENCIDA].";
  if (due) {
    const next = THREAT_STAGES[Math.min(4, t.stage + 1)];
    return [`${base} ⚠ A AMEAÇA AVANÇA NESTA RESPOSTA para "${next.label}": ${next.show}. Mostre UMA consequência concreta pelos sentidos do jogador (sem narrar de fora).${rules}`];
  }
  return [`${base} Nível de presença agora: ${st.show}.${rules}`];
}

// ── Atos ──
export function actOf(camp = {}) {
  const turn = Number(camp.turn) || 0;
  const chapters = Array.isArray(camp.chapters) ? camp.chapters.length : 0;
  const t = asThreat(camp.threat);
  if (camp.ending) return { id: "epilogo", label: "Epílogo" };
  if (t && !t.defeated && t.stage >= 4) return { id: "climax", label: "Clímax", goal: "tudo converge: o confronto com a ameaça, sem mais adiar. Cada escolha agora tem peso de desfecho." };
  if (turn >= 45 || chapters >= 4 || (t && t.stage >= 3)) return { id: "crise", label: "Ato III — Crise", goal: "as apostas estão no máximo. Perdas reais, aliados postos à prova, nenhuma saída fácil. Feche fios antigos em vez de abrir muitos novos." };
  if (turn >= 12 || chapters >= 1) return { id: "complicacoes", label: "Ato II — Complicações", goal: "o caminho fica mais difícil e mais pessoal: obstáculos, alianças com preço, alguém que não é o que parece." };
  return { id: "gancho", label: "Ato I — Gancho", goal: "estabeleça o que o personagem quer, o que está em jogo e um primeiro aliado ou rival marcante." };
}

/** A virada do meio da história: uma revelação que muda o sentido do que o jogador sabia (uma vez). */
export function midpointDue(camp = {}) {
  if (camp.midpointTurn || camp.ending) return false;
  const turn = Number(camp.turn) || 0;
  const chapters = Array.isArray(camp.chapters) ? camp.chapters.length : 0;
  return turn >= 28 || chapters >= 3;
}

// ── Momentos marcados (no máximo um por turno) ──
const sentences = (text) => String(text || "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);

export function personalHook(camp = {}) {
  const pool = [...sentences(camp.charBg), ...sentences(camp.charLore)].slice(0, 12);
  if (!pool.length) return "";
  const turn = Number(camp.turn) || 0;
  return clip(pool[Math.floor(turn / 9) % pool.length], 220);
}

function pick(list, turn, every) {
  const arr = (Array.isArray(list) ? list : []).filter(Boolean);
  return arr.length ? clip(arr[Math.floor(turn / every) % arr.length], 200) : "";
}

/** Qual momento extra este turno recebe (ou null). */
export function dramaBeat(camp = {}, { busy = false } = {}) {
  const turn = Number(camp.turn) || 0;
  if (busy || turn < 4 || camp.ending) return null;
  if (midpointDue(camp)) {
    const secret = pick(camp.worldState?.secrets, turn, 1);
    return { id: "virada", line: `VIRADA DO MEIO DA HISTÓRIA (uma vez): nesta resposta, revele algo que MUDA O SENTIDO do que o jogador sabia — um aliado com outra agenda, a ameaça com um motivo inesperado, o objetivo que era outro${secret ? ` (pode partir deste segredo: ${secret})` : ""}. A revelação vem de algo que o jogador vê ou ouve, não de um narrador explicando. Depois, a história segue com outro peso.` };
  }
  if (turn % 11 === 0) return { id: "dilema", line: "DILEMA (este turno): coloque o jogador diante de uma escolha entre duas coisas que ele valoriza — não dá para ter as duas, e nenhuma é a resposta certa (salvar alguém ou cumprir a missão, verdade ou lealdade, ganho ou princípio). Mostre o que se perde em cada lado e espere a decisão dele." };
  const hook = turn % 9 === 4 ? personalHook(camp) : "";
  if (hook) return { id: "passado", line: `O PASSADO DO PERSONAGEM VOLTA (este turno): traga para a cena algo ligado a isto da história dele — "${hook}" — como pessoa, objeto, notícia, cheiro ou lembrança que pesa numa decisão. Não explique o passado inteiro; deixe uma ponta.` };
  const promise = turn % 10 === 2 ? pick(camp.worldState?.promises, turn, 10) : "";
  if (promise) return { id: "promessa", line: `PROMESSA COBRADA (este turno): alguém lembra ou cobra isto — "${promise}". Cumprir, adiar ou quebrar tem consequência.` };
  const secret = turn % 13 === 7 ? pick(camp.worldState?.secrets, turn, 13) : "";
  if (secret) return { id: "segredo", line: `UM SEGREDO VAZA UM POUCO (este turno): uma ponta disto aparece na cena, sem revelar tudo — "${secret}". Um detalhe que não bate, uma frase cortada, alguém que muda de assunto.` };
  return null;
}

// ── Camadas: o que toda resposta precisa ter para parecer completa ──
export const SCENE_LAYERS = [
  "CAMADAS DE UMA RESPOSTA COMPLETA (não é um relatório; é uma cena):",
  "1) CONSEQUÊNCIA — o que a ação do jogador mudou, de imediato e concreto.",
  "2) PESSOAS COM VONTADE PRÓPRIA — quem está na cena quer algo NESTE momento; diz menos do que sente (subtexto) e um gesto entrega o resto. NPCs importantes têm desejo, medo e algo que escondem.",
  "3) O MUNDO QUE IMPORTA — um detalhe do lugar que pesa na trama ou na próxima escolha (não decoração); o mundo lembra o que já aconteceu (ferimentos, boatos, estragos, olhares).",
  "4) O FIO PARA FRENTE — uma pergunta, oportunidade ou pressão nova que puxa a próxima cena.",
  "Em combate e perseguição, comprima: fique com 1 e 4. Em calma e conversa, as quatro cabem. Profundidade vem de camadas, não de adjetivos.",
];

/** Linhas do diretor de drama para o prompt. */
export function dramaPromptLines(camp = {}, { short = false, busy = false } = {}) {
  const act = actOf(camp);
  const lines = [];
  if (act.goal) lines.push(`ARCO DA HISTÓRIA — ${act.label}: ${act.goal}`);
  lines.push(...threatLines(camp, { short }));
  const beat = dramaBeat(camp, { busy: busy || threatDue(camp) });
  if (beat) lines.push(beat.line);
  if (!short) lines.push(...SCENE_LAYERS);
  else lines.push("Resposta completa: consequência do que o jogador fez, alguém na cena com vontade própria e subtexto, um detalhe do mundo que importa e um fio puxando a próxima cena.");
  return short ? [lines.join(" ")] : lines;
}

/** Campos que a resposta atualiza na campanha. */
export function dramaPatch(camp = {}, raw = "", nextTurn = 0) {
  const tagged = parseThreatTags(raw, camp.threat, nextTurn);
  const threat = advanceThreat(camp, tagged, nextTurn);
  const patch = { threat: threat || null };
  if (midpointDue(camp)) patch.midpointTurn = nextTurn;
  return patch;
}
