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
const LOCAL_ONLY = ["saves", "roomSlots", "roomAway", "roomStoryRev", "roomArrivals", "roomLeftId", "roomLeftCode", "roomId", "roomCode", "roomVersion", "roomMembers", "roomTurnUid", "roomOwnerUid", "party", "partyTurn", "updatedAt", "lastSaved", "autoMode"];

// Ficha de cada personagem na mesa: só o próprio jogador vê e mexe (o Sistema inclusive).
export const ROOM_PERSONAL_FIELDS = [
  "charName", "charTitle", "charOriginTitle", "charSituation", "charSkills", "charBg", "charAge", "charInitialAge",
  "specialAbility", "systemSkills", "appearance", "appearanceCustomized", "charOutfit", "charAppearanceNote",
  "portraitSeed", "portraitUrl", "portraitStyle", "bodyChanges",
  "hp", "experience", "level", "attributes", "skills", "items", "gameSystem",
  "masterChat", "masterAgreements", "masterGuidance", "pendingMasterNote",
];
const ROOM_SHEET_MAX_BYTES = 400_000;

/** A ficha pessoal deste aparelho (para guardar na área privada do jogador). */
export function personalSheet(camp = {}) {
  const out = {};
  for (const k of ROOM_PERSONAL_FIELDS) if (camp[k] !== undefined) out[k] = camp[k];
  for (const [k, v] of Object.entries(out)) if (typeof v === "string" && v.startsWith("data:") && v.length > 2000) delete out[k];
  return out;
}

/** Ficha aceita pelo servidor: só campos pessoais e tamanho limitado. */
export function cleanSheet(sheet) {
  if (!sheet || typeof sheet !== "object" || Array.isArray(sheet)) return null;
  const out = personalSheet(sheet);
  return JSON.stringify(out).length > ROOM_SHEET_MAX_BYTES ? null : out;
}

/** Só a história (o que todos da mesa compartilham), sem a ficha de ninguém. */
export function withoutPersonal(camp = {}) {
  const out = { ...camp };
  const systemOn = Boolean(camp.gameSystem?.enabled) || Boolean(camp.systemOn);
  for (const k of ROOM_PERSONAL_FIELDS) delete out[k];
  if (systemOn) out.systemOn = true;
  return out;
}

/** Retrato aceito na mesa: só imagens geradas pelo próprio jogo. */
export const isPortraitUrl = (v) => typeof v === "string" && v.length <= 1500 && v.startsWith("https://image.pollinations.ai/prompt/");

/** Ficha inicial de quem acabou de entrar na mesa com um personagem novo. */
export function freshSheetFor(member = {}, { systemOn = false, defaultSystem = null } = {}) {
  return {
    charName: clip(member.name, 60),
    charTitle: clip(member.role, 80),
    charBg: clip(member.concept, 200),
    charAppearanceNote: clip(member.look, 200),
    portraitUrl: isPortraitUrl(member.photo) ? member.photo : "",
    hp: 100,
    experience: 0,
    level: 1,
    items: [],
    masterChat: [],
    ...(systemOn && defaultSystem ? { gameSystem: defaultSystem() } : {}),
  };
}

/** Campanha pronta para a sala: só a história, sem saves pessoais, fichas nem campos locais, com limite de tamanho. */
export function roomCampaignPayload(camp = {}) {
  const out = withoutPersonal(camp);
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
  const all = [...members].sort((a, b) => a.seat - b.seat);
  const present = all.filter((m) => m.active !== false);
  // Quem está na vez pode estar saindo agora: acha o próximo a partir do lugar dele.
  if (present.length && !present.some((m) => m.uid === currentUid)) {
    const seat = all.find((m) => m.uid === currentUid)?.seat ?? -1;
    return (present.find((m) => m.seat > seat) || present[0]).uid;
  }
  const list = present;
  if (!list.length) return null;
  const i = list.findIndex((m) => m.uid === currentUid);
  return list[(i + 1) % list.length].uid;
}

export const cleanMember = (m = {}) => {
  const photo = m.char_photo ?? m.photo;
  return {
    uid: String(m.uid || ""),
    name: clip(m.char_name ?? m.name, 60),
    concept: clip(m.char_concept ?? m.concept, 200),
    role: clip(m.char_role ?? m.role, 80),
    look: clip(m.char_look ?? m.look, 200),
    photo: isPortraitUrl(photo) ? photo : "",
    seat: Number(m.seat) || 0,
    active: m.active !== false,
  };
};

