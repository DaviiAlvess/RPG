export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, systemPrompt } = req.body;

 
  const chavesDisponiveis = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5, // Quinta chave
    process.env.GEMINI_KEY_6  // Sexta chave
  ].filter(Boolean);

  if (chavesDisponiveis.length === 0) {
    return res.status(500).json({ error: "Nenhuma chave de API configurada no servidor." });
  }

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.9,
    }
  });

  // 2. Função que faz a tentativa
  const attemptFetch = async (key) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      }
    );

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || !data.candidates[0]) throw new Error("Sem resposta do Gemini.");

    return data.candidates[0].content.parts[0].text;
  };

  // 3. Sistema de Rotação Automática (Iterando sobre o Array)
  try {
    let text = null;
    let lastError = null;

    // O código vai testar chave por chave...
    for (let i = 0; i < chavesDisponiveis.length; i++) {
      try {
        text = await attemptFetch(chavesDisponiveis[i]);
        // Se deu certo, ele para o loop na mesma hora e segue o jogo!
        break; 
      } catch (error) {
        console.warn(`Falha na Chave ${i + 1}: ${error.message}. Tentando a próxima...`);
        lastError = error;
      }
    }

    // Se o loop terminou e o 'text' ainda é nulo, significa que TODAS as chaves falharam.
    if (!text) {
      throw lastError || new Error("Todas as chaves falharam.");
    }

    res.status(200).json({ text });
    
  } catch (finalError) {
    console.error("Erro geral da API:", finalError.message);
    res.status(500).json({ error: finalError.message });
  }
}
