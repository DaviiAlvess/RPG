import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGmHandler } from './load-gm.mjs';
import { resetGeminiKeyState } from '../lib/gemini-keys.mjs';

const sseResponse = (chunks, status = 200) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status, headers: { 'content-type': 'text/event-stream' } });
};
const event = (text, extra = {}) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }], ...extra })}\r\n\r\n`;

function mockRes() {
  const out = { status: 0, headers: {}, writes: [], json: null, ended: false };
  return {
    out,
    status(code) { out.status = code; return this; },
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    flushHeaders() {},
    write(chunk) { out.writes.push(String(chunk)); },
    end() { out.ended = true; },
    json(data) { out.json = data; return data; },
  };
}

async function withEnv(fn) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'k1';
  resetGeminiKeyState();
  try { return await fn(); }
  finally {
    globalThis.fetch = originalFetch;
    resetGeminiKeyState();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
  }
}

const body = { stream: true, messages: [{ role: 'user', content: 'Olho em volta' }], systemPrompt: 'Narre' };

test('extractSseEvents separa eventos e guarda o resto incompleto', async () => {
  const { extractSseEvents } = await loadGmHandler();
  const r = extractSseEvents('data: {"a":1}\n\ndata: {"b":2}\r\n\r\ndata: {"c"');
  assert.deepEqual(r.events, [{ a: 1 }, { b: 2 }]);
  assert.equal(r.rest, 'data: {"c"');
  assert.deepEqual(extractSseEvents('data: [DONE]\n\n').events, []);
});

test('streaming repassa o texto em pedaços e termina com done', async () => withEnv(async () => {
  const { default: handler } = await loadGmHandler();
  let url = '';
  globalThis.fetch = async (u) => { url = String(u); return sseResponse([event('A porta '), event('range.'), event(' Fim.', { usageMetadata: { totalTokenCount: 50 } })]); };
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body }, res);
  assert.match(url, /streamGenerateContent\?alt=sse/);
  assert.equal(res.out.status, 200);
  assert.match(res.out.headers['content-type'], /text\/event-stream/);
  assert.match(res.out.headers['cache-control'], /no-transform/);
  const payloads = res.out.writes.map((w) => JSON.parse(w.replace(/^data: /, '').trim()));
  assert.deepEqual(payloads.filter((p) => p.t).map((p) => p.t).join(''), 'A porta range. Fim.');
  assert.deepEqual(payloads.at(-1), { done: true });
  assert.equal(res.out.ended, true);
}));

test('resposta sem texto vira erro no fim da transmissão', async () => withEnv(async () => {
  const { default: handler } = await loadGmHandler();
  globalThis.fetch = async () => sseResponse([`data: ${JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] })}\n\n`]);
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body }, res);
  const last = JSON.parse(res.out.writes.at(-1).replace(/^data: /, ''));
  assert.equal(last.code, 'CONTENT_BLOCKED');
}));

test('se nenhuma chave consegue transmitir, devolve STREAM_UNAVAILABLE para o cliente usar o caminho normal', async () => withEnv(async () => {
  const { default: handler } = await loadGmHandler();
  globalThis.fetch = async () => new Response('{}', { status: 429 });
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body }, res);
  assert.equal(res.out.status, 503);
  assert.equal(res.out.json.code, 'STREAM_UNAVAILABLE');
  assert.equal(res.out.writes.length, 0);
}));

test('sem stream: true a rota continua respondendo JSON como antes', async () => withEnv(async () => {
  const { default: handler } = await loadGmHandler();
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Cena' }] } }] }) });
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: { ...body, stream: false } }, res);
  assert.deepEqual(res.out.json, { text: 'Cena' });
}));
