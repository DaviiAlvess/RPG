import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetGeminiKeyState } from '../lib/gemini-keys.mjs';
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
