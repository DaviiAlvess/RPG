// pages/api/room.js — salas online no Supabase.
// O navegador nunca fala com o Supabase direto: esta rota confere o login Firebase do jogador,
// checa se ele é membro da sala (e se é a vez dele) e só então lê ou grava com a chave secreta.
import { bearerToken, takeRateLimit, verifyIdToken } from "../../lib/verify-id-token.mjs";
import { supabaseRest, httpError, netReason } from "../../lib/supabase-rest.mjs";
import { ROOM_MAX_PLAYERS, isRoomCode, newRoomCode, nextTurnUid, normalizeRoomCode, roomCampaignPayload, cleanMember, cleanSlots, freeSlots, nameKey, cleanSheet, isPortraitUrl } from "../../lib/rooms.mjs";

export { supabaseRest };

export const config = { maxDuration: 30, api: { bodyParser: { sizeLimit: "4mb" } } };

const clip = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

const eq = (v) => `eq.${encodeURIComponent(String(v))}`;
const ROOM_FIELDS = "id,code,owner_uid,title,version,turn_uid,status,updated_at,slots,story_rev,arrivals";

async function loadMembers(db, roomId) {
  return (await db.select("rpg_room_members", `room_id=${eq(roomId)}&select=uid,char_name,char_concept,char_role,char_photo,char_look,seat,active&order=seat.asc`)) || [];
}

async function loadRoom(db, roomId, { withCampaign = true } = {}) {
  const rows = await db.select("rpg_rooms", `id=${eq(roomId)}&select=${withCampaign ? `${ROOM_FIELDS},campaign` : ROOM_FIELDS}`);
  const room = rows?.[0];
  if (!room) throw httpError(404, "Sala não encontrada.", "ROOM_NOT_FOUND");
  return room;
}

function requireMember(members, uid) {
  const me = members.find((m) => m.uid === uid && m.active !== false);
  if (!me) throw httpError(403, "Você não está nesta sala.", "NOT_MEMBER");
  return me;
}
const present = (members) => members.filter((m) => m.active !== false);

const view = (room, members, mySheet) => ({ room: { ...room, campaign: room.campaign ?? undefined }, members: members.map(cleanMember), ...(mySheet ? { mySheet } : {}) });

// Ficha privada: só quem pediu recebe a própria.
async function loadMySheet(db, roomId, uid) {
  const rows = (await db.select("rpg_room_members", `room_id=${eq(roomId)}&uid=${eq(uid)}&select=sheet`)) || [];
  const sheet = rows[0]?.sheet;
  return sheet && typeof sheet === "object" && Object.keys(sheet).length ? sheet : null;
}

// Guarda a ficha do jogador e, se tiver retrato do jogo, mostra para a mesa.
async function saveMySheet(db, roomId, uid, rawSheet) {
  const sheet = cleanSheet(rawSheet);
  if (!sheet) return false;
  const patch = { sheet };
  if (isPortraitUrl(sheet.portraitUrl)) patch.char_photo = sheet.portraitUrl;
  await db.update("rpg_room_members", `room_id=${eq(roomId)}&uid=${eq(uid)}`, patch);
  return true;
}
const photoOf = (v) => (isPortraitUrl(v) ? v : "");

