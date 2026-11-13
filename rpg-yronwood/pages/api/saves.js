// pages/api/saves.js — saves de cada jogador no Supabase.
// O navegador nunca fala com o Supabase direto: esta rota confere o login Firebase do jogador
// e só lê ou grava as campanhas dele (filtradas pelo uid verificado), com a chave secreta.
import { bearerToken, takeRateLimit, verifyIdToken } from "../../lib/verify-id-token.mjs";
import { supabaseRest } from "../../lib/supabase-rest.mjs";
import { handleSavesAction } from "../../lib/user-saves.mjs";

export const config = { maxDuration: 30, api: { bodyParser: { sizeLimit: "4mb" } } };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  let uid;
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "siterpg32";
    ({ uid } = await verifyIdToken(bearerToken(req), { projectId }));
  } catch (error) {
    return res.status(error.status || 401).json({ error: "Entre na sua conta para salvar na nuvem.", code: error.code || "AUTH_REQUIRED" });
  }
  const rate = takeRateLimit(`saves:${uid}`, { limit: Number(process.env.SAVES_RATE_LIMIT_PER_MIN) || 120 });
  if (!rate.ok) {
    res.setHeader("Retry-After", String(rate.retryAfter));
    return res.status(429).json({ error: "Muitos pedidos seguidos. Espere alguns segundos.", code: "RATE_LIMIT", retryAfter: rate.retryAfter });
  }
  const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  try {
    const data = await handleSavesAction(supabaseRest(), uid, body);
    return res.status(200).json(data);
  } catch (error) {
    if (!error.status || error.status >= 500) console.error("Erro nos saves do Supabase:", error.message);
    return res.status(error.status || 500).json({ error: error.message || "Erro ao salvar na nuvem.", code: error.code || "SAVES_ERROR" });
  }
}
