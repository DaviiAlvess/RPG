const nameKey = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export function collectCharacterNames(campaign = {}) {
  const names = new Map();
  const add = value => {
    if (typeof value !== 'string') return;
    const name = value.trim();
    if (!name || name.length > 100 || /[\n\r]/.test(name)) return;
    const key = nameKey(name);
    if (!names.has(key)) names.set(key, name);
  };
  add(campaign.charName);
  Object.keys(campaign.relationships || {}).forEach(add);
  Object.keys(campaign.worldState?.npcs || {}).forEach(add);
  // Old campaigns can have speakers in their history without NPC metadata.
  for (const message of campaign.msgs || []) {
    if (message?.role !== 'assistant' || typeof message.content !== 'string') continue;
    for (const match of message.content.matchAll(/\[NPC:([^|\]\n]+)\|/gi)) add(match[1]);
    for (const match of message.content.matchAll(/^(?:[-*•]\s*)?(?:\*\*)?([\p{L}][\p{L}\p{M} .’'\-]{0,59})(?:\*\*)?:\s*["“«]/gmu)) add(match[1]);
  }
  return [...names.values()];
}
export function buildCharacterNamingDirection(campaign) {
  const names = collectCharacterNames(campaign);
  return [
    'IDENTIDADE DOS PERSONAGENS:',
    `Nomes e identificações já usados nesta campanha (reservados às mesmas pessoas): ${JSON.stringify(names)}.`,
    'Antes de apresentar alguém, decida se é uma pessoa já conhecida ou uma nova. Se já conhecida, preserve nome, história, aparência, função, personalidade e relações; não a recrie como desconhecida.',
    'Para uma pessoa nova inventada, escolha um nome distinto dos já usados, inclusive no primeiro nome. Não use simples mudanças de acento, grafia ou sobrenome para disfarçar repetição.',
    'Varie sonoridade e estrutura dos nomes de acordo com a cultura e o universo. Evite repetir o mesmo pequeno conjunto de nomes genéricos. Não crie parentesco só porque dois nomes se parecem.',
    'Preserve nomes canônicos e personagens existentes mesmo quando houver homônimos legítimos. Distinga essas pessoas com sobrenome ou título; não renomeie ninguém retroativamente.',
    'Figurantes sem importância podem ser identificados pela função, como a guarda da ponte. Dê nome próprio quando fizer sentido para a interação, sem nomear toda pessoa que passa.',
    'Ao introduzir um NPC nomeado, registre [NPC:nome completo|função; personalidade/voz em poucas palavras; local; fatos]. Ao reencontrá-lo, use a mesma identificação e a mesma voz.'
  ].join('\n');
}

function attitudeFor(name, relationships = {}) {
  if (relationships[name]) return relationships[name];
  const key = nameKey(name);
  const hit = Object.keys(relationships).find((current) => nameKey(current) === key);
  return hit ? relationships[hit] : '';
}

/** Personalidade estável do elenco — cada um fala e age como gente, não como fantoche. */
export function buildNpcPersonalityDirection(campaign = {}) {
  const npcs = campaign.worldState?.npcs && typeof campaign.worldState.npcs === 'object'
    ? campaign.worldState.npcs
    : {};
  const relationships = campaign.relationships && typeof campaign.relationships === 'object'
    ? campaign.relationships
    : {};
  const listed = [];
  const seen = new Set();

  for (const [rawName, facts] of Object.entries(npcs).slice(0, 14)) {
    const name = String(rawName || '').trim();
    if (!name) continue;
    const key = nameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const attitude = attitudeFor(name, relationships);
    listed.push(`- ${name}: ${facts}${attitude ? ` · atitude: ${attitude}` : ''}`);
  }
  for (const [rawName, attitude] of Object.entries(relationships)) {
    const name = String(rawName || '').trim();
    if (!name) continue;
    const key = nameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    listed.push(`- ${name}: personalidade ainda a gravar · atitude: ${attitude}`);
  }

  return [
    'PERSONALIDADE DO ELENCO (COMPLEXA):',
    'Cada pessoa nomeada é alguém com camadas: (1) desejo imediato na cena, (2) medo ou ferida que evita mostrar, (3) jeito de falar, (4) um tique ou gesto que se repete, (5) uma contradição (ex.: cruel com estranhos, terno com um só).',
    'Na primeira aparição importante, defina e grave: [NPC:Nome|função; personalidade+voz+tique; local; fatos; desejo agora]. Ex.: [NPC:Lysa|escriba; seca, frases curtas, tamborila a pena; torre norte; cobra o relatório; quer promoção sem testemunhas].',
    'Ao reencontrar, mantenha voz, tique e desejo de fundo. Atitude (Hostil/Suspeito/Neutral/Amigável) colore o tom — não apaga quem a pessoa é. Pessoas mudam só com motivo claro na cena.',
    campaign.charPersonality
      ? `O jogador (${campaign.charName || 'personagem'}) é: ${campaign.charPersonality}. Isso deve vazar em escolhas, hesitações e no automático — e os NPCs reagem a ESSA pessoa, não a um herói genérico.`
      : '',
    campaign.supportingCast
      ? `Elenco inicial — cada um com voz e agenda próprias (não fundir):\n${campaign.supportingCast}`
      : '',
    listed.length
      ? `Pessoas já gravadas — interprete traços, tiques e tensão entre elas:\n${listed.join('\n')}`
      : 'Ainda sem elenco gravado: ao nomear alguém, já nasça com camadas e registre na tag.',
    'Proibido: NPCs com a mesma cortesia vazia. Proibido monólogo idêntico. Proibido inventar capataz/mensageiro genérico no lugar de gente desta história.',
  ].filter(Boolean).join('\n');
}