// Avisos para o Mestre: quem chegou, voltou ou saiu desde a última jogada.
function withArrival(list, entry, now) {
  const base = Array.isArray(list) ? list : [];
  return [...base, { id: `${Date.parse(now) || Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: now, ...entry }].slice(-8);
}

export async function handleRoomAction(db, uid, body = {}) {
  const action = String(body.action || "");
  const now = new Date().toISOString();

  if (action === "create") {
    const campaign = roomCampaignPayload(body.campaign || {});
    if (!campaign) throw httpError(413, "Esta campanha está grande demais para virar sala online.", "TOO_LARGE");
    const charName = clip(body.charName || body.campaign?.charName, 60) || "Jogador 1";
    let room = null;
    for (let i = 0; i < 5 && !room; i += 1) {
      try {
        [room] = await db.insert("rpg_rooms", { code: newRoomCode(), owner_uid: uid, title: clip(body.title || campaign.world, 160), campaign, turn_uid: uid, slots: cleanSlots(body.slots, { exclude: [charName] }) });
      } catch (e) {
        if (e.code !== "CONFLICT") throw e; // código repetido: tenta outro
      }
    }
    if (!room) throw httpError(503, "Não foi possível criar a sala agora.", "ONLINE_ERROR");
    const ownerSheet = cleanSheet(body.sheet) || {};
    await db.insert("rpg_room_members", { room_id: room.id, uid, char_name: charName, char_concept: clip(body.charConcept, 200), char_role: clip(body.charRole, 80), char_photo: photoOf(body.charPhoto || ownerSheet.portraitUrl), char_look: clip(body.charLook, 200), sheet: ownerSheet, seat: 0 });
    return view(room, await loadMembers(db, room.id));
  }

  // Antes de entrar: quem está na mesa e quais personagens ainda estão livres (sem a campanha).
  if (action === "peek") {
    const code = normalizeRoomCode(body.code);
    if (!isRoomCode(code)) throw httpError(400, "Código de sala inválido.", "BAD_CODE");
    const [found] = (await db.select("rpg_rooms", `code=${eq(code)}&select=${ROOM_FIELDS}`)) || [];
    if (!found || found.status !== "open") throw httpError(404, "Sala não encontrada ou fechada.", "ROOM_NOT_FOUND");
    const members = await loadMembers(db, found.id);
    const list = members.map(cleanMember);
    return {
      room: { code: found.code, title: found.title },
      // Sem uid: quem ainda não entrou só vê nomes e papéis.
      members: members.map((m) => {
        const c = cleanMember(m);
        return { name: c.name, concept: c.concept, role: c.role, photo: c.photo, seat: c.seat, owner: m.uid === found.owner_uid, away: !c.active };
      }),
      slots: freeSlots(found.slots, list),
      isMember: members.some((m) => m.uid === uid),
      myName: cleanMember(members.find((m) => m.uid === uid) || {}).name || "",
      full: present(members).length >= ROOM_MAX_PLAYERS && !members.some((m) => m.uid === uid),
    };
  }

  if (action === "join") {
    const code = normalizeRoomCode(body.code);
    if (!isRoomCode(code)) throw httpError(400, "Código de sala inválido.", "BAD_CODE");
    const [found] = (await db.select("rpg_rooms", `code=${eq(code)}&select=${ROOM_FIELDS},campaign`)) || [];
    if (!found || found.status !== "open") throw httpError(404, "Sala não encontrada ou fechada.", "ROOM_NOT_FOUND");
    let members = await loadMembers(db, found.id);
    const mine = members.find((m) => m.uid === uid);
    if (mine && mine.active === false) {
      if (present(members).length >= ROOM_MAX_PLAYERS) throw httpError(409, `A mesa já tem ${ROOM_MAX_PLAYERS} jogadores. Espere alguém sair.`, "ROOM_FULL");
      // Voltou: mesmo personagem, mesma ficha, mesmo lugar na ordem. Entra na história como ela está agora.
      await db.update("rpg_room_members", `room_id=${eq(found.id)}&uid=${eq(uid)}`, { active: true, left_at: null });
      const turn = present(members).length ? found.turn_uid : uid;
      const arrivals = withArrival(found.arrivals, { name: mine.char_name, kind: "volta" }, now);
      await db.update("rpg_rooms", `id=${eq(found.id)}`, { version: found.version + 1, turn_uid: turn, arrivals, updated_at: now });
      found.version += 1;
      found.turn_uid = turn;
      found.arrivals = arrivals;
      members = await loadMembers(db, found.id);
    }
    if (!mine) {
      if (present(members).length >= ROOM_MAX_PLAYERS) throw httpError(409, `A sala já tem ${ROOM_MAX_PLAYERS} jogadores.`, "ROOM_FULL");
      const charName = clip(body.charName, 60);
      if (!charName) throw httpError(400, "Escolha o nome do seu personagem.", "NAME_REQUIRED");
      // Cada jogador tem o próprio personagem: ninguém entra com um nome que já está na mesa.
      if (members.some((m) => nameKey(m.char_name) === nameKey(charName))) {
        throw httpError(409, `${charName} já é o personagem de outro jogador. Escolha outro.`, "NAME_TAKEN");
      }
      const slot = (Array.isArray(found.slots) ? found.slots : []).find((sl) => nameKey(sl?.name) === nameKey(charName));
      const seat = Math.max(-1, ...members.map((m) => m.seat)) + 1;
      try {
        await db.insert("rpg_room_members", {
          room_id: found.id,
          uid,
          char_name: slot ? clip(slot.name, 60) : charName,
          char_concept: clip(body.charConcept || slot?.concept, 200),
          char_role: clip(body.charRole || slot?.role, 80),
          char_look: clip(body.charLook || slot?.look, 200),
          char_photo: photoOf(body.charPhoto || slot?.photo),
          seat,
        });
      } catch (e) {
        // Dois amigos entrando juntos no mesmo lugar: o segundo tenta de novo.
        if (e.code === "CONFLICT") throw httpError(409, "Outro jogador entrou neste instante. Tente de novo.", "SEAT_CONFLICT");
        throw e;
      }
      // Avisa a mesa e o Mestre que alguém chegou (sobe a versão; a jogada de quem está na vez não se perde).
      const arrivals = withArrival(found.arrivals, { name: slot ? clip(slot.name, 60) : charName, kind: "chegou" }, now);
      await db.update("rpg_rooms", `id=${eq(found.id)}`, { version: found.version + 1, arrivals, updated_at: now });
      found.version += 1;
      found.arrivals = arrivals;
      members = await loadMembers(db, found.id);
    }
    return view(found, members, await loadMySheet(db, found.id, uid));
  }

  const roomId = String(body.roomId || "");
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) throw httpError(400, "Sala inválida.", "BAD_ROOM");

  if (action === "poll") {
    const room = await loadRoom(db, roomId, { withCampaign: false });
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    const since = Number(body.since) || 0;
    if (room.version <= since) return { room: { id: room.id, version: room.version, turn_uid: room.turn_uid, status: room.status }, members: members.map(cleanMember), unchanged: true };
    return view(await loadRoom(db, roomId), members);
  }

  if (action === "get") {
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    return view(await loadRoom(db, roomId), members, await loadMySheet(db, roomId, uid));
  }

  // A ficha mudou fora da vez (loja do Sistema, itens, retrato): guarda só a do próprio jogador.
  if (action === "saveSheet") {
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    const before = members.find((m) => m.uid === uid)?.char_photo || "";
    if (!(await saveMySheet(db, roomId, uid, body.sheet))) throw httpError(400, "Ficha inválida ou grande demais.", "BAD_SHEET");
    const room = await loadRoom(db, roomId, { withCampaign: false });
    const fresh = await loadMembers(db, roomId);
    // Retrato novo: avisa a mesa (sobe a versão sem mexer na vez).
    const after = fresh.find((m) => m.uid === uid)?.char_photo || "";
    if (before !== after) {
      await db.update("rpg_rooms", `id=${eq(roomId)}`, { version: room.version + 1, updated_at: now });
      room.version += 1;
    }
    return { room: { id: roomId, version: room.version, turn_uid: room.turn_uid, status: room.status }, members: fresh.map(cleanMember) };
  }

  if (action === "push") {
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    const room = await loadRoom(db, roomId, { withCampaign: false });
    if (room.status !== "open") throw httpError(409, "A sala foi fechada.", "ROOM_CLOSED");
    if (room.turn_uid && room.turn_uid !== uid) throw httpError(409, "Não é a sua vez.", "NOT_YOUR_TURN");
    const campaign = roomCampaignPayload(body.campaign || {});
    if (!campaign) throw httpError(413, "A campanha ficou grande demais para sincronizar.", "TOO_LARGE");
    const turn = body.keepTurn ? uid : nextTurnUid(members, uid);
    const seen = new Set(Array.isArray(body.seenArrivals) ? body.seenArrivals.map(String) : []);
    const arrivals = (Array.isArray(room.arrivals) ? room.arrivals : []).filter((a) => !seen.has(String(a?.id)));
    const storyRev = Number(room.story_rev) || 1;
    let filter;
    if (body.baseStoryRev != null) {
      // Só a história importa: alguém entrar, sair ou trocar o retrato no meio da jogada não a invalida.
      if (Number(body.baseStoryRev) !== storyRev) throw httpError(409, "A história andou enquanto você jogava.", "VERSION_CONFLICT");
      filter = `id=${eq(roomId)}&story_rev=${eq(storyRev)}`;
    } else {
      // Aparelho com o jogo antigo: confere a versão inteira da mesa.
      const base = Number(body.baseVersion) || 0;
      if (base !== room.version) throw httpError(409, "A mesa mudou enquanto você jogava.", "VERSION_CONFLICT");
      filter = `id=${eq(roomId)}&version=${eq(base)}`;
    }
    const version = room.version + 1;
    const rows = await db.update("rpg_rooms", filter, { campaign, version, story_rev: storyRev + 1, turn_uid: turn, arrivals, updated_at: now });
    if (!rows?.length) throw httpError(409, "A história andou enquanto você jogava.", "VERSION_CONFLICT");
    let list = members;
    if (body.sheet && (await saveMySheet(db, roomId, uid, body.sheet))) list = await loadMembers(db, roomId);
    return { room: { id: roomId, version, story_rev: storyRev + 1, turn_uid: turn, status: "open", arrivals }, members: list.map(cleanMember) };
  }

  if (action === "setSlots") {
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    const room = await loadRoom(db, roomId, { withCampaign: false });
    if (room.owner_uid !== uid) throw httpError(403, "Só quem criou a sala escolhe os personagens.", "OWNER_ONLY");
    const slots = cleanSlots(body.slots, { exclude: members.map((m) => m.char_name) });
    await db.update("rpg_rooms", `id=${eq(roomId)}`, { slots, version: room.version + 1, updated_at: now });
    return { room: { id: roomId, version: room.version + 1, turn_uid: room.turn_uid, status: room.status, slots }, members: members.map(cleanMember) };
  }

  if (action === "setTurn") {
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    const room = await loadRoom(db, roomId, { withCampaign: false });
    // Quem está na vez pode passar para o próximo; escolher qualquer um é só do dono.
    if (body.pass) {
      if (room.turn_uid !== uid && room.owner_uid !== uid) throw httpError(409, "Não é a sua vez.", "NOT_YOUR_TURN");
      const target = nextTurnUid(members, room.turn_uid || uid);
      await db.update("rpg_rooms", `id=${eq(roomId)}`, { turn_uid: target, version: room.version + 1, updated_at: now });
      return { room: { id: roomId, version: room.version + 1, turn_uid: target, status: room.status }, members: members.map(cleanMember) };
    }
    if (room.owner_uid !== uid) throw httpError(403, "Só quem criou a sala escolhe a vez.", "OWNER_ONLY");
    const target = String(body.turnUid || "");
    if (!present(members).some((m) => m.uid === target)) throw httpError(400, "Jogador não está na mesa.", "NOT_MEMBER");
    await db.update("rpg_rooms", `id=${eq(roomId)}`, { turn_uid: target, version: room.version + 1, updated_at: now });
    return { room: { id: roomId, version: room.version + 1, turn_uid: target, status: room.status }, members: members.map(cleanMember) };
  }

  if (action === "leave") {
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    const room = await loadRoom(db, roomId, { withCampaign: false });
    if (room.owner_uid === uid) {
      await db.update("rpg_rooms", `id=${eq(roomId)}`, { status: "closed", version: room.version + 1, updated_at: now });
      return { closed: true };
    }
    // Guarda a ficha mais nova e marca como fora da mesa: personagem e ficha ficam esperando a volta.
    if (body.sheet) await saveMySheet(db, roomId, uid, body.sheet);
    await db.update("rpg_room_members", `room_id=${eq(roomId)}&uid=${eq(uid)}`, { active: false, left_at: now });
    const rest = present(members).filter((m) => m.uid !== uid);
    const after = members.map((m) => (m.uid === uid ? { ...m, active: false } : m));
    const turn = room.turn_uid === uid ? nextTurnUid(after, uid) : room.turn_uid;
    const roomFull = await loadRoom(db, roomId, { withCampaign: false });
    const arrivals = withArrival(roomFull.arrivals, { name: members.find((m) => m.uid === uid)?.char_name || "", kind: "saiu" }, now);
    await db.update("rpg_rooms", `id=${eq(roomId)}`, { turn_uid: turn && rest.some((m) => m.uid === turn) ? turn : room.owner_uid, version: room.version + 1, arrivals, updated_at: now });
    return { left: true, saved: true };
  }

  throw httpError(400, "Ação desconhecida.", "BAD_ACTION");
}

const DEFAULT_RTDB_URL = "https://siterpg32-default-rtdb.firebaseio.com";

/**
 * Situação do modo online (salas no Supabase) e do banco da nuvem (Firebase),
 * para o jogo explicar o que falta. Não devolve nenhuma chave nem dado de jogador.
 */
export async function onlineStatus(env = process.env, fetchImpl = fetch) {
  const timed = (url, opts = {}) => fetchImpl(url, { ...opts, signal: AbortSignal.timeout(4000) });
  const out = { rooms: { configured: false, ok: false, detail: "", host: "", tried: [] }, cloud: { ok: false, open: false, status: 0, detail: "" } };
  let db = null;
  try {
    db = supabaseRest(env, timed);
    out.rooms.configured = true;
    await db.select("rpg_rooms", "select=id&limit=1");
    out.rooms.ok = true;
    out.rooms.detail = "Servidor ligado ao banco das salas.";
  } catch (error) {
    out.rooms.detail = String(error.message || "Erro no Supabase").slice(0, 300);
  }
  // Área de saves: só confere se a tabela responde (não devolve nenhum dado).
  out.saves = { ok: false, detail: "" };
  if (db && out.rooms.ok) {
    try {
      await db.select("rpg_user_saves", "select=uid&limit=1");
      out.saves.ok = true;
      out.saves.detail = "Área de saves pronta.";
    } catch (error) {
      out.saves.detail = String(error.message || "Erro no Supabase").slice(0, 200);
    }
  } else out.saves.detail = out.rooms.detail;
  if (db) {
    const info = db.info();
    out.rooms.host = info.host;
    out.rooms.tried = info.tried;
    out.rooms.candidates = info.candidates;
  }
  try {
    const base = String(env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || DEFAULT_RTDB_URL).replace(/\/$/, "");
    const res = await timed(`${base}/.json?shallow=true`);
    out.cloud.status = res.status;
    const text = (await res.text()).slice(0, 400);
    let message = text;
    try { message = JSON.parse(text)?.error || text; } catch {}
    if (res.status === 401) {
      out.cloud.ok = true;
      out.cloud.detail = "Banco da nuvem ligado e fechado para quem não está logado.";
    } else if (res.status === 200) {
      out.cloud.ok = true;
      out.cloud.open = true;
      out.cloud.detail = "Banco da nuvem ligado, mas aberto para qualquer pessoa ler.";
    } else {
      out.cloud.detail = String(message || `Firebase respondeu ${res.status}`).slice(0, 200);
    }
  } catch (error) {
    out.cloud.detail = error.name === "TimeoutError" ? "O banco da nuvem não respondeu." : `${error.message || "Erro no Firebase"} (${netReason(error)})`.slice(0, 200);
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
    const rate = takeRateLimit(`room-status:${ip}`, { limit: 20 });
    if (!rate.ok) return res.status(429).json({ error: "Espere alguns segundos.", code: "RATE_LIMIT" });
    return res.status(200).json(await onlineStatus());
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  let uid;
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "siterpg32";
    ({ uid } = await verifyIdToken(bearerToken(req), { projectId }));
  } catch (error) {
    return res.status(error.status || 401).json({ error: "Entre na sua conta para jogar online.", code: error.code || "AUTH_REQUIRED" });
  }
  const rate = takeRateLimit(`room:${uid}`, { limit: Number(process.env.ROOM_RATE_LIMIT_PER_MIN) || 90 });
  if (!rate.ok) {
    res.setHeader("Retry-After", String(rate.retryAfter));
    return res.status(429).json({ error: "Muitos pedidos seguidos. Espere alguns segundos.", code: "RATE_LIMIT", retryAfter: rate.retryAfter });
  }
  const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  try {
    const data = await handleRoomAction(supabaseRest(), uid, body);
    return res.status(200).json(data);
  } catch (error) {
    if (!error.status || error.status >= 500) console.error("Erro na sala online:", error.message);
    return res.status(error.status || 500).json({ error: error.message || "Erro no modo online.", code: error.code || "ONLINE_ERROR" });
  }
}
