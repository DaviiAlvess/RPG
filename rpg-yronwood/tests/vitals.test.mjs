import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { economyPrompt } from '../lib/economy.mjs';
import {
  parseHpDelta,
  applyHpDelta,
  applyHpFromText,
  stripHpTags,
  hpChangeToast,
  clampHp
} from '../lib/vitals.mjs';

test('parseHpDelta aceita só deltas com sinal e soma tags', () => {
  assert.equal(parseHpDelta('[HP:+10]'), 10);
  assert.equal(parseHpDelta('[HP:-15]'), -15);
  assert.equal(parseHpDelta('[HP:+12] texto [HP:-8]'), 4);
  assert.equal(parseHpDelta('[hp:+3|poção]'), 3);
  assert.equal(parseHpDelta('[HP:42] [HP:10] [HP:+] [HP:-] [HP:abc] [HP:+0]'), 0);
  assert.equal(parseHpDelta('sem tags'), 0);
  assert.equal(parseHpDelta(''), 0);
});

test('applyHpDelta clampa HP entre 0 e 100', () => {
  assert.equal(applyHpDelta(90, 20), 100);
  assert.equal(applyHpDelta(8, -15), 0);
  assert.equal(applyHpDelta(50, -8), 42);
  assert.equal(applyHpDelta(40, 12), 52);
  assert.equal(clampHp(-4), 0);
  assert.equal(clampHp(140), 100);
  assert.equal(applyHpFromText(100, 'A lâmina rasga o ombro. [HP:-15]'), 85);
  assert.equal(applyHpFromText(10, '[HP:5] ferida descrita sem sinal'), 10);
});

test('stripHpTags remove a tag da narração visível', () => {
  assert.equal(stripHpTags('A espada corta. [HP:-8] O sangue escorre.'), 'A espada corta. O sangue escorre.');
  assert.equal(stripHpTags('[HP:+12]\nVocê respira melhor.'), '\nVocê respira melhor.');
});

test('toast descreve perda, cura e desmaio em 0 HP', () => {
  assert.equal(hpChangeToast(80, 72), 'Você perdeu 8 HP.');
  assert.equal(hpChangeToast(40, 52), 'Você recuperou 12 HP.');
  assert.equal(hpChangeToast(5, 0), 'Você caiu inconsciente (0 HP).');
  assert.equal(hpChangeToast(100, 100), '');
});

test('sendMsg aplica HP após a resposta do GM e o prompt pede a tag', async () => {
  const source = await readFile(new URL('../pages/index.js', import.meta.url), 'utf8');
  assert.ok(source.includes('parseHpDelta(raw)'));
  assert.ok(source.includes('setHp(nextHp)'));
  assert.ok(source.includes('hp: nextHp'));
  assert.ok(source.includes('stripHpTags('));
  assert.ok(source.includes('hpChangeToast'));
  assert.ok(source.includes('[HP:-8]'));
  assert.match(source, /n[aã]o morre automaticamente/i);
  const prompt = economyPrompt({ world: 'Teste', charName: 'Mara' }, '', 'Dia 1');
  assert.ok(prompt.includes('[HP:-8]'));
  assert.ok(prompt.includes('[HP:+12]'));
  assert.match(prompt, /n[aã]o morre automaticamente/i);
});
