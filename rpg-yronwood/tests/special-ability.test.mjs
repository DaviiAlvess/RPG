import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpecialAbility, specialAbilityDirection } from '../lib/special-ability.mjs';
import { economyPrompt } from '../lib/economy.mjs';
test('Habilidade externa é permitida inclusive para personagem comum na economia', () => {
  const ability = { enabled: true, name: 'Teletransporte', description: 'Ir a um lugar visível.', limits: 'Até 30 metros', secret: true };
  const prompt = economyPrompt({ world: 'Westeros', ordinaryCharacter: true, specialAbility: ability }, '', 'dia 1');
  assert.ok(prompt.includes('Teletransporte')); assert.ok(prompt.includes('Até 30 metros'));
  assert.ok(prompt.includes('prevalece sobre a restrição de personagem comum'));
  assert.ok(prompt.includes('Não negue sua existência por não pertencer ao universo'));
  assert.ok(prompt.includes('Não distribua esta habilidade a NPCs'));
});
test('Desativada ou incompleta não concede poderes; segredo respeita testemunhas', () => {
  assert.equal(specialAbilityDirection({ enabled: false, name: 'Poder' }), '');
  assert.equal(specialAbilityDirection({ enabled: true, name: 'Poder' }), '');
  assert.equal(normalizeSpecialAbility(null).enabled, false);
  assert.ok(specialAbilityDirection({ enabled: true, name: 'Poder', description: 'Luz' }).includes('nunca apague o conhecimento de testemunhas'));
});
