import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRelationships, RELATIONSHIP_ATTITUDES } from '../lib/relationships.mjs';

test('parseRelationships lê [RELAÇÃO:Nome|Atitude], ignora inválidas e não muta o estado anterior', () => {
  assert.deepEqual(RELATIONSHIP_ATTITUDES, ['Hostil', 'Suspeito', 'Neutral', 'Amigável']);
  const current = { 'Tywin Lannister': 'Hostil', 'Jon Snow': 'Amigável' };
  const snapshot = { ...current };
  const next = parseRelationships(
    'O olhar endurece. [RELAÇÃO:Tywin Lannister|Suspeito] [relação:Oberyn Martell|Neutral] [RELAÇÃO:Jon Snow|amigavel] [RELAÇÃO:Cersei|Fúria] [NPC:Arya|Amigável, viu a chave]',
    current
  );
  assert.deepEqual(current, snapshot);
  assert.equal(next['Tywin Lannister'], 'Suspeito');
  assert.equal(next['Jon Snow'], 'Amigável');
  assert.equal(next['Oberyn Martell'], 'Neutral');
  assert.equal(next.Cersei, undefined);
  assert.equal(next.Arya, undefined);
});

test('parseRelationships deduplica pelo nome e a última tag válida vence', () => {
  const next = parseRelationships(
    '[RELAÇÃO:  cersei lannister |Hostil] texto [RELACAO:Cersei Lannister|Amigável]',
    { 'Cersei Lannister': 'Suspeito' }
  );
  assert.deepEqual(next, { 'Cersei Lannister': 'Amigável' });
  assert.equal(Object.keys(next).length, 1);
  assert.deepEqual(parseRelationships('sem tags', { Arya: 'Neutral' }), { Arya: 'Neutral' });
  assert.deepEqual(parseRelationships(''), {});
});
