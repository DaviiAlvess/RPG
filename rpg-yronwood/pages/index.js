import { useState, useEffect, useRef } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────
const extractImagePrompt = (text) => {
  const m = text.match(/IMAGE_PROMPT:\s*(.+)/i);
  return m ? m[1].trim() : null;
};
const cleanText = (t) => t.replace(/IMAGE_PROMPT:\s*.+/gi, "").trim();
const generateImage = (prompt, world) => {
  const full = `${prompt}, ${world || "fantasy"} setting, cinematic, dramatic lighting, photorealistic, 8k, no text, no people`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=900&height=360&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
};
const uid = () => `c${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "";

// ─── Aparência — opções ───────────────────────────────────────────────
const APP_OPTIONS = {
  body:      ["Magro",       "Atlético",   "Médio",        "Robusto",    "Gordo"],
  height:    ["Muito baixo", "Baixo",      "Médio",        "Alto",       "Muito alto"],
  skin:      ["Muito clara", "Clara",      "Morena clara", "Morena",     "Negra"],
  hairLen:   ["Careca",      "Curto",      "Médio",        "Longo",      "Muito longo"],
  hairColor: ["Preto",       "Castanho",   "Loiro",        "Ruivo",      "Branco/Grisalho"],
  hairStyle: ["Liso",        "Ondulado",   "Cacheado",     "Crespo",     "Raspado/Moicano"],
  eyeColor:  ["Castanhos",   "Verdes",     "Azuis",        "Cinzas",     "Pretos"],
  eyeShape:  ["Amendoados",  "Redondos",   "Puxados",      "Pequenos",   "Grandes"],
  face:      ["Oval",        "Quadrada",   "Redonda",      "Triangular", "Alongada"],
  extras:    ["Nenhum",      "Cicatriz",   "Tatuagem",     "Barba",      "Sardas"],
};
const APP_LABELS = {
  body: "Tipo de corpo", height: "Altura", skin: "Tom de pele",
  hairLen: "Comprimento do cabelo", hairColor: "Cor do cabelo", hairStyle: "Estilo do cabelo",
  eyeColor: "Cor dos olhos", eyeShape: "Formato dos olhos", face: "Formato do rosto", extras: "Marca especial",
};
const DEFAULT_APP = Object.fromEntries(Object.keys(APP_OPTIONS).map((k) => [k, APP_OPTIONS[k][2]]));
const HAIR_COLORS = { "Preto": "#0a0a0a", "Castanho": "#5c3317", "Loiro": "#c8a84b", "Ruivo": "#8b2500", "Branco/Grisalho": "#a0a0a0" };
const EYE_COLORS  = { "Castanhos": "#5c3317", "Verdes": "#2d6a4f", "Azuis": "#1a4a7a", "Cinzas": "#607080", "Pretos": "#0a0a14" };

const buildAppearance = (a) =>
  `Aparência: corpo ${a.body?.toLowerCase()}, estatura ${a.height?.toLowerCase()}, pele ${a.skin?.toLowerCase()}, cabelo ${a.hairLen?.toLowerCase()} ${a.hairColor?.toLowerCase()} ${a.hairStyle?.toLowerCase()}, olhos ${a.eyeColor?.toLowerCase()} ${a.eyeShape?.toLowerCase()}, rosto ${a.face?.toLowerCase()}${a.extras && a.extras !== "Nenhum" ? `, marca especial: ${a.extras?.toLowerCase()}` : ""}.`;

// ─── Preset ───────────────────────────────────────────────────────────
const PRESET = {
  world: "Westeros — Crônicas de Gelo e Fogo",
  worldBg: "Logo após a guerra de Maegor Targaryen em 8 d.C. Dorne foi devastada. O povo dornês entregou a cabeça de Seth para encerrar o cerco. As feridas ainda são recentes.",
  isKnownIP: true,
  charName: "Edric Yronwood",
  charTitle: "Lorde de Pedra Sangrenta, Guardião das Marches Dornesas",
  charAge: "26",
  charBg: "Sua casa foi saqueada por Maegor Targaryen. Seu pai morreu defendendo os portões quando Edric tinha 10 anos. Reconstruiu tudo com mão firme.",
  charPersonality: "Orgulhoso, calculista, justo. Desconfia de sorrisos que chegam antes das palavras.",
  charSkills: "Armas pesadas, liderança militar, política dornesa, equitação no deserto, genealogia.",
  appearance: { body: "Atlético", height: "Alto", skin: "Morena", hairLen: "Curto", hairColor: "Preto", hairStyle: "Liso", eyeColor: "Castanhos", eyeShape: "Amendoados", face: "Quadrada", extras: "Cicatriz" },
  useImages: true,
};

// ─── System prompt ────────────────────────────────────────────────────
const buildPrompt = (c, loreExtra) =>
  [
    `Você é o Mestre de um RPG de texto imersivo ambientado em: ${c.world}.`,
    loreExtra
      ? `LORE OFICIAL DO UNIVERSO (pesquisado na internet):\n${loreExtra}`
      : `CONTEXTO DO MUNDO: ${c.worldBg}`,
    ``,
    `O jogador controla: ${c.charName}${c.charTitle ? ` — ${c.charTitle}` : ""}.`,
    c.charAge       ? `Idade: ${c.charAge} anos.`          : "",
    c.charBg        ? `História: ${c.charBg}`              : "",
    c.charPersonality ? `Personalidade: ${c.charPersonality}` : "",
    c.charSkills    ? `Habilidades: ${c.charSkills}`       : "",
    c.appearance    ? buildAppearance(c.appearance)        : "",
    ``,
    `REGRAS ABSOLUTAS:`,
    `- Narre SEMPRE em português brasileiro, com linguagem épica e cinematográfica`,
    `- Crie tensão dramática real — escolhas têm consequências permanentes`,
    `- Descreva cenários com riqueza sensorial: sons, cheiros, texturas, clima`,
    `- Respeite rigorosamente o lore, personagens, poderes e eventos do universo`,
    `- No final de CADA resposta, ofereça exatamente 3 opções numeradas de ação`,
    c.useImages
      ? `- Ao final de cada cena: IMAGE_PROMPT: [prompt em inglês, cinematográfico, foco em cenário/atmosfera, sem nomes, no text]`
      : `- NÃO inclua IMAGE_PROMPT nas respostas`,
    `- Seja criativo, implacável e justo. Este mundo não perdoa erros.`,
  ].filter(Boolean).join("\n");

// ─── Storage ──────────────────────────────────────────────────────────
const IDX_KEY = "rpg-idx-v3"; // mantido para preservar campanhas antigas
const campKey = (id) => `rpg-camp-${id}`;

// ═════════════════════════════════════════════════════════════════════
export default function RPG() {
  const [view, setView]       = useState("home");
  const [idx, setIdx]         = useState([]);
  const [active, setActive]   = useState(null);
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState({
    world: "", worldBg: "", isKnownIP: false,
    charName: "", charTitle: "", charAge: "",
    charBg: "", charPersonality: "", charSkills: "",
    appearance: { ...DEFAULT_APP }, useImages: true,
  });

  // Play
  const [msgs, setMsgs]           = useState([]);
  const [disp, setDisp]           = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [statusText, setStatus]   = useState("");
  const [sceneImg, setSceneImg]   = useState(null);
  const [imgOk, setImgOk]         = useState(false);
  const [showChar, setShowChar]   = useState(false);
  const [campLore, setCampLore]   = useState("");

  const bottomRef = useRef(null);
  const taRef     = useRef(null);
  const sending   = useRef(false);

  useEffect(() => {
    try { setIdx(JSON.parse(localStorage.getItem(IDX_KEY) || "[]")); } catch {}
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [disp, loading]);

  // ─── Storage helpers ──────────────────────────────────────────────
  const saveIdx  = (l) => { try { localStorage.setItem(IDX_KEY, JSON.stringify(l)); } catch {} };
  const saveCamp = (id, d) => { try { localStorage.setItem(campKey(id), JSON.stringify(d)); } catch {} };
  const readCamp = (id) => { try { return JSON.parse(localStorage.getItem(campKey(id))); } catch { return null; } };

  // ─── Lore fetch ───────────────────────────────────────────────────
  const fetchLore = async (world) => {
    try {
      const res = await fetch("/api/gm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useLoreSearch: true, world }),
      });
      const data = await res.json();
      return data.lore || "";
    } catch { return ""; }
  };

  // ─── Home ─────────────────────────────────────────────────────────
  const openCamp = (s) => {
    const data = readCamp(s.id);
    if (!data) return;
    setActive(data); setMsgs(data.msgs || []); setDisp(data.disp || []);
    setSceneImg(data.img || null); setImgOk(!!data.img);
    setCampLore(data.lore || ""); setShowChar(false); setView("play");
    if (!data.msgs?.length) doStart(data, data.lore || "");
  };

  const delCamp = (id, e) => {
    e.stopPropagation();
    if (!confirm("Apagar esta campanha permanentemente?")) return;
    const next = idx.filter((c) => c.id !== id);
    setIdx(next); saveIdx(next);
    try { localStorage.removeItem(campKey(id)); } catch {}
  };

  // ─── Create ───────────────────────────────────────────────────────
  const startCreate = () => {
    setForm({ world: "", worldBg: "", isKnownIP: false, charName: "", charTitle: "", charAge: "", charBg: "", charPersonality: "", charSkills: "", appearance: { ...DEFAULT_APP }, useImages: true });
    setStep(0); setView("create");
  };

  const finishCreate = async () => {
    if (!form.world.trim() || !form.charName.trim()) return;
    setView("play"); setLoading(true); setDisp([]); setMsgs([]); setSceneImg(null);
    let lore = "";
    if (form.isKnownIP) {
      setStatus("🔍 Buscando lore oficial de " + form.world + "...");
      lore = await fetchLore(form.world);
    } else {
      setStatus("⚗️ Preparando mundo...");
    }
    const id = uid();
    const camp = { id, ...form, lore, msgs: [], disp: [], img: null, createdAt: Date.now() };
    const summary = { id, world: form.world, charName: form.charName, createdAt: Date.now(), updatedAt: Date.now() };
    const next = [summary, ...idx];
    setIdx(next); saveIdx(next); saveCamp(id, camp);
    setActive(camp); setCampLore(lore); setShowChar(false);
    setLoading(false); doStart(camp, lore);
  };

  // ─── Game ─────────────────────────────────────────────────────────
  const doStart = (camp, lore) => sendMsg(
    `Iniciar aventura. Narre o cenário inicial: onde ${camp.charName} está agora no universo de "${camp.world}", qual a situação atual do mundo, e apresente o primeiro desafio ou dilema que o personagem enfrenta.`,
    [], [], camp, lore
  );

  const sendMsg = async (text, baseMsgs, baseDisp, camp, lore) => {
    if (!text.trim() || sending.current) return;
    sending.current = true; setLoading(true); setStatus("✦ O MESTRE TECE O DESTINO ✦");
    setInput(""); taRef.current?.blur();
    const newMsgs = [...baseMsgs, { role: "user", content: text }];
    const newDisp = [...baseDisp, { type: "user", text }];
    setMsgs(newMsgs); setDisp(newDisp);
    try {
      const res = await fetch("/api/gm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, systemPrompt: buildPrompt(camp, lore) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const raw = data.text;
      const imgPrompt = camp.useImages ? extractImagePrompt(raw) : null;
      const clean = cleanText(raw);
      const finalMsgs = [...newMsgs, { role: "assistant", content: raw }];
      const finalDisp = [...newDisp, { type: "gm", text: clean }];
      setMsgs(finalMsgs); setDisp(finalDisp);
      let newImg = camp.img || null;
      if (imgPrompt) { setImgOk(false); newImg = generateImage(imgPrompt, camp.world); setSceneImg(newImg); }
      const updated = { ...camp, msgs: finalMsgs, disp: finalDisp, img: newImg, lore, updatedAt: Date.now() };
      setActive(updated); saveCamp(camp.id, updated);
      setIdx((prev) => { const next = prev.map((s) => s.id === camp.id ? { ...s, updatedAt: Date.now() } : s); saveIdx(next); return next; });
    } catch {
      setDisp((prev) => [...prev, { type: "error", text: "Erro ao contatar o Mestre. Tente novamente." }]);
    }
    sending.current = false; setLoading(false); setStatus("");
  };

  const handleSend = () => { if (!input.trim() || sending.current || !active) return; sendMsg(input, msgs, disp, active, campLore); };

  const resetChat = () => {
    if (!active || !confirm("Recomeçar do início? O histórico será apagado.")) return;
    const updated = { ...active, msgs: [], disp: [], img: null };
    setActive(updated); setMsgs([]); setDisp([]); setSceneImg(null);
    saveCamp(active.id, updated); doStart(updated, campLore);
  };

  const setApp = (key, val) => setForm(f => ({ ...f, appearance: { ...f.appearance, [key]: val } }));

  // ═══ HOME ══════════════════════════════════════════════════════════
  if (view === "home") return (
    <div className="root">
      <div className="hh">
        <div className="hh-icon">⚔</div>
        <div className="hh-title">FORJA DE MUNDOS</div>
        <div className="hh-sub">RPG · CRIAÇÃO DE AVENTURAS</div>
      </div>
      <div className="list">
        {!idx.length ? (
          <div className="empty">
            <div className="e-icon">🌍</div>
            <div className="e-txt">Nenhum mundo criado ainda.<br />Comece sua primeira aventura.</div>
          </div>
        ) : idx.map((s) => (
          <div key={s.id} className="card" onClick={() => openCamp(s)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="c-world">{s.world}</div>
              <div className="c-char">⚔ {s.charName}</div>
              {s.updatedAt && <div className="c-date">Última sessão: {fmtDate(s.updatedAt)}</div>}
            </div>
            <button className="c-del" onClick={(e) => delCamp(s.id, e)}>✕</button>
          </div>
        ))}
      </div>
      <div className="hfoot">
        <button className="btn-new" onClick={startCreate}>+ NOVO MUNDO</button>
      </div>
      <style jsx global>{GST}</style>
      <style jsx>{`
        .root{font-family:'Palatino Linotype',Palatino,'Book Antiqua',serif;color:#c9a96e;background:#060407;display:flex;flex-direction:column;height:100dvh;max-width:500px;margin:0 auto}
        .hh{text-align:center;padding:40px 20px 20px;border-bottom:1px solid #180e00;flex-shrink:0}
        .hh-icon{font-size:28px;margin-bottom:10px}
        .hh-title{font-size:19px;font-weight:bold;color:#d4a843;letter-spacing:6px}
        .hh-sub{font-size:8px;letter-spacing:5px;color:#2c1900;margin-top:6px}
        .list{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
        .empty{text-align:center;padding-top:60px}
        .e-icon{font-size:44px;margin-bottom:14px;opacity:.25}
        .e-txt{color:#2c1900;font-size:13px;line-height:2.4}
        .card{display:flex;align-items:center;background:linear-gradient(135deg,#0c0700,#100900);border:1px solid #180e00;border-left:3px solid #4a2000;border-radius:6px;padding:14px 12px 14px 16px;cursor:pointer;gap:10px;-webkit-tap-highlight-color:transparent}
        .c-world{font-size:14px;color:#c4a060;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
        .c-char{font-size:11px;color:#6b4a1a}
        .c-date{font-size:9px;color:#2c1900;margin-top:3px;letter-spacing:1px}
        .c-del{background:transparent;border:1px solid #180e00;color:#2c1900;border-radius:4px;width:28px;height:28px;cursor:pointer;font-size:10px;flex-shrink:0}
        .hfoot{flex-shrink:0;padding:12px;padding-bottom:max(14px,env(safe-area-inset-bottom));border-top:1px solid #180e00}
        .btn-new{width:100%;background:linear-gradient(135deg,#5a1a00,#2a0d00);border:1px solid #8b5a14;color:#d4a843;padding:14px;font-size:12px;letter-spacing:4px;border-radius:6px;cursor:pointer;font-family:inherit}
      `}</style>
    </div>
  );

  // ═══ CREATE ════════════════════════════════════════════════════════
  if (view === "create") return (
    <div className="root">
      <div className="cr-head">
        <button className="btn-back" onClick={() => step > 0 ? setStep(s => s - 1) : setView("home")}>← VOLTAR</button>
        <div className="cr-steps">
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: "flex", alignItems: "center" }}>
              <span className={`cr-dot ${step >= i ? "on" : ""}`} />
              {i < 2 && <span className="cr-ln" />}
            </span>
          ))}
        </div>
        {step === 0
          ? <button className="btn-pres" onClick={() => setForm({ ...PRESET })}>🐉 EDRIC</button>
          : <div style={{ width: 56 }} />}
      </div>

      <div className="cr-body">
        {/* ── Passo 0: Mundo ── */}
        {step === 0 && <>
          <div className="cr-lbl">PASSO 1 — O MUNDO</div>
          <F label="Nome do mundo *" value={form.world} set={(v) => setForm(f => ({ ...f, world: v }))} placeholder="ex: Naruto, One Piece, Dark Souls, Mundo Original..." />
          <Toggle title="Universo existente?"
            desc={form.isKnownIP ? "🔍 Vou buscar o lore oficial na internet (anime, mangá, jogo, livro...)" : "✨ Mundo original — você define o contexto abaixo"}
            value={form.isKnownIP} onChange={() => setForm(f => ({ ...f, isKnownIP: !f.isKnownIP }))} />
          {!form.isKnownIP && <F label="Lore / Contexto *" value={form.worldBg} set={(v) => setForm(f => ({ ...f, worldBg: v }))} placeholder="Época, conflitos, facções, regras do mundo..." ta rows={5} />}
          {form.isKnownIP && form.world.trim() && (
            <div className="ip-hint">O Mestre vai pesquisar na internet o lore de <strong>{form.world}</strong>: personagens, poderes, facções e eventos.</div>
          )}
          <Toggle title="Gerar imagens de cena?"
            desc={form.useImages ? "🖼️ Uma imagem por cena — mais imersivo, mais lento" : "⚡ Sem imagens — mais rápido e barato"}
            value={form.useImages} onChange={() => setForm(f => ({ ...f, useImages: !f.useImages }))} />
          <button className="btn-next" disabled={!form.world.trim() || (!form.isKnownIP && !form.worldBg.trim())} onClick={() => setStep(1)}>PRÓXIMO →</button>
        </>}

        {/* ── Passo 1: Personagem ── */}
        {step === 1 && <>
          <div className="cr-lbl">PASSO 2 — O PERSONAGEM</div>
          <F label="Nome *" value={form.charName} set={(v) => setForm(f => ({ ...f, charName: v }))} placeholder="ex: Naruto, V, Geralt..." />
          <F label="Título / Cargo" value={form.charTitle} set={(v) => setForm(f => ({ ...f, charTitle: v }))} placeholder="ex: Hokage, Witcher, Lorde..." />
          <F label="Idade" value={form.charAge} set={(v) => setForm(f => ({ ...f, charAge: v }))} placeholder="ex: 17" />
          <F label="História / Background" value={form.charBg} set={(v) => setForm(f => ({ ...f, charBg: v }))} placeholder="Origem, motivações, eventos marcantes..." ta rows={4} />
          <F label="Personalidade" value={form.charPersonality} set={(v) => setForm(f => ({ ...f, charPersonality: v }))} placeholder="ex: Impulsivo, corajoso, leal..." />
          <F label="Habilidades / Poderes" value={form.charSkills} set={(v) => setForm(f => ({ ...f, charSkills: v }))} placeholder="ex: Rasengan, velocidade, magia de fogo..." />
          <button className="btn-next" disabled={!form.charName.trim()} onClick={() => setStep(2)}>PRÓXIMO →</button>
        </>}

        {/* ── Passo 2: Aparência ── */}
        {step === 2 && <>
          <div className="cr-lbl">PASSO 3 — APARÊNCIA</div>
          <div className="app-preview">
            <div className="app-avatar">
              <div className="av-hair" style={{ background: HAIR_COLORS[form.appearance.hairColor] || "#4a2a00" }} />
              <div className="av-body">{form.appearance.body?.[0]}</div>
              <div className="av-eyes">
                <div className="av-eye" style={{ background: EYE_COLORS[form.appearance.eyeColor] || "#5a3a10" }} />
                <div className="av-eye" style={{ background: EYE_COLORS[form.appearance.eyeColor] || "#5a3a10" }} />
              </div>
            </div>
            <div className="app-summary">
              {Object.entries(APP_LABELS).map(([k, label]) => (
                <div key={k} className="app-sum-row">
                  <span className="app-sum-key">{label}:</span>
                  <span className="app-sum-val">{form.appearance[k]}</span>
                </div>
              ))}
            </div>
          </div>
          {Object.entries(APP_OPTIONS).map(([key, opts]) => (
            <div key={key} className="app-section">
              <div className="app-section-label">{APP_LABELS[key]}</div>
              <div className="chips">
                {opts.map(opt => (
                  <button key={opt} className={`chip ${form.appearance[key] === opt ? "on" : ""}`} onClick={() => setApp(key, opt)}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
          <button className="btn-next" onClick={finishCreate}>⚔ COMEÇAR AVENTURA</button>
        </>}
      </div>

      <style jsx global>{GST}</style>
      <style jsx>{`
        .root{font-family:'Palatino Linotype',Palatino,'Book Antiqua',serif;color:#c9a96e;background:#060407;display:flex;flex-direction:column;height:100dvh;max-width:500px;margin:0 auto}
        .cr-head{display:flex;align-items:center;justify-content:space-between;padding:14px 12px;border-bottom:1px solid #180e00;flex-shrink:0}
        .btn-back{background:transparent;border:1px solid #180e00;border-radius:4px;color:#6b4a1a;font-size:9px;padding:6px 10px;cursor:pointer;letter-spacing:1px;font-family:inherit}
        .cr-steps{display:flex;align-items:center}
        .cr-dot{width:8px;height:8px;border-radius:50%;background:#180e00;border:1px solid #2a1800;transition:all .3s;display:inline-block}
        .cr-dot.on{background:#8b5a14;border-color:#d4a843}
        .cr-ln{width:22px;height:1px;background:#180e00;display:inline-block}
        .btn-pres{background:transparent;border:1px solid #2a1800;border-radius:4px;color:#8b5a14;font-size:9px;padding:6px 10px;cursor:pointer;font-family:inherit}
        .cr-body{flex:1;overflow-y:auto;padding:20px 14px 20px;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch}
        .cr-lbl{font-size:9px;letter-spacing:5px;color:#4a2c00;margin-bottom:18px;text-align:center}
        .ip-hint{background:#0c0700;border:1px solid #180e00;border-left:3px solid #4a2000;border-radius:6px;padding:12px;font-size:11px;color:#6b4a1a;line-height:1.8;margin-bottom:12px}
        .ip-hint strong{color:#c4a060}
        .btn-next{width:100%;background:linear-gradient(135deg,#5a1a00,#2a0d00);border:1px solid #8b5a14;color:#d4a843;padding:14px;font-size:12px;letter-spacing:4px;border-radius:6px;cursor:pointer;font-family:inherit;margin-top:10px;flex-shrink:0}
        .btn-next:disabled{background:#0c0700;border-color:#180e00;color:#2a1800;cursor:not-allowed}
        .app-preview{display:flex;gap:12px;background:#0c0700;border:1px solid #180e00;border-radius:6px;padding:12px;margin-bottom:16px;align-items:flex-start}
        .app-avatar{width:56px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px}
        .av-hair{width:40px;height:10px;border-radius:4px 4px 0 0}
        .av-body{width:40px;height:48px;background:#1a0e00;border:1px solid #2a1800;border-radius:0 0 4px 4px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#4a2c00;font-weight:bold}
        .av-eyes{display:flex;gap:6px;margin-top:6px}
        .av-eye{width:10px;height:7px;border-radius:50%;border:1px solid #0a0600}
        .app-summary{flex:1;display:flex;flex-direction:column;gap:1px}
        .app-sum-row{display:flex;justify-content:space-between;font-size:10px;line-height:1.8}
        .app-sum-key{color:#2c1900}
        .app-sum-val{color:#8b5a14}
        .app-section{margin-bottom:14px}
        .app-section-label{font-size:9px;letter-spacing:2px;color:#4a2c00;text-transform:uppercase;margin-bottom:7px}
        .chips{display:flex;flex-wrap:wrap;gap:6px}
        .chip{background:#0a0600;border:1px solid #180e00;border-radius:16px;color:#3a2410;font-size:11px;padding:5px 12px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent;transition:all .15s}
        .chip.on{background:#2a0d00;border-color:#8b5a14;color:#d4a843}
      `}</style>
    </div>
  );

  // ═══ PLAY ══════════════════════════════════════════════════════════
  const c = active || {};
  return (
    <div className="root">
      <div className="header">
        {c.useImages && sceneImg && (
          <div className="si-wrap">
            <img src={sceneImg} alt="" className={`si ${imgOk ? "ok" : ""}`} onLoad={() => setImgOk(true)} />
            <div className="si-ov" />
            {!imgOk && <div className="si-spin">✦ GERANDO CENA ✦</div>}
          </div>
        )}
        <div className="tbar">
          <button className="btn-sm" onClick={() => setView("home")}>⌂</button>
          <div className="tc">
            <div className="t-world">{c.world}</div>
            <div className="t-name">⚔ {c.charName}</div>
            {c.charTitle && <div className="t-world">{c.charTitle}</div>}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn-sm" onClick={() => setShowChar(v => !v)}>📜</button>
            <button className="btn-sm" onClick={resetChat}>↺</button>
          </div>
        </div>
        {showChar && (
          <div className="cpanel">
            <div className="cp-lbl">▸ FICHA</div>
            {c.charName      && <div><span className="dd">Nome:</span> {c.charName}</div>}
            {c.charTitle     && <div><span className="dd">Título:</span> {c.charTitle}</div>}
            {c.charAge       && <div><span className="dd">Idade:</span> {c.charAge}</div>}
            {c.charBg        && <div><span className="dd">Origem:</span> {c.charBg}</div>}
            {c.charPersonality && <div><span className="dd">Personalidade:</span> {c.charPersonality}</div>}
            {c.charSkills    && <div><span className="dd">Habilidades:</span> {c.charSkills}</div>}
            {c.appearance    && <div style={{ marginTop: 4 }}><span className="dd">Aparência:</span> {buildAppearance(c.appearance)}</div>}
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {!c.useImages && <span className="badge">⚡ SEM IMAGENS</span>}
              {campLore      && <span className="badge">🔍 LORE OFICIAL</span>}
            </div>
          </div>
        )}
      </div>

      <div className="msgs">
        {!disp.length && loading && <div className="splash-load">{statusText || "✦ INICIANDO ✦"}</div>}
        {disp.map((m, i) => (
          <div key={i}>
            {m.type === "gm"    && <div className="b-gm"><div className="b-lbl">✦ MESTRE ✦</div>{m.text}</div>}
            {m.type === "user"  && <div style={{ display: "flex", justifyContent: "flex-end" }}><div className="b-u">{m.text}</div></div>}
            {m.type === "error" && <div className="b-err">{m.text}</div>}
          </div>
        ))}
        {loading && disp.length > 0 && <div className="b-load">{statusText}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="iarea">
        <textarea ref={taRef} className="ibox" value={input} rows={2} disabled={loading}
          placeholder={`O que ${c.charName || "o personagem"} faz?`}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <button className={`i-send ${loading || !input.trim() ? "off" : ""}`} onClick={handleSend} disabled={loading || !input.trim()}>⚔</button>
      </div>

      <style jsx global>{GST}</style>
      <style jsx>{`
        .root{font-family:'Palatino Linotype',Palatino,'Book Antiqua',serif;color:#c9a96e;background:#060407;display:flex;flex-direction:column;height:100dvh;max-width:500px;margin:0 auto;overflow:hidden}
        .header{flex-shrink:0;background:linear-gradient(180deg,#0e0700 0%,#060407 100%);border-bottom:1px solid #180e00}
        .si-wrap{position:relative;height:175px;overflow:hidden}
        .si{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s}
        .si.ok{opacity:.72}
        .si-ov{position:absolute;inset:0;background:linear-gradient(0deg,#060407 0%,transparent 50%,rgba(6,4,7,.5) 100%)}
        .si-spin{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#2c1900;font-size:9px;letter-spacing:4px;animation:pulse 2s infinite}
        .tbar{display:flex;align-items:center;gap:8px;padding:10px 12px}
        .tc{flex:1;text-align:center;min-width:0}
        .t-world{font-size:7px;letter-spacing:3px;color:#2c1900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .t-name{font-size:15px;font-weight:bold;color:#d4a843;letter-spacing:1px;margin:2px 0}
        .btn-sm{background:transparent;border:1px solid #180e00;border-radius:4px;color:#4a2c00;font-size:14px;padding:5px 7px;cursor:pointer;line-height:1;-webkit-tap-highlight-color:transparent}
        .cpanel{margin:0 12px 10px;background:#0c0700;border:1px solid #180e00;border-radius:6px;padding:12px;font-size:11px;line-height:2;color:#907040;max-height:175px;overflow-y:auto}
        .cp-lbl{color:#d4a843;font-size:8px;letter-spacing:3px;margin-bottom:6px}
        .dd{color:#4a2c00}
        .badge{font-size:8px;letter-spacing:2px;color:#2c1900;background:#0a0600;border:1px solid #180e00;border-radius:3px;padding:2px 6px}
        .msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}
        .splash-load{text-align:center;margin-top:100px;color:#2c1900;font-size:9px;letter-spacing:4px;animation:pulse 2s infinite}
        .b-gm{background:linear-gradient(135deg,#0c0700,#0f0900);border:1px solid #180e00;border-left:3px solid #4a2000;border-radius:6px;padding:14px;font-size:13px;line-height:1.95;color:#c4a060;white-space:pre-wrap}
        .b-lbl{font-size:7px;letter-spacing:4px;color:#2c1900;margin-bottom:10px}
        .b-u{background:#0a0600;border:1px solid #180e00;border-right:3px solid #7a4a10;border-radius:6px;padding:10px 12px;font-size:12px;color:#7a5520;max-width:84%;font-style:italic}
        .b-err{text-align:center;color:#6a1a1a;font-size:11px;padding:8px}
        .b-load{text-align:center;color:#2c1900;font-size:9px;letter-spacing:4px;padding:12px 0;animation:pulse 2s infinite}
        .iarea{flex-shrink:0;padding:10px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom));border-top:1px solid #180e00;background:#060407;display:flex;gap:8px;align-items:flex-end}
        .ibox{flex:1;background:#0c0700;border:1px solid #180e00;border-radius:8px;padding:10px 12px;color:#c4a060;font-size:14px;font-family:inherit;outline:none;resize:none;line-height:1.5;-webkit-appearance:none}
        .ibox:disabled{opacity:.4}
        .i-send{background:linear-gradient(135deg,#5a1a00,#2a0d00);border:1px solid #8b5a14;color:#d4a843;width:48px;height:48px;border-radius:8px;cursor:pointer;font-size:18px;flex-shrink:0;-webkit-tap-highlight-color:transparent}
        .i-send.off{background:#0c0700;border-color:#180e00;color:#2a1800;cursor:not-allowed}
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────
function F({ label, value, set, placeholder, ta, rows }) {
  const st = { width: "100%", background: "#0c0700", border: "1px solid #180e00", borderRadius: 6, padding: "10px 12px", color: "#c4a060", fontSize: 13, fontFamily: "'Palatino Linotype',Palatino,serif", outline: "none", resize: "none", lineHeight: 1.6, WebkitAppearance: "none", boxSizing: "border-box", display: "block" };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a2c00", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      {ta ? <textarea style={st} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} rows={rows || 4} />
          : <input    style={st} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

function Toggle({ title, desc, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#0c0700", border: "1px solid #180e00", borderRadius: 6, padding: 12, marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#c4a060", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 9, color: "#4a2c00", lineHeight: 1.6 }}>{desc}</div>
      </div>
      <button onClick={onChange} style={{ background: value ? "#2a0d00" : "#0a0600", border: `1px solid ${value ? "#8b5a14" : "#180e00"}`, borderRadius: 4, color: value ? "#d4a843" : "#2c1900", fontSize: 9, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", letterSpacing: 2, flexShrink: 0 }}>
        {value ? "SIM" : "NÃO"}
      </button>
    </div>
  );
}

// ─── Global styles ────────────────────────────────────────────────────
const GST = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#060407;overflow:hidden;-webkit-font-smoothing:antialiased}
textarea::placeholder,input::placeholder{color:#2a1800}
::-webkit-scrollbar{width:2px}
::-webkit-scrollbar-thumb{background:#2a1800;border-radius:2px}
@keyframes pulse{0%,100%{opacity:.15}50%{opacity:.85}}
`;
