import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURE_PRESETS } from '../lib/adventure-presets.mjs';
import { buildStartPrompt } from '../lib/narration.mjs';

test('Histórias prontas têm personalidade, poder, elenco e início que envolve', () => {
  assert.ok(ADVENTURE_PRESETS.length >= 12);
  const ids = new Set();
  for (const preset of ADVENTURE_PRESETS) {
    assert.ok(preset.id && !ids.has(preset.id), `id único: ${preset.id}`);
    ids.add(preset.id);
    assert.ok(String(preset.charPersonality || '').length > 80, `${preset.id} personalidade rica`);
    assert.ok(preset.specialAbility?.enabled && preset.specialAbility.name, `${preset.id} tem poder`);
    assert.ok(String(preset.supportingCast || '').includes('—') || String(preset.supportingCast || '').includes(';'), `${preset.id} elenco com voz`);
    assert.match(String(preset.storyStartPoint || ''), /:\s*["“]/, `${preset.id} início com fala`);
    assert.ok(Object.keys(preset.relationships || {}).length >= 1, `${preset.id} relações`);
    assert.ok(Array.isArray(preset.plots) && preset.plots[0]?.title, `${preset.id} trama`);
    const start = buildStartPrompt(preset);
    assert.match(start, /CENA INICIAL OBRIGATÓRIA|primeiro instante/i);
    assert.match(start, /INÍCIO VIVO/);
    assert.match(start, new RegExp(preset.specialAbility.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
