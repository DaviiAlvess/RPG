const RTDB_ILLEGAL_KEY = new RegExp("[.#$\\[\\]/]", "g");
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function sanitizeRtdbKey(key) {
  const cleaned = String(key ?? "").replace(RTDB_ILLEGAL_KEY, "_").trim();
  if (!cleaned || BLOCKED_KEYS.has(cleaned)) return "_";
  return cleaned.slice(0, 768);
}

export function campaignTimeMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const ms = Date.parse(value ?? "");
  return Number.isFinite(ms) ? ms : 0;
}

/** True when the node already has a strictly newer updatedAt than the payload. */
export function cloudWriteIsStale(current, incoming) {
  if (current == null) return false;
  return campaignTimeMs(current.updatedAt) > campaignTimeMs(incoming?.updatedAt);
}

export function interpretSaveTransaction({ committed, staleWrite }) {
  if (committed) return { ok: true };
  if (staleWrite) {
    return {
      ok: false,
      conflict: true,
      error: "Existe uma versão mais recente na nuvem. Reabra a campanha para recuperá-la.",
    };
  }
  return { ok: false, error: "Não foi possível salvar na nuvem agora. Tente novamente." };
}

/** Remove undefined e normaliza valores para o Realtime Database */
export function sanitizeForRtdb(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForRtdb(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      const clean = sanitizeForRtdb(val);
      if (clean === undefined) continue;
      out[sanitizeRtdbKey(key)] = clean;
    }
    return out;
  }
  return String(value);
}

export function prepareCampaignForRtdb(campaign) {
  const copy = { ...campaign };
  const title = String(copy.charTitle || "").trim();
  if (!String(copy.charOriginTitle || "").trim() && title) copy.charOriginTitle = title;
  // Keep the archive intact: memoryUntil refers to positions in this history.
  // Only the context sent to the narrator is compacted, never the player's save.
  if (Array.isArray(copy.saves)) {
    copy.saves = copy.saves.slice(-20).map((slot) => ({
      ...slot,
      msgs: Array.isArray(slot.msgs) ? slot.msgs : [],
      disp: Array.isArray(slot.disp) ? slot.disp : [],
    }));
  }
  return sanitizeForRtdb(copy);
}
