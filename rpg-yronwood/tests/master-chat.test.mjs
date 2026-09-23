import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  MASTER_AGREEMENTS_MAX,
  appendMasterAgreements,
  applyMasterAgreements,
  applyMasterChatReply,
  buildMasterBeatMessage,
  capMasterAgreements,
  inferMasterTags,
  inferNpcNameFromRequest,
  isMasterBeatMessage,
  isMasterChangeRequest,
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
  assert.ok(prompt.includes('FATO da mesa'));
  assert.ok(!prompt.includes('não são acontecimento'));
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
  assert.equal(next.needsSceneBeat, true);
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
  assert.ok(full.includes('prevalece sobre a regra de não dar intimidade'));
  assert.ok(short.startsWith('CONTEXTO INTERNO:'));
  assert.equal(masterInterventionContext(''), '');
  const economy = economyPrompt({ world: 'Westeros', charName: 'Edric', pendingMasterNote: note, items: [] }, '', 'Dia 2');
  assert.ok(economy.includes('INTERVENÇÃO DO MESTRE'));
  assert.ok(economy.includes(note));
  assert.ok(economy.includes('aplique AGORA'));
});

test('Pedido de atração sem tags do modelo ainda aplica relação e pede beat na cena', () => {
  assert.equal(isMasterChangeRequest('quero que a Arya tenha atração por mim'), true);
  assert.equal(isMasterChangeRequest('quero que Arya tenha atração por mim'), true);
  assert.equal(isMasterChangeRequest('por que preciso desse teste?'), false);
  assert.equal(isMasterChangeRequest('quero que você explique o teste de Força'), false);
  const campaign = { relationships: { Arya: 'Neutral' }, masterAgreements: [], memory: '' };
  assert.equal(inferNpcNameFromRequest(campaign, 'quero que Arya tenha atração por mim'), 'Arya');
  assert.equal(inferNpcNameFromRequest({}, 'quero que a Sansa tenha atração por mim'), 'Sansa');
  const tags = inferMasterTags(campaign, 'quero que a Arya tenha atração por mim');
  assert.ok(tags.some(tag => tag.includes('RELAÇÃO:Arya|Amigável')));
  const next = applyMasterChatReply(campaign, 'Combinado, vou considerar isso.', 'quero que a Arya tenha atração por mim');
  assert.equal(next.patch.relationships.Arya, 'Amigável');
  assert.ok(next.patch.masterAgreements.some(item => item.includes('Arya demonstra atração')));
  assert.ok(next.patch.pendingMasterNote.includes('Arya demonstra atração'));
  assert.equal(next.visible, 'Combinado, vou considerar isso.');
  assert.equal(next.needsSceneBeat, true);
  assert.ok(next.changes.relacao);
  assert.ok(next.changes.intervencao);
  assert.ok(next.changes.acordo);
});

test('Modelo só com [RELAÇÃO:] ainda infere intervenção para o beat da cena', () => {
  const campaign = { relationships: { Arya: 'Neutral' }, masterAgreements: [], memory: '' };
  const next = applyMasterChatReply(campaign, 'Aplicado.\n[RELAÇÃO:Arya|Atraída]', 'quero que a Arya tenha atração por mim');
  assert.equal(next.patch.relationships.Arya, 'Amigável');
  assert.ok(next.patch.pendingMasterNote.includes('Arya demonstra atração'));
  assert.equal(next.needsSceneBeat, true);
});

test('Beat do Mestre é contexto interno, não fala do jogador', () => {
  const message = buildMasterBeatMessage('Arya demonstra atração pelo jogador na cena atual');
  assert.equal(isMasterBeatMessage(message), true);
  assert.ok(message.includes('CENA ATUAL'));
  assert.ok(message.includes('Não recuse por ser protagonista'));
  assert.equal(isMasterBeatMessage('Olho ao redor'), false);
});

test('askMaster libera o lock e dispara o beat no chat de jogo na hora', async () => {
  const source = await readFile(new URL('../pages/index.js', import.meta.url), 'utf8');
  const ask = source.slice(source.indexOf('const askMaster'), source.indexOf('const executeTimeSkip'));
  const send = source.slice(source.indexOf('const sendMsg'), source.indexOf('sendMsgRef.current = sendMsg'));
  assert.ok(ask.includes('sending.current = false'));
  assert.ok(ask.includes('setPlayPanel("narrator")'));
  assert.ok(ask.includes('sendMsgRef.current'));
  assert.ok(ask.includes('buildMasterBeatMessage'));
  assert.ok(ask.includes('needsSceneBeat'));
  assert.ok(ask.includes('timeoutMs: GM_CLIENT_TIMEOUT_MS'));
  assert.equal(ask.includes('await sendMsg('), false);
  assert.ok(send.includes('isMasterBeat ? memoryUntil'));
  assert.ok(send.includes('!isMasterBeat && shouldGroundGmTurn'));
  assert.ok(send.includes('timeoutMs: GM_CLIENT_TIMEOUT_MS'));
  assert.ok(send.includes('pendingMasterNoteRef.current = pendingMasterNote'));
  const economy = economyPrompt({ world: 'Westeros', charName: 'Edric', ordinaryCharacter: true, pendingMasterNote: 'Arya demonstra atração', items: [] }, '', 'Dia 2');
  assert.ok(economy.includes('EXCETO INTERVENÇÃO DO MESTRE'));
  assert.ok(economy.includes('fato da mesa'));
});
