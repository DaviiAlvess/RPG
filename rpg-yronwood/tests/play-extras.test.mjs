import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redoNote, REDO_STYLES, recordError, readErrorLog, errorReport, clearErrorLog, applyCombatTags, stripCombatTags, combatPromptLines, combatActions, partyRoster, partyActor, nextPartyTurn, actorPrefix, partyPromptLines, updateNpcSeen } from '../lib/play-extras.mjs';
import { speakerVoice } from '../lib/voice-narration.mjs';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('refazer: nota interna com o estilo pedido e sem repetir a versão anterior', () => {
  assert.equal(REDO_STYLES.length, 5);
  const note = redoNote('tensa', 'O guarda ergue a lança e te encara.');
  assert.match(note, /Mais tensa/);
  assert.match(note, /O guarda ergue a lança/);
  assert.match(redoNote('xyz'), /Outra versão/);
});

test('registro de erros: guarda, junta repetidos, esconde chaves e gera relatório', () => {
  const st = memory();
  recordError(st, { kind: 'narração', code: 'RATE_LIMIT', message: 'Cota esgotada key=AIzaSECRET' }, 1000);
  recordError(st, { kind: 'narração', code: 'RATE_LIMIT', message: 'Cota esgotada key=AIzaSECRET' }, 2000);
  recordError(st, { kind: 'script', message: 'x is not a function', stack: 'at a\nat b' }, 3000);
  const log = readErrorLog(st);
  assert.equal(log.length, 2);
  assert.equal(log[0].count, 2);
  assert.doesNotMatch(log[0].message, /AIzaSECRET/);
  const report = errorReport(log, { now: 4000, campaign: 'Westeros' });
  assert.match(report, /RELATÓRIO DE PROBLEMAS/);
  assert.match(report, /RATE_LIMIT \(x2\)/);
  clearErrorLog(st);
  assert.deepEqual(readErrorLog(st), []);
});

test('combate: inimigos entram por tag, mudam de estado e a luta termina', () => {
  let c = applyCombatTags(null, 'O lobo salta. [INIMIGO:Lobo grande|pronto] [INIMIGO:Bandido|pronto]', 3);
  assert.deepEqual(c.enemies.map((e) => e.name), ['Lobo grande', 'Bandido']);
  c = applyCombatTags(c, 'Você acerta. [INIMIGO:Lobo grande|ferido] [INIMIGO:Bandido|fugiu]', 4);
  assert.equal(c.enemies[0].status, 'ferido');
  assert.equal(c.enemies[1].status, 'fugindo');
  assert.match(combatPromptLines({ combat: c }).join(' '), /Lobo grande \(ferido\)/);
  assert.equal(combatActions({ combat: c })[0].text, 'Ataco Lobo grande');
  assert.equal(applyCombatTags(c, 'Silêncio. [COMBATE_FIM]', 5), null);
  assert.equal(stripCombatTags('Ele cai. [INIMIGO:Lobo|caído] [COMBATE_FIM]'), 'Ele cai.  ');
  // sem notícias e ninguém de pé por duas respostas: acabou
  let q = applyCombatTags(null, '[INIMIGO:Rato|caído]', 1);
  q = applyCombatTags(q, 'nada', 2);
  assert.equal(applyCombatTags(q, 'nada', 3), null);
});

test('grupo no mesmo aparelho: vez de cada um, ação marcada e instrução ao Mestre', () => {
  const camp = { charName: 'Aldric', charTitle: 'bastardo', party: [{ id: 'a', name: 'Rafa', concept: 'arqueira' }], partyTurn: 1 };
  assert.equal(partyRoster(camp).length, 2);
  assert.equal(partyActor(camp).name, 'Rafa');
  assert.equal(nextPartyTurn(camp), 0);
  assert.equal(actorPrefix(camp, 'abro a porta'), '[Rafa] abro a porta');
  assert.equal(actorPrefix(camp, '[Aldric] abro a porta'), '[Rafa] abro a porta');
  assert.match(partyPromptLines(camp).join(' '), /A ação deste turno é de Rafa/);
  assert.deepEqual(partyPromptLines({ charName: 'Solo' }), []);
  assert.equal(actorPrefix({ charName: 'Solo' }, 'oi'), 'oi');
});

test('pessoas vistas na cena e voz própria de cada personagem', () => {
  const seen = updateNpcSeen({ worldState: { npcs: { 'Sor Hosman': 'x', Edwyn: 'y' }, location: 'Gêmeas' } }, 'Hosman brinda aos mortos.', 7);
  assert.deepEqual(seen, { 'Sor Hosman': { turn: 7, place: 'Gêmeas' } });
  const voices = [{ voiceURI: 'a', lang: 'pt-BR', name: 'A' }, { voiceURI: 'b', lang: 'pt-BR', name: 'B' }];
  const one = speakerVoice('Edwyn', voices, { pitch: 1, rate: 1 });
  assert.deepEqual(speakerVoice('Edwyn', voices, { pitch: 1, rate: 1 }), one);
  const sig = (n) => { const v = speakerVoice(n, voices, { pitch: 1, rate: 1 }); return `${v.voice?.voiceURI}|${v.pitch}`; };
  assert.ok(new Set(['Edwyn', 'Lyra Frey', 'Merrick', 'Sor Hosman', 'Grilo'].map(sig)).size > 1);
  assert.equal(speakerVoice('', voices, { pitch: 1, rate: 1 }).pitch, 1);
});
