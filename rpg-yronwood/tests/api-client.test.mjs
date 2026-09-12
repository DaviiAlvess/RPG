import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gmRequestError, requestJson, retryAfterWaitMs } from '../lib/api-client.mjs';
test('Espera limitada mesmo quando o corpo da resposta fica travado', async () => {
  let calls = 0, signal;
  await assert.rejects(requestJson('/api/gm', {}, { timeoutMs: 10, fetchImpl: async (_url, options) => {
    calls++; signal = options.signal;
    return { ok: true, status: 200, json: () => new Promise(() => {}) };
  } }), error => error.code === 'CLIENT_TIMEOUT');
  assert.equal(calls, 1); assert.equal(signal.aborted, true);
});
test('Resposta inválida e erro de rede recebem mensagens distintas', async () => {
  await assert.rejects(requestJson('/api/gm', {}, { fetchImpl: async () => ({ status: 504, json: async () => { throw new Error('HTML'); } }) }), error => error.code === 'INVALID_RESPONSE');
  await assert.rejects(requestJson('/api/gm', {}, { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), error => error.code === 'CLIENT_NETWORK');
});
test('Preserva diagnóstico de cota e os dados de uma resposta válida', async () => {
  const response = await requestJson('/api/gm', {}, { sleep: async () => {}, fetchImpl: async () => ({ ok: false, status: 429, headers: { get: () => '45' }, json: async () => ({ error: 'Limite atingido' }) }) });
  assert.equal(response.status, 429); assert.equal((await response.json()).retryAfter, 45);
});
test('429 com retryAfter espera e tenta o pedido uma vez só', async () => {
  let calls = 0;
  const response = await requestJson('/api/gm', {}, {
    sleep: async () => {},
    fetchImpl: async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 429, headers: { get: () => '2' }, json: async () => ({ error: 'Cota', retryAfter: 2, code: 'RATE_LIMIT' }) };
      return { ok: true, status: 200, json: async () => ({ text: 'Cena.' }) };
    },
  });
  assert.equal(calls, 2);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).text, 'Cena.');

  calls = 0;
  const stillLimited = await requestJson('/api/gm', {}, {
    sleep: async () => {},
    fetchImpl: async () => {
      calls++;
      return { ok: false, status: 429, headers: { get: () => '45' }, json: async () => ({ error: 'Cota', retryAfter: 45, code: 'RATE_LIMIT' }) };
    },
  });
  assert.equal(calls, 2);
  assert.equal(stillLimited.status, 429);
});
test('Mensagens de cota, timeout, chave e modelo ficam distintas', async () => {
  assert.equal(retryAfterWaitMs(45, 4000), 4000);
  assert.equal(gmRequestError({ code: 'RATE_LIMIT' }, 429).message.includes('cota'), true);
  assert.equal(gmRequestError({ code: 'TIMEOUT' }, 504).code, 'TIMEOUT');
  assert.match(gmRequestError({ code: 'NO_API_KEY' }, 500).message, /GEMINI_API_KEY/);
  assert.match(gmRequestError({ code: 'MODEL_UNAVAILABLE' }, 503).message, /GEMINI_MODEL/);
  const fromServer = gmRequestError({ error: 'A cota da IA esgotou (limite de uso). Aguarde.', code: 'RATE_LIMIT', retryAfter: 12 }, 429);
  assert.equal(fromServer.retryAfter, 12);
  assert.match(fromServer.message, /cota/i);
});
