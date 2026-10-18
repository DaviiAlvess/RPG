import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePlotTags } from '../lib/plots.mjs';
import { bindStoryLists, storyListsFor } from '../lib/gameplay.mjs';
import { planAutoStep, buildAutoTestReply, buildLocalAutoAction, pickFromOptions } from '../lib/autoMode.js';

function parseMissions(text, current) {
  const updated = [...current];
  for (const match of String(text).matchAll(/\[MISSÃO:([^\]]+)\]/gi)) {
    const mission = match[1].trim();
    if (!updated.some((item) => item.text.toLowerCase() === mission.toLowerCase())) {
      updated.push({ id: `m-${updated.length + 1}`, text: mission, completed: false });
    }
  }
  return updated;
}

function parseItems(text, current) {
  const updated = [...current];
  for (const match of String(text).matchAll(/\[ITEM:([^\]]+)\]/gi)) {
    const item = match[1].trim();
    if (!updated.some((name) => name.toLowerCase() === item.toLowerCase())) updated.push(item);
  }
  return updated;
}

test('Duas histórias jogadas em sequência não compartilham mochila, missão nem trama', () => {
  const casaTexto = '[TRAMA:Cerco de Yronwood|O emissário espera no pátio] [ITEM:Espada de Pedra Sangrenta] [MISSÃO:Defender o portão]';
  const marTexto = '[TRAMA:Barco abandonado|O pedido está sob a tábua] [ITEM:Machado do estaleiro] [MISSÃO:Reparar o casco]';
  const casa = bindStoryLists('c1-casa', {
    id: 'c1-casa',
    items: parseItems(casaTexto, []),
    missions: parseMissions(casaTexto, []),
    plots: parsePlotTags(casaTexto, []),
  });
  const sessao = { activeId: casa.id, items: casa.items, missions: casa.missions, plots: casa.plots };
  const marVazio = storyListsFor('c2-mar', casa, sessao);
  assert.deepEqual(marVazio, { items: [], missions: [], plots: [] });

  const mar = bindStoryLists('c2-mar', {
    id: 'c2-mar',
    items: parseItems(marTexto, []),
    missions: parseMissions(marTexto, []),
    plots: parsePlotTags(marTexto, []),
  }, sessao);
  assert.deepEqual(mar.items, ['Machado do estaleiro']);
  assert.equal(mar.missions[0].text, 'Reparar o casco');
  assert.equal(mar.plots[0].title, 'Barco abandonado');
  assert.deepEqual(storyListsFor('c1-casa', casa, { activeId: mar.id, items: mar.items, missions: mar.missions, plots: mar.plots }).items, ['Espada de Pedra Sangrenta']);
});

test('Automático atravessa teste e segue para a próxima ação sem parar a história', () => {
  const cena = '[TESTE:Força|DC:12] Empurrar o portão\nA tranca range na palma.';
  const passo = planAutoStep({
    lastGmText: cena,
    options: ['Recuar', 'Empurrar o portão'],
    messages: [{ role: 'assistant', content: cena }],
  });
  assert.equal(passo.kind, 'roll');
  const resposta = buildAutoTestReply(passo.test, { strength: 14 }, 11, { combat: 2 });
  assert.match(resposta.text, /D20: 11/);
  assert.match(resposta.text, /sem rolar novamente/);

  const depois = 'A porta cede. O pátio está à sua frente.';
  const seguinte = planAutoStep({
    lastGmText: depois,
    options: ['Observar de longe', 'Investir contra o portão'],
    messages: [
      { role: 'assistant', content: cena },
      { role: 'user', content: resposta.text },
      { role: 'assistant', content: depois },
    ],
  });
  assert.equal(seguinte.kind, 'action');
  const camp = { charPersonality: 'impulsivo e agressivo', charName: 'Edric' };
  assert.match(pickFromOptions(seguinte.options, camp), /Investir/i);
  assert.ok(buildLocalAutoAction(camp, depois).length > 8);
});

test('O automático só é remarcado depois de soltar o turno e o botão de parada é Desativar', async () => {
  const page = await readFile(new URL('../pages/index.js', import.meta.url), 'utf8');
  const view = await readFile(new URL('../components/PlayView.js', import.meta.url), 'utf8');
  const scheduleAt = page.indexOf('const scheduleNextTurn');
  const scheduleHead = page.slice(scheduleAt, scheduleAt + 280);
  assert.match(scheduleHead, /if \(!autoRef\.current\) return/);
  assert.equal(scheduleHead.includes('sending.current) return'), false);
  const releaseAt = page.lastIndexOf('sending.current = false; setLoading(false); setStatus("");');
  const resumeAt = page.indexOf('if (resumeAuto && autoRef.current)', releaseAt);
  assert.ok(releaseAt > 0 && resumeAt > releaseAt);
  assert.match(view, /Desativar/);
  assert.match(view, /Só para em Desativar/);
});
