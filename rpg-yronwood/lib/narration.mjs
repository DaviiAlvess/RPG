export const NARRATION_VISION_LOCK = 'A narração principal é SEMPRE a visão do personagem do jogador — câmera magnética, atrás/dentro dos olhos: mão, ombro, o que chega à visão. NPCs falam no formato Nome: "fala".';
export const NARRATION_VISCERAL_LOCK = [
  'NARRAÇÃO VISCERAL — trava global, não é estilo extra e não é opção da campanha. Vale em TODA mesa (save antigo, preset, Westeros, Bleach, mundo custom) no próximo turno, sem recriar. Narre em segunda pessoa ("você"). Nunca fale, pense, escolha ou decida pelo jogador.',
  'RESPIRAÇÃO DA CENA — sob tensão, perigo, teste ou ferimento use a carga completa abaixo. Em conversa, pausa ou descanso: um detalhe no corpo basta; o estilo escolhido pode respirar sem forçar pânico a cada turno.',
  'ANCORAGEM BIOLÓGICA — sob tensão, o corpo reage sozinho (respiração presa e afins), mas cada reação é ESPECÍFICA deste momento e deste corpo — nunca a mesma fórmula de novo. Em calma, um sinal leve basta. Corpo observável. PROIBIDO rotular emoção ("assustador", "você sente medo").',
  'SENTIDOS CRUS — o detalhe nasce DESTE lugar, DESTA época e DESTE instante: o material que está ao alcance (ferrugem só se houver ferro velho ali), o clima, o que a pessoa à frente carrega, o som que só existe nesta cena. Varie o sentido (tato, som, cheiro, temperatura, peso, luz) e não use gosto na boca, pé afundando no chão ou suor como muleta. Em calma: um sentido que importa. Chegam pelo corpo de você, não por panorama.',
  'VISÃO DE TÚNEL — sob tensão NÃO há vista panorâmica. Só microdetalhes a centímetros ou o foco de sobrevivência (trinco, bota, fagulha). Você não sabe o quadro geral. Em calma pode haver um pouco mais de espaço, ainda a partir de você.',
  'ZERO ABSTRAÇÃO — PROIBIDO adjetivos de juízo: assustador, aterrorizante, caótico, épico, horrível. Pânico só por ação física concreta, objetos que quebram, movimento desajeitado.',
  'AÇÃO DESAJEITADA — sob pressão: tropeça, coisas caem, a voz falha, comunicação bagunçada. Sem coreografia de filme.',
  'RITMO CARDÍACO — o ritmo acompanha o coração da cena: na tensão, frases curtas e secas, muitos pontos, fôlego curto; na conversa, falas e reações curtas; na calma, na descoberta e no descanso, frases mais longas e fluidas, ainda concretas. Variar o comprimento das frases é obrigatório: texto todo picado cansa tanto quanto texto todo arrastado. Sem aparte poético ou filosófico.',
].join('\n');
const NARRATION_POV_LOCK = `Narre em segunda pessoa ("você"); a câmera é o corpo do jogador — magnética, atrás/dentro dos olhos. O primeiro sujeito gramatical é o campo sensorial do jogador (mão, ombro, visão), nunca um NPC. NPCs entram a partir de você ("À sua frente…", "no canto do olho…"). Proibido: "O subordinado aperta… Ele solta um suspiro…" ou abrir com "o transeunte" / "a figura encapuzada" como herói do parágrafo. ${NARRATION_VISION_LOCK} ${NARRATION_VISCERAL_LOCK}`;
export const NARRATION_STYLES = {
  "cinematic": {
    "label": "Cinematográfico",
    "icon": "◈",
    "description": "Cenas visuais, cortes precisos e diálogos com presença.",
    "instruction": `Tom: cortes visuais, ações concretas, diálogo com presença — sem jargão de roteiro. A trava visceral vale sob tensão; o TEMPO DESTA CENA decide o ritmo. ${NARRATION_POV_LOCK}`,
    "sample": "A porta bate atrás de você e o eco ainda corre pelo corredor quando a carta escorrega da mesa para a sua mão: papel grosso, cera fria, um selo que você conhece. À sua frente, dois dedos tamborilam na madeira. Param. Ele: \"Abra. Agora.\" Lá fora, os passos também param."
  },
  "literary": {
    "label": "Literário",
    "icon": "✒",
    "description": "Prosa expressiva, subtexto e personagens com camadas.",
    "instruction": `Tom: um gesto específico, subtexto no corpo — sem prosa poética, sem conto em terceira pessoa. A trava visceral vale sob tensão; o TEMPO DESTA CENA decide o ritmo. ${NARRATION_POV_LOCK}`,
    "sample": "Você segura a carta mais tempo do que precisa. O papel é bom demais para notícia boa, e a cera do selo ainda guarda a marca de um polegar apressado. Do outro lado da mesa, ela finge olhar o fogo. Suas mãos não fingem nada. Ela: \"Você sabia que isso ia chegar.\" Não é uma pergunta."
  },
  "dark": {
    "label": "Sombrio",
    "icon": "☾",
    "description": "Suspense, incerteza e perigo sugerido.",
    "instruction": `Tom: pistas no corpo e no que chega aos sentidos — não rotule medo nem imponha violência gratuita. A trava visceral vale sob tensão; o TEMPO DESTA CENA decide o ritmo. ${NARRATION_POV_LOCK}`,
    "sample": "A chuva escorre do capuz para dentro da sua gola enquanto você vira o envelope na mão. Nenhum nome. Só o selo — o mesmo símbolo riscado na sua porta ontem. O beco fica quieto de um jeito errado. Atrás de você, uma tábua range. Depois, nada."
  },
  "light": {
    "label": "Leve e espirituoso",
    "icon": "☀",
    "description": "Aventura calorosa, humor de situação e descobertas.",
    "instruction": `Tom: humor de situação pelo corpo desajeitado — sem ridicularizar o jogador nem virar piada o que é sério. A trava visceral vale sob tensão; o TEMPO DESTA CENA decide o ritmo. ${NARRATION_POV_LOCK}`,
    "sample": "Você estende a mão para a carta no exato momento em que ele tenta uma reverência solene — e o pão escondido na manga dele cai bem no seu colo. Farelo no selo. Ele pigarreia, vermelho até as orelhas. Ele: \"A correspondência chegou intacta. O almoço teve complicações.\" Você tira o farelo da cera com a unha."
  },
  "epic": {
    "label": "Épico",
    "icon": "⚑",
    "description": "Decisões marcantes e um mundo maior que o herói.",
    "instruction": `Tom: peso nas escolhas pelo que o corpo alcança — escale aos poucos, sem profecia, sem adjetivo de juízo. A trava visceral vale sob tensão; o TEMPO DESTA CENA decide o ritmo. ${NARRATION_POV_LOCK}`,
    "sample": "Os sinos da cidade começam a tocar, um depois do outro, enquanto a carta passa da mão dele para a sua. O selo é real. O peso também. Pela janela, você vê a praça se encher de gente que ainda não sabe de nada. Ele: \"Há uma cópia para cada portão. Esta é a última.\" A cera estala sob o seu polegar."
  },
  "intimate": {
    "label": "Íntimo e dramático",
    "icon": "◇",
    "description": "Relações, silêncios e conversas que importam.",
    "instruction": `Tom: relações e silêncios no espaço entre os corpos — sem rotular emoção do jogador, forçar romance ou falar por ele. A trava visceral vale sob tensão; o TEMPO DESTA CENA decide o ritmo. ${NARRATION_POV_LOCK}`,
    "sample": "O envelope ainda está quente da mão dele quando chega à sua. Por um momento, nenhum dos dois solta. Você reconhece a letra antes de ler o nome — e ele percebe que você reconheceu. Ele: \"Você ainda guarda as outras?\" A lenha estala na lareira. Você não responde logo."
  }
};
export const NARRATION_LENGTHS = { short: { label: 'Curta', instruction: 'Cerca de 80–140 palavras; uma cena focada. Mesmo curto: ancoragem biológica, sentidos crus, visão de túnel, frases curtas. Menos frases, não menos corpo.' }, balanced: { label: 'Equilibrada', instruction: 'Cerca de 200–320 palavras, com espaço para diálogo. Ritmo cardíaco: frases curtas e secas; alta tensão = muitos pontos.' }, rich: { label: 'Detalhada', instruction: 'Cerca de 300–450 palavras, sem avançar além de decisões do jogador. Detalhe é micro (centímetros), não panorama.' } };
export const NARRATION_PACES = { slow: { label: 'Contemplativo', instruction: 'Dê tempo para o corpo, os sentidos e os silêncios. Não invente urgência a cada turno. Deixe as frases respirarem na calma. Sem aparte poético.' }, balanced: { label: 'Natural', instruction: 'Alterne ação, conversa e descanso conforme a cena. Tensão = frases curtas; calma = frases que respiram. Tempo morto sem escolha nem risco (trajeto, espera, rotina) vira corte de cena: uma ou duas frases e já o próximo momento que importa.' }, fast: { label: 'Ágil', instruction: 'Entre perto do momento decisivo, corte transições e tempo morto em uma frase e preserve oportunidades de agir. Fôlego curto, muitos pontos.' } };
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
  'Corpo observável sem rotular emoção ("você sente medo", "assustador"); nunca fale, pense ou decida pelo jogador. Sob tensão, uma reação do corpo específica desta cena; em calma, um sinal basta.',
  'Nunca invente diálogo para o personagem do jogador.',
  'Sentidos crus e visão de túnel sob tensão: microdetalhes tirados do lugar real da cena — não lista decorativa, nem vista panorâmica, nem o mesmo detalhe de sempre.',
  'Feche frases e o turno: situação viva que o jogador pode responder. Não corte no meio ("sob o…"). Sem menus numerados; não faça cliffhanger em toda resposta.',
  'Não repita a abertura, metáfora ou estrutura da resposta anterior. Fórmulas de corpo gastas (gosto de bile ou sangue na boca, pé afundando na lama, coração martelando, calafrio na espinha, suor frio, nó no estômago) só cabem raramente — e nunca duas vezes seguidas.'
].join('\n');

