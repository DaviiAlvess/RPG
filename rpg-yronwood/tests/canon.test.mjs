import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { knownIpFidelityRule, shouldGroundGmTurn } from '../lib/canon.mjs';
import { economyPrompt } from '../lib/economy.mjs';

test('Regra dura de IP conhecido pede física, lugares e não reescrever protagonistas', () => {
  const rule = knownIpFidelityRule('Naruto');
  assert.match(rule, /REGRA DURA/);
  assert.ok(rule.includes('Naruto'));
  assert.match(rule, /física/i);
  assert.match(rule, /lugares nomeados/i);
  assert.match(rule, /sistema de poder/i);
  assert.match(rule, /extras locais/);
  assert.match(rule, /destino canônico dos protagonistas/);
  assert.match(rule, /genérico-local/);
});

test('Primeiros turnos de campanha known-IP usam grounding; originais e turnos tardios não', () => {
  assert.equal(shouldGroundGmTurn({ isKnownIP: true }, 0), true);
  assert.equal(shouldGroundGmTurn({ isKnownIP: true }, 4), true);
  assert.equal(shouldGroundGmTurn({ isKnownIP: true }, 6), false);
  assert.equal(shouldGroundGmTurn({ isKnownIP: false }, 0), false);
  assert.equal(shouldGroundGmTurn({}, 0), false);
});

test('Economia inclui a regra dura no topo quando isKnownIP, sem apagar personagem comum', () => {
  const prompt = economyPrompt({
    world: 'One Piece',
    isKnownIP: true,
    ordinaryCharacter: true,
    charName: 'Lia',
    worldBg: 'Aventura original paralela.',
  }, 'Briefing canônico de facções', 'dia 1');
  const hard = knownIpFidelityRule('One Piece');
  assert.ok(prompt.indexOf(hard) < prompt.indexOf('PERSONAGEM:'));
  assert.ok(prompt.includes('Briefing canônico de facções'));
  assert.ok(prompt.includes('Aventura original paralela.'));
  assert.ok(prompt.includes('pessoa comum'));
  assert.ok(prompt.includes('[TESTE:Força|DC:12]'));
  assert.ok(prompt.includes('[XP:n]'));
});

test('Economia sem IP conhecido não injeta a regra dura', () => {
  const prompt = economyPrompt({ world: 'Vale de Cinzas', charName: 'Kael' }, '', 'dia 1');
  assert.equal(prompt.includes('REGRA DURA'), false);
  assert.equal(prompt.includes('PERMANEÇA EM'), false);
});

test('Create flow busca lore e liga grounding nos primeiros turnos de IP conhecido', async () => {
  const source = await readFile(new URL('../pages/index.js', import.meta.url), 'utf8');
  assert.ok(source.includes('useLoreSearch: true'));
  assert.ok(source.includes('shouldGroundGmTurn'));
  assert.ok(source.includes('useGrounding:'));
  assert.ok(source.includes('knownIpFidelityRule'));
  assert.ok(source.includes('PERSONAGEM COADJUVANTE ORIGINAL'));
  assert.ok(source.includes('A aventura segue sem o briefing da busca.'));
  assert.equal(source.includes('setView("create"); showNotification(error.message, "error"); return;'), false);
});
