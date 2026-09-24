import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTest, resolveTest, itemEffect, newerCampaign, mergeCampaignIndex, mergeCampaignRecords, readWorldState, pendingTestFromMessages, storyListsFor, bindStoryLists, stripTemplateCampaignId } from '../lib/gameplay.mjs';
test('Testes acentuados e dificuldade explícita', () => {
  const trial = parseTest('[TESTE:Força|DC:16] Abrir a porta');
  assert.equal(trial.attribute, 'Força');
  assert.equal(trial.difficulty, 16);
  assert.equal(parseTest('[TESTE:Força] Abrir a porta').difficulty, 12);
  assert.equal(parseTest('[TESTE:Inválido]'), null);
  assert.equal(resolveTest(trial, { strength: 18 }, 12).outcome, 'sucesso');
  assert.equal(resolveTest(trial, { strength: 10 }, 12).outcome, 'falha');
  assert.equal(resolveTest(trial, { strength: 30 }, 1).outcome, 'falha crítica');
  const withSkill = resolveTest(trial, { strength: 10 }, 12, { combat: 5 });
  assert.equal(withSkill.modifier, 0);
  assert.equal(withSkill.skillBonus, 4);
  assert.equal(withSkill.total, 16);
  assert.equal(withSkill.outcome, 'sucesso');
  const untrained = resolveTest(trial, { strength: 10 }, 12);
  assert.equal(untrained.skillBonus, 0);
  assert.equal(untrained.total, 12);
  assert.equal(resolveTest(trial, { strength: 10 }, 20, { combat: 5 }).outcome, 'sucesso crítico');
  assert.equal(resolveTest(trial, { strength: 30 }, 1, { combat: 5 }).outcome, 'falha crítica');
});

