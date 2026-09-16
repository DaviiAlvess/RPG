const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const TAG_KEYS = {
  cargo: ['cargo'],
  situacao: ['situacao'],
  habilidade: ['habilidade'],
};

function lastTag(text, names) {
  let value = '';
  for (const match of String(text || '').matchAll(/\[([^:\]]+):([^\]]+)\]/g)) {
    const key = normalize(match[1]);
    if (!names.includes(key)) continue;
    const next = String(match[2] || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    if (next) value = next;
  }
  return value;
}

function freezeOrigin(currentTitle, nextTitle, originTitle) {
  const current = String(currentTitle || '').trim();
  const next = String(nextTitle || '').trim();
  const origin = String(originTitle || '').trim();
  if (next && current && next !== current && !origin) return current;
  return origin;
}

/** Lê [CARGO:], [SITUAÇÃO:] e [HABILIDADE:] sem mutar a campanha. */
export function parseIdentityTags(text, campaign = {}) {
  const currentTitle = String(campaign.charTitle || '').trim();
  const nextTitle = lastTag(text, TAG_KEYS.cargo) || currentTitle;
  return {
    charTitle: nextTitle,
    charOriginTitle: freezeOrigin(currentTitle, nextTitle, campaign.charOriginTitle),
    charSituation: lastTag(text, TAG_KEYS.situacao) || String(campaign.charSituation || '').trim(),
    charSkills: lastTag(text, TAG_KEYS.habilidade) || String(campaign.charSkills || '').trim(),
  };
}

/** Ajuste manual na ficha: mesmos campos que as tags, com origem congelada na troca de cargo. */
export function applyManualIdentity(campaign = {}, edits = {}) {
  const currentTitle = String(campaign.charTitle || '').trim();
  const nextTitle = String(edits.charTitle ?? campaign.charTitle ?? '').replace(/\s+/g, ' ').trim();
  return {
    charTitle: nextTitle,
    charOriginTitle: freezeOrigin(currentTitle, nextTitle, edits.charOriginTitle ?? campaign.charOriginTitle),
    charSituation: String(edits.charSituation ?? campaign.charSituation ?? '').trim(),
    charSkills: String(edits.charSkills ?? campaign.charSkills ?? '').trim(),
    charBg: String(edits.charBg ?? campaign.charBg ?? '').trim(),
    storyStartPoint: String(edits.storyStartPoint ?? campaign.storyStartPoint ?? '').trim(),
  };
}

export function identityPromptLines(c = {}) {
  const originTitle = String(c.charOriginTitle || '').trim();
  const currentTitle = String(c.charTitle || '').trim();
  const originShown = originTitle && originTitle !== currentTitle ? originTitle : '';
  return [
    'CONDIÇÃO ATUAL (como o mundo trata o jogador NESTE turno — prevalece sobre a origem para apresentar o personagem):',
    currentTitle ? `- Cargo atual: ${currentTitle}` : '- Cargo atual: (ainda o da criação, até a história confirmar outro)',
    c.charSituation ? `- Situação atual: ${c.charSituation}` : '',
    c.charSkills ? `- Talentos atuais: ${c.charSkills}` : '',
    'ORIGEM E COMEÇO (referência permanente — NÃO apague; use se o jogador perguntar pelo início, por quem ele foi, ou por fatos antigos):',
    originShown ? `- Cargo de origem: ${originShown}` : '',
    c.charBg ? `- História de origem: ${c.charBg}` : '',
    c.storyStartPoint ? `- Premissa inicial da campanha: ${c.storyStartPoint}` : '',
    'NPCs e narração apresentam o jogador pelo cargo e pela situação atuais. Origem, premissa inicial e MEMÓRIA DA CAMPANHA valem para perguntas sobre o começo. Quem o conhecia no cargo antigo pode lembrar disso; estranhos usam o cargo de agora.',
    'Quando cargo, função, situação ou ofício mudarem de forma confirmada na cena, emita as tags ocultas só na mudança: [CARGO:novo título], [SITUAÇÃO:frase curta], [HABILIDADE:talentos atuais]. Se a memória ou as mensagens recentes já confirmarem outro cargo ou situação do que está listado acima, narre pelo atual e emita a tag uma vez para gravar. Nunca escreva essas tags no diálogo falado.',
  ].filter(Boolean);
}

export function identityTagList() {
  return '[CARGO:novo título], [SITUAÇÃO:frase curta], [HABILIDADE:talentos atuais]';
}

export function stripIdentityTags(text) {
  return String(text || '').replace(/\[(CARGO|SITUA[CÇ][AÃ]O|SITUACAO|HABILIDADE):([^\]]+)\]/gi, '');
}
