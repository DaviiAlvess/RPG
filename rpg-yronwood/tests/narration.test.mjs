import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NARRATION_STYLES, buildNarrationDirection, buildStartPrompt, normalizeNarration } from '../lib/narration.mjs';
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
test('buildStartPrompt nunca usa a receita antiga de 3 elementos', () => {
  const camps = [
    { charName: 'Jon Snow', world: 'Westeros', isExistingChar: true, isKnownIP: true, storyStartPoint: 'No Muralha, o corvo pousa com o selo quebrado.' },
    { charName: 'Mira', world: 'Westeros', isExistingChar: false, isKnownIP: true, storyStartPoint: 'No porto, o mensageiro recusa desmontar.' },
    { charName: 'Kael', world: 'Vale de Cinzas', isExistingChar: false, isKnownIP: false },
    { charName: 'Ren Aoki', world: 'Naruto', isExistingChar: false, isKnownIP: true, ordinaryCharacter: true },
  ];
  for (const camp of camps) {
    const prompt = buildStartPrompt(camp);
    assert.equal(prompt.includes('3 elementos'), false);
    assert.equal(prompt.includes('dois sentidos'), false);
    assert.equal(prompt.includes('Use no máximo'), false);
    assert.equal(prompt.includes('Narre o cenário inicial'), false);
    assert.match(prompt, /corpo|detalhe/i);
  }
});
test('Personagem canônico e original ainda posicionam no canon quando há storyStartPoint', () => {
  const moment = 'No Muralha, o corvo pousa com o selo quebrado.';
  const existing = buildStartPrompt({
    charName: 'Jon Snow',
    world: 'Westeros',
    isExistingChar: true,
    isKnownIP: true,
    storyStartPoint: moment,
  });
  assert.ok(existing.includes(moment));
  assert.match(existing, /canônic/i);
  assert.ok(existing.includes('Jon Snow'));
  assert.ok(existing.includes('Westeros'));

  const original = buildStartPrompt({
    charName: 'Mira',
    world: 'Westeros',
    isExistingChar: false,
    isKnownIP: true,
    storyStartPoint: moment,
  });
  assert.ok(original.includes(moment));
  assert.match(original, /canon/i);
  assert.match(original, /original/i);
  assert.ok(original.includes('Mira'));
});
test('Campanha tipo Edric inclui o storyStartPoint no prompt de início', () => {
  const storyStartPoint = 'A palma ainda arde do ferro do portão quando o capataz empurra o pergaminho contra a mesa de Pedra Sangrenta.';
  const prompt = buildStartPrompt({
    charName: 'Edric Yronwood',
    world: 'Westeros — Crônicas de Gelo e Fogo',
    isKnownIP: true,
    isExistingChar: false,
    storyStartPoint,
    narration: { style: 'dark', length: 'rich', pace: 'balanced' },
  });
  assert.ok(prompt.includes(storyStartPoint));
  assert.equal(prompt.includes('3 elementos'), false);
  assert.equal(prompt.includes('dois sentidos'), false);
});
