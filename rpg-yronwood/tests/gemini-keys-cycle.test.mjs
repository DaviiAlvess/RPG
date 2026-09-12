/**
 * Adversarial rotation tests: a refused or exhausted Gemini key must not freeze play.
 *
 * Public APIs only (lib/gemini-keys.mjs). gm.js is owned by another agent.
 *
 * Contract:
 * - resetGeminiKeyState isolates tests (no leaked cooldown/usage freeze).
 * - 403/refused is NOT markGeminiKeyExhausted (that export is 429-only); the key
 *   stays healthy and cooldownUntil stays in the past.
 * - After 429 on A, nextGeminiKey([A, B]) returns B with waitMs 0.
 * - tokensUsed of 300_000 must remain pickable (budget must not stamp midnight cooldown).
 * - An unused sibling is always immediate — no wait for A's 429 or heavy usage.
 */
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectGeminiKeys,
  getGeminiKeyRecord,
  isGeminiKeyHealthy,
  markGeminiKeyExhausted,
  nextGeminiKey,
  recordKeyUsage,
  resetGeminiKeyState,
} from '../lib/gemini-keys.mjs';

const KEY_A = 'cycle-key-A';
const KEY_B = 'cycle-key-B';
const NOW = Date.UTC(2026, 8, 12, 15, 0, 0);

let previousBudget;

beforeEach(() => {
  previousBudget = process.env.GEMINI_KEY_TOKEN_BUDGET;
  delete process.env.GEMINI_KEY_TOKEN_BUDGET;
  resetGeminiKeyState();
});

afterEach(() => {
  resetGeminiKeyState();
  if (previousBudget === undefined) delete process.env.GEMINI_KEY_TOKEN_BUDGET;
  else process.env.GEMINI_KEY_TOKEN_BUDGET = previousBudget;
});

test('resetGeminiKeyState clears exhaustion and usage so tests cannot inherit a freeze', () => {
  recordKeyUsage(KEY_A, 300_000, NOW);
  markGeminiKeyExhausted(KEY_A, 120, NOW);
  assert.equal(isGeminiKeyHealthy(KEY_A, NOW), false);

  resetGeminiKeyState();

  const rec = getGeminiKeyRecord(KEY_A, NOW);
  assert.equal(rec.tokensUsed, 0);
  assert.equal(rec.cooldownUntil, 0);
  assert.equal(rec.last429At, 0);
  assert.equal(rec.requestCount, 0);
  assert.equal(isGeminiKeyHealthy(KEY_A, NOW), true);
  const pick = nextGeminiKey([KEY_A], NOW);
  assert.equal(pick.key, KEY_A);
  assert.equal(pick.waitMs, 0);
  assert.equal(pick.allResting, false);
});

test('403/refused path does not set cooldownUntil in the future; key stays healthy', () => {
  // Simulated 403: look up / touch the key the way a caller would, but do NOT
  // call markGeminiKeyExhausted — that export is 429-only after the fixer.
  // If gm.js still maps 401/403 onto markGeminiKeyExhausted, play freezes for
  // DEFAULT_COOLDOWN_MS even though the sibling key was never used.
  const rec = getGeminiKeyRecord(KEY_A, NOW);
  assert.ok(
    rec.cooldownUntil <= NOW,
    `403/refused must not stamp a future cooldown (cooldownUntil=${rec.cooldownUntil}, now=${NOW})`,
  );
  assert.equal(
    isGeminiKeyHealthy(KEY_A, NOW),
    true,
    'refused key must stay healthy so rotation can keep using unused siblings',
  );
  assert.ok(
    getGeminiKeyRecord(KEY_A, NOW).cooldownUntil <= NOW,
    'isGeminiKeyHealthy must not write a future cooldown on a 403 path',
  );

  const pick = nextGeminiKey([KEY_A, KEY_B], NOW);
  assert.equal(pick.waitMs, 0);
  assert.equal(pick.allResting, false);
  assert.ok([KEY_A, KEY_B].includes(pick.key));
});

