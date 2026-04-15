import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

// ─── Helpers ──────────────────────────────────────────────────────────
const extractImagePrompt = (text) => {
  const m = text.match(/IMAGE_PROMPT:\s*(.+)/i);
  return m ? m[1].trim() : null;
};
const extractOptions = (text) => {
  const matches = [...text.matchAll(/^\s*(\d)\.\s+(.+)/gm)];
  return matches.slice(-3).map(m => m[2].trim());
};

// ── NOVO: extrai dano/cura do texto da IA ──────────────────────────
const extractHpChange = (text) => {
  const dano = text.match(/\[DANO:(\d+)\]/i);
  const cura = text.match(/\[CURA:(\d+)\]/i);
  if (dano) return -parseInt(dano[1]);
  if (cura) return +parseInt(cura[1]);
  return 0;
};

// ── NOVO: extrai missões do texto da IA ───────────────────────────
const extractMissions = (text) => {
  const nova = [...text.matchAll(/\[MISS[ÃA]O:([^\]]+)\]/gi)].map(m => m[1].trim());
  const conc = [...text.matchAll(/\[CONCLU[IÍ]DA:([^\]]+)\]/gi)].map(m => m[1].trim());
  return { nova, conc };
};

// ── NOVO: detecta clima da cena para trilha ───────────────────────
const detectMood = (text) => {
  const l = text.toLowerCase();
  if (/combate|batalha|ataque|espada|luta|sangue|golpe|ferido/.test(l)) return "combat";
  if (/sombrio|morte|perigo|armadilha|medo|veneno|escuro|cripta/.test(l)) return "dark";
  if (/taverna|paz|descanso|celebra|festa|calmo|seguro/.test(l)) return "calm";
  return "explore";
};

// ── cleanText agora também remove as tags de sistema ─────────────
const cleanText = (t) => t
  .replace(/IMAGE_PROMPT:\s*.+/gi, "")
  .replace(/\[(DANO|CURA|MISS[ÃA]O|CONCLU[IÍ]DA):[^\]]*\]/gi, "")
  .trim();

const generateImage = (prompt, world) => {
  const full = `${prompt}, ${world || "fantasy"} setting, cinematic, dramatic lighting, photorealistic, 8k, no text, no people`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=900&height=360&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
};

// ── NOVO: gera imagem de mapa via Pollinations ─────────────────────
const generateMapImage = (world) => {
  const prompt = `fantasy world map of ${world}, vintage parchment cartography, hand drawn ink illustration, detailed geography mountains rivers cities, aged texture, top down view, no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&nologo=true&seed=777`;
};

