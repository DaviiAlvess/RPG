import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gmRequestError, isRetryableGmTimeout, isRetryableGmFailure, requestJson, retryAfterWaitMs, GM_CLIENT_TIMEOUT_MS } from '../lib/api-client.mjs';
test('Espera limitada mesmo quando o corpo da resposta fica travado', async () => {
  let calls = 0, signal;
  await assert.rejects(requestJson('/api/gm', {}, { timeoutMs: 10, retryOnce: false, fetchImpl: async (_url, options) => {
    calls++; signal = options.signal;
    return { ok: true, status: 200, json: () => new Promise(() => {}) };
  } }), error => error.code === 'CLIENT_TIMEOUT');
  assert.equal(calls, 1); assert.equal(signal.aborted, true);
});
test('Resposta inválida e erro de rede recebem mensagens distintas', async () => {
  await assert.rejects(requestJson('/api/gm', {}, { retryOnce: false, fetchImpl: async () => ({ status: 504, json: async () => { throw new Error('HTML'); } }) }), error => error.code === 'INVALID_RESPONSE');
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
test('Timeout 504 do Mestre tenta o narrar uma vez e cada pedido tem o próprio prazo', async () => {
  let calls = 0;
  const signals = [];
  const response = await requestJson('/api/gm', {}, {
    timeoutMs: 80,
    fetchImpl: async (_url, options) => {
      calls++;
      signals.push(options.signal);
      if (calls === 1) return { ok: false, status: 504, json: async () => ({ error: 'O Mestre demorou para responder.', code: 'TIMEOUT' }) };
      return { ok: true, status: 200, json: async () => ({ text: 'A cena continua.' }) };
    },
  });
  assert.equal(calls, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).text, 'A cena continua.');
});
test('Timeout no cliente tenta o narrar uma vez com prazo novo', async () => {
  let calls = 0;
  const response = await requestJson('/api/gm', {}, {
    timeoutMs: 20,
    fetchImpl: async (_url, options) => {
      calls++;
      if (calls === 1) return { ok: true, status: 200, json: () => new Promise(() => {}) };
      return { ok: true, status: 200, json: async () => ({ text: 'Beat da cena.' }) };
    },
  });
  assert.equal(calls, 2);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).text, 'Beat da cena.');
});
test('Resposta vazia ou indisponível do Mestre tenta o narrar uma vez; 400 não', async () => {
  let calls = 0;
  const emptyThenOk = await requestJson('/api/gm', {}, {
    fetchImpl: async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 502, json: async () => ({ error: 'Vazio', code: 'EMPTY_RESPONSE' }) };
      return { ok: true, status: 200, json: async () => ({ text: 'A cena segue.' }) };
    },
  });
  assert.equal(calls, 2);
  assert.equal(emptyThenOk.status, 200);
  assert.equal((await emptyThenOk.json()).text, 'A cena segue.');

  calls = 0;
  const stillInvalid = await requestJson('/api/gm', {}, {
    fetchImpl: async () => {
      calls++;
      return { ok: false, status: 400, json: async () => ({ error: 'Corpo ausente', code: 'INVALID_BODY' }) };
    },
  });
  assert.equal(calls, 1);
  assert.equal(stillInvalid.status, 400);
  assert.equal(isRetryableGmFailure({ code: 'EMPTY_RESPONSE' }), true);
  assert.equal(isRetryableGmFailure({ code: 'UPSTREAM_UNAVAILABLE' }), true);
  assert.equal(isRetryableGmFailure({ code: 'API_AUTH' }), false);
  assert.equal(isRetryableGmFailure({ code: 'INVALID_BODY' }, { status: 400 }), false);
});
test('Mensagens de cota, timeout, chave e modelo ficam distintas', async () => {
  assert.equal(retryAfterWaitMs(45, 4000), 4000);
  assert.ok(GM_CLIENT_TIMEOUT_MS >= 55000);
  assert.equal(isRetryableGmTimeout({ code: 'CLIENT_TIMEOUT' }), true);
  assert.equal(isRetryableGmTimeout({ code: 'TIMEOUT' }), true);
  assert.equal(isRetryableGmTimeout({}, { status: 504 }), true);
  assert.equal(gmRequestError({ code: 'RATE_LIMIT' }, 429).message.includes('cota'), true);
  assert.equal(gmRequestError({ code: 'TIMEOUT' }, 504).code, 'TIMEOUT');
  assert.match(gmRequestError({ code: 'TIMEOUT' }, 504).message, /tente novamente/i);
  assert.match(gmRequestError({ code: 'NO_API_KEY' }, 500).message, /GEMINI_API_KEY/);
  assert.match(gmRequestError({ code: 'MODEL_UNAVAILABLE' }, 503).message, /GEMINI_MODEL/);
  const fromServer = gmRequestError({ error: 'A cota da IA esgotou (limite de uso). Aguarde.', code: 'RATE_LIMIT', retryAfter: 12 }, 429);
  assert.equal(fromServer.retryAfter, 12);
  assert.match(fromServer.message, /cota/i);
});
