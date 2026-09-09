import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTest, resolveTest, itemEffect, newerCampaign, readWorldState, pendingTestFromMessages } from '../lib/gameplay.mjs';
test('Testes acentuados e dificuldade explícita', () => {
  const trial = parseTest('[TESTE:Força|DC:16] Abrir a porta');
  assert.equal(trial.attribute, 'Força');
  assert.equal(trial.difficulty, 16);
  assert.equal(parseTest('[TESTE:Força] Abrir a porta').difficulty, 12);
  assert.equal(parseTest('[TESTE:Inválido]'), null);
  assert.equal(resolveTest(trial, { strength: 18 }, 12).outcome, 'sucesso');
  assert.equal(resolveTest(trial, { strength: 10 }, 12).outcome, 'falha');
  assert.equal(resolveTest(trial, { strength: 30 }, 1).outcome, 'falha crítica');
  const withSkill = resolveTest(trial, { strength: 10 }, 12, { combat: 5 });
  assert.equal(withSkill.modifier, 0);
  assert.equal(withSkill.skillBonus, 4);
  assert.equal(withSkill.total, 16);
  assert.equal(withSkill.outcome, 'sucesso');
  const untrained = resolveTest(trial, { strength: 10 }, 12);
  assert.equal(untrained.skillBonus, 0);
  assert.equal(untrained.total, 12);
  assert.equal(resolveTest(trial, { strength: 10 }, 20, { combat: 5 }).outcome, 'sucesso crítico');
  assert.equal(resolveTest(trial, { strength: 30 }, 1, { combat: 5 }).outcome, 'falha crítica');
});

test('Só a cena atual mantém um teste pendente ao continuar ou carregar a campanha', () => {
  const request = { role: 'assistant', content: '[TESTE:Força|DC:16] Abrir a porta' };
  assert.equal(pendingTestFromMessages([request]).difficulty, 16);
  assert.equal(pendingTestFromMessages([request, { role: 'assistant', content: 'Você segue para a cidade.' }]), null);
  assert.equal(pendingTestFromMessages([request, { role: 'user', content: 'Resultado do teste: 18' }]), null);
  assert.equal(pendingTestFromMessages([]), null);
  assert.equal(pendingTestFromMessages(), null);
});
test('Equipamentos e itens desconhecidos não desaparecem nem curam', () => {
  for (const item of ['Espada', 'Chave da missão', 'Poção de veneno', 'Cajado de cura']) assert.deepEqual(itemEffect(item), { consume: false, heal: 0 });
  assert.deepEqual(itemEffect('Poção de cura'), { consume: true, heal: 20 });
  assert.deepEqual(itemEffect('Ração'), { consume: true, heal: 5 });
});
test('Recuperação preserva a versão mais recente, local ou remota', () => {
  const local = { id: 'a', updatedAt: 1000 }, cloud = { id: 'a', updatedAt: 500 };
  assert.equal(newerCampaign(local, cloud), local);
  assert.equal(newerCampaign(cloud, local), local);
  assert.equal(newerCampaign(local, null), local);
  assert.equal(newerCampaign(null, cloud), cloud);
});
test('Memória guarda local, NPCs, segredos e promessas sem duplicar', () => {
  const state = readWorldState('[LOCAL:Taverna] [NPC:Arya|Amigável, viu a chave] [SEGREDO:chave; apenas Arya sabe] [PROMESSA:voltar]');
  assert.equal(state.location, 'Taverna');
  assert.equal(state.npcs.Arya, 'Amigável, viu a chave');
  const next = readWorldState('[PROMESSA:voltar] [LOCAL:Porto]', state);
  assert.deepEqual(next.promises, ['voltar']);
  assert.equal(state.location, 'Taverna');
  assert.equal(next.secrets.length, 1);
});
