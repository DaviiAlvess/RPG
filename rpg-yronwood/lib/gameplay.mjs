export const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const attributeKeys = { forca: 'strength', destreza: 'dexterity', mente: 'mind', carisma: 'charisma' };
export function parseTest(text) {
  const match = String(text).match(/\[TESTE:([^\]|]+)(?:\|DC:(\d+))?\]\s*([^\n]*)/i);
  if (!match || !attributeKeys[normalize(match[1].trim())]) return null;
  return { attribute: match[1].trim(), description: match[3], difficulty: Math.max(5, Math.min(30, Number(match[2]) || 12)) };
}
export function resolveTest(test, attributes, roll) {
  const modifier = Math.floor(((Number(attributes[attributeKeys[normalize(test.attribute)]]) || 10) - 10) / 2);
  const total = roll + modifier;
  const outcome = roll === 1 ? 'falha crítica' : roll === 20 ? 'sucesso crítico' : total >= test.difficulty ? 'sucesso' : total >= test.difficulty - 3 ? 'sucesso parcial com custo' : 'falha';
  return { total, modifier, outcome };
}
export function itemEffect(name) {
  const text = normalize(name).trim();
  if (/^(pocao|elixir) (de )?(cura|vida|saude)(\b|$)/.test(text)) return { consume: true, heal: 20 };
  if (/^(comida|racao|pao|fruta)(\b|$)/.test(text)) return { consume: true, heal: 5 };
  return { consume: false, heal: 0 };
}
export function newerCampaign(local, cloud) {
  if (!local?.id) return cloud;
  if (!cloud?.id) return local;
  return new Date(local.updatedAt || 0).getTime() > new Date(cloud.updatedAt || 0).getTime() ? local : cloud;
}
export function readWorldState(text, previous = {}) {
  const next = { ...previous, npcs: { ...(previous.npcs || {}) }, promises: [...(previous.promises || [])], secrets: [...(previous.secrets || [])] };
  for (const match of String(text).matchAll(/\[(LOCAL|PROMESSA|SEGREDO|NPC):([^\]]+)\]/gi)) {
    const value = match[2].trim().slice(0, 500);
    if (match[1].toUpperCase() === 'LOCAL') next.location = value;
    if (match[1].toUpperCase() === 'NPC') {
      const [name, ...facts] = value.split('|');
      const key = name.trim().replace(/[.#$\[\]\/]/g, ' ').trim();
      if (key && !['__proto__', 'constructor', 'prototype'].includes(key) && facts.length) next.npcs[key] = facts.join('|').trim();
    }
    const field = match[1].toUpperCase() === 'PROMESSA' ? 'promises' : match[1].toUpperCase() === 'SEGREDO' ? 'secrets' : null;
    if (field && !next[field].includes(value)) next[field] = [...next[field], value].slice(-40);
  }
  return next;
}
