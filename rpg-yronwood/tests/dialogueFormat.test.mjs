import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIALOGUE_TONE_COUNT, speakerToneIndex } from '../lib/dialogueFormat.js';

test('O tom do falante é estável e cabe em 6 cores', () => {
  assert.equal(DIALOGUE_TONE_COUNT, 6);
  const mervyn = speakerToneIndex('Mervyn');
  assert.equal(speakerToneIndex('mervyn'), mervyn);
  assert.equal(speakerToneIndex(' MERVYN '), mervyn);
  assert.ok(mervyn >= 0 && mervyn < 6);
  const tones = ['Mervyn', 'Lysa', 'Marujo', 'Curandeira', 'Mensageiro', 'Capataz']
    .map((name) => speakerToneIndex(name));
  assert.ok(new Set(tones).size >= 3);
});
