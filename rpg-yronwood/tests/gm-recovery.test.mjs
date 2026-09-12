import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGeminiKeyRecord,
  isGeminiKeyHealthy,
  markGeminiKeyExhausted,
  nextGeminiKey,
  parseUsageTokens,
  recordKeyUsage,
  resetGeminiKeyState,
} from '../lib/gemini-keys.mjs';
import { loadGmHandler } from './load-gm.mjs';

const { default: handler } = await loadGmHandler();
const KEY_VARS = ['GEMINI_API_KEY', 'GEMINI_KEY', ...[1, 2, 3, 4, 5, 6, 7].flatMap(n => [`GEMINI_API_KEY_${n}`, `GEMINI_KEY_${n}`])];
const okText = (tokens = 20) => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ content: { parts: [{ text: 'Uma cena.' }] } }],
    usageMetadata: { totalTokenCount: tokens },
  }),
});
const callHandler = async (body = { messages: [{ role: 'user', content: 'Observar' }], systemPrompt: 'Narre.' }) => {
  const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await handler({ method: 'POST', body }, res);
  return res;
};

test('Falhas de API são distinguíveis e cota/indisponibilidade tentam outra chave', async () => {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  process.env.GEMINI_API_KEY = 'test';
  process.env.GEMINI_API_KEY_1 = 'test-2';
  const call = () => callHandler();
  try {
    resetGeminiKeyState();
    let count = 0;
    globalThis.fetch = async () => { count++; if (count === 1) return { ok: false, status: 429, headers: { get: () => '45' }, json: async () => ({}) }; return okText(); };
    let res = await call(); assert.equal(count, 2); assert.equal(res.code, 200);

    resetGeminiKeyState();
    count = 0;
    globalThis.fetch = async () => { count++; return { ok: false, status: 429, headers: { get: () => '45' }, json: async () => ({}) }; };
    res = await call(); assert.equal(count, 2); assert.equal(res.code, 429); assert.equal(res.headers['Retry-After'], '45'); assert.equal(res.data.code, 'RATE_LIMIT');
    assert.match(res.data.error, /Todas as chaves Gemini estão no limite agora\. Tente em \d+ segundos\./);
    assert.equal(res.data.retryAfter, 45);

    resetGeminiKeyState();
    globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
    res = await call(); assert.equal(res.data.code, 'API_AUTH');

    resetGeminiKeyState();
    count = 0;
    globalThis.fetch = async () => { count++; return { ok: false, status: 502, json: async () => { throw new Error('HTML'); } }; };
    res = await call(); assert.equal(res.data.code, 'UPSTREAM_RESPONSE'); assert.equal(count, 2);

    resetGeminiKeyState();
    count = 0;
    globalThis.fetch = async () => { count++; if (count === 1) return { ok: false, status: 503, json: async () => ({}) }; return okText(); };
    res = await call(); assert.equal(count, 2); assert.equal(res.code, 200);

    resetGeminiKeyState();
    count = 0;
    globalThis.fetch = async () => { count++; if (count === 1) return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [] } }] }) }; return okText(); };
    res = await call(); assert.equal(count, 2); assert.equal(res.code, 200);

    resetGeminiKeyState();
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) });
    res = await call(); assert.equal(res.data.code, 'CONTENT_BLOCKED');
  } finally {
    globalThis.fetch = previousFetch;
    resetGeminiKeyState();
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
  const call = () => callHandler();
  try {
    resetGeminiKeyState();
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
    assert.equal(exhausted.data.retryAfter, 8);

    resetGeminiKeyState();
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
    resetGeminiKeyState();
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});

