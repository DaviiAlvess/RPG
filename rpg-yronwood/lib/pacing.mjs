// ─── Ritmo da história ────────────────────────────────────────────────
// A cada turno, identifica o tipo de cena e diz ao Mestre o tempo certo:
// ritmo das frases, tamanho da resposta, o que mostrar e como fechar.
// Também empurra a história quando ela fica parada e atende os botões
// "Avançar" e "Detalhar" do jogador.

const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ── Comandos de ritmo do jogador ──
export const PACE_COMMANDS = {
  avancar: {
    prefix: "[RITMO: avançar]",
    display: "Você deixa o tempo correr até o próximo momento que importa.",
    request: "O jogador pediu para AVANÇAR: pule o tempo morto até o próximo momento relevante da história. Não decida nada importante por ele no caminho.",
  },
  detalhar: {
    prefix: "[RITMO: detalhar]",
    display: "Você para e presta atenção em tudo ao redor.",
    request: "O jogador pediu para DETALHAR: desacelere e descreva com calma o lugar e as pessoas presentes, sem avançar o tempo nem tomar decisões por ele.",
  },
};

export function buildPaceMessage(kind) {
  const cmd = PACE_COMMANDS[kind];
  return cmd ? `${cmd.prefix} ${cmd.request}` : "";
}

export function paceCommandOf(text) {
  const t = String(text || "").trim();
  for (const [kind, cmd] of Object.entries(PACE_COMMANDS)) if (t.startsWith(cmd.prefix)) return kind;
  return null;
}

export function paceDisplay(text) {
  const kind = paceCommandOf(text);
  return kind ? PACE_COMMANDS[kind].display : "";
}

// ── Tipos de cena ──
// factor: multiplica o tamanho escolhido nos Ajustes (Curta/Equilibrada/Detalhada).
export const SCENES = {
  combate: {
    label: "Combate",
    factor: 0.6,
    rhythm: "frases curtas e secas, um golpe ou movimento por frase; nada de descrever o cenário inteiro",
    focus: "resolva UMA troca: a ação do jogador e a reação imediata do inimigo (acerto, erro, preço). Mostre o impacto no corpo. Ferimento real gera [HP:-n].",
    ending: "pare no instante antes do próximo golpe ou quando o jogador precisa reagir",
  },
  perseguicao: {
    label: "Perseguição",
    factor: 0.6,
    rhythm: "frases curtas, verbos de movimento, fôlego curto",
    focus: "a distância muda neste turno (ganha ou perde terreno) e surge um obstáculo concreto do lugar (multidão, muro, beco, lama).",
    ending: "termine num obstáculo ou numa escolha de caminho",
  },
  suspense: {
    label: "Suspense",
    factor: 0.75,
    rhythm: "frases curtas com silêncio entre elas; os detalhes crescem aos poucos",
    focus: "um sinal concreto de perigo que aumenta (som, sombra, cheiro, algo fora do lugar). Adie a revelação um pouco, mas não esconda para sempre.",
    ending: "termine num sinal que exige uma decisão",
  },
  conversa: {
    label: "Conversa",
    factor: 0.8,
    rhythm: "a resposta são falas; entre elas, só reações curtas",
    focus: "quem ouviu responde primeiro, com intenção e subtexto (quer algo, esconde algo, tem pressa). Nada de resumo do narrador no lugar das pessoas.",
    ending: "termine numa fala, numa pergunta ou num silêncio carregado de quem está na conversa",
  },
  investigacao: {
    label: "Investigação",
    factor: 0.95,
    rhythm: "frases médias e precisas; mostre o objeto ou lugar de perto",
    focus: "recompense a busca com algo concreto e útil, mesmo pequeno. Se for uma descoberta real que aproxima da verdade, emita [PISTA:].",
    ending: "termine num detalhe que pede uma próxima ação",
  },
  exploracao: {
    label: "Exploração",
    factor: 1,
    rhythm: "frases variadas — algumas longas para o lugar respirar, algumas curtas para o que chama atenção",
    focus: "dê o clima do lugar com 2 ou 3 detalhes marcantes (luz, som, cheiro, gente) e UMA coisa que chama a atenção.",
    ending: "termine num ponto de interesse, sem forçar perigo",
  },
  viagem: {
    label: "Viagem e rotina",
    factor: 0.75,
    rhythm: "corte de cena: resumo rápido e depois cena viva",
    focus: "resuma o trajeto ou a espera em 1 a 3 frases, com UM detalhe memorável da passagem do tempo, e entre direto no próximo momento que importa (chegada, encontro, problema). Se passarem horas ou dias, emita [TIME_SKIP].",
    ending: "termine já dentro do próximo momento importante",
  },
  descanso: {
    label: "Descanso",
    factor: 0.9,
    rhythm: "lento, frases mais longas e calmas, sem crise artificial",
    focus: "um conforto simples (comida, calor, banho, sono) e, se houver aliado por perto, uma conversa em que ele revele algo pessoal.",
    ending: "termine num momento tranquilo ou num gancho sutil — não precisa de ameaça",
  },
  corte: {
    label: "Avançar",
    factor: 0.8,
    rhythm: "corte de cena: resumo rápido e depois cena viva",
    focus: "o jogador pediu para AVANÇAR. Em 1 ou 2 frases mostre o que passou no meio do caminho, sem decidir nada importante por ele, e abra direto no próximo momento relevante da história. Se passou tempo, emita [TIME_SKIP].",
    ending: "termine dentro do novo momento, com algo acontecendo",
  },
  contemplacao: {
    label: "Detalhar",
    factor: 1.25,
    rhythm: "devagar, frases longas e fluidas são bem-vindas",
    focus: "o jogador pediu para DETALHAR. Descreva o lugar e as pessoas com riqueza: 3 a 5 detalhes de sentidos diferentes, o que cada pessoa presente está fazendo e o que chama a atenção. Não avance o tempo nem tome decisões por ele.",
    ending: "termine devolvendo a cena ao jogador, sem empurrar uma crise",
  },
};

