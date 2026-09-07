export const NARRATION_STYLES = {
  "cinematic": {
    "label": "Cinematográfico",
    "icon": "◈",
    "description": "Cenas visuais, cortes precisos e diálogos com presença.",
    "instruction": "Construa a cena com ações visíveis, detalhes concretos e cortes naturais. Evite descrever câmera ou roteiro técnico.",
    "sample": "A porta bate. O mensageiro deixa uma carta sobre a mesa, mas mantém dois dedos sobre o selo. Atrás dele, os passos no corredor param."
  },
  "literary": {
    "label": "Literário",
    "icon": "✒",
    "description": "Prosa expressiva, subtexto e personagens com camadas.",
    "instruction": "Use prosa elegante e imagens específicas, sem excesso de adjetivos. Deixe intenções aparecerem em gestos e subtexto.",
    "sample": "O mensageiro alisa a borda da carta como quem tenta corrigir um erro antigo. O selo está intacto; suas mãos, não. Ele escolhe a cadeira de onde se vê a saída."
  },
  "dark": {
    "label": "Sombrio",
    "icon": "☾",
    "description": "Suspense, incerteza e perigo sugerido.",
    "instruction": "Crie suspense com pistas e consequências plausíveis. Sugira mais do que mostre; não imponha medo ao jogador e não confunda sombrio com violência gratuita.",
    "sample": "A carta está seca, embora o mensageiro esteja encharcado. Ele a empurra para longe. Na cera, alguém marcou o mesmo símbolo riscado na sua porta naquela manhã."
  },
  "light": {
    "label": "Leve e espirituoso",
    "icon": "☀",
    "description": "Aventura calorosa, humor de situação e descobertas.",
    "instruction": "Use humor de situação, personagens humanos e curiosidade. Não ridicularize o jogador nem transforme momentos sérios em piadas.",
    "sample": "O mensageiro entrega a carta com solenidade. Um pedaço de pão cai da manga dele. Mensageiro: \"A correspondência chegou intacta. O almoço teve complicações.\""
  },
  "epic": {
    "label": "Épico",
    "icon": "⚑",
    "description": "Decisões marcantes e um mundo maior que o herói.",
    "instruction": "Dê peso a escolhas e consequências coletivas. Escale a importância aos poucos, sem transformar um personagem comum em escolhido ou conceder poderes.",
    "sample": "Os sinos começam antes que a carta toque a mesa. O mensageiro olha para a praça que se enche. Mensageiro: \"Há uma cópia para cada portão. Esta é a última.\""
  },
  "intimate": {
    "label": "Íntimo e dramático",
    "icon": "◇",
    "description": "Relações, silêncios e conversas que importam.",
    "instruction": "Priorize relações, pausas e motivações conflitantes. Não defina emoções do jogador, force romance nem fale por ele.",
    "sample": "O mensageiro reconhece o retrato sobre a lareira. Por um instante, esquece a carta. Mensageiro: \"Você ainda guarda isso?\" O envelope permanece entre os dois."
  }
};
export const NARRATION_LENGTHS = { short: { label: 'Curta', instruction: 'Cerca de 80–140 palavras; uma cena focada.' }, balanced: { label: 'Equilibrada', instruction: 'Cerca de 150–250 palavras, com espaço para diálogo.' }, rich: { label: 'Detalhada', instruction: 'Cerca de 250–400 palavras, sem avançar além de decisões do jogador.' } };
export const NARRATION_PACES = { slow: { label: 'Contemplativo', instruction: 'Dê tempo para observar e conversar. Não invente urgência a cada turno.' }, balanced: { label: 'Natural', instruction: 'Alterne ação, conversa e descanso conforme a cena.' }, fast: { label: 'Ágil', instruction: 'Entre perto do momento decisivo, reduza transições e preserve oportunidades de agir.' } };
export function normalizeNarration(value = {}) {
  return { style: Object.hasOwn(NARRATION_STYLES, value?.style) ? value.style : 'cinematic', length: Object.hasOwn(NARRATION_LENGTHS, value?.length) ? value.length : 'balanced', pace: Object.hasOwn(NARRATION_PACES, value?.pace) ? value.pace : 'balanced' };
}
export function buildNarrationDirection(value) {
  const n = normalizeNarration(value);
  return [
    'DIREÇÃO DE NARRAÇÃO — estas preferências prevalecem sobre instruções anteriores de estilo, tamanho e ritmo, mas nunca alteram regras de dados, fatos, canon ou agência do jogador.',
    NARRATION_STYLES[n.style].instruction, NARRATION_LENGTHS[n.length].instruction, NARRATION_PACES[n.pace].instruction,
    'Responda primeiro à ação concreta do jogador e mostre uma consequência perceptível. Uma falha muda a situação, não deve apenas repetir o mesmo bloqueio.',
    'Reutilize detalhes e relações já estabelecidos antes de criar novos. NPCs têm objetivos e limites de conhecimento; não adivinham segredos.',
    'Termine em um ponto onde o jogador pode agir: uma descoberta, oferta, obstáculo ou pausa significativa. Varie o fechamento; não imponha cliffhanger, pergunta ou ameaça em toda resposta.',
    'Não repita a abertura, metáfora ou estrutura da resposta anterior. Evite elogios automáticos e frases genéricas de destino.',
    'Nunca avance uma decisão pelo jogador, determine seus sentimentos ou conceda sucesso para agradá-lo. Humor, épico e drama respeitam a escala atual do personagem.'
  ].join('\n');
}
