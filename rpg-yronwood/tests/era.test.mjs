import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectEra, eraPromptLines, findAnachronisms, anachronismNote, forbiddenFor } from '../lib/era.mjs';

const viking = { world: 'Escandinávia na era dos Vikings', worldBg: 'Kattegat, ano 793. Jarls disputam terras.' };

test('detecta a era viking e trava o prompt', () => {
  const era = detectEra(viking);
  assert.equal(era.id, 'viking');
  const lines = eraPromptLines(viking).join(' ');
  assert.match(lines, /ÉPOCA TRAVADA/);
  assert.match(lines, /arma de fogo/);
  assert.match(lines, /celular/);
});

test('acha coisas modernas na narração viking', () => {
  const slips = findAnachronisms('O jarl tira um isqueiro do bolso e acende o cigarro. Dez minutos depois, a polícia chega.', viking);
  assert.ok(slips.some((w) => /isqueiro/.test(w)));
  assert.ok(slips.some((w) => /cigarro/.test(w)));
  assert.ok(slips.some((w) => /polícia/.test(w)));
  assert.match(anachronismNote(slips, viking), /CORREÇÃO DE ÉPOCA/);
  assert.deepEqual(findAnachronisms('O jarl ergue o machado sobre o escudo de tília.', viking), []);
});

test('isekai: lembranças modernas do jogador não contam como erro', () => {
  const camp = { world: 'Roma Antiga', worldBg: 'Um homem moderno acorda em Roma, ano 44 a.C.' };
  assert.equal(detectEra(camp).isekai, true);
  assert.deepEqual(findAnachronisms('Você lembra do seu celular e do carro na garagem. O centurião cospe na areia.', camp), []);
  assert.ok(findAnachronisms('O centurião confere o relógio de pulso.', camp).length);
});

test('mundos modernos ou futuristas não são travados', () => {
  assert.equal(detectEra({ world: 'Cyberpunk Neo-Tóquio 2099' }), null);
  assert.equal(detectEra({ world: 'São Paulo', worldBg: 'Uma história policial no ano 2024.' }), null);
  const west = detectEra({ world: 'Velho Oeste' });
  assert.ok(forbiddenFor(west).some((a) => /celular/.test(a.word)));
  assert.ok(!forbiddenFor(west).some((a) => /trem/.test(a.word)));
});

test('fantasia medieval proíbe pólvora, mas a situação atual não confunde', () => {
  const got = { world: 'Westeros (Game of Thrones)', storyStartPoint: 'Sua situação atual: herdeiro em Winterfell.' };
  assert.equal(detectEra(got).id, 'fantasia-medieval');
  assert.ok(findAnachronisms('O guarda saca uma pistola.', got).length);
});

import { detectEraDeep, eraSnapshot } from '../lib/era.mjs';
test('campanha ativa sem época na descrição: acha pela memória/narração e salva', () => {
  const camp = { world: 'Minha aventura', worldBg: '', memory: 'O jarl Bjorn convocou os guerreiros para o drakkar.', msgs: [{ role: 'assistant', content: 'Você acorda no salão do jarl.' }] };
  assert.equal(detectEraDeep(camp).id, 'viking');
  const saved = { ...camp, era: eraSnapshot(detectEraDeep(camp)), eraChecked: true };
  assert.equal(detectEra(saved).id, 'viking');
  // fantasia genérica vinda só da narração não trava história moderna
  assert.equal(detectEraDeep({ world: 'Rio de Janeiro', msgs: [{ role: 'assistant', content: 'Um filme de dragões passa na TV.' }] }), null);
  assert.equal(detectEra({ world: 'Velho Oeste', era: null, eraChecked: true }), null);
});
