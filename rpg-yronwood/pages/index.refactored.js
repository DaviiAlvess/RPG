import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { campaignStorage } from "../../utils/supabase-client";
import Inventory from "../../components/Inventory";
import CombatSystem from "../../components/CombatSystem";
import CharacterSheet from "../../components/CharacterSheet";

// Constants and configuration
const RPG_CONSTANTS = {
  STORAGE: {
    INDEX_KEY: "rpg-idx-v3",
    CAMPAIGN_PREFIX: "rpg-camp-",
  },
  COMBAT: {
    BASE_DAMAGE: 5,
    CRITICAL_THRESHOLD: 19,
    FAILURE_THRESHOLD: 5,
    FLEE_THRESHOLD: 12,
  },
  EXPERIENCE: {
    XP_PER_LEVEL: 100,
    HP_RECOVERY_ON_LEVEL_UP: 25,
  },
  UI: {
    NOTIFICATION_DURATION: 3000,
    ANIMATION_DURATION: 300,
  },
  APPEARANCE: {
    BODY_TYPES: ["Magro", "Atlético", "Médio", "Robusto", "Gordo"],
    HEIGHTS: ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"],
    SKIN_TONES: ["Muito clara", "Clara", "Morena clara", "Morena", "Negra"],
    HAIR_LENGTHS: ["Careca", "Curto", "Médio", "Longo", "Muito longo"],
    HAIR_COLORS: ["Preto", "Castanho", "Loiro", "Ruivo", "Branco/Grisalho"],
    HAIR_STYLES: ["Liso", "Ondulado", "Cacheado", "Crespo", "Raspado/Moicano"],
    EYE_COLORS: ["Castanhos", "Verdes", "Azuis", "Cinzas", "Pretos"],
    EYE_SHAPES: ["Amendoados", "Redondos", "Puxados", "Pequenos", "Grandes"],
    FACE_SHAPES: ["Oval", "Quadrada", "Redonda", "Triangular", "Alongada"],
    SPECIAL_MARKS: ["Nenhum", "Cicatriz", "Tatuagem", "Barba", "Sardas"],
  },
  COLOR_MAPS: {
    HAIR: {
      "Preto": "#0a0a0a",
      "Castanho": "#5c3317", 
      "Loiro": "#c8a84b",
      "Ruivo": "#8b2500",
      "Branco/Grisalho": "#a0a0a0"
    },
    EYES: {
      "Castanhos": "#5c3317",
      "Verdes": "#2d6a4f",
      "Azuis": "#1a4a7a",
      "Cinzas": "#607080",
      "Pretos": "#0a0a14"
    }
  }
};

// Text processing utilities
class TextProcessor {
  static extractImagePrompt(text) {
    if (!text || typeof text !== 'string') return null;
    
    const match = text.match(/IMAGE_PROMPT:\s*(.+)/i);
    return match ? match[1].trim() : null;
  }

  static extractOptions(text) {
    if (!text || typeof text !== 'string') return [];
    
    const matches = [...text.matchAll(/^\s*(\d)\.\s+(.+)/gm)];
    return matches.slice(-3).map(match => match[2].trim());
  }

