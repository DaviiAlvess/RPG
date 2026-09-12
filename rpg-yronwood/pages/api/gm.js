// pages/api/gm.js
import {
  collectGeminiKeys,
  geminiKeysAllRestingError,
  markGeminiKeyExhausted,
  nextGeminiKey,
  parseUsageTokens,
  recordKeyUsage,
} from "../../lib/gemini-keys.mjs";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GM_DEADLINE_MS = 45000;
const MAX_DEADLINE_MS = 55000;
const MIN_ATTEMPTS = 1;
const MAX_ATTEMPTS_CAP = 7;
const PER_REQUEST_MS = 12000;
const MIN_PER_REQUEST_MS = 5000;
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
const SEARCH_FALLBACK_CODES = new Set([
  "API_REQUEST",
  "EMPTY_RESPONSE",
  "CONTENT_BLOCKED",
  "TIMEOUT",
  "NETWORK",
  "UPSTREAM_RESPONSE",
  "UPSTREAM_UNAVAILABLE",
]);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const MODELO_GM = modelName(process.env.GEMINI_MODEL);
  const MODELO_LORE = modelName(process.env.GEMINI_LORE_MODEL || process.env.GEMINI_MODEL);
  res.setHeader("Cache-Control", "no-store");
  const respondError = error => {
    if (error.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
    return res.status(error.status || 500).json({ error: error.message, code: error.code || "API_ERROR", retryAfter: error.retryAfter || null });
  };
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { messages, systemPrompt, useLoreSearch, useCharacterSearch, useGrounding, world, charName } = req.body ?? {};

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
    const deadlineMs = Math.min(MAX_DEADLINE_MS, GM_DEADLINE_MS + Math.max(0, maxAttempts - 5) * 2500);
    const perRequestMs = Math.min(PER_REQUEST_MS, Math.max(MIN_PER_REQUEST_MS, Math.floor((deadlineMs - 2000) / maxAttempts)));
    const models = [...new Set([modelName(modelo), ...FALLBACK_MODELS])];
    let modelIdx = 0;
    let lastError = null;
    let emptyRetries = 0;
    const deadline = Date.now() + deadlineMs;
    const triedThisCall = new Set();
    const authRefusedKeys = new Set();
    const rateLimitedKeys = new Set();

    const postGemini = (apiKey, modeloAtual, requestBody, signal) => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modeloAtual}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const skipRefusedKey = (apiKey) => {
      triedThisCall.add(apiKey);
      authRefusedKeys.add(apiKey);
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      const pool = chavesUnicas.filter(key => !triedThisCall.has(key));
      if (!pool.length) break;

      const pick = nextGeminiKey(pool);
      const apiKey = pick.key;
      if (!apiKey) break;
      const modeloAtual = models[modelIdx];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Math.min(remaining, perRequestMs));
      try {
        const geminiRes = await postGemini(apiKey, modeloAtual, body, controller.signal);

        let data;
        try { data = await geminiRes.json(); }
        catch {
          lastError = new Error("O serviço de IA retornou uma resposta inválida. Tente novamente em instantes.");
          lastError.status = 502;
          lastError.code = "UPSTREAM_RESPONSE";
          triedThisCall.add(apiKey);
          if (attempt < maxAttempts - 1 && deadline - Date.now() > 1000) await wait(UPSTREAM_BACKOFF_MS);
          continue;
        }

        if (geminiRes.status === 429) {
          const headerRetry = geminiRes.headers?.get?.("retry-after");
          markGeminiKeyExhausted(apiKey, headerRetry);
          triedThisCall.add(apiKey);
          rateLimitedKeys.add(apiKey);
          lastError = quotaError(headerRetry);
          continue;
        }
        if (geminiRes.status === 500 || geminiRes.status === 502 || geminiRes.status === 503) {
          lastError = new Error("O serviço de IA está temporariamente indisponível. Tente novamente em instantes.");
          lastError.status = geminiRes.status;
          lastError.code = "UPSTREAM_UNAVAILABLE";
          triedThisCall.add(apiKey);
          if (attempt < maxAttempts - 1 && deadline - Date.now() > 1000) await wait(UPSTREAM_BACKOFF_MS);
          continue;
        }

        if (!geminiRes.ok) {
          const message = data?.error?.message || "";
          const unavailable = geminiRes.status === 404 || /no longer available|deprecated|not available to new users/i.test(message);
          const quotaHint = /quota|rate.?limit|resource.?exhausted/i.test(message);
          const authError = geminiRes.status === 401 || geminiRes.status === 403 || /api key not valid|api_key_invalid/i.test(message);
          if (unavailable && modelIdx < models.length - 1) {
            modelIdx += 1;
            attempt -= 1;
            continue;
          }
          if (quotaHint && !unavailable && !authError) {
            triedThisCall.add(apiKey);
            lastError = quotaError(90);
            continue;
          }
          lastError = new Error(unavailable
            ? "O modelo do Mestre não está disponível. Atualize GEMINI_MODEL no servidor e publique novamente o site. Sua ação foi preservada."
            : authError ? recusarChave().message
            : "A solicitação foi recusada pela IA. Confira o modelo e a configuração da API no servidor.");
          lastError.status = unavailable ? 503 : 502;
          lastError.code = unavailable ? "MODEL_UNAVAILABLE" : authError ? "API_AUTH" : "API_REQUEST";
          if (unavailable) break;
          if (authError) {
            if (hasGoogleSearch(body)) {
              const retryRes = await postGemini(apiKey, modeloAtual, withoutGoogleSearch(body), controller.signal);
              let retryData = null;
              try { retryData = await retryRes.json(); } catch { retryData = null; }
              if (retryRes.status === 429) {
                const headerRetry = retryRes.headers?.get?.("retry-after");
                markGeminiKeyExhausted(apiKey, headerRetry);
                triedThisCall.add(apiKey);
                rateLimitedKeys.add(apiKey);
                lastError = quotaError(headerRetry);
                continue;
              }
              if (retryRes.ok) {
                const retryText = geminiText(retryData);
                if (retryText) {
                  recordKeyUsage(apiKey, parseUsageTokens(retryData));
                  return retryText;
                }
              }
            }
            skipRefusedKey(apiKey);
            continue;
          }
          lastError.fatal = true;
          throw lastError;
        }

        const text = geminiText(data);
        if (!text) {
          const blocked = Boolean(data?.promptFeedback?.blockReason) || ["SAFETY", "PROHIBITED_CONTENT", "RECITATION"].includes(data?.candidates?.[0]?.finishReason);
          lastError = new Error(blocked ? "A IA não respondeu a esse conteúdo. Reformule sua ação e tente novamente." : "O Mestre retornou uma resposta vazia. Sua ação foi preservada; tente novamente.");
          lastError.code = blocked ? "CONTENT_BLOCKED" : "EMPTY_RESPONSE";
          lastError.status = blocked ? 422 : 502;
          if (blocked) { lastError.fatal = true; throw lastError; }
          if (emptyRetries < 1 && attempt < maxAttempts - 1) {
            emptyRetries += 1;
            continue;
          }
          lastError.fatal = true;
          throw lastError;
        }

        recordKeyUsage(apiKey, parseUsageTokens(data));
        return text;
      } catch (err) {
        if (err.fatal) throw err;
        triedThisCall.add(apiKey);
        const timedOut = err.name === "AbortError";
        lastError = new Error(timedOut
          ? "O Mestre demorou para responder. Tente novamente."
          : "Não foi possível conectar ao Mestre. Tente novamente.");
        lastError.status = timedOut ? 504 : 502;
        lastError.code = timedOut ? "TIMEOUT" : "NETWORK";
        const untried = chavesUnicas.filter(key => !triedThisCall.has(key));
        if (timedOut && untried.length <= 1) break;
        if (deadline - Date.now() < 2000) break;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (authRefusedKeys.size >= chavesUnicas.length) throw lastError?.code === "API_AUTH" ? lastError : recusarChave();
    if (rateLimitedKeys.size >= chavesUnicas.length) {
      const resting = nextGeminiKey(chavesUnicas);
      throw geminiKeysAllRestingError(resting.retryAfterSec);
    }
    throw lastError || new Error("O Mestre está indisponível. Tente em instantes.");
  };

  const chamarGeminiComBusca = async (body, modelo) => {
    try {
      return await chamarGemini(withGoogleSearch(body), modelo);
    } catch (error) {
      if (SEARCH_FALLBACK_CODES.has(error.code)) return chamarGemini(body, modelo);
      throw error;
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
              "1) ERA / RECORTE TEMPORAL típico;",
              "2) LUGARES NOMEADOS essenciais;",
              "3) FACÇÕES e poderes políticos ou sociais;",
              "4) REGRAS DE MAGIA / PODER / FÍSICA (o que existe, o que é raro, o que NÃO existe);",
              "5) TOM e vida cotidiana de pessoas comuns;",
              "6) O QUE NÃO INVENTAR (destinos de protagonistas, eventos-chave, poderes fora do sistema).",
              "Não invente eventos, personagens ou regras. Se um fato for incerto, omita-o ou marque como incerto.",
              "Não escreva uma aventura nem coloque o jogador como protagonista da obra — só o contexto fiel para um Mestre.",
            ].join(" "),
          }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `Pesquise o universo "${world}" e entregue o briefing canônico acima. Não invente canon.` }],
        }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      };

      const lore = await chamarGeminiComBusca(loreBody, MODELO_LORE);
      return res.status(200).json({ lore });
    } catch (e) {
      console.error("Erro no lore search:", e.message);
      return respondError(e);
    }
  }

  // ── Modo: ação automática do personagem ────────────────────────────
  if (req.body?.useAutoAction) {
    const { camp, lastGmText } = req.body;
    if (!camp?.charName) {
      return res.status(400).json({ error: 'Campo "camp.charName" ausente.' });
    }

    try {
      const autoBody = {
        system_instruction: {
          parts: [{
            text: [
              "Você decide a próxima ação de um personagem de RPG em primeira pessoa.",
              "Responda APENAS com 1 ou 2 frases curtas em português descrevendo o que o personagem faz ou diz agora.",
              "Não narre consequências, não use aspas, não explique raciocínio, não liste opções.",
              "A ação deve ser coerente com personalidade, história e habilidades do personagem.",
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
              camp.specialAbility?.enabled ? `Habilidade especial permitida mesmo fora deste universo: ${JSON.stringify(camp.specialAbility)}. Considere seus limites; não revele um poder secreto automaticamente.` : "",
              camp.gameStyle ? `Estilo de jogo: ${camp.gameStyle}` : "",
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
    return res.status(400).json({ error: 'Campo "messages" ausente ou inválido.' });
  }

  if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
    return res.status(400).json({ error: 'Campo "systemPrompt" ausente.' });
  }

  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      generationConfig: { maxOutputTokens: req.body?.economyMode === true ? 1024 : 2048, temperature: 0.9 },
      system_instruction: { parts: [{ text: systemPrompt }] },
    };

    const text = useGrounding
      ? await chamarGeminiComBusca(body, MODELO_GM)
      : await chamarGemini(body, MODELO_GM);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("Todas as chaves Gemini falharam. Último erro:", e.message);
    return respondError(e);
  }
}
