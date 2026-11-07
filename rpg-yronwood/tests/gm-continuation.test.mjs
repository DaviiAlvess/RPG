import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withModelConfig, continuationBody, joinContinuation, finishReasonOf } from '../pages/api/gm.js';

test('Gemini 2.5 Flash narra sem gastar o limite pensando', () => {
  const body = { contents: [], generationConfig: { maxOutputTokens: 4096 } };
  assert.equal(withModelConfig(body, 'gemini-2.5-flash').generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal(withModelConfig(body, 'gemini-2.0-flash'), body);
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
