import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { handleSavesAction, fitCampaignForStore, cleanCampaignId, MAX_CAMPAIGNS_PER_USER } from '../lib/user-saves.mjs';
import { supabaseRest } from '../lib/supabase-rest.mjs';

// Banco falso que entende os filtros que a API usa (uid=eq, campaign_id=eq, limit, order).
function fakeDb() {
  const rows = [];
  const parse = (query) => {
    const p = new URLSearchParams(query);
    const val = (k) => (p.get(k) || '').replace(/^eq\./, '');
    return { uid: val('uid'), id: p.has('campaign_id') ? val('campaign_id') : null, limit: Number(p.get('limit')) || Infinity, select: (p.get('select') || '').split(',') };
  };
  const match = (q) => rows.filter((r) => r.uid === q.uid && (q.id == null || r.campaign_id === q.id));
  return {
    rows,
    select: async (table, query) => {
      assert.equal(table, 'rpg_user_saves');
      const q = parse(query);
      assert.ok(q.uid, 'toda leitura precisa filtrar pelo uid');
      return match(q).slice(0, q.limit).map((r) => Object.fromEntries(q.select.map((k) => [k, r[k]])));
    },
    remove: async (table, query) => {
      const q = parse(query);
      assert.ok(q.uid && q.id, 'apagar exige uid e campanha');
      for (const r of match(q)) rows.splice(rows.indexOf(r), 1);
      return [];
    },
    upsert: async (table, row, onConflict) => {
      assert.equal(onConflict, 'uid,campaign_id');
      const i = rows.findIndex((r) => r.uid === row.uid && r.campaign_id === row.campaign_id);
      const stored = { created_at: '2026-11-13T00:00:00Z', ...(i >= 0 ? rows[i] : {}), ...row };
      if (i >= 0) rows[i] = stored; else rows.push(stored);
      return null;
    },
  };
}

test('saves no Supabase: cada jogador só vê e mexe nas próprias histórias', async () => {
  const db = fakeDb();
  const camp = { id: 'c1', world: 'Simpsons', charName: 'Tom Carlos', updatedAt: '2026-11-13T10:00:00.000Z', msgs: [{ role: 'user', content: 'oi' }] };
  let r = await handleSavesAction(db, 'ana', { action: 'save', id: 'c1', campaign: camp });
  assert.equal(r.ok, true);
  // compactado (gzip em base64) também entra
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify({ ...camp, id: 'c2', world: 'Westeros' }))).toString('base64');
  r = await handleSavesAction(db, 'ana', { action: 'save', id: 'c2', gz });
  assert.equal(r.ok, true);
  // outro jogador com o MESMO id de campanha não enxerga nem sobrescreve a da Ana
  await handleSavesAction(db, 'bia', { action: 'save', id: 'c1', campaign: { ...camp, world: 'Da Bia' } });
  const ana = await handleSavesAction(db, 'ana', { action: 'list' });
  assert.deepEqual(ana.items.map((i) => i.id).sort(), ['c1', 'c2']);
  assert.equal((await handleSavesAction(db, 'ana', { action: 'load', id: 'c1' })).data.world, 'Simpsons');
  assert.equal((await handleSavesAction(db, 'bia', { action: 'load', id: 'c1' })).data.world, 'Da Bia');
  await assert.rejects(handleSavesAction(db, 'bia', { action: 'load', id: 'c2' }), /não encontrada/);
  // apagar da Bia não apaga a da Ana
  await handleSavesAction(db, 'bia', { action: 'remove', id: 'c1' });
  assert.equal((await handleSavesAction(db, 'ana', { action: 'load', id: 'c1' })).data.world, 'Simpsons');
  // sem login, nada
  await assert.rejects(handleSavesAction(db, '', { action: 'list' }), /Entre na sua conta/);
});

