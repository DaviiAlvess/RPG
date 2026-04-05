export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, systemPrompt } = req.body;

  // 1. Pega as duas chaves das variáveis de ambiente
  const GEMINI_KEY_1 = process.env.GEMINI_KEY_1;
  const GEMINI_KEY_2 = process.env.GEMINI_KEY_2;

  if (!GEMINI_KEY_1 && !GEMINI_KEY_2) {
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

  // 2. Função isolada para tentar fazer a requisição com uma chave específica
  const attemptFetch = async (key) => {
    if (!key) throw new Error("Chave ausente");
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      }
    );

    const data = await response.json();

    if (data.error) {
      // Força um erro para que o try/catch principal consiga interceptar e pular para a próxima chave
      throw new Error(data.error.message);
    }

    if (!data.candidates || !data.candidates[0]) {
      throw new Error("Sem resposta do Gemini.");
    }

    return data.candidates[0].content.parts[0].text;
  };

  // 3. Sistema de Fallback (Rotação de Chaves)
  try {
    let text;
    
    try {
      // TENTATIVA 1
      text = await attemptFetch(GEMINI_KEY_1);
    } catch (error1) {
      console.warn("Falha na Chave 1:", error1.message, "-> Tentando a Chave 2...");
      
      
      text = await attemptFetch(GEMINI_KEY_2);
    }

    // Se chegou aqui, uma das duas funcionou
    res.status(200).json({ text });
    
  } catch (finalError) {
    // Se a TENTATIVA 2 também falhar, o erro é finalmente enviado para o jogador ver
    console.error("Erro em ambas as chaves:", finalError.message);
    res.status(500).json({ error: finalError.message });
  }
}
