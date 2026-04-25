import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { campaignStorage } from "../utils/supabase-client";
import Inventory from "../components/Inventory";
import CombatSystem from "../components/CombatSystem";
import CharacterSheet from "../components/CharacterSheet";

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
      ? `LORE OFICIAL DO UNIVERSO:
${loreExtra}`
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

  // Estados novos para funcionalidades adicionais
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

  // ─── Storage (agora com Supabase) ───────────────────────────────────────
  const saveIdx = async (l) => { 
    try {
      localStorage.setItem(IDX_KEY, JSON.stringify(l));
    } catch (error) {
      console.error('Erro ao salvar índice:', error);
    } 
  };
  
  const saveCamp = async (id, d) => { 
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
  };
  
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

  // ─── Save Slots ───────────────────────────────────────────────────────
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

  // ─── Lore fetch ───────────────────────────────────────────────────────
  const fetchLore = async (world) => {
    try {
      const res = await fetch("/api/gm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useLoreSearch: true, world }),
      });
      return (await res.json()).lore || "";
    } catch { return ""; }
  };

  // ─── Export to Book ───────────────────────────────────────────────────
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

  // ─── Auto mode ────────────────────────────────────────────────────────
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
      } else if (personality.includes("calculista")) {
        chosen = options[Math.floor(Math.random() * options.length)];
      } else if (personality.includes("justo")) {
        chosen = options[Math.floor(Math.random() * options.length)];
      } else {
        chosen = options[Math.floor(Math.random() * options.length)];
      }

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

  // ─── Home ─────────────────────────────────────────────────────────────
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
    
    // Tentar deletar do Supabase primeiro
    try {
      await campaignStorage.deleteCampaign(id);
    } catch (err) {
      console.error('Erro ao deletar do Supabase:', err);
    }
    
    // Remover do estado e localStorage
    const next = idx.filter((c) => c.id !== id);
    setIdx(next); 
    saveIdx(next);
    try { 
      localStorage.removeItem(campKey(id)); 
    } catch {}
  };

  // ─── Create ───────────────────────────────────────────────────────────
  const startCreate = () => {
    setForm({ world: "", worldBg: "", isKnownIP: false, charName: "", charTitle: "", charAge: "", charBg: "", charPersonality: "", charSkills: "", appearance: { ...DEFAULT_APP }, useImages: true });
    setStep(0); setView("create");
  };

  const finishCreate = async () => {
    if (!form.world.trim() || !form.charName.trim()) return;
    setView("play"); setLoading(true); setDisp([]); setMsgs([]); setSceneImg(null);
    setHp(100); setMissions([]); setLastRoll(null); setShowRollButton(false); setInput("");
    
    // Inicializar idade do personagem
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
    setIdx(next); saveIdx(next); saveCamp(id, camp);
    setActive(camp); setCampLore(lore); setShowChar(false);
    setAutoMode(false); setAutoWaiting(false); setPending([]);
    setLoading(false); doStart(camp, lore);
  };

  // ─── Game ─────────────────────────────────────────────────────────────
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
      // Rolagem manual livre
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

      // Aplicar auto-detecção na resposta da IA
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

  const resetChat = () => {
    if (!active || !confirm("Recomeçar do início? O histórico será apagado.")) return;
    clearAuto(); setAutoMode(false); autoRef.current = false;
    const updated = { ...active, msgs: [], disp: [], img: null, missions: [], items: [], hp: 100 };
    setActive(updated); setMsgs([]); setDisp([]); setSceneImg(null);
    setMissions([]); setHp(100); setPending([]);
    saveCamp(active.id, updated); doStart(updated, campLore);
  };

  const setApp = (key, val) => setForm(f => ({ ...f, appearance: { ...f.appearance, [key]: val } }));

  const changeHp = (delta) => {
    const next = Math.min(100, Math.max(0, hp + delta));
    setHp(next);
    if (next < hp) {
      document.body.classList.add("damage-flash");
      setTimeout(() => document.body.classList.remove("damage-flash"), 300);
      // Efeito sonoro de dano
      if (soundEnabled) playSound('damage');
    }
    if (active) {
      const updated = { ...active, hp: next };
      setActive(updated);
      saveCamp(active.id, updated);
    }
  };

  // ─── Funções de Inventário ─────────────────────────────────────────────
  const addItem = async (itemName) => {
    if (!active || !itemName) return;
    
    try {
      const currentItems = active.items || [];
      const newItems = [...currentItems, itemName];
      
      const updated = { ...active, items: newItems };
      setActive(updated);
      await saveCamp(active.id, updated);
      
      if (notificationsEnabled) {
        showNotification(`Item adicionado: ${itemName}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      showNotification('Erro ao adicionar item', 'error');
    }
  };

  const removeItem = async (index) => {
    if (!active || index < 0 || index >= (active.items || []).length) return;
    
    try {
      const currentItems = active.items || [];
      const newItems = currentItems.filter((_, i) => i !== index);
      
      const updated = { ...active, items: newItems };
      setActive(updated);
      await saveCamp(active.id, updated);
    } catch (error) {
      console.error('Erro ao remover item:', error);
      showNotification('Erro ao remover item', 'error');
    }
  };

  const useItem = async (itemName) => {
    if (!active || !itemName) return;
    
    try {
      const itemLower = itemName.toLowerCase();
      let hpChange = 0;
      let message = '';
      
      if (itemLower.includes('poção') || itemLower.includes('cura')) {
        hpChange = 20;
        message = `Você usou ${itemName} e recuperou 20 HP!`;
      } else if (itemLower.includes('comida') || itemLower.includes('racao')) {
        hpChange = 5;
        message = `Você comeu ${itemName} e recuperou 5 HP!`;
      } else {
        message = `Você usou ${itemName}`;
      }
      
      if (hpChange > 0) {
        changeHp(hpChange);
      }
      
      showNotification(message);
      
      // Remove item after use
      const itemIndex = active.items?.indexOf(itemName);
      if (itemIndex !== -1) {
        await removeItem(itemIndex);
      }
    } catch (error) {
      console.error('Erro ao usar item:', error);
      showNotification('Erro ao usar item', 'error');
    }
  };

  // ─── Funções de Combate ───────────────────────────────────────────────
  const handleCombatStart = (enemy) => {
    if (enemy && enemy.name) {
      showNotification(`Combate iniciado contra ${enemy.name}!`);
    }
  };

  const handleCombatEnd = (victory, enemy = null) => {
    if (victory && enemy) {
      const xpGained = (enemy.hp || 10) * 2;
      setExperience(prev => prev + xpGained);
      showNotification(`Vitória! Você ganhou ${xpGained} XP!`);
      
      // Verificar se subiu de nível
      const newTotalXp = experience + xpGained;
      const newLevel = Math.floor(newTotalXp / 100) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        showNotification(`PARABÉNS! Você alcançou o nível ${newLevel}!`);
        changeHp(25); // Recupera HP ao subir de nível
      }
    } else {
      showNotification(`Você fugiu do combate!`);
    }
  };

  const handleCombatDamage = (damage) => {
    if (typeof damage === 'number' && damage > 0) {
      changeHp(-damage);
    }
  };

  // ─── Funções de Personagem ─────────────────────────────────────────────
  const handleLevelUp = () => {
    setLevel(prev => prev + 1);
    setAttributes(prev => ({
      strength: prev.strength + 1,
      dexterity: prev.dexterity + 1,
      mind: prev.mind + 1,
      charisma: prev.charisma + 1
    }));
    
    showNotification(`⬆️ Você subiu para o nível ${level + 1}!`);
    changeHp(25); // Recupera HP ao subir de nível
  };

  const handleUpdateCharacter = (updatedCharacter) => {
    if (!active) return;
    
    const updated = { ...active, ...updatedCharacter };
    setActive(updated);
    saveCamp(active.id, updated);
    showNotification('Ficha de personagem atualizada!', 'info');
  };

  // ─── Utilitários ───────────────────────────────────────────────────────
  const showNotification = (text, type = 'info') => {
    if (!notificationsEnabled) return;
    
    const toast = {
      id: Date.now(),
      text,
      type,
      timestamp: new Date()
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Remove automaticamente após 3 segundos
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 3000);
  };

  const quickSave = async () => {
    if (!active) return;
    
    try {
      await saveCamp(active.id, active);
      setLastSaved(Date.now());
      showNotification('Jogo salvo rapidamente!', 'success');
      
      // Feedback sonoro se habilitado
      if (soundEnabled) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    } catch (error) {
      console.error('Erro no quick save:', error);
      showNotification('Erro ao salvar rapidamente', 'error');
    }
  };

  // Detectar status de conexão
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save periódico
  useEffect(() => {
    if (!autoSaveEnabled || !active) return;
    
    const interval = setInterval(() => {
      quickSave();
    }, 60000); // Auto-save a cada 60 segundos
    
    return () => clearInterval(interval);
  }, [autoSaveEnabled, active]);

  // Quick save com Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        quickSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  // Sistema de Auto-Detecção Inteligente
  const parseMessageForAutoDetection = useCallback((message) => {
    if (!autoDetectionEnabled || !active) return { items: [], missions: [], status: null };

    const detected = {
      items: [],
      missions: [],
      status: null
    };

    // Detectar itens
    const itemPatterns = [
      /(?:ganhou|recebeu|encontrou|obteve|adquiriu|pegou|conseguiu)\s+(?:uma?|o?)\s*([a-zA-Zà-ú\s]+?)(?:\s|\.|,|$)/gi,
      /(?:foi\s+entregue|foi\s+dado|lhe\s+deram)\s+(?:uma?|o?)\s*([a-zA-Zà-ú\s]+?)(?:\s|\.|,|$)/gi,
      /(?:adicionou\s+ao\s+inventário|colocou\s+no\s+inventário)\s+(?:uma?|o?)\s*([a-zA-Zà-ú\s]+?)(?:\s|\.|,|$)/gi,
      /([a-zA-Zà-ú\s]+?)\s+(?:foi\s+adicionado|foi\s+guardado|está\s+agora\s+no\s+inventário)/gi
    ];

    // Detectar missões
    const missionPatterns = [
      /(?:nova\s+missão|missão|quest|tarefa)\s*[:\-]?\s*([^.!?]+)/gi,
      /(?:precisa\s+deve|deve\s+precisa)\s+([^.!?]+)/gi,
      /(?:objetivo|meta|alvo)\s*[:\-]?\s*([^.!?]+)/gi
    ];

    // Detectar conclusão de missões
    const missionCompletionPatterns = [
      /(?:missão|quest|tarefa)\s+(?:concluída|completa|terminada|finalizada)\s*[:\-]?\s*([^.!?]+)/gi,
      /(?:concluiu|completou|terminou|finalizou)\s+(?:a\s+)?(?:missão|quest|tarefa)\s+(?:de|do|da)?\s*([^.!?]+)/gi,
      /(?:objetivo|meta|alvo)\s+(?:alcançado|atingido|conquistado)\s*[:\-]?\s*([^.!?]+)/gi
    ];

    // Detectar status do personagem
    const statusPatterns = [
      /(?:hp|vida|health)\s*[:\-]?\s*(\d+)/gi,
      /(?:nível|level)\s*[:\-]?\s*(\d+)/gi,
      /(?:experiência|xp)\s*[:\-]?\s*(\d+)/gi,
      /(?:ferido|machucado|dano)\s*[:\-]?\s*(\d+)/gi
    ];

    // Detectar idade do personagem
    const agePatterns = [
      /(?:idade|age)\s*[:\-]?\s*(\d+)\s*(?:anos|years)/gi,
      /(?:tem|possui|tem\s+agora)\s+(\d+)\s*(?:anos|years)/gi,
      /(?:personagem|você|seu)\s+(?:tem|possui)\s+(\d+)\s*(?:anos|years)/gi,
      /(\d+)\s*(?:anos|years)\s+(?:de\s+idade|de idade)/gi
    ];

    // Extrair itens
    itemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const item = match[1].trim();
        // Filtrar palavras irrelevantes
        if (item.length > 2 && !['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'dos', 'das'].includes(item.toLowerCase())) {
          detected.items.push(item);
        }
      }
    });

    // Extrair missões
    missionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const mission = match[1].trim();
        if (mission.length > 5) {
          detected.missions.push({
            id: Date.now() + Math.random(),
            title: mission,
            completed: false,
            createdAt: Date.now()
          });
        }
      }
    });

    // Extrair conclusão de missões
    missionCompletionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const missionTitle = match[1].trim();
        if (missionTitle.length > 3) {
          // Procurar missão existente com título similar
          const existingMission = missions.find(m => 
            m.title.toLowerCase().includes(missionTitle.toLowerCase()) ||
            missionTitle.toLowerCase().includes(m.title.toLowerCase())
          );
          
          if (existingMission && !existingMission.completed) {
            detected.missions.push({
              id: existingMission.id,
              title: existingMission.title,
              completed: true,
              completedAt: Date.now()
            });
          }
        }
      }
    });

    // Extrair idade
    agePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const age = parseInt(match[1]);
        if (age >= 0 && age <= 150) { // Idade razoável para RPG
          detected.age = age;
        }
      }
    });

    // Extrair status
    const statusMatch = message.match(/(?:personagem|você|seu)\s+(?:está|ficou|ficou\s+com)\s+([^.!?]+)/gi);
    if (statusMatch) {
      detected.status = statusMatch[0].trim();
    }

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

    if (detected.missions.length > 0) {
      let newMissions = [...missions];
      
      // Processar cada missão detectada
      detected.missions.forEach(detectedMission => {
        if (detectedMission.completed) {
          // Marcar missão existente como concluída
          newMissions = newMissions.map(m => 
            m.id === detectedMission.id 
              ? { ...m, completed: true, completedAt: detectedMission.completedAt }
              : m
          );
          showNotification(`✅ Missão concluída: ${detectedMission.title}`, 'success');
        } else {
          // Adicionar nova missão
          const existingMission = newMissions.find(m => m.title === detectedMission.title);
          if (!existingMission) {
            newMissions.push(detectedMission);
            showNotification(`📋 Nova missão: ${detectedMission.title}`, 'info');
          }
        }
      });
      
      setMissions(newMissions);
      
      if (active) {
        const updated = { ...active, missions: newMissions };
        setActive(updated);
        await saveCamp(active.id, updated);
      }
    }

    if (detected.status) {
      showNotification(`📊 Status atualizado: ${detected.status}`, 'info');
    }

    // Aplicar idade detectada
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
  }, [parseMessageForAutoDetection, addItem, missions, active, saveCamp]);

  // Sistema de Time-Skip
  const executeTimeSkip = async () => {
    if (!active || !timeSkipConfig.focus.trim()) {
      showNotification('Preencha o foco do personagem', 'warning');
      return;
    }

    try {
      setLoading(true);
      setShowTimeSkipModal(false);

      // Construir prompt para o Mestre
      const timePrompt = `
[TIMESKIP: ${timeSkipConfig.amount} ${timeSkipConfig.unit}]
FOCO: ${timeSkipConfig.focus}
PERSONAGEM: ${active.charName} - ${active.charTitle}
PERSONALIDADE: ${active.charPersonality}
HABILIDADES: ${active.charSkills}
NÍVEL ATUAL: ${level}

${timeSkipConfig.includeProgression ? 'INCLUIR PROGRESSÃO: Sim' : 'INCLUIR PROGRESSÃO: Não'}
${timeSkipConfig.includeEvents ? 'INCLUIR EVENTOS: Sim' : 'INCLUIR EVENTOS: Não'}

Por favor, gere uma narrativa detalhada sobre o que ${active.charName} fez durante este período de ${timeSkipConfig.amount} ${timeSkipConfig.unit}, focando em: ${timeSkipConfig.focus}.
Descreva as atividades, aprendizados, eventos importantes e consequências.
${timeSkipConfig.includeProgression ? 'Inclua ganho de experiência e desenvolvimento de habilidades relevante.' : ''}
${timeSkipConfig.includeEvents ? 'Crie 1-2 eventos significativos que aconteceram durante este período.' : ''}
Termine com a situação atual do personagem e o que mudou em sua vida.
`;

      // Enviar para o Mestre
      await sendMsg(timePrompt, msgs, disp, active, campLore, false);
      
      showNotification(`Avançando ${timeSkipConfig.amount} ${timeSkipConfig.unit} no tempo...`, 'info');
      
      // Calcular ganho de XP baseado no tempo
      if (timeSkipConfig.includeProgression) {
        const xpMultiplier = {
          'dias': 5,
          'semanas': 25,
          'meses': 100,
          'anos': 500
        };
        const xpGained = timeSkipConfig.amount * (xpMultiplier[timeSkipConfig.unit] || 5);
        setExperience(prev => prev + xpGained);
        
        // Verificar se subiu de nível
        const newLevel = Math.floor((experience + xpGained) / 100) + 1;
        if (newLevel > level) {
          setLevel(newLevel);
          showNotification(`⬆️ Você alcançou o nível ${newLevel} durante o time-skip!`, 'success');
        }
      }

      // Aplicar envelhecimento do personagem
      const ageMultiplier = {
        'dias': 1/365,
        'semanas': 1/52,
        'meses': 1/12,
        'anos': 1
      };
      const ageIncrease = timeSkipConfig.amount * (ageMultiplier[timeSkipConfig.unit] || 0);
      const newAge = Math.max(0, characterAge + ageIncrease);
      
      if (newAge !== characterAge) {
        setCharacterAge(newAge);
        
        // Arredondar para exibição
        const displayAge = Math.floor(newAge);
        
        // Atualizar personagem
        if (active) {
          const updated = { 
            ...active, 
            charAge: displayAge.toString(),
            updatedAt: Date.now()
          };
          setActive(updated);
          await saveCamp(active.id, updated);
        }
        
        showNotification(`👤 Seu personagem agora tem ${displayAge} anos!`, 'info');
        
        // Eventos baseados em idade
        if (displayAge >= 60) {
          showNotification(`🎂 Seu personagem está atingindo uma idade avançada!`, 'warning');
        } else if (displayAge >= 30) {
          showNotification(`🌟 Seu personagem está na maturidade!`, 'info');
        } else if (displayAge >= 18) {
          showNotification(`🎯 Seu personagem atingiu a maioridade!`, 'success');
        }
      }
      
    } catch (error) {
      console.error('Erro no time-skip:', error);
      showNotification('Erro ao avançar no tempo', 'error');
      setShowTimeSkipModal(true);
    } finally {
      setLoading(false);
    }
  };

  const playSound = (type) => {
    if (!soundEnabled) return;
    
    // Implementar sons simples usando Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
      case 'damage':
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.1;
        break;
      case 'success':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        break;
      case 'levelup':
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.15;
        break;
      default:
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.1;
    }
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // ─── Temas ─────────────────────────────────────────────────────────────
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

      {/* Header */}
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
          {activeMissions.length > 0 && (
            <div className="mission-badge" onClick={() => setShowChar(v => !v)} title="Missões ativas">
              📋{activeMissions.length}
            </div>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn-sm" onClick={() => setShowChar(v => !v)}>📜</button>
            <button className="btn-sm" onClick={resetChat}>↺</button>
          </div>
        </div>

        {showChar && (
          <div className="cpanel">
            {/* Character info */}
            <div className="cp-lbl">▸ PERSONAGEM</div>
            {c.charName        && <div><span className="dd">Nome:</span> {c.charName}</div>}
            {c.charTitle       && <div><span className="dd">Título:</span> {c.charTitle}</div>}
            {c.charAge         && <div><span className="dd">Idade:</span> {c.charAge}</div>}
            {c.charBg          && <div><span className="dd">Origem:</span> {c.charBg}</div>}
            {c.charPersonality && <div><span className="dd">Personalidade:</span> {c.charPersonality}</div>}
            {c.charSkills      && <div><span className="dd">Habilidades:</span> {c.charSkills}</div>}
            {c.appearance      && <div style={{ marginTop: 4 }}><span className="dd">Aparência:</span> {buildAppearance(c.appearance)}</div>}

            {/* HP tracker */}
            <div className="cp-divider" />
            <div className="cp-lbl">❤ VIDA</div>
            <div className="hp-ctrl">
              <button className="hp-btn" onClick={() => changeHp(-10)}>−10</button>
              <button className="hp-btn" onClick={() => changeHp(-5)}>−5</button>
              <div className="hp-bar-wrap">
                <div className="hp-bar-fill" style={{ width: `${hp}%`, background: hpColor }} />
                <span className="hp-val">{hp}/100</span>
              </div>
              <button className="hp-btn" onClick={() => changeHp(+5)}>+5</button>
              <button className="hp-btn" onClick={() => changeHp(+10)}>+10</button>
            </div>

            {/* Missions */}
            {missions.length > 0 && <>
              <div className="cp-divider" />
              <div className="cp-lbl">📋 MISSÕES</div>
              {activeMissions.map(m => (
                <div key={m.id} className="mission-row active">
                  <span className="mission-dot">◦</span>
                  <span>{m.text}</span>
                </div>
              ))}
              {doneMissions.map(m => (
                <div key={m.id} className="mission-row done">
                  <span className="mission-dot">✓</span>
                  <span>{m.text}</span>
                </div>
              ))}
            </>}

            {/* Items */}
            {c.items && c.items.length > 0 && (
              <div>
                <div className="cp-divider" />
                <div className="cp-lbl">🎒 MOCHILA</div>
                <div className="items-list">
                  {c.items.map((item, i) => (
                    <div key={i} className="item">{item}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Relationships */}
            {c.relationships && Object.entries(c.relationships).length > 0 && (
              <div>
                <div className="cp-divider" />
                <div className="cp-lbl">🤝 RELACIONAMENTOS</div>
                {Object.entries(c.relationships).map(([npc, attitude]) => (
                  <div key={npc} className="relationship">
                    <span className="relationship-npc">{npc}</span>
                    <span className={`relationship-attitude ${attitude.toLowerCase()}`}>{attitude}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Saves */}
            <div className="cp-divider" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="cp-lbl" style={{ margin: 0 }}>💾 SAVES ({(active.saves || []).length}/5)</div>
              <button
                className={`btn-save ${saveFlash ? "flash" : ""}`}
                onClick={saveSlot}
              >{saveFlash ? "✓ SALVO" : "SALVAR"}</button>
            </div>
            {!(active.saves || []).length && (
              <div className="save-empty">Nenhum save ainda. Salve para não perder o progresso.</div>
            )}
            {(active.saves || []).map(s => (
              <div key={s.id} className="save-item">
                <div className="save-info">
                  <div className="save-name">{s.name}</div>
                  <div className="save-meta">
                    <span className="save-hp">❤ {s.hp ?? "—"}</span>
                    <span>{fmtDate(s.timestamp)} {fmtTime(s.timestamp)}</span>
                    {(s.missions || []).filter(m => !m.completed).length > 0 && (
                      <span className="save-missions">📋 {(s.missions || []).filter(m => !m.completed).length}</span>
                    )}
                  </div>
                </div>
                <div className="save-btns">
                  <button className="save-btn-load" onClick={() => loadSlot(s)}>▶</button>
                  <button className="save-btn-del"  onClick={() => deleteSlot(s.id)}>✕</button>
                </div>
              </div>
            ))}

            {/* Badges & export */}
            <div className="cp-divider" />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {!c.useImages && <span className="badge">⚡ SEM IMAGENS</span>}
              {campLore     && <span className="badge">🔍 LORE OFICIAL</span>}
            </div>
            <button onClick={exportToBook} className="btn-export">📖 EXPORTAR COMO LIVRO (PDF)</button>
          </div>
        )}
      </div>

      {!showChar && activeMissions.length > 0 && (
        <div className="missions-strip" onClick={() => setShowChar(true)}>
          {activeMissions.slice(0, 2).map(m => (
            <div key={m.id} className="missions-strip-item">◦ {m.text}</div>
          ))}
          {activeMissions.length > 2 && <div className="missions-strip-more">+{activeMissions.length - 2} mais</div>}
        </div>
      )}

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
        <button className="q-btn" onClick={() => insertCmd("[TESTE:Força] ")}>💪 TESTE</button>
        <button className="q-btn" onClick={() => insertCmd("[ITEM:Item] ")}>🎒 ITEM</button>
        <button className="q-btn" onClick={() => insertCmd("[MISSÃO:Nova Missão] ")}>📋 MISSÃO</button>
        <button className="q-btn" onClick={() => insertCmd("[CONCLUÍDA:Missão] ")}>✓ OK</button>
        <button className="q-btn" onClick={() => setShowInventory(!showInventory)}>🎒 INVENTÁRIO</button>
        <button className="q-btn" onClick={() => setShowCombat(!showCombat)}>⚔️ COMBATE</button>
        <button className="q-btn" onClick={() => setShowCharacterSheet(!showCharacterSheet)}>📜 FICHA</button>
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

      {/* Modais sobrepostos */}
      {showInventory && (
        <div className="modal-overlay" onClick={() => setShowInventory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <Inventory 
              items={c.items || []}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onUseItem={useItem}
            />
          </div>
        </div>
      )}

      {showCombat && (
        <div className="modal-overlay" onClick={() => setShowCombat(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <CombatSystem 
              character={{ ...c, hp, attributes, skills }}
              onCombatStart={handleCombatStart}
              onCombatEnd={handleCombatEnd}
              onDamage={handleCombatDamage}
              onHeal={(amount) => changeHp(amount)}
              isActive={true}
            />
          </div>
        </div>
      )}

      {showCharacterSheet && (
        <div className="modal-overlay" onClick={() => setShowCharacterSheet(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <CharacterSheet 
              character={{ ...c, hp, experience, level, attributes, skills }}
              onUpdateCharacter={handleUpdateCharacter}
              onLevelUp={handleLevelUp}
            />
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
                    type="number"
                    min="1"
                    max="100"
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
                  placeholder="Ex: Treinar combate, estudar magia, viajar para outra cidade, focar em negócios..."
                  className="time-textarea"
                  rows={3}
                />
              </div>

              <div className="time-config-section">
                <div className="time-options">
                  <label className="time-checkbox">
                    <input
                      type="checkbox"
                      checked={timeSkipConfig.includeEvents}
                      onChange={(e) => setTimeSkipConfig(prev => ({ ...prev, includeEvents: e.target.checked }))}
                    />
                    <span>Incluir eventos importantes</span>
                  </label>
                  <label className="time-checkbox">
                    <input
                      type="checkbox"
                      checked={timeSkipConfig.includeProgression}
                      onChange={(e) => setTimeSkipConfig(prev => ({ ...prev, includeProgression: e.target.checked }))}
                    />
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
                    Ganho estimado: {timeSkipConfig.amount * {
                      'dias': 5,
                      'semanas': 25,
                      'meses': 100,
                      'anos': 500
                    }[timeSkipConfig.unit]} XP
                  </p>
                )}
              </div>
            </div>

            <div className="time-skip-footer">
              <button className="btn-cancel" onClick={() => setShowTimeSkipModal(false)}>
                Cancelar
              </button>
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

/* HP mini in tbar */
.hp-mini{position:relative;width:32px;height:32px;flex-shrink:0;border:1px solid #180e00;border-radius:4px;overflow:hidden;cursor:default;display:flex;align-items:center;justify-content:center}
.hp-mini-bar{position:absolute;bottom:0;left:0;height:100%;transition:width .4s,background .4s;opacity:.35}
.hp-mini-val{position:relative;font-size:9px;color:#c4a060;letter-spacing:0;z-index:1}

/* Mission badge in tbar */
.mission-badge{font-size:10px;color:#8b6a20;border:1px solid #2a1e00;border-radius:4px;padding:4px 6px;cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent;background:#0c0900}

/* cpanel */
.cpanel{margin:0 12px 10px;background:#0c0700;border:1px solid #180e00;border-radius:6px;padding:12px;font-size:11px;line-height:2;color:#907040;max-height:340px;overflow-y:auto}
.cp-lbl{color:#d4a843;font-size:8px;letter-spacing:3px;margin-bottom:6px}
.cp-divider{border-top:1px solid #180e00;margin:10px 0}
.dd{color:#4a2c00}

/* HP tracker */
.hp-ctrl{display:flex;align-items:center;gap:4px;margin-bottom:4px}
.hp-btn{background:#0a0600;border:1px solid #1e1400;border-radius:3px;color:#6b4a1a;font-size:10px;padding:3px 7px;cursor:pointer;font-family:inherit;flex-shrink:0;-webkit-tap-highlight-color:transparent}
.hp-bar-wrap{flex:1;position:relative;height:18px;background:#0a0600;border:1px solid #180e00;border-radius:3px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.hp-bar-fill{position:absolute;left:0;top:0;bottom:0;transition:width .3s,background .3s;opacity:.7}
.hp-val{position:relative;font-size:9px;color:#c4a060;z-index:1}

/* Items */
.items-list{display:flex;flex-direction:column;gap:6px;font-size:11px;line-height:1.6;margin-bottom:10px}
.item{background:#0a0600;border:1px solid #180e00;border-radius:4px;padding:6px 8px;color:#6b5a20}

/* Relationships */
.relationship{display:flex;justify-content:space-between;margin-bottom:4px;font-size:10px}
.relationship-npc{color:#6b5a20}
.relationship-attitude{font-weight:bold;text-transform:uppercase;letter-spacing:1px}
.relationship-attitude.hostil{color:#8b1a00}
.relationship-attitude.suspeito{color:#8b5a00}
.relationship-attitude.neutro,.relationship-attitude.neutral{color:#4a4a4a}
.relationship-attitude.amigável,.relationship-attitude.amigavel{color:#1a6a1a}

/* Missions */
.mission-row{display:flex;gap:6px;font-size:11px;line-height:1.7;align-items:flex-start}
.mission-row.active{color:#c4a060}
.mission-row.done{color:#3a2a10;text-decoration:line-through}
.mission-dot{flex-shrink:0;color:#8b5a14;margin-top:1px}

/* Saves */
.btn-save{background:transparent;border:1px solid #2a1800;border-radius:3px;color:#4a2c00;font-size:9px;padding:4px 10px;cursor:pointer;letter-spacing:1px;font-family:inherit;transition:all .3s;-webkit-tap-highlight-color:transparent}
.btn-save:hover{border-color:#8b5a14;color:#d4a843}
.btn-save.flash{background:#1a3a0a;border-color:#4a8a14;color:#a0d060}
.save-empty{font-size:10px;color:#2c1900;font-style:italic;line-height:1.6}
.save-item{display:flex;align-items:center;gap:8px;background:#0a0600;border:1px solid #180e00;border-radius:4px;padding:7px 8px;margin-bottom:5px}
.save-info{flex:1;min-width:0}
.save-name{font-size:10px;color:#8b6a30;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.save-meta{font-size:9px;color:#2c1900;display:flex;gap:6px;align-items:center;margin-top:2px}
.save-hp{color:#6b3a1a}
.save-missions{color:#5a4a10}
.save-btns{display:flex;gap:4px;flex-shrink:0}
.save-btn-load{background:#1a0e00;border:1px solid #4a2000;color:#8b5a14;border-radius:3px;padding:4px 8px;cursor:pointer;font-size:11px;-webkit-tap-highlight-color:transparent}
.save-btn-del{background:transparent;border:1px solid #180e00;color:#2c1900;border-radius:3px;padding:4px 7px;cursor:pointer;font-size:10px;-webkit-tap-highlight-color:transparent}

/* Badges */
.badge{font-size:8px;letter-spacing:2px;color:#2c1900;background:#0a0600;border:1px solid #180e00;border-radius:3px;padding:2px 6px}
.btn-export{width:100%;background:transparent;border:1px solid #4a2c00;color:#c4a060;padding:10px;margin-top:14px;border-radius:4px;font-size:10px;letter-spacing:2px;cursor:pointer;font-family:inherit}
.btn-export:hover{background:#180e00}

/* Mission strip (always visible below header) */
.missions-strip{flex-shrink:0;background:#0c0900;border-bottom:1px solid #1e1400;padding:6px 14px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.missions-strip-item{font-size:10px;color:#6b5010;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.missions-strip-more{font-size:9px;color:#3a2800;letter-spacing:1px}

/* Messages */
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

/* Quick Actions */
.q-actions{display:flex;gap:6px;padding:0 12px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.q-actions::-webkit-scrollbar{display:none}
.q-btn{background:#0a0600;border:1px solid #1e1400;border-radius:4px;color:#6b4a1a;font-size:9px;padding:6px 10px;cursor:pointer;white-space:nowrap;font-family:inherit;letter-spacing:1px;-webkit-tap-highlight-color:transparent}
.q-btn:active{background:#1a0e00;border-color:#4a2c00}
.q-btn.q-dice{background:linear-gradient(135deg,#1a0d3a,#0a031a);border-color:#2a1e6a;color:#9a7afa;font-weight:bold}

/* Input area */
.iarea{flex-shrink:0;padding:10px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom));border-top:1px solid #180e00;background:#060407;display:flex;gap:6px;align-items:flex-end}
.btn-auto{background:#0c0700;border:1px solid #180e00;border-radius:6px;color:#2c1900;font-size:8px;letter-spacing:1px;padding:0;width:44px;height:48px;cursor:pointer;font-family:inherit;flex-shrink:0;line-height:1.4;white-space:pre;-webkit-tap-highlight-color:transparent;transition:all .2s}
.btn-auto.on{background:#1a1000;border-color:#6a5000;color:#d4a843;animation:autopulse 1.5s infinite}
.ibox{flex:1;background:#0c0700;border:1px solid #180e00;border-radius:8px;padding:10px 12px;color:#c4a060;font-size:14px;font-family:inherit;outline:none;resize:none;line-height:1.5;-webkit-appearance:none}
.ibox:disabled{opacity:.35}
.i-send{background:linear-gradient(135deg,#5a1a00,#2a0d00);border:1px solid #8b5a14;color:#d4a843;width:48px;height:48px;border-radius:8px;cursor:pointer;font-size:18px;flex-shrink:0;-webkit-tap-highlight-color:transparent}
.i-send.off{background:#0c0700;border-color:#180e00;color:#2a1800;cursor:not-allowed}
.i-roll {
  background: linear-gradient(135deg, #1a0d3a, #0a031a);
  border: 1px solid #2a1e6a;
  color: #6a4afa;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.i-roll:hover { border-color: #4a3a8a; color: #9a7afa; }

/* Modal overlay - Responsivo */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  box-sizing: border-box;
}

.modal-content {
  background: #0c0700;
  border: 1px solid #180e00;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  animation: fadeIn 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

/* Responsividade para modais */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    max-width: 95vw;
    max-height: 95vh;
    border-radius: 6px;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 5px;
    align-items: flex-start;
    padding-top: 40px;
  }
  
  .modal-content {
    max-width: 100vw;
    max-height: calc(100vh - 50px);
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}

@media (max-width: 320px) {
  .modal-content {
    font-size: 14px;
  }
}

/* Theme variations */
body.light {
  background: #f5f5f5;
  color: #333;
}

body.light .root {
  background: #f5f5f5;
}

body.light .cpanel,
body.light .modal-content {
  background: #ffffff;
  border-color: #ddd;
}

body.light .btn-sm,
body.light .btn-save,
body.light .btn-export {
  background: #f0f0f0;
  border-color: #ccc;
  color: #333;
}

/* Rain overlay */
.rain-overlay {
  position: relative;
}
.rain-overlay::after {
  content: "";
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="rain" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="rgba(174,194,224,0.8)" /><stop offset="100%" stop-color="rgba(174,194,224,0.2)" /></linearGradient></defs><path d="M0,50 Q25,20 50,50 T100,50" stroke="url(%23rain)" stroke-width="1" fill="none" /></svg>') repeat;
  animation: rain 1s linear infinite;
  z-index: 100;
}

/* Enhanced quick actions - Responsivo */
.q-actions {
  display: flex;
  gap: 6px;
  padding: 0 12px 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

.q-actions::-webkit-scrollbar {
  display: none;
}

.q-btn {
  background: #0a0600;
  border: 1px solid #1e1400;
  border-radius: 4px;
  color: #6b4a1a;
  font-size: 9px;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  letter-spacing: 1px;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s;
  flex-shrink: 0;
  min-width: fit-content;
}

.q-btn:active {
  background: #1a0e00;
  border-color: #4a2c00;
  transform: scale(0.95);
}

.q-btn:hover {
  background: #1a0e00;
  border-color: #4a2c00;
  color: #8b6a2a;
}

.q-btn.q-dice {
  background: linear-gradient(135deg, #1a0d3a, #0a031a);
  border-color: #2a1e6a;
  color: #9a7afa;
  font-weight: bold;
}

.q-btn.q-dice:hover {
  background: linear-gradient(135deg, #2a1e4a, #1a0a2a);
  border-color: #4a3a8a;
  color: #ba9afa;
}

.q-btn.q-time {
  background: linear-gradient(135deg, #1a3a2a, #0a1a1a);
  border-color: #2a4a2a;
  color: #7afa7a;
  font-weight: bold;
}

.q-btn.q-time:hover {
  background: linear-gradient(135deg, #2a4a2a, #1a2a1a);
  border-color: #4a6a4a;
  color: #bafaba;
}

.q-btn.q-auto-on {
  background: linear-gradient(135deg, #1a3a3a, #0a1a1a);
  border-color: #2a4a4a;
  color: #7afafa;
  font-weight: bold;
  animation: autoPulse 2s infinite;
}

.q-btn.q-auto-on:hover {
  background: linear-gradient(135deg, #2a4a4a, #1a2a1a);
  border-color: #4a6a6a;
  color: #bafafa;
}

.q-btn.q-auto-off {
  background: linear-gradient(135deg, #3a1a1a, #1a0a0a);
  border-color: #4a2a2a;
  color: #fa7a7a;
  font-weight: bold;
}

.q-btn.q-auto-off:hover {
  background: linear-gradient(135deg, #4a2a2a, #2a1a1a);
  border-color: #6a4a4a;
  color: #fa9a9a;
}

@keyframes autoPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(122, 250, 250, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(122, 250, 250, 0.1);
  }
}

/* Status Dashboard */
.status-dashboard {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(20, 15, 40, 0.95);
  border: 1px solid #3a2e6a;
  border-radius: 12px;
  padding: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 280px;
  max-width: 350px;
}

.status-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-label {
  color: #9a7afa;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hp-bar, .xp-bar {
  position: relative;
  height: 20px;
  background: rgba(10, 5, 20, 0.8);
  border: 1px solid #2a1e6a;
  border-radius: 10px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff3838, #ff6b6b);
  transition: width 0.5s ease;
  border-radius: 8px;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a9eff, #7ac5ff);
  transition: width 0.5s ease;
  border-radius: 8px;
}

.hp-text, .xp-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 10px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.age-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(26, 15, 40, 0.8);
  border: 1px solid #2a1e6a;
  border-radius: 10px;
  padding: 8px 12px;
  min-height: 20px;
}

.age-text {
  color: #d4a843;
  font-size: 11px;
  font-weight: bold;
}

.age-icon {
  font-size: 12px;
  opacity: 0.8;
}

.status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(58, 46, 106, 0.3);
}

.connection-indicator {
  font-size: 12px;
}

.connection-indicator.online {
  filter: drop-shadow(0 0 4px #4eff4a);
}

.connection-indicator.offline {
  filter: drop-shadow(0 0 4px #ff3838);
}

.last-saved {
  color: #9a7afa;
  font-size: 10px;
  opacity: 0.8;
}

/* Animações para o dashboard */
.status-dashboard {
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsividade para dashboard */
@media (max-width: 768px) {
  .status-dashboard {
    top: 5px;
    right: 5px;
    min-width: 240px;
    max-width: 280px;
    padding: 8px;
  }
  
  .status-label {
    font-size: 10px;
  }
  
  .hp-bar, .xp-bar {
    height: 16px;
  }
  
  .hp-text, .xp-text {
    font-size: 8px;
  }
}

@media (max-width: 480px) {
  .status-dashboard {
    position: relative;
    top: auto;
    right: auto;
    margin: 10px;
    min-width: auto;
    max-width: none;
  }
}

/* Responsividade para quick actions */
@media (max-width: 768px) {
  .q-actions {
    padding: 0 8px 6px;
    gap: 4px;
  }
  
  .q-btn {
    font-size: 8px;
    padding: 5px 8px;
    letter-spacing: 0.5px;
  }
}

@media (max-width: 480px) {
  .q-actions {
    padding: 0 6px 4px;
    gap: 3px;
  }
  
  .q-btn {
    font-size: 7px;
    padding: 4px 6px;
    border-radius: 3px;
  }
  
  .q-btn span {
    display: none;
  }
  
  .q-btn.q-dice::before {
    content: "🎲";
  }
  
  .q-btn:nth-child(2)::before {
    content: "💪";
  }
  
  .q-btn:nth-child(3)::before {
    content: "🎒";
  }
  
  .q-btn:nth-child(4)::before {
    content: "📋";
  }
  
  .q-btn:nth-child(5)::before {
    content: "✓";
  }
  
  .q-btn:nth-child(6)::before {
    content: "🎒";
  }
  
  .q-btn:nth-child(7)::before {
    content: "⚔️";
  }
  
  .q-btn:nth-child(8)::before {
    content: "📜";
  }
  
  .q-btn:nth-child(9)::before {
    content: "🎨";
  }
}

@media (max-width: 320px) {
  .q-actions {
    gap: 2px;
  }
  
  .q-btn {
    padding: 3px 4px;
    font-size: 6px;
  }
}
.damage-flash { animation: damageFlash .3s ease-in-out; }
`;

// Toast Notifications CSS
const TOAST_ST = `
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  animation: slideInDown 0.3s ease;
  pointer-events: auto;
  max-width: 400px;
  min-width: 250px;
}

.toast-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.toast-message {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.toast-success {
  background: rgba(26, 58, 10, 0.95);
  border: 1px solid #4a8a14;
  color: #a0d060;
}

.toast-error {
  background: rgba(58, 10, 10, 0.95);
  border: 1px solid #8a1414;
  color: #d06060;
}

.toast-warning {
  background: rgba(58, 58, 10, 0.95);
  border: 1px solid #8a8a14;
  color: #d0d060;
}

.toast-info {
  background: rgba(42, 13, 0, 0.95);
  border: 1px solid #8b5a14;
  color: #d4a843;
}

@keyframes slideInDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

/* Responsividade para toasts */
@media (max-width: 768px) {
  .toast-container {
    top: 10px;
    left: 10px;
    right: 10px;
    transform: none;
  }
  
  .toast {
    max-width: none;
    min-width: auto;
    padding: 10px 12px;
  }
  
  .toast-message {
    font-size: 12px;
  }
  
  .toast-icon {
    font-size: 14px;
  }
}
`;

// Time-Skip Modal CSS
const TIME_SKIP_ST = `
.time-skip-modal {
  max-width: 500px;
  width: 90%;
}

.time-skip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #3a2e6a;
}

.time-skip-header h3 {
  color: #9a7afa;
  font-size: 18px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-close {
  background: none;
  border: none;
  color: #9a7afa;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: rgba(154, 122, 250, 0.1);
  color: #ba9afa;
}

.time-skip-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.time-config-section label {
  display: block;
  color: #9a7afa;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.time-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.time-input {
  flex: 0 0 80px;
  background: rgba(10, 5, 20, 0.8);
  border: 1px solid #2a1e6a;
  border-radius: 6px;
  padding: 8px 12px;
  color: #c4a060;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
}

.time-input:focus {
  border-color: #4a3e8a;
  box-shadow: 0 0 0 2px rgba(154, 122, 250, 0.2);
}

.time-select {
  flex: 1;
  background: rgba(10, 5, 20, 0.8);
  border: 1px solid #2a1e6a;
  border-radius: 6px;
  padding: 8px 12px;
  color: #c4a060;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.time-select:focus {
  border-color: #4a3e8a;
  box-shadow: 0 0 0 2px rgba(154, 122, 250, 0.2);
}

.time-textarea {
  width: 100%;
  background: rgba(10, 5, 20, 0.8);
  border: 1px solid #2a1e6a;
  border-radius: 6px;
  padding: 10px 12px;
  color: #c4a060;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: all 0.3s ease;
}

.time-textarea:focus {
  border-color: #4a3e8a;
  box-shadow: 0 0 0 2px rgba(154, 122, 250, 0.2);
}

.time-textarea::placeholder {
  color: rgba(196, 160, 96, 0.4);
}

.time-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #c4a060;
  font-size: 13px;
  transition: all 0.3s ease;
}

.time-checkbox:hover {
  color: #d4b070;
}

.time-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #9a7afa;
}

.time-preview {
  background: rgba(26, 15, 40, 0.5);
  border: 1px solid #3a2e6a;
  border-radius: 8px;
  padding: 15px;
  margin-top: 10px;
}

.time-preview h4 {
  color: #9a7afa;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 10px 0;
}

.time-preview p {
  color: #c4a060;
  font-size: 13px;
  margin: 5px 0;
  line-height: 1.4;
}

.time-preview strong {
  color: #d4b070;
}

.xp-preview {
  color: #7afa7a !important;
  font-weight: bold;
}

.time-skip-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #3a2e6a;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-cancel {
  background: rgba(58, 10, 10, 0.8);
  color: #d06060;
  border: 1px solid #8a1414;
}

.btn-cancel:hover {
  background: rgba(78, 20, 20, 0.9);
  color: #e08080;
}

.btn-confirm {
  background: linear-gradient(135deg, #1a3a0a, #0a1a0a);
  color: #a0d060;
  border: 1px solid #4a8a14;
}

.btn-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #2a4a1a, #1a2a1a);
  color: #b0e070;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsividade para time-skip modal */
@media (max-width: 768px) {
  .time-skip-modal {
    width: 95%;
    max-width: none;
    margin: 10px;
  }
  
  .time-input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .time-input {
    flex: 1;
  }
  
  .time-skip-footer {
    flex-direction: column;
  }
  
  .btn-cancel, .btn-confirm {
    width: 100%;
  }
}
`;
