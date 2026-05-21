// pages/api/gm.js

// ── Configurações ──────────────────────────────────────────────────────
const TIMEOUT_MS  = 15_000;

// gemini-1.5-pro-latest → nome correto na API v1beta
// gemini-2.0-flash      → suporte a google_search
const MODELO_GM   = "gemini-1.5-pro-latest";
const MODELO_LORE = "gemini-2.0-flash";

// ── Monta lista de chaves sem duplicatas ───────────────────────────────
const getTodasChaves = () => {
  // Busca tanto GEMINI_KEY quanto GEMINI_API_KEY para garantir compatibilidade
  const chaves = [
    process.env.GEMINI_KEY_1, process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_KEY_2, process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_KEY_3, process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_KEY_4, process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_KEY_5, process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_KEY_6, process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_KEY_7, process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_KEY,   process.env.GEMINI_API_KEY,
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
  const chaves = getTodasChaves();

  if (chaves.length === 0) {
    console.error('❌ Nenhuma API key Gemini configurada');
    return res.status(500).json({ error: "Nenhuma chave de API configurada." });
  }

  // ── Rotação round-robin simplificada (Inspirada no RPG_TOP) ───────
  const comRotacao = async (body, modelo) => {
    // Embaralha as chaves para distribuir a carga
    const shuffled = [...chaves].sort(() => Math.random() - 0.5);
    let lastErr = null;

    for (const key of shuffled) {
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

        clearTimeout(timer);

        if (response.status === 429 || response.status === 503) {
          console.warn(`⚠️ Rate limit ou indisponibilidade na chave, tentando a próxima...`);
          lastErr = new Error(`Erro ${response.status}: Rate limit/Indisponibilidade`);
          continue; // Pula para a próxima chave
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Erro HTTP ${response.status}:`, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`API error ${data.error.code}: ${data.error.message}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error("Resposta vazia do Gemini");
        }

        return text;

      } catch (error) {
        clearTimeout(timer);
        lastErr = error;
        // Em caso de erro de timeout ou outro erro, o loop continua e tenta a próxima chave
        console.warn(`⚠️ Falha na chamada: ${error.message}. Tentando próxima chave...`);
      }
    }

    throw lastErr ?? new Error("Todas as chaves falharam ou estão em rate limit.");
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
        tools: [{ google_search: {} }],
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
