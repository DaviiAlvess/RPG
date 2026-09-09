/**
 * Modo automático — escolhe a próxima ação do personagem com base na personalidade.
 */

const TRAIT_PROFILES = [
  {
    keywords: ["orgulhoso", "arrogante", "nobre", "imperador", "rei", "rainha"],
    prefer: ["desafiar", "exigir", "confrontar", "negar", "exibir", "dominar", "ordenar"],
    actions: [
      "Dou um passo à frente e falo em voz alta, sem pedir licença.",
      "Ergo o queixo e olho direto para quem está à minha frente.",
      "Interrompo o que está acontecendo e tomo a palavra.",
    ],
  },
  {
    keywords: ["cauteloso", "calmo", "reservado", "silencioso", "estratégico", "analítico"],
    prefer: ["observar", "esperar", "investigar", "analisar", "estudar", "rastrear"],
    actions: [
      "Paro onde estou e percorro a cena com o olhar antes de avançar.",
      "Chego mais perto das bordas, vendo o que está fora do foco dos outros.",
      "Escuto um instante o que se passa e só então me movo.",
    ],
  },
  {
    keywords: ["impulsivo", "agressivo", "bravo", "violento", "guerreiro", "lutador"],
    prefer: ["atacar", "investir", "partir", "golpear", "correr", "ir"],
    actions: [
      "Ajo já e cruzo o espaço até o que está acontecendo.",
      "Pego o que está ao alcance enquanto a abertura ainda existe.",
      "Avanço até o centro da cena e forço o próximo instante.",
    ],
  },
  {
    keywords: ["carismático", "persuasivo", "charmoso", "diplomata", "negociador"],
    prefer: ["convencer", "negociar", "persuadir", "dialogar", "falar", "propor"],
    actions: [
      "Me aproximo de quem parece decidir e falo primeiro.",
      "Abro as palmas e proponho um acordo em voz baixa.",
      "Faço uma pergunta direta a quem está na minha frente.",
    ],
  },
  {
    keywords: ["curioso", "investigador", "sábio", "estudioso", "místico", "mago"],
    prefer: ["investigar", "examinar", "estudar", "decifrar", "explorar", "perguntar"],
    actions: [
      "Me agacho e examino o que está à vista, sem tocar ainda.",
      "Apontando para o detalhe que não combina, pergunto o que aquilo significa.",
      "Chego mais perto da marca, do objeto ou da abertura que os outros ignoram.",
    ],
  },
  {
    keywords: ["leal", "protetor", "herói", "bondoso", "compassivo", "gentil"],
    prefer: ["proteger", "ajudar", "defender", "cuidar", "salvar", "apoiar"],
    actions: [
      "Me coloco entre quem parece vulnerável e o resto da cena.",
      "Me aproximo de quem está parado demais e pergunto se precisa de ajuda.",
      "Estendo a mão a quem está mais perto de mim.",
    ],
  },
  {
    keywords: ["sombrio", "cínico", "solitário", "misterioso", "traído"],
    prefer: ["desconfiar", "esconder", "mentir", "observar", "recuar", "evitar"],
    actions: [
      "Fico junto à parede e deixo os outros falarem primeiro.",
      "Mantenho as mãos visíveis e recuo meio passo, medindo as saídas.",
      "Olho para o que os outros ignoram — uma abertura, um bolso, um silêncio.",
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
    return "Olho para quem falou e respondo em voz alta, direto ao ponto.";
  }
  if (scene.includes("perigo") || scene.includes("inimigo") || scene.includes("ataque")) {
    return profile.actions.find((action) => action.includes("frente") || action.includes("Ajo"))
      || profile.actions[0];
  }
  if (scene.includes("porta") || scene.includes("corredor") || scene.includes("sala")) {
    return "Sigo até a próxima abertura e olho o que há do outro lado antes de cruzar.";
  }

  const pool = profile.actions;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function resolveAutoAction(camp, lastGmText, options, apiFetch) {
  const fromOptions = pickFromOptions(options, camp);
  if (fromOptions) return fromOptions;
  if (camp?.economyMode) return buildLocalAutoAction(camp, lastGmText);

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
          specialAbility: camp?.specialAbility,
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
