import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../lib/api-client.mjs';
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
  const response = await requestJson('/api/gm', {}, { fetchImpl: async () => ({ ok: false, status: 429, headers: { get: () => '45' }, json: async () => ({ error: 'Limite atingido' }) }) });
  assert.equal(response.status, 429); assert.equal((await response.json()).retryAfter, 45);
});