  static extractItems(text) {
    if (!text || typeof text !== 'string') return [];
    
    const matches = [...text.matchAll(/\[ITEM:([^\]]+)\]/gi)];
    return matches.map(match => match[1].trim());
  }

  static cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/IMAGE_PROMPT:\s*.+/gi, "")
      .replace(/\[(MISSÃO|CONCLUÍDA|ITEM):([^\]]+)\]/gi, "")
      .trim();
  }

  static generateImagePrompt(prompt, world) {
    if (!prompt) return '';
    
    const fullPrompt = `${prompt}, ${world || "fantasy"} setting, cinematic, dramatic lighting, photorealistic, 8k, no text, no people`;
    const seed = Math.floor(Math.random() * 99999);
    
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=900&height=360&nologo=true&seed=${seed}`;
  }

  static formatDate(timestamp) {
    if (!timestamp) return '';
    
    try {
      return new Date(timestamp).toLocaleDateString("pt-BR", { 
        day: "2-digit", 
        month: "short", 
        year: "2-digit" 
      });
    } catch (error) {
      return '';
    }
  }

  static formatTime(timestamp) {
    if (!timestamp) return '';
    
    try {
      return new Date(timestamp).toLocaleTimeString("pt-BR", { 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } catch (error) {
      return '';
    }
  }
}

// Game state managers
class MissionManager {
  static parseMissions(text, currentMissions = []) {
    if (!text || typeof text !== 'string') return currentMissions;
    
    try {
      let updatedMissions = [...currentMissions];
      
      // Add new missions
      const newMissionMatches = [...text.matchAll(/\[MISSÃO:([^\]]+)\]/gi)];
      for (const match of newMissionMatches) {
        const missionText = match[1].trim();
        const exists = updatedMissions.some(mission => 
          mission.text.toLowerCase() === missionText.toLowerCase()
        );
        
        if (!exists) {
          updatedMissions.push({
            id: this.generateUniqueId(),
            text: missionText,
            completed: false
          });
        }
      }
      
      // Mark completed missions
      const completedMatches = [...text.matchAll(/\[CONCLUÍDA:([^\]]+)\]/gi)];
      for (const match of completedMatches) {
        const completedText = match[1].trim();
        updatedMissions = updatedMissions.map(mission =>
          mission.text.toLowerCase().includes(completedText.toLowerCase()) ||
          completedText.toLowerCase().includes(mission.text.toLowerCase())
            ? { ...mission, completed: true }
            : mission
        );
      }
      
      return updatedMissions;
    } catch (error) {
      console.error('Error parsing missions:', error);
      return currentMissions;
    }
  }

  static generateUniqueId() {
    return `c${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

class ItemManager {
  static parseItems(text, currentItems = []) {
    if (!text || typeof text !== 'string') return currentItems;
    
    try {
      let updatedItems = [...currentItems];
      const extractedItems = TextProcessor.extractItems(text);
      
      for (const item of extractedItems) {
        const exists = updatedItems.some(existingItem => 
          existingItem.toLowerCase() === item.toLowerCase()
        );
        
        if (!exists) {
          updatedItems.push(item);
        }
      }
      
      return updatedItems;
    } catch (error) {
      console.error('Error parsing items:', error);
      return currentItems;
    }
  }
}

// Character appearance utilities
class AppearanceManager {
  static getAppearanceLabels() {
    return {
      body: "Tipo de corpo",
      height: "Altura", 
      skin: "Tom de pele",
      hairLen: "Comprimento do cabelo",
      hairColor: "Cor do cabelo",
      hairStyle: "Estilo do cabelo",
      eyeColor: "Cor dos olhos",
      eyeShape: "Formato dos olhos",
      face: "Formato do rosto",
      extras: "Marca especial"
    };
  }

  static getDefaultAppearance() {
    const options = RPG_CONSTANTS.APPEARANCE;
    return Object.fromEntries(
      Object.keys(options).map(key => [key, options[key][2]])
    );
  }

  static buildAppearanceDescription(appearance) {
    if (!appearance || typeof appearance !== 'object') return '';
    
    try {
      const parts = [];
      
      if (appearance.body) parts.push(`corpo ${appearance.body.toLowerCase()}`);
      if (appearance.height) parts.push(`estatura ${appearance.height.toLowerCase()}`);
      if (appearance.skin) parts.push(`pele ${appearance.skin.toLowerCase()}`);
      if (appearance.hairLen && appearance.hairColor && appearance.hairStyle) {
        parts.push(`cabelo ${appearance.hairLen.toLowerCase()} ${appearance.hairColor.toLowerCase()} ${appearance.hairStyle.toLowerCase()}`);
      }
      if (appearance.eyeColor && appearance.eyeShape) {
        parts.push(`olhos ${appearance.eyeColor.toLowerCase()} ${appearance.eyeShape.toLowerCase()}`);
      }
      if (appearance.face) parts.push(`rosto ${appearance.face.toLowerCase()}`);
      if (appearance.extras && appearance.extras !== "Nenhum") {
        parts.push(`marca especial: ${appearance.extras.toLowerCase()}`);
      }
      
      return parts.length > 0 ? `Aparência: ${parts.join(', ')}.` : '';
    } catch (error) {
      console.error('Error building appearance description:', error);
      return '';
    }
  }
}

// Preset character configuration
const PRESET_CHARACTER = {
  world: "Westeros — Crônicas de Gelo e Fogo",
  worldBg: "Logo após a guerra de Maegor Targaryen em 8 d.C. Dorne foi devastada. O povo dornês entregou a cabeça de Seth para encerrar o cerco. As feridas ainda são recentes.",
  isKnownIP: true,
  charName: "Edric Yronwood",
  charTitle: "Lorde de Pedra Sangrenta, Guardião das Marches Dornesas",
  charAge: "26",
  charBg: "Sua casa foi saqueada por Maegor Targaryen. Seu pai morreu defendendo os portões quando Edric tinha 10 anos. Reconstruiu tudo com mão firme.",
  charPersonality: "Orgulhoso, calculista, justo. Desconfia de sorrisos que chegam antes das palavras.",
  charSkills: "Armas pesadas, liderança militar, política dornesa, equitação no deserto, genealogia.",
  appearance: AppearanceManager.getDefaultAppearance(),
  useImages: true,
  relationships: {
    "Tywin Lannister": "Hostil",
    "Oberyn Martell": "Neutral",
    "Jon Snow": "Amigável",
    "Cersei Lannister": "Suspeito",
  },
};

// System prompt builder
class SystemPromptBuilder {
  static buildPrompt(character, additionalLore) {
    if (!character) return '';
    
    try {
      const promptSections = [
        `Você é o Mestre de um RPG de texto ambientado em: ${character.world}.`,
        additionalLore 
          ? `LORE OFICIAL DO UNIVERSO:\n${additionalLore}`
          : `CONTEXTO DO MUNDO: ${character.worldBg}`,
        '',
        `O jogador controla: ${character.charName}${character.charTitle ? ` — ${character.charTitle}` : ""}.`,
        character.charAge ? `Idade: ${character.charAge} anos.` : "",
        character.charBg ? `História: ${character.charBg}` : "",
        character.charPersonality ? `Personalidade: ${character.charPersonality}` : "",
        character.charSkills ? `Habilidades: ${character.charSkills}` : "",
        character.appearance ? AppearanceManager.buildAppearanceDescription(character.appearance) : "",
        '',
        this.getNarrativeRules(),
        character.useImages 
          ? `IMAGEM: Ao final de CADA resposta, na penúltima ou última linha (antes ou depois de [MISSÃO] se houver), adicione: IMAGE_PROMPT: [prompt em inglês descrevendo o cenário atual, estilo cinematic, sem texto, sem personagens de frente].`
          : `- NÃO inclua IMAGE_PROMPT nas respostas.`,
        '',
        this.getGameMechanicsRules(character),
      ].filter(Boolean);

      return promptSections.join('\n');
    } catch (error) {
      console.error('Error building system prompt:', error);
      return '';
    }
  }

  static getNarrativeRules() {
    return `══════════════════════════════════════════
FILOSOFIA DE NARRAÇÃO — LEIA COM ATENÇÃO:
══════════════════════════════════════════

REGRA 1 — MENOS É MAIS.
Descreva a cena com apenas 2 ou 3 elementos concretos e sensoriais. Não explique tudo. Deixe lacunas. O jogador deve sentir que há mais para descobrir se explorar, perguntar e agir. Brevidade com precisão é mais poderosa que abundância vaga. Parágrafos curtos. Frases que cortam.

REGRA 2 — USE TODOS OS SENTIDOS, NÃO SÓ A VISÃO.
A cada cena, inclua pelo menos um detalhe sonoro, um tátil ou térmico, e um olfativo. O cheiro de sangue seco numa sala de audiências. O calor da tocha que não aquece. O rangido que vem de um corredor vazio. Sons, texturas e cheiros criam presença real. Imagens sozinhas são decoração.

REGRA 3 — NUNCA DIGA O QUE O PERSONAGEM SENTE.
Você narra o mundo, não a alma do personagem. Nunca escreva "você sente medo", "você fica aliviado", "uma onda de raiva". Isso é papel do jogador. Descreva o que o mundo faz que poderia provocar uma reação: "O mensageiro não te olha nos olhos." "A criança para de chorar quando você entra." Pergunte diretamente quando necessário: "Como o personagem reage?"

REGRA 4 — NPCs TÊM VIDA PRÓPRIA, VOZ PRÓPRIA, AGENDA PRÓPRIA.
Cada NPC quer algo específico. Eles mentem, omitem, têm pressa, guardam rancor. Mas além disso: cada um fala diferente. Um soldado veterano usa frases curtas, quase ordens. Uma velha curandeira fala em meias-verdades e provérbios. Um nobre ansioso ri alto demais. Um jovem guarda gagueja quando nervoso. Essas marcas custam uma linha e transformam papelão em gente. Mostre o que eles fazem enquanto falam — o ferreiro que não para de trabalhar, o mercador que recolhe a mercadoria quando vê o personagem chegar. Ação revela mais que palavra.

REGRA 5 — AÇÕES TÊM PESO E O MUNDO PUNE DESCUIDO.
Decisões importam. Se o personagem age com descuido, o mundo responde: um aliado desaparece, uma porta fecha, uma oportunidade some sem aviso. Não avise antes. Não dê segunda chance automaticamente. O mundo é indiferente à sorte do jogador — e isso torna as vitórias reais e os erros dolorosos.

REGRA 6 — CADA CENA TEM UM CONFLITO, MESMO PEQUENO.
Não existe cena neutra. Uma conversa simples tem tensão embaixo: alguém quer algo que o outro não quer dar, alguém sabe algo que esconde, alguém tem pressa enquanto o outro quer demorar. Identifique o conflito de cada cena — mesmo que minúsculo — e deixe ele respirar. Subtexto é o que faz uma cena viver depois que o jogador fecha o jogo.

REGRA 7 — PAUSA É NARRAÇÃO.
Às vezes a resposta mais pesada é o silêncio. "Ela não responde. Examina as próprias mãos." "A sala fica quieta." "O vento para." Pausas criam peso emocional. Uma cena pode terminar sem ação — com uma olhar, um gesto, um som distante. Use isso.

REGRA 8 — TERMINE COM UMA ABERTURA, NÃO COM UMA LISTA.
NUNCA ofereça opções numeradas como "1. Entrar 2. Fugir 3. Negociar". Isso mata a imersão. Termine com uma situação viva: uma pergunta do ambiente, a ação de um NPC, uma tensão que exige resposta. O jogador decide. Você só narra o que acontece.

REGRA 9 — IMPROVISE COM INTENÇÃO.
Se o jogador explorar algo não planejado, crie na hora. Um detalhe de cenário pode virar pista, perigo ou aliado. O improviso deve parecer inevitável, não aleatório.

REGRA 10 — RESPEITE O LORE.
As regras, a magia, a política e a física do universo existem e têm peso. Não quebre o lore por conveniência narrativa.`;
  }

  static getGameMechanicsRules(character) {
    const relationships = character.relationships || {};
    const relationshipList = Object.entries(relationships)
      .map(([npc, attitude]) => `- ${npc}: ${attitude}`)
      .join('\n    ');

    return `REGRA 11 — MISSÕES E OBJETIVOS.
Quando surgir um objetivo claro para o personagem — uma tarefa, um pedido, uma promessa, uma obrigação importante — inclua ao final da narração, na última linha: [MISSÃO: descrição em 1 linha]. Quando o personagem cumprir um objetivo: [CONCLUÍDA: descrição em 1 linha]. Use com parcimônia — só para objetivos reais, não para cada ação pequena.

REGRA 12 — MECÂNICA DE JOGO E DADOS.
Sempre que o jogador tentar algo difícil, incerto ou arriscado, interrompa a narração com: "[TESTE:ATRIBUTO] [Descrição do teste]" — onde ATRIBUTO é Força, Destreza, Mente ou Carisma.
Exemplo: "[TESTE:Força] Role um dado de 20 faces para arrombar a porta."
O jogador então lança o dado usando o botão "D20" no input. O Mestre deve narrar a consequência baseada no resultado (1-5: falha crítica, 6-10: falha, 11-15: sucesso parcial, 16-20: sucesso completo).
Nunca diga o resultado do dado — deixe o jogador interpretá-lo. Apenas narre a consequência no contexto da cena.

REGRA 13 — RELACIONAMENTOS E FACÇÕES.
Mantenha um registro oculto da atitude dos NPCs em relação ao personagem:
${relationshipList}
Sempre que o jogador agir de forma rude, agressiva ou desrespeitosa com um NPC, mude permanentemente a atitude para "Hostil" ou "Suspeito".
Se o jogador for gentil, justo ou útil, mude para "Amigável" ou "Neutral".
Nunca explique a mudança de atitude ao jogador — apenas ajuste o tom da resposta do NPC.`;
  }
}

// Error handling utilities
class ErrorHandler {
  static handleAsyncError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    // Could integrate with error reporting service here
  }

  static safeAsyncOperation(operation, fallbackValue = null) {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        this.handleAsyncError(error, operation.name);
        return fallbackValue;
      }
    };
  }

  static safeOperation(operation, fallbackValue = null) {
    return (...args) => {
      try {
        return operation(...args);
      } catch (error) {
        this.handleAsyncError(error, operation.name);
        return fallbackValue;
      }
    };
  }
}

