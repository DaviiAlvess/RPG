import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyManualIdentity, identityPromptLines, parseIdentityTags, stripIdentityTags } from '../lib/identity.mjs';
import { economyPrompt } from '../lib/economy.mjs';

test('parseIdentityTags atualiza cargo, congela origem e não muta a campanha', () => {
  const camp = { charTitle: 'Ajudante de estalagem', charSkills: 'Cuidar de cavalos', charSituation: '' };
  const snapshot = { ...camp };
  const next = parseIdentityTags(
    'O capitão confirma. [CARGO:guarda da porta] [SITUAÇÃO:serve no pátio sob o sargento] [HABILIDADE:guarda, lança curta, vigília]',
    camp
  );
  assert.deepEqual(camp, snapshot);
  assert.equal(next.charTitle, 'guarda da porta');
  assert.equal(next.charOriginTitle, 'Ajudante de estalagem');
  assert.equal(next.charSituation, 'serve no pátio sob o sargento');
  assert.equal(next.charSkills, 'guarda, lança curta, vigília');
});

test('parseIdentityTags ignora vazias, a última tag vence e campanhas sem mudança ficam iguais', () => {
  const camp = { charTitle: 'guarda', charOriginTitle: 'estábulo', charSituation: 'pátio' };
  const same = parseIdentityTags('Sem tags. [NPC:Arya|viu a chave] [CARGO:] [relação:Jon|Amigável]', camp);
  assert.equal(same.charTitle, 'guarda');
  assert.equal(same.charOriginTitle, 'estábulo');
  assert.equal(same.charSituation, 'pátio');
  const last = parseIdentityTags('[cargo:escudeiro] texto [CARGO:cavaleiro juramentado]', camp);
  assert.equal(last.charTitle, 'cavaleiro juramentado');
  assert.equal(last.charOriginTitle, 'estábulo');
  assert.deepEqual(parseIdentityTags(''), { charTitle: '', charOriginTitle: '', charSituation: '', charSkills: '' });
});

test('applyManualIdentity congela origem na troca de cargo e guarda história e premissa', () => {
  const next = applyManualIdentity(
    { charTitle: 'estábulo', charBg: 'Servia cavalos.', storyStartPoint: 'Noite na estalagem' },
    { charTitle: 'guarda', charSituation: 'Posto da porta', charBg: 'Servia cavalos.', storyStartPoint: 'Noite na estalagem' }
  );
  assert.equal(next.charTitle, 'guarda');
  assert.equal(next.charOriginTitle, 'estábulo');
  assert.equal(next.charSituation, 'Posto da porta');
  assert.equal(next.storyStartPoint, 'Noite na estalagem');
  const keep = applyManualIdentity({ charTitle: 'guarda', charOriginTitle: 'estábulo' }, { charTitle: 'sargento' });
  assert.equal(keep.charOriginTitle, 'estábulo');
});

test('identityPromptLines apresenta o agora e mantém o começo para perguntas', () => {
  const lines = identityPromptLines({
    charTitle: 'guarda da porta',
    charOriginTitle: 'Ajudante de uma estalagem',
    charSituation: 'Vigia o pátio',
    charBg: 'Filho de trabalhadores, cuidava dos cavalos.',
    charSkills: 'Vigília e lança',
    storyStartPoint: 'Uma carta da Coroa chega na estalagem',
  }).join('\n');
  assert.ok(lines.includes('Cargo atual: guarda da porta'));
  assert.ok(lines.includes('Cargo de origem: Ajudante de uma estalagem'));
  assert.ok(lines.includes('História de origem: Filho de trabalhadores, cuidava dos cavalos.'));
  assert.ok(lines.includes('Premissa inicial da campanha: Uma carta da Coroa chega na estalagem'));
  assert.ok(lines.includes('perguntar pelo início'));
  assert.ok(!lines.includes(' — Ajudante de uma estalagem'));
});

test('parseIdentityTags grava origem no cargo atual quando a campanha ainda não tinha origem', () => {
  const next = parseIdentityTags('Sem tags de cargo.', { charTitle: 'guarda da porta', charSkills: 'lança' });
  assert.equal(next.charTitle, 'guarda da porta');
  assert.equal(next.charOriginTitle, 'guarda da porta');
  assert.equal(next.charSkills, 'lança');
});

test('tags de identidade saem do texto visível', () => {
  const visible = stripIdentityTags('Você cruza o pátio. [CARGO:guarda] [SITUAÇÃO:porta norte] [HABILIDADE:lança]');
  assert.equal(visible.replace(/\s+/g, ' ').trim(), 'Você cruza o pátio.');
});

test('economyPrompt traz condição atual e origem', () => {
  const prompt = economyPrompt({
    world: 'Westeros',
    charName: 'Edric',
    charTitle: 'guarda',
    charOriginTitle: 'estalagem',
    charSituation: 'porta do pátio',
    charBg: 'Servia mesas',
    storyStartPoint: 'A carta chegou',
    memory: 'Foi promovido a guarda.',
    items: [],
  }, '', 'Dia 12');
  assert.ok(prompt.includes('Cargo atual: guarda'));
  assert.ok(prompt.includes('Cargo de origem: estalagem'));
  assert.ok(prompt.includes('PREMISSA INICIAL'));
  assert.ok(prompt.includes('[CARGO:novo título]'));
});
