import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planAutoStep, buildAutoTestReply, buildLocalAutoAction, pickFromOptions } from '../lib/autoMode.js';

test('Automático rola o teste pendente em vez de parar a história', () => {
  const raw = '[TESTE:Força|DC:16] Arrombar a porta\nA tranca range.';
  const step = planAutoStep({
    lastGmText: raw,
    options: ['Empurrar', 'Recuar'],
    messages: [{ role: 'assistant', content: raw }],
  });
  assert.equal(step.kind, 'roll');
  assert.equal(step.test.attribute, 'Força');
  assert.equal(step.test.difficulty, 16);

  const reply = buildAutoTestReply(step.test, { strength: 14 }, 12, { combat: 1 });
  assert.equal(reply.roll, 12);
  assert.match(reply.text, /D20: 12/);
  assert.match(reply.text, /Força/);
  assert.match(reply.text, /sem rolar novamente/);
  assert.equal(planAutoStep({ lastGmText: 'A porta está aberta.', options: ['Entrar'] }).kind, 'action');
});

test('Sem teste, o automático escolhe ação pela personalidade', () => {
  const camp = { charPersonality: 'impulsivo e agressivo' };
  assert.match(pickFromOptions(['Observar de longe', 'Investir contra a porta'], camp), /Investir/i);
  const action = buildLocalAutoAction(camp, 'Um inimigo bloqueia a saída.');
  assert.ok(action.length > 8);
});
