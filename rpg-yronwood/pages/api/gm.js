// pages/api/gm.js

const MODELO_GM   = "gemini-2.5-flash-lite";
const MODELO_LORE = "gemini-2.5-flash-lite";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { messages, systemPrompt, useLoreSearch, useCharacterSearch, world, charName } = req.body ?? {};

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
      return res.status(200).json({ character: null, error: e.message });
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
            text: "Você é um pesquisador especialista em lore. Resuma APENAS fatos canônicos e estabelecidos do universo solicitado para RPG. Não invente eventos, personagens ou regras. Responda APENAS com o resumo em português brasileiro.",
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
      return res.status(200).json({ action: "" });
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
