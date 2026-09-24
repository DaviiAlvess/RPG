import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  campaignTimeMs,
  cloudWriteIsStale,
  interpretSaveTransaction,
  prepareCampaignForRtdb,
  sanitizeForRtdb,
  sanitizeRtdbKey,
} from '../lib/rtdb-util.js';

test('Chaves ilegais do Realtime Database são normalizadas e não derrubam o save', () => {
  assert.equal(sanitizeRtdbKey('Dr. Watson'), 'Dr_ Watson');
  assert.equal(sanitizeRtdbKey('a/b#c$[d]'), 'a_b_c__d_');
  assert.equal(sanitizeRtdbKey('__proto__'), '_');
  const cleaned = sanitizeForRtdb({
    relationships: { 'Dr. Watson': 'Amigável', Arya: 'Neutral' },
    hp: Number.NaN,
    skip: undefined,
  });
  assert.equal(cleaned.relationships['Dr_ Watson'], 'Amigável');
  assert.equal(cleaned.relationships.Arya, 'Neutral');
  assert.equal(cleaned.hp, null);
  assert.equal(Object.hasOwn(cleaned, 'skip'), false);
});

test('Abort da transação só é conflito quando a nuvem é realmente mais nova', () => {
  assert.equal(campaignTimeMs(1000), 1000);
  assert.equal(campaignTimeMs('2026-01-02T00:00:00.000Z') > campaignTimeMs('2026-01-01T00:00:00.000Z'), true);
  assert.equal(cloudWriteIsStale(null, { updatedAt: 2 }), false);
  assert.equal(cloudWriteIsStale({ updatedAt: 5 }, { updatedAt: 2 }), true);
  assert.equal(cloudWriteIsStale({ updatedAt: 2 }, { updatedAt: 5 }), false);
  assert.equal(cloudWriteIsStale({ updatedAt: 5 }, { updatedAt: 5 }), false);
  assert.deepEqual(interpretSaveTransaction({ committed: true, staleWrite: false }), { ok: true });
  const conflict = interpretSaveTransaction({ committed: false, staleWrite: true });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.conflict, true);
  const aborted = interpretSaveTransaction({ committed: false, staleWrite: false });
  assert.equal(aborted.ok, false);
  assert.equal(aborted.conflict, undefined);
  assert.match(aborted.error, /tente novamente/i);
});

test('Save na nuvem preserva cargo, origem e acordos do Mestre', () => {
  const payload = prepareCampaignForRtdb({
    id: 'camp-1',
    charTitle: 'guarda da porta',
    charSituation: 'pátio',
    charSkills: 'lança',
    masterAgreements: ['Cenas curtas'],
    masterGuidance: 'Cenas curtas',
    pendingMasterNote: 'Mostre a atração',
    memory: 'Foi promovido.',
    msgs: [{ role: 'user', content: 'Olho ao redor' }],
  });
  assert.equal(payload.charTitle, 'guarda da porta');
  assert.equal(payload.charOriginTitle, 'guarda da porta');
  assert.equal(payload.charSituation, 'pátio');
  assert.deepEqual(payload.masterAgreements, ['Cenas curtas']);
  assert.equal(payload.pendingMasterNote, 'Mostre a atração');
  assert.equal(payload.memory, 'Foi promovido.');
  const withOrigin = prepareCampaignForRtdb({
    charTitle: 'sargento',
    charOriginTitle: 'estalagem',
  });
  assert.equal(withOrigin.charOriginTitle, 'estalagem');
});
