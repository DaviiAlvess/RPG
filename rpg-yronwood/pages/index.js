import { useState, useEffect, useRef } from "react";
import Head from "next/head";

// O PROMPT AGORA É UMA FUNÇÃO DINÂMICA
const generateSystemPrompt = (charName, world, charBg) => `Você é o Mestre de um RPG de texto imersivo ambientado no universo de ${world}.

O jogador controla ${charName}:
${charBg}

REGRAS ABSOLUTAS:
- Narre sempre em português brasileiro, com linguagem épica, descritiva e cinematográfica.
- Crie tensão dramática real — escolhas têm consequências permanentes.
- Descreva cenários com riqueza sensorial: temperatura, cheiros, sons do ambiente.
- Respeite fielmente o lore e as regras do universo de ${world}.
- No final de CADA resposta, ofereça exatamente 3 opções numeradas de ação para o jogador.
- Ao final de cada cena, adicione obrigatoriamente uma linha: IMAGE_PROMPT: [prompt em inglês descrevendo a cena visualmente, estilo cinematic, foco em paisagem/atmosfera/arquitetura, sem personagens genéricos, no text]
- Seja criativo, implacável e justo. O mundo não perdoa erros bobos.`;

const extractImagePrompt = (text) => {
  const match = text.match(/IMAGE_PROMPT:\s*(.+)/i);
  return match ? match[1].trim() : null;
};

const cleanText = (text) => text.replace(/IMAGE_PROMPT:\s*.+/gi, "").trim();

