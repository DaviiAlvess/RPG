import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectCharacterNames, buildCharacterNamingDirection, buildNpcPersonalityDirection } from '../lib/character-names.mjs';
test('Reserva nomes da ficha, NPCs e diálogos antigos sem duplicar acentos e caixa', () => {
  const campaign = { charName: 'Edric', relationships: { 'José': 'Amigável' }, worldState: { npcs: { ' JOSÉ ': 'Guarda' } }, msgs: [
    { role: 'assistant', content: '**Mara**: “Entre.”\n[ NPC:ignorado ]\n[NPC:Ren Aoki|Mensageiro]\nIara: "Olá"' },
    { role: 'user', content: 'Falso: "Não é um NPC confirmado"' }
  ] };
  assert.deepEqual(collectCharacterNames(campaign), ['Edric', 'José', 'Ren Aoki', 'Mara', 'Iara']);
  assert.ok(buildCharacterNamingDirection(campaign).includes('não renomeie ninguém retroativamente'));
  assert.match(buildCharacterNamingDirection(campaign), /personalidade\/voz/);
});
test('Campanhas sem histórico continuam compatíveis', () => {
  assert.deepEqual(collectCharacterNames(), []);
  assert.ok(buildCharacterNamingDirection({}).includes('nomes canônicos'));
});
test('Elenco ganha personalidade estável e reage ao jogador', () => {
  const prompt = buildNpcPersonalityDirection({
    charName: 'Edric',
    charPersonality: 'orgulhoso e direto',
    supportingCast: 'Lysa cobra o relatório. Kael espera na porta.',
    worldState: { npcs: { Lysa: 'escriba; seca e apressada; torre norte' } },
    relationships: { Lysa: 'Suspeito', Kael: 'Neutral' },
  });
  assert.match(prompt, /PERSONALIDADE DO ELENCO/);
  assert.match(prompt, /camadas/);
  assert.match(prompt, /orgulhoso e direto/);
  assert.match(prompt, /Lysa/);
  assert.match(prompt, /seca e apressada/);
  assert.match(prompt, /Kael/);
  assert.match(prompt, /cortesia vazia/i);
  assert.match(buildNpcPersonalityDirection({}), /Ainda sem elenco gravado/);
});