// Storage utilities
class StorageManager {
  static saveCampaignIndex(indexList) {
    try {
      localStorage.setItem(RPG_CONSTANTS.STORAGE.INDEX_KEY, JSON.stringify(indexList));
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'saveCampaignIndex');
    }
  }

  static loadCampaignIndex() {
    try {
      const stored = localStorage.getItem(RPG_CONSTANTS.STORAGE.INDEX_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'loadCampaignIndex');
      return [];
    }
  }

  static getCampaignKey(campaignId) {
    return `${RPG_CONSTANTS.STORAGE.CAMPAIGN_PREFIX}${campaignId}`;
  }

  static saveCampaign(campaignId, campaignData) {
    try {
      const key = this.getCampaignKey(campaignId);
      localStorage.setItem(key, JSON.stringify(campaignData));
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'saveCampaign');
    }
  }

  static loadCampaign(campaignId) {
    try {
      const key = this.getCampaignKey(campaignId);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'loadCampaign');
      return null;
    }
  }

  static removeCampaign(campaignId) {
    try {
      const key = this.getCampaignKey(campaignId);
      localStorage.removeItem(key);
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'removeCampaign');
    }
  }
}

// Validation utilities
class Validator {
  static isValidString(value, minLength = 1) {
    return typeof value === 'string' && value.trim().length >= minLength;
  }

