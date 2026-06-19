/** Remove undefined e normaliza valores para o Firestore */
export function sanitizeForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      const clean = sanitizeForFirestore(val);
      if (clean !== undefined) out[key] = clean;
    }
    return out;
  }
  return String(value);
}

const MAX_CHAT_MESSAGES = 150;

export function prepareCampaignForFirestore(campaign) {
  const copy = { ...campaign };
  if (Array.isArray(copy.msgs) && copy.msgs.length > MAX_CHAT_MESSAGES) {
    copy.msgs = copy.msgs.slice(-MAX_CHAT_MESSAGES);
  }
  if (Array.isArray(copy.disp) && copy.disp.length > MAX_CHAT_MESSAGES) {
    copy.disp = copy.disp.slice(-MAX_CHAT_MESSAGES);
  }
  if (Array.isArray(copy.saves)) {
    copy.saves = copy.saves.slice(-20).map((slot) => ({
      ...slot,
      msgs: Array.isArray(slot.msgs) ? slot.msgs.slice(-40) : [],
      disp: Array.isArray(slot.disp) ? slot.disp.slice(-40) : [],
    }));
  }
  return sanitizeForFirestore(copy);
}
