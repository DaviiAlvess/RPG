import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const KEY_ENV_NAMES = [
  "GEMINI_API_KEY_1",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4",
  "GEMINI_API_KEY_5",
  "GEMINI_API_KEY_6",
  "GEMINI_API_KEY_7",
  "GEMINI_API_KEY",
  "GEMINI_KEY_1",
  "GEMINI_KEY_2",
  "GEMINI_KEY_3",
  "GEMINI_KEY_4",
  "GEMINI_KEY_5",
  "GEMINI_KEY_6",
  "GEMINI_KEY_7",
  "GEMINI_KEY",
];

const DEFAULT_DAILY_BUDGET = 250_000;
const DEFAULT_COOLDOWN_MS = 90_000;
const MAX_COOLDOWN_MS = 15 * 60 * 1000;
const STATE_FILE = join(tmpdir(), `rpg-gemini-keys-${process.pid}.json`);

let records = new Map();

function fingerprint(key) {
  return createHash("sha256").update(String(key)).digest("hex").slice(0, 24);
}

function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function nextUtcMidnight(now = Date.now()) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

function emptyRecord(now = Date.now()) {
  return {
    tokensUsed: 0,
    day: utcDay(now),
    last429At: 0,
    cooldownUntil: 0,
    requestCount: 0,
    lastUsedAt: 0,
  };
}

function loadFile() {
  try {
    const raw = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    const keys = raw?.keys;
    if (!keys || typeof keys !== "object") return;
    for (const [id, rec] of Object.entries(keys)) {
      if (!rec || typeof rec !== "object") continue;
      records.set(id, {
        tokensUsed: Math.max(0, Math.floor(Number(rec.tokensUsed) || 0)),
        day: typeof rec.day === "string" ? rec.day : utcDay(),
        last429At: Number(rec.last429At) || 0,
        cooldownUntil: Number(rec.cooldownUntil) || 0,
        requestCount: Math.max(0, Math.floor(Number(rec.requestCount) || 0)),
        lastUsedAt: Number(rec.lastUsedAt) || 0,
      });
    }
  } catch {}
}

function persist() {
  try {
    const keys = {};
    for (const [id, rec] of records) keys[id] = rec;
    writeFileSync(STATE_FILE, JSON.stringify({ keys }));
  } catch {}
}

function rollDay(rec, now) {
  const today = utcDay(now);
  if (rec.day === today) return rec;
  rec.tokensUsed = 0;
  rec.day = today;
  return rec;
}

function getRecord(key, now = Date.now()) {
  const id = fingerprint(key);
  let rec = records.get(id);
  if (!rec) {
    rec = emptyRecord(now);
    records.set(id, rec);
    return rec;
  }
  const before = rec.day;
  rollDay(rec, now);
  if (rec.day !== before) persist();
  return rec;
}

loadFile();

export function dailyTokenBudget(env = process.env) {
  const n = Number(env.GEMINI_KEY_TOKEN_BUDGET);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_BUDGET;
}

export function collectGeminiKeys(env = process.env) {
  return [...new Set(KEY_ENV_NAMES.map(name => env[name]).filter(Boolean))];
}

export function parseUsageTokens(data) {
  const usage = data?.usageMetadata;
  if (!usage || typeof usage !== "object") return 0;
  const total = Number(usage.totalTokenCount);
  if (Number.isFinite(total) && total > 0) return Math.floor(total);
  const prompt = Number(usage.promptTokenCount) || 0;
  const candidates = Number(usage.candidatesTokenCount) || 0;
  const thoughts = Number(usage.thoughtsTokenCount) || 0;
  const sum = prompt + candidates + thoughts;
  return Number.isFinite(sum) && sum > 0 ? Math.floor(sum) : 0;
}

export function cooldownMsFromRetryAfter(retryAfter, now = Date.now()) {
  if (retryAfter == null || retryAfter === "") return DEFAULT_COOLDOWN_MS;
  const asNum = Number(retryAfter);
  if (Number.isFinite(asNum) && asNum > 0) {
    return Math.min(MAX_COOLDOWN_MS, Math.max(1000, asNum * 1000));
  }
  const parsed = Date.parse(String(retryAfter));
  if (!Number.isNaN(parsed)) return Math.min(MAX_COOLDOWN_MS, Math.max(1000, parsed - now));
  return DEFAULT_COOLDOWN_MS;
}

export function recordKeyUsage(key, tokens, now = Date.now()) {
  const rec = getRecord(key, now);
  rec.tokensUsed += Math.max(0, Math.floor(Number(tokens) || 0));
  rec.requestCount += 1;
  rec.lastUsedAt = now;
  persist();
  return { ...rec };
}

export function markGeminiKeyExhausted(key, retryAfter, now = Date.now()) {
  const rec = getRecord(key, now);
  rec.last429At = now;
  rec.cooldownUntil = now + cooldownMsFromRetryAfter(retryAfter, now);
  persist();
  return { ...rec };
}

export function isGeminiKeyHealthy(key, now = Date.now()) {
  const rec = getRecord(key, now);
  if (rec.cooldownUntil > now) return false;
  if (rec.tokensUsed >= dailyTokenBudget()) {
    rec.cooldownUntil = Math.max(rec.cooldownUntil, nextUtcMidnight(now));
    persist();
    return false;
  }
  return true;
}

export function nextGeminiKey(keys, now = Date.now()) {
  const list = Array.isArray(keys) ? keys.filter(Boolean) : [];
  if (!list.length) {
    return { key: null, waitMs: 0, allResting: true, retryAfterSec: 1 };
  }

  const healthy = list.filter(key => isGeminiKeyHealthy(key, now));
  if (healthy.length) {
    healthy.sort((a, b) => {
      const left = getRecord(a, now);
      const right = getRecord(b, now);
      if (left.tokensUsed !== right.tokensUsed) return left.tokensUsed - right.tokensUsed;
      if (left.lastUsedAt !== right.lastUsedAt) return left.lastUsedAt - right.lastUsedAt;
      return list.indexOf(a) - list.indexOf(b);
    });
    return { key: healthy[0], waitMs: 0, allResting: false, retryAfterSec: 0 };
  }

  let soonest = { key: list[0], until: Infinity };
  for (const key of list) {
    const rec = getRecord(key, now);
    const until = rec.cooldownUntil > now ? rec.cooldownUntil : nextUtcMidnight(now);
    if (until < soonest.until) soonest = { key, until };
  }
  const waitMs = Math.max(0, soonest.until - now);
  return {
    key: soonest.key,
    waitMs,
    allResting: true,
    retryAfterSec: Math.max(1, Math.ceil(waitMs / 1000)),
  };
}

export function geminiKeysAllRestingError(retryAfterSec) {
  const sec = Math.max(1, Math.floor(Number(retryAfterSec) || 1));
  const error = new Error(`Todas as chaves Gemini estão no limite agora. Tente em ${sec} segundos.`);
  error.status = 429;
  error.code = "RATE_LIMIT";
  error.retryAfter = sec;
  return error;
}

export function getGeminiKeyRecord(key, now = Date.now()) {
  return { ...getRecord(key, now) };
}

export function resetGeminiKeyState() {
  records = new Map();
  try { unlinkSync(STATE_FILE); } catch {}
}
