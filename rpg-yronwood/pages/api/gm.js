// pages/api/gm.js

// ── Configurações ──────────────────────────────────────────────────────
const TIMEOUT_MS  = 30_000; // Aumentado para 30 segundos para evitar cortes

// Vamos usar o modelo Flash, que é muito mais rápido e estável para RPG
const MODELO_GM   = "gemini-2.0-flash";
const MODELO_LORE = "gemini-2.0-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, systemPrompt, useLoreSearch, world } = req.body ?? {};

  // ── Validação básica ───────────────────────────────────────────────
  if (!useLoreSearch && (!Array.isArray(messages) || !systemPrompt)) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes: messages, systemPrompt." });
  }

  // ── Carrega e valida chaves ────────────────────────────────────────
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

  const chavesUnicas = [...new Set(chaves)];

  if (chavesUnicas.length === 0) {
    console.error('❌ Nenhuma API key Gemini configurada no servidor.');
    return res.status(500).json({ error: "Nenhuma chave de API configurada." });
  }

  // ── Rotação round-robin igual ao RPG_TOP ────────────────────────────
  const comRotacao = async (body, modelo) => {
    // Embaralha as chaves para distribuir a carga (evita usar sempre a mesma)
    const shuffled = [...chavesUnicas].sort(() => Math.random() - 0.5);
    let lastErr = null;

    for (const key of shuffled) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        console.log(`🔍 A chamar modelo ${modelo} com chave terminada em ...${key.slice(-4)}`);

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

        const data = await response.json();

        // Se for limite de uso (429) ou erro interno do Google (503), pula para a próxima chave
        if (response.status === 429 || response.status === 503) {
          console.warn(`⚠️ Rate limit ou erro 503 na chave. A tentar a próxima...`);
          lastErr = new Error(`HTTP ${response.status}`);
          continue; 
        }

        if (!response.ok) {
          console.error(`❌ Erro HTTP ${response.status}:`, data);
          // Em caso de chave inválida ou erro no prompt, regista o erro mas tenta a próxima
          lastErr = new Error(`HTTP ${response.status}: ${data?.error?.message || "Erro desconhecido"}`);
          continue;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error("Resposta vazia da API Gemini");
        }

        console.log("✅ Resposta recebida com sucesso!");
        return text;

      } catch (error) {
        clearTimeout(timer);
        lastErr = error;
        console.warn(`⚠️ Falha na requisição: ${error.message}. A tentar próxima chave...`);
      }
    }

    throw lastErr ?? new Error("Todas as chaves falharam.");
  };

  // ══════════════════════════════════════════════════════════════════
  // MODO: Busca de lore com Google Search
  // ══════════════════════════════════════════════════════════════════
  if (useLoreSearch) {
    try {
      const loreBody = {
        system_instruction: {
          parts: [{
            text: `Você é um pesquisador especialista em lore. Resuma as informações essenciais do universo solicitado para RPG. Responda APENAS com o resumo em português brasileiro.`,
          }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `Pesquise e resuma o lore completo do universo "${world}".` }],
        }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      };

      const lore = await comRotacao(loreBody, MODELO_LORE);
      return res.status(200).json({ lore: lore ?? "" });
    } catch (e) {
      console.error("❌ Erro no lore search:", e.message);
      return res.status(200).json({ lore: "" }); // Retorna vazio para não bloquear a criação
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
      generationConfig: { maxOutputTokens: 2048, temperature: 0.9 }, // 2048 é mais seguro para respostas rápidas
    };

    const text = await comRotacao(gmBody, MODELO_GM);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("❌ Erro final:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