const uid = () => `c${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "";
const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

// ─── Aparência ─────────────────────────────────────────────────────────
const APP_OPTIONS = {
  body:      ["Magro", "Atlético", "Médio", "Robusto", "Gordo"],
  height:    ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"],
  skin:      ["Muito clara", "Clara", "Morena clara", "Morena", "Negra"],
  hairLen:   ["Careca", "Curto", "Médio", "Longo", "Muito longo"],
  hairColor: ["Preto", "Castanho", "Loiro", "Ruivo", "Branco/Grisalho"],
  hairStyle: ["Liso", "Ondulado", "Cacheado", "Crespo", "Raspado/Moicano"],
  eyeColor:  ["Castanhos", "Verdes", "Azuis", "Cinzas", "Pretos"],
  eyeShape:  ["Amendoados", "Redondos", "Puxados", "Pequenos", "Grandes"],
  face:      ["Oval", "Quadrada", "Redonda", "Triangular", "Alongada"],
  extras:    ["Nenhum", "Cicatriz", "Tatuagem", "Barba", "Sardas"],
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

// ─── Preset ────────────────────────────────────────────────────────────
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

// ─── System prompt (atualizado com tags de sistema) ────────────────────
const buildPrompt = (c, loreExtra) =>
  [
    `Você é o Mestre de um RPG de texto implacável ambientado no universo de: ${c.world}.`,
    loreExtra
      ? `LORE OFICIAL DO UNIVERSO (pesquisado na internet):\n${loreExtra}`
      : `CONTEXTO DO MUNDO: ${c.worldBg}`,
    ``,
    `O jogador controla: ${c.charName}${c.charTitle ? ` — ${c.charTitle}` : ""}.`,
    c.charAge         ? `Idade: ${c.charAge} anos.`           : "",
    c.charBg          ? `História: ${c.charBg}`               : "",
    c.charPersonality ? `Personalidade: ${c.charPersonality}` : "",
    c.charSkills      ? `Habilidades: ${c.charSkills}`        : "",
    c.appearance      ? buildAppearance(c.appearance)         : "",
    ``,
    `DIRETRIZES DE NARRAÇÃO:`,
    `1. RITMO ACELERADO: Seja direto, cru e dinâmico. Frases curtas em combate. Vá ao ponto.`,
    `2. CONSEQUÊNCIAS REAIS: Decisões ruins têm punições reais. Crie tensão genuína.`,
    `3. INTERAÇÃO LIVRE: Termine com pergunta instigante ou ação imediata — não com lista de opções numeradas.`,
    `4. DIÁLOGOS VIVOS: NPCs mentem, têm pressa e tentam enganar.`,
    `5. RESPEITE O LORE de ${c.world}.`,
    ``,
    `SISTEMA DE JOGO — inclua estas tags no texto quando relevante:`,
    `- Dano sofrido: [DANO:N] ex: "você sofre [DANO:20] ao ser atingido pela lança"`,
    `- Cura recebida: [CURA:N] ex: "a poção restaura [CURA:30] de vitalidade"`,
    `- Novo objetivo narrativo: [MISSÃO:descrição em até 8 palavras]`,
    `- Objetivo concluído: [CONCLUÍDA:texto do objetivo]`,
    c.useImages
      ? `- IMAGE_PROMPT: na última linha de CADA resposta: IMAGE_PROMPT: [prompt inglês, cenário atmosférico, sem texto, sem rostos de frente]`
      : `- NÃO inclua IMAGE_PROMPT.`,
  ].filter(Boolean).join("\n");

// ─── Storage ──────────────────────────────────────────────────────────
const IDX_KEY = "rpg-idx-v3";
const campKey = (id) => `rpg-camp-${id}`;

// ═════════════════════════════════════════════════════════════════════
export default function RPG() {
  const [view, setView]     = useState("home");
  const [idx, setIdx]       = useState([]);
  const [active, setActive] = useState(null);
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState({
    world: "", worldBg: "", isKnownIP: false,
    charName: "", charTitle: "", charAge: "",
    charBg: "", charPersonality: "", charSkills: "",
    appearance: { ...DEFAULT_APP }, useImages: true,
  });

  // Play
  const [msgs, setMsgs]         = useState([]);
  const [disp, setDisp]         = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [statusText, setStatus] = useState("");
  const [sceneImg, setSceneImg] = useState(null);
  const [imgOk, setImgOk]       = useState(false);
  const [campLore, setCampLore] = useState("");

  // Auto mode
  const [autoMode, setAutoMode]       = useState(false);
  const [autoWaiting, setAutoWaiting] = useState(false);
  const [pendingOptions, setPending]  = useState([]);
  const [autoDelay]                   = useState(3);
  const [countdown, setCountdown]     = useState(0);

  // ── NOVOS ESTADOS ─────────────────────────────────────────────────
  const [hp, setHp]               = useState(100);        // HP atual
  const [missions, setMissions]   = useState([]);          // [{id, text, done}]
  const [saves, setSaves]         = useState([]);          // [{id, name, ts, ...}]
  const [showPanel, setShowPanel] = useState(null);        // "char"|"missions"|"saves"|"map"
  const [mapImg, setMapImg]       = useState(null);        // URL do mapa gerado
  const [mapLoaded, setMapLoaded] = useState(false);
  const [musicOn, setMusicOn]     = useState(false);       // Trilha ligada/desligada
  const [mood, setMood]           = useState("explore");   // Mood atual para trilha

  // Refs para Web Audio (trilha sonora)
  const audioCtxRef  = useRef(null);
  const audioNodes   = useRef([]);

  const bottomRef = useRef(null);
  const taRef     = useRef(null);
  const sending   = useRef(false);
  const autoRef   = useRef(false);
  const timerRef  = useRef(null);
  const cdRef     = useRef(null);

  useEffect(() => { try { setIdx(JSON.parse(localStorage.getItem(IDX_KEY) || "[]")); } catch {} }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [disp, loading, autoWaiting]);
  useEffect(() => { autoRef.current = autoMode; }, [autoMode]);
  useEffect(() => { if (view !== "play") { clearAuto(); stopMusic(); } }, [view]);

  // ─── Web Audio: Trilha Sonora Ambiente ────────────────────────────
  // Gera drones e pads baseados no clima da cena — sem deps externas
  const MOOD_FREQS = {
    explore: { base: [110, 165, 247], type: "sine",     vol: 0.06, lfoRate: 0.08 },
    combat:  { base: [82,  110, 146], type: "sawtooth", vol: 0.05, lfoRate: 0.25 },
    dark:    { base: [55,  73,  98],  type: "triangle", vol: 0.07, lfoRate: 0.04 },
    calm:    { base: [220, 330, 440], type: "sine",     vol: 0.05, lfoRate: 0.05 },
  };
  const MOOD_LABELS = { explore: "🗺 Exploração", combat: "⚔ Batalha", dark: "☠ Sombras", calm: "☕ Repouso" };

  const stopMusic = () => {
    audioNodes.current.forEach(n => { try { n.stop(); } catch {} });
    audioNodes.current = [];
  };

  const startMusic = (newMood) => {
    stopMusic();
    const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const cfg = MOOD_FREQS[newMood] || MOOD_FREQS.explore;
    const master = ctx.createGain();
    master.gain.setValueAtTime(cfg.vol, ctx.currentTime);

    // Reverb simulado com dois delays
    const delay1 = ctx.createDelay(2);
    const delay2 = ctx.createDelay(3);
    delay1.delayTime.value = 0.8;
    delay2.delayTime.value = 1.4;
    const fbGain = ctx.createGain();
    fbGain.gain.value = 0.25;
    master.connect(delay1); delay1.connect(fbGain); fbGain.connect(delay2); delay2.connect(ctx.destination);
    master.connect(ctx.destination);

    cfg.base.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const lfo  = ctx.createOscillator();
      const lfoG = ctx.createGain();
      osc.type = cfg.type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.detune.setValueAtTime(i * 3, ctx.currentTime);   // ligeiro detune entre vozes
      lfo.frequency.setValueAtTime(cfg.lfoRate + i * 0.02, ctx.currentTime);
      lfoG.gain.value = 4;
      lfo.connect(lfoG); lfoG.connect(osc.frequency);
      osc.connect(master);
      osc.start(); lfo.start();
      audioNodes.current.push(osc, lfo);
    });
  };

  const toggleMusic = () => {
    if (musicOn) { stopMusic(); setMusicOn(false); }
    else         { startMusic(mood); setMusicOn(true); }
  };

  // Muda trilha automaticamente quando o clima muda
  useEffect(() => {
    if (musicOn) startMusic(mood);
  }, [mood]);

  // ─── Storage ──────────────────────────────────────────────────────
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
      return (await res.json()).lore || "";
    } catch { return ""; }
  };

  // ─── EXPORTAR COMO LIVRO (CORRIGIDO) ─────────────────────────────
  // Problema do PDF em branco: html2canvas não renderiza elementos em
  // left:-9999px. Solução: abrir nova aba com HTML formatado e usar print().
  const exportToBook = () => {
    if (!disp.length || !active) return;

    const rows = disp.map(m => {
      if (m.type === "gm") {
        return `<div class="scene">${m.text.replace(/\n+/g, "<br><br>")}</div>`;
      }
      if (m.type === "user" || m.type === "auto") {
        return `<div class="action">— ${m.text}</div>`;
      }
      return "";
    }).filter(Boolean).join("\n");

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>As Crônicas de ${active.charName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'IM Fell English',Georgia,serif;background:#fdf6e3;color:#1a0e05;max-width:700px;margin:0 auto;padding:80px 60px;line-height:1}
  .cover{text-align:center;padding:60px 0 80px;border-bottom:2px solid #8b5e3c;margin-bottom:60px}
  h1{font-family:'Cinzel',serif;font-size:32px;letter-spacing:6px;color:#5a2e00;margin-bottom:12px;line-height:1.4}
  h2{font-family:'Cinzel',serif;font-size:15px;font-weight:400;color:#8b6040;letter-spacing:3px;margin-bottom:40px}
  .ornament{font-size:26px;color:#8b5e3c;margin:20px 0}
  .scene{margin-bottom:26px;font-size:16px;line-height:1.9;text-align:justify;text-indent:2em}
  .action{margin:20px 0;text-align:right;font-style:italic;color:#6b4030;font-size:14px;padding-right:20px;border-right:3px solid #c8a87a}
  .fim{text-align:center;margin-top:80px;font-family:'Cinzel',serif;font-size:18px;color:#5a2e00;letter-spacing:8px}
  @media print{body{background:white;padding:40px 30px}.cover{padding:40px 0 60px}}
</style>
</head>
<body>
  <div class="cover">
    <div class="ornament">⚔</div>
    <h1>AS CRÔNICAS DE<br>${active.charName.toUpperCase()}</h1>
    <h2>${active.world}</h2>
    <div class="ornament">✦</div>
  </div>
  ${rows}
  <div class="fim">— F I M —</div>
  <script>setTimeout(()=>window.print(),600)</script>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) { alert("Permita pop-ups para exportar o livro."); return; }
    w.document.write(html);
    w.document.close();
  };

  // ─── Auto mode helpers ────────────────────────────────────────────
  const clearAuto = () => {
    clearTimeout(timerRef.current);
    clearInterval(cdRef.current);
    setCountdown(0);
    setAutoWaiting(false);
  };

  const scheduleNextTurn = useCallback((options, currentMsgs, currentDisp, camp, lore) => {
    if (!autoRef.current || !options.length) return;
    setAutoWaiting(true);
    setCountdown(autoDelay);
    cdRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(cdRef.current); return 0; } return prev - 1; });
    }, 1000);
    timerRef.current = setTimeout(() => {
      setAutoWaiting(false);
      if (!autoRef.current) return;
      const chosen = options[Math.floor(Math.random() * options.length)];
      sendMsg(chosen, currentMsgs, currentDisp, camp, lore, true);
    }, autoDelay * 1000);
  }, [autoDelay]);

  const toggleAuto = () => {
    const next = !autoMode;
    setAutoMode(next);
    autoRef.current = next;
    if (!next) clearAuto();
  };

  const intervene = () => {
    clearAuto();
    setAutoMode(false);
    autoRef.current = false;
    setAutoWaiting(false);
    setPending([]);
  };

  // ─── Saves ────────────────────────────────────────────────────────
  const createSave = () => {
    if (!active) return;
    const lastGm = [...disp].reverse().find(m => m.type === "gm");
    const snippet = lastGm ? lastGm.text.slice(0, 55).replace(/\n/g, " ") + "…" : "Início da aventura";
    const save = { id: uid(), name: snippet, ts: Date.now(), msgs: [...msgs], disp: [...disp], img: sceneImg, hp, missions: [...missions] };
    const newSaves = [save, ...saves].slice(0, 5); // máx 5 saves
    setSaves(newSaves);
    const updated = { ...active, saves: newSaves };
    setActive(updated);
    saveCamp(active.id, updated);
  };

  const loadSave = (save) => {
    if (!confirm("Carregar este save? O progresso atual será perdido.")) return;
    clearAuto();
    setMsgs(save.msgs || []);
    setDisp(save.disp || []);
    setSceneImg(save.img || null);
    setImgOk(!!save.img);
    setHp(save.hp ?? 100);
    setMissions(save.missions || []);
    setShowPanel(null);
    const updated = { ...active, msgs: save.msgs, disp: save.disp, img: save.img, hp: save.hp };
    setActive(updated);
    saveCamp(active.id, updated);
  };

  const delSave = (saveId) => {
    const newSaves = saves.filter(s => s.id !== saveId);
    setSaves(newSaves);
    const updated = { ...active, saves: newSaves };
    setActive(updated);
    saveCamp(active.id, updated);
  };

  // ─── Home ─────────────────────────────────────────────────────────
  const openCamp = (s) => {
    const data = readCamp(s.id);
    if (!data) return;
    setActive(data); setMsgs(data.msgs || []); setDisp(data.disp || []);
    setSceneImg(data.img || null); setImgOk(!!data.img);
    setCampLore(data.lore || "");
    setHp(data.hp ?? 100);
    setMissions(data.missions || []);
    setSaves(data.saves || []);
    setMapImg(data.mapImg || null);
    setMapLoaded(false);
    setShowPanel(null);
    setAutoMode(false); setAutoWaiting(false); setPending([]);
    setMusicOn(false); setMood("explore");
    setView("play");
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
    setHp(100); setMissions([]); setSaves([]);
    let lore = "";
    if (form.isKnownIP) { setStatus("🔍 Buscando lore oficial de " + form.world + "..."); lore = await fetchLore(form.world); }
    else { setStatus("⚗️ Preparando mundo..."); }
    const id = uid();
    const mapImgUrl = generateMapImage(form.world);
    setMapImg(mapImgUrl); setMapLoaded(false);
    const camp = { id, ...form, lore, msgs: [], disp: [], img: null, hp: 100, missions: [], saves: [], mapImg: mapImgUrl, createdAt: Date.now() };
    const summary = { id, world: form.world, charName: form.charName, createdAt: Date.now(), updatedAt: Date.now() };
    const next = [summary, ...idx];
    setIdx(next); saveIdx(next); saveCamp(id, camp);
    setActive(camp); setCampLore(lore);
    setShowPanel(null); setAutoMode(false); setAutoWaiting(false); setPending([]);
    setMusicOn(false); setMood("explore");
    setLoading(false); doStart(camp, lore);
  };

  // ─── Game ─────────────────────────────────────────────────────────
  const doStart = (camp, lore) => sendMsg(
    `Iniciar aventura. Narre o cenário inicial: onde ${camp.charName} está agora no universo de "${camp.world}", qual a situação atual do mundo, e apresente o primeiro desafio imediato ou cena imersiva.`,
    [], [], camp, lore, false
  );

  const sendMsg = async (text, baseMsgs, baseDisp, camp, lore, isAuto = false) => {
    if (!text.trim() || sending.current) return;
    sending.current = true;
    setLoading(true);
    setStatus(isAuto ? "⚡ MODO AUTO — MESTRE NARRANDO ✦" : "✦ O MESTRE TECE O DESTINO ✦");
    setInput(""); taRef.current?.blur();

    const newMsgs = [...baseMsgs, { role: "user", content: text }];
    const newDisp = [...baseDisp, { type: isAuto ? "auto" : "user", text }];
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
      const options = extractOptions(clean);

      // ── Processa HP ──────────────────────────────────────────────
      const hpDelta  = extractHpChange(raw);
      const currentHp = camp.hp ?? 100;
      const newHp = Math.max(0, Math.min(100, currentHp + hpDelta));
      if (hpDelta !== 0) setHp(newHp);

      // ── Processa Missões ─────────────────────────────────────────
      const { nova: newMiss, conc: concMiss } = extractMissions(raw);
      let updatedMissions = [...(camp.missions || [])];
      newMiss.forEach(t => {
        if (!updatedMissions.find(m => m.text === t))
          updatedMissions.push({ id: uid(), text: t, done: false });
      });
      concMiss.forEach(t => {
        updatedMissions = updatedMissions.map(m =>
          m.text.slice(0, 20) === t.slice(0, 20) ? { ...m, done: true } : m
        );
      });
      if (newMiss.length || concMiss.length) setMissions(updatedMissions);

      // ── Detecta clima e atualiza trilha ──────────────────────────
      const newMood = detectMood(raw);
      setMood(newMood);

      const finalMsgs = [...newMsgs, { role: "assistant", content: raw }];
      const finalDisp = [...newDisp, { type: "gm", text: clean }];
      setMsgs(finalMsgs); setDisp(finalDisp);

      let newImg = camp.img || null;
      if (imgPrompt) { setImgOk(false); newImg = generateImage(imgPrompt, camp.world); setSceneImg(newImg); }

      const updated = { ...camp, msgs: finalMsgs, disp: finalDisp, img: newImg, lore, hp: newHp, missions: updatedMissions, saves: saves, updatedAt: Date.now() };
      setActive(updated); saveCamp(camp.id, updated);
      setIdx((prev) => { const next = prev.map((s) => s.id === camp.id ? { ...s, updatedAt: Date.now() } : s); saveIdx(next); return next; });

      setPending(options);
      if (autoRef.current && options.length > 0) scheduleNextTurn(options, finalMsgs, finalDisp, updated, lore);
      else if (autoRef.current && options.length === 0) intervene();

    } catch {
      setDisp((prev) => [...prev, { type: "error", text: "Erro ao contatar o Mestre. Tente novamente." }]);
    }

    sending.current = false; setLoading(false); setStatus("");
  };

  const handleSend = () => {
    if (!input.trim() || sending.current || !active) return;
    clearAuto();
    sendMsg(input, msgs, disp, active, campLore, false);
  };

  const resetChat = () => {
    if (!active || !confirm("Recomeçar do início? O histórico será apagado.")) return;
    clearAuto(); setAutoMode(false); autoRef.current = false;
    setHp(100); setMissions([]);
    const updated = { ...active, msgs: [], disp: [], img: null, hp: 100, missions: [] };
    setActive(updated); setMsgs([]); setDisp([]); setSceneImg(null); setPending([]);
    saveCamp(active.id, updated); doStart(updated, campLore);
  };

  const setApp = (key, val) => setForm(f => ({ ...f, appearance: { ...f.appearance, [key]: val } }));

  // ═══ HOME ════════════════════════════════════════════════════════
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
      <style dangerouslySetInnerHTML={{ __html: GST + HOME_ST }} />
    </div>
  );

  // ═══ CREATE ══════════════════════════════════════════════════════
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
        {step === 0 && <>
          <div className="cr-lbl">PASSO 1 — O MUNDO</div>
          <F label="Nome do mundo *" value={form.world} set={(v) => setForm(f => ({ ...f, world: v }))} placeholder="ex: Naruto, One Piece, Dark Souls, Mundo Original..." />
          <Toggle title="Universo existente?"
            desc={form.isKnownIP ? "🔍 Vou buscar o lore oficial na internet (anime, mangá, jogo, livro...)" : "✨ Mundo original — você define o contexto abaixo"}
            value={form.isKnownIP} onChange={() => setForm(f => ({ ...f, isKnownIP: !f.isKnownIP }))} />
          {!form.isKnownIP && <F label="Lore / Contexto *" value={form.worldBg} set={(v) => setForm(f => ({ ...f, worldBg: v }))} placeholder="Época, conflitos, facções, regras do mundo..." ta rows={5} />}
          {form.isKnownIP && form.world.trim() && (
            <div className="ip-hint">O Mestre vai pesquisar o lore de <strong>{form.world}</strong>: personagens, poderes, facções e eventos.</div>
          )}
          <Toggle title="Gerar imagens de cena?"
            desc={form.useImages ? "🖼️ Uma imagem por cena — mais imersivo, mais lento" : "⚡ Sem imagens — mais rápido"}
            value={form.useImages} onChange={() => setForm(f => ({ ...f, useImages: !f.useImages }))} />
          <button className="btn-next" disabled={!form.world.trim() || (!form.isKnownIP && !form.worldBg.trim())} onClick={() => setStep(1)}>PRÓXIMO →</button>
        </>}

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
      <style dangerouslySetInnerHTML={{ __html: GST + CREATE_ST }} />
    </div>
  );

  // ═══ PLAY ════════════════════════════════════════════════════════
  const c = active || {};
  const hpPct = Math.max(0, Math.min(100, hp));
  const hpColor = hpPct > 60 ? "#1a6b1a" : hpPct > 30 ? "#7a6200" : "#8a1a00";
  const activeMissions = missions.filter(m => !m.done);
  const doneMissions   = missions.filter(m => m.done);

  return (
    <div className="root">

      {/* ── MODAL DO MAPA ────────────────────────────────────────── */}
      {showPanel === "map" && (
        <div className="map-overlay" onClick={() => setShowPanel(null)}>
          <div className="map-box" onClick={e => e.stopPropagation()}>
            <div className="map-hd">
              <span style={{ fontSize: 10, letterSpacing: 3, color: "#8b5a14" }}>🗺 MAPA — {c.world}</span>
              <button className="map-close" onClick={() => setShowPanel(null)}>✕</button>
            </div>
            <div style={{ position: "relative" }}>
              {mapImg && <img src={mapImg} alt="Mapa" className={`map-img ${mapLoaded ? "ok" : ""}`} onLoad={() => setMapLoaded(true)} />}
              {!mapLoaded && <div className="map-spin">✦ GERANDO MAPA ✦</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div className="header">
        {c.useImages && sceneImg && (
          <div className="si-wrap">
            <img src={sceneImg} alt="" className={`si ${imgOk ? "ok" : ""}`} onLoad={() => setImgOk(true)} />
            <div className="si-ov" />
            {!imgOk && <div className="si-spin">✦ GERANDO CENA ✦</div>}
          </div>
        )}

        {/* Barra de HP */}
        <div className="hp-wrap">
          <div className="hp-track">
            <div className="hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
          </div>
          <span className="hp-txt">❤ {hp} / 100</span>
          {/* Indicador de clima da trilha */}
          <span className="mood-badge">{MOOD_LABELS[mood]}</span>
        </div>

        <div className="tbar">
          <button className="btn-sm" onClick={() => { clearAuto(); setView("home"); }}>⌂</button>
          <div className="tc">
            <div className="t-world">{c.world}</div>
            <div className="t-name">⚔ {c.charName}</div>
            {c.charTitle && <div className="t-world">{c.charTitle}</div>}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            <button className="btn-sm" title="Mapa do mundo" onClick={() => setShowPanel(p => p === "map" ? null : "map")}>🗺</button>
            <button className="btn-sm" title="Missões" onClick={() => setShowPanel(p => p === "missions" ? null : "missions")}>
              {activeMissions.length > 0 ? `📋${activeMissions.length}` : "📋"}
            </button>
            <button className="btn-sm" title="Saves" onClick={() => setShowPanel(p => p === "saves" ? null : "saves")}>💾</button>
            <button className="btn-sm" title="Ficha" onClick={() => setShowPanel(p => p === "char" ? null : "char")}>📜</button>
            <button className="btn-sm" onClick={resetChat}>↺</button>
          </div>
        </div>

        {/* ── Painel: FICHA ─────────────────────────────────────── */}
        {showPanel === "char" && (
          <div className="cpanel">
            <div className="cp-lbl">▸ FICHA</div>
            {c.charName        && <div><span className="dd">Nome:</span> {c.charName}</div>}
            {c.charTitle       && <div><span className="dd">Título:</span> {c.charTitle}</div>}
            {c.charAge         && <div><span className="dd">Idade:</span> {c.charAge}</div>}
            {c.charBg          && <div><span className="dd">Origem:</span> {c.charBg}</div>}
            {c.charPersonality && <div><span className="dd">Personalidade:</span> {c.charPersonality}</div>}
            {c.charSkills      && <div><span className="dd">Habilidades:</span> {c.charSkills}</div>}
            {c.appearance      && <div style={{ marginTop: 4 }}><span className="dd">Aparência:</span> {buildAppearance(c.appearance)}</div>}
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {!c.useImages && <span className="badge">⚡ SEM IMAGENS</span>}
              {campLore     && <span className="badge">🔍 LORE OFICIAL</span>}
            </div>
            <button onClick={exportToBook} className="btn-export">📖 EXPORTAR COMO LIVRO</button>
          </div>
        )}

        {/* ── Painel: MISSÕES ───────────────────────────────────── */}
        {showPanel === "missions" && (
          <div className="cpanel">
            <div className="cp-lbl">▸ MISSÕES</div>
            {activeMissions.length === 0 && doneMissions.length === 0 && (
              <div style={{ color: "#2c1900", fontSize: 11, lineHeight: 2 }}>
                Nenhuma missão ativa ainda.<br />O Mestre adicionará objetivos automaticamente.
              </div>
            )}
            {activeMissions.map(m => (
              <div key={m.id} className="miss-row">
                <span className="miss-dot" />
                <span className="miss-txt">{m.text}</span>
              </div>
            ))}
            {doneMissions.length > 0 && <>
              <div className="cp-sub">CONCLUÍDAS</div>
              {doneMissions.map(m => (
                <div key={m.id} className="miss-row done">
                  <span className="miss-dot done" />
                  <span className="miss-txt">{m.text}</span>
                </div>
              ))}
            </>}
          </div>
        )}

        {/* ── Painel: SAVES ─────────────────────────────────────── */}
        {showPanel === "saves" && (
          <div className="cpanel">
            <div className="cp-lbl">▸ SAVES ({saves.length}/5)</div>
            <button onClick={createSave} className="btn-export" style={{ marginTop: 0, marginBottom: 10 }}>
              + CRIAR SAVE AGORA
            </button>
            {saves.length === 0 && (
              <div style={{ color: "#2c1900", fontSize: 11 }}>Nenhum save ainda. Máximo 5.</div>
            )}
            {saves.map(s => (
              <div key={s.id} className="save-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="save-name">{s.name}</div>
                  <div className="save-meta">❤ {s.hp ?? 100} · {fmtDate(s.ts)} {fmtTime(s.ts)}</div>
                </div>
                <button className="save-btn load" onClick={() => loadSave(s)} title="Carregar">▶</button>
                <button className="save-btn del"  onClick={() => delSave(s.id)} title="Apagar">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MENSAGENS ────────────────────────────────────────────── */}
      <div className="msgs">
        {!disp.length && loading && <div className="splash-load">{statusText || "✦ INICIANDO ✦"}</div>}

        {disp.map((m, i) => (
          <div key={i}>
            {m.type === "gm" && (
              <div className="b-gm">
                <div className="b-lbl">✦ MESTRE ✦</div>
                {m.text}
              </div>
            )}
            {m.type === "user" && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div className="b-u">{m.text}</div>
              </div>
            )}
            {m.type === "auto" && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div className="b-auto">⚡ {m.text}</div>
              </div>
            )}
            {m.type === "error" && <div className="b-err">{m.text}</div>}
          </div>
        ))}

        {loading && disp.length > 0 && (
          <div className={`b-load ${autoMode ? "auto-pulse" : ""}`}>{statusText}</div>
        )}

        {autoWaiting && !loading && (
          <div className="auto-banner">
            <div className="auto-banner-top">
              <span className="auto-dot" />
              <span>MODO AUTOMÁTICO — próximo turno em <strong>{countdown}s</strong></span>
            </div>
            <button className="btn-intervir" onClick={intervene}>✋ INTERVIR AGORA</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT + CONTROLES ─────────────────────────────────────── */}
      <div className="iarea">
        <button className={`btn-auto ${autoMode ? "on" : ""}`} onClick={toggleAuto}
          title={autoMode ? "Desativar auto" : "Ativar auto"}>
          {autoMode ? "AUTO\nLIGADO" : "AUTO\nDESL."}
        </button>

        <textarea
          ref={taRef} className="ibox" value={input} rows={2}
          disabled={loading || autoWaiting}
          placeholder={autoMode ? "Auto ligado — aperte AUTO pra intervir" : `O que ${c.charName || "o personagem"} faz?`}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Botão de trilha sonora */}
          <button
            className={`btn-music ${musicOn ? "on" : ""}`}
            onClick={toggleMusic}
            title={musicOn ? `Trilha: ${MOOD_LABELS[mood]} — Desligar` : "Ligar trilha sonora ambiente"}
          >♪</button>
          <button
            className={`i-send ${loading || !input.trim() || autoWaiting ? "off" : ""}`}
            onClick={handleSend}
            disabled={loading || !input.trim() || autoWaiting}
          >⚔</button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: GST + PLAY_ST }} />
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

// ─── Styles ───────────────────────────────────────────────────────────
const GST = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#060407;overflow:hidden;-webkit-font-smoothing:antialiased}
textarea::placeholder,input::placeholder{color:#2a1800}
::-webkit-scrollbar{width:2px}
::-webkit-scrollbar-thumb{background:#2a1800;border-radius:2px}
@keyframes pulse{0%,100%{opacity:.15}50%{opacity:.85}}
@keyframes autopulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes hpflash{0%,100%{opacity:1}50%{opacity:.3}}
`;

