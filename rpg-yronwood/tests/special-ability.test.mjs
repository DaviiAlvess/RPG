import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ABILITY_DESCRIPTION_MAX,
  ABILITY_LIMITS_MAX,
  ABILITY_NAME_MAX,
  MAX_SPECIAL_ABILITIES,
  listActiveSpecialAbilities,
  normalizeSpecialAbility,
  normalizeSpecialAbilities,
  prepareAbilityInput,
  specialAbilitiesAreValid,
  specialAbilityDirection,
} from '../lib/special-ability.mjs';
import { economyPrompt } from '../lib/economy.mjs';

test('Habilidade externa é permitida inclusive para personagem comum na economia', () => {
  const ability = { enabled: true, name: 'Teletransporte', description: 'Ir a um lugar visível.', limits: 'Até 30 metros', secret: true };
  const prompt = economyPrompt({ world: 'Westeros', ordinaryCharacter: true, specialAbility: ability }, '', 'dia 1');
  assert.ok(prompt.includes('Teletransporte'));
  assert.ok(prompt.includes('Até 30 metros'));
  assert.ok(prompt.includes('prevalece sobre a restrição de personagem comum'));
  assert.ok(prompt.includes('Não negue sua existência por não pertencer ao universo'));
  assert.ok(prompt.includes('Não distribua estas habilidades a NPCs') || prompt.includes('Não distribua esta habilidade a NPCs'));
});

test('Desativada ou incompleta não concede poderes; segredo respeita testemunhas', () => {
  assert.equal(specialAbilityDirection({ enabled: false, name: 'Poder' }), '');
  assert.equal(specialAbilityDirection({ enabled: true, name: 'Poder' }), '');
  assert.equal(normalizeSpecialAbility(null).enabled, false);
  assert.ok(specialAbilityDirection({ enabled: true, name: 'Poder', description: 'Luz' }).includes('nunca apague o conhecimento de testemunhas'));
});

test('Aceita até 3 habilidades com textos longos e mantém save antigo', () => {
  assert.equal(MAX_SPECIAL_ABILITIES, 3);
  assert.ok(ABILITY_NAME_MAX >= 200);
  assert.ok(ABILITY_DESCRIPTION_MAX >= 6000);
  assert.ok(ABILITY_LIMITS_MAX >= 3000);

  const legacy = normalizeSpecialAbilities({
    enabled: true,
    name: 'Eco',
    description: 'Ouvir ecos.',
    limits: 'Uma vez',
    secret: true,
  });
  assert.equal(legacy.abilities.length, 1);
  assert.equal(legacy.name, 'Eco');
  assert.equal(listActiveSpecialAbilities(legacy).length, 1);

  const longDesc = 'x'.repeat(5000);
  const triple = normalizeSpecialAbilities({
    enabled: true,
    abilities: [
      { name: 'Um', description: longDesc, limits: 'A', secret: true },
      { name: 'Dois', description: 'Faz dois.', limits: '', secret: false },
      { name: 'Três', description: 'Faz três.', limits: 'Custo alto', secret: true },
      { name: 'Quatro', description: 'Ignorada.', limits: '', secret: true },
    ],
  });
  assert.equal(triple.abilities.length, 3);
  assert.equal(triple.abilities[0].description.length, 5000);
  assert.equal(listActiveSpecialAbilities(triple).length, 3);
  assert.equal(specialAbilitiesAreValid(triple), true);
  assert.equal(specialAbilitiesAreValid({ enabled: true, abilities: [{ name: 'Só nome' }] }), false);

  const prompt = specialAbilityDirection(triple);
  assert.match(prompt, /até 3 habilidades|3 habilidades/i);
  assert.match(prompt, /Um/);
  assert.match(prompt, /Dois/);
  assert.match(prompt, /Três/);
});

test('No bate-papo a escolha da habilidade monta o texto de uso', () => {
  assert.equal(prepareAbilityInput('', 'Selo de Esconderijo'), 'Uso Selo de Esconderijo para ');
  assert.equal(prepareAbilityInput('Uso Eco para ouvir a porta', 'Faísca Curta'), 'Uso Faísca Curta para ouvir a porta');
  assert.equal(prepareAbilityInput('  olho o corredor  ', 'Véu Baixo'), 'Uso Véu Baixo para olho o corredor');
});
