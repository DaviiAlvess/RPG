// pages/api/gm.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, systemPrompt, useLoreSearch, world } = req.body;

  // ── Rotação de chaves ─────────────────────────────────────────────
  const chaves = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5,
    process.env.GEMINI_KEY_6,
  ].filter(Boolean);

  if (chaves.length === 0) {
    return res.status(500).json({ error: "Nenhuma chave de API configurada." });
  }

  const callGemini = async (key, body) => {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    const data = await r.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.candidates?.[0]) throw new Error("Sem resposta do Gemini.");
    return data.candidates[0].content.parts[0].text;
  };

  const comRotacao = async (body) => {
    let lastErr = null;
    for (let i = 0; i < chaves.length; i++) {
      try { return await callGemini(chaves[i], body); }
      catch (e) { console.warn(`Chave ${i + 1} falhou: ${e.message}`); lastErr = e; }
    }
    throw lastErr || new Error("Todas as chaves falharam.");
  };

  // ══════════════════════════════════════════════════════════════════
  // MODO: Busca de lore com Google Search grounding
  // ══════════════════════════════════════════════════════════════════
  if (useLoreSearch && world) {
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

      const lore = await comRotacao(loreBody);
      return res.status(200).json({ lore: lore || "" });
    } catch (e) {
      console.error("Erro no lore search:", e.message);
      // Falha silenciosa — jogo começa sem lore extra
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

    const text = await comRotacao(gmBody);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("Erro geral:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
