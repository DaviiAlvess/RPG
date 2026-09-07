import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectCharacterNames, buildCharacterNamingDirection } from '../lib/character-names.mjs';
test('Reserva nomes da ficha, NPCs e diálogos antigos sem duplicar acentos e caixa', () => {
  const campaign = { charName: 'Edric', relationships: { 'José': 'Amigável' }, worldState: { npcs: { ' JOSÉ ': 'Guarda' } }, msgs: [
    { role: 'assistant', content: '**Mara**: “Entre.”\n[ NPC:ignorado ]\n[NPC:Ren Aoki|Mensageiro]\nIara: "Olá"' },
    { role: 'user', content: 'Falso: "Não é um NPC confirmado"' }
  ] };
  assert.deepEqual(collectCharacterNames(campaign), ['Edric', 'José', 'Ren Aoki', 'Mara', 'Iara']);
  assert.ok(buildCharacterNamingDirection(campaign).includes('não renomeie ninguém retroativamente'));
});
test('Campanhas sem histórico continuam compatíveis', () => {
  assert.deepEqual(collectCharacterNames(), []);
  assert.ok(buildCharacterNamingDirection({}).includes('nomes canônicos'));
});
