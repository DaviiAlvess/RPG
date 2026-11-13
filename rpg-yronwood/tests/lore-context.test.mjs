import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidateTopics, pendingLoreTopics, loreNotesLines, mergeLoreNotes, loreContextFor, recentLoreText } from '../lib/lore-context.mjs';

test('acha nomes próprios da obra no texto, sem palavras de começo de frase', () => {
  const names = candidateTopics('Você entra em Correrrio. Lorde Hoster Tully tosse, e Sor Brynden Tully, o Peixe Negro, olha. Mas Roose Bolton já sabe. Ela fala. Então você vai. [PISTA:Walder Frey]');
  for (const n of ['Correrrio', 'Lorde Hoster Tully', 'Sor Brynden Tully', 'Peixe Negro', 'Roose Bolton']) assert.ok(names.includes(n), n);
  for (const n of ['Mas', 'Ela', 'Então', 'Walder Frey']) assert.ok(!names.includes(n), n);
});

test('só pesquisa nomes novos, e só em história de obra conhecida', () => {
  const camp = { isKnownIP: true, charName: 'Aldric Rivers', worldState: { npcs: { Edwyn: 'x' } }, loreNotes: { Harrenhal: 'castelo' }, loreTried: ['Walder Frey'] };
  const pend = pendingLoreTopics(camp, 'Aldric olha Edwyn conversar com Sor Brynden Tully perto de Harrenhal, longe de Walder Frey e de Correrrio.');
  assert.deepEqual(pend, ['Sor Brynden Tully', 'Correrrio']);
  assert.deepEqual(pendingLoreTopics({ ...camp, isKnownIP: false }, 'Sor Brynden Tully'), []);
});

test('notas pesquisadas entram no prompt só quando o nome está em cena', () => {
  const merged = mergeLoreNotes({}, { 'Sor Brynden Tully': 'O Peixe Negro, tio de Catelyn.', Fulano: 'Desconhecido na obra.' }, ['Sor Brynden Tully', 'Fulano']);
  assert.deepEqual(Object.keys(merged.loreNotes), ['Sor Brynden Tully']);
  assert.deepEqual(merged.loreTried, ['Sor Brynden Tully', 'Fulano']);
  const camp = { ...merged };
  assert.match(loreNotesLines(camp, 'Sor Brynden Tully ergue a mão.').join(' '), /Peixe Negro, tio de Catelyn/);
  assert.deepEqual(loreNotesLines(camp, 'Ninguém aqui.'), []);
});

test('o recorte da história vai junto na pesquisa e o texto recente junta jogador e narração', () => {
  const ctx = loreContextFor({ worldBg: 'Ano 130 depois da Conquista. A Dança dos Dragões.', charTitle: 'Guardião de dragões', worldState: { location: 'Fosso dos Dragões' } });
  assert.match(ctx, /Ano 130/);
  assert.match(ctx, /Fosso dos Dragões/);
  const recent = recentLoreText('falo com Mestre Harrold', [{ type: 'gm', text: 'Cinzaluz ruge.' }, { type: 'user', text: 'x' }]);
  assert.match(recent, /Harrold/);
  assert.match(recent, /Cinzaluz/);
});
