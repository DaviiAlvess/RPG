import { test } from 'node:test';
import assert from 'node:assert/strict';
import { masterChatPrompt, masterGuidance } from '../lib/master-chat.mjs';
import { economyPrompt } from '../lib/economy.mjs';

test('Conversa do Mestre usa cena e ficha sem revelar memória secreta ou criar eventos', () => {
  const campaign = { world: 'Fantasia', charName: 'Lia', hp: 90, memory: 'Segredo: o rei é um impostor.', worldState: { secrets: ['O rei é um impostor'] }, disp: [{ type: 'gm', text: 'Você está no mercado.' }], masterGuidance: 'Mais diálogo' };
  const prompt = masterChatPrompt(campaign);
  assert.ok(prompt.includes('Você está no mercado.'));
  assert.ok(prompt.includes('Não narre novas ações'));
  assert.ok(!prompt.includes('impostor'));
  assert.ok(prompt.includes('Mais diálogo'));
  assert.ok(!Object.hasOwn(campaign, 'masterChat'));
});

test('Combinados são limitados e também respeitados no modo economia', () => {
  assert.equal(masterGuidance({}), '');
  assert.ok(masterGuidance({ masterGuidance: 'x'.repeat(2000) }).length < 1900);
  assert.ok(economyPrompt({ masterGuidance: 'Mais diálogo' }, '', '').includes('Mais diálogo'));
});
