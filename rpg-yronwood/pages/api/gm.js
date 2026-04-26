// pages/api/gm.js

import { keyManagement } from '../../lib/supabase';

// ── Configurações ──────────────────────────────────────────────────────
const TIMEOUT_MS  = 10_000;
const COOLDOWN_MS = 30_000;

// gemini-1.5-pro-latest → nome correto na API v1beta (sem sufixo causa 404)
// gemini-2.0-flash      → único que suporta { google_search: {} } nativamente
const MODELO_GM   = "gemini-1.5-pro-latest";
const MODELO_LORE = "gemini-2.0-flash";

// ── Monta lista de chaves sem duplicatas ───────────────────────────────
const getTodasChaves = () => {
  const chaves = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5,
    process.env.GEMINI_KEY_6,
    process.env.GEMINI_KEY_7,
    process.env.GEMINI_KEY,
  ].filter(Boolean);

  return [...new Set(chaves)];
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, systemPrompt, useLoreSearch, world } = req.body ?? {};

  // ── Validação básica ───────────────────────────────────────────────
  if (!useLoreSearch && (!Array.isArray(messages) || !systemPrompt)) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes: messages, systemPrompt." });
  }
  if (useLoreSearch && !world) {
    return res.status(400).json({ error: "Campo obrigatório ausente: world." });
  }

  // ── Carrega e valida chaves ────────────────────────────────────────
  const todasChaves = getTodasChaves();

  if (todasChaves.length === 0) {
    console.error('❌ Nenhuma API key Gemini configurada');
    return res.status(500).json({ error: "Nenhuma chave de API configurada." });
  }

  console.log(`✅ ${todasChaves.length} chaves Gemini configuradas`);

  await keyManagement.cleanupExpiredCooldowns();
  const cooldownsFromDb = await keyManagement.getCooldowns();

  const chaves = todasChaves.filter((_, i) => {
    const liberadaEm = cooldownsFromDb[i];
    return !liberadaEm || Date.now() >= liberadaEm;
  });

  const chavesParaUsar = chaves.length > 0 ? chaves : todasChaves;
  const indicesParaUsar = chavesParaUsar.map((k) => todasChaves.indexOf(k));

  // ── Chamada à API Gemini ───────────────────────────────────────────
  const callGemini = async (key, body, modelo) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      console.log(`🔍 Chamando ${modelo} com chave ${key.substring(0, 10)}...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      console.log(`📊 Status HTTP: ${response.status}`);

      if (response.status === 429) {
        console.warn("⚠️ Rate limit atingido");
        throw Object.assign(new Error("Rate limit atingido"), { rateLimited: true, status: 429 });
      }

      if (response.status === 403) {
        console.error("❌ API key inválida ou sem permissão");
        throw Object.assign(new Error("API key inválida"), { invalidKey: true, status: 403 });
      }

      if (response.status === 400) {
        const errorData = await response.json();
        console.error("❌ Bad Request:", errorData);
        throw Object.assign(new Error("Requisição inválida"), { badRequest: true, details: errorData });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error("❌ Erro da API:", data.error);
        throw new Error(`API error ${data.error.code}: ${data.error.message}`);
      }

      if (!data.candidates?.[0]) {
        console.error("❌ Resposta vazia do Gemini");
        throw new Error("Resposta vazia do Gemini");
      }

      const text = data.candidates[0].content.parts[0].text;
      console.log(`✅ Resposta recebida: ${text.length} caracteres`);

      return text;

    } catch (error) {
      if (error.name === "AbortError") {
        console.error("❌ Timeout da requisição");
        throw new Error("Timeout da requisição");
      }
      console.error("❌ Erro na chamada:", error.message);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  // ── Rotação round-robin com cooldown ──────────────────────────────
  const comRotacao = async (body, modelo) => {
    const total = indicesParaUsar.length;
    const inicioAleatorio = Math.floor(Math.random() * total);
    let lastErr = null;

    for (let tentativa = 0; tentativa < total; tentativa++) {
      const slot = (inicioAleatorio + tentativa) % total;
      const idx  = indicesParaUsar[slot];
      const key  = todasChaves[idx];

      try {
        return await callGemini(key, body, modelo);
      } catch (e) {
        if (e.rateLimited) {
          await keyManagement.addCooldown(idx, COOLDOWN_MS);
          console.warn(`Chave ${idx + 1} em rate-limit — pausada por ${COOLDOWN_MS}ms.`);
        } else if (e.name === "AbortError") {
          console.warn(`Chave ${idx + 1} timeout.`);
        } else {
          console.warn(`Chave ${idx + 1} erro: ${e.message}`);
        }
        lastErr = e;
      }
    }

    throw lastErr ?? new Error("Todas as chaves falharam ou estão em cooldown.");
  };

  // ══════════════════════════════════════════════════════════════════
  // MODO: Busca de lore com Google Search grounding
  // ══════════════════════════════════════════════════════════════════
  if (useLoreSearch) {
    try {
      const loreBody = {
        system_instruction: {
          parts: [{
            text: `Você é um pesquisador especialista em lore de animes, mangás, jogos, livros e universos fictícios.
Sua tarefa: pesquisar e resumir as informações essenciais de um universo para uso em RPG de texto.
Responda SOMENTE com o resumo em português brasileiro, sem introduções, sem markdown, sem títulos.
Inclua obrigatoriamente: período/era, facções e organizações, personagens icônicos com suas habilidades, sistema de poderes/magia, conflitos centrais, locais importantes, regras e leis do universo.`,
          }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `Pesquise e resuma o lore completo do universo "${world}" para uso como base de um RPG de texto. Use fontes atualizadas e precisas.` }],
        }],
        tools: [{ google_search: {} }], // sintaxe correta para gemini-2.0-flash
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      };

      const lore = await comRotacao(loreBody, MODELO_LORE);
      return res.status(200).json({ lore: lore ?? "" });
    } catch (e) {
      console.error("Erro no lore search:", e.message);
      return res.status(200).json({ lore: "" });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // MODO: Narração normal do Mestre
  // ══════════════════════════════════════════════════════════════════
  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const gmBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 8192, temperature: 0.9 },
    };

    const text = await comRotacao(gmBody, MODELO_GM);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("Erro geral:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
