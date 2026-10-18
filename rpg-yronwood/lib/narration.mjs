export const NARRATION_VISION_LOCK = 'A narração principal é SEMPRE a visão do personagem do jogador — câmera magnética, atrás/dentro dos olhos: mão, ombro, o que chega à visão. NPCs falam no formato Nome: "fala".';
export const NARRATION_VISCERAL_LOCK = [
  'NARRAÇÃO VISCERAL — trava global, não é estilo extra e não é opção da campanha. Vale em TODA mesa (save antigo, preset, Westeros, Bleach, mundo custom) no próximo turno, sem recriar. Narre em segunda pessoa ("você"). Nunca fale, pense, escolha ou decida pelo jogador.',
  'RESPIRAÇÃO DA CENA — sob tensão, perigo, teste ou ferimento use a carga completa abaixo. Em conversa, pausa ou descanso: um detalhe no corpo basta; o estilo escolhido pode respirar sem forçar pânico a cada turno.',
  'ANCORAGEM BIOLÓGICA — sob tensão, corpo involuntário: respiração presa, dor aguda, calafrio na espinha, mãos tremendo, batimento abafado, suor. Em calma, um sinal leve (ombro, respiração, peso na mão). Corpo observável. PROIBIDO rotular emoção ("assustador", "você sente medo").',
  'SENTIDOS CRUS — sob tensão: ferrugem, mofo, pólvora, suor azedo, gosto de sangue/poeira/bile, texturas ásperas/nojentas, sons molhados/abafados/estridentes. Em calma: um sentido que importa. Chegam pelo corpo de você, não por panorama.',
  'VISÃO DE TÚNEL — sob tensão NÃO há vista panorâmica. Só microdetalhes a centímetros ou o foco de sobrevivência (trinco, bota, fagulha). Você não sabe o quadro geral. Em calma pode haver um pouco mais de espaço, ainda a partir de você.',
  'ZERO ABSTRAÇÃO — PROIBIDO adjetivos de juízo: assustador, aterrorizante, caótico, épico, horrível. Pânico só por ação física concreta, objetos que quebram, movimento desajeitado.',
  'AÇÃO DESAJEITADA — sob pressão: tropeça, coisas caem, a voz falha, comunicação bagunçada. Sem coreografia de filme.',
  'RITMO CARDÍACO — frases curtas e secas. Alta tensão = muitos pontos, fôlego curto. Calma = frases um pouco mais longas ainda concretas. Sem aparte poético ou filosófico.',
].join('\n');
const NARRATION_POV_LOCK = `Narre em segunda pessoa ("você"); a câmera é o corpo do jogador — magnética, atrás/dentro dos olhos. O primeiro sujeito gramatical é o campo sensorial do jogador (mão, ombro, visão), nunca um NPC. NPCs entram a partir de você ("À sua frente…", "no canto do olho…"). Proibido: "O subordinado aperta… Ele solta um suspiro…" ou abrir com "o transeunte" / "a figura encapuzada" como herói do parágrafo. ${NARRATION_VISION_LOCK} ${NARRATION_VISCERAL_LOCK}`;
export const NARRATION_STYLES = {
  "cinematic": {
    "label": "Cinematográfico",
    "icon": "◈",
    "description": "Cenas visuais, cortes precisos e diálogos com presença.",
    "instruction": `Tom: cortes visuais, ações concretas, diálogo com presença — sem jargão de roteiro. A trava visceral prevalece. ${NARRATION_POV_LOCK}`,
    "sample": "A palma cola na madeira. A porta bate. O ar trava no peito. À sua frente, dois dedos no selo. Cera fria. Ferrugem. A carta encosta na sua pele. Você não vê o corredor. Os passos param."
  },
  "literary": {
    "label": "Literário",
    "icon": "✒",
    "description": "Prosa expressiva, subtexto e personagens com camadas.",
    "instruction": `Tom: um gesto específico, subtexto no corpo — sem prosa poética, sem conto em terceira pessoa. A trava visceral prevalece. ${NARRATION_POV_LOCK}`,
    "sample": "Sua mão ainda aberta. A carta desliza até você. Cera. Dedos na borda. Suor azedo. O selo no seu campo — intacto. As mãos, não. No canto do olho, a cadeira. O ar não desce."
  },
  "dark": {
    "label": "Sombrio",
    "icon": "☾",
    "description": "Suspense, incerteza e perigo sugerido.",
    "instruction": `Tom: pistas no corpo e no que chega aos sentidos — não rotule medo nem imponha violência gratuita. A trava visceral prevalece. ${NARRATION_POV_LOCK}`,
    "sample": "O peso no colo. A carta encosta em você. Cera seca. A capa pingue no joelho. Frio na espinha. O mesmo símbolo da sua porta. À sua frente, os olhos dele. O batimento abafado. Você não vê a rua."
  },
  "light": {
    "label": "Leve e espirituoso",
    "icon": "☀",
    "description": "Aventura calorosa, humor de situação e descobertas.",
    "instruction": `Tom: humor de situação pelo corpo desajeitado — sem ridicularizar o jogador nem virar piada o que é sério. A trava visceral prevalece. ${NARRATION_POV_LOCK}`,
    "sample": "À sua frente, a carta. Ele ensaiou a solenidade. Pão cai da manga no seu colo. Você ergue a mão tarde demais. A voz dele falha. Ele: \"A correspondência chegou intacta. O almoço teve complicações.\" Farelo na palma. Mofo no pão."
  },
  "epic": {
    "label": "Épico",
    "icon": "⚑",
    "description": "Decisões marcantes e um mundo maior que o herói.",
    "instruction": `Tom: peso nas escolhas pelo que o corpo alcança — escale aos poucos, sem profecia, sem adjetivo de juízo. A trava visceral prevalece. ${NARRATION_POV_LOCK}`,
    "sample": "Sua mão vazia. Os sinos. A carta não toca a mesa. O ar trava. À sua frente, você vê o queixo dele e uma fresta da praça. Ele: \"Há uma cópia para cada portão. Esta é a última.\" Suor nas costas. O selo corta a pele."
  },
  "intimate": {
    "label": "Íntimo e dramático",
    "icon": "◇",
    "description": "Relações, silêncios e conversas que importam.",
    "instruction": `Tom: relações e silêncios no espaço entre os corpos — sem rotular emoção do jogador, forçar romance ou falar por ele. A trava visceral prevalece. ${NARRATION_POV_LOCK}`,
    "sample": "O envelope na sua mão. Papel áspero. À sua frente, o olhar dele no retrato da lareira. A voz falha. Ele: \"Você ainda guarda isso?\" O papel entre os dois. Suas mãos tremem no envelope."
  }
};
export const NARRATION_LENGTHS = { short: { label: 'Curta', instruction: 'Cerca de 80–140 palavras; uma cena focada. Mesmo curto: ancoragem biológica, sentidos crus, visão de túnel, frases curtas. Menos frases, não menos corpo.' }, balanced: { label: 'Equilibrada', instruction: 'Cerca de 200–320 palavras, com espaço para diálogo. Ritmo cardíaco: frases curtas e secas; alta tensão = muitos pontos.' }, rich: { label: 'Detalhada', instruction: 'Cerca de 300–450 palavras, sem avançar além de decisões do jogador. Detalhe é micro (centímetros), não panorama.' } };
export const NARRATION_PACES = { slow: { label: 'Contemplativo', instruction: 'Dê tempo para o corpo e os sentidos. Não invente urgência a cada turno. Sem aparte poético.' }, balanced: { label: 'Natural', instruction: 'Alterne ação, conversa e descanso conforme a cena. Tensão = frases curtas; descanso ainda pelo corpo, não por resumo.' }, fast: { label: 'Ágil', instruction: 'Entre perto do momento decisivo, reduza transições e preserve oportunidades de agir. Fôlego curto, muitos pontos.' } };
export function normalizeNarration(value = {}) {
  return { style: Object.hasOwn(NARRATION_STYLES, value?.style) ? value.style : 'cinematic', length: Object.hasOwn(NARRATION_LENGTHS, value?.length) ? value.length : 'balanced', pace: Object.hasOwn(NARRATION_PACES, value?.pace) ? value.pace : 'balanced' };
}
export const NARRATION_PRESENCE = [
  'POV — A CÂMERA É O JOGADOR. Narre em segunda pessoa ("você"). Magnética: atrás/dentro dos olhos. Vale em TODA mesa (save antigo, preset, Westeros, Bleach, mundo custom) no próximo turno — não é opção da campanha.',
  NARRATION_VISION_LOCK,
  NARRATION_VISCERAL_LOCK,
  'O primeiro sujeito gramatical da resposta — e de cada parágrafo da narração principal — é o campo sensorial do jogador (mão, ombro, visão, o que chega aos olhos) ou o que está colado nele. Nunca um NPC.',
  'PROIBIDO como herói do parágrafo: "O subordinado aperta os documentos contra o peito… Ele solta um suspiro… olhando por cima do seu ombro…" — câmera no NPC. CERTO: "Os documentos encostam no seu peito. À sua frente, os olhos castanhos se estreitam. No canto do olho, ele olha por cima do seu ombro."',
  'NPCs aparecem a partir de você: "À sua frente…", "no canto do olho…", "Você ouve a bota no cascalho." Proibido: "O transeunte desfila…", "A figura encapuzada…", "O subordinado…" como sujeito de abertura sem âncora em você.',
  'Narração principal = olhos do jogador. Um cartão/aparte rotulado (fora do fluxo da cena) pode usar terceira pessoa; nunca substitua a cena principal.',
  'PRESENÇA — o jogador está dentro da cena.',
  'Comece no instante da última ação do jogador; nunca abra com clima genérico ou tour ("O sol se põe", "Você está em…").',
  'Mostre o preço ou o ganho concreto dessa ação — o mundo reage. Em calma um detalhe sensorial; sob tensão, corpo involuntário e sentidos crus (microdetalhes, não panorama).',
  'A cena muda por causa dessa ação; NPCs olham, esperam ou interrompem o jogador com agenda própria — sempre vistos de você.',
  'MESA COMO CONVERSA — com gente na cena, a resposta vive em falas Nome: "…" e reações curtas, não em resumo do narrador. Quem está à frente quer algo e responde ao que você fez ou disse.',
  'ELENCO SÓ DA CENA — fale apenas por pessoas já presentes nesta história (cena atual, relacionamentos, memória). PROIBIDO inventar capataz, mensageiro, marujo, curandeira ou qualquer cargo de exemplo se eles não estiverem aqui. Exemplos de formato no prompt NÃO são personagens da mesa.',
  'Um conflito na sua cara — uma aposta visível por vez: alguém quer algo, espera a sua palavra, ou um obstáculo concreto está na sua frente. Não empilhe três crises no mesmo turno.',
  'Corpo observável sem rotular emoção ("você sente medo", "assustador"); nunca fale, pense ou decida pelo jogador. Sob tensão: respiração presa, suor, tremor. Em calma: um sinal basta.',
  'Nunca invente diálogo para o personagem do jogador.',
  'Sentidos crus e visão de túnel sob tensão: ferrugem, mofo, pólvora, trinco, bota — não lista decorativa nem vista panorâmica.',
  'Feche frases e o turno: situação viva que o jogador pode responder. Não corte no meio ("sob o…"). Sem menus numerados; não faça cliffhanger em toda resposta.',
  'Não repita a abertura, metáfora ou estrutura da resposta anterior. O exemplo sensorial (suor, ferrugem, palma, cera) é tipo de detalhe, não um cardápio para usar de novo.'
].join('\n');

