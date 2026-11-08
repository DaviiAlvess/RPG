import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectScene, wordsFor, pacingDirection, stagnationTurns, didProgress,
  buildPaceMessage, paceCommandOf, paceDisplay, SCENES, STAGNATION_TURNS,
} from '../lib/pacing.mjs';

test('reconhece o tipo de cena pela ação do jogador', () => {
  const cases = [
    ['Saco a espada e ataco o guarda pela esquerda', 'combate'],
    ['Corro pelo beco e pulo o muro', 'perseguicao'],
    ['Sigo para o porto pela estrada do rei', 'viagem'],
    ['Acampo perto do rio e cuido dos ferimentos', 'descanso'],
    ['"Quem te mandou aqui?"', 'conversa'],
    ['Pergunto ao velho onde fica a forja', 'conversa'],
    ['Examino a carta contra a luz da vela', 'investigacao'],
    ['Entro na taverna e olho em volta', 'exploracao'],
  ];
  for (const [action, scene] of cases) assert.equal(detectScene({ action }), scene, action);
});

test('sem pista na ação, usa a cena anterior e a tensão', () => {
  assert.equal(detectScene({ action: 'Espero.', lastGm: 'A lâmina passa rente ao seu rosto.', tension: 2 }), 'combate');
  assert.equal(detectScene({ action: 'Fico quieto.', tension: 2 }), 'suspense');
  assert.equal(detectScene({ action: 'Hum.', lastGm: 'Mika: "Vai ficar parado?"' }), 'conversa');
  assert.equal(detectScene({ action: 'Hum.' }), 'exploracao');
  assert.equal(detectScene({ action: 'Acampo e durmo.', tension: 3 }), 'suspense');
});

test('comandos de ritmo do jogador', () => {
  const msg = buildPaceMessage('avancar');
  assert.equal(paceCommandOf(msg), 'avancar');
  assert.match(paceDisplay(msg), /tempo correr/);
  assert.equal(paceCommandOf(buildPaceMessage('detalhar')), 'detalhar');
  assert.equal(paceCommandOf('Ataco o guarda'), null);
  assert.equal(buildPaceMessage('nada'), '');
  assert.equal(detectScene({ pace: 'avancar', action: 'Ataco' }), 'corte');
  assert.equal(detectScene({ pace: 'detalhar' }), 'contemplacao');
});

test('tamanho acompanha a cena e o tamanho escolhido', () => {
  assert.deepEqual(wordsFor('balanced', 'combate'), [150, 240]);
  assert.deepEqual(wordsFor('balanced', 'exploracao'), [250, 400]);
  assert.deepEqual(wordsFor('short', 'combate'), [50, 90]);
  const [lo, hi] = wordsFor('rich', 'contemplacao');
  assert.ok(lo > 300 && hi > 450);
  for (const key of Object.keys(SCENES)) assert.ok(SCENES[key].rhythm && SCENES[key].focus && SCENES[key].ending, key);
});

test('bloco do Mestre traz ritmo, tamanho, fechamento variado e corte de cena', () => {
  const combat = pacingDirection({ narration: { length: 'balanced' } }, { action: 'Ataco o capitão' });
  assert.match(combat, /TEMPO DESTA CENA — COMBATE/);
  assert.match(combat, /150–240 palavras/);
  assert.match(combat, /nem toda resposta termina com alguém te encarando/);
  const travel = pacingDirection({}, { action: 'Partimos para Porto Real' });
  assert.match(travel, /VIAGEM/);
  assert.match(travel, /resuma o trajeto/);
  const pace = pacingDirection({}, { action: buildPaceMessage('avancar') });
  assert.match(pace, /AVANÇAR/);
  assert.equal(pacingDirection({}, { action: 'x', short: true }).includes('\n'), false);
});

test('história parada força uma mudança', () => {
  assert.equal(stagnationTurns({ turn: 7, lastProgressTurn: 3 }), 4);
  const stuck = pacingDirection({ turn: 7, lastProgressTurn: 3 }, { action: 'Olho em volta' });
  assert.match(stuck, /HISTÓRIA ESTÁ PARADA há 4 respostas/);
  const fine = pacingDirection({ turn: 7, lastProgressTurn: 6 }, { action: 'Olho em volta' });
  assert.doesNotMatch(fine, /PARADA/);
  const early = pacingDirection({ turn: STAGNATION_TURNS - 1 }, { action: 'Olho' });
  assert.doesNotMatch(early, /PARADA/);
  const asked = pacingDirection({ turn: 9, lastProgressTurn: 1 }, { action: buildPaceMessage('detalhar') });
  assert.doesNotMatch(asked, /PARADA/);
  assert.equal(didProgress({ clue: false, place: true }), true);
  assert.equal(didProgress({ clue: false }), false);
});

