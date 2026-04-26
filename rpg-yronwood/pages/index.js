import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { campaignStorage } from "../lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────
const extractImagePrompt = (text) => {
  const m = text.match(/IMAGE_PROMPT:\s*(.+)/i);
  return m ? m[1].trim() : null;
};
const extractOptions = (text) => {
  const matches = [...text.matchAll(/^\s*(\d)\.\s+(.+)/gm)];
  return matches.slice(-3).map(m => m[2].trim());
};
const extractItems = (text) => {
  const matches = [...text.matchAll(/\[ITEM:([^\]]+)\]/gi)];
  return matches.map(m => m[1].trim());
};
const cleanText = (t) =>
  t.replace(/IMAGE_PROMPT:\s*.+/gi, "")
   .replace(/\[(MISSÃO|CONCLUÍDA|ITEM):([^\]]+)\]/gi, "")
   .trim();
const generateImage = (prompt, world) => {
  const full = `${prompt}, ${world || "fantasy"} setting, cinematic, dramatic lighting, photorealistic, 8k, no text, no people`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=900&height=360&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
};
const uid = () => `c${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "";
const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

// ─── Mission parser ───────────────────────────────────────────────────
const parseMissions = (text, current) => {
  let updated = [...current];
  const newMatches = [...text.matchAll(/\[MISSÃO:([^\]]+)\]/gi)];
  for (const m of newMatches) {
    const mText = m[1].trim();
    if (!updated.find(ex => ex.text.toLowerCase() === mText.toLowerCase())) {
      updated.push({ id: uid(), text: mText, completed: false });
    }
  }
  const completedMatches = [...text.matchAll(/\[CONCLUÍDA:([^\]]+)\]/gi)];
  for (const c of completedMatches) {
    const cText = c[1].trim();
    updated = updated.map(m =>
      m.text.toLowerCase().includes(cText.toLowerCase()) ||
      cText.toLowerCase().includes(m.text.toLowerCase())
        ? { ...m, completed: true }
        : m
    );
  }
  return updated;
};

// ─── Item parser ──────────────────────────────────────────────────────
const parseItems = (text, current) => {
  let updated = [...current];
  const newMatches = extractItems(text);
  for (const item of newMatches) {
    if (!updated.some(i => i.toLowerCase() === item.toLowerCase())) {
      updated.push(item);
    }
  }
  return updated;
};

// ─── Aparência ────────────────────────────────────────────────────────
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
  relationships: {
    "Tywin Lannister": "Hostil",
    "Oberyn Martell": "Neutral",
    "Jon Snow": "Amigável",
    "Cersei Lannister": "Suspeito",
  },
};

// ─── System prompt ────────────────────────────────────────────────────
const buildPrompt = (c, loreExtra) =>
  [
    `Você é o Mestre de um RPG de texto ambientado em: ${c.world}.`,
    loreExtra
      ? `LORE OFICIAL DO UNIVERSO:\n${loreExtra}`
      : `CONTEXTO DO MUNDO: ${c.worldBg}`,
    ``,
    `O jogador controla: ${c.charName}${c.charTitle ? ` — ${c.charTitle}` : ""}.`,
    c.charAge         ? `Idade: ${c.charAge} anos.`             : "",
    c.charBg          ? `História: ${c.charBg}`                 : "",
    c.charPersonality ? `Personalidade: ${c.charPersonality}`   : "",
    c.charSkills      ? `Habilidades: ${c.charSkills}`          : "",
    c.appearance      ? buildAppearance(c.appearance)           : "",
    ``,
    `══════════════════════════════════════════`,
    `FILOSOFIA DE NARRAÇÃO — LEIA COM ATENÇÃO:`,
    `══════════════════════════════════════════`,
    ``,
    `REGRA 1 — MENOS É MAIS.`,
    `Descreva a cena com apenas 2 ou 3 elementos concretos e sensoriais. Não explique tudo. Deixe lacunas. O jogador deve sentir que há mais para descobrir se explorar, perguntar e agir. Brevidade com precisão é mais poderosa que abundância vaga. Parágrafos curtos. Frases que cortam.`,
    ``,
    `REGRA 2 — USE TODOS OS SENTIDOS, NÃO SÓ A VISÃO.`,
    `A cada cena, inclua pelo menos um detalhe sonoro, um tátil ou térmico, e um olfativo. O cheiro de sangue seco numa sala de audiências. O calor da tocha que não aquece. O rangido que vem de um corredor vazio. Sons, texturas e cheiros criam presença real. Imagens sozinhas são decoração.`,
    ``,
    `REGRA 3 — NUNCA DIGA O QUE O PERSONAGEM SENTE.`,
    `Você narra o mundo, não a alma de ${c.charName}. Nunca escreva "você sente medo", "você fica aliviado", "uma onda de raiva". Isso é papel do jogador. Descreva o que o mundo faz que poderia provocar uma reação: "O mensageiro não te olha nos olhos." "A criança para de chorar quando você entra." Pergunte diretamente quando necessário: "Como ${c.charName} reage?"`,
    ``,
    `REGRA 4 — NPCs TÊM VIDA PRÓPRIA, VOZ PRÓPRIA, AGENDA PRÓPRIA.`,
    `Cada NPC quer algo específico. Eles mentem, omitem, têm pressa, guardam rancor. Mas além disso: cada um fala diferente. Um soldado veterano usa frases curtas, quase ordens. Uma velha curandeira fala em meias-verdades e provérbios. Um nobre ansioso ri alto demais. Um jovem guarda gagueja quando nervoso. Essas marcas custam uma linha e transformam papelão em gente. Mostre o que eles fazem enquanto falam — o ferreiro que não para de trabalhar, o mercador que recolhe a mercadoria quando vê ${c.charName} chegar. Ação revela mais que palavra.`,
    ``,
    `REGRA 5 — AÇÕES TÊM PESO E O MUNDO PUNE DESCUIDO.`,
    `Decisões importam. Se ${c.charName} age com descuido, o mundo responde: um aliado desaparece, uma porta fecha, uma oportunidade some sem aviso. Não avise antes. Não dê segunda chance automaticamente. O mundo é indiferente à sorte do jogador — e isso torna as vitórias reais e os erros dolorosos.`,
    ``,
    `REGRA 6 — CADA CENA TEM UM CONFLITO, MESMO PEQUENO.`,
    `Não existe cena neutra. Uma conversa simples tem tensão embaixo: alguém quer algo que o outro não quer dar, alguém sabe algo que esconde, alguém tem pressa enquanto o outro quer demorar. Identifique o conflito de cada cena — mesmo que minúsculo — e deixe ele respirar. Subtexto é o que faz uma cena viver depois que o jogador fecha o jogo.`,
    ``,
    `REGRA 7 — PAUSA É NARRAÇÃO.`,
    `Às vezes a resposta mais pesada é o silêncio. "Ela não responde. Examina as próprias mãos." "A sala fica quieta." "O vento para." Pausas criam peso emocional. Uma cena pode terminar sem ação — com uma olhar, um gesto, um som distante. Use isso.`,
    ``,
    `REGRA 8 — TERMINE WITH UMA ABERTURA, NÃO COM UMA LISTA.`,
    `NUNCA ofereça opções numeradas como "1. Entrar 2. Fugir 3. Negociar". Isso mata a imersão. Termine com uma situação viva: uma pergunta do ambiente, a ação de um NPC, uma tensão que exige resposta. O jogador decide. Você só narra o que acontece.`,
    ``,
    `REGRA 9 — IMPROVISE COM INTENÇÃO.`,
    `Se o jogador explorar algo não planejado, crie na hora. Um detalhe de cenário pode virar pista, perigo ou aliado. O improviso deve parecer inevitável, não aleatório.`,
    ``,
    `REGRA 10 — RESPEITE O LORE.`,
    `As regras, a magia, a política e a física de ${c.world} existem e têm peso. Não quebre o lore por conveniência narrativa.`,
    ``,
    `REGRA 11 — MISSÕES E OBJETIVOS.`,
    `Quando surgir um objetivo claro para ${c.charName} — uma tarefa, um pedido, uma promessa, uma obrigação importante — inclua ao final da narração, na última linha: [MISSÃO: descrição em 1 linha]. Quando ${c.charName} cumprir um objetivo: [CONCLUÍDA: descrição em 1 linha]. Use com parcimônia — só para objetivos reais, não para cada ação pequena.`,
    ``,
    c.useImages
      ? `IMAGEM: Ao final de CADA resposta, na penúltima ou última linha (antes ou depois de [MISSÃO] se houver), adicione: IMAGE_PROMPT: [prompt em inglês descrevendo o cenário atual, estilo cinematic, sem texto, sem personagens de frente].`
      : `- NÃO inclua IMAGE_PROMPT nas respostas.`,
    ``,
    `REGRA 12 — MECÂNICA DE JOGO E DADOS.`,
    `Sempre que o jogador tentar algo difícil, incerto ou arriscado, interrompa a narração com: "[TESTE:ATRIBUTO] [Descrição do teste]" — onde ATRIBUTO é Força, Destreza, Mente ou Carisma.
    Exemplo: "[TESTE:Força] Role um dado de 20 faces para arrombar a porta."
    O jogador então lança o dado usando o botão "🎲 D20" no input. O Mestre deve narrar a consequência baseada no resultado (1-5: falha crítica, 6-10: falha, 11-15: sucesso parcial, 16-20: sucesso completo).
    Nunca diga o resultado do dado — deixe o jogador interpretá-lo. Apenas narre a consequência no contexto da cena.`,
    ``,
    `REGRA 13 — RELACIONAMENTOS E FACÇÕES.`,
    `Mantenha um registro oculto da atitude dos NPCs em relação a ${c.charName}:
    ${Object.entries(c.relationships || {}).map(([npc, attitude]) => `- ${npc}: ${attitude}`).join("\n    ")}
    Sempre que o jogador agir de forma rude, agressiva ou desrespeitosa com um NPC, mude permanentemente a atitude para "Hostil" ou "Suspeito".
    Se o jogador for gentil, justo ou útil, mude para "Amigável" ou "Neutral".
    Nunca explique a mudança de atitude ao jogador — apenas ajuste o tom da resposta do NPC.`,
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
  const [showChar, setShowChar] = useState(false);
  const [campLore, setCampLore] = useState("");

  // HP
  const [hp, setHp] = useState(100);

  // Missions
  const [missions, setMissions] = useState([]);

  // Saves
  const [saveFlash, setSaveFlash] = useState(false);

  // Auto mode
  const [autoMode, setAutoMode]       = useState(false);
  const [autoWaiting, setAutoWaiting] = useState(false);
  const [pendingOptions, setPending]  = useState([]);
  const [autoDelay, setAutoDelay]     = useState(3);
  const [countdown, setCountdown]     = useState(0);

  const [showInventory, setShowInventory] = useState(false);
  const [showCombat, setShowCombat] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [experience, setExperience] = useState(0);
  const [level, setLevel] = useState(1);
  const [attributes, setAttributes] = useState({ strength: 10, dexterity: 10, mind: 10, charisma: 10 });
  const [skills, setSkills] = useState({ combat: 1, stealth: 1, magic: 1, persuasion: 1, survival: 1, perception: 1 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [lastRoll, setLastRoll] = useState(null);
  const [showRollButton, setShowRollButton] = useState(false);
  const [pendingTest, setPendingTest] = useState(null);
  const [showStatusDashboard, setShowStatusDashboard] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showTimeSkipModal, setShowTimeSkipModal] = useState(false);
  const [timeSkipConfig, setTimeSkipConfig] = useState({
    amount: 1,
    unit: 'dias',
    focus: '',
    includeEvents: true,
    includeProgression: true
  });
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(true);
  const [characterAge, setCharacterAge] = useState(0);
  const [campaignStartTime, setCampaignStartTime] = useState(Date.now());
  const [showTestDropdown, setShowTestDropdown] = useState(false);

  const bottomRef = useRef(null);
  const taRef     = useRef(null);
  const sending   = useRef(false);
  const autoRef   = useRef(false);
  const timerRef  = useRef(null);
  const cdRef     = useRef(null);

  useEffect(() => {
    const loadInitialData = async () => {
      const campaigns = await loadIdx();
      setIdx(campaigns);
    };
    loadInitialData();
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [disp, loading, autoWaiting]);
  useEffect(() => { autoRef.current = autoMode; }, [autoMode]);
  useEffect(() => { if (view !== "play") { clearAuto(); } }, [view]);

  // ─── Storage ──────────────────────────────────────────────────────
  const saveIdx = async (l) => {
    try {
      localStorage.setItem(IDX_KEY, JSON.stringify(l));
    } catch (error) {
      console.error('Erro ao salvar índice:', error);
    }
  };

  const saveCamp = useCallback(async (id, d) => {
    try {
      await campaignStorage.saveCampaign(d);
    } catch (error) {
      console.error('Erro ao salvar no Supabase, usando fallback:', error);
      try {
        localStorage.setItem(campKey(id), JSON.stringify(d));
      } catch (fallbackError) {
        console.error('Erro no fallback localStorage:', fallbackError);
      }
    }
  }, []);

  const readCamp = async (id) => {
    try {
      const data = await campaignStorage.loadCampaign(id);
      if (data) return data;
    } catch (error) {
      console.error('Erro ao carregar do Supabase, usando fallback:', error);
    }
    try {
      return JSON.parse(localStorage.getItem(campKey(id)));
    } catch (error) {
      console.error('Erro no fallback localStorage:', error);
      return null;
    }
  };

  const loadIdx = async () => {
    try {
      const campaigns = await campaignStorage.listCampaigns();
      if (campaigns.length > 0) {
        return campaigns;
      }
    } catch (error) {
      console.error('Erro ao carregar índice do Supabase, usando fallback:', error);
    }
    try {
      return JSON.parse(localStorage.getItem(IDX_KEY) || "[]");
    } catch (error) {
      console.error('Erro no fallback localStorage:', error);
      return [];
    }
  };

  // ─── Utilitários ──────────────────────────────────────────────────
  const showNotification = useCallback((text, type = 'info') => {
    if (!notificationsEnabled) return;
    const toast = { id: Date.now(), text, type, timestamp: new Date() };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 3000);
  }, [notificationsEnabled]);

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      switch(type) {
        case 'damage':  oscillator.frequency.value = 200; gainNode.gain.value = 0.1; break;
        case 'success': oscillator.frequency.value = 800; gainNode.gain.value = 0.1; break;
        case 'levelup': oscillator.frequency.value = 600; gainNode.gain.value = 0.15; break;
        default:        oscillator.frequency.value = 440; gainNode.gain.value = 0.1;
      }
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {}
  }, [soundEnabled]);

  const changeHp = useCallback((delta) => {
    setHp(prev => {
      const next = Math.min(100, Math.max(0, prev + delta));
      if (delta < 0) {
        document.body.classList.add("damage-flash");
        setTimeout(() => document.body.classList.remove("damage-flash"), 300);
        playSound('damage');
      }
      return next;
    });
  }, [playSound]);

  // ─── Quick Save ───────────────────────────────────────────────────
  const quickSave = useCallback(async () => {
    if (!active) return;
    try {
      await saveCamp(active.id, active);
      setLastSaved(Date.now());
      showNotification('Jogo salvo rapidamente!', 'success');
      if (soundEnabled) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    } catch (error) {
      console.error('Erro no quick save:', error);
      showNotification('Erro ao salvar rapidamente', 'error');
    }
  }, [active, saveCamp, showNotification, soundEnabled]);

  // ─── Save Slots ───────────────────────────────────────────────────
  const saveSlot = () => {
    if (!active || loading) return;
    const lastGM = [...disp].reverse().find(m => m.type === "gm");
    const snippet = lastGM
      ? lastGM.text.replace(/\n/g, " ").slice(0, 58) + "…"
      : "Início da aventura";
    const newSave = {
      id: uid(),
      name: snippet,
      hp,
      timestamp: Date.now(),
      msgs: [...msgs],
      disp: [...disp],
      img: sceneImg,
      missions: [...missions],
      items: [...(active.items || [])],
      relationships: { ...(active.relationships || {}) },
    };
    const currentSaves = active.saves || [];
    const updatedSaves = [newSave, ...currentSaves].slice(0, 5);
    const updated = { ...active, saves: updatedSaves, missions, hp, items: newSave.items, relationships: newSave.relationships };
    setActive(updated);
    saveCamp(active.id, updated);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  const loadSlot = (save) => {
    if (!confirm("Carregar este save? O progresso não salvo será perdido.")) return;
    clearAuto();
    setMsgs(save.msgs || []);
    setDisp(save.disp || []);
    setSceneImg(save.img || null);
    setImgOk(!!save.img);
    setHp(save.hp ?? 100);
    setMissions(save.missions || []);
    setShowChar(false);
    setInput("");
  };

  const deleteSlot = (saveId) => {
    if (!confirm("Apagar este save permanentemente?")) return;
    const updatedSaves = (active.saves || []).filter(s => s.id !== saveId);
    const updated = { ...active, saves: updatedSaves };
    setActive(updated);
    saveCamp(active.id, updated);
  };

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

  // ─── Export to Book ───────────────────────────────────────────────
  const exportToBook = () => {
    const bookContent = disp.map(m => {
      if (m.type === "gm") {
        return `<p style="margin-bottom:24px;line-height:1.9;font-size:16px;text-align:justify;color:#111;">${m.text.replace(/\n/g, "<br/>")}</p>`;
      }
      if (m.type === "user" || m.type === "auto") {
        return `<div style="text-align:right;margin-bottom:24px;"><span style="font-style:italic;font-size:15px;color:#444;border-bottom:1px solid #ccc;padding-bottom:2px;">— ${m.text}</span></div>`;
      }
      return "";
    }).join("");

    const missionsHtml = missions.length
      ? `<div style="margin:40px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:20px 0;">
          <h3 style="font-size:14px;letter-spacing:3px;color:#555;margin-bottom:14px;">MISSÕES</h3>
          ${missions.map(m => `<p style="font-size:13px;color:${m.completed ? '#888' : '#111'};text-decoration:${m.completed ? 'line-through' : 'none'};margin-bottom:6px;">${m.completed ? "✓" : "◦"} ${m.text}</p>`).join("")}
        </div>`
      : "";

    const itemsHtml = active?.items?.length
      ? `<div style="margin:40px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:20px 0;">
          <h3 style="font-size:14px;letter-spacing:3px;color:#555;margin-bottom:14px;">MOCHILA</h3>
          ${active.items.map((item, i) => `<p style="font-size:13px;color:#111;margin-bottom:6px;">${i + 1}. ${item}</p>`).join("")}
        </div>`
      : "";

    const relationshipsHtml = active?.relationships && Object.keys(active.relationships).length
      ? `<div style="margin:40px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc;padding:20px 0;">
          <h3 style="font-size:14px;letter-spacing:3px;color:#555;margin-bottom:14px;">RELACIONAMENTOS</h3>
          ${Object.entries(active.relationships).map(([npc, attitude]) => `<p style="font-size:13px;color:#111;margin-bottom:6px;"><strong>${npc}:</strong> ${attitude}</p>`).join("")}
        </div>`
      : "";

    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>As Crônicas de ${active.charName}</title>
      <style>body{font-family:'Georgia',serif;padding:40px;color:#000;background:#fff;max-width:800px;margin:0 auto}@media print{body{padding:0;margin:0}@page{margin:2cm}}</style></head>
      <body>
        <div style="text-align:center;margin-bottom:80px;margin-top:50px;">
          <h1 style="font-size:38px;color:#000;letter-spacing:2px;">AS CRÔNICAS DE<br/>${active.charName.toUpperCase()}</h1>
          <h2 style="font-size:20px;font-weight:normal;color:#555;margin-bottom:30px;">${active.world}</h2>
          <div style="width:80px;height:2px;background:#000;margin:0 auto;"></div>
        </div>
        ${missionsHtml}
        ${itemsHtml}
        ${relationshipsHtml}
        ${bookContent}
        <div style="text-align:center;margin-top:60px;font-size:18px;"><strong>FIM.</strong></div>
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else alert("Permita pop-ups neste site para gerar o livro.");
  };

  // ─── Auto mode ────────────────────────────────────────────────────
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

      let chosen;
      const personality = camp.charPersonality?.toLowerCase() || "";

      if (personality.includes("orgulhoso")) {
        const proudOptions = options.filter(opt => opt.toLowerCase().includes("desafiar") || opt.toLowerCase().includes("exigir"));
        chosen = proudOptions.length ? proudOptions[Math.floor(Math.random() * proudOptions.length)] : options[Math.floor(Math.random() * options.length)];
      } else {
        chosen = options[Math.floor(Math.random() * options.length)];
      }

      sendMsg(chosen, currentMsgs, currentDisp, camp, lore, true);
    }, autoDelay * 1000);
  }, [autoDelay, sendMsg, autoRef, cdRef, timerRef, setAutoWaiting, setCountdown]);

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

  // ─── Home ─────────────────────────────────────────────────────────
  const openCamp = async (s) => {
    const data = await readCamp(s.id);
    if (!data) return;
    setActive(data);
    setMsgs(data.msgs || []);
    setDisp(data.disp || []);
    setSceneImg(data.img || null);
    setImgOk(!!data.img);
    setCampLore(data.lore || "");
    setHp(data.hp ?? 100);
    setMissions(data.missions || []);
    setShowChar(false);
    setAutoMode(false); setAutoWaiting(false); setPending([]);
    setView("play");
    if (!data.msgs?.length) doStart(data, data.lore || "");
  };

  const delCamp = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Apagar esta campanha permanentemente?")) return;
    try {
      await campaignStorage.deleteCampaign(id);
    } catch (err) {
      console.error('Erro ao deletar do Supabase:', err);
    }
    const next = idx.filter((c) => c.id !== id);
    setIdx(next);
    saveIdx(next);
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
    setHp(100); setMissions([]); setLastRoll(null); setShowRollButton(false); setInput("");

    const initialAge = parseInt(form.charAge) || 18;
    setCharacterAge(initialAge);
    setCampaignStartTime(Date.now());

    let lore = "";
    if (form.isKnownIP) { setStatus("🔍 A procurar lore oficial de " + form.world + "..."); lore = await fetchLore(form.world); }
    else { setStatus("⚗️ A preparar mundo..."); }
    const id = uid();
    const camp = { id, ...form, lore, msgs: [], disp: [], img: null, hp: 100, missions: [], saves: [], items: [], relationships: form.relationships || {}, createdAt: Date.now() };
    const summary = { id, world: form.world, charName: form.charName, createdAt: Date.now(), updatedAt: Date.now() };
    const next = [summary, ...idx];
    setIdx(next); saveIdx(next); await saveCamp(id, camp);
    setActive(camp); setCampLore(lore); setShowChar(false);
    setAutoMode(false); setAutoWaiting(false); setPending([]);
    setLoading(false); doStart(camp, lore);
  };

  // ─── Game ─────────────────────────────────────────────────────────
  const doStart = (camp, lore) => sendMsg(
    `Iniciar aventura. Narre o cenário inicial onde ${camp.charName} está agora no universo de "${camp.world}". Use no máximo 3 elementos concretos. Ative pelo menos dois sentidos além da visão. Não explique tudo — deixe lacunas. Apresente uma situação viva que exige uma reação, sem listar opções.`,
    [], [], camp, lore, false
  );

  const rollD20 = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    setLastRoll(roll);
    if (pendingTest) {
      const { attribute, description } = pendingTest;
      setPendingTest(null);
      sendMsg(
        `Resultado do teste de ${attribute}: ${description}. (Resultado: ${roll}/20)`,
        msgs, disp, active, campLore, false
      );
    } else {
      sendMsg(
        `Tento realizar uma ação e rolo um dado de 20 faces. (Resultado: ${roll}/20)`,
        msgs, disp, active, campLore, false
      );
    }
  };

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

      let raw = data.text;
      const updatedMissions = parseMissions(raw, missions);
      const updatedItems = parseItems(raw, active?.items || []);
      setMissions(updatedMissions);

      const imgPrompt = camp.useImages ? extractImagePrompt(raw) : null;
      const clean = cleanText(raw);
      const options = extractOptions(clean);

      const finalMsgs = [...newMsgs, { role: "assistant", content: raw }];
      const finalDisp = [...newDisp, { type: "gm", text: clean }];
      setMsgs(finalMsgs); setDisp(finalDisp);

      let newImg = camp.img || null;
      if (imgPrompt) {
        setImgOk(false);
        newImg = generateImage(imgPrompt, camp.world);
        setSceneImg(newImg);
        if (imgPrompt.toLowerCase().includes("rain") || imgPrompt.toLowerCase().includes("storm")) {
          document.body.classList.add("rain-overlay");
        } else {
          document.body.classList.remove("rain-overlay");
        }
      }

      const updated = { ...camp, msgs: finalMsgs, disp: finalDisp, img: newImg, lore, missions: updatedMissions, items: updatedItems, hp, updatedAt: Date.now() };
      setActive(updated);
      saveCamp(camp.id, updated);
      setIdx((prev) => { const next = prev.map((s) => s.id === camp.id ? { ...s, updatedAt: Date.now() } : s); saveIdx(next); return next; });

      setPending(options);
      if (autoRef.current && options.length > 0) {
        scheduleNextTurn(options, finalMsgs, finalDisp, updated, lore);
      } else if (autoRef.current && options.length === 0) {
        intervene();
      }

      if (raw.toLowerCase().includes("[teste:")) {
        const testMatch = raw.match(/\[TESTE:(\w+)\]\s*(.+)/i);
        if (testMatch) {
          setPendingTest({ attribute: testMatch[1], description: testMatch[2] });
          setShowRollButton(true);
        }
      }

      if (autoDetectionEnabled) {
        try {
          await applyAutoDetection(raw);
        } catch (error) {
          console.error('Erro na auto-detecção:', error);
        }
      }

    } catch {
      setDisp((prev) => [...prev, { type: "error", text: "Erro ao contatar o Mestre. Tente novamente." }]);
    }

    sending.current = false; setLoading(false); setStatus("");
  };

  const handleSend = () => {
    if (!input.trim() || sending.current || !active) return;
    clearAuto();

    const testMatch = input.match(/^\[TESTE:(\w+)\]\s*(.+)$/i);
    if (testMatch) {
      const attribute = testMatch[1];
      const description = testMatch[2];
      setPendingTest({ attribute, description });
      setShowRollButton(true);
      setInput("");
      taRef.current?.blur();
      return;
    }

    sendMsg(input, msgs, disp, active, campLore, false);
  };

  const resetChat = async () => {
    if (!active || !confirm("Recomeçar do início? O histórico será apagado.")) return;
    clearAuto(); setAutoMode(false); autoRef.current = false;
    const updated = { ...active, msgs: [], disp: [], img: null, missions: [], items: [], hp: 100 };
    setActive(updated); setMsgs([]); setDisp([]); setSceneImg(null);
    setMissions([]); setHp(100); setPending([]);
    await saveCamp(active.id, updated); doStart(updated, campLore);
  };

  const setApp = (key, val) => setForm(f => ({ ...f, appearance: { ...f.appearance, [key]: val } }));

  // ─── Inventário ───────────────────────────────────────────────────
  const addItem = useCallback(async (itemName) => {
    if (!active || !itemName) return;
    try {
      const currentItems = active.items || [];
      const newItems = [...currentItems, itemName];
      const updated = { ...active, items: newItems };
      setActive(updated);
      await saveCamp(active.id, updated);
      showNotification(`Item adicionado: ${itemName}`);
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      showNotification('Erro ao adicionar item', 'error');
    }
  }, [active, saveCamp, showNotification]);

  // ✅ FIX: recebe índice numérico, não string
  const removeItem = useCallback(async (index) => {
    if (!active || index < 0 || index >= (active.items || []).length) return;
    try {
      const newItems = (active.items || []).filter((_, i) => i !== index);
      const updated = { ...active, items: newItems };
      setActive(updated);
      await saveCamp(active.id, updated);
    } catch (error) {
      console.error('Erro ao remover item:', error);
      showNotification('Erro ao remover item', 'error');
    }
  }, [active, saveCamp, showNotification]);

  const useItem = useCallback(async (itemName) => {
    if (!active || !itemName) return;
    try {
      const itemLower = itemName.toLowerCase();
      let hpChange = 0;
      let message = '';

      if (itemLower.includes('poção') || itemLower.includes('cura')) {
        hpChange = 20; message = `Você usou ${itemName} e recuperou 20 HP!`;
      } else if (itemLower.includes('comida') || itemLower.includes('racao')) {
        hpChange = 5; message = `Você comeu ${itemName} e recuperou 5 HP!`;
      } else {
        message = `Você usou ${itemName}`;
      }

      if (hpChange > 0) changeHp(hpChange);
      showNotification(message);

      const itemIndex = active.items?.indexOf(itemName);
      if (itemIndex !== -1) await removeItem(itemIndex);
    } catch (error) {
      console.error('Erro ao usar item:', error);
      showNotification('Erro ao usar item', 'error');
    }
  }, [active, changeHp, removeItem, showNotification]);

  // ─── Personagem / Combate ──────────────────────────────────────────
  const handleLevelUp = () => {
    setLevel(prev => prev + 1);
    setAttributes(prev => ({
      strength: prev.strength + 1,
      dexterity: prev.dexterity + 1,
      mind: prev.mind + 1,
      charisma: prev.charisma + 1
    }));
    showNotification(`⬆️ Você subiu para o nível ${level + 1}!`);
    changeHp(25);
  };

  const handleUpdateCharacter = (updatedCharacter) => {
    if (!active) return;
    const updated = { ...active, ...updatedCharacter };
    setActive(updated);
    saveCamp(active.id, updated);
    showNotification('Ficha de personagem atualizada!', 'info');
  };

  const handleCombatEnd = (victory, enemy = null) => {
    if (victory && enemy) {
      const xpGained = (enemy.hp || 10) * 2;
      setExperience(prev => {
        const newTotal = prev + xpGained;
        const newLevel = Math.floor(newTotal / 100) + 1;
        if (newLevel > level) {
          setLevel(newLevel);
          showNotification(`PARABÉNS! Você alcançou o nível ${newLevel}!`);
          changeHp(25);
        }
        return newTotal;
      });
      showNotification(`Vitória! Você ganhou ${xpGained} XP!`);
    } else {
      showNotification(`Você fugiu do combate!`);
    }
  };

  // ─── Conexão / Auto-save ──────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ✅ FIX: quickSave adicionado às dependências
  useEffect(() => {
    if (!autoSaveEnabled || !active) return;
    const interval = setInterval(() => { quickSave(); }, 60000);
    return () => clearInterval(interval);
  }, [autoSaveEnabled, active, quickSave]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); quickSave(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSave]);

  // ─── Auto-Detecção ─────────────────────────────────────────────────
  const parseMessageForAutoDetection = useCallback((message) => {
    if (!autoDetectionEnabled || !active) return { items: [], missions: [], status: null };
    const detected = { items: [], missions: [], status: null };

    const itemPatterns = [
      /(?:ganhou|recebeu|encontrou|obteve|adquiriu|pegou|conseguiu)\s+(?:uma?|o?)\s*([a-zA-Zà-ú\s]+?)(?:\s|\.|,|$)/gi,
    ];
    itemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const item = match[1].trim();
        if (item.length > 2 && !['o','a','os','as','um','uma','uns','umas','de','da','do','dos','das'].includes(item.toLowerCase())) {
          detected.items.push(item);
        }
      }
    });

    const agePatterns = [
      /(?:tem|possui)\s+(\d+)\s*(?:anos|years)/gi,
    ];
    agePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const age = parseInt(match[1]);
        if (age >= 0 && age <= 150) detected.age = age;
      }
    });

    return detected;
  }, [autoDetectionEnabled, active]);

  const applyAutoDetection = useCallback(async (message) => {
    const detected = parseMessageForAutoDetection(message);

    if (detected.items.length > 0) {
      for (const item of detected.items) {
        await addItem(item);
        showNotification(`🎒 Item detectado: ${item}`, 'success');
      }
    }

    if (detected.age !== undefined) {
      setCharacterAge(detected.age);
      showNotification(`👤 Idade atualizada: ${detected.age} anos`, 'info');
      if (active) {
        const updated = { ...active, charAge: detected.age.toString() };
        setActive(updated);
        await saveCamp(active.id, updated);
      }
    }

    return detected;
  }, [parseMessageForAutoDetection, addItem, active, saveCamp, showNotification]);

  // ─── Time-Skip ─────────────────────────────────────────────────────
  const executeTimeSkip = async () => {
    if (!active || !timeSkipConfig.focus.trim()) {
      showNotification('Preencha o foco do personagem', 'warning');
      return;
    }
    try {
      setLoading(true);
      setShowTimeSkipModal(false);

      const timePrompt = `[TIMESKIP: ${timeSkipConfig.amount} ${timeSkipConfig.unit}]\nFOCO: ${timeSkipConfig.focus}\nPERSONAGEM: ${active.charName} — ${active.charTitle}\nPERSONALIDADE: ${active.charPersonality}\nHABILIDADES: ${active.charSkills}\n\nGere uma narrativa detalhada sobre o que ${active.charName} fez durante este período de ${timeSkipConfig.amount} ${timeSkipConfig.unit}, focando em: ${timeSkipConfig.focus}. ${timeSkipConfig.includeProgression ? 'Inclua ganho de experiência.' : ''} ${timeSkipConfig.includeEvents ? 'Crie 1-2 eventos significativos.' : ''} Termine com a situação atual do personagem.`;

      await sendMsg(timePrompt, msgs, disp, active, campLore, false);
      showNotification(`Avançando ${timeSkipConfig.amount} ${timeSkipConfig.unit} no tempo...`, 'info');

      if (timeSkipConfig.includeProgression) {
        const xpMultiplier = { 'dias': 5, 'semanas': 25, 'meses': 100, 'anos': 500 };
        const xpGained = timeSkipConfig.amount * (xpMultiplier[timeSkipConfig.unit] || 5);
        setExperience(prev => prev + xpGained);
      }

      const ageMultiplier = { 'dias': 1/365, 'semanas': 1/52, 'meses': 1/12, 'anos': 1 };
      const ageIncrease = timeSkipConfig.amount * (ageMultiplier[timeSkipConfig.unit] || 0);
      const newAge = Math.max(0, characterAge + ageIncrease);
      setCharacterAge(newAge);

      if (active) {
        const updated = { ...active, charAge: Math.floor(newAge).toString(), updatedAt: Date.now() };
        setActive(updated);
        await saveCamp(active.id, updated);
      }

      showNotification(`👤 Seu personagem agora tem ${Math.floor(newAge)} anos!`, 'info');
    } catch (error) {
      console.error('Erro no time-skip:', error);
      showNotification('Erro ao avançar no tempo', 'error');
      setShowTimeSkipModal(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.className = newTheme;
  };

  const insertCmd = (cmd) => {
    setInput(prev => {
      const space = prev && !prev.endsWith(" ") ? " " : "";
      return prev + space + cmd;
    });
    taRef.current?.focus();
  };

  const activeMissions = missions.filter(m => !m.completed);
  const doneMissions   = missions.filter(m => m.completed);

  // ═══ HOME ══════════════════════════════════════════════════════════
  if (view === "home") return (
    <div className="root">
      <Head><title>Forja de Mundos</title></Head>
      <div className="hh">
        <div className="hh-icon">⚔</div>
        <div className="hh-title">FORJA DE MUNDOS</div>
        <div className="hh-sub">RPG · CRIAÇÃO DE AVENTURAS</div>
      </div>
      <div className="list">
        {!idx.length ? (
          <div className="empty">
            <div className="e-icon">🌍</div>
            <div className="e-txt">Nenhum mundo criado ainda.<br />Comece a sua primeira aventura.</div>
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

  // ═══ CREATE ════════════════════════════════════════════════════════
  if (view === "create") return (
    <div className="root">
      <Head><title>Novo Personagem</title></Head>
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
            desc={form.isKnownIP ? "🔍 Vou procurar o lore oficial na internet (anime, mangá, jogo, livro...)" : "✨ Mundo original — você define o contexto abaixo"}
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

  // ═══ PLAY ══════════════════════════════════════════════════════════
  const c = active || {};
  const hpColor = hp > 60 ? "#2a6a2a" : hp > 30 ? "#8b7a00" : "#8b1a00";

  return (
    <div className="root">
      <Head><title>{c.charName} — {c.world}</title></Head>

      {/* ✅ FIX: header agora tem a tag de fechamento </div> correta */}
      <div className="header">
        {c.useImages && sceneImg && (
          <div className="si-wrap">
            <img src={sceneImg} alt="" className={`si ${imgOk ? "ok" : ""}`} onLoad={() => setImgOk(true)} />
            <div className="si-ov" />
            {!imgOk && <div className="si-spin">✦ GERANDO CENA ✦</div>}
          </div>
        )}
        <div className="tbar">
          <button className="btn-sm" onClick={() => { clearAuto(); setView("home"); }}>⌂</button>
          <div className="tc">
            <div className="t-world">{c.world}</div>
            <div className="t-name">⚔ {c.charName}</div>
            {c.charTitle && <div className="t-world">{c.charTitle}</div>}
          </div>
          <div className="hp-mini" title="Vida">
            <div className="hp-mini-bar" style={{ width: `${hp}%`, background: hpColor }} />
            <span className="hp-mini-val">{hp}</span>
          </div>
        </div>
      </div>
      {/* ↑ header fechado aqui — estava faltando no código original */}

      {/* Mensagens */}
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

      {/* Status Dashboard */}
      {showStatusDashboard && (
        <div className="status-dashboard">
          <div className="status-section">
            <div className="status-item">
              <span className="status-label">HP</span>
              <div className="hp-bar">
                <div className="hp-fill" style={{ width: `${hp}%` }}></div>
                <span className="hp-text">{hp}/100</span>
              </div>
            </div>
            <div className="status-item">
              <span className="status-label">Nível {level}</span>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${(experience % 100)}%` }}></div>
                <span className="xp-text">{experience % 100}/100 XP</span>
              </div>
            </div>
            <div className="status-item">
              <span className="status-label">Idade</span>
              <div className="age-display">
                <span className="age-text">{Math.floor(characterAge)} anos</span>
                <span className="age-icon">👤</span>
              </div>
            </div>
          </div>
          <div className="status-info">
            <span className={`connection-indicator ${connectionStatus}`}>
              {connectionStatus === 'online' ? '🟢' : '🔴'}
            </span>
            {lastSaved && (
              <span className="last-saved">
                💾 {new Date(lastSaved).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="q-actions">
        <button className="q-btn q-dice" onClick={rollD20}>🎲 ROLAR D20</button>
        <div className="test-dropdown">
          <button className="q-btn test-btn" onClick={() => setShowTestDropdown(!showTestDropdown)}>
            💪 TESTE ▼
          </button>
          {showTestDropdown && (
            <div className="test-dropdown-menu">
              {[
                ["💪","Força"],["🏃","Destreza"],["🛡️","Constituição"],
                ["🧠","Inteligência"],["📿","Sabedoria"],["✨","Carisma"],
                ["👁️","Percepção"],["🥷","Furtividade"],["😠","Intimidação"],
                ["🗣️","Persuasão"],["🔍","Investigação"],["🔮","Arcana"],
              ].map(([icon, attr]) => (
                <button key={attr} className="test-option" onClick={() => { insertCmd(`[TESTE:${attr}] `); setShowTestDropdown(false); }}>
                  {icon} {attr}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="q-btn" onClick={() => setShowInventory(!showInventory)}>🎒 INVENTÁRIO</button>
        <button className="q-btn" onClick={toggleTheme}>🎨 TEMA</button>
        <button className="q-btn" onClick={() => setShowStatusDashboard(!showStatusDashboard)}>
          📊 {showStatusDashboard ? 'OCULTAR' : 'STATUS'}
        </button>
        <button className="q-btn q-time" onClick={() => setShowTimeSkipModal(!showTimeSkipModal)}>
          ⏰ TIME-SKIP
        </button>
        <button
          className={`q-btn ${autoDetectionEnabled ? 'q-auto-on' : 'q-auto-off'}`}
          onClick={() => setAutoDetectionEnabled(!autoDetectionEnabled)}
          title={autoDetectionEnabled ? "Desativar auto-detecção" : "Ativar auto-detecção"}
        >
          🤖 {autoDetectionEnabled ? 'AUTO-ON' : 'AUTO-OFF'}
        </button>
      </div>

      {/* Modal Inventory */}
      {showInventory && (
        <div className="modal-overlay" onClick={() => setShowInventory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎒 Inventário</h3>
              <button className="modal-close" onClick={() => setShowInventory(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="inventory-section">
                <div className="inventory-label">Itens ({(c.items || []).length})</div>
                {!(c.items || []).length ? (
                  <div className="inventory-empty">Nenhum item no inventário</div>
                ) : (
                  <div className="inventory-list">
                    {/* ✅ FIX: removeItem(i) com índice numérico, não removeItem(item) */}
                    {(c.items || []).map((item, i) => (
                      <div key={i} className="inventory-item">
                        <span className="item-name">{item}</span>
                        <button
                          className="item-remove"
                          onClick={() => removeItem(i)}
                          title="Remover item"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="inventory-add">
                <input
                  type="text"
                  placeholder="Adicionar novo item..."
                  className="inventory-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      addItem(e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  className="inventory-add-btn"
                  onClick={() => {
                    const inp = document.querySelector('.inventory-input');
                    if (inp && inp.value.trim()) {
                      addItem(inp.value.trim());
                      inp.value = '';
                    }
                  }}
                >
                  + Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Time-Skip */}
      {showTimeSkipModal && (
        <div className="modal-overlay" onClick={() => setShowTimeSkipModal(false)}>
          <div className="modal-content time-skip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="time-skip-header">
              <h3>⏰ Avançar no Tempo</h3>
              <button className="modal-close" onClick={() => setShowTimeSkipModal(false)}>✕</button>
            </div>
            <div className="time-skip-body">
              <div className="time-config-section">
                <label>Quanto tempo deseja avançar?</label>
                <div className="time-input-group">
                  <input
                    type="number" min="1" max="100"
                    value={timeSkipConfig.amount}
                    onChange={(e) => setTimeSkipConfig(prev => ({ ...prev, amount: parseInt(e.target.value) || 1 }))}
                    className="time-input"
                  />
                  <select
                    value={timeSkipConfig.unit}
                    onChange={(e) => setTimeSkipConfig(prev => ({ ...prev, unit: e.target.value }))}
                    className="time-select"
                  >
                    <option value="dias">Dias</option>
                    <option value="semanas">Semanas</option>
                    <option value="meses">Meses</option>
                    <option value="anos">Anos</option>
                  </select>
                </div>
              </div>
              <div className="time-config-section">
                <label>O que seu personagem vai fazer durante este tempo?</label>
                <textarea
                  value={timeSkipConfig.focus}
                  onChange={(e) => setTimeSkipConfig(prev => ({ ...prev, focus: e.target.value }))}
                  placeholder="Ex: Treinar combate, estudar magia, viajar para outra cidade..."
                  className="time-textarea"
                  rows={3}
                />
              </div>
              <div className="time-config-section">
                <div className="time-options">
                  <label className="time-checkbox">
                    <input type="checkbox" checked={timeSkipConfig.includeEvents}
                      onChange={(e) => setTimeSkipConfig(prev => ({ ...prev, includeEvents: e.target.checked }))} />
                    <span>Incluir eventos importantes</span>
                  </label>
                  <label className="time-checkbox">
                    <input type="checkbox" checked={timeSkipConfig.includeProgression}
                      onChange={(e) => setTimeSkipConfig(prev => ({ ...prev, includeProgression: e.target.checked }))} />
                    <span>Incluir progressão (XP e habilidades)</span>
                  </label>
                </div>
              </div>
              <div className="time-preview">
                <h4>Preview:</h4>
                <p>
                  {c.charName} vai passar <strong>{timeSkipConfig.amount} {timeSkipConfig.unit}</strong>
                  {timeSkipConfig.focus && ` focado em: ${timeSkipConfig.focus}`}
                </p>
                {timeSkipConfig.includeProgression && (
                  <p className="xp-preview">
                    Ganho estimado: {timeSkipConfig.amount * ({ 'dias': 5, 'semanas': 25, 'meses': 100, 'anos': 500 }[timeSkipConfig.unit] || 5)} XP
                  </p>
                )}
              </div>
            </div>
            <div className="time-skip-footer">
              <button className="btn-cancel" onClick={() => setShowTimeSkipModal(false)}>Cancelar</button>
              <button
                className="btn-confirm"
                onClick={executeTimeSkip}
                disabled={!timeSkipConfig.focus.trim() || loading}
              >
                {loading ? 'Avançando...' : 'Avançar no Tempo ⏰'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="iarea">
        <button
          className={`btn-auto ${autoMode ? "on" : ""}`}
          onClick={toggleAuto}
          title={autoMode ? "Desativar modo automático" : "Ativar modo automático"}
        >
          {autoMode ? "AUTO\nLIGADO" : "AUTO\nDESL."}
        </button>
        <textarea
          ref={taRef}
          className="ibox"
          value={input}
          rows={2}
          disabled={loading || autoWaiting}
          placeholder={autoMode ? "Auto ligado — aperte AUTO pra intervir" : `O que ${c.charName || "o personagem"} faz?`}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        {showRollButton && (
          <button className="i-roll" onClick={rollD20}>
            🎲 {lastRoll ? lastRoll : "D20"}
          </button>
        )}
        <button
          className={`i-send ${loading || !input.trim() || autoWaiting ? "off" : ""}`}
          onClick={handleSend}
          disabled={loading || !input.trim() || autoWaiting}
        >⚔</button>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <span className="toast-message">{toast.text}</span>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: GST + PLAY_ST + TOAST_ST + TIME_SKIP_ST }} />
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
@keyframes flashgreen{0%{background:#1a3a0a;border-color:#4a8a14;color:#a0d060}100%{background:transparent;border-color:#2a1800;color:#4a2c00}}
@keyframes damageFlash{ 0% { filter: brightness(1.2) hue-rotate(10deg); } 50% { filter: brightness(0.8) hue-rotate(-10deg); } 100% { filter: brightness(1); } }
@keyframes rain { 0% { transform: translateY(-100px); } 100% { transform: translateY(100px); } }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
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
.header{flex-shrink:0;background:linear-gradient(180deg,#0e0700 0%,#060407 100%);border-bottom:1px solid #180e00}
.si-wrap{position:relative;height:175px;overflow:hidden}
.si{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s}
.si.ok{opacity:.72}
.si-ov{position:absolute;inset:0;background:linear-gradient(0deg,#060407 0%,transparent 50%,rgba(6,4,7,.5) 100%)}
.si-spin{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#2c1900;font-size:9px;letter-spacing:4px;animation:pulse 2s infinite}
.tbar{display:flex;align-items:center;gap:6px;padding:10px 12px}
.tc{flex:1;text-align:center;min-width:0}
.t-world{font-size:7px;letter-spacing:3px;color:#2c1900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t-name{font-size:15px;font-weight:bold;color:#d4a843;letter-spacing:1px;margin:2px 0}
.btn-sm{background:transparent;border:1px solid #180e00;border-radius:4px;color:#4a2c00;font-size:14px;padding:5px 7px;cursor:pointer;line-height:1;-webkit-tap-highlight-color:transparent;flex-shrink:0}
.hp-mini{position:relative;width:32px;height:32px;flex-shrink:0;border:1px solid #180e00;border-radius:4px;overflow:hidden;cursor:default;display:flex;align-items:center;justify-content:center}
.hp-mini-bar{position:absolute;bottom:0;left:0;height:100%;transition:width .4s,background .4s;opacity:.35}
.hp-mini-val{position:relative;font-size:9px;color:#c4a060;letter-spacing:0;z-index:1}
.msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}
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
.q-actions{display:flex;gap:6px;padding:0 12px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}
.q-actions::-webkit-scrollbar{display:none}
.q-btn{background:#0a0600;border:1px solid #1e1400;border-radius:4px;color:#6b4a1a;font-size:9px;padding:6px 10px;cursor:pointer;white-space:nowrap;font-family:inherit;letter-spacing:1px;-webkit-tap-highlight-color:transparent;transition:all .2s;flex-shrink:0}
.q-btn:active{background:#1a0e00;border-color:#4a2c00;transform:scale(.95)}
.q-btn.q-dice{background:linear-gradient(135deg,#1a0d3a,#0a031a);border-color:#2a1e6a;color:#9a7afa;font-weight:bold}
.q-btn.q-time{background:linear-gradient(135deg,#1a3a2a,#0a1a1a);border-color:#2a4a2a;color:#7afa7a;font-weight:bold}
.q-btn.q-auto-on{background:linear-gradient(135deg,#1a3a3a,#0a1a1a);border-color:#2a4a4a;color:#7afafa;font-weight:bold}
.q-btn.q-auto-off{background:linear-gradient(135deg,#3a1a1a,#1a0a0a);border-color:#4a2a2a;color:#fa7a7a;font-weight:bold}
.iarea{flex-shrink:0;padding:10px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom));border-top:1px solid #180e00;background:#060407;display:flex;gap:6px;align-items:flex-end}
.btn-auto{background:#0c0700;border:1px solid #180e00;border-radius:6px;color:#2c1900;font-size:8px;letter-spacing:1px;padding:0;width:44px;height:48px;cursor:pointer;font-family:inherit;flex-shrink:0;line-height:1.4;white-space:pre;-webkit-tap-highlight-color:transparent;transition:all .2s}
.btn-auto.on{background:#1a1000;border-color:#6a5000;color:#d4a843;animation:autopulse 1.5s infinite}
.ibox{flex:1;background:#0c0700;border:1px solid #180e00;border-radius:8px;padding:10px 12px;color:#c4a060;font-size:14px;font-family:inherit;outline:none;resize:none;line-height:1.5;-webkit-appearance:none}
.ibox:disabled{opacity:.35}
.i-send{background:linear-gradient(135deg,#5a1a00,#2a0d00);border:1px solid #8b5a14;color:#d4a843;width:48px;height:48px;border-radius:8px;cursor:pointer;font-size:18px;flex-shrink:0;-webkit-tap-highlight-color:transparent}
.i-send.off{background:#0c0700;border-color:#180e00;color:#2a1800;cursor:not-allowed}
.i-roll{background:linear-gradient(135deg,#1a0d3a,#0a031a);border:1px solid #2a1e6a;color:#6a4afa;width:48px;height:48px;border-radius:8px;cursor:pointer;font-size:16px;flex-shrink:0;-webkit-tap-highlight-color:transparent}
.damage-flash{animation:damageFlash .3s ease-in-out}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;box-sizing:border-box}
.modal-content{background:#0c0700;border:1px solid #180e00;border-radius:8px;max-width:90vw;max-height:90vh;width:400px;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,.5)}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #2a1e6a;background:rgba(26,15,40,.8)}
.modal-header h3{margin:0;color:#d4a843;font-size:16px}
.modal-close{background:none;border:none;color:#8b7a6a;font-size:18px;cursor:pointer;padding:8px;border-radius:4px;min-width:44px;min-height:44px}
.modal-body{padding:20px}
.inventory-section{margin-bottom:20px}
.inventory-label{display:block;font-size:12px;color:#d4a843;font-weight:bold;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px}
.inventory-empty{text-align:center;padding:20px;color:#8b7a6a;font-style:italic;background:rgba(26,15,40,.3);border-radius:8px;border:1px dashed #3a2e6a}
.inventory-list{max-height:200px;overflow-y:auto;border:1px solid #3a2e6a;border-radius:8px;background:rgba(20,15,40,.5);-webkit-overflow-scrolling:touch}
.inventory-item{display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid rgba(58,46,106,.2);min-height:44px}
.inventory-item:last-child{border-bottom:none}
.item-name{color:#c4a060;font-size:13px;flex:1}
.item-remove{background:rgba(139,26,26,.2);border:1px solid rgba(139,26,26,.4);color:#d44a4a;font-size:10px;padding:6px 10px;border-radius:4px;cursor:pointer;min-width:44px;min-height:32px}
.inventory-add{display:flex;gap:8px;margin-top:12px}
.inventory-input{flex:1;background:rgba(20,15,40,.8);border:1px solid #3a2e6a;border-radius:6px;padding:12px;color:#c4a060;font-size:14px;outline:none;min-height:44px;-webkit-appearance:none}
.inventory-input::placeholder{color:#8b7a6a}
.inventory-add-btn{background:rgba(74,46,106,.8);border:1px solid #4a3e8a;border-radius:6px;padding:12px 16px;color:#d4a843;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;min-width:44px;min-height:44px}
.status-dashboard{position:fixed;top:10px;right:10px;background:rgba(20,15,40,.95);border:1px solid #3a2e6a;border-radius:12px;padding:12px;z-index:1000;min-width:220px;max-width:280px;backdrop-filter:blur(10px)}
.status-section{display:flex;flex-direction:column;gap:10px;margin-bottom:10px}
.status-item{display:flex;flex-direction:column;gap:4px}
.status-label{color:#9a7afa;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
.hp-bar,.xp-bar{position:relative;height:20px;background:rgba(10,5,20,.8);border:1px solid #2a1e6a;border-radius:10px;overflow:hidden}
.hp-fill{height:100%;background:linear-gradient(90deg,#ff3838,#ff6b6b);transition:width .5s ease;border-radius:8px}
.xp-fill{height:100%;background:linear-gradient(90deg,#4a9eff,#7ac5ff);transition:width .5s ease;border-radius:8px}
.hp-text,.xp-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:10px;font-weight:bold;text-shadow:0 1px 2px rgba(0,0,0,.8)}
.age-display{display:flex;align-items:center;justify-content:space-between;background:rgba(26,15,40,.8);border:1px solid #2a1e6a;border-radius:10px;padding:8px 12px;min-height:20px}
.age-text{color:#d4a843;font-size:11px;font-weight:bold}
.age-icon{font-size:12px;opacity:.8}
.status-info{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid rgba(58,46,106,.3)}
.connection-indicator{font-size:12px}
.last-saved{color:#9a7afa;font-size:10px;opacity:.8}
.test-dropdown{position:relative;display:inline-block}
.test-dropdown-menu{position:absolute;bottom:100%;left:0;background:rgba(20,15,40,.98);border:1px solid #3a2e6a;border-radius:8px;min-width:140px;max-height:300px;overflow-y:auto;z-index:1000;box-shadow:0 4px 12px rgba(0,0,0,.3);margin-bottom:5px}
.test-option{display:block;width:100%;padding:8px 12px;background:transparent;border:none;color:#c4a060;font-size:11px;text-align:left;cursor:pointer;border-bottom:1px solid rgba(58,46,106,.2)}
.test-option:hover{background:rgba(58,46,106,.3);color:#d4a843}
.test-option:last-child{border-bottom:none}
@media(max-width:480px){.status-dashboard{position:relative;top:auto;right:auto;margin:8px;min-width:auto;max-width:none}}
`;

const TOAST_ST = `
.toast-container{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast{display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:8px;backdrop-filter:blur(10px);box-shadow:0 4px 20px rgba(0,0,0,.3);animation:slideInDown .3s ease;pointer-events:auto;max-width:400px;min-width:250px}
.toast-icon{font-size:16px;flex-shrink:0}
.toast-message{font-size:13px;font-weight:500;line-height:1.4}
.toast-success{background:rgba(26,58,10,.95);border:1px solid #4a8a14;color:#a0d060}
.toast-error{background:rgba(58,10,10,.95);border:1px solid #8a1414;color:#d06060}
.toast-warning{background:rgba(58,58,10,.95);border:1px solid #8a8a14;color:#d0d060}
.toast-info{background:rgba(42,13,0,.95);border:1px solid #8b5a14;color:#d4a843}
@keyframes slideInDown{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
@media(max-width:768px){.toast-container{top:10px;left:10px;right:10px;transform:none}.toast{max-width:none;min-width:auto}}
`;

const TIME_SKIP_ST = `
.time-skip-modal{max-width:500px;width:90%}
.time-skip-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:2px solid #3a2e6a}
.time-skip-header h3{color:#9a7afa;font-size:18px;margin:0}
.time-skip-body{display:flex;flex-direction:column;gap:20px;padding:20px}
.time-config-section label{display:block;color:#9a7afa;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.time-input-group{display:flex;gap:10px;align-items:center}
.time-input{flex:0 0 80px;background:rgba(10,5,20,.8);border:1px solid #2a1e6a;border-radius:6px;padding:8px 12px;color:#c4a060;font-size:14px;outline:none}
.time-select{flex:1;background:rgba(10,5,20,.8);border:1px solid #2a1e6a;border-radius:6px;padding:8px 12px;color:#c4a060;font-size:14px;outline:none;cursor:pointer}
.time-textarea{width:100%;background:rgba(10,5,20,.8);border:1px solid #2a1e6a;border-radius:6px;padding:10px 12px;color:#c4a060;font-size:13px;font-family:inherit;resize:vertical;outline:none}
.time-textarea::placeholder{color:rgba(196,160,96,.4)}
.time-options{display:flex;flex-direction:column;gap:12px}
.time-checkbox{display:flex;align-items:center;gap:10px;cursor:pointer;color:#c4a060;font-size:13px}
.time-checkbox input[type="checkbox"]{width:18px;height:18px;accent-color:#9a7afa}
.time-preview{background:rgba(26,15,40,.5);border:1px solid #3a2e6a;border-radius:8px;padding:15px;margin:0 20px}
.time-preview h4{color:#9a7afa;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px 0}
.time-preview p{color:#c4a060;font-size:13px;margin:5px 0;line-height:1.4}
.time-preview strong{color:#d4b070}
.xp-preview{color:#7afa7a !important;font-weight:bold}
.time-skip-footer{display:flex;gap:10px;justify-content:flex-end;padding:15px 20px;border-top:1px solid #3a2e6a}
.btn-cancel,.btn-confirm{padding:10px 20px;border:none;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px}
.btn-cancel{background:rgba(58,10,10,.8);color:#d06060;border:1px solid #8a1414}
.btn-confirm{background:linear-gradient(135deg,#1a3a0a,#0a1a0a);color:#a0d060;border:1px solid #4a8a14}
.btn-confirm:disabled{opacity:.5;cursor:not-allowed}
@media(max-width:768px){.time-skip-modal{width:95%;max-width:none}.time-input-group{flex-direction:column;align-items:stretch}.time-input{flex:1}.time-skip-footer{flex-direction:column}.btn-cancel,.btn-confirm{width:100%}}
`;
