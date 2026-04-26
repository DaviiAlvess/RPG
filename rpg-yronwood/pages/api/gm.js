// pages/api/gm.js

import { keyManagement } from '../../lib/supabase';

// ── Configurações ──────────────────────────────────────────────────────
const TIMEOUT_MS = 10_000;
const COOLDOWN_MS = 30_000;

// ── Monta lista de chaves sem duplicatas ───────────────────────────────
const getTodasChaves = () => {
  // FIX BUG 5: GEMINI_KEY entra separado, sem fallback junto com GEMINI_KEY_1
  const chaves = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5,
    process.env.GEMINI_KEY_6,
    process.env.GEMINI_KEY_7,
    process.env.GEMINI_KEY, // entra como slot próprio, sem sobrescrever o 1
  ].filter(Boolean);

  // Remove duplicatas mantendo a ordem
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

  // ── Carrega chaves disponíveis ─────────────────────────────────────
  // FIX BUG 4: validateEnvironment agora está inline e de fato executada
  const todasChaves = getTodasChaves();

  if (todasChaves.length === 0) {
    console.error('❌ Nenhuma API key Gemini configurada');
    return res.status(500).json({ error: "Nenhuma chave de API configurada." });
  }

  console.log(`✅ ${todasChaves.length} chaves Gemini configuradas`);

  // Limpa cooldowns expirados e obtém cooldowns ativos do Supabase
  await keyManagement.cleanupExpiredCooldowns();
  const cooldownsFromDb = await keyManagement.getCooldowns();

  // Remove chaves ainda em cooldown
  const chaves = todasChaves.filter((_, i) => {
    const liberadaEm = cooldownsFromDb[i];
    return !liberadaEm || Date.now() >= liberadaEm;
  });

  // Se TODAS estão em cooldown, usa todas mesmo assim
  const chavesParaUsar = chaves.length > 0 ? chaves : todasChaves;

  // FIX BUG 6: índice sempre mapeado em relação à lista original (todasChaves)
  const indicesParaUsar = chavesParaUsar.map((k) => todasChaves.indexOf(k));

  // ── Chamada à API Gemini ───────────────────────────────────────────
  // FIX BUG 1, 2 e 3: callGemini agora usa o body recebido integralmente.
  // system_instruction, contents, tools e generationConfig chegam à API corretamente.
  const callGemini = async (key, body) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      console.log(`🔍 Chamando Gemini com chave ${key.substring(0, 10)}...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body), // ← usa o body completo passado como parâmetro
          signal: controller.signal,
        }
      );

      console.log(`📊 Status HTTP: ${response.status}`);

      if (response.status === 429) {
        console.warn("⚠️ Rate limit atingido");
        throw Object.assign(new Error("Rate limit atingido"), {
          rateLimited: true,
          status: 429,
        });
      }

      if (response.status === 403) {
        console.error("❌ API key inválida ou sem permissão");
        throw Object.assign(new Error("API key inválida"), {
          invalidKey: true,
          status: 403,
        });
      }

      if (response.status === 400) {
        const errorData = await response.json();
        console.error("❌ Bad Request:", errorData);
        throw Object.assign(new Error("Requisição inválida"), {
          badRequest: true,
          details: errorData,
        });
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
  const comRotacao = async (body) => {
    const total = indicesParaUsar.length;
    const inicioAleatorio = Math.floor(Math.random() * total);
    let lastErr = null;

    for (let tentativa = 0; tentativa < total; tentativa++) {
      const slot = (inicioAleatorio + tentativa) % total;
      const idx = indicesParaUsar[slot];
      const key = todasChaves[idx];

      try {
        const texto = await callGemini(key, body);
        return texto;
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
      // FIX BUG 3: loreBody é passado inteiro para callGemini,
      // incluindo tools: [{ google_search: {} }] e system_instruction
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
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      };

      const lore = await comRotacao(loreBody);
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
    // FIX BUG 2: contents usa o histórico completo e system_instruction
    // chega à API via body completo, não mais ignorado
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const gmBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 8192, temperature: 0.9 },
    };

    const text = await comRotacao(gmBody);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("Erro geral:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
