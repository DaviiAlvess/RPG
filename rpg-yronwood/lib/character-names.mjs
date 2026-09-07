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
    'Antes de apresentar alguém, decida se é uma pessoa já conhecida ou uma nova. Se já conhecida, preserve nome, história, aparência, função e relações; não a recrie como desconhecida.',
    'Para uma pessoa nova inventada, escolha um nome distinto dos já usados, inclusive no primeiro nome. Não use simples mudanças de acento, grafia ou sobrenome para disfarçar repetição.',
    'Varie sonoridade e estrutura dos nomes de acordo com a cultura e o universo. Evite repetir o mesmo pequeno conjunto de nomes genéricos. Não crie parentesco só porque dois nomes se parecem.',
    'Preserve nomes canônicos e personagens existentes mesmo quando houver homônimos legítimos. Distinga essas pessoas com sobrenome ou título; não renomeie ninguém retroativamente.',
    'Figurantes sem importância podem ser identificados pela função, como a guarda da ponte. Dê nome próprio quando fizer sentido para a interação, sem nomear toda pessoa que passa.',
    'Ao introduzir um NPC nomeado, registre [NPC:nome completo|função, local e fatos confirmados]. Ao reencontrá-lo, use a mesma identificação na tag.'
  ].join('\n');
}
