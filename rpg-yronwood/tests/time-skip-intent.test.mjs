import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSkipIntent, buildSkipMessage, createSkipEvent } from '../lib/time-skip-intent.mjs';
test('Salto preserva foco e intenção e limita valores inválidos', () => {
  const intent = normalizeSkipIntent({ unit: 'semanas', amount: 2, focus: 'Treinar', intention: 'Treino espada de manhã e trabalho à noite.' });
  const prompt = buildSkipMessage(intent, 'duas semanas');
  assert.ok(prompt.includes(intent.intention));
  assert.ok(prompt.includes('Treinar'));
  assert.ok(prompt.includes('Intenção não é resultado garantido'));
  assert.ok(prompt.includes('após sua resposta'));
  assert.ok(prompt.includes('desenvolvimento'));
  assert.ok(prompt.includes('visão do jogador'));
  assert.ok(prompt.includes('2 a 4 cenas'));
  assert.ok(prompt.includes('**Balanço do período**'));
  assert.ok(prompt.includes('posfácio'));
  assert.ok(!prompt.includes('2 ou 3 momentos'));
  assert.ok(!prompt.includes('momentos vividos'));
  assert.equal(normalizeSkipIntent({ unit: 'anos', amount: 999 }).amount, 100);
  assert.equal(normalizeSkipIntent({ unit: 'inválido', amount: -1 }).unit, 'dias');
  assert.ok(buildSkipMessage({}, 'um dia').includes('sem assumir compromissos novos'));
});

test('Registro conserva pedido, período, narrativa e balanço depois de salvar e carregar', () => {
  const plan = { id: 'skip-1', intent: { focus: 'Treinar', intention: 'Treinar espada e procurar trabalho.', amount: 2, unit: 'semanas' }, startGameTime: { totalDaysElapsed: 1 }, separator: { text: 'Duas semanas depois' } };
  const narrative = 'Você pratica com a guarda.\n\n**Balanço do período**\nO que fez: treinou e buscou trabalho.\nConquistas e progresso: melhorou a postura.\nMudanças e consequências: conheceu o instrutor.\nPendências: ainda não encontrou trabalho.';
  const restored = JSON.parse(JSON.stringify(createSkipEvent(plan, narrative, { totalDaysElapsed: 15 })));
  assert.deepEqual(restored.intent, plan.intent);
  assert.equal(restored.narrative, narrative);
  assert.ok(restored.balance.startsWith('**Balanço do período**'));
  assert.ok(restored.balance.includes('ainda não encontrou trabalho'));
  assert.equal(restored.startGameTime.totalDaysElapsed, 1);
  assert.equal(restored.totalDaysElapsed, 15);
});

test('Sem título esperado, preserva a narrativa sem inventar conquistas', () => {
  const record = createSkipEvent({ id: 'skip-2', intent: {}, startGameTime: { totalDaysElapsed: 0 }, separator: { text: 'Um dia depois' } }, 'A tentativa não deu resultado.', { totalDaysElapsed: 1 });
  assert.equal(record.balance, '');
  assert.equal(record.narrative, 'A tentativa não deu resultado.');
  const prompt = buildSkipMessage({}, 'um dia');
  assert.ok(prompt.includes('**Balanço do período**'));
  assert.ok(prompt.includes('**O que fez**'));
  assert.ok(prompt.includes('**Conquistas e progresso**'));
  assert.ok(prompt.includes('**Mudanças e consequências**'));
  assert.ok(prompt.includes('**Pendências**'));
  assert.ok(prompt.includes('não substitua o desenvolvimento pelo balanço'));
});

test('Desistência no salto é explícita, preserva o plano e não concede sucesso', () => {
  const prompt = buildSkipMessage({ intention: 'Trabalhar na estalagem' }, 'dois dias', { attribute: 'Força', description: 'Arrombar a porta' });
  assert.ok(prompt.includes('desistiu da tentativa pendente de Força: Arrombar a porta'));
  assert.ok(prompt.includes('Não houve rolagem nem sucesso confirmado'));
  assert.ok(prompt.includes('Trabalhar na estalagem'));
  assert.ok(!buildSkipMessage({}, 'um dia').includes('desistiu da tentativa'));
});