const BASE = `
.root{font-family:'Palatino Linotype',Palatino,'Book Antiqua',serif;color:#c9a96e;background:#060407;display:flex;flex-direction:column;height:100dvh;max-width:500px;margin:0 auto}
`;

const HOME_ST = BASE + `
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
`;

const CREATE_ST = BASE + `
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
`;

const PLAY_ST = BASE + `
.root{overflow:hidden}

/* ── Header ── */
.header{flex-shrink:0;background:linear-gradient(180deg,#0e0700 0%,#060407 100%);border-bottom:1px solid #180e00}
.si-wrap{position:relative;height:155px;overflow:hidden}
.si{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s}
.si.ok{opacity:.72}
.si-ov{position:absolute;inset:0;background:linear-gradient(0deg,#060407 0%,transparent 50%,rgba(6,4,7,.5) 100%)}
.si-spin{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#2c1900;font-size:9px;letter-spacing:4px;animation:pulse 2s infinite}

/* ── HP Bar ── */
.hp-wrap{display:flex;align-items:center;gap:8px;padding:5px 12px 0;height:20px}
.hp-track{flex:1;height:4px;background:#0c0600;border-radius:2px;overflow:hidden}
.hp-fill{height:100%;border-radius:2px;transition:width .6s ease,background .6s}
.hp-txt{font-size:9px;color:#5a3a00;letter-spacing:1px;flex-shrink:0;min-width:60px;text-align:right}
.mood-badge{font-size:8px;color:#2a1800;letter-spacing:1px;background:#0a0600;border:1px solid #180e00;border-radius:3px;padding:1px 5px;flex-shrink:0}

/* ── Toolbar ── */
.tbar{display:flex;align-items:center;gap:6px;padding:6px 12px 8px}
.tc{flex:1;text-align:center;min-width:0}
.t-world{font-size:7px;letter-spacing:3px;color:#2c1900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t-name{font-size:14px;font-weight:bold;color:#d4a843;letter-spacing:1px;margin:2px 0}
.btn-sm{background:transparent;border:1px solid #180e00;border-radius:4px;color:#4a2c00;font-size:13px;padding:4px 6px;cursor:pointer;line-height:1;-webkit-tap-highlight-color:transparent;white-space:nowrap}

/* ── Panels ── */
.cpanel{margin:0 10px 8px;background:#0c0700;border:1px solid #180e00;border-radius:6px;padding:10px 12px;font-size:11px;line-height:2;color:#907040;max-height:200px;overflow-y:auto}
.cp-lbl{color:#d4a843;font-size:8px;letter-spacing:3px;margin-bottom:6px}
.cp-sub{font-size:8px;letter-spacing:2px;color:#2c1900;margin-top:8px;margin-bottom:4px}
.dd{color:#4a2c00}
.badge{font-size:8px;letter-spacing:2px;color:#2c1900;background:#0a0600;border:1px solid #180e00;border-radius:3px;padding:2px 6px}
.btn-export{width:100%;background:transparent;border:1px solid #3a2200;color:#8b5a14;padding:8px;margin-top:12px;border-radius:4px;font-size:10px;letter-spacing:2px;cursor:pointer;font-family:inherit;transition:background .15s}
.btn-export:hover{background:#180e00}

/* ── Missions ── */
.miss-row{display:flex;align-items:center;gap:8px;padding:3px 0;font-size:11px;color:#907040}
.miss-row.done{opacity:.45}
.miss-dot{width:6px;height:6px;border-radius:50%;background:#8b5a14;flex-shrink:0}
.miss-dot.done{background:#2c1900}
.miss-txt{flex:1;line-height:1.5}

/* ── Saves ── */
.save-row{display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid #0f0800}
.save-name{font-size:10px;color:#8b5a14;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.5}
.save-meta{font-size:8px;color:#2c1900;letter-spacing:1px}
.save-btn{border-radius:4px;border:1px solid #180e00;cursor:pointer;font-size:10px;padding:3px 7px;background:transparent;font-family:inherit;flex-shrink:0}
.save-btn.load{color:#c4a060;border-color:#3a2200}
.save-btn.del{color:#4a1a1a}

/* ── Map Modal ── */
.map-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
.map-box{background:#0c0700;border:1px solid #3a2200;border-radius:8px;width:100%;max-width:480px;overflow:hidden}
.map-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #180e00}
.map-close{background:transparent;border:none;color:#4a2c00;cursor:pointer;font-size:14px;padding:2px 6px}
.map-img{width:100%;display:block;opacity:0;transition:opacity 1s}
.map-img.ok{opacity:1}
.map-spin{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#2c1900;font-size:9px;letter-spacing:4px;animation:pulse 2s infinite;height:200px}

/* ── Messages ── */
.msgs{flex:1;overflow-y:auto;padding:12px 12px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}
.splash-load{text-align:center;margin-top:100px;color:#2c1900;font-size:9px;letter-spacing:4px;animation:pulse 2s infinite}
.b-gm{background:linear-gradient(135deg,#0c0700,#0f0900);border:1px solid #180e00;border-left:3px solid #4a2000;border-radius:6px;padding:14px;font-size:13px;line-height:1.95;color:#c4a060;white-space:pre-wrap}
.b-lbl{font-size:7px;letter-spacing:4px;color:#2c1900;margin-bottom:10px}
.b-u{background:#0a0600;border:1px solid #180e00;border-right:3px solid #7a4a10;border-radius:6px;padding:10px 12px;font-size:12px;color:#7a5520;max-width:84%;font-style:italic}
.b-auto{background:#0a0600;border:1px solid #1e1400;border-right:3px solid #4a3a00;border-radius:6px;padding:10px 12px;font-size:11px;color:#4a3a10;max-width:84%;font-style:italic}
.b-err{text-align:center;color:#6a1a1a;font-size:11px;padding:8px}
.b-load{text-align:center;color:#2c1900;font-size:9px;letter-spacing:4px;padding:12px 0;animation:pulse 2s infinite}
.b-load.auto-pulse{animation:autopulse 1s infinite;color:#5a4a00}
.auto-banner{background:#0c0900;border:1px solid #2a1e00;border-left:3px solid #6a5000;border-radius:6px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.auto-banner-top{display:flex;align-items:center;gap:8px;font-size:11px;color:#7a6020}
.auto-dot{width:7px;height:7px;border-radius:50%;background:#8b6a00;flex-shrink:0;animation:autopulse 1s infinite}
.auto-banner-top strong{color:#d4a843}
.btn-intervir{background:#1a1000;border:1px solid #5a4000;border-radius:4px;color:#d4a843;font-size:10px;padding:8px 14px;cursor:pointer;letter-spacing:2px;font-family:inherit;-webkit-tap-highlight-color:transparent}

/* ── Input area ── */
.iarea{flex-shrink:0;padding:8px 12px;padding-bottom:max(8px,env(safe-area-inset-bottom));border-top:1px solid #180e00;background:#060407;display:flex;gap:6px;align-items:flex-end}
.btn-auto{background:#0c0700;border:1px solid #180e00;border-radius:6px;color:#2c1900;font-size:8px;letter-spacing:1px;padding:0;width:42px;height:46px;cursor:pointer;font-family:inherit;flex-shrink:0;line-height:1.4;white-space:pre;-webkit-tap-highlight-color:transparent;transition:all .2s}
.btn-auto.on{background:#1a1000;border-color:#6a5000;color:#d4a843;animation:autopulse 1.5s infinite}
.ibox{flex:1;background:#0c0700;border:1px solid #180e00;border-radius:8px;padding:10px 12px;color:#c4a060;font-size:14px;font-family:inherit;outline:none;resize:none;line-height:1.5;-webkit-appearance:none}
.ibox:disabled{opacity:.35}
.btn-music{background:#0c0700;border:1px solid #180e00;border-radius:6px;color:#2c1900;font-size:14px;width:38px;height:21px;cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent;transition:all .2s;display:flex;align-items:center;justify-content:center;line-height:1}
.btn-music.on{background:#0a1400;border-color:#2a5000;color:#6a9a00}
.i-send{background:linear-gradient(135deg,#5a1a00,#2a0d00);border:1px solid #8b5a14;color:#d4a843;width:38px;height:21px;border-radius:6px;cursor:pointer;font-size:16px;flex-shrink:0;-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;line-height:1}
.i-send.off{background:#0c0700;border-color:#180e00;color:#2a1800;cursor:not-allowed}
`;
