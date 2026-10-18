import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIALOGUE_TONE_COUNT, formatPlayerTurnDisplay, isDialogueHeavy, recentSpeakers, speakerToneIndex } from '../lib/dialogueFormat.js';

test('O tom do falante é estável e cabe em 6 cores', () => {
  assert.equal(DIALOGUE_TONE_COUNT, 6);
  const mervyn = speakerToneIndex('Mervyn');
  assert.equal(speakerToneIndex('mervyn'), mervyn);
  assert.equal(speakerToneIndex(' MERVYN '), mervyn);
  assert.ok(mervyn >= 0 && mervyn < 6);
  const tones = ['Mervyn', 'Lysa', 'Kael', 'Iara', 'Ren', 'Oberyn']
    .map((name) => speakerToneIndex(name));
  assert.ok(new Set(tones).size >= 3);
});

test('Fala do jogador aparece como linha de diálogo na mesa', () => {
  assert.equal(formatPlayerTurnDisplay('"Abra o portão."', 'Edric'), 'Edric: "Abra o portão."');
  assert.equal(formatPlayerTurnDisplay('Digo: "Dobre os estoques."', 'Edric'), 'Edric: "Dobre os estoques."');
  assert.match(formatPlayerTurnDisplay('Avanço e digo: "Saiam."', 'Edric'), /Edric: "Saiam\."/);
  assert.equal(formatPlayerTurnDisplay('Examino a fechadura.', 'Edric'), 'Examino a fechadura.');
});

test('Cena falada é pesada em diálogo e guarda as vozes recentes', () => {
  const scene = 'A mesa range.\nLysa: "Dobre os estoques."\nKael: "Ele espera resposta."';
  assert.equal(isDialogueHeavy(scene), true);
  assert.equal(isDialogueHeavy('A porta range no batente úmido.'), false);
  assert.deepEqual(
    recentSpeakers([{ type: 'gm', text: scene }], 'Edric'),
    ['Kael', 'Lysa']
  );
});
