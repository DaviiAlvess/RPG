export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, systemPrompt } = req.body;

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: "Chave não configurada no servidor." });

  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.9,
          }
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error("Gemini error:", JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message });
    }

    if (!data.candidates || !data.candidates[0]) {
      console.error("No candidates:", JSON.stringify(data));
      return res.status(500).json({ error: "Sem resposta do Gemini." });
    }

    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ text });
  } catch (e) {
    console.error("Handler error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
