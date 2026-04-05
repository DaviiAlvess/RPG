import { useState, useEffect, useRef } from "react";
import Head from "next/head";

const CHARACTER_BG = `Edric Yronwood tem 26 anos e é Lorde de Pedra Sangrenta, Guardião das Marches Dornesas.
Sua casa foi saqueada por Maegor Targaryen durante a guerra iniciada em 8 d.C. Seu pai, Lorde Anders Yronwood, morreu defendendo os portões de Pedra Sangrenta enquanto Edric tinha apenas 10 anos.
Cresceu num castelo em ruínas, reconstruiu tudo com mão firme. É leal à Casa Martell por conveniência estratégica, não por amor — e não esquece que os Martell não conseguiram proteger Dorne.
Personalidade: orgulhoso, calculista, justo, desconfia de sorrisos que chegam antes das palavras.
Habilidades: combate com armas pesadas (machado e espada bastarda), liderança militar, política, equitação no deserto, genealogia e história de Dorne.`;

const SYSTEM_PROMPT = `Você é o Mestre de um RPG de texto imersivo ambientado no universo de Crônicas de Gelo e Fogo, logo após a guerra iniciada em 8 d.C., quando Maegor Targaryen avançou pelo Passo do Príncipe, devastou Dorne e sitiou Lançassolar. O povo dornês entregou a cabeça de Seth para encerrar o cerco. As feridas ainda são recentes.

O jogador controla Edric Yronwood:
${CHARACTER_BG}

REGRAS ABSOLUTAS:
- Narre sempre em português brasileiro, com linguagem épica e cinematográfica
- Crie tensão dramática real — escolhas têm consequências permanentes
- Descreva cenários com riqueza sensorial: calor do deserto, cheiro de especiarias ou sangue, sons de batalha ou corte
- Respeite o lore: Dorne, Marches, Casa Yronwood, Maegor, Casa Martell, geopolítica pós-guerra
- No final de CADA resposta, ofereça exatamente 3 opções numeradas de ação
- Ao final de cada cena, adicione obrigatoriamente uma linha: IMAGE_PROMPT: [prompt em inglês descrevendo a cena visualmente, estilo Game of Thrones, sem personagens genéricos, foco em paisagem/atmosfera/arquitetura dornesa]
- Seja criativo, implacável e justo. Westeros não perdoa erros.`;

const extractImagePrompt = (text) => {
  const match = text.match(/IMAGE_PROMPT:\s*(.+)/i);
  return match ? match[1].trim() : null;
};

const cleanText = (text) => text.replace(/IMAGE_PROMPT:\s*.+/gi, "").trim();

