import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRoomAction, supabaseRest, onlineStatus } from '../pages/api/room.js';
import { newRoomCode, roomCampaignPayload, nextTurnUid, roomPartyFields, isMyTurn, inviteLink, normalizeRoomCode } from '../lib/rooms.mjs';
import { partyActor, actorPrefix } from '../lib/play-extras.mjs';

// Banco falso que entende o pedaço do PostgREST que a rota usa (eq., select, order).
function fakeDb() {
  const tables = { rpg_rooms: [], rpg_room_members: [] };
  const parse = (q) => Object.fromEntries(q.split('&').map((p) => p.split('=')).filter(([k, v]) => v?.startsWith('eq.')).map(([k, v]) => [k, decodeURIComponent(v.slice(3))]));
  const match = (row, f) => Object.entries(f).every(([k, v]) => String(row[k]) === v);
  let n = 0;
  return {
    tables,
    async select(t, q) { const f = parse(q); const rows = tables[t].filter((r) => match(r, f)); return /order=seat/.test(q) ? [...rows].sort((a, b) => a.seat - b.seat) : rows.map((r) => ({ ...r })); },
    async insert(t, row) {
      if (t === 'rpg_rooms') {
        if (tables[t].some((r) => r.code === row.code)) { const e = new Error('dup'); e.code = 'CONFLICT'; throw e; }
        const full = { id: `00000000-0000-0000-0000-${String(++n).padStart(12, '0')}`, version: 1, status: 'open', title: '', ...row };
        tables[t].push(full); return [{ ...full }];
      }
      if (tables[t].some((r) => r.room_id === row.room_id && (r.uid === row.uid || r.seat === row.seat))) { const e = new Error('dup'); e.code = 'CONFLICT'; throw e; }
      tables[t].push({ ...row }); return [{ ...row }];
    },
    async update(t, q, patch) { const f = parse(q); const rows = tables[t].filter((r) => match(r, f)); rows.forEach((r) => Object.assign(r, patch)); return rows.map((r) => ({ ...r })); },
    async remove(t, q) { const f = parse(q); const keep = tables[t].filter((r) => !match(r, f)); const gone = tables[t].length - keep.length; tables[t] = keep; return Array(gone).fill({}); },
  };
}

test('sala online: criar, convidar, revezar, conflito e sair', async () => {
  const db = fakeDb();
  const camp = { id: 'c1', world: 'Westeros', charName: 'Aldric Rivers', charTitle: 'bastardo', msgs: [{ role: 'user', content: 'oi' }], disp: [], saves: [{ id: 's' }], roomId: 'x' };
  const created = await handleRoomAction(db, 'uid-dono', { action: 'create', campaign: camp, charName: camp.charName });
  const room = created.room;
  assert.match(room.code, /^[A-Z2-9]{6}$/);
  assert.equal(room.turn_uid, 'uid-dono');
  assert.equal(db.tables.rpg_rooms[0].campaign.saves, undefined, 'saves pessoais não vão para a sala');

  await assert.rejects(handleRoomAction(db, 'uid-amigo', { action: 'join', code: room.code }), /nome do seu personagem/);
  const joined = await handleRoomAction(db, 'uid-amigo', { action: 'join', code: room.code.toLowerCase(), charName: 'Rafa', charConcept: 'arqueira' });
  assert.equal(joined.members.length, 2);
  assert.equal(joined.room.campaign.charName, 'Aldric Rivers');
  await assert.rejects(handleRoomAction(db, 'estranho', { action: 'get', roomId: room.id }), /não está nesta sala/);

  // fora da vez: recusado
  await assert.rejects(handleRoomAction(db, 'uid-amigo', { action: 'push', roomId: room.id, baseVersion: 2, campaign: camp }), /Não é a sua vez/);
  // dono joga: versão sobe e a vez passa para o amigo
  const pushed = await handleRoomAction(db, 'uid-dono', { action: 'push', roomId: room.id, baseVersion: 2, campaign: { ...camp, turn: 1 } });
  assert.equal(pushed.room.version, 3);
  assert.equal(pushed.room.turn_uid, 'uid-amigo');
  // versão velha: conflito
  await assert.rejects(handleRoomAction(db, 'uid-amigo', { action: 'push', roomId: room.id, baseVersion: 2, campaign: camp }), /mudou enquanto você jogava/);

  const poll = await handleRoomAction(db, 'uid-amigo', { action: 'poll', roomId: room.id, since: 3 });
  assert.ok(poll.unchanged);
  const fresh = await handleRoomAction(db, 'uid-amigo', { action: 'poll', roomId: room.id, since: 2 });
  assert.equal(fresh.room.campaign.turn, 1);

  // campanha deste aparelho vira grupo: dono é o principal, amigo entra no grupo e está na vez
  const fields = roomPartyFields(fresh.room, fresh.members);
  const local = { charName: 'Aldric Rivers', ...fields };
  assert.equal(partyActor(local).name, 'Rafa');
  assert.equal(actorPrefix(local, 'atiro uma flecha'), '[Rafa] atiro uma flecha');
  assert.ok(isMyTurn(local, 'uid-amigo'));
  assert.ok(!isMyTurn(local, 'uid-dono'));

  await assert.rejects(handleRoomAction(db, 'uid-amigo', { action: 'setTurn', roomId: room.id, turnUid: 'uid-dono' }), /Só quem criou/);
  const left = await handleRoomAction(db, 'uid-amigo', { action: 'leave', roomId: room.id });
  assert.ok(left.left);
  assert.equal(db.tables.rpg_rooms[0].turn_uid, 'uid-dono');
  const closed = await handleRoomAction(db, 'uid-dono', { action: 'leave', roomId: room.id });
  assert.ok(closed.closed);
  await assert.rejects(handleRoomAction(db, 'outro', { action: 'join', code: room.code, charName: 'X' }), /fechada/);
});

