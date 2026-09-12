import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../pages/api/gm.js', import.meta.url), 'utf8');
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const KEY_VARS = ['GEMINI_API_KEY', 'GEMINI_KEY', ...[1, 2, 3, 4, 5, 6, 7].flatMap(n => [`GEMINI_API_KEY_${n}`, `GEMINI_KEY_${n}`])];
const okText = () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Uma cena.' }] } }] }) });

test('Falhas de API são distinguíveis e cota/indisponibilidade tentam outra chave', async () => {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  process.env.GEMINI_API_KEY = 'test';
  process.env.GEMINI_API_KEY_1 = 'test-2';
  const call = async () => {
    const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: 'POST', body: { messages: [{ role: 'user', content: 'Observar' }], systemPrompt: 'Narre.' } }, res); return res;
  };
  try {
    let count = 0;
    globalThis.fetch = async () => { count++; if (count === 1) return { ok: false, status: 429, headers: { get: () => '45' }, json: async () => ({}) }; return okText(); };
    let res = await call(); assert.equal(count, 2); assert.equal(res.code, 200);

    count = 0;
    globalThis.fetch = async () => { count++; return { ok: false, status: 429, headers: { get: () => '45' }, json: async () => ({}) }; };
    res = await call(); assert.equal(count, 2); assert.equal(res.code, 429); assert.equal(res.headers['Retry-After'], '45'); assert.equal(res.data.code, 'RATE_LIMIT');

    globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
    res = await call(); assert.equal(res.data.code, 'API_AUTH');

    count = 0;
    globalThis.fetch = async () => { count++; return { ok: false, status: 502, json: async () => { throw new Error('HTML'); } }; };
    res = await call(); assert.equal(res.data.code, 'UPSTREAM_RESPONSE'); assert.equal(count, 2);

    count = 0;
    globalThis.fetch = async () => { count++; if (count === 1) return { ok: false, status: 503, json: async () => ({}) }; return okText(); };
    res = await call(); assert.equal(count, 2); assert.equal(res.code, 200);

    count = 0;
    globalThis.fetch = async () => { count++; if (count === 1) return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [] } }] }) }; return okText(); };
    res = await call(); assert.equal(count, 2); assert.equal(res.code, 200);

    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) });
    res = await call(); assert.equal(res.data.code, 'CONTENT_BLOCKED');
  } finally {
    globalThis.fetch = previousFetch;
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});

test('Várias chaves: tenta todas as únicas (até 7); uma chave boa recupera a cota da outra', async () => {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  for (let i = 1; i <= 7; i++) process.env[`GEMINI_API_KEY_${i}`] = `key-${i}`;
  const call = async () => {
    const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: 'POST', body: { messages: [{ role: 'user', content: 'Observar' }], systemPrompt: 'Narre.' } }, res); return res;
  };
  try {
    let count = 0;
    const used = new Set();
    globalThis.fetch = async url => {
      count++;
      used.add(String(url).split('key=')[1]);
      return { ok: false, status: 429, headers: { get: () => '8' }, json: async () => ({}) };
    };
    const exhausted = await call();
    assert.equal(count, 7);
    assert.equal(used.size, 7);
    assert.equal(exhausted.code, 429);

    count = 0;
    for (const name of KEY_VARS) delete process.env[name];
    process.env.GEMINI_API_KEY = 'good';
    process.env.GEMINI_API_KEY_1 = 'limited';
    globalThis.fetch = async url => {
      count++;
      const key = String(url).split('key=')[1];
      if (key === 'limited') return { ok: false, status: 429, headers: { get: () => '30' }, json: async () => ({}) };
      return okText();
    };
    const recovered = await call();
    assert.equal(recovered.code, 200);
    assert.ok(count >= 1 && count <= 2);
  } finally {
    globalThis.fetch = previousFetch;
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});
