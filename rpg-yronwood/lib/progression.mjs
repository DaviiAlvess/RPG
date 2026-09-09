export const XP_PER_LEVEL = 100;

const ATTRIBUTE_KEYS = ['strength', 'dexterity', 'mind', 'charisma'];
const SKILL_KEYS = ['combat', 'stealth', 'magic', 'persuasion', 'survival', 'perception'];
const SKILL_CAP = 5;
const HP_CAP = 100;
const HP_LEVEL_HEAL = 25;
const XP_PER_TAG_MIN = 1;
const XP_PER_TAG_MAX = 50;
const XP_PER_MISSION = 15;
const MISSION_XP_CAP = 30;

const attributeToSkill = {
  forca: 'combat',
  strength: 'combat',
  destreza: 'stealth',
  dexterity: 'stealth',
  mente: 'perception',
  mind: 'perception',
  carisma: 'persuasion',
  charisma: 'persuasion'
};

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function numericExperience(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function xpTagValue(raw) {
  const n = Number(String(raw || '').trim());
  if (!Number.isFinite(n) || n < XP_PER_TAG_MIN) return 0;
  return Math.min(XP_PER_TAG_MAX, Math.floor(n));
}

/** Soma todos os [XP:n] ou [XP:n|motivo] da resposta. Cada tag válida entra clampada em 1–50; inválida vale 0. */
export function parseExperience(text) {
  let total = 0;
  for (const match of String(text || '').matchAll(/\[XP:([^\]]*)\]/gi)) {
    total += xpTagValue(match[1].split('|')[0]);
  }
  return total;
}

export function addExperience(current, gained) {
  const previous = numericExperience(current);
  const amount = numericExperience(gained);
  const experience = previous + amount;
  const previousLevel = Math.floor(previous / XP_PER_LEVEL) + 1;
  const level = Math.floor(experience / XP_PER_LEVEL) + 1;
  return {
    experience,
    level,
    leveledUp: level > previousLevel,
    xpIntoLevel: experience % XP_PER_LEVEL,
    xpNeeded: XP_PER_LEVEL
  };
}

/**
 * Progresso da barra: experience % 100.
 * Se experience > 0 e experience % 100 === 0, a barra fica cheia (current=100, pct=100)
 * até o jogador consumir o level-up — o personagem está pronto para subir de nível.
 */
export function xpProgress(experience) {
  const xp = numericExperience(experience);
  const remainder = xp % XP_PER_LEVEL;
  const ready = xp > 0 && remainder === 0;
  const current = ready ? XP_PER_LEVEL : remainder;
  return { current, needed: XP_PER_LEVEL, pct: (current / XP_PER_LEVEL) * 100 };
}

export function canLevelUp({ experience, level } = {}) {
  return Math.floor(numericExperience(experience) / XP_PER_LEVEL) + 1 > (Number(level) || 1);
}

export function applyLevelUp(state = {}) {
  const { level, attributes = {}, skills = {}, hp, choice, experience } = state;
  const snapshot = {
    ...state,
    level: Number(level) || 1,
    attributes: { ...attributes },
    skills: { ...skills },
    hp: Number(hp) || 0
  };
  if (!canLevelUp({ experience, level: snapshot.level })) return snapshot;

  const next = { ...snapshot, level: snapshot.level + 1 };
  if (choice?.type === 'attr' && ATTRIBUTE_KEYS.includes(choice.key)) {
    next.attributes[choice.key] = (Number(next.attributes[choice.key]) || 0) + 2;
  } else if (choice?.type === 'attrs') {
    const keys = [...new Set((choice.keys || []).filter(key => ATTRIBUTE_KEYS.includes(key)))];
    if (keys.length === 2) {
      next.attributes[keys[0]] = (Number(next.attributes[keys[0]]) || 0) + 1;
      next.attributes[keys[1]] = (Number(next.attributes[keys[1]]) || 0) + 1;
    }
  } else if (choice?.type === 'skill' && SKILL_KEYS.includes(choice.key)) {
    next.skills[choice.key] = Math.min(SKILL_CAP, (Number(next.skills[choice.key]) || 0) + 1);
  } else if (choice?.type === 'hp') {
    next.hp = Math.min(HP_CAP, next.hp + HP_LEVEL_HEAL);
  }
  return next;
}

export function parseCompletedMissions(text) {
  return [...String(text || '').matchAll(/\[CONCLU[IÍ]DA:([^\]]*)\]/gi)]
    .map(match => match[1].trim())
    .filter(Boolean);
}

export function missionXp(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return Math.min(MISSION_XP_CAP, n * XP_PER_MISSION);
}

export function skillForAttribute(attributeLabel) {
  return attributeToSkill[normalize(attributeLabel)] || null;
}
