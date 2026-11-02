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

test('rank sobe com pontos ganhos', () => {
  assert.equal(rankFor(0), 'E');
  assert.equal(rankFor(160), 'C');
  const r = applySystemTags('[SISTEMA_PONTOS:+60|x]', base);
  assert.equal(r.system.rank, 'D');
  assert.ok(r.events.some((e) => e.type === 'rank'));
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
