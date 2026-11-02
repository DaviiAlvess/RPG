import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTest, canonicalAttribute } from '../lib/gameplay.mjs';
import { parseExperience } from '../lib/progression.mjs';

test('teste aceita variações de escrita do Mestre', () => {
  const cases = [
    ['[TESTE:Força|DC:12] Abrir', 'Força', 12],
    ['[TESTE: Destreza | DC: 14] Saltar', 'Destreza', 14],
    ['[TESTE:Percepção|CD 15] Notar', 'Mente', 15],
    ['[TESTE de Carisma DC 16] Convencer', 'Carisma', 16],
    ['[TESTE:Furtividade] Passar', 'Destreza', 12],
    ['[teste:Persuasão|DC:10|motivo] Pedir', 'Carisma', 10],
    ['[TESTE:Strength|DC:18] x', 'Força', 18],
  ];
  for (const [text, attr, dc] of cases) {
    const t = parseTest(text);
    assert.ok(t, text);
    assert.equal(t.attribute, attr, text);
    assert.equal(t.difficulty, dc, text);
  }
  assert.equal(parseTest('[TESTE:Culinária|DC:12]'), null);
  assert.equal(parseTest('sem teste'), null);
  assert.equal(canonicalAttribute('Sabedoria'), 'Mente');
});

test('XP aceita número com texto junto', () => {
  assert.equal(parseExperience('[XP:10 XP]'), 10);
  assert.equal(parseExperience('[XP: +15 pontos|vitória]'), 15);
  assert.equal(parseExperience('[XP:999]'), 50);
  assert.equal(parseExperience('[XP:dez]'), 0);
  assert.equal(parseExperience('[XP:-5]'), 0);
});
