// ── Salas online (Supabase): regras puras, sem rede ──
// A campanha da sala é a mesma de sempre; cada jogador tem um personagem e a sua vez.

const clip = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I para não confundir
export const ROOM_MAX_PLAYERS = 6;
export const ROOM_CAMPAIGN_MAX_BYTES = 3_500_000;

export function newRoomCode(rnd = Math.random) {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += ROOM_CODE_CHARS[Math.floor(rnd() * ROOM_CODE_CHARS.length) % ROOM_CODE_CHARS.length];
  return code;
}

export const normalizeRoomCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
export const isRoomCode = (v) => /^[A-Z0-9]{6}$/.test(String(v || ""));

// Campos que são de cada aparelho e não vão para a sala.
const LOCAL_ONLY = ["saves", "roomId", "roomCode", "roomVersion", "roomMembers", "roomTurnUid", "roomOwnerUid", "party", "partyTurn", "updatedAt", "lastSaved", "autoMode"];

/** Campanha pronta para a sala: sem saves pessoais nem campos locais, com limite de tamanho. */
export function roomCampaignPayload(camp = {}) {
  const out = { ...camp };
  for (const k of LOCAL_ONLY) delete out[k];
  // Imagens embutidas (data:) pesam demais para sincronizar a cada jogada.
  for (const [k, v] of Object.entries(out)) if (typeof v === "string" && v.startsWith("data:") && v.length > 2000) delete out[k];
  let json = JSON.stringify(out);
  if (json.length > ROOM_CAMPAIGN_MAX_BYTES && Array.isArray(out.disp)) {
    // Histórias muito longas: a tela guarda as últimas 400 falas; a memória do Mestre guarda o resto.
    out.disp = out.disp.slice(-400);
    json = JSON.stringify(out);
  }
  if (json.length > ROOM_CAMPAIGN_MAX_BYTES && Array.isArray(out.msgs)) {
    out.msgs = out.msgs.slice(-200);
    out.memoryUntil = 0;
    json = JSON.stringify(out);
  }
  return json.length > ROOM_CAMPAIGN_MAX_BYTES ? null : out;
}

/** Próximo jogador na ordem dos assentos. */
export function nextTurnUid(members = [], currentUid = "") {
  const list = [...members].sort((a, b) => a.seat - b.seat);
  if (!list.length) return null;
  const i = list.findIndex((m) => m.uid === currentUid);
  return list[(i + 1) % list.length].uid;
}

export const cleanMember = (m = {}) => ({
  uid: String(m.uid || ""),
  name: clip(m.char_name ?? m.name, 60),
  concept: clip(m.char_concept ?? m.concept, 200),
  seat: Number(m.seat) || 0,
});

/**
 * Campos locais que fazem a sala virar "grupo" na campanha deste aparelho:
 * o dono é o personagem principal (charName); os outros entram em party, na ordem dos assentos.
 */
export function roomPartyFields(room = {}, members = []) {
  const list = members.map(cleanMember).sort((a, b) => a.seat - b.seat);
  const owner = list.find((m) => m.uid === room.owner_uid) || list[0];
  const others = list.filter((m) => m !== owner);
  const roster = [owner, ...others].filter(Boolean);
  const turnIndex = Math.max(0, roster.findIndex((m) => m.uid === room.turn_uid));
  return {
    roomId: room.id,
    roomCode: room.code,
    roomVersion: Number(room.version) || 1,
    roomOwnerUid: room.owner_uid,
    roomTurnUid: room.turn_uid || owner?.uid || "",
    roomMembers: roster,
    party: others.map((m) => ({ id: m.uid, name: m.name, concept: m.concept })),
    partyTurn: turnIndex,
  };
}

/** Quem joga agora numa sala (nome), para a tela. */
export function roomTurnName(camp = {}) {
  const who = (camp.roomMembers || []).find((m) => m.uid === camp.roomTurnUid);
  return who?.name || "";
}

export const isMyTurn = (camp = {}, uid = "") => !camp.roomId || !uid || camp.roomTurnUid === uid;

export function inviteLink(origin = "", code = "") {
  return `${String(origin || "").replace(/\/$/, "")}/?sala=${normalizeRoomCode(code)}`;
}
