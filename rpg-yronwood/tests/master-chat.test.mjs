import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MASTER_AGREEMENTS_MAX,
  appendMasterAgreements,
  applyMasterAgreements,
  applyMasterChatReply,
  capMasterAgreements,
  listMasterAgreements,
  masterChatPrompt,
  masterGuidance,
  masterInterventionContext,
  mergeMasterAgreements,
  parseAcordoTags,
  parseIntervencaoTags,
  stripAcordoTags,
  stripMasterTags,
} from '../lib/master-chat.mjs';
import { economyPrompt } from '../lib/economy.mjs';

test('Conversa do Mestre usa cena e ficha sem revelar memória secreta ou criar eventos', () => {
  const campaign = {
    world: 'Fantasia',
    charName: 'Lia',
    hp: 90,
    memory: 'Segredo: o rei é um impostor.',
    worldState: { secrets: ['O rei é um impostor'] },
    disp: [{ type: 'gm', text: 'Você está no mercado.' }],
    masterGuidance: 'Mais diálogo',
    charTitle: 'guarda da porta',
    charOriginTitle: 'estalagem',
    charSituation: 'pátio do mercado',
    relationships: { Arya: 'Neutral' },
  };
  const prompt = masterChatPrompt(campaign);
  assert.ok(prompt.includes('Você está no mercado.'));
  assert.ok(prompt.includes('Não narre novas ações'));
  assert.ok(prompt.includes('[ACORDO:'));
  assert.ok(prompt.includes('[RELAÇÃO:'));
  assert.ok(prompt.includes('[INTERVENÇÃO:'));
  assert.ok(prompt.includes('[CARGO:'));
  assert.ok(prompt.includes('valem NA HORA') || prompt.includes('APLICA as tags imediatamente'));
  assert.ok(prompt.includes('guarda da porta'));
  assert.ok(prompt.includes('estalagem'));
  assert.ok(prompt.includes('pátio do mercado'));
  assert.ok(prompt.includes('Arya'));
  assert.ok(!prompt.includes('Não afirme ter alterado'));
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

test('Extrai [INTERVENÇÃO:] e remove todas as tags da conversa visível', () => {
  assert.deepEqual(parseIntervencaoTags('Ok.\n[INTERVENÇÃO: Arya demonstra atração pelo jogador]'), ['Arya demonstra atração pelo jogador']);
  assert.deepEqual(parseIntervencaoTags('[intervenCAO: corrija o cargo] e [INTERVENÇÃO: mostre a atração]'), ['corrija o cargo', 'mostre a atração']);
  const visible = stripMasterTags('Aplicado.\n[RELAÇÃO:Arya|Amigável]\n[ACORDO: Arya demonstra atração pelo jogador]\n[INTERVENÇÃO: Arya demonstra atração]\n[CARGO:sargento] [SITUAÇÃO:porta norte] [HABILIDADE:lança]');
  assert.equal(visible, 'Aplicado.');
});

test('applyMasterChatReply aplica tags na hora e guarda intervenção para a próxima cena', () => {
  const campaign = {
    charTitle: 'guarda',
    charOriginTitle: 'estalagem',
    charSituation: 'pátio',
    charSkills: 'lança',
    relationships: { Arya: 'Neutral' },
    masterAgreements: [],
    memory: 'Estavam no pátio.',
  };
  const gm = [
    'Aplicado: Arya passa a demonstrar atração por você.',
    '[RELAÇÃO:Arya|Amigável]',
    '[ACORDO: Arya demonstra atração pelo jogador]',
    '[INTERVENÇÃO: Arya demonstra atração pelo jogador na cena atual]',
    '[CARGO:sargento]',
  ].join('\n');
  const next = applyMasterChatReply(campaign, gm);
  assert.equal(next.visible, 'Aplicado: Arya passa a demonstrar atração por você.');
  assert.equal(next.patch.relationships.Arya, 'Amigável');
  assert.equal(next.patch.charTitle, 'sargento');
  assert.equal(next.patch.charOriginTitle, 'estalagem');
  assert.ok(next.patch.masterAgreements.includes('Arya demonstra atração pelo jogador'));
  assert.ok(next.patch.pendingMasterNote.includes('Arya demonstra atração pelo jogador na cena atual'));
  assert.ok(next.patch.memory.includes('Intervenção do Mestre:'));
  assert.ok(next.patch.memory.includes('Estavam no pátio.'));
  assert.equal(next.changes.acordo, true);
  assert.equal(next.changes.cargo, true);
  assert.equal(next.changes.relacao, true);
  assert.equal(next.changes.intervencao, true);
  assert.ok(next.status.includes('Acordo salvo'));
  assert.ok(next.status.includes('Relação atualizada'));
  assert.deepEqual(campaign.relationships, { Arya: 'Neutral' });
});

test('Pergunta sem tags não altera ficha e intervenção pendente permanece', () => {
  const campaign = {
    charTitle: 'guarda',
    relationships: { Arya: 'Amigável' },
    pendingMasterNote: 'Mostre a atração',
    memory: 'Nota anterior.',
    masterAgreements: ['Cenas curtas'],
  };
  const next = applyMasterChatReply(campaign, 'O teste de Força vale quando a ação é física e incerta.');
  assert.equal(next.patch.charTitle, 'guarda');
  assert.equal(next.patch.relationships.Arya, 'Amigável');
  assert.equal(next.patch.pendingMasterNote, 'Mostre a atração');
  assert.equal(next.patch.memory, 'Nota anterior.');
  assert.deepEqual(next.patch.masterAgreements, ['Cenas curtas']);
  assert.equal(next.status, '');
});

test('Intervenção do Mestre entra no prompt de narração e no modo economia', () => {
  const note = 'Arya demonstra atração pelo jogador na cena atual';
  const full = masterInterventionContext(note);
  const short = masterInterventionContext(note, { short: true });
  assert.ok(full.includes('CONTEXTO INTERNO (não é fala do jogador)'));
  assert.ok(full.includes('aplique AGORA'));
  assert.ok(full.includes(note));
  assert.ok(short.startsWith('CONTEXTO INTERNO:'));
  assert.equal(masterInterventionContext(''), '');
  const economy = economyPrompt({ world: 'Westeros', charName: 'Edric', pendingMasterNote: note, items: [] }, '', 'Dia 2');
  assert.ok(economy.includes('INTERVENÇÃO DO MESTRE'));
  assert.ok(economy.includes(note));
  assert.ok(economy.includes('aplique AGORA'));
});
