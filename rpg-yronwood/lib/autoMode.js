/**
 * Modo automático — escolhe a próxima ação do personagem com base na personalidade.
 */

const TRAIT_PROFILES = [
  {
    keywords: ["orgulhoso", "arrogante", "nobre", "imperador", "rei", "rainha"],
    prefer: ["desafiar", "exigir", "confrontar", "negar", "exibir", "dominar", "ordenar"],
    actions: [
      "Enfrento a situação de frente, sem recuar nem pedir permissão.",
      "Exijo respeito e deixo claro que não aceito ser subestimado.",
      "Tomo a iniciativa e conduzo a cena com autoridade.",
    ],
  },
  {
    keywords: ["cauteloso", "calmo", "reservado", "silencioso", "estratégico", "analítico"],
    prefer: ["observar", "esperar", "investigar", "analisar", "estudar", "rastrear"],
    actions: [
      "Observo em silêncio, buscando entender a situação antes de agir.",
      "Procuro pistas no ambiente e avanço com cuidado.",
      "Fico atento a detalhes que os outros parecem ignorar.",
    ],
  },
  {
    keywords: ["impulsivo", "agressivo", "bravo", "violento", "guerreiro", "lutador"],
    prefer: ["atacar", "investir", "partir", "golpear", "correr", "ir"],
    actions: [
      "Ajo sem hesitar — o momento pede decisão, não reflexão.",
      "Parto para a ação enquanto a oportunidade ainda existe.",
      "Avanço com determinação, pronto para o que vier.",
    ],
  },
  {
    keywords: ["carismático", "persuasivo", "charmoso", "diplomata", "negociador"],
    prefer: ["convencer", "negociar", "persuadir", "dialogar", "falar", "propor"],
    actions: [
      "Tento abordar a situação com palavras antes de força.",
      "Busco uma conversa que possa virar a favor.",
      "Faço uma pergunta que pode abrir caminho para entendimento.",
    ],
  },
  {
    keywords: ["curioso", "investigador", "sábio", "estudioso", "místico", "mago"],
    prefer: ["investigar", "examinar", "estudar", "decifrar", "explorar", "perguntar"],
    actions: [
      "Investigo o que chama minha atenção nesta cena.",
      "Faço uma pergunta que pode revelar algo importante.",
      "Examinar o ambiente parece mais urgente do que agir de imediato.",
    ],
  },
  {
    keywords: ["leal", "protetor", "herói", "bondoso", "compassivo", "gentil"],
    prefer: ["proteger", "ajudar", "defender", "cuidar", "salvar", "apoiar"],
    actions: [
      "Priorizo quem precisa de ajuda nesta situação.",
      "Me aproximo para entender se alguém está em perigo.",
      "Ofereço apoio antes de pensar no meu próprio interesse.",
    ],
  },
  {
    keywords: ["sombrio", "cínico", "solitário", "misterioso", "traído"],
    prefer: ["desconfiar", "esconder", "mentir", "observar", "recuar", "evitar"],
    actions: [
      "Mantenho distância e observo antes de confiar em qualquer um.",
      "Escondo minhas intenções e deixo os outros falarem primeiro.",
      "Procuro uma saída ou vantagem que ninguém percebeu ainda.",
    ],
  },
];

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function scoreOption(option, preferWords) {
  const lower = normalizeText(option);
  return preferWords.reduce((score, word) => (lower.includes(word) ? score + 2 : score), 0);
}

function detectTraits(camp) {
  const blob = normalizeText(
    [camp?.charPersonality, camp?.charBg, camp?.charSkills, camp?.charTitle].filter(Boolean).join(" ")
  );
  const matched = TRAIT_PROFILES.filter((profile) =>
    profile.keywords.some((keyword) => blob.includes(keyword))
  );
  return matched.length ? matched : [TRAIT_PROFILES[1]];
}

export function getLastGmText(disp, msgs) {
  const fromDisp = [...(disp || [])].reverse().find((entry) => entry?.type === "gm");
  if (fromDisp?.text) return fromDisp.text;

  const fromMsgs = [...(msgs || [])].reverse().find((entry) => entry?.role === "assistant");
  return fromMsgs?.content || "";
}

export function pickFromOptions(options, camp) {
  const safeOptions = (options || []).filter(Boolean);
  if (!safeOptions.length) return null;

  const traits = detectTraits(camp);
  const preferWords = traits.flatMap((profile) => profile.prefer);

  let bestScore = -1;
  let bestOptions = [];

  for (const option of safeOptions) {
    const score = scoreOption(option, preferWords);
    if (score > bestScore) {
      bestScore = score;
      bestOptions = [option];
    } else if (score === bestScore) {
      bestOptions.push(option);
    }
  }

  if (bestScore > 0) {
    return bestOptions[Math.floor(Math.random() * bestOptions.length)];
  }

  return safeOptions[Math.floor(Math.random() * safeOptions.length)];
}

export function buildLocalAutoAction(camp, lastGmText) {
  const traits = detectTraits(camp);
  const profile = traits[Math.floor(Math.random() * traits.length)];
  const scene = normalizeText(lastGmText);

  if (scene.includes("?")) {
    return "Respondo de acordo com quem sou — direto ao ponto, sem rodeios.";
  }
  if (scene.includes("perigo") || scene.includes("inimigo") || scene.includes("ataque")) {
    return profile.actions.find((action) => action.includes("frente") || action.includes("Ajo"))
      || profile.actions[0];
  }
  if (scene.includes("porta") || scene.includes("corredor") || scene.includes("sala")) {
    return "Avanço para explorar o que está à frente, atento a qualquer detalhe.";
  }

  const pool = profile.actions;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function resolveAutoAction(camp, lastGmText, options, apiFetch) {
  const fromOptions = pickFromOptions(options, camp);
  if (fromOptions) return fromOptions;

  try {
    const res = await apiFetch("/api/gm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        useAutoAction: true,
        camp: {
          charName: camp?.charName,
          charPersonality: camp?.charPersonality,
          charBg: camp?.charBg,
          charSkills: camp?.charSkills,
          charTitle: camp?.charTitle,
          world: camp?.world,
          gameStyle: camp?.gameStyle,
        },
        lastGmText,
      }),
    });
    const data = await res.json();
    const action = String(data?.action || "").trim();
    if (action) return action;
  } catch (error) {
    console.warn("Auto action API falhou, usando heurística local:", error);
  }

  return buildLocalAutoAction(camp, lastGmText);
}