// A IMAGEM AGORA SE ADAPTA AO MUNDO ESCOLHIDO
const generateImage = (prompt, world) => {
  const full = `${prompt}, ${world} setting, cinematic style, dramatic lighting, detailed atmosphere, photorealistic, 8k, no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=900&height=360&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
};

const STORAGE_KEY = "rpg-engine-save-v1";

export default function RPG() {
  // Estados do Jogo
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sceneImage, setSceneImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [showChar, setShowChar] = useState(false);
  
  // Novos Estados: Configuração do Personagem e Mundo
  const [setupDone, setSetupDone] = useState(false);
  const [charName, setCharName] = useState("");
  const [world, setWorld] = useState("");
  const [charBg, setCharBg] = useState("");

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Carregar o progresso salvo
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setMessages(data.messages || []);
        setDisplayMessages(data.display || []);
        setSceneImage(data.image || null);
        setStarted(data.started || false);
        setCharName(data.charName || "");
        setWorld(data.world || "");
        setCharBg(data.charBg || "");
        setSetupDone(data.setupDone || false);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, loading]);

  // Função para salvar tudo (incluindo as infos do personagem)
  const save = (msgs, display, img, isStarted, isSetupDone = setupDone) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        messages: msgs, display: display, image: img, started: isStarted,
        charName, world, charBg, setupDone: isSetupDone
      }));
    } catch (e) {}
  };

  const callGM = async (msgHistory) => {
    // Monta o prompt dinâmico na hora de chamar a API
    const dynamicPrompt = generateSystemPrompt(charName, world, charBg);

    const res = await fetch("/api/gm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgHistory, systemPrompt: dynamicPrompt }),
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
        img = generateImage(imagePrompt, world); // Passa o mundo para a imagem
        setSceneImage(img);
        setImageLoading(false);
      }

      save(finalMsgs, finalDisplay, img, true);
    } catch (e) {
      setDisplayMessages((prev) => [...prev, { type: "error", text: "Erro ao contatar o Mestre. Tente novamente." }]);
    }

    setLoading(false);
  };

  const finishSetup = () => {
    if (!charName.trim() || !world.trim() || !charBg.trim()) {
      alert("Preencha todos os campos para iniciar!");
      return;
    }
    setSetupDone(true);
    save(messages, displayMessages, sceneImage, started, true);
  };

  const startGame = () => {
    setStarted(true);
    sendMessage(
      `Iniciar aventura. Narre o cenário atual: onde ${charName} está no universo de ${world}, qual é a situação política/social atual, e apresente o primeiro desafio ou dilema que ele enfrenta.`
    );
  };

  const resetGame = () => {
    if (!confirm("Apagar TUDO (história e personagem) e criar uma nova aventura?")) return;
    setMessages([]);
    setDisplayMessages([]);
    setSceneImage(null);
    setStarted(false);
    setSetupDone(false);
    setCharName("");
    setWorld("");
    setCharBg("");
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  };

  // TELA DE CRIAÇÃO (SETUP)
  if (!setupDone) {
    return (
      <div className="root setup-screen">
        <Head><title>Novo RPG</title></Head>
        <div className="setup-container">
          <h1 className="setup-title">CRIAR AVENTURA</h1>
          <div className="divider">─── ◆ ───</div>
          
          <div className="setup-field">
            <label>Nome do Personagem:</label>
            <input 
              type="text" 
              placeholder="Ex: Gandalf, Edric, V" 
              value={charName} 
              onChange={(e) => setCharName(e.target.value)} 
            />
          </div>

          <div className="setup-field">
            <label>Universo / Mundo:</label>
            <input 
              type="text" 
              placeholder="Ex: Cyberpunk, D&D, Star Wars..." 
              value={world} 
              onChange={(e) => setWorld(e.target.value)} 
            />
          </div>

          <div className="setup-field">
            <label>Ficha / Background:</label>
            <textarea 
              rows={6}
              placeholder="Descreva a história, classe, habilidades, objetivos e personalidade do personagem..."
              value={charBg}
              onChange={(e) => setCharBg(e.target.value)}
            />
          </div>

          <button className="btn-start" onClick={finishSetup}>FORJAR DESTINO ⚔</button>
        </div>
        
        {/* Estilos específicos da tela de Setup */}
        <style jsx>{`
          .setup-screen { display: flex; align-items: center; justify-content: center; padding: 20px; }
          .setup-container { width: 100%; max-width: 400px; background: #0d0800; border: 1px solid #1e1200; padding: 24px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
          .setup-title { color: #d4a843; text-align: center; font-size: 18px; letter-spacing: 4px; margin-bottom: 10px; }
          .divider { color: #3a2410; font-size: 12px; text-align: center; margin-bottom: 20px; }
          .setup-field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
          .setup-field label { color: #a07840; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
          .setup-field input, .setup-field textarea { background: #080608; border: 1px solid #2a1800; color: #c4a060; padding: 10px; border-radius: 4px; font-family: inherit; outline: none; }
          .setup-field input:focus, .setup-field textarea:focus { border-color: #5a3a10; }
          .btn-start { width: 100%; margin-top: 10px; }
        `}</style>
      </div>
    );
  }

  // TELA DO JOGO (Se o setup já foi concluído)
  return (
    <>
      <Head>
        <title>{charName} — {world}</title>
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
              <div className="subtitle">{world.toUpperCase()}</div>
              <div className="title">⚔ {charName}</div>
            </div>
            <button className="btn-small" onClick={resetGame}>↺ NOVO JOGO</button>
          </div>

          {/* Character panel */}
          {showChar && (
            <div className="char-panel">
              <div className="char-label">▸ FICHA DO PERSONAGEM</div>
              <div><span className="dim">Nome:</span> {charName}</div>
              <div><span className="dim">Mundo:</span> {world}</div>
              <div className="skills" style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>{charBg}</div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="messages">
          {!started ? (
            <div className="splash">
              <div className="splash-icon">🌌</div>
              <div className="splash-quote">
                "O universo de {world} aguarda por você.<br />
                As escolhas de {charName} ecoarão pela eternidade."
              </div>
              <div className="divider">─── ◆ ───</div>
              <button className="btn-start" onClick={startGame}>⚔ INICIAR JORNADA</button>
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
              placeholder={`O que ${charName} faz?`}
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

      {/* Mesmos estilos globais e visuais de antes */}
      <style jsx>{`
        .root { font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif; color: #c9a96e; background: #080608; display: flex; flex-direction: column; height: 100dvh; max-width: 500px; margin: 0 auto; position: relative; overflow: hidden; }
        .header { flex-shrink: 0; background: linear-gradient(180deg, #100800 0%, #080608 100%); border-bottom: 1px solid #1e1200; z-index: 10; }
        .scene-img-wrap { position: relative; width: 100%; height: 180px; overflow: hidden; }
        .scene-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.75; transition: opacity 0.8s; }
        .scene-img.dim { opacity: 0.3; }
        .scene-overlay { position: absolute; inset: 0; background: linear-gradient(0deg, #080608 0%, transparent 40%, rgba(8,6,8,0.4) 100%); }
        .scene-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #5a3a10; font-size: 11px; letter-spacing: 3px; }
        .titlebar { padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .title-center { text-align: center; flex: 1; }
        .subtitle { font-size: 8px; letter-spacing: 4px; color: #3a2410; margin-bottom: 2px; }
        .title { font-size: 16px; font-weight: bold; color: #d4a843; letter-spacing: 1px; }
        .btn-small { background: transparent; border: 1px solid #2a1800; border-radius: 4px; color: #6b4a1a; font-size: 9px; padding: 5px 8px; cursor: pointer; letter-spacing: 1px; white-space: nowrap; font-family: inherit; -webkit-tap-highlight-color: transparent; }
        .char-panel { margin: 0 12px 10px; background: #0d0800; border: 1px solid #1e1200; border-radius: 6px; padding: 12px; font-size: 11px; line-height: 1.8; color: #a07840; max-height: 200px; overflow-y: auto; }
        .char-label { color: #d4a843; font-size: 9px; letter-spacing: 2px; margin-bottom: 6px; }
        .dim { color: #6b4a1a; }
        .skills { color: #5a3a10; font-size: 11px; }
        .messages { flex: 1; overflow-y: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 12px; -webkit-overflow-scrolling: touch; }
        .splash { text-align: center; margin-top: 50px; padding: 0 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .splash-icon { font-size: 40px; opacity: 0.8; }
        .splash-quote { font-size: 14px; color: #a07840; line-height: 2; font-style: italic; letter-spacing: 0.3px; }
        .divider { color: #3a2410; font-size: 12px; }
        .btn-start { background: linear-gradient(135deg, #5a1a00, #2a0d00); border: 1px solid #8b5a14; color: #d4a843; padding: 14px 36px; font-size: 13px; cursor: pointer; border-radius: 4px; letter-spacing: 3px; font-family: inherit; box-shadow: 0 0 20px rgba(139,90,20,0.2); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .bubble-gm { background: linear-gradient(135deg, #0d0800, #100a00); border: 1px solid #1e1200; border-left: 3px solid #5a2a00; border-radius: 6px; padding: 14px; font-size: 13px; line-height: 1.9; color: #c4a060; white-space: pre-wrap; }
        .bubble-label { font-size: 8px; letter-spacing: 3px; color: #3a2410; margin-bottom: 10px; }
        .bubble-user-wrap { display: flex; justify-content: flex-end; }
        .bubble-user { background: #0a0600; border: 1px solid #1e1200; border-right: 3px solid #8b5a14; border-radius: 6px; padding: 10px 12px; font-size: 12px; color: #8b6930; max-width: 82%; font-style: italic; }
        .bubble-error { text-align: center; color: #7a2020; font-size: 11px; padding: 8px; }
        .loading-text { text-align: center; color: #3a2410; font-size: 10px; letter-spacing: 3px; padding: 16px 0; animation: pulse 1.5s infinite; }
        .input-area { flex-shrink: 0; padding: 10px 12px; padding-bottom: max(10px, env(safe-area-inset-bottom)); border-top: 1px solid #1e1200; background: #080608; display: flex; gap: 8px; align-items: flex-end; }
        .input-box { flex: 1; background: #0d0800; border: 1px solid #1e1200; border-radius: 8px; padding: 10px 12px; color: #c4a060; font-size: 14px; font-family: inherit; outline: none; resize: none; line-height: 1.5; -webkit-appearance: none; }
        .input-box::placeholder { color: #3a2410; }
        .btn-send { background: linear-gradient(135deg, #5a1a00, #2a0d00); border: 1px solid #8b5a14; color: #d4a843; padding: 0; width: 48px; height: 48px; border-radius: 8px; cursor: pointer; font-size: 20px; flex-shrink: 0; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .btn-send.disabled { background: #0d0800; border-color: #1e1200; color: #2a1800; cursor: not-allowed; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .messages::-webkit-scrollbar { width: 3px; }
        .messages::-webkit-scrollbar-track { background: transparent; }
        .messages::-webkit-scrollbar-thumb { background: #2a1800; border-radius: 2px; }
      `}</style>
    </>
  );
}