const generateImage = (prompt) => {
  const full = `${prompt}, Dorne desert, Game of Thrones cinematic style, dramatic golden light, dusty atmosphere, photorealistic, 8k, no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=900&height=360&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
};

const STORAGE_KEY = "edric-rpg-save-v3";

export default function RPG() {
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sceneImage, setSceneImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [showChar, setShowChar] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setMessages(data.messages || []);
        setDisplayMessages(data.display || []);
        setSceneImage(data.image || null);
        setStarted(data.started || false);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, loading]);

  const save = (msgs, display, img, isStarted) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: msgs, display: display, image: img, started: isStarted }));
    } catch (e) {}
  };

  const callGM = async (msgHistory) => {
    const res = await fetch("/api/gm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgHistory, systemPrompt: SYSTEM_PROMPT }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  };

  const sendMessage = async (userText) => {
    if (!userText.trim() || loading) return;
    setInput("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.blur();

    const userEntry = { role: "user", content: userText };
    const newMsgs = [...messages, userEntry];
    const newDisplay = [...displayMessages, { type: "user", text: userText }];
    setMessages(newMsgs);
    setDisplayMessages(newDisplay);

    try {
      const raw = await callGM(newMsgs);
      const imagePrompt = extractImagePrompt(raw);
      const clean = cleanText(raw);

      const assistantEntry = { role: "assistant", content: raw };
      const finalMsgs = [...newMsgs, assistantEntry];
      const finalDisplay = [...newDisplay, { type: "gm", text: clean }];

      setMessages(finalMsgs);
      setDisplayMessages(finalDisplay);

      let img = sceneImage;
      if (imagePrompt) {
        setImageLoading(true);
        img = generateImage(imagePrompt);
        setSceneImage(img);
        setImageLoading(false);
      }

      save(finalMsgs, finalDisplay, img, true);
    } catch (e) {
      setDisplayMessages((prev) => [...prev, { type: "error", text: "Erro ao contatar o Mestre. Tente novamente." }]);
    }

    setLoading(false);
  };

  const startGame = () => {
    setStarted(true);
    sendMessage(
      "Iniciar RPG. Narre o cenário atual: onde Edric está, qual é a situação política e social de Dorne logo após a guerra de Maegor, e apresente o primeiro desafio ou dilema que ele enfrenta como Lorde de Pedra Sangrenta."
    );
  };

  const resetGame = () => {
    if (!confirm("Apagar progresso e recomeçar?")) return;
    setMessages([]);
    setDisplayMessages([]);
    setSceneImage(null);
    setStarted(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  };

  return (
    <>
      <Head>
        <title>Edric Yronwood — Crônicas de Gelo e Fogo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>

      <div className="root">
        {/* Header */}
        <div className="header">
          {/* Scene image */}
          {(sceneImage || imageLoading) && (
            <div className="scene-img-wrap">
              {sceneImage && (
                <img
                  src={sceneImage}
                  alt="cena"
                  className={`scene-img ${imageLoading ? "dim" : ""}`}
                  onLoad={() => setImageLoading(false)}
                />
              )}
              <div className="scene-overlay" />
              {imageLoading && <div className="scene-loading">✦ GERANDO CENA ✦</div>}
            </div>
          )}

          {/* Title bar */}
          <div className="titlebar">
            <button className="btn-small" onClick={() => setShowChar(!showChar)}>📜 FICHA</button>
            <div className="title-center">
              <div className="subtitle">CRÔNICAS DE GELO E FOGO</div>
              <div className="title">⚔ Edric Yronwood</div>
              <div className="subtitle">LORDE DE PEDRA SANGRENTA</div>
            </div>
            <button className="btn-small" onClick={resetGame}>↺ RESET</button>
          </div>

          {/* Character panel */}
          {showChar && (
            <div className="char-panel">
              <div className="char-label">▸ FICHA DO PERSONAGEM</div>
              <div><span className="dim">Nome:</span> Edric Yronwood</div>
              <div><span className="dim">Título:</span> Lorde de Pedra Sangrenta · Guardião das Marches</div>
              <div><span className="dim">Casa:</span> Yronwood · <span className="dim">Idade:</span> 26</div>
              <div><span className="dim">Fidelidade:</span> Casa Martell — com reservas</div>
              <div className="skills">⚔ Armas pesadas · 🛡 Liderança · 🗣 Política · 🐎 Equitação · 📜 História</div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="messages">
          {!started ? (
            <div className="splash">
              <div className="splash-icon">🏔</div>
              <div className="splash-quote">
                "Pedra Sangrenta ainda cheira a cinzas.<br />
                Seu pai morreu nesses portões.<br />
                Agora Dorne olha para você."
              </div>
              <div className="divider">─── ◆ ───</div>
              <button className="btn-start" onClick={startGame}>⚔ COMEÇAR A JORNADA</button>
            </div>
          ) : (
            displayMessages.map((msg, i) => (
              <div key={i}>
                {msg.type === "gm" && (
                  <div className="bubble-gm">
                    <div className="bubble-label">✦ MESTRE ✦</div>
                    {msg.text}
                  </div>
                )}
                {msg.type === "user" && (
                  <div className="bubble-user-wrap">
                    <div className="bubble-user">{msg.text}</div>
                  </div>
                )}
                {msg.type === "error" && (
                  <div className="bubble-error">{msg.text}</div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="loading-text">✦ O MESTRE TECE O DESTINO ✦</div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {started && (
          <div className="input-area">
            <textarea
              ref={textareaRef}
              className="input-box"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="O que Edric faz?"
              rows={2}
            />
            <button
              className={`btn-send ${loading || !input.trim() ? "disabled" : ""}`}
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              ⚔
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #080608; overflow: hidden; }
        body { -webkit-font-smoothing: antialiased; }
      `}</style>

      <style jsx>{`
        .root {
          font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
          color: #c9a96e;
          background: #080608;
          display: flex;
          flex-direction: column;
          height: 100dvh;
          max-width: 500px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }

        /* Header */
        .header {
          flex-shrink: 0;
          background: linear-gradient(180deg, #100800 0%, #080608 100%);
          border-bottom: 1px solid #1e1200;
          z-index: 10;
        }

        .scene-img-wrap {
          position: relative;
          width: 100%;
          height: 180px;
          overflow: hidden;
        }
        .scene-img {
          width: 100%; height: 100%; object-fit: cover;
          opacity: 0.75;
          transition: opacity 0.8s;
        }
        .scene-img.dim { opacity: 0.3; }
        .scene-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(0deg, #080608 0%, transparent 40%, rgba(8,6,8,0.4) 100%);
        }
        .scene-loading {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          color: #5a3a10; font-size: 11px; letter-spacing: 3px;
        }

        .titlebar {
          padding: 10px 14px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        .title-center { text-align: center; flex: 1; }
        .subtitle { font-size: 8px; letter-spacing: 4px; color: #3a2410; margin-bottom: 2px; }
        .title { font-size: 16px; font-weight: bold; color: #d4a843; letter-spacing: 1px; }

        .btn-small {
          background: transparent;
          border: 1px solid #2a1800;
          border-radius: 4px;
          color: #6b4a1a;
          font-size: 9px;
          padding: 5px 8px;
          cursor: pointer;
          letter-spacing: 1px;
          white-space: nowrap;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }

        .char-panel {
          margin: 0 12px 10px;
          background: #0d0800;
          border: 1px solid #1e1200;
          border-radius: 6px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.8;
          color: #a07840;
        }
        .char-label { color: #d4a843; font-size: 9px; letter-spacing: 2px; margin-bottom: 6px; }
        .dim { color: #6b4a1a; }
        .skills { margin-top: 6px; color: #5a3a10; font-size: 10px; }

        /* Messages */
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          -webkit-overflow-scrolling: touch;
        }

        .splash {
          text-align: center;
          margin-top: 50px;
          padding: 0 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .splash-icon { font-size: 40px; opacity: 0.8; }
        .splash-quote {
          font-size: 14px; color: #a07840; line-height: 2;
          font-style: italic; letter-spacing: 0.3px;
        }
        .divider { color: #3a2410; font-size: 12px; }
        .btn-start {
          background: linear-gradient(135deg, #5a1a00, #2a0d00);
          border: 1px solid #8b5a14;
          color: #d4a843;
          padding: 14px 36px;
          font-size: 13px;
          cursor: pointer;
          border-radius: 4px;
          letter-spacing: 3px;
          font-family: inherit;
          box-shadow: 0 0 20px rgba(139,90,20,0.2);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .bubble-gm {
          background: linear-gradient(135deg, #0d0800, #100a00);
          border: 1px solid #1e1200;
          border-left: 3px solid #5a2a00;
          border-radius: 6px;
          padding: 14px;
          font-size: 13px;
          line-height: 1.9;
          color: #c4a060;
          white-space: pre-wrap;
        }
        .bubble-label {
          font-size: 8px; letter-spacing: 3px;
          color: #3a2410; margin-bottom: 10px;
        }

        .bubble-user-wrap { display: flex; justify-content: flex-end; }
        .bubble-user {
          background: #0a0600;
          border: 1px solid #1e1200;
          border-right: 3px solid #8b5a14;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 12px;
          color: #8b6930;
          max-width: 82%;
          font-style: italic;
        }

        .bubble-error {
          text-align: center;
          color: #7a2020;
          font-size: 11px;
          padding: 8px;
        }

        .loading-text {
          text-align: center;
          color: #3a2410;
          font-size: 10px;
          letter-spacing: 3px;
          padding: 16px 0;
          animation: pulse 1.5s infinite;
        }

        /* Input */
        .input-area {
          flex-shrink: 0;
          padding: 10px 12px;
          padding-bottom: max(10px, env(safe-area-inset-bottom));
          border-top: 1px solid #1e1200;
          background: #080608;
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .input-box {
          flex: 1;
          background: #0d0800;
          border: 1px solid #1e1200;
          border-radius: 8px;
          padding: 10px 12px;
          color: #c4a060;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          resize: none;
          line-height: 1.5;
          -webkit-appearance: none;
        }
        .input-box::placeholder { color: #3a2410; }
        .btn-send {
          background: linear-gradient(135deg, #5a1a00, #2a0d00);
          border: 1px solid #8b5a14;
          color: #d4a843;
          padding: 0;
          width: 48px;
          height: 48px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 20px;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .btn-send.disabled {
          background: #0d0800;
          border-color: #1e1200;
          color: #2a1800;
          cursor: not-allowed;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        /* Scrollbar */
        .messages::-webkit-scrollbar { width: 3px; }
        .messages::-webkit-scrollbar-track { background: transparent; }
        .messages::-webkit-scrollbar-thumb { background: #2a1800; border-radius: 2px; }
      `}</style>
    </>
  );
}