test('429 na primeira chave usa a livre na mesma chamada; a próxima ignora a que descansa', async () => {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  process.env.GEMINI_API_KEY_1 = 'key-one';
  process.env.GEMINI_API_KEY_2 = 'key-two';
  try {
    resetGeminiKeyState();
    const used = [];
    globalThis.fetch = async url => {
      const key = String(url).split('key=')[1];
      used.push(key);
      if (key === 'key-one') return { ok: false, status: 429, headers: { get: () => '120' }, json: async () => ({}) };
      return okText(40);
    };
    const first = await callHandler();
    assert.equal(first.code, 200);
    assert.ok(used.includes('key-one'));
    assert.ok(used.includes('key-two'));

    used.length = 0;
    const second = await callHandler();
    assert.equal(second.code, 200);
    assert.deepEqual(used, ['key-two']);
    assert.equal(isGeminiKeyHealthy('key-one'), false);
  } finally {
    globalThis.fetch = previousFetch;
    resetGeminiKeyState();
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});

test('Uso de tokens: a próxima escolha prefere a chave com menos tokens; 429 descansa mesmo com orçamento', async () => {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  const previousBudget = process.env.GEMINI_KEY_TOKEN_BUDGET;
  for (const name of KEY_VARS) delete process.env[name];
  process.env.GEMINI_API_KEY_1 = 'alpha';
  process.env.GEMINI_API_KEY_2 = 'beta';
  try {
    resetGeminiKeyState();
    recordKeyUsage('alpha', 8000);
    assert.equal(nextGeminiKey(['alpha', 'beta']).key, 'beta');
    assert.equal(getGeminiKeyRecord('alpha').tokensUsed, 8000);
    assert.equal(getGeminiKeyRecord('alpha').requestCount, 1);

    markGeminiKeyExhausted('alpha', 60);
    assert.equal(isGeminiKeyHealthy('alpha'), false);
    assert.equal(nextGeminiKey(['alpha', 'beta']).key, 'beta');

    resetGeminiKeyState();
    const used = [];
    globalThis.fetch = async url => {
      used.push(String(url).split('key=')[1]);
      return okText(9000);
    };
    assert.equal((await callHandler()).code, 200);
    assert.deepEqual(used, ['alpha']);
    used.length = 0;
    assert.equal((await callHandler()).code, 200);
    assert.deepEqual(used, ['beta']);
    assert.equal(getGeminiKeyRecord('alpha').tokensUsed, 9000);

    resetGeminiKeyState();
    process.env.GEMINI_KEY_TOKEN_BUDGET = '100';
    recordKeyUsage('alpha', 100);
    assert.equal(isGeminiKeyHealthy('alpha'), false);
    assert.equal(nextGeminiKey(['alpha', 'beta']).key, 'beta');

    resetGeminiKeyState();
    const day1 = Date.UTC(2026, 0, 1, 12);
    const day2 = Date.UTC(2026, 0, 2, 1);
    recordKeyUsage('alpha', 5000, day1);
    assert.equal(getGeminiKeyRecord('alpha', day2).tokensUsed, 0);
    assert.equal(isGeminiKeyHealthy('alpha', day2), true);
    assert.equal(parseUsageTokens({ usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } }), 15);
    assert.equal(parseUsageTokens({ usageMetadata: { totalTokenCount: 80, promptTokenCount: 1 } }), 80);
  } finally {
    globalThis.fetch = previousFetch;
    resetGeminiKeyState();
    if (previousBudget === undefined) delete process.env.GEMINI_KEY_TOKEN_BUDGET;
    else process.env.GEMINI_KEY_TOKEN_BUDGET = previousBudget;
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});

test('Lore/grounding: 403 ou recusa da busca gera de novo sem google_search', async () => {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  process.env.GEMINI_API_KEY = 'live';
  try {
    resetGeminiKeyState();
    const bodies = [];
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      bodies.push(body);
      if (body.tools) {
        return { ok: false, status: 403, json: async () => ({ error: { message: 'Requests to this API google_search are not allowed' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Briefing sem busca.' }] } }] }) };
    };
    const lore = await callHandler({ useLoreSearch: true, world: 'Westeros' });
    assert.equal(lore.code, 200);
    assert.equal(lore.data.lore, 'Briefing sem busca.');
    assert.deepEqual(bodies[0].tools, [{ google_search: {} }]);
    assert.equal(bodies.at(-1).tools, undefined);

    bodies.length = 0;
    const grounded = await callHandler({
      messages: [{ role: 'user', content: 'Começar' }],
      systemPrompt: 'Narre.',
      useGrounding: true,
    });
    assert.equal(grounded.code, 200);
    assert.equal(grounded.data.text, 'Briefing sem busca.');
    assert.deepEqual(bodies[0].tools, [{ google_search: {} }]);
    assert.equal(bodies.at(-1).tools, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    resetGeminiKeyState();
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});

test('Criar aventura (lore) usa o mesmo pool e pula chave em descanso', async () => {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  process.env.GEMINI_API_KEY_1 = 'dead';
  process.env.GEMINI_API_KEY_2 = 'live';
  try {
    resetGeminiKeyState();
    markGeminiKeyExhausted('dead', 120);
    const used = [];
    globalThis.fetch = async url => {
      used.push(String(url).split('key=')[1]);
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Briefing canônico.' }] } }] }) };
    };
    const lore = await callHandler({ useLoreSearch: true, world: 'Teste' });
    assert.equal(lore.code, 200);
    assert.deepEqual(used, ['live']);
  } finally {
    globalThis.fetch = previousFetch;
    resetGeminiKeyState();
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
});