const PATTERNS = {
  combate: /\b(ataco|atacar|ataque|golpeio|golpear|golpe|corto|cortar|esfaqueio|apunhalo|estoco|atiro|atirar|disparo contra|luto|lutar|brigo|defendo|bloqueio|aparo|esquivo|desvio do golpe|soco|chuto|chute|saco a (espada|faca|adaga|arma|lamina|pistola)|desembainho|empunho|mato|matar|acerto|investida|derrubo|estrangulo)\b/,
  perseguicao: /\b(corro|correr|fujo|fugir|persigo|perseguir|disparo pela|disparo pelo|salto|pulo o|pulo a|escalo|galopo|acelero)\b/,
  viagem: /\b(viajo|viajamos|viajar|sigo para|seguimos para|vou ate|vamos ate|partimos|parto para|parto rumo|caminho ate|cavalgo ate|navegamos|zarpamos|pego a estrada|pegamos a estrada|atravessamos|volto para|retorno para|seguimos viagem|sigo viagem)\b/,
  descanso: /\b(descanso|descansar|durmo|dormir|acampo|acampamos|como algo|janto|almoco|tomo banho|espero ate|esperamos|relaxo|cuido dos ferimentos|me deito|deito|me sento para|recupero o folego|passo a noite)\b/,
  investigacao: /\b(examino|examinar|investigo|investigar|procuro|procurar|vasculho|leio|ler a|analiso|inspeciono|reviro|estudo|pesquiso|interrogo|comparo|verifico|apalpo|cheiro o|cheiro a)\b/,
  exploracao: /\b(entro|exploro|explorar|ando pelo|ando pela|caminho pelo|caminho pela|subo|desco|abro a porta|olho em volta|olho ao redor|atravesso|me aproximo de|sigo pelo|sigo pela)\b/,
};

const COMBAT_CONTEXT = /\b(lamina|espada|sangue|golpe|soco|flecha|tiro|disparo|ataca|investe|punhal|machado|lanca|garras|ferida|corte)\b/;

