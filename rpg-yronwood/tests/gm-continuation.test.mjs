import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withModelConfig, continuationBody, joinContinuation, finishReasonOf, trimToSentence, endsWithUser, isCut, addsThinking, firstAwakeModel, restModel, FICTION_SAFETY } from '../pages/api/gm.js';

test('Gemini 2.5 Flash narra sem gastar o limite pensando', () => {
  const body = { contents: [], generationConfig: { maxOutputTokens: 4096 } };
  assert.equal(withModelConfig(body, 'gemini-2.5-flash').generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal(withModelConfig(body, 'gemini-2.0-flash').generationConfig.thinkingConfig, undefined);
  assert.deepEqual(withModelConfig(body, 'gemini-2.0-flash').safetySettings, FICTION_SAFETY);
  assert.equal(body.generationConfig.thinkingConfig, undefined);
});

test('resposta cortada pelo limite pede a continuação sem repetir', () => {
  const body = { contents: [{ role: 'user', parts: [{ text: 'ataco' }] }], tools: [{ google_search: {} }], generationConfig: { maxOutputTokens: 4096 } };
  const cont = continuationBody(body, 'O guarda ergue a lança e');
  assert.equal(cont.tools, undefined);
  assert.equal(cont.contents.at(-2).role, 'model');
  assert.match(cont.contents.at(-1).parts[0].text, /Continue EXATAMENTE/);
  assert.equal('O guarda ergue a lança e' + joinContinuation('O guarda ergue a lança e', 'a lança e avança.'), 'O guarda ergue a lança e avança.');
  assert.equal('Ele cai.' + joinContinuation('Ele cai.', 'A porta range.'), 'Ele cai. A porta range.');
  assert.equal(finishReasonOf({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), 'MAX_TOKENS');
});

test('Gemini 3 e o alias flash-latest: raciocínio low, sem temperatura; sem raciocínio para repetir após 400', () => {
  const body = { contents: [], generationConfig: { maxOutputTokens: 8192, temperature: 0.9 } };
  for (const m of ['gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.6-flash']) {
    const out = withModelConfig(body, m);
    assert.equal(out.generationConfig.thinkingConfig.thinkingLevel, 'low', m);
    assert.equal(out.generationConfig.temperature, undefined, m);
  }
  assert.ok(addsThinking(body, 'gemini-flash-latest'));
  assert.equal(withModelConfig(body, 'gemini-flash-latest', { thinking: false }).generationConfig.thinkingConfig, undefined);
  assert.equal(body.generationConfig.temperature, 0.9);
});

test('cortes por recitação ou filtro também são continuados; sem continuação, fecha na última frase', () => {
  assert.ok(isCut('RECITATION') && isCut('SAFETY') && isCut('MAX_TOKENS'));
  assert.ok(!isCut('STOP'));
  assert.match(continuationBody({ contents: [] }, 'x', 'RECITATION').contents.at(-1).parts[0].text, /palavras SUAS/);
  assert.match(continuationBody({ contents: [] }, 'x', 'SAFETY').contents.at(-1).parts[0].text, /menos detalhe gráfico/);
  assert.equal(trimToSentence('O guarda avança. Ele ergue a lan'), 'O guarda avança.');
  assert.equal(trimToSentence('Ele cai. [PISTA:meio'), 'Ele cai.');
  assert.equal(trimToSentence('Tudo certo.'), 'Tudo certo.');
});

test('pedido sempre termina com o jogador e cota por modelo não aposenta a chave', () => {
  const c = endsWithUser([{ role: 'user', parts: [{ text: 'a' }] }, { role: 'model', parts: [{ text: 'b' }] }]);
  assert.equal(c.at(-1).role, 'user');
  const models = ['gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
  assert.equal(firstAwakeModel('k1', models), 0);
  restModel('k1', 'gemini-flash-latest', 60000);
  assert.equal(firstAwakeModel('k1', models), 1);
  assert.equal(firstAwakeModel('k2', models), 0);
});
