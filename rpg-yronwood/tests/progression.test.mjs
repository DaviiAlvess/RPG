import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  XP_PER_LEVEL,
  parseExperience,
  addExperience,
  xpProgress,
  canLevelUp,
  applyLevelUp,
  parseCompletedMissions,
  missionXp,
  skillForAttribute
} from '../lib/progression.mjs';

const baseStats = () => ({
  experience: 100,
  level: 1,
  hp: 40,
  attributes: { strength: 10, dexterity: 10, mind: 10, charisma: 10 },
  skills: { combat: 1, stealth: 1, magic: 1, persuasion: 1, survival: 1, perception: 1 }
});

test('parseExperience lê tags, clampa 1–50 e ignora inválidas', () => {
  assert.equal(parseExperience('[XP:15]'), 15);
  assert.equal(parseExperience('[XP:15|treinou na arena]'), 15);
  assert.equal(parseExperience('[XP:15] texto [XP:10|motivo]'), 25);
  assert.equal(parseExperience('[XP:80]'), 50);
  assert.equal(parseExperience('[XP:0] [XP:-3] [XP:abc] [XP:]'), 0);
  assert.equal(parseExperience('sem tags'), 0);
  assert.equal(parseExperience('[xp:1]'), 1);
});

test('addExperience deriva nível a cada 100 XP', () => {
  assert.equal(XP_PER_LEVEL, 100);
  assert.deepEqual(addExperience(0, 50), { experience: 50, level: 1, leveledUp: false, xpIntoLevel: 50, xpNeeded: 100 });
  assert.deepEqual(addExperience(0, 100), { experience: 100, level: 2, leveledUp: true, xpIntoLevel: 0, xpNeeded: 100 });
  assert.deepEqual(addExperience(90, 20), { experience: 110, level: 2, leveledUp: true, xpIntoLevel: 10, xpNeeded: 100 });
  assert.deepEqual(addExperience(100, 10), { experience: 110, level: 2, leveledUp: false, xpIntoLevel: 10, xpNeeded: 100 });
});

test('canLevelUp compara nível derivado do XP com o nível atual da ficha', () => {
  assert.equal(canLevelUp({ experience: 0, level: 1 }), false);
  assert.equal(canLevelUp({ experience: 99, level: 1 }), false);
  assert.equal(canLevelUp({ experience: 100, level: 1 }), true);
  assert.equal(canLevelUp({ experience: 100, level: 2 }), false);
  assert.equal(canLevelUp({ experience: 250, level: 2 }), true);
  assert.equal(canLevelUp({ experience: 250, level: 3 }), false);
});

test('applyLevelUp aplica a escolha e sobe só 1 nível, sem +1 em todos os atributos', () => {
  const attr = applyLevelUp({ ...baseStats(), choice: { type: 'attr', key: 'strength' } });
  assert.equal(attr.level, 2);
  assert.equal(attr.attributes.strength, 12);
  assert.equal(attr.attributes.dexterity, 10);
  assert.equal(attr.attributes.mind, 10);
  assert.equal(attr.attributes.charisma, 10);

  const attrs = applyLevelUp({ ...baseStats(), choice: { type: 'attrs', keys: ['mind', 'charisma'] } });
  assert.equal(attrs.attributes.mind, 11);
  assert.equal(attrs.attributes.charisma, 11);
  assert.equal(attrs.attributes.strength, 10);

  const sameKeys = applyLevelUp({ ...baseStats(), choice: { type: 'attrs', keys: ['strength', 'strength'] } });
  assert.equal(sameKeys.level, 2);
  assert.equal(sameKeys.attributes.strength, 10);

  const skill = applyLevelUp({ ...baseStats(), choice: { type: 'skill', key: 'combat' } });
  assert.equal(skill.skills.combat, 2);

  const capped = applyLevelUp({ ...baseStats(), skills: { ...baseStats().skills, combat: 5 }, choice: { type: 'skill', key: 'combat' } });
  assert.equal(capped.skills.combat, 5);

  const healed = applyLevelUp({ ...baseStats(), choice: { type: 'hp' } });
  assert.equal(healed.hp, 65);

  const cappedHp = applyLevelUp({ ...baseStats(), hp: 90, choice: { type: 'hp' } });
  assert.equal(cappedHp.hp, 100);

  const blocked = applyLevelUp({ ...baseStats(), experience: 40, choice: { type: 'attr', key: 'strength' } });
  assert.equal(blocked.level, 1);
  assert.equal(blocked.attributes.strength, 10);
});

test('xpProgress em 0/50/100/250 e barra cheia no múltiplo exato', () => {
  assert.deepEqual(xpProgress(0), { current: 0, needed: 100, pct: 0 });
  assert.deepEqual(xpProgress(50), { current: 50, needed: 100, pct: 50 });
  assert.deepEqual(xpProgress(100), { current: 100, needed: 100, pct: 100 });
  assert.deepEqual(xpProgress(250), { current: 50, needed: 100, pct: 50 });
  assert.deepEqual(xpProgress(200), { current: 100, needed: 100, pct: 100 });
});

test('missionXp dá 15 por missão nova, no máximo 30 por resposta', () => {
  assert.equal(missionXp(0), 0);
  assert.equal(missionXp(1), 15);
  assert.equal(missionXp(2), 30);
  assert.equal(missionXp(3), 30);
  assert.deepEqual(parseCompletedMissions('[CONCLUÍDA:abrir o portão] texto [CONCLUÍDA:entregar a carta]'), ['abrir o portão', 'entregar a carta']);
  assert.deepEqual(parseCompletedMissions('[CONCLUIDA:sem acento]'), ['sem acento']);
});

test('skillForAttribute liga atributo à perícia de teste', () => {
  assert.equal(skillForAttribute('Força'), 'combat');
  assert.equal(skillForAttribute('Destreza'), 'stealth');
  assert.equal(skillForAttribute('Mente'), 'perception');
  assert.equal(skillForAttribute('Carisma'), 'persuasion');
  assert.equal(skillForAttribute('strength'), 'combat');
  assert.equal(skillForAttribute('Inválido'), null);
});
