// pages/api/gm.js
import {
  collectGeminiKeys,
  geminiKeysAllRestingError,
  markGeminiKeyExhausted,
  nextGeminiKey,
  parseUsageTokens,
  recordKeyUsage,
} from "../../lib/gemini-keys.mjs";
import { bearerToken, takeRateLimit, verifyIdToken } from "../../lib/verify-id-token.mjs";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// Narração e pesquisa de lore usam o Flash mais recente (texto bem melhor que o Flash-Lite).
// Quando a cota dele acaba numa chave, a mesma chave segue no Flash-Lite — sem travar o jogo.
export const DEFAULT_NARRATOR_MODEL = "gemini-flash-latest";
// Reserva, lida a cada pedido: GEMINI_MODEL (ou o Flash-Lite atual), o alias do Flash-Lite e o 2.5 Flash.
const fallbackModels = () => [
  String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim().replace(/^models\//, "") || DEFAULT_MODEL,
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
];
export const GM_DEADLINE_MS = 50000;
export const MAX_DEADLINE_MS = 52000;
const MIN_ATTEMPTS = 1;
const MAX_ATTEMPTS_CAP = 16;
export const PER_REQUEST_MS = 32000;
export const MIN_PER_REQUEST_MS = 20000;
const UPSTREAM_BACKOFF_MS = 250;
const modelName = value => String(value || DEFAULT_MODEL).trim().replace(/^models\//, "") || DEFAULT_MODEL;
const GOOGLE_SEARCH_TOOL = { google_search: {} };
const withGoogleSearch = body => ({ ...body, tools: [GOOGLE_SEARCH_TOOL] });
const withoutGoogleSearch = body => {
  const next = { ...body };
  delete next.tools;
  return next;
};
const hasGoogleSearch = body => Array.isArray(body?.tools) && body.tools.some(t => t && t.google_search != null);
const geminiText = data => data?.candidates?.[0]?.content?.parts
  ?.filter((part) => !part.thought && typeof part.text === "string")
  .map((part) => part.text).join("");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Ficção com guerra e vilões não pode ser cortada no meio por filtro sensível demais.
// Conteúdo sexual explícito continua no padrão do Gemini.
export const FICTION_SAFETY = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];

const isGemini3 = model => /^gemini-(3|flash-latest|flash-lite-latest|pro-latest)/.test(String(model || ""));

/**
 * Ajusta o pedido ao modelo:
 * - Gemini 3.x: raciocínio "low" (o padrão gasta tempo e tokens da resposta) e sem
 *   temperatura/topP/topK, que o 3.x ignora ou trata mal.
 * - Gemini 2.5 Flash: sem raciocínio — ele gastava o limite e a narração saía cortada.
 * Com { thinking: false } manda sem configuração de raciocínio (para repetir após erro 400).
 */
export function withModelConfig(body, model, { thinking = true } = {}) {
  if (!body || typeof body !== "object") return body;
  const next = { ...body };
  if (!next.safetySettings) next.safetySettings = FICTION_SAFETY;
  if (!next.generationConfig) return next;
  const gen = { ...next.generationConfig };
  if (isGemini3(model)) {
    delete gen.temperature;
    delete gen.topP;
    delete gen.topK;
    if (thinking && !gen.thinkingConfig) gen.thinkingConfig = { thinkingLevel: "low" };
  } else if (/^gemini-2\.5-flash/.test(String(model || "")) && thinking && !gen.thinkingConfig) {
    gen.thinkingConfig = { thinkingBudget: 0 };
  }
  if (!thinking) delete gen.thinkingConfig;
  next.generationConfig = gen;
  return next;
}

/** O pedido ganhou configuração de raciocínio? (se o modelo recusar com 400, repete sem ela) */
export const addsThinking = (body, model) => Boolean(withModelConfig(body, model)?.generationConfig?.thinkingConfig) && !body?.generationConfig?.thinkingConfig;

export const finishReasonOf = data => data?.candidates?.[0]?.finishReason || "";

/** Motivos em que o Gemini para no meio do texto. */
export const CUT_REASONS = ["MAX_TOKENS", "RECITATION", "SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "OTHER"];
export const isCut = reason => CUT_REASONS.includes(String(reason || ""));

/** Pedido para continuar uma narração que parou no meio (limite, recitação ou filtro). */
export function continuationBody(body, partial, reason = "MAX_TOKENS") {
  const why = reason === "RECITATION"
    ? "sua resposta foi interrompida porque ficou parecida demais com um texto publicado da obra. Continue EXATAMENTE de onde parou, com palavras SUAS — sem citar falas, versos ou trechos da obra."
    : reason === "MAX_TOKENS"
      ? "sua resposta foi cortada pelo limite de tamanho. Continue EXATAMENTE de onde parou — no meio da frase, se for o caso —, sem repetir nada e sem recomeçar."
      : "sua resposta foi interrompida pelo filtro de conteúdo. Continue EXATAMENTE de onde parou, com menos detalhe gráfico (sugira a violência em vez de descrever ferimentos), mantendo a cena e o tom.";
  const contents = [
    ...(Array.isArray(body?.contents) ? body.contents : []),
    { role: "model", parts: [{ text: partial }] },
    { role: "user", parts: [{ text: `[Sistema: ${why} Feche a cena e inclua as tags ocultas que faltaram.]` }] },
  ];
  const { tools, ...rest } = body || {};
  return { ...rest, contents, generationConfig: { ...(body?.generationConfig || {}), maxOutputTokens: 2048 } };
}

/** Se não deu para continuar, termina na última frase completa (nunca no meio de uma palavra). */
export function trimToSentence(text) {
  const raw = String(text || "").replace(/\[[^\]]*$/, "").trimEnd();
  if (!raw || /[.!?…"»)\]]$/.test(raw)) return raw;
  const cut = Math.max(raw.lastIndexOf(". "), raw.lastIndexOf("! "), raw.lastIndexOf("? "), raw.lastIndexOf("… "), raw.lastIndexOf('." '), raw.lastIndexOf(".\n"), raw.lastIndexOf('"\n'));
  return cut > raw.length * 0.4 ? raw.slice(0, cut + 1).trimEnd() : `${raw}…`;
}

/** Narrações terminam numa fala do jogador: o Gemini 3 recusa pedido cuja última mensagem é do modelo. */
export function endsWithUser(contents) {
  const list = Array.isArray(contents) ? contents : [];
  if (!list.length || list[list.length - 1].role === "user") return list;
  return [...list, { role: "user", parts: [{ text: "[Continue a cena a partir daqui.]" }] }];
}

// Cota por modelo: um 429 no modelo principal (o Flash) não aposenta a chave inteira —
// ela segue no Flash-Lite. Nos modelos de reserva, 429 continua valendo para a chave.
const modelRest = new Map();
export function restModel(key, model, ms = 60000) { modelRest.set(`${key}|${model}`, Date.now() + Math.max(5000, ms)); }
export function modelResting(key, model) { return (modelRest.get(`${key}|${model}`) || 0) > Date.now(); }
export function firstAwakeModel(key, models, from = 0) {
  return from === 0 && models.length > 1 && modelResting(key, models[0]) ? 1 : from;
}
const retryAfterMs = value => {
  const sec = Number(value);
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : 60000;
};

/** Junta a continuação sem duplicar o trecho em que a primeira parte parou. */
export function joinContinuation(partial, more) {
  const a = String(partial || "");
  let b = String(more || "");
  for (let n = Math.min(80, a.length, b.length); n >= 8; n -= 1) {
    if (a.endsWith(b.slice(0, n))) { b = b.slice(n); break; }
  }
  const needsSpace = a && b && !/\s$/.test(a) && !/^[\s.,;:!?…)»"']/.test(b) && /[.!?…"»]$/.test(a);
  return (needsSpace ? " " : "") + b;
}


export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "2mb" }, responseLimit: false } };

