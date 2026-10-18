import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planAutoStep, buildAutoTestReply, buildLocalAutoAction, pickFromOptions, formatRollDisplay, sanitizeAutoAction } from '../lib/autoMode.js';

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

test('Automático corta discurso longo e o dado aparece formatado no chat', () => {
  const long = 'Digo ao emissário que ele deve voltar ao senhor e explicar cada detalhe da colheita e da dívida e da guarda e do porto até o fim da tarde sem deixar nada de fora.';
  const short = sanitizeAutoAction(long);
  assert.ok(short.length <= 160);
  assert.ok(!short.includes('até o fim da tarde sem deixar'));
  const reply = buildAutoTestReply({ attribute: 'Força', description: 'Arrombar', difficulty: 12 }, { strength: 14 }, 15, {});
  const roll = formatRollDisplay({ attribute: 'Força', description: 'Arrombar', difficulty: 12 }, reply);
  assert.equal(roll.type, 'roll');
  assert.equal(roll.roll, 15);
  assert.match(roll.text, /D20 15/);
  assert.match(roll.text, /vs 12/);
});
