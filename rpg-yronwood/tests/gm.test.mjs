import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetGeminiKeyState } from '../lib/gemini-keys.mjs';
import { loadGmHandler } from './load-gm.mjs';

const { default: handler } = await loadGmHandler();
const KEY_VARS = ['GEMINI_API_KEY', 'GEMINI_KEY', ...[1, 2, 3, 4, 5, 6, 7].flatMap(n => [`GEMINI_API_KEY_${n}`, `GEMINI_KEY_${n}`])];

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
    globalThis.fetch = async (_url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [
        { text: 'interno', thought: true }, { text: 'Uma porta ' }, { text: 'se abre.' }
      ] } }], usageMetadata: { totalTokenCount: 12 } }) };
    };
    assert.equal((await call(valid)).data.text, 'Uma porta se abre.');
    resetGeminiKeyState();
    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'Quota exceeded' } }) });
    assert.equal((await call(valid)).code, 429);
    resetGeminiKeyState();
    globalThis.fetch = async () => { const err = new Error('aborted'); err.name = 'AbortError'; throw err; };
    assert.equal((await call(valid)).code, 504);
  } finally {
    globalThis.fetch = originalFetch;
    resetGeminiKeyState();
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});
