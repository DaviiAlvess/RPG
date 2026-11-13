// lib/user-saves.mjs — saves de cada jogador no Supabase (segunda nuvem).
// Roda só no servidor. Toda leitura e gravação leva o uid já verificado do token do Firebase,
// então um jogador nunca alcança a campanha de outro.
import zlib from "node:zlib";
import { httpError } from "./supabase-rest.mjs";

export const SAVES_TABLE = "rpg_user_saves";
export const MAX_CAMPAIGNS_PER_USER = 40;
// Texto da campanha guardado no banco (depois de descompactar).
export const MAX_STORED_BYTES = 6 * 1024 * 1024;
// Teto do que aceitamos descompactar, para um envio malicioso não estourar a memória.
const MAX_INFLATED_BYTES = 24 * 1024 * 1024;
// Acima disso a resposta de "abrir" vai compactada (a Vercel limita a resposta a ~4,5 MB).
const GZIP_RESPONSE_FROM = 512 * 1024;

const clip = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const eq = (v) => `eq.${encodeURIComponent(String(v))}`;

export function cleanCampaignId(value) {
  const id = String(value ?? "").trim();
  if (!id || id.length > 200 || /[\u0000-\u001f\u007f]/.test(id)) return "";
  return id;
}

function isoOrNull(value) {
  const ms = typeof value === "number" ? value : Date.parse(value ?? "");
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
}

/**
 * Cabe no banco? Se não couber, tira primeiro os saves manuais mais antigos,
 * depois encurta o histórico da tela. Devolve null se nem assim couber.
 */
export function fitCampaignForStore(campaign, limit = MAX_STORED_BYTES) {
  let out = { ...campaign };
  let json = JSON.stringify(out);
  let trimmed = false;
  if (json.length > limit && Array.isArray(out.saves) && out.saves.length) {
    const saves = [...out.saves];
    while (saves.length && json.length > limit) {
      saves.shift();
      out = { ...out, saves: [...saves] };
      json = JSON.stringify(out);
      trimmed = true;
    }
  }
  if (json.length > limit && Array.isArray(out.disp) && out.disp.length > 400) {
    out = { ...out, disp: out.disp.slice(-400) };
    json = JSON.stringify(out);
    trimmed = true;
  }
  if (json.length > limit) return null;
  return { campaign: out, json, trimmed };
}

/** Lê a campanha enviada: compactada (gz em base64) ou como objeto. */
export function readIncomingCampaign(body = {}) {
  let text = "";
  if (typeof body.gz === "string" && body.gz) {
    try {
      text = zlib.gunzipSync(Buffer.from(body.gz, "base64"), { maxOutputLength: MAX_INFLATED_BYTES }).toString("utf8");
    } catch (error) {
      if (error?.code === "ERR_BUFFER_TOO_LARGE" || error instanceof RangeError) throw httpError(413, "A campanha está grande demais para a nuvem.", "TOO_LARGE");
      throw httpError(400, "Não deu para ler a campanha enviada.", "BAD_DATA");
    }
  } else if (body.campaign && typeof body.campaign === "object" && !Array.isArray(body.campaign)) {
    return body.campaign;
  } else {
    throw httpError(400, "Nenhuma campanha enviada.", "BAD_DATA");
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw httpError(400, "Não deu para ler a campanha enviada.", "BAD_DATA"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw httpError(400, "Campanha inválida.", "BAD_DATA");
  return parsed;
}

/** Resposta de "abrir": compactada quando é grande e o aparelho sabe descompactar. */
export function packCampaign(data, acceptGz) {
  const json = JSON.stringify(data ?? null);
  if (acceptGz && json.length >= GZIP_RESPONSE_FROM) {
    return { gz: zlib.gzipSync(Buffer.from(json, "utf8")).toString("base64") };
  }
  return { data };
}

export async function handleSavesAction(db, uid, body = {}, now = () => new Date()) {
  if (!uid) throw httpError(401, "Entre na sua conta.", "AUTH_REQUIRED");
  const action = String(body.action || "");
  const mine = `uid=${eq(uid)}`;

  if (action === "ping") {
    const rows = (await db.select(SAVES_TABLE, `select=campaign_id&${mine}&limit=${MAX_CAMPAIGNS_PER_USER + 1}`)) || [];
    return { ok: true, count: rows.length };
  }

  if (action === "list") {
    const rows = (await db.select(SAVES_TABLE, `select=campaign_id,world,char_name,client_updated_at,created_at,data_bytes&${mine}&order=client_updated_at.desc&limit=100`)) || [];
    return {
      ok: true,
      items: rows.map((r) => ({ id: r.campaign_id, world: r.world, charName: r.char_name, updatedAt: r.client_updated_at, createdAt: r.created_at, bytes: r.data_bytes })),
    };
  }

  const id = cleanCampaignId(body.id);
  if (!id) throw httpError(400, "Campanha sem identificação.", "BAD_ID");
  const one = `${mine}&campaign_id=${eq(id)}`;

  if (action === "load") {
    const rows = (await db.select(SAVES_TABLE, `select=data,client_updated_at&${one}&limit=1`)) || [];
    if (!rows.length) throw httpError(404, "Campanha não encontrada nesta nuvem.", "NOT_FOUND");
    return { ok: true, updatedAt: rows[0].client_updated_at, ...packCampaign(rows[0].data, Boolean(body.acceptGz)) };
  }

  if (action === "remove") {
    await db.remove(SAVES_TABLE, one);
    return { ok: true };
  }

  if (action === "save") {
    const incoming = readIncomingCampaign(body);
    const fit = fitCampaignForStore({ ...incoming, id });
    if (!fit) throw httpError(413, "A campanha está grande demais para a nuvem.", "TOO_LARGE");
    const updatedAt = isoOrNull(fit.campaign.updatedAt) || isoOrNull(body.updatedAt) || now().toISOString();
    const existing = (await db.select(SAVES_TABLE, `select=client_updated_at&${one}&limit=1`)) || [];
    if (existing.length) {
      // Nunca troca uma versão mais nova (de outro aparelho) por uma mais velha.
      if (Date.parse(existing[0].client_updated_at) > Date.parse(updatedAt)) {
        return { ok: false, conflict: true, updatedAt: existing[0].client_updated_at, error: "Existe uma versão mais nova desta história na nuvem. Reabra a campanha para recuperá-la." };
      }
    } else {
      const count = (await db.select(SAVES_TABLE, `select=campaign_id&${mine}&limit=${MAX_CAMPAIGNS_PER_USER}`)) || [];
      if (count.length >= MAX_CAMPAIGNS_PER_USER) throw httpError(409, `Sua nuvem já tem ${MAX_CAMPAIGNS_PER_USER} histórias. Apague alguma para salvar outra.`, "LIMIT");
    }
    await db.upsert(SAVES_TABLE, {
      uid,
      campaign_id: id,
      world: clip(fit.campaign.world, 200),
      char_name: clip(fit.campaign.charName, 120),
      data: fit.campaign,
      data_bytes: fit.json.length,
      client_updated_at: updatedAt,
      updated_at: now().toISOString(),
    }, "uid,campaign_id");
    return { ok: true, updatedAt, bytes: fit.json.length, trimmed: fit.trimmed };
  }

  throw httpError(400, "Ação desconhecida.", "BAD_ACTION");
}
