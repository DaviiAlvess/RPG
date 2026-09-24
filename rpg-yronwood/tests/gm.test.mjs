import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetGeminiKeyState } from '../lib/gemini-keys.mjs';
import { loadGmHandler } from './load-gm.mjs';

const { default: handler } = await loadGmHandler();
const KEY_VARS = ['GEMINI_API_KEY', 'GEMINI_KEY', ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap(n => [`GEMINI_API_KEY_${n}`, `GEMINI_KEY_${n}`])];

test('Mestre: validação, respostas completas e indisponibilidade', async () => {
  const originalFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  process.env.GEMINI_API_KEY = 'test-key';
  resetGeminiKeyState();
  const call = async (body, method = 'POST') => {
    const res = { setHeader() {}, status(code) { this.code = code; return this; },
      json(data) { this.data = data; return this; }, end() { return this; } };
    await handler({ method, body }, res);
    return res;
  };
  const valid = { messages: [{ role: 'user', content: 'Entrar na taverna' }], systemPrompt: 'Narre a aventura.' };
  try {
    globalThis.fetch = async () => { throw new Error('Não deveria chamar a API'); };
    assert.equal((await call(valid, 'GET')).code, 405);
    for (const messages of [[], [null], [{ role: 'user', content: 12 }], [{ role: 'user', content: ' ' }]]) {
      assert.equal((await call({ ...valid, messages })).code, 400);
    }
    assert.equal((await call({ ...valid, systemPrompt: {} })).code, 400);
    const emptyBody = await call({});
    assert.equal(emptyBody.code, 400);
    assert.equal(emptyBody.data.code, 'INVALID_BODY');
    const malformed = await call('não é json');
    assert.equal(malformed.code, 400);
    assert.equal(malformed.data.code, 'INVALID_BODY');
    globalThis.fetch = async (_url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [
        { text: 'interno', thought: true }, { text: 'Uma porta ' }, { text: 'se abre.' }
      ] } }], usageMetadata: { totalTokenCount: 12 } }) };
    };
    assert.equal((await call(valid)).data.text, 'Uma porta se abre.');
    assert.equal((await call(JSON.stringify(valid))).data.text, 'Uma porta se abre.');
    resetGeminiKeyState();
    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'Quota exceeded' } }) });
    assert.equal((await call(valid)).code, 429);
    resetGeminiKeyState();
    globalThis.fetch = async () => { const err = new Error('aborted'); err.name = 'AbortError'; throw err; };
    assert.equal((await call(valid)).code, 504);
    resetGeminiKeyState();
    process.env.GEMINI_API_KEY_1 = 'test-key-2';
    let abortThenOk = 0;
    globalThis.fetch = async () => {
      abortThenOk += 1;
      if (abortThenOk === 1) {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      }
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'A cena segue.' }] } }] }) };
    };
    assert.equal((await call(valid)).data.text, 'A cena segue.');
    assert.equal(abortThenOk, 2);
  } finally {
    globalThis.fetch = originalFetch;
    resetGeminiKeyState();
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});

test('Narrar depois do Mestre tem orçamento longo por tentativa, sem encolher pelas chaves', async () => {
  const { readFile } = await import('node:fs/promises');
  const gmSource = await readFile(new URL('../pages/api/gm.js', import.meta.url), 'utf8');
  const perRequest = Number(gmSource.match(/export const PER_REQUEST_MS = (\d+)/)?.[1]);
  const minRequest = Number(gmSource.match(/export const MIN_PER_REQUEST_MS = (\d+)/)?.[1]);
  assert.ok(perRequest >= 28000);
  assert.ok(minRequest >= 18000);
  assert.ok(gmSource.includes('callWithBudget'));
  assert.ok(gmSource.includes('gemini-3.5-flash-lite'));
  assert.equal(gmSource.includes('Math.floor((deadlineMs - 2000) / maxAttempts)'), false);
});
