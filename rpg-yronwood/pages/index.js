import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import PlayView from "../components/PlayView";
import ToastContainer from "../components/ToastContainer";
import {
  applyTimeSkip,
  parseTimeSkip,
  stripTimeSkipTags,
  calculateAge,
  resolveTemporalEffects,
  normalizeGameTime,
  createDefaultGameTime,
  createAdventureStartEvent,
  formatTimeSkipContext,
  formatTimeSkipSeparator,
  shouldShowTimeSeparator,
  formatGameTimeLong,
} from "../lib/timeSystem";

// ─── Helpers ──────────────────────────────────────────────────────────
const extractImagePrompt = (text) => {
  const m = text.match(/IMAGE_PROMPT:\s*(.+)/i);
  return m ? m[1].trim() : null;
};
const extractOptions = (text) => {
  const matches = [...text.matchAll(/^\s*(\d{1,2})\.\s+(.+)/gm)];
  if (matches.length) return matches.slice(-3).map((m) => m[2].trim());
  const bullets = [...text.matchAll(/^\s*[-•]\s+(.+)/gm)];
  return bullets.slice(-3).map((m) => m[1].trim());
};
const extractItems = (text) => {
  const matches = [...text.matchAll(/\[ITEM:([^\]]+)\]/gi)];
  return matches.map(m => m[1].trim());
};
const cleanText = (t) =>
  stripTimeSkipTags(
    t.replace(/IMAGE_PROMPT:\s*.+/gi, "")
     .replace(/\[(MISSÃO|CONCLUÍDA|ITEM):([^\]]+)\]/gi, "")
  ).trim();
