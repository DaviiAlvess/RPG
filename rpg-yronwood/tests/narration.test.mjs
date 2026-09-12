import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NARRATION_STYLES, NARRATION_VISION_LOCK, buildNarrationDirection, buildStartPrompt, normalizeNarration } from '../lib/narration.mjs';
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
    assert.match(config.sample, /você/i);
    assert.ok(config.instruction.includes('segunda pessoa'));
    assert.ok(config.instruction.includes('câmera é o corpo do jogador'));
    assert.ok(config.instruction.includes('À sua frente'));
    assert.ok(config.instruction.includes('transeunte'));
    assert.ok(config.instruction.includes('figura encapuzada'));
    assert.equal(/^o (transeunte|mensageiro)/i.test(config.sample.trim()), false);
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
test('POV ancora no jogador e proíbe câmera em NPC', () => {
  const prompt = buildNarrationDirection({ style: 'literary', length: 'balanced', pace: 'balanced' });
  assert.match(prompt, /câmera é o jogador/i);
  assert.ok(prompt.includes('segunda pessoa'));
  assert.ok(prompt.includes('"você"'));
  assert.ok(prompt.includes(NARRATION_VISION_LOCK));
  assert.ok(prompt.includes('transeunte'));
  assert.ok(prompt.includes('figura encapuzada'));
  assert.ok(prompt.includes('a partir de você'));
  assert.ok(prompt.includes('NÃO terceira pessoa de conto'));
  assert.ok(prompt.includes('Não corte no meio'));
  assert.ok(prompt.includes('conflito na sua cara'));
  assert.ok(prompt.includes('você sente medo'));
  assert.ok(prompt.includes('Nunca invente diálogo para o personagem do jogador'));
  const start = buildStartPrompt({ charName: 'Edric', world: 'Dorne' });
  assert.match(start, /câmera é o jogador/i);
  assert.ok(start.includes('"você"'));
  assert.ok(start.includes(NARRATION_VISION_LOCK));
  assert.ok(start.includes('transeunte'));
  assert.ok(start.includes('figura encapuzada'));
  assert.ok(start.includes('a partir de você'));
});
test('Os seis samples ensinam segunda pessoa a partir do corpo', () => {
  const keys = ['cinematic', 'literary', 'dark', 'light', 'epic', 'intimate'];
  assert.deepEqual(Object.keys(NARRATION_STYLES), keys);
  for (const key of keys) {
    const sample = NARRATION_STYLES[key].sample;
    assert.match(sample, /você/i, `${key} sample precisa de "você"`);
    assert.ok(/carta|selo|envelope/i.test(sample), `${key} sample deve ser a cena do mensageiro`);
    assert.equal(/^o (transeunte|mensageiro|figura)/i.test(sample.trim()), false, `${key} não abre no NPC`);
  }
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
test('IP conhecido abre em lugar/era do mundo, não numa estrada genérica, e preserva pessoa comum', () => {
  const original = buildStartPrompt({
    charName: 'Ren Aoki',
    world: 'Naruto',
    isExistingChar: false,
    isKnownIP: true,
    ordinaryCharacter: true,
  });
  assert.match(original, /lugar e era plausíveis/i);
  assert.match(original, /estrada de terra genérica/i);
  assert.ok(original.includes('Naruto'));
  assert.match(original, /pessoa comum/);
  assert.match(original, /sem profecia/);
  assert.match(original, /câmera é o jogador/i);
  assert.ok(original.includes('"você"'));
  const originalWorld = buildStartPrompt({
    charName: 'Kael',
    world: 'Vale de Cinzas',
    isKnownIP: false,
  });
  assert.equal(originalWorld.includes('estrada de terra genérica'), false);
  assert.equal(originalWorld.includes('lugar e era plausíveis'), false);
});