test('saves no Supabase: versão velha não apaga a nova, e o id fica preso ao pedido', async () => {
  const db = fakeDb();
  await handleSavesAction(db, 'ana', { action: 'save', id: 'c1', campaign: { id: 'c1', world: 'Novo', updatedAt: '2026-11-13T12:00:00Z' } });
  const old = await handleSavesAction(db, 'ana', { action: 'save', id: 'c1', campaign: { id: 'c1', world: 'Velho', updatedAt: '2026-11-13T09:00:00Z' } });
  assert.equal(old.ok, false);
  assert.equal(old.conflict, true);
  assert.equal((await handleSavesAction(db, 'ana', { action: 'load', id: 'c1' })).data.world, 'Novo');
  // o id dentro da campanha não muda onde ela é gravada
  await handleSavesAction(db, 'ana', { action: 'save', id: 'c9', campaign: { id: 'c1', world: 'Outro', updatedAt: '2026-11-13T13:00:00Z' } });
  assert.equal((await handleSavesAction(db, 'ana', { action: 'load', id: 'c9' })).data.id, 'c9');
  assert.equal((await handleSavesAction(db, 'ana', { action: 'load', id: 'c1' })).data.world, 'Novo');
});

test('saves no Supabase: limites de tamanho e quantidade', async () => {
  // grande demais: tira os saves mais antigos primeiro
  const big = 'x'.repeat(1000);
  const fit = fitCampaignForStore({ id: 'c', saves: [{ n: 1, t: big }, { n: 2, t: big }, { n: 3, t: big }] }, 2300);
  assert.equal(fit.trimmed, true);
  assert.deepEqual(fit.campaign.saves.map((s) => s.n), [2, 3]);
  assert.equal(fitCampaignForStore({ id: 'c', text: 'x'.repeat(5000) }, 1000), null);
  // limite de histórias por jogador
  const db = fakeDb();
  for (let i = 0; i < MAX_CAMPAIGNS_PER_USER; i++) db.rows.push({ uid: 'ana', campaign_id: `k${i}`, client_updated_at: '2026-01-01T00:00:00Z' });
  await assert.rejects(handleSavesAction(db, 'ana', { action: 'save', id: 'nova', campaign: { world: 'x' } }), /já tem 40 histórias/);
  // mas atualizar uma que já existe continua valendo
  assert.equal((await handleSavesAction(db, 'ana', { action: 'save', id: 'k1', campaign: { world: 'x' } })).ok, true);
  // ids estranhos são recusados
  assert.equal(cleanCampaignId(''), '');
  assert.equal(cleanCampaignId('a\nb'), '');
  assert.equal(cleanCampaignId('room-123'), 'room-123');
  await assert.rejects(handleSavesAction(db, 'ana', { action: 'save', id: '', campaign: {} }), /sem identificação/);
  // gzip malformado
  await assert.rejects(handleSavesAction(db, 'ana', { action: 'save', id: 'z', gz: 'bm9wZQ==' }), /Não deu para ler/);
});

test('saves no Supabase: história grande volta compactada para caber na resposta', async () => {
  const db = fakeDb();
  const camp = { id: 'g', world: 'W', updatedAt: '2026-11-13T10:00:00Z', disp: Array.from({ length: 3000 }, (_, i) => ({ t: `fala ${i} `.repeat(30) })) };
  await handleSavesAction(db, 'ana', { action: 'save', id: 'g', campaign: camp });
  const r = await handleSavesAction(db, 'ana', { action: 'load', id: 'g', acceptGz: true });
  assert.ok(r.gz && !r.data);
  const back = JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64')).toString('utf8'));
  assert.equal(back.disp.length, 3000);
  // aparelho sem descompactação recebe normal
  assert.ok((await handleSavesAction(db, 'ana', { action: 'load', id: 'g' })).data);
});

test('cliente do Supabase: upsert manda on_conflict e merge-duplicates', async () => {
  const calls = [];
  const db = supabaseRest({ SUPABASE_SECRET_KEY: 'sb_secret_x' }, async (url, opts) => { calls.push({ url, opts }); return { ok: true, status: 201, text: async () => '' }; });
  await db.upsert('rpg_user_saves', { uid: 'a' }, 'uid,campaign_id');
  assert.match(calls[0].url, /rpg_user_saves\?on_conflict=uid%2Ccampaign_id$/);
  assert.equal(calls[0].opts.method, 'POST');
  assert.match(calls[0].opts.headers.Prefer, /resolution=merge-duplicates/);
});
