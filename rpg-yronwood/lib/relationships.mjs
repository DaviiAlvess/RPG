export const RELATIONSHIP_ATTITUDES = ['Hostil', 'Suspeito', 'Neutral', 'Amigável'];

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const ATTITUDE_ALIASES = {
  ...Object.fromEntries(RELATIONSHIP_ATTITUDES.map(label => [normalize(label), label])),
  atracao: 'Amigável',
  atraida: 'Amigável',
  atraido: 'Amigável',
  interesse: 'Amigável',
  romance: 'Amigável',
  romantico: 'Amigável',
  romantica: 'Amigável',
  apaixonada: 'Amigável',
  apaixonado: 'Amigável',
};

function canonicalAttitude(value) {
  const raw = String(value || '').split(/[,;]/)[0];
  return ATTITUDE_ALIASES[normalize(raw)] || null;
}

function existingName(relationships, name) {
  const key = normalize(name);
  if (!key) return '';
  return Object.keys(relationships).find(current => normalize(current) === key) || '';
}

/** Lê tags ocultas [RELAÇÃO:Nome|Atitude] e mescla em campaign.relationships, sem duplicar o nome. */
export function parseRelationships(text, current = {}) {
  const next = { ...(current && typeof current === 'object' ? current : {}) };
  const apply = (rawName, rawAttitude) => {
    const name = String(rawName || '').replace(/\s+/g, ' ').trim();
    const attitude = canonicalAttitude(rawAttitude);
    if (!name || !attitude) return;
    const previous = existingName(next, name);
    if (previous) next[previous] = attitude;
    else next[name] = attitude;
  };
  for (const match of String(text || '').matchAll(/\[RELA[CÇ][AÃ]O:\s*([^\]|]+)\|([^\]]+)\]/gi)) {
    apply(match[1], match[2]);
  }
  for (const match of String(text || '').matchAll(/\[([^:\]]+):([^\|\]]+)\|([^\]]+)\]/g)) {
    if (normalize(match[1]) !== 'relacao') continue;
    apply(match[2], match[3]);
  }
  return next;
}
