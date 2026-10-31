import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseClues, parseTension, tensionLabel, parseEnding, detectEnding, endingSummary,
  storyProgressLines, buildRecap, returnNote, daysAway, stripStoryTags, recapRequest,
} from '../lib/story-progress.mjs';

const DAY = 86400000;

test('parseClues adiciona pistas novas sem repetir', () => {
  const r1 = parseClues('Você acha. [PISTA:Pregos da Marinha no casco] [PISTA:pregos da marinha no casco]', []);
  assert.equal(r1.clues.length, 1);
  assert.equal(r1.added.length, 1);
  const r2 = parseClues('[PISTA:Mapa riscado no mastro]', r1.clues);
  assert.equal(r2.clues.length, 2);
  assert.equal(parseClues('sem tags', r2.clues).added.length, 0);
});

test('parseTension lê a última tag e limita entre 0 e 3', () => {
  assert.equal(parseTension('[TENSAO:2]', 0), 2);
  assert.equal(parseTension('[TENSÃO:1] depois [TENSAO:9]', 0), 3);
  assert.equal(parseTension('nada', 2), 2);
  assert.equal(tensionLabel(0), 'Calmaria');
  assert.equal(tensionLabel(3), 'Ponto sem volta');
});

test('parseEnding e detectEnding', () => {
  const e = parseEnding('fim [FINAL:A Voz do Rio|Choveu no sertão.|Abriu a represa; Perdoou o coronel]');
  assert.equal(e.title, 'A Voz do Rio');
  assert.deepEqual(e.choices, ['Abriu a represa', 'Perdoou o coronel']);
  assert.equal(parseEnding('[FINAL:]'), null);

  const camp = { charName: 'Lia', plots: [{ title: 'O barco', status: 'ativa' }, { title: 'Outra', status: 'ativa' }] };
  const byPlot = detectEnding('ok', camp, [{ title: 'O barco', status: 'encerrada' }, { title: 'Outra', status: 'ativa' }]);
  assert.ok(byPlot?.fromPlot);
  assert.equal(detectEnding('ok', camp, [{ title: 'O barco', status: 'ativa' }, { title: 'Outra', status: 'encerrada' }]), null);
  assert.equal(detectEnding('[FINAL:X|y]', { ...camp, ending: { title: 'já' } }, []), null);
});

test('endingSummary separa aliados e inimigos', () => {
  const s = endingSummary({ ending: { title: 'T' }, relationships: { A: 'Amigável', B: 'Hostil', C: 'Suspeito' }, missions: [{ text: 'm1', completed: true }, { text: 'm2' }], clues: ['x'], level: 3 });
  assert.deepEqual(s.allies, ['A']);
  assert.deepEqual(s.enemies, ['B']);
  assert.deepEqual(s.neutral, ['C (Suspeito)']);
  assert.deepEqual(s.missionsDone, ['m1']);
  assert.equal(s.clues, 1);
});

test('storyProgressLines explica as tags e o modo curto vira uma linha', () => {
  const full = storyProgressLines({ tension: 2 }).join('\n');
  assert.match(full, /\[PISTA:/);
  assert.match(full, /\[TENSAO:n\]/);
  assert.match(full, /RESPIRO/);
  assert.match(full, /\[FINAL:/);
  assert.match(full, /2\/3/);
  assert.equal(storyProgressLines({}, { short: true }).length, 1);
  assert.match(storyProgressLines({ ending: { title: 'Fim' } }).join(' '), /epílogo livre/);
});

test('stripStoryTags remove as tags novas', () => {
  assert.equal(stripStoryTags('a [PISTA:x] b [TENSAO:2] c [FINAL:t|e]').replace(/\s+/g, ' '), 'a b c ');
});

test('buildRecap usa a última cena e as tramas abertas', () => {
  const now = Date.now();
  const camp = {
    updatedAt: now - 3 * DAY,
    worldState: { location: 'Cais', promises: ['Voltar ao amanhecer'] },
    plots: [{ title: 'Aberta', hook: 'g' }, { title: 'Fechada', status: 'encerrada' }],
    disp: [{ type: 'gm', text: 'Primeira.' }, { type: 'user', text: 'eu' }, { type: 'gm', text: 'Última cena. ' + 'x'.repeat(500) }],
    clues: ['p1'],
    tension: 1,
  };
  const r = buildRecap(camp, now);
  assert.equal(r.away, 3);
  assert.equal(r.location, 'Cais');
  assert.deepEqual(r.plots, ['Aberta — g']);
  assert.match(r.lastScene, /^Última cena\./);
  assert.ok(r.lastScene.length <= 330);
  assert.equal(r.tension, 'Algo se move');
  assert.equal(buildRecap({ disp: [] }), null);
  assert.match(recapRequest(camp).content, /Aberta/);
});

test('returnNote só aparece depois de 2 dias e com campanha em andamento', () => {
  const now = Date.now();
  assert.equal(returnNote({ updatedAt: now - DAY, msgs: [1] }, now), '');
  assert.match(returnNote({ updatedAt: now - 5 * DAY, msgs: [1] }, now), /5 dias/);
  assert.equal(returnNote({ updatedAt: now - 5 * DAY, msgs: [] }, now), '');
  assert.equal(returnNote({ updatedAt: now - 5 * DAY, msgs: [1], ending: { title: 'x' } }, now), '');
  assert.equal(daysAway(new Date(now - 2 * DAY).toISOString(), now), 2);
});
