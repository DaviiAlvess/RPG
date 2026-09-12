import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markGeminiKeyExhausted, resetGeminiKeyState } from '../lib/gemini-keys.mjs';
import { loadGmHandler } from './load-gm.mjs';

const { default: handler } = await loadGmHandler();
const KEY_VARS = ['GEMINI_API_KEY', 'GEMINI_KEY', ...[1, 2, 3, 4, 5, 6, 7].flatMap(n => [`GEMINI_API_KEY_${n}`, `GEMINI_KEY_${n}`])];
const FIRST_KEY = 'key-one';
const SECOND_KEY = 'key-two';
const NARRATED = 'Narração da segunda chave.';
const CREATED = 'Briefing da segunda chave.';
const narrateBody = { messages: [{ role: 'user', content: 'Observar' }], systemPrompt: 'Narre.' };
const createBody = { useLoreSearch: true, world: 'Westeros' };

const okText = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ content: { parts: [{ text }] } }],
    usageMetadata: { totalTokenCount: 20 },
  }),
});

const failRes = (status) => ({
  ok: false,
  status,
  headers: { get: () => '45' },
  json: async () => ({
    error: { message: status === 403 ? 'API key not valid' : 'Quota exceeded' },
  }),
});

const callHandler = async (body) => {
  const res = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; },
  };
  await handler({ method: 'POST', body }, res);
  return res;
};

