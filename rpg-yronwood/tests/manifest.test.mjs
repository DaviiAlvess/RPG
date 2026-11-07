import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manifestationFor, applyManifestation, bodyChangesLine, buildSystemBeatMessage, isSystemBeatMessage } from '../lib/manifest.mjs';
import { purchaseNote, systemPromptLines } from '../lib/game-system.mjs';

const giant = { name: 'Corpo de Gigante', desc: 'Você cresce e fica mais alto que qualquer homem.', kind: 'habilidade' };

test('habilidade de crescer muda a altura na Ficha e fica registrada', () => {
  const camp = { appearance: { height: 'Médio', body: 'Médio' } };
  const { manifestation, patch } = applyManifestation(camp, giant);
  assert.ok(manifestation);
  assert.equal(patch.appearance.height, 'Muito alto');
  assert.match(patch.bodyChanges[0].change, /mais alto/);
  assert.match(bodyChangesLine({ ...camp, ...patch }), /todos veem o RESULTADO/);
});

test('força sobre-humana deixa o corpo atlético; habilidade mental não muda o corpo', () => {
  const m = manifestationFor({ name: 'Força Sobre-humana', desc: 'Músculos mais densos.' }, { body: 'Magro' });
  assert.equal(m.appearancePatch.body, 'Atlético');
  assert.equal(manifestationFor({ name: 'Língua Universal', desc: 'Entende qualquer idioma.' }, {}), null);
});

test('nota de compra pede a manifestação já e a reação dos NPCs', () => {
  const m = manifestationFor(giant, { height: 'Alto' });
  const note = purchaseNote(giant, m);
  assert.match(note, /MANIFESTAÇÃO FÍSICA/);
  assert.match(note, /PERCEBEM/);
  assert.match(purchaseNote({ name: 'Língua Universal', desc: 'Fala tudo.', kind: 'habilidade' }), /JÁ nesta resposta/);
  const lines = systemPromptLines({ gameSystem: { enabled: true }, bodyChanges: [{ name: 'Corpo de Gigante', change: 'ficou mais alto' }] }).join(' ');
  assert.match(lines, /MUDANÇAS FÍSICAS PERMANENTES/);
});

test('beat do Sistema é reconhecido', () => {
  const msg = buildSystemBeatMessage([giant]);
  assert.ok(isSystemBeatMessage(msg));
  assert.match(msg, /Corpo de Gigante/);
});

import { statBoostFor, applyStatBoost, describeBoost } from '../lib/manifest.mjs';

test('habilidade de espadachim sobe Combate e Destreza na Ficha', () => {
  const sword = { name: 'Esgrima do Espadachim', desc: 'Domina a espada como um duelista veterano.', kind: 'habilidade', tier: 'D' };
  const r = applyStatBoost({ strength: 10, dexterity: 10, mind: 10, charisma: 10 }, { combat: 1, stealth: 1 }, sword);
  assert.equal(r.skills.combat, 3);
  assert.equal(r.attributes.dexterity, 12);
  assert.match(describeBoost(r.boost), /\+2 Combate/);
  const master = statBoostFor({ name: 'Espada do Mestre Lendário', desc: 'Técnica de espada perfeita.', tier: 'S' });
  assert.equal(master.skills.combat, 5);
  assert.equal(statBoostFor({ name: 'Bolsa de Moedas', desc: 'Dinheiro local.' }), null);
});

test('nota de compra avisa o Mestre que a Ficha subiu', () => {
  const note = purchaseNote({ name: 'Esgrima', desc: 'Domina a espada.', kind: 'habilidade' }, null, '+2 Combate');
  assert.match(note, /A FICHA SUBIU \(\+2 Combate\)/);
});
