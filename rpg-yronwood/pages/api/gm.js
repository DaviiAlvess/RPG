// pages/api/gm.js

import { keyManagement } from '../../lib/supabase';

// ── Cooldown de chaves em rate-limit com Supabase ──────────────────────
// O cooldown agora é persistente através do Supabase
const COOLDOWN_MS = 30_000; // 30 segundos de pausa após rate-limit (otimizado para testes)

// Sem índice global - usamos rotação aleatória para evitar cold start

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
    process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY, // Agora aceita a do README
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

  // Limpa cooldowns expirados e obtém cooldowns ativos do Supabase
  await keyManagement.cleanupExpiredCooldowns();
  const cooldownsFromDb = await keyManagement.getCooldowns();

  // Remove chaves ainda em cooldown
  const chaves = todasChaves.filter((_, i) => {
    const liberadaEm = cooldownsFromDb[i];
    return !liberadaEm || Date.now() >= liberadaEm;
  });

  // Se TODAS estão em cooldown, usa todas mesmo assim (melhor tentar do que recusar)
  const chavesParaUsar = chaves.length > 0 ? chaves : todasChaves;
  const indicesParaUsar = chavesParaUsar.map((k) => todasChaves.indexOf(k));

  // ── Chamada ao Gemini com timeout ─────────────────────────────────
  const TIMEOUT_MS = 8_000; // Reduzido para caber no limite da Vercel (10s)

  const callGemini = async (key, body) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
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

    // Sorteia um ponto de partida para espalhar o peso entre todas as chaves disponíveis!
    const inicioAleatorio = Math.floor(Math.random() * total);
    let lastErr = null;

    for (let tentativa = 0; tentativa < total; tentativa++) {
      const slot = (inicioAleatorio + tentativa) % total;
      const idx = indicesParaUsar[slot];        // índice real na lista original
      const key = todasChaves[idx];

      try {
        const texto = await callGemini(key, body);
        return texto; // Sucesso absoluto, retorna direto!
      } catch (e) {
        if (e.rateLimited) {
          // Agora o upsert do Supabase vai funcionar de verdade
          await keyManagement.addCooldown(idx, COOLDOWN_MS);
          console.warn(`Chave ${idx + 1} em rate-limit — pausada por ${COOLDOWN_MS}ms (salvo no Supabase).`);
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
