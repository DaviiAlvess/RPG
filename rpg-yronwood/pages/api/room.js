// pages/api/room.js — salas online no Supabase.
// O navegador nunca fala com o Supabase direto: esta rota confere o login Firebase do jogador,
// checa se ele é membro da sala (e se é a vez dele) e só então lê ou grava com a chave secreta.
import { bearerToken, takeRateLimit, verifyIdToken } from "../../lib/verify-id-token.mjs";
import { ROOM_MAX_PLAYERS, isRoomCode, newRoomCode, nextTurnUid, normalizeRoomCode, roomCampaignPayload, cleanMember } from "../../lib/rooms.mjs";

export const config = { maxDuration: 30, api: { bodyParser: { sizeLimit: "4mb" } } };

const DEFAULT_SUPABASE_URL = "https://yjcxmuybnehbnndvqfyk.supabase.co";
const clip = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

function httpError(status, message, code) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

// Endereço que respondeu por último (vale enquanto o servidor estiver quente).
let workingBase = "";

const hostOf = (base) => { try { return new URL(base).host; } catch { return String(base || "").slice(0, 80); } };
const netReason = (error) => error?.cause?.code || (error?.name === "TimeoutError" ? "sem resposta" : error?.message || "falha de rede");

/**
 * Cliente mínimo do PostgREST (REST do Supabase) com a chave secreta, só no servidor.
 * Ordem dos endereços: SUPABASE_URL, o projeto onde as salas foram criadas e, por último,
 * o NEXT_PUBLIC_SUPABASE_URL antigo. Se um endereço nem responde, tenta o próximo.
 */