test('after markGeminiKeyExhausted on A, nextGeminiKey among [A, B] returns B', () => {
  markGeminiKeyExhausted(KEY_A, 60, NOW);
  assert.equal(isGeminiKeyHealthy(KEY_A, NOW), false);
  assert.equal(isGeminiKeyHealthy(KEY_B, NOW), true);

  const pick = nextGeminiKey([KEY_A, KEY_B], NOW);
  assert.equal(pick.key, KEY_B);
  assert.equal(pick.waitMs, 0);
  assert.equal(pick.allResting, false);
  assert.equal(pick.retryAfterSec, 0);
});

test('high tokensUsed (300_000) stays pickable if the key is otherwise healthy', () => {
  recordKeyUsage(KEY_A, 300_000, NOW);
  assert.equal(
    getGeminiKeyRecord(KEY_A, NOW).tokensUsed,
    300_000,
  );

  assert.equal(
    isGeminiKeyHealthy(KEY_A, NOW),
    true,
    '250k daily budget must not mark a key unhealthy / unpickable',
  );
  assert.ok(
    getGeminiKeyRecord(KEY_A, NOW).cooldownUntil <= NOW,
    'checking health of a high-usage key must not stamp cooldownUntil to UTC midnight',
  );

  const solo = nextGeminiKey([KEY_A], NOW);
  assert.equal(solo.key, KEY_A);
  assert.equal(solo.waitMs, 0);
  assert.equal(solo.allResting, false);
  assert.equal(solo.retryAfterSec, 0);
});

test('nextGeminiKey does not require waiting when another key was never used', () => {
  markGeminiKeyExhausted(KEY_A, 90, NOW);
  const after429 = nextGeminiKey([KEY_A, KEY_B], NOW);
  assert.equal(after429.key, KEY_B);
  assert.equal(after429.waitMs, 0);
  assert.equal(after429.allResting, false);
  assert.equal(after429.retryAfterSec, 0);

  resetGeminiKeyState();
  recordKeyUsage(KEY_A, 300_000, NOW);
  const afterHeavy = nextGeminiKey([KEY_A, KEY_B], NOW);
  assert.equal(afterHeavy.key, KEY_B, 'unused sibling must win over a heavy or resting key');
  assert.equal(afterHeavy.waitMs, 0, 'unused sibling must be immediate; no midnight/90s wait');
  assert.equal(afterHeavy.allResting, false);
  assert.equal(afterHeavy.retryAfterSec, 0);
});

test('cooldown de 429 não passa de 60s; pool vazio não é allResting', () => {
  markGeminiKeyExhausted(KEY_A, 900, NOW);
  const rec = getGeminiKeyRecord(KEY_A, NOW);
  assert.ok(rec.cooldownUntil - NOW <= 60_000, 'cooldown persistido/em memória deve capar em 60s');
  assert.ok(rec.cooldownUntil > NOW);

  const empty = nextGeminiKey([], NOW);
  assert.equal(empty.key, null);
  assert.equal(empty.allResting, false);

  markGeminiKeyExhausted(KEY_B, 60, NOW);
  const both = nextGeminiKey([KEY_A, KEY_B], NOW);
  assert.equal(both.allResting, true);
  assert.ok(both.key, 'mesmo com allResting deve devolver uma chave para tentar nesta requisição');
});

test('recordKeyUsage após 429 zera o cooldown para a chave não ficar presa', () => {
  markGeminiKeyExhausted(KEY_A, 60, NOW);
  assert.equal(isGeminiKeyHealthy(KEY_A, NOW), false);
  recordKeyUsage(KEY_A, 20, NOW);
  assert.equal(isGeminiKeyHealthy(KEY_A, NOW), true);
  assert.equal(getGeminiKeyRecord(KEY_A, NOW).cooldownUntil, 0);
});

test('collectGeminiKeys inclui GEMINI_API_KEY e os slots 8–10', () => {
  const keys = collectGeminiKeys({
    GEMINI_API_KEY: 'base-key',
    GEMINI_API_KEY_8: 'key-eight',
    GEMINI_API_KEY_9: 'key-nine',
    GEMINI_API_KEY_10: 'key-ten',
  });
  assert.deepEqual([...keys].sort(), ['base-key', 'key-eight', 'key-nine', 'key-ten'].sort());
});
