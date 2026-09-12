export const HP_MIN = 0;
export const HP_MAX = 100;

const HP_TAG = /\[HP:([^\]]*)\]/gi;
const SIGNED_DELTA = /^[+-]\d+$/;

function numericHp(value, fallback = HP_MAX) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampHp(value) {
  return Math.min(HP_MAX, Math.max(HP_MIN, Math.floor(numericHp(value))));
}

/** Soma deltas com sinal em [HP:+12] / [HP:-8]. Sem sinal (ex.: [HP:42]) é ignorado. */
export function parseHpDelta(text) {
  let total = 0;
  for (const match of String(text || '').matchAll(HP_TAG)) {
    const raw = match[1].split('|')[0].trim();
    if (!SIGNED_DELTA.test(raw)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n === 0) continue;
    total += n;
  }
  return total;
}

export function applyHpDelta(current, delta) {
  const change = Number(delta);
  return clampHp(numericHp(current) + (Number.isFinite(change) ? change : 0));
}

export function applyHpFromText(current, text) {
  return applyHpDelta(current, parseHpDelta(text));
}

export function stripHpTags(text) {
  return String(text || '').replace(/\s*\[HP:[^\]]*\]/gi, '');
}

export function hpChangeToast(previous, next) {
  const from = clampHp(previous);
  const to = clampHp(next);
  if (to === from) return '';
  if (to < from && to === HP_MIN) return 'Você caiu inconsciente (0 HP).';
  if (to < from) return `Você perdeu ${from - to} HP.`;
  return `Você recuperou ${to - from} HP.`;
}