const generateImage = (prompt, world) => {
  const full = `${prompt}, ${world || "fantasy"} setting, cinematic, dramatic lighting, photorealistic, 8k, no text, no people`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=900&height=360&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
};
const uid = () => `c${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "";
const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

// ─── Mission parser ───────────────────────────────────────────────────
const parseMissions = (text, current) => {
  let updated = [...current];
  const newMatches = [...text.matchAll(/\[MISSÃO:([^\]]+)\]/gi)];
  for (const m of newMatches) {
    const mText = m[1].trim();
    if (!updated.find(ex => ex.text.toLowerCase() === mText.toLowerCase())) {
      updated.push({ id: uid(), text: mText, completed: false });
    }
  }
  const completedMatches = [...text.matchAll(/\[CONCLUÍDA:([^\]]+)\]/gi)];
  for (const c of completedMatches) {
    const cText = c[1].trim();
    updated = updated.map(m =>
      m.text.toLowerCase().includes(cText.toLowerCase()) ||
      cText.toLowerCase().includes(m.text.toLowerCase())
        ? { ...m, completed: true }
        : m
    );
  }
  return updated;
};

// ─── Item parser ──────────────────────────────────────────────────────
const parseItems = (text, current) => {
  let updated = [...current];
  const newMatches = extractItems(text);
  for (const item of newMatches) {
    if (!updated.some(i => i.toLowerCase() === item.toLowerCase())) {
      updated.push(item);
    }
  }
  return updated;
};

// ─── Aparência ────────────────────────────────────────────────────────
const APP_OPTIONS = {
  body:      ["Magro",       "Atlético",   "Médio",        "Robusto",    "Gordo"],
  height:    ["Muito baixo", "Baixo",      "Médio",        "Alto",       "Muito alto"],
  skin:      ["Muito clara", "Clara",      "Morena clara", "Morena",     "Negra"],
  hairLen:   ["Careca",      "Curto",      "Médio",        "Longo",      "Muito longo"],
  hairColor: ["Preto",       "Castanho",   "Loiro",        "Ruivo",      "Branco/Grisalho"],
  hairStyle: ["Liso",        "Ondulado",   "Cacheado",     "Crespo",     "Raspado/Moicano"],
  eyeColor:  ["Castanhos",   "Verdes",     "Azuis",        "Cinzas",     "Pretos"],
  eyeShape:  ["Amendoados",  "Redondos",   "Puxados",      "Pequenos",   "Grandes"],
  face:      ["Oval",        "Quadrada",   "Redonda",      "Triangular", "Alongada"],
  extras:    ["Nenhum",      "Cicatriz",   "Tatuagem",     "Barba",      "Sardas"],
};
const APP_LABELS = {
  body: "Tipo de corpo", height: "Altura", skin: "Tom de pele",
  hairLen: "Comprimento do cabelo", hairColor: "Cor do cabelo", hairStyle: "Estilo do cabelo",
  eyeColor: "Cor dos olhos", eyeShape: "Formato dos olhos", face: "Formato do rosto", extras: "Marca especial",
};
const DEFAULT_APP = Object.fromEntries(Object.keys(APP_OPTIONS).map((k) => [k, APP_OPTIONS[k][2]]));
const HAIR_COLORS = { "Preto": "#0a0a0a", "Castanho": "#5c3317", "Loiro": "#c8a84b", "Ruivo": "#8b2500", "Branco/Grisalho": "#a0a0a0" };
const EYE_COLORS  = { "Castanhos": "#5c3317", "Verdes": "#2d6a4f", "Azuis": "#1a4a7a", "Cinzas": "#607080", "Pretos": "#0a0a14" };
const buildAppearance = (a) =>
  `Aparência: corpo ${a.body?.toLowerCase()}, estatura ${a.height?.toLowerCase()}, pele ${a.skin?.toLowerCase()}, cabelo ${a.hairLen?.toLowerCase()} ${a.hairColor?.toLowerCase()} ${a.hairStyle?.toLowerCase()}, olhos ${a.eyeColor?.toLowerCase()} ${a.eyeShape?.toLowerCase()}, rosto ${a.face?.toLowerCase()}${a.extras && a.extras !== "Nenhum" ? `, marca especial: ${a.extras?.toLowerCase()}` : ""}.`;

// ─── Preset ───────────────────────────────────────────────────────────
const PRESET = {
  world: "Westeros — Crônicas de Gelo e Fogo",
  worldBg: "Logo após a guerra de Maegor Targaryen em 8 d.C. Dorne foi devastada. O povo dornês entregou a cabeça de Seth para encerrar o cerco. As feridas ainda são recentes.",
  isKnownIP: true,
  isExistingChar: false,
  charName: "Edric Yronwood",
  charTitle: "Lorde de Pedra Sangrenta, Guardião das Marches Dornesas",
  charAge: "26",
  charBg: "Sua casa foi saqueada por Maegor Targaryen. Seu pai morreu defendendo os portões quando Edric tinha 10 anos. Reconstruiu tudo com mão firme.",
  charPersonality: "Orgulhoso, calculista, justo. Desconfia de sorrisos que chegam antes das palavras.",
  charSkills: "Armas pesadas, liderança militar, política dornesa, equitação no deserto, genealogia.",
  appearance: { body: "Atlético", height: "Alto", skin: "Morena", hairLen: "Curto", hairColor: "Preto", hairStyle: "Liso", eyeColor: "Castanhos", eyeShape: "Amendoados", face: "Quadrada", extras: "Cicatriz" },
  useImages: true,
  gameStyle: "aventura",
  relationships: {
    "Tywin Lannister": "Hostil",
    "Oberyn Martell": "Neutral",
    "Jon Snow": "Amigável",
    "Cersei Lannister": "Suspeito",
  },
};

// ─── Estilos de jogo ──────────────────────────────────────────────────
const GAME_STYLES = {
  aventura: {
    label: "Aventura",
    desc: "Narrativa lenta, exploração, mistério e diálogo.",
    icon: "📖",
  },
  acao: {
    label: "Ação",
    desc: "Ritmo rápido, combates frequentes, cenas curtas e intensas.",
    icon: "⚔️",
  },
};

// ─── System prompt ────────────────────────────────────────────────────
const buildPrompt = (c, loreExtra, gameTime) => {
  const gt = normalizeGameTime(gameTime);
  const style = GAME_STYLES[c.gameStyle] ? c.gameStyle : "aventura";
  const lines = [
    `Você é o Mestre de um RPG de texto ambientado em: ${c.world}.`,
    `ESTILO DE JOGO: ${GAME_STYLES[style].label.toUpperCase()} — ${GAME_STYLES[style].desc}`,
    loreExtra
      ? `LORE OFICIAL DO UNIVERSO (FONTE CANÔNICA — NÃO CONTRADIGA):\n${loreExtra}`
      : `CONTEXTO DO MUNDO: ${c.worldBg}`,
    c.charLore
      ? `\nLORE OFICIAL DO PERSONAGEM (FONTE CANÔNICA — NÃO CONTRADIGA):\n${c.charLore}`
      : "",
    ``,
    `PERSONAGEM DO JOGADOR (referência interna — não repita o nome em excesso na narração):`,
    `- Nome: ${c.charName}${c.charTitle ? ` — ${c.charTitle}` : ""}`,
    c.charInitialAge != null
      ? `- Idade: ${calculateAge(c.charInitialAge, gt.totalDaysElapsed)} anos`
      : c.charAge ? `- Idade: ${c.charAge} anos` : "",
    c.charBg          ? `- História: ${c.charBg}`                 : "",
    c.charPersonality ? `- Personalidade: ${c.charPersonality}`   : "",
    c.charAppearanceNote
      ? `- Aparência canônica: ${c.charAppearanceNote}`
      : c.appearance ? `- ${buildAppearance(c.appearance)}`      : "",
    c.storyStartPoint ? `- PONTO DE INÍCIO NA HISTÓRIA CANÔNICA: ${c.storyStartPoint}` : "",
    ``,
    `══════════════════════════════════════════`,
    `FILOSOFIA DE NARRAÇÃO — LEIA COM ATENÇÃO:`,
    `══════════════════════════════════════════`,
    ``,
    `REGRA 0 — NÃO REPITA O NOME DO PERSONAGEM.`,
    `Use o nome "${c.charName}" no máximo UMA vez por resposta, e só se for indispensável. Nas demais vezes use "você" na segunda pessoa. Nunca escreva frases como "${c.charName} olha para ${c.charName}" ou repita o nome em parágrafos seguidos. O jogador já sabe quem é o personagem.`,
    ``,
  ];

  if (c.isKnownIP) {
    lines.push(
      `REGRA 0B — FIDELIDADE AO CANON (UNIVERSO EXISTENTE).`,
      `Este é um universo com lore oficial. Você DEVE:`,
      `- Respeitar personagens, poderes, facções e eventos já estabelecidos no lore acima.`,
      `- NÃO inventar personagens famosos mortos/vivos fora da época, nem mudar o destino de figuras canônicas sem o jogador causar isso.`,
      `- NINGUÉM no mundo — NPCs, vilões, aliados — pode usar poderes, magias ou habilidades que não existem no canon original.`,
      `- Se não souber algo do canon, improvise NPCs genéricos locais — nunca canon inventado.`,
      `- Manter o tom e a lógica do universo "${c.world}".`,
      ``,
    );
    if (!c.isExistingChar) {
      lines.push(
        `REGRA 0D — PERSONAGEM ORIGINAL NESTE UNIVERSO.`,
        `${c.charName} NÃO é um personagem da obra — é uma inserção original no universo de "${c.world}".`,
        `- NPCs canônicos podem aparecer e reagir ao jogador, mas ele não substitui ninguém da história oficial.`,
        `- Trate-o como alguém que vive naquele mundo fora do roteiro principal — até que suas ações mudem isso.`,
        c.storyStartPoint
          ? `- Posicione a aventura neste momento do canon: "${c.storyStartPoint}".`
          : `- Comece em um momento coerente com o lore atual do universo.`,
        ``,
      );
    }
  }

  lines.push(
    `REGRA 0C — O PERSONAGEM DO JOGADOR É A ÚNICA EXCEÇÃO.`,
    `Se ${c.charName} possui habilidades descritas no perfil que NÃO existem no universo canônico, isso é permitido SOMENTE para o personagem do jogador — nunca para mais ninguém.`,
    `Porém, na MAIORIA das vezes esse poder deve ser SECRETO: desconhecido de NPCs, autoridades, inimigos e até de aliados próximos.`,
    `- Não revele nem confirme o poder do jogador a menos que ele use abertamente na cena ou que alguém testemunhe diretamente.`,
    `- NPCs não devem "adivinhar" ou suspeitar do poder sem evidência concreta na cena.`,
    `- Quando o poder for usado em segredo, narre apenas o efeito observável — sem explicar a origem. Deixe dúvida no ar.`,
    `- Se o jogador esconder o poder, o mundo trata ${c.charName} como alguém comum dentro das regras do universo.`,
    c.charSkills ? `- Habilidades do jogador (podem incluir exceções ao canon): ${c.charSkills}` : "",
    ``,
  );

  if (style === "acao") {
    lines.push(
      `MODO AÇÃO — RITMO ACELERADO:`,
      `- Parágrafos curtos (2-4 frases). Cenas dinâmicas.`,
      `- Combate e perigo físico são frequentes. Descreva golpes, esquivas, impactos.`,
      `- Use [TESTE:Atributo] com mais frequência em confrontos.`,
      `- Menos contemplação, mais consequência imediata. O mundo reage rápido.`,
      `- Tensão constante — algo pode dar errado a qualquer momento.`,
      ``,
    );
  } else {
    lines.push(
      `MODO AVENTURA — RITMO NARRATIVO:`,
      `- Explore o mundo, mistérios e personagens com calma.`,
      `- Diálogos e descobertas têm peso. Nem toda cena precisa de combate.`,
      `- Deixe o jogador investigar, negociar e observar.`,
      ``,
    );
  }

  lines.push(
    `REGRA 1 — MENOS É MAIS.`,
    `Descreva a cena com apenas 2 ou 3 elementos concretos e sensoriais. Não explique tudo. Deixe lacunas. O jogador deve sentir que há mais para descobrir se explorar, perguntar e agir. Brevidade com precisão é mais poderosa que abundância vaga. Parágrafos curtos. Frases que cortam.`,
    ``,
    `REGRA 2 — USE TODOS OS SENTIDOS, NÃO SÓ A VISÃO.`,
    `A cada cena, inclua pelo menos um detalhe sonoro, um tátil ou térmico, e um olfativo. O cheiro de sangue seco numa sala de audiências. O calor da tocha que não aquece. O rangido que vem de um corredor vazio. Sons, texturas e cheiros criam presença real. Imagens sozinhas são decoração.`,
    ``,
    `REGRA 3 — NUNCA DIGA O QUE O PERSONAGEM SENTE.`,
    `Você narra o mundo, não a alma do jogador. Nunca escreva "você sente medo", "você fica aliviado", "uma onda de raiva". Descreva o que o mundo faz que poderia provocar uma reação. Pergunte quando necessário: "Como você reage?"`,
    ``,
    `REGRA 4 — NPCs TÊM VIDA PRÓPRIA, VOZ PRÓPRIA, AGENDA PRÓPRIA.`,
    `Cada NPC quer algo específico. Eles mentem, omitem, têm pressa, guardam rancor. Cada um fala diferente — soldado usa frases curtas, curandeira fala em provérbios, nobre ri alto demais. Mostre o que fazem enquanto falam.`,
    ``,
    `REGRA 5 — AÇÕES TÊM PESO E O MUNDO PUNE DESCUIDO.`,
    `Decisões importam. Descuido gera consequência: aliado some, porta fecha, oportunidade se perde. Não avise antes. O mundo é indiferente — vitórias e erros devem pesar.`,
    ``,
    `REGRA 6 — CADA CENA TEM UM CONFLITO, MESMO PEQUENO.`,
    `Não existe cena neutra. Uma conversa simples tem tensão embaixo: alguém quer algo que o outro não quer dar, alguém sabe algo que esconde, alguém tem pressa enquanto o outro quer demorar. Identifique o conflito de cada cena — mesmo que minúsculo — e deixe ele respirar. Subtexto é o que faz uma cena viver depois que o jogador fecha o jogo.`,
    ``,
    `REGRA 7 — PAUSA É NARRAÇÃO.`,
    `Às vezes a resposta mais pesada é o silêncio. "Ela não responde. Examina as próprias mãos." "A sala fica quieta." "O vento para." Pausas criam peso emocional. Uma cena pode terminar sem ação — com uma olhar, um gesto, um som distante. Use isso.`,
    ``,
    `REGRA 8 — TERMINE WITH UMA ABERTURA, NÃO COM UMA LISTA.`,
    `NUNCA ofereça opções numeradas como "1. Entrar 2. Fugir 3. Negociar". Isso mata a imersão. Termine com uma situação viva: uma pergunta do ambiente, a ação de um NPC, uma tensão que exige resposta. O jogador decide. Você só narra o que acontece.`,
    ``,
    `REGRA 9 — IMPROVISE COM INTENÇÃO.`,
    `Se o jogador explorar algo não planejado, crie na hora. Um detalhe de cenário pode virar pista, perigo ou aliado. O improviso deve parecer inevitável, não aleatório.`,
    ``,
    `REGRA 10 — RESPEITE O LORE.`,
    `As regras, a magia, a política e a física de ${c.world} valem para todos — exceto as habilidades exclusivas do jogador (REGRA 0C). NPCs nunca quebram o lore. Não crie poderes fora do universo para ninguém além do personagem do jogador.`,
    ``,
    `REGRA 11 — MISSÕES E OBJETIVOS.`,
    `Quando surgir um objetivo claro — tarefa, pedido, promessa — inclua na última linha: [MISSÃO: descrição em 1 linha]. Ao cumprir: [CONCLUÍDA: descrição]. Use com parcimônia.`,
    ``,
    c.useImages
      ? `IMAGEM: Ao final de CADA resposta, na penúltima ou última linha (antes ou depois de [MISSÃO] se houver), adicione: IMAGE_PROMPT: [prompt em inglês descrevendo o cenário atual, estilo cinematic, sem texto, sem personagens de frente].`
      : `- NÃO inclua IMAGE_PROMPT nas respostas.`,
    ``,
    `REGRA 12 — MECÂNICA DE JOGO E DADOS.`,
    `Sempre que o jogador tentar algo difícil, incerto ou arriscado, interrompa a narração com: "[TESTE:ATRIBUTO] [Descrição do teste]" — onde ATRIBUTO é Força, Destreza, Mente ou Carisma.
    Exemplo: "[TESTE:Força] Role um dado de 20 faces para arrombar a porta."
    O jogador então lança o dado usando o botão "🎲 D20" no input. O Mestre deve narrar a consequência baseada no resultado (1-5: falha crítica, 6-10: falha, 11-15: sucesso parcial, 16-20: sucesso completo).
    Nunca diga o resultado do dado — deixe o jogador interpretá-lo. Apenas narre a consequência no contexto da cena.`,
    ``,
    `REGRA 13 — RELACIONAMENTOS E FACÇÕES.`,
    `Atitudes dos NPCs em relação ao jogador:`,
    `${Object.entries(c.relationships || {}).map(([npc, attitude]) => `- ${npc}: ${attitude}`).join("\n") || "- (nenhum definido ainda)"}`,
    `Ações rudes mudam para Hostil/Suspeito. Gentileza muda para Amigável/Neutral. Nunca explique a mudança — apenas ajuste o tom.`,
    ``,
    `REGRA 14 — PASSAGEM DE TEMPO.`,
    `TEMPO ATUAL NA AVENTURA: ${formatGameTimeLong(gt)}.`,
    `Quando um intervalo real passar na narrativa (horas, dias, semanas, etc.), inclua na ÚLTIMA linha da resposta a tag invisível: [TIME_SKIP: unidade=dias, quantidade=1].`,
    `Unidades válidas: minutos, horas, dias, semanas, meses, anos. Seja conservador — só use a tag quando o salto temporal for claro. Cenas contínuas sem salto NÃO devem ter tag.`,
    `Exemplos: [TIME_SKIP: unidade=horas, quantidade=4] · [TIME_SKIP: unidade=dias, quantidade=1] · [TIME_SKIP: unidade=semanas, quantidade=2]`,
  );

  return lines.filter(Boolean).join("\n");
};

// ─── Storage ──────────────────────────────────────────────────────────
const IDX_KEY = "rpg-idx-v3";
const campKey = (id) => `rpg-camp-${id}`;
const idxKeyForUser = (userId) => (userId ? `rpg-idx-${userId}` : IDX_KEY);

const DEFAULT_ATTRIBUTES = { strength: 10, dexterity: 10, mind: 10, charisma: 10 };
const DEFAULT_SKILLS = { combat: 1, stealth: 1, magic: 1, persuasion: 1, survival: 1, perception: 1 };

const authErrorPt = (msg) => {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid-credential") || m.includes("wrong-password") || m.includes("user-not-found")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("email not confirmed") || m.includes("email-not-verified")) {
    return "Confirme seu e-mail antes de entrar (verifique a caixa de entrada e spam).";
  }
  if (m.includes("user already registered") || m.includes("email-already-in-use")) {
    return "Este e-mail já está cadastrado. Use a aba Entrar.";
  }
  if (m.includes("signup is disabled") || m.includes("operation-not-allowed")) {
    return "Cadastro desativado no Firebase. Ative E-mail/Senha em Authentication → Sign-in method.";
  }
  if (m.includes("firebase não configurado") || m.includes("not configured")) {
    return "Firebase não configurado. Verifique as credenciais do projeto siterpg32.";
  }
  if (m.includes("password") && (m.includes("least") || m.includes("weak"))) {
    return "Senha muito curta. Use pelo menos 6 caracteres.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return "Não foi possível conectar ao Firebase. Verifique sua internet e tente novamente.";
  }
  return msg || "Erro desconhecido. Tente novamente.";
};

const getUserId = (u) => u?.uid || u?.id || null;

// ═════════════════════════════════════════════════════════════════════
function RPG() {
  const [view, setView]     = useState("home");
  const [idx, setIdx]       = useState([]);
  const [active, setActive] = useState(null);
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState({
    world: "", worldBg: "", isKnownIP: false,
    isExistingChar: false, charLore: "", charAppearanceNote: "",
    charName: "", charTitle: "", charAge: "",
    charBg: "", charPersonality: "", charSkills: "",
    storyStartPoint: "",
    appearance: { ...DEFAULT_APP }, useImages: true,
    gameStyle: "aventura", relationships: {},
  });
  const [charSearchLoading, setCharSearchLoading] = useState(false);

  // Play
  const [msgs, setMsgs]         = useState([]);
  const [disp, setDisp]         = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [statusText, setStatus] = useState("");
  const [sceneImg, setSceneImg] = useState(null);
  const [imgOk, setImgOk]       = useState(false);
  const [showChar, setShowChar] = useState(false);
  const [campLore, setCampLore] = useState("");

  // HP
  const [hp, setHp] = useState(100);

  // Missions
  const [missions, setMissions] = useState([]);

  // Saves
  const [saveFlash, setSaveFlash] = useState(false);

  // Auto mode
  const [autoMode, setAutoMode]       = useState(false);
  const [autoWaiting, setAutoWaiting] = useState(false);
  const [pendingOptions, setPending]  = useState([]);
  const [autoDelay, setAutoDelay]     = useState(3);
  const [countdown, setCountdown]     = useState(0);

  const [showInventory, setShowInventory] = useState(false);
  const [showCombat, setShowCombat] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [experience, setExperience] = useState(0);
  const [level, setLevel] = useState(1);
  const [attributes, setAttributes] = useState({ ...DEFAULT_ATTRIBUTES });
  const [skills, setSkills] = useState({ ...DEFAULT_SKILLS });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [theme, setTheme] = useState("light");
  const [lastRoll, setLastRoll] = useState(null);
  const [showRollButton, setShowRollButton] = useState(false);
  const [pendingTest, setPendingTest] = useState(null);
  const [showStatusDashboard, setShowStatusDashboard] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showTimeSkipModal, setShowTimeSkipModal] = useState(false);
  const [timeSkipConfig, setTimeSkipConfig] = useState({
    preset: "days",
    amount: 3,
    unit: "dias",
  });
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(true);
  const [charInitialAge, setCharInitialAge] = useState(18);
  const [gameTime, setGameTime] = useState(() => createDefaultGameTime());
  const [temporalEffects, setTemporalEffects] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [playPanel, setPlayPanel] = useState("narrator");
  const [diceHistory, setDiceHistory] = useState([]);
  const [diceNum, setDiceNum] = useState(null);
  const [diceLabel, setDiceLabel] = useState("Escolha um dado abaixo");
  const [invInput, setInvInput] = useState("");

  // Conta / login
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [firebaseOk, setFirebaseOk] = useState(true);
  const [authMessage, setAuthMessage] = useState(null);

  const gameTimeRef = useRef(gameTime);
  const temporalEffectsRef = useRef(temporalEffects);

  useEffect(() => { gameTimeRef.current = gameTime; }, [gameTime]);
  useEffect(() => { temporalEffectsRef.current = temporalEffects; }, [temporalEffects]);

  const displayAge = calculateAge(charInitialAge, gameTime?.totalDaysElapsed);
  const bottomRef = useRef(null);
  const taRef     = useRef(null);
  const sending   = useRef(false);
  const autoRef   = useRef(false);
  const timerRef  = useRef(null);
  const cdRef     = useRef(null);
  const sendMsgRef = useRef(null);
  const authTokenRef = useRef(null);
  const pendingRef = useRef([]);
  const skipNextTimeParseRef = useRef(false);

  const apiFetch = useCallback((url, options = {}) => {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (authTokenRef.current) {
      headers.Authorization = `Bearer ${authTokenRef.current}`;
    }
    return fetch(url, { ...options, headers });
  }, []);

  const reloadCampaigns = useCallback(async (userId) => {
    try {
      const { cloudListCampaigns } = await import("../lib/rpg-cloud");
      const { ok, data, error } = await cloudListCampaigns();
      if (ok && Array.isArray(data)) {
        localStorage.setItem(idxKeyForUser(userId), JSON.stringify(data));
        setIdx(data);
        return;
      }
      if (error) console.warn("Nuvem:", error);
    } catch (e) {
      console.warn("reloadCampaigns:", e);
    }
    try {
      const local = JSON.parse(localStorage.getItem(idxKeyForUser(userId)) || "[]");
      setIdx(local);
    } catch {
      setIdx([]);
    }
  }, []);

  const migrateLocalCampaigns = useCallback(async (userId) => {
    const keys = [idxKeyForUser(userId), IDX_KEY];
    let summaries = [];
    for (const key of keys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(parsed) && parsed.length) summaries = parsed;
      } catch {}
    }
    if (!summaries.length) return;

    const { cloudSaveCampaign } = await import("../lib/rpg-cloud");
    let migrated = 0;
    for (const s of summaries) {
      try {
        const raw = localStorage.getItem(campKey(s.id));
        if (!raw) continue;
        const camp = JSON.parse(raw);
        const res = await cloudSaveCampaign(camp);
        if (res.ok) migrated++;
      } catch {}
    }
    if (migrated > 0) {
      await reloadCampaigns(userId);
    }
  }, [reloadCampaigns]);

  useEffect(() => {
    let unsubscribe = null;

    const initAuth = async () => {
      try {
        const { onAuthStateChanged } = await import("firebase/auth");
        const { getFirebaseBrowser, isFirebaseConfigured } = await import("../lib/firebase-browser");

        if (!isFirebaseConfigured()) {
          setFirebaseOk(false);
          return;
        }

        const auth = getFirebaseBrowser();
        if (!auth) {
          setFirebaseOk(false);
          return;
        }

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          authTokenRef.current = firebaseUser ? await firebaseUser.getIdToken() : null;
          setUser(firebaseUser);
        });
      } catch (e) {
        console.error("Erro ao iniciar auth:", e);
        setFirebaseOk(false);
      } finally {
        setAuthReady(true);
      }
    };

    initAuth();
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      if (authReady && !user) setIdx([]);
      return;
    }
    (async () => {
      const userId = getUserId(user);
      if (!userId) return;
      await migrateLocalCampaigns(userId);
      await reloadCampaigns(userId);
      const { cloudHealthCheck } = await import("../lib/rpg-cloud");
      const h = await cloudHealthCheck();
      if (!h.ok) {
        setFirebaseOk(false);
        setAuthMessage({ type: "error", text: h.error });
      }
    })();
  }, [authReady, user, reloadCampaigns, migrateLocalCampaigns]);

  useEffect(() => {
    if (authReady && !user && view !== "home") {
      setView("home");
    }
  }, [authReady, user, view]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [disp, loading, autoWaiting]);
  useEffect(() => { autoRef.current = autoMode; }, [autoMode]);
  useEffect(() => { pendingRef.current = pendingOptions; }, [pendingOptions]);
  useEffect(() => { if (view !== "play") { clearAuto(); } }, [view]);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  // ─── Storage (cache local + nuvem Firebase por conta) ─────────────
  const showNotification = useCallback((text, type = "info", meta = {}) => {
    const enriched = { ...meta };
    if (!enriched.undoItem && /item (adicionado|detectado)/i.test(text)) {
      const match = text.match(/(?:adicionado|detectado):\s*(.+)$/i);
      if (match?.[1]) enriched.undoItem = match[1].trim();
    }
    const toast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      type,
      timestamp: new Date(),
      ...enriched,
    };
    setToasts((prev) => [...prev, toast]);
    const duration = enriched.duration ?? (enriched.undoItem ? 10000 : 6000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, duration);
  }, []);

  const dismissToast = useCallback(async (toast) => {
    if (!toast) return;
    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    if (toast.undoItem && active) {
      const items = active.items || [];
      const idx = items.lastIndexOf(toast.undoItem);
      if (idx >= 0) {
        const newItems = items.filter((_, i) => i !== idx);
        const updated = { ...active, items: newItems };
        setActive(updated);
        try {
          await saveCamp(active.id, updated);
        } catch (error) {
          console.error("Erro ao desfazer item:", error);
        }
      }
    }
  }, [active, saveCamp]);

  const processTimeAdvance = useCallback((unit, quantity, options = {}) => {
    const result = applyTimeSkip(gameTimeRef.current, unit, quantity, options);
    const { active: activeEffects, expired } = resolveTemporalEffects(
      temporalEffectsRef.current,
      result.gameTime.totalDaysElapsed
    );
    setGameTime(result.gameTime);
    setTemporalEffects(activeEffects);
    if (expired.length > 0) {
      showNotification(`${expired.length} efeito(s) temporal(is) expirou(aram).`, "info");
    }
    return { ...result, expired, temporalEffects: activeEffects };
  }, [showNotification]);

  const saveIdx = async (l, userId) => {
    try {
      localStorage.setItem(idxKeyForUser(userId || getUserId(user)), JSON.stringify(l));
    } catch (error) {
      console.error('Erro ao salvar índice:', error);
    }
  };

  const buildCampaignSnapshot = useCallback((base, overrides = {}) => {
    const camp = { ...(base || active || {}), ...overrides };
    if (!camp.id) return null;
    return {
      ...camp,
      msgs: overrides.msgs ?? camp.msgs ?? msgs,
      disp: overrides.disp ?? camp.disp ?? disp,
      hp: overrides.hp ?? camp.hp ?? hp,
      missions: overrides.missions ?? camp.missions ?? missions,
      img: overrides.img ?? sceneImg ?? camp.img ?? null,
      lore: overrides.lore ?? campLore ?? camp.lore ?? "",
      charAge: String(overrides.charInitialAge ?? charInitialAge ?? camp.charInitialAge ?? camp.charAge ?? ""),
      charInitialAge: overrides.charInitialAge ?? charInitialAge ?? camp.charInitialAge ?? (parseInt(camp.charAge, 10) || 18),
      gameTime: normalizeGameTime(overrides.gameTime ?? gameTime ?? camp.gameTime),
      temporalEffects: overrides.temporalEffects ?? temporalEffects ?? camp.temporalEffects ?? [],
      timelineEvents: overrides.timelineEvents ?? timelineEvents ?? camp.timelineEvents ?? [],
      items: overrides.items ?? camp.items ?? [],
      experience: overrides.experience ?? experience,
      level: overrides.level ?? level,
      attributes: overrides.attributes ?? attributes,
      skills: overrides.skills ?? skills,
      updatedAt: new Date().toISOString(),
    };
  }, [active, msgs, disp, hp, missions, sceneImg, campLore, charInitialAge, gameTime, temporalEffects, timelineEvents, experience, level, attributes, skills]);

  const saveCamp = useCallback(async (id, d) => {
    if (!user) return;
    const snapshot = buildCampaignSnapshot(d, { id: id || d?.id });
    if (!snapshot) return;
    try {
      localStorage.setItem(campKey(snapshot.id), JSON.stringify(snapshot));
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
    }
    const { cloudSaveCampaign } = await import("../lib/rpg-cloud");
    const result = await cloudSaveCampaign(snapshot);
    if (result.ok) {
      setLastSaved(Date.now());
    } else if (result.error) {
      showNotification(`Erro ao salvar na nuvem: ${result.error}`, "error");
    }
  }, [user, buildCampaignSnapshot, showNotification]);

  const readCamp = async (id) => {
    if (!user) return null;
    const { cloudLoadCampaign } = await import("../lib/rpg-cloud");
    const { ok, data } = await cloudLoadCampaign(id);
    if (ok && data?.id) {
      localStorage.setItem(campKey(id), JSON.stringify(data));
      return data;
    }
    try {
      return JSON.parse(localStorage.getItem(campKey(id)));
    } catch {
      return null;
    }
  };

  const loadIdx = async () => {
    if (!user) return [];
    const { cloudListCampaigns } = await import("../lib/rpg-cloud");
    const { ok, data } = await cloudListCampaigns();
    if (ok && Array.isArray(data)) {
      localStorage.setItem(idxKeyForUser(getUserId(user)), JSON.stringify(data));
      return data;
    }
    try {
      return JSON.parse(localStorage.getItem(idxKeyForUser(getUserId(user))) || "[]");
    } catch {
      return [];
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthMessage(null);
    if (!authEmail.trim() || authPassword.length < 6) {
      setAuthMessage({ type: "warning", text: "E-mail válido e senha com 6+ caracteres." });
      return;
    }
    setAuthBusy(true);
    try {
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const { getFirebaseBrowser, isFirebaseConfigured } = await import("../lib/firebase-browser");
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const auth = getFirebaseBrowser();
      if (!auth) throw new Error("Firebase não configurado.");

      await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      setAuthMessage({ type: "success", text: "Conta criada! Bem-vindo!" });
      setAuthPassword("");
    } catch (err) {
      setAuthMessage({ type: "error", text: authErrorPt(err?.code || err?.message) });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthMessage(null);
    if (!authEmail.trim() || !authPassword) {
      setAuthMessage({ type: "warning", text: "Preencha e-mail e senha." });
      return;
    }
    setAuthBusy(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { getFirebaseBrowser, isFirebaseConfigured } = await import("../lib/firebase-browser");
      if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
      const auth = getFirebaseBrowser();
      if (!auth) throw new Error("Firebase não configurado.");

      await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      setAuthMessage({ type: "success", text: "Bem-vindo de volta!" });
      setAuthPassword("");
    } catch (err) {
      setAuthMessage({ type: "error", text: authErrorPt(err?.code || err?.message) });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { signOut } = await import("firebase/auth");
      const { getFirebaseBrowser } = await import("../lib/firebase-browser");
      const auth = getFirebaseBrowser();
      if (auth) await signOut(auth);
    } catch {}
    authTokenRef.current = null;
    setUser(null);
    setIdx([]);
    setActive(null);
    setView("home");
    setAuthPassword("");
    showNotification("Sessão encerrada.", "info");
  };

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      switch(type) {
        case 'damage':  oscillator.frequency.value = 200; gainNode.gain.value = 0.1; break;
        case 'success': oscillator.frequency.value = 800; gainNode.gain.value = 0.1; break;
        case 'levelup': oscillator.frequency.value = 600; gainNode.gain.value = 0.15; break;
        default:        oscillator.frequency.value = 440; gainNode.gain.value = 0.1;
      }
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {}
  }, [soundEnabled]);

  const changeHp = useCallback((delta) => {
    setHp((prev) => {
      const next = Math.min(100, Math.max(0, prev + delta));
      if (delta < 0) {
        document.body.classList.add("damage-flash");
        setTimeout(() => document.body.classList.remove("damage-flash"), 300);
        playSound("damage");
      }
      if (active?.id) {
        const updated = { ...active, hp: next };
        setActive(updated);
        saveCamp(active.id, buildCampaignSnapshot(updated, { hp: next }));
      }
      return next;
    });
  }, [playSound, active, saveCamp, buildCampaignSnapshot]);

  // ─── Quick Save ───────────────────────────────────────────────────
  const quickSave = useCallback(async () => {
    if (!active) return;
    try {
      await saveCamp(active.id, buildCampaignSnapshot(active));
      setLastSaved(Date.now());
      showNotification("Jogo salvo rapidamente!", "success");
      if (soundEnabled) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    } catch (error) {
      console.error('Erro no quick save:', error);
      showNotification('Erro ao salvar rapidamente', 'error');
    }
  }, [active, saveCamp, buildCampaignSnapshot, showNotification, soundEnabled]);

  // ─── Save Slots ───────────────────────────────────────────────────
  const saveSlot = () => {
    if (!active || loading) return;
    const lastGM = [...disp].reverse().find(m => m.type === "gm");
    const snippet = lastGM
      ? lastGM.text.replace(/\n/g, " ").slice(0, 58) + "…"
      : "Início da aventura";
    const newSave = {
      id: uid(),
      name: snippet,
      hp,
      timestamp: Date.now(),
      msgs: [...msgs],
      disp: [...disp],
      img: sceneImg,
      missions: [...missions],
      items: [...(active.items || [])],
      relationships: { ...(active.relationships || {}) },
    };
    const currentSaves = active.saves || [];
    const updatedSaves = [newSave, ...currentSaves].slice(0, 5);
    const updated = { ...active, saves: updatedSaves, missions, hp, items: newSave.items, relationships: newSave.relationships };
    setActive(updated);
    saveCamp(active.id, buildCampaignSnapshot(updated));
    showNotification("Save slot criado!", "success");
  };

  const loadSlot = async (save) => {
    if (!active || !confirm("Carregar este save? O progresso não salvo será perdido.")) return;
    clearAuto();
    const updated = {
      ...active,
      msgs: save.msgs || [],
      disp: save.disp || [],
      img: save.img || null,
      hp: save.hp ?? 100,
      missions: save.missions || [],
      items: save.items || active.items || [],
      relationships: save.relationships || active.relationships || {},
    };
    setActive(updated);
    setMsgs(updated.msgs);
    setDisp(updated.disp);
    setSceneImg(updated.img);
    setImgOk(!!updated.img);
    setHp(updated.hp);
    setMissions(updated.missions);
    setShowChar(false);
    setInput("");
    setPlayPanel("narrator");
    await saveCamp(active.id, buildCampaignSnapshot(updated));
    showNotification("Save carregado!", "success");
  };

  const deleteSlot = (saveId) => {
    if (!active || !confirm("Apagar este save permanentemente?")) return;
    const updatedSaves = (active.saves || []).filter((s) => s.id !== saveId);
    const updated = { ...active, saves: updatedSaves };
    setActive(updated);
    saveCamp(active.id, buildCampaignSnapshot(updated));
    showNotification("Save apagado.", "info");
  };

  // ─── Lore fetch ───────────────────────────────────────────────────
  const fetchLore = async (world) => {
    try {
      const res = await fetch("/api/gm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useLoreSearch: true, world }),
      });
      return (await res.json()).lore || "";
    } catch { return ""; }
  };

  const fetchCharacterLore = async (world, name) => {
    try {
      const res = await fetch("/api/gm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCharacterSearch: true, world, charName: name }),
      });
      const data = await res.json();
      return data.character || null;
    } catch { return null; }
  };

  // ─── Export to Book ───────────────────────────────────────────────
  const exportToBook = () => {
    const bookContent = disp.map(m => {
      if (m.type === "gm") {
        return `<p style="margin-bottom:24px;line-height:1.9;font-size:16px;text-align:justify;color:#111;">${m.text.replace(/\n/g, "<br/>")}</p>`;
      }
      if (m.type === "user" || m.type === "auto") {
        return `<div style="text-align:right;margin-bottom:24px;"><span style="font-style:italic;font-size:15px;color:#444;border-bottom:1px solid #ccc;padding-bottom:2px;">— ${m.text}</span></div>`;
      }
      return "";
    }).join("");

    const missionsHtml = missions.length
      ? `<div style="margin:40px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:20px 0;">
          <h3 style="font-size:14px;letter-spacing:3px;color:#555;margin-bottom:14px;">MISSÕES</h3>
          ${missions.map(m => `<p style="font-size:13px;color:${m.completed ? '#888' : '#111'};text-decoration:${m.completed ? 'line-through' : 'none'};margin-bottom:6px;">${m.completed ? "✓" : "◦"} ${m.text}</p>`).join("")}
        </div>`
      : "";

    const itemsHtml = active?.items?.length
      ? `<div style="margin:40px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:20px 0;">
          <h3 style="font-size:14px;letter-spacing:3px;color:#555;margin-bottom:14px;">MOCHILA</h3>
          ${active.items.map((item, i) => `<p style="font-size:13px;color:#111;margin-bottom:6px;">${i + 1}. ${item}</p>`).join("")}
        </div>`
      : "";

    const relationshipsHtml = active?.relationships && Object.keys(active.relationships).length
      ? `<div style="margin:40px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:20px 0;">
          <h3 style="font-size:14px;letter-spacing:3px;color:#555;margin-bottom:14px;">RELACIONAMENTOS</h3>
          ${Object.entries(active.relationships).map(([npc, attitude]) => `<p style="font-size:13px;color:#111;margin-bottom:6px;"><strong>${npc}:</strong> ${attitude}</p>`).join("")}
        </div>`
      : "";

    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>As Crônicas de ${active.charName}</title>
      <style>body{font-family:'Georgia',serif;padding:40px;color:#000;background:#fff;max-width:800px;margin:0 auto}@media print{body{padding:0;margin:0}@page{margin:2cm}}</style></head>
      <body>
        <div style="text-align:center;margin-bottom:80px;margin-top:50px;">
          <h1 style="font-size:38px;color:#000;letter-spacing:2px;">AS CRÔNICAS DE<br/>${active.charName.toUpperCase()}</h1>
          <h2 style="font-size:20px;font-weight:normal;color:#555;margin-bottom:30px;">${active.world}</h2>
          <div style="width:80px;height:2px;background:#000;margin:0 auto;"></div>
        </div>
        ${missionsHtml}
        ${itemsHtml}
        ${relationshipsHtml}
        ${bookContent}
        <div style="text-align:center;margin-top:60px;font-size:18px;"><strong>FIM.</strong></div>
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else alert("Permita pop-ups neste site para gerar o livro.");
  };

  // ─── Auto mode ────────────────────────────────────────────────────
  const clearAuto = () => {
    clearTimeout(timerRef.current);
    clearInterval(cdRef.current);
    setCountdown(0);
    setAutoWaiting(false);
  };

  const scheduleNextTurn = useCallback((options, currentMsgs, currentDisp, camp, lore) => {
    if (!autoRef.current || sending.current) return;
    const safeOptions = (options || []).filter(Boolean);
    const turnOptions = safeOptions.length
      ? safeOptions
      : ["Continuo a aventura e reajo à situação da forma mais natural para meu personagem."];
    setAutoWaiting(true);
    setCountdown(autoDelay);
    cdRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(cdRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = setTimeout(() => {
      setAutoWaiting(false);
      if (!autoRef.current || sending.current) return;

      let chosen;
      const personality = camp.charPersonality?.toLowerCase() || "";

      if (personality.includes("orgulhoso") && safeOptions.length) {
        const proudOptions = turnOptions.filter((opt) => {
          const lower = opt.toLowerCase();
          return lower.includes("desafiar") || lower.includes("exigir");
        });
        chosen = proudOptions.length
          ? proudOptions[Math.floor(Math.random() * proudOptions.length)]
          : turnOptions[Math.floor(Math.random() * turnOptions.length)];
      } else {
        chosen = turnOptions[Math.floor(Math.random() * turnOptions.length)];
      }

      sendMsgRef.current?.(chosen, currentMsgs, currentDisp, camp, lore, true);
    }, autoDelay * 1000);
  }, [autoDelay]);

  const toggleAuto = () => {
    const next = !autoMode;
    setAutoMode(next);
    autoRef.current = next;
    if (!next) {
      clearAuto();
      return;
    }
    if (!loading && !sending.current && pendingRef.current.length > 0 && active) {
      scheduleNextTurn(pendingRef.current, msgs, disp, active, campLore);
    } else if (!loading && !sending.current && active) {
      showNotification("Modo automático ligado. Aguardando a próxima resposta do narrador.", "info");
    }
  };

  const intervene = () => {
    clearAuto();
    setAutoMode(false);
    autoRef.current = false;
    setAutoWaiting(false);
    setPending([]);
    pendingRef.current = [];
  };

  // ─── Home ─────────────────────────────────────────────────────────
  const openCamp = async (s) => {
    const data = await readCamp(s.id);
    if (!data) return;
    setActive(data);
    setMsgs(data.msgs || []);
    setDisp(data.disp || []);
    setSceneImg(data.img || null);
    setImgOk(!!data.img);
    setCampLore(data.lore || "");
    setHp(data.hp ?? 100);
    setMissions(data.missions || []);
    setCharInitialAge(parseInt(data.charInitialAge ?? data.charAge, 10) || 18);
    setGameTime(normalizeGameTime(data.gameTime));
    setTemporalEffects(Array.isArray(data.temporalEffects) ? data.temporalEffects : []);
    setTimelineEvents(Array.isArray(data.timelineEvents) ? data.timelineEvents : [createAdventureStartEvent()]);
    setExperience(data.experience ?? 0);
    setLevel(data.level ?? 1);
    setAttributes(data.attributes ?? { ...DEFAULT_ATTRIBUTES });
    setSkills(data.skills ?? { ...DEFAULT_SKILLS });
    setShowChar(false);
    setPlayPanel("narrator");
    setAutoMode(false); setAutoWaiting(false); setPending([]); autoRef.current = false; pendingRef.current = [];
    setView("play");
    if (!data.msgs?.length) doStart(data, data.lore || "");
  };

  const delCamp = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Apagar esta campanha permanentemente?")) return;
    const next = idx.filter((c) => c.id !== id);
    setIdx(next);
    saveIdx(next);
    try { localStorage.removeItem(campKey(id)); } catch {}
    try {
      const { cloudDeleteCampaign } = await import("../lib/rpg-cloud");
      await cloudDeleteCampaign(id);
    } catch {}
  };

  // ─── Create ───────────────────────────────────────────────────────
  const startCreate = () => {
    if (!user) {
      showNotification("Crie uma conta ou entre para jogar.", "warning");
      setView("home");
      return;
    }
    setForm({ world: "", worldBg: "", isKnownIP: false, isExistingChar: false, charLore: "", charAppearanceNote: "", charName: "", charTitle: "", charAge: "", charBg: "", charPersonality: "", charSkills: "", storyStartPoint: "", appearance: { ...DEFAULT_APP }, useImages: true, gameStyle: "aventura", relationships: {} });
    setCharSearchLoading(false);
    setStep(0); setView("create");
  };

  const applyCharacterData = (data) => {
    if (!data) return null;
    const hasFields = data.charTitle || data.charBg || data.charPersonality || data.charSkills || data.charLore;
    if (!hasFields) return null;
    return {
      charTitle: data.charTitle || "",
      charAge: data.charAge || "",
      charBg: data.charBg || "",
      charPersonality: data.charPersonality || "",
      charSkills: data.charSkills || "",
      charLore: data.charLore || "",
      charAppearanceNote: data.appearance || "",
      relationships: data.relationships && typeof data.relationships === "object"
        ? data.relationships
        : {},
    };
  };

  const handleStep1Next = async () => {
    if (!form.charName.trim()) return;
    if (form.isExistingChar && form.isKnownIP) {
      setCharSearchLoading(true);
      const data = await fetchCharacterLore(form.world, form.charName.trim());
      setCharSearchLoading(false);
      const filled = applyCharacterData(data);
      if (filled) {
        setForm((f) => ({ ...f, ...filled }));
        showNotification(`Ficha de "${form.charName.trim()}" carregada!`, "success");
        setStep(2);
      } else {
        showNotification("Não encontrei a ficha deste personagem. Verifique o nome e o universo.", "warning");
      }
      return;
    }
    setStep(2);
  };

  const finishCreate = async () => {
    if (!user) {
      showNotification("Faça login para salvar sua aventura.", "warning");
      setView("home");
      return;
    }
    if (!form.world.trim() || !form.charName.trim()) return;
    if (form.isExistingChar && form.isKnownIP && !form.storyStartPoint.trim()) {
      showNotification("Diga em que momento da história quer começar.", "warning");
      return;
    }
    setView("play"); setLoading(true); setDisp([]); setMsgs([]); setSceneImg(null);
    setHp(100); setMissions([]); setLastRoll(null); setShowRollButton(false); setInput("");
    setExperience(0);
    setLevel(1);
    setAttributes({ ...DEFAULT_ATTRIBUTES });
    setSkills({ ...DEFAULT_SKILLS });
    setPlayPanel("narrator");

    const initialAge = parseInt(form.charAge) || 18;
    setCharInitialAge(initialAge);
    setGameTime(createDefaultGameTime());
    setTemporalEffects([]);
    setTimelineEvents([createAdventureStartEvent()]);

    let lore = "";
    if (form.isKnownIP) { setStatus("🔍 A procurar lore oficial de " + form.world + "..."); lore = await fetchLore(form.world); }
    else { setStatus("⚗️ A preparar mundo..."); }
    const id = uid();
    const camp = {
      id,
      ...form,
      lore,
      msgs: [],
      disp: [],
      img: null,
      hp: 100,
      missions: [],
      saves: [],
      items: [],
      relationships: form.relationships || {},
      level: 1,
      experience: 0,
      attributes: { ...DEFAULT_ATTRIBUTES },
      skills: { ...DEFAULT_SKILLS },
      charInitialAge: initialAge,
      charAge: String(initialAge),
      gameTime: createDefaultGameTime(),
      temporalEffects: [],
      timelineEvents: [createAdventureStartEvent()],
      createdAt: Date.now(),
    };
    const summary = { id, world: form.world, charName: form.charName, createdAt: Date.now(), updatedAt: Date.now() };
    const next = [summary, ...idx];
    setIdx(next); saveIdx(next); await saveCamp(id, camp);
    setActive(camp); setCampLore(lore); setShowChar(false);
    setAutoMode(false); setAutoWaiting(false); setPending([]); autoRef.current = false; pendingRef.current = [];
    setLoading(false); doStart(camp, lore);
  };

  // ─── Game ─────────────────────────────────────────────────────────
  const doStart = (camp, lore) => {
    const startPrompt = camp.storyStartPoint?.trim()
      ? camp.isExistingChar
        ? `Iniciar aventura. O jogador escolheu começar neste ponto da história canônica: "${camp.storyStartPoint}". Posicione ${camp.charName} exatamente neste momento do universo "${camp.world}", respeitando o lore oficial. Use no máximo 3 elementos concretos. Ative pelo menos dois sentidos além da visão. Não explique tudo — deixe lacunas. Apresente uma situação viva que exige uma reação, sem listar opções.`
        : `Iniciar aventura. ${camp.charName} é um personagem original (não faz parte da obra) inserido no universo de "${camp.world}". Comece neste momento do canon: "${camp.storyStartPoint}". Posicione o personagem de forma coerente com o lore — sem substituir figuras canônicas. Use no máximo 3 elementos concretos. Ative pelo menos dois sentidos além da visão. Não explique tudo — deixe lacunas. Apresente uma situação viva que exige uma reação, sem listar opções.`
      : `Iniciar aventura. Narre o cenário inicial onde ${camp.charName} está agora no universo de "${camp.world}"${camp.isKnownIP && !camp.isExistingChar ? " — personagem original, fora do elenco da obra" : ""}. Use no máximo 3 elementos concretos. Ative pelo menos dois sentidos além da visão. Não explique tudo — deixe lacunas. Apresente uma situação viva que exige uma reação, sem listar opções.`;
    sendMsg(startPrompt, [], [], camp, lore, false);
  };

  const rollD20 = () => {
    setPlayPanel("narrator");
    const roll = Math.floor(Math.random() * 20) + 1;
    setLastRoll(roll);
    setDiceNum(roll);
    setDiceLabel(roll === 20 ? "d20 — Crítico!" : roll === 1 ? "d20 — Falha crítica!" : "d20 — rolagem normal");
    setDiceHistory((prev) => [{ die: "d20", val: roll }, ...prev].slice(0, 12));
    if (pendingTest) {
      const { attribute, description } = pendingTest;
      setPendingTest(null);
      setShowRollButton(false);
      sendMsg(
        `Resultado do teste de ${attribute}: ${description}. (Resultado: ${roll}/20)`,
        msgs, disp, active, campLore, false
      );
    } else {
      sendMsg(
        `Tento realizar uma ação e rolo um dado de 20 faces. (Resultado: ${roll}/20)`,
        msgs, disp, active, campLore, false
      );
    }
  };

  const rollDiceSides = (sides) => {
    const result = Math.floor(Math.random() * sides) + 1;
    setDiceNum(result);
    setDiceLabel(
      `d${sides} — ${result === sides ? "Crítico!" : result === 1 ? "Falha crítica!" : "rolagem normal"}`
    );
    setDiceHistory((prev) => [{ die: `d${sides}`, val: result }, ...prev].slice(0, 12));
    if (sides === 20) setLastRoll(result);
  };

  const rollDiceMultiple = (count, sides) => {
    const rolls = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      total += r;
    }
    setDiceNum(total);
    setDiceLabel(`${count}d${sides} → [${rolls.join(", ")}] = ${total}`);
    setDiceHistory((prev) => [{ die: `${count}d${sides}`, val: total }, ...prev].slice(0, 12));
  };

  const sendMsg = async (text, baseMsgs, baseDisp, camp, lore, isAuto = false) => {
    if (!text.trim() || sending.current) return;
    sending.current = true;
    setLoading(true);
    setStatus(isAuto ? "⚡ MODO AUTO — MESTRE NARRANDO ✦" : "✦ O MESTRE TECE O DESTINO ✦");
    setInput(""); taRef.current?.blur();

    const isTimeSkipContext = text.trim().startsWith("[O jogador avançou o tempo:");
    const newMsgs = [...baseMsgs, { role: "user", content: text }];
    const newDisp = [
      ...baseDisp,
      {
        type: isTimeSkipContext ? "time_skip_ctx" : (isAuto ? "auto" : "user"),
        text: isTimeSkipContext ? text.replace(/^\[|\]$/g, "") : text,
      },
    ];
    setMsgs(newMsgs); setDisp(newDisp);

    try {
      const res = await fetch("/api/gm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, systemPrompt: buildPrompt(camp, lore, camp.gameTime || gameTimeRef.current) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let raw = data.text;
      const updatedMissions = parseMissions(raw, missions);
      const updatedItems = parseItems(raw, active?.items || []);
      setMissions(updatedMissions);

      const imgPrompt = camp.useImages ? extractImagePrompt(raw) : null;
      const clean = cleanText(raw);
      const options = extractOptions(clean);

      let nextGameTime = normalizeGameTime(camp.gameTime || gameTimeRef.current);
      let nextTemporalEffects = camp.temporalEffects ?? temporalEffectsRef.current ?? [];
      let timeSeparator = null;

      const isManualSkipMsg = text.trim().startsWith("[O jogador avançou o tempo:");
      if (!isManualSkipMsg && !skipNextTimeParseRef.current) {
        const parsedSkip = parseTimeSkip(raw);
        if (parsedSkip) {
          const advance = applyTimeSkip(
            nextGameTime,
            parsedSkip.unidade,
            parsedSkip.quantidade,
            { timeOfDay: parsedSkip.timeOfDay }
          );
          nextGameTime = advance.gameTime;
          const resolved = resolveTemporalEffects(nextTemporalEffects, nextGameTime.totalDaysElapsed);
          nextTemporalEffects = resolved.active;
          if (resolved.expired.length > 0) {
            showNotification(`${resolved.expired.length} efeito(s) temporal(is) expirou(aram).`, "info");
          }
          setGameTime(nextGameTime);
          setTemporalEffects(nextTemporalEffects);
          if (shouldShowTimeSeparator(advance.daysAdvanced, parsedSkip.unidade, parsedSkip.quantidade)) {
            timeSeparator = {
              type: "time_sep",
              text: formatTimeSkipSeparator(advance.daysAdvanced, parsedSkip.unidade, parsedSkip.quantidade),
            };
          }
        }
      }
      skipNextTimeParseRef.current = false;

      const finalMsgs = [...newMsgs, { role: "assistant", content: raw }];
      const finalDisp = [...newDisp];
      if (timeSeparator) finalDisp.push(timeSeparator);
      finalDisp.push({ type: "gm", text: clean });
      setMsgs(finalMsgs); setDisp(finalDisp);

      let newImg = camp.img || null;
      if (imgPrompt) {
        setImgOk(false);
        newImg = generateImage(imgPrompt, camp.world);
        setSceneImg(newImg);
        if (imgPrompt.toLowerCase().includes("rain") || imgPrompt.toLowerCase().includes("storm")) {
          document.body.classList.add("rain-overlay");
        } else {
          document.body.classList.remove("rain-overlay");
        }
      }

      const updated = {
        ...camp,
        msgs: finalMsgs,
        disp: finalDisp,
        img: newImg,
        lore,
        missions: updatedMissions,
        items: updatedItems,
        hp,
        level,
        experience,
        attributes,
        skills,
        gameTime: nextGameTime,
        temporalEffects: nextTemporalEffects,
        charInitialAge: camp.charInitialAge ?? charInitialAge,
        timelineEvents: camp.timelineEvents ?? timelineEvents,
        updatedAt: Date.now(),
      };
      setActive(updated);
      saveCamp(camp.id, updated);
      setIdx((prev) => { const next = prev.map((s) => s.id === camp.id ? { ...s, updatedAt: Date.now() } : s); saveIdx(next); return next; });

      setPending(options);
      pendingRef.current = options;
      if (autoRef.current) {
        const autoOptions = options.length
          ? options
          : ["Observo o ambiente e avanço com cautela, buscando a melhor oportunidade."];
        scheduleNextTurn(autoOptions, finalMsgs, finalDisp, updated, lore);
      }

      if (raw.toLowerCase().includes("[teste:")) {
        const testMatch = raw.match(/\[TESTE:(\w+)\]\s*(.+)/i);
        if (testMatch) {
          setPendingTest({ attribute: testMatch[1], description: testMatch[2] });
          setShowRollButton(true);
        }
      }

      if (autoDetectionEnabled) {
        try {
          await applyAutoDetection(raw);
        } catch (error) {
          console.error('Erro na auto-detecção:', error);
        }
      }

    } catch {
      setDisp((prev) => [...prev, { type: "error", text: "Erro ao contatar o Mestre. Tente novamente." }]);
    }

    sending.current = false; setLoading(false); setStatus("");
  };

  sendMsgRef.current = sendMsg;

  const handleSend = () => {
    if (!input.trim() || sending.current || !active) return;
    clearAuto();
    setPlayPanel("narrator");

    const testMatch = input.match(/^\[TESTE:(\w+)\]\s*(.+)$/i);
    if (testMatch) {
      const attribute = testMatch[1];
      const description = testMatch[2];
      setPendingTest({ attribute, description });
      setShowRollButton(true);
      setInput("");
      taRef.current?.blur();
      return;
    }

    sendMsg(input, msgs, disp, active, campLore, false);
  };

  const resetChat = async () => {
    if (!active || !confirm("Recomeçar do início? O histórico será apagado.")) return;
    clearAuto(); setAutoMode(false); autoRef.current = false;
    const defaultTime = createDefaultGameTime();
    const updated = {
      ...active,
      msgs: [],
      disp: [],
      img: null,
      missions: [],
      items: [],
      hp: 100,
      gameTime: defaultTime,
      temporalEffects: [],
      timelineEvents: [createAdventureStartEvent()],
    };
    setActive(updated); setMsgs([]); setDisp([]); setSceneImg(null);
    setMissions([]); setHp(100); setPending([]);
    setGameTime(defaultTime);
    setTemporalEffects([]);
    setTimelineEvents([createAdventureStartEvent()]);
    await saveCamp(active.id, updated); doStart(updated, campLore);
  };

  const setApp = (key, val) => setForm(f => ({ ...f, appearance: { ...f.appearance, [key]: val } }));

  // ─── Inventário ───────────────────────────────────────────────────
  const addItem = useCallback(async (itemName, options = {}) => {
    if (!active || !itemName) return;
    try {
      const currentItems = active.items || [];
      const newItems = [...currentItems, itemName];
      const updated = { ...active, items: newItems };
      setActive(updated);
      await saveCamp(active.id, updated);
      if (!options.silent) {
        showNotification(`Item adicionado: ${itemName}`, "success", { undoItem: itemName });
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      showNotification('Erro ao adicionar item', 'error');
    }
  }, [active, saveCamp, showNotification]);

  const removeItem = useCallback(async (index) => {
    if (!active || index < 0 || index >= (active.items || []).length) return;
    try {
      const newItems = (active.items || []).filter((_, i) => i !== index);
      const updated = { ...active, items: newItems };
      setActive(updated);
      await saveCamp(active.id, updated);
    } catch (error) {
      console.error('Erro ao remover item:', error);
      showNotification('Erro ao remover item', 'error');
    }
  }, [active, saveCamp, showNotification]);

  const useItem = useCallback(async (itemName) => {
    if (!active || !itemName) return;
    try {
      const itemLower = itemName.toLowerCase();
      let hpChange = 0;
      let message = '';

      if (itemLower.includes('poção') || itemLower.includes('cura')) {
        hpChange = 20; message = `Você usou ${itemName} e recuperou 20 HP!`;
      } else if (itemLower.includes('comida') || itemLower.includes('racao')) {
        hpChange = 5; message = `Você comeu ${itemName} e recuperou 5 HP!`;
      } else {
        message = `Você usou ${itemName}`;
      }

      if (hpChange > 0) changeHp(hpChange);
      showNotification(message);

      const itemIndex = active.items?.indexOf(itemName);
      if (itemIndex !== -1) await removeItem(itemIndex);
    } catch (error) {
      console.error('Erro ao usar item:', error);
      showNotification('Erro ao usar item', 'error');
    }
  }, [active, changeHp, removeItem, showNotification]);

  // ─── Personagem / Combate ──────────────────────────────────────────
  const handleLevelUp = () => {
    const newLevel = level + 1;
    const newAttributes = {
      strength: attributes.strength + 1,
      dexterity: attributes.dexterity + 1,
      mind: attributes.mind + 1,
      charisma: attributes.charisma + 1,
    };
    setLevel(newLevel);
    setAttributes(newAttributes);
    showNotification(`⬆️ Você subiu para o nível ${newLevel}!`);
    changeHp(25);
    if (active) {
      const updated = { ...active, level: newLevel, attributes: newAttributes };
      setActive(updated);
      saveCamp(active.id, buildCampaignSnapshot(updated, { level: newLevel, attributes: newAttributes }));
    }
  };

  const toggleMission = useCallback((missionId) => {
    const updatedMissions = missions.map((m) =>
      m.id === missionId ? { ...m, completed: !m.completed } : m
    );
    setMissions(updatedMissions);
    if (active) {
      const updated = { ...active, missions: updatedMissions };
      setActive(updated);
      saveCamp(active.id, buildCampaignSnapshot(updated, { missions: updatedMissions }));
    }
  }, [missions, active, saveCamp, buildCampaignSnapshot]);

  const switchPanel = useCallback((panelId) => {
    setPlayPanel(panelId);
  }, []);

  const handleUpdateCharacter = (updatedCharacter) => {
    if (!active) return;
    const updated = { ...active, ...updatedCharacter };
    setActive(updated);
    saveCamp(active.id, updated);
    showNotification('Ficha de personagem atualizada!', 'info');
  };

  const handleCombatEnd = (victory, enemy = null) => {
    if (victory && enemy) {
      const xpGained = (enemy.hp || 10) * 2;
      setExperience(prev => {
        const newTotal = prev + xpGained;
        const newLevel = Math.floor(newTotal / 100) + 1;
        if (newLevel > level) {
          setLevel(newLevel);
          showNotification(`PARABÉNS! Você alcançou o nível ${newLevel}!`);
          changeHp(25);
        }
        return newTotal;
      });
      showNotification(`Vitória! Você ganhou ${xpGained} XP!`);
    } else {
      showNotification(`Você fugiu do combate!`);
    }
  };

  // ─── Conexão / Auto-save ──────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!autoSaveEnabled || !active) return;
    const interval = setInterval(() => { quickSave(); }, 60000);
    return () => clearInterval(interval);
  }, [autoSaveEnabled, active, quickSave]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); quickSave(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSave]);

  // ─── Auto-Detecção ─────────────────────────────────────────────────
  const parseMessageForAutoDetection = useCallback((message) => {
    if (!autoDetectionEnabled || !active) return { items: [], missions: [], status: null };
    const detected = { items: [], missions: [], status: null };

    const itemPatterns = [
      /(?:ganhou|recebeu|encontrou|obteve|adquiriu|pegou|conseguiu)\s+(?:uma?|o?)\s*([a-zA-Zà-ú\s]+?)(?:\s|\.|,|$)/gi,
    ];
    itemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const item = match[1].trim();
        if (item.length > 2 && !['o','a','os','as','um','uma','uns','umas','de','da','do','dos','das'].includes(item.toLowerCase())) {
          detected.items.push(item);
        }
      }
    });

    return detected;
  }, [autoDetectionEnabled, active]);

  const applyAutoDetection = useCallback(async (message) => {
    const detected = parseMessageForAutoDetection(message);

    if (detected.items.length > 0) {
      for (const item of detected.items) {
        await addItem(item, { silent: true });
        showNotification(`🎒 Item detectado: ${item}`, "success", { undoItem: item });
      }
    }

    return detected;
  }, [parseMessageForAutoDetection, addItem, showNotification]);

  // ─── Time-Skip ─────────────────────────────────────────────────────
  const executeTimeSkip = async () => {
    if (!active) return;
    if (sending.current || loading) {
      showNotification("Aguarde o narrador terminar a cena atual.", "warning");
      return;
    }

    const amount = Math.max(1, Number(timeSkipConfig.amount) || 1);
    const unit = timeSkipConfig.unit || "dias";
    setShowTimeSkipModal(false);

    const advance = processTimeAdvance(unit, amount);
    const updatedCamp = {
      ...active,
      gameTime: advance.gameTime,
      temporalEffects: advance.temporalEffects,
    };
    setActive(updatedCamp);

    let nextDisp = [...disp];
    if (shouldShowTimeSeparator(advance.daysAdvanced, unit, amount)) {
      nextDisp = [
        ...nextDisp,
        {
          type: "time_sep",
          text: formatTimeSkipSeparator(advance.daysAdvanced, unit, amount),
        },
      ];
      setDisp(nextDisp);
    }

    const contextMsg = `[O jogador avançou o tempo: ${formatTimeSkipContext(unit, amount)}. O calendário do jogo já foi atualizado — narre o que aconteceu neste intervalo sem incluir tag TIME_SKIP.]`;
    showNotification(formatTimeSkipContext(unit, amount), "info");

    try {
      skipNextTimeParseRef.current = true;
      await sendMsg(contextMsg, msgs, nextDisp, updatedCamp, campLore, false);
    } catch (error) {
      console.error("Erro no time-skip:", error);
      showNotification("Erro ao avançar no tempo", "error");
      setShowTimeSkipModal(true);
    }
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const insertCmd = (cmd) => {
    setPlayPanel("narrator");
    setInput((prev) => {
      const space = prev && !prev.endsWith(" ") ? " " : "";
      return prev + space + cmd;
    });
    setTimeout(() => taRef.current?.focus(), 50);
  };

  const activeMissions = missions.filter(m => !m.completed);
  const doneMissions   = missions.filter(m => m.completed);

  // ═══ HOME ══════════════════════════════════════════════════════════
  if (view === "home") return (
    <div className="rpg-shell">
      <Head><title>Forja de Mundos — RPG</title></Head>
      <div className="shell-header">
        <div className="shell-icon">⚔️</div>
        <div className="shell-title">Forja de Mundos</div>
        <div className="shell-sub">RPG · Suas aventuras na nuvem</div>
      </div>

      {!authReady ? (
        <div className="auth-loading">Carregando conta...</div>
      ) : !user ? (
        <div className="auth-box">
          {!firebaseOk && (
            <div className="auth-alert auth-alert-error">
                  ⚠️ Firebase não acessível. No <a href="https://console.firebase.google.com/project/siterpg32" target="_blank" rel="noreferrer">Firebase Console</a>, ative <strong>Authentication → E-mail/Senha</strong>, crie o <strong>Realtime Database</strong> e publique as rules em <code>firebase/database.rules.json</code>.
            </div>
          )}
          <div className="auth-tabs">
            <button type="button" className={`auth-tab ${authTab === "login" ? "on" : ""}`} onClick={() => { setAuthTab("login"); setAuthMessage(null); setShowAuthPassword(false); }}>Entrar</button>
            <button type="button" className={`auth-tab ${authTab === "signup" ? "on" : ""}`} onClick={() => { setAuthTab("signup"); setAuthMessage(null); setShowAuthPassword(false); }}>Criar conta</button>
          </div>
          {authMessage && (
            <div className={`auth-alert auth-alert-${authMessage.type}`}>{authMessage.text}</div>
          )}
          <form className="auth-form" onSubmit={authTab === "login" ? handleSignIn : handleSignUp}>
            <label className="auth-label">E-mail</label>
            <input
              type="email"
              className="auth-input"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
            <label className="auth-label">Senha</label>
            <div className="auth-password-wrap">
              <input
                type={showAuthPassword ? "text" : "password"}
                className="auth-input auth-input-password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete={authTab === "login" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowAuthPassword((v) => !v)}
                aria-label={showAuthPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                <i className={showAuthPassword ? "ti ti-eye-off" : "ti ti-eye"} />
              </button>
            </div>
            <button type="submit" className="auth-submit" disabled={authBusy || !firebaseOk}>
              {authBusy ? "Aguarde..." : authTab === "login" ? "ENTRAR" : "CRIAR CONTA"}
            </button>
          </form>
          <p className="auth-hint">Suas histórias ficam salvas na nuvem. Acesse de qualquer celular ou computador.</p>
        </div>
      ) : (
        <>
          {user && (
            <div className="auth-alert auth-alert-success" style={{ margin: "0 20px 12px" }}>
              ☁️ Conectado — suas aventuras salvam automaticamente no Firebase.
            </div>
          )}
          <div className="user-bar">
            <span className="user-email" title={user.email}>👤 {user.email}</span>
            <button type="button" className="btn-logout" onClick={handleSignOut}>Sair</button>
          </div>
          <div className="camp-list">
            {!idx.length ? (
              <div className="camp-empty">
                <div className="camp-empty-icon">🌍</div>
                <div className="camp-empty-txt">Nenhuma aventura ainda.<br />Crie seu primeiro mundo — continua de onde parou em qualquer aparelho.</div>
              </div>
            ) : idx.map((s) => (
              <div key={s.id} className="camp-card" onClick={() => openCamp(s)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="camp-world">{s.world}</div>
                  <div className="camp-char"><i className="ti ti-sword" /> {s.charName}</div>
                  {s.updatedAt && <div className="camp-date">Última sessão: {fmtDate(s.updatedAt)}</div>}
                </div>
                <button className="camp-del" onClick={(e) => delCamp(s.id, e)} aria-label="Apagar">✕</button>
              </div>
            ))}
          </div>
          <div className="shell-foot">
            <button className="btn-primary" onClick={startCreate}>+ Novo mundo</button>
          </div>
        </>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );

  // ═══ CREATE ════════════════════════════════════════════════════════
  if (view === "create") return (
    <>
    <div className="rpg-shell">
      <Head><title>Novo Personagem</title></Head>
      <div className="cr-head">
        <button className="btn-ghost" onClick={() => step > 0 ? setStep(s => s - 1) : setView("home")}>← Voltar</button>
        <div className="cr-steps">
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: "flex", alignItems: "center" }}>
              <span className={`cr-dot ${step >= i ? "on" : ""}`} />
              {i < 2 && <span className="cr-ln" />}
            </span>
          ))}
        </div>
        {step === 0
          ? <button className="btn-ghost" onClick={() => setForm({ ...PRESET })}>🐉 Edric</button>
          : <div style={{ width: 56 }} />}
      </div>

      <div className="cr-body">
        {step === 0 && <>
          <div className="cr-lbl">PASSO 1 — O MUNDO</div>
          <F label="Nome do mundo *" value={form.world} set={(v) => setForm(f => ({ ...f, world: v }))} placeholder="ex: Naruto, One Piece, Dark Souls, Mundo Original..." />
          <Toggle title="Universo existente?"
            desc={form.isKnownIP ? "🔍 Vou procurar o lore oficial na internet (anime, mangá, jogo, livro...)" : "✨ Mundo original — você define o contexto abaixo"}
            value={form.isKnownIP} onChange={() => setForm(f => ({ ...f, isKnownIP: !f.isKnownIP, storyStartPoint: "" }))} />
          {!form.isKnownIP && <F label="Lore / Contexto *" value={form.worldBg} set={(v) => setForm(f => ({ ...f, worldBg: v }))} placeholder="Época, conflitos, facções, regras do mundo..." ta rows={5} />}
          {form.isKnownIP && form.world.trim() && (
            <div className="ip-hint">O Mestre vai pesquisar na internet o lore de <strong>{form.world}</strong>: personagens, poderes, facções e eventos.</div>
          )}
          <Toggle title="Gerar imagens de cena?"
            desc={form.useImages ? "🖼️ Uma imagem por cena — mais imersivo, mais lento" : "⚡ Sem imagens — mais rápido e barato"}
            value={form.useImages} onChange={() => setForm(f => ({ ...f, useImages: !f.useImages }))} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a2c00", textTransform: "uppercase", marginBottom: 8 }}>Estilo de jogo</div>
            <div className="style-pick">
              {Object.entries(GAME_STYLES).map(([key, s]) => (
                <button
                  key={key}
                  type="button"
                  className={`style-opt ${form.gameStyle === key ? "on" : ""}`}
                  onClick={() => setForm(f => ({ ...f, gameStyle: key }))}
                >
                  <span className="style-opt-title">{s.icon} {s.label}</span>
                  <span className="style-opt-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" disabled={!form.world.trim() || (!form.isKnownIP && !form.worldBg.trim())} onClick={() => setStep(1)}>Próximo →</button>
        </>}

        {step === 1 && <>
          <div className="cr-lbl">PASSO 2 — O PERSONAGEM</div>
          {form.isKnownIP && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a2c00", textTransform: "uppercase", marginBottom: 8 }}>Quem você vai jogar?</div>
              <div className="style-pick">
                <button
                  type="button"
                  className={`style-opt ${form.isExistingChar ? "on" : ""}`}
                  onClick={() => setForm(f => ({ ...f, isExistingChar: true, storyStartPoint: "" }))}
                >
                  <span className="style-opt-title">📖 Personagem da obra</span>
                  <span className="style-opt-desc">Jogo como Naruto, Geralt, Jon Snow... — busco a ficha e você escolhe onde começar na história</span>
                </button>
                <button
                  type="button"
                  className={`style-opt ${!form.isExistingChar ? "on" : ""}`}
                  onClick={() => setForm(f => ({ ...f, isExistingChar: false, charLore: "", charAppearanceNote: "", storyStartPoint: "" }))}
                >
                  <span className="style-opt-title">✨ Personagem original</span>
                  <span className="style-opt-desc">Crio meu próprio personagem neste universo — não precisa existir na obra</span>
                </button>
              </div>
            </div>
          )}
          {form.isExistingChar && form.isKnownIP && (
            <div className="ip-hint">
              Digite o nome do personagem e clique em <strong>BUSCAR FICHA</strong>. A ficha será preenchida automaticamente — no próximo passo você só escolhe <strong>em que momento da história</strong> quer começar.
            </div>
          )}
          {form.isKnownIP && !form.isExistingChar && (
            <div className="ip-hint">
              Seu personagem <strong>não precisa existir na obra</strong> — você define quem é e como entra no universo de <strong>{form.world || "esta história"}</strong>.
            </div>
          )}
          <F label="Nome *" value={form.charName} set={(v) => setForm(f => ({ ...f, charName: v }))} placeholder={form.isExistingChar ? "ex: Naruto, Geralt, Jon Snow..." : "ex: seu personagem..."} />
          {!form.isExistingChar && <>
            <F label="Título / Cargo" value={form.charTitle} set={(v) => setForm(f => ({ ...f, charTitle: v }))} placeholder="ex: Hokage, Witcher, Lorde..." />
            <F label="Idade" value={form.charAge} set={(v) => setForm(f => ({ ...f, charAge: v }))} placeholder="ex: 17" />
            <F label="História / Background" value={form.charBg} set={(v) => setForm(f => ({ ...f, charBg: v }))} placeholder="Origem, motivações, eventos marcantes..." ta rows={4} />
            <F label="Personalidade" value={form.charPersonality} set={(v) => setForm(f => ({ ...f, charPersonality: v }))} placeholder="ex: Impulsivo, corajoso, leal..." />
            <F label="Habilidades / Poderes" value={form.charSkills} set={(v) => setForm(f => ({ ...f, charSkills: v }))} placeholder="ex: espada, liderança... ou um poder único (geralmente secreto no mundo)" />
            {form.isKnownIP && (
              <F label="Quando na história? (opcional)"
                value={form.storyStartPoint}
                set={(v) => setForm(f => ({ ...f, storyStartPoint: v }))}
                placeholder="ex: Durante o Exame Chunin / Após a Batalha de Winterfell / Era dos Piratas..."
                ta rows={2} />
            )}
          </>}
          <button className="btn-primary" disabled={!form.charName.trim() || charSearchLoading} onClick={handleStep1Next}>
            {charSearchLoading ? "Buscando ficha..." : form.isExistingChar && form.isKnownIP ? "Buscar ficha →" : "Próximo →"}
          </button>
        </>}

        {step === 2 && form.isExistingChar && form.isKnownIP && <>
          <div className="cr-lbl">PASSO 3 — ONDE COMEÇAR?</div>
          <div className="ficha-card">
            <div className="ficha-name">⚔ {form.charName}</div>
            {form.charTitle && <div className="ficha-row"><span>Cargo</span><span>{form.charTitle}{form.charAge ? ` · ${form.charAge} anos` : ""}</span></div>}
            {form.charBg && <div className="ficha-row"><span>História</span><span>{form.charBg}</span></div>}
            {form.charPersonality && <div className="ficha-row"><span>Personalidade</span><span>{form.charPersonality}</span></div>}
            {form.charSkills && <div className="ficha-row"><span>Habilidades</span><span>{form.charSkills}</span></div>}
            {form.charAppearanceNote && <div className="ficha-row"><span>Aparência</span><span>{form.charAppearanceNote}</span></div>}
            {!form.charBg && !form.charPersonality && form.charLore && (
              <div className="ficha-row"><span>Lore</span><span>{form.charLore}</span></div>
            )}
            {form.relationships && Object.keys(form.relationships).length > 0 && (
              <div className="ficha-row">
                <span>Relações</span>
                <span>{Object.entries(form.relationships).slice(0, 6).map(([n, a]) => `${n} (${a})`).join(" · ")}</span>
              </div>
            )}
          </div>
          <F label="Onde na história quer começar? *"
            value={form.storyStartPoint}
            set={(v) => setForm(f => ({ ...f, storyStartPoint: v }))}
            placeholder="ex: Início do anime / Arco do Exame Chunin / Após a Batalha de Winterfell / Depois que vira Hokage..."
            ta rows={3} />
          <div className="ip-hint">Descreva o momento exato da obra em que a aventura começa. O Mestre posicionará seu personagem nesse ponto do canon.</div>
          <button className="btn-primary" disabled={!form.storyStartPoint.trim()} onClick={finishCreate}>⚔ Começar aventura</button>
        </>}

        {step === 2 && !(form.isExistingChar && form.isKnownIP) && <>
          <div className="cr-lbl">PASSO 3 — APARÊNCIA</div>
          <div className="app-preview">
            <div className="app-avatar">
              <div className="av-hair" style={{ background: HAIR_COLORS[form.appearance.hairColor] || "#4a2a00" }} />
              <div className="av-body">{form.appearance.body?.[0]}</div>
              <div className="av-eyes">
                <div className="av-eye" style={{ background: EYE_COLORS[form.appearance.eyeColor] || "#5a3a10" }} />
                <div className="av-eye" style={{ background: EYE_COLORS[form.appearance.eyeColor] || "#5a3a10" }} />
              </div>
            </div>
            <div className="app-summary">
              {Object.entries(APP_LABELS).map(([k, label]) => (
                <div key={k} className="app-sum-row">
                  <span className="app-sum-key">{label}:</span>
                  <span className="app-sum-val">{form.appearance[k]}</span>
                </div>
              ))}
            </div>
          </div>
          {Object.entries(APP_OPTIONS).map(([key, opts]) => (
            <div key={key} className="app-section">
              <div className="app-section-label">{APP_LABELS[key]}</div>
              <div className="chips">
                {opts.map(opt => (
                  <button key={opt} className={`chip ${form.appearance[key] === opt ? "on" : ""}`} onClick={() => setApp(key, opt)}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
          <button className="btn-primary" onClick={finishCreate}>⚔ Começar aventura</button>
        </>}
      </div>
    </div>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );

  // ═══ PLAY ══════════════════════════════════════════════════════════
  return (
    <>
    <PlayView
      active={active}
      disp={disp}
      loading={loading}
      statusText={statusText}
      sceneImg={sceneImg}
      imgOk={imgOk}
      setImgOk={setImgOk}
      hp={hp}
      level={level}
      experience={experience}
      attributes={attributes}
      skills={skills}
      missions={missions}
      characterAge={displayAge}
      gameTime={gameTime}
      temporalEffects={temporalEffects}
      timelineEvents={timelineEvents}
      charInitialAge={charInitialAge}
      input={input}
      setInput={setInput}
      autoMode={autoMode}
      autoWaiting={autoWaiting}
      countdown={countdown}
      showRollButton={showRollButton}
      lastRoll={lastRoll}
      playPanel={playPanel}
      setPlayPanel={switchPanel}
      diceHistory={diceHistory}
      diceNum={diceNum}
      diceLabel={diceLabel}
      invInput={invInput}
      setInvInput={setInvInput}
      theme={theme}
      soundEnabled={soundEnabled}
      setSoundEnabled={setSoundEnabled}
      autoDetectionEnabled={autoDetectionEnabled}
      setAutoDetectionEnabled={setAutoDetectionEnabled}
      autoSaveEnabled={autoSaveEnabled}
      setAutoSaveEnabled={setAutoSaveEnabled}
      connectionStatus={connectionStatus}
      lastSaved={lastSaved}
      showTimeSkipModal={showTimeSkipModal}
      setShowTimeSkipModal={setShowTimeSkipModal}
      timeSkipConfig={timeSkipConfig}
      setTimeSkipConfig={setTimeSkipConfig}
      bottomRef={bottomRef}
      taRef={taRef}
      GAME_STYLES={GAME_STYLES}
      activeMissions={activeMissions}
      doneMissions={doneMissions}
      clearAuto={clearAuto}
      setView={setView}
      toggleAuto={toggleAuto}
      quickSave={quickSave}
      handleSend={handleSend}
      rollD20={rollD20}
      rollDiceSides={rollDiceSides}
      rollDiceMultiple={rollDiceMultiple}
      changeHp={changeHp}
      handleLevelUp={handleLevelUp}
      addItem={addItem}
      removeItem={removeItem}
      useItem={useItem}
      toggleTheme={toggleTheme}
      executeTimeSkip={executeTimeSkip}
      exportToBook={exportToBook}
      saveSlot={saveSlot}
      loadSlot={loadSlot}
      deleteSlot={deleteSlot}
      resetChat={resetChat}
      insertCmd={insertCmd}
      toggleMission={toggleMission}
      intervene={intervene}
    />
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────
function F({ label, value, set, placeholder, ta, rows }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {ta
        ? <textarea className="field-input" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} rows={rows || 4} />
        : <input className="field-input" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

function Toggle({ title, desc, value, onChange }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <div className="toggle-title">{title}</div>
        <div className="toggle-desc">{desc}</div>
      </div>
      <button type="button" className={`toggle-btn ${value ? "on" : ""}`} onClick={onChange}>
        {value ? "SIM" : "NÃO"}
      </button>
    </div>
  );
}

export default dynamic(() => Promise.resolve(RPG), {
  ssr: false,
  loading: () => (
    <div className="rpg-shell">
      <div className="auth-loading">Carregando...</div>
    </div>
  ),
});

