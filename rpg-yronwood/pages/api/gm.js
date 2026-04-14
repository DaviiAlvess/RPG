// pages/api/gm.js

// ── Cooldown de chaves em rate-limit ──────────────────────────────
// Guarda o timestamp até quando cada chave está de pausa.
// Em serverless isso vive por instância, mas já ajuda muito.
const keyCooldown = {};
const COOLDOWN_MS = 60_000; // 1 minuto de pausa após rate-limit

// Índice global para round-robin base
let keyIndex = 0;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, systemPrompt, useLoreSearch, world } = req.body ?? {};

  // ── Validação básica ──────────────────────────────────────────────
  if (!useLoreSearch && (!Array.isArray(messages) || !systemPrompt)) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes: messages, systemPrompt." });
  }
  if (useLoreSearch && !world) {
    return res.status(400).json({ error: "Campo obrigatório ausente: world." });
  }

  // ── Carrega e filtra chaves disponíveis ───────────────────────────
  const todasChaves = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5,
    process.env.GEMINI_KEY_6,
    process.env.GEMINI_KEY_7,
  ].filter(Boolean);

  if (todasChaves.length === 0) {
    return res.status(500).json({ error: "Nenhuma chave de API configurada." });
  }

  // Remove chaves ainda em cooldown
  const agora = Date.now();
  const chaves = todasChaves.filter((_, i) => {
    const liberadaEm = keyCooldown[i];
    return !liberadaEm || agora >= liberadaEm;
  });

  // Se TODAS estão em cooldown, usa todas mesmo assim (melhor tentar do que recusar)
  const chavesParaUsar = chaves.length > 0 ? chaves : todasChaves;
  const indicesParaUsar = chavesParaUsar.map((k) => todasChaves.indexOf(k));

  // ── Chamada ao Gemini com timeout ─────────────────────────────────
  const TIMEOUT_MS = 25_000;

  const callGemini = async (key, body) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (r.status === 429) {
        throw Object.assign(new Error("Rate limit atingido."), { rateLimited: true });
      }

      const data = await r.json();
      if (data.error) throw new Error(`API error ${data.error.code}: ${data.error.message}`);
      if (!data.candidates?.[0]) throw new Error("Resposta vazia do Gemini.");

      return data.candidates[0].content.parts[0].text;
    } finally {
      clearTimeout(timer);
    }
  };

  // ── Rotação round-robin com cooldown ──────────────────────────────
  const comRotacao = async (body) => {
    const total = indicesParaUsar.length;

    // Ponto de partida: avança o keyIndex global entre chamadas
    const inicio = keyIndex % total;
    let lastErr = null;

    for (let tentativa = 0; tentativa < total; tentativa++) {
      const slot = (inicio + tentativa) % total;
      const idx = indicesParaUsar[slot];        // índice real na lista original
      const key = todasChaves[idx];

      try {
        const texto = await callGemini(key, body);
        // Sucesso: avança o ponteiro para a próxima chave na próxima chamada
        keyIndex = (slot + 1) % total;
        return texto;
      } catch (e) {
        if (e.rateLimited) {
          // Coloca a chave em cooldown por 1 minuto
          keyCooldown[idx] = Date.now() + COOLDOWN_MS;
          console.warn(`Chave ${idx + 1} em rate-limit — pausada por 60s.`);
        } else if (e.name === "AbortError") {
          console.warn(`Chave ${idx + 1} timeout.`);
        } else {
          console.warn(`Chave ${idx + 1} erro: ${e.message}`);
        }
        lastErr = e;
      }
    }

    throw lastErr ?? new Error("Todas as chaves falharam.");
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
