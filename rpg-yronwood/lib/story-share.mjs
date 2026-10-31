// ─── Histórias da comunidade ──────────────────────────────────────────
// Transforma uma campanha em modelo reutilizável e em link compartilhável.
// O link leva os dados no #hash (não passa pelo servidor). Os bastidores do Mestre vão junto,
// porque sem eles a história perde a verdade escondida; quem abre o link joga, não lê.

import { asPlotList } from "./plots.mjs";
import { normalizeGmBrief } from "./gm-brief.mjs";

const TEXT_FIELDS = {
  world: 120, worldBg: 2000, charName: 80, charTitle: 160, charAge: 10, charBg: 1500,
  charPersonality: 800, charSkills: 600, supportingCast: 1500, storyStartPoint: 1500,
  charAppearanceNote: 600, charOutfit: 300, genre: 60, hook: 200, tone: 30, gameStyle: 30,
  portraitStyle: 20, author: 60,
};
const BOOL_FIELDS = ["isKnownIP", "ordinaryCharacter", "useImages"];
const ATTITUDES = ["Hostil", "Suspeito", "Neutral", "Amigável"];

const str = (v, max) => String(v ?? "").slice(0, max);
const safeKey = (k) => String(k).replace(/[.#$[\]/]/g, " ").trim().slice(0, 60);

function cleanObject(obj, maxEntries, maxLen, allowed) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj).slice(0, maxEntries)) {
    const key = safeKey(k);
    if (!key || ["__proto__", "constructor", "prototype"].includes(key)) continue;
    const value = str(v, maxLen);
    if (allowed && !allowed.includes(value)) continue;
    if (value) out[key] = value;
  }
  return out;
}

/** Normaliza qualquer objeto (campanha, preset ou link decodificado) num modelo seguro. */
export function sanitizeTemplate(src = {}) {
  if (!src || typeof src !== "object") return null;
  const t = {};
  for (const [k, max] of Object.entries(TEXT_FIELDS)) if (src[k] != null) t[k] = str(src[k], max).trim();
  for (const k of BOOL_FIELDS) if (src[k] != null) t[k] = Boolean(src[k]);
  if (!t.world || !t.charName) return null;
  t.relationships = cleanObject(src.relationships, 12, 20, ATTITUDES);
  const ws = src.worldState || {};
  t.worldState = { location: str(ws.location, 200), npcs: cleanObject(ws.npcs, 12, 500) };
  t.plots = asPlotList(src.plots).slice(0, 5).map(({ title, hook }) => ({ title, hook }));
  if (src.narration && typeof src.narration === "object") {
    t.narration = cleanObject(src.narration, 5, 30);
  }
  if (src.appearance && typeof src.appearance === "object") t.appearance = cleanObject(src.appearance, 15, 40);
  if (src.specialAbility && typeof src.specialAbility === "object") {
    const a = src.specialAbility;
    t.specialAbility = { enabled: Boolean(a.enabled), name: str(a.name, 80), description: str(a.description, 600), limits: str(a.limits, 400), secret: a.secret !== false };
  }
  const brief = normalizeGmBrief(src.gmBrief);
  if (brief) t.gmBrief = brief;
  return t;
}

/** Campanha em andamento → modelo de início (sem progresso, inventário nem memória). */
export function campaignToTemplate(camp = {}, author = "") {
  const t = sanitizeTemplate({
    ...camp,
    plots: asPlotList(camp.plots).filter((p) => p.status !== "encerrada"),
    author: author || camp.author || "",
    hook: camp.hook || String(camp.storyStartPoint || "").slice(0, 180),
    genre: camp.genre || "Criada pela comunidade",
  });
  if (!t) return null;
  return { ...t, id: `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString() };
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code) {
  const b64 = String(code).replace(/-/g, "+").replace(/_/g, "/");
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeTemplate(template) {
  const t = sanitizeTemplate(template);
  if (!t) return "";
  return toBase64Url(JSON.stringify({ v: 1, t }));
}

export function decodeTemplate(code) {
  try {
    if (!code || code.length > 60000) return null;
    const parsed = JSON.parse(fromBase64Url(code));
    if (!parsed || parsed.v !== 1) return null;
    const t = sanitizeTemplate(parsed.t);
    return t ? { ...t, id: `link-${toBase64Url(t.charName + t.world).slice(0, 12)}`, shared: true } : null;
  } catch {
    return null;
  }
}

export function shareUrl(template, origin) {
  const code = encodeTemplate(template);
  return code ? `${origin.replace(/\/$/, "")}/#historia=${code}` : "";
}

export function readSharedFromHash(hash) {
  const m = String(hash || "").match(/historia=([A-Za-z0-9_-]+)/);
  return m ? decodeTemplate(m[1]) : null;
}
