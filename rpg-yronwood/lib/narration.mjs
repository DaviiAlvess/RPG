const NARRATION_POV_LOCK = 'Narre em segunda pessoa ("você"); a câmera é o corpo do jogador. NPCs entram a partir de você ("À sua frente…"). Nunca abra com "o transeunte" ou "a figura encapuzada" como herói do parágrafo.';
export const NARRATION_STYLES = {
  "cinematic": {
    "label": "Cinematográfico",
    "icon": "◈",
    "description": "Cenas visuais, cortes precisos e diálogos com presença.",
    "instruction": `Tom: cortes visuais, ações concretas, diálogo com presença — sem jargão de roteiro. ${NARRATION_POV_LOCK}`,
    "sample": "Sua palma ainda está na mesa quando a porta bate. À sua frente, o mensageiro deixa a carta — você vê os dois dedos no selo. Atrás dele, os passos no corredor param."
  },
  "literary": {
    "label": "Literário",
    "icon": "✒",
    "description": "Prosa expressiva, subtexto e personagens com camadas.",
    "instruction": `Tom: prosa elegante, uma imagem específica, subtexto em gestos — sem excesso de adjetivos e sem conto em terceira pessoa. ${NARRATION_POV_LOCK}`,
    "sample": "Sua mão ainda está aberta quando a carta desliza até você. Os dedos dele alisam a borda como quem corrige um erro antigo. O selo à sua frente está intacto; as mãos, não. Ele escolhe a cadeira de onde se vê a sua saída."
  },
  "dark": {
    "label": "Sombrio",
    "icon": "☾",
    "description": "Suspense, incerteza e perigo sugerido.",
    "instruction": `Tom: suspense, pistas, perigo sugerido — não imponha medo nem violência gratuita. ${NARRATION_POV_LOCK}`,
    "sample": "O que você carrega ainda pesa no colo quando ele empurra a carta. A cera está seca, embora a capa pingue. Você lê o mesmo símbolo riscado na sua porta naquela manhã. Ele não tira os olhos de você."
  },
  "light": {
    "label": "Leve e espirituoso",
    "icon": "☀",
    "description": "Aventura calorosa, humor de situação e descobertas.",
    "instruction": `Tom: humor de situação, calor humano, curiosidade — sem ridicularizar o jogador nem virar piada o que é sério. ${NARRATION_POV_LOCK}`,
    "sample": "À sua frente, você recebe a carta com a solenidade que ele ensaiou. Um pedaço de pão cai da manga dele no seu colo. Mensageiro: \"A correspondência chegou intacta. O almoço teve complicações.\""
  },
  "epic": {
    "label": "Épico",
    "icon": "⚑",
    "description": "Decisões marcantes e um mundo maior que o herói.",
    "instruction": `Tom: peso nas escolhas e no mundo à volta — escale aos poucos, sem profecia nem poderes. ${NARRATION_POV_LOCK}`,
    "sample": "Sua mão ainda está vazia quando os sinos começam — a carta não tocou a mesa. À sua frente, você vê o mensageiro olhar a praça que se enche. Mensageiro: \"Há uma cópia para cada portão. Esta é a última.\""
  },
  "intimate": {
    "label": "Íntimo e dramático",
    "icon": "◇",
    "description": "Relações, silêncios e conversas que importam.",
    "instruction": `Tom: relações, silêncios, motivações no espaço entre as pessoas — sem rotular emoção do jogador, forçar romance ou falar por ele. ${NARRATION_POV_LOCK}`,
    "sample": "O envelope ainda está na sua mão quando você vê o mensageiro reconhecer o retrato sobre a lareira. Por um instante, ele esquece a carta. Mensageiro: \"Você ainda guarda isso?\" O papel permanece entre os dois."
  }
};
export const NARRATION_LENGTHS = { short: { label: 'Curta', instruction: 'Cerca de 80–140 palavras; uma cena focada.' }, balanced: { label: 'Equilibrada', instruction: 'Cerca de 200–320 palavras, com espaço para diálogo.' }, rich: { label: 'Detalhada', instruction: 'Cerca de 300–450 palavras, sem avançar além de decisões do jogador.' } };
export const NARRATION_PACES = { slow: { label: 'Contemplativo', instruction: 'Dê tempo para observar e conversar. Não invente urgência a cada turno.' }, balanced: { label: 'Natural', instruction: 'Alterne ação, conversa e descanso conforme a cena.' }, fast: { label: 'Ágil', instruction: 'Entre perto do momento decisivo, reduza transições e preserve oportunidades de agir.' } };
export function normalizeNarration(value = {}) {
  return { style: Object.hasOwn(NARRATION_STYLES, value?.style) ? value.style : 'cinematic', length: Object.hasOwn(NARRATION_LENGTHS, value?.length) ? value.length : 'balanced', pace: Object.hasOwn(NARRATION_PACES, value?.pace) ? value.pace : 'balanced' };
}
export const NARRATION_PRESENCE = [
  'POV — A CÂMERA É O JOGADOR. Narre em segunda pessoa ("você").',
  'O primeiro sujeito visível da resposta deve ser o corpo do jogador ou o que está colado nele (mão, carroça, pacote no colo) — nunca um desconhecido como protagonista do parágrafo.',
  'NPCs aparecem a partir de você: "À sua esquerda, um homem…", "Você ouve a bota no cascalho." Proibido: "O transeunte desfila…", "A figura encapuzada…" como abertura sem âncora em você.',
  'PRESENÇA — o jogador está dentro da cena.',
  'Comece no instante da última ação do jogador; nunca abra com clima genérico ou tour ("O sol se põe", "Você está em…").',
  'Narre a partir do corpo: o que chega aos olhos, ouvidos, pele e olfato de onde o personagem está.',
  'A cena muda por causa dessa ação; NPCs olham, esperam ou interrompem o jogador com agenda própria.',
  'Um conflito na sua cara neste instante: alguém quer o que você carrega ou espera a sua palavra.',
  'Corpo observável é permitido (mão, respiração, silêncio, calor); nunca rotule emoção ("você sente medo") e nunca fale, pense ou decida pelo jogador.',
  'Nunca invente diálogo para o personagem do jogador.',
  'Um ou dois detalhes reveladores, não uma lista de sentidos.',
  'Feche frases e o turno: situação viva que o jogador pode responder. Não corte no meio ("sob o…"). Sem menus numerados; não faça cliffhanger em toda resposta.',
  'Não repita a abertura, metáfora ou estrutura da resposta anterior.'
].join('\n');
export function buildNarrationDirection(value) {
  const n = normalizeNarration(value);
  const style = NARRATION_STYLES[n.style];
  return [
    'DIREÇÃO DE NARRAÇÃO — estas preferências prevalecem sobre instruções anteriores de estilo, tamanho e ritmo, mas nunca alteram regras de dados, fatos, canon ou agência do jogador.',
    NARRATION_PRESENCE,
    style.instruction, NARRATION_LENGTHS[n.length].instruction, NARRATION_PACES[n.pace].instruction,
    `MODELO DE VOZ — imite o TOM deste trecho, não a mesma cena e NÃO o ponto de vista. Estilo literário/cinematográfico = corte e detalhe, NÃO terceira pessoa de conto. A câmera continua sendo você:\n${style.sample}`,
    'Uma falha muda a situação, não deve apenas repetir o mesmo bloqueio.',
    'Cada cena deve servir a uma intenção ou pergunta concreta, sem inventar objetivos para o jogador.',
    'Varie a extensão das frases conforme ação, conversa ou repouso.',
    'Nos diálogos, cada NPC quer algo específico. Mostre subtexto por uma pausa, gesto ou resposta indireta quando fizer sentido; evite que todos falem por enigmas.',
    'As escolhas devem produzir diferenças reconhecíveis. Mostre os riscos que o personagem poderia perceber; não transforme toda surpresa em punição arbitrária. Dê resolução a perguntas antigas antes de acumular mistérios novos.',
    'Reutilize detalhes e relações já estabelecidos antes de criar novos. NPCs têm objetivos e limites de conhecimento; não adivinham segredos.',
    'Evite elogios automáticos e frases genéricas de destino.',
    'Nunca avance uma decisão pelo jogador, determine seus sentimentos ou conceda sucesso para agradá-lo. Humor, épico e drama respeitam a escala atual do personagem.'
  ].join('\n');
}