function isSpeaking(action) {
  const t = String(action || "");
  if (/["“«]/.test(t)) return true;
  return /^(digo|falo|respondo|pergunto|ordeno|grito|sussurro|exclamo|explico|conto|peco|insisto|ameaco|negocio|minto)\b/.test(norm(t));
}

const hasDialogue = (text) => /^\s*[\p{Lu}][\p{L}' -]{1,40}:\s*["“]/mu.test(String(text || ""));

/**
 * Tipo de cena deste turno.
 * action: o que o jogador acabou de fazer; lastGm: a última narração;
 * tension: 0–3; pace: "avancar" | "detalhar" | null.
 */
export function detectScene({ action = "", lastGm = "", tension = 0, pendingTest = false, pace = null } = {}) {
  if (pace === "avancar") return "corte";
  if (pace === "detalhar") return "contemplacao";
  const a = norm(action);
  let scene = null;
  if (PATTERNS.combate.test(a)) scene = "combate";
  else if (PATTERNS.perseguicao.test(a)) scene = "perseguicao";
  else if (PATTERNS.viagem.test(a)) scene = "viagem";
  else if (PATTERNS.descanso.test(a)) scene = "descanso";
  else if (isSpeaking(action)) scene = "conversa";
  else if (PATTERNS.investigacao.test(a)) scene = "investigacao";
  else if (PATTERNS.exploracao.test(a)) scene = "exploracao";

  const t = Math.max(0, Math.min(3, Number(tension) || 0));
  const gm = norm(lastGm);
  if (!scene) {
    if (t >= 2 && COMBAT_CONTEXT.test(gm)) scene = "combate";
    else if (t >= 2 || pendingTest) scene = "suspense";
    else if (hasDialogue(lastGm)) scene = "conversa";
    else scene = "exploracao";
  }
  // Com a tensão no máximo não dá para relaxar: calma vira suspense.
  if (t >= 3 && ["descanso", "viagem", "exploracao"].includes(scene)) scene = "suspense";
  return scene;
}

const BASE_WORDS = { short: [80, 140], balanced: [200, 320], rich: [300, 450] };
const round10 = (n) => Math.max(40, Math.round(n / 10) * 10);

/** Faixa de palavras desta cena, a partir do tamanho escolhido nos Ajustes. */
export function wordsFor(length = "balanced", scene = "exploracao") {
  const [lo, hi] = BASE_WORDS[length] || BASE_WORDS.balanced;
  const f = SCENES[scene]?.factor || 1;
  return [round10(lo * f), round10(hi * f)];
}

// ── História parada ──
export const STAGNATION_TURNS = 3;

export function stagnationTurns(camp = {}) {
  const turn = Number(camp.turn) || 0;
  const last = Number(camp.lastProgressTurn) || 0;
  return Math.max(0, turn - last);
}

/** Algo mudou de verdade nesta resposta? (calculado a partir das tags do Mestre) */
export function didProgress(flags = {}) {
  return Object.values(flags).some(Boolean);
}

function lastGmText(disp) {
  const list = Array.isArray(disp) ? disp : [];
  for (let i = list.length - 1; i >= 0; i--) if (list[i]?.type === "gm" && list[i].text) return list[i].text;
  return "";
}

/**
 * Bloco "TEMPO DESTA CENA" para o fim do prompt do Mestre.
 * action: texto do jogador neste turno (pode ser um comando de ritmo).
 */
export function pacingDirection(camp = {}, { action = "", pendingTest = false, short = false } = {}) {
  const pace = paceCommandOf(action);
  const scene = detectScene({
    action: pace ? "" : action,
    lastGm: lastGmText(camp.disp),
    tension: camp.tension,
    pendingTest,
    pace,
  });
  const s = SCENES[scene];
  const [lo, hi] = wordsFor(camp.narration?.length, scene);
  const stuck = stagnationTurns(camp);
  const lines = [
    `TEMPO DESTA CENA — ${s.label.toUpperCase()}. Isto decide o ritmo e o tamanho DESTA resposta e prevalece sobre as regras gerais de ritmo e tamanho; não muda a câmera em "você", a agência do jogador nem as proibições.`,
    `- Ritmo: ${s.rhythm}.`,
    `- O que mostrar: ${s.focus}`,
    `- Tamanho: cerca de ${lo}–${hi} palavras.`,
    `- Fechamento: ${s.ending}. Varie o fim de uma resposta para outra: nem toda resposta termina com alguém te encarando à espera da sua palavra.`,
    "- Variação: frases curtas para impacto e frases mais longas para lugar e emoção. Um texto todo picado cansa tanto quanto um todo arrastado.",
  ];
  if (stuck >= STAGNATION_TURNS && (Number(camp.turn) || 0) >= STAGNATION_TURNS && !pace) {
    lines.push(`- A HISTÓRIA ESTÁ PARADA há ${stuck} respostas sem nada novo (pista, decisão, mudança de lugar ou de tensão). Nesta resposta algo PRECISA mudar de forma concreta: uma complicação, alguém chega, uma pequena revelação, uma oportunidade — ou corte para o próximo momento relevante.`);
  }
  return short ? lines.join(" ") : lines.join("\n");
}