/** Nome comparável: sem acento, minúsculo, espaços simples ("Tom  Cárlos" = "tom carlos"). */
export const nameKey = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const ROOM_MAX_SLOTS = 8;

/** Vagas de personagem que o dono oferece: nome único, conceito e papel curtos. */
export function cleanSlots(list = [], { exclude = [] } = {}) {
  const taken = new Set(exclude.map(nameKey).filter(Boolean));
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const name = clip(raw?.name, 60);
    const key = nameKey(name);
    if (!key || taken.has(key)) continue;
    taken.add(key);
    out.push({ name, concept: clip(raw?.concept, 200), role: clip(raw?.role, 80), look: clip(raw?.look, 200), photo: isPortraitUrl(raw?.photo) ? raw.photo : "" });
    if (out.length >= ROOM_MAX_SLOTS) break;
  }
  return out;
}

/** Vagas que ainda ninguém pegou. */
export function freeSlots(slots = [], members = []) {
  const taken = new Set(members.map((m) => nameKey(m.name ?? m.char_name)));
  return (Array.isArray(slots) ? slots : []).filter((s) => !taken.has(nameKey(s.name)));
}

/** O personagem deste aparelho numa sala. */
export const myRoomMember = (camp = {}, uid = "") => (camp.roomMembers || []).find((m) => m.uid === uid) || null;

/**
 * Campos locais que fazem a sala virar "grupo" na campanha deste aparelho.
 * Cada aparelho é o personagem do próprio jogador (charName = o meu); os outros, dono incluído,
 * entram em party na ordem dos assentos. Sem myUid (aparelho do dono antigo), o dono é o principal.
 */
export function roomPartyFields(room = {}, members = [], myUid = "") {
  const everyone = members.map(cleanMember).sort((a, b) => a.seat - b.seat);
  // Na mesa (e na vez) só quem está presente; quem saiu fica guardado em roomAway.
  const list = everyone.filter((m) => m.active);
  const owner = list.find((m) => m.uid === room.owner_uid) || list[0];
  const me = list.find((m) => m.uid === myUid) || owner;
  const others = list.filter((m) => m !== me);
  const roster = [me, ...others].filter(Boolean);
  const turnIndex = Math.max(0, roster.findIndex((m) => m.uid === room.turn_uid));
  const fields = {
    roomId: room.id,
    roomCode: room.code,
    roomVersion: Number(room.version) || 1,
    roomStoryRev: room.story_rev != null ? Number(room.story_rev) || 1 : undefined,
    roomArrivals: Array.isArray(room.arrivals) ? room.arrivals.filter((a) => a && a.name).map((a) => ({ id: String(a.id), name: clip(a.name, 60), kind: ["chegou", "volta", "saiu"].includes(a.kind) ? a.kind : "chegou" })) : undefined,
    roomOwnerUid: room.owner_uid,
    roomTurnUid: room.turn_uid || owner?.uid || "",
    roomMembers: list,
    roomAway: everyone.filter((m) => !m.active).map((m) => ({ name: m.name, role: m.role, photo: m.photo })),
    roomSlots: Array.isArray(room.slots) ? room.slots : undefined,
    party: others.map((m) => ({ id: m.uid, name: m.name, concept: [m.role, m.concept].filter(Boolean).join(" — "), photo: m.photo })),
    partyTurn: turnIndex,
  };
  // Respostas curtas (jogada, vez) não trazem as vagas: mantém as que o aparelho já tem.
  if (fields.roomSlots === undefined) delete fields.roomSlots;
  if (fields.roomStoryRev === undefined) delete fields.roomStoryRev;
  if (fields.roomArrivals === undefined) delete fields.roomArrivals;
  return fields;
}

/** Retrato de um jogador da mesa pelo nome do personagem (para o chat e as listas). */
export function roomPhotoFor(camp = {}, name = "") {
  const key = nameKey(name);
  if (!key) return "";
  const m = (camp.roomMembers || []).find((x) => nameKey(x.name) === key);
  return m?.photo || "";
}

/** Quem joga depois de quem está na vez, pela ordem dos assentos. */
export function roomNextName(camp = {}) {
  const list = [...(camp.roomMembers || [])].sort((a, b) => a.seat - b.seat);
  if (list.length < 2) return "";
  const i = list.findIndex((m) => m.uid === camp.roomTurnUid);
  return list[(i + 1) % list.length]?.name || "";
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
