import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { buildSaveBody, readLoadedCampaign, cloudStatusText, gunzipBase64 } from '../lib/supa-saves-client.mjs';

test('status da nuvem conta qual nuvem salvou', () => {
  assert.equal(cloudStatusText({ firebase: 'ok', supabase: 'ok' }), 'Salvo na nuvem');
  assert.equal(cloudStatusText({ firebase: 'fail', supabase: 'ok', local: true }), 'Salvo na nuvem (Supabase)');
  assert.equal(cloudStatusText({ firebase: 'ok', supabase: 'sync' }), 'Salvo na nuvem (Firebase) · sincronizando…');
  assert.equal(cloudStatusText({ firebase: 'sync', supabase: 'sync', local: true }), 'Salvo neste aparelho · sincronizando…');
  assert.equal(cloudStatusText({ firebase: 'fail', supabase: 'fail', local: true }), 'Salvo neste aparelho · nuvem pendente');
  assert.equal(cloudStatusText({ firebase: 'fail', supabase: 'off', local: true }), 'Salvo neste aparelho · nuvem pendente');
  assert.equal(cloudStatusText({ conflict: true }), 'Nuvem mais recente — reabra a campanha');
});

test('envio ao Supabase vai compactado e volta igual', async () => {
  const camp = { id: 'c1', updatedAt: '2026-11-13T10:00:00Z', disp: Array.from({ length: 500 }, (_, i) => ({ t: `fala ${i}` })) };
  const body = await buildSaveBody(camp);
  assert.equal(body.action, 'save');
  assert.equal(body.id, 'c1');
  assert.ok(body.gz, 'deve compactar');
  const back = JSON.parse(zlib.gunzipSync(Buffer.from(body.gz, 'base64')).toString('utf8'));
  assert.deepEqual(back, camp);
  // e a resposta compactada do servidor é lida no aparelho
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(camp))).toString('base64');
  assert.deepEqual(await readLoadedCampaign({ gz }), camp);
  assert.deepEqual(await readLoadedCampaign({ data: camp }), camp);
  assert.equal(await gunzipBase64(zlib.gzipSync(Buffer.from('olá')).toString('base64')), 'olá');
});

test('escolha de onde salvar fica guardada por jogador e muda o status', async () => {
  const { readSaveMode, writeSaveMode } = await import('../lib/supa-saves-client.mjs');
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  assert.equal(readSaveMode(storage, 'ana'), 'cloud');
  writeSaveMode(storage, 'ana', 'local');
  assert.equal(readSaveMode(storage, 'ana'), 'local');
  assert.equal(readSaveMode(storage, 'bia'), 'cloud');
  writeSaveMode(storage, 'ana', 'qualquer');
  assert.equal(readSaveMode(storage, 'ana'), 'cloud');
  assert.equal(readSaveMode({ getItem: () => { throw new Error('bloqueado'); } }, 'ana'), 'cloud');
  assert.equal(cloudStatusText({ mode: 'local', local: true, firebase: 'fail' }), 'Salvo neste aparelho');
  assert.equal(cloudStatusText({ mode: 'local', local: false }), 'Falha ao salvar neste aparelho');
});
