export const RELATIONSHIP_ATTITUDES = ['Hostil', 'Suspeito', 'Neutral', 'Amigável'];

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const ATTITUDE_BY_KEY = Object.fromEntries(
  RELATIONSHIP_ATTITUDES.map(label => [normalize(label), label])
);

function canonicalAttitude(value) {
  const raw = String(value || '').split(/[,;]/)[0];
  return ATTITUDE_BY_KEY[normalize(raw)] || null;
}

function existingName(relationships, name) {
  const key = normalize(name);
  if (!key) return '';
  return Object.keys(relationships).find(current => normalize(current) === key) || '';
}

/** Lê tags ocultas [RELAÇÃO:Nome|Atitude] e mescla em campaign.relationships, sem duplicar o nome. */
export function parseRelationships(text, current = {}) {
  const next = { ...(current && typeof current === 'object' ? current : {}) };
  for (const match of String(text || '').matchAll(/\[([^:\]]+):([^\|\]]+)\|([^\]]+)\]/g)) {
    if (normalize(match[1]) !== 'relacao') continue;
    const name = String(match[2] || '').replace(/\s+/g, ' ').trim();
    const attitude = canonicalAttitude(match[3]);
    if (!name || !attitude) continue;
    const previous = existingName(next, name);
    if (previous) next[previous] = attitude;
    else next[name] = attitude;
  }
  return next;
}
