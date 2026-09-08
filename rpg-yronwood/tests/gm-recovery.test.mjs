import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../pages/api/gm.js', import.meta.url), 'utf8');
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('Falhas de API são distinguíveis e apenas indisponibilidade é repetida', async () => {
  const previousFetch = globalThis.fetch, previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test';
  const call = async () => {
    const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: 'POST', body: { messages: [{ role: 'user', content: 'Observar' }], systemPrompt: 'Narre.' } }, res); return res;
  };
  try {
    let count = 0;
    globalThis.fetch = async () => { count++; return { ok: false, status: 429, headers: { get: () => '45' }, json: async () => ({}) }; };
    let res = await call(); assert.equal(count, 1); assert.equal(res.code, 429); assert.equal(res.headers['Retry-After'], '45');
    globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
    res = await call(); assert.equal(res.data.code, 'API_AUTH');
    globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => { throw new Error('HTML'); } });
    res = await call(); assert.equal(res.data.code, 'UPSTREAM_RESPONSE');
    count = 0;
    globalThis.fetch = async () => { count++; if (count === 1) return { ok: false, status: 503, json: async () => ({}) }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Uma cena.' }] } }] }) }; };
    res = await call(); assert.equal(count, 2); assert.equal(res.code, 200);
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) });
    res = await call(); assert.equal(res.data.code, 'CONTENT_BLOCKED');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
  }
});
