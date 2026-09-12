/** Short hard rule placed at the top of GM prompts for existing universes. */
export function knownIpFidelityRule(world) {
  const name = String(world || '').trim() || 'este universo';
  return [
    `REGRA DURA — PERMANEÇA EM ${name}.`,
    'Física, lugares nomeados e sistema de poder deste mundo são lei.',
    'Inventar só extras locais; nunca reescrever o destino canônico dos protagonistas.',
    'Se estiver em dúvida, fique no genérico-local — não invente canon falso.',
  ].join(' ');
}

/** First 3 GM replies of a known-IP campaign (prior chat length 0, 2, then 4). */
export const KNOWN_IP_GROUNDED_PRIOR_MESSAGES = 6;

export function shouldGroundGmTurn(camp, priorMessageCount = 0) {
  return Boolean(camp?.isKnownIP) && Number(priorMessageCount) < KNOWN_IP_GROUNDED_PRIOR_MESSAGES;
}
