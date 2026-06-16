// pages/api/gm.js

const MODELO_GM   = "gemini-2.5-flash-lite";
const MODELO_LORE = "gemini-2.5-flash-lite";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { messages, systemPrompt, useLoreSearch, world } = req.body ?? {};

  const API_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5,
    process.env.GEMINI_KEY_6,
    process.env.GEMINI_KEY_7,
    process.env.GEMINI_KEY,
  ].filter(Boolean);

  const chavesUnicas = [...new Set(API_KEYS)];

  if (chavesUnicas.length === 0) {
    return res.status(500).json({ error: "Nenhuma GEMINI_API_KEY configurada no servidor." });
  }

  const chamarGemini = async (body, modelo) => {
    const shuffled = [...chavesUnicas].sort(() => Math.random() - 0.5);
    let lastError = null;

    for (const apiKey of shuffled) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        const data = await geminiRes.json();

        if (geminiRes.status === 429 || geminiRes.status === 503) {
          lastError = data?.error?.message || `HTTP ${geminiRes.status}`;
          continue;
        }

        if (!geminiRes.ok) {
          console.error("Gemini API error:", data);
          const err = new Error(data?.error?.message || "Erro na API Gemini");
          err.fatal = true;
          throw err;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          const err = new Error("Resposta vazia da API Gemini.");
          err.fatal = true;
          throw err;
        }

        return text;
      } catch (err) {
        if (err.fatal) throw err;
        lastError = err.message;
        console.error("Erro ao chamar Gemini com chave:", err);
      }
    }

    throw new Error(lastError || "Todas as chaves API estão com rate limit. Tente em instantes.");
  };

  // ── Modo: busca de lore ────────────────────────────────────────────
  if (useLoreSearch) {
    if (!world) {
      return res.status(400).json({ error: 'Campo "world" ausente.' });
    }

    try {
      const loreBody = {
        system_instruction: {
          parts: [{
            text: "Você é um pesquisador especialista em lore. Resuma as informações essenciais do universo solicitado para RPG. Responda APENAS com o resumo em português brasileiro.",
          }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `Pesquise e resuma o lore completo do universo "${world}".` }],
        }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      };

      const lore = await chamarGemini(loreBody, MODELO_LORE);
      return res.status(200).json({ lore });
    } catch (e) {
      console.error("Erro no lore search:", e.message);
      return res.status(200).json({ lore: "" });
    }
  }

  // ── Modo: narração do Mestre ───────────────────────────────────────
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Campo "messages" ausente ou inválido.' });
  }

  if (!systemPrompt) {
    return res.status(400).json({ error: 'Campo "systemPrompt" ausente.' });
  }

  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      generationConfig: { maxOutputTokens: 2048, temperature: 0.9 },
      system_instruction: { parts: [{ text: systemPrompt }] },
    };

    const text = await chamarGemini(body, MODELO_GM);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("Todas as chaves Gemini falharam. Último erro:", e.message);
    const isRateLimit = e.message?.includes("rate limit") || e.message?.startsWith("HTTP 429");
    return res.status(isRateLimit ? 429 : 500).json({ error: e.message });
  }
}