// ─── Texto em tempo real (streaming) ──────────────────────────────────
/** Separa eventos "data: {...}" de um trecho de SSE. Devolve { events, rest }. */
export function extractSseEvents(buffer) {
  const events = [];
  const parts = String(buffer || "").split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const data = part.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (!data || data === "[DONE]") continue;
    try { events.push(JSON.parse(data)); } catch {}
  }
  return { events, rest };
}

export const STREAM_CONNECT_MS = 25000;
export const STREAM_FIRST_BYTE_MS = 20000;

const sseWrite = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  if (typeof res.flush === "function") res.flush();
};

/**
 * Narra com streamGenerateContent e repassa o texto ao navegador conforme chega.
 * Devolve true se já respondeu (sucesso ou erro no meio); false se nem começou —
 * aí o cliente usa o caminho normal, com todas as tentativas e o rodízio de chaves.
 */
async function streamNarration(res, body, modelo, keys) {
  const models = [...new Set([modelName(modelo), ...fallbackModels()])];
  let modelIdx = 0;
  const startedAt = Date.now();
  const deadline = startedAt + GM_DEADLINE_MS;
  // Conectar tem prazo curto: se o Gemini não começar a responder logo, o cliente
  // usa o caminho normal sem dobrar a espera.
  const connectDeadline = startedAt + STREAM_CONNECT_MS;
  const tried = new Set();
  const maxAttempts = Math.min(Math.max(keys.length, 1), 3) + models.length;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const remaining = connectDeadline - Date.now();
    if (remaining < 2000) break;
    const pool = keys.filter(key => !tried.has(key));
    if (!pool.length) break;
    const { key } = nextGeminiKey(pool);
    if (!key) break;
    modelIdx = firstAwakeModel(key, models, modelIdx);
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), Math.min(remaining, STREAM_FIRST_BYTE_MS));
    let upstream;
    const open = (thinking) => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${models[modelIdx]}:streamGenerateContent?alt=sse&key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withModelConfig(body, models[modelIdx], { thinking })), signal: controller.signal }
    );
    try {
      upstream = await open(true);
      // Modelo que não aceita a configuração de raciocínio: repete sem ela.
      if (upstream.status === 400 && addsThinking(body, models[modelIdx])) upstream = await open(false);
    } catch {
      clearTimeout(timer);
      tried.add(key);
      continue;
    }
    if (upstream.status === 429) {
      clearTimeout(timer);
      const retry = upstream.headers?.get?.("retry-after");
      if (modelIdx === 0 && models.length > 1) {
        // A cota acabou só no modelo principal: a mesma chave tenta a reserva.
        restModel(key, models[modelIdx], retryAfterMs(retry));
        modelIdx += 1;
        continue;
      }
      markGeminiKeyExhausted(key, retry);
      tried.add(key);
      continue;
    }
    if (upstream.status === 404 && modelIdx < models.length - 1) {
      clearTimeout(timer);
      modelIdx += 1;
      continue;
    }
    if (!upstream.ok || !upstream.body?.getReader) {
      clearTimeout(timer);
      tried.add(key);
      continue;
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let total = "";
    let lastData = null;
    let blocked = false;
    try {
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), Math.max(1000, deadline - Date.now()));
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = extractSseEvents(buffer);
        buffer = rest;
        for (const event of events) {
          lastData = event;
          if (event?.promptFeedback?.blockReason) blocked = true;
          const piece = geminiText(event);
          if (piece) {
            total += piece;
            sseWrite(res, { t: piece });
          }
        }
      }
      const tail = extractSseEvents(`${buffer}\n\n`).events;
      for (const event of tail) {
        lastData = event;
        const piece = geminiText(event);
        if (piece) { total += piece; sseWrite(res, { t: piece }); }
      }
      // Parou no meio (limite, recitação da obra ou filtro): pede a continuação e manda junto,
      // sem o jogador perceber o corte. Se não der, fecha na última frase completa.
      const reason = finishReasonOf(lastData);
      if (total && isCut(reason)) {
        let extra = "";
        if (deadline - Date.now() > 4000) {
          try {
            const ctrl = new AbortController();
            const t2 = setTimeout(() => ctrl.abort(), Math.max(1000, deadline - Date.now() - 500));
            const more = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${models[modelIdx]}:generateContent?key=${key}`,
              { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withModelConfig(continuationBody(body, total, reason), models[modelIdx])), signal: ctrl.signal }
            ).then((r) => (r.ok ? r.json() : null)).catch(() => null);
            clearTimeout(t2);
            extra = joinContinuation(total, geminiText(more));
          } catch {}
        }
        if (extra) { total += extra; sseWrite(res, { t: extra }); }
        else {
          const closed = trimToSentence(total);
          if (closed !== total) { total = closed; sseWrite(res, { final: closed }); }
        }
      }
      if (!total) {
        const finish = lastData?.candidates?.[0]?.finishReason;
        blocked = blocked || ["SAFETY", "PROHIBITED_CONTENT", "RECITATION"].includes(finish);
        sseWrite(res, { error: blocked ? "A IA não respondeu a esse conteúdo." : "Resposta vazia.", code: blocked ? "CONTENT_BLOCKED" : "EMPTY_RESPONSE" });
      } else {
        recordKeyUsage(key, parseUsageTokens(lastData));
        sseWrite(res, { done: true });
      }
    } catch {
      sseWrite(res, { error: "A transmissão foi interrompida.", code: "STREAM_INTERRUPTED" });
    } finally {
      clearTimeout(timer);
      res.end();
    }
    return true;
  }
  return false;
}


export function readGmRequestBody(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      return null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  return null;
}

export default async function handler(req, res) {
  // GEMINI_NARRATOR_MODEL troca o narrador; GEMINI_MODEL vira a reserva logo atrás dele.
  const MODELO_GM = modelName(process.env.GEMINI_NARRATOR_MODEL || DEFAULT_NARRATOR_MODEL);
  const MODELO_LORE = modelName(process.env.GEMINI_LORE_MODEL || process.env.GEMINI_NARRATOR_MODEL || DEFAULT_NARRATOR_MODEL);
  res.setHeader("Cache-Control", "no-store");
  const respondError = error => {
    if (error.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
    return res.status(error.status || 500).json({ error: error.message, code: error.code || "API_ERROR", retryAfter: error.retryAfter || null });
  };
  // Sem CORS aberto: só o próprio site chama esta rota.
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  // Só quem está logado usa as chaves do Gemini. GM_REQUIRE_AUTH=0 desliga (emergência).
  if (process.env.GM_REQUIRE_AUTH !== "0") {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "siterpg32";
      const { uid } = await verifyIdToken(bearerToken(req), { projectId });
      const limit = Number(process.env.GM_RATE_LIMIT_PER_MIN) || 30;
      const rate = takeRateLimit(uid, { limit });
      if (!rate.ok) {
        res.setHeader("Retry-After", String(rate.retryAfter));
        return res.status(429).json({ error: "Muitos pedidos seguidos ao Mestre. Espere alguns segundos.", code: "RATE_LIMIT", retryAfter: rate.retryAfter });
      }
    } catch (error) {
      return res.status(error.status || 401).json({ error: error.message, code: error.code || "AUTH_REQUIRED" });
    }
  }

  const requestBody = readGmRequestBody(req.body);
  if (requestBody == null) {
    return res.status(400).json({ error: "Pedido inválido: corpo ausente ou malformado.", code: "INVALID_BODY" });
  }
  if (Object.keys(requestBody).length === 0) {
    return res.status(400).json({ error: "Pedido inválido: corpo ausente.", code: "INVALID_BODY" });
  }

  const { messages, systemPrompt, useLoreSearch, useLoreTopics, useCharacterSearch, useGrounding, world, charName } = requestBody;
  // Recorte da história (época, lugar, papel do jogador) e nomes a pesquisar — sempre texto curto.
  const loreContext = typeof requestBody.context === "string" ? requestBody.context.slice(0, 1500).trim() : "";
  const loreTopics = Array.isArray(requestBody.topics)
    ? [...new Set(requestBody.topics.map(t => String(t || "").replace(/[\n\r"{}]/g, " ").trim().slice(0, 48)).filter(Boolean))].slice(0, 6)
    : [];

  const parseJsonFromText = (text) => {
    const cleaned = String(text || "").replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      return null;
    }
  };

  const chavesUnicas = collectGeminiKeys();

  if (chavesUnicas.length === 0) {
    return res.status(500).json({
      error: "O servidor está sem chave de IA (GEMINI_API_KEY). Configure a chave e publique novamente o site.",
      code: "NO_API_KEY",
    });
  }

  const quotaError = (retryAfter) => {
    const error = new Error("A cota da IA esgotou (limite de uso). Aguarde o intervalo indicado e tente de novo; se persistir, confira a cota do projeto no Google AI Studio.");
    error.status = 429;
    error.code = "RATE_LIMIT";
    error.retryAfter = Math.min(900, Math.max(1, Number(retryAfter) || 90));
    return error;
  };

  const recusarChave = () => {
    const error = new Error("A chave de IA foi recusada ou não tem permissão. Confira a GEMINI_API_KEY e o projeto no servidor.");
    error.status = 502;
    error.code = "API_AUTH";
    return error;
  };

  const chamarGemini = async (body, modelo) => {
    const maxAttempts = Math.min(Math.max(chavesUnicas.length, MIN_ATTEMPTS), MAX_ATTEMPTS_CAP);
    const deadlineMs = Math.min(MAX_DEADLINE_MS, GM_DEADLINE_MS);
    // Do not divide the budget by every key: a long narrate (identity + lore +
    // intervenção do Mestre) often needs 15–30s on lite. Starving the first call
    // to ~5–12s is what surfaces "O Mestre demorou para responder".
    const perRequestMs = Math.min(PER_REQUEST_MS, Math.max(MIN_PER_REQUEST_MS, deadlineMs - 4000));
    const models = [...new Set([modelName(modelo), ...fallbackModels()])];
    let modelIdx = 0;
    let apiVersion = "v1beta";
    let lastError = null;
    let lastNonRateLimitError = null;
    const deadline = Date.now() + deadlineMs;
    const triedThisCall = new Set();
    let modelSkips = 0;
    const authRefusedKeys = new Set();
    const rateLimitedKeys = new Set();
    const tryAgainError = () => {
      const error = new Error("O Mestre não respondeu agora. Tente de novo.");
      error.status = 502;
      error.code = "UPSTREAM_UNAVAILABLE";
      return error;
    };
    const setLastError = (err) => {
      lastError = err;
      if (err && err.code !== "RATE_LIMIT") lastNonRateLimitError = err;
    };

    const postGemini = (apiKey, modeloAtual, requestBody, signal, version = "v1beta", thinking = true) => fetch(
      `https://generativelanguage.googleapis.com/${version}/models/${modeloAtual}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withModelConfig(requestBody, modeloAtual, { thinking })),
      }
    );

    const callGemini = async (apiKey, modeloAtual, requestBody, signal, version) => {
      let res = await postGemini(apiKey, modeloAtual, requestBody, signal, version);
      if (res.status === 400 && addsThinking(requestBody, modeloAtual)) res = await postGemini(apiKey, modeloAtual, requestBody, signal, version, false);
      let payload = null;
      let parsed = true;
      try { payload = await res.json(); }
      catch { parsed = false; }
      return { res, payload, parsed };
    };

    const skipRefusedKey = (apiKey) => {
      triedThisCall.add(apiKey);
      authRefusedKeys.add(apiKey);
      apiVersion = "v1beta";
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      const pool = chavesUnicas.filter(key => !triedThisCall.has(key));
      if (!pool.length) break;

      const pick = nextGeminiKey(pool);
      const apiKey = pick.key;
      if (!apiKey) break;
      const modelPos = firstAwakeModel(apiKey, models, modelIdx);
      const modeloAtual = models[modelPos];
      const callWithBudget = async (requestBody, budgetMs) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), budgetMs);
        try {
          return await callGemini(apiKey, modeloAtual, requestBody, controller.signal, apiVersion);
        } finally {
          clearTimeout(timeout);
        }
      };
      try {
        const attemptBudget = Math.min(remaining, perRequestMs);
        let { res: geminiRes, payload: data, parsed } = await callWithBudget(body, attemptBudget);
        // google_search is optional: a 403/429 on grounding must not be treated as key quota/auth.
        // Use a fresh abort budget so the stripped retry is not leftover milliseconds.
        if (hasGoogleSearch(body) && (!parsed || !geminiRes.ok || !geminiText(data))) {
          const leftover = deadline - Date.now();
          if (leftover > 2000) {
            const stripped = await callWithBudget(withoutGoogleSearch(body), Math.min(leftover, perRequestMs));
            geminiRes = stripped.res;
            data = stripped.payload;
            parsed = stripped.parsed;
          }
        }

        if (!parsed) {
          const invalid = new Error("O serviço de IA retornou uma resposta inválida. Tente novamente em instantes.");
          invalid.status = 502;
          invalid.code = "UPSTREAM_RESPONSE";
          setLastError(invalid);
          triedThisCall.add(apiKey);
          if (attempt < maxAttempts - 1 && deadline - Date.now() > 1000) await wait(UPSTREAM_BACKOFF_MS);
          continue;
        }

        if (geminiRes.status === 429) {
          const headerRetry = geminiRes.headers?.get?.("retry-after");
          if (modelPos === 0 && models.length > 1 && modelSkips < Math.max(1, chavesUnicas.length)) {
            // Só este modelo esgotou nesta chave: a próxima tentativa usa o modelo seguinte.
            restModel(apiKey, modeloAtual, retryAfterMs(headerRetry));
            modelSkips += 1;
            attempt -= 1;
            continue;
          }
          markGeminiKeyExhausted(apiKey, headerRetry);
          triedThisCall.add(apiKey);
          rateLimitedKeys.add(apiKey);
          setLastError(quotaError(headerRetry));
          continue;
        }
        if (geminiRes.status === 500 || geminiRes.status === 502 || geminiRes.status === 503) {
          const unavailableUpstream = new Error("O serviço de IA está temporariamente indisponível. Tente novamente em instantes.");
          unavailableUpstream.status = geminiRes.status;
          unavailableUpstream.code = "UPSTREAM_UNAVAILABLE";
          setLastError(unavailableUpstream);
          triedThisCall.add(apiKey);
          if (attempt < maxAttempts - 1 && deadline - Date.now() > 1000) await wait(UPSTREAM_BACKOFF_MS);
          continue;
        }

        if (!geminiRes.ok) {
          const message = data?.error?.message || "";
          const unavailable = geminiRes.status === 404 || /no longer available|deprecated|not available to new users|not found for API version/i.test(message);
          const authError = geminiRes.status === 401 || geminiRes.status === 403 || /api key not valid|api_key_invalid/i.test(message);
          if (unavailable && apiVersion === "v1beta") {
            apiVersion = "v1";
            attempt -= 1;
            continue;
          }
          if (unavailable && modelPos < models.length - 1) {
            // Pula para o modelo seguinte ao que falhou (o principal pode ter sido pulado por cota).
            modelIdx = modelPos + 1;
            apiVersion = "v1beta";
            attempt -= 1;
            continue;
          }
          const refused = new Error(unavailable
            ? "O modelo do Mestre não está disponível. Atualize GEMINI_MODEL no servidor e publique novamente o site. Sua ação foi preservada."
            : authError ? recusarChave().message
            : "A solicitação foi recusada pela IA. Confira o modelo e a configuração da API no servidor.");
          refused.status = unavailable ? 503 : 502;
          refused.code = unavailable ? "MODEL_UNAVAILABLE" : authError ? "API_AUTH" : "API_REQUEST";
          setLastError(refused);
          if (unavailable) {
            triedThisCall.add(apiKey);
            apiVersion = "v1beta";
            continue;
          }
          if (authError) {
            skipRefusedKey(apiKey);
            continue;
          }
          triedThisCall.add(apiKey);
          continue;
        }

        const text = geminiText(data);
        if (!text) {
          const blocked = Boolean(data?.promptFeedback?.blockReason) || ["SAFETY", "PROHIBITED_CONTENT", "RECITATION"].includes(data?.candidates?.[0]?.finishReason);
          const empty = new Error(blocked ? "A IA não respondeu a esse conteúdo. Reformule sua ação e tente novamente." : "O Mestre retornou uma resposta vazia. Sua ação foi preservada; tente novamente.");
          empty.code = blocked ? "CONTENT_BLOCKED" : "EMPTY_RESPONSE";
          empty.status = blocked ? 422 : 502;
          setLastError(empty);
          if (blocked) { lastError.fatal = true; throw lastError; }
          triedThisCall.add(apiKey);
          continue;
        }

        recordKeyUsage(apiKey, parseUsageTokens(data));
        const reason = finishReasonOf(data);
        if (isCut(reason)) {
          if (deadline - Date.now() > 4000) {
            try {
              const more = await callWithBudget(continuationBody(body, text, reason), Math.min(deadline - Date.now() - 500, perRequestMs));
              const extra = more.parsed && more.res.ok ? joinContinuation(text, geminiText(more.payload)) : "";
              if (extra) return text + extra;
            } catch {}
          }
          return trimToSentence(text);
        }
        return text;
      } catch (err) {
        if (err.fatal) throw err;
        triedThisCall.add(apiKey);
        const timedOut = err.name === "AbortError";
        const networkErr = new Error(timedOut
          ? "O Mestre demorou para responder. Tente novamente; o que já foi combinado permanece."
          : "Não foi possível conectar ao Mestre. Tente novamente.");
        networkErr.status = timedOut ? 504 : 502;
        networkErr.code = timedOut ? "TIMEOUT" : "NETWORK";
        setLastError(networkErr);
        if (deadline - Date.now() < 2000) break;
      }
    }

    if (authRefusedKeys.size >= chavesUnicas.length) throw lastError?.code === "API_AUTH" ? lastError : recusarChave();
    if (chavesUnicas.length > 0 && rateLimitedKeys.size >= chavesUnicas.length) {
      const resting = nextGeminiKey(chavesUnicas);
      throw geminiKeysAllRestingError(resting.retryAfterSec);
    }
    if (lastError?.code === "RATE_LIMIT") throw lastNonRateLimitError || tryAgainError();
    throw lastError || tryAgainError();
  };

  const chamarGeminiComBusca = async (body, modelo) => {
    try {
      return await chamarGemini(withGoogleSearch(body), modelo);
    } catch {
      return chamarGemini(body, modelo);
    }
  };

  // ── Modo: busca de personagem canônico ─────────────────────────────
  if (useCharacterSearch) {
    if (!world || !charName) {
      return res.status(400).json({ error: 'Campos "world" e "charName" são obrigatórios.' });
    }

    try {
      const charBody = {
        system_instruction: {
          parts: [{
            text: [
              "Você é um pesquisador especialista em lore de obras de ficção.",
              "Pesquise APENAS fatos canônicos e estabelecidos sobre o personagem solicitado dentro do universo indicado.",
              "Não invente eventos, poderes ou relações.",
              "Responda APENAS com JSON válido (sem markdown, sem texto antes ou depois) neste formato exato:",
              '{"charTitle":"cargo ou título","charAge":"idade em anos","charBg":"história resumida","charPersonality":"traços de personalidade","charSkills":"habilidades e poderes","appearance":"descrição física","relationships":{"Nome":"Hostil|Neutral|Amigável|Suspeito"},"rawLore":"resumo completo em português"}',
              "Preencha TODOS os campos com informações reais do personagem. Nunca deixe campos vazios se a informação existir no canon.",
            ].join(" "),
          }],
        },
        contents: [{
          role: "user",
          parts: [{
            text: `Pesquise tudo sobre o personagem "${charName}" do universo "${world}". Inclua título/cargo, idade (se conhecida), história, personalidade, habilidades/poderes, aparência física canônica e relações importantes com outros personagens da obra.`,
          }],
        }],
        generationConfig: { maxOutputTokens: 3072, temperature: 0.3 },
      };

      const raw = await chamarGemini(charBody, MODELO_LORE);
      const parsed = parseJsonFromText(raw);
      if (parsed && typeof parsed === "object") {
        const relationships = parsed.relationships && typeof parsed.relationships === "object"
          ? parsed.relationships
          : {};
        return res.status(200).json({
          character: {
            charTitle: String(parsed.charTitle || "").trim(),
            charAge: String(parsed.charAge || "").trim(),
            charBg: String(parsed.charBg || "").trim(),
            charPersonality: String(parsed.charPersonality || "").trim(),
            charSkills: String(parsed.charSkills || "").trim(),
            appearance: String(parsed.appearance || "").trim(),
            relationships,
            charLore: String(parsed.rawLore || raw).trim(),
          },
        });
      }

      return res.status(200).json({
        character: {
          charTitle: "",
          charAge: "",
          charBg: "",
          charPersonality: "",
          charSkills: "",
          appearance: "",
          relationships: {},
          charLore: String(raw || "").trim(),
        },
      });
    } catch (e) {
      console.error("Erro no character search:", e.message);
      return respondError(e);
    }
  }

  // ── Modo: lore de nomes que apareceram na mesa ─────────────────────
  if (useLoreTopics) {
    if (!world || !loreTopics.length) {
      return res.status(400).json({ error: 'Campos "world" e "topics" são obrigatórios.', code: "INVALID_BODY" });
    }
    try {
      const topicsBody = {
        system_instruction: {
          parts: [{
            text: [
              "Você é um pesquisador especialista em lore de obras de ficção.",
              "Para cada nome pedido, pesquise o que a OBRA estabelece: quem ou o que é, aparência ou marca, lealdade, o que está fazendo no recorte indicado e uma ligação relevante.",
              "Até 2 frases por nome, em português brasileiro. Só fatos canônicos; não invente.",
              "Se o nome não existe na obra (personagem original da mesa) ou você não tiver certeza, deixe-o de fora.",
              'Responda APENAS com JSON válido no formato {"Nome": "fato canônico curto"}.',
            ].join(" "),
          }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `Obra: "${world}".${loreContext ? `\nRecorte: ${loreContext}` : ""}\nNomes: ${loreTopics.join("; ")}` }],
        }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.2 },
      };
      const raw = await chamarGeminiComBusca(topicsBody, MODELO_LORE);
      const parsed = parseJsonFromText(raw);
      const notes = {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [name, fact] of Object.entries(parsed)) {
          if (typeof fact === "string" && fact.trim()) notes[String(name).slice(0, 48)] = fact.trim().slice(0, 400);
        }
      }
      return res.status(200).json({ notes, tried: loreTopics });
    } catch (e) {
      console.error("Erro no lore de nomes:", e.message);
      return respondError(e);
    }
  }

  // ── Modo: busca de lore ────────────────────────────────────────────
  if (useLoreSearch) {
    if (!world) {
      return res.status(400).json({ error: 'Campo "world" ausente.' });
    }

    try {
      const loreBody = {
        system_instruction: {
          parts: [{
            text: [
              "Você é um pesquisador especialista em lore de obras de ficção.",
              "Use busca para ancorar o briefing em fatos canônicos estabelecidos.",
              "Produza um BRIEFING CANÔNICO PARA RPG em português brasileiro, com estas seções:",
              "1) ERA / RECORTE TEMPORAL: o ano ou período exato do recorte pedido, quem governa, guerras e crises em curso NESTE momento;",
              "2) QUEM ESTÁ ONDE: personagens canônicos importantes vivos neste momento, idade aproximada, onde estão e o que fazem agora;",
              "3) LINHA DO TEMPO À FRENTE: eventos canônicos dos próximos meses e anos a partir do recorte, em ordem, para o Mestre respeitar ou deixar o jogador mudar com consequência;",
              "4) LUGARES NOMEADOS do recorte: quem controla, como é, o que tem de importante;",
              "5) FACÇÕES e poderes políticos ou sociais, com o que cada uma quer agora;",
              "6) REGRAS DE MAGIA / PODER / FÍSICA E TECNOLOGIA (o que existe, o que é raro, o que NÃO existe);",
              "7) COTIDIANO E COSTUMES: comida, moedas, títulos e formas de tratamento, juramentos e xingamentos típicos, nomes comuns, como gente comum fala e vive;",
              "8) O QUE NÃO INVENTAR (destinos de protagonistas, eventos-chave, poderes fora do sistema);",
              "9) TRAMAS CANÔNICAS: 3 a 5 conflitos ou arcos estabelecidos NESTE recorte que um habitante comum poderia cruzar. Cada uma vira uma tag [TRAMA:título|gancho local em 1 linha].",
              "Não invente eventos, personagens ou regras. Se um fato for incerto, omita-o ou marque como incerto.",
              "Não escreva a aventura do jogador nem o coloque como protagonista da obra — só o contexto fiel e as tramas do universo para um Mestre.",
            ].join(" "),
          }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `Pesquise o universo "${world}" na rede e entregue o briefing canônico acima, inclusive tramas e arcos confirmados pela busca. Não invente canon.${loreContext ? `\n\nRECORTE DESTA HISTÓRIA (foque a pesquisa NESTA época e NESTE lugar, não no período mais famoso da obra):\n${loreContext}` : ""}` }],
        }],
        generationConfig: { maxOutputTokens: 6144, temperature: 0.3 },
      };

      const lore = await chamarGeminiComBusca(loreBody, MODELO_LORE);
      return res.status(200).json({ lore });
    } catch (e) {
      console.error("Erro no lore search:", e.message);
      return respondError(e);
    }
  }

  // ── Modo: ação automática do personagem ────────────────────────────
  if (requestBody.useAutoAction) {
    const { camp, lastGmText } = requestBody;
    if (!camp?.charName) {
      return res.status(400).json({ error: 'Campo "camp.charName" ausente.' });
    }

    try {
      const autoBody = {
        system_instruction: {
          parts: [{
            text: [
              "Você decide a próxima ação de um personagem de RPG em primeira pessoa.",
              "Responda APENAS com 1 frase curta (no máximo 2) em português: o que o personagem FAZ agora.",
              "Prefira gesto físico. Se precisar falar, uma fala curta — sem discurso, sem monólogo, sem aspas longas.",
              "Não narre consequências, não explique raciocínio, não liste opções.",
              "A ação deve ser coerente com a personalidade do personagem (jeito, desejo, limites), história, tramas abertas e habilidades — não uma ação genérica que qualquer um faria.",
              "Avance a história: aja sobre o conflito da cena ou sobre uma trama/missão ativa. Não fique só observando.",
              "Não repita o gesto da ação anterior (apoiar a mão, encarar, apertar o mesmo objeto). Faça outra coisa concreta.",
              "Se a cena termina com pergunta ou tensão, reaja como esse personagem reagiria de verdade.",
            ].join(" "),
          }],
        },
        contents: [{
          role: "user",
          parts: [{
            text: [
              `Personagem: ${camp.charName}${camp.charTitle ? ` (${camp.charTitle})` : ""}`,
              camp.world ? `Universo: ${camp.world}` : "",
              camp.charPersonality ? `Personalidade: ${camp.charPersonality}` : "",
              camp.charBg ? `História: ${camp.charBg}` : "",
              camp.charSkills ? `Habilidades: ${camp.charSkills}` : "",
              camp.specialAbility?.enabled ? `Habilidades especiais permitidas mesmo fora deste universo (até 3): ${JSON.stringify(camp.specialAbility)}. Considere os limites de cada uma; não revele poder secreto automaticamente.` : "",
              camp.gameStyle ? `Estilo de jogo: ${camp.gameStyle}` : "",
              camp.charSituation ? `Situação atual: ${camp.charSituation}` : "",
              Array.isArray(camp.plots) && camp.plots.length ? `Tramas ativas: ${camp.plots.map((plot) => plot.title || plot).join("; ")}` : "",
              Array.isArray(camp.missions) && camp.missions.length ? `Missões ativas: ${camp.missions.map((mission) => mission.text || mission).join("; ")}` : "",
              Array.isArray(camp.recentActions) && camp.recentActions.length ? `Não repita estas ações já feitas: ${camp.recentActions.join(" | ")}` : "",
              "",
              "Cena atual do narrador:",
              lastGmText || "(início da aventura — posicione-se na situação inicial)",
              "",
              "Qual a próxima ação deste personagem?",
            ].filter(Boolean).join("\n"),
          }],
        }],
        generationConfig: { maxOutputTokens: 120, temperature: 0.85 },
      };

      const action = await chamarGemini(autoBody, MODELO_GM);
      return res.status(200).json({ action: String(action || "").trim() });
    } catch (e) {
      console.error("Erro no auto action:", e.message);
      return respondError(e);
    }
  }

  // ── Modo: narração do Mestre ───────────────────────────────────────
  if (!Array.isArray(messages) || messages.length === 0 || messages.some((m) =>
    !m || !["user", "assistant"].includes(m.role) ||
    typeof m.content !== "string" || !m.content.trim())) {
    return res.status(400).json({ error: 'Campo "messages" ausente ou inválido.', code: "INVALID_BODY" });
  }

  if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
    return res.status(400).json({ error: 'Campo "systemPrompt" ausente.', code: "INVALID_BODY" });
  }

  try {
    const contents = endsWithUser(messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })));

    const body = {
      contents,
      // Folga para o raciocínio "low" do Gemini 3 não comer a narração; o tamanho real vem do prompt.
      generationConfig: { maxOutputTokens: requestBody.economyMode === true ? 4096 : 8192, temperature: 0.9 },
      system_instruction: { parts: [{ text: systemPrompt }] },
    };

    // Texto em tempo real: só na narração comum (sem busca na rede). Se não começar, o cliente cai no caminho normal.
    if (requestBody.stream === true && !useGrounding) {
      const sent = await streamNarration(res, body, MODELO_GM, chavesUnicas);
      if (sent) return;
      return res.status(503).json({ error: "O texto em tempo real não está disponível agora.", code: "STREAM_UNAVAILABLE" });
    }

    const text = useGrounding
      ? await chamarGeminiComBusca(body, MODELO_GM)
      : await chamarGemini(body, MODELO_GM);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("Todas as chaves Gemini falharam. Último erro:", e.message);
    return respondError(e);
  }
}
