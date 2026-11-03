import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readNarrationStream, visiblePartial, parseStreamEvents } from '../lib/gm-stream.mjs';

const response = (chunks) => {
  const enc = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(enc.encode(ch)); c.close(); } }), { headers: { 'content-type': 'text/event-stream' } });
};

test('lê a transmissão e entrega o texto acumulado', async () => {
  const seen = [];
  const text = await readNarrationStream(response(['data: {"t":"A por', '"}\n\ndata: {"t":"ta range."}\n\n', 'data: {"done":true}\n\n']), (t) => seen.push(t));
  assert.equal(text, 'A porta range.');
  assert.deepEqual(seen, ['A por', 'A porta range.']);
  assert.equal(seen.at(-1), 'A porta range.');
});

test('erro no meio ou transmissão sem fim viram exceção (o jogo refaz pelo caminho normal)', async () => {
  await assert.rejects(readNarrationStream(response(['data: {"t":"x"}\n\n', 'data: {"error":"vazio","code":"EMPTY_RESPONSE"}\n\n'])), { code: 'EMPTY_RESPONSE' });
  await assert.rejects(readNarrationStream(response(['data: {"t":"x"}\n\n'])), { code: 'STREAM_INCOMPLETE' });
  await assert.rejects(readNarrationStream({}), { code: 'STREAM_UNAVAILABLE' });
});

test('texto parcial esconde tag aberta e IMAGE_PROMPT pela metade', () => {
  assert.equal(visiblePartial('A porta range. [PISTA:Pre'), 'A porta range. ');
  assert.equal(visiblePartial('Fim. [XP:10] e mais'), 'Fim. [XP:10] e mais');
  assert.equal(visiblePartial('Fim.\nIMAGE_PROMPT: a dark ha'), 'Fim.\n');
  assert.equal(visiblePartial('Fim.\nIMAGE_PRO'), 'Fim.\n');
  assert.equal(parseStreamEvents('data: {"t":"a"}\n\ndata: {"t"').rest, 'data: {"t"');
});