const ECHO_MARKS = ['suor', 'ferrugem', 'mofo', 'pólvora', 'polvora', 'batimento', 'calafrio', 'bile', 'cera', 'palma', 'respiração presa', 'respiracao presa'];

function visibleLine(entry) {
  if (typeof entry === 'string') return entry;
  const kind = entry?.type || entry?.role;
  if (kind && !['gm', 'assistant', 'auto', 'user'].includes(kind)) return '';
  return String(entry?.text || entry?.content || '');
}

function lastPlayerLine(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const entry = list[i];
    const kind = entry?.type || entry?.role;
    if (!['user', 'auto'].includes(kind)) continue;
    const clean = visibleLine(entry).replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length < 12) continue;
    if (/^resultado do teste/i.test(clean)) continue;
    return clean;
  }
  return '';
}

function playerIsSpeaking(text) {
  const line = String(text || '');
  if (/[«""']/.test(line)) return true;
  if (/:\s*[«""']/.test(line)) return true;
  return /^(digo|falo|respondo|pergunto|ordeno|grito|sussurro|exclamo)\b/i.test(line);
}

/** Última ação do jogador → o Mestre deve narrar a consequência, não um novo tour. */
export function consequenceDirection(messages) {
  const clean = lastPlayerLine(messages);
  if (!clean) return '';
  if (playerIsSpeaking(clean)) {
    return [
      'CONSEQUÊNCIA DA FALA.',
      `O jogador disse: "${clean.slice(0, 160)}".`,
      'Responda primeiro com a fala de quem ouviu (Nome: "…") — tom, pausa, pergunta ou recusa. Depois um gesto curto. Não ignore a fala. Uma aposta visível por vez.',
    ].join(' ');
  }
  return [
    'CONSEQUÊNCIA DA AÇÃO.',
    `A última jogada foi: "${clean.slice(0, 160)}".`,
    'Comece pela reação do mundo a isso — ganho, preço ou mudança concreta. Se alguém está na cena, essa pessoa reage ou fala. Não ignore a ação. Uma aposta visível por vez.',
  ].join(' ');
}

/** Empurra a mesa para conversa viva entre personagens, não relatório. */
export function conversationDirection(messages, voices = []) {
  const clean = lastPlayerLine(messages);
  const speaking = clean && playerIsSpeaking(clean);
  const cast = (Array.isArray(voices) ? voices : []).filter(Boolean).slice(0, 3);
  return [
    'IMERSÃO POR CONVERSA.',
    'Com NPCs na cena, a batida principal é diálogo: linhas Nome: "fala". Entre falas, só um gesto curto visto por você — nunca um parágrafo de resumo no lugar da pessoa.',
    'Ritmo de conversa: alguém fala → reação breve → outra fala ou silêncio carregado. Duas ou três falas curtas valem mais que um bloco explicativo.',
    'Cada voz carrega a personalidade gravada daquela pessoa (desejo, jeito de falar, tique). Atitude (Hostil/Suspeito/Neutral/Amigável) muda distância e cortesia — não apaga quem ela é.',
    cast.length
      ? `Continue só com quem já está nesta conversa: ${cast.join(', ')}. Não troque o elenco sem motivo e não traga cargos de exemplo.`
      : 'Se ainda não há falante nomeado, use alguém coerente com ESTE mundo e ESTA cena — nunca um capataz/mensageiro/marujo genérico por hábito do prompt.',
    speaking
      ? 'O jogador falou agora — a PRIMEIRA linha da resposta é a fala de quem ouviu (alguém já presente). Depois, se fizer sentido, outro NPC presente pode cortar ou apoiar em uma linha. Feche esperando a palavra do jogador.'
      : 'Se a cena é social, abra ou feche com alguém da cena falando, perguntando ou calando de propósito. Feche na fala ou no olhar de quem espera a sua palavra.',
    'Proibido monólogo do narrador no lugar das pessoas. Proibido inventar a fala do jogador. Proibido "ele explica que…". Proibido importar elenco de outra história ou dos exemplos do sistema.',
  ].filter(Boolean).join(' ');
}

/** Nomes concretos do que as últimas falas já usaram, para o turno seguinte trocar de detalhe. */
export function repetitionDirection(messages) {
  const recent = [];
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0 && recent.length < 3; i -= 1) {
    const clean = visibleLine(list[i]).replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length < 28) continue;
    recent.push(clean);
  }
  if (!recent.length) return '';
  const blob = recent.join(' ').toLowerCase();
  const used = ECHO_MARKS.filter((mark) => blob.includes(mark));
  const openings = recent.slice(0, 2).map((line) => line.slice(0, 80));
  return [
    'NÃO REPITA O TURNO ANTERIOR.',
    `Não abra igual e não recicle a mesma imagem: ${openings.map((line) => `"${line}"`).join(' | ')}.`,
    used.length ? `Já saiu nesta cena — troque o detalhe: ${used.join(', ')}.` : '',
    'Entre pela consequência nova. Outro objeto, outro sentido, outro gesto.',
  ].filter(Boolean).join(' ');
}

export function buildNarrationDirection(value, recent, options = {}) {
  const n = normalizeNarration(value);
  const style = NARRATION_STYLES[n.style];
  const voices = options.voices || [];
  return [
    'DIREÇÃO DE NARRAÇÃO — estas preferências prevalecem sobre instruções anteriores de estilo, tamanho e ritmo, mas nunca alteram regras de dados, fatos, canon ou agência do jogador. A NARRAÇÃO VISCERAL é trava global: prevalece sobre tom literário, leve ou "épico" do seletor.',
    NARRATION_PRESENCE,
    style.instruction, NARRATION_LENGTHS[n.length].instruction, NARRATION_PACES[n.pace].instruction,
    `MODELO DE VOZ — copie só o ritmo (frase curta, câmera em você). Não copie a cena do exemplo (carta, cera, palma, pão, selo) nem o elenco dele. Capataz, mensageiro e cargos de exemplo NÃO entram se não estiverem nesta história. Estilo literário/cinematográfico = corte e detalhe, NÃO terceira pessoa de conto e NÃO prosa poética:\n${style.sample}`,
    consequenceDirection(recent),
    conversationDirection(recent, voices),
    repetitionDirection(recent),
    'Uma falha muda a situação, não deve apenas repetir o mesmo bloqueio. Ação desajeitada sob pressão: coisas caem, a voz falha, o corpo atrapalha.',
    'Cada cena deve servir a uma intenção ou pergunta concreta, sem inventar objetivos para o jogador.',
    'Ritmo cardíaco: frases curtas e secas. Alta tensão = muitos pontos, fôlego curto. Sem aparte poético ou filosófico.',
    'Nos diálogos, cada NPC quer algo específico. Mostre subtexto por uma pausa, gesto ou resposta indireta quando fizer sentido; evite que todos falem por enigmas. A mesa deve parecer uma conversa entre pessoas.',
    'As escolhas devem produzir diferenças reconhecíveis. Mostre os riscos que o personagem poderia perceber pelo corpo; não transforme toda surpresa em punição arbitrária. Dê resolução a perguntas antigas antes de acumular mistérios novos.',
    'Reutilize fatos, nomes e relações já estabelecidos antes de criar novos. A imagem do turno anterior não se reaproveita: outro objeto, outro sentido, outro gesto. NPCs têm objetivos e limites de conhecimento; não adivinham segredos.',
    'Evite elogios automáticos e frases genéricas de destino. Proibido: assustador, aterrorizante, caótico, épico, horrível.',
    'Nunca avance uma decisão pelo jogador, determine seus sentimentos ou conceda sucesso para agradá-lo. Humor e drama respeitam a escala atual do personagem — sem adjetivo de pânico.'
  ].filter(Boolean).join('\n');
}

export const START_BEAT_PREFIX = '[INÍCIO DA AVENTURA]';
export function isStartBeatMessage(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  if (t.startsWith(START_BEAT_PREFIX)) return true;
  return t.includes('NARRAÇÃO VISCERAL') && /A aventura começa/.test(t);
}
export function startBeatDisplay() {
  return 'A aventura começa.';
}

function startAbilityNote(camp = {}) {
  const bundle = camp?.specialAbility;
  if (!bundle || bundle.enabled !== true) return '';
  const list = Array.isArray(bundle.abilities) && bundle.abilities.length
    ? bundle.abilities
    : [bundle];
  const active = list.filter((ability) => String(ability?.name || '').trim() && String(ability?.description || '').trim());
  if (!active.length) return '';
  const lines = active.map((ability, index) => {
    const name = String(ability.name || '').trim();
    const description = String(ability.description || '').trim();
    const limits = String(ability.limits || '').trim();
    const secret = ability.secret !== false ? 'secreta' : 'sem segredo obrigatório';
    return `${index + 1}) ${name} (${secret}) — ${description}${limits ? ` Limites: ${limits}.` : ''}`;
  });
  return `Habilidades especiais já escolhidas: ${lines.join(' ')} Não negue; não revele sem ação do jogador.`;
}
export function sanitizeStartDisplay(disp = []) {
  return (Array.isArray(disp) ? disp : []).map((message) => {
    if (!message || (message.type !== 'user' && message.type !== 'auto')) return message;
    if (!isStartBeatMessage(message.text)) return message;
    return { ...message, type: 'time_skip_ctx', text: startBeatDisplay() };
  });
}

export function buildStartPrompt(camp = {}) {
  const name = String(camp.charName || '').trim() || 'o personagem';
  const world = String(camp.world || '').trim() || 'este mundo';
  const moment = String(camp.storyStartPoint || '').trim();
  const parts = [START_BEAT_PREFIX];

  if (moment) {
    parts.push(
      `CENA INICIAL OBRIGATÓRIA — entre DENTRO deste instante, não o resuma nem troque por outro prólogo: ${moment}`,
      'O jogador já está no conflito: alguém pede, ameaça ou espera a palavra dele AGORA. Não abra com tour, clima genérico ou "há muitos anos".'
    );
    if (camp.isExistingChar) {
      parts.push(`Posicione ${name} exatamente neste momento do universo "${world}", respeitando o lore e o canon oficial da obra.`);
    } else {
      parts.push(`${name} é personagem original em "${world}" — coerente com o lore e o canon, sem substituir protagonistas canônicos.`);
    }
  } else if (camp.isKnownIP && !camp.isExistingChar) {
    parts.push(
      `A aventura começa no primeiro instante vivido de ${name} no universo de "${world}" — personagem original, fora do elenco da obra.`,
      `Abra num lugar e era plausíveis DESTE mundo (vilas, cidades, rotas, instituições e física reconhecíveis de "${world}") — nunca uma estrada de terra genérica que serviria a qualquer fantasia.`,
      'Caia num primeiro batimento concreto deste mundo; não descreva o cenário de fora.'
    );
  } else {
    parts.push(
      `A aventura começa no primeiro instante vivido de ${name} no universo de "${world}".`,
      'Caia num primeiro batimento concreto deste mundo; não descreva o cenário de fora.'
    );
  }

  if (camp.charPersonality) {
    parts.push(`Personalidade do jogador (já vaza na postura e nas reações dos outros): ${camp.charPersonality}`);
  }
  if (camp.supportingCast) {
    parts.push(`Elenco já na abertura — use estas vozes, não invente capataz genérico: ${camp.supportingCast}`);
  }
  const abilityNote = startAbilityNote(camp);
  if (abilityNote) parts.push(abilityNote);

  if (camp.isKnownIP) {
    parts.push(
      `Permaneça na física, nos lugares nomeados e no sistema de poder de "${world}". Inventar só extras locais; se não souber um fato canônico, fique no genérico-local.`,
      `Abra o jogador na margem de uma trama deste universo. Se já houver trama na ficha, use-a; senão registre [TRAMA:título|gancho]. Não o coloque no lugar do protagonista da obra.`
    );
  } else {
    parts.push(
      `Abra 1 trama própria deste mundo com [TRAMA:título|gancho] se a história ainda não tiver nenhuma.`
    );
  }

  if (camp.ordinaryCharacter) {
    parts.push(
      abilityNote
        ? 'O jogador é pessoa comum no mundo EXCETO pela habilidade especial escolhida acima — sem linhagem secreta extra nem protagonismo canônico.'
        : 'O jogador é uma pessoa comum: sem profecia, linhagem secreta ou poderes não estabelecidos.'
    );
  }

  parts.push(
    NARRATION_VISION_LOCK,
    NARRATION_VISCERAL_LOCK,
    'A câmera é o jogador — magnética, atrás/dentro dos olhos. Vale em toda campanha, inclusive save antigo, sem recriar a mesa. Narre em segunda pessoa ("você"). O primeiro sujeito gramatical deve ser o campo sensorial do jogador (mão, ombro, visão) ou o que está colado no corpo — nunca um NPC como protagonista.',
    'NPCs aparecem a partir de você ("À sua frente…", "no canto do olho…"). Proibido abrir com "O subordinado…", "O transeunte desfila…" ou "A figura encapuzada…" sem âncora no jogador.',
    'Narre a partir do corpo involuntário: respiração presa, suor, tremor, o que chega aos olhos, ouvidos, pele ou olfato de onde o personagem está. Sentidos crus. Visão de túnel.',
    'Microdetalhes a centímetros, não panorama. Um conflito na sua cara neste instante: um NPC ou o mundo já quer algo do jogador.',
    'INÍCIO VIVO — nas primeiras batidas alguém da cena fala no formato Nome: "fala", com personalidade (desejo + tique). Grave [NPC:Nome|função; personalidade; local; fatos]. Proibido prólogo robótico, lista de cenário ou "Bem-vindo à aventura".',
    'Nunca abra com "Você está em…". Nunca invente diálogo, pensamento ou decisão para o personagem do jogador. Sem menus numerados. Sem adjetivos de juízo (assustador, aterrorizante, caótico, épico, horrível). Frases curtas e secas.',
    'Feche o turno na fala ou no olhar de quem espera a sua palavra — o jogador precisa se envolver agora. Não corte no meio.'
  );

  return parts.join(' ');
}