export function buildStartPrompt(camp = {}) {
  const name = String(camp.charName || '').trim() || 'o personagem';
  const world = String(camp.world || '').trim() || 'este mundo';
  const moment = String(camp.storyStartPoint || '').trim();
  const parts = [];

  if (moment) {
    if (camp.isExistingChar) {
      parts.push(
        `A aventura começa neste instante da história canônica — narre de dentro dele, não o resuma: ${moment}`,
        `Posicione ${name} exatamente neste momento do universo "${world}", respeitando o lore oficial.`
      );
    } else {
      parts.push(
        `A aventura começa neste instante do canon — narre de dentro dele, não o resuma: ${moment}`,
        `${name} é um personagem original (não faz parte da obra) inserido no universo de "${world}". Posicione-o de forma coerente com o lore, sem substituir figuras canônicas.`
      );
    }
  } else if (camp.isKnownIP && !camp.isExistingChar) {
    parts.push(
      `A aventura começa no primeiro instante vivido de ${name} no universo de "${world}" — personagem original, fora do elenco da obra.`,
      'Caia num primeiro batimento concreto deste mundo; não descreva o cenário de fora.'
    );
  } else {
    parts.push(
      `A aventura começa no primeiro instante vivido de ${name} no universo de "${world}".`,
      'Caia num primeiro batimento concreto deste mundo; não descreva o cenário de fora.'
    );
  }

  if (camp.ordinaryCharacter) {
    parts.push('O jogador é uma pessoa comum: sem profecia, linhagem secreta ou poderes não estabelecidos.');
  }

  parts.push(
    'A câmera é o jogador. Narre em segunda pessoa ("você"). O primeiro sujeito visível deve ser o corpo do jogador ou o que está colado nele (mão, carroça, pacote no colo) — nunca um desconhecido como protagonista.',
    'NPCs aparecem a partir de você. Proibido abrir com "O transeunte desfila…" ou "A figura encapuzada…" sem âncora no jogador.',
    'Narre a partir do corpo: o que chega aos olhos, ouvidos, pele ou olfato de onde o personagem está.',
    'Um ou dois detalhes reveladores. Um conflito na sua cara neste instante: um NPC ou o mundo já quer algo do jogador.',
    'Nunca abra com "Você está em…". Nunca invente diálogo, pensamento ou decisão para o personagem do jogador. Sem menus numerados.',
    'Feche frases e o turno numa situação viva que o jogador pode responder. Não corte no meio.'
  );

  return parts.join(' ');
}
