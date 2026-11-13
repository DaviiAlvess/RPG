import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redoNote, REDO_STYLES, recordError, readErrorLog, errorReport, clearErrorLog, applyCombatTags, resolveCombat, asCombatEnded, stripCombatTags, combatPromptLines, combatActions, partyRoster, partyActor, nextPartyTurn, actorPrefix, partyPromptLines, updateNpcSeen } from '../lib/play-extras.mjs';
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

test('combate: a tela sabe quando o personagem saiu da luta e por quê', () => {
  const start = resolveCombat(null, 'Eles cercam você. [INIMIGO:Jimbo|pronto] [INIMIGO:Dolph|pronto]', 1);
  assert.equal(start.ended, null);
  assert.equal(start.combat.enemies.length, 2);
  // sem luta e sem tags: nada muda
  assert.deepEqual(resolveCombat(null, 'Você caminha pela rua.', 1), { combat: null, ended: null });
  // todos caídos ou rendidos: acabou mesmo sem [COMBATE_FIM]
  let r = resolveCombat(start.combat, 'Jimbo cai. [INIMIGO:Jimbo|caído] [INIMIGO:Dolph|se rendeu]', 2);
  assert.equal(r.combat, null);
  assert.equal(r.ended.reason, 'vitoria');
  assert.equal(r.ended.label, 'Inimigos vencidos');
  assert.equal(r.ended.at, 2);
  // todos fugiram
  assert.equal(resolveCombat(start.combat, '[INIMIGO:Jimbo|fugiu] [INIMIGO:Dolph|fugindo]', 2).ended.reason, 'fugiram');
  // um só caiu: a luta continua
  r = resolveCombat(start.combat, '[INIMIGO:Jimbo|caído]', 2);
  assert.ok(r.combat);
  assert.equal(r.ended, null);
  // o personagem fugiu e o Mestre narra a fuga
  r = resolveCombat(start.combat, 'Você dobra a esquina e os valentões ficam para trás.', 2, { playerText: 'Recuo e procuro uma saída' });
  assert.equal(r.ended.reason, 'fuga');
  // tag de fim com inimigos de pé e pedido de fuga
  assert.equal(resolveCombat(start.combat, 'Você some no beco. [COMBATE_FIM]', 2, { playerText: 'Fujo correndo' }).ended.reason, 'fuga');
  assert.equal(resolveCombat(start.combat, 'Trégua. [COMBATE_FIM]', 2).ended.reason, 'fim');
  // o Mestre diz que acabou, sem tag
  assert.equal(resolveCombat(start.combat, 'A briga acabou; Dolph limpa o nariz.', 2).ended.reason, 'fim');
  // pulo de tempo encerra
  assert.equal(resolveCombat(start.combat, 'Três dias depois…', 2, { sceneChange: true }).ended.reason, 'cena');
  // três respostas sem notícia: a luta ficou para trás
  let c = start.combat;
  c = resolveCombat(c, 'Conversa.', 2).combat;
  c = resolveCombat(c, 'Conversa.', 3).combat;
  assert.ok(c);
  r = resolveCombat(c, 'Conversa.', 4);
  assert.equal(r.ended.reason, 'sumiu');
  // o aviso vale só no turno em que a luta acabou
  const note = resolveCombat(start.combat, '[COMBATE_FIM]', 5).ended;
  assert.equal(asCombatEnded(note, 5).label, 'A luta acabou');
  assert.equal(asCombatEnded(note, 6), null);
  assert.equal(asCombatEnded({ reason: 'xyz', at: 5 }, 5), null);
  // instrução curta (modo economia) também pede para fechar a luta
  assert.match(combatPromptLines({ combat: start.combat }, { short: true }).join(' '), /COMBATE_FIM/);
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
