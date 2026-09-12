import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../pages/api/gm.js', import.meta.url), 'utf8');
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('Modelo atual, configuração e aviso de modelo indisponível', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_LORE_MODEL'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const call = async body => {
    const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: 'POST', body }, response); return response;
  };
  const body = { messages: [{ role: 'user', content: 'Olá' }], systemPrompt: 'Narre.' };
  try {
    process.env.GEMINI_API_KEY = 'test'; delete process.env.GEMINI_MODEL; delete process.env.GEMINI_LORE_MODEL;
    let calledUrl;
    globalThis.fetch = async url => { calledUrl = url; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Cena.' }] } }] }) }; };
    assert.equal((await call(body)).code, 200);
    assert.ok(calledUrl.includes('/models/gemini-3.5-flash-lite:generateContent'));
    process.env.GEMINI_MODEL = 'models/configured-test';
    await call(body); assert.ok(calledUrl.includes('/models/configured-test:generateContent'));
    process.env.GEMINI_LORE_MODEL = 'lore-test';
    let loreBody;
    globalThis.fetch = async (url, options) => {
      calledUrl = url;
      loreBody = JSON.parse(options.body);
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Cena.' }] } }] }) };
    };
    await call({ useLoreSearch: true, world: 'Teste' }); assert.ok(calledUrl.includes('/models/lore-test:generateContent'));
    const lorePrompt = `${loreBody.system_instruction.parts[0].text} ${loreBody.contents[0].parts[0].text}`;
    assert.match(lorePrompt, /BRIEFING CANÔNICO/);
    assert.match(lorePrompt, /FACÇÕES/i);
    assert.match(lorePrompt, /ERA/);
    assert.match(lorePrompt, /PODER|FÍSICA/);
    assert.match(lorePrompt, /NÃO INVENTAR/i);
    assert.deepEqual(loreBody.tools, [{ google_search: {} }]);
    let gmBody;
    globalThis.fetch = async (_url, options) => {
      gmBody = JSON.parse(options.body);
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Cena.' }] } }] }) };
    };
    await call({ ...body, useGrounding: true });
    assert.deepEqual(gmBody.tools, [{ google_search: {} }]);
    await call(body);
    assert.equal(gmBody.tools, undefined);
    globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ error: { message: 'This model is no longer available to new users.' } }) });
    const result = await call(body); assert.equal(result.code, 503); assert.ok(result.data.error.includes('GEMINI_MODEL'));
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
  }
});