  static isValidNumber(value, min = 0, max = Infinity) {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  static isValidArray(value) {
    return Array.isArray(value);
  }

  static isValidObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 1000); // Prevent excessively long inputs
  }

  static validateCharacterData(characterData) {
    const errors = [];
    
    if (!this.isValidString(characterData.charName)) {
      errors.push('Nome do personagem é obrigatório');
    }
    
    if (!this.isValidString(characterData.world)) {
      errors.push('Nome do mundo é obrigatório');
    }
    
    if (characterData.charAge && !this.isValidString(characterData.charAge)) {
      errors.push('Idade deve ser uma string válida');
    }
    
    return errors;
  }
}

// Main RPG component
export default function RPGGame() {
  // State management
  const [currentView, setCurrentView] = useState('home');
  const [campaignIndex, setCampaignIndex] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [creationStep, setCreationStep] = useState(0);
  const [characterForm, setCharacterForm] = useState({
    world: '', 
    worldBg: '', 
    isKnownIP: false,
    charName: '', 
    charTitle: '', 
    charAge: '',
    charBg: '', 
    charPersonality: '', 
    charSkills: '',
    appearance: AppearanceManager.getDefaultAppearance(), 
    useImages: true,
  });

  // Game state
  const [messageHistory, setMessageHistory] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [sceneImage, setSceneImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);
  const [campaignLore, setCampaignLore] = useState('');

  // Character stats
  const [healthPoints, setHealthPoints] = useState(100);
  const [missions, setMissions] = useState([]);
  const [experience, setExperience] = useState(0);
  const [characterLevel, setCharacterLevel] = useState(1);
  const [attributes, setAttributes] = useState({ 
    strength: 10, 
    dexterity: 10, 
    mind: 10, 
    charisma: 10 
  });
  const [skills, setSkills] = useState({ 
    combat: 1, 
    stealth: 1, 
    magic: 1, 
    persuasion: 1, 
    survival: 1, 
    perception: 1 
  });

  // UI state
  const [saveFlash, setSaveFlash] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [autoWaiting, setAutoWaiting] = useState(false);
  const [pendingOptions, setPendingOptions] = useState([]);
  const [autoDelay, setAutoDelay] = useState(3);
  const [countdown, setCountdown] = useState(0);
  const [lastDiceRoll, setLastDiceRoll] = useState(null);
  const [showDiceButton, setShowDiceButton] = useState(false);
  const [pendingTest, setPendingTest] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('dark');

  // Modal states
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [showCharacterSheetModal, setShowCharacterSheetModal] = useState(false);

  // Refs
  const bottomRef = useRef(null);
  const textAreaRef = useRef(null);
  const isSending = useRef(false);
  const autoModeRef = useRef(false);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Effects
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const campaigns = await loadCampaignIndex();
        setCampaignIndex(campaigns);
      } catch (error) {
        ErrorHandler.handleAsyncError(error, 'initializeApp');
      }
    };
    
    initializeApp();
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages, isLoading, autoWaiting]);

  useEffect(() => {
    autoModeRef.current = autoMode;
  }, [autoMode]);

  useEffect(() => {
    if (currentView !== "play") {
      clearAutoMode();
    }
  }, [currentView]);

  // Campaign management
  const loadCampaignIndex = async () => {
    try {
      // Try Supabase first, fallback to localStorage
      const supabaseCampaigns = await campaignStorage.listCampaigns();
      if (supabaseCampaigns.length > 0) {
        return supabaseCampaigns;
      }
      
      return StorageManager.loadCampaignIndex();
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'loadCampaignIndex');
      return StorageManager.loadCampaignIndex();
    }
  };

  const saveCampaignIndex = async (indexList) => {
    try {
      StorageManager.saveCampaignIndex(indexList);
      // Could also sync to Supabase here if needed
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'saveCampaignIndex');
    }
  };

  const loadCampaign = async (campaignSummary) => {
    try {
      // Try Supabase first, fallback to localStorage
      let campaignData = await campaignStorage.loadCampaign(campaignSummary.id);
      
      if (!campaignData) {
        campaignData = StorageManager.loadCampaign(campaignSummary.id);
      }
      
      if (!campaignData) {
        throw new Error('Campaign data not found');
      }

      setActiveCampaign(campaignData);
      setMessageHistory(campaignData.msgs || []);
      setDisplayMessages(campaignData.disp || []);
      setSceneImage(campaignData.img || null);
      setImageLoaded(!!campaignData.img);
      setCampaignLore(campaignData.lore || '');
      setHealthPoints(campaignData.hp ?? 100);
      setMissions(campaignData.missions || []);
      setShowCharacterPanel(false);
      setAutoMode(false);
      setAutoWaiting(false);
      setPendingOptions([]);
      setCurrentView('play');
      
      if (!campaignData.msgs?.length) {
        startGameSession(campaignData, campaignData.lore || '');
      }
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'loadCampaign');
      showNotification('Erro ao carregar campanha', 'error');
    }
  };

  const deleteCampaign = async (campaignId, event) => {
    event.stopPropagation();
    
    if (!confirm('Apagar esta campanha permanentemente?')) {
      return;
    }

    try {
      // Try Supabase first
      await campaignStorage.deleteCampaign(campaignId);
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'deleteCampaign (Supabase)');
    }

    try {
      // Fallback to localStorage
      StorageManager.removeCampaign(campaignId);
    } catch (error) {
      ErrorHandler.handleAsyncError(error, 'deleteCampaign (localStorage)');
    }

    const updatedIndex = campaignIndex.filter(campaign => campaign.id !== campaignId);
    setCampaignIndex(updatedIndex);
    saveCampaignIndex(updatedIndex);
  };

  // Continue with the rest of the component...
  // [This is a partial implementation showing the clean code approach]
  
  return (
    <div className="root">
      <Head>
        <title>RPG Game System</title>
      </Head>
      {/* Component rendering would continue here */}
    </div>
  );
}