const ECHO_MARKS = ['suor', 'ferrugem', 'mofo', 'pólvora', 'polvora', 'batimento', 'calafrio', 'bile', 'cera', 'palma', 'respiração presa', 'respiracao presa'];

/** Fórmulas de corpo e de ambiente que o modelo tende a repetir em toda resposta. */
export const CLICHE_PATTERNS = [
  { label: 'gosto de bile/sangue/metal na boca', re: /\bbile\b|gosto (de |acido |amargo |metalico )?(de )?(sangue|metal|cobre|ferro|ferrugem|poeira|cinza)|gosto metalico|boca amarga/ },
  { label: 'pé/bota afundando na lama ou na terra', re: /(pes?|botas?|calcanhar|solas?) (afund|atol|escorreg|chafurd)\w*|afund\w* (na|no|em) (lama|barro|terra|lodo|neve|areia)|\blama\b/ },
  { label: 'coração martelando/disparando', re: /coracao (martel|dispar|acelera|esmurr|bate (forte|contra|rapido)|salta|pulsa)\w*|batimento\w*|pulso (dispara|lateja|acelera)/ },
  { label: 'calafrio/arrepio na espinha', re: /calafrio|arrepio|(frio|gelo) (na|pela|percorre a) espinha/ },
  { label: 'suor escorrendo / suor frio', re: /\bsuor\b|\bsua (frio|na nuca)|transpira/ },
  { label: 'respiração presa/falhando', re: /respiracao (presa|falha|curta|trava|engasga)|prende (a|o) (respiracao|folego)|folego (preso|curto|falha)/ },
  { label: 'nó/aperto no estômago ou garganta', re: /\bno (no|na) (estomago|garganta|peito)|estomago (revira|embrulha|aperta|afunda|gela)|aperto no (peito|estomago)/ },
  { label: 'garganta/boca seca', re: /(garganta|boca) (seca|arranha|aperta)/ },
  { label: 'mãos tremendo', re: /maos? (trem|vacil|suam)\w*|tremor nas maos/ },
  { label: 'cheiro de ferrugem/mofo/pólvora', re: /(cheiro|odor|fedor) (de |azedo de )?(ferrugem|mofo|polvora|suor|sangue)|\bferrugem\b|\bmofo\b/ },
  { label: 'zumbido nos ouvidos', re: /zumbido|ouvidos zun/ },
  { label: 'joelhos falhando', re: /joelhos? (falh|ced|fraquej|dobr)\w*/ },
  { label: 'mandíbula travada / dentes cerrados', re: /mandibula (trav|cerr|tensa)\w*|dentes cerrados|range os dentes/ },
  { label: 'ar pesado / silêncio pesado', re: /\bar (pesa|fica pesado|denso|parado)|silencio (pesado|denso|ensurdecedor|espesso)/ },
  { label: 'tropeço', re: /tropec|tropeca/ },
];

