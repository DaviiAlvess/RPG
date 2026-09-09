export const NARRATION_STYLES = {
  "cinematic": {
    "label": "Cinematográfico",
    "icon": "◈",
    "description": "Cenas visuais, cortes precisos e diálogos com presença.",
    "instruction": "Construa a cena com ações visíveis, detalhes concretos e cortes naturais a partir de onde o personagem está. Evite descrever câmera ou roteiro técnico.",
    "sample": "A porta bate. O mensageiro deixa uma carta sobre a mesa, mas mantém dois dedos sobre o selo. Atrás dele, os passos no corredor param."
  },
  "literary": {
    "label": "Literário",
    "icon": "✒",
    "description": "Prosa expressiva, subtexto e personagens com camadas.",
    "instruction": "Use prosa elegante e imagens específicas do que o personagem percebe, sem excesso de adjetivos. Deixe intenções aparecerem em gestos e subtexto.",
    "sample": "O mensageiro alisa a borda da carta como quem tenta corrigir um erro antigo. O selo está intacto; suas mãos, não. Ele escolhe a cadeira de onde se vê a saída."
  },
  "dark": {
    "label": "Sombrio",
    "icon": "☾",
    "description": "Suspense, incerteza e perigo sugerido.",
    "instruction": "Crie suspense com pistas e consequências plausíveis no que o personagem percebe. Sugira mais do que mostre; não imponha medo ao jogador e não confunda sombrio com violência gratuita.",
    "sample": "A carta está seca, embora o mensageiro esteja encharcado. Ele a empurra para longe. Na cera, alguém marcou o mesmo símbolo riscado na sua porta naquela manhã."
  },
  "light": {
    "label": "Leve e espirituoso",
    "icon": "☀",
    "description": "Aventura calorosa, humor de situação e descobertas.",
    "instruction": "Use humor de situação, personagens humanos e curiosidade no que acontece à volta. Não ridicularize o jogador nem transforme momentos sérios em piadas.",
    "sample": "O mensageiro entrega a carta com solenidade. Um pedaço de pão cai da manga dele. Mensageiro: \"A correspondência chegou intacta. O almoço teve complicações.\""
  },
  "epic": {
    "label": "Épico",
    "icon": "⚑",
    "description": "Decisões marcantes e um mundo maior que o herói.",
    "instruction": "Dê peso a escolhas e consequências coletivas no mundo à volta do personagem. Escale a importância aos poucos, sem transformar um personagem comum em escolhido ou conceder poderes.",
    "sample": "Os sinos começam antes que a carta toque a mesa. O mensageiro olha para a praça que se enche. Mensageiro: \"Há uma cópia para cada portão. Esta é a última.\""
  },
  "intimate": {
    "label": "Íntimo e dramático",
    "icon": "◇",
    "description": "Relações, silêncios e conversas que importam.",
    "instruction": "Priorize relações, pausas e motivações conflitantes no espaço entre as pessoas. Não defina emoções do jogador, force romance nem fale por ele.",
    "sample": "O mensageiro reconhece o retrato sobre a lareira. Por um instante, esquece a carta. Mensageiro: \"Você ainda guarda isso?\" O envelope permanece entre os dois."
  }
};
export const NARRATION_LENGTHS = { short: { label: 'Curta', instruction: 'Cerca de 80–140 palavras; uma cena focada.' }, balanced: { label: 'Equilibrada', instruction: 'Cerca de 200–320 palavras, com espaço para diálogo.' }, rich: { label: 'Detalhada', instruction: 'Cerca de 300–450 palavras, sem avançar além de decisões do jogador.' } };
export const NARRATION_PACES = { slow: { label: 'Contemplativo', instruction: 'Dê tempo para observar e conversar. Não invente urgência a cada turno.' }, balanced: { label: 'Natural', instruction: 'Alterne ação, conversa e descanso conforme a cena.' }, fast: { label: 'Ágil', instruction: 'Entre perto do momento decisivo, reduza transições e preserve oportunidades de agir.' } };
export function normalizeNarration(value = {}) {
  return { style: Object.hasOwn(NARRATION_STYLES, value?.style) ? value.style : 'cinematic', length: Object.hasOwn(NARRATION_LENGTHS, value?.length) ? value.length : 'balanced', pace: Object.hasOwn(NARRATION_PACES, value?.pace) ? value.pace : 'balanced' };
}
export const NARRATION_PRESENCE = [
  'PRESENÇA — o jogador está dentro da cena.',
  'Comece no instante da última ação do jogador; nunca abra com clima genérico ou tour ("O sol se põe", "Você está em…").',
  'Narre a partir do corpo: o que chega aos olhos, ouvidos, pele e olfato de onde o personagem está.',
  'A cena muda por causa dessa ação; NPCs olham, esperam ou interrompem o jogador com agenda própria.',
  'Corpo observável é permitido (mão, respiração, silêncio, calor); nunca rotule emoção ("você sente medo") e nunca fale, pense ou decida pelo jogador.',
  'Nunca invente diálogo para o personagem do jogador.',
  'Um ou dois detalhes reveladores, não uma lista de sentidos.',
  'Encerre onde o jogador pode agir; sem menus numerados; não faça cliffhanger em toda resposta.',
  'Não repita a abertura, metáfora ou estrutura da resposta anterior.'
].join('\n');
export function buildNarrationDirection(value) {
  const n = normalizeNarration(value);
  const style = NARRATION_STYLES[n.style];
  return [
    'DIREÇÃO DE NARRAÇÃO — estas preferências prevalecem sobre instruções anteriores de estilo, tamanho e ritmo, mas nunca alteram regras de dados, fatos, canon ou agência do jogador.',
    style.instruction, NARRATION_LENGTHS[n.length].instruction, NARRATION_PACES[n.pace].instruction,
    `MODELO DE VOZ — imite o TOM deste trecho, não a mesma cena:\n${style.sample}`,
    NARRATION_PRESENCE,
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
    'Narre a partir do corpo: o que chega aos olhos, ouvidos, pele ou olfato de onde o personagem está.',
    'Um ou dois detalhes reveladores. Um NPC ou o mundo já quer algo do jogador.',
    'Nunca abra com "Você está em…". Nunca invente diálogo, pensamento ou decisão para o personagem do jogador. Sem menus numerados.',
    'Encerre onde o jogador pode agir.'
  );

  return parts.join(' ');
}
