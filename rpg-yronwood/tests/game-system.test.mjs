import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySystemTags, buyItem, normalizeSystem, rankFor, stripSystemTags, systemPromptLines, purchaseNote } from '../lib/game-system.mjs';

const base = { enabled: true, name: 'Sistema', points: 0, shop: [{ id: 'po', name: 'Poção', desc: 'cura', cost: 20 }, { id: 'olho', name: 'Olho', desc: 'vê', cost: 10, once: true }] };

test('pontos, missão e conclusão', () => {
  let r = applySystemTags('[SISTEMA_PONTOS:+15|venceu o duelo] [SISTEMA_MISSAO:Achar o espião|30]', base);
  assert.equal(r.system.points, 15);
  assert.equal(r.system.quests.length, 1);
  r = applySystemTags('[SISTEMA_MISSAO_FIM:achar o espião]', r.system);
  assert.equal(r.system.points, 45);
  assert.equal(r.system.quests[0].done, true);
  assert.equal(r.events[0].type, 'quest_done');
  assert.equal(applySystemTags('[SISTEMA_PONTOS:+5]', null).events.length, 0);
});

test('abates dão pontos por perigo e a meta sobe o nível', async () => {
  const { metaFor, metaProgress } = await import('../lib/game-system.mjs');
  assert.deepEqual([metaFor(1), metaFor(2), metaFor(3)], [50, 150, 300]);
  let r = applySystemTags('[SISTEMA_ABATE:Bandido|comum] [SISTEMA_ABATE:Capitão|chefe]', base);
  assert.equal(r.system.points, 90);
  assert.equal(r.system.kills, 2);
  assert.equal(r.system.level, 2);
  assert.ok(r.events.some((e) => e.type === 'level' && e.level === 2));
  const spent = buyItem(r.system, 'po').system;
  assert.equal(spent.points, 70);
  assert.equal(spent.level, 2);
  assert.equal(metaProgress(spent).next, 150);
  r = applySystemTags('[SISTEMA_PONTOS:+300|feito]', spent);
  assert.equal(r.system.level, 4);
  assert.equal(r.events.filter((e) => e.type === 'level').length, 2);
  assert.equal(rankFor(0), 'E');
  assert.equal(stripSystemTags('a [SISTEMA_ABATE:x|forte] b').replace(/\s+/g, ' '), 'a b');
});

test('loja cobra, bloqueia sem saldo e item único', () => {
  const sys = { ...base, points: 25 };
  assert.equal(buyItem(sys, 'po').system.points, 5);
  assert.match(buyItem({ ...base, points: 5 }, 'po').error, /Faltam 15/);
  const once = buyItem(sys, 'olho');
  assert.equal(buyItem(once.system, 'olho').ok, false);
  assert.match(purchaseNote(once.item), /Olho/);
});

test('tags somem do texto e prompt descreve o Sistema', () => {
  assert.equal(stripSystemTags('a [SISTEMA_PONTOS:+5|x] b').replace(/\s+/g, ' '), 'a b');
  assert.match(systemPromptLines({ gameSystem: base }).join(' '), /【Sistema】/);
  assert.deepEqual(systemPromptLines({}), []);
  assert.equal(normalizeSystem({ enabled: false }), null);
});

test('sistema padrão tem loja válida', async () => {
  const { defaultSystem } = await import('../lib/game-system.mjs');
  const s = normalizeSystem(defaultSystem());
  assert.ok(s.shop.length >= 5);
  assert.equal(s.points, 0);
});

test('baú semanal conta a semana do jogo, não da vida real', async () => {
  const { openChest, chestStatus, CHEST_INTERVAL_DAYS, chestNote } = await import('../lib/game-system.mjs');
  const sys = { enabled: true, chestPool: [{ name: 'Espada', desc: 'a', kind: 'arma' }, { name: 'Salto', desc: 'b', kind: 'habilidade' }] };
  assert.equal(chestStatus(sys, 0).ready, true);
  const a = openChest(sys, 3, () => 0);
  assert.equal(a.reward.name, 'Espada');
  assert.equal(a.system.lastChestDay, 3);
  assert.equal(chestStatus(a.system, 9).daysLeft, 1);
  assert.equal(openChest(a.system, 9).ok, false);
  const b = openChest(a.system, 3 + CHEST_INTERVAL_DAYS, () => 0);
  assert.equal(b.reward.name, 'Salto');
  assert.match(chestNote(b.reward), /baú semanal/);
  assert.equal(b.system.chestPool.length, 2);
});

test('loja gerada pela IA é validada', async () => {
  const { parseGeneratedSystem } = await import('../lib/game-system.mjs');
  const txt = '```json\n{"shop":[{"name":"Runa","desc":"x","cost":999},{"name":"B","desc":"y","cost":10},{"name":"C","desc":"z"}],"chest":[{"name":"Arco","desc":"w","kind":"laser"}]}\n```';
  const g = parseGeneratedSystem(txt);
  assert.equal(g.shop[0].cost, 80);
  assert.equal(g.chest[0].kind, 'item');
  assert.equal(parseGeneratedSystem('nada'), null);
});

test('Sistema é invisível para os outros personagens', async () => {
  const { chestNote } = await import('../lib/game-system.mjs');
  assert.match(systemPromptLines({ gameSystem: base }).join(' '), /NPCs nunca reagem à interface/);
  assert.match(purchaseNote({ name: 'X', desc: 'y' }), /invisíveis para todos/);
  assert.match(chestNote({ name: 'X', desc: 'y', kind: 'arma' }), /invisíveis para todos/);
});

test('recompensas vão para inventário ou habilidades automaticamente', async () => {
  const { grantReward, rewardKind, systemSkillsLine } = await import('../lib/game-system.mjs');
  assert.equal(rewardKind({ kind: 'arma', name: 'Sabre' }), 'item');
  assert.equal(rewardKind({ kind: 'habilidade', name: 'Salto' }), 'habilidade');
  assert.equal(rewardKind({ name: 'Olhar de Hostilidade', desc: 'Por uma cena, você sabe quem quer ferir você.' }), 'habilidade');
  assert.equal(rewardKind({ name: 'Bolsa de Denários', desc: 'Moedas de prata.' }), 'item');
  const camp = { items: ['corda'], systemSkills: [] };
  const a = grantReward(camp, { name: 'Sabre', desc: 'x', kind: 'arma' });
  assert.deepEqual(a.patch.items, ['corda', 'Sabre']);
  const b = grantReward(camp, { name: 'Salto', desc: 'pula alto', kind: 'habilidade' }, 'Baú');
  assert.deepEqual(b.patch.systemSkills, [{ name: 'Salto', desc: 'pula alto', source: 'Baú' }]);
  assert.equal(grantReward({ systemSkills: b.patch.systemSkills }, { name: 'salto', kind: 'habilidade' }).duplicate, true);
  assert.match(systemSkillsLine({ systemSkills: b.patch.systemSkills }), /Salto/);
  assert.match(systemPromptLines({ gameSystem: base, systemSkills: b.patch.systemSkills }).join(' '), /HABILIDADES DO SISTEMA/);
});
