import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { verifyIdToken, bearerToken, takeRateLimit, resetRateLimitForTests } from '../lib/verify-id-token.mjs';
import { loadGmHandler } from './load-gm.mjs';

const PROJECT = 'siterpg32';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = publicKey.export({ type: 'spki', format: 'pem' });
const getKeys = async () => ({ k1: PEM });
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function makeToken(payload = {}, header = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64({ alg: 'RS256', kid: 'k1', ...header });
  const p = b64({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'user-1', iat: now - 10, exp: now + 3600, ...payload });
  const sig = createSign('RSA-SHA256').update(`${h}.${p}`).sign(privateKey).toString('base64url');
  return `${h}.${p}.${sig}`;
}

test('aceita token válido e devolve o uid', async () => {
  const r = await verifyIdToken(makeToken({ email: 'a@b.c' }), { projectId: PROJECT, getKeys });
  assert.deepEqual(r, { uid: 'user-1', email: 'a@b.c' });
});

test('recusa token vencido, de outro projeto, adulterado ou ausente', async () => {
  const now = Math.floor(Date.now() / 1000);
  await assert.rejects(verifyIdToken(makeToken({ exp: now - 4000 }), { projectId: PROJECT, getKeys }), { code: 'AUTH_EXPIRED' });
  await assert.rejects(verifyIdToken(makeToken({ aud: 'outro' }), { projectId: PROJECT, getKeys }), { code: 'AUTH_INVALID' });
  const t = makeToken().split('.');
  const forged = [t[0], b64({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'hacker', exp: now + 3600 }), t[2]].join('.');
  await assert.rejects(verifyIdToken(forged, { projectId: PROJECT, getKeys }), { code: 'AUTH_INVALID' });
  await assert.rejects(verifyIdToken(makeToken({}, { kid: 'desconhecida' }), { projectId: PROJECT, getKeys }), { code: 'AUTH_EXPIRED' });
  await assert.rejects(verifyIdToken(makeToken({}, { alg: 'none' }), { projectId: PROJECT, getKeys }), { code: 'AUTH_INVALID' });
  await assert.rejects(verifyIdToken('', { projectId: PROJECT, getKeys }), { status: 401 });
});

test('bearerToken lê o cabeçalho', () => {
  assert.equal(bearerToken({ headers: { authorization: 'Bearer abc.def.ghi' } }), 'abc.def.ghi');
  assert.equal(bearerToken({ headers: {} }), '');
});

test('limite por conta corta depois do máximo e libera depois da janela', () => {
  resetRateLimitForTests();
  const now = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(takeRateLimit('u', { limit: 3, now }).ok, true);
  const blocked = takeRateLimit('u', { limit: 3, now: now + 1000 });
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter > 0);
  assert.equal(takeRateLimit('outro', { limit: 3, now }).ok, true);
  assert.equal(takeRateLimit('u', { limit: 3, now: now + 61000 }).ok, true);
});

test('a rota do Mestre recusa pedido sem login e não chama o Gemini', async () => {
  const previous = process.env.GM_REQUIRE_AUTH;
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  let called = false;
  try {
    const { default: handler } = await loadGmHandler();
    process.env.GM_REQUIRE_AUTH = '1';
    process.env.GEMINI_API_KEY = 'test';
    globalThis.fetch = async () => { called = true; return { ok: true, json: async () => ({}) }; };
    let status = 0;
    let body = null;
    const res = { setHeader() {}, status(s) { status = s; return this; }, json(d) { body = d; return d; }, end() {} };
    await handler({ method: 'POST', headers: {}, body: { messages: [{ role: 'user', content: 'oi' }], systemPrompt: 'x' } }, res);
    assert.equal(status, 401);
    assert.equal(body.code, 'AUTH_REQUIRED');
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.GM_REQUIRE_AUTH; else process.env.GM_REQUIRE_AUTH = previous;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
  }
});
