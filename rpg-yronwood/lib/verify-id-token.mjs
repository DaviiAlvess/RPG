// ─── Verificação do login (Firebase ID token) no servidor ─────────────
// Sem firebase-admin: confere a assinatura RS256 com as chaves públicas do Google
// e as regras do Firebase (aud, iss, exp, iat, sub). Assim só quem está logado
// no app consegue usar as chaves do Gemini.

import { createPublicKey, createVerify } from "node:crypto";

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CLOCK_SKEW_S = 300;

let certCache = { keys: null, expiresAt: 0 };

function b64urlToBuffer(part) {
  return Buffer.from(String(part).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function authError(message, code = "AUTH_REQUIRED") {
  const error = new Error(message);
  error.status = 401;
  error.code = code;
  return error;
}

/** Busca (e guarda em cache) as chaves públicas que assinam os tokens do Firebase. */
export async function fetchFirebaseCerts(fetchImpl = fetch, now = Date.now()) {
  if (certCache.keys && now < certCache.expiresAt) return certCache.keys;
  const res = await fetchImpl(CERTS_URL);
  if (!res.ok) throw authError("Não foi possível validar o login agora. Tente de novo em instantes.", "AUTH_UNAVAILABLE");
  const keys = await res.json();
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers?.get?.("cache-control") || "")?.[1]) || 3600;
  certCache = { keys, expiresAt: now + maxAge * 1000 };
  return keys;
}

export function resetCertCacheForTests() {
  certCache = { keys: null, expiresAt: 0 };
}

/**
 * Valida o token e devolve { uid, email }. Lança erro 401 se for inválido.
 * `getKeys` pode ser injetado nos testes; deve devolver { kid: chave PEM (certificado ou pública) }.
 */
export async function verifyIdToken(token, { projectId, getKeys = fetchFirebaseCerts, now = Date.now() } = {}) {
  if (!projectId) throw authError("Projeto Firebase não configurado no servidor.", "AUTH_UNAVAILABLE");
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw authError("Faça login para falar com o Mestre.");

  let header;
  let payload;
  try {
    header = JSON.parse(b64urlToBuffer(parts[0]).toString("utf8"));
    payload = JSON.parse(b64urlToBuffer(parts[1]).toString("utf8"));
  } catch {
    throw authError("Login inválido. Entre de novo na sua conta.", "AUTH_INVALID");
  }
  if (header.alg !== "RS256" || !header.kid) throw authError("Login inválido. Entre de novo na sua conta.", "AUTH_INVALID");

  const keys = await getKeys();
  const pem = keys?.[header.kid];
  if (!pem) throw authError("Sua sessão expirou. Entre de novo na sua conta.", "AUTH_EXPIRED");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  const ok = verifier.verify(createPublicKey(pem), b64urlToBuffer(parts[2]));
  if (!ok) throw authError("Login inválido. Entre de novo na sua conta.", "AUTH_INVALID");

  const nowS = Math.floor(now / 1000);
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw authError("Login de outro projeto. Entre de novo na sua conta.", "AUTH_INVALID");
  }
  if (typeof payload.exp !== "number" || payload.exp + CLOCK_SKEW_S < nowS) throw authError("Sua sessão expirou. Entre de novo na sua conta.", "AUTH_EXPIRED");
  if (typeof payload.iat === "number" && payload.iat - CLOCK_SKEW_S > nowS) throw authError("Login inválido. Entre de novo na sua conta.", "AUTH_INVALID");
  if (!payload.sub || typeof payload.sub !== "string" || payload.sub.length > 128) throw authError("Login inválido. Entre de novo na sua conta.", "AUTH_INVALID");

  return { uid: payload.sub, email: payload.email || "" };
}

export function bearerToken(req) {
  const raw = req?.headers?.authorization || req?.headers?.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return m ? m[1].trim() : "";
}

// ── Limite de uso por conta (melhor esforço: memória da instância) ──
const buckets = new Map();

/** Janela deslizante: no máximo `limit` pedidos por `windowMs` para cada uid. */
export function takeRateLimit(uid, { limit = 30, windowMs = 60000, now = Date.now() } = {}) {
  const list = (buckets.get(uid) || []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    buckets.set(uid, list);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - list[0])) / 1000)) };
  }
  list.push(now);
  buckets.set(uid, list);
  if (buckets.size > 5000) buckets.delete(buckets.keys().next().value);
  return { ok: true, retryAfter: 0 };
}

export function resetRateLimitForTests() {
  buckets.clear();
}
