import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSkipIntent, buildSkipMessage } from '../lib/time-skip-intent.mjs';
test('Salto preserva foco e intenção e limita valores inválidos', () => {
  const intent = normalizeSkipIntent({ unit: 'semanas', amount: 2, focus: 'Treinar', intention: 'Treino espada de manhã e trabalho à noite.' });
  const prompt = buildSkipMessage(intent, 'duas semanas');
  assert.ok(prompt.includes(intent.intention));
  assert.ok(prompt.includes('Treinar'));
  assert.ok(prompt.includes('Intenção não é resultado garantido'));
  assert.ok(prompt.includes('após sua resposta'));
  assert.equal(normalizeSkipIntent({ unit: 'anos', amount: 999 }).amount, 100);
  assert.equal(normalizeSkipIntent({ unit: 'inválido', amount: -1 }).unit, 'dias');
  assert.ok(buildSkipMessage({}, 'um dia').includes('sem assumir compromissos novos'));
});
