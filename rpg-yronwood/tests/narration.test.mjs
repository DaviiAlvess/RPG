import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NARRATION_STYLES, buildNarrationDirection, normalizeNarration } from '../lib/narration.mjs';
test('Campanhas antigas recebem preferências válidas', () => {
  assert.deepEqual(normalizeNarration(null), { style: 'cinematic', length: 'balanced', pace: 'balanced' });
  assert.equal(normalizeNarration({ style: 'toString', pace: 'invalid' }).style, 'cinematic');
});
test('Os seis estilos mudam a orientação e preservam escolhas e regras', () => {
  assert.equal(Object.keys(NARRATION_STYLES).length, 6);
  for (const [style, config] of Object.entries(NARRATION_STYLES)) {
    const prompt = buildNarrationDirection({ style, length: 'short', pace: 'slow' });
    assert.ok(prompt.includes(config.instruction));
    assert.ok(prompt.includes(config.sample));
    assert.ok(prompt.includes('MODELO DE VOZ'));
    assert.ok(prompt.includes('80–140'));
    assert.ok(prompt.includes('Não invente urgência'));
    assert.ok(prompt.includes('Nunca avance uma decisão pelo jogador'));
    assert.ok(prompt.includes('Nunca invente diálogo para o personagem do jogador'));
    assert.ok(prompt.includes('você sente medo'));
    assert.ok(prompt.includes('última ação do jogador'));
  }
  assert.ok(buildNarrationDirection({ length: 'balanced' }).includes('200–320'));
  assert.ok(buildNarrationDirection({ length: 'rich' }).includes('300–450'));
});
