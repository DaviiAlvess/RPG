import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlotTags, plotDirection, plotPromptLines } from '../lib/plots.mjs';

test('Lê tramas da busca e não mistura títulos iguais', () => {
  const first = parsePlotTags('[TRAMA:Cerco de Yronwood|Um emissário pede mais cabeças] [TRAMA:Cerco de Yronwood|O pátio espera resposta]');
  assert.equal(first.length, 1);
  assert.equal(first[0].title, 'Cerco de Yronwood');
  assert.match(first[0].hook, /pátio espera resposta/);
  const next = parsePlotTags('[TRAMA:Carta sem destinatário|Homens seguem o pacote]', first);
  assert.equal(next.length, 2);
  assert.equal(next[0].title, 'Cerco de Yronwood');
  const closed = parsePlotTags('[TRAMA_FIM:Cerco]', next);
  assert.equal(closed.find((plot) => plot.title === 'Cerco de Yronwood').status, 'encerrada');
  assert.equal(closed.find((plot) => plot.title.startsWith('Carta')).status, 'ativa');
});

test('Universo existente pede busca de arcos; mundo original inventa os próprios', () => {
  const known = plotDirection({ world: 'Naruto', isKnownIP: true });
  assert.match(known, /busca na rede/i);
  assert.match(known, /Naruto/);
  assert.match(known, /\[TRAMA:título\|gancho/);
  assert.match(known, /sem substituir o roteiro oficial/i);
  const original = plotDirection({ world: 'Vale de Cinzas', isKnownIP: false });
  assert.match(original, /MUNDO ORIGINAL/);
  assert.match(original, /Vale de Cinzas/);
  assert.equal(original.includes('busca na rede'), false);
  assert.match(plotPromptLines([]), /nenhuma ainda/);
  assert.match(plotPromptLines([{ title: 'A ponte', hook: 'A mochila balança', status: 'ativa' }]), /A ponte/);
});