async function withTwoKeys(run) {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  process.env.GEMINI_API_KEY_1 = FIRST_KEY;
  process.env.GEMINI_API_KEY_2 = SECOND_KEY;
  try {
    resetGeminiKeyState();
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    resetGeminiKeyState();
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
}

function mockFirstFails(status, successText) {
  const used = [];
  globalThis.fetch = async url => {
    const key = String(url).split('key=')[1];
    used.push(key);
    if (key === FIRST_KEY) return failRes(status);
    return okText(successText);
  };
  return used;
}

function assertFastSuccess(res, { text, used, startedAt }) {
  assert.ok(Date.now() - startedAt < 3000, 'rotação de chave não deve esperar cooldown');
  assert.equal(res.code, 200);
  assert.notEqual(res.data?.code, 'API_AUTH');
  assert.equal(text, res.data.text ?? res.data.lore);
  assert.ok(used.includes(FIRST_KEY));
  assert.ok(used.includes(SECOND_KEY));
}

test('Narrar: primeira chave 403, segunda 200 retorna texto (não API_AUTH)', { timeout: 4000 }, async () => {
  await withTwoKeys(async () => {
    const used = mockFirstFails(403, NARRATED);
    const startedAt = Date.now();
    const res = await callHandler(narrateBody);
    assertFastSuccess(res, { text: NARRATED, used, startedAt });
  });
});

test('Criar aventura: primeira chave 403, segunda 200 retorna lore (não API_AUTH)', { timeout: 4000 }, async () => {
  await withTwoKeys(async () => {
    const used = mockFirstFails(403, CREATED);
    const startedAt = Date.now();
    const res = await callHandler(createBody);
    assertFastSuccess(res, { text: CREATED, used, startedAt });
  });
});

test('Narrar: primeira chave 429, segunda 200 retorna texto', { timeout: 4000 }, async () => {
  await withTwoKeys(async () => {
    const used = mockFirstFails(429, NARRATED);
    const startedAt = Date.now();
    const res = await callHandler(narrateBody);
    assertFastSuccess(res, { text: NARRATED, used, startedAt });
  });
});

test('Criar aventura: primeira chave 429, segunda 200 retorna lore', { timeout: 4000 }, async () => {
  await withTwoKeys(async () => {
    const used = mockFirstFails(429, CREATED);
    const startedAt = Date.now();
    const res = await callHandler(createBody);
    assertFastSuccess(res, { text: CREATED, used, startedAt });
  });
});

const SEVEN_KEYS = Array.from({ length: 7 }, (_, i) => `key-${i + 1}`);

async function withSevenKeys(run) {
  const previousFetch = globalThis.fetch;
  const previousKeys = Object.fromEntries(KEY_VARS.map(name => [name, process.env[name]]));
  for (const name of KEY_VARS) delete process.env[name];
  SEVEN_KEYS.forEach((key, i) => { process.env[`GEMINI_API_KEY_${i + 1}`] = key; });
  try {
    resetGeminiKeyState();
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    resetGeminiKeyState();
    for (const name of KEY_VARS) {
      if (previousKeys[name] === undefined) delete process.env[name];
      else process.env[name] = previousKeys[name];
    }
  }
}

const failQuota403 = () => ({
  ok: false,
  status: 403,
  json: async () => ({ error: { message: 'You exceeded your current quota, please check your plan and billing details.' } }),
});

test('Narrar: 403 em 6 chaves e 200 na 7ª continua o jogo', { timeout: 4000 }, async () => {
  await withSevenKeys(async () => {
    const used = [];
    globalThis.fetch = async url => {
      const key = String(url).split('key=')[1];
      used.push(key);
      if (key === SEVEN_KEYS[6]) return okText(NARRATED);
      return failRes(403);
    };
    const res = await callHandler(narrateBody);
    assert.equal(res.code, 200);
    assert.equal(res.data.text, NARRATED);
    assert.notEqual(res.data?.code, 'RATE_LIMIT');
    assert.notEqual(res.data?.code, 'API_AUTH');
    assert.ok(!/Todas as chaves Gemini estão no limite/i.test(res.data?.error || ''));
    assert.equal(used.at(-1), SEVEN_KEYS[6]);
    assert.ok(used.length >= 7);
  });
});

test('Narrar: 429 em todas as 7 chaves retorna RATE_LIMIT', { timeout: 4000 }, async () => {
  await withSevenKeys(async () => {
    const used = new Set();
    globalThis.fetch = async url => {
      used.add(String(url).split('key=')[1]);
      return failRes(429);
    };
    const res = await callHandler(narrateBody);
    assert.equal(res.code, 429);
    assert.equal(res.data.code, 'RATE_LIMIT');
    assert.match(res.data.error, /Todas as chaves Gemini estão no limite agora\. Tente em \d+ segundos\./);
    assert.equal(used.size, 7);
  });
});

test('Narrar: 403 em todas as 7 chaves é API_AUTH, não "todas no limite"', { timeout: 4000 }, async () => {
  await withSevenKeys(async () => {
    globalThis.fetch = async () => failRes(403);
    const res = await callHandler(narrateBody);
    assert.equal(res.data.code, 'API_AUTH');
    assert.notEqual(res.data.code, 'RATE_LIMIT');
    assert.ok(!/Todas as chaves Gemini estão no limite/i.test(res.data.error || ''));
  });
});

test('Narrar: 403 com texto de cota em 6 chaves e 200 na 7ª não trava o pool', { timeout: 4000 }, async () => {
  await withSevenKeys(async () => {
    const used = [];
    globalThis.fetch = async url => {
      const key = String(url).split('key=')[1];
      used.push(key);
      if (key === SEVEN_KEYS[6]) return okText(NARRATED);
      return failQuota403();
    };
    const res = await callHandler(narrateBody);
    assert.equal(res.code, 200);
    assert.equal(res.data.text, NARRATED);
    assert.notEqual(res.data?.code, 'RATE_LIMIT');
    assert.ok(used.includes(SEVEN_KEYS[6]));
  });
});

test('Cooldown residual em todas as 7 não aborta: a 7ª 200 continua o jogo', { timeout: 4000 }, async () => {
  await withSevenKeys(async () => {
    for (const key of SEVEN_KEYS) markGeminiKeyExhausted(key, 90);
    const used = [];
    globalThis.fetch = async url => {
      const key = String(url).split('key=')[1];
      used.push(key);
      if (key === SEVEN_KEYS[6]) return okText(NARRATED);
      return failRes(429);
    };
    const res = await callHandler(narrateBody);
    assert.equal(res.code, 200);
    assert.equal(res.data.text, NARRATED);
    assert.ok(used.includes(SEVEN_KEYS[6]));
    assert.ok(used.length >= 1);
  });
});
