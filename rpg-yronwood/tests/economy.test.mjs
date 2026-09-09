import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { economyPrompt, memoryCutoff } from '../lib/economy.mjs';
const load = async path => import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL(path, import.meta.url), 'utf8')).toString('base64')}`);
test('Economia preserva regras, ficha e segredos e força respostas curtas', () => {
  const prompt = economyPrompt({ world: 'Teste', charName: 'Mara', items: ['Chave de bronze'], memory: 'A carta está no forro da capa.', worldState: { secrets: ['Somente Mara sabe da carta'] }, narration: { style: 'dark', length: 'rich' } }, 'Contexto importante', 'Dia 2');
  for (const value of ['Teste', 'Mara', 'A carta está no forro da capa', 'Chave de bronze', 'Somente Mara sabe da carta', 'Contexto importante', '80–140', '[TESTE:Força|DC:12]', 'suspense', 'comece na ação do jogador', 'detalhe sensorial revelador', 'nunca fale ou sinta pelo jogador']) assert.ok(prompt.includes(value));
  for (const length of ['150–250', '200–320', '250–400', '300–450']) assert.ok(!prompt.includes(length));
});
test('Memória considera tamanho e preserva a próxima ação sem cortar histórico', () => {
  const messages = Array.from({ length: 27 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(1000) }));
  const cutoff = memoryCutoff(messages, 0, true);
  assert.equal(cutoff, 18); assert.equal(messages[cutoff].role, 'user'); assert.equal(messages.length, 27);
  assert.equal(memoryCutoff(messages.map(m => ({ ...m, content: 'curto' })), 0, true), 0);
  assert.equal(memoryCutoff(messages, 18, true), 18);
});
test('Automático econômico não chama a IA para escolher uma ação', async () => {
  const { resolveAutoAction } = await load('../lib/autoMode.js');
  const action = await resolveAutoAction({ economyMode: true }, 'Uma porta aberta.', [], () => { throw new Error('Chamada extra indevida'); });
  assert.ok(action.length > 0);
});
test('Limite de saída menor só quando economia é explicitamente ativada', async () => {
  const { default: handler } = await load('../pages/api/gm.js');
  const originalFetch = globalThis.fetch, originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test';
  try {
    let limit;
    globalThis.fetch = async (_url, options) => { limit = JSON.parse(options.body).generationConfig.maxOutputTokens; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Cena' }] } }] }) }; };
    for (const [mode, expected] of [[true, 1024], [false, 2048], ['true', 2048]]) {
      const res = { setHeader() {}, status() { return this; }, json(data) { return data; } };
      await handler({ method: 'POST', body: { economyMode: mode, messages: [{ role: 'user', content: 'Olho ao redor' }], systemPrompt: 'Narre' } }, res);
      assert.equal(limit, expected);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
  }
});