test('Só a cena atual mantém um teste pendente ao continuar ou carregar a campanha', () => {
  const request = { role: 'assistant', content: '[TESTE:Força|DC:16] Abrir a porta' };
  assert.equal(pendingTestFromMessages([request]).difficulty, 16);
  assert.equal(pendingTestFromMessages([request, { role: 'assistant', content: 'Você segue para a cidade.' }]), null);
  assert.equal(pendingTestFromMessages([request, { role: 'user', content: 'Resultado do teste: 18' }]), null);
  assert.equal(pendingTestFromMessages([]), null);
  assert.equal(pendingTestFromMessages(), null);
});
test('Equipamentos e itens desconhecidos não desaparecem nem curam', () => {
  for (const item of ['Espada', 'Chave da missão', 'Poção de veneno', 'Cajado de cura']) assert.deepEqual(itemEffect(item), { consume: false, heal: 0 });
  assert.deepEqual(itemEffect('Poção de cura'), { consume: true, heal: 20 });
  assert.deepEqual(itemEffect('Ração'), { consume: true, heal: 5 });
});
test('Recuperação preserva a versão mais recente, local ou remota', () => {
  const local = { id: 'a', updatedAt: 1000 }, cloud = { id: 'a', updatedAt: 500 };
  assert.equal(newerCampaign(local, cloud), local);
  assert.equal(newerCampaign(cloud, local), local);
  assert.equal(newerCampaign(local, null), local);
  assert.equal(newerCampaign(null, cloud), cloud);
});
test('Abrir campanha recupera cargo, origem e acordos se a cópia mais nova os tiver perdido', () => {
  const local = {
    id: 'a',
    updatedAt: 1000,
    charTitle: 'guarda',
    charOriginTitle: 'estalagem',
    charSituation: 'pátio',
    masterAgreements: ['Cenas curtas'],
    pendingMasterNote: 'Mostre a atração',
  };
  const cloud = { id: 'a', updatedAt: 2000, charTitle: 'sargento', msgs: [] };
  const recovered = mergeCampaignRecords(local, cloud);
  assert.equal(recovered.charTitle, 'sargento');
  assert.equal(recovered.charOriginTitle, 'estalagem');
  assert.equal(recovered.charSituation, 'pátio');
  assert.deepEqual(recovered.masterAgreements, ['Cenas curtas']);
  assert.equal(recovered.pendingMasterNote, 'Mostre a atração');
  assert.equal(mergeCampaignRecords(local, null).charOriginTitle, 'estalagem');
});
test('A lista da nuvem vazia não apaga aventuras que só existem neste aparelho', () => {
  const local = [{ id: 'casa', world: 'Westeros', updatedAt: '2026-01-02' }];
  const cloud = [{ id: 'mar', world: 'One Piece', updatedAt: '2026-01-03' }];
  assert.deepEqual(mergeCampaignIndex([], local), local);
  assert.equal(mergeCampaignIndex(cloud, local).map((item) => item.id).join(','), 'mar,casa');
  assert.equal(mergeCampaignIndex([{ id: 'casa', updatedAt: '2026-02-01' }], local)[0].updatedAt, '2026-02-01');
});
test('Inventário e missões de uma história não entram em outra', () => {
  const casa = { id: 'c1-casa', items: ['Espada de Pedra Sangrenta'], missions: [{ id: 'm1', text: 'Defender o portão', completed: false }], plots: [{ id: 'p1', title: 'Cerco', hook: 'O emissário espera', status: 'ativa' }] };
  const mar = { id: 'c2-mar', items: ['Machado do estaleiro'], missions: [{ id: 'm2', text: 'Reparar o casco', completed: false }], plots: [{ id: 'p2', title: 'Barco abandonado', hook: 'Pedido de ajuda', status: 'ativa' }] };
  const sessaoCasa = { activeId: 'c1-casa', items: casa.items, missions: casa.missions, plots: casa.plots };

  assert.deepEqual(storyListsFor('c2-mar', casa, sessaoCasa), { items: [], missions: [], plots: [] });
  assert.deepEqual(bindStoryLists('c2-mar', casa, sessaoCasa).items, []);
  assert.deepEqual(bindStoryLists('c2-mar', casa, sessaoCasa).missions, []);
  assert.deepEqual(bindStoryLists('c2-mar', casa, sessaoCasa).plots, []);
  assert.deepEqual(storyListsFor('c2-mar', mar, sessaoCasa), { items: mar.items, missions: mar.missions, plots: mar.plots });
  assert.deepEqual(storyListsFor('c1-casa', { world: 'Westeros' }, sessaoCasa), { items: casa.items, missions: casa.missions, plots: casa.plots });

  const nova = bindStoryLists('c3-nova', { id: 'naruto', items: casa.items, missions: casa.missions, plots: casa.plots }, sessaoCasa);
  assert.equal(nova.id, 'c3-nova');
  assert.equal(nova.presetId, 'naruto');
  assert.deepEqual(nova.items, []);
  assert.deepEqual(nova.missions, []);
  assert.deepEqual(nova.plots, []);

  const mesma = bindStoryLists('c1-casa', casa, sessaoCasa, { items: ['Adaga'], missions: [] });
  assert.deepEqual(mesma.items, ['Adaga']);
  assert.deepEqual(mesma.missions, []);

  const ficha = stripTemplateCampaignId({ id: 'one-piece', world: 'One Piece', items: ['Espada'], missions: casa.missions, plots: [{ title: 'Arco de Alabasta' }] });
  assert.equal(ficha.id, undefined);
  assert.equal(ficha.presetId, 'one-piece');
  assert.equal(ficha.items, undefined);
  assert.equal(ficha.missions, undefined);
  assert.equal(ficha.plots, undefined);
});

test('Memória guarda local, NPCs, segredos e promessas sem duplicar', () => {
  const state = readWorldState('[LOCAL:Taverna] [NPC:Arya|Amigável, viu a chave] [SEGREDO:chave; apenas Arya sabe] [PROMESSA:voltar]');
  assert.equal(state.location, 'Taverna');
  assert.equal(state.npcs.Arya, 'Amigável, viu a chave');
  const next = readWorldState('[PROMESSA:voltar] [LOCAL:Porto]', state);
  assert.deepEqual(next.promises, ['voltar']);
  assert.equal(state.location, 'Taverna');
  assert.equal(next.secrets.length, 1);
});
