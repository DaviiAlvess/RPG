import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMasterChatReply, parseProgressTags, inferProgressTags, applyProgressAdjust, masterChatPrompt } from '../lib/master-chat.mjs';

const camp = { world: 'W', charName: 'Ana', experience: 40, level: 1, hp: 50, relationships: {}, disp: [] };

test('tags do Mestre ajustam XP, nível e pontos', () => {
  assert.deepEqual(parseProgressTags('ok [AJUSTE_XP:+50] [AJUSTE_NIVEL:+2] [AJUSTE_PONTOS:+30]'), { xp: 50, levels: 2, points: 30, sysLevels: 0, rank: null });
  assert.deepEqual(parseProgressTags('[AJUSTE_XP:+99999]'), { xp: 5000, levels: 0, points: 0, sysLevels: 0, rank: null });
});

test('subir 2 níveis eleva nível, garante XP mínimo e cura', () => {
  const p = applyProgressAdjust(camp, { xp: 0, levels: 2, points: 0 });
  assert.deepEqual([p.level, p.experience, p.hp], [3, 200, 100]);
  const down = applyProgressAdjust({ ...camp, level: 3, experience: 250 }, { xp: 0, levels: -1, points: 0 });
  assert.deepEqual([down.level, down.experience], [2, 199]);
});

test('pedido direto funciona mesmo sem tag do Mestre', () => {
  assert.deepEqual(inferProgressTags('me dá 50 de xp por favor'), ['[AJUSTE_XP:+50]']);
  assert.deepEqual(inferProgressTags('sobe 2 níveis pra mim'), ['[AJUSTE_NIVEL:+2]']);
  assert.deepEqual(inferProgressTags('quero subir de nível'), ['[AJUSTE_NIVEL:+1]']);
  assert.deepEqual(inferProgressTags('quero 30 pontos do sistema'), ['[AJUSTE_PONTOS:+30]']);
  assert.deepEqual(inferProgressTags('como funciona o xp?'), []);
  const r = applyMasterChatReply(camp, 'Feito, já vale.', 'me da 60 de exp');
  assert.equal(r.patch.experience, 100);
  assert.match(r.status, /\+60 XP/);
  assert.equal(r.visible, 'Feito, já vale.');
});

test('tag do Mestre tem prioridade e some do texto visível', () => {
  const r = applyMasterChatReply(camp, 'Pronto, subiu!\n[AJUSTE_NIVEL:+1]', 'sobe 5 níveis');
  assert.equal(r.patch.level, 2);
  assert.doesNotMatch(r.visible, /AJUSTE/);
  assert.match(r.status, /Nível 2/);
});

test('pontos do Sistema só mudam com Sistema ligado', () => {
  const withSys = applyMasterChatReply({ ...camp, gameSystem: { enabled: true, points: 10 } }, 'ok [AJUSTE_PONTOS:+30]', '');
  assert.equal(withSys.patch.gameSystem.points, 40);
  const without = applyMasterChatReply(camp, 'ok [AJUSTE_PONTOS:+30]', '');
  assert.equal(without.patch.gameSystem, undefined);
});

test('prompt do Mestre autoriza XP e nível quando o jogador pede', () => {
  const p = masterChatPrompt(camp);
  assert.match(p, /\[AJUSTE_XP:\+n\]/);
  assert.match(p, /ATENDA/);
  assert.doesNotMatch(p, /não conceda recompensas/);
});

const sysCamp = { ...camp, gameSystem: { enabled: true, points: 10, earned: 10, rank: 'E', level: 1 } };

test('Mestre sobe o rank do Sistema para C (nível, meta e Ficha juntos)', () => {
  assert.deepEqual(inferProgressTags('sobe meu rank para C'), ['[AJUSTE_RANK:C]']);
  assert.deepEqual(inferProgressTags('quero rank d'), ['[AJUSTE_RANK:D]']);
  const r = applyMasterChatReply(sysCamp, 'Feito. [AJUSTE_RANK:C]', 'me coloca no rank C');
  assert.equal(r.patch.gameSystem.rank, 'C');
  assert.equal(r.patch.gameSystem.level, 10);
  assert.equal(r.patch.level, 10);
  assert.equal(r.patch.systemChange, undefined);
  assert.equal(r.visible, 'Feito.');
  assert.match(r.status, /Rank C/);
  assert.equal(r.progress.patch.systemChange.rankAfter, 'C');
});

test('Mestre baixa o rank e ajusta níveis do Sistema', () => {
  const high = { ...sysCamp, gameSystem: { enabled: true, points: 0, earned: 3000, rank: 'C', level: 11 } };
  const down = applyProgressAdjust(high, { rank: 'D' });
  assert.equal(down.gameSystem.rank, 'D');
  assert.ok(down.gameSystem.level <= 9);
  const up = applyProgressAdjust(sysCamp, { sysLevels: 4 });
  assert.equal(up.gameSystem.level, 5);
  assert.equal(up.gameSystem.rank, 'D');
  assert.deepEqual(inferProgressTags('sobe 3 níveis do sistema'), ['[AJUSTE_NIVEL_SISTEMA:+3]']);
});

test('pontos pedidos ao Mestre recalculam nível e rank do Sistema', () => {
  const p = applyProgressAdjust(sysCamp, { points: 500 });
  assert.equal(p.gameSystem.points, 510);
  assert.equal(p.gameSystem.level, 5);
  assert.equal(p.gameSystem.rank, 'D');
  assert.equal(p.level, 5);
  assert.deepEqual(inferProgressTags('coloca 200 pontos'), ['[AJUSTE_PONTOS:+200]']);
});