test('regras puras das salas e servidor sem chave avisa o que falta', () => {
  assert.equal(newRoomCode(() => 0), 'AAAAAA');
  assert.equal(normalizeRoomCode('k7q-m2p'), 'K7QM2P');
  assert.equal(nextTurnUid([{ uid: 'a', seat: 0 }, { uid: 'b', seat: 1 }], 'b'), 'a');
  assert.equal(inviteLink('https://x.app/', 'k7qm2p'), 'https://x.app/?sala=K7QM2P');
  const big = roomCampaignPayload({ disp: Array.from({ length: 2000 }, () => ({ text: 'x'.repeat(2500) })), img: `data:image/png;base64,${'a'.repeat(5000)}` });
  assert.equal(big.img, undefined);
  assert.equal(big.disp.length, 400);
  assert.throws(() => supabaseRest({}), /SUPABASE_SECRET_KEY/);
});

test('situação do online: diz o que falta sem expor a chave', async () => {
  const reply = (status, body) => ({ ok: status < 300, status, text: async () => JSON.stringify(body) });
  // sem chave do Supabase; Firebase ligado e fechado
  let seen = [];
  let st = await onlineStatus({}, async (url) => { seen.push(url); return reply(401, { error: 'Permission denied' }); });
  assert.equal(st.rooms.configured, false);
  assert.equal(st.rooms.ok, false);
  assert.match(st.rooms.detail, /SUPABASE_SECRET_KEY/);
  assert.equal(st.cloud.ok, true);
  assert.equal(st.cloud.open, false);
  assert.ok(seen.every((u) => !u.includes('rest/v1')));
  // chave certa
  st = await onlineStatus({ SUPABASE_SECRET_KEY: 'sb_secret_abc' }, async (url) => url.includes('rest/v1') ? reply(200, []) : reply(401, { error: 'Permission denied' }));
  assert.equal(st.rooms.ok, true);
  assert.ok(!JSON.stringify(st).includes('sb_secret_abc'));
  // chave errada e banco desligado
  st = await onlineStatus({ SUPABASE_SECRET_KEY: 'sb_publishable_x' }, async (url) => url.includes('rest/v1') ? reply(401, { message: 'Invalid API key' }) : reply(423, { error: 'The Firebase database has been disabled.' }));
  assert.equal(st.rooms.configured, true);
  assert.equal(st.rooms.ok, false);
  assert.match(st.rooms.detail, /Invalid API key/);
  assert.equal(st.cloud.ok, false);
  assert.match(st.cloud.detail, /disabled/);
  // banco aberto para qualquer um
  st = await onlineStatus({}, async () => reply(200, { users: true }));
  assert.equal(st.cloud.open, true);
  assert.ok(!JSON.stringify(st).includes('users'));
});
