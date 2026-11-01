import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackPlace, suggestActions, newAchievements, achievementView, ACHIEVEMENTS } from '../lib/codex.mjs';

test('trackPlace acrescenta sem repetir', () => {
  let p = trackPlace([], 'Cais', 1);
  p = trackPlace(p, 'cais', 2);
  p = trackPlace(p, 'Estaleiro', 3);
  assert.deepEqual(p.map((x) => x.name), ['Cais', 'Estaleiro']);
  assert.equal(trackPlace(p, '', 4).length, 2);
});

test('suggestActions usa quem está na cena, pista, trama e corpo', () => {
  const c = {
    disp: [{ type: 'gm', text: 'Bento grita. Russo ri no canto.' }],
    relationships: { Bento: 'Amigável', Russo: 'Hostil', Iara: 'Neutral' },
    worldState: { npcs: { Iara: 'pescadora' } },
    clues: ['Pregos da Marinha'],
    plots: [{ title: 'O barco sem tripulação' }],
    hp: 20,
  };
  const ideas = suggestActions(c);
  assert.equal(ideas.length, 4);
  assert.deepEqual(ideas.slice(0, 2).map((i) => i.label), ['Falar com Bento', 'Pressionar Russo']);
  assert.match(ideas[2].text, /pregos da marinha/);
  assert.ok(!ideas.some((i) => i.label.includes('Iara')));
  assert.equal(suggestActions({}).length, 2);
});

test('conquistas liberam uma vez só', () => {
  const c = { clues: ['a'], hp: 10, relationships: { X: 'Hostil' }, tension: 3 };
  const first = newAchievements(c);
  assert.deepEqual(first.map((a) => a.id).sort(), ['inimigo', 'ponto-sem-volta', 'por-um-fio', 'primeira-pista'].sort());
  assert.equal(newAchievements({ ...c, achievements: first }).length, 0);
  const view = achievementView({ achievements: first });
  assert.equal(view.length, ACHIEVEMENTS.length);
  assert.equal(view.filter((v) => v.unlocked).length, 4);
  assert.equal(view[0].check, undefined);
});
