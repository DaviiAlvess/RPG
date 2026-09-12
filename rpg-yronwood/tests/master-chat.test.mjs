import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MASTER_AGREEMENTS_MAX,
  appendMasterAgreements,
  applyMasterAgreements,
  capMasterAgreements,
  listMasterAgreements,
  masterChatPrompt,
  masterGuidance,
  mergeMasterAgreements,
  parseAcordoTags,
  stripAcordoTags,
} from '../lib/master-chat.mjs';
import { economyPrompt } from '../lib/economy.mjs';

test('Conversa do Mestre usa cena e ficha sem revelar memória secreta ou criar eventos', () => {
  const campaign = { world: 'Fantasia', charName: 'Lia', hp: 90, memory: 'Segredo: o rei é um impostor.', worldState: { secrets: ['O rei é um impostor'] }, disp: [{ type: 'gm', text: 'Você está no mercado.' }], masterGuidance: 'Mais diálogo' };
  const prompt = masterChatPrompt(campaign);
  assert.ok(prompt.includes('Você está no mercado.'));
  assert.ok(prompt.includes('Não narre novas ações'));
  assert.ok(prompt.includes('[ACORDO:'));
  assert.ok(!prompt.includes('impostor'));
  assert.ok(prompt.includes('Mais diálogo'));
  assert.ok(!Object.hasOwn(campaign, 'masterChat'));
});

test('Combinados são limitados e também respeitados no modo economia', () => {
  assert.equal(masterGuidance({}), '');
  const long = masterGuidance({ masterGuidance: 'x'.repeat(5000) });
  assert.ok(long.includes('respeite os acordos da mesa'));
  assert.ok(long.length < 2800);
  assert.ok((long.match(/x/g) || []).length <= MASTER_AGREEMENTS_MAX);
  assert.ok(economyPrompt({ masterGuidance: 'Mais diálogo' }, '', '').includes('Mais diálogo'));
  assert.ok(economyPrompt({ masterAgreements: ['Cenas curtas'] }, '', '').includes('Cenas curtas'));
  assert.ok(economyPrompt({ masterAgreements: ['Cenas curtas'] }, '', '').includes('respeite os acordos da mesa'));
});

test('Extrai [ACORDO:] da conversa do Mestre, remove a tag e deduplica a lista', () => {
  assert.deepEqual(parseAcordoTags('Combinado.\n[ACORDO: Mais diálogo e menos combate]'), ['Mais diálogo e menos combate']);
  assert.deepEqual(parseAcordoTags('[ACORDO: Tom íntimo] ok [acordo: Tom íntimo] [ACORDO: Cenas curtas]'), ['Tom íntimo', 'Tom íntimo', 'Cenas curtas']);
  assert.equal(stripAcordoTags('Combinado.\n[ACORDO: Mais diálogo]\nPode seguir.'), 'Combinado.\nPode seguir.');
  assert.deepEqual(appendMasterAgreements({ masterGuidance: 'Mais diálogo' }, ['Mais diálogo', 'Cenas curtas']), ['Mais diálogo', 'Cenas curtas']);
  const merged = mergeMasterAgreements({ masterAgreements: ['Mais diálogo'] }, ['mais   diálogo', 'Evitar horror']);
  assert.deepEqual(merged.list, ['Mais diálogo', 'Evitar horror']);
  assert.deepEqual(merged.added, ['Evitar horror']);
  const fields = applyMasterAgreements(['Primeiro', 'Segundo']);
  assert.deepEqual(fields.masterAgreements, ['Primeiro', 'Segundo']);
  assert.equal(fields.masterGuidance, 'Primeiro\nSegundo');
  assert.deepEqual(listMasterAgreements({ masterGuidance: 'Linha A\n- Linha B' }), ['Linha A', 'Linha B']);
});

test('Acordos novos entram no prompt e o excesso é cortado sem perder os mais recentes', () => {
  const oversized = capMasterAgreements(['aaaaaaaaaa', 'b'.repeat(MASTER_AGREEMENTS_MAX - 10), 'novo']);
  assert.deepEqual(oversized.slice(-1), ['novo']);
  assert.ok(!oversized.includes('aaaaaaaaaa'));
  const prompt = masterGuidance({ masterAgreements: ['Nunca falar pelo jogador'] });
  assert.ok(prompt.includes('Nunca falar pelo jogador'));
  assert.ok(prompt.includes('respeite os acordos da mesa'));
});
