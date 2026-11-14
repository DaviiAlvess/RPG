import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRoomAction, supabaseRest, onlineStatus } from '../pages/api/room.js';
import { newRoomCode, roomCampaignPayload, nextTurnUid, roomPartyFields, isMyTurn, inviteLink, normalizeRoomCode, cleanSlots, freeSlots, nameKey, myRoomMember, withoutPersonal, personalSheet, freshSheetFor, roomPhotoFor, isPortraitUrl } from '../lib/rooms.mjs';
import { partyPromptLines } from '../lib/play-extras.mjs';
import { memberPortraitUrl } from '../lib/appearance.mjs';
import { partyActor, actorPrefix } from '../lib/play-extras.mjs';

// Banco falso que entende o pedaço do PostgREST que a rota usa (eq., select, order).
function fakeDb() {
  const tables = { rpg_rooms: [], rpg_room_members: [] };
  const parse = (q) => Object.fromEntries(q.split('&').map((p) => p.split('=')).filter(([k, v]) => v?.startsWith('eq.')).map(([k, v]) => [k, decodeURIComponent(v.slice(3))]));
  const match = (row, f) => Object.entries(f).every(([k, v]) => String(row[k]) === v);
  let n = 0;
  return {
    tables,
    async select(t, q) { const f = parse(q); const rows = tables[t].filter((r) => match(r, f)); return (/order=seat/.test(q) ? [...rows].sort((a, b) => a.seat - b.seat) : rows).map((r) => ({ ...r })); },
    async insert(t, row) {
      if (t === 'rpg_rooms') {
        if (tables[t].some((r) => r.code === row.code)) { const e = new Error('dup'); e.code = 'CONFLICT'; throw e; }
        const full = { id: `00000000-0000-0000-0000-${String(++n).padStart(12, '0')}`, version: 1, story_rev: 1, arrivals: [], slots: [], status: 'open', title: '', ...row };
        tables[t].push(full); return [{ ...full }];
      }
      if (tables[t].some((r) => r.room_id === row.room_id && (r.uid === row.uid || r.seat === row.seat))) { const e = new Error('dup'); e.code = 'CONFLICT'; throw e; }
      const full = { active: true, sheet: {}, char_photo: '', char_look: '', char_role: '', ...row };
      tables[t].push(full); return [{ ...full }];
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
  // a sala leva só a história: a ficha do dono (nome, Sistema…) não vai para os outros
  assert.equal(joined.room.campaign.charName, undefined);
  assert.equal(joined.room.campaign.world, 'Westeros');
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

test('salas: endereço do Supabase errado ou antigo não derruba o modo online', async () => {
  const reply = (status, body, raw) => ({ ok: status < 300, status, text: async () => raw ?? JSON.stringify(body) });
  const calls = [];
  const fake = async (url) => {
    calls.push(url);
    if (url.startsWith('https://projeto-velho.supabase.co')) { const e = new TypeError('fetch failed'); e.cause = { code: 'ENOTFOUND' }; throw e; }
    if (url.startsWith('https://supabase.com/')) return reply(404, null, '<html>404</html>');
    if (url.startsWith('https://yjcxmuybnehbnndvqfyk.supabase.co/rest/v1/')) return reply(200, []);
    return reply(401, { error: 'Permission denied' });
  };
  // URL antiga e morta em SUPABASE_URL: cai para o projeto das salas
  let st = await onlineStatus({ SUPABASE_SECRET_KEY: 'sb_secret_x', SUPABASE_URL: 'https://projeto-velho.supabase.co' }, fake);
  assert.equal(st.rooms.ok, true);
  assert.equal(st.rooms.host, 'yjcxmuybnehbnndvqfyk.supabase.co');
  // (o endereço que já respondeu antes vai primeiro; se o velho for tentado, o motivo aparece)
  assert.ok(st.rooms.tried.every((t) => t.host === 'projeto-velho.supabase.co' && t.error === 'ENOTFOUND'));
  // NEXT_PUBLIC_SUPABASE_URL antigo nem é tentado quando o projeto das salas responde
  calls.length = 0;
  const db = supabaseRest({ SUPABASE_SECRET_KEY: 'sb_secret_x', NEXT_PUBLIC_SUPABASE_URL: 'https://projeto-velho.supabase.co' }, fake);
  await db.select('rpg_rooms', 'select=id&limit=1');
  assert.ok(calls.every((u) => !u.includes('projeto-velho')));
  // link do painel vira o endereço da API
  assert.deepEqual(supabaseRest({ SUPABASE_SECRET_KEY: 'k', SUPABASE_URL: 'https://supabase.com/dashboard/project/yjcxmuybnehbnndvqfyk/settings/api' }, fake).info().candidates, ['yjcxmuybnehbnndvqfyk.supabase.co']);
  // nenhum endereço responde: erro claro com o motivo de cada um
  const dead = async () => { const e = new TypeError('fetch failed'); e.cause = { code: 'ENOTFOUND' }; throw e; };
  await assert.rejects(supabaseRest({ SUPABASE_SECRET_KEY: 'k' }, dead).select('rpg_rooms', 'select=id'), /não conseguiu alcançar o Supabase \(yjcxmuybnehbnndvqfyk\.supabase\.co: ENOTFOUND\)/);
});

test('mesa online: cada um escolhe o próprio personagem e tem a sua vez', async () => {
  const db = fakeDb();
  const camp = { id: 'c1', world: 'Springfield', charName: 'Tom Carlos', msgs: [], disp: [] };
  const vagas = [{ name: 'Bart', concept: 'pestinha de skate', role: 'encrenqueiro' }, { name: 'Lisa', concept: 'gênio do sax', role: 'esperta' }, { name: 'tom cárlos' }];
  const { room } = await handleRoomAction(db, 'dono', { action: 'create', campaign: camp, charName: 'Tom Carlos', slots: vagas });
  // o personagem do dono nunca vira vaga
  assert.deepEqual(db.tables.rpg_rooms[0].slots.map((s) => s.name), ['Bart', 'Lisa']);

  // antes de entrar: vê a mesa e as vagas livres, sem uid de ninguém
  let peek = await handleRoomAction(db, 'ana', { action: 'peek', code: room.code });
  assert.equal(peek.isMember, false);
  assert.deepEqual(peek.slots.map((s) => s.name), ['Bart', 'Lisa']);
  assert.deepEqual(peek.members.map((m) => [m.name, m.owner]), [['Tom Carlos', true]]);
  assert.ok(!JSON.stringify(peek).includes('dono'));
  assert.equal(peek.room.campaign, undefined);

  // Ana pega a vaga do Bart (vem com papel e conceito da vaga)
  await handleRoomAction(db, 'ana', { action: 'join', code: room.code, charName: 'bart' });
  const bart = db.tables.rpg_room_members.find((m) => m.uid === 'ana');
  assert.equal(bart.char_name, 'Bart');
  assert.equal(bart.char_role, 'encrenqueiro');
  // Bia não pode ser o Bart nem o Tom Carlos (sem diferença de acento ou maiúscula)
  await assert.rejects(handleRoomAction(db, 'bia', { action: 'join', code: room.code, charName: 'BART' }), /já é o personagem de outro jogador/);
  await assert.rejects(handleRoomAction(db, 'bia', { action: 'join', code: room.code, charName: 'Tom Cárlos' }), /já é o personagem de outro jogador/);
  // a vaga do Bart some da lista
  peek = await handleRoomAction(db, 'bia', { action: 'peek', code: room.code });
  assert.deepEqual(peek.slots.map((s) => s.name), ['Lisa']);
  // Bia cria o próprio personagem
  const joined = await handleRoomAction(db, 'bia', { action: 'join', code: room.code, charName: 'Milhouse', charConcept: 'melhor amigo azarado', charRole: 'apoio' });
  assert.deepEqual(joined.members.map((m) => [m.name, m.role]), [['Tom Carlos', ''], ['Bart', 'encrenqueiro'], ['Milhouse', 'apoio']]);
  // quem já está na sala volta sem escolher de novo
  assert.equal((await handleRoomAction(db, 'ana', { action: 'peek', code: room.code })).isMember, true);
  assert.equal((await handleRoomAction(db, 'ana', { action: 'join', code: room.code })).members.length, 3);

  // vagas: só o dono mexe
  await assert.rejects(handleRoomAction(db, 'ana', { action: 'setSlots', roomId: room.id, slots: [] }), /Só quem criou a sala/);
  const changed = await handleRoomAction(db, 'dono', { action: 'setSlots', roomId: room.id, slots: [{ name: 'Lisa' }, { name: 'Bart' }, { name: 'Maggie', role: 'bebê' }] });
  assert.deepEqual(changed.room.slots.map((s) => s.name), ['Lisa', 'Maggie'], 'personagem já em jogo não vira vaga');

  // a vez: dono → Ana (Bart) → Bia (Milhouse) → dono
  let r = db.tables.rpg_rooms[0];
  assert.equal(r.turn_uid, 'dono');
  await assert.rejects(handleRoomAction(db, 'ana', { action: 'setTurn', roomId: room.id, pass: true }), /Não é a sua vez/);
  let passed = await handleRoomAction(db, 'dono', { action: 'setTurn', roomId: room.id, pass: true });
  assert.equal(passed.room.turn_uid, 'ana');
  passed = await handleRoomAction(db, 'ana', { action: 'setTurn', roomId: room.id, pass: true });
  assert.equal(passed.room.turn_uid, 'bia');
  // Ana não escolhe a vez de ninguém (só passa a própria)
  await assert.rejects(handleRoomAction(db, 'ana', { action: 'setTurn', roomId: room.id, turnUid: 'ana' }), /Só quem criou a sala escolhe a vez/);

  // em cada aparelho, o personagem é o do próprio jogador
  const view = await handleRoomAction(db, 'bia', { action: 'get', roomId: room.id });
  const fields = roomPartyFields(view.room, view.members);
  assert.equal(myRoomMember(fields, 'bia').name, 'Milhouse');
  assert.equal(myRoomMember(fields, 'ana').name, 'Bart');
  assert.equal(isMyTurn(fields, 'bia'), true);
  assert.equal(partyActor({ ...camp, ...fields }).name, 'Milhouse');
  assert.deepEqual(fields.roomSlots.map((s) => s.name), ['Lisa', 'Maggie']);
  // resposta curta (sem vagas) não apaga as vagas do aparelho
  assert.equal('roomSlots' in roomPartyFields({ id: room.id, version: 9, turn_uid: 'dono' }, view.members), false);
  // grupo leva o papel para o Mestre
  assert.match(fields.party.find((p) => p.name === 'Bart').concept, /encrenqueiro — pestinha de skate/);
});

test('vagas e nomes: sem repetição nem acento fazendo diferença', () => {
  assert.equal(nameKey('  Tom   CÁRLOS '), 'tom carlos');
  assert.deepEqual(cleanSlots([{ name: 'Bart' }, { name: 'bárt' }, { name: '' }, { name: 'Lisa' }], { exclude: ['lisa'] }).map((s) => s.name), ['Bart']);
  assert.equal(cleanSlots(Array.from({ length: 20 }, (_, i) => ({ name: `P${i}` }))).length, 8);
  assert.deepEqual(freeSlots([{ name: 'Bart' }, { name: 'Lisa' }], [{ name: 'BART' }]).map((s) => s.name), ['Lisa']);
});

test('mesa online: cada jogador tem a própria ficha, Sistema e retrato', async () => {
  const db = fakeDb();
  const foto = memberPortraitUrl({ name: 'Bart', look: 'cabelo espetado', concept: 'pestinha', world: 'Springfield' });
  assert.ok(isPortraitUrl(foto));
  assert.ok(!foto.includes('Bart'), 'o nome não entra no retrato');
  const dono = {
    id: 'c1', world: 'Springfield', charName: 'Tom Carlos', hp: 80, level: 4, experience: 120,
    gameSystem: { enabled: true, points: 999, rank: 'C' }, items: [{ name: 'taco' }], masterChat: [{ role: 'user', text: 'segredo' }],
    portraitUrl: 'https://image.pollinations.ai/prompt/x?seed=1', msgs: [{ role: 'user', content: 'oi' }], missions: [{ title: 'achar o Krusty' }],
  };
  const { room } = await handleRoomAction(db, 'dono', { action: 'create', campaign: dono, charName: 'Tom Carlos', sheet: personalSheet(dono) });
  const salaGuardada = db.tables.rpg_rooms[0].campaign;
  // a história vai para a sala; a ficha e o Sistema do dono não
  assert.deepEqual(salaGuardada.missions, [{ title: 'achar o Krusty' }]);
  for (const k of ['charName', 'hp', 'level', 'gameSystem', 'items', 'masterChat', 'portraitUrl']) assert.equal(salaGuardada[k], undefined, k);
  assert.equal(salaGuardada.systemOn, true, 'a sala sabe que a história usa o Sistema');
  // a ficha do dono fica guardada só na linha dele, e o retrato vira público
  assert.equal(db.tables.rpg_room_members[0].sheet.gameSystem.points, 999);
  assert.equal(db.tables.rpg_room_members[0].char_photo, dono.portraitUrl);

  // Ana entra com retrato gerado
  const joined = await handleRoomAction(db, 'ana', { action: 'join', code: room.code, charName: 'Bart', charLook: 'cabelo espetado', charPhoto: foto });
  assert.equal(joined.mySheet, undefined, 'quem acabou de entrar ainda não tem ficha guardada');
  assert.equal(joined.members.find((m) => m.name === 'Bart').photo, foto);
  assert.ok(!JSON.stringify(joined).includes('999'), 'Ana não recebe a ficha do dono');
  // retrato de fora do jogo é recusado
  await handleRoomAction(db, 'bia', { action: 'join', code: room.code, charName: 'Lisa', charPhoto: 'https://evil.example/x.png' });
  assert.equal(db.tables.rpg_room_members.find((m) => m.uid === 'bia').char_photo, '');

  // a ficha inicial da Ana: dela, com Sistema zerado porque a história usa o Sistema
  const fichaAna = freshSheetFor(joined.members.find((m) => m.name === 'Bart'), { systemOn: true, defaultSystem: () => ({ enabled: true, points: 0 }) });
  assert.equal(fichaAna.charName, 'Bart');
  assert.equal(fichaAna.gameSystem.points, 0);
  assert.equal(fichaAna.portraitUrl, foto);

  // Ana compra na loja fora da vez: guarda só a ficha dela
  await handleRoomAction(db, 'ana', { action: 'saveSheet', roomId: room.id, sheet: { ...fichaAna, gameSystem: { enabled: true, points: 5 }, msgs: ['não é ficha'] } });
  const linhaAna = db.tables.rpg_room_members.find((m) => m.uid === 'ana');
  assert.equal(linhaAna.sheet.gameSystem.points, 5);
  assert.equal(linhaAna.sheet.msgs, undefined, 'só campos da ficha entram');
  assert.equal(db.tables.rpg_room_members[0].sheet.gameSystem.points, 999, 'a do dono não muda');
  // cada um recebe só a própria ficha
  assert.equal((await handleRoomAction(db, 'ana', { action: 'get', roomId: room.id })).mySheet.gameSystem.points, 5);
  assert.equal((await handleRoomAction(db, 'dono', { action: 'get', roomId: room.id })).mySheet.gameSystem.points, 999);
  assert.equal((await handleRoomAction(db, 'ana', { action: 'join', code: room.code })).mySheet.charName, 'Bart', 'em outro aparelho, Ana recupera a ficha');
  await assert.rejects(handleRoomAction(db, 'estranho', { action: 'saveSheet', roomId: room.id, sheet: {} }), /não está nesta sala/);

  // no aparelho da Ana, ela é a principal e o dono vira grupo
  const v = await handleRoomAction(db, 'ana', { action: 'get', roomId: room.id });
  const local = { ...withoutPersonal(v.room.campaign), ...fichaAna, ...roomPartyFields(v.room, v.members, 'ana') };
  assert.equal(local.charName, 'Bart');
  assert.deepEqual(local.party.map((p) => p.name), ['Tom Carlos', 'Lisa']);
  assert.equal(partyActor(local).name, 'Tom Carlos', 'é a vez do dono');
  assert.equal(roomPhotoFor(local, 'bart'), foto);
  // o Mestre sabe quem vem depois pela ordem da mesa (dono → Bart → Lisa)
  assert.match(partyPromptLines(local).join(' '), /abrindo espaço para Bart/);
  // retrato novo na ficha aparece para a mesa
  const foto2 = memberPortraitUrl({ name: 'Bart', look: 'boné vermelho' }, 42);
  const after = await handleRoomAction(db, 'ana', { action: 'saveSheet', roomId: room.id, sheet: { ...fichaAna, portraitUrl: foto2 } });
  assert.equal(after.members.find((m) => m.name === 'Bart').photo, foto2);
  assert.ok(after.room.version > v.room.version, 'a mesa fica sabendo do retrato novo');
});

test('mesa online: quem sai fica guardado, volta com o mesmo personagem e a vez pula quem está fora', async () => {
  const db = fakeDb();
  const { room } = await handleRoomAction(db, 'dono', { action: 'create', campaign: { world: 'Springfield', msgs: [] }, charName: 'Tom Carlos' });
  await handleRoomAction(db, 'ana', { action: 'join', code: room.code, charName: 'Bart' });
  await handleRoomAction(db, 'bia', { action: 'join', code: room.code, charName: 'Lisa' });
  // vez da Ana; ela sai levando a ficha mais nova
  await handleRoomAction(db, 'dono', { action: 'setTurn', roomId: room.id, turnUid: 'ana' });
  const left = await handleRoomAction(db, 'ana', { action: 'leave', roomId: room.id, sheet: { charName: 'Bart', level: 3, gameSystem: { enabled: true, points: 40 } } });
  assert.ok(left.left && left.saved);
  const linha = db.tables.rpg_room_members.find((m) => m.uid === 'ana');
  assert.equal(linha.active, false, 'não apaga: fica guardado');
  assert.equal(linha.sheet.level, 3);
  assert.equal(db.tables.rpg_rooms[0].turn_uid, 'bia', 'a vez pula para a próxima pessoa presente');
  // fora da mesa: não joga nem passa a vez
  await assert.rejects(handleRoomAction(db, 'ana', { action: 'push', roomId: room.id, baseVersion: db.tables.rpg_rooms[0].version, campaign: {} }), /não está nesta sala/);
  // ninguém pega o personagem dela enquanto está fora
  await assert.rejects(handleRoomAction(db, 'caio', { action: 'join', code: room.code, charName: 'bart' }), /já é o personagem de outro jogador/);
  // a mesa mostra quem saiu; para a vez, só quem está presente
  const view = await handleRoomAction(db, 'dono', { action: 'get', roomId: room.id });
  const fields = roomPartyFields(view.room, view.members, 'dono');
  assert.deepEqual(fields.roomMembers.map((m) => m.name), ['Tom Carlos', 'Lisa']);
  assert.deepEqual(fields.roomAway.map((m) => m.name), ['Bart']);
  assert.equal(nextTurnUid(view.members, 'dono'), 'bia');
  assert.equal(nextTurnUid(view.members, 'bia'), 'dono', 'pula a Ana que saiu');
  // Ana volta: espiando, já sabe que tem personagem guardado
  const peek = await handleRoomAction(db, 'ana', { action: 'peek', code: room.code });
  assert.equal(peek.isMember, true);
  assert.equal(peek.myName, 'Bart');
  assert.equal(peek.members.find((m) => m.name === 'Bart').away, true);
  const back = await handleRoomAction(db, 'ana', { action: 'join', code: room.code });
  assert.equal(back.mySheet.level, 3, 'mesma ficha');
  assert.equal(back.mySheet.gameSystem.points, 40, 'mesmo Sistema');
  assert.equal(db.tables.rpg_room_members.find((m) => m.uid === 'ana').active, true);
  assert.deepEqual(roomPartyFields(back.room, back.members, 'ana').roomMembers.map((m) => m.name), ['Tom Carlos', 'Bart', 'Lisa']);
  // sozinho na mesa: a vez fica com quem está
  await handleRoomAction(db, 'ana', { action: 'leave', roomId: room.id });
  await handleRoomAction(db, 'bia', { action: 'leave', roomId: room.id });
  const solo = roomPartyFields((await handleRoomAction(db, 'dono', { action: 'get', roomId: room.id })).room, (await handleRoomAction(db, 'dono', { action: 'get', roomId: room.id })).members, 'dono');
  assert.equal(solo.roomMembers.length, 1);
  assert.equal(solo.roomTurnUid, 'dono');
  assert.equal(solo.party.length, 0, 'sem grupo: some a parte de passar a vez');
});

test('mesa online: entrar no meio da jogada de alguém não estraga a jogada, e o Mestre fica sabendo', async () => {
  const db = fakeDb();
  const { room } = await handleRoomAction(db, 'dono', { action: 'create', campaign: { world: 'Springfield', msgs: [{ c: 1 }] }, charName: 'Tom Carlos' });
  let v = await handleRoomAction(db, 'dono', { action: 'get', roomId: room.id });
  const antes = roomPartyFields(v.room, v.members, 'dono');
  assert.equal(antes.roomStoryRev, 1);
  // o dono começa a jogar; enquanto o Mestre escreve, Ana entra (a mesa muda, a história não)
  await handleRoomAction(db, 'ana', { action: 'join', code: room.code, charName: 'Bart' });
  assert.equal(db.tables.rpg_rooms[0].arrivals.at(-1).name, 'Bart');
  assert.equal(db.tables.rpg_rooms[0].arrivals.at(-1).kind, 'chegou');
  // a jogada do dono entra mesmo assim (confere a história, não a mesa inteira)
  const pushed = await handleRoomAction(db, 'dono', { action: 'push', roomId: room.id, baseVersion: antes.roomVersion, baseStoryRev: antes.roomStoryRev, campaign: { world: 'Springfield', msgs: [{ c: 1 }, { c: 2 }] }, seenArrivals: [] });
  assert.equal(pushed.room.story_rev, 2);
  assert.equal(pushed.room.turn_uid, 'ana', 'e a vez vai para quem acabou de chegar');
  assert.equal(pushed.room.arrivals.length, 1, 'o aviso da Ana continua (o Mestre ainda não narrou)');
  // Ana entra no ponto atual da mesa
  v = await handleRoomAction(db, 'ana', { action: 'get', roomId: room.id });
  assert.equal(v.room.campaign.msgs.length, 2);
  // na vez da Ana, o Mestre recebe o aviso; depois da jogada, o aviso sai
  const local = { ...withoutPersonal(v.room.campaign), charName: 'Bart', ...roomPartyFields(v.room, v.members, 'ana') };
  assert.match(partyPromptLines(local).join(' '), /Bart acabou de entrar na mesa/);
  const done = await handleRoomAction(db, 'ana', { action: 'push', roomId: room.id, baseStoryRev: local.roomStoryRev, campaign: { msgs: [1, 2, 3] }, seenArrivals: local.roomArrivals.map((a) => a.id) });
  assert.deepEqual(done.room.arrivals, []);
  // duas jogadas da mesma versão da história: a segunda é recusada
  await assert.rejects(handleRoomAction(db, 'dono', { action: 'push', roomId: room.id, baseStoryRev: 2, campaign: {} }), /história andou/);
  // sair também avisa o Mestre
  await handleRoomAction(db, 'ana', { action: 'leave', roomId: room.id });
  assert.equal(db.tables.rpg_rooms[0].arrivals.at(-1).kind, 'saiu');
  const solo = await handleRoomAction(db, 'dono', { action: 'get', roomId: room.id });
  assert.match(partyPromptLines({ charName: 'Tom Carlos', ...roomPartyFields(solo.room, solo.members, 'dono') }).join(' '), /Bart saiu da mesa/);
});

test('mesa online: quem entra pode assumir um personagem que já existe na história', async () => {
  const db = fakeDb();
  const story = {
    world: 'Springfield', msgs: [],
    worldState: { npcs: { 'Bart Simpson': 'pestinha; sarcástico, fala rápido; escola; pichou o muro', 'Diretor Skinner': 'diretor; tenso; escola', 'Tom Carlos': 'erro: é o personagem do dono' } },
    relationships: { 'Nelson': 'Hostil', 'Bart Simpson': 'Amigável' },
    npcSeen: { 'Diretor Skinner': { turn: 9 }, 'Bart Simpson': { turn: 3 } },
  };
  const { room } = await handleRoomAction(db, 'dono', { action: 'create', campaign: story, charName: 'Tom Carlos', slots: [{ name: 'Nelson', role: 'valentão' }] });
  const peek = await handleRoomAction(db, 'ana', { action: 'peek', code: room.code });
  // da história: sem o personagem do dono, sem vaga repetida, sem duplicar, visto por último primeiro
  assert.deepEqual(peek.storyChars.map((c) => c.name), ['Diretor Skinner', 'Bart Simpson']);
  const bart = peek.storyChars.find((c) => c.name === 'Bart Simpson');
  assert.equal(bart.role, 'pestinha');
  assert.match(bart.about, /sarcástico/);
  assert.ok(isPortraitUrl(bart.photo), 'mesmo retrato que a história já usa');
  // Ana assume o Bart
  const joined = await handleRoomAction(db, 'ana', { action: 'join', code: room.code, charName: 'bart simpson', fromStory: true, charPhoto: bart.photo });
  const linha = db.tables.rpg_room_members.find((m) => m.uid === 'ana');
  assert.equal(linha.char_name, 'Bart Simpson', 'usa o nome como está na história');
  assert.equal(linha.char_role, 'pestinha');
  assert.match(linha.char_concept, /sarcástico/);
  assert.equal(db.tables.rpg_rooms[0].arrivals.at(-1).kind, 'assumiu');
  // o Mestre é avisado que não joga mais pelo Bart
  const fields = roomPartyFields(joined.room, joined.members, 'dono');
  assert.match(partyPromptLines({ charName: 'Tom Carlos', ...fields }).join(' '), /Bart Simpson, que já existia na história, agora é jogado por uma pessoa da mesa/);
  // ninguém mais pode pegar o Bart
  assert.deepEqual((await handleRoomAction(db, 'bia', { action: 'peek', code: room.code })).storyChars.map((c) => c.name), ['Diretor Skinner']);
  await assert.rejects(handleRoomAction(db, 'bia', { action: 'join', code: room.code, charName: 'Bart Simpson', fromStory: true }), /já é o personagem de outro jogador/);
});