const STOP = new Set('a o as os um uma uns umas de do da dos das em no na nos nas por para pra com sem que e ou se seu sua seus suas voce ele ela eles elas isso esse essa este esta aquele aquela lhe ao aos mais mas como quando onde ja nao sim tem ha foi era sao esta estao entre sobre sob ate pelo pela pelos pelas me te nos'.split(' '));
const normText = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function recentNarration(messages, max = 8) {
  const out = [];
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0 && out.length < max; i -= 1) {
    const kind = list[i]?.type || list[i]?.role;
    if (typeof list[i] !== 'string' && !['gm', 'assistant'].includes(kind)) continue;
    const clean = visibleLine(list[i]).replace(/\[[^\]]+\]/g, ' ').replace(/IMAGE_PROMPT:.*$/s, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length >= 28) out.push(clean);
  }
  return out;
}

/** Fórmulas já usadas nas últimas narrações: { label, count }. */
export function usedCliches(messages, max = 8) {
  const recent = recentNarration(messages, max).map(normText);
  return CLICHE_PATTERNS
    .map((c) => ({ label: c.label, count: recent.filter((t) => c.re.test(t)).length, last: c.re.test(recent[0] || '') }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Trechos de 4 palavras que aparecem em duas ou mais narrações recentes (tiques próprios da campanha). */
export function repeatedPhrases(messages, max = 8) {
  const recent = recentNarration(messages, max).map(normText);
  const seen = new Map();
  recent.forEach((text, idx) => {
    const words = text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const local = new Set();
    for (let i = 0; i + 4 <= words.length; i += 1) {
      const gram = words.slice(i, i + 4);
      if (gram.filter((w) => !STOP.has(w) && w.length > 2).length < 2) continue;
      local.add(gram.join(' '));
    }
    for (const g of local) {
      const e = seen.get(g) || new Set();
      e.add(idx);
      seen.set(g, e);
    }
  });
  const hits = [...seen.entries()].filter(([, set]) => set.size >= 2).map(([g, set]) => ({ phrase: g, count: set.size }));
  hits.sort((a, b) => b.count - a.count);
  const picked = [];
  for (const h of hits) {
    if (picked.some((p) => p.phrase.includes(h.phrase.split(' ').slice(1, 3).join(' ')))) continue;
    picked.push(h);
    if (picked.length >= 6) break;
  }
  return picked;
}

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
  const cliches = usedCliches(messages);
  const phrases = repeatedPhrases(messages);
  return [
    'NÃO REPITA O TURNO ANTERIOR.',
    `Não abra igual e não recicle a mesma imagem: ${openings.map((line) => `"${line}"`).join(' | ')}.`,
    used.length ? `Já saiu nesta cena — troque o detalhe: ${used.join(', ')}.` : '',
    cliches.length ? `PROIBIDO NESTA RESPOSTA (fórmulas já gastas nesta mesa): ${cliches.map((c) => c.count > 1 ? `${c.label} (${c.count}x)` : c.label).join('; ')}. Nem com outras palavras: troque por um detalhe que só existe nesta cena.` : '',
    phrases.length ? `Tiques desta campanha — não escreva de novo: ${phrases.map((p) => `"${p.phrase}"`).join(', ')}.` : '',
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
    `MODELO DE VOZ — copie só o ritmo e a câmera em você (frases curtas na tensão, mais longas na calma). Não copie a cena do exemplo (carta, cera, palma, pão, selo) nem o elenco dele. Capataz, mensageiro e cargos de exemplo NÃO entram se não estiverem nesta história. Estilo literário/cinematográfico = corte e detalhe, NÃO terceira pessoa de conto e NÃO prosa poética:\n${style.sample}`,
    options.skipConsequence ? '' : consequenceDirection(recent),
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