export function supabaseRest(env = process.env, fetchImpl = fetch) {
  // Aceita também o link do painel ("supabase.com/dashboard/project/<ref>") e o converte no endereço da API.
  const clean = (v) => {
    const raw = String(v || "").trim().replace(/\/+$/, "");
    const ref = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{20})/i)?.[1];
    if (ref) return `https://${ref.toLowerCase()}.supabase.co`;
    if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw.toLowerCase()}.supabase.co`;
    return raw.replace(/\/rest\/v1$/, "");
  };
  const bases = [...new Set([clean(env.SUPABASE_URL), DEFAULT_SUPABASE_URL, clean(env.NEXT_PUBLIC_SUPABASE_URL)].filter((b) => /^https:\/\//.test(b)))];
  const key = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!key) throw httpError(503, "O modo online ainda não foi ligado no servidor (falta SUPABASE_SECRET_KEY na Vercel).", "ONLINE_NOT_CONFIGURED");
  const headers = { apikey: key, "Content-Type": "application/json" };
  // Chave antiga (JWT "eyJ...") também precisa ir no Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  const tried = [];
  let usedHost = "";
  const call = async (path, { method = "GET", body, prefer } = {}) => {
    const order = bases.includes(workingBase) ? [workingBase, ...bases.filter((b) => b !== workingBase)] : bases;
    let lastError = null;
    for (const base of order) {
      let res;
      try {
        res = await fetchImpl(`${base}/rest/v1/${path}`, {
          method,
          headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (error) {
        lastError = error;
        tried.push({ host: hostOf(base), error: netReason(error) });
        continue;
      }
      const text = await res.text();
      let data = null;
      let isJson = true;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; isJson = false; }
      // Página HTML no lugar da API: endereço errado, tenta o próximo.
      if (!res.ok && !isJson) {
        lastError = new Error(`respondeu ${res.status} sem ser a API`);
        tried.push({ host: hostOf(base), error: `respondeu ${res.status} sem ser a API` });
        continue;
      }
      workingBase = base;
      usedHost = hostOf(base);
      if (!res.ok) {
        const msg = data?.message || data?.error || `Supabase respondeu ${res.status}`;
        throw httpError(res.status === 409 ? 409 : 502, msg, res.status === 409 ? "CONFLICT" : "ONLINE_ERROR");
      }
      return data;
    }
    const where = tried.map((t) => `${t.host}: ${t.error}`).join("; ");
    throw httpError(502, `O servidor não conseguiu alcançar o Supabase (${where || netReason(lastError)}).`, "ONLINE_UNREACHABLE");
  };
  return {
    select: (table, query) => call(`${table}?${query}`),
    insert: (table, row) => call(table, { method: "POST", body: row, prefer: "return=representation" }),
    update: (table, query, patch) => call(`${table}?${query}`, { method: "PATCH", body: patch, prefer: "return=representation" }),
    remove: (table, query) => call(`${table}?${query}`, { method: "DELETE", prefer: "return=representation" }),
    info: () => ({ host: usedHost, tried: [...tried], candidates: bases.map(hostOf) }),
  };
}

const eq = (v) => `eq.${encodeURIComponent(String(v))}`;
const ROOM_FIELDS = "id,code,owner_uid,title,version,turn_uid,status,updated_at";

async function loadMembers(db, roomId) {
  return (await db.select("rpg_room_members", `room_id=${eq(roomId)}&select=uid,char_name,char_concept,seat&order=seat.asc`)) || [];
}

async function loadRoom(db, roomId, { withCampaign = true } = {}) {
  const rows = await db.select("rpg_rooms", `id=${eq(roomId)}&select=${withCampaign ? `${ROOM_FIELDS},campaign` : ROOM_FIELDS}`);
  const room = rows?.[0];
  if (!room) throw httpError(404, "Sala não encontrada.", "ROOM_NOT_FOUND");
  return room;
}

function requireMember(members, uid) {
  const me = members.find((m) => m.uid === uid);
  if (!me) throw httpError(403, "Você não está nesta sala.", "NOT_MEMBER");
  return me;
}

const view = (room, members) => ({ room: { ...room, campaign: room.campaign ?? undefined }, members: members.map(cleanMember) });

export async function handleRoomAction(db, uid, body = {}) {
  const action = String(body.action || "");
  const now = new Date().toISOString();

  if (action === "create") {
    const campaign = roomCampaignPayload(body.campaign || {});
    if (!campaign) throw httpError(413, "Esta campanha está grande demais para virar sala online.", "TOO_LARGE");
    const charName = clip(body.charName || campaign.charName, 60) || "Jogador 1";
    let room = null;
    for (let i = 0; i < 5 && !room; i += 1) {
      try {
        [room] = await db.insert("rpg_rooms", { code: newRoomCode(), owner_uid: uid, title: clip(body.title || campaign.world, 160), campaign, turn_uid: uid });
      } catch (e) {
        if (e.code !== "CONFLICT") throw e; // código repetido: tenta outro
      }
    }
    if (!room) throw httpError(503, "Não foi possível criar a sala agora.", "ONLINE_ERROR");
    await db.insert("rpg_room_members", { room_id: room.id, uid, char_name: charName, char_concept: clip(body.charConcept || campaign.charTitle, 200), seat: 0 });
    return view(room, await loadMembers(db, room.id));
  }

  if (action === "join") {
    const code = normalizeRoomCode(body.code);
    if (!isRoomCode(code)) throw httpError(400, "Código de sala inválido.", "BAD_CODE");
    const [found] = (await db.select("rpg_rooms", `code=${eq(code)}&select=${ROOM_FIELDS},campaign`)) || [];
    if (!found || found.status !== "open") throw httpError(404, "Sala não encontrada ou fechada.", "ROOM_NOT_FOUND");
    let members = await loadMembers(db, found.id);
    if (!members.some((m) => m.uid === uid)) {
      if (members.length >= ROOM_MAX_PLAYERS) throw httpError(409, `A sala já tem ${ROOM_MAX_PLAYERS} jogadores.`, "ROOM_FULL");
      const charName = clip(body.charName, 60);
      if (!charName) throw httpError(400, "Escolha o nome do seu personagem.", "NAME_REQUIRED");
      const seat = Math.max(-1, ...members.map((m) => m.seat)) + 1;
      await db.insert("rpg_room_members", { room_id: found.id, uid, char_name: charName, char_concept: clip(body.charConcept, 200), seat });
      // Avisa a mesa que alguém chegou (sobe a versão; ninguém perde jogada).
      await db.update("rpg_rooms", `id=${eq(found.id)}`, { version: found.version + 1, updated_at: now });
      found.version += 1;
      members = await loadMembers(db, found.id);
    }
    return view(found, members);
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
    return view(await loadRoom(db, roomId), members);
  }

  if (action === "push") {
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    const room = await loadRoom(db, roomId, { withCampaign: false });
    if (room.status !== "open") throw httpError(409, "A sala foi fechada.", "ROOM_CLOSED");
    if (room.turn_uid && room.turn_uid !== uid) throw httpError(409, "Não é a sua vez.", "NOT_YOUR_TURN");
    const base = Number(body.baseVersion) || 0;
    if (base !== room.version) throw httpError(409, "A mesa mudou enquanto você jogava.", "VERSION_CONFLICT");
    const campaign = roomCampaignPayload(body.campaign || {});
    if (!campaign) throw httpError(413, "A campanha ficou grande demais para sincronizar.", "TOO_LARGE");
    const turn = body.keepTurn ? uid : nextTurnUid(members, uid);
    // Só grava se a versão ainda for a mesma (dois aparelhos ao mesmo tempo: o segundo recebe conflito).
    const rows = await db.update("rpg_rooms", `id=${eq(roomId)}&version=${eq(base)}`, { campaign, version: base + 1, turn_uid: turn, updated_at: now });
    if (!rows?.length) throw httpError(409, "A mesa mudou enquanto você jogava.", "VERSION_CONFLICT");
    return { room: { id: roomId, version: base + 1, turn_uid: turn, status: "open" }, members: members.map(cleanMember) };
  }

  if (action === "setTurn") {
    const members = await loadMembers(db, roomId);
    requireMember(members, uid);
    const room = await loadRoom(db, roomId, { withCampaign: false });
    if (room.owner_uid !== uid) throw httpError(403, "Só quem criou a sala escolhe a vez.", "OWNER_ONLY");
    const target = String(body.turnUid || "");
    if (!members.some((m) => m.uid === target)) throw httpError(400, "Jogador não está na sala.", "NOT_MEMBER");
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
    await db.remove("rpg_room_members", `room_id=${eq(roomId)}&uid=${eq(uid)}`);
    const rest = members.filter((m) => m.uid !== uid);
    const turn = room.turn_uid === uid ? nextTurnUid(members, uid) : room.turn_uid;
    await db.update("rpg_rooms", `id=${eq(roomId)}`, { turn_uid: turn && rest.some((m) => m.uid === turn) ? turn : room.owner_uid, version: room.version + 1, updated_at: now });
    return { left: true };
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
